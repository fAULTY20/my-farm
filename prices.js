// Prices tab: Agmarknet wholesale mandi prices near the farm (data/prices.json, refreshed by GitHub).
(function () {
Object.assign(S.ta, {prices:"விலை",pnone:"சந்தை விலை இன்னும் வரவில்லை. data.gov.in சாவி சேர்த்த பிறகு தினமும் தானாக வரும்.",pcrop:"பயிர்",pyours:"உங்கள் பயிர்கள்",pall:"மற்ற பொருட்கள்",ptoday:"சந்தை விலை",pbest:"அதிக விலை",pkg:"கிலோ",pq:"குவிண்டால்",prange:"வரம்பு",ptrend:"விலைப் போக்கு (அருகிலுள்ள சந்தைகள் சராசரி)",pweek:"ஒரு வாரத்தில்",pmonth:"ஒரு மாதத்தில்",phigh:"இந்த மாத சராசரியை விட விலை அதிகம். விளைபொருள் தயாராக இருந்தால் விற்க நல்ல நேரம்.",plow:"இந்த மாத சராசரியை விட விலை குறைவு. பாதுகாப்பாக சேமிக்க முடிந்தால் காத்திருப்பது பலன் தரலாம்.",pmid:"விலை இந்த மாத சராசரிக்கு அருகில் உள்ளது.",pfew:"போக்கு காட்ட இன்னும் சில நாட்கள் தரவு தேவை.",pnote:"இவை மண்டி மொத்த விலைகள். போக்குவரத்து, கமிஷன் சேர்க்கப்படவில்லை. இயற்கை விளைபொருளுக்கு கூடுதல் விலை கிடைக்கலாம்.",psrc:"ஆதாரம்: Agmarknet (data.gov.in)",pold:"பழைய விலை",pdays:"நாள்"});
Object.assign(S.en, {prices:"Prices",pnone:"Market prices have not arrived yet. Once the data.gov.in key is added they come in daily by themselves.",pcrop:"Crop",pyours:"Your crops",pall:"Other produce",ptoday:"Market prices",pbest:"Best price",pkg:"kg",pq:"quintal",prange:"range",ptrend:"Price trend (average of nearby markets)",pweek:"in a week",pmonth:"in a month",phigh:"Prices are above this month's average. A good time to sell if your produce is ready.",plow:"Prices are below this month's average. If you can store safely, waiting may pay.",pmid:"Prices are close to this month's average.",pfew:"A few more days of data are needed to show a trend.",pnote:"These are wholesale mandi prices. Transport and commission are not included. Organic produce may fetch more.",psrc:"Source: Agmarknet (data.gov.in)",pold:"older price",pdays:"days"});

let P = null, loading = false, sel = null, failed = false;
const lg = (k, d) => { try { const v = localStorage.getItem(k); return v == null ? d : JSON.parse(v); } catch (e) { return d; } };
const esc = s => String(s ?? "").replace(/[&<>"']/g, c => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
const name = c => (L == "ta" && P && P.tamil && P.tamil[c]) ? `${P.tamil[c]}` : c;
const kg = q => "₹" + (q / 100).toLocaleString("en-IN", {maximumFractionDigits: q < 1000 ? 2 : 1});
const q = v => "₹" + Math.round(v).toLocaleString("en-IN");
const per = c => /coconut/i.test(c) && !/copra|oil/i.test(c) ? null : 1;  // coconut is often per 1000 nuts: show quintal figure only

let tried = 0;
function load() {
  if (P || loading || Date.now() - tried < 60e3) return;   // try at most once a minute
  loading = true; tried = Date.now();
  fetch("data/prices.json", {cache: "no-cache"}).then(r => r.ok ? r.json() : null)
    .then(j => { P = j && j.rows ? j : null; failed = !P; })
    .catch(() => { failed = true; })
    .finally(() => { loading = false; if (tab == "prices") go(); });
}

// crops written in the diary, matched to market names ("groundnut" -> "Groundnut", "நிலக்கடலை" -> "Groundnut")
function yourCrops(list) {
  let crops = [];
  try { crops = [...new Set([...(lg("diary_cache", [])), ...(lg("diary_outbox", []))].map(e => (e.crop || "").trim().toLowerCase()).filter(Boolean))]; } catch (e) {}
  const hit = new Set();
  crops.forEach(c => list.forEach(m => {
    const ta = ((P.tamil || {})[m] || "").toLowerCase();
    if (m.toLowerCase().includes(c) || c.includes(m.toLowerCase().split(/[ (]/)[0]) || (ta && (ta.includes(c) || c.includes(ta)))) hit.add(m);
  }));
  return [...hit];
}

function trend(rows) {
  const byDay = {};
  rows.forEach(r => { (byDay[r.date] = byDay[r.date] || []).push(r.modal); });
  return Object.keys(byDay).sort().map(d => ({d, v: byDay[d].reduce((a, b) => a + b, 0) / byDay[d].length}));
}
function chart(tr, perKg) {
  const pts = tr.slice(-90); if (pts.length < 2) return "";
  const W = 320, H = 110, mn = Math.min(...pts.map(p => p.v)), mx = Math.max(...pts.map(p => p.v)), sp = mx - mn || 1;
  const t0 = new Date(pts[0].d), t1 = new Date(pts[pts.length - 1].d), span = (t1 - t0) || 1;
  const X = d => 6 + (new Date(d) - t0) / span * (W - 12), Y = v => H - 16 - (v - mn) / sp * (H - 30);
  const line = pts.map(p => `${X(p.d).toFixed(1)},${Y(p.v).toFixed(1)}`).join(" ");
  const lab = (p, anchor) => `<text x="${X(p.d)}" y="${H - 2}" font-size="10" fill="currentColor" text-anchor="${anchor}">${p.d.slice(8)}/${p.d.slice(5, 7)}</text>`;
  return `<svg viewBox="0 0 ${W} ${H}" style="width:100%;margin-top:6px"><polyline points="${line}" fill="none" stroke="#2e9d57" stroke-width="2.5"/>
   <text x="${W - 4}" y="${Y(pts[pts.length - 1].v) - 6}" font-size="11" fill="currentColor" text-anchor="end">${perKg ? kg(pts[pts.length - 1].v) + "/" + t("pkg") : q(pts[pts.length - 1].v) + "/" + t("pq")}</text>
   ${lab(pts[0], "start")}${lab(pts[pts.length - 1], "end")}</svg>`;
}
function change(tr, days) {
  if (tr.length < 2) return null;
  const last = tr[tr.length - 1], cut = new Date(new Date(last.d) - days * 864e5).toISOString().slice(0, 10);
  const prev = [...tr].reverse().find(p => p.d <= cut);
  return prev ? Math.round((last.v / prev.v - 1) * 100) : null;
}
const pct = (v, lbl) => v == null ? "" : `<div><div class="big" style="font-size:22px;color:${v > 0 ? "#2e9d57" : v < 0 ? "#d9534f" : "inherit"}">${v > 0 ? "↑" : v < 0 ? "↓" : ""}${Math.abs(v)}%</div><div class="mut">${lbl}</div></div>`;

window.pSel = c => { sel = c; try { localStorage.setItem("price_crop", c); } catch (e) {} go(); };

window.prices = function () {
  if (!P) { load(); return `<div class="card mut">${failed ? t("pnone") : "…"}</div>`; }
  if (!P.rows.length) return `<div class="card mut">${t("pnone")}</div>`;
  const count = {}; P.rows.forEach(r => { count[r.commodity] = (count[r.commodity] || 0) + 1; });
  const all = Object.keys(count).sort((a, b) => count[b] - count[a]);
  const mine = yourCrops(all);
  if (!sel || !count[sel]) sel = (count[lg("price_crop", "")] && lg("price_crop", "")) || mine[0] || all[0];
  const rows = P.rows.filter(r => r.commodity == sel);
  // latest price per market + variety
  const latest = {}; rows.forEach(r => { const k = r.market + "|" + r.variety; if (!latest[k] || latest[k].date < r.date) latest[k] = r; });
  const L0 = Object.values(latest).sort((a, b) => b.modal - a.modal), newest = P.latest_date;
  const tr = trend(rows), w = change(tr, 7), m = change(tr, 30);
  const last30 = tr.filter(p => p.d >= new Date(new Date(newest) - 30 * 864e5).toISOString().slice(0, 10));
  const avg = last30.reduce((s, p) => s + p.v, 0) / (last30.length || 1), now = tr.length ? tr[tr.length - 1].v : 0;
  const advice = tr.length < 7 ? t("pfew") : now > avg * 1.1 ? t("phigh") : now < avg * 0.9 ? t("plow") : t("pmid");
  const chip = c => `<button class="${c == sel ? "on" : ""}" data-c="${esc(c)}" onclick="pSel(this.dataset.c)" style="flex:0 0 auto;padding:8px 12px">${esc(name(c))}</button>`;
  const daysOld = d => Math.round((new Date(newest) - new Date(d)) / 864e5);
  return `<div class="card">${mine.length ? `<div class="mut">${t("pyours")}</div><div class="seg" style="overflow-x:auto;flex-wrap:nowrap">${mine.map(chip).join("")}</div>` : ""}
   <label class="mut">${mine.length ? t("pall") : t("pcrop")}</label>
   <select onchange="pSel(this.value)">${all.map(c => `<option value="${esc(c)}" ${c == sel ? "selected" : ""}>${esc(name(c))}${L == "ta" && P.tamil[c] ? " · " + esc(c) : ""}</option>`).join("")}</select></div>
  <div class="card"><h2>${esc(name(sel))} · ${t("ptoday")}</h2>
   ${L0.map((r, i) => `<div class="row" style="align-items:center;border-bottom:1px solid var(--line);padding:8px 0">
     <div style="flex:3"><b>${esc(r.market)}</b>${i == 0 && L0.length > 1 ? ` <span style="background:var(--ok);color:#1c2a22;border-radius:8px;padding:1px 8px;font-size:12px">${t("pbest")}</span>` : ""}
      <div class="mut" style="font-size:13px">${esc(r.district)}${r.variety && r.variety != sel ? " · " + esc(r.variety) : ""}${daysOld(r.date) > 0 ? ` · <span style="color:#d9534f">${t("pold")} ${r.date.slice(8)}/${r.date.slice(5, 7)}</span>` : ""}</div></div>
     <div style="flex:2;text-align:right">${per(sel) ? `<div class="big" style="font-size:22px">${kg(r.modal)}<span class="mut" style="font-size:13px">/${t("pkg")}</span></div>` : ""}
      <div class="mut" style="font-size:12px">${q(r.modal)}/${t("pq")} · ${t("prange")} ${q(r.min || r.modal)}–${q(r.max || r.modal)}</div></div></div>`).join("")}
   <div class="mut" style="margin-top:6px;font-size:13px">${newest ? newest.slice(8) + "/" + newest.slice(5, 7) + "/" + newest.slice(0, 4) : ""}</div></div>
  <div class="card"><h2>${t("ptrend")}</h2>${chart(tr, per(sel))}
   <div class="row" style="margin-top:6px">${pct(w, t("pweek"))}${pct(m, t("pmonth"))}</div>
   <div style="margin-top:8px;font-weight:600">${advice}</div></div>
  <div class="card mut" style="font-size:14px">${t("pnote")}<br>${t("psrc")} · ${t("updated")}: ${esc((P.generated_at || "").slice(0, 16).replace("T", " "))}</div>`;
};
})();
