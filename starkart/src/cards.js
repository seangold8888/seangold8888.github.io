// 별빛 카트 배틀 — 카드 시스템 (Agent CARDS)
// Owns: CARD_LIBRARY, createCardSystem, renderHand.
// All race logic runs without THREE/DOM; meshes are built only when { THREE, scene } are supplied.
"use strict";

import { RACE, EFFECT, EVENTS, clamp } from "./contracts.js";

// ---------------------------------------------------------------------------
// Tunables (meters, seconds)
// ---------------------------------------------------------------------------
const PROJECTILE_SPEED = 40;
const PROJECTILE_RANGE = 60;
const HIT_RADIUS = RACE.KART_RADIUS + 0.5;   // 1.6 m
const OIL_RADIUS = RACE.KART_RADIUS + 0.3;   // 1.4 m
const OIL_SECONDS = 20;
const OIL_COOLDOWN = 3;
const OIL_BEHIND = 2;
const HELPER_SPEED = 40;
const HELPER_LEAD = 3;                       // spawn this far ahead of owner
const THREAT_RANGE = 60;
const THREAT_LANE = 4;                       // perpendicular miss distance still counted as a threat
const SUBSTEP = 1.0;                         // max meters moved per collision sub-step

// ---------------------------------------------------------------------------
// Card library — 10 cards, each tied to a hub hero (public-domain tales)
// ---------------------------------------------------------------------------
export const CARD_LIBRARY = Object.freeze([
  Object.freeze({
    id: "pebble", name: "조약돌 던지기", emoji: "🪨", hero: "polyphemus", heroName: "폴리페모스",
    cost: 2, kind: "attack", desc: "앞 카트를 맞춰 빙글!",
    effect: Object.freeze({ type: "projectile", speed: PROJECTILE_SPEED, dmgEffect: Object.freeze({ type: EFFECT.SPIN }), range: PROJECTILE_RANGE }),
  }),
  Object.freeze({
    id: "glass_shoe", name: "유리 구두", emoji: "👠", hero: "cinderella", heroName: "신데렐라",
    cost: 2, kind: "defense", desc: "4초 동안 반짝 방패!",
    effect: Object.freeze({ type: "self", effect: Object.freeze({ type: EFFECT.SHIELD, seconds: 4 }) }),
  }),
  Object.freeze({
    id: "pumpkin_coach", name: "호박 마차", emoji: "🎃", hero: "cinderella", heroName: "신데렐라",
    cost: 2, kind: "boost", desc: "3초 동안 쌩쌩 빨라져!",
    effect: Object.freeze({ type: "self", effect: Object.freeze({ type: EFFECT.BOOST, seconds: 3 }) }),
  }),
  Object.freeze({
    id: "sesame_oil", name: "참기름", emoji: "🍶", hero: "tiger", heroName: "호랑이",
    cost: 2, kind: "trick", desc: "뒤에 미끌미끌 기름!",
    effect: Object.freeze({ type: "drop", hazard: "oil", behind: true }),
  }),
  Object.freeze({
    id: "blizzard", name: "눈보라", emoji: "❄️", hero: "snowqueen", heroName: "눈의 여왕",
    cost: 3, kind: "trick", desc: "다른 카트 모두 느려져!",
    effect: Object.freeze({ type: "aoe_others", radius: Infinity, effect: Object.freeze({ type: EFFECT.SLOW, seconds: 3, factor: 0.65 }) }),
  }),
  Object.freeze({
    id: "rice_cake", name: "떡 하나", emoji: "🍡", hero: "tiger", heroName: "호랑이",
    cost: 1, kind: "boost", desc: "별사탕 2개 받아!",
    effect: Object.freeze({ type: "mana", amount: 2 }),
  }),
  Object.freeze({
    id: "wolf_blow", name: "늑대 후― 불기", emoji: "🌬️", hero: "wolf", heroName: "늑대",
    cost: 2, kind: "attack", desc: "가까운 카트 훅 날려!",
    effect: Object.freeze({ type: "nearby", radius: 8, effect: Object.freeze({ type: EFFECT.KNOCKBACK, force: 12 }) }),
  }),
  Object.freeze({
    id: "call_hunter", name: "사냥꾼 부르기", emoji: "🎺", hero: "redhood", heroName: "빨간 모자",
    cost: 3, kind: "trick", desc: "사냥꾼이 앞 카트 쾅!",
    effect: Object.freeze({ type: "summon_helper", seconds: 5 }),
  }),
  Object.freeze({
    id: "flash_step", name: "동에 번쩍 서에 번쩍", emoji: "⚡", hero: "honggildong", heroName: "홍길동",
    cost: 3, kind: "trick", desc: "앞으로 25m 순간이동!",
    effect: Object.freeze({ type: "teleport_forward", meters: 25 }),
  }),
  Object.freeze({
    id: "river_water", name: "대동강 물 한 바가지", emoji: "🪣", hero: "kimseondal", heroName: "김선달",
    cost: 1, kind: "trick", desc: "앞 카트 별사탕 1개 뺏기!",
    effect: Object.freeze({ type: "steal_mana", amount: 1 }),
  }),
]);

const CARD_BY_ID = new Map(CARD_LIBRARY.map((c) => [c.id, c]));
export function getCard(id) { return CARD_BY_ID.get(id) || null; }

// ---------------------------------------------------------------------------
// Small helpers (pure)
// ---------------------------------------------------------------------------
function shuffle(arr, rng) {
  const a = arr.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    const t = a[i]; a[i] = a[j]; a[j] = t;
  }
  return a;
}
function fwd(v) { const h = v.state?.heading || 0; return { x: Math.sin(h), z: Math.cos(h) }; }
function isShielded(v) { return (v?.state?.shieldTimer || 0) > 0; }
function isFinished(v) { return !!(v?.state?.finished || v?.finished); }
// Race-order score: higher = further ahead. Prefers rank (1 = leader) when present.
function progressScore(v) {
  const s = v.state || {};
  if (typeof s.rank === "number" && s.rank > 0) return -s.rank;
  return (s.lap || 0) * 1e6 + (s.checkpoint || 0) * 1e3 + (s.progress || 0);
}

// ---------------------------------------------------------------------------
// Optional Three.js visuals (shared geometry/material, no per-entity churn)
// ---------------------------------------------------------------------------
function makeGfx(THREE, scene) {
  if (!THREE || !scene) return null;
  const mk = (geo, color, emissive) => ({
    geo,
    mat: new THREE.MeshStandardMaterial({ color, emissive, emissiveIntensity: 0.8, roughness: 0.6 }),
  });
  const res = {
    projectile: mk(new THREE.SphereGeometry(0.38, 10, 8), 0xffd93d, 0xffa500),
    oil: mk(new THREE.CylinderGeometry(1.25, 1.25, 0.06, 18), 0x3a2f5a, 0x201a40),
    helper: mk(new THREE.BoxGeometry(0.9, 0.7, 1.2), 0xc8322b, 0x7a1f1a),
  };
  return {
    spawn(kind, x, y, z) {
      const r = res[kind];
      const m = new THREE.Mesh(r.geo, r.mat);
      m.position.set(x, y, z);
      scene.add(m);
      return m;
    },
    remove(mesh) { if (mesh) scene.remove(mesh); },
    dispose() {
      for (const k of Object.keys(res)) { res[k].geo.dispose(); res[k].mat.dispose(); }
    },
  };
}

// ---------------------------------------------------------------------------
// Card system
// ---------------------------------------------------------------------------
/**
 * createCardSystem({ race, vfx, audio, rng, onTeleport, THREE, scene })
 * race = { vehicles, started, track?, bus? }
 */
export function createCardSystem(opts = {}) {
  const { race = {}, vfx = null, audio = null, onTeleport = null, THREE = null, scene = null } = opts;
  const rng = typeof opts.rng === "function" ? opts.rng : Math.random;
  const gfx = makeGfx(THREE, scene);

  const players = new Map();   // vehicleId -> { vehicle, deck, hand, discard, mana, clock }
  const projectiles = [];      // { x, z, vx, vz, ownerId, mesh, traveled, range, dmgEffect, kind }
  const slicks = [];           // { x, z, ownerId, mesh, ttl, cooldown: Map, kind }
  const helpers = [];          // { x, z, vx, vz, t, ownerId, mesh, ttl, kind }

  const vehicles = () => (Array.isArray(race.vehicles) && race.vehicles.length
    ? race.vehicles
    : Array.from(players.values(), (p) => p.vehicle));
  const findVehicle = (id) => players.get(id)?.vehicle || vehicles().find((v) => v.id === id) || null;
  const bus = () => race.bus || null;

  // -- deck ---------------------------------------------------------------
  function draw(p) {
    if (p.deck.length === 0 && p.discard.length) { p.deck = shuffle(p.discard, rng); p.discard = []; }
    const id = p.deck.pop();
    if (id) p.hand.push(id);
    return id || null;
  }
  function fillHand(p) { while (p.hand.length < RACE.HAND_SIZE && (p.deck.length || p.discard.length)) draw(p); }

  function attach(vehicle) {
    if (!vehicle || vehicle.id == null) throw new Error("attach: vehicle with id required");
    const p = { vehicle, deck: shuffle(CARD_LIBRARY.map((c) => c.id), rng), hand: [], discard: [], mana: 0, clock: 0 };
    fillHand(p);
    players.set(vehicle.id, p);
    return p.hand.slice();
  }
  function detach(vehicleId) { players.delete(vehicleId); }

  // -- mana ---------------------------------------------------------------
  function addMana(vehicleId, n = 1) {
    const p = players.get(vehicleId); if (!p) return 0;
    p.mana = clamp(p.mana + n, 0, RACE.MANA_MAX);
    return p.mana;
  }
  function onCheckpoint(vehicleId) { addMana(vehicleId, 1); }
  function onLap(vehicleId) {
    const p = players.get(vehicleId); if (!p) return;
    if (p.hand.length < RACE.HAND_SIZE) draw(p);
  }

  // -- hits ---------------------------------------------------------------
  function landHit(target, ownerId, effect, kind, pos) {
    if (isShielded(target)) { vfx?.hit?.(pos, "shield"); return false; }
    target.applyEffect?.(effect);
    vfx?.hit?.(pos, kind);
    audio?.hit?.();
    bus()?.emit?.(EVENTS.HIT, { vehicleId: target.id, byId: ownerId, kind });
    return true;
  }
  function firstKartWithin(x, z, radius, excludeId) {
    const r2 = radius * radius;
    let best = null, bestD = Infinity;
    for (const v of vehicles()) {
      if (v.id === excludeId || !v.state) continue;
      const dx = v.state.x - x, dz = v.state.z - z, d = dx * dx + dz * dz;
      if (d <= r2 && d < bestD) { best = v; bestD = d; }
    }
    return best;
  }

  // -- spawners -----------------------------------------------------------
  function spawnProjectile(owner, eff) {
    const f = fwd(owner);
    const x = owner.state.x + f.x * (RACE.KART_RADIUS + 0.6);
    const z = owner.state.z + f.z * (RACE.KART_RADIUS + 0.6);
    const speed = eff.speed || PROJECTILE_SPEED;
    const e = {
      kind: "projectile", x, z, vx: f.x * speed, vz: f.z * speed, ownerId: owner.id,
      traveled: 0, range: eff.range || PROJECTILE_RANGE, dmgEffect: eff.dmgEffect || { type: EFFECT.SPIN },
      mesh: gfx ? gfx.spawn("projectile", x, 0.6, z) : null,
    };
    projectiles.push(e);
    return e;
  }
  function spawnOil(owner) {
    const f = fwd(owner);
    const x = owner.state.x - f.x * OIL_BEHIND, z = owner.state.z - f.z * OIL_BEHIND;
    const e = {
      kind: "oil", x, z, ownerId: owner.id, ttl: OIL_SECONDS,
      cooldown: new Map([[owner.id, 2]]),   // owner can't slip on their own fresh slick
      mesh: gfx ? gfx.spawn("oil", x, 0.04, z) : null,
    };
    slicks.push(e);
    return e;
  }
  function spawnHelper(owner, eff) {
    const track = race.track;
    const f = fwd(owner);
    let x = owner.state.x + f.x * HELPER_LEAD, z = owner.state.z + f.z * HELPER_LEAD, t = null;
    if (track?.project && track?.sample && track.length > 0) {
      t = (track.project(owner.state.x, owner.state.z).t + HELPER_LEAD / track.length) % 1;
      const s = track.sample(t); x = s.position.x; z = s.position.z;
    }
    const e = {
      kind: "helper", x, z, vx: f.x * HELPER_SPEED, vz: f.z * HELPER_SPEED, t, ownerId: owner.id,
      ttl: eff.seconds || 5, mesh: gfx ? gfx.spawn("helper", x, 0.5, z) : null,
    };
    helpers.push(e);
    return e;
  }
  function removeEntity(list, i) { const e = list[i]; gfx?.remove(e.mesh); e.mesh = null; list.splice(i, 1); }

  // -- effect resolution --------------------------------------------------
  function resolve(p, card) {
    const owner = p.vehicle, eff = card.effect, s = owner.state || {};
    const here = { x: s.x || 0, z: s.z || 0 };
    switch (eff.type) {
      case "projectile": spawnProjectile(owner, eff); return true;
      case "self":
        owner.applyEffect?.(eff.effect);
        if (eff.effect.type === EFFECT.SHIELD) vfx?.shield?.(owner, true);
        if (eff.effect.type === EFFECT.BOOST) vfx?.boostTrail?.(owner);
        return true;
      case "drop": spawnOil(owner); return true;
      case "aoe_others": {
        const r2 = eff.radius === Infinity ? Infinity : eff.radius * eff.radius;
        for (const v of vehicles()) {
          if (v.id === owner.id || !v.state) continue;
          const dx = v.state.x - here.x, dz = v.state.z - here.z;
          if (dx * dx + dz * dz > r2) continue;
          landHit(v, owner.id, eff.effect, card.kind === "trick" ? "snow" : card.kind, { x: v.state.x, y: 0.5, z: v.state.z });
        }
        return true;
      }
      case "mana": addMana(owner.id, eff.amount || 1); return true;
      case "nearby": {
        const r2 = eff.radius * eff.radius;
        for (const v of vehicles()) {
          if (v.id === owner.id || !v.state) continue;
          const dx = v.state.x - here.x, dz = v.state.z - here.z;
          if (dx * dx + dz * dz > r2) continue;
          landHit(v, owner.id, { ...eff.effect, from: { x: here.x, z: here.z } }, "wolf", { x: v.state.x, y: 0.5, z: v.state.z });
        }
        return true;
      }
      case "summon_helper": spawnHelper(owner, eff); return true;
      case "teleport_forward":
        if (typeof onTeleport === "function") onTeleport(owner, eff.meters);
        else owner.applyEffect?.({ type: EFFECT.TELEPORT, meters: eff.meters });
        vfx?.hit?.({ x: here.x, y: 0.5, z: here.z }, "teleport");
        return true;
      case "steal_mana": {
        const target = racerAhead(owner) || racerBehind(owner);
        if (!target) return true;
        const tp = players.get(target.id);
        if (!tp) return true;
        const took = Math.min(eff.amount || 1, tp.mana);
        tp.mana -= took;
        addMana(owner.id, took);
        vfx?.hit?.({ x: target.state?.x || 0, y: 0.5, z: target.state?.z || 0 }, "steal");
        return true;
      }
      default: return false;
    }
  }
  function racerAhead(owner) {
    const mine = progressScore(owner);
    let best = null, bestScore = Infinity;
    for (const v of vehicles()) {
      if (v.id === owner.id) continue;
      const sc = progressScore(v);
      if (sc > mine && sc < bestScore) { best = v; bestScore = sc; }
    }
    return best;
  }
  function racerBehind(owner) {
    const mine = progressScore(owner);
    let best = null, bestScore = -Infinity;
    for (const v of vehicles()) {
      if (v.id === owner.id) continue;
      const sc = progressScore(v);
      if (sc < mine && sc > bestScore) { best = v; bestScore = sc; }
    }
    return best;
  }

  // -- play ---------------------------------------------------------------
  function play(vehicleId, cardId) {
    const p = players.get(vehicleId); if (!p) return false;
    const card = CARD_BY_ID.get(cardId); if (!card) return false;
    const idx = p.hand.indexOf(cardId); if (idx < 0) return false;
    if (p.mana < card.cost) return false;
    if (isFinished(p.vehicle)) return false;
    p.mana -= card.cost;
    p.hand.splice(idx, 1);
    p.discard.push(cardId);
    resolve(p, card);
    fillHand(p);
    audio?.card?.(card.kind);
    bus()?.emit?.(EVENTS.CARD_PLAYED, { vehicleId, cardId, kind: card.kind });
    return true;
  }

  // -- update -------------------------------------------------------------
  function update(dt) {
    if (!(dt > 0)) return;
    if (race.started) {
      for (const p of players.values()) {
        if (isFinished(p.vehicle)) continue;
        p.clock += dt;
        while (p.clock >= RACE.MANA_TICK_SECONDS) { p.clock -= RACE.MANA_TICK_SECONDS; addMana(p.vehicle.id, 1); }
      }
    }
    updateProjectiles(dt);
    updateSlicks(dt);
    updateHelpers(dt);
  }

  function updateProjectiles(dt) {
    for (let i = projectiles.length - 1; i >= 0; i--) {
      const e = projectiles[i];
      const speed = Math.hypot(e.vx, e.vz);
      const maxStep = speed > 0 ? SUBSTEP / speed : dt;
      let remaining = dt, done = false;
      while (remaining > 0 && !done) {
        const step = Math.min(remaining, maxStep); remaining -= step;
        e.x += e.vx * step; e.z += e.vz * step; e.traveled += speed * step;
        const target = firstKartWithin(e.x, e.z, HIT_RADIUS, e.ownerId);
        if (target) { landHit(target, e.ownerId, e.dmgEffect, "projectile", { x: e.x, y: 0.6, z: e.z }); done = true; }
        else if (e.traveled >= e.range) done = true;
      }
      if (done) removeEntity(projectiles, i);
      else if (e.mesh) { e.mesh.position.x = e.x; e.mesh.position.z = e.z; e.mesh.rotation.y += dt * 12; }
    }
  }

  function updateSlicks(dt) {
    for (let i = slicks.length - 1; i >= 0; i--) {
      const e = slicks[i];
      e.ttl -= dt;
      if (e.ttl <= 0) { removeEntity(slicks, i); continue; }
      for (const [id, cd] of e.cooldown) { const n = cd - dt; if (n <= 0) e.cooldown.delete(id); else e.cooldown.set(id, n); }
      const r2 = OIL_RADIUS * OIL_RADIUS;
      for (const v of vehicles()) {
        if (!v.state || e.cooldown.has(v.id)) continue;
        const dx = v.state.x - e.x, dz = v.state.z - e.z;
        if (dx * dx + dz * dz > r2) continue;
        e.cooldown.set(v.id, OIL_COOLDOWN);
        landHit(v, e.ownerId, { type: EFFECT.SPIN }, "oil", { x: e.x, y: 0.3, z: e.z });
      }
      if (e.mesh && e.ttl < 2) e.mesh.scale.setScalar(Math.max(0.05, e.ttl / 2));
    }
  }

  function updateHelpers(dt) {
    const track = race.track;
    for (let i = helpers.length - 1; i >= 0; i--) {
      const e = helpers[i];
      e.ttl -= dt;
      if (e.ttl <= 0) { removeEntity(helpers, i); continue; }
      const px = e.x, pz = e.z;
      if (e.t != null && track?.sample && track.length > 0) {
        e.t = (e.t + (HELPER_SPEED * dt) / track.length) % 1;
        const s = track.sample(e.t); e.x = s.position.x; e.z = s.position.z;
      } else {
        e.x += e.vx * dt; e.z += e.vz * dt;
      }
      if (dt > 0) { e.vx = (e.x - px) / dt; e.vz = (e.z - pz) / dt; }
      const target = firstKartWithin(e.x, e.z, HIT_RADIUS, e.ownerId);
      if (target) {
        landHit(target, e.ownerId, { type: EFFECT.KNOCKBACK, from: { x: e.x, z: e.z }, force: 12 }, "helper", { x: e.x, y: 0.5, z: e.z });
        removeEntity(helpers, i);
        continue;
      }
      if (e.mesh) {
        e.mesh.position.x = e.x; e.mesh.position.z = e.z;
        if (e.vx || e.vz) e.mesh.rotation.y = Math.atan2(e.vx, e.vz);
      }
    }
  }

  // -- AI threat query ----------------------------------------------------
  function threats(vehicleId) {
    const v = findVehicle(vehicleId);
    if (!v?.state) return [];
    const out = [];
    const scan = (list) => {
      for (const e of list) {
        if (e.ownerId === vehicleId) continue;
        const sp = Math.hypot(e.vx, e.vz);
        if (sp <= 0) continue;
        const dx = v.state.x - e.x, dz = v.state.z - e.z;
        const dist = Math.hypot(dx, dz);
        if (dist > THREAT_RANGE) continue;
        const along = (dx * e.vx + dz * e.vz) / sp;        // distance ahead along the entity's path
        if (along <= 0) continue;
        const perp = Math.abs(dx * e.vz - dz * e.vx) / sp; // miss distance
        if (e.kind === "projectile" && perp > THREAT_LANE) continue;
        if (e.kind === "helper" && perp > THREAT_LANE * 2) continue;
        out.push({ position: { x: e.x, z: e.z }, velocity: { x: e.vx, z: e.vz }, targetId: vehicleId, kind: e.kind, eta: along / sp });
      }
    };
    scan(projectiles); scan(helpers);
    out.sort((a, b) => a.eta - b.eta);
    return out;
  }

  // -- queries ------------------------------------------------------------
  function getHand(vehicleId) { const p = players.get(vehicleId); return p ? p.hand.map((id) => CARD_BY_ID.get(id)) : []; }
  function getMana(vehicleId) { return players.get(vehicleId)?.mana ?? 0; }
  function getDeck(vehicleId) { return players.get(vehicleId)?.deck.slice() ?? []; }
  function getDiscard(vehicleId) { return players.get(vehicleId)?.discard.slice() ?? []; }
  function canPlay(vehicleId, cardId) {
    const p = players.get(vehicleId), c = CARD_BY_ID.get(cardId);
    return !!(p && c && p.hand.includes(cardId) && p.mana >= c.cost && !isFinished(p.vehicle));
  }
  // Debug/tutorial helper: force a specific hand (cards taken out of deck/discard).
  function setHand(vehicleId, cardIds) {
    const p = players.get(vehicleId); if (!p) return;
    const want = cardIds.filter((id) => CARD_BY_ID.has(id)).slice(0, RACE.HAND_SIZE);
    const rest = CARD_LIBRARY.map((c) => c.id).filter((id) => !want.includes(id));
    p.hand = want; p.deck = shuffle(rest, rng); p.discard = [];
  }
  function reset() {
    while (projectiles.length) removeEntity(projectiles, projectiles.length - 1);
    while (slicks.length) removeEntity(slicks, slicks.length - 1);
    while (helpers.length) removeEntity(helpers, helpers.length - 1);
    players.clear();
  }
  function dispose() { reset(); gfx?.dispose(); }

  return {
    attach, detach, update, play, canPlay, onCheckpoint, onLap, addMana,
    getHand, getMana, getDeck, getDiscard, setHand, threats, reset, dispose,
    projectiles, slicks, helpers,
    get players() { return players; },
  };
}

// ---------------------------------------------------------------------------
// DOM: hand renderer (guarded — no-op in Node)
// ---------------------------------------------------------------------------
const HAND_STYLE_ID = "sk-hand-style";
const HAND_CSS = `
.sk-hand{display:flex;flex-direction:column;align-items:center;gap:6px;font-family:"Apple SD Gothic Neo","Noto Sans KR","Malgun Gothic",system-ui,sans-serif;user-select:none;-webkit-user-select:none;touch-action:manipulation;pointer-events:auto}
.sk-hand .sk-mana{display:flex;gap:3px;align-items:center;background:rgba(32,26,64,.88);border:2px solid rgba(255,217,61,.55);border-radius:999px;padding:3px 12px;box-shadow:0 2px 10px rgba(0,0,0,.35)}
.sk-hand .sk-mana-label{color:#fff6e6;font-size:11px;font-weight:700;margin-right:4px;letter-spacing:.02em}
.sk-hand .sk-star{font-size:18px;line-height:1;opacity:.22;filter:grayscale(1);transition:opacity .2s,transform .2s}
.sk-hand .sk-star.on{opacity:1;filter:none;text-shadow:0 0 8px #ffd93d,0 0 16px rgba(255,217,61,.6);transform:scale(1.08)}
.sk-hand .sk-cards{display:flex;gap:10px;align-items:flex-end;padding:12px 8px 6px}
.sk-hand .sk-card{position:relative;box-sizing:border-box;min-width:60px;min-height:60px;width:86px;height:112px;border-radius:14px;border:3px solid #ffd93d;background:linear-gradient(180deg,#fff6e6 0%,#ffe9c9 100%);color:#201a40;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:3px;padding:8px 4px 6px;margin:0;font-family:inherit;cursor:pointer;box-shadow:0 4px 0 #b8912a,0 8px 16px rgba(0,0,0,.4);transition:transform .12s ease,opacity .2s,filter .2s;-webkit-tap-highlight-color:transparent;outline:none}
.sk-hand .sk-card[data-kind="attack"]{border-color:#ff8a8a}
.sk-hand .sk-card[data-kind="defense"]{border-color:#7ad0ff}
.sk-hand .sk-card[data-kind="boost"]{border-color:#ffb347}
.sk-hand .sk-card[data-kind="trick"]{border-color:#c48cff}
.sk-hand .sk-card:active:not(:disabled){transform:translateY(3px) scale(.96);box-shadow:0 1px 0 #b8912a,0 3px 8px rgba(0,0,0,.4)}
.sk-hand .sk-card:disabled,.sk-hand .sk-card.is-dim{opacity:.42;filter:saturate(.35);cursor:default;box-shadow:0 2px 0 #7c6a3d}
.sk-hand .sk-card:focus-visible{box-shadow:0 0 0 3px #fff6e6,0 4px 0 #b8912a}
.sk-hand .sk-emoji{font-size:36px;line-height:1;filter:drop-shadow(0 2px 2px rgba(0,0,0,.25))}
.sk-hand .sk-name{font-size:12px;font-weight:800;text-align:center;line-height:1.15;word-break:keep-all;max-width:100%}
.sk-hand .sk-cost{position:absolute;top:-11px;left:-8px;background:#201a40;color:#ffd93d;font-size:11px;font-weight:700;line-height:1;border-radius:999px;padding:4px 6px;border:2px solid #ffd93d;white-space:nowrap;letter-spacing:-1px}
.sk-hand .sk-key{position:absolute;top:-9px;right:-6px;background:#fff6e6;color:#201a40;font-size:11px;font-weight:800;line-height:1;border-radius:8px;padding:3px 6px;border:2px solid #201a40}
.sk-hand.is-locked .sk-cards{filter:grayscale(.3)}
@media (max-height:420px){.sk-hand .sk-card{width:72px;height:92px}.sk-hand .sk-emoji{font-size:30px}.sk-hand .sk-name{font-size:11px}}
`;

function ensureStyle() {
  if (typeof document === "undefined") return;
  if (document.getElementById(HAND_STYLE_ID)) return;
  const st = document.createElement("style");
  st.id = HAND_STYLE_ID;
  st.textContent = HAND_CSS;
  (document.head || document.documentElement).appendChild(st);
}

const handState = new WeakMap();

/**
 * renderHand(rootEl, hand, mana, onPlay, opts)
 * hand: array of card objects (or ids). onPlay(cardId, card). opts: { locked, hotkeys:boolean }
 * Re-renders efficiently: buttons are reused when the id sequence is unchanged.
 */
export function renderHand(rootEl, hand = [], mana = 0, onPlay, opts = {}) {
  if (typeof document === "undefined" || !rootEl) return;
  ensureStyle();
  let st = handState.get(rootEl);
  if (!st) {
    rootEl.classList.add("sk-hand");
    rootEl.textContent = "";
    const manaEl = document.createElement("div");
    manaEl.className = "sk-mana";
    manaEl.setAttribute("role", "status");
    const label = document.createElement("span");
    label.className = "sk-mana-label";
    label.textContent = "별사탕";
    manaEl.appendChild(label);
    const stars = [];
    for (let i = 0; i < RACE.MANA_MAX; i++) {
      const s = document.createElement("span");
      s.className = "sk-star";
      s.textContent = "⭐";
      manaEl.appendChild(s);
      stars.push(s);
    }
    const cardsEl = document.createElement("div");
    cardsEl.className = "sk-cards";
    rootEl.appendChild(manaEl);
    rootEl.appendChild(cardsEl);
    st = { manaEl, stars, cardsEl, buttons: new Map(), ids: "", onPlay: null };
    handState.set(rootEl, st);
  }
  st.onPlay = onPlay;

  // mana row
  const m = clamp(Math.round(mana), 0, RACE.MANA_MAX);
  st.stars.forEach((s, i) => s.classList.toggle("on", i < m));
  st.manaEl.setAttribute("aria-label", `별사탕 ${m}개`);

  // cards
  const cards = hand.map((c) => (typeof c === "string" ? CARD_BY_ID.get(c) : c)).filter(Boolean);
  const key = cards.map((c) => c.id).join("|");
  if (key !== st.ids) {
    const keep = new Set(cards.map((c) => c.id));
    for (const [id, b] of st.buttons) if (!keep.has(id)) { b.remove(); st.buttons.delete(id); }
    cards.forEach((card) => {
      let b = st.buttons.get(card.id);
      if (!b) { b = buildChip(card, st); st.buttons.set(card.id, b); }
      st.cardsEl.appendChild(b); // appendChild moves existing nodes into the right order
    });
    st.ids = key;
  }
  rootEl.classList.toggle("is-locked", !!opts.locked);
  cards.forEach((card, i) => {
    const b = st.buttons.get(card.id);
    const can = !opts.locked && m >= card.cost;
    b.disabled = !can;
    b.classList.toggle("is-dim", !can);
    b.setAttribute("aria-disabled", String(!can));
    const keyEl = b.querySelector(".sk-key");
    if (opts.hotkeys === false) keyEl.hidden = true;
    else { keyEl.hidden = false; keyEl.textContent = String(i + 1); }
  });
}

function buildChip(card, st) {
  const b = document.createElement("button");
  b.type = "button";
  b.className = "sk-card";
  b.dataset.cardId = card.id;
  b.dataset.kind = card.kind;
  b.title = `${card.name} — ${card.desc}`;
  b.setAttribute("aria-label", `${card.name}, 별사탕 ${card.cost}개, ${card.desc}`);
  const cost = document.createElement("span");
  cost.className = "sk-cost";
  cost.textContent = "⭐".repeat(card.cost);
  const key = document.createElement("span");
  key.className = "sk-key";
  const emoji = document.createElement("span");
  emoji.className = "sk-emoji";
  emoji.textContent = card.emoji;
  const name = document.createElement("span");
  name.className = "sk-name";
  name.textContent = card.name;
  b.append(cost, key, emoji, name);
  b.addEventListener("click", (ev) => {
    ev.preventDefault();
    if (b.disabled) return;
    st.onPlay?.(card.id, card);
  });
  return b;
}
