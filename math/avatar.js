/* 매일 수학 10분 — 내 캐릭터·코인·옷장 (공주 옷장의 PrincessStudio 렌더러 재사용)
   그림 자산은 ../princess/assets/ 의 2D 레이어(AI 생성)이고, 이 파일은 카탈로그·가격·코인 규칙·렌더 연결만 담당한다. */
(function (root) {
  "use strict";
  const BASE = "../princess/";
  const CHARS = [
    { id: "snow", name: "백설공주", hair: "bob", hairColor: "#2b2230", def: { dress: ["aline", "#f2c94c"], shoes: ["pumps", "#e0553d"] } },
    { id: "cinder", name: "신데렐라", hair: "bun", hairColor: "#f3cc6a", def: { dress: ["ballgown", "#6fc3ff"], shoes: ["glass", "#6fc3ff"] } },
    { id: "rapunzel", name: "라푼젤", hair: "braid", hairColor: "#f3cc6a", def: { dress: ["party", "#c98bff"], shoes: ["ballet", "#c98bff"] } },
    { id: "mermaid", name: "인어공주", hair: "wavy", hairColor: "#5fd9c9", def: { dress: ["tail", "#5fd9c9"], shoes: null } },
    { id: "thumb", name: "엄지공주", hair: "pigtails", hairColor: "#b07a4a", def: { dress: ["summer", "#7ad97a"], shoes: ["sandals", "#f2c94c"] } },
    { id: "kongjwi", name: "콩쥐", hair: "daenggi", hairColor: "#2b2230", def: { dress: ["hanbok", "#ff7aa8"], shoes: ["kkotsin", "#ff7aa8"] } },
    { id: "briar", name: "들장미 공주", hair: "curls", hairColor: "#e0553d", def: { dress: ["rose", "#ff5a6e"], shoes: ["pumps", "#ff5a6e"] } },
    { id: "moon", name: "달빛 공주", hair: "afro", hairColor: "#2b2230", def: { dress: ["star", "#3b2f7a"], shoes: ["boots", "#3b2f7a"] } },
    { id: "frost", name: "설원 공주", hair: "bun", hairColor: "#b07a4a", def: { dress: ["winter", "#6fc3ff"], shoes: ["boots", "#ffffff"] } },
    { id: "sahara", name: "사막별 공주", hair: "bob", hairColor: "#503325", def: { dress: ["adventure", "#f2c94c"], shoes: ["sneakers", "#ffffff"] } },
    { id: "lotus", name: "연꽃 공주", hair: "bun", hairColor: "#2b2230", def: { dress: ["aline", "#ff9ad0"], shoes: ["slippers", "#ff9ad0"] } },
    { id: "sunny", name: "햇살 공주", hair: "pigtails", hairColor: "#b07a4a", def: { dress: ["rainbow", "#ffd93d"], shoes: ["sneakers", "#ffd93d"] } }
  ];
  const CATS = [
    { id: "hair", name: "머리", icon: "💇" }, { id: "dress", name: "옷", icon: "👗" }, { id: "crown", name: "머리 장식", icon: "👑" },
    { id: "neck", name: "목걸이", icon: "📿" }, { id: "shoes", name: "신발", icon: "👠" }, { id: "back", name: "날개·망토", icon: "🦋" }, { id: "pet", name: "친구", icon: "🐰" }
  ];
  const CATALOG = {
    hair: [["bob", "단발머리", 40], ["bun", "올림머리", 40], ["braid", "긴 땋은 머리", 60], ["wavy", "웨이브", 60], ["pigtails", "양갈래", 40], ["daenggi", "댕기머리", 50], ["curls", "굵은 곱슬", 60], ["afro", "풍성한 곱슬", 60]],
    dress: [["party", "파티 원피스", 60, "#ff8fb4"], ["summer", "여름 원피스", 50, "#7ad9b0"], ["aline", "꽃 드레스", 70, "#ffb3c6"], ["tutu", "발레 튜튜", 80, "#ffd1e1"], ["adventure", "모험 옷", 80, "#6fbe58"], ["winter", "겨울 코트", 90, "#c9b2e8"], ["rainbow", "무지개 드레스", 90, "#ffd93d"], ["star", "별빛 마법사", 90, "#3b2f7a"], ["rose", "장미 드레스", 100, "#ff5a6e"], ["hanbok", "한복", 110, "#ff7aa8"], ["mermaidline", "인어라인 드레스", 130, "#5fd9c9"], ["tail", "인어 꼬리", 140, "#5fd9c9"], ["ballgown", "무도회 드레스", 150, "#6fc3ff"]],
    crown: [["starclip", "별 핀", 30, "#ffd93d"], ["bow", "큰 리본", 40, "#ff8fb4"], ["flowers", "꽃관", 40, "#ff9ad0"], ["daenggi", "배씨댕기", 40, "#ff5a6e"], ["pearls", "진주 머리띠", 50, "#ffffff"], ["bunny", "토끼 귀", 50, "#ffffff"], ["catears", "고양이 귀", 50, "#2b2230"], ["witch", "마녀 모자", 60, "#3b2f7a"], ["hennin", "고깔 모자", 60, "#c98bff"], ["tiara", "티아라", 70, "#6fc3ff"], ["moon", "달빛 관", 70, "#ffd93d"], ["crown", "황금 왕관", 80, "#ffd93d"], ["veil", "면사포", 80, "#ffffff"]],
    neck: [["choker", "리본 초커", 30, "#ff5a6e"], ["pearls", "진주 목걸이", 40, "#ffffff"], ["heart", "하트 목걸이", 40, "#ff5a6e"], ["scarf", "스카프", 40, "#6fc3ff"], ["flowerlei", "꽃 목걸이", 40, "#ff9ad0"], ["star", "별 목걸이", 50, "#ffd93d"], ["norigae", "노리개", 50, "#ff7aa8"], ["gem", "보석 목걸이", 60, "#c98bff"]],
    shoes: [["pumps", "구두", 30, "#e0553d"], ["sandals", "샌들", 30, "#f2c94c"], ["slippers", "털 슬리퍼", 30, "#ff9ad0"], ["sneakers", "운동화", 40, "#ffffff"], ["ballet", "발레 슈즈", 40, "#ffb3c6"], ["rain", "장화", 40, "#ffd93d"], ["kkotsin", "꽃신", 40, "#ff7aa8"], ["boots", "부츠", 50, "#7a4a2a"], ["glass", "유리 구두", 60, "#6fc3ff"]],
    back: [["backpack", "배낭", 50, "#ff8fb4"], ["cape", "망토", 70, "#ff5a6e"], ["bat", "박쥐 날개", 70, "#3b2f7a"], ["fairy", "요정 날개", 90, "#c98bff"], ["butterfly", "나비 날개", 90, "#6fc3ff"], ["angel", "천사 날개", 100, "#ffffff"]],
    pet: [["mouse", "생쥐", 40, "#c9c9d9"], ["toad", "두꺼비", 40, "#7ad97a"], ["bird", "파랑새", 50, "#6fc3ff"], ["frog", "개구리 왕자", 50, "#7ad97a"], ["butterfly", "나비", 50, "#ff9ad0"], ["hamster", "햄스터", 50, "#f2c94c"], ["fish", "물고기", 50, "#ff9a4d"], ["cat", "고양이", 60, "#ffd1a6"], ["dog", "강아지", 60, "#d9a066"], ["rabbit", "토끼", 60, "#ffffff"], ["deer", "아기 사슴", 80, "#d9a066"], ["unicorn", "아기 유니콘", 120, "#ffffff"], ["dragon", "아기 용", 120, "#7ad97a"]]
  };
  const ITEMS = {};
  Object.keys(CATALOG).forEach(function (cat) {
    CATALOG[cat] = CATALOG[cat].map(function (row) { const it = { cat: cat, id: row[0], name: row[1], price: row[2], color: row[3] || null, key: cat + "/" + row[0] }; ITEMS[it.key] = it; return it; });
  });
  const COLORS = ["#ff8fb4", "#ff5a6e", "#ff9a4d", "#ffd93d", "#7ad97a", "#5fd9c9", "#6fc3ff", "#c98bff", "#ffffff", "#2b2230"];
  const HAIR_COLORS = ["#2b2230", "#503325", "#b07a4a", "#f3cc6a", "#e0553d", "#ff9ad0", "#c98bff", "#5fd9c9", "#6fc3ff", "#ffffff"];
  // 코인 규칙 — 매일 하면 이틀에 작은 것 하나, 큰 드레스는 일주일 저축
  const COIN = { correct: 1, session: 10, perfect: 10, placement: 30, levelUp: 50, chest: 30, capsule: 5 };

  function charById(id) { return CHARS.find(function (c) { return c.id === id; }) || CHARS[1]; }
  function item(key) { return ITEMS[key] || null; }
  function starter(charId) {
    // 처음 가진 것: 그 인형의 기본 머리·기본 드레스·기본 신발. 나머지는 옷장에서 코인으로.
    const c = charById(charId), owned = {};
    owned["hair/" + c.hair] = true;
    if (c.def.dress) owned["dress/" + c.def.dress[0]] = true;
    if (c.def.shoes) owned["shoes/" + c.def.shoes[0]] = true;
    const avatar = { char: c.id, hair: c.hair, hairColor: c.hairColor, dress: c.def.dress ? { id: c.def.dress[0], color: c.def.dress[1] } : null, shoes: c.def.shoes ? { id: c.def.shoes[0], color: c.def.shoes[1] } : null, crown: null, neck: null, back: null, pet: null, bg: "plain" };
    return { avatar: avatar, owned: owned };
  }
  // PrincessStudio 가 원하는 상태로 변환
  function studioState(avatar) {
    const p = charById(avatar.char);
    const st = { bg: avatar.bg || "plain", hairStyle: avatar.hair || p.hair, hairColor: avatar.hairColor || p.hairColor };
    ["dress", "shoes", "crown", "neck", "back", "pet"].forEach(function (cat) { st[cat] = avatar[cat] && avatar[cat].id ? { id: avatar[cat].id, color: avatar[cat].color } : null; });
    if (st.dress && st.dress.id === "tail") st.shoes = null;
    return { st: st, p: Object.assign({}, p, { skin: "#ffdfcc", eye: "#4a3a2e" }) };
  }
  function studio() { return root.PrincessStudio || null; }
  // 스튜디오는 공주 폴더 기준 상대경로를 쓴다 → 우리 폴더에서 보이도록 앞에 ../princess/ 를 붙인다
  function relocate(svg) { return String(svg || "").replace(/href="assets\//g, 'href="' + BASE + 'assets/'); }
  function renderDoll(avatar) {
    const P = studio(); if (!P) return "";
    const s = studioState(avatar);
    return relocate(P.render(s.st, s.p));
  }
  function renderThumb(cat, id, color) {
    const P = studio(); if (!P) return "";
    return relocate(P.thumb(cat, { id: id }, color || (item(cat + "/" + id) || {}).color || "#ff8fb4"));
  }
  function renderPortrait(charId, hairColor) {
    const P = studio(); if (!P) return "";
    const p = Object.assign({}, charById(charId), { skin: "#ffdfcc", eye: "#4a3a2e" });
    return relocate(P.portrait(p, hairColor || p.hairColor));
  }
  // 캡슐·보물상자에서 나오는 옷장 아이템: 아직 없는 것 중 가격 상한 안에서 무작위
  function randomDrop(owned, maxPrice, rng) {
    const pool = Object.keys(ITEMS).filter(function (k) { return !owned[k] && ITEMS[k].price <= maxPrice; });
    if (!pool.length) return null;
    return ITEMS[pool[Math.floor((rng || Math.random)() * pool.length)]];
  }
  // 캡슐 상품표 — 열 때마다 무작위. 보물상자는 큰 것만.
  const PRIZES = [
    { type: "sticker", w: 40, label: "친구 스티커" },
    { type: "item", w: 25, max: 80, label: "옷장 아이템" },
    { type: "coins", w: 20, label: "코인 주머니" },
    { type: "shiny", w: 10, label: "반짝 스티커" },
    { type: "jackpot", w: 5, max: 150, coins: 20, label: "대박!" }
  ];
  const CHEST_PRIZES = [
    { type: "item", w: 50, max: 150, label: "옷장 아이템" },
    { type: "jackpot", w: 30, max: 150, coins: 30, label: "대박!" },
    { type: "coins", w: 20, big: true, label: "코인 주머니" }
  ];
  function rollPrize(rng, weekly, owned) {
    rng = rng || Math.random;
    const table = weekly ? CHEST_PRIZES : PRIZES;
    const total = table.reduce(function (s, p) { return s + p.w; }, 0);
    let draw = rng() * total, pick = table[table.length - 1];
    for (let i = 0; i < table.length; i++) { draw -= table[i].w; if (draw < 0) { pick = table[i]; break; } }
    const out = { type: pick.type, label: pick.label };
    if (pick.type === "coins") { const bag = pick.big ? [40, 50, 60] : [10, 15, 20, 30]; out.coins = bag[Math.floor(rng() * bag.length)]; }
    if (pick.type === "item" || pick.type === "jackpot") {
      out.item = randomDrop(owned || {}, pick.max, rng);
      if (!out.item) { out.type = "coins"; out.coins = pick.type === "jackpot" ? 50 : 20; out.label = "코인 주머니"; }
      else if (pick.type === "jackpot") out.coins = pick.coins;
    }
    return out;
  }
  function cheapestUnowned(owned) {
    return Object.keys(ITEMS).filter(function (k) { return !owned[k]; }).map(function (k) { return ITEMS[k]; }).sort(function (a, b) { return a.price - b.price; })[0] || null;
  }

  const api = { BASE: BASE, CHARS: CHARS, CATS: CATS, CATALOG: CATALOG, ITEMS: ITEMS, COLORS: COLORS, HAIR_COLORS: HAIR_COLORS, COIN: COIN, charById: charById, item: item, starter: starter, studioState: studioState, renderDoll: renderDoll, renderThumb: renderThumb, renderPortrait: renderPortrait, randomDrop: randomDrop, cheapestUnowned: cheapestUnowned, rollPrize: rollPrize, PRIZES: PRIZES, CHEST_PRIZES: CHEST_PRIZES };
  if (typeof module !== "undefined" && module.exports) module.exports = api;
  else root.MathAvatar = api;
})(typeof window !== "undefined" ? window : globalThis);
