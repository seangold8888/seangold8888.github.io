// 별빛 카트 배틀 — 파티클 VFX. Owner: Agent PRESENTATION.
// 풀 로직(createParticlePool / spawnParticle / advanceParticles / driftColor)은 Three 없이 순수 함수.
// createVfx(scene, THREE) 는 Three 나 scene 이 없으면 no-op 객체를 돌려준다.

export const VFX_MAX = 600;
export const KIND = Object.freeze({ CIRCLE: 0, STAR: 1 });

// 드리프트 스파크 색: 주황(charge 0) → 하늘색(charge 1)
const DRIFT_ORANGE = [1.0, 0.55, 0.12];
const DRIFT_BLUE = [0.42, 0.78, 1.0];

// ---------- 순수 풀 로직 ----------

export function createParticlePool(capacity = VFX_MAX) {
  const n = Math.max(1, capacity | 0);
  const free = new Int32Array(n);
  for (let i = 0; i < n; i++) free[i] = n - 1 - i; // pop 순서가 0,1,2… 가 되도록
  return {
    capacity: n,
    alive: 0,
    freeCount: n,
    free,
    live: new Uint8Array(n),
    pos: new Float32Array(n * 3),
    vel: new Float32Array(n * 3),
    life: new Float32Array(n),
    maxLife: new Float32Array(n),
    size: new Float32Array(n),
    color: new Float32Array(n * 3),
    alpha: new Float32Array(n),
    kind: new Float32Array(n),
    gravity: new Float32Array(n),
    drag: new Float32Array(n),
  };
}

/** 빈 슬롯이 없으면 -1. 할당 없음. */
export function spawnParticle(pool, x, y, z, vx, vy, vz, life, size, r, g, b, kind, gravity, drag) {
  if (pool.freeCount === 0) return -1;
  const i = pool.free[--pool.freeCount];
  pool.live[i] = 1;
  pool.alive++;
  const i3 = i * 3;
  pool.pos[i3] = x; pool.pos[i3 + 1] = y; pool.pos[i3 + 2] = z;
  pool.vel[i3] = vx; pool.vel[i3 + 1] = vy; pool.vel[i3 + 2] = vz;
  pool.life[i] = life;
  pool.maxLife[i] = life > 0 ? life : 1e-6;
  pool.size[i] = size;
  pool.color[i3] = r; pool.color[i3 + 1] = g; pool.color[i3 + 2] = b;
  pool.alpha[i] = 1;
  pool.kind[i] = kind || 0;
  pool.gravity[i] = gravity || 0;
  pool.drag[i] = drag || 0;
  return i;
}

export function killParticle(pool, i) {
  if (i < 0 || i >= pool.capacity || !pool.live[i]) return false;
  pool.live[i] = 0;
  pool.alive--;
  pool.free[pool.freeCount++] = i;
  pool.size[i] = 0;
  pool.alpha[i] = 0;
  return true;
}

/** 수명·속도·중력·항력 적용. 죽은 파티클은 풀로 반환. 살아있는 개수를 반환. */
export function advanceParticles(pool, dt) {
  if (!(dt > 0)) return pool.alive;
  const n = pool.capacity;
  for (let i = 0; i < n; i++) {
    if (!pool.live[i]) continue;
    const life = pool.life[i] - dt;
    if (life <= 0) { killParticle(pool, i); continue; }
    pool.life[i] = life;
    const i3 = i * 3;
    const g = pool.gravity[i];
    if (g) pool.vel[i3 + 1] -= g * dt;
    const d = pool.drag[i];
    if (d) {
      const k = Math.max(0, 1 - d * dt);
      pool.vel[i3] *= k; pool.vel[i3 + 1] *= k; pool.vel[i3 + 2] *= k;
    }
    pool.pos[i3] += pool.vel[i3] * dt;
    pool.pos[i3 + 1] += pool.vel[i3 + 1] * dt;
    pool.pos[i3 + 2] += pool.vel[i3 + 2] * dt;
    const t = life / pool.maxLife[i];
    pool.alpha[i] = t * (2 - t); // ease-out 페이드
  }
  return pool.alive;
}

/** charge 0..1 → [r,g,b] (out 배열을 주면 재사용) */
export function driftColor(charge, out) {
  const t = charge < 0 ? 0 : charge > 1 ? 1 : (Number(charge) || 0);
  const o = out || [0, 0, 0];
  o[0] = DRIFT_ORANGE[0] + (DRIFT_BLUE[0] - DRIFT_ORANGE[0]) * t;
  o[1] = DRIFT_ORANGE[1] + (DRIFT_BLUE[1] - DRIFT_ORANGE[1]) * t;
  o[2] = DRIFT_ORANGE[2] + (DRIFT_BLUE[2] - DRIFT_ORANGE[2]) * t;
  return o;
}

// ---------- 텍스처 (Canvas 생성) ----------

function makeCanvas(size) {
  if (typeof document === "undefined") return null;
  const c = document.createElement("canvas");
  c.width = size; c.height = size;
  return c;
}

function makeCircleTexture(THREE) {
  const c = makeCanvas(64);
  if (!c) return null;
  const g = c.getContext("2d");
  const grad = g.createRadialGradient(32, 32, 0, 32, 32, 32);
  grad.addColorStop(0, "rgba(255,255,255,1)");
  grad.addColorStop(0.35, "rgba(255,255,255,0.75)");
  grad.addColorStop(1, "rgba(255,255,255,0)");
  g.fillStyle = grad;
  g.fillRect(0, 0, 64, 64);
  const tex = new THREE.CanvasTexture(c);
  tex.needsUpdate = true;
  return tex;
}

function makeStarTexture(THREE) {
  const c = makeCanvas(64);
  if (!c) return null;
  const g = c.getContext("2d");
  g.clearRect(0, 0, 64, 64);
  g.shadowColor = "rgba(255,255,255,0.9)";
  g.shadowBlur = 8;
  g.fillStyle = "rgba(255,255,255,1)";
  g.beginPath();
  for (let i = 0; i < 10; i++) {
    const r = i % 2 === 0 ? 27 : 12;
    const a = -Math.PI / 2 + (i * Math.PI) / 5;
    const x = 32 + Math.cos(a) * r, y = 32 + Math.sin(a) * r;
    if (i === 0) g.moveTo(x, y); else g.lineTo(x, y);
  }
  g.closePath();
  g.fill();
  const tex = new THREE.CanvasTexture(c);
  tex.needsUpdate = true;
  return tex;
}

const VERT = `
attribute vec3 aColor;
attribute float aSize;
attribute float aAlpha;
attribute float aKind;
uniform float uScale;
varying vec3 vColor;
varying float vAlpha;
varying float vKind;
void main() {
  vColor = aColor; vAlpha = aAlpha; vKind = aKind;
  vec4 mv = modelViewMatrix * vec4(position, 1.0);
  gl_Position = projectionMatrix * mv;
  float d = max(1.0, -mv.z);
  gl_PointSize = aAlpha > 0.0 ? clamp(aSize * uScale / d, 0.0, 96.0) : 0.0;
}`;

const FRAG = `
uniform sampler2D tCircle;
uniform sampler2D tStar;
uniform float uHasTex;
varying vec3 vColor;
varying float vAlpha;
varying float vKind;
void main() {
  float a;
  if (uHasTex > 0.5) {
    vec4 t = vKind < 0.5 ? texture2D(tCircle, gl_PointCoord) : texture2D(tStar, gl_PointCoord);
    a = t.a;
  } else {
    float r = length(gl_PointCoord - 0.5) * 2.0;
    a = clamp(1.0 - r, 0.0, 1.0);
  }
  a *= vAlpha;
  gl_FragColor = vec4(vColor * a, a);
}`;

function noop() {}
function noopVfx() {
  return { pool: null, driftSparks: noop, boostTrail: noop, hit: noop, shield: noop, spin: noop, update: noop, destroy: noop };
}

// ---------- createVfx ----------

export function createVfx(scene, THREE, opts) {
  if (!scene || typeof scene.add !== "function" || !THREE || typeof THREE.Points !== "function" || typeof THREE.BufferGeometry !== "function") {
    return noopVfx();
  }
  const rng = (opts && typeof opts.rng === "function") ? opts.rng : Math.random;
  const pool = createParticlePool(VFX_MAX);

  const geom = new THREE.BufferGeometry();
  const attrs = {
    position: new THREE.BufferAttribute(pool.pos, 3),
    aColor: new THREE.BufferAttribute(pool.color, 3),
    aSize: new THREE.BufferAttribute(pool.size, 1),
    aAlpha: new THREE.BufferAttribute(pool.alpha, 1),
    aKind: new THREE.BufferAttribute(pool.kind, 1),
  };
  for (const name in attrs) {
    const a = attrs[name];
    if (THREE.DynamicDrawUsage !== undefined && typeof a.setUsage === "function") a.setUsage(THREE.DynamicDrawUsage);
    geom.setAttribute(name, a);
  }

  const texCircle = makeCircleTexture(THREE);
  const texStar = makeStarTexture(THREE);
  const material = new THREE.ShaderMaterial({
    uniforms: {
      tCircle: { value: texCircle },
      tStar: { value: texStar },
      uHasTex: { value: texCircle && texStar ? 1 : 0 },
      uScale: { value: 620 },
    },
    vertexShader: VERT,
    fragmentShader: FRAG,
    transparent: true,
    depthWrite: false,
    depthTest: true,
    blending: THREE.AdditiveBlending,
  });
  const points = new THREE.Points(geom, material);
  points.frustumCulled = false;
  points.renderOrder = 10;
  scene.add(points);

  const acc = Object.create(null); // vehicleId → { drift, boost, side }
  const shields = new Map();       // vehicleId → mesh
  const shieldGeom = new THREE.SphereGeometry(1.7, 18, 12);
  const color = [0, 0, 0];
  let time = 0;

  function accFor(id) {
    let a = acc[id];
    if (!a) a = acc[id] = { drift: 0, boost: 0, side: 1 };
    return a;
  }

  function driftSparks(vehicle, dt) {
    const s = vehicle && vehicle.state;
    if (!s) return;
    const a = accFor(vehicle.id);
    if (!s.drifting || s.airborne) { a.drift = 0; return; }
    const charge = s.driftCharge || 0;
    a.drift += dt * (30 + 45 * charge);
    if (a.drift < 1) return;
    const sinH = Math.sin(s.heading), cosH = Math.cos(s.heading);
    const rx = cosH, rz = -sinH; // 오른쪽 벡터
    driftColor(charge, color);
    while (a.drift >= 1) {
      a.drift -= 1;
      a.side = -a.side;
      const side = a.side * 0.75;
      const px = s.x - sinH * 1.0 + rx * side;
      const pz = s.z - cosH * 1.0 + rz * side;
      const back = 2.5 + rng() * 3;
      const out = a.side * (1 + rng() * 2);
      const star = charge >= 0.5 && rng() < 0.2;
      spawnParticle(pool,
        px, (s.y || 0) + 0.15, pz,
        -sinH * back + rx * out, 1.5 + rng() * 2.5, -cosH * back + rz * out,
        0.22 + rng() * 0.2, star ? 0.32 : 0.16 + rng() * 0.1,
        color[0], color[1], color[2],
        star ? KIND.STAR : KIND.CIRCLE, 9, 0.5);
    }
  }

  function boostTrail(vehicle, dt) {
    const s = vehicle && vehicle.state;
    if (!s) return;
    const a = accFor(vehicle.id);
    if (!(s.boostTimer > 0)) { a.boost = 0; return; }
    a.boost += dt * 70;
    if (a.boost < 1) return;
    const sinH = Math.sin(s.heading), cosH = Math.cos(s.heading);
    const rx = cosH, rz = -sinH;
    while (a.boost >= 1) {
      a.boost -= 1;
      const jitter = (rng() - 0.5) * 0.6;
      const px = s.x - sinH * 1.2 + rx * jitter;
      const pz = s.z - cosH * 1.2 + rz * jitter;
      const back = 2 + rng() * 2;
      const k = rng();
      let r = 1, g = 0.85, b = 0.3;
      if (k < 0.4) { g = 0.5; b = 0.15; } else if (k > 0.85) { g = 1; b = 0.95; }
      spawnParticle(pool,
        px, (s.y || 0) + 0.45, pz,
        -sinH * back, 0.4 + rng() * 0.8, -cosH * back,
        0.24 + rng() * 0.12, 0.45 + rng() * 0.3,
        r, g, b, KIND.CIRCLE, 0, 2.5);
    }
  }

  function hit(position, kind) {
    if (!position) return;
    const x = position.x || 0, y = (position.y || 0) + 0.6, z = position.z || 0;
    if (kind === "spin") {
      for (let i = 0; i < 16; i++) {
        const ang = (i / 16) * Math.PI * 2;
        spawnParticle(pool, x, y, z,
          Math.cos(ang) * 5, 3 + rng(), Math.sin(ang) * 5,
          0.55 + rng() * 0.15, 0.5, 1, 0.85, 0.25, KIND.STAR, 4, 0);
      }
    } else if (kind === "slow") {
      for (let i = 0; i < 20; i++) {
        spawnParticle(pool, x + (rng() - 0.5) * 2, y + rng() * 1.5, z + (rng() - 0.5) * 2,
          (rng() - 0.5) * 3, 1 + rng() * 1.5, (rng() - 0.5) * 3,
          0.8 + rng() * 0.3, 0.3, 0.6, 0.85, 1, KIND.STAR, 2.5, 1);
      }
    } else { // knockback / 기타
      for (let i = 0; i < 24; i++) {
        const ang = rng() * Math.PI * 2;
        const sp = 4 + rng() * 4;
        const warm = rng() < 0.5;
        spawnParticle(pool, x, y, z,
          Math.cos(ang) * sp, 2 + rng() * 3, Math.sin(ang) * sp,
          0.4 + rng() * 0.15, 0.35, 1, warm ? 0.6 : 0.95, warm ? 0.2 : 0.85, KIND.CIRCLE, 8, 0);
      }
    }
  }

  function shield(vehicle, on) {
    if (!vehicle || !vehicle.mesh || typeof vehicle.mesh.add !== "function") return;
    let mesh = shields.get(vehicle.id);
    if (!mesh) {
      if (!on) return;
      mesh = new THREE.Mesh(shieldGeom, new THREE.MeshBasicMaterial({
        color: 0x7fd7ff, transparent: true, opacity: 0.28,
        blending: THREE.AdditiveBlending, depthWrite: false,
      }));
      mesh.position.set(0, 0.7, 0);
      vehicle.mesh.add(mesh);
      shields.set(vehicle.id, mesh);
    }
    mesh.visible = !!on;
  }

  function spin(vehicle) {
    const s = vehicle && vehicle.state;
    if (!s) return;
    const cx = s.x, cy = (s.y || 0) + 1.3, cz = s.z;
    for (let i = 0; i < 12; i++) {
      const ang = (i / 12) * Math.PI * 2;
      // 접선 방향 속도 → 머리 위를 빙글 도는 별
      spawnParticle(pool,
        cx + Math.cos(ang) * 1.4, cy, cz + Math.sin(ang) * 1.4,
        -Math.sin(ang) * 4, 0.3, Math.cos(ang) * 4,
        0.7, 0.42, 1, 0.9, 0.3, KIND.STAR, 0, 0);
    }
  }

  function update(dt, camera) {
    if (!(dt > 0)) return;
    time += dt;
    advanceParticles(pool, dt);
    attrs.position.needsUpdate = true;
    attrs.aColor.needsUpdate = true;
    attrs.aSize.needsUpdate = true;
    attrs.aAlpha.needsUpdate = true;
    attrs.aKind.needsUpdate = true;
    if (camera && Number.isFinite(camera.fov)) {
      material.uniforms.uScale.value = 384 / Math.tan((camera.fov * Math.PI) / 360);
    }
    if (shields.size) {
      const sc = 1 + 0.06 * Math.sin(time * 7);
      const op = 0.24 + 0.08 * Math.sin(time * 5);
      for (const mesh of shields.values()) {
        if (!mesh.visible) continue;
        mesh.scale.setScalar(sc);
        mesh.material.opacity = op;
      }
    }
  }

  function destroy() {
    scene.remove(points);
    geom.dispose();
    material.dispose();
    if (texCircle) texCircle.dispose();
    if (texStar) texStar.dispose();
    for (const mesh of shields.values()) {
      if (mesh.parent) mesh.parent.remove(mesh);
      mesh.material.dispose();
    }
    shields.clear();
    shieldGeom.dispose();
  }

  return { pool, points, driftSparks, boostTrail, hit, shield, spin, update, destroy };
}
