import { test } from "node:test";
import assert from "node:assert/strict";
import { createVehicle, buildKartMesh, TUNING } from "../src/vehicle.js";
import { RACE, HEROES, makeRng } from "../src/contracts.js";

const DT = 1 / 60;

// Minimal fake track: flat plane, everything on-track unless told otherwise.
function fakeTrack({ onTrack = true, height = 0, boostPads = [], hazards = [] } = {}) {
  return {
    project(x, z) { return { t: 0, lateral: 0, onTrack: typeof onTrack === "function" ? onTrack(x, z) : onTrack, height: typeof height === "function" ? height(x, z) : height }; },
    boostPads,
    hazards,
    checkpoints: [{ t: 0, position: { x: 0, y: 0, z: 0 } }],
    sample() { return { position: { x: 0, y: 0, z: 0 }, tangent: { x: 0, y: 0, z: 1 } }; },
  };
}

function kart(specOverride = {}) {
  const hero = HEROES[0];
  return createVehicle({ id: "t", isPlayer: true, spec: { ...hero.spec, color: hero.color, accent: hero.accent, name: hero.name, ...specOverride } });
}

function run(v, seconds, input, track = fakeTrack(), rng = makeRng(7)) {
  const n = Math.round(seconds / DT);
  for (let i = 0; i < n; i++) v.update(DT, typeof input === "function" ? input(i * DT) : input, track, rng);
}

test("accelerates to ~top speed in under 4 s at 60 Hz", () => {
  const v = kart({ topSpeed: 1, accel: 1 });
  const top = RACE.TOP_SPEED;
  let reached = null;
  for (let i = 0; i < 4 * 60; i++) {
    v.update(DT, { throttle: 1 }, fakeTrack(), makeRng(1));
    if (reached === null && v.state.speed >= top * 0.97) reached = (i + 1) * DT;
  }
  assert.ok(reached !== null && reached < 4, `reached 97% at ${reached}s`);
  assert.ok(reached > 1.0, "should not be instant");
  assert.ok(v.state.speed <= top + 1e-9, "never exceeds top speed without boost");
  assert.ok(v.state.z > 30, "moved forward along +Z");
  assert.ok(Math.abs(v.state.x) < 1e-6, "no sideways drift when not steering");
});

test("brake stops the kart and holding it reverses", () => {
  const v = kart();
  run(v, 2, { throttle: 1 });
  run(v, 2, { brake: 1 });
  assert.ok(v.state.speed < 0, "reversing");
  assert.ok(v.state.speed >= -TUNING.REVERSE_SPEED - 1e-9);
});

test("steer +1 turns right (heading decreases), -1 turns left (heading increases)", () => {
  const r = kart();
  run(r, 1, { throttle: 1, steer: 1 });
  assert.ok(r.state.heading < -0.2, `right heading ${r.state.heading}`);
  assert.ok(r.state.x < 0, "right turn moves toward -X");
  const l = kart();
  run(l, 1, { throttle: 1, steer: -1 });
  assert.ok(l.state.heading > 0.2, `left heading ${l.state.heading}`);
  assert.ok(l.state.x > 0, "left turn moves toward +X");
  assert.ok(Math.abs(l.state.heading + r.state.heading) < 1e-6, "symmetric");
});

test("steering is tighter at low speed than at top speed", () => {
  const slow = kart();
  run(slow, 0.5, { throttle: 1 });
  const h0 = slow.state.heading;
  run(slow, 0.5, { throttle: 1, steer: 1 });
  const slowTurn = Math.abs(slow.state.heading - h0);
  const fast = kart();
  run(fast, 3, { throttle: 1 });
  const h1 = fast.state.heading;
  run(fast, 0.5, { throttle: 1, steer: 1 });
  const fastTurn = Math.abs(fast.state.heading - h1);
  assert.ok(slowTurn > fastTurn, `slow ${slowTurn} vs fast ${fastTurn}`);
});

test("handling spec scales turn rate", () => {
  const a = kart({ handling: 0.8 });
  const b = kart({ handling: 1.2 });
  run(a, 2, { throttle: 1 }); run(b, 2, { throttle: 1 });
  run(a, 0.5, { throttle: 1, steer: -1 }); run(b, 0.5, { throttle: 1, steer: -1 });
  assert.ok(b.state.heading > a.state.heading * 1.2);
});

test("drift: charge reaches 1 and releasing gives a boost above top speed", () => {
  const v = kart();
  run(v, 3, { throttle: 1 });
  const h0 = v.state.heading;
  run(v, 1.6, { throttle: 1, steer: 1, drift: true });
  assert.equal(v.state.drifting, true);
  assert.equal(v.state.driftCharge, 1);
  assert.equal(v.state.driftBoostReady, true);
  assert.ok(v.state.heading < h0 - 0.5, "kart turned right while drifting");
  assert.ok(v.state.slip > 0.2, "nose points inside the slide");
  // release
  v.update(DT, { throttle: 1, steer: 0, drift: false }, fakeTrack(), makeRng(1));
  assert.equal(v.state.drifting, false);
  assert.ok(v.state.boostTimer > 1.9, `super boost ${v.state.boostTimer}`);
  run(v, 0.8, { throttle: 1 });
  assert.ok(v.state.speed > RACE.TOP_SPEED + 4, `boosting speed ${v.state.speed}`);
  assert.ok(v.state.speed <= RACE.BOOST_SPEED + 1e-6);
  // boost fades back to top speed
  run(v, 3, { throttle: 1 });
  assert.ok(Math.abs(v.state.speed - RACE.TOP_SPEED) < 0.5);
});

test("drift: mini-boost at charge >= 0.5, nothing below", () => {
  const mini = kart();
  run(mini, 3, { throttle: 1 });
  run(mini, 0.9, { throttle: 1, steer: -1, drift: true });
  assert.ok(mini.state.driftCharge >= 0.5 && mini.state.driftCharge < 1);
  mini.update(DT, { throttle: 1 }, fakeTrack());
  assert.ok(mini.state.boostTimer > 1.0 && mini.state.boostTimer <= TUNING.MINI_BOOST_SECONDS);

  const none = kart();
  run(none, 3, { throttle: 1 });
  run(none, 0.3, { throttle: 1, steer: -1, drift: true });
  none.update(DT, { throttle: 1 }, fakeTrack());
  assert.equal(none.state.boostTimer, 0);
  assert.equal(none.state.driftCharge, 0);
});

test("drift does not start without steering or at low speed", () => {
  const v = kart();
  run(v, 0.5, { throttle: 1, steer: 1, drift: true });
  assert.equal(v.state.drifting, false, "too slow at start");
  const w = kart();
  run(w, 3, { throttle: 1 });
  run(w, 0.5, { throttle: 1, drift: true });
  assert.equal(w.state.drifting, false, "no steer");
});

test("off-track cuts the target speed to OFFTRACK_FACTOR", () => {
  const v = kart();
  run(v, 4, { throttle: 1 }, fakeTrack({ onTrack: false }));
  const expected = RACE.TOP_SPEED * RACE.OFFTRACK_FACTOR;
  assert.ok(Math.abs(v.state.speed - expected) < 0.5, `speed ${v.state.speed} vs ${expected}`);
  assert.equal(v.state.onTrack, false);
  // back on track → recovers to top speed
  run(v, 4, { throttle: 1 }, fakeTrack());
  assert.ok(v.state.speed > RACE.TOP_SPEED * 0.97);
});

test("shield blocks spin, slow, stun and knockback", () => {
  const v = kart();
  run(v, 3, { throttle: 1 });
  v.applyEffect({ type: "shield", seconds: 4 });
  const speed = v.state.speed;
  v.applyEffect({ type: "spin" });
  v.applyEffect({ type: "slow", seconds: 3, factor: 0.5 });
  v.applyEffect({ type: "stun", seconds: 2 });
  v.applyEffect({ type: "knockback", from: { x: v.state.x, z: v.state.z - 2 }, force: 12 });
  assert.equal(v.state.spinTimer, 0);
  assert.equal(v.state.slowTimer, 0);
  assert.equal(v.state.stunTimer, 0);
  assert.equal(v.state.pushZ, 0);
  assert.equal(v.state.speed, speed);
});

test("spin without shield: 1.2 s, speed x0.4, no control, then recovers", () => {
  const v = kart();
  run(v, 3, { throttle: 1 });
  const before = v.state.speed;
  v.applyEffect({ type: "spin", rng: makeRng(3) });
  assert.equal(v.state.spinTimer, 1.2);
  assert.ok(Math.abs(v.state.speed - before * 0.4) < 1e-9);
  const h = v.state.heading;
  run(v, 0.6, { throttle: 1, steer: 1 });
  assert.equal(v.state.heading, h, "steering ignored while spinning");
  assert.ok(Math.abs(v.state.spinAngle) > Math.PI, "kart is visibly rotating");
  run(v, 0.7, { throttle: 1 });
  assert.equal(v.state.spinTimer, 0);
  assert.equal(v.state.spinAngle, 0);
  run(v, 2, { throttle: 1 });
  assert.ok(v.state.speed > RACE.TOP_SPEED * 0.95);
});

test("oil hazard spins the kart once (cooldown), mud slows it", () => {
  const rng = makeRng(5);
  const v = kart();
  const track = fakeTrack({ hazards: [{ position: { x: 0, z: 40 }, radius: 3, kind: "oil" }] });
  let spins = 0, wasSpinning = false;
  for (let i = 0; i < 6 * 60; i++) {
    v.update(DT, { throttle: 1 }, track, rng);
    if (v.state.spinTimer > 0 && !wasSpinning) spins++;
    wasSpinning = v.state.spinTimer > 0;
  }
  assert.equal(spins, 1);

  const m = kart();
  const mud = fakeTrack({ hazards: [{ position: { x: 0, z: 0 }, radius: 1e6, kind: "mud" }] });
  run(m, 4, { throttle: 1 }, mud);
  assert.ok(Math.abs(m.state.speed - RACE.TOP_SPEED * TUNING.MUD_FACTOR) < 0.5);
});

test("boost pad triggers a boost", () => {
  const v = kart();
  const track = fakeTrack({ boostPads: [{ position: { x: 0, z: 30 }, radius: 2.5 }] });
  let maxSpeed = 0;
  for (let i = 0; i < 5 * 60; i++) { v.update(DT, { throttle: 1 }, track); maxSpeed = Math.max(maxSpeed, v.state.speed); }
  assert.ok(maxSpeed > RACE.TOP_SPEED + 3, `max ${maxSpeed}`);
});

test("knockback moves the kart away from the source, scaled by 1/weight", () => {
  function hit(weight) {
    const v = kart({ weight });
    v.state.x = 10; v.state.z = 10;
    v.applyEffect({ type: "knockback", from: { x: 12, z: 10 }, force: 12 });
    run(v, 0.5, {});
    return v;
  }
  const light = hit(0.8), heavy = hit(1.4);
  assert.ok(light.state.x < 10 - 0.5, `pushed toward -X: ${light.state.x}`);
  assert.ok(Math.abs(light.state.z - 10) < 0.05);
  assert.ok(heavy.state.x < 10);
  assert.ok((10 - light.state.x) > (10 - heavy.state.x) * 1.3, "light kart flies further");
  assert.equal(light.state.airborne, false, "landed again");
});

test("slow effect reduces speed for its duration; stun removes throttle", () => {
  const v = kart();
  run(v, 3, { throttle: 1 });
  v.applyEffect({ type: "slow", seconds: 2, factor: 0.6 });
  run(v, 1.5, { throttle: 1 });
  assert.ok(Math.abs(v.state.speed - RACE.TOP_SPEED * 0.6) < 0.5);
  run(v, 3, { throttle: 1 });
  assert.ok(v.state.speed > RACE.TOP_SPEED * 0.97, "slow expired");

  v.applyEffect({ type: "stun", seconds: 1 });
  const s0 = v.state.speed;
  run(v, 0.5, { throttle: 1 });
  assert.ok(v.state.speed < s0 - 2, "coasting while stunned");
});

test("hop leaves the ground briefly and lands; raised road is followed", () => {
  const v = kart();
  run(v, 2, { throttle: 1 });
  v.update(DT, { throttle: 1, hop: true }, fakeTrack());
  assert.equal(v.state.airborne, true);
  let maxY = 0;
  run(v, 0.6, { throttle: 1, hop: true });
  for (let i = 0; i < 40; i++) { v.update(DT, { throttle: 1 }, fakeTrack()); maxY = Math.max(maxY, v.state.y); }
  assert.equal(v.state.airborne, false);
  assert.equal(v.state.y, 0);

  const r = kart();
  const ramp = fakeTrack({ height: (x, z) => (z > 20 && z < 40 ? 2 : 0) });
  run(r, 1.5, { throttle: 1 }, ramp);
  assert.equal(r.state.y, 2, `on the raised part at z=${r.state.z}`);
  run(r, 1.2, { throttle: 1 }, ramp);
  assert.ok(r.state.z > 40);
  run(r, 1.5, { throttle: 1 }, ramp);
  assert.equal(r.state.y, 0, "back on the ground after the drop");
  assert.equal(r.state.airborne, false);
});

test("respawn places the kart at its checkpoint facing the tangent", () => {
  const v = kart();
  run(v, 2, { throttle: 1, steer: 1 });
  const track = fakeTrack();
  track.checkpoints = [{ t: 0, position: { x: 0, y: 0, z: 0 } }, { t: 0.5, position: { x: 50, y: 0, z: 20 } }];
  track.sample = (t) => ({ position: { x: 50, y: 0, z: 20 }, tangent: { x: 1, y: 0, z: 0 } });
  v.state.checkpoint = 1;
  v.respawn(track);
  assert.equal(v.state.x, 50); assert.equal(v.state.z, 20);
  assert.ok(Math.abs(v.state.heading - Math.PI / 2) < 1e-9);
  assert.equal(v.state.speed, 0);
  assert.ok(v.state.shieldTimer > 0);
});

test("update tolerates missing input/track and never explodes", () => {
  const v = kart();
  v.update(DT, undefined, undefined, undefined);
  v.update(0, { throttle: 1 }, null);
  v.update(1, { throttle: 1 }, null); // huge dt clamped
  assert.ok(Number.isFinite(v.state.x) && Number.isFinite(v.state.speed));
  assert.equal(v.mesh, null);
  v.syncMesh(); // no-op without mesh
});

test("buildKartMesh: ≤ 12 meshes, body casts shadow, wheels/pivots exposed, syncMesh works", async () => {
  const THREE = await import("../../kart3d/vendor/three.module.min.js");
  const hero = HEROES[2];
  const v = createVehicle({ id: hero.id, spec: { ...hero.spec, color: hero.color, accent: hero.accent, name: hero.name } }, THREE);
  assert.ok(v.mesh);
  let meshes = 0;
  v.mesh.traverse((o) => { if (o.isMesh) meshes++; });
  assert.ok(meshes <= 12 && meshes >= 7, `mesh count ${meshes}`);
  assert.equal(v.mesh.userData.body.castShadow, true);
  assert.equal(v.mesh.userData.wheels.length, 4);
  assert.equal(v.mesh.userData.frontPivots.length, 2);
  assert.equal(v.mesh.userData.body.material.color.getHex(), hero.color);
  assert.equal(v.mesh.userData.driver.material.color.getHex(), hero.accent);

  run(v, 2, { throttle: 1, steer: 1, drift: true });
  v.syncMesh();
  assert.ok(Math.abs(v.mesh.position.z - v.state.z) < 1e-9);
  assert.ok(Math.abs(v.mesh.rotation.y - v.state.heading) < 1e-9);
  assert.ok(Math.abs(v.mesh.userData.chassis.rotation.z) > 0.1, "tilts while drifting");
  assert.notEqual(v.mesh.userData.wheels[0].rotation.x, 0, "wheels rotate");
  assert.notEqual(v.mesh.userData.frontPivots[0].rotation.y, 0, "front wheels steer");

  const g = buildKartMesh(THREE, { color: 0x123456 });
  assert.ok(g.isGroup);
});
