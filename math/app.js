/* 매일 수학 10분 — 아이 화면 */
(function () {
  "use strict";
  const C = window.Curriculum, V = window.MathVisual, S = window.MathStore, Sc = window.MathSchedule, F = window.MathFriends, A = window.MathAvatar;
  const $ = function (id) { return document.getElementById(id); };
  const storage = window.localStorage;
  const Learn = window.MathLearning;
  const Play = window.MathPlayground;
  let hintStep = 0, sessionMode = "adventure", recovered = 0, nextTimer = null;
  let state = S.load(storage);
  const PRAISE = ["맞았어요", "정확해요", "잘했어요", "좋아요", "그렇지!", "딩동댕"];
  let session = null, index = 0, current = null, typed = "", shownAt = 0, firstTry = true, results = [], lastLine = "";
  let lastEntry = null, lastFirst = 0, lastFresh = 0, lastReviews = [];

  function levelInfo() { return C.levelById(state.level); }
  function plan() { return Sc.buildPlan({ start: state.planStart, end: state.planEnd, daysPerWeek: state.planDays, fromLevel: state.planFrom }); }
  function planStatus() { return Sc.status(plan(), Object.keys(state.stamps), state.level, S.today()); }
  function showVisualFirst() {
    const policy = state.visualPolicy === "auto" ? levelInfo().visual : state.visualPolicy;
    return policy === "always";
  }
  function buddy() {
    const today = S.today();
    if (state.buddy && state.buddy.date === today) return F.byId(state.buddy.id);
    return null;
  }
  function ding(ok) {
    if (!state.sound) return;
    try {
      const ctx = ding.ctx || (ding.ctx = new (window.AudioContext || window.webkitAudioContext)());
      const o = ctx.createOscillator(), g = ctx.createGain();
      o.type = "sine"; o.frequency.value = ok ? 880 : 330;
      g.gain.setValueAtTime(0.0001, ctx.currentTime); g.gain.exponentialRampToValueAtTime(0.12, ctx.currentTime + 0.01); g.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + (ok ? 0.35 : 0.2));
      o.connect(g); g.connect(ctx.destination); o.start(); o.stop(ctx.currentTime + 0.4);
    } catch (_) {}
  }
  // 정답 순간 작은 색종이 (CSS만, 0.7초)
  function burst() {
    const box = $("burst"); if (!box) return;
    const colors = ["#ff6f9c", "#4aa8ff", "#35c8a5", "#ffcf4a", "#8c6cf5"];
    for (let i = 0; i < 14; i++) {
      const b = document.createElement("b");
      const ang = (Math.PI * 2 * i) / 14 + Math.random() * 0.4, dist = 90 + Math.random() * 90;
      b.style.background = colors[i % colors.length];
      b.style.setProperty("--dx", Math.round(Math.cos(ang) * dist) + "px");
      b.style.setProperty("--dy", Math.round(Math.sin(ang) * dist - 40) + "px");
      box.appendChild(b);
      setTimeout(function () { b.remove(); }, 800);
    }
  }
  function show(id) { ["setup", "placed", "home", "quiz", "capsule", "result", "showcard", "pick", "wardrobe"].forEach(function (v) { $(v).hidden = v !== id; }); window.scrollTo(0, 0); }
  function collectedIds() { const ids = {}; state.album.forEach(function (a) { ids[a.id] = true; }); return Object.keys(ids); }

  /* ---------- 홈 ---------- */
  function renderTrack(st) {
    const track=$("track");track.textContent="";track.setAttribute("role","list");track.setAttribute("aria-label","배움의 구름사다리, 현재 "+state.level+"단계");
    for(let l=1;l<=12;l++) {
      const node=document.createElement("div"),summary=Learn.summary(state,l);
      const mastered=summary.length>0 && summary.every(function(item) {return item.mastered;});
      node.className="level-rung"+(mastered?" mastered":"")+(l===state.level?" here":"");node.setAttribute("role","listitem");
      const number=document.createElement("span");number.textContent=String(l);node.appendChild(number);
      const label=document.createElement("small");label.textContent=l===state.level?"지금":mastered?"익혔어요":"단계";node.appendChild(label);
      node.setAttribute("aria-label",l+"단계, "+C.levelById(l).name+(l===state.level?", 현재 위치":mastered?", 익힌 단계":""));
      if(l===state.level) {node.setAttribute("aria-current","step");const puppy=document.createElement("img");puppy.src="assets/jaei-progress-friends.webp";puppy.alt="";node.appendChild(puppy);}
      track.appendChild(node);
    }
  }
  function renderAlbum() {
    const box = $("album"); box.textContent = "";
    const best = {};
    state.album.forEach(function (a) { if (best[a.id] == null || a.r > best[a.id]) best[a.id] = a.r; });
    const got = Object.keys(best).length;
    F.CHARACTERS.forEach(function (c) {
      const cell = document.createElement("div");
      const has = best[c.id] != null;
      cell.className = "slot" + (has ? " got r" + best[c.id] : " empty");
      cell.innerHTML = F.badge(c, 46);
      const t = document.createElement("span"); t.textContent = has ? c.name : "?"; cell.appendChild(t);
      box.appendChild(cell);
    });
    $("albumCount").textContent = got + " / " + F.CHARACTERS.length + "명";
    const shiny = state.album.filter(function (a) { return a.r >= 1; }).length;
    $("albumNote").textContent = got === F.CHARACTERS.length ? "친구를 전부 만났어요! 이제 반짝·금빛 스티커를 모아요." : (F.CHARACTERS.length - got) + "명이 아직 캡슐 속에 숨어 있어요" + (shiny ? " · 반짝 스티커 " + shiny + "장" : "");
  }
  function renderBuddies() {
    const box = $("buddies"); box.textContent = "";
    const today = S.today(), chosen = buddy();
    // 오늘의 후보 2명: 날짜로 정해지는 친구 + 길잡이 (같으면 다음 친구)
    let a = F.stickerFor(today), b = F.guideFor(state.level);
    if (a.id === b.id) a = F.stickerFor(today + "x");
    [a, b].forEach(function (c) {
      const el = document.createElement("button"); el.type = "button";
      el.className = "buddy" + (chosen && chosen.id === c.id ? " on" : "");
      el.innerHTML = F.badge(c, 52);
      const n = document.createElement("span"); n.textContent = c.name; el.appendChild(n);
      el.addEventListener("click", function () { state.buddy = { id: c.id, date: today }; S.save(storage, state); renderHome(); });
      box.appendChild(el);
    });
  }
  function renderHome() {
    const L = levelInfo(), g = F.guideFor(state.level), today = S.today();
    const doneToday = !!state.stamps[today];
    $("who").textContent = state.name ? state.name + (state.grade ? " · " + state.grade + "학년" : "") : "";
    $("guideBadge").innerHTML = F.badge(g, 64);
    $("homeUnit").textContent = L.unit + " · " + L.id + "단계 · 길잡이 " + g.name;
    $("homeLevel").textContent = L.name;
    $("guideSay").textContent = doneToday
      ? g.name + ": \"오늘 것 끝! 내일 또 만나. 한 번 더 해도 좋아.\""
      : g.name + ": \"" + (state.name || "친구") + "야, 오늘 " + state.perSession + "문제 같이 풀자! 끝나면 캡슐 뽑기야.\"";
    const due = S.dueReviews(state).length;
    $("homeReview").textContent = due ? "지난번에 어려웠던 문제 " + Math.min(due, Math.floor(state.perSession * 0.3)) + "개가 다시 나와요." : "";
    // 연속일·보물상자
    const sk = S.streakInfo(state.stamps, today, state.planDays, Sc.isStudyDay);
    $("streakNum").textContent = sk.days;
    $("streakNote").textContent = sk.days >= 30 ? "한 달 연속! 전설이에요" : sk.days >= 14 ? "2주 연속, 대단해요" : sk.days >= 7 ? "일주일 연속!" : sk.days >= 3 ? sk.days + "일 연속, 불이 붙었어요" : doneToday ? "오늘도 이어졌어요" : "오늘 풀면 이어져요";
    const wk = S.weekInfo(state.stamps, today, state.planDays);
    const chestOpen = !!state.chests[wk.key];
    $("chestNum").textContent = chestOpen ? "열었어요" : wk.done + "/" + wk.need;
    $("chestNote").textContent = chestOpen ? "다음 주에 또 채워요" : wk.ready ? "다 채웠어요! 열어 봐요" : (wk.need - wk.done) + "일 더 하면 열려요";
    $("chestCard").classList.toggle("ready", wk.ready && !chestOpen);
    $("chestImg").src = "assets/3d/" + (wk.ready && !chestOpen ? "chest_open.png" : "chest_closed.png");
    $("chestBtn").hidden = !(wk.ready && !chestOpen);
    // 예고
    const tease = F.stickerFor(S.addDays(today, 1));
    $("teaser").textContent = doneToday ? "내일 캡슐엔 " + tease.from + " 친구가 숨어 있대요" : "오늘 캡슐에는 " + F.stickerFor(today).from + " 친구가 있을지도?";
    const st = planStatus();
    const progress=Learn.summary(state,state.level), mastered=progress.filter(function(x) { return x.mastered; }).length;
    $("planTag").textContent=mastered+" / "+progress.length+"개념";
    $("planTag").className="plan-tag";
    $("planText").textContent="다른 날에도 혼자 풀 수 있으면 다음 단계로 가요.";
    renderTrack(st);
    renderBuddies();
    renderAlbum();
    renderMe();
    renderPlayground();
  }

  /* ---------- 내 캐릭터 · 코인 · 옷장 ---------- */
  let earned = 0;              // 이번 세션에서 번 코인 (결과 화면용)
  let shopCat = "dress";
  function ensureAvatar() {
    if (state.avatar) return true;
    return false;
  }
  function renderMe() {
    const has = ensureAvatar();
    $("coinNum").textContent = state.coins || 0;
    if (!has) {
      $("homeDoll").innerHTML = F.badge(F.guideFor(state.level),110);
      $("meName").textContent = "나만의 친구를 골라요";
      $("meWish").textContent = "옷과 머리 색도 마음대로 꾸며요.";
      $("wardrobeBtn").textContent = "캐릭터 고르기";
      return;
    }
    $("homeDoll").innerHTML = A.renderDoll(state.avatar);
    $("meName").textContent = (state.name || "나") + "의 " + A.charById(state.avatar.char).name;
    const wish = (state.wish && !state.owned[state.wish] && A.item(state.wish)) || A.cheapestUnowned(state.owned);
    $("meWish").textContent = wish ? (state.coins >= wish.price ? "「" + wish.name + "」 살 수 있어요!" : "「" + wish.name + "」까지 " + (wish.price - state.coins) + "코인") : "옷장을 다 모았어요!";
    $("wardrobeBtn").textContent = "옷장 열기";
  }
  function showPick() {
    const box = $("portraits"); box.textContent = "";
    A.CHARS.forEach(function (c) {
      const el = document.createElement("button"); el.type = "button"; el.className = "portrait" + (state.avatar && state.avatar.char === c.id ? " on" : "");
      el.innerHTML = A.renderPortrait(c.id, c.hairColor);
      const n = document.createElement("span"); n.textContent = c.name; el.appendChild(n);
      el.addEventListener("click", function () {
        const st = A.starter(c.id);
        // 이미 산 옷은 그대로, 새 인형의 기본 머리·옷·신발을 추가로 가진다
        Object.keys(st.owned).forEach(function (k) { state.owned[k] = true; });
        state.avatar = st.avatar;
        S.save(storage, state);
        showWardrobe();
      });
      box.appendChild(el);
    });
    show("pick");
  }
  function showWardrobe() {
    if (!state.avatar) { showPick(); return; }
    renderWardrobe();
    show("wardrobe");
  }
  function equipped(cat) {
    const av = state.avatar;
    if (cat === "hair") return av.hair;
    return av[cat] && av[cat].id;
  }
  function renderWardrobe() {
    $("wardrobeDoll").innerHTML = A.renderDoll(state.avatar);
    $("coinNum2").textContent = state.coins || 0;
    const tabs = $("wardrobeTabs"); tabs.textContent = "";
    A.CATS.forEach(function (c) {
      const t = document.createElement("button"); t.type = "button"; t.className = "tab" + (c.id === shopCat ? " on" : "");
      t.textContent = c.icon + " " + c.name;
      t.addEventListener("click", function () { shopCat = c.id; renderWardrobe(); });
      tabs.appendChild(t);
    });
    const wishSelect = $("wishSelect"); wishSelect.textContent = "";
    const auto = document.createElement("option"); auto.value = ""; auto.textContent = "마음에 드는 선물을 골라요"; wishSelect.appendChild(auto);
    Object.keys(A.ITEMS).filter(function(k) { return !state.owned[k]; }).forEach(function(k) {
      const item = A.ITEMS[k], option = document.createElement("option"); option.value=k; option.textContent=item.name+" · "+item.price+" 코인"; wishSelect.appendChild(option);
    });
    wishSelect.value = state.wish || "";
    const grid = $("shop"); grid.textContent = "";
    const cur = equipped(shopCat);
    A.CATALOG[shopCat].forEach(function (it) {
      const own = !!state.owned[it.key], on = cur === it.id;
      const cell = document.createElement("button"); cell.type = "button";
      cell.className = "item" + (own ? " own" : " locked") + (on ? " on" : "") + (!own && state.coins >= it.price ? " afford" : "");
      const color = on && shopCat !== "hair" ? state.avatar[shopCat].color : (shopCat === "hair" ? state.avatar.hairColor : it.color);
      cell.innerHTML = A.renderThumb(shopCat, it.id, color);
      const name = document.createElement("span"); name.textContent = it.name; cell.appendChild(name);
      const tag = document.createElement("b"); tag.className = "price";
      tag.textContent = own ? (on ? "입는 중" : "가졌어요") : it.price + " 코인"; cell.appendChild(tag);
      cell.addEventListener("click", function () { tapItem(it); });
      grid.appendChild(cell);
    });
    // 색 팔레트: 지금 입은 것의 색
    const pal = $("palette"); pal.textContent = "";
    const list = shopCat === "hair" ? A.HAIR_COLORS : A.COLORS;
    const canColor = shopCat === "hair" || (state.avatar[shopCat] && state.avatar[shopCat].id);
    pal.hidden = !canColor;
    if (canColor) {
      const lab = document.createElement("span"); lab.className = "tiny"; lab.textContent = shopCat === "hair" ? "머리 색" : "색 바꾸기"; pal.appendChild(lab);
      list.forEach(function (col) {
        const sw = document.createElement("button"); sw.type = "button"; sw.className = "swatch"; sw.style.background = col;
        const curCol = shopCat === "hair" ? state.avatar.hairColor : state.avatar[shopCat].color;
        if (curCol === col) sw.classList.add("on");
        sw.addEventListener("click", function () {
          if (shopCat === "hair") state.avatar.hairColor = col; else state.avatar[shopCat].color = col;
          S.save(storage, state); renderWardrobe();
        });
        pal.appendChild(sw);
      });
    }
    const wish = (state.wish && !state.owned[state.wish] && A.item(state.wish)) || A.cheapestUnowned(state.owned);
    $("wardrobeHint").textContent = wish ? (state.coins >= wish.price ? "지금 살 수 있는 것이 있어요!" : "문제를 풀면 코인이 쌓여요. 다음 목표: " + wish.name + " (" + wish.price + ")") : "옷장을 다 모았어요!";
  }
  function tapItem(it) {
    const own = !!state.owned[it.key];
    if (!own) {
      if (state.coins < it.price) { $("wardrobeHint").textContent = "「" + it.name + "」은 " + (it.price - state.coins) + "코인 더 모으면 살 수 있어요. 오늘 문제 풀면 +" + (A.COIN.session + state.perSession) + "코인!"; return; }
      if (!window.confirm("「" + it.name + "」을 " + it.price + "코인으로 살까요?")) return;
      S.spendCoins(state, it.price); state.owned[it.key] = true;
    }
    // 입기 / 벗기 (같은 것 다시 누르면 벗기, 머리·옷·신발은 벗지 않음)
    if (it.cat === "hair") state.avatar.hair = it.id;
    else if (equipped(it.cat) === it.id && ["crown", "neck", "back", "pet"].indexOf(it.cat) >= 0) state.avatar[it.cat] = null;
    else state.avatar[it.cat] = { id: it.id, color: (state.avatar[it.cat] && state.avatar[it.cat].id === it.id ? state.avatar[it.cat].color : it.color) || it.color || "#ff8fb4" };
    S.save(storage, state); renderWardrobe();
  }
  $("wardrobeBtn").addEventListener("click", showWardrobe);
  $("wardrobeBack").addEventListener("click", function () { renderHome(); show("home"); });
  $("pickCharBtn").addEventListener("click", showPick);

  /* ---------- 문제 ---------- */
  function checkpoint() {
    if (!session || placement) return;
    state.pending = index < session.length ? { problems:session, index:index, results:results, earned:earned, mode:sessionMode, firstTry:firstTry, hintStep:hintStep, recovered:recovered, level:state.level } : null;
    S.save(storage,state);
  }
  function start(mode) {
    clearTimeout(nextTimer);
    if (state.pending && state.pending.level === state.level) {
      const p=state.pending; session=p.problems; index=p.index; results=p.results; earned=Number(p.earned)||0;
      sessionMode=p.mode || "adventure"; recovered=Number(p.recovered)||0;
      current=session[index]; firstTry=p.firstTry !== false; hintStep=Number(p.hintStep)||0;
      show("quiz"); renderProblem(); shownAt=performance.now();
      if (!firstTry) { $("explain").textContent=Learn.hint(current); $("explain").hidden=false; }
      return;
    }
    sessionMode = mode === "quick" ? "quick" : "adventure";
    session = Learn.buildSession({level:state.level,count:sessionMode === "quick" ? 3 : state.perSession,rng:Math.random,review:S.dueReviews(state),state:state});
    index=0; results=[]; earned=0; recovered=0;
    show("quiz"); next();
  }
  function renderProblem() {
    const p = current, el = $("problem");
    $("skillLabel").textContent = Learn.LABELS[p.type] || "오늘의 수학놀이";
    const v=p.visual || {};
    if(!placement && ["add","join"].includes(p.type)) $("skillLabel").textContent="블록 "+v.a+"개와 "+(v.total-v.a)+"개를 모아 놀아요";
    if(!placement && ["sub","from10"].includes(p.type)) $("skillLabel").textContent="공 "+v.total+"개 중 "+v.cross+"개를 친구에게 건네줘요";
    if(!placement && p.type === "carry") $("skillLabel").textContent="블록 "+v.a+"개와 "+v.b+"개를 10칸 상자에 나눠 담아요";
    $("mathPlay").hidden = true; $("mathPlay").textContent = "";
    $("hintBtn").hidden = !!placement; $("togetherBtn").hidden = !!placement;
    $("hintBtn").textContent = "✧ 힌트 보기";
    renderQuest();
    el.textContent = "";
    p.text.split(/(\d+|□)/).forEach(function (part) {
      if (!part) return;
      if (part === "□") { const box = document.createElement("span"); box.className = "box"; box.id = "answerBox"; el.appendChild(box); }
      else if (/^\d+$/.test(part)) el.appendChild(document.createTextNode(part));
      else { const w = document.createElement("span"); w.className = /^[\s+−=]+$/.test(part) ? "" : "word"; w.textContent = part; el.appendChild(w); }
    });
    if (session) {
      $("count").textContent = (index + 1) + " / " + session.length + (p.review ? " · 다시 만난 문제" : "");
      $("bar").style.width = Math.round(100 * index / session.length) + "%";
    }
    $("feedback").textContent = ""; $("feedback").className = "feedback";
    $("explain").hidden = true; $("retryBtn").hidden = true; $("keypad").hidden = false;
    $("visual").innerHTML = showVisualFirst() ? V.render(p, false) : "";
    typed = ""; paint();
  }
  function next() {
    if (index >= session.length) { finish(); return; }
    current = session[index]; firstTry = true; hintStep = 0;
    renderProblem();
    shownAt = performance.now(); checkpoint();
  }
  function paint() { const box = $("answerBox"); if (box) box.textContent = typed; }
  function key(k) {
    if ($("keypad").hidden) return;
    if (k === "back") typed = typed.slice(0, -1);
    else if (k === "go") { submit(); return; }
    else if (typed.length < 2 || (typed.length < 3 && current.answer >= 100)) typed = (typed === "0" ? "" : typed) + k;
    paint();
  }
  function praiseLine() {
    const who = buddy() || F.guideFor(current.level);
    const pool = PRAISE.concat(who.say).filter(function (s) { return s !== lastLine; });
    const line = pool[Math.floor(Math.random() * pool.length)];
    lastLine = line;
    return line;
  }
  /* ---------- 처음 실력 확인 ---------- */
  const Pl = window.MathPlacement;
  let placement = null;
  function showSetup() {
    $("setupName").value = state.name || ""; $("setupSchool").value = state.school || ""; $("setupGrade").value = String(state.grade || 1);
    show("setup");
  }
  function startPlacement() {
    state.name = $("setupName").value.trim().slice(0, 12);
    state.school = $("setupSchool").value.trim().slice(0, 20);
    state.grade = parseInt($("setupGrade").value, 10) || 1;
    S.save(storage, state);
    placement = Pl.create({ grade: state.grade, month: new Date().getMonth() + 1 });
    session = null; index = 0; results = [];
    show("quiz");
    $("quitBtn").textContent = "나중에 하기";
    placementNext();
  }
  function placementNext() {
    const p = placement.next();
    if (!p) { finishPlacement(); return; }
    current = p; firstTry = true;
    renderProblem();
    $("count").textContent = "실력 확인 " + placement.asked + " / " + placement.MAX_Q;
    $("bar").style.width = Math.round(100 * (placement.asked - 1) / placement.MAX_Q) + "%";
    $("visual").textContent = "";
    $("feedback").textContent = placement.asked === 1 ? "몰라도 괜찮아요. 아는 만큼만!" : "";
    shownAt = performance.now();
  }
  function placementAnswer(value, ms) {
    const r = placement.answer(value, ms);
    const box = $("answerBox");
    box.className = "box " + (r.ok ? "ok" : "no");
    $("feedback").textContent = r.ok ? "좋아요 ✓" : "다음 문제로 가요";
    $("feedback").className = "feedback " + (r.ok ? "ok" : "");
    if (r.ok) ding(true);
    $("keypad").hidden = true;
    setTimeout(placementNext, r.ok ? 550 : 750);
  }
  function finishPlacement() {
    const res = placement.result();
    state.level = res.level; state.streak = 0;
    state.planFrom = res.level; state.planStart = S.today();
    state.placed = true;
    state.placement = { date: S.today(), level: res.level, asked: res.asked, correct: res.correct, medianMs: res.medianMs };
    S.addCoins(state, A.COIN.placement, "실력 확인 완료");
    S.save(storage, state);
    placement = null;
    $("quitBtn").textContent = "여기까지 하고 쉬기";
    const L = C.levelById(res.level), g = F.guideFor(res.level);
    $("placedBadge").innerHTML = F.badge(g, 112);
    $("placedUnit").textContent = L.unit + " · " + res.level + "단계에서 시작해요";
    $("placedLevel").textContent = L.name;
    $("placedText").textContent = (state.name || "친구") + (state.school ? " · " + state.school : "") + " " + state.grade + "학년 · 확인 문제 " + res.asked + "개 중 " + res.correct + "개 정답 · 코인 +" + A.COIN.placement;
    $("placedSay").textContent = g.name + ": \"" + (state.name || "친구") + "야, 여기서부터 나랑 같이 가자! 매일 조금씩, 딱 맞는 문제만.\"";
    show("placed");
  }
  $("setupBtn").addEventListener("click", startPlacement);
  $("placedGo").addEventListener("click", function () { renderHome(); show("home"); });

  function submit() {
    if (typed === "" || $("keypad").hidden) return;
    const value=parseInt(typed,10), ok=value === current.answer, ms=Math.round(performance.now()-shownAt);
    if (placement) { placementAnswer(value,ms); return; }
    const box=$("answerBox");
    if (ok) {
      box.className="box ok";
      const old = (state.skills || {})[Learn.skillKey(current)] || [];
      const growth = firstTry && (current.review || old.some(function(e) { return !e.ok; }));
      const rewardKey = S.today()+":"+Learn.skillKey(current);
      const growthBonus = growth && !state.growthRewards[rewardKey];
      $("feedback").textContent = growthBonus ? "어려웠던 걸 혼자 해결했어요! ✓" : firstTry ? Play.byId(state.playgroundSpot).move+" ✓" : "끝까지 생각했어요. 한 칸 더 나아갔어요 ✓";
      $("feedback").className="feedback ok"; ding(true); burst();
      results.push({key:current.key,type:current.type,level:current.level,review:!!current.review,firstTry:firstTry,ms:firstTry?ms:0});
      S.addCoins(state,A.COIN.correct,"문제 끝까지 해결"); earned+=A.COIN.correct;
      if(growthBonus) { S.addCoins(state,2,"다시 만나 혼자 해결"); earned+=2; recovered++; state.growthRewards[rewardKey]=true; }
      S.recordAnswer(state,current,firstTry);
      // A later variation checks transfer after a scaffold, once per session.
      if(!firstTry && !current.transfer && !session.some(function(p) { return p.transfer; }) && sessionMode !== "quick") {
        const follow=Learn.variant(current,Math.random,session.map(function(p) { return p.key; }));
        if(follow) { follow.transfer=true; session.splice(Math.min(session.length,index+3),0,follow); }
      }
      $("keypad").hidden=true; $("hintBtn").hidden=true; $("togetherBtn").hidden=true;
      index++; renderQuest(); firstTry=true; hintStep=0; checkpoint();
      if(index >= session.length) { finish(); return; }
      nextTimer=setTimeout(next,850);
      return;
    }
    firstTry=false; typed=""; paint();
    $("feedback").textContent="괜찮아. 작은 단계로 같이 생각해 보자.";
    $("feedback").className="feedback";
    offerHelp();
  }
  function offerHelp(together) {
    if (placement || !current || $("keypad").hidden) return;
    firstTry=false; hintStep=together ? Math.max(2,hintStep+1) : hintStep+1;
    const ex=$("explain"); ex.hidden=false;
    if(hintStep === 1) { ex.textContent=Learn.hint(current); $("hintBtn").textContent="그림 힌트 더 보기"; }
    else if(hintStep === 2) {
      ex.textContent=Learn.hint(current); $("visual").innerHTML=V.render(current,false); renderMathPlay(); $("hintBtn").textContent="풀이를 함께 보기";
    } else {
      ex.textContent=C.explain(current); $("visual").innerHTML=V.render(current,true);
      $("answerBox").textContent=String(current.answer); $("keypad").hidden=true; $("retryBtn").hidden=false;
      $("hintBtn").hidden=true; $("togetherBtn").hidden=true;
    }
    checkpoint();
  }
  function retry() {
    typed = "";
    $("retryBtn").hidden = true; $("keypad").hidden = false;
    $("hintBtn").hidden=false; $("togetherBtn").hidden=false;
    $("feedback").textContent = "한 번 더 풀어 보세요"; $("feedback").className = "feedback";
    $("explain").hidden = true;
    $("visual").innerHTML = V.render(current, false);
    const box = $("answerBox"); box.className = "box"; box.textContent = "";
  }

  /* ---------- 끝: 캡슐 뽑기 → 결과 ---------- */
  function finish() {
    const today = S.today(), firstToday = !state.stamps[today];
    state.pending=null;
    lastEntry = S.finishSession(state, results);
    const fresh = results.filter(function (r) { return !r.review && r.level === lastEntry.level; });
    lastFresh = fresh.length; lastFirst = fresh.filter(function (r) { return r.firstTry; }).length;
    if (firstToday) { S.addCoins(state, A.COIN.session, "오늘 공부 완료"); earned += A.COIN.session; }

    if (lastEntry.change > 0) { S.addCoins(state, A.COIN.levelUp, "단계 승급"); earned += A.COIN.levelUp; }
    S.save(storage, state);
    lastReviews = results.filter(function (r) { return r.review; });
    if (firstToday) openCapsules("day:" + today, 0);
    else renderResult(null);
  }
  function openCapsules(key, minRarity) {
    const picks = F.pickCapsules(collectedIds(), Math.random);
    const box = $("capsules"); box.textContent = ""; box.classList.remove("opened");
    const tints = ["pink", "sky", "lemon"];
    picks.forEach(function (c, i) {
      const cap = document.createElement("button"); cap.type = "button"; cap.className = "cap c" + i;
      cap.setAttribute("aria-label", "캡슐 " + (i + 1));
      const img = document.createElement("img"); img.src = "assets/3d/capsule_" + tints[i] + ".png"; img.alt = ""; img.draggable = false; cap.appendChild(img);
      const q = document.createElement("span"); q.className = "q"; q.textContent = "?"; cap.appendChild(q);
      cap.addEventListener("click", function () {
        if (box.classList.contains("opened")) return;
        box.classList.add("opened"); cap.classList.add("open");
        img.src = "assets/3d/capsule_open_" + tints[i] + ".png";
        const weekly = key.indexOf("week:") === 0;
        if (weekly) state.chests[key.slice(5)] = true;
        // 캡슐 속은 열 때마다 다름: 스티커 · 옷장 아이템 · 코인 주머니 · 반짝 스티커 · 대박
        const prize = A.rollPrize(Math.random, weekly, state.owned);
        prize.key = key; prize.c = c;
        if (prize.type === "sticker" || prize.type === "shiny") {
          prize.r = prize.type === "shiny" ? Math.max(1, F.rollRarity(Math.random, minRarity)) : F.rollRarity(Math.random, minRarity);
          state.album.push({ id: c.id, date: S.today(), r: prize.r, key: key });
        }
        if (prize.item) state.owned[prize.item.key] = true;
        if (prize.coins) { S.addCoins(state, prize.coins, weekly ? "보물상자" : "캡슐"); earned += prize.coins; }
        S.save(storage, state);
        setTimeout(function () { renderResult(prize); }, 450);
      });
      box.appendChild(cap);
    });
    show("capsule");
  }
  function renderResult(sticker) {
    const today = S.today();
    if (sticker) {
      const where = sticker.key.indexOf("week:") === 0 ? "보물상자" : "캡슐";
      if (sticker.type === "sticker" || sticker.type === "shiny") {
        $("stickerBig").innerHTML = '<div class="r' + sticker.r + '">' + F.badge(sticker.c, 112) + "</div>";
        const isNew = state.album.filter(function (a) { return a.id === sticker.c.id; }).length === 1;
        $("stickerName").textContent = where + " 속 스티커 · " + sticker.c.name + " (" + sticker.c.from + ")" + (sticker.r === 2 ? " · ✦ 금빛!" : sticker.r === 1 ? " · 반짝" : "") + (isNew ? " · 처음 만났어요!" : "");
      } else if (sticker.type === "coins") {
        $("stickerBig").innerHTML = '<div class="prize-coins"><span class="coin"></span><b>+' + sticker.coins + '</b></div>';
        $("stickerName").textContent = where + " 속 코인 주머니 · " + sticker.coins + "코인!";
      } else {
        $("stickerBig").innerHTML = '<div class="prize-item">' + A.renderThumb(sticker.item.cat, sticker.item.id, sticker.item.color) + "</div>";
        $("stickerName").textContent = (sticker.type === "jackpot" ? "✦ 대박! " : "") + where + " 속 옷장 아이템 · 「" + sticker.item.name + "」" + (sticker.coins ? " + " + sticker.coins + "코인" : "") + " · 옷장에서 입어 봐요";
      }
    } else {
      const g = buddy() || F.guideFor(state.level);
      $("stickerBig").innerHTML = F.badge(g, 112);
      $("stickerName").textContent = "오늘 스티커는 이미 받았어요 · 그래도 한 번 더 한 건 멋져요";
    }
    if (lastEntry) {
      $("resultBig").textContent = "";
      $("resultBig").appendChild(document.createTextNode(results.length + "개의 탐험 도장, "));
      const small = document.createElement("small"); small.textContent = "오늘도 해냈어요!"; $("resultBig").appendChild(small);
      $("resultText").textContent = (recovered ? "어려웠던 것을 혼자 해결한 순간 "+recovered+"번. " : "오늘도 끝까지 생각했어요. ") + "코인 +"+earned+" · 모은 탐험 도장 "+state.garden+"개";
      const after = planStatus();
      $("resultLevel").textContent = lastEntry.change > 0 ? "다음 단계로 올라가요: " + levelInfo().name
        : lastEntry.change < 0 ? "조금 더 쉬운 문제로 연습해요: " + levelInfo().name
        : "내 속도로 차근차근 배우고 있어요.";
      const story = $("story");
      if (lastEntry.change > 0) {
        story.hidden = false; story.textContent = "";
        const prev = F.guideFor(state.level - 1), nextG = F.guideFor(state.level);
        const head = document.createElement("div"); head.className = "story-head"; head.innerHTML = F.badge(prev, 40);
        const t = document.createElement("b"); t.textContent = prev.name + "의 편지"; head.appendChild(t); story.appendChild(head);
        const p = document.createElement("p"); p.textContent = F.storyFor(state.level - 1); story.appendChild(p);
        const n = document.createElement("p"); n.className = "tiny"; n.textContent = "새 길잡이: " + nextG.name + " (" + nextG.from + ")"; story.appendChild(n);
      } else story.hidden = true;
    } else {
      $("resultBig").textContent = ""; $("resultText").textContent = ""; $("resultLevel").textContent = ""; $("story").hidden = true;
    }
    show("result");
  }

  /* ---------- 보여주기 카드 (엄마·아빠 칭찬 도장) ---------- */
  function showCard() {
    const today = S.today();
    const last = state.album.filter(function (a) { return a.date === today; }).slice(-1)[0];
    const c = last ? F.byId(last.id) : (buddy() || F.guideFor(state.level));
    $("showDate").textContent = today.replace(/-/g, ". ") + " · " + levelInfo().name;
    $("showBadge").innerHTML = F.badge(c, 112);
    $("showTitle").textContent = (state.name || "우리 아이") + ", 오늘 " + (results.length ? results.length + "문제를 풀며 놀이터를 탐험했어요" : "놀이터 탐험 완료!");
    const sk = S.streakInfo(state.stamps, today, state.planDays, Sc.isStudyDay);
    $("showText").textContent = "연속 " + sk.days + "일째 · 친구 앨범 " + collectedIds().length + "/" + F.CHARACTERS.length + "명";
    const hearted = !!state.hearts[today];
    $("heartBtn").disabled = hearted; $("heartBtn").textContent = hearted ? "♥ 오늘 칭찬 도장 받았어요" : "♥ 칭찬 도장 꾹";
    $("heartNote").textContent = hearted ? "" : "엄마나 아빠가 눌러 주세요";
    show("showcard");
  }
  $("heartBtn").addEventListener("click", function () {
    state.hearts[S.today()] = true; S.save(storage, state);
    $("heartBtn").disabled = true; $("heartBtn").textContent = "♥ 칭찬 도장 받았어요!"; $("heartNote").textContent = "";
  });
  $("showBtn").addEventListener("click", showCard);
  $("showBack").addEventListener("click", function () { show("result"); });
  $("chestBtn").addEventListener("click", function () {
    const wk = S.weekInfo(state.stamps, S.today(), state.planDays);
    if (!wk.ready || state.chests[wk.key]) return;
    lastEntry = null; earned = 0; openCapsules("week:" + wk.key, 1);
  });

  $("startBtn").addEventListener("click", start);
  $("againBtn").addEventListener("click", start);
  $("doneBtn").addEventListener("click", function () { renderHome(); show("home"); });
  $("retryBtn").addEventListener("click", retry);
  $("quitBtn").addEventListener("click", function () {
    clearTimeout(nextTimer);
    if (placement) { placement = null; $("quitBtn").textContent = "여기까지 하고 쉬기"; showSetup(); return; }
    checkpoint(); renderHome(); show("home");
  });
  $("keypad").addEventListener("click", function (e) { const b = e.target.closest("button"); if (b) key(b.getAttribute("data-k")); });
  document.addEventListener("keydown", function (e) {
    if ($("quiz").hidden) return;
    if (/^\d$/.test(e.key)) key(e.key);
    else if (e.key === "Backspace") key("back");
    else if (e.key === "Enter") { if (!$("retryBtn").hidden) retry(); else key("go"); }
  });
  window.addEventListener("pageshow", function () { state = S.load(storage); if (!$("home").hidden) renderHome(); });
  // 처음부터 다시: 부모님 확인(곱셈 한 문제) → 확인 → 이름·단계·코인·옷장 전부 삭제
  function resetAll() {
    const a = 6 + Math.floor(Math.random() * 4), b = 6 + Math.floor(Math.random() * 4);
    const ans = window.prompt("부모님 확인 · " + a + " × " + b + " = ?");
    if (ans === null) return;
    if (parseInt(ans, 10) !== a * b) { window.alert("숫자가 달라요. 부모님이 눌러 주세요."); return; }
    if (!window.confirm("이름·단계·스티커·코인·옷장을 모두 지우고 처음(실력 확인)부터 시작할까요?")) return;
    try { storage.removeItem(S.KEY); } catch (_) {}
    state = S.load(storage);
    showSetup();
  }
  $("resetLink").addEventListener("click", function (e) { e.preventDefault(); resetAll(); });
  // 주소 뒤에 ?reset=1 을 붙여 열면 이 기기의 기록을 지우고 처음부터 (부모 확인 후)
  if (/[?&]reset=1/.test(window.location.search)) {
    if (window.confirm("이 기기의 수학 기록(스티커·단계·복습)을 모두 지우고 처음부터 시작할까요?")) {
      try { storage.removeItem(S.KEY); } catch (_) {}
      state = S.load(storage);
    }
    try { window.history.replaceState(null, "", window.location.pathname); } catch (_) {}
  }
  function renderPlayground() {
    const spot=Play.byId(state.playgroundSpot), total=state.garden || 0;
    $("missionTitle").textContent=spot.mission;
    $("playgroundChapter").textContent=(Math.floor(total/24)+1)+"번째 탐험";
    $("playgroundGreeting").textContent="재이의 놀이터에\n놀러 와!";
    $("playgroundStory").textContent=state.stamps[S.today()] ? "오늘도 신나게 놀았어. 내일 다시 만나!" : spot.id === "bars" ? "문제 하나, 구름사다리 한 칸. 천천히 같이 가요." : "작은 문제를 풀며 함께 놀아요. 내 속도로, 한 걸음씩!";
    $("playgroundTotal").textContent=total;
    renderHomeProgress();
    const map=$("playgroundMap"); map.textContent="";
    Play.SPOTS.forEach(function(item) {
      const button=document.createElement("button"); button.type="button"; button.className="play-spot";
      button.dataset.spot=item.id; button.setAttribute("aria-pressed",String(item.id===spot.id));
      button.setAttribute("aria-label",item.description+" 선택"); button.appendChild(Play.icon(item.id));
      const label=document.createElement("span"); label.textContent=item.name; button.appendChild(label);
      if(item.id === "bars") { const badge=document.createElement("small"); badge.className="favorite"; badge.textContent="최애"; button.appendChild(badge); }
      button.addEventListener("click",function() { state.playgroundSpot=item.id; S.save(storage,state); renderPlayground(); $("playgroundMap").querySelector('[data-spot="'+item.id+'"]').focus({preventScroll:true}); });
      map.appendChild(button);
    });
    const pending=state.pending && state.pending.level === state.level;
    $("startBtn").textContent=pending?"하던 탐험 이어하기 →":spot.name+" 출발 →";
    $("quickBtn").hidden=!!pending; $("resumeNote").hidden=!pending;
    if(pending) $("resumeNote").textContent=state.pending.index+"문제까지 했어요. 이어서 가볼까요?";
    $("teaser").textContent=state.stamps[S.today()] ? "오늘은 여기까지 해도 좋아요. 놀이터는 내일도 기다려요." : "도움이 필요하면 힌트를 눌러요. 천천히 해도 괜찮아.";
    $("guideSay").textContent=(buddy() || F.guideFor(state.level)).name+": "+(pending?"다시 만나서 반가워! 이어서 해볼까?":"네 속도로 해도 좋아. 내가 함께할게!");
  }
  function renderHomeProgress() {
    const pending=state.pending && state.pending.level===state.level ? state.pending : null;
    const recent=state.history.filter(function(h) {return h.date===S.today();}).slice(-1)[0];
    const total=pending?pending.problems.length:recent?recent.count:state.perSession;
    const done=pending?pending.index:recent?recent.count:0;
    $("homeProgressLabel").textContent=(pending?"이어갈 탐험":recent?"마친 탐험":"다음 탐험")+" · "+done+" / "+total;
    Play.renderLadder($("homeRungs"),total,done,"나의 구름사다리");
    $("homeProgressDetail").textContent=state.level+"단계 · "+levelInfo().name+" · 틀려도 건넌 칸은 그대로예요.";
  }
  function renderQuest() {
    $("quizMission").textContent=placement?"어디서 시작할지 함께 찾아요":"구름사다리 · 친구들과 한 칸씩";
    const box=$("questRungs");box.hidden=!!placement;$("questStatus").hidden=!!placement;
    if(placement || !session) return;
    Play.renderLadder(box,session.length,index,"이번 탐험 진도");
    $("questStatus").textContent=index+" / "+session.length+"문제 해결";
  }
  function renderMathPlay() {
    const p=current,v=p.visual || {},supported=["carry","make10","split10","missing","add","join","split"];
    if(!supported.includes(p.type) || v.a > 9) return;
    const target=p.type === "carry" ? 10 : v.total;
    if(!target || target>10) return;
    const box=$("mathPlay"); box.hidden=false; box.textContent=""; $("visual").textContent="";
    const label=document.createElement("p"); label.textContent="빈자리를 눌러 블록을 놓아 봐요. "+v.a+"개에서 "+target+"개를 만들어요."; box.appendChild(label);
    const frame=document.createElement("div"); frame.className="ten-frame"; let added=0;
    for(let i=0;i<target;i++) {
      const block=document.createElement("button"); block.type="button"; block.className="math-block"+(i<v.a?" filled":""); block.disabled=i<v.a;
      block.setAttribute("aria-label",i<v.a?"이미 놓인 블록":"블록 놓기"); block.setAttribute("aria-pressed",String(i<v.a));
      block.addEventListener("click",function() { const on=block.classList.toggle("filled");block.classList.toggle("added",on);block.setAttribute("aria-pressed",String(on));block.setAttribute("aria-label",on?"블록 빼기":"블록 놓기");added+=on?1:-1;
        label.textContent=v.a+"개에 "+added+"개를 더 놓았어요."+(v.a+added===target?(p.type === "carry"?" 10을 만들었네! 옮기고 남은 것도 더해 볼까요?":" 모두 채웠어요. 식과 연결해 볼까요?"):" 남은 자리를 살펴봐요.");
      }); frame.appendChild(block);
    }
    box.appendChild(frame);
  }
  $("quickBtn").addEventListener("click",function() { start("quick"); });
  $("hintBtn").addEventListener("click",function() { offerHelp(false); });
  $("togetherBtn").addEventListener("click",function() { offerHelp(true); });
  $("wishSelect").addEventListener("change",function() { state.wish=this.value || null; S.save(storage,state); renderWardrobe(); });
  $("quickSetupBtn").addEventListener("click",function() {
    state.name=$("setupName").value.trim().slice(0,12); state.grade=parseInt($("setupGrade").value,10)||1;
    state.placed=true; S.save(storage,state); start("quick");
  });
  renderHome();
  if (!state.placed) showSetup(); else show("home");
})();
