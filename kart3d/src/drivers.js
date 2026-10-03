// 산리오 카트 3D — 우리 아이들 드라이버와 장난꾸러기(악마 버전)
// 머리·카트 장식·얼굴 텍스처를 만든다. 실제 얼굴을 닮게 그리지 않는 동글이 모양이다.
// 색은 멀티버스·오디세이와 같은 개인 색을 쓴다(윤찬 하늘, 재이 보라, 윤건 주황, 태오 빨강).
import * as THREE from '../vendor/three.module.min.js';

const SKIN = 0xffd9ae;

// 우리 아이들 — 고를 수 있는 드라이버
export const KIDS = [
  { id: 'jaei',    name: '재이', body: 0xc79bff, trim: 0xffffff, fur: SKIN, top: 119, accel: 2.8, turn: 2.55, kid: 'pigtails', hair: 0x2e2024, kart: 'star' },
  { id: 'taeo',    name: '태오', body: 0xff6b5b, trim: 0xfff3c4, fur: SKIN, top: 116, accel: 3.0, turn: 2.6,  kid: 'spiky',    hair: 0x2b1d17, kart: 'flame' },
  { id: 'yunchan', name: '윤찬', body: 0x58c8ff, trim: 0xffffff, fur: SKIN, top: 122, accel: 2.5, turn: 2.35, kid: 'cap',      hair: 0x3b2a20, kart: 'net' },
  { id: 'yungeon', name: '윤건', body: 0xffb13b, trim: 0xffffff, fur: SKIN, top: 121, accel: 2.6, turn: 2.45, kid: 'band',     hair: 0x3a2618, kart: 'ball' }
];

// 장난꾸러기 — 그랑프리·아이템 배틀에서 방해하는 라이벌(고를 수는 없다)
// prank: 경주 중 저마다의 장난. game.js 가 처리한다.
export const VILLAINS = [
  { id: 'taeppul',  name: '태뿔', title: '꼴통 태오',   body: 0xc2263a, trim: 0x2b1d2e, fur: 0xffc9a8, top: 119, accel: 2.8, turn: 2.5,
    kid: 'spiky', hair: 0x1a0f14, kart: 'devil', villain: true, prank: 'balloon', horn: 0xff3b4e },
  { id: 'chanppul', name: '찬뿔', title: '번개맨 차니', body: 0xffd400, trim: 0x2b2b3a, fur: 0xffd2ad, top: 121, accel: 2.6, turn: 2.4,
    kid: 'bolt', hair: 0x1f1a14, kart: 'bolt', villain: true, prank: 'zap', horn: 0xffe45c },
  { id: 'geonppul', name: '건뿔', title: '헐크 거니',   body: 0x3c8a3e, trim: 0x6a3fa0, fur: 0x86d06f, top: 118, accel: 2.9, turn: 2.45,
    kid: 'band', hair: 0x14240f, kart: 'hulk', villain: true, prank: 'slam', horn: 0x6a3fa0 },
  { id: 'jaewing',  name: '재윙', title: '재이 악마 모드', body: 0x5b2a86, trim: 0xff5ca8, fur: 0xf2c6ae, top: 120, accel: 2.7, turn: 2.55,
    kid: 'pigtails', hair: 0x1b0f24, kart: 'bat', villain: true, prank: 'bat', horn: 0xff5ca8 }
];

// ---------- 머리 ----------
export function buildKidHead(head, face, spec, mat) {
  face.scale.set(1.08, 1, 0.98);
  const hair = mat(spec.hair);
  // 머리칼 덮개(위쪽 반구)
  const cap = new THREE.Mesh(new THREE.SphereGeometry(5.55, 18, 12, 0, Math.PI * 2, 0, Math.PI * 0.5), hair);
  cap.position.set(0, 0.7, -0.35); cap.scale.set(1.08, 0.9, 1.04);
  head.add(cap);

  if (spec.kid === 'pigtails') {
    [-1, 1].forEach(s => {
      const tail = new THREE.Mesh(new THREE.SphereGeometry(2.1, 10, 8), hair);
      tail.scale.set(0.85, 1.45, 0.85);
      tail.position.set(s * 6.4, -0.8, -0.8); tail.rotation.z = s * 0.35;
      head.add(tail);
      const band = new THREE.Mesh(new THREE.SphereGeometry(0.9, 8, 6), mat(spec.villain ? spec.horn : spec.body));
      band.position.set(s * 5.7, 1.4, -0.6); head.add(band);
    });
    if (!spec.villain) {
      const star = new THREE.Mesh(new THREE.OctahedronGeometry(1.2, 0), mat(0xffe16d));
      star.position.set(3.4, 4.6, 2.6); head.add(star);
    }
  } else if (spec.kid === 'spiky') {
    for (let i = 0; i < 5; i++) {
      const a = -0.9 + i * 0.45;
      const spike = new THREE.Mesh(new THREE.ConeGeometry(1.4, 3.6, 6), hair);
      spike.position.set(Math.sin(a) * 4.2, 5.0 + Math.cos(a) * 0.9, -0.6 + Math.cos(a) * 1.2);
      spike.rotation.z = -a * 0.9;
      head.add(spike);
    }
  } else if (spec.kid === 'cap') {
    const c = new THREE.Mesh(new THREE.SphereGeometry(5.75, 18, 12, 0, Math.PI * 2, 0, Math.PI * 0.5), mat(spec.body));
    c.position.set(0, 1.2, -0.3); c.scale.set(1.06, 0.8, 1.04); head.add(c);
    const brim = new THREE.Mesh(new THREE.CylinderGeometry(3.4, 3.4, 0.5, 16, 1, false, -Math.PI / 2, Math.PI), mat(spec.body));
    brim.position.set(0, 1.4, 4.6); head.add(brim);
    const dot = new THREE.Mesh(new THREE.SphereGeometry(0.8, 8, 6), mat(0xffffff));
    dot.position.set(0, 5.9, -0.3); head.add(dot);
  } else if (spec.kid === 'band') {
    const band = new THREE.Mesh(new THREE.TorusGeometry(5.5, 0.55, 6, 24), mat(spec.villain ? spec.horn : 0xffffff));
    band.position.set(0, 2.1, -0.2); band.rotation.x = Math.PI / 2; band.scale.set(1.07, 1.0, 1);
    head.add(band);
  } else if (spec.kid === 'bolt') {
    // 번개 투구: 노란 반구 + 번개 표시
    const helm = new THREE.Mesh(new THREE.SphereGeometry(5.8, 18, 12, 0, Math.PI * 2, 0, Math.PI * 0.5), mat(0xffd400));
    helm.position.set(0, 1.0, -0.3); helm.scale.set(1.06, 0.85, 1.04); head.add(helm);
    const bolt = new THREE.Mesh(boltGeometry(), mat(0x2b2b3a));
    bolt.position.set(0, 4.2, 4.1); bolt.scale.setScalar(0.9); head.add(bolt);
  }

  // 악마 뿔
  if (spec.villain) {
    [-1, 1].forEach(s => {
      const horn = new THREE.Mesh(new THREE.ConeGeometry(1.25, 4.2, 8), mat(spec.horn));
      horn.position.set(s * 3.6, 6.6, 0.2); horn.rotation.z = -s * 0.42;
      head.add(horn);
    });
  }
}

function boltGeometry() {
  const s = new THREE.Shape();
  s.moveTo(0.4, 2.6); s.lineTo(-1.6, -0.2); s.lineTo(-0.2, -0.2);
  s.lineTo(-0.8, -2.6); s.lineTo(1.6, 0.6); s.lineTo(0.2, 0.6); s.closePath();
  return new THREE.ExtrudeGeometry(s, { depth: 0.5, bevelEnabled: false });
}

// ---------- 카트 장식 ----------
export function addKidFlair(g, spec, mat, many) {
  if (spec.kart === 'star') {                      // 재이: 보닛 위 별 두 개
    many(new THREE.OctahedronGeometry(1.8, 0), mat(0xffe16d), [[-2.6, 10.6, 12.2], [2.6, 10.6, 12.2]]);
  } else if (spec.kart === 'flame') {              // 태오: 옆구리 불꽃
    many(new THREE.ConeGeometry(1.4, 5, 6), mat(0xffb13b),
      [[-8.2, 7.5, 3, Math.PI / 2, 0, 0], [8.2, 7.5, 3, Math.PI / 2, 0, 0], [-8.2, 7.5, -2, Math.PI / 2, 0, 0, 0.8], [8.2, 7.5, -2, Math.PI / 2, 0, 0, 0.8]]);
  } else if (spec.kart === 'net') {                // 윤찬: 뒤에 꽂은 곤충 채집망
    many(new THREE.CylinderGeometry(0.4, 0.4, 16, 6), mat(0x8a5a34), [[6.5, 16, -10, 0.2, 0, -0.25]]);
    many(new THREE.TorusGeometry(3.2, 0.45, 6, 16), mat(0xffffff), [[8.6, 24.2, -11.4, 0.3, 0.6, 0]]);
  } else if (spec.kart === 'ball') {               // 윤건: 코 위 축구공
    many(new THREE.SphereGeometry(2.8, 12, 10), mat(0xffffff), [[0, 11.2, 12.4]]);
    many(new THREE.SphereGeometry(1.0, 6, 5), mat(0x2b2b3a), [[0, 11.9, 14.9], [-1.9, 13.1, 12.8], [1.9, 13.1, 12.8]]);
  } else if (spec.kart === 'devil') {              // 태뿔: 뾰족 꼬리
    many(new THREE.ConeGeometry(1.8, 5, 4), mat(spec.horn), [[0, 12, -15.5, -1.2, 0, 0]]);
    many(new THREE.CylinderGeometry(0.5, 0.5, 8, 6), mat(spec.horn), [[0, 11, -12, -1.2, 0, 0]]);
  } else if (spec.kart === 'bolt') {               // 찬뿔: 번개 스포일러
    const m = mat(0x2b2b3a);
    const b = new THREE.Mesh(boltGeometry(), m);
    b.position.set(0, 16, -11.5); b.scale.setScalar(1.8); g.add(b);
  } else if (spec.kart === 'hulk') {               // 건뿔: 울퉁불퉁 큰 주먹 범퍼
    many(new THREE.SphereGeometry(3.4, 10, 8), mat(0x86d06f), [[-5, 7.5, 14], [5, 7.5, 14]]);
  } else if (spec.kart === 'bat') {                // 재윙: 박쥐 날개
    const wingMat = mat(0x3a1a52);
    [-1, 1].forEach(s => {
      const shape = new THREE.Shape();
      shape.moveTo(0, 0); shape.lineTo(9, 5); shape.lineTo(7, 1); shape.lineTo(11, 0);
      shape.lineTo(7, -1.5); shape.lineTo(8, -4); shape.lineTo(0, -1.5); shape.closePath();
      const w = new THREE.Mesh(new THREE.ShapeGeometry(shape), wingMat);
      w.material.side = THREE.DoubleSide;
      w.position.set(s * 6, 13, -8); w.rotation.set(0, s > 0 ? 0 : Math.PI, 0.25);
      w.scale.setScalar(0.95);
      g.add(w);
    });
  }
}

// ---------- 얼굴 ----------
export function kidFaceTexture(spec, mood, cache) {
  mood = mood || 'normal';
  const key = spec.id + ':' + mood;
  if (cache.has(key)) return cache.get(key);
  const S = 512;
  const cv = document.createElement('canvas');
  cv.width = cv.height = S;
  const c = cv.getContext('2d');
  const X = n => n * S;
  const INK = '#2a1c18';

  function blush(nx, ny, tint) {
    const g = c.createRadialGradient(X(nx), X(ny), 0, X(nx), X(ny), X(0.075));
    g.addColorStop(0, tint); g.addColorStop(1, 'rgba(255,120,120,0)');
    c.fillStyle = g; c.beginPath(); c.arc(X(nx), X(ny), X(0.075), 0, Math.PI * 2); c.fill();
  }
  function eye(nx, ny, side) {
    c.save(); c.translate(X(nx), X(ny));
    if (mood === 'happy') {
      c.beginPath(); c.moveTo(-X(0.05), X(0.02)); c.quadraticCurveTo(0, -X(0.05), X(0.05), X(0.02));
      c.strokeStyle = INK; c.lineWidth = X(0.018); c.lineCap = 'round'; c.stroke();
    } else if (mood === 'dizzy') {
      c.strokeStyle = INK; c.lineWidth = X(0.013); c.beginPath();
      for (let a = 0; a < Math.PI * 4; a += 0.25) {
        const r = a / (Math.PI * 4) * X(0.05);
        const px = Math.cos(a) * r, py = Math.sin(a) * r;
        if (a === 0) c.moveTo(px, py); else c.lineTo(px, py);
      }
      c.stroke();
    } else {
      c.beginPath(); c.ellipse(0, 0, X(0.042), X(0.06), 0, 0, Math.PI * 2);
      c.fillStyle = INK; c.fill();
      c.beginPath(); c.ellipse(-X(0.013), -X(0.022), X(0.015), X(0.018), 0, 0, Math.PI * 2);
      c.fillStyle = '#fff'; c.fill();
      if (spec.villain) {
        // 장난꾸러기 눈썹: 가운데로 모인 V자
        c.beginPath(); c.moveTo(-X(0.06) * side, -X(0.095)); c.lineTo(X(0.05) * side, -X(0.065));
        c.strokeStyle = INK; c.lineWidth = X(0.016); c.lineCap = 'round'; c.stroke();
      }
    }
    c.restore();
  }

  eye(0.5 - 0.16, 0.45, -1); eye(0.5 + 0.16, 0.45, 1);
  blush(0.28, 0.56, 'rgba(255,130,140,0.55)'); blush(0.72, 0.56, 'rgba(255,130,140,0.55)');

  c.strokeStyle = '#7a3b2a'; c.lineWidth = X(0.016); c.lineCap = 'round';
  if (mood === 'dizzy') {
    c.beginPath(); c.ellipse(X(0.5), X(0.62), X(0.032), X(0.026), 0, 0, Math.PI * 2); c.fillStyle = INK; c.fill();
  } else if (spec.villain) {
    // 씨익 웃는 장난꾸러기 입 + 송곳니
    c.beginPath(); c.moveTo(X(0.4), X(0.58)); c.quadraticCurveTo(X(0.5), X(0.66), X(0.62), X(0.56));
    c.stroke();
    c.beginPath(); c.moveTo(X(0.55), X(0.605)); c.lineTo(X(0.565), X(0.645)); c.lineTo(X(0.58), X(0.598)); c.closePath();
    c.fillStyle = '#fff'; c.fill();
  } else if (mood === 'happy') {
    c.beginPath(); c.moveTo(X(0.42), X(0.58)); c.quadraticCurveTo(X(0.5), X(0.69), X(0.58), X(0.58)); c.closePath();
    c.fillStyle = '#b8484f'; c.fill();
  } else {
    c.beginPath(); c.arc(X(0.5), X(0.56), X(0.055), 0.15 * Math.PI, 0.85 * Math.PI); c.stroke();
  }

  const tex = new THREE.CanvasTexture(cv);
  tex.anisotropy = 8;
  cache.set(key, tex);
  return tex;
}
