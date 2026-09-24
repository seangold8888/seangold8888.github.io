// 재이와 태오의 멀티버스 2 — 게임 데이터.
// 한 판은 90초 미션. 별을 모아 캡슐을 열면 영웅 꾸미기 조각이 나온다.
(function () {
  "use strict";

  var MISSION_SECONDS = 90;
  var CAPSULE_COST = 3;

  // 세계마다 미션 세 개: 구출 → 보물 → 보스. 보스를 이기면 다음 세계가 열린다.
  var WORLDS = [
    { id: "city", name: "노을 옥상", icon: "🏙️", bg: "art/bg-city.webp", tint: "#ffb36b",
      enemies: ["tin", "tin", "shield"], boss: "spider" },
    { id: "web", name: "거미줄 도시", icon: "🕸️", bg: "art/bg-web.webp", tint: "#8fb8ff",
      enemies: ["tin", "drone", "shield"], boss: "jaewing" },
    { id: "sky", name: "번개 하늘섬", icon: "⚡", bg: "art/bg-sky.webp", tint: "#ffe07a",
      enemies: ["drone", "shield", "tin"], boss: "golem" },
    { id: "core", name: "멀티버스 코어", icon: "🌀", bg: "art/bg-core.webp", tint: "#c69bff",
      enemies: ["drone", "shield", "tin"], boss: "mecha" }
  ];

  var MISSIONS = [
    { id: "rescue", name: "친구 구출", icon: "🔓", goal: "철창 3개를 부수고 친구들을 구해요" },
    { id: "treasure", name: "보물 모으기", icon: "⭐", goal: "반짝이 50개를 모아요" },
    { id: "boss", name: "보스 대결", icon: "👑", goal: "보스를 물리쳐요" }
  ];

  // 영웅 그림의 기준점(그림 크기에 대한 비율). 발바닥 가운데가 서 있는 자리다.
  // head: 마스크(눈 높이), chest: 가슴 마크, back: 망토 붙는 어깨, hand: 무기 잡는 손.
  var HEROES = {
    jaei: { name: "재이", color: "#c79bff", hp: 120, speed: 330, power: 12,
      poses: {
        idle:    { src: "art/jaei-idle.webp",    head: [0.560, 0.165], chest: [0.510, 0.400], back: [0.320, 0.320], hand: [0.880, 0.280] },
        run:     { src: "art/jaei-run.webp",     head: [0.610, 0.175], chest: [0.520, 0.400], back: [0.250, 0.320], hand: [0.930, 0.330] },
        attack:  { src: "art/jaei-attack.webp",  head: [0.445, 0.165], chest: [0.360, 0.400], back: [0.200, 0.320], hand: [0.830, 0.330] },
        special: { src: "art/jaei-special.webp", head: [0.530, 0.195], chest: [0.500, 0.470], back: [0.380, 0.350], hand: [0.900, 0.100] },
        hurt:    { src: "art/jaei-hurt.webp",    head: [0.420, 0.175], chest: [0.500, 0.420], back: [0.260, 0.330], hand: [0.720, 0.120] }
      } },
    taeo: { name: "태오", color: "#ff6b5b", hp: 110, speed: 350, power: 11,
      poses: {
        idle:    { src: "art/taeo-idle.webp",    head: [0.550, 0.270], chest: [0.490, 0.480], back: [0.230, 0.420], hand: [0.890, 0.380] },
        run:     { src: "art/taeo-run.webp",     head: [0.550, 0.270], chest: [0.500, 0.480], back: [0.190, 0.420], hand: [0.900, 0.450] },
        attack:  { src: "art/taeo-attack.webp",  head: [0.410, 0.270], chest: [0.320, 0.480], back: [0.150, 0.420], hand: [0.740, 0.390] },
        special: { src: "art/taeo-special.webp", head: [0.470, 0.260], chest: [0.510, 0.500], back: [0.380, 0.390], hand: [0.890, 0.200] },
        hurt:    { src: "art/taeo-hurt.webp",    head: [0.450, 0.280], chest: [0.490, 0.450], back: [0.200, 0.400], hand: [0.810, 0.210] }
      } }
  };

  // 적: 깡통(가까이 와서 박치기), 방패(앞에서 때리면 막음), 드론(떠서 비눗방울을 쏨).
  var ENEMIES = {
    tin:    { name: "깡통 로봇", src: "art/enemy-tin.webp", hp: 30, speed: 120, damage: 8, size: 150, reach: 70 },
    shield: { name: "방패 로봇", src: "art/enemy-shield.webp", hp: 46, speed: 90, damage: 10, size: 170, reach: 80, guard: true },
    drone:  { name: "뿅뿅 드론", src: "art/enemy-drone.webp", hp: 24, speed: 140, damage: 7, size: 140, reach: 420, ranged: true, fly: 120 }
  };

  var BOSSES = {
    spider: { name: "거미 로봇", src: "art/boss-spider.webp", hp: 2000, size: 330, speed: 110, damage: 14,
      moves: ["stomp", "charge", "summon"], minion: "tin" },
    jaewing: { name: "재윙", src: "art/boss-jaewing.webp", hp: 2300, size: 300, speed: 160, damage: 13, fly: 150,
      moves: ["dive", "rain", "summon"], minion: "drone" },
    golem: { name: "번개 골렘", src: "art/boss-golem.webp", hp: 2700, size: 360, speed: 90, damage: 16,
      moves: ["stomp", "rain", "charge"], minion: "shield" },
    mecha: { name: "쓰구미 메카", src: "art/boss-mecha.webp", hp: 3300, size: 380, speed: 110, damage: 17,
      moves: ["stomp", "charge", "rain", "summon"], minion: "drone" }
  };

  // 꾸미기 조각. 캡슐은 아직 없는 것만 준다(같은 게 두 번 나오지 않는다).
  // 무기는 공격 방식이 달라진다: 방패=밀어내기, 망치=충격파, 빛검=긴 베기, 거미줄=멀리 쏘기.
  var ITEMS = [
    { id: "cape-red", slot: "cape", name: "빨강 망토", color: "#ff4d5e" },
    { id: "cape-blue", slot: "cape", name: "파랑 망토", color: "#3f8cff" },
    { id: "cape-gold", slot: "cape", name: "황금 망토", color: "#ffc93c" },
    { id: "cape-purple", slot: "cape", name: "보라 망토", color: "#9b5cff" },
    { id: "cape-rainbow", slot: "cape", name: "무지개 망토", color: "rainbow" },
    { id: "cape-star", slot: "cape", name: "별밤 망토", color: "#26306b", stars: true },
    { id: "mask-hero", slot: "mask", name: "영웅 마스크", color: "#1d2440" },
    { id: "mask-red", slot: "mask", name: "빨강 마스크", color: "#e2344a" },
    { id: "mask-gold", slot: "mask", name: "황금 마스크", color: "#f0b429" },
    { id: "mask-cat", slot: "mask", name: "고양이 마스크", color: "#ff8fc7", ears: true },
    { id: "mask-star", slot: "mask", name: "별 고글", color: "#58d6ff", goggle: true },
    { id: "emblem-star", slot: "emblem", name: "별 마크", icon: "⭐" },
    { id: "emblem-heart", slot: "emblem", name: "하트 마크", icon: "💖" },
    { id: "emblem-bolt", slot: "emblem", name: "번개 마크", icon: "⚡" },
    { id: "emblem-spider", slot: "emblem", name: "거미 마크", icon: "🕷️" },
    { id: "emblem-crown", slot: "emblem", name: "왕관 마크", icon: "👑" },
    { id: "emblem-moon", slot: "emblem", name: "달 마크", icon: "🌙" },
    { id: "weapon-shield", slot: "weapon", name: "별 방패", icon: "🛡️", kind: "shield" },
    { id: "weapon-hammer", slot: "weapon", name: "번개 망치", icon: "🔨", kind: "hammer" },
    { id: "weapon-blade", slot: "weapon", name: "빛검", icon: "⚔️", kind: "blade" },
    { id: "weapon-web", slot: "weapon", name: "거미줄 발사기", icon: "🕸️", kind: "web" },
    { id: "fx-fire", slot: "fx", name: "불꽃 필살기", icon: "🔥", color: "#ff7a2f" },
    { id: "fx-ice", slot: "fx", name: "얼음 필살기", icon: "❄️", color: "#7fe3ff" },
    { id: "fx-thunder", slot: "fx", name: "번개 필살기", icon: "⚡", color: "#ffe45c" },
    { id: "fx-heart", slot: "fx", name: "하트 필살기", icon: "💗", color: "#ff7ec8" },
    { id: "fx-galaxy", slot: "fx", name: "은하 필살기", icon: "🌌", color: "#b18cff" }
  ];

  var SLOTS = [
    { id: "cape", name: "망토", icon: "🦸" },
    { id: "mask", name: "마스크", icon: "🎭" },
    { id: "emblem", name: "가슴 마크", icon: "⭐" },
    { id: "weapon", name: "무기", icon: "🔨" },
    { id: "fx", name: "필살기", icon: "💥" }
  ];

  // 처음에는 하나씩 주고 시작한다. 빈손이면 꾸미는 재미를 모른다.
  var STARTER = {
    jaei: { cape: "cape-purple", mask: null, emblem: "emblem-star", weapon: null, fx: "fx-heart" },
    taeo: { cape: "cape-red", mask: null, emblem: "emblem-bolt", weapon: null, fx: "fx-fire" }
  };

  window.MV_DATA = {
    MISSION_SECONDS: MISSION_SECONDS, CAPSULE_COST: CAPSULE_COST,
    WORLDS: WORLDS, MISSIONS: MISSIONS, HEROES: HEROES, ENEMIES: ENEMIES, BOSSES: BOSSES,
    ITEMS: ITEMS, SLOTS: SLOTS, STARTER: STARTER
  };
})();
