// node --test tests/track.test.js
import { test } from "node:test";
import assert from "node:assert/strict";
import * as THREE from "../../kart3d/vendor/three.module.min.js";
import { buildTrack, TRACK_IDS } from "../src/track.js";
import { TRACKS, RACE } from "../src/contracts.js";

const wrapDelta = (a, b) => { let d = b - a; while (d > Math.PI) d -= Math.PI * 2; while (d < -Math.PI) d += Math.PI * 2; return d; };
const countDrawCalls = (group) => { let n = 0; group.traverse((o) => { if (o.isMesh || o.isInstancedMesh || o.isPoints || o.isLine) n++; }); return n; };

test("TRACK_IDS matches contracts.TRACKS", () => {
  assert.deepEqual([...TRACK_IDS], [...TRACKS]);
});

test("unknown track id throws", () => {
  assert.throws(() => buildTrack("moon", THREE), /unknown track/);
});

for (const id of TRACKS) {
  test(`${id}: builds with all contract fields`, () => {
    const tr = buildTrack(id, THREE);
    assert.equal(tr.id, id);
    assert.equal(typeof tr.name, "string");
    assert.ok(tr.name.length > 0);
    assert.equal(tr.laps, RACE.LAPS);
    assert.ok(tr.curve instanceof THREE.CatmullRomCurve3);
    assert.equal(tr.curve.closed, true);
    assert.ok(tr.group instanceof THREE.Group);
    assert.ok(tr.width >= 8 && tr.width <= 16, `width ${tr.width}`);
    assert.ok(tr.length > 300, `length ${tr.length}`);
    assert.ok(Math.abs(tr.length - tr.curve.getLength()) < 1);
    assert.ok(Array.isArray(tr.boostPads));
    assert.ok(Array.isArray(tr.hazards));
    assert.equal(typeof tr.sample, "function");
    assert.equal(typeof tr.project, "function");
    assert.equal(typeof tr.progressBetween, "function");
  });

  test(`${id}: checkpoints 12–20, ascending, [0] is start/finish`, () => {
    const tr = buildTrack(id, THREE);
    assert.ok(tr.checkpoints.length >= 12 && tr.checkpoints.length <= 20, `count ${tr.checkpoints.length}`);
    assert.equal(tr.checkpoints[0].t, 0);
    for (let i = 1; i < tr.checkpoints.length; i++) {
      assert.ok(tr.checkpoints[i].t > tr.checkpoints[i - 1].t, `checkpoint ${i} not ascending`);
      assert.ok(tr.checkpoints[i].t < 1);
      assert.ok(tr.checkpoints[i].position instanceof THREE.Vector3);
    }
    const start = tr.sample(0).position;
    assert.ok(tr.checkpoints[0].position.distanceTo(start) < 0.01);
  });

  test(`${id}: start grid = 6 slots, 2 columns, behind the line, on track, facing the curve`, () => {
    const tr = buildTrack(id, THREE);
    assert.equal(tr.startGrid.length, 6);
    const lats = [];
    for (const p of tr.startGrid) {
      assert.ok(p instanceof THREE.Vector3);
      const pr = tr.project(p.x, p.z);
      assert.ok(pr.onTrack, `grid slot off track (lateral ${pr.lateral})`);
      assert.ok(Math.abs(pr.lateral) <= tr.width / 2 - 1.0, "slot should leave room to the edge");
      assert.ok(pr.t > 0.9 && pr.t < 1, `slot must sit just behind the line, t=${pr.t}`);
      lats.push(pr.lateral);
    }
    const left = lats.filter((l) => l < 0).length, right = lats.filter((l) => l > 0).length;
    assert.equal(left, 3); assert.equal(right, 3);
    // heading convention: 0 = +Z, forward = (sin θ, 0, cos θ) — must match curve tangent at the slot
    for (const slot of tr.startSlots) {
      const tg = tr.sample(slot.t).tangent;
      const expected = Math.atan2(tg.x, tg.z);
      assert.ok(Math.abs(wrapDelta(expected, slot.heading)) < 1e-6);
      const fwd = new THREE.Vector3(Math.sin(slot.heading), 0, Math.cos(slot.heading));
      assert.ok(fwd.dot(new THREE.Vector3(tg.x, 0, tg.z).normalize()) > 0.999);
    }
    // the line itself should be ahead of every slot by a few metres
    for (const slot of tr.startSlots) {
      const ahead = tr.progressBetween(slot.t, 0);
      assert.ok(ahead > 3 && ahead < 25, `line ${ahead} m ahead`);
    }
  });

  test(`${id}: project() of sampled centreline points is on track with |lateral| < 0.5 and t close`, () => {
    const tr = buildTrack(id, THREE);
    for (let i = 0; i < 97; i++) {
      const t = i / 97;
      const s = tr.sample(t);
      const pr = tr.project(s.position.x, s.position.z);
      assert.ok(pr.onTrack, `t=${t} not on track`);
      assert.ok(Math.abs(pr.lateral) < 0.5, `t=${t} lateral ${pr.lateral}`);
      const dt = Math.abs(((pr.t - t + 1.5) % 1) - 0.5);
      assert.ok(dt < 0.004, `t mismatch ${t} vs ${pr.t}`);
      assert.ok(Math.abs(pr.height - s.position.y) < 0.25, `height ${pr.height} vs ${s.position.y}`);
      assert.equal(typeof pr.heading, "number");
    }
  });

  test(`${id}: lateral is signed, right positive relative to the tangent`, () => {
    const tr = buildTrack(id, THREE);
    for (const t of [0.05, 0.3, 0.55, 0.8]) {
      const s = tr.sample(t);
      // right = forward × up = (-cos θ, 0, sin θ)
      const th = Math.atan2(s.tangent.x, s.tangent.z);
      const right = new THREE.Vector3(-Math.cos(th), 0, Math.sin(th));
      const pR = s.position.clone().addScaledVector(right, 2);
      const pL = s.position.clone().addScaledVector(right, -2);
      assert.ok(Math.abs(tr.project(pR.x, pR.z).lateral - 2) < 0.15);
      assert.ok(Math.abs(tr.project(pL.x, pL.z).lateral + 2) < 0.15);
      // sample().normal is that same right vector
      assert.ok(s.normal.dot(right) > 0.999);
      // beyond the edge → off track
      const pOff = s.position.clone().addScaledVector(right, tr.width / 2 + 3);
      assert.equal(tr.project(pOff.x, pOff.z).onTrack, false);
    }
  });

  test(`${id}: progressBetween wraps around the closed curve`, () => {
    const tr = buildTrack(id, THREE);
    const L = tr.length;
    assert.ok(Math.abs(tr.progressBetween(0.95, 0.05) - 0.1 * L) < 1e-6);
    assert.ok(Math.abs(tr.progressBetween(0.05, 0.95) + 0.1 * L) < 1e-6);
    assert.ok(Math.abs(tr.progressBetween(0.2, 0.5) - 0.3 * L) < 1e-6);
    assert.ok(Math.abs(tr.progressBetween(0.5, 0.2) + 0.3 * L) < 1e-6);
    assert.equal(tr.progressBetween(0.4, 0.4), 0);
    assert.ok(Math.abs(tr.progressBetween(0.99, 1.01) - 0.02 * L) < 1e-6);
  });

  test(`${id}: pads/hazards sit on the road; scenery uses InstancedMesh; draw calls < 80`, () => {
    const tr = buildTrack(id, THREE);
    for (const b of tr.boostPads) {
      assert.ok(b.position instanceof THREE.Vector3);
      assert.ok(b.radius > 0);
      assert.ok(tr.project(b.position.x, b.position.z).onTrack);
    }
    for (const h of tr.hazards) {
      assert.ok(["oil", "mud"].includes(h.kind));
      assert.ok(h.radius > 0);
      assert.ok(tr.project(h.position.x, h.position.z).onTrack);
    }
    let instanced = 0, roadRows = 0;
    tr.group.traverse((o) => {
      if (o.isInstancedMesh) instanced++;
      if (o.name === "road") roadRows = o.geometry.getAttribute("position").count;
    });
    assert.ok(instanced >= 4, `expected instanced scenery, got ${instanced}`);
    assert.ok(roadRows >= 200 * 2, "road ribbon should have ≥ 200 segments");
    const calls = countDrawCalls(tr.group);
    assert.ok(calls < 80, `draw calls ${calls}`);
    assert.ok(tr.lights.length === 2);
  });

  test(`${id}: sample(t) wraps and returns unit tangent`, () => {
    const tr = buildTrack(id, THREE);
    const a = tr.sample(0.25), b = tr.sample(1.25), c = tr.sample(-0.75);
    assert.ok(a.position.distanceTo(b.position) < 1e-6);
    assert.ok(a.position.distanceTo(c.position) < 1e-6);
    assert.ok(Math.abs(a.tangent.length() - 1) < 1e-6);
    assert.ok(Math.abs(tr.headingAt(0.25) - a.heading) < 1e-9);
  });
}

test("meadow is the easiest: widest and gentlest", () => {
  const m = buildTrack("meadow", THREE), c = buildTrack("castle", THREE), s = buildTrack("sky", THREE);
  assert.ok(m.width > c.width && c.width > s.width);
  assert.ok(m.length >= 400 && m.length <= 440);
  assert.ok(c.length >= 500 && c.length <= 540);
  assert.equal(m.fallOff, false); assert.equal(c.fallOff, false); assert.equal(s.fallOff, true);
});

test("castle has one raised jump ramp", () => {
  const c = buildTrack("castle", THREE);
  assert.ok(c.ramp && c.ramp.peak > 2 && c.ramp.t1 > c.ramp.t0);
  const top = c.sample((c.ramp.t0 + c.ramp.t1) / 2).position.y;
  assert.ok(top > 1.5, `ramp height ${top}`);
  assert.ok(c.sample(0).position.y < 0.2, "start line is flat");
  const pr = c.project(c.sample((c.ramp.t0 + c.ramp.t1) / 2).position.x, c.sample((c.ramp.t0 + c.ramp.t1) / 2).position.z);
  assert.ok(pr.height > 1.5, "project().height follows the ramp");
});

test("sky: off-track means falling, gaps have a boost pad shortly before them", () => {
  const s = buildTrack("sky", THREE);
  assert.ok(s.gaps.length >= 3);
  assert.ok(s.boostPads.length >= 4);
  const p = s.sample(0.5);
  const off = p.position.clone().addScaledVector(p.normal, s.width / 2 + 2);
  const pr = s.project(off.x, off.z);
  assert.equal(pr.onTrack, false);
  assert.equal(pr.falling, true);
  for (const g of s.gaps) {
    const lead = s.boostPads.some((b) => { const d = s.progressBetween(b.t, g.t0); return d > 4 && d < 30; });
    assert.ok(lead, `gap at ${g.t0} has no boost pad before it`);
    assert.ok(s.inGap((g.t0 + g.t1) / 2));
  }
  const bridge = s.group.children.find((o) => o.name === "bridge");
  assert.ok(bridge && bridge.material.transparent);
});

test("respawnAt returns a checkpoint pose", () => {
  const tr = buildTrack("meadow", THREE);
  const r = tr.respawnAt(3);
  assert.ok(r.position.distanceTo(tr.checkpoints[3].position) < 1e-6);
  assert.equal(r.heading, tr.checkpoints[3].heading);
  assert.equal(tr.respawnAt(-1).t, tr.checkpoints[tr.checkpoints.length - 1].t);
});
