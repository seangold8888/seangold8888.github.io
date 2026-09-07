/* 매일 수학 10분 — 처음 실력 확인(진단) 순수 모듈
   학년에 맞는 단계에서 시작해, 맞히면 올라가고 틀리면 내려가는 계단식으로 최대 16문제.
   결과 = 두 번 이상 맞히고 두 번 이상 틀리지 않은 가장 높은 단계. */
(function (root) {
  "use strict";
  const C = root.Curriculum || (typeof require !== "undefined" ? require("./curriculum.js") : null);
  const MAX_Q = 16, MIN_Q = 8, TOP = 12;
  const START_BY_GRADE = { 1: 2, 2: 7, 3: 10, 4: 11, 5: 12, 6: 12 };
  // 9월 이후 1학년은 2학기 → 4단계(10 만들기)부터, 3~8월 1학년은 2단계부터
  function startLevel(grade, month) {
    const g = Math.min(6, Math.max(1, parseInt(grade, 10) || 1));
    let lv = START_BY_GRADE[g];
    if (g === 1 && month != null && (month >= 9 || month <= 2)) lv = 5;
    return lv;
  }
  function create(opts) {
    opts = opts || {};
    const rng = opts.rng || Math.random;
    const state = {
      level: startLevel(opts.grade, opts.month), asked: 0, record: {}, seen: {}, log: [], up: 0, down: 0,
      lowest: TOP, highest: 1, bounces: 0, lastDir: 0, current: null, finished: false
    };
    function rec(lv) { return state.record[lv] || (state.record[lv] = { ok: 0, no: 0 }); }
    function next() {
      if (state.finished) return null;
      let guard = 0, p;
      do { p = C.makeProblem(state.level, rng); } while (state.seen[p.key] && guard++ < 50);
      state.seen[p.key] = true; state.current = p; state.asked++;
      state.lowest = Math.min(state.lowest, state.level); state.highest = Math.max(state.highest, state.level);
      return p;
    }
    function answer(value, ms) {
      const p = state.current; if (!p) return null;
      const ok = parseInt(value, 10) === p.answer;
      const r = rec(p.level);
      if (ok) r.ok++; else r.no++;
      state.log.push({ level: p.level, text: p.text, answer: p.answer, given: value, ok: ok, ms: ms || 0 });
      let moved = 0;
      if (ok) { state.up++; state.down = 0; if (state.up >= 2) { if (state.level < TOP) { state.level++; moved = 1; } state.up = 0; } }
      else { state.down++; state.up = 0; if (state.down >= 2 || state.asked <= 2) { if (state.level > 1) { state.level--; moved = -1; } state.down = 0; } }
      if (moved && state.lastDir && moved !== state.lastDir) state.bounces++;
      if (moved) state.lastDir = moved;
      // 종료: 문제 수 상한, 또는 충분히 풀었고 오르내림이 두 번 이상이면 수준이 잡힌 것
      if (state.asked >= MAX_Q || (state.asked >= MIN_Q && state.bounces >= 2)) state.finished = true;
      state.current = null;
      return { ok: ok, moved: moved, finished: state.finished };
    }
    function result() {
      let best = 0;
      for (let lv = TOP; lv >= 1; lv--) { const r = state.record[lv]; if (r && r.ok >= 2 && r.no <= 1) { best = lv; break; } }
      if (!best) {
        // 두 번 맞힌 단계가 없으면: 한 번이라도 맞힌 가장 높은 단계, 그것도 없으면 가장 낮게 가 본 단계 아래
        for (let lv = TOP; lv >= 1; lv--) { const r = state.record[lv]; if (r && r.ok >= 1 && r.no === 0) { best = lv; break; } }
        if (!best) best = Math.max(1, state.lowest - 1);
      }
      const times = state.log.filter(function (l) { return l.ok && l.ms > 0; }).map(function (l) { return l.ms; }).sort(function (a, b) { return a - b; });
      const median = times.length ? times[Math.floor(times.length / 2)] : 0;
      return { level: best, asked: state.asked, correct: state.log.filter(function (l) { return l.ok; }).length, medianMs: median, highest: state.highest, lowest: state.lowest, log: state.log };
    }
    return { next: next, answer: answer, result: result, state: state, get finished() { return state.finished; }, get level() { return state.level; }, get asked() { return state.asked; }, MAX_Q: MAX_Q };
  }
  const api = { create: create, startLevel: startLevel, MAX_Q: MAX_Q, MIN_Q: MIN_Q };
  if (typeof module !== "undefined" && module.exports) module.exports = api;
  else root.MathPlacement = api;
})(typeof window !== "undefined" ? window : globalThis);
