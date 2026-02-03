document.addEventListener("DOMContentLoaded", () => {
  // Telegram WebApp (optional)
  const tg = window.Telegram?.WebApp;
  try { tg?.ready(); tg?.expand(); } catch {}

  const STORAGE_KEY = "adigafx_journal_v20";

  const $ = (id) => document.getElementById(id);
  const $$ = (sel) => Array.from(document.querySelectorAll(sel));

  const toNum = (v) => {
    const n = parseFloat(String(v ?? "").replace(",", "."));
    return Number.isFinite(n) ? n : null;
  };

  const fmtMoney = (n) => {
    const sign = n >= 0 ? "" : "-";
    return `${sign}$${Math.abs(n).toFixed(2)}`;
  };

  const uid = () => (crypto?.randomUUID ? crypto.randomUUID() : String(Date.now()) + Math.random().toString(16).slice(2));

  // XAU: 1 lot = 100 oz
  const riskUsdApprox = (entry, sl, lot) => Math.abs(entry - sl) * lot * 100;

  const pnlFromExit = (entry, exit, lot, dir) => {
    const delta = (exit - entry) * lot * 100;
    return dir === "SHORT" ? -delta : delta;
  };

  const rMultiple = (pnl, risk) => (!risk || risk <= 0) ? 0 : (pnl / risk);

  const maeUsdFromPrice = (entry, maePrice, lot, dir) => {
    if (entry == null || maePrice == null || lot == null) return 0;
    const moveAgainst = (dir === "LONG") ? (entry - maePrice) : (maePrice - entry);
    return Math.max(0, moveAgainst) * lot * 100;
  };

  const mfeUsdFromPrice = (entry, mfePrice, lot, dir) => {
    if (entry == null || mfePrice == null || lot == null) return 0;
    const moveFor = (dir === "LONG") ? (mfePrice - entry) : (entry - mfePrice);
    return Math.max(0, moveFor) * lot * 100;
  };

  const defaultState = {
    trades: [],
    timeFilter: "ALL",
    closeSelectedId: "",
    reviewSelectedId: "",
    editSelectedId: ""
  };

  function loadState() {
    try { return { ...defaultState, ...(JSON.parse(localStorage.getItem(STORAGE_KEY)) || {}) }; }
    catch { return { ...defaultState }; }
  }
  let state = loadState();

  function saveState() {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  }

  function normalizeTrade(tr) {
    tr.symbol = "XAUUSD";
    tr.dir = tr.dir || "LONG";
    tr.status = tr.status || "OPEN";
    tr.date = tr.date || new Date().toISOString().slice(0, 10);
    tr.session = tr.session || "";
    tr.strategy = tr.strategy || "";
    tr.notes = tr.notes || "";
    if (!tr.review) tr.review = { plan: "YES", mistake: "", notes: "" };

    const risk = (tr.entry != null && tr.sl != null && tr.lot != null)
      ? riskUsdApprox(tr.entry, tr.sl, tr.lot)
      : 0;

    tr.riskUsd = risk;

    if (tr.status === "CLOSED") {
      if (tr.exit != null && tr.entry != null && tr.lot != null) tr.pnl = pnlFromExit(tr.entry, tr.exit, tr.lot, tr.dir);
      tr.pnl = tr.pnl ?? 0;
      tr.r = rMultiple(tr.pnl || 0, risk);

      tr.maeUsd = maeUsdFromPrice(tr.entry, tr.maePrice ?? null, tr.lot, tr.dir);
      tr.mfeUsd = mfeUsdFromPrice(tr.entry, tr.mfePrice ?? null, tr.lot, tr.dir);
    } else {
      tr.pnl = 0;
      tr.r = 0;
      tr.maeUsd = 0;
      tr.mfeUsd = 0;
      tr.exit = null;
    }
  }

  function addTrade(payload) {
    const tr = {
      id: uid(),
      symbol: "XAUUSD",
      maePrice: null,
      mfePrice: null,
      review: { plan: "YES", mistake: "", notes: "" },
      ...payload
    };
    normalizeTrade(tr);

    state.trades.push(tr);

    state.reviewSelectedId = tr.id;
    state.editSelectedId = tr.id;
    if (tr.status === "OPEN") state.closeSelectedId = tr.id;

    saveState();
  }

  function getTradeById(id) {
    return state.trades.find(t => t.id === id) || null;
  }

  function deleteTrade(id) {
    const i = state.trades.findIndex(t => t.id === id);
    if (i === -1) return;

    state.trades.splice(i, 1);
    if (state.closeSelectedId === id) state.closeSelectedId = "";
    if (state.reviewSelectedId === id) state.reviewSelectedId = "";
    if (state.editSelectedId === id) state.editSelectedId = "";
    saveState();
  }

  // -------- Router (tabs) --------
  function setActiveTab(route) {
    $$(".tab").forEach(t => t.classList.toggle("active", t.dataset.route === route));
    $$(".screen").forEach(s => s.classList.toggle("active", s.id === `screen-${route}`));

    if (route === "dash") renderDashboard();
    if (route === "check") renderChecklist();
    if (route === "new") renderNew();
    if (route === "close") renderClose();
    if (route === "review") renderReview();
    if (route === "all") renderAllTrades();
    if (route === "edit") renderEdit();
  }

  $$(".tab").forEach(btn => btn.addEventListener("click", () => setActiveTab(btn.dataset.route)));

  // -------- Seg helpers --------
  function setSegActive(segId, dataKey, value) {
    $$("#" + segId + " .segBtn").forEach(b => b.classList.toggle("active", b.dataset[dataKey] === value));
  }
  function getSegActive(segId, dataKey, fallback) {
    const b = $$("#" + segId + " .segBtn").find(x => x.classList.contains("active"));
    return b ? b.dataset[dataKey] : fallback;
  }

  // -------- Time filter --------
  function isInTimeFilter(tr, mode) {
    if (mode === "ALL") return true;
    const d = new Date(tr.date + "T00:00:00");
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());

    if (mode === "TODAY") return d.getTime() === today.getTime();

    if (mode === "WEEK") {
      const start = new Date(today);
      start.setDate(start.getDate() - 6);
      return d >= start && d <= today;
    }

    if (mode === "MONTH") {
      const start = new Date(now.getFullYear(), now.getMonth(), 1);
      return d >= start && d <= today;
    }

    return true;
  }

  const sum = (arr) => arr.reduce((a, b) => a + b, 0);
  const avg = (arr) => arr.length ? sum(arr) / arr.length : 0;

  function computeStreak(closedAsc) {
    // closedAsc sorted by date ASC (oldest -> newest)
    let w = 0, l = 0;
    for (let i = closedAsc.length - 1; i >= 0; i--) {
      const t = closedAsc[i];
      if ((t.pnl || 0) > 0) {
        if (l > 0) break;
        w++;
      } else if ((t.pnl || 0) < 0) {
        if (w > 0) break;
        l++;
      } else {
        break;
      }
    }
    return { w, l };
  }

  function topSetupByPnl(closedTrades) {
    const m = new Map();
    closedTrades.forEach(t => {
      const key = (t.strategy || "").trim() || "—";
      m.set(key, (m.get(key) || 0) + (t.pnl || 0));
    });
    let bestKey = "—", bestVal = -Infinity;
    for (const [k, v] of m.entries()) {
      if (v > bestVal) { bestVal = v; bestKey = k; }
    }
    return { bestKey, bestVal: (bestVal === -Infinity ? 0 : bestVal) };
  }

  // -------- Dashboard --------
  function renderDashboard() {
    state.trades.forEach(normalizeTrade);

    const mode = state.timeFilter || "ALL";
    if ($("timeSeg")) setSegActive("timeSeg", "time", mode);

    const filtered = state.trades.filter(t => isInTimeFilter(t, mode));
    const open = filtered.filter(t => t.status === "OPEN");
    const closed = filtered.filter(t => t.status === "CLOSED");
    const closedAsc = closed.slice().sort((a, b) => a.date.localeCompare(b.date));

    const pnlTotal = sum(closed.map(t => t.pnl || 0));
    const wins = closed.filter(t => (t.pnl || 0) > 0);
    const losses = closed.filter(t => (t.pnl || 0) < 0);
    const winRate = closed.length ? Math.round((wins.length / closed.length) * 100) : 0;

    const rs = closed.map(t => t.r || 0);
    const avgR = avg(rs);

    const avgWinR = wins.length ? avg(wins.map(t => t.r || 0)) : 0;
    const avgLossR = losses.length ? avg(losses.map(t => Math.abs(t.r || 0))) : 0;
    const wr = closed.length ? wins.length / closed.length : 0;
    const lr = 1 - wr;
    const expectancy = (wr * avgWinR) - (lr * avgLossR);

    const openRisk = sum(open.map(t => t.riskUsd || 0));
    const maeAvg = avg(closed.map(t => t.maeUsd || 0).filter(x => x > 0));
    const mfeAvg = avg(closed.map(t => t.mfeUsd || 0).filter(x => x > 0));

    const best = closed.length ? Math.max(...closed.map(t => t.pnl || 0)) : 0;
    const worst = closed.length ? Math.min(...closed.map(t => t.pnl || 0)) : 0;

    const streak = computeStreak(closedAsc);

    const viol = closed.filter(t => (t.review?.plan === "NO") || ((t.review?.mistake || "").trim().length > 0));
    const disciplineCost = sum(viol.map(t => (t.pnl || 0) < 0 ? Math.abs(t.pnl || 0) : 0));

    const topSetup = topSetupByPnl(closed);

    const setText = (id, txt) => { const el = $(id); if (el) el.textContent = txt; };

    setText("statPnl", fmtMoney(pnlTotal));
    if ($("statPnl")) $("statPnl").style.color = pnlTotal >= 0 ? "var(--accent)" : "var(--danger)";

    setText("statWinRate", `${winRate}%`);
    setText("statWins", `Wins: ${wins.length} • Losses: ${losses.length}`);

    setText("statAvgR", `${avgR.toFixed(2)}R`);
    setText("statExp", `Expectancy: ${expectancy.toFixed(2)}R`);

    setText("statOpenRisk", fmtMoney(openRisk));
    setText("statOpenCount", `Open trades: ${open.length}`);

    setText("statMaeAvg", fmtMoney(maeAvg || 0));
    setText("statMfeAvg", fmtMoney(mfeAvg || 0));

    setText("statBestWorst", `${fmtMoney(best)} / ${fmtMoney(worst)}`);

    setText("statStreak", `W${streak.w} / L${streak.l}`);

    setText("statDiscipline", fmtMoney(disciplineCost));
    if ($("statDiscipline")) $("statDiscipline").style.color = disciplineCost > 0 ? "var(--danger)" : "var(--muted)";

    setText("statTopSetup", topSetup.bestKey === "—" ? "—" : topSetup.bestKey);
    setText("statTopSetupHint", topSetup.bestKey === "—" ? "No data yet" : `PnL: ${fmtMoney(topSetup.bestVal)}`);

    // Session performance (closed only)
    function sess(name) {
      const t = closed.filter(x => (x.session || "") === name);
      return { pnl: sum(t.map(x => x.pnl || 0)), n: t.length };
    }
    const a = sess("Asia"), l = sess("London"), n = sess("NY");
    const u = { pnl: sum(closed.filter(x => !x.session).map(x => x.pnl || 0)), n: closed.filter(x => !x.session).length };

    setText("sessAsia", fmtMoney(a.pnl)); setText("sessAsiaMeta", `${a.n} trades`);
    setText("sessLondon", fmtMoney(l.pnl)); setText("sessLondonMeta", `${l.n} trades`);
    setText("sessNY", fmtMoney(n.pnl)); setText("sessNYMeta", `${n.n} trades`);
    setText("sessU", fmtMoney(u.pnl)); setText("sessUMeta", `${u.n} trades`);

    // Recent trades
    const list = $("tradesList");
    if (list) {
      list.innerHTML = "";
      if (!filtered.length) {
        list.innerHTML = `<div class="item"><div class="k">No trades in this filter</div></div>`;
      } else {
        const last = filtered.slice().reverse().slice(0, 6);
        last.forEach(tr => {
          const pnlTxt = tr.status === "CLOSED" ? fmtMoney(tr.pnl || 0) : "OPEN";
          const rTxt = tr.status === "CLOSED" ? `${(tr.r || 0).toFixed(2)}R` : "";
          const card = document.createElement("div");
          card.className = "item";
          card.innerHTML = `
            <div class="itemTop">
              <div>${tr.symbol} • ${tr.dir}</div>
              <div>${pnlTxt}${rTxt ? " • " + rTxt : ""}</div>
            </div>
            <div class="kv"><span class="k">Date:</span> <span class="v">${tr.date}${tr.session ? " • " + tr.session : ""}</span></div>
            <div class="kv"><span class="k">Entry:</span> <span class="v">${tr.entry.toFixed(2)}</span> • <span class="k">SL:</span> <span class="v">${tr.sl.toFixed(2)}</span> • <span class="k">Lot:</span> <span class="v">${tr.lot.toFixed(2)}</span></div>
            <div class="row2" style="margin-top:10px;">
              <button class="btn ghost" type="button" data-act="edit" data-id="${tr.id}">Edit</button>
              <button class="btn ghost" type="button" data-act="${tr.status === "OPEN" ? "close" : "all"}" data-id="${tr.id}">${tr.status === "OPEN" ? "Close" : "All Trades"}</button>
            </div>
          `;
          card.querySelectorAll("button[data-act]").forEach(b => {
            b.addEventListener("click", () => {
              const id = b.dataset.id;
              const act = b.dataset.act;
              if (act === "edit") { state.editSelectedId = id; saveState(); setActiveTab("edit"); }
              if (act === "close") { state.closeSelectedId = id; saveState(); setActiveTab("close"); }
              if (act === "all") setActiveTab("all");
            });
          });
          list.appendChild(card);
        });
      }
    }
  }

  // Dashboard time seg + quick action buttons
  if ($("timeSeg")) {
    $$("#timeSeg .segBtn").forEach(b => b.addEventListener("click", () => {
      setSegActive("timeSeg", "time", b.dataset.time);
      state.timeFilter = b.dataset.time;
      saveState();
      renderDashboard();
    }));
  }
  const go = (r) => setActiveTab(r);
  $("qaNew")?.addEventListener("click", () => go("new"));
  $("qaChecklist")?.addEventListener("click", () => go("check"));
  $("qaClose")?.addEventListener("click", () => go("close"));
  $("qaAll")?.addEventListener("click", () => go("all"));

  // -------- NEW TRADE --------
  function renderNew() {
    if ($("fDate") && !$("fDate").value) $("fDate").value = new Date().toISOString().slice(0, 10);
  }

  function updateNewRisk() {
    const entry = toNum($("fEntry")?.value);
    const sl = toNum($("fSL")?.value);
    const lot = toNum($("fLot")?.value);
    const dir = getSegActive("dirSeg", "dir", "LONG");

    if (!($("riskUsd") && $("rMultiple"))) return;

    if (entry == null || sl == null || lot == null) {
      $("riskUsd").textContent = "$0.00";
      $("rMultiple").textContent = "0.00R";
      return;
    }

    const risk = riskUsdApprox(entry, sl, lot);
    $("riskUsd").textContent = fmtMoney(risk);

    const exit = toNum($("fExit")?.value);
    const pnlManual = toNum($("fPnl")?.value);

    let pnl = null;
    if (exit != null) pnl = pnlFromExit(entry, exit, lot, dir);
    else if (pnlManual != null) pnl = pnlManual;

    const r = pnl == null ? 0 : rMultiple(pnl, risk);
    $("rMultiple").textContent = `${r.toFixed(2)}R`;
  }

  function saveNewTrade() {
    const dir = getSegActive("dirSeg", "dir", "LONG");
    const date = $("fDate").value || new Date().toISOString().slice(0, 10);
    const session = $("fSession").value || "";

    const entry = toNum($("fEntry").value);
    const sl = toNum($("fSL").value);
    const tp = toNum($("fTP").value);
    const lot = toNum($("fLot").value);

    if (entry == null || sl == null || lot == null) { alert("Fill Entry, SL, Lot."); return; }

    const exit = toNum($("fExit").value);
    const pnlManual = toNum($("fPnl").value);

    let status = "OPEN";
    let pnl = 0;

    if (exit != null || pnlManual != null) {
      status = "CLOSED";
      pnl = exit != null ? pnlFromExit(entry, exit, lot, dir) : pnlManual;
    }

    addTrade({
      dir, date, session,
      entry, sl, tp: tp == null ? null : tp, lot,
      status,
      exit: exit == null ? null : exit,
      pnl,
      strategy: $("fStrategy").value || "",
      notes: $("fNotes").value || ""
    });

    alert("Saved!");
    $("fEntry").value = ""; $("fSL").value = ""; $("fTP").value = ""; $("fLot").value = "";
    $("fExit").value = ""; $("fPnl").value = ""; $("fStrategy").value = ""; $("fNotes").value = "";
    updateNewRisk();

    renderAllTrades();
    renderDashboard();
    setActiveTab("dash");
  }
  // -------- CHECKLIST --------
  function renderChecklist() {
    if ($("cDate") && !$("cDate").value) $("cDate").value = new Date().toISOString().slice(0, 10);
  }

  function updateChecklistRisk() {
    const entry = toNum($("cEntry")?.value);
    const sl = toNum($("cSL")?.value);
    const lot = toNum($("cLot")?.value);

    if (!($("cRiskUsd"))) return;
    if (entry == null || sl == null || lot == null) {
      $("cRiskUsd").textContent = "$0.00";
      return;
    }
    $("cRiskUsd").textContent = fmtMoney(riskUsdApprox(entry, sl, lot));
  }

  function addFromChecklist() {
    const dir = getSegActive("cDirSeg", "dir", "LONG");
    const date = $("cDate").value || new Date().toISOString().slice(0, 10);
    const session = $("cSession").value || "";

    const entry = toNum($("cEntry").value);
    const sl = toNum($("cSL").value);
    const tp = toNum($("cTP").value);
    const lot = toNum($("cLot").value);

    if (entry == null || sl == null || lot == null) { alert("Fill Entry, SL, Lot."); return; }

    // Not required: can be 0 checked
    const checked = $$(".cBox").filter(b => b.checked).length;
    const total = $$(".cBox").length;

    addTrade({
      dir, date, session,
      entry, sl, tp: tp == null ? null : tp, lot,
      status: "OPEN",
      strategy: "Checklist",
      notes: `Checklist: ${checked}/${total}\n${$("cNotes").value || ""}`.trim()
    });

    alert("Saved!");
    $$(".cBox").forEach(b => b.checked = false);
    $("cEntry").value = ""; $("cSL").value = ""; $("cTP").value = ""; $("cLot").value = ""; $("cNotes").value = "";
    updateChecklistRisk();

    renderAllTrades();
    renderDashboard();
    setActiveTab("dash");
  }

  // -------- PICKERS (telegram-friendly) --------
  function pickTradeId(list, title) {
    // Telegram iOS sometimes blocks <select> interactions;
    // Use a simple prompt picker.
    if (!list.length) return "";
    const lines = list.map((t, i) => {
      const pnlTxt = t.status === "CLOSED" ? fmtMoney(t.pnl || 0) : "OPEN";
      return `${i + 1}) ${t.date} • ${t.dir} • ${t.session || "—"} • ${pnlTxt}`;
    }).join("\n");
    const input = prompt(`${title}\n\n${lines}\n\nType number:`, "1");
    const n = parseInt(input || "", 10);
    if (!Number.isFinite(n) || n < 1 || n > list.length) return "";
    return list[n - 1].id;
  }

  // -------- CLOSE --------
  function renderClose() {
    state.trades.forEach(normalizeTrade);

    const openTrades = state.trades.filter(t => t.status === "OPEN").slice().reverse();

    // Ensure selection
    if (!state.closeSelectedId || !getTradeById(state.closeSelectedId) || getTradeById(state.closeSelectedId)?.status !== "OPEN") {
      state.closeSelectedId = openTrades.length ? openTrades[0].id : "";
      saveState();
    }

    const sel = getTradeById(state.closeSelectedId);
    if (!sel) {
      if ($("closeMeta")) $("closeMeta").textContent = "No OPEN trades.";
      if ($("closeMAEUsd")) $("closeMAEUsd").textContent = "$0.00";
      if ($("closeMFEUsd")) $("closeMFEUsd").textContent = "$0.00";
      if ($("closeR")) $("closeR").textContent = "0.00R";
      return;
    }

    if ($("closeMeta")) {
      $("closeMeta").textContent =
        `Entry ${sel.entry.toFixed(2)} • SL ${sel.sl.toFixed(2)} • Lot ${sel.lot.toFixed(2)} • Risk ${fmtMoney(sel.riskUsd || 0)}`;
    }

    updateClosePreview();
  }

  function updateClosePreview() {
    const sel = getTradeById(state.closeSelectedId);
    if (!sel) return;

    const exit = toNum($("closeExit")?.value);
    const pnlManual = toNum($("closePnl")?.value);

    const risk = sel.riskUsd || riskUsdApprox(sel.entry, sel.sl, sel.lot);

    let pnl = null;
    if (exit != null) pnl = pnlFromExit(sel.entry, exit, sel.lot, sel.dir);
    else if (pnlManual != null) pnl = pnlManual;

    const r = pnl == null ? 0 : rMultiple(pnl, risk);
    if ($("closeR")) $("closeR").textContent = `${r.toFixed(2)}R`;

    const maePrice = toNum($("closeMAE")?.value);
    const mfePrice = toNum($("closeMFE")?.value);

    const maeUsd = maeUsdFromPrice(sel.entry, maePrice, sel.lot, sel.dir);
    const mfeUsd = mfeUsdFromPrice(sel.entry, mfePrice, sel.lot, sel.dir);

    if ($("closeMAEUsd")) $("closeMAEUsd").textContent = fmtMoney(maeUsd);
    if ($("closeMFEUsd")) $("closeMFEUsd").textContent = fmtMoney(mfeUsd);
  }

  function closeTradeSave() {
    const sel = getTradeById(state.closeSelectedId);
    if (!sel || sel.status !== "OPEN") { alert("No OPEN trade selected."); return; }

    const exit = toNum($("closeExit")?.value);
    const pnlManual = toNum($("closePnl")?.value);
    if (exit == null && pnlManual == null) { alert("Enter Exit or PnL."); return; }

    const risk = sel.riskUsd || riskUsdApprox(sel.entry, sel.sl, sel.lot);
    const pnl = exit != null ? pnlFromExit(sel.entry, exit, sel.lot, sel.dir) : pnlManual;

    sel.status = "CLOSED";
    sel.exit = exit == null ? null : exit;
    sel.pnl = pnl;
    sel.riskUsd = risk;

    sel.maePrice = toNum($("closeMAE")?.value);
    sel.mfePrice = toNum($("closeMFE")?.value);
    normalizeTrade(sel);

    saveState();
    alert("Closed!");

    // Reset fields
    if ($("closeExit")) $("closeExit").value = "";
    if ($("closePnl")) $("closePnl").value = "";
    if ($("closeMAE")) $("closeMAE").value = "";
    if ($("closeMFE")) $("closeMFE").value = "";

    renderAllTrades();
    renderDashboard();
    setActiveTab("dash");
  }

  // -------- REVIEW --------
  function renderReview() {
    state.trades.forEach(normalizeTrade);
    const allTrades = state.trades.slice().reverse();

    if (!state.reviewSelectedId || !getTradeById(state.reviewSelectedId)) {
      state.reviewSelectedId = allTrades.length ? allTrades[0].id : "";
      saveState();
    }

    const sel = getTradeById(state.reviewSelectedId);
    if (!sel) {
      if ($("reviewMeta")) $("reviewMeta").textContent = "No trade.";
      return;
    }

    if ($("reviewMeta")) {
      $("reviewMeta").textContent =
        `Entry ${sel.entry.toFixed(2)} • SL ${sel.sl.toFixed(2)} • Lot ${sel.lot.toFixed(2)} • ${sel.status}` +
        (sel.status === "CLOSED" ? ` • ${fmtMoney(sel.pnl || 0)}` : "");
    }

    if ($("rPlan")) $("rPlan").value = sel.review?.plan || "YES";
    if ($("rMistake")) $("rMistake").value = sel.review?.mistake || "";
    if ($("rReviewNotes")) $("rReviewNotes").value = sel.review?.notes || "";
  }

  function saveReview() {
    const sel = getTradeById(state.reviewSelectedId);
    if (!sel) { alert("Pick trade."); return; }

    sel.review = {
      plan: $("rPlan")?.value || "YES",
      mistake: $("rMistake")?.value || "",
      notes: $("rReviewNotes")?.value || ""
    };

    saveState();
    alert("Review saved!");

    // reset to defaults (as requested)
    if ($("rPlan")) $("rPlan").value = "YES";
    if ($("rMistake")) $("rMistake").value = "";
    if ($("rReviewNotes")) $("rReviewNotes").value = "";

    renderAllTrades();
    renderDashboard();
    setActiveTab("dash");
  }

  // -------- ALL TRADES (with delete) --------
  function renderAllTrades() {
    state.trades.forEach(normalizeTrade);
    const list = $("allTradesList");
    if (!list) return;

    list.innerHTML = "";
    const trades = state.trades.slice().reverse();

    if (!trades.length) {
      list.innerHTML = `<div class="item"><div class="k">No trades</div></div>`;
      return;
    }

    trades.forEach(tr => {
      const pnlTxt = tr.status === "CLOSED" ? fmtMoney(tr.pnl || 0) : "OPEN";
      const rTxt = tr.status === "CLOSED" ? `${(tr.r || 0).toFixed(2)}R` : "";

      const maeTxt = (tr.status === "CLOSED" && tr.maePrice != null)
        ? `${tr.maePrice.toFixed(2)} (${fmtMoney(tr.maeUsd || 0)})`
        : "—";

      const mfeTxt = (tr.status === "CLOSED" && tr.mfePrice != null)
        ? `${tr.mfePrice.toFixed(2)} (${fmtMoney(tr.mfeUsd || 0)})`
        : "—";

      const card = document.createElement("div");
      card.className = "item";
      card.innerHTML = `
        <div class="itemTop">
          <div>${tr.symbol} • ${tr.dir} • ${tr.status}</div>
          <div>${pnlTxt}${rTxt ? " • " + rTxt : ""}</div>
        </div>

        <div class="kv"><span class="k">Date:</span> <span class="v">${tr.date}${tr.session ? " • " + tr.session : ""}</span></div>

        <div class="kv">
          <span class="k">Entry:</span> <span class="v">${tr.entry.toFixed(2)}</span> •
          <span class="k">Exit:</span> <span class="v">${tr.exit == null ? "—" : tr.exit.toFixed(2)}</span>
        </div>

        <div class="kv">
          <span class="k">SL:</span> <span class="v">${tr.sl.toFixed(2)}</span> •
          <span class="k">TP:</span> <span class="v">${tr.tp == null ? "—" : tr.tp.toFixed(2)}</span> •
          <span class="k">Lot:</span> <span class="v">${tr.lot.toFixed(2)}</span>
        </div>

        <div class="kv"><span class="k">Strategy:</span> <span class="v">${(tr.strategy || "—")}</span></div>

        <div class="kv">
          <span class="k">MAE (worst):</span> <span class="v">${maeTxt}</span><br/>
          <span class="k">MFE (best):</span> <span class="v">${mfeTxt}</span>
        </div>

        <div class="kv"><span class="k">Review:</span>
          <span class="v">${tr.review?.plan === "NO" ? "Not following plan" : "Following plan"}</span>
          ${tr.review?.mistake ? ` • <span class="k">Mistake:</span> <span class="v">${tr.review.mistake}</span>` : ""}
        </div>

        <div class="kv"><span class="k">Notes:</span> <span class="v">${(tr.notes || "—")}</span></div>

        <div class="row2" style="margin-top:10px;">
          <button class="btn ghost" type="button" data-act="edit" data-id="${tr.id}">Edit</button>
          <button class="btn danger" type="button" data-act="delete" data-id="${tr.id}">Delete</button>
        </div>
      `;

      card.querySelectorAll("button[data-act]").forEach(b => {
        b.addEventListener("click", () => {
          const id = b.dataset.id;
          const act = b.dataset.act;

          if (act === "edit") {
            state.editSelectedId = id;
            saveState();
            setActiveTab("edit");
            return;
          }

          if (act === "delete") {
            if (!confirm("Delete this trade?")) return;
            deleteTrade(id);
            renderAllTrades();
            renderDashboard();
          }
        });
      });

      list.appendChild(card);
    });
  }

  // -------- EDIT --------
  function renderEdit() {
    state.trades.forEach(normalizeTrade);
    const allTrades = state.trades.slice().reverse();

    if (!state.editSelectedId || !getTradeById(state.editSelectedId)) {
      state.editSelectedId = allTrades.length ? allTrades[0].id : "";
      saveState();
    }

    const sel = getTradeById(state.editSelectedId);
    if (!sel) {
      if ($("editMeta")) $("editMeta").textContent = "No trade.";
      return;
    }

    if ($("editMeta")) $("editMeta").textContent = `Entry ${sel.entry.toFixed(2)} • SL ${sel.sl.toFixed(2)} • Lot ${sel.lot.toFixed(2)} • ${sel.status}`;

    $("eStatus").value = sel.status;
    setSegActive("eDirSeg", "dir", sel.dir);

    $("eDate").value = sel.date;
    $("eSession").value = sel.session || "";

    $("eEntry").value = sel.entry ?? "";
    $("eSL").value = sel.sl ?? "";
    $("eTP").value = sel.tp ?? "";
    $("eLot").value = sel.lot ?? "";

    $("eExit").value = sel.exit ?? "";
    $("ePnl").value = (sel.exit == null && sel.status === "CLOSED") ? (sel.pnl ?? "") : "";

    $("eStrategy").value = sel.strategy || "";
    $("eNotes").value = sel.notes || "";

    $("eMAE").value = sel.maePrice ?? "";
    $("eMFE").value = sel.mfePrice ?? "";

    updateEditPreview();
  }

  function updateEditPreview() {
    const status = $("eStatus")?.value || "OPEN";
    const dir = getSegActive("eDirSeg", "dir", "LONG");

    const entry = toNum($("eEntry")?.value);
    const sl = toNum($("eSL")?.value);
    const lot = toNum($("eLot")?.value);
    const exit = toNum($("eExit")?.value);
    const pnlManual = toNum($("ePnl")?.value);

    if (entry == null || sl == null || lot == null) {
      if ($("eRisk")) $("eRisk").textContent = "$0.00";
      if ($("eR")) $("eR").textContent = "0.00R";
      if ($("eMAEUsd")) $("eMAEUsd").textContent = "$0.00";
      if ($("eMFEUsd")) $("eMFEUsd").textContent = "$0.00";
      return;
    }

    const risk = riskUsdApprox(entry, sl, lot);
    $("eRisk").textContent = fmtMoney(risk);

    let pnl = 0;
    if (status === "CLOSED") {
      if (exit != null) pnl = pnlFromExit(entry, exit, lot, dir);
      else if (pnlManual != null) pnl = pnlManual;
    }

    $("eR").textContent = `${rMultiple(pnl, risk).toFixed(2)}R`;

    const maeP = toNum($("eMAE")?.value);
    const mfeP = toNum($("eMFE")?.value);

    $("eMAEUsd").textContent = fmtMoney(maeUsdFromPrice(entry, maeP, lot, dir));
    $("eMFEUsd").textContent = fmtMoney(mfeUsdFromPrice(entry, mfeP, lot, dir));
  }

  function saveEdit() {
    const sel = getTradeById(state.editSelectedId);
    if (!sel) { alert("Pick trade."); return; }

    const status = $("eStatus").value || "OPEN";
    const dir = getSegActive("eDirSeg", "dir", "LONG");

    const date = $("eDate").value || new Date().toISOString().slice(0, 10);
    const session = $("eSession").value || "";

    const entry = toNum($("eEntry").value);
    const sl = toNum($("eSL").value);
    const tp = toNum($("eTP").value);
    const lot = toNum($("eLot").value);

    const exit = toNum($("eExit").value);
    const pnlManual = toNum($("ePnl").value);

    if (entry == null || sl == null || lot == null) { alert("Entry, SL, Lot are required."); return; }

    sel.status = status;
    sel.dir = dir;
    sel.date = date;
    sel.session = session;

    sel.entry = entry;
    sel.sl = sl;
    sel.tp = (tp == null ? null : tp);
    sel.lot = lot;

    if (status === "CLOSED") {
      sel.exit = (exit == null ? null : exit);
      sel.pnl = (exit != null) ? pnlFromExit(entry, exit, lot, dir) : (pnlManual ?? 0);
    } else {
      sel.exit = null;
      sel.pnl = 0;
    }

    sel.strategy = $("eStrategy").value || "";
    sel.notes = $("eNotes").value || "";

    sel.maePrice = toNum($("eMAE").value);
    sel.mfePrice = toNum($("eMFE").value);

    normalizeTrade(sel);
    saveState();

    alert("Saved!");
    renderAllTrades();
    renderDashboard();
    setActiveTab("all");
  }

  // -------- Wiring / Listeners --------

  // New trade seg + inputs
  $$("#dirSeg .segBtn").forEach(b => b.addEventListener("click", () => {
    setSegActive("dirSeg", "dir", b.dataset.dir);
    updateNewRisk();
  }));
  ["fEntry","fSL","fLot","fExit","fPnl"].forEach(id => $(id)?.addEventListener("input", updateNewRisk));
  $("saveTradeBtn")?.addEventListener("click", saveNewTrade);

  // Checklist seg + inputs
  $$("#cDirSeg .segBtn").forEach(b => b.addEventListener("click", () => {
    setSegActive("cDirSeg", "dir", b.dataset.dir);
    updateChecklistRisk();
  }));
  ["cEntry","cSL","cLot"].forEach(id => $(id)?.addEventListener("input", updateChecklistRisk));
  $("cAddTradeBtn")?.addEventListener("click", addFromChecklist);

  // Close inputs
  ["closeExit","closePnl","closeMAE","closeMFE"].forEach(id => $(id)?.addEventListener("input", updateClosePreview));
  $("closeTradeBtn")?.addEventListener("click", closeTradeSave);

  // Review save
  $("saveReviewBtn")?.addEventListener("click", saveReview);

  // Edit seg + inputs
  $$("#eDirSeg .segBtn").forEach(b => b.addEventListener("click", () => {
    setSegActive("eDirSeg", "dir", b.dataset.dir);
    updateEditPreview();
  }));
  ["eStatus","eEntry","eSL","eLot","eExit","ePnl","eMAE","eMFE"].forEach(id => $(id)?.addEventListener("input", updateEditPreview));
  $("saveEditBtn")?.addEventListener("click", saveEdit);

  // Pick buttons (prompt picker)
  $("closePickBtn")?.addEventListener("click", () => {
    const openTrades = state.trades.filter(t => t.status === "OPEN").slice().reverse();
    const picked = pickTradeId(openTrades, "Choose OPEN trade");
    if (picked) {
      state.closeSelectedId = picked;
      saveState();
      renderClose();
    }
  });

  $("reviewPickBtn")?.addEventListener("click", () => {
    const allTrades = state.trades.slice().reverse();
    const picked = pickTradeId(allTrades, "Choose trade to review");
    if (picked) {
      state.reviewSelectedId = picked;
      saveState();
      renderReview();
    }
  });

  $("editPickBtn")?.addEventListener("click", () => {
    const allTrades = state.trades.slice().reverse();
    const picked = pickTradeId(allTrades, "Choose trade to edit");
    if (picked) {
      state.editSelectedId = picked;
      saveState();
      renderEdit();
    }
  });

  // Defaults
  if ($("fDate") && !$("fDate").value) $("fDate").value = new Date().toISOString().slice(0, 10);
  if ($("cDate") && !$("cDate").value) $("cDate").value = new Date().toISOString().slice(0, 10);
  if ($("dirSeg")) setSegActive("dirSeg", "dir", "LONG");
  if ($("cDirSeg")) setSegActive("cDirSeg", "dir", "LONG");
  if ($("eDirSeg")) setSegActive("eDirSeg", "dir", "LONG");

  // First render
  renderAllTrades();
  renderDashboard();
  renderChecklist();
  renderNew();
  renderClose();
  renderReview();
  renderEdit();
  setActiveTab("dash");
});
