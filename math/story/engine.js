/* A short, repeatable concept story with its own progress. */
(function (root) {
  "use strict";
  const KEY = "math10_swing_story_v1";
  const PHASES = ["pair", "paired", "teach", "transfer", "reason", "done"];

  function plan(date) {
    const day = Number(String(date).replace(/\D/g, "")) || 1;
    const count = [5, 6, 7, 8, 9, 10][day % 6];
    return { count: count, transfer: count % 2 ? count + 1 : count - 1, claimEven: Math.floor(day / 2) % 2 === 0 };
  }
  function create(date, character) {
    return { date: date, character: character === "kitty" ? "kitty" : "purin", phase: "pair", pairs: 0,
      assisted: false, teachTries: 0, transferTries: 0, reasonTries: 0 };
  }
  function clean(value, date, character) {
    if (!value || value.date !== date || !PHASES.includes(value.phase)) return create(date, character);
    const max = Math.floor(plan(date).count / 2);
    const state = create(date, value.character);
    state.phase = value.phase;
    state.pairs = Math.min(max, Math.max(0, Math.trunc(Number(value.pairs) || 0)));
    if (state.phase !== "pair") state.pairs = max;
    if (state.phase === "pair" && state.pairs === max) state.phase = "paired";
    state.assisted = value.assisted === true;
    ["teachTries", "transferTries", "reasonTries"].forEach(function (key) { state[key] = Math.min(20, Math.max(0, Number(value[key]) || 0)); });
    return state;
  }
  function load(storage, date, character) {
    try { return clean(JSON.parse(storage.getItem(KEY)), date, character); } catch (_) { return create(date, character); }
  }
  function save(storage, state) {
    try { storage.setItem(KEY, JSON.stringify(state)); } catch (_) {}
  }
  function pair(state) {
    if (state.phase !== "pair") return false;
    state.pairs++;
    if (state.pairs >= Math.floor(plan(state.date).count / 2)) state.phase = "paired";
    return true;
  }
  function advance(state) {
    if (state.phase !== "paired") return false;
    state.phase = "teach";
    return true;
  }
  function judge(state, agrees) {
    if (state.phase !== "teach") return false;
    const p = plan(state.date), correct = agrees === (p.claimEven === (p.count % 2 === 0));
    if (correct) state.phase = "transfer";
    else { state.teachTries++; state.assisted = true; }
    return correct;
  }
  function hint(state) {
    if (state.phase !== "transfer" && state.phase !== "reason") return false;
    state.assisted = true;
    return true;
  }
  function transfer(state, even) {
    if (state.phase !== "transfer") return false;
    const correct = even === (plan(state.date).transfer % 2 === 0);
    if (correct) state.phase = "reason";
    else { state.transferTries++; state.assisted = true; }
    return correct;
  }
  function reason(state, leftover) {
    if (state.phase !== "reason") return false;
    const correct = leftover === (plan(state.date).transfer % 2 === 1);
    if (correct) state.phase = "done";
    else { state.reasonTries++; state.assisted = true; }
    return correct;
  }
  const api = { KEY, plan, create, clean, load, save, pair, advance, judge, hint, transfer, reason };
  if (typeof module !== "undefined" && module.exports) module.exports = api;
  else root.MathSwingStory = api;
})(typeof window !== "undefined" ? window : globalThis);
