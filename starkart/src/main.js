// 별빛 카트 배틀 — integrator: scene, input, presentation wiring. Race rules live in race.js.
import * as THREE from "../../kart3d/vendor/three.module.min.js";
import { RACE, HEROES, TRACKS, EventBus, EVENTS, makeRng, clamp, lerp } from "./contracts.js";
import { buildTrack } from "./track.js";
import { createVehicle, buildKartMesh } from "./vehicle.js";
import { createAiDriver } from "./ai.js";
import { createCardSystem, renderHand } from "./cards.js";
import { createHud, createTouchControls } from "./hud.js";
import { createVfx } from "./vfx.js";
import { createAudio } from "./audio.js";
import { createRaceManager } from "./race.js";

const TRACK_META = {
  meadow: { name: "들판 길", emoji: "🌼", diff: "쉬움" },
  castle: { name: "성 길", emoji: "🏰", diff: "보통" },
  sky: { name: "구름 길", emoji: "☁️", diff: "어려움" },
};

// ───────────────────────── renderer / scene ─────────────────────────
const stage = document.getElementById("stage");
const renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: "high-performance" });
renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.5));
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.outputColorSpace = THREE.SRGBColorSpace;
stage.appendChild(renderer.domElement);

const scene = new THREE.Scene();
scene.fog = new THREE.Fog(0x8fc7ff, 90, 260);
const camera = new THREE.PerspectiveCamera(70, window.innerWidth / window.innerHeight, 0.3, 1200);
// 조명·스카이돔은 track.group이 테마별로 가져온다.

window.addEventListener("resize", () => {
  renderer.setSize(window.innerWidth, window.innerHeight);
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
});

// ───────────────────────── presentation ─────────────────────────
const hudRoot = document.getElementById("hud");
const hud = createHud(hudRoot);
const vfx = createVfx(scene, THREE);
const audio = createAudio();
const bus = new EventBus();

// ───────────────────────── input ─────────────────────────
const keys = new Set();
const touch = { steer: 0, drift: false, hop: false };
window.addEventListener("keydown", (e) => {
  keys.add(e.code);
  if (["ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight", "Space"].includes(e.code)) e.preventDefault();
  if (rm && rm.race.started && !rm.race.finished) {
    if (e.code === "Digit1") playHandIndex(0);
    if (e.code === "Digit2") playHandIndex(1);
    if (e.code === "Digit3") playHandIndex(2);
  }
  audio.prime();
});
window.addEventListener("keyup", (e) => keys.delete(e.code));
createTouchControls(hudRoot, (i) => {
  if (typeof i.steer === "number") touch.steer = i.steer;
  if (typeof i.drift === "boolean") touch.drift = i.drift;
  if (typeof i.hop === "boolean") touch.hop = i.hop;
  audio.prime();
});
const isTouchDevice = !window.matchMedia("(hover: hover) and (pointer: fine)").matches;

function readPlayerInput() {
  const left = keys.has("ArrowLeft") || keys.has("KeyA");
  const right = keys.has("ArrowRight") || keys.has("KeyD");
  const up = keys.has("ArrowUp") || keys.has("KeyW");
  const down = keys.has("ArrowDown") || keys.has("KeyS");
  const space = keys.has("Space") || keys.has("ShiftLeft");
  return {
    throttle: isTouchDevice ? 1 : (up ? 1 : 0),
    brake: down ? 1 : 0,
    steer: clamp((left ? -1 : 0) + (right ? 1 : 0) + touch.steer, -1, 1),
    drift: space || touch.drift,
    hop: space || touch.hop,
  };
}

// ───────────────────────── menu ─────────────────────────
const menu = document.getElementById("menu");
const heroRow = document.getElementById("heroRow");
const trackRow = document.getElementById("trackRow");
let pickedHero = load("starkart_hero", "cinderella");
let pickedTrack = load("starkart_track", "meadow");
function load(k, d) { try { return localStorage.getItem(k) || d; } catch (e) { return d; } }
function save(k, v) { try { localStorage.setItem(k, v); } catch (e) {} }

function renderMenu() {
  heroRow.replaceChildren(...HEROES.map((h) => {
    const b = document.createElement("button");
    b.type = "button"; b.className = "pick" + (h.id === pickedHero ? " on" : "");
    b.innerHTML = `<span class="em">${h.emoji}</span><span>${h.name}</span>`;
    b.addEventListener("click", () => { pickedHero = h.id; save("starkart_hero", h.id); audio.prime(); audio.card?.("trick"); renderMenu(); });
    return b;
  }));
  trackRow.replaceChildren(...TRACKS.map((t) => {
    const m = TRACK_META[t];
    const b = document.createElement("button");
    b.type = "button"; b.className = "pick" + (t === pickedTrack ? " on" : "");
    b.innerHTML = `<span class="em">${m.emoji}</span><span>${m.name} · ${m.diff}</span>`;
    b.addEventListener("click", () => { pickedTrack = t; save("starkart_track", t); audio.prime(); renderMenu(); });
    return b;
  }));
}
renderMenu();
document.getElementById("go").addEventListener("click", () => { audio.prime(); startRace(pickedTrack, pickedHero); });
audio.music?.("menu");

// ───────────────────────── race lifecycle ─────────────────────────
let rm = null;      // race manager (race.js)
let track = null;
let cards = null;
let lastHandKey = "";
let raf = 0;
let acc = 0;
let lastT = 0;
const rng = makeRng(Date.now() % 100000);
const camState = { pos: new THREE.Vector3(), look: new THREE.Vector3(), fov: 70 };

function startRace(trackId, heroId) {
  disposeRace();
  track = buildTrack(trackId, THREE);
  scene.add(track.group);
  scene.background = track.skyColor ? new THREE.Color(track.skyColor) : null;
  if (track.skyColor) scene.fog.color.set(track.skyColor);

  const order = [heroId, ...HEROES.map((h) => h.id).filter((id) => id !== heroId)];
  const vehicles = order.map((id, i) => {
    const hero = HEROES.find((h) => h.id === id);
    const v = createVehicle({ id, isPlayer: i === 0, spec: { ...hero.spec, color: hero.color, accent: hero.accent, name: hero.name, emoji: hero.emoji } }, THREE);
    if (!v.mesh) v.mesh = buildKartMesh(THREE, { ...hero.spec, color: hero.color, accent: hero.accent });
    v.hero = hero;
    scene.add(v.mesh);
    return v;
  });
  const drivers = vehicles.slice(1).map((v, i) => createAiDriver({ vehicle: v, track, difficulty: 0.3 + i * 0.05, rng }));

  rm = createRaceManager({
    track, vehicles, drivers, bus, rng,
    hooks: {
      onCountdown: (n) => { hud.showCountdown?.(n); audio.countdown?.(n); },
      onLap: (v) => { if (v.isPlayer && v.state.lap < RACE.LAPS) { hud.showToast?.(`${v.state.lap + 1}바퀴째!`, 1200); audio.card?.("boost"); } },
      onFinish: (v) => { if (v.isPlayer) { audio.fanfare?.(v.state.rank); hud.showToast?.(v.state.rank === 1 ? "우승! 🏆" : `${v.state.rank}위로 골인!`, 2500); } },
      onRespawn: () => audio.hit?.("knockback"),
      onCollision: (a, b, rel) => { if (rel > 8) audio.hit?.("knockback"); },
      onTeleport: (v, pos) => vfx.hit?.(pos, "knockback"),
    },
  });
  cards = createCardSystem({ race: rm.race, vfx, audio, rng, THREE, scene, onTeleport: (vehicle, meters) => rm.teleportForward(vehicle, meters) });
  rm.setCards(cards);
  vehicles.forEach((v) => { v.syncMesh?.(); cards.attach(v); });
  window.__sk = { get race() { return rm.race; }, track, get cards() { return cards; }, rm };

  menu.hidden = true;
  hud.hideResults?.();
  hud.showToast?.(`${TRACK_META[trackId].name} · 3바퀴`, 1800);
  audio.music?.("race");
  lastHandKey = "";
  placeCamera(true);
  lastT = performance.now();
  acc = 0;
  cancelAnimationFrame(raf);
  raf = requestAnimationFrame(loop);
}

function disposeRace() {
  if (!rm) return;
  rm.race.vehicles.forEach((v) => v.mesh && scene.remove(v.mesh));
  if (track?.group) scene.remove(track.group);
  cards?.dispose?.();
  rm = null; track = null; cards = null;
}

function playHandIndex(i) {
  const c = (cards.getHand(rm.race.player.id) || [])[i];
  if (c) cards.play(rm.race.player.id, c.id);
}

// ───────────────────────── loop ─────────────────────────
const STEP = 1 / 60;
function loop(now) {
  raf = requestAnimationFrame(loop);
  const dt = Math.min(0.25, (now - lastT) / 1000);
  lastT = now;
  acc += dt;
  let steps = 0;
  while (acc >= STEP && steps < 15) { rm.step(STEP, readPlayerInput()); acc -= STEP; steps++; }
  checkFinish();
  frameUpdate(dt);
  renderer.render(scene, camera);
}

function checkFinish() {
  const race = rm.race, p = race.player;
  if (p.finishTime == null || race.finished) return;
  if (race.time - p.finishTime > 1.6) {
    race.finished = true;
    const rankings = rm.rankings();
    bus.emit(EVENTS.RACE_END, { rankings });
    audio.music?.("results");
    hud.showResults?.(rankings, () => startRace(track.id, p.id), () => { window.location.href = "../"; });
  }
}

function frameUpdate(dt) {
  const race = rm.race;
  race.vehicles.forEach((v) => {
    v.syncMesh?.();
    if (v.state.drifting) vfx.driftSparks?.(v, dt);
    if (v.state.boostTimer > 0) vfx.boostTrail?.(v, dt);
    vfx.shield?.(v, v.state.shieldTimer > 0);
  });
  vfx.update?.(dt, camera);
  placeCamera(false, dt);

  const p = race.player;
  audio.engine?.(clamp(p.state.speed / RACE.BOOST_SPEED, 0, 1), p.state.boostTimer > 0);
  audio.drift?.(Boolean(p.state.drifting));

  hud.update?.(race, p, {
    driftBoostReady: Boolean(p.state.driftBoostReady),
    lapsTotal: RACE.LAPS,
    lap: Math.min(p.state.lap + 1, RACE.LAPS),
    mana: cards.getMana(p.id) || 0,
  });

  const hand = cards.getHand(p.id) || [];
  const mana = cards.getMana(p.id) || 0;
  const key = hand.map((c) => c.id).join(",") + "|" + mana + "|" + (race.started ? 1 : 0) + "|" + (p.finishTime != null);
  if (key !== lastHandKey && hud.handRoot) {
    lastHandKey = key;
    renderHand(hud.handRoot, hand, mana, (cardId) => { audio.prime(); cards.play(p.id, cardId); }, { locked: !race.started || p.finishTime != null });
  }
}

function placeCamera(snap, dt = 1 / 60) {
  const p = rm.race.player.state;
  const back = 7.2, height = 3.4;
  const tx = p.x - Math.sin(p.heading) * back, tz = p.z - Math.cos(p.heading) * back, ty = p.y + height;
  const lx = p.x + Math.sin(p.heading) * 6, lz = p.z + Math.cos(p.heading) * 6, ly = p.y + 1.0;
  const k = snap ? 1 : 1 - Math.pow(0.001, dt);
  camState.pos.set(lerp(camState.pos.x, tx, k), lerp(camState.pos.y, ty, k), lerp(camState.pos.z, tz, k));
  camState.look.set(lerp(camState.look.x, lx, k), lerp(camState.look.y, ly, k), lerp(camState.look.z, lz, k));
  camera.position.copy(camState.pos);
  camera.lookAt(camState.look);
  camState.fov = lerp(camState.fov, p.boostTimer > 0 ? 82 : 70, snap ? 1 : 0.12);
  if (Math.abs(camera.fov - camState.fov) > 0.05) { camera.fov = camState.fov; camera.updateProjectionMatrix(); }
}

document.addEventListener("visibilitychange", () => {
  if (document.hidden) audio.music?.("pause");
  else if (rm) audio.music?.(rm.race.finished ? "results" : "race");
});
