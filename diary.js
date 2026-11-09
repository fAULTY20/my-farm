// Farm diary: entries saved on the phone first, then synced to Supabase when online.
// Works without sign-in (entries wait on the phone) and offline.
(function () {
const CFG = window.FARM_CFG || {};
const OK = !!(CFG.url && CFG.anonKey && /^https:\/\//.test(CFG.url));
const BASE = OK ? CFG.url.replace(/\/+$/, "") : "";

Object.assign(S.ta, {diary:"குறிப்பேடு",dsign:"காப்பு & பகிர்வுக்கு உள்நுழையவும்",dsignwhy:"உள்நுழைந்தால் பதிவுகள் இணையத்தில் சேமிக்கப்படும், உங்கள் குடும்பத்தினரும் பார்க்கலாம். அதுவரை இந்த போனில் மட்டும் இருக்கும்.",email:"மின்னஞ்சல்",sendcode:"உள்நுழைவு இணைப்பை அனுப்பு",sentlink:"உள்நுழைவு இணைப்பு அனுப்பப்பட்டது. இந்த போனிலேயே மின்னஞ்சலைத் திறந்து \"Sign in\" என்பதைத் தொடுங்கள் (Spam-லும் பாருங்கள்).",havecode:"எண் குறியீடு வந்ததா?",errlink:"இணைப்பு காலாவதியானது அல்லது ஏற்கனவே பயன்படுத்தப்பட்டது. புதிய இணைப்பை அனுப்பவும்.",welcome:"உள்நுழைந்துவிட்டீர்கள்!",code:"மின்னஞ்சலில் வந்த எண்",verify:"உள்நுழை",codesent:"குறியீடு அனுப்பப்பட்டது. மின்னஞ்சலைப் பாருங்கள் (Spam-லும்).",back:"பின்",signout:"வெளியேறு",synced:"✓ சேமிக்கப்பட்டது",waiting:"பதிவேற்றக் காத்திருக்கிறது",offline:"இணையம் இல்லை, பதிவுகள் போனில் பாதுகாப்பாக உள்ளன",notset:"இணைய காப்பு இன்னும் அமைக்கப்படவில்லை. பதிவுகள் இந்த போனில் மட்டும் சேமிக்கப்படும்.",notmember:"இந்த மின்னஞ்சல் பண்ணை பட்டியலில் இல்லை. Supabase-ல் members அட்டவணையில் சேர்க்கவும்.",signedas:"உள்நுழைவு",newentry:"புதிய பதிவு",date:"தேதி",plot:"நிலப் பகுதி",crop:"பயிர்",qty:"அளவு",note:"குறிப்பு",save:"சேமி",cancel:"ரத்து",del:"நீக்கு",delq:"இந்தப் பதிவை நீக்கவா?",full:"முழுமையாக",light:"லேசாக",howmuch:"எவ்வளவு நனைத்தீர்கள்?",all:"அனைத்தும்",fmoney:"பணம்",fwater:"நீர்",fwork:"வேலை",tmonth:"இந்த மாதம்",tyear:"இந்த ஆண்டு",tall:"மொத்தம்",more:"மேலும் காட்டு",mic:"🎤 பேசுங்கள்",listening:"கேட்கிறது…",edit:"திருத்து",wellq:"மேலிருந்து நீர் ஆழம்",rainq:"மழைமானி அளவு",costl:"செலவு (₹)",incl:"வருமானம் (₹)",byme:"நான்",oldmoved:"பழைய வரவு-செலவு பதிவுகள் குறிப்பேட்டிற்கு மாற்றப்பட்டன.",wateredon:"பாசனம் பதிவு",errsync:"சேமிக்க முடியவில்லை, மீண்டும் முயற்சிக்கும்",errcode:"குறியீடு தவறு அல்லது காலாவதி. மீண்டும் அனுப்பவும்.",erremail:"மின்னஞ்சல் அனுப்ப முடியவில்லை. சிறிது நேரம் கழித்து முயற்சிக்கவும்.",nonum:"எண்ணில் மட்டும்"});
Object.assign(S.en, {diary:"Diary",dsign:"Sign in to back up & share",dsignwhy:"Once signed in, entries are saved online and your family can see them. Until then they stay on this phone only.",email:"Email",sendcode:"Send sign-in link",sentlink:"Sign-in link sent. Open the email on this phone and tap \"Sign in\" (check Spam too).",havecode:"Got a number code instead?",errlink:"That link has expired or was already used. Send a new one.",welcome:"You are signed in!",code:"Code from the email",verify:"Sign in",codesent:"Code sent. Check your email (and Spam).",back:"Back",signout:"Sign out",synced:"✓ Saved online",waiting:"waiting to upload",offline:"No internet. Entries are safe on this phone",notset:"Online backup is not set up yet. Entries are saved on this phone only.",notmember:"This email is not on the farm list. Add it to the members table in Supabase.",signedas:"Signed in",newentry:"New entry",date:"Date",plot:"Plot",crop:"Crop",qty:"Quantity",note:"Note",save:"Save",cancel:"Cancel",del:"Delete",delq:"Delete this entry?",full:"Fully",light:"Lightly",howmuch:"How much did you water?",all:"All",fmoney:"Money",fwater:"Water",fwork:"Work",tmonth:"This month",tyear:"This year",tall:"All time",more:"Show more",mic:"🎤 Speak",listening:"Listening…",edit:"Edit",wellq:"Water depth from top",rainq:"Rain gauge reading",costl:"Cost (₹)",incl:"Income (₹)",byme:"me",oldmoved:"Old Money entries were moved into the diary.",wateredon:"Watering logged",errsync:"Could not save online, will retry",errcode:"Wrong or expired code. Send a new one.",erremail:"Could not send the email. Try again in a while.",nonum:"Numbers only"});

const K = {
 sowing:{e:"🌱",ta:"விதைப்பு",en:"Sowing",u:"kg",m:"c",pc:1},
 irrigation:{e:"💧",ta:"பாசனம்",en:"Irrigation",u:"hours",m:"c",pc:1},
 manure:{e:"🐄",ta:"எரு / உரம்",en:"Manure / compost",u:"loads",m:"c",pc:1},
 spray:{e:"🧴",ta:"தெளிப்பு",en:"Spray",u:"litres",m:"c",pc:1},
 weeding:{e:"🧑‍🌾",ta:"களை / கூலி வேலை",en:"Weeding / labour",u:"people",m:"c",pc:1},
 harvest:{e:"🌾",ta:"அறுவடை",en:"Harvest",u:"kg",m:"c",pc:1},
 sale:{e:"💰",ta:"விற்பனை",en:"Sale",u:"kg",m:"i",pc:1},
 expense:{e:"🧾",ta:"செலவு",en:"Expense",u:"",m:"c",pc:1},
 rain:{e:"🌧️",ta:"மழை அளவு",en:"Rain gauge",u:"mm",m:null,pc:0},
 well:{e:"🪣",ta:"கிணற்று நீர்மட்டம்",en:"Well level",u:"ft",m:null,pc:0},
 note:{e:"📝",ta:"குறிப்பு",en:"Note",u:"",m:null,pc:0}
};
const UNIT = {kg:{ta:"கிலோ",en:"kg"},hours:{ta:"மணி நேரம்",en:"hours"},loads:{ta:"லோடு",en:"loads"},litres:{ta:"லிட்டர்",en:"litres"},people:{ta:"ஆட்கள்",en:"people"},mm:{ta:"மி.மீ",en:"mm"},ft:{ta:"அடி",en:"ft"}};
const FILT = {all:null, fmoney:e=>e.amount>0, fwater:e=>["irrigation","rain","well"].includes(e.kind), fwork:e=>["sowing","manure","spray","weeding","harvest"].includes(e.kind)};
const COLS = ["id","entry_date","kind","plot","crop","qty","unit","level","amount","note","deleted","created_at"];

const lg = (k, d) => { try { const v = localStorage.getItem(k); return v == null ? d : JSON.parse(v); } catch (e) { return d; } };
const ls = (k, v) => { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) {} };
const esc = s => String(s ?? "").replace(/[&<>"']/g, c => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
const todayIST = () => new Date(Date.now() + 5.5 * 3600e3).toISOString().slice(0, 10);
const uuid = () => (crypto.randomUUID ? crypto.randomUUID() : "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, c => { const r = Math.random() * 16 | 0; return (c == "x" ? r : (r & 3 | 8)).toString(16); }));
const rs = x => "₹" + Math.round(x || 0).toLocaleString("en-IN");

let sess = lg("sb_sess", null), cache = lg("diary_cache", []), outbox = lg("diary_outbox", []), members = lg("diary_members", []);
let st = {busy:false, err:null, notMember:false, step: "email", email: (sess && sess.email) || lg("sb_email", ""), msg: null};
// back from the email link: tokens arrive in the address (#access_token=...)
function fromLink() {
  const h = new URLSearchParams(location.hash.slice(1));
  if (!h.get("access_token") && !h.get("error_description")) return false;
  if (h.get("access_token")) {
    let em = st.email;
    try { em = JSON.parse(atob(h.get("access_token").split(".")[1].replace(/-/g, "+").replace(/_/g, "/"))).email || em; } catch (e) {}
    keep({access_token: h.get("access_token"), refresh_token: h.get("refresh_token"), expires_at: +h.get("expires_at") || 0, expires_in: +h.get("expires_in") || 3600}, em);
    st.email = em; st.step = "email"; st.msg = "welcome";
  } else { st.msg = "errlink"; st.step = "email"; }
  try { tab = "diary"; } catch (e) {}
  history.replaceState(null, "", location.pathname + location.search);
  return true;
}
fromLink();
addEventListener("hashchange", () => { if (fromLink()) { go(); sync(); } });
let DF = null, filt = "all", period = "tyear", shown = 40;

// ---- one-time: move old Money tab entries into the diary ----
(function migrate() {
  if (lg("ledger_migrated", false)) return;
  const led = lg("ledger", []);
  if (Array.isArray(led) && led.length) {
    const now = new Date().toISOString();
    led.forEach(e => outbox.push(norm({id: uuid(), entry_date: e.date || todayIST(), kind: e.type == "i" ? "sale" : "expense",
      amount: +e.amt || null, note: e.item || "", created_at: now})));
    ls("diary_outbox", outbox); st.msg = "oldmoved";
  }
  ls("ledger_migrated", true);
})();

function norm(r) { const o = {}; COLS.forEach(k => o[k] = r[k] === undefined || r[k] === "" ? null : r[k]); o.deleted = !!r.deleted; return o; }
function entries() {
  const m = new Map(cache.map(r => [r.id, r]));
  outbox.forEach(r => m.set(r.id, {...m.get(r.id), ...r, _pending: true}));
  return [...m.values()].filter(r => !r.deleted)
    .sort((a, b) => (b.entry_date || "").localeCompare(a.entry_date || "") || (b.created_at || "").localeCompare(a.created_at || ""));
}

// ---- Supabase calls (plain fetch: no library, works with the offline cache) ----
async function authPost(path, body) {
  const r = await fetch(BASE + "/auth/v1/" + path, {method:"POST", headers:{apikey:CFG.anonKey, "Content-Type":"application/json"}, body:JSON.stringify(body)});
  const j = await r.json().catch(() => ({}));
  if (!r.ok) throw Object.assign(new Error(j.msg || j.error_description || j.message || ("HTTP " + r.status)), {status:r.status});
  return j;
}
function keep(j, email) {
  sess = {at:j.access_token, rt:j.refresh_token, exp:j.expires_at || Math.floor(Date.now() / 1000) + (j.expires_in || 3600), email:(j.user && j.user.email) || email};
  ls("sb_sess", sess);
}
async function token() {
  if (!sess) return null;
  if (sess.exp - 120 < Date.now() / 1000) {
    try { keep(await authPost("token?grant_type=refresh_token", {refresh_token: sess.rt}), sess.email); }
    catch (e) { if (e.status >= 400 && e.status < 500) { sess = null; ls("sb_sess", null); } throw e; }
  }
  return sess.at;
}
async function rest(path, opt = {}) {
  const t = await token(); if (!t) throw new Error("no session");
  const r = await fetch(BASE + "/rest/v1/" + path, {...opt, headers:{apikey:CFG.anonKey, Authorization:"Bearer " + t, "Content-Type":"application/json", ...(opt.headers || {})}});
  if (r.status == 401) { sess.exp = 0; ls("sb_sess", sess); }
  if (!r.ok) throw Object.assign(new Error("HTTP " + r.status + " " + (await r.text()).slice(0, 200)), {status:r.status});
  return r.status == 204 || r.status == 201 && !(r.headers.get("content-type") || "").includes("json") ? null : r.json();
}

async function sync() {
  if (!OK || !sess || st.busy || !navigator.onLine) { refresh(); return; }
  st.busy = true; refresh();
  try {
    if (outbox.length) {
      const send = outbox.slice(0, 200).map(norm);
      await rest("diary?on_conflict=id", {method:"POST", headers:{Prefer:"resolution=merge-duplicates,return=minimal"}, body:JSON.stringify(send)});
      const sent = new Set(send.map(r => JSON.stringify(r)));   // keep anything edited again while uploading
      outbox = outbox.filter(r => !sent.has(JSON.stringify(norm(r))));
      ls("diary_outbox", outbox);
    }
    const [rows, mem] = await Promise.all([
      rest("diary?select=*&order=entry_date.desc,created_at.desc&limit=5000"),
      rest("members?select=email,name")]);
    cache = rows || []; members = mem || []; ls("diary_cache", cache); ls("diary_members", members);
    st.notMember = !members.some(m => m.email == (sess.email || "").toLowerCase());
    st.err = null; ls("diary_last_sync", new Date().toISOString());
    if (outbox.length && !st.notMember) setTimeout(sync, 500);
  } catch (e) {
    st.err = String(e.message || e); console.warn("diary sync", e);
  } finally { st.busy = false; refresh(); }
}

// redraw the diary tab unless someone is typing in it
let pend = false;
function refresh() {
  const a = document.activeElement, typing = a && /INPUT|TEXTAREA|SELECT/.test(a.tagName) && a.closest("#app");
  const s = document.getElementById("dsync"); if (s) s.innerHTML = syncLine();
  if (tab == "diary" && (DF || typing)) { pend = true; return; }
  if (tab == "diary" || tab == "today") go();
}

function syncLine() {
  if (!OK) return t("notset");
  if (!sess) return outbox.length ? `${outbox.length} ${t("waiting")}` : "";
  if (st.notMember) return `<span style="color:#d9534f">${t("notmember")}</span>`;
  if (!navigator.onLine) return t("offline") + (outbox.length ? ` · ${outbox.length} ${t("waiting")}` : "");
  if (st.busy) return "…";
  if (st.err) return `<span style="color:#d9534f">${t("errsync")}</span>` + (outbox.length ? ` · ${outbox.length} ${t("waiting")}` : "");
  return outbox.length ? `${outbox.length} ${t("waiting")}` : t("synced");
}

// ---- sign in: the email has a link (default Supabase email); a 6-digit code also works if the template sends one ----
window.dSend = async () => {
  const em = (document.getElementById("dem").value || "").trim().toLowerCase();
  if (!/^\S+@\S+\.\S+$/.test(em)) return;
  st.email = em; ls("sb_email", em); st.msg = null;
  const back = encodeURIComponent(location.origin + location.pathname);
  try { await authPost("otp?redirect_to=" + back, {email: em, create_user: true}); st.step = "sent"; st.msg = "sentlink"; }
  catch (e) { st.msg = "erremail"; console.warn(e); }
  document.activeElement && document.activeElement.blur(); go();
};
window.dVerify = async () => {
  const code = (document.getElementById("dcode").value || "").replace(/\D/g, "");
  if (code.length < 6) return;
  try { keep(await authPost("verify", {type:"email", email: st.email, token: code}), st.email); st.step = "email"; st.msg = null; document.activeElement && document.activeElement.blur(); go(); sync(); }
  catch (e) { st.msg = "errcode"; go(); }
};
window.dBack = () => { st.step = "email"; st.msg = null; go(); };
window.dSend2 = async () => { st.msg = null; const back = encodeURIComponent(location.origin + location.pathname);
  try { await authPost("otp?redirect_to=" + back, {email: st.email, create_user: true}); st.msg = "sentlink"; } catch (e) { st.msg = "erremail"; } go(); };
window.dCode = () => { st.step = "code"; st.msg = null; go(); };
window.dOut = () => { sess = null; ls("sb_sess", null); cache = []; ls("diary_cache", []); go(); };

// ---- entry form ----
window.dNew = k => { DF = {id: uuid(), kind: k, entry_date: todayIST(), unit: K[k].u || null, level: k == "irrigation" ? "full" : null, isNew: true}; go(); scrollTo(0, 0); };
window.dEdit = id => { const e = entries().find(x => x.id == id); if (e) { DF = {...e, isNew:false}; go(); scrollTo(0, 0); } };
window.dCancel = () => { DF = null; go(); };
window.dLevel = v => { DF.level = v; document.querySelectorAll(".lvl button").forEach(b => b.classList.toggle("on", b.dataset.v == v)); };
window.dSave = () => {
  const v = id => { const el = document.getElementById(id); return el ? el.value.trim() : ""; };
  const num = id => { const x = v(id).replace(/,/g, ""); return x === "" ? null : (isFinite(+x) ? +x : NaN); };
  const q = num("fq"), a = num("fa");
  if (Number.isNaN(q) || Number.isNaN(a) || (a != null && a < 0)) { alertBox(t("nonum")); return; }
  const r = norm({...DF, entry_date: v("fd") || todayIST(), plot: v("fp"), crop: v("fc"), qty: q, amount: a, note: v("fn"),
    created_at: DF.created_at || new Date().toISOString()});
  outbox = outbox.filter(x => x.id != r.id).concat([r]); ls("diary_outbox", outbox);
  DF = null; go(); sync();
};
window.dDel = () => {
  if (!confirm(t("delq"))) return;
  const base = entries().find(x => x.id == DF.id) || DF;
  outbox = outbox.filter(x => x.id != DF.id).concat([norm({...base, deleted: true})]); ls("diary_outbox", outbox);
  DF = null; go(); sync();
};
function alertBox(m) { const b = document.getElementById("ferr"); if (b) b.textContent = m; }
window.dMic = () => {
  const SR = window.SpeechRecognition || window.webkitSpeechRecognition; if (!SR) return;
  const rec = new SR(), btn = document.getElementById("fmic"), box = document.getElementById("fn");
  rec.lang = L == "ta" ? "ta-IN" : "en-IN"; rec.interimResults = false;
  rec.onresult = ev => { const txt = [...ev.results].map(r => r[0].transcript).join(" "); box.value = (box.value ? box.value + " " : "") + txt; };
  rec.onend = rec.onerror = () => { btn.textContent = t("mic"); };
  btn.textContent = t("listening"); rec.start();
};
window.dFilt = f => { filt = f; shown = 40; go(); };
window.dPer = p => { period = p; go(); };
window.dMore = () => { shown += 40; go(); };

const kl = k => K[k] ? K[k][L] : k;
const ul = u => u ? (UNIT[u] ? UNIT[u][L] : u) : "";
function who(email) {
  if (!email) return "";
  if (sess && email == sess.email) return t("byme");
  const m = members.find(x => x.email == email); return m ? m.name : email.split("@")[0];
}
function datalist(id, field) {
  const vals = [...new Set(entries().map(e => e[field]).filter(Boolean))].slice(0, 30);
  return `<datalist id="${id}">${vals.map(x => `<option value="${esc(x)}">`).join("")}</datalist>`;
}

function form() {
  const k = K[DF.kind], qlab = DF.kind == "well" ? t("wellq") : DF.kind == "rain" ? t("rainq") : t("qty");
  return `<div class="card"><h2>${k.e} ${kl(DF.kind)}</h2>
  <label class="mut">${t("date")}</label><input id="fd" type="date" value="${esc(DF.entry_date)}" max="${todayIST()}">
  ${k.pc ? `<div class="row"><div><label class="mut">${t("plot")}</label><input id="fp" list="dlp" value="${esc(DF.plot)}" placeholder="P1"></div>
   <div><label class="mut">${t("crop")}</label><input id="fc" list="dlc" value="${esc(DF.crop)}"></div></div>${datalist("dlp","plot")}${datalist("dlc","crop")}` : ""}
  ${DF.kind == "irrigation" ? `<label class="mut">${t("howmuch")}</label><div class="seg lvl"><button data-v="full" class="${DF.level=="full"?"on":""}" onclick="dLevel('full')">💧💧 ${t("full")}</button><button data-v="light" class="${DF.level=="light"?"on":""}" onclick="dLevel('light')">💧 ${t("light")}</button></div>` : ""}
  ${DF.kind != "note" && DF.kind != "expense" ? `<label class="mut">${qlab}${k.u ? " (" + ul(k.u) + ")" : ""}</label><input id="fq" inputmode="decimal" value="${DF.qty ?? ""}">` : ""}
  ${k.m ? `<label class="mut">${k.m == "i" ? t("incl") : t("costl")}</label><input id="fa" inputmode="numeric" value="${DF.amount ?? ""}">` : ""}
  <label class="mut">${t("note")}</label><textarea id="fn" rows="3" style="width:100%;padding:11px;font:inherit;border:1px solid var(--line);border-radius:10px;background:var(--card);color:var(--ink)">${esc(DF.note)}</textarea>
  ${(window.SpeechRecognition || window.webkitSpeechRecognition) ? `<button class="spk" style="float:none;margin:6px 0" id="fmic" onclick="dMic()">${t("mic")}</button>` : ""}
  <div id="ferr" style="color:#d9534f"></div>
  <div class="row" style="margin-top:8px"><div><button class="btn" onclick="dSave()">${t("save")}</button></div><div><button class="btn" style="background:var(--line);color:var(--ink)" onclick="dCancel()">${t("cancel")}</button></div></div>
  ${DF.isNew ? "" : `<button class="x" style="margin-top:10px;color:#d9534f;font-size:16px" onclick="dDel()">🗑 ${t("del")}</button>`}</div>`;
}

function signin() {
  if (!OK || sess) return "";
  return `<div class="card lv-info"><h2>${t("dsign")}</h2><div class="mut" style="margin-bottom:8px">${t("dsignwhy")}</div>
  ${st.step == "email"
    ? `<input id="dem" type="email" autocomplete="email" placeholder="${t("email")}" value="${esc(st.email)}"><button class="btn" onclick="dSend()">${t("sendcode")}</button>`
    : st.step == "sent"
    ? `<div class="mut">${esc(st.email)}</div><div class="row" style="margin-top:8px"><div><button class="btn" style="background:var(--line);color:var(--ink)" onclick="dSend2()">↻ ${t("sendcode")}</button></div><div><button class="btn" style="background:var(--line);color:var(--ink)" onclick="dBack()">${t("back")}</button></div></div><a href="#" class="mut" style="display:block;margin-top:10px" onclick="dCode();return false">${t("havecode")}</a>`
    : `<div class="mut">${esc(st.email)}</div><input id="dcode" inputmode="numeric" autocomplete="one-time-code" maxlength="10" placeholder="${t("code")}"><div class="row"><div><button class="btn" onclick="dVerify()">${t("verify")}</button></div><div><button class="btn" style="background:var(--line);color:var(--ink)" onclick="dBack()">${t("back")}</button></div></div>`}
  ${st.msg ? `<div style="margin-top:8px">${t(st.msg)}</div>` : ""}</div>`;
}

function inPeriod(e) {
  const d = e.entry_date || "", now = todayIST();
  return period == "tall" || (period == "tyear" ? d.slice(0, 4) == now.slice(0, 4) : d.slice(0, 7) == now.slice(0, 7));
}

window.diary = function () {
  if (DF) return form();
  const all = entries(), per = all.filter(inPeriod);
  const c = per.filter(e => e.amount > 0 && K[e.kind] && K[e.kind].m == "c").reduce((s, e) => s + +e.amount, 0);
  const i = per.filter(e => e.amount > 0 && e.kind == "sale").reduce((s, e) => s + +e.amount, 0);
  const ac = (F && F.farm.area_acres_from_boundary) || 8.2;
  const list = all.filter(FILT[filt] || (() => true));
  const msg = st.msg == "oldmoved" || st.msg == "welcome" ? `<div class="card lv-ok">${t(st.msg)}</div>` : "";
  if (st.msg == "oldmoved" || st.msg == "welcome") st.msg = null;
  let lastM = "";
  const rows = list.slice(0, shown).map(e => {
    const m = e.entry_date.slice(0, 7), head = m != lastM ? `<div class="mut" style="margin:12px 0 4px;font-weight:700">${new Date(m + "-01").toLocaleDateString(L == "ta" ? "ta-IN" : "en-IN", {month:"long", year:"numeric"})}</div>` : "";
    lastM = m; const k = K[e.kind] || {e:"•"};
    const bits = [e.plot, e.crop, e.qty != null ? `${e.qty} ${ul(e.unit)}` : "", e.kind == "irrigation" && e.level ? t(e.level) : ""].filter(Boolean).map(esc).join(" · ");
    const amt = e.amount > 0 ? `<div style="font-weight:700;color:${e.kind == "sale" ? "#2e9d57" : "#d9534f"}">${e.kind == "sale" ? "+" : "−"}${rs(e.amount)}</div>` : "";
    return head + `<div class="row" style="align-items:flex-start;border-bottom:1px solid var(--line);padding:8px 0;cursor:pointer" onclick="dEdit('${e.id}')">
      <div style="flex:0 0 34px;min-width:34px;font-size:24px">${k.e}</div>
      <div style="flex:5"><b>${kl(e.kind)}</b> <span class="mut">${e.entry_date.slice(8)}/${e.entry_date.slice(5, 7)}</span>${bits ? `<div>${bits}</div>` : ""}${e.note ? `<div class="mut">${esc(e.note)}</div>` : ""}<div class="mut" style="font-size:12px">${e._pending ? "⏳ " : ""}${esc(who(e.author_email))}</div></div>
      <div style="flex:2;text-align:right;min-width:80px">${amt}</div></div>`;
  }).join("");
  return `${msg}<div class="mut" id="dsync" style="margin:0 2px 8px">${syncLine()}</div>
  ${signin()}
  <div class="card"><div class="seg">${["tmonth","tyear","tall"].map(p => `<button class="${period == p ? "on" : ""}" onclick="dPer('${p}')">${t(p)}</button>`).join("")}</div>
   <div class="row"><div><div class="mut">${t("cost")}</div><div class="big" style="font-size:22px">${rs(c)}</div></div><div><div class="mut">${t("inc")}</div><div class="big" style="font-size:22px">${rs(i)}</div></div><div><div class="mut">${t("prof")}</div><div class="big" style="font-size:22px;color:${i - c >= 0 ? "#2e9d57" : "#d9534f"}">${rs(i - c)}</div></div></div>
   <div class="mut">${t("cpa")}: ${rs(c / ac)}</div></div>
  <div class="card"><h2>${t("newentry")}</h2><div style="display:grid;grid-template-columns:repeat(4,1fr);gap:8px">
   ${Object.keys(K).map(k => `<button onclick="dNew('${k}')" style="border:1px solid var(--line);background:var(--bg);border-radius:12px;padding:8px 2px;font:inherit;font-size:12.5px;color:var(--ink);line-height:1.25"><div style="font-size:26px">${K[k].e}</div>${kl(k)}</button>`).join("")}</div></div>
  <div class="card"><div class="seg" style="flex-wrap:wrap">${Object.keys(FILT).map(f => `<button class="${filt == f ? "on" : ""}" onclick="dFilt('${f}')">${t(f)}</button>`).join("")}</div>
   ${rows || `<div class="mut">${t("none")}</div>`}
   ${list.length > shown ? `<button class="btn" style="margin-top:10px;background:var(--line);color:var(--ink)" onclick="dMore()">${t("more")}</button>` : ""}
   ${sess ? `<div class="mut" style="margin-top:14px;font-size:13px">${t("signedas")}: ${esc(sess.email)} · <a href="#" onclick="dOut();return false" style="color:inherit">${t("signout")}</a></div>` : ""}</div>`;
};

// ---- irrigation entries adjust the "water today?" estimate ----
window.adjWater = function (w, today) {
  if (!w || !w.history || !w.history.length) return w;
  const irr = {}; entries().filter(e => e.kind == "irrigation").forEach(e => { irr[e.entry_date] = irr[e.entry_date] == "full" ? "full" : (e.level || "full"); });
  const h = w.history, first = h[0].date;
  const dates = Object.keys(irr).filter(d => d >= first && d <= today).sort();
  if (!dates.length) return w;
  const taw = w.taw_mm, raw = w.raw_mm, cl = x => Math.min(taw, Math.max(0, x));
  const water = (d, lv) => lv == "full" ? 0 : cl(d - raw / 2);
  let i0 = h.findIndex(x => x.date >= dates[0]); if (i0 < 0) i0 = h.length;
  let d = i0 > 0 ? h[i0 - 1].deficit_mm : cl(h[0].deficit_mm + h[0].rain_mm - h[0].use_mm);
  for (let i = i0; i < h.length; i++) { if (irr[h[i].date]) d = water(d, irr[h[i].date]); d = cl(d - h[i].rain_mm + h[i].use_mm); }
  if (irr[today]) d = water(d, irr[today]);
  const last = dates[dates.length - 1], mp = Math.round(100 * (1 - d / taw));
  const use = h.reduce((s, x) => s + (x.use_mm || 0), 0) / h.length || 3;
  const fmt = lng => new Date(last).toLocaleDateString(lng == "ta" ? "ta-IN" : "en-IN", {day:"numeric", month:"short"});
  const o = {...w, deficit_mm: Math.round(d * 10) / 10, moisture_pct: mp, adjusted: true, last_irrigation: last};
  if (d >= raw) {
    const soon = w.rain_next_2_days_mm >= Math.min(0.6 * d, raw);
    o.status = soon ? "wait_rain" : "irrigate"; o.irrigate_mm = soon ? 0 : Math.round(d);
    const lit = Math.round(o.irrigate_mm * 4047 / 1000) * 1000;
    o.text_en = soon ? `Soil is getting dry (about ${mp}%), but about ${Math.round(w.rain_next_2_days_mm)} mm of rain is expected by tomorrow. Wait for the rain.`
      : `Last watering ${fmt("en")} has mostly been used up (stored water about ${mp}%). If a crop is standing, irrigate today: about ${o.irrigate_mm} mm, roughly ${lit.toLocaleString("en-IN")} litres per acre, in 2 smaller turns.`;
    o.text_ta = soon ? `மண் காய்ந்து வருகிறது (ஈரம் சுமார் ${mp}%), ஆனால் நாளைக்குள் சுமார் ${Math.round(w.rain_next_2_days_mm)} மி.மீ மழை எதிர்பார்க்கப்படுகிறது. மழைக்காகக் காத்திருங்கள்.`
      : `${fmt("ta")} செய்த பாசன ஈரம் பெரும்பாலும் தீர்ந்துவிட்டது (ஈரம் சுமார் ${mp}%). பயிர் இருந்தால் இன்று சுமார் ${o.irrigate_mm} மி.மீ பாசனம் செய்யுங்கள் (ஏக்கருக்கு சுமார் ${lit.toLocaleString("en-IN")} லிட்டர்), 2 முறையாகப் பிரித்து.`;
  } else {
    const n = Math.max(0, Math.floor((raw - d) / use));
    o.status = n <= 1 ? "soon" : "ok"; o.irrigate_mm = 0; o.next_need_in_days = n;
    o.text_en = `Watering on ${fmt("en")} is counted. Soil moisture about ${mp}%. No irrigation today; next one likely in about ${n} day${n == 1 ? "" : "s"} if no rain.`;
    o.text_ta = `${fmt("ta")} பாசனம் கணக்கில் சேர்க்கப்பட்டது. மண் ஈரம் சுமார் ${mp}%. இன்று பாசனம் தேவையில்லை; மழை இல்லையென்றால் அடுத்தது சுமார் ${n} நாட்களில்.`;
  }
  return o;
};

let inited = false;
window.diaryInit = function () {
  if (inited) return; inited = true;
  addEventListener("online", sync); addEventListener("offline", refresh);
  document.addEventListener("visibilitychange", () => { if (!document.hidden) sync(); });
  setInterval(() => { if (!document.hidden) sync(); }, 5 * 60e3);
  window.addEventListener("focusout", () => setTimeout(() => { if (pend && !DF && !(document.activeElement && /INPUT|TEXTAREA/.test(document.activeElement.tagName))) { pend = false; go(); } }, 50));
  sync();
};
// data may have loaded before this file did
if (typeof W !== "undefined" && W) { window.diaryInit(); go(); }
window.diaryInfo = () => ({OK, signedIn: !!sess, outbox: outbox.length, cache: cache.length, notMember: st.notMember, err: st.err});
})();
