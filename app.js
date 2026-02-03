document.addEventListener("DOMContentLoaded", () => {

  /* ---------- Telegram WebApp ---------- */
  const tg = window.Telegram?.WebApp;
  tg?.ready();
  tg?.expand();

  /* ---------- Storage ---------- */
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

  /* ---------- Helpers ---------- */
  function fmtMoney(n) {
    const sign = n >= 0 ? "" : "-";
    return `${sign}$${Math.abs(n).toFixed(2)}`;
  }

  function setDefaultDate() {
    const d = new Date().toISOString().slice(0, 10);
    const el = byId("fDate");
    if (el) el.value = d;
  }

  function getActiveDir() {
    const btn = document.querySelector(".segBtn.active");
    return btn ? btn.dataset.dir : "LONG";
  }

  function clearForm() {
    ["fEntry", "fSL", "fTP", "fLot", "fPnl"].forEach(id => {
      const el = byId(id);
      if (el) el.value = "";
    });
    setDefaultDate();
  }

  /* ---------- Stats ---------- */
  function calcStats(trades) {
    const pnl = trades.reduce((s, t) => s + (t.pnl || 0), 0);
    const closed = trades.filter(t => typeof t.r === "number");
    const wins = closed.filter(t => t.r > 0).length;
    const winRate = closed.length ? (wins / closed.length) * 100 : 0;
    const avgR = closed.length
      ? closed.reduce((s, t) => s + t.r, 0) / closed.length
      : 0;

    return { pnl, winRate, avgR };
  }

  /* ---------- Render ---------- */
  function render() {
    const trades = loadTrades();
    const { pnl, winRate, avgR } = calcStats(trades);

    byId("totalPnl").textContent = fmtMoney(pnl);
    byId("winRate").textContent = `${winRate.toFixed(0)}%`;
    byId("avgR").textContent = `${avgR.toFixed(2)}R`;

    const list = byId("tradesList");
    list.innerHTML = "";

    if (!trades.length) {
      list.innerHTML =
        `<div class="item"><div class="label">
          No trades yet. Add a demo trade or create a new trade.
        </div></div>`;
      return;
    }

    trades.slice().reverse().forEach(t => {
      const cls = t.pnl > 0 ? "green" : t.pnl < 0 ? "red" : "";
      const el = document.createElement("div");
      el.className = "item";
      el.innerHTML = `
        <div class="itemTop">
          <div>${t.symbol} • ${t.dir}</div>
          <div class="badge ${cls}">
            ${fmtMoney(t.pnl)} / ${t.r.toFixed(2)}R
          </div>
        </div>
        <div class="label">
          ${t.date} • Entry ${t.entry} • SL ${t.sl} • Lot ${t.lot}
        </div>
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

  /* ---------- Buttons ---------- */

  byId("newTradeBtn")?.addEventListener("click", () => {
    showNewTrade(true);
  });

  byId("cancelTradeBtn")?.addEventListener("click", () => {
    showNewTrade(false);
  });

  document.querySelectorAll(".segBtn").forEach(btn => {
    btn.addEventListener("click", () => {
      document.querySelectorAll(".segBtn")
        .forEach(b => b.classList.remove("active"));
      btn.classList.add("active");
    });
  });

  byId("saveTradeBtn")?.addEventListener("click", () => {
    const entry = parseFloat(byId("fEntry").value);
    const sl = parseFloat(byId("fSL").value);
    const lot = parseFloat(byId("fLot").value);
    const pnl = parseFloat(byId("fPnl").value);
    const date = byId("fDate").value;

    if (![entry, sl, lot, pnl].every(Number.isFinite)) {
      alert("Please fill Entry, Stop Loss, Lot and PnL");
      return;
    }

    const riskUsd = Math.abs(entry - sl) * lot * 100;
    const r = riskUsd > 0 ? pnl / riskUsd : 0;

    const trades = loadTrades();
    trades.push({
      date,
      symbol: "XAUUSD",
      dir: getActiveDir(),
      entry: +entry.toFixed(2),
      sl: +sl.toFixed(2),
      lot: +lot.toFixed(2),
      pnl: +pnl.toFixed(2),
      r: +r.toFixed(2)
    });

    saveTrades(trades);
    clearForm();
    showNewTrade(false);
    render();
  });

  byId("seedBtn")?.addEventListener("click", () => {
    const trades = loadTrades();
    trades.push({
      date: new Date().toISOString().slice(0, 10),
      symbol: "XAUUSD",
      dir: Math.random() > 0.5 ? "LONG" : "SHORT",
      entry: 2356.2,
      sl: 2350.8,
      lot: 0.1,
      pnl: +(Math.random() * 150 - 50).toFixed(2),
      r: +(Math.random() * 2 - 0.5).toFixed(2)
    });
    saveTrades(trades);
    render();
  });

  byId("clearBtn")?.addEventListener("click", () => {
    localStorage.removeItem(STORAGE_KEY);
    render();
  });

  render();

});
