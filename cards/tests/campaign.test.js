"use strict";
const test = require("node:test");
const assert = require("node:assert/strict");
const crypto = require("node:crypto");
const Engine = require("../js/engine.js");
const data = require("../cards.json");
const Campaign = require("../js/campaign.js");
const Balance = require("../tools/campaign-balance.cjs");
const vm = require("node:vm");
const fs = require("node:fs");
const path = require("node:path");

function seeded(seed) {
  let value = seed >>> 0;
  return () => ((value = (Math.imul(value, 1664525) + 1013904223) >>> 0) / 4294967296);
}

// Captured before S1. Both deterministic and randomized decisions, with and
// without fragments, must retain their actions, coin rolls, damage and winners.
test("S1 preserves the pre-campaign AI decision and battle fingerprint", () => {
  const trace = [];
  const cards = data.cards.slice(0, 75);
  const fragments = [
    {id: "boost", name: "강화", effect: {type: "boost_damage", amount: 20}},
    {id: "heal", name: "회복", effect: {type: "heal", amount: 20}},
    {id: "discount", name: "할인", effect: {type: "discount_attack", amount: 1}}
  ];
  for (let index = 0; index < cards.length; index++) {
    for (const randomAi of [false, true]) {
      for (const withFragments of [false, true]) {
        const rng = seeded(12345 + index * 97);
        const options = withFragments ? {playerFragments: fragments, enemyFragments: fragments} : undefined;
        let state = Engine.createGame(cards[index], cards[(index * 7 + 13) % cards.length], options);
        let turns = 0;
        while (!state.winner && turns++ < 150) {
          const action = Engine.chooseAiAction(state, randomAi ? rng : undefined) || {type: "rest"};
          trace.push([index, randomAi, withFragments, state.turn, action]);
          state = Engine.performAction(state, action, rng);
          trace.push([state.turnNumber, state.sides.player.hp, state.sides.enemy.hp, state.events, state.winner]);
        }
        assert.ok(state.winner, "baseline battle must finish");
      }
    }
  }
  const digest = crypto.createHash("sha256").update(JSON.stringify(trace)).digest("hex");
  assert.equal(digest, "5653354e6747a48ad42ff36410812b58f93dae9a4e7bf5c9ff1d0a11d076c440");
});

test("aiMistakeRate defaults, validation and deterministic bosses preserve lethal priority", () => {
  const dummy = {id: "dummy", name: "상대", hp: 200, attacks: [{name: "공격", cost: 1, dmg: 10}]};
  const attacker = {id: "attacker", name: "공격자", hp: 200, attacks: [
    {name: "강함", cost: 1, dmg: 30}, {name: "약함", cost: 1, dmg: 20}
  ]};
  for (const bad of [undefined, null, "0", NaN, Infinity]) {
    assert.equal(Engine.createGame(attacker, dummy, {aiMistakeRate: bad}).aiMistakeRate, 0.3);
  }
  assert.equal(Engine.createGame(attacker, dummy, {aiMistakeRate: -1}).aiMistakeRate, 0);
  assert.equal(Engine.createGame(attacker, dummy, {aiMistakeRate: 2}).aiMistakeRate, 1);
  const old = Engine.createGame(attacker, dummy);
  assert.deepEqual(Engine.chooseAiAction(old, () => 0.1), {type: "attack", attackIndex: 1});
  const boss = Engine.createGame(attacker, dummy, {aiMistakeRate: 0});
  assert.deepEqual(Engine.chooseAiAction(boss, () => 0.1), {type: "attack", attackIndex: 0});
  assert.equal(Engine.performAction(boss, {type: "rest"}).aiMistakeRate, 0);
  const lethal = Engine.createGame(attacker, {...dummy, hp: 25}, {aiMistakeRate: 1});
  assert.deepEqual(Engine.chooseAiAction(lethal, () => 0.1), {type: "attack", attackIndex: 0});
  delete old.aiMistakeRate;
  assert.deepEqual(Engine.chooseAiAction(old, () => 0.1), {type: "attack", attackIndex: 1});
});

function resolve(progress, cardId, winner = "player") {
  const battle = Campaign.beginBattle(progress, cardId);
  assert.equal(battle.phase, "battle");
  return Campaign.finishBattle(battle, battle.battleSerial, winner);
}
function firstChapter() {
  let progress = Campaign.finishIntro(Campaign.createProgress());
  progress = resolve(progress, "jaei");
  progress = Campaign.finishChapter(progress);
  return Campaign.selectParty(Campaign.finishIntro(progress), ["jaei", "taeo", "redhood"]);
}
function memoryStorage() {
  const values = new Map();
  return {values, getItem: key => values.get(key) || null, setItem: (key, value) => values.set(key, value)};
}

test("the prologue recruits redhood only after restoration, then requires three unique recruits", () => {
  const start = Campaign.createProgress();
  assert.deepEqual(start.party, ["jaei", "taeo"]);
  assert.deepEqual(Campaign.beginBattle(start, "jaei"), start, "read intro before fighting");
  const restored = resolve(Campaign.finishIntro(start), "jaei");
  assert.equal(restored.stage, 4);
  assert.equal(restored.phase, "restore");
  assert.deepEqual(restored.recruited, []);
  const next = Campaign.finishChapter(restored);
  assert.deepEqual(next.recruited, ["redhood"]);
  assert.deepEqual(next.cleared, [0]);
  assert.equal(next.chapter, 1);
  const select = Campaign.finishIntro(next);
  for (const ids of [["jaei", "taeo"], ["jaei", "jaei", "taeo"], ["jaei", "taeo", "zeus"]]) {
    assert.deepEqual(Campaign.selectParty(select, ids), select);
  }
  assert.equal(firstChapter().phase, "encounter");
  assert.deepEqual(start, Campaign.createProgress(), "transitions do not mutate their inputs");
});

test("a loss rests exactly one card; a wiped party restarts the chapter without lost recruits", () => {
  let progress = resolve(firstChapter(), "jaei");
  assert.equal(progress.stage, 1);
  progress = resolve(progress, "jaei", "enemy");
  assert.equal(progress.stage, 1);
  assert.deepEqual(progress.resting, ["jaei"]);
  assert.deepEqual(Campaign.beginBattle(progress, "jaei"), progress);
  assert.deepEqual(Campaign.beginBattle(progress, "zeus"), progress);
  progress = resolve(progress, "taeo", "enemy");
  progress = resolve(progress, "redhood", "enemy");
  assert.equal(progress.stage, 0);
  assert.equal(progress.phase, "intro");
  assert.deepEqual(progress.resting, []);
  assert.deepEqual(progress.recruited, ["redhood"]);
  assert.deepEqual(progress.cleared, [0]);
  assert.deepEqual(progress.party, ["jaei", "taeo", "redhood"]);
});

test("duplicate/stale battle results and repeated chapter completion cannot double-count", () => {
  const battle = Campaign.beginBattle(firstChapter(), "jaei");
  assert.deepEqual(Campaign.finishBattle(battle, battle.battleSerial + 1, "player"), battle);
  assert.deepEqual(Campaign.finishBattle(battle, battle.battleSerial, "draw"), battle);
  const won = Campaign.finishBattle(battle, battle.battleSerial, "player");
  assert.deepEqual(Campaign.finishBattle(won, battle.battleSerial, "player"), won);
  const later = Campaign.beginBattle(won, "taeo");
  assert.deepEqual(Campaign.finishBattle(later, battle.battleSerial, "player"), later);
  assert.deepEqual(Campaign.finishChapter(won), won);
});

test("all eight chapters finish, restore resting cards, recruit once and award the ending once", () => {
  const storage = memoryStorage();
  let progress = Campaign.createProgress();
  let battles = 0;
  for (const chapter of Campaign.CHAPTERS) {
    assert.equal(progress.chapter, chapter.id);
    progress = Campaign.finishIntro(progress);
    if (chapter.id > 0) progress = Campaign.selectParty(progress, ["jaei", "taeo", "redhood"]);
    for (const enemy of Campaign.encounterIds(chapter.id)) {
      const spec = Campaign.encounter(chapter.id, progress.stage, data.cards);
      assert.equal(spec.card.id, enemy);
      assert.equal(spec.options.aiMistakeRate, spec.boss ? 0 : 0.3);
      progress = resolve(progress, "jaei");
      battles++;
      assert.equal(Campaign.save(progress, storage), true);
      assert.deepEqual(Campaign.load(storage), progress);
    }
    assert.equal(progress.phase, "restore");
    progress = Campaign.finishChapter(progress);
    assert.deepEqual(progress.resting, []);
    assert.equal(progress.recruited.length, chapter.id + 1);
    assert.equal(Campaign.save(progress, storage), true);
    assert.deepEqual(Campaign.load(storage), progress);
  }
  assert.equal(battles, 29);
  assert.equal(progress.phase, "complete");
  assert.equal(progress.ending, 1);
  assert.ok(progress.recruited.includes("sseugumi"));
  assert.deepEqual(Campaign.finishChapter(progress), progress);
});

test("storage corruption and blocked storage are safe; interrupted battles resume before card selection", () => {
  const storage = memoryStorage();
  const valid = firstChapter();
  const malformed = [null, {}, [], {version: 99}, {...valid, stage: -1}, {...valid, chapter: 8},
    {...valid, recruited: ["zeus"]}, {...valid, party: ["jaei", "jaei", "taeo"]},
    {...valid, resting: ["zeus"]}, {...valid, resting: valid.party}, {...valid, cleared: [0, 2]},
    {...valid, stage: 4}, {...valid, party: ["jaei", "taeo"]}, {...valid, phase: "hacked"}, {...valid, ending: 1}];
  for (const value of malformed) {
    storage.setItem(Campaign.STORAGE_KEY, JSON.stringify(value));
    assert.deepEqual(Campaign.load(storage), Campaign.createProgress());
  }
  storage.setItem(Campaign.STORAGE_KEY, "broken json");
  assert.deepEqual(Campaign.load(storage), Campaign.createProgress());
  const blocked = {getItem() {throw new Error("denied");}, setItem() {throw new Error("quota");}};
  assert.deepEqual(Campaign.load(blocked), Campaign.createProgress());
  assert.equal(Campaign.save(valid, blocked), false);
  const battle = Campaign.beginBattle(valid, "jaei");
  Campaign.save(battle, storage);
  const resumed = Campaign.load(storage);
  assert.equal(resumed.phase, "encounter");
  assert.equal(resumed.activeCard, null);
  assert.equal(resumed.stage, battle.stage);
  assert.deepEqual(resumed.resting, []);
  const retry = Campaign.beginBattle(resumed, "jaei");
  assert.ok(retry.battleSerial > battle.battleSerial);
  assert.deepEqual(Campaign.finishBattle(retry, battle.battleSerial, "player"), retry);
});

test("campaign HP is isolated and all original collection data remains frozen", () => {
  const before = JSON.stringify(data);
  const opponent = Campaign.encounter(1, 3, data.cards);
  assert.equal(opponent.card.hp, data.cards.find(card => card.id === "snowqueen").hp + opponent.hpBonus);
  opponent.card.attacks[0].dmg = 999;
  opponent.card.passive.fx = "changed";
  assert.equal(JSON.stringify(data), before);
  assert.equal(crypto.createHash("sha256").update(before).digest("hex"), "3bdad4902a84cf2fb6a9eae9e978995c0acc4f999d42db5d5adb62ef6f5ae596");
  assert.throws(() => Campaign.encounter(0, 2, data.cards), RangeError);
  assert.throws(() => Campaign.encounter(0, 0, []), /누락/);
});

test("browser module loads without DOM or storage access", () => {
  const sandbox = {};
  vm.runInNewContext(fs.readFileSync(path.join(__dirname, "../js/campaign.js"), "utf8"), sandbox);
  assert.equal(sandbox.CardCampaign.CHAPTERS.length, 8);
  assert.equal(sandbox.CardCampaign.createProgress().chapter, 0);
});

test("party probability consumes lost cards and considers all three-card combinations", () => {
  assert.equal(Balance.combinations(["a", "b", "c", "d"]).length, 4);
  const rows = [0, 1].map(() => ({rates: [{id: "a", rate: 0.5}, {id: "b", rate: 0.5}]}));
  assert.equal(Balance.partyChance(["a"], rows), 0.25);
  assert.equal(Balance.partyChance(["a", "b"], rows), 0.5);
  assert.deepEqual(Balance.combinations(["a", "b"]), [["a", "b"]]);
});

test("winning the chapter brings back a resting party member", () => {
  let progress = resolve(firstChapter(), "jaei", "enemy");
  assert.deepEqual(progress.resting, ["jaei"]);
  for (let stage = 0; stage < 4; stage++) progress = resolve(progress, "taeo");
  assert.deepEqual(progress.resting, ["jaei"]);
  const next = Campaign.finishChapter(progress);
  assert.equal(next.chapter, 2);
  assert.deepEqual(next.resting, []);
  assert.deepEqual(next.recruited, ["redhood", "cinderella"]);
});

test("approved campaign balance rewards good counters, differentiates bosses and leaves every chapter finishable", () => {
  const report = Balance.run();
  assert.equal(report.pass, true, JSON.stringify(report.rows.filter(row => !row.pass)));
  assert.equal(report.rows.length, 29);
  assert.equal(report.parties.reduce((sum, row) => sum + row.combinations, 0), 211);
  assert.ok(report.rows.some(row => row.best.rate === 1), "good counter choices may guarantee victory");
  for (const row of report.rows) {
    assert.equal(row.stalls, 0);
    assert.equal(row.invalid, 0);
    assert.ok(row.best.rate >= row.minimum);
    if (row.boss) {
      assert.ok(row.median <= 0.8 && row.spread >= 0.25);
      assert.ok(row.viableCount >= Balance.BOSS_LIMITS.minimumChoices);
      assert.equal(row.choiceBreadth, true);
      assert.equal(row.durationOk, true);
      assert.ok(row.hpBonus >= 0 && row.hpBonus <= 40);
      for (const card of row.rates.filter(card => card.rate >= Balance.BOSS_LIMITS.viableRate)) {
        assert.ok(card.averageActions <= Balance.BOSS_LIMITS.meanActions);
        assert.ok(card.p95Actions <= Balance.BOSS_LIMITS.p95Actions);
      }
    }
  }
  for (const chapter of report.parties) assert.ok(chapter.best.chance >= chapter.minimum);
  assert.equal(report.recruit.games, 9600);
  assert.ok(report.recruit.rate >= 0.35 && report.recruit.rate <= 0.8);
});

test("breadth and duration guards reject the former single-choice and long bosses", () => {
  const queen = Balance.measure(1, 3, 64, 80);
  assert.equal(queen.choiceBreadth, false);
  assert.equal(queen.pass, false);
  const guanyu = Balance.measure(5, 3, 64, 120);
  assert.equal(guanyu.durationOk, false);
  assert.equal(guanyu.pass, false);
});
