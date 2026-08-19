// 산리오 카트 3D — 게임 진행: 메뉴 → 레이스 → 결과
import * as THREE from '../vendor/three.module.min.js';
import { TRACKS, buildTrack } from './tracks.js';
import { buildTrackMesh } from './trackmesh.js';
import { createAudio } from './music.js';
import { CHARACTERS, buildKartModel, Kart, driveAI } from './karts.js';
import {
  ITEM_TYPES, rollItem, useItem, applyMagnet,
  makeItemBoxMesh, makeBananaMesh, makeBombMesh, makeShieldMesh
} from './items.js';

export const MODES = [
  { id: 'battle', name: '아이템 배틀', desc: '⭐ 추천 · 상자를 먹고 아이템 발사!', ai: 3, items: true },
  { id: 'speed',  name: '스피드 매치', desc: '아이템 없이 순수 속도 대결',        ai: 3, items: false },
  { id: 'time',   name: '타임어택',   desc: '혼자 달리며 최고 기록 도전',        ai: 0, items: false }
];

const el = id => document.getElementById(id);

export function startGame() {
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
    scene: 'menu', menuStep: 0,        // 0 캐릭터 1 트랙 2 모드
    charIndex: 0, trackIndex: 0, modeIndex: 0,
    track: null, trackGroup: null,
    karts: [], models: [], player: null,
    boxes: [], projectiles: [], projMeshes: [], extraMeshes: [],
    raceTime: 0, countdown: 0, lapStart: 0, bestLap: null, myBest: null,
    results: [], finishDelay: 0, finishSide: 0, time: 0
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
    state.boxes.forEach(b => removeAndDispose(b.mesh));
    state.projMeshes.forEach(removeAndDispose);
    state.extraMeshes.forEach(removeAndDispose);
    state.models = []; state.boxes = []; state.projectiles = []; state.projMeshes = [];
    state.extraMeshes = []; state.karts = [];
  }

  function bestKey() {
    return 'sanrio-kart3d:' + TRACKS[state.trackIndex].id + ':' + MODES[state.modeIndex].id;
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

    const order = [state.charIndex].concat(
      CHARACTERS.map((_, i) => i).filter(i => i !== state.charIndex));
    const count = 1 + mode.ai;
    const p0 = state.track.points[0];
    const startAngle = Math.atan2(p0.tx, p0.tz);
    for (let slot = 0; slot < count; slot++) {
      const spec = CHARACTERS[order[slot % CHARACTERS.length]];
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
      k.total = k.progress;
      state.karts.push(k);
      const model = buildKartModel(spec);
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

    state.raceTime = 0;
    state.countdown = 3.6;
    state.lapStart = 0;
    state.myBest = null;
    state.results = [];
    state.finishDelay = 0;
    state.finishSide = 0;
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
      const boostMult = behind > 55 ? Math.min(1.14, 1 + (behind - 55) / 620) : 1;
      state.player.baseTop = state.player.spec.top * boostMult;
    }

    for (const k of state.karts) {
      if (k.finished) { k.speed *= 1 - dt * 1.5; continue; }
      const drive = k.isPlayer ? input : driveAI(k, state.player.total);
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
      if (p.kind === 'bomb') { p.vx *= 1 - dt * 0.5; p.vz *= 1 - dt * 0.5; }
      p.y = state.track.sample(p.x, p.z).y + (p.kind === 'bomb' ? 6 : 2);
      p.mesh.position.set(p.x, p.y, p.z);
      p.mesh.rotation.y += dt * 4;

      let hit = false;
      if (p.armed <= 0) {
        for (const k of state.karts) {
          if (k.finished || (p.kind === 'bomb' && k === p.owner)) continue;
          if (p.kind === 'banana' && k === p.owner && p.life > 29) continue;
          if (Math.hypot(k.x - p.x, k.z - p.z) < 13) {
            if (k.shield > 0) { k.shield = 0; }
            else { k.spin = 1.0; k.speed *= 0.45; }
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

  function spawnProjectile(p) {
    p.mesh = p.kind === 'banana' ? makeBananaMesh() : makeBombMesh();
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

  let sfxPrev = null;
  function watchSfx() {
    const p = state.player;
    const now = {
      boost: p.boost > 0, spin: p.spin > 0, air: p.airborne,
      item: !!p.item, lap: p.lap
    };
    const q = sfxPrev;
    if (q) {
      if (now.spin && !q.spin) audio.sfx('hit');
      else if (now.boost && !q.boost) audio.sfx('boost');
      if (now.air && !q.air) audio.sfx('jump');
      if (!now.air && q.air) audio.sfx('land');
      if (now.item && !q.item) audio.sfx('pickup');
      if (!now.item && q.item) audio.sfx('use');
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
    el('lap').textContent = Math.min(state.track.laps, p.lap + 1) + ' / ' + state.track.laps;
    el('place').textContent = MODES[state.modeIndex].ai ? p.place + '등' : '혼자';
    el('timer').textContent = fmt(state.raceTime);
    el('best').textContent = state.bestLap ? '최고 ' + fmt(state.bestLap) : '';
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
      g.fillStyle = k.isPlayer ? '#ff3d7a' : '#6b5b78';
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

  function renderMenu() {
    const steps = ['캐릭터를 골라요', '트랙을 골라요', '모드를 골라요'];
    el('menu-title').textContent = steps[state.menuStep];
    const list = el('menu-list');
    list.innerHTML = '';
    const items = state.menuStep === 0 ? CHARACTERS
      : state.menuStep === 1 ? TRACKS : MODES;
    const sel = state.menuStep === 0 ? state.charIndex
      : state.menuStep === 1 ? state.trackIndex : state.modeIndex;
    items.forEach((it, i) => {
      const b = document.createElement('button');
      b.className = 'card' + (i === sel ? ' on' : '');
      const sub = state.menuStep === 0
        ? '속도 ' + '★'.repeat(Math.max(1, Math.round((it.top - 106) / 5)))
        : state.menuStep === 1 ? it.laps + '바퀴 · ' + (it.tip || '') : it.desc;
      b.innerHTML = '<strong>' + it.name + '</strong><small>' + sub + '</small>';
      b.addEventListener('click', () => {
        if (state.menuStep === 0) state.charIndex = i;
        else if (state.menuStep === 1) state.trackIndex = i;
        else state.modeIndex = i;
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
  }

  function nextStep() {
    if (state.menuStep < 2) { state.menuStep++; renderMenu(); }
    else { menu.style.display = 'none'; startRace(); }
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
    el('result-title').textContent = solo ? '완주했어요!' :
      (p.place === 1 ? '1등! 최고예요!' : '완주했어요!');
    const rows = el('result-rows');
    rows.innerHTML = '';
    state.results.forEach((k, i) => {
      const d = document.createElement('div');
      d.className = 'row' + (k.isPlayer ? ' me' : '');
      d.innerHTML = '<span>' + (i + 1) + '등</span><b>' + k.spec.name + '</b><em>' +
        fmt(k.finishTime) + '</em>';
      rows.appendChild(d);
    });
    el('result-best').textContent = state.myBest
      ? '내 최고 바퀴 ' + fmt(state.myBest) + (state.bestLap === state.myBest ? '  🎉 신기록!' : '')
      : '';
  }

  el('again').addEventListener('click', () => { el('result').style.display = 'none'; startRace(); });
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

  el('to-menu').addEventListener('click', () => { state.menuStep = 0; audio.stopMusic(); showMenu(); });

  // ---------- 조작 ----------
  window.addEventListener('keydown', e => {
    if (e.code === 'Space' && !keys.Space && !e.repeat) jumpEdge = true;
    keys[e.code] = true;
    if (['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', 'Space', 'Enter'].includes(e.code)) e.preventDefault();
    if (state.scene === 'menu') {
      const items = state.menuStep === 0 ? CHARACTERS : state.menuStep === 1 ? TRACKS : MODES;
      const key = state.menuStep === 0 ? 'charIndex' : state.menuStep === 1 ? 'trackIndex' : 'modeIndex';
      if (e.code === 'ArrowLeft') { state[key] = (state[key] + items.length - 1) % items.length; renderMenu(); }
      if (e.code === 'ArrowRight') { state[key] = (state[key] + 1) % items.length; renderMenu(); }
      if (e.code === 'Space' || e.code === 'Enter') nextStep();
      if (e.code === 'Escape' && state.menuStep > 0) { state.menuStep--; renderMenu(); }
    } else if (state.scene === 'result') {
      if (e.code === 'Space' || e.code === 'Enter') { el('result').style.display = 'none'; startRace(); }
      if (e.code === 'Escape') { state.menuStep = 0; showMenu(); }
    } else if (state.scene === 'race' && e.code === 'Escape') {
      state.menuStep = 0; audio.stopMusic(); showMenu(); clearRace();
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

  // ---------- 루프 ----------
  let last = 0;
  function frame(now) {
    requestAnimationFrame(frame);
    const dt = Math.min(0.05, (now - last) / 1000 || 0);
    last = now;
    update(dt);
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
    release(c) { keys[c] = false; },
    pick(char, track, mode) { state.charIndex = char; state.trackIndex = track; state.modeIndex = mode; }
  };
}
