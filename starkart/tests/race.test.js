// Full-race simulation in Node: six AI-driven karts, cards on, every track. No DOM, no renderer.
import test from "node:test";
import assert from "node:assert/strict";
import * as THREE from "../../kart3d/vendor/three.module.min.js";
import { RACE, HEROES, TRACKS, EventBus, EVENTS, makeRng } from "../src/contracts.js";
import { buildTrack } from "../src/track.js";
import { createVehicle } from "../src/vehicle.js";
import { createAiDriver } from "../src/ai.js";
import { createCardSystem } from "../src/cards.js";
import { createRaceManager } from "../src/race.js";

function simulate(trackId, { seconds = 400, seed = 7 } = {}) {
  const rng = makeRng(seed);
  const track = buildTrack(trackId, THREE);
  const bus = new EventBus();
  const vehicles = HEROES.map((h, i) => {
    const v = createVehicle({ id: h.id, isPlayer: i === 0, spec: { ...h.spec, color: h.color, accent: h.accent, name: h.name, emoji: h.emoji } });
    v.hero = h;
    return v;
  });
  const drivers = vehicles.slice(1).map((v, i) => createAiDriver({ vehicle: v, track, difficulty: 0.3 + i * 0.05, rng }));
  const playerDriver = createAiDriver({ vehicle: vehicles[0], track, difficulty: 0.5, rng });
  const events = { laps: 0, cards: 0, hits: 0, finishes: 0, countdown: [] };
  bus.on(EVENTS.LAP, () => events.laps++);
  bus.on(EVENTS.CARD_PLAYED, () => events.cards++);
  bus.on(EVENTS.HIT, () => events.hits++);
  bus.on(EVENTS.FINISH, () => events.finishes++);
  const rm = createRaceManager({ track, vehicles, drivers, bus, rng, playerDriver, hooks: { onCountdown: (n) => events.countdown.push(n) } });
  const cards = createCardSystem({ race: rm.race, rng, onTeleport: (v, m) => rm.teleportForward(v, m) });
  rm.setCards(cards);
  vehicles.forEach((v) => cards.attach(v));

  const dt = 1 / 60;
  let maxSpeed = 0, nanSeen = false, offTrackTicks = 0, ticks = 0;
  for (let t = 0; t < seconds; t += dt) {
    rm.step(dt, null);
    ticks++;
    for (const v of vehicles) {
      const s = v.state;
      if (!Number.isFinite(s.x) || !Number.isFinite(s.z) || !Number.isFinite(s.speed)) nanSeen = true;
      maxSpeed = Math.max(maxSpeed, s.speed);
      if (rm.race.started && !track.project(s.x, s.z).onTrack) offTrackTicks++;
    }
    if (vehicles.every((v) => v.finishTime != null)) break;
  }
  return { track, vehicles, rm, events, maxSpeed, nanSeen, offTrackRatio: offTrackTicks / (ticks * vehicles.length), simSeconds: ticks * dt };
}

for (const trackId of TRACKS) {
  test(`full race on ${trackId}: countdown, laps, finishes, cards, no NaN`, () => {
    const r = simulate(trackId);
    assert.deepEqual(r.events.countdown, [3, 2, 1, 0], "countdown sequence");
    assert.ok(r.rm.race.started, "race started");
    assert.equal(r.nanSeen, false, "no NaN in vehicle state");
    assert.ok(r.maxSpeed > 20, `karts reach racing speed (max ${r.maxSpeed.toFixed(1)})`);
    const finished = r.vehicles.filter((v) => v.finishTime != null).length;
    assert.ok(finished >= 5, `${finished}/6 finished within ${r.simSeconds.toFixed(0)} s`);
    assert.ok(r.events.laps >= 15, `laps counted (${r.events.laps})`);
    assert.ok(r.events.cards > 0, "AI played cards");
    assert.ok(r.offTrackRatio < 0.35, `off-track ratio ${r.offTrackRatio.toFixed(2)} too high`);
    const ranks = r.vehicles.map((v) => v.state.rank).sort((a, b) => a - b);
    assert.deepEqual(ranks, [1, 2, 3, 4, 5, 6], "ranks are a permutation of 1..6");
    const rankings = r.rm.rankings();
    assert.equal(rankings[0].rank, 1);
    const winner = r.vehicles.find((v) => v.state.rank === 1);
    assert.ok(winner.finishTime != null && winner.finishTime < 240, `winner time ${winner.finishTime}`);
  });
}

test("checkpoint gating: driving backwards never increments laps", () => {
  const rng = makeRng(3);
  const track = buildTrack("meadow", THREE);
  const v = createVehicle({ id: "x", isPlayer: true, spec: { accel: 1, topSpeed: 1, handling: 1, weight: 1 } });
  const bus = new EventBus();
  let laps = 0; bus.on(EVENTS.LAP, () => laps++);
  const rm = createRaceManager({ track, vehicles: [v], drivers: [], cards: null, bus, rng });
  rm.race.started = true; rm.race.countdown = 0;
  // face backwards and drive for a while
  v.state.heading += Math.PI;
  for (let i = 0; i < 60 * 40; i++) rm.step(1 / 60, { throttle: 1, brake: 0, steer: 0, drift: false, hop: false });
  assert.equal(laps, 0);
  assert.ok(v.state.progress <= 0.5 * track.length + 1, "no forward progress credited");
});
