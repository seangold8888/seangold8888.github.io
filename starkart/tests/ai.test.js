// node --test tests/ai.test.js — AI driver tests with a fake circular track and a fake kart integrator.
import { test } from "node:test";
import assert from "node:assert/strict";
import { createAiDriver } from "../src/ai.js";
import { makeRng } from "../src/contracts.js";

const TAU = Math.PI * 2;
function wrap01(t) { t %= 1; return t < 0 ? t + 1 : t; }

// Circle of radius R in the XZ plane. Centerline p(t) = (R sin 2πt, 0, R cos 2πt), t increasing = heading increasing.
function makeCircleTrack(R = 60, width = 12) {
  const length = TAU * R;
  return {
    id: "circle", name: "원형 테스트", laps: 3, width, length,
    checkpoints: [], startGrid: [], boostPads: [], hazards: [],
    sample(t) {
      const a = TAU * wrap01(t);
      return {
        position: { x: R * Math.sin(a), y: 0, z: R * Math.cos(a) },
        tangent: { x: Math.cos(a), y: 0, z: -Math.sin(a) },
        normal: { x: Math.sin(a), y: 0, z: Math.cos(a) }, // outward = right (+)
      };
    },
    project(x, z) {
      const r = Math.hypot(x, z);
      const t = wrap01(Math.atan2(x, z) / TAU);
      const lateral = r - R;
      return { t, lateral, onTrack: Math.abs(lateral) <= width / 2, height: 0 };
    },
    progressBetween(t0, t1) { return wrap01(t1 - t0) * length; },
  };
}

// Minimal arcade kart. Default follows src/vehicle.js: steer +1 = right = heading DECREASES
// (heading += steerK * steer * yawRate * dt with steerK = -1). steerK = +1 is the inverted convention.
function makeKart(id, track, t0 = 0, { steerK = -1, frozen = false } = {}) {
  const s0 = track.sample(t0);
  const kart = {
    id, isPlayer: false,
    spec: { accel: 1, topSpeed: 1, handling: 1, weight: 1 },
    state: {
      x: s0.position.x, y: 0, z: s0.position.z,
      heading: Math.atan2(s0.tangent.x, s0.tangent.z),
      speed: 0, vx: 0, vz: 0, drifting: false, driftCharge: 0,
      boostTimer: 0, spinTimer: 0, shieldTimer: 0, stunTimer: 0, airborne: false,
      lap: 0, checkpoint: 0, progress: 0, rank: 1,
    },
    update(dt, input) {
      const s = kart.state;
      if (frozen) { s.speed = 0; return; }
      const accel = 14 * input.throttle - 22 * input.brake - 0.25 * s.speed;
      s.speed = Math.max(-4, Math.min(28, s.speed + accel * dt));
      s.heading += steerK * input.steer * 1.8 * dt;
      s.x += Math.sin(s.heading) * s.speed * dt;
      s.z += Math.cos(s.heading) * s.speed * dt;
    },
  };
  return kart;
}

function placeAlong(kart, track, t) {
  const s = track.sample(t);
  kart.state.x = s.position.x;
  kart.state.z = s.position.z;
  kart.state.heading = Math.atan2(s.tangent.x, s.tangent.z);
}

const DT = 1 / 60;

function simulate(kart, driver, seconds, raceState) {
  let maxLat = 0, dist = 0, hops = 0, driftFrames = 0, brakeFrames = 0;
  const steps = Math.round(seconds / DT);
  for (let i = 0; i < steps; i++) {
    const input = driver.think(DT, raceState);
    assert.ok(input.throttle >= 0 && input.throttle <= 1, "throttle in range");
    assert.ok(input.brake >= 0 && input.brake <= 1, "brake in range");
    assert.ok(input.steer >= -1 && input.steer <= 1, "steer in range");
    if (input.hop) hops++;
    if (input.drift) driftFrames++;
    if (input.brake > 0) brakeFrames++;
    kart.update(DT, input);
    dist += Math.abs(kart.state.speed) * DT;
    const lat = Math.abs(kart.project ? 0 : raceState.track.project(kart.state.x, kart.state.z).lateral);
    if (lat > maxLat) maxLat = lat;
    if (raceState.time !== undefined) raceState.time += DT;
  }
  return { maxLat, dist, hops, driftFrames, brakeFrames };
}

test("keeps the kart on a radius-60 circle for 30 s at 60 Hz", () => {
  const track = makeCircleTrack(60);
  const kart = makeKart("ai1", track, 0);
  const driver = createAiDriver({ vehicle: kart, track, difficulty: 0.35, rng: makeRng(7) });
  const raceState = { vehicles: [kart], player: null, track, time: 0, threats: [], started: true };
  const r = simulate(kart, driver, 30, raceState);
  assert.ok(r.maxLat < track.width / 2, `stayed on track (max |lateral| = ${r.maxLat.toFixed(2)} m)`);
  assert.ok(r.dist > 400, `actually raced (${r.dist.toFixed(0)} m)`);
  assert.equal(driver.steerSign, -1, "no spurious steer-sign flip (vehicle.js convention)");
});

test("steer sign points the kart toward the look-ahead target", () => {
  const track = makeCircleTrack(60);
  const kart = makeKart("ai1", track, 0);
  const driver = createAiDriver({ vehicle: kart, track, difficulty: 1, rng: makeRng(1), autoSteerSign: false });
  const base = kart.state.heading;
  kart.state.speed = 10;
  // vehicle.js convention: steer +1 = right = heading decreases.
  kart.state.heading = base + 0.6; // nose too far left (heading too high) → must steer right (+)
  assert.ok(driver.think(DT, {}).steer > 0.5, "nose left of target → positive (right) steer");
  kart.state.heading = base - 0.6; // nose too far right → must steer left (−)
  assert.ok(driver.think(DT, {}).steer < -0.5, "nose right of target → negative (left) steer");

  // closed loop: heading error shrinks under heading -= steer*k*dt
  kart.state.heading = base + 0.6;
  const err0 = Math.abs(kart.state.heading - base);
  for (let i = 0; i < 30; i++) {
    const input = driver.think(DT, {});
    kart.state.heading -= input.steer * 1.8 * DT;
  }
  assert.ok(Math.abs(kart.state.heading - base) < err0 * 0.5, "heading error halves within 0.5 s");

  // explicit steerSign: +1 means steer +1 increases heading
  const inv = createAiDriver({ vehicle: kart, track, difficulty: 1, rng: makeRng(1), steerSign: 1, autoSteerSign: false });
  kart.state.heading = base + 0.6;
  assert.ok(inv.think(DT, {}).steer < -0.5, "steerSign:+1 → negative steer to lower the heading");
});

test("auto-detects an inverted steer convention (heading += steer*k*dt) and still stays on track", () => {
  const track = makeCircleTrack(60);
  const kart = makeKart("ai1", track, 0, { steerK: 1 });
  const driver = createAiDriver({ vehicle: kart, track, difficulty: 0.35, rng: makeRng(3) });
  const raceState = { vehicles: [kart], player: null, track, time: 0, threats: [], started: true };
  const r = simulate(kart, driver, 30, raceState);
  assert.equal(driver.steerSign, 1, "flipped steer sign");
  assert.ok(r.maxLat < track.width / 2, `stayed on track (max |lateral| = ${r.maxLat.toFixed(2)} m)`);
  assert.ok(r.dist > 400, "actually raced");
});

test("drifts (hop then hold) on a long turn and brakes for sharp curvature", () => {
  const track = makeCircleTrack(30); // radius 30 → curvature 1/30, sharper than the drift threshold
  const kart = makeKart("ai1", track, 0);
  const driver = createAiDriver({ vehicle: kart, track, difficulty: 1, rng: makeRng(5) });
  const raceState = { vehicles: [kart], player: null, track, time: 0, threats: [], started: true };
  const r = simulate(kart, driver, 20, raceState);
  assert.ok(r.hops >= 1, "hopped at least once");
  assert.ok(r.driftFrames > 30, "held the drift for a while");
  assert.ok(r.hops < r.driftFrames, "hop is a pulse, drift is a hold");
  assert.ok(r.brakeFrames > 0, "braked for the sharp corner");
  assert.ok(r.maxLat < track.width / 2, `stayed on track (max |lateral| = ${r.maxLat.toFixed(2)} m)`);
});

test("stuck recovery: reverses with opposite steer after 1.5 s at zero speed", () => {
  const track = makeCircleTrack(60);
  const kart = makeKart("ai1", track, 0, { frozen: true });
  kart.state.heading += 0.4; // so the driver wants some steer
  const driver = createAiDriver({ vehicle: kart, track, difficulty: 0.35, rng: makeRng(2), autoSteerSign: false });
  const raceState = { vehicles: [kart], player: null, track, time: 0, threats: [], started: true };
  let lastForward = null;
  let frames = 0;
  // drive into the wall until the driver gives up
  let input;
  for (frames = 0; frames < 200; frames++) {
    input = driver.think(DT, raceState);
    if (input.brake === 1 && input.throttle === 0) break;
    lastForward = input;
    assert.equal(input.throttle, 1, "throttle held while stuck");
  }
  assert.ok(frames >= 88 && frames <= 92, `reversed after ~1.5 s (frame ${frames})`);
  assert.ok(Math.sign(input.steer) === -Math.sign(lastForward.steer), "reverse steer is opposite the last forward steer");
  let reverseFrames = 1;
  while (reverseFrames < 120) {
    const i2 = driver.think(DT, raceState);
    if (!(i2.brake === 1 && i2.throttle === 0)) break;
    reverseFrames++;
  }
  assert.ok(reverseFrames >= 46 && reverseFrames <= 50, `reverse lasts ~0.8 s (${reverseFrames} frames)`);
});

test("rubber band: speedBias positive when far behind the player, negative when far ahead", () => {
  const track = makeCircleTrack(60);
  const kart = makeKart("ai1", track, 0);
  const player = makeKart("player", track, 0);
  player.isPlayer = true;
  const driver = createAiDriver({ vehicle: kart, track, difficulty: 0.35, rng: makeRng(4) });
  const raceState = { vehicles: [kart, player], player, track, time: 0, threats: [], started: true };

  placeAlong(player, track, 60 / track.length); // player 60 m ahead
  driver.think(DT, raceState);
  assert.ok(driver.speedBias > 0 && driver.speedBias <= 0.08, `catch-up bias ${driver.speedBias}`);

  placeAlong(kart, track, 100 / track.length); // now the AI is 40 m ahead
  driver.think(DT, raceState);
  assert.ok(driver.speedBias < 0 && driver.speedBias >= -0.06, `ease-off bias ${driver.speedBias}`);

  placeAlong(kart, track, 65 / track.length); // 5 m ahead: inside the dead zone
  driver.think(DT, raceState);
  assert.equal(driver.speedBias, 0);
});

test("avoids a kart directly ahead by biasing steer to one side", () => {
  const track = makeCircleTrack(60);
  const kart = makeKart("ai1", track, 0);
  kart.state.speed = 15;
  const other = makeKart("ai2", track, 0);
  // 2.5 m straight ahead, nudged slightly to the kart's left (heading-increasing side)
  const fx = Math.sin(kart.state.heading), fz = Math.cos(kart.state.heading);
  const lx = fz, lz = -fx; // left = (fz, -fx)
  other.state.x = kart.state.x + fx * 2.5 + lx * 0.6;
  other.state.z = kart.state.z + fz * 2.5 + lz * 0.6;
  const driver = createAiDriver({ vehicle: kart, track, difficulty: 1, rng: makeRng(9), autoSteerSign: false });
  const alone = createAiDriver({ vehicle: kart, track, difficulty: 1, rng: makeRng(9), autoSteerSign: false });
  const withBlock = driver.think(DT, { vehicles: [kart, other], player: null, track, threats: [], started: true }).steer;
  const clear = alone.think(DT, { vehicles: [kart], player: null, track, threats: [], started: true }).steer;
  assert.ok(withBlock > clear + 0.1, `steers right (+, heading-decreasing) around a blocker on the left: ${withBlock} vs ${clear}`);
});

test("edge guard: near the right edge steers left, near the left edge steers right", () => {
  const track = makeCircleTrack(60);
  const kart = makeKart("ai1", track, 0);
  kart.state.speed = 20;
  const driver = createAiDriver({ vehicle: kart, track, difficulty: 1, rng: makeRng(1), autoSteerSign: false });
  const s0 = track.sample(0);
  // outward = right (+lateral) on this circle
  kart.state.x = s0.position.x + s0.normal.x * 5; kart.state.z = s0.position.z + s0.normal.z * 5;
  assert.ok(driver.think(DT, {}).steer < -0.3, "right edge → left (negative) steer");
  kart.state.x = s0.position.x - s0.normal.x * 5; kart.state.z = s0.position.z - s0.normal.z * 5;
  assert.ok(driver.think(DT, {}).steer > 0.3, "left edge → right (positive) steer");
});

const HAND = [
  { id: "pebble", cost: 1, kind: "attack", effect: { type: "projectile", speed: 40, dmgEffect: { type: "spin" }, range: 40 } },
  { id: "slipper", cost: 2, kind: "defense", effect: { type: "self", effect: { type: "shield", seconds: 4 } } },
  { id: "pumpkin", cost: 2, kind: "boost", effect: { type: "self", effect: { type: "boost", seconds: 3 } } },
  { id: "ricecake", cost: 1, kind: "trick", effect: { type: "mana", amount: 2 } },
];

test("wantsCard: attack when a kart is within 30 m ahead, rate-limited to 1.5 s", () => {
  const track = makeCircleTrack(60);
  const kart = makeKart("ai1", track, 0);
  const target = makeKart("p", track, 20 / track.length);
  const driver = createAiDriver({ vehicle: kart, track, difficulty: 0.35, rng: makeRng(11) });
  const rs = { vehicles: [kart, target], player: target, track, time: 10, threats: [], started: true };
  assert.equal(driver.wantsCard(rs, HAND), "pebble");
  assert.equal(driver.wantsCard(rs, HAND), null, "cooldown right after a decision");
  rs.time = 11.6;
  assert.equal(driver.wantsCard(rs, HAND), "pebble", "available again after 1.5 s");
});

test("wantsCard: no attack when the target is behind or out of range; respects mana", () => {
  const track = makeCircleTrack(60);
  const kart = makeKart("ai1", track, 0.5);
  const behind = makeKart("p", track, 0.5 - 20 / track.length);
  const far = makeKart("q", track, 0.5 + 45 / track.length);
  const driver = createAiDriver({ vehicle: kart, track, difficulty: 0.35, rng: () => 0.99 });
  const rs = { vehicles: [kart, behind, far], player: behind, track, time: 0, threats: [], started: true };
  // circle curvature 1/60 is too bendy for a boost, rng 0.99 never rolls a trick → nothing applies
  assert.equal(driver.wantsCard(rs, HAND), null);
  // target in range but mana too low for every card
  const near = makeKart("r", track, 0.5 + 10 / track.length);
  rs.vehicles.push(near);
  rs.manaOf = () => 0;
  assert.equal(driver.wantsCard(rs, HAND), null);
  rs.manaOf = () => 1;
  assert.equal(driver.wantsCard(rs, HAND), "pebble");
});

test("wantsCard: defense when a threat targets this kart, boost on a clear straight, trick by chance", () => {
  const track = makeCircleTrack(60);
  const kart = makeKart("ai1", track, 0);
  const driver = createAiDriver({ vehicle: kart, track, difficulty: 0.35, rng: () => 0.99 });
  const rs = { vehicles: [kart], player: null, track, time: 0, threats: [{ position: { x: 0, z: 0 }, velocity: { x: 0, z: 0 }, targetId: "ai1" }], started: true };
  assert.equal(driver.wantsCard(rs, HAND), "slipper");
  // threat aimed at someone else: no defense
  rs.time = 5;
  rs.threats[0].targetId = "other";
  assert.equal(driver.wantsCard(rs, HAND), null);

  // huge circle ≈ straight → boost (nobody near)
  const straight = makeCircleTrack(5000);
  const kart2 = makeKart("ai2", straight, 0);
  const d2 = createAiDriver({ vehicle: kart2, track: straight, difficulty: 0.35, rng: () => 0.99 });
  assert.equal(d2.wantsCard({ vehicles: [kart2], player: null, track: straight, time: 0, threats: [], started: true }, HAND), "pumpkin");

  // trick card when the dice say so
  const d3 = createAiDriver({ vehicle: kart, track, difficulty: 0.35, rng: () => 0.01 });
  assert.equal(d3.wantsCard({ vehicles: [kart], player: null, track, time: 0, threats: [], started: true }, HAND), "ricecake");
  assert.equal(driver.wantsCard({ vehicles: [kart], player: null, track, time: 9, threats: [], started: true }, []), null, "empty hand");
});
