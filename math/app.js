/* 매일 수학 10분 — 아이 화면 */
(function () {
  "use strict";
  const C = window.Curriculum, V = window.MathVisual, S = window.MathStore, Sc = window.MathSchedule, F = window.MathFriends;
  const $ = function (id) { return document.getElementById(id); };
  const storage = window.localStorage;
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
  function show(id) { ["home", "quiz", "capsule", "result", "showcard"].forEach(function (v) { $(v).hidden = v !== id; }); window.scrollTo(0, 0); }
  function collectedIds() { const ids = {}; state.album.forEach(function (a) { ids[a.id] = true; }); return Object.keys(ids); }

  /* ---------- 홈 ---------- */
  function renderTrack(st) {
    const track = $("track"); track.textContent = "";
    const from = state.planFrom || 1;
    for (let l = from; l <= 11; l++) {
      const g = F.guideFor(l), node = document.createElement("div");
      const cls = ["stop"];
      if (l < state.level) cls.push("done");
      if (l === state.level) cls.push("here");
      if (st && l === st.plannedLevel) cls.push("planned");
      if (l > state.level) cls.push("locked");
      node.className = cls.join(" ");
      node.innerHTML = F.badge(g, 40);
      const label = document.createElement("span"); label.textContent = l > state.level ? "?" : String(l); node.appendChild(label);
      if (l === state.level) { const me = document.createElement("i"); me.textContent = "지금"; node.appendChild(me); }
      else if (st && l === st.plannedLevel) { const pl = document.createElement("i"); pl.className = "p"; pl.textContent = "계획"; node.appendChild(pl); }
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
    $("who").textContent = state.name ? state.name + " 어린이" : "";
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
    if (st) {
      $("planTag").textContent = st.finished ? "진도 끝!" : st.label;
      $("planTag").className = "plan-tag " + (st.levelGap < 0 ? "behind" : st.levelGap > 0 ? "ahead" : "ontime");
      const pg = C.levelById(st.plannedLevel);
      $("planText").textContent = st.finished ? "계획한 진도를 모두 마쳤어요. 2학년 준비도 계속할 수 있어요."
        : (doneToday ? "오늘 공부 완료 ✓ · " : "") + "계획 " + st.plannedIndex + "/" + st.total + "회차 · 오늘은 " + pg.id + "단계 「" + pg.name + "」 " + st.levelDayIndex + "/" + st.levelDays + "일째";
    } else { $("planTag").textContent = ""; $("planText").textContent = ""; }
    renderTrack(st);
    renderBuddies();
    renderAlbum();
  }

  /* ---------- 문제 ---------- */
  function start() {
    session = C.buildSession({ level: state.level, count: state.perSession, rng: Math.random, review: S.dueReviews(state) });
    index = 0; results = [];
    show("quiz");
    next();
  }
  function renderProblem() {
    const p = current, el = $("problem");
    el.textContent = "";
    p.text.split(/(\d+|□)/).forEach(function (part) {
      if (!part) return;
      if (part === "□") { const box = document.createElement("span"); box.className = "box"; box.id = "answerBox"; el.appendChild(box); }
      else if (/^\d+$/.test(part)) el.appendChild(document.createTextNode(part));
      else { const w = document.createElement("span"); w.className = /^[\s+−=]+$/.test(part) ? "" : "word"; w.textContent = part; el.appendChild(w); }
    });
    $("count").textContent = (index + 1) + " / " + session.length + (p.review ? " · 다시 만난 문제" : "");
    $("bar").style.width = Math.round(100 * index / session.length) + "%";
    $("feedback").textContent = ""; $("feedback").className = "feedback";
    $("explain").hidden = true; $("retryBtn").hidden = true; $("keypad").hidden = false;
    $("visual").innerHTML = showVisualFirst() ? V.render(p, false) : "";
    typed = ""; paint();
  }
  function next() {
    if (index >= session.length) { finish(); return; }
    current = session[index]; firstTry = true;
    renderProblem();
    shownAt = performance.now();
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
  function submit() {
    if (typed === "") return;
    const value = parseInt(typed, 10), ok = value === current.answer, ms = Math.round(performance.now() - shownAt);
    const box = $("answerBox");
    if (ok) {
      box.className = "box ok";
      $("feedback").textContent = (firstTry ? "" : "이번엔 ") + praiseLine() + " ✓"; $("feedback").className = "feedback ok";
      ding(true); if (firstTry) burst();
      results.push({ key: current.key, level: current.level, review: !!current.review, firstTry: firstTry, ms: firstTry ? ms : 0 });
      S.recordAnswer(state, current, firstTry); S.save(storage, state);
      $("keypad").hidden = true;
      index++;
      setTimeout(next, firstTry ? 750 : 900);
      return;
    }
    ding(false);
    firstTry = false;
    $("feedback").textContent = "괜찮아요, 같이 세어 봐요"; $("feedback").className = "feedback no";
    $("visual").innerHTML = V.render(current, true);
    const ex = $("explain"); ex.textContent = C.explain(current); ex.hidden = false;
    box.textContent = String(current.answer); box.className = "box ok";
    $("keypad").hidden = true; $("retryBtn").hidden = false;
  }
  function retry() {
    typed = "";
    $("retryBtn").hidden = true; $("keypad").hidden = false;
    $("feedback").textContent = "한 번 더 풀어 보세요"; $("feedback").className = "feedback";
    $("explain").hidden = true;
    $("visual").innerHTML = V.render(current, false);
    const box = $("answerBox"); box.className = "box"; box.textContent = "";
  }

  /* ---------- 끝: 캡슐 뽑기 → 결과 ---------- */
  function finish() {
    const before = planStatus(), today = S.today(), firstToday = !state.stamps[today];
    lastEntry = S.finishSession(state, results, null, { behind: !!(before && before.levelGap < 0), cap: before ? before.plannedLevel + 1 : 11 });
    S.save(storage, state);
    const fresh = results.filter(function (r) { return !r.review; });
    lastFresh = fresh.length; lastFirst = fresh.filter(function (r) { return r.firstTry; }).length;
    lastReviews = results.filter(function (r) { return r.review; });
    if (firstToday) openCapsules("day:" + today, 0);
    else renderResult(null);
  }
  function openCapsules(key, minRarity) {
    const picks = F.pickCapsules(collectedIds(), Math.random);
    const box = $("capsules"); box.textContent = "";
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
        const r = F.rollRarity(Math.random, minRarity);
        state.album.push({ id: c.id, date: S.today(), r: r, key: key });
        if (key.indexOf("week:") === 0) state.chests[key.slice(5)] = true;
        S.save(storage, state);
        setTimeout(function () { renderResult({ c: c, r: r, key: key }); }, 450);
      });
      box.appendChild(cap);
    });
    show("capsule");
  }
  function renderResult(sticker) {
    const today = S.today();
    if (sticker) {
      $("stickerBig").innerHTML = '<div class="r' + sticker.r + '">' + F.badge(sticker.c, 112) + "</div>";
      const isNew = state.album.filter(function (a) { return a.id === sticker.c.id; }).length === 1;
      $("stickerName").textContent = (sticker.key.indexOf("week:") === 0 ? "보물상자 스티커 · " : "오늘의 스티커 · ") + sticker.c.name + " (" + sticker.c.from + ")" + (sticker.r === 2 ? " · ✦ 금빛!" : sticker.r === 1 ? " · 반짝" : "") + (isNew ? " · 처음 만났어요!" : "");
    } else {
      const g = buddy() || F.guideFor(state.level);
      $("stickerBig").innerHTML = F.badge(g, 112);
      $("stickerName").textContent = "오늘 스티커는 이미 받았어요 · 그래도 한 번 더 한 건 멋져요";
    }
    if (lastEntry) {
      $("resultBig").textContent = "";
      $("resultBig").appendChild(document.createTextNode(lastFirst + " "));
      const small = document.createElement("small"); small.textContent = "/ " + lastFresh + " 한 번에 맞았어요"; $("resultBig").appendChild(small);
      $("resultText").textContent = (lastReviews.length ? "다시 만난 문제 " + lastReviews.length + "개 중 " + lastReviews.filter(function (r) { return r.firstTry; }).length + "개 성공. " : "") + (lastFirst === lastFresh && lastFresh ? "전부 한 번에!" : "");
      const after = planStatus();
      $("resultLevel").textContent = lastEntry.change > 0 ? "다음 단계로 올라가요: " + levelInfo().name
        : lastEntry.change < 0 ? "조금 더 쉬운 문제로 연습해요: " + levelInfo().name
        : after ? "진도: " + after.label : "";
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
    $("showTitle").textContent = (state.name || "우리 아이") + ", 오늘 " + (lastFresh ? lastFirst + "/" + lastFresh + " 한 번에 맞았어요" : "수학 10분 끝!");
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
    lastEntry = null; openCapsules("week:" + wk.key, 1);
  });

  $("startBtn").addEventListener("click", start);
  $("againBtn").addEventListener("click", start);
  $("doneBtn").addEventListener("click", function () { renderHome(); show("home"); });
  $("retryBtn").addEventListener("click", retry);
  $("quitBtn").addEventListener("click", function () { S.save(storage, state); renderHome(); show("home"); });
  $("keypad").addEventListener("click", function (e) { const b = e.target.closest("button"); if (b) key(b.getAttribute("data-k")); });
  document.addEventListener("keydown", function (e) {
    if ($("quiz").hidden) return;
    if (/^\d$/.test(e.key)) key(e.key);
    else if (e.key === "Backspace") key("back");
    else if (e.key === "Enter") { if (!$("retryBtn").hidden) retry(); else key("go"); }
  });
  window.addEventListener("pageshow", function () { state = S.load(storage); if (!$("home").hidden) renderHome(); });
  renderHome();
  show("home");
})();
