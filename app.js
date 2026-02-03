const tg = window.Telegram?.WebApp;
tg?.ready();

const STORAGE_KEY = "tj_trades_v1";

function loadTrades() {
  try { return JSON.parse(localStorage.getItem(STORAGE_KEY)) ?? []; }
  catch { return []; }
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
  const avgR = closed.length ? closed.reduce((s,t)=>s+t.r,0) / closed.length : 0;
  return { pnl, wr, avgR };
}

function render() {
  const trades = loadTrades();
  const { pnl, wr, avgR } = calcStats(trades);

  document.getElementById("totalPnl").textContent = fmtMoney(pnl);
  document.getElementById("winRate").textContent = `${wr.toFixed(0)}%`;
  document.getElementById("avgR").textContent = `${avgR.toFixed(2)}R`;

  const list = document.getElementById("tradesList");
  list.innerHTML = "";

  if (!trades.length) {
    list.innerHTML = `<div class="item"><div class="label">No trades yet. Add a demo trade to see the UI.</div></div>`;
    return;
  }

  trades.slice().reverse().forEach(t => {
    const isWin = (t.pnl || 0) > 0;
    const cls = isWin ? "green" : (t.pnl || 0) < 0 ? "red" : "";
    const dir = t.dir || "LONG";

    const el = document.createElement("div");
    el.className = "item";
    el.innerHTML = `
      <div class="itemTop">
        <div>${t.symbol} • ${dir}</div>
        <div class="badge ${cls}">${fmtMoney(t.pnl || 0)} / ${(t.r ?? 0).toFixed(2)}R</div>
      </div>
      <div class="label">${t.date} • Entry ${t.entry} • SL ${t.sl} • Lot ${t.lot}</div>
    `;
    list.appendChild(el);
  });
}

// Buttons (v1 demo)
document.getElementById("seedBtn").addEventListener("click", () => {
  const trades = loadTrades();
  trades.push({
    date: new Date().toISOString().slice(0,10),
    symbol: "XAUUSD",
    dir: Math.random() > 0.5 ? "LONG" : "SHORT",
    entry: 2356.20,
    sl: 2350.80,
    lot: 0.10,
    r: +(Math.random() * 2 - 0.5).toFixed(2),
    pnl: +(Math.random() * 160 - 40).toFixed(2)
  });
  saveTrades(trades);
  render();
});

document.getElementById("clearBtn").addEventListener("click", () => {
  localStorage.removeItem(STORAGE_KEY);
  render();
});

document.getElementById("newTradeBtn").addEventListener("click", () => {
  alert("Next step: build the New Trade screen (form) ✨");
});

document.getElementById("statsBtn").addEventListener("click", () => {
  alert("Next step: Stats screen + charts ✨");
});

document.getElementById("reviewBtn").addEventListener("click", () => {
  alert("Next step: Review screen ✨");
});

render();
