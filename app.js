document.addEventListener("DOMContentLoaded", () => {
  const tg = window.Telegram?.WebApp;
  tg?.ready();
  tg?.expand();

  const STORAGE_KEY = "adigafx_tj_v3";

  const I18N = {
    EN: {
      tabDash:"Dashboard", tabCheck:"Checklist", tabNew:"New Trade", tabClose:"Close Trade", tabStats:"Stats", tabReview:"Review", tabAll:"All Trades", tabSettings:"Settings",
      appDash:"AdigaFX • Dashboard", appCheck:"AdigaFX • Checklist", appNew:"AdigaFX • New Trade", appClose:"AdigaFX • Close Trade", appStats:"AdigaFX • Stats", appReview:"AdigaFX • Trade Review", appAll:"AdigaFX • All Trades", appSettings:"Settings",
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
      modalSearch:"Search: date / LONG / SHORT / pnl…",
      mustCheckAll:"Please tick ALL checklist items to add the trade."
    },
    HE: {
      tabDash:"דשבורד", tabCheck:"צ׳ק ליסט", tabNew:"טרייד חדש", tabClose:"סגירת טרייד", tabStats:"סטטיסטיקות", tabReview:"ביקורת", tabAll:"כל העסקאות", tabSettings:"הגדרות",
      appDash:"AdigaFX • דשבורד", appCheck:"AdigaFX • צ׳ק ליסט", appNew:"AdigaFX • טרייד חדש", appClose:"AdigaFX • סגירת טרייד", appStats:"AdigaFX • סטטיסטיקות", appReview:"AdigaFX • ביקורת עסקה", appAll:"AdigaFX • כל העסקאות", appSettings:"הגדרות",
      sub:"XAUUSD בלבד • שמירה מקומית",
      saved:"נשמר!",
      needFields:"מלא Entry / SL / Lot.",
      needClose:"בחר עסקה פתוחה והכנס Exit או PnL.",
      noTrades:"אין עסקאות עדיין.",
      noOpen:"אין עסקאות פתוחות.",
      confirmReset:"לאפס את כל הנתונים המקומיים? אי אפשר לבטל.",
      importOk:"הייבוא הושלם.",
      importBad:"קובץ JSON לא תקין.",
      pickTap:"לחץ לבחירה…",
      modalReviewTitle:"בחר עסקה",
      modalCloseTitle:"בחר עסקה פתוחה",
      modalSearch:"חיפוש: תאריך / לונג / שורט / רווח…",
      mustCheckAll:"סמן V על כל הצ׳ק ליסט ואז אפשר להוסיף."
    }
  };

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

  const setDefaultDate = (id) => { const el = $(id); if (el) el.value = new Date().toISOString().slice(0,10); };

  // XAUUSD model: 1 lot = 100oz
  const riskUsdApprox = (entry, sl, lot) => Math.abs(entry - sl) * lot * 100;

  const pnlFromExit = (entry, exit, lot, dir) => {
    const delta = (exit - entry) * lot * 100;
    return dir === "SHORT" ? -delta : delta;
  };

  const rMultiple = (pnl, riskUsd) => (!riskUsd || riskUsd <= 0) ? 0 : (pnl / riskUsd);

  const isThisMonth = (dateStr) => {
    const d = new Date(dateStr);
    const now = new Date();
    return d.getFullYear() === now.getFullYear() && d.getMonth() === now.getMonth();
  };

  const uid = () => (crypto?.randomUUID ? crypto.randomUUID() : String(Date.now()) + Math.random().toString(16).slice(2));

  const defaultState = {
    lang: "EN",
    trades: [],
    statsFilter: "ALL",
    reviewSelectedId: "",
    closeSelectedId: ""
  };

  function loadState(){
    try { return { ...defaultState, ...(JSON.parse(localStorage.getItem(STORAGE_KEY)) || {}) }; }
    catch { return { ...defaultState }; }
  }

  let state = loadState();
  const saveState = () => localStorage.setItem(STORAGE_KEY, JSON.stringify(state));

  function applyLang(){
    const t = I18N[state.lang];
    $("langBtn").textContent = state.lang;
    $("appSubtitle").textContent = t.sub;

    $("tabDash").textContent = t.tabDash;
    $("tabCheck").textContent = t.tabCheck;
    $("tabNew").textContent = t.tabNew;
    $("tabClose").textContent = t.tabClose;
    $("tabStats").textContent = t.tabStats;
    $("tabReview").textContent = t.tabReview;
    $("tabAll").textContent = t.tabAll;
    $("tabSettings").textContent = t.tabSettings;

    $("reviewPickBtn").textContent = t.pickTap;
    $("closePickBtn").textContent = t.pickTap;
    $("tradeSearch").placeholder = t.modalSearch;

    document.documentElement.dir = (state.lang === "HE") ? "rtl" : "ltr";
  }

  function setActiveTab(route){
    $$(".tab").forEach(t => t.classList.toggle("active", t.dataset.route === route));
    $$(".screen").forEach(s => s.classList.toggle("active", s.id === `screen-${route}`));

    const t = I18N[state.lang];
    if (route === "dash") $("appTitle").textContent = t.appDash;
    if (route === "check") $("appTitle").textContent = t.appCheck;
    if (route === "new") $("appTitle").textContent = t.appNew;
    if (route === "close") $("appTitle").textContent = t.appClose;
    if (route === "stats") $("appTitle").textContent = t.appStats;
    if (route === "review") $("appTitle").textContent = t.appReview;
    if (route === "all") $("appTitle").textContent = t.appAll;
    if (route === "settings") $("appTitle").textContent = t.appSettings;

    if (route === "dash") renderDashboard();
    if (route === "stats") renderStats();
    if (route === "review") renderReviewUI();
    if (route === "close") renderCloseUI();
    if (route === "check") renderChecklistUI();
    if (route === "all") renderAllTrades();
  }

  function setSegActive(segId, key, val){
    $$("#" + segId + " .segBtn").forEach(b => b.classList.toggle("active", b.dataset[key] === val));
  }
  function getSegActive(segId, key, fallback){
    const b = $$("#" + segId + " .segBtn").find(x => x.classList.contains("active"));
    return b ? b.dataset[key] : fallback;
  }

  function clearCanvas(ctx,w,h){ ctx.clearRect(0,0,w,h); }
  function drawAxes(ctx,w,h){
    ctx.strokeStyle = "rgba(255,255,255,.10)";
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(40, 10);
    ctx.lineTo(40, h - 30);
    ctx.lineTo(w - 10, h - 30);
    ctx.stroke();
  }

  function drawEquityCurve(closedTrades){
    const c = $("equityCanvas");
    const ctx = c.getContext("2d");
    const w = c.width, h = c.height;
    clearCanvas(ctx,w,h);
    drawAxes(ctx,w,h);

    const trades = closedTrades.slice().sort((a,b)=>a.date.localeCompare(b.date));
    if (!trades.length) return;

    let eq = 0;
    const points = trades.map((tr, i) => {
      eq += (tr.pnl || 0);
      return { x:i, y:eq };
    });

    const minY = Math.min(...points.map(p=>p.y), 0);
    const maxY = Math.max(...points.map(p=>p.y), 0);

    const padLeft=40, padRight=10, padTop=10, padBottom=30;
    const plotW = w - padLeft - padRight;
    const plotH = h - padTop - padBottom;

    const sx = (x) => points.length === 1 ? padLeft + plotW/2 : padLeft + (x/(points.length-1))*plotW;
    const sy = (y) => (maxY === minY) ? padTop + plotH/2 : padTop + (1 - ((y - minY)/(maxY - minY))) * plotH;

    ctx.strokeStyle="rgba(255,255,255,.10)";
    ctx.lineWidth=1;
    ctx.beginPath();
    ctx.moveTo(padLeft, sy(0));
    ctx.lineTo(w - padRight, sy(0));
    ctx.stroke();

    ctx.strokeStyle="rgba(45,212,191,.95)";
    ctx.lineWidth=2;
    ctx.beginPath();
    points.forEach((p,i)=>{
      const x=sx(p.x), y=sy(p.y);
      if(i===0) ctx.moveTo(x,y); else ctx.lineTo(x,y);
    });
    ctx.stroke();
  }

  function drawRDistribution(closedTrades){
    const c = $("rCanvas");
    const ctx = c.getContext("2d");
    const w = c.width, h = c.height;
    clearCanvas(ctx,w,h);
    drawAxes(ctx,w,h);

    const rs = closedTrades.map(t=>t.r).filter(r=>Number.isFinite(r));
    if (!rs.length) return;

    const bins=[0,0,0,0,0,0];
    rs.forEach(r=>{
      if(r < -2) bins[0]++; else
      if(r < -1) bins[1]++; else
      if(r < 0) bins[2]++; else
      if(r < 1) bins[3]++; else
      if(r < 2) bins[4]++; else bins[5]++;
    });

    const maxB = Math.max(...bins, 1);
    const padLeft=40, padRight=10, padTop=10, padBottom=30;
    const plotW = w - padLeft - padRight;
    const plotH = h - padTop - padBottom;
    const barW = plotW / bins.length;

    ctx.fillStyle="rgba(59,130,246,.65)";
    bins.forEach((b,i)=>{
      const bh = (b/maxB) * plotH;
      const x = padLeft + i*barW + 8;
      const y = padTop + (plotH - bh);
      ctx.fillRect(x,y,barW-16,bh);
    });
  }

  const getClosedTradesAll = () => state.trades.filter(t => t.status === "CLOSED");
  const getOpenTradesAll = () => state.trades.filter(t => t.status === "OPEN");

  function calcDashboardClosed(closedTrades){
    const totalPnl = closedTrades.reduce((s,tr)=>s+(tr.pnl||0),0);
    const wins = closedTrades.filter(tr => (tr.r||0) > 0).length;
    const winRate = closedTrades.length ? (wins/closedTrades.length)*100 : 0;
    const avgR = closedTrades.length ? closedTrades.reduce((s,tr)=>s+(tr.r||0),0)/closedTrades.length : 0;
    return { totalPnl, winRate, avgR };
  }

  function addTradeCommon(payload){
    const trade = {
      id: uid(),
      symbol: "XAUUSD",
      review: { plan:"YES", mistake:"", notes:"" },
      ...payload
    };
    state.trades.push(trade);

    if (!state.reviewSelectedId) state.reviewSelectedId = trade.id;
    if (!state.closeSelectedId && trade.status === "OPEN") state.closeSelectedId = trade.id;

    saveState();
  }

  function escapeHtml(s){
    return String(s ?? "")
      .replaceAll("&","&amp;")
      .replaceAll("<","&lt;")
      .replaceAll(">","&gt;")
      .replaceAll('"',"&quot;")
      .replaceAll("'","&#039;");
  }

  function renderTradesList(){
    const t = I18N[state.lang];
    const list = $("tradesList");
    list.innerHTML = "";

    if (!state.trades.length){
      list.innerHTML = `<div class="item"><div class="label">${t.noTrades}</div></div>`;
      return;
    }

    state.trades.slice().reverse().forEach(tr=>{
      const statusBadge = tr.status === "OPEN" ? `<span class="badge soft">OPEN</span>` : `<span class="badge soft">CLOSED</span>`;
      const cls = tr.status === "CLOSED" ? (tr.pnl > 0 ? "green" : tr.pnl < 0 ? "red" : "") : "";
      const pnlText = tr.status === "OPEN" ? "—" : fmtMoney(tr.pnl || 0);
      const rText = tr.status === "OPEN" ? "—" : `${(tr.r || 0).toFixed(2)}R`;

      const el = document.createElement("div");
      el.className="item";
      el.innerHTML = `
        <div class="itemTop">
          <div>XAUUSD • ${tr.dir} ${statusBadge}</div>
          <div class="badge ${cls}">${pnlText} / ${rText}</div>
        </div>
        <div class="label">
          ${tr.date}${tr.session ? " • " + tr.session : ""} • Entry ${tr.entry.toFixed(2)} • SL ${tr.sl.toFixed(2)} • Lot ${tr.lot.toFixed(2)}
        </div>
        <div class="row2" style="margin-top:8px;">
          <button class="btn ghost" type="button" data-act="review" data-id="${tr.id}">🧠 Review</button>
          <button class="btn ghost" type="button" data-act="${tr.status === "OPEN" ? "close" : "all"}" data-id="${tr.id}">
            ${tr.status === "OPEN" ? "🏁 Close" : "📋 All"}
          </button>
        </div>
      `;
      el.querySelectorAll("button[data-act]").forEach(btn=>{
        btn.addEventListener("click", ()=>{
          const act = btn.getAttribute("data-act");
          const id = btn.getAttribute("data-id");
          if (act === "review"){ state.reviewSelectedId = id; saveState(); setActiveTab("review"); }
          if (act === "close"){ state.closeSelectedId = id; saveState(); setActiveTab("close"); }
          if (act === "all"){ setActiveTab("all"); }
        });
      });
      list.appendChild(el);
    });
  }

  function renderDashboard(){
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

  function resetNewForm(){
    setSegActive("dirSeg","dir","LONG");
    setDefaultDate("fDate");
    $("fSession").value="";
    ["fEntry","fSL","fTP","fLot","fExit","fPnl","fStrategy","fNotes"].forEach(id => $(id).value="");
    $("riskUsd").textContent="$0.00";
    $("rMultiple").textContent="0.00R";
  }

  function updateNewLiveRisk(){
    const entry = toNum($("fEntry").value);
    const sl = toNum($("fSL").value);
    const lot = toNum($("fLot").value);
    const exit = toNum($("fExit").value);
    const pnlManual = toNum($("fPnl").value);
    const dir = getSegActive("dirSeg","dir","LONG");

    if (entry==null || sl==null || lot==null){
      $("riskUsd").textContent="$0.00";
      $("rMultiple").textContent="0.00R";
      return;
    }

    const risk = riskUsdApprox(entry, sl, lot);
    $("riskUsd").textContent = fmtMoney(risk);

    let pnl=null;
    if (exit!=null) pnl = pnlFromExit(entry, exit, lot, dir);
    else if (pnlManual!=null) pnl = pnlManual;

    const r = pnl==null ? 0 : rMultiple(pnl, risk);
    $("rMultiple").textContent = `${r.toFixed(2)}R`;
  }

  function saveNewTrade(){
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

    if (entry==null || sl==null || lot==null){
      alert(t.needFields);
      return;
    }

    const risk = riskUsdApprox(entry, sl, lot);
    let status = "OPEN";
    let pnl = 0;
    let r = 0;

    if (exit!=null || pnlManual!=null){
      status = "CLOSED";
      pnl = exit!=null ? pnlFromExit(entry, exit, lot, dir) : pnlManual;
      r = rMultiple(pnl, risk);
    }

    addTradeCommon({
      dir, date, session,
      entry, sl, tp: tp==null ? null : tp, lot,
      status,
      exit: exit==null ? null : exit,
      pnl: status==="CLOSED" ? pnl : 0,
      riskUsd: risk,
      r: status==="CLOSED" ? r : 0,
      strategy: $("fStrategy").value || "",
      notes: $("fNotes").value || ""
    });

    alert(t.saved);
    resetNewForm();
    renderDashboard();
    setActiveTab("dash");
  }

  function resetChecklist(){
    setSegActive("cDirSeg","dir","LONG");
    setDefaultDate("cDate");
    $("cSession").value="";
    ["cEntry","cSL","cTP","cLot","cNotes"].forEach(id => $(id).value="");
    $$(".cBox").forEach(b=>b.checked=false);
    $("cRiskUsd").textContent="$0.00";
    $("cREst").textContent="1.00R";
  }

  function updateChecklistRisk(){
    const entry = toNum($("cEntry").value);
    const sl = toNum($("cSL").value);
    const lot = toNum($("cLot").value);
    if (entry==null || sl==null || lot==null){
      $("cRiskUsd").textContent="$0.00";
      $("cREst").textContent="1.00R";
      return;
    }
    const risk = riskUsdApprox(entry, sl, lot);
    $("cRiskUsd").textContent = fmtMoney(risk);
    $("cREst").textContent = "1.00R";
  }

  function renderChecklistUI(){
    if (!$("cDate").value) setDefaultDate("cDate");
    updateChecklistRisk();
  }

  function addFromChecklist(){
    const t = I18N[state.lang];

    const dir = getSegActive("cDirSeg","dir","LONG");
    const date = $("cDate").value || new Date().toISOString().slice(0,10);
    const session = $("cSession").value || "";

    const entry = toNum($("cEntry").value);
    const sl = toNum($("cSL").value);
    const tp = toNum($("cTP").value);
    const lot = toNum($("cLot").value);

    if (entry==null || sl==null || lot==null){
      alert(t.needFields);
      return;
    }

    const allChecked = $$(".cBox").every(b => b.checked);
    if (!allChecked){
      alert(t.mustCheckAll);
      return;
    }

    const risk = riskUsdApprox(entry, sl, lot);

    addTradeCommon({
      dir, date, session,
      entry, sl, tp: tp==null ? null : tp, lot,
      status:"OPEN",
      exit:null,
      pnl:0,
      riskUsd:risk,
      r:0,
      strategy:"Checklist",
      notes: $("cNotes").value || ""
    });

    alert(t.saved);
    resetChecklist();
    renderDashboard();
    setActiveTab("dash");
  }

  // Modal picker
  const modalBack = $("tradeModalBack");
  const modal = $("tradeModal");
  const modalTitle = $("tradeModalTitle");
  const modalList = $("tradeModalList");
  const modalSearch = $("tradeSearch");

  let modalMode = "REVIEW";
  let modalItems = [];

  function rebuildModalItems(){
    const trades = modalMode === "CLOSE"
      ? state.trades.filter(t => t.status === "OPEN")
      : state.trades.slice();

    const list = trades.slice().reverse();
    modalItems = list.map(tr=>{
      const pnlTxt = tr.status==="OPEN" ? "OPEN" : fmtMoney(tr.pnl||0);
      const rTxt = tr.status==="OPEN" ? "" : ` • ${(tr.r||0).toFixed(2)}R`;
      const top = `${tr.date} • ${tr.dir} • ${pnlTxt}${rTxt}`;
      const sub = `Entry ${tr.entry.toFixed(2)} • SL ${tr.sl.toFixed(2)} • Lot ${tr.lot.toFixed(2)}${tr.session ? " • "+tr.session : ""}`;
      return { id: tr.id, top, sub, s: (top+" "+sub).toLowerCase() };
    });
  }

  function renderModalList(q){
    const query = (q || "").trim().toLowerCase();
    const filtered = query ? modalItems.filter(x => x.s.includes(query)) : modalItems;

    modalList.innerHTML = "";
    if (!filtered.length){
      const t = I18N[state.lang];
      modalList.innerHTML = `<div class="item"><div class="label">${modalMode==="CLOSE" ? t.noOpen : t.noTrades}</div></div>`;
      return;
    }

    filtered.forEach(it=>{
      const btn = document.createElement("button");
      btn.type="button";
      btn.className="pickItem";
      btn.innerHTML = `
        <div class="pickItemMain">
          <div class="pickItemTop">${escapeHtml(it.top)}</div>
          <div class="pickItemSub">${escapeHtml(it.sub)}</div>
        </div>
        <span class="badge soft">Select</span>
      `;
      btn.addEventListener("click",(e)=>{
        e.preventDefault(); e.stopPropagation();
        if (modalMode==="REVIEW"){
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

  function openModal(mode){
    modalMode = mode;
    const t = I18N[state.lang];
    modalTitle.textContent = mode==="CLOSE" ? t.modalCloseTitle : t.modalReviewTitle;
    modalSearch.value="";
    rebuildModalItems();
    renderModalList("");
    modalBack.classList.add("open");
    modal.classList.add("open");
  }
  function closeModal(){
    modalBack.classList.remove("open");
    modal.classList.remove("open");
  }

  function getTradeById(id){ return state.trades.find(t=>t.id===id) || null; }

  function setPlanSeg(val){ setSegActive("planSeg","plan",val); }
  function getPlanSeg(){ return getSegActive("planSeg","plan","YES"); }

  function renderReviewUI(preserveInputs=false){
    const t = I18N[state.lang];
    const trades = state.trades.slice().reverse();
    let sel = getTradeById(state.reviewSelectedId);

    if (!sel && trades.length){
      state.reviewSelectedId = trades[0].id;
      saveState();
      sel = getTradeById(state.reviewSelectedId);
    }

    $("reviewPickBtn").textContent = sel
      ? `${sel.date} • ${sel.dir} • ${sel.status==="OPEN" ? "OPEN" : fmtMoney(sel.pnl||0)}`
      : t.pickTap;

    $("reviewMeta").textContent = sel
      ? `XAUUSD • ${sel.dir} • ${sel.date}${sel.session ? " • "+sel.session : ""} • Entry ${sel.entry.toFixed(2)} • SL ${sel.sl.toFixed(2)} • Lot ${sel.lot.toFixed(2)}`
      : "No trade selected.";

    if (!sel) return;

    if (!preserveInputs){
      const rev = sel.review || { plan:"YES", mistake:"", notes:"" };
      setPlanSeg(rev.plan || "YES");
      $("mistakeType").value = rev.mistake || "";
      $("reviewNotes").value = rev.notes || "";
    }
  }

  function clearReviewForm(){
    setPlanSeg("YES");
    $("mistakeType").value="";
    $("reviewNotes").value="";
  }

  function saveReview(){
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

    // behavior you asked: after save -> clear + return to empty default
    clearReviewForm();
    state.reviewSelectedId = "";
    saveState();
    $("reviewPickBtn").textContent = t.pickTap;
    $("reviewMeta").textContent = "No trade selected.";
    renderStats();
    renderAllTrades();
  }

  function renderCloseUI(preserveInputs=false){
    const t = I18N[state.lang];
    const openTrades = getOpenTradesAll().slice().reverse();

    let sel = getTradeById(state.closeSelectedId);
    if (!sel || sel.status !== "OPEN"){
      sel = openTrades.length ? openTrades[0] : null;
      state.closeSelectedId = sel ? sel.id : "";
      saveState();
    }

    $("closePickBtn").textContent = sel ? `${sel.date} • ${sel.dir} • OPEN` : t.pickTap;

    $("closeMeta").textContent = sel
      ? `XAUUSD • ${sel.dir} • ${sel.date}${sel.session ? " • "+sel.session : ""} • Entry ${sel.entry.toFixed(2)} • SL ${sel.sl.toFixed(2)} • Lot ${sel.lot.toFixed(2)}`
      : t.noOpen;

    if (!sel){
      $("closeRisk").textContent="$0.00";
      $("closeR").textContent="0.00R";
      return;
    }

    const risk = sel.riskUsd || riskUsdApprox(sel.entry, sel.sl, sel.lot);
    $("closeRisk").textContent = fmtMoney(risk);

    if (!preserveInputs){
      $("closeExit").value="";
      $("closePnl").value="";
      $("closeR").textContent="0.00R";
    } else {
      updateClosePreview();
    }
  }

  function updateClosePreview(){
    const sel = getTradeById(state.closeSelectedId);
    if (!sel) return;

    const exit = toNum($("closeExit").value);
    const pnlManual = toNum($("closePnl").value);
    const risk = sel.riskUsd || riskUsdApprox(sel.entry, sel.sl, sel.lot);

    let pnl=null;
    if (exit!=null) pnl = pnlFromExit(sel.entry, exit, sel.lot, sel.dir);
    else if (pnlManual!=null) pnl = pnlManual;

    const r = pnl==null ? 0 : rMultiple(pnl, risk);
    $("closeR").textContent = `${r.toFixed(2)}R`;
  }

  function resetCloseForm(){
    $("closeExit").value="";
    $("closePnl").value="";
    $("closeR").textContent="0.00R";
  }

  function closeTradeSave(){
    const t = I18N[state.lang];
    const sel = getTradeById(state.closeSelectedId);
    if (!sel || sel.status !== "OPEN"){
      alert(t.needClose);
      return;
    }

    const exit = toNum($("closeExit").value);
    const pnlManual = toNum($("closePnl").value);
    if (exit==null && pnlManual==null){
      alert(t.needClose);
      return;
    }

    const risk = sel.riskUsd || riskUsdApprox(sel.entry, sel.sl, sel.lot);
    const pnl = exit!=null ? pnlFromExit(sel.entry, exit, sel.lot, sel.dir) : pnlManual;
    const r = rMultiple(pnl, risk);

    sel.status="CLOSED";
    sel.exit = exit==null ? null : exit;
    sel.pnl = pnl;
    sel.r = r;
    sel.riskUsd = risk;

    saveState();
    alert(t.saved);

    resetCloseForm();
    renderDashboard();
    renderStats();
    renderAllTrades();
    setActiveTab("dash");
  }

  function filteredClosedTrades(){
    const closed = getClosedTradesAll();
    if (state.statsFilter === "MONTH") return closed.filter(t=>isThisMonth(t.date));
    return closed;
  }

  function renderMistakes(closedTrades){
    const box = $("mistakeList");
    box.innerHTML="";

    const counts = new Map();
    closedTrades.forEach(tr=>{
      const m = tr.review?.mistake || "";
      if (!m) return;
      counts.set(m, (counts.get(m)||0)+1);
    });

    const arr = Array.from(counts.entries()).sort((a,b)=>b[1]-a[1]);
    if (!arr.length){
      box.innerHTML = `<div class="mini">No mistake data yet.</div>`;
      return;
    }

    arr.forEach(([name,count])=>{
      const row = document.createElement("div");
      row.className="mRow";
      row.innerHTML = `<div>${escapeHtml(name)}</div><div class="badge soft">${count}</div>`;
      box.appendChild(row);
    });
  }

  function renderStats(){
    const closed = filteredClosedTrades();
    const n = closed.length;
    const avgR = n ? closed.reduce((s,t)=>s+(t.r||0),0)/n : 0;
    const best = n ? Math.max(...closed.map(t=>t.r||0)) : 0;
    const worst = n ? Math.min(...closed.map(t=>t.r||0)) : 0;

    $("sTrades").textContent = String(n);
    $("sExp").textContent = `${avgR.toFixed(2)}R`;
    $("sBest").textContent = `${best.toFixed(2)}R`;
    $("sWorst").textContent = `${worst.toFixed(2)}R`;

    drawRDistribution(closed);
    renderMistakes(closed);
  }

  // All Trades + export
  function toCSVRow(arr){
    return arr.map(v => `"${String(v ?? "").replaceAll('"','""')}"`).join(",");
  }

  function exportCSV(){
    const header = ["id","symbol","status","date","session","dir","entry","sl","tp","exit","lot","pnl","r","riskUsd","strategy","notes","review_plan","review_mistake","review_notes"];
    const rows = state.trades.map(tr => ([
      tr.id, tr.symbol, tr.status, tr.date, tr.session, tr.dir,
      tr.entry, tr.sl, tr.tp ?? "", tr.exit ?? "", tr.lot,
      tr.status==="CLOSED" ? (tr.pnl ?? "") : "",
      tr.status==="CLOSED" ? (tr.r ?? "") : "",
      tr.riskUsd ?? "",
      tr.strategy ?? "", tr.notes ?? "",
      tr.review?.plan ?? "", tr.review?.mistake ?? "", tr.review?.notes ?? ""
    ]));

    const csv = [toCSVRow(header), ...rows.map(toCSVRow)].join("\n");
    const blob = new Blob([csv], { type:"text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href=url; a.download="adigafx_trades.csv";
    document.body.appendChild(a); a.click(); a.remove();
    URL.revokeObjectURL(url);
  }

  function exportJSON(){
    const data = JSON.stringify(state, null, 2);
    const blob = new Blob([data], { type:"application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href=url; a.download="adigafx_trade_journal.json";
    document.body.appendChild(a); a.click(); a.remove();
    URL.revokeObjectURL(url);
  }

  function renderAllTrades(){
    const filter = $("allFilter")?.value || "ALL";
    const sort = $("allSort")?.value || "NEWEST";
    const q = ($("allSearch")?.value || "").trim().toLowerCase();

    let items = state.trades.slice();

    if (filter==="OPEN") items = items.filter(t=>t.status==="OPEN");
    if (filter==="CLOSED") items = items.filter(t=>t.status==="CLOSED");

    if (q){
      items = items.filter(tr=>{
        const pnlTxt = tr.status==="CLOSED" ? String(tr.pnl ?? "") : "open";
        const rTxt = tr.status==="CLOSED" ? String(tr.r ?? "") : "";
        const s = [
          tr.date, tr.session, tr.dir, tr.status,
          tr.entry, tr.sl, tr.tp, tr.exit, tr.lot,
          pnlTxt, rTxt,
          tr.strategy, tr.notes,
          tr.review?.plan, tr.review?.mistake, tr.review?.notes
        ].join(" ").toLowerCase();
        return s.includes(q);
      });
    }

    const num = (x) => (Number.isFinite(x) ? x : 0);
    if (sort==="NEWEST") items.sort((a,b)=>b.date.localeCompare(a.date));
    if (sort==="OLDEST") items.sort((a,b)=>a.date.localeCompare(b.date));
    if (sort==="PNL_DESC") items.sort((a,b)=>num(b.pnl)-num(a.pnl));
    if (sort==="PNL_ASC") items.sort((a,b)=>num(a.pnl)-num(b.pnl));
    if (sort==="R_DESC") items.sort((a,b)=>num(b.r)-num(a.r));
    if (sort==="R_ASC") items.sort((a,b)=>num(a.r)-num(b.r));

    const list = $("allTradesList");
    list.innerHTML="";

    if (!items.length){
      list.innerHTML = `<div class="item"><div class="label">No trades</div></div>`;
      return;
    }

    items.forEach(tr=>{
      const pnlTxt = tr.status==="CLOSED" ? fmtMoney(tr.pnl || 0) : "—";
      const rTxt = tr.status==="CLOSED" ? `${(tr.r||0).toFixed(2)}R` : "—";
      const cls = tr.status==="CLOSED" ? (tr.pnl > 0 ? "green" : tr.pnl < 0 ? "red" : "") : "";
      const rev = tr.review || { plan:"YES", mistake:"", notes:"" };

      const card = document.createElement("div");
      card.className="item";
      card.innerHTML = `
        <div class="itemTop">
          <div>XAUUSD • ${escapeHtml(tr.dir)} <span class="badge soft">${escapeHtml(tr.status)}</span></div>
          <div class="badge ${cls}">${escapeHtml(pnlTxt)} / ${escapeHtml(rTxt)}</div>
        </div>

        <div class="label">${escapeHtml(tr.date)}${tr.session ? " • "+escapeHtml(tr.session) : ""}</div>

        <div class="tradeGrid">
          <div class="kv"><div class="k">Entry</div><div class="v">${tr.entry.toFixed(2)}</div></div>
          <div class="kv"><div class="k">Exit</div><div class="v">${tr.exit==null ? "—" : tr.exit.toFixed(2)}</div></div>
          <div class="kv"><div class="k">Stop</div><div class="v">${tr.sl.toFixed(2)}</div></div>
          <div class="kv"><div class="k">TP</div><div class="v">${tr.tp==null ? "—" : tr.tp.toFixed(2)}</div></div>
          <div class="kv"><div class="k">Lot</div><div class="v">${tr.lot.toFixed(2)}</div></div>
          <div class="kv"><div class="k">Strategy</div><div class="v">${escapeHtml(tr.strategy || "—")}</div></div>
        </div>

        <div class="tradeNotes">
          <div class="k">Notes</div>
          <div class="v">${escapeHtml(tr.notes || "—")}</div>
        </div>

        <div class="tradeNotes">
          <div class="k">Review</div>
          <div class="v">Plan: <b>${escapeHtml(rev.plan || "—")}</b><br/>Mistake: <b>${escapeHtml(rev.mistake || "—")}</b><br/>Notes: ${escapeHtml(rev.notes || "—")}</div>
        </div>

        <div class="row2" style="margin-top:10px;">
          <button class="btn ghost" type="button" data-act="review" data-id="${tr.id}">Open Review</button>
          <button class="btn ghost" type="button" data-act="${tr.status==="OPEN" ? "close" : "stats"}" data-id="${tr.id}">
            ${tr.status==="OPEN" ? "Close" : "Stats"}
          </button>
        </div>
      `;

      card.querySelectorAll("button[data-act]").forEach(btn=>{
        btn.addEventListener("click", ()=>{
          const act = btn.getAttribute("data-act");
          const id = btn.getAttribute("data-id");
          if (act==="review"){ state.reviewSelectedId=id; saveState(); setActiveTab("review"); }
          if (act==="close"){ state.closeSelectedId=id; saveState(); setActiveTab("close"); }
          if (act==="stats"){ setActiveTab("stats"); }
        });
      });

      list.appendChild(card);
    });
  }

  function importJSONFile(file){
    const t = I18N[state.lang];
    const reader = new FileReader();
    reader.onload = ()=>{
      try{
        const obj = JSON.parse(String(reader.result || ""));
        if (!obj || typeof obj !== "object" || !Array.isArray(obj.trades)) throw new Error("bad");
        state = { ...defaultState, ...obj };
        saveState();
        applyLang();
        renderDashboard();
        renderStats();
        renderReviewUI();
        renderCloseUI();
        renderAllTrades();
        alert(t.importOk);
      } catch {
        alert(t.importBad);
      }
    };
    reader.readAsText(file);
  }

  function resetAll(){
    const t = I18N[state.lang];
    if (!confirm(t.confirmReset)) return;
    state = { ...defaultState, lang: state.lang };
    saveState();
    resetNewForm();
    resetChecklist();
    resetCloseForm();
    clearReviewForm();
    renderDashboard();
    renderStats();
    renderAllTrades();
    setActiveTab("dash");
  }

  // wiring
  $$(".tab").forEach(b => b.addEventListener("click", ()=>setActiveTab(b.dataset.route)));

  $("langBtn").addEventListener("click", ()=>{
    state.lang = state.lang === "EN" ? "HE" : "EN";
    saveState();
    applyLang();
    const active = $$(".tab").find(x=>x.classList.contains("active"))?.dataset.route || "dash";
    setActiveTab(active);
  });

  $("goCheckBtn").addEventListener("click", ()=>setActiveTab("check"));
  $("goCloseBtn").addEventListener("click", ()=>setActiveTab("close"));

  $("addDemoBtn").addEventListener("click", ()=>{
    const entry=2350, sl=2345, lot=0.1, exit=2360, dir="LONG";
    const risk = riskUsdApprox(entry, sl, lot);
    const pnl = pnlFromExit(entry, exit, lot, dir);
    addTradeCommon({
      dir, date:new Date().toISOString().slice(0,10), session:"NY",
      entry, sl, tp:2365, lot,
      status:"CLOSED",
      exit, pnl, riskUsd:risk, r:rMultiple(pnl, risk),
      strategy:"Demo", notes:"Demo trade"
    });
    renderDashboard();
    renderStats();
    renderAllTrades();
  });

  $$("#dirSeg .segBtn").forEach(b => b.addEventListener("click", ()=>{ setSegActive("dirSeg","dir",b.dataset.dir); updateNewLiveRisk(); }));
  ["fEntry","fSL","fLot","fExit","fPnl"].forEach(id => $(id).addEventListener("input", updateNewLiveRisk));
  $("saveTradeBtn").addEventListener("click", saveNewTrade);
  $("resetFormBtn").addEventListener("click", ()=>{ resetNewForm(); updateNewLiveRisk(); });

  $$("#cDirSeg .segBtn").forEach(b => b.addEventListener("click", ()=>{ setSegActive("cDirSeg","dir",b.dataset.dir); updateChecklistRisk(); }));
  ["cEntry","cSL","cLot"].forEach(id => $(id).addEventListener("input", updateChecklistRisk));
  $("cAddTradeBtn").addEventListener("click", addFromChecklist);
  $("cResetBtn").addEventListener("click", ()=>{ resetChecklist(); updateChecklistRisk(); });

  $$("#planSeg .segBtn").forEach(b => b.addEventListener("click", ()=>setPlanSeg(b.dataset.plan)));
  $("pickLastBtn").addEventListener("click", ()=>{
    const last = state.trades.slice().reverse()[0];
    if (!last) return;
    state.reviewSelectedId = last.id;
    saveState();
    renderReviewUI();
  });
  $("saveReviewBtn").addEventListener("click", saveReview);
  $("clearReviewBtn").addEventListener("click", clearReviewForm);

  ["closeExit","closePnl"].forEach(id => $(id).addEventListener("input", updateClosePreview));
  $("closeTradeBtn").addEventListener("click", closeTradeSave);
  $("closeResetBtn").addEventListener("click", resetCloseForm);

  $$("#statsFilterSeg .segBtn").forEach(b => b.addEventListener("click", ()=>{
    $$("#statsFilterSeg .segBtn").forEach(x=>x.classList.remove("active"));
    b.classList.add("active");
    state.statsFilter = b.dataset.filter;
    saveState();
    renderStats();
  }));

  $("exportBtn").addEventListener("click", exportJSON);
  $("importFile").addEventListener("change", (e)=>{
    const file = e.target.files?.[0];
    e.target.value="";
    if (!file) return;
    importJSONFile(file);
  });
  $("resetAllBtn").addEventListener("click", resetAll);

  $("allFilter").addEventListener("change", renderAllTrades);
  $("allSort").addEventListener("change", renderAllTrades);
  $("allSearch").addEventListener("input", renderAllTrades);
  $("exportCsvBtn").addEventListener("click", exportCSV);
  $("exportJsonBtn2").addEventListener("click", exportJSON);

  $("reviewPickBtn").addEventListener("click", ()=>openModal("REVIEW"));
  $("closePickBtn").addEventListener("click", ()=>openModal("CLOSE"));
  $("tradeModalClose").addEventListener("click", closeModal);
  modalBack.addEventListener("click", closeModal);
  modalSearch.addEventListener("input", ()=>renderModalList(modalSearch.value));
  modal.addEventListener("click", (e)=>e.stopPropagation());
  modal.addEventListener("touchstart", (e)=>e.stopPropagation(), { passive:true });

  applyLang();
  setDefaultDate("fDate");
  setDefaultDate("cDate");
  setSegActive("dirSeg","dir","LONG");
  setSegActive("cDirSeg","dir","LONG");
  setSegActive("planSeg","plan","YES");

  resetNewForm();
  resetChecklist();
  renderDashboard();
  renderStats();
  renderAllTrades();
  renderReviewUI();
  renderCloseUI();

  setActiveTab("dash");
});
