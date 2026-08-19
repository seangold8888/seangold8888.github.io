// 산리오 카트 3D — 아이템
import * as THREE from '../vendor/three.module.min.js';

export const ITEM_TYPES = [
  { id: 'boost',  name: '별 부스터', icon: '⚡', weight: 26 },
  { id: 'banana', name: '바나나',   icon: '🍌', weight: 24 },
  { id: 'bomb',   name: '하트 폭탄', icon: '💣', weight: 20 },
  { id: 'shield', name: '리본 방패', icon: '🛡️', weight: 16 },
  { id: 'magnet', name: '자석',     icon: '🎯', weight: 14 }
];

// 뒤처진 사람일수록 좋은 아이템이 나온다(카트라이더식 배려)
export function rollItem(place, total) {
  const behind = (place - 1) / Math.max(1, total - 1);   // 0=1등, 1=꼴찌
  const pool = ITEM_TYPES.map(t => {
    let w = t.weight;
    if (t.id === 'boost' || t.id === 'magnet') w *= 0.6 + behind * 1.6;
    if (t.id === 'banana') w *= 1.3 - behind * 0.5;
    return { t, w };
  });
  const sum = pool.reduce((s, p) => s + p.w, 0);
  let r = Math.random() * sum;
  for (const p of pool) { r -= p.w; if (r <= 0) return p.t.id; }
  return 'boost';
}

export function makeItemBoxMesh() {
  const g = new THREE.Group();
  const cube = new THREE.Mesh(new THREE.BoxGeometry(11, 11, 11),
    new THREE.MeshLambertMaterial({ color: 0xfff0a6, transparent: true, opacity: 0.92 }));
  g.add(cube);
  const heart = new THREE.Mesh(new THREE.SphereGeometry(3.4, 10, 8),
    new THREE.MeshLambertMaterial({ color: 0xff7aa8 }));
  g.add(heart);
  g.userData.cube = cube;
  return g;
}

export function makeBananaMesh() {
  const m = new THREE.Mesh(new THREE.TorusGeometry(3.4, 1.5, 6, 10, Math.PI * 1.1),
    new THREE.MeshLambertMaterial({ color: 0xffe066 }));
  m.rotation.x = Math.PI / 2;
  return m;
}

export function makeBombMesh() {
  const g = new THREE.Group();
  const b = new THREE.Mesh(new THREE.SphereGeometry(4.2, 12, 10),
    new THREE.MeshLambertMaterial({ color: 0xff7aa8 }));
  g.add(b);
  const f = new THREE.Mesh(new THREE.CylinderGeometry(0.5, 0.5, 4, 6),
    new THREE.MeshLambertMaterial({ color: 0x8c5a72 }));
  f.position.y = 5; g.add(f);
  return g;
}

export function makeShieldMesh() {
  return new THREE.Mesh(new THREE.SphereGeometry(13, 14, 10),
    new THREE.MeshLambertMaterial({ color: 0xffd3e2, transparent: true, opacity: 0.42 }));
}

// 아이템 사용 — 결과를 게임 루프가 처리한다
export function useItem(kart, karts, spawn) {
  const id = kart.item;
  if (!id) return;
  kart.item = null;
  kart.itemCooldown = 0.35;

  if (id === 'boost') {
    kart.boost = Math.max(kart.boost, 1.5);
  } else if (id === 'shield') {
    kart.shield = 6;
  } else if (id === 'banana') {
    spawn({
      kind: 'banana', x: kart.x - Math.sin(kart.angle) * 20, y: kart.y + 2,
      z: kart.z - Math.cos(kart.angle) * 20, vx: 0, vz: 0, life: 30, owner: kart, armed: 0.4
    });
  } else if (id === 'bomb') {
    spawn({
      kind: 'bomb', x: kart.x + Math.sin(kart.angle) * 22, y: kart.y + 6,
      z: kart.z + Math.cos(kart.angle) * 22,
      vx: Math.sin(kart.angle) * 210, vz: Math.cos(kart.angle) * 210,
      life: 3.2, owner: kart, armed: 0.15
    });
  } else if (id === 'magnet') {
    // 앞 사람에게 끌려간다 — 아이가 뒤처져도 금방 따라붙는다
    kart.magnet = 2.4;
  }
}

// 자석: 바로 앞 순위 카트 쪽으로 당긴다
export function applyMagnet(kart, karts, dt) {
  if (kart.magnet <= 0) return;
  let target = null, bestGap = Infinity;
  for (const k of karts) {
    if (k === kart || k.finished) continue;
    const gap = k.total - kart.total;
    if (gap > 0 && gap < bestGap) { bestGap = gap; target = k; }
  }
  if (!target) return;
  const dx = target.x - kart.x, dz = target.z - kart.z;
  const d = Math.hypot(dx, dz) || 1;
  kart.x += (dx / d) * 120 * dt;
  kart.z += (dz / d) * 120 * dt;
  kart.boost = Math.max(kart.boost, 0.2);
}
