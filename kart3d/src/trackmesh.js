// 산리오 카트 3D — 중심선에서 도로·난간·풍경 메시를 만든다
import * as THREE from '../vendor/three.module.min.js';

const UP = new THREE.Vector3(0, 1, 0);

export function buildTrackMesh(track, scene) {
  const def = track.def;
  const group = new THREE.Group();
  const pts = track.points;
  const N = pts.length;
  const HALF = def.roadHalf;

  // ---- 도로 리본 ----
  const pos = [], idx = [], uv = [], colors = [];
  const roadColor = new THREE.Color(def.road);
  const startColor = new THREE.Color(0xffffff);
  for (let i = 0; i <= N; i++) {
    const p = pts[i % N];
    const tan = new THREE.Vector3(p.tx, p.ty, p.tz).normalize();
    const side = new THREE.Vector3().crossVectors(tan, UP).normalize();
    const l = new THREE.Vector3(p.x, p.y, p.z).addScaledVector(side, -HALF);
    const r = new THREE.Vector3(p.x, p.y, p.z).addScaledVector(side, HALF);
    pos.push(l.x, l.y, l.z, r.x, r.y, r.z);
    const v = p.dist / 60;
    uv.push(0, v, 1, v);
    // 출발선 근처는 하얗게
    const c = (i % N) < 4 ? startColor : roadColor;
    colors.push(c.r, c.g, c.b, c.r, c.g, c.b);
    if (i < N) { const k = i * 2; idx.push(k, k + 1, k + 2, k + 1, k + 3, k + 2); }
  }
  const roadGeo = new THREE.BufferGeometry();
  roadGeo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  roadGeo.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
  roadGeo.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
  roadGeo.setIndex(idx);
  roadGeo.computeVertexNormals();
  const road = new THREE.Mesh(roadGeo, new THREE.MeshLambertMaterial({ vertexColors: true }));
  group.add(road);

  // ---- 도로 가장자리(살짝 낮은 턱) ----
  const edgeGeo = new THREE.BufferGeometry();
  const ep = [], ei = [];
  for (let i = 0; i <= N; i++) {
    const p = pts[i % N];
    const tan = new THREE.Vector3(p.tx, p.ty, p.tz).normalize();
    const side = new THREE.Vector3().crossVectors(tan, UP).normalize();
    [-1, 1].forEach(s => {
      const a = new THREE.Vector3(p.x, p.y, p.z).addScaledVector(side, s * HALF);
      const b = new THREE.Vector3(p.x, p.y - 3, p.z).addScaledVector(side, s * (HALF + 7));
      ep.push(a.x, a.y, a.z, b.x, b.y, b.z);
    });
    if (i < N) {
      const k = i * 4;
      ei.push(k, k + 1, k + 4, k + 1, k + 5, k + 4);
      ei.push(k + 2, k + 6, k + 3, k + 3, k + 6, k + 7);
    }
  }
  edgeGeo.setAttribute('position', new THREE.Float32BufferAttribute(ep, 3));
  edgeGeo.setIndex(ei);
  edgeGeo.computeVertexNormals();
  group.add(new THREE.Mesh(edgeGeo, new THREE.MeshLambertMaterial({ color: def.rail })));

  // ---- 난간 기둥 (일정 간격) ----
  // 기둥은 수백 개라 인스턴싱으로 묶는다(색깔 두 가지 → 두 덩어리)
  const postGeo = new THREE.CylinderGeometry(1.6, 1.9, 12, 6);
  const step = Math.max(4, Math.floor(N / 90));
  const postSlots = [[], []];
  let postCount = 0;
  for (let i = 0; i < N; i += step) {
    const p = pts[i];
    const tan = new THREE.Vector3(p.tx, p.ty, p.tz).normalize();
    const side = new THREE.Vector3().crossVectors(tan, UP).normalize();
    [-1, 1].forEach(s => {
      const v = new THREE.Vector3(p.x, p.y + 6, p.z).addScaledVector(side, s * (HALF + 7));
      postSlots[postCount % 2].push(v);
    });
    postCount++;
  }
  const postDummy = new THREE.Object3D();
  [def.rail, 0xfff3a6].forEach((color, ci) => {
    const list = postSlots[ci];
    if (!list.length) return;
    const im = new THREE.InstancedMesh(postGeo, new THREE.MeshLambertMaterial({ color }), list.length);
    list.forEach((v, i) => {
      postDummy.position.copy(v);
      postDummy.updateMatrix();
      im.setMatrixAt(i, postDummy.matrix);
    });
    im.instanceMatrix.needsUpdate = true;
    group.add(im);
  });

  // ---- 출발선 체커 ----
  const start = pts[0];
  const startTan = new THREE.Vector3(start.tx, start.ty, start.tz).normalize();
  const startSide = new THREE.Vector3().crossVectors(startTan, UP).normalize();
  const startQuat = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 0, 1), startTan);
  const tileGeo = new THREE.BoxGeometry(HALF * 2 / 8, 0.6, 5);
  const tileSlots = [[], []];
  for (let c = 0; c < 8; c++) {
    for (let r = 0; r < 2; r++) {
      const off = -HALF + (c + 0.5) * (HALF * 2 / 8);
      const v = new THREE.Vector3(start.x, start.y + 0.5, start.z)
        .addScaledVector(startSide, off)
        .addScaledVector(startTan, (r - 0.5) * 5);
      tileSlots[(c + r) % 2].push(v);
    }
  }
  const tileDummy = new THREE.Object3D();
  [0xffffff, 0x3d3350].forEach((color, ci) => {
    const list = tileSlots[ci];
    const im = new THREE.InstancedMesh(tileGeo, new THREE.MeshLambertMaterial({ color }), list.length);
    list.forEach((v, i) => {
      tileDummy.position.copy(v);
      tileDummy.quaternion.copy(startQuat);
      tileDummy.updateMatrix();
      im.setMatrixAt(i, tileDummy.matrix);
    });
    im.instanceMatrix.needsUpdate = true;
    group.add(im);
  });

  // ---- 점프대 ----
  track.ramps.forEach(r => {
    const p = r.p;
    const tan = new THREE.Vector3(p.tx, p.ty, p.tz).normalize();
    const ramp = new THREE.Mesh(new THREE.BoxGeometry(HALF * 1.8, 3, 26),
      new THREE.MeshLambertMaterial({ color: 0xffd34d }));
    ramp.position.set(p.x, p.y + 1.6, p.z);
    ramp.quaternion.setFromUnitVectors(new THREE.Vector3(0, 0, 1), tan);
    ramp.rotateX(-0.24);
    group.add(ramp);
    // 화살표 표시
    const arrow = new THREE.Mesh(new THREE.ConeGeometry(5, 12, 4),
      new THREE.MeshLambertMaterial({ color: 0xff7aa8 }));
    arrow.position.set(p.x, p.y + 5, p.z);
    arrow.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), tan);
    group.add(arrow);
  });

  // ---- 지름길 바닥 ----
  if (track.shortcutSegs) {
    track.shortcutSegs.forEach(s => {
      const a = new THREE.Vector3(s.ax, s.ay, s.az);
      const b = new THREE.Vector3(s.bx, s.by, s.bz);
      const len = a.distanceTo(b);
      const m = new THREE.Mesh(new THREE.BoxGeometry(40, 1.2, len),
        new THREE.MeshLambertMaterial({ color: 0xd8e59a }));
      m.position.copy(a).add(b).multiplyScalar(0.5);
      m.quaternion.setFromUnitVectors(new THREE.Vector3(0, 0, 1),
        b.clone().sub(a).normalize());
      group.add(m);
    });
  }

  // ---- 지면 ----
  const ground = new THREE.Mesh(new THREE.PlaneGeometry(3000, 3000),
    new THREE.MeshLambertMaterial({ color: def.ground }));
  ground.rotation.x = -Math.PI / 2;
  ground.position.y = (def.id === 'cloud' ? 20 : 0) - 16;
  group.add(ground);

  addScenery(def, track, group);
  scene.add(group);
  return group;
}

function addScenery(def, track, group) {
  let seed = 20260819;
  const rnd = () => (seed = (seed * 1664525 + 1013904223) >>> 0) / 4294967296;
  const dummy = new THREE.Object3D();

  // 같은 모양을 여러 번 그릴 때는 인스턴싱으로 한 번에 보낸다.
  // 나무 수백 그루를 개별 메시로 두면 드로우콜이 폭증한다.
  function instance(geo, mat, placements) {
    if (!placements.length) return;
    const m = new THREE.InstancedMesh(geo, mat, placements.length);
    placements.forEach((p, i) => {
      dummy.position.set(p.x, p.y, p.z);
      dummy.rotation.set(0, p.ry || 0, 0);
      const s = p.s || 1;
      dummy.scale.set(s, p.sy || s, s);
      dummy.updateMatrix();
      m.setMatrixAt(i, dummy.matrix);
    });
    m.instanceMatrix.needsUpdate = true;
    group.add(m);
  }

  const away = () => {
    for (let tries = 0; tries < 24; tries++) {
      const a = rnd() * Math.PI * 2, r = 120 + rnd() * 560;
      const x = Math.cos(a) * r, z = Math.sin(a) * r;
      const s = track.nearest(x, z);
      if (s.dist > def.roadHalf + 45) return { x, z, y: s.p.y };
    }
    return null;
  };

  if (def.scenery === 'park') {
    const trunks = [], leaves = [[], [], []];
    for (let i = 0; i < 110; i++) {
      const s = away(); if (!s) continue;
      trunks.push({ x: s.x, y: s.y + 12, z: s.z, ry: rnd() * 3 });
      leaves[(rnd() * 3) | 0].push({ x: s.x, y: s.y + 32, z: s.z, s: 0.85 + rnd() * 0.4 });
    }
    instance(new THREE.CylinderGeometry(3, 4, 24, 6),
      new THREE.MeshLambertMaterial({ color: 0x8a5a33 }), trunks);
    [0x6fbe58, 0x8fd36f, 0xffb3d9].forEach((c, i) => {
      instance(new THREE.SphereGeometry(17, 8, 6), new THREE.MeshLambertMaterial({ color: c }), leaves[i]);
    });

    const carousel = new THREE.Group();
    carousel.add(new THREE.Mesh(new THREE.CylinderGeometry(46, 46, 4, 20),
      new THREE.MeshLambertMaterial({ color: 0xfff0c4 })));
    const roof = new THREE.Mesh(new THREE.ConeGeometry(52, 26, 20),
      new THREE.MeshLambertMaterial({ color: 0xff8fb4 }));
    roof.position.y = 40; carousel.add(roof);
    const poleGeo = new THREE.CylinderGeometry(1.4, 1.4, 34, 6);
    const poleMat = new THREE.MeshLambertMaterial({ color: 0xffd34d });
    const poles = new THREE.InstancedMesh(poleGeo, poleMat, 8);
    for (let i = 0; i < 8; i++) {
      const a = i / 8 * Math.PI * 2;
      dummy.position.set(Math.cos(a) * 38, 19, Math.sin(a) * 38);
      dummy.rotation.set(0, 0, 0); dummy.scale.set(1, 1, 1);
      dummy.updateMatrix(); poles.setMatrixAt(i, dummy.matrix);
    }
    carousel.add(poles);
    carousel.position.set(560, 6, 380);
    group.add(carousel);
    group.userData.spin = carousel;
  } else if (def.scenery === 'cloud') {
    const puffs = [];
    for (let i = 0; i < 80; i++) {
      const a = rnd() * Math.PI * 2, r = 180 + rnd() * 640;
      const x = Math.cos(a) * r, z = Math.sin(a) * r, y = 10 + rnd() * 90;
      for (let k = 0; k < 3; k++) {
        const s = (14 + rnd() * 16) / 18;
        puffs.push({ x: x + (k - 1) * 16, y: y + rnd() * 5, z: z + rnd() * 6, s });
      }
    }
    instance(new THREE.SphereGeometry(18, 8, 6),
      new THREE.MeshLambertMaterial({ color: 0xffffff }), puffs);

    [0xff8fb4, 0xffd34d, 0x9be2b5, 0x8fd0ff, 0xc9b2e8].forEach((c, i) => {
      const t = new THREE.Mesh(new THREE.TorusGeometry(150 - i * 9, 4, 6, 40, Math.PI),
        new THREE.MeshLambertMaterial({ color: c }));
      t.position.set(0, 60, 0);
      t.rotation.y = Math.PI / 2;
      group.add(t);
    });
  } else {
    const sticks = [], candies = [[], [], [], []], hills = [];
    for (let i = 0; i < 95; i++) {
      const s = away(); if (!s) continue;
      sticks.push({ x: s.x, y: s.y + 17, z: s.z });
      candies[(rnd() * 4) | 0].push({ x: s.x, y: s.y + 42, z: s.z, s: 0.8 + rnd() * 0.5 });
    }
    instance(new THREE.CylinderGeometry(1.6, 1.6, 34, 6),
      new THREE.MeshLambertMaterial({ color: 0xffffff }), sticks);
    [0xff7aa8, 0xffd34d, 0x9be2b5, 0xc9b2e8].forEach((c, i) => {
      instance(new THREE.SphereGeometry(15, 10, 8), new THREE.MeshLambertMaterial({ color: c }), candies[i]);
    });
    for (let i = 0; i < 14; i++) {
      const s = away(); if (!s) continue;
      hills.push({ x: s.x, y: s.y - 10, z: s.z, s: (60 + rnd() * 40) / 70, sy: (60 + rnd() * 40) / 70 * 0.45 });
    }
    instance(new THREE.SphereGeometry(70, 10, 8),
      new THREE.MeshLambertMaterial({ color: 0x8a5a33 }), hills);
  }
}
