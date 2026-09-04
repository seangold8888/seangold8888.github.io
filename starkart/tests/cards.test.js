// node --test tests/cards.test.js  — 카드 시스템 단위 테스트 (DOM/Three 없이 실행)
import { test } from "node:test";
import assert from "node:assert/strict";
import { CARD_LIBRARY, createCardSystem, renderHand, getCard } from "../src/cards.js";
import { RACE, EVENTS, EventBus, makeRng } from "../src/contracts.js";

// ---------------------------------------------------------------------------
// Fakes
// ---------------------------------------------------------------------------
function spy() {
  const fn = (...args) => { fn.calls.push(args); };
  fn.calls = [];
  return fn;
}
function fakeVehicle(id, { x = 0, z = 0, heading = 0, rank = 0, shield = 0, progress = 0 } = {}) {
  return {
    id, isPlayer: id === "p",
    state: { x, y: 0, z, heading, speed: 0, vx: 0, vz: 0, shieldTimer: shield, spinTimer: 0, boostTimer: 0, stunTimer: 0, lap: 0, checkpoint: 0, progress, rank },
    applyEffect: spy(),
  };
}
function fakeTrack(length = 200) {
  // straight "track" along +Z that wraps at `length`
  return {
    length,
    sample(t) { const d = ((t % 1) + 1) % 1 * length; return { position: { x: 0, y: 0, z: d }, tangent: { x: 0, y: 0, z: 1 }, normal: { x: 1, y: 0, z: 0 } }; },
    project(x, z) { return { t: (((z % length) + length) % length) / length, lateral: x, onTrack: true, height: 0 }; },
    progressBetween(t0, t1) { let d = (t1 - t0) * length; if (d < 0) d += length; return d; },
  };
}
function makeRace(vehicles, extra = {}) {
  return { vehicles, started: true, track: fakeTrack(), bus: new EventBus(), time: 0, ...extra };
}
function sys(race, extra = {}) {
  return createCardSystem({ race, rng: makeRng(7), ...extra });
}
function effectTypes(v) { return v.applyEffect.calls.map((c) => c[0].type); }

// ---------------------------------------------------------------------------
// Library
// ---------------------------------------------------------------------------
test("library: 10 unique cards with valid kinds, costs and effects", () => {
  assert.equal(CARD_LIBRARY.length, RACE.DECK_SIZE);
  const ids = new Set(CARD_LIBRARY.map((c) => c.id));
  assert.equal(ids.size, 10);
  const kinds = new Set(["attack", "defense", "boost", "trick"]);
  const effects = new Set(["projectile", "self", "drop", "aoe_others", "mana", "nearby", "summon_helper", "teleport_forward", "steal_mana"]);
  for (const c of CARD_LIBRARY) {
    assert.ok(kinds.has(c.kind), `${c.id} kind`);
    assert.ok(Number.isInteger(c.cost) && c.cost >= 1 && c.cost <= 3, `${c.id} cost`);
    assert.ok(effects.has(c.effect.type), `${c.id} effect ${c.effect.type}`);
    assert.ok(/[가-힣]/.test(c.name), `${c.id} korean name`);
    assert.ok(c.desc.length <= 18, `${c.id} desc ≤ 18 chars (${c.desc.length})`);
    assert.ok(c.emoji && c.hero, `${c.id} emoji/hero`);
  }
  assert.equal(getCard("pebble").cost, 2);
  assert.equal(getCard("rice_cake").cost, 1);
  assert.equal(getCard("blizzard").cost, 3);
  assert.equal(getCard("call_hunter").effect.seconds, 5);
  assert.equal(getCard("flash_step").effect.meters, 25);
  assert.equal(getCard("river_water").cost, 1);
});

// ---------------------------------------------------------------------------
// Deck / hand / mana
// ---------------------------------------------------------------------------
test("attach: hand of 3, deck of 7, mana 0; shuffle is deterministic per rng", () => {
  const p = fakeVehicle("p");
  const s = sys(makeRace([p]));
  s.attach(p);
  assert.equal(s.getHand("p").length, RACE.HAND_SIZE);
  assert.equal(s.getDeck("p").length, RACE.DECK_SIZE - RACE.HAND_SIZE);
  assert.equal(s.getMana("p"), 0);
  const all = [...s.getHand("p").map((c) => c.id), ...s.getDeck("p")];
  assert.equal(new Set(all).size, 10);

  const s2 = createCardSystem({ race: makeRace([p]), rng: makeRng(7) });
  s2.attach(p);
  assert.deepEqual(s2.getHand("p").map((c) => c.id), s.getHand("p").map((c) => c.id));
});

test("mana: +1 per MANA_TICK_SECONDS while started, caps at MANA_MAX, checkpoint +1", () => {
  const p = fakeVehicle("p");
  const race = makeRace([p]);
  const s = sys(race);
  s.attach(p);
  s.update(RACE.MANA_TICK_SECONDS - 0.01);
  assert.equal(s.getMana("p"), 0);
  s.update(0.02);
  assert.equal(s.getMana("p"), 1);
  for (let i = 0; i < 20; i++) s.update(RACE.MANA_TICK_SECONDS);
  assert.equal(s.getMana("p"), RACE.MANA_MAX);
  s.onCheckpoint("p");
  assert.equal(s.getMana("p"), RACE.MANA_MAX);

  race.started = false;
  const s3 = sys(race); s3.attach(p);
  s3.update(60);
  assert.equal(s3.getMana("p"), 0, "no mana before race start");
  s3.onCheckpoint("p");
  assert.equal(s3.getMana("p"), 1);
});

test("play: fails without mana; succeeds with mana, discards and redraws, emits CARD_PLAYED", () => {
  const p = fakeVehicle("p");
  const race = makeRace([p]);
  const audio = { card: spy(), hit: spy() };
  const s = sys(race, { audio });
  s.attach(p);
  const played = [];
  race.bus.on(EVENTS.CARD_PLAYED, (e) => played.push(e));

  const first = s.getHand("p")[0];
  assert.equal(s.play("p", first.id), false, "no mana");
  assert.equal(s.play("p", "nope"), false, "unknown card");

  s.addMana("p", 5);
  assert.equal(s.play("p", "glass_shoe"), s.getHand("p").some((c) => c.id === "glass_shoe"), "card must be in hand");
  const before = s.getHand("p").map((c) => c.id);
  const target = before[0];
  const cost = getCard(target).cost;
  assert.equal(s.play("p", target), true);
  assert.equal(s.getMana("p"), 5 - cost + (getCard(target).effect.type === "mana" ? 2 : 0));
  const after = s.getHand("p").map((c) => c.id);
  assert.equal(after.length, RACE.HAND_SIZE);
  assert.ok(!after.includes(target), "played card left the hand");
  assert.equal(s.getDeck("p").length, 6);
  assert.deepEqual(s.getDiscard("p"), [target]);
  assert.equal(played.length, 1);
  assert.equal(played[0].cardId, target);
  assert.equal(audio.card.calls.length, 1);
  assert.equal(audio.card.calls[0][0], getCard(target).kind);
});

test("deck reshuffles discards when empty; onLap draws only if hand short", () => {
  const p = fakeVehicle("p");
  const s = sys(makeRace([p]));
  s.attach(p);
  for (let i = 0; i < 12; i++) {
    s.addMana("p", 5);
    const c = s.getHand("p").find((x) => x.effect.type === "self" || x.effect.type === "mana" || x.effect.type === "drop") || s.getHand("p")[0];
    assert.equal(s.play("p", c.id), true);
    assert.equal(s.getHand("p").length, RACE.HAND_SIZE, `hand full after play ${i}`);
  }
  s.onLap("p");
  assert.equal(s.getHand("p").length, RACE.HAND_SIZE);
});

// ---------------------------------------------------------------------------
// Entities
// ---------------------------------------------------------------------------
test("projectile: hits the kart 10 m ahead with spin, emits HIT, calls vfx/audio", () => {
  const p = fakeVehicle("p", { x: 0, z: 0, heading: 0 });
  const t = fakeVehicle("ai1", { x: 0.5, z: 10 });
  const far = fakeVehicle("ai2", { x: 0, z: 90 });
  const race = makeRace([p, t, far]);
  const vfx = { hit: spy(), shield: spy() };
  const audio = { hit: spy(), card: spy() };
  const s = sys(race, { vfx, audio });
  s.attach(p); s.attach(t); s.attach(far);
  const hits = [];
  race.bus.on(EVENTS.HIT, (e) => hits.push(e));

  s.setHand("p", ["pebble", "glass_shoe", "rice_cake"]);
  s.addMana("p", 2);
  assert.equal(s.play("p", "pebble"), true);
  assert.equal(s.projectiles.length, 1);
  const pr = s.projectiles[0];
  assert.equal(pr.ownerId, "p");
  assert.ok(pr.vz > 39 && Math.abs(pr.vx) < 1e-9, "flies along +Z heading");

  // AI threat query sees it coming
  const th = s.threats("ai1");
  assert.equal(th.length, 1);
  assert.equal(th[0].targetId, "ai1");
  assert.ok(th[0].velocity.z > 0);
  assert.deepEqual(s.threats("p"), [], "owner is not threatened by own shot");

  s.update(0.1); // ~4 m — not there yet
  assert.equal(t.applyEffect.calls.length, 0);
  s.update(0.3); // passes z=10 in sub-steps
  assert.deepEqual(effectTypes(t), ["spin"]);
  assert.equal(far.applyEffect.calls.length, 0);
  assert.equal(s.projectiles.length, 0, "projectile consumed");
  assert.equal(hits.length, 1);
  assert.deepEqual(hits[0], { vehicleId: "ai1", byId: "p", kind: "projectile" });
  assert.equal(vfx.hit.calls.length, 1);
  assert.equal(vfx.hit.calls[0][1], "projectile");
  assert.equal(audio.hit.calls.length, 1);
});

test("projectile: expires after range without hitting anyone", () => {
  const p = fakeVehicle("p");
  const race = makeRace([p]);
  const s = sys(race);
  s.attach(p);
  s.setHand("p", ["pebble", "glass_shoe", "rice_cake"]);
  s.addMana("p", 2);
  s.play("p", "pebble");
  s.update(1.0);
  assert.equal(s.projectiles.length, 1);
  s.update(1.0);
  assert.equal(s.projectiles.length, 0);
});

test("shielded vehicle is not hit by projectile", () => {
  const p = fakeVehicle("p");
  const t = fakeVehicle("ai1", { z: 10, shield: 2 });
  const race = makeRace([p, t]);
  const s = sys(race);
  s.attach(p); s.attach(t);
  const hits = [];
  race.bus.on(EVENTS.HIT, (e) => hits.push(e));
  s.setHand("p", ["pebble", "glass_shoe", "rice_cake"]);
  s.addMana("p", 2);
  s.play("p", "pebble");
  s.update(0.5);
  assert.equal(t.applyEffect.calls.length, 0);
  assert.equal(hits.length, 0);
});

test("self cards: shield and boost apply to owner", () => {
  const p = fakeVehicle("p");
  const vfx = { hit: spy(), shield: spy() };
  const s = sys(makeRace([p]), { vfx });
  s.attach(p);
  s.setHand("p", ["glass_shoe", "pumpkin_coach", "rice_cake"]);
  s.addMana("p", 5);
  assert.equal(s.play("p", "glass_shoe"), true);
  assert.equal(s.play("p", "pumpkin_coach"), true);
  assert.deepEqual(p.applyEffect.calls.map((c) => c[0]), [{ type: "shield", seconds: 4 }, { type: "boost", seconds: 3 }]);
  assert.equal(vfx.shield.calls.length, 1);
  assert.equal(s.getMana("p"), 1);
});

test("oil slick: dropped 2 m behind, spins each victim once (cooldown), ignores shield, expires at 20 s", () => {
  const p = fakeVehicle("p", { x: 0, z: 20, heading: 0 });
  const v1 = fakeVehicle("ai1", { x: 0, z: 18 });        // exactly on the slick
  const v2 = fakeVehicle("ai2", { x: 0.5, z: 18.5, shield: 3 });
  const v3 = fakeVehicle("ai3", { x: 5, z: 18 });        // off to the side
  const race = makeRace([p, v1, v2, v3]);
  const s = sys(race);
  [p, v1, v2, v3].forEach((v) => s.attach(v));
  s.setHand("p", ["sesame_oil", "glass_shoe", "rice_cake"]);
  s.addMana("p", 2);
  assert.equal(s.play("p", "sesame_oil"), true);
  assert.equal(s.slicks.length, 1);
  assert.ok(Math.abs(s.slicks[0].z - 18) < 1e-9 && Math.abs(s.slicks[0].x) < 1e-9);

  s.update(1 / 60);
  s.update(1 / 60);
  s.update(1 / 60);
  assert.deepEqual(effectTypes(v1), ["spin"], "spun exactly once");
  assert.equal(v2.applyEffect.calls.length, 0, "shielded ignores oil");
  assert.equal(v3.applyEffect.calls.length, 0, "outside radius");
  assert.equal(p.applyEffect.calls.length, 0, "owner not spun by own slick");

  s.update(3.1); // cooldown elapsed, still standing on it → spins again
  assert.deepEqual(effectTypes(v1), ["spin", "spin"]);
  s.update(20);
  assert.equal(s.slicks.length, 0, "slick expired");
});

test("blizzard slows every other non-shielded kart; wolf blow knocks back nearby only", () => {
  const p = fakeVehicle("p", { x: 0, z: 0 });
  const near = fakeVehicle("ai1", { x: 3, z: 4 });   // 5 m
  const far = fakeVehicle("ai2", { x: 0, z: 50 });
  const shielded = fakeVehicle("ai3", { x: 0, z: 2, shield: 1 });
  const race = makeRace([p, near, far, shielded]);
  const s = sys(race);
  [p, near, far, shielded].forEach((v) => s.attach(v));
  s.setHand("p", ["blizzard", "wolf_blow", "rice_cake"]);
  s.addMana("p", 5);
  assert.equal(s.play("p", "blizzard"), true);
  assert.deepEqual(near.applyEffect.calls[0][0], { type: "slow", seconds: 3, factor: 0.65 });
  assert.deepEqual(far.applyEffect.calls[0][0], { type: "slow", seconds: 3, factor: 0.65 });
  assert.equal(shielded.applyEffect.calls.length, 0);
  assert.equal(p.applyEffect.calls.length, 0);

  assert.equal(s.play("p", "wolf_blow"), true);
  assert.equal(near.applyEffect.calls.length, 2);
  assert.deepEqual(near.applyEffect.calls[1][0], { type: "knockback", force: 12, from: { x: 0, z: 0 } });
  assert.equal(far.applyEffect.calls.length, 1, "far kart outside 8 m");
});

test("rice cake: +2 mana (capped)", () => {
  const p = fakeVehicle("p");
  const s = sys(makeRace([p]));
  s.attach(p);
  s.setHand("p", ["rice_cake", "glass_shoe", "pebble"]);
  s.addMana("p", 1);
  assert.equal(s.play("p", "rice_cake"), true);
  assert.equal(s.getMana("p"), 2);
  s.setHand("p", ["rice_cake", "glass_shoe", "pebble"]);
  s.addMana("p", 3); // 5
  s.play("p", "rice_cake");
  assert.equal(s.getMana("p"), RACE.MANA_MAX);
});

test("steal_mana takes 1 from the racer directly ahead (by rank)", () => {
  const p = fakeVehicle("p", { rank: 3 });
  const leader = fakeVehicle("ai1", { rank: 1 });
  const ahead = fakeVehicle("ai2", { rank: 2 });
  const behind = fakeVehicle("ai3", { rank: 4 });
  const race = makeRace([p, leader, ahead, behind]);
  const s = sys(race);
  [p, leader, ahead, behind].forEach((v) => s.attach(v));
  s.addMana("ai1", 3); s.addMana("ai2", 3); s.addMana("ai3", 3);
  s.setHand("p", ["river_water", "glass_shoe", "pebble"]);
  s.addMana("p", 1);
  assert.equal(s.play("p", "river_water"), true);
  assert.equal(s.getMana("ai2"), 2, "directly-ahead racer lost 1");
  assert.equal(s.getMana("ai1"), 3);
  assert.equal(s.getMana("ai3"), 3);
  assert.equal(s.getMana("p"), 1, "spent 1, stole 1");

  // leader has nobody ahead → falls back to the racer directly behind
  s.setHand("ai1", ["river_water", "glass_shoe", "pebble"]);
  assert.equal(s.play("ai1", "river_water"), true);
  assert.equal(s.getMana("ai2"), 1);
  assert.equal(s.getMana("ai1"), 3);
});

test("teleport invokes onTeleport(vehicle, 25); falls back to applyEffect when absent", () => {
  const p = fakeVehicle("p");
  const onTeleport = spy();
  const s = sys(makeRace([p]), { onTeleport });
  s.attach(p);
  s.setHand("p", ["flash_step", "glass_shoe", "pebble"]);
  s.addMana("p", 3);
  assert.equal(s.play("p", "flash_step"), true);
  assert.equal(onTeleport.calls.length, 1);
  assert.equal(onTeleport.calls[0][0], p);
  assert.equal(onTeleport.calls[0][1], 25);
  assert.equal(p.applyEffect.calls.length, 0);

  const q = fakeVehicle("q");
  const s2 = sys(makeRace([q]));
  s2.attach(q);
  s2.setHand("q", ["flash_step", "glass_shoe", "pebble"]);
  s2.addMana("q", 3);
  s2.play("q", "flash_step");
  assert.deepEqual(q.applyEffect.calls[0][0], { type: "teleport", meters: 25 });
});

test("helper: flies along the track ahead and knocks back the first opponent, then disappears", () => {
  const p = fakeVehicle("p", { x: 0, z: 10, heading: 0 });
  const t = fakeVehicle("ai1", { x: 0.3, z: 40 });
  const race = makeRace([p, t]);
  const s = sys(race);
  s.attach(p); s.attach(t);
  s.setHand("p", ["call_hunter", "glass_shoe", "pebble"]);
  s.addMana("p", 3);
  assert.equal(s.play("p", "call_hunter"), true);
  assert.equal(s.helpers.length, 1);
  assert.ok(s.helpers[0].z > 10, "spawns ahead of owner");
  for (let i = 0; i < 30; i++) s.update(1 / 60);     // 0.5 s → ~20 m → z ≈ 33
  assert.equal(t.applyEffect.calls.length, 0);
  assert.ok(s.threats("ai1").some((th) => th.kind === "helper"), "AI sees helper coming");
  for (let i = 0; i < 30; i++) s.update(1 / 60);     // → z ≈ 53, passes target at 40
  assert.equal(t.applyEffect.calls[0][0].type, "knockback");
  assert.equal(s.helpers.length, 0);

  // second helper with nobody in reach expires after 5 s
  s.setHand("p", ["call_hunter", "glass_shoe", "pebble"]);
  s.addMana("p", 3);
  t.state.z = 5;
  s.play("p", "call_hunter");
  s.update(4.9);
  assert.equal(s.helpers.length, 1);
  s.update(0.2);
  assert.equal(s.helpers.length, 0);
});

test("works with THREE-like stubs: meshes added to and removed from scene", () => {
  class V3 { constructor() { this.x = 0; this.y = 0; this.z = 0; } set(x, y, z) { this.x = x; this.y = y; this.z = z; } setScalar(s) { this.x = this.y = this.z = s; } }
  class Mesh { constructor(g, m) { this.geometry = g; this.material = m; this.position = new V3(); this.rotation = new V3(); this.scale = new V3(); } }
  const disposed = [];
  class Geo { dispose() { disposed.push("g"); } }
  const THREE = {
    Mesh, SphereGeometry: Geo, CylinderGeometry: Geo, BoxGeometry: Geo,
    MeshStandardMaterial: class { constructor(o) { Object.assign(this, o); } dispose() { disposed.push("m"); } },
  };
  const scene = { children: [], add(m) { this.children.push(m); }, remove(m) { this.children = this.children.filter((x) => x !== m); } };
  const p = fakeVehicle("p");
  const s = createCardSystem({ race: makeRace([p]), rng: makeRng(1), THREE, scene });
  s.attach(p);
  s.setHand("p", ["pebble", "sesame_oil", "call_hunter"]);
  s.addMana("p", 5);
  s.play("p", "pebble"); s.play("p", "sesame_oil");
  assert.equal(scene.children.length, 2);
  s.update(0.5);
  assert.equal(s.projectiles[0].mesh.position.z > 10, true, "mesh follows projectile");
  s.update(5);
  assert.equal(scene.children.length, 1, "projectile mesh removed, oil stays");
  s.dispose();
  assert.equal(scene.children.length, 0);
  assert.equal(disposed.length, 6);
});

test("renderHand is a safe no-op without a DOM", () => {
  assert.equal(typeof document, "undefined");
  assert.doesNotThrow(() => renderHand(null, CARD_LIBRARY.slice(0, 3), 2, () => {}));
  assert.doesNotThrow(() => renderHand({}, CARD_LIBRARY.slice(0, 3), 2, () => {}));
});
