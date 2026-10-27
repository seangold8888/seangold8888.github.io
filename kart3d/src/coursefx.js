// 산리오 카트 3D — 달리는 동안 할 거리: 부스트 발판, 코인, 코스마다 다른 장애물, 무지개 링
// 자리는 트랙 진행 비율(t)로 정하되 점프대·아이템 상자·출발선과 겹치지 않게 자동으로 비킨다.
// 모든 카트(AI 포함)에 똑같이 적용된다. 결과(효과음·말풍선)는 onEvent 로 알린다.
import * as THREE from '../vendor/three.module.min.js';
import { makeSnowObstacle, buildIceMesh } from './snowland.js?v=snow-1';

// 코스별 장애물 주제
//  roll  : 옆으로 왔다 갔다 하는 것(찻잔·사탕 공·꽃게). 부딪히면 빙글(방패로 막힘)
//  bounce: 밟으면 통 튀어 오르는 것(구름·별 쿠션·선물 상자). 벌이 아니라 재미 — 살짝 부스터까지
//  stand : 길 한쪽에 버티고 선 것(눈사람). 반대쪽으로 비켜 가거나 점프로 넘는다
// 눈꽃 마을은 장애물을 종류별로 자리까지 정해 둔다(obstacles). 얼음길(ice)은 조향이 미끄럽고,
// 부스트 줄(padChain)은 점프대 바로 앞에 발판 셋을 이어 붙여 큰 점프를 만든다.
export const COURSE_FX = {
  park:    { obstacle: 'cup',    rings: 0 },
  cloud:   { obstacle: 'cloud',  rings: 2 },
  candy:   { obstacle: 'candy',  rings: 0 },
  beach:   { obstacle: 'crab',   rings: 1 },
  night:   { obstacle: 'star',   rings: 2 },
  rainbow: { obstacle: 'cup',    rings: 3 },
  snow: {
    rings: 0,
    pads: [0.1, 0.6, 0.9],
    padChain: [0.364, 0.374, 0.384],          // 썰매 비탈 → 0.40 점프대
    obstacles: [
      { kind: 'snowball', t: 0.27 },
      { kind: 'gift', t: 0.55, side: 1 },
      { kind: 'snowman', t: 0.64, side: -1 },
      { kind: 'snowman', t: 0.79, side: 1 },
      { kind: 'snowball', t: 0.95 }
    ],
    // 얼음길은 아이템 상자(1/8 간격) 바로 뒤를 피한다 — 거기엔 바나나가 잘 깔려서 미끄러지며 연달아 맞는다
    ice: [[0.115, 0.135], [0.49, 0.52], [0.862, 0.887]]
  }
};
const ROLLERS = { cup: true, candy: true, crab: true, snowball: true };
const STANDERS = { snowman: true };
const SNOWY = { snowball: true, snowman: true, gift: true };

const UP = new THREE.Vector3(0, 1, 0);

// 아이템 상자와 같은 자리 계산(game.js 와 맞춘다)
const BOX_T = Array.from({ length: 8 }, (_, s) => (s + 0.5) / 8);

// 캔버스 텍스처는 한 번만 만든다. 경주를 끝낼 때 재질만 dispose 되므로 판마다 새로 만들면 쌓인다.
let padTexShared = null, candyTexShared = null;

export function buildCourseFx(track) {
  const def = track.def;
  const cfg = COURSE_FX[def.id] || { obstacle: 'cup', rings: 0 };
  const N = track.points.length;
  const HALF = def.roadHalf;
  const group = new THREE.Group();
  group.name = 'coursefx';

  const taken = [0, 0.985].concat((def.ramps || []), BOX_T, cfg.padChain || []);
  function spot(target, gap) {
    // target 근처에서 다른 것과 gap 이상 떨어진 자리를 찾는다
    for (let k = 0; k < 40; k++) {
      const off = (k % 2 ? 1 : -1) * Math.ceil(k / 2) * 0.006;
      const t = ((target + off) % 1 + 1) % 1;
      if (taken.every(u => Math.min(Math.abs(u - t), 1 - Math.abs(u - t)) >= gap)) { taken.push(t); return t; }
    }
    taken.push(target); return target;
  }
  function frame(t) {
    const p = track.points[Math.floor(t * N) % N];
    const tan = new THREE.Vector3(p.tx, p.ty, p.tz).normalize();
    const side = new THREE.Vector3().crossVectors(tan, UP).normalize();
    return { p, tan, side };
  }
  function place(obj, t, lateral) {
    const f = frame(t);
    obj.position.set(f.p.x, f.p.y, f.p.z).addScaledVector(f.side, lateral);
    obj.rotation.y = Math.atan2(f.tan.x, f.tan.z);
    return f;
  }

  // ---------- 부스트 발판 ----------
  const padTex = padTexShared || (padTexShared = makePadTexture());
  const pads = [];
  function addPad(t, lateral, halfWidth) {
    const m = new THREE.Mesh(new THREE.PlaneGeometry(halfWidth * 1.78, 26),
      new THREE.MeshBasicMaterial({ map: padTex, transparent: true, depthWrite: false }));
    m.rotation.x = -Math.PI / 2;
    const holder = new THREE.Group();
    const f = place(holder, t, lateral);
    holder.position.y += 0.7;
    holder.add(m);
    group.add(holder);
    pads.push({ x: holder.position.x, z: holder.position.z, y: f.p.y, r: halfWidth, len: 14, ang: holder.rotation.y });
  }
  (cfg.pads || [0.1, 0.36, 0.6, 0.86]).forEach((target, i) => {
    addPad(spot(target, 0.03), (i % 2 ? 1 : -1) * HALF * 0.42, HALF * 0.42);
  });
  // 부스트 줄: 길 한가운데 넓게, 누구나 밟고 점프대로 날아오른다
  (cfg.padChain || []).forEach(t => addPad(t, 0, HALF * 0.8));

  // ---------- 코인 ----------
  const coins = [];
  const coinSpots = [];
  const lanes = [0, -0.5, 0.5, 0, -0.35, 0.35];
  [0.16, 0.29, 0.47, 0.72, 0.91].forEach((target, i) => {
    const t = spot(target, 0.02);
    for (let c = 0; c < 5; c++) {
      const tt = (t + c * 0.006) % 1;
      const f = frame(tt);
      const wiggle = i % 2 ? Math.sin(c * 0.9) * HALF * 0.25 : 0;
      const pos = new THREE.Vector3(f.p.x, f.p.y + 6, f.p.z).addScaledVector(f.side, lanes[i % lanes.length] * HALF + wiggle);
      coinSpots.push(pos);
    }
  });
  // 점프대 위 하늘 코인 — 점프해서 먹는 재미
  (def.ramps || []).forEach(rt => {
    for (let c = 1; c <= 4; c++) {
      const tt = (rt + c * 0.012) % 1;
      const f = frame(tt);
      const arc = Math.sin(c / 5 * Math.PI) * 26;
      coinSpots.push(new THREE.Vector3(f.p.x, f.p.y + 8 + arc, f.p.z));
    }
  });
  const coinGeo = new THREE.CylinderGeometry(3.4, 3.4, 0.9, 16);
  coinGeo.rotateX(Math.PI / 2);
  const coinMesh = new THREE.InstancedMesh(coinGeo,
    new THREE.MeshLambertMaterial({ color: 0xffcf3a, emissive: 0x7a5200 }), coinSpots.length);
  coinSpots.forEach((v, i) => coins.push({ i, x: v.x, y: v.y, z: v.z, alive: true, respawn: 0 }));
  group.add(coinMesh);
  const dummy = new THREE.Object3D();
  function paintCoins(time) {
    coins.forEach(c => {
      dummy.position.set(c.x, c.y + Math.sin(time * 3 + c.i) * 0.8, c.z);
      dummy.rotation.set(0, time * 3 + c.i * 0.4, 0);
      dummy.scale.setScalar(c.alive ? 1 : 0.0001);
      dummy.updateMatrix(); coinMesh.setMatrixAt(c.i, dummy.matrix);
    });
    coinMesh.instanceMatrix.needsUpdate = true;
  }

  // ---------- 장애물 ----------
  const obstacles = [];
  const obstacleList = cfg.obstacles || [0.24, 0.54, 0.8].map(t => ({ kind: cfg.obstacle, t }));
  obstacleList.forEach((ob, i) => {
    const t = spot(ob.t, 0.03);
    const kind = ob.kind;
    const holder = new THREE.Group();
    const f = place(holder, t, 0);
    const mesh = SNOWY[kind] ? makeSnowObstacle(kind) : makeObstacle(kind);
    holder.add(mesh);
    group.add(holder);
    const side = ob.side || (i % 2 ? 1 : -1);
    obstacles.push({
      kind, roller: !!ROLLERS[kind], stand: !!STANDERS[kind], holder, mesh,
      cx: f.p.x, cz: f.p.z, y: f.p.y, sx: f.side.x, sz: f.side.z,
      phase: i * 2.1, lateral: ROLLERS[kind] ? 0 : side * HALF * (STANDERS[kind] ? 0.42 : 0.38),
      x: f.p.x, z: f.p.z, r: kind === 'crab' ? 10 : kind === 'snowman' ? 9 : 12, squash: 0
    });
  });

  // ---------- 얼음길 ----------
  let ice = null;
  if (cfg.ice && cfg.ice.length) {
    ice = buildIceMesh(track, cfg.ice);
    group.add(ice.mesh);
  }

  // ---------- 무지개 링 ----------
  const rings = [];
  const ringTargets = [0.42, 0.68, 0.2].slice(0, cfg.rings);
  ringTargets.forEach((target, i) => {
    const t = spot(target, 0.03);
    const holder = new THREE.Group();
    const lateral = (i % 2 ? 1 : -1) * HALF * 0.34;
    const f = place(holder, t, lateral);
    const colors = [0xff7aa8, 0xffd34d, 0x7fe0c4, 0x7fb8ff];
    colors.forEach((col, k) => {
      const tor = new THREE.Mesh(new THREE.TorusGeometry(13 - k * 1.3, 0.65, 8, 30),
        new THREE.MeshBasicMaterial({ color: col }));
      tor.position.y = 15;
      holder.add(tor);
    });
    group.add(holder);
    rings.push({ x: holder.position.x, z: holder.position.z, y: f.p.y, holder, r: 11 });
  });

  // ---------- 매 프레임 ----------
  function update(dt, karts, time, onEvent) {
    padTex.offset.y = -(time * 1.6) % 1;
    paintCoins(time);

    obstacles.forEach(o => {
      if (o.roller) {
        const s = Math.sin(time * 0.95 + o.phase) * HALF * 0.66;
        o.x = o.cx + o.sx * s; o.z = o.cz + o.sz * s;
        o.holder.position.set(o.x, o.y, o.z);
        o.mesh.rotation.y += dt * (o.kind === 'cup' ? 3.2 : 0);
        if (o.kind === 'candy') o.mesh.rotation.z = -s / 9;
        if (o.kind === 'crab') o.mesh.position.y = Math.abs(Math.sin(time * 9 + o.phase)) * 1.2;
        // 눈덩이는 옆으로 가는 만큼 진짜로 굴러간다(반지름 11)
        if (o.kind === 'snowball') o.mesh.userData.spinner.rotation.z = s / 11;
      } else if (o.stand) {
        o.x = o.cx + o.sx * o.lateral; o.z = o.cz + o.sz * o.lateral;
        o.holder.position.set(o.x, o.y, o.z);
        // 부딪히면 잠깐 찌그러졌다 돌아온다. 평소엔 살랑살랑
        o.squash = Math.max(0, o.squash - dt * 2.5);
        const sq = 1 - o.squash * 0.35;
        o.mesh.scale.set(1 + o.squash * 0.25, sq, 1 + o.squash * 0.25);
        o.mesh.rotation.z = Math.sin(time * 2.2 + o.phase) * 0.06;
      } else {
        o.x = o.cx + o.sx * o.lateral; o.z = o.cz + o.sz * o.lateral;
        o.holder.position.set(o.x, o.y, o.z);
        const sq = 1 + Math.sin(time * 4 + o.phase) * 0.06;
        o.mesh.scale.set(1 / sq, sq, 1 / sq);
      }
    });
    rings.forEach((r, i) => { r.holder.children.forEach((t, k) => { t.rotation.z = time * (0.6 + k * 0.2) * (i % 2 ? -1 : 1); }); });

    coins.forEach(c => {
      if (c.alive) return;
      c.respawn -= dt;
      if (c.respawn <= 0) c.alive = true;
    });

    for (const k of karts) {
      k.fxCool = k.fxCool || {};
      for (const key in k.fxCool) k.fxCool[key] = Math.max(0, k.fxCool[key] - dt);

      // 코인
      for (const c of coins) {
        if (!c.alive) continue;
        if (Math.abs(k.x - c.x) > 12 || Math.abs(k.z - c.z) > 12) continue;
        if (Math.hypot(k.x - c.x, k.z - c.z) < 10 && Math.abs(k.y + 7 - c.y) < 14) {
          c.alive = false; c.respawn = 9;
          k.coins = Math.min(99, (k.coins || 0) + 1);
          onEvent('coin', k);
        }
      }
      if (k.finished) continue;

      // 부스트 발판(발판 방향으로 길쭉한 직사각형)
      if (!k.airborne) {
        for (let i = 0; i < pads.length; i++) {
          const p = pads[i];
          const dx = k.x - p.x, dz = k.z - p.z;
          const along = dx * Math.sin(p.ang) + dz * Math.cos(p.ang);
          const across = dx * Math.cos(p.ang) - dz * Math.sin(p.ang);
          if (Math.abs(along) < p.len && Math.abs(across) < p.r * 0.95 && !k.fxCool['pad' + i]) {
            k.fxCool['pad' + i] = 1.2;
            k.boost = Math.max(k.boost, 1.1);
            onEvent('pad', k);
          }
        }
      }

      // 장애물
      obstacles.forEach((o, i) => {
        if (k.fxCool['ob' + i]) return;
        if (Math.hypot(k.x - o.x, k.z - o.z) > o.r + 7) return;
        if (o.roller || o.stand) {
          if (k.airborne && k.y > o.y + 9) return;          // 점프로 넘으면 무사
          k.fxCool['ob' + i] = 1.4;
          if (o.stand) {
            // 눈사람은 움직이지 않으니, 부딪힌 카트를 바깥으로 밀어내야 같은 자리에서 또 부딪히지 않는다
            o.squash = 1;
            const dx = k.x - o.x, dz = k.z - o.z, d = Math.hypot(dx, dz) || 1;
            k.x = o.x + dx / d * (o.r + 8); k.z = o.z + dz / d * (o.r + 8);
          }
          if (k.shield > 0) { k.shield = 0; onEvent('block', k); return; }
          // 눈사람은 딱 한 바퀴(8 rad/s × 0.785초 = 2π) 돌고 원래 방향을 본다
          k.spin = o.kind === 'crab' ? 0.55 : o.kind === 'snowman' ? Math.PI * 2 / 8 : 0.75;
          k.speed *= o.kind === 'snowman' ? 0.6 : 0.55;
          onEvent('bonk', k, o.kind);
        } else {
          if (k.airborne) return;
          k.fxCool['ob' + i] = 1.0;
          k.airborne = true; k.vy = 96;
          k.boost = Math.max(k.boost, 0.5);
          k.trickWindow = 0.55;
          if (o.kind === 'gift') {                         // 선물 상자는 코인 하나를 덤으로 준다
            k.coins = Math.min(99, (k.coins || 0) + 1);
            onEvent('gift', k);
          } else onEvent('bounce', k);
        }
      });

      // 얼음길: 밟고 있는 동안(그리고 아주 잠깐 뒤까지) 조향이 덜 먹고 옆으로 미끄러진다.
      // 실제 미끄러짐은 karts.js 가 k.ice 를 보고 처리한다.
      if (ice && !k.airborne) {
        const near = track.nearest(k.x, k.z);
        if (near.dist < HALF) {
          ice.ranges.forEach((r, j) => {
            if (near.index < r.i0 || near.index > r.i1) return;
            k.ice = 0.15;
            if (!k.fxCool['ice' + j]) { k.fxCool['ice' + j] = 4; onEvent('ice', k); }
          });
        }
      }

      // 무지개 링
      rings.forEach((r, i) => {
        if (k.fxCool['ring' + i]) return;
        if (Math.hypot(k.x - r.x, k.z - r.z) < r.r) {
          k.fxCool['ring' + i] = 2;
          k.boost = Math.max(k.boost, 1.2);
          onEvent('ring', k);
        }
      });
    }
  }

  function reset() { coins.forEach(c => { c.alive = true; c.respawn = 0; }); }

  paintCoins(0);
  return { group, update, reset, pads, coins, obstacles, rings, taken, ice: ice ? ice.ranges : [] };
}

// ---------- 모양 ----------
function makePadTexture() {
  const S = 128, cv = document.createElement('canvas');
  cv.width = S; cv.height = S * 2;
  const c = cv.getContext('2d');
  const g = c.createLinearGradient(0, 0, S, 0);
  g.addColorStop(0, 'rgba(255,140,60,0.92)'); g.addColorStop(0.5, 'rgba(255,215,80,0.95)'); g.addColorStop(1, 'rgba(255,140,60,0.92)');
  c.fillStyle = g; c.fillRect(0, 0, S, S * 2);
  c.fillStyle = 'rgba(255,255,255,0.9)';
  for (let k = 0; k < 2; k++) {
    const y = k * S;
    // 캔버스 아래쪽이 진행 방향(평면을 눕히면 텍스처 위쪽이 뒤를 향한다)
    c.beginPath(); c.moveTo(S * 0.18, y + S * 0.28); c.lineTo(S * 0.5, y + S * 0.7); c.lineTo(S * 0.82, y + S * 0.28);
    c.lineTo(S * 0.68, y + S * 0.28); c.lineTo(S * 0.5, y + S * 0.5); c.lineTo(S * 0.32, y + S * 0.28); c.closePath(); c.fill();
  }
  const tex = new THREE.CanvasTexture(cv);
  tex.wrapS = THREE.RepeatWrapping; tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(1, 2);
  return tex;
}

function makeObstacle(kind) {
  const g = new THREE.Group();
  const mat = c => new THREE.MeshLambertMaterial({ color: c });
  if (kind === 'cup') {                           // 빙글빙글 찻잔
    const cup = new THREE.Mesh(new THREE.CylinderGeometry(10, 7, 9, 18, 1, true), mat(0xff9ec4));
    cup.material.side = THREE.DoubleSide; cup.position.y = 6; g.add(cup);
    const base = new THREE.Mesh(new THREE.CylinderGeometry(7, 7, 1.2, 18), mat(0xffffff)); base.position.y = 1.6; g.add(base);
    const rim = new THREE.Mesh(new THREE.TorusGeometry(10, 0.9, 6, 24), mat(0xffffff)); rim.rotation.x = Math.PI / 2; rim.position.y = 10.5; g.add(rim);
    const handle = new THREE.Mesh(new THREE.TorusGeometry(3, 0.9, 6, 12), mat(0xffffff)); handle.position.set(10.5, 6, 0); g.add(handle);
    [0xff5c8a, 0x7fe0c4, 0xffd34d].forEach((col, i) => {
      const dot = new THREE.Mesh(new THREE.SphereGeometry(1.3, 8, 6), mat(col));
      const a = i * 2.1; dot.position.set(Math.cos(a) * 8.9, 6, Math.sin(a) * 8.9); g.add(dot);
    });
  } else if (kind === 'candy') {                  // 굴러다니는 사탕 공
    if (!candyTexShared) {
      const cv = document.createElement('canvas'); cv.width = 64; cv.height = 64;
      const c = cv.getContext('2d');
      for (let i = 0; i < 8; i++) { c.fillStyle = i % 2 ? '#ffffff' : '#ff5c8a'; c.fillRect(i * 8, 0, 8, 64); }
      candyTexShared = new THREE.CanvasTexture(cv);
    }
    const tex = candyTexShared;
    const ball = new THREE.Mesh(new THREE.SphereGeometry(10, 18, 14), new THREE.MeshLambertMaterial({ map: tex }));
    ball.position.y = 10; g.add(ball);
  } else if (kind === 'crab') {                   // 옆걸음 꽃게
    const body = new THREE.Mesh(new THREE.SphereGeometry(7, 14, 10), mat(0xff6b4a));
    body.scale.set(1.3, 0.65, 1); body.position.y = 5; g.add(body);
    [-1, 1].forEach(s => {
      const claw = new THREE.Mesh(new THREE.SphereGeometry(2.8, 10, 8), mat(0xff6b4a));
      claw.scale.set(1, 0.8, 1.3); claw.position.set(s * 10, 7, 3); g.add(claw);
      const eye = new THREE.Mesh(new THREE.SphereGeometry(1.3, 8, 6), mat(0xffffff));
      eye.position.set(s * 2.2, 10, 3); g.add(eye);
      const pupil = new THREE.Mesh(new THREE.SphereGeometry(0.6, 6, 5), mat(0x2b2b3a));
      pupil.position.set(s * 2.2, 10.2, 4.1); g.add(pupil);
    });
  } else if (kind === 'cloud') {                  // 통통 구름 쿠션
    [[0, 4, 0, 7], [-7, 3.5, 1, 5], [7, 3.5, -1, 5.5], [2, 7, -2, 5]].forEach(([x, y, z, r]) => {
      const s = new THREE.Mesh(new THREE.SphereGeometry(r, 12, 10), mat(0xffffff));
      s.position.set(x, y, z); s.scale.y = 0.75; g.add(s);
    });
  } else {                                        // 별 쿠션(밤길)
    const shape = new THREE.Shape();
    for (let i = 0; i < 10; i++) {
      const a = i / 10 * Math.PI * 2 - Math.PI / 2, r = i % 2 ? 4.5 : 10;
      if (i === 0) shape.moveTo(Math.cos(a) * r, Math.sin(a) * r); else shape.lineTo(Math.cos(a) * r, Math.sin(a) * r);
    }
    shape.closePath();
    const star = new THREE.Mesh(new THREE.ExtrudeGeometry(shape, { depth: 4, bevelEnabled: true, bevelSize: 1, bevelThickness: 1, bevelSegments: 1 }),
      new THREE.MeshLambertMaterial({ color: 0xffe066, emissive: 0x6a5200 }));
    star.rotation.x = -Math.PI / 2; star.position.y = 1.5; g.add(star);
  }
  return g;
}
