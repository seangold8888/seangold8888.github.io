"use strict";

const test = require("node:test");
const fs = require("node:fs");
const path = require("node:path");
const assert = require("node:assert/strict");
const Engine = require("../js/engine.js");

let cardSerial = 0;

function card(overrides = {}) {
  cardSerial += 1;
  const has = (key) => Object.prototype.hasOwnProperty.call(overrides, key);
  return {
    id: overrides.id || "strategy-card-" + cardSerial,
    name: overrides.name || "전략 시험 카드",
    type: overrides.type || "monster",
    hp: has("hp") ? overrides.hp : 100,
    passive: has("passive") ? overrides.passive : null,
    attacks: has("attacks")
      ? overrides.attacks
      : [{ name: "기본 공격", cost: 1, dmg: 20, fx: null }],
  };
}

function attack(name, damage, cost = 1) {
  return { name, cost, dmg: damage, fx: null };
}

function fragment(id, type, amount = 1) {
  return {
    id,
    name: "시험 조각 " + id,
    emoji: "✨",
    effect: { type, amount },
  };
}

function take(state, action, rng) {
  return Engine.performAction(state, action, rng);
}

function answer(state, choiceId, correct) {
  return take(state, {
    type: "story_gate_answer",
    gateId: "test-gate",
    storyId: "test-story",
    choiceId,
    correct,
  });
}

function eventOf(state, type) {
  return state.events.find((event) => event.type === type);
}

function prepareEnemyTurn(player, enemy) {
  return take(Engine.createGame(player, enemy), { type: "rest" });
}

test("방어 태세는 별 1개와 턴을 쓰고 40 피해를 20으로 줄인다", () => {
  const defender = card({ id: "guard-40-defender" });
  const striker = card({
    id: "guard-40-striker",
    attacks: [attack("40 강타", 40)],
  });
  let state = Engine.createGame(defender, striker);

  state = take(state, { type: "guard" });

  assert.equal(state.turn, "enemy", "방어는 행동 후 즉시 턴을 끝내야 한다");
  assert.equal(state.sides.player.stars, 0);
  assert.equal(state.sides.player.status.guardReduction, 20);
  assert.equal(eventOf(state, "guard").cost, 1);

  state = take(state, { type: "attack", attackIndex: 0 });
  const hit = eventOf(state, "damage");

  assert.equal(hit.amount, 20);
  assert.equal(hit.guarded, true);
  assert.equal(hit.guardReducedBy, 20);
  assert.equal(state.sides.player.hp, 80);
  assert.equal(state.sides.player.status.guardReduction, 0);
  assert.equal(eventOf(state, "guard_block").remaining, 20);
});

test("방어 태세는 20 피해도 최소 10은 남긴다", () => {
  const defender = card({ id: "guard-min-defender" });
  const striker = card({
    id: "guard-min-striker",
    attacks: [attack("20 타격", 20)],
  });
  let state = Engine.createGame(defender, striker);

  state = take(state, { type: "guard" });
  state = take(state, { type: "attack", attackIndex: 0 });
  const hit = eventOf(state, "damage");

  assert.equal(hit.amount, 10);
  assert.equal(hit.guardReducedBy, 10);
  assert.equal(state.sides.player.hp, 90);
  assert.equal(state.sides.player.status.guardReduction, 0);
});

test("상대가 공격하지 않으면 방어 태세는 다음 내 턴 시작에 만료된다", () => {
  let state = Engine.createGame(
    card({ id: "guard-expiry-defender" }),
    card({ id: "guard-expiry-enemy" })
  );

  state = take(state, { type: "guard" });
  state = take(state, { type: "rest" });

  assert.equal(state.turn, "player");
  assert.equal(state.sides.player.hp, 100);
  assert.equal(state.sides.player.status.guardReduction, 0);
  assert.equal(eventOf(state, "guard_expired").amount, 20);
  assert.equal(eventOf(state, "guard_block"), undefined);
});

test("방어는 바로 다음 내 턴에 재사용할 수 없고 그다음 내 턴에 준비된다", () => {
  let state = Engine.createGame(
    card({ id: "guard-cooldown-defender" }),
    card({ id: "guard-cooldown-enemy" })
  );

  state = take(state, { type: "guard" });
  state = take(state, { type: "rest" });

  assert.equal(state.turn, "player");
  assert.equal(
    Engine.getAvailableActions(state).some((action) => action.type === "guard"),
    false,
    "바로 다음 내 턴에는 방어를 반복할 수 없어야 한다"
  );

  state = take(state, { type: "rest" });
  state = take(state, { type: "rest" });

  assert.equal(state.turn, "player");
  assert.equal(
    Engine.getAvailableActions(state).some((action) => action.type === "guard"),
    true,
    "한 차례 재정비 뒤에는 방어를 다시 쓸 수 있어야 한다"
  );
});

test("방어는 실제로 피해를 줄였을 때만 소비되고 최소 피해·선행 방어를 넘지 않는다", async (t) => {
  await t.test("이미 10인 피해에는 쓰이지 않고 만료된다", () => {
    const striker = card({
      id: "guard-ten-striker",
      attacks: [attack("10 타격", 10)],
    });
    let state = Engine.createGame(card({ id: "guard-ten-defender" }), striker);

    state = take(state, { type: "guard" });
    state = take(state, { type: "attack", attackIndex: 0 });
    const hit = eventOf(state, "damage");

    assert.equal(hit.amount, 10);
    assert.equal(hit.guardReducedBy, 0);
    assert.equal(eventOf(state, "guard_block"), undefined);
    assert.equal(eventOf(state, "guard_expired").amount, 20);
  });

  await t.test("첫 피격 무효가 방어보다 먼저 적용된다", () => {
    const defender = card({
      id: "guard-first-hit-defender",
      passive: { name: "첫 방 무효", fx: "first_hit_zero" },
    });
    const striker = card({
      id: "guard-first-hit-striker",
      attacks: [attack("강타", 40)],
    });
    let state = Engine.createGame(defender, striker);

    state = take(state, { type: "guard" });
    state = take(state, { type: "attack", attackIndex: 0 });
    const hit = eventOf(state, "damage");

    assert.equal(hit.amount, 0);
    assert.equal(hit.firstHitBlocked, true);
    assert.equal(hit.guardReducedBy, 0);
    assert.equal(eventOf(state, "guard_block"), undefined);
    assert.equal(eventOf(state, "guard_expired").amount, 20);
  });

  await t.test("조각의 1회 완전 방어가 방어 태세보다 먼저 적용된다", () => {
    const defender = card({
      id: "guard-fragment-defender",
      attacks: [attack("준비", 0)],
    });
    const striker = card({
      id: "guard-fragment-striker",
      attacks: [attack("강타", 40)],
    });
    let state = Engine.createGame(defender, striker, {
      playerFragments: [fragment("glass-shield", "guard_zero")],
    });

    state = take(state, { type: "fragment", fragmentIndex: 0 });
    state = take(state, { type: "attack", attackIndex: 0 });
    state = take(state, { type: "rest" });
    state = take(state, { type: "guard" });
    state = take(state, { type: "attack", attackIndex: 0 });
    const hit = eventOf(state, "damage");

    assert.equal(hit.amount, 0);
    assert.equal(hit.fragmentGuarded, true);
    assert.equal(hit.guardReducedBy, 0);
    assert.equal(eventOf(state, "fragment_guard").actor, "player");
    assert.equal(eventOf(state, "guard_block"), undefined);
    assert.equal(eventOf(state, "guard_expired").amount, 20);
  });
});

test("첫 오답은 같은 턴 재답변을 막고 다음 내 턴에는 정답을 허용한다", () => {
  let state = Engine.createGame(
    card({ id: "gate-retry-player" }),
    card({ id: "gate-retry-enemy" })
  );

  state = answer(state, "wrong-a", false);
  assert.equal(state.turn, "player");
  assert.equal(state.sides.player.flags.ultimateAttempts, 1);
  assert.equal(state.sides.player.flags.ultimateRetryTurn, 3);
  assert.equal(eventOf(state, "story_gate_answer").attemptsLeft, 1);

  const blocked = answer(state, "correct-b", true);
  assert.equal(eventOf(blocked, "invalid_action").type, "invalid_action");
  assert.equal(blocked.sides.player.flags.ultimateAttempts, 1);
  assert.equal(blocked.sides.player.flags.ultimateUnlocked, false);

  state = take(blocked, { type: "rest" });
  state = take(state, { type: "rest" });
  assert.equal(state.turn, "player");
  assert.equal(state.turnNumber, 3);

  const before = {
    turn: state.turn,
    turnNumber: state.turnNumber,
    stars: state.sides.player.stars,
    playerHp: state.sides.player.hp,
    enemyHp: state.sides.enemy.hp,
  };
  state = answer(state, "correct-b", true);

  assert.equal(state.sides.player.flags.ultimateUnlocked, true);
  assert.equal(state.sides.player.flags.ultimateAttempts, 2);
  assert.ok(eventOf(state, "ultimate_unlocked"));
  assert.deepEqual(
    {
      turn: state.turn,
      turnNumber: state.turnNumber,
      stars: state.sides.player.stars,
      playerHp: state.sides.player.hp,
      enemyHp: state.sides.enemy.hp,
    },
    before,
    "정답은 턴·별·HP를 소비하지 않아야 한다"
  );
});

test("서로 다른 오답 두 번이면 그 판의 이야기 관문이 닫힌다", () => {
  let state = Engine.createGame(
    card({ id: "gate-fail-player" }),
    card({ id: "gate-fail-enemy" })
  );

  state = answer(state, "wrong-a", false);
  state = take(state, { type: "rest" });
  state = take(state, { type: "rest" });
  state = answer(state, "wrong-b", false);

  assert.equal(state.sides.player.flags.ultimateAttempts, 2);
  assert.equal(state.sides.player.flags.ultimateFailed, true);
  assert.equal(state.sides.player.flags.ultimateUnlocked, false);
  assert.ok(eventOf(state, "story_gate_failed"));

  const closed = answer(state, "correct-c", true);
  assert.equal(eventOf(closed, "invalid_action").type, "invalid_action");
  assert.equal(closed.sides.player.flags.ultimateAttempts, 2);
  closed.sides.player.stars = 5;
  assert.equal(
    Engine.getAvailableActions(closed).some((action) => action.type === "ultimate"),
    false
  );
});

test("필살기는 별 3개로 약점 배율 없는 중립 50 피해를 주고 판당 한 번만 쓴다", () => {
  const magic = card({
    id: "ultimate-magic",
    type: "magic",
    attacks: [attack("작은 마법", 10)],
  });
  const wise = card({ id: "ultimate-wise", type: "wise", hp: 150 });
  let state = Engine.createGame(magic, wise);
  state = answer(state, "correct", true);
  state.sides.player.stars = 3;

  state = take(state, { type: "ultimate" });
  const hit = eventOf(state, "damage");

  assert.equal(state.sides.player.stars, 0);
  assert.equal(state.sides.player.flags.ultimateUsed, true);
  assert.equal(state.sides.enemy.hp, 100);
  assert.equal(hit.amount, 50);
  assert.equal(hit.weakness, false, "마법→지혜 상성도 필살기에는 배율을 주지 않는다");
  assert.equal(hit.ultimate, true);
  assert.equal(eventOf(state, "ultimate_used").cost, 3);

  state = take(state, { type: "rest" });
  state.sides.player.stars = 3;
  const hpBeforeRetry = state.sides.enemy.hp;
  state = take(state, { type: "ultimate" });

  assert.equal(eventOf(state, "invalid_action").type, "invalid_action");
  assert.equal(state.sides.enemy.hp, hpBeforeRetry);
  assert.equal(state.sides.player.stars, 3);
});

test("필살기는 coin_miss와 coin_evade 판정을 건너뛰고 확정 명중한다", () => {
  const unlucky = card({
    id: "ultimate-coin-miss",
    passive: { name: "외눈", fx: "coin_miss" },
  });
  const dodger = card({
    id: "ultimate-coin-evade",
    passive: { name: "회피", fx: "coin_evade" },
  });
  let state = Engine.createGame(unlucky, dodger);
  state = answer(state, "correct", true);
  state.sides.player.stars = 3;
  let rngCalls = 0;

  state = take(state, { type: "ultimate" }, () => {
    rngCalls += 1;
    return 0.9;
  });

  assert.equal(rngCalls, 0);
  assert.equal(state.sides.enemy.hp, 50);
  assert.equal(eventOf(state, "damage").amount, 50);
  assert.equal(state.events.some((event) => event.type === "coin"), false);
  assert.equal(state.events.some((event) => event.type === "attack_missed"), false);
  assert.equal(state.events.some((event) => event.type === "attack_evaded"), false);
});

test("필살기도 상대의 방어 태세를 존중한다", () => {
  let state = Engine.createGame(
    card({ id: "ultimate-guard-player" }),
    card({ id: "ultimate-guard-enemy" })
  );
  state = answer(state, "correct", true);
  state.sides.player.stars = 3;

  state = take(state, { type: "rest" });
  state = take(state, { type: "guard" });
  state = take(state, { type: "ultimate" });
  const hit = eventOf(state, "damage");

  assert.equal(hit.amount, 30);
  assert.equal(hit.guarded, true);
  assert.equal(hit.guardReducedBy, 20);
  assert.equal(state.sides.enemy.hp, 70);
  assert.equal(state.sides.enemy.status.guardReduction, 0);
  assert.equal(eventOf(state, "guard_block").remaining, 30);
});

test("AI는 방어해야만 다음 치명타를 버틸 수 있으면 방어를 고른다", () => {
  const lethalThreat = card({
    id: "ai-guard-threat",
    attacks: [attack("예고된 40 피해", 40)],
  });
  const fragileAi = card({
    id: "ai-guard-survivor",
    hp: 30,
    attacks: [attack("무해한 행동", 0)],
  });
  const state = prepareEnemyTurn(lethalThreat, fragileAi);

  assert.deepEqual(Engine.chooseAiAction(state), { type: "guard" });

  const guarded = take(state, Engine.chooseAiAction(state));
  assert.equal(guarded.turn, "player");
  assert.equal(guarded.sides.enemy.stars, 0);
  assert.equal(guarded.sides.enemy.status.guardReduction, 20);
});

test("previewAiIntent는 예고와 함께 그대로 실행할 예약 행동을 반환한다", () => {
  const lethalThreat = card({
    id: "intent-threat",
    attacks: [attack("예고된 40 피해", 40)],
  });
  const fragileAi = card({
    id: "intent-survivor",
    hp: 30,
    attacks: [attack("무해한 행동", 0)],
  });
  const state = prepareEnemyTurn(lethalThreat, fragileAi);
  const intent = Engine.previewAiIntent(state, "enemy");

  assert.equal(intent.type, "guard");
  assert.deepEqual(intent.action, { type: "guard" });
  assert.equal(intent.cost, 1);
  assert.equal(intent.danger, "guard");

  const committed = take(state, intent.action);
  assert.equal(eventOf(committed, "guard").actor, "enemy");
  assert.equal(committed.sides.enemy.status.guardReduction, 20);
});

test("피노키오 AI는 안전할 때 방어 10의 저체력 상대에게 누적 공격을 준비한다", async (t) => {
  const defendedTarget = card({
    id: "stack-setup-target",
    hp: 100,
    passive: { name: "단단한 방어", fx: "reduce_dmg_10" },
    attacks: [attack("10 피해 반격", 10)],
  });
  const pinocchio = card({
    id: "stack-setup-pinocchio",
    hp: 100,
    attacks: [
      { name: "길어지는 코 찌르기", cost: 1, dmg: 10, fx: "dmg_stack_10" },
      { name: "참새 친구 부르기", cost: 2, dmg: 0, fx: "heal_40" },
    ],
  });

  function setup(aiHp) {
    const state = prepareEnemyTurn(defendedTarget, pinocchio);
    state.sides.player.hp = 10;
    state.sides.enemy.hp = aiHp;
    state.sides.enemy.stars = 2;
    return state;
  }

  await t.test("다음 예상 피해보다 HP가 크면 0 피해라도 스택을 쌓아 끝낸다", () => {
    let state = setup(20);

    assert.deepEqual(Engine.chooseAiAction(state), {
      type: "attack",
      attackIndex: 0,
    });
    state = take(state, { type: "attack", attackIndex: 0 });
    assert.equal(state.sides.player.hp, 10, "첫 코 공격은 방어 10에 막힌다");
    assert.equal(state.sides.enemy.attackUses[0], 1, "막혀도 다음 코 피해는 누적된다");

    state = take(state, { type: "attack", attackIndex: 0 });
    assert.equal(state.sides.enemy.hp, 10);
    assert.deepEqual(Engine.chooseAiAction(state), {
      type: "attack",
      attackIndex: 0,
    });

    state = take(state, { type: "attack", attackIndex: 0 });
    assert.equal(state.winner, "enemy");
    assert.equal(state.sides.player.hp, 0);
  });

  await t.test("현재 HP가 다음 예상 피해 이하면 기존 생존 회복을 우선한다", () => {
    const state = setup(10);

    assert.deepEqual(Engine.chooseAiAction(state), {
      type: "attack",
      attackIndex: 1,
    });
  });
});

test("v1의 모든 허용 매치업은 방어·이야기 필살기 전략으로 120행동 안에 끝난다", () => {
  const data = JSON.parse(
    fs.readFileSync(path.join(__dirname, "..", "cards.json"), "utf8")
  );
  const collection = new Map(data.cards.map((item) => [item.id, item]));
  const playable = data.collection
    .map((id) => collection.get(id))
    .filter((item) => item && Engine.isBattleCard(item));
  const rng = () => 0.49;
  let matchups = 0;

  playable.forEach((player) => {
    const opponents = Engine.getBalancedEnemyPool(playable, player);
    opponents.forEach((enemy) => {
      let state = Engine.createGame(player, enemy);
      state.sides.player.flags.ultimateUnlocked = true;
      let actions = 0;
      while (!state.winner && actions < 120) {
        let action;
        if (state.turn === "player" && !state.sides.player.flags.ultimateUsed) {
          const available = Engine.getAvailableActions(state);
          const ultimate = available.find((candidate) => candidate.type === "ultimate");
          const guard = available.find((candidate) => candidate.type === "guard");
          const threat = Engine.estimateIncomingThreat(state, "player");
          if (ultimate && state.sides.enemy.status.guardReduction > 0) {
            action = available.find((candidate) =>
              candidate.type === "attack" &&
              Number.isInteger(candidate.attackIndex) &&
              Number(state.sides.player.card.attacks[candidate.attackIndex].dmg) > 10
            ) || { type: "rest" };
          } else if (ultimate) {
            action = ultimate;
          } else if (
            guard && threat.rawDamage >= state.sides.player.hp &&
            threat.guardedDamage < state.sides.player.hp
          ) {
            action = guard;
          } else {
            action = { type: "rest" };
          }
        } else {
          action = Engine.chooseAiAction(state, rng) || { type: "rest" };
        }
        state = Engine.performAction(state, action, rng);
        assert.equal(
          state.events.some((event) => event.type === "invalid_action"),
          false,
          player.id + " vs " + enemy.id + " produced an invalid AI action"
        );
        actions += 1;
      }
      assert.ok(state.winner, player.id + " vs " + enemy.id + " stalled");
      matchups += 1;
    });
  });

  assert.ok(matchups >= playable.length, "each playable card needs an opponent");
});
