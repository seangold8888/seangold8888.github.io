'use strict';
// 산리오 카트(간단판) 「라이벌 레이스」 검사 — HARD-MODES-SPEC.md H3.
// 1) 일반 모드 동일성: 이전 커밋의 main.js·kart.js 와 현재 파일로 네 코스 경주를 같은 난수·입력으로
//    돌려 30프레임마다 모든 카트 상태가 같아야 한다.
// 2) 라이벌: 해금 조건, 가장 빠른 친구 배정, 고무줄 규칙, 리본 사용 시점, 연패 보정, 기록 분리.
// 실행: node --test kart/tests/rival.test.js
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const { execFileSync } = require('node:child_process');

const siteRoot = path.resolve(__dirname, '..', '..');
const read = (f) => fs.readFileSync(path.join(siteRoot, f), 'utf8');
function gitShow(f) {
  try { return execFileSync('git', ['show', 'HEAD:' + f], { cwd: siteRoot, encoding: 'utf8', maxBuffer: 1 << 26 }); }
  catch { return null; }
}
const current = { main: read('kart/src/main.js'), kart: read('kart/src/kart.js') };
const baseDir = process.env.KART_BASELINE_DIR;
const baseline = baseDir
  ? { main: fs.readFileSync(path.join(baseDir, 'kart/src/main.js'), 'utf8'), kart: fs.readFileSync(path.join(baseDir, 'kart/src/kart.js'), 'utf8') }
  : { main: gitShow('kart/src/main.js'), kart: gitShow('kart/src/kart.js') };

function build(source, storage = new Map()) {
  let seed = 20260913;
  const math = Object.create(Math);
  math.random = () => { seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0; return seed / 4294967296; };
  const win = { SK: {}, addEventListener() {} };
  const audio = new Proxy({}, { get: () => () => {} });
  const context = vm.createContext({
    window: win, console, Math: math, setTimeout,
    localStorage: { getItem: (k) => storage.get(k), setItem: (k, v) => storage.set(k, String(v)) },
  });
  context.SK = win.SK; context.navigator = { maxTouchPoints: 0 };
  vm.runInContext(read('kart/src/track.js'), context);
  vm.runInContext(source.kart, context);
  context.SK.createAudio = () => audio;
  context.SK.buildTrackTexture = () => ({ width: 2048, height: 2048 });
  vm.runInContext(source.main, context);
  return { SK: context.SK, storage };
}

function race(SK, track, frames, { rivalOn = false, boostPlayer = false } = {}) {
  const d = SK._debug;
  d.setTrack(track);
  if (rivalOn) d.startRival(); else d.startRace();
  const samples = [];
  for (let f = 0; f < frames; f++) {
    const phase = f % 240;
    if (phase === 0) d.press('ArrowRight');
    if (phase === 18) d.release('ArrowRight');
    if (phase === 120) d.press('ArrowLeft');
    if (phase === 132) d.release('ArrowLeft');
    if (phase === 60) d.press('Space');
    if (phase === 150) d.release('Space');
    if (f % 90 === 45) d.press('ArrowUp');
    if (f % 90 === 47) d.release('ArrowUp');
    if (boostPlayer && d.player) d.player.boost = 1;
    d.step(1 / 60);
    if (f % 30 === 0) samples.push(JSON.stringify([d.scene, d.karts.map((k) => [Math.round(k.x * 10), Math.round(k.y * 10), Math.round(k.speed), k.lap, k.place, k.item, k.finished])]));
    if (d.scene === 'result' && f % 30 === 0) break;
  }
  return samples;
}

test('normal races on all four courses match the previous commit frame for frame', { skip: !baseline.main && 'no git baseline' }, () => {
  for (let track = 0; track < 4; track++) {
    const a = race(build(baseline).SK, track, 60 * 80);
    const b = race(build(current).SK, track, 60 * 80);
    const diff = a.findIndex((s, i) => s !== b[i]);
    assert.equal(diff, -1, 'course ' + track + ' diverged at sample ' + diff);
    assert.equal(a.length, b.length);
  }
});

// 로봇 운전사: 플레이어 카트를 AI 조향으로 몰게 한다(검사 전용). pace 로 실력을 흉내 낸다.
function botRace(SK, { rivalOn = false, pace = 1.12, maxSec = 150 } = {}) {
  const d = SK._debug;
  if (rivalOn) d.startRival(); else d.startRace();
  const me = d.player;
  me.isPlayer = false;
  me.spec = Object.assign({}, me.spec, { top: me.spec.top * pace });
  for (let f = 0; f < 60 * maxSec && d.scene !== 'result'; f++) d.step(1 / 60);
  return d;
}

test('rival race stays locked until the course is won in a normal race', () => {
  const { SK, storage } = build(current);
  SK._debug.setTrack(0);
  SK._debug.startRival();
  assert.equal(SK._debug.rivalMode, false, 'locked course starts a normal race');
  assert.equal(SK._debug.rival, null);

  botRace(SK, { pace: 1.25 });
  assert.equal(SK._debug.scene, 'result');
  assert.equal(SK._debug.player.place, 1);
  assert.deepEqual(JSON.parse(storage.get('sanrio-kart:rival:meadow')), { unlocked: true, won: false, losses: 0 });
  assert.equal(storage.get('sanrio-kart:rival:beach'), undefined, 'unlock is per course');
});

test('the rival is the fastest remaining friend, and repeated losses slow it by 3% up to 6%', () => {
  for (const [losses, assist] of [[0, 1], [3, 0.97], [5, 0.97], [6, 0.94], [9, 0.94]]) {
    const { SK } = build(current, new Map([['sanrio-kart:rival:meadow', JSON.stringify({ unlocked: true, losses })]]));
    SK._debug.setTrack(0); SK._debug.pick(0); SK._debug.startRival();
    assert.equal(SK._debug.rivalMode, true);
    assert.equal(SK._debug.rival.spec.id, 'kuromi');
    assert.equal(Math.round(SK._debug.rival.rival.assist * 100) / 100, assist);
  }
  const { SK } = build(current, new Map([['sanrio-kart:rival:meadow', JSON.stringify({ unlocked: true })]]));
  SK._debug.setTrack(0); SK._debug.pick(3); SK._debug.startRival();
  assert.equal(SK._debug.rival.spec.id, 'cinna', 'kuromi picked by the child → next fastest');
});

test('rival rubber band: never slows when ahead, eases only far ahead; ordinary AI unchanged', () => {
  const { SK } = build(current);
  SK._debug.setTrack(0); SK._debug.startRace();
  const [, a] = SK._debug.karts;
  const T = SK.Track, pt = T.center[40], nxt = T.center[41];
  function top(kart, gap, rivalFlag) {
    kart.x = pt.x; kart.y = pt.y; kart.angle = Math.atan2(nxt.x - pt.x, -(nxt.y - pt.y)); kart.total = 5000;
    kart.rival = rivalFlag ? { assist: 1 } : undefined;
    SK.driveAI(kart, 5000 - gap, 1 / 60);
    return kart.baseTop / kart.spec.top;
  }
  const straight = top(a, 0, false);
  assert.ok(Math.abs(top(a, 1000, false) - straight * 0.84) < 1e-9, 'normal AI slows ahead');
  assert.ok(Math.abs(top(a, 1000, true) - straight) < 1e-9, 'rival does not slow 1000 ahead');
  assert.ok(Math.abs(top(a, 1500, true) - straight * 0.94) < 1e-9, 'rival eases only far ahead');
  assert.ok(Math.abs(top(a, -1000, true) - straight * 1.03) < 1e-9, 'rival catch-up is modest');
  assert.ok(Math.abs(top(a, -1000, false) - straight * 1.06) < 1e-9);
});

test('rival holds its ribbon until the child is ahead, then throws it', () => {
  const { SK } = build(current, new Map([['sanrio-kart:rival:meadow', JSON.stringify({ unlocked: true })]]));
  SK._debug.setTrack(0); SK._debug.startRival();
  for (let i = 0; i < 60 * 6; i++) SK._debug.step(1 / 60);          // 카운트다운 뒤 조금 달린다
  const r = SK._debug.rival, p = SK._debug.player, C = SK.Track.center;
  // 플레이어를 라이벌 기준 offset 만큼 코스 위에 세워 둔다(같은 바퀴 안에서).
  function park(offset) {
    const want = r.progress + offset;
    const pt = C.reduce((best, c) => Math.abs(c.dist - want) < Math.abs(best.dist - want) ? c : best, C[0]);
    p.x = pt.x; p.y = pt.y; p.speed = 0; p.progress = pt.dist; p.lap = r.lap; p.total = p.lap * SK.Track.length + pt.dist;
  }
  r.item = 'ribbon'; r.aiItemDelay = -1;
  for (let i = 0; i < 60; i++) { park(-400); SK._debug.step(1 / 60); }
  assert.equal(r.item, 'ribbon', 'kept while the rival leads');
  for (let i = 0; i < 60; i++) { park(-1500); SK._debug.step(1 / 60); }
  assert.equal(r.item, 'ribbon', 'kept while the child is far behind');
  for (let i = 0; i < 60 && r.item; i++) { park(350); SK._debug.step(1 / 60); }
  assert.equal(r.item, null, 'thrown when the child is just ahead');
});

test('rival results update only the rival record; badges stay a normal-race reward', () => {
  const storage = new Map([['sanrio-kart:rival:meadow', JSON.stringify({ unlocked: true, losses: 2 })], ['sanrio-kart:medals:meadow', '1']]);
  const { SK } = build(current, storage);
  SK._debug.setTrack(0);
  botRace(SK, { rivalOn: true, pace: 1.25 });
  assert.equal(SK._debug.scene, 'result');
  assert.equal(SK._debug.rivalBeat, true);
  assert.deepEqual(JSON.parse(storage.get('sanrio-kart:rival:meadow')), { unlocked: true, won: true, losses: 0 });
  assert.equal(storage.get('sanrio-kart:medals:meadow'), '1', 'no badge change from a rival race');

  const lose = build(current, new Map([['sanrio-kart:rival:meadow', JSON.stringify({ unlocked: true, won: true, losses: 2 })]]));
  lose.SK._debug.setTrack(0);
  const d = botRace(lose.SK, { rivalOn: true, pace: 0.8 });
  assert.equal(d.scene, 'result');
  assert.equal(d.rivalBeat, false);
  assert.deepEqual(JSON.parse(lose.storage.get('sanrio-kart:rival:meadow')), { unlocked: true, won: true, losses: 3 });
});

test('corrupt rival records are ignored safely', () => {
  const { SK } = build(current, new Map([['sanrio-kart:rival:meadow', '{broken'], ['sanrio-kart:rival:beach', JSON.stringify({ unlocked: 'yes', won: true, losses: 99 })]]));
  SK._debug.setTrack(0); SK._debug.startRival(); assert.equal(SK._debug.rivalMode, false);
  SK._debug.setTrack(1); SK._debug.startRival(); assert.equal(SK._debug.rivalMode, false);
});
