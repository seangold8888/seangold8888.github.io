"use strict";
const test = require("node:test");
const assert = require("node:assert/strict");
const E = require("../js/engine.js");
const cards = require("../cards.json").cards;
const make = (element, extras = {}) => ({id: element || "neutral", name: "시험", type: "magic", element, hp: 200, passive: null, attacks: [{name: "공격", cost: 1, dmg: 20}], ...extras});
const hit = (a, b) => E.performAction(E.createGame(a, b), {type: "attack", attackIndex: 0}, () => 0.9);
test("all 75 cards have exactly one valid element; all 25 element pairs use +10, never x2", () => {
  const counts = {};
  for (const card of cards) {
    if (card.id === "sseugumi") { assert.equal(card.element, null); continue; }
    assert.ok(E.ELEMENT_CHART[card.element], card.id);
    counts[card.element] = (counts[card.element] || 0) + 1;
  }
  assert.deepEqual(counts, {fire:16,water:18,metal:16,wood:17,earth:17});
  const counters = {wood:"metal", fire:"water", earth:"wood", metal:"fire", water:"earth"};
  for (const a of Object.keys(counters)) for (const b of Object.keys(counters)) {
    const state = hit(make(a), make(b));
    assert.equal(200 - state.sides.enemy.hp, counters[b] === a ? 30 : 20, a + " vs " + b);
  }
});
test("affinity immunity, nullification, zero damage and legacy categories obey the new contract", () => {
  const immune = make("earth", {passive:{fx:"no_weakness"}});
  assert.equal(hit(make("wood"), immune).sides.enemy.hp, 180);
  assert.equal(hit(make("wood", {passive:{fx:"nullify_passive"}}), immune).sides.enemy.hp, 170);
  assert.equal(hit(make("wood", {attacks:[{name:"준비",cost:1,dmg:0}]}), make("earth")).sides.enemy.hp, 200);
  assert.equal(hit(make(null, {type:"magic"}), make(null, {type:"wise"})).sides.enemy.hp, 180);
});
test("redhood gets +10 against earth after the S-tier balance pass", () => {
  const red = cards.find(c => c.id === "redhood");
  assert.equal(red.hp, 80);
  assert.equal(red.element, "wood");
  const state = hit(red, make("earth"));
  assert.equal(200 - state.sides.enemy.hp, red.attacks[0].dmg + 10);
});
test("story ultimate remains neutral even with advantageous elements", () => {
  const state = E.createGame(make("wood"), make("earth"));
  state.sides.player.flags.ultimateUnlocked = true;
  state.sides.player.stars = 3;
  const next = E.performAction(state, {type:"ultimate"}, () => 0.9);
  const damage = next.events.find(e => e.type === "damage");
  assert.equal(damage.amount, 50);
  assert.equal(damage.weakness, false);
});
test("all distinct playable pairs finish in seeded AI matches without invalid actions", () => {
  const pool = cards.filter(E.isBattleCard);
  let matches = 0, longest = 0, redWins = 0, redGames = 0;
  for (const a of pool) for (const b of pool) {
    // Real matchmaking excludes the player's own card.
    if (a.id === b.id) continue;
    let seed = 12345 + matches;
    const rng = () => { seed = (Math.imul(seed,1664525)+1013904223)>>>0; return seed/4294967296; };
    let state = E.createGame(a,b), steps = 0;
    while (!state.winner && steps < 150) {
      state = E.performAction(state, E.chooseAiAction(state,rng) || {type:"rest"},rng);
      assert.ok(!state.events.some(e => e.type === "invalid_action"), a.id+" / "+b.id);
      steps++;
    }
    assert.ok(state.winner, "stalled: "+a.id+" / "+b.id);
    longest = Math.max(longest,steps); matches++;
    if(a.id === "redhood" || b.id === "redhood") {
      redGames++;
      if(state.sides[state.winner]?.card.id === "redhood") redWins++;
    }
  }
  console.log(JSON.stringify({matches,longest,redWins,redGames}));
});
