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
      [0, 0, -420], [230, 0, -380], [400, 6, -180], [420, 14, 60],
      [300, 22, 250], [90, 20, 360], [-150, 10, 380], [-330, 4, 250],
      [-420, 0, 30], [-360, 0, -200], [-190, 0, -390]
    ],
    // 점프대: 중심선 진행 거리(0~1)에 배치
    ramps: [0.18, 0.62],
    // 지름길: 잔디를 가로지르는 별도 스플라인
    shortcut: [[400, 6, -180], [470, 10, -40], [420, 14, 60]],
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
      [0, 40, -400], [260, 60, -330], [400, 90, -120], [380, 120, 120],
      [200, 110, 300], [-40, 90, 370], [-270, 70, 300], [-400, 55, 90],
      [-380, 40, -140], [-200, 38, -350]
    ],
    ramps: [0.3, 0.75],
    shortcut: null,
    scenery: 'cloud'
  },
  {
    id: 'candy',
    tip: '가장 넓어요 · 지름길 있음',
    name: '사탕 숲',
    sky: 0xffd9ec, fog: 0xffe9f4, ground: 0xf7c9de, road: 0xffeacb, rail: 0xff7aa8,
    laps: 3,
    roadHalf: 32,
    points: [
      [0, 0, -380], [200, 10, -330], [380, 24, -150], [400, 30, 80],
      [260, 20, 260], [30, 8, 350], [-200, 4, 320], [-380, 12, 140],
      [-400, 6, -90], [-230, 0, -330]
    ],
    ramps: [0.45],
    shortcut: [[-380, 12, 140], [-460, 6, -10], [-400, 6, -90]],
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
      [0, 0, -430], [250, 0, -400], [440, 4, -230], [500, 8, 10],
      [400, 10, 250], [180, 6, 400], [-90, 4, 420], [-330, 6, 300],
      [-470, 4, 70], [-430, 0, -190], [-240, 0, -390]
    ],
    ramps: [0.4],
    shortcut: [[440, 4, -230], [530, 8, -100], [500, 8, 10]],
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
      [0, 0, -400], [210, 8, -350], [340, 16, -200], [400, 22, -20],
      [330, 26, 150], [160, 22, 290], [-40, 16, 380], [-230, 14, 330],
      [-350, 18, 180], [-300, 12, 20], [-410, 6, -160], [-220, 0, -340]
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
    laps: 2,
    roadHalf: 28,
    points: [
      [0, 60, -470], [270, 100, -420], [470, 150, -230], [530, 190, 40],
      [420, 150, 300], [190, 100, 450], [-100, 80, 470], [-360, 110, 340],
      [-500, 150, 110], [-470, 110, -160], [-280, 70, -390]
    ],
    ramps: [0.16, 0.46, 0.74],
    shortcut: [[-500, 150, 110], [-580, 120, -30], [-470, 110, -160]],
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
