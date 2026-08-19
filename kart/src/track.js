// 산리오 카트 — 트랙 데이터
// 중심선을 점으로 정의하고, 그 주위에 도로를 그린다.
// 같은 중심선으로 (1) 그림 (2) 주행 판정 (3) AI 경로 (4) 랩 진행도를 모두 만든다.
//
// 트랙은 고르는 순간에만 만든다. 2048×2048 텍스처를 여러 장 들고 있으면
// 아이패드 메모리에 부담이라, 이전 트랙 텍스처는 버린다.
(function () {
  'use strict';
  window.SK = window.SK || {};

  const SIZE = 2048;

  // roadHalf 가 넓을수록 쉽다. 아이가 익숙해지는 순서대로 늘어놓았다.
  SK.TRACKS = [
    {
      id: 'meadow',
      name: '딸기 초원',
      tip: '넓고 완만해요 · 처음이라면 여기',
      roadHalf: 132, shortcutHalf: 74,
      control: [
        { x: 1024, y: 300 }, { x: 1500, y: 360 }, { x: 1720, y: 700 },
        { x: 1640, y: 1080 }, { x: 1320, y: 1300 }, { x: 1024, y: 1420 },
        { x: 700, y: 1330 }, { x: 420, y: 1120 }, { x: 330, y: 780 },
        { x: 480, y: 430 }, { x: 760, y: 300 }
      ],
      shortcut: [
        { x: 1500, y: 360 }, { x: 1620, y: 560 }, { x: 1660, y: 800 }, { x: 1640, y: 1080 }
      ],
      theme: {
        ground1: '#8fd36f', ground2: '#6fbe58', blade: 'rgba(90,170,70,0.55)', blades: 2600,
        path: '#c9d98a', roadEdge: '#f4b8cf', road: '#e9dfd0', grain: '#dfd2be',
        dash: 'rgba(255,255,255,0.6)', postA: '#ff8fb4', postB: '#fff3a6',
        sky1: '#bfe4ff', sky2: '#ffe9f4', horizon: '#7fbe62',
        hills: '#7fb96a', sun: '#fff6c4', fog: '214,238,205', cloud: 'rgba(255,255,255,0.9)',
        decor: 'flower', decorColors: ['#ff9ec4', '#fff07a', '#ffffff', '#ffb3e6']
      }
    },
    {
      id: 'beach',
      name: '노을 해변',
      tip: '가장 넓어요 · 길고 시원한 코스',
      roadHalf: 142, shortcutHalf: 80,
      control: [
        { x: 1024, y: 280 }, { x: 1560, y: 330 }, { x: 1800, y: 650 },
        { x: 1760, y: 1090 }, { x: 1440, y: 1360 }, { x: 1024, y: 1460 },
        { x: 600, y: 1370 }, { x: 300, y: 1120 }, { x: 220, y: 760 },
        { x: 420, y: 420 }, { x: 740, y: 290 }
      ],
      shortcut: [
        { x: 1800, y: 650 }, { x: 1900, y: 860 }, { x: 1760, y: 1090 }
      ],
      theme: {
        ground1: '#ecd39a', ground2: '#dcbf82', blade: 'rgba(214,186,132,0.5)', blades: 1500,
        path: '#efe0bb', roadEdge: '#5cc6d8', road: '#fff0d8', grain: '#f2e2c6',
        dash: 'rgba(255,255,255,0.7)', postA: '#5cc6d8', postB: '#ff8f6b',
        sky1: '#ffc79a', sky2: '#ffe4d0', horizon: '#49b7d6',
        hills: '#49b7d6', sun: '#fff0b8', fog: '250,224,190', cloud: 'rgba(255,240,225,0.92)',
        decor: 'shell', decorColors: ['#ff8f6b', '#ffffff', '#5cc6d8', '#ffd9a8']
      }
    },
    {
      id: 'candy',
      name: '사탕 마을',
      tip: '굽이가 조금 있어요 · 지름길 있음',
      roadHalf: 126, shortcutHalf: 70,
      // 위가 좁고 아래가 넓은 서양배 모양. 방향이 뒤집히는 구간은 두지 않는다
      // (넣어 봤더니 AI가 코너를 깎아 이탈이 최대 9.8% 나왔다).
      control: [
        { x: 1024, y: 320 }, { x: 1330, y: 380 }, { x: 1500, y: 640 },
        { x: 1570, y: 980 }, { x: 1330, y: 1290 }, { x: 1024, y: 1420 },
        { x: 700, y: 1300 }, { x: 480, y: 1050 }, { x: 450, y: 700 },
        { x: 620, y: 420 }, { x: 820, y: 330 }
      ],
      shortcut: [
        { x: 1330, y: 380 }, { x: 1500, y: 560 }, { x: 1570, y: 980 }
      ],
      theme: {
        ground1: '#f7c9de', ground2: '#efb0cd', blade: 'rgba(220,140,180,0.42)', blades: 1800,
        path: '#ffe6f2', roadEdge: '#ff7aa8', road: '#ffeacb', grain: '#f5dcb8',
        dash: 'rgba(255,255,255,0.7)', postA: '#ff7aa8', postB: '#9be2b5',
        sky1: '#ffd9ec', sky2: '#fff0f8', horizon: '#e79ac0',
        hills: '#e79ac0', sun: '#fff6c4', fog: '255,224,240', cloud: 'rgba(255,255,255,0.92)',
        decor: 'candy', decorColors: ['#ff7aa8', '#ffd34d', '#9be2b5', '#c9b2e8']
      }
    },
    {
      id: 'night',
      name: '별빛 밤길',
      tip: '좁고 굽이 많아요 · 어려움',
      roadHalf: 114, shortcutHalf: 64,
      // 둥근 삼각형 — 긴 코너 세 개. 좁은 폭이 난이도를 맡는다.
      control: [
        { x: 1024, y: 330 }, { x: 1360, y: 430 }, { x: 1560, y: 720 },
        { x: 1600, y: 1040 }, { x: 1380, y: 1290 }, { x: 1024, y: 1400 },
        { x: 680, y: 1300 }, { x: 450, y: 1060 }, { x: 410, y: 730 },
        { x: 560, y: 460 }, { x: 760, y: 350 }
      ],
      shortcut: null,
      theme: {
        ground1: '#33406e', ground2: '#242f57', blade: 'rgba(120,140,210,0.30)', blades: 1200,
        path: '#3d4a7a', roadEdge: '#ffd34d', road: '#7d87c0', grain: '#6e78ae',
        dash: 'rgba(255,245,200,0.55)', postA: '#ffd34d', postB: '#fff3a6',
        sky1: '#1a2350', sky2: '#3a4780', horizon: '#2a3468',
        hills: '#20294f', sun: '#f2eecf', fog: '42,52,104', cloud: 'rgba(255,255,255,0.5)', night: true,
        decor: 'star', decorColors: ['#fffbe6', '#ffe9a8', '#cfe0ff', '#ffffff']
      }
    }
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

  SK.buildTrack = function (def) {
    const T = {};
    T.def = def;
    T.theme = def.theme;
    T.name = def.name;
    T.SIZE = SIZE;
    T.ROAD_HALF = def.roadHalf;
    T.SHORTCUT_HALF = def.shortcutHalf;

    const CENTER = buildCenterline(def.control, 24);
    T.center = CENTER;
    T.length = CENTER.total;
    T.shortcut = def.shortcut;

    T.start = { x: CENTER[0].x, y: CENTER[0].y };
    T.startAngle = Math.atan2(CENTER[3].y - CENTER[0].y, CENTER[3].x - CENTER[0].x);

    // 격자에 가장 가까운 중심선 인덱스를 미리 구워 두면 매 프레임 탐색이 필요 없다.
    const GRID = 64;
    const GW = Math.ceil(SIZE / GRID);
    const NEAREST = new Int16Array(GW * GW);
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

    T.surfaceAt = function (x, y) {
      const near = T.nearest(x, y);
      if (near.dist <= T.ROAD_HALF) return { kind: 'road', near };
      if (T.shortcut) {
        for (let i = 0; i < T.shortcut.length - 1; i++) {
          const a = T.shortcut[i], b = T.shortcut[i + 1];
          const vx = b.x - a.x, vy = b.y - a.y;
          const len2 = vx * vx + vy * vy;
          let t = ((x - a.x) * vx + (y - a.y) * vy) / len2;
          t = Math.max(0, Math.min(1, t));
          const px = a.x + vx * t, py = a.y + vy * t;
          if (Math.hypot(x - px, y - py) <= T.SHORTCUT_HALF) return { kind: 'shortcut', near };
        }
      }
      return { kind: 'grass', near };
    };

    return T;
  };
})();
