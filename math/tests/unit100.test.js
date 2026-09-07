"use strict";
// 1학년 2학기 1단원 「100까지의 수」 — 학교 단원평가 유형 재현 검증
const test = require("node:test"), assert = require("node:assert/strict");
const C = require("../curriculum.js"), V = require("../visual.js");
function rngFrom(seed) { let s = seed; return function () { s = (s * 16807) % 2147483647; return (s - 1) / 2147483646; }; }
const L5 = C.LEVELS.find(l => l.id === 5);

test("level 5 is the 100까지의 수 unit with the seventeen school question types", () => {
  assert.equal(L5.name, "100까지의 수"); assert.equal(L5.unit, "1학년 2학기"); assert.equal(L5.max, 100);
  assert.deepEqual(L5.types, ["tensCount", "tensOnes", "readKor", "readSino", "nextNum", "prevNum", "tenMore", "seq", "bigger", "smaller", "hundred", "boxes", "leftover", "biggest2", "smallest2", "evenPick", "oddPick"]);
  assert.equal(C.LEVELS.length, 12);
  assert.equal(C.levelById(6).name, "십몇과 세 수의 계산");
  assert.equal(C.levelById(12).name, "받아내림이 있는 두 자리 뺄셈");
});

test("Korean number reading matches the textbook for both native and sino forms", () => {
  assert.equal(C.korNative(70), "일흔"); assert.equal(C.korNative(86), "여든여섯"); assert.equal(C.korNative(94), "아흔넷"); assert.equal(C.korNative(67), "예순일곱");
  assert.equal(C.korSino(70), "칠십"); assert.equal(C.korSino(86), "팔십육"); assert.equal(C.korSino(52), "오십이");
});

test("every generator answers correctly and the answer stays inside 1..100", () => {
  const rng = rngFrom(23);
  for (const type of L5.types) {
    for (let i = 0; i < 400; i++) {
      const p = C.makeProblem(5, rng, type);
      assert.ok(Number.isInteger(p.answer) && p.answer >= 1 && p.answer <= 100, type + " " + p.text + " = " + p.answer);
      assert.match(p.text, /□/, type);
      assert.ok(C.explain(p).length > 8, "explain " + type);
      assert.match(V.render(p, false), /^<svg/);
      const nums = (p.text.match(/\d+/g) || []).map(Number);
      if (type === "tensCount") assert.equal(p.answer, nums[1] * 10);
      if (type === "tensOnes") assert.equal(p.answer, nums[1] * 10 + nums[2]);
      if (type === "readKor") assert.equal(p.text.split("을")[0], C.korNative(p.answer));
      if (type === "readSino") assert.equal(p.text.split("을")[0], C.korSino(p.answer));
      if (type === "nextNum") assert.equal(p.answer, nums[0] + 1);
      if (type === "prevNum") assert.equal(p.answer, nums[0] - 1);
      if (type === "tenMore") assert.equal(Math.abs(p.answer - nums[0]), 10);
      if (type === "bigger") assert.equal(p.answer, Math.max(nums[0], nums[1]));
      if (type === "smaller") assert.equal(p.answer, Math.min(nums[0], nums[1]));
      if (type === "hundred") assert.equal(p.answer, 100);
      if (type === "boxes") assert.equal(p.answer, Math.floor(nums[0] / 10));
      if (type === "leftover") assert.equal(p.answer, nums[0] % 10);
      if (type === "biggest2") { const c = nums.slice(0, 3).sort((a, b) => b - a); assert.equal(p.answer, c[0] * 10 + c[1]); }
      if (type === "smallest2") { const c = nums.slice(0, 3).sort((a, b) => a - b); assert.equal(p.answer, c[0] * 10 + c[1]); }
      if (type === "evenPick") { assert.equal(p.answer % 2, 0); assert.equal(nums.filter(n => n % 2 === 0).length, 1); assert.ok(nums.includes(p.answer)); }
      if (type === "oddPick") { assert.equal(p.answer % 2, 1); assert.equal(nums.filter(n => n % 2 === 1).length, 1); assert.ok(nums.includes(p.answer)); }
    }
  }
});

test("sequence questions run in order with exactly one blank", () => {
  const rng = rngFrom(41);
  for (let i = 0; i < 300; i++) {
    const p = C.makeProblem(5, rng, "seq");
    const parts = p.text.split(" ");
    assert.equal(parts.length, 4); assert.equal(parts.filter(x => x === "□").length, 1);
    const filled = parts.map(x => (x === "□" ? p.answer : Number(x)));
    for (let k = 1; k < 4; k++) assert.equal(filled[k], filled[k - 1] + 1, p.text);
    assert.ok(filled[3] <= 100);
  }
});

test("particles read naturally and cards never repeat a digit", () => {
  const rng = rngFrom(7);
  for (let i = 0; i < 300; i++) {
    for (const type of ["bigger", "smaller"]) {
      const t = C.makeProblem(5, rng, type).text;
      assert.doesNotMatch(t, /(?:[2459])과 |(?:[13678]|10)와 /, t);
    }
    for (const type of ["biggest2", "smallest2"]) {
      const nums = C.makeProblem(5, rng, type).text.match(/\d+/g).slice(0, 3).map(Number);
      assert.equal(new Set(nums).size, 3);
      assert.ok(nums.every(n => n >= 1 && n <= 9));
    }
  }
});

test("the schedule gives the new unit real time and the guides cover twelve levels", () => {
  const Sc = require("../schedule.js"), F = require("../characters.js");
  const plan = Sc.buildPlan({ start: "2026-09-08", end: "2027-01-29", daysPerWeek: 6 });
  const ms = Sc.milestones(plan), days = Object.fromEntries(ms.map(m => [m.level, m.days]));
  assert.ok(days[5] >= 12, "100까지의 수 gets a real block: " + days[5]);
  assert.equal(F.guideFor(5).name, "헬로키티"); assert.equal(F.guideFor(6).name, "폼폼푸린"); assert.equal(F.guideFor(12).name, "모아나");
  assert.match(F.storyFor(5), /100까지의 수/);
});
