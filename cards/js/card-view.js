(function () {
  "use strict";

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
  // 종합점수 = 별 하나 5점 + 체력 5마다 1점. 가장 센 폴리페모스가 85점,
  // 가장 약한 미다스 왕이 32점이라 아이가 카드끼리 견주기 좋은 폭이 나온다.
  const TOTAL_STAR_POINT = 5;
  const TOTAL_HP_DIVISOR = 5;


  const ART_POSITION = {
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
    baigujing: "50% 20%"
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

  function totalScore(card) {
    const stars = STAT_META.reduce(function (sum, meta) {
      return sum + statValue(card, meta.key);
    }, 0);
    const hp = card && Number.isFinite(Number(card.hp)) ? Number(card.hp) : 0;
    return stars * TOTAL_STAR_POINT + Math.round(hp / TOTAL_HP_DIVISOR);
  }

  function createTotal(card) {
    const score = totalScore(card);
    const row = el("div", "stat-total");
    row.setAttribute("role", "img");
    row.setAttribute("aria-label", "종합 " + score + "점");
    const label = el("span", "stat-label", "🏅 종합");
    const track = el("span", "total-track");
    const fill = el("span", "total-fill");
    fill.style.width = Math.max(4, Math.min(100, score)) + "%";
    track.appendChild(fill);
    const value = el("strong", "total-value", String(score));
    label.setAttribute("aria-hidden", "true");
    track.setAttribute("aria-hidden", "true");
    value.setAttribute("aria-hidden", "true");
    row.append(label, track, value);
    return row;
  }

  function createStats(card) {
    const stats = el("div", "card-stats");
    stats.setAttribute("aria-label", "카드 능력치");
    // 종합은 맨 위에 둔다. 맨 아래에 두면 카드 모서리 장식이 숫자를 덮는다.
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
          ? chart[weak].icon + " " + chart[weak].label + "에게 +10" : "약점 없음",
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

    const glow = el("span", "art-glow");
    glow.setAttribute("aria-hidden", "true");
    frame.appendChild(glow);

    if (options.locked) {
      const veil = el("div", "lock-veil");
      veil.append(el("span", "lock-icon", "🔒"), el("strong", "", "이야기를 들으면 깨어나요"));
      frame.appendChild(veil);
    }
    if (options.collectionOnly) {
      frame.appendChild(el("span", "collection-only-badge", "수집 카드 · 대전 준비 중"));
    }
    return frame;
  }

  function create(card, options) {
    options = options || {};
    const type = TYPE_META[card.type] || TYPE_META.wise;
    const currentHp = Number.isFinite(options.currentHp) ? options.currentHp : card.hp;
    const cardEl = el("article", "story-card type-" + card.type);
    const rarity = Math.max(1, Math.min(3, Number(card.rarity) || 1));
    cardEl.dataset.cardId = card.id;
    cardEl.dataset.type = card.type;
    cardEl.dataset.rarity = String(rarity);
    cardEl.classList.add("rarity-" + rarity);
    cardEl.setAttribute("role", options.interactive ? "button" : "group");
    const stateLabel = options.locked
      ? "잠긴 카드"
      : options.collectionOnly
        ? "컬렉션 전용 카드, 대전 준비 중"
        : options.interactive ? "선택 가능한 카드" : "대전 카드";
    cardEl.setAttribute(
      "aria-label",
      card.name + ", " + type.label + " 타입, 희귀도 별 " + rarity +
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
    identity.append(el("h3", "card-name", card.name), el("span", "rarity", rarityLabel(card.rarity)));
    const hp = el("div", "hp-gem");
    hp.innerHTML = '<span>체력</span><strong>' + Math.max(0, currentHp) + '</strong><i>♥</i>';
    crown.append(identity, hp);

    const meta = el("div", "card-meta");
    const storyLabel = options.collectionOnly
      ? "컬렉션 전용 · 대전 준비 중"
      : card.unlock ? "이야기에서 깨어난 카드" : "처음부터 함께하는 카드";
    meta.append(el("span", "type-chip", type.label + " · " + combatInfo(card).element), el("span", "card-story", storyLabel));

    const hpTrack = el("div", "hp-track");
    const hpFill = el("span", "hp-fill");
    hpFill.style.width = Math.max(0, Math.min(100, currentHp / card.hp * 100)) + "%";
    hpTrack.appendChild(hpFill);

    const details = el("div", "card-details");
    const facts = createCombatInfo(card);
    if (card.passive) {
      const passive = el("div", "passive-row");
      const passiveDesc = card.passive.fx === "coin_evade"
        ? `${card.passive.desc} · 한 번 피하면 다음 공격은 맞아요.`
        : card.passive.desc;
      passive.append(el("span", "passive-icon", "✦"), el("strong", "", card.passive.name), el("small", "", passiveDesc));
      details.appendChild(passive);
    }

    const attacks = el("div", "attack-preview");
    (card.attacks || []).forEach(function (attack) {
      const row = el("div", "attack-row");
      const copy = el("span", "attack-copy");
      copy.append(el("strong", "", attack.name), attack.desc ? el("small", "", attack.desc) : document.createTextNode(""));
      const numbers = el("span", "attack-numbers");
      numbers.append(el("b", "cost", "⭐" + attack.cost), el("b", "damage", attack.dmg ? String(attack.dmg) : "✦"));
      row.append(copy, numbers);
      attacks.appendChild(row);
    });
    details.appendChild(attacks);
    if (!options.compact && !options.collectionCompact) {
      const reference = el("details", "card-reference");
      reference.append(el("summary", "", "참고 별점 보기"),
        el("p", "", "별점과 종합은 참고 평가예요. 실제 피해·방어 수치는 기술과 특성을 보세요."),
        createStats(card));
      details.appendChild(reference);
    }

    const art = createArt(card, options);
    if (options.collectionCompact) {
      cardEl.append(ornament, art, crown, facts);
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
    create: create,
    combatInfo: combatInfo,
    artPosition: ART_POSITION,
    typeMeta: TYPE_META,
    statMeta: STAT_META
  };
}());
