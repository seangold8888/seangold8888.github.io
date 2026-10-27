// 산리오 카트 3D — 눈꽃 마을 전용 모양: 내리는 눈, 눈 덮인 마을 풍경, 눈사람·선물 상자·눈덩이
// 소품 하나를 여러 도형으로 만들되 색깔째 한 지오메트리로 합친다(mergeColored).
// 그래서 눈사람 스무 개도, 전나무 백 그루도 InstancedMesh 한 덩어리 = 드로우콜 하나다.
import * as THREE from '../vendor/three.module.min.js';

const _m = new THREE.Matrix4(), _q = new THREE.Quaternion(), _e = new THREE.Euler();
const _p = new THREE.Vector3(), _s = new THREE.Vector3(), _c = new THREE.Color();

// parts: [{ g: 지오메트리, c: 색, p: [x,y,z], r: [rx,ry,rz], s: [sx,sy,sz] }]
export function mergeColored(parts) {
  const pos = [], nor = [], col = [];
  for (const part of parts) {
    const g = part.g.index ? part.g.toNonIndexed() : part.g.clone();
    part.g.dispose();
    const p = part.p || [0, 0, 0], r = part.r || [0, 0, 0], s = part.s || [1, 1, 1];
    _m.compose(_p.set(p[0], p[1], p[2]), _q.setFromEuler(_e.set(r[0], r[1], r[2])), _s.set(s[0], s[1], s[2]));
    g.applyMatrix4(_m);
    if (!g.attributes.normal) g.computeVertexNormals();
    _c.set(part.c);
    const P = g.attributes.position.array, N = g.attributes.normal.array;
    for (let i = 0; i < P.length; i++) { pos.push(P[i]); nor.push(N[i]); }
    for (let i = 0; i < P.length / 3; i++) col.push(_c.r, _c.g, _c.b);
    g.dispose();
  }
  const out = new THREE.BufferGeometry();
  out.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  out.setAttribute('normal', new THREE.Float32BufferAttribute(nor, 3));
  out.setAttribute('color', new THREE.Float32BufferAttribute(col, 3));
  out.computeBoundingSphere();
  return out;
}

const WHITE = 0xffffff, INK = 0x2b2b3a, CARROT = 0xff8a3d, SCARF = 0xff5c7a;

// 앞(+Z)을 보는 눈사람. 바닥이 y=0, 키 약 37.
export function snowmanGeometry(scarf = SCARF) {
  const S = (r, w = 10, h = 7) => new THREE.SphereGeometry(r, w, h);
  return mergeColored([
    { g: S(9), c: WHITE, p: [0, 8.5, 0], s: [1, 0.95, 1] },
    { g: S(6.6), c: WHITE, p: [0, 20, 0] },
    { g: S(4.8), c: WHITE, p: [0, 29, 0] },
    { g: new THREE.ConeGeometry(1.1, 5, 6), c: CARROT, p: [0, 29, 7], r: [Math.PI / 2, 0, 0] },
    { g: S(0.75, 5, 4), c: INK, p: [-1.7, 30.6, 4.2] },
    { g: S(0.75, 5, 4), c: INK, p: [1.7, 30.6, 4.2] },
    { g: S(0.8, 5, 4), c: INK, p: [0, 21.5, 6.4] },
    { g: S(0.8, 5, 4), c: INK, p: [0, 17.6, 6.5] },
    { g: new THREE.TorusGeometry(4.9, 1.3, 5, 10), c: scarf, p: [0, 25, 0], r: [Math.PI / 2, 0, 0] },
    { g: new THREE.BoxGeometry(2.4, 6, 0.9), c: scarf, p: [2.6, 21.5, 5.4], r: [0, 0, 0.25] },
    { g: new THREE.CylinderGeometry(5, 5, 0.8, 12), c: INK, p: [0, 33.3, 0] },
    { g: new THREE.CylinderGeometry(3.2, 3.2, 4.6, 12), c: INK, p: [0, 35.8, 0] },
    { g: new THREE.CylinderGeometry(3.3, 3.3, 1.1, 12), c: scarf, p: [0, 34.3, 0] },
    { g: new THREE.CylinderGeometry(0.45, 0.45, 11, 5), c: 0x7a4f2e, p: [-9.5, 23, 0], r: [0, 0, 1.0] },
    { g: new THREE.CylinderGeometry(0.45, 0.45, 11, 5), c: 0x7a4f2e, p: [9.5, 23, 0], r: [0, 0, -1.0] }
  ]);
}

// 리본 두른 선물 상자. 바닥 y=0, 한 변 14.
export function giftGeometry(box, ribbon) {
  return mergeColored([
    { g: new THREE.BoxGeometry(14, 12, 14), c: box, p: [0, 6, 0] },
    { g: new THREE.BoxGeometry(3.2, 12.3, 14.3), c: ribbon, p: [0, 6, 0] },
    { g: new THREE.BoxGeometry(14.3, 12.3, 3.2), c: ribbon, p: [0, 6, 0] },
    { g: new THREE.TorusGeometry(2.6, 0.9, 4, 8), c: ribbon, p: [-2.4, 13.4, 0], r: [0, Math.PI / 2, 0.6] },
    { g: new THREE.TorusGeometry(2.6, 0.9, 4, 8), c: ribbon, p: [2.4, 13.4, 0], r: [0, Math.PI / 2, -0.6] }
  ]);
}
export const GIFT_COLORS = [[0xff5c7a, 0xffd34d], [0x4fbf7a, 0xff5c7a], [0x72b0ff, 0xffffff], [0xc79bff, 0xfff3a6]];

// 눈 쌓인 전나무. 바닥 y=0, 키 약 47.
export function snowPineGeometry() {
  return mergeColored([
    { g: new THREE.CylinderGeometry(2.4, 3.2, 10, 6), c: 0x7a4f2e, p: [0, 5, 0] },
    { g: new THREE.ConeGeometry(14, 22, 8), c: 0x2f8a5b, p: [0, 18, 0] },
    { g: new THREE.ConeGeometry(14.6, 5, 8, 1, true), c: WHITE, p: [0, 9.6, 0] },
    { g: new THREE.ConeGeometry(10.5, 18, 8), c: 0x3a9c66, p: [0, 29, 0] },
    { g: new THREE.ConeGeometry(11, 4, 8, 1, true), c: WHITE, p: [0, 22, 0] },
    { g: new THREE.ConeGeometry(6.2, 11, 8), c: WHITE, p: [0, 41.5, 0] }
  ]);
}

// 지붕에 눈 덮인 작은 집. 앞(+Z)에 문과 창문. 바닥 y=0.
export function houseGeometry(wall) {
  const tri = (w, h) => { const s = new THREE.Shape(); s.moveTo(-w / 2, 0); s.lineTo(w / 2, 0); s.lineTo(0, h); s.closePath(); return s; };
  const roof = (w, h, d) => new THREE.ExtrudeGeometry(tri(w, h), { depth: d, bevelEnabled: false });
  return mergeColored([
    { g: new THREE.BoxGeometry(40, 26, 34), c: wall, p: [0, 13, 0] },
    { g: roof(48, 17, 38), c: 0x9c5a3c, p: [0, 26, -19] },
    { g: roof(45, 16, 39), c: 0xf8fbff, p: [0, 27.6, -19.5] },
    { g: new THREE.BoxGeometry(5, 11, 5), c: 0xb5523b, p: [11, 37, -7] },
    { g: new THREE.BoxGeometry(6.2, 1.8, 6.2), c: WHITE, p: [11, 43, -7] },
    { g: new THREE.BoxGeometry(8, 14, 1), c: 0x8a5a33, p: [0, 7, 17.2] },
    { g: new THREE.BoxGeometry(7.5, 7.5, 1), c: 0xffe08a, p: [-12.5, 15, 17.2] },
    { g: new THREE.BoxGeometry(7.5, 7.5, 1), c: 0xffe08a, p: [12.5, 15, 17.2] },
    { g: new THREE.BoxGeometry(44, 2, 38), c: WHITE, p: [0, 0.6, 0] }
  ]);
}

// 멀리 둘러선 눈 덮인 산
export function mountainGeometry() {
  return mergeColored([
    { g: new THREE.ConeGeometry(250, 300, 7), c: 0xb3c7e2, p: [0, 150, 0] },
    { g: new THREE.ConeGeometry(118, 142, 7), c: 0xfafcff, p: [0, 229.5, 0] }
  ]);
}

// 캔버스 텍스처는 경주마다 새로 만들지 않고 한 번만 만들어 돌려 쓴다.
// (경주를 끝낼 때 재질은 dispose 되지만 텍스처는 남으므로, 새로 만들면 판마다 쌓인다)
const textures = {};
function texture(name, draw) {
  if (textures[name]) return textures[name];
  const cv = document.createElement('canvas');
  draw(cv);
  const tex = new THREE.CanvasTexture(cv);
  if (name === 'ice') { tex.wrapS = tex.wrapT = THREE.RepeatWrapping; tex.repeat.set(2, 1); }
  return (textures[name] = tex);
}
function drawFlake(cv) {
  cv.width = cv.height = 32;
  const c = cv.getContext('2d');
  const grd = c.createRadialGradient(16, 16, 0, 16, 16, 16);
  grd.addColorStop(0, 'rgba(255,255,255,1)'); grd.addColorStop(0.55, 'rgba(255,255,255,0.85)'); grd.addColorStop(1, 'rgba(255,255,255,0)');
  c.fillStyle = grd; c.fillRect(0, 0, 32, 32);
}
function drawSnowball(cv) {
  cv.width = 64; cv.height = 32;
  const c = cv.getContext('2d');
  c.fillStyle = '#ffffff'; c.fillRect(0, 0, 64, 32);
  c.fillStyle = '#c9dcf2';
  for (let i = 0; i < 14; i++) { c.beginPath(); c.arc((i * 23) % 64, (i * 13) % 32, 2.5 + (i % 3), 0, Math.PI * 2); c.fill(); }
}
function drawIce(cv) {
  cv.width = cv.height = 64;
  const c = cv.getContext('2d');
  c.fillStyle = 'rgba(150,225,255,0.82)'; c.fillRect(0, 0, 64, 64);
  c.strokeStyle = 'rgba(255,255,255,0.95)'; c.lineWidth = 3;
  [[6, 50, 26, 34], [34, 60, 58, 40], [12, 18, 30, 4], [40, 26, 56, 14]].forEach(([x1, y1, x2, y2]) => { c.beginPath(); c.moveTo(x1, y1); c.lineTo(x2, y2); c.stroke(); });
  c.fillStyle = 'rgba(255,255,255,0.9)';
  [[50, 52], [20, 40], [46, 8]].forEach(([x, y]) => { c.beginPath(); c.arc(x, y, 2.2, 0, Math.PI * 2); c.fill(); });
}

// ---------- 내리는 눈 ----------
// 점 하나하나는 월드에 고정된 자리를 갖고, 카메라 주변 상자 안으로 감아 넣는다(모듈로).
// 그래서 카트가 달리면 눈송이 사이를 지나가는 느낌이 나고, 수는 늘 같다.
// 점 700개 · 드로우콜 1개 · 매 프레임 버퍼 8KB 갱신이라 아이패드에서도 가볍다.
export function makeSnowfall(count = 700) {
  const W = 640, H = 250;
  let seed = 20261027;
  const rnd = () => (seed = (seed * 1664525 + 1013904223) >>> 0) / 4294967296;
  const bx = new Float32Array(count), by = new Float32Array(count), bz = new Float32Array(count), sp = new Float32Array(count);
  for (let i = 0; i < count; i++) { bx[i] = rnd() * W; by[i] = rnd() * H; bz[i] = rnd() * W; sp[i] = 13 + rnd() * 15; }
  const arr = new Float32Array(count * 3);
  const geo = new THREE.BufferGeometry();
  const attr = new THREE.BufferAttribute(arr, 3);
  attr.setUsage(THREE.DynamicDrawUsage);
  geo.setAttribute('position', attr);
  const mat = new THREE.PointsMaterial({ size: 2.6, map: texture('flake', drawFlake), transparent: true, depthWrite: false, color: 0xffffff });
  const points = new THREE.Points(geo, mat);
  points.frustumCulled = false;            // 위치를 매 프레임 바꾸므로 경계구가 의미 없다
  points.name = 'snowfall';
  const mod = (a, n) => a - Math.floor(a / n) * n;
  let t = 0;
  points.userData.update = (dt, cx, cy, cz) => {
    t += dt;
    const x0 = cx - W / 2, z0 = cz - W / 2, y0 = cy - 150;
    for (let i = 0; i < count; i++) {
      let y = by[i] - sp[i] * dt;
      if (y < 0) y += H;
      by[i] = y;
      const sway = Math.sin(t * 0.9 + i * 1.7) * 7;
      arr[i * 3] = x0 + mod(bx[i] + sway - x0, W);
      arr[i * 3 + 1] = y0 + y;
      arr[i * 3 + 2] = z0 + mod(bz[i] + sway * 0.6 - z0, W);
    }
    attr.needsUpdate = true;
  };
  return points;
}

// ---------- 코스 장애물 모양 ----------
export function makeSnowObstacle(kind) {
  const g = new THREE.Group();
  if (kind === 'snowball') {                 // 데굴데굴 큰 눈덩이(굴러가는 게 보이게 점박이 무늬)
    const ball = new THREE.Mesh(new THREE.SphereGeometry(11, 16, 12), new THREE.MeshLambertMaterial({ map: texture('snowball', drawSnowball) }));
    const spinner = new THREE.Group();     // 굴러가는 회전은 이 안쪽에서, 위치는 바깥에서
    spinner.add(ball);
    spinner.position.y = 11;
    g.add(spinner);
    g.userData.spinner = spinner;
  } else if (kind === 'snowman') {           // 길가에 버티고 선 눈사람
    const m = new THREE.Mesh(snowmanGeometry(), new THREE.MeshLambertMaterial({ vertexColors: true }));
    m.scale.setScalar(0.85);
    g.add(m);
  } else {                                   // 통통 튀는 선물 상자 스프링
    const [box, ribbon] = GIFT_COLORS[0];
    const m = new THREE.Mesh(giftGeometry(box, ribbon), new THREE.MeshLambertMaterial({ vertexColors: true }));
    m.scale.set(1.35, 0.9, 1.35);
    g.add(m);
  }
  return g;
}

// ---------- 얼음길(도로 위에 딱 붙는 띠) ----------
// 범위마다 도로 표본을 그대로 따라가므로 커브·오르막에서도 뜨거나 파묻히지 않는다.
export function buildIceMesh(track, ranges) {
  const pts = track.points, N = pts.length, HALF = track.roadHalf * 0.94;
  const UP = new THREE.Vector3(0, 1, 0);
  const pos = [], uv = [], idx = [];
  const out = [];
  ranges.forEach(([a, b]) => {
    const i0 = Math.floor(a * N), i1 = Math.floor(b * N);
    out.push({ i0, i1 });
    const base = pos.length / 3;
    for (let i = i0; i <= i1; i++) {
      const p = pts[i % N];
      const tan = new THREE.Vector3(p.tx, p.ty, p.tz).normalize();
      const side = new THREE.Vector3().crossVectors(tan, UP).normalize();
      pos.push(p.x - side.x * HALF, p.y + 0.35, p.z - side.z * HALF, p.x + side.x * HALF, p.y + 0.35, p.z + side.z * HALF);
      const v = (i - i0) / 4;
      uv.push(0, v, 1, v);
      if (i < i1) { const k = base + (i - i0) * 2; idx.push(k, k + 1, k + 2, k + 1, k + 3, k + 2); }
    }
  });
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  geo.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
  geo.setIndex(idx);
  geo.computeVertexNormals();
  const tex = texture('ice', drawIce);
  const mesh = new THREE.Mesh(geo, new THREE.MeshLambertMaterial({
    map: tex, transparent: true, depthWrite: false, emissive: 0x1d4a66,
    polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -2
  }));
  mesh.name = 'ice';
  return { mesh, ranges: out };
}

// ---------- 마을 풍경 ----------
// trackmesh.js 의 addScenery 가 부른다. rnd·away·instance 는 그쪽 것을 그대로 쓴다.
export function addSnowScenery(def, track, group, rnd, away) {
  const dummy = new THREE.Object3D();
  const lambertVC = () => new THREE.MeshLambertMaterial({ vertexColors: true });
  function instanceGeo(geo, list) {
    if (!list.length) { geo.dispose(); return; }
    const m = new THREE.InstancedMesh(geo, lambertVC(), list.length);
    list.forEach((p, i) => {
      dummy.position.set(p.x, p.y, p.z);
      dummy.rotation.set(0, p.ry || 0, 0);
      dummy.scale.setScalar(p.s || 1);
      dummy.updateMatrix();
      m.setMatrixAt(i, dummy.matrix);
    });
    m.instanceMatrix.needsUpdate = true;
    group.add(m);
  }
  const n = track.points.length, HALF = def.roadHalf;
  // 길을 바라보게 세운다(문·얼굴이 카트 쪽으로)
  const facing = (x, z) => { const q = track.nearest(x, z).p; return Math.atan2(q.x - x, q.z - z); };

  // 전나무 숲
  const pines = [];
  for (let i = 0; i < 120; i++) { const s = away(); if (s) pines.push({ x: s.x, y: s.y - 2, z: s.z, ry: rnd() * 6.28, s: 0.8 + rnd() * 0.7 }); }
  instanceGeo(snowPineGeometry(), pines);

  // 마을: 길가 몇 군데에 집을 서너 채씩 모은다
  const walls = [0xff8f8f, 0xfff0c9, 0x9cc4f0];
  const houses = walls.map(() => []);
  const clusters = [0.05, 0.2, 0.52, 0.66, 0.88];
  clusters.forEach((t, ci) => {
    const c0 = track.points[Math.floor(t * n) % n];
    const side = ci % 2 ? 1 : -1;
    for (let h = 0; h < 3; h++) {
      const p = track.points[Math.floor((t + h * 0.016) * n) % n];
      const nx = -p.tz * side, nz = p.tx * side;
      const off = HALF + 62 + (h % 2) * 34;
      const x = p.x + nx * off, z = p.z + nz * off;
      if (track.nearest(x, z).dist < HALF + 40) continue;
      houses[(ci + h) % walls.length].push({ x, y: c0.y - 1, z, ry: facing(x, z), s: 0.9 + rnd() * 0.25 });
    }
  });
  walls.forEach((w, i) => instanceGeo(houseGeometry(w), houses[i]));

  // 눈사람 구경꾼(길가에 서서 손을 흔드는 듯)
  const snowmen = [[], []];
  for (let k = 0; k < 22; k++) {
    const p = track.points[Math.floor(((k + 0.3) / 22) * n) % n];
    const side = k % 2 ? 1 : -1;
    const nx = -p.tz * side, nz = p.tx * side, off = HALF + 22 + rnd() * 10;
    const x = p.x + nx * off, z = p.z + nz * off;
    snowmen[k % 2].push({ x, y: p.y - 1, z, ry: facing(x, z), s: 0.75 + rnd() * 0.3 });
  }
  instanceGeo(snowmanGeometry(SCARF), snowmen[0]);
  instanceGeo(snowmanGeometry(0x4fbf7a), snowmen[1]);

  // 선물 상자 더미
  const gifts = GIFT_COLORS.map(() => []);
  for (let i = 0; i < 26; i++) {
    const s = away(); if (!s) continue;
    const pile = 1 + Math.floor(rnd() * 3);
    for (let k = 0; k < pile; k++) {
      gifts[(i + k) % gifts.length].push({ x: s.x + (k - 1) * 13, y: s.y - 1, z: s.z + (k % 2) * 9, ry: rnd() * 6.28, s: 0.7 + rnd() * 0.5 });
    }
  }
  GIFT_COLORS.forEach(([b, r], i) => instanceGeo(giftGeometry(b, r), gifts[i]));

  // 멀리 둘러선 설산
  const peaks = [];
  for (let i = 0; i < 14; i++) {
    const a = i / 14 * Math.PI * 2 + rnd() * 0.2, r = 1350 + rnd() * 350;
    peaks.push({ x: Math.cos(a) * r, y: -20, z: Math.sin(a) * r, ry: rnd() * 6.28, s: 0.8 + rnd() * 0.7 });
  }
  instanceGeo(mountainGeometry(), peaks);

  // 꽁꽁 언 연못 — 안쪽 빈터에서 길과 가장 먼 곳을 고른다
  let best = null;
  for (let gx = -500; gx <= 500; gx += 50) {
    for (let gz = -400; gz <= 400; gz += 50) {
      const d = track.nearest(gx, gz).dist;
      if (!best || d > best.d) best = { x: gx, z: gz, d };
    }
  }
  if (best && best.d > HALF + 70) {
    const r = Math.min(170, best.d - HALF - 40);
    const pond = new THREE.Mesh(new THREE.CircleGeometry(r, 36), new THREE.MeshLambertMaterial({ color: 0xbfe6ff, emissive: 0x1d4a66 }));
    pond.rotation.x = -Math.PI / 2;
    pond.position.set(best.x, -15.4, best.z);
    group.add(pond);
  }
}
