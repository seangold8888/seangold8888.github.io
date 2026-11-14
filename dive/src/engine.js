// 딥 다이브 — 바다 속 한 걸음(화면·소리와 무관). main.js 가 그리고, Node 시뮬레이션이 그대로 돌려 본다.
// 게임 시간은 stepWorld 에 넘긴 dt 를 더한 값(w.t)뿐이다. 문제·카드·일시정지 동안에는 부르지 않는다.
// 소리·흔들림·글자는 여기서 정하지 않고 w.events 로 알린다(main 이 받아서 꾸민다).
import * as L from "./logic.js?v=3";

const TAU = Math.PI * 2;
const d2 = (ax, ay, bx, by) => (ax - bx) * (ax - bx) + (ay - by) * (ay - by);
const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
const cap = (arr, n) => { if (arr.length > n) arr.splice(0, arr.length - n); };
const REGULAR = new Set(["inkfish", "crab", "jelly", "puffer", "eel"]);

export function createWorld({ kid = 1, zone = "coral", rng = Math.random, view = { w: 720, h: 540 }, load = null, gifts = [] } = {}) {
  const tune = L.tuning(kid), z = L.zoneOf(zone), ld = load || L.newLoadout();
  const m = L.mods(ld.supports);
  const w = {
    kid, tune, zone: z, rng, view, gifts: gifts.slice(), t: 0, nextId: 1,
    p: { x: L.WORLD.w / 2, y: L.WORLD.h / 2, vx: 0, vy: 0, r: 18, inv: 0, face: -Math.PI / 2, moving: false, dashT: 0, dvx: 0, dvy: 0, grace: 0 },
    load: ld, m, hearts: tune.hearts + m.hearts, maxHearts: tune.hearts + m.hearts,
    enemies: [], shots: [], orbs: [], qpearls: [], inks: [], shells: [], warns: [], bursts: [],
    fx: { freed: [], pops: [], zaps: [], pulses: [], rings: [] },
    cd: { bubble: 0.15, zap: 0.8, shell: 0.6, light: 1.2, star: 0.9 }, whirlAng: 0,
    xp: 0, pearlN: 0, spawnAcc: 0, eelT: L.ENEMIES.eel.from, boss: null, bossSpawned: false,
    rescued: 0, dex: {}, solved: 0, firstTries: 0, streak: 0, gems: 0, rescueUsed: false, hurts: 0, blasts: 0, blastWashed: 0, quizGear: 0,
    // 슈웅!
    dashCd: 0, dashId: 0, dashes: 0, autoDashT: 0, autoDashes: 0, dashWashed: 0,
    // 콤보 → 무지개 터보
    combo: 0, comboT: 0, bestCombo: 0, gauge: 0, fever: 0, fevers: 0, chained: 0, chainBudget: 0,
    // 이벤트
    evIdx: 0, eventsSeen: [], current: null, whale: null, kingsWashed: 0, clamsOpened: 0, goldCaught: 0,
    firstPearlT: null, vis: 0, washRate: 0, rescuedSeen: 0, multiQ: [], multiTier: -1, multis: [0, 0, 0], orbChain: 0, orbT: 0,
    pending: null, over: null, events: [],
  };
  openingCrowd(w);
  return w;
}
const emit = (w, type, data) => { if (w.events.length < 160) w.events.push(Object.assign({ type }, data)); };
export const xpGoal = w => L.xpNeedFor(w.pearlN, w.gifts.includes("quickpearl"));
export const dashReady = w => w.dashCd <= 0 && w.p.dashT <= 0;
// 지금 무기에 쓰는 보조 효과(무지개 터보면 더 자주·크게)
const curMods = w => (w.fever > 0 ? L.feverMods(w.m) : w.m);

// 장비가 바뀌면 보조 효과·하트 최대치를 다시 계산한다.
export function setLoadout(w, load, card) {
  const before = w.maxHearts;
  w.load = load; w.m = L.mods(load.supports);
  w.toughK = L.toughness(L.loadoutDps(load));
  w.maxHearts = w.tune.hearts + w.m.hearts;
  if (w.maxHearts > before) w.hearts += w.maxHearts - before;
  if (card && card.kind === "support" && card.id === "heart") w.hearts = Math.min(w.maxHearts, w.hearts + 1);
  if (card && card.kind === "heal") w.hearts = Math.min(w.maxHearts, w.hearts + 1);
  if (card && card.kind === "gem") w.gems++;
  w.hearts = Math.min(w.hearts, w.maxHearts);
}

/* ---------- 친구 나오기 ---------- */
// 화면 바로 바깥(가장자리 둘레 + extra)의 한 점. 둥근 원보다 화면에 빨리 들어온다.
function spawnPoint(w, extra = 30) {
  const { p, view } = w, hw = view.w / 2 + extra, hh = view.h / 2 + extra;
  // 바다 밖으로 나가는 방향은 다시 뽑는다(벽에 붙은 잠수정 바로 옆 벽에서 떼가 솟지 않게)
  for (let i = 0; i < 10; i++) {
    const u = w.rng() * 2 * (hw + hh); let ox, oy;
    if (u < hw * 2) { ox = u - hw; oy = w.rng() < 0.5 ? -hh : hh; } else { oy = u - hw * 2 - hh; ox = w.rng() < 0.5 ? -hw : hw; }
    const rx = p.x + ox, ry = p.y + oy;
    const x = clamp(rx, 20, L.WORLD.w - 20), y = clamp(ry, 20, L.WORLD.h - 20);
    if (i < 9 && (Math.abs(x - rx) > 30 || Math.abs(y - ry) > 30)) continue;
    if (Math.abs(x - p.x) > view.w / 2 + 10 || Math.abs(y - p.y) > view.h / 2 + 10 || i === 9) return { x, y };
  }
  return { x: 20, y: 20 };
}
export function spawnEnemy(w, kind, at, opts = {}) {
  const E = L.ENEMIES[kind]; if (!E) return null;
  // 너무 많으면 가장 먼 친구가 먼저 떠난다(성능). 대왕·왕 친구·이벤트 친구는 남긴다.
  let n = 0; for (const e of w.enemies) if (e.kind !== "boss") n++;
  if (n >= L.MAX_ENEMIES) {
    let far = -1, fd = -1;
    w.enemies.forEach((e, i) => { if (e.kind === "boss" || L.ENEMIES[e.kind].special) return; const d = d2(e.x, e.y, w.p.x, w.p.y); if (d > fd) { fd = d; far = i; } });
    if (far >= 0) w.enemies.splice(far, 1);
  }
  const pt = at || spawnPoint(w);
  const elite = !!opts.elite, small = !!opts.small && !elite;
  let hp = kind === "boss" ? L.bossHp(w.zone, w.tune) : L.enemyHp(kind, w.t, w.tune);
  // 장비가 세질수록 졸개도 조금 단단해진다(세진 만큼보다 훨씬 덜 — 여전히 줄줄이 씻기되 화면이 금방 비지 않게)
  if (REGULAR.has(kind)) hp *= w.toughK || 1;
  if (elite) hp = Math.round(hp * L.ELITE.hp);
  if (small) hp = Math.max(1, Math.round(hp * L.FRY.hp * 10) / 10);
  const e = { id: w.nextId++, kind, x: pt.x, y: pt.y, r: E.r * (elite ? L.ELITE.r : small ? L.FRY.r : 1), hp, max: hp, sp: L.enemySpeed(kind, w.t, w.tune) * (elite ? L.ELITE.speed : small ? 1.1 : 1), t: w.rng() * 6, vx: 0, vy: 0, kx: 0, ky: 0, fl: -1, cw: 0, cs: 0, puff: 0, pcd: 0, shot: 2.5, face: 0, elite, small, dh: 0, life: 0 };
  w.enemies.push(e);
  return e;
}
// 판 시작: 화면 가장자리에서 친구 떼가 이미 몰려오고 있다(첫 1초부터 씻길 게 있게)
function openingCrowd(w) {
  const n = 14, R = Math.min(w.view.w, w.view.h) / 2 + 10;
  for (let i = 0; i < n; i++) {
    const a = i * TAU / n + w.rng() * 0.2, rr = R + (i % 2) * 40;
    spawnEnemy(w, "inkfish", { x: clamp(w.p.x + Math.cos(a) * rr, 20, L.WORLD.w - 20), y: clamp(w.p.y + Math.sin(a) * rr * 0.85, 20, L.WORLD.h - 20) });
  }
}
function spawnPack(w, n) {
  const c = spawnPoint(w), kind = L.pickKind(w.t, w.zone, w.rng);
  for (let i = 0; i < n; i++) {
    const k = i === 0 ? kind : (w.rng() < 0.7 ? kind : L.pickKind(w.t, w.zone, w.rng));
    const elite = w.rng() < L.eliteChance(w.t);
    spawnEnemy(w, k, { x: clamp(c.x + (w.rng() - 0.5) * 70, 20, L.WORLD.w - 20), y: clamp(c.y + (w.rng() - 0.5) * 70, 20, L.WORLD.h - 20) }, { elite });
  }
  // 꼬마 물고기 떼가 함께 온다
  if (w.t >= L.FRY.from) {
    const m = Math.round(n * L.FRY.per);
    for (let i = 0; i < m; i++) spawnEnemy(w, "inkfish", { x: clamp(c.x + (w.rng() - 0.5) * 110, 20, L.WORLD.w - 20), y: clamp(c.y + (w.rng() - 0.5) * 110, 20, L.WORLD.h - 20) }, { small: true });
  }
}
function spawnEel(w) {
  // 화면을 가로지르는 줄: 잠수정 근처를 지나간다. 경고 1초 뒤 출발.
  const { p, view } = w, a = w.rng() * TAU, ux = Math.cos(a), uy = Math.sin(a), off = (w.rng() - 0.5) * 120;
  const R = Math.hypot(view.w, view.h) / 2 + 60, cx = p.x - uy * off, cy = p.y + ux * off;
  w.warns.push({ x1: cx - ux * R, y1: cy - uy * R, x2: cx + ux * R, y2: cy + uy * R, ux, uy, t: 1.1, T: 1.1 });
  emit(w, "warn");
}

/* ---------- 이벤트 ---------- */
function startEvent(w, ev) {
  const p = w.p, tune = w.tune;
  w.eventsSeen.push(ev.id);
  emit(w, "event", { id: ev.id, name: L.EVENTS[ev.id].name, sub: L.EVENTS[ev.id].sub });
  if (ev.id === "ring") {
    // 먹물 떼가 빙 둘러싸고 조여 온다
    const n = Math.round((20 + Math.floor(w.t / 25) * 2) * (tune.speed < 0.8 ? 0.75 : 1)), R = Math.min(w.view.w, w.view.h) / 2 + 30;
    for (let i = 0; i < n; i++) {
      const a = i * TAU / n;
      spawnEnemy(w, w.t > 100 && i % 3 === 0 ? "crab" : "inkfish", { x: clamp(p.x + Math.cos(a) * R * 1.25, 20, L.WORLD.w - 20), y: clamp(p.y + Math.sin(a) * R, 20, L.WORLD.h - 20) });
    }
  } else if (ev.id === "gold") {
    const a = w.rng() * TAU, e = spawnEnemy(w, "gold", { x: clamp(p.x + Math.cos(a) * 240, 60, L.WORLD.w - 60), y: clamp(p.y + Math.sin(a) * 200, 60, L.WORLD.h - 60) });
    if (e) e.life = 14;
  } else if (ev.id === "clam") {
    const a = w.rng() * TAU, e = spawnEnemy(w, "clam", { x: clamp(p.x + Math.cos(a) * 200, 80, L.WORLD.w - 80), y: clamp(p.y + Math.sin(a) * 170, 80, L.WORLD.h - 80) });
    if (e) e.life = 22;
  } else if (ev.id === "king") {
    const e = spawnEnemy(w, ev.kind || "kingjelly", spawnPoint(w, -60));
    if (e) e.king = true;
  } else if (ev.id === "current") {
    w.current = { vx: (w.rng() < 0.5 ? -1 : 1) * 150, t: 4.5, T: 4.5 };
  } else if (ev.id === "whale") {
    const dir = w.rng() < 0.5 ? 1 : -1, half = w.view.w / 2 + 160;
    w.whale = { x: p.x - dir * half, y: clamp(p.y + (w.rng() - 0.5) * 80, 80, L.WORLD.h - 80), vx: dir * 430, left: half * 2 + 80, band: 80, t: 0 };
  }
}
function stepEvents(w, dt) {
  while (w.evIdx < L.EVENT_PLAN.length && w.t >= L.EVENT_PLAN[w.evIdx].t) startEvent(w, L.EVENT_PLAN[w.evIdx++]);
  if (w.current) {
    const c = w.current; c.t -= dt;
    const k = Math.min(1, c.t / 0.6, (c.T - c.t) / 0.6 + 0.2), vx = c.vx * k;
    for (const e of w.enemies) if (e.kind !== "boss" && e.kind !== "clam" && e.kind !== "eel") e.x = clamp(e.x + vx * dt, 10, L.WORLD.w - 10);
    for (const o of w.orbs) o.x = clamp(o.x + vx * dt, 10, L.WORLD.w - 10);
    w.p.x = clamp(w.p.x + vx * 0.4 * dt, 30, L.WORLD.w - 30);
    if (c.t <= 0) w.current = null;
  }
  if (w.whale) {
    const h = w.whale, mv = h.vx * dt;
    h.x += mv; h.left -= Math.abs(mv); h.t += dt;
    for (const e of w.enemies) {
      if (e.dead || e.kind === "boss" || e.kind === "clam") continue;
      if (Math.abs(e.y - h.y) < h.band + e.r && Math.abs(e.x - h.x) < 90 + e.r) damage(w, e, e.kind === "gold" ? e.hp + 1 : L.KINGS.includes(e.kind) ? e.max * 0.35 : e.hp + 1);
    }
    for (const k of w.inks) if (Math.abs(k.y - h.y) < h.band && Math.abs(k.x - h.x) < 90) k.dead = true;
    if (h.left <= 0) w.whale = null;
  }
}

/* ---------- 씻기기 ---------- */
// depth: 연쇄 방울로 맞았으면 그 깊이(직접 맞으면 -1)
// src: 맞힌 무기("b" 방울, "s" 불가사리, "zap", "whirl", "shell", "light", "dash") — main 이 맞는 자리 효과를 고른다
export function damage(w, e, amount, depth = -1, src = null, lv = 1) {
  if (e.hp <= 0 || e.dead) return;
  if (src) emit(w, "hit", { x: e.x, y: e.y, src, lv, r: e.r });
  e.hp -= amount; if (e.fl <= -0.16) e.fl = 0.07;   // 연달아 맞아도 계속 하얗게 남지 않도록 번쩍임 사이를 띄운다
  if (w.fx.pops.length < 40 && w.rng() < 0.5) w.fx.pops.push({ x: e.x + (w.rng() - 0.5) * e.r, y: e.y + (w.rng() - 0.5) * e.r, t: 0, s: 4 + w.rng() * 5 });
  if (e.kind === "boss") emit(w, "bosshit", { x: e.x, y: e.y });
  if (e.hp > 0) return;
  wash(w, e, depth);
}
function bumpCombo(w, gauge = true) {
  w.combo = w.comboT > 0 ? w.combo + 1 : 1; w.comboT = L.FEVER.gap;
  if (w.combo > w.bestCombo) w.bestCombo = w.combo;
  if (gauge && w.fever <= 0) { w.gauge += L.feverGain(w.combo, w.fevers); if (w.gauge >= 1) startFever(w); }
}
export function startFever(w) {
  w.gauge = 0; w.fever = L.FEVER.dur; w.fevers++;
  w.fx.rings.push({ x: w.p.x, y: w.p.y, t: 0, T: 0.7, R: 220, color: "#ffd75a", big: true });
  emit(w, "fever", { x: w.p.x, y: w.p.y });
}
function wash(w, e, depth = -1) {
  e.dead = true; w.rescued++; w.dex[e.kind] = (w.dex[e.kind] || 0) + 1;
  // 원래 색으로 돌아와 웃으며 잠수정 반대쪽으로 헤엄쳐 간다.
  const a = Math.atan2(e.y - w.p.y, e.x - w.p.x) + (w.rng() - 0.5) * 0.8;
  if (w.fx.freed.length >= 48) w.fx.freed.shift();
  w.fx.freed.push({ kind: e.kind, x: e.x, y: e.y, vx: Math.cos(a) * 90, vy: Math.sin(a) * 90 - 20, t: 0, face: Math.cos(a) < 0 ? -1 : 1, elite: e.elite });
  if (e.kind !== "boss") { const before = L.comboTier(w.combo); bumpCombo(w, !w._blasting); const after = L.comboTier(w.combo); if (after > before) emit(w, "combo-tier", { tier: after, combo: w.combo }); }
  multiKill(w, e.x, e.y);
  emit(w, "wash", { kind: e.kind, x: e.x, y: e.y, combo: w.combo, elite: e.elite, chain: depth >= 0, king: !!L.KINGS.includes(e.kind) });
  if (e.kind === "boss") { w.boss = null; finish(w, "boss"); return; }
  const isKing = L.KINGS.includes(e.kind);
  // 연쇄 방울
  if (e.elite || isKing) w.bursts.push({ x: e.x, y: e.y, R: isKing ? L.CHAIN.kingR : L.CHAIN.eliteR, dmg: L.chainDmg(w.t, w.tune) * (isKing ? L.CHAIN.kingDmg : L.CHAIN.eliteDmg), depth: 0, big: true });
  else if (depth + 1 < L.CHAIN.maxDepth) w.bursts.push({ x: e.x, y: e.y, R: depth < 0 ? L.CHAIN.r : L.CHAIN.r1, dmg: L.chainDmg(w.t, w.tune) * (depth < 0 ? 1 : L.CHAIN.dmg1), depth: depth + 1 });
  if (e.kind === "gold") { // 빛 방울 비 + 게이지
    w.goldCaught++;
    for (let i = 0; i < 18; i++) { const b = i * TAU / 18; addOrb(w, clamp(e.x + Math.cos(b) * (30 + w.rng() * 50), 20, L.WORLD.w - 20), clamp(e.y + Math.sin(b) * (30 + w.rng() * 50), 20, L.WORLD.h - 20), 2); }
    if (w.fever <= 0) { w.gauge += 0.35; if (w.gauge >= 1) startFever(w); }
    emit(w, "gold", { x: e.x, y: e.y });
    return;
  }
  if (e.kind === "clam") { w.clamsOpened++; emit(w, "clam", { x: e.x, y: e.y }); if (!w.over && !w.pending) w.pending = "chest"; else w.chestOwed = (w.chestOwed || 0) + 1; return; }
  if (isKing) { w.kingsWashed++; spawnQPearl(w, true, e.x, e.y); for (let i = 0; i < 6; i++) addOrb(w, e.x + (w.rng() - 0.5) * 60, e.y + (w.rng() - 0.5) * 60, 2); return; }
  addOrb(w, e.x, e.y, L.ENEMIES[e.kind].xp * (e.elite ? L.ELITE.xp : e.small ? L.FRY.xp : 1));
}
// 한 번에 여러 마리: MULTI.win 초 안에 씻긴 수가 5/10/20 고비를 넘으면 한 번씩 알린다
function multiKill(w, x, y) {
  const q = w.multiQ, now = w.t + (w._blasting ? 0 : 0);
  q.push(now);
  while (q.length && q[0] < now - L.MULTI.win) q.shift();
  let tier = -1; for (let i = 0; i < L.MULTI.steps.length; i++) if (q.length >= L.MULTI.steps[i]) tier = i;
  if (tier > w.multiTier) { w.multiTier = tier; w.multis[tier] = (w.multis[tier] || 0) + 1; emit(w, "multi", { tier, n: L.MULTI.steps[tier], x, y }); }
}
// 연쇄 방울 처리(한 걸음에 perStep 번까지 — 너무 길게 이어지지 않게)
function processBursts(w) {
  let n = 0;
  while (w.bursts.length && n < L.CHAIN.perStep) {
    const b = w.bursts.shift(); n++;
    w.fx.rings.push({ x: b.x, y: b.y, t: 0, T: b.big ? 0.45 : 0.3, R: b.R, color: b.big ? "#ffe27a" : "#dff9ff", chain: true });
    for (const e of w.enemies) {
      if (e.dead || e.kind === "boss") continue;
      const rr = b.R + e.r; if (d2(e.x, e.y, b.x, b.y) > rr * rr) continue;
      if (e.hp <= b.dmg) w.chained++;
      damage(w, e, b.dmg, b.depth);
    }
    emit(w, "burst", { x: b.x, y: b.y, big: !!b.big });
  }
  if (w.bursts.length > 60) w.bursts.length = 60;
  cap(w.fx.rings, 24);
}
function addOrb(w, x, y, v) {
  if (w.orbs.length >= L.MAX_ORBS) { // 너무 많으면 가까운 방울에 합치고, 그래도 안 되면 바로 흡수
    let best = null, bd = 80 * 80;
    for (const o of w.orbs) { const d = d2(o.x, o.y, x, y); if (d < bd) { bd = d; best = o; } }
    if (best) { best.v += v; return; }
    gainXp(w, v); return;
  }
  w.orbs.push({ x, y, v, t: 0, pull: w.fever > 0 });
}
export function gainXp(w, v) {
  w.xp += v;
  let goal = xpGoal(w);
  while (w.xp >= goal) {
    if (w.qpearls.length >= L.MAX_QPEARLS) { w.xp = goal; break; }   // 막대는 가득 찬 채로 기다린다
    w.xp -= goal; w.pearlN++; spawnQPearl(w); goal = xpGoal(w);
  }
}
// sure: 왕 친구가 주는 진주(쌓인 개수와 상관없이 하나 더)
function spawnQPearl(w, sure = false, x0 = null, y0 = null) {
  if (sure && w.qpearls.length >= L.MAX_QPEARLS + 1) return;
  let x, y;
  if (x0 != null) { x = clamp(x0, 50, L.WORLD.w - 50); y = clamp(y0, 50, L.WORLD.h - 50); }
  else { const a = w.rng() * TAU, dist = 90 + w.rng() * 40; x = clamp(w.p.x + Math.cos(a) * dist, 50, L.WORLD.w - 50); y = clamp(w.p.y + Math.sin(a) * dist, 50, L.WORLD.h - 50); }
  w.qpearls.push({ x, y, t: 0, sure });
  if (w.firstPearlT == null) w.firstPearlT = w.t;
  emit(w, "qpearl-up", { x, y, sure });
}

/* ---------- 슈웅!(돌진) ---------- */
// dir: {x, y}(없으면 바라보는 쪽). 쓸 수 있으면 true.
export function dash(w, dir = null, auto = false) {
  if (w.over || w.pending || !dashReady(w)) return false;
  const p = w.p;
  let ux = Math.cos(p.face), uy = Math.sin(p.face);
  if (dir && Math.hypot(dir.x, dir.y) > 0.05) { const n = Math.hypot(dir.x, dir.y); ux = dir.x / n; uy = dir.y / n; }
  p.face = Math.atan2(uy, ux);
  p.dashT = L.DASH.dur; p.dvx = ux * L.DASH.speed; p.dvy = uy * L.DASH.speed;
  w.dashCd = w.tune.dashCd * (w.fever > 0 ? L.FEVER.dashCool : 1); w.dashId++; w.dashes++;
  if (auto) { w.autoDashes++; w.autoDashT = w.tune.autoDash; }
  for (const k of w.inks) if (d2(k.x, k.y, p.x, p.y) < 60 * 60) k.dead = true;
  emit(w, "dash", { x: p.x, y: p.y, auto, a: p.face });
  return true;
}
const dashDmg = (w, e) => e.kind === "boss" ? e.max * 0.02 : (REGULAR.has(e.kind) && !e.elite) || e.kind === "gold" ? e.hp + 1 : L.chainDmg(w.t, w.tune) * 3;
function dashHits(w) {
  const p = w.p;
  for (const e of w.enemies) {
    if (e.dead || e.dh === w.dashId) continue;
    const rr = p.r + e.r + L.DASH.hitR;
    if (d2(e.x, e.y, p.x, p.y) > rr * rr) continue;
    e.dh = w.dashId;
    const before = w.rescued;
    damage(w, e, dashDmg(w, e), -1, "dash");
    if (w.rescued > before) w.dashWashed++;
    else if (e.kind !== "boss" && e.kind !== "clam") { const dx = e.x - p.x, dy = e.y - p.y, d = Math.hypot(dx, dy) || 1; e.kx += dx / d * 380; e.ky += dy / d * 380; }
  }
}
// 태오: 부딪히기 직전에 저절로 슈웅!(그 사이 tune.autoDash 초)
function autoDash(w) {
  const p = w.p;
  if (!w.tune.autoDash || w.autoDashT > 0 || !dashReady(w) || p.inv > 0 || p.grace > 0) return;
  let th = null, td = Infinity;
  for (const e of w.enemies) {
    if (e.dead || L.harmless(e.kind)) continue;
    const rr = p.r + e.r + 26, d = d2(e.x, e.y, p.x, p.y);
    if (d < rr * rr && d < td) { td = d; th = e; }
  }
  for (const k of w.inks) { const d = d2(k.x, k.y, p.x, p.y); if (d < 50 * 50 && d < td) { td = d; th = k; } }
  if (!th) return;
  // 위험에서 멀어지는 쪽(지금 가던 쪽을 조금 섞는다)
  let ax = p.x - th.x, ay = p.y - th.y; const n = Math.hypot(ax, ay) || 1; ax /= n; ay /= n;
  if (p.moving) { ax += Math.cos(p.face) * 0.4; ay += Math.sin(p.face) * 0.4; }
  dash(w, { x: ax, y: ay }, true);
}

/* ---------- 다침·구조 ---------- */
function push(w, R, power) {
  for (const e of w.enemies) {
    if (e.kind === "boss" || e.kind === "clam") continue;
    const dx = e.x - w.p.x, dy = e.y - w.p.y, d = Math.hypot(dx, dy) || 1;
    if (d < R) { const k = power * (1 - d / R * 0.5); e.kx += dx / d * k; e.ky += dy / d * k; }
  }
  for (const k of w.inks) if (d2(k.x, k.y, w.p.x, w.p.y) < R * R) k.dead = true;
}
export const safe = w => w.p.inv > 0 || w.p.dashT > 0 || w.p.grace > 0;
export function hurt(w) {
  if (safe(w) || w.over || w.pending) return false;
  w.hearts--; w.hurts++; w.p.inv = L.HURT_INV;
  w.combo = 0; w.comboT = 0;
  push(w, 150, 520);
  w.fx.rings.push({ x: w.p.x, y: w.p.y, t: 0, R: 150, color: "#ff8fb4" });
  emit(w, "hurt");
  if (w.hearts <= 0) {
    if (!w.rescueUsed) { w.pending = "rescue"; emit(w, "tired"); }
    else finish(w, "tired");
  }
  return true;
}
// 문제·카드가 끝나고 다시 헤엄칠 때: 주변을 밀어내는 물결 + 무적
export function resumeAfter(w) {
  w.pending = null; w.p.inv = Math.max(w.p.inv, L.RESUME_INV);
  push(w, 280, 700);
  w.fx.rings.push({ x: w.p.x, y: w.p.y, t: 0, R: 280, color: "#bff3ff" });
  if (w.chestOwed > 0 && !w.over) { w.chestOwed--; w.pending = "chest"; }
}
// 구조 문제를 맞혔다: 하트 2개(든든한 구조 선물이면 3개)로 다시 출발. 한 판에 한 번.
export function revive(w) {
  w.rescueUsed = true;
  w.hearts = Math.min(w.maxHearts, w.gifts.includes("rescue3") ? 3 : 2);
  resumeAfter(w);
}
function finish(w, result) {
  if (w.over) return;
  w.over = { result, time: Math.min(L.RUN_TIME, w.t) };
  w.pending = null;
  emit(w, "over", { result });
}
// ? 진주로 연 문제를 풀었을 때 기록
export function recordQuiz(w, firstTry) {
  w.solved++;
  if (firstTry) { w.firstTries++; w.streak++; } else w.streak = 0;
}

/* ---------- 무기 ---------- */
function nearest(w, x, y, range, skip) {
  let best = null, bd = range * range;
  // 대왕은 더 가깝게 쳐서 먼저 노린다(대왕 때 졸개에게 탄이 다 막히지 않게)
  for (const e of w.enemies) { if (e.dead || (skip && skip.includes(e))) continue; let d = d2(e.x, e.y, x, y); if (e.kind === "boss") { if (d > bd) continue; d *= 0.12; } if (d < bd) { bd = d; best = e; } }
  return best;
}
function fireBubble(w, s) {
  const p = w.p, targets = [];
  for (let i = 0; i < s.n; i++) { const e = nearest(w, p.x, p.y, s.range, targets); if (!e) break; targets.push(e); }
  if (!targets.length) return false;
  for (let i = 0; i < s.n && w.shots.length < L.MAX_SHOTS; i++) {
    const e = targets[i % targets.length], spread = i >= targets.length ? (i - targets.length + 1) * 0.16 * (i % 2 ? 1 : -1) : 0;
    const a = Math.atan2(e.y - p.y, e.x - p.x) + spread;
    w.shots.push({ k: "b", x: p.x + Math.cos(a) * 16, y: p.y + Math.sin(a) * 16, vx: Math.cos(a) * s.speed, vy: Math.sin(a) * s.speed, dmg: s.dmg, r: s.size, life: 1.2, pierce: s.pierce || 0, hits: null, rainbow: !!s.rainbow || w.fever > 0, lv: s.lv });
  }
  emit(w, "shot", { a: Math.atan2(targets[0].y - p.y, targets[0].x - p.x), lv: s.lv });
  return true;
}
function fireStar(w, s) {
  const p = w.p, off = w.t * 0.9;
  for (let i = 0; i < s.dirs && w.shots.length < L.MAX_SHOTS; i++) {
    const a = off + i * TAU / s.dirs;
    w.shots.push({ k: "s", x: p.x, y: p.y, vx: Math.cos(a) * s.speed, vy: Math.sin(a) * s.speed, dmg: s.dmg, r: s.size, life: 1.0, pierce: s.pierce, hits: null, spin: 0, lv: s.lv });
  }
}
function fireZap(w, s) {
  const p = w.p, hit = [];
  let from = p, range = s.range;
  while (hit.length < s.chain) {
    const e = nearest(w, from.x, from.y, range, hit); if (!e) break;
    hit.push(e); from = e; range = 150;
  }
  if (!hit.length) return false;
  const pts = [[p.x, p.y]];
  for (const e of hit) { pts.push([e.x, e.y]); damage(w, e, s.dmg, -1, "zap", s.lv); }
  if (w.fx.zaps.length >= 10) w.fx.zaps.shift();
  w.fx.zaps.push({ pts, t: 0.22, lv: s.lv, seed: w.rng() * 100 });
  emit(w, "zap", { x: hit[hit.length - 1].x, y: hit[hit.length - 1].y });
  return true;
}
function fireShell(w, s) {
  const p = w.p, e = nearest(w, p.x, p.y, 360);
  const base = e ? Math.atan2(e.y - p.y, e.x - p.x) : p.face;
  for (let i = 0; i < s.n; i++) {
    const a = base + (i - (s.n - 1) / 2) * (TAU / Math.max(3, s.n) * 0.55);
    if (w.shells.length < 12) w.shells.push({ a, t: 0, T: 1.15, x: p.x, y: p.y, dmg: s.dmg, r: s.size, dist: s.dist, k: i % 2 ? -1 : 1, lv: s.lv });
  }
}
function fireLight(w, s) {
  const p = w.p, R = s.r;
  for (const e of w.enemies) {
    const d = Math.hypot(e.x - p.x, e.y - p.y);
    if (d < R + e.r) { damage(w, e, s.dmg, -1, "light", s.lv); if (e.kind !== "boss" && e.kind !== "clam") { const k = 120 / Math.max(30, d); e.kx += (e.x - p.x) * k; e.ky += (e.y - p.y) * k; } }
  }
  for (const k of w.inks) if (d2(k.x, k.y, p.x, p.y) < R * R) k.dead = true;
  if (w.fx.pulses.length >= 10) w.fx.pulses.shift();
  w.fx.pulses.push({ x: p.x, y: p.y, R, t: 0, lv: s.lv });
  emit(w, "light", { x: p.x, y: p.y, R });
}
function weapons(w, dt) {
  const ld = w.load, p = w.p, m = curMods(w);
  for (const id in ld.weapons) {
    const s = L.weaponStats(id, ld.weapons[id], !!ld.evo[id], m);
    if (id === "whirl") {
      w.whirlAng += s.spin * dt;
      for (let i = 0; i < s.n; i++) {
        const a = w.whirlAng + i * TAU / s.n, ox = p.x + Math.cos(a) * s.r, oy = p.y + Math.sin(a) * s.r;
        for (const e of w.enemies) {
          if (e.dead || e.cw > 0) continue;
          if (d2(e.x, e.y, ox, oy) < (e.r + s.size) * (e.r + s.size)) { damage(w, e, s.dmg, -1, "whirl", s.lv); e.cw = s.cd; if (e.kind !== "boss" && e.kind !== "clam") { e.kx += Math.cos(a) * 60; e.ky += Math.sin(a) * 60; } }
        }
        for (const k of w.inks) if (d2(k.x, k.y, ox, oy) < (s.size + 8) * (s.size + 8)) k.dead = true;
      }
      if (s.pull) for (const e of w.enemies) { if (e.kind === "boss" || e.kind === "clam" || e.dead) continue; const d = Math.hypot(e.x - p.x, e.y - p.y); if (d < s.r * 1.6 && d > s.r * 0.9) { e.kx += (p.x - e.x) / d * 40 * dt * 10; e.ky += (p.y - e.y) / d * 40 * dt * 10; } }
      continue;
    }
    w.cd[id] = (w.cd[id] || 0) - dt;
    if (w.cd[id] > 0) continue;
    let fired = true;
    if (id === "bubble") fired = fireBubble(w, s);
    else if (id === "zap") fired = fireZap(w, s);
    else if (id === "shell") fireShell(w, s);
    else if (id === "light") fireLight(w, s);
    else if (id === "star") fireStar(w, s);
    w.cd[id] = fired ? s.every : 0.12;
  }
  // 소라 부메랑: 잠수정에서 나갔다가 돌아온다(잠수정이 움직여도 따라온다)
  for (const sh of w.shells) {
    sh.t += dt; const k = sh.t / sh.T;
    if (k >= 1) { sh.dead = true; continue; }
    const out = Math.sin(Math.PI * k) * sh.dist, side = Math.sin(TAU * k) * 34 * sh.k;
    const ux = Math.cos(sh.a), uy = Math.sin(sh.a);
    sh.x = p.x + ux * out - uy * side; sh.y = p.y + uy * out + ux * side;
    for (const e of w.enemies) if (!e.dead && e.cs <= 0 && d2(e.x, e.y, sh.x, sh.y) < (e.r + sh.r) * (e.r + sh.r)) { damage(w, e, sh.dmg, -1, "shell", sh.lv); e.cs = 0.25; }
  }
  w.shells = w.shells.filter(s => !s.dead);
}

/* ---------- 한 걸음 ---------- */
// mv: {x, y} 길이 1 이하(가상 스틱·방향키)
export function stepWorld(w, dt, mv = { x: 0, y: 0 }) {
  if (w.over || w.pending) return;
  w.t += dt;
  const p = w.p, tune = w.tune;
  // 시계들
  if (w.comboT > 0) { w.comboT -= dt; if (w.comboT <= 0) w.combo = 0; }
  if (w.multiTier >= 0) { const q = w.multiQ; while (q.length && q[0] < w.t - L.MULTI.win) q.shift(); if (q.length < 3) w.multiTier = -1; }
  if (w.orbT > 0) { w.orbT -= dt; if (w.orbT <= 0) w.orbChain = 0; }
  if (w.fever > 0) { w.fever -= dt; if (w.fever <= 0) { w.fever = 0; emit(w, "fever-end"); } }
  if (w.dashCd > 0) w.dashCd -= dt;
  if (w.autoDashT > 0) w.autoDashT -= dt;
  if (p.grace > 0) p.grace -= dt;
  stepEvents(w, dt);
  // 잠수정
  const speed = L.SUB_SPEED * w.m.speed * (w.fever > 0 ? 1.12 : 1), mx = clamp(mv.x || 0, -1, 1), my = clamp(mv.y || 0, -1, 1);
  p.moving = Math.abs(mx) + Math.abs(my) > 0.05;
  if (p.moving) p.face = Math.atan2(my, mx);
  autoDash(w);
  if (p.dashT > 0) {
    const st = Math.min(dt, p.dashT);
    p.x = clamp(p.x + p.dvx * st, 30, L.WORLD.w - 30); p.y = clamp(p.y + p.dvy * st, 30, L.WORLD.h - 30);
    p.vx = p.dvx * 0.35; p.vy = p.dvy * 0.35;
    p.dashT -= dt;
    if (p.dashT <= 0) { p.dashT = 0; p.grace = L.DASH.grace; }
  } else {
    const k = Math.min(1, dt * 12);
    p.vx += (mx * speed - p.vx) * k; p.vy += (my * speed - p.vy) * k;
    p.x = clamp(p.x + p.vx * dt, 30, L.WORLD.w - 30); p.y = clamp(p.y + p.vy * dt, 30, L.WORLD.h - 30);
  }
  if (p.inv > 0) p.inv -= dt;
  // 친구 나오기(떼로)
  // 화면 안이 비면 더 부른다(목표 마릿수까지)
  let vis = 0; const hx = w.view.w / 2 + 40, hy = w.view.h / 2 + 40;
  for (const e of w.enemies) if (Math.abs(e.x - p.x) < hx && Math.abs(e.y - p.y) < hy) vis++;
  w.vis = vis;
  // 더 부르는 양은 요즘 씻기는 빠르기를 넘지 않는다(씻긴 만큼만 채움 — 못 씻기는 아이에게 몰아주지 않게)
  w.washRate += (w.rescued - w.rescuedSeen) / 3 - w.washRate * dt / 3; w.rescuedSeen = w.rescued;
  const lack = Math.max(0, L.crowdTarget(w.t, tune) - vis);
  w.spawnAcc += (L.spawnRate(w.t) + Math.min(L.CROWD_MAX, lack * L.CROWD_FILL, w.washRate * L.CROWD_WASH)) * dt;
  const pack = L.packSize(w.t);
  while (w.spawnAcc >= pack) { w.spawnAcc -= pack; spawnPack(w, pack); }
  if (tune.eel && w.t >= w.eelT) { spawnEel(w); w.eelT = w.t + L.eelGap(w.t) / (w.zone.eel || 1) * (0.8 + w.rng() * 0.4); }
  for (const a of w.warns) {
    a.t -= dt;
    if (a.t <= 0) { a.dead = true; const e = spawnEnemy(w, "eel", { x: a.x1, y: a.y1 }); if (e) { e.vx = a.ux * e.sp; e.vy = a.uy * e.sp; e.life = 3.2; } }
  }
  w.warns = w.warns.filter(a => !a.dead);
  if (!w.bossSpawned && w.t >= L.BOSS_AT) { w.bossSpawned = true; w.boss = spawnEnemy(w, "boss", spawnPoint(w, 20)); emit(w, "boss"); }
  // 친구 움직임
  const es = w.enemies;
  for (const e of es) {
    e.t += dt; if (e.fl > -1) e.fl -= dt; if (e.cw > 0) e.cw -= dt; if (e.cs > 0) e.cs -= dt;
    const dx = p.x - e.x, dy = p.y - e.y, d = Math.hypot(dx, dy) || 1, ux = dx / d, uy = dy / d;
    let sp = e.sp, vx = ux, vy = uy;
    if (e.kind === "eel") {
      e.x += e.vx * dt; e.y += e.vy * dt; e.life -= dt;
      if (e.life <= 0) e.dead = true;
    } else if (e.kind === "clam") {
      e.life -= dt; if (e.life <= 0) { e.dead = true; emit(w, "clam-bye", { x: e.x, y: e.y }); }
    } else {
      if (e.kind === "gold") { // 잠수정에게서 도망가며 꼬불꼬불
        e.life -= dt;
        if (e.life <= 0) { e.dead = true; emit(w, "gold-bye", { x: e.x, y: e.y }); continue; }
        const s = Math.sin(e.t * 2.4); vx = -ux - uy * s * 0.8; vy = -uy + ux * s * 0.8;
        if (d > 330) sp *= 0.35;   // 너무 멀어지면 천천히(놓치지 않게)
        // 벽에 붙으면 벽을 따라 미끄러진다
        if (e.x < 80 || e.x > L.WORLD.w - 80) vx *= 0.2;
        if (e.y < 80 || e.y > L.WORLD.h - 80) vy *= 0.2;
      }
      else if (e.kind === "crab") { const s = Math.sin(e.t * 3.2) * 0.95; vx = ux - uy * s; vy = uy + ux * s; }
      else if (e.kind === "jelly" || e.kind === "kingjelly") sp *= 0.55 + 0.6 * Math.abs(Math.sin(e.t * 2.2));
      else if (e.kind === "puffer" || e.kind === "kingpuffer") {
        if (e.pcd > 0) e.pcd -= dt;
        if (e.puff > 0) { e.puff -= dt; sp *= 1.9; }
        else if (d < 160 && e.pcd <= 0) { e.puff = 1.0; e.pcd = 3.2; }
      } else if (e.kind === "boss") {
        e.shot -= dt;
        if (e.shot <= 0) {
          e.shot = 2.4 / Math.max(0.75, tune.speed);
          const n = tune.speed < 0.8 ? 3 : 5, base = Math.atan2(dy, dx);
          for (let i = 0; i < n; i++) { const a = base + (i - (n - 1) / 2) * 0.32; if (w.inks.length < 30) w.inks.push({ x: e.x + Math.cos(a) * 50, y: e.y + Math.sin(a) * 50, vx: Math.cos(a) * 150 * tune.speed, vy: Math.sin(a) * 150 * tune.speed, t: 0 }); }
          emit(w, "ink");
        }
      }
      // 화면 밖에 있는 친구는 빨리 헤엄쳐 들어온다(화면이 비지 않게 — 화면 안에서는 원래 빠르기)
      if (e.kind !== "gold" && e.kind !== "boss" && (Math.abs(dx) > w.view.w / 2 + 10 || Math.abs(dy) > w.view.h / 2 + 10)) sp *= L.OFFSCREEN_RUSH;
      const n = Math.hypot(vx, vy) || 1;
      e.x += (vx / n * sp + e.kx) * dt; e.y += (vy / n * sp + e.ky) * dt;
      const decay = Math.max(0, 1 - dt * 5); e.kx *= decay; e.ky *= decay;
      e.x = clamp(e.x, 10, L.WORLD.w - 10); e.y = clamp(e.y, 10, L.WORLD.h - 10);
    }
    e.face = (e.kind === "eel" ? e.vx : e.kind === "gold" ? -dx : dx) < 0 ? -1 : 1;
  }
  // 서로 겹치지 않게 살짝 밀기(72마리 → 프레임당 약 2600쌍)
  for (let i = 0; i < es.length; i++) {
    const a = es[i]; if (a.kind === "eel" || a.dead) continue;
    for (let j = i + 1; j < es.length; j++) {
      const b = es[j]; if (b.kind === "eel" || b.dead) continue;
      const rr = (a.r + b.r) * 0.85, dx = b.x - a.x, dy = b.y - a.y, dd = dx * dx + dy * dy;
      if (dd >= rr * rr || dd < 0.01) continue;
      const dist = Math.sqrt(dd), over = (rr - dist) / dist * 0.5;
      const fa = a.kind === "boss" || a.kind === "clam", fb = b.kind === "boss" || b.kind === "clam";
      const wa = fa ? 0 : fb ? 1 : 0.5, wb = fa && fb ? 0 : 1 - wa;
      a.x -= dx * over * wa; a.y -= dy * over * wa; b.x += dx * over * wb; b.y += dy * over * wb;
    }
  }
  if (p.dashT > 0 || p.grace > 0.1) dashHits(w);
  weapons(w, dt);
  // 탄
  for (const s of w.shots) {
    s.x += s.vx * dt; s.y += s.vy * dt; s.life -= dt; if (s.spin != null) s.spin += dt * 12;
    if (s.life <= 0 || s.x < -20 || s.y < -20 || s.x > L.WORLD.w + 20 || s.y > L.WORLD.h + 20) { s.dead = true; continue; }
    for (const e of es) {
      if (e.dead) continue;
      const rr = e.r + s.r; if (d2(e.x, e.y, s.x, s.y) > rr * rr) continue;
      if (s.hits && s.hits.includes(e.id)) continue;
      damage(w, e, s.dmg, -1, s.k, s.lv);
      if (s.pierce > 0) { s.pierce--; (s.hits || (s.hits = [])).push(e.id); }
      else { s.dead = true; break; }
    }
  }
  processBursts(w);
  // 대왕의 먹물 방울
  for (const k of w.inks) {
    if (k.dead) continue;
    k.t += dt; k.x += k.vx * dt; k.y += k.vy * dt;
    if (k.t > 4) k.dead = true;
    else if (d2(k.x, k.y, p.x, p.y) < (p.r + 9) * (p.r + 9)) { k.dead = true; hurt(w); }
  }
  // 부딪힘
  if (!safe(w)) for (const e of es) {
    if (e.dead || L.harmless(e.kind)) continue;
    const rr = e.r * (e.kind === "boss" ? 0.8 : 0.9) + p.r * 0.75;
    if (d2(e.x, e.y, p.x, p.y) < rr * rr) { if (hurt(w)) break; }
  }
  w.enemies = w.enemies.filter(e => !e.dead);
  w.shots = w.shots.filter(s => !s.dead);
  w.inks = w.inks.filter(k => !k.dead);
  // 빛 방울: 가까이 가면 빨려 온다(무지개 터보면 화면의 방울이 전부 날아온다)
  const mag = L.MAGNET_R * tune.magnet * w.m.magnet, all = w.fever > 0;
  for (const o of w.orbs) {
    o.t += dt;
    const dd = d2(o.x, o.y, p.x, p.y);
    if (!o.pull && (dd < mag * mag || all || o.t > L.ORB_DRIFT)) o.pull = true;   // 오래된 방울은 저절로 날아와 바닥이 어지럽지 않게
    if (o.pull) { const d = Math.sqrt(dd) || 1, v = (all ? 420 : 240) + o.t * 60; o.x += (p.x - o.x) / d * Math.min(d, v * dt); o.y += (p.y - o.y) / d * Math.min(d, v * dt); }
    if (dd < (p.r + 10) * (p.r + 10)) { o.dead = true; gainXp(w, o.v); w.orbChain++; w.orbT = 0.5; emit(w, "orb", { n: w.orbChain }); }
  }
  w.orbs = w.orbs.filter(o => !o.dead);
  // ? 진주
  for (const q of w.qpearls) {
    q.t += dt;
    if (!w.pending && !w.over && d2(q.x, q.y, p.x, p.y) < (p.r + 24) * (p.r + 24)) { q.dead = true; w.pending = "quiz"; emit(w, "qpearl"); }
  }
  w.qpearls = w.qpearls.filter(q => !q.dead);
  stepFx(w, dt);
  // 끝
  if (!w.over && w.t >= L.RUN_TIME) finish(w, w.boss ? "escape" : "boss");
}

// 꾸밈만 진행(씻긴 친구는 1.4초 동안 헤엄쳐 사라진다). 문제·카드 화면이 떠 있는 동안에도 main 이 불러 물결이 보이게 한다.
export function stepFx(w, dt) {
  const fx = w.fx;
  for (const f of fx.freed) { f.t += dt; f.x += f.vx * dt; f.y += f.vy * dt; }
  fx.freed = fx.freed.filter(f => f.t < 1.4);
  for (const q of fx.pops) q.t += dt; fx.pops = fx.pops.filter(q => q.t < 0.35);
  for (const z of fx.zaps) z.t -= dt; fx.zaps = fx.zaps.filter(z => z.t > 0);
  for (const q of fx.pulses) q.t += dt; fx.pulses = fx.pulses.filter(q => q.t < 0.45);
  for (const r of fx.rings) r.t += dt; fx.rings = fx.rings.filter(r => r.t < (r.T || 0.6)); cap(fx.rings, 24);
}

/* ---------- 문제를 맞힌 그 순간의 보상: 물결 파동 ----------
   한 번에 맞히면: 화면 안의 먹물 친구를 한꺼번에 씻겨 주고(대왕은 체력의 15%만), 하트가 깎여 있으면 1 회복.
   고쳐 맞히면: 가까운(반경 220) 친구만 씻겨 주는 작은 파동(대왕은 5%). 씻긴 친구는 콤보로 세지만 게이지는 안 채운다. */
export const BLAST_NEAR = 220;
export function quizBlast(w, firstTry) {
  const p = w.p, hw = w.view.w / 2 + 20, hh = w.view.h / 2 + 20;
  let n = 0, healed = false;
  w._blasting = true;
  for (const e of w.enemies) {
    if (e.dead) continue;
    const hit = firstTry ? Math.abs(e.x - p.x) < hw && Math.abs(e.y - p.y) < hh : d2(e.x, e.y, p.x, p.y) < (BLAST_NEAR + e.r) * (BLAST_NEAR + e.r);
    if (!hit) continue;
    if (e.kind === "boss") damage(w, e, e.max * (firstTry ? 0.15 : 0.05));
    else if (L.KINGS.includes(e.kind)) damage(w, e, e.max * (firstTry ? 0.6 : 0.3));
    else if (e.kind === "clam") damage(w, e, e.max * 0.5);
    else { damage(w, e, e.hp + 1); n++; }
  }
  w.bursts.length = 0;   // 파동이 이미 다 씻겼다(연쇄는 따로 안 돌린다)
  w._blasting = false;
  w.enemies = w.enemies.filter(e => !e.dead);
  const R = firstTry ? Math.hypot(hw, hh) : BLAST_NEAR;
  for (const k of w.inks) if (firstTry || d2(k.x, k.y, p.x, p.y) < R * R) k.dead = true;
  w.inks = w.inks.filter(k => !k.dead);
  if (firstTry && w.hearts < w.maxHearts) { w.hearts++; healed = true; }
  w.fx.rings.push({ x: p.x, y: p.y, t: 0, T: firstTry ? 0.9 : 0.6, R, color: firstTry ? "#8ff0ff" : "#bff3ff", big: firstTry });
  if (firstTry) w.fx.rings.push({ x: p.x, y: p.y, t: -0.15, T: 0.9, R: R * 0.8, color: "#ffffff", big: true });
  w.blasts++; w.blastWashed += n;
  emit(w, "blast", { n, firstTry, healed, x: p.x, y: p.y });
  return { n, healed };
}

// 판이 끝났을 때 저장에 넘길 기록
export function runRecord(w) {
  const pilot = L.PILOTS[w.kid] || L.PILOTS[1];
  return { kid: pilot.kid, time: Math.floor(Math.min(L.RUN_TIME, w.t)), solved: w.solved, firstTries: w.firstTries, rescued: w.rescued, dex: Object.assign({}, w.dex), result: w.over ? w.over.result : "tired", gems: w.gems, blasts: w.blasts, blastWashed: w.blastWashed, quizGear: w.quizGear, bestCombo: w.bestCombo, fevers: w.fevers, dashes: w.dashes };
}
// 검증용: 이벤트를 지금 바로 일으킨다(?qa=1 훅에서만 쓴다)
export const startEventQA = (w, ev) => startEvent(w, ev);
