(function () {
  "use strict";

  const TYPE_META = {
    brave: { label: "용기", icon: "⚔️" },
    wise: { label: "지혜", icon: "📘" },
    magic: { label: "마법", icon: "✨" },
    monster: { label: "괴물", icon: "🌑" }
  };
  const STAT_META = Object.freeze([
    Object.freeze({ key: "attack", label: "공격력", short: "세기", icon: "⚔" }),
    Object.freeze({ key: "defense", label: "방어력", short: "튼튼", icon: "🛡" }),
    Object.freeze({ key: "spirit", label: "정신력", short: "똑똑", icon: "✨" })
  ]);


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
    tiger: "50% 40%"
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

  function createStats(card) {
    const stats = el("div", "card-stats");
    stats.setAttribute("aria-label", "카드 능력치");
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
        "개, HP " + Math.max(0, currentHp) +
        ", 공격력 " + statValue(card, "attack") + "점" +
        ", 방어력 " + statValue(card, "defense") + "점" +
        ", 정신력 " + statValue(card, "spirit") + "점, " + stateLabel
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
    const crest = el("span", "frame-crest", type.icon);
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
    hp.innerHTML = '<span>HP</span><strong>' + Math.max(0, currentHp) + '</strong><i>♥</i>';
    crown.append(identity, hp);

    const meta = el("div", "card-meta");
    const storyLabel = options.collectionOnly
      ? "컬렉션 전용 · 대전 준비 중"
      : card.unlock ? "이야기에서 깨어난 카드" : "처음부터 함께하는 카드";
    meta.append(el("span", "type-chip", type.icon + " " + type.label), el("span", "card-story", storyLabel));

    const hpTrack = el("div", "hp-track");
    const hpFill = el("span", "hp-fill");
    hpFill.style.width = Math.max(0, Math.min(100, currentHp / card.hp * 100)) + "%";
    hpTrack.appendChild(hpFill);

    const details = el("div", "card-details");
    const stats = createStats(card);
    if (card.passive) {
      const passive = el("div", "passive-row");
      passive.append(el("span", "passive-icon", "✦"), el("strong", "", card.passive.name), el("small", "", card.passive.desc));
      details.appendChild(passive);
    }

    const attacks = el("div", "attack-preview");
    (card.attacks || []).slice(0, options.compact ? 1 : 2).forEach(function (attack) {
      const row = el("div", "attack-row");
      const copy = el("span", "attack-copy");
      copy.append(el("strong", "", attack.name), attack.desc ? el("small", "", attack.desc) : document.createTextNode(""));
      const numbers = el("span", "attack-numbers");
      numbers.append(el("b", "cost", "⭐" + attack.cost), el("b", "damage", attack.dmg ? String(attack.dmg) : "✦"));
      row.append(copy, numbers);
      attacks.appendChild(row);
    });
    details.appendChild(attacks);

    const art = createArt(card, options);
    if (options.collectionCompact) {
      cardEl.append(ornament, art, crown, stats);
    } else if (options.compact) {
      cardEl.append(ornament, crown, stats, art, hpTrack, meta, details);
    } else {
      cardEl.append(ornament, crown, art, hpTrack, meta, stats, details);
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
    artPosition: ART_POSITION,
    typeMeta: TYPE_META,
    statMeta: STAT_META
  };
}());
