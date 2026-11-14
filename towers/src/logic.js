// Spell Towers — 화면과 무관한 규칙(탑 표, 괴물·파도 곡선, 맵과 길 함수, 카드 뽑기, 저장 정규화). Node 테스트가 그대로 읽는다.
// 실제 한 걸음(괴물 움직임·탑 공격)은 engine.js, 그리기·입력·화면은 main.js.

export const MAP_W = 960, MAP_H = 600;
export const WAVES = 8, PREP_TIME = 5, OWL_LIFE = 12, OWL_Y = 100, OWL_HIT_R = 56;
export const MAX_MONSTERS = 50, MAX_SHOTS = 120;
export const START_GEMS = 120, WAVE_GEMS = 20, MAX_LV = 5, GEM_MAX_LV = 2;
export const BLAST_GEMS = 30, SMALL_GEMS = 20, SMALL_MIN = 6, BOSS_BLAST = 0.2, BOSS_SMALL = 0.08;
// 고쳐 맞힘 작은 마법: 길 위 괴물 절반(최소 6마리, 그보다 적으면 전부)
export const smallCount = alive => Math.min(alive, Math.max(SMALL_MIN, Math.ceil(alive / 2)));
export const RESCUE_CAKE = 5, CAKE_CARD = 2;
export const SPARKLE_CD = 0.18, SPARKLE_DMG = 2, SPARKLE_R = 46, REVEAL_T = 3;
export const HASTE = 1.4;      // 특별 주문: 연사 +40%

/* ---------- 마법사 = 아이 ---------- */
export const PILOTS = [
  { kid: "yunchan", name: "윤찬", art: "wiz0", color: "#4aa8ff" },
  { kid: "jaei", name: "재이", art: "wiz1", color: "#ff86b8" },
  { kid: "yungeon", name: "윤건", art: "wiz2", color: "#ff9f43" },
  { kid: "taeo", name: "태오", art: "wiz3", color: "#ffd84a" },
];
// speed 괴물 속도, hp 괴물 체력, cake 시작 케이크, cards 한 번에 맞혔을 때 카드 수, ghost 유령 나옴
export const PILOT_TUNING = [
  { speed: 1.12, hp: 1.32, cake: 10, cards: 3, ghost: true },
  { speed: 1.0, hp: 1.0, cake: 10, cards: 3, ghost: true },
  { speed: 0.95, hp: 0.9, cake: 10, cards: 3, ghost: true },
  { speed: 0.78, hp: 0.7, cake: 12, cards: 2, ghost: false },
];
export const tuning = i => PILOT_TUNING[i] || PILOT_TUNING[1];

/* ---------- 탑 5종(각 5단계, 3단계에서 갈림길 a/b) ----------
   공통: range 사거리, every 쏘는 간격(초), dmg, size 탄·빛 굵기(눈에 보이는 값)
   fire : splash 터지는 반지름(화산)
   ice  : slow 느려지는 배수(작을수록 느림), slowT, freezeEvery·freezeT(꽁꽁)
   bolt : chain 튀는 수
   wind : push 밀어내는 거리, n 한 번에 미는 수
   light: beams 빛줄기 수, reveal 유령 드러내는 반지름 */
export const TOWERS = {
  fire: { name: "불꽃 탑", short: "불꽃", say: "한 마리에게 빠른 불꽃 구슬", cost: 70, up: 80, air: false, color: "#ff7a3c",
    tiers: [{ range: 135, every: 0.62, dmg: 12, size: 7 }, { range: 145, every: 0.5, dmg: 17, size: 9 }],
    branches: {
      a: { name: "불새 탑", say: "불꽃을 두 배로 빨리", tiers: [{ range: 155, every: 0.25, dmg: 22, size: 10 }, { range: 165, every: 0.21, dmg: 29, size: 12 }, { range: 180, every: 0.17, dmg: 38, size: 14 }] },
      b: { name: "화산 탑", say: "펑! 터지며 둘레까지", tiers: [{ range: 150, every: 0.8, dmg: 43, splash: 62, size: 14 }, { range: 160, every: 0.72, dmg: 60, splash: 74, size: 17 }, { range: 170, every: 0.64, dmg: 82, splash: 88, size: 20 }] },
    } },
  ice: { name: "얼음 탑", short: "얼음", say: "둘레 괴물을 느리게", cost: 80, up: 85, air: false, color: "#7fd8ff",
    tiers: [{ range: 105, every: 1.0, dmg: 5, slow: 0.6, slowT: 1.5, size: 6 }, { range: 118, every: 0.95, dmg: 7, slow: 0.52, slowT: 1.6, size: 8 }],
    branches: {
      a: { name: "눈보라 탑", say: "아주 넓게 느리게", tiers: [{ range: 160, every: 0.9, dmg: 12, slow: 0.45, slowT: 1.7, size: 10 }, { range: 185, every: 0.85, dmg: 17, slow: 0.42, slowT: 1.8, size: 12 }, { range: 210, every: 0.8, dmg: 24, slow: 0.38, slowT: 1.9, size: 14 }] },
      b: { name: "꽁꽁 탑", say: "가끔 꽁꽁 멈춰요", tiers: [{ range: 128, every: 0.9, dmg: 14, slow: 0.5, slowT: 1.6, freezeEvery: 3.0, freezeT: 0.9, size: 11 }, { range: 138, every: 0.85, dmg: 22, slow: 0.48, slowT: 1.7, freezeEvery: 2.6, freezeT: 1.0, size: 13 }, { range: 150, every: 0.8, dmg: 31, slow: 0.45, slowT: 1.8, freezeEvery: 2.2, freezeT: 1.1, size: 15 }] },
    } },
  bolt: { name: "번개 탑", short: "번개", say: "괴물 사이를 튀는 번개", cost: 90, up: 90, air: true, color: "#ffe45c",
    tiers: [{ range: 140, every: 1.1, dmg: 14, chain: 3, size: 4 }, { range: 150, every: 1.0, dmg: 19, chain: 4, size: 5 }],
    branches: {
      a: { name: "천둥 탑", say: "번개가 3마리 더 튀어요", tiers: [{ range: 160, every: 0.9, dmg: 26, chain: 7, size: 6 }, { range: 170, every: 0.85, dmg: 34, chain: 8, size: 7 }, { range: 180, every: 0.8, dmg: 43, chain: 9, size: 8 }] },
      b: { name: "폭풍 탑", say: "아주 강한 한 방", tiers: [{ range: 170, every: 1.25, dmg: 110, chain: 2, size: 9 }, { range: 182, every: 1.15, dmg: 154, chain: 2, size: 11 }, { range: 195, every: 1.05, dmg: 211, chain: 3, size: 13 }] },
    } },
  wind: { name: "바람 탑", short: "바람", say: "괴물을 길 뒤로 휙", cost: 80, up: 85, air: true, color: "#9ff0c0",
    tiers: [{ range: 130, every: 2.4, dmg: 7, push: 55, n: 1, size: 18 }, { range: 140, every: 2.2, dmg: 10, push: 65, n: 2, size: 22 }],
    branches: {
      a: { name: "회오리 탑", say: "여러 마리를 한꺼번에", tiers: [{ range: 150, every: 2.0, dmg: 14, push: 72, n: 4, size: 26 }, { range: 160, every: 1.9, dmg: 19, push: 80, n: 5, size: 29 }, { range: 170, every: 1.8, dmg: 26, push: 90, n: 7, size: 32 }] },
      b: { name: "돌풍 탑", say: "아주 멀리 밀어요", tiers: [{ range: 160, every: 2.1, dmg: 19, push: 140, n: 2, size: 30 }, { range: 170, every: 2.0, dmg: 26, push: 170, n: 2, size: 34 }, { range: 180, every: 1.9, dmg: 36, push: 200, n: 3, size: 38 }] },
    } },
  light: { name: "빛 탑", short: "빛", say: "아주 먼 곳까지 곧은 빛줄기", cost: 100, up: 95, air: true, color: "#fff2a0",
    tiers: [{ range: 240, every: 1.45, dmg: 19, beams: 1, reveal: 130, size: 12 }, { range: 255, every: 1.35, dmg: 26, beams: 1, reveal: 140, size: 16 }],
    branches: {
      a: { name: "무지개 탑", say: "빛줄기가 세 갈래", tiers: [{ range: 270, every: 1.25, dmg: 31, beams: 3, reveal: 150, size: 18 }, { range: 285, every: 1.2, dmg: 41, beams: 3, reveal: 160, size: 20 }, { range: 300, every: 1.1, dmg: 53, beams: 3, reveal: 170, size: 22 }] },
      b: { name: "등대 탑", say: "숨은 유령도 보이고 강한 빛", tiers: [{ range: 280, every: 1.25, dmg: 67, beams: 1, reveal: 230, size: 26 }, { range: 300, every: 1.15, dmg: 89, beams: 1, reveal: 270, size: 31 }, { range: 320, every: 1.05, dmg: 115, beams: 1, reveal: 310, size: 36 }] },
    } },
};
export const TOWER_IDS = Object.keys(TOWERS);
// 단계 색: 1 흰빛 · 2 하늘 · 3 초록 · 4 보라 · 5 금 (보석 칸·후광·탄 테두리에 쓴다)
export const LV_COLORS = ["#e8f4ff", "#6fd0ff", "#6ee59a", "#c08cff", "#ffd24a"];
// 단계마다 탑 그림 너비(논리 칸) — 단계가 오르면 반드시 커진다
export const TOWER_W = [62, 70, 86, 94, 104];
// 단계마다 붙는 장식(그리기에서 그대로 쓴다): 깃발 수, 수정 장식 수, 후광, 왕관
export const TOWER_DECOR = [
  { flags: 0, crystals: 0, halo: false, crown: false },
  { flags: 1, crystals: 0, halo: false, crown: false },
  { flags: 1, crystals: 1, halo: true, crown: false },
  { flags: 2, crystals: 2, halo: true, crown: false },
  { flags: 2, crystals: 3, halo: true, crown: true },
];
export const clampLv = lv => Math.max(1, Math.min(MAX_LV, lv | 0));
export function towerStats(kind, lv, branch = null, buff = 1) {
  const T = TOWERS[kind]; if (!T) return null;
  const L = clampLv(lv), br = L >= 3 ? (T.branches[branch] ? branch : "a") : null;
  const base = L <= 2 ? T.tiers[L - 1] : T.branches[br].tiers[L - 3];
  const s = Object.assign({ kind, lv: L, branch: br, air: T.air, name: br ? T.branches[br].name : T.name, w: TOWER_W[L - 1], color: LV_COLORS[L - 1] }, base);
  if (buff !== 1) s.every /= buff;
  return s;
}
export const towerName = (kind, lv, branch) => (towerStats(kind, lv, branch) || {}).name || "";
// 1초에 주는 양(어림). 여럿을 한꺼번에 맞히는 것은 대충 곱을 붙였다(밀기·느리게 하는 몫도 조금 친다).
export function towerDps(kind, lv, branch = null) {
  const s = towerStats(kind, lv, branch); if (!s) return 0;
  switch (kind) {
    case "fire": return s.dmg / s.every * (s.splash ? 1 + s.splash / 50 : 1);
    case "ice": return s.dmg * 2.2 * (s.range / 105) / s.every + (1 - s.slow) * 6 + (s.freezeEvery ? s.freezeT / s.freezeEvery * 12 : 0);
    case "bolt": return s.dmg * (1 + (s.chain - 1) * 0.45) / s.every;
    case "wind": return (s.dmg * s.n + s.push * s.n * 0.12) / s.every;
    case "light": return s.dmg * s.beams * 1.8 / s.every * (s.size / 12) ** 0.3;
  }
  return 0;
}
// 단계가 오를 때 눈에 보이는 변화(배너·카드 글자)
export function upgradeGain(kind, lv, branch) {
  if (lv < 2) return "";
  const a = towerStats(kind, lv - 1, branch), b = towerStats(kind, lv, branch), out = [];
  if (lv === 3) return TOWERS[kind].branches[b.branch].name + "으로 변신";
  if (lv === 5) out.push("왕관 탑");
  if (b.chain > (a.chain || 0)) out.push("번개 " + b.chain + "마리");
  if (b.n > (a.n || 0)) out.push(b.n + "마리씩 밀어요");
  if (b.beams > (a.beams || 0)) out.push("빛줄기 " + b.beams + "갈래");
  if (b.splash > (a.splash || 0)) out.push("터지는 곳이 넓게");
  if (b.range > a.range) out.push("더 멀리");
  out.push("탑이 커져요");
  return out.slice(0, 2).join(" · ");
}

/* ---------- 괴물 ---------- */
export const MONSTERS = {
  slime: { name: "말랑 슬라임", hp: 12, speed: 46, cake: 1, gem: 2, r: 16, from: 1, w: 46 },
  imp: { name: "깡충 도깨비", hp: 8, speed: 80, cake: 1, gem: 2, r: 14, from: 2, w: 42 },
  shell: { name: "단단 거북", hp: 34, speed: 33, cake: 1, gem: 4, r: 18, from: 3, w: 52 },
  bat: { name: "팔랑 박쥐", hp: 14, speed: 56, cake: 1, gem: 3, r: 15, from: 4, w: 46, fly: true },
  ghost: { name: "숨바꼭질 유령", hp: 18, speed: 50, cake: 1, gem: 4, r: 16, from: 5, w: 46 },
  troll: { name: "먹보 트롤", hp: 90, speed: 30, cake: 2, gem: 6, r: 24, from: 6, w: 70 },
  boss: { name: "케이크 대왕", hp: 330, speed: 26, cake: 3, gem: 30, r: 34, from: 4, w: 104 },
};
export const MONSTER_IDS = Object.keys(MONSTERS);
const MIX = { slime: 3, imp: 2, shell: 1.4, bat: 1.2, ghost: 1.2, troll: 0.6 };
// 파도마다 체력 배수(단조 증가)
// 5파도부터는 LATE 배를 더 곱해 가파르게(문제를 풀어 탑을 3~5단계로 키워야 버틴다). 칸 수 = WAVES
export const LATE = [1, 1, 1.05, 1.15, 2, 3.8, 9.5, 17], BOSS_LAST = 20;
export const hpMul = n => (1 + 0.16 * (n - 1) + 0.04 * (n - 1) * (n - 1)) * LATE[Math.max(0, Math.min(LATE.length - 1, n - 1))];
export const speedMul = n => 1 + 0.025 * (n - 1);
export const waveCount = n => 8 + 2 * n;               // 대장 빼고 나오는 수(트롤은 3칸)
export const waveSpan = n => 6 + n * 1.2;
export const WAVE_TAIL = 12;                             // 다 나오고 이만큼 지나면 다음 파도 준비(남은 괴물은 계속 걸어감)              // 나오는 데 걸리는 초
export const isBossWave = n => n === 4 || n === WAVES;
export function monsterHp(kind, n, tune = tuning(1), mapHp = 1) {
  const M = MONSTERS[kind]; if (!M) return 1;
  const mul = kind === "boss" ? (n >= WAVES ? BOSS_LAST : 1) : hpMul(n);
  return Math.max(1, Math.round(M.hp * mul * tune.hp * mapHp));
}
export const monsterSpeed = (kind, n, tune = tuning(1)) => (MONSTERS[kind] ? MONSTERS[kind].speed : 40) * speedMul(n) * tune.speed;
// 파도 n 에 나오는 괴물 목록 [{kind, at}] (at 은 파도 시작부터 초). rng 로 섞는다.
export function waveList(n, tune = tuning(1), rng = Math.random, spanMul = 1) {
  const kinds = Object.keys(MIX).filter(k => MONSTERS[k].from <= n && (k !== "ghost" || tune.ghost));
  // 새로 나오는 괴물은 그 파도에 꼭 2마리 이상 보이게
  const fresh = kinds.filter(k => MONSTERS[k].from === n);
  const out = [];
  let slots = waveCount(n);
  for (const k of fresh) for (let i = 0; i < 2 && slots > 0; i++) { out.push(k); slots -= k === "troll" ? 3 : 1; }
  let sum = 0; for (const k of kinds) sum += MIX[k];
  while (slots > 0) {
    let r = rng() * sum, ch = kinds[0];
    for (const k of kinds) { r -= MIX[k]; if (r <= 0) { ch = k; break; } }
    if (ch === "troll" && slots < 3) ch = "slime";
    out.push(ch); slots -= ch === "troll" ? 3 : 1;
  }
  // 섞기
  for (let i = out.length - 1; i > 0; i--) { const j = Math.floor(rng() * (i + 1)); [out[i], out[j]] = [out[j], out[i]]; }
  const span = waveSpan(n) * spanMul, list = out.map((kind, i) => ({ kind, at: +(i * span / out.length).toFixed(2) }));
  if (isBossWave(n)) list.push({ kind: "boss", at: +(span * 0.75).toFixed(2) });
  return list.sort((a, b) => a.at - b.at);
}

/* ---------- 길: 점 목록 → 길이 매개변수로 위치 ---------- */
export function makePath(pts) {
  const cum = [0];
  for (let i = 1; i < pts.length; i++) cum.push(cum[i - 1] + Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]));
  return { pts, cum, len: cum[cum.length - 1] };
}
// 길 위 s 지점의 위치와 방향(dx 가 음수면 왼쪽으로 감). s 는 0..len 로 붙는다.
export function pathPoint(path, s, out = {}) {
  const { pts, cum, len } = path, t = Math.max(0, Math.min(len, s));
  let i = 1; while (i < cum.length - 1 && cum[i] < t) i++;
  const seg = cum[i] - cum[i - 1] || 1, k = (t - cum[i - 1]) / seg;
  const ax = pts[i - 1][0], ay = pts[i - 1][1], bx = pts[i][0], by = pts[i][1];
  out.x = ax + (bx - ax) * k; out.y = ay + (by - ay) * k; out.dx = (bx - ax) / seg; out.dy = (by - ay) / seg;
  return out;
}
export function distToSeg(px, py, ax, ay, bx, by) {
  const vx = bx - ax, vy = by - ay, l2 = vx * vx + vy * vy || 1;
  const k = Math.max(0, Math.min(1, ((px - ax) * vx + (py - ay) * vy) / l2));
  return Math.hypot(px - ax - vx * k, py - ay - vy * k);
}
export function distToPath(path, x, y) { let d = Infinity; for (let i = 1; i < path.pts.length; i++) d = Math.min(d, distToSeg(x, y, path.pts[i - 1][0], path.pts[i - 1][1], path.pts[i][0], path.pts[i][1])); return d; }
// 자리 (x,y) 에서 반지름 r 안에 드는 길 길이(8칸 간격 표본)
export function coverage(path, x, y, r, step = 8) {
  let n = 0; const p = {};
  for (let s = 0; s <= path.len; s += step) { pathPoint(path, s, p); if ((p.x - x) ** 2 + (p.y - y) ** 2 <= r * r) n++; }
  return n * step;
}

/* ---------- 맵 3개 ---------- */
// paths: 괴물이 걷는 길(여럿이면 괴물마다 하나를 무작위로). 끝점이 성문. 박쥐는 첫 길 시작점에서 성문까지 곧게 난다.
export const MAPS = [
  { id: "field", name: "들판 길", need: 0, hp: 1, bal: 0.88, span: 1.12, tint: null, ground: "#8fcf6a", dirt: "#e2c48c", edge: "#a8834f",
    paths: [[[-40, 470], [180, 470], [180, 170], [420, 170], [420, 450], [660, 450], [660, 200], [850, 200]]],
    castle: { x: 892, y: 196 },
    pads: [[110, 395], [300, 300], [540, 330], [540, 540], [770, 320], [300, 95], [245, 548], [760, 105]],
    decor: [["tree", 40, 120, 70], ["tree", 92, 190, 60], ["rock", 360, 540, 46], ["tree", 680, 560, 66], ["rock", 880, 400, 50], ["tree", 860, 540, 72], ["tree", 560, 80, 56], ["rock", 605, 370, 40], ["tree", 40, 560, 60], ["rock", 470, 70, 38]] },
  { id: "forest", name: "버섯 숲길", need: 1, hp: 1, bal: 0.95, span: 1.55, tint: "rgba(40,90,60,.18)", ground: "#6fae5c", dirt: "#d8b47e", edge: "#8f6a3c",
    paths: [
      [[-40, 300], [140, 300], [140, 120], [560, 120], [560, 300], [860, 300]],
      [[-40, 300], [140, 300], [140, 480], [560, 480], [560, 300], [860, 300]],
    ],
    castle: { x: 900, y: 296 },
    pads: [[60, 220], [60, 380], [250, 210], [250, 390], [420, 205], [420, 395], [650, 210], [650, 390], [780, 385]],
    decor: [["mushroom", 350, 300, 70], ["mushroom", 300, 250, 44], ["tree", 30, 80, 66], ["mushroom", 40, 540, 56], ["tree", 760, 90, 70], ["mushroom", 860, 470, 58], ["tree", 880, 120, 60], ["rock", 460, 300, 40], ["mushroom", 700, 560, 48], ["tree", 250, 560, 62]] },
  { id: "snow", name: "눈 다리", need: 3, hp: 1.3, bal: 1.0, span: 0.95, tint: "rgba(232,244,255,.55)", ground: "#dfeef6", dirt: "#b9a07e", edge: "#7e6a52",
    paths: [[[-40, 150], [620, 150], [620, 470], [380, 470], [380, 300], [860, 300]]],
    castle: { x: 900, y: 296 },
    pads: [[100, 235], [320, 235], [470, 225], [700, 225], [820, 220], [500, 385], [300, 390], [700, 390], [820, 385], [540, 545]],
    decor: [["snowpine", 40, 60, 60], ["snowpine", 250, 60, 54], ["snowpine", 820, 90, 66], ["rock", 160, 400, 46], ["snowpine", 120, 520, 64], ["snowpine", 880, 520, 60], ["rock", 760, 560, 44], ["snowpine", 460, 60, 50], ["rock", 240, 480, 40], ["snowpine", 940, 160, 50]] },
];
export const MAP_IDS = MAPS.map(m => m.id);
export const mapOf = id => MAPS.find(m => m.id === id) || MAPS[0];
export const openMaps = wins => MAPS.filter(m => wins >= m.need).map(m => m.id);
const PATH_CACHE = new Map();
export function mapPaths(map) {
  let o = PATH_CACHE.get(map.id);
  if (!o) {
    const paths = map.paths.map(makePath), a = map.paths[0][0], end = map.paths[0][map.paths[0].length - 1];
    o = { paths, fly: makePath([[a[0], a[1] - 30], [end[0], end[1] - 10]]) };
    PATH_CACHE.set(map.id, o);
  }
  return o;
}
// 자리마다 그 탑 사거리에 드는 길 길이(길이 여럿이면 평균, 박쥐 길은 따로)
export function padCoverage(map, padIdx, range) {
  const { paths, fly } = mapPaths(map), [x, y] = map.pads[padIdx];
  let g = 0; for (const p of paths) g += coverage(p, x, y, range);
  return { ground: g / paths.length, air: coverage(fly, x, y, range) };
}

/* ---------- 카드 ----------
   state = { towers: [{pad, kind, lv, branch}], freePads, cake, cakeMax }
   up     : 세워진 탑 하나 +1단계(같은 종류가 여럿이면 가장 낮은 것)
   new    : 아직 없는 종류의 탑을 빈 자리에 공짜로
   spell  : 다음 파도 동안 모든 탑 연사 +40%
   cake   : 케이크 +2
   legend : 탑 2단계 한꺼번에(3번 연속 한 번에 맞혔을 때만 섞임) */
function lowestOf(state, kind) {
  let best = null;
  for (const t of state.towers) if (t.kind === kind && t.lv < MAX_LV && (!best || t.lv < best.lv)) best = t;
  return best;
}
export function cardOptions(state, { rare = false } = {}) {
  const out = [], owned = new Set(state.towers.map(t => t.kind));
  for (const kind of TOWER_IDS) {
    const t = lowestOf(state, kind);
    if (t) out.push({ type: "up", kind, pad: t.pad, from: t.lv, lv: t.lv + 1, branch: t.branch || null, rarity: t.lv + 1 >= 3 ? 2 : 1 });
    if (!owned.has(kind) && state.freePads > 0) out.push({ type: "new", kind, lv: 1, rarity: 1 });
    if (rare && t && t.lv <= MAX_LV - 2) out.push({ type: "legend", kind, pad: t.pad, from: t.lv, lv: t.lv + 2, branch: t.branch || null, rarity: 3 });
  }
  out.push({ type: "spell", id: "haste", rarity: 1 });
  out.push({ type: "cake", id: "cake", rarity: 1 });
  return out;
}
export const cardKey = c => c.type + ":" + (c.kind || c.id);
export const needsBranch = c => (c.type === "up" || c.type === "legend") && c.from < 3 && c.lv >= 3 && !c.branch;
// 권할 만한 정도(태오 추천·로봇). 낮은 단계 탑 강화가 가장 좋다.
export function cardScore(c, state) {
  if (c.type === "legend") return 100;
  if (c.type === "up") return 80 - c.from * 6;
  if (c.type === "new") return state.towers.length < 3 ? 85 : 50;
  if (c.type === "cake") return state.cake <= state.cakeMax / 2 ? 75 : state.cake < state.cakeMax ? 30 : 10;
  return 40;
}
// count 장(중복 없음). low: 고쳐 맞힘(전설 없음). rare: 전설 카드 한 장 섞기. recommend: 한 장 반짝.
export function drawCards(state, { count = 3, low = false, rare = false, recommend = false, rng = Math.random } = {}) {
  const pool = cardOptions(state, { rare: rare && !low }).filter(c => !low || c.type !== "legend");
  const picked = [], has = c => picked.some(p => cardKey(p) === cardKey(c) || (p.kind && p.kind === c.kind));
  const take = c => { if (c && !has(c) && picked.length < count) picked.push(c); };
  if (rare && !low) take(pool.find(c => c.type === "legend"));
  // 강화 카드가 하나는 꼭 있게(탑이 세지는 재미)
  const ups = pool.filter(c => c.type === "up");
  if (ups.length) take(ups[Math.floor(rng() * ups.length)]);
  const weight = c => c.type === "up" ? 3 : c.type === "new" ? 2 : c.type === "spell" ? 1.2 : c.type === "cake" ? (state.cake < state.cakeMax ? 1.2 : 0.4) : 0;
  let rest = pool.filter(c => c.type !== "legend");
  while (picked.length < count) {
    rest = rest.filter(c => !has(c));
    if (!rest.length) break;
    let sum = 0; for (const c of rest) sum += weight(c);
    let r = rng() * sum, ch = rest[rest.length - 1];
    for (const c of rest) { r -= weight(c); if (r <= 0) { ch = c; break; } }
    take(ch);
  }
  if (recommend && picked.length) {
    let best = 0; picked.forEach((c, i) => { if (cardScore(c, state) > cardScore(picked[best], state)) best = i; });
    picked[best] = Object.assign({}, picked[best], { recommend: true });
  }
  return picked;
}
export function cardText(c) {
  const T = TOWERS[c.kind];
  if (c.type === "up") return { name: T.name, tag: c.lv + "단계", say: c.lv === 3 && !c.branch ? "3단계! 변신할 모양을 골라요" : upgradeGain(c.kind, c.lv, c.branch) };
  if (c.type === "legend") return { name: T.name, tag: "전설 " + c.lv + "단계", say: "두 단계 한꺼번에!" };
  if (c.type === "new") return { name: T.name, tag: "새 탑!", say: "빈 자리에 공짜로 세워요" };
  if (c.type === "spell") return { name: "빠른 주문", tag: "특별 주문", say: "다음 파도 동안 모든 탑이 더 빨리 쏴요" };
  return { name: "케이크 굽기", tag: "케이크", say: "케이크 +" + CAKE_CARD + "조각" };
}
// 카드를 고른 순간의 큰 배너: "불꽃 탑 3단계! 불새 탑으로 변신"
export function gainText(c, branch) {
  const T = TOWERS[c.kind];
  if (c.type === "up" || c.type === "legend") {
    const br = c.branch || branch || "a";
    if (c.from < 3 && c.lv >= 3) return T.name + " " + c.lv + "단계! " + T.branches[br].name + "으로 변신";
    return towerName(c.kind, c.lv, br) + " " + c.lv + "단계! " + upgradeGain(c.kind, c.lv, br);
  }
  if (c.type === "new") return T.name + " 뚝딱! 새 탑이 생겼어요";
  if (c.type === "spell") return "빠른 주문! 모든 탑이 더 빨리 쏴요";
  return "케이크 +" + CAKE_CARD + "조각!";
}

/* ---------- 판 밖에 남는 것 ---------- */
// 마법 배지: 맞힌 문제 누적
export const BADGES = [
  { id: "gems20", need: 10, name: "시작 수정 +20" },
  { id: "freeTower", need: 30, name: "첫 탑 공짜" },
  { id: "cake1", need: 60, name: "케이크 +1조각" },
  { id: "gems40", need: 100, name: "시작 수정 +40 더" },
];
export const openBadges = solved => BADGES.filter(b => solved >= b.need).map(b => b.id);
export function starsFor(result, cakeLeft, cakeMax) {
  if (result !== "win") return 0;
  const k = cakeLeft / Math.max(1, cakeMax);
  return k >= 0.8 ? 3 : k >= 0.4 ? 2 : 1;
}
export const SAVE_KEY = "towers_save_v1", WIZ_KEY = "towers_wizard_v1", SOUND_KEY = "towers_sound_v1";
export function defaultSave() {
  const maps = {}; for (const m of MAPS) maps[m.id] = { stars: 0, wins: 0 };
  const monsters = {}; for (const k of MONSTER_IDS) monsters[k] = 0;
  const towers = {}; for (const k of TOWER_IDS) towers[k] = 0;
  const branches = {}; for (const k of TOWER_IDS) { branches[k + ":a"] = 0; branches[k + ":b"] = 0; }
  const best = {}; for (const p of PILOTS) best[p.kid] = { wave: 0, solved: 0, runs: 0, wins: 0 };
  return { v: 1, wins: 0, solved: 0, maps, monsters, towers, branches, best, map: "field" };
}
const nat = v => { const n = Math.floor(Number(v)); return Number.isFinite(n) && n > 0 ? Math.min(n, 1e7) : 0; };
// 깨진 저장은 기본값으로 고친다(모르는 칸은 버리고, 숫자는 0 이상 정수로).
export function normalizeSave(raw) {
  let o = raw;
  if (typeof o === "string") { try { o = JSON.parse(o); } catch (_) { o = null; } }
  const s = defaultSave();
  if (!o || typeof o !== "object" || Array.isArray(o)) return s;
  s.wins = nat(o.wins); s.solved = nat(o.solved);
  if (o.maps && typeof o.maps === "object") for (const m of MAPS) { const v = o.maps[m.id]; if (v && typeof v === "object") s.maps[m.id] = { stars: Math.min(3, nat(v.stars)), wins: nat(v.wins) }; }
  for (const key of ["monsters", "towers", "branches"]) if (o[key] && typeof o[key] === "object") for (const k in s[key]) s[key][k] = nat(o[key][k]);
  if (o.best && typeof o.best === "object") for (const p of PILOTS) {
    const b = o.best[p.kid]; if (!b || typeof b !== "object") continue;
    s.best[p.kid] = { wave: Math.min(WAVES, nat(b.wave)), solved: nat(b.solved), runs: nat(b.runs), wins: nat(b.wins) };
  }
  s.map = openMaps(s.wins).includes(o.map) ? o.map : "field";
  return s;
}
// 판이 끝났을 때 저장에 더한다. run: runRecord(engine) 결과
export function applyRun(save, run) {
  const s = normalizeSave(save), before = JSON.parse(JSON.stringify(s));
  const win = run.result === "win";
  if (win) s.wins++;
  s.solved = nat(s.solved + nat(run.solved));
  const m = s.maps[run.map];
  const stars = starsFor(run.result, run.cake, run.cakeMax);
  if (m) { m.stars = Math.max(m.stars, stars); if (win) m.wins++; }
  if (run.dex) for (const k of MONSTER_IDS) s.monsters[k] = nat(s.monsters[k] + nat(run.dex[k]));
  if (run.towersUsed) for (const k of run.towersUsed) if (k in s.towers) s.towers[k]++;
  if (run.branchesUsed) for (const k of run.branchesUsed) if (k in s.branches) s.branches[k]++;
  const b = s.best[run.kid];
  if (b) { b.wave = Math.max(b.wave, Math.min(WAVES, nat(run.wave))); b.solved = Math.max(b.solved, nat(run.solved)); b.runs++; if (win) b.wins++; }
  const maps0 = openMaps(before.wins), maps1 = openMaps(s.wins), badges0 = openBadges(before.solved), badges1 = openBadges(s.solved);
  return {
    save: s, stars, newStars: m ? Math.max(0, stars - before.maps[run.map].stars) : 0,
    newMaps: maps1.filter(x => !maps0.includes(x)),
    newBadges: badges1.filter(x => !badges0.includes(x)),
    newMonsters: MONSTER_IDS.filter(k => !before.monsters[k] && s.monsters[k]),
    newTowers: TOWER_IDS.filter(k => !before.towers[k] && s.towers[k]),
    newBranches: Object.keys(s.branches).filter(k => !before.branches[k] && s.branches[k]),
  };
}
