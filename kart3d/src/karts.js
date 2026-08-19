// 산리오 카트 3D — 캐릭터, 카트 모델, 물리
import * as THREE from '../vendor/three.module.min.js';

export const CHARACTERS = [
  { id: 'kitty',  name: '헬로키티',   body: 0xff8fb4, trim: 0xffffff, fur: 0xffffff, top: 118, accel: 2.6, turn: 2.35, deco: 'ribbon', kart: 'bow' },
  { id: 'melody', name: '마이멜로디', body: 0xffc2dd, trim: 0xff7aa8, fur: 0xffffff, top: 114, accel: 2.9, turn: 2.6,  deco: 'hood',   kart: 'petal' },
  { id: 'cinna',  name: '시나모롤',   body: 0xbfe4ff, trim: 0x7fc4e8, fur: 0xffffff, top: 122, accel: 2.4, turn: 2.2,  deco: 'ears',   kart: 'cloud' },
  { id: 'kuromi', name: '쿠로미',     body: 0xc9b2e8, trim: 0x3d3350, fur: 0xffffff, top: 126, accel: 2.3, turn: 2.15, deco: 'skull',  kart: 'spike' },
  { id: 'pochaco',name: '포차코',     body: 0xffffff, trim: 0x8fd0ff, fur: 0xffffff, top: 116, accel: 2.7, turn: 2.45, deco: 'pup',    kart: 'stripe' },
  { id: 'gude',   name: '구데타마',   body: 0xffe27a, trim: 0xfff3c4, fur: 0xffe27a, top: 110, accel: 3.1, turn: 2.75, deco: 'egg',    kart: 'pan' },
  { id: 'purin',  name: '폼폼푸린',   body: 0xffe27a, trim: 0x8a5a33, fur: 0xffe27a, top: 120, accel: 2.55, turn: 2.4, deco: 'purin',  kart: 'pudding' }
];

// 카트 장식 — 캐릭터마다 실루엣이 달라야 한 눈에 구분된다.
// 여러 개짜리는 InstancedMesh 로 묶어 카트당 1 드로우콜을 지킨다.
function addKartFlair(g, spec, mat) {
  const dummy = new THREE.Object3D();
  const many = (geo, m, list) => {
    const im = new THREE.InstancedMesh(geo, m, list.length);
    list.forEach((p, i) => {
      dummy.position.set(p[0], p[1], p[2]);
      dummy.rotation.set(p[3] || 0, p[4] || 0, p[5] || 0);
      dummy.scale.setScalar(p[6] || 1);
      dummy.updateMatrix(); im.setMatrixAt(i, dummy.matrix);
    });
    im.instanceMatrix.needsUpdate = true;
    g.add(im);
  };

  if (spec.kart === 'bow') {                 // 헬로키티: 보닛 위 리본
    many(new THREE.TorusGeometry(1.25, 0.55, 8, 14), mat(0xff5c8a),
      [[-1.8, 10.3, 12.6, 0, 0, 0.5], [1.8, 10.3, 12.6, 0, 0, -0.5]]);
  } else if (spec.kart === 'petal') {        // 마이멜로디: 꽃잎 노즈
    const p = [];
    for (let i = 0; i < 5; i++) {
      const a = i / 5 * Math.PI * 2;
      p.push([Math.cos(a) * 3.4, 9.6 + Math.sin(a) * 2.4, 12.8, 0, 0, a, 0.62]);
    }
    many(new THREE.SphereGeometry(2.0, 8, 6), mat(0xfff0f6), p);
  } else if (spec.kart === 'cloud') {        // 시나모롤: 뭉게구름 펜더
    many(new THREE.SphereGeometry(3.2, 10, 8), mat(0xffffff),
      [[-8.2, 8.6, 1.5], [8.2, 8.6, 1.5], [0, 9.6, 13.4, 0, 0, 0, 0.8]]);
  } else if (spec.kart === 'spike') {        // 쿠로미: 가시 스포일러
    many(new THREE.ConeGeometry(1.5, 4.2, 6), mat(0x3d3350),
      [[-4.4, 13.6, -11.2], [0, 14.4, -11.2], [4.4, 13.6, -11.2]]);
  } else if (spec.kart === 'stripe') {       // 포차코: 레이싱 스트라이프
    many(new THREE.BoxGeometry(3.2, 0.5, 9, 1, 1, 1), mat(0x8fd0ff),
      [[0, 10.2, 6.5], [0, 10.2, -6.5]]);
  } else if (spec.kart === 'pan') {          // 구데타마: 프라이팬
    many(new THREE.CylinderGeometry(7.6, 7.6, 1.2, 18), mat(0x4a4450),
      [[0, 9.6, 11.0, 0, 0, 0, 0.72]]);
  } else if (spec.kart === 'pudding') {      // 폼폼푸린: 푸딩 + 캐러멜
    many(new THREE.CylinderGeometry(2.9, 3.9, 3.4, 16), mat(0xffe27a), [[0, 9.8, 12.2]]);
    many(new THREE.SphereGeometry(3.0, 14, 10, 0, Math.PI * 2, 0, Math.PI * 0.5), mat(0x9c6326),
      [[0, 11.4, 12.2]]);
  }
}

// 귀엽고 둥근 카트. 캐릭터마다 장식이 다르다.
export function buildKartModel(spec) {
  const g = new THREE.Group();
  const mat = c => new THREE.MeshLambertMaterial({ color: c });

  // 차체 (둥글게)
  const body = new THREE.Mesh(new THREE.BoxGeometry(15, 7, 22), mat(spec.body));
  body.position.y = 6.5;
  g.add(body);
  const nose = new THREE.Mesh(new THREE.SphereGeometry(7.4, 12, 10), mat(spec.body));
  nose.scale.set(1, 0.62, 0.8);
  nose.position.set(0, 6.6, 11);
  g.add(nose);
  const seat = new THREE.Mesh(new THREE.BoxGeometry(11, 6, 7), mat(spec.trim));
  seat.position.set(0, 11, -5);
  g.add(seat);

  // 리어 윙
  const wing = new THREE.Mesh(new THREE.BoxGeometry(13.5, 1.5, 4.2), mat(spec.trim));
  wing.position.set(0, 12.3, -11.2);
  wing.rotation.x = 0.16;
  g.add(wing);

  // 라이더 — 예전에는 머리만 떠 있었다. 몸통·팔·핸들을 넣어 앉아 있는 형태로.
  // 머리가 크니 몸통은 어깨처럼 낮고 넓게 깔아야 실루엣이 산다
  const torso = new THREE.Mesh(new THREE.SphereGeometry(4.2, 16, 12), mat(spec.trim));
  torso.scale.set(1.32, 0.82, 0.95);
  torso.position.set(0, 10.2, -2.8);
  g.add(torso);

  const steerWheel = new THREE.Mesh(new THREE.TorusGeometry(2.0, 0.42, 8, 18), mat(0x4a3550));
  steerWheel.position.set(0, 10.8, 4.8);
  steerWheel.rotation.x = -0.75;
  g.add(steerWheel);

  [-1, 1].forEach(sgn => {
    const arm = new THREE.Mesh(new THREE.CapsuleGeometry(1.0, 4.2, 4, 8), mat(spec.fur));
    arm.position.set(sgn * 2.7, 10.7, 1.8);
    arm.rotation.set(-1.05, 0, sgn * 0.30);
    g.add(arm);
  });

  addKartFlair(g, spec, mat);

  // 바퀴
  const wheelGeo = new THREE.CylinderGeometry(4.2, 4.2, 3.4, 12);
  const wheelMat = mat(0x4a3550);
  const wheels = [];
  [[-8.4, -7.5], [8.4, -7.5], [-8.4, 8], [8.4, 8]].forEach(([x, z]) => {
    const w = new THREE.Mesh(wheelGeo, wheelMat);
    w.rotation.z = Math.PI / 2;
    w.position.set(x, 3.6, z);
    g.add(w); wheels.push(w);
  });

  // 캐릭터 머리
  const head = new THREE.Group();
  const face = new THREE.Mesh(new THREE.SphereGeometry(5.2, 30, 22), mat(spec.fur));
  face.scale.set(1.15, 1, 0.95);
  head.add(face);
  // 얼굴은 구슬 눈 대신 캔버스로 그린 텍스처 한 장을 머리 앞면에 씌운다.
  // 메시를 늘리지 않고도 눈·코·입·볼터치·수염까지 표현된다.
  face.add(faceCap(spec));

  if (spec.deco === 'ribbon') {
    [[-4.9, 5.2], [4.9, 5.2]].forEach(([x, y]) => {
      const ear = new THREE.Mesh(new THREE.ConeGeometry(2.3, 4.2, 16), mat(0xffffff));
      ear.position.set(x, y, -0.4);
      ear.rotation.z = x < 0 ? 0.26 : -0.26;
      head.add(ear);
    });
    const r = new THREE.Mesh(new THREE.TorusGeometry(2.0, 0.95, 10, 16), mat(0xff5c8a));
    r.position.set(5.4, 5.0, 1.2); r.rotation.y = 0.4; head.add(r);
    const rc = new THREE.Mesh(new THREE.SphereGeometry(0.95, 12, 10), mat(0xff8fb4));
    rc.position.set(5.4, 5.0, 1.2); head.add(rc);
  } else if (spec.deco === 'hood') {
    // 후드 밑단이 눈 아래까지 내려오면 얼굴이 통째로 가려진다. 위쪽만 감싼다.
    const hood = new THREE.Mesh(new THREE.SphereGeometry(6.6, 16, 12, 0, Math.PI * 2, 0, Math.PI * 0.46), mat(spec.trim));
    hood.position.set(0, 1.0, -0.5); head.add(hood);
    [[-4.6, 6.6], [4.6, 6.6]].forEach(([x, y]) => {
      const ear = new THREE.Mesh(new THREE.CapsuleGeometry(1.8, 5, 4, 8), mat(spec.trim));
      ear.position.set(x, y, 0); ear.rotation.z = x < 0 ? 0.4 : -0.4; head.add(ear);
    });
  } else if (spec.deco === 'ears') {
    [[-6.6, 1.4], [6.6, 1.4]].forEach(([x, y]) => {
      const ear = new THREE.Mesh(new THREE.CapsuleGeometry(2.2, 6, 4, 8), mat(0xffffff));
      ear.position.set(x, y, 0); ear.rotation.z = x < 0 ? 0.75 : -0.75; head.add(ear);
    });
  } else if (spec.deco === 'skull') {
    // 후드는 얼굴을 덮지 않고 위쪽만 감싼다. 예전에는 밑단이 눈 아래까지 내려와
    // 얼굴이 통째로 가려졌다.
    const hood = new THREE.Mesh(new THREE.SphereGeometry(6.6, 16, 12, 0, Math.PI * 2, 0, Math.PI * 0.46), mat(0x3d3350));
    hood.position.set(0, 1.0, -0.5); head.add(hood);
    const skull = new THREE.Mesh(new THREE.SphereGeometry(1.9, 10, 8), mat(0xff9ec4));
    skull.position.set(0, 4.6, 4.6); head.add(skull);
    [[-5, 6.8], [5, 6.8]].forEach(([x, y]) => {
      const ear = new THREE.Mesh(new THREE.ConeGeometry(2.4, 4.4, 4), mat(0x3d3350));
      ear.position.set(x, y, 0); head.add(ear);
    });
  } else if (spec.deco === 'pup') {
    [[-6.2, 2.6], [6.2, 2.6]].forEach(([x, y]) => {
      const ear = new THREE.Mesh(new THREE.SphereGeometry(2.7, 8, 6), mat(spec.trim));
      ear.scale.set(0.8, 1.3, 0.8);
      ear.position.set(x, y, 0); head.add(ear);
    });
  } else if (spec.deco === 'purin') {
    // 폼폼푸린: 갈색 베레모, 늘어진 귀
    face.scale.set(1.2, 0.95, 1);
    // 베레모: 납작하게 얹어 귀가 가려지지 않게
    const beret = new THREE.Mesh(
      new THREE.SphereGeometry(6.4, 16, 10, 0, Math.PI * 2, 0, Math.PI * 0.5), mat(spec.trim));
    beret.position.set(0, 3.1, -0.4); beret.scale.set(1.05, 0.42, 1.05);
    beret.rotation.x = -0.12; head.add(beret);
    const brim = new THREE.Mesh(new THREE.CylinderGeometry(6.6, 6.6, 0.7, 18), mat(spec.trim));
    brim.position.set(0, 3.0, -0.4); brim.rotation.x = -0.12; head.add(brim);
    const knob = new THREE.Mesh(new THREE.SphereGeometry(1.1, 8, 6), mat(0x6b4a28));
    knob.position.set(0, 5.6, -0.4); head.add(knob);
    // 늘어진 귀: 옆으로 벌리고 아래로 처지게
    [-1, 1].forEach(sgn => {
      const ear = new THREE.Mesh(new THREE.SphereGeometry(3.4, 12, 10), mat(0xf3c85a));
      ear.scale.set(0.62, 1.5, 0.95);
      ear.position.set(sgn * 5.9, -2.1, -0.2);
      ear.rotation.z = sgn * 0.42; head.add(ear);
    });
  } else {
    // 구데타마: 노른자
    face.scale.set(1.25, 0.9, 1.05);
    face.material = mat(0xffe27a);
    const white = new THREE.Mesh(new THREE.SphereGeometry(8.6, 14, 10), mat(0xfffcf0));
    white.scale.set(1.25, 0.28, 1.15);
    white.position.y = -4.4; head.add(white);
  }

  head.position.set(0, 15.4, -3.4);
  g.add(head);

  g.userData = { wheels, head, spec, steerWheel };
  return g;
}

// ---------- 얼굴 텍스처 ----------
const faceCache = new Map();

function faceTexture(spec) {
  if (faceCache.has(spec.id)) return faceCache.get(spec.id);
  const S = 512;
  const cv = document.createElement('canvas');
  cv.width = cv.height = S;
  const c = cv.getContext('2d');
  const X = n => n * S, Y = n => n * S;
  const INK = '#1b1526';

  function ellipse(nx, ny, rx, ry, fill, rot) {
    c.save(); c.translate(X(nx), Y(ny)); if (rot) c.rotate(rot);
    c.beginPath(); c.ellipse(0, 0, X(rx), Y(ry), 0, 0, Math.PI * 2);
    c.fillStyle = fill; c.fill(); c.restore();
  }
  function stroke(pts, color, w) {
    c.beginPath(); c.moveTo(X(pts[0][0]), Y(pts[0][1]));
    if (pts.length === 3) c.quadraticCurveTo(X(pts[1][0]), Y(pts[1][1]), X(pts[2][0]), Y(pts[2][1]));
    else for (let i = 1; i < pts.length; i++) c.lineTo(X(pts[i][0]), Y(pts[i][1]));
    c.strokeStyle = color; c.lineWidth = X(w); c.lineCap = 'round'; c.lineJoin = 'round'; c.stroke();
  }
  function blush(nx, ny, tint, r) {
    r = r || 0.078;
    const g = c.createRadialGradient(X(nx), Y(ny), 0, X(nx), Y(ny), X(r));
    g.addColorStop(0, tint); g.addColorStop(0.62, tint.replace(/[\d.]+\)$/, '0.35)'));
    g.addColorStop(1, tint.replace(/[\d.]+\)$/, '0)'));
    c.fillStyle = g; c.beginPath(); c.arc(X(nx), Y(ny), X(r), 0, Math.PI * 2); c.fill();
  }
  // 눈: 살짝 입체감 있는 검은자 + 큰 하이라이트 + 작은 반사점
  function eye(nx, ny, rx, ry, rot, tint) {
    c.save(); c.translate(X(nx), Y(ny)); if (rot) c.rotate(rot);
    const g = c.createRadialGradient(-X(rx) * 0.3, -Y(ry) * 0.35, 0, 0, 0, X(rx) * 1.35);
    g.addColorStop(0, tint || '#3b3152'); g.addColorStop(1, INK);
    c.beginPath(); c.ellipse(0, 0, X(rx), Y(ry), 0, 0, Math.PI * 2);
    c.fillStyle = g; c.fill();
    c.beginPath(); c.ellipse(-X(rx) * 0.32, -Y(ry) * 0.40, X(rx) * 0.30, Y(ry) * 0.25, -0.5, 0, Math.PI * 2);
    c.fillStyle = 'rgba(255,255,255,0.96)'; c.fill();
    c.beginPath(); c.ellipse(X(rx) * 0.30, Y(ry) * 0.34, X(rx) * 0.15, Y(ry) * 0.12, 0, 0, Math.PI * 2);
    c.fillStyle = 'rgba(255,255,255,0.55)'; c.fill();
    c.restore();
  }
  // 코: 색면 + 위쪽 하이라이트
  function nose(nx, ny, rx, ry, fill) {
    ellipse(nx, ny, rx, ry, fill);
    ellipse(nx - rx * 0.22, ny - ry * 0.30, rx * 0.34, ry * 0.26, 'rgba(255,255,255,0.45)');
  }

  const EY = 0.435, EX = 0.180, ER = 0.058, ERY = 0.079;

  if (spec.deco === 'ribbon') {                       // 헬로키티
    eye(0.5 - EX, EY, ER, ERY); eye(0.5 + EX, EY, ER, ERY);
    nose(0.5, 0.545, 0.045, 0.032, '#f5bf3a');
    const w = [[0.028, 0.42, -0.035], [0.024, 0.487, 0], [0.028, 0.554, 0.035]];
    w.forEach(([lw, y, dy]) => {
      stroke([[0.312, y], [0.24, y + dy * 0.4], [0.145, y + dy]], INK, lw * 0.42);
      stroke([[0.688, y], [0.76, y + dy * 0.4], [0.855, y + dy]], INK, lw * 0.42);
    });
  } else if (spec.deco === 'hood') {                  // 마이멜로디
    eye(0.5 - EX, EY, ER * 0.94, ERY * 0.94); eye(0.5 + EX, EY, ER * 0.94, ERY * 0.94);
    nose(0.5, 0.545, 0.036, 0.028, '#ff86b0');
    stroke([[0.448, 0.598], [0.5, 0.646], [0.552, 0.598]], INK, 0.013);
    blush(0.252, 0.548, 'rgba(255,138,175,0.62)'); blush(0.748, 0.548, 'rgba(255,138,175,0.62)');
  } else if (spec.deco === 'ears') {                  // 시나모롤
    eye(0.5 - 0.196, EY, ER, ERY, 0, '#3d4a6b'); eye(0.5 + 0.196, EY, ER, ERY, 0, '#3d4a6b');
    nose(0.5, 0.545, 0.032, 0.025, '#f2a2bb');
    stroke([[0.452, 0.586], [0.5, 0.624], [0.548, 0.586]], INK, 0.012);
    blush(0.256, 0.548, 'rgba(255,150,180,0.55)'); blush(0.744, 0.548, 'rgba(255,150,180,0.55)');
  } else if (spec.deco === 'skull') {                 // 쿠로미
    eye(0.5 - EX, EY + 0.004, ER * 0.96, ERY * 0.9, -0.26);
    eye(0.5 + EX, EY + 0.004, ER * 0.96, ERY * 0.9, 0.26);
    stroke([[0.262, 0.336], [0.33, 0.300], [0.404, 0.296]], INK, 0.017);
    stroke([[0.738, 0.336], [0.67, 0.300], [0.596, 0.296]], INK, 0.017);
    stroke([[0.428, 0.596], [0.512, 0.634], [0.596, 0.582]], INK, 0.015);
    c.beginPath(); c.moveTo(X(0.566), Y(0.596)); c.lineTo(X(0.592), Y(0.652)); c.lineTo(X(0.612), Y(0.588));
    c.closePath(); c.fillStyle = '#ffffff'; c.fill();
    blush(0.244, 0.556, 'rgba(226,120,190,0.42)');  blush(0.756, 0.556, 'rgba(226,120,190,0.42)');
  } else if (spec.deco === 'pup') {                   // 포차코
    eye(0.5 - EX, EY, ER, ERY); eye(0.5 + EX, EY, ER, ERY);
    nose(0.5, 0.542, 0.050, 0.038, '#241d2e');
    c.beginPath(); c.moveTo(X(0.414), Y(0.592));
    c.quadraticCurveTo(X(0.5), Y(0.706), X(0.586), Y(0.592));
    c.closePath(); c.fillStyle = INK; c.fill();
    ellipse(0.5, 0.648, 0.036, 0.024, '#ff8fae');
    blush(0.248, 0.552, 'rgba(255,150,170,0.5)'); blush(0.752, 0.552, 'rgba(255,150,170,0.5)');
  } else if (spec.deco === 'egg') {                   // 구데타마
    ellipse(0.5 - 0.112, 0.468, 0.028, 0.033, INK);
    ellipse(0.5 + 0.112, 0.468, 0.028, 0.033, INK);
    ellipse(0.5, 0.578, 0.027, 0.034, INK);
    stroke([[0.296, 0.388], [0.35, 0.400], [0.404, 0.412]], INK, 0.012);
    stroke([[0.704, 0.388], [0.65, 0.400], [0.596, 0.412]], INK, 0.012);
  } else {                                            // 폼폼푸린
    eye(0.5 - EX, EY, ER, ERY); eye(0.5 + EX, EY, ER, ERY);
    nose(0.5, 0.540, 0.048, 0.036, '#5a3a1c');
    stroke([[0.5, 0.570], [0.5, 0.602]], '#5a3a1c', 0.013);
    stroke([[0.412, 0.596], [0.456, 0.646], [0.5, 0.604]], '#5a3a1c', 0.015);
    stroke([[0.588, 0.596], [0.544, 0.646], [0.5, 0.604]], '#5a3a1c', 0.015);
    blush(0.248, 0.556, 'rgba(255,150,150,0.5)'); blush(0.752, 0.556, 'rgba(255,150,150,0.5)');
  }

  const tex = new THREE.CanvasTexture(cv);
  tex.anisotropy = 8;
  faceCache.set(spec.id, tex);
  return tex;
}

// 머리 구(반지름 5.2)의 앞면에 살짝 띄워 씌우는 얼굴판.
// face 의 자식이라 캐릭터별 얼굴 찌그러짐(scale)을 그대로 따라가고,
// Lambert 라서 머리와 같은 광원으로 음영이 이어진다(Basic 이면 붙여놓은 스티커처럼 뜬다).
function faceCap(spec) {
  const D = 1.05, TH = 0.86;
  const geo = new THREE.SphereGeometry(5.2 * 1.012, 40, 28,
    Math.PI / 2 - D, D * 2, Math.PI / 2 - TH, TH * 2);
  const m = new THREE.Mesh(geo, new THREE.MeshLambertMaterial({
    map: faceTexture(spec), transparent: true, depthWrite: false
  }));
  m.renderOrder = 2;
  return m;
}

const GRAV = 260;

export class Kart {
  constructor(spec, track, opts) {
    Object.assign(this, {
      x: 0, y: 0, z: 0, angle: 0, speed: 0,
      vy: 0, airborne: false,
      drift: 0, driftDir: 0, driftCharge: 0,
      boost: 0, spin: 0, slip: 0, shield: 0, magnet: 0,
      lap: 0, progress: 0, total: 0, place: 1,
      finished: false, finishTime: 0,
      item: null, itemCount: 0, itemCooldown: 0,
      isPlayer: false, wheelSpin: 0, lean: 0
    }, opts);
    this.spec = spec;
    this.track = track;
    this.baseTop = spec.top;
    // 차체가 향한 방향(angle)과 실제로 나아가는 방향(vAngle)을 분리한다.
    // 둘이 벌어진 만큼이 곧 미끄러짐이다.
    this.vAngle = this.angle;
  }

  get topSpeed() { return this.baseTop * (this.boost > 0 ? 1.36 : 1); }

  update(dt, input) {
    const T = this.track;
    this.boost = Math.max(0, this.boost - dt);
    this.spin = Math.max(0, this.spin - dt);
    this.slip = Math.max(0, this.slip - dt);
    this.shield = Math.max(0, this.shield - dt);
    this.magnet = Math.max(0, this.magnet - dt);
    this.itemCooldown = Math.max(0, this.itemCooldown - dt);

    const surf = T.sample(this.x, this.z);

    let cap = this.topSpeed;
    if (surf.kind === 'grass') cap *= 0.5;
    else if (surf.kind === 'shortcut') cap *= 0.88;

    // 가속 자동
    const accel = this.spec.accel * 42;
    this.speed += (cap - this.speed) * Math.min(1, accel / Math.max(1, cap) * dt);

    let steer = input.steer || 0;
    if (this.slip > 0) steer += Math.sin(this.slip * 17) * 0.7;

    // 드리프트: 한 번 걸리면 버튼을 놓을 때까지 방향이 고정된다.
    // 예전에는 |steer|>0.25 를 매 프레임 요구해서, 키를 잠깐만 떼도 드리프트가
    // 끊기고 미니부스터가 제멋대로 터졌다.
    const canDrift = !this.airborne && this.speed > this.baseTop * 0.45;
    if (input.drift && canDrift && (this.drift > 0 || Math.abs(steer) > 0.25)) {
      if (this.drift <= 0) this.driftDir = Math.sign(steer) || 0;
      if (this.driftDir !== 0) {
        this.drift += dt;
        this.driftCharge = Math.min(1.9, this.driftCharge + dt);
        // 안쪽으로 자동으로 조금 감기되, 조작이 항상 우선한다.
        // 최소각을 강제하면 카운터 스티어가 먹히지 않아 코스 밖으로 카브해버린다.
        steer = Math.max(-1, Math.min(1, steer + this.driftDir * 0.35));
      }
    } else if (this.drift > 0) {
      if (this.driftCharge > 0.6) {
        this.boost = Math.max(this.boost, this.driftCharge > 1.3 ? 1.4 : 0.85);
      }
      this.drift = 0; this.driftCharge = 0; this.driftDir = 0;
    }

    // 차체 회전
    if (this.spin > 0) {
      this.angle += dt * 8;
      this.speed *= 1 - dt * 0.85;
    } else if (!this.airborne) {
      const grip = this.spec.turn * (this.drift > 0 ? 1.25 : 1);
      const sf = 0.58 + 0.42 * (1 - Math.min(1, this.speed / this.baseTop));
      // steer +1 = 화면 오른쪽. 카메라가 +Z를 바라보므로 화면 오른쪽은 월드 -X 방향이라
      // 각도를 "빼야" 화면과 손이 일치한다.
      this.angle -= steer * grip * sf * dt;
    }

    // 진행 방향은 차체를 뒤따라온다. 드리프트 중에는 느리게 따라와 실제로 옆으로 미끄러지고,
    // 공중에서는 거의 따라오지 않아 착지할 때까지 관성이 남는다.
    let dA = this.angle - this.vAngle;
    while (dA > Math.PI) dA -= Math.PI * 2;
    while (dA < -Math.PI) dA += Math.PI * 2;
    const chase = this.airborne ? 1.2 : (this.drift > 0 ? 2.9 : 12);
    this.vAngle += dA * Math.min(1, chase * dt);
    this.slipAngle = dA;

    this.lean += ((this.drift > 0 ? this.driftDir * 0.9 : steer * 0.35) - this.lean) * Math.min(1, dt * 8);

    // 이동
    this.x += Math.sin(this.vAngle) * this.speed * dt;
    this.z += Math.cos(this.vAngle) * this.speed * dt;

    // 높이: 지면 따라가기 + 점프
    const groundY = T.sample(this.x, this.z).y;
    if (this.airborne) {
      this.vy -= GRAV * dt;
      this.y += this.vy * dt;
      if (this.y <= groundY) { this.y = groundY; this.vy = 0; this.airborne = false; }
    } else {
      this.y += (groundY - this.y) * Math.min(1, dt * 12);
      // 점프대
      for (const r of T.ramps) {
        const p = r.p;
        if (Math.hypot(this.x - p.x, this.z - p.z) < 26 && this.speed > this.baseTop * 0.5) {
          this.airborne = true;
          this.vy = 78 + this.speed * 0.24;
          break;
        }
      }
      if (input.jump && !this.airborne) {
        this.airborne = true;
        this.vy = 58;
      }
    }

    this.wheelSpin += this.speed * dt * 0.16;
  }

  updateProgress(totalLaps) {
    const T = this.track;
    const near = T.nearest(this.x, this.z);
    const raw = near.p.dist;
    const half = T.length * 0.5;
    let delta = raw - this.progress;
    if (delta < -half) this.lap++;
    else if (delta > half) this.lap--;
    this.progress = raw;
    this.total = this.lap * T.length + raw;
    return this.lap >= totalLaps && !this.finished;
  }

  applyToModel(model) {
    model.position.set(this.x, this.y, this.z);
    model.rotation.y = this.angle;
    model.rotation.z = -this.lean * 0.18;
    const d = model.userData;
    if (d && d.wheels) d.wheels.forEach(w => { w.rotation.x = this.wheelSpin; });
    if (d && d.head) d.head.position.y = 15.4 + Math.sin(this.wheelSpin * 2) * 0.35;
    // 핸들은 조향을 따라 돈다. lean 은 이미 조향을 부드럽게 따라가는 값이다.
    if (d && d.steerWheel) d.steerWheel.rotation.y = -this.lean * 0.9;
  }
}

// AI — 거리 기준 앞보기(인덱스로 보면 커브를 가로지른다)
export function driveAI(kart, playerTotal) {
  const T = kart.track;
  const near = T.nearest(kart.x, kart.z);
  let ahead = 40 + kart.speed * 0.42;
  if (near.dist > T.roadHalf) ahead = 34;
  ahead = Math.min(110, ahead);

  const n = T.points.length;
  let i = near.index, walked = 0;
  while (walked < ahead) {
    const a = T.points[i], b = T.points[(i + 1) % n];
    walked += Math.hypot(b.x - a.x, b.z - a.z);
    i = (i + 1) % n;
  }
  const tgt = T.points[i];
  const want = Math.atan2(tgt.x - kart.x, tgt.z - kart.z);
  let diff = want - kart.angle;
  while (diff > Math.PI) diff -= Math.PI * 2;
  while (diff < -Math.PI) diff += Math.PI * 2;

  // 고무줄: 앞설수록 점점 느긋해지고, 뒤처지면 조금 힘을 낸다.
  // 아이가 꼴찌로 끝나 기분 상하는 일을 줄이는 장치다.
  const gap = kart.total - playerTotal;
  // 아이 상대라 AI는 완벽하게 몰지 않는다. 고무줄과 합쳐 접전을 만든다.
  let mult = 0.965;
  if (gap > 55) mult = Math.max(0.72, 0.965 - (gap - 55) / 520);
  else if (gap < -140) mult = Math.min(1.05, 0.965 + (-gap - 140) / 1600);
  if (Math.abs(diff) > 0.5) mult *= 0.84;
  kart.baseTop = kart.spec.top * mult;

  return {
    steer: Math.max(-1, Math.min(1, -diff * 2.4)),
    drift: Math.abs(diff) > 0.42 && Math.abs(diff) < 1.1 && kart.speed > kart.baseTop * 0.6,
    jump: false
  };
}
