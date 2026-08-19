// 산리오 카트 — 카트 물리와 AI
// 8세 기준: 가속은 자동, 아이는 방향만 신경 쓴다. 절대 뒤집히거나 멈추지 않는다.
(function () {
  'use strict';
  window.SK = window.SK || {};

  const CHARACTERS = [
    { id: 'kitty',  name: '헬로키티',   color: '#ff8fb4', accent: '#ffffff', fur: '#ffffff', top: 405, accel: 2.5, turn: 2.5 },
    { id: 'melody', name: '마이멜로디', color: '#ffc2dd', accent: '#ff7aa8', fur: '#ffffff', top: 392, accel: 2.8, turn: 2.75 },
    { id: 'cinna',  name: '시나모롤',   color: '#bfe4ff', accent: '#7fc4e8', fur: '#ffffff', top: 418, accel: 2.3, turn: 2.35 },
    { id: 'kuromi', name: '쿠로미',     color: '#c9b2e8', accent: '#3d3350', fur: '#ffffff', top: 425, accel: 2.2, turn: 2.3 },
    { id: 'pochaco', name: '포차코',    color: '#ffffff', accent: '#8fd0ff', fur: '#ffffff', top: 400, accel: 2.6,  turn: 2.6 },
    { id: 'gude',    name: '구데타마',  color: '#ffe27a', accent: '#fff3c4', fur: '#ffe27a', top: 380, accel: 3.0,  turn: 2.9 },
    { id: 'purin',   name: '폼폼푸린',  color: '#ffe27a', accent: '#8a5a33', fur: '#ffe27a', top: 412, accel: 2.45, turn: 2.55 }
  ];
  SK.CHARACTERS = CHARACTERS;

  class Kart {
    constructor(spec, opts) {
      Object.assign(this, {
        x: 0, y: 0, angle: 0, vAngle: 0, speed: 0, slipAngle: 0,
        drift: 0, driftDir: 0, driftCharge: 0,
        boost: 0, spin: 0, slip: 0,
        lap: 0, progress: 0, prevProgress: 0, place: 1,
        finished: false, finishTime: 0,
        item: null, itemCooldown: 0,
        isPlayer: false, bob: 0
      }, opts);
      this.spec = spec;
      this.baseTop = spec.top;
      // 차체 방향(angle)과 진행 방향(vAngle)의 차이가 곧 미끄러짐이다
      this.vAngle = this.angle;
    }

    get topSpeed() {
      return this.baseTop * (this.boost > 0 ? 1.34 : 1);
    }

    // surface: 'road' | 'shortcut' | 'grass'
    update(dt, input, surface) {
      const T = SK.Track;

      this.boost = Math.max(0, this.boost - dt);
      this.spin = Math.max(0, this.spin - dt);
      this.slip = Math.max(0, this.slip - dt);
      this.itemCooldown = Math.max(0, this.itemCooldown - dt);

      // 지면에 따른 최고속 — 풀밭은 느려지기만 하고 멈추지는 않는다
      let cap = this.topSpeed;
      if (surface === 'grass') cap *= 0.52;
      else if (surface === 'shortcut') cap *= 0.86;

      // 가속은 자동
      const accel = this.spec.accel * 100;
      this.speed += (cap - this.speed) * Math.min(1, accel / Math.max(1, cap) * dt);
      if (this.speed > cap) this.speed += (cap - this.speed) * Math.min(1, dt * 3.2);

      let steer = input.steer || 0;
      if (this.slip > 0) steer += Math.sin(this.slip * 18) * 0.7;   // 미끄럼 아이템

      // 드리프트: 한 번 걸리면 버튼을 놓을 때까지 방향이 고정된다.
      // 예전에는 |steer|>0.25 를 매 프레임 요구해서, 키를 잠깐만 떼도
      // 드리프트가 끊기고 미니부스터가 제멋대로 터졌다.
      const canDrift = this.speed > this.baseTop * 0.45;
      if (input.drift && canDrift && (this.drift > 0 || Math.abs(steer) > 0.25)) {
        if (this.drift <= 0) this.driftDir = Math.sign(steer) || 0;
        if (this.driftDir !== 0) {
          this.drift += dt;
          this.driftCharge = Math.min(1.8, this.driftCharge + dt);
          // 안쪽으로 자동으로 조금 감기되, 조작이 항상 우선한다
          steer = Math.max(-1, Math.min(1, steer + this.driftDir * 0.35));
        }
      } else if (this.drift > 0) {
        if (this.driftCharge > 0.6) this.boost = Math.max(this.boost, this.driftCharge > 1.3 ? 1.5 : 0.9);
        this.drift = 0; this.driftCharge = 0; this.driftDir = 0;
      }

      // 차체 회전
      if (this.spin > 0) {
        // 부딪히면 잠깐 빙글 — 멈추지는 않는다
        this.angle += dt * 9;
        this.speed *= 1 - dt * 0.9;
      } else {
        const grip = this.spec.turn * (this.drift > 0 ? 1.25 : 1);
        // 느릴 때 더 잘 돌아간다(아이가 코스 복귀하기 쉽게)
        const speedFactor = 0.55 + 0.45 * (1 - Math.min(1, this.speed / this.baseTop));
        this.angle += steer * grip * speedFactor * dt;
      }

      // 진행 방향은 차체를 뒤따라온다. 드리프트 중에는 느리게 따라와 실제로
      // 옆으로 미끄러진다. 예전에는 늘 차체 방향으로만 움직여서 드리프트가
      // "더 날카롭게 도는 것"에 그쳤다.
      let dA = this.angle - this.vAngle;
      while (dA > Math.PI) dA -= Math.PI * 2;
      while (dA < -Math.PI) dA += Math.PI * 2;
      const chase = this.drift > 0 ? 2.9 : 12;
      this.vAngle += dA * Math.min(1, chase * dt);
      this.slipAngle = dA;

      // 이동
      this.x += Math.sin(this.vAngle) * this.speed * dt;
      this.y -= Math.cos(this.vAngle) * this.speed * dt;
      // 트랙 밖으로 아주 멀리 못 나가게 부드럽게 잡아 준다
      const S = T.SIZE;
      this.x = Math.max(40, Math.min(S - 40, this.x));
      this.y = Math.max(40, Math.min(S - 40, this.y));

      this.bob += dt * (6 + this.speed * 0.02);
    }

    // 랩 진행도 갱신. 되돌아가도 랩이 늘지 않게 한 바퀴의 절반 이상 튀면 무시한다.
    updateProgress(totalLaps) {
      const T = SK.Track;
      const near = T.nearest(this.x, this.y);
      const raw = near.point.dist;
      const half = T.length * 0.5;
      const prev = this.progress;
      let delta = raw - prev;
      if (delta < -half) {            // 결승선 통과
        this.lap++;
        delta += T.length;
      } else if (delta > half) {      // 역주행으로 결승선을 거꾸로 넘음
        this.lap--;
        delta -= T.length;
      }
      this.progress = raw;
      this.total = this.lap * T.length + raw;
      if (this.lap >= totalLaps && !this.finished) return true;
      return false;
    }
  }

  SK.Kart = Kart;

  // ---- AI ----
  // 중심선을 "거리 기준"으로 조금만 앞서 본다.
  // 인덱스로 앞을 보면 점 간격에 따라 앞보기 거리가 들쭉날쭉해져 커브를 가로지른다.
  SK.driveAI = function (kart, playerTotal, dt) {
    const T = SK.Track;
    const near = T.nearest(kart.x, kart.y);
    const off = near.dist;

    const n = T.center.length;

    // 중심선을 따라 dist 만큼 전진한 인덱스
    function walk(from, dist) {
      let i = from, w = 0;
      while (w < dist) {
        const a = T.center[i], b = T.center[(i + 1) % n];
        w += Math.hypot(b.x - a.x, b.y - a.y);
        i = (i + 1) % n;
      }
      return i;
    }
    function heading(idx) {
      const a = T.center[idx], b = T.center[(idx + 8) % n];
      return Math.atan2(b.x - a.x, -(b.y - a.y));
    }

    // 앞쪽 코스가 얼마나 휘는지 먼저 잰다.
    // 코너를 만나고 나서 줄이면 이미 늦어서, 헤어핀이나 S자에서 코스를 깎는다.
    let bend = heading(walk(near.index, 300)) - heading(near.index);
    while (bend > Math.PI) bend -= Math.PI * 2;
    while (bend < -Math.PI) bend += Math.PI * 2;
    // 완만한 커브까지 감속하면 전 구간이 느려진다. 문턱을 넘는 급코너에서만 반응한다.
    const curve = Math.min(1, Math.max(0, (Math.abs(bend) - 0.52) / 0.70));

    // 앞보기 거리: 급할수록 가까이 본다. 멀리 보면 코너를 가로질러 버린다.
    let ahead = (90 + kart.speed * 0.28) * (1 - 0.52 * curve);
    if (off > T.ROAD_HALF) ahead = 70;
    ahead = Math.min(210, Math.max(58, ahead));

    // 거리만큼 중심선을 따라 전진한 지점을 찾는다.
    let i = near.index, walked = 0;
    while (walked < ahead) {
      const a = T.center[i], b = T.center[(i + 1) % n];
      walked += Math.hypot(b.x - a.x, b.y - a.y);
      i = (i + 1) % n;
    }
    const target = T.center[i];

    const want = Math.atan2(target.x - kart.x, -(target.y - kart.y));
    let diff = want - kart.angle;
    while (diff > Math.PI) diff -= Math.PI * 2;
    while (diff < -Math.PI) diff += Math.PI * 2;
    const steer = Math.max(-1, Math.min(1, diff * 2.4));

    // 커브가 급하면 스스로 속도를 줄인다(코스를 벗어나지 않게).
    kart.aiBrake = Math.abs(diff) > 0.55 || curve > 0.45;

    // 고무줄: 아이가 뒤처지면 AI가 살짝 느긋해진다
    const gap = kart.total - playerTotal;
    let mult = 1 - 0.34 * curve;            // 코너 진입 전에 미리 감속
    if (gap > 900) mult *= 0.84;
    else if (gap < -900) mult *= 1.06;
    if (Math.abs(diff) > 0.55) mult *= 0.86;
    kart.baseTop = kart.spec.top * mult;

    return { steer, drift: Math.abs(diff) > 0.45 && Math.abs(diff) < 1.1 && kart.speed > kart.baseTop * 0.62 };
  };
})();
