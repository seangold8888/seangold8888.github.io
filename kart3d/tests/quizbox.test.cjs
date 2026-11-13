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

test('first-try answers climb red → blue → rainbow; rainbow is one second longer; retries drop a step', () => {
  let r = Q.quizReward(0, true); assert.deepEqual(r, { tier: 1, secs: 3, coins: 3 });
  r = Q.quizReward(r.tier, true); assert.deepEqual(r, { tier: 2, secs: 3, coins: 3 });
  r = Q.quizReward(r.tier, true); assert.deepEqual(r, { tier: 3, secs: 4, coins: 3 });
  r = Q.quizReward(r.tier, true); assert.equal(r.tier, 3);
  r = Q.quizReward(r.tier, false); assert.deepEqual(r, { tier: 2, secs: 1, coins: 0 });
  assert.equal(Q.quizReward(0, false).tier, 0);
  assert.equal(Q.FLAME[1].name, '빨강'); assert.equal(Q.FLAME[2].name, '파랑'); assert.equal(Q.FLAME[3].color, 'rainbow');
});

test('quiz only in grand prix, item battle and speed match; kid ids match the family drivers', () => {
  assert.deepEqual([...Q.QUIZ_MODES].sort(), ['battle', 'gp', 'speed']);
  const drivers = fs.readFileSync(path.join(__dirname, '../src/drivers.js'), 'utf8');
  for (const id of Q.QUIZ_KIDS) assert.match(drivers, new RegExp("id: '" + id + "'"));
});
