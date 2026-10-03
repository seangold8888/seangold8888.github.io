// 산리오 카트(간단판) — 업그레이드 묶음(2026-09-27)
// 우리 아이들·장난꾸러기, 3D판과 함께 쓰는 코인 지갑·차고, 코스 거리(발판·코인·장애물·링)
(function () {
  'use strict';
  window.SK = window.SK || {};

  // ---------- 드라이버 ----------
  // 색은 멀티버스·오디세이·3D판과 같은 개인 색
  SK.KIDS = [
    { id: 'jaei',    name: '재이', color: '#c79bff', accent: '#ffffff', hair: '#2e2024', style: 'pigtails', top: 408, accel: 2.7, turn: 2.7, kid: true },
    { id: 'taeo',    name: '태오', color: '#ff6b5b', accent: '#fff3c4', hair: '#2b1d17', style: 'spiky',    top: 398, accel: 2.9, turn: 2.8, kid: true },
    { id: 'yunchan', name: '윤찬', color: '#58c8ff', accent: '#ffffff', hair: '#3b2a20', style: 'cap',      top: 418, accel: 2.4, turn: 2.45, kid: true },
    { id: 'yungeon', name: '윤건', color: '#ffb13b', accent: '#ffffff', hair: '#3a2618', style: 'band',     top: 414, accel: 2.5, turn: 2.55, kid: true }
  ];
  SK.VILLAINS = [
    { id: 'taeppul',  name: '태뿔', color: '#c2263a', accent: '#2b1d2e', hair: '#1a0f14', style: 'spiky',    horn: '#ff3b4e', top: 405, accel: 2.7, turn: 2.6, kid: true, villain: true, prank: 'balloon' },
    { id: 'chanppul', name: '찬뿔', color: '#ffd400', accent: '#2b2b3a', hair: '#1f1a14', style: 'bolt',     horn: '#ffe45c', top: 412, accel: 2.5, turn: 2.5, kid: true, villain: true, prank: 'zap' },
    { id: 'geonppul', name: '건뿔', color: '#3c8a3e', accent: '#6a3fa0', hair: '#14240f', style: 'band',     horn: '#6a3fa0', top: 402, accel: 2.8, turn: 2.55, kid: true, villain: true, prank: 'slam', skin: '#86d06f' },
    { id: 'jaewing',  name: '재윙', color: '#5b2a86', accent: '#ff5ca8', hair: '#1b0f24', style: 'pigtails', horn: '#ff5ca8', top: 408, accel: 2.6, turn: 2.65, kid: true, villain: true, prank: 'bat' }
  ];
  SK.driverById = id => SK.CHARACTERS.concat(SK.VILLAINS).find(c => c.id === id) || null;

  // 그랑프리: 컵마다 두 코스. 트로피 id 는 3D판과 같아 황금 장식이 함께 열린다.
  SK.CUPS = [
    { id: 'heart', name: '하트 컵', icon: '💖', tracks: ['meadow', 'beach'], villains: ['taeppul', 'geonppul'] },
    { id: 'star',  name: '별 컵',  icon: '⭐', tracks: ['candy', 'night'],  villains: ['chanppul', 'jaewing'] }
  ];
  SK.POINTS = [10, 8, 6, 4, 2, 1];

  // ---------- 코인 지갑·차고(3D판과 같은 저장소) ----------
  const KEY = 'sanrio-kart3d:garage:v1';
  const CATALOG = {
    paint: [
      { id: 'none', name: '원래 색', price: 0 },
      { id: 'strawberry', name: '딸기 핑크', price: 15, color: '#ff5c8a' },
      { id: 'mint', name: '민트', price: 15, color: '#6fdcbc' },
      { id: 'sky', name: '하늘', price: 15, color: '#72b0ff' },
      { id: 'lemon', name: '레몬', price: 15, color: '#ffe066' },
      { id: 'grape', name: '포도', price: 20, color: '#a97ad6' },
      { id: 'night', name: '밤하늘', price: 25, color: '#2e3570' },
      { id: 'rainbow', name: '무지개', price: 60, color: 'rainbow' },
      { id: 'gold', name: '황금', price: 0, color: '#ffc83a', need: 'heart' }
    ],
    wheels: [
      { id: 'none', name: '기본 바퀴', price: 0 },
      { id: 'star', name: '별 바퀴', price: 20, tire: '#3d3350', hub: '#ffe066' },
      { id: 'heart', name: '하트 바퀴', price: 20, tire: '#ff7aa8', hub: '#ffffff' },
      { id: 'donut', name: '도넛 바퀴', price: 25, tire: '#ff9ec4', hub: '#9c6326' },
      { id: 'gold', name: '황금 바퀴', price: 0, tire: '#ffc83a', hub: '#fff3c4', need: 'star' }
    ],
    topper: [
      { id: 'none', name: '없음', price: 0 },
      { id: 'flag', name: '하트 깃발', price: 15 },
      { id: 'aerial', name: '별 안테나', price: 15 },
      { id: 'balloon', name: '풍선', price: 25 },
      { id: 'crown', name: '왕관', price: 0, need: 'any' }
    ],
    trail: [
      { id: 'none', name: '없음', price: 0 },
      { id: 'heart', name: '하트 꼬리', price: 30, color: '#ff6f9d', shape: 'heart' },
      { id: 'star', name: '별 꼬리', price: 30, color: '#ffd34d', shape: 'star' },
      { id: 'rainbow', name: '무지개 꼬리', price: 50, color: 'rainbow', shape: 'star' }
    ]
  };
  const SLOTS = [{ id: 'paint', name: '색칠' }, { id: 'wheels', name: '바퀴' }, { id: 'topper', name: '꼭대기' }, { id: 'trail', name: '꼬리' }];

  function trophyOk(item, trophies) {
    if (!item || !item.need) return false;
    if (item.need === 'any') return Object.values(trophies).some(v => v === 1);
    return trophies[item.need] === 1;
  }
  function load() {
    const g = { coins: 0, owned: {}, equip: {}, trophies: {} };
    let raw = null;
    try { raw = JSON.parse(localStorage.getItem(KEY) || 'null'); } catch (_) { raw = null; }
    raw = raw && typeof raw === 'object' ? raw : {};
    g.coins = Number.isFinite(Number(raw.coins)) ? Math.max(0, Math.min(99999, Math.floor(Number(raw.coins)))) : 0;
    if (raw.trophies && typeof raw.trophies === 'object') {
      for (const k of Object.keys(raw.trophies)) { const v = Math.floor(Number(raw.trophies[k])); if (v >= 1 && v <= 3) g.trophies[k] = v; }
    }
    for (const slot of Object.keys(CATALOG)) {
      const ids = CATALOG[slot].map(x => x.id);
      const own = raw.owned && Array.isArray(raw.owned[slot]) ? raw.owned[slot].filter(id => ids.includes(id)) : [];
      g.owned[slot] = Array.from(new Set(['none'].concat(own)));
      const eq = raw.equip && raw.equip[slot];
      const item = CATALOG[slot].find(x => x.id === eq);
      g.equip[slot] = item && (g.owned[slot].includes(eq) || trophyOk(item, g.trophies)) ? eq : 'none';
    }
    return g;
  }
  function save(g) { try { localStorage.setItem(KEY, JSON.stringify(g)); } catch (_) {} }
  function state(g, slot, id) {
    const item = CATALOG[slot].find(x => x.id === id);
    if (!item) return 'locked';
    if (g.equip[slot] === id) return 'equipped';
    if (item.need) return trophyOk(item, g.trophies) ? 'owned' : 'locked';
    if (g.owned[slot].includes(id)) return 'owned';
    return g.coins >= item.price ? 'buy' : 'poor';
  }
  function tap(g, slot, id) {
    const st = state(g, slot, id), item = CATALOG[slot].find(x => x.id === id);
    if (st === 'buy') { g.coins -= item.price; g.owned[slot].push(id); g.equip[slot] = id; return 'bought'; }
    if (st === 'owned') { g.equip[slot] = id; return 'equipped'; }
    return st;
  }
  // 그리기용 모양: { paint, tire, hub, topper, trail }
  function look(g) {
    const p = CATALOG.paint.find(x => x.id === g.equip.paint);
    const w = CATALOG.wheels.find(x => x.id === g.equip.wheels);
    const t = CATALOG.trail.find(x => x.id === g.equip.trail);
    return {
      paint: p && p.color ? p.color : null,
      tire: w && w.tire ? w.tire : null, hub: w && w.hub ? w.hub : null,
      topper: g.equip.topper !== 'none' ? g.equip.topper : null,
      trail: t && t.id !== 'none' ? { color: t.color, shape: t.shape } : null
    };
  }
  SK.Garage = {
    CATALOG, SLOTS, load, save, state, tap, look,
    addCoins(g, n) { g.coins = Math.min(99999, g.coins + Math.max(0, Math.floor(n))); },
    trophy(g, cup, place) {
      if (place < 1 || place > 3) return false;
      if (!g.trophies[cup] || place < g.trophies[cup]) { g.trophies[cup] = place; return true; }
      return false;
    }
  };

  // ---------- 코스 거리 ----------
  // 코스별 장애물 주제: roll 은 옆으로 왔다 갔다(부딪히면 빙글), bounce 는 밟으면 통 튀어 부스터
  const FX_THEME = { meadow: 'cup', beach: 'crab', candy: 'candy', night: 'star' };
  const RINGS = { meadow: 0, beach: 1, candy: 0, night: 2 };

  function frameAt(T, frac) {
    const n = T.center.length;
    const i = Math.floor(((frac % 1) + 1) % 1 * n) % n;
    const a = T.center[i], b = T.center[(i + 3) % n];
    const dx = b.x - a.x, dy = b.y - a.y, len = Math.hypot(dx, dy) || 1;
    const tx = dx / len, ty = dy / len;
    return { x: a.x, y: a.y, tx, ty, nx: -ty, ny: tx, i };
  }

  SK.buildFx = function (T) {
    const id = T.def.id, HALF = T.ROAD_HALF;
    const taken = [0, 0.97];
    // 아이템 상자 자리(500부터 1000 간격)와 겹치지 않게
    for (let d = 500; d < T.length; d += 1000) taken.push(d / T.length);
    function spot(target, gap) {
      for (let k = 0; k < 40; k++) {
        const off = (k % 2 ? 1 : -1) * Math.ceil(k / 2) * 0.006;
        const t = ((target + off) % 1 + 1) % 1;
        if (taken.every(u => Math.min(Math.abs(u - t), 1 - Math.abs(u - t)) >= gap)) { taken.push(t); return t; }
      }
      taken.push(target); return target;
    }
    const fx = { pads: [], coins: [], obstacles: [], rings: [], theme: FX_THEME[id] || 'cup' };
    [0.12, 0.37, 0.62, 0.87].forEach((target, k) => {
      const f = frameAt(T, spot(target, 0.03));
      const lat = (k % 2 ? 1 : -1) * HALF * 0.45;
      fx.pads.push({ x: f.x + f.nx * lat, y: f.y + f.ny * lat, tx: f.tx, ty: f.ty, len: 58, half: HALF * 0.32 });
    });
    const lanes = [0, -0.5, 0.5, 0, -0.4];
    [0.2, 0.3, 0.48, 0.72, 0.93].forEach((target, k) => {
      const t = spot(target, 0.02);
      for (let c = 0; c < 5; c++) {
        const f = frameAt(T, t + c * 0.007);
        const lat = lanes[k % lanes.length] * HALF + (k % 2 ? Math.sin(c * 0.9) * HALF * 0.25 : 0);
        fx.coins.push({ x: f.x + f.nx * lat, y: f.y + f.ny * lat, alive: true, respawn: 0 });
      }
    });
    [0.25, 0.55, 0.8].forEach((target, k) => {
      const f = frameAt(T, spot(target, 0.03));
      const roll = fx.theme !== 'star';
      fx.obstacles.push({ kind: fx.theme, roll, cx: f.x, cy: f.y, nx: f.nx, ny: f.ny, phase: k * 2.1,
        lat: roll ? 0 : (k % 2 ? 1 : -1) * HALF * 0.4, x: f.x, y: f.y, r: 44 });
    });
    [0.42, 0.68].slice(0, RINGS[id] || 0).forEach((target, k) => {
      const f = frameAt(T, spot(target, 0.03));
      const lat = (k % 2 ? 1 : -1) * HALF * 0.35;
      fx.rings.push({ x: f.x + f.nx * lat, y: f.y + f.ny * lat, r: 50 });
    });
    return fx;
  };

  // 발판은 바닥 그림(트랙 텍스처)에 직접 그려 넣어 원근이 맞게 보인다.
  SK.paintPads = function (tex, fx) {
    const g = tex.getContext('2d');
    fx.pads.forEach(p => {
      g.save();
      g.translate(p.x, p.y);
      g.rotate(Math.atan2(p.ty, p.tx));        // 로컬 +x = 진행 방향
      const gr = g.createLinearGradient(0, -p.half, 0, p.half);
      gr.addColorStop(0, '#ff8c3c'); gr.addColorStop(0.5, '#ffd750'); gr.addColorStop(1, '#ff8c3c');
      g.fillStyle = gr;
      g.beginPath(); g.roundRect ? g.roundRect(-p.len, -p.half, p.len * 2, p.half * 2, 14) : g.rect(-p.len, -p.half, p.len * 2, p.half * 2); g.fill();
      g.fillStyle = 'rgba(255,255,255,0.92)';
      for (let k = -1; k <= 1; k++) {
        const x = k * 34;
        g.beginPath();
        g.moveTo(x - 12, -p.half * 0.7); g.lineTo(x + 16, 0); g.lineTo(x - 12, p.half * 0.7);
        g.lineTo(x - 2, p.half * 0.7); g.lineTo(x + 26, 0); g.lineTo(x - 2, -p.half * 0.7);
        g.closePath(); g.fill();
      }
      g.restore();
    });
  };

  SK.updateFx = function (fx, karts, dt, time, onEvent) {
    fx.obstacles.forEach(o => {
      if (o.roll) {
        const s = Math.sin(time * 0.95 + o.phase) * 0.62 * SK.Track.ROAD_HALF;
        o.x = o.cx + o.nx * s; o.y = o.cy + o.ny * s;
      } else { o.x = o.cx + o.nx * o.lat; o.y = o.cy + o.ny * o.lat; }
    });
    fx.coins.forEach(c => { if (!c.alive) { c.respawn -= dt; if (c.respawn <= 0) c.alive = true; } });
    for (const k of karts) {
      k.fxCool = k.fxCool || {};
      for (const key in k.fxCool) k.fxCool[key] = Math.max(0, k.fxCool[key] - dt);
      for (const c of fx.coins) {
        if (!c.alive || Math.abs(k.x - c.x) > 40 || Math.abs(k.y - c.y) > 40) continue;
        if (Math.hypot(k.x - c.x, k.y - c.y) < 36) { c.alive = false; c.respawn = 9; k.coins = Math.min(99, (k.coins || 0) + 1); onEvent('coin', k); }
      }
      if (k.finished) continue;
      fx.pads.forEach((p, i) => {
        if (k.fxCool['p' + i]) return;
        const dx = k.x - p.x, dy = k.y - p.y;
        const along = dx * p.tx + dy * p.ty, across = -dx * p.ty + dy * p.tx;
        if (Math.abs(along) < p.len && Math.abs(across) < p.half) {
          k.fxCool['p' + i] = 1.2; k.boost = Math.max(k.boost, 1.0); onEvent('pad', k);
        }
      });
      fx.obstacles.forEach((o, i) => {
        if (k.fxCool['o' + i] || Math.hypot(k.x - o.x, k.y - o.y) > o.r + 22) return;
        if (o.roll) {
          if (k.hop > 0) return;                     // 통통 뛰어오른 중이면 넘어간다
          k.fxCool['o' + i] = 1.4;
          k.spin = o.kind === 'crab' ? 0.5 : 0.7; k.speed *= 0.55; k.coins = Math.max(0, (k.coins || 0) - 2);
          onEvent('bonk', k, o.kind);
        } else {
          k.fxCool['o' + i] = 1.0; k.hop = 0.7; k.boost = Math.max(k.boost, 0.6); onEvent('bounce', k);
        }
      });
      fx.rings.forEach((r, i) => {
        if (k.fxCool['r' + i] || Math.hypot(k.x - r.x, k.y - r.y) > r.r) return;
        k.fxCool['r' + i] = 2; k.boost = Math.max(k.boost, 1.2); onEvent('ring', k);
      });
    }
  };
})();
