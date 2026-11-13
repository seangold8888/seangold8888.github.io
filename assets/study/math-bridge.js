(function (root) {
  "use strict";

  var C = root.Curriculum || (typeof require !== "undefined" ? require("../../math/curriculum.js") : null);
  var L = root.MathLearning || (typeof require !== "undefined" ? require("../../math/learning.js") : null);
  var S = root.MathStore || (typeof require !== "undefined" ? require("../../math/store.js") : null);
  var AGE_KEY = "hub2_study_age";
  var TOP = C && C.LEVELS && C.LEVELS.length ? C.LEVELS[C.LEVELS.length - 1].id : 19;   // 커리큘럼 최고 단계
  var AGE_BANDS = Object.freeze({
    5: Object.freeze({ start: 1, cap: 2, label: "5세 · 9까지 수 익히기" }),
    6: Object.freeze({ start: 1, cap: 4, label: "6세 · 10 만들기까지" }),
    7: Object.freeze({ start: 3, cap: 10, label: "7세 · 1학년 과정" }),
    // 8·9세 상한 = 커리큘럼 끝(19): 12단계를 마치면 13단계(곱셈구구)로 이어진다
    8: Object.freeze({ start: 5, cap: TOP, label: "8세 · 2학년 과정" }),
    9: Object.freeze({ start: 5, cap: TOP, label: "9세 · 복습과 도전" }),
    10: Object.freeze({ start: 13, cap: TOP, label: "10세 이상 · 3학년 과정" })
  });

  function age(value) {
    var n = parseInt(value, 10);
    if (n >= 10) return 10;
    return AGE_BANDS[n] ? n : 7;
  }

  function band(value) { return AGE_BANDS[age(value)]; }

  function load(storage) {
    var state = S.load(storage);
    var selected = state.level > 10 ? 8 : 7;
    try {
      var saved = storage.getItem(AGE_KEY);
      if (saved !== null) selected = age(saved);
    } catch (_) {}
    return { age: selected, state: state };
  }

  function setAge(storage, state, value) {
    var selected = age(value), limits = band(selected);
    state.level = Math.min(limits.cap, Math.max(limits.start, state.level));
    try { storage.setItem(AGE_KEY, String(selected)); } catch (_) {}
    S.save(storage, state);
    return selected;
  }

  function next(state, selectedAge, rng, lastKey, now) {
    rng = rng || Math.random;
    var limits = band(selectedAge);
    var activeLevel = Math.min(limits.cap, Math.max(1, state.level));
    var due = S.dueReviews(state, now).filter(function (entry) {
      return entry.problem.level <= limits.cap && entry.key !== lastKey;
    });
    if (due.length) {
      var original = due[0];
      var review = L.variant(original.problem, rng, []) || original.problem;
      return Object.assign({}, review, { review: true, reviewKey: original.key });
    }
    // 아직 덜 풀어 본 유형부터 낸다. 무작위로만 내면 유형이 많은 단계(5단계 17개)는
    // 몇몇 유형이 한참 안 나와서, 다 아는데도 단계가 오르지 않는다.
    var rows = L.summary(state, activeLevel), fewest = Math.min.apply(null, rows.map(function (row) { return row.count; }));
    var pool = rows.filter(function (row) { return row.count === fewest; });
    return C.makeProblem(activeLevel, rng, pool[Math.floor(rng() * pool.length) % pool.length].type);
  }

  function shuffleInPlace(list, rng) {
    for (var i = list.length - 1; i > 0; i--) {
      var j = Math.floor(rng() * (i + 1)), tmp = list[i];
      list[i] = list[j]; list[j] = tmp;
    }
    return list;
  }
  // 오답 후보가 그럴듯한지: 0 이상 정수, 정답과 다르고, 자릿수가 한 자리 넘게 차이 나지 않는다
  function plausible(value, answer) {
    return Number.isInteger(value) && value >= 0 && value !== answer && Math.abs(String(value).length - String(answer).length) <= 1;
  }

  // 3지선다. 문제에 distractors(유형별 전형적 오답 후보)가 있으면 먼저 쓰고, 모자라면 ±오프셋으로 채운다.
  // distractors 가 없는 1~12단계 문제(정답 100 이하)는 예전과 똑같이 동작한다(같은 난수 소비, 0..100 범위).
  function choices(problem, rng) {
    rng = rng || Math.random;
    var answer = Number(problem.answer), out = [answer];
    if (Array.isArray(problem.distractors) && problem.distractors.length) {
      var extra = shuffleInPlace(problem.distractors.map(Number), rng);
      for (var d = 0; d < extra.length && out.length < 3; d++) {
        if (plausible(extra[d], answer) && out.indexOf(extra[d]) < 0) out.push(extra[d]);
      }
    }
    var big = answer > 100;
    var offsets = big ? [-10, 10, -100, 100, -1, 1] : answer >= 20 ? [-10, 10, -1, 1, -2, 2] : [-1, 1, -2, 2, -3, 3];
    var hi = big ? Math.pow(10, String(answer).length) - 1 : 100;
    if (out.length < 3) shuffleInPlace(offsets, rng);
    for (var k = 0; k < offsets.length && out.length < 3; k++) {
      var value = answer + offsets[k];
      if (value >= 0 && value <= hi && out.indexOf(value) < 0) out.push(value);
    }
    while (out.length < 3) {
      var fallback = Math.max(0, answer + out.length);
      if (out.indexOf(fallback) < 0) out.push(fallback);
      else out.push(Math.max(0, answer - out.length));
    }
    return out.sort(function (a, b) { return a - b; });
  }

  function dashboardProblem(problem, rng) {
    return {
      formula: problem.text,
      items: "",
      question: problem.review ? "수학놀이터 복습 문제예요" : "재이의 수학놀이터 문제예요",
      answer: problem.answer,
      unit: "",
      choices: choices(problem, rng),
      seed: { type: "playground", key: problem.key, level: problem.level },
      mathProblem: problem,
      review: !!problem.review,
      book: problem.text
    };
  }

  function record(storage, state, problem, firstTry, selectedAge, now) {
    var before = state.level;
    S.recordAnswer(state, problem, firstTry, now);
    state.garden = (state.garden || 0) + 1;
    state.cardStudyDays = state.cardStudyDays || {};
    var studyDate = S.today(now);
    state.cardStudyDays[studyDate] = (state.cardStudyDays[studyDate] || 0) + 1;
    var limits = band(selectedAge);
    if (firstTry && state.level < limits.cap && L.ready(state, state.level)) state.level++;
    S.save(storage, state);
    return { promoted: state.level > before, level: state.level };
  }

  function status(state, selectedAge) {
    var level = C.levelById(state.level), rows = L.summary(state, state.level);
    return {
      age: age(selectedAge),
      ageLabel: band(selectedAge).label,
      level: state.level,
      levelName: level.name,
      mastered: rows.filter(function (row) { return row.mastered; }).length,
      total: rows.length
    };
  }

  var api = { AGE_KEY: AGE_KEY, AGE_BANDS: AGE_BANDS, age: age, band: band, load: load, setAge: setAge, next: next, choices: choices, dashboardProblem: dashboardProblem, record: record, status: status };
  if (typeof module !== "undefined" && module.exports) module.exports = api;
  else root.HubMath = api;
})(typeof window !== "undefined" ? window : globalThis);
