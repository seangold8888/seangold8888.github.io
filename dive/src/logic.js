// 딥 다이브 — 화면과 무관한 규칙(장비 표, 적 곡선, 경험치 곡선, 카드 뽑기, 저장 정규화). Node 테스트가 그대로 읽는다.
// 실제 바다 속 움직임(한 걸음씩 진행)은 engine.js, 그리기·입력·화면은 main.js.

export const RUN_TIME = 210;          // 한 판(초, 3분 30초). 게임 시간은 누적 dt 로만 잰다.
export const BOSS_AT = 170;           // 먹물 대왕이 나오는 때
export const WORLD = { w: 1800, h: 1300 };
export const MAX_ENEMIES = 100, MAX_SHOTS = 220, MAX_ORBS = 160, MAX_QPEARLS = 2;
export const MAX_WEAPONS = 4, MAX_SUPPORTS = 3, MAX_LV = 5;
export const SUB_SPEED = 245;         // 잠수정 기본 속도(논리 칸/초) — 예전 190 보다 29% 빠르게
export const STICK_R = 60;            // 가상 스틱: 누른 자리에서 이만큼 끌면 최고 속도
export const HURT_INV = 1.5, RESUME_INV = 1.5;
// 판 길이 글자("3분 30초")
export const runLabel = (sec = RUN_TIME) => Math.floor(sec / 60) + "분" + (sec % 60 ? " " + (sec % 60) + "초" : "");

/* ---------- 슈웅!(돌진) ----------
   dur 초 동안 speed 로 바라보는 쪽으로 쭉 나간다. 그동안 다치지 않고, 지나간 자리의 친구를 씻긴다. 끝나고 grace 초 더 안 다친다. */
export const DASH = { dur: 0.2, speed: 950, grace: 0.15, hitR: 14 };
/* ---------- 콤보 → 무지개 터보 ----------
   gap 초 안에 다음 친구를 씻기면 콤보가 이어진다. 콤보가 이어질수록 게이지가 차고, 가득 차면 dur 초 동안 무지개 터보. */
export const FEVER = { dur: 6, gap: 0.9, cool: 0.6, area: 1.3, dashCool: 0.5, gain: 0.0058, grow: 0.8 };
// 게이지 한 칸 = 콤보 3 이상에서 씻긴 친구 하나. n 번째 터보일수록 조금씩 더 모아야 한다(잘하는 아이도 한 판에 5~6번 정도).
export const feverGain = (combo, n = 0) => (combo < 3 ? 0 : FEVER.gain / (1 + FEVER.grow * n));

/* ---------- 조종사 = 아이 ---------- */
export const PILOTS = [
  { kid: "yunchan", name: "윤찬", art: "sub0", color: "#4aa8ff" },
  { kid: "jaei", name: "재이", art: "sub1", color: "#ff86b8" },
  { kid: "yungeon", name: "윤건", art: "sub2", color: "#ff9f43" },
  { kid: "taeo", name: "태오", art: "sub3", color: "#ffd84a" },
];
// 아이별 난이도: speed 적 속도, hp 적 체력, hearts 하트, magnet 빛 방울 끌림 배수, eel 곰치 나옴, cards 한 번에 맞혔을 때 카드 수,
// dashCd 슈웅! 다시 쓰기까지 초, autoDash 부딪히기 직전 저절로 슈웅!(그 사이 최소 초, 0 이면 없음)
export const PILOT_TUNING = [
  { speed: 1.1, hp: 1.2, hearts: 3, magnet: 1, eel: true, cards: 3, dashCd: 3.0, autoDash: 0 },
  { speed: 1.0, hp: 1.0, hearts: 3, magnet: 1, eel: true, cards: 3, dashCd: 3.0, autoDash: 0 },
  { speed: 0.92, hp: 0.9, hearts: 3, magnet: 1.1, eel: true, cards: 3, dashCd: 2.7, autoDash: 0 },
  { speed: 0.7, hp: 0.6, hearts: 4, magnet: 1.6, eel: false, cards: 2, dashCd: 2.0, autoDash: 3.5 },
];
export const tuning = i => PILOT_TUNING[i] || PILOT_TUNING[1];

/* ---------- 무기(자동 발동, 각 5단계) ----------
   bubble: n 한 번에 쏘는 방울 수, every 초, dmg, speed, size 반지름, pierce 관통 수, range 노리는 거리
   whirl : n 고리 수, r 도는 반지름, dmg, cd 같은 친구를 다시 씻기까지 초, size 고리 굵기, spin 도는 빠르기
   zap   : chain 이어지는 수, every, dmg, range 첫 상대까지 거리
   shell : n 소라 수, every, dmg, size, dist 날아가는 거리
   light : every, r 빛 파동 반지름, dmg
   star  : dirs 방향 수, every, dmg, speed, pierce, size */
export const WEAPONS = {
  // 두두두: 자주 쏘고 한 발은 약하게(총 피해량은 예전과 비슷), 방울은 크게(1단계도 예전의 2배)
  bubble: { name: "물방울 총", say: "가까운 친구에게 방울 발사", tiers: [
    { n: 1, every: 0.30, dmg: 1.5, speed: 520, size: 15, pierce: 0, range: 250 },
    { n: 2, every: 0.28, dmg: 1.5, speed: 535, size: 16.5, pierce: 0, range: 260 },
    { n: 2, every: 0.24, dmg: 2.0, speed: 550, size: 18.5, pierce: 1, range: 270 },
    { n: 3, every: 0.22, dmg: 2.4, speed: 565, size: 20.5, pierce: 1, range: 280 },
    { n: 4, every: 0.20, dmg: 2.9, speed: 590, size: 23, pierce: 3, range: 300, rainbow: true },
  ] },
  whirl: { name: "회오리 물살", say: "잠수정 주위를 빙글빙글", tiers: [
    { n: 1, r: 64, dmg: 4, cd: 0.45, size: 15, spin: 2.6 },
    { n: 2, r: 70, dmg: 4, cd: 0.45, size: 16, spin: 2.7 },
    { n: 2, r: 82, dmg: 6, cd: 0.42, size: 19, spin: 2.8 },
    { n: 3, r: 86, dmg: 7, cd: 0.40, size: 20, spin: 2.9 },
    { n: 4, r: 98, dmg: 9, cd: 0.38, size: 22, spin: 3.0 },
  ] },
  zap: { name: "전기 해파리 친구", say: "가까운 친구들을 이어서 찌릿", tiers: [
    { chain: 2, every: 1.30, dmg: 6, range: 240 },
    { chain: 3, every: 1.20, dmg: 7, range: 250 },
    { chain: 4, every: 1.05, dmg: 8, range: 260 },
    { chain: 5, every: 0.95, dmg: 10, range: 270 },
    { chain: 7, every: 0.85, dmg: 12, range: 290 },
  ] },
  shell: { name: "소라 부메랑", say: "날아갔다 돌아와요", tiers: [
    { n: 1, every: 1.6, dmg: 6, size: 12, dist: 190 },
    { n: 1, every: 1.4, dmg: 7, size: 15, dist: 210 },
    { n: 2, every: 1.4, dmg: 8, size: 17, dist: 220 },
    { n: 2, every: 1.2, dmg: 10, size: 20, dist: 235 },
    { n: 3, every: 1.1, dmg: 12, size: 22, dist: 250 },
  ] },
  light: { name: "등대 빛", say: "둥근 빛이 퍼져요", tiers: [
    { every: 3.2, r: 120, dmg: 8 },
    { every: 2.9, r: 140, dmg: 10 },
    { every: 2.6, r: 160, dmg: 12 },
    { every: 2.3, r: 185, dmg: 15 },
    { every: 2.0, r: 215, dmg: 18 },
  ] },
  star: { name: "불가사리 표창", say: "여러 방향으로 휙휙", tiers: [
    { dirs: 3, every: 1.2, dmg: 5, speed: 330, pierce: 1, size: 10 },
    { dirs: 4, every: 1.1, dmg: 5, speed: 340, pierce: 1, size: 11 },
    { dirs: 5, every: 1.0, dmg: 6, speed: 350, pierce: 1, size: 12 },
    { dirs: 6, every: 0.9, dmg: 7, speed: 360, pierce: 2, size: 13 },
    { dirs: 8, every: 0.8, dmg: 8, speed: 380, pierce: 2, size: 15 },
  ] },
};
export const WEAPON_IDS = Object.keys(WEAPONS);
// 단계 색: 모든 무기가 단계마다 이 색으로 바뀐다(수치만 오르는 단계가 없도록 — 개수·크기와 함께 색도 바뀜).
// 1 하늘 · 2 파랑 · 3 진파랑 · 4 보라 · 5 무지개(금)
export const LV_COLORS = ["#bff3ff", "#7fd0ff", "#4f8dff", "#b48cff", "#ffd75a"];
// 단계가 오를 때 눈에 보이는 변화를 짧게("고리 +1", "더 크게")
export function upgradeGain(id, lv) {
  const W = WEAPONS[id]; if (!W || lv < 2) return "";
  const a = W.tiers[lv - 2], b = W.tiers[Math.min(MAX_LV, lv) - 1], out = [];
  const more = (k, word) => { if (b[k] > a[k]) out.push(word + " +" + (b[k] - a[k])); };
  if (id === "bubble") { if (b.rainbow) out.push("무지개 방울"); more("n", "방울"); if (!b.rainbow && b.n === a.n) out.push("방울이 커져요"); }
  if (id === "whirl") { more("n", "고리"); if (b.n === a.n) out.push("고리가 커져요"); }
  if (id === "zap" && b.chain > a.chain) out.push("찌릿 +" + (b.chain - a.chain) + "마리");
  if (id === "shell") { more("n", "소라"); if (b.n === a.n) out.push("소라가 커져요"); }
  if (id === "light") out.push("빛이 넓어져요");
  if (id === "star") more("dirs", "방향");
  return out.join(" · ");
}
const SUPPORT_GAIN = { prop: "속도 +8%", magnet: "끌림 +35%", heart: "하트 하나 채움", big: "모든 무기 크게", quick: "모든 무기 자주" };
// 카드를 고른 순간의 큰 배너 글자: "회오리 물살 2단계! 고리 +1"
export function gainText(c) {
  if (c.kind === "combo") return "합체! " + COMBOS[c.id].name;
  if (c.kind === "heal") return "하트 +1!";
  if (c.kind === "gem") return "진주 +1!";
  const T = c.kind === "weapon" ? WEAPONS[c.id] : SUPPORTS[c.id];
  if (c.isNew) return T.name + " 장착!";
  const g = c.kind === "weapon" ? (c.rare ? [upgradeGain(c.id, c.lv - 1), upgradeGain(c.id, c.lv)].filter(Boolean).join(" · ") : upgradeGain(c.id, c.lv)) : (c.id === "heart" && HEART_BONUS[c.lv] > HEART_BONUS[c.from] ? "최대 하트 +1" : SUPPORT_GAIN[c.id]);
  return T.name + " " + c.lv + "단계!" + (g ? " " + g : "");
}

// 합체 장비: 5단계 무기 + 짝 보조를 모두 가지면 카드에 뜬다. 고르면 그 무기가 바뀐다.
export const COMBOS = {
  fall: { weapon: "bubble", support: "quick", name: "방울 폭포", say: "무지개 방울이 쏟아져요",
    stats: { n: 6, every: 0.15, dmg: 3.4, speed: 620, size: 25, pierce: 4, range: 320, rainbow: true } },
  maelstrom: { weapon: "whirl", support: "big", name: "바다 소용돌이", say: "커다란 소용돌이가 감싸요",
    stats: { n: 6, r: 124, dmg: 11, cd: 0.34, size: 26, spin: 3.3, pull: true } },
};
export const COMBO_IDS = Object.keys(COMBOS);
export const comboOfWeapon = id => COMBO_IDS.find(c => COMBOS[c].weapon === id) || null;

/* ---------- 보조(지속 효과, 각 5단계) ---------- */
export const SUPPORTS = {
  prop: { name: "프로펠러", say: "더 빨리 헤엄쳐요" },
  magnet: { name: "자석", say: "빛 방울이 멀리서 와요" },
  heart: { name: "튼튼 선체", say: "하트가 늘고 하나 채워요" },
  big: { name: "큰 방울", say: "모든 무기가 커져요" },
  quick: { name: "빠른 손", say: "모든 무기가 더 자주" },
};
export const SUPPORT_IDS = Object.keys(SUPPORTS);
// 튼튼 선체: 단계별 늘어나는 최대 하트(1·3·5단계에서 늘고, 얻을 때마다 하나 채운다)
export const HEART_BONUS = [0, 1, 1, 2, 2, 3];
const lvOf = (o, id) => Math.max(0, Math.min(MAX_LV, (o && o[id]) | 0));
// 보조 효과를 숫자로
export function mods(supports = {}) {
  return {
    speed: 1 + 0.08 * lvOf(supports, "prop"),
    magnet: 1 + 0.35 * lvOf(supports, "magnet"),
    area: 1 + 0.10 * lvOf(supports, "big"),
    cool: 1 - 0.07 * lvOf(supports, "quick"),
    hearts: HEART_BONUS[lvOf(supports, "heart")],
  };
}

// 무지개 터보 동안: 더 자주, 더 크게
// 콤보 단계: 이름과 색이 바뀌고, 바뀔 때 숫자가 튀어 오른다(끊겨도 벌은 없다)
export const COMBO_TIERS = [
  { at: 10, name: "좋아요", color: "#7dffb0" },
  { at: 30, name: "멋져요", color: "#6fd3ff" },
  { at: 60, name: "굉장해요", color: "#ff9ee0" },
  { at: 100, name: "전설!", color: "rainbow" },
];
export const comboTier = c => { let k = -1; for (let i = 0; i < COMBO_TIERS.length; i++) if (c >= COMBO_TIERS[i].at) k = i; return k; };
// 한 번에 여러 마리: MULTI.win 초 안에 씻긴 수가 이 고비를 넘으면 큰 글자
export const MULTI = { win: 0.6, steps: [5, 10, 20], say: ["한 번에 5마리!", "우와 10마리!", "대박 20마리!"] };
export const feverMods = m => Object.assign({}, m, { cool: m.cool * FEVER.cool, area: m.area * FEVER.area });

// 무기 한 벌의 실제 수치(단계·합체·보조 반영)
export function weaponStats(id, lv, evo = false, m = mods()) {
  const W = WEAPONS[id]; if (!W) return null;
  const L = Math.max(1, Math.min(MAX_LV, lv | 0));
  const combo = evo ? comboOfWeapon(id) : null;
  const s = Object.assign({ id, lv: L, evo: !!combo, name: combo ? COMBOS[combo].name : W.name }, combo ? COMBOS[combo].stats : W.tiers[L - 1]);
  if (s.every) s.every *= m.cool;
  if (s.cd) s.cd *= Math.max(0.6, m.cool + 0.1);
  for (const k of ["size", "r", "dist"]) if (s[k]) s[k] *= m.area;
  if (s.range) s.range *= 1 + (m.area - 1) * 0.5;
  return s;
}

// 1초에 씻기는 양(어림). 다 맞는다고 보되, 맞히기 어렵거나 여럿을 한꺼번에 씻는 것은 대충 곱을 붙였다.
export function weaponDps(id, lv, evo = false, m = mods()) {
  const s = weaponStats(id, lv, evo, m); if (!s) return 0;
  switch (id) {
    case "bubble": return s.n * s.dmg / s.every * (1 + (s.pierce || 0) * 0.15);
    case "whirl": return s.n * s.dmg / s.cd * 0.42 * (s.r / 64);                 // 고리에 닿는 친구에게만
    case "zap": return s.dmg * (1 + (s.chain - 1) * 0.6) / s.every;              // 이어질 친구가 다 있지 않을 때가 많다
    case "shell": return s.n * s.dmg * 2.2 / s.every * (s.size / 12) ** 0.5;      // 가고 오며 두 번쯤, 클수록 더
    case "light": return s.dmg * 1.6 * (s.r / 120) ** 2 / s.every;               // 둥글게 여럿
    case "star": return s.dirs * s.dmg * 0.45 * (1 + s.pierce * 0.3) / s.every;  // 퍼지니 절반쯤 맞는다
  }
  return 0;
}
export function loadoutDps(load) {
  const m = mods(load.supports);
  let v = 0;
  for (const id in load.weapons) v += weaponDps(id, load.weapons[id], !!(load.evo && load.evo[id]), m);
  return v;
}

/* ---------- 적 = 먹물에 물든 바다 친구 ----------
   hp 기본 체력, speed 기본 속도, r 반지름, xp 빛 방울 값, from 나오기 시작하는 초 */
// 약한 친구가 떼로(한두 방에 씻김), 시간이 갈수록 단단해진다. special: 이벤트로만 나오는 친구, dex:false 는 도감에 없음
export const ENEMIES = {
  inkfish: { name: "먹물 물고기", ok: "물고기", hp: 3, speed: 64, r: 15, xp: 1, from: 0, art: "inkfish", okArt: "fish_ok" },
  crab: { name: "먹물 게", ok: "꽃게", hp: 5, speed: 70, r: 16, xp: 1, from: 25, art: "crab", okArt: "crab_ok" },
  jelly: { name: "먹물 해파리", ok: "해파리", hp: 9, speed: 44, r: 19, xp: 2, from: 50, art: "jelly", okArt: "jelly_ok" },
  puffer: { name: "먹물 복어", ok: "복어", hp: 7, speed: 60, r: 17, xp: 2, from: 80, art: "puffer", okArt: "puffer_ok" },
  eel: { name: "먹물 곰치", ok: "곰치", hp: 6, speed: 360, r: 16, xp: 2, from: 110, art: "eel", okArt: "eel_ok" },
  boss: { name: "먹물 문어 대왕", ok: "문어 대왕", hp: 720, speed: 46, r: 62, xp: 0, from: BOSS_AT, art: "boss", okArt: "boss_ok" },
  kingjelly: { name: "왕 먹물 해파리", ok: "왕 해파리", hp: 70, speed: 36, r: 34, xp: 8, from: 999, art: "jelly", okArt: "jelly_ok", special: true },
  kingpuffer: { name: "왕 먹물 복어", ok: "왕 복어", hp: 90, speed: 42, r: 34, xp: 8, from: 999, art: "puffer", okArt: "puffer_ok", special: true },
  gold: { name: "황금 물고기", ok: "황금 물고기", hp: 12, speed: 175, r: 17, xp: 0, from: 999, art: "fish_ok", okArt: "fish_ok", special: true },
  clam: { name: "보물 조개", ok: "보물 조개", hp: 40, speed: 0, r: 26, xp: 0, from: 999, art: "chest", okArt: "chest", special: true, dex: false },
};
export const ENEMY_IDS = Object.keys(ENEMIES);
export const DEX_IDS = ENEMY_IDS.filter(k => ENEMIES[k].dex !== false);
export const KINGS = ["kingjelly", "kingpuffer"];
// 부딪혀도 다치지 않는 친구(도망가는 황금 물고기, 가만히 있는 보물 조개)
export const harmless = kind => kind === "gold" || kind === "clam";
const clamp01 = v => Math.max(0, Math.min(1, v));
// 1초에 나오는 친구 수. 처음부터 떼로 나오고, 대왕까지 계속 늘고, 대왕이 나온 뒤에는 절반.
export function spawnRate(t) {
  const k = clamp01(t / BOSS_AT);
  const r = 1.3 + 1.8 * Math.pow(k, 1.2) + 1.4 * Math.pow(k, 3);
  return t >= BOSS_AT ? r * 0.35 : r;
}
// 화면 안 친구 수 목표: 모자라면 더 불러온다(잘 씻기는 아이 화면도 늘 북적이게). 20초 25마리 → 150초 50마리, 대왕 때는 줄인다.
export function crowdTarget(t, tune = tuning(1)) {
  const base = t < 20 ? 18 + t * 0.8 : Math.min(60, 34 + (t - 20) * 0.18);
  return Math.round((t >= BOSS_AT ? Math.min(base, 14) : base) * (tune.speed < 0.8 ? 0.8 : 1));
}
export const CROWD_FILL = 1.0, CROWD_MAX = 18, CROWD_WASH = 3;
// 꼬마 물고기 떼: 떼마다 함께 오는 아주 약한 친구(체력 0.4배·작게·빛 방울 반). 한 발에 줄줄이 씻기는 맛.
export const FRY = { hp: 0.4, r: 0.65, xp: 0.25, per: 0.7, from: 6 };
export const OFFSCREEN_RUSH = 2.2;   // 화면 밖 친구가 들어오는 빠르기 배수
// 한 번에 함께 나오는 떼 크기
export const packSize = t => 4 + Math.min(4, Math.floor(t / 40));
// 단단한 친구(테두리 반짝, 체력 4배, 씻기면 크게 터짐)가 섞이는 비율
export const ELITE = { hp: 4, r: 1.35, xp: 4, speed: 0.9 };
export const eliteChance = t => (t < 15 ? 0 : t < 60 ? 0.04 : 0.06);
// 시간에 따라 단단해지고 빨라진다(상한 있음).
export const hpMul = t => { const k = clamp01(t / BOSS_AT); return 1 + 0.5 * Math.pow(k, 1.4) + 2.1 * Math.pow(k, 3) + 0.3 * clamp01((t - BOSS_AT) / 40); };
export const speedMul = t => 1 + 0.38 * clamp01(t / BOSS_AT);
export function enemyHp(kind, t, tune = tuning(1)) {
  const E = ENEMIES[kind]; if (!E) return 1;
  if (kind === "boss") return E.hp * tune.hp;
  if (kind === "gold" || kind === "clam") return Math.round(E.hp * (1 + (hpMul(t) - 1) * 0.5) * tune.hp);
  return Math.max(1, Math.round(E.hp * hpMul(t) * tune.hp));
}
export const enemySpeed = (kind, t, tune = tuning(1)) => (ENEMIES[kind] ? ENEMIES[kind].speed : 50) * (kind === "eel" || kind === "gold" ? 1 : speedMul(t)) * tune.speed;
// 곰치는 따로 경고 뒤 가로지른다(섞는 표에는 없다). 첫 곰치 시각과 간격.
export const eelGap = t => Math.max(4, 8 - (t - ENEMIES.eel.from) / 20);

/* ---------- 연쇄: 씻긴 친구가 방울을 터뜨려 가까운 약한 친구를 씻긴다 ----------
   depth 0(직접 씻김) → 1 → 2 에서 멈춘다. 단단한 친구·왕 친구는 크게 터지고, 그 다음 칸도 다시 0부터. */
export const CHAIN = { r: 58, r1: 50, dmg1: 1, maxDepth: 2, eliteR: 130, eliteDmg: 2.5, kingR: 170, kingDmg: 3, perStep: 70 };
// 연쇄 방울 세기: 시간이 지나도 절반만 따라 세진다(늦게는 연쇄만으로는 다 못 씻김 — 장비를 키워야)
export const chainDmg = (t, tune = tuning(1)) => Math.max(2, Math.round(ENEMIES.inkfish.hp * (1 + (hpMul(t) - 1) * 0.45) * tune.hp * 10) / 10);

/* ---------- 이벤트(20초쯤마다 큰 글자로 알림) ---------- */
export const EVENTS = {
  ring: { name: "먹물 떼가 빙 둘러싸요!", sub: "슈웅! 으로 뚫고 나가요" },
  gold: { name: "황금 물고기다!", sub: "잡으면 빛 방울이 쏟아져요" },
  king: { name: "큰 먹물 친구 등장!", sub: "씻겨 주면 ? 진주를 줘요" },
  current: { name: "센 물살이 와요!", sub: "모두 옆으로 밀려요" },
  clam: { name: "보물 조개!", sub: "여러 번 맞히면 장비 선물" },
  whale: { name: "고래 친구가 지나가요!", sub: "지나간 줄을 싹 씻어 줘요" },
};
export const EVENT_PLAN = [
  { t: 18, id: "ring" }, { t: 38, id: "gold" }, { t: 55, id: "king", kind: "kingjelly" }, { t: 75, id: "current" },
  { t: 95, id: "clam" }, { t: 115, id: "king", kind: "kingpuffer" }, { t: 135, id: "whale" }, { t: 152, id: "ring" },
  { t: 186, id: "whale" }, { t: 198, id: "gold" },
];

/* ---------- 바다 지도(구역) ---------- */
export const ZONES = [
  { id: "coral", name: "산호 숲", need: 0, tint: null, floor: "#e9d6a8", deep: "#2a7fb8", mix: { inkfish: 1, crab: 1, jelly: 1, puffer: 1 }, boss: 1, decor: ["coral", "seaweed", "rock"] },
  { id: "wreck", name: "난파선 골짜기", need: 40, tint: "rgba(20,70,90,.28)", floor: "#c9c09a", deep: "#1f5f86", mix: { inkfish: 1, crab: 1.8, jelly: 0.9, puffer: 1 }, boss: 1.25, decor: ["wreck", "seaweed", "rock"], eel: 1.4 },
  { id: "cave", name: "깊은 빛 동굴", need: 120, tint: "rgba(20,10,60,.42)", floor: "#a9a2c8", deep: "#1b2f66", mix: { inkfish: 1, crab: 0.8, jelly: 1.7, puffer: 1.6 }, boss: 1.5, decor: ["rock", "coral", "seaweed"] },
];
export const zoneOf = id => ZONES.find(z => z.id === id) || ZONES[0];
export const openZones = pearls => ZONES.filter(z => pearls >= z.need).map(z => z.id);
// 지금 시각에 나올 수 있는 친구와 비율
export function enemyMix(t, zone = ZONES[0]) {
  const out = {};
  for (const k in zone.mix) if (t >= ENEMIES[k].from) out[k] = zone.mix[k] * (k === "inkfish" ? Math.max(0.45, 1.6 - t / 150) : 1);
  return out;
}
export function pickKind(t, zone, rng = Math.random) {
  const mix = enemyMix(t, zone); let sum = 0;
  for (const k in mix) sum += mix[k];
  let r = rng() * sum;
  for (const k in mix) { r -= mix[k]; if (r <= 0) return k; }
  return "inkfish";
}
export const bossHp = (zone = ZONES[0], tune = tuning(1)) => Math.round(ENEMIES.boss.hp * zone.boss * Math.min(1.1, tune.hp));

/* ---------- 빛 방울 → ? 진주 ---------- */
// n 번째(0부터) ? 진주까지 모아야 하는 빛 방울 양
// 첫 진주는 10초 안팎, 첫 1분에 셋쯤, 그다음은 꾸준히(친구가 떼로 나오니 빛 방울도 많다)
export const xpNeed = n => Math.round(XP_CURVE[0] + XP_CURVE[1] * n + XP_CURVE[2] * n * n);
export const XP_CURVE = [22, 70, 0];
// 첫 진주 빨리(출발 선물)
export const xpNeedFor = (n, quick) => (n === 0 && quick ? Math.ceil(xpNeed(0) * 0.6) : xpNeed(n));
// 빛 방울 양 x 를 모았을 때 몇 번째 진주까지 떴나
export function pearlsFor(xp, quick = false) { let n = 0; while (xp >= xpNeedFor(n, quick)) { xp -= xpNeedFor(n, quick); n++; } return n; }

/* ---------- 장비 카드 ---------- */
// 상자(load): { weapons: {id: lv}, evo: {id: true}, supports: {id: lv} }
export const newLoadout = () => ({ weapons: { bubble: 1 }, evo: {}, supports: {} });
export function cardOptions(load, { rare = false } = {}) {
  const out = [], w = load.weapons || {}, s = load.supports || {}, evo = load.evo || {};
  const wc = Object.keys(w).length, sc = Object.keys(s).length;
  for (const id of WEAPON_IDS) {
    if (w[id]) { if (w[id] < MAX_LV) out.push({ kind: "weapon", id, from: w[id], lv: w[id] + 1, rarity: w[id] + 1 === MAX_LV ? 2 : 1 }); }
    else if (wc < MAX_WEAPONS) out.push({ kind: "weapon", id, from: 0, lv: 1, rarity: 1, isNew: true });
  }
  for (const id of SUPPORT_IDS) {
    if (s[id]) { if (s[id] < MAX_LV) out.push({ kind: "support", id, from: s[id], lv: s[id] + 1, rarity: 1 }); }
    else if (sc < MAX_SUPPORTS) out.push({ kind: "support", id, from: 0, lv: 1, rarity: 1, isNew: true });
  }
  for (const c of COMBO_IDS) { const C = COMBOS[c]; if (w[C.weapon] >= MAX_LV && s[C.support] && !evo[C.weapon]) out.push({ kind: "combo", id: c, weapon: C.weapon, rarity: 3 }); }
  // 반짝 카드(3연속 한 번에 맞히면): 무기 두 단계 한꺼번에
  if (rare) for (const id of WEAPON_IDS) if (w[id] && w[id] <= MAX_LV - 2) out.push({ kind: "weapon", id, from: w[id], lv: w[id] + 2, rarity: 2, rare: true });
  return out;
}
export const cardKey = c => c.kind + ":" + c.id + (c.rare ? "+" : "");
// 아이(특히 태오)에게 권할 만한 정도. 큰 수가 좋다.
export function cardScore(c, load, hearts = 3, maxHearts = 3) {
  const wc = Object.keys(load.weapons || {}).length;
  if (c.kind === "combo") return 100;
  if (c.rare) return 90;
  if (c.kind === "heal") return hearts < maxHearts ? 60 : 5;
  if (c.kind === "gem") return 4;
  if (c.kind === "weapon") return c.isNew ? (wc < 3 ? 82 : 58) : 72 - c.from * 2;
  if (c.id === "heart") return hearts <= 1 ? 85 : 45;
  if (c.id === "quick" || c.id === "big") return 55;
  return 40;
}
// 카드 뽑기. count 장(중복 없음). low: 고쳐 맞힘 → 희귀도 낮은 쪽만. rare: 반짝 카드 하나 섞기. recommend: 한 장 반짝 추천.
export function drawCards(load, { count = 3, low = false, rare = false, recommend = false, rng = Math.random, hearts = 3, maxHearts = 3 } = {}) {
  let pool = cardOptions(load, { rare: rare && !low });
  if (low) pool = pool.filter(c => c.kind !== "combo" && !c.rare);
  const picked = [], take = c => { if (c && !picked.some(p => cardKey(p) === cardKey(c) || (p.kind === c.kind && p.id === c.id))) picked.push(c); };
  if (!low) { take(pool.find(c => c.kind === "combo")); if (rare) take(pool.find(c => c.rare)); }
  // 무기 카드가 하나는 꼭 있게(무기가 늘어나는 재미). 처음엔 새 무기를 보여 준다.
  const weaponOpts = pool.filter(c => c.kind === "weapon" && !c.rare);
  const wc = Object.keys(load.weapons || {}).length;
  if (picked.length < count && weaponOpts.length) {
    const fresh = weaponOpts.filter(c => c.isNew);
    take(wc < 2 && fresh.length ? fresh[Math.floor(rng() * fresh.length)] : weaponOpts[Math.floor(rng() * weaponOpts.length)]);
  }
  // 나머지는 무게를 둔 무작위(가진 무기 올리기 3, 새 무기 2.5, 보조 올리기 2, 새 보조 1.5)
  const weight = c => (c.kind === "weapon" ? (c.isNew ? 2.5 : 3) : c.kind === "support" ? (c.isNew ? 1.5 : 2) : 1);
  let rest = pool.filter(c => !c.rare && c.kind !== "combo");
  while (picked.length < count) {
    rest = rest.filter(c => !picked.some(p => p.kind === c.kind && p.id === c.id));
    if (!rest.length) break;
    let sum = 0; for (const c of rest) sum += weight(c);
    let r = rng() * sum, ch = rest[rest.length - 1];
    for (const c of rest) { r -= weight(c); if (r <= 0) { ch = c; break; } }
    take(ch);
  }
  // 고를 게 모자라면 하트 채우기·진주 한 알로 채운다.
  const fillers = [{ kind: "heal", id: "heal", rarity: 1 }, { kind: "gem", id: "gem", rarity: 1 }];
  for (const f of fillers) if (picked.length < count) take(f);
  const out = picked.slice(0, count);
  if (recommend && out.length) {
    let best = 0; out.forEach((c, i) => { if (cardScore(c, load, hearts, maxHearts) > cardScore(out[best], load, hearts, maxHearts)) best = i; });
    out[best] = Object.assign({}, out[best], { recommend: true });
  }
  return out;
}
// 카드 이름·설명(화면용)
export function cardText(c) {
  if (c.kind === "combo") return { name: COMBOS[c.id].name, say: "합체! " + COMBOS[c.id].say, tag: "합체" };
  if (c.kind === "heal") return { name: "하트 채우기", say: "하트 하나를 채워요", tag: "" };
  if (c.kind === "gem") return { name: "진주 한 알", say: "가족 진주함에 진주 +1", tag: "" };
  const T = c.kind === "weapon" ? WEAPONS[c.id] : SUPPORTS[c.id];
  const tag = c.isNew ? "새로!" : c.lv + "단계";
  let say = T.say;
  if (!c.isNew && c.kind === "weapon") say = upgradeGain(c.id, c.lv) || weaponUpSay(c.id, c.lv);
  if (c.kind === "support" && c.id === "heart") say = HEART_BONUS[c.lv] > HEART_BONUS[c.from] ? "최대 하트 +1, 하나 채워요" : "하트 하나 채우고 더 단단해져요";
  return { name: T.name, say: c.rare ? "두 단계 한꺼번에!" : say, tag: c.rare ? "반짝 " + c.lv + "단계" : tag };
}
function weaponUpSay(id, lv) {
  const a = WEAPONS[id].tiers[lv - 2], b = WEAPONS[id].tiers[lv - 1];
  if (id === "bubble") return lv === 5 ? "무지개 방울! 뚫고 나가요" : b.n > a.n ? "방울이 " + b.n + "개씩" : "더 빠르고 세게";
  if (id === "whirl") return b.n > a.n ? "물살 고리 " + b.n + "개" : "고리가 더 크게";
  if (id === "zap") return b.chain + "마리까지 이어서 찌릿";
  if (id === "shell") return b.n > a.n ? "소라 " + b.n + "개" : "소라가 더 크게";
  if (id === "light") return "빛이 더 넓고 자주";
  if (id === "star") return b.dirs + "방향으로 휙휙";
  return "더 세져요";
}
// 카드를 상자에 넣는다(새 상자를 돌려준다).
export function applyCard(load, c) {
  const out = { weapons: Object.assign({}, load.weapons), evo: Object.assign({}, load.evo), supports: Object.assign({}, load.supports) };
  if (c.kind === "weapon") out.weapons[c.id] = Math.min(MAX_LV, c.lv);
  else if (c.kind === "support") out.supports[c.id] = Math.min(MAX_LV, c.lv);
  else if (c.kind === "combo") out.evo[COMBOS[c.id].weapon] = true;
  return out;
}

/* ---------- 판 밖에 남는 것 ---------- */
// 출발 선물: 진주 누적이 이만큼이면 열린다(작게).
export const GIFTS = [
  { id: "support", need: 20, name: "출발 보조 장비", say: "출발할 때 보조 장비 1개를 골라요" },
  { id: "quickpearl", need: 60, name: "첫 진주 빨리", say: "첫 ? 진주가 빨리 떠요" },
  { id: "weapon", need: 100, name: "출발 무기", say: "출발할 때 무기 1개를 더 골라요" },
  { id: "rescue3", need: 160, name: "든든한 구조", say: "구조 문제를 맞히면 하트 3개로 다시 출발" },
];
export const openGifts = pearls => GIFTS.filter(g => pearls >= g.need).map(g => g.id);
// 한 판에서 얻는 진주: 구해 준 친구 수/25(떼로 나오니 예전 /10 과 비슷한 양) + 맞힌 문제×2 + 성공 보너스(대왕을 씻기면 10, 도망가면 4)
export const RESCUE_PER_PEARL = 25;
export function runPearls({ rescued = 0, solved = 0, result = "tired", gems = 0 } = {}) {
  return Math.floor(Math.max(0, rescued) / RESCUE_PER_PEARL) + Math.max(0, solved) * 2 + (result === "boss" ? 10 : result === "escape" ? 4 : 0) + Math.max(0, gems);
}
export const SAVE_KEY = "dive_save_v1", PILOT_KEY = "dive_pilot_v1", SOUND_KEY = "dive_sound_v1";
export function defaultSave() {
  const dex = {}; for (const k of ENEMY_IDS) dex[k] = 0;
  const best = {}; for (const p of PILOTS) best[p.kid] = { time: 0, solved: 0, runs: 0, wins: 0 };
  return { v: 1, pearls: 0, zones: ["coral"], dex, bossRescued: 0, gifts: [], best, zone: "coral" };
}
const nat = v => { const n = Math.floor(Number(v)); return Number.isFinite(n) && n > 0 ? Math.min(n, 1e7) : 0; };
// 깨진 저장은 기본값으로 고친다(모르는 칸은 버리고, 숫자는 0 이상 정수로).
export function normalizeSave(raw) {
  let o = raw;
  if (typeof o === "string") { try { o = JSON.parse(o); } catch (_) { o = null; } }
  const s = defaultSave();
  if (!o || typeof o !== "object" || Array.isArray(o)) return s;
  s.pearls = nat(o.pearls);
  if (o.dex && typeof o.dex === "object") for (const k of ENEMY_IDS) s.dex[k] = nat(o.dex[k]);
  s.bossRescued = nat(o.bossRescued);
  if (o.best && typeof o.best === "object") for (const p of PILOTS) {
    const b = o.best[p.kid]; if (!b || typeof b !== "object") continue;
    s.best[p.kid] = { time: Math.min(RUN_TIME, nat(b.time)), solved: nat(b.solved), runs: nat(b.runs), wins: nat(b.wins) };
  }
  // 열린 구역·선물은 진주 누적으로 다시 계산한다(저장값과 어긋나도 진주가 기준).
  s.zones = openZones(s.pearls);
  s.gifts = openGifts(s.pearls);
  s.zone = s.zones.includes(o.zone) ? o.zone : "coral";
  return s;
}
// 판이 끝났을 때 저장에 더한다. run: { kid, time, solved, rescued, dex:{kind:n}, result, gems }
export function applyRun(save, run) {
  const s = normalizeSave(save), before = { zones: s.zones.slice(), gifts: s.gifts.slice(), dex: Object.assign({}, s.dex) };
  const got = runPearls(run);
  s.pearls = nat(s.pearls + got);
  if (run.dex) for (const k of ENEMY_IDS) s.dex[k] = nat(s.dex[k] + nat(run.dex[k]));
  if (run.result === "boss") s.bossRescued++;
  const b = s.best[run.kid];
  if (b) { b.time = Math.max(b.time, Math.min(RUN_TIME, nat(run.time))); b.solved = Math.max(b.solved, nat(run.solved)); b.runs++; if (run.result === "boss" || run.result === "escape") b.wins++; }
  s.zones = openZones(s.pearls); s.gifts = openGifts(s.pearls);
  return {
    save: s, pearls: got,
    newZones: s.zones.filter(z => !before.zones.includes(z)),
    newGifts: s.gifts.filter(g => !before.gifts.includes(g)),
    newFriends: ENEMY_IDS.filter(k => !before.dex[k] && s.dex[k]),
  };
}
// 빛 방울: 끌려오는 거리(예전 70), 이만큼 오래된 방울은 저절로 날아온다(바닥에 쌓여 어지럽지 않게)
export const MAGNET_R = 110, ORB_DRIFT = 5;
// 장비 세기(1초 씻김 어림)에 따른 졸개 체력 배수: 기본 장비 1배 → 아주 세면 최대 2배(세기는 수십 배라 여전히 훨씬 빨리 씻긴다)
export const toughness = dps => Math.max(1, Math.min(2.0, Math.pow(Math.max(1, dps) / 6, 0.22)));
