const tg = window.Telegram?.WebApp;
tg?.ready();

const STORAGE_KEY = "tj_trades_v1";

function byId(id) {
  return document.getElementById(id);
}

function loadTrades() {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY)) ?? [];
  } catch {
    return [];
  }
}

function saveTrades(trades) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(trades));
}

function fmtMoney(n) {
  const sign = n >= 0 ? "" : "-";
  const abs = Math.abs(n);
  return `${sign}$${abs.toFixed(2)}`;
}

function calcStats(trades) {
  const pnl = trades.reduce((s, t) => s + (t.pnl || 0), 0);
  const closed = trades.filter(t => typeof t.r === "number");
  const wins = closed.filter(t => t.r > 0).length;
  const wr = closed.length ? (wins / closed.length) * 100 : 0;
  const avgR = closed.length ? closed.reduce((s, t) => s + t.r, 0) / closed.length : 0;
  return { pnl, wr, avgR };
}

function render() {
  const trades = loadTrades();
  const { pnl, wr, avgR } = calcStats(trades);

  byId("totalPnl").textContent = fmtMoney(pnl);
  byId("winRate").textContent = `${wr.toFixed(0)}%`;
  byId("avgR").textContent = `${avgR.toFixed(2)}R`;

  const list = byId("tradesList");
  list.innerHTML = "";

  if (!trades.length) {
    list.innerHTML = `<div class="item"><div class="label">No trades yet. Add a demo trade or create a new trade.</div></div>`;
    return;
  }

  trades.slice().reverse().forEach(t => {
    const isWin = (t.pnl || 0) > 0;
    const cls = isWin ? "green" : (t.pnl || 0) < 0 ? "red" : "";
    const dir = t.dir || "LONG";
    const rVal = typeof t.r === "number" ? t.r : 0;

    const el = document.createElement("div");
    el.className = "item";
    el.innerHTML = `
      <div class="itemTop">
        <div>${t.symbol} • ${dir}</div>
        <div class="badge ${cls}">${fmtMoney(t.pnl || 0)} / ${rVal.toFixed(2)}R</div>
      </div>
      <div class="label">${t.date} • Entry ${t.entry} • SL ${t.sl} • Lot ${t.lot}</div>
    `;
    list.appendChild(el);
  });
}

/* ---------- New Trade Screen ---------- */

function showNewTrade(show) {
  const panel = byId("newTradePanel");
  if (!panel) return;

  panel.style.display = show ? "block" : "none";

  if (show) {
    setDefaultDate();
    panel.scrollIntoView({ behavior: "smooth", block: "start" });
  }
}

function setDefaultDate() {
  const el = byId("fDate");
  if (!el) return;
  el.value = new Date().toISOString().slice(0, 10);
}

function getActiveDir() {
  const btn = document.querySelector(".segBtn.active");
  return btn ? btn.dataset.dir : "LONG";
}

function clearForm() {
  const ids = ["fEntry", "fSL", "fTP", "fLot", "fPnl"];
  ids.forEach(id => {
    const el = byId(id);
    if (el) el.value = "";
  });
  setDefaultDate();
}

/* ---------- Button wiring ---------- */

function wireButtons() {
  // Demo seed trade
  byId("seedBtn")?.addEventListener("click", () => {
    const trades = loadTrades();
    trades.push({
      date: new Date().toISOString().slice(0, 10),
      symbol: "XAUUSD",
      dir: Math.random() > 0.5 ? "LONG" : "SHORT",
      entry: 2356.2,
      sl: 2350.8,
      lot: 0.1,
      r: +(Math.random() * 2 - 0.5).toFixed(2),
      pnl: +(Math.random() * 160 - 40).toFixed(2)
    });
    saveTrades(trades);
    render();
  });

  // Clear local data
  byId("clearBtn")?.addEventListener("click", () => {
    localStorage.removeItem(STORAGE_KEY);
    render();
  });

  // Open New Trade panel
  byId("newTradeBtn")?.addEventListener("click", () => {
    showNewTrade(true);
  });

  // Cancel New Trade
  byId("cancelTradeBtn")?.addEventListener("click", () => {
    showNewTrade(false);
  });

  // Segmented direction buttons
  document.querySelectorAll(".segBtn").forEach(b => {
    b.addEventListener("click", () => {
      document.querySelectorAll(".segBtn").forEach(x => x.classList.remove("active"));
      b.classList.add("active");
    });
  });

  // Save Trade
  byId("saveTradeBtn")?.addEventListener("click", () => {
    const entry = parseFloat(byId("fEntry")?.value);
    const sl = parseFloat(byId("fSL")?.value);
    const tpRaw = (byId("fTP")?.value || "").trim();
    const tp = tpRaw ? parseFloat(tpRaw) : null;
    const lot = parseFloat(byId("fLot")?.value);
    const pnl = parseFloat(byId("fPnl")?.value);
    const date = byId("fDate")?.value || new Date().toISOString().slice(0, 10);

    if (!isFinite(entry) || !isFinite(sl) || !isFinite(lot) || !isFinite(pnl)) {
      alert("Please fill Entry, Stop Loss, Lot and PnL.");
      return;
    }

    // Approx risk$ for XAUUSD:
    // price distance (USD/oz) * oz per lot (100) * lot size
    const riskPerOz = Math.abs(entry - sl);
    const riskUsdApprox = riskPerOz * 100 * lot;

    const r = riskUsdApprox > 0 ? pnl / riskUsdApprox : 0;

    const trades = loadTrades();
    trades.push({
      date,
      symbol: "XAUUSD",
      dir: getActiveDir(),
      entry: +entry.toFixed(2),
      sl: +sl.toFixed(2),
      tp: tp === null ? null : +tp.toFixed(2),
      lot: +lot.toFixed(2),
      pnl: +pnl.toFixed(2),
      r: +r.toFixed(2)
    });

    saveTrades(trades);
    clearForm();
    showNewTrade(false);
    render();
  });

  // Placeholder screens (next steps)
  byId("statsBtn")?.addEventListener("click", () => {
    alert("Next step: build the Stats screen + charts ✨");
  });

  byId("reviewBtn")?.addEventListener("click", () => {
    alert("Next step: build the Review screen ✨");
  });
}

wireButtons();
render();