/* GameQuiz — 여러 게임이 같이 쓰는 "게임 안 수학 문제" (아이별 난이도·아이별 기록)
 *
 * 불러오는 순서(일반 <script>, ES 모듈 게임에서도 이 태그들을 HTML 에 먼저 둔다):
 *   <script src="../math/curriculum.js?v=20"></script>
 *   <script src="../math/learning.js?v=29"></script>
 *   <script src="../math/store.js?v=32"></script>
 *   <script src="../assets/study/math-bridge.js?v=2"></script>
 *   <script src="../assets/study/game-quiz.js?v=1"></script>
 *
 * 쓰는 법:
 *   // 1) 누가 하는지 모르면 먼저 묻는다(이미 골랐으면 그 아이).
 *   const kid = GameQuiz.currentKid() || await GameQuiz.pickKid({ title: "누가 해요?" });
 *   // 2) 문제를 낼 때: 게임을 멈추고 ask 를 부른다. 맞힐 때까지 닫히지 않는다(틀린 보기만 꺼짐, 벌 없음).
 *   pauseGame();
 *   const r = await GameQuiz.ask({
 *     kid,                                   // 'yunchan' | 'jaei' | 'yungeon' | 'taeo' (생략하면 currentKid)
 *     title: "맞히면 부스터가 생겨요!",       // 위쪽 노란 한 줄(게임이 정한다)
 *     hint: "",                              // 문제 아래 작은 안내(선택)
 *     theme: { bg: "rgba(40,10,20,.95)", accent: "#ffcc4d" },   // 색 맞추기(선택)
 *     onCorrect: r => "부스터 +1",           // 정답 직후 패널에 잠깐 띄울 말(선택, 문자열 반환)
 *   });
 *   // r = { firstTry, correct: true, problem, growth }  growth = { promoted, level } 또는 null
 *   if (r.firstTry) giveBigReward(); else giveSmallReward();
 *   resumeGame();
 *
 * 소리를 내지 않는다(게임이 낸다). speechSynthesis 는 절대 쓰지 않는다(iPad 마이크가 죽는다).
 * 패널 DOM·스타일은 이 모듈이 스스로 만들어 document.body 에 붙인다. 게임 HTML 에 마크업이 필요 없다.
 */
(function (root) {
  "use strict";

  /* ---------- 아이 ---------- */
  var KIDS = Object.freeze([
    Object.freeze({ id: "yunchan", name: "윤찬", age: 10, start: 12 }),   // start: 새 기록의 시작 단계(커리큘럼 최고 12 = 2학년 1학기 끝 단계)
    Object.freeze({ id: "jaei", name: "재이", age: 8 }),
    Object.freeze({ id: "yungeon", name: "윤건", age: 7 }),
    Object.freeze({ id: "taeo", name: "태오", age: 5 })
  ]);
  var CURRENT_KEY = "gq_kid_v1";            // 마지막으로 고른 아이 id
  var STATE_PREFIX = "gq_kid_";             // 아이별 기록: gq_kid_<id>_v1
  var STATE_SUFFIX = "_v1";
  var HUB_KEY = "math10_state";             // 허브 기록(읽기만 한다. 절대 쓰지 않는다)
  var PASS_KEY = "hub_play_pass";           // 놀이 시간 만료 시각(play-timer.js 형식 { until }). 문제 패널이 열려 있던 시간만 되돌려 준다.
  var PASS_LEND_MS = 90000;                 // 문제 1개당 최대로 미는 시간

  // 허브 AGE_BANDS 와 같은 표(허브 모듈을 못 읽었을 때만 쓴다).
  var BANDS_FALLBACK = {
    5: { start: 1, cap: 2 }, 6: { start: 1, cap: 4 }, 7: { start: 3, cap: 10 },
    8: { start: 5, cap: 12 }, 9: { start: 5, cap: 12 }
  };

  function mods() {
    var r = root, req = typeof require !== "undefined" ? require : null;
    function get(name, path) {
      if (r[name]) return r[name];
      if (req) { try { return req(path); } catch (_) {} }
      return null;
    }
    return {
      H: get("HubMath", "./math-bridge.js"),
      C: get("Curriculum", "../../math/curriculum.js"),
      L: get("MathLearning", "../../math/learning.js"),
      S: get("MathStore", "../../math/store.js")
    };
  }

  function kidById(id) {
    for (var i = 0; i < KIDS.length; i++) if (KIDS[i].id === id) return KIDS[i];
    return null;
  }
  // 나이 → 단계 범위. 허브 AGE_BANDS 를 그대로 쓰되 9세 이상은 9 칸(허브의 age() 는 10 을 7 로 바꿔 버린다).
  function bandForAge(age) {
    var n = Math.min(9, Math.max(5, parseInt(age, 10) || 7)), m = mods();
    var b = m.H && m.H.AGE_BANDS && m.H.AGE_BANDS[n] ? m.H.AGE_BANDS[n] : BANDS_FALLBACK[n];
    return { age: n, start: b.start, cap: b.cap };
  }

  function defaultStorage() {
    try { if (typeof localStorage !== "undefined") return localStorage; } catch (_) {}
    return null;
  }
  function stateKey(kidId) { return STATE_PREFIX + kidId + STATE_SUFFIX; }

  function clamp(v, a, b) { return Math.min(b, Math.max(a, v)); }
  function freshState(level) { return { v: 1, level: level, skills: {}, wrong: [], solved: 0, firstTries: 0, seeded: "", boost: 0 }; }
  function cleanState(raw, band) {
    var s = freshState(band.start);
    if (raw && typeof raw === "object") {
      s.level = parseInt(raw.level, 10) || band.start;
      s.skills = raw.skills && typeof raw.skills === "object" && !Array.isArray(raw.skills) ? raw.skills : {};
      s.wrong = Array.isArray(raw.wrong) ? raw.wrong.filter(function (w) { return w && w.key && w.problem; }).slice(-60) : [];
      s.solved = Math.max(0, parseInt(raw.solved, 10) || 0);
      s.firstTries = Math.max(0, parseInt(raw.firstTries, 10) || 0);
      s.seeded = typeof raw.seeded === "string" ? raw.seeded : "";
      s.boost = Math.max(0, parseInt(raw.boost, 10) || 0);
    }
    s.level = clamp(s.level, band.start, band.cap);
    return s;
  }

  // 재이 기록을 처음 만들 때만: 허브(math10_state)가 재이 것이면 허브 단계를 시작 단계로 빌려 온다(읽기만).
  function hubSeedLevel(storage, kid, band) {
    if (!storage) return null;
    try {
      var hub = JSON.parse(storage.getItem(HUB_KEY) || "null");
      if (!hub || typeof hub !== "object") return null;
      var name = String(hub.name || "");
      if (!name || name.indexOf(kid.name) < 0) return null;
      var lv = parseInt(hub.level, 10);
      return lv >= 1 ? clamp(lv, band.start, band.cap) : null;
    } catch (_) { return null; }
  }

  /* ---------- 예비 문제(수학 모듈을 못 읽었을 때) ---------- */
  function rint(rng, a, b) { return a + Math.floor(rng() * (b - a + 1)); }
  function choicesFor(answer, rng) {
    var m = mods();
    if (m.H && m.H.choices) { try { return m.H.choices({ answer: answer }, rng); } catch (_) {} }
    var out = [answer], tries = 0;
    while (out.length < 3 && tries++ < 50) { var v = answer + rint(rng, -3, 3); if (v >= 0 && out.indexOf(v) < 0) out.push(v); }
    while (out.length < 3) out.push(answer + out.length);
    return out.sort(function (a, b) { return a - b; });
  }
  function fallbackProblem(age, rng) {
    var a, b, text, answer;
    if (age <= 5) { a = rint(rng, 1, 4); b = rint(rng, 1, 5 - a); text = a + " + " + b + " = □"; answer = a + b; }
    else if (age <= 7) {
      if (rng() < 0.5) { a = rint(rng, 1, 8); b = rint(rng, 1, 9 - a); text = a + " + " + b + " = □"; answer = a + b; }
      else { a = rint(rng, 3, 10); b = rint(rng, 1, a - 1); text = a + " − " + b + " = □"; answer = a - b; }
    } else {
      if (rng() < 0.5) { a = rint(rng, 12, 68); b = rint(rng, 3, 9); text = a + " + " + b + " = □"; answer = a + b; }
      else { a = rint(rng, 21, 89); b = rint(rng, 3, 9); text = a + " − " + b + " = □"; answer = a - b; }
    }
    return { text: text, answer: answer, choices: choicesFor(answer, rng), level: 0, type: "fallback", key: "fb:" + text, raw: null };
  }

  /* ---------- 아이별 문제 공급 ----------
     forKid(kidId, opts?) → { kid, band, next(), record(problem, firstTry), level, state }
     opts: { storage, rng, now } — 테스트용. 보통은 생략(localStorage, Math.random, 지금). */
  function forKid(kidId, opts) {
    opts = opts || {};
    var kid = kidById(kidId) || kidById(currentKid(opts.storage)) || KIDS[1];
    var storage = opts.storage !== undefined ? opts.storage : defaultStorage();
    var rng = opts.rng || Math.random;
    var band = bandForAge(kid.age);
    var lastKey = null;

    function load() {
      var raw = null;
      if (storage) { try { raw = JSON.parse(storage.getItem(stateKey(kid.id)) || "null"); } catch (_) { raw = null; } }
      var s = cleanState(raw, band);
      if (!raw) {
        var seed = hubSeedLevel(storage, kid, band);
        if (seed) { s.level = seed; s.seeded = "hub"; }
      }
      // 아이마다 따로 준 시작 단계(KIDS.start): 새 기록은 거기서 시작, 옛 기록은 낮을 때만 한 번 올린다(boost 표시).
      var st = kid.start ? clamp(kid.start, band.start, band.cap) : 0;
      if (st && s.boost !== st) { if (s.level < st) s.level = st; s.boost = st; }
      return s;
    }
    function save(s) {
      if (!storage) return;
      // 크기 제한: 유형별 기록은 learning.js 가 12개로 자르고, 틀린 문제는 60개까지만.
      s.wrong = s.wrong.slice(-60);
      try { storage.setItem(stateKey(kid.id), JSON.stringify(s)); } catch (_) {}
    }
    var state = load();

    function next() {
      var m = mods();
      // 다른 탭·다른 게임이 같은 아이 기록을 바꿨을 수 있으니 매번 다시 읽는다.
      state = load();
      if (m.H && m.H.next && m.C && m.L && m.S) {
        try {
          var p = m.H.next(state, band.age, rng, lastKey, opts.now);
          lastKey = p.key;
          return { text: p.text, answer: Number(p.answer), choices: m.H.choices(p, rng), level: p.level, type: p.type, key: p.key, review: !!p.review, raw: p };
        } catch (_) {}
      }
      var f = fallbackProblem(band.age, rng); lastKey = f.key; return f;
    }
    // 정답을 맞힌 뒤 한 번 부른다. firstTry: 처음 고른 답이 맞았나. 반환 { promoted, level } (예비 문제면 null)
    function record(problem, firstTry) {
      var m = mods();
      if (!problem || !problem.raw || !m.S || !m.L) return null;
      try {
        state = load();
        var before = state.level;
        m.S.recordAnswer(state, problem.raw, !!firstTry, opts.now);
        state.solved++; if (firstTry) state.firstTries++;
        if (firstTry && state.level < band.cap && m.L.ready(state, state.level)) state.level++;
        save(state);
        return { promoted: state.level > before, level: state.level };
      } catch (_) { return null; }
    }
    return {
      kid: kid, band: band, next: next, record: record,
      get level() { return state.level; },
      get state() { return state; }
    };
  }

  /* ---------- 누가 하고 있나 ---------- */
  function currentKid(storage) {
    storage = storage !== undefined ? storage : defaultStorage();
    try { var id = storage && storage.getItem(CURRENT_KEY); return kidById(id) ? id : null; } catch (_) { return null; }
  }
  function setKid(id, storage) {
    if (!kidById(id)) return false;
    storage = storage !== undefined ? storage : defaultStorage();
    try { if (storage) storage.setItem(CURRENT_KEY, id); } catch (_) {}
    return true;
  }

  /* ---------- 화면 ---------- */
  var hasDom = typeof document !== "undefined" && typeof window !== "undefined";
  var CSS = [
    ".gq-layer{position:fixed;inset:0;z-index:2147483000;pointer-events:none;font-family:'Pretendard Variable',Pretendard,system-ui,-apple-system,sans-serif;}",
    ".gq-layer[hidden]{display:none}",
    ".gq-panel{pointer-events:auto;position:absolute;left:50%;top:var(--gq-top,calc(60px + env(safe-area-inset-top)));transform:translateX(-50%);",
    "width:min(calc(100vw - 24px),var(--gq-width,520px));max-height:calc(100vh - var(--gq-top-num,72px) - 8px);max-height:calc(100dvh - var(--gq-top-num,72px) - 8px);overflow-y:auto;box-sizing:border-box;",
    "padding:clamp(12px,2.6vmin,22px) clamp(14px,3vmin,22px);border:1px solid rgba(255,255,255,.24);border-radius:26px;background:var(--gq-bg,rgba(12,18,58,.96));color:var(--gq-text,#fff);text-align:center;",
    "box-shadow:0 14px 40px rgba(0,0,0,.35);-webkit-user-select:none;user-select:none;-webkit-tap-highlight-color:transparent;touch-action:manipulation;}",
    ".gq-panel *{box-sizing:border-box}",
    ".gq-kicker{margin:0 0 4px;font-size:15px;font-weight:800;line-height:1.35;color:var(--gq-accent,#ffd95a);word-break:keep-all}",
    ".gq-kicker:empty{display:none}",
    ".gq-formula{margin:6px 0 12px;font-size:clamp(24px,min(6.4vw,7vh),40px);font-weight:900;line-height:1.25;letter-spacing:-.02em;color:var(--gq-text,#fff);word-break:keep-all}",
    ".gq-hint{margin:-4px 0 10px;font-size:14px;font-weight:700;color:var(--gq-sub,#cfd8ff);word-break:keep-all}",
    ".gq-hint:empty{display:none}",
    ".gq-choices{display:grid;grid-template-columns:repeat(3,1fr);gap:10px}",
    ".gq-choices.gq-kids{grid-template-columns:repeat(2,1fr)}",
    ".gq-btn{min-height:var(--gq-btn-h,72px);margin:0;padding:6px 4px;border:0;border-radius:18px;background:var(--gq-button,#fff);color:var(--gq-button-text,#17225c);font:inherit;font-weight:900;font-size:clamp(26px,min(6vw,6.5vh),36px);line-height:1.1;cursor:pointer;transition:opacity .2s,filter .2s;}",
    ".gq-btn:active{transform:translateY(2px)}",
    ".gq-btn:focus-visible{outline:4px solid var(--gq-accent,#ffd95a);outline-offset:2px}",
    ".gq-btn.gq-no{background:var(--gq-no,#56608f);color:#aeb7dd}",
    ".gq-btn.gq-ok{background:var(--gq-ok,#7dffb0);color:#06361c}",
    ".gq-panel.gq-locked .gq-btn{opacity:.35;filter:grayscale(.5)}",
    ".gq-say{min-height:24px;margin:8px 0 0;font-size:16px;font-weight:700;line-height:1.4;color:var(--gq-sub,#dfe5ff);word-break:keep-all}"
  ].join("\n");

  var layer = null, panel = null, els = {};
  function ensureDom() {
    if (!hasDom) throw new Error("GameQuiz: 화면(document)이 없어요");
    if (layer && layer.isConnected) return;
    if (!document.getElementById("gq-style")) {
      var st = document.createElement("style"); st.id = "gq-style"; st.textContent = CSS;
      (document.head || document.documentElement).appendChild(st);
    }
    layer = document.createElement("div"); layer.className = "gq-layer"; layer.hidden = true;
    panel = document.createElement("section"); panel.className = "gq-panel"; panel.setAttribute("role", "dialog"); panel.setAttribute("aria-live", "polite");
    els.kicker = document.createElement("p"); els.kicker.className = "gq-kicker";
    els.formula = document.createElement("p"); els.formula.className = "gq-formula";
    els.hint = document.createElement("p"); els.hint.className = "gq-hint";
    els.choices = document.createElement("div"); els.choices.className = "gq-choices";
    els.say = document.createElement("p"); els.say.className = "gq-say";
    panel.append(els.kicker, els.formula, els.hint, els.choices, els.say);
    layer.appendChild(panel);
    // 패널 위에서 새로 누른 것이 게임(window·document 의 누름 리스너)으로 새지 않게 "누름"만 막는다.
    // 뗌(pointerup/cancel/touchend)은 막지 않는다 — 게임 조이스틱을 쥐던 손가락이 패널 위에서 떨어져도 게임이 알아야 한다.
    ["pointerdown", "touchstart", "mousedown"].forEach(function (t) {
      panel.addEventListener(t, function (e) { e.stopPropagation(); }, { passive: true });
    });
    (document.body || document.documentElement).appendChild(layer);
  }
  var THEME_VARS = { bg: "--gq-bg", accent: "--gq-accent", text: "--gq-text", sub: "--gq-sub", button: "--gq-button", buttonText: "--gq-button-text", ok: "--gq-ok", no: "--gq-no", top: "--gq-top", width: "--gq-width" };
  function applyTheme(theme) {
    for (var k in THEME_VARS) panel.style.removeProperty(THEME_VARS[k]);
    panel.style.removeProperty("--gq-top-num");
    if (!theme) return;
    for (var key in theme) if (THEME_VARS[key] && theme[key] != null) panel.style.setProperty(THEME_VARS[key], String(theme[key]));
    // top 을 px 숫자로 주면 max-height 계산에도 쓴다.
    if (typeof theme.top === "number") { panel.style.setProperty("--gq-top", theme.top + "px"); panel.style.setProperty("--gq-top-num", theme.top + "px"); }
  }

  /* 실수 터치 막기(스카이 샷 armChoices 와 같은 규칙)
     (1) 화면이 뜨고 LOCK_MS 동안 버튼이 흐리고 잠긴다.
     (2) 잠금이 풀린 뒤 그 버튼 위에서 새로 누르고(pointerdown) 같은 버튼 위에서 뗀(pointerup) 것만 인정.
         click 은 키보드로 누른 것(detail 0)만, 그것도 화면이 뜬 뒤 새로 누른 키일 때만.
     (3) 숫자키 1~n: 화면이 뜬 뒤 새로 누른 키만(누르고 있던 키의 반복 입력은 무시). */
  var LOCK_MS = 700;
  var guard = null, freshKeyAt = 0, keyHooked = false;
  function hookKeys() {
    if (keyHooked || !hasDom) return; keyHooked = true;
    window.addEventListener("keydown", function (e) {
      if (!guard || e.repeat || performance.now() < guard.armAt) return;
      freshKeyAt = performance.now();
      var n = parseInt(e.key, 10);
      if (n >= 1 && n <= guard.buttons.length) {
        e.preventDefault(); e.stopPropagation();
        var b = guard.buttons[n - 1];
        if (!b.disabled) guard.onPick(b, n - 1);
      }
    }, true);
  }
  function arm(buttons, onPick) {
    hookKeys();
    var g = guard = { armAt: performance.now() + LOCK_MS, buttons: buttons, onPick: onPick, down: null };
    panel.classList.add("gq-locked");
    setTimeout(function () { if (guard === g) panel.classList.remove("gq-locked"); }, LOCK_MS);
    buttons.forEach(function (b, i) {
      b.addEventListener("pointerdown", function (e) { g.down = guard === g && performance.now() >= g.armAt ? { b: b, id: e.pointerId } : null; });
      b.addEventListener("pointerup", function (e) {
        var d = g.down; g.down = null;
        if (guard !== g || !d || d.b !== b || d.id !== e.pointerId || performance.now() < g.armAt || b.disabled) return;
        var at = document.elementFromPoint(e.clientX, e.clientY);
        if (at && !b.contains(at)) return;               // 누른 채 버튼 밖으로 나가서 뗐다
        onPick(b, i);
      });
      b.addEventListener("pointercancel", function () { g.down = null; });
      b.addEventListener("click", function (e) {
        if (e.detail === 0 && guard === g && !b.disabled && freshKeyAt >= g.armAt && performance.now() - freshKeyAt < 1500) onPick(b, i);
      });
    });
  }
  function disarm() { guard = null; if (panel) panel.classList.remove("gq-locked"); }

  function makeButtons(labels, extraClass) {
    els.choices.innerHTML = "";
    els.choices.className = "gq-choices" + (extraClass ? " " + extraClass : "");
    return labels.map(function (label) {
      var b = document.createElement("button"); b.type = "button"; b.className = "gq-btn"; b.textContent = String(label);
      els.choices.appendChild(b); return b;
    });
  }

  /* ---------- 놀이 시간 돌려주기 ----------
     play-timer.js 는 매초 localStorage hub_play_pass({ until: 만료 ms }) 를 다시 읽으므로 이 값을 직접 밀면 된다.
     패널이 열릴 때 미리 90초를 밀어 두고(그래야 열려 있는 동안 "시간 종료" 가 뜨지 않는다),
     닫힐 때 쓰지 않은 만큼 되돌린다 → 순효과 = 열려 있던 시간(최대 90초). free·값 없음·깨진 값·이미 만료면 아무것도 안 한다. */
  function readPass(storage) {
    try {
      var p = JSON.parse(storage.getItem(PASS_KEY) || "null");
      return p && typeof p === "object" && !Array.isArray(p) ? p : null;
    } catch (_) { return null; }
  }
  function dayOf(ms) { var d = new Date(ms); return d.getFullYear() + "-" + String(d.getMonth() + 1).padStart(2, "0") + "-" + String(d.getDate()).padStart(2, "0"); }
  function passUsable(p, now) {
    if (!p || typeof p.until !== "number" || !isFinite(p.until)) return false;
    if (p.free === true && p.day === dayOf(now)) return false;     // 오늘 자유이용
    return p.until > now;                                          // 이미 만료면 되살리지 않는다
  }
  function writePass(storage, p) { try { storage.setItem(PASS_KEY, JSON.stringify(p)); return true; } catch (_) { return false; } }
  // 패널을 열 때. 밀었으면 { at } 를 돌려주고, 아무것도 안 했으면 null.
  function lendPlayTime(storage, now) {
    storage = storage !== undefined ? storage : defaultStorage();
    now = now != null ? now : Date.now();
    if (!storage) return null;
    var p = readPass(storage);
    if (!passUsable(p, now)) return null;
    p.until += PASS_LEND_MS;
    return writePass(storage, p) ? { at: now, storage: storage } : null;
  }
  // 패널을 닫을 때(정답으로 닫힘·close()·페이지 떠남). 쓰지 않은 만큼 되돌린다.
  function settlePlayTime(lend, now) {
    if (!lend || lend.done) return;
    lend.done = true;
    now = now != null ? now : Date.now();
    var used = Math.min(PASS_LEND_MS, Math.max(0, now - lend.at)), back = PASS_LEND_MS - used;
    if (back <= 0) return;
    var p = readPass(lend.storage);
    if (!p || typeof p.until !== "number" || !isFinite(p.until) || (p.free === true && p.day === dayOf(now))) return;
    p.until -= back;
    writePass(lend.storage, p);
  }
  var lend = null, lendHooked = false;
  function openLend() {
    settlePlayTime(lend); lend = lendPlayTime();
    if (!lendHooked && hasDom) { lendHooked = true; window.addEventListener("pagehide", function () { settlePlayTime(lend); lend = null; }); }
  }
  function closeLend() { settlePlayTime(lend); lend = null; }

  var session = null;     // 지금 열린 화면 { kind, problem, resolve, ... }
  var closeTimer = 0;

  function show() { layer.hidden = false; }
  function hide() { if (layer) layer.hidden = true; }

  /* ask(opts) → Promise<{ firstTry, correct:true, problem, growth }>
     opts: { kid, title, hint, theme, onDone(result), onCorrect(result) → 문자열|없음, retryText, closeDelay(ms, 기본 650), quiz(forKid 결과를 직접 줄 때) } */
  var quizCache = {};
  function quizFor(kidId) { if (!quizCache[kidId]) quizCache[kidId] = forKid(kidId); return quizCache[kidId]; }
  function ask(opts) {
    opts = opts || {};
    ensureDom();
    close();
    var kidId = kidById(opts.kid) ? opts.kid : (currentKid() || KIDS[1].id);
    var q = opts.quiz || quizFor(kidId);
    var problem = q.next();
    var resolveFn;
    var promise = new Promise(function (res) { resolveFn = res; });
    var s = session = { kind: "ask", kid: kidId, problem: problem, firstTry: true, done: false, resolve: resolveFn };
    openLend();
    applyTheme(opts.theme);
    els.kicker.textContent = opts.title || "";
    els.formula.textContent = problem.text;
    els.hint.textContent = opts.hint || "";
    els.say.textContent = "";
    var values = problem.choices.slice();
    var buttons = makeButtons(values);
    panel.setAttribute("aria-label", "수학 문제");
    show();
    arm(buttons, function (b, i) {
      if (session !== s || s.done || b.disabled) return;
      if (Number(values[i]) !== Number(problem.answer)) {
        s.firstTry = false; b.disabled = true; b.classList.add("gq-no");
        els.say.textContent = opts.retryText || "괜찮아요. 천천히 다시 골라 봐요.";
        if (typeof opts.onWrong === "function") { try { opts.onWrong({ problem: problem, value: values[i] }); } catch (_) {} }
        return;
      }
      s.done = true; disarm();
      b.classList.add("gq-ok");
      buttons.forEach(function (x) { x.disabled = true; });
      var growth = q.record(problem, s.firstTry);
      var result = { firstTry: s.firstTry, correct: true, problem: problem, growth: growth, kid: kidId };
      var msg = "";
      if (typeof opts.onCorrect === "function") { try { msg = opts.onCorrect(result) || ""; } catch (_) {} }
      els.say.textContent = msg || (s.firstTry ? "정답!" : "정답! 잘했어요.");
      var delay = opts.closeDelay != null ? opts.closeDelay : 650;
      closeTimer = setTimeout(function () {
        if (session !== s) return;
        session = null; hide(); closeLend();
        if (typeof opts.onDone === "function") { try { opts.onDone(result); } catch (e) { setTimeout(function () { throw e; }); } }
        s.resolve(result);
      }, delay);
    });
    return promise;
  }

  /* pickKid(opts) → Promise<kidId>  "누가 해요?" 아이 넷 큰 버튼. 고르면 setKid 하고 onPick(kidId) */
  function pickKid(opts) {
    opts = opts || {};
    ensureDom();
    close();
    var resolveFn;
    var promise = new Promise(function (res) { resolveFn = res; });
    var s = session = { kind: "pick", problem: null, done: false, resolve: resolveFn };
    openLend();
    applyTheme(opts.theme);
    els.kicker.textContent = opts.kicker || "";
    els.formula.textContent = opts.title || "누가 해요?";
    els.hint.textContent = opts.hint || "";
    els.say.textContent = "";
    var buttons = makeButtons(KIDS.map(function (k) { return k.name; }), "gq-kids");
    var now = currentKid();
    buttons.forEach(function (b, i) { b.setAttribute("aria-pressed", String(KIDS[i].id === now)); });
    panel.setAttribute("aria-label", "누가 하는지 고르기");
    show();
    arm(buttons, function (b, i) {
      if (session !== s || s.done) return;
      s.done = true; disarm();
      var id = KIDS[i].id; setKid(id);
      b.classList.add("gq-ok"); buttons.forEach(function (x) { x.disabled = true; });
      closeTimer = setTimeout(function () {
        if (session !== s) return;
        session = null; hide(); closeLend();
        if (typeof opts.onPick === "function") { try { opts.onPick(id); } catch (e) { setTimeout(function () { throw e; }); } }
        s.resolve(id);
      }, opts.closeDelay != null ? opts.closeDelay : 250);
    });
    return promise;
  }

  function isOpen() { return !!session; }
  // 열려 있던 화면을 닫는다(Promise 는 끝나지 않은 채 버려진다 — 게임 판이 끝났을 때 등).
  function close() {
    if (closeTimer) { clearTimeout(closeTimer); closeTimer = 0; }
    session = null; disarm(); hide(); closeLend();
  }
  // 검증용: 지금 화면 상태
  function peek() {
    if (!session) return null;
    return { kind: session.kind, kid: session.kid || null, text: session.problem ? session.problem.text : null, answer: session.problem ? session.problem.answer : null, level: session.problem ? session.problem.level : null, armIn: guard ? Math.round(guard.armAt - performance.now()) : 0 };
  }
  function panelElement() { return panel; }

  var api = {
    KIDS: KIDS, CURRENT_KEY: CURRENT_KEY, HUB_KEY: HUB_KEY, LOCK_MS: LOCK_MS,
    stateKey: stateKey, kidById: kidById, bandForAge: bandForAge, fallbackProblem: fallbackProblem,
    PASS_KEY: PASS_KEY, PASS_LEND_MS: PASS_LEND_MS, lendPlayTime: lendPlayTime, settlePlayTime: settlePlayTime,
    forKid: forKid, currentKid: currentKid, setKid: setKid,
    ask: ask, pickKid: pickKid, isOpen: isOpen, close: close, peek: peek, panel: panelElement
  };
  if (typeof module !== "undefined" && module.exports) module.exports = api;
  else root.GameQuiz = api;
})(typeof window !== "undefined" ? window : globalThis);
