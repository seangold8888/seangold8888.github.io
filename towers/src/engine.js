// Spell Towers — 한 걸음(화면·소리와 무관). main.js 가 그리고, Node 시뮬레이션이 그대로 돌려 본다.
// 게임 시간은 stepWorld 에 넘긴 dt 를 더한 값(w.t)뿐이다. 문제·카드·일시정지·탑 고르기 동안에는 부르지 않는다.
import * as L from "./logic.js?v=1";

const TAU = Math.PI * 2;
const d2 = (ax, ay, bx, by) => (ax - bx) * (ax - bx) + (ay - by) * (ay - by);
const cap = (arr, n) => { if (arr.length > n) arr.splice(0, arr.length - n); };
const emit = (w, type, data) => { if (w.events.length < 160) w.events.push(Object.assign({ type }, data)); };
// 맞는 순간 효과 이벤트(그리기는 main.js 가). R 은 범위 공격의 반지름
const hitFx = (w, kind, x, y, lv, br, R = 0) => { if (w.events.length < 120) w.events.push({ type: "hit", kind, x, y, lv, br, R }); };

export function createWorld({ kid = 1, map = "field", rng = Math.random, badges = [] } = {}) {
  const tune = L.tuning(kid), m = L.mapOf(map), { paths, fly } = L.mapPaths(m);
  const cakeMax = tune.cake + (badges.includes("cake1") ? 1 : 0);
  const w = {
    kid, tune, map: m, paths, fly, rng, badges: badges.slice(), t: 0, nextId: 1,
    pads: m.pads.map(([x, y], i) => ({ i, x, y, tower: null })), towers: [],
    monsters: [], shots: [],
    fx: { homes: [], pops: [], bolts: [], beams: [], rings: [], gusts: [], nums: [], steals: [], sparks: [], storm: null, grow: [] },
    gems: L.START_GEMS + (badges.includes("gems20") ? 20 : 0) + (badges.includes("gems40") ? 40 : 0),
    freeTower: badges.includes("freeTower"),
    cake: cakeMax, cakeMax,
    wave: 1, phase: "prep", prepT: L.PREP_TIME, waveT: 0, queue: [], spawnedAll: false, midOwl: false, owl: null, owlsShown: 0,
    haste: 0,          // 이 파도 번호까지 빠른 주문
    sparkCd: 0,
    sent: 0, dex: {}, solved: 0, firstTries: 0, streak: 0, blasts: 0, blastSent: 0, cards: 0, stolen: 0, rescueUsed: false,
    towersUsed: new Set(), branchesUsed: new Set(),
    pending: null, over: null, events: [],
  };
  spawnOwl(w);
  return w;
}

/* ---------- 탑 ---------- */
export function canBuild(w, padIdx, kind) {
  const p = w.pads[padIdx], T = L.TOWERS[kind];
  return !!(p && T && !p.tower && !w.over && (w.freeTower || w.gems >= T.cost));
}
export const buildCost = (w, kind) => (w.freeTower ? 0 : L.TOWERS[kind].cost);
export function placeTower(w, padIdx, kind, lv = 1) {
  const p = w.pads[padIdx];
  const t = { id: w.nextId++, pad: padIdx, kind, lv, branch: null, x: p.x, y: p.y, cd: 0.3, fcd: 1.5, flash: 0, aim: Math.PI, grow: 0 };
  p.tower = t; w.towers.push(t); w.towersUsed.add(kind);
  return t;
}
export function build(w, padIdx, kind) {
  if (!canBuild(w, padIdx, kind)) return null;
  if (w.freeTower) w.freeTower = false; else w.gems -= L.TOWERS[kind].cost;
  const t = placeTower(w, padIdx, kind);
  t.grow = 0.6;
  emit(w, "build", { kind, pad: padIdx });
  return t;
}
export function upgradeCost(w, padIdx) { const t = w.pads[padIdx] && w.pads[padIdx].tower; return t && t.lv < L.GEM_MAX_LV ? L.TOWERS[t.kind].up : null; }
export function upgradeWithGems(w, padIdx) {
  const t = w.pads[padIdx] && w.pads[padIdx].tower, c = upgradeCost(w, padIdx);
  if (!t || c == null || w.gems < c) return false;
  w.gems -= c; setLevel(w, t, t.lv + 1, null);
  emit(w, "upgrade", { kind: t.kind, lv: t.lv, pad: t.pad });
  return true;
}
function setLevel(w, t, lv, branch) {
  t.lv = L.clampLv(lv);
  if (t.lv >= 3 && !t.branch) t.branch = branch === "b" ? "b" : "a";
  if (t.branch) w.branchesUsed.add(t.kind + ":" + t.branch);
  t.flash = 1.2; t.grow = 1;
  w.fx.grow.push({ x: t.x, y: t.y, t: 0, lv: t.lv });
  cap(w.fx.grow, 8);
}
export function towerOf(w, padIdx) { return w.pads[padIdx] ? w.pads[padIdx].tower : null; }
// 빈 자리 중 그 탑에 가장 좋은 자리(길이 많이 닿는 곳)
export function bestPad(w, kind) {
  const s = L.towerStats(kind, 1); let best = -1, bv = -1;
  for (const p of w.pads) {
    if (p.tower) continue;
    const c = L.padCoverage(w.map, p.i, s.range), v = c.ground + (s.air ? c.air * 0.5 : 0);
    if (v > bv) { bv = v; best = p.i; }
  }
  return best;
}
// 탑 고르기 화면에서 반짝일 추천 한 개(살 수 있는 것 중)
export function recommendKind(w, padIdx) {
  const owned = new Set(w.towers.map(t => t.kind));
  const airSoon = w.wave >= 3, needAir = airSoon && !w.towers.some(t => L.TOWERS[t.kind].air);
  let best = null, bv = -1;
  for (const kind of L.TOWER_IDS) {
    if (!canBuild(w, padIdx, kind)) continue;
    const s = L.towerStats(kind, 1), c = L.padCoverage(w.map, padIdx, s.range);
    let v = L.towerDps(kind, 1) * (c.ground + (s.air ? c.air * 0.6 : 0)) / Math.max(30, buildCost(w, kind));
    if (!owned.has(kind)) v *= 1.35;
    if (needAir && s.air) v *= 1.6;
    if (v > bv) { bv = v; best = kind; }
  }
  return best;
}

/* ---------- 카드 ---------- */
export function cardState(w) {
  return { towers: w.towers.map(t => ({ pad: t.pad, kind: t.kind, lv: t.lv, branch: t.branch })), freePads: w.pads.filter(p => !p.tower).length, cake: w.cake, cakeMax: w.cakeMax };
}
export function drawCardsFor(w, { firstTry = true, noQuiz = false, rng = w.rng } = {}) {
  const taeo = w.tune.cards === 2, count = firstTry && !noQuiz ? w.tune.cards : 2;
  const rare = firstTry && !noQuiz && w.streak > 0 && w.streak % 3 === 0;
  return { cards: L.drawCards(cardState(w), { count, low: !firstTry || noQuiz, rare, recommend: taeo, rng }), rare };
}
// 카드를 적용한다. branch 는 3단계로 넘어가는 강화일 때 'a' | 'b'. 돌려주는 값 { text, pad }
export function applyCard(w, c, branch = null) {
  w.cards++;
  let pad = -1;
  if (c.type === "up" || c.type === "legend") {
    const t = towerOf(w, c.pad) && towerOf(w, c.pad).kind === c.kind ? towerOf(w, c.pad) : w.towers.find(x => x.kind === c.kind && x.lv < L.MAX_LV);
    if (t) { setLevel(w, t, Math.min(L.MAX_LV, t.lv + (c.type === "legend" ? 2 : 1)), branch); pad = t.pad; }
  } else if (c.type === "new") {
    const i = bestPad(w, c.kind);
    if (i >= 0) { const t = placeTower(w, i, c.kind); t.flash = 1.2; t.grow = 1; w.fx.grow.push({ x: t.x, y: t.y, t: 0, lv: 1 }); pad = i; }
  } else if (c.type === "spell") {
    w.haste = w.phase === "wave" ? w.wave + 1 : w.wave;
  } else if (c.type === "cake") {
    w.cake += L.CAKE_CARD; num(w, w.map.castle.x, w.map.castle.y - 40, "+" + L.CAKE_CARD, "cake");
  }
  emit(w, "card", { card: c, pad });
  return { text: L.gainText(c, branch), pad };
}
export const hasteOn = w => w.haste > 0 && w.haste >= w.wave;

/* ---------- 괴물 ---------- */
export function spawnMonster(w, kind, pathIdx = null) {
  const M = L.MONSTERS[kind]; if (!M) return null;
  let n = 0; for (const e of w.monsters) if (e.kind !== "boss") n++;
  if (n >= L.MAX_MONSTERS && kind !== "boss") return null;   // 상한(성능): 넘치면 잠깐 미룬다
  const path = M.fly ? w.fly : w.paths[pathIdx] || w.paths[Math.floor(w.rng() * w.paths.length)];
  const hp = L.monsterHp(kind, w.wave, w.tune, w.map.hp * (w.map.bal || 1));
  const e = { id: w.nextId++, kind, path, s: 0, x: 0, y: 0, face: 1, hp, max: hp, sp: L.monsterSpeed(kind, w.wave, w.tune), r: M.r,
    slowT: 0, slowK: 1, freezeT: 0, fl: -1, t: w.rng() * 6, hideT: kind === "ghost" ? 2 + w.rng() * 2 : 0, hidden: false, revealT: 0 };
  posOf(e);
  w.monsters.push(e);
  w.dexSeen = w.dexSeen || {}; if (!w.dexSeen[kind]) { w.dexSeen[kind] = true; emit(w, "meet", { kind }); }
  return e;
}
const PT = {};
function posOf(e) { L.pathPoint(e.path, e.s, PT); e.x = PT.x; e.y = PT.y; if (Math.abs(PT.dx) > 0.2) e.face = PT.dx < 0 ? -1 : 1; }
export const progress = e => e.s / e.path.len;
const targetable = (e, air) => e.hp > 0 && !e.gone && (air || !L.MONSTERS[e.kind].fly) && !(e.hidden && e.revealT <= 0);

export function damage(w, e, amount) {
  if (e.hp <= 0 || e.gone) return;
  e.hp -= amount; if (e.fl <= -0.12) e.fl = 0.08;
  if (e.hp > 0) return;
  sendHome(w, e);
}
// 다 맞으면 비눗방울에 싸여 둥실 떠서 집으로 돌아간다(쓰러지는 연출 없음).
function sendHome(w, e, via = null) {
  if (e.gone) return;
  e.gone = true; e.hp = 0; w.sent++; w.dex[e.kind] = (w.dex[e.kind] || 0) + 1;
  const g = L.MONSTERS[e.kind].gem; w.gems += g;
  if (w.fx.homes.length >= 60) w.fx.homes.shift();
  w.fx.homes.push({ kind: e.kind, x: e.x, y: e.y, t: 0, face: e.face, vx: (w.rng() - 0.5) * 40, delay: via === "storm" ? w.rng() * 0.35 : 0 });
  if (via !== "storm") num(w, e.x, e.y - 20, "+" + g, "gem", true);
  emit(w, "home", { kind: e.kind, x: e.x, y: e.y, via });
}
function num(w, x, y, text, icon, small = false) { if (w.fx.nums.length >= 30) w.fx.nums.shift(); w.fx.nums.push({ x, y, text, icon, t: 0, small }); }
function reachCastle(w, e) {
  e.gone = true;
  const c = L.MONSTERS[e.kind].cake;
  w.cake = Math.max(0, w.cake - c); w.stolen += c;
  if (w.fx.steals.length >= 12) w.fx.steals.shift();
  w.fx.steals.push({ kind: e.kind, x: e.x, y: e.y, t: 0, n: c });
  emit(w, "steal", { kind: e.kind, n: c });
  if (w.cake <= 0) {
    if (!w.rescueUsed) { w.pending = "rescue"; emit(w, "nocake"); }
    else finish(w, "lose");
  }
}

/* ---------- 탑의 공격 ---------- */
function firstTarget(w, t, s, skip) {
  let best = null, bp = -1; const r2 = s.range * s.range;
  for (const e of w.monsters) {
    if (!targetable(e, s.air) || (skip && skip.includes(e))) continue;
    if (d2(e.x, e.y, t.x, t.y) > r2) continue;
    const p = progress(e); if (p > bp) { bp = p; best = e; }
  }
  return best;
}
function fireTower(w, t, s) {
  const e = firstTarget(w, t, s); if (!e) return false;
  t.aim = Math.atan2(e.y - t.y, e.x - t.x);
  if (w.shots.length < L.MAX_SHOTS) w.shots.push({ x: t.x, y: t.y - s.w * 0.55, target: e, tx: e.x, ty: e.y, sp: 460, dmg: s.dmg, splash: s.splash || 0, size: s.size, lv: s.lv, br: s.branch });
  emit(w, "shot", { kind: "fire" });
  return true;
}
function iceTower(w, t, s) {
  let any = false; const r2 = s.range * s.range;
  for (const e of w.monsters) if (targetable(e, false) && d2(e.x, e.y, t.x, t.y) <= r2) { any = true; break; }
  if (!any) return false;
  const freeze = s.freezeEvery && t.fcd <= 0;
  if (freeze) t.fcd = s.freezeEvery;
  for (const e of w.monsters) {
    if (!targetable(e, false) || d2(e.x, e.y, t.x, t.y) > r2) continue;
    e.slowK = Math.min(e.slowT > 0 ? e.slowK : 1, s.slow); e.slowT = Math.max(e.slowT, s.slowT);
    if (freeze) e.freezeT = Math.max(e.freezeT, s.freezeT * (e.kind === "boss" ? 0.4 : e.kind === "troll" ? 0.7 : 1));
    damage(w, e, s.dmg);
  }
  if (w.fx.rings.length < 24) w.fx.rings.push({ x: t.x, y: t.y, t: 0, T: 0.5, R: s.range, color: freeze ? "#ffffff" : s.color, k: "ice", lv: s.lv });
  hitFx(w, "ice", t.x, t.y, s.lv, s.branch, s.range);
  emit(w, "shot", { kind: "ice" });
  return true;
}
function boltTower(w, t, s) {
  const first = firstTarget(w, t, s); if (!first) return false;
  const hit = [first]; let from = first;
  while (hit.length < s.chain) {
    let best = null, bd = 115 * 115;
    for (const e of w.monsters) { if (!targetable(e, true) || hit.includes(e)) continue; const d = d2(e.x, e.y, from.x, from.y); if (d < bd) { bd = d; best = e; } }
    if (!best) break; hit.push(best); from = best;
  }
  const pts = [[t.x, t.y - s.w * 0.7]];
  for (const e of hit) { pts.push([e.x, e.y]); hitFx(w, "bolt", e.x, e.y, s.lv, s.branch); damage(w, e, s.dmg); }
  if (w.fx.bolts.length >= 14) w.fx.bolts.shift();
  w.fx.bolts.push({ pts, t: 0.25, lv: s.lv, size: s.size, seed: w.rng() * 100 });
  emit(w, "shot", { kind: "bolt" });
  return true;
}
function windTower(w, t, s) {
  const hit = [];
  while (hit.length < s.n) { const e = firstTarget(w, t, s, hit); if (!e) break; hit.push(e); }
  if (!hit.length) return false;
  for (const e of hit) {
    const resist = e.kind === "boss" ? 0.2 : e.kind === "troll" ? 0.5 : 1;
    if (w.fx.gusts.length < 20) w.fx.gusts.push({ x0: t.x, y0: t.y - 20, x1: e.x, y1: e.y, t: 0, size: s.size, lv: s.lv });
    hitFx(w, "wind", e.x, e.y, s.lv, s.branch);
    e.s = Math.max(0, e.s - s.push * resist); posOf(e);
    damage(w, e, s.dmg);
  }
  emit(w, "shot", { kind: "wind" });
  return true;
}
function lightTower(w, t, s) {
  const e = firstTarget(w, t, s); if (!e) return false;
  const base = Math.atan2(e.y - t.y, e.x - t.x); t.aim = base;
  const ox = t.x, oy = t.y - s.w * 0.6;
  const angles = s.beams === 3 ? [base - 0.3, base, base + 0.3] : [base];
  const hitIds = new Set();
  for (const a of angles) {
    const x1 = ox + Math.cos(a) * s.range, y1 = oy + Math.sin(a) * s.range;
    for (const m of w.monsters) {
      if (m.hp <= 0 || m.gone || hitIds.has(m.id)) continue;      // 빛은 숨은 유령도 맞힌다(관통)
      if (L.distToSeg(m.x, m.y, ox, oy, x1, y1) <= s.size * 0.5 + m.r) { hitIds.add(m.id); m.revealT = Math.max(m.revealT, 1); hitFx(w, "light", m.x, m.y, s.lv, s.branch); damage(w, m, s.dmg); }
    }
    if (w.fx.beams.length < 18) w.fx.beams.push({ x0: ox, y0: oy, x1, y1, t: 0, T: 0.32, size: s.size, lv: s.lv });
  }
  emit(w, "shot", { kind: "light" });
  return true;
}
function towersStep(w, dt) {
  const buff = hasteOn(w) ? L.HASTE : 1;
  for (const t of w.towers) {
    if (t.flash > 0) t.flash -= dt; if (t.grow > 0) t.grow -= dt * 1.6;
    const s = L.towerStats(t.kind, t.lv, t.branch, buff);
    if (s.freezeEvery && t.fcd > 0) t.fcd -= dt;
    if (t.kind === "light") {
      // 빛 탑 근처의 유령은 드러난다
      const r2 = s.reveal * s.reveal;
      for (const e of w.monsters) if (e.hidden && d2(e.x, e.y, t.x, t.y) <= r2) e.revealT = Math.max(e.revealT, 0.3);
    }
    t.cd -= dt; if (t.cd > 0) continue;
    let fired = false;
    if (t.kind === "fire") fired = fireTower(w, t, s);
    else if (t.kind === "ice") fired = iceTower(w, t, s);
    else if (t.kind === "bolt") fired = boltTower(w, t, s);
    else if (t.kind === "wind") fired = windTower(w, t, s);
    else if (t.kind === "light") fired = lightTower(w, t, s);
    t.cd = fired ? s.every : 0.1;
  }
}

/* ---------- ? 부엉이 ---------- */
function spawnOwl(w) {
  const dir = w.owlsShown % 2 ? -1 : 1;
  w.owl = { x: dir > 0 ? -50 : L.MAP_W + 50, y: L.OWL_Y + (w.rng() - 0.5) * 20, dir, t: 0, life: L.OWL_LIFE };
  w.owlsShown++;
  emit(w, "owl");
}
export function owlPos(o) {
  const k = o.t / o.life, span = L.MAP_W + 100;
  return { x: o.dir > 0 ? -50 + span * k : L.MAP_W + 50 - span * k, y: o.y + Math.sin(o.t * 2.2) * 10 };
}
export function tapOwl(w, x, y) {
  if (!w.owl || w.pending || w.over) return false;
  const p = owlPos(w.owl);
  if (x != null && d2(x, y, p.x, p.y) > L.OWL_HIT_R * L.OWL_HIT_R) return false;
  w.owl = null; w.pending = "quiz";
  emit(w, "owl-tap");
  return true;
}

/* ---------- 반짝 가루(괴물 탭) ---------- */
export function sparkle(w, x, y) {
  if (w.over || w.pending || w.sparkCd > 0) return null;
  w.sparkCd = L.SPARKLE_CD;
  let best = null, bd = L.SPARKLE_R * L.SPARKLE_R;
  for (const e of w.monsters) { if (e.gone) continue; const rr = L.SPARKLE_R + e.r * 0.5, d = d2(e.x, e.y, x, y); if (d < rr * rr && d < bd + e.r * e.r) { bd = d; best = e; } }
  if (w.fx.sparks.length >= 16) w.fx.sparks.shift();
  w.fx.sparks.push({ x, y, t: 0, hit: !!best });
  if (best) {
    if (best.kind === "ghost") best.revealT = L.REVEAL_T;
    damage(w, best, L.SPARKLE_DMG);
    emit(w, "sparkle", { hit: true });
  }
  return best;
}

/* ---------- 파도 ---------- */
export function startWaveNow(w) { if (w.phase === "prep" && !w.over) w.prepT = 0; }
function beginWave(w) {
  w.phase = "wave"; w.waveT = 0; w.queue = L.waveList(w.wave, w.tune, w.rng, w.map.span || 1); w.spawnedAll = false; w.midOwl = false;
  emit(w, "wave", { n: w.wave, boss: L.isBossWave(w.wave) });
}
function endWave(w) {
  w.gems += L.WAVE_GEMS;
  num(w, w.map.castle.x, w.map.castle.y - 60, "+" + L.WAVE_GEMS, "gem");
  emit(w, "wave-clear", { n: w.wave });
  if (w.wave >= L.WAVES) { finish(w, "win"); return; }
  w.wave++; w.phase = "prep"; w.prepT = L.PREP_TIME;
  if (!w.owl) spawnOwl(w);
}
function finish(w, result) {
  if (w.over) return;
  w.over = { result, wave: w.wave };
  w.pending = null;
  emit(w, "over", { result });
}

/* ---------- 한 걸음 ---------- */
export function stepWorld(w, dt) {
  if (w.over || w.pending) return;
  w.t += dt;
  if (w.sparkCd > 0) w.sparkCd -= dt;
  // 부엉이
  if (w.owl) { w.owl.t += dt; if (w.owl.t >= w.owl.life) w.owl = null; }
  if (w.phase === "prep") {
    w.prepT -= dt;
    if (w.prepT <= 0) beginWave(w);
  } else {
    w.waveT += dt;
    while (w.queue.length && w.queue[0].at <= w.waveT) {
      const q = w.queue[0];
      if (!spawnMonster(w, q.kind)) { q.at = w.waveT + 0.5; w.queue.sort((a, b) => a.at - b.at); break; }
      w.queue.shift();
    }
    // 파도 중반에 부엉이 한 번
    if (!w.midOwl && w.waveT >= L.waveSpan(w.wave) * (w.map.span || 1) * 0.45) { w.midOwl = true; if (!w.owl) spawnOwl(w); }
  }
  // 괴물 움직임
  for (const e of w.monsters) {
    if (e.gone) continue;
    e.t += dt; if (e.fl > -1) e.fl -= dt; if (e.revealT > 0) e.revealT -= dt;
    if (e.kind === "ghost") {
      e.hideT -= dt;
      if (e.hideT <= 0) { e.hidden = !e.hidden; e.hideT = e.hidden ? 2.6 : 2.4; }
    }
    if (e.freezeT > 0) { e.freezeT -= dt; continue; }
    let sp = e.sp;
    if (e.slowT > 0) { e.slowT -= dt; sp *= e.slowK; } else e.slowK = 1;
    e.s += sp * dt; posOf(e);
    if (e.s >= e.path.len) reachCastle(w, e);
    if (w.pending || w.over) break;
  }
  if (!w.pending && !w.over) towersStep(w, dt);
  // 불꽃 구슬
  for (const s of w.shots) {
    if (s.dead) continue;
    if (s.target && !s.target.gone) { s.tx = s.target.x; s.ty = s.target.y; }
    const dx = s.tx - s.x, dy = s.ty - s.y, d = Math.hypot(dx, dy) || 1, step = s.sp * dt;
    if (d <= step + 6) {
      s.dead = true;
      hitFx(w, "fire", s.tx, s.ty, s.lv, s.br, s.splash || 0);
      if (s.target && !s.target.gone) damage(w, s.target, s.dmg);
      if (s.splash) {
        for (const e of w.monsters) if (e !== s.target && targetable(e, false) && d2(e.x, e.y, s.tx, s.ty) <= s.splash * s.splash) damage(w, e, s.dmg * 0.6);
        if (w.fx.rings.length < 24) w.fx.rings.push({ x: s.tx, y: s.ty, t: 0, T: 0.4, R: s.splash, color: "#ffb04a", k: "boom", lv: s.lv });
      } else if (w.fx.pops.length < 40) w.fx.pops.push({ x: s.tx, y: s.ty, t: 0, lv: s.lv });
    } else { s.x += dx / d * step; s.y += dy / d * step; }
  }
  w.shots = w.shots.filter(s => !s.dead);
  w.monsters = w.monsters.filter(e => !e.gone);
  stepFx(w, dt);
  if (w.pending || w.over) return;
  // 다 나온 뒤 길이 비면 파도 끝. 마지막 파도가 아니면 WAVE_TAIL 초 뒤엔 남은 괴물이 걸어가는 중에도 다음 준비로(한 판 5분 안)
  if (w.phase === "wave" && !w.queue.length && (!w.monsters.length || (w.wave < L.WAVES && w.waveT >= L.waveSpan(w.wave) * (w.map.span || 1) + L.WAVE_TAIL))) endWave(w);
}

// 꾸밈만 진행. 문제·카드 화면이 떠 있는 동안에도 main 이 불러 방울·숫자가 움직이게 한다.
export function stepFx(w, dt) {
  const fx = w.fx;
  for (const f of fx.homes) f.t += dt; fx.homes = fx.homes.filter(f => f.t < 1.8 + f.delay);
  for (const q of fx.pops) q.t += dt; fx.pops = fx.pops.filter(q => q.t < 0.3);
  for (const b of fx.bolts) b.t -= dt; fx.bolts = fx.bolts.filter(b => b.t > 0);
  for (const b of fx.beams) b.t += dt; fx.beams = fx.beams.filter(b => b.t < b.T);
  for (const r of fx.rings) r.t += dt; fx.rings = fx.rings.filter(r => r.t < r.T);
  for (const g of fx.gusts) g.t += dt; fx.gusts = fx.gusts.filter(g => g.t < 0.4);
  for (const n of fx.nums) n.t += dt; fx.nums = fx.nums.filter(n => n.t < (n.small ? 0.8 : 1.6));
  for (const s of fx.steals) s.t += dt; fx.steals = fx.steals.filter(s => s.t < 1.4);
  for (const s of fx.sparks) s.t += dt; fx.sparks = fx.sparks.filter(s => s.t < 0.5);
  for (const g of fx.grow) g.t += dt; fx.grow = fx.grow.filter(g => g.t < 1.2);
  if (fx.storm) { fx.storm.t += dt; if (fx.storm.t > fx.storm.T) fx.storm = null; }
}

/* ---------- 문제를 맞힌 그 순간의 보상 ----------
   한 번에 맞히면 대마법: 길 위 괴물 전부 방울에 태워 돌려보냄(대장은 체력의 20%), 케이크가 깎였으면 +1, 수정 +30.
   고쳐 맞히면 작은 마법: 성문에 가까운 쪽부터 길 위 괴물 절반(최소 6마리, 대장은 8%), 수정 +20. */
export function quizBlast(w, firstTry) {
  let n = 0, cake = 0;
  const alive = w.monsters.filter(e => !e.gone);
  const list = firstTry ? alive : alive.sort((a, b) => progress(b) - progress(a)).slice(0, L.smallCount(alive.length));
  for (const e of list) {
    if (e.kind === "boss") { damage(w, e, e.max * (firstTry ? L.BOSS_BLAST : L.BOSS_SMALL)); if (e.gone) n++; }
    else { sendHome(w, e, "storm"); n++; }
  }
  w.monsters = w.monsters.filter(e => !e.gone);
  w.shots = w.shots.filter(s => s.target && !s.target.gone);
  const gems = firstTry ? L.BLAST_GEMS : L.SMALL_GEMS;
  w.gems += gems;
  if (firstTry && w.cake < w.cakeMax) { w.cake++; cake = 1; }
  const c = w.map.castle;
  num(w, c.x - 30, c.y - 70, "+" + gems, "gem");
  if (cake) num(w, c.x + 20, c.y - 100, "+1", "cake");
  w.fx.storm = { t: 0, T: firstTry ? 2.2 : 1.0, big: firstTry, x: c.x, y: c.y };
  w.blasts++; w.blastSent += n;
  emit(w, "blast", { n, firstTry, cake, gems });
  return { n, cake, gems };
}
export function recordQuiz(w, firstTry) {
  w.solved++;
  if (firstTry) { w.firstTries++; w.streak++; } else w.streak = 0;
}
// 케이크 0 → 구조 문제를 맞혔다: 케이크 5조각 + 화면 괴물 전부 방울(대장은 30% + 뒤로)
export function rescue(w) {
  w.rescueUsed = true; w.cake = L.RESCUE_CAKE;
  for (const e of w.monsters) {
    if (e.gone) continue;
    if (e.kind === "boss") { damage(w, e, e.max * 0.3); if (!e.gone) { e.s = Math.max(0, e.s - e.path.len * 0.4); posOf(e); } }
    else sendHome(w, e, "storm");
  }
  w.monsters = w.monsters.filter(e => !e.gone);
  w.fx.storm = { t: 0, T: 1.6, big: true, x: w.map.castle.x, y: w.map.castle.y };
  num(w, w.map.castle.x, w.map.castle.y - 90, "+" + L.RESCUE_CAKE, "cake");
  resumeAfter(w);
}
export function resumeAfter(w) { if (w.pending) w.pending = null; }
export function giveUp(w) { finish(w, "lose"); }

// 판이 끝났을 때 저장에 넘길 기록
export function runRecord(w) {
  const pilot = L.PILOTS[w.kid] || L.PILOTS[1];
  return { kid: pilot.kid, map: w.map.id, result: w.over ? w.over.result : "quit", wave: w.over && w.over.result === "win" ? L.WAVES : Math.max(0, w.wave - 1),
    cake: w.cake, cakeMax: w.cakeMax, solved: w.solved, firstTries: w.firstTries, blasts: w.blasts, blastSent: w.blastSent, cards: w.cards,
    sent: w.sent, stolen: w.stolen, dex: Object.assign({}, w.dex), towersUsed: [...w.towersUsed], branchesUsed: [...w.branchesUsed] };
}
