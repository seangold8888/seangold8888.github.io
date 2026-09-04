// 별빛 카트 배틀 — pure race manager (no DOM, no THREE). Used by main.js and by Node simulations.
import { RACE, EFFECT, EVENTS, createRaceState, dist2 } from "./contracts.js";

/**
 * createRaceManager({ track, vehicles, drivers, cards, bus, rng, hooks })
 *  vehicles[0] is the player. drivers[i] drives vehicles[i+1].
 *  hooks: { onCountdown(n), onLap(vehicle), onFinish(vehicle), onRespawn(vehicle), onCollision(a,b,rel), onTeleport(vehicle, meters) }
 *  step(dt, playerInput) advances one fixed tick. Returns the race state.
 */
export function createRaceManager({ track, vehicles, drivers, cards = null, bus, rng, hooks = {}, playerDriver = null }) {
  let cardSys = cards;
  function setCards(c) { cardSys = c; }
  const race = createRaceState(track);
  race.bus = bus;
  race.vehicles = vehicles;
  race.player = vehicles[0];
  race.threats = [];
  race.manaOf = (id) => cardSys?.getMana?.(id) ?? 0;
  race.countdown = RACE.COUNTDOWN_SECONDS + 0.9;
  race.rankings = [];

  const startHeading = headingAt(track, track.checkpoints[0].t);
  vehicles.forEach((v, i) => {
    const gridIndex = i === 0 ? Math.min(vehicles.length, track.startGrid.length) - 1 : i - 1;
    const g = track.startGrid[gridIndex] || track.startGrid[0];
    Object.assign(v.state, { x: g.x, y: g.y, z: g.z, heading: startHeading, speed: 0, vx: 0, vz: 0, lap: 0, checkpoint: 0, progress: 0, rank: i + 1 });
    v.finishTime = null;
    v.lastCp = 0;
    v.offTrackTime = 0;
    v.baseTopSpeed = v.spec.topSpeed;
    v.syncMesh?.();
  });

  function step(dt, playerInput) {
    if (!race.started) {
      const before = Math.ceil(race.countdown);
      race.countdown -= dt;
      const n = Math.ceil(race.countdown);
      if (n !== before && n >= 1 && n <= 3) hooks.onCountdown?.(n);
      if (race.countdown <= 0) {
        race.started = true;
        hooks.onCountdown?.(0);
        bus?.emit(EVENTS.RACE_START);
      }
    }
    if (race.started) race.time += dt;

    race.threats = cardSys?.threats
      ? vehicles.flatMap((v) => (cardSys.threats(v.id) || []).map((t) => ({ ...t, targetId: v.id })))
      : [];

    vehicles.forEach((v, i) => {
      let input;
      if (!race.started) input = { throttle: 0, brake: 0, steer: 0, drift: false, hop: false };
      else if (i === 0 && !playerDriver) input = v.finishTime ? { throttle: 0.6, brake: 0, steer: 0, drift: false, hop: false } : playerInput;
      else {
        const d = i === 0 ? playerDriver : drivers[i - 1];
        input = d.think(dt, race);
        v.spec.topSpeed = v.baseTopSpeed * (1 + (d.speedBias || 0));
        if (v.finishTime) input.throttle = Math.min(input.throttle, 0.6);
        if (cardSys && d.wantsCard) {
          const wants = d.wantsCard(race, cardSys.getHand(v.id) || []);
          if (wants) cardSys.play(v.id, wants);
        }
      }
      v.update(dt, input, track, rng);
      const p = track.project(v.state.x, v.state.z);
      const falling = track.fallOff ? p.falling : (track.id === "sky" && !p.onTrack);
      if (falling) {
        v.offTrackTime += dt;
        if (v.offTrackTime > 0.7) { respawnAtCheckpoint(v); v.offTrackTime = 0; hooks.onRespawn?.(v); }
      } else v.offTrackTime = 0;
      updateProgress(v, p);
    });

    resolveCollisions();
    cardSys?.update?.(dt);
    updateRanks();
    return race;
  }

  function respawnAtCheckpoint(v) {
    const cp = track.checkpoints[v.lastCp] || track.checkpoints[0];
    const s = track.sample(cp.t);
    Object.assign(v.state, { x: s.position.x, y: s.position.y + 0.2, z: s.position.z, heading: Math.atan2(s.tangent.x, s.tangent.z), speed: 0, vx: 0, vz: 0 });
    v.respawn?.(track);
  }

  function updateProgress(v, p) {
    const cps = track.checkpoints;
    const n = cps.length;
    const next = (v.lastCp + 1) % n;
    const fromLast = track.progressBetween(cps[v.lastCp].t, p.t);
    const gap = track.progressBetween(cps[v.lastCp].t, cps[next].t);
    // crossed the next checkpoint (within the forward half-lap window to reject backward driving)
    if (fromLast >= gap - 1 && fromLast < track.length * 0.5) {
      v.lastCp = next;
      v.state.checkpoint = next;
      cardSys?.onCheckpoint?.(v.id);
      bus?.emit(EVENTS.CHECKPOINT, { vehicleId: v.id, index: next });
      if (next === 0) {
        v.state.lap += 1;
        cardSys?.onLap?.(v.id);
        bus?.emit(EVENTS.LAP, { vehicleId: v.id, lap: v.state.lap });
        hooks.onLap?.(v);
        if (v.state.lap >= RACE.LAPS && v.finishTime == null) finishVehicle(v);
      }
    }
    const lapDist = track.progressBetween(cps[0].t, p.t);
    const behindLine = v.lastCp === 0 && lapDist > track.length * 0.5;
    v.state.progress = v.state.lap * track.length + (behindLine ? lapDist - track.length : lapDist);
  }

  function resolveCollisions() {
    const r2 = (RACE.KART_RADIUS * 2) ** 2;
    for (let i = 0; i < vehicles.length; i++) for (let j = i + 1; j < vehicles.length; j++) {
      const a = vehicles[i].state, b = vehicles[j].state;
      const d2 = dist2(a.x, a.z, b.x, b.z);
      if (d2 < r2 && d2 > 0.0001) {
        const d = Math.sqrt(d2), nx = (b.x - a.x) / d, nz = (b.z - a.z) / d;
        const push = (RACE.KART_RADIUS * 2 - d) / 2 + 0.02;
        const wa = vehicles[i].spec.weight || 1, wb = vehicles[j].spec.weight || 1;
        a.x -= nx * push * (wb / (wa + wb)) * 2; a.z -= nz * push * (wb / (wa + wb)) * 2;
        b.x += nx * push * (wa / (wa + wb)) * 2; b.z += nz * push * (wa / (wa + wb)) * 2;
        const rel = Math.abs(a.speed - b.speed) + 2;
        vehicles[i].applyEffect({ type: EFFECT.KNOCKBACK, from: { x: b.x, z: b.z }, force: rel * 0.35 });
        vehicles[j].applyEffect({ type: EFFECT.KNOCKBACK, from: { x: a.x, z: a.z }, force: rel * 0.35 });
        hooks.onCollision?.(vehicles[i], vehicles[j], rel);
      }
    }
  }

  function updateRanks() {
    const sorted = vehicles.slice().sort((a, b) => {
      if (a.finishTime != null || b.finishTime != null) return (a.finishTime ?? Infinity) - (b.finishTime ?? Infinity);
      return b.state.progress - a.state.progress;
    });
    sorted.forEach((v, i) => { v.state.rank = i + 1; });
  }

  function finishVehicle(v) {
    v.finishTime = race.time;
    bus?.emit(EVENTS.FINISH, { vehicleId: v.id, rank: v.state.rank, time: race.time });
    hooks.onFinish?.(v);
  }

  function rankings() {
    return vehicles.slice().sort((a, b) => a.state.rank - b.state.rank).map((v) => ({
      id: v.id, name: v.hero?.name || v.spec?.name || v.id, emoji: v.hero?.emoji || v.spec?.emoji || "🏎️",
      rank: v.state.rank, time: v.finishTime ?? null, isPlayer: Boolean(v.isPlayer),
    }));
  }

  function teleportForward(vehicle, meters) {
    const p = track.project(vehicle.state.x, vehicle.state.z);
    const t = (p.t + meters / track.length) % 1;
    const s = track.sample(t);
    vehicle.state.x = s.position.x; vehicle.state.z = s.position.z; vehicle.state.y = s.position.y;
    vehicle.state.heading = Math.atan2(s.tangent.x, s.tangent.z);
    hooks.onTeleport?.(vehicle, s.position);
  }

  return { race, step, rankings, teleportForward, respawnAtCheckpoint, setCards };
}

export function headingAt(track, t) {
  const s = track.sample(t);
  return Math.atan2(s.tangent.x, s.tangent.z);
}
