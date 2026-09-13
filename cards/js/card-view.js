(function () {
  "use strict";

  // Familiar nicknames for the existing original hero art; IDs and balance data stay unchanged.
  const HERO_NAMES = Object.freeze({
    gearwing: "아이언 윙", starshield: "캡틴 스타", thunderguard: "토르 썬더",
    redknot: "블랙 위도", walllizard: "스파이더 키드",
    neonjumper: "마일스 점퍼", moonmoth: "고스트 스파이더"
  });
  function displayName(card) { return HERO_NAMES[card.id] || card.name; }
  function presentCard(card) { return HERO_NAMES[card.id] ? { ...card, name: displayName(card) } : card; }
  function filterCollection(cards, element) {
    return cards.filter(card => element === "all" || card.element === element);
  }

  const TYPE_META = {
    brave: { label: "용기", icon: "⚔️" },
    wise: { label: "지혜", icon: "📘" },
    magic: { label: "마법", icon: "✨" },
    monster: { label: "괴물", icon: "🌑" }
  };
  const STAT_META = Object.freeze([
    Object.freeze({ key: "attack", label: "공격", short: "공격", icon: "⚔" }),
    Object.freeze({ key: "defense", label: "방어", short: "방어", icon: "🛡" }),
    Object.freeze({ key: "spirit", label: "지력", short: "지력", icon: "✨" })
  ]);
  // family-balance.cjs의 전체 75장 맞대결 결과를 등급으로 고정한다.
  // 수치가 바뀌면 검사 도구를 다시 돌리고 이 묶음도 함께 갱신한다.
  const BATTLE_TIERS = Object.freeze({
    S: new Set(["jaei", "midas", "taeo", "eomma", "appa", "scylla", "siren", "baigujing", "zhaoyun", "mermaid"]),
    A: new Set(["perseus", "beanstalkgiant", "circe", "hades", "simayi"]),
    B: new Set(["poseidon", "zhugeliang", "doctorwatson", "wumawang", "hydra", "redknot", "jack", "nezha", "heracles", "zeus", "erlangshen", "polyphemus", "atalanta", "helios", "tiger"]),
    C: new Set(["sseugumi", "zhangfei", "athena", "sunwukong", "ppungdetective", "wolf", "achilles", "kwonyul", "guanyu", "hermes", "sphinx", "witch", "prometheus", "honggildong", "starshield", "moriarty", "redhood", "ganggamchan", "odysseus", "euljimundeok", "apollo", "cinderella", "neonjumper", "arthur", "moonmoth", "threepigs", "thunderguard", "medusa", "theseus", "arsenelupin", "fairygodmother", "gearwing", "sherlockholmes", "tortoisehare", "yisunshin", "pinocchio", "orpheus"]),
    D: new Set(["snowqueen", "honghaier", "cerberus", "bremen", "caocao", "artemis", "minotaur", "walllizard", "genie"])
  });
  const TIER_WIDTH = Object.freeze({ S: 100, A: 82, B: 64, C: 46, D: 28 });


  const ART_POSITION = {
    sseugumi: "50% 22%",
    heracles: "50% 40%",
    honggildong: "50% 40%",
    perseus: "50% 40%",
    jack: "54% 35%",
    threepigs: "50% 40%",
    arthur: "50% 40%",
    odysseus: "49% 45%",
    cinderella: "54% 38%",
    tortoisehare: "50% 40%",
    redhood: "47% 45%",
    bremen: "50% 40%",
    pinocchio: "50% 40%",
    sunwukong: "50% 40%",
    fairygodmother: "53% 42%",
    genie: "50% 40%",
    snowqueen: "50% 40%",
    witch: "50% 40%",
    mermaid: "50% 40%",
    polyphemus: "50% 25%",
    wolf: "50% 40%",
    beanstalkgiant: "50% 40%",
    medusa: "50% 40%",
    midas: "50% 40%",
    tiger: "50% 40%",
    zeus: "50% 10%",
    poseidon: "50% 0%",
    hades: "50% 12%",
    apollo: "50% 15%",
    minotaur: "50% 6%",
    cerberus: "50% 18%",
    hydra: "50% 14%",
    sphinx: "50% 55%",
    achilles: "50% 20%",
    theseus: "50% 22%",
    artemis: "50% 24%",
    atalanta: "50% 30%",
    athena: "50% 18%",
    hermes: "50% 28%",
    orpheus: "50% 24%",
    prometheus: "50% 20%",
    guanyu: "50% 22%",
    zhangfei: "50% 24%",
    zhaoyun: "50% 22%",
    zhugeliang: "50% 18%",
    caocao: "50% 18%",
    simayi: "50% 18%",
    nezha: "50% 24%",
    erlangshen: "50% 20%",
    wumawang: "50% 18%",
    honghaier: "50% 24%",
    baigujing: "50% 20%",
    jaei: "50% 24%",
    taeo: "50% 22%",
    appa: "50% 20%",
    eomma: "50% 22%",
    yisunshin: "50% 20%",
    euljimundeok: "50% 20%",
    ganggamchan: "50% 20%",
    kwonyul: "50% 22%",
    sherlockholmes: "50% 20%",
    doctorwatson: "50% 22%",
    arsenelupin: "50% 20%",
    moriarty: "50% 20%",
    gearwing: "50% 18%",
    starshield: "50% 18%",
    thunderguard: "50% 18%",
    redknot: "50% 20%",
    walllizard: "50% 18%",
    neonjumper: "50% 18%",
    moonmoth: "50% 18%",
    ppungdetective: "50% 20%",
    circe: "50% 20%",
    siren: "50% 18%",
    scylla: "50% 16%",
    helios: "50% 18%"
  };

  function el(tag, className, text) {
    const node = document.createElement(tag);
    if (className) node.className = className;
    if (text !== undefined) node.textContent = text;
    return node;
  }

  function rarityLabel(rarity) {
    return "⭐".repeat(Math.max(1, Math.min(3, rarity || 1)));
  }
  function statValue(card, key) {
    const value = card && card.stats ? Number(card.stats[key]) : 1;
    return Math.max(1, Math.min(5, Number.isFinite(value) ? Math.round(value) : 1));
  }

  function battleTier(card) {
    const id = card && card.id;
    for (const tier of ["S", "A", "B", "C", "D"]) {
      if (BATTLE_TIERS[tier].has(id)) return tier;
    }
    return "D";
  }

  function createTotal(card) {
    const tier = battleTier(card);
    const row = el("div", "stat-total");
    row.dataset.tier = tier;
    row.setAttribute("role", "img");
    row.setAttribute("aria-label", "실전 등급 " + tier);
    const label = el("span", "stat-label", "🏆 실전");
    const track = el("span", "total-track");
    const fill = el("span", "total-fill");
    fill.style.width = TIER_WIDTH[tier] + "%";
    track.appendChild(fill);
    const value = el("strong", "total-value", tier);
    label.setAttribute("aria-hidden", "true");
    track.setAttribute("aria-hidden", "true");
    value.setAttribute("aria-hidden", "true");
    row.append(label, track, value);
    return row;
  }

  function createStats(card) {
    const stats = el("div", "card-stats");
    stats.setAttribute("aria-label", "카드 능력치");
    // 실전 등급은 맨 위에 둔다. 맨 아래에 두면 카드 모서리 장식이 글자를 덮는다.
    stats.appendChild(createTotal(card));
    STAT_META.forEach(function (meta) {
      const value = statValue(card, meta.key);
      const row = el("div", "stat-row stat-" + meta.key);
      row.setAttribute("role", "img");
      const label = el("span", "stat-label", meta.icon + " " + meta.short);
      const meter = el("span", "stat-meter");
      row.setAttribute("aria-label", meta.label + " " + value + "점 만점 5");
      label.setAttribute("aria-hidden", "true");
      meter.setAttribute("aria-hidden", "true");
      meter.dataset.value = String(value);
      for (let index = 0; index < 5; index += 1) {
        meter.appendChild(el("i", "stat-star" + (index < value ? " is-filled" : "")));
      }
      row.append(label, meter);
      stats.appendChild(row);
    });
    return stats;
  }


  function combatInfo(card) {
    const attacks = (card.attacks || []).filter(a => !window.CardEngine ||
      window.CardEngine.isAttackSupported(a));
    const best = attacks.slice().sort((a, b) =>
      (Number(b.dmg) || 0) - (Number(a.dmg) || 0) || a.cost - b.cost)[0];
    const chart = window.CardEngine ? window.CardEngine.ELEMENT_CHART : {};
    const element = chart[card.element];
    const weak = element && element.weakTo;
    return {
      element: element ? element.icon + " " + element.label : "속성 없음",
      attack: best && best.dmg > 0 ? best.dmg + " 피해 · ⭐" + best.cost : "효과 기술",
      attackNote: best ? best.name + " — 기본 피해이며 약점·특성·누적으로 달라져요." : "기술을 확인해 주세요.",
      weakness: card.passive && card.passive.fx === "no_weakness"
        ? "🛡 상성 방어" : weak && chart[weak]
          ? chart[weak].icon + " " + chart[weak].label + "에게 피해 +10" : "약점 없음",
      passive: card.passive ? ({
        reduce_dmg_10: "피해 −10",
        reduce_dmg_20_monster: "괴물 피해 −20",
        first_hit_zero: "첫 공격 막기",
        revive_half_once: "한 번 부활",
        coin_evade: "동전 회피",
        coin_miss: "동전 실패 시 빗나감",
        no_weakness: "상성 +10 방어",
        nullify_passive: "상대 특성 무효",
        boost_20_below_half: "반피 아래 공격 +20",
        wish_limit_3: "기술 총 3회 제한"
      }[card.passive.fx] || card.passive.name) : "특성 없음"
    };
  }

  function createCombatInfo(card) {
    const info = combatInfo(card);
    const box = el("div", "combat-facts");
    const attack = el("div", "combat-fact combat-power");
    attack.append(el("span", "", info.element), el("strong", "", info.attack));
    attack.setAttribute("title", info.attackNote);
    const weak = el("div", "combat-fact combat-weakness");
    weak.append(el("span", "", "약점 피해"), el("strong", "", info.weakness));
    const passive = el("div", "combat-fact combat-trait");
    passive.append(el("span", "", "특성"), el("strong", "", info.passive));
    passive.setAttribute("title", card.passive ? card.passive.desc : "별도 특성이 없어요.");
    box.append(attack, weak, passive);
    return box;
  }

  // Display-only wording. Mechanics and the locked data fingerprints stay intact.
  function describePassive(card) {
    if (!card.passive) return "따로 쓰는 자동 능력은 없어요.";
    return ({
      reduce_dmg_10: "공격을 맞으면 받는 피해를 10 줄여요. 예: 30 피해 → 20 피해.",
      reduce_dmg_20_monster: "괴물 타입에게 공격받으면 피해를 20 줄여요.",
      first_hit_zero: "처음 받는 공격 피해를 한 번 막아요. 그다음부터는 피해를 받아요.",
      revive_half_once: "처음 쓰러지면 체력을 절반 채우고 한 번 다시 일어나요.",
      coin_evade: "공격받을 때 동전이 앞면이면 피해요. 한 번 피하면 다음 공격은 이 능력으로 피할 수 없어요.",
      coin_miss: "동전을 던져 뒷면이 나오면 내 기술이 빗나가요.",
      no_weakness: "내 약점 속성에게 맞아도 추가 피해 10을 받지 않아요.",
      nullify_passive: "상대의 자동 능력을 못 쓰게 해요. 상대의 공격 기술은 그대로예요.",
      boost_20_below_half: "내 체력이 절반 이하가 되면 공격 피해가 20 늘어요."
    })[card.passive.fx] || card.passive.desc;
  }

  function describeAttack(attack) {
    if (window.CardEngine && !window.CardEngine.isAttackSupported(attack))
      return "아직 대결에서 쓸 수 없는 기술이에요.";
    const parts = ["별사탕 " + attack.cost + "개를 써요."];
    if (attack.fx === "dmg_half_enemy_hp") {
      parts.push("상대의 남은 체력 절반만큼 공격해요. 10 단위로 내리고, 최소 피해는 10이에요.");
    } else if (attack.dmg > 0) parts.push("기본 피해는 " + attack.dmg + "이에요.");
    const effect = {
      weaken_next_20: "상대의 다음 공격 피해를 20 줄여요. 단, 최소 10 피해는 남아요.",
      skip_next_enemy: "상대는 다음 차례를 한 번 쉬어요.",
      coin_skip_next_enemy: "동전이 앞면이면 상대가 다음 차례를 한 번 쉬어요.",
      gain_star_1: "쓴 뒤 별사탕 1개를 돌려받아요. 최대 5개까지 모아요.",
      steal_star_1: "상대에게 별사탕이 있으면 1개를 가져와요. 내 별사탕이 5개면 가져오지 못해요.",
      heal_40: "내 체력을 40 회복해요. 처음 체력보다 높아지지는 않아요.",
      dmg_stack_10: "이 기술을 쓸 때마다 다음에 쓸 기본 피해가 10씩 늘어요.",
      gold_freeze_gain_star: "상대가 다음 차례를 한 번 쉬고, 나는 별사탕 1개를 받아요. 최대 5개까지 모아요."
    }[attack.fx];
    if (effect) parts.push(effect);
    return parts.join(" ");
  }

  function sortCollection(cards, mode, unlocked, playable) {
    const elements = ["wood", "fire", "earth", "metal", "water", null];
    const power = card => Math.max(0, ...(card.attacks || []).filter(a =>
      !window.CardEngine || window.CardEngine.isAttackSupported(a)).map(a => Number(a.dmg) || 0));
    return cards.map((card,index) => ({card,index,ready:unlocked(card)?0:playable(card)?1:2})).sort((a,b) => {
      let order = 0;
      if (mode === "hp") order = b.card.hp - a.card.hp;
      else if (mode === "power") order = power(b.card) - power(a.card);
      else if (mode === "element") order = elements.indexOf(a.card.element || null) - elements.indexOf(b.card.element || null);
      else if (mode === "name") order = displayName(a.card).localeCompare(displayName(b.card), "ko");
      else order = a.ready - b.ready;
      return order || a.index - b.index;
    }).map(entry => entry.card);
  }

  function createArt(card, options) {
    const frame = el("div", "card-art");
    const picture = document.createElement("picture");
    const source = document.createElement("source");
    const img = document.createElement("img");
    const requestedArt = card.art || ("art/" + card.id + ".png");
    const png = requestedArt.replace(/\.webp$/i, ".png");
    const webp = requestedArt.replace(/\.png$/i, ".webp");
    const fallback = el("span", "art-fallback", card.emoji || "✦");
    let retriedPng = false;

    fallback.hidden = true;
    fallback.setAttribute("aria-hidden", "true");
    source.srcset = webp;
    source.type = "image/webp";
    img.src = png;
    img.alt = card.name + " 카드 원화";
    img.loading = options.eager ? "eager" : "lazy";
    img.decoding = "async";
    img.draggable = false;
    img.style.objectPosition = ART_POSITION[card.id] || "50% 40%";
    img.addEventListener("error", function () {
      if (!retriedPng && source.isConnected && webp !== png) {
        retriedPng = true;
        source.remove();
        img.src = png;
        return;
      }
      picture.hidden = true;
      fallback.hidden = false;
      frame.classList.add("has-fallback");
    });
    picture.append(source, img);
    frame.append(picture, fallback);

    const element = combatInfo(card).element;
    const rune = el("span", "element-rune", element);
    rune.setAttribute("aria-hidden", "true");
    frame.appendChild(rune);

    const glow = el("span", "art-glow");
    glow.setAttribute("aria-hidden", "true");
    frame.appendChild(glow);

    if (options.locked) {
      const veil = el("div", "lock-veil");
      veil.append(el("span", "lock-icon", "🔒"), el("strong", "", "아직 잠든 카드"));
      frame.appendChild(veil);
    }
    if (options.collectionOnly) {
      frame.appendChild(el("span", "collection-only-badge", "수집 카드 · 대전 준비 중"));
    }
    return frame;
  }

  function create(card, options) {
    card = presentCard(card);
    options = options || {};
    const type = TYPE_META[card.type] || TYPE_META.wise;
    const currentHp = Number.isFinite(options.currentHp) ? options.currentHp : card.hp;
    const cardEl = el("article", "story-card type-" + card.type);
    const rarity = Math.max(1, Math.min(3, Number(card.rarity) || 1));
    cardEl.dataset.cardId = card.id;
    cardEl.dataset.type = card.type;
    cardEl.dataset.element = card.element || "none";
    cardEl.dataset.rarity = String(rarity);
    cardEl.classList.add("rarity-" + rarity);
    if (card.element) cardEl.classList.add("element-" + card.element);
    cardEl.setAttribute("role", options.interactive ? "button" : "group");
    const stateLabel = options.locked
      ? "잠긴 카드"
      : options.collectionOnly
        ? "컬렉션 전용 카드, 대전 준비 중"
        : options.interactive ? "선택 가능한 카드" : "대전 카드";
    cardEl.setAttribute(
      "aria-label",
      card.name + ", " + type.label + " 타입, " + combatInfo(card).element + ", 희귀도 별 " + rarity +
        "개" +
        ", 체력 " + Math.max(0, currentHp) +
        ", " + combatInfo(card).attack + ", " + combatInfo(card).weakness +
        ", 특성 " + combatInfo(card).passive + ", " + stateLabel
    );
    if (options.interactive) {
      cardEl.tabIndex = 0;
      cardEl.setAttribute("aria-pressed", options.selected ? "true" : "false");
    }
    if (options.locked) cardEl.classList.add("is-locked");
    if (options.interactive && options.collectionCompact) {
      cardEl.setAttribute("aria-haspopup", "dialog");
      cardEl.setAttribute("aria-label", card.name + ", 실전 등급 " + battleTier(card) + ", 체력 " + currentHp + ", " + combatInfo(card).element + ", " + stateLabel + ". 눌러서 능력 자세히 보기");
    }
    if (options.collectionOnly) cardEl.classList.add("is-collection-only");
    if (options.selected) cardEl.classList.add("is-selected");
    if (options.compact) cardEl.classList.add("is-compact");
    if (rarity === 3) cardEl.classList.add("is-legendary");
    if (options.hit) cardEl.classList.add("is-hit");
    if (options.collectionCompact) cardEl.classList.add("is-collection-compact");
    if (options.acting) cardEl.classList.add("is-acting");

    const crown = el("div", "card-crown");
    const ornament = el("div", "frame-ornament");
    const crest = el("span", "frame-crest", combatInfo(card).element.split(" ")[0]);
    crest.setAttribute("aria-hidden", "true");
    ornament.setAttribute("aria-hidden", "true");
    ornament.append(
      crest,
      el("i", "frame-corner frame-corner-nw"),
      el("i", "frame-corner frame-corner-ne"),
      el("i", "frame-corner frame-corner-sw"),
      el("i", "frame-corner frame-corner-se")
    );
    const identity = el("div", "card-identity");
    if (options.collectionCompact) {
      const tier = el("span", "collection-tier");
      tier.setAttribute("aria-label", "실전 등급 " + battleTier(card));
      tier.setAttribute("title", "실전 등급 " + battleTier(card) + " · 여러 카드와의 대결 평가예요. 상대와 상성에 따라 결과는 달라져요.");
      tier.append(el("small", "", "실전"), el("b", "", battleTier(card)));
      identity.appendChild(tier);
    }
    identity.append(el("h3", "card-name", card.name), el("span", "rarity", rarityLabel(card.rarity)));
    const hp = el("div", "hp-gem");
    hp.innerHTML = '<span>체력</span><strong>' + Math.max(0, currentHp) + '</strong><i>♥</i>';
    crown.append(identity, hp);

    const meta = el("div", "card-meta");
    const storyLabel = options.collectionOnly
      ? "컬렉션 전용 · 대전 준비 중"
      : card.unlock ? "함께할 수 있는 영웅 카드" : "처음부터 함께하는 카드";
    meta.append(el("span", "type-chip", type.label + " · " + combatInfo(card).element), el("span", "card-story", storyLabel));

    const hpTrack = el("div", "hp-track");
    const hpFill = el("span", "hp-fill");
    hpFill.style.width = Math.max(0, Math.min(100, currentHp / card.hp * 100)) + "%";
    hpTrack.appendChild(hpFill);

    const details = el("div", "card-details");
    const facts = createCombatInfo(card);
    if (card.passive) {
      const passive = el("div", "passive-row");
      const passiveDesc = describePassive(card);
      passive.append(el("span", "passive-icon", "✦"), el("strong", "", "자동 능력 · " + card.passive.name), el("small", "", passiveDesc));
      details.appendChild(passive);
    }

    const attacks = el("div", "attack-preview");
    (card.attacks || []).forEach(function (attack) {
      const row = el("div", "attack-row");
      const copy = el("span", "attack-copy");
      copy.append(el("strong", "", attack.name), el("small", "", describeAttack(attack)));
      const numbers = el("span", "attack-numbers");
      numbers.append(el("b", "cost", "⭐" + attack.cost), el("b", "damage", attack.dmg ? String(attack.dmg) : "✦"));
      row.append(copy, numbers);
      attacks.appendChild(row);
    });
    details.appendChild(attacks);
    if (!options.compact && !options.collectionCompact) {
      const reference = el("details", "card-reference");
      reference.append(el("summary", "", "참고 별점 보기"),
        el("p", "", "실전 등급은 전체 카드 맞대결 결과예요. 별점은 카드의 성격을 보여 줘요."),
        createStats(card));
      details.appendChild(reference);
    }

    const art = createArt(card, options);
    if (options.collectionCompact) {
      cardEl.append(ornament, art, crown);
    } else if (options.compact) {
      cardEl.append(ornament, crown, facts, art, hpTrack, meta, details);
    } else {
      cardEl.append(ornament, crown, art, hpTrack, meta, facts, details);
    }

    if (options.interactive && typeof options.onSelect === "function") {
      const activate = function () { options.onSelect(card, cardEl); };
      cardEl.addEventListener("click", activate);
      cardEl.addEventListener("keydown", function (event) {
        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault();
          activate();
        }
      });
    }
    return cardEl;
  }

  window.CardView = {
    displayName: displayName,
    presentCard: presentCard,
    filterCollection: filterCollection,
    create: create,
    combatInfo: combatInfo,
    describePassive: describePassive,
    describeAttack: describeAttack,
    sortCollection: sortCollection,
    battleTier: battleTier,
    artPosition: ART_POSITION,
    typeMeta: TYPE_META,
    statMeta: STAT_META,
    battleTiers: BATTLE_TIERS
  };
}());
