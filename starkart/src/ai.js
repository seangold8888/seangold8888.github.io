// 별빛 카트 배틀 — AI driver (Agent AI). Pure logic: no THREE, no DOM.
// createAiDriver({ vehicle, track, difficulty, rng }) → { think(dt, raceState) → input, wantsCard(raceState, hand) → cardId|null }
"use strict";

import { clamp, wrapAngle } from "./contracts.js";

// ---- tuning -------------------------------------------------------------
const LOOK_BASE = 6;            // m of look-ahead at rest
const LOOK_PER_SPEED = 0.55;    // + m per m/s
const CURV_NEAR = 12;           // m: curvature sampling window start
const CURV_FAR = 20;            // m: curvature sampling window end
const LAT_ACCEL = 12;           // m/s²: cornering grip assumed for brake decision
const BRAKE_SOFT = 6;           // m/s over the corner limit → full brake
const STEER_GAIN = 2.6;         // rad of heading error → full lock at ~0.38 rad
const DRIFT_MIN_TURN_TIME = 0.6;// s: the upcoming turn must last at least this long (at current speed) to drift
const DRIFT_SCAN_STEP = 4;      // m between curvature samples when scanning the road ahead
const DRIFT_SCAN_MAX = 48;      // m
const DRIFT_HOP_LEAD = 0.4;     // s × speed: hop this far before the bend so the airborne frames land before it
const DRIFT_RELEASE_CURV = 0.4; // × DRIFT_MIN_CURV: below this the turn counts as over
const DRIFT_MIN_CURV = 1 / 32;  // 1/m: curvature needed to bother drifting (radius < 32 m)
const DRIFT_MIN_SPEED = 11;     // m/s
const DRIFT_MAX_HOLD = 2.4;     // s: release for the boost even if the turn continues (charge is full at 1.4 s)
const DRIFT_EDGE_FRAC = 0.55;   // release the drift when this far (× half-width) from the centreline
const EDGE_GUARD_FRAC = 0.6;    // beyond this (× half-width) add steering back toward the centreline
const EDGE_GUARD_GAIN = 2.2;    // steer per half-width of excess lateral
const DRIFT_COOLDOWN = 0.9;     // s after releasing before another hop
const DRIFT_RELEASE_GRACE = 0.25; // s of "turn over" before we let go
const OFFSET_MAX = 0.3;         // fraction of half-width used as personal lane offset
const OFFSET_RATE = 1.6;        // m/s the lane offset may drift toward its target
const AVOID_DIST = 4;           // m
const AVOID_CONE = 0.62;        // rad (~35°) half-angle for "roughly in front"
const AVOID_STEER = 0.55;       // max steer bias when passing
const PAD_AVOID_DIST = 22;      // m: start lining up to miss a trap pad this far ahead (along the road)
const PAD_CLEARANCE = 1.6;      // m beyond the pad radius
const PAD_BOOST_REACH = 54;     // m the pad boost carries the kart (36 m/s × 1.5 s)
const PAD_UNSAFE_RADIUS = 34;   // m: a bend tighter than this within reach makes the pad a trap
const BOOST_REACH = 36;         // m a drift mini-boost carries the kart before it fades
const BOOST_SAFE_RADIUS = 28;   // m: the road after a drift must be at least this open to earn the boost
const STUCK_SPEED = 1;          // m/s
const STUCK_TIME = 1.5;         // s
const REVERSE_TIME = 0.8;       // s
const RUBBER_BEHIND = 15;       // m behind the player → start catching up
const RUBBER_AHEAD = 25;        // m ahead of the player → start easing off
const RUBBER_RAMP = 40;         // m over which the bias ramps to its limit
const BIAS_MAX = 0.08;
const BIAS_MIN = -0.06;
const CARD_COOLDOWN = 1.5;      // s between card decisions
const CARD_ATTACK_RANGE = 30;   // m
const CARD_BOOST_CLEAR = 10;    // m: nobody within this → boost is "safe"
const CARD_BOOST_MAX_CURV = 1 / 90; // straight enough for a boost card
const CARD_TRICK_PER_SECOND = 0.3;
const SIGN_FLIP_THRESHOLD = 0.1; // rad·steer of contrary heading response before flipping steer sign
const SIGN_FLIP_MIN_SAMPLES = 15;

function num(v, d) { return typeof v === "number" && Number.isFinite(v) ? v : d; }
function sign(v) { return v > 0 ? 1 : v < 0 ? -1 : 0; }
function headingOf(dx, dz) { return Math.atan2(dx, dz); } // forward = (sin θ, cos θ)
function wrap01(t) { t %= 1; return t < 0 ? t + 1 : t; }

// Curvature (1/m, signed: + = heading increasing = left) of the centerline over [t0, t0+meters].
function curvatureAhead(track, t, fromM, toM) {
  const L = track.length || 1;
  const a = track.sample(wrap01(t + fromM / L));
  const b = track.sample(wrap01(t + toM / L));
  if (!a || !b || !a.tangent || !b.tangent) return 0;
  const ha = headingOf(a.tangent.x, a.tangent.z);
  const hb = headingOf(b.tangent.x, b.tangent.z);
  const span = Math.max(1e-3, toM - fromM);
  return wrapAngle(hb - ha) / span;
}

// Tightest bend radius (m) on the centreline over [fromM, toM] ahead of t.
function minRadiusAhead(track, t, fromM, toM) {
  const L = track.length || 1;
  let prev = null, maxK = 0;
  for (let d = fromM; d <= toM; d += DRIFT_SCAN_STEP) {
    const smp = track.sample(wrap01(t + d / L));
    if (!smp || !smp.tangent) break;
    const h = headingOf(smp.tangent.x, smp.tangent.z);
    if (prev !== null) maxK = Math.max(maxK, Math.abs(wrapAngle(h - prev)) / DRIFT_SCAN_STEP);
    prev = h;
  }
  return maxK > 1e-6 ? 1 / maxK : Infinity;
}

// Scan the road ahead for the next bend sharp enough to drift.
// → { d0: m until it starts, dir: +1 (heading increasing = left) / -1, length: m } or null.
function upcomingTurn(track, t, minCurv) {
  const L = track.length || 1;
  const n = Math.floor(DRIFT_SCAN_MAX / DRIFT_SCAN_STEP);
  let prev = null;
  let start = -1, dir = 0, end = -1;
  for (let i = 0; i <= n; i++) {
    const smp = track.sample(wrap01(t + (i * DRIFT_SCAN_STEP) / L));
    if (!smp || !smp.tangent) return null;
    const h = headingOf(smp.tangent.x, smp.tangent.z);
    if (prev !== null) {
      const k = wrapAngle(h - prev) / DRIFT_SCAN_STEP; // curvature of segment [i-1, i]
      if (start < 0) {
        if (Math.abs(k) > minCurv) { start = i - 1; dir = sign(k); end = i; }
      } else if (sign(k) === dir && Math.abs(k) > minCurv * DRIFT_RELEASE_CURV) {
        end = i;
      } else break;
    }
    prev = h;
  }
  if (start < 0) return null;
  return { d0: start * DRIFT_SCAN_STEP, dir, length: (end - start) * DRIFT_SCAN_STEP };
}

function alongDistance(track, fromT, toT) {
  if (typeof track.progressBetween === "function") return track.progressBetween(fromT, toT);
  return wrap01(toT - fromT) * (track.length || 1);
}

// lap + distance around the track, in meters.
function raceDistance(track, v, tHint) {
  const s = v.state || v;
  let t = tHint;
  if (typeof t !== "number") t = track.project(s.x, s.z).t;
  return num(s.lap, 0) * (track.length || 1) + t * (track.length || 1);
}

// steerSign: how the vehicle maps `steer` onto heading. -1 (default) = the vehicle.js convention
//   (steer +1 = right = heading DECREASES); +1 = steer +1 increases heading. With autoSteerSign the
//   driver watches how the heading actually responds and flips itself if the convention is inverted.
export function createAiDriver({ vehicle, track, difficulty = 0.35, rng = Math.random, steerSign = -1, autoSteerSign = true } = {}) {
  if (!vehicle || !track) throw new Error("createAiDriver: vehicle and track are required");
  const diff = clamp(num(difficulty, 0.35), 0, 1);
  const halfWidth = num(track.width, 12) / 2;

  // --- per-driver personality ---
  let laneTarget = 0;   // m, signed (+ = kart's right)
  let lane = 0;         // m, smoothed
  let laneTimer = 0;
  let wobbleTarget = 0; // m, look-ahead imprecision (scales with 1 - difficulty)
  let wobble = 0;
  let wobbleTimer = 0;
  const cautious = !!track.fallOff; // sky: leaving the road means falling → hug the centre more
  const laneMax = OFFSET_MAX * halfWidth * (cautious ? 0.5 : 1);
  const wobbleMax = (1 - diff) * 1.2 * (cautious ? 0.5 : 1);
  const driftChance = 0.3 + 0.7 * diff;

  // --- drift state ---
  let drifting = false;
  let driftDir = 0;     // intent sign of the drift (+ = heading increasing = left)
  let driftHold = 0;
  let driftEndTime = 0; // s the bend has been "over" while still drifting
  let driftCooldown = 0;
  let driftDecided = false; // rolled the dice for the upcoming bend?
  let driftWanted = false;
  let hopPending = false;

  // --- stuck recovery ---
  let stuckTime = 0;
  let reverseTime = 0;
  let lastSteer = 0;   // emitted steer (after sign correction)
  let lastIntent = 0;  // steer demand before sign correction (+ = wants heading to increase)

  // --- steer sign auto-detect ---
  let signCorr = 0;
  let signSamples = 0;
  let prevHeading = null;
  let steerDir = steerSign >= 0 ? 1 : -1; // multiplier: intent (+ = heading up) → emitted steer

  // --- cards ---
  let clock = 0;
  let nextCardTime = 0;
  let nextTrickRoll = 0;

  // A boost pad is a trap when the road within the boost's reach bends tighter than the kart can hold at boost speed.
  const padCache = new Map(); // pad → { trap, t, lateral }
  function padIsTrap(pad) {
    const hit = padCache.get(pad);
    if (hit) return hit.trap;
    const p = pad.position;
    const pr = track.project(p.x, p.z);
    const t0 = pr.t;
    const trap = minRadiusAhead(track, t0, 0, PAD_BOOST_REACH) < PAD_UNSAFE_RADIUS;
    padCache.set(pad, { trap, t: t0, lateral: num(pr.lateral, 0) });
    return trap;
  }

  const driver = {
    vehicle,
    difficulty: diff,
    speedBias: 0,
    get steerSign() { return steerDir; },
    think,
    wantsCard,
  };

  function think(dt, raceState) {
    dt = num(dt, 1 / 60);
    if (dt <= 0) dt = 1 / 60;
    clock += dt;
    const s = vehicle.state;
    const started = !raceState || raceState.started !== false;
    const input = { throttle: 0, brake: 0, steer: 0, drift: false, hop: false };

    // Helpless: spinning or stunned → coast.
    if (num(s.spinTimer, 0) > 0 || num(s.stunTimer, 0) > 0) {
      prevHeading = s.heading;
      stuckTime = 0;
      return input;
    }

    // -- learn steer sign from how heading actually responds --
    // (not while drifting or just after: the vehicle keeps yawing into the drift regardless of steer)
    const learnOk = !drifting && !s.drifting && driftCooldown <= 0 && !s.airborne && num(s.speed, 0) > 0.5;
    if (autoSteerSign && learnOk && prevHeading !== null && Math.abs(lastIntent) > 0.25) {
      const dh = wrapAngle(s.heading - prevHeading);
      signCorr += lastIntent * dh; // < 0 means the kart turned away from where we wanted
      signSamples++;
      if (signSamples >= SIGN_FLIP_MIN_SAMPLES && signCorr < -SIGN_FLIP_THRESHOLD) {
        steerDir = -steerDir;
        signCorr = 0;
        signSamples = 0;
      } else if (signCorr > SIGN_FLIP_THRESHOLD) {
        signCorr = SIGN_FLIP_THRESHOLD; // keep it bounded; confident already
      }
    }
    prevHeading = s.heading;

    const speed = num(s.speed, 0);
    const L = track.length || 1;
    const proj = track.project(s.x, s.z);
    const t = proj.t;

    // -- personal lane + look-ahead imprecision (rng-driven, slowly varying) --
    laneTimer -= dt;
    if (laneTimer <= 0) {
      laneTarget = (rng() * 2 - 1) * laneMax;
      laneTimer = 2.5 + rng() * 3;
    }
    lane += clamp(laneTarget - lane, -OFFSET_RATE * dt, OFFSET_RATE * dt);
    wobbleTimer -= dt;
    if (wobbleTimer <= 0) {
      wobbleTarget = (rng() * 2 - 1) * wobbleMax;
      wobbleTimer = 0.8 + rng() * 0.8;
    }
    wobble += clamp(wobbleTarget - wobble, -2 * dt, 2 * dt);

    // -- look-ahead target --
    const lookM = LOOK_BASE + speed * LOOK_PER_SPEED;
    const la = track.sample(wrap01(t + lookM / L));
    const tang = la.tangent || { x: Math.sin(s.heading), z: Math.cos(s.heading) };
    // right-hand vector of the tangent (forward (fx,fz) → right (-fz, fx)); sign is irrelevant for symmetric offsets
    const rx = -tang.z, rz = tang.x;
    let off = lane + wobble;
    // Boost pads that would fire us into a bend too tight for boost speed: line up to miss them.
    if (Array.isArray(track.boostPads) && num(s.boostTimer, 0) <= 0) {
      for (const pad of track.boostPads) {
        if (!pad || !pad.position || !padIsTrap(pad)) continue;
        const info = padCache.get(pad);
        const along = alongDistance(track, t, info.t);
        if (along < -2 || along > PAD_AVOID_DIST) continue;
        const r = num(pad.radius, 2) + PAD_CLEARANCE;
        // pass on whichever side leaves more road; never aim beyond 80 % of the half-width
        const room = 0.8 * halfWidth;
        const right = info.lateral + r, left = info.lateral - r;
        const pickRight = Math.abs(right) < Math.abs(left) || (Math.abs(right) <= room && Math.abs(left) > room);
        off = clamp(pickRight ? right : left, -room, room);
        break;
      }
    }
    const tx = la.position.x + rx * off;
    const tz = la.position.z + rz * off;
    const desired = headingOf(tx - s.x, tz - s.z);
    // Steer the direction of travel, not the nose: while drifting the kart slides outside of where it points.
    let moveHeading = s.heading;
    if (speed > 3 && Number.isFinite(s.vx) && Number.isFinite(s.vz) && Math.hypot(s.vx, s.vz) > 1) {
      moveHeading = headingOf(s.vx, s.vz);
    }
    const err = wrapAngle(desired - moveHeading);
    let steer = clamp(err * STEER_GAIN, -1, 1);
    // Edge guard: near the road edge, steer back toward the centreline (only when facing roughly forward).
    const facingForward = Math.abs(wrapAngle(headingOf(tang.x, tang.z) - moveHeading)) < Math.PI / 2;
    const excess = Math.abs(proj.lateral) / halfWidth - EDGE_GUARD_FRAC;
    if (excess > 0 && facingForward) {
      // lateral + = right; heading increasing = left → on the right edge, raise the heading (positive intent)
      steer = clamp(steer + sign(proj.lateral) * excess * EDGE_GUARD_GAIN, -1, 1);
    }

    // -- curvature ahead → brake + drift decisions --
    const curv = curvatureAhead(track, t, CURV_NEAR, CURV_FAR);
    const absCurv = Math.abs(curv);
    let throttle = 1;
    let brake = 0;
    if (absCurv > 1e-4) {
      const vmax = Math.sqrt(LAT_ACCEL / absCurv);
      if (speed > vmax) {
        brake = clamp((speed - vmax) / BRAKE_SOFT, 0, 1) * 0.85;
        throttle = 1 - brake;
      }
    }

    // -- avoid karts directly ahead: pass on the freer side --
    {
      const fx = Math.sin(s.heading), fz = Math.cos(s.heading);
      const mrx = -fz, mrz = fx; // my right
      let best = null;
      const consider = (x, z, maxDist) => {
        const dx = x - s.x, dz = z - s.z;
        const d = Math.hypot(dx, dz);
        if (d > maxDist || d < 1e-3) return;
        const ahead = dx * fx + dz * fz;
        if (ahead <= 0) return;
        const ang = Math.atan2(Math.hypot(dx - ahead * fx, dz - ahead * fz), ahead);
        if (ang > AVOID_CONE) return;
        const w = d / maxDist; // normalised distance so karts and pads compare fairly
        if (!best || w < best.w) best = { w, lat: dx * mrx + dz * mrz };
      };
      if (raceState && Array.isArray(raceState.vehicles)) {
        for (const o of raceState.vehicles) {
          if (!o || o === vehicle || o.id === vehicle.id || !o.state) continue;
          consider(o.state.x, o.state.z, AVOID_DIST);
        }
      }
      if (best) {
        let side; // +1 = go right (heading decreases), -1 = go left
        if (Math.abs(best.lat) > 0.3) side = -sign(best.lat);
        else side = proj.lateral > 0 ? -1 : 1; // centered blocker: use the roomier side of the road
        const strength = AVOID_STEER * (1 - best.w);
        // "go right" means heading decreases: steer in the -side direction (before sign correction).
        steer = clamp(steer - side * strength, -1, 1);
        throttle = Math.min(throttle, 0.9);
      }
    }

    // -- drift: hop just before a long bend, hold through it, release when it ends --
    driftCooldown = Math.max(0, driftCooldown - dt);
    input.hop = false;
    if (!drifting) {
      const turn = upcomingTurn(track, t, DRIFT_MIN_CURV);
      if (!turn) driftDecided = false;
      const longEnough = turn && turn.length >= Math.max(2 * DRIFT_SCAN_STEP, DRIFT_MIN_TURN_TIME * speed);
      const boosting = num(s.boostTimer, 0) > 0 || speed > 30;
      if (longEnough && driftCooldown <= 0 && speed >= DRIFT_MIN_SPEED && !s.airborne && !boosting) {
        if (!driftDecided) {
          driftDecided = true;
          // releasing a charged drift boosts us: only drift when the road after the bend can take boost speed
          const exitAt = turn.d0 + turn.length;
          const exitSafe = minRadiusAhead(track, t, exitAt, exitAt + BOOST_REACH) >= BOOST_SAFE_RADIUS;
          driftWanted = exitSafe && rng() < driftChance;
        }
        const lead = DRIFT_HOP_LEAD * speed + 2;
        if (driftWanted && turn.d0 <= lead) {
          drifting = true; driftDir = turn.dir; driftHold = 0; driftEndTime = 0; hopPending = true;
          // the vehicle latches its drift direction from the steer sign on this frame
          if (sign(steer) !== driftDir || Math.abs(steer) < 0.5) steer = driftDir * Math.max(0.5, Math.abs(steer));
        }
      }
    } else {
      driftHold += dt;
      const here = curvatureAhead(track, t, 0, 10);
      const bendOver = sign(here) !== driftDir || Math.abs(here) < DRIFT_MIN_CURV * DRIFT_RELEASE_CURV;
      driftEndTime = bendOver ? driftEndTime + dt : 0;
      // near either edge (slid wide, or cut too far inside) → let go and steer normally
      const nearEdge = Math.abs(proj.lateral) > DRIFT_EDGE_FRAC * halfWidth;
      const fighting = sign(err) === -driftDir && Math.abs(err) > 0.3;
      // about to earn a boost, but the road ahead can't take one → let go before the charge hits 0.5
      const charge = num(s.driftCharge, driftHold / 1.4);
      const bailBeforeBoost = charge >= 0.4 && charge < 0.5 && minRadiusAhead(track, t, 0, BOOST_REACH) < BOOST_SAFE_RADIUS;
      if (driftEndTime > DRIFT_RELEASE_GRACE || nearEdge || fighting || bailBeforeBoost || driftHold > DRIFT_MAX_HOLD || speed < DRIFT_MIN_SPEED * 0.5) {
        drifting = false;
        driftCooldown = DRIFT_COOLDOWN;
        driftDecided = false;
      }
    }
    if (hopPending) { input.hop = true; hopPending = false; }
    input.drift = drifting;

    // -- rubber band vs. the player --
    let bias = 0;
    const player = raceState && raceState.player;
    if (player && player !== vehicle && player.id !== vehicle.id && player.state) {
      const mine = raceDistance(track, vehicle, t);
      const theirs = raceDistance(track, player);
      const gap = theirs - mine; // + = player ahead of me
      if (gap > RUBBER_BEHIND) {
        bias = BIAS_MAX * (0.3 + 0.7 * diff) * clamp((gap - RUBBER_BEHIND) / RUBBER_RAMP, 0, 1);
      } else if (gap < -RUBBER_AHEAD) {
        bias = BIAS_MIN * (1 - 0.5 * diff) * clamp((-gap - RUBBER_AHEAD) / RUBBER_RAMP, 0, 1);
      }
    }
    driver.speedBias = clamp(bias, BIAS_MIN, BIAS_MAX);

    // -- stuck recovery --
    if (reverseTime > 0) {
      reverseTime -= dt;
      input.throttle = 0;
      input.brake = 1;
      input.steer = clamp(lastSteer !== 0 ? -lastSteer : (steerDir * sign(err) || 1), -1, 1);
      input.drift = false;
      input.hop = false;
      if (reverseTime <= 0) stuckTime = 0;
      return input;
    }
    if (started && throttle > 0.5 && speed < STUCK_SPEED) stuckTime += dt; else stuckTime = 0;
    if (stuckTime >= STUCK_TIME) {
      stuckTime = 0;
      reverseTime = REVERSE_TIME;
      drifting = false;
    }

    input.throttle = clamp(throttle, 0, 1);
    input.brake = clamp(brake, 0, 1);
    input.steer = clamp(steer * steerDir, -1, 1);
    lastSteer = input.steer;
    lastIntent = steer;
    return input;
  }

  function wantsCard(raceState, hand) {
    if (!raceState || !Array.isArray(hand) || hand.length === 0) return null;
    const now = typeof raceState.time === "number" ? raceState.time : clock;
    if (now < nextCardTime) return null;
    const s = vehicle.state;
    const mana = (typeof raceState.manaOf === "function" ? raceState.manaOf(vehicle.id) : undefined) ?? 5;
    const affordable = hand.filter((c) => c && num(c.cost, 0) <= mana);
    if (affordable.length === 0) return null;
    const pick = (pred) => {
      const c = affordable.find(pred);
      if (!c) return null;
      nextCardTime = now + CARD_COOLDOWN;
      return c.id;
    };
    const isKind = (k) => (c) => c.kind === k;

    // 1. Incoming projectile aimed at me → defense.
    const threatened = Array.isArray(raceState.threats) && raceState.threats.some((th) => th && th.targetId === vehicle.id);
    if (threatened && num(s.shieldTimer, 0) <= 0) {
      const id = pick(isKind("defense"));
      if (id) return id;
    }

    // 2. Someone within 30 m ahead → attack.
    const myT = track.project(s.x, s.z).t;
    let nearest = Infinity;
    let aheadWithin = false;
    if (Array.isArray(raceState.vehicles)) {
      for (const o of raceState.vehicles) {
        if (!o || o === vehicle || o.id === vehicle.id || !o.state) continue;
        const d = Math.hypot(o.state.x - s.x, o.state.z - s.z);
        if (d < nearest) nearest = d;
        const along = alongDistance(track, myT, track.project(o.state.x, o.state.z).t);
        if (along > 0 && along <= CARD_ATTACK_RANGE && d <= CARD_ATTACK_RANGE + 2) aheadWithin = true;
      }
    }
    if (aheadWithin) {
      const id = pick(isKind("attack"));
      if (id) return id;
    }

    // 3. Straight ahead and nobody close → boost.
    const curv = Math.abs(curvatureAhead(track, myT, 0, 25));
    if (curv < CARD_BOOST_MAX_CURV && nearest > CARD_BOOST_CLEAR && num(s.boostTimer, 0) <= 0) {
      const id = pick(isKind("boost"));
      if (id) return id;
    }

    // 4. Otherwise a trick / mana card, ~0.3 per second.
    if (now >= nextTrickRoll) {
      nextTrickRoll = now + CARD_COOLDOWN;
      const p = 1 - Math.pow(1 - CARD_TRICK_PER_SECOND, CARD_COOLDOWN);
      if (rng() < p) {
        const id = pick((c) => c.kind === "trick" || c.kind === "mana" || (c.effect && c.effect.type === "mana"));
        if (id) return id;
      }
    }
    return null;
  }

  return driver;
}

export default createAiDriver;
