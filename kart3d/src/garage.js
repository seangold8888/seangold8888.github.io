// 산리오 카트 3D — 차고: 경주에서 모은 코인으로 내 카트를 꾸민다.
// 기록은 이 기기에만(localStorage). 트로피로만 열리는 특별 장식도 있다.
import * as THREE from '../vendor/three.module.min.js';

export const GARAGE_KEY = 'sanrio-kart3d:garage:v1';

// need: 그랑프리 트로피 조건(없으면 코인으로 산다)
export const CATALOG = {
  paint: [
    { id: 'none',       name: '원래 색',   price: 0 },
    { id: 'strawberry', name: '딸기 핑크', price: 15, color: 0xff5c8a },
    { id: 'mint',       name: '민트',     price: 15, color: 0x6fdcbc },
    { id: 'sky',        name: '하늘',     price: 15, color: 0x72b0ff },
    { id: 'lemon',      name: '레몬',     price: 15, color: 0xffe066 },
    { id: 'grape',      name: '포도',     price: 20, color: 0xa97ad6 },
    { id: 'night',      name: '밤하늘',   price: 25, color: 0x2e3570 },
    { id: 'rainbow',    name: '무지개',   price: 60, rainbow: true },
    { id: 'gold',       name: '황금',     price: 0, color: 0xffc83a, need: 'heart' }
  ],
  wheels: [
    { id: 'none',  name: '기본 바퀴', price: 0 },
    { id: 'star',  name: '별 바퀴',   price: 20, tire: 0x3d3350, hub: 0xffe066, hubShape: 'star' },
    { id: 'heart', name: '하트 바퀴', price: 20, tire: 0xff7aa8, hub: 0xffffff, hubShape: 'heart' },
    { id: 'donut', name: '도넛 바퀴', price: 25, tire: 0xff9ec4, hub: 0x9c6326, hubShape: 'donut' },
    { id: 'gold',  name: '황금 바퀴', price: 0, tire: 0xffc83a, hub: 0xfff3c4, hubShape: 'star', need: 'star' }
  ],
  topper: [
    { id: 'none',    name: '없음',     price: 0 },
    { id: 'flag',    name: '하트 깃발', price: 15 },
    { id: 'aerial',  name: '별 안테나', price: 15 },
    { id: 'balloon', name: '풍선',     price: 25 },
    { id: 'crown',   name: '왕관',     price: 0, need: 'any' }
  ],
  trail: [
    { id: 'none',    name: '없음',       price: 0 },
    { id: 'heart',   name: '하트 꼬리',   price: 30, color: '#ff6f9d', shape: 'heart' },
    { id: 'star',    name: '별 꼬리',     price: 30, color: '#ffd34d', shape: 'star' },
    { id: 'rainbow', name: '무지개 꼬리', price: 50, color: 'rainbow', shape: 'star' }
  ]
};
export const SLOTS = [
  { id: 'paint', name: '색칠' }, { id: 'wheels', name: '바퀴' },
  { id: 'topper', name: '꼭대기' }, { id: 'trail', name: '부스터 꼬리' }
];

function fresh() {
  return {
    coins: 0,
    owned: { paint: ['none'], wheels: ['none'], topper: ['none'], trail: ['none'] },
    equip: { paint: 'none', wheels: 'none', topper: 'none', trail: 'none' },
    trophies: {}           // 컵 id → 가장 좋은 등수(1~3)
  };
}

export function loadGarage(storage) {
  const g = fresh();
  try {
    const raw = JSON.parse((storage || localStorage).getItem(GARAGE_KEY) || 'null');
    if (raw && typeof raw === 'object') {
      g.coins = Number.isFinite(Number(raw.coins)) ? Math.max(0, Math.min(99999, Math.floor(Number(raw.coins)))) : 0;
      for (const slot of Object.keys(CATALOG)) {
        const ids = CATALOG[slot].map(x => x.id);
        const own = raw.owned && Array.isArray(raw.owned[slot]) ? raw.owned[slot].filter(id => ids.includes(id)) : [];
        g.owned[slot] = Array.from(new Set(['none'].concat(own)));
        const eq = raw.equip && raw.equip[slot];
        g.equip[slot] = ids.includes(eq) && (g.owned[slot].includes(eq) || unlockedByTrophy(slot, eq, raw.trophies || {})) ? eq : 'none';
      }
      if (raw.trophies && typeof raw.trophies === 'object') {
        for (const k of Object.keys(raw.trophies)) {
          const v = Math.floor(Number(raw.trophies[k]));
          if (v >= 1 && v <= 3) g.trophies[k] = v;
        }
      }
    }
  } catch (_) {}
  return g;
}

export function saveGarage(g, storage) {
  try { (storage || localStorage).setItem(GARAGE_KEY, JSON.stringify(g)); } catch (_) {}
}

function unlockedByTrophy(slot, id, trophies) {
  const item = CATALOG[slot].find(x => x.id === id);
  if (!item || !item.need) return false;
  if (item.need === 'any') return Object.values(trophies).some(v => v === 1);
  return trophies[item.need] === 1;
}

// 이 물건을 지금 어떻게 할 수 있나: 'equipped' | 'owned' | 'buy' | 'poor' | 'locked'
export function itemState(g, slot, id) {
  const item = CATALOG[slot].find(x => x.id === id);
  if (!item) return 'locked';
  if (g.equip[slot] === id) return 'equipped';
  if (item.need) return unlockedByTrophy(slot, id, g.trophies) ? 'owned' : 'locked';
  if (g.owned[slot].includes(id)) return 'owned';
  return g.coins >= item.price ? 'buy' : 'poor';
}

// 누르면: 살 수 있으면 사서 끼우고, 가진 것이면 끼운다. 결과 상태를 돌려준다.
export function tapItem(g, slot, id) {
  const st = itemState(g, slot, id);
  const item = CATALOG[slot].find(x => x.id === id);
  if (st === 'buy') { g.coins -= item.price; g.owned[slot].push(id); g.equip[slot] = id; return 'bought'; }
  if (st === 'owned') { g.equip[slot] = id; return 'equipped'; }
  return st;
}

export function addCoins(g, n) { g.coins = Math.min(99999, g.coins + Math.max(0, Math.floor(n))); }

export function recordTrophy(g, cupId, place) {
  if (place < 1 || place > 3) return false;
  const prev = g.trophies[cupId];
  if (!prev || place < prev) { g.trophies[cupId] = place; return true; }
  return false;
}

// ---------- 모델에 씌우기 ----------
export function applyLook(model, equip) {
  const d = model.userData;
  equip = equip || {};
  const paint = CATALOG.paint.find(x => x.id === equip.paint);
  if (paint && (paint.color != null)) {
    [d.body, d.nose].forEach(m => m && m.material.color.setHex(paint.color));
  }
  d.rainbow = !!(paint && paint.rainbow);

  const wheel = CATALOG.wheels.find(x => x.id === equip.wheels);
  if (wheel && wheel.tire != null && d.wheels) {
    const tireMat = new THREE.MeshLambertMaterial({ color: wheel.tire });
    const hubMat = new THREE.MeshLambertMaterial({ color: wheel.hub });
    d.wheels.forEach(w => {
      w.material = tireMat;
      const hub = makeHub(wheel.hubShape, hubMat);
      // 바퀴 원기둥의 축이 로컬 Y다(눕혀져 있음). 옆면(±Y)에 붙인다.
      [-1, 1].forEach(sgn => {
        const h = hub.clone();
        h.position.y = sgn * 1.8;
        w.add(h);
      });
    });
  }

  const topper = equip.topper;
  if (topper && topper !== 'none') {
    const t = makeTopper(topper);
    if (topper === 'crown') { t.position.set(0, 5.8, -0.2); d.head.add(t); }
    else { t.position.set(-5.2, 12, -10); model.add(t); }
    d.topper = t;
  }

  const trail = CATALOG.trail.find(x => x.id === equip.trail);
  d.trail = trail && trail.id !== 'none' ? { color: trail.color, shape: trail.shape } : null;
}

function makeHub(shape, mat) {
  let geo;
  if (shape === 'star') {
    const s = new THREE.Shape();
    for (let i = 0; i < 10; i++) {
      const a = i / 10 * Math.PI * 2, r = i % 2 ? 1.1 : 2.6;
      if (i === 0) s.moveTo(Math.cos(a) * r, Math.sin(a) * r); else s.lineTo(Math.cos(a) * r, Math.sin(a) * r);
    }
    s.closePath();
    geo = new THREE.ExtrudeGeometry(s, { depth: 0.4, bevelEnabled: false });
  } else if (shape === 'heart') {
    const s = new THREE.Shape();
    s.moveTo(0, -2.2); s.bezierCurveTo(-3.2, 0.2, -1.6, 2.6, 0, 1.1); s.bezierCurveTo(1.6, 2.6, 3.2, 0.2, 0, -2.2);
    geo = new THREE.ExtrudeGeometry(s, { depth: 0.4, bevelEnabled: false });
  } else {
    geo = new THREE.TorusGeometry(1.9, 0.7, 6, 14);
  }
  const m = new THREE.Mesh(geo, mat);
  m.rotation.x = Math.PI / 2;           // 바퀴 옆면(Y축)을 바라보게
  return m;
}

function makeTopper(kind) {
  const g = new THREE.Group();
  const mat = c => new THREE.MeshLambertMaterial({ color: c });
  if (kind === 'crown') {
    const band = new THREE.Mesh(new THREE.CylinderGeometry(3.2, 3.4, 1.8, 16, 1, true), mat(0xffc83a));
    band.material.side = THREE.DoubleSide; g.add(band);
    for (let i = 0; i < 5; i++) {
      const a = i / 5 * Math.PI * 2;
      const c = new THREE.Mesh(new THREE.ConeGeometry(0.8, 2.2, 6), mat(0xffc83a));
      c.position.set(Math.cos(a) * 3.1, 1.9, Math.sin(a) * 3.1); g.add(c);
      const j = new THREE.Mesh(new THREE.SphereGeometry(0.45, 6, 5), mat(i % 2 ? 0xff5c8a : 0x7fb8ff));
      j.position.set(Math.cos(a) * 3.3, 0, Math.sin(a) * 3.3); g.add(j);
    }
    return g;
  }
  const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.35, 0.35, 14, 6), mat(0xffffff));
  pole.position.y = 7; g.add(pole);
  if (kind === 'flag') {
    const s = new THREE.Shape();
    s.moveTo(0, 0); s.bezierCurveTo(-3.6, 2.4, -1.8, 5, 0, 3.4); s.bezierCurveTo(1.8, 5, 3.6, 2.4, 0, 0);
    const f = new THREE.Mesh(new THREE.ShapeGeometry(s), mat(0xff5c8a));
    f.material.side = THREE.DoubleSide;
    f.position.set(0, 10, 0); f.rotation.y = Math.PI / 2; f.scale.setScalar(1.1); g.add(f);
  } else if (kind === 'aerial') {
    const star = new THREE.Mesh(new THREE.OctahedronGeometry(2.2, 0), mat(0xffe066));
    star.position.y = 15; g.add(star);
  } else {
    const b = new THREE.Mesh(new THREE.SphereGeometry(3.4, 14, 10), mat(0x7fe0c4));
    b.scale.y = 1.2; b.position.y = 17; g.add(b);
    pole.material.color.setHex(0xdddddd);
  }
  return g;
}
