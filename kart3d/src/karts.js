// 산리오 카트 3D — 캐릭터, 카트 모델, 물리
import * as THREE from '../vendor/three.module.min.js';

export const CHARACTERS = [
  { id: 'kitty',  name: '헬로키티',   body: 0xff8fb4, trim: 0xffffff, top: 118, accel: 2.6, turn: 2.35, deco: 'ribbon' },
  { id: 'melody', name: '마이멜로디', body: 0xffc2dd, trim: 0xff7aa8, top: 114, accel: 2.9, turn: 2.6,  deco: 'hood' },
  { id: 'cinna',  name: '시나모롤',   body: 0xbfe4ff, trim: 0x7fc4e8, top: 122, accel: 2.4, turn: 2.2,  deco: 'ears' },
  { id: 'kuromi', name: '쿠로미',     body: 0xc9b2e8, trim: 0x3d3350, top: 126, accel: 2.3, turn: 2.15, deco: 'skull' },
  { id: 'pochaco',name: '포차코',     body: 0xffffff, trim: 0x8fd0ff, top: 116, accel: 2.7, turn: 2.45, deco: 'pup' },
  { id: 'gude',   name: '구데타마',   body: 0xffe27a, trim: 0xfff3c4, top: 110, accel: 3.1, turn: 2.75, deco: 'egg' },
  { id: 'purin',  name: '폼폼푸린',   body: 0xffe27a, trim: 0x8a5a33, top: 120, accel: 2.55, turn: 2.4, deco: 'purin' }
];

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
  const face = new THREE.Mesh(new THREE.SphereGeometry(5.2, 16, 12), mat(0xffffff));
  face.scale.set(1.15, 1, 0.95);
  head.add(face);
  // 얼굴은 구슬 눈 대신 캔버스로 그린 텍스처 한 장을 머리 앞면에 씌운다.
  // 메시를 늘리지 않고도 눈·코·입·볼터치·수염까지 표현된다.
  face.add(faceCap(spec));

  if (spec.deco === 'ribbon') {
    [[-5.2, 5.6], [5.2, 5.6]].forEach(([x, y]) => {
      const ear = new THREE.Mesh(new THREE.ConeGeometry(2.5, 4.8, 14), mat(0xffffff));
      ear.position.set(x, y, -0.6);
      ear.rotation.z = x < 0 ? 0.22 : -0.22;
      head.add(ear);
    });
    const r = new THREE.Mesh(new THREE.TorusGeometry(2.2, 1.05, 8, 14), mat(0xff5c8a));
    r.position.set(6.6, 6.4, 0.4); r.rotation.y = 0.35; head.add(r);
    const rc = new THREE.Mesh(new THREE.SphereGeometry(1.05, 10, 8), mat(0xff8fb4));
    rc.position.set(6.6, 6.4, 0.4); head.add(rc);
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
    const nose2 = new THREE.Mesh(new THREE.SphereGeometry(1.5, 8, 6), mat(0x3d3350));
    nose2.position.set(0, -1.2, 6.2); head.add(nose2);
  } else if (spec.deco === 'purin') {
    // 폼폼푸린: 노란 얼굴에 갈색 베레모, 늘어진 귀
    face.material = mat(0xffe27a);
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
    const snout = new THREE.Mesh(new THREE.SphereGeometry(2.1, 10, 8), mat(0xfff0b8));
    snout.scale.set(1.2, 0.85, 0.8);
    snout.position.set(0, -1.6, 5.2); head.add(snout);
    const nose3 = new THREE.Mesh(new THREE.SphereGeometry(0.9, 8, 6), mat(0x6b4a28));
    nose3.position.set(0, -1.1, 6.6); head.add(nose3);
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

  g.userData = { wheels, head, spec };
  return g;
}

// ---------- 얼굴 텍스처 ----------
const faceCache = new Map();

function faceTexture(spec) {
  if (faceCache.has(spec.id)) return faceCache.get(spec.id);
  const S = 256;
  const cv = document.createElement('canvas');
  cv.width = cv.height = S;
  const c = cv.getContext('2d');
  const X = n => n * S, Y = n => n * S;
  const ink = '#241d33';

  function ellipse(nx, ny, rx, ry, fill, rot) {
    c.save(); c.translate(X(nx), Y(ny)); if (rot) c.rotate(rot);
    c.beginPath(); c.ellipse(0, 0, X(rx), Y(ry), 0, 0, Math.PI * 2);
    c.fillStyle = fill; c.fill(); c.restore();
  }
  function stroke(pts, color, w, cap) {
    c.beginPath(); c.moveTo(X(pts[0][0]), Y(pts[0][1]));
    for (let i = 1; i < pts.length; i++) c.lineTo(X(pts[i][0]), Y(pts[i][1]));
    c.strokeStyle = color; c.lineWidth = X(w); c.lineCap = cap || 'round'; c.stroke();
  }
  function arc(nx, ny, r, a0, a1, color, w) {
    c.beginPath(); c.arc(X(nx), Y(ny), X(r), a0, a1);
    c.strokeStyle = color; c.lineWidth = X(w); c.lineCap = 'round'; c.stroke();
  }
  function blush(nx, ny, tint) {
    const g = c.createRadialGradient(X(nx), Y(ny), 0, X(nx), Y(ny), X(0.075));
    g.addColorStop(0, tint); g.addColorStop(1, 'rgba(255,150,175,0)');
    c.fillStyle = g; c.beginPath(); c.arc(X(nx), Y(ny), X(0.075), 0, Math.PI * 2); c.fill();
  }
  // 눈: 세로 타원 + 흰 하이라이트
  function eye(nx, ny, rx, ry, rot) {
    ellipse(nx, ny, rx, ry, ink, rot);
    ellipse(nx - rx * 0.33, ny - ry * 0.40, rx * 0.26, ry * 0.22, 'rgba(255,255,255,0.95)');
  }

  const EY = 0.44, EX = 0.175;   // 눈 높이 / 중심에서의 좌우 간격

  if (spec.deco === 'ribbon') {           // 헬로키티
    eye(0.5 - EX, EY, 0.052, 0.072);
    eye(0.5 + EX, EY, 0.052, 0.072);
    ellipse(0.5, 0.545, 0.042, 0.030, '#f7c948');
    [[0.30, 0.44], [0.28, 0.50], [0.30, 0.56]].forEach(([x, y]) => stroke([[x, y], [x - 0.16, y - 0.02]], ink, 0.012));
    [[0.70, 0.44], [0.72, 0.50], [0.70, 0.56]].forEach(([x, y]) => stroke([[x, y], [x + 0.16, y - 0.02]], ink, 0.012));
  } else if (spec.deco === 'hood') {      // 마이멜로디
    eye(0.5 - EX, EY, 0.048, 0.068);
    eye(0.5 + EX, EY, 0.048, 0.068);
    ellipse(0.5, 0.545, 0.034, 0.026, '#ff86b0');
    stroke([[0.455, 0.60], [0.5, 0.635], [0.545, 0.60]], ink, 0.013);
    blush(0.255, 0.55, 'rgba(255,140,175,0.55)'); blush(0.745, 0.55, 'rgba(255,140,175,0.55)');
  } else if (spec.deco === 'ears') {      // 시나모롤
    eye(0.5 - 0.195, EY, 0.050, 0.070);
    eye(0.5 + 0.195, EY, 0.050, 0.070);
    ellipse(0.5, 0.545, 0.030, 0.023, '#f6a8bf');
    arc(0.5, 0.575, 0.052, 0.25 * Math.PI, 0.75 * Math.PI, ink, 0.013);
    blush(0.26, 0.55, 'rgba(255,150,180,0.5)'); blush(0.74, 0.55, 'rgba(255,150,180,0.5)');
  } else if (spec.deco === 'skull') {     // 쿠로미
    eye(0.5 - EX, EY + 0.005, 0.050, 0.066, -0.28);
    eye(0.5 + EX, EY + 0.005, 0.050, 0.066, 0.28);
    stroke([[0.26, 0.345], [0.40, 0.305]], ink, 0.016);
    stroke([[0.74, 0.345], [0.60, 0.305]], ink, 0.016);
    stroke([[0.44, 0.60], [0.52, 0.625], [0.60, 0.585]], ink, 0.014);
    c.beginPath(); c.moveTo(X(0.575), Y(0.60)); c.lineTo(X(0.60), Y(0.655)); c.lineTo(X(0.615), Y(0.598));
    c.closePath(); c.fillStyle = '#ffffff'; c.fill();
  } else if (spec.deco === 'pup') {       // 포차코
    eye(0.5 - EX, EY, 0.052, 0.070);
    eye(0.5 + EX, EY, 0.052, 0.070);
    ellipse(0.5, 0.545, 0.048, 0.036, ink);
    c.beginPath(); c.moveTo(X(0.42), Y(0.60)); c.quadraticCurveTo(X(0.5), Y(0.70), X(0.58), Y(0.60));
    c.closePath(); c.fillStyle = ink; c.fill();
    ellipse(0.5, 0.645, 0.032, 0.020, '#ff9bb4');
  } else if (spec.deco === 'egg') {       // 구데타마
    ellipse(0.5 - 0.115, 0.47, 0.026, 0.030, ink);
    ellipse(0.5 + 0.115, 0.47, 0.026, 0.030, ink);
    ellipse(0.5, 0.575, 0.026, 0.032, ink);
    stroke([[0.30, 0.395], [0.40, 0.415]], ink, 0.011);
    stroke([[0.70, 0.395], [0.60, 0.415]], ink, 0.011);
  } else {                                // 폼폼푸린
    eye(0.5 - EX, EY, 0.052, 0.070);
    eye(0.5 + EX, EY, 0.052, 0.070);
    ellipse(0.5, 0.545, 0.046, 0.034, '#5c3a1e');
    stroke([[0.5, 0.575], [0.5, 0.605]], '#5c3a1e', 0.012);
    arc(0.452, 0.605, 0.048, 0, Math.PI, '#5c3a1e', 0.014);
    arc(0.548, 0.605, 0.048, 0, Math.PI, '#5c3a1e', 0.014);
    blush(0.255, 0.56, 'rgba(255,150,150,0.45)'); blush(0.745, 0.56, 'rgba(255,150,150,0.45)');
  }

  const tex = new THREE.CanvasTexture(cv);
  tex.anisotropy = 4;
  faceCache.set(spec.id, tex);
  return tex;
}

// 머리 구(반지름 5.2)의 앞면에 살짝 띄워 씌우는 얼굴판.
// face 의 자식으로 붙이므로 캐릭터별 얼굴 찌그러짐(scale)을 그대로 따라간다.
function faceCap(spec) {
  const D = 1.05, TH = 0.86;
  const geo = new THREE.SphereGeometry(5.2 * 1.015, 28, 20,
    Math.PI / 2 - D, D * 2, Math.PI / 2 - TH, TH * 2);
  const m = new THREE.Mesh(geo, new THREE.MeshBasicMaterial({
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
