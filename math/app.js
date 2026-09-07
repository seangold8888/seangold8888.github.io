/* 매일 수학 10분 — 아이 화면 */
(function () {
  "use strict";
  const C = window.Curriculum, V = window.MathVisual, S = window.MathStore;
  const $ = function (id) { return document.getElementById(id); };
  const storage = window.localStorage;
  let state = S.load(storage);
  const PRAISE = ["맞았어요", "정확해요", "잘했어요", "좋아요", "그렇지!", "딩동댕"];
  let session = null, index = 0, current = null, typed = "", shownAt = 0, firstTry = true, results = [], lastPraise = -1;

  function levelInfo() { return C.levelById(state.level); }
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

  function renderHome() {
    const L = levelInfo();
    $("who").textContent = state.name ? state.name + " 어린이" : "";
    $("homeUnit").textContent = L.unit + " · " + L.id + "단계";
    $("homeLevel").textContent = L.name;
    $("homeHint").textContent = "오늘 문제 " + state.perSession + "개. " + (showVisualFirst() ? "그림을 보고 세면 돼요." : "천천히 정확하게 풀어요.");
    const due = S.dueReviews(state).length;
    $("homeReview").textContent = due ? "지난번에 어려웠던 문제 " + Math.min(due, Math.floor(state.perSession * 0.3)) + "개가 다시 나와요." : "";
    // 이번 주 도장 (월~일)
    const now = new Date(), day = (now.getDay() + 6) % 7, week = $("week");
    week.textContent = "";
    const names = ["월", "화", "수", "목", "금", "토", "일"];
    for (let i = 0; i < 7; i++) {
      const d = new Date(now); d.setDate(now.getDate() - day + i);
      const key = S.today(d), cell = document.createElement("div");
      cell.className = "d" + (state.stamps[key] ? " done" : "") + (i === day ? " today" : "");
      const b = document.createElement("b"); b.textContent = state.stamps[key] ? "✓" : "";
      cell.appendChild(document.createTextNode(names[i])); cell.appendChild(b);
      week.appendChild(cell);
    }
  }

  function start() {
    const rng = Math.random;
    session = C.buildSession({ level: state.level, count: state.perSession, rng: rng, review: S.dueReviews(state) });
    index = 0; results = [];
    show("quiz");
    next();
  }

  function renderProblem() {
    const p = current;
    const el = $("problem");
    el.textContent = "";
    // "7은 4와 □" 처럼 한글이 섞인 문장은 조사를 작게, 숫자는 크게
    p.text.split(/(\d+|□)/).forEach(function (part) {
      if (!part) return;
      if (part === "□") { const box = document.createElement("span"); box.className = "box"; box.id = "answerBox"; el.appendChild(box); }
      else if (/^\d+$/.test(part)) el.appendChild(document.createTextNode(part));
      else { const w = document.createElement("span"); w.className = /^[\s+−=]+$/.test(part) ? "" : "word"; w.textContent = part; el.appendChild(w); }
    });
    $("count").textContent = (index + 1) + " / " + session.length + (p.review ? " · 다시 만난 문제" : "");
    $("bar").style.width = Math.round(100 * index / session.length) + "%";
    $("feedback").textContent = ""; $("feedback").className = "feedback";
    $("explain").hidden = true; $("retryBtn").hidden = true; $("nextBtn").hidden = true; $("keypad").hidden = false;
    $("visual").innerHTML = showVisualFirst() ? V.render(p, false) : "";
    typed = ""; paint();
  }
  function next() {
    if (index >= session.length) { finish(); return; }
    current = session[index]; firstTry = true;
    renderProblem();
    shownAt = performance.now();
  }
  function paint() {
    const box = $("answerBox"); if (box) box.textContent = typed;
  }
  function key(k) {
    if ($("keypad").hidden) return;
    if (k === "back") typed = typed.slice(0, -1);
    else if (k === "go") { submit(); return; }
    else if (typed.length < 2 || (typed.length < 3 && current.answer >= 100)) typed = (typed === "0" ? "" : typed) + k;
    paint();
  }
  function submit() {
    if (typed === "") return;
    const value = parseInt(typed, 10), ok = value === current.answer, ms = Math.round(performance.now() - shownAt);
    const box = $("answerBox");
    if (ok) {
      box.className = "box ok";
      let i; do { i = Math.floor(Math.random() * PRAISE.length); } while (i === lastPraise); lastPraise = i;
      $("feedback").textContent = (firstTry ? "" : "이번엔 ") + PRAISE[i] + " ✓"; $("feedback").className = "feedback ok";
      ding(true);
      results.push({ key: current.key, level: current.level, review: !!current.review, firstTry: firstTry, ms: firstTry ? ms : 0 });
      S.recordAnswer(state, current, firstTry); S.save(storage, state);
      $("keypad").hidden = true;
      index++;
      setTimeout(next, firstTry ? 700 : 900);
      return;
    }
    // 틀림: 정답과 그림을 보여주고, 같은 문제를 다시 푼다
    ding(false);
    firstTry = false;
    box.className = "box no";
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
    const entry = S.finishSession(state, results);
    S.save(storage, state);
    const fresh = results.filter(function (r) { return !r.review; });
    const first = fresh.filter(function (r) { return r.firstTry; }).length;
    $("resultBig").textContent = "";
    $("resultBig").appendChild(document.createTextNode(first + " "));
    const small = document.createElement("small"); small.textContent = "/ " + fresh.length + " 한 번에 맞았어요"; $("resultBig").appendChild(small);
    const reviews = results.filter(function (r) { return r.review; });
    $("resultText").textContent = (reviews.length ? "다시 만난 문제 " + reviews.length + "개 중 " + reviews.filter(function (r) { return r.firstTry; }).length + "개 성공. " : "") + "오늘 도장 " + state.stamps[S.today()] + "개.";
    $("resultLevel").textContent = entry.change > 0 ? "다음 단계로 올라가요: " + levelInfo().name : entry.change < 0 ? "조금 더 쉬운 문제로 연습해요: " + levelInfo().name : first === fresh.length && fresh.length ? "전부 한 번에! 이런 날이 하루 더 있으면 다음 단계예요." : "";
    $("stamp").textContent = first === fresh.length ? "참 잘했어요" : first >= fresh.length * 0.7 ? "잘했어요" : "수고했어요";
    show("result");
  }

  $("startBtn").addEventListener("click", start);
  $("againBtn").addEventListener("click", start);
  $("doneBtn").addEventListener("click", function () { renderHome(); show("home"); });
  $("retryBtn").addEventListener("click", retry);
  $("quitBtn").addEventListener("click", function () { if (results.length) { S.save(storage, state); } renderHome(); show("home"); });
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
