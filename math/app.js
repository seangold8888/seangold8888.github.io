/* 매일 수학 10분 — 아이 화면 */
(function () {
  "use strict";
  const C = window.Curriculum, V = window.MathVisual, S = window.MathStore, Sc = window.MathSchedule, F = window.MathFriends;
  const $ = function (id) { return document.getElementById(id); };
  const storage = window.localStorage;
  let state = S.load(storage);
  const PRAISE = ["맞았어요", "정확해요", "잘했어요", "좋아요", "그렇지!", "딩동댕"];
  let session = null, index = 0, current = null, typed = "", shownAt = 0, firstTry = true, results = [], lastPraise = -1;

  function levelInfo() { return C.levelById(state.level); }
  function plan() { return Sc.buildPlan({ start: state.planStart, end: state.planEnd, daysPerWeek: state.planDays, fromLevel: state.planFrom }); }
  function planStatus() { return Sc.status(plan(), Object.keys(state.stamps), state.level, S.today()); }
  function showVisualFirst() {
    const policy = state.visualPolicy === "auto" ? levelInfo().visual : state.visualPolicy;
    return policy === "always";
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

  function show(id) { ["home", "quiz", "result"].forEach(function (v) { $(v).hidden = v !== id; }); window.scrollTo(0, 0); }

  function renderTrack(st) {
    const track = $("track"); track.textContent = "";
    const from = state.planFrom || 1;
    for (let l = from; l <= 11; l++) {
      const g = F.guideFor(l), node = document.createElement("div");
      const cls = ["stop"];
      if (l < state.level) cls.push("done");
      if (l === state.level) cls.push("here");
      if (st && l === st.plannedLevel) cls.push("planned");
      node.className = cls.join(" ");
      node.innerHTML = F.badge(g, 40);
      const label = document.createElement("span"); label.textContent = String(l); node.appendChild(label);
      if (l === state.level) { const me = document.createElement("i"); me.textContent = "지금"; node.appendChild(me); }
      else if (st && l === st.plannedLevel) { const pl = document.createElement("i"); pl.className = "p"; pl.textContent = "계획"; node.appendChild(pl); }
      track.appendChild(node);
    }
  }

  function renderStickers() {
    const box = $("stickers"); box.textContent = "";
    const days = Object.keys(state.stamps).sort();
    const recent = days.slice(-30);
    recent.forEach(function (d) {
      const c = F.stickerFor(d), cell = document.createElement("div");
      cell.className = "sticker"; cell.innerHTML = F.badge(c, 44);
      const t = document.createElement("span"); t.textContent = d.slice(5).replace("-", "/"); cell.appendChild(t);
      cell.title = c.name;
      box.appendChild(cell);
    });
    if (!recent.length) { const p = document.createElement("p"); p.className = "small"; p.textContent = "오늘 문제를 풀면 첫 스티커를 받아요."; box.appendChild(p); }
    $("stickerCount").textContent = days.length ? days.length + "장 모았어요" : "";
  }

  function renderHome() {
    const L = levelInfo(), g = F.guideFor(state.level);
    $("who").textContent = state.name ? state.name + " 어린이" : "";
    $("guideBadge").innerHTML = F.badge(g, 64);
    $("homeUnit").textContent = L.unit + " · " + L.id + "단계 · 길잡이 " + g.name;
    $("homeLevel").textContent = L.name;
    $("homeHint").textContent = "오늘 문제 " + state.perSession + "개. " + (showVisualFirst() ? "그림을 보고 세면 돼요." : "천천히 정확하게 풀어요.");
    const due = S.dueReviews(state).length;
    $("homeReview").textContent = due ? "지난번에 어려웠던 문제 " + Math.min(due, Math.floor(state.perSession * 0.3)) + "개가 다시 나와요." : "";
    const st = planStatus();
    if (st) {
      const doneToday = !!state.stamps[S.today()];
      $("planTag").textContent = st.finished ? "진도 끝!" : st.label;
      $("planTag").className = "plan-tag " + (st.levelGap < 0 ? "behind" : st.levelGap > 0 ? "ahead" : "ontime");
      const pg = C.levelById(st.plannedLevel);
      $("planText").textContent = st.finished
        ? "계획한 진도를 모두 마쳤어요. 2학년 준비도 계속할 수 있어요."
        : (doneToday ? "오늘 공부 완료 ✓ · " : "") + "계획 " + st.plannedIndex + "/" + st.total + "회차 · 오늘은 " + pg.id + "단계 「" + pg.name + "」 " + st.levelDayIndex + "/" + st.levelDays + "일째";
    } else { $("planTag").textContent = ""; $("planText").textContent = ""; }
    renderTrack(st);
    renderStickers();
  }

  function start() {
    session = C.buildSession({ level: state.level, count: state.perSession, rng: Math.random, review: S.dueReviews(state) });
    index = 0; results = [];
    show("quiz");
    next();
  }

  function renderProblem() {
    const p = current;
    const el = $("problem");
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
  let lastLine = "";
  function praiseLine() {
    // 길잡이 친구 한마디와 짧은 칭찬을 섞되, 직전과 같은 말은 피한다
    const g = F.guideFor(current.level);
    const pool = PRAISE.concat(g.say).filter(function (s) { return s !== lastLine; });
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
      ding(true);
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
  function finish() {
    const before = planStatus();
    const entry = S.finishSession(state, results, null, { behind: !!(before && before.levelGap < 0), cap: before ? before.plannedLevel + 1 : 11 });
    S.save(storage, state);
    const fresh = results.filter(function (r) { return !r.review; });
    const first = fresh.filter(function (r) { return r.firstTry; }).length;
    const today = S.today(), c = F.stickerFor(today);
    $("stickerBig").innerHTML = F.badge(c, 112);
    $("stickerName").textContent = (state.stamps[today] > 1 ? "오늘 스티커는 이미 받았어요 · " : "오늘의 스티커 · ") + c.name + " (" + c.from + ")";
    $("resultBig").textContent = "";
    $("resultBig").appendChild(document.createTextNode(first + " "));
    const small = document.createElement("small"); small.textContent = "/ " + fresh.length + " 한 번에 맞았어요"; $("resultBig").appendChild(small);
    const reviews = results.filter(function (r) { return r.review; });
    $("resultText").textContent = (reviews.length ? "다시 만난 문제 " + reviews.length + "개 중 " + reviews.filter(function (r) { return r.firstTry; }).length + "개 성공. " : "") + (first === fresh.length && fresh.length ? "전부 한 번에!" : "");
    const after = planStatus();
    $("resultLevel").textContent = entry.change > 0 ? "다음 단계로 올라가요: " + levelInfo().name + " (길잡이 " + F.guideFor(state.level).name + ")"
      : entry.change < 0 ? "조금 더 쉬운 문제로 연습해요: " + levelInfo().name
      : after ? "진도: " + after.label : "";
    show("result");
  }

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
