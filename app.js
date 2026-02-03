document.addEventListener("DOMContentLoaded", () => {
  // Telegram
  const tg = window.Telegram?.WebApp;
  tg?.ready();
  tg?.expand();

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

  // XAU model: 1 lot = 100oz
  const riskUsdApprox = (entry, sl, lot) => Math.abs(entry - sl) * lot * 100;
  const pnlFromExit = (entry, exit, lot, dir) => {
    const delta = (exit - entry) * lot * 100;
    return dir === "SHORT" ? -delta : delta;
  };
  const rMultiple = (pnl, risk) => (!risk || risk <= 0) ? 0 : (pnl / risk);

  // MAE/MFE:
  // MAE price = worst moment against you
  // MFE price = best moment for you
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
    // selections for pickers
    closeSelectedId: "",
    reviewSelectedId: "",
    editSelectedId: ""
  };

  function loadState() {
    try { return { ...defaultState, ...(JSON.parse(localStorage.getItem(STORAGE_KEY)) || {}) }; }
    catch { return { ...defaultState }; }
  }

  let state = loadState();
  const saveState = () => localStorage.setItem(STORAGE_KEY, JSON.stringify(state));

  function normalizeTrade(tr) {
    // fill defaults + compute
    tr.symbol = "XAUUSD";
    tr.dir = tr.dir || "LONG";
    tr.status = tr.status || "OPEN";
    tr.date = tr.date || new Date().toISOString().slice(0, 10);
    tr.session = tr.session || "";
    tr.strategy = tr.strategy || "";
    tr.notes = tr.notes || "";

    if (!tr.review) tr.review = { plan: "YES", mistake: "", notes: "" };

    const risk = (tr.entry != null && tr.sl != null && tr.lot != null)
      ? riskUsdApprox(tr.entry, tr.sl, tr.lot) : 0;

    tr.riskUsd = risk;

    if (tr.status === "CLOSED") {
      if (tr.exit != null && tr.entry != null && tr.lot != null) {
        tr.pnl = pnlFromExit(tr.entry, tr.exit, tr.lot, tr.dir);
      } else {
        tr.pnl = tr.pnl ?? 0;
      }
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

  // -------- ROUTER --------
  function setActiveTab(route) {
    $$(".tab").forEach(t => t.classList.toggle("active", t.dataset.route === route));
    $$(".screen").forEach(s => s.classList.toggle("active", s.id === `screen-${route}`));

    if (route === "dash") renderDashboard();
    if (route === "new") renderNew();
    if (route === "check") renderChecklist();
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

  // -------- Add / Delete / Find --------
  function addTrade(payload) {
    const tr = {
      id: uid(),
      symbol: "XAUUSD",
      maePrice: null,
      mfePrice: null,
      maeUsd: 0,
      mfeUsd: 0,
      review: { plan: "YES", mistake: "", notes: "" },
      ...payload
    };
    normalizeTrade(tr);
    state.trades.push(tr);

    // default selections
    state.reviewSelectedId = tr.id;
    if (tr.status === "OPEN") state.closeSelectedId = tr.id;
    state.editSelectedId = tr.id;

    saveState();
  }

  function getTradeById(id) {
    return state.trades.find(t => t.id === id) || null;
  }

  function deleteTrade(id) {
    const i = state.trades.findIndex(t => t.id === id);
    if (i === -1) return;
    state.trades.splice(i, 1);

    if (state.reviewSelectedId === id) state.reviewSelectedId = "";
    if (state.closeSelectedId === id) state.closeSelectedId = "";
    if (state.editSelectedId === id) state.editSelectedId = "";

    saveState();
  }

  // -------- DASHBOARD --------
  function renderDashboard() {
    state.trades.forEach(normalizeTrade);

    const list = $("tradesList");
    list.innerHTML = "";

    const open = state.trades.filter(t => t.status === "OPEN");
    const closed = state.trades.filter(t => t.status === "CLOSED");

    // If you have dashboard cards in your index, you can update them here.
    // If not, it's fine — list will still render.

    if (!state.trades.length) {
      list.innerHTML = `<div class="item"><div class="k">No trades yet</div></div>`;
      return;
    }

    const last = state.trades.slice().reverse().slice(0, 6);
    last.forEach(tr => {
      const pnlTxt = tr.status === "CLOSED" ? fmtMoney(tr.pnl || 0) : "OPEN";
      const rTxt = tr.status === "CLOSED" ? `${(tr.r || 0).toFixed(2)}R` : "";
      const card = document.createElement("div");
      card.className = "item";
      card.innerHTML = `
        <div class="itemTop">
          <div>${tr.symbol} • ${tr.dir}</div>
          <div>${pnlTxt} ${rTxt ? "• " + rTxt : ""}</div>
        </div>
        <div class="kv"><span class="k">Date:</span> <span class="v">${tr.date}${tr.session ? " • " + tr.session : ""}</span></div>
        <div class="kv"><span class="k">Entry:</span> <span class="v">${tr.entry.toFixed(2)}</span> • <span class="k">SL:</span> <span class="v">${tr.sl.toFixed(2)}</span> • <span class="k">Lot:</span> <span class="v">${tr.lot.toFixed(2)}</span></div>
        <div class="row2" style="margin-top:10px;">
          <button class="btn ghost" data-act="edit" data-id="${tr.id}" type="button">Edit</button>
          <button class="btn ghost" data-act="${tr.status === "OPEN" ? "close" : "all"}" data-id="${tr.id}" type="button">${tr.status === "OPEN" ? "Close" : "All Trades"}</button>
        </div>
      `;

      card.querySelectorAll("button[data-act]").forEach(b => {
        b.addEventListener("click", () => {
          const act = b.dataset.act;
          const id = b.dataset.id;
          if (act === "edit") { state.editSelectedId = id; saveState(); setActiveTab("edit"); }
          if (act === "close") { state.closeSelectedId = id; saveState(); setActiveTab("close"); }
          if (act === "all") setActiveTab("all");
        });
      });

      list.appendChild(card);
    });
  }

  // -------- NEW TRADE --------
  function renderNew() {
    if ($("fDate") && !$("fDate").value) $("fDate").value = new Date().toISOString().slice(0, 10);
  }

  function updateNewRisk() {
    const entry = toNum($("fEntry")?.value);
    const sl = toNum($("fSL")?.value);
    const lot = toNum($("fLot")?.value);
    const dir = getSegActive("dirSeg","dir","LONG");

    const riskEl = $("riskUsd");
    const rEl = $("rMultiple");
    if (!riskEl || !rEl) return;

    if (entry == null || sl == null || lot == null) {
      riskEl.textContent = "$0.00";
      rEl.textContent = "0.00R";
      return;
    }

    const risk = riskUsdApprox(entry, sl, lot);
    riskEl.textContent = fmtMoney(risk);

    const exit = toNum($("fExit")?.value);
    const pnlManual = toNum($("fPnl")?.value);

    let pnl = null;
    if (exit != null) pnl = pnlFromExit(entry, exit, lot, dir);
    else if (pnlManual != null) pnl = pnlManual;

    const r = pnl == null ? 0 : rMultiple(pnl, risk);
    rEl.textContent = `${r.toFixed(2)}R`;
  }

  function saveNewTrade() {
    const dir = getSegActive("dirSeg","dir","LONG");
    const date = $("fDate").value || new Date().toISOString().slice(0, 10);
    const session = $("fSession").value || "";

    const entry = toNum($("fEntry").value);
    const sl = toNum($("fSL").value);
    const tp = toNum($("fTP").value);
    const lot = toNum($("fLot").value);

    if (entry == null || sl == null || lot == null) {
      alert("Fill Entry, SL, Lot.");
      return;
    }

    const exit = toNum($("fExit").value);
    const pnlManual = toNum($("fPnl").value);

    let status = "OPEN";
    let pnl = 0;
    let r = 0;

    const risk = riskUsdApprox(entry, sl, lot);
    if (exit != null || pnlManual != null) {
      status = "CLOSED";
      pnl = exit != null ? pnlFromExit(entry, exit, lot, dir) : pnlManual;
      r = rMultiple(pnl, risk);
    }

    addTrade({
      dir, date, session,
      entry, sl, tp: tp == null ? null : tp, lot,
      status,
      exit: exit == null ? null : exit,
      pnl,
      r,
      riskUsd: risk,
      strategy: $("fStrategy").value || "",
      notes: $("fNotes").value || ""
    });

    alert("Saved!");
    // reset form (simple)
    $("fEntry").value = "";
    $("fSL").value = "";
    $("fTP").value = "";
    $("fLot").value = "";
    $("fExit").value = "";
    $("fPnl").value = "";
    $("fStrategy").value = "";
    $("fNotes").value = "";
    $("riskUsd").textContent = "$0.00";
    $("rMultiple").textContent = "0.00R";

    renderDashboard();
    setActiveTab("dash");
  }

  // -------- CHECKLIST (no requirement) --------
  function renderChecklist() {
    if ($("cDate") && !$("cDate").value) $("cDate").value = new Date().toISOString().slice(0, 10);
  }

  function updateChecklistRisk() {
    const entry = toNum($("cEntry")?.value);
    const sl = toNum($("cSL")?.value);
    const lot = toNum($("cLot")?.value);
    const out = $("cRiskUsd");
    if (!out) return;
    if (entry == null || sl == null || lot == null) { out.textContent = "$0.00"; return; }
    out.textContent = fmtMoney(riskUsdApprox(entry, sl, lot));
  }

  function addFromChecklist() {
    const dir = getSegActive("cDirSeg","dir","LONG");
    const date = $("cDate").value || new Date().toISOString().slice(0, 10);
    const session = $("cSession").value || "";

    const entry = toNum($("cEntry").value);
    const sl = toNum($("cSL").value);
    const tp = toNum($("cTP").value);
    const lot = toNum($("cLot").value);

    if (entry == null || sl == null || lot == null) {
      alert("Fill Entry, SL, Lot.");
      return;
    }

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
    // reset
    $$(".cBox").forEach(b => b.checked = false);
    $("cEntry").value = "";
    $("cSL").value = "";
    $("cTP").value = "";
    $("cLot").value = "";
    $("cNotes").value = "";
    $("cRiskUsd").textContent = "$0.00";

    renderDashboard();
    setActiveTab("dash");
  }

  // -------- CLOSE TRADE --------
  function renderClose() {
    state.trades.forEach(normalizeTrade);
    const openTrades = state.trades.filter(t => t.status === "OPEN");

    let sel = getTradeById(state.closeSelectedId);
    if (!sel || sel.status !== "OPEN") {
      sel = openTrades[openTrades.length - 1] || null;
      state.closeSelectedId = sel ? sel.id : "";
      saveState();
    }

    const pickBtn = $("closePickBtn");
    const meta = $("closeMeta");
    if (pickBtn) pickBtn.textContent = sel ? `${sel.date} • ${sel.dir} • OPEN` : "Tap to choose…";
    if (meta) meta.textContent = sel ? `Entry ${sel.entry.toFixed(2)} • SL ${sel.sl.toFixed(2)} • Lot ${sel.lot.toFixed(2)}` : "No OPEN trades.";

    // reset preview numbers
    $("closeMAEUsd").textContent = "$0.00";
    $("closeMFEUsd").textContent = "$0.00";
    $("closeR").textContent = "0.00R";
  }

  function updateClosePreview() {
    const sel = getTradeById(state.closeSelectedId);
    if (!sel) return;

    const exit = toNum($("closeExit").value);
    const pnlManual = toNum($("closePnl").value);

    const risk = sel.riskUsd || riskUsdApprox(sel.entry, sel.sl, sel.lot);

    let pnl = null;
    if (exit != null) pnl = pnlFromExit(sel.entry, exit, sel.lot, sel.dir);
    else if (pnlManual != null) pnl = pnlManual;

    const r = pnl == null ? 0 : rMultiple(pnl, risk);
    $("closeR").textContent = `${r.toFixed(2)}R`;

    const maePrice = toNum($("closeMAE").value);
    const mfePrice = toNum($("closeMFE").value);

    const maeUsd = maeUsdFromPrice(sel.entry, maePrice, sel.lot, sel.dir);
    const mfeUsd = mfeUsdFromPrice(sel.entry, mfePrice, sel.lot, sel.dir);

    $("closeMAEUsd").textContent = fmtMoney(maeUsd);
    $("closeMFEUsd").textContent = fmtMoney(mfeUsd);
  }

  function closeTradeSave() {
    const sel = getTradeById(state.closeSelectedId);
    if (!sel || sel.status !== "OPEN") { alert("Pick OPEN trade."); return; }

    const exit = toNum($("closeExit").value);
    const pnlManual = toNum($("closePnl").value);
    if (exit == null && pnlManual == null) { alert("Enter Exit or PnL."); return; }

    const risk = sel.riskUsd || riskUsdApprox(sel.entry, sel.sl, sel.lot);
    const pnl = exit != null ? pnlFromExit(sel.entry, exit, sel.lot, sel.dir) : pnlManual;
    const r = rMultiple(pnl, risk);

    sel.status = "CLOSED";
    sel.exit = exit == null ? null : exit;
    sel.pnl = pnl;
    sel.r = r;
    sel.riskUsd = risk;

    sel.maePrice = toNum($("closeMAE").value);
    sel.mfePrice = toNum($("closeMFE").value);
    normalizeTrade(sel);

    saveState();

    alert("Closed!");
    $("closeExit").value = "";
    $("closePnl").value = "";
    $("closeMAE").value = "";
    $("closeMFE").value = "";

    renderDashboard();
    setActiveTab("dash");
  }

  // -------- MODAL PICKER (for review/close/edit) --------
  // Simple fallback: use native prompt list if modal isn't included in your index yet.
  // If you already have modal picker, we can wire it in later.
  function pickTrade(mode) {
    state.trades.forEach(normalizeTrade);

    let items = state.trades.slice();
    if (mode === "CLOSE") items = items.filter(t => t.status === "OPEN");

    if (!items.length) { alert(mode === "CLOSE" ? "No OPEN trades" : "No trades"); return; }

    const labels = items.map((t, i) => `${i+1}. ${t.date} • ${t.dir} • ${t.status === "OPEN" ? "OPEN" : fmtMoney(t.pnl||0)}`);
    const ans = prompt(`Select trade:\n${labels.join("\n")}\n\nType number:`);
    const idx = parseInt(ans, 10) - 1;
    if (!Number.isFinite(idx) || idx < 0 || idx >= items.length) return;

    const chosen = items[idx];
    if (mode === "CLOSE") state.closeSelectedId = chosen.id;
    if (mode === "REVIEW") state.reviewSelectedId = chosen.id;
    if (mode === "EDIT") state.editSelectedId = chosen.id;
    saveState();

    if (mode === "CLOSE") renderClose();
    if (mode === "REVIEW") renderReview();
    if (mode === "EDIT") renderEdit();
  }
  // -------- REVIEW --------
  function renderReview() {
    state.trades.forEach(normalizeTrade);

    const trades = state.trades.slice();
    let sel = getTradeById(state.reviewSelectedId);

    if (!sel && trades.length) {
      sel = trades[trades.length - 1];
      state.reviewSelectedId = sel.id;
      saveState();
    }

    const pickBtn = $("reviewPickBtn");
    const meta = $("reviewMeta");

    if (pickBtn) {
      pickBtn.textContent = sel
        ? `${sel.date} • ${sel.dir} • ${sel.status === "OPEN" ? "OPEN" : fmtMoney(sel.pnl || 0)}`
        : "Tap to choose…";
    }
    if (meta) {
      meta.textContent = sel
        ? `Entry ${sel.entry.toFixed(2)} • SL ${sel.sl.toFixed(2)} • Lot ${sel.lot.toFixed(2)}`
        : "No trade selected.";
    }

    if (!sel) return;

    // Fill review form
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

    // Reset review inputs to default blank as you requested
    if ($("rPlan")) $("rPlan").value = "YES";
    if ($("rMistake")) $("rMistake").value = "";
    if ($("rReviewNotes")) $("rReviewNotes").value = "";

    renderAllTrades();
    setActiveTab("dash");
  }

  // -------- ALL TRADES --------
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
            renderDashboard();
            renderAllTrades();
            return;
          }
        });
      });

      list.appendChild(card);
    });
  }

  // -------- EDIT --------
  function renderEdit() {
    state.trades.forEach(normalizeTrade);

    const trades = state.trades.slice();
    let sel = getTradeById(state.editSelectedId);

    if (!sel && trades.length) {
      sel = trades[trades.length - 1];
      state.editSelectedId = sel.id;
      saveState();
    }

    const pickBtn = $("editPickBtn");
    const meta = $("editMeta");

    if (pickBtn) {
      pickBtn.textContent = sel
        ? `${sel.date} • ${sel.dir} • ${sel.status === "OPEN" ? "OPEN" : fmtMoney(sel.pnl || 0)}`
        : "Tap to choose…";
    }
    if (meta) {
      meta.textContent = sel
        ? `Entry ${sel.entry.toFixed(2)} • SL ${sel.sl.toFixed(2)} • Lot ${sel.lot.toFixed(2)}`
        : "No trade selected.";
    }

    if (!sel) return;

    // Fill edit form
    $("eStatus").value = sel.status;
    setSegActive("eDirSeg","dir",sel.dir);
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
    const dir = getSegActive("eDirSeg","dir","LONG");

    const entry = toNum($("eEntry")?.value);
    const sl = toNum($("eSL")?.value);
    const lot = toNum($("eLot")?.value);
    const exit = toNum($("eExit")?.value);
    const pnlManual = toNum($("ePnl")?.value);

    if (entry == null || sl == null || lot == null) {
      $("eRisk").textContent = "$0.00";
      $("eR").textContent = "0.00R";
      $("eMAEUsd").textContent = "$0.00";
      $("eMFEUsd").textContent = "$0.00";
      return;
    }

    const risk = riskUsdApprox(entry, sl, lot);
    $("eRisk").textContent = fmtMoney(risk);

    let pnl = 0;
    if (status === "CLOSED") {
      if (exit != null) pnl = pnlFromExit(entry, exit, lot, dir);
      else if (pnlManual != null) pnl = pnlManual;
    }
    const r = rMultiple(pnl, risk);
    $("eR").textContent = `${r.toFixed(2)}R`;

    const maeP = toNum($("eMAE")?.value);
    const mfeP = toNum($("eMFE")?.value);
    $("eMAEUsd").textContent = fmtMoney(maeUsdFromPrice(entry, maeP, lot, dir));
    $("eMFEUsd").textContent = fmtMoney(mfeUsdFromPrice(entry, mfeP, lot, dir));
  }

  function saveEdit() {
    const sel = getTradeById(state.editSelectedId);
    if (!sel) { alert("Pick trade."); return; }

    const status = $("eStatus").value || "OPEN";
    const dir = getSegActive("eDirSeg","dir","LONG");
    const date = $("eDate").value || new Date().toISOString().slice(0, 10);
    const session = $("eSession").value || "";

    const entry = toNum($("eEntry").value);
    const sl = toNum($("eSL").value);
    const tp = toNum($("eTP").value);
    const lot = toNum($("eLot").value);
    const exit = toNum($("eExit").value);
    const pnlManual = toNum($("ePnl").value);

    if (entry == null || sl == null || lot == null) {
      alert("Entry, SL, Lot are required.");
      return;
    }

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
    renderDashboard();
    renderAllTrades();
    setActiveTab("all");
  }

  // -------- WIRING EVENTS (safe checks) --------
  function safeOn(id, evt, fn) {
    const el = $(id);
    if (el) el.addEventListener(evt, fn);
  }

  // New Trade
  $$("#dirSeg .segBtn").forEach(b => b.addEventListener("click", () => { setSegActive("dirSeg","dir",b.dataset.dir); updateNewRisk(); }));
  ["fEntry","fSL","fLot","fExit","fPnl"].forEach(id => safeOn(id,"input",updateNewRisk));
  safeOn("saveTradeBtn","click",saveNewTrade);

  // Checklist
  $$("#cDirSeg .segBtn").forEach(b => b.addEventListener("click", () => { setSegActive("cDirSeg","dir",b.dataset.dir); updateChecklistRisk(); }));
  ["cEntry","cSL","cLot"].forEach(id => safeOn(id,"input",updateChecklistRisk));
  safeOn("cAddTradeBtn","click",addFromChecklist);

  // Close
  safeOn("closePickBtn","click",() => pickTrade("CLOSE"));
  ["closeExit","closePnl","closeMAE","closeMFE"].forEach(id => safeOn(id,"input",updateClosePreview));
  safeOn("closeTradeBtn","click",closeTradeSave);

  // Review
  safeOn("reviewPickBtn","click",() => pickTrade("REVIEW"));
  safeOn("saveReviewBtn","click",saveReview);

  // Edit
  safeOn("editPickBtn","click",() => pickTrade("EDIT"));
  $$("#eDirSeg .segBtn").forEach(b => b.addEventListener("click", () => { setSegActive("eDirSeg","dir",b.dataset.dir); updateEditPreview(); }));
  ["eStatus","eEntry","eSL","eLot","eExit","ePnl","eMAE","eMFE"].forEach(id => safeOn(id,"input",updateEditPreview));
  safeOn("saveEditBtn","click",saveEdit);

  // Init defaults
  if ($("fDate") && !$("fDate").value) $("fDate").value = new Date().toISOString().slice(0, 10);
  if ($("cDate") && !$("cDate").value) $("cDate").value = new Date().toISOString().slice(0, 10);

  // Always set seg defaults if exist
  if ($("dirSeg")) setSegActive("dirSeg","dir","LONG");
  if ($("cDirSeg")) setSegActive("cDirSeg","dir","LONG");
  if ($("eDirSeg")) setSegActive("eDirSeg","dir","LONG");

  // First render
  renderDashboard();
  renderAllTrades();
  renderClose();
  renderReview();
  renderEdit();
  setActiveTab("dash");
});
