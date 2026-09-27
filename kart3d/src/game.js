// 산리오 카트 3D — 게임 진행: 메뉴 → 레이스 → 결과
import * as THREE from '../vendor/three.module.min.js';
import { TRACKS, buildTrack } from './tracks.js';
import { buildTrackMesh } from './trackmesh.js';
import { loadProps } from './props.js';
import { createAudio } from './music.js';
import { CHARACTERS, VILLAINS, driverById, buildKartModel, Kart, driveAI } from './karts.js';
import { buildCourseFx } from './coursefx.js';
import {
  CATALOG, SLOTS, loadGarage, saveGarage, itemState, tapItem, addCoins, recordTrophy, applyLook
} from './garage.js';
import {
  ITEM_TYPES, rollItem, useItem, applyMagnet,
  makeItemBoxMesh, makeBananaMesh, makeBombMesh, makeShieldMesh
} from './items.js';

export const MODES = [
  { id: 'gp',     name: '🏆 그랑프리', desc: '⭐ 추천 · 세 경주 점수를 모아 트로피!', ai: 5, items: true, gp: true },
  { id: 'battle', name: '아이템 배틀', desc: '장난꾸러기와 아이템 대결!', ai: 5, items: true, villains: true },
  { id: 'speed',  name: '스피드 매치', desc: '아이템 없이 순수 속도 대결',        ai: 3, items: false },
  { id: 'time',   name: '타임어택',   desc: '혼자 달리며 최고 기록 도전',        ai: 0, items: false },
  // 일반 경주에서 이 코스를 1등으로 끝내야 메뉴에 나타난다.
  { id: 'rival',  name: '🔥 라이벌 레이스', desc: '봐주지 않는 라이벌 · 바나나는 방패로 막아요', ai: 3, items: true, rival: true }
];

// 그랑프리: 컵마다 세 코스를 연달아 달리고 점수를 모은다. 컵마다 장난꾸러기 둘이 나온다.
export const CUPS = [
  { id: 'heart', name: '하트 컵', icon: '💖', tracks: ['park', 'beach', 'candy'], villains: ['taeppul', 'geonppul'] },
  { id: 'star',  name: '별 컵',  icon: '⭐', tracks: ['cloud', 'night', 'rainbow'], villains: ['chanppul', 'jaewing'] }
];
export const POINTS = [10, 8, 6, 4, 2, 1];
const FINISH_COINS = [10, 6, 4, 2, 2, 2];
const TROPHY_COINS = [30, 20, 10];
const MEDAL = ['', '🥇', '🥈', '🥉'];

const el = id => document.getElementById(id);
function shuffle(a) {
  for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; }
  return a;
}

export function startGame() {
  loadProps();
  const canvas = el('game');
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
  // 아이패드는 화면 픽셀이 아주 많아 그대로 그리면 60fps를 못 지킨다.
  // 실제 픽셀 수를 상한으로 묶어 두면 화질 차이는 거의 없고 프레임이 안정된다.
  const MAX_PIXELS = 2.3e6;
  function fitPixelRatio() {
    const dpr = window.devicePixelRatio || 1;
    const w = window.innerWidth, h = window.innerHeight;
    const cap = Math.sqrt(MAX_PIXELS / Math.max(1, w * h));
    renderer.setPixelRatio(Math.max(1, Math.min(dpr, 2, cap)));
  }
  fitPixelRatio();

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(64, 16 / 9, 1, 4000);
  const WHITE = new THREE.Color(0xffffff);
  const hemi = new THREE.HemisphereLight(0xffffff, 0xcdd6c2, 1.0);
  scene.add(hemi);
  const sun = new THREE.DirectionalLight(0xfff6e6, 1.12);
  sun.position.set(200, 500, 180);
  scene.add(sun);
  // 태양은 월드에 고정이라 카메라를 향한 면은 늘 어둡게 뜬다.
  // 카메라에 물린 약한 필 라이트로 어느 방향에서 보든 얼굴이 살아나게 한다.
  const fill = new THREE.DirectionalLight(0xffffff, 0.5);
  fill.position.set(0.35, 0.8, 1);
  camera.add(fill);
  scene.add(camera);

  const state = {
    scene: 'menu', menuStep: 0,        // 0 캐릭터 1 모드 2 코스(그랑프리면 컵)
    charIndex: 0, trackIndex: 0, modeIndex: 0, cupIndex: 0,
    gp: null, fx: null, coinPicks: 0, earned: null, podium: null,
    garage: loadGarage(),
    track: null, trackGroup: null,
    karts: [], models: [], player: null,
    boxes: [], projectiles: [], projMeshes: [], extraMeshes: [],
    raceTime: 0, countdown: 0, lapStart: 0, bestLap: null, myBest: null,
    results: [], finishDelay: 0, finishSide: 0, time: 0,
    rival: null, rivalBeat: false, rivalUnlockedNow: false
  };

  const keys = Object.create(null);
  const touch = { steer: 0, drift: false, item: false, ids: {} };

  // ---------- 화면 ----------
  function resize() {
    fitPixelRatio();
    const w = window.innerWidth, h = window.innerHeight;
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
  }
  window.addEventListener('resize', resize, { passive: true });
  resize();

  // ---------- 레이스 준비 ----------
  // 씬에서 빼는 것만으로는 GPU 메모리가 반환되지 않는다.
  // 다시 하기를 반복하면 지오메트리가 쌓여 몇 판 만에 게임이 멈춘다.
  function disposeTree(obj) {
    obj.traverse(o => {
      if (o.geometry) o.geometry.dispose();
      const m = o.material;
      if (Array.isArray(m)) m.forEach(x => x && x.dispose());
      else if (m) m.dispose();
    });
  }

  function removeAndDispose(obj) {
    if (!obj) return;
    scene.remove(obj);
    disposeTree(obj);
  }

  function clearRace() {
    removeAndDispose(state.trackGroup);
    state.trackGroup = null;
    state.models.forEach(removeAndDispose);
    clearHearts();
    state.boxes.forEach(b => removeAndDispose(b.mesh));
    state.projMeshes.forEach(removeAndDispose);
    state.extraMeshes.forEach(removeAndDispose);
    if (state.fx) removeAndDispose(state.fx.group);
    state.fx = null;
    clearTrail();
    clearPodium();
    state.models = []; state.boxes = []; state.projectiles = []; state.projMeshes = [];
    state.extraMeshes = []; state.karts = [];
  }

  function bestKey() {
    return 'sanrio-kart3d:' + TRACKS[state.trackIndex].id + ':' + MODES[state.modeIndex].id;
  }

  // ---------- 라이벌 레이스 기록 ----------
  // 코스별 { unlocked, won, losses }. 일반 기록(최고 바퀴)과 섞지 않는다.
  const RIVAL_KEY = 'sanrio-kart3d:rival:v1';
  let rivalRecords = (() => {
    try {
      const raw = JSON.parse(localStorage.getItem(RIVAL_KEY) || '{}');
      return raw && typeof raw === 'object' && !Array.isArray(raw) ? raw : {};
    } catch (_) { return {}; }
  })();
  function rivalRecord(trackId) {
    const r = rivalRecords[trackId];
    const unlocked = !!(r && r.unlocked === true);
    return {
      unlocked,
      won: unlocked && r.won === true,
      losses: unlocked && Number.isFinite(Number(r.losses)) ? Math.max(0, Math.min(9, Math.floor(Number(r.losses)))) : 0
    };
  }
  function saveRivalRecord(trackId, rec) {
    rivalRecords[trackId] = rec;
    try { localStorage.setItem(RIVAL_KEY, JSON.stringify(rivalRecords)); } catch (_) {}
  }
  // 라이벌 레이스는 어느 코스든 하나를 1등으로 끝내면 모드 목록에 나타나고,
  // 코스 고르기에서 열린 코스만 고를 수 있다.
  function modeVisible(i) {
    return !MODES[i].rival || TRACKS.some(t => rivalRecord(t.id).unlocked);
  }
  function trackLocked(i) {
    return !!MODES[state.modeIndex].rival && !rivalRecord(TRACKS[i].id).unlocked;
  }

  function startRace() {
    clearRace();
    const def = TRACKS[state.trackIndex];
    const mode = MODES[state.modeIndex];
    state.track = buildTrack(def);
    state.trackGroup = buildTrackMesh(state.track, scene);
    scene.background = new THREE.Color(def.sky);
    scene.fog = new THREE.Fog(def.fog, 420, 1900);
    // 지면색을 반사광에 그대로 쓰면 잔디 초록이 흰 캐릭터까지 물들인다.
    // 트랙 분위기는 남기되 흰색 쪽으로 희석한다.
    hemi.groundColor.set(def.ground).lerp(WHITE, 0.66);
    // 트랙마다 밝기를 달리한다(밤길은 어둡게).
    hemi.intensity = def.hemi != null ? def.hemi : 1.0;
    sun.intensity = def.sunI != null ? def.sunI : 1.12;
    fill.intensity = def.sunI != null ? 0.34 : 0.5;

    let lineup;
    if (mode.gp && state.gp) lineup = state.gp.lineup;
    else if (mode.villains) {
      const me = CHARACTERS[state.charIndex];
      lineup = [me].concat(shuffle(VILLAINS.slice()).slice(0, 2), shuffle(CHARACTERS.filter(c => c !== me)).slice(0, 3));
    } else {
      const order = [state.charIndex].concat(
        CHARACTERS.map((_, i) => i).filter(i => i !== state.charIndex));
      if (mode.rival) {
        // 라이벌은 남은 친구 중 가장 빠른 카트이고, 바로 옆 칸에서 출발한다.
        const rivalIdx = order.slice(1).reduce((best, i) => CHARACTERS[i].top > CHARACTERS[best].top ? i : best, order[1]);
        order.splice(order.indexOf(rivalIdx), 1);
        order.splice(1, 0, rivalIdx);
      }
      lineup = order.map(i => CHARACTERS[i]);
    }
    const count = Math.min(lineup.length, 1 + mode.ai);
    const p0 = state.track.points[0];
    const startAngle = Math.atan2(p0.tx, p0.tz);
    for (let slot = 0; slot < count; slot++) {
      const spec = lineup[slot];
      const back = 26 + Math.floor(slot / 2) * 26;
      const side = (slot % 2 ? 1 : -1) * 13;
      const fx = Math.sin(startAngle), fz = Math.cos(startAngle);
      const k = new Kart(spec, state.track, {
        x: p0.x - fx * back - fz * side,
        y: p0.y,
        z: p0.z - fz * back + fx * side,
        angle: startAngle,
        isPlayer: slot === 0
      });
      k.progress = state.track.nearest(k.x, k.z).p.dist;
      // 출발선 뒤에서 출발하므로 선을 처음 넘을 때가 1바퀴의 시작이다.
      // 예전에는 여기서 0바퀴로 시작해 출발 3초 만에 "2 / 3"이 떴다.
      k.lap = k.progress > state.track.length / 2 ? -1 : 0;
      k.total = k.lap * state.track.length + k.progress;
      k.lineupIndex = slot;
      k.coins = 0;
      if (spec.villain) { k.prank = spec.prank; k.prankClock = 6 + Math.random() * 5; }
      state.karts.push(k);
      const model = buildKartModel(spec);
      if (slot === 0) applyLook(model, state.garage.equip);
      scene.add(model);
      state.models.push(model);
      if (k.isPlayer) {
        state.player = k;
        // models는 karts와 1:1로 맞춰야 하므로 방패는 따로 보관한다
        k.shieldMesh = makeShieldMesh();
        k.shieldMesh.visible = false;
        scene.add(k.shieldMesh);
        state.extraMeshes.push(k.shieldMesh);
      }
    }

    state.rival = null;
    if (mode.rival) {
      const rec = rivalRecord(def.id);
      state.rival = state.karts[1];
      // 세 번 연달아 지면 3%씩, 최대 6%까지 라이벌이 느려진다.
      state.rival.rival = { assist: 1 - Math.min(0.06, Math.floor(rec.losses / 3) * 0.03) };
    }

    // 아이템 상자
    if (mode.items) {
      const T = state.track, n = T.points.length;
      const SETS = 8;
      for (let s = 0; s < SETS; s++) {
        const i = Math.floor(n * (s + 0.5) / SETS);
        const p = T.points[i];
        const tan = new THREE.Vector3(p.tx, p.ty, p.tz).normalize();
        const side = new THREE.Vector3().crossVectors(tan, new THREE.Vector3(0, 1, 0)).normalize();
        [-21, -7, 7, 21].forEach(off => {
          const mesh = makeItemBoxMesh();
          mesh.position.set(p.x, p.y + 9, p.z).addScaledVector(side, off);
          scene.add(mesh);
          state.boxes.push({ mesh, x: mesh.position.x, z: mesh.position.z, alive: true, respawn: 0 });
        });
      }
    }

    // 달리는 동안 할 거리: 부스트 발판·코인·장애물·무지개 링
    state.fx = buildCourseFx(state.track);
    scene.add(state.fx.group);
    state.coinPicks = 0;
    state.earned = null;
    trailClock = 0;
    el('vsay').classList.remove('show');
    el('toast').classList.remove('show');

    state.raceTime = 0;
    state.countdown = 3.6;
    state.lapStart = 0;
    state.myBest = null;
    state.results = [];
    state.finishDelay = 0;
    state.finishSide = 0;
    state.rivalBeat = false;
    state.rivalUnlockedNow = false;
    driftArmed = false; jumpEdge = false;
    sfxPrev = null;
    audio.startMusic(state.trackIndex);
    try { state.bestLap = parseFloat(localStorage.getItem(bestKey())) || null; } catch (_) { state.bestLap = null; }
    state.scene = 'race';
    showHud(true);
  }

  // ---------- 입력 ----------
  // 스페이스를 누르고 있으면 드리프트, "누른 순간"에만 점프한다.
  // 둘 다 홀드로 만들면 계속 통통 튀면서 조향을 못 한다.
  let jumpEdge = false;
  // 메뉴에서 스페이스를 눌러 레이스를 시작하면 그 키가 눌린 채로 넘어와서
  // 출발하자마자 드리프트가 걸렸다. 한 번 뗀 뒤부터 유효하게 한다.
  let driftArmed = true;
  function playerInput() {
    if (state.autopilot) {                      // 자동 검증용: 플레이어도 AI처럼 달린다
      const d = driveAI(state.player, state.player.total);
      d.use = !!state.player.item; d.jump = state.player.airborne && state.player.trickWindow > 0;
      return d;
    }
    let steer = 0;
    if (keys.ArrowLeft || keys.KeyA) steer -= 1;
    if (keys.ArrowRight || keys.KeyD) steer += 1;
    steer = Math.max(-1, Math.min(1, steer + touch.steer));
    const held = !!(keys.Space || touch.drift);
    if (!held) driftArmed = true;
    const jump = driftArmed && jumpEdge;
    jumpEdge = false;
    return {
      steer,
      drift: driftArmed && held,
      jump,
      use: !!(keys.Enter || keys.KeyZ || touch.item)
    };
  }

  // ---------- 갱신 ----------
  function update(dt) {
    state.time += dt;
    if (state.scene !== 'race') return;

    if (state.countdown > 0) {
      state.countdown -= dt;
      followCamera(dt, true);
      updateHud();          // 예전에는 여기서 바로 빠져나가 카운트다운이 화면에 뜨지 않았다
      return;
    }
    state.raceTime += dt;

    const input = playerInput();
    const mode = MODES[state.modeIndex];

    // 아이가 많이 뒤처지면 카트가 조금 더 힘을 낸다.
    // 드리프트를 아직 못 쓰는 아이도 경주에 붙어 있게 하는 장치다.
    if (mode.ai > 0) {
      let leader = state.player.total;
      for (const k of state.karts) if (k.total > leader) leader = k.total;
      const behind = leader - state.player.total;
      const boostMult = behind > 55 ? Math.min(mode.rival ? 1.06 : 1.14, 1 + (behind - 55) / 620) : 1;
      state.player.baseTop = state.player.spec.top * boostMult;
    }

    for (const k of state.karts) {
      if (k.finished) { k.speed *= 1 - dt * 1.5; continue; }
      const drive = k.isPlayer ? input : driveAI(k, state.player.total);
      if (!k.isPlayer && k.airborne && k.trickWindow > 0 && Math.random() < 0.06) drive.jump = true;
      k.update(dt, drive);
      applyMagnet(k, state.karts, dt);
      const prevLap = k.lap;
      const done = k.updateProgress(state.track.laps);
      if (k.isPlayer && k.lap > prevLap && k.lap > 0) {
        const lap = state.raceTime - state.lapStart;
        state.lapStart = state.raceTime;
        if (!state.myBest || lap < state.myBest) state.myBest = lap;
      }
      if (done) {
        k.finished = true;
        k.finishTime = state.raceTime;
        state.results.push(k);
        if (k.isPlayer) {
          if (state.myBest && (!state.bestLap || state.myBest < state.bestLap)) {
            state.bestLap = state.myBest;
            try { localStorage.setItem(bestKey(), String(state.myBest)); } catch (_) {}
          }
        }
      }
    }

    if (state.fx) state.fx.update(dt, state.karts, state.time, onFx);
    for (const k of state.karts) {
      if (!k.trickLanded) continue;
      k.trickLanded = 0;
      if (k === state.player) { toast('멋진 묘기! 부스터 🌟'); audio.sfx('trick'); }
    }
    if (mode.items) updateVillains(dt);
    updateTrail(dt);
    paintRainbow();

    // 칸막이에 부딪히면 하트가 튄다 (부딪힌 건 물리 쪽이 알려 준다)
    for (const k of state.karts) {
      if (!k.bumpFlash) continue;
      k.bumpFlash = 0;
      spawnHearts(k);
      if (k === state.player) audio.sfx('bump');
    }
    updateHearts(dt);

    // 소리는 상태 변화를 보고 낸다. 물리 쪽에 오디오를 끌어들이지 않기 위해서다.
    watchSfx();

    if (mode.items) updateItems(dt, input);
    pushApart();
    rankKarts();
    if (state.player.finished) finishCamera(dt);
    else followCamera(dt, false);

    state.karts.forEach((k, i) => k.applyToModel(state.models[i]));
    if (state.player.shieldMesh) {
      const s = state.player.shieldMesh;
      s.visible = state.player.shield > 0;
      s.position.set(state.player.x, state.player.y + 10, state.player.z);
    }
    if (state.trackGroup && state.trackGroup.userData.spin) {
      state.trackGroup.userData.spin.rotation.y += dt * 0.35;
    }
    state.boxes.forEach(b => {
      if (b.mesh.visible) { b.mesh.rotation.y += dt * 1.6; b.mesh.rotation.x += dt * 0.9; }
    });

    if (state.player.finished) {
      state.finishDelay += dt;
      if (state.finishDelay > FINISH_CAM + 0.9) {
        state.karts.forEach(k => {
          if (!k.finished) { k.finished = true; k.finishTime = 9999; state.results.push(k); }
        });
        state.scene = 'result';
        audio.stopMusic();
        audio.fanfare();
        settleRival();
        showResult();
      }
    }
    updateHud();
  }

  function updateItems(dt, input) {
    // 상자
    for (const b of state.boxes) {
      if (!b.alive) {
        b.respawn -= dt;
        if (b.respawn <= 0) { b.alive = true; b.mesh.visible = true; }
        continue;
      }
      for (const k of state.karts) {
        if (Math.hypot(k.x - b.x, k.z - b.z) < 19) {
          b.alive = false; b.respawn = 4.5; b.mesh.visible = false;
          if (!k.item) k.item = rollItem(k.place, state.karts.length);
          break;
        }
      }
    }
    // 사용
    if (input.use && state.player.item && state.player.itemCooldown <= 0 && !state.player.finished) {
      useItem(state.player, state.karts, spawnProjectile);
    }
    for (const k of state.karts) {
      if (k.isPlayer || !k.item || k.finished) continue;
      if (k.rival) { rivalUseItem(k, dt); continue; }
      k.aiDelay = (k.aiDelay === undefined ? 1.4 : k.aiDelay) - dt;
      if (k.aiDelay <= 0) { useItem(k, state.karts, spawnProjectile); k.aiDelay = 1.4; }
    }
    // 발사체
    for (let i = state.projectiles.length - 1; i >= 0; i--) {
      const p = state.projectiles[i];
      p.life -= dt;
      p.armed -= dt;
      p.x += (p.vx || 0) * dt;
      p.z += (p.vz || 0) * dt;
      const thrown = p.kind === 'bomb' || p.kind === 'balloon';
      if (thrown) { p.vx *= 1 - dt * 0.5; p.vz *= 1 - dt * 0.5; }
      p.y = state.track.sample(p.x, p.z).y + (thrown ? 6 : 2);
      p.mesh.position.set(p.x, p.y, p.z);
      p.mesh.rotation.y += dt * 4;

      let hit = false;
      if (p.armed <= 0) {
        for (const k of state.karts) {
          if (k.finished || (thrown && k === p.owner)) continue;
          if ((p.kind === 'banana' || p.kind === 'bat') && k === p.owner && p.life > 29) continue;
          if (Math.hypot(k.x - p.x, k.z - p.z) < 13) {
            if (k.shield > 0) { k.shield = 0; if (k === state.player) toast('방패로 막았어요! 🛡️'); }
            else {
              k.spin = 1.0; k.speed *= 0.45; k.coins = Math.max(0, (k.coins || 0) - 2);
              if (k === state.player) toast({ banana: '바나나에 미끄덩!', bomb: '펑!', balloon: '물풍선에 첨벙! 💦', bat: '박쥐 풍선에 깜짝! 🦇' }[p.kind] || '앗!');
            }
            hit = true;
            break;
          }
        }
      }
      if (hit || p.life <= 0) {
        removeAndDispose(p.mesh);
        const mi = state.projMeshes.indexOf(p.mesh);
        if (mi >= 0) state.projMeshes.splice(mi, 1);
        state.projectiles.splice(i, 1);
      }
    }
  }

  // 라이벌은 아이템을 바로 쓰지 않는다. 바나나는 바로 뒤에 붙었을 때,
  // 폭탄은 플레이어가 앞서 있을 때 쓴다. 그래서 방패를 아껴 둘 이유가 생긴다.
  function rivalUseItem(k, dt) {
    const gap = k.total - state.player.total;           // + 이면 라이벌이 앞
    k.aiDelay = (k.aiDelay === undefined ? 0.6 : k.aiDelay) - dt;
    if (k.aiDelay > 0) return;
    const id = k.item;
    const use = id === 'banana' ? gap > 0 && gap < 150
      : id === 'bomb' ? gap < 0 && gap > -320
      : id === 'magnet' ? gap < 40                        // 자석은 뒤에 있을 때
      : true;                                             // 부스터·방패는 바로
    if (use) { useItem(k, state.karts, spawnProjectile); k.aiDelay = 0.8; }
  }

  function settleRival() {
    const mode = MODES[state.modeIndex], id = TRACKS[state.trackIndex].id, rec = rivalRecord(id);
    if (mode.rival && state.rival) {
      state.rivalBeat = state.player.finishTime < state.rival.finishTime;
      saveRivalRecord(id, { unlocked: true, won: rec.won || state.rivalBeat, losses: state.rivalBeat ? 0 : rec.losses + 1 });
    } else if (mode.ai > 0 && state.player.place === 1 && !rec.unlocked) {
      state.rivalUnlockedNow = true;
      saveRivalRecord(id, { unlocked: true, won: false, losses: 0 });
    }
  }

  function spawnProjectile(p) {
    p.mesh = p.kind === 'banana' ? makeBananaMesh() : p.kind === 'balloon' ? makeBalloonMesh()
      : p.kind === 'bat' ? makeBatMesh() : makeBombMesh();
    p.mesh.position.set(p.x, p.y, p.z);
    scene.add(p.mesh);
    state.projMeshes.push(p.mesh);
    state.projectiles.push(p);
  }

  function pushApart() {
    const ks = state.karts;
    for (let i = 0; i < ks.length; i++) {
      for (let j = i + 1; j < ks.length; j++) {
        const a = ks[i], b = ks[j];
        const dx = b.x - a.x, dz = b.z - a.z;
        const d = Math.hypot(dx, dz);
        if (d > 18 || d < 0.001) continue;
        const push = (18 - d) * 0.5;
        a.x -= dx / d * push; a.z -= dz / d * push;
        b.x += dx / d * push; b.z += dz / d * push;
      }
    }
  }

  function rankKarts() {
    const sorted = state.karts.slice().sort((a, b) => {
      if (a.finished && b.finished) return a.finishTime - b.finishTime;
      if (a.finished) return -1;
      if (b.finished) return 1;
      return b.total - a.total;
    });
    sorted.forEach((k, i) => { k.place = i + 1; });
  }

  const camPos = new THREE.Vector3();
  const camLook = new THREE.Vector3();
  function followCamera(dt, snap) {
    const p = state.player;
    // 앞 코스가 충분히 보이도록 뒤·위로 넉넉히 물러난다
    const back = 104, up = 46;
    const tx = p.x - Math.sin(p.angle) * back;
    const tz = p.z - Math.cos(p.angle) * back;
    const ty = p.y + up + (p.airborne ? 6 : 0);
    const k = snap ? 1 : 1 - Math.pow(0.0006, dt);
    camPos.set(tx, ty, tz);
    camera.position.lerp(camPos, k);
    camLook.set(p.x + Math.sin(p.angle) * 95, p.y + 4, p.z + Math.cos(p.angle) * 95);
    camera.lookAt(camLook);
  }

  // 결승 통과 뒤 카메라가 옆으로 돌아 카트 앞모습을 보여준다.
  // e=0 일 때 위 followCamera와 완전히 같은 위치·시선이라 넘어갈 때 끊기지 않는다.

  // 카메라와 주인공을 잇는 선을 라이벌이 얼마나 막는지 재서 덜 막히는 쪽을 고른다
  function clearestSide() {
    const p = state.player;
    let best = 1, bestScore = -Infinity;
    for (const sgn of [1, -1]) {
      const cx = p.x + Math.sin(p.angle + sgn * 0.78) * 58;
      const cz = p.z + Math.cos(p.angle + sgn * 0.78) * 58;
      let score = 0;
      for (const k of state.karts) {
        if (k === p) continue;
        const vx = p.x - cx, vz = p.z - cz;
        const len2 = vx * vx + vz * vz || 1;
        let t = ((k.x - cx) * vx + (k.z - cz) * vz) / len2;
        t = Math.max(0, Math.min(1, t));
        score += Math.min(46, Math.hypot(k.x - (cx + vx * t), k.z - (cz + vz * t)));
      }
      if (score > bestScore) { bestScore = score; best = sgn; }
    }
    return best;
  }

  const FINISH_CAM = 2.6;
  function finishCamera(dt) {
    const p = state.player;
    const t = Math.min(1, state.finishDelay / FINISH_CAM);
    const e = t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;   // 부드러운 가감속
    // 앞에서 잡으면 앞서 달리는 카트가 주인공을 가린다. 카트를 숨기는 대신,
    // 좌·우 중 시선이 덜 막히는 쪽으로 돌아 전원이 화면에 남게 한다.
    if (state.finishSide === 0) state.finishSide = clearestSide();
    const start = state.finishSide > 0 ? Math.PI : -Math.PI;
    const phi = start * (1 - e) + state.finishSide * 0.78 * e;   // 뒤 → 앞 3/4
    const dist = 104 - 46 * e;
    const up = 46 - 16 * e;
    camPos.set(p.x + Math.sin(p.angle + phi) * dist,
               p.y + up,
               p.z + Math.cos(p.angle + phi) * dist);
    camera.position.lerp(camPos, 1 - Math.pow(0.002, dt));
    // 시선도 "앞쪽 95" 에서 카트 얼굴로 함께 옮긴다
    const lx = p.x + Math.sin(p.angle) * 95 * (1 - e);
    const lz = p.z + Math.cos(p.angle) * 95 * (1 - e);
    camLook.set(lx, p.y + 4 + 9 * e, lz);
    camera.lookAt(camLook);
  }

  // ---------- HUD ----------
  let lastCount = null;

  const audio = createAudio();

  // ---- 칸막이에 부딪혔을 때 튀는 하트 ----
  // 스프라이트 30개를 미리 만들어 돌려 쓴다. 매번 만들면 GPU 자원이 샌다.
  let heartTex = null, heartPool = [], heartLive = [];
  function makeHeartTexture() {
    const S = 96, cv = document.createElement('canvas');
    cv.width = cv.height = S;
    const c = cv.getContext('2d');
    c.translate(S / 2, S / 2); c.scale(S / 26, S / 26);
    c.fillStyle = '#ff6f9d'; c.strokeStyle = '#ffffff'; c.lineWidth = 1.5;
    c.beginPath();
    c.moveTo(0, 8);
    c.bezierCurveTo(-11, -1, -8.5, -13, 0, -6);
    c.bezierCurveTo(8.5, -13, 11, -1, 0, 8);
    c.closePath(); c.fill(); c.stroke();
    c.fillStyle = 'rgba(255,255,255,0.65)';
    c.beginPath(); c.ellipse(-3.4, -4, 1.9, 1.3, -0.5, 0, Math.PI * 2); c.fill();
    const t = new THREE.CanvasTexture(cv);
    return t;
  }
  function heartSprite() {
    if (heartPool.length) return heartPool.pop();
    if (!heartTex) heartTex = makeHeartTexture();
    const m = new THREE.Sprite(new THREE.SpriteMaterial({
      map: heartTex, transparent: true, depthWrite: false
    }));
    m.scale.set(9, 9, 1);
    return m;
  }
  function spawnHearts(k) {
    for (let i = 0; i < 7; i++) {
      if (heartLive.length > 40) break;
      const sp = heartSprite();
      sp.position.set(k.x, k.y + 12, k.z);
      sp.material.opacity = 1;
      scene.add(sp);
      heartLive.push({
        sp,
        vx: (Math.random() - 0.5) * 26,
        vy: 34 + Math.random() * 26,
        vz: (Math.random() - 0.5) * 26,
        life: 0.95, max: 0.95,
        sc: 7 + Math.random() * 6
      });
    }
  }
  function updateHearts(dt) {
    for (let i = heartLive.length - 1; i >= 0; i--) {
      const h = heartLive[i];
      h.life -= dt;
      h.sp.position.x += h.vx * dt;
      h.sp.position.y += h.vy * dt;
      h.sp.position.z += h.vz * dt;
      h.vy -= 46 * dt;
      const k = 1 - h.life / h.max;
      h.sp.material.opacity = Math.min(1, h.life / h.max * 2.2);
      const sc = h.sc * (0.75 + k * 0.5);
      h.sp.scale.set(sc, sc, 1);
      if (h.life <= 0) {
        scene.remove(h.sp);
        heartPool.push(h.sp);
        heartLive.splice(i, 1);
      }
    }
  }
  function clearHearts() {
    for (const h of heartLive) { scene.remove(h.sp); heartPool.push(h.sp); }
    heartLive = [];
  }

  let sfxPrev = null;
  function watchSfx() {
    const p = state.player;
    const now = {
      boost: p.boost > 0, spin: p.spin > 0, air: p.airborne,
      item: p.item, lap: p.lap
    };
    const q = sfxPrev;
    if (q) {
      if (now.spin && !q.spin) audio.sfx('hit');
      else if (now.boost && !q.boost && !q.item) audio.sfx('boost');
      if (now.air && !q.air) audio.sfx('jump');
      if (!now.air && q.air) audio.sfx('land');
      if (now.item && !q.item) audio.sfx('pickup');
      // 무엇을 썼는지 귀로도 알 수 있게 아이템 종류별로 소리를 낸다
      if (!now.item && q.item) audio.sfx('use:' + q.item);
      if (now.lap > q.lap && now.lap > 0) audio.sfx('lap');
    }
    sfxPrev = now;
  }

  const hud = el('hud');
  const mini = el('mini');
  const miniCtx = mini.getContext('2d');

  function showHud(on) { hud.style.display = on ? 'block' : 'none'; }

  function fmt(t) {
    if (t == null || t > 9000) return '--:--';
    const m = Math.floor(t / 60), s = t - m * 60;
    return m + ':' + (s < 10 ? '0' : '') + s.toFixed(2);
  }

  function updateHud() {
    const p = state.player;
    el('lap').textContent = Math.max(1, Math.min(state.track.laps, p.lap + 1)) + ' / ' + state.track.laps;
    el('place').textContent = MODES[state.modeIndex].ai ? p.place + '등' : '혼자';
    el('timer').textContent = fmt(state.raceTime);
    el('coin').textContent = '🪙 ' + (p.coins || 0);
    el('best').textContent = state.bestLap ? '최고 ' + fmt(state.bestLap) : '';
    const rivalPanel = el('p-rival');
    if (state.rival) {
      const r = state.rival;
      // 속도로 나누면 부딪혀 멈췄을 때 숫자가 튄다. 내 카트 최고 속도의 90%로 환산한다.
      const sec = (r.total - p.total) / (p.spec.top * 0.9);
      const close = !r.finished && !p.finished && sec < 0 && sec > -1.2;
      rivalPanel.style.display = '';
      el('rival-name').textContent = '🔥 ' + r.spec.name;
      el('rival-gap').textContent = r.finished ? '도착' : (sec > 0 ? '앞 ' : '뒤 ') + Math.abs(sec).toFixed(1) + '초';
      el('rival-warn').textContent = close ? (r.item === 'banana' ? '🍌 뒤에서 노려요!' : '바짝 쫓아와요!') : '';
      rivalPanel.classList.toggle('close', close);
    } else rivalPanel.style.display = 'none';
    const item = el('item');
    if (!MODES[state.modeIndex].items) {
      item.style.display = 'none';
    } else {
      item.style.display = '';
      const t = ITEM_TYPES.find(x => x.id === p.item);
      item.textContent = t ? t.icon : '';
      item.className = 'item' + (t ? ' has' : '');
    }
    const bar = el('driftbar');
    if (p.drift > 0) {
      bar.style.display = 'block';
      const c = Math.min(1, p.driftCharge / 1.25);
      bar.firstElementChild.style.width = (c * 100) + '%';
      bar.firstElementChild.style.background = c > 0.85 ? '#ff8f45' : '#5cc8ff';
    } else bar.style.display = 'none';

    const cd = el('countdown');
    if (state.countdown > 0) {
      const n = Math.ceil(state.countdown - 0.6);
      const label = n > 0 ? String(n) : '출발!';
      if (label !== lastCount) {
        lastCount = label;
        cd.textContent = label;
        cd.style.color = n > 0 ? '#fff3a6' : '#9be2b5';
        cd.classList.remove('pop');
        void cd.offsetWidth;                 // 애니메이션 재시작
        cd.classList.add('pop');
        audio.beep(n > 0 ? 520 : 880, n > 0 ? 0.26 : 0.5);
      }
      cd.style.display = 'block';
    } else {
      cd.style.display = 'none';
      lastCount = null;
    }

    drawMini();
  }

  function drawMini() {
    const T = state.track;
    const g = miniCtx;
    const S = 132;
    g.clearRect(0, 0, S, S);
    g.save();
    g.translate(S / 2, S / 2);
    const sc = S / 1100;
    g.scale(sc, sc);
    g.strokeStyle = 'rgba(255,255,255,0.9)';
    g.lineWidth = 44;
    g.lineJoin = 'round';
    g.beginPath();
    T.points.forEach((p, i) => i ? g.lineTo(p.x, p.z) : g.moveTo(p.x, p.z));
    g.closePath();
    g.stroke();
    state.karts.forEach(k => {
      g.fillStyle = k.isPlayer ? '#ff3d7a' : k === state.rival ? '#ff8a3d' : '#6b5b78';
      g.beginPath();
      g.arc(k.x, k.z, k.isPlayer ? 34 : 26, 0, Math.PI * 2);
      g.fill();
    });
    g.restore();
  }

  // ---------- 메뉴 ----------
  const menu = el('menu');
  function showMenu() {
    state.scene = 'menu';
    showHud(false);
    el('result').style.display = 'none';
    menu.style.display = 'flex';
    renderMenu();
  }

  function stepItems() {
    if (state.menuStep === 0) return CHARACTERS;
    if (state.menuStep === 1) return MODES;
    return MODES[state.modeIndex].gp ? CUPS : TRACKS;
  }
  function stepKey() {
    return ['charIndex', 'modeIndex', MODES[state.modeIndex].gp ? 'cupIndex' : 'trackIndex'][state.menuStep];
  }
  function selectable(i) {
    if (state.menuStep === 1) return modeVisible(i);
    if (state.menuStep === 2 && !MODES[state.modeIndex].gp) return !trackLocked(i);
    return true;
  }

  function renderMenu() {
    const gp = MODES[state.modeIndex].gp;
    const steps = ['누구로 달릴까요?', '어떤 경주를 할까요?', gp ? '컵을 골라요' : '코스를 골라요'];
    el('menu-title').textContent = steps[state.menuStep];
    const list = el('menu-list');
    list.innerHTML = '';
    list.classList.toggle('chars', state.menuStep === 0);
    const items = stepItems();
    const sel = state[stepKey()];
    items.forEach((it, i) => {
      if (state.menuStep === 1 && !modeVisible(i)) return;
      const b = document.createElement('button');
      const locked = !selectable(i);
      b.className = 'card' + (i === sel ? ' on' : '') + (locked ? ' locked' : '');
      let html;
      if (state.menuStep === 0) {
        const kid = CHARACTERS.indexOf(it) >= 7;
        html = '<img alt="" src="' + thumb(it) + '"><strong>' + it.name + '</strong><small>' +
          (kid ? '우리 아이 · ' : '') + '속도 ' + '★'.repeat(Math.max(1, Math.round((it.top - 106) / 5))) + '</small>';
      } else if (state.menuStep === 1) {
        html = '<strong>' + it.name + '</strong><small>' + it.desc + '</small>';
      } else if (gp) {
        const best = state.garage.trophies[it.id];
        const names = it.tracks.map(id => TRACKS.find(t => t.id === id).name).join(' · ');
        const foes = it.villains.map(id => driverById(id).name).join('·');
        html = '<b class="cupicon">' + it.icon + '</b><strong>' + it.name + (best ? ' ' + MEDAL[best] : '') + '</strong><small>' + names +
          '</small><small>😈 ' + foes + ' 등장</small>';
      } else {
        const rw = MODES[state.modeIndex].rival && rivalRecord(it.id).won ? ' · ✓ 이겨 봤어요' : '';
        html = '<strong>' + (locked ? '🔒 ' : '') + it.name + '</strong><small>' + it.laps + '바퀴 · ' +
          (locked ? '일반 경주 1등부터' : (it.tip || '')) + rw + '</small>';
      }
      b.innerHTML = html;
      b.addEventListener('click', () => {
        if (locked) return;
        state[stepKey()] = i;
        nextStep();
      });
      list.appendChild(b);
    });
    el('menu-back').style.display = state.menuStep > 0 ? 'inline-block' : 'none';
    // 조작 설명과 음악 설정은 첫 화면에서만. 매 단계 반복하면 세로가 짧은
    // 화면(아이패드 가로)에서 카드가 밀려 잘린다.
    const first = state.menuStep === 0;
    el('keys').style.display = first ? 'grid' : 'none';
    el('bgm').style.display = first ? 'flex' : 'none';
    el('garage-open').style.display = first ? 'inline-block' : 'none';
    el('garage-open').textContent = '🧰 차고 꾸미기 · 🪙 ' + state.garage.coins;
  }

  function nextStep() {
    if (state.menuStep < 2) {
      state.menuStep++;
      const key = stepKey(), n = stepItems().length;
      if (state[key] >= n) state[key] = 0;
      if (!selectable(state[key])) {
        for (let v = 0; v < n; v++) if (selectable(v)) { state[key] = v; break; }
      }
      renderMenu();
    }
    else {
      menu.style.display = 'none';
      if (MODES[state.modeIndex].gp) startCup(); else { state.gp = null; startRace(); }
    }
  }

  el('menu-back').addEventListener('click', () => {
    if (state.menuStep > 0) { state.menuStep--; renderMenu(); }
  });

  function showResult() {
    showHud(false);
    const box = el('result');
    box.style.display = 'flex';
    const p = state.player;
    const solo = MODES[state.modeIndex].ai === 0;
    const mode = MODES[state.modeIndex];
    settleCoins();
    if (mode.gp && state.gp) { showCupStandings(); return; }
    el('next-race').style.display = 'none';
    el('again').style.display = '';
    el('result-title').textContent = mode.rival
      ? (state.rivalBeat ? '🔥 라이벌을 이겼어요!' : '라이벌에게 졌어요 · 한 번 더!')
      : solo ? '완주했어요!' : (p.place === 1 ? '1등! 최고예요!' : '완주했어요!');
    const rows = el('result-rows');
    rows.innerHTML = '';
    state.results.forEach((k, i) => {
      const d = document.createElement('div');
      d.className = 'row' + (k.isPlayer ? ' me' : '');
      d.innerHTML = '<span>' + (i + 1) + '등</span><b>' + (k === state.rival ? '🔥 ' : k.spec.villain ? '😈 ' : '') + k.spec.name + '</b><em>' +
        fmt(k.finishTime) + '</em>';
      rows.appendChild(d);
    });
    el('result-best').textContent = state.myBest
      ? '내 최고 바퀴 ' + fmt(state.myBest) + (state.bestLap === state.myBest ? '  🎉 신기록!' : '')
      : '';
    const note = state.rivalUnlockedNow ? '🔥 이 코스에 라이벌 레이스가 열렸어요!'
      : mode.rival && !state.rivalBeat && rivalRecord(TRACKS[state.trackIndex].id).losses >= 3 ? '라이벌 바나나는 🛡️ 방패로 막을 수 있어요' : '';
    if (note) el('result-best').textContent += (el('result-best').textContent ? '  ·  ' : '') + note;
  }

  el('again').addEventListener('click', () => { el('result').style.display = 'none'; startRace(); });
  el('next-race').addEventListener('click', () => { el('result').style.display = 'none'; nextCupRace(); });
  // 내 음악 넣기 — 파일은 이 기기 안에만 있고 어디로도 전송되지 않는다
  const bgmFile = el('bgm-file'), bgmClear = el('bgm-clear'), bgmName = el('bgm-name');
  function paintBgm(msg) {
    const n = audio.userTrackName();
    bgmName.textContent = msg || (n ? '내 음악: ' + n : '지금은 게임 기본 음악이에요');
    bgmClear.hidden = !n;
  }
  bgmFile.addEventListener('change', () => {
    const f = bgmFile.files && bgmFile.files[0];
    bgmFile.value = '';
    if (!f) return;
    paintBgm('음악을 읽는 중…');
    audio.setUserTrack(f)
      .then(() => paintBgm())
      .catch(() => paintBgm('이 파일은 재생할 수 없어요. 다른 파일로 해보세요'));
  });
  bgmClear.addEventListener('click', () => {
    audio.clearUserTrack().then(() => paintBgm());
  });
  audio.restoreUserTrack().then(() => paintBgm());

// ---- 아이패드 확대 잠금 ----
  // iOS 사파리는 iOS 10 부터 user-scalable=no 를 무시한다. 게임 중에 손가락이
  // 스치거나 두 번 두드리면 화면이 확대되고, 게임 캔버스는 스크롤이 없어서
  // 되돌릴 방법이 없다. 제스처와 더블탭을 직접 막는다.
  ['gesturestart', 'gesturechange', 'gestureend'].forEach(function (ev) {
    document.addEventListener(ev, function (e) { e.preventDefault(); }, { passive: false });
  });
  document.addEventListener('touchmove', function (e) {
    if (e.touches && e.touches.length > 1) e.preventDefault();
  }, { passive: false });
  var lastTouchEnd = 0;
  document.addEventListener('touchend', function (e) {
    var now = Date.now();
    if (now - lastTouchEnd < 320) e.preventDefault();
    lastTouchEnd = now;
  }, { passive: false });
  document.addEventListener('dblclick', function (e) { e.preventDefault(); }, { passive: false });

    const soundBtn = el('sound');
  function paintSound() {
    soundBtn.textContent = audio.isMuted() ? '🔇' : '🔊';
    soundBtn.setAttribute('aria-label', audio.isMuted() ? '소리 켜기' : '소리 끄기');
  }
  paintSound();
  soundBtn.addEventListener('click', e => {
    e.stopPropagation();
    audio.setMuted(!audio.isMuted());
    paintSound();
  });

  el('to-menu').addEventListener('click', () => { state.menuStep = 0; state.gp = null; audio.stopMusic(); showMenu(); });

  // ---------- 조작 ----------
  window.addEventListener('keydown', e => {
    if (e.code === 'Space' && !keys.Space && !e.repeat) jumpEdge = true;
    keys[e.code] = true;
    if (['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', 'Space', 'Enter'].includes(e.code)) e.preventDefault();
    if (state.scene === 'garage') {
      if (e.code === 'Escape') closeGarage();
      return;
    }
    if (state.scene === 'podium') {
      if (e.code === 'Escape' || e.code === 'Enter' || e.code === 'Space') leavePodium();
      return;
    }
    if (state.scene === 'menu') {
      const items = stepItems();
      const key = stepKey();
      // 잠긴 라이벌 레이스·코스는 건너뛴다.
      const stepTo = dir => {
        let v = state[key];
        for (let n = 0; n < items.length; n++) {
          v = (v + dir + items.length) % items.length;
          if (selectable(v)) break;
        }
        state[key] = v; renderMenu();
      };
      if (e.code === 'ArrowLeft') stepTo(-1);
      if (e.code === 'ArrowRight') stepTo(1);
      if (e.code === 'Space' || e.code === 'Enter') nextStep();
      if (e.code === 'Escape' && state.menuStep > 0) { state.menuStep--; renderMenu(); }
    } else if (state.scene === 'result') {
      if (e.code === 'Space' || e.code === 'Enter') {
        el('result').style.display = 'none';
        if (MODES[state.modeIndex].gp && state.gp) nextCupRace(); else startRace();
      }
      if (e.code === 'Escape') { state.menuStep = 0; state.gp = null; showMenu(); }
    } else if (state.scene === 'race' && e.code === 'Escape') {
      state.menuStep = 0; state.gp = null; audio.stopMusic(); showMenu(); clearRace();
    }
  }, { passive: false });
  window.addEventListener('keyup', e => { keys[e.code] = false; });

  // 터치 버튼
  function bindTouch(id, on, off) {
    const b = el(id);
    b.addEventListener('pointerdown', e => { e.preventDefault(); b.classList.add('down'); on(); });
    const release = e => { b.classList.remove('down'); off(); };
    b.addEventListener('pointerup', release);
    b.addEventListener('pointercancel', release);
    b.addEventListener('pointerleave', release);
  }
  bindTouch('t-left', () => touch.steer = -1, () => { if (touch.steer < 0) touch.steer = 0; });
  bindTouch('t-right', () => touch.steer = 1, () => { if (touch.steer > 0) touch.steer = 0; });
  bindTouch('t-drift', () => { touch.drift = true; jumpEdge = true; }, () => touch.drift = false);
  bindTouch('t-item', () => touch.item = true, () => touch.item = false);

  // ================== 코스 이벤트·말풍선 ==================
  let toastTimer = 0, vsayTimer = 0;
  function toast(text) {
    const t = el('toast');
    t.textContent = text;
    t.classList.remove('show'); void t.offsetWidth; t.classList.add('show');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => t.classList.remove('show'), 1300);
  }
  function villainSay(v, text) {
    const b = el('vsay');
    b.innerHTML = '<b style="color:#' + v.spec.horn.toString(16).padStart(6, '0') + '">😈 ' + v.spec.name + '</b> ' + text;
    b.classList.add('show');
    clearTimeout(vsayTimer);
    vsayTimer = setTimeout(() => b.classList.remove('show'), 2300);
  }
  function onFx(kind, k, extra) {
    const me = k === state.player;
    if (kind === 'bonk') k.coins = Math.max(0, (k.coins || 0) - 2);
    if (!me) return;
    if (kind === 'coin') { state.coinPicks++; audio.sfx('coin'); }
    else if (kind === 'pad') { audio.sfx('boost'); toast('부스트! 🔥'); }
    else if (kind === 'bounce') { audio.sfx('boing'); toast('통통! 점프 버튼으로 묘기!'); }
    else if (kind === 'ring') { audio.sfx('ring'); toast('무지개 통과! 🌈'); }
    else if (kind === 'block') { audio.sfx('block'); toast('방패로 막았어요! 🛡️'); }
    else if (kind === 'bonk') toast({ cup: '빙글빙글 찻잔에 쿵!', candy: '사탕 공에 쿵!', crab: '꽃게한테 집혔어요!' }[extra] || '쿵!');
  }

  // ================== 장난꾸러기 ==================
  // 태뿔: 앞사람에게 물풍선 / 찬뿔: 앞사람 머리 위로 번개(점프하면 피한다)
  // 건뿔: 옆에 붙으면 쿵 밀기, 뒤에 있으면 바나나 / 재윙: 뒤로 박쥐 풍선, 뒤처지면 날아서 따라붙기
  let boltTex = null;
  function boltSprite() {
    if (!boltTex) {
      const cv = document.createElement('canvas'); cv.width = cv.height = 96;
      const c = cv.getContext('2d');
      c.fillStyle = '#ffe14d'; c.strokeStyle = '#3a2d0a'; c.lineWidth = 5;
      c.beginPath(); c.moveTo(56, 6); c.lineTo(22, 52); c.lineTo(44, 52); c.lineTo(34, 90); c.lineTo(74, 38); c.lineTo(50, 38); c.lineTo(62, 6); c.closePath();
      c.fill(); c.stroke();
      boltTex = new THREE.CanvasTexture(cv);
    }
    const sp = new THREE.Sprite(new THREE.SpriteMaterial({ map: boltTex, transparent: true, depthWrite: false }));
    sp.scale.set(14, 14, 1);
    return sp;
  }
  function updateVillains(dt) {
    const p = state.player;
    for (const v of state.karts) {
      if (!v.prank || v.finished) continue;
      v.prankClock -= dt;
      if (v.prankClock > 0) continue;
      const gap = p.total - v.total;                   // + 면 플레이어가 앞
      let did = false;
      if (!p.finished && Math.abs(gap) < 420) {
        const fx = Math.sin(v.angle), fz = Math.cos(v.angle);
        if (v.prank === 'balloon' && gap > 25 && gap < 300) {
          spawnProjectile({ kind: 'balloon', x: v.x + fx * 22, y: v.y + 6, z: v.z + fz * 22, vx: fx * 235, vz: fz * 235, life: 2.8, owner: v, armed: 0.12 });
          villainSay(v, '물풍선 받아라~ 💦'); did = true;
        } else if (v.prank === 'zap') {
          let target = null, best = Infinity;
          for (const k of state.karts) {
            if (k === v || k.finished || k.zapBy) continue;
            const g = k.total - v.total;
            if (g > 20 && g < 450 && g < best) { best = g; target = k; }
          }
          if (target) {
            target.zapWarn = 1.15; target.zapBy = v;
            villainSay(v, target === p ? '⚡ 번개가 와요! 점프로 피해요!' : '찌릿찌릿~ ⚡');
            did = true;
          }
        } else if (v.prank === 'slam') {
          if (Math.hypot(v.x - p.x, v.z - p.z) < 36 && !p.airborne) {
            const d = Math.hypot(p.x - v.x, p.z - v.z) || 1;
            p.x += (p.x - v.x) / d * 16; p.z += (p.z - v.z) / d * 16;
            p.speed *= 0.72; spawnHearts(p); audio.sfx('bump');
            villainSay(v, '쿵! 헐크 박치기! 💚'); did = true;
          } else if (gap < -20 && gap > -260) {
            spawnProjectile({ kind: 'banana', x: v.x - fx * 20, y: v.y + 2, z: v.z - fz * 20, vx: 0, vz: 0, life: 30, owner: v, armed: 0.4 });
            villainSay(v, '바나나 조심~ 🍌'); did = true;
          }
        } else if (v.prank === 'bat') {
          if (gap < -20 && gap > -260) {
            spawnProjectile({ kind: 'bat', x: v.x - fx * 20, y: v.y + 2, z: v.z - fz * 20, vx: 0, vz: 0, life: 30, owner: v, armed: 0.4 });
            villainSay(v, '박쥐 풍선 뿅! 🦇'); did = true;
          } else if (gap > 80) {
            v.magnet = 2.0; villainSay(v, '재윙이 날아와요! 🦇'); did = true;
          }
        }
      }
      v.prankClock = did ? 9 + Math.random() * 4 : 1.2;
    }
    // 번개: 예고가 끝나는 순간 공중이면 피하고, 방패면 막고, 아니면 빙글
    for (const k of state.karts) {
      if (k.zapBy && !k.zapSprite) {
        k.zapSprite = boltSprite(); scene.add(k.zapSprite); state.extraMeshes.push(k.zapSprite);
      }
      if (k.zapSprite) {
        const on = !!k.zapBy;
        k.zapSprite.visible = on && Math.floor(state.time * 10) % 2 === 0;
        k.zapSprite.position.set(k.x, k.y + 30 + (k.zapWarn || 0) * 10, k.z);
      }
      if (!k.zapBy || k.zapWarn > 0 || k.finished) continue;
      k.zapBy = null;
      const me = k === p;
      if (k.airborne) { if (me) { toast('휙! 번개를 피했어요! ✨'); audio.sfx('trick'); } }
      else if (k.shield > 0) { k.shield = 0; if (me) { toast('방패로 번개를 막았어요! 🛡️'); audio.sfx('block'); } }
      else {
        k.spin = 0.8; k.speed *= 0.5; k.coins = Math.max(0, (k.coins || 0) - 2);
        if (me) { toast('찌릿! ⚡'); audio.sfx('hit'); }
      }
    }
  }
  function makeBalloonMesh() {
    const g = new THREE.Group();
    const b = new THREE.Mesh(new THREE.SphereGeometry(4.4, 12, 10), new THREE.MeshLambertMaterial({ color: 0x5cc8ff, transparent: true, opacity: 0.85 }));
    b.scale.y = 1.15; g.add(b);
    const knot = new THREE.Mesh(new THREE.ConeGeometry(1, 1.8, 6), new THREE.MeshLambertMaterial({ color: 0x3a9ad0 }));
    knot.position.y = -5.4; knot.rotation.x = Math.PI; g.add(knot);
    return g;
  }
  function makeBatMesh() {
    const g = new THREE.Group();
    const b = new THREE.Mesh(new THREE.SphereGeometry(3.6, 10, 8), new THREE.MeshLambertMaterial({ color: 0x5b2a86 }));
    b.position.y = 4; g.add(b);
    const wm = new THREE.MeshLambertMaterial({ color: 0x3a1a52, side: THREE.DoubleSide });
    [-1, 1].forEach(sd => {
      const sh = new THREE.Shape(); sh.moveTo(0, 0); sh.lineTo(7, 3); sh.lineTo(5.5, 0.5); sh.lineTo(8, -1); sh.lineTo(0, -1.5); sh.closePath();
      const w = new THREE.Mesh(new THREE.ShapeGeometry(sh), wm);
      w.position.set(sd * 2.5, 4.5, 0); w.rotation.y = sd > 0 ? 0 : Math.PI; g.add(w);
    });
    return g;
  }

  // ================== 부스터 꼬리·무지개 색 ==================
  const trailTex = {};
  function trailTexture(shape) {
    if (trailTex[shape]) return trailTex[shape];
    if (shape === 'heart') { trailTex.heart = heartTex || (heartTex = makeHeartTexture()); return trailTex.heart; }
    const cv = document.createElement('canvas'); cv.width = cv.height = 64;
    const c = cv.getContext('2d');
    c.translate(32, 32); c.fillStyle = '#ffffff'; c.beginPath();
    for (let i = 0; i < 10; i++) { const a = i / 10 * Math.PI * 2 - Math.PI / 2, r = i % 2 ? 11 : 28; c.lineTo(Math.cos(a) * r, Math.sin(a) * r); }
    c.closePath(); c.fill();
    trailTex.star = new THREE.CanvasTexture(cv);
    return trailTex.star;
  }
  let trailLive = [], trailClock = 0;
  function updateTrail(dt) {
    const p = state.player, model = state.models[0];
    const tr = model && model.userData.trail;
    trailClock -= dt;
    if (tr && p.boost > 0 && trailClock <= 0 && trailLive.length < 40) {
      trailClock = 0.045;
      const sp = new THREE.Sprite(new THREE.SpriteMaterial({ map: trailTexture(tr.shape), transparent: true, depthWrite: false }));
      if (tr.color === 'rainbow') sp.material.color.setHSL((state.time * 1.4) % 1, 0.9, 0.62);
      else sp.material.color.set(tr.color);
      sp.position.set(p.x - Math.sin(p.angle) * 12 + (Math.random() - 0.5) * 6, p.y + 5 + Math.random() * 4, p.z - Math.cos(p.angle) * 12);
      scene.add(sp);
      trailLive.push({ sp, life: 0.6 });
    }
    for (let i = trailLive.length - 1; i >= 0; i--) {
      const t = trailLive[i];
      t.life -= dt;
      t.sp.material.opacity = Math.max(0, t.life / 0.6);
      const sc = 5 + (0.6 - t.life) * 8; t.sp.scale.set(sc, sc, 1);
      if (t.life <= 0) { scene.remove(t.sp); t.sp.material.dispose(); trailLive.splice(i, 1); }
    }
  }
  function clearTrail() { trailLive.forEach(t => { scene.remove(t.sp); t.sp.material.dispose(); }); trailLive = []; }
  function paintRainbow() {
    const m = state.models[0];
    if (!m || !m.userData.rainbow) return;
    const c = new THREE.Color().setHSL((state.time * 0.25) % 1, 0.75, 0.68);
    m.userData.body.material.color.copy(c); m.userData.nose.material.color.copy(c);
  }

  // ================== 코인 정산 ==================
  function settleCoins() {
    if (state.earned) return;
    const mode = MODES[state.modeIndex];
    const place = state.player.place;
    const bonus = mode.ai === 0 ? 5 : FINISH_COINS[Math.min(FINISH_COINS.length - 1, place - 1)];
    const picks = Math.min(40, state.coinPicks);
    state.earned = { picks, bonus };
    addCoins(state.garage, picks + bonus);
    saveGarage(state.garage);
    el('result-coins').textContent = '🪙 +' + (picks + bonus) + '  (주운 코인 ' + picks + ' · 순위 보너스 ' + bonus + ')  →  모은 코인 ' + state.garage.coins;
  }

  // ================== 그랑프리 ==================
  function startCup() {
    const cup = CUPS[state.cupIndex];
    const me = CHARACTERS[state.charIndex];
    const friends = shuffle(CHARACTERS.filter(c => c !== me)).slice(0, 3);
    const lineup = [me].concat(cup.villains.map(driverById), friends);
    state.gp = { cup, race: 0, lineup, points: lineup.map(() => 0), gain: lineup.map(() => 0) };
    state.trackIndex = TRACKS.findIndex(t => t.id === cup.tracks[0]);
    startRace();
  }
  function nextCupRace() {
    const g = state.gp;
    if (!g) { startRace(); return; }
    if (g.race >= g.cup.tracks.length - 1) { showPodium(); return; }
    g.race++;
    g.scored = false;
    state.trackIndex = TRACKS.findIndex(t => t.id === g.cup.tracks[g.race]);
    startRace();
  }
  function cupOrder() {
    const g = state.gp;
    return g.lineup.map((spec, i) => ({ spec, i, pts: g.points[i] }))
      .sort((a, b) => b.pts - a.pts || a.i - b.i);
  }
  function showCupStandings() {
    const g = state.gp;
    if (!g.scored) {
      g.gain = g.lineup.map(() => 0);
      state.results.forEach((k, place) => {
        const pts = POINTS[place] || 0;
        g.points[k.lineupIndex] += pts; g.gain[k.lineupIndex] = pts;
      });
      g.scored = true;
    }
    const last = g.race >= g.cup.tracks.length - 1;
    el('result-title').textContent = g.cup.icon + ' ' + g.cup.name + ' ' + (g.race + 1) + ' / ' + g.cup.tracks.length + ' · ' +
      state.player.place + '등!';
    const rows = el('result-rows');
    rows.innerHTML = '';
    cupOrder().forEach((r, i) => {
      const d = document.createElement('div');
      d.className = 'row' + (r.i === 0 ? ' me' : '');
      d.innerHTML = '<span>' + (i + 1) + '위</span><b>' + (r.spec.villain ? '😈 ' : '') + r.spec.name + '</b><em>' +
        r.pts + '점 <small>+' + g.gain[r.i] + '</small></em>';
      rows.appendChild(d);
    });
    el('result-best').textContent = last ? '마지막 경주 끝! 시상식으로 가요 🏆' : '다음 코스: ' + TRACKS.find(t => t.id === g.cup.tracks[g.race + 1]).name;
    el('again').style.display = 'none';
    el('next-race').style.display = '';
    el('next-race').textContent = last ? '시상식 🏆' : '다음 경주 ▶';
  }

  // ---- 시상대 ----
  function clearPodium() {
    if (state.podium) { removeAndDispose(state.podium.group); state.podium = null; }
    clearHearts();
  }
  function showPodium() {
    const g = state.gp;
    const order = cupOrder();
    const myPlace = order.findIndex(r => r.i === 0) + 1;
    const newBest = myPlace <= 3 && recordTrophy(state.garage, g.cup.id, myPlace);
    const bonus = myPlace <= 3 ? TROPHY_COINS[myPlace - 1] : 5;
    addCoins(state.garage, bonus);
    saveGarage(state.garage);

    // 첫 코스로 돌아가 출발선 앞에 시상대를 세운다
    clearRace();
    state.trackIndex = TRACKS.findIndex(t => t.id === g.cup.tracks[0]);
    const def = TRACKS[state.trackIndex];
    state.track = buildTrack(def);
    state.trackGroup = buildTrackMesh(state.track, scene);
    scene.background = new THREE.Color(def.sky);
    scene.fog = new THREE.Fog(def.fog, 420, 1900);
    const p0 = state.track.points[0];
    const ang = Math.atan2(p0.tx, p0.tz);
    const fx = Math.sin(ang), fz = Math.cos(ang);
    const cx = p0.x + fx * 50, cz = p0.z + fz * 50, cy = p0.y;
    const group = new THREE.Group();
    const heights = [16, 10, 6], sides = [0, -22, 22], cols = [0xffd34d, 0xdfe6f0, 0xe8a86b];
    order.slice(0, 3).forEach((r, i) => {
      const box = new THREE.Mesh(new THREE.BoxGeometry(20, heights[i], 20), new THREE.MeshLambertMaterial({ color: cols[i] }));
      const bx = cx + fz * sides[i], bz = cz - fx * sides[i];
      box.position.set(bx, cy + heights[i] / 2, bz); box.rotation.y = ang;
      group.add(box);
      const m = buildKartModel(r.spec);
      if (r.i === 0) applyLook(m, state.garage.equip);
      m.position.set(bx, cy + heights[i], bz); m.rotation.y = ang + Math.PI;
      m.scale.setScalar(0.8);
      group.add(m);
    });
    // 트로피
    const pts = [];
    for (let i = 0; i <= 10; i++) { const t = i / 10; pts.push(new THREE.Vector2(0.6 + Math.sin(t * Math.PI * 0.9) * 5.4 * (1 - t * 0.25), t * 10)); }
    const cupMesh = new THREE.Mesh(new THREE.LatheGeometry(pts, 20), new THREE.MeshLambertMaterial({ color: 0xffc83a, emissive: 0x5a3c00, side: THREE.DoubleSide }));
    const trophy = new THREE.Group();
    trophy.add(cupMesh);
    const stem = new THREE.Mesh(new THREE.CylinderGeometry(1, 3.2, 5, 12), cupMesh.material); stem.position.y = -2.5; trophy.add(stem);
    [-1, 1].forEach(sd => { const h = new THREE.Mesh(new THREE.TorusGeometry(2.4, 0.6, 6, 14), cupMesh.material); h.position.set(sd * 6, 6, 0); trophy.add(h); });
    trophy.position.set(cx, cy + 52, cz);
    group.add(trophy);
    scene.add(group);
    state.podium = { group, trophy, cx, cy, cz, ang, t: 0, confetti: 0 };
    state.scene = 'podium';
    showHud(false);
    audio.stopMusic(); audio.fanfare();

    const titles = ['', '🏆 ' + g.cup.name + ' 우승!', '🥈 ' + g.cup.name + ' 2등 트로피!', '🥉 ' + g.cup.name + ' 3등 트로피!'];
    el('podium-title').textContent = myPlace <= 3 ? titles[myPlace] : g.cup.name + ' 완주! 다음엔 트로피까지!';
    // 화면을 덜 가리게 1~3위와 내 줄만 보여 준다
    el('podium-rows').innerHTML = order.map((r, i) => (i < 3 || r.i === 0) &&
      '<div class="row' + (r.i === 0 ? ' me' : '') + '"><span>' + (MEDAL[i + 1] || (i + 1) + '위') + '</span><b>' + (r.spec.villain ? '😈 ' : '') +
      r.spec.name + '</b><em>' + r.pts + '점</em></div>').filter(Boolean).join('');
    let note = '🪙 트로피 보너스 +' + bonus + '  →  모은 코인 ' + state.garage.coins;
    if (newBest && myPlace === 1) {
      const unlock = g.cup.id === 'heart' ? '황금 색칠' : '황금 바퀴';
      note += '  ·  🎁 차고에 ' + unlock + '·왕관이 열렸어요!';
    }
    el('podium-note').textContent = note;
    el('podium').style.display = 'flex';
  }
  function updatePodium(dt) {
    const P = state.podium;
    if (!P) return;
    P.t += dt;
    P.trophy.rotation.y += dt * 1.4;
    P.trophy.position.y = P.cy + 36 + Math.sin(P.t * 2) * 2;
    const a = P.ang + Math.PI + Math.sin(P.t * 0.35) * 0.7;
    camera.position.lerp(new THREE.Vector3(P.cx + Math.sin(a) * 100, P.cy + 34, P.cz + Math.cos(a) * 100), 1 - Math.pow(0.05, dt));
    camera.lookAt(P.cx, P.cy - 6, P.cz);   // 시선을 낮춰 시상대가 화면 위쪽에 오게(아래는 결과 상자)
    P.confetti -= dt;
    if (P.confetti <= 0) {
      P.confetti = 0.35;
      spawnHearts({ x: P.cx + (Math.random() - 0.5) * 50, y: P.cy + 40, z: P.cz + (Math.random() - 0.5) * 50 });
    }
    updateHearts(dt);
  }
  function leavePodium() {
    el('podium').style.display = 'none';
    state.gp = null;
    state.menuStep = 0;
    showMenu();
  }
  el('podium-menu').addEventListener('click', leavePodium);
  el('podium-garage').addEventListener('click', () => { el('podium').style.display = 'none'; state.gp = null; state.menuStep = 0; showMenu(); openGarage(); });

  // ================== 메뉴 사진 ==================
  const thumbs = new Map();
  let thumbKit = null;
  function thumb(spec) {
    if (thumbs.has(spec.id)) return thumbs.get(spec.id);
    try {
      if (!thumbKit) {
        const cv = document.createElement('canvas');
        const r = new THREE.WebGLRenderer({ canvas: cv, antialias: true, alpha: true, preserveDrawingBuffer: true });
        r.setSize(200, 150, false);
        const sc = new THREE.Scene();
        sc.add(new THREE.HemisphereLight(0xffffff, 0xd8d0e0, 1.15));
        const sun = new THREE.DirectionalLight(0xffffff, 0.9); sun.position.set(30, 60, 50); sc.add(sun);
        const cam = new THREE.PerspectiveCamera(34, 200 / 150, 1, 400);
        cam.position.set(26, 24, 44); cam.lookAt(0, 10, 0);
        thumbKit = { r, sc, cam, cv };
      }
      const m = buildKartModel(spec);
      m.rotation.y = 0.5;
      thumbKit.sc.add(m);
      thumbKit.r.render(thumbKit.sc, thumbKit.cam);
      const url = thumbKit.cv.toDataURL('image/png');
      thumbKit.sc.remove(m); disposeTree(m);
      thumbs.set(spec.id, url);
      return url;
    } catch (_) { return ''; }
  }

  // ================== 차고 ==================
  let garageKit = null, garageSlot = 'paint';
  function garagePreview() {
    if (!garageKit) {
      const cv = el('garage-view');
      const r = new THREE.WebGLRenderer({ canvas: cv, antialias: true, alpha: true });
      const sc = new THREE.Scene();
      sc.add(new THREE.HemisphereLight(0xffffff, 0xd8d0e0, 1.1));
      const sun = new THREE.DirectionalLight(0xffffff, 0.9); sun.position.set(30, 60, 50); sc.add(sun);
      const cam = new THREE.PerspectiveCamera(32, 1, 1, 400);
      cam.position.set(0, 26, 58); cam.lookAt(0, 11, 0);
      garageKit = { r, sc, cam, model: null };
    }
    const w = el('garage-view').clientWidth || 300, h = el('garage-view').clientHeight || 240;
    garageKit.r.setPixelRatio(Math.min(2, window.devicePixelRatio || 1));
    garageKit.r.setSize(w, h, false);
    garageKit.cam.aspect = w / h; garageKit.cam.updateProjectionMatrix();
    if (garageKit.model) { garageKit.sc.remove(garageKit.model); disposeTree(garageKit.model); }
    const m = buildKartModel(CHARACTERS[state.charIndex]);
    applyLook(m, state.garage.equip);
    garageKit.sc.add(m);
    garageKit.model = m;
  }
  function renderGarage() {
    const g = state.garage;
    el('garage-coins').textContent = '🪙 ' + g.coins;
    el('garage-tabs').innerHTML = '';
    SLOTS.forEach(sl => {
      const b = document.createElement('button');
      b.className = 'tab' + (sl.id === garageSlot ? ' on' : '');
      b.textContent = sl.name;
      b.addEventListener('click', () => { garageSlot = sl.id; renderGarage(); });
      el('garage-tabs').appendChild(b);
    });
    const grid = el('garage-grid');
    grid.innerHTML = '';
    CATALOG[garageSlot].forEach(item => {
      const st = itemState(g, garageSlot, item.id);
      const b = document.createElement('button');
      b.className = 'gitem ' + st;
      const sw = item.rainbow || item.color === 'rainbow' ? '<i class="sw rb"></i>'
        : typeof item.color === 'number' ? '<i class="sw" style="background:#' + item.color.toString(16).padStart(6, '0') + '"></i>'
        : typeof item.color === 'string' ? '<i class="sw" style="background:' + item.color + '"></i>'
        : item.tire != null ? '<i class="sw" style="background:#' + item.tire.toString(16).padStart(6, '0') + '"></i>' : '';
      const tag = st === 'equipped' ? '✓ 쓰는 중' : st === 'owned' ? '쓰기' : st === 'locked'
        ? (item.need === 'heart' ? '🏆 하트 컵 우승' : item.need === 'star' ? '🏆 별 컵 우승' : '🏆 컵 우승') : '🪙 ' + item.price;
      b.innerHTML = sw + '<strong>' + item.name + '</strong><small>' + tag + '</small>';
      b.addEventListener('click', () => {
        const r = tapItem(g, garageSlot, item.id);
        if (r === 'bought' || r === 'equipped') {
          saveGarage(g);
          audio.sfx(r === 'bought' ? 'coin' : 'pickup');
          garagePreview();
        } else if (r === 'poor') {
          el('garage-msg').textContent = '코인이 ' + (item.price - g.coins) + '개 더 필요해요. 경주에서 모아 와요!';
        }
        renderGarage();
      });
      grid.appendChild(b);
    });
  }
  function openGarage() {
    menu.style.display = 'none';
    el('garage').style.display = 'flex';
    el('garage-msg').textContent = CHARACTERS[state.charIndex].name + '의 카트예요. 누르면 사서 바로 끼워요.';
    state.scene = 'garage';
    garagePreview();
    renderGarage();
  }
  function closeGarage() {
    el('garage').style.display = 'none';
    if (garageKit && garageKit.model) { garageKit.sc.remove(garageKit.model); disposeTree(garageKit.model); garageKit.model = null; }
    state.menuStep = 0;
    showMenu();
  }
  el('garage-open').addEventListener('click', openGarage);
  el('garage-close').addEventListener('click', closeGarage);

  // ---------- 루프 ----------
  let last = 0;
  function frame(now) {
    requestAnimationFrame(frame);
    const dt = Math.min(0.05, (now - last) / 1000 || 0);
    last = now;
    if (state.scene === 'podium') updatePodium(dt);
    else update(dt);
    if (state.scene === 'garage') {
      if (garageKit && garageKit.model) {
        garageKit.model.rotation.y += dt * 0.8;
        const m = garageKit.model;
        if (m.userData.rainbow) {
          const c = new THREE.Color().setHSL((now / 4000) % 1, 0.75, 0.68);
          m.userData.body.material.color.copy(c); m.userData.nose.material.color.copy(c);
        }
        garageKit.r.render(garageKit.sc, garageKit.cam);
      }
      return;
    }
    if (state.scene !== 'menu' || state.track) renderer.render(scene, camera);
  }

  // 메뉴 배경으로 첫 트랙을 미리 깔아 둔다
  state.track = buildTrack(TRACKS[0]);
  state.trackGroup = buildTrackMesh(state.track, scene);
  scene.background = new THREE.Color(TRACKS[0].sky);
  scene.fog = new THREE.Fog(TRACKS[0].fog, 420, 1900);
  camera.position.set(0, 160, -560);
  camera.lookAt(0, 0, 0);

  showMenu();
  requestAnimationFrame(frame);

  // 자동 검증용 훅
  window.__game = {
    state, startRace, update, renderer, scene, camera,
    step(dt) { update(dt); },
    render() { renderer.render(scene, camera); },
    press(c) { keys[c] = true; },
    autopilot(on) { state.autopilot = !!on; },
    release(c) { keys[c] = false; },
    pick(char, track, mode) { state.charIndex = char; state.trackIndex = track; state.modeIndex = mode; },
    rivalRecord, modeVisible, renderMenu, nextStep, settleRival, driveAI,
    startCup, nextCupRace, showPodium, openGarage, closeGarage, onFx, updateVillains, CUPS,
    get fx() { return state.fx; }
  };
}
