# 별빛 카트 배틀 (StarKart) — Module Contracts

Kart racing (Mario-Kart-style arcade handling) fused with a card-battle layer (Hearthstone-style mana + hand). Original IP: racers are the hub's public-domain heroes; cards are their story powers. Runs on Three.js, no build step, no CDN, offline-friendly. Target: iPad Safari landscape (touch) + desktop keyboard. 60 fps on iPad.

## Ground rules for every module
- Vanilla ES modules. Import Three as `import * as THREE from "../../kart3d/vendor/three.module.min.js";` (path relative to `src/`).
- No external assets: geometry is procedural/low-poly, textures are Canvas-generated, audio is WebAudio-synthesized.
- Each module owns ONLY its file(s) listed below. Shared types live in `src/contracts.js` — read it, never edit it.
- Pure logic must be testable in Node without DOM/Three where feasible: keep math helpers side-effect free; guard `window`/`document` use.
- Korean UI text. Kid-safe (age 7): no scary imagery, no blood.
- Deterministic where possible: accept an `rng()` function instead of `Math.random` in logic paths.

## Files and owners
| File | Owner | Exports |
|---|---|---|
| `src/contracts.js` | scaffold (read-only) | constants, `EventBus`, state factories, effect names |
| `src/track.js` | Agent TRACK | `buildTrack(trackId, THREE)` |
| `src/vehicle.js` | Agent VEHICLE | `createVehicle(spec)`, `buildKartMesh(THREE, spec)` |
| `src/ai.js` | Agent AI | `createAiDriver(opts)` |
| `src/cards.js` | Agent CARDS | `CARD_LIBRARY`, `createCardSystem(opts)`, `renderHand(...)` |
| `src/hud.js`, `src/vfx.js`, `src/audio.js` | Agent PRESENTATION | `createHud`, `createVfx`, `createAudio` |
| `src/main.js`, `index.html` | integrator | wiring, race manager, input |
| `tests/*.test.js` | each agent adds its own `tests/<module>.test.js` (node:test) |

## Coordinate conventions
- Y up. Track lies near y=0. Units ≈ meters. Kart length ≈ 2.0.
- Heading θ: radians, 0 = +Z forward, increases counter-clockwise viewed from above. Forward vector = (sin θ, 0, cos θ).
- Speeds in m/s. Typical top speed 28, boost 36.

## `src/track.js` — `buildTrack(trackId, THREE) → Track`
```
Track = {
  id, name, laps: 3,
  curve: THREE.CatmullRomCurve3 (closed),   // centerline
  width: number (≈ 12),
  group: THREE.Group,                        // road + scenery + decorations, added to scene by integrator
  length: number,                            // curve length in meters
  checkpoints: [{ t, position: THREE.Vector3 }],   // 12–20 along curve, t ∈ [0,1) ascending; checkpoint[0] is start/finish
  startGrid: [THREE.Vector3 × 6],           // 6 grid slots behind the start line, 2 columns
  boostPads: [{ position, radius }],
  hazards: [{ position, radius, kind: "oil"|"mud" }],
  sample(t) → { position, tangent, normal }, // t ∈ [0,1)
  project(x, z) → { t, lateral, onTrack, height },  // nearest curve point; lateral = signed distance from centerline (right +)
  progressBetween(t0, t1) → number           // forward distance along curve handling wrap
}
```
Three tracks: `"meadow"` (easy, wide, gentle), `"castle"` (medium, S-curves, 1 jump), `"sky"` (hard, narrow, boost pads over cloud gaps — falling off = respawn at last checkpoint). Scenery must be InstancedMesh for repeated props (trees, lamps). Keep total draw calls < 80.

## `src/vehicle.js`
```
createVehicle({ id, isPlayer, spec: { accel, topSpeed, handling, weight, color, name } }) → Vehicle
Vehicle = {
  id, isPlayer, spec,
  state: { x, y, z, heading, speed, vx, vz, drifting, driftCharge (0..1), boostTimer, spinTimer, shieldTimer, stunTimer, airborne, lap, checkpoint, progress, rank },
  mesh: THREE.Group (built via buildKartMesh),
  update(dt, input, track, rng) → void,     // input = { throttle 0..1, brake 0..1, steer -1..1, drift bool, hop bool }
  applyEffect(effect) → void,               // effect names from contracts.EFFECT; e.g. {type:"boost", seconds:3}, {type:"spin"}, {type:"shield", seconds:4}, {type:"slow", seconds:3, factor:0.6}, {type:"knockback", from:{x,z}, force}
  respawn(track) → void,
  syncMesh() → void                          // copies state into mesh position/rotation, tilt on drift
}
buildKartMesh(THREE, spec) → THREE.Group    // low-poly kart: body, 4 wheels (rotate with speed), driver blob with spec.color; ≤ 12 meshes
```
Arcade feel: instant-ish acceleration curve, speed-dependent steering, drift = hold → wider turn radius + charge; release with charge ≥ 0.5 → mini-boost. Off-track (from track.project) → 55 % speed. Boost pads via track.boostPads. Hazard "oil" → spin 1.2 s. Collisions between vehicles resolved by integrator via `applyEffect({type:"knockback"...})`.

## `src/ai.js`
```
createAiDriver({ vehicle, track, difficulty: 0..1, rng }) → { think(dt, raceState) → input, wantsCard(raceState, hand) → cardId|null }
```
Look-ahead point on curve (distance scales with speed), steer toward it, brake before sharp curvature, use drift on long turns, rubber-band: if behind player by > 15 m, small speed bonus; if ahead by > 25 m, small penalty. Card usage: attack cards when a target is within 30 m ahead, shield when a projectile is incoming (raceState.threats), boost on straights.

## `src/cards.js`
Mana = 별사탕: +1 every 6 s of racing and +1 per checkpoint crossed, max 5. Hand of 3, draw from a 10-card shuffled deck on each lap start and whenever a card is played (if deck empty, reshuffle discards).
```
CARD_LIBRARY: [{ id, name, emoji, cost (1..3), kind: "attack"|"defense"|"boost"|"trick", desc, effect }]
effect DSL (resolved by createCardSystem):
  { type:"projectile", speed, dmgEffect:{type:"spin"}, range }      // 조약돌 던지기 → straight projectile hits first kart ahead
  { type:"self", effect:{type:"boost", seconds:3} }                   // 호박 마차
  { type:"self", effect:{type:"shield", seconds:4} }                  // 유리 구두
  { type:"drop", hazard:"oil", behind:true }                          // 참기름
  { type:"aoe_others", radius:Infinity, effect:{type:"slow", seconds:3, factor:0.65} }  // 눈보라
  { type:"mana", amount:2 }                                           // 떡 하나
  { type:"nearby", radius:8, effect:{type:"knockback", force:12} }     // 늑대 후― 불기
  { type:"summon_helper", seconds:5 }                                 // 사냥꾼 부르기: helper kart rams the next racer ahead
  { type:"teleport_forward", meters:25 }                              // 홍길동 동에 번쩍
  { type:"steal_mana", amount:1 }                                     // 대동강 물 한 바가지: from racer ahead
createCardSystem({ race, vfx, audio, rng }) → { attach(vehicle), update(dt), play(vehicleId, cardId) → bool, getHand(vehicleId), getMana(vehicleId), projectiles: [] }
renderHand(rootEl, hand, mana, onPlay)  // DOM chips, 60px+ touch targets, cost badge, disabled when mana < cost
```
Ten cards total, each tied to a hub hero. Projectiles and oil slicks are entities the card system owns (mesh + update + collision test via race.vehicles).

## `src/hud.js`, `src/vfx.js`, `src/audio.js`
- `createHud(rootEl)` → `{ update(raceState, playerVehicle), showCountdown(n), showResults(rankings), showToast(text) , minimap(track, vehicles) }` — lap, rank (1위/6위), timer, speedometer bar, mana stars, hand root element for cards.renderHand.
- `createVfx(scene, THREE)` → `{ driftSparks(vehicle, dt), boostTrail(vehicle), hit(position, kind), shield(vehicle, on), update(dt) }` — pooled particles (≤ 600), additive sprites from canvas textures.
- `createAudio()` → `{ prime(), engine(speed01, boosting), drift(on), hit(), card(kind), countdown(n), fanfare(win), music(scene:"race"|"menu"|"results"), mute(bool) }` — all WebAudio synthesis; Karplus-Strong plucks and modal bells are fine (see cards/js/audio.js in this repo for the house style).

## Race manager (integrator, `src/main.js`)
- 6 racers: player + 5 AI, heroes from `HEROES` in contracts.js. Countdown 3-2-1, 3 laps, rank by (lap, checkpoint, progress). Checkpoint gating prevents backwards laps. Finish → results with rankings and a 「한 판 더」 button.
- Collisions: sphere test between karts, push apart, knockback scaled by weight.
- Input: keyboard (arrows/WASD, Space drift/hop, 1-2-3 play card) + touch (left/right pads, drift button, card chips). Throttle auto-on for touch.
- Camera: chase cam with lag, FOV kick on boost.
- `raceState` passed to AI/cards: `{ vehicles, player, track, time, threats: [{ position, velocity, targetId }] }`.

## Acceptance
- `node --test tests/` passes for every module.
- Desktop: 3 laps completable; iPad landscape: all buttons ≥ 60 px, no page scroll/zoom.
- Steady 60 fps on M1 iPad in "meadow"; ≥ 45 fps on "sky".
