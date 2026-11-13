'use strict';
// 케데헌 ? 아이템 → 수학 문제(GameQuiz) → 골든 하모니 단계 검사 (2026-11-13).
// GameQuiz 는 UI 가 단 훅(quizAvailable/onQuiz)으로만 들어온다. 훅이 없으면 ? 아이템도 없고 게임은 그대로다.
// 실행: node --test kedehun/tests/quiz-harmony.test.js
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const gameRoot = path.resolve(__dirname, '..');
const html = fs.readFileSync(path.join(gameRoot, 'index.html'), 'utf8').replace(/\r/g, '');
const combat = fs.readFileSync(path.join(gameRoot, 'combat-v2.js'), 'utf8');

function build(storage = new Map()) {
  const slice = (from, to) => { const a = html.indexOf(from), b = html.indexOf(to, a); assert.ok(a >= 0 && b > a, from); return html.slice(a, b); };
  const context = vm.createContext({
    console, setTimeout, clearTimeout, Promise,
    localStorage: { getItem: (k) => (storage.has(k) ? storage.get(k) : null), setItem: (k, v) => storage.set(k, String(v)), removeItem: (k) => storage.delete(k) },
    window: { matchMedia: () => ({ matches: true }), setInterval: () => 0 },
    performance: { now: () => 0 },
    requestAnimationFrame: () => 1, cancelAnimationFrame() {},
  });
  vm.runInContext(combat, context);
  vm.runInContext('let seed = 7; Math.random = () => { seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0; return seed / 4294967296; };', context);
  vm.runInContext(`
    const COMBAT = KedehunCombat;
    var characterArtReadyForPlay = true;
    ${slice('const GUARDIANS = [', '\n];')}
];
    ${slice('const STAGES = [', 'class AudioEngine {')}
    class AudioEngine { constructor() { this.muted = false; } async unlock() {} play() {} toggle() {} dispose() {} }
    class Music { constructor() {} start() {} stop() {} setBoss() {} duck() {} }
    ${slice('class Game {', '/* Rendering')}
    globalThis.Engine = Game;
    globalThis.QUIZ_REF = QUIZ_BOXES;
    globalThis.GROUND = GROUND_Y;
  `, context);
  const canvas = { getContext: () => ({}), getBoundingClientRect: () => ({ width: 1180, height: 720 }), width: 0, height: 0 };
  return { context, make: () => new context.Engine(canvas, () => {}) };
}

async function startWithQuiz({ hard = false, answer } = {}) {
  const storage = new Map();
  if (hard) storage.set('kedehun-hard-v1', JSON.stringify({ normalStage1: true }));
  const { context, make } = build(storage);
  const g = make();
  const calls = [];
  g.quizAvailable = () => true;
  g.onQuiz = (done) => { calls.push(done); if (answer) done(answer); };
  await g.start('lumi', hard);
  g.finishStory();
  return { g, calls, context };
}

function touchBox(g, i) {
  const box = g.quizBoxes[i];
  g.player.x = box.x; g.player.px = box.x; g.player.y = g.player.py = 610;
  g.collectQuizBoxes();
  return box;
}

test('without the GameQuiz hook there are no ? items and no harmony bonus', async () => {
  const { make } = build();
  const g = make();
  await g.start('lumi');
  g.finishStory();
  assert.equal(g.phase, 'playing');
  assert.deepEqual(Array.from(g.quizBoxes), []);
  assert.equal(g.harmonyTier(), 0);
  g.collectQuizBoxes();
  assert.equal(g.phase, 'playing');
});

test('three ? items per stage, placed before the checkpoint, mid-stage and before the boss gate', async () => {
  const { g, context } = await startWithQuiz();
  const QB = context.QUIZ_REF;
  assert.equal(QB.length, 4);
  for (let s = 0; s < 4; s++) {
    g.loadStage(s, false, 0);
    assert.equal(g.quizBoxes.length, 3, 'stage ' + s);
    const stage = vm.runInContext('STAGES', context)[s];
    const [a, b, c] = g.quizBoxes.map((box) => box.x);
    assert.ok(a < stage.checkpoint && a > stage.checkpoint - 400, 'before checkpoint ' + s);
    assert.ok(b > stage.checkpoint && b < stage.bossGate - 300, 'mid ' + s);
    assert.ok(c < stage.bossGate && c > stage.bossGate - 450, 'before gate ' + s);
    for (const box of g.quizBoxes) {
      // 빛 파편과 겹치지 않는다(줍는 판정 거리 밖).
      for (const [sx, sy] of stage.shards) assert.ok(Math.abs(sx - box.x) >= 46 || Math.abs(sy - box.y) >= 70, 'shard overlap ' + s);
    }
  }
});

test('touching a ? item freezes the game in phase quiz until the answer comes back', async () => {
  const { g, calls } = await startWithQuiz();
  touchBox(g, 0);
  assert.equal(g.phase, 'quiz');
  assert.equal(calls.length, 1);
  assert.equal(g.quizBoxes[0].taken, true);
  const snap = JSON.stringify([g.playTime, g.player.x, g.enemies.map((e) => [e.x, e.cooldown])]);
  // 실제 루프는 phase 가 playing 일 때만 update 를 부른다. 키 입력도 무시된다.
  g.key('ArrowRight', true, false);
  g.setAction('attack', 'touch:1', true);
  g.togglePause();
  assert.equal(g.phase, 'quiz');
  assert.equal(g.input.held('right'), false);
  assert.equal(snap, JSON.stringify([g.playTime, g.player.x, g.enemies.map((e) => [e.x, e.cooldown])]));
  const energy = g.player.energy;
  calls[0]({ firstTry: true, correct: true });
  assert.equal(g.phase, 'playing');
  assert.equal(g.quizLevel, 1);
  assert.equal(g.harmony.golden, 8);
  assert.ok(g.player.energy >= Math.min(100, energy + 25));   // +25 (파동 타격 충전은 덤)
  assert.ok(g.player.invulnerable >= 1.5);
  assert.equal(g.announcement.kicker, 'GOLDEN HARMONY Lv.1!');
  assert.match(g.announcement.title, /피해 \+20% · 하모니 파동.* · 체력 (\+1|가득) · 골든 8초/);
  // 같은 답이 두 번 와도(늦게 온 약속) 다시 주지 않는다.
  calls[0]({ firstTry: true, correct: true });
  assert.equal(g.quizLevel, 1);
});

test('a corrected answer gives half a step and 4 golden seconds; the level never drops and caps at 3', async () => {
  const { g, calls } = await startWithQuiz();
  touchBox(g, 0); calls.at(-1)({ firstTry: false, correct: true });
  assert.equal(g.quizLevel, 0.5);
  assert.equal(g.harmonyTier(), 0);
  assert.equal(g.harmony.golden, 4);
  assert.equal(g.announcement.kicker, 'GOLDEN HARMONY Lv.0.5!');
  assert.equal(g.announcement.title, '피해 +10% · 작은 파동 · 골든 4초');
  touchBox(g, 1); calls.at(-1)({ firstTry: false, correct: true });
  assert.equal(g.quizLevel, 1);
  assert.equal(g.announcement.kicker, 'GOLDEN HARMONY Lv.1!');
  touchBox(g, 2); calls.at(-1)({ firstTry: true, correct: true });
  assert.equal(g.quizLevel, 2);
  assert.match(g.announcement.title, /^피해 \+40% · 하모니 파동/);
  for (let s = 1; s < 4; s++) {
    g.loadStage(s, false, 0);
    for (let i = 0; i < 3; i++) { touchBox(g, i); calls.at(-1)({ firstTry: true, correct: true }); }
  }
  assert.equal(g.quizLevel, 3);
  // 무대가 바뀌어도(loadStage) 단계는 그 판 동안 남는다. 새 판(start)에서만 0.
  g.loadStage(0, false, 0);
  assert.equal(g.quizLevel, 3);
  await g.start('lumi');
  assert.equal(g.quizLevel, 0);
});

test('harmony damage: +20% per step (half steps +10%), stacked with golden x1.6 but never above x2.2', async () => {
  const { g } = await startWithQuiz();
  const hit = (tier, golden) => {
    g.quizLevel = tier; g.harmony.golden = golden ? 5 : 0;
    const e = g.makeEnemy('brute', 99999); e.health = e.maxHealth = 1e6;
    g.strike(e, 100, 0, false);
    return Math.round((1e6 - e.health) * 1000) / 1000;
  };
  assert.deepEqual([0, 0.5, 1, 1.5, 2, 2.5, 3].map((t) => hit(t, false)), [100, 110, 120, 130, 140, 150, 160]);
  assert.deepEqual([0, 0.5, 1, 1.5, 2, 3].map((t) => hit(t, true)), [160, 176, 192, 208, 220, 220]);
});

test('one-try wave: on-screen foes are blown away, the boss loses at most 5%, health +12; a corrected answer only pushes nearby foes', async () => {
  const { g, calls } = await startWithQuiz();
  const p = g.player;
  const place = () => {
    g.enemies = ['shade', 'wisp', 'brute', 'saja'].map((k, i) => { const e = g.makeEnemy(k, p.x + 120 + i * 90); e.spawn = 0; return e; });
    const far = g.makeEnemy('shade', p.x + 2000); far.spawn = 0; g.enemies.push(far);
    const boss = g.makeBoss(); boss.x = p.x + 300; boss.spawn = 0; g.enemies.push(boss);
    return { far, boss };
  };
  p.x = 1500; g.camera = p.x - g.viewWidth / 2; p.health = 60;
  let { far, boss } = place();
  g.openQuiz({ x: p.x, y: 520 }); calls.at(-1)({ firstTry: true, correct: true });
  const kinds = Object.fromEntries(g.enemies.filter((e) => e.kind !== 'boss' && e !== far).map((e) => [e.kind, e.dead]));
  assert.deepEqual(kinds, { shade: true, wisp: true, brute: true, saja: false });
  const saja = g.enemies.find((e) => e.kind === 'saja');
  assert.ok(saja.health <= saja.maxHealth * 0.1, 'saja nearly down');
  assert.ok(saja.vx !== 0, 'knockback');
  assert.equal(far.dead, false); assert.equal(far.health, far.maxHealth);
  assert.ok(boss.maxHealth - boss.health <= boss.maxHealth * 0.05 + 1e-6, 'boss <= 5%');
  assert.ok(boss.maxHealth - boss.health > 0);
  assert.equal(p.health, 72);
  // 고쳐 맞힘: 가까운 적만 약하게, 회복 없음
  g.quizLevel = 0; g.harmony.golden = 0; p.health = 60;
  ({ far, boss } = place());
  g.openQuiz({ x: p.x, y: 520 }); calls.at(-1)({ firstTry: false, correct: true });
  assert.equal(g.enemies.filter((e) => e.dead).length, 0);
  const shade = g.enemies.find((e) => e.kind === 'shade' && e !== far);
  assert.equal(shade.maxHealth - shade.health, 12);
  assert.equal(far.health, far.maxHealth);
  assert.equal(p.health, 60);
});

// 보스 처치 시간: 하모니 3단계가 0단계의 55% 밑으로 떨어지면(보스가 순식간에 녹으면) 실패.
test('max harmony keeps boss kills at >= 55% of the level-0 time on every stage', async () => {
  const ratios = [];
  for (const hero of ['lumi', 'mira', 'joy']) for (let s = 0; s < 4; s++) {
    const times = [];
    for (const lv of [0, 3]) {
      const { g } = await startWithQuiz();
      g.guardianId = hero;
      g.loadStage(s, false, 0);
      g.quizLevel = lv;
      const boss = g.makeBoss(); boss.spawn = 0; g.enemies = [boss]; g.bossSpawned = true; g.gateOpen = true;
      g.player.x = boss.x - 110; g.player.facing = 1;
      let f = 0;
      for (; f < 60 * 300 && !boss.dead; f++) {
        g.player.invulnerable = 5; g.player.health = g.player.maxHealth;
        g.player.x = boss.x - 100; g.player.facing = 1;   // 보스를 계속 따라붙어 친다(최악=가장 빠른 처치)
        const t = g.playTime;
        if (f % 12 === 0) g.input.set('attack', 'key:J', true, t);
        if (f % 12 === 1) g.input.set('attack', 'key:J', false, t);
        if (g.hitstop > 0) { g.hitstop = Math.max(0, g.hitstop - 1 / 60); continue; }
        g.update(1 / 60);
      }
      assert.ok(boss.dead, 'boss down stage ' + s + ' lv ' + lv);
      times.push(f);
    }
    ratios.push(times[1] / times[0]);
  }
  console.log('boss kill time ratio (lv3 / lv0), lumi·mira·joy × stage 1-4:', ratios.map((r) => r.toFixed(2)).join(' '));
  for (const r of ratios) assert.ok(r >= 0.55, 'ratio ' + r);
});

test('respawning does not hand out the same ? item again; the boss arena has none', async () => {
  const { g, calls } = await startWithQuiz({ answer: { firstTry: true, correct: true } });
  touchBox(g, 0); touchBox(g, 1);
  assert.equal(calls.length, 2);
  g.loadStage(0, true, 0);
  assert.deepEqual(Array.from(g.quizBoxes, (b) => b.taken), [true, true, false]);
  g.bossSpawned = true;
  const box = g.quizBoxes[2];
  g.player.x = box.x; g.player.y = 610; g.collectQuizBoxes();
  assert.equal(box.taken, false);
  assert.equal(g.phase, 'playing');
});

test('hard mode uses the same rules; the one-try heal goes to hype (+12)', async () => {
  const { g, calls } = await startWithQuiz({ hard: true });
  assert.equal(g.hardMode, true);
  assert.equal(g.quizBoxes.length, 3);
  g.enemies = [];
  const hype = g.hype;
  touchBox(g, 0);
  assert.equal(g.phase, 'quiz');
  calls[0]({ firstTry: true, correct: true });
  assert.equal(g.quizLevel, 1);
  assert.equal(g.hype, Math.min(100, hype + 12));
  assert.match(g.announcement.title, /함성 \+12/);
});

test('a failed quiz hook resumes play without a reward; html wires GameQuiz scripts and the hook', () => {
  return startWithQuiz().then(({ g }) => {
    g.onQuiz = () => { throw new Error('boom'); };
    touchBox(g, 0);
    assert.equal(g.phase, 'playing');
    assert.equal(g.quizLevel, 0);
    assert.match(html, /<script src="\.\.\/assets\/study\/game-quiz\.js\?v=\d+"><\/script>/);
    assert.match(html, /game\.quizAvailable = \(\) => !!quizApi\(\);/);
    assert.match(html, /if \(this\.hardMode && this\.phase !== 'select'\) this\.drawHypeFx\(\)/);
    assert.doesNotMatch(html, /speechSynthesis/);
  });
});
