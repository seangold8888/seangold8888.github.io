(function () {
  "use strict";

  const STORY_NAMES = {
    cinderella: "신데렐라",
    odyssey_cyclops: "오디세이 1화 · 외눈박이 거인",
    jack_story: "잭과 콩나무",
    redhood_story: "빨간 모자",
    threepigs: "아기돼지 삼형제",
    tortoisehare: "토끼와 거북",
    pinocchio: "피노키오",
    witch: "헨젤과 그레텔",
    bremen: "브레멘 음악대",
    snowqueen: "눈의 여왕",
    mermaid: "인어공주",
    genie: "알라딘과 요술 램프",
    heracles: "영웅 헤라클레스",
    perseus: "페르세우스와 메두사",
    midas: "미다스 왕의 황금 손",
    sunwukong: "손오공",
    honggildong: "홍길동전",
    sunmoon: "해와 달이 된 오누이",
    arthur: "아서왕과 전설의 검",
    bongi: "봉이 김선달"
  };

  const dom = {};
  let cards = [];
  let battleCards = [];
  let fragments = [];
  let selectedCard = null;
  let selectedFragmentIndex = null;
  let game = null;
  let busy = false;
  let effectTimer = 0;
  let actionTimer = 0;
  let enemyTimer = 0;
  let resultTimer = 0;
  let coinTimer = 0;
  let impactTimer = 0;
  let battleSession = 0;
  let pendingCoinAction = null;
  let unlockSnapshot = "";

  function byId(id) {
    return document.getElementById(id);
  }

  function cacheDom() {
    [
      "collectionScreen", "battleScreen", "collectionGrid", "unlockCount",
      "selectionDock", "selectedPortrait", "selectedStatus", "selectedName",
      "battleButton", "battleButtonLabel",
      "muteButton", "leaveBattleButton", "turnOwner", "turnNumber",
      "battleStars", "arena", "enemyCardSlot", "playerCardSlot", "battleMessage",
      "effectBurst", "actionList", "weaknessHint", "lockedDialog",
      "lockedArt", "lockedTitle", "lockedDescription", "resultDialog",
      "resultKicker", "resultTitle", "resultText", "rematchButton",
      "resultCollectionButton", "coinDialog", "coinTitle", "coinInstruction",
      "coinButton", "coinResult", "fragmentTray", "fragmentHand",
      "fragmentHelp", "fragmentPreview"
    ].forEach(function (id) { dom[id] = byId(id); });
  }

  function isPreviewMode() {
    return isLocalQaHost() &&
      new URLSearchParams(location.search).get("preview") === "all";
  }

  function isLocalQaHost() {
    return ["localhost", "127.0.0.1", "[::1]"].includes(location.hostname);
  }

  function isStoryDone(storyId) {
    if (!storyId || isPreviewMode()) return true;
    try {
      return localStorage.getItem("story_done_" + storyId) === "1";
    } catch (error) {
      return false;
    }
  }

  function isUnlocked(card) {
    return !card.unlock || isStoryDone(card.unlock);
  }

  function artUrl(card) {
    const requested = card.art || ("art/" + card.id + ".png");
    return requested.replace(/\.png$/i, ".webp");
  }

  function isPlayableCard(card) {
    return window.CardEngine.isBattleCard(card);
  }

  function getUnlockSnapshot() {
    const cardSnapshot = cards.map(function (card) {
      return card.id + ":" + (isUnlocked(card) ? "1" : "0");
    });
    const fragmentSnapshot = fragments.map(function (fragment) {
      return "fragment-" + fragment.id + ":" + (isStoryDone(fragment.unlock) ? "1" : "0");
    });
    return cardSnapshot.concat(fragmentSnapshot).join("|");
  }

  function refreshUnlocks() {
    if (!cards.length) return;
    const nextSnapshot = getUnlockSnapshot();
    if (nextSnapshot === unlockSnapshot) return;
    if (dom.lockedDialog.open) dom.lockedDialog.close();
    renderCollection();
  }

  function renderCollection() {
    const focused = document.activeElement && document.activeElement.closest
      ? document.activeElement.closest("[data-card-id]")
      : null;
    const focusedId = focused ? focused.dataset.cardId : null;
    dom.collectionGrid.replaceChildren();
    const unlocked = cards.filter(isUnlocked);
    dom.unlockCount.textContent = unlocked.length + " / " + cards.length;
    if (!selectedCard || !isUnlocked(selectedCard)) {
      selectedCard = battleCards.find(isUnlocked) || null;
    }

    // 깨어난 카드가 맨 위, 그다음 깨울 수 있는 대전 카드, 수집 전용은 마지막.
    // 같은 묶음 안에서는 원래 순서를 지킨다(안정 정렬).
    const shelfOrder = cards.map(function (card, index) {
      const tier = isUnlocked(card) ? 0 : (isPlayableCard(card) ? 1 : 2);
      return { card: card, tier: tier, index: index };
    }).sort(function (a, b) {
      return a.tier - b.tier || a.index - b.index;
    }).map(function (entry) { return entry.card; });

    shelfOrder.forEach(function (card) {
      const locked = !isUnlocked(card);
      const collectionOnly = !isPlayableCard(card);
      const cardEl = window.CardView.create(card, {
        locked: locked,
        collectionOnly: collectionOnly,
        selected: selectedCard && selectedCard.id === card.id,
        interactive: locked || !collectionOnly,
        eager: card.id === "cinderella",
        onSelect: function () {
          window.CardAudio.prime();
          if (locked) {
            openLockedDialog(card);
            return;
          }
          selectCard(card);
        }
      });
      const item = document.createElement("div");
      item.className = "card-gallery-item";
      item.setAttribute("role", "listitem");
      item.appendChild(cardEl);
      dom.collectionGrid.appendChild(item);
    });

    updateSelectionDock();
    unlockSnapshot = getUnlockSnapshot();
    if (focusedId) {
      const nextFocused = dom.collectionGrid.querySelector('[data-card-id="' + focusedId + '"]');
      if (nextFocused) nextFocused.focus({ preventScroll: true });
    }
  }

  function selectCard(card) {
    if (!isPlayableCard(card)) return;
    selectedCard = card;
    window.CardAudio.select();
    renderCollection();
    const selected = dom.collectionGrid.querySelector('[data-card-id="' + card.id + '"]');
    if (selected) selected.scrollIntoView({ behavior: "smooth", block: "nearest", inline: "center" });
  }

  function updateSelectionDock() {
    if (!selectedCard) {
      dom.selectedStatus.textContent = "오늘의 출전 카드";
      dom.selectedName.textContent = "카드를 골라 주세요";
      dom.selectedPortrait.style.backgroundImage = "";
      dom.selectedPortrait.textContent = "?";
      dom.battleButtonLabel.textContent = "대결 시작";
      dom.battleButton.setAttribute("aria-label", "대결 시작");
      dom.battleButton.disabled = true;
      return;
    }
    const playable = isPlayableCard(selectedCard);
    dom.selectedStatus.textContent = playable ? "오늘의 출전 카드" : "컬렉션 전용 카드";
    dom.selectedName.textContent = selectedCard.name;
    dom.selectedPortrait.textContent = "";
    dom.selectedPortrait.style.backgroundImage = 'url("' + artUrl(selectedCard) + '")';
    dom.selectedPortrait.style.backgroundPosition = window.CardView.artPosition[selectedCard.id] || "50% 40%";
    dom.battleButtonLabel.textContent = playable ? "대결 시작" : "대전 준비 중";
    dom.battleButton.setAttribute(
      "aria-label",
      playable ? "대결 시작" : selectedCard.name + " 카드는 컬렉션 전용이며 대전 준비 중"
    );
    dom.battleButton.disabled = !playable;
  }

  function openLockedDialog(card) {
    const storyName = STORY_NAMES[card.unlock] || "새로운 이야기";
    dom.lockedArt.style.backgroundImage = 'linear-gradient(rgba(17,13,37,.22), rgba(17,13,37,.42)), url("' + artUrl(card) + '")';
    dom.lockedArt.style.backgroundPosition = window.CardView.artPosition[card.id] || "50% 40%";
    dom.lockedTitle.textContent = card.name + " 카드가 잠들어 있어요";
    dom.lockedDescription.textContent = isPlayableCard(card)
      ? "「" + storyName + "」를 끝까지 들으면 이 영웅과 함께 대결할 수 있어요."
      : "「" + storyName + "」를 끝까지 들으면 컬렉션에 깨어나요. 대전 기술은 다음 확장에서 준비됩니다.";
    dom.lockedDialog.showModal();
  }

  function showScreen(name) {
    const battle = name === "battle";
    dom.collectionScreen.hidden = battle;
    dom.battleScreen.hidden = !battle;
    document.body.classList.toggle("in-battle", battle);
    scrollTo({ top: 0, behavior: "smooth" });
  }

  function pickEnemy() {
    const requested = new URLSearchParams(location.search).get("enemy");
    const requestedCard = battleCards.find(function (card) {
      return card.id === requested && (!selectedCard || card.id !== selectedCard.id);
    });
    if (isLocalQaHost() && requestedCard) return requestedCard;

    const pool = window.CardEngine.getBalancedEnemyPool(battleCards, selectedCard);
    return pool[Math.floor(Math.random() * pool.length)] || selectedCard || battleCards[0];
  }

  function resetBattleFlow() {
    battleSession += 1;
    clearTimeout(effectTimer);
    clearTimeout(actionTimer);
    clearTimeout(enemyTimer);
    clearTimeout(resultTimer);
    clearTimeout(coinTimer);
    clearTimeout(impactTimer);
    if (dom.arena) {
      dom.arena.classList.remove("is-weak-hit", "is-monster-hit");
    }
    pendingCoinAction = null;
    selectedFragmentIndex = null;
    if (dom.coinDialog && dom.coinDialog.open) dom.coinDialog.close();
  }

  function getUnlockedFragmentPool() {
    return fragments.filter(function (fragment) {
      return isStoryDone(fragment.unlock);
    });
  }

  function startBattle() {
    if (!selectedCard || !isUnlocked(selectedCard) || !isPlayableCard(selectedCard)) return;
    resetBattleFlow();
    window.CardAudio.prime();
    const enemy = pickEnemy();
    const fragmentPool = getUnlockedFragmentPool();
    game = window.CardEngine.createGame(selectedCard, enemy, {
      playerFragments: window.CardEngine.drawFragments(fragmentPool, Math.random, 3),
      enemyFragments: window.CardEngine.drawFragments(fragmentPool, Math.random, 3)
    });
    busy = false;
    showScreen("battle");
    dom.battleMessage.textContent = selectedCard.name + "의 별빛 무대가 열렸어요!";
    setEffect("READY!");
    renderBattle();
  }

  function createFxPart(className, text) {
    const part = document.createElement("span");
    part.className = className;
    if (text) part.textContent = text;
    return part;
  }

  function createCombatFx(cardEl, visual) {
    const art = cardEl.querySelector(".card-art");
    if (!art || !visual) return;
    const validTypes = ["brave", "wise", "magic", "monster"];
    const attackType = validTypes.includes(visual.attackType)
      ? visual.attackType
      : null;
    const layer = document.createElement("div");
    layer.className = "combat-fx" + (attackType ? " fx-type-" + attackType : "");
    layer.setAttribute("aria-hidden", "true");

    if (visual.impact) {
      layer.appendChild(createFxPart("fx-hit-flash"));
    }

    if (attackType) {
      const coreGlyph = attackType === "wise"
        ? "➤"
        : attackType === "magic" ? "✦" : "";
      const particleGlyph = attackType === "wise"
        ? "▱"
        : attackType === "magic" ? "✦" : attackType === "brave" ? "◆" : "";
      layer.append(
        createFxPart("fx-core", coreGlyph),
        createFxPart("fx-trail"),
        createFxPart("fx-particle fx-particle-a", particleGlyph),
        createFxPart("fx-particle fx-particle-b", particleGlyph),
        createFxPart("fx-particle fx-particle-c", particleGlyph)
      );
    }

    if (visual.damage > 0) {
      const damagePop = createFxPart(
        "damage-pop" + (visual.weakness ? " is-weak" : ""),
        "-" + visual.damage
      );
      if (visual.weakness) {
        damagePop.appendChild(createFxPart("damage-multiplier", "×2"));
      }
      layer.appendChild(damagePop);
    }

    if (visual.knockout) {
      ["a", "b", "c"].forEach(function (suffix) {
        layer.appendChild(createFxPart("fx-state-star fx-state-star-" + suffix, "✦"));
      });
    }

    if (visual.revive) {
      layer.appendChild(createFxPart("fx-revive-pillar"));
      ["a", "b", "c"].forEach(function (suffix) {
        layer.appendChild(createFxPart("fx-revive-star fx-revive-star-" + suffix, "✦"));
      });
    }

    art.appendChild(layer);
  }

  function actionVisualsForEvents(events, actor, battleState) {
    const sourceEvents = Array.isArray(events) ? events : [];
    const state = battleState || game;
    const byTarget = Object.create(null);
    const order = [];
    const attacks = sourceEvents.filter(function (event) {
      return event.type === "attack";
    });
    const missed = sourceEvents.some(function (event) {
      return event.type === "attack_missed" || event.type === "attack_evaded";
    });

    function ensureVisual(target) {
      if (!target || !["player", "enemy"].includes(target)) return null;
      if (!byTarget[target]) {
        byTarget[target] = {
          target: target,
          attackType: null,
          damage: 0,
          weakness: false,
          impact: false,
          knockout: false,
          revive: false
        };
        order.push(target);
      }
      return byTarget[target];
    }

    function cardType(sideName) {
      const side = state && state.sides && state.sides[sideName];
      return side && side.card ? side.card.type : null;
    }

    sourceEvents.forEach(function (event) {
      let visual;
      let amount;
      if (event.type === "damage") {
        visual = ensureVisual(event.target);
        if (!visual) return;
        amount = Math.max(0, Number(event.amount) || 0);
        visual.attackType = cardType(event.actor) || visual.attackType;
        visual.damage += amount;
        visual.impact = visual.impact || amount > 0;
        visual.weakness = visual.weakness || Boolean(amount > 0 && event.weakness);
      } else if (event.type === "self_damage") {
        visual = ensureVisual(event.actor);
        if (!visual) return;
        amount = Math.max(0, Number(event.amount) || 0);
        visual.damage += amount;
        visual.impact = visual.impact || amount > 0;
      } else if (event.type === "heal") {
        visual = ensureVisual(event.actor);
        if (visual) visual.attackType = cardType(event.actor) || visual.attackType;
      } else if (event.type === "revive") {
        visual = ensureVisual(event.actor);
        if (visual) visual.revive = true;
      } else if (event.type === "game_over") {
        visual = ensureVisual(event.loser);
        if (visual) visual.knockout = true;
      }
    });

    const lastAttack = attacks[attacks.length - 1] || null;
    const hasAttackVisual = order.some(function (target) {
      return Boolean(byTarget[target].attackType);
    });
    if (lastAttack && !missed && !hasAttackVisual) {
      const heal = sourceEvents.slice().reverse().find(function (event) {
        return event.type === "heal";
      });
      const visual = ensureVisual(heal ? heal.actor : lastAttack.target);
      if (visual) visual.attackType = cardType(lastAttack.actor || actor);
    }

    return order.map(function (target) { return byTarget[target]; });
  }

  function impactFlagsForVisuals(visuals) {
    return (Array.isArray(visuals) ? visuals : []).reduce(function (flags, visual) {
      if (!visual.impact) return flags;
      flags.weak = flags.weak || Boolean(visual.weakness);
      flags.monster = flags.monster || visual.attackType === "monster";
      return flags;
    }, { weak: false, monster: false });
  }

  function renderBattle(flags) {
    flags = flags || {};
    if (!game) return;
    const player = game.sides.player;
    const enemy = game.sides.enemy;
    const visuals = Array.isArray(flags.visuals) ? flags.visuals : [];
    const hitTargets = new Set(
      visuals.filter(function (visual) { return visual.impact; })
        .map(function (visual) { return visual.target; })
    );
    if (flags.hit) hitTargets.add(flags.hit);
    const playerCardEl = window.CardView.create(player.card, {
      compact: true,
      eager: true,
      currentHp: player.hp,
      acting: flags.acting === "player",
      hit: hitTargets.has("player")
    });
    const enemyCardEl = window.CardView.create(enemy.card, {
      compact: true,
      eager: true,
      currentHp: enemy.hp,
      acting: flags.acting === "enemy",
      hit: hitTargets.has("enemy")
    });
    const slots = { player: dom.playerCardSlot, enemy: dom.enemyCardSlot };
    const cardElements = { player: playerCardEl, enemy: enemyCardEl };

    Object.keys(slots).forEach(function (sideName) {
      const sideVisuals = visuals.filter(function (visual) {
        return visual.target === sideName;
      });
      const persistentKnockout = Boolean(
        game.winner && game.sides[sideName].hp <= 0
      );
      slots[sideName].classList.toggle(
        "is-knocked-out",
        persistentKnockout || sideVisuals.some(function (visual) {
          return visual.knockout;
        })
      );
      slots[sideName].classList.toggle(
        "is-reviving",
        sideVisuals.some(function (visual) { return visual.revive; })
      );
      sideVisuals.forEach(function (visual) {
        createCombatFx(cardElements[sideName], visual);
      });
    });
    dom.playerCardSlot.replaceChildren(playerCardEl);
    dom.enemyCardSlot.replaceChildren(enemyCardEl);

    dom.turnOwner.textContent = game.turn === "player" ? "나의 턴" : "상대의 턴";
    dom.turnNumber.textContent = String(Math.max(1, Math.ceil(game.turnNumber / 2)));
    dom.battleStars.textContent = "⭐ " + player.stars;
    dom.battleStars.setAttribute("aria-label", "나의 별사탕 " + player.stars + "개");
    dom.leaveBattleButton.disabled = busy;
    updateWeaknessHint(player.card, enemy.card);
    renderFragmentHand();
    renderActions();
  }

  function updateWeaknessHint(player, enemy) {
    const chart = window.CardEngine.TYPE_CHART[enemy.type];
    if (chart && chart.weakTo === player.type) {
      dom.weaknessHint.textContent = "약점 발견! 공격 데미지 ×2";
      dom.weaknessHint.style.color = "#ffe982";
    } else {
      dom.weaknessHint.textContent = "타입 약점을 노리면 ×2!";
      dom.weaknessHint.style.color = "";
    }
  }

  function showFragmentPreview(fragment, prompt) {
    dom.fragmentPreview.replaceChildren();
    if (!fragment) {
      dom.fragmentPreview.textContent = prompt || "이야기를 들으면 대결에서 쓸 조각이 생겨요.";
      return;
    }
    const name = document.createElement("strong");
    name.textContent = fragment.emoji + " " + fragment.name + " — ";
    dom.fragmentPreview.append(name, document.createTextNode(fragment.desc + " · " + prompt));
  }

  function usePlayerFragment(index) {
    if (busy || !game || game.turn !== "player" || game.winner) return;
    const before = game.sides.player.fragmentHand[index];
    if (!before || before.used) return;
    const next = window.CardEngine.performAction(game, {
      type: "fragment",
      fragmentIndex: index
    });
    const after = next.sides.player.fragmentHand[index];
    if (!after || !after.used) {
      showFragmentPreview(before, "지금은 이 조각을 사용할 수 없어요.");
      return;
    }

    game = next;
    selectedFragmentIndex = null;
    dom.battleMessage.textContent = "「" + before.name + "」 조각을 펼쳤어요! 이제 기술을 골라요.";
    setEffect(before.emoji);
    window.CardAudio.magic();
    renderBattle();
  }

  function handleFragmentTap(index) {
    if (!game || game.turn !== "player" || busy || game.winner) return;
    const fragment = game.sides.player.fragmentHand[index];
    if (!fragment || fragment.used || game.sides.player.flags.fragmentUsedThisTurn) return;
    if (selectedFragmentIndex === index) {
      usePlayerFragment(index);
      return;
    }

    selectedFragmentIndex = index;
    window.CardAudio.select();
    renderFragmentHand();
    showFragmentPreview(fragment, "한 번 더 누르면 사용해요.");
  }

  function renderFragmentHand() {
    dom.fragmentHand.replaceChildren();
    if (!game) return;
    const side = game.sides.player;
    const hand = Array.isArray(side.fragmentHand) ? side.fragmentHand : [];
    const usedThisTurn = Boolean(side.flags.fragmentUsedThisTurn);
    const canUse = !busy && game.turn === "player" && !game.winner && !usedThisTurn;
    const availableFragments = new Set(
      window.CardEngine.getAvailableFragmentActions(game).map(function (action) {
        return action.fragmentIndex;
      })
    );

    if (!hand.length) {
      const empty = document.createElement("div");
      empty.className = "fragment-empty";
      empty.textContent = "이야기를 더 들으면 대결에서 쓸 조각이 찾아와요.";
      dom.fragmentHand.appendChild(empty);
      showFragmentPreview(null);
      return;
    }

    hand.forEach(function (fragment, index) {
      const item = document.createElement("div");
      item.setAttribute("role", "listitem");
      const button = document.createElement("button");
      const inner = document.createElement("span");
      const front = document.createElement("span");
      const back = document.createElement("span");
      const emoji = document.createElement("span");
      const name = document.createElement("strong");

      button.type = "button";
      button.className = "fragment-chip fragment-kind-" + (fragment.kind || "story");
      button.classList.toggle("is-selected", selectedFragmentIndex === index && !fragment.used);
      button.classList.toggle("is-used", Boolean(fragment.used));
      button.disabled = Boolean(fragment.used) || !canUse || !availableFragments.has(index);
      button.setAttribute("aria-pressed", selectedFragmentIndex === index ? "true" : "false");
      button.setAttribute(
        "aria-label",
        fragment.used
          ? fragment.name + " 조각 사용함"
          : fragment.name + ". " + fragment.desc + ". " +
            (selectedFragmentIndex === index ? "다시 누르면 사용" : "누르면 미리보기")
      );

      inner.className = "fragment-chip-inner";
      front.className = "fragment-face fragment-front";
      back.className = "fragment-face fragment-back";
      emoji.className = "fragment-emoji";
      emoji.textContent = fragment.emoji;
      name.className = "fragment-name";
      name.textContent = fragment.name;
      back.textContent = "✓ 사용함";
      front.append(emoji, name);
      inner.append(front, back);
      button.appendChild(inner);
      button.addEventListener("click", function () { handleFragmentTap(index); });
      item.appendChild(button);
      dom.fragmentHand.appendChild(item);
    });

    dom.fragmentHelp.textContent = usedThisTurn
      ? "이번 턴 조각 사용 완료"
      : "한 번 눌러 보고, 다시 눌러 사용해요";
    if (usedThisTurn) {
      showFragmentPreview(null, "이번 턴에는 조각을 썼어요. 이제 기술을 골라요.");
    } else if (selectedFragmentIndex === null) {
      showFragmentPreview(null, "조각은 기술과 함께 한 턴에 하나만 쓸 수 있어요.");
    }
  }

  function isSupportedAttack(attack) {
    return window.CardEngine.isAttackSupported(attack);
  }

  function renderActions() {
    dom.actionList.replaceChildren();
    if (!game) return;
    const side = game.sides.player;
    const actions = window.CardEngine.getAvailableActions(game);
    const available = new Map(
      actions
        .filter(function (action) { return action.type === "attack"; })
        .map(function (action) { return [action.attackIndex, action]; })
    );
    const canRest = actions.some(function (action) { return action.type === "rest"; });

    side.card.attacks.forEach(function (attack, index) {
      if (!isSupportedAttack(attack)) return;
      const button = document.createElement("button");
      button.className = "action-button";
      button.type = "button";
      const availableAction = available.get(index);
      const discount = Number(side.status.fragmentDiscount) || 0;
      const effectiveCost = Math.max(0, Number(attack.cost) - discount);
      button.disabled = busy || game.turn !== "player" || !availableAction;

      const title = document.createElement("strong");
      title.textContent = attack.name;
      const detail = document.createElement("small");
      detail.textContent = attack.desc || (attack.dmg ? "데미지 " + attack.dmg : "특별한 효과");
      const cost = document.createElement("span");
      cost.className = "action-cost";
      cost.textContent = "⭐ " + (availableAction ? availableAction.cost : effectiveCost);
      if (effectiveCost < Number(attack.cost)) {
        cost.classList.add("is-discounted");
        cost.setAttribute("aria-label", "여의봉 할인 적용, 별사탕 " + effectiveCost + "개");
      }
      button.append(title, detail, cost);
      button.addEventListener("click", function () {
        performPlayerAction({ type: "attack", attackIndex: index });
      });
      dom.actionList.appendChild(button);
    });

    const rest = document.createElement("button");
    rest.className = "action-button rest-button";
    rest.type = "button";
    rest.disabled = busy || game.turn !== "player" || Boolean(game.winner) || !canRest;
    rest.innerHTML = "<strong>별사탕 모으기</strong><small>이번 턴은 쉬고 강한 기술을 준비해요</small><span class=\"action-cost\">+⭐</span>";
    rest.addEventListener("click", function () { performPlayerAction({ type: "rest" }); });
    dom.actionList.appendChild(rest);
  }

  function setEffect(text) {
    clearTimeout(effectTimer);
    dom.effectBurst.textContent = text;
    dom.effectBurst.classList.remove("show");
    void dom.effectBurst.offsetWidth;
    dom.effectBurst.classList.add("show");
    effectTimer = setTimeout(function () {
      dom.effectBurst.classList.remove("show");
    }, 600);
  }

  function describeEvents(events, actor) {
    const find = function (type) {
      return events.slice().reverse().find(function (event) { return event.type === type; });
    };
    const gameOver = find("game_over");
    const revive = find("revive");
    const miss = find("attack_missed");
    const evade = find("attack_evaded");
    const damage = find("damage");
    const heal = find("heal");
    const coin = find("coin");
    const rest = find("rest");
    const attack = find("attack");

    if (gameOver) return { effect: "K.O.!", message: gameOver.winner === "player" ? "상대 카드가 별빛으로 돌아갔어요!" : "우리 영웅이 잠시 쉬러 갔어요.", sound: "hit" };
    if (revive) return { effect: "부활!", message: "유리 구두가 한 번 더 빛났어요!", sound: "magic" };
    if (miss) return { effect: "빗나감!", message: "동전이 기술의 운명을 바꿨어요.", sound: "coin" };
    if (evade) return { effect: "회피!", message: "재빠르게 공격을 피했어요!", sound: "coin" };
    if (damage && damage.firstHitBlocked) {
      return { effect: "무효!", message: "첫 타격 방어가 공격을 완전히 막았어요!", sound: "magic" };
    }
    if (damage && damage.fragmentGuarded) {
      const owner = damage.target === "player" ? "내" : "상대의";
      return { effect: "막음!", message: owner + " 방어 조각이 공격을 완전히 막았어요!", sound: "magic" };
    }
    if (damage && damage.fragmentReducedBy > 0) {
      const owner = damage.target === "player" ? "내" : "상대의";
      return {
        effect: "-" + damage.amount,
        message: owner + " 방어 조각이 데미지를 " + damage.fragmentReducedBy + " 줄였어요!",
        sound: damage.amount > 0 ? "hit" : "magic",
        hit: damage.amount > 0 ? damage.target : null
      };
    }
    if (damage) return {
      effect: damage.weakness ? "×2!" : "-" + damage.amount,
      message: damage.weakness ? "약점을 정확히 맞혔어요!" : (damage.attack + " 공격!"),
      sound: damage.amount > 0 ? "hit" : "magic",
      hit: damage.amount > 0 ? damage.target : null
    };
    if (heal) return { effect: "+" + heal.amount, message: "따뜻한 마법으로 HP를 회복했어요.", sound: "magic" };
    if (coin) return { effect: coin.result === "heads" ? "앞면!" : "뒷면!", message: "운명의 동전이 빙글빙글!", sound: "coin" };
    if (rest) return { effect: "+⭐", message: actor === "player" ? "별사탕을 아껴 더 큰 기술을 준비해요." : "상대가 별사탕을 모으고 있어요.", sound: "star" };
    if (attack) return { effect: "공격!", message: attack.attack + "!", sound: "magic" };
    return { effect: "✦", message: "별빛이 다음 턴을 비춰요.", sound: "star" };
  }

  function playSound(name, actor) {
    const side = game && game.sides && game.sides[actor];
    if (
      (name === "hit" || name === "strongHit") &&
      side &&
      window.CardAudio.attack
    ) {
      window.CardAudio.attack(side.card.type, name === "strongHit");
      return;
    }
    if (window.CardAudio[name]) window.CardAudio[name]();
  }

  function soundForEvents(events, fallback) {
    const reversed = events.slice().reverse();
    const find = function (type) {
      return reversed.find(function (event) { return event.type === type; });
    };
    const damage = find("damage");
    const gameOver = find("game_over");

    if (gameOver) {
      const finishingDamage = reversed.find(function (event) {
        return event.type === "damage" &&
          event.target === gameOver.loser &&
          event.amount > 0;
      });
      if (finishingDamage) {
        return finishingDamage.weakness ? "strongHit" : "hit";
      }
      return "hit";
    }
    if (find("revive")) return "revive";
    if (find("attack_missed") || find("attack_evaded")) return null;
    if (damage) {
      if (damage.amount <= 0) return "cast";
      return damage.weakness ? "strongHit" : "hit";
    }
    if (find("heal")) return "heal";
    if (find("coin")) return null;
    if (find("attack")) return "cast";
    if (find("fragment_used")) return "magic";
    return fallback === "magic" ? "cast" : fallback;
  }

  function actionNeedsCoin(action) {
    return window.CardEngine.actionNeedsCoin(game, action);
  }

  function coinCopy(event) {
    const heads = event.result === "heads";
    if (event.reason === "coin_miss") {
      return heads ? "앞면! 기술이 명중해요!" : "뒷면! 기술이 빗나가요!";
    }
    if (event.reason === "coin_evade") {
      return heads ? "앞면! 공격을 멋지게 피했어요!" : "뒷면! 공격이 이어져요!";
    }
    if (event.reason === "attack_effect") {
      return heads ? "앞면! 특별 효과가 발동해요!" : "뒷면! 이번에는 효과가 없어요.";
    }
    if (event.reason === "fragment_oil") {
      return heads ? "앞면! 참기름을 딛고 기술 성공!" : "뒷면! 참기름에 미끄러졌어요!";
    }
    return heads ? "앞면이 나왔어요!" : "뒷면이 나왔어요!";
  }

  function coinTiming() {
    const reduced = window.matchMedia &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    return reduced
      ? { auto: 80, spin: 90, hold: 140 }
      : { auto: 360, spin: 780, hold: 720 };
  }

  function resetCoinFace() {
    const face = dom.coinButton.querySelector("span");
    dom.coinButton.classList.remove("is-flipping", "is-heads", "is-tails");
    face.textContent = "?";
  }

  function finishCoinAction(pending, nextGame) {
    if (!pending || pending.session !== battleSession) return;
    if (dom.coinDialog.open) dom.coinDialog.close();
    pendingCoinAction = null;
    game = nextGame;
    animateAction(pending.actor);
  }

  function revealCoinEvents(pending, nextGame, events, index) {
    if (!pending || pending.session !== battleSession) return;
    if (index >= events.length) {
      finishCoinAction(pending, nextGame);
      return;
    }

    const timing = coinTiming();
    const event = events[index];
    const face = dom.coinButton.querySelector("span");
    resetCoinFace();
    face.textContent = "✦";
    void dom.coinButton.offsetWidth;
    dom.coinButton.classList.add("is-flipping");
    dom.coinResult.textContent = "빙글빙글…";
    window.CardAudio.coinSpin();

    coinTimer = setTimeout(function () {
      if (pending.session !== battleSession) return;
      const heads = event.result === "heads";
      dom.coinButton.classList.remove("is-flipping");
      dom.coinButton.classList.add(heads ? "is-heads" : "is-tails");
      face.textContent = heads ? "앞" : "뒤";
      dom.coinResult.textContent = coinCopy(event);
      window.CardAudio.coinLand();

      coinTimer = setTimeout(function () {
        revealCoinEvents(pending, nextGame, events, index + 1);
      }, timing.hold);
    }, timing.spin);
  }

  function triggerCoinAction() {
    const pending = pendingCoinAction;
    if (!pending || pending.started || pending.session !== battleSession || !game) return;
    pending.started = true;
    dom.coinButton.disabled = true;
    dom.coinInstruction.textContent = "동전이 별빛 속에서 돌고 있어요.";
    const nextGame = window.CardEngine.performAction(game, pending.action);
    const coinEvents = (nextGame.events || []).filter(function (event) {
      return event.type === "coin";
    });
    revealCoinEvents(pending, nextGame, coinEvents, 0);
  }

  function beginCoinAction(actor, action) {
    busy = true;
    renderBattle();
    pendingCoinAction = {
      actor: actor,
      action: action,
      session: battleSession,
      started: false
    };
    resetCoinFace();
    dom.coinTitle.textContent = actor === "player"
      ? "운명의 동전을 던져요!"
      : "상대의 동전이 떠올랐어요!";
    dom.coinInstruction.textContent = actor === "player"
      ? "가운데 동전을 톡 눌러 판정을 시작하세요."
      : "잠시 뒤 동전이 저절로 돌아요.";
    dom.coinResult.textContent = actor === "player"
      ? "탭하면 기술의 운명이 정해져요"
      : "상대가 동전을 준비하고 있어요";
    dom.coinButton.disabled = actor !== "player";
    dom.coinButton.setAttribute(
      "aria-label",
      actor === "player" ? "동전 던지기" : "상대 동전 던지는 중"
    );
    if (!dom.coinDialog.open) dom.coinDialog.showModal();

    if (actor === "player") {
      dom.coinButton.focus();
    } else {
      coinTimer = setTimeout(triggerCoinAction, coinTiming().auto);
    }
  }

  function restartArenaImpact(weak, monster) {
    clearTimeout(impactTimer);
    dom.arena.classList.remove("is-weak-hit", "is-monster-hit");
    void dom.arena.offsetWidth;
    if (weak) dom.arena.classList.add("is-weak-hit");
    if (monster) dom.arena.classList.add("is-monster-hit");
    impactTimer = setTimeout(function () {
      dom.arena.classList.remove("is-weak-hit", "is-monster-hit");
    }, 580);
  }

  function animateAction(actor) {
    const session = battleSession;
    const events = game.events || [];
    const description = describeEvents(events, actor);
    const visuals = actionVisualsForEvents(events, actor, game);
    const impactFlags = impactFlagsForVisuals(visuals);
    const fragmentEvent = events.slice().reverse().find(function (event) {
      return event.type === "fragment_used";
    });
    if (fragmentEvent) {
      const owner = fragmentEvent.actor === "enemy" ? "상대가" : "내 영웅이";
      description.message = owner + " 「" + (fragmentEvent.fragment || fragmentEvent.name) + "」 조각 사용. " + description.message;
    }
    busy = true;
    dom.battleMessage.textContent = description.message;
    setEffect(description.effect);
    renderBattle({
      acting: actor,
      visuals: visuals
    });
    if (impactFlags.weak || impactFlags.monster) {
      restartArenaImpact(impactFlags.weak, impactFlags.monster);
    }
    playSound(soundForEvents(events, description.sound), actor);

    actionTimer = setTimeout(function () {
      if (session !== battleSession || !game) return;
      renderBattle();
      if (game.winner) {
        finishBattle();
      } else if (game.turn === "enemy") {
        dom.battleMessage.textContent = "상대가 별사탕을 살펴보고 있어요…";
        enemyTimer = setTimeout(function () {
          if (session === battleSession) runEnemyTurn();
        }, 700);
      } else {
        busy = false;
        dom.battleMessage.textContent = "나의 턴! 기술을 골라 주세요.";
        renderBattle();
        window.CardAudio.turn();
      }
    }, 850);
  }

  function performPlayerAction(action) {
    if (busy || !game || game.turn !== "player" || game.winner) return;
    selectedFragmentIndex = null;
    if (actionNeedsCoin(action)) {
      beginCoinAction("player", action);
    } else {
      game = window.CardEngine.performAction(game, action);
      animateAction("player");
    }
  }

  function runEnemyTurn() {
    if (!game || game.winner || game.turn !== "enemy") return;
    const action = window.CardEngine.chooseAiAction(game, Math.random) || { type: "rest" };
    if (actionNeedsCoin(action)) {
      beginCoinAction("enemy", action);
    } else {
      game = window.CardEngine.performAction(game, action);
      animateAction("enemy");
    }
  }

  function finishBattle() {
    const session = battleSession;
    busy = true;
    const victory = game.winner === "player";
    dom.resultKicker.textContent = victory ? "별빛 승리" : "멋진 도전";
    dom.resultTitle.textContent = victory ? selectedCard.name + " 승리!" : "다음에는 이길 수 있어요!";
    dom.resultText.textContent = victory
      ? "이야기 속 용기와 지혜가 멋진 기술이 되었어요."
      : "카드의 약점과 별사탕 비용을 보고 다시 작전을 세워 봐요.";
    victory ? window.CardAudio.win() : window.CardAudio.lose();
    resultTimer = setTimeout(function () {
      if (session === battleSession && game && !dom.resultDialog.open) {
        dom.resultDialog.showModal();
      }
    }, 350);
  }

  function returnToCollection() {
    resetBattleFlow();
    if (dom.resultDialog.open) dom.resultDialog.close();
    game = null;
    busy = false;
    showScreen("collection");
    renderCollection();
  }

  function bindEvents() {
    dom.battleButton.addEventListener("click", startBattle);
    dom.leaveBattleButton.addEventListener("click", returnToCollection);
    dom.rematchButton.addEventListener("click", function () {
      dom.resultDialog.close();
      startBattle();
    });
    dom.resultCollectionButton.addEventListener("click", returnToCollection);
    dom.coinButton.addEventListener("click", triggerCoinAction);
    dom.coinDialog.addEventListener("cancel", function (event) {
      event.preventDefault();
    });

    document.querySelectorAll("[data-close-dialog]").forEach(function (button) {
      button.addEventListener("click", function () {
        const dialog = button.closest("dialog");
        if (dialog) dialog.close();
      });
    });

    dom.muteButton.addEventListener("click", function () {
      const next = !window.CardAudio.isMuted();
      window.CardAudio.setMuted(next);
      updateMuteButton();
    });

    window.addEventListener("pageshow", refreshUnlocks);
    document.addEventListener("visibilitychange", function () {
      if (document.visibilityState === "visible") refreshUnlocks();
    });
  }

  function updateMuteButton() {
    const muted = window.CardAudio.isMuted();
    dom.muteButton.textContent = muted ? "🔇" : "🔊";
    dom.muteButton.setAttribute("aria-pressed", muted ? "true" : "false");
    dom.muteButton.setAttribute("aria-label", muted ? "소리 켜기" : "소리 끄기");
  }

  async function init() {
    cacheDom();
    bindEvents();
    updateMuteButton();
    try {
      const response = await fetch("cards.json", { cache: "no-store" });
      if (!response.ok) throw new Error("카드 데이터를 불러오지 못했습니다.");
      const data = await response.json();
      fragments = Array.isArray(data.fragments) ? data.fragments : [];
      const collectionIds = Array.isArray(data.collection) ? data.collection : [];
      cards = collectionIds.map(function (id) {
        return data.cards.find(function (card) { return card.id === id; });
      }).filter(function (card) {
        return Boolean(card);
      });
      if (!cards.length || cards.length !== collectionIds.length) {
        throw new Error("컬렉션 카드 목록이 비었거나 데이터와 일치하지 않습니다.");
      }
      battleCards = cards.filter(isPlayableCard);
      const requested = new URLSearchParams(location.search).get("card");
      selectedCard = cards.find(function (card) {
        return card.id === requested && isUnlocked(card) && isPlayableCard(card);
      }) || battleCards.find(isUnlocked) || null;
      renderCollection();
      if (new URLSearchParams(location.search).get("battle") === "1" &&
          selectedCard && isPlayableCard(selectedCard)) {
        startBattle();
      }
    } catch (error) {
      dom.collectionGrid.innerHTML = '<p class="load-error">카드가 잠시 길을 잃었어요. 새로고침해 주세요.</p>';
      console.error(error);
    }
  }

  window.CardBattleFx = Object.freeze({
    actionVisualsForEvents: actionVisualsForEvents,
    impactFlagsForVisuals: impactFlagsForVisuals,
    soundForEvents: soundForEvents
  });

  document.addEventListener("DOMContentLoaded", init);
}());
