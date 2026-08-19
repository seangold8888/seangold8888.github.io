// 산리오 카트 — 트랙 1: 딸기 초원
// 중심선을 점으로 정의하고, 그 주위에 도로를 그린다.
// 같은 중심선으로 (1) 그림 (2) 주행 판정 (3) AI 경로 (4) 랩 진행도를 모두 만든다.
(function () {
  'use strict';
  window.SK = window.SK || {};

  const T = {};
  const SIZE = 2048;          // 트랙 텍스처 한 변
  T.SIZE = SIZE;
  T.ROAD_HALF = 132;          // 도로 반폭 (넉넉하게 — 아이가 잘 안 나간다)
  T.SHORTCUT_HALF = 74;

  // 중심선: 부드러운 폐곡선. 완만한 커브 위주, 급커브 없음.
  const CONTROL = [
    { x: 1024, y: 300 }, { x: 1500, y: 360 }, { x: 1720, y: 700 },
    { x: 1640, y: 1080 }, { x: 1320, y: 1300 }, { x: 1024, y: 1420 },
    { x: 700, y: 1330 }, { x: 420, y: 1120 }, { x: 330, y: 780 },
    { x: 480, y: 430 }, { x: 760, y: 300 }
  ];

  // Catmull-Rom 으로 촘촘한 중심선을 만든다.
  function catmull(p0, p1, p2, p3, t) {
    const t2 = t * t, t3 = t2 * t;
    return {
      x: 0.5 * ((2 * p1.x) + (-p0.x + p2.x) * t +
        (2 * p0.x - 5 * p1.x + 4 * p2.x - p3.x) * t2 +
        (-p0.x + 3 * p1.x - 3 * p2.x + p3.x) * t3),
      y: 0.5 * ((2 * p1.y) + (-p0.y + p2.y) * t +
        (2 * p0.y - 5 * p1.y + 4 * p2.y - p3.y) * t2 +
        (-p0.y + 3 * p1.y - 3 * p2.y + p3.y) * t3)
    };
  }

  function buildCenterline(control, perSegment) {
    const n = control.length;
    const pts = [];
    for (let i = 0; i < n; i++) {
      const p0 = control[(i - 1 + n) % n], p1 = control[i];
      const p2 = control[(i + 1) % n], p3 = control[(i + 2) % n];
      for (let s = 0; s < perSegment; s++) {
        pts.push(catmull(p0, p1, p2, p3, s / perSegment));
      }
    }
    // 누적 거리 — 랩 진행도의 기준
    let total = 0;
    for (let i = 0; i < pts.length; i++) {
      const a = pts[i], b = pts[(i + 1) % pts.length];
      a.dist = total;
      total += Math.hypot(b.x - a.x, b.y - a.y);
    }
    pts.total = total;
    return pts;
  }

  const CENTER = buildCenterline(CONTROL, 24);
  T.center = CENTER;
  T.length = CENTER.total;

  // 지름길: 위쪽 큰 커브를 가로지른다. 풀밭이라 조금 느리지만 거리가 짧다.
  T.shortcut = [
    { x: 1500, y: 360 }, { x: 1620, y: 560 }, { x: 1660, y: 800 }, { x: 1640, y: 1080 }
  ];

  T.start = { x: CENTER[0].x, y: CENTER[0].y };
  // 출발 방향: 중심선 진행 방향
  T.startAngle = Math.atan2(CENTER[3].y - CENTER[0].y, CENTER[3].x - CENTER[0].x);

  // ---- 조회: 어떤 지점이 도로 위인가, 그리고 랩 진행도는 얼마인가 ----
  // 격자에 가장 가까운 중심선 인덱스를 미리 구워 두면 매 프레임 탐색이 필요 없다.
  const GRID = 64;                       // 격자 칸 크기
  const GW = Math.ceil(SIZE / GRID);
  const NEAREST = new Int16Array(GW * GW);
  (function bakeNearest() {
    for (let gy = 0; gy < GW; gy++) {
      for (let gx = 0; gx < GW; gx++) {
        const px = gx * GRID + GRID / 2, py = gy * GRID + GRID / 2;
        let best = 0, bd = Infinity;
        for (let i = 0; i < CENTER.length; i++) {
          const d = (CENTER[i].x - px) ** 2 + (CENTER[i].y - py) ** 2;
          if (d < bd) { bd = d; best = i; }
        }
        NEAREST[gy * GW + gx] = best;
      }
    }
  })();

  // 근처 인덱스에서 조금만 훑어 정확한 최근접점을 찾는다.
  T.nearest = function (x, y) {
    const gx = Math.min(GW - 1, Math.max(0, Math.floor(x / GRID)));
    const gy = Math.min(GW - 1, Math.max(0, Math.floor(y / GRID)));
    const seed = NEAREST[gy * GW + gx];
    let best = seed, bd = Infinity;
    const n = CENTER.length;
    for (let k = -18; k <= 18; k++) {
      const i = (seed + k + n) % n;
      const d = (CENTER[i].x - x) ** 2 + (CENTER[i].y - y) ** 2;
      if (d < bd) { bd = d; best = i; }
    }
    return { index: best, dist: Math.sqrt(bd), point: CENTER[best] };
  };

  // 지점이 도로(또는 지름길) 위인지
  T.surfaceAt = function (x, y) {
    const near = T.nearest(x, y);
    if (near.dist <= T.ROAD_HALF) return { kind: 'road', near };
    // 지름길 선분과의 거리
    for (let i = 0; i < T.shortcut.length - 1; i++) {
      const a = T.shortcut[i], b = T.shortcut[i + 1];
      const vx = b.x - a.x, vy = b.y - a.y;
      const len2 = vx * vx + vy * vy;
      let t = ((x - a.x) * vx + (y - a.y) * vy) / len2;
      t = Math.max(0, Math.min(1, t));
      const px = a.x + vx * t, py = a.y + vy * t;
      if (Math.hypot(x - px, y - py) <= T.SHORTCUT_HALF) return { kind: 'shortcut', near };
    }
    return { kind: 'grass', near };
  };

  SK.Track = T;
})();
