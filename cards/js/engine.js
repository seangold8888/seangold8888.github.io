(function (root, factory) {
  "use strict";

  var api = factory();

  if (typeof module === "object" && module.exports) {
    module.exports = api;
  }
  if (typeof window !== "undefined") {
    window.CardEngine = api;
  } else if (root) {
    root.CardEngine = api;
  }
})(typeof globalThis !== "undefined" ? globalThis : this, function () {
  "use strict";

  var MAX_STARS = 5;

  // 사용자 확정 상성: 용기 > 마법 > 지혜 > 용기.
  // 즉, 각 타입은 weakTo에 적힌 타입의 공격을 받으면 데미지가 두 배다.
  var TYPE_CHART = Object.freeze({
    brave: Object.freeze({ weakTo: "wise" }),
    wise: Object.freeze({ weakTo: "magic" }),
    magic: Object.freeze({ weakTo: "brave" }),
    monster: Object.freeze({ weakTo: null }),
  });

  var DRAWBACK_PASSIVES = Object.freeze({
    coin_miss: true,
    self_hurt_10_eot: true,
    wish_limit_3: true,
  });

  var SUPPORTED_ATTACK_FX = Object.freeze({
    "": true,
    dmg_half_enemy_hp: true,
    dmg_stack_10: true,
    skip_next_enemy: true,
    coin_skip_next_enemy: true,
    gain_star_1: true,
    steal_star_1: true,
    heal_40: true,
    weaken_next_20: true,
    gold_freeze_gain_star: true,
  });

  function clone(value) {
    return JSON.parse(JSON.stringify(value));
  }

  function other(actor) {
    return actor === "player" ? "enemy" : "player";
  }

  function getBalancedEnemyPool(allCards, selectedCard) {
    var source = Array.isArray(allCards) ? allCards.filter(Boolean) : [];
    if (!selectedCard) return source.slice();

    var selectedRarity = Number(selectedCard.rarity);
    if (!Number.isFinite(selectedRarity)) selectedRarity = 1;
    var balanced = source.filter(function (card) {
      var rarity = Number(card.rarity);
      if (!Number.isFinite(rarity)) rarity = 1;
      return card.id !== selectedCard.id &&
        Math.abs(rarity - selectedRarity) <= 1;
    });

    // 높은 레어도 상대를 강제로 섞지 않는다. 유효 후보가 하나뿐인
    // 미래의 카드 풀에서는 같은 카드와 미러전을 만들어 ±1 계약을 지킨다.
    return balanced.length ? balanced : [selectedCard];
  }

  function sideOf(state, actor) {
    return state.sides[actor];
  }

  function emit(state, event) {
    var entry = Object.assign({ turnNumber: state.turnNumber }, event);
    state.events.push(entry);
    state.log.push(entry);
    return entry;
  }

  function normaliseCard(card) {
    if (!card || typeof card !== "object") {
      throw new TypeError("카드 데이터가 필요합니다.");
    }
    if (!card.id || !card.name) {
      throw new TypeError("카드에는 id와 name이 필요합니다.");
    }
    if (!Number.isFinite(Number(card.hp)) || Number(card.hp) <= 0) {
      throw new TypeError("카드 HP는 0보다 큰 숫자여야 합니다.");
    }

    var copy = clone(card);
    copy.hp = Number(copy.hp);
    copy.attacks = Array.isArray(copy.attacks) ? copy.attacks : [];
    return copy;
  }

  function makeSide(actor, card) {
    var safeCard = normaliseCard(card);
    return {
      actor: actor,
      card: safeCard,
      hp: safeCard.hp,
      maxHp: safeCard.hp,
      stars: 0,
      attackUses: {},
      wishUses: 0,
      flags: {
        revived: false,
        firstHitUsed: false,
      },
      status: {
        skipTurns: 0,
        weakenNext: 0,
      },
    };
  }

  function createGame(playerCard, enemyCard, rng) {
    // rng는 API 호환을 위해 받는다. 첫 공격자는 항상 플레이어이며,
    // 실제 동전 결과는 performAction의 rng로 주입한다.
    void rng;

    var state = {
      version: 1,
      turn: "player",
      turnNumber: 0,
      phase: "turn_start",
      winner: null,
      sides: {
        player: makeSide("player", playerCard),
        enemy: makeSide("enemy", enemyCard),
      },
      events: [],
      log: [],
    };

    beginTurnMutable(state);
    return state;
  }

  function beginTurn(state) {
    var next = clone(state);
    if (next.winner || next.phase === "game_over") return next;
    if (next.phase !== "turn_start") return next;

    next.events = [];
    beginTurnMutable(next);
    return next;
  }

  function beginTurnMutable(state) {
    if (state.winner || state.phase === "game_over") return;

    var actor = state.turn;
    var side = sideOf(state, actor);
    state.turnNumber += 1;
    side.stars = Math.min(MAX_STARS, side.stars + 1);
    state.phase = "action";
    emit(state, {
      type: "turn_start",
      actor: actor,
      stars: side.stars,
    });

    if (side.status.skipTurns > 0) {
      side.status.skipTurns -= 1;
      emit(state, { type: "turn_skipped", actor: actor });
      applyEndOfTurn(state, actor);
      if (!state.winner) {
        state.turn = other(actor);
        state.phase = "turn_start";
        beginTurnMutable(state);
      }
    }
  }

  function passiveFx(state, actor) {
    var passive = sideOf(state, actor).card.passive;
    return passive && passive.fx ? passive.fx : null;
  }

  function isBeneficialPassive(fx) {
    return Boolean(fx && !DRAWBACK_PASSIVES[fx]);
  }

  function isPassiveActive(state, actor, expectedFx) {
    var fx = passiveFx(state, actor);
    if (!fx || (expectedFx && fx !== expectedFx)) return false;

    // 불리한 특성은 오디세우스가 지워서 상대를 강화하지 못한다.
    if (DRAWBACK_PASSIVES[fx]) return true;

    // 두 무효화 특성이 마주쳐 생기는 재귀/역설을 피한다.
    // nullify_passive 자체는 항상 켜져 있고, 서로의 다른 이로운 특성만 막는다.
    if (fx === "nullify_passive") return true;

    return passiveFx(state, other(actor)) !== "nullify_passive";
  }

  function isAttackSupported(attack) {
    if (!attack || attack.v1 === false) return false;
    var fx = attack.fx || "";
    if (fx.indexOf("v2_") === 0) return false;
    return Boolean(SUPPORTED_ATTACK_FX[fx]);
  }

  function isBattleCard(card) {
    return Boolean(card) && card.v1 !== false &&
      Array.isArray(card.attacks) && card.attacks.some(isAttackSupported);
  }

  function wishExhausted(state, actor) {
    return (
      isPassiveActive(state, actor, "wish_limit_3") &&
      sideOf(state, actor).wishUses >= 3
    );
  }

  function getAvailableActions(state) {
    if (!state || state.winner || state.phase !== "action") return [];

    var actor = state.turn;
    var side = sideOf(state, actor);
    var actions = [{ type: "rest" }];

    if (wishExhausted(state, actor)) return actions;

    side.card.attacks.forEach(function (attack, attackIndex) {
      var cost = Math.max(0, Number(attack.cost) || 0);
      if (!isAttackSupported(attack) || cost > side.stars) return;
      actions.push({
        type: "attack",
        attackIndex: attackIndex,
        cost: cost,
        name: attack.name || "기술",
      });
    });

    return actions;
  }

  function invalidAction(state, message) {
    emit(state, { type: "invalid_action", actor: state.turn, message: message });
    return state;
  }

  function randomNumber(rng) {
    var value = typeof rng === "function" ? Number(rng()) : Math.random();
    if (!Number.isFinite(value)) value = 0.5;
    value = value - Math.floor(value);
    return value;
  }

  function flipCoin(state, rng, actor, reason) {
    var heads = randomNumber(rng) < 0.5;
    emit(state, {
      type: "coin",
      actor: actor,
      reason: reason,
      result: heads ? "heads" : "tails",
    });
    return heads;
  }

  function attackTargetsEnemy(attack) {
    var fx = attack.fx || "";
    return (
      Number(attack.dmg) > 0 ||
      fx === "dmg_half_enemy_hp" ||
      fx === "dmg_stack_10" ||
      fx === "skip_next_enemy" ||
      fx === "coin_skip_next_enemy" ||
      fx === "weaken_next_20" ||
      fx === "gold_freeze_gain_star"
    );
  }

  function hasWeakness(state, attackerActor, defenderActor) {
    var attacker = sideOf(state, attackerActor);
    var defender = sideOf(state, defenderActor);
    if (isPassiveActive(state, defenderActor, "no_weakness")) return false;

    var chart = TYPE_CHART[defender.card.type] || { weakTo: null };
    var weakTo = Object.prototype.hasOwnProperty.call(defender.card, "weakTo")
      ? defender.card.weakTo
      : chart.weakTo;
    return Boolean(weakTo && weakTo === attacker.card.type);
  }

  function calculateDamage(
    state,
    attackerActor,
    defenderActor,
    attack,
    attackIndex,
    priorUsesOverride
  ) {
    var attacker = sideOf(state, attackerActor);
    var defender = sideOf(state, defenderActor);
    var fx = attack.fx || "";
    var damage = Math.max(0, Number(attack.dmg) || 0);
    var priorUses = Number.isFinite(priorUsesOverride)
      ? priorUsesOverride
      : Number(attacker.attackUses[attackIndex]) || 0;

    if (fx === "dmg_half_enemy_hp") {
      // 10 HP에서도 0 데미지로 영원히 끝나지 않는 상태를 막기 위해 최소 10.
      damage = defender.hp > 0
        ? Math.max(10, Math.floor(defender.hp / 20) * 10)
        : 0;
    } else if (fx === "dmg_stack_10") {
      damage += priorUses * 10;
    }

    if (
      isPassiveActive(state, attackerActor, "boost_20_below_half") &&
      attacker.hp <= attacker.maxHp / 2
    ) {
      damage += 20;
    }

    var weakenedBy = 0;
    if (damage > 0 && attacker.status.weakenNext > 0) {
      weakenedBy = attacker.status.weakenNext;
      damage = Math.max(0, damage - weakenedBy);
    }

    var weakness = damage > 0 && hasWeakness(state, attackerActor, defenderActor);
    if (weakness) damage *= 2;

    var reducedBy = 0;
    if (damage > 0 && isPassiveActive(state, defenderActor, "reduce_dmg_10")) {
      reducedBy = 10;
    } else if (
      damage > 0 &&
      isPassiveActive(state, defenderActor, "reduce_dmg_20_monster") &&
      attacker.card.type === "monster"
    ) {
      reducedBy = 20;
    }
    damage = Math.max(0, damage - reducedBy);

    var firstHitBlocked = false;
    if (
      damage > 0 &&
      isPassiveActive(state, defenderActor, "first_hit_zero") &&
      !defender.flags.firstHitUsed
    ) {
      firstHitBlocked = true;
      damage = 0;
    }

    return {
      damage: damage,
      weakness: weakness,
      reducedBy: reducedBy,
      weakenedBy: weakenedBy,
      firstHitBlocked: firstHitBlocked,
    };
  }

  function addStars(state, actor, amount, reason) {
    var side = sideOf(state, actor);
    var before = side.stars;
    side.stars = Math.max(0, Math.min(MAX_STARS, side.stars + amount));
    var changed = side.stars - before;
    if (changed !== 0) {
      emit(state, {
        type: "stars_changed",
        actor: actor,
        amount: changed,
        stars: side.stars,
        reason: reason,
      });
    }
    return changed;
  }

  function heal(state, actor, amount, reason) {
    var side = sideOf(state, actor);
    var before = side.hp;
    side.hp = Math.min(side.maxHp, side.hp + amount);
    var healed = side.hp - before;
    emit(state, {
      type: "heal",
      actor: actor,
      amount: healed,
      hp: side.hp,
      reason: reason,
    });
    return healed;
  }

  function checkKnockout(state, knockedActor, winnerActor, reason) {
    var side = sideOf(state, knockedActor);
    if (side.hp > 0) return false;

    if (
      isPassiveActive(state, knockedActor, "revive_half_once") &&
      !side.flags.revived
    ) {
      side.flags.revived = true;
      side.hp = Math.max(1, Math.floor(side.maxHp / 2));
      emit(state, {
        type: "revive",
        actor: knockedActor,
        hp: side.hp,
        passive: "revive_half_once",
      });
      return false;
    }

    side.hp = 0;
    state.winner = winnerActor;
    state.phase = "game_over";
    emit(state, {
      type: "game_over",
      winner: winnerActor,
      loser: knockedActor,
      reason: reason || "knockout",
    });
    return true;
  }

  function applyDamage(state, attackerActor, defenderActor, result, attack) {
    var defender = sideOf(state, defenderActor);
    if (result.firstHitBlocked) defender.flags.firstHitUsed = true;

    defender.hp = Math.max(0, defender.hp - result.damage);
    emit(state, {
      type: "damage",
      actor: attackerActor,
      target: defenderActor,
      attack: attack.name || "기술",
      amount: result.damage,
      hp: defender.hp,
      weakness: result.weakness,
      reducedBy: result.reducedBy,
      weakenedBy: result.weakenedBy,
      firstHitBlocked: result.firstHitBlocked,
    });

    if (result.firstHitBlocked) {
      emit(state, {
        type: "first_hit_zero",
        actor: defenderActor,
      });
    }
  }

  function applyAttackEffect(state, actor, targetActor, attack, rng) {
    var fx = attack.fx || "";
    var actorSide = sideOf(state, actor);
    var target = sideOf(state, targetActor);

    if (fx === "heal_40") {
      heal(state, actor, 40, fx);
    } else if (fx === "gain_star_1") {
      addStars(state, actor, 1, fx);
    } else if (fx === "steal_star_1") {
      var room = MAX_STARS - actorSide.stars;
      var stolen = Math.min(1, room, target.stars);
      if (stolen > 0) {
        target.stars -= stolen;
        actorSide.stars += stolen;
      }
      emit(state, {
        type: "stars_stolen",
        actor: actor,
        target: targetActor,
        amount: stolen,
        actorStars: actorSide.stars,
        targetStars: target.stars,
      });
    } else if (fx === "skip_next_enemy") {
      target.status.skipTurns += 1;
      emit(state, { type: "skip_applied", actor: actor, target: targetActor });
    } else if (fx === "coin_skip_next_enemy") {
      if (flipCoin(state, rng, actor, "attack_effect")) {
        target.status.skipTurns += 1;
        emit(state, { type: "skip_applied", actor: actor, target: targetActor });
      }
    } else if (fx === "weaken_next_20") {
      target.status.weakenNext = Math.max(target.status.weakenNext, 20);
      emit(state, {
        type: "weaken_applied",
        actor: actor,
        target: targetActor,
        amount: 20,
      });
    } else if (fx === "gold_freeze_gain_star") {
      target.status.skipTurns += 1;
      addStars(state, actor, 1, fx);
      emit(state, { type: "skip_applied", actor: actor, target: targetActor });
    }
  }

  function applyEndOfTurn(state, actor) {
    if (state.winner) return;
    var side = sideOf(state, actor);
    if (isPassiveActive(state, actor, "self_hurt_10_eot")) {
      side.hp = Math.max(0, side.hp - 10);
      emit(state, {
        type: "self_damage",
        actor: actor,
        amount: 10,
        hp: side.hp,
      });
      checkKnockout(state, actor, other(actor), "self_damage");
    }
  }

  function finishTurn(state, actor) {
    applyEndOfTurn(state, actor);
    if (state.winner) return;

    state.turn = other(actor);
    state.phase = "turn_start";
    beginTurnMutable(state);
  }

  function performAction(state, action, rng) {
    var next = clone(state);
    next.events = [];

    if (next.winner || next.phase === "game_over") return next;
    if (next.phase === "turn_start") beginTurnMutable(next);
    if (next.winner || next.phase !== "action") return next;

    var actor = next.turn;
    var targetActor = other(actor);
    var actorSide = sideOf(next, actor);

    if (typeof action === "string") action = { type: action };
    if (!action || typeof action !== "object") {
      return invalidAction(next, "행동을 선택해 주세요.");
    }

    if (action.type === "rest") {
      emit(next, { type: "rest", actor: actor, stars: actorSide.stars });
      finishTurn(next, actor);
      return next;
    }

    if (action.type !== "attack") {
      return invalidAction(next, "알 수 없는 행동입니다.");
    }

    var attackIndex = Number.isInteger(action.attackIndex)
      ? action.attackIndex
      : action.index;
    if (!Number.isInteger(attackIndex) || !actorSide.card.attacks[attackIndex]) {
      return invalidAction(next, "존재하지 않는 기술입니다.");
    }

    var attack = actorSide.card.attacks[attackIndex];
    var cost = Math.max(0, Number(attack.cost) || 0);
    if (!isAttackSupported(attack)) {
      return invalidAction(next, "이 기술은 v1에서 사용할 수 없습니다.");
    }
    if (wishExhausted(next, actor)) {
      return invalidAction(next, "세 가지 소원을 모두 사용했습니다.");
    }
    if (actorSide.stars < cost) {
      return invalidAction(next, "별사탕이 부족합니다.");
    }

    var priorUses = Number(actorSide.attackUses[attackIndex]) || 0;
    actorSide.stars -= cost;
    actorSide.attackUses[attackIndex] = priorUses + 1;
    if (isPassiveActive(next, actor, "wish_limit_3")) actorSide.wishUses += 1;

    emit(next, {
      type: "attack",
      actor: actor,
      target: targetActor,
      attackIndex: attackIndex,
      attack: attack.name || "기술",
      cost: cost,
      stars: actorSide.stars,
    });

    if (
      isPassiveActive(next, actor, "coin_miss") &&
      !flipCoin(next, rng, actor, "coin_miss")
    ) {
      emit(next, { type: "attack_missed", actor: actor, target: targetActor });
      finishTurn(next, actor);
      return next;
    }

    if (
      attackTargetsEnemy(attack) &&
      isPassiveActive(next, targetActor, "coin_evade") &&
      flipCoin(next, rng, targetActor, "coin_evade")
    ) {
      emit(next, { type: "attack_evaded", actor: targetActor, source: actor });
      finishTurn(next, actor);
      return next;
    }

    if (attackTargetsEnemy(attack)) {
      var damageResult = calculateDamage(
        next,
        actor,
        targetActor,
        attack,
        attackIndex,
        priorUses
      );
      if (damageResult.weakenedBy > 0) actorSide.status.weakenNext = 0;
      applyDamage(next, actor, targetActor, damageResult, attack);
    }

    applyAttackEffect(next, actor, targetActor, attack, rng);
    checkKnockout(next, targetActor, actor, "attack");

    if (!next.winner) finishTurn(next, actor);
    return next;
  }

  function estimateAttack(state, actor, attack, attackIndex) {
    var targetActor = other(actor);
    var actorSide = sideOf(state, actor);
    var target = sideOf(state, targetActor);
    var result = attackTargetsEnemy(attack)
      ? calculateDamage(state, actor, targetActor, attack, attackIndex)
      : { damage: 0, firstHitBlocked: false };
    var expectedDamage = result.damage;

    if (isPassiveActive(state, actor, "coin_miss")) expectedDamage *= 0.5;
    if (
      attackTargetsEnemy(attack) &&
      isPassiveActive(state, targetActor, "coin_evade")
    ) {
      expectedDamage *= 0.5;
    }

    var score = expectedDamage;
    var fx = attack.fx || "";
    if (result.firstHitBlocked) score = Math.max(score, 1);
    if (fx === "heal_40") {
      score += Math.min(40, actorSide.maxHp - actorSide.hp) * 0.8;
    } else if (fx === "gain_star_1") {
      score += actorSide.stars < MAX_STARS ? 8 : 0;
    } else if (fx === "steal_star_1") {
      score += actorSide.stars < MAX_STARS && target.stars > 0 ? 10 : 0;
    } else if (fx === "skip_next_enemy") {
      score += 15;
    } else if (fx === "coin_skip_next_enemy") {
      score += 7.5;
    } else if (fx === "weaken_next_20") {
      score += 10;
    } else if (fx === "gold_freeze_gain_star") {
      score += 23;
    }

    return {
      attackIndex: attackIndex,
      cost: Math.max(0, Number(attack.cost) || 0),
      damage: result.damage,
      expectedDamage: expectedDamage,
      score: score,
    };
  }

  function chooseAiAction(state, rng) {
    if (!state || state.winner || state.phase !== "action") return null;

    var actor = state.turn;
    var actorSide = sideOf(state, actor);
    var target = sideOf(state, other(actor));
    if (wishExhausted(state, actor)) return { type: "rest" };

    var candidates = [];
    actorSide.card.attacks.forEach(function (attack, attackIndex) {
      if (!isAttackSupported(attack)) return;
      candidates.push({
        attack: attack,
        estimate: estimateAttack(state, actor, attack, attackIndex),
      });
    });

    var affordable = candidates.filter(function (candidate) {
      return candidate.estimate.cost <= actorSide.stars;
    });

    // 쓰러뜨릴 수 있다면 다른 판단보다 마무리가 우선이다.
    var lethal = affordable
      .filter(function (candidate) {
        return candidate.estimate.damage >= target.hp;
      })
      .sort(function (a, b) {
        return b.estimate.score - a.estimate.score;
      });
    if (lethal.length) {
      return { type: "attack", attackIndex: lethal[0].estimate.attackIndex };
    }

    // 체력이 절반 이하일 때 실효 회복량이 있으면 생존을 우선한다.
    var healing = affordable
      .filter(function (candidate) {
        return (
          candidate.attack.fx === "heal_40" &&
          actorSide.hp <= actorSide.maxHp / 2 &&
          actorSide.hp < actorSide.maxHp
        );
      })
      .sort(function (a, b) {
        return b.estimate.score - a.estimate.score;
      });
    if (healing.length) {
      return { type: "attack", attackIndex: healing[0].estimate.attackIndex };
    }

    affordable.sort(function (a, b) {
      if (b.estimate.score !== a.estimate.score) {
        return b.estimate.score - a.estimate.score;
      }
      return b.estimate.cost - a.estimate.cost;
    });
    var bestNow = affordable[0] || null;

    // 당장 약한 기술을 반복하는 대신, 1~3번 쉬어 큰 기술을 쓸 가치가
    // 같거나 더 높다면 별사탕을 저금한다. 오디세우스가 매 턴 1코스트만
    // 사용해 트로이 목마를 영원히 못 쓰는 문제를 막는다.
    var future = candidates
      .filter(function (candidate) {
        var waitTurns = candidate.estimate.cost - actorSide.stars;
        return waitTurns > 0 && waitTurns <= 3 && candidate.estimate.cost <= MAX_STARS;
      })
      .map(function (candidate) {
        return {
          candidate: candidate,
          waitTurns: candidate.estimate.cost - actorSide.stars,
        };
      })
      .sort(function (a, b) {
        return b.candidate.estimate.score - a.candidate.estimate.score;
      });

    if (future.length) {
      var bestFuture = future[0];
      var nowScore = bestNow ? bestNow.estimate.score : 0;
      var savingThreshold = nowScore * (bestFuture.waitTurns + 1);
      if (
        bestFuture.candidate.estimate.score > 0 &&
        bestFuture.candidate.estimate.score >= savingThreshold
      ) {
        return { type: "rest" };
      }
    }

    if (!bestNow || bestNow.estimate.score <= 0) return { type: "rest" };
    if (
      typeof rng === "function" &&
      affordable.length > 1 &&
      affordable[1].estimate.score > 0 &&
      randomNumber(rng) < 0.3
    ) {
      bestNow = affordable[1];
    }
    return { type: "attack", attackIndex: bestNow.estimate.attackIndex };
  }

  return Object.freeze({
    MAX_STARS: MAX_STARS,
    TYPE_CHART: TYPE_CHART,
    createGame: createGame,
    beginTurn: beginTurn,
    getAvailableActions: getAvailableActions,
    performAction: performAction,
    chooseAiAction: chooseAiAction,
    getBalancedEnemyPool: getBalancedEnemyPool,
    isAttackSupported: isAttackSupported,
    isBattleCard: isBattleCard,
    isPassiveActive: isPassiveActive,
    isBeneficialPassive: isBeneficialPassive,
  });
});
