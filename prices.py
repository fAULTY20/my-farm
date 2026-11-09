"""
Farm Intelligence: mandi (market) prices near the farm.

Source: Agmarknet daily prices, published on data.gov.in
("Current Daily Price of Various Commodities from Various Markets (Mandi)").
The API only gives the latest day, so this script keeps its own history in data/prices.json.

Needs a free data.gov.in API key in the environment variable DATA_GOV_KEY
(on GitHub: Settings -> Secrets and variables -> Actions -> DATA_GOV_KEY).
Run:  python prices.py
"""
import datetime as dt
import json
import os
import sys
import time
from pathlib import Path

import requests

RESOURCE = "9ef84268-d588-465a-a308-a864a43d0070"
API = f"https://api.data.gov.in/resource/{RESOURCE}"
STATE = "Tamil Nadu"
# Markets within reach of Manapparai. Edit freely. Matched loosely (Trichy, Tiruchirapalli... all match "trich").
DISTRICTS = ["Tiruchirappalli", "Dindigul", "Karur", "Pudukkottai", "Madurai"]
MATCH = {"Tiruchirappalli": ["trich", "tiruchi"], "Dindigul": ["dindigul"], "Karur": ["karur"],
         "Pudukkottai": ["pudukot", "pudukkot"], "Madurai": ["madurai"]}
KEEP_DAYS = 180
OUT = Path(__file__).resolve().parent / "data" / "prices.json"
IST = dt.timezone(dt.timedelta(hours=5, minutes=30))

# Tamil names for commodities that are likely here (Agmarknet English name -> Tamil).
TAMIL = {
    "Paddy(Dhan)(Common)": "நெல்", "Rice": "அரிசி", "Maize": "மக்காச்சோளம்", "Jowar(Sorghum)": "சோளம்",
    "Bajra(Pearl Millet/Cumbu)": "கம்பு", "Ragi (Finger Millet)": "கேழ்வரகு", "Groundnut": "நிலக்கடலை",
    "Groundnut pods (raw)": "நிலக்கடலை (காய்)", "Sesamum(Sesame,Gingelly,Til)": "எள்", "Gingelly Oil": "நல்லெண்ணெய்",
    "Black Gram (Urd Beans)(Whole)": "உளுந்து", "Green Gram (Moong)(Whole)": "பாசிப்பயறு",
    "Bengal Gram(Gram)(Whole)": "கொண்டைக்கடலை", "Arhar (Tur/Red Gram)(Whole)": "துவரை", "Kulthi(Horse Gram)": "கொள்ளு",
    "Cowpea(Lobia/Karamani)": "தட்டைப்பயறு", "Cotton": "பருத்தி", "Coconut": "தேங்காய்", "Copra": "கொப்பரை",
    "Banana": "வாழைப்பழம்", "Banana - Green": "வாழைக்காய்", "Onion": "வெங்காயம்", "Small Onion": "சின்ன வெங்காயம்",
    "Tomato": "தக்காளி", "Brinjal": "கத்தரி", "Bhindi(Ladies Finger)": "வெண்டை", "Green Chilli": "பச்சை மிளகாய்",
    "Dry Chillies": "வர மிளகாய்", "Turmeric": "மஞ்சள்", "Tapioca": "மரவள்ளி", "Drumstick": "முருங்கைக்காய்",
    "Bitter gourd": "பாகற்காய்", "Bottle gourd": "சுரைக்காய்", "Snakeguard": "புடலங்காய்", "Pumpkin": "பூசணி",
    "Cucumbar(Kheera)": "வெள்ளரி", "Beans": "பீன்ஸ்", "Cabbage": "முட்டைக்கோஸ்", "Carrot": "கேரட்",
    "Potato": "உருளைக்கிழங்கு", "Mango": "மாம்பழம்", "Lemon": "எலுமிச்சை", "Tamarind Fruit": "புளி",
    "Coriander(Leaves)": "கொத்தமல்லி", "Garlic": "பூண்டு", "Ginger(Green)": "இஞ்சி", "Sugarcane": "கரும்பு",
    "Jaggery": "வெல்லம்", "Amaranthus": "கீரை", "Papaya": "பப்பாளி", "Guava": "கொய்யா", "Sweet Potato": "சர்க்கரைவள்ளி",
}


def num(x):
    try:
        return float(str(x).replace(",", ""))
    except (TypeError, ValueError):
        return None


def near(district):
    d = (district or "").lower().replace(" ", "")
    return next((name for name, keys in MATCH.items() if any(k in d for k in keys)), None)


def fetch_state(key):
    """All of today's records for the state (the API pages at most ~1000 per call)."""
    rows, offset = [], 0
    while True:
        params = {"api-key": key, "format": "json", "limit": 1000, "offset": offset,
                  "filters[state.keyword]": STATE}
        for attempt in range(3):
            try:
                r = requests.get(API, params=params, timeout=60)
                r.raise_for_status()
                j = r.json()
                break
            except Exception as e:  # network hiccup or busy server: retry
                if attempt == 2:
                    raise RuntimeError(f"data.gov.in request failed: {e}")
                time.sleep(5 * (attempt + 1))
        recs = j.get("records") or []
        rows += recs
        total = int(j.get("total") or 0)
        offset += len(recs)
        if not recs or offset >= total:
            return rows


def to_row(r):
    """One API record -> compact row. Prices are rupees per quintal (100 kg)."""
    d = str(r.get("arrival_date") or "")
    try:
        iso = dt.datetime.strptime(d, "%d/%m/%Y").date().isoformat()
    except ValueError:
        return None
    modal = num(r.get("modal_price"))
    if not modal:
        return None
    return {"date": iso, "district": near(r.get("district")), "market": r.get("market"),
            "commodity": r.get("commodity"), "variety": r.get("variety"), "grade": r.get("grade"),
            "min": num(r.get("min_price")), "max": num(r.get("max_price")), "modal": modal}


def merge(old_rows, new_rows, today):
    """Add new rows, replace same day/market/commodity/variety, drop rows older than KEEP_DAYS."""
    keyf = lambda x: (x["date"], x["market"], x["commodity"], x["variety"], x.get("grade"))
    m = {keyf(x): x for x in old_rows}
    for x in new_rows:
        m[keyf(x)] = x
    cutoff = (today - dt.timedelta(days=KEEP_DAYS)).isoformat()
    return sorted((x for x in m.values() if x["date"] >= cutoff),
                  key=lambda x: (x["commodity"], x["market"], x["date"]))


def main():
    key = os.environ.get("DATA_GOV_KEY", "").strip()
    if not key:
        print("DATA_GOV_KEY is not set: skipping mandi prices (nothing changed).")
        return 0
    today = dt.datetime.now(IST).date()
    old = json.loads(OUT.read_text(encoding="utf-8")) if OUT.exists() else {"rows": []}
    new, errors = [], []
    try:
        allrows = fetch_state(key)
        seen = sorted({str(r.get("district")) for r in allrows})
        new = [x for x in map(to_row, (r for r in allrows if near(r.get("district")))) if x]
        print(f"  {STATE}: {len(allrows)} prices today; {len(new)} from nearby districts")
        for d in DISTRICTS:
            print(f"    {d}: {sum(1 for x in new if x['district'] == d)}")
        if allrows and not new:
            print("  No nearby district matched. Districts in today's data:", ", ".join(seen))
    except Exception as e:
        errors.append(str(e)); print("  " + str(e))
    rows = merge(old.get("rows", []), new, today)
    data = {
        "generated_at": dt.datetime.now(IST).isoformat(timespec="seconds"),
        "source": "Agmarknet via data.gov.in (daily wholesale prices, rupees per quintal = 100 kg)",
        "state": STATE, "districts": DISTRICTS, "keep_days": KEEP_DAYS,
        "latest_date": max((x["date"] for x in rows), default=None),
        "tamil": TAMIL, "errors": errors, "rows": rows,
    }
    OUT.parent.mkdir(exist_ok=True)
    OUT.write_text(json.dumps(data, ensure_ascii=False, separators=(",", ":")), encoding="utf-8")
    print(f"Done. {len(new)} new prices, {len(rows)} kept in data/prices.json (latest {data['latest_date']}).")
    return 1 if errors else 0


if __name__ == "__main__":
    sys.exit(main())
