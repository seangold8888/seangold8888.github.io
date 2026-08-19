// 산리오 카트 3D — 트랙 데이터
// 중심선은 3D 스플라인이라 언덕과 다리를 만들 수 있다.
// 같은 스플라인으로 (1) 도로 메시 (2) 주행 판정 (3) AI 경로 (4) 랩 진행도를 만든다.
import * as THREE from '../vendor/three.module.min.js';

// p: [x, y(높이), z]
export const TRACKS = [
  {
    id: 'park',
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
