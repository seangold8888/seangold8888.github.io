// 딥 다이브 — 바다 속 한 걸음(화면·소리와 무관). main.js 가 그리고, Node 시뮬레이션이 그대로 돌려 본다.
// 게임 시간은 stepWorld 에 넘긴 dt 를 더한 값(w.t)뿐이다. 문제·카드·일시정지 동안에는 부르지 않는다.
import * as L from "./logic.js?v=1";

const TAU = Math.PI * 2;
const d2 = (ax, ay, bx, by) => (ax - bx) * (ax - bx) + (ay - by) * (ay - by);
const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
const cap = (arr, n) => { if (arr.length > n) arr.splice(0, arr.length - n); };

export function createWorld({ kid = 1, zone = "coral", rng = Math.random, view = { w: 720, h: 540 }, load = null, gifts = [] } = {}) {
  const tune = L.tuning(kid), z = L.zoneOf(zone), ld = load || L.newLoadout();
  const m = L.mods(ld.supports);
  const w = {
    kid, tune, zone: z, rng, view, gifts: gifts.slice(), t: 0, nextId: 1,
    p: { x: L.WORLD.w / 2, y: L.WORLD.h / 2, vx: 0, vy: 0, r: 18, inv: 0, face: -Math.PI / 2, moving: false },
    load: ld, m, hearts: tune.hearts + m.hearts, maxHearts: tune.hearts + m.hearts,
    enemies: [], shots: [], orbs: [], qpearls: [], inks: [], shells: [], warns: [],
    fx: { freed: [], pops: [], zaps: [], pulses: [], rings: [] },
    cd: { bubble: 0.3, zap: 0.8, shell: 0.6, light: 1.2, star: 0.9 }, whirlAng: 0,
    xp: 0, pearlN: 0, spawnAcc: 0, eelT: L.ENEMIES.eel.from, boss: null, bossSpawned: false,
    rescued: 0, dex: {}, solved: 0, firstTries: 0, streak: 0, gems: 0, rescueUsed: false, hurts: 0, blasts: 0, blastWashed: 0, quizGear: 0,
    pending: null, over: null, events: [],
  };
  return w;
}
const emit = (w, type, data) => { if (w.events.length < 64) w.events.push(Object.assign({ type }, data)); };
export const xpGoal = w => L.xpNeedFor(w.pearlN, w.gifts.includes("quickpearl"));

// 장비가 바뀌면 보조 효과·하트 최대치를 다시 계산한다.
export function setLoadout(w, load, card) {
  const before = w.maxHearts;
  w.load = load; w.m = L.mods(load.supports);
  w.maxHearts = w.tune.hearts + w.m.hearts;
  if (w.maxHearts > before) w.hearts += w.maxHearts - before;
  if (card && card.kind === "support" && card.id === "heart") w.hearts = Math.min(w.maxHearts, w.hearts + 1);
  if (card && card.kind === "heal") w.hearts = Math.min(w.maxHearts, w.hearts + 1);
  if (card && card.kind === "gem") w.gems++;
  w.hearts = Math.min(w.hearts, w.maxHearts);
}

/* ---------- 친구 나오기 ---------- */
function spawnPoint(w, extra = 40) {
  const { p, view } = w, R = Math.hypot(view.w, view.h) / 2 + extra;
  for (let i = 0; i < 6; i++) {
    const a = w.rng() * TAU, x = clamp(p.x + Math.cos(a) * R, 20, L.WORLD.w - 20), y = clamp(p.y + Math.sin(a) * R, 20, L.WORLD.h - 20);
    if (Math.abs(x - p.x) > view.w / 2 + 10 || Math.abs(y - p.y) > view.h / 2 + 10 || i === 5) return { x, y };
  }
  return { x: 20, y: 20 };
}
export function spawnEnemy(w, kind, at) {
  const E = L.ENEMIES[kind]; if (!E) return null;
  // 너무 많으면 가장 먼 친구가 먼저 떠난다(성능).
  let n = 0; for (const e of w.enemies) if (e.kind !== "boss") n++;
  if (n >= L.MAX_ENEMIES) {
    let far = -1, fd = -1;
    w.enemies.forEach((e, i) => { if (e.kind === "boss") return; const d = d2(e.x, e.y, w.p.x, w.p.y); if (d > fd) { fd = d; far = i; } });
    if (far >= 0) w.enemies.splice(far, 1);
  }
  const pt = at || spawnPoint(w);
  const hp = kind === "boss" ? L.bossHp(w.zone, w.tune) : L.enemyHp(kind, w.t, w.tune);
  const e = { id: w.nextId++, kind, x: pt.x, y: pt.y, r: E.r, hp, max: hp, sp: L.enemySpeed(kind, w.t, w.tune), t: w.rng() * 6, vx: 0, vy: 0, kx: 0, ky: 0, fl: -1, cw: 0, cs: 0, puff: 0, pcd: 0, shot: 2.5, face: 0 };
  w.enemies.push(e);
  return e;
}
function spawnEel(w) {
  // 화면을 가로지르는 줄: 잠수정 근처를 지나간다. 경고 1초 뒤 출발.
  const { p, view } = w, a = w.rng() * TAU, ux = Math.cos(a), uy = Math.sin(a), off = (w.rng() - 0.5) * 120;
  const R = Math.hypot(view.w, view.h) / 2 + 60, cx = p.x - uy * off, cy = p.y + ux * off;
  w.warns.push({ x1: cx - ux * R, y1: cy - uy * R, x2: cx + ux * R, y2: cy + uy * R, ux, uy, t: 1.1, T: 1.1 });
  emit(w, "warn");
}

/* ---------- 씻기기 ---------- */
export function damage(w, e, amount) {
  if (e.hp <= 0) return;
  e.hp -= amount; if (e.fl <= -0.16) e.fl = 0.07;   // 연달아 맞아도 계속 하얗게 남지 않도록 번쩍임 사이를 띄운다
  if (w.fx.pops.length < 40 && w.rng() < 0.5) w.fx.pops.push({ x: e.x + (w.rng() - 0.5) * e.r, y: e.y + (w.rng() - 0.5) * e.r, t: 0, s: 4 + w.rng() * 5 });
  if (e.hp > 0) return;
  wash(w, e);
}
function wash(w, e) {
  e.dead = true; w.rescued++; w.dex[e.kind] = (w.dex[e.kind] || 0) + 1;
  // 원래 색으로 돌아와 웃으며 잠수정 반대쪽으로 헤엄쳐 간다.
  const a = Math.atan2(e.y - w.p.y, e.x - w.p.x) + (w.rng() - 0.5) * 0.8;
  if (w.fx.freed.length >= 40) w.fx.freed.shift();
  w.fx.freed.push({ kind: e.kind, x: e.x, y: e.y, vx: Math.cos(a) * 90, vy: Math.sin(a) * 90 - 20, t: 0, face: Math.cos(a) < 0 ? -1 : 1 });
  emit(w, "wash", { kind: e.kind, x: e.x, y: e.y });
  if (e.kind === "boss") { w.boss = null; finish(w, "boss"); return; }
  addOrb(w, e.x, e.y, L.ENEMIES[e.kind].xp);
}
function addOrb(w, x, y, v) {
  if (w.orbs.length >= L.MAX_ORBS) { // 너무 많으면 가까운 방울에 합치고, 그래도 안 되면 바로 흡수
    let best = null, bd = 80 * 80;
    for (const o of w.orbs) { const d = d2(o.x, o.y, x, y); if (d < bd) { bd = d; best = o; } }
    if (best) { best.v += v; return; }
    gainXp(w, v); return;
  }
  w.orbs.push({ x, y, v, t: 0, pull: false });
}
export function gainXp(w, v) {
  w.xp += v;
  let goal = xpGoal(w);
  while (w.xp >= goal) {
    if (w.qpearls.length >= L.MAX_QPEARLS) { w.xp = goal; break; }   // 막대는 가득 찬 채로 기다린다
    w.xp -= goal; w.pearlN++; spawnQPearl(w); goal = xpGoal(w);
  }
}
function spawnQPearl(w) {
  const a = w.rng() * TAU, dist = 100 + w.rng() * 50;
  const x = clamp(w.p.x + Math.cos(a) * dist, 50, L.WORLD.w - 50), y = clamp(w.p.y + Math.sin(a) * dist, 50, L.WORLD.h - 50);
  w.qpearls.push({ x, y, t: 0 });
  emit(w, "qpearl-up", { x, y });
}

/* ---------- 다침·구조 ---------- */
function push(w, R, power) {
  for (const e of w.enemies) {
    if (e.kind === "boss") continue;
    const dx = e.x - w.p.x, dy = e.y - w.p.y, d = Math.hypot(dx, dy) || 1;
    if (d < R) { const k = power * (1 - d / R * 0.5); e.kx += dx / d * k; e.ky += dy / d * k; }
  }
  for (const k of w.inks) if (d2(k.x, k.y, w.p.x, w.p.y) < R * R) k.dead = true;
}
export function hurt(w) {
  if (w.p.inv > 0 || w.over || w.pending) return false;
  w.hearts--; w.hurts++; w.p.inv = L.HURT_INV;
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
  for (const e of w.enemies) { if (e.dead || (skip && skip.includes(e))) continue; const d = d2(e.x, e.y, x, y); if (d < bd) { bd = d; best = e; } }
  return best;
}
function fireBubble(w, s) {
  const p = w.p, targets = [];
  for (let i = 0; i < s.n; i++) { const e = nearest(w, p.x, p.y, s.range, targets); if (!e) break; targets.push(e); }
  if (!targets.length) return false;
  for (let i = 0; i < s.n && w.shots.length < L.MAX_SHOTS; i++) {
    const e = targets[i % targets.length], spread = i >= targets.length ? (i - targets.length + 1) * 0.16 * (i % 2 ? 1 : -1) : 0;
    const a = Math.atan2(e.y - p.y, e.x - p.x) + spread;
    w.shots.push({ k: "b", x: p.x + Math.cos(a) * 16, y: p.y + Math.sin(a) * 16, vx: Math.cos(a) * s.speed, vy: Math.sin(a) * s.speed, dmg: s.dmg, r: s.size, life: 1.2, pierce: s.pierce || 0, hits: null, rainbow: !!s.rainbow, lv: s.lv });
  }
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
  for (const e of hit) { pts.push([e.x, e.y]); damage(w, e, s.dmg); }
  if (w.fx.zaps.length >= 10) w.fx.zaps.shift();
  w.fx.zaps.push({ pts, t: 0.22, lv: s.lv, seed: w.rng() * 100 });
  emit(w, "zap");
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
    if (d < R + e.r) { damage(w, e, s.dmg); if (e.kind !== "boss") { const k = 120 / Math.max(30, d); e.kx += (e.x - p.x) * k; e.ky += (e.y - p.y) * k; } }
  }
  for (const k of w.inks) if (d2(k.x, k.y, p.x, p.y) < R * R) k.dead = true;
  if (w.fx.pulses.length >= 10) w.fx.pulses.shift();
  w.fx.pulses.push({ x: p.x, y: p.y, R, t: 0, lv: s.lv });
  emit(w, "light");
}
function weapons(w, dt) {
  const ld = w.load, p = w.p;
  for (const id in ld.weapons) {
    const s = L.weaponStats(id, ld.weapons[id], !!ld.evo[id], w.m);
    if (id === "whirl") {
      w.whirlAng += s.spin * dt;
      for (let i = 0; i < s.n; i++) {
        const a = w.whirlAng + i * TAU / s.n, ox = p.x + Math.cos(a) * s.r, oy = p.y + Math.sin(a) * s.r;
        for (const e of w.enemies) {
          if (e.dead || e.cw > 0) continue;
          if (d2(e.x, e.y, ox, oy) < (e.r + s.size) * (e.r + s.size)) { damage(w, e, s.dmg); e.cw = s.cd; if (e.kind !== "boss") { e.kx += Math.cos(a) * 60; e.ky += Math.sin(a) * 60; } }
        }
        for (const k of w.inks) if (d2(k.x, k.y, ox, oy) < (s.size + 8) * (s.size + 8)) k.dead = true;
      }
      if (s.pull) for (const e of w.enemies) { if (e.kind === "boss" || e.dead) continue; const d = Math.hypot(e.x - p.x, e.y - p.y); if (d < s.r * 1.6 && d > s.r * 0.9) { e.kx += (p.x - e.x) / d * 40 * dt * 10; e.ky += (p.y - e.y) / d * 40 * dt * 10; } }
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
    for (const e of w.enemies) if (!e.dead && e.cs <= 0 && d2(e.x, e.y, sh.x, sh.y) < (e.r + sh.r) * (e.r + sh.r)) { damage(w, e, sh.dmg); e.cs = 0.25; }
  }
  w.shells = w.shells.filter(s => !s.dead);
}

/* ---------- 한 걸음 ---------- */
// mv: {x, y} 길이 1 이하(가상 스틱·방향키)
export function stepWorld(w, dt, mv = { x: 0, y: 0 }) {
  if (w.over || w.pending) return;
  w.t += dt;
  const p = w.p, tune = w.tune;
  // 잠수정
  const speed = L.SUB_SPEED * w.m.speed, mx = clamp(mv.x || 0, -1, 1), my = clamp(mv.y || 0, -1, 1);
  const k = Math.min(1, dt * 12);
  p.vx += (mx * speed - p.vx) * k; p.vy += (my * speed - p.vy) * k;
  p.x = clamp(p.x + p.vx * dt, 30, L.WORLD.w - 30); p.y = clamp(p.y + p.vy * dt, 30, L.WORLD.h - 30);
  p.moving = Math.abs(mx) + Math.abs(my) > 0.05;
  if (p.moving) p.face = Math.atan2(my, mx);
  if (p.inv > 0) p.inv -= dt;
  // 친구 나오기
  w.spawnAcc += L.spawnRate(w.t) * dt;
  while (w.spawnAcc >= 1) { w.spawnAcc -= 1; spawnEnemy(w, L.pickKind(w.t, w.zone, w.rng)); }
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
    } else {
      if (e.kind === "crab") { const s = Math.sin(e.t * 3.2) * 0.95; vx = ux - uy * s; vy = uy + ux * s; }
      else if (e.kind === "jelly") sp *= 0.55 + 0.6 * Math.abs(Math.sin(e.t * 2.2));
      else if (e.kind === "puffer") {
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
      const n = Math.hypot(vx, vy) || 1;
      e.x += (vx / n * sp + e.kx) * dt; e.y += (vy / n * sp + e.ky) * dt;
      const decay = Math.max(0, 1 - dt * 5); e.kx *= decay; e.ky *= decay;
      e.x = clamp(e.x, 10, L.WORLD.w - 10); e.y = clamp(e.y, 10, L.WORLD.h - 10);
    }
    e.face = (e.kind === "eel" ? e.vx : dx) < 0 ? -1 : 1;
  }
  // 서로 겹치지 않게 살짝 밀기(60마리 × 60마리 = 프레임당 1800쌍)
  for (let i = 0; i < es.length; i++) {
    const a = es[i]; if (a.kind === "eel") continue;
    for (let j = i + 1; j < es.length; j++) {
      const b = es[j]; if (b.kind === "eel") continue;
      const rr = (a.r + b.r) * 0.85, dx = b.x - a.x, dy = b.y - a.y, dd = dx * dx + dy * dy;
      if (dd >= rr * rr || dd < 0.01) continue;
      const dist = Math.sqrt(dd), over = (rr - dist) / dist * 0.5;
      const wa = a.kind === "boss" ? 0 : b.kind === "boss" ? 1 : 0.5, wb = 1 - wa;
      a.x -= dx * over * wa * 2 * 0.5; a.y -= dy * over * wa * 2 * 0.5; b.x += dx * over * wb * 2 * 0.5; b.y += dy * over * wb * 2 * 0.5;
    }
  }
  weapons(w, dt);
  // 탄
  for (const s of w.shots) {
    s.x += s.vx * dt; s.y += s.vy * dt; s.life -= dt; if (s.spin != null) s.spin += dt * 12;
    if (s.life <= 0 || s.x < -20 || s.y < -20 || s.x > L.WORLD.w + 20 || s.y > L.WORLD.h + 20) { s.dead = true; continue; }
    for (const e of es) {
      if (e.dead) continue;
      const rr = e.r + s.r; if (d2(e.x, e.y, s.x, s.y) > rr * rr) continue;
      if (s.hits && s.hits.includes(e.id)) continue;
      damage(w, e, s.dmg);
      if (s.pierce > 0) { s.pierce--; (s.hits || (s.hits = [])).push(e.id); }
      else { s.dead = true; break; }
    }
  }
  // 대왕의 먹물 방울
  for (const k of w.inks) {
    if (k.dead) continue;
    k.t += dt; k.x += k.vx * dt; k.y += k.vy * dt;
    if (k.t > 4) k.dead = true;
    else if (d2(k.x, k.y, p.x, p.y) < (p.r + 9) * (p.r + 9)) { k.dead = true; hurt(w); }
  }
  // 부딪힘
  if (p.inv <= 0) for (const e of es) {
    if (e.dead) continue;
    const rr = e.r * (e.kind === "boss" ? 0.8 : 0.9) + p.r * 0.75;
    if (d2(e.x, e.y, p.x, p.y) < rr * rr) { if (hurt(w)) break; }
  }
  w.enemies = es.filter(e => !e.dead);
  w.shots = w.shots.filter(s => !s.dead);
  w.inks = w.inks.filter(k => !k.dead);
  // 빛 방울: 가까이 가면 빨려 온다
  const mag = 70 * tune.magnet * w.m.magnet;
  for (const o of w.orbs) {
    o.t += dt;
    const dd = d2(o.x, o.y, p.x, p.y);
    if (!o.pull && dd < mag * mag) o.pull = true;
    if (o.pull) { const d = Math.sqrt(dd) || 1, v = 240 + o.t * 60; o.x += (p.x - o.x) / d * Math.min(d, v * dt); o.y += (p.y - o.y) / d * Math.min(d, v * dt); }
    if (dd < (p.r + 8) * (p.r + 8)) { o.dead = true; gainXp(w, o.v); emit(w, "orb"); }
  }
  w.orbs = w.orbs.filter(o => !o.dead);
  // ? 진주
  for (const q of w.qpearls) {
    q.t += dt;
    if (!w.pending && !w.over && d2(q.x, q.y, p.x, p.y) < (p.r + 22) * (p.r + 22)) { q.dead = true; w.pending = "quiz"; emit(w, "qpearl"); }
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
  for (const r of fx.rings) r.t += dt; fx.rings = fx.rings.filter(r => r.t < (r.T || 0.6)); cap(fx.rings, 8);
}

/* ---------- 문제를 맞힌 그 순간의 보상: 물결 파동 ----------
   한 번에 맞히면: 화면 안의 먹물 친구를 한꺼번에 씻겨 주고(대왕은 체력의 15%만), 하트가 깎여 있으면 1 회복.
   고쳐 맞히면: 가까운(반경 190) 친구만 씻겨 주는 작은 파동(대왕은 5%). */
export const BLAST_NEAR = 190;
export function quizBlast(w, firstTry) {
  const p = w.p, hw = w.view.w / 2 + 20, hh = w.view.h / 2 + 20;
  let n = 0, healed = false;
  for (const e of w.enemies) {
    if (e.dead) continue;
    const hit = firstTry ? Math.abs(e.x - p.x) < hw && Math.abs(e.y - p.y) < hh : d2(e.x, e.y, p.x, p.y) < (BLAST_NEAR + e.r) * (BLAST_NEAR + e.r);
    if (!hit) continue;
    if (e.kind === "boss") damage(w, e, e.max * (firstTry ? 0.15 : 0.05));
    else { damage(w, e, e.hp + 1); n++; }
  }
  w.enemies = w.enemies.filter(e => !e.dead);
  const R = firstTry ? Math.hypot(hw, hh) : BLAST_NEAR;
  for (const k of w.inks) if (firstTry || d2(k.x, k.y, p.x, p.y) < R * R) k.dead = true;
  w.inks = w.inks.filter(k => !k.dead);
  if (firstTry && w.hearts < w.maxHearts) { w.hearts++; healed = true; }
  w.fx.rings.push({ x: p.x, y: p.y, t: 0, T: firstTry ? 0.9 : 0.6, R, color: firstTry ? "#8ff0ff" : "#bff3ff", big: firstTry });
  if (firstTry) w.fx.rings.push({ x: p.x, y: p.y, t: -0.15, T: 0.9, R: R * 0.8, color: "#ffffff", big: true });
  w.blasts++; w.blastWashed += n;
  emit(w, "blast", { n, firstTry, healed });
  return { n, healed };
}

// 판이 끝났을 때 저장에 넘길 기록
export function runRecord(w) {
  const pilot = L.PILOTS[w.kid] || L.PILOTS[1];
  return { kid: pilot.kid, time: Math.floor(Math.min(L.RUN_TIME, w.t)), solved: w.solved, firstTries: w.firstTries, rescued: w.rescued, dex: Object.assign({}, w.dex), result: w.over ? w.over.result : "tired", gems: w.gems, blasts: w.blasts, blastWashed: w.blastWashed, quizGear: w.quizGear };
}
