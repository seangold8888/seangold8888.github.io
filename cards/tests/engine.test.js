"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");
const Engine = require("../js/engine.js");

function card(overrides = {}) {
  return {
    id: overrides.id || "card-" + Math.random(),
    name: overrides.name || "시험 카드",
    type: overrides.type || "monster",
    hp: overrides.hp || 100,
    passive: Object.prototype.hasOwnProperty.call(overrides, "passive")
      ? overrides.passive
      : null,
    attacks: overrides.attacks || [
      { name: "기본 공격", cost: 1, dmg: 20, fx: null },
    ],
  };
}

function heads() {
  return 0.1;
}

function tails() {
  return 0.9;
}

function take(state, action, rng) {
  return Engine.performAction(state, action, rng);
}

function pngMetadata(filePath) {
  const buffer = fs.readFileSync(filePath);
  assert.equal(buffer.toString("hex", 0, 8), "89504e470d0a1a0a");
  return {
    width: buffer.readUInt32BE(16),
    height: buffer.readUInt32BE(20),
    colorType: buffer[25],
  };
}

function webpSize(filePath) {
  const buffer = fs.readFileSync(filePath);
  assert.equal(buffer.toString("ascii", 0, 4), "RIFF");
  assert.equal(buffer.toString("ascii", 8, 12), "WEBP");
  const chunk = buffer.toString("ascii", 12, 16);

  if (chunk === "VP8 ") {
    assert.equal(buffer.toString("hex", 23, 26), "9d012a");
    return {
      width: buffer.readUInt16LE(26) & 0x3fff,
      height: buffer.readUInt16LE(28) & 0x3fff,
    };
  }
  if (chunk === "VP8L") {
    assert.equal(buffer[20], 0x2f);
    const bits = buffer.readUInt32LE(21);
    return {
      width: (bits & 0x3fff) + 1,
      height: ((bits >>> 14) & 0x3fff) + 1,
    };
  }
  if (chunk === "VP8X") {
    return {
      width: buffer.readUIntLE(24, 3) + 1,
      height: buffer.readUIntLE(27, 3) + 1,
    };
  }
  assert.fail("지원하지 않는 WebP 청크: " + chunk);
}

test("createGame은 플레이어 턴을 시작하며 별사탕을 1개 준다", () => {
  const state = Engine.createGame(card({ id: "p" }), card({ id: "e" }));

  assert.equal(state.turn, "player");
  assert.equal(state.phase, "action");
  assert.equal(state.sides.player.stars, 1);
  assert.equal(state.sides.enemy.stars, 0);
  assert.equal(state.events[0].type, "turn_start");
  assert.equal(state.winner, null);
});

test("쉬기는 별을 보존하고 양쪽 별사탕은 각 턴 시작에 최대 5까지 오른다", () => {
  let state = Engine.createGame(card({ id: "p" }), card({ id: "e" }));

  for (let i = 0; i < 12; i += 1) state = take(state, { type: "rest" });

  assert.equal(state.sides.player.stars, 5);
  assert.equal(state.sides.enemy.stars, 5);
  assert.ok(state.events.some((event) => event.type === "turn_start"));
});

test("공격 비용을 지불하고 확정 상성에 따라 약점 데미지를 두 배 적용한다", () => {
  const magic = card({
    id: "magic",
    type: "magic",
    attacks: [{ name: "마법", cost: 1, dmg: 20, fx: null }],
  });
  const wise = card({ id: "wise", type: "wise", hp: 100 });
  const original = Engine.createGame(magic, wise);
  const state = take(original, { type: "attack", attackIndex: 0 });

  assert.equal(original.sides.enemy.hp, 100, "입력 상태는 변경하지 않는다");
  assert.equal(state.sides.player.stars, 0);
  assert.equal(state.sides.enemy.hp, 60);
  const hit = state.events.find((event) => event.type === "damage");
  assert.equal(hit.amount, 40);
  assert.equal(hit.weakness, true);
});

test("별사탕이 부족한 공격은 상태를 진행하지 않고 invalid_action을 남긴다", () => {
  const expensive = card({
    id: "expensive",
    attacks: [{ name: "큰 기술", cost: 3, dmg: 60, fx: null }],
  });
  const state = Engine.createGame(expensive, card({ id: "target" }));
  const next = take(state, { type: "attack", attackIndex: 0 });

  assert.equal(next.turn, "player");
  assert.equal(next.sides.player.stars, 1);
  assert.equal(next.sides.enemy.hp, 100);
  assert.equal(next.events.at(-1).type, "invalid_action");
});

test("revive_half_once는 이로운 패시브가 살아 있을 때 한 번만 절반 HP로 부활시킨다", () => {
  const striker = card({
    id: "striker",
    attacks: [{ name: "강타", cost: 1, dmg: 100, fx: null }],
  });
  const cinderella = card({
    id: "cinderella",
    hp: 60,
    passive: { name: "유리 구두", fx: "revive_half_once" },
  });
  let state = Engine.createGame(striker, cinderella);

  state = take(state, { type: "attack", attackIndex: 0 });
  assert.equal(state.sides.enemy.hp, 30);
  assert.equal(state.sides.enemy.flags.revived, true);
  assert.equal(state.winner, null);

  state = take(state, { type: "rest" });
  state = take(state, { type: "attack", attackIndex: 0 });
  assert.equal(state.sides.enemy.hp, 0);
  assert.equal(state.winner, "player");
});

test("nullify_passive는 부활 같은 이로운 특성만 막고 coin_miss 불이익은 남긴다", () => {
  const odysseus = card({
    id: "odysseus",
    passive: { name: "아무도아니", fx: "nullify_passive" },
    attacks: [{ name: "찌르기", cost: 1, dmg: 100, fx: null }],
  });
  const cinderella = card({
    id: "cinderella",
    hp: 60,
    passive: { name: "유리 구두", fx: "revive_half_once" },
  });
  let state = Engine.createGame(odysseus, cinderella);
  state = take(state, { type: "attack", attackIndex: 0 });

  assert.equal(state.winner, "player");
  assert.equal(state.events.some((event) => event.type === "revive"), false);

  const polyphemus = card({
    id: "polyphemus",
    passive: { name: "외눈", fx: "coin_miss" },
    attacks: [{ name: "바위", cost: 1, dmg: 80, fx: null }],
  });
  state = Engine.createGame(polyphemus, odysseus);
  state = take(state, { type: "attack", attackIndex: 0 }, tails);
  assert.equal(state.sides.enemy.hp, 100);
  assert.ok(state.events.some((event) => event.type === "attack_missed"));
});

test("coin_miss와 coin_evade는 주입된 RNG로 재현 가능하다", () => {
  const cyclops = card({
    id: "cyclops",
    passive: { name: "외눈", fx: "coin_miss" },
    attacks: [{ name: "바위", cost: 1, dmg: 30, fx: null }],
  });
  let state = Engine.createGame(cyclops, card({ id: "plain" }));
  state = take(state, { type: "attack", attackIndex: 0 }, tails);
  assert.equal(state.sides.enemy.hp, 100);

  const archer = card({ id: "archer" });
  const dodger = card({
    id: "dodger",
    passive: { name: "회피", fx: "coin_evade" },
  });
  state = Engine.createGame(archer, dodger);
  state = take(state, { type: "attack", attackIndex: 0 }, heads);
  assert.equal(state.sides.enemy.hp, 100);
  assert.ok(state.events.some((event) => event.type === "attack_evaded"));
});

test("데미지 감소와 첫 공격 무효를 적용한다", () => {
  const attacker = card({
    id: "attacker",
    attacks: [{ name: "타격", cost: 1, dmg: 30, fx: null }],
  });
  const wall = card({
    id: "wall",
    passive: { name: "벽돌집", fx: "reduce_dmg_10" },
  });
  let state = Engine.createGame(attacker, wall);
  state = take(state, { type: "attack", attackIndex: 0 });
  assert.equal(state.sides.enemy.hp, 80);

  const shield = card({
    id: "shield",
    passive: { name: "첫 방 무효", fx: "first_hit_zero" },
  });
  state = Engine.createGame(attacker, shield);
  state = take(state, { type: "attack", attackIndex: 0 });
  assert.equal(state.sides.enemy.hp, 100);
  assert.equal(state.sides.enemy.flags.firstHitUsed, true);
});

test("reduce_dmg_20_monster는 괴물 공격에만 20 감소를 적용한다", () => {
  const redhood = card({
    id: "redhood",
    passive: { name: "가짜 할머니 간파", fx: "reduce_dmg_20_monster" },
  });
  const monster = card({
    id: "monster",
    type: "monster",
    attacks: [{ name: "괴물 공격", cost: 1, dmg: 30, fx: null }],
  });
  let state = Engine.createGame(monster, redhood);
  state = take(state, { type: "attack", attackIndex: 0 });
  assert.equal(state.sides.enemy.hp, 90);

  const brave = card({
    id: "brave",
    type: "brave",
    attacks: [{ name: "용기 공격", cost: 1, dmg: 30, fx: null }],
  });
  state = Engine.createGame(brave, redhood);
  state = take(state, { type: "attack", attackIndex: 0 });
  assert.equal(state.sides.enemy.hp, 70);
});

test("절반 공격은 10단위로 내리되 최소 10, 누적 공격은 사용마다 10 증가한다", () => {
  const tortoise = card({
    id: "tortoise",
    attacks: [{ name: "절반", cost: 1, dmg: 0, fx: "dmg_half_enemy_hp" }],
  });
  let state = Engine.createGame(tortoise, card({ id: "odd", hp: 70 }));
  state = take(state, { type: "attack", attackIndex: 0 });
  assert.equal(state.sides.enemy.hp, 40);

  const pinocchio = card({
    id: "pinocchio",
    attacks: [{ name: "코", cost: 1, dmg: 10, fx: "dmg_stack_10" }],
  });
  state = Engine.createGame(pinocchio, card({ id: "target", hp: 100 }));
  state = take(state, { type: "attack", attackIndex: 0 });
  state = take(state, { type: "rest" });
  state = take(state, { type: "attack", attackIndex: 0 });
  assert.equal(state.sides.enemy.hp, 70);
});

test("skip은 상대 턴의 별을 지급한 뒤 자동으로 건너뛴다", () => {
  const freezer = card({
    id: "freezer",
    attacks: [{ name: "얼리기", cost: 1, dmg: 10, fx: "skip_next_enemy" }],
  });
  let state = Engine.createGame(freezer, card({ id: "target" }));
  state = take(state, { type: "attack", attackIndex: 0 });

  assert.equal(state.turn, "player");
  assert.equal(state.sides.enemy.stars, 1);
  assert.equal(state.sides.enemy.status.skipTurns, 0);
  assert.ok(state.events.some((event) => event.type === "turn_skipped"));
});

test("별 획득·별 훔치기·회복은 최대치를 지킨다", () => {
  const utility = card({
    id: "utility",
    hp: 100,
    attacks: [
      { name: "별 얻기", cost: 1, dmg: 0, fx: "gain_star_1" },
      { name: "별 훔치기", cost: 1, dmg: 0, fx: "steal_star_1" },
      { name: "회복", cost: 1, dmg: 0, fx: "heal_40" },
    ],
  });
  let state = Engine.createGame(utility, card({ id: "target" }));
  state = take(state, { type: "attack", attackIndex: 0 });
  assert.equal(state.sides.player.stars, 1);

  state = take(state, { type: "rest" });
  state.sides.enemy.stars = 2;
  state = take(state, { type: "attack", attackIndex: 1 });
  assert.equal(state.sides.player.stars, 2);
  assert.equal(state.sides.enemy.stars, 2, "상대 턴 시작 +1 뒤 한 개를 훔친 결과");

  state = take(state, { type: "rest" });
  state.sides.player.hp = 70;
  state = take(state, { type: "attack", attackIndex: 2 });
  assert.equal(state.sides.player.hp, 100);
});

test("wish_limit_3은 사용한 기술이 세 번이면 이후 공격을 막는다", () => {
  const genie = card({
    id: "genie",
    passive: { name: "세 가지 소원", fx: "wish_limit_3" },
    attacks: [{ name: "소원", cost: 1, dmg: 10, fx: null }],
  });
  let state = Engine.createGame(genie, card({ id: "target", hp: 100 }));

  for (let i = 0; i < 3; i += 1) {
    state = take(state, { type: "attack", attackIndex: 0 });
    state = take(state, { type: "rest" });
  }

  assert.equal(state.sides.player.wishUses, 3);
  assert.deepEqual(Engine.getAvailableActions(state), [{ type: "rest" }]);
});

test("AI는 큰 기술이 가치 있으면 쉬면서 별을 저금한 뒤 사용한다", () => {
  const dummy = card({
    id: "dummy",
    attacks: [{ name: "무해", cost: 1, dmg: 0, fx: null }],
  });
  const odysseus = card({
    id: "odysseus",
    attacks: [
      { name: "꾀돌이 찌르기", cost: 1, dmg: 20, fx: null },
      { name: "트로이 목마", cost: 3, dmg: 60, fx: null },
    ],
  });
  let state = Engine.createGame(dummy, odysseus);

  state = take(state, { type: "rest" });
  assert.deepEqual(Engine.chooseAiAction(state), { type: "rest" });
  state = take(state, Engine.chooseAiAction(state));

  state = take(state, { type: "rest" });
  assert.deepEqual(Engine.chooseAiAction(state), { type: "rest" });
  state = take(state, Engine.chooseAiAction(state));

  state = take(state, { type: "rest" });
  assert.deepEqual(Engine.chooseAiAction(state), {
    type: "attack",
    attackIndex: 1,
  });
});

test("AI는 RNG가 주어지면 30% 확률 구간에서 두 번째 좋은 수를 둔다", () => {
  const dummy = card({
    id: "dummy",
    attacks: [{ name: "쉬운 공격", cost: 1, dmg: 10, fx: null }],
  });
  const twoMoves = card({
    id: "two-moves",
    attacks: [
      { name: "가장 좋은 수", cost: 1, dmg: 30, fx: null },
      { name: "두 번째 수", cost: 1, dmg: 20, fx: null },
    ],
  });
  let state = Engine.createGame(dummy, twoMoves);
  state = take(state, { type: "rest" });

  assert.deepEqual(Engine.chooseAiAction(state, heads), {
    type: "attack",
    attackIndex: 1,
  });
  assert.deepEqual(Engine.chooseAiAction(state, tails), {
    type: "attack",
    attackIndex: 0,
  });
});

test("기존 대표 6장은 v1 기술과 PNG·WebP 원화를 모두 갖춘다", () => {
  const featured = [
    "cinderella", "fairygodmother", "odysseus",
    "polyphemus", "redhood", "jack",
  ];
  const data = JSON.parse(
    fs.readFileSync(path.join(__dirname, "..", "cards.json"), "utf8")
  );

  featured.forEach((id) => {
    const item = data.cards.find((entry) => entry.id === id);
    assert.ok(item, id + " 카드 데이터가 있어야 한다");
    assert.notEqual(item.v1, false, id + " 카드는 v1 풀에 들어가야 한다");
    assert.ok(
      item.attacks.some((attack) => attack.v1 !== false && !(attack.fx || "").startsWith("v2_")),
      id + " 카드에는 완전한 v1 기술이 있어야 한다"
    );
    assert.ok(fs.existsSync(path.join(__dirname, "..", "art", id + ".png")));
    assert.ok(fs.existsSync(path.join(__dirname, "..", "art", id + ".webp")));
  });
});

test("24장 전체 원화·프롬프트·크롭 매핑이 완전하고 1024×1536이다", () => {
  const cardsRoot = path.join(__dirname, "..");
  const data = JSON.parse(
    fs.readFileSync(path.join(cardsRoot, "cards.json"), "utf8")
  );
  const promptSource = fs.readFileSync(
    path.join(cardsRoot, "IMAGE_PROMPTS.md"),
    "utf8"
  );
  const cardViewSource = fs.readFileSync(
    path.join(cardsRoot, "js", "card-view.js"),
    "utf8"
  );
  const context = { window: {} };
  context.globalThis = context;
  vm.runInNewContext(cardViewSource, context);

  const ids = data.cards.map((item) => item.id).sort();
  const cropRows = Array.from(
    promptSource.matchAll(/^\| ([a-z0-9]+) \| `\d+% \d+%` \|$/gm),
    (match) => match[1]
  ).sort();

  data.cards.forEach((item) => {
    const png = path.join(cardsRoot, "art", item.id + ".png");
    const webp = path.join(cardsRoot, "art", item.id + ".webp");
    assert.deepEqual(pngMetadata(png), {
      width: 1024,
      height: 1536,
      colorType: 2,
    });
    assert.deepEqual(webpSize(webp), { width: 1024, height: 1536 });
    assert.ok(
      promptSource.includes("- `" + item.id + ".png`:"),
      item.id + " 카드별 장면 프롬프트가 있어야 한다"
    );
  });

  assert.deepEqual(cropRows, ids, "프롬프트 문서의 크롭 행은 24장과 일치해야 한다");
  assert.deepEqual(
    Object.keys(context.window.CardView.artPosition).sort(),
    ids,
    "렌더러의 크롭 매핑은 24장과 일치해야 한다"
  );
});

test("컬렉션 해금 경제는 24장 전체를 노출하고 이야기 극장과 짝이 맞는다", () => {
  const data = JSON.parse(
    fs.readFileSync(path.join(__dirname, "..", "cards.json"), "utf8")
  );
  const byId = new Map(data.cards.map((item) => [item.id, item]));

  assert.equal(new Set(data.collection).size, 24);
  assert.deepEqual(
    [...data.collection].sort(),
    data.cards.map((item) => item.id).sort(),
    "모든 카드가 컬렉션에 노출되어야 한다"
  );
  assert.deepEqual(
    data.collection.filter((id) => byId.get(id).unlock === null).sort(),
    ["jack", "redhood"],
    "기존 기본 지급 2장은 그대로 유지한다"
  );

  ["threepigs", "tortoisehare", "wolf"].forEach((id) => {
    const item = byId.get(id);
    assert.equal(
      Engine.isBattleCard(item),
      true,
      id + " 카드는 v1에서 바로 대전 가능해야 한다"
    );
  });

  const giant = byId.get("beanstalkgiant");
  assert.equal(giant.unlock, "jack_story");
  assert.equal(giant.v1, false, "콩나무 거인은 해금·수집만 가능해야 한다");
  assert.equal(Engine.isBattleCard(giant), false);
});

test("페르세우스 설명과 실제 v1 대전 상대 풀이 레어도 ±1 계약을 지킨다", () => {
  const data = JSON.parse(
    fs.readFileSync(path.join(__dirname, "..", "cards.json"), "utf8")
  );
  const perseus = data.cards.find((entry) => entry.id === "perseus");

  assert.equal(perseus.passive.desc, "약점 ×2를 받지 않는다");

  const featuredCards = data.collection
    .map((id) => data.cards.find((entry) => entry.id === id))
    .filter(Engine.isBattleCard);
  assert.equal(featuredCards.length, 19, "v1:false 5장을 뺀 전원이 대전 가능해야 한다");
  assert.ok(!featuredCards.some((item) => item.id === "beanstalkgiant"));

  featuredCards.forEach((player) => {
    const balancedOpponents = Engine.getBalancedEnemyPool(featuredCards, player);
    assert.ok(balancedOpponents.length > 0);
    assert.ok(
      balancedOpponents.every(
        (enemy) =>
          enemy.id !== player.id &&
          Math.abs(enemy.rarity - player.rarity) <= 1
      ),
      player.id + " 상대는 모두 레어도 ±1 범위여야 한다"
    );
  });

  const isolated = { id: "isolated", rarity: 4 };
  assert.deepEqual(
    Engine.getBalancedEnemyPool([isolated], isolated),
    [isolated],
    "범위 내 다른 카드가 없으면 높은 레어도 차이 대신 미러전을 사용한다"
  );
});

test("브라우저 스크립트 실행 시 window.CardEngine을 노출한다", () => {
  const source = fs.readFileSync(
    path.join(__dirname, "..", "js", "engine.js"),
    "utf8"
  );
  const context = { window: {} };
  context.globalThis = context;
  vm.runInNewContext(source, context);

  assert.equal(typeof context.window.CardEngine.createGame, "function");
  assert.equal(typeof context.window.CardEngine.performAction, "function");
  assert.equal(typeof context.window.CardEngine.isAttackSupported, "function");
  assert.equal(typeof context.window.CardEngine.isBattleCard, "function");
});
