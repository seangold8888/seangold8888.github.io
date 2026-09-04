// 별빛 카트 배틀 — shared contracts. Read-only for module agents.
"use strict";

export const RACE = Object.freeze({
  LAPS: 3,
  RACERS: 6,
  MANA_MAX: 5,
  MANA_TICK_SECONDS: 6,
  HAND_SIZE: 3,
  DECK_SIZE: 10,
  TOP_SPEED: 28,
  BOOST_SPEED: 36,
  OFFTRACK_FACTOR: 0.55,
  KART_RADIUS: 1.1,
  COUNTDOWN_SECONDS: 3,
});

// Effect names understood by Vehicle.applyEffect
export const EFFECT = Object.freeze({
  BOOST: "boost",         // { type, seconds }
  SPIN: "spin",           // { type }
  SHIELD: "shield",       // { type, seconds }
  SLOW: "slow",           // { type, seconds, factor }
  KNOCKBACK: "knockback", // { type, from:{x,z}, force }
  STUN: "stun",           // { type, seconds }
  TELEPORT: "teleport",   // { type, meters }  — handled by integrator via track.sample
});

// Racers = hub heroes (public domain). color = kart body, accent = driver.
export const HEROES = Object.freeze([
  { id: "cinderella", name: "신데렐라", emoji: "👠", color: 0xf4b6c2, accent: 0xfff1a8, spec: { accel: 1.05, topSpeed: 1.0, handling: 1.1, weight: 0.9 } },
  { id: "honggildong", name: "홍길동", emoji: "🏹", color: 0x3b6fd6, accent: 0xffffff, spec: { accel: 1.1, topSpeed: 1.0, handling: 1.05, weight: 0.95 } },
  { id: "sunwukong", name: "손오공", emoji: "🐒", color: 0xd63b3b, accent: 0xffd93d, spec: { accel: 1.15, topSpeed: 1.05, handling: 0.95, weight: 0.9 } },
  { id: "redhood", name: "빨간 모자", emoji: "🧢", color: 0xc8322b, accent: 0xfff6e6, spec: { accel: 1.0, topSpeed: 0.98, handling: 1.15, weight: 0.85 } },
  { id: "polyphemus", name: "폴리페모스", emoji: "👁️", color: 0x6b6f7a, accent: 0xb9a37a, spec: { accel: 0.85, topSpeed: 1.08, handling: 0.85, weight: 1.35 } },
  { id: "tiger", name: "호랑이", emoji: "🐯", color: 0xf59a23, accent: 0x2b2350, spec: { accel: 1.05, topSpeed: 1.02, handling: 1.0, weight: 1.05 } },
]);

export const TRACKS = Object.freeze(["meadow", "castle", "sky"]);

// Minimal event bus shared by modules.
export class EventBus {
  constructor() { this.map = new Map(); }
  on(name, fn) { const l = this.map.get(name) || []; l.push(fn); this.map.set(name, l); return () => this.off(name, fn); }
  off(name, fn) { const l = this.map.get(name) || []; this.map.set(name, l.filter((f) => f !== fn)); }
  emit(name, payload) { (this.map.get(name) || []).slice().forEach((fn) => fn(payload)); }
}

// Event names emitted by the race manager / modules.
export const EVENTS = Object.freeze({
  COUNTDOWN: "countdown",       // { n }
  RACE_START: "race:start",
  LAP: "lap",                   // { vehicleId, lap }
  CHECKPOINT: "checkpoint",     // { vehicleId, index }
  CARD_PLAYED: "card:played",   // { vehicleId, cardId }
  HIT: "hit",                   // { vehicleId, byId, kind }
  FINISH: "finish",             // { vehicleId, rank, time }
  RACE_END: "race:end",         // { rankings }
});

export function createRaceState(track) {
  return { track, vehicles: [], player: null, time: 0, started: false, finished: false, threats: [] };
}

// Small deterministic RNG (mulberry32) for tests and replays.
export function makeRng(seed = 1) {
  let a = seed >>> 0;
  return function rng() {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function clamp(v, lo, hi) { return v < lo ? lo : v > hi ? hi : v; }
export function lerp(a, b, t) { return a + (b - a) * t; }
export function wrapAngle(a) { while (a > Math.PI) a -= Math.PI * 2; while (a < -Math.PI) a += Math.PI * 2; return a; }
export function dist2(ax, az, bx, bz) { const dx = ax - bx, dz = az - bz; return dx * dx + dz * dz; }
