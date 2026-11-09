"""
Farm Intelligence - Step 2: live weather, rain status and alerts
Survey 552, Kumaravadi, Manapparai, Tiruchirappalli

Source: Open-Meteo (free, no API key). Writes data/weather.json for the app.
Run:  python weather.py
Run it again whenever you want fresh data (the app will do this automatically later).
"""
import datetime as dt
import json
import math
import time
from pathlib import Path

import requests

LAT, LON = 10.514043, 78.276403  # farm centre
OUT = Path(__file__).resolve().parent / "data" / "weather.json"  # works from any folder
IST = dt.timezone(dt.timedelta(hours=5, minutes=30))  # farm time, even when run on a UTC server
PAST_DAYS = 45      # covers the CHIRPS gap (satellite rain lags by ~5 weeks)
FORECAST_DAYS = 7
RAIN_DAY_MM = 2.5   # IMD: >= 2.5 mm counts as a rain day

# ---- Alert thresholds (mm/day, deg C, km/h). Edit to taste. ----
T = {"rain_moderate": 15, "rain_heavy": 40, "rain_very_heavy": 64.5,
     "heat": 38, "wind": 30, "spray_wind_max": 15, "spray_prob_max": 30,
     "dry_spell_days": 10, "dry_forecast_7d_mm": 10,
     "wet_week_mm": 40, "wet_prev_week_mm": 20}

# ---- Soil water ("water today?") settings. Edit when the crop and field are known. ----
# Simple FAO-56 style bucket: rain fills the root zone, crop water use (ET0 x Kc) empties it,
# anything above full drains away (sandy soil drains fast).
SOIL = {
    "awc_mm_per_m": 110,  # water a sandy loam holds for plants, mm per metre of soil
    "root_depth_m": 0.4,  # typical field crop roots; deeper for trees, shallower for vegetables
    "p": 0.5,             # crop is stressed once half the stored water is used
    "kc": 0.9,            # crop water use vs ET0 for a growing crop (crop not yet known)
    "rain_min_mm": 2,     # rain below this mostly evaporates from the surface
    "start_fraction": 0.5,  # assumed dryness at the start of the 45-day window
}
LITRES_PER_MM_ACRE = 4047  # 1 mm of water over 1 acre

WD_EN = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"]
WD_TA = ["திங்கள்", "செவ்வாய்", "புதன்", "வியாழன்", "வெள்ளி", "சனி", "ஞாயிறு"]


def wmo(code):
    """WMO weather code -> (English, Tamil)."""
    if code is None:
        return ("Unknown", "தெரியவில்லை")
    if code == 0:
        return ("Clear sky", "தெளிவான வானம்")
    if code in (1, 2, 3):
        return ("Partly cloudy", "பகுதி மேகமூட்டம்")
    if code in (45, 48):
        return ("Fog", "மூடுபனி")
    if code in (51, 53, 55, 56, 57):
        return ("Drizzle", "தூறல்")
    if code in (61, 63, 66, 80, 81):
        return ("Rain", "மழை")
    if code in (65, 67, 82):
        return ("Heavy rain", "கனமழை")
    if code in (95, 96, 99):
        return ("Thunderstorm", "இடியுடன் கூடிய மழை")
    return ("Cloudy", "மேகமூட்டம்")


# ----------------------------------------------------------------------------
def fetch_raw():
    url = "https://api.open-meteo.com/v1/forecast"
    params = {
        "latitude": LAT, "longitude": LON, "timezone": "Asia/Kolkata",
        "past_days": PAST_DAYS, "forecast_days": FORECAST_DAYS,
        "current": "temperature_2m,relative_humidity_2m,precipitation,weather_code,wind_speed_10m",
        "daily": ("weather_code,temperature_2m_max,temperature_2m_min,precipitation_sum,"
                  "precipitation_probability_max,wind_speed_10m_max,et0_fao_evapotranspiration"),
    }
    last = None
    for attempt in range(3):
        try:
            resp = requests.get(url, params=params, timeout=30)
            resp.raise_for_status()
            return resp.json()
        except Exception as e:  # network hiccup: retry
            last = e
            time.sleep(2 * (attempt + 1))
    raise RuntimeError(f"Could not reach Open-Meteo: {last}")


def when_label(d, today):
    diff = (d - today).days
    wd = d.weekday()
    if diff == 0:
        return "today", "இன்று"
    if diff == 1:
        return "tomorrow", "நாளை"
    return WD_EN[wd], WD_TA[wd]


def num(x, default=0.0):
    return default if x is None else float(x)


def water_balance(days, today):
    """Root-zone water deficit (mm below full) and an irrigation decision.
    Assumes rain only: irrigation the farmer already gave is not known yet (the farm diary will add it)."""
    taw = SOIL["awc_mm_per_m"] * SOIL["root_depth_m"]  # total available water
    raw = SOIL["p"] * taw                              # usable before stress
    kc = SOIL["kc"]

    def step(dr, d):
        r = num(d["rain_mm"])
        eff = r if r >= SOIL["rain_min_mm"] else 0.0
        et = num(d["et0_mm"], 4.0) * kc
        return min(taw, max(0.0, dr - eff + et)), eff, et

    dr = taw * SOIL["start_fraction"]
    hist = []
    for d in days:
        if dt.date.fromisoformat(d["date"]) >= today:
            break
        dr, eff, et = step(dr, d)
        hist.append({"date": d["date"], "deficit_mm": round(dr, 1), "rain_mm": round(eff, 1), "use_mm": round(et, 1)})

    fut = [d for d in days if dt.date.fromisoformat(d["date"]) >= today]
    # projected dryness over the coming days (rain-fed, no irrigation)
    proj, x = [], dr
    for d in fut:
        x, _, _ = step(x, d)
        proj.append({"date": d["date"], "deficit_mm": round(x, 1)})
    need_in = next((i for i, p in enumerate(proj) if p["deficit_mm"] >= raw), None)

    rain_soon = sum(num(d["rain_mm"]) for d in fut[:2] if num(d["rain_mm"]) >= SOIL["rain_min_mm"])
    moist_pct = round(100 * (1 - dr / taw))

    if dr >= raw and rain_soon >= min(0.6 * dr, raw):
        status = "wait_rain"
    elif dr >= raw:
        status = "irrigate"
    elif need_in is not None and need_in <= 1:
        status = "soon"
    else:
        status = "ok"

    amount = round(dr) if status == "irrigate" else 0
    litres = int(round(amount * LITRES_PER_MM_ACRE, -3))
    when_n = need_in if need_in is not None else None

    if status == "irrigate":
        dry_en = "Soil is dry" if moist_pct <= 20 else "Soil is getting dry"
        dry_ta = "மண் காய்ந்துவிட்டது" if moist_pct <= 20 else "மண் காய்ந்து வருகிறது"
        en = (f"{dry_en} (stored water about {moist_pct}%). If a crop is standing, irrigate today: "
              f"about {amount} mm, roughly {litres:,} litres per acre. On this sandy soil, give it in 2 smaller turns.")
        ta = (f"{dry_ta} (ஈரம் சுமார் {moist_pct}%). பயிர் இருந்தால் இன்று பாசனம் செய்யுங்கள்: "
              f"சுமார் {amount} மி.மீ, ஏக்கருக்கு சுமார் {litres:,} லிட்டர். இந்த மணல் மண்ணில் 2 முறையாகப் பிரித்துக் கொடுங்கள்.")
    elif status == "wait_rain":
        en = (f"Soil is getting dry, but about {rain_soon:.0f} mm of rain is expected by tomorrow. "
              f"Wait for the rain. If it has not rained by tomorrow evening, irrigate.")
        ta = (f"மண் காய்ந்து வருகிறது, ஆனால் நாளைக்குள் சுமார் {rain_soon:.0f} மி.மீ மழை எதிர்பார்க்கப்படுகிறது. "
              f"மழைக்காகக் காத்திருங்கள். நாளை மாலைக்குள் மழை பெய்யாவிட்டால் பாசனம் செய்யுங்கள்.")
    elif status == "soon":
        en = f"No irrigation today. Soil moisture is about {moist_pct}%; watering will likely be needed tomorrow."
        ta = f"இன்று பாசனம் தேவையில்லை. மண் ஈரம் சுமார் {moist_pct}%; நாளை பாசனம் தேவைப்படலாம்."
    else:
        en = f"No irrigation needed. Soil moisture is about {moist_pct}%."
        ta = f"பாசனம் தேவையில்லை. மண் ஈரம் சுமார் {moist_pct}%."
        if when_n is not None:
            en += f" Next watering likely in about {when_n} days."
            ta += f" அடுத்த பாசனம் சுமார் {when_n} நாட்களில் தேவைப்படலாம்."
        elif fut:
            en += f" Not needed in the next {len(fut)} days unless the forecast changes."
            ta += f" முன்னறிவிப்பு மாறாவிட்டால் அடுத்த {len(fut)} நாட்களுக்குத் தேவையில்லை."

    return {
        "status": status, "moisture_pct": moist_pct, "deficit_mm": round(dr, 1),
        "taw_mm": round(taw, 1), "raw_mm": round(raw, 1),
        "irrigate_mm": amount, "litres_per_acre": litres, "rain_next_2_days_mm": round(rain_soon, 1),
        "next_need_in_days": when_n, "text_en": en, "text_ta": ta,
        "history": hist[-14:], "projection": proj,
        "check_en": "Check by hand: squeeze soil from 10 cm deep. If it will not hold a ball, it is dry.",
        "check_ta": "கையால் சோதியுங்கள்: 10 செ.மீ ஆழத்து மண்ணைப் பிழியுங்கள். உருண்டையாக நிற்கவில்லை என்றால் காய்ந்துள்ளது.",
        "assumptions": {**SOIL, "note": "Rain only; irrigation already given is not counted. Crop not yet known."},
    }


def build(raw, today=None):
    d = raw["daily"]
    cur = raw.get("current", {})
    if today is None:
        today = dt.date.fromisoformat(cur["time"][:10]) if cur.get("time") else dt.datetime.now(IST).date()

    days = []
    for i, ds in enumerate(d["time"]):
        date = dt.date.fromisoformat(ds)
        en, ta = wmo(d["weather_code"][i])
        days.append({
            "date": ds, "weekday_en": WD_EN[date.weekday()], "weekday_ta": WD_TA[date.weekday()],
            "is_forecast": date >= today, "is_today": date == today,
            "tmax": d["temperature_2m_max"][i], "tmin": d["temperature_2m_min"][i],
            "rain_mm": None if d["precipitation_sum"][i] is None else round(d["precipitation_sum"][i], 1),
            "rain_prob": d["precipitation_probability_max"][i],
            "wind_kmh": d["wind_speed_10m_max"][i], "et0_mm": d["et0_fao_evapotranspiration"][i],
            "weather_en": en, "weather_ta": ta,
        })
    past = [x for x in days if not x["is_forecast"]]
    fut = [x for x in days if x["is_forecast"]][:FORECAST_DAYS]
    today_row = next((x for x in days if x["is_today"]), fut[0] if fut else None)

    # ---- recent rain (observed/reanalysis, last PAST_DAYS) ----
    def rsum(rows):
        return round(sum(num(x["rain_mm"]) for x in rows), 1)

    rain_days = [x for x in days if not x["is_forecast"] or x["is_today"]]
    since = None
    for x in reversed(rain_days):
        if num(x["rain_mm"]) >= RAIN_DAY_MM:
            since = (today - dt.date.fromisoformat(x["date"])).days
            break
    recent = {
        "last_7_days_mm": rsum(past[-7:]), "last_14_days_mm": rsum(past[-14:]),
        "last_30_days_mm": rsum(past[-30:]), "last_45_days_mm": rsum(past),
        "days_since_rain": since,
        "next_3_days_mm": rsum(fut[:3]), "next_7_days_mm": rsum(fut[:7]),
        "since_date": past[0]["date"] if past else None,
    }

    # ---- alerts ----
    alerts = []

    def add(aid, level, date, t_en, t_ta, a_en, a_ta, det_en, det_ta):
        alerts.append({"id": aid, "level": level, "date": date, "title_en": t_en, "title_ta": t_ta,
                       "action_en": a_en, "action_ta": a_ta, "detail_en": det_en, "detail_ta": det_ta})

    near = fut[:3]
    wettest = max(near, key=lambda x: num(x["rain_mm"])) if near else None
    if wettest and num(wettest["rain_mm"]) >= T["rain_moderate"]:
        mm = num(wettest["rain_mm"])
        w_en, w_ta = when_label(dt.date.fromisoformat(wettest["date"]), today)
        det_en = f"About {mm:.0f} mm expected {w_en}."
        det_ta = f"{w_ta} சுமார் {mm:.0f} மி.மீ மழை எதிர்பார்க்கப்படுகிறது."
        if mm >= T["rain_very_heavy"]:
            add("rain_very_heavy", "warning", wettest["date"],
                "Very heavy rain expected", "மிகக் கனமழை எதிர்பார்ப்பு",
                "Avoid field work. Clear drains, protect stored produce and inputs. Check IMD Chennai warnings.",
                "வயல் வேலையைத் தவிர்க்கவும். வடிகால்களை சரிசெய்து, அறுவடை பொருட்களையும் இடுபொருட்களையும் பாதுகாக்கவும். IMD சென்னை எச்சரிக்கையைப் பார்க்கவும்.",
                det_en, det_ta)
        elif mm >= T["rain_heavy"]:
            add("rain_heavy", "watch", wettest["date"],
                "Heavy rain expected", "கனமழை எதிர்பார்ப்பு",
                "Postpone fertiliser and spraying. Make sure water can drain out of the field.",
                "உரம் இடுவதையும் மருந்து தெளிப்பதையும் தள்ளி வையுங்கள். வயலில் நீர் தேங்காமல் வடிகால் பார்த்துக்கொள்ளுங்கள்.",
                det_en, det_ta)
        else:
            add("rain_moderate", "info", wettest["date"],
                "Rain expected", "மழை எதிர்பார்ப்பு",
                "Do spraying and fertiliser after the rain, not before.",
                "மருந்து தெளித்தல், உரமிடுதலை மழைக்குப் பிறகு செய்யுங்கள்.",
                det_en, det_ta)

    # several moderate days in a row (e.g. 8 mm + 10 mm) also matter, even if no single day hits the limit
    near_total = sum(num(x["rain_mm"]) for x in near)
    if not alerts and near_total >= T["rain_moderate"]:
        wet = [x for x in near if num(x["rain_mm"]) >= RAIN_DAY_MM]
        first = wet[0]["date"] if wet else near[0]["date"]
        add("rain_moderate", "info", first,
            "Rain expected", "மழை எதிர்பார்ப்பு",
            "Do spraying and fertiliser after the rain, not before.",
            "மருந்து தெளித்தல், உரமிடுதலை மழைக்குப் பிறகு செய்யுங்கள்.",
            f"About {near_total:.0f} mm expected over the next 3 days.",
            f"அடுத்த 3 நாட்களில் சுமார் {near_total:.0f} மி.மீ மழை எதிர்பார்க்கப்படுகிறது.")

    # good spray window (only if no rain alert on that day)
    for i, x in enumerate(near):
        nxt = fut[i + 1] if i + 1 < len(fut) else None
        rain_next_day = num(nxt["rain_mm"]) if nxt else 0.0  # spray needs a dry day after, or rain washes it off
        if (num(x["rain_mm"]) < RAIN_DAY_MM and num(x["rain_prob"]) <= T["spray_prob_max"]
                and num(x["wind_kmh"]) <= T["spray_wind_max"] and rain_next_day < RAIN_DAY_MM * 2):
            w_en, w_ta = when_label(dt.date.fromisoformat(x["date"]), today)
            add("spray_window", "info", x["date"],
                "Good day for spraying", "மருந்து தெளிக்க ஏற்ற நாள்",
                "Low rain chance and light wind. Spray early morning or late afternoon.",
                "மழை வாய்ப்பு குறைவு, காற்று மிதம். காலை அல்லது மாலை நேரத்தில் தெளிக்கவும்.",
                f"Best: {w_en}.", f"சிறந்த நாள்: {w_ta}.")
            break

    hot = max(fut[:5], key=lambda x: num(x["tmax"], -99)) if fut else None
    if hot and num(hot["tmax"], -99) >= T["heat"]:
        w_en, w_ta = when_label(dt.date.fromisoformat(hot["date"]), today)
        add("heat", "watch", hot["date"], "Very hot day ahead", "கடும் வெப்பம்",
            "Irrigate and spray only in early morning or evening. Watch for crop wilting.",
            "பாசனம், மருந்து தெளித்தலை காலை அல்லது மாலையில் மட்டும் செய்யுங்கள். பயிர் வாடுகிறதா என்று கவனியுங்கள்.",
            f"Up to {hot['tmax']:.0f} C {w_en}.", f"{w_ta} {hot['tmax']:.0f} டிகிரி வரை வெப்பம்.")

    windy = max(fut[:3], key=lambda x: num(x["wind_kmh"])) if fut else None
    if windy and num(windy["wind_kmh"]) >= T["wind"]:
        w_en, w_ta = when_label(dt.date.fromisoformat(windy["date"]), today)
        add("wind", "watch", windy["date"], "Strong wind expected", "பலத்த காற்று",
            "Do not spray on this day. Support tall crops and young plants.",
            "அன்று மருந்து தெளிக்க வேண்டாம். உயரமான பயிர்கள், இளம் செடிகளுக்கு ஆதரவு கொடுங்கள்.",
            f"Winds up to {windy['wind_kmh']:.0f} km/h {w_en}.", f"{w_ta} மணிக்கு {windy['wind_kmh']:.0f} கி.மீ வரை காற்று.")

    dry_days = since if since is not None else PAST_DAYS  # no rain day at all in the window
    if (dry_days >= T["dry_spell_days"]
            and recent["next_7_days_mm"] < T["dry_forecast_7d_mm"]):
        add("dry_spell", "watch", today.isoformat(),
            "Dry spell continues", "வறண்ட காலம் தொடர்கிறது",
            "Check soil moisture by hand. If a crop is standing, plan well irrigation.",
            "மண் ஈரத்தை கையால் சோதியுங்கள். பயிர் இருந்தால் கிணற்றுப் பாசனத்தை திட்டமிடுங்கள்.",
            f"{'Over ' if since is None else ''}{dry_days} days since a rain day; little rain forecast.",
            f"கடைசி மழைக்குப் பிறகு {'' if since is not None else '> '}{dry_days} நாட்கள்; வரும் நாட்களில் குறைந்த மழை.")

    if (recent["next_7_days_mm"] >= T["wet_week_mm"] and recent["last_7_days_mm"] >= T["wet_prev_week_mm"]
            and not any(a["id"] in ("rain_heavy", "rain_very_heavy") for a in alerts)):
        add("soil_wetting", "info", today.isoformat(),
            "Soil moisture may improve", "மண் ஈரம் கூடும் வாய்ப்பு",
            "Check moisture in the field before deciding on sowing. Do not rely on forecast alone.",
            "விதைப்பு முடிவுக்கு முன் வயலில் மண் ஈரத்தை நேரில் சோதியுங்கள். முன்னறிவிப்பை மட்டும் நம்ப வேண்டாம்.",
            f"{recent['next_7_days_mm']:.0f} mm forecast in 7 days after {recent['last_7_days_mm']:.0f} mm last week.",
            f"கடந்த வாரம் {recent['last_7_days_mm']:.0f} மி.மீ; அடுத்த 7 நாட்களில் {recent['next_7_days_mm']:.0f} மி.மீ எதிர்பார்ப்பு.")

    water = water_balance(days, today)
    if water["status"] == "irrigate":
        alerts.insert(0, {"id": "irrigate", "level": "watch", "date": today.isoformat(),
                          "title_en": "Irrigate today", "title_ta": "இன்று பாசனம் தேவை",
                          "action_en": f"If a crop is standing, irrigate about {water['irrigate_mm']} mm today, in 2 smaller turns.",
                          "action_ta": f"பயிர் இருந்தால் இன்று சுமார் {water['irrigate_mm']} மி.மீ பாசனம் செய்யுங்கள், 2 முறையாகப் பிரித்து.",
                          "detail_en": f"Soil moisture about {water['moisture_pct']}%.",
                          "detail_ta": f"மண் ஈரம் சுமார் {water['moisture_pct']}%."})

    order = {"warning": 0, "watch": 1, "info": 2}
    alerts.sort(key=lambda a: (order[a["level"]], a["date"]))
    if alerts:
        top = alerts[0]
        action = {"en": top["action_en"], "ta": top["action_ta"], "from_alert": top["id"]}
    else:
        action = {"en": "No weather concerns. Continue normal farm work.",
                  "ta": "வானிலை கவலை எதுவும் இல்லை. வழக்கமான வேலைகளைத் தொடருங்கள்.", "from_alert": None}

    return {
        "generated_at": dt.datetime.now(IST).isoformat(timespec="seconds"),
        "source": "Open-Meteo (model forecast + recent model data)",
        "location": {"lat": LAT, "lon": LON},
        "today": today.isoformat(),
        "current": {"temp_c": cur.get("temperature_2m"), "humidity_pct": cur.get("relative_humidity_2m"),
                    "wind_kmh": cur.get("wind_speed_10m"), "rain_now_mm": cur.get("precipitation"),
                    "weather_en": wmo(cur.get("weather_code"))[0], "weather_ta": wmo(cur.get("weather_code"))[1]},
        "today_summary": today_row,
        "forecast": fut, "recent_days": past[-14:], "recent_rain": recent,
        "alerts": alerts, "todays_action": action, "water": water,
        "thresholds": T,
        "notes": [
            "Forecasts are model estimates for a ~10 km grid, not a reading at your field.",
            "For cyclone or heavy-rain warnings follow IMD Chennai and Tamil Nadu government alerts.",
            "Rain since 1 Oct here (Open-Meteo) is a different source from the satellite rain (CHIRPS) in farm_data.json: compare trends, not exact mm.",
            "Tamil alert text should be reviewed by a native speaker before relying on it.",
        ],
    }


def clean(o):
    if isinstance(o, dict):
        return {k: clean(v) for k, v in o.items()}
    if isinstance(o, list):
        return [clean(v) for v in o]
    if isinstance(o, float) and math.isnan(o):
        return None
    return o


def main():
    raw = fetch_raw()
    data = clean(build(raw))
    OUT.parent.mkdir(exist_ok=True)
    OUT.write_text(json.dumps(data, indent=1, ensure_ascii=False), encoding="utf-8")

    c, rr = data["current"], data["recent_rain"]
    print("\nDone. Saved data/weather.json")
    print(f"  Now: {c['temp_c']} C, humidity {c['humidity_pct']}%, {c['weather_en']}")
    print(f"  Rain since {rr['since_date']}: {rr['last_45_days_mm']} mm "
          f"(last 7 days {rr['last_7_days_mm']} mm, last 30 days {rr['last_30_days_mm']} mm)")
    print(f"  Days since a rain day: {rr['days_since_rain']}")
    print(f"  Forecast rain: next 3 days {rr['next_3_days_mm']} mm, next 7 days {rr['next_7_days_mm']} mm")
    print("  7-day forecast:")
    for x in data["forecast"]:
        print(f"    {x['date']} {x['weekday_en'][:3]}: {x['tmin']}-{x['tmax']} C, "
              f"rain {x['rain_mm']} mm ({x['rain_prob']}%), wind {x['wind_kmh']} km/h, {x['weather_en']}")
    print("  Alerts:" if data["alerts"] else "  No alerts.")
    for a in data["alerts"]:
        print(f"    [{a['level']}] {a['title_en']} ({a['date']}): {a['detail_en']}")
    print(f"  Today's action: {data['todays_action']['en']}")
    w = data["water"]
    print(f"  Water: {w['status']} (moisture {w['moisture_pct']}%, deficit {w['deficit_mm']} of {w['taw_mm']} mm). {w['text_en']}")


if __name__ == "__main__":
    main()
