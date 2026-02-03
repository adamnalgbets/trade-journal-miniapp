/* =========================
   AdigaFX Trade Journal
   app.js – FULL LOGIC
   v33
========================= */

// Telegram Mini App
try {
  const tg = window.Telegram?.WebApp;
  tg?.ready();
  tg?.expand();
} catch (e) {}

/* =========================
   Storage
========================= */
const STORAGE_KEY = "adigafx_trade_journal_v33";

let state = {
  trades: [],
  hidePnl: false,
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

function fmtMoney(v) {
  if (state.hidePnl) return "Hidden";
  return "$" + (v || 0).toFixed(2);
}

function calcPnL(trade, exit) {
  const diff =
    trade.direction === "LONG"
      ? exit - trade.entry
      : trade.entry - exit;
  return diff * trade.lot * 100;
}

function calcRisk(trade) {
  return Math.abs(trade.entry - trade.sl) * trade.lot * 100;
}

function calcR(pnl, risk) {
  if (!risk) return 0;
  return pnl / risk;
}

/* =========================
   Navigation
========================= */
document.querySelectorAll(".tab").forEach((tab) => {
  tab.addEventListener("click", () => {
    document
      .querySelectorAll(".tab")
      .forEach((t) => t.classList.remove("active"));
    document
      .querySelectorAll(".screen")
      .forEach((s) => s.classList.remove("active"));

    tab.classList.add("active");
    $("screen-" + tab.dataset.screen).classList.add("active");
  });
});

/* =========================
   Dashboard
========================= */
function renderDashboard() {
  const closed = state.trades.filter((t) => t.status === "CLOSED");
  const wins = closed.filter((t) => t.pnl > 0);
  const losses = closed.filter((t) => t.pnl < 0);

  const totalPnL = closed.reduce((a, t) => a + t.pnl, 0);
  const avgR =
    closed.reduce((a, t) => a + (t.r || 0), 0) /
    (closed.length || 1);

  $("stat-total-pnl").innerText = fmtMoney(totalPnL);
  $("stat-trades").innerText = state.trades.length;
  $("stat-winrate").innerText = closed.length
    ? Math.round((wins.length / closed.length) * 100) + "%"
    : "0%";
  $("stat-avgr").innerText = avgR.toFixed(2) + "R";

  $("stat-best").innerText = fmtMoney(
    Math.max(0, ...closed.map((t) => t.pnl))
  );
  $("stat-worst").innerText = fmtMoney(
    Math.min(0, ...closed.map((t) => t.pnl))
  );

  // MAE / MFE averages
  const maeAvg =
    closed.reduce((a, t) => a + (t.mae || 0), 0) /
    (closed.length || 1);
  const mfeAvg =
    closed.reduce((a, t) => a + (t.mfe || 0), 0) /
    (closed.length || 1);

  $("stat-mae").innerText = fmtMoney(maeAvg);
  $("stat-mfe").innerText = fmtMoney(mfeAvg);

  // Streak
  let streak = "";
  for (let i = closed.length - 1; i >= 0; i--) {
    if (closed[i].pnl > 0) streak += "W";
    else streak += "L";
    if (streak.length >= 5) break;
  }
  const w = streak.split("").filter((s) => s === "W").length;
  const l = streak.split("").filter((s) => s === "L").length;
  $("stat-streak").innerText = `W${w} / L${l}`;

  // Discipline cost
  const disciplineCost = closed
    .filter((t) => t.review && t.review.plan === "NO")
    .reduce((a, t) => a + Math.min(0, t.pnl), 0);
  $("stat-discipline").innerText = fmtMoney(disciplineCost);

  // Recent trades
  const recent = [...state.trades].slice(-5).reverse();
  $("recent-trades").innerHTML = recent
    .map(
      (t) => `
    <div class="trade-item">
      <div class="top">
        <span>${t.direction}</span>
        <span>${t.status === "CLOSED" ? fmtMoney(t.pnl) : "OPEN"}</span>
      </div>
      <div class="meta">${t.session || ""} • ${t.setup || ""}</div>
    </div>
  `
    )
    .join("");
}

/* =========================
   New Trade
========================= */
$("save-new-trade").addEventListener("click", () => {
  const trade = {
    id: Date.now(),
    direction: $("new-direction").value,
    entry: parseFloat($("new-entry").value),
    sl: parseFloat($("new-sl").value),
    lot: parseFloat($("new-lot").value),
    session: $("new-session").value,
    setup: $("new-setup").value,
    notes: $("new-notes").value,
    status: "OPEN",
  };

  if (!trade.entry || !trade.sl || !trade.lot) {
    alert("Please fill Entry, SL and Lot");
    return;
  }

  trade.risk = calcRisk(trade);
  state.trades.push(trade);
  saveState();
  renderDashboard();
  alert("Trade added");
});

/* =========================
   Close Trade
========================= */
let selectedCloseTrade = null;

$("pick-open-trade").addEventListener("click", () => {
  const openTrades = state.trades.filter((t) => t.status === "OPEN");
  if (!openTrades.length) {
    alert("No open trades");
    return;
  }

  const list = openTrades
    .map((t, i) => `${i + 1}. ${t.direction} @ ${t.entry}`)
    .join("\n");

  const choice = parseInt(prompt(list), 10) - 1;
  selectedCloseTrade = openTrades[choice];
  if (!selectedCloseTrade) return;

  $("close-selected-info").innerText =
    selectedCloseTrade.direction +
    " @ " +
    selectedCloseTrade.entry;
});

$("confirm-close-trade").addEventListener("click", () => {
  if (!selectedCloseTrade) return;

  const exit = parseFloat($("close-exit").value);
  const mae = parseFloat($("close-mae").value);
  const mfe = parseFloat($("close-mfe").value);

  if (!exit) {
    alert("Exit price required");
    return;
  }

  selectedCloseTrade.exit = exit;
  selectedCloseTrade.pnl = calcPnL(selectedCloseTrade, exit);
  selectedCloseTrade.r = calcR(
    selectedCloseTrade.pnl,
    selectedCloseTrade.risk
  );

  selectedCloseTrade.mae = mae
    ? Math.abs(selectedCloseTrade.entry - mae) *
      selectedCloseTrade.lot *
      100
    : 0;

  selectedCloseTrade.mfe = mfe
    ? Math.abs(mfe - selectedCloseTrade.entry) *
      selectedCloseTrade.lot *
      100
    : 0;

  selectedCloseTrade.status = "CLOSED";
  saveState();
  renderDashboard();
  alert("Trade closed");
});

/* =========================
   Review
========================= */
let selectedReviewTrade = null;

$("pick-review-trade").addEventListener("click", () => {
  if (!state.trades.length) return;

  const list = state.trades
    .map((t, i) => `${i + 1}. ${t.direction} (${t.status})`)
    .join("\n");

  const idx = parseInt(prompt(list), 10) - 1;
  selectedReviewTrade = state.trades[idx];
});

$("save-review").addEventListener("click", () => {
  if (!selectedReviewTrade) return;

  selectedReviewTrade.review = {
    plan: $("review-plan").value,
    mistake: $("review-mistake").value,
    notes: $("review-notes").value,
  };

  saveState();
  renderDashboard();
  alert("Review saved");
});

/* =========================
   All Trades
========================= */
function renderAllTrades() {
  $("all-trades-list").innerHTML = state.trades
    .map(
      (t) => `
    <div class="trade-item">
      <div class="top">
        <span>${t.direction}</span>
        <span>${t.status === "CLOSED" ? fmtMoney(t.pnl) : "OPEN"}</span>
      </div>
      <div class="meta">${t.setup || ""}</div>
    </div>
  `
    )
    .join("");
}

/* =========================
   Settings
========================= */
$("toggle-hide-pnl").checked = state.hidePnl;
$("toggle-hide-pnl").addEventListener("change", (e) => {
  state.hidePnl = e.target.checked;
  saveState();
  renderDashboard();
  renderAllTrades();
});

$("reset-data").addEventListener("click", () => {
  const confirm = prompt('Type "DELETE" to confirm');
  if (confirm === "DELETE") {
    localStorage.removeItem(STORAGE_KEY);
    location.reload();
  }
});

$("share-snapshot").addEventListener("click", () => {
  alert(
    "Snapshot ready.\nTake a screenshot of the dashboard to share."
  );
});

/* =========================
   Init
========================= */
renderDashboard();
renderAllTrades();
