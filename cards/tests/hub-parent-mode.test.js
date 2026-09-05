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
function setup(initial = {}, confirmed = true) {
  const stored = new Map(Object.entries(initial));
  const ctx = {
    DAILY: 40, SET: 10, BOOK_MAX: 100, BANK_SIZES: {}, SKILL_INFO: { hidden: {} },
    todayKey: () => "2026-9-5", setCorrect: 0, renders: 0, prompts: 0,
    localStorage: { getItem: k => stored.get(k) ?? null, setItem: (k, v) => stored.set(k, v) },
    window: { confirm: () => { ctx.prompts++; return confirmed; } },
    applyState: () => ctx.renders++,
  };
  vm.createContext(ctx);
  vm.runInContext(["loadState", "saveState", "toggleParentMode"].map(fn).join("\n"), ctx);
  ctx.state = ctx.loadState();
  return { ctx, stored };
}
const baseline = {
  hub2_date: "2026-9-5", hub2_solved: "7", hub2_credit: "1", hub2_parent_mode: "0",
  hub2_level: "2", hub2_streak: "3", hub2_skills: '{"hidden":{"s":5,"d":7}}',
  hub2_wrongbook: '[{"type":"hidden","total":8,"left":3,"miss":2}]',
  story_done_cinderella: "1", hub2_plays: '{"cards":{"n":2}}',
};
test("five taps toggle on and off without changing progress, tickets or learning records", () => {
  const { ctx, stored } = setup(baseline);
  let listener;
  ctx.document = { getElementById: () => ({ addEventListener: (_, f) => { listener = f; } }) };
  ctx.setTimeout = () => 1; ctx.clearTimeout = () => {};
  const start = html.indexOf("  var moonTaps = 0, moonTimer = null;");
  vm.runInContext(html.slice(start, html.indexOf("\n  });", start) + 6), ctx);
  for (let i = 0; i < 4; i++) listener();
  assert.equal(ctx.state.parentMode, false);
  listener(); assert.equal(ctx.state.parentMode, true);
  assert.equal(stored.get("hub2_parent_mode"), "1");
  ctx.state = ctx.loadState();
  assert.equal(ctx.state.parentMode, true, "persists after reload");
  for (let i = 0; i < 5; i++) listener();
  assert.equal(ctx.state.parentMode, false);
  assert.equal(ctx.setCorrect, 7);
  for (const [key, value] of Object.entries(baseline)) assert.equal(stored.get(key), value, key);
  assert.equal(ctx.prompts, 0);
});
test("legacy completed day requires confirmation; cancellation preserves all data", () => {
  const legacy = { ...baseline, hub2_solved: "40" }; delete legacy.hub2_parent_mode;
  const { ctx, stored } = setup(legacy, false);
  ctx.toggleParentMode();
  assert.equal(ctx.prompts, 1); assert.equal(ctx.state.solved, 40); assert.equal(ctx.renders, 0);
  assert.deepEqual(Object.fromEntries(stored), legacy);
});
test("confirmed legacy reset clears only daily progress and ticket, then supports normal toggles", () => {
  const legacy = { ...baseline, hub2_solved: "40" }; delete legacy.hub2_parent_mode;
  const { ctx, stored } = setup(legacy);
  ctx.toggleParentMode();
  assert.equal(ctx.state.solved, 0); assert.equal(ctx.state.credit, 0);
  assert.equal(ctx.state.parentMode, false); assert.equal(ctx.setCorrect, 0);
  for (const key of ["hub2_level", "hub2_streak", "hub2_skills", "hub2_wrongbook", "story_done_cinderella", "hub2_plays"]) assert.equal(stored.get(key), legacy[key]);
  ctx.toggleParentMode(); ctx.toggleParentMode();
  assert.equal(ctx.prompts, 1); assert.equal(ctx.state.parentMode, false);
});
test("new genuine completion is never erased and parent mode expires on the next date", () => {
  const { ctx } = setup({ ...baseline, hub2_solved: "40" });
  ctx.toggleParentMode(); ctx.toggleParentMode();
  assert.equal(ctx.state.solved, 40); assert.equal(ctx.prompts, 0);
  ctx.toggleParentMode(); ctx.todayKey = () => "2026-9-6";
  const next = ctx.loadState();
  assert.equal(next.parentMode, false); assert.equal(next.solved, 0); assert.equal(next.credit, 0);
  assert.equal(next.level, 2); assert.equal(next.skills.hidden.s, 5);
});
test("storage failures do not break the in-memory toggle", () => {
  const { ctx } = setup(baseline);
  ctx.localStorage.setItem = () => { throw Error("quota"); };
  ctx.toggleParentMode(); ctx.toggleParentMode();
  assert.equal(ctx.state.parentMode, false); assert.equal(ctx.state.solved, 7);
});
test("pending question callbacks cannot reopen or score a question in parent mode", () => {
  const ctx = { isFree: () => true, hasTicket: () => false };
  vm.createContext(ctx);
  vm.runInContext(fn("renderProblem") + "\n" + fn("pick"), ctx);
  assert.doesNotThrow(() => ctx.renderProblem());
  assert.doesNotThrow(() => ctx.pick(1, {}));
});

