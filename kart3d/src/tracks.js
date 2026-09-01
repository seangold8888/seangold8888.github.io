// 산리오 카트 3D — 트랙 데이터
// 중심선은 3D 스플라인이라 언덕과 다리를 만들 수 있다.
// 같은 스플라인으로 (1) 도로 메시 (2) 주행 판정 (3) AI 경로 (4) 랩 진행도를 만든다.
import * as THREE from '../vendor/three.module.min.js';

// p: [x, y(높이), z]
export const TRACKS = [
  {
    id: 'park',
    tip: '넓은 길 · 처음이라면 여기',
    name: '산리오 테마파크',
    sky: 0xbfe4ff, fog: 0xd8ecff, ground: 0x8fd36f, road: 0xf0e4d4, rail: 0xff8fb4,
    laps: 3,
    roadHalf: 30,
    points: [
      [500, 22, 0], [412, 19, 146], [315, 12, 269], [192, 5, 395],
      [0, 2, 428], [-170, 5, 352], [-315, 12, 269], [-462, 19, 164],
      [-500, 22, 0], [-412, 19, -146], [-315, 12, -269], [-192, 5, -395],
      [0, 2, -428], [170, 5, -352], [315, 12, -269], [462, 19, -164]
    ],
    // 점프대: 중심선 진행 거리(0~1)에 배치
    ramps: [0.18, 0.62],
    // 8세 난이도: 지름길(갈림길)을 막았다 — 길이 하나면 잃지 않는다.
    shortcut: null,
    scenery: 'park'
  },
  {
    id: 'cloud',
    tip: '하늘 위 · 조금 좁아요',
    name: '구름 성',
    sky: 0xa9d8ff, fog: 0xe6f3ff, ground: 0xbcdcf5, road: 0xfff3d6, rail: 0xffd34d,
    laps: 3,
    roadHalf: 28,
    points: [
      [456, 120, 0], [329, 106, 113], [268, 83, 212], [228, 65, 372],
      [97, 60, 522], [-97, 62, 522], [-228, 61, 372], [-268, 52, 212],
      [-329, 41, 113], [-456, 40, 0], [-527, 54, -181], [-430, 77, -340],
      [-228, 95, -372], [-61, 100, -325], [61, 98, -325], [228, 99, -372],
      [430, 108, -340], [527, 119, -181]
    ],
    ramps: [0.3, 0.75],
    shortcut: null,
    scenery: 'cloud'
  },
  {
    id: 'candy',
    tip: '가장 넓어요',
    name: '사탕 숲',
    sky: 0xffd9ec, fog: 0xffe9f4, ground: 0xf7c9de, road: 0xffeacb, rail: 0xff7aa8,
    laps: 3,
    roadHalf: 32,
    points: [
      [576, 24, 0], [450, 14, 160], [257, 6, 220], [98, 5, 203],
      [0, 12, 184], [-98, 22, 203], [-257, 30, 220], [-450, 31, 160],
      [-576, 24, 0], [-557, 14, -198], [-408, 6, -350], [-205, 5, -424],
      [0, 12, -442], [205, 22, -424], [408, 30, -350], [557, 31, -198]
    ],
    ramps: [0.45],
    shortcut: null,
    scenery: 'candy'
  },
  {
    // 넓고 완만하다. 아직 손에 익지 않은 아이가 편하게 달리는 코스.
    id: 'beach',
    tip: '길고 완만해요 · 편한 코스',
    name: '노을 해변',
    sky: 0xffc79a, fog: 0xffdcc0, ground: 0xf0dcae, road: 0xfff0d8, rail: 0x5cc6d8,
    laps: 3,
    roadHalf: 36,
    points: [
      [598, 14, 0], [465, 13, 156], [303, 12, 245], [159, 9, 310],
      [0, 6, 382], [-217, 3, 423], [-455, 0, 367], [-605, -1, 202],
      [-598, -2, 0], [-465, -1, -156], [-303, 0, -245], [-159, 3, -310],
      [0, 6, -382], [217, 9, -423], [455, 12, -367], [605, 13, -202]
    ],
    ramps: [0.4],
    shortcut: null,
    scenery: 'beach'
  },
  {
    // 좁고 굽이가 잦다. 드리프트를 익힌 다음에 오는 코스.
    id: 'night',
    tip: '좁고 굽이 많아요 · 어려움',
    name: '별빛 밤길',
    sky: 0x1a2350, fog: 0x2a3468, ground: 0x33406e, road: 0x7d87c0, rail: 0xffd34d,
    laps: 3,
    roadHalf: 29,
    hemi: 0.62, sunI: 0.5,
    points: [
      [504, 35, 0], [424, 24, 143], [331, 8, 257], [214, 5, 343],
      [67, 16, 353], [-59, 32, 311], [-182, 35, 293], [-350, 24, 272],
      [-491, 8, 165], [-504, 5, 0], [-424, 16, -143], [-331, 32, -257],
      [-214, 35, -343], [-67, 24, -353], [59, 8, -311], [182, 5, -293],
      [350, 16, -272], [491, 32, -165]
    ],
    ramps: [0.24, 0.58, 0.84],
    shortcut: null,
    scenery: 'night'
  },
  {
    // 오르내림이 큰 하늘길. 한 바퀴가 길어서 2바퀴다.
    id: 'rainbow',
    tip: '오르내림이 커요 · 아치 통과',
    name: '무지개 하늘길',
    sky: 0xffe4f6, fog: 0xfff0fa, ground: 0xd8c8ff, road: 0xfff8e8, rail: 0xff7aa8,
    laps: 3,
    roadHalf: 28,
    points: [
      [585, 195, 0], [493, 172, 156], [377, 150, 276], [236, 134, 357],
      [81, 127, 400], [-93, 125, 459], [-304, 122, 460], [-429, 112, 314],
      [-429, 95, 136], [-449, 75, 0], [-479, 60, -152], [-415, 58, -304],
      [-281, 74, -424], [-99, 106, -489], [87, 145, -430], [213, 182, -321],
      [363, 204, -266], [543, 208, -172]
    ],
    ramps: [0.16, 0.46, 0.74],
    shortcut: null,
    scenery: 'rainbow'
  }
];

// 스플라인에서 촘촘한 중심선 표본을 뽑는다.
export function buildTrack(def) {
  const curve = new THREE.CatmullRomCurve3(
    def.points.map(p => new THREE.Vector3(p[0], p[1], p[2])), true, 'catmullrom', 0.5);

  const SAMPLES = 600;
  const pts = [];
  let total = 0;
  for (let i = 0; i < SAMPLES; i++) {
    const t = i / SAMPLES;
    const p = curve.getPointAt(t);
    const tan = curve.getTangentAt(t);
    pts.push({ x: p.x, y: p.y, z: p.z, tx: tan.x, ty: tan.y, tz: tan.z, dist: 0, t });
  }
  for (let i = 0; i < SAMPLES; i++) {
    const a = pts[i], b = pts[(i + 1) % SAMPLES];
    a.dist = total;
    total += Math.hypot(b.x - a.x, b.z - a.z);
  }

  // 격자 → 가장 가까운 표본 색인 (매 프레임 전수 탐색 방지)
  const GRID = 40;
  const MIN = -700, MAX = 700;
  const GW = Math.ceil((MAX - MIN) / GRID);
  const nearestGrid = new Int16Array(GW * GW);
  for (let gz = 0; gz < GW; gz++) {
    for (let gx = 0; gx < GW; gx++) {
      const px = MIN + gx * GRID + GRID / 2;
      const pz = MIN + gz * GRID + GRID / 2;
      let best = 0, bd = Infinity;
      for (let i = 0; i < SAMPLES; i += 2) {
        const d = (pts[i].x - px) ** 2 + (pts[i].z - pz) ** 2;
        if (d < bd) { bd = d; best = i; }
      }
      nearestGrid[gz * GW + gx] = best;
    }
  }

  const track = {
    def, curve, points: pts, length: total, roadHalf: def.roadHalf,
    laps: def.laps,

    nearest(x, z) {
      const gx = Math.min(GW - 1, Math.max(0, Math.floor((x - MIN) / GRID)));
      const gz = Math.min(GW - 1, Math.max(0, Math.floor((z - MIN) / GRID)));
      const seed = nearestGrid[gz * GW + gx];
      let best = seed, bd = Infinity;
      for (let k = -14; k <= 14; k++) {
        const i = (seed + k + SAMPLES) % SAMPLES;
        const d = (pts[i].x - x) ** 2 + (pts[i].z - z) ** 2;
        if (d < bd) { bd = d; best = i; }
      }
      return { index: best, dist: Math.sqrt(bd), p: pts[best] };
    },

    // 어떤 지점의 지면 높이와 노면 종류
    sample(x, z) {
      const near = track.nearest(x, z);
      let kind = near.dist <= def.roadHalf ? 'road' : 'grass';
      let y = near.p.y;
      if (kind === 'grass' && shortcutSegs) {
        for (const s of shortcutSegs) {
          const d = distToSeg(x, z, s);
          if (d.dist <= 22) { kind = 'shortcut'; y = s.ay + (s.by - s.ay) * d.t; break; }
        }
      }
      // 도로 밖은 완만하게 낮아진다(낭떠러지 없음)
      if (kind === 'grass') y = near.p.y - Math.min(14, (near.dist - def.roadHalf) * 0.12);
      return { kind, y, near };
    },

    // 램프 위치를 월드 좌표로
    ramps: (def.ramps || []).map(t => {
      const i = Math.floor(t * SAMPLES) % SAMPLES;
      return { index: i, p: pts[i] };
    })
  };

  let shortcutSegs = null;
  if (def.shortcut) {
    shortcutSegs = [];
    for (let i = 0; i < def.shortcut.length - 1; i++) {
      const a = def.shortcut[i], b = def.shortcut[i + 1];
      shortcutSegs.push({ ax: a[0], ay: a[1], az: a[2], bx: b[0], by: b[1], bz: b[2] });
    }
  }

  function distToSeg(x, z, s) {
    const vx = s.bx - s.ax, vz = s.bz - s.az;
    const len2 = vx * vx + vz * vz;
    let t = ((x - s.ax) * vx + (z - s.az) * vz) / len2;
    t = Math.max(0, Math.min(1, t));
    const px = s.ax + vx * t, pz = s.az + vz * t;
    return { dist: Math.hypot(x - px, z - pz), t };
  }

  track.shortcutSegs = shortcutSegs;
  return track;
}
