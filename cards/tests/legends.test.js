"use strict";
const test = require("node:test");
const assert = require("node:assert/strict");
const crypto = require("node:crypto");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");
const {execFileSync} = require("node:child_process");
const root = path.join(__dirname, "..");
const data = require("../cards.json");
const ids = [
  "yisunshin", "euljimundeok", "ganggamchan", "kwonyul",
  "sherlockholmes", "doctorwatson", "arsenelupin", "moriarty",
  "gearwing", "starshield", "thunderguard", "redknot",
  "walllizard", "neonjumper", "moonmoth", "ppungdetective"
];
const sha = value => crypto.createHash("sha256").update(value).digest("hex");

function gatesRuntime() {
  const sandbox = {window: {}};
  vm.runInNewContext(fs.readFileSync(path.join(root, "js/story-gates.js"), "utf8"), sandbox);
  return sandbox.window.CardStoryGates;
}
function audioRuntime() {
  const sandbox = {window: {}, document: {hidden: false}, localStorage: {getItem() { return "1"; }, setItem() {}}, setTimeout, clearTimeout};
  vm.runInNewContext(fs.readFileSync(path.join(root, "js/audio.js"), "utf8"), sandbox);
  return sandbox.window.CardAudio;
}

test("S급 재조정된 55장 데이터·순서와 각 기술 소리는 고정된다", () => {
  assert.equal(sha(JSON.stringify(require("./approved-card-baseline.cjs").beforeMidasRollback(data.cards.slice(0, 55)))), "1f48873f2a372eaa0cc949e6faa437476819abf7c03b751e439992e4cc37691e");
  assert.equal(sha(JSON.stringify(data.collection.slice(0, 55))), "f55b8a8d24c97df0f7335c5bcc680a4744d6b67806ff06876c83fd68c82136ed");
  const Audio = audioRuntime();
  const plans = data.cards.slice(0, 55).flatMap(card => card.attacks.map(attack => {
    const plan = Audio.soundPlanForTechnique({type: card.type, attack: attack.name, kind: attack.vfx.kind,
      emoji: attack.vfx.emoji, big: attack.vfx.big, outcome: attack.dmg > 0 ? "hit" : "support", impactAtMs: 220, totalMs: 500});
    return [card.id, attack.name, plan.material, plan.signature, plan.tailMs];
  }));
  assert.equal(sha(JSON.stringify(plans)), "5ae731e2926dd6e626a7bb0240af013fd55e9b61ddb5ed158193d08585b6cab2");
});

test("전설 16장은 타입 4장씩이며 오행은 14·15·14·14·14로 균형이다", () => {
  assert.equal(data.cards.length, 84);
  assert.deepEqual(data.collection.slice(55, 71), ids);
  const added = data.cards.slice(55, 71);
  assert.deepEqual(added.reduce((out, card) => ((out[card.type] = (out[card.type] || 0) + 1), out), {}), {brave: 4, wise: 4, magic: 4, monster: 4});
  assert.deepEqual(data.cards.slice(0, 71).reduce((out, card) => ((out[card.element] = (out[card.element] || 0) + 1), out), {}), {fire: 14, water: 15, metal: 14, wood: 14, earth: 14});
});

test("전설 16장은 카드당 5문항과 1024×1536 PNG·WEBP를 가진다", () => {
  const gates = gatesRuntime();
  ids.forEach(id => {
    assert.equal(gates.countForCard(id), 5, id);
    assert.equal(gates.storyIdForCard(id), "legend:" + id);
    for (const ext of ["png", "webp"]) assert.ok(fs.existsSync(path.join(root, "art", id + "." + ext)), id + "." + ext);
  });
});

test("전설 16장은 35~80%이고 교착이 없다", () => {
  const output = execFileSync(process.execPath, [path.join(root, "tools/legends-balance.cjs")], {encoding: "utf8"});
  assert.match(output, /교착 0 건/);
  const rates = [...output.matchAll(/^(.+?) (\d+)%$/gm)].map(match => Number(match[2]));
  assert.equal(rates.length, 16);
  rates.forEach(rate => assert.ok(rate >= 35 && rate <= 80, rate));
});
