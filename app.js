document.addEventListener("DOMContentLoaded", () => {
  // Telegram WebApp init (safe if opened in browser)
  const tg = window.Telegram?.WebApp;
  tg?.ready();
  tg?.expand();

  const STORAGE_KEY = "adigafx_tj_v2";

  // ---------- i18n ----------
  const I18N = {
    EN: {
      tabDash: "Dashboard",
      tabCheck: "Checklist",
      tabNew: "New Trade",
      tabClose: "Close Trade",
      tabStats: "Stats",
      tabReview: "Review",
      tabSettings: "Settings",

      appDash: "AdigaFX • Dashboard",
      appCheck: "AdigaFX • Checklist",
      appNew: "AdigaFX • New Trade",
      appClose: "AdigaFX • Close Trade",
      appStats: "AdigaFX • Stats",
      appReview: "AdigaFX • Trade Review",
      appSettings: "Settings",

      sub: "XAUUSD only • Local storage",

      saved: "Saved!",
      needFields: "Please fill Entry, Stop Loss and Lot.",
      needClose: "Select an OPEN trade and provide Exit or PnL.",
      noTrades: "No trades yet. Add a demo trade or create a new trade.",
      noOpen: "No OPEN trades.",
      confirmReset: "Reset ALL local data? This cannot be undone.",
      importOk: "Import completed.",
      importBad: "Invalid JSON file.",
      pickTap: "Tap to choose…",
      modalReviewTitle: "Select trade",
      modalCloseTitle: "Select OPEN trade",
      modalSearch: "Search: date / LONG / SHORT / pnl…",
      mustCheckAll: "Please tick ALL checklist items to add the trade."
    },
    HE: {
      tabDash: "דשבורד",
      tabCheck: "צ׳ק ליסט",
      tabNew: "טרייד חדש",
      tabClose: "סגירת טרייד",
      tabStats: "סטטיסטיקות",
      tabReview: "ביקורת",
      tabSettings: "הגדרות",

      appDash: "AdigaFX • דשבורד",
      appCheck: "AdigaFX • צ׳ק ליסט",
      appNew: "AdigaFX • טרייד חדש",
      appClose: "AdigaFX • סגירת טרייד",
      appStats: "AdigaFX • סטטיסטיקות",
      appReview: "AdigaFX • ביקורת עסקה",
      appSettings: "הגדרות",

      sub: "XAUUSD בלבד • שמירה מקומית",

      saved: "נשמר!",
      needFields: "מלא Entry / SL / Lot.",
      needClose: "בחר עסקה פתוחה והכנס Exit או PnL.",
      noTrades: "אין עסקאות עדיין. הוסף דמו או צור עסקה חדשה.",
      noOpen: "אין עסקאות פתוחות.",
      confirmReset: "לאפס את כל הנתונים המקומיים? אי אפשר לבטל.",
      importOk: "הייבוא הושלם.",
      importBad: "קובץ JSON לא תקין.",
      pickTap: "לחץ לבחירה…",
      modalReviewTitle: "בחר עסקה",
      modalCloseTitle: "בחר עסקה פתוחה",
      modalSearch: "חיפוש: תאריך / לונג / שורט / רווח…",
      mustCheckAll: "סמן V על כל הצ׳ק ליסט ואז אפשר להוסיף."
    }
  };

  // ---------- helpers ----------
  const $ = (id) => document.getElementById(id);
  const $$ = (sel) => Array.from(document.querySelectorAll(sel));

  const toNum = (v) => {
    const n = parseFloat(String(v).replace(",", "."));
    return Number.isFinite(n) ? n : null;
  };

  const fmtMoney = (n) => {
    const sign = n >= 0 ? "" : "-";
    return `${sign}$${Math.abs(n).toFixed(2)}`;
  };

  const setDefaultDate = (id) => {
    const el = $(id);
    if (el) el.value = new Date().toISOString().slice(0, 10);
  };

  // XAUUSD model: 1 lot = 100oz
  const riskUsdApprox = (entry, sl, lot) => Math.abs(entry - sl) * lot * 100;

  const pnlFromExit = (entry, exit, lot, dir) => {
    const delta = (exit - entry) * lot * 100; // LONG positive if exit>entry
    return dir === "SHORT" ? -delta : delta;
  };

  const rMultiple = (pnl, riskUsd) => (riskUsd && riskUsd > 0 ? pnl / riskUsd : 0);

  const isThisMonth = (dateStr) => {
    const d = new Date(dateStr);
    const now = new Date();
    return d.getFullYear() === now.getFullYear() && d.getMonth() === now.getMonth();
  };

  const uid = () =>
    (crypto?.randomUUID ? crypto.randomUUID() : String(Date.now()) + Math.random().toString(16).slice(2));

  // ---------- state ----------
  const defaultState = {
    lang: "EN",
    trades: [], // each: {id, symbol, dir, date, session, entry, sl, tp?, lot, status OPEN/CLOSED, exit?, pnl?, r, strategy?, notes?, review{plan,mistake,notes}}
    statsFilter: "ALL", // ALL or MONTH
    reviewSelectedId: "",
    closeSelectedId: ""
  };

  function loadState() {
    try {
      const s = JSON.parse(localStorage.getItem(STORAGE_KEY));
      return { ...defaultState, ...(s || {}) };
    } catch {
      return { ...defaultState };
    }
  }

  let state = loadState();

  function saveState() {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  }

  // ---------- language ----------
  function applyLang() {
    const t = I18N[state.lang];

    $("langBtn").textContent = state.lang;
    $("appSubtitle").textContent = t.sub;

    $("tabDash").textContent = t.tabDash;
    $("tabCheck").textContent = t.tabCheck;
    $("tabNew").textContent = t.tabNew;
    $("tabClose").textContent = t.tabClose;
    $("tabStats").textContent = t.tabStats;
    $("tabReview").textContent = t.tabReview;
    $("tabSettings").textContent = t.tabSettings;

    $("reviewPickBtn").textContent = t.pickTap;
    $("closePickBtn").textContent = t.pickTap;
    $("tradeSearch").placeholder = t.modalSearch;

    document.documentElement.dir = state.lang === "HE" ? "rtl" : "ltr";
  }

  // ---------- routing ----------
  function setActiveTab(route) {
    $$(".tab").forEach((b) => b.classList.toggle("active", b.dataset.route === route));
    $$(".screen").forEach((s) => s.classList.toggle("active", s.id === `screen-${route}`));

    const t = I18N[state.lang];
    if (route === "dash") $("appTitle").textContent = t.appDash;
    if (route === "check") $("appTitle").textContent = t.appCheck;
    if (route === "new") $("appTitle").textContent = t.appNew;
    if (route === "close") $("appTitle").textContent = t.appClose;
    if (route === "stats") $("appTitle").textContent = t.appStats;
    if (route === "review") $("appTitle").textContent = t.appReview;
    if (route === "settings") $("appTitle").textContent = t.appSettings;

    // render on entry
    if (route === "dash") renderDashboard();
    if (route === "stats") renderStats();
    if (route === "review") renderReviewUI();
    if (route === "close") renderCloseUI();
    if (route === "check") renderChecklistUI();
  }

  // ---------- segment controls ----------
  function setSegActive(segId, key, val) {
    $$("#" + segId + " .segBtn").forEach((b) => b.classList.toggle("active", b.dataset[key] === val));
  }

  function getSegActive(segId, key, fallback) {
    const b = $$("#" + segId + " .segBtn").find((x) => x.classList.contains("active"));
    return b ? b.dataset[key] : fallback;
  }

  // ---------- canvas drawing (simple) ----------
  function clearCanvas(ctx, w, h) {
    ctx.clearRect(0, 0, w, h);
  }

  function drawAxes(ctx, w, h) {
    ctx.strokeStyle = "rgba(255,255,255,.10)";
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(40, 10);
    ctx.lineTo(40, h - 30);
    ctx.lineTo(w - 10, h - 30);
    ctx.stroke();
  }

  function drawEquityCurve(closedTrades) {
    const c = $("equityCanvas");
    const ctx = c.getContext("2d");
    const w = c.width,
      h = c.height;

    clearCanvas(ctx, w, h);
    drawAxes(ctx, w, h);

    const trades = closedTrades.slice().sort((a, b) => a.date.localeCompare(b.date));
    if (!trades.length) return;

    let eq = 0;
    const points = trades.map((tr, i) => {
      eq += tr.pnl || 0;
      return { x: i, y: eq };
    });

    const minY = Math.min(...points.map((p) => p.y), 0);
    const maxY = Math.max(...points.map((p) => p.y), 0);

    const padLeft = 40,
      padRight = 10,
      padTop = 10,
      padBottom = 30;
    const plotW = w - padLeft - padRight;
    const plotH = h - padTop - padBottom;

    const sx = (x) => (points.length === 1 ? padLeft + plotW / 2 : padLeft + (x / (points.length - 1)) * plotW);
    const sy = (y) => (maxY === minY ? padTop + plotH / 2 : padTop + (1 - (y - minY) / (maxY - minY)) * plotH);

    // zero line
    ctx.strokeStyle = "rgba(255,255,255,.10)";
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(padLeft, sy(0));
    ctx.lineTo(w - padRight, sy(0));
    ctx.stroke();

    ctx.strokeStyle = "rgba(45,212,191,.95)";
    ctx.lineWidth = 2;
    ctx.beginPath();
    points.forEach((p, i) => {
      const x = sx(p.x),
        y = sy(p.y);
      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    });
    ctx.stroke();

    const last = points[points.length - 1];
    ctx.fillStyle = "rgba(45,212,191,.95)";
    ctx.beginPath();
    ctx.arc(sx(last.x), sy(last.y), 4, 0, Math.PI * 2);
    ctx.fill();
  }

  function drawRDistribution(closedTrades) {
    const c = $("rCanvas");
    const ctx = c.getContext("2d");
    const w = c.width,
      h = c.height;

    clearCanvas(ctx, w, h);
    drawAxes(ctx, w, h);

    const rs = closedTrades.map((t) => t.r).filter((r) => Number.isFinite(r));
    if (!rs.length) return;

    // bins: <-2, [-2,-1), [-1,0), [0,1), [1,2), >=2
    const bins = [0, 0, 0, 0, 0, 0];
    rs.forEach((r) => {
      if (r < -2) bins[0]++;
      else if (r < -1) bins[1]++;
      else if (r < 0) bins[2]++;
      else if (r < 1) bins[3]++;
      else if (r < 2) bins[4]++;
      else bins[5]++;
    });

    const maxB = Math.max(...bins, 1);
    const padLeft = 40,
      padRight = 10,
      padTop = 10,
      padBottom = 30;
    const plotW = w - padLeft - padRight;
    const plotH = h - padTop - padBottom;

    const barW = plotW / bins.length;

    ctx.fillStyle = "rgba(59,130,246,.65)";
    bins.forEach((b, i) => {
      const bh = (b / maxB) * plotH;
      const x = padLeft + i * barW + 8;
      const y = padTop + (plotH - bh);
      ctx.fillRect(x, y, barW - 16, bh);
    });
  }

  // ---------- derived ----------
  const getClosedTradesAll = () => state.trades.filter((t) => t.status === "CLOSED");
  const getOpenTradesAll = () => state.trades.filter((t) => t.status === "OPEN");

  function calcDashboardClosed(closedTrades) {
    const totalPnl = closedTrades.reduce((s, tr) => s + (tr.pnl || 0), 0);
    const wins = closedTrades.filter((tr) => (tr.r || 0) > 0).length;
    const winRate = closedTrades.length ? (wins / closedTrades.length) * 100 : 0;
    const avgR = closedTrades.length ? closedTrades.reduce((s, tr) => s + (tr.r || 0), 0) / closedTrades.length : 0;
    return { totalPnl, winRate, avgR };
  }

  // ---------- rendering: list ----------
  function renderTradesList() {
    const t = I18N[state.lang];
    const list = $("tradesList");
    list.innerHTML = "";

    if (!state.trades.length) {
      list.innerHTML = `<div class="item"><div class="label">${t.noTrades}</div></div>`;
      return;
    }

    state.trades
      .slice()
      .reverse()
      .forEach((tr) => {
        const statusBadge = tr.status === "OPEN" ? `<span class="badge soft">OPEN</span>` : `<span class="badge soft">CLOSED</span>`;
        const cls = tr.pnl > 0 ? "green" : tr.pnl < 0 ? "red" : "";
        const pnlText = tr.status === "OPEN" ? "—" : fmtMoney(tr.pnl || 0);
        const rText = tr.status === "OPEN" ? "—" : `${(tr.r || 0).toFixed(2)}R`;

        const el = document.createElement("div");
        el.className = "item";
        el.innerHTML = `
          <div class="itemTop">
            <div>XAUUSD • ${tr.dir} ${statusBadge}</div>
            <div class="badge ${cls}">${pnlText} / ${rText}</div>
          </div>
          <div class="label">
            ${tr.date}${tr.session ? " • " + tr.session : ""} • Entry ${tr.entry.toFixed(2)} • SL ${tr.sl.toFixed(2)} • Lot ${tr.lot.toFixed(2)}
          </div>
        `;

        // quick actions
        const actions = document.createElement("div");
        actions.className = "row2";
        actions.style.marginTop = "8px";

        const btnReview = document.createElement("button");
        btnReview.className = "btn ghost";
        btnReview.textContent = "🧠 Review";
        btnReview.addEventListener("click", () => {
          state.reviewSelectedId = tr.id;
          saveState();
          setActiveTab("review");
        });

        const btnClose = document.createElement("button");
        btnClose.className = "btn ghost";
        btnClose.textContent = tr.status === "OPEN" ? "🏁 Close" : "📊 Stats";
        btnClose.addEventListener("click", () => {
          if (tr.status === "OPEN") {
            state.closeSelectedId = tr.id;
            saveState();
            setActiveTab("close");
          } else {
            setActiveTab("stats");
          }
        });

        actions.appendChild(btnReview);
        actions.appendChild(btnClose);
        el.appendChild(actions);

        list.appendChild(el);
      });
  }

  // ---------- rendering: dashboard ----------
  function renderDashboard() {
    const closed = getClosedTradesAll();
    const open = getOpenTradesAll();
    const d = calcDashboardClosed(closed);

    $("totalPnl").textContent = fmtMoney(d.totalPnl);
    $("winRate").textContent = `${d.winRate.toFixed(0)}%`;
    $("avgR").textContent = `${d.avgR.toFixed(2)}R`;

    $("openCountBadge").textContent = `OPEN: ${open.length}`;
    $("closedCountBadge").textContent = `CLOSED: ${closed.length}`;

    drawEquityCurve(closed);
    renderTradesList();
  }

  // ---------- NEW TRADE ----------
  function resetNewForm() {
    setSegActive("dirSeg", "dir", "LONG");
    setDefaultDate("fDate");
    $("fSession").value = "";
    ["fEntry", "fSL", "fTP", "fLot", "fExit", "fPnl", "fStrategy", "fNotes"].forEach((id) => ($(id).value = ""));
    $("riskUsd").textContent = "$0.00";
    $("rMultiple").textContent = "0.00R";
  }

  function updateNewLiveRisk() {
    const entry = toNum($("fEntry").value);
    const sl = toNum($("fSL").value);
    const lot = toNum($("fLot").value);
    const exit = toNum($("fExit").value);
    const pnlManual = toNum($("fPnl").value);
    const dir = getSegActive("dirSeg", "dir", "LONG");

    if (entry == null || sl == null || lot == null) {
      $("riskUsd").textContent = "$0.00";
      $("rMultiple").textContent = "0.00R";
      return;
    }

    const risk = riskUsdApprox(entry, sl, lot);
    $("riskUsd").textContent = fmtMoney(risk);

    let pnl = null;
    if (exit != null) pnl = pnlFromExit(entry, exit, lot, dir);
    else if (pnlManual != null) pnl = pnlManual;

    const r = pnl == null ? 0 : rMultiple(pnl, risk);
    $("rMultiple").textContent = `${r.toFixed(2)}R`;
  }

  function addTradeCommon(payload) {
    const trade = {
      id: uid(),
      symbol: "XAUUSD",
      review: { plan: "YES", mistake: "", notes: "" },
      ...payload
    };
    state.trades.push(trade);

    if (!state.reviewSelectedId) state.reviewSelectedId = trade.id;
    if (!state.closeSelectedId && trade.status === "OPEN") state.closeSelectedId = trade.id;

    saveState();
  }

  function saveNewTrade() {
    const t = I18N[state.lang];

    const dir = getSegActive("dirSeg", "dir", "LONG");
    const date = $("fDate").value || new Date().toISOString().slice(0, 10);
    const session = $("fSession").value || "";

    const entry = toNum($("fEntry").value);
    const sl = toNum($("fSL").value);
    const tp = toNum($("fTP").value);
    const lot = toNum($("fLot").value);

    const exit = toNum($("fExit").value);
    const pnlManual = toNum($("fPnl").value);

    if (entry == null || sl == null || lot == null) {
      alert(t.needFields);
      return;
    }

    const risk = riskUsdApprox(entry, sl, lot);

    let status = "OPEN";
    let pnl = 0;
    let r = 0;

    if (exit != null || pnlManual != null) {
      status = "CLOSED";
      pnl = exit != null ? pnlFromExit(entry, exit, lot, dir) : pnlManual;
      r = rMultiple(pnl, risk);
    }

    addTradeCommon({
      dir,
      date,
      session,
      entry,
      sl,
      tp: tp == null ? null : tp,
      lot,
      status,
      exit: exit == null ? null : exit,
      pnl: status === "CLOSED" ? pnl : 0,
      riskUsd: risk,
      r: status === "CLOSED" ? r : 0,
      strategy: $("fStrategy").value || "",
      notes: $("fNotes").value || ""
    });

    alert(t.saved);

    // Reset form (and go to dashboard)
    resetNewForm();
    renderDashboard();
    setActiveTab("dash");
  }

  // ---------- CHECKLIST ----------
  function resetChecklist() {
    setSegActive("cDirSeg", "dir", "LONG");
    setDefaultDate("cDate");
    $("cSession").value = "";
    ["cEntry", "cSL", "cTP", "cLot", "cNotes"].forEach((id) => ($(id).value = ""));
    $$(".cBox").forEach((b) => (b.checked = false));
    $("cRiskUsd").textContent = "$0.00";
    $("cREst").textContent = "1.00R";
  }

  function updateChecklistRisk() {
    const entry = toNum($("cEntry").value);
    const sl = toNum($("cSL").value);
    const lot = toNum($("cLot").value);

    if (entry == null || sl == null || lot == null) {
      $("cRiskUsd").textContent = "$0.00";
      $("cREst").textContent = "1.00R";
      return;
    }
    const risk = riskUsdApprox(entry, sl, lot);
    $("cRiskUsd").textContent = fmtMoney(risk);
    $("cREst").textContent = "1.00R";
  }

  function renderChecklistUI() {
    // ensure defaults
    if (!$("cDate").value) setDefaultDate("cDate");
    updateChecklistRisk();
  }

  function addFromChecklist() {
    const t = I18N[state.lang];
    const dir = getSegActive("cDirSeg", "dir", "LONG");
    const date = $("cDate").value || new Date().toISOString().slice(0, 10);
    const session = $("cSession").value || "";

    const entry = toNum($("cEntry").value);
    const sl = toNum($("cSL").value);
    const tp = toNum($("cTP").value);
    const lot = toNum($("cLot").value);

    if (entry == null || sl == null || lot == null) {
      alert(t.needFields);
      return;
    }

    const allChecked = $$(".cBox").every((b) => b.checked);
    if (!allChecked) {
      alert(t.mustCheckAll);
      return;
    }

    const risk = riskUsdApprox(entry, sl, lot);

    addTradeCommon({
      dir,
      date,
      session,
      entry,
      sl,
      tp: tp == null ? null : tp,
      lot,
      status: "OPEN",
      exit: null,
      pnl: 0,
      riskUsd: risk,
      r: 0,
      strategy: "Checklist",
      notes: $("cNotes").value || ""
    });

    alert(t.saved);
    resetChecklist();
    renderDashboard();
    setActiveTab("dash");
  }

  // ---------- MODAL PICKER (shared) ----------
  const modalBack = $("tradeModalBack");
  const modal = $("tradeModal");
  const modalTitle = $("tradeModalTitle");
  const modalList = $("tradeModalList");
  const modalSearch = $("tradeSearch");

  let modalMode = "REVIEW"; // "REVIEW" or "CLOSE"
  let modalItems = []; // {id, textTop, textSub, searchable}

  function openModal(mode) {
    modalMode = mode;
    const t = I18N[state.lang];

    modalTitle.textContent = mode === "CLOSE" ? t.modalCloseTitle : t.modalReviewTitle;
    modalSearch.value = "";
    rebuildModalItems();
    renderModalList("");

    modalBack.classList.add("open");
    modal.classList.add("open");
  }

  function closeModal() {
    modalBack.classList.remove("open");
    modal.classList.remove("open");
  }

  function rebuildModalItems() {
    const trades =
      modalMode === "CLOSE"
        ? state.trades.filter((t) => t.status === "OPEN")
        : state.trades.slice();

    // newest first
    const list = trades.slice().reverse();

    modalItems = list.map((tr) => {
      const pnlTxt = tr.status === "OPEN" ? "OPEN" : fmtMoney(tr.pnl || 0);
      const rTxt = tr.status === "OPEN" ? "" : ` • ${(tr.r || 0).toFixed(2)}R`;
      const top = `${tr.date} • ${tr.dir} • ${pnlTxt}${rTxt}`;
      const sub = `Entry ${tr.entry.toFixed(2)} • SL ${tr.sl.toFixed(2)} • Lot ${tr.lot.toFixed(2)}${tr.session ? " • " + tr.session : ""}`;
      const searchable = (top + " " + sub).toLowerCase();
      return { id: tr.id, textTop: top, textSub: sub, searchable };
    });
  }

  function renderModalList(q) {
    const query = (q || "").trim().toLowerCase();
    const filtered = query ? modalItems.filter((x) => x.searchable.includes(query)) : modalItems;

    modalList.innerHTML = "";

    if (!filtered.length) {
      const t = I18N[state.lang];
      modalList.innerHTML = `<div class="item"><div class="label">${modalMode === "CLOSE" ? t.noOpen : t.noTrades}</div></div>`;
      return;
    }

    filtered.forEach((it) => {
      const btn = document.createElement("button");
      btn.type = "button";
      btn.className = "pickItem";
      btn.innerHTML = `
        <div class="pickItemMain">
          <div class="pickItemTop">${escapeHtml(it.textTop)}</div>
          <div class="pickItemSub">${escapeHtml(it.textSub)}</div>
        </div>
        <span class="badge soft">Select</span>
      `;

      // IMPORTANT: make click selectable (works on iPhone Telegram)
      btn.addEventListener("click", (e) => {
        e.preventDefault();
        e.stopPropagation();

        if (modalMode === "REVIEW") {
          state.reviewSelectedId = it.id;
          saveState();
          renderReviewUI(true);
        } else {
          state.closeSelectedId = it.id;
          saveState();
          renderCloseUI(true);
        }

        closeModal();
      });

      modalList.appendChild(btn);
    });
  }

  function escapeHtml(s) {
    return String(s)
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&#039;");
  }

  // ---------- REVIEW ----------
  function getTradeById(id) {
    return state.trades.find((t) => t.id === id) || null;
  }

  function setPlanSeg(val) {
    setSegActive("planSeg", "plan", val);
  }

  function getPlanSeg() {
    return getSegActive("planSeg", "plan", "YES");
  }

  function renderReviewUI(preserveInputs = false) {
    const t = I18N[state.lang];

    const trades = state.trades.slice().reverse(); // newest first
    const selected = getTradeById(state.reviewSelectedId);

    // If no selected, pick last trade
    if (!selected && trades.length) {
      state.reviewSelectedId = trades[0].id;
      saveState();
    }

    const sel = getTradeById(state.reviewSelectedId);

    $("reviewPickBtn").textContent = sel
      ? `${sel.date} • ${sel.dir} • ${sel.status === "OPEN" ? "OPEN" : fmtMoney(sel.pnl || 0)}`
      : t.pickTap;

    $("reviewMeta").textContent = sel
      ? `XAUUSD • ${sel.dir} • ${sel.date}${sel.session ? " • " + sel.session : ""} • Entry ${sel.entry.toFixed(
          2
        )} • SL ${sel.sl.toFixed(2)} • Lot ${sel.lot.toFixed(2)}`
      : "No trade selected.";

    if (!sel) return;

    // load values into UI
    if (!preserveInputs) {
      const rev = sel.review || { plan: "YES", mistake: "", notes: "" };
      setPlanSeg(rev.plan || "YES");
      $("mistakeType").value = rev.mistake || "";
      $("reviewNotes").value = rev.notes || "";
    }
  }

  function clearReviewForm() {
    setPlanSeg("YES");
    $("mistakeType").value = "";
    $("reviewNotes").value = "";
  }

  function saveReview() {
    const t = I18N[state.lang];
    const sel = getTradeById(state.reviewSelectedId);
    if (!sel) return;

    sel.review = {
      plan: getPlanSeg(),
      mistake: $("mistakeType").value || "",
      notes: $("reviewNotes").value || ""
    };

    saveState();
    alert(t.saved);

    // User asked: after saving, clear and return to default empty state
    clearReviewForm();
    $("reviewSelectedId"); // no-op
    $("reviewPickBtn").textContent = t.pickTap;
    $("reviewMeta").textContent = "No trade selected.";
    state.reviewSelectedId = ""; // unselect
    saveState();
  }

  // ---------- CLOSE TRADE ----------
  function renderCloseUI(preserveInputs = false) {
    const t = I18N[state.lang];

    const openTrades = getOpenTradesAll().slice().reverse();
    let sel = getTradeById(state.closeSelectedId);

    // ensure selected is OPEN
    if (!sel || sel.status !== "OPEN") {
      sel = openTrades.length ? openTrades[0] : null;
      state.closeSelectedId = sel ? sel.id : "";
      saveState();
    }

    $("closePickBtn").textContent = sel
      ? `${sel.date} • ${sel.dir} • OPEN`
      : t.pickTap;

    $("closeMeta").textContent = sel
      ? `XAUUSD • ${sel.dir} • ${sel.date}${sel.session ? " • " + sel.session : ""} • Entry ${sel.entry.toFixed(
          2
        )} • SL ${sel.sl.toFixed(2)} • Lot ${sel.lot.toFixed(2)}`
      : t.noOpen;

    if (!sel) {
      $("closeRisk").textContent = "$0.00";
      $("closeR").textContent = "0.00R";
      return;
    }

    $("closeRisk").textContent = fmtMoney(sel.riskUsd || riskUsdApprox(sel.entry, sel.sl, sel.lot));

    if (!preserveInputs) {
      $("closeExit").value = "";
      $("closePnl").value = "";
      $("closeR").textContent = "0.00R";
    } else {
      updateClosePreview();
    }
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
  }

  function resetCloseForm() {
    $("closeExit").value = "";
    $("closePnl").value = "";
    $("closeR").textContent = "0.00R";
  }

  function closeTradeSave() {
    const t = I18N[state.lang];
    const sel = getTradeById(state.closeSelectedId);
    if (!sel || sel.status !== "OPEN") {
      alert(t.needClose);
      return;
    }

    const exit = toNum($("closeExit").value);
    const pnlManual = toNum($("closePnl").value);

    if (exit == null && pnlManual == null) {
      alert(t.needClose);
      return;
    }

    const risk = sel.riskUsd || riskUsdApprox(sel.entry, sel.sl, sel.lot);
    const pnl = exit != null ? pnlFromExit(sel.entry, exit, sel.lot, sel.dir) : pnlManual;
    const r = rMultiple(pnl, risk);

    sel.status = "CLOSED";
    sel.exit = exit == null ? null : exit;
    sel.pnl = pnl;
    sel.r = r;
    sel.riskUsd = risk;

    saveState();
    alert(t.saved);

    // After close: reset fields and go dashboard
    resetCloseForm();
    renderDashboard();
    setActiveTab("dash");
  }

  // ---------- STATS ----------
  function filteredClosedTrades() {
    const closed = getClosedTradesAll();
    if (state.statsFilter === "MONTH") return closed.filter((t) => isThisMonth(t.date));
    return closed;
  }

  function renderMistakes(closedTrades) {
    const box = $("mistakeList");
    box.innerHTML = "";

    const counts = new Map();
    closedTrades.forEach((tr) => {
      const m = tr.review?.mistake || "";
      if (!m) return;
      counts.set(m, (counts.get(m) || 0) + 1);
    });

    const arr = Array.from(counts.entries()).sort((a, b) => b[1] - a[1]);

    if (!arr.length) {
      box.innerHTML = `<div class="mini">No mistake data yet.</div>`;
      return;
    }

    arr.forEach(([name, count]) => {
      const row = document.createElement("div");
      row.className = "mRow";
      row.innerHTML = `<div>${escapeHtml(name)}</div><div class="badge soft">${count}</div>`;
      box.appendChild(row);
    });
  }

  function renderStats() {
    const closed = filteredClosedTrades();

    const n = closed.length;
    const avgR = n ? closed.reduce((s, t) => s + (t.r || 0), 0) / n : 0;
    const best = n ? Math.max(...closed.map((t) => t.r || 0)) : 0;
    const worst = n ? Math.min(...closed.map((t) => t.r || 0)) : 0;

    $("sTrades").textContent = String(n);
    $("sExp").textContent = `${avgR.toFixed(2)}R`;
    $("sBest").textContent = `${best.toFixed(2)}R`;
    $("sWorst").textContent = `${worst.toFixed(2)}R`;

    drawRDistribution(closed);
    renderMistakes(closed);
  }

  // ---------- SETTINGS: export/import/reset ----------
  function exportJSON() {
    const data = JSON.stringify(state, null, 2);
    const blob = new Blob([data], { type: "application/json" });
    const url = URL.createObjectURL(blob);

    const a = document.createElement("a");
    a.href = url;
    a.download = "adigafx_trade_journal.json";
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  }

  function importJSONFile(file) {
    const t = I18N[state.lang];
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const obj = JSON.parse(String(reader.result || ""));
        // minimal validation
        if (!obj || typeof obj !== "object" || !Array.isArray(obj.trades)) throw new Error("bad");
        state = { ...defaultState, ...obj };
        saveState();
        applyLang();
        renderDashboard();
        renderStats();
        renderReviewUI();
        renderCloseUI();
        alert(t.importOk);
      } catch {
        alert(t.importBad);
      }
    };
    reader.readAsText(file);
  }

  function resetAll() {
    const t = I18N[state.lang];
    if (!confirm(t.confirmReset)) return;
    state = { ...defaultState, lang: state.lang }; // keep language
    saveState();
    resetNewForm();
    resetChecklist();
    resetCloseForm();
    clearReviewForm();
    renderDashboard();
    renderStats();
    renderReviewUI();
    renderCloseUI();
    setActiveTab("dash");
  }

  // ---------- wiring ----------
  // tabs
  $$(".tab").forEach((b) => {
    b.addEventListener("click", () => setActiveTab(b.dataset.route));
  });

  // language
  $("langBtn").addEventListener("click", () => {
    state.lang = state.lang === "EN" ? "HE" : "EN";
    saveState();
    applyLang();
    // rerender current tab
    const active = $$(".tab").find((x) => x.classList.contains("active"))?.dataset.route || "dash";
    setActiveTab(active);
  });

  // quick nav buttons
  $("goCheckBtn").addEventListener("click", () => setActiveTab("check"));
  $("goCloseBtn").addEventListener("click", () => setActiveTab("close"));

  // add demo
  $("addDemoBtn").addEventListener("click", () => {
    addTradeCommon({
      dir: "LONG",
      date: new Date().toISOString().slice(0, 10),
      session: "NY",
      entry: 2350.0,
      sl: 2345.0,
      tp: 2365.0,
      lot: 0.1,
      status: "CLOSED",
      exit: 2360.0,
      pnl: pnlFromExit(2350.0, 2360.0, 0.1, "LONG"),
      riskUsd: riskUsdApprox(2350.0, 2345.0, 0.1),
      r: rMultiple(pnlFromExit(2350.0, 2360.0, 0.1, "LONG"), riskUsdApprox(2350.0, 2345.0, 0.1)),
      strategy: "Demo",
      notes: "Demo trade"
    });
    saveState();
    renderDashboard();
  });

  // NEW: seg buttons
  $$("#dirSeg .segBtn").forEach((b) => b.addEventListener("click", () => {
    setSegActive("dirSeg", "dir", b.dataset.dir);
    updateNewLiveRisk();
  }));

  // NEW: live inputs
  ["fEntry", "fSL", "fLot", "fExit", "fPnl"].forEach((id) => {
    $(id).addEventListener("input", updateNewLiveRisk);
  });

  $("saveTradeBtn").addEventListener("click", saveNewTrade);
  $("resetFormBtn").addEventListener("click", () => {
    resetNewForm();
    updateNewLiveRisk();
  });

  // CHECKLIST: seg buttons
  $$("#cDirSeg .segBtn").forEach((b) => b.addEventListener("click", () => {
    setSegActive("cDirSeg", "dir", b.dataset.dir);
    updateChecklistRisk();
  }));

  ["cEntry", "cSL", "cLot"].forEach((id) => $(id).addEventListener("input", updateChecklistRisk));

  $("cAddTradeBtn").addEventListener("click", addFromChecklist);
  $("cResetBtn").addEventListener("click", () => {
    resetChecklist();
    updateChecklistRisk();
  });

  // REVIEW: plan seg
  $$("#planSeg .segBtn").forEach((b) =>
    b.addEventListener("click", () => setPlanSeg(b.dataset.plan))
  );

  $("pickLastBtn").addEventListener("click", () => {
    const last = state.trades.slice().reverse()[0];
    if (!last) return;
    state.reviewSelectedId = last.id;
    saveState();
    renderReviewUI();
  });

  $("saveReviewBtn").addEventListener("click", saveReview);
  $("clearReviewBtn").addEventListener("click", () => {
    clearReviewForm();
    // keep selected but clear form
  });

  // CLOSE: preview
  ["closeExit", "closePnl"].forEach((id) => $(id).addEventListener("input", updateClosePreview));
  $("closeTradeBtn").addEventListener("click", closeTradeSave);
  $("closeResetBtn").addEventListener("click", resetCloseForm);

  // STATS filter seg
  $$("#statsFilterSeg .segBtn").forEach((b) =>
    b.addEventListener("click", () => {
      $$("#statsFilterSeg .segBtn").forEach((x) => x.classList.remove("active"));
      b.classList.add("active");
      state.statsFilter = b.dataset.filter;
      saveState();
      renderStats();
    })
  );

  // SETTINGS
  $("exportBtn").addEventListener("click", exportJSON);
  $("importFile").addEventListener("change", (e) => {
    const file = e.target.files?.[0];
    e.target.value = ""; // allow re-import same file
    if (!file) return;
    importJSONFile(file);
  });
  $("resetAllBtn").addEventListener("click", resetAll);

  // MODAL: open buttons
  $("reviewPickBtn").addEventListener("click", () => openModal("REVIEW"));
  $("closePickBtn").addEventListener("click", () => openModal("CLOSE"));

  // MODAL: close
  $("tradeModalClose").addEventListener("click", closeModal);
  modalBack.addEventListener("click", closeModal);

  // MODAL: search
  modalSearch.addEventListener("input", () => renderModalList(modalSearch.value));

  // prevent weird touch behavior inside modal (iOS Telegram)
  modal.addEventListener("touchstart", (e) => e.stopPropagation(), { passive: true });
  modal.addEventListener("click", (e) => e.stopPropagation());

  // ---------- init defaults ----------
  applyLang();

  // Set default dates
  setDefaultDate("fDate");
  setDefaultDate("cDate");

  // Default segments
  setSegActive("dirSeg", "dir", "LONG");
  setSegActive("cDirSeg", "dir", "LONG");
  setSegActive("planSeg", "plan", "YES");

  // initial renders
  resetNewForm();
  resetChecklist();
  renderDashboard();
  renderStats();
  renderReviewUI();
  renderCloseUI();

  // initial route
  setActiveTab("dash");
});
