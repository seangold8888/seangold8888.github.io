"use strict";
const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");
const html = fs.readFileSync(path.join(__dirname, "../../index.html"), "utf8").replace(/\r/g, "");
function fn(name) {
  const start = html.indexOf("  function " + name + "(");
  assert.ok(start >= 0, name);
  return html.slice(start, html.indexOf("\n  }", start) + 4);
}
function setup(initial = {}) {
  const stored = new Map(Object.entries({hub2_date: "2026-9-6", hub2_parent_mode: "0", ...initial}));
  const ctx = {
    BOOK_MAX: 24, BANK_SIZES: {reading: 16}, SKILL_INFO: {reading: {name: "영어 읽기"}},
    todayKey: () => "2026-9-6", dayNum: () => 100, MASTER_AT: 9, CHEERS: ["정답"],
    localStorage: {getItem: k => stored.get(k) ?? null, setItem: (k,v) => stored.set(k,v)},
    cheerEl: {}, drawSetStars() {}, drawDaily() {}, applyState() {}, renderProblem() {},
    stopReading() {}, annotatePlays() {}, setTimeout: () => 1,
  };
  vm.createContext(ctx);
  vm.runInContext(html.match(/var SET = \d+, DAILY = \d+;/)[0] + "\n" +
    ["loadState", "saveState", "isFree", "hasTicket", "consumeGameTicket", "restoreStudyProgress", "loadPlays", "skillOf", "pick"].map(fn).join("\n"), ctx);
  ctx.state = ctx.loadState();
  ctx.setCorrect = ctx.state.solved % ctx.SET;
  ctx.answer = () => {
    ctx.current = {answer: "I like apples.", reading: {}, seed: {type: "reading", idx: 0}};
    ctx.pick(ctx.current.answer, null);
  };
  return {ctx, stored};
}
test("ten-answer rounds preserve today's total across entry, reload and cached back navigation; answer 100 unlocks", () => {
  const {ctx, stored} = setup();
  assert.equal(ctx.DAILY, 100);
  assert.equal(ctx.SET, 10);
  for (let round = 1; round <= 10; round++) {
    for (let i = 0; i < 10; i++) ctx.answer();
    assert.equal(ctx.state.solved, round * 10);
    if (round < 10) {
      assert.equal(ctx.isFree(), false);
      assert.equal(ctx.state.credit, 1);
      assert.equal(ctx.consumeGameTicket(), true);
      assert.equal(ctx.consumeGameTicket(), false, "one ticket cannot open two games");
      ctx.restoreStudyProgress();
      assert.equal(ctx.setCorrect, 0);
      assert.equal(ctx.state.credit, 0);
      assert.equal(ctx.state.solved, round * 10);
      assert.equal(ctx.loadState().solved, round * 10, "ordinary reload restores total too");
    } else {
      assert.equal(ctx.isFree(), true);
      for (let j = 0; j < 3; j++) {
        assert.equal(ctx.consumeGameTicket(), true);
        ctx.restoreStudyProgress();
        assert.equal(ctx.isFree(), true);
      }
      assert.equal(ctx.state.solved, 100);
    }
  }
  assert.equal(stored.get("hub2_solved"), "100");
  ctx.todayKey = () => "2026-9-7";
  ctx.restoreStudyProgress();
  assert.equal(ctx.state.solved, 0);
  assert.equal(ctx.state.credit, 0);
  assert.equal(ctx.isFree(), false);
  assert.equal(ctx.state.skills.reading.s, 10, "mastery survives the next day");
});
test("refresh preserves unfinished round; the old 40-answer goal no longer grants free entry", () => {
  const {ctx} = setup({hub2_solved: "47", hub2_credit: "0"});
  ctx.restoreStudyProgress();
  assert.equal(ctx.setCorrect, 7);
  assert.equal(ctx.isFree(), false);
  assert.equal(ctx.consumeGameTicket(), false);
  for (let i = 0; i < 3; i++) ctx.answer();
  assert.equal(ctx.state.solved, 50);
  assert.equal(ctx.state.credit, 1);
});
test("incorrect answers do not advance either counter", () => {
  const {ctx} = setup({hub2_solved: "49"});
  ctx.current = {answer: "yes", missed: true, seed: {type: "reading", idx: 0}};
  ctx.OOPS = ["다시 읽어요"];
  ctx.pick("no", {style: {}});
  assert.equal(ctx.state.solved, 49);
  assert.equal(ctx.setCorrect, 9);
  assert.equal(ctx.state.credit, 0);
});
test("parent override and ticket-ready reload preserve learning records", () => {
  const {ctx} = setup({hub2_solved: "20", hub2_credit: "1", hub2_parent_mode: "1"});
  assert.equal(ctx.consumeGameTicket(), true);
  ctx.restoreStudyProgress();
  assert.equal(ctx.state.credit, 1);
  assert.equal(ctx.state.solved, 20);
  ctx.state.parentMode = false;
  ctx.saveState();
  ctx.restoreStudyProgress();
  assert.equal(ctx.state.credit, 1, "refresh alone does not spend a ticket");
  assert.equal(ctx.consumeGameTicket(), true);
  assert.equal(ctx.state.credit, 0);
});
test("game click and cached return are wired to tested handlers, with no obsolete 40-question UI", () => {
  assert.match(html, /if \(consumeGameTicket\(\)\) return/);
  assert.match(html, /if \(e.persisted\) \{\s*restoreStudyProgress\(\);/);
  assert.doesNotMatch(html, /40문제|0 \/ 40/);
  assert.match(html, /id="hubDailyStat">0 \/ 100/);
});
