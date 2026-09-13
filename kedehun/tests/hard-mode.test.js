'use strict';
// 케데헌 「혼문 무대」 검사 — HARD-MODES-SPEC.md H2.
// 1) 일반 모드 동일성: 이전 커밋의 index.html·combat-v2.js 와 현재 파일로 캠페인 전체를
//    같은 난수·같은 입력으로 돌려 30프레임마다 전투 상태가 모두 같아야 한다.
// 2) 혼문 무대: 함성 연성 상한·회복 대기, 간격별 구조 피격 수, 혼문 파열(점프 불가·대시 관통),
//    공격 선택 주기, 강화 수치, 해금·기록.
// 실행: node --test kedehun/tests/hard-mode.test.js
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const { execFileSync } = require('node:child_process');

const gameRoot = path.resolve(__dirname, '..');
const siteRoot = path.resolve(gameRoot, '..');
const current = {
  html: fs.readFileSync(path.join(gameRoot, 'index.html'), 'utf8').replace(/\r/g, ''),
  combat: fs.readFileSync(path.join(gameRoot, 'combat-v2.js'), 'utf8'),
};
function gitShow(file) {
  try { return execFileSync('git', ['show', 'HEAD:' + file], { cwd: siteRoot, encoding: 'utf8', maxBuffer: 1 << 26 }).replace(/\r/g, ''); }
  catch { return null; }
}
const baseline = process.env.KEDEHUN_BASELINE_HTML
  ? { html: fs.readFileSync(process.env.KEDEHUN_BASELINE_HTML, 'utf8').replace(/\r/g, ''), combat: fs.readFileSync(process.env.KEDEHUN_BASELINE_COMBAT, 'utf8') }
  : { html: gitShow('kedehun/index.html'), combat: gitShow('kedehun/combat-v2.js') };

function build(source, storage = new Map()) {
  const { html, combat } = source;
  const slice = (from, to) => { const a = html.indexOf(from), b = html.indexOf(to, a); assert.ok(a >= 0 && b > a, from); return html.slice(a, b); };
  const context = vm.createContext({
    console, setTimeout, clearTimeout, Promise,
    localStorage: { getItem: (k) => (storage.has(k) ? storage.get(k) : null), setItem: (k, v) => storage.set(k, String(v)), removeItem: (k) => storage.delete(k) },
    window: { matchMedia: () => ({ matches: true }), setInterval: () => 0 },
    performance: { now: () => 0 },
    requestAnimationFrame: () => 1, cancelAnimationFrame() {},
  });
  vm.runInContext(combat, context);
  vm.runInContext('let seed = 20260913; Math.random = () => { seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0; return seed / 4294967296; };', context);
  const guardians = slice('const GUARDIANS = [', '\n];') + '\n];';
  const core = slice('const STAGES = [', 'class AudioEngine {');
  const game = slice('class Game {', '/* Rendering');
  vm.runInContext(`
    const COMBAT = KedehunCombat;
    var characterArtReadyForPlay = true;
    ${guardians}
    ${core}
    class AudioEngine { constructor() { this.muted = false; } async unlock() {} play() {} toggle() {} dispose() {} }
    class Music { constructor() {} start() {} stop() {} setBoss() {} duck() {} }
    ${game}
    globalThis.Engine = Game;
    globalThis.STAGES_REF = STAGES;
    globalThis.HYPE_REF = typeof HYPE === 'undefined' ? null : HYPE;
    globalThis.loadHardRecordRef = typeof loadHardRecord === 'undefined' ? null : loadHardRecord;
  `, context);
  const canvas = { getContext: () => ({}), getBoundingClientRect: () => ({ width: 1180, height: 720 }), width: 0, height: 0 };
  return { context, storage, make: () => new context.Engine(canvas, () => {}) };
}

// 실제 루프처럼 멈춤(hitstop)을 존중하며 한 프레임 진행
function step(g) {
  const dt = 1 / 60;
  g.ambient += dt;
  if (g.phase !== 'playing') return;
  if (g.hitstop > 0) { g.hitstop = Math.max(0, g.hitstop - dt); return; }
  g.update(dt);
}

async function campaign(source, hard = false) {
  const storage = new Map();
  if (hard) storage.set('kedehun-hard-v1', JSON.stringify({ normalStage1: true }));
  const { make } = build(source, storage);
  const g = make();
  await g.start('lumi', hard);
  g.finishStory();
  const samples = [];
  for (let f = 0; f < 60 * 240; f++) {
    if (g.phase === 'story') g.finishStory();
    if (g.phase === 'stageClear') { g.nextStage(); g.finishStory(); }
    if (g.phase === 'victory') break;
    const t = g.playTime;
    g.input.set('right', 'key:D', f % 400 < 340, t);
    if (f % 12 === 0) g.input.set('attack', 'key:J', true, t);
    if (f % 12 === 1) g.input.set('attack', 'key:J', false, t);
    if (f % 90 === 5) { g.input.set('dash', 'key:K', true, t); }
    if (f % 90 === 6) { g.input.set('dash', 'key:K', false, t); }
    if (f % 150 === 20) { g.input.set('jump', 'key:W', true, t); }
    if (f % 150 === 32) { g.input.set('jump', 'key:W', false, t); }
    if (f % 30 === 0 && g.player.energy >= 100) { g.input.set('ultimate', 'key:C', true, t); g.input.set('ultimate', 'key:C', false, t); }
    step(g);
    if (f % 30 === 0) {
      const p = g.player;
      samples.push(JSON.stringify([g.phase, g.stageIndex, Math.round(p.x * 10), Math.round(p.y * 10), p.health, Math.round(p.energy), g.score, g.combo, g.bossSpawned,
        g.enemies.map((e) => [e.id, e.kind, Math.round(e.x), Math.round(e.health), e.attackType]), g.projectiles.length]));
    }
  }
  return { g, samples };
}

test('normal mode plays the whole campaign frame-identically to the previous commit', { skip: !baseline.html && 'no git baseline' }, async () => {
  const before = await campaign(baseline);
  const after = await campaign(current);
  assert.ok(before.samples.length > 100);
  const diff = before.samples.findIndex((s, i) => s !== after.samples[i]);
  assert.equal(diff, -1, 'normal mode diverged at sample ' + diff + '\n' + before.samples[diff] + '\n' + after.samples[diff]);
  assert.equal(before.samples.length, after.samples.length);
});

test('hard mode needs a normal stage 1 clear; a best record or corrupt data is handled', async () => {
  const locked = build(current);
  const g = locked.make();
  await g.start('lumi', true);
  assert.equal(g.hardMode, false, 'locked device starts normal');

  const legacy = build(current, new Map([['starlight-rescue-dx-best', JSON.stringify({ score: 3000 })]]));
  const record = legacy.context.loadHardRecordRef();
  assert.equal(record.normalStage1, true);
  assert.equal(record.normalWon, true);

  const broken = build(current, new Map([['kedehun-hard-v1', '{broken']]));
  assert.equal(broken.context.loadHardRecordRef().normalStage1, false);
  const bogus = build(current, new Map([['kedehun-hard-v1', JSON.stringify({ normalStage1: false, hardWon: true, hardBest: 9999 })]]));
  const r = bogus.context.loadHardRecordRef();
  assert.deepEqual([r.hardWon, r.hardBest], [false, 0], 'hard records need the normal clear');

  const open = build(current, new Map([['kedehun-hard-v1', JSON.stringify({ normalStage1: true })]]));
  const h = open.make();
  await h.start('lumi', true);
  assert.equal(h.hardMode, true);
  assert.equal(h.hype, 55);
});

async function hardGame() {
  const env = build(current, new Map([['kedehun-hard-v1', JSON.stringify({ normalStage1: true })]]));
  const g = env.make();
  await g.start('lumi', true);
  g.finishStory();
  return { g, env };
}

test('hype recovers only to the soft cap, waits after a hit, and rewards shrink near the top', async () => {
  const { g } = await hardGame();
  g.hype = 40; g.sinceHit = Infinity; g.updateHype(10); assert.equal(g.hype, 55);
  g.hype = 80; g.updateHype(10); assert.equal(g.hype, 80);
  g.hype = 30; g.sinceHit = 0; g.updateHype(2.9); assert.equal(g.hype, 30, 'no recovery inside the 3s wait');
  g.hype = 55; g.rewardHype(6); assert.equal(Math.round(g.hype * 10) / 10, 61);
  g.hype = 95; g.rewardHype(6); assert.ok(g.hype - 95 < 1, 'near the top a kill barely helps');
});

test('rescue arrives after the same hit counts as Hogwarts: 3 back to back, never easier than normal at 8s', async () => {
  async function hitsToRescue(interval) {
    const { g } = await hardGame();
    g.enemies = []; g.projectiles = [];
    let n = 0;
    for (let f = 1; f <= 60 * 150; f++) {
      step(g);
      if (f % Math.round(interval * 60) === 0) {
        g.player.invulnerable = 0; n++;
        g.hurtPlayer(12, 1);
        if (g.hardStats.rescues) return n;
      }
    }
    return null;
  }
  assert.equal(await hitsToRescue(1.2), 3);
  assert.ok((await hitsToRescue(6)) <= 4);
  const at8 = await hitsToRescue(8);
  assert.ok(at8 !== null && at8 <= 5, 'a hit every 8s rescues by the fifth: ' + at8);
  assert.equal(await hitsToRescue(15), null, 'a few spread-out mistakes never force a rescue');
});

test('honmoon rupture: first is a harmless demo, jumping cannot dodge it, a dash through it can', async () => {
  const { g } = await hardGame();
  const run = (setup) => {
    g.projectiles = []; g.player.invulnerable = 0; g.player.dead = false; g.player.dash = 0;
    g.player.x = 900; g.player.y = 610; g.player.grounded = true;
    const e = g.makeEnemy('saja', 1300, { name: '베이비' }); e.spawn = 0; g.enemies = [e];
    g.fireRupture(e);
    const before = g.hype;
    for (let i = 0; i < 90; i++) { setup(g); g.updateProjectiles(1 / 60); }
    return { lost: Math.round((before - g.hype) * 10) / 10, e };
  };
  assert.equal(run(() => {}).lost, 0, 'demo rupture is harmless');
  g.hype = 55; assert.equal(run(() => {}).lost, 22, 'standing still is hit');
  g.hype = 55; assert.equal(run((q) => { q.player.y = 610 - 320; q.player.grounded = false; }).lost, 22, 'a high jump is still hit');
  g.hype = 55;
  const dashed = run((q) => { q.player.dash = 0.16; });
  assert.ok(dashed.lost < 0, 'dashing through gains hype');
  assert.ok(dashed.e.stun >= 1.2, 'the caster is stunned after a dash-through');
  assert.equal(g.hardStats.dodges, 1);
});

test('rupture is every third Saja attack and every fourth boss attack in hard, never in normal', async () => {
  const { g } = await hardGame();
  const e = g.makeEnemy('saja', 500, { name: '베이비' });
  assert.deepEqual([0, 0, 0, 0, 0, 0].map((t) => g.pickHardAttack(e, t)), [0, 0, 4, 0, 0, 4]);
  const boss = g.makeBoss(); const seq = [];
  for (let i = 0; i < 8; i++) { boss.attackType = g.pickBossAttack(boss); seq.push(boss.attackType); }
  assert.deepEqual(seq, [1, 2, 0, 4, 0, 1, 2, 4]);

  const normal = build(current).make();
  const e2 = normal.makeEnemy('saja', 500, { name: '베이비' });
  assert.deepEqual([0, 1, 2].map((t) => normal.pickHardAttack(e2, t)), [0, 1, 2]);
  const b2 = normal.makeBoss(); const seq2 = [];
  for (let i = 0; i < 6; i++) { b2.attackType = normal.pickBossAttack(b2); seq2.push(b2.attackType); }
  assert.deepEqual(seq2, [1, 2, 0, 1, 2, 0]);
});

test('hard numbers: tougher bosses, shorter protection, one extra shade; normal untouched', async () => {
  const { g } = await hardGame();
  const stage0 = g.enemies.length;
  assert.equal(g.makeBoss().health, 345);
  g.stageIndex = 1; assert.equal(g.makeBoss().health, 480); g.stageIndex = 0;
  g.player.invulnerable = 0; g.hurtPlayer(10, 1); assert.equal(g.player.invulnerable, 1.1);
  assert.equal(g.player.health, g.player.maxHealth, 'hard hits drain hype, not health');

  const n = build(current).make();
  n.loadStage(0, false, 0);
  assert.equal(stage0, n.enemies.length + 1);
  assert.equal(n.makeBoss().health, 285);
  n.player.invulnerable = 0; n.hurtPlayer(18, 1); assert.equal(n.player.invulnerable, 1.6); assert.equal(n.player.health, 108);
});

test('clear records: normal stage 1 unlocks hard, a hard win never overwrites the normal best', async () => {
  const env = build(current);
  const n = env.make();
  n.recordClear(0);
  assert.equal(JSON.parse(env.storage.get('kedehun-hard-v1')).normalStage1, true);

  const { g, env: hardEnv } = await hardGame();
  hardEnv.storage.set('starlight-rescue-dx-best', JSON.stringify({ score: 100 }));
  g.score = 5000; g.recordClear(1);
  const saved = JSON.parse(hardEnv.storage.get('kedehun-hard-v1'));
  assert.deepEqual([saved.hardWon, saved.hardBest], [true, 5000]);
  assert.equal(JSON.parse(hardEnv.storage.get('starlight-rescue-dx-best')).score, 100);
  assert.equal(g.newRecord, true);
});

test('the renderer and HUD know the hard mode, and the new combat script is cached', () => {
  const html = current.html;
  assert.match(html, /<script src="combat-v2\.js\?v=2"><\/script>/);
  assert.match(html, /id="hardBtn" hidden/);
  assert.match(html, /if \(this\.hardMode && this\.phase !== 'select'\) this\.drawHypeFx\(\)/);
  assert.match(current.combat, /type === 4 \? '혼문 파열 · 대시로 뚫기'/);
  const sw = require(path.join(siteRoot, 'sw.js'));
  assert.ok(sw.OPTIONAL_SHELL.includes('./kedehun/combat-v2.js?v=2'));
  assert.ok(!sw.OPTIONAL_SHELL.includes('./kedehun/combat-v2.js?v=1'));
});
