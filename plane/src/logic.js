// 스카이 샷 — 화면과 무관한 규칙(무기 단계, 적 체력, 대형). Node 테스트가 그대로 읽는다.

// 문제를 맞힐 때마다 한 단계씩 세진다. 3단계와 6단계에서는 갈림길: 아이가 셋 중 하나를 고른다.
//  3단계 큰 무기: 레이저(뚫고 나가는 빛 줄기) / 미사일(따라가서 펑) / 번개(가까운 적끼리 이어 찌릿)
//  6단계 곁무기: 빙글 구슬(몸 주위를 돌며 부수고 빗방울도 막음) / 쾅 폭탄(앞에서 크게 터짐) / 부메랑(양옆으로 돌아 나갔다 돌아옴)
// 바탕 탄(shots: 각도·좌우 간격, every: 발사 간격 초, dmg, bullet 그림)은 갈래와 상관없이 단계마다 조금씩 세지고,
// guns(날개 기관총)·helpers(호위기, homing 따라가는 별)·aura(무지개 고리)는 눈에 보이는 장비다.
const TWIN = [[0, -8], [0, 8]];
const SHELL = [
  null,
  { name: "콩알탄", bullet: "pellet", guns: 0, every: 0.30, dmg: 1, shots: [[0, 0]] },
  { name: "쌍둥이탄", bullet: "pellet", guns: 2, every: 0.28, dmg: 1, shots: TWIN },
  { bullet: "pellet", guns: 2, every: 0.28, dmg: 1, shots: TWIN },
  { bullet: "candy", guns: 4, every: 0.22, dmg: 1, shots: TWIN },
  { bullet: "candy", guns: 4, every: 0.20, dmg: 1, shots: TWIN },
  { bullet: "candy", guns: 4, every: 0.18, dmg: 1, shots: TWIN },
  { bullet: "comet", guns: 4, helpers: 2, homing: 2, every: 0.18, dmg: 2, pierce: true, shots: TWIN },
  { bullet: "rainbow", guns: 4, helpers: 2, homing: 2, aura: true, every: 0.16, dmg: 3, pierce: true, beam: true, shots: TWIN },
];
export const FORK_MAIN = 3, FORK_SIDE = 6;
// 큰 무기: 3~8단계 여섯 칸.
//  laser: beams [각도, 좌우 간격], w 굵기, dps 줄기 하나가 1초에 주는 피해(닿은 적 모두), color
//  missile: n 한 번에 쏘는 수, dmg, every, splash 터지는 반지름
//  bolt: dmg, chain 이어지는 적 수, every
export const MAINS = {
  laser: { name: "레이저", say: "쭉 뚫는 빛", tiers: [
    { name: "레이저 빔", beams: [[0, 0]], w: 8, dps: 6, color: "pink" },
    { name: "굵은 레이저", beams: [[0, 0]], w: 14, dps: 10, color: "pink" },
    { name: "쌍둥이 레이저", beams: [[0, -14], [0, 14]], w: 10, dps: 9, color: "cyan" },
    { name: "세 줄 레이저", beams: [[-0.10, -16], [0, 0], [0.10, 16]], w: 10, dps: 10, color: "cyan" },
    { name: "왕 레이저", beams: [[-0.10, -16], [0, 0], [0.10, 16]], w: 14, dps: 14, color: "gold" },
    { name: "무지개 레이저", beams: [[-0.12, -18], [0, 0], [0.12, 18]], w: 18, dps: 24, color: "rainbow" },
  ] },
  missile: { name: "미사일", say: "따라가서 펑!", tiers: [
    { name: "꼬마 미사일", n: 2, dmg: 2, every: 0.9, splash: 34 },
    { name: "펑펑 미사일", n: 2, dmg: 3, every: 0.8, splash: 40 },
    { name: "미사일 넷", n: 4, dmg: 3, every: 0.8, splash: 40 },
    { name: "미사일 떼", n: 4, dmg: 4, every: 0.7, splash: 46 },
    { name: "왕 미사일", n: 4, dmg: 6, every: 0.7, splash: 54 },
    { name: "미사일 폭풍", n: 6, dmg: 6, every: 0.6, splash: 60 },
  ] },
  bolt: { name: "번개", say: "옆 적까지 찌릿", tiers: [
    { name: "찌릿 번개", dmg: 2, chain: 2, every: 0.5 },
    { name: "번쩍 번개", dmg: 3, chain: 2, every: 0.45 },
    { name: "세 갈래 번개", dmg: 3, chain: 3, every: 0.36 },
    { name: "천둥 번개", dmg: 4, chain: 3, every: 0.30 },
    { name: "왕 번개", dmg: 6, chain: 4, every: 0.38 },
    { name: "번개 폭풍", dmg: 8, chain: 5, every: 0.38 },
  ] },
};
// 곁무기: 6~8단계 세 칸.
//  orb: n 구슬 수, dmg, cd 같은 적을 다시 때리기까지 초 / bomb: dmg, every, r 터지는 반지름 / boom: n, dmg, every
export const SIDES = {
  orb: { name: "빙글 구슬", say: "몸을 지켜요", tiers: [{ n: 2, dmg: 2, cd: 0.25 }, { n: 3, dmg: 3, cd: 0.25 }, { n: 4, dmg: 4, cd: 0.25 }] },
  bomb: { name: "쾅 폭탄", say: "한꺼번에 쾅!", tiers: [{ dmg: 6, every: 1.6, r: 70 }, { dmg: 12, every: 1.4, r: 80 }, { dmg: 18, every: 1.2, r: 90 }] },
  boom: { name: "부메랑", say: "갔다가 돌아와요", tiers: [{ n: 1, dmg: 2, every: 1.2 }, { n: 2, dmg: 2.5, every: 1.1 }, { n: 2, dmg: 4, every: 1.1 }] },
};
export const MAIN_IDS = Object.keys(MAINS), SIDE_IDS = Object.keys(SIDES);
export const MAX_WEAPON = SHELL.length - 1;
const clampLevel = level => Math.min(MAX_WEAPON, Math.max(1, level | 0));
// 지금 단계·고른 갈래의 무기 한 벌. 아직 안 고른 갈래는 첫 번째(레이저·빙글 구슬)로 본다.
export function weapon(level, path = {}) {
  const lv = clampLevel(level), shell = SHELL[lv];
  const w = Object.assign({ level: lv }, shell);
  if (lv >= FORK_MAIN) {
    const id = MAINS[path.main] ? path.main : MAIN_IDS[0], tier = MAINS[id].tiers[lv - FORK_MAIN];
    w.main = id; w.name = tier.name; w[id] = tier;
  }
  if (lv >= FORK_SIDE) {
    const id = SIDES[path.side] ? path.side : SIDE_IDS[0];
    w.side = id; w.sideName = SIDES[id].name; w[id] = SIDES[id].tiers[lv - FORK_SIDE];
  }
  return w;
}
// HUD·배너에 쓰는 이름: "6단계 세 줄 레이저 + 빙글 구슬"
export const weaponLabel = (level, path) => { const w = weapon(level, path); return w.level + "단계 " + w.name + (w.sideName ? " + " + w.sideName : ""); };
// 이 단계로 올라갈 때 무엇을 골라야 하는가(없으면 null).
export const forkAt = level => (level === FORK_MAIN ? "main" : level === FORK_SIDE ? "side" : null);

// 1초에 주는 피해(어림). 탄이 전부 맞는다고 보되, 맞히기 어려운 것·여럿을 한꺼번에 때리는 것은 대충 곱을 붙였다.
export function dps(level, path) {
  const w = weapon(level, path);
  let v = w.dmg * w.shots.length / w.every + (w.homing ? w.homing * w.dmg / w.every * 0.5 : 0);
  if (w.laser) v += w.laser.beams.length * w.laser.dps;
  if (w.missile) v += w.missile.n * w.missile.dmg / w.missile.every * 1.25;           // 터질 때 옆 적도 다친다
  if (w.bolt) v += w.bolt.dmg * (1 + (w.bolt.chain - 1) * 0.6) / w.bolt.every;     // 이어지는 적은 다 있지 않을 때가 많다
  if (w.orb) v += w.orb.n * w.orb.dmg / w.orb.cd * 0.35;                             // 몸 가까이 온 적에게만 닿는다
  if (w.bomb) v += w.bomb.dmg / w.bomb.every * 1.5;                                  // 한 번에 둘쯤 맞는다
  if (w.boom) v += w.boom.n * w.boom.dmg * 3 / w.boom.every;                         // 한 바퀴에 세 번쯤 맞는다
  return v;
}
// 갈 수 있는 모든 갈래 조합(테스트·확인용).
export const allPaths = () => MAIN_IDS.flatMap(main => SIDE_IDS.map(side => ({ main, side })));

// 비행기가 오르내릴 수 있는 세로 범위(놀이판 높이 fh 기준). 너무 위로 가면 적과 바로 부딪혀 불리하니 화면 아래쪽 55%만.
export function playerYRange(fh) {
  const max = Math.round(fh - 56), min = Math.min(max - 60, Math.max(140, Math.round(fh * 0.45)));
  return { min, max, home: Math.min(max, Math.max(min, Math.round(fh - 92))) };
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
