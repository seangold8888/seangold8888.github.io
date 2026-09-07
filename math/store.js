/* 매일 수학 10분 — 기록 저장·복습 간격·단계 승급 (순수 모듈, storage 주입)
   저장 키 math10_state 하나. 로그인 없음, 이 기기에만. */
(function (root) {
  "use strict";
  const KEY = "math10_state";
  const REVIEW_GAPS = [1, 3, 7, 14]; // stage 0..3 → 다음 출제까지 일수, 4 = 졸업
  const PROMOTE_ACC = 0.9, PROMOTE_STREAK = 2, DEMOTE_ACC = 0.6;

  function today(now) { const d = now ? new Date(now) : new Date(); return d.getFullYear() + "-" + String(d.getMonth() + 1).padStart(2, "0") + "-" + String(d.getDate()).padStart(2, "0"); }
  function addDays(dateStr, days) { const d = new Date(dateStr + "T00:00:00"); d.setDate(d.getDate() + days); return today(d); }

  function defaults() {
    return { name: "", level: 1, streak: 0, perSession: 12, visualPolicy: "auto", sound: false,
      history: [], wrong: [], stamps: {}, createdAt: today(),
      planStart: today(), planEnd: "2027-01-29", planDays: 6, planFrom: 1,
      album: [], hearts: {}, chests: {}, buddy: null };
  }
  function clean(s) {
    const d = defaults();
    if (!s || typeof s !== "object") return d;
    const out = Object.assign(d, s);
    out.level = Math.min(11, Math.max(1, parseInt(out.level, 10) || 1));
    out.perSession = [8, 12, 16].indexOf(out.perSession) >= 0 ? out.perSession : 12;
    out.visualPolicy = ["auto", "always", "wrong"].indexOf(out.visualPolicy) >= 0 ? out.visualPolicy : "auto";
    out.history = Array.isArray(out.history) ? out.history.slice(-200) : [];
    out.wrong = Array.isArray(out.wrong) ? out.wrong.filter(function (w) { return w && w.key && w.problem; }).slice(-60) : [];
    out.stamps = out.stamps && typeof out.stamps === "object" ? out.stamps : {};
    out.name = String(out.name || "").slice(0, 12);
    const dateOk = function (v, fallback) { return /^\d{4}-\d{2}-\d{2}$/.test(String(v || "")) ? v : fallback; };
    out.planStart = dateOk(out.planStart, d.planStart);
    out.planEnd = dateOk(out.planEnd, d.planEnd);
    if (out.planEnd <= out.planStart) out.planEnd = addDays(out.planStart, 120);
    out.planDays = [5, 6, 7].indexOf(out.planDays) >= 0 ? out.planDays : 6;
    out.planFrom = Math.min(11, Math.max(1, parseInt(out.planFrom, 10) || 1));
    out.album = Array.isArray(out.album) ? out.album.filter(function (a) { return a && a.id && a.date; }).slice(-400) : [];
    out.hearts = out.hearts && typeof out.hearts === "object" ? out.hearts : {};
    out.chests = out.chests && typeof out.chests === "object" ? out.chests : {};
    out.buddy = out.buddy && out.buddy.id && out.buddy.date ? { id: String(out.buddy.id), date: out.buddy.date } : null;
    return out;
  }
  function load(storage) {
    try { return clean(JSON.parse(storage.getItem(KEY) || "null")); } catch (_) { return defaults(); }
  }
  function save(storage, state) {
    try { storage.setItem(KEY, JSON.stringify(clean(state))); } catch (_) {}
    return state;
  }

  // 오늘 나올 복습 목록 (due ≤ today), 오래된 것부터
  function dueReviews(state, now) {
    const t = today(now);
    return state.wrong.filter(function (w) { return w.due <= t; }).sort(function (a, b) { return a.due < b.due ? -1 : 1; });
  }

  // 한 문제 결과 반영. firstTry: 첫 답이 맞았나. ms: 첫 답까지 걸린 시간
  function recordAnswer(state, problem, firstTry, now) {
    const t = today(now);
    const idx = state.wrong.findIndex(function (w) { return w.key === problem.key; });
    if (firstTry) {
      if (idx >= 0) {
        const w = state.wrong[idx];
        w.stage = (w.stage || 0) + 1;
        if (w.stage >= REVIEW_GAPS.length) state.wrong.splice(idx, 1);
        else w.due = addDays(t, REVIEW_GAPS[w.stage]);
      }
    } else if (idx >= 0) {
      state.wrong[idx].stage = 0; state.wrong[idx].due = addDays(t, 1); state.wrong[idx].miss = (state.wrong[idx].miss || 1) + 1;
    } else {
      state.wrong.push({ key: problem.key, level: problem.level, text: problem.text, problem: stripProblem(problem), stage: 0, due: addDays(t, 1), miss: 1, added: t });
    }
    return state;
  }
  function stripProblem(p) { return { level: p.level, type: p.type, text: p.text, answer: p.answer, visual: p.visual, key: p.key }; }

  // 안정도: 첫 시도 정답 반응시간의 변동계수(표준편차/평균). 0.35 미만이면 '안정'
  function stability(times) {
    if (!times || times.length < 4) return null;
    const mean = times.reduce(function (s, x) { return s + x; }, 0) / times.length;
    const sd = Math.sqrt(times.reduce(function (s, x) { return s + (x - mean) * (x - mean); }, 0) / times.length);
    return mean ? sd / mean : null;
  }
  function median(list) {
    if (!list.length) return null;
    const s = list.slice().sort(function (a, b) { return a - b; });
    return s.length % 2 ? s[(s.length - 1) / 2] : (s[s.length / 2 - 1] + s[s.length / 2]) / 2;
  }

  // 세션 종료: results = [{key, level, review, firstTry, ms}]
  // opts.behind: 계획보다 뒤처졌으면 90% 한 번으로 승급. opts.cap: 계획 단계+1 을 넘지 않음.
  function finishSession(state, results, now, opts) {
    opts = opts || {};
    const t = today(now);
    const fresh = results.filter(function (r) { return !r.review; });
    const firstTry = fresh.filter(function (r) { return r.firstTry; }).length;
    const acc = fresh.length ? firstTry / fresh.length : 0;
    const times = fresh.filter(function (r) { return r.firstTry && r.ms > 0; }).map(function (r) { return r.ms; });
    const entry = { date: t, level: state.level, count: results.length, fresh: fresh.length, firstTry: firstTry, acc: Math.round(acc * 100), medianMs: Math.round(median(times) || 0), cv: stability(times), reviews: results.length - fresh.length, reviewOk: results.filter(function (r) { return r.review && r.firstTry; }).length };
    state.history.push(entry);
    state.stamps[t] = (state.stamps[t] || 0) + 1;
    let change = 0;
    if (fresh.length >= 6) {
      const need = opts.behind ? 1 : PROMOTE_STREAK, cap = opts.cap ? Math.min(11, opts.cap) : 11;
      if (acc >= PROMOTE_ACC) { state.streak += 1; if (state.streak >= need && state.level < cap) { state.level += 1; state.streak = 0; change = 1; } }
      else if (acc < DEMOTE_ACC) { state.streak = 0; if (state.level > 1) { state.level -= 1; change = -1; } }
      else state.streak = 0;
    }
    entry.change = change;
    return entry;
  }

  // 부모 화면용 단계별 요약
  function levelSummary(state) {
    const by = {};
    state.history.forEach(function (h) {
      const b = by[h.level] || (by[h.level] = { level: h.level, sessions: 0, fresh: 0, firstTry: 0, medians: [], cvs: [] });
      b.sessions++; b.fresh += h.fresh; b.firstTry += h.firstTry;
      if (h.medianMs) b.medians.push(h.medianMs);
      if (h.cv != null) b.cvs.push(h.cv);
    });
    return Object.keys(by).map(function (k) {
      const b = by[k];
      return { level: b.level, sessions: b.sessions, acc: b.fresh ? Math.round(100 * b.firstTry / b.fresh) : null, medianMs: median(b.medians), cv: b.cvs.length ? b.cvs.reduce(function (s, x) { return s + x; }, 0) / b.cvs.length : null };
    }).sort(function (a, b) { return a.level - b.level; });
  }

  // 연속일: 오늘부터 거꾸로 세되, 공부 요일이 아닌 날(주 5·6일 계획의 일요일 등)은 건너뛰고,
  // 7일마다 한 번은 빠져도 이어진다(보호권). 아이가 하루 빠졌다고 0이 되지 않게.
  function streakInfo(stamps, todayStr, planDays, isStudyDay) {
    let days = 0, misses = 0, cursor = todayStr, guard = 0, protectedUsed = 0;
    const startedToday = !!stamps[todayStr];
    if (!startedToday) cursor = addDays(todayStr, -1);
    while (guard++ < 400) {
      const d = new Date(cursor + "T00:00:00");
      const study = isStudyDay ? isStudyDay(d, planDays) : true;
      if (stamps[cursor]) { days++; }
      else if (study) {
        misses++;
        if (misses > Math.floor(days / 7) + 1) break;
        protectedUsed++;
      }
      cursor = addDays(cursor, -1);
      if (cursor < "2026-01-01") break;
    }
    return { days: days, protectedUsed: protectedUsed, doneToday: startedToday };
  }
  // 이번 주(월~일) 진행: 공부한 날 / 계획 요일 수. 보물상자 키 = 그 주 월요일
  function weekInfo(stamps, todayStr, planDays) {
    const d = new Date(todayStr + "T00:00:00"), dow = (d.getDay() + 6) % 7;
    const monday = addDays(todayStr, -dow);
    let done = 0;
    for (let i = 0; i < 7; i++) if (stamps[addDays(monday, i)]) done++;
    const need = Math.min(planDays || 6, 6);
    return { key: monday, done: done, need: need, ready: done >= need };
  }
  const api = { streakInfo: streakInfo, weekInfo: weekInfo, KEY: KEY, REVIEW_GAPS: REVIEW_GAPS, today: today, addDays: addDays, defaults: defaults, clean: clean, load: load, save: save, dueReviews: dueReviews, recordAnswer: recordAnswer, finishSession: finishSession, stability: stability, median: median, levelSummary: levelSummary };
  if (typeof module !== "undefined" && module.exports) module.exports = api;
  else root.MathStore = api;
})(typeof window !== "undefined" ? window : globalThis);
