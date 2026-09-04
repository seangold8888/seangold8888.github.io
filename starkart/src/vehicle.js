// 별빛 카트 배틀 — vehicle: arcade kart physics + low-poly kart mesh.
// Owner: Agent VEHICLE. Pure logic runs in Node (THREE optional).
//
// Conventions (see CONTRACTS.md): Y up, heading θ with forward = (sin θ, 0, cos θ),
// θ increases counter-clockwise viewed from above. The kart's RIGHT vector is
// (-cos θ, 0, sin θ), so steer = +1 (right) DECREASES heading, steer = -1 (left)
// increases it. Units: meters, seconds, radians.
"use strict";

import { RACE, EFFECT, clamp, lerp, wrapAngle } from "./contracts.js";

// ---------------------------------------------------------------------------
// Tuning — exported so AI / HUD / tests can read the same numbers.
// ---------------------------------------------------------------------------
export const TUNING = Object.freeze({
  // throttle: acceleration is capped at MAX_ACCEL (m/s²) and then eases in
  // exponentially with rate ACCEL_K (1/s). Reaches ~99 % of top speed in ≈2.2 s.
  ACCEL_K: 2.2,
  MAX_ACCEL: 24,
  BRAKE_DECEL: 32,        // m/s² while brake held and moving forward
  COAST_DECEL: 9,         // m/s² toward target when above it (no throttle / boost fade)
  OFFTRACK_DECEL: 20,     // m/s² toward the reduced off-track target
  REVERSE_SPEED: 7,       // m/s max reverse
  REVERSE_ACCEL: 10,

  // steering (rad/s) at speed 0 → top speed, times spec.handling
  STEER_RATE_LOW: 2.8,
  STEER_RATE_HIGH: 1.35,
  STEER_MIN_SPEED: 4,     // below this the steering authority fades linearly
  AIR_STEER: 0.35,        // steering multiplier while airborne
  STEER_SMOOTH: 12,       // 1/s smoothing for the visual wheel angle

  // drift
  DRIFT_MIN_SPEED: 7,
  DRIFT_CHARGE_SECONDS: 1.4,
  DRIFT_SLIP: 0.42,       // rad: how far the nose points inside the travel direction
  DRIFT_TURN_MIN: 0.45,   // steer multiplier when counter-steering fully
  DRIFT_TURN_MAX: 1.35,   // steer multiplier when steering fully into the drift
  DRIFT_SLIP_RATE: 6,     // 1/s slip angle response
  MINI_BOOST_SECONDS: 1.2,
  SUPER_BOOST_SECONDS: 2.0,

  // boost / pads / hazards
  BOOST_K: 5,             // 1/s approach rate toward BOOST_SPEED
  PAD_BOOST_SECONDS: 1.5,
  SPIN_SECONDS: 1.2,
  SPIN_SPEED_FACTOR: 0.4,
  SPIN_TURNS: 2,          // 720°
  HAZARD_COOLDOWN: 1.5,   // seconds of immunity after a spin ends (no re-trigger on the same slick)
  MUD_FACTOR: 0.6,

  // vertical
  HOP_VY: 4.2,
  GRAVITY: 24,
  AIR_DRAG: 1.5,          // m/s² speed loss while airborne
  LAND_BOUNCE_DECAY: 6,

  // knockback
  KNOCKBACK_DECAY: 3.5,   // 1/s exponential decay of the push velocity
  KNOCKBACK_LIFT: 1.6,    // small vertical pop on hit

  // respawn
  RESPAWN_SHIELD_SECONDS: 1.0,
  WHEEL_RADIUS: 0.3,
});

const TWO_PI = Math.PI * 2;

// ---------------------------------------------------------------------------
// Vehicle
// ---------------------------------------------------------------------------

function makeState() {
  return {
    x: 0, y: 0, z: 0,
    heading: 0,
    speed: 0,            // signed forward speed (m/s); negative = reversing
    vx: 0, vz: 0,        // world velocity (includes drift slip + knockback push)
    vy: 0,
    drifting: false,
    driftDir: 0,         // +1 right, -1 left
    driftCharge: 0,      // 0..1
    driftBoostReady: false,
    slip: 0,             // rad: travel direction = heading + slip
    boostTimer: 0,
    spinTimer: 0,
    spinAngle: 0,        // visual yaw offset during a spin
    spinSign: 1,
    shieldTimer: 0,
    stunTimer: 0,
    slowTimer: 0,
    slowFactor: 1,
    hazardCooldown: 0,
    pushX: 0, pushZ: 0,  // knockback impulse velocity
    airborne: false,
    onTrack: true,
    lap: 0,
    checkpoint: 0,
    progress: 0,         // curve parameter t of the nearest centerline point (0..1)
    rank: 1,
    // visual helpers
    steerVisual: 0,
    wheelSpin: 0,
    tilt: 0,
    landBounce: 0,
    hopTimer: 0,
  };
}

function normalizeInput(input) {
  const i = input || {};
  return {
    throttle: clamp(+i.throttle || 0, 0, 1),
    brake: clamp(+i.brake || 0, 0, 1),
    steer: clamp(+i.steer || 0, -1, 1),
    drift: !!i.drift,
    hop: !!i.hop,
  };
}

function normalizeSpec(spec) {
  const s = spec || {};
  return {
    accel: s.accel > 0 ? s.accel : 1,
    topSpeed: s.topSpeed > 0 ? s.topSpeed : 1,
    handling: s.handling > 0 ? s.handling : 1,
    weight: s.weight > 0 ? s.weight : 1,
    color: s.color ?? 0xffffff,
    accent: s.accent ?? 0xffe08a,
    name: s.name ?? "",
  };
}

/**
 * createVehicle({ id, isPlayer, spec }, THREE?) → Vehicle
 * THREE is optional; without it `mesh` is null (pure-logic mode for tests / AI sims).
 */
export function createVehicle(opts, THREE) {
  const { id = "kart", isPlayer = false } = opts || {};
  const spec = normalizeSpec(opts && opts.spec);
  const state = makeState();
  const mesh = THREE ? buildKartMesh(THREE, spec) : null;

  let prevDrift = false;
  let prevHop = false;

  const topSpeed = () => RACE.TOP_SPEED * spec.topSpeed;
  const boostSpeed = () => RACE.BOOST_SPEED * spec.topSpeed;

  function tickTimers(dt) {
    const s = state;
    if (s.boostTimer > 0) s.boostTimer = Math.max(0, s.boostTimer - dt);
    if (s.shieldTimer > 0) s.shieldTimer = Math.max(0, s.shieldTimer - dt);
    if (s.stunTimer > 0) s.stunTimer = Math.max(0, s.stunTimer - dt);
    if (s.hazardCooldown > 0) s.hazardCooldown = Math.max(0, s.hazardCooldown - dt);
    if (s.hopTimer > 0) s.hopTimer = Math.max(0, s.hopTimer - dt);
    if (s.slowTimer > 0) {
      s.slowTimer = Math.max(0, s.slowTimer - dt);
      if (s.slowTimer === 0) s.slowFactor = 1;
    }
    if (s.spinTimer > 0) {
      const before = s.spinTimer;
      s.spinTimer = Math.max(0, s.spinTimer - dt);
      const frac = (before - s.spinTimer) / TUNING.SPIN_SECONDS;
      s.spinAngle += s.spinSign * TUNING.SPIN_TURNS * TWO_PI * frac;
      if (s.spinTimer === 0) { s.spinAngle = 0; s.hazardCooldown = TUNING.HAZARD_COOLDOWN; }
    }
    if (s.landBounce > 0) s.landBounce = Math.max(0, s.landBounce - dt * TUNING.LAND_BOUNCE_DECAY);
  }

  function startHop() {
    if (state.airborne) return;
    state.vy = TUNING.HOP_VY;
    state.airborne = true;
    state.hopTimer = 0.35;
  }

  function endDrift(byRelease) {
    const s = state;
    if (!s.drifting) return;
    s.drifting = false;
    if (byRelease) {
      if (s.driftCharge >= 1) applyEffect({ type: EFFECT.BOOST, seconds: TUNING.SUPER_BOOST_SECONDS });
      else if (s.driftCharge >= 0.5) applyEffect({ type: EFFECT.BOOST, seconds: TUNING.MINI_BOOST_SECONDS });
    }
    s.driftCharge = 0;
    s.driftDir = 0;
    s.driftBoostReady = false;
  }

  function sampleTrack(track) {
    if (!track || typeof track.project !== "function") return { onTrack: true, height: 0, t: state.progress };
    const p = track.project(state.x, state.z) || {};
    return {
      onTrack: p.onTrack !== false,
      height: Number.isFinite(p.height) ? p.height : 0,
      t: Number.isFinite(p.t) ? p.t : state.progress,
    };
  }

  function checkPads(track) {
    const pads = track && track.boostPads;
    if (!pads || !pads.length || state.airborne) return;
    for (let i = 0; i < pads.length; i++) {
      const pad = pads[i];
      const pos = pad.position || pad;
      const r = (pad.radius || 2) + RACE.KART_RADIUS * 0.5;
      const dx = state.x - pos.x, dz = state.z - pos.z;
      if (dx * dx + dz * dz <= r * r) {
        state.boostTimer = Math.max(state.boostTimer, TUNING.PAD_BOOST_SECONDS);
        return;
      }
    }
  }

  function checkHazards(track, rng) {
    const hz = track && track.hazards;
    if (!hz || !hz.length || state.airborne) return;
    for (let i = 0; i < hz.length; i++) {
      const h = hz[i];
      const pos = h.position || h;
      const r = (h.radius || 2) + RACE.KART_RADIUS * 0.5;
      const dx = state.x - pos.x, dz = state.z - pos.z;
      if (dx * dx + dz * dz > r * r) continue;
      if (h.kind === "mud") {
        if (state.shieldTimer <= 0) {
          state.slowTimer = Math.max(state.slowTimer, 0.15);
          state.slowFactor = Math.min(state.slowFactor, TUNING.MUD_FACTOR);
        }
      } else if (state.spinTimer <= 0 && state.hazardCooldown <= 0) {
        applyEffect({ type: EFFECT.SPIN, rng });
      }
    }
  }

  function update(dt, input, track, rng) {
    if (!(dt > 0)) return;
    dt = Math.min(dt, 0.05); // never integrate a huge step (tab switch)
    const s = state;
    const inp = normalizeInput(input);
    const random = typeof rng === "function" ? rng : Math.random;

    tickTimers(dt);

    const stunned = s.stunTimer > 0;
    const spinning = s.spinTimer > 0;
    const controllable = !stunned && !spinning;

    // -- hop / drift button edges -------------------------------------------
    const hopEdge = (inp.hop && !prevHop) || (inp.drift && !prevDrift);
    prevHop = inp.hop; prevDrift = inp.drift;
    if (hopEdge && controllable && !s.airborne) startHop();

    // -- track sampling ----------------------------------------------------
    const proj = sampleTrack(track);
    s.onTrack = proj.onTrack;
    s.progress = proj.t;

    // -- drift state -------------------------------------------------------
    const fast = Math.abs(s.speed) >= TUNING.DRIFT_MIN_SPEED;
    if (s.drifting) {
      if (!inp.drift) endDrift(true);
      else if (!controllable || Math.abs(s.speed) < TUNING.DRIFT_MIN_SPEED * 0.6) endDrift(false);
    }
    if (!s.drifting && inp.drift && controllable && fast && s.speed > 0 && Math.abs(inp.steer) > 0.15) {
      s.drifting = true;
      s.driftDir = inp.steer > 0 ? 1 : -1;
      s.driftCharge = 0;
    }
    if (s.drifting) {
      s.driftCharge = clamp(s.driftCharge + dt / TUNING.DRIFT_CHARGE_SECONDS, 0, 1);
    }
    s.driftBoostReady = s.drifting && s.driftCharge >= 0.5;

    // -- steering ----------------------------------------------------------
    const speedAbs = Math.abs(s.speed);
    const speed01 = clamp(speedAbs / topSpeed(), 0, 1.3);
    let steerCmd = controllable ? inp.steer : 0;
    if (s.drifting) {
      const inside = (s.driftDir * inp.steer + 1) * 0.5; // 0 = full counter-steer, 1 = full inside
      steerCmd = s.driftDir * lerp(TUNING.DRIFT_TURN_MIN, TUNING.DRIFT_TURN_MAX, inside);
    }
    let rate = lerp(TUNING.STEER_RATE_LOW, TUNING.STEER_RATE_HIGH, clamp(speed01, 0, 1)) * spec.handling;
    rate *= clamp(speedAbs / TUNING.STEER_MIN_SPEED, 0, 1);
    if (s.airborne) rate *= TUNING.AIR_STEER;
    const dir = s.speed < 0 ? -1 : 1; // reversing flips the turn direction
    s.heading = wrapAngle(s.heading - steerCmd * rate * dir * dt);

    // slip (drift slide) — travel direction lags the nose
    const slipTarget = s.drifting ? s.driftDir * TUNING.DRIFT_SLIP * clamp(speed01, 0.3, 1) : 0;
    s.slip += (slipTarget - s.slip) * clamp(dt * TUNING.DRIFT_SLIP_RATE, 0, 1);

    // -- longitudinal --------------------------------------------------------
    let throttle = controllable ? inp.throttle : 0;
    const brake = controllable ? inp.brake : 0;
    let target = throttle * topSpeed();
    let mult = 1;
    if (!proj.onTrack) mult *= RACE.OFFTRACK_FACTOR;
    if (s.slowTimer > 0) mult *= s.slowFactor;
    target *= mult;

    if (s.airborne) {
      // hold speed in the air, tiny drag
      if (s.speed > 0) s.speed = Math.max(0, s.speed - TUNING.AIR_DRAG * dt);
    } else if (s.boostTimer > 0) {
      const bt = boostSpeed() * mult;
      s.speed += (bt - s.speed) * clamp(dt * TUNING.BOOST_K, 0, 1);
    } else if (brake > 0 && s.speed > 0.2) {
      s.speed = Math.max(0, s.speed - TUNING.BRAKE_DECEL * brake * dt);
    } else if (brake > 0 && throttle === 0) {
      // reverse
      const rt = -TUNING.REVERSE_SPEED * brake * mult;
      s.speed = Math.max(rt, s.speed - TUNING.REVERSE_ACCEL * dt);
    } else if (s.speed < target) {
      const gap = target - s.speed;
      let a = gap * TUNING.ACCEL_K;
      a = Math.min(a, TUNING.MAX_ACCEL) * spec.accel;
      s.speed = Math.min(target, s.speed + a * dt);
    } else {
      // above target: coast down (harder when off-track)
      const decel = proj.onTrack ? TUNING.COAST_DECEL : TUNING.OFFTRACK_DECEL;
      if (s.speed > 0) s.speed = Math.max(target, s.speed - decel * dt);
      else s.speed = Math.min(0, s.speed + TUNING.COAST_DECEL * dt);
    }

    // -- knockback push decay ---------------------------------------------
    const pk = Math.exp(-TUNING.KNOCKBACK_DECAY * dt);
    s.pushX *= pk; s.pushZ *= pk;
    if (Math.abs(s.pushX) < 0.01) s.pushX = 0;
    if (Math.abs(s.pushZ) < 0.01) s.pushZ = 0;

    // -- integrate horizontal -----------------------------------------------
    const travel = s.heading + s.slip;
    s.vx = Math.sin(travel) * s.speed + s.pushX;
    s.vz = Math.cos(travel) * s.speed + s.pushZ;
    s.x += s.vx * dt;
    s.z += s.vz * dt;

    // -- vertical: follow track height, simple gravity when airborne --------
    const after = sampleTrack(track);
    const ground = after.height;
    if (s.airborne) {
      s.vy -= TUNING.GRAVITY * dt;
      s.y += s.vy * dt;
      if (s.y <= ground && s.vy <= 0) {
        s.landBounce = clamp(-s.vy / 8, 0.15, 1);
        s.y = ground; s.vy = 0; s.airborne = false; s.hopTimer = 0;
      }
    } else if (ground < s.y - 0.2) {
      // the road dropped away (end of a ramp / jump lip) → fly, gravity takes over
      s.airborne = true;
      s.vy = 0;
    } else {
      s.y = ground; s.vy = 0;
    }

    // -- pads / hazards ------------------------------------------------------
    checkPads(track);
    checkHazards(track, random);

    // -- visual helpers --------------------------------------------------------
    const steerVisTarget = s.drifting ? s.driftDir * 0.7 + inp.steer * 0.3 : inp.steer;
    s.steerVisual += (steerVisTarget - s.steerVisual) * clamp(dt * TUNING.STEER_SMOOTH, 0, 1);
    s.wheelSpin = (s.wheelSpin + (s.speed * dt) / TUNING.WHEEL_RADIUS) % TWO_PI;
    const tiltTarget = s.drifting ? s.driftDir * 0.22 : inp.steer * 0.06 * clamp(speed01, 0, 1);
    s.tilt += (tiltTarget - s.tilt) * clamp(dt * 8, 0, 1);
  }

  function applyEffect(effect) {
    if (!effect || !effect.type) return;
    const s = state;
    const shielded = s.shieldTimer > 0;
    switch (effect.type) {
      case EFFECT.BOOST: {
        const sec = effect.seconds > 0 ? effect.seconds : 1.5;
        s.boostTimer = Math.max(s.boostTimer, sec);
        break;
      }
      case EFFECT.SPIN: {
        if (shielded || s.spinTimer > 0) return;
        const random = typeof effect.rng === "function" ? effect.rng : Math.random;
        s.spinTimer = TUNING.SPIN_SECONDS;
        s.spinSign = random() < 0.5 ? -1 : 1;
        s.spinAngle = 0;
        s.speed *= TUNING.SPIN_SPEED_FACTOR;
        endDrift(false);
        break;
      }
      case EFFECT.SHIELD: {
        const sec = effect.seconds > 0 ? effect.seconds : 3;
        s.shieldTimer = Math.max(s.shieldTimer, sec);
        break;
      }
      case EFFECT.SLOW: {
        if (shielded) return;
        const sec = effect.seconds > 0 ? effect.seconds : 2;
        const f = clamp(effect.factor > 0 ? effect.factor : 0.65, 0.1, 1);
        s.slowFactor = s.slowTimer > 0 ? Math.min(s.slowFactor, f) : f;
        s.slowTimer = Math.max(s.slowTimer, sec);
        break;
      }
      case EFFECT.KNOCKBACK: {
        if (shielded) return;
        const force = effect.force > 0 ? effect.force : 8;
        const from = effect.from || {};
        let dx = s.x - (Number.isFinite(from.x) ? from.x : s.x);
        let dz = s.z - (Number.isFinite(from.z) ? from.z : s.z);
        let len = Math.hypot(dx, dz);
        if (len < 1e-4) { // hit from exactly our position → push backwards
          dx = -Math.sin(s.heading); dz = -Math.cos(s.heading); len = 1;
        }
        const imp = force / spec.weight;
        s.pushX += (dx / len) * imp;
        s.pushZ += (dz / len) * imp;
        s.speed *= 0.7;
        if (!s.airborne) { s.vy = TUNING.KNOCKBACK_LIFT; s.airborne = true; }
        endDrift(false);
        break;
      }
      case EFFECT.STUN: {
        if (shielded) return;
        const sec = effect.seconds > 0 ? effect.seconds : 1;
        s.stunTimer = Math.max(s.stunTimer, sec);
        endDrift(false);
        break;
      }
      case EFFECT.TELEPORT:
      default:
        // teleport is resolved by the integrator (needs track.sample)
        break;
    }
  }

  function respawn(track) {
    const s = state;
    let px = s.x, pz = s.z, heading = s.heading, y = 0;
    if (track) {
      const cps = track.checkpoints || [];
      const cp = cps.length ? cps[clamp(s.checkpoint | 0, 0, cps.length - 1)] : null;
      if (cp && cp.position) {
        px = cp.position.x; pz = cp.position.z; y = cp.position.y || 0;
        if (typeof track.sample === "function") {
          const smp = track.sample(cp.t || 0);
          if (smp && smp.tangent) heading = Math.atan2(smp.tangent.x, smp.tangent.z);
          if (smp && smp.position) y = smp.position.y || y;
        }
      }
      if (typeof track.project === "function") {
        const p = track.project(px, pz);
        if (p && Number.isFinite(p.height)) y = p.height;
      }
    }
    s.x = px; s.z = pz; s.y = y;
    s.heading = heading;
    s.speed = 0; s.vx = 0; s.vz = 0; s.vy = 0;
    s.pushX = 0; s.pushZ = 0;
    s.slip = 0;
    s.drifting = false; s.driftCharge = 0; s.driftDir = 0; s.driftBoostReady = false;
    s.boostTimer = 0; s.spinTimer = 0; s.spinAngle = 0; s.stunTimer = 0;
    s.slowTimer = 0; s.slowFactor = 1;
    s.airborne = false; s.hopTimer = 0;
    s.hazardCooldown = TUNING.HAZARD_COOLDOWN;
    s.shieldTimer = Math.max(s.shieldTimer, TUNING.RESPAWN_SHIELD_SECONDS);
    s.tilt = 0; s.landBounce = 0.6;
  }

  function syncMesh() {
    if (!mesh) return;
    const s = state;
    const u = mesh.userData;
    mesh.position.set(s.x, s.y, s.z);
    mesh.rotation.y = s.heading + s.spinAngle;
    const chassis = u.chassis;
    if (chassis) {
      chassis.rotation.z = s.tilt;                                   // lean into a drift
      chassis.rotation.x = s.airborne ? clamp(-s.vy * 0.03, -0.25, 0.15) : 0; // nose up when jumping
      const squash = 1 - 0.25 * s.landBounce;
      chassis.scale.set(1 + 0.12 * s.landBounce, squash, 1 + 0.12 * s.landBounce);
      chassis.position.y = 0;
    }
    if (u.wheels) for (const w of u.wheels) w.rotation.x = s.wheelSpin;
    if (u.frontPivots) for (const p of u.frontPivots) p.rotation.y = -s.steerVisual * 0.45;
  }

  return { id, isPlayer, spec, state, mesh, update, applyEffect, respawn, syncMesh };
}

// ---------------------------------------------------------------------------
// Mesh
// ---------------------------------------------------------------------------

/**
 * buildKartMesh(THREE, spec) → THREE.Group
 * Hierarchy: group (position/heading) → chassis (tilt/bounce) → body, hood, spoiler,
 * driver, helmet, visor, 4 wheels (front two under steer pivots). 10 meshes total.
 * group.userData = { chassis, body, wheels[4], frontPivots[2], driver }
 */
export function buildKartMesh(THREE, spec) {
  const sp = normalizeSpec(spec);
  const group = new THREE.Group();
  group.name = `kart:${sp.name || "?"}`;
  const chassis = new THREE.Group();
  group.add(chassis);

  const bodyMat = new THREE.MeshStandardMaterial({ color: sp.color, roughness: 0.55, metalness: 0.05 });
  const accentMat = new THREE.MeshLambertMaterial({ color: sp.accent });
  const darkMat = new THREE.MeshLambertMaterial({ color: 0x2a2a33 });
  const tireMat = new THREE.MeshLambertMaterial({ color: 0x333338 });

  // body: chunky low box, slightly wider at the back
  const body = new THREE.Mesh(new THREE.BoxGeometry(1.5, 0.45, 2.1), bodyMat);
  body.position.y = 0.45;
  body.castShadow = true;
  chassis.add(body);

  // rounded hood (squashed sphere) on the nose
  const hood = new THREE.Mesh(new THREE.SphereGeometry(0.62, 12, 8), bodyMat);
  hood.scale.set(1.05, 0.5, 1.3);
  hood.position.set(0, 0.68, 0.55);
  chassis.add(hood);

  // spoiler at the back in the accent color
  const spoiler = new THREE.Mesh(new THREE.BoxGeometry(1.4, 0.12, 0.34), accentMat);
  spoiler.position.set(0, 0.98, -0.95);
  chassis.add(spoiler);

  // driver blob (accent) + helmet (body color) + visor (dark)
  const driver = new THREE.Mesh(new THREE.SphereGeometry(0.36, 10, 8), accentMat);
  driver.scale.set(1, 0.9, 0.9);
  driver.position.set(0, 0.92, -0.25);
  chassis.add(driver);
  const helmet = new THREE.Mesh(new THREE.SphereGeometry(0.3, 12, 8), bodyMat);
  helmet.position.set(0, 1.32, -0.25);
  chassis.add(helmet);
  const visor = new THREE.Mesh(new THREE.BoxGeometry(0.4, 0.14, 0.12), darkMat);
  visor.position.set(0, 1.3, 0.0);
  chassis.add(visor);

  // wheels: cylinders with their axis along X
  const wheelGeo = new THREE.CylinderGeometry(TUNING.WHEEL_RADIUS, TUNING.WHEEL_RADIUS, 0.3, 10);
  wheelGeo.rotateZ(Math.PI / 2);
  const wheels = [];
  const frontPivots = [];
  const offsets = [
    [0.8, 0.72, true], [-0.8, 0.72, true],   // front (steer)
    [0.8, -0.72, false], [-0.8, -0.72, false], // rear
  ];
  for (const [wx, wz, front] of offsets) {
    const wheel = new THREE.Mesh(wheelGeo, tireMat);
    wheel.castShadow = false;
    if (front) {
      const pivot = new THREE.Group();
      pivot.position.set(wx, TUNING.WHEEL_RADIUS, wz);
      pivot.add(wheel);
      chassis.add(pivot);
      frontPivots.push(pivot);
    } else {
      wheel.position.set(wx, TUNING.WHEEL_RADIUS, wz);
      chassis.add(wheel);
    }
    wheels.push(wheel);
  }

  group.userData = { chassis, body, wheels, frontPivots, driver };
  return group;
}
