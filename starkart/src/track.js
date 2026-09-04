// 별빛 카트 배틀 — src/track.js (Agent TRACK)
// buildTrack(trackId, THREE) → Track   (see CONTRACTS.md §src/track.js)
//
// THREE is injected so Node tests can pass the vendored module in.
// Everything here is procedural: no external assets. Textures are optional
// Canvas grain (skipped when `document` is missing), so Node builds the exact
// same geometry the browser does.
//
// Heading convention (contracts): θ = 0 → +Z, forward = (sin θ, 0, cos θ),
// right = forward × up = (-cos θ, 0, sin θ). `lateral` is positive to the right.
"use strict";

import { RACE, makeRng } from "./contracts.js";

const TAU = Math.PI * 2;

// ───────────────────────────────────────────────────────────── themes ──

const THEMES = {
  meadow: {
    name: "꽃밭 들판",
    difficulty: "easy",
    width: 14,
    targetLength: 420,
    checkpointCount: 14,
    smooth: 6,
    fallOff: false,
    // gentle oval with soft wiggles (x, z[, y])
    control: [
      [0, -70], [40, -72], [75, -55], [88, -20], [80, 20], [85, 55], [60, 80],
      [20, 85], [-20, 75], [-55, 85], [-85, 60], [-92, 20], [-80, -20], [-70, -55], [-35, -72],
    ],
    road: { base: [0.42, 0.42, 0.47], line: [1.0, 0.85, 0.2], edge: [0.97, 0.97, 0.97], dashed: true },
    curb: [[0.95, 0.28, 0.32], [1, 1, 1]],
    sky: { top: [0.30, 0.58, 1.0], horizon: [0.88, 0.96, 1.0], bottom: [0.55, 0.85, 0.5] },
    ground: [0.47, 0.80, 0.36],
    light: { sky: 0xbfe3ff, ground: 0x8fbf6a, sun: 0xfff2d0, sunIntensity: 0.85, hemiIntensity: 0.7 },
    boost: [{ t: 0.22 }, { t: 0.61 }],
    hazards: [{ t: 0.40, kind: "mud", side: 0.35 }, { t: 0.80, kind: "mud", side: -0.35 }],
    gaps: [],
  },
  castle: {
    name: "구름성 성벽길",
    difficulty: "medium",
    width: 12,
    targetLength: 520,
    checkpointCount: 16,
    smooth: 6,
    fallOff: false,
    // S-curves + one raised jump ramp (y values) on the left side
    control: [
      [0, -80], [45, -85], [80, -60], [85, -20],          // sweep right
      [60, 10], [20, 20], [0, 50], [30, 85],              // S-curve #1
      [75, 110], [60, 150], [10, 160], [-40, 140],        // top loop
      [-70, 100], [-60, 60], [-90, 30],                   // S-curve #2
      [-96, 8, 0], [-97, -14, 2.6], [-96, -20, 2.7], [-93, -30, 0], // jump ramp (rise → drop)
      [-80, -55], [-40, -80],
    ],
    road: { base: [0.55, 0.53, 0.58], line: [0.98, 0.95, 0.75], edge: [0.85, 0.82, 0.90], dashed: false },
    curb: [[0.55, 0.45, 0.85], [0.98, 0.93, 0.80]],
    sky: { top: [0.42, 0.45, 0.95], horizon: [1.0, 0.80, 0.85], bottom: [0.6, 0.7, 0.55] },
    ground: [0.40, 0.68, 0.36],
    light: { sky: 0xd8d0ff, ground: 0x7fa060, sun: 0xffe6c0, sunIntensity: 0.8, hemiIntensity: 0.7 },
    boost: [{ t: 0.10 }, { t: 0.52 }, { t: 0.79 }],
    hazards: [{ t: 0.30, kind: "oil", side: -0.3 }, { t: 0.66, kind: "oil", side: 0.3 }],
    gaps: [],
  },
  sky: {
    name: "별빛 하늘길",
    difficulty: "hard",
    width: 9,
    targetLength: 470,
    checkpointCount: 18,
    smooth: 6,
    fallOff: true,
    // twisty with hairpins
    control: [
      [0, -70], [50, -75], [90, -50], [80, -10], [40, 0], [20, 40], [60, 70], [30, 110],
      [-20, 95], [-40, 130], [-80, 110], [-90, 60], [-60, 30], [-90, -10], [-70, -60], [-30, -75],
    ],
    road: { base: [0.96, 0.97, 1.0], line: [0.55, 0.78, 1.0], edge: [0.80, 0.90, 1.0], dashed: true },
    curb: [[1.0, 0.75, 0.85], [0.75, 0.85, 1.0]],
    sky: { top: [0.16, 0.20, 0.55], horizon: [0.95, 0.70, 0.80], bottom: [0.98, 0.85, 0.70] },
    ground: null,
    light: { sky: 0xe8e0ff, ground: 0xffd0e0, sun: 0xfff8e0, sunIntensity: 0.75, hemiIntensity: 0.8 },
    // cloud gaps: the road becomes a translucent rainbow bridge; pads sit ~14 m before each
    gaps: [{ t0: 0.055, t1: 0.095 }, { t0: 0.335, t1: 0.375 }, { t0: 0.595, t1: 0.63 }, { t0: 0.86, t1: 0.90 }],
    boost: [{ t: 0.02 }, { t: 0.30 }, { t: 0.565 }, { t: 0.83 }, { t: 0.46 }, { t: 0.72 }],
    hazards: [],
  },
};

const HAZARD_RADIUS = { oil: 1.8, mud: 2.1 };
const BOOST_RADIUS = 2.2;
const ROAD_SEGMENTS = 400;      // ribbon rows (≥ 200 per contract)
const PROJECT_SAMPLES = 1200;   // pre-sampled centreline points for project()

// ───────────────────────────────────────────────────────────── helpers ──

function wrap01(t) { t = t % 1; return t < 0 ? t + 1 : t; }

function headingFromTangent(tx, tz) { return Math.atan2(tx, tz); }

// Build a closed centripetal Catmull-Rom curve from control points, round off sharp
// corners (dense resample + Laplacian smoothing in XZ, heights kept), then scale XZ so
// the length matches the target. Guarantees the inner road edge never pinches.
function buildCurve(THREE, control, targetLength, smoothPasses = 0) {
  const mk = (pts, s) => {
    const c = new THREE.CatmullRomCurve3(pts.map(([x, z, y = 0]) => new THREE.Vector3(x * s, y, z * s)), true, "centripetal");
    c.arcLengthDivisions = 1000;
    return c;
  };
  let pts = control;
  if (smoothPasses > 0) {
    const dense = mk(control, 1);
    const n = 96;
    const xz = [], ys = [];
    for (let i = 0; i < n; i++) { const p = dense.getPointAt(i / n); xz.push([p.x, p.z]); ys.push(p.y); }
    for (let k = 0; k < smoothPasses; k++) {
      const next = xz.map((p, i) => {
        const a = xz[(i - 1 + n) % n], b = xz[(i + 1) % n];
        return [(p[0] + a[0] + b[0]) / 3, (p[1] + a[1] + b[1]) / 3];
      });
      for (let i = 0; i < n; i++) xz[i] = next[i];
    }
    pts = xz.map((p, i) => [p[0], p[1], ys[i]]);
  }
  const s = targetLength / mk(pts, 1).getLength();
  const curve = mk(pts, s);
  curve.updateArcLengths();
  return curve;
}

function makeColorArray(n) { return new Float32Array(n * 3); }

function setColor(arr, i, c) { arr[i * 3] = c[0]; arr[i * 3 + 1] = c[1]; arr[i * 3 + 2] = c[2]; }

function lerpColor(a, b, t) { return [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t]; }

function hsl(h, s, l) {
  // small HSL→RGB for rainbow bridges
  const k = (n) => (n + h * 12) % 12;
  const a = s * Math.min(l, 1 - l);
  const f = (n) => l - a * Math.max(-1, Math.min(k(n) - 3, Math.min(9 - k(n), 1)));
  return [f(0), f(8), f(4)];
}

function hasDocument() { return typeof document !== "undefined" && typeof document.createElement === "function"; }

// Subtle grain texture (browser only). Multiplies vertex colours, so Node output looks the same minus grain.
function grainTexture(THREE, rng, tint = 1) {
  if (!hasDocument()) return null;
  try {
    const c = document.createElement("canvas");
    c.width = 128; c.height = 128;
    const ctx = c.getContext("2d");
    const img = ctx.createImageData(128, 128);
    for (let i = 0; i < img.data.length; i += 4) {
      const v = Math.round(255 * Math.min(1, tint * (0.88 + rng() * 0.16)));
      img.data[i] = v; img.data[i + 1] = v; img.data[i + 2] = v; img.data[i + 3] = 255;
    }
    ctx.putImageData(img, 0, 0);
    const tex = new THREE.CanvasTexture(c);
    tex.wrapS = THREE.RepeatWrapping; tex.wrapT = THREE.RepeatWrapping;
    return tex;
  } catch (_) { return null; }
}

// Canvas banner with Korean text (browser only).
function bannerTexture(THREE, text, bg, fg) {
  if (!hasDocument()) return null;
  try {
    const c = document.createElement("canvas");
    c.width = 512; c.height = 128;
    const ctx = c.getContext("2d");
    ctx.fillStyle = bg; ctx.fillRect(0, 0, 512, 128);
    ctx.fillStyle = fg; ctx.font = "bold 84px sans-serif";
    ctx.textAlign = "center"; ctx.textBaseline = "middle";
    ctx.fillText(text, 256, 68);
    const tex = new THREE.CanvasTexture(c);
    return tex;
  } catch (_) { return null; }
}

// ────────────────────────────────────────────────────── core geometry ──

// Pre-sample the centreline for fast projection.
function buildProjectionTable(curve, n) {
  const xs = new Float32Array(n), ys = new Float32Array(n), zs = new Float32Array(n);
  const txs = new Float32Array(n), tzs = new Float32Array(n);
  for (let i = 0; i < n; i++) {
    const t = i / n;
    const p = curve.getPointAt(t);
    const tg = curve.getTangentAt(t);
    xs[i] = p.x; ys[i] = p.y; zs[i] = p.z;
    const l = Math.hypot(tg.x, tg.z) || 1;
    txs[i] = tg.x / l; tzs[i] = tg.z / l;
  }
  return { n, xs, ys, zs, txs, tzs };
}

function makeProject(table, width, fallOff) {
  const { n, xs, ys, zs, txs, tzs } = table;
  return function project(x, z) {
    // 1) nearest pre-sampled point (linear scan; n=1200 is cheap)
    let best = 0, bestD = Infinity;
    for (let i = 0; i < n; i++) {
      const dx = xs[i] - x, dz = zs[i] - z;
      const d = dx * dx + dz * dz;
      if (d < bestD) { bestD = d; best = i; }
    }
    // 2) refine on the two neighbouring segments (linear projection)
    let segI = best, segU = 0, segD = bestD;
    for (const [a, b] of [[(best - 1 + n) % n, best], [best, (best + 1) % n]]) {
      const ax = xs[a], az = zs[a], bx = xs[b], bz = zs[b];
      const vx = bx - ax, vz = bz - az;
      const len2 = vx * vx + vz * vz || 1e-9;
      let u = ((x - ax) * vx + (z - az) * vz) / len2;
      u = u < 0 ? 0 : u > 1 ? 1 : u;
      const px = ax + vx * u, pz = az + vz * u;
      const d = (px - x) * (px - x) + (pz - z) * (pz - z);
      if (d < segD) { segD = d; segI = a; segU = u; }
    }
    const j = (segI + 1) % n;
    const px = xs[segI] + (xs[j] - xs[segI]) * segU;
    const pz = zs[segI] + (zs[j] - zs[segI]) * segU;
    const height = ys[segI] + (ys[j] - ys[segI]) * segU;
    let tx = txs[segI] + (txs[j] - txs[segI]) * segU;
    let tz = tzs[segI] + (tzs[j] - tzs[segI]) * segU;
    const tl = Math.hypot(tx, tz) || 1; tx /= tl; tz /= tl;
    // right = (-tz, 0, tx)
    const lateral = (x - px) * -tz + (z - pz) * tx;
    const t = wrap01((segI + segU) / n);
    const onTrack = Math.abs(lateral) <= width / 2;
    return {
      t, lateral, onTrack, height,
      heading: headingFromTangent(tx, tz),
      falling: fallOff && !onTrack,
      distance: Math.sqrt(segD),
    };
  };
}

// Ribbon geometry: rows along the curve, `cols` lateral offsets, vertex colours via colorFn(row, col, t).
function buildRibbon(THREE, curve, rows, cols, yLift, colorFn, rowFilter) {
  const positions = [], colors = [], uvs = [], indices = [];
  const p = new THREE.Vector3(), tg = new THREE.Vector3();
  const keep = new Uint8Array(rows + 1);
  for (let r = 0; r <= rows; r++) {
    const t = (r % rows) / rows;
    curve.getPointAt(t, p);
    curve.getTangentAt(t, tg);
    const l = Math.hypot(tg.x, tg.z) || 1;
    const rx = -tg.z / l, rz = tg.x / l; // right vector (horizontal)
    keep[r] = rowFilter ? (rowFilter(t) ? 1 : 0) : 1;
    for (let c = 0; c < cols.length; c++) {
      const off = cols[c];
      positions.push(p.x + rx * off, p.y + yLift, p.z + rz * off);
      const col = colorFn(r, c, t, off);
      colors.push(col[0], col[1], col[2]);
      uvs.push(c / (cols.length - 1), (t * curve.getLength()) / 4);
    }
  }
  const stride = cols.length;
  for (let r = 0; r < rows; r++) {
    if (!keep[r] || !keep[r + 1]) continue;
    for (let c = 0; c < stride - 1; c++) {
      const a = r * stride + c, b = a + 1, cc = a + stride, d = cc + 1;
      indices.push(a, b, cc, b, d, cc);
    }
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute("position", new THREE.Float32BufferAttribute(positions, 3));
  g.setAttribute("color", new THREE.Float32BufferAttribute(colors, 3));
  g.setAttribute("uv", new THREE.Float32BufferAttribute(uvs, 2));
  g.setIndex(indices);
  g.computeVertexNormals();
  g.computeBoundingSphere();
  return g;
}

function inGap(gaps, t) {
  for (const g of gaps) if (t >= g.t0 && t <= g.t1) return true;
  return false;
}

function buildRoad(THREE, theme, curve, rng, group) {
  const w = theme.width, hw = w / 2;
  const { base, line, edge, dashed } = theme.road;
  // duplicated columns give hard colour edges (vertex colours interpolate otherwise)
  const cols = [-hw, -hw + 0.5, -hw + 0.5, -hw + 0.8, -hw + 0.8, -0.2, -0.2, 0.2, 0.2, hw - 0.8, hw - 0.8, hw - 0.5, hw - 0.5, hw];
  const EDGE = new Set([2, 3, 10, 11]), CENTRE = new Set([6, 7]);
  const colorFn = (r, c, t) => {
    if (EDGE.has(c)) return edge;                      // white edge lines
    if (CENTRE.has(c)) {                               // centre line
      if (!dashed) return line;
      return Math.floor(t * curve.getLength() / 3) % 2 === 0 ? line : base;
    }
    // slight along-track shading to break up flatness
    const k = 0.96 + 0.04 * Math.sin(r * 0.7);
    return [base[0] * k, base[1] * k, base[2] * k];
  };
  const gaps = theme.gaps || [];
  const roadGeo = buildRibbon(THREE, curve, ROAD_SEGMENTS, cols, 0.02, colorFn, (t) => !inGap(gaps, t));
  const roadMat = new THREE.MeshLambertMaterial({ vertexColors: true, map: grainTexture(THREE, rng) });
  const road = new THREE.Mesh(roadGeo, roadMat);
  road.name = "road";
  group.add(road);

  let bridge = null;
  if (gaps.length) {
    const bridgeGeo = buildRibbon(THREE, curve, ROAD_SEGMENTS, [-hw, -hw / 3, hw / 3, hw], 0.0,
      (r, c, t) => hsl(((t * 6) + c * 0.12) % 1, 0.85, 0.7), (t) => inGap(gaps, t));
    const bridgeMat = new THREE.MeshBasicMaterial({ vertexColors: true, transparent: true, opacity: 0.6, side: THREE.DoubleSide, depthWrite: false });
    bridge = new THREE.Mesh(bridgeGeo, bridgeMat);
    bridge.name = "bridge";
    group.add(bridge);
  }

  // curbs on both sides: alternating colours, slightly raised
  const curbW = w >= 12 ? 0.9 : 0.6;
  const curbCols = [-hw - curbW, -hw, hw, hw + curbW];
  const [ca, cb] = theme.curb;
  const curbGeo = buildRibbon(THREE, curve, ROAD_SEGMENTS, curbCols, 0.08,
    (r, c, t) => (Math.floor(t * curve.getLength() / 2.5) % 2 === 0 ? ca : cb),
    (t) => !inGap(gaps, t));
  // drop the centre quad (between -hw and hw) so curbs are two strips: rebuild index
  {
    const idx = [];
    const stride = 4;
    const rows = ROAD_SEGMENTS;
    for (let r = 0; r < rows; r++) {
      const t0 = r / rows, t1 = ((r + 1) % rows) / rows;
      if (inGap(gaps, t0) || inGap(gaps, r + 1 === rows ? 0 : t1)) continue;
      for (const c of [0, 2]) {
        const a = r * stride + c, b = a + 1, cc = a + stride, d = cc + 1;
        idx.push(a, b, cc, b, d, cc);
      }
    }
    curbGeo.setIndex(idx);
    curbGeo.computeVertexNormals();
  }
  const curb = new THREE.Mesh(curbGeo, new THREE.MeshLambertMaterial({ vertexColors: true }));
  curb.name = "curbs";
  group.add(curb);

  return { road, bridge, curb };
}

function buildStartLine(THREE, theme, curve, group) {
  const w = theme.width, hw = w / 2;
  const L = curve.getLength();
  const len = 3.0; // metres along track
  const rowsN = 6, colsN = 8;
  const positions = [], colors = [], indices = [];
  const p = new THREE.Vector3(), tg = new THREE.Vector3();
  for (let r = 0; r <= rowsN; r++) {
    const t = wrap01((-len / 2 + (len * r) / rowsN) / L);
    curve.getPointAt(t, p); curve.getTangentAt(t, tg);
    const l = Math.hypot(tg.x, tg.z) || 1;
    const rx = -tg.z / l, rz = tg.x / l;
    for (let c = 0; c <= colsN; c++) {
      const off = -hw + (w * c) / colsN;
      positions.push(p.x + rx * off, p.y + 0.035, p.z + rz * off);
      const dark = (r + c) % 2 === 0;
      const col = dark ? [0.12, 0.12, 0.16] : [1, 1, 1];
      colors.push(col[0], col[1], col[2]);
    }
  }
  const stride = colsN + 1;
  for (let r = 0; r < rowsN; r++) for (let c = 0; c < colsN; c++) {
    const a = r * stride + c, b = a + 1, cc = a + stride, d = cc + 1;
    indices.push(a, b, cc, b, d, cc);
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute("position", new THREE.Float32BufferAttribute(positions, 3));
  g.setAttribute("color", new THREE.Float32BufferAttribute(colors, 3));
  g.setIndex(indices);
  g.computeVertexNormals();
  const m = new THREE.Mesh(g, new THREE.MeshBasicMaterial({ vertexColors: true }));
  m.name = "startLine";
  group.add(m);
}

function buildGate(THREE, theme, curve, group) {
  const hw = theme.width / 2;
  const p = curve.getPointAt(0), tg = curve.getTangentAt(0);
  const l = Math.hypot(tg.x, tg.z) || 1;
  const rx = -tg.z / l, rz = tg.x / l;
  const heading = headingFromTangent(tg.x, tg.z);
  const gate = new THREE.Group();
  gate.name = "gate";
  const postMat = new THREE.MeshLambertMaterial({ color: 0xfff4d6 });
  const postGeo = new THREE.CylinderGeometry(0.35, 0.45, 7, 8);
  for (const s of [-1, 1]) {
    const post = new THREE.Mesh(postGeo, postMat);
    post.position.set(p.x + rx * s * (hw + 1.2), p.y + 3.5, p.z + rz * s * (hw + 1.2));
    gate.add(post);
    // little flag ball on top
    const ball = new THREE.Mesh(new THREE.SphereGeometry(0.6, 10, 8), new THREE.MeshLambertMaterial({ color: s < 0 ? 0xff8fb1 : 0x8fd3ff }));
    ball.position.set(post.position.x, p.y + 7.3, post.position.z);
    gate.add(ball);
  }
  const bannerTex = bannerTexture(THREE, "출발 ★ START", "#ffd93d", "#2b2350");
  const bannerMat = bannerTex
    ? new THREE.MeshBasicMaterial({ map: bannerTex, side: THREE.DoubleSide })
    : new THREE.MeshLambertMaterial({ color: 0xffd93d, side: THREE.DoubleSide });
  const banner = new THREE.Mesh(new THREE.BoxGeometry(theme.width + 2.4, 1.6, 0.3), bannerMat);
  banner.position.set(p.x, p.y + 6.2, p.z);
  banner.rotation.y = heading;
  gate.add(banner);
  group.add(gate);
}

function buildSkyDome(THREE, theme, group) {
  const geo = new THREE.SphereGeometry(900, 24, 16);
  const pos = geo.getAttribute("position");
  const colors = makeColorArray(pos.count);
  const { top, horizon, bottom } = theme.sky;
  for (let i = 0; i < pos.count; i++) {
    const y = pos.getY(i) / 900; // -1..1
    const c = y >= 0 ? lerpColor(horizon, top, Math.pow(y, 0.6)) : lerpColor(horizon, bottom, Math.min(1, -y * 3));
    setColor(colors, i, c);
  }
  geo.setAttribute("color", new THREE.BufferAttribute(colors, 3));
  const mat = new THREE.MeshBasicMaterial({ vertexColors: true, side: THREE.BackSide, depthWrite: false, fog: false });
  const dome = new THREE.Mesh(geo, mat);
  dome.name = "skyDome";
  dome.renderOrder = -10;
  dome.frustumCulled = false;
  group.add(dome);
}

function buildGround(THREE, theme, group) {
  if (!theme.ground) {
    // sky track: a soft cloud floor far below so falling has something to fall toward
    const g = new THREE.CircleGeometry(700, 48);
    const m = new THREE.Mesh(g, new THREE.MeshBasicMaterial({ color: 0xfbe9f1, transparent: true, opacity: 0.9, depthWrite: false }));
    m.rotation.x = -Math.PI / 2;
    m.position.y = -60;
    m.name = "cloudFloor";
    group.add(m);
    return;
  }
  const g = new THREE.CircleGeometry(600, 48);
  const c = theme.ground;
  const m = new THREE.Mesh(g, new THREE.MeshLambertMaterial({ color: new THREE.Color(c[0], c[1], c[2]) }));
  m.rotation.x = -Math.PI / 2;
  m.position.y = -0.05;
  m.name = "ground";
  group.add(m);
}

// Theme intensities are in legacy (pre-r155) units; Three ≥ r155 is physically-correct only,
// so multiply by π to get the same brightness.
function buildLights(THREE, theme, group) {
  const { sky, ground, sun, sunIntensity, hemiIntensity } = theme.light;
  const hemi = new THREE.HemisphereLight(sky, ground, hemiIntensity * Math.PI);
  hemi.name = "hemiLight";
  const dir = new THREE.DirectionalLight(sun, sunIntensity * Math.PI);
  dir.position.set(80, 140, 60);
  dir.name = "sunLight";
  group.add(hemi, dir);
  return [hemi, dir];
}

// Places `count` instances off the road using `sample`+`project`. Returns instance transforms.
function scatter(count, rng, curve, project, width, opts) {
  const { minOff, maxOff, minGapFromRoad = 2.5, yBase = 0, yJitter = 0, sideBias = 0 } = opts;
  const out = [];
  const L = curve.getLength();
  let tries = 0;
  while (out.length < count && tries < count * 12) {
    tries++;
    const t = rng();
    const side = rng() < 0.5 + sideBias ? 1 : -1;
    const off = side * (minOff + rng() * (maxOff - minOff));
    const p = curve.getPointAt(t), tg = curve.getTangentAt(t);
    const l = Math.hypot(tg.x, tg.z) || 1;
    const x = p.x + (-tg.z / l) * off, z = p.z + (tg.x / l) * off;
    const pr = project(x, z);
    if (Math.abs(pr.lateral) < width / 2 + minGapFromRoad) continue; // too close to another part of the track
    out.push({ x, y: yBase + (rng() - 0.5) * 2 * yJitter + (opts.followRoadHeight ? p.y : 0), z, rot: rng() * TAU, scale: 0.8 + rng() * 0.5, t, L });
  }
  return out;
}

function makeInstanced(THREE, geo, mat, items, place) {
  const im = new THREE.InstancedMesh(geo, mat, items.length);
  const m4 = new THREE.Matrix4(), q = new THREE.Quaternion(), s = new THREE.Vector3(), v = new THREE.Vector3();
  const e = new THREE.Euler();
  items.forEach((it, i) => {
    const d = place(it);
    v.set(d.x, d.y, d.z);
    e.set(d.rx || 0, d.ry || 0, d.rz || 0);
    q.setFromEuler(e);
    s.set(d.sx ?? d.s ?? 1, d.sy ?? d.s ?? 1, d.sz ?? d.s ?? 1);
    m4.compose(v, q, s);
    im.setMatrixAt(i, m4);
  });
  im.instanceMatrix.needsUpdate = true;
  if (typeof im.computeBoundingSphere === "function") im.computeBoundingSphere();
  im.frustumCulled = false; // spans the whole track; skip per-instance culling headaches
  return im;
}

function buildScenery(THREE, theme, curve, project, rng, group) {
  const w = theme.width;
  const lam = (hex) => new THREE.MeshLambertMaterial({ color: hex });
  const add = (name, im) => { im.name = name; group.add(im); };

  if (theme.difficulty === "easy") {
    // trees: trunk + canopy (2 instanced meshes), flowers, clouds, balloons
    const trees = scatter(90, rng, curve, project, w, { minOff: w / 2 + 4, maxOff: w / 2 + 30 });
    add("treeTrunks", makeInstanced(THREE, new THREE.CylinderGeometry(0.35, 0.5, 2.2, 6), lam(0x9a6b3f), trees,
      (it) => ({ x: it.x, y: 1.1 * it.scale, z: it.z, ry: it.rot, s: it.scale })));
    add("treeCanopies", makeInstanced(THREE, new THREE.ConeGeometry(2.2, 4.5, 8), lam(0x5fbf5a), trees,
      (it) => ({ x: it.x, y: 2.2 * it.scale + 2.0 * it.scale, z: it.z, ry: it.rot, s: it.scale })));
    const flowers = scatter(220, rng, curve, project, w, { minOff: w / 2 + 1.5, maxOff: w / 2 + 40, minGapFromRoad: 1.2 });
    add("flowers", makeInstanced(THREE, new THREE.SphereGeometry(0.45, 6, 5), new THREE.MeshLambertMaterial({ color: 0xff8fb1 }), flowers,
      (it) => ({ x: it.x, y: 0.35, z: it.z, s: it.scale })));
    const flowers2 = scatter(180, rng, curve, project, w, { minOff: w / 2 + 1.5, maxOff: w / 2 + 40, minGapFromRoad: 1.2 });
    add("flowersYellow", makeInstanced(THREE, new THREE.SphereGeometry(0.4, 6, 5), lam(0xffe066), flowers2,
      (it) => ({ x: it.x, y: 0.3, z: it.z, s: it.scale })));
    const clouds = [];
    for (let i = 0; i < 26; i++) clouds.push({ x: (rng() - 0.5) * 700, y: 60 + rng() * 40, z: (rng() - 0.5) * 700, s: 6 + rng() * 10, rot: rng() * TAU });
    add("clouds", makeInstanced(THREE, new THREE.SphereGeometry(1, 10, 7), new THREE.MeshBasicMaterial({ color: 0xffffff }), clouds,
      (it) => ({ x: it.x, y: it.y, z: it.z, ry: it.rot, sx: it.s * 1.6, sy: it.s * 0.55, sz: it.s })));
    const balloons = scatter(18, rng, curve, project, w, { minOff: w / 2 + 6, maxOff: w / 2 + 25 });
    add("balloons", makeInstanced(THREE, new THREE.SphereGeometry(1.1, 10, 8), lam(0x8fd3ff), balloons,
      (it) => ({ x: it.x, y: 6 + it.scale * 4, z: it.z, s: it.scale })));
    add("balloonStrings", makeInstanced(THREE, new THREE.CylinderGeometry(0.03, 0.03, 6, 3), lam(0xffffff), balloons,
      (it) => ({ x: it.x, y: 3 + it.scale * 4 - 1, z: it.z })));
    // fence posts along the outside of the first straight
    const posts = [];
    for (let i = 0; i < 40; i++) posts.push({ t: (i / 40), side: i % 2 ? 1 : -1 });
    const fence = posts.map((it) => {
      const p = curve.getPointAt(it.t), tg = curve.getTangentAt(it.t);
      const l = Math.hypot(tg.x, tg.z) || 1;
      const off = it.side * (w / 2 + 2.6);
      return { x: p.x + (-tg.z / l) * off, y: 0.6, z: p.z + (tg.x / l) * off, ry: headingFromTangent(tg.x, tg.z) };
    }).filter((f) => Math.abs(project(f.x, f.z).lateral) > w / 2 + 2.0);
    add("fencePosts", makeInstanced(THREE, new THREE.BoxGeometry(0.3, 1.2, 0.3), lam(0xfff1d6), fence, (it) => it));
  } else if (theme.difficulty === "medium") {
    // castle towers (body + roof), wall blocks, lamps (post + glow), bushes
    const towers = scatter(22, rng, curve, project, w, { minOff: w / 2 + 6, maxOff: w / 2 + 28, minGapFromRoad: 4 });
    add("towerBodies", makeInstanced(THREE, new THREE.CylinderGeometry(2.4, 2.8, 12, 10), lam(0xd9d0e8), towers,
      (it) => ({ x: it.x, y: 6 * it.scale, z: it.z, ry: it.rot, s: it.scale })));
    add("towerRoofs", makeInstanced(THREE, new THREE.ConeGeometry(3.2, 5, 10), lam(0x7d63d6), towers,
      (it) => ({ x: it.x, y: 12 * it.scale + 2.5 * it.scale, z: it.z, ry: it.rot, s: it.scale })));
    add("towerFlags", makeInstanced(THREE, new THREE.ConeGeometry(0.5, 1.4, 4), lam(0xff8fb1), towers,
      (it) => ({ x: it.x, y: 14.5 * it.scale + 1.2, z: it.z, ry: it.rot, s: 1 })));
    const walls = scatter(70, rng, curve, project, w, { minOff: w / 2 + 3, maxOff: w / 2 + 5, minGapFromRoad: 2.4 });
    add("wallBlocks", makeInstanced(THREE, new THREE.BoxGeometry(3.2, 2.0, 1.4), lam(0xcfc4dd), walls,
      (it) => ({ x: it.x, y: 1.0, z: it.z, ry: headingFromTangent(...tangentAt(curve, it.t)), s: 1 })));
    const lampsRaw = [];
    for (let i = 0; i < 28; i++) lampsRaw.push({ t: i / 28, side: i % 2 ? 1 : -1 });
    const lamps = lampsRaw.map((it) => {
      const p = curve.getPointAt(it.t), tg = curve.getTangentAt(it.t);
      const l = Math.hypot(tg.x, tg.z) || 1;
      const off = it.side * (w / 2 + 1.8);
      return { x: p.x + (-tg.z / l) * off, y: p.y, z: p.z + (tg.x / l) * off };
    }).filter((f) => Math.abs(project(f.x, f.z).lateral) > w / 2 + 1.4);
    add("lampPosts", makeInstanced(THREE, new THREE.CylinderGeometry(0.12, 0.16, 4.2, 6), lam(0x4a3f6b), lamps,
      (it) => ({ x: it.x, y: it.y + 2.1, z: it.z })));
    add("lampGlows", makeInstanced(THREE, new THREE.SphereGeometry(0.45, 8, 6), new THREE.MeshBasicMaterial({ color: 0xfff1a8 }), lamps,
      (it) => ({ x: it.x, y: it.y + 4.4, z: it.z })));
    const bushes = scatter(120, rng, curve, project, w, { minOff: w / 2 + 2, maxOff: w / 2 + 34, minGapFromRoad: 1.8 });
    add("bushes", makeInstanced(THREE, new THREE.SphereGeometry(1.0, 8, 6), lam(0x62b35c), bushes,
      (it) => ({ x: it.x, y: 0.6 * it.scale, z: it.z, sx: it.scale * 1.3, sy: it.scale * 0.8, sz: it.scale })));
    const clouds = [];
    for (let i = 0; i < 22; i++) clouds.push({ x: (rng() - 0.5) * 800, y: 70 + rng() * 50, z: (rng() - 0.5) * 800, s: 8 + rng() * 12, rot: rng() * TAU });
    add("clouds", makeInstanced(THREE, new THREE.SphereGeometry(1, 10, 7), new THREE.MeshBasicMaterial({ color: 0xfff4fa }), clouds,
      (it) => ({ x: it.x, y: it.y, z: it.z, ry: it.rot, sx: it.s * 1.6, sy: it.s * 0.5, sz: it.s })));
    // ramp side rails so the jump reads as a ramp
    const ramp = theme.ramp;
    if (ramp) {
      const rails = [];
      for (let i = 0; i <= 10; i++) {
        const t = ramp.t0 + (ramp.t1 - ramp.t0) * (i / 10);
        const p = curve.getPointAt(t), tg = curve.getTangentAt(t);
        const l = Math.hypot(tg.x, tg.z) || 1;
        for (const s of [-1, 1]) rails.push({ x: p.x + (-tg.z / l) * s * (w / 2 + 0.9), y: p.y + 0.6, z: p.z + (tg.x / l) * s * (w / 2 + 0.9) });
      }
      add("rampRails", makeInstanced(THREE, new THREE.SphereGeometry(0.4, 6, 5), lam(0xffd93d), rails, (it) => it));
    }
  } else {
    // sky: big puffy clouds around/below, star sparkles, rainbow arches near gaps
    const cloudsBelow = [];
    for (let i = 0; i < 60; i++) cloudsBelow.push({ x: (rng() - 0.5) * 500, y: -12 - rng() * 40, z: (rng() - 0.5) * 500, s: 7 + rng() * 14, rot: rng() * TAU });
    add("cloudsBelow", makeInstanced(THREE, new THREE.SphereGeometry(1, 10, 7), new THREE.MeshLambertMaterial({ color: 0xffffff }), cloudsBelow,
      (it) => ({ x: it.x, y: it.y, z: it.z, ry: it.rot, sx: it.s * 1.7, sy: it.s * 0.6, sz: it.s })));
    const cloudsSide = scatter(70, rng, curve, project, w, { minOff: w / 2 + 3, maxOff: w / 2 + 22, minGapFromRoad: 2.2 });
    add("cloudPuffs", makeInstanced(THREE, new THREE.SphereGeometry(1, 10, 7), new THREE.MeshLambertMaterial({ color: 0xffffff }), cloudsSide,
      (it) => ({ x: it.x, y: -1.5 - rng() * 2, z: it.z, ry: it.rot, sx: 3 * it.scale, sy: 1.6 * it.scale, sz: 2.4 * it.scale })));
    const stars = [];
    for (let i = 0; i < 160; i++) stars.push({ x: (rng() - 0.5) * 600, y: 8 + rng() * 90, z: (rng() - 0.5) * 600, s: 0.6 + rng() * 1.2, rot: rng() * TAU });
    add("stars", makeInstanced(THREE, new THREE.OctahedronGeometry(1, 0), new THREE.MeshBasicMaterial({ color: 0xfff3a0 }), stars,
      (it) => ({ x: it.x, y: it.y, z: it.z, ry: it.rot, rx: it.rot * 0.3, s: it.s })));
    const moons = [];
    for (let i = 0; i < 6; i++) moons.push({ x: (rng() - 0.5) * 500, y: 40 + rng() * 40, z: (rng() - 0.5) * 500, s: 4 + rng() * 4 });
    add("moons", makeInstanced(THREE, new THREE.SphereGeometry(1, 12, 9), new THREE.MeshBasicMaterial({ color: 0xfff9d6 }), moons,
      (it) => ({ x: it.x, y: it.y, z: it.z, s: it.s })));
    // rainbow arches: a torus half above each gap start, one instance per gap
    const arches = (theme.gaps || []).map((g) => {
      const t = g.t0;
      const p = curve.getPointAt(t), tg = curve.getTangentAt(t);
      return { x: p.x, y: p.y, z: p.z, ry: headingFromTangent(tg.x, tg.z) };
    });
    add("rainbowArches", makeInstanced(THREE, new THREE.TorusGeometry(w / 2 + 2.5, 0.5, 8, 24, Math.PI),
      new THREE.MeshBasicMaterial({ color: 0xffb3d9 }), arches, (it) => ({ x: it.x, y: it.y, z: it.z, ry: it.ry })));
    // cloud pillars under the road (visual support), instanced along the track
    const pillars = [];
    for (let i = 0; i < 48; i++) {
      const t = i / 48;
      if (inGap(theme.gaps, t)) continue;
      const p = curve.getPointAt(t);
      pillars.push({ x: p.x, y: p.y - 3.5, z: p.z, s: 1 + rng() * 0.4 });
    }
    add("cloudPillars", makeInstanced(THREE, new THREE.SphereGeometry(1, 8, 6), new THREE.MeshLambertMaterial({ color: 0xf5f0ff }), pillars,
      (it) => ({ x: it.x, y: it.y, z: it.z, sx: w * 0.75 * it.s, sy: 3 * it.s, sz: w * 0.75 * it.s })));
  }
}

function tangentAt(curve, t) { const tg = curve.getTangentAt(t); return [tg.x, tg.z]; }

function buildPadsAndHazards(THREE, theme, curve, group) {
  const w = theme.width;
  const boostPads = (theme.boost || []).map(({ t, side = 0 }) => {
    const p = curve.getPointAt(t), tg = curve.getTangentAt(t);
    const l = Math.hypot(tg.x, tg.z) || 1;
    const off = side * (w / 2 - 2.5);
    const position = new THREE.Vector3(p.x + (-tg.z / l) * off, p.y, p.z + (tg.x / l) * off);
    return { position, radius: BOOST_RADIUS, t, heading: headingFromTangent(tg.x, tg.z) };
  });
  if (boostPads.length) {
    const im = makeInstanced(THREE, new THREE.BoxGeometry(3.4, 0.14, 2.8), new THREE.MeshBasicMaterial({ color: 0x3ff0ff }), boostPads,
      (b) => ({ x: b.position.x, y: b.position.y + 0.08, z: b.position.z, ry: b.heading }));
    im.name = "boostPads";
    group.add(im);
    // arrow chevrons on top of each pad
    const chev = makeInstanced(THREE, new THREE.ConeGeometry(0.9, 1.6, 3), new THREE.MeshBasicMaterial({ color: 0xffffff }), boostPads,
      (b) => ({ x: b.position.x, y: b.position.y + 0.17, z: b.position.z, rx: Math.PI / 2, ry: b.heading, sy: 1, sx: 1, sz: 0.1 }));
    chev.name = "boostChevrons";
    group.add(chev);
  }
  const hazards = (theme.hazards || []).map(({ t, kind, side = 0 }) => {
    const p = curve.getPointAt(t), tg = curve.getTangentAt(t);
    const l = Math.hypot(tg.x, tg.z) || 1;
    const off = side * (w / 2);
    const position = new THREE.Vector3(p.x + (-tg.z / l) * off, p.y, p.z + (tg.x / l) * off);
    return { position, radius: HAZARD_RADIUS[kind] || 1.8, kind, t };
  });
  for (const kind of ["oil", "mud"]) {
    const list = hazards.filter((h) => h.kind === kind);
    if (!list.length) continue;
    const color = kind === "oil" ? 0x4b3f7a : 0x8a5a2b;
    const im = makeInstanced(THREE, new THREE.CylinderGeometry(1, 1, 0.1, 14), new THREE.MeshLambertMaterial({ color }), list,
      (h) => ({ x: h.position.x, y: h.position.y + 0.06, z: h.position.z, sx: h.radius, sy: 1, sz: h.radius * 0.8 }));
    im.name = kind === "oil" ? "oilSlicks" : "mudPuddles";
    group.add(im);
  }
  return { boostPads, hazards };
}

// ────────────────────────────────────────────────────────────── main ──

export function buildTrack(trackId, THREE) {
  let theme = THEMES[trackId];
  if (!theme) throw new Error(`unknown track id: ${trackId}`);
  if (!THREE || !THREE.CatmullRomCurve3) throw new Error("buildTrack needs THREE");

  const rng = makeRng(trackId.length * 7919 + 11);
  const width = theme.width;
  const curve = buildCurve(THREE, theme.control, theme.targetLength, theme.smooth);
  const length = curve.getLength();

  const table = buildProjectionTable(curve, PROJECT_SAMPLES);
  const project = makeProject(table, width, theme.fallOff);

  // jump ramp (castle): the t-range where the centreline is raised
  let ramp = null;
  {
    let t0 = -1, t1 = -1;
    for (let i = 0; i < table.n; i++) {
      if (table.ys[i] > 0.15) { if (t0 < 0) t0 = i / table.n; t1 = i / table.n; }
    }
    if (t0 >= 0) ramp = { t0, t1, peak: Math.max(...table.ys) };
  }
  theme = { ...theme, ramp };

  // sample(t)
  const sample = (t) => {
    t = wrap01(t);
    const position = curve.getPointAt(t);
    const tangent = curve.getTangentAt(t).normalize();
    const l = Math.hypot(tangent.x, tangent.z) || 1;
    const normal = new THREE.Vector3(-tangent.z / l, 0, tangent.x / l); // right-hand lateral normal
    return { position, tangent, normal, right: normal, up: new THREE.Vector3(0, 1, 0), heading: headingFromTangent(tangent.x, tangent.z) };
  };

  const progressBetween = (t0, t1) => {
    let d = wrap01(t1) - wrap01(t0);
    if (d > 0.5) d -= 1; else if (d < -0.5) d += 1;
    return d * length;
  };

  // checkpoints: evenly spaced, [0] = start/finish at t=0
  const N = theme.checkpointCount;
  const checkpoints = [];
  for (let i = 0; i < N; i++) {
    const t = i / N;
    const s = sample(t);
    checkpoints.push({ t, position: s.position, heading: s.heading, index: i });
  }

  // start grid: 3 rows × 2 columns behind the line, facing along the curve
  const startGrid = [];
  const startSlots = [];
  const colOff = width >= 12 ? 2.4 : 1.9;
  for (let i = 0; i < RACE.RACERS; i++) {
    const row = Math.floor(i / 2), col = i % 2 === 0 ? -1 : 1;
    const back = 5 + row * 4.5 + (col > 0 ? 1.2 : 0); // stagger second column slightly
    const t = wrap01(-back / length);
    const s = sample(t);
    const pos = s.position.clone().addScaledVector(s.normal, col * colOff);
    startGrid.push(pos);
    startSlots.push({ position: pos, heading: s.heading, t });
  }

  const group = new THREE.Group();
  group.name = `track:${trackId}`;
  buildSkyDome(THREE, theme, group);
  buildGround(THREE, theme, group);
  const lights = buildLights(THREE, theme, group);
  buildRoad(THREE, theme, curve, rng, group);
  buildStartLine(THREE, theme, curve, group);
  buildGate(THREE, theme, curve, group);
  const { boostPads, hazards } = buildPadsAndHazards(THREE, theme, curve, group);
  buildScenery(THREE, theme, curve, project, rng, group);

  const respawnAt = (checkpointIndex) => {
    const cp = checkpoints[((checkpointIndex % N) + N) % N] || checkpoints[0];
    return { position: cp.position.clone(), heading: cp.heading, t: cp.t };
  };

  return {
    id: trackId,
    name: theme.name,
    difficulty: theme.difficulty,
    laps: RACE.LAPS,
    curve,
    width,
    group,
    length,
    checkpoints,
    startGrid,
    startSlots,          // extra: [{ position, heading, t }] parallel to startGrid
    startHeading: startSlots[0].heading,
    boostPads,
    hazards,
    gaps: theme.gaps || [],  // extra: sky cloud gaps as t-ranges (road is a translucent bridge there)
    fallOff: theme.fallOff,  // extra: true → leaving the road means falling (integrator respawns)
    ramp,                    // extra: castle jump { t0, t1, peak } or null
    lights,                  // extra: [HemisphereLight, DirectionalLight] already inside group
    sample,
    project,
    progressBetween,
    respawnAt,               // extra: (checkpointIndex) → { position, heading, t }
    headingAt: (t) => sample(t).heading,
    inGap: (t) => inGap(theme.gaps || [], wrap01(t)),
  };
}

export const TRACK_IDS = Object.freeze(Object.keys(THEMES));

export function trackInfo(trackId) {
  const th = THEMES[trackId];
  return th ? { id: trackId, name: th.name, difficulty: th.difficulty, width: th.width, laps: RACE.LAPS } : null;
}
