'use strict';
// 공통 게임 수학 모듈(assets/study/game-quiz.js) 점검: node --test math/tests/game-quiz.test.js
const test = require('node:test'), assert = require('node:assert/strict');
const GQ = require('../../assets/study/game-quiz.js');
const H = require('../../assets/study/math-bridge.js');

function rng(seed) { return () => ((seed = seed * 16807 % 2147483647) - 1) / 2147483646; }
function memory(initial) {
  const m = new Map(Object.entries(initial || {})), writes = [];
  return { getItem: k => (m.has(k) ? m.get(k) : null), setItem: (k, v) => { writes.push(k); m.set(k, String(v)); }, removeItem: k => m.delete(k), map: m, writes };
}
const HUB = {
  math10_state: JSON.stringify({ name: '재이', level: 7, skills: { '7:twoOne': [{ date: '2026-11-01', key: '7:1', ok: true }] }, wrong: [], history: [{ date: '2026-11-01', level: 7 }], stamps: { '2026-11-01': 1 }, cardStudyDays: { '2026-11-01': 3 }, garden: 9 }),
  hub2_study_age: '8',
};
const PASS = JSON.stringify({ until: 1 });   // hub_play_pass 는 문제 패널 놀이 시간 돌려주기의 의도된 예외라 따로 둔다
const DAYS = ['2026-11-10', '2026-11-11', '2026-11-12', '2026-11-13'];

test('아이 넷 프로필과 나이별 단계 범위(10세는 9세 이상 칸, 허브 age() 처럼 7로 바뀌지 않는다)', () => {
  assert.deepEqual(GQ.KIDS.map(k => [k.id, k.name, k.age]), [['yunchan', '윤찬', 10], ['jaei', '재이', 8], ['yungeon', '윤건', 7], ['taeo', '태오', 5]]);
  for (const k of GQ.KIDS) {
    const b = GQ.bandForAge(k.age), ref = H.AGE_BANDS[Math.min(9, k.age)];
    assert.equal(b.start, ref.start, k.name); assert.equal(b.cap, ref.cap, k.name);
  }
  assert.deepEqual([GQ.bandForAge(10).start, GQ.bandForAge(10).cap], [5, 12]);
  assert.deepEqual([GQ.bandForAge(5).start, GQ.bandForAge(5).cap], [1, 2]);
});

test('아이 넷 각각 200문제: 오류 없음, 보기 3개에 정답 포함, 단계는 AGE_BANDS 범위 안(승급해도 cap 을 넘지 않는다)', () => {
  const st = memory();
  for (const k of GQ.KIDS) {
    const band = GQ.bandForAge(k.age), r = rng(11 + k.age);
    for (let i = 0; i < 200; i++) {
      const q = GQ.forKid(k.id, { storage: st, rng: r, now: DAYS[i % DAYS.length] + 'T10:00:00' });
      const p = q.next();
      assert.equal(typeof p.text, 'string'); assert.ok(p.text.length > 0);
      assert.ok(Number.isInteger(p.answer) && p.answer >= 0, k.name + ' ' + p.text);
      assert.equal(p.choices.length, 3); assert.equal(new Set(p.choices).size, 3);
      assert.ok(p.choices.includes(p.answer), k.name + ' ' + p.text);
      assert.ok(p.raw, '수학 모듈 문제여야 한다(예비 문제 아님)');
      assert.ok(p.level >= band.start && p.level <= band.cap, k.name + ' level ' + p.level);
      const g = q.record(p, true);
      assert.ok(g && g.level >= band.start && g.level <= band.cap);
    }
  }
  // 태오는 200문제를 다 맞혀도 2단계가 끝(받아올림 같은 것은 나오지 않는다)
  assert.equal(JSON.parse(st.getItem(GQ.stateKey('taeo'))).level, 2);
});

test('아이별 기록이 서로 섞이지 않는다 — 각자 자기 키에, 각자 자기 속도로', () => {
  const st = memory();
  const taeo = GQ.forKid('taeo', { storage: st, rng: rng(3), now: '2026-11-13T09:00:00' });
  for (let i = 0; i < 30; i++) taeo.record(taeo.next(), true);
  assert.equal(st.getItem(GQ.stateKey('jaei')), null, '태오가 풀어도 재이 기록은 생기지 않는다');
  const jaei = GQ.forKid('jaei', { storage: st, rng: rng(4), now: '2026-11-13T09:00:00' });
  const p = jaei.next(); jaei.record(p, false);
  const t = JSON.parse(st.getItem(GQ.stateKey('taeo'))), j = JSON.parse(st.getItem(GQ.stateKey('jaei')));
  assert.equal(t.solved, 30); assert.equal(j.solved, 1);
  assert.ok(Object.keys(t.skills).every(key => /^[12]:/.test(key)), '태오 기록엔 1·2단계만');
  assert.ok(Object.keys(j.skills).every(key => !/^[12]:/.test(key)), '재이 기록엔 태오 단계가 없다');
  assert.equal(j.wrong.length, 1); assert.equal(t.wrong.length, 0);
  assert.deepEqual(new Set(st.writes), new Set([GQ.stateKey('taeo'), GQ.stateKey('jaei')]));
});

test('허브 기존 키(math10_state·hub2_study_age 등)는 한 글자도 바뀌지 않는다', () => {
  const st = memory(Object.assign({ hub_play_pass: PASS }, HUB)), before = Object.fromEntries(Object.keys(HUB).map(k => [k, st.getItem(k)]));
  for (const k of GQ.KIDS) {
    const q = GQ.forKid(k.id, { storage: st, rng: rng(k.age), now: '2026-11-13T09:00:00' });
    for (let i = 0; i < 50; i++) q.record(q.next(), i % 3 !== 0);
  }
  GQ.setKid('taeo', st);
  for (const k of Object.keys(HUB)) assert.equal(st.getItem(k), before[k], k);
  assert.ok(st.writes.every(k => k === GQ.CURRENT_KEY || /^gq_kid_[a-z]+_v1$/.test(k)), st.writes.join(','));
});

test('허브가 재이 것이면 재이 기록을 처음 만들 때 허브 단계를 시작 단계로만 빌려 온다(읽기만)', () => {
  const st = memory(HUB);
  const jaei = GQ.forKid('jaei', { storage: st, rng: rng(9) });
  assert.equal(jaei.level, 7);
  assert.equal(jaei.next().level, 7);
  // 다른 아이는 허브와 무관하게 자기 나이 시작 단계
  assert.equal(GQ.forKid('yunchan', { storage: st }).level, 12);   // 윤찬은 start 12
  assert.equal(GQ.forKid('yungeon', { storage: st }).level, 3);
  // 허브 이름이 다른 아이면 빌려 오지 않는다
  const other = memory({ math10_state: JSON.stringify({ name: '민수', level: 9 }) });
  assert.equal(GQ.forKid('jaei', { storage: other }).level, 5);
  // 허브 단계가 범위 밖이면 범위 안으로
  const low = memory({ math10_state: JSON.stringify({ name: '재이', level: 2 }) });
  assert.equal(GQ.forKid('jaei', { storage: low }).level, 5);
});

test('지금 하는 아이: gq_kid_v1 한 키, 모르는 id 는 거절', () => {
  const st = memory();
  assert.equal(GQ.currentKid(st), null);
  assert.equal(GQ.setKid('yungeon', st), true);
  assert.equal(GQ.currentKid(st), 'yungeon');
  assert.equal(st.getItem('gq_kid_v1'), 'yungeon');
  assert.equal(GQ.setKid('nobody', st), false);
  assert.equal(GQ.currentKid(st), 'yungeon');
  st.setItem('gq_kid_v1', 'garbage');
  assert.equal(GQ.currentKid(st), null);
});

test('수학 모듈을 못 읽었을 때의 예비 문제도 나이에 맞다', () => {
  const r = rng(5);
  for (let i = 0; i < 300; i++) {
    const t = GQ.fallbackProblem(5, r), y = GQ.fallbackProblem(7, r), c = GQ.fallbackProblem(10, r);
    for (const p of [t, y, c]) { assert.equal(p.choices.length, 3); assert.ok(p.choices.includes(p.answer)); assert.equal(p.raw, null); }
    assert.ok(t.answer <= 5 && /\+/.test(t.text), t.text);
    assert.ok(y.answer <= 10, y.text);
    assert.ok(c.answer >= 12, c.text);
  }
});

test('저장된 기록이 망가져 있어도 시작 단계로 되살아난다', () => {
  const st = memory({ gq_kid_taeo_v1: '{oops', gq_kid_yunchan_v1: JSON.stringify({ level: 99, skills: [], wrong: 'x' }) });
  assert.equal(GQ.forKid('taeo', { storage: st }).level, 1);
  const y = GQ.forKid('yunchan', { storage: st, rng: rng(1) });
  assert.equal(y.level, 12);
  assert.ok(y.next().level <= 12);
});

test('윤찬은 새 기록을 12단계(2학년 1학기 끝, 커리큘럼 최고)에서 시작하고 문제도 12단계만 나온다. 다른 아이는 그대로', () => {
  assert.equal(GQ.kidById('yunchan').start, 12);
  assert.deepEqual(['jaei', 'yungeon', 'taeo'].map(id => GQ.kidById(id).start), [undefined, undefined, undefined]);
  const st = memory(), q = GQ.forKid('yunchan', { storage: st, rng: rng(2), now: '2026-11-13T09:00:00' });
  assert.equal(q.level, 12);
  for (let i = 0; i < 30; i++) { const p = q.next(); assert.equal(p.level, 12); q.record(p, true); }
  assert.equal(GQ.forKid('jaei', { storage: memory() }).level, 5);
  assert.equal(GQ.forKid('yungeon', { storage: memory() }).level, 3);
  assert.equal(GQ.forKid('taeo', { storage: memory() }).level, 1);
});

test('옛 윤찬 기록(5단계)은 한 번만 올라가고 풀이 기록은 그대로, 올린 뒤엔 다시 건드리지 않는다', () => {
  const old = { v: 1, level: 5, skills: { '5:tensCount': [{ date: '2026-11-01', key: 'k', ok: true }] }, wrong: [], solved: 7, firstTries: 4, seeded: '' };
  const st = memory({ gq_kid_yunchan_v1: JSON.stringify(old) });
  const q = GQ.forKid('yunchan', { storage: st, rng: rng(5), now: '2026-11-13T09:00:00' });
  assert.equal(q.level, 12);
  q.record(q.next(), true);
  const saved = JSON.parse(st.getItem('gq_kid_yunchan_v1'));
  assert.equal(saved.level, 12); assert.equal(saved.boost, 12); assert.equal(saved.solved, 8);
  assert.ok(saved.skills['5:tensCount'], '옛 풀이 기록 유지');
  // 표시가 있으면 낮은 단계로 되돌려 놓아도(수동 조정) 다시 올리지 않는다
  saved.level = 9; st.setItem('gq_kid_yunchan_v1', JSON.stringify(saved));
  assert.equal(GQ.forKid('yunchan', { storage: st }).level, 9);
  // 이미 12 보다 높을 수는 없고, 허브가 윤찬 것이어도 시작 단계 아래로 내려가지 않는다
  const hub = memory({ math10_state: JSON.stringify({ name: '윤찬', level: 6 }) });
  assert.equal(GQ.forKid('yunchan', { storage: hub }).level, 12);
});

test('놀이 시간 돌려주기: 패널이 20초 열려 있으면 만료가 20초 밀린다', () => {
  const T = 1_800_000_000_000, st = memory({ hub_play_pass: JSON.stringify({ until: T + 100_000 }) });
  const lend = GQ.lendPlayTime(st, T);
  assert.ok(lend);
  assert.equal(JSON.parse(st.getItem('hub_play_pass')).until, T + 190_000, '열리는 즉시 90초를 미리 민다(열려 있는 동안 시간 종료가 안 뜨게)');
  GQ.settlePlayTime(lend, T + 20_000);
  assert.equal(JSON.parse(st.getItem('hub_play_pass')).until, T + 120_000);
  GQ.settlePlayTime(lend, T + 50_000);   // 두 번 닫아도 한 번만
  assert.equal(JSON.parse(st.getItem('hub_play_pass')).until, T + 120_000);
});

test('놀이 시간 돌려주기: 한 번에 최대 90초, 다른 필드는 보존', () => {
  const T = 1_800_000_000_000, st = memory({ hub_play_pass: JSON.stringify({ until: T + 100_000, extra: 'x' }) });
  GQ.settlePlayTime(GQ.lendPlayTime(st, T), T + 600_000);
  const p = JSON.parse(st.getItem('hub_play_pass'));
  assert.equal(p.until, T + 190_000); assert.equal(p.extra, 'x');
});

test('놀이 시간 돌려주기: free·값 없음·깨진 값·형식 다름·이미 만료면 무변화', () => {
  const T = 1_800_000_000_000, d = new Date(T), day = d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
  const cases = {
    free: JSON.stringify({ free: true, day, until: T + 100_000 }),
    none: null,
    broken: '{oops',
    noUntil: JSON.stringify({ free: false }),
    stringUntil: JSON.stringify({ until: String(T + 100_000) }),
    array: '[1,2]',
    expired: JSON.stringify({ until: T - 1 }),
    zero: JSON.stringify({ until: 0 }),
  };
  for (const [name, raw] of Object.entries(cases)) {
    const st = memory(raw == null ? {} : { hub_play_pass: raw }), before = st.getItem('hub_play_pass');
    const lend = GQ.lendPlayTime(st, T);
    assert.equal(lend, null, name);
    GQ.settlePlayTime(lend, T + 20_000);
    assert.equal(st.getItem('hub_play_pass'), before, name);
    assert.deepEqual(st.writes, [], name);
  }
  // 열린 사이에 자유이용으로 바뀌었으면 되돌리지 않는다
  const st = memory({ hub_play_pass: JSON.stringify({ until: T + 100_000 }) }), lend = GQ.lendPlayTime(st, T);
  st.setItem('hub_play_pass', cases.free);
  GQ.settlePlayTime(lend, T + 20_000);
  assert.equal(st.getItem('hub_play_pass'), cases.free);
  assert.equal(GQ.lendPlayTime(null, T), null);
});

test('놀이 시간 돌려주기가 건드리는 허브 키는 hub_play_pass 하나뿐(math10_state·hub2_study_age 불변)', () => {
  const T = 1_800_000_000_000, st = memory(Object.assign({ hub_play_pass: JSON.stringify({ until: T + 100_000 }) }, HUB));
  const before = { math10_state: st.getItem('math10_state'), hub2_study_age: st.getItem('hub2_study_age') };
  GQ.settlePlayTime(GQ.lendPlayTime(st, T), T + 5_000);
  assert.equal(st.getItem('math10_state'), before.math10_state); assert.equal(st.getItem('hub2_study_age'), before.hub2_study_age);
  assert.ok(st.writes.every(k => k === 'hub_play_pass'));
});
