"use strict";
const test = require("node:test"), assert = require("node:assert/strict");
const fs = require("node:fs"), path = require("node:path");
const P = require("../placement.js"), S = require("../store.js");

function rngFrom(seed) { let s = seed; return function () { s = (s * 16807) % 2147483647; return (s - 1) / 2147483646; }; }
// 아이 모델: trueLevel 이하는 정확도 p, 그 위는 (1-p)
function simulate(trueLevel, grade, month, seed, p = 0.95) {
  const rng = rngFrom(seed), pl = P.create({ grade, month, rng });
  let guard = 0;
  while (!pl.finished && guard++ < 40) {
    const q = pl.next();
    const knows = q.level <= trueLevel ? rng() < p : rng() < (1 - p);
    pl.answer(knows ? q.answer : q.answer + 1, 2500);
  }
  return pl;
}

test("start level follows grade and semester", () => {
  assert.equal(P.startLevel(1, 4), 2); assert.equal(P.startLevel(1, 9), 5); assert.equal(P.startLevel(1, 1), 5);
  assert.equal(P.startLevel(2, 9), 7); assert.equal(P.startLevel(3, 9), 10); assert.equal(P.startLevel(6, 9), 12); assert.equal(P.startLevel("x", 9), 5);
});

test("the staircase finds the child's level within 16 questions for a range of abilities", () => {
  for (const trueLevel of [1, 2, 3, 5, 7, 9, 12]) {
    let hits = 0;
    for (let seed = 1; seed <= 12; seed++) {
      const pl = simulate(trueLevel, 1, 9, seed * 7 + trueLevel);
      const r = pl.result();
      assert.ok(r.asked >= P.MIN_Q && r.asked <= P.MAX_Q, "asked " + r.asked);
      if (Math.abs(r.level - trueLevel) <= 1) hits++;
    }
    assert.ok(hits >= 9, "level " + trueLevel + " found within ±1 in " + hits + "/12 runs");
  }
});

test("a child who misses everything lands on level 1, one who aces everything reaches 11", () => {
  const low = simulate(0, 2, 9, 3).result(); assert.equal(low.level, 1);
  const high = simulate(12, 1, 9, 5, 1.0).result(); assert.equal(high.level, 12);
  assert.ok(high.medianMs === 2500);
});

test("no question repeats within a run and every question stays within 1..12", () => {
  const rng = rngFrom(9), pl = P.create({ grade: 1, month: 9, rng }), keys = new Set();
  while (!pl.finished) { const q = pl.next(); assert.ok(!keys.has(q.key)); keys.add(q.key); assert.ok(q.level >= 1 && q.level <= 12); pl.answer(q.answer, 1000); }
  assert.equal(pl.next(), null);
});

test("store keeps school, grade, placed flag and a compact placement summary", () => {
  const st = S.clean({ school: "신중초등학교", grade: "1", placed: true, placement: { date: "2026-09-08", level: 3, asked: 12, correct: 8, medianMs: 3100, log: [1, 2, 3] } });
  assert.equal(st.school, "신중초등학교"); assert.equal(st.grade, 1); assert.equal(st.placed, true);
  assert.deepEqual(st.placement, { date: "2026-09-08", level: 3, asked: 12, correct: 8, medianMs: 3100 });
  assert.equal(S.clean({ grade: 9 }).grade, 6); assert.equal(S.defaults().placed, false);
  const html = fs.readFileSync(path.join(__dirname, "../index.html"), "utf8");
  for (const id of ["setup", "setupName", "setupSchool", "setupGrade", "setupBtn", "placed", "placedGo"]) assert.match(html, new RegExp('id="' + id + '"'));
  assert.ok(html.indexOf("characters.js") < html.indexOf("placement.js") && html.indexOf("placement.js") < html.indexOf("app.js"));
  const app = fs.readFileSync(path.join(__dirname, "../app.js"), "utf8");
  assert.match(app, /if \(!state\.placed\) showSetup\(\)/);
  assert.match(app, /state\.planFrom = res\.level; state\.planStart = S\.today\(\)/, "plan restarts at the placed level");
  const parent = fs.readFileSync(path.join(__dirname, "../parent.html"), "utf8");
  assert.match(parent, /id="school"/); assert.match(parent, /id="grade"/); assert.match(parent, /id="replaceBtn"/);
});
