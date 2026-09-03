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
  let detailCard = null;
  let detailOrigin = null;
  let selectedFragmentIndex = null;
  let enemyIntent = null;
  let storyChallenge = null;
  let game = null;
  let busy = false;
  let effectTimer = 0;
  let actionTimer = 0;
  let enemyTimer = 0;
  let resultTimer = 0;
  let coinTimer = 0;
  let impactTimer = 0;
  let techniqueImpactTimer = 0;
  let hitStopTimer = 0;
  let quizTimer = 0;
  let techniquePoolCursor = 0;
  let combatParticleFrame = 0;
  let combatParticleContext = null;
  let combatParticleMetrics = { width: 0, height: 0, dpr: 1 };
  let battleSession = 0;
  let pendingCoinAction = null;
  let unlockSnapshot = "";
  let tiltFrame = 0;
  let tiltingCard = null;

  function byId(id) {
    return document.getElementById(id);
  }

  function cacheDom() {
    [
      "collectionScreen", "battleScreen", "collectionGrid", "unlockCount",
      "selectionDock", "selectedPortrait", "selectedStatus", "selectedName",
      "battleButton", "battleButtonLabel",
      "muteButton", "musicButton", "leaveBattleButton", "turnOwner", "turnNumber",
      "battleStars", "arena", "enemyCardSlot", "playerCardSlot", "battleMessage",
      "effectBurst", "combatParticleCanvas", "techniqueFxLayer", "actionList",
      "weaknessHint", "enemyIntent", "enemyIntentIcon", "enemyIntentName",
      "enemyIntentDetail", "enemyIntentBadge", "storyGateBar", "storyGateStatus",
      "storyGateButton", "storyQuizDialog", "storyQuizTitle", "storyQuizQuestion",
      "storyQuizChoices", "storyQuizResult", "cardDetailDialog", "cardDetailCard",
      "cardDetailTitle", "cardDetailStatus", "detailSelectButton", "lockedDialog",
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

  // 같은 카드로 연달아 대결해도 같은 문제가 반복되지 않게 최근 3문항을 기억한다.
  function quizMemoryKey(cardId) {
    return "cards_quiz_recent_" + cardId;
  }

  function readRecentQuizIds(cardId) {
    try {
      const raw = localStorage.getItem(quizMemoryKey(cardId));
      const list = raw ? JSON.parse(raw) : [];
      return Array.isArray(list) ? list.filter(function (id) { return typeof id === "string"; }) : [];
    } catch (error) {
      return [];
    }
  }

  function rememberQuizId(cardId, questionId) {
    try {
      const next = readRecentQuizIds(cardId).filter(function (id) { return id !== questionId; });
      next.push(questionId);
      localStorage.setItem(quizMemoryKey(cardId), JSON.stringify(next.slice(-3)));
    } catch (error) {}
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
    if (dom.cardDetailDialog.open) closeCardDetail();
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
        interactive: true,
        compact: true,
        collectionCompact: true,
        eager: card.id === "cinderella",
        onSelect: function (chosenCard, chosenElement) {
          window.CardAudio.prime();
          if (locked) {
            openLockedDialog(card);
            return;
          }
          openCardDetail(chosenCard, chosenElement);
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
  function closeCardDetail() {
    if (dom.cardDetailDialog.open) dom.cardDetailDialog.close();
  }

  function openCardDetail(card, cardEl) {
    detailCard = card;
    detailOrigin = cardEl;
    const playable = isPlayableCard(card);
    const detailView = window.CardView.create(card, {
      collectionOnly: !playable,
      eager: true
    });
    dom.cardDetailTitle.textContent = card.name;
    dom.cardDetailCard.replaceChildren(detailView);
    dom.cardDetailStatus.textContent = playable
      ? "기술과 특성을 확인했어요. 이 영웅으로 출전할까요?"
      : "컬렉션 전용 카드예요. 대전은 다음 모험에서 열려요.";
    dom.detailSelectButton.disabled = !playable;
    dom.detailSelectButton.textContent = playable ? "출전 선택" : "대전 준비 중";
    dom.detailSelectButton.setAttribute(
      "aria-label",
      playable ? card.name + " 출전 선택" : card.name + " 카드는 대전 준비 중"
    );
    dom.cardDetailDialog.showModal();
    window.CardAudio.select();
  }


  function selectCard(card, cardEl) {
    if (!isPlayableCard(card)) return;
    const previous = dom.collectionGrid.querySelector(".story-card.is-selected");
    const selected = cardEl || dom.collectionGrid.querySelector(
      '[data-card-id="' + card.id + '"]'
    );
    if (previous && previous !== selected) {
      previous.classList.remove("is-selected");
      previous.setAttribute("aria-pressed", "false");
    }
    selectedCard = card;
    if (selected) {
      selected.classList.add("is-selected");
      selected.setAttribute("aria-pressed", "true");
    }
    window.CardAudio.select();
    updateSelectionDock();
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
    if (window.CardAudio.setScene) {
      window.CardAudio.setScene(battle ? "battle" : "collection");
    }
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
    clearTimeout(techniqueImpactTimer);
    clearTimeout(hitStopTimer);
    clearTimeout(quizTimer);
    if (dom.arena) {
      dom.arena.classList.remove("is-weak-hit", "is-monster-hit", "is-finisher-hit");
    }
    [dom.playerCardSlot, dom.enemyCardSlot].forEach(function (slot) {
      if (slot) {
        slot.classList.remove("is-dodging", "is-hit-stopped");
        clearTechniqueImpactState(slot);
      }
    });
    if (dom.techniqueFxLayer) {
      Array.from(dom.techniqueFxLayer.children).forEach(resetTechniqueNode);
    }
    resetCombatParticleStage();
    pendingCoinAction = null;
    selectedFragmentIndex = null;
    enemyIntent = null;
    storyChallenge = null;
    if (dom.coinDialog && dom.coinDialog.open) dom.coinDialog.close();
    if (dom.storyQuizDialog && dom.storyQuizDialog.open) dom.storyQuizDialog.close();
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
    storyChallenge = window.CardStoryGates &&
      typeof window.CardStoryGates.getForCard === "function"
      ? window.CardStoryGates.getForCard(selectedCard, Math.random, {
          avoidIds: readRecentQuizIds(selectedCard.id)
        })
      : null;
    if (storyChallenge) rememberQuizId(selectedCard.id, storyChallenge.id);
    game = window.CardEngine.createGame(selectedCard, enemy, {
      playerFragments: window.CardEngine.drawFragments(fragmentPool, Math.random, 3),
      enemyFragments: window.CardEngine.drawFragments(fragmentPool, Math.random, 3)
    });
    prepareEnemyIntent(true);
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
    art.querySelectorAll(".combat-fx").forEach(function (previous) {
      previous.remove();
    });
    const layer = document.createElement("div");
    layer.className = "combat-fx" + (attackType ? " fx-type-" + attackType : "");
    layer.setAttribute("aria-hidden", "true");

    if (visual.impact) {
      layer.appendChild(createFxPart("fx-hit-flash"));
    }
    if (visual.guarded) {
      layer.appendChild(createFxPart("fx-guard-dome"));
      layer.appendChild(createFxPart("fx-guard-ripple"));
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
    setTimeout(function () {
      if (layer.isConnected) {
        layer.remove();
      }
    }, visual.guarded ? 900 : 680);
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
          revive: false,
          guarded: false,
          guardReducedBy: 0
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
        visual.guarded = visual.guarded || Boolean(event.guarded || event.guardReducedBy > 0);
        visual.guardReducedBy += Math.max(0, Number(event.guardReducedBy) || 0);
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

  const TECHNIQUE_TIMINGS = Object.freeze({
    projectile: Object.freeze({ impactAtMs: 640, totalMs: 840 }),
    summon: Object.freeze({ impactAtMs: 635, totalMs: 960 }),
    strike: Object.freeze({ impactAtMs: 275, totalMs: 720 }),
    burst: Object.freeze({ impactAtMs: 350, totalMs: 800 }),
    aura: Object.freeze({ impactAtMs: 270, totalMs: 760 }),
    debuff: Object.freeze({ impactAtMs: 350, totalMs: 800 })
  });
  const COMBAT_PARTICLE_CONFIG = Object.freeze({
    capacity: 120,
    dprCap: 1.5,
    bigMultiplier: 1.4
  });
  const FX_PALETTES = Object.freeze({
    brave: Object.freeze({
      hot: "#fff2bd",
      primary: "#ffc04f",
      secondary: "#ff6036",
      shadow: "#8d2e22"
    }),
    wise: Object.freeze({
      hot: "#e6fbff",
      primary: "#62dfff",
      secondary: "#386cff",
      shadow: "#183d88"
    }),
    magic: Object.freeze({
      hot: "#fff0ff",
      primary: "#e6a2ff",
      secondary: "#7850ff",
      shadow: "#4b2787"
    }),
    monster: Object.freeze({
      hot: "#f5dfb4",
      primary: "#d5a86f",
      secondary: "#8d5b37",
      shadow: "#4e352b"
    })
  });
  const MATERIAL_PALETTES = Object.freeze({
    stone: Object.freeze({
      hot: "#fff3d5",
      primary: "#9da5a4",
      secondary: "#b97943",
      shadow: "#4f3b32"
    }),
    metal: Object.freeze({
      hot: "#fff8cf",
      primary: "#efc35b",
      secondary: "#c98237",
      shadow: "#754322"
    }),
    ice: Object.freeze({
      hot: "#fffaff",
      primary: "#b9e9f5",
      secondary: "#8d75d7",
      shadow: "#3d4f83"
    }),
    earth: Object.freeze({
      hot: "#fff0cf",
      primary: "#c69a62",
      secondary: "#8f6044",
      shadow: "#49362f"
    })
  });

  function paletteForPlan(plan) {
    return MATERIAL_PALETTES[plan && plan.material] ||
      FX_PALETTES[plan && plan.type] ||
      FX_PALETTES.magic;
  }

  function recipeForAttack(side, attackEvent) {
    if (
      !side || !side.card || !attackEvent ||
      !window.CardVfxRecipes ||
      typeof window.CardVfxRecipes.get !== "function"
    ) {
      return null;
    }
    return window.CardVfxRecipes.get(side.card.id, attackEvent.attackIndex);
  }

  function warmTechniqueAssets() {
    const registry = window.CardVfxRecipes && window.CardVfxRecipes.all;
    if (!registry || typeof window.Image !== "function") return;
    const assets = new Set();
    Object.keys(registry).forEach(function (key) {
      const recipe = registry[key];
      if (recipe && recipe.asset) assets.add(recipe.asset);
    });
    assets.forEach(function (source) {
      const image = new window.Image();
      image.decoding = "async";
      image.src = source;
      if (typeof image.decode === "function") {
        image.decode().catch(function () {
          return null;
        });
      }
    });
  }
  const PARTICLE_RECIPES = Object.freeze({
    projectile: Object.freeze({
      motion: "quadratic-arc",
      shape: "spark",
      blend: "lighter",
      launchCount: 7,
      impactCount: 18,
      lifeMs: 360
    }),
    summon: Object.freeze({
      motion: "portal-dash",
      shape: "shard",
      blend: "lighter",
      launchCount: 12,
      impactCount: 16,
      lifeMs: 420
    }),
    strike: Object.freeze({
      motion: "cross-slash",
      shape: "streak",
      blend: "lighter",
      launchCount: 5,
      impactCount: 20,
      lifeMs: 300
    }),
    burst: Object.freeze({
      motion: "seal-collapse",
      shape: "shard",
      blend: "lighter",
      launchCount: 8,
      impactCount: 28,
      lifeMs: 430
    }),
    aura: Object.freeze({
      motion: "rising-ribbon",
      shape: "mote",
      blend: "lighter",
      launchCount: 18,
      impactCount: 8,
      lifeMs: 520
    }),
    debuff: Object.freeze({
      motion: "ink-clamp",
      shape: "dust",
      blend: "source-over",
      launchCount: 14,
      impactCount: 12,
      lifeMs: 460
    })
  });
  const combatParticles = Array.from(
    { length: COMBAT_PARTICLE_CONFIG.capacity },
    function () {
      return {
        active: false,
        x: 0,
        y: 0,
        vx: 0,
        vy: 0,
        age: 0,
        life: 1,
        size: 1,
        color: "#fff",
        shape: "mote",
        gravity: 0,
        drag: 1,
        rotation: 0,
        spin: 0,
        blend: "lighter",
        material: ""
      };
    }
  );
  const combatJourneys = [];
  let combatParticleCursor = 0;
  let combatParticleLastAt = 0;

  function prefersReducedMotion() {
    return Boolean(
      window.matchMedia &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches
    );
  }

  function techniquePlanForEvents(events, battleState, actor, reducedMotion) {
    const sourceEvents = Array.isArray(events) ? events : [];
    const attackEvent = sourceEvents.slice().reverse().find(function (event) {
      return event.type === "attack";
    });
    if (!attackEvent) return null;

    const state = battleState || game;
    const side = state && state.sides && state.sides[actor];
    const attack = side && side.card && Array.isArray(side.card.attacks)
      ? side.card.attacks[attackEvent.attackIndex]
      : null;
    const recipe = recipeForAttack(side, attackEvent);
    const declaredVfx = attackEvent.vfx || (attack && attack.vfx) || {};
    const kind = Object.prototype.hasOwnProperty.call(
      TECHNIQUE_TIMINGS,
      declaredVfx.kind
    ) ? declaredVfx.kind : "burst";
    const damages = sourceEvents.filter(function (event) {
      return event.type === "damage" || event.type === "self_damage";
    });
    const evaded = sourceEvents.some(function (event) {
      return event.type === "attack_evaded";
    });
    const missed = sourceEvents.some(function (event) {
      return event.type === "attack_missed";
    });
    const actualImpact = damages.some(function (event) {
      return Math.max(0, Number(event.amount) || 0) > 0;
    });
    const blocked = damages.some(function (event) {
      return Math.max(0, Number(event.amount) || 0) === 0;
    });
    const outcome = evaded
      ? "evade"
      : missed ? "miss" : actualImpact ? "hit" : blocked ? "blocked" : "support";
    const baseTiming = TECHNIQUE_TIMINGS[kind];
    const reduced = Boolean(reducedMotion);
    const contact = actualImpact || blocked;

    return {
      actor: actor,
      target: outcome === "support" && kind === "aura"
        ? actor
        : (attackEvent.target || (actor === "player" ? "enemy" : "player")),
      attack: attackEvent.attack || (attack && attack.name) || "기술",
      kind: kind,
      emoji: declaredVfx.emoji || "✦",
      big: Boolean(declaredVfx.big),
      recipe: recipe,
      recipeId: recipe ? recipe.id : "",
      material: recipe ? recipe.material : "",
      outcome: outcome,
      actualImpact: actualImpact,
      weakness: damages.some(function (event) {
        return Boolean(event.weakness && Number(event.amount) > 0);
      }),
      type: side && side.card ? side.card.type : "magic",
      hitStopMs: reduced || !contact
        ? 0
        : Math.max(
          28,
          Math.min(55, Number(recipe && recipe.hitStopMs) ||
            (declaredVfx.big ? 48 : 36))
        ),
      recoilPx: Number(recipe && recipe.recoilPx) || (declaredVfx.big ? 8 : 5),
      impactAtMs: reduced ? 0 : baseTiming.impactAtMs,
      totalMs: reduced ? 20 : baseTiming.totalMs
    };
  }

  function particleRecipeForPlan(plan, reducedMotion) {
    const source = PARTICLE_RECIPES[plan && plan.kind] || PARTICLE_RECIPES.burst;
    const custom = plan && plan.recipe;
    const reduced = Boolean(reducedMotion);
    const noContact = plan && ["miss", "evade", "support"].includes(plan.outcome);
    const multiplier = custom ? 1 : (plan && plan.big ? COMBAT_PARTICLE_CONFIG.bigMultiplier : 1);
    const launchBase = Number(custom && custom.launchCount) || source.launchCount;
    const impactBase = Number(custom && custom.impactCount) || source.impactCount;
    const launchCount = reduced ? 0 : Math.round(launchBase * multiplier);
    const impactCount = reduced || noContact
      ? 0
      : Math.round(impactBase * multiplier);
    return {
      motion: source.motion,
      shape: custom && custom.impactShape || source.shape,
      blend: plan && plan.material === "earth" ? "source-over" : source.blend,
      material: plan && plan.material || "",
      launchCount: launchCount,
      impactCount: impactCount,
      total: Math.min(
        COMBAT_PARTICLE_CONFIG.capacity,
        launchCount + impactCount
      ),
      lifeMs: source.lifeMs
    };
  }

  function fxClock() {
    return window.performance && typeof window.performance.now === "function"
      ? window.performance.now()
      : Date.now();
  }

  function getCombatParticleContext() {
    if (!dom.combatParticleCanvas) return null;
    if (!combatParticleContext) {
      combatParticleContext = dom.combatParticleCanvas.getContext("2d", {
        alpha: true,
        desynchronized: true
      });
    }
    return combatParticleContext;
  }

  function resizeCombatParticleCanvas() {
    const context = getCombatParticleContext();
    if (!context) return null;
    const rect = dom.combatParticleCanvas.getBoundingClientRect();
    const width = Math.max(1, Math.round(rect.width));
    const height = Math.max(1, Math.round(rect.height));
    const dpr = Math.min(
      Math.max(1, Number(window.devicePixelRatio) || 1),
      COMBAT_PARTICLE_CONFIG.dprCap
    );
    const physicalWidth = Math.round(width * dpr);
    const physicalHeight = Math.round(height * dpr);
    if (
      dom.combatParticleCanvas.width !== physicalWidth ||
      dom.combatParticleCanvas.height !== physicalHeight
    ) {
      dom.combatParticleCanvas.width = physicalWidth;
      dom.combatParticleCanvas.height = physicalHeight;
      combatParticleMetrics = { width: width, height: height, dpr: dpr };
      context.setTransform(dpr, 0, 0, dpr, 0, 0);
    }
    return context;
  }

  function clearCombatParticleCanvas() {
    const context = getCombatParticleContext();
    if (!context) return;
    context.save();
    context.setTransform(1, 0, 0, 1, 0, 0);
    context.clearRect(
      0,
      0,
      dom.combatParticleCanvas.width,
      dom.combatParticleCanvas.height
    );
    context.restore();
  }

  function cancelCombatParticleFrame() {
    if (!combatParticleFrame) return;
    if (typeof window.cancelAnimationFrame === "function") {
      window.cancelAnimationFrame(combatParticleFrame);
    } else {
      clearTimeout(combatParticleFrame);
    }
    combatParticleFrame = 0;
  }

  function resetCombatParticleStage() {
    cancelCombatParticleFrame();
    combatJourneys.length = 0;
    combatParticles.forEach(function (particle) {
      particle.active = false;
    });
    combatParticleLastAt = 0;
    clearCombatParticleCanvas();
  }

  function claimCombatParticle() {
    for (let offset = 0; offset < combatParticles.length; offset += 1) {
      const index = (combatParticleCursor + offset) % combatParticles.length;
      if (!combatParticles[index].active) {
        combatParticleCursor = (index + 1) % combatParticles.length;
        return combatParticles[index];
      }
    }
    const fallback = combatParticles[combatParticleCursor];
    combatParticleCursor = (combatParticleCursor + 1) % combatParticles.length;
    return fallback;
  }

  function emitCombatParticle(
    x,
    y,
    vx,
    vy,
    life,
    size,
    color,
    shape,
    gravity,
    drag,
    spin,
    blend,
    material
  ) {
    const particle = claimCombatParticle();
    particle.active = true;
    particle.x = x;
    particle.y = y;
    particle.vx = vx;
    particle.vy = vy;
    particle.age = 0;
    particle.life = Math.max(120, life);
    particle.size = size;
    particle.color = color;
    particle.shape = shape;
    particle.gravity = gravity;
    particle.drag = drag;
    particle.rotation = Math.random() * Math.PI * 2;
    particle.spin = spin;
    particle.blend = blend;
    particle.material = material || "";
  }

  function drawParticleShape(context, particle, alpha) {
    const size = particle.size;
    context.save();
    context.globalCompositeOperation = particle.blend;
    context.globalAlpha = alpha;
    context.translate(particle.x, particle.y);
    context.rotate(particle.rotation);
    context.fillStyle = particle.color;
    context.strokeStyle = particle.color;
    context.lineCap = "round";

    if (particle.shape === "spark") {
      context.beginPath();
      context.moveTo(0, -size * 1.8);
      context.lineTo(size * 0.38, -size * 0.38);
      context.lineTo(size * 1.8, 0);
      context.lineTo(size * 0.38, size * 0.38);
      context.lineTo(0, size * 1.8);
      context.lineTo(-size * 0.38, size * 0.38);
      context.lineTo(-size * 1.8, 0);
      context.lineTo(-size * 0.38, -size * 0.38);
      context.closePath();
      context.fill();
    } else if (particle.shape === "stone-chip") {
      context.beginPath();
      context.moveTo(size * 1.4, -size * 0.18);
      context.lineTo(size * 0.42, size * 0.92);
      context.lineTo(-size * 1.18, size * 0.45);
      context.lineTo(-size * 0.88, -size * 0.72);
      context.lineTo(size * 0.32, -size * 0.94);
      context.closePath();
      context.fill();
    } else if (particle.shape === "round-stone") {
      context.beginPath();
      context.ellipse(0, 0, size * 1.25, size * 0.88, 0, 0, Math.PI * 2);
      context.fill();
    } else if (particle.shape === "ice-shard") {
      context.beginPath();
      context.moveTo(size * 1.9, 0);
      context.lineTo(0, size * 0.5);
      context.lineTo(-size * 1.45, 0);
      context.lineTo(0, -size * 0.5);
      context.closePath();
      context.fill();
      context.globalAlpha = alpha * 0.72;
      context.lineWidth = Math.max(0.7, size * 0.18);
      context.strokeStyle = "#fff";
      context.stroke();
    } else if (particle.shape === "metal-spark") {
      context.lineWidth = Math.max(1, size * 0.34);
      context.beginPath();
      context.moveTo(-size * 2.4, 0);
      context.quadraticCurveTo(0, -size * 0.28, size * 1.8, 0);
      context.stroke();
      context.beginPath();
      context.arc(size * 1.8, 0, size * 0.32, 0, Math.PI * 2);
      context.fill();
    } else if (particle.shape === "shard") {
      context.beginPath();
      context.moveTo(size * 1.9, 0);
      context.lineTo(-size * 0.75, size * 0.48);
      context.lineTo(-size * 0.45, -size * 0.62);
      context.closePath();
      context.fill();
    } else if (particle.shape === "streak") {
      context.lineWidth = Math.max(1, size * 0.42);
      context.beginPath();
      context.moveTo(-size * 2.2, 0);
      context.lineTo(size * 1.5, 0);
      context.stroke();
    } else {
      context.beginPath();
      context.arc(0, 0, size, 0, Math.PI * 2);
      context.fill();
    }
    context.restore();
  }

  function traceQuadratic(context, points, from, to) {
    const steps = 10;
    for (let index = 0; index <= steps; index += 1) {
      const t = from + (to - from) * index / steps;
      const inverse = 1 - t;
      const x = inverse * inverse * points.startX +
        2 * inverse * t * points.midX +
        t * t * points.endX;
      const y = inverse * inverse * points.startY +
        2 * inverse * t * points.midY +
        t * t * points.endY;
      if (index === 0) context.moveTo(x, y);
      else context.lineTo(x, y);
    }
  }

  function strokeQuadraticRibbon(context, points, progress, palette) {
    const start = Math.max(0, progress - 0.36);
    [
      { width: 26, color: palette.secondary, alpha: 0.13 },
      { width: 12, color: palette.primary, alpha: 0.48 },
      { width: 3.2, color: palette.hot, alpha: 0.95 }
    ].forEach(function (layer) {
      context.beginPath();
      traceQuadratic(context, points, start, progress);
      context.strokeStyle = layer.color;
      context.globalAlpha = layer.alpha * Math.min(1, progress * 5);
      context.lineWidth = layer.width;
      context.lineCap = "round";
      context.stroke();
    });
  }

  function drawJourneyPrelude(context, journey, now) {
    const plan = journey.plan;
    const points = journey.points;
    const palette = paletteForPlan(plan);
    const elapsed = Math.max(0, now - journey.startedAt);
    const impactDuration = Math.max(1, plan.impactAtMs);
    const progress = Math.min(1, elapsed / impactDuration);
    const pulse = 0.72 + Math.sin(elapsed * 0.028) * 0.18;
    context.save();
    context.globalCompositeOperation = plan.type === "monster"
      ? "source-over"
      : "lighter";

    if (plan.kind === "projectile") {
      strokeQuadraticRibbon(context, points, progress, palette);
      if (elapsed - journey.lastEmitAt > 50 && progress < 1) {
        const inverse = 1 - progress;
        const x = inverse * inverse * points.startX +
          2 * inverse * progress * points.midX +
          progress * progress * points.endX;
        const y = inverse * inverse * points.startY +
          2 * inverse * progress * points.midY +
          progress * progress * points.endY;
        emitCombatParticle(
          x,
          y,
          (Math.random() - 0.5) * 0.025,
          (Math.random() - 0.5) * 0.02,
          260,
          1.8 + Math.random() * 2,
          Math.random() > 0.45 ? palette.primary : palette.hot,
          "mote",
          -0.00001,
          0.988,
          0.004,
          "lighter",
          plan.material
        );
        journey.lastEmitAt = elapsed;
      }
    } else if (plan.kind === "summon") {
      const portalProgress = Math.min(1, elapsed / 180);
      context.lineCap = "round";
      [0, Math.PI].forEach(function (offset, index) {
        context.beginPath();
        context.ellipse(
          points.startX,
          points.startY + 10,
          48 + index * 11,
          17 + index * 4,
          elapsed * (index ? -0.0025 : 0.003),
          offset + 0.2,
          offset + Math.PI * 0.78
        );
        context.strokeStyle = index ? palette.primary : palette.hot;
        context.lineWidth = index ? 3 : 1.5;
        context.globalAlpha = (1 - Math.max(0, progress - 0.58)) *
          portalProgress * 0.76;
        context.stroke();
      });
      if (progress > 0.35) {
        const dash = (progress - 0.35) / 0.65;
        context.beginPath();
        context.moveTo(
          points.startX + (points.endX - points.startX) * Math.max(0, dash - 0.32),
          points.startY + (points.endY - points.startY) * Math.max(0, dash - 0.32)
        );
        context.lineTo(
          points.startX + (points.endX - points.startX) * dash,
          points.startY + (points.endY - points.startY) * dash
        );
        context.strokeStyle = palette.primary;
        context.globalAlpha = 0.55;
        context.lineWidth = 10;
        context.stroke();
      }
    } else if (plan.kind === "strike") {
      const draw = Math.max(0, Math.min(1, progress * 1.5 - 0.18));
      context.lineCap = "round";
      [-1, 1].forEach(function (direction, index) {
        context.beginPath();
        context.moveTo(
          points.endX - 110 * draw,
          points.endY + direction * 64 * draw
        );
        context.quadraticCurveTo(
          points.endX,
          points.endY - direction * 24,
          points.endX + 104 * draw,
          points.endY - direction * 61 * draw
        );
        context.strokeStyle = index ? palette.primary : palette.hot;
        context.globalAlpha = draw * (index ? 0.46 : 0.92);
        context.lineWidth = index ? 9 : 2.4;
        context.stroke();
      });
    } else if (plan.kind === "burst") {
      [1, 1.35, 1.72].forEach(function (scale, index) {
        context.beginPath();
        context.arc(
          points.endX,
          points.endY,
          (76 - progress * 44) * scale,
          elapsed * 0.0025 + index * 1.5,
          elapsed * 0.0025 + index * 1.5 + Math.PI * 1.2
        );
        context.strokeStyle = index === 1 ? palette.hot : palette.primary;
        context.globalAlpha = progress * (0.58 - index * 0.1);
        context.lineWidth = index === 1 ? 2 : 4;
        context.stroke();
      });
    } else if (plan.kind === "aura") {
      context.beginPath();
      context.ellipse(
        points.endX,
        points.endY + 24,
        78 * pulse,
        21 * pulse,
        0,
        0,
        Math.PI * 2
      );
      context.strokeStyle = palette.primary;
      context.globalAlpha = 0.62 * (1 - progress * 0.36);
      context.lineWidth = 3;
      context.stroke();
      context.beginPath();
      context.moveTo(points.endX - 18, points.endY + 25);
      context.bezierCurveTo(
        points.endX - 38,
        points.endY - 15,
        points.endX + 28,
        points.endY - 52,
        points.endX + 4,
        points.endY - 92
      );
      context.strokeStyle = palette.hot;
      context.globalAlpha = 0.34 + progress * 0.22;
      context.lineWidth = 13;
      context.stroke();
    } else {
      [0, 1, 2].forEach(function (index) {
        const radius = 78 - progress * 27 + index * 11;
        context.beginPath();
        context.arc(
          points.endX,
          points.endY,
          radius,
          -Math.PI * 0.82 + index * 1.7,
          Math.PI * 0.18 + index * 1.7
        );
        context.strokeStyle = index === 1 ? palette.hot : palette.secondary;
        context.globalAlpha = progress * (0.5 - index * 0.08);
        context.lineWidth = index === 1 ? 2 : 5;
        context.stroke();
      });
    }
    context.restore();
  }

  function combatParticleTick(now) {
    combatParticleFrame = 0;
    const context = getCombatParticleContext();
    if (!context) return;
    const previous = combatParticleLastAt || now;
    const delta = Math.min(34, Math.max(8, now - previous));
    combatParticleLastAt = now;
    clearCombatParticleCanvas();
    let active = false;

    for (let index = combatJourneys.length - 1; index >= 0; index -= 1) {
      const journey = combatJourneys[index];
      if (journey.cancelled || now - journey.startedAt > journey.plan.totalMs) {
        combatJourneys.splice(index, 1);
      } else {
        drawJourneyPrelude(context, journey, now);
        active = true;
      }
    }

    combatParticles.forEach(function (particle) {
      if (!particle.active) return;
      particle.age += delta;
      if (particle.age >= particle.life) {
        particle.active = false;
        return;
      }
      const frameScale = delta / 16.667;
      particle.vx *= Math.pow(particle.drag, frameScale);
      particle.vy = particle.vy * Math.pow(particle.drag, frameScale) +
        particle.gravity * delta;
      particle.x += particle.vx * delta;
      particle.y += particle.vy * delta;
      particle.rotation += particle.spin * delta;
      const progress = particle.age / particle.life;
      const alpha = Math.sin(Math.min(1, progress) * Math.PI) *
        (particle.shape === "dust" ? 0.48 : 0.9);
      drawParticleShape(context, particle, alpha);
      active = true;
    });

    context.globalAlpha = 1;
    context.globalCompositeOperation = "source-over";
    if (active) scheduleCombatParticleFrame();
    else combatParticleLastAt = 0;
  }

  function scheduleCombatParticleFrame() {
    if (combatParticleFrame || prefersReducedMotion() || document.hidden) return;
    const requestFrame = typeof window.requestAnimationFrame === "function"
      ? window.requestAnimationFrame.bind(window)
      : function (callback) {
        return setTimeout(function () { callback(fxClock()); }, 16);
      };
    combatParticleFrame = requestFrame(combatParticleTick);
  }

  function registerCombatJourney(plan, points) {
    if (!plan || prefersReducedMotion() || plan.totalMs <= 20) return null;
    if (!resizeCombatParticleCanvas()) return null;
    const recipe = particleRecipeForPlan(plan, false);
    const journey = {
      plan: plan,
      points: points,
      recipe: recipe,
      startedAt: fxClock(),
      lastEmitAt: -Infinity,
      cancelled: false
    };
    combatJourneys.push(journey);
    const palette = paletteForPlan(plan);
    const travelAngle = Math.atan2(
      points.endY - points.startY,
      points.endX - points.startX
    );
    for (let index = 0; index < recipe.launchCount; index += 1) {
      const angle = plan.recipe
        ? travelAngle + Math.PI + (Math.random() - 0.5) * 0.9
        : Math.random() * Math.PI * 2;
      const speed = 0.018 + Math.random() * 0.04;
      emitCombatParticle(
        points.startX,
        points.startY,
        Math.cos(angle) * speed,
        Math.sin(angle) * speed - 0.012,
        recipe.lifeMs * (0.55 + Math.random() * 0.3),
        1.2 + Math.random() * 2.4,
        index % 3 ? palette.primary : palette.hot,
        plan.kind === "debuff" ? "dust" : recipe.shape,
        plan.kind === "aura" ? -0.00004 : 0.00005,
        0.986,
        (Math.random() - 0.5) * 0.008,
        recipe.blend,
        plan.material
      );
    }
    scheduleCombatParticleFrame();
    return journey;
  }

  function spawnCombatImpact(plan, points) {
    if (!plan || !points || prefersReducedMotion()) return;
    const recipe = particleRecipeForPlan(plan, false);
    const palette = paletteForPlan(plan);
    const direction = Math.atan2(
      points.endY - points.startY,
      points.endX - points.startX
    );
    const spread = plan.recipe ? Math.PI * 0.78 : Math.PI * 0.92;
    const contactCount = Math.min(2, recipe.impactCount);
    const dustStart = Math.max(contactCount, Math.round(recipe.impactCount * 0.72));
    for (let index = 0; index < recipe.impactCount; index += 1) {
      const contact = index < contactCount;
      const dust = !contact && index >= dustStart;
      const angle = direction + (Math.random() - 0.5) * spread +
        (dust ? (Math.random() - 0.5) * 0.45 : 0);
      const speedBase = contact
        ? 0.18 + Math.random() * 0.1
        : dust ? 0.035 + Math.random() * 0.065
          : 0.075 + Math.random() * (plan.big ? 0.16 : 0.1);
      const speed = speedBase * 1.45;
      const color = contact
        ? palette.hot
        : dust ? palette.shadow
          : index % 2 ? palette.primary : palette.secondary;
      const shape = contact ? "spark" : dust ? "dust" : recipe.shape;
      emitCombatParticle(
        points.endX + (Math.random() - 0.5) * (plan.big ? 28 : 18),
        points.endY + (Math.random() - 0.5) * (plan.big ? 24 : 15),
        Math.cos(angle) * speed,
        Math.sin(angle) * speed - (dust ? 0.018 : 0),
        recipe.lifeMs * (dust ? 0.9 + Math.random() * 0.35 : 0.58 + Math.random() * 0.36),
        (contact ? 1.5 + Math.random() * 1.8 : 1.8 + Math.random() * (plan.big ? 4.2 : 3.2)) * 1.12,
        color,
        shape,
        dust || plan.material === "earth" ? 0.00032 : 0.00012,
        dust ? 0.966 : (plan.material === "earth" ? 0.973 : 0.981),
        (Math.random() - 0.5) * 0.018,
        dust ? "source-over" : recipe.blend,
        plan.material
      );
    }
    scheduleCombatParticleFrame();
  }

  function ensureTechniquePool() {
    if (!dom.techniqueFxLayer || dom.techniqueFxLayer.childElementCount) return;
    for (let index = 0; index < 4; index += 1) {
      const effect = document.createElement("div");
      const core = createFxPart("technique-core");
      const sigil = createFxPart("technique-sigil");
      const art = document.createElement("img");
      art.className = "technique-art";
      art.alt = "";
      art.decoding = "async";
      art.loading = "eager";
      art.draggable = false;
      art.hidden = true;
      const ribbonA = createFxPart("technique-ribbon technique-ribbon-a");
      const ribbonB = createFxPart("technique-ribbon technique-ribbon-b");
      const ringA = createFxPart("technique-ring technique-ring-a");
      const ringB = createFxPart("technique-ring technique-ring-b");
      const portalA = createFxPart("technique-portal technique-portal-a");
      const portalB = createFxPart("technique-portal technique-portal-b");
      const slashA = createFxPart("technique-slash technique-slash-a");
      const slashB = createFxPart("technique-slash technique-slash-b");
      const flare = createFxPart("technique-flare");
      const veil = createFxPart("technique-veil");
      effect.className = "technique-fx";
      effect.setAttribute("aria-hidden", "true");
      core.append(art, sigil);
      effect.append(
        ribbonA,
        ribbonB,
        portalA,
        portalB,
        slashA,
        slashB,
        core,
        ringA,
        ringB,
        flare,
        veil
      );
      dom.techniqueFxLayer.appendChild(effect);
    }
  }

  function clearTechniqueImpactState(slot) {
    if (!slot) return;
    clearTimeout(slot._vfxImpactTimer);
    slot._vfxImpactTimer = 0;
    slot.classList.remove(
      "is-technique-impact",
      "is-impact-heavy",
      "is-impact-weakness",
      "impact-type-brave",
      "impact-type-wise",
      "impact-type-magic",
      "impact-type-monster"
    );
    [
      "--impact-x",
      "--impact-back-x",
      "--impact-settle-x",
      "--impact-color",
      "--impact-hot",
      "--impact-shadow"
    ].forEach(
      function (property) {
        slot.style.removeProperty(property);
      }
    );
  }

  function triggerTechniqueContact(effect, plan) {
    if (!effect || !plan || !(plan.actualImpact || plan.outcome === "blocked")) return;
    const targetSlot = effect._targetSlot;
    const sourceSlot = effect._sourceSlot;
    const palette = paletteForPlan(plan);
    const direction = Math.sign(
      effect._fxPoints.endX - effect._fxPoints.startX
    ) || 1;
    clearTechniqueImpactState(targetSlot);
    targetSlot.classList.add("is-technique-impact", "impact-type-" + plan.type);
    if (plan.big) targetSlot.classList.add("is-impact-heavy");
    if (plan.weakness) targetSlot.classList.add("is-impact-weakness");
    const recoil = Math.max(3, Number(plan.recoilPx) || 5);
    targetSlot.style.setProperty(
      "--impact-x",
      (direction * recoil) + "px"
    );
    targetSlot.style.setProperty(
      "--impact-back-x",
      (-direction * recoil * 0.34).toFixed(2) + "px"
    );
    targetSlot.style.setProperty(
      "--impact-settle-x",
      (direction * recoil * 0.12).toFixed(2) + "px"
    );
    targetSlot.style.setProperty("--impact-color", palette.primary);
    targetSlot.style.setProperty("--impact-hot", palette.hot);
    targetSlot.style.setProperty("--impact-shadow", palette.shadow);
    effect._impactTarget = targetSlot;
    targetSlot._vfxImpactTimer = setTimeout(function () {
      clearTechniqueImpactState(targetSlot);
      effect._impactTarget = null;
    }, plan.big ? 340 : 280);
    if (sourceSlot && plan.hitStopMs > 0) {
      sourceSlot.classList.add("is-hit-stopped");
      effect._hitStopTimer = setTimeout(function () {
        sourceSlot.classList.remove("is-hit-stopped");
      }, plan.hitStopMs);
    }
  }

  function resetTechniqueNode(effect) {
    if (!effect) return;
    clearTimeout(effect._cleanupTimer);
    clearTimeout(effect._impactTimer);
    clearTimeout(effect._hitStopTimer);
    if (effect._dodgeTarget) {
      effect._dodgeTarget.classList.remove("is-dodging");
      effect._dodgeTarget.style.removeProperty("--dodge-duration");
    }
    if (effect._sourceSlot && effect._castingClass) {
      effect._sourceSlot.classList.remove(effect._castingClass);
      effect._sourceSlot.classList.remove("is-hit-stopped");
      effect._sourceSlot.style.removeProperty("--fx-duration");
      effect._sourceSlot.style.removeProperty("--cast-back");
      effect._sourceSlot.style.removeProperty("--cast-forward");
      effect._sourceSlot.style.removeProperty("--cast-rebound");
    }
    if (effect._impactTarget) clearTechniqueImpactState(effect._impactTarget);
    if (effect._journey) effect._journey.cancelled = true;
    effect._cleanupTimer = 0;
    effect._impactTimer = 0;
    effect._hitStopTimer = 0;
    effect._dodgeTarget = null;
    effect._sourceSlot = null;
    effect._targetSlot = null;
    effect._impactTarget = null;
    effect._castingClass = "";
    effect._journey = null;
    effect._fxPoints = null;
    const art = effect.querySelector(".technique-art");
    if (art) {
      art.hidden = true;
      art.removeAttribute("src");
    }
    effect.className = "technique-fx";
    effect.removeAttribute("data-kind");
    effect.removeAttribute("data-outcome");
    effect.removeAttribute("data-recipe");
    effect.removeAttribute("data-material");
    effect.removeAttribute("style");
  }

  function claimTechniqueNode() {
    ensureTechniquePool();
    const effects = Array.from(dom.techniqueFxLayer.children);
    let effect = effects.find(function (candidate) {
      return !candidate.classList.contains("is-active");
    });
    if (!effect && effects.length) {
      effect = effects[techniquePoolCursor % effects.length];
      techniquePoolCursor += 1;
    }
    resetTechniqueNode(effect);
    return effect;
  }

  function slotAnchorPoint(slot, layerRect, anchor, fallbackY) {
    const target = anchor && slot.querySelector(".card-art") || slot;
    const rect = target.getBoundingClientRect();
    const x = anchor && Number.isFinite(anchor.x) ? anchor.x : 0.5;
    const y = anchor && Number.isFinite(anchor.y) ? anchor.y : fallbackY;
    return {
      x: rect.left + rect.width * x - layerRect.left,
      y: rect.top + rect.height * y - layerRect.top
    };
  }

  function playTechniqueFx(plan) {
    if (!plan || !dom.techniqueFxLayer) return null;
    const effect = claimTechniqueNode();
    if (!effect) return null;
    const sourceSlot = plan.actor === "enemy" ? dom.enemyCardSlot : dom.playerCardSlot;
    const targetSlot = plan.target === "enemy" ? dom.enemyCardSlot : dom.playerCardSlot;
    const layerRect = dom.techniqueFxLayer.getBoundingClientRect();
    const sourceRect = sourceSlot.getBoundingClientRect();
    const targetRect = targetSlot.getBoundingClientRect();
    const startPoint = plan.recipe
      ? slotAnchorPoint(sourceSlot, layerRect, plan.recipe.source, 0.46)
      : { x: sourceRect.left + sourceRect.width / 2 - layerRect.left,
        y: sourceRect.top + sourceRect.height * 0.46 - layerRect.top };
    const endPoint = plan.recipe
      ? slotAnchorPoint(targetSlot, layerRect, plan.recipe.target, 0.46)
      : { x: targetRect.left + targetRect.width / 2 - layerRect.left,
        y: targetRect.top + targetRect.height * 0.46 - layerRect.top };
    const startX = startPoint.x;
    const startY = startPoint.y;
    let endX = endPoint.x;
    let endY = endPoint.y;

    if (plan.outcome === "miss") {
      const direction = Math.sign(endX - startX) || (plan.actor === "player" ? -1 : 1);
      endX += direction * Math.max(130, layerRect.width * 0.22);
      endY -= Math.max(55, layerRect.height * 0.11);
    }
    const direction = Math.sign(endX - startX) || (plan.actor === "player" ? -1 : 1);
    const arcHeight = Math.max(72, Math.min(148, Math.abs(endX - startX) * 0.28));
    const midX = (startX + endX) / 2;
    const midY = (startY + endY) / 2 - arcHeight;
    const angle = Math.atan2(endY - startY, endX - startX) * 180 / Math.PI;
    const distance = Math.hypot(endX - startX, endY - startY);
    const exitX = endX + 74 * direction;
    const farExitX = endX + 112 * direction;
    const points = {
      startX: startX,
      startY: startY,
      midX: midX,
      midY: midY,
      endX: endX,
      endY: endY
    };

    effect.dataset.kind = plan.kind;
    effect.dataset.outcome = plan.outcome;
    effect.style.setProperty("--fx-start-x", startX.toFixed(1) + "px");
    effect.style.setProperty("--fx-start-y", startY.toFixed(1) + "px");
    effect.style.setProperty("--fx-end-x", endX.toFixed(1) + "px");
    effect.style.setProperty("--fx-end-y", endY.toFixed(1) + "px");
    effect.style.setProperty("--fx-mid-x", midX.toFixed(1) + "px");
    effect.style.setProperty("--fx-mid-y", midY.toFixed(1) + "px");
    effect.style.setProperty("--fx-angle", angle.toFixed(2) + "deg");
    effect.style.setProperty("--fx-direction", String(direction));
    effect.style.setProperty("--fx-distance", distance.toFixed(1) + "px");
    effect.style.setProperty("--fx-exit-x", exitX.toFixed(1) + "px");
    effect.style.setProperty("--fx-far-exit-x", farExitX.toFixed(1) + "px");
    effect.style.setProperty("--fx-duration", plan.totalMs + "ms");
    const hasPremiumArt = Boolean(plan.recipe && plan.recipe.asset);
    const scale = hasPremiumArt
      ? (plan.big ? 1.5 : 1)
      : (plan.big ? 2.1 : 1.5);
    effect.style.setProperty("--fx-scale", String(scale));
    effect.style.setProperty("--fx-scale-down", String(scale * 0.82));
    effect.style.setProperty("--fx-scale-up", String(scale * 1.16));
    effect.style.setProperty("--fx-scale-wide", String(scale * 1.8));
    const sigil = effect.querySelector(".technique-sigil");
    const art = effect.querySelector(".technique-art");
    if (plan.recipe && plan.recipe.asset && art) {
      const footprintScale = plan.big ? 1.4 : 1.5;
      const baseArtSize = Number(plan.recipe.size) || 150;
      const artSize = Math.max(124, Math.min(340, baseArtSize * footprintScale));
      art.src = plan.recipe.asset;
      art.hidden = false;
      sigil.textContent = "";
      effect.dataset.recipe = plan.recipe.id;
      effect.dataset.material = plan.material;
      effect.style.setProperty("--fx-art-size", artSize + "px");
      effect.style.setProperty("--fx-art-offset", (-artSize / 2) + "px");
      effect.classList.add(
        "has-premium-art",
        "vfx-recipe-" + plan.recipe.id
      );
    } else {
      if (art) art.hidden = true;
      sigil.textContent = plan.emoji;
    }
    effect.classList.add(
      "is-active",
      "vfx-kind-" + plan.kind,
      "vfx-type-" + plan.type,
      "is-" + plan.outcome
    );
    if (plan.big) effect.classList.add("is-big");
    if (plan.weakness) effect.classList.add("is-weakness");
    effect._castingClass = "is-casting-" + plan.kind;
    effect._sourceSlot = sourceSlot;
    effect._targetSlot = targetSlot;
    sourceSlot.classList.add(effect._castingClass);
    sourceSlot.style.setProperty("--fx-duration", plan.totalMs + "ms");
    sourceSlot.style.setProperty("--cast-back", (-8 * direction) + "px");
    sourceSlot.style.setProperty("--cast-forward", (34 * direction) + "px");
    sourceSlot.style.setProperty("--cast-rebound", (-5 * direction) + "px");

    if (plan.outcome === "evade" && targetSlot) {
      targetSlot.style.setProperty(
        "--dodge-duration",
        Math.max(420, plan.impactAtMs + 120) + "ms"
      );
      targetSlot.classList.add("is-dodging");
      effect._dodgeTarget = targetSlot;
    }

    void effect.offsetWidth;
    effect.classList.add("is-playing");
    effect._fxPoints = points;
    effect._journey = registerCombatJourney(plan, points);
    effect._cleanupTimer = setTimeout(function () {
      resetTechniqueNode(effect);
    }, plan.totalMs + 40);
    return effect;
  }

  function playTechniqueImpactFx(effect, plan) {
    if (!effect || !plan || !effect.classList.contains("is-active")) return;
    effect.classList.add(
      plan.actualImpact || plan.outcome === "blocked"
        ? "has-impact"
        : "has-pass"
    );
    triggerTechniqueContact(effect, plan);
    spawnCombatImpact(plan, effect._fxPoints);
  }

  function playFragmentAura(emoji, actor) {
    return playTechniqueFx({
      actor: actor,
      target: actor,
      kind: "aura",
      emoji: emoji || "✦",
      big: false,
      outcome: "support",
      actualImpact: false,
      weakness: false,
      type: "magic",
      impactAtMs: 0,
      totalMs: prefersReducedMotion() ? 20 : TECHNIQUE_TIMINGS.aura.totalMs
    });
  }

  function syncBattleCard(slot, side, options) {
    options = options || {};
    let cardEl = slot.firstElementChild;
    const sameCard = Boolean(
      cardEl &&
      cardEl.classList.contains("story-card") &&
      cardEl.dataset.cardId === side.card.id
    );
    if (!sameCard) {
      cardEl = window.CardView.create(side.card, {
        compact: true,
        eager: true,
        currentHp: side.hp,
        acting: Boolean(options.acting),
        hit: Boolean(options.hit)
      });
      slot.replaceChildren(cardEl);
      return cardEl;
    }

    cardEl.classList.remove("is-acting", "is-hit");
    if (options.acting || options.hit) void cardEl.offsetWidth;
    cardEl.classList.toggle("is-acting", Boolean(options.acting));
    cardEl.classList.toggle("is-hit", Boolean(options.hit));
    const hpValue = Math.max(0, Number(side.hp) || 0);
    const hpText = cardEl.querySelector(".hp-gem strong");
    const hpFill = cardEl.querySelector(".hp-fill");
    if (hpText) hpText.textContent = String(hpValue);
    if (hpFill) {
      hpFill.style.width = Math.max(
        0,
        Math.min(100, hpValue / Math.max(1, Number(side.card.hp) || 1) * 100)
      ) + "%";
    }
    const label = cardEl.getAttribute("aria-label") || "";
    cardEl.setAttribute("aria-label", label.replace(/HP \d+/, "HP " + hpValue));
    return cardEl;
  }

  function storyGateStoryName() {
    if (!storyChallenge) return "새로운 이야기";
    return STORY_NAMES[storyChallenge.storyId] || storyChallenge.title || "새로운 이야기";
  }

  function storyGateHasListeningProof() {
    return Boolean(storyChallenge && isStoryDone(storyChallenge.storyId));
  }

  function prepareEnemyIntent(force) {
    if (!game || game.winner || !window.CardEngine.previewAiIntent) {
      enemyIntent = null;
      return;
    }
    if (!force && enemyIntent) return;
    enemyIntent = window.CardEngine.previewAiIntent(game, "enemy", Math.random);
  }

  function renderEnemyIntent() {
    if (!dom.enemyIntent) return;
    const intent = enemyIntent;
    dom.enemyIntent.hidden = !game || Boolean(game && game.winner);
    if (!game || game.winner) return;
    const kind = intent ? intent.danger || intent.type || "normal" : "normal";
    ["normal", "rest", "guard", "strong", "lethal", "trick"].forEach(function (name) {
      dom.enemyIntent.classList.toggle("intent-" + name, kind === name);
    });
    if (!intent) {
      dom.enemyIntentIcon.textContent = "🔮";
      dom.enemyIntentName.textContent = "별빛을 살펴보는 중…";
      dom.enemyIntentDetail.textContent = "곧 다음 행동을 알려 줄게요";
      dom.enemyIntentBadge.textContent = "예고";
      return;
    }
    const executing = game.turn === "enemy";
    if (intent.type === "attack") {
      dom.enemyIntentIcon.textContent = intent.danger === "lethal" ? "🚨" : (intent.big ? "💥" : "⚔️");
      dom.enemyIntentName.textContent = intent.name;
      dom.enemyIntentDetail.textContent = (intent.damage > 0 ? "예상 피해 " + intent.damage : "상태 변화 기술") +
        (intent.coin ? " · 동전 판정" : "") + (intent.fragment ? " · 이야기 조각" : "");
      dom.enemyIntentBadge.textContent = executing ? "실행 중" : (intent.danger === "lethal" ? "위험!" : "예고");
    } else if (intent.type === "guard") {
      dom.enemyIntentIcon.textContent = "🛡️";
      dom.enemyIntentName.textContent = "방어하기";
      dom.enemyIntentDetail.textContent = "다음 공격 피해를 최대 20 막아요";
      dom.enemyIntentBadge.textContent = executing ? "실행 중" : "방어";
    } else if (intent.type === "skip") {
      dom.enemyIntentIcon.textContent = "💫";
      dom.enemyIntentName.textContent = "한 턴 쉬기";
      dom.enemyIntentDetail.textContent = "이번에는 공격하지 못해요";
      dom.enemyIntentBadge.textContent = "틈!";
    } else {
      dom.enemyIntentIcon.textContent = "⭐";
      dom.enemyIntentName.textContent = "별사탕 모으기";
      dom.enemyIntentDetail.textContent = "강한 기술을 위해 별을 아껴요";
      dom.enemyIntentBadge.textContent = executing ? "실행 중" : "준비";
    }
  }

  function reservedEnemyActionIsAvailable(intent) {
    if (!game || game.turn !== "enemy" || !intent || !intent.action) return false;
    const action = intent.action;
    if (action.type === "attack" && Number.isInteger(action.fragmentIndex)) {
      const fragmentAvailable = window.CardEngine.getAvailableFragmentActions(game).some(function (candidate) {
        return candidate.fragmentIndex === action.fragmentIndex;
      });
      if (!fragmentAvailable) return false;
      const withFragment = window.CardEngine.performAction(game, {
        type: "fragment",
        fragmentIndex: action.fragmentIndex
      });
      if ((withFragment.events || []).some(function (event) { return event.type === "invalid_action"; })) {
        return false;
      }
      return window.CardEngine.getAvailableActions(withFragment).some(function (candidate) {
        return candidate.type === "attack" && candidate.attackIndex === action.attackIndex;
      });
    }
    return window.CardEngine.getAvailableActions(game).some(function (candidate) {
      return candidate.type === action.type &&
        (action.type !== "attack" || candidate.attackIndex === action.attackIndex);
    });
  }

  function renderStoryGate() {
    if (!dom.storyGateBar) return;
    const flags = game && game.sides && game.sides.player.flags;
    dom.storyGateBar.hidden = !game || !storyChallenge;
    if (!game || !storyChallenge || !flags) return;
    dom.storyGateBar.classList.remove("is-locked", "is-ready", "is-awake", "is-used", "is-failed", "is-waiting");
    const canInteract = !busy && game.turn === "player" && !game.winner;
    if (!storyGateHasListeningProof()) {
      dom.storyGateBar.classList.add("is-locked");
      dom.storyGateStatus.textContent = "「" + storyGateStoryName() + "」을 들으면 필살기 관문이 열려요";
      dom.storyGateButton.textContent = "이야기 듣기";
      dom.storyGateButton.disabled = !canInteract;
      return;
    }
    if (flags.ultimateUsed) {
      dom.storyGateBar.classList.add("is-used");
      dom.storyGateStatus.textContent = "별빛 이야기를 멋지게 사용했어요!";
      dom.storyGateButton.textContent = "사용 완료";
      dom.storyGateButton.disabled = true;
      return;
    }
    if (flags.ultimateUnlocked) {
      const enoughStars = game.sides.player.stars >= window.CardEngine.ULTIMATE_COST;
      dom.storyGateBar.classList.add(enoughStars ? "is-ready" : "is-awake");
      dom.storyGateStatus.textContent = enoughStars
        ? "필살기 준비 완료! 지금 사용할 수 있어요"
        : "필살기가 깨어났어요 · 별사탕 " + window.CardEngine.ULTIMATE_COST + "개를 모아요";
      dom.storyGateButton.textContent = enoughStars ? "준비 완료" : "해금 완료";
      dom.storyGateButton.disabled = true;
      return;
    }
    if (flags.ultimateFailed) {
      dom.storyGateBar.classList.add("is-failed");
      dom.storyGateStatus.textContent = "이번 판의 관문은 쉬어요 · 다음 판에 다시 도전!";
      dom.storyGateButton.textContent = "다음 판에";
      dom.storyGateButton.disabled = true;
      return;
    }
    if (game.turnNumber < flags.ultimateRetryTurn) {
      dom.storyGateBar.classList.add("is-waiting");
      dom.storyGateStatus.textContent = "다음 내 턴에 한 번 더 생각해 볼 수 있어요";
      dom.storyGateButton.textContent = "잠시 기다리기";
      dom.storyGateButton.disabled = true;
      return;
    }
    dom.storyGateBar.classList.add("is-awake");
    dom.storyGateStatus.textContent = flags.ultimateAttempts
      ? "마지막 기회! 이야기를 잘 떠올려 봐요"
      : "이야기를 기억하면 강력한 필살기가 깨어나요";
    dom.storyGateButton.textContent = flags.ultimateAttempts ? "다시 도전" : "문제 열기";
    dom.storyGateButton.disabled = !canInteract;
  }

  function showStoryListeningGate() {
    const storyName = storyGateStoryName();
    dom.lockedArt.style.backgroundImage = 'linear-gradient(rgba(17,13,37,.22), rgba(17,13,37,.42)), url("' + artUrl(selectedCard) + '")';
    dom.lockedArt.style.backgroundPosition = window.CardView.artPosition[selectedCard.id] || "50% 40%";
    dom.lockedTitle.textContent = "이야기를 듣고 관문을 열어요";
    dom.lockedDescription.textContent = "「" + storyName + "」을 끝까지 들으면, 대결 중 문제를 풀고 강력한 필살기를 깨울 수 있어요.";
    dom.lockedDialog.showModal();
  }

  function normalizedQuizChoice(choice, index) {
    if (choice && typeof choice === "object") {
      return {
        id: String(choice.id),
        label: String(choice.label || choice.text || "")
      };
    }
    return { id: String(index), label: String(choice) };
  }

  function openStoryQuiz() {
    if (!game || !storyChallenge || busy || game.turn !== "player" || game.winner) return;
    if (!storyGateHasListeningProof()) {
      showStoryListeningGate();
      return;
    }
    const flags = game.sides.player.flags;
    if (flags.ultimateUnlocked || flags.ultimateUsed || flags.ultimateFailed ||
        game.turnNumber < flags.ultimateRetryTurn) return;
    dom.storyQuizTitle.textContent = "「" + storyGateStoryName() + "」 이야기 관문";
    dom.storyQuizQuestion.textContent = storyChallenge.question || storyChallenge.prompt || "";
    dom.storyQuizResult.textContent = "정답을 고르면 턴을 쓰지 않고 필살기가 깨어나요.";
    dom.storyQuizResult.className = "story-quiz-result";
    dom.storyQuizChoices.replaceChildren();
    (storyChallenge.choices || []).forEach(function (rawChoice, index) {
      const choice = normalizedQuizChoice(rawChoice, index);
      const button = document.createElement("button");
      button.type = "button";
      button.className = "story-quiz-choice";
      button.textContent = choice.label;
      button.disabled = flags.ultimateTriedChoices.includes(choice.id);
      if (button.disabled) button.setAttribute("aria-label", choice.label + " · 이미 골랐던 답");
      button.addEventListener("click", function () { answerStoryQuiz(choice, button); });
      dom.storyQuizChoices.appendChild(button);
    });
    if (!dom.storyQuizDialog.open) dom.storyQuizDialog.showModal();
  }

  function answerStoryQuiz(choice, selectedButton) {
    if (!game || !storyChallenge || busy || game.turn !== "player" || game.winner) return;
    Array.from(dom.storyQuizChoices.children).forEach(function (button) { button.disabled = true; });
    const correct = String(choice.id) === String(storyChallenge.correctChoiceId);
    const next = window.CardEngine.performAction(game, {
      type: "story_gate_answer",
      gateId: storyChallenge.id,
      storyId: storyChallenge.storyId,
      choiceId: choice.id,
      correct: correct
    });
    const answerEvent = (next.events || []).find(function (event) {
      return event.type === "story_gate_answer";
    });
    if (!answerEvent) {
      renderStoryGate();
      return;
    }
    game = next;
    selectedButton.classList.add(correct ? "is-correct" : "is-wrong");
    if (correct) {
      dom.storyQuizResult.textContent = "정답! 별사탕 이야기의 힘이 깨어났어요!";
      dom.storyQuizResult.classList.add("is-correct");
      setEffect("필살기 해금!");
      playFragmentAura("🌟", "player");
      if (window.CardAudio.ultimateUnlock) window.CardAudio.ultimateUnlock();
      else window.CardAudio.magic();
    } else if (game.sides.player.flags.ultimateFailed) {
      dom.storyQuizResult.textContent = "괜찮아요. 이번 판은 쉬고 다음 판에 다시 도전해요!";
      dom.storyQuizResult.classList.add("is-wrong");
      if (window.CardAudio.quizWrong) window.CardAudio.quizWrong();
    } else {
      dom.storyQuizResult.textContent = "아깝다! 다음 내 턴에 한 번 더 생각해 봐요.";
      dom.storyQuizResult.classList.add("is-wrong");
      if (window.CardAudio.quizWrong) window.CardAudio.quizWrong();
    }
    dom.battleMessage.textContent = correct
      ? "이야기 기억 성공! 필살기 「별빛 이야기」가 깨어났어요."
      : "틀려도 HP와 별사탕은 그대로예요.";
    renderBattle();
    clearTimeout(quizTimer);
    quizTimer = setTimeout(function () {
      if (dom.storyQuizDialog.open) dom.storyQuizDialog.close();
    }, correct ? 1000 : 1200);
  }

  function renderBattle(flags) {
    flags = flags || {};
    if (!game) return;
    const displayGame = flags.displayState || game;
    const player = displayGame.sides.player;
    const enemy = displayGame.sides.enemy;
    const visuals = Array.isArray(flags.visuals) ? flags.visuals : [];
    const hitTargets = new Set(
      visuals.filter(function (visual) { return visual.impact; })
        .map(function (visual) { return visual.target; })
    );
    if (flags.hit) hitTargets.add(flags.hit);
    const playerCardEl = syncBattleCard(dom.playerCardSlot, player, {
      acting: flags.acting === "player",
      hit: hitTargets.has("player")
    });
    const enemyCardEl = syncBattleCard(dom.enemyCardSlot, enemy, {
      acting: flags.acting === "enemy",
      hit: hitTargets.has("enemy")
    });
    const slots = { player: dom.playerCardSlot, enemy: dom.enemyCardSlot };
    const cardElements = { player: playerCardEl, enemy: enemyCardEl };
    Object.keys(cardElements).forEach(function (sideName) {
      cardElements[sideName].querySelectorAll(".combat-fx").forEach(function (layer) {
        layer.remove();
      });
    });

    Object.keys(slots).forEach(function (sideName) {
      const sideVisuals = visuals.filter(function (visual) {
        return visual.target === sideName;
      });
      const persistentKnockout = Boolean(
        displayGame.winner && displayGame.sides[sideName].hp <= 0
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
      slots[sideName].classList.toggle(
        "is-guard-ready",
        Boolean(displayGame.sides[sideName].status.guardReduction > 0)
      );
      sideVisuals.forEach(function (visual) {
        createCombatFx(cardElements[sideName], visual);
      });
    });

    dom.turnOwner.textContent = displayGame.turn === "player" ? "나의 턴" : "상대의 턴";
    dom.turnNumber.textContent = String(Math.max(1, Math.ceil(displayGame.turnNumber / 2)));
    dom.battleStars.textContent = "⭐ " + player.stars;
    dom.battleStars.setAttribute("aria-label", "나의 별사탕 " + player.stars + "개");
    if (window.CardAudio.updateBattleHp) {
      window.CardAudio.updateBattleHp(player.hp, player.card.hp);
    }
    dom.leaveBattleButton.disabled = busy;
    updateWeaknessHint(player.card, enemy.card);
    renderFragmentHand();
    renderActions();
    renderEnemyIntent();
    renderStoryGate();
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
    playFragmentAura(before.emoji, "player");
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
    const guardAction = actions.find(function (action) { return action.type === "guard"; });
    const ultimateAction = actions.find(function (action) {
      return action.type === "ultimate";
    });

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

    const guard = document.createElement("button");
    guard.className = "action-button guard-button";
    guard.type = "button";
    const guardCooldown = Number(side.status.guardCooldownUntilTurnNumber) || 0;
    const guardCoolingDown = game.turnNumber < guardCooldown;
    const guardDetail = guardCoolingDown
      ? "이번 턴은 재정비 중 · 다음 내 턴에 다시 쓸 수 있어요"
      : "상대의 다음 공격 피해를 최대 20 막아요";
    guard.disabled = busy || game.turn !== "player" || Boolean(game.winner) || !guardAction;
    guard.innerHTML = "<strong>🛡️ 방어하기</strong><small>" + guardDetail + "</small><span class=\"action-cost\">⭐ " +
      window.CardEngine.GUARD_COST + "</span>";
    guard.setAttribute(
      "aria-label",
      (guardCoolingDown ? "방어하기 재정비 중. 다음 내 턴에 다시 사용할 수 있습니다. " : "방어하기. ") +
        "별사탕 " + window.CardEngine.GUARD_COST +
        "개. 상대의 다음 공격 피해를 최대 20 막고 최소 10 피해는 받습니다."
    );
    guard.addEventListener("click", function () { performPlayerAction({ type: "guard" }); });
    dom.actionList.appendChild(guard);

    if (storyChallenge) {
      const ultimate = document.createElement("button");
      const flags = side.flags;
      const listeningDone = storyGateHasListeningProof();
      const ready = Boolean(ultimateAction);
      ultimate.className = "action-button ultimate-button";
      ultimate.classList.toggle("is-ultimate-ready", ready);
      ultimate.classList.toggle("is-story-locked", !flags.ultimateUnlocked);
      ultimate.type = "button";
      ultimate.disabled = busy || game.turn !== "player" || Boolean(game.winner) || !ready;
      const title = document.createElement("strong");
      const detail = document.createElement("small");
      const cost = document.createElement("span");
      title.textContent = "🌟 별빛 이야기";
      cost.className = "action-cost";
      cost.textContent = "⭐ " + window.CardEngine.ULTIMATE_COST;
      if (flags.ultimateUsed) {
        detail.textContent = "이번 대결에서 이미 사용했어요";
      } else if (!listeningDone) {
        detail.textContent = "이야기를 끝까지 듣고 관문을 열어요";
      } else if (!flags.ultimateUnlocked) {
        detail.textContent = "이야기 문제를 맞히면 해금 · 중립 피해 50";
      } else if (!ready) {
        detail.textContent = "별사탕을 더 모아요 · 중립 피해 50";
      } else {
        detail.textContent = "판당 1회 · 약점과 동전 없이 중립 피해 50";
      }
      ultimate.append(title, detail, cost);
      ultimate.addEventListener("click", function () { performPlayerAction({ type: "ultimate" }); });
      dom.actionList.appendChild(ultimate);
    }

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
    const guard = find("guard");
    const guardBlock = find("guard_block");
    const ultimate = find("ultimate_used");

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
    if (damage && damage.guardReducedBy > 0) {
      const owner = damage.target === "player" ? "내 영웅의" : "상대의";
      return {
        effect: "🛡️ -" + damage.guardReducedBy,
        message: owner + " 방어막이 피해를 " + damage.guardReducedBy + " 막았어요!",
        sound: "guard",
        hit: damage.amount > 0 ? damage.target : null
      };
    }
    if (damage && ultimate) return {
      effect: damage.amount > 0 ? "🌟 -" + damage.amount : "막음!",
      message: "필살기 「별빛 이야기」! 기억의 별빛이 폭발해요!",
      sound: damage.amount > 0 ? "strongHit" : "guard",
      hit: damage.amount > 0 ? damage.target : null
    };
    if (damage) return {
      effect: damage.weakness ? "×2!" : "-" + damage.amount,
      message: damage.weakness ? "약점을 정확히 맞혔어요!" : (damage.attack + " 공격!"),
      sound: damage.amount > 0 ? "hit" : "magic",
      hit: damage.amount > 0 ? damage.target : null
    };
    if (heal) return { effect: "+" + heal.amount, message: "따뜻한 마법으로 HP를 회복했어요.", sound: "magic" };
    if (coin) return { effect: coin.result === "heads" ? "앞면!" : "뒷면!", message: "운명의 동전이 빙글빙글!", sound: "coin" };
    if (guard) return { effect: "🛡️", message: "방어 자세! 다음 공격 피해를 최대 20 막아요.", sound: "guard" };
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
    const attack = find("attack");
    const bigTechnique = Boolean(attack && attack.vfx && attack.vfx.big);

    if (gameOver) {
      const finishingDamage = reversed.find(function (event) {
        return event.type === "damage" &&
          event.target === gameOver.loser &&
          event.amount > 0;
      });
      if (finishingDamage) {
          return finishingDamage.weakness || bigTechnique ? "strongHit" : "hit";
      }
      return "hit";
    }
    if (find("revive")) return "revive";
    if (find("attack_missed") || find("attack_evaded")) return null;
    if (find("guard_block")) return "guard";
    if (find("guard")) return "guard";
    if (damage) {
      if (damage.amount <= 0) return "cast";
      return damage.weakness || bigTechnique ? "strongHit" : "hit";
    }
    if (find("heal")) return "heal";
    if (find("coin")) return null;
    if (find("attack")) return "cast";
    if (find("fragment_used")) return "magic";
    return fallback === "magic" ? "cast" : fallback;
  }

  function actionNeedsCoin(action) {
    let state = game;
    if (
      state && action && action.type === "attack" &&
      Number.isInteger(action.fragmentIndex)
    ) {
      const projected = window.CardEngine.performAction(state, {
        type: "fragment",
        fragmentIndex: action.fragmentIndex
      });
      const invalid = (projected.events || []).some(function (event) {
        return event.type === "invalid_action";
      });
      if (!invalid) state = projected;
    }
    return window.CardEngine.actionNeedsCoin(state, action);
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
    const previousGame = game;
    game = nextGame;
    animateAction(pending.actor, previousGame);
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

  function restartArenaImpact(weak, monster, finisher) {
    clearTimeout(impactTimer);
    dom.arena.classList.remove("is-weak-hit", "is-monster-hit", "is-finisher-hit");
    void dom.arena.offsetWidth;
    if (weak) dom.arena.classList.add("is-weak-hit");
    if (monster) dom.arena.classList.add("is-monster-hit");
    if (finisher) dom.arena.classList.add("is-finisher-hit");
    impactTimer = setTimeout(function () {
      dom.arena.classList.remove("is-weak-hit", "is-monster-hit", "is-finisher-hit");
    }, 580);
  }

  function animateAction(actor, previousGame) {
    const session = battleSession;
    const events = game.events || [];
    const description = describeEvents(events, actor);
    const visuals = actionVisualsForEvents(events, actor, game);
    const impactFlags = impactFlagsForVisuals(visuals);
    const techniquePlan = techniquePlanForEvents(
      events,
      game,
      actor,
      prefersReducedMotion()
    );
    const actionSound = soundForEvents(events, description.sound);
    const fragmentEvent = events.slice().reverse().find(function (event) {
      return event.type === "fragment_used";
    });
    const guardEvent = events.slice().reverse().find(function (event) {
      return event.type === "guard";
    });
    if (fragmentEvent) {
      const owner = fragmentEvent.actor === "enemy" ? "상대가" : "내 영웅이";
      description.message = owner + " 「" + (fragmentEvent.fragment || fragmentEvent.name) + "」 조각 사용. " + description.message;
    }
    busy = true;
    dom.battleMessage.textContent = description.message;
    renderBattle({
      acting: actor,
      displayState: previousGame || game
    });
    if (fragmentEvent) {
      playFragmentAura(fragmentEvent.emoji || "✦", fragmentEvent.actor || actor);
    }
    if (guardEvent) {
      playFragmentAura("🛡️", guardEvent.actor || actor);
    }
    if (techniquePlan) {
      techniquePlan.sound = actionSound;
      techniquePlan.knockout = events.some(function (event) {
        return event.type === "game_over";
      });
      techniquePlan.revive = events.some(function (event) {
        return event.type === "revive";
      });
    }
    const techniqueEffect = playTechniqueFx(techniquePlan);
    if (techniquePlan && window.CardAudio.techniqueLaunch) {
      window.CardAudio.techniqueLaunch(techniquePlan);
    }
    const contactTailMs = techniquePlan &&
      (techniquePlan.actualImpact || techniquePlan.outcome === "blocked")
      ? (techniquePlan.big ? 340 : 280)
      : 120;
    const actionSettleMs = techniquePlan
      ? Math.max(850, techniquePlan.totalMs + 60,
        techniquePlan.impactAtMs + contactTailMs + 40)
      : 850;

    const revealDamageState = function () {
      if (session !== battleSession || !game) return;
      setEffect(description.effect);
      renderBattle({
        visuals: visuals
      });
    };

    const revealImpact = function () {
      if (session !== battleSession || !game) return;
      playTechniqueImpactFx(techniqueEffect, techniquePlan);
      if (impactFlags.weak || impactFlags.monster ||
          (techniquePlan && techniquePlan.big && techniquePlan.actualImpact)) {
        restartArenaImpact(
          impactFlags.weak,
          impactFlags.monster,
          Boolean(techniquePlan && techniquePlan.big && techniquePlan.actualImpact)
        );
      }
      if (techniquePlan && window.CardAudio.techniqueImpact) {
        window.CardAudio.techniqueImpact(techniquePlan);
      } else {
        playSound(actionSound, actor);
      }
      const hitStopMs = techniquePlan && techniquePlan.actualImpact
        ? techniquePlan.hitStopMs
        : 0;
      if (hitStopMs > 0) {
        clearTimeout(hitStopTimer);
        hitStopTimer = setTimeout(revealDamageState, hitStopMs);
      } else {
        revealDamageState();
      }
    };

    if (techniquePlan && techniquePlan.impactAtMs > 0) {
      clearTimeout(techniqueImpactTimer);
      techniqueImpactTimer = setTimeout(revealImpact, techniquePlan.impactAtMs);
    } else {
      revealImpact();
    }

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
        prepareEnemyIntent(true);
        busy = false;
        dom.battleMessage.textContent = "나의 턴! 기술을 골라 주세요.";
        renderBattle();
        window.CardAudio.turn();
      }
    }, actionSettleMs);
  }

  function performPlayerAction(action) {
    if (busy || !game || game.turn !== "player" || game.winner) return;
    selectedFragmentIndex = null;
    if (actionNeedsCoin(action)) {
      beginCoinAction("player", action);
    } else {
      const previousGame = game;
      game = window.CardEngine.performAction(game, action);
      animateAction("player", previousGame);
    }
  }

  function runEnemyTurn() {
    if (!game || game.winner || game.turn !== "enemy") return;
    if (!reservedEnemyActionIsAvailable(enemyIntent)) {
      enemyIntent = window.CardEngine.previewAiIntent
        ? window.CardEngine.previewAiIntent(game, "enemy", Math.random)
        : null;
    }
    const action = reservedEnemyActionIsAvailable(enemyIntent)
      ? enemyIntent.action
      : (window.CardEngine.chooseAiAction(game, Math.random) || { type: "rest" });
    renderEnemyIntent();
    if (actionNeedsCoin(action)) {
      beginCoinAction("enemy", action);
    } else {
      const previousGame = game;
      game = window.CardEngine.performAction(game, action);
      animateAction("enemy", previousGame);
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

  function cardTiltAllowed(event) {
    if (event && event.pointerType && event.pointerType !== "mouse" && event.pointerType !== "pen") {
      return false;
    }
    return Boolean(
      window.matchMedia &&
      window.matchMedia("(hover: hover) and (pointer: fine)").matches &&
      !window.matchMedia("(prefers-reduced-motion: reduce)").matches
    );
  }

  function resetCardTilt(card) {
    if (!card) return;
    card.classList.remove("is-tilting");
    card.style.removeProperty("--tilt-x");
    card.style.removeProperty("--tilt-y");
    card.style.removeProperty("--shine-x");
    card.style.removeProperty("--shine-y");
  }

  function queueCardTilt(card, clientX, clientY) {
    if (!card) return;
    if (tiltingCard && tiltingCard !== card) resetCardTilt(tiltingCard);
    tiltingCard = card;
    const rect = card.getBoundingClientRect();
    const x = Math.max(0, Math.min(1, (clientX - rect.left) / rect.width));
    const y = Math.max(0, Math.min(1, (clientY - rect.top) / rect.height));
    const tiltX = (0.5 - y) * 7;
    const tiltY = (x - 0.5) * 9;
    const shineX = (x - 0.5) * 150;
    const shineY = (y - 0.5) * 100;
    if (tiltFrame) cancelAnimationFrame(tiltFrame);
    tiltFrame = requestAnimationFrame(function () {
      card.classList.add("is-tilting");
      card.style.setProperty("--tilt-x", tiltX.toFixed(2) + "deg");
      card.style.setProperty("--tilt-y", tiltY.toFixed(2) + "deg");
      card.style.setProperty("--shine-x", shineX.toFixed(1) + "px");
      card.style.setProperty("--shine-y", shineY.toFixed(1) + "px");
      tiltFrame = 0;
    });
  }

  function bindCardTilt() {
    dom.collectionGrid.addEventListener("pointermove", function (event) {
      if (!cardTiltAllowed(event)) return;
      const card = event.target.closest(".story-card[role=\"button\"]");
      if (!card || !dom.collectionGrid.contains(card)) return;
      queueCardTilt(card, event.clientX, event.clientY);
    }, { passive: true });
    dom.collectionGrid.addEventListener("pointerleave", function () {
      if (tiltFrame) cancelAnimationFrame(tiltFrame);
      tiltFrame = 0;
      resetCardTilt(tiltingCard);
      tiltingCard = null;
    });
  }

  function bindEvents() {
    bindCardTilt();
    dom.battleButton.addEventListener("click", startBattle);
    dom.leaveBattleButton.addEventListener("click", returnToCollection);
    dom.rematchButton.addEventListener("click", function () {
      dom.resultDialog.close();
      startBattle();
    });
    document.querySelectorAll("[data-detail-close]").forEach(function (button) {
      button.addEventListener("click", closeCardDetail);
    });
    dom.detailSelectButton.addEventListener("click", function () {
      if (!detailCard || !isPlayableCard(detailCard)) return;
      selectCard(detailCard, detailOrigin);
      dom.cardDetailDialog.close("selected");
    });
    dom.cardDetailDialog.addEventListener("click", function (event) {
      if (event.target === dom.cardDetailDialog) closeCardDetail();
    });
    dom.cardDetailDialog.addEventListener("close", function () {
      const origin = detailOrigin;
      detailCard = null;
      detailOrigin = null;
      if (origin && origin.isConnected) origin.focus({ preventScroll: true });
    });

    dom.resultCollectionButton.addEventListener("click", returnToCollection);
    dom.coinButton.addEventListener("click", triggerCoinAction);
    dom.coinDialog.addEventListener("cancel", function (event) {
      event.preventDefault();
    });
    dom.storyGateButton.addEventListener("click", openStoryQuiz);
    document.querySelectorAll("[data-quiz-close]").forEach(function (button) {
      button.addEventListener("click", function () {
        clearTimeout(quizTimer);
        if (dom.storyQuizDialog.open) dom.storyQuizDialog.close();
      });
    });
    dom.storyQuizDialog.addEventListener("cancel", function () {
      clearTimeout(quizTimer);
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
    dom.musicButton.addEventListener("click", function () {
      const next = !window.CardAudio.isBgmMuted();
      window.CardAudio.setBgmMuted(next);
      updateMusicButton();
    });

    const primeAudioOnce = function () {
      window.CardAudio.prime();
      window.CardAudio.setScene(
        document.body.classList.contains("in-battle") ? "battle" : "collection"
      );
    };
    document.addEventListener("pointerdown", primeAudioOnce, {
      capture: true,
      passive: true
    });
    document.addEventListener("keydown", primeAudioOnce, {
      capture: true
    });

    window.addEventListener("pagehide", function () {
      if (window.CardAudio.setPageHidden) {
        window.CardAudio.setPageHidden(true);
      }
    });
    window.addEventListener("pageshow", function () {
      if (window.CardAudio.requestRecovery) {
        window.CardAudio.requestRecovery();
      }
      if (window.CardAudio.setPageHidden) {
        window.CardAudio.setPageHidden(document.hidden);
      }
      refreshUnlocks();
    });
    window.addEventListener("resize", function () {
      resizeCombatParticleCanvas();
    }, { passive: true });
    document.addEventListener("visibilitychange", function () {
      if (window.CardAudio.setPageHidden) {
        window.CardAudio.setPageHidden(document.hidden);
      }
      if (document.hidden) resetCombatParticleStage();
      else resizeCombatParticleCanvas();
      if (document.visibilityState === "visible") refreshUnlocks();
    });
  }

  function updateMuteButton() {
    const muted = window.CardAudio.isMuted();
    dom.muteButton.textContent = muted ? "🔇" : "🔊";
    dom.muteButton.setAttribute("aria-pressed", muted ? "true" : "false");
    dom.muteButton.setAttribute("aria-label", muted ? "소리 켜기" : "소리 끄기");
  }

  function updateMusicButton() {
    const muted = window.CardAudio.isBgmMuted();
    dom.musicButton.classList.toggle("is-muted", muted);
    dom.musicButton.setAttribute("aria-pressed", muted ? "true" : "false");
    dom.musicButton.setAttribute(
      "aria-label",
      muted ? "배경음악 켜기" : "배경음악 끄기"
    );
  }

  async function init() {
    cacheDom();
    ensureTechniquePool();
    warmTechniqueAssets();
    bindEvents();
    updateMuteButton();
    updateMusicButton();
    if (window.CardAudio.setPageHidden) {
      window.CardAudio.setPageHidden(document.hidden);
    }
    if (window.CardAudio.setScene) {
      window.CardAudio.setScene("collection");
    }
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
    soundForEvents: soundForEvents,
    techniquePlanForEvents: techniquePlanForEvents,
    techniqueTimings: TECHNIQUE_TIMINGS,
    particleConfig: COMBAT_PARTICLE_CONFIG,
    particleRecipeForPlan: particleRecipeForPlan,
    materialPalettes: MATERIAL_PALETTES,
    paletteForPlan: paletteForPlan,
    recipeForAttack: recipeForAttack
  });

  document.addEventListener("DOMContentLoaded", init);
}());
