// 농구 공 물리(DOM 없음). 화면(basketball.js·views/basketball-stage.js)과 Node 테스트가 같은 계산을 쓴다.
//
// 좌표: world(땅 y=0, 위가 음수). 골대 림 가운데 = (0, rimY). 아이는 왼쪽(x 음수)에서 오른쪽으로 던진다.
// 옆에서 본 2D 라서 림은 "앞 림 점"·"뒤 림 점" 두 동그라미, 백보드는 세로 막대(캡슐)다.
// 공은 고정 간격(1/240초)으로만 움직인다 → 미리 계산한 결과(보조·안내선)와 실제 비행이 똑같다.
//   골인 = 공 가운데가 두 림 점 사이로 림 높이를 아래로 지나감. 아무 데도 안 닿으면 클린 슛(swish),
//   백보드에 먼저 닿으면 뱅크 슛(bank), 림에 닿고 들어가면 통통 쏙(rim).

export const G = 2400;                 // 중력(world/s²) — 아이 키 340 ≈ 130cm 기준 실제보다 살짝 느리게
export const H_STEP = 1 / 240;         // 물리 한 걸음
export const BALL_R = 27;              // 공 반지름
export const RIM_R = 66;               // 림 가운데 → 림 점 가운데
export const RIM_PT = 6;               // 림 쇠 두께(반지름)
export const BOARD_GAP = 30;           // 뒤 림 점 → 백보드 앞면
export const BOARD_T = 7;              // 백보드 두께(반)
export const BOARD_UP = 215;           // 림 위로 백보드 높이
export const BOARD_DOWN = 45;          // 림 아래로
export const NET_LEN = 92;             // 그물 길이
export const E_RIM = 0.55, E_BOARD = 0.8, E_FLOOR = 0.6;
export const MAX_T = 4.2;              // 이보다 오래 날면 끝
export const REF_ANGLE = 55;           // 기준 각도(도): 힘 막대 가운데 = 이 각도로 림 가운데를 지나는 속도

export function geometry(rimY) {
  const boardX = RIM_R + BOARD_GAP;
  return {
    rimX: 0, rimY,
    front: { x: -RIM_R, y: rimY }, back: { x: RIM_R, y: rimY },
    boardX, boardTop: rimY - BOARD_UP, boardBot: rimY + BOARD_DOWN,
  };
}

const rad = d => (d * Math.PI) / 180;

// from(x0,y0) 에서 각도 deg 로 던져 림 가운데(0, rimY)를 지나는 속도. 불가능하면 NaN.
export function speedThrough(geo, from, deg) {
  const th = rad(deg), dx = geo.rimX - from.x, dy = geo.rimY - from.y;   // dy 음수 = 림이 위
  const den = 2 * Math.cos(th) ** 2 * (dy + dx * Math.tan(th));
  if (!(den > 0) || !(dx > 0)) return NaN;
  return Math.sqrt((G * dx * dx) / den);
}
export function refSpeed(geo, from) { return speedThrough(geo, from, REF_ANGLE); }

// 각도·속도 → 속도 벡터(위가 음수)
export function velocity(deg, speed) { const th = rad(deg); return { vx: Math.cos(th) * speed, vy: -Math.sin(th) * speed }; }

// 새 공. o.magnet = { geo, until } 이면 자석 골대(아래 magnetize)
export function createBall(from, v, o = {}) {
  return {
    x: from.x, y: from.y, vx: v.vx, vy: v.vy, t: 0, acc: 0,
    rot: 0, spin: o.spin != null ? o.spin : -9,   // 역회전(그리기용)
    hitRim: 0, hitBoard: 0, made: false, madeT: -1, result: null, resultT: -1, done: false,
    floor: 0, events: [], magnet: null, from: { ...from },
  };
}

function bounceOffPoint(b, px, py, minD, e, type) {
  const dx = b.x - px, dy = b.y - py, d2 = dx * dx + dy * dy;
  if (d2 >= minD * minD) return false;
  const d = Math.sqrt(d2) || 0.0001, nx = dx / d, ny = dy / d;
  b.x = px + nx * minD; b.y = py + ny * minD;
  const vn = b.vx * nx + b.vy * ny;
  if (vn < 0) {
    const tx = -ny, ty = nx, vt = b.vx * tx + b.vy * ty;
    b.vx -= (1 + e) * vn * nx; b.vy -= (1 + e) * vn * ny;
    // 미끄럼 마찰 조금 + 회전 바꾸기
    b.vx -= vt * 0.12 * tx; b.vy -= vt * 0.12 * ty;
    b.spin = vt / BALL_R * 0.6;
    b.events.push({ type, t: b.t, power: Math.min(1, -vn / 900) });
  }
  return true;
}

// 백보드: (boardX, top)~(boardX, bot) 세로 막대(두께 BOARD_T)
function bounceOffBoard(b, geo) {
  const cy = Math.max(geo.boardTop, Math.min(geo.boardBot, b.y));
  return bounceOffPoint(b, geo.boardX + BOARD_T * 0 , cy, BALL_R + BOARD_T, E_BOARD, "board");
}

// 공 한 걸음(H_STEP). 결과가 정해지면 b.result = "swish"|"bank"|"rim"|"air"|"rimout"|"boardout"
function step1(b, geo) {
  const h = H_STEP;
  b.t += h;
  if (b.magnet && b.t < b.magnet.handoff) { magnetStep(b); return; }
  const py = b.y;
  b.vy += G * h; b.x += b.vx * h; b.y += b.vy * h; b.rot += b.spin * h;
  // 그물 안: 공이 쑥 빠지며 느려진다(그물이 잡아 준다)
  if (b.made && b.y < geo.rimY + NET_LEN + BALL_R && b.y > geo.rimY - 4) {
    const k = Math.pow(0.004, h); b.vx *= k; b.x += (geo.rimX - b.x) * (1 - Math.pow(0.0005, h));
    if (b.vy > 700) b.vy *= Math.pow(0.08, h);
  } else if (!b.made || b.y > geo.rimY + NET_LEN) {
    if (bounceOffPoint(b, geo.front.x, geo.front.y, BALL_R + RIM_PT, E_RIM, "rim")) { if (!b.result) b.hitRim++; }
    if (bounceOffPoint(b, geo.back.x, geo.back.y, BALL_R + RIM_PT, E_RIM, "rim")) { if (!b.result) b.hitRim++; }
    if (bounceOffBoard(b, geo)) { if (!b.result) b.hitBoard++; }
  }
  // 골인: 림 높이를 아래로, 두 림 점 사이
  if (!b.made && !b.result && py < geo.rimY && b.y >= geo.rimY && b.vy > 0 && b.x > geo.front.x + RIM_PT * 0.5 && b.x < geo.back.x - RIM_PT * 0.5) {
    b.made = true; b.madeT = b.t;
    b.result = b.hitBoard ? "bank" : b.hitRim ? "rim" : "swish"; b.resultT = b.t;
    b.events.push({ type: "made", t: b.t, kind: b.result });
  }
  // 땅
  if (b.y + BALL_R > 0) {
    b.y = -BALL_R;
    if (b.vy > 0) { if (b.vy > 140) b.events.push({ type: "floor", t: b.t, power: Math.min(1, b.vy / 1400) }); b.vy = b.vy > 90 ? -b.vy * E_FLOOR : 0; b.vx *= 0.82; b.floor++; }
    b.spin = b.vx / BALL_R;
  }
  // 놓침: 림보다 한참 아래로 떨어졌거나 너무 오래·멀리
  if (!b.result && ((b.y > geo.rimY + 150 && b.vy > 0) || b.t > MAX_T || b.x > geo.boardX + 600 || b.x < b.from.x - 900)) {
    b.result = b.hitRim ? "rimout" : b.hitBoard ? "boardout" : "air"; b.resultT = b.t;
    b.events.push({ type: "miss", t: b.t, kind: b.result });
  }
  if (b.result && (b.t - b.resultT > 1.6 || (b.floor >= 3 && Math.abs(b.vx) < 30))) b.done = true;
}

// dt 만큼(고정 걸음으로 나눠) 움직이기. 이번에 생긴 일들(events)을 돌려준다.
export function stepBall(b, geo, dt) {
  b.events.length = 0;
  b.acc += dt;
  let n = 0;
  while (b.acc >= H_STEP && n < 200) { b.acc -= H_STEP; step1(b, geo); n++; }
  return b.events;
}

// 결과만 빨리: 공을 끝까지(결과가 정해질 때까지) 날려 본다
export function predict(geo, from, v, maxT = MAX_T) {
  const b = createBall(from, v);
  while (!b.result && b.t < maxT) { step1(b, geo); b.events.length = 0; }
  return { result: b.result || "air", made: b.made, t: b.resultT, hitRim: b.hitRim, hitBoard: b.hitBoard };
}

// 안내선 점들: 처음 frac(0~1, 림까지 날아가는 시간 비율)만큼. 닿는 곳에서 멈춘다.
export function guidePoints(geo, from, v, frac = 1, n = 24) {
  const b = createBall(from, v), T = Math.max(0.2, (geo.rimX - from.x) / Math.max(60, v.vx)) * frac, pts = [];
  let next = 0;
  const gap = T / n;
  while (b.t < T && !b.result) {
    if (b.t >= next) { pts.push({ x: b.x, y: b.y }); next += gap; }
    step1(b, geo); b.events.length = 0;
    if (b.hitRim || b.hitBoard) { pts.push({ x: b.x, y: b.y }); break; }
  }
  return pts;
}

// 보조(아이별 너그러움): 손가락으로 정한 각도·힘이 조금 빗나가도 tolP(힘 비율)·tolA(도) 안에
// 들어가는 각도·힘이 있으면 가장 가까운 것으로 바꿔 준다. 없으면 그대로(진짜 빗나감).
const RING = (() => {
  const c = [], N = 7;
  for (let i = -N; i <= N; i++) for (let j = -N; j <= N; j++) {
    const p = i / N, a = j / N, d = p * p + a * a;
    if (d <= 1.0001 && d > 0) c.push({ p, a, d });
  }
  return c.sort((x, y) => x.d - y.d);
})();
export function assist(geo, from, deg, speed, tolP, tolA) {
  const base = predict(geo, from, velocity(deg, speed));
  if (base.made) return { deg, speed, assisted: false, result: base.result };
  if (tolP > 0 || tolA > 0) {
    for (const c of RING) {
      const d2 = deg + c.a * tolA, s2 = speed * (1 + c.p * tolP);
      const r = predict(geo, from, velocity(d2, s2));
      if (r.made) return { deg: d2, speed: s2, assisted: true, result: r.result };
    }
  }
  return { deg, speed, assisted: false, result: base.result };
}

// 자석 골대(문제 보상): 손가락으로 던진 길(A)에서 림 가운데로 쏙 들어가는 길(B)로 날면서 휘어 들어간다.
// handoff(림 바로 위) 뒤로는 B 의 속도로 보통 물리 → 반드시 클린 슛.
const smooth = (a, b, x) => { const u = Math.max(0, Math.min(1, (x - a) / (b - a))); return u * u * (3 - 2 * u); };
export function magnetize(b, geo, deg = 58) {
  const from = b.from, sB = speedThrough(geo, from, deg), vB = velocity(deg, sB);
  const TB = (geo.rimX - from.x) / vB.vx;
  b.magnet = { A: { vx: b.vx, vy: b.vy }, B: vB, TB, handoff: TB - 0.05 };
  return b;
}
function pathAt(from, v, t) { return { x: from.x + v.vx * t, y: from.y + v.vy * t + 0.5 * G * t * t }; }
function magnetStep(b) {
  const m = b.magnet, t = b.t, w = smooth(0, 0.82, t / m.TB);
  const a = pathAt(b.from, m.A, t), c = pathAt(b.from, m.B, t);
  const nx = a.x + (c.x - a.x) * w, ny = a.y + (c.y - a.y) * w;
  b.vx = (nx - b.x) / H_STEP; b.vy = (ny - b.y) / H_STEP; b.x = nx; b.y = ny; b.rot += b.spin * H_STEP;
  if (t + H_STEP >= m.handoff) {      // 다음 걸음부터 보통 물리: B 의 위치·속도로 맞춘다
    const p = pathAt(b.from, m.B, t); b.x = p.x; b.y = p.y; b.vx = m.B.vx; b.vy = m.B.vy + G * t;
  }
}

// 그 자리의 기준 각도: 림 가운데를 지나며 클린 슛이 되는 가장 낮은 각도 + 6도(50~72도). 가까울수록 높게 던진다.
export function refAngle(geo, from) {
  for (let deg = 44; deg <= 76; deg++) {
    const s = speedThrough(geo, from, deg);
    if (s > 0 && predict(geo, from, velocity(deg, s)).result === "swish") return Math.max(50, Math.min(72, deg + 6));
  }
  return 66;
}
