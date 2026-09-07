/* 매일 수학 10분 — 날짜별 진도표 (순수 모듈)
   시작일~목표일 사이의 공부 요일에 11단계를 난이도 비중대로 배분한다.
   한 날 = 한 회차 = 단계 하나. 계획은 기대 위치이고, 실제 출제 단계는 숙달(store)로 정한다. */
(function (root) {
  "use strict";
  // 단계별 비중 (학교 2학기 핵심인 6~9단계에 시간을 더 준다)
  const WEIGHTS = { 1: 3, 2: 5, 3: 8, 4: 9, 5: 7, 6: 10, 7: 10, 8: 12, 9: 12, 10: 6, 11: 5 };
  const DEFAULT_END = "2027-01-29"; // 1학년 2학기 마무리(종업식 전 금요일) 기준, 부모 설정에서 변경

  function parse(s) { return new Date(s + "T00:00:00"); }
  function fmt(d) { return d.getFullYear() + "-" + String(d.getMonth() + 1).padStart(2, "0") + "-" + String(d.getDate()).padStart(2, "0"); }
  function isStudyDay(d, daysPerWeek) {
    const w = d.getDay(); // 0 일 … 6 토
    if (daysPerWeek >= 7) return true;
    if (daysPerWeek === 6) return w !== 0;
    return w !== 0 && w !== 6;
  }

  // plan = [{ i, date, level }]
  function buildPlan(opts) {
    const start = parse(opts.start), end = parse(opts.end || DEFAULT_END), dpw = opts.daysPerWeek || 6;
    const fromLevel = Math.max(1, opts.fromLevel || 1);
    const dates = [];
    for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) if (isStudyDay(d, dpw)) dates.push(fmt(d));
    const levels = []; for (let l = fromLevel; l <= 11; l++) levels.push(l);
    const total = levels.reduce(function (s, l) { return s + WEIGHTS[l]; }, 0);
    const n = dates.length;
    // 각 단계에 최소 1일, 나머지는 비중대로
    const alloc = {}; let used = 0;
    levels.forEach(function (l) { alloc[l] = Math.max(1, Math.floor(n * WEIGHTS[l] / total)); used += alloc[l]; });
    // 남는 날은 비중 큰 순서로, 부족하면 비중 작은 순서로 조정
    const byWeight = levels.slice().sort(function (a, b) { return WEIGHTS[b] - WEIGHTS[a]; });
    let k = 0, guard = 0;
    while (used < n && guard++ < 1000) { alloc[byWeight[k % byWeight.length]]++; used++; k++; }
    k = 0; guard = 0;
    while (used > n && guard++ < 1000) { const l = byWeight[byWeight.length - 1 - (k % byWeight.length)]; if (alloc[l] > 1) { alloc[l]--; used--; } k++; }
    const plan = []; let i = 0;
    levels.forEach(function (l) { for (let c = 0; c < alloc[l] && i < n; c++, i++) plan.push({ i: i + 1, date: dates[i], level: l }); });
    return plan;
  }

  // 오늘 기준 상태. doneDates = 공부한 날짜 목록(도장). level = 현재 숙달 단계.
  function status(plan, doneDates, level, today) {
    if (!plan.length) return null;
    const passed = plan.filter(function (p) { return p.date <= today; });
    const todayEntry = plan.find(function (p) { return p.date === today; }) || passed[passed.length - 1] || plan[0];
    const next = plan.find(function (p) { return p.date > today; }) || null;
    const doneSet = {}; (doneDates || []).forEach(function (d) { doneSet[d] = true; });
    const done = Object.keys(doneSet).filter(function (d) { return d >= plan[0].date; }).length;
    const expected = passed.length;
    const plannedLevel = todayEntry.level;
    const levelGap = level - plannedLevel; // 음수 = 계획보다 뒤
    const dayGap = done - expected; // 음수 = 빠진 날
    const levelStart = plan.find(function (p) { return p.level === plannedLevel; });
    const levelEnd = plan.slice().reverse().find(function (p) { return p.level === plannedLevel; });
    return {
      today: today, plannedLevel: plannedLevel, plannedIndex: todayEntry.i, total: plan.length,
      expected: expected, done: done, dayGap: dayGap, levelGap: levelGap,
      levelDayIndex: levelStart ? todayEntry.i - levelStart.i + 1 : 1, levelDays: levelStart && levelEnd ? levelEnd.i - levelStart.i + 1 : 1,
      nextDate: next ? next.date : null, endDate: plan[plan.length - 1].date, startDate: plan[0].date,
      finished: today > plan[plan.length - 1].date,
      label: levelGap < -1 ? "계획보다 " + (-levelGap) + "단계 뒤" : levelGap === -1 ? "계획보다 1단계 뒤" : levelGap === 0 ? "계획대로" : "계획보다 " + levelGap + "단계 앞"
    };
  }

  // 계획별 단계 시작일 목록 (지도 화면용)
  function milestones(plan) {
    const out = [];
    plan.forEach(function (p) { if (!out.length || out[out.length - 1].level !== p.level) out.push({ level: p.level, date: p.date, days: 1 }); else out[out.length - 1].days++; });
    return out;
  }

  const api = { WEIGHTS: WEIGHTS, DEFAULT_END: DEFAULT_END, buildPlan: buildPlan, status: status, milestones: milestones, isStudyDay: isStudyDay };
  if (typeof module !== "undefined" && module.exports) module.exports = api;
  else root.MathSchedule = api;
})(typeof window !== "undefined" ? window : globalThis);
