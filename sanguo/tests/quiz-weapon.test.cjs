// ? 두루마리 무기 단계: 단계 계산·피해 상한·타이머 밀기·숙련 덤, 그리고 전투 코드 연결.
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const quiz = () => import('../src/game/quizWeapon.js');

test('answers climb 0..4 tiers in half steps and never go down', async () => {
  const { addQuizAnswer, quizTier, QUIZ_MAX_STEPS } = await quiz();
  let r = addQuizAnswer(0, true); assert.deepEqual([r.steps, r.before, r.after, r.promoted], [2, 0, 1, true]);
  r = addQuizAnswer(r.steps, false); assert.deepEqual([r.steps, r.after, r.promoted, r.half], [3, 1, false, true]);
  r = addQuizAnswer(r.steps, false); assert.deepEqual([r.steps, r.after, r.promoted], [4, 2, true]);
  let steps = r.steps; for (let i = 0; i < 6; i++) steps = addQuizAnswer(steps, true).steps;
  assert.equal(steps, QUIZ_MAX_STEPS); assert.equal(quizTier(steps), 4);
  assert.equal(addQuizAnswer(steps, true).maxed, true);
});

test('tier damage: +20% per tier (half steps in between), >= 50% boss time, and every step still counts with the sword drop', async () => {
  const { quizDamage, quizTierInfo, quizPowerPercent, QUIZ_DAMAGE_CAP, QUIZ_BOOST_MIN_GAIN } = await quiz();
  assert.deepEqual([0, 1, 2, 3, 4, 5, 6, 7, 8].map(quizPowerPercent), [0, 10, 20, 30, 40, 50, 60, 70, 80]);
  assert.deepEqual([0, 2, 4, 6, 8].map((s) => quizTierInfo(s).reach), [1, 1, 1.05, 1.10, 1.15]);
  assert.equal(quizTierInfo(1).palette, quizTierInfo(2).palette, 'half step already shows the next colour');
  for (const base of [15, 22, 28, 40, 54, 82, 110]) {
    assert.equal(quizDamage(base, 0, 0), base);
    assert.equal(quizDamage(base, 18, 0), base + 18, 'tier 0 keeps the old formula');
    let prevPlain = base, prevBoost = base + 18;
    for (let steps = 1; steps <= 8; steps++) {
      const plain = quizDamage(base, 0, steps), boosted = quizDamage(base, 18, steps);
      assert.ok(plain > prevPlain && boosted > prevBoost, 'each half step adds damage ' + base + '@' + steps);
      assert.ok(base / plain >= .5, 'kill time >= 50%');
      assert.ok(boosted <= Math.max(base * QUIZ_DAMAGE_CAP, (base + 18) * QUIZ_BOOST_MIN_GAIN) + 1e-9, 'stack cap');
      prevPlain = plain; prevBoost = boosted;
    }
  }
});

test('reward text tells everything gained', async () => {
  const { quizRewardBanner, quizPreviewHint, addQuizAnswer, quizReward } = await quiz();
  const b = quizRewardBanner('청룡언월도', addQuizAnswer(2, true), true);
  assert.equal(b.title, '청룡언월도 2단계!');
  assert.match(b.sub, /공격력 \+40% · 사거리 \+5% · 무쌍 \+50 · 체력 \+15%/);
  const h = quizRewardBanner('청룡언월도', addQuizAnswer(2, false), false);
  assert.match(h.title, /1\.5단계/); assert.match(h.sub, /공격력 \+30%.*무쌍 \+25 · 체력 \+8%/);
  assert.match(quizPreviewHint('청룡언월도', 0), /한 번에: 청룡언월도 공격력 \+20%.*고쳐서: \+10%/);
  assert.deepEqual([quizReward(true).heal, quizReward(false).heal], [.15, .08]);
});

test('shiftBattleTimers moves every absolute timer by the pause and leaves unset ones alone', async () => {
  const { shiftBattleTimers, PLAYER_TIMER_FIELDS, ENEMY_TIMER_FIELDS } = await quiz();
  const player = Object.fromEntries(PLAYER_TIMER_FIELDS.map((k, i) => [k, 1000 + i]));
  player.counterReady = 0; player.familyTechnique = { started: player.actionStarted };
  player.dashHitLog = new Map([[{}, { count: 1, at: 1200 }], [{}, { count: 0, at: -Infinity }]]);
  const enemy = Object.fromEntries(ENEMY_TIMER_FIELDS.map((k, i) => [k, 2000 + i])); enemy.deadAt = 0;
  const arrows = [{ trailAt: 3000 }], shockwaves = [{ trailAt: 0 }];
  const n = shiftBattleTimers({ player, enemies: [enemy], arrows, enemyArrows: [], shockwaves }, 5000);
  for (const [i, k] of PLAYER_TIMER_FIELDS.entries()) assert.equal(player[k], k === 'counterReady' ? 0 : 6000 + i, k);
  assert.equal(player.familyTechnique.started, player.actionStarted);
  assert.deepEqual([...player.dashHitLog.values()].map((h) => h.at), [6200, -Infinity]);
  for (const [i, k] of ENEMY_TIMER_FIELDS.entries()) assert.equal(enemy[k], k === 'deadAt' ? 0 : 7000 + i, k);
  assert.equal(arrows[0].trailAt, 8000); assert.equal(shockwaves[0].trailAt, 0);
  assert.ok(n > 0); assert.equal(shiftBattleTimers({ player }, 0), 0);
});

test('every now-based field the battle code writes is covered by the pause shift', async () => {
  const { PLAYER_TIMER_FIELDS, ENEMY_TIMER_FIELDS } = await quiz();
  const dir = path.join(__dirname, '../src/game');
  const src = ['sideScroller.js', 'dashSkills.js', 'mountedMoves.js', 'familyCombat.js'].map((f) => fs.readFileSync(path.join(dir, f), 'utf8')).join('\n');
  const found = (who) => new Set([...src.matchAll(new RegExp('\\b' + who + '\\.([A-Za-z]+(?:Until|At|Ready|Started|Boost))\\b', 'g'))].map((m) => m[1]));
  for (const key of found('player')) assert.ok(PLAYER_TIMER_FIELDS.includes(key), 'player.' + key);
  for (const key of found('enemy')) assert.ok(ENEMY_TIMER_FIELDS.includes(key), 'enemy.' + key);
  const battle = fs.readFileSync(path.join(dir, 'sideScroller.js'), 'utf8');
  for (const name of ['hitstopUntil', 'slowUntil', 'bossIntroUntil', 'ambientAt', 'rescaleAfter']) assert.ok(battle.includes('if (' + name + ' > 0) { ' + name + ' += delta;'), name);
});

test('battle wiring: scrolls only with GameQuiz outside automation, quiet pause, harness marker intact', () => {
  const battle = fs.readFileSync(path.join(__dirname, '../src/game/sideScroller.js'), 'utf8');
  assert.equal(battle.split('  function loop(now) {').length, 2);
  assert.match(battle, /typeof globalThis\.GameQuiz !== 'undefined'[^\n]*!globalThis\.navigator\?\.webdriver/);
  assert.match(battle, /hudRoot\.classList\.toggle\('paused', tabPaused && !quizPaused\)/);
  assert.match(battle, /GameQuiz\.close\(\)/);
  assert.match(battle, /quizFirstTries \}\);/);
  const html = fs.readFileSync(path.join(__dirname, '../index.html'), 'utf8');
  const order = ['../math/curriculum.js', '../math/learning.js', '../math/store.js', '../assets/study/math-bridge.js', '../assets/study/game-quiz.js', './src/main.js'].map((s) => html.indexOf(s));
  assert.ok(order.every((v, i) => v > 0 && (i === 0 || v > order[i - 1])), 'script order');
});

test('first-try solves add a small capped weapon mastery bonus to the saved progress', async () => {
  const store = new Map();
  globalThis.localStorage = { getItem: (k) => (store.has(k) ? store.get(k) : null), setItem: (k, v) => store.set(k, String(v)), removeItem: (k) => store.delete(k) };
  const { awardBattleProgress, QUIZ_MASTERY_PER_SOLVE, QUIZ_MASTERY_MAX_SOLVES } = await import('../src/game/progression.js');
  const plain = awardBattleProgress('guanyu', { win: true, ko: 20, stageKey: 'yellow' });
  store.clear();
  const bonus = awardBattleProgress('guanyu', { win: true, ko: 20, stageKey: 'yellow', quizFirstTries: 3 });
  assert.equal(plain.quizMastery, 0);
  assert.equal(bonus.quizMastery, 3 * QUIZ_MASTERY_PER_SOLVE);
  assert.equal(bonus.mastery, plain.mastery + 3 * QUIZ_MASTERY_PER_SOLVE);
  assert.equal(bonus.xp, plain.xp, 'hero xp untouched');
  store.clear();
  assert.equal(awardBattleProgress('guanyu', { win: false, quizFirstTries: 99 }).quizMastery, QUIZ_MASTERY_MAX_SOLVES * QUIZ_MASTERY_PER_SOLVE);
  store.clear();
  assert.equal(awardBattleProgress('guanyu', { win: true, quizFirstTries: 'x' }).quizMastery, 0);
  const saved = JSON.parse(store.get('vesper-sgz:progression:v1'));
  assert.deepEqual(Object.keys(saved.guanyu).sort(), ['battles', 'bestKo', 'clears', 'lossStreak', 'mastery', 'wins', 'xp'], 'save format unchanged');
  delete globalThis.localStorage;
});
