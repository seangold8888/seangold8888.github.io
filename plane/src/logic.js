// 스카이 샷 — 화면과 무관한 규칙(무기 단계, 적 체력, 대형). Node 테스트가 그대로 읽는다.

// 문제를 맞힐 때마다 한 단계씩 세지고 눈에 보이게 화려해진다.
// shots: 한 번에 나가는 탄(각도·좌우 간격), every: 발사 간격(초), bullet: 탄 그림, guns: 날개에 달리는 기관총 수, helpers: 양옆 호위기 수, aura: 무지개 고리.
export const WEAPONS = [
  { name: "콩알탄", bullet: "pellet", guns: 0, every: 0.30, dmg: 1, shots: [[0, 0]] },
  { name: "쌍둥이탄", bullet: "pellet", guns: 2, every: 0.28, dmg: 1, shots: [[0, -8], [0, 8]] },
  { name: "세 줄기탄", bullet: "pellet", guns: 2, every: 0.26, dmg: 1, shots: [[0, 0], [-0.10, -10], [0.10, 10]] },
  { name: "별사탕 속사", bullet: "candy", guns: 2, every: 0.17, dmg: 1, shots: [[0, 0], [-0.10, -10], [0.10, 10]] },
  { name: "부채탄", bullet: "candy", guns: 4, every: 0.18, dmg: 1, shots: [[0, -6], [0, 6], [-0.18, -12], [0.18, 12], [-0.34, -16], [0.34, 16]] },
  { name: "혜성 관통탄", bullet: "comet", guns: 4, every: 0.16, dmg: 2, pierce: true, shots: [[0, -7], [0, 7], [-0.16, -12], [0.16, 12]] },
  { name: "따라가는 별", bullet: "comet", guns: 4, helpers: 2, every: 0.15, dmg: 2, pierce: true, homing: 2, shots: [[0, -7], [0, 7], [-0.16, -12], [0.16, 12]] },
  { name: "무지개 대포", bullet: "rainbow", guns: 4, helpers: 2, aura: true, every: 0.13, dmg: 3, pierce: true, homing: 2, beam: true, shots: [[0, -9], [0, 9], [-0.14, -14], [0.14, 14], [-0.30, -18], [0.30, 18]] },
];
export const MAX_WEAPON = WEAPONS.length;
export const weapon = level => WEAPONS[Math.min(MAX_WEAPON, Math.max(1, level | 0)) - 1];

// 1초에 주는 피해. 탄이 전부 맞는다고 본 값이라 실제로는 이보다 조금 낮다.
export function dps(level) {
  const w = weapon(level);
  return w.dmg * w.shots.length / w.every + (w.homing ? w.homing * 2 / w.every * 0.5 : 0);
}

// 파도가 갈수록 단단해진다. 무기를 안 올리면 4~5번째 파도부터 화면이 막히기 시작하는 정도.
export const enemyHp = wave => 2 + Math.floor(wave * 1.1 + wave * wave * 0.03);
export const bossHp = wave => 40 + wave * 8;
// 구름이 내려오는 속도(1초에 몇 칸). 파도가 갈수록 빨라지되 아이가 따라갈 수 있는 데서 멈춘다.
export const enemySpeed = wave => 56 + Math.min(84, wave * 3.5);
// 무기가 이 단계에 닿으면 보호막도 하나 받는다.
export const SHIELD_LEVELS = [3, 6, 8];
// 별똥별(경고 뒤 떨어지는, 못 부수는 돌)이 나오기 시작하는 파도.
export const METEOR_FROM = 5;
// 대장은 이만큼 버티면 스스로 물러난다. 무기가 약해도 판이 막히지 않는다.
export const BOSS_STAY = 26;
export const isBossWave = wave => wave > 0 && wave % 6 === 0;
// 대장은 셋이 번갈아 나온다: 먹구름 대장(비) → 눈보라 대왕(흔들리는 눈송이) → 태풍 대장(회오리 부하).
export const BOSSES = [{ id: "boss", name: "먹구름 대장" }, { id: "snowking", name: "눈보라 대왕" }, { id: "typhoon", name: "태풍 대장" }];
export const bossOf = wave => BOSSES[(Math.max(1, Math.round(wave / 6)) - 1) % BOSSES.length];
// 조종사(윤찬·재이·윤건·태오 순)마다 난이도가 다르다. speed: 적 속도, hp: 적 체력, meteorFrom: 별똥별 시작 파도, hearts: 하트 수, magnet: 별이 끌려오는 거리.
export const PILOT_TUNING = [
  { speed: 1.15, hp: 1.3, meteorFrom: 3, hearts: 3, magnet: 90 },
  { speed: 1.0, hp: 1.0, meteorFrom: 5, hearts: 3, magnet: 90 },
  { speed: 0.92, hp: 0.9, meteorFrom: 6, hearts: 3, magnet: 100 },
  { speed: 0.68, hp: 0.55, meteorFrom: Infinity, hearts: 4, magnet: 150 },
];
export const tuning = pilot => PILOT_TUNING[pilot] || PILOT_TUNING[1];
// 맞힌 문제마다 별 하나. 모은 별로 비행기 꼬리 모양이 열린다(판이 끝나도 남는다).
export const TRAILS = [
  { id: "spark", name: "반짝이", icon: "✨", need: 0 },
  { id: "heart", name: "하트", icon: "♥", need: 5 },
  { id: "star", name: "별", icon: "★", need: 12 },
  { id: "flower", name: "꽃", icon: "✿", need: 25 },
  { id: "note", name: "음표", icon: "♪", need: 40 },
  { id: "rainbow", name: "무지개", icon: "🌈", need: 60 },
];
export const unlockedTrails = stars => TRAILS.filter(t => stars >= t.need).length;
// 별(문제 상자)을 든 선물 풍선이 나오는 파도. 첫 별은 일찍 준다.
export const hasGift = wave => wave === 1 || wave % 2 === 0;

const COLS = 5;
// 한 파도의 적 배치. x 는 0~1(가로 비율), delay 는 등장까지 초.
export function formation(wave, rng = Math.random, tune = PILOT_TUNING[1]) {
  if (isBossWave(wave)) return [{ kind: "boss", who: bossOf(wave).id, x: 0.5, delay: 0 }];
  // 가로 한 줄이 절반쯤 — 줄지어 내려오는 적을 쓸어 내는 맛.
  const out = [], roll = rng(), pick = roll < 0.5 ? 0 : roll < 0.67 ? 1 : roll < 0.84 ? 2 : 3, col = i => (i + 0.5) / COLS;
  if (pick === 0) {
    // 가로 한 줄. 한 칸은 비워 지나갈 길을 준다.
    const gap = Math.floor(rng() * COLS);
    for (let i = 0; i < COLS; i++) if (i !== gap) out.push({ kind: "cloud", x: col(i), delay: 0 });
  } else if (pick === 1) {
    // V 자
    [[2, 0], [1, 0.45], [3, 0.45], [0, 0.9], [4, 0.9]].forEach(([c, d]) => out.push({ kind: "cloud", x: col(c), delay: d }));
  } else if (pick === 2) {
    // 지그재그로 하나씩
    for (let i = 0; i < 6; i++) out.push({ kind: "zig", x: col(i % 2 ? 3 : 1), delay: i * 0.5 });
  } else {
    // 양쪽 기둥
    for (let i = 0; i < 3; i++) { out.push({ kind: "cloud", x: col(0), delay: i * 0.5 }); out.push({ kind: "cloud", x: col(4), delay: i * 0.5 }); }
  }
  if (wave >= 4 && rng() < 0.5) out.push({ kind: "bolt", x: 0.15 + rng() * 0.7, delay: 1.2 });
  // 회오리: 옆으로 튕기며 내려온다. 우박 구름: 느리고 단단하며, 터지면 꼬마 구름 둘로 갈라진다.
  if (wave >= 3 && rng() < 0.4) out.push({ kind: "tornado", x: 0.15 + rng() * 0.7, delay: 1.0 });
  if (wave >= 7 && rng() < 0.38) out.push({ kind: "hail", x: 0.3 + rng() * 0.4, delay: 0.5 });
  if (wave >= tune.meteorFrom && rng() < 0.45) out.push({ kind: "meteor", x: 0.5, delay: 1.6 });   // x 는 쓰지 않는다: 비행기 머리 위로 떨어진다
  if (hasGift(wave)) out.push({ kind: "gift", x: 0.2 + rng() * 0.6, delay: 0.8 });
  return out;
}
