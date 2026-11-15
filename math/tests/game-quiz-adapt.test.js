'use strict';
// 게임 안 수학 문제의 난이도 조절 규칙(assets/study/game-quiz.js, 기록 형식 v2) 점검: node --test math/tests/game-quiz-adapt.test.js
const test = require('node:test'), assert = require('node:assert/strict');
const GQ = require('../../assets/study/game-quiz.js');
const C = require('../curriculum.js');

function rng(seed) { return () => ((seed = seed * 16807 % 2147483647) - 1) / 2147483646; }
function memory(initial) {
  const m = new Map(Object.entries(initial || {}));
  return { getItem: k => (m.has(k) ? m.get(k) : null), setItem: (k, v) => m.set(k, String(v)), removeItem: k => m.delete(k), map: m };
}
const NOW = '2026-11-13T10:00:00';
const SLOW = { ms: 4000 };   // 생각하고 고른 답
function saved(st, id) { return JSON.parse(st.getItem(GQ.stateKey(id))); }
// 자리 찾기를 끝낸 기록에서 시작(정해진 단계에 머물러 있는 아이)
function settled(id, level, extra) {
  return memory({ [GQ.stateKey(id)]: JSON.stringify(Object.assign({ v: 2, level, skills: {}, wrong: [], solved: 50, firstTries: 40, placing: false, best: level }, extra || {})) });
}

test('보기: 정답 자리가 왼쪽·가운데·오른쪽에 고르게 나온다(가운데만 눌러서 맞히지 못하게)', () => {
  const r = rng(77), pos = [0, 0, 0];
  let n = 0;
  for (let lv = 1; lv <= 19; lv++) {
    for (let i = 0; i < 150; i++) {
      const p = C.makeProblem(lv, r), ch = GQ.buildChoices(p, r);
      assert.equal(ch.length, 3, p.text); assert.equal(new Set(ch).size, 3, p.text + ' ' + ch);
      assert.ok(ch.includes(p.answer), p.text + ' ' + ch);
      assert.ok(ch.every(v => Number.isInteger(v) && v >= 0), p.text + ' ' + ch);
      assert.deepEqual(ch, ch.slice().sort((a, b) => a - b), '작은 순으로 늘어놓는다');
      pos[ch.indexOf(p.answer)]++; n++;
    }
  }
  for (const c of pos) assert.ok(c / n > 0.26 && c / n < 0.41, '정답 자리 비율 ' + pos.map(x => Math.round(100 * x / n)).join('/'));
});

test('보기: 글에 적힌 수에서 고르는 문제는 글의 수로 보기를 만든다(큰 수·작은 수·짝수·홀수·숫자 카드)', () => {
  const r = rng(5);
  for (let i = 0; i < 300; i++) {
    for (const type of ['bigger', 'smaller']) {
      const p = C.makeProblem(5, r, type), nums = p.text.match(/\d+/g).map(Number), ch = GQ.buildChoices(p, r);
      assert.ok(ch.includes(nums[0]) && ch.includes(nums[1]), p.text + ' ' + ch);
    }
    for (const type of ['evenPick', 'oddPick']) {
      const p = C.makeProblem(5, r, type), nums = p.text.match(/\d+/g).map(Number), ch = GQ.buildChoices(p, r);
      assert.deepEqual(ch, nums.slice().sort((a, b) => a - b), p.text);
      const want = type === 'evenPick' ? 0 : 1;
      assert.equal(ch.filter(v => v % 2 === want).length, 1, '정답이 될 수 있는 보기는 하나뿐 ' + p.text + ' ' + ch);
    }
    for (const type of ['biggest2', 'smallest2']) {
      const p = C.makeProblem(5, r, type), cards = p.text.match(/\d+/g).slice(0, 3), ch = GQ.buildChoices(p, r);
      for (const v of ch) { const d = String(v).split(''); assert.ok(d.length === 2 && d[0] !== d[1] && d.every(x => cards.includes(x)), p.text + ' ' + ch); }
    }
  }
});

test('처음 답이 틀리면 다음 문제는 한 단계 아래(받침), 두 번 연속이면 두 단계 아래', () => {
  const st = settled('jaei', 9), q = GQ.forKid('jaei', { storage: st, rng: rng(3), now: NOW });
  const p1 = q.next(); assert.equal(p1.level >= 8, true);
  q.record(p1, false, SLOW);
  const p2 = q.next(); assert.equal(p2.slot, 'builder'); assert.equal(p2.level, 8);
  q.record(p2, false, SLOW);
  const p3 = q.next(); assert.equal(p3.slot, 'builder'); assert.equal(p3.level, 7);
  q.record(p3, true, SLOW);
  assert.equal(q.next().level <= 9, true);
});

test('첫 답 오답 3번 연속이면 단계가 내려간다(받침 문제까지 놓치면 두 단계)', () => {
  const st = settled('jaei', 9), q = GQ.forKid('jaei', { storage: st, rng: rng(4), now: NOW });
  let g;
  for (let i = 0; i < 3; i++) g = q.record(q.next(), false, SLOW);
  assert.equal(g.demoted, true); assert.equal(g.promoted, false);
  assert.equal(q.level, 7);
  assert.equal(saved(st, 'jaei').downFrom.l, 9);
});

test('6문제 연속 첫 정답이면 다음은 한 단계 위(지루함 끊기), 8개 중 7개 + 도전 성공이면 승급', () => {
  const st = settled('yungeon', 5), q = GQ.forKid('yungeon', { storage: st, rng: rng(9), now: NOW });
  const slots = [];
  let g = null;
  for (let i = 0; i < 20 && q.level === 5; i++) { const p = q.next(); slots.push(p.slot + p.level); g = q.record(p, true, SLOW); }
  assert.ok(slots.slice(6).some(s => s.startsWith('up')), slots.join(','));
  assert.equal(q.level, 6, slots.join(','));
  assert.equal(g.promoted, true, '처음 가 보는 단계');
});

test('내려갔다 다시 오른 단계는 promoted 가 아니다(게임이 같은 축하를 되풀이하지 않게), rose 만 true', () => {
  const st = settled('jaei', 9, { best: 10 }), q = GQ.forKid('jaei', { storage: st, rng: rng(12), now: NOW });
  let g = null;
  for (let i = 0; i < 40 && q.level === 9; i++) g = q.record(q.next(), true, SLOW);
  assert.equal(q.level, 10);
  assert.equal(g.rose, true); assert.equal(g.promoted, false);
});

test('강등 직후에는 다시 올라가기가 더 어렵다(10문제 중 9문제)', () => {
  const st = settled('jaei', 9), q = GQ.forKid('jaei', { storage: st, rng: rng(21), now: NOW });
  for (let i = 0; i < 3; i++) q.record(q.next(), false, SLOW);
  const at = q.level; assert.ok(at < 9);
  // 받침 문제를 하나 맞히고, 그 단계에서 7개 중 6개만 맞히면 아직 그대로
  const pattern = [true, true, true, false, true, true, true];
  for (const ok of pattern) q.record(q.next(), ok, SLOW);
  assert.equal(q.level, at);
});

test('함부로 누른 오답(잠금 풀린 뒤 0.7초 안)은 내려가는 증거가 아니다 — 복습 목록에도 안 들어간다', () => {
  const st = settled('jaei', 9), q = GQ.forKid('jaei', { storage: st, rng: rng(6), now: NOW });
  for (let i = 0; i < 12; i++) q.record(q.next(), false, { ms: 300 });
  const s = saved(st, 'jaei');
  assert.equal(q.level, 9);
  assert.equal(s.wrong.length, 0);
  assert.ok(s.taps >= 1);
  assert.ok(s.hist.every(h => h.tap === 1));
});

test('마구 누르는 아이(1/3 확률로 맞힘, 빠르거나 느리게)는 단계가 크게 오르지도 무너지지도 않는다', () => {
  for (const seed of [1, 2, 3]) {
    const st = memory(), r = rng(seed), tap = rng(seed * 31 + 7);
    let lo = 99, hi = 0;
    for (let i = 0; i < 300; i++) {
      const now = new Date(2026, 10, 1 + Math.floor(i / 25), 10).toISOString();
      const q = GQ.forKid('yungeon', { storage: st, rng: r, now });
      const p = q.next();
      q.record(p, tap() < 1 / 3, { ms: 400 + tap() * 500 });
      lo = Math.min(lo, q.level); hi = Math.max(hi, q.level);
    }
    assert.ok(hi <= 5, 'seed ' + seed + ' 최고 ' + hi);   // 시작 3, 운 좋은 자리 찾기 한 번(+2)까지
    assert.ok(lo >= 1);
  }
});

test('하루에 그날 시작 단계보다 3단계 넘게는 내려가지 않는다', () => {
  const st = settled('jaei', 12), q = GQ.forKid('jaei', { storage: st, rng: rng(8), now: NOW });
  for (let i = 0; i < 60; i++) q.record(q.next(), false, SLOW);
  assert.equal(q.level, 9);
  const tomorrow = GQ.forKid('jaei', { storage: st, rng: rng(8), now: '2026-11-14T10:00:00' });
  for (let i = 0; i < 6; i++) tomorrow.record(tomorrow.next(), false, SLOW);
  assert.ok(tomorrow.level < 9);
});

test('pace "quick": 집 단계 또는 한 단계 아래, 짧은 문제 위주, 도전(위 단계)은 8연속 정답 뒤에만', () => {
  const st = settled('yunchan', 15), q = GQ.forKid('yunchan', { storage: st, rng: rng(13), now: NOW });
  let short = 0;
  for (let i = 0; i < 60; i++) {
    const p = q.next({ pace: 'quick' });
    const recent = (saved(st, 'yunchan').hist || []).slice(-8);
    if (p.level > p.home) assert.ok(recent.length === 8 && recent.every(h => h.ok), '8연속 정답 뒤에만 위 단계');
    assert.ok(p.level >= p.home - 2 && p.level <= p.home + 1, p.slot + ' ' + p.level + ' home ' + p.home);
    if (p.text.length <= GQ.TUNE.shortText) short++;
    q.record(p, i % 4 !== 3, SLOW);
  }
  assert.ok(short >= 45, '짧은 문제 ' + short + '/60');
});

test('pace "challenge": 최근이 괜찮으면 한 단계 위, 막 틀렸으면 받침 문제가 먼저', () => {
  const st = settled('jaei', 8), q = GQ.forKid('jaei', { storage: st, rng: rng(14), now: NOW });
  for (let i = 0; i < 4; i++) q.record(q.next(), true, SLOW);
  const c = q.next({ pace: 'challenge' });
  assert.equal(c.level, 9); assert.equal(c.slot, 'up');
  q.record(c, false, SLOW);
  const after = q.next({ pace: 'challenge' });
  assert.equal(after.slot, 'builder'); assert.ok(after.level < 8 + 1);
  // 모르는 pace 값은 보통과 같다
  assert.ok(['at', 'down', 'up', 'review', 'builder'].includes(q.next({ pace: 'zzz' }).slot));
});

test('옛 기록(v1)은 단계·풀이 기록·복습 목록·횟수를 그대로 두고 v2 로 옮겨진다(자리 찾기는 한 번 다시)', () => {
  const wrongItem = { key: '9:7 + 5 = □', level: 9, text: '7 + 5 = □', problem: { level: 9, type: 'carry', text: '7 + 5 = □', answer: 12, key: '9:7 + 5 = □' }, stage: 0, due: '2026-11-20', miss: 1 };
  const old = { v: 1, level: 9, skills: { '9:carry': [{ date: '2026-11-01', key: '9:a', ok: true }] }, wrong: [wrongItem], solved: 77, firstTries: 60, seeded: 'hub', boost: 0 };
  const st = memory({ gq_kid_jaei_v1: JSON.stringify(old) });
  const q = GQ.forKid('jaei', { storage: st, rng: rng(15), now: NOW });
  assert.equal(q.level, 9);
  q.record(q.next(), true, SLOW);
  const s = saved(st, 'jaei');
  assert.equal(s.v, 2); assert.equal(s.solved, 78); assert.equal(s.seeded, 'hub');
  assert.ok(s.skills['9:carry'][0].ok); assert.equal(s.wrong[0].key, wrongItem.key);
  assert.equal(s.placing, true); assert.equal(s.hist.length, 1);
  // 깨진 v2 필드는 버리고 기본값
  const broken = memory({ gq_kid_jaei_v1: JSON.stringify(Object.assign({}, old, { v: 2, hist: 'x', since: -5, day: 7, downFrom: 'y', placing: 'yes' })) });
  const b = GQ.forKid('jaei', { storage: broken, rng: rng(16), now: NOW });
  assert.equal(b.level, 9); assert.deepEqual(b.state.hist, []); assert.equal(b.state.since, 0); assert.equal(b.state.placing, false);
  b.record(b.next(), true, SLOW);
});

test('같은 문제를 연달아 내지 않는다(유형이 여럿인 단계는 같은 유형도 잘 피한다)', () => {
  const st = settled('jaei', 13), q = GQ.forKid('jaei', { storage: st, rng: rng(17), now: NOW });
  let prev = null, sameType = 0, sameKey = 0;
  for (let i = 0; i < 120; i++) {
    const p = q.next();
    if (prev && p.key === prev.key) sameKey++;
    if (prev && p.level === 13 && prev.level === 13 && p.type === prev.type) sameType++;
    q.record(p, i % 5 !== 4, SLOW); prev = p;
  }
  assert.equal(sameKey, 0);
  assert.ok(sameType <= 15, '같은 유형 연속 ' + sameType);
});

test('부모용 levels()·setLevel(): 아이별 단계를 보고 고친다(풀이 기록은 그대로, 범위 밖은 범위 안으로)', () => {
  const st = settled('yunchan', 15, { skills: { '15:add3': [{ date: '2026-11-01', key: 'a', ok: true }] } });
  const before = GQ.levels(st);
  assert.deepEqual(before.map(k => k.id), ['yunchan', 'jaei', 'yungeon', 'taeo']);
  assert.equal(before[0].level, 15); assert.equal(before[1].level, null, '기록 없는 아이');
  assert.equal(GQ.setLevel('yunchan', 11, st), 11);
  assert.equal(GQ.forKid('yunchan', { storage: st, now: NOW }).level, 11, '윤찬 시작 단계 올리기가 덮어쓰지 않는다');
  assert.ok(saved(st, 'yunchan').skills['15:add3']);
  assert.equal(GQ.setLevel('taeo', 9, st), 4, '태오는 4단계까지');
  assert.equal(GQ.setLevel('nobody', 3, st), null);
});

/* ---- 아이 모형으로 돌려 보는 회귀 검사(정해진 씨앗) ----
   단계·유형마다 어림 난이도 d, 아이 능력 θ. 처음 답이 맞을 확률 = 실수 5% · 찍기 1/3 을 섞은 로지스틱 σ(1.7(θ−d)). */
const D = { 1: 1, 2: 1.8, 3: 2.7, 4: 3, 5: 4.1, 6: 3.8, 7: 4.6, 8: 4.9, 9: 5.6, 10: 6.2, 11: 6.8, 12: 7.4, 13: 8, 14: 9.1, 15: 9.1, 16: 9.7, 17: 10.1, 18: 10.1, 19: 10.3 };
function pFirst(theta, p) { const k = 1 / (1 + Math.exp(-1.7 * (theta - D[p.level]))); return 0.95 * k + (1 - 0.95 * k) / 3; }
function simulate(kid, theta, seed, n) {
  const st = memory(), r = rng(seed), a = rng(seed * 7 + 1), rows = [];
  for (let i = 0; i < n; i++) {
    const now = new Date(2026, 10, 1 + Math.floor(i / 25), 10).toISOString();
    const q = GQ.forKid(kid, { storage: st, rng: r, now }), p = q.next(), home = q.level;
    const ok = a() < pFirst(typeof theta === 'function' ? theta(i) : theta, p);
    q.record(p, ok, { ms: 2500 + a() * 4000 });
    rows.push({ home, level: p.level, ok });
  }
  return rows;
}
function stats(rows, from) {
  const tail = rows.slice(from), ft = tail.filter(r => r.ok).length / tail.length;
  let run = 0, maxMiss = 0; for (const r of rows) { run = r.ok ? 0 : run + 1; maxMiss = Math.max(maxMiss, run); }
  return { ft, maxMiss };
}

test('모형 아이: 맞는 수준이면 처음 답 정답률이 목표(75~85%) 근처, 첫 답 오답은 4번 넘게 이어지지 않는다', () => {
  const cases = [['taeo', 2.2], ['yungeon', 4.8], ['jaei', 6.5], ['yunchan', 9.5]], all = [];
  for (const [kid, theta] of cases) for (const seed of [1, 2]) {
    const s = stats(simulate(kid, theta, seed, 260), 60);
    all.push(s.ft);
    assert.ok(s.ft >= 0.68 && s.ft <= 0.88, kid + ' θ' + theta + ' seed' + seed + ' 정답률 ' + s.ft.toFixed(2));
    assert.ok(s.maxMiss <= 4, kid + ' 연속 오답 ' + s.maxMiss);
  }
  const mean = all.reduce((a, b) => a + b, 0) / all.length;
  assert.ok(mean >= 0.74 && mean <= 0.85, '평균 ' + mean.toFixed(3));
});

test('모형 아이: 시작보다 훨씬 센 아이는 30문제 안에 위로, 훨씬 약한 아이는 40문제 안에 아래로 간다', () => {
  for (const seed of [1, 2, 3]) {
    const strong = simulate('jaei', 11, seed, 40);
    assert.ok(strong.findIndex(r => r.home >= 15) >= 0 && strong.findIndex(r => r.home >= 15) <= 30, '센 아이 seed' + seed);
    const weak = simulate('jaei', 3, seed, 60);
    const at = weak.findIndex(r => r.home <= 4);
    assert.ok(at >= 0 && at <= 40, '약한 아이 seed' + seed + ' ' + at);
    assert.ok(stats(weak, 40).ft >= 0.65, '약한 아이 정답률 ' + stats(weak, 40).ft.toFixed(2));
  }
});

test('모형 아이: 실력이 느는 아이를 따라 올라간다', () => {
  const rows = simulate('jaei', i => 4 + 4 * Math.min(1, i / 300), 4, 360);
  const early = rows.slice(30, 90).reduce((a, r) => a + r.home, 0) / 60, late = rows.slice(300).reduce((a, r) => a + r.home, 0) / 60;
  assert.ok(late >= early + 2, early.toFixed(1) + ' → ' + late.toFixed(1));
});
