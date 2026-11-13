"use strict";
// 13~19단계(2학년 2학기 ~ 4학년 1학기) 문제 은행 점검: node --test math/tests/grade34.test.js
const test = require("node:test"), assert = require("node:assert/strict");
const C = require("../curriculum.js"), L = require("../learning.js"), S = require("../store.js"), V = require("../visual.js"), P = require("../playground.js");
const B = require("../../assets/study/math-bridge.js");

function rngFrom(seed) { let s = seed; return function () { s = (s * 16807) % 2147483647; return (s - 1) / 2147483646; }; }
function memory(initial = {}) { const m = new Map(Object.entries(initial)); return { getItem: k => (m.has(k) ? m.get(k) : null), setItem: (k, v) => m.set(k, String(v)), map: m }; }
const NEW = C.LEVELS.filter(l => l.id >= 13);
const DEFAULT_HINT = L.hint({ type: "__none__" }), DEFAULT_EXPLAIN = /^십 막대와 낱개를 따로 세면/;

// ---- 조사 검사기: 숫자(한자어 읽기)·분수(분자를 끝에 읽음)·단위 낱말 뒤 조사가 받침 규칙에 맞는지 ----
function numFinal(n) { return n === 0 || C.batchim(n); }
const NEED = { 은: true, 이: true, 을: true, 과: true, 는: false, 가: false, 를: false, 와: false };
function josaErrors(text) {
  const errs = [];
  let m;
  const num = /(\d+)(?:\/(\d+))?(은|는|이|가|을|를|와|과)(?![가-힣])/g;
  while ((m = num.exec(text))) if (NEED[m[3]] !== numFinal(Number(m[1]))) errs.push(m[0]);
  const cop = /(\d+)(?:\/\d+)?(이에요|예요|이니까|니까)/g;
  while ((m = cop.exec(text))) if ((m[2][0] === "이") !== numFinal(Number(m[1]))) errs.push(m[0]);
  const unit = /(개|장|자루|권|명|묶음|번|쪽|상자|조각|사탕|구슬|연필|색종이|딸기|공책)(은|는|이|가|을|를|와|과)(?![가-힣])/g;
  while ((m = unit.exec(text))) if (NEED[m[2]] !== C.hasFinal(m[1])) errs.push(m[0]);
  return errs;
}

test("조사 검사기 자체 확인", () => {
  assert.deepEqual(josaErrors("팔십구를 수로 쓰면 □"), []);
  assert.deepEqual(josaErrors("52이 들어가요. 6을 9를 1/3은 2/3는 7묶음은"), ["52이"]);
  assert.deepEqual(josaErrors("2/3은 □"), ["2/3은"]);
  assert.deepEqual(josaErrors("사탕 42개을"), ["개을"]);
  assert.deepEqual(josaErrors("0예요"), ["0예요"]);
});

function parseInts(text) { return (text.match(/\d+/g) || []).map(Number); }
// 문구에서 정답을 다시 계산한다(생성기와 독립적으로)
function recompute(p) {
  const n = parseInts(p.text), t = p.text;
  switch (p.type) {
    case "mulFact": case "mul21": case "mulTens": return n[0] * n[1];
    case "mulGroups": case "mulTimes": case "mul21Story": return n[0] * n[1];
    case "mulMissing": return n[1] / n[0];
    case "divFact": case "divShare": return n[0] / n[1];
    case "divGroups": return n[0] / n[1];
    case "add3": return n[0] + n[1];
    case "sub3": return n[0] - n[1];
    case "story3": return /모두/.test(t) ? n[0] + n[1] : n[0] - n[1];
    case "divQuot": return Math.floor(n[0] / n[1]);
    case "divRem": return n[0] % n[1];
    case "placeDigit": case "bigDigit": {
      if (/개$/.test(t)) return n[0] / n[1];
      const place = { 만: 4, 천: 3, 백: 2, 십: 1, 일: 0 }[t.match(/(만|천|백|십|일)의 자리/)[1]];
      return Math.floor(n[0] / Math.pow(10, place)) % 10;
    }
    case "fracOf": return n[0] / n[2] * n[1];
    case "fracCount":
      if (/단위분수/.test(t)) return n[0];
      if (/조각/.test(t)) return n[0];
      if (/개이면/.test(t)) return n[2];
      return n[0];
    default: throw new Error("unknown " + p.type);
  }
}

test("13~19단계: 단계마다 유형 3개, 학기 표기, 승급에 9문제(유형당 3) — 1~12단계 정의는 그대로", () => {
  assert.equal(C.LEVELS.length, 19);
  assert.deepEqual(C.LEVELS.slice(0, 12).map(l => l.types.length), [2, 2, 3, 3, 17, 3, 1, 2, 1, 1, 1, 1]);
  for (const lv of NEW) {
    assert.ok(lv.types.length >= 2 && lv.types.length <= 4, lv.name);
    assert.equal(L.fastNeed(lv.id) * lv.types.length, 9, lv.id + " 승급 최소 정답 수");
    for (const t of lv.types) { assert.ok(L.LABELS[t], "label " + t); assert.notEqual(L.hint({ type: t, visual: {} }), DEFAULT_HINT, "hint " + t); }
  }
  assert.equal(C.MAX_LEVEL, 19); assert.equal(S.MAX_LEVEL, 19);
});

test("13~19단계 각 유형 500문제: 정수 답·범위·검산·조사·설명·그림·key 다양성", () => {
  const rng = rngFrom(2026);
  for (const lv of NEW) {
    const levelKeys = new Set();
    for (const type of lv.types) {
      const keys = new Set();
      for (let i = 0; i < 500; i++) {
        const p = C.makeProblem(lv.id, rng, type), ctx = lv.id + " " + type + " " + p.text;
        assert.ok(Number.isInteger(p.answer) && p.answer >= 0 && p.answer <= lv.max, ctx + " = " + p.answer);
        assert.equal((p.text.match(/□/g) || []).length, 1, ctx);
        assert.equal(recompute(p), p.answer, ctx);
        assert.doesNotMatch(p.text, /별빛/);
        assert.deepEqual(josaErrors(p.text), [], ctx);
        const ex = C.explain(p);
        assert.doesNotMatch(ex, DEFAULT_EXPLAIN, ctx); assert.ok(ex.includes(String(p.answer)), ctx + " / " + ex);
        assert.deepEqual(josaErrors(ex), [], ex);
        assert.doesNotMatch(ex + L.hint(p), /틀렸|바보|느려|별빛/);
        for (const reveal of [false, true]) { const svg = V.render(p, reveal); assert.match(svg, /^<svg/, ctx); assert.doesNotMatch(svg, /<text|filter|shadow/, ctx); }
        assert.ok(Array.isArray(p.distractors) && p.distractors.length >= 2, ctx);
        assert.equal(p.key, lv.id + ":" + p.text);
        keys.add(p.key); levelKeys.add(p.key);
      }
      assert.ok(keys.size >= 12, lv.id + " " + type + " 서로 다른 문제 " + keys.size);
    }
    assert.ok(levelKeys.size >= 40, lv.id + " 단계 전체 " + levelKeys.size);
  }
});

test("곱셈구구 단계는 정한 단만, 세 자리는 대부분 받아올림·받아내림, 나눗셈은 나누어떨어짐", () => {
  const rng = rngFrom(31);
  let carry = 0, borrow = 0;
  for (let i = 0; i < 500; i++) {
    assert.ok([2, 3, 4, 5].includes(parseInts(C.makeProblem(13, rng, "mulFact").text)[0]));
    assert.ok([6, 7, 8, 9].includes(parseInts(C.makeProblem(14, rng, "mulFact").text)[0]));
    const a = parseInts(C.makeProblem(15, rng, "add3").text); if (a[0] % 10 + a[1] % 10 >= 10 || Math.floor(a[0] / 10) % 10 + Math.floor(a[1] / 10) % 10 >= 9) carry++;
    assert.ok(a[0] >= 100 && a[1] >= 100 && a[0] + a[1] <= 999);
    const s = parseInts(C.makeProblem(15, rng, "sub3").text); if (s[0] % 10 < s[1] % 10 || Math.floor(s[0] / 10) % 10 < Math.floor(s[1] / 10) % 10) borrow++;
    assert.ok(s[0] > s[1] && s[1] >= 100);
    const d = parseInts(C.makeProblem(16, rng, "divFact").text); assert.equal(d[0] % d[1], 0);
    const r = C.makeProblem(18, rng, "divRem"), rn = parseInts(r.text); assert.ok(r.answer >= 1 && r.answer < rn[1]);
  }
  assert.ok(carry > 380 && borrow > 380, carry + " / " + borrow);
});

test("보기 3개: 서로 다르고 정답 포함, 음수 없음, 정답과 자릿수 차이 1 이하, 100 넘는 답도 연속 세 수로 퇴화하지 않음", () => {
  const rng = rngFrom(77);
  for (const lv of NEW) for (const type of lv.types) for (let i = 0; i < 500; i++) {
    const p = C.makeProblem(lv.id, rng, type), c = B.choices(p, rng), ctx = p.text + " → " + c.join(",");
    assert.equal(c.length, 3, ctx); assert.equal(new Set(c).size, 3, ctx); assert.ok(c.includes(p.answer), ctx);
    assert.ok(c.every(v => Number.isInteger(v) && v >= 0), ctx);
    assert.ok(c.every(v => Math.abs(String(v).length - String(p.answer).length) <= 1), ctx);
    if (p.answer > 100) assert.ok(Math.max(...c) - Math.min(...c) > 2, ctx);
    if (type === "placeDigit" || type === "bigDigit") { if (!/개$/.test(p.text)) assert.ok(c.every(v => String(parseInts(p.text)[0]).includes(String(v))), "자리 숫자 보기는 그 수의 숫자: " + ctx); }
  }
  // distractors 없이 정답만 줘도(예비 문제·옛 복습 기록) 큰 수에서 0..100 에 갇히지 않는다
  const big = B.choices({ answer: 632 }, rngFrom(3));
  assert.equal(new Set(big).size, 3); assert.ok(big.includes(632)); assert.ok(big.every(v => v >= 500 && v <= 999), big.join(","));
});

// v254 까지의 보기 생성(1~12단계 문제의 기준)
function oldChoices(problem, rng) {
  const answer = Number(problem.answer), out = [answer];
  const offsets = answer >= 20 ? [-10, 10, -1, 1, -2, 2] : [-1, 1, -2, 2, -3, 3];
  for (let i = offsets.length - 1; i > 0; i--) { const j = Math.floor(rng() * (i + 1)), tmp = offsets[i]; offsets[i] = offsets[j]; offsets[j] = tmp; }
  for (let k = 0; k < offsets.length && out.length < 3; k++) { const value = answer + offsets[k]; if (value >= 0 && value <= 100 && out.indexOf(value) < 0) out.push(value); }
  while (out.length < 3) { const fallback = Math.max(0, answer + out.length); if (out.indexOf(fallback) < 0) out.push(fallback); else out.push(Math.max(0, answer - out.length)); }
  return out.sort((a, b) => a - b);
}
test("1~12단계 문제의 보기는 예전과 똑같다(같은 난수 → 같은 보기)", () => {
  const gen = rngFrom(5);
  for (let level = 1; level <= 12; level++) for (const type of C.levelById(level).types) for (let i = 0; i < 60; i++) {
    const p = C.makeProblem(level, gen, type), seed = 1000 + level * 100 + i;
    assert.equal(p.distractors, undefined, "1~12단계 문제는 오답 후보를 싣지 않는다");
    assert.deepEqual(B.choices(p, rngFrom(seed)), oldChoices(p, rngFrom(seed)), p.text);
  }
});

test("1~12단계 문구: 결함 2건(boxes·한글 수 읽기)만 바뀌고 조사가 맞다", () => {
  const rng = rngFrom(19);
  for (let level = 1; level <= 12; level++) for (const type of C.levelById(level).types) for (let i = 0; i < 80; i++) {
    const p = C.makeProblem(level, rng, type);
    assert.deepEqual(josaErrors(p.text), [], p.text); assert.deepEqual(josaErrors(C.explain(p)), [], C.explain(p));
  }
  const names = new Set(); for (let i = 0; i < 400; i++) { const p = C.makeProblem(5, rng, "readSino"); names.add(p.text); }
  assert.ok([...names].some(t => /구를 수로/.test(t)) && [...names].some(t => /삼을 수로/.test(t)));
  assert.match(C.makeProblem(5, rng, "boxes").text, /^구슬 \d+개를 한 상자에 10개씩 담으면 가득 찬 상자는 □개$/);
  assert.match(C.explain({ type: "seq", answer: 52, visual: {} }), /52가 들어가요/);
  assert.match(C.explain({ type: "readKor", answer: 51, visual: {} }), /^쉰하나는 오십일/);
  // 그 밖의 1단계 문구는 그대로(키 보존)
  assert.equal(C.makeProblem(1, () => 0.5, "join").text, "3과 2를 모으면 □");
  assert.equal(C.makeProblem(12, () => 0.5, "borrow2").text, "64 − 37 = □");
});

test("승급 시뮬레이션: 허브(문제 하나씩)로 13→19, 단계마다 9문제, 19에서 멈춘다", () => {
  const storage = memory(), state = S.defaults(); state.level = 13;
  const rng = rngFrom(13), per = {};
  let guard = 0;
  while (guard++ < 400) {
    const p = B.next(state, 10, rng, "", "2026-11-13T10:00:00");
    assert.ok(p.level >= 13 && p.level <= 19);
    per[p.level] = (per[p.level] || 0) + 1;
    B.record(storage, state, p, true, 10, "2026-11-13T10:00:00");
  }
  assert.equal(state.level, 19);
  // 최소 9문제(유형 3개 × 3). 같은 문제가 겹쳐 나오면 그만큼 더 푼다
  for (let l = 13; l <= 18; l++) assert.ok(per[l] >= 9 && per[l] <= 13, "단계 " + l + ": " + per[l] + "문제");
  assert.equal(S.load(storage).level, 19, "저장했다 불러와도 19");
});

test("승급 시뮬레이션: /math/ 앱 세션(finishSession)도 13→19, 세션마다 한 단계씩, 19 위로 안 간다", () => {
  const state = S.defaults(); state.level = 13; state.placed = true;
  const rng = rngFrom(17); let day = 0;
  while (state.level < 19 && day < 40) {
    const date = "2026-11-" + String(13 + Math.floor(day / 3)).padStart(2, "0"), before = state.level;
    const session = L.buildSession({ level: state.level, count: 12, rng, review: S.dueReviews(state, date), state, focus: P.focus("bars", state.level) });
    assert.equal(session.length, 12);
    const results = session.map(p => { S.recordAnswer(state, p, true, date); return { key: p.key, level: p.level, review: !!p.review, firstTry: true, ms: 3000 }; });
    S.finishSession(state, results, date);
    assert.ok(state.level - before <= 1);
    day++;
  }
  assert.equal(state.level, 19);
  const more = L.buildSession({ level: 19, count: 12, rng, state });
  S.finishSession(state, more.map(p => { S.recordAnswer(state, p, true, "2026-12-01"); return { key: p.key, level: p.level, firstTry: true, ms: 3000 }; }), "2026-12-01");
  assert.equal(state.level, 19);
});

test("저장: 13 이상 단계·하던 문제(pending)가 보존되고, 옛 저장(1~12단계)은 값이 안 바뀐다", () => {
  const storage = memory();
  for (const level of [13, 16, 19]) {
    const st = S.load(storage); st.level = level;
    const problems = L.buildSession({ level, count: 8, rng: rngFrom(level), state: st });
    st.pending = { problems, index: 1, results: [{ key: problems[0].key, level, firstTry: true, ms: 2000 }], level, spot: "bars" };
    S.save(storage, st);
    const back = S.load(storage);
    assert.equal(back.level, level); assert.ok(back.pending, "pending 유지 " + level);
    assert.deepEqual(back.pending.problems.map(p => p.key), problems.map(p => p.key));
  }
  const old = { name: "재이", level: 12, streak: 3, skills: { "12:borrow2": [{ date: "2026-11-01", key: "12:52 − 17 = □", ok: true }] }, wrong: [{ key: "5:구슬 59개를 10개씩 담으면 □상자", level: 5, text: "구슬 59개를 10개씩 담으면 □상자", problem: { level: 5, type: "boxes", text: "구슬 59개를 10개씩 담으면 □상자", answer: 5, visual: { kind: "blocks", a: 59, b: 0, op: "+" }, key: "5:구슬 59개를 10개씩 담으면 □상자" }, stage: 1, due: "2026-11-14", miss: 1 }], planFrom: 5, history: [{ date: "2026-11-01", level: 12 }] };
  const mem = memory({ math10_state: JSON.stringify(old) }), back = S.load(mem);
  assert.equal(back.level, 12); assert.equal(back.planFrom, 5); assert.equal(back.streak, 3);
  assert.deepEqual(back.skills, old.skills); assert.deepEqual(back.wrong, old.wrong, "옛 복습 문제는 문구 그대로");
  for (let l = 1; l <= 12; l++) assert.equal(S.clean({ level: l }).level, l);
  assert.equal(S.clean({ level: 25 }).level, 19); assert.equal(S.clean({ level: 0 }).level, 1);
});

test("나이: 8세 재이는 12→13 승급, 10세 이상은 13에서 시작, 나이 바꿔도 13 이상 기록은 8·9세에서 안 깎인다", () => {
  const storage = memory(), state = S.defaults(); state.level = 12;
  const rng = rngFrom(23);
  for (let i = 0; i < 12 && state.level === 12; i++) B.record(storage, state, B.next(state, 8, rng, "", "2026-11-13T09:00:00"), true, 8, "2026-11-13T09:00:00");
  assert.equal(state.level, 13);
  assert.equal(B.next(state, 8, rng, "", "2026-11-13T09:00:00").level, 13);
  const young = S.defaults(); young.level = 7;
  assert.equal(B.setAge(storage, young, 10), 10); assert.equal(young.level, 13); assert.equal(storage.getItem(B.AGE_KEY), "10");
  assert.equal(B.setAge(storage, young, 8), 8); assert.equal(young.level, 13, "8세 상한도 19라 13은 유지");
  assert.equal(B.setAge(storage, young, 99), 10);
  assert.deepEqual([B.band(10).start, B.band(10).cap], [13, 19]);
  assert.equal(B.status(young, 10).levelName, "곱셈구구 (2·5·3·4단)");
});
