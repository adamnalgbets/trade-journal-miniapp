document.addEventListener("DOMContentLoaded", () => {
  const tg = window.Telegram?.WebApp;
  tg?.ready();
  tg?.expand();

  const STORAGE_KEY = "adigafx_tj_v2";

  // ---------- i18n (minimal but enough) ----------
  const I18N = {
    EN: {
      tabDash:"Dashboard", tabCheck:"Checklist", tabNew:"New Trade", tabClose:"Close Trade", tabStats:"Stats", tabReview:"Review", tabSettings:"Settings",
      appDash:"AdigaFX • Dashboard", appCheck:"AdigaFX • Checklist", appNew:"AdigaFX • New Trade", appClose:"AdigaFX • Close Trade", appStats:"AdigaFX • Stats", appReview:"AdigaFX • Trade Review", appSettings:"Settings",
      sub:"XAUUSD only • Local storage",

      saved:"Saved!",
      needFields:"Please fill Entry, Stop Loss and Lot.",
      needClose:"Select an OPEN trade and provide Exit or PnL.",
      noTrades:"No trades yet.",
      noOpen:"No OPEN trades.",
      confirmReset:"Reset ALL local data? This cannot be undone.",
      importOk:"Import completed.",
      importBad:"Invalid JSON file.",

      pickTap:"Tap to choose…",
      modalReviewTitle:"Select trade",
      modalCloseTitle:"Select OPEN trade",
      modalSearch:"Search: date / LONG / SHORT / pnl…"
    },
    HE: {
      tabDash:"דשבורד", tabCheck:"צ'ק ליסט", tabNew:"טרייד חדש", tabClose:"סגירת טרייד", tabStats:"סטטיסטיקות", tabReview:"ביקורת", tabSettings:"הגדרות",
      appDash:"AdigaFX • דשבורד", appCheck:"AdigaFX • צ'ק ליסט", appNew:"AdigaFX • טרייד חדש", appClose:"AdigaFX • סגירת טרייד", appStats:"AdigaFX • סטטיסטיקות", appReview:"AdigaFX • ביקורת עסקה", appSettings:"הגדרות",
      sub:"XAUUSD בלבד • שמירה מקומית",

      saved:"נשמר!",
      needFields:"מלא Entry/SL/Lot.",
      needClose:"בחר עסקה פתוחה והכנס Exit או PnL.",
      noTrades:"אין עסקאות עדיין.",
      noOpen:"אין עסקאות פתוחות.",
      confirmReset:"לאפס את כל הנתונים המקומיים? אי אפשר לבטל.",
      importOk:"הייבוא הושלם.",
      importBad:"קובץ JSON לא תקין.",

      pickTap:"לחץ לבחירה…",
      modalReviewTitle:"בחר עסקה",
      modalCloseTitle:"בחר עסקה פתוחה",
      modalSearch:"חיפוש: תאריך / לונג / שורט / רווח…"
    }
  };

  // ---------- helpers ----------
  const $ = (id) => document.getElementById(id);
  const $$ = (sel) => Array.from(document.querySelectorAll(sel));

  const toNum = (v) => {
    const n = parseFloat(v);
    return Number.isFinite(n) ? n : null;
  };

  function fmtMoney(n) {
    const sign = n >= 0 ? "" : "-";
    return `${sign}$${Math.abs(n).toFixed(2)}`;
  }

  function riskUsdApprox(entry, sl, lot) {
    return Math.abs(entry - sl) * lot * 100;
  }

  function pnlFromExit(entry, exit, lot, dir) {
    const delta = (exit - entry) * lot * 100;
    return dir === "SHORT" ? -delta : delta;
  }

  function rMultiple(pnl, riskUsd) {
    if (!riskUsd || riskUsd <= 0) return 0;
    return pnl / riskUsd;
  }

  function isThisMonth(dateStr) {
    const d = new Date(dateStr);
    const now = new Date();
    return d.getFullYear() === now.getFullYear() && d.getMonth() === now.getMonth();
  }

  // ---------- state ----------
  const defaultState = {
    lang: "EN",
    trades: [], // {id,date,session,symbol,dir,entry,sl,tp,lot,status,exit,pnl,riskUsd,r,strategy,notes,review}
    statsFilter: "ALL",
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

  // ---------- language apply ----------
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

    document.documentElement.dir = (state.lang === "HE") ? "rtl" : "ltr";
  }

  // ---------- router ----------
  function setActiveTab(route) {
    $$(".tab").forEach(t => t.classList.toggle("active", t.dataset.route === route));
    $$(".screen").forEach(s => s.classList.toggle("active", s.id === `screen-${route}`));

    const t = I18N[state.lang];
    if (route === "dash") $("appTitle").textContent = t.appDash;
    if (route === "check") $("appTitle").textContent = t.appCheck;
    if (route === "new") $("appTitle").textContent = t.appNew;
    if (route === "close") $("appTitle").textContent = t.appClose;
    if (route === "stats") $("appTitle").textContent = t.appStats;
    if (route === "review") $("appTitle").textContent = t.appReview;
    if (route === "settings") $("appTitle").textContent = t.appSettings;

    if (route === "dash") renderDashboard();
    if (route === "stats") renderStats();
    if (route === "review") renderReviewUI();
    if (route === "close") renderCloseUI();
    if (route === "check") renderChecklistUI();
  }

  // ---------- charts ----------
  function clearCanvas(ctx, w, h) { ctx.clearRect(0, 0, w, h); }
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
    const w = c.width, h = c.height;
    clearCanvas(ctx, w, h);
    drawAxes(ctx, w, h);

    const trades = closedTrades.slice().sort((a,b)=>a.date.localeCompare(b.date));
    if (!trades.length) return;

    let eq = 0;
    const points = trades.map((tr, i) => {
      eq += tr.pnl;
      return { x: i, y: eq };
    });

    const minY = Math.min(...points.map(p=>p.y), 0);
    const maxY = Math.max(...points.map(p=>p.y), 0);

    const padLeft = 40, padRight = 10, padTop = 10, padBottom = 30;
    const plotW = w - padLeft - padRight;
    const plotH = h - padTop - padBottom;

    const sx = (x) => points.length === 1 ? padLeft + plotW/2 : padLeft + (x/(points.length-1))*plotW;
    const sy = (y) => (maxY === minY) ? padTop + plotH/2 : padTop + (1 - ((y - minY)/(maxY - minY))) * plotH;

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
      const x = sx(p.x), y = sy(p.y);
      if (i === 0) ctx.moveTo(x,y);
      else ctx.lineTo(x,y);
    });
    ctx.stroke();

    const last = points[points.length-1];
    ctx.fillStyle = "rgba(45,212,191,.95)";
    ctx.beginPath();
    ctx.arc(sx(last.x), sy(last.y), 4, 0, Math.PI*2);
    ctx.fill();

    ctx.fillStyle = "rgba(255,255,255,.55)";
    ctx.font = "12px -apple-system, system-ui, Arial";
    ctx.fillText(fmtMoney(minY), 6, sy(minY));
    ctx.fillText(fmtMoney(maxY), 6, sy(maxY));
  }

  function drawRDistribution(closedTrades) {
    const c = $("rCanvas");
    const ctx = c.getContext("2d");
    const w = c.width, h = c.height;
    clearCanvas(ctx, w, h);
    drawAxes(ctx, w, h);

    const rs = closedTrades.map(t=>t.r).filter(r=>Number.isFinite(r));
    if (!rs.length) return;

    const bins = [0,0,0,0,0,0];
    rs.forEach(r=>{
      if (r < -2) bins[0]++; else
      if (r < -1) bins[1]++; else
      if (r < 0) bins[2]++; else
      if (r < 1) bins[3]++; else
      if (r < 2) bins[4]++; else bins[5]++;
    });

    const maxB = Math.max(...bins, 1);
    const padLeft = 40, padRight = 10, padTop = 10, padBottom = 30;
    const plotW = w - padLeft - padRight;
    const plotH = h - padTop - padBottom;

    const barW = plotW / bins.length;
    ctx.fillStyle = "rgba(59,130,246,.65)";
    bins.forEach((b, i)=>{
      const bh = (b/maxB) * plotH;
      const x = padLeft + i*barW + 8;
      const y = padTop + (plotH - bh);
      ctx.fillRect(x, y, barW - 16, bh);
    });
  }

  // ---------- dashboard ----------
  function getClosedTradesAll() {
    return state.trades.filter(t => t.status === "CLOSED");
  }
  function getOpenTradesAll() {
    return state.trades.filter(t => t.status === "OPEN");
  }

  function calcDashboardClosed(closedTrades) {
    const totalPnl = closedTrades.reduce((s, tr) => s + (tr.pnl || 0), 0);
    const wins = closedTrades.filter(tr => tr.r > 0).length;
    const winRate = closedTrades.length ? (wins / closedTrades.length) * 100 : 0;
    const avgR = closedTrades.length ? closedTrades.reduce((s, tr) => s + tr.r, 0) / closedTrades.length : 0;
    return { totalPnl, winRate, avgR };
  }

  function renderTradesList() {
    const t = I18N[state.lang];
    const list = $("tradesList");
    list.innerHTML = "";

    if (!state.trades.length) {
      list.innerHTML = `<div class="item"><div class="label">${t.noTrades}</div></div>`;
      return;
    }

    // newest first
    state.trades.slice().reverse().forEach(tr => {
      const statusBadge = tr.status === "OPEN" ? `<span class="badge soft">OPEN</span>` : `<span class="badge soft">CLOSED</span>`;
      const cls = tr.pnl > 0 ? "green" : tr.pnl < 0 ? "red" : "";
      const pnlText = tr.status === "OPEN" ? "—" : fmtMoney(tr.pnl);
      const rText = tr.status === "OPEN" ? "—" : `${tr.r.toFixed(2)}R`;

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

      // quick close action for OPEN trades
      if (tr.status === "OPEN") {
        const btn = document.createElement("button");
        btn.className = "btn ghost";
        btn.style.marginTop = "8px";
        btn.textContent = "🏁 Close this trade";
        btn.addEventListener("click", () => {
          state.closeSelectedId = tr.id;
          saveState();
          setActiveTab("close");
        });
        el.appendChild(btn);
      }

      list.appendChild(el);
    });
  }

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

  // ---------- new trade ----------
  function setDefaultDate(id) { $(id).value = new Date().toISOString().slice(0,10); }

  function setSegActive(segId, key, val) {
    $$("#" + segId + " .segBtn").forEach(b => b.classList.toggle("active", b.dataset[key] === val));
  }
  function getSegActive(segId, key, fallback) {
    const b = $$("#" + segId + " .segBtn").find(x => x.classList.contains("active"));
    return b ? b.dataset[key] : fallback;
  }

  function resetNewForm() {
    setSegActive("dirSeg", "dir", "LONG");
    setDefaultDate("fDate");
    $("fSession").value = "";
    ["fEntry","fSL","fTP","fLot","fExit","fPnl","fStrategy","fNotes"].forEach(id => $(id).value = "");
    $("riskUsd").textContent = "$0.00";
    $("rMultiple").textContent = "0.00R";
  }

  function updateNewLiveRisk() {
    const entry = toNum($("fEntry").value);
    const sl = toNum($("fSL").value);
    const lot = toNum($("fLot").value);
    const exit = toNum($("fExit").value);
    const pnlManual = toNum($("fPnl").value);
    const dir = getSegActive("dirSeg","dir","LONG");

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

    const r = (pnl == null) ? 0 : rMultiple(pnl, risk);
    $("rMultiple").textContent = `${r.toFixed(2)}R`;
  }

  function addTradeCommon(payload) {
    const id = crypto?.randomUUID ? crypto.randomUUID() : String(Date.now()) + Math.random().toString(16).slice(2);
    const trade = {
      id,
      symbol:"XAUUSD",
      review: { plan: "YES", mistake: "", notes: "" },
      ...payload
    };
    state.trades.push(trade);

    // default selections
    if (!state.reviewSelectedId) state.reviewSelectedId = id;
    if (!state.closeSelectedId && trade.status === "OPEN") state.closeSelectedId = id;

    saveState();
    renderDashboard();
    renderStats();
  }

  function saveNewTrade() {
    const t = I18N[state.lang];

    const dir = getSegActive("dirSeg","dir","LONG");
    const date = $("fDate").value || new Date().toISOString().slice(0,10);
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

    let status = "OPEN";
    let pnl = 0;
    let r = 0;
    let riskUsd = riskUsdApprox(entry, sl, lot);

    if (exit != null || pnlManual != null) {
      status = "CLOSED";
      pnl = (exit != null) ? pnlFromExit(entry, exit, lot, dir) : pnlManual;
      r = rMultiple(pnl, riskUsd);
    }

    addTradeCommon({
      date, session, dir,
      entry, sl, tp: (tp==null?null:tp),
      lot,
      status,
      exit: (exit==null?null:exit),
      pnl: +pnl.toFixed(2),
      riskUsd: +riskUsd.toFixed(2),
      r: +r.toFixed(2),
      strategy: ($("fStrategy").value || "").trim(),
      notes: ($("fNotes").value || "").trim()
    });

    alert(t.saved);
    resetNewForm();
    setActiveTab("dash");
  }

  // ---------- checklist ----------
  function resetChecklist() {
    setSegActive("cDirSeg", "dir", "LONG");
    setDefaultDate("cDate");
    $("cSession").value = "";
    ["cEntry","cSL","cLot","cTP","cNotes"].forEach(id => $(id).value = "");
    ["cbTrend","cbLevel","cbConfirm","cbRR","cbNews","cbMind","cbPlan"].forEach(id => $(id).checked = false);
    $("cRiskUsd").textContent = "$0.00";
    $("cREst").textContent = "1.00R";
  }

  function updateChecklistRisk() {
    const entry = toNum($("cEntry").value);
    const sl = toNum($("cSL").value);
    const lot = toNum($("cLot").value);

    if (entry == null || sl == null || lot == null) {
      $("cRiskUsd").textContent = "$0.00";
      return;
    }
    const risk = riskUsdApprox(entry, sl, lot);
    $("cRiskUsd").textContent = fmtMoney(risk);
  }

  function allChecklistChecked() {
    return ["cbTrend","cbLevel","cbConfirm","cbRR","cbNews","cbMind","cbPlan"].every(id => $(id).checked);
  }

  function addOpenTradeFromChecklist() {
    const t = I18N[state.lang];

    const dir = getSegActive("cDirSeg","dir","LONG");
    const date = $("cDate").value || new Date().toISOString().slice(0,10);
    const session = $("cSession").value || "";

    const entry = toNum($("cEntry").value);
    const sl = toNum($("cSL").value);
    const tp = toNum($("cTP").value);
    const lot = toNum($("cLot").value);

    if (entry == null || sl == null || lot == null) {
      alert(t.needFields);
      return;
    }

    // you wanted: "if all good then add trade"
    if (!allChecklistChecked()) {
      // still allow? You said "if everything good", so block:
      alert(state.lang === "HE" ? "סמן V על כל הצ'ק ליסט ואז אפשר להוסיף." : "Check all items to add the trade.");
      return;
    }

    const riskUsd = riskUsdApprox(entry, sl, lot);

    const checklistNotes =
      `Checklist: OK\n` +
      `Trend ✓, Level ✓, Confirm ✓, RR ✓, News ✓, Mindset ✓, Plan ✓\n` +
      ( ($("cNotes").value || "").trim() ? `\nNotes:\n${($("cNotes").value || "").trim()}` : "" );

    addTradeCommon({
      date, session, dir,
      entry, sl, tp: (tp==null?null:tp),
      lot,
      status: "OPEN",
      exit: null,
      pnl: 0,
      riskUsd: +riskUsd.toFixed(2),
      r: 0,
      strategy: "Checklist",
      notes: checklistNotes
    });

    alert(t.saved);
    resetChecklist();
    setActiveTab("dash");
  }

  function renderChecklistUI() {
    // just ensure date exists
    if (!$("cDate").value) setDefaultDate("cDate");
  }

  // ---------- stats ----------
  function getClosedFilteredTrades() {
    const closed = getClosedTradesAll();
    if (state.statsFilter === "MONTH") return closed.filter(tr => isThisMonth(tr.date));
    return closed;
  }

  function renderStats() {
    const closed = getClosedFilteredTrades();
    const rs = closed.map(t => t.r).filter(r=>Number.isFinite(r));
    const exp = rs.length ? (rs.reduce((a,b)=>a+b,0)/rs.length) : 0;
    const best = rs.length ? Math.max(...rs) : 0;
    const worst = rs.length ? Math.min(...rs) : 0;

    $("sTrades").textContent = String(closed.length);
    $("sExp").textContent = `${exp.toFixed(2)}R`;
    $("sBest").textContent = `${best.toFixed(2)}R`;
    $("sWorst").textContent = `${worst.toFixed(2)}R`;

    drawRDistribution(closed);

    const counts = {};
    closed.forEach(tr => {
      const m = tr.review?.mistake || "";
      if (!m) return;
      counts[m] = (counts[m] || 0) + 1;
    });

    const list = $("mistakeList");
    list.innerHTML = "";
    const entries = Object.entries(counts).sort((a,b)=>b[1]-a[1]);
    if (!entries.length) {
      list.innerHTML = `<div class="mRow"><span>—</span><span class="badge">0</span></div>`;
    } else {
      entries.forEach(([k,v])=>{
        const row = document.createElement("div");
        row.className = "mRow";
        row.innerHTML = `<span>${k}</span><span class="badge">${v}</span>`;
        list.appendChild(row);
      });
    }
  }

  // ---------- Modal picker (shared) ----------
  let modalMode = "review"; // "review" | "close"
  function openTradeModal(mode) {
    modalMode = mode;
    const t = I18N[state.lang];
    $("tradeModalTitle").textContent = (mode === "close") ? t.modalCloseTitle : t.modalReviewTitle;

    $("tradeModalBack").classList.add("open");
    $("tradeModal").classList.add("open");
    $("tradeSearch").value = "";
    buildTradeModalList("");
    $("tradeSearch").focus?.();
  }
  function closeTradeModal() {
    $("tradeModalBack").classList.remove("open");
    $("tradeModal").classList.remove("open");
  }

  function tradeToSearchText(tr) {
    return `${tr.date} ${tr.dir} ${tr.session || ""} ${tr.status} ${tr.pnl} ${tr.r}`.toLowerCase();
  }

  function buildTradeModalList(query) {
    const q = (query || "").toLowerCase().trim();
    const list = $("tradeModalList");
    list.innerHTML = "";

    const t = I18N[state.lang];

    let trades = state.trades.slice().reverse();
    if (modalMode === "close") {
      trades = trades.filter(tr => tr.status === "OPEN");
    }

    trades = trades.filter(tr => !q || tradeToSearchText(tr).includes(q));

    if (!trades.length) {
      const empty = document.createElement("div");
      empty.className = "mRow";
      empty.innerHTML = `<span>${modalMode === "close" ? t.noOpen : "—"}</span><span class="badge">0</span>`;
      list.appendChild(empty);
      return;
    }

    trades.forEach(tr => {
      const pnlText = tr.status === "OPEN" ? "—" : fmtMoney(tr.pnl);
      const rText = tr.status === "OPEN" ? "—" : `${tr.r.toFixed(2)}R`;
      const cls = tr.pnl > 0 ? "green" : tr.pnl < 0 ? "red" : "";

      const row = document.createElement("button");
      row.type = "button";
      row.className = "pickItem";
      row.innerHTML = `
        <div class="pickItemMain">
          <div class="pickItemTop">XAUUSD • ${tr.dir} • ${tr.date} • ${tr.status}</div>
          <div class="pickItemSub">Entry ${tr.entry.toFixed(2)} • SL ${tr.sl.toFixed(2)} • Lot ${tr.lot.toFixed(2)} ${tr.session ? "• " + tr.session : ""}</div>
        </div>
        <div class="badge ${cls}">${pnlText} • ${rText}</div>
      `;

      row.addEventListener("click", () => {
        if (modalMode === "close") {
          state.closeSelectedId = tr.id;
        } else {
          state.reviewSelectedId = tr.id;
        }
        saveState();
        closeTradeModal();
        renderReviewUI();
        renderCloseUI();
      });

      list.appendChild(row);
    });
  }

  // ---------- Review ----------
  function setPlan(plan) {
    $$("#planSeg .segBtn").forEach(b => b.classList.toggle("active", b.dataset.plan === plan));
  }
  function getPlan() {
    const b = $$("#planSeg .segBtn").find(x => x.classList.contains("active"));
    return b ? b.dataset.plan : "YES";
  }
  function clearReviewFormUI() {
    setPlan("YES");
    $("mistakeType").value = "";
    $("reviewNotes").value = "";
  }
  function getReviewSelectedTrade() {
    return state.trades.find(t => t.id === state.reviewSelectedId) || null;
  }
  function updateReviewPickBtn() {
    const t = I18N[state.lang];
    const tr = getReviewSelectedTrade();
    $("reviewPickBtn").textContent = tr ? `${tr.date} • ${tr.dir} • ${tr.status}` : t.pickTap;
  }
  function renderReviewUI() {
    const t = I18N[state.lang];
    if (!state.trades.length) {
      $("reviewMeta").textContent = t.noTrades;
      updateReviewPickBtn();
      clearReviewFormUI();
      return;
    }
    if (!state.reviewSelectedId) {
      state.reviewSelectedId = state.trades[state.trades.length - 1].id;
      saveState();
    }
    const tr = getReviewSelectedTrade();
    if (!tr) return;

    updateReviewPickBtn();

    const pnlText = tr.status === "OPEN" ? "—" : fmtMoney(tr.pnl);
    const rText = tr.status === "OPEN" ? "—" : `${tr.r.toFixed(2)}R`;

    $("reviewMeta").textContent =
      `XAUUSD • ${tr.dir} • ${tr.date} • ${tr.status}${tr.session ? " • " + tr.session : ""} • Entry ${tr.entry.toFixed(2)} • SL ${tr.sl.toFixed(2)} • Lot ${tr.lot.toFixed(2)} • ${pnlText} • ${rText}`;

    const rev = tr.review || { plan:"YES", mistake:"", notes:"" };
    setPlan(rev.plan || "YES");
    $("mistakeType").value = rev.mistake || "";
    $("reviewNotes").value = rev.notes || "";
  }
  function saveReview() {
    const t = I18N[state.lang];
    const tr = getReviewSelectedTrade();
    if (!tr) return;

    tr.review = {
      plan: getPlan(),
      mistake: $("mistakeType").value || "",
      notes: ($("reviewNotes").value || "").trim()
    };
    saveState();
    alert(t.saved);

    // clear UI after save (as you asked earlier)
    clearReviewFormUI();

    renderStats();
  }
  function clearReview() {
    const tr = getReviewSelectedTrade();
    if (!tr) return;
    tr.review = { plan:"YES", mistake:"", notes:"" };
    saveState();
    clearReviewFormUI();
    renderStats();
  }

  // ---------- Close Trade ----------
  function getCloseSelectedTrade() {
    return state.trades.find(t => t.id === state.closeSelectedId) || null;
  }
  function updateClosePickBtn() {
    const t = I18N[state.lang];
    const tr = getCloseSelectedTrade();
    $("closePickBtn").textContent = tr ? `${tr.date} • ${tr.dir} • OPEN` : t.pickTap;
  }
  function resetCloseForm() {
    $("closeExit").value = "";
    $("closePnl").value = "";
    $("closeRisk").textContent = "$0.00";
    $("closeR").textContent = "0.00R";
  }
  function updateCloseCalc() {
    const tr = getCloseSelectedTrade();
    if (!tr) {
      $("closeRisk").textContent = "$0.00";
      $("closeR").textContent = "0.00R";
      return;
    }
    $("closeRisk").textContent = fmtMoney(tr.riskUsd || riskUsdApprox(tr.entry, tr.sl, tr.lot));

    const exit = toNum($("closeExit").value);
    const pnlManual = toNum($("closePnl").value);

    let pnl = null;
    if (exit != null) pnl = pnlFromExit(tr.entry, exit, tr.lot, tr.dir);
    else if (pnlManual != null) pnl = pnlManual;

    const r = (pnl == null) ? 0 : rMultiple(pnl, tr.riskUsd || riskUsdApprox(tr.entry, tr.sl, tr.lot));
    $("closeR").textContent = `${r.toFixed(2)}R`;
  }

  function renderCloseUI() {
    const t = I18N[state.lang];
    const open = getOpenTradesAll();

    if (!open.length) {
      $("closeMeta").textContent = t.noOpen;
      updateClosePickBtn();
      resetCloseForm();
      return;
    }

    if (!state.closeSelectedId || !open.some(x => x.id === state.closeSelectedId)) {
      state.closeSelectedId = open[open.length - 1].id;
      saveState();
    }

    const tr = getCloseSelectedTrade();
    if (!tr) return;

    updateClosePickBtn();

    $("closeMeta").textContent =
      `XAUUSD • ${tr.dir} • ${tr.date}${tr.session ? " • " + tr.session : ""} • Entry ${tr.entry.toFixed(2)} • SL ${tr.sl.toFixed(2)} • Lot ${tr.lot.toFixed(2)} • OPEN`;

    $("closeRisk").textContent = fmtMoney(tr.riskUsd || riskUsdApprox(tr.entry, tr.sl, tr.lot));
    updateCloseCalc();
  }

  function closeTradeSave() {
    const t = I18N[state.lang];
    const tr = getCloseSelectedTrade();
    if (!tr || tr.status !== "OPEN") {
      alert(t.needClose);
      return;
    }

    const exit = toNum($("closeExit").value);
    const pnlManual = toNum($("closePnl").value);

    let pnl = null;
    if (exit != null) pnl = pnlFromExit(tr.entry, exit, tr.lot, tr.dir);
    else if (pnlManual != null) pnl = pnlManual;

    if (pnl == null) {
      alert(t.needClose);
      return;
    }

    const riskUsd = tr.riskUsd || riskUsdApprox(tr.entry, tr.sl, tr.lot);
    const r = rMultiple(pnl, riskUsd);

    tr.status = "CLOSED";
    tr.exit = (exit == null ? null : exit);
    tr.pnl = +pnl.toFixed(2);
    tr.riskUsd = +riskUsd.toFixed(2);
    tr.r = +r.toFixed(2);

    saveState();
    alert(t.saved);

    resetCloseForm();
    renderDashboard();
    renderStats();
    renderCloseUI();
    setActiveTab("dash");
  }

  // ---------- Settings ----------
  function exportJson() {
    const data = JSON.stringify(state, null, 2);
    const blob = new Blob([data], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `adigafx-trade-journal-${new Date().toISOString().slice(0,10)}.json`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  }

  function importJson(file) {
    const t = I18N[state.lang];
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const parsed = JSON.parse(reader.result);
        if (!parsed || typeof parsed !== "object" || !Array.isArray(parsed.trades)) throw new Error("bad");
        state = { ...defaultState, ...parsed };
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
    localStorage.removeItem(STORAGE_KEY);
    state = loadState();
    saveState();
    applyLang();
    resetNewForm();
    resetChecklist();
    resetCloseForm();
    renderDashboard();
    renderStats();
    renderReviewUI();
    renderCloseUI();
  }

  // ---------- demo ----------
  function addDemoTrade() {
    const date = new Date().toISOString().slice(0,10);
    const dir = Math.random() > 0.5 ? "LONG" : "SHORT";
    const entry = 2356.2;
    const sl = 2350.8;
    const lot = 0.1;
    const exit = dir === "LONG" ? 2360.6 : 2352.2;
    const pnl = pnlFromExit(entry, exit, lot, dir);
    const riskUsd = riskUsdApprox(entry, sl, lot);
    const r = rMultiple(pnl, riskUsd);

    addTradeCommon({
      date,
      session: "NY",
      dir,
      entry,
      sl,
      tp: null,
      lot,
      status: "CLOSED",
      exit,
      pnl: +pnl.toFixed(2),
      riskUsd: +riskUsd.toFixed(2),
      r: +r.toFixed(2),
      strategy: "Demo",
      notes: "Demo trade"
    });
  }

  // ---------- events ----------
  $$(".tab").forEach(btn => btn.addEventListener("click", () => setActiveTab(btn.dataset.route)));

  $("langBtn").addEventListener("click", () => {
    state.lang = (state.lang === "EN") ? "HE" : "EN";
    saveState();
    applyLang();
    renderDashboard();
    renderStats();
    renderReviewUI();
    renderCloseUI();
  });

  $("goCheckBtn").addEventListener("click", () => setActiveTab("check"));
  $("goCloseBtn").addEventListener("click", () => setActiveTab("close"));

  // New form seg + inputs
  $$("#dirSeg .segBtn").forEach(b => b.addEventListener("click", () => {
    $$("#dirSeg .segBtn").forEach(x => x.classList.remove("active"));
    b.classList.add("active");
    updateNewLiveRisk();
  }));
  ["fEntry","fSL","fLot","fExit","fPnl"].forEach(id => $(id).addEventListener("input", updateNewLiveRisk));
  $("resetFormBtn").addEventListener("click", resetNewForm);
  $("saveTradeBtn").addEventListener("click", saveNewTrade);

  // Checklist seg + inputs
  $$("#cDirSeg .segBtn").forEach(b => b.addEventListener("click", () => {
    $$("#cDirSeg .segBtn").forEach(x => x.classList.remove("active"));
    b.classList.add("active");
    updateChecklistRisk();
  }));
  ["cEntry","cSL","cLot"].forEach(id => $(id).addEventListener("input", updateChecklistRisk));
  $("cResetBtn").addEventListener("click", resetChecklist);
  $("cAddTradeBtn").addEventListener("click", addOpenTradeFromChecklist);

  // Stats filter
  $$("#statsFilterSeg .segBtn").forEach(b => b.addEventListener("click", () => {
    $$("#statsFilterSeg .segBtn").forEach(x => x.classList.remove("active"));
    b.classList.add("active");
    state.statsFilter = b.dataset.filter;
    saveState();
    renderStats();
  }));

  // Review seg
  $$("#planSeg .segBtn").forEach(b => b.addEventListener("click", () => {
    $$("#planSeg .segBtn").forEach(x => x.classList.remove("active"));
    b.classList.add("active");
  }));
  $("saveReviewBtn").addEventListener("click", saveReview);
  $("clearReviewBtn").addEventListener("click", clearReview);
  $("pickLastBtn").addEventListener("click", () => {
    if (!state.trades.length) return;
    state.reviewSelectedId = state.trades[state.trades.length - 1].id;
    saveState();
    renderReviewUI();
  });

  // Close trade inputs
  ["closeExit","closePnl"].forEach(id => $(id).addEventListener("input", updateCloseCalc));
  $("closeResetBtn").addEventListener("click", resetCloseForm);
  $("closeTradeBtn").addEventListener("click", closeTradeSave);

  // Modal
  $("reviewPickBtn").addEventListener("click", () => openTradeModal("review"));
  $("closePickBtn").addEventListener("click", () => openTradeModal("close"));
  $("tradeModalClose").addEventListener("click", closeTradeModal);
  $("tradeModalBack").addEventListener("click", closeTradeModal);
  $("tradeSearch").addEventListener("input", (e) => buildTradeModalList(e.target.value));

  // Settings
  $("exportBtn").addEventListener("click", exportJson);
  $("importFile").addEventListener("change", (e) => {
    const f = e.target.files?.[0];
    if (f) importJson(f);
    e.target.value = "";
  });
  $("resetAllBtn").addEventListener("click", resetAll);

  // Demo
  $("addDemoBtn").addEventListener("click", addDemoTrade);

  // ---------- init ----------
  // default dates
  setDefaultDate("fDate");
  setDefaultDate("cDate");

  // reset forms
  resetNewForm();
  resetChecklist();
  resetCloseForm();

  applyLang();
  renderDashboard();
  renderStats();
  renderReviewUI();
  renderCloseUI();
  setActiveTab("dash");
});
