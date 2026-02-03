/* ======================================================
   AdigaFX Trade Journal – FULL v37
   - Local storage only
   - XAUUSD logic: $ = (price diff) * lot * 100
   - Time filters + analytics + all trades table + delete/edit
   - Checklist optional (no requirement)
   - Settings: Export/Import/Reset, Hide PnL, Language EN/HE (RTL)
   - Share Snapshot screen (screenshot)
   Built by FaShuSh for AdigaFX
====================================================== */

try {
  const tg = window.Telegram?.WebApp;
  tg?.ready();
  tg?.expand();
} catch (e) {}

const STORAGE_KEY = "adigafx_trade_journal_v37";

let state = {
  trades: [],
  hidePnl: false,
  language: "EN",     // EN | HE
  period: "ALL"       // ALL | TODAY | WEEK | MONTH
};

try {
  const saved = JSON.parse(localStorage.getItem(STORAGE_KEY));
  if (saved && typeof saved === "object") state = { ...state, ...saved };
} catch (e) {}

const $ = (id) => document.getElementById(id);
const $$ = (q) => Array.from(document.querySelectorAll(q));

function saveState(){ localStorage.setItem(STORAGE_KEY, JSON.stringify(state)); }

function num(v){ const n = parseFloat(v); return Number.isFinite(n) ? n : null; }

function todayStr(){ return new Date().toISOString().slice(0,10); }

function daysAgo(n){
  const d = new Date();
  d.setDate(d.getDate() - n);
  return d.toISOString().slice(0,10);
}

function fmtMoney(v){
  if (state.hidePnl) return t("hidden");
  return "$" + (Number(v)||0).toFixed(2);
}
function fmtMoneyRaw(v){ return "$" + (Number(v)||0).toFixed(2); }

function calcRisk(entry, sl, lot){ return Math.abs(entry - sl) * lot * 100; }
function calcPnL(dir, entry, exit, lot){
  const diff = (dir === "LONG") ? (exit - entry) : (entry - exit);
  return diff * lot * 100;
}
function calcR(pnl, risk){ return risk ? (pnl / risk) : 0; }

function esc(s){
  return String(s ?? "").replace(/[&<>"']/g, m => ({
    "&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#039;"
  })[m]);
}

/* =========================
   i18n
========================= */
const I18N = {
  EN: {
    subtitle: "XAUUSD • Trade Journal (Local)",
    tab_home:"Home", tab_checklist:"Checklist", tab_new:"New", tab_close:"Close", tab_review:"Review", tab_all:"All", tab_edit:"Edit", tab_settings:"Settings", tab_snapshot:"Snapshot",
    time_all:"ALL", time_today:"TODAY", time_week:"WEEK", time_month:"MONTH",
    overview_title:"Overview", sessions_title:"Sessions", recent_title:"Recent (filtered)", all_title:"All Trades (filtered)",
    checklist_title:"Pre-Trade Checklist (optional)", checklist_box_title:"Checklist (NOT required)", checklist_box_hint:"Leave unchecked if you want — still saves.",
    new_title:"New Trade", close_title:"Close Trade", review_title:"Review Trade", edit_title:"Edit Trade",
    label_direction:"Direction", label_date:"Date", label_session:"Session", label_entry:"Entry", label_sl:"Stop Loss", label_tp:"TP", label_tp_optional:"TP (optional)", label_lot:"Lot",
    label_setup:"Strategy / Setup", ph_setup:"e.g. Sweep + MSS", label_notes:"Notes",
    k_total_pnl:"Total PnL", k_winrate:"Win Rate", k_avg_r:"Avg R", k_open_risk:"Open Risk",
    k_mae_avg:"MAE Avg", k_mfe_avg:"MFE Avg", k_best_worst:"Best / Worst", k_streak:"Streak",
    k_discipline_cost:"Discipline Cost", k_top_setup:"Top Setup",
    k_risk_usd:"Risk $:", k_r_result:"R result:",
    btn_add_open:"✅ Add OPEN trade", btn_save_open:"✅ Save OPEN",
    btn_select_open:"Select OPEN trade", btn_select_trade:"Select trade",
    label_exit:"Exit price", label_pnl_if_no_exit:"PnL ($) (if no exit)",
    mae_title:"MAE / MFE",
    mae_explain:"MAE = Maximum Adverse Excursion (worst against you) • MFE = Maximum Favorable Excursion (best for you)",
    mae_short:"MAE = worst against you • MFE = best for you",
    mae_art:"LONG: MAE=lowest • MFE=highest\nSHORT: MAE=highest • MFE=lowest",
    label_mae_price:"MAE price (worst)", label_mfe_price:"MFE price (best)",
    btn_close_save:"🏁 Close & Save",
    label_followed_plan:"Followed plan?", yes:"YES", no:"NO",
    label_mistake_type:"Discipline mistake type", none:"None",
    label_mistake_note:"Mistake note (optional)", ph_mistake:"Short note...",
    label_review_notes:"Review notes", btn_save_review:"💾 Save review",
    label_status:"Status", open:"OPEN", closed:"CLOSED", btn_save_changes:"💾 Save changes",
    settings_sharing:"Sharing", btn_share_snapshot:"Share Snapshot", btn_export_json:"Export JSON",
    label_import_json:"Import JSON", ph_import:"Paste backup JSON here...",
    btn_import_replace:"Import (Replace)", btn_import_merge:"Import (Merge)",
    settings_language:"Language", lang_hint:"Default is EN. Hebrew uses RTL.",
    settings_privacy:"Privacy", hide_pnl:"Hide PnL amounts (default OFF)",
    danger_zone:"Danger zone", btn_reset_all:"Reset all data", reset_hint:"Deletes everything saved locally on this device.",
    btn_back:"Back", btn_how_share:"How to share",
    unknown:"Unknown", dash:"—",
    long:"LONG", short:"SHORT",
    credit:"Built by FaShuSh for AdigaFX",
    hidden:"Hidden",
    msg_no_closed:"No closed trades in this period.",
    msg_no_trades:"No trades in this period.",
    msg_pick_open:"No OPEN trades in this period.",
    msg_pick_trade:"No trades to pick.",
    msg_need_entry_sl_lot:"Entry, SL and Lot are required",
    msg_need_exit_or_pnl:"Exit price OR PnL is required",
    msg_pick_first:"Pick a trade first",
    msg_reset_confirm:"Type DELETE to confirm",
    msg_export_ok:"Export copied to clipboard ✅",
    msg_export_fail:"Copy failed. You can manually copy from the text area.",
    msg_import_ok:"Imported ✅",
    msg_import_bad:"Invalid JSON ❌",
    msg_merge_ok:"Merged ✅",
    msg_deleted:"Deleted ✅",
    msg_share_tip:"Take a screenshot of this screen and share it ✅"
  },

  HE: {
    subtitle: "XAUUSD • יומן מסחר (שמירה מקומית)",
    tab_home:"בית", tab_checklist:"צ׳ק ליסט", tab_new:"חדש", tab_close:"סגירה", tab_review:"סקירה", tab_all:"הכל", tab_edit:"עריכה", tab_settings:"הגדרות", tab_snapshot:"שיתוף",
    time_all:"הכל", time_today:"היום", time_week:"שבוע", time_month:"חודש",
    overview_title:"סיכום", sessions_title:"סשנים", recent_title:"אחרונים (מסונן)", all_title:"כל העסקאות (מסונן)",
    checklist_title:"צ׳ק ליסט לפני כניסה (אופציונלי)", checklist_box_title:"צ׳ק ליסט (לא חובה)", checklist_box_hint:"אפשר להשאיר לא מסומן — עדיין נשמר.",
    new_title:"עסקה חדשה", close_title:"סגירת עסקה", review_title:"סקירת עסקה", edit_title:"עריכת עסקה",
    label_direction:"כיוון", label_date:"תאריך", label_session:"סשן", label_entry:"כניסה", label_sl:"סטופ", label_tp:"טייק", label_tp_optional:"טייק (אופציונלי)", label_lot:"לוט",
    label_setup:"אסטרטגיה / סטאפ", ph_setup:"לדוגמה: Sweep + MSS", label_notes:"הערות",
    k_total_pnl:"סה״כ PnL", k_winrate:"אחוז הצלחה", k_avg_r:"ממוצע R", k_open_risk:"סיכון פתוח",
    k_mae_avg:"MAE ממוצע", k_mfe_avg:"MFE ממוצע", k_best_worst:"הטוב/הגרוע", k_streak:"רצף",
    k_discipline_cost:"מחיר משמעת", k_top_setup:"סטאפ מוביל",
    k_risk_usd:"סיכון $:", k_r_result:"תוצאת R:",
    btn_add_open:"✅ הוסף עסקה פתוחה", btn_save_open:"✅ שמור כפתוחה",
    btn_select_open:"בחר עסקה פתוחה", btn_select_trade:"בחר עסקה",
    label_exit:"מחיר יציאה", label_pnl_if_no_exit:"רווח/הפסד ($) אם אין יציאה",
    mae_title:"MAE / MFE",
    mae_explain:"MAE = מקסימום נגדך • MFE = מקסימום לטובתך",
    mae_short:"MAE = נגדך • MFE = לטובתך",
    mae_art:"לונג: MAE=נמוך ביותר • MFE=גבוה ביותר\nשורט: MAE=גבוה ביותר • MFE=נמוך ביותר",
    label_mae_price:"מחיר MAE (הכי נגדך)", label_mfe_price:"מחיר MFE (הכי לטובתך)",
    btn_close_save:"🏁 סגור ושמור",
    label_followed_plan:"פעלתי לפי התכנית?", yes:"כן", no:"לא",
    label_mistake_type:"סוג טעות משמעת", none:"אין",
    label_mistake_note:"הערת טעות (אופציונלי)", ph_mistake:"הערה קצרה...",
    label_review_notes:"הערות סקירה", btn_save_review:"💾 שמור סקירה",
    label_status:"סטטוס", open:"פתוח", closed:"סגור", btn_save_changes:"💾 שמור שינויים",
    settings_sharing:"שיתוף", btn_share_snapshot:"שתף תמונת מצב", btn_export_json:"ייצוא JSON",
    label_import_json:"ייבוא JSON", ph_import:"הדבק גיבוי JSON כאן...",
    btn_import_replace:"ייבוא (החלפה)", btn_import_merge:"ייבוא (מיזוג)",
    settings_language:"שפה", lang_hint:"ברירת מחדל אנגלית. בעברית RTL.",
    settings_privacy:"פרטיות", hide_pnl:"הסתר סכומי PnL (ברירת מחדל כבוי)",
    danger_zone:"אזור מסוכן", btn_reset_all:"אפס את כל הנתונים", reset_hint:"מוחק הכל מהמכשיר הזה.",
    btn_back:"חזרה", btn_how_share:"איך משתפים",
    unknown:"לא ידוע", dash:"—",
    long:"לונג", short:"שורט",
    credit:"נבנה ע״י FaShuSh עבור AdigaFX",
    hidden:"מוסתר",
    msg_no_closed:"אין עסקאות סגורות בתקופה הזו.",
    msg_no_trades:"אין עסקאות בתקופה הזו.",
    msg_pick_open:"אין עסקאות פתוחות בתקופה הזו.",
    msg_pick_trade:"אין עסקאות לבחור.",
    msg_need_entry_sl_lot:"חובה למלא כניסה, סטופ ולוט",
    msg_need_exit_or_pnl:"חובה למלא מחיר יציאה או PnL",
    msg_pick_first:"בחר עסקה קודם",
    msg_reset_confirm:"כתוב DELETE לאישור",
    msg_export_ok:"הייצוא הועתק ללוח ✅",
    msg_export_fail:"ההעתקה נכשלה. אפשר להעתיק ידנית מהטקסט.",
    msg_import_ok:"יובא בהצלחה ✅",
    msg_import_bad:"JSON לא תקין ❌",
    msg_merge_ok:"מוזג בהצלחה ✅",
    msg_deleted:"נמחק ✅",
    msg_share_tip:"צלם מסך של הדף הזה ושתף ✅"
  }
};

function t(key){
  const lang = state.language in I18N ? state.language : "EN";
  return I18N[lang][key] ?? I18N.EN[key] ?? key;
}

function applyLanguage(){
  const isHE = state.language === "HE";
  document.documentElement.lang = isHE ? "he" : "en";
  document.documentElement.dir = isHE ? "rtl" : "ltr";
  document.body.classList.toggle("rtl", isHE);

  $$("[data-i18n]").forEach(el=>{
    const k = el.getAttribute("data-i18n");
    el.textContent = t(k);
  });

  $$("[data-i18n-ph]").forEach(el=>{
    const k = el.getAttribute("data-i18n-ph");
    el.setAttribute("placeholder", t(k));
  });

  const sheetSearch = $("sheetSearch");
  if (sheetSearch) sheetSearch.setAttribute("placeholder", isHE ? "חיפוש..." : "Search...");

  renderDashboard();
  renderAllTrades();
  renderSnapshot();
}

/* =========================
   UI Navigation
========================= */
function showScreen(route){
  $$(".tab").forEach(b => b.classList.toggle("active", b.dataset.route === route));
  $$(".screen").forEach(s => s.classList.toggle("active", s.id === "screen-" + route));

  if (route === "dash") renderDashboard();
  if (route === "all") renderAllTrades();
  if (route === "snapshot") renderSnapshot();
}

$$(".tab").forEach(btn => btn.addEventListener("click", ()=>showScreen(btn.dataset.route)));
$("openSettingsBtn").onclick = ()=> showScreen("settings");

$("qaNew").onclick = ()=>showScreen("new");
$("qaChecklist").onclick = ()=>showScreen("check");
$("qaClose").onclick = ()=>showScreen("close");
$("qaAll").onclick = ()=>showScreen("all");

/* =========================
   Seg helpers
========================= */
function setSegActive(containerId, valueKey, value){
  $$("#"+containerId+" .segBtn").forEach(b => {
    const v = b.dataset[valueKey];
    b.classList.toggle("active", v === value);
  });
}
function getSegValue(containerId, valueKey, fallback){
  const b = document.querySelector(`#${containerId} .segBtn.active`);
  return b?.dataset[valueKey] ?? fallback;
}
function wireSeg(containerId, valueKey, onChange){
  const el = $(containerId);
  if (!el) return;
  el.addEventListener("click", (e)=>{
    const btn = e.target.closest(".segBtn");
    if (!btn) return;
    $$("#"+containerId+" .segBtn").forEach(b=>b.classList.remove("active"));
    btn.classList.add("active");
    onChange(btn.dataset[valueKey]);
  });
}

/* time seg */
wireSeg("timeSeg","time",(val)=>{
  state.period = val;
  saveState();
  renderDashboard();
  renderAllTrades();
  renderSnapshot();
});
setSegActive("timeSeg","time", state.period);

/* direction segs */
wireSeg("dirSeg","dir", ()=> updateNewRisk());
wireSeg("cDirSeg","dir", ()=> updateChecklistRisk());
wireSeg("eDirSeg","dir", ()=> updateEditDerived());

/* =========================
   Filtering
========================= */
function filteredTrades(){
  if (state.period === "ALL") return state.trades.slice();
  const min =
    state.period === "TODAY" ? todayStr() :
    state.period === "WEEK" ? daysAgo(6) :
    state.period === "MONTH" ? daysAgo(29) :
    "0000-01-01";
  return state.trades.filter(t => (t.date || "0000-01-01") >= min);
}
function filteredClosed(){ return filteredTrades().filter(t=>t.status==="CLOSED"); }
function filteredOpen(){ return filteredTrades().filter(t=>t.status==="OPEN"); }

/* =========================
   Risk previews
========================= */
function updateNewRisk(){
  const entry = num($("fEntry").value);
  const sl = num($("fSL").value);
  const lot = num($("fLot").value);
  const risk = (entry!=null && sl!=null && lot!=null) ? calcRisk(entry, sl, lot) : 0;
  $("riskUsd").textContent = fmtMoney(risk);
}
function updateChecklistRisk(){
  const entry = num($("cEntry").value);
  const sl = num($("cSL").value);
  const lot = num($("cLot").value);
  const risk = (entry!=null && sl!=null && lot!=null) ? calcRisk(entry, sl, lot) : 0;
  $("cRiskUsd").textContent = fmtMoney(risk);
}
["fEntry","fSL","fLot"].forEach(id=> $(id).addEventListener("input", updateNewRisk));
["cEntry","cSL","cLot"].forEach(id=> $(id).addEventListener("input", updateChecklistRisk));

/* =========================
   Modal selector (Telegram iOS FIX)
========================= */
const modal = $("tradeModal");
const sheetClose = $("sheetClose");
const sheetTitle = $("sheetTitle");
const sheetSearch = $("sheetSearch");
const sheetList = $("sheetList");

let modalPickResolve = null;
let modalItems = [];

function closeModal(){
  modal.classList.remove("open");
  modal.setAttribute("aria-hidden","true");
  modalPickResolve = null;
  modalItems = [];
}

sheetClose.onclick = closeModal;

// close only if tapping overlay (not the sheet)
modal.addEventListener("pointerup", (e)=>{
  if (e.target === modal) closeModal();
});
modal.addEventListener("touchend", (e)=>{
  if (e.target === modal) closeModal();
}, {passive:true});

// event delegation: reliable on Telegram iOS
function handlePickFromEvent(e){
  const item = e.target.closest(".sheetItem");
  if (!item) return;

  const id = Number(item.dataset.id);
  const picked = modalItems.find(x=>x.id===id) || null;

  closeModal();
  if (modalPickResolve) modalPickResolve(picked);
}

sheetList.addEventListener("pointerup", handlePickFromEvent);
sheetList.addEventListener("touchend", handlePickFromEvent, {passive:true});

function openModal(title, items, renderLine){
  modalItems = items.slice();
  sheetTitle.textContent = title;
  sheetSearch.value = "";
  sheetList.innerHTML = "";
  modal.classList.add("open");
  modal.setAttribute("aria-hidden","false");

  const rerender = ()=>{
    const q = (sheetSearch.value || "").toLowerCase().trim();
    const list = modalItems.filter(t=>{
      if (!q) return true;
      const hay = [
        t.date, t.status, t.direction, t.session, t.strategy,
        (t.review?.mistakeType||""), (t.review?.mistake||""), (t.review?.notes||"")
      ].join(" ").toLowerCase();
      return hay.includes(q);
    });

    sheetList.innerHTML = list.map(tr=>{
      const right = tr.status==="CLOSED"
        ? pillPnL(tr.pnl||0)
        : `<span class="pill warn">${t("open")}</span>`;

      return `
        <div class="sheetItem" data-id="${tr.id}">
          <div class="sheetItemTop">
            <span>${esc(tr.direction)} • ${esc(tr.status)}</span>
            <span>${right}</span>
          </div>
          <div class="sheetItemSub">${renderLine(tr)}</div>
        </div>
      `;
    }).join("");
  };

  sheetSearch.oninput = rerender;
  rerender();

  return new Promise(resolve => { modalPickResolve = resolve; });
}

function pillPnL(v){
  if (state.hidePnl) return `<span class="pill neu">${t("hidden")}</span>`;
  const n = Number(v)||0;
  if (n > 0) return `<span class="pill ok">+${fmtMoneyRaw(n)}</span>`;
  if (n < 0) return `<span class="pill bad">-${fmtMoneyRaw(Math.abs(n))}</span>`;
  return `<span class="pill neu">${fmtMoneyRaw(0)}</span>`;
}

/* =========================
   Create trades
========================= */
$("cAddTradeBtn").onclick = ()=>{
  const dir = getSegValue("cDirSeg","dir","LONG");
  const entry = num($("cEntry").value);
  const sl = num($("cSL").value);
  const lot = num($("cLot").value);

  if (entry==null || sl==null || lot==null){ alert(t("msg_need_entry_sl_lot")); return; }

  const trade = {
    id: Date.now(),
    status:"OPEN",
    direction: dir,
    date: $("cDate").value || todayStr(),
    session: $("cSession").value || "",
    entry, sl, lot,
    tp: num($("cTP").value),
    exit: null,
    pnl: 0,
    risk: calcRisk(entry, sl, lot),
    r: 0,
    mae: 0,
    mfe: 0,
    maePrice: null,
    mfePrice: null,
    strategy: "",
    notes: $("cNotes").value || "",
    checklist: $$(".cBox").map(b=>!!b.checked),
    review: {}
  };

  state.trades.push(trade);
  saveState();
  renderDashboard();
  showScreen("dash");
};

$("saveTradeBtn").onclick = ()=>{
  const dir = getSegValue("dirSeg","dir","LONG");
  const entry = num($("fEntry").value);
  const sl = num($("fSL").value);
  const lot = num($("fLot").value);

  if (entry==null || sl==null || lot==null){ alert(t("msg_need_entry_sl_lot")); return; }

  const trade = {
    id: Date.now(),
    status:"OPEN",
    direction: dir,
    date: $("fDate").value || todayStr(),
    session: $("fSession").value || "",
    entry, sl, lot,
    tp: num($("fTP").value),
    exit: null,
    pnl: 0,
    risk: calcRisk(entry, sl, lot),
    r: 0,
    mae: 0,
    mfe: 0,
    maePrice: null,
    mfePrice: null,
    strategy: ($("fStrategy").value||"").trim(),
    notes: $("fNotes").value || "",
    review: {}
  };

  state.trades.push(trade);
  saveState();
  renderDashboard();
  showScreen("dash");
};

/* =========================
   Close trade
========================= */
let closingTradeId = null;

$("closePickBtn").onclick = async ()=>{
  const openTrades = filteredOpen().slice().sort((a,b)=>b.id-a.id);
  if (!openTrades.length){ alert(t("msg_pick_open")); return; }

  const picked = await openModal(
    t("btn_select_open"),
    openTrades,
    (tr)=> `${esc(tr.date)} • ${esc(tr.session||t("unknown"))} • ${t("label_entry")}: ${tr.entry.toFixed(2)} • ${t("label_sl")}: ${tr.sl.toFixed(2)} • ${t("label_lot")}: ${tr.lot}`
  );

  if (!picked) return;
  closingTradeId = picked.id;
  $("closeMeta").textContent = `${picked.date} • ${picked.direction} • ${picked.session||t("unknown")} • Entry ${picked.entry.toFixed(2)} • SL ${picked.sl.toFixed(2)} • Lot ${picked.lot}`;
  $("closeRiskUsd").textContent = fmtMoney(picked.risk || calcRisk(picked.entry,picked.sl,picked.lot));
  updateCloseDerived();
};

function updateCloseDerived(){
  const tTrade = state.trades.find(x=>x.id===closingTradeId);
  if (!tTrade){
    $("closeMAEUsd").textContent = fmtMoney(0);
    $("closeMFEUsd").textContent = fmtMoney(0);
    $("closeR").textContent = "0.00R";
    return;
  }

  const risk = tTrade.risk || calcRisk(tTrade.entry,tTrade.sl,tTrade.lot);

  const maeP = num($("closeMAE").value);
  const mfeP = num($("closeMFE").value);

  const maeUsd = (maeP!=null) ? Math.abs(tTrade.entry - maeP) * tTrade.lot * 100 : 0;
  const mfeUsd = (mfeP!=null) ? Math.abs(mfeP - tTrade.entry) * tTrade.lot * 100 : 0;

  $("closeMAEUsd").textContent = fmtMoney(maeUsd);
  $("closeMFEUsd").textContent = fmtMoney(mfeUsd);

  const exit = num($("closeExit").value);
  const pnlManual = num($("closePnl").value);

  let pnl = null;
  if (exit!=null) pnl = calcPnL(tTrade.direction, tTrade.entry, exit, tTrade.lot);
  else if (pnlManual!=null) pnl = pnlManual;

  const r = pnl==null ? 0 : calcR(pnl, risk);
  $("closeR").textContent = r.toFixed(2) + "R";
}

["closeExit","closePnl","closeMAE","closeMFE"].forEach(id=> $(id).addEventListener("input", updateCloseDerived));

$("closeTradeBtn").onclick = ()=>{
  const tTrade = state.trades.find(x=>x.id===closingTradeId);
  if (!tTrade){ alert(t("msg_pick_first")); return; }

  const exit = num($("closeExit").value);
  const pnlManual = num($("closePnl").value);
  if (exit==null && pnlManual==null){ alert(t("msg_need_exit_or_pnl")); return; }

  const risk = tTrade.risk || calcRisk(tTrade.entry,tTrade.sl,tTrade.lot);

  if (exit!=null){
    tTrade.exit = exit;
    tTrade.pnl = calcPnL(tTrade.direction, tTrade.entry, exit, tTrade.lot);
  } else {
    tTrade.exit = null;
    tTrade.pnl = pnlManual;
  }

  tTrade.status = "CLOSED";
  tTrade.risk = risk;
  tTrade.r = calcR(tTrade.pnl||0, risk);
  tTrade.closedAt = Date.now();

  const maeP = num($("closeMAE").value);
  const mfeP = num($("closeMFE").value);
  tTrade.maePrice = maeP;
  tTrade.mfePrice = mfeP;
  tTrade.mae = (maeP!=null) ? Math.abs(tTrade.entry - maeP) * tTrade.lot * 100 : 0;
  tTrade.mfe = (mfeP!=null) ? Math.abs(mfeP - tTrade.entry) * tTrade.lot * 100 : 0;

  saveState();

  // reset UI to default
  closingTradeId = null;
  $("closeMeta").textContent = "";
  ["closeExit","closePnl","closeMAE","closeMFE"].forEach(id=> $(id).value = "");
  $("closeMAEUsd").textContent = fmtMoney(0);
  $("closeMFEUsd").textContent = fmtMoney(0);
  $("closeR").textContent = "0.00R";
  $("closeRiskUsd").textContent = fmtMoney(0);

  renderDashboard();
  showScreen("dash");
};

/* =========================
   Review trade
========================= */
let reviewTradeId = null;

$("reviewPickBtn").onclick = async ()=>{
  const list = filteredTrades().slice().sort((a,b)=> (b.closedAt||b.id) - (a.closedAt||a.id));
  if (!list.length){ alert(t("msg_pick_trade")); return; }

  const picked = await openModal(
    t("btn_select_trade"),
    list,
    (tr)=> `${esc(tr.date)} • ${esc(tr.status)} • ${esc(tr.session||t("unknown"))} • ${esc(tr.strategy||"—")} • ${tr.status==="CLOSED" ? fmtMoney(tr.pnl||0) : t("open")}`
  );
  if (!picked) return;

  reviewTradeId = picked.id;
  $("reviewMeta").textContent = `${picked.date} • ${picked.direction} • ${picked.session||t("unknown")} • ${picked.status} • ${picked.status==="CLOSED" ? fmtMoney(picked.pnl||0) : ""}`;

  $("rPlan").value = picked.review?.plan || "YES";
  $("rMistakeType").value = picked.review?.mistakeType || "";
  $("rMistake").value = picked.review?.mistake || "";
  $("rReviewNotes").value = picked.review?.notes || "";
};

$("saveReviewBtn").onclick = ()=>{
  const tr = state.trades.find(x=>x.id===reviewTradeId);
  if (!tr){ alert(t("msg_pick_first")); return; }

  tr.review = {
    plan: $("rPlan").value,
    mistakeType: $("rMistakeType").value,
    mistake: ($("rMistake").value||"").trim(),
    notes: $("rReviewNotes").value || ""
  };

  saveState();

  // reset review to empty default
  reviewTradeId = null;
  $("reviewMeta").textContent = "";
  $("rPlan").value = "YES";
  $("rMistakeType").value = "";
  $("rMistake").value = "";
  $("rReviewNotes").value = "";

  renderDashboard();
  showScreen("dash");
};

/* =========================
   Edit trade
========================= */
let editingTradeId = null;

$("editPickBtn").onclick = async ()=>{
  const list = filteredTrades().slice().sort((a,b)=> (b.closedAt||b.id) - (a.closedAt||a.id));
  if (!list.length){ alert(t("msg_pick_trade")); return; }

  const picked = await openModal(
    t("btn_select_trade"),
    list,
    (tr)=> `${esc(tr.date)} • ${esc(tr.status)} • ${esc(tr.direction)} • ${esc(tr.session||t("unknown"))} • ${esc(tr.strategy||"—")}`
  );
  if (!picked) return;

  editingTradeId = picked.id;
  $("editMeta").textContent = `${picked.date} • ${picked.direction} • ${picked.session||t("unknown")} • id ${picked.id}`;

  $("eStatus").value = picked.status;
  setSegActive("eDirSeg","dir", picked.direction);

  $("eDate").value = picked.date || todayStr();
  $("eSession").value = picked.session || "";
  $("eEntry").value = picked.entry ?? "";
  $("eSL").value = picked.sl ?? "";
  $("eTP").value = picked.tp ?? "";
  $("eLot").value = picked.lot ?? "";
  $("eExit").value = picked.exit ?? "";
  $("ePnl").value = (picked.exit==null ? (picked.pnl ?? "") : "");
  $("eMAE").value = picked.maePrice ?? "";
  $("eMFE").value = picked.mfePrice ?? "";
  $("eStrategy").value = picked.strategy || "";
  $("eNotes").value = picked.notes || "";

  updateEditDerived();
};

function updateEditDerived(){
  const tr = state.trades.find(x=>x.id===editingTradeId);
  if (!tr){
    $("eRisk").textContent = fmtMoney(0);
    $("eR").textContent = "0.00R";
    $("eMAEUsd").textContent = fmtMoney(0);
    $("eMFEUsd").textContent = fmtMoney(0);
    return;
  }

  const dir = getSegValue("eDirSeg","dir", tr.direction || "LONG");
  const entry = num($("eEntry").value);
  const sl = num($("eSL").value);
  const lot = num($("eLot").value);

  if (entry==null || sl==null || lot==null){
    $("eRisk").textContent = fmtMoney(0);
    $("eR").textContent = "0.00R";
    $("eMAEUsd").textContent = fmtMoney(0);
    $("eMFEUsd").textContent = fmtMoney(0);
    return;
  }

  const risk = calcRisk(entry, sl, lot);
  $("eRisk").textContent = fmtMoney(risk);

  const maeP = num($("eMAE").value);
  const mfeP = num($("eMFE").value);
  const maeUsd = (maeP!=null) ? Math.abs(entry - maeP) * lot * 100 : 0;
  const mfeUsd = (mfeP!=null) ? Math.abs(mfeP - entry) * lot * 100 : 0;
  $("eMAEUsd").textContent = fmtMoney(maeUsd);
  $("eMFEUsd").textContent = fmtMoney(mfeUsd);

  const exit = num($("eExit").value);
  const pnlManual = num($("ePnl").value);

  let pnl = 0;
  if (exit!=null) pnl = calcPnL(dir, entry, exit, lot);
  else if (pnlManual!=null) pnl = pnlManual;

  $("eR").textContent = calcR(pnl, risk).toFixed(2) + "R";
}

["eEntry","eSL","eLot","eExit","ePnl","eMAE","eMFE"].forEach(id=> $(id).addEventListener("input", updateEditDerived));
$("eStatus").addEventListener("change", updateEditDerived);

$("saveEditBtn").onclick = ()=>{
  const tr = state.trades.find(x=>x.id===editingTradeId);
  if (!tr){ alert(t("msg_pick_first")); return; }

  const dir = getSegValue("eDirSeg","dir","LONG");
  const entry = num($("eEntry").value);
  const sl = num($("eSL").value);
  const lot = num($("eLot").value);
  if (entry==null || sl==null || lot==null){ alert(t("msg_need_entry_sl_lot")); return; }

  tr.status = $("eStatus").value;
  tr.direction = dir;
  tr.date = $("eDate").value || todayStr();
  tr.session = $("eSession").value || "";

  tr.entry = entry;
  tr.sl = sl;
  tr.lot = lot;
  tr.tp = num($("eTP").value);

  tr.risk = calcRisk(entry, sl, lot);

  const exit = num($("eExit").value);
  const pnlManual = num($("ePnl").value);

  if (tr.status === "CLOSED"){
    if (exit!=null){
      tr.exit = exit;
      tr.pnl = calcPnL(dir, entry, exit, lot);
    } else {
      tr.exit = null;
      tr.pnl = pnlManual ?? (tr.pnl||0);
    }
    tr.r = calcR(tr.pnl||0, tr.risk);
    tr.closedAt = tr.closedAt || Date.now();
  } else {
    tr.exit = null;
    tr.pnl = 0;
    tr.r = 0;
  }

  const maeP = num($("eMAE").value);
  const mfeP = num($("eMFE").value);
  tr.maePrice = maeP;
  tr.mfePrice = mfeP;
  tr.mae = (maeP!=null) ? Math.abs(entry - maeP) * lot * 100 : 0;
  tr.mfe = (mfeP!=null) ? Math.abs(mfeP - entry) * lot * 100 : 0;

  tr.strategy = ($("eStrategy").value||"").trim();
  tr.notes = $("eNotes").value || "";

  saveState();

  editingTradeId = null;
  $("editMeta").textContent = "";

  renderDashboard();
  showScreen("dash");
};

/* =========================
   Analytics helpers
========================= */
function sessionAgg(closed){
  const map = {
    Asia:{pnl:0,n:0,w:0,rSum:0},
    London:{pnl:0,n:0,w:0,rSum:0},
    NY:{pnl:0,n:0,w:0,rSum:0},
    Unknown:{pnl:0,n:0,w:0,rSum:0}
  };
  closed.forEach(t0=>{
    const s = (t0.session==="Asia"||t0.session==="London"||t0.session==="NY") ? t0.session : "Unknown";
    map[s].pnl += (t0.pnl||0);
    map[s].n += 1;
    if ((t0.pnl||0) > 0) map[s].w += 1;
    map[s].rSum += (t0.r||0);
  });
  Object.values(map).forEach(o=>{
    o.wr = o.n ? Math.round((o.w/o.n)*100) : 0;
    o.avgR = o.n ? (o.rSum/o.n) : 0;
  });
  return map;
}

function topSetupAgg(closed){
  const m = new Map();
  closed.forEach(t0=>{
    const key = (t0.strategy||"").trim() || "";
    if (!key) return;
    if (!m.has(key)) m.set(key, {name:key, pnl:0, n:0, w:0, rSum:0});
    const o = m.get(key);
    o.pnl += (t0.pnl||0);
    o.n += 1;
    if ((t0.pnl||0) > 0) o.w += 1;
    o.rSum += (t0.r||0);
  });
  const arr = Array.from(m.values()).map(o=>({
    ...o, wr: o.n ? Math.round((o.w/o.n)*100) : 0, avgR: o.n ? o.rSum/o.n : 0
  }));
  arr.sort((a,b)=> b.pnl - a.pnl);
  return arr;
}

function streakInfo(closed){
  const arr = closed.slice().sort((a,b)=> (a.closedAt||a.id) - (b.closedAt||b.id));
  let bestW=0,bestL=0;
  let runType=null,runLen=0;

  arr.forEach(t0=>{
    const type = (t0.pnl||0) >= 0 ? "W" : "L";
    if (type === runType) runLen++;
    else { runType = type; runLen = 1; }
    if (type==="W") bestW = Math.max(bestW, runLen);
    else bestL = Math.max(bestL, runLen);
  });

  let currentType=null,currentLen=0;
  for (let i=arr.length-1;i>=0;i--){
    const type = (arr[i].pnl||0) >= 0 ? "W" : "L";
    if (!currentType){ currentType=type; currentLen=1; }
    else if (type===currentType) currentLen++;
    else break;
  }
  return {currentType,currentLen,bestW,bestL};
}

function disciplineStats(closed){
  const bad = closed.filter(t0 => (t0.review?.plan==="NO") || (t0.review?.mistakeType));
  const cost = bad.reduce((a,t0)=> a + (t0.pnl||0), 0);

  const byType = {};
  bad.forEach(t0=>{
    const k = t0.review?.mistakeType || (t0.review?.plan==="NO" ? "Plan NO" : "Other");
    byType[k] = (byType[k]||0) + (t0.pnl||0);
  });
  const top = Object.entries(byType).sort((a,b)=> b[1]-a[1])[0];
  return {cost, n: bad.length, topType: top ? top[0] : "—"};
}

/* =========================
   Render Dashboard
========================= */
function renderDashboard(){
  const closed = filteredClosed();
  const open = filteredOpen();

  const totalPnL = closed.reduce((a,t0)=>a+(t0.pnl||0),0);
  const wins = closed.filter(t0=>(t0.pnl||0)>0).length;
  const losses = closed.filter(t0=>(t0.pnl||0)<0).length;
  const winRate = closed.length ? Math.round((wins/closed.length)*100) : 0;

  $("statPnl").textContent = fmtMoney(totalPnL);
  $("statPnlMeta").textContent = `${closed.length} ${state.language==="HE" ? "סגורות" : "closed"}`;

  $("statWinRate").textContent = `${winRate}%`;
  $("statWins").textContent = `${wins}W / ${losses}L`;

  const avgR = closed.reduce((a,t0)=>a+(t0.r||0),0) / (closed.length||1);
  $("statAvgR").textContent = avgR.toFixed(2)+"R";
  $("statAvgRMeta").textContent = `${closed.length} ${state.language==="HE" ? "עסקאות" : "trades"}`;

  const openRisk = open.reduce((a,t0)=>a+(t0.risk||0),0);
  $("statOpenRisk").textContent = fmtMoney(openRisk);
  $("statOpenCount").textContent = `${open.length} ${state.language==="HE" ? "פתוחות" : "open"}`;

  const maeAvg = closed.reduce((a,t0)=>a+(t0.mae||0),0)/(closed.length||1);
  const mfeAvg = closed.reduce((a,t0)=>a+(t0.mfe||0),0)/(closed.length||1);
  $("statMaeAvg").textContent = fmtMoney(maeAvg);
  $("statMfeAvg").textContent = fmtMoney(mfeAvg);

  const best = closed.length ? Math.max(...closed.map(t0=>t0.pnl||0)) : 0;
  const worst = closed.length ? Math.min(...closed.map(t0=>t0.pnl||0)) : 0;
  $("statBestWorst").textContent = `${fmtMoney(best)} / ${fmtMoney(worst)}`;

  const st = streakInfo(closed);
  if (!closed.length){
    $("statStreak").textContent = "—";
    $("statStreakMeta").textContent = "";
  } else {
    $("statStreak").textContent = `${st.currentType}${st.currentLen}`;
    $("statStreakMeta").textContent = `Best W${st.bestW} / Best L${st.bestL}`;
  }

  const ds = disciplineStats(closed);
  $("statDiscipline").textContent = fmtMoney(ds.cost);
  $("statDisciplineMeta").textContent = ds.n ? `${ds.n} • ${ds.topType}` : "0";

  const setups = topSetupAgg(closed);
  if (!setups.length){
    $("statTopSetup").textContent = "—";
    $("statTopSetupHint").textContent = "";
  } else {
    const s = setups[0];
    $("statTopSetup").textContent = s.name;
    $("statTopSetupHint").textContent = `${fmtMoney(s.pnl)} • ${s.n} • ${s.wr}% • ${s.avgR.toFixed(2)}R`;
  }

  const sess = sessionAgg(closed);
  function setSess(pnlId, metaId, key){
    const o = sess[key];
    $(pnlId).textContent = fmtMoney(o.pnl);
    $(metaId).textContent = `${o.n} • ${o.wr}% • ${o.avgR.toFixed(2)}R`;
  }
  setSess("sessAsia","sessAsiaMeta","Asia");
  setSess("sessLondon","sessLondonMeta","London");
  setSess("sessNY","sessNYMeta","NY");
  setSess("sessU","sessUMeta","Unknown");

  const recent = closed.slice().sort((a,b)=> (b.closedAt||b.id)-(a.closedAt||a.id)).slice(0,6);
  $("tradesList").innerHTML = recent.length ? recent.map(t0=>{
    return `
      <div class="item">
        <div class="itemTop">
          <span>${esc(t0.date)} • ${esc(t0.direction)} • ${esc(t0.session||t("unknown"))}</span>
          <span>${esc(fmtMoney(t0.pnl||0))}</span>
        </div>
        <div class="kv"><span class="k">${esc(t("label_setup"))}:</span> <span class="v">${esc(t0.strategy||"—")}</span></div>
        <div class="kv"><span class="k">${esc(t("label_entry"))}/${esc(t("label_exit"))}:</span> <span class="v">${t0.entry.toFixed(2)} → ${t0.exit!=null ? t0.exit.toFixed(2) : "—"}</span></div>
        <div class="kv"><span class="k">R:</span> <span class="v">${(t0.r||0).toFixed(2)}R</span> • <span class="k">MAE:</span> <span class="v">${esc(fmtMoney(t0.mae||0))}</span> • <span class="k">MFE:</span> <span class="v">${esc(fmtMoney(t0.mfe||0))}</span></div>
      </div>
    `;
  }).join("") : `<div class="kv">${esc(t("msg_no_closed"))}</div>`;
}

/* =========================
   All Trades table + delete/edit shortcut
========================= */
function renderAllTrades(){
  const list = filteredTrades().slice().sort((a,b)=> (b.closedAt||b.id) - (a.closedAt||a.id));

  if (!list.length){
    $("allTradesList").innerHTML = `<div class="kv">${esc(t("msg_no_trades"))}</div>`;
    return;
  }

  const headers = state.language==="HE"
    ? ["תאריך","סטטוס","כיוון","סשן","סטאפ","כניסה","יציאה","סטופ","לוט","סיכון","PnL","R","MAE","MFE","סקירה","פעולות"]
    : ["Date","Status","Dir","Session","Setup","Entry","Exit","SL","Lot","Risk","PnL","R","MAE","MFE","Review","Actions"];

  const rows = list.map(tr=>{
    const reviewLine = tr.review
      ? `${tr.review.plan||""}${tr.review.mistakeType?(" • "+tr.review.mistakeType):""}${tr.review.mistake?(" • "+tr.review.mistake):""}`
      : "";
    const statusPill = tr.status==="CLOSED"
      ? `<span class="pill neu">${esc(t("closed"))}</span>`
      : `<span class="pill warn">${esc(t("open"))}</span>`;

    return `
      <tr>
        <td>${esc(tr.date||"")}</td>
        <td>${statusPill}</td>
        <td>${esc(tr.direction)}</td>
        <td>${esc(tr.session||t("unknown"))}</td>
        <td>${esc(tr.strategy||"—")}</td>
        <td>${tr.entry!=null?tr.entry.toFixed(2):"—"}</td>
        <td>${tr.exit!=null?tr.exit.toFixed(2):"—"}</td>
        <td>${tr.sl!=null?tr.sl.toFixed(2):"—"}</td>
        <td>${tr.lot!=null?tr.lot:"—"}</td>
        <td>${esc(fmtMoney(tr.risk||0))}</td>
        <td>${tr.status==="CLOSED" ? pillPnL(tr.pnl||0) : "—"}</td>
        <td>${tr.status==="CLOSED" ? (tr.r||0).toFixed(2)+"R" : "—"}</td>
        <td>${esc(fmtMoney(tr.mae||0))}</td>
        <td>${esc(fmtMoney(tr.mfe||0))}</td>
        <td>${esc(reviewLine||"—")}</td>
        <td class="actions">
          <button class="miniBtn" onclick="window.__editFromAll(${tr.id})">${esc(t("tab_edit"))}</button>
          <button class="miniBtn danger" onclick="window.__deleteTrade(${tr.id})">${esc(state.language==="HE"?"מחק":"Delete")}</button>
        </td>
      </tr>
    `;
  }).join("");

  $("allTradesList").innerHTML = `
    <div class="tableWrap">
      <table class="table">
        <thead><tr>${headers.map(h=>`<th>${esc(h)}</th>`).join("")}</tr></thead>
        <tbody>${rows}</tbody>
      </table>
    </div>
  `;
}

window.__deleteTrade = function(id){
  state.trades = state.trades.filter(t0=>t0.id!==id);
  saveState();
  renderDashboard();
  renderAllTrades();
};

window.__editFromAll = function(id){
  const tr = state.trades.find(x=>x.id===id);
  if (!tr) return;
  showScreen("edit");

  editingTradeId = tr.id;
  $("editMeta").textContent = `${tr.date} • ${tr.direction} • ${tr.session||t("unknown")} • id ${tr.id}`;

  $("eStatus").value = tr.status;
  setSegActive("eDirSeg","dir", tr.direction);

  $("eDate").value = tr.date || todayStr();
  $("eSession").value = tr.session || "";
  $("eEntry").value = tr.entry ?? "";
  $("eSL").value = tr.sl ?? "";
  $("eTP").value = tr.tp ?? "";
  $("eLot").value = tr.lot ?? "";
  $("eExit").value = tr.exit ?? "";
  $("ePnl").value = (tr.exit==null ? (tr.pnl ?? "") : "");
  $("eMAE").value = tr.maePrice ?? "";
  $("eMFE").value = tr.mfePrice ?? "";
  $("eStrategy").value = tr.strategy || "";
  $("eNotes").value = tr.notes || "";

  updateEditDerived();
};

/* =========================
   Settings
========================= */
$("hidePnlToggle").checked = !!state.hidePnl;
$("hidePnlToggle").onchange = (e)=>{
  state.hidePnl = !!e.target.checked;
  saveState();
  renderDashboard();
  renderAllTrades();
  renderSnapshot();
};

$("exportJsonBtn").onclick = async ()=>{
  const json = JSON.stringify(state, null, 2);
  try{
    await navigator.clipboard.writeText(json);
    $("importMsg").textContent = t("msg_export_ok");
  }catch(e){
    $("importMsg").textContent = t("msg_export_fail");
    $("importJsonText").value = json;
  }
};

$("importReplaceBtn").onclick = ()=>{
  try{
    const obj = JSON.parse(($("importJsonText").value||"").trim());
    if (!obj || typeof obj !== "object" || !Array.isArray(obj.trades)) throw new Error("bad");
    state = { ...state, ...obj };
    saveState();
    $("importMsg").textContent = t("msg_import_ok");
    applyLanguage();
  }catch(e){
    $("importMsg").textContent = t("msg_import_bad");
  }
};

$("importMergeBtn").onclick = ()=>{
  try{
    const obj = JSON.parse(($("importJsonText").value||"").trim());
    const incoming = Array.isArray(obj.trades) ? obj.trades : [];
    const ids = new Set(state.trades.map(t0=>t0.id));
    incoming.forEach(tr => { if (!ids.has(tr.id)) state.trades.push(tr); });
    saveState();
    $("importMsg").textContent = t("msg_merge_ok");
    applyLanguage();
  }catch(e){
    $("importMsg").textContent = t("msg_import_bad");
  }
};

$("resetAllBtn").onclick = ()=>{
  const c = prompt(t("msg_reset_confirm"));
  if (c === "DELETE"){
    localStorage.removeItem(STORAGE_KEY);
    location.reload();
  }
};

function setLangSeg(){
  $$("#langSeg .segBtn").forEach(b=>{
    b.classList.toggle("active", b.dataset.lang === state.language);
  });
}
wireSeg("langSeg","lang",(val)=>{
  state.language = val;
  saveState();
  setLangSeg();
  applyLanguage();
});
setLangSeg();

/* =========================
   Snapshot
========================= */
$("shareSnapshotBtn").onclick = ()=> showScreen("snapshot");
$("snapBackBtn").onclick = ()=> showScreen("dash");
$("snapTipBtn").onclick = ()=> alert(t("msg_share_tip"));

function renderSnapshot(){
  const closed = filteredClosed();
  const open = filteredOpen();

  const totalPnL = closed.reduce((a,t0)=>a+(t0.pnl||0),0);
  const wins = closed.filter(t0=>(t0.pnl||0)>0).length;
  const winRate = closed.length ? Math.round((wins/closed.length)*100) : 0;
  const avgR = closed.reduce((a,t0)=>a+(t0.r||0),0)/(closed.length||1);

  const maeAvg = closed.reduce((a,t0)=>a+(t0.mae||0),0)/(closed.length||1);
  const mfeAvg = closed.reduce((a,t0)=>a+(t0.mfe||0),0)/(closed.length||1);

  const best = closed.length ? Math.max(...closed.map(t0=>t0.pnl||0)) : 0;
  const worst = closed.length ? Math.min(...closed.map(t0=>t0.pnl||0)) : 0;

  const st = streakInfo(closed);
  const ds = disciplineStats(closed);
  const setups = topSetupAgg(closed);
  const topSetup = setups[0];

  $("snapPeriod").textContent = `${t("tab_snapshot")} • ${state.period}`;

  const openRisk = open.reduce((a,t0)=>a+(t0.risk||0),0);

  const kpis = [
    [t("k_total_pnl"), fmtMoney(totalPnL)],
    [t("k_winrate"), `${winRate}%`],
    [t("k_avg_r"), avgR.toFixed(2)+"R"],
    [t("k_open_risk"), fmtMoney(openRisk)],
    [t("k_mae_avg"), fmtMoney(maeAvg)],
    [t("k_mfe_avg"), fmtMoney(mfeAvg)],
    [t("k_best_worst"), `${fmtMoney(best)} / ${fmtMoney(worst)}`],
    [t("k_streak"), closed.length ? `${st.currentType}${st.currentLen}` : "—"],
    [t("k_discipline_cost"), fmtMoney(ds.cost)],
    [t("k_top_setup"), topSetup ? `${topSetup.name}` : "—"],
  ];

  $("snapGrid").innerHTML = kpis.map(([k,v])=>`
    <div class="snapKpi">
      <div class="snapK">${esc(k)}</div>
      <div class="snapV">${esc(v)}</div>
    </div>
  `).join("");

  const sess = sessionAgg(closed);
  const rows = [
    ["Asia", sess.Asia],
    ["London", sess.London],
    ["NY", sess.NY],
    ["Unknown", sess.Unknown]
  ].map(([name,stt])=>`
    <div class="snapSessRow">
      <span><b>${esc(name==="Unknown"?t("unknown"):name)}</b> • ${stt.n} • ${stt.wr}%</span>
      <span>${esc(fmtMoney(stt.pnl))}</span>
    </div>
  `).join("");

  $("snapSessions").innerHTML = rows;
}

/* =========================
   Init
========================= */
(function init(){
  $("fDate").value = $("fDate").value || todayStr();
  $("cDate").value = $("cDate").value || todayStr();

  updateNewRisk();
  updateChecklistRisk();

  applyLanguage();
  showScreen("dash");
})();
