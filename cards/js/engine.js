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

  var SUPPORTED_FRAGMENT_EFFECTS = Object.freeze({
    guard_zero: true,
    boost_damage: true,
    reduce_next_damage: true,
    gain_stars: true,
    heal: true,
    discount_attack: true,
    oil_coin: true,
    steal_stars: true,
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

  function fragmentEffect(fragment) {
    return fragment && fragment.effect && typeof fragment.effect === "object"
      ? fragment.effect
      : null;
  }

  function normaliseFragment(fragment, index) {
    if (!fragment || typeof fragment !== "object") {
      throw new TypeError("이야기의 조각 데이터가 필요합니다.");
    }
    var copy = clone(fragment);
    if (!copy.id) copy.id = "fragment-" + index;
    if (!copy.name) copy.name = "이야기의 조각";
    var effect = fragmentEffect(copy);
    if (!effect || !SUPPORTED_FRAGMENT_EFFECTS[effect.type]) {
      throw new TypeError(copy.name + " 조각의 효과를 사용할 수 없습니다.");
    }
    effect.amount = Math.max(0, Number(effect.amount) || 0);
    copy.used = false;
    return copy;
  }

  function normaliseFragmentHand(fragments) {
    if (!Array.isArray(fragments)) return [];
    return fragments.slice(0, 3).map(normaliseFragment);
  }

  function makeSide(actor, card, fragments) {
    var safeCard = normaliseCard(card);
    return {
      actor: actor,
      card: safeCard,
      hp: safeCard.hp,
      maxHp: safeCard.hp,
      stars: 0,
      attackUses: {},
      wishUses: 0,
      fragmentHand: normaliseFragmentHand(fragments),
      flags: {
        revived: false,
        firstHitUsed: false,
        fragmentUsedThisTurn: false,
      },
      status: {
        skipTurns: 0,
        weakenNext: 0,
        fragmentDamageBoost: 0,
        fragmentDiscount: 0,
        fragmentGuardZero: 0,
        fragmentReduceNext: 0,
        fragmentOilCoin: 0,
      },
    };
  }

  function createGame(playerCard, enemyCard, options) {
    options = options && typeof options === "object" ? options : {};

    var state = {
      version: 1,
      turn: "player",
      turnNumber: 0,
      phase: "turn_start",
      winner: null,
      sides: {
        player: makeSide("player", playerCard, options.playerFragments),
        enemy: makeSide("enemy", enemyCard, options.enemyFragments),
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
    side.flags.fragmentUsedThisTurn = false;
    side.status.fragmentDamageBoost = 0;
    side.status.fragmentDiscount = 0;
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

  function effectiveAttackCost(state, actor, attack) {
    var discount = Math.max(
      0,
      Number(sideOf(state, actor).status.fragmentDiscount) || 0
    );
    return Math.max(0, (Math.max(0, Number(attack.cost) || 0)) - discount);
  }

  function canUseFragmentBase(state, actor, fragmentIndex) {
    if (!state || state.winner || state.phase !== "action" || state.turn !== actor) {
      return false;
    }
    var side = sideOf(state, actor);
    if (
      side.flags.fragmentUsedThisTurn ||
      wishExhausted(state, actor) ||
      !Number.isInteger(fragmentIndex)
    ) {
      return false;
    }
    var fragment = side.fragmentHand[fragmentIndex];
    var effect = fragmentEffect(fragment);
    return Boolean(
      fragment &&
      !fragment.used &&
      effect &&
      SUPPORTED_FRAGMENT_EFFECTS[effect.type]
    );
  }

  function applyFragmentMutable(state, actor, fragmentIndex) {
    var side = sideOf(state, actor);
    var targetActor = other(actor);
    var target = sideOf(state, targetActor);
    var fragment = side.fragmentHand[fragmentIndex];
    var effect = fragmentEffect(fragment);
    var amount = Math.max(0, Number(effect.amount) || 0);

    fragment.used = true;
    side.flags.fragmentUsedThisTurn = true;
    emit(state, {
      type: "fragment_used",
      actor: actor,
      target: targetActor,
      fragmentIndex: fragmentIndex,
      fragmentId: fragment.id,
      fragment: fragment.name,
      effect: effect.type,
      amount: amount,
    });

    if (effect.type === "guard_zero") {
      side.status.fragmentGuardZero = 1;
    } else if (effect.type === "boost_damage") {
      side.status.fragmentDamageBoost += amount;
    } else if (effect.type === "reduce_next_damage") {
      side.status.fragmentReduceNext += amount;
    } else if (effect.type === "gain_stars") {
      addStars(state, actor, amount, "fragment:" + fragment.id);
    } else if (effect.type === "heal") {
      heal(state, actor, amount, "fragment:" + fragment.id);
    } else if (effect.type === "discount_attack") {
      side.status.fragmentDiscount += amount;
    } else if (effect.type === "oil_coin") {
      target.status.fragmentOilCoin = 1;
    } else if (effect.type === "steal_stars") {
      var room = MAX_STARS - side.stars;
      var stolen = Math.min(amount, room, target.stars);
      if (stolen > 0) {
        target.stars -= stolen;
        side.stars += stolen;
      }
      emit(state, {
        type: "stars_stolen",
        actor: actor,
        target: targetActor,
        amount: stolen,
        actorStars: side.stars,
        targetStars: target.stars,
        reason: "fragment:" + fragment.id,
      });
    }
  }

  function hasAffordableAttack(state, actor) {
    if (wishExhausted(state, actor)) return false;
    var side = sideOf(state, actor);
    return side.card.attacks.some(function (attack) {
      return isAttackSupported(attack) &&
        effectiveAttackCost(state, actor, attack) <= side.stars;
    });
  }

  function canUseFragment(state, actor, fragmentIndex) {
    if (!canUseFragmentBase(state, actor, fragmentIndex)) return false;
    var projected = clone(state);
    projected.events = [];
    applyFragmentMutable(projected, actor, fragmentIndex);
    return hasAffordableAttack(projected, actor);
  }

  function getAvailableFragmentActions(state) {
    if (!state || state.winner || state.phase !== "action") return [];
    var actor = state.turn;
    var side = sideOf(state, actor);
    return side.fragmentHand.reduce(function (actions, fragment, fragmentIndex) {
      if (canUseFragment(state, actor, fragmentIndex)) {
        actions.push({
          type: "fragment",
          fragmentIndex: fragmentIndex,
          id: fragment.id,
          name: fragment.name,
        });
      }
      return actions;
    }, []);
  }

  function getAvailableActions(state) {
    if (!state || state.winner || state.phase !== "action") return [];

    var actor = state.turn;
    var side = sideOf(state, actor);
    var actions = side.flags.fragmentUsedThisTurn ? [] : [{ type: "rest" }];

    if (wishExhausted(state, actor)) return actions;

    side.card.attacks.forEach(function (attack, attackIndex) {
      var cost = effectiveAttackCost(state, actor, attack);
      if (!isAttackSupported(attack) || cost > side.stars) return;
      actions.push({
        type: "attack",
        attackIndex: attackIndex,
        cost: cost,
        name: attack.name || "기술",
      });
    });

    if (!side.flags.fragmentUsedThisTurn) {
      actions = actions.concat(getAvailableFragmentActions(state));
    }

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

  function drawFragments(pool, rng, count) {
    var wanted = count === undefined ? 3 : Math.max(0, Math.floor(Number(count) || 0));
    var seen = {};
    var source = (Array.isArray(pool) ? pool : [])
      .filter(function (fragment) {
        if (!fragment || typeof fragment !== "object" || !fragment.id) return false;
        if (seen[fragment.id]) return false;
        seen[fragment.id] = true;
        return true;
      })
      .map(clone);

    for (var index = source.length - 1; index > 0; index -= 1) {
      var swapIndex = Math.floor(randomNumber(rng) * (index + 1));
      var held = source[index];
      source[index] = source[swapIndex];
      source[swapIndex] = held;
    }
    return source.slice(0, Math.min(wanted, source.length));
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

  function actionNeedsCoin(state, action) {
    if (
      !state ||
      state.winner ||
      state.phase !== "action" ||
      !action ||
      action.type !== "attack"
    ) {
      return false;
    }
    var actor = state.turn;
    var targetActor = other(actor);
    var attackIndex = Number.isInteger(action.attackIndex)
      ? action.attackIndex
      : action.index;
    var attack = sideOf(state, actor).card.attacks[attackIndex];
    if (!attack || !isAttackSupported(attack)) return false;
    var hostile = attackTargetsEnemy(attack);
    return Boolean(
      (hostile && sideOf(state, actor).status.fragmentOilCoin > 0) ||
      isPassiveActive(state, actor, "coin_miss") ||
      (hostile && isPassiveActive(state, targetActor, "coin_evade")) ||
      attack.fx === "coin_skip_next_enemy"
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

    var fragmentBoostedBy = 0;
    if (damage > 0 && attacker.status.fragmentDamageBoost > 0) {
      fragmentBoostedBy = attacker.status.fragmentDamageBoost;
      damage += fragmentBoostedBy;
    }

    var weakenedBy = 0;
    var weakenConsumed = false;
    if (damage > 0 && attacker.status.weakenNext > 0) {
      var damageBeforeWeaken = damage;
      weakenConsumed = true;
      // 약화만 반복해 0 데미지 교착이 생기지 않도록, 원래 피해가 있는
      // 기술은 최소 10을 남긴다. 10 피해 기술도 약화 1회를 소비한다.
      damage = Math.max(10, damage - attacker.status.weakenNext);
      weakenedBy = damageBeforeWeaken - damage;
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

    var fragmentGuarded = false;
    var fragmentReducedBy = 0;
    if (damage > 0 && defender.status.fragmentGuardZero > 0) {
      fragmentGuarded = true;
      damage = 0;
    } else if (damage > 0 && defender.status.fragmentReduceNext > 0) {
      fragmentReducedBy = Math.min(damage, defender.status.fragmentReduceNext);
      damage = Math.max(0, damage - fragmentReducedBy);
    }

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
      weakenConsumed: weakenConsumed,
      fragmentBoostedBy: fragmentBoostedBy,
      fragmentGuarded: fragmentGuarded,
      fragmentReducedBy: fragmentReducedBy,
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
    if (result.fragmentGuarded) defender.status.fragmentGuardZero = 0;
    if (result.fragmentReducedBy > 0) defender.status.fragmentReduceNext = 0;

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
      fragmentBoostedBy: result.fragmentBoostedBy,
      fragmentGuarded: result.fragmentGuarded,
      fragmentReducedBy: result.fragmentReducedBy,
      firstHitBlocked: result.firstHitBlocked,
    });

    if (result.fragmentGuarded) {
      emit(state, {
        type: "fragment_guard",
        actor: defenderActor,
        source: attackerActor,
      });
    } else if (result.fragmentReducedBy > 0) {
      emit(state, {
        type: "fragment_reduce",
        actor: defenderActor,
        source: attackerActor,
        amount: result.fragmentReducedBy,
      });
    }

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

  function clearFragmentTurnEffects(side) {
    side.status.fragmentDamageBoost = 0;
    side.status.fragmentDiscount = 0;
  }

  function finishTurn(state, actor) {
    clearFragmentTurnEffects(sideOf(state, actor));
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

    if (action.type === "fragment") {
      var selectedFragment = Number.isInteger(action.fragmentIndex)
        ? action.fragmentIndex
        : action.index;
      if (!canUseFragment(next, actor, selectedFragment)) {
        return invalidAction(next, "지금은 이 이야기의 조각을 사용할 수 없습니다.");
      }
      applyFragmentMutable(next, actor, selectedFragment);
      return next;
    }

    if (action.type === "rest") {
      if (actorSide.flags.fragmentUsedThisTurn) {
        return invalidAction(next, "조각을 썼다면 이어서 기술을 사용해야 합니다.");
      }
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
    if (!isAttackSupported(attack)) {
      return invalidAction(next, "이 기술은 v1에서 사용할 수 없습니다.");
    }
    if (wishExhausted(next, actor)) {
      return invalidAction(next, "세 가지 소원을 모두 사용했습니다.");
    }

    var hasCompoundFragment =
      Object.prototype.hasOwnProperty.call(action, "fragmentIndex") &&
      action.fragmentIndex !== null &&
      action.fragmentIndex !== undefined;
    if (hasCompoundFragment) {
      if (
        !Number.isInteger(action.fragmentIndex) ||
        !canUseFragmentBase(next, actor, action.fragmentIndex)
      ) {
        return invalidAction(next, "지금은 이 이야기의 조각을 사용할 수 없습니다.");
      }
      var projected = clone(next);
      projected.events = [];
      applyFragmentMutable(projected, actor, action.fragmentIndex);
      var projectedSide = sideOf(projected, actor);
      var projectedCost = effectiveAttackCost(projected, actor, attack);
      if (projectedSide.stars < projectedCost) {
        return invalidAction(next, "조각을 써도 별사탕이 부족합니다.");
      }
      applyFragmentMutable(next, actor, action.fragmentIndex);
      actorSide = sideOf(next, actor);
    }

    var cost = effectiveAttackCost(next, actor, attack);
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
      attackTargetsEnemy(attack) &&
      actorSide.status.fragmentOilCoin > 0
    ) {
      actorSide.status.fragmentOilCoin = 0;
      if (!flipCoin(next, rng, actor, "fragment_oil")) {
        emit(next, {
          type: "attack_missed",
          actor: actor,
          target: targetActor,
          reason: "fragment_oil",
        });
        finishTurn(next, actor);
        return next;
      }
    }

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
      if (damageResult.weakenConsumed) actorSide.status.weakenNext = 0;
      applyDamage(next, actor, targetActor, damageResult, attack);
    }

    applyAttackEffect(next, actor, targetActor, attack, rng);
    clearFragmentTurnEffects(actorSide);
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

    if (
      attackTargetsEnemy(attack) &&
      actorSide.status.fragmentOilCoin > 0
    ) {
      expectedDamage *= 0.5;
    }
    if (isPassiveActive(state, actor, "coin_miss")) expectedDamage *= 0.5;
    if (
      attackTargetsEnemy(attack) &&
      isPassiveActive(state, targetActor, "coin_evade")
    ) {
      expectedDamage *= 0.5;
    }

    var score = expectedDamage;
    var fx = attack.fx || "";
    if (
      result.firstHitBlocked ||
      result.fragmentGuarded ||
      result.fragmentReducedBy > 0
    ) {
      // AI도 1회용 방어를 실제 공격으로 벗겨 다음 턴을 진행시킨다.
      score = Math.max(score, 1);
    }
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
      // 이미 걸린 약화를 새로 덮는 행동은 추가 가치가 없다.
      score += target.status.weakenNext > 0 ? 0 : 10;
    } else if (fx === "gold_freeze_gain_star") {
      score += 23;
    }

    return {
      attackIndex: attackIndex,
      cost: effectiveAttackCost(state, actor, attack),
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

    var fragmentPlans = [];
    if (!actorSide.flags.fragmentUsedThisTurn) {
      actorSide.fragmentHand.forEach(function (fragment, fragmentIndex) {
        if (!canUseFragment(state, actor, fragmentIndex)) return;
        var simulated = clone(state);
        simulated.events = [];
        applyFragmentMutable(simulated, actor, fragmentIndex);
        var simulatedSide = sideOf(simulated, actor);
        var simulatedTarget = sideOf(simulated, other(actor));
        var simulatedCandidates = [];
        simulatedSide.card.attacks.forEach(function (attack, attackIndex) {
          if (!isAttackSupported(attack)) return;
          var estimate = estimateAttack(simulated, actor, attack, attackIndex);
          if (estimate.cost <= simulatedSide.stars) {
            simulatedCandidates.push({ attack: attack, estimate: estimate });
          }
        });
        simulatedCandidates.sort(function (a, b) {
          if (b.estimate.score !== a.estimate.score) {
            return b.estimate.score - a.estimate.score;
          }
          return b.estimate.cost - a.estimate.cost;
        });
        if (!simulatedCandidates.length) return;
        fragmentPlans.push({
          fragmentIndex: fragmentIndex,
          effect: fragmentEffect(fragment),
          best: simulatedCandidates[0],
          lethal: simulatedCandidates.filter(function (candidate) {
            return candidate.estimate.damage >= simulatedTarget.hp;
          })[0] || null,
        });
      });
    }

    // 조각 없이 끝낼 수 있을 때는 위에서 이미 반환했다. 조각이 있어야
    // 마무리가 되는 경우에만 공격 강화나 비용 할인 조각을 쓴다.
    var fragmentLethal = fragmentPlans
      .filter(function (plan) {
        return plan.lethal && (
          plan.effect.type === "boost_damage" ||
          plan.effect.type === "discount_attack"
        );
      })
      .sort(function (a, b) {
        return b.lethal.estimate.score - a.lethal.estimate.score;
      });
    if (fragmentLethal.length) {
      return {
        type: "attack",
        attackIndex: fragmentLethal[0].lethal.estimate.attackIndex,
        fragmentIndex: fragmentLethal[0].fragmentIndex,
      };
    }

    function usefulFragmentPlan(plan) {
      var effect = plan.effect;
      var amount = Math.max(0, Number(effect.amount) || 0);
      if (effect.type === "heal") {
        return amount > 0 && actorSide.hp < actorSide.maxHp;
      }
      if (effect.type === "guard_zero") {
        return actorSide.status.fragmentGuardZero <= 0;
      }
      if (effect.type === "reduce_next_damage") {
        return amount > 0 && actorSide.status.fragmentReduceNext <= 0;
      }
      if (effect.type === "oil_coin") {
        return target.status.fragmentOilCoin <= 0;
      }
      if (effect.type === "gain_stars") {
        return amount > 0 && actorSide.stars < MAX_STARS;
      }
      if (effect.type === "steal_stars") {
        return amount > 0 && actorSide.stars < MAX_STARS && target.stars > 0;
      }
      if (effect.type === "boost_damage") {
        return amount > 0 && plan.best.estimate.damage > 0;
      }
      if (effect.type === "discount_attack") {
        return amount > 0 && plan.best.estimate.cost <
          Math.max(0, Number(plan.best.attack.cost) || 0);
      }
      return false;
    }

    if (actorSide.hp <= actorSide.maxHp / 2) {
      var survivalPriority = {
        heal: 4,
        guard_zero: 3,
        reduce_next_damage: 2,
        oil_coin: 1,
      };
      var survival = fragmentPlans
        .filter(function (plan) {
          return survivalPriority[plan.effect.type] && usefulFragmentPlan(plan);
        })
        .sort(function (a, b) {
          var priority = survivalPriority[b.effect.type] - survivalPriority[a.effect.type];
          if (priority !== 0) return priority;
          return (Number(b.effect.amount) || 0) - (Number(a.effect.amount) || 0);
        });
      if (survival.length) {
        return {
          type: "attack",
          attackIndex: survival[0].best.estimate.attackIndex,
          fragmentIndex: survival[0].fragmentIndex,
        };
      }
    }

    var usefulPlans = fragmentPlans.filter(usefulFragmentPlan);
    if (typeof rng === "function" && usefulPlans.length) {
      var fragmentRoll = randomNumber(rng);
      if (fragmentRoll < 0.3) {
        var chosenPlan = usefulPlans[
          Math.min(
            usefulPlans.length - 1,
            Math.floor(fragmentRoll / 0.3 * usefulPlans.length)
          )
        ];
        return {
          type: "attack",
          attackIndex: chosenPlan.best.estimate.attackIndex,
          fragmentIndex: chosenPlan.fragmentIndex,
        };
      }
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

    // 조각을 단독으로 먼저 사용한 상태에서는 반드시 기술로 이어 간다.
    if (actorSide.flags.fragmentUsedThisTurn && bestNow) {
      return { type: "attack", attackIndex: bestNow.estimate.attackIndex };
    }

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
    SUPPORTED_FRAGMENT_EFFECTS: SUPPORTED_FRAGMENT_EFFECTS,
    createGame: createGame,
    beginTurn: beginTurn,
    drawFragments: drawFragments,
    getAvailableActions: getAvailableActions,
    getAvailableFragmentActions: getAvailableFragmentActions,
    performAction: performAction,
    chooseAiAction: chooseAiAction,
    actionNeedsCoin: actionNeedsCoin,
    getBalancedEnemyPool: getBalancedEnemyPool,
    isAttackSupported: isAttackSupported,
    isBattleCard: isBattleCard,
    isPassiveActive: isPassiveActive,
    isBeneficialPassive: isBeneficialPassive,
  });
});
