"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");
const Engine = require("../js/engine.js");

const root = path.join(__dirname, "..");
const data = require("../cards.json");
const ids = ["circe", "siren", "scylla", "helios"];
const get = (id) => data.cards.find((card) => card.id === id);

function gatesRuntime() {
  const sandbox = { window: {} };
  vm.runInNewContext(fs.readFileSync(path.join(root, "js", "story-gates.js"), "utf8"), sandbox);
  return sandbox.window.CardStoryGates;
}

function appRuntime(hostname = "seangold8888.github.io", search = "") {
  const store = new Map();
  const sandbox = {
    window: { CardEngine: Engine, CardView: { artPosition: {} } },
    document: { addEventListener() {}, getElementById() { return { style: {} }; } },
    location: { hostname, search },
    URLSearchParams,
    localStorage: { getItem(key) { return store.get(key) || null; }, setItem(key, value) { store.set(key, value); } },
    Date,
    setTimeout,
    clearTimeout
  };
  const source = fs.readFileSync(path.join(root, "js", "app.js"), "utf8")
    .replace('document.addEventListener("DOMContentLoaded", init);', 'window.OdysseyQa = { isUnlocked, setCards(value) { cards = value; } };');
  vm.runInNewContext(source, sandbox);
  sandbox.window.OdysseyQa.setCards(data.cards);
  return { api: sandbox.window.OdysseyQa, store };
}

function pngSize(filePath) {
  const buffer = fs.readFileSync(filePath);
  assert.equal(buffer.toString("hex", 0, 8), "89504e470d0a1a0a");
  return [buffer.readUInt32BE(16), buffer.readUInt32BE(20), buffer[25]];
}

function webpSize(filePath) {
  const buffer = fs.readFileSync(filePath);
  assert.equal(buffer.toString("ascii", 0, 4), "RIFF");
  assert.equal(buffer.toString("ascii", 8, 12), "WEBP");
  const chunk = buffer.toString("ascii", 12, 16);
  if (chunk === "VP8 ") return [buffer.readUInt16LE(26) & 0x3fff, buffer.readUInt16LE(28) & 0x3fff];
  if (chunk === "VP8L") {
    const bits = buffer.readUInt32LE(21);
    return [(bits & 0x3fff) + 1, ((bits >>> 14) & 0x3fff) + 1];
  }
  if (chunk === "VP8X") return [buffer.readUIntLE(24, 3) + 1, buffer.readUIntLE(27, 3) + 1];
  assert.fail("unsupported WebP chunk: " + chunk);
}

test("오디세이 조우 4장은 75장 컬렉션의 마지막 묶음이고 오행이 완전히 균형이다", () => {
  assert.equal(data.cards.length, 85);
  assert.equal(data.collection.length, 85);
  assert.deepEqual(data.collection.slice(71, 75), ids);
  assert.deepEqual(
    data.cards.slice(0,75).reduce((out, card) => ((out[card.element] = (out[card.element] || 0) + 1), out), {}),
    { fire: 15, water: 15, metal: 15, wood: 15, earth: 15 }
  );
  ids.forEach((id) => assert.equal(Engine.isBattleCard(get(id)), true, id));
});

test("오디세이 조우 4장의 수치·기술·해금은 확정값이다", () => {
  assert.deepEqual(ids.map((id) => {
    const card = get(id);
    return [card.id, card.type, card.element, card.rarity, card.hp, card.passive.fx, card.unlock,
      card.attacks.map((attack) => [attack.name, attack.cost, attack.dmg, attack.fx]),
      [card.stats.attack, card.stats.defense, card.stats.spirit]];
  }), [
    ["circe", "magic", "wood", 3, 80, "first_hit_zero", "game:odyssey/circe", [["몰리 향기", 1, 20, "weaken_next_20"], ["돼지 변신", 2, 30, "skip_next_enemy"]], [3, 5, 4]],
    ["siren", "wise", "metal", 2, 70, "coin_evade", "game:odyssey/sirens", [["노래 물결", 1, 20, "steal_star_1"], ["마음을 끄는 합창", 2, 40, "weaken_next_20"]], [4, 3, 4]],
    ["scylla", "monster", "earth", 3, 90, "boost_20_below_half", "game:odyssey/scylla", [["절벽 손짓", 1, 20, "weaken_next_20"], ["여섯 머리 급습", 3, 50, null]], [5, 4, 3]],
    ["helios", "brave", "fire", 3, 100, "no_weakness", "game:odyssey/helios", [["새벽빛 고삐", 1, 20, "gain_star_1"], ["태양 마차", 3, 60, null]], [4, 5, 3]]
  ]);
});

test("각 카드는 해당 오디세이 장을 실제로 깬 뒤에만 열린다", () => {
  const stages = ["circe", "sirens", "scylla", "helios"];
  for (let i = 0; i < ids.length; i += 1) {
    const { api, store } = appRuntime();
    assert.equal(api.isUnlocked(get(ids[i])), false, ids[i] + " starts locked");
    store.set("ody_progress", JSON.stringify({ version: 3, stages: { [stages[i]]: { cleared: true, bestStars: 1 } } }));
    assert.equal(api.isUnlocked(get(ids[i])), true, ids[i] + " unlocks from its own stage");
    ids.forEach((otherId, otherIndex) => {
      if (otherIndex !== i) assert.equal(api.isUnlocked(get(otherId)), false, otherId + " stays locked");
    });
  }
  const broken = appRuntime();
  broken.store.set("ody_progress", "not-json");
  assert.equal(broken.api.isUnlocked(get("circe")), false);
  assert.equal(appRuntime("127.0.0.1", "?preview=all").api.isUnlocked(get("circe")), true);
  assert.equal(appRuntime("seangold8888.github.io", "?preview=all").api.isUnlocked(get("circe")), false);
});

test("각 카드는 이야기 기반 5문항과 1024×1536 PNG·WebP 원화를 가진다", () => {
  const gates = gatesRuntime();
  const stories = ["game:odyssey/circe", "game:odyssey/sirens", "game:odyssey/scylla", "game:odyssey/helios"];
  ids.forEach((id, index) => {
    assert.equal(gates.countForCard(id), 5, id);
    assert.equal(gates.storyIdForCard(id), stories[index], id);
    assert.deepEqual(pngSize(path.join(root, "art", id + ".png")), [1024, 1536, 2], id + ".png");
    assert.deepEqual(webpSize(path.join(root, "art", id + ".webp")), [1024, 1536], id + ".webp");
  });
});
