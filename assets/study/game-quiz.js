/* GameQuiz — 여러 게임이 같이 쓰는 "게임 안 수학 문제" (아이별 난이도·아이별 기록)
 *
 * 불러오는 순서(일반 <script>, ES 모듈 게임에서도 이 태그들을 HTML 에 먼저 둔다):
 *   <script src="../math/curriculum.js?v=21"></script>
 *   <script src="../math/learning.js?v=30"></script>
 *   <script src="../math/store.js?v=34"></script>
 *   <script src="../assets/study/math-bridge.js?v=3"></script>
 *   <script src="../assets/study/kid-voices.js?v=1"></script>
 *   <script src="../assets/study/game-quiz.js?v=4"></script>
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
 *     pace: "quick",                         // 선택. "quick" = 자주 묻는 곳(탑 짓기 등): 집 단계 또는 한 단계 아래의 짧은 문제, 도전 없음
 *                                            //       "challenge" = 큰 보상(보스·부엉이 등): 할 만하면 한 단계 위. 생략하면 보통(예전과 같은 자리).
 *   });
 *   // r = { firstTry, correct: true, problem, growth }  growth = { promoted, rose, demoted, level } 또는 null
 *   //   promoted 는 처음 가 보는 단계에 올랐을 때만 true
 *   if (r.firstTry) giveBigReward(); else giveSmallReward();
 *   resumeGame();
 *
 * 소리: 처음 고른 답이 맞으면 그 정답 터치 처리 안에서 바로 그 아이의 외침 하나를 낸다(KidVoices.shout, 1초 안 보상).
 *   고쳐서 맞힌 답에는 외치지 않는다(처음 맞힘과 차이가 들리게). 그 밖의 효과음은 게임이 낸다.
 *   끄기: ask({ voice:false }) 또는 GameQuiz.voiceEnabled = false. 게임 AudioContext 를 쓰려면 ask({ voiceCtx: ctx, voiceOut: node }).
 *   speechSynthesis 는 절대 쓰지 않는다(iPad 마이크가 죽는다).
 * 패널 DOM·스타일은 이 모듈이 스스로 만들어 document.body 에 붙인다. 게임 HTML 에 마크업이 필요 없다.
 */
(function (root) {
  "use strict";

  /* ---------- 아이 ---------- */
  // cap: 게임 문제의 최고 단계(없으면 나이 칸 cap). 허브 AGE_BANDS 는 그대로 두고 게임 쪽만 한 칸 넓힌다:
  //   태오 2 → 4(9까지 덧셈·뺄셈, 10 만들기. 받아올림 없음), 윤건 10 → 12(두 자리 받아올림·받아내림).
  //   다 맞히는 아이가 상한에 묶여 같은 문제만 푸는 것을 막는다. 올라가는 것은 아래 승급 규칙(증거)으로만.
  // 기본 목록(가족판). @family:begin~end 사이는 공개판 빌드가 null 로 바꾼다(공개판은 아래 덮어쓰기 목록만 쓴다).
  var FAMILY_KIDS = /* @family:begin */[
    { id: "yunchan", name: "윤찬", age: 10, start: 13 },   // start: 새 기록의 시작 단계(13 = 2학년 2학기 곱셈구구). 옛 기록은 boost 로 한 번만 올린다
    { id: "jaei", name: "재이", age: 8 },
    { id: "yungeon", name: "윤건", age: 7, cap: 12 },
    { id: "taeo", name: "태오", age: 5, cap: 4 }
  ]/* @family:end */;
  // 아이 목록 덮어쓰기(선택): 이 파일보다 먼저 window.GAMEQUIZ_PROFILES = [{ id, name, age, start?, cap? }, ...] 를 두거나,
  // 읽은 뒤 GameQuiz.configure({ profiles }) 를 부른다. 둘 다 없으면 기본 목록 그대로(가족판 동작은 바뀌지 않는다).
  function freezeKids(list) {
    if (!Array.isArray(list) || !list.length) return null;
    var out = [];
    for (var i = 0; i < list.length; i++) {
      var k = list[i];
      if (!k || typeof k.id !== "string" || !k.id) continue;
      var o = { id: k.id, name: String(k.name || k.id), age: parseInt(k.age, 10) || 8 };
      if (k.start) o.start = parseInt(k.start, 10) || 0;
      if (k.cap) o.cap = parseInt(k.cap, 10) || 0;
      out.push(Object.freeze(o));
    }
    return out.length ? Object.freeze(out) : null;
  }
  var KIDS = freezeKids(root.GAMEQUIZ_PROFILES) || freezeKids(FAMILY_KIDS) || Object.freeze([]);
  // 아이를 모를 때 쓰는 기본 아이: 기본 목록에서는 두 번째(재이), 하나뿐인 목록이면 그 하나.
  function defaultKid() { return KIDS[1] || KIDS[0] || null; }

  /* ---------- 난이도 조절 규칙(기록 형식 v2, game-quiz ?v=4) ----------
     목표: 처음 고른 답이 맞는 비율 75~85%. 너무 쉬우면 금방 올리고, 막히면 바로 쉬운 문제로 받쳐 준다.
     - 집 단계(level): 아이가 지금 머무는 단계. 문제의 대부분이 여기서 나온다.
     - 섞기: 최근 10문제 정답률에 따라 한 단계 아래(복습)·한 단계 위(도전)를 조금씩 섞는다(90%↑ 도전 25%, 65%↓ 아래 35%).
       어제 틀린 문제 복습은 약 12%. 바로 앞과 같은 문제·같은 유형은 피한다(유형이 하나뿐인 단계 제외).
     - 받침 문제: 처음 답이 틀리면 다음 문제는 한 단계 아래, 두 번 연속이면 두 단계 아래. 최근 3문제에 오답이 있으면 도전 문제 없음.
     - 지루함 끊기: 6문제 연속 첫 정답이면 다음은 한 단계 위.
     - 자리 찾기(placing): 새 기록·옛 기록은 처음에 빨리 자리를 찾는다(집 단계 3문제 연속 정답 → 2단계 위로,
       2문제 놓치면 1단계 아래). 처음 내려가는 순간(가장자리 발견)·함부로 누름·30문제 뒤에 끝난다.
     - 승급: 집 단계와 그 위 문제 최근 8개 중 7개 이상 첫 정답 + 도전 문제(있으면) 75% 이상
       (내려왔던 단계로 40문제 안에 다시 올라갈 때는 10개 중 9개), 또는 도전 문제 3개 연속 + 최근 5개 중 4개,
       또는 허브의 숙달 규칙(MathLearning.ready).
     - 강등: 집 단계 최근 8문제(함부로 누른 것 제외) 중 5문제 이하, 또는 첫 답 오답 3번 연속(받침 문제까지 놓쳤으면 2단계).
       단계를 옮기면 창을 비운다(되튐 방지). 바닥은 1단계, 하루에 그날 시작 단계보다 3단계 넘게는 내려가지 않는다.
     - 함부로 누른 답(잠금이 풀린 뒤 0.7초 안에 고른 오답, 그 뒤 5문제 안의 오답)은 내려가는 증거로 세지 않는다
       (올라가는 창에서는 오답으로 센다 — 마구 눌러 올라가지도 않게).
     - 응답 시간(hist[].ms)은 기록만 한다. 읽는 시간이 섞여 있어(태오는 글 읽기가 느리다) 승급·강등에는 쓰지 않는다.
     - growth.promoted 는 처음 가 보는 단계에 오를 때만 true(내려갔다 다시 오른 것은 rose 만 true). */
  var TUNE = Object.freeze({
    win: 8, promoteOk: 7,              // 승급 창
    reentryWin: 10, reentryOk: 9, reentrySpan: 40,   // 내려왔던 단계로 다시 올라갈 때(40문제 안)
    demoteWin: 8, demoteMaxOk: 5, missRun: 3,         // 강등(집 단계 8문제 중 5문제 이하 = 62.5% 이하)
    placeStreak: 3, placeStep: 2, placeMax: 30,       // 자리 찾기
    tapMs: 700,                        // 이보다 빨리 고른 오답은 함부로 누름
    dayDrop: 3,                        // 하루에 그날 시작 단계보다 이만큼까지만 내려간다
    histMax: 40, reviewShare: 0.12, shortText: 14
  });
  var ADAPT_V = 2;                     // 아이별 기록 형식(v1 → v2: 그대로 두고 필드만 더한다)
  var CURRENT_KEY = "gq_kid_v1";            // 마지막으로 고른 아이 id
  var STATE_PREFIX = "gq_kid_";             // 아이별 기록: gq_kid_<id>_v1
  var STATE_SUFFIX = "_v1";
  var HUB_KEY = "math10_state";             // 허브 기록(읽기만 한다. 절대 쓰지 않는다)
  var PASS_KEY = "hub_play_pass";           // 놀이 시간 만료 시각(play-timer.js 형식 { until }). 문제 패널이 열려 있던 시간만 되돌려 준다.
  var PASS_LEND_MS = 90000;                 // 문제 1개당 최대로 미는 시간

  // 허브 AGE_BANDS 와 같은 표(허브 모듈을 못 읽었을 때만 쓴다).
  var BANDS_FALLBACK = {
    5: { start: 1, cap: 2 }, 6: { start: 1, cap: 4 }, 7: { start: 3, cap: 10 },
    8: { start: 5, cap: 19 }, 9: { start: 5, cap: 19 }, 10: { start: 13, cap: 19 }
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
  // 나이 → 단계 범위. 허브 AGE_BANDS 를 그대로 쓰되 10세 이상은 10 칸.
  function bandForAge(age) {
    var n = Math.min(10, Math.max(5, parseInt(age, 10) || 7)), m = mods();
    var b = m.H && m.H.AGE_BANDS && m.H.AGE_BANDS[n] ? m.H.AGE_BANDS[n] : BANDS_FALLBACK[n];
    return { age: n, start: b.start, cap: b.cap };
  }

  function defaultStorage() {
    try { if (typeof localStorage !== "undefined") return localStorage; } catch (_) {}
    return null;
  }
  function stateKey(kidId) { return STATE_PREFIX + kidId + STATE_SUFFIX; }

  function clamp(v, a, b) { return Math.min(b, Math.max(a, v)); }
  // 게임 문제의 단계 범위: 시작은 나이 칸 start(새 기록만), 바닥은 1(막히면 끝까지 내려갈 수 있다), 꼭대기는 kid.cap 또는 나이 칸 cap.
  function rangeFor(kid) {
    var b = bandForAge(kid.age);
    return { age: b.age, start: b.start, floor: 1, cap: Math.max(b.cap, kid.cap || 0) };
  }
  function freshState(level) {
    return { v: ADAPT_V, level: level, skills: {}, wrong: [], solved: 0, firstTries: 0, seeded: "", boost: 0,
      hist: [], since: 0, placing: true, missRun: 0, downFrom: null, day: null, best: level, last: null, taps: 0 };
  }
  function cleanHist(list) {
    if (!Array.isArray(list)) return [];
    return list.filter(function (h) { return h && typeof h === "object" && h.l >= 1 && h.l <= 99; }).slice(-TUNE.histMax).map(function (h) {
      var o = { l: h.l | 0, t: String(h.t || ""), ok: h.ok ? 1 : 0, k: String(h.k || "at") };
      if (typeof h.ms === "number" && isFinite(h.ms)) o.ms = Math.max(0, Math.min(600000, Math.round(h.ms)));
      if (h.tap) o.tap = 1;
      if (h.d) o.d = String(h.d).slice(0, 10);
      return o;
    });
  }
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
      // v2 필드. v1 기록(이 필드가 없음)은 단계·풀이 기록을 그대로 두고 자리 찾기만 한 번 다시 한다.
      s.hist = cleanHist(raw.hist);
      s.since = Math.max(0, parseInt(raw.since, 10) || 0);
      s.placing = (parseInt(raw.v, 10) || 1) < ADAPT_V ? true : raw.placing === true;
      s.missRun = Math.max(0, parseInt(raw.missRun, 10) || 0);
      s.downFrom = raw.downFrom && raw.downFrom.l >= 1 ? { l: raw.downFrom.l | 0, at: Math.max(0, raw.downFrom.at | 0) } : null;
      s.day = raw.day && typeof raw.day.d === "string" && raw.day.start >= 1 ? { d: raw.day.d.slice(0, 10), start: raw.day.start | 0 } : null;
      s.best = Math.max(s.level, parseInt(raw.best, 10) || 0);
      s.last = raw.last && typeof raw.last === "object" ? { k: String(raw.last.k || ""), t: String(raw.last.t || ""), l: raw.last.l | 0 } : null;
      s.taps = Math.max(0, parseInt(raw.taps, 10) || 0);
      if (raw.lastTap != null && isFinite(raw.lastTap)) s.lastTap = Math.max(0, parseInt(raw.lastTap, 10) || 0);
      if (raw.placeN != null) s.placeN = Math.max(0, parseInt(raw.placeN, 10) || 0);
    }
    s.v = ADAPT_V;
    s.level = clamp(s.level, band.floor != null ? band.floor : band.start, band.cap);
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
  function choicesFor(answer, rng, distractors) {
    var m = mods();
    if (m.H && m.H.choices) { try { return m.H.choices({ answer: answer, distractors: distractors }, rng); } catch (_) {} }
    var out = [answer], tries = 0;
    while (out.length < 3 && tries++ < 50) { var v = answer + rint(rng, -3, 3); if (v >= 0 && out.indexOf(v) < 0) out.push(v); }
    while (out.length < 3) out.push(answer + out.length);
    return out.sort(function (a, b) { return a - b; });
  }
  function fallbackProblem(age, rng) {
    var a, b, text, answer, wrong;
    if (age >= 10) {
      // 10세 이상: 곱셈구구(2~9단). 오답은 옆 단 값(한 묶음 많거나 적게)
      a = rint(rng, 2, 9); b = rint(rng, 2, 9); text = a + " × " + b + " = □"; answer = a * b;
      wrong = [a * (b - 1), a * (b + 1), (a + 1) * b];
    } else if (age <= 5) { a = rint(rng, 1, 4); b = rint(rng, 1, 5 - a); text = a + " + " + b + " = □"; answer = a + b; }
    else if (age <= 7) {
      if (rng() < 0.5) { a = rint(rng, 1, 8); b = rint(rng, 1, 9 - a); text = a + " + " + b + " = □"; answer = a + b; }
      else { a = rint(rng, 3, 10); b = rint(rng, 1, a - 1); text = a + " − " + b + " = □"; answer = a - b; }
    } else {
      if (rng() < 0.5) { a = rint(rng, 12, 68); b = rint(rng, 3, 9); text = a + " + " + b + " = □"; answer = a + b; }
      else { a = rint(rng, 21, 89); b = rint(rng, 3, 9); text = a + " − " + b + " = □"; answer = a - b; }
    }
    return { text: text, answer: answer, choices: choicesFor(answer, rng, wrong), level: 0, type: "fallback", key: "fb:" + text, raw: null };
  }

  /* ---------- 보기 3개 ----------
     예전(math-bridge choices)은 ±1·±2 를 고른 뒤 작은 순으로 늘어놓아, 정답이 가운데에 오는 일이 약 60%였다(가운데만 눌러도 60%).
     여기서는 정답 자리(왼쪽·가운데·오른쪽)를 먼저 고르게 뽑고, 그 자리에 맞게 정답보다 작은/큰 오답을 고른다. 늘어놓는 순서는 그대로 작은 순.
     문제 글에 고를 수가 적혀 있는 유형(큰 수·작은 수·짝수·홀수·숫자 카드)은 글에 있는 수로 보기를 만든다
     (예전엔 "57과 83 중 더 큰 수" 의 보기가 82·83·84 라서 글에 있는 수만 찾으면 됐고, 짝수 문제엔 짝수 보기가 둘 나오기도 했다). */
  function shuffled(list, rng) {
    var a = list.slice();
    for (var i = a.length - 1; i > 0; i--) { var j = Math.floor(rng() * (i + 1)), t = a[i]; a[i] = a[j]; a[j] = t; }
    return a;
  }
  function textChoices(p, rng) {
    var nums = (String(p.text).match(/\d+/g) || []).map(Number), ans = Number(p.answer);
    if (p.type === "evenPick" || p.type === "oddPick") {
      var list = nums.filter(function (v, i) { return nums.indexOf(v) === i; });
      if (list.length === 3 && list.indexOf(ans) >= 0) return list.sort(function (a, b) { return a - b; });
    }
    if (p.type === "bigger" || p.type === "smaller") {
      // 두 수 + 그럴듯한 셋째(두 수 사이의 수 또는 바깥쪽 가까운 수 — 정답이 가장 크거나 작은 보기가 되지 않게)
      if (nums.length >= 2) {
        var a = nums[0], b = nums[1], lo = Math.min(a, b), hi = Math.max(a, b), third;
        if (hi - lo >= 2) third = lo + 1 + Math.floor(rng() * (hi - lo - 1));
        else third = p.type === "bigger" ? hi + 1 : Math.max(0, lo - 1);
        // 사이 수를 넣으면 "큰 수" 정답이 늘 오른쪽 끝이 된다. 그래서 절반은 바깥쪽(큰 수 문제는 더 큰 수, 작은 수 문제는 더 작은 수)을 넣는다.
        if (rng() < 0.5) third = p.type === "bigger" ? hi + 1 + Math.floor(rng() * 3) : Math.max(0, lo - 1 - Math.floor(rng() * 3));
        if (third !== a && third !== b) return [a, b, third].sort(function (x, y) { return x - y; });
      }
    }
    if ((p.type === "biggest2" || p.type === "smallest2") && nums.length >= 4) {
      var cards = nums.slice(0, 3), made = [];
      for (var i = 0; i < 3; i++) for (var j = 0; j < 3; j++) if (i !== j) made.push(cards[i] * 10 + cards[j]);
      var others = shuffled(made.filter(function (v) { return v !== ans; }), rng).slice(0, 2);
      if (others.length === 2) return [ans].concat(others).sort(function (x, y) { return x - y; });
    }
    return null;
  }
  function buildChoices(p, rng) {
    rng = rng || Math.random;
    var fromText = textChoices(p, rng);
    if (fromText) return fromText;
    var ans = Number(p.answer), len = String(ans).length;
    function ok(v) { return Number.isInteger(v) && v >= 0 && v !== ans && Math.abs(String(v).length - len) <= 1; }
    var typed = Array.isArray(p.distractors) ? shuffled(p.distractors.map(Number), rng).filter(ok) : [];
    var offs = ans > 100 ? [10, 100, 1, 20] : ans >= 20 ? [10, 1, 2, 20] : [1, 2, 3, 4];
    var below = [], above = [];
    function add(v) { if (!ok(v) || below.indexOf(v) >= 0 || above.indexOf(v) >= 0) return; (v < ans ? below : above).push(v); }
    typed.forEach(add);
    var nb = below.length, na = above.length;   // 문제 유형이 준 그럴듯한 오답이 먼저(뒤에 붙는 ±값은 모자랄 때만)
    shuffled(offs, rng).forEach(function (d) { add(ans - d); add(ans + d); });
    // 정답 자리 0·1·2 를 고르게. 그 자리를 만들 수 없으면(정답이 0 이라 더 작은 수가 없는 등) 되는 자리 중에서.
    var pos = Math.floor(rng() * 3), can = [0, 1, 2].filter(function (k) { return below.length >= k && above.length >= 2 - k; });
    if (can.indexOf(pos) < 0) pos = can.length ? can[Math.floor(rng() * can.length)] : 0;
    // 각 쪽에서 문제 유형 오답을 먼저, 그 안에서는 정답에 가까운 것부터
    function take(list, typedCount, n) {
      var t = list.slice(0, typedCount), rest = list.slice(typedCount).sort(function (x, y) { return Math.abs(x - ans) - Math.abs(y - ans); });
      return t.concat(rest).slice(0, n);
    }
    var out = [ans].concat(take(below, nb, pos), take(above, na, 2 - pos));
    var f = 1;
    while (out.length < 3 && f < 50) { if (out.indexOf(ans + f) < 0) out.push(ans + f); f++; }
    return out.sort(function (x, y) { return x - y; });
  }

  /* ---------- 아이별 문제 공급 ----------
     forKid(kidId, opts?) → { kid, band, next(askOpts?), record(problem, firstTry, info?), level, state }
     opts: { storage, rng, now } — 테스트용. 보통은 생략(localStorage, Math.random, 지금).
     askOpts.pace: "quick"(자주 묻는 곳: 집 단계 또는 한 단계 아래, 짧은 문제, 도전 없음)
                   "challenge"(큰 보상: 할 만하면 한 단계 위) / 생략하면 보통.
     info.ms: 잠금이 풀린 뒤 처음 고르기까지 걸린 시간(ask 가 잰다). */
  function forKid(kidId, opts) {
    opts = opts || {};
    var kid = kidById(kidId) || kidById(currentKid(opts.storage)) || defaultKid();
    var storage = opts.storage !== undefined ? opts.storage : defaultStorage();
    var rng = opts.rng || Math.random;
    var band = rangeFor(kid);
    var lastKey = null;

    function today() { var m = mods(); return m.S && m.S.today ? m.S.today(opts.now) : dayOf(opts.now ? new Date(opts.now).getTime() : Date.now()); }
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
      s.best = Math.max(s.best || 0, s.level);
      var t = today();
      if (!s.day || s.day.d !== t) s.day = { d: t, start: s.level };
      return s;
    }
    function save(s) {
      if (!storage) return;
      // 크기 제한: 유형별 기록은 learning.js 가 12개로 자르고, 틀린 문제는 60개까지만, 최근 기록은 40개.
      s.wrong = s.wrong.slice(-60);
      s.hist = s.hist.slice(-TUNE.histMax);
      try { storage.setItem(stateKey(kid.id), JSON.stringify(s)); } catch (_) {}
    }
    var state = load();

    // 단계를 옮긴 뒤(since)의 기록 중 그 단계 것만, 최근 n개
    function windowAt(s, lv, n, orAbove) {
      var out = [], recent = s.hist.slice(-s.since);
      if (!s.since) return out;
      for (var i = recent.length - 1; i >= 0 && out.length < n; i--) if (recent[i].l === lv || (orAbove && recent[i].l > lv)) out.push(recent[i]);
      return out;
    }
    function okCount(list) { return list.reduce(function (a, h) { return a + (h.ok ? 1 : 0); }, 0); }
    function recentRate(s, n) { var r = s.hist.slice(-n); return r.length ? okCount(r) / r.length : null; }

    // 유형 고르기: 덜 풀어 본 유형 먼저, 약한 유형(최근 절반 미만)은 덜 자주(한 유형이 단계 전체를 끌어내리지 않게), 바로 앞 유형은 피한다.
    function pickType(m, s, lv, pace) {
      var rows = m.L.summary(s, lv), lastT = s.last && s.last.l === lv ? s.last.t : "";
      var fewest = Math.min.apply(null, rows.map(function (r) { return r.count; }));
      var w = rows.map(function (r) {
        var x = r.count === fewest ? 3 : 1, rate = r.count ? r.correct / r.count : null;
        if (rate !== null && r.count >= 3 && rate < 0.5) x *= 0.4;
        if (pace === "quick" && rate !== null && r.count >= 2 && rate < 0.75) x *= 0.3;
        if (rows.length > 1 && r.type === lastT) x *= 0.15;
        return x;
      });
      var sum = w.reduce(function (a, b) { return a + b; }, 0), u = rng() * sum;
      for (var i = 0; i < rows.length; i++) { u -= w[i]; if (u < 0) return rows[i].type; }
      return rows[rows.length - 1].type;
    }
    function make(m, s, lv, pace) {
      var type = pickType(m, s, lv, pace), best = null;
      for (var i = 0; i < 6; i++) {
        var p = m.C.makeProblem(lv, rng, type);
        if (p.key === lastKey || (s.last && p.key === s.last.k)) continue;
        if (pace === "quick" && String(p.text).length > TUNE.shortText) { if (!best || p.text.length < best.text.length) best = p; type = pickType(m, s, lv, pace); continue; }
        return p;
      }
      return best || m.C.makeProblem(lv, rng, type);
    }
    // 이번 문제의 자리: builder(받침) / review(복습) / down / at / up
    function plan(s, pace) {
      var H = s.level, canUp = H < band.cap, canDown = H > 1, r10 = recentRate(s, 10), n10 = Math.min(10, s.hist.length);
      var real3 = s.hist.filter(function (h) { return !h.tap; }).slice(-3), lastMiss = real3.length && !real3[real3.length - 1].ok;
      // 받침 문제: 바로 앞 문제를 처음에 틀렸으면(단계를 막 옮겼어도) 한 단계 아래에서
      // 두 번 연속 놓쳤으면 두 단계 아래(한 단계 아래도 어렵다는 뜻)
      if (s.missRun >= 1 || lastMiss) return canDown ? { slot: "builder", lv: Math.max(1, H - (s.missRun >= 2 ? 2 : 1)) } : { slot: "builder", lv: H };
      if (real3.some(function (h) { return !h.ok; })) canUp = false;     // 최근 3문제에 오답이 있으면 도전 문제는 쉰다
      // 지루함 끊기: 6문제 연속 첫 정답이면 다음은 한 단계 위(빠른 문제 자리면 적어도 집 단계)
      var last6 = s.hist.slice(-6), streak6 = last6.length === 6 && last6.every(function (h) { return h.ok; });
      var last8 = s.hist.slice(-8), streak8 = last8.length === 8 && last8.every(function (h) { return h.ok; });
      if (pace === "quick") {
        // 빠른 문제: 보통은 집 단계 또는 한 단계 아래. 8문제 연속 첫 정답이면 그때만 한 문제 위(너무 쉬운 문제만 이어지지 않게).
        if (streak8 && canUp && !s.placing) return { slot: "up", lv: H + 1 };
        return streak6 ? { slot: "at", lv: H } : canDown && rng() < 0.35 ? { slot: "down", lv: H - 1 } : { slot: "at", lv: H };
      }
      if (streak6 && canUp && !s.placing) return { slot: "up", lv: H + 1 };
      if (pace === "challenge") return canUp && !s.placing && (r10 === null || r10 >= 0.7) ? { slot: "up", lv: H + 1 } : { slot: "at", lv: H };
      if (s.placing) return { slot: "at", lv: H };
      var up, down;
      if (r10 === null || n10 < 5) { up = 0.05; down = 0.15; }
      else if (r10 >= 0.9) { up = 0.25; down = 0.05; }
      else if (r10 >= 0.8) { up = 0.15; down = 0.10; }
      else if (r10 >= 0.65) { up = 0.05; down = 0.20; }
      else { up = 0; down = 0.35; }
      if (!canUp) { down = Math.max(0, down - 0.05); up = 0; }
      if (!canDown) down = 0;
      var u = rng();
      if (u < up) return { slot: "up", lv: H + 1 };
      if (u < up + down) return { slot: "down", lv: H - 1 };
      return { slot: "at", lv: H };
    }

    function next(askOpts) {
      var m = mods(), pace = askOpts && (askOpts.pace === "quick" || askOpts.pace === "challenge") ? askOpts.pace : "";
      // 다른 탭·다른 게임이 같은 아이 기록을 바꿨을 수 있으니 매번 다시 읽는다.
      state = load();
      if (m.H && m.C && m.L && m.S) {
        try {
          var s = state, pl = plan(s, pace), p = null;
          // 틀린 문제 복습(하루 뒤부터): 받침·도전·자리 찾기가 아닐 때 가끔(약 12%), 집 단계 이하만.
          if (pl.slot !== "builder" && pl.slot !== "up" && !s.placing && rng() < TUNE.reviewShare) {
            var due = m.S.dueReviews(s, opts.now).filter(function (e) { return e.problem.level <= s.level && e.key !== lastKey && !(s.last && e.key === s.last.k); });
            if (due.length && (pace !== "quick" || String(due[0].problem.text).length <= TUNE.shortText)) {
              var v = m.L.variant(due[0].problem, rng, []) || due[0].problem;
              p = Object.assign({}, v, { review: true, reviewKey: due[0].key });
              pl = { slot: "review", lv: p.level };
            }
          }
          if (!p) p = make(m, s, pl.lv, pace);
          lastKey = p.key;
          return { text: p.text, answer: Number(p.answer), choices: buildChoices(p, rng), level: p.level, type: p.type, key: p.key, review: !!p.review, slot: pl.slot, home: s.level, raw: p };
        } catch (_) {}
      }
      var f = fallbackProblem(band.age, rng); lastKey = f.key; return f;
    }

    function move(s, to, why) {
      var from = s.level;
      to = clamp(to, 1, band.cap);
      if (to < from) to = Math.max(to, s.day.start - TUNE.dayDrop);   // 하루에 너무 많이 내려가지 않는다(함부로 누르는 날 대비)
      if (to === from) return;
      if (to < from) {
        s.downFrom = { l: from, at: s.solved };
        s.placing = false;
      }
      s.level = to; s.since = 0; s.missRun = 0; s.moved = why;
      s.best = Math.max(s.best || 0, to);
    }
    function real(list) { return list.filter(function (h) { return !h.tap; }); }
    function adapt(s) {
      var H = s.level, w;
      // 첫 답 오답이 연달아 나오면(받침 문제까지 놓치면) 언제든 한 단계 내린다
      if (s.missRun >= TUNE.missRun) {
        // 받침 문제(집 단계 아래)까지 놓쳤으면 두 단계 내린다
        var lowMiss = s.hist.slice(-2).some(function (h) { return !h.ok && !h.tap && h.l < H; });
        return move(s, H - (lowMiss ? 2 : 1), "miss-run");
      }
      if (s.placing) {
        s.placeN = (s.placeN || 0) + 1;
        w = windowAt(s, H, 4);
        if (w.length >= TUNE.placeStreak && w.slice(0, TUNE.placeStreak).every(function (h) { return h.ok; }) && H < band.cap) return move(s, H + TUNE.placeStep, "place-up");
        w = real(w);
        if (w.length >= 2 && w.length - okCount(w) >= 2) return move(s, H - 1, "place-down");
        if (s.placeN >= TUNE.placeMax || H >= band.cap) s.placing = false;
        return;
      }
      // 강등: 집 단계 최근 문제(함부로 누른 것 빼고) 중 절반 이하
      w = real(windowAt(s, H, TUNE.demoteWin + 4)).slice(0, TUNE.demoteWin);
      if (w.length >= TUNE.demoteWin && okCount(w) <= TUNE.demoteMaxOk) return move(s, H - 1, "low-rate");
      if (H >= band.cap) return;
      // 승급: 집 단계가 충분히 쉽고(창), 한 단계 위 도전 문제도 할 만할 때(되튐 방지). 함부로 누른 오답은 여기선 오답으로 센다.
      var re = s.downFrom && s.downFrom.l === H + 1 && s.solved - s.downFrom.at < TUNE.reentrySpan;
      var need = re ? TUNE.reentryWin : TUNE.win, okNeed = re ? TUNE.reentryOk : TUNE.promoteOk;
      // 창은 집 단계와 그 위(도전) 문제를 함께 센다 — 도전 문제를 연달아 맞히는 아이가 집 단계 문제가 모자라 못 오르는 일이 없게.
      var ups = windowAt(s, H + 1, 4), upOk = okCount(ups);
      w = windowAt(s, H, need, true);
      if (w.length >= need && okCount(w) >= okNeed) {
        if (ups.length >= 2 ? upOk / ups.length >= 0.75 : okCount(windowAt(s, H, need + 2, true)) >= need + 1 && !re) return move(s, H + 1, "window");
      }
      var w5 = windowAt(s, H, 5, true);
      if (ups.length >= 3 && ups.slice(0, 3).every(function (h) { return h.ok; }) && w5.length >= 5 && okCount(w5) >= 4) return move(s, H + 1, "stretch");
    }

    // 정답을 맞힌 뒤 한 번 부른다. firstTry: 처음 고른 답이 맞았나. info.ms: 처음 고르기까지(잠금 뒤) 걸린 ms.
    // 반환 { promoted(처음 가 보는 단계), rose, demoted, level } (예비 문제면 null)
    function record(problem, firstTry, info) {
      var m = mods();
      if (!problem || !problem.raw || !m.S || !m.L) return null;
      try {
        state = load();
        var s = state, before = s.level, bestBefore = s.best || s.level, ok = !!firstTry, ms = info && typeof info.ms === "number" && isFinite(info.ms) ? info.ms : null;
        s.solved++; if (ok) s.firstTries++;
        s.last = { k: problem.key, t: problem.type, l: problem.level };
        // 함부로 누른 오답(잠금 풀린 뒤 0.7초 안, 또는 그런 누름 뒤 5문제 안의 오답): 내려가는 증거로 세지 않는다.
        // 복습 목록에도 넣지 않는다. 다만 올라가는 창에서는 오답으로 센다(마구 눌러 맞힌 것만 모여 올라가지 않게).
        var tap = !ok && ((ms !== null && ms < TUNE.tapMs) || (s.lastTap != null && s.solved - s.lastTap <= 5));
        if (!ok && ms !== null && ms < TUNE.tapMs) { s.taps++; s.lastTap = s.solved; s.placing = false; }
        // 유형 기록(허브 숙달 규칙이 보는 것)에는 오답으로 남긴다 — 빼면 맞힌 것만 남아 숙달로 잘못 오른다.
        if (!tap) m.S.recordAnswer(s, problem.raw, ok, opts.now);
        else m.L.record(s, problem.raw, false, today());
        var h = { l: problem.level, t: problem.type, ok: ok ? 1 : 0, k: problem.slot || "at", d: today() };
        if (ms !== null) h.ms = Math.round(ms);
        if (tap) h.tap = 1;
        s.hist.push(h); s.since++;
        if (!tap) s.missRun = ok ? 0 : s.missRun + 1;
        delete s.moved;
        adapt(s);
        // 허브의 숙달 규칙(유형마다 이틀 이상 풀어 확인)으로도 오른다(예전 규칙 유지)
        var reentry = s.downFrom && s.downFrom.l === s.level + 1 && s.solved - s.downFrom.at < TUNE.reentrySpan;
        if (ok && s.level === before && s.level < band.cap && !s.placing && !reentry && m.L.ready(s, s.level)) move(s, s.level + 1, "mastery");
        save(s);
        // promoted: 처음 가 보는 단계에 올라섰을 때만(게임이 "N단계로 올라갔어요!" 를 띄운다 — 내려갔다 다시 오른 것은 축하하지 않는다)
        return { promoted: s.level > before && s.level > bestBefore, rose: s.level > before, demoted: s.level < before, level: s.level };
      } catch (_) { return null; }
    }
    return {
      kid: kid, band: band, next: next, record: record,
      get level() { return state.level; },
      get state() { return state; }
    };
  }

  /* ---------- 부모용: 아이별 게임 수학 단계 보기·고치기 (화면 없음. 브라우저 콘솔에서 GameQuiz.levels() / GameQuiz.setLevel("taeo", 3)) ----------
     levels() → [{ id, name, level, best, solved, firstTryPct, recent: 최근 20문제 첫 정답 %, placing }]
     setLevel(id, level) → 고친 단계(범위 안으로) 또는 null. 풀이 기록은 그대로 두고 자리 찾기를 끈다. */
  function levels(storage) {
    storage = storage !== undefined ? storage : defaultStorage();
    return KIDS.map(function (k) {
      var raw = null;
      try { raw = storage ? JSON.parse(storage.getItem(stateKey(k.id)) || "null") : null; } catch (_) {}
      var s = cleanState(raw, rangeFor(k)), r = s.hist.slice(-20);
      return { id: k.id, name: k.name, level: raw ? s.level : null, best: raw ? s.best : null, solved: s.solved,
        firstTryPct: s.solved ? Math.round(100 * s.firstTries / s.solved) : null,
        recent: r.length ? Math.round(100 * r.filter(function (h) { return h.ok; }).length / r.length) : null, placing: !!raw && s.placing };
    });
  }
  function setLevel(kidId, level, storage) {
    var kid = kidById(kidId); if (!kid) return null;
    storage = storage !== undefined ? storage : defaultStorage();
    if (!storage) return null;
    var band = rangeFor(kid), raw = null;
    try { raw = JSON.parse(storage.getItem(stateKey(kid.id)) || "null"); } catch (_) {}
    var s = cleanState(raw, band);
    s.level = clamp(parseInt(level, 10) || s.level, 1, band.cap);
    s.best = Math.max(s.best || 0, s.level); s.placing = false; s.since = 0; s.missRun = 0; s.downFrom = null; s.day = null;
    if (kid.start) s.boost = clamp(kid.start, band.start, band.cap);   // 윤찬 시작 단계 올리기가 다시 덮어쓰지 않게
    try { storage.setItem(stateKey(kid.id), JSON.stringify(s)); } catch (_) { return null; }
    return s.level;
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
  var lend = null, lendHooked = false, lendOn = true;   // lendOn: configure({ playPass: false }) 면 놀이 시간을 건드리지 않는다
  function openLend() {
    settlePlayTime(lend); lend = lendOn ? lendPlayTime() : null;
    if (!lendHooked && hasDom) { lendHooked = true; window.addEventListener("pagehide", function () { settlePlayTime(lend); lend = null; }); }
  }
  function closeLend() { settlePlayTime(lend); lend = null; }

  var session = null;     // 지금 열린 화면 { kind, problem, resolve, ... }
  var closeTimer = 0;

  function show() { layer.hidden = false; }
  function hide() { if (layer) layer.hidden = true; }

  /* ask(opts) → Promise<{ firstTry, correct:true, problem, growth }>
     opts: { kid, title, hint, theme, onDone(result), onCorrect(result) → 문자열|없음, retryText, closeDelay(ms, 기본 650), quiz(forKid 결과를 직접 줄 때),
           voice(false 면 정답 외침 끔), voiceCtx·voiceOut(게임 AudioContext 로 외침을 낼 때),
           pace("quick" | "challenge" | 생략 — 위 머리말 참고. 모르는 값은 생략과 같다) } */
  var quizCache = {};
  function quizFor(kidId) { if (!quizCache[kidId]) quizCache[kidId] = forKid(kidId); return quizCache[kidId]; }
  function ask(opts) {
    opts = opts || {};
    ensureDom();
    close();
    var kidId = kidById(opts.kid) ? opts.kid : (currentKid() || defaultKid().id);
    var q = opts.quiz || quizFor(kidId);
    var problem = q.next({ pace: opts.pace });
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
      // 처음 고르기까지 걸린 시간(잠금이 풀린 뒤부터). 기록용 + 함부로 누른 오답 가려내기.
      if (s.firstMs == null && guard) s.firstMs = Math.max(0, performance.now() - guard.armAt);
      if (Number(values[i]) !== Number(problem.answer)) {
        s.firstTry = false; b.disabled = true; b.classList.add("gq-no");
        els.say.textContent = opts.retryText || "괜찮아요. 천천히 다시 골라 봐요.";
        if (typeof opts.onWrong === "function") { try { opts.onWrong({ problem: problem, value: values[i] }); } catch (_) {} }
        return;
      }
      s.done = true; disarm();
      b.classList.add("gq-ok");
      buttons.forEach(function (x) { x.disabled = true; });
      // 처음 맞힘 = 그 자리(손가락 처리 안)에서 아이 외침. iOS 가 소리를 허락하는 유일한 순간이라 미루지 않는다.
      // @family:begin~end 사이는 공개판 빌드가 지운다(공개판은 녹음 외침이 없다).
      /* @family:begin */if (s.firstTry && opts.voice !== false && api.voiceEnabled !== false) {
        var KV = root.KidVoices;
        if (KV && typeof KV.shout === "function") { try { KV.shout(kidId, { force: true, reason: "quiz", ctx: opts.voiceCtx, out: opts.voiceOut }); } catch (_) {} }
      }/* @family:end */
      var growth = q.record(problem, s.firstTry, { ms: s.firstMs });
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
    return { kind: session.kind, kid: session.kid || null, text: session.problem ? session.problem.text : null, answer: session.problem ? session.problem.answer : null, level: session.problem ? session.problem.level : null, slot: session.problem ? session.problem.slot || null : null, armIn: guard ? Math.round(guard.armAt - performance.now()) : 0 };
  }
  function panelElement() { return panel; }

  /* configure(opts) — 판(에디션)마다 다른 설정. 부르지 않으면 기본(가족판) 그대로.
     opts.profiles: 아이 목록 [{ id, name, age, start?, cap? }] (기록·지금 하는 아이는 id 로 따로 쌓인다)
     opts.voice: false 면 정답 외침 끔(= voiceEnabled false). opts.playPass: false 면 놀이 시간 돌려주기 안 함. */
  function configure(opts) {
    opts = opts || {};
    var list = freezeKids(opts.profiles);
    if (list) { KIDS = list; api.KIDS = KIDS; quizCache = {}; }
    if (opts.voice === false) api.voiceEnabled = false;
    if (opts.playPass === false) { lendOn = false; closeLend(); }
    return api;
  }

  var api = {
    KIDS: KIDS, CURRENT_KEY: CURRENT_KEY, HUB_KEY: HUB_KEY, LOCK_MS: LOCK_MS,
    stateKey: stateKey, kidById: kidById, bandForAge: bandForAge, rangeFor: rangeFor, fallbackProblem: fallbackProblem,
    TUNE: TUNE, ADAPT_V: ADAPT_V, buildChoices: buildChoices, cleanState: cleanState,
    PASS_KEY: PASS_KEY, PASS_LEND_MS: PASS_LEND_MS, lendPlayTime: lendPlayTime, settlePlayTime: settlePlayTime,
    forKid: forKid, currentKid: currentKid, setKid: setKid, levels: levels, setLevel: setLevel,
    ask: ask, pickKid: pickKid, isOpen: isOpen, close: close, peek: peek, panel: panelElement, configure: configure,
    voiceEnabled: true
  };
  if (typeof module !== "undefined" && module.exports) module.exports = api;
  else root.GameQuiz = api;
})(typeof window !== "undefined" ? window : globalThis);
