document.addEventListener("DOMContentLoaded", () => {
  const tg = window.Telegram?.WebApp;
  tg?.ready();
  tg?.expand();

  const STORAGE_KEY = "adigafx_tj_v1";

  // ---------- i18n ----------
  const I18N = {
    EN: {
      tabDash: "Dashboard",
      tabNew: "New Trade",
      tabStats: "Stats",
      tabReview: "Review",
      tabSettings: "Settings",

      appTitleDash: "AdigaFX • Dashboard",
      appTitleNew: "AdigaFX • New Trade",
      appTitleStats: "AdigaFX • Stats",
      appTitleReview: "AdigaFX • Trade Review",
      appTitleSettings: "Settings",

      appSubtitle: "XAUUSD only • Local storage",

      lblTotalPnl: "Total P&L",
      lblWinRate: "Win Rate",
      lblAvgR: "Avg R",
      pnlHint: "All-time",
      winHint: "Closed trades",
      avgHint: "Closed trades",

      lblEquityCurve: "AdigaFX • Equity Curve",
      lblTrades: "Trades",
      addDemo: "Add demo",
      goNew: "➕ New Trade",
      goStats: "📊 Stats",

      lblDirection: "Direction",
      lblDate: "Date",
      lblSession: "Session (optional)",
      lblEntry: "Entry",
      lblSL: "Stop Loss",
      lblTP: "Take Profit (optional)",
      lblLot: "Lot",
      lblExit: "Exit (optional)",
      lblPnl: "PnL ($)",
      hintExit: "If you enter Exit, PnL will be auto-calculated.",
      hintPnl: "If Exit is empty, you can enter PnL manually.",
      lblRiskUsd: "Risk $ (approx)",
      lblRMultiple: "R (approx)",
      hintRisk: "Approx model: XAUUSD 1 lot = 100oz. Risk$ ≈ |Entry-SL| × lot × 100.",
      lblStrategy: "Strategy (optional)",
      lblNotes: "Notes (optional)",
      saveTrade: "✅ Save Trade",
      reset: "Reset",

      statsAll: "ALL",
      statsMonth: "MONTH",
      lblTradesCount: "Trades",
      lblExpectancy: "Expectancy",
      lblBest: "Best",
      lblWorst: "Worst",
      sTradesHint: "Filtered",
      sExpHint: "Avg R",
      sBestHint: "Max R",
      sWorstHint: "Min R",
      lblRDist: "R Distribution",
      lblMistakes: "Mistakes",

      pickLast: "Pick last",
      lblPickTrade: "Select trade",
      lblPlan: "According to plan?",
      yes: "YES",
      no: "NO",
      lblMistakeType: "Mistake",
      lblReviewNotes: "Review notes",
      saveReview: "💾 Save Review",
      clear: "Clear",

      lblDataTools: "Data tools",
      export: "Export JSON",
      import: "Import JSON",
      resetAll: "Reset all local data",
      hintReset: "This only affects this device/browser.",
      about: "© AdigaFX Trade Journal • Private Telegram Mini App",

      noTrades: "No trades yet. Add a demo trade or create a new trade.",
      saved: "Saved!",
      needFields: "Please fill Entry, Stop Loss and Lot. Provide Exit or PnL.",
      importOk: "Import completed.",
      importBad: "Invalid JSON file.",
      confirmReset: "Reset ALL local data? This cannot be undone.",
      noTradesYet: "No trades yet."
    },
    HE: {
      tabDash: "דשבורד",
      tabNew: "טרייד חדש",
      tabStats: "סטטיסטיקות",
      tabReview: "ביקורת",
      tabSettings: "הגדרות",

      appTitleDash: "AdigaFX • דשבורד",
      appTitleNew: "AdigaFX • טרייד חדש",
      appTitleStats: "AdigaFX • סטטיסטיקות",
      appTitleReview: "AdigaFX • ביקורת עסקה",
      appTitleSettings: "הגדרות",

      appSubtitle: "XAUUSD בלבד • שמירה מקומית",

      lblTotalPnl: "רווח/הפסד",
      lblWinRate: "אחוז הצלחה",
      lblAvgR: "ממוצע R",
      pnlHint: "כל הזמן",
      winHint: "עסקאות סגורות",
      avgHint: "עסקאות סגורות",

      lblEquityCurve: "AdigaFX • עקומת רווח",
      lblTrades: "עסקאות",
      addDemo: "הוסף דמו",
      goNew: "➕ טרייד חדש",
      goStats: "📊 סטטיסטיקות",

      lblDirection: "כיוון",
      lblDate: "תאריך",
      lblSession: "סשן (אופציונלי)",
      lblEntry: "כניסה",
      lblSL: "סטופ",
      lblTP: "טייק (אופציונלי)",
      lblLot: "לוט",
      lblExit: "יציאה (אופציונלי)",
      lblPnl: "PnL ($)",
      hintExit: "אם תכניס Exit, ה־PnL יחושב אוטומטית.",
      hintPnl: "אם אין Exit, אפשר להכניס PnL ידנית.",
      lblRiskUsd: "סיכון $ (בערך)",
      lblRMultiple: "R (בערך)",
      hintRisk: "מודל מקורב: XAUUSD 1 לוט = 100oz. סיכון$ ≈ |Entry-SL| × lot × 100.",
      lblStrategy: "אסטרטגיה (אופציונלי)",
      lblNotes: "הערות (אופציונלי)",
      saveTrade: "✅ שמור טרייד",
      reset: "איפוס",

      statsAll: "הכל",
      statsMonth: "החודש",
      lblTradesCount: "כמות",
      lblExpectancy: "אקספקטנסי",
      lblBest: "הכי טוב",
      lblWorst: "הכי גרוע",
      sTradesHint: "מסונן",
      sExpHint: "ממוצע R",
      sBestHint: "מקסימום R",
      sWorstHint: "מינימום R",
      lblRDist: "התפלגות R",
      lblMistakes: "טעויות",

      pickLast: "בחר אחרון",
      lblPickTrade: "בחר עסקה",
      lblPlan: "לפי התוכנית?",
      yes: "כן",
      no: "לא",
      lblMistakeType: "טעות",
      lblReviewNotes: "הערות ביקורת",
      saveReview: "💾 שמור ביקורת",
      clear: "נקה",

      lblDataTools: "כלי נתונים",
      export: "ייצוא JSON",
      import: "ייבוא JSON",
      resetAll: "איפוס כל הנתונים",
      hintReset: "משפיע רק על המכשיר/דפדפן הזה.",
      about: "© AdigaFX • יומן מסחר • מיני אפ פרטי",

      noTrades: "אין עסקאות עדיין. הוסף דמו או צור טרייד חדש.",
      saved: "נשמר!",
      needFields: "מלא Entry/SL/Lot. הכנס Exit או PnL.",
      importOk: "הייבוא הושלם.",
      importBad: "קובץ JSON לא תקין.",
      confirmReset: "לאפס את כל הנתונים המקומיים? אי אפשר לבטל.",
      noTradesYet: "אין עסקאות עדיין."
    }
  };

  // ---------- DOM helpers ----------
  const $ = (id) => document.getElementById(id);
  const $$ = (sel) => Array.from(document.querySelectorAll(sel));

  // ---------- State ----------
  const defaultState = {
    lang: "EN",
    trades: [],
    statsFilter: "ALL"
  };

  function loadState() {
    try {
      const s = JSON.parse(localStorage.getItem(STORAGE_KEY));
      return { ...defaultState, ...(s || {}) };
    } catch {
      return { ...defaultState };
    }
  }

  function saveState(s) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(s));
  }

  let state = loadState();

  // ---------- Trade math ----------
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

  // ---------- Routing ----------
  function setActiveTab(route) {
    $$(".tab").forEach(t => t.classList.toggle("active", t.dataset.route === route));
    $$(".screen").forEach(s => s.classList.toggle("active", s.id === `screen-${route}`));

    const t = I18N[state.lang];
    if (route === "dash") $("appTitle").textContent = t.appTitleDash;
    if (route === "new") $("appTitle").textContent = t.appTitleNew;
    if (route === "stats") $("appTitle").textContent = t.appTitleStats;
    if (route === "review") $("appTitle").textContent = t.appTitleReview;
    if (route === "settings") $("appTitle").textContent = t.appTitleSettings;

    if (route === "stats") renderStats();
    if (route === "review") renderReview(true);
  }

  // ---------- UI text update ----------
  function applyLang() {
    const t = I18N[state.lang];

    $("langBtn").textContent = state.lang;

    $("tabDash").textContent = t.tabDash;
    $("tabNew").textContent = t.tabNew;
    $("tabStats").textContent = t.tabStats;
    $("tabReview").textContent = t.tabReview;
    $("tabSettings").textContent = t.tabSettings;

    $("appSubtitle").textContent = t.appSubtitle;

    $("lblTotalPnl").textContent = t.lblTotalPnl;
    $("lblWinRate").textContent = t.lblWinRate;
    $("lblAvgR").textContent = t.lblAvgR;
    $("pnlHint").textContent = t.pnlHint;
    $("winHint").textContent = t.winHint;
    $("avgHint").textContent = t.avgHint;

    $("lblEquityCurve").textContent = t.lblEquityCurve;
    $("lblTrades").textContent = t.lblTrades;
    $("addDemoBtn").textContent = t.addDemo;
    $("goNewBtn").textContent = t.goNew;
    $("goStatsBtn").textContent = t.goStats;

    $("lblDirection").textContent = t.lblDirection;
    $("lblDate").textContent = t.lblDate;
    $("lblSession").textContent = t.lblSession;
    $("lblEntry").textContent = t.lblEntry;
    $("lblSL").textContent = t.lblSL;
    $("lblTP").textContent = t.lblTP;
    $("lblLot").textContent = t.lblLot;
    $("lblExit").textContent = t.lblExit;
    $("lblPnl").textContent = t.lblPnl;
    $("hintExit").textContent = t.hintExit;
    $("hintPnl").textContent = t.hintPnl;
    $("lblRiskUsd").textContent = t.lblRiskUsd;
    $("lblRMultiple").textContent = t.lblRMultiple;
    $("hintRisk").textContent = t.hintRisk;
    $("lblStrategy").textContent = t.lblStrategy;
    $("lblNotes").textContent = t.lblNotes;
    $("saveTradeBtn").textContent = t.saveTrade;
    $("resetFormBtn").textContent = t.reset;

    const statsBtns = $$("#statsFilterSeg .segBtn");
    if (statsBtns[0]) statsBtns[0].textContent = t.statsAll;
    if (statsBtns[1]) statsBtns[1].textContent = t.statsMonth;

    $("lblTradesCount").textContent = t.lblTradesCount;
    $("lblExpectancy").textContent = t.lblExpectancy;
    $("lblBest").textContent = t.lblBest;
    $("lblWorst").textContent = t.lblWorst;
    $("sTradesHint").textContent = t.sTradesHint;
    $("sExpHint").textContent = t.sExpHint;
    $("sBestHint").textContent = t.sBestHint;
    $("sWorstHint").textContent = t.sWorstHint;
    $("lblRDist").textContent = t.lblRDist;
    $("lblMistakes").textContent = t.lblMistakes;

    $("pickLastBtn").textContent = t.pickLast;
    $("lblPickTrade").textContent = t.lblPickTrade;
    $("lblPlan").textContent = t.lblPlan;

    const planBtns = $$("#planSeg .segBtn");
    if (planBtns[0]) planBtns[0].textContent = t.yes;
    if (planBtns[1]) planBtns[1].textContent = t.no;

    $("lblMistakeType").textContent = t.lblMistakeType;
    $("lblReviewNotes").textContent = t.lblReviewNotes;
    $("saveReviewBtn").textContent = t.saveReview;
    $("clearReviewBtn").textContent = t.clear;

    $("lblDataTools").textContent = t.lblDataTools;
    $("exportBtn").textContent = t.export;
    $("resetAllBtn").textContent = t.resetAll;
    $("hintReset").textContent = t.hintReset;
    $("aboutText").textContent = t.about;

    document.documentElement.dir = (state.lang === "HE") ? "rtl" : "ltr";
  }

  // ---------- Rendering (Dashboard) ----------
  function calcDashboard(trades) {
    const totalPnl = trades.reduce((s, tr) => s + (tr.pnl || 0), 0);
    const closed = trades.filter(tr => typeof tr.r === "number");
    const wins = closed.filter(tr => tr.r > 0).length;
    const winRate = closed.length ? (wins / closed.length) * 100 : 0;
    const avgR = closed.length ? closed.reduce((s, tr) => s + tr.r, 0) / closed.length : 0;
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

    state.trades.slice().reverse().forEach(tr => {
      const cls = tr.pnl > 0 ? "green" : tr.pnl < 0 ? "red" : "";
      const reviewed = tr.review && (tr.review.plan !== "YES" || tr.review.mistake || tr.review.notes)
        ? `<span class="badge">Reviewed</span>`
        : `<span class="badge">—</span>`;

      const el = document.createElement("div");
      el.className = "item";
      el.innerHTML = `
        <div class="itemTop">
          <div>XAUUSD • ${tr.dir} ${reviewed}</div>
          <div class="badge ${cls}">${fmtMoney(tr.pnl)} / ${tr.r.toFixed(2)}R</div>
        </div>
        <div class="label">
          ${tr.date}${tr.session ? " • " + tr.session : ""} • Entry ${tr.entry.toFixed(2)} • SL ${tr.sl.toFixed(2)} • Lot ${tr.lot.toFixed(2)}
        </div>
      `;
      list.appendChild(el);
    });
  }

  // ---------- Canvas drawing ----------
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

  function drawEquityCurve() {
    const c = $("equityCanvas");
    const ctx = c.getContext("2d");
    const w = c.width, h = c.height;
    clearCanvas(ctx, w, h);
    drawAxes(ctx, w, h);

    const trades = state.trades.slice().sort((a,b)=>a.date.localeCompare(b.date));
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

    // baseline 0
    ctx.strokeStyle = "rgba(255,255,255,.10)";
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(padLeft, sy(0));
    ctx.lineTo(w - padRight, sy(0));
    ctx.stroke();

    // line
    ctx.strokeStyle = "rgba(45,212,191,.95)";
    ctx.lineWidth = 2;
    ctx.beginPath();
    points.forEach((p, i) => {
      const x = sx(p.x), y = sy(p.y);
      if (i === 0) ctx.moveTo(x,y);
      else ctx.lineTo(x,y);
    });
    ctx.stroke();

    // last point
    const last = points[points.length-1];
    ctx.fillStyle = "rgba(45,212,191,.95)";
    ctx.beginPath();
    ctx.arc(sx(last.x), sy(last.y), 4, 0, Math.PI*2);
    ctx.fill();

    // labels
    ctx.fillStyle = "rgba(255,255,255,.55)";
    ctx.font = "12px -apple-system, system-ui, Arial";
    ctx.fillText(fmtMoney(minY), 6, sy(minY));
    ctx.fillText(fmtMoney(maxY), 6, sy(maxY));
  }

  function drawRDistribution(tradesFiltered) {
    const c = $("rCanvas");
    const ctx = c.getContext("2d");
    const w = c.width, h = c.height;
    clearCanvas(ctx, w, h);
    drawAxes(ctx, w, h);

    const rs = tradesFiltered.map(t=>t.r).filter(r=>Number.isFinite(r));
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

    const labels = ["<-2R","-2..-1","-1..0","0..1","1..2",">=2R"];
    ctx.fillStyle = "rgba(255,255,255,.55)";
    ctx.font = "12px -apple-system, system-ui, Arial";
    labels.forEach((lab,i)=>{
      ctx.fillText(lab, padLeft + i*barW + 10, h - 10);
    });
  }

  // ---------- New Trade ----------
  function setDefaultDate() { $("fDate").value = new Date().toISOString().slice(0,10); }

  function setDir(dir) {
    $$("#dirSeg .segBtn").forEach(b => b.classList.toggle("active", b.dataset.dir === dir));
  }

  function getDir() {
    const b = $$("#dirSeg .segBtn").find(x => x.classList.contains("active"));
    return b ? b.dataset.dir : "LONG";
  }

  function resetForm() {
    setDir("LONG");
    setDefaultDate();
    $("fSession").value = "";
    ["fEntry","fSL","fTP","fLot","fExit","fPnl","fStrategy","fNotes"].forEach(id => $(id).value = "");
    $("riskUsd").textContent = "$0.00";
    $("rMultiple").textContent = "0.00R";
  }

  function updateLiveRisk() {
    const entry = toNum($("fEntry").value);
    const sl = toNum($("fSL").value);
    const lot = toNum($("fLot").value);
    const exit = toNum($("fExit").value);
    const pnlManual = toNum($("fPnl").value);

    if (entry == null || sl == null || lot == null) {
      $("riskUsd").textContent = "$0.00";
      $("rMultiple").textContent = "0.00R";
      return;
    }

    const risk = riskUsdApprox(entry, sl, lot);
    $("riskUsd").textContent = fmtMoney(risk);

    let pnl = null;
    if (exit != null) pnl = pnlFromExit(entry, exit, lot, getDir());
    else if (pnlManual != null) pnl = pnlManual;

    const r = (pnl == null) ? 0 : rMultiple(pnl, risk);
    $("rMultiple").textContent = `${r.toFixed(2)}R`;
  }

  function addTradeFromForm() {
    const t = I18N[state.lang];

    const date = $("fDate").value || new Date().toISOString().slice(0,10);
    const session = $("fSession").value || "";
    const dir = getDir();

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

    let pnl = null;
    if (exit != null) pnl = pnlFromExit(entry, exit, lot, dir);
    else if (pnlManual != null) pnl = pnlManual;

    if (pnl == null) {
      alert(t.needFields);
      return;
    }

    const risk = riskUsdApprox(entry, sl, lot);
    const r = rMultiple(pnl, risk);

    const trade = {
      id: crypto?.randomUUID ? crypto.randomUUID() : String(Date.now()) + Math.random().toString(16).slice(2),
      date,
      session,
      symbol: "XAUUSD",
      dir,
      entry,
      sl,
      tp: tp == null ? null : tp,
      lot,
      exit: exit == null ? null : exit,
      pnl: +pnl.toFixed(2),
      riskUsd: +risk.toFixed(2),
      r: +r.toFixed(2),
      strategy: ($("fStrategy").value || "").trim(),
      notes: ($("fNotes").value || "").trim(),
      review: { plan: "YES", mistake: "", notes: "" }
    };

    state.trades.push(trade);
    saveState(state);

    alert(t.saved);
    resetForm();
    renderAll();
    setActiveTab("dash");
  }

  // ---------- Stats ----------
  function getFilteredTrades() {
    if (state.statsFilter === "MONTH") return state.trades.filter(tr => isThisMonth(tr.date));
    return state.trades.slice();
  }

  function renderStats() {
    const trades = getFilteredTrades();
    const rs = trades.map(t => t.r).filter(r => Number.isFinite(r));
    const exp = rs.length ? (rs.reduce((a,b)=>a+b,0)/rs.length) : 0;
    const best = rs.length ? Math.max(...rs) : 0;
    const worst = rs.length ? Math.min(...rs) : 0;

    $("sTrades").textContent = String(trades.length);
    $("sExp").textContent = `${exp.toFixed(2)}R`;
    $("sBest").textContent = `${best.toFixed(2)}R`;
    $("sWorst").textContent = `${worst.toFixed(2)}R`;

    drawRDistribution(trades);

    const counts = {};
    trades.forEach(tr => {
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

  // ---------- Review (FIXED) ----------
  function clearReviewFormUI() {
    // Make it "blank default" after save
    setPlan("YES");
    $("mistakeType").value = "";
    $("reviewNotes").value = "";
  }

  function renderReviewSelect(keepSelectedId = null) {
    const sel = $("reviewSelect");
    const current = keepSelectedId || sel.value || "";

    sel.innerHTML = "";

    if (!state.trades.length) {
      sel.innerHTML = `<option value="">No trades</option>`;
      return;
    }

    state.trades.slice().reverse().forEach(tr => {
      const opt = document.createElement("option");
      opt.value = tr.id;
      opt.textContent = `${tr.date} • ${tr.dir} • ${fmtMoney(tr.pnl)} • ${tr.r.toFixed(2)}R`;
      sel.appendChild(opt);
    });

    const exists = state.trades.some(t => t.id === current);
    sel.value = exists ? current : state.trades[state.trades.length - 1].id;
  }

  function getSelectedTrade() {
    const id = $("reviewSelect").value;
    return state.trades.find(t => t.id === id) || null;
  }

  function setPlan(plan) {
    $$("#planSeg .segBtn").forEach(b => b.classList.toggle("active", b.dataset.plan === plan));
  }

  function getPlan() {
    const b = $$("#planSeg .segBtn").find(x => x.classList.contains("active"));
    return b ? b.dataset.plan : "YES";
  }

  function renderReview(firstOpen = false) {
    const t = I18N[state.lang];
    const sel = $("reviewSelect");

    if (!state.trades.length) {
      sel.innerHTML = "";
      $("reviewMeta").textContent = t.noTradesYet;
      clearReviewFormUI();
      return;
    }

    // Keep the current selection (don't override user choice)
    renderReviewSelect(sel.value);

    // If it's first open and nothing selected yet, pick latest
    if (firstOpen && !sel.value) {
      sel.value = state.trades[state.trades.length - 1].id;
    }

    const tr = getSelectedTrade();
    if (!tr) return;

    $("reviewMeta").textContent =
      `XAUUSD • ${tr.dir} • ${tr.date}${tr.session ? " • " + tr.session : ""} • Entry ${tr.entry.toFixed(2)} • SL ${tr.sl.toFixed(2)} • Lot ${tr.lot.toFixed(2)} • ${fmtMoney(tr.pnl)} • ${tr.r.toFixed(2)}R`;

    // IMPORTANT: show existing review data
    const rev = tr.review || { plan: "YES", mistake: "", notes: "" };
    setPlan(rev.plan || "YES");
    $("mistakeType").value = rev.mistake || "";
    $("reviewNotes").value = rev.notes || "";
  }

  function saveReview() {
    const t = I18N[state.lang];
    const tr = getSelectedTrade();
    if (!tr) return;

    tr.review = {
      plan: getPlan(),
      mistake: $("mistakeType").value || "",
      notes: ($("reviewNotes").value || "").trim()
    };

    saveState(state);

    // After save: clear UI (blank default) but keep selected trade
    alert(t.saved);
    clearReviewFormUI();
    renderAll();
  }

  function clearReview() {
    const tr = getSelectedTrade();
    if (!tr) return;

    tr.review = { plan: "YES", mistake: "", notes: "" };
    saveState(state);

    // After clear: clear UI
    clearReviewFormUI();
    renderAll();
  }

  // ---------- Export/Import/Reset ----------
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
        saveState(state);
        applyLang();
        renderAll();
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
    applyLang();
    resetForm();
    clearReviewFormUI();
    renderAll();
  }

  // ---------- Render all ----------
  function renderAll() {
    const dash = calcDashboard(state.trades);
    $("totalPnl").textContent = fmtMoney(dash.totalPnl);
    $("winRate").textContent = `${dash.winRate.toFixed(0)}%`;
    $("avgR").textContent = `${dash.avgR.toFixed(2)}R`;

    $("eqModeBadge").textContent =
      (state.statsFilter === "MONTH") ? I18N[state.lang].statsMonth : I18N[state.lang].statsAll;

    renderTradesList();
    drawEquityCurve();
    renderStats();
    // NOTE: do NOT force rerender review here to avoid overriding selection
  }

  // ---------- Demo trade ----------
  function addDemoTrade() {
    const date = new Date().toISOString().slice(0,10);
    const dir = Math.random() > 0.5 ? "LONG" : "SHORT";
    const entry = 2356.2;
    const sl = 2350.8;
    const lot = 0.1;
    const exit = dir === "LONG" ? 2360.6 : 2352.2;
    const pnl = pnlFromExit(entry, exit, lot, dir);
    const risk = riskUsdApprox(entry, sl, lot);
    const r = rMultiple(pnl, risk);

    state.trades.push({
      id: crypto?.randomUUID ? crypto.randomUUID() : String(Date.now()) + Math.random().toString(16).slice(2),
      date,
      session: "NY",
      symbol: "XAUUSD",
      dir,
      entry,
      sl,
      tp: null,
      lot,
      exit,
      pnl: +pnl.toFixed(2),
      riskUsd: +risk.toFixed(2),
      r: +r.toFixed(2),
      strategy: "Demo",
      notes: "Demo trade",
      review: { plan: "YES", mistake: "", notes: "" }
    });

    saveState(state);
    renderAll();
  }

  // ---------- Wire events ----------
  $$(".tab").forEach(btn => btn.addEventListener("click", () => setActiveTab(btn.dataset.route)));

  $("goNewBtn").addEventListener("click", () => setActiveTab("new"));
  $("goStatsBtn").addEventListener("click", () => setActiveTab("stats"));

  $("langBtn").addEventListener("click", () => {
    state.lang = (state.lang === "EN") ? "HE" : "EN";
    saveState(state);
    applyLang();
    renderAll();
  });

  // Direction seg
  $$("#dirSeg .segBtn").forEach(b => {
    b.addEventListener("click", () => {
      $$("#dirSeg .segBtn").forEach(x => x.classList.remove("active"));
      b.classList.add("active");
      updateLiveRisk();
    });
  });

  // Plan seg
  $$("#planSeg .segBtn").forEach(b => {
    b.addEventListener("click", () => {
      $$("#planSeg .segBtn").forEach(x => x.classList.remove("active"));
      b.classList.add("active");
    });
  });

  ["fEntry","fSL","fLot","fExit","fPnl"].forEach(id => $(id).addEventListener("input", updateLiveRisk));

  $("resetFormBtn").addEventListener("click", resetForm);
  $("saveTradeBtn").addEventListener("click", addTradeFromForm);

  $("addDemoBtn").addEventListener("click", addDemoTrade);

  // Stats filter
  $$("#statsFilterSeg .segBtn").forEach(b => {
    b.addEventListener("click", () => {
      $$("#statsFilterSeg .segBtn").forEach(x => x.classList.remove("active"));
      b.classList.add("active");
      state.statsFilter = b.dataset.filter;
      saveState(state);
      renderAll();
    });
  });

  // Review
  $("reviewSelect").addEventListener("change", () => renderReview(false));
  $("pickLastBtn").addEventListener("click", () => {
    if (!state.trades.length) return;
    $("reviewSelect").value = state.trades[state.trades.length - 1].id;
    renderReview(false);
  });

  $("saveReviewBtn").addEventListener("click", saveReview);
  $("clearReviewBtn").addEventListener("click", clearReview);

  // Settings
  $("exportBtn").addEventListener("click", exportJson);
  $("importFile").addEventListener("change", (e) => {
    const f = e.target.files?.[0];
    if (f) importJson(f);
    e.target.value = "";
  });
  $("resetAllBtn").addEventListener("click", resetAll);

  // ---------- Init ----------
  setDefaultDate();
  resetForm();
  applyLang();
  renderAll();
  setActiveTab("dash");
});
