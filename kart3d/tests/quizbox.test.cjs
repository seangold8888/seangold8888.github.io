// ? 상자(수학 문제) 자리·보상 규칙
const { test, before } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
let Q;
before(async () => {
  const source = fs.readFileSync(path.join(__dirname, '../src/quizbox.js'), 'utf8');
  Q = await import('data:text/javascript;base64,' + Buffer.from(source).toString('base64'));
});

// 경기장 모양: 긴 직선 둘(길이 900) + 반원 둘(반지름 200). 600 표본, 출발점은 아래 직선 가운데.
function stadium() {
  const R = 200, L = 900, per = 2 * L + 2 * Math.PI * R, N = 600, pts = [];
  for (let i = 0; i < N; i++) {
    let s = (i / N) * per + L / 2;            // 아래 직선 가운데서 시작
    s %= per;
    let x, z, tx, tz, straight;
    if (s < L) { x = -L / 2 + s; z = -R; tx = 1; tz = 0; straight = true; }
    else if (s < L + Math.PI * R) { const a = (s - L) / R; x = L / 2 + Math.sin(a) * R; z = -Math.cos(a) * R; tx = Math.cos(a); tz = Math.sin(a); straight = false; }
    else if (s < 2 * L + Math.PI * R) { const u = s - L - Math.PI * R; x = L / 2 - u; z = R; tx = -1; tz = 0; straight = true; }
    else { const a = (s - 2 * L - Math.PI * R) / R; x = -L / 2 - Math.sin(a) * R; z = Math.cos(a) * R; tx = -Math.cos(a); tz = -Math.sin(a); straight = false; }
    pts.push({ x, y: 0, z, tx, ty: 0, tz, t: i / N, straight, s });
  }
  return { pts, R, L, per };
}

test('spots sit on straights with at least 200 straight units ahead (never just before a corner)', () => {
  const { pts } = stadium();
  const spots = Q.pickQuizSpots(pts, {});
  assert.ok(spots.length >= 2 && spots.length <= 3, 'spots: ' + spots);
  for (const t of spots) {
    const i = Math.round(t * pts.length) % pts.length;
    // 앞으로 200 이 모두 직선
    let w = 0, j = i;
    while (w < 200) { assert.ok(pts[j].straight, 't=' + t + ' corner within 200 at ' + j); const k = (j + 1) % pts.length; w += Math.hypot(pts[k].x - pts[j].x, pts[k].z - pts[j].z); j = k; }
    assert.ok(t >= 0.08 && t <= 0.88);
  }
  // 서로 떨어져 있어 바퀴마다 다른 곳
  for (let a = 0; a < spots.length; a++) for (let b = a + 1; b < spots.length; b++) {
    const d = Math.abs(spots[a] - spots[b]); assert.ok(Math.min(d, 1 - d) >= 0.14);
  }
});

test('spots avoid item-box rows, ramps and ice', () => {
  const { pts } = stadium();
  const spots = Q.pickQuizSpots(pts, { ramps: [0.3], ice: [[0.55, 0.6]] });
  const gap = (a, b) => { const d = Math.abs(a - b) % 1; return Math.min(d, 1 - d); };
  for (const t of spots) {
    for (let s = 0; s < 8; s++) assert.ok(gap(t, (s + 0.5) / 8) >= 0.035, 'box row ' + t);
    assert.ok(gap(t, 0.3) >= 0.05);
    assert.ok(!(t > 0.52 && t < 0.63));
  }
});

test('first try: 3s turbo, +3 coins, flame up (red > blue > rainbow, rainbow 4s + invincible), clears the road', () => {
  let r = Q.quizReward(0, true); assert.deepEqual(r, { tier: 1, secs: 3, coins: 3, shield: 0, clear: true, invincible: false });
  r = Q.quizReward(r.tier, true); assert.deepEqual(r, { tier: 2, secs: 3, coins: 3, shield: 0, clear: true, invincible: false });
  r = Q.quizReward(r.tier, true); assert.deepEqual(r, { tier: 3, secs: 4, coins: 3, shield: 0, clear: true, invincible: true });
  assert.equal(Q.quizReward(3, true).tier, 3);
  assert.equal(Q.FLAME[1].name, '빨강'); assert.equal(Q.FLAME[2].name, '파랑'); assert.equal(Q.FLAME[3].color, 'rainbow');
});

test('retry still pays: 1.5s boost, +1 coin, 2s shield, and the flame stage is kept (no penalty)', () => {
  for (const t of [0, 1, 2, 3]) assert.deepEqual(Q.quizReward(t, false), { tier: t, secs: 1.5, coins: 1, shield: 2, clear: false, invincible: false });
});

test('faster turbo (x1.5) only for a first try from 3rd place or lower; 1st/2nd keep the normal x1.36', () => {
  assert.equal(Q.turboMult(1, true), 1.36); assert.equal(Q.turboMult(2, true), 1.36);
  assert.equal(Q.turboMult(3, true), 1.5); assert.equal(Q.turboMult(6, true), 1.5);
  assert.equal(Q.turboMult(5, false), 1.36);
});

test('flame stages look clearly different: longer, thicker trail and a bigger glow ring each step', () => {
  for (let i = 1; i < 4; i++) {
    assert.ok(Q.FLAME[i].trail.life > Q.FLAME[i - 1].trail.life);
    assert.ok(Q.FLAME[i].trail.size > Q.FLAME[i - 1].trail.size);
    assert.ok(Q.FLAME[i].ring > Q.FLAME[i - 1].ring);
  }
});

test('banner text names the reward', () => {
  assert.equal(Q.rewardText(Q.quizReward(1, true), 1.36), '터보 부스트! 3초 · 코인 +3 · 파랑 불꽃');
  assert.equal(Q.rewardText(Q.quizReward(2, true), 1.5), '무지개 터보! 4초 · 코인 +3 · 무지개 불꽃 · 더 빠르게! · 무적');
  assert.equal(Q.rewardText(Q.quizReward(1, false), 1.36), '부스트 1.5초 · 코인 +1 · 방패 2초');
});

test('quiz only in grand prix, item battle and speed match; kid ids match the family drivers', () => {
  assert.deepEqual([...Q.QUIZ_MODES].sort(), ['battle', 'gp', 'speed']);
  const drivers = fs.readFileSync(path.join(__dirname, '../src/drivers.js'), 'utf8');
  for (const id of Q.QUIZ_KIDS) assert.match(drivers, new RegExp("id: '" + id + "'"));
});
