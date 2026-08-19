// 산리오 카트 — 카트 물리와 AI
// 8세 기준: 가속은 자동, 아이는 방향만 신경 쓴다. 절대 뒤집히거나 멈추지 않는다.
(function () {
  'use strict';
  window.SK = window.SK || {};

  const CHARACTERS = [
    { id: 'kitty',  name: '헬로키티',   color: '#ff8fb4', accent: '#ffffff', top: 405, accel: 2.5, turn: 2.5 },
    { id: 'melody', name: '마이멜로디', color: '#ffc2dd', accent: '#ff7aa8', top: 392, accel: 2.8, turn: 2.75 },
    { id: 'cinna',  name: '시나모롤',   color: '#bfe4ff', accent: '#7fc4e8', top: 418, accel: 2.3, turn: 2.35 },
    { id: 'kuromi', name: '쿠로미',     color: '#c9b2e8', accent: '#3d3350', top: 425, accel: 2.2, turn: 2.3 }
  ];
  SK.CHARACTERS = CHARACTERS;

  class Kart {
    constructor(spec, opts) {
      Object.assign(this, {
        x: 0, y: 0, angle: 0, speed: 0,
        drift: 0, driftDir: 0, driftCharge: 0,
        boost: 0, spin: 0, slip: 0,
        lap: 0, progress: 0, prevProgress: 0, place: 1,
        finished: false, finishTime: 0,
        item: null, itemCooldown: 0,
        isPlayer: false, bob: 0
      }, opts);
      this.spec = spec;
      this.baseTop = spec.top;
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

      // 조향
      let steer = input.steer || 0;
      if (this.spin > 0) {
        // 부딪히면 잠깐 빙글 — 멈추지는 않는다
        this.angle += dt * 9;
        this.speed *= 1 - dt * 0.9;
      } else {
        if (this.slip > 0) steer += Math.sin(this.slip * 18) * 0.7;   // 미끄럼 아이템
        const grip = this.spec.turn * (this.drift > 0 ? 1.5 : 1);
        // 느릴 때 더 잘 돌아간다(아이가 코스 복귀하기 쉽게)
        const speedFactor = 0.55 + 0.45 * (1 - Math.min(1, this.speed / this.baseTop));
        this.angle += steer * grip * speedFactor * dt;
      }

      // 드리프트: 누르고 돌면 충전, 떼면 부스터
      if (input.drift && Math.abs(steer) > 0.25 && this.speed > this.baseTop * 0.45) {
        if (this.drift <= 0) this.driftDir = Math.sign(steer);
        this.drift += dt;
        this.driftCharge = Math.min(1.8, this.driftCharge + dt);
      } else if (this.drift > 0) {
        if (this.driftCharge > 0.6) this.boost = Math.max(this.boost, this.driftCharge > 1.3 ? 1.5 : 0.9);
        this.drift = 0; this.driftCharge = 0; this.driftDir = 0;
      }

      // 이동
      this.x += Math.sin(this.angle) * this.speed * dt;
      this.y -= Math.cos(this.angle) * this.speed * dt;
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

    // 앞보기 거리: 최소 곡률반경(약 350px)보다 짧게 유지한다.
    // 코스를 벗어났으면 더 가까이 보고 빨리 돌아온다.
    let ahead = 90 + kart.speed * 0.28;
    if (off > T.ROAD_HALF) ahead = 70;
    ahead = Math.min(210, ahead);

    // 거리만큼 중심선을 따라 전진한 지점을 찾는다.
    const n = T.center.length;
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
    kart.aiBrake = Math.abs(diff) > 0.55;

    // 고무줄: 아이가 뒤처지면 AI가 살짝 느긋해진다
    const gap = kart.total - playerTotal;
    let mult = 1;
    if (gap > 900) mult = 0.84;
    else if (gap < -900) mult = 1.06;
    if (kart.aiBrake) mult *= 0.82;
    kart.baseTop = kart.spec.top * mult;

    return { steer, drift: Math.abs(diff) > 0.45 && Math.abs(diff) < 1.1 && kart.speed > kart.baseTop * 0.62 };
  };
})();
