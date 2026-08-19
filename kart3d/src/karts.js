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
  const eye = new THREE.SphereGeometry(0.85, 8, 6);
  const eyeMat = mat(0x3d3350);
  [-2.4, 2.4].forEach(x => {
    const e = new THREE.Mesh(eye, eyeMat);
    e.position.set(x, 0.6, 5.7);
    head.add(e);
  });

  if (spec.deco === 'ribbon') {
    const r = new THREE.Mesh(new THREE.TorusGeometry(2.3, 1.1, 6, 10), mat(0xff5c8a));
    r.position.set(5, 4, 1); head.add(r);
    [[-5.6, 5.4], [5.6, 5.4]].forEach(([x, y]) => {
      const ear = new THREE.Mesh(new THREE.ConeGeometry(2.6, 4.6, 4), mat(0xffffff));
      ear.position.set(x, y, 0); head.add(ear);
    });
  } else if (spec.deco === 'hood') {
    const hood = new THREE.Mesh(new THREE.SphereGeometry(6.9, 14, 10, 0, Math.PI * 2, 0, Math.PI * 0.62), mat(spec.trim));
    hood.position.y = 0.4; head.add(hood);
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
    const hood = new THREE.Mesh(new THREE.SphereGeometry(6.9, 14, 10, 0, Math.PI * 2, 0, Math.PI * 0.6), mat(0x3d3350));
    hood.position.y = 0.5; head.add(hood);
    const skull = new THREE.Mesh(new THREE.SphereGeometry(2, 8, 6), mat(0xff9ec4));
    skull.position.set(0, 4.4, 5.2); head.add(skull);
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

    // 조향
    let steer = input.steer || 0;
    if (this.spin > 0) {
      this.angle += dt * 8;
      this.speed *= 1 - dt * 0.85;
    } else if (!this.airborne) {
      if (this.slip > 0) steer += Math.sin(this.slip * 17) * 0.7;
      const grip = this.spec.turn * (this.drift > 0 ? 1.45 : 1);
      const sf = 0.58 + 0.42 * (1 - Math.min(1, this.speed / this.baseTop));
      // steer +1 = 화면 오른쪽. 카메라가 +Z를 바라보므로 화면 오른쪽은 월드 -X 방향이라
      // 각도를 "빼야" 화면과 손이 일치한다.
      this.angle -= steer * grip * sf * dt;
    }

    // 드리프트 충전
    if (input.drift && !this.airborne && Math.abs(steer) > 0.25 && this.speed > this.baseTop * 0.45) {
      if (this.drift <= 0) this.driftDir = Math.sign(steer);
      this.drift += dt;
      this.driftCharge = Math.min(1.9, this.driftCharge + dt);
    } else if (this.drift > 0) {
      if (this.driftCharge > 0.55) {
        this.boost = Math.max(this.boost, this.driftCharge > 1.25 ? 1.4 : 0.85);
      }
      this.drift = 0; this.driftCharge = 0; this.driftDir = 0;
    }
    this.lean += ((this.drift > 0 ? this.driftDir * 0.9 : steer * 0.35) - this.lean) * Math.min(1, dt * 8);

    // 이동
    this.x += Math.sin(this.angle) * this.speed * dt;
    this.z += Math.cos(this.angle) * this.speed * dt;

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
    model.rotation.y = this.angle - (this.drift > 0 ? this.driftDir * 0.32 : 0);
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
