/* ======================================================
   AdigaFX Trade Journal – FULL LOGIC
   Version: v34
   Storage: Local only
   Built by FaShuSh for AdigaFX
====================================================== */

/* Telegram Mini App */
try {
  const tg = window.Telegram?.WebApp;
  tg?.ready();
  tg?.expand();
} catch (e) {}

/* =========================
   Storage & State
========================= */
const STORAGE_KEY = "adigafx_trade_journal_v34";

let state = {
  trades: [],
  hidePnl: false,
  language: "EN"
};

try {
  const saved = JSON.parse(localStorage.getItem(STORAGE_KEY));
  if (saved) state = { ...state, ...saved };
} catch (e) {}

function saveState() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

/* =========================
   Helpers
========================= */
const $ = (id) => document.getElementById(id);
const $$ = (q) => Array.from(document.querySelectorAll(q));

function num(v) {
  const n = parseFloat(v);
  return isNaN(n) ? null : n;
}

function fmtMoney(v) {
  if (state.hidePnl) return "Hidden";
  return "$" + (v || 0).toFixed(2);
}

function calcRisk(entry, sl, lot) {
  return Math.abs(entry - sl) * lot * 100;
}

function calcPnL(dir, entry, exit, lot) {
  const diff = dir === "LONG" ? exit - entry : entry - exit;
  return diff * lot * 100;
}

function calcMAE(dir, entry, maePrice, lot) {
  if (maePrice == null) return 0;
  return Math.abs(entry - maePrice) * lot * 100;
}

function calcMFE(dir, entry, mfePrice, lot) {
  if (mfePrice == null) return 0;
  return Math.abs(mfePrice - entry) * lot * 100;
}

/* =========================
   Navigation
========================= */
function showScreen(route) {
  $$(".tab").forEach(b => b.classList.toggle("active", b.dataset.route === route));
  $$(".screen").forEach(s => s.classList.toggle("active", s.id === "screen-" + route));

  if (route === "dash") renderDashboard();
  if (route === "all") renderAllTrades();
}

$$(".tab").forEach(btn => {
  btn.addEventListener("click", () => showScreen(btn.dataset.route));
});

/* Quick actions */
$("qaNew").onclick = () => showScreen("new");
$("qaChecklist").onclick = () => showScreen("check");
$("qaClose").onclick = () => showScreen("close");
$("qaAll").onclick = () => showScreen("all");

/* =========================
   Dashboard
========================= */
function renderDashboard() {
  const closed = state.trades.filter(t => t.status === "CLOSED");
  const open = state.trades.filter(t => t.status === "OPEN");

  const totalPnL = closed.reduce((a, t) => a + t.pnl, 0);
  const wins = closed.filter(t => t.pnl > 0).length;
  const losses = closed.filter(t => t.pnl < 0).length;

  $("statPnl").innerText = fmtMoney(totalPnL);
  $("statWinRate").innerText = closed.length ? Math.round(wins / closed.length * 100) + "%" : "0%";
  $("statWins").innerText = `${wins}W / ${losses}L`;

  const avgR = closed.reduce((a, t) => a + (t.r || 0), 0) / (closed.length || 1);
  $("statAvgR").innerText = avgR.toFixed(2) + "R";

  const openRisk = open.reduce((a, t) => a + (t.risk || 0), 0);
  $("statOpenRisk").innerText = fmtMoney(openRisk);
  $("statOpenCount").innerText = `${open.length} open`;

  const maeAvg = closed.reduce((a, t) => a + (t.mae || 0), 0) / (closed.length || 1);
  const mfeAvg = closed.reduce((a, t) => a + (t.mfe || 0), 0) / (closed.length || 1);
  $("statMaeAvg").innerText = fmtMoney(maeAvg);
  $("statMfeAvg").innerText = fmtMoney(mfeAvg);

  const best = Math.max(0, ...closed.map(t => t.pnl));
  const worst = Math.min(0, ...closed.map(t => t.pnl));
  $("statBestWorst").innerText = `${fmtMoney(best)} / ${fmtMoney(worst)}`;

  /* Streak */
  let w = 0, l = 0;
  for (let i = closed.length - 1; i >= 0; i--) {
    if (closed[i].pnl > 0) w++;
    else l++;
    if (w + l >= 5) break;
  }
  $("statStreak").innerText = `W${w} / L${l}`;

  /* Discipline cost */
  const discipline = closed
    .filter(t => t.review && t.review.plan === "NO")
    .reduce((a, t) => a + Math.min(0, t.pnl), 0);
  $("statDiscipline").innerText = fmtMoney(discipline);

  /* Top setup */
  const setupMap = {};
  closed.forEach(t => {
    if (!t.strategy) return;
    setupMap[t.strategy] = (setupMap[t.strategy] || 0) + t.pnl;
  });
  const topSetup = Object.entries(setupMap).sort((a, b) => b[1] - a[1])[0];
  $("statTopSetup").innerText = topSetup ? topSetup[0] : "—";
  $("statTopSetupHint").innerText = topSetup ? fmtMoney(topSetup[1]) : "";

  /* Recent trades */
  $("tradesList").innerHTML = closed.slice(-5).reverse().map(t => `
    <div class="item">
      <div class="itemTop">
        <span>${t.direction}</span>
        <span>${fmtMoney(t.pnl)}</span>
      </div>
      <div class="kv">${t.session || ""} • ${t.strategy || ""}</div>
    </div>
  `).join("");
}

/* =========================
   Checklist → Add OPEN trade
========================= */
$("cAddTradeBtn").onclick = () => {
  const dir = $$("#cDirSeg .segBtn.active")[0]?.dataset.dir || "LONG";
  const entry = num($("cEntry").value);
  const sl = num($("cSL").value);
  const lot = num($("cLot").value);

  if (entry == null || sl == null || lot == null) {
    alert("Entry, SL and Lot are required");
    return;
  }

  const trade = {
    id: Date.now(),
    status: "OPEN",
    direction: dir,
    date: $("cDate").value || new Date().toISOString().slice(0,10),
    session: $("cSession").value,
    entry, sl, lot,
    tp: num($("cTP").value),
    notes: $("cNotes").value,
    strategy: "",
    risk: calcRisk(entry, sl, lot),
    review: {}
  };

  state.trades.push(trade);
  saveState();
  showScreen("dash");
};

/* =========================
   New Trade
========================= */
$("saveTradeBtn").onclick = () => {
  const dir = $$("#dirSeg .segBtn.active")[0]?.dataset.dir || "LONG";
  const entry = num($("fEntry").value);
  const sl = num($("fSL").value);
  const lot = num($("fLot").value);

  if (entry == null || sl == null || lot == null) {
    alert("Entry, SL and Lot required");
    return;
  }

  const trade = {
    id: Date.now(),
    status: "OPEN",
    direction: dir,
    date: $("fDate").value || new Date().toISOString().slice(0,10),
    session: $("fSession").value,
    entry, sl, lot,
    tp: num($("fTP").value),
    strategy: $("fStrategy").value,
    notes: $("fNotes").value,
    risk: calcRisk(entry, sl, lot),
    review: {}
  };

  state.trades.push(trade);
  saveState();
  showScreen("dash");
};

/* =========================
   Close Trade
========================= */
let closingTrade = null;

$("closePickBtn").onclick = () => {
  const open = state.trades.filter(t => t.status === "OPEN");
  if (!open.length) {
    alert("No open trades");
    return;
  }

  const list = open.map((t,i)=>`${i+1}) ${t.direction} @ ${t.entry}`).join("\n");
  const idx = parseInt(prompt(list),10)-1;
  closingTrade = open[idx];
  if (closingTrade) {
    $("closeMeta").innerText = `${closingTrade.direction} @ ${closingTrade.entry}`;
  }
};

$("closeTradeBtn").onclick = () => {
  if (!closingTrade) return;

  const exit = num($("closeExit").value);
  const pnlManual = num($("closePnl").value);

  if (exit == null && pnlManual == null) {
    alert("Exit or PnL required");
    return;
  }

  if (exit != null) {
    closingTrade.exit = exit;
    closingTrade.pnl = calcPnL(closingTrade.direction, closingTrade.entry, exit, closingTrade.lot);
  } else {
    closingTrade.pnl = pnlManual;
  }

  closingTrade.mae = calcMAE(closingTrade.direction, closingTrade.entry, num($("closeMAE").value), closingTrade.lot);
  closingTrade.mfe = calcMFE(closingTrade.direction, closingTrade.entry, num($("closeMFE").value), closingTrade.lot);
  closingTrade.r = closingTrade.pnl / (closingTrade.risk || 1);
  closingTrade.status = "CLOSED";

  saveState();
  showScreen("dash");
};

/* =========================
   Review
========================= */
let reviewTrade = null;

$("reviewPickBtn").onclick = () => {
  const list = state.trades.map((t,i)=>`${i+1}) ${t.direction} (${t.status})`).join("\n");
  const idx = parseInt(prompt(list),10)-1;
  reviewTrade = state.trades[idx];
  if (reviewTrade) {
    $("reviewMeta").innerText = `${reviewTrade.direction} @ ${reviewTrade.entry}`;
  }
};

$("saveReviewBtn").onclick = () => {
  if (!reviewTrade) return;

  reviewTrade.review = {
    plan: $("rPlan").value,
    mistake: $("rMistake").value,
    notes: $("rReviewNotes").value
  };

  saveState();
  showScreen("dash");
};

/* =========================
   All Trades + Delete
========================= */
function renderAllTrades() {
  $("allTradesList").innerHTML = state.trades.map(t=>`
    <div class="item">
      <div class="itemTop">
        <span>${t.direction}</span>
        <span>${t.status==="CLOSED"?fmtMoney(t.pnl):"OPEN"}</span>
      </div>
      <div class="kv">${t.strategy||""}</div>
      <button class="btn danger" onclick="deleteTrade(${t.id})">Delete</button>
    </div>
  `).join("");
}

window.deleteTrade = function(id){
  if (!confirm("Delete trade?")) return;
  state.trades = state.trades.filter(t=>t.id!==id);
  saveState();
  renderAllTrades();
  renderDashboard();
};

/* =========================
   Settings
========================= */
$("hidePnlToggle").checked = state.hidePnl;
$("hidePnlToggle").onchange = e => {
  state.hidePnl = e.target.checked;
  saveState();
  renderDashboard();
  renderAllTrades();
};

$("resetAllBtn").onclick = () => {
  const c = prompt('Type DELETE to confirm');
  if (c === "DELETE") {
    localStorage.removeItem(STORAGE_KEY);
    location.reload();
  }
};

/* Export / Import */
$("exportJsonBtn").onclick = () => {
  navigator.clipboard.writeText(JSON.stringify(state,null,2));
  alert("Exported to clipboard");
};

$("importReplaceBtn").onclick = () => {
  try{
    const obj = JSON.parse($("importJsonText").value);
    state = obj;
    saveState();
    location.reload();
  }catch(e){ alert("Invalid JSON"); }
};

$("importMergeBtn").onclick = () => {
  try{
    const obj = JSON.parse($("importJsonText").value);
    state.trades = [...state.trades, ...(obj.trades||[])];
    saveState();
    location.reload();
  }catch(e){ alert("Invalid JSON"); }
};

/* Snapshot */
$("shareSnapshotBtn").onclick = () => {
  showScreen("snapshot");
};

$("snapBackBtn").onclick = () => {
  showScreen("dash");
};

$("snapTipBtn").onclick = () => {
  alert("Take a screenshot of this screen to share.");
};

/* =========================
   Init
========================= */
renderDashboard();
renderAllTrades();
showScreen("dash");
