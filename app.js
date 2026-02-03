/* ======================================================
   AdigaFX Trade Journal – FINAL v35
   - Time filter (ALL/TODAY/WEEK/MONTH)
   - Session analytics
   - Top setup analytics (PnL/WR/AvgR/Count)
   - Discipline cost (plan=NO + mistake type)
   - Streak current + best/worst
   - All trades full details + Delete
   - Close/Review/Edit via SELECT (no prompt)
   - Snapshot screen for sharing (screenshot)
   - Export/Import, Hide PnL default OFF, Language toggle saved
   Built by FaShuSh for AdigaFX
====================================================== */

try {
  const tg = window.Telegram?.WebApp;
  tg?.ready();
  tg?.expand();
} catch (e) {}

const STORAGE_KEY = "adigafx_trade_journal_v35";

let state = {
  trades: [],
  hidePnl: false,
  language: "EN",
  period: "ALL"
};

try {
  const saved = JSON.parse(localStorage.getItem(STORAGE_KEY));
  if (saved) state = { ...state, ...saved };
} catch (e) {}

function saveState() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

const $ = (id) => document.getElementById(id);
const $$ = (q) => Array.from(document.querySelectorAll(q));

function num(v){ const n = parseFloat(v); return isNaN(n) ? null : n; }

function fmtMoney(v){
  if (state.hidePnl) return "Hidden";
  return "$" + (v || 0).toFixed(2);
}

function fmtPct(v){ return (isFinite(v) ? Math.round(v) : 0) + "%"; }

function todayStr(){
  const d = new Date();
  return d.toISOString().slice(0,10);
}

function parseDate(s){
  // s: YYYY-MM-DD
  if (!s) return null;
  const [y,m,dd] = s.split("-").map(x=>parseInt(x,10));
  if (!y||!m||!dd) return null;
  return new Date(y, m-1, dd);
}

function startOfWeek(d){
  // Monday
  const x = new Date(d);
  const day = (x.getDay()+6)%7; // Mon=0
  x.setDate(x.getDate() - day);
  x.setHours(0,0,0,0);
  return x;
}

function startOfMonth(d){
  const x = new Date(d.getFullYear(), d.getMonth(), 1);
  x.setHours(0,0,0,0);
  return x;
}

function inPeriod(trade){
  if (state.period === "ALL") return true;
  const td = parseDate(trade.date) || parseDate(todayStr());
  const now = new Date();
  now.setHours(0,0,0,0);

  if (state.period === "TODAY"){
    return td.toDateString() === now.toDateString();
  }
  if (state.period === "WEEK"){
    const w0 = startOfWeek(now);
    return td >= w0 && td <= now;
  }
  if (state.period === "MONTH"){
    const m0 = startOfMonth(now);
    return td >= m0 && td <= now;
  }
  return true;
}

function calcRisk(entry, sl, lot){
  return Math.abs(entry - sl) * lot * 100;
}

function calcPnL(dir, entry, exit, lot){
  const diff = dir === "LONG" ? (exit - entry) : (entry - exit);
  return diff * lot * 100;
}

function calcMAE(entry, maePrice, lot){
  if (maePrice == null) return 0;
  return Math.abs(entry - maePrice) * lot * 100;
}

function calcMFE(entry, mfePrice, lot){
  if (mfePrice == null) return 0;
  return Math.abs(mfePrice - entry) * lot * 100;
}

function calcR(pnl, risk){
  if (!risk) return 0;
  return pnl / risk;
}

/* =========================
   Navigation
========================= */
function showScreen(route){
  $$(".tab").forEach(b => b.classList.toggle("active", b.dataset.route === route));
  $$(".screen").forEach(s => s.classList.toggle("active", s.id === "screen-" + route));

  if (route === "dash") renderDashboard();
  if (route === "all") renderAllTrades();
  if (route === "close") hydrateCloseSelect();
  if (route === "review") hydrateReviewSelect();
  if (route === "edit") hydrateEditSelect();
  if (route === "snapshot") renderSnapshot();
}

$$(".tab").forEach(btn => btn.addEventListener("click", ()=>showScreen(btn.dataset.route)));

$("qaNew").onclick = ()=>showScreen("new");
$("qaChecklist").onclick = ()=>showScreen("check");
$("qaClose").onclick = ()=>showScreen("close");
$("qaAll").onclick = ()=>showScreen("all");
$("openSettingsBtn").onclick = ()=>showScreen("settings");

/* =========================
   Seg controls helper
========================= */
function wireSeg(containerId, onChange){
  const el = $(containerId);
  if (!el) return;
  el.addEventListener("click", (e)=>{
    const btn = e.target.closest(".segBtn");
    if (!btn) return;
    $$("#"+containerId+" .segBtn").forEach(b=>b.classList.remove("active"));
    btn.classList.add("active");
    onChange(btn);
  });
}

wireSeg("dirSeg", ()=>{ updateNewRiskPreview(); });
wireSeg("cDirSeg", ()=>{ updateChecklistRiskPreview(); });
wireSeg("eDirSeg", ()=>{ if (editingTrade) { editingTrade.direction = activeDir("eDirSeg"); } updateEditDerived(); });

wireSeg("timeSeg", (btn)=>{
  state.period = btn.dataset.time;
  saveState();
  renderDashboard();
  renderAllTrades();
});

/* Restore active period button */
(function(){
  const btn = $$("#timeSeg .segBtn").find(b=>b.dataset.time === state.period);
  if (btn){
    $$("#timeSeg .segBtn").forEach(b=>b.classList.remove("active"));
    btn.classList.add("active");
  }
})();

function activeDir(segId){
  return $$("#"+segId+" .segBtn.active")[0]?.dataset.dir || "LONG";
}

/* =========================
   Derived lists (filtered)
========================= */
function filteredTrades(){
  return state.trades.filter(inPeriod);
}
function filteredClosed(){
  return filteredTrades().filter(t=>t.status==="CLOSED");
}
function filteredOpen(){
  return filteredTrades().filter(t=>t.status==="OPEN");
}

/* =========================
   Dashboard + Gadgets
========================= */
function setupAgg(trades){
  const map = new Map();
  trades.forEach(t=>{
    const key = (t.strategy||"").trim();
    if (!key) return;
    if (!map.has(key)) map.set(key, {name:key, pnl:0, n:0, wins:0, rSum:0});
    const o = map.get(key);
    o.pnl += (t.pnl||0);
    o.n += 1;
    if ((t.pnl||0) > 0) o.wins += 1;
    o.rSum += (t.r||0);
  });
  const arr = Array.from(map.values()).map(o=>({
    ...o,
    wr: o.n ? (o.wins/o.n*100) : 0,
    avgR: o.n ? (o.rSum/o.n) : 0
  }));
  arr.sort((a,b)=> b.pnl - a.pnl);
  return arr;
}

function sessionAgg(trades){
  const sessions = ["Asia","London","NY",""];
  const map = {};
  sessions.forEach(s=>map[s]={name:(s||"Unknown"), pnl:0, n:0, wins:0, rSum:0});
  trades.forEach(t=>{
    const s = (t.session||"");
    if (!map[s]) map[s]={name:(s||"Unknown"), pnl:0, n:0, wins:0, rSum:0};
    map[s].pnl += (t.pnl||0);
    map[s].n += 1;
    if ((t.pnl||0) > 0) map[s].wins += 1;
    map[s].rSum += (t.r||0);
  });
  Object.values(map).forEach(o=>{
    o.wr = o.n ? (o.wins/o.n*100) : 0;
    o.avgR = o.n ? (o.rSum/o.n) : 0;
  });
  return map;
}

function streakInfo(closed){
  // closed should be sorted by date/id ascending
  const arr = [...closed].sort((a,b)=> (a.closedAt||a.id) - (b.closedAt||b.id));
  let current = {type:null, len:0};
  let bestW = 0;
  let bestL = 0;

  let runType = null;
  let runLen = 0;

  arr.forEach(t=>{
    const tType = (t.pnl||0) >= 0 ? "W" : "L";
    if (runType === tType) runLen++;
    else { runType = tType; runLen = 1; }
    if (tType === "W") bestW = Math.max(bestW, runLen);
    if (tType === "L") bestL = Math.max(bestL, runLen);
  });

  // current streak (from end)
  for (let i = arr.length-1; i>=0; i--){
    const tType = (arr[i].pnl||0) >= 0 ? "W" : "L";
    if (!current.type){ current.type = tType; current.len = 1; }
    else if (current.type === tType) current.len++;
    else break;
  }

  return { current, bestW, bestL };
}

function disciplineStats(closed){
  const bad = closed.filter(t=> (t.review?.plan==="NO") || (t.review?.mistakeType));
  const cost = bad.reduce((a,t)=> a + (t.pnl||0), 0);
  const byType = {};
  bad.forEach(t=>{
    const k = t.review?.mistakeType || (t.review?.plan==="NO" ? "Plan NO" : "Other");
    byType[k] = (byType[k]||0) + (t.pnl||0);
  });
  const top = Object.entries(byType).sort((a,b)=> b[1]-a[1])[0];
  return { cost, n: bad.length, topType: top ? top[0] : "—" };
}

function renderDashboard(){
  const closed = filteredClosed();
  const open = filteredOpen();

  // PnL / winrate
  const totalPnL = closed.reduce((a,t)=>a+(t.pnl||0),0);
  const wins = closed.filter(t=>(t.pnl||0)>0).length;
  const losses = closed.filter(t=>(t.pnl||0)<0).length;

  $("statPnl").innerText = fmtMoney(totalPnL);
  $("statPnlMeta").innerText = `${closed.length} closed (filtered)`;

  $("statWinRate").innerText = closed.length ? fmtPct(wins/closed.length*100) : "0%";
  $("statWins").innerText = `${wins}W / ${losses}L`;

  const avgR = closed.reduce((a,t)=>a+(t.r||0),0) / (closed.length||1);
  $("statAvgR").innerText = avgR.toFixed(2) + "R";
  $("statExp").innerText = closed.length ? `Avg per trade` : "";

  // Open risk
  const openRisk = open.reduce((a,t)=>a+(t.risk||0),0);
  $("statOpenRisk").innerText = fmtMoney(openRisk);
  $("statOpenCount").innerText = `${open.length} open (filtered)`;

  // MAE/MFE avg
  const maeAvg = closed.reduce((a,t)=>a+(t.mae||0),0)/(closed.length||1);
  const mfeAvg = closed.reduce((a,t)=>a+(t.mfe||0),0)/(closed.length||1);
  $("statMaeAvg").innerText = fmtMoney(maeAvg);
  $("statMfeAvg").innerText = fmtMoney(mfeAvg);

  // Best/Worst
  const best = closed.length ? Math.max(...closed.map(t=>t.pnl||0)) : 0;
  const worst = closed.length ? Math.min(...closed.map(t=>t.pnl||0)) : 0;
  $("statBestWorst").innerText = `${fmtMoney(best)} / ${fmtMoney(worst)}`;

  // Streak gadgets
  const st = streakInfo(closed);
  if (!closed.length){
    $("statStreak").innerText = "—";
    $("statStreakMeta").innerText = "";
  } else {
    $("statStreak").innerText = `${st.current.type}${st.current.len}`;
    $("statStreakMeta").innerText = `Best W${st.bestW} / Best L${st.bestL}`;
  }

  // Discipline gadgets
  const ds = disciplineStats(closed);
  $("statDiscipline").innerText = fmtMoney(ds.cost);
  $("statDisciplineMeta").innerText = ds.n ? `${ds.n} trades • Top: ${ds.topType}` : "0 trades";

  // Top setup gadgets
  const setups = setupAgg(closed);
  if (!setups.length){
    $("statTopSetup").innerText = "—";
    $("statTopSetupHint").innerText = "";
  } else {
    const s = setups[0];
    $("statTopSetup").innerText = s.name;
    $("statTopSetupHint").innerText = `${fmtMoney(s.pnl)} • ${s.n} trades • ${fmtPct(s.wr)} • ${s.avgR.toFixed(2)}R`;
  }

  // Sessions gadgets
  const sess = sessionAgg(closed);
  function setSess(idVal, idMeta, key){
    const o = sess[key] || {pnl:0,n:0,wr:0,avgR:0};
    $(idVal).innerText = fmtMoney(o.pnl);
    $(idMeta).innerText = `${o.n} • ${fmtPct(o.wr)} • ${o.avgR.toFixed(2)}R`;
  }
  setSess("sessAsia","sessAsiaMeta","Asia");
  setSess("sessLondon","sessLondonMeta","London");
  setSess("sessNY","sessNYMeta","NY");
  setSess("sessU","sessUMeta","");

  // Recent list (filtered)
  const recent = [...closed].sort((a,b)=> (b.closedAt||b.id) - (a.closedAt||a.id)).slice(0,6);
  $("tradesList").innerHTML = recent.map(t=>`
    <div class="item">
      <div class="itemTop">
        <span>${t.date||""} • ${t.direction} • ${t.session||"—"}</span>
        <span>${fmtMoney(t.pnl||0)}</span>
      </div>
      <div class="kv"><span class="k">Setup:</span> <span class="v">${escapeHtml(t.strategy||"—")}</span></div>
      <div class="kv"><span class="k">Entry/Exit:</span> <span class="v">${n2(t.entry)} → ${t.exit!=null?n2(t.exit):"—"}</span></div>
      <div class="kv"><span class="k">R:</span> <span class="v">${(t.r||0).toFixed(2)}R</span> • <span class="k">MAE:</span> <span class="v">${fmtMoney(t.mae||0)}</span> • <span class="k">MFE:</span> <span class="v">${fmtMoney(t.mfe||0)}</span></div>
    </div>
  `).join("") || `<div class="kv">No closed trades in this period.</div>`;

  // Keep selects synced
  hydrateCloseSelect();
  hydrateReviewSelect();
  hydrateEditSelect();
  renderSnapshot(); // keeps snapshot always consistent
}

/* =========================
   Safe formatting helpers
========================= */
function n2(x){
  if (x==null || !isFinite(x)) return "—";
  return Number(x).toFixed(2);
}
function escapeHtml(s){
  return (s||"").replace(/[&<>"']/g, m => ({
    "&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#039;"
  })[m]);
}

/* =========================
   Risk previews
========================= */
function updateNewRiskPreview(){
  const entry = num($("fEntry").value);
  const sl = num($("fSL").value);
  const lot = num($("fLot").value);
  if (entry==null || sl==null || lot==null){
    $("riskUsd").innerText = "$0.00";
    return;
  }
  const risk = calcRisk(entry, sl, lot);
  $("riskUsd").innerText = fmtMoney(risk);
}

function updateChecklistRiskPreview(){
  const entry = num($("cEntry").value);
  const sl = num($("cSL").value);
  const lot = num($("cLot").value);
  if (entry==null || sl==null || lot==null){
    $("cRiskUsd").innerText = "$0.00";
    return;
  }
  const risk = calcRisk(entry, sl, lot);
  $("cRiskUsd").innerText = fmtMoney(risk);
}

["fEntry","fSL","fLot"].forEach(id => $(id).addEventListener("input", updateNewRiskPreview));
["cEntry","cSL","cLot"].forEach(id => $(id).addEventListener("input", updateChecklistRiskPreview));

/* =========================
   Checklist -> Add OPEN
========================= */
$("cAddTradeBtn").onclick = () => {
  const dir = activeDir("cDirSeg");
  const entry = num($("cEntry").value);
  const sl = num($("cSL").value);
  const lot = num($("cLot").value);

  if (entry==null || sl==null || lot==null){
    alert("Entry, SL and Lot are required");
    return;
  }

  const trade = {
    id: Date.now(),
    status: "OPEN",
    direction: dir,
    date: $("cDate").value || todayStr(),
    session: $("cSession").value || "",
    entry, sl, lot,
    tp: num($("cTP").value),
    exit: null,
    pnl: 0,
    risk: calcRisk(entry, sl, lot),
    mae: 0,
    mfe: 0,
    r: 0,
    strategy: "",
    notes: $("cNotes").value || "",
    review: {}
  };

  state.trades.push(trade);
  saveState();
  renderDashboard();
  showScreen("dash");
};

/* =========================
   New -> Save OPEN
========================= */
$("saveTradeBtn").onclick = () => {
  const dir = activeDir("dirSeg");
  const entry = num($("fEntry").value);
  const sl = num($("fSL").value);
  const lot = num($("fLot").value);

  if (entry==null || sl==null || lot==null){
    alert("Entry, SL and Lot required");
    return;
  }

  const trade = {
    id: Date.now(),
    status: "OPEN",
    direction: dir,
    date: $("fDate").value || todayStr(),
    session: $("fSession").value || "",
    entry, sl, lot,
    tp: num($("fTP").value),
    exit: null,
    pnl: 0,
    risk: calcRisk(entry, sl, lot),
    mae: 0,
    mfe: 0,
    r: 0,
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
   Close (select dropdown)
========================= */
function hydrateCloseSelect(){
  const sel = $("closeSelect");
  if (!sel) return;

  const open = filteredOpen();
  const prev = sel.value;

  sel.innerHTML = open.length
    ? open.map(t=>`<option value="${t.id}">${t.date||""} • ${t.direction} @ ${n2(t.entry)} • ${t.session||"—"} • ${escapeHtml(t.strategy||"")}</option>`).join("")
    : `<option value="">No OPEN trades (filtered)</option>`;

  // keep previous if possible
  if (prev && open.some(t=>String(t.id)===String(prev))) sel.value = prev;

  updateCloseMeta();
}

function getTradeById(id){
  return state.trades.find(t=>String(t.id)===String(id));
}

function updateCloseDerived(){
  const t = getTradeById($("closeSelect").value);
  if (!t) return;

  const risk = t.risk || calcRisk(t.entry,t.sl,t.lot);
  $("closeRiskUsd").innerText = fmtMoney(risk);

  const maePrice = num($("closeMAE").value);
  const mfePrice = num($("closeMFE").value);

  const maeUsd = calcMAE(t.entry, maePrice, t.lot);
  const mfeUsd = calcMFE(t.entry, mfePrice, t.lot);

  $("closeMAEUsd").innerText = fmtMoney(maeUsd);
  $("closeMFEUsd").innerText = fmtMoney(mfeUsd);

  // R preview based on exit/pnl
  const exit = num($("closeExit").value);
  const pnlManual = num($("closePnl").value);
  let pnl = null;
  if (exit!=null) pnl = calcPnL(t.direction, t.entry, exit, t.lot);
  else if (pnlManual!=null) pnl = pnlManual;
  const r = pnl==null ? 0 : calcR(pnl, risk);
  $("closeR").innerText = r.toFixed(2) + "R";
}

function updateCloseMeta(){
  const t = getTradeById($("closeSelect").value);
  if (!t){
    $("closeMeta").innerText = "";
    return;
  }
  $("closeMeta").innerText = `${t.date||""} • ${t.direction} • Entry ${n2(t.entry)} • SL ${n2(t.sl)} • Lot ${t.lot} • Risk ${fmtMoney(t.risk||0)}`;
  $("closeExit").value = "";
  $("closePnl").value = "";
  $("closeMAE").value = "";
  $("closeMFE").value = "";
  updateCloseDerived();
}

$("closeSelect").addEventListener("change", updateCloseMeta);
["closeExit","closePnl","closeMAE","closeMFE"].forEach(id => $(id).addEventListener("input", updateCloseDerived));

$("closeTradeBtn").onclick = () => {
  const t = getTradeById($("closeSelect").value);
  if (!t || t.status!=="OPEN"){
    alert("Select an OPEN trade");
    return;
  }

  const exit = num($("closeExit").value);
  const pnlManual = num($("closePnl").value);

  if (exit==null && pnlManual==null){
    alert("Exit price OR PnL is required");
    return;
  }

  let pnl = pnlManual;
  if (exit!=null){
    t.exit = exit;
    pnl = calcPnL(t.direction, t.entry, exit, t.lot);
  } else {
    t.exit = null;
  }

  const maePrice = num($("closeMAE").value);
  const mfePrice = num($("closeMFE").value);

  t.mae = calcMAE(t.entry, maePrice, t.lot);
  t.mfe = calcMFE(t.entry, mfePrice, t.lot);

  t.pnl = pnl || 0;
  t.risk = t.risk || calcRisk(t.entry,t.sl,t.lot);
  t.r = calcR(t.pnl, t.risk);
  t.status = "CLOSED";
  t.closedAt = Date.now();

  saveState();
  renderDashboard();
  showScreen("dash");
};

/* =========================
   Review (select dropdown)
========================= */
function hydrateReviewSelect(){
  const sel = $("reviewSelect");
  if (!sel) return;

  const list = filteredTrades().slice().sort((a,b)=> (b.closedAt||b.id)-(a.closedAt||a.id));
  const prev = sel.value;

  sel.innerHTML = list.length
    ? list.map(t=>`<option value="${t.id}">${t.status} • ${t.date||""} • ${t.direction} • ${n2(t.entry)} → ${t.exit!=null?n2(t.exit):"—"} • ${escapeHtml(t.strategy||"")}</option>`).join("")
    : `<option value="">No trades (filtered)</option>`;

  if (prev && list.some(t=>String(t.id)===String(prev))) sel.value = prev;
  updateReviewMeta();
}

function updateReviewMeta(){
  const t = getTradeById($("reviewSelect").value);
  if (!t){ $("reviewMeta").innerText=""; return; }
  $("reviewMeta").innerText = `${t.status} • ${t.date||""} • ${t.direction} • PnL ${fmtMoney(t.pnl||0)} • R ${(t.r||0).toFixed(2)}R`;
  $("rPlan").value = t.review?.plan || "YES";
  $("rMistakeType").value = t.review?.mistakeType || "";
  $("rMistake").value = t.review?.mistake || "";
  $("rReviewNotes").value = t.review?.notes || "";
}

$("reviewSelect").addEventListener("change", updateReviewMeta);

$("saveReviewBtn").onclick = () => {
  const t = getTradeById($("reviewSelect").value);
  if (!t){ alert("Select a trade"); return; }

  t.review = {
    plan: $("rPlan").value,
    mistakeType: $("rMistakeType").value,
    mistake: $("rMistake").value || "",
    notes: $("rReviewNotes").value || ""
  };

  saveState();
  renderDashboard();
  showScreen("dash");
};

/* =========================
   Edit (select dropdown)
========================= */
let editingTrade = null;

function hydrateEditSelect(){
  const sel = $("editSelect");
  if (!sel) return;

  const list = filteredTrades().slice().sort((a,b)=> (b.closedAt||b.id)-(a.closedAt||a.id));
  const prev = sel.value;

  sel.innerHTML = list.length
    ? list.map(t=>`<option value="${t.id}">${t.status} • ${t.date||""} • ${t.direction} • ${n2(t.entry)} • ${escapeHtml(t.strategy||"")}</option>`).join("")
    : `<option value="">No trades (filtered)</option>`;

  if (prev && list.some(t=>String(t.id)===String(prev))) sel.value = prev;
  loadEditTrade();
}

function setActiveDir(segId, dir){
  const buttons = $$("#"+segId+" .segBtn");
  buttons.forEach(b=>b.classList.toggle("active", b.dataset.dir===dir));
}

function loadEditTrade(){
  editingTrade = getTradeById($("editSelect").value);
  if (!editingTrade){
    $("editMeta").innerText = "";
    return;
  }

  $("editMeta").innerText = `Editing: ${editingTrade.status} • ${editingTrade.date||""} • ${editingTrade.direction} • id ${editingTrade.id}`;

  $("eStatus").value = editingTrade.status;
  setActiveDir("eDirSeg", editingTrade.direction);

  $("eDate").value = editingTrade.date || todayStr();
  $("eSession").value = editingTrade.session || "";

  $("eEntry").value = editingTrade.entry ?? "";
  $("eSL").value = editingTrade.sl ?? "";
  $("eTP").value = editingTrade.tp ?? "";
  $("eLot").value = editingTrade.lot ?? "";

  $("eExit").value = editingTrade.exit ?? "";
  $("ePnl").value = (editingTrade.exit==null ? (editingTrade.pnl||"") : "");

  // store MAE/MFE prices not saved; we keep "price" fields as optional, but we saved only $.
  // allow user to directly set $ by price again: treat inputs as PRICE and compute $.
  $("eMAE").value = "";
  $("eMFE").value = "";

  $("eStrategy").value = editingTrade.strategy || "";
  $("eNotes").value = editingTrade.notes || "";

  updateEditDerived();
}

function updateEditDerived(){
  if (!editingTrade) return;

  const entry = num($("eEntry").value);
  const sl = num($("eSL").value);
  const lot = num($("eLot").value);

  if (entry!=null && sl!=null && lot!=null){
    const risk = calcRisk(entry, sl, lot);
    $("eRisk").innerText = fmtMoney(risk);

    let pnl = null;
    const exit = num($("eExit").value);
    const pnlManual = num($("ePnl").value);
    if (exit!=null) pnl = calcPnL(activeDir("eDirSeg"), entry, exit, lot);
    else if (pnlManual!=null) pnl = pnlManual;

    $("eR").innerText = (pnl==null ? 0 : calcR(pnl, risk)).toFixed(2) + "R";

    // MAE/MFE price -> $
    const maePrice = num($("eMAE").value);
    const mfePrice = num($("eMFE").value);

    const maeUsd = calcMAE(entry, maePrice, lot);
    const mfeUsd = calcMFE(entry, mfePrice, lot);

    $("eMAEUsd").innerText = fmtMoney(maeUsd);
    $("eMFEUsd").innerText = fmtMoney(mfeUsd);
  } else {
    $("eRisk").innerText = "$0.00";
    $("eR").innerText = "0.00R";
    $("eMAEUsd").innerText = "$0.00";
    $("eMFEUsd").innerText = "$0.00";
  }
}

$("editSelect").addEventListener("change", loadEditTrade);
["eEntry","eSL","eLot","eExit","ePnl","eMAE","eMFE"].forEach(id => $(id).addEventListener("input", updateEditDerived));
$("eStatus").addEventListener("change", ()=>{ if(editingTrade) editingTrade.status = $("eStatus").value; });

$("saveEditBtn").onclick = () => {
  if (!editingTrade){ alert("Select a trade"); return; }

  const dir = activeDir("eDirSeg");
  const entry = num($("eEntry").value);
  const sl = num($("eSL").value);
  const lot = num($("eLot").value);

  if (entry==null || sl==null || lot==null){
    alert("Entry/SL/Lot required");
    return;
  }

  editingTrade.status = $("eStatus").value;
  editingTrade.direction = dir;
  editingTrade.date = $("eDate").value || todayStr();
  editingTrade.session = $("eSession").value || "";

  editingTrade.entry = entry;
  editingTrade.sl = sl;
  editingTrade.lot = lot;
  editingTrade.tp = num($("eTP").value);

  const exit = num($("eExit").value);
  const pnlManual = num($("ePnl").value);

  editingTrade.risk = calcRisk(entry, sl, lot);

  if (exit!=null){
    editingTrade.exit = exit;
    editingTrade.pnl = calcPnL(dir, entry, exit, lot);
  } else {
    editingTrade.exit = null;
    editingTrade.pnl = pnlManual || 0;
  }

  // MAE/MFE from PRICE inputs -> $
  const maePrice = num($("eMAE").value);
  const mfePrice = num($("eMFE").value);
  if (maePrice!=null) editingTrade.mae = calcMAE(entry, maePrice, lot);
  if (mfePrice!=null) editingTrade.mfe = calcMFE(entry, mfePrice, lot);

  editingTrade.r = calcR(editingTrade.pnl, editingTrade.risk);

  editingTrade.strategy = ($("eStrategy").value||"").trim();
  editingTrade.notes = $("eNotes").value || "";

  saveState();
  renderDashboard();
  showScreen("dash");
};

/* =========================
   All Trades (full) + Delete
========================= */
function renderAllTrades(){
  const list = filteredTrades().slice().sort((a,b)=> (b.closedAt||b.id)-(a.closedAt||a.id));
  $("allTradesList").innerHTML = list.map(t=>{
    const review = t.review || {};
    const reviewLine = review.plan || review.mistakeType || review.mistake || review.notes
      ? `${review.plan||""}${review.mistakeType?(" • "+review.mistakeType):""}${review.mistake?(" • "+escapeHtml(review.mistake)):""}`
      : "—";

    return `
    <div class="item">
      <div class="itemTop">
        <span>${t.status} • ${t.date||""} • ${t.direction} • ${t.session||"—"}</span>
        <span>${t.status==="CLOSED" ? fmtMoney(t.pnl||0) : "OPEN"}</span>
      </div>

      <div class="kv"><span class="k">Setup:</span> <span class="v">${escapeHtml(t.strategy||"—")}</span></div>
      <div class="kv"><span class="k">Entry / Exit:</span> <span class="v">${n2(t.entry)} → ${t.exit!=null?n2(t.exit):"—"}</span></div>
      <div class="kv"><span class="k">SL / TP:</span> <span class="v">${n2(t.sl)} / ${t.tp!=null?n2(t.tp):"—"}</span> • <span class="k">Lot:</span> <span class="v">${t.lot}</span></div>

      <div class="kv">
        <span class="k">Risk:</span> <span class="v">${fmtMoney(t.risk||0)}</span> •
        <span class="k">R:</span> <span class="v">${(t.r||0).toFixed(2)}R</span>
      </div>

      <div class="kv">
        <span class="k">MAE:</span> <span class="v">${fmtMoney(t.mae||0)}</span> •
        <span class="k">MFE:</span> <span class="v">${fmtMoney(t.mfe||0)}</span>
      </div>

      <div class="kv"><span class="k">Review:</span> <span class="v">${reviewLine}</span></div>

      <div class="row2" style="margin-top:10px;">
        <button class="btn ghost" type="button" onclick="jumpEdit('${t.id}')">Edit</button>
        <button class="btn danger" type="button" onclick="deleteTrade('${t.id}')">Delete</button>
      </div>
    </div>`;
  }).join("") || `<div class="kv">No trades in this period.</div>`;
}

window.deleteTrade = function(id){
  if (!confirm("Delete this trade?")) return;
  state.trades = state.trades.filter(t=>String(t.id)!==String(id));
  saveState();
  renderDashboard();
  renderAllTrades();
};

window.jumpEdit = function(id){
  showScreen("edit");
  $("editSelect").value = String(id);
  loadEditTrade();
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
  try{
    await navigator.clipboard.writeText(JSON.stringify(state,null,2));
    $("importMsg").innerText = "Exported to clipboard ✅";
  }catch(e){
    $("importMsg").innerText = "Copy failed — select and copy manually.";
  }
};

$("importReplaceBtn").onclick = ()=>{
  try{
    const obj = JSON.parse($("importJsonText").value);
    if (!obj || typeof obj !== "object") throw new Error("bad");
    state = { ...state, ...obj };
    saveState();
    $("importMsg").innerText = "Imported (Replace) ✅";
    renderDashboard(); renderAllTrades(); renderSnapshot();
  }catch(e){
    $("importMsg").innerText = "Invalid JSON ❌";
  }
};

$("importMergeBtn").onclick = ()=>{
  try{
    const obj = JSON.parse($("importJsonText").value);
    const incoming = Array.isArray(obj.trades) ? obj.trades : [];
    state.trades = [...state.trades, ...incoming];
    saveState();
    $("importMsg").innerText = "Imported (Merge) ✅";
    renderDashboard(); renderAllTrades(); renderSnapshot();
  }catch(e){
    $("importMsg").innerText = "Invalid JSON ❌";
  }
};

$("resetAllBtn").onclick = ()=>{
  const c = prompt('Type DELETE to confirm');
  if (c === "DELETE"){
    localStorage.removeItem(STORAGE_KEY);
    location.reload();
  }
};

/* Language toggle (saved only) */
function setLangButtons(){
  $$("#langSeg .segBtn").forEach(b=>b.classList.toggle("active", b.dataset.lang===state.language));
}
setLangButtons();
$("langSeg").addEventListener("click",(e)=>{
  const b = e.target.closest(".segBtn");
  if (!b) return;
  state.language = b.dataset.lang;
  saveState();
  setLangButtons();
});

/* =========================
   Snapshot (share screen)
========================= */
$("shareSnapshotBtn").onclick = ()=> showScreen("snapshot");
$("snapBackBtn").onclick = ()=> showScreen("dash");
$("snapTipBtn").onclick = ()=> alert("Take a screenshot of this screen and share it.");

function renderSnapshot(){
  const closed = filteredClosed();
  const open = filteredOpen();

  const totalPnL = closed.reduce((a,t)=>a+(t.pnl||0),0);
  const wins = closed.filter(t=>(t.pnl||0)>0).length;
  const wr = closed.length ? wins/closed.length*100 : 0;
  const avgR = closed.reduce((a,t)=>a+(t.r||0),0)/(closed.length||1);

  const maeAvg = closed.reduce((a,t)=>a+(t.mae||0),0)/(closed.length||1);
  const mfeAvg = closed.reduce((a,t)=>a+(t.mfe||0),0)/(closed.length||1);

  const st = streakInfo(closed);
  const ds = disciplineStats(closed);
  const setups = setupAgg(closed);
  const topSetup = setups[0];

  $("snapPeriod").innerText = `Snapshot • ${state.period}`;

  const kpis = [
    ["Total PnL", fmtMoney(totalPnL)],
    ["Trades", String(closed.length)],
    ["Win Rate", fmtPct(wr)],
    ["Avg R", avgR.toFixed(2)+"R"],
    ["Open Risk", fmtMoney(open.reduce((a,t)=>a+(t.risk||0),0))],
    ["MAE Avg", fmtMoney(maeAvg)],
    ["MFE Avg", fmtMoney(mfeAvg)],
    ["Streak", closed.length ? `${st.current.type}${st.current.len}` : "—"],
    ["Discipline", fmtMoney(ds.cost)],
    ["Top Setup", topSetup ? topSetup.name : "—"],
  ];

  $("snapGrid").innerHTML = kpis.map(([k,v])=>`
    <div class="snapKpi">
      <div class="snapK">${k}</div>
      <div class="snapV">${escapeHtml(v)}</div>
    </div>
  `).join("");

  const sess = sessionAgg(closed);
  const rows = [
    sess["Asia"], sess["London"], sess["NY"], sess[""]
  ].map(o=>`
    <div class="snapSessRow">
      <span>${o.name}</span>
      <span>${fmtMoney(o.pnl)} • ${o.n} • ${fmtPct(o.wr)}</span>
    </div>
  `).join("");

  $("snapSessions").innerHTML = rows;
}

/* =========================
   Init
========================= */
(function initDefaults(){
  // dates default
  if ($("fDate")) $("fDate").value = todayStr();
  if ($("cDate")) $("cDate").value = todayStr();

  // Hide pnl default OFF
  $("hidePnlToggle").checked = !!state.hidePnl;

  updateNewRiskPreview();
  updateChecklistRiskPreview();

  hydrateCloseSelect();
  hydrateReviewSelect();
  hydrateEditSelect();

  renderDashboard();
  renderAllTrades();
  renderSnapshot();

  showScreen("dash");
})();

/* =========================
   Close screen helper resets
========================= */
function hydrateReviewSelect(){ /* overwritten above by hoist? (avoid) */ }
