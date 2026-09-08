"use strict";
const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");
const crypto = require("node:crypto");
const Engine = require("../js/engine.js");
const root = path.join(__dirname, "..");
const data = JSON.parse(fs.readFileSync(path.join(root, "cards.json"), "utf8"));
const g1Ids = ["zeus", "poseidon", "hades", "apollo"];
const g2Ids = ["minotaur", "cerberus", "hydra", "sphinx"];
const g3Ids = ["achilles", "theseus", "artemis", "atalanta"];
const g4Ids = ["athena", "hermes", "orpheus", "prometheus"];
const laterIds = g3Ids.concat(g4Ids);
const ids = g1Ids.concat(g2Ids, laterIds);
const get = id => data.cards.find(card => card.id === id);
function appRuntime(hostname = "seangold8888.github.io", search = "") {
  const store = new Map();
  const dom = Object.fromEntries(["lockedArt", "lockedTitle", "lockedDescription", "lockedDialog"].map(id => [id, {style: {}, textContent: "", showModal() { this.open = true; }}]));
  const sandbox = {window: {CardEngine: Engine, CardView: {artPosition: {}}}, document: {addEventListener() {}, getElementById(id) { return dom[id]; }}, location: {hostname, search}, URLSearchParams, localStorage: {getItem(key) { return store.get(key) || null; }}};
  const source = fs.readFileSync(path.join(root, "js/app.js"), "utf8").replace('document.addEventListener("DOMContentLoaded", init);', 'window.GreekQa = {isUnlocked, unlockStoryLabel, openLockedDialog, cacheDom, getUnlockSnapshot, setCards(value) { cards = value; }};');
  vm.runInNewContext(source, sandbox);
  const api = sandbox.window.GreekQa;
  api.cacheDom(); api.setCards(data.cards);
  return {api, store, dom, sandbox};
}
function gatesRuntime() {
  const sandbox = {window: {}};
  vm.runInNewContext(fs.readFileSync(path.join(root, "js/story-gates.js"), "utf8"), sandbox);
  return sandbox.window.CardStoryGates;
}
test("G1 stays byte-for-byte stable after G4", () => {
  const afterG1Ids = g2Ids.concat(laterIds);
  const g1Data = data.cards.filter(card => !afterG1Ids.includes(card.id));
  const g1Collection = data.collection.filter(id => !afterG1Ids.includes(id));
  assert.equal(g1Data.length, 28);
  assert.deepEqual(g1Collection.slice(-4), g1Ids);
  const old = g1Data.filter(card => !g1Ids.includes(card.id));
  assert.equal(old.length, 24);
  assert.equal(crypto.createHash("sha256").update(JSON.stringify(old)).digest("hex"), "88c6913741d59ffea6b2631e6ddf047539557d1536a090b01de265ce38f733a7");
  assert.equal(crypto.createHash("sha256").update(JSON.stringify(g1Data)).digest("hex"), "ab05c6836227ad39e9fe2c65e679a0d8ec0529142579a8241c6c606d47d63a4c");
  assert.deepEqual(g1Data.reduce((counts, card) => { counts[card.type] = (counts[card.type] || 0) + 1; return counts; }, {}), {brave: 6, wise: 6, magic: 10, monster: 6});
  for (const id of g1Ids) {
    const card = get(id);
    assert.equal(Engine.isBattleCard(card), true, id);
    assert.equal(card.type, "magic");
    assert.ok(!["coin_evade", "heal_40"].includes(card.passive?.fx));
    for (const attack of card.attacks) {
      assert.equal(attack.dmg % 10, 0);
      assert.notEqual(attack.fx, "heal_40");
      if (attack.fx === "skip_next_enemy") assert.ok(attack.dmg > 0);
    }
    const max = Math.max(...card.attacks.map(a => a.dmg));
    const attack = (max <= 20 ? 1 : max === 30 ? 2 : max === 40 ? 3 : max <= 60 ? 4 : 5) + (card.passive?.fx === "boost_20_below_half" ? 1 : 0);
    const defense = (card.hp <= 40 ? 1 : card.hp <= 60 ? 2 : card.hp === 70 ? 3 : card.hp <= 100 ? 4 : 5) + (["reduce_dmg_10", "first_hit_zero"].includes(card.passive?.fx) ? 1 : 0);
    const spirit = 2 + card.attacks.filter(a => ["steal_star_1", "weaken_next_20"].includes(a.fx)).length;
    assert.deepEqual(card.stats, {attack: Math.min(5, attack), defense: Math.min(5, defense), spirit: Math.min(5, spirit)});
  }
});

test("G2 adds exactly four playable monster cards and preserves all 28 earlier cards", () => {
  const g2Data = data.cards.filter(card => !laterIds.includes(card.id));
  const g2Collection = data.collection.filter(id => !laterIds.includes(id));
  assert.equal(g2Data.length, 32);
  assert.equal(g2Collection.length, 32);
  assert.equal(new Set(g2Collection).size, 32);
  assert.deepEqual(g2Collection.slice(-4), g2Ids);
  const earlier = g2Data.filter(card => !g2Ids.includes(card.id));
  assert.equal(crypto.createHash("sha256").update(JSON.stringify(earlier)).digest("hex"), "ab05c6836227ad39e9fe2c65e679a0d8ec0529142579a8241c6c606d47d63a4c");
  assert.deepEqual(g2Data.reduce((counts, card) => { counts[card.type] = (counts[card.type] || 0) + 1; return counts; }, {}), {brave: 6, wise: 6, magic: 10, monster: 10});
  const utilities = new Set(["heal_40", "weaken_next_20", "skip_next_enemy", "steal_star_1", "gain_star_1", "dmg_half_enemy_hp", "dmg_stack_10"]);
  for (const id of g2Ids) {
    const card = get(id);
    assert.equal(Engine.isBattleCard(card), true, id);
    assert.equal(card.type, "monster");
    assert.ok(!["coin_evade", "heal_40"].includes(card.passive?.fx));
    for (const attack of card.attacks) {
      assert.equal(attack.dmg % 10, 0);
      assert.notEqual(attack.fx, "heal_40");
      if (attack.fx === "skip_next_enemy") assert.ok(attack.dmg > 0);
    }
    const max = Math.max(...card.attacks.map(a => a.dmg));
    const attack = (max <= 20 ? 1 : max === 30 ? 2 : max === 40 ? 3 : max <= 60 ? 4 : 5) +
      (["boost_20_below_half"].includes(card.passive?.fx) ? 1 : 0) +
      (card.attacks.some(a => a.fx === "dmg_stack_10") ? 1 : 0);
    const defense = (card.hp <= 40 ? 1 : card.hp <= 60 ? 2 : card.hp === 70 ? 3 : card.hp <= 100 ? 4 : 5) +
      (["reduce_dmg_10", "first_hit_zero", "revive_half_once"].includes(card.passive?.fx) ? 1 : 0);
    const spirit = 1 + card.attacks.filter(a => utilities.has(a.fx)).length;
    assert.deepEqual(card.stats, {attack: Math.min(5, attack), defense: Math.min(5, defense), spirit: Math.min(5, spirit)});
  }
});
test("G3 and G4 add eight playable cards, preserve G2, and balance all four types at ten", () => {
  assert.equal(data.cards.length, 40);
  assert.equal(data.collection.length, 40);
  assert.equal(new Set(data.collection).size, 40);
  assert.deepEqual(data.collection.slice(-8), laterIds);
  assert.equal(crypto.createHash("sha256").update(JSON.stringify(data.cards.slice(0, 32))).digest("hex"), "65d5d405497ea5f178cc62a76306aeb865bea5096fd600168fedacd318f6c169");
  assert.equal(crypto.createHash("sha256").update(JSON.stringify(data.collection.slice(0, 32))).digest("hex"), "708ddca5dc2c6c7819274763b496bdc8c23960d856b3fbf1e6050169aa5182c6");
  assert.deepEqual(data.cards.reduce((counts, card) => { counts[card.type] = (counts[card.type] || 0) + 1; return counts; }, {}), {brave: 10, wise: 10, magic: 10, monster: 10});
  const utilities = new Set(["heal_40", "weaken_next_20", "skip_next_enemy", "steal_star_1", "gain_star_1", "dmg_half_enemy_hp", "dmg_stack_10"]);
  for (const id of laterIds) {
    const card = get(id);
    assert.equal(Engine.isBattleCard(card), true, id);
    assert.ok(!["coin_evade", "heal_40"].includes(card.passive?.fx));
    for (const attack of card.attacks) {
      assert.equal(attack.dmg % 10, 0);
      assert.notEqual(attack.fx, "heal_40");
      if (attack.fx === "skip_next_enemy") assert.ok(attack.dmg > 0);
    }
    const max = Math.max(...card.attacks.map(a => a.dmg));
    const attack = (max <= 20 ? 1 : max === 30 ? 2 : max === 40 ? 3 : max <= 60 ? 4 : 5) +
      (card.passive?.fx === "boost_20_below_half" ? 1 : 0) +
      (card.attacks.some(a => a.fx === "dmg_stack_10") ? 1 : 0);
    const defense = (card.hp <= 40 ? 1 : card.hp <= 60 ? 2 : card.hp === 70 ? 3 : card.hp <= 100 ? 4 : 5) +
      (["reduce_dmg_10", "first_hit_zero", "revive_half_once"].includes(card.passive?.fx) ? 1 : 0);
    const spirit = (card.type === "wise" ? 2 : 1) + card.attacks.filter(a => utilities.has(a.fx)).length;
    assert.deepEqual(card.stats, {attack: Math.min(5, attack), defense: Math.min(5, defense), spirit: Math.min(5, spirit)}, id);
  }
});
test("all 16 completion combinations honor AND unlocks, not OR, without changing saved progress", () => {
  const {api, store} = appRuntime();
  const stories = ["heracles", "perseus", "odyssey_cyclops", "midas"];
  for (let mask = 0; mask < 16; mask++) {
    store.clear();
    stories.forEach((story, index) => { if (mask & (1 << index)) store.set("story_done_" + story, "1"); });
    const before = [...store];
    assert.equal(api.isUnlocked(get("zeus")), (mask & 3) === 3);
    assert.equal(api.isUnlocked(get("hades")), (mask & 5) === 5);
    assert.equal(api.isUnlocked(get("poseidon")), !!(mask & 4));
    assert.equal(api.isUnlocked(get("apollo")), !!(mask & 8));
    assert.equal(api.isUnlocked(get("minotaur")), (mask & 5) === 5);
    assert.equal(api.isUnlocked(get("cerberus")), !!(mask & 1));
    assert.equal(api.isUnlocked(get("hydra")), !!(mask & 1));
    assert.equal(api.isUnlocked(get("sphinx")), (mask & 6) === 6);
    assert.equal(api.isUnlocked(get("achilles")), (mask & 7) === 7);
    assert.equal(api.isUnlocked(get("theseus")), (mask & 3) === 3);
    assert.equal(api.isUnlocked(get("artemis")), (mask & 10) === 10);
    assert.equal(api.isUnlocked(get("atalanta")), (mask & 9) === 9);
    assert.equal(api.isUnlocked(get("athena")), !!(mask & 2));
    assert.equal(api.isUnlocked(get("hermes")), !!(mask & 2));
    assert.equal(api.isUnlocked(get("orpheus")), (mask & 10) === 10);
    assert.equal(api.isUnlocked(get("prometheus")), (mask & 9) === 9);
    assert.equal(api.isUnlocked(get("redhood")), true);
    assert.equal(api.isUnlocked(get("heracles")), !!(mask & 1));
    assert.deepEqual([...store], before);
  }
  store.clear(); store.set("story_done_heracles", "true"); store.set("story_done_perseus", "1");
  assert.equal(api.isUnlocked(get("zeus")), false, "only the existing exact value 1 counts");
});
test("local preview can unlock G1 through G4, but a public preview query cannot bypass listening", () => {
  for (const id of ids) {
    assert.equal(appRuntime("127.0.0.1", "?preview=all").api.isUnlocked(get(id)), true);
    assert.equal(appRuntime("seangold8888.github.io", "?preview=all").api.isUnlocked(get(id)), false);
  }
  const {api, sandbox} = appRuntime();
  sandbox.localStorage.getItem = () => { throw Error("storage unavailable"); };
  assert.equal(api.isUnlocked(get("zeus")), false);
  assert.equal(api.isUnlocked(get("redhood")), true);
});
test("locked dialog names every required story and refresh snapshot sees the final completion", () => {
  const {api, store, dom} = appRuntime();
  api.openLockedDialog(get("zeus"));
  assert.equal(dom.lockedDialog.open, true);
  assert.match(dom.lockedDescription.textContent, /영웅 헤라클레스/);
  assert.match(dom.lockedDescription.textContent, /페르세우스와 메두사/);
  assert.match(dom.lockedDescription.textContent, /모두 끝까지/);
  api.openLockedDialog(get("hades"));
  assert.match(dom.lockedDescription.textContent, /영웅 헤라클레스/);
  assert.match(dom.lockedDescription.textContent, /오디세이 1화/);
  api.openLockedDialog(get("apollo"));
  assert.match(dom.lockedDescription.textContent, /미다스 왕의 황금 손/);
  assert.doesNotMatch(dom.lockedDescription.textContent, /모두/);
  api.openLockedDialog(get("minotaur"));
  assert.match(dom.lockedDescription.textContent, /영웅 헤라클레스/);
  assert.match(dom.lockedDescription.textContent, /오디세이 1화/);
  assert.match(dom.lockedDescription.textContent, /모두 끝까지/);
  api.openLockedDialog(get("sphinx"));
  assert.match(dom.lockedDescription.textContent, /페르세우스와 메두사/);
  assert.match(dom.lockedDescription.textContent, /오디세이 1화/);
  api.openLockedDialog(get("achilles"));
  assert.match(dom.lockedDescription.textContent, /영웅 헤라클레스/);
  assert.match(dom.lockedDescription.textContent, /페르세우스와 메두사/);
  assert.match(dom.lockedDescription.textContent, /오디세이 1화/);
  api.openLockedDialog(get("artemis"));
  assert.match(dom.lockedDescription.textContent, /페르세우스와 메두사/);
  assert.match(dom.lockedDescription.textContent, /미다스 왕의 황금 손/);
  api.openLockedDialog(get("athena"));
  assert.match(dom.lockedDescription.textContent, /페르세우스와 메두사/);
  assert.doesNotMatch(dom.lockedDescription.textContent, /모두 끝까지/);
  assert.equal(api.unlockStoryLabel({unlockAll: ["heracles", "perseus", "midas"]}).split(", ").length, 3);
  store.set("story_done_heracles", "1");
  const before = api.getUnlockSnapshot();
  store.set("story_done_perseus", "1");
  assert.notEqual(api.getUnlockSnapshot(), before);
  assert.match(api.getUnlockSnapshot(), /zeus:1/);
});
test("G1 through G4 have 80 independent questions, all traceable to the accepted matching-story bank", () => {
  const gates = gatesRuntime();
  for (const id of ids) {
    const card = get(id);
    assert.equal(gates.countForCard(id), 5);
    assert.equal(gates.storyIdForCard(id), card.unlockAll ? card.unlockAll[0] : card.unlock);
    for (const question of gates.all.filter(q => q.cardId === id)) {
      const ref = question.source.refs[0];
      assert.match(ref, /^cards\/js\/story-gates.js#/);
      const source = gates.all.find(q => q.id === ref.split("#")[1]);
      assert.ok(source);
      assert.equal(source.storyId, question.storyId);
      assert.equal(source.prompt, question.prompt);
      assert.equal(source.correctChoiceId, question.correctChoiceId);
      assert.notStrictEqual(source.choices, question.choices);
      assert.notEqual(source.id, question.id);
    }
  }
});
test("Zeus saves for a large attack against recovery only when the waiting turns are survivable", () => {
  const make = () => {
    const state = Engine.createGame(get("zeus"), get("fairygodmother"));
    state.sides.enemy.hp = 70;
    return state;
  };
  const healthy = make();
  assert.deepEqual(Engine.chooseAiAction(healthy, () => 0.49), {type: "rest"});
  const fragile = make(); fragile.sides.player.hp = 10;
  assert.notDeepEqual(Engine.chooseAiAction(fragile, () => 0.49), {type: "rest"});
  const ordinary = Engine.createGame(get("zeus"), get("apollo"));
  assert.deepEqual(Engine.chooseAiAction(ordinary, () => 0.49), {type: "attack", attackIndex: 0});
});


test("the four gods vs Greek heroes finish in 480 seeded, alternating-first-player AI matches", () => {
  let matches = 0;
  for (const id of g1Ids) {
    for (const heroId of ["heracles", "perseus", "odysseus"]) {
      for (let seed = 1; seed <= 20; seed++) {
        for (const godFirst of [true, false]) {
          let value = seed;
          const rng = () => { value = (Math.imul(value, 1664525) + 1013904223) >>> 0; return value / 4294967296; };
          let state = Engine.createGame(get(godFirst ? id : heroId), get(godFirst ? heroId : id));
          let actions = 0;
          while (!state.winner && actions < 120) {
            state = Engine.performAction(state, Engine.chooseAiAction(state, rng) || {type: "rest"}, rng);
            assert.equal(state.events.some(event => event.type === "invalid_action"), false);
            actions++;
          }
          assert.ok(state.winner, id + " vs " + heroId + " seed " + seed);
          matches++;
        }
      }
    }
  }
  assert.equal(matches, 480);
});

test("G2 monsters finish 1600 seeded alternating-first matches without always winning or losing", () => {
  const opponents = ["heracles", "perseus", "odysseus", "polyphemus", "medusa", "midas", ...g1Ids];
  let matches = 0;
  let longest = 0;
  for (const id of g2Ids) {
    let wins = 0;
    for (const opponentId of opponents) {
      for (let seed = 1; seed <= 20; seed++) {
        for (const monsterFirst of [true, false]) {
          let value = seed;
          const rng = () => { value = (Math.imul(value, 1664525) + 1013904223) >>> 0; return value / 4294967296; };
          let state = Engine.createGame(get(monsterFirst ? id : opponentId), get(monsterFirst ? opponentId : id));
          let actions = 0;
          while (!state.winner && actions < 120) {
            state = Engine.performAction(state, Engine.chooseAiAction(state, rng) || {type: "rest"}, rng);
            assert.equal(state.events.some(event => event.type === "invalid_action"), false);
            actions++;
          }
          assert.ok(state.winner, id + " vs " + opponentId + " seed " + seed);
          if (state.winner === (monsterFirst ? "player" : "enemy")) wins++;
          longest = Math.max(longest, actions);
          matches++;
        }
      }
    }
    assert.ok(wins > 0 && wins < 400, id + " should have both wins and losses");
  }
  assert.equal(matches, 1600);
  assert.ok(longest <= 30, "G2 match should finish quickly; longest was " + longest);
});

test("G3 and G4 finish 2240 seeded alternating-first matches without a stall", () => {
  const opponents = ["heracles", "perseus", "odysseus", "polyphemus", "medusa", "midas", ...g1Ids, ...g2Ids];
  let matches = 0;
  let longest = 0;
  for (const id of laterIds) {
    let wins = 0;
    for (const opponentId of opponents) {
      for (let seed = 1; seed <= 10; seed++) {
        for (const newCardFirst of [true, false]) {
          let value = seed;
          const rng = () => { value = (Math.imul(value, 1664525) + 1013904223) >>> 0; return value / 4294967296; };
          let state = Engine.createGame(get(newCardFirst ? id : opponentId), get(newCardFirst ? opponentId : id));
          let actions = 0;
          while (!state.winner && actions < 120) {
            state = Engine.performAction(state, Engine.chooseAiAction(state, rng) || {type: "rest"}, rng);
            assert.equal(state.events.some(event => event.type === "invalid_action"), false);
            actions++;
          }
          assert.ok(state.winner, id + " vs " + opponentId + " seed " + seed);
          if (state.winner === (newCardFirst ? "player" : "enemy")) wins++;
          longest = Math.max(longest, actions);
          matches++;
        }
      }
    }
    assert.ok(wins > 0 && wins < 280, id + " should have both wins and losses");
  }
  assert.equal(matches, 2240);
  assert.ok(longest <= 40, "G3/G4 match should finish quickly; longest was " + longest);
});

test("G1 28장의 PNG·WebP 56개 배포 원화는 검증된 매니페스트와 일치한다", () => {
  const files = data.collection.filter(id => !g2Ids.concat(laterIds).includes(id))
    .flatMap(id => [id + ".png", id + ".webp"]).sort();
  const sha = value => crypto.createHash("sha256").update(value).digest("hex");
  const manifest = files.map(name => name + ":" + sha(fs.readFileSync(path.join(root, "art", name)))).join("\n");
  assert.equal(files.length, 56);
  assert.equal(sha(manifest), "31d27832c5eda556ec7011287920127f54c360d86f7a5375f60d1bae9f93ee5c");
});

test("G2까지 32장의 PNG·WebP 64개 원화가 모두 존재하고 최종 매니페스트와 일치한다", () => {
  const files = data.collection.filter(id => !laterIds.includes(id))
    .flatMap(id => [id + ".png", id + ".webp"]).sort();
  const sha = value => crypto.createHash("sha256").update(value).digest("hex");
  const manifest = files.map(name => name + ":" + sha(fs.readFileSync(path.join(root, "art", name)))).join("\n");
  assert.equal(files.length, 64);
  assert.equal(sha(manifest), "39ffdb1690caf83cf692ba011ce9d0d446a9f6f8a90a00ef50f4c0e6e4800de8");
});

test("G4 최종 40장의 PNG·WebP 80개 원화가 매니페스트와 일치한다", () => {
  const files = data.collection.flatMap(id => [id + ".png", id + ".webp"]).sort();
  const sha = value => crypto.createHash("sha256").update(value).digest("hex");
  const manifest = files.map(name => name + ":" + sha(fs.readFileSync(path.join(root, "art", name)))).join("\n");
  assert.equal(files.length, 80);
  assert.equal(sha(manifest), "632797e4ca0a8ee872f322dfc8cf2c8c487ffad4c26ec688b6dba8f13b8e75a3");
});
