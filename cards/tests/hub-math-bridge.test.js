"use strict";
const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const B = require("../../assets/study/math-bridge.js");
const C = require("../../math/curriculum.js");
const L = require("../../math/learning.js");
const S = require("../../math/store.js");
const root = path.join(__dirname, "..", "..");
function memory(initial = {}) {
  const map = new Map(Object.entries(initial));
  return {getItem:k=>map.has(k)?map.get(k):null,setItem:(k,v)=>map.set(k,String(v)),map};
}
function rng(seed) { return () => ((seed = seed * 16807 % 2147483647) - 1) / 2147483646; }

test("age selection clamps the shared playground level without erasing progress", () => {
  const storage = memory({math10_state: JSON.stringify({...S.defaults(), level: 9, garden: 27})});
  const profile = B.load(storage);
  assert.equal(profile.age, 7);
  assert.equal(profile.state.level, 9);
  assert.equal(B.setAge(storage, profile.state, 5), 5);
  assert.equal(profile.state.level, 2);
  assert.equal(profile.state.garden, 27);
  assert.equal(B.setAge(storage, profile.state, 8), 8);
  assert.equal(profile.state.level, 5);
  assert.equal(storage.getItem(B.AGE_KEY), "8");
});

test("dashboard questions come from the real curriculum with plausible unique choices", () => {
  const state = S.defaults(); state.level = 5;
  const problem = B.next(state, 8, rng(10), "", "2026-09-09");
  const dashboard = B.dashboardProblem(problem, rng(11));
  assert.equal(problem.level, 5);
  assert.equal(dashboard.mathProblem.key, problem.key);
  assert.equal(dashboard.seed.type, "playground");
  assert.ok(dashboard.choices.includes(problem.answer));
  assert.equal(new Set(dashboard.choices).size, 3);
  assert.ok(dashboard.choices.every(value => value >= 0 && value <= 100));
  state.level = 12;
  const younger = B.next(state, 5, rng(14), "", "2026-09-09");
  assert.equal(younger.level, 2);
  assert.equal(state.level, 12, "age-capped questions do not silently erase stored progress");
});

test("a dashboard mistake enters the playground review queue and mastery can promote", () => {
  const storage = memory();
  const state = S.defaults();
  const wrong = C.makeProblem(1, rng(12), "split");
  B.record(storage, state, wrong, false, 7, "2026-09-07");
  assert.equal(state.wrong.length, 1);
  const review = B.next(state, 7, rng(13), "", "2026-09-08");
  assert.equal(review.review, true);
  assert.equal(review.reviewKey, wrong.key);

  for (const type of C.levelById(1).types) {
    const seen = new Set(), random = rng(type === "split" ? 21 : 31);
    while (seen.size < 4) {
      const p = C.makeProblem(1, random, type);
      if (seen.has(p.key)) continue;
      seen.add(p.key);
      L.record(state, p, true, seen.size % 2 ? "2026-09-08" : "2026-09-09");
    }
  }
  const final = C.makeProblem(1, rng(40), "join");
  const result = B.record(storage, state, final, true, 7, "2026-09-09");
  assert.equal(result.promoted, true);
  assert.equal(state.level, 2);
  assert.equal(S.load(storage).level, 2);
});

test("hub loads math modules in order and exposes age, shared stage and math review UI", () => {
  const html = fs.readFileSync(path.join(root, "index.html"), "utf8");
  const bridge = fs.readFileSync(path.join(root, "assets", "study", "math-bridge.js"), "utf8");
  const sw = require("../../sw.js");
  const order = ["math/curriculum.js", "math/learning.js", "math/store.js", "assets/study/math-bridge.js", "assets/study/english-reading.js"].map(src => html.indexOf(src));
  assert.ok(order.every(index => index >= 0));
  assert.deepEqual(order, order.slice().sort((a,b)=>a-b));
  for (const id of ["studyAge", "mathStage"]) assert.match(html, new RegExp('id="'+id+'"'));
  assert.match(html, /window\.HubMath\.next\(mathState/);
  assert.match(html, /window\.HubMath\.record\(localStorage, mathState/);
  assert.match(bridge, /재이의 수학놀이터 문제예요/);
  for (const asset of ["./math/curriculum.js?v=20", "./math/learning.js?v=29", "./math/store.js?v=30", "./assets/study/math-bridge.js?v=1"]) {
    assert.ok(sw.CORE_SHELL.includes(asset), asset);
  }
});
