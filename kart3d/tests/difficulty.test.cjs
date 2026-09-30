const { test, before } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
let D;
before(async () => {
  const source = fs.readFileSync(path.join(__dirname, '../src/difficulty.js'), 'utf8');
  D = await import('data:text/javascript;base64,' + Buffer.from(source).toString('base64'));
});
const kart = (dist = 0) => ({ track: { roadHalf: 50, nearest: () => ({ dist }) } });
test('ordinary races are easy; rivals and record attempts remain unassisted', () => {
  for (const id of ['gp', 'battle', 'speed']) assert.equal(D.isEasyRace({ id }), true);
  assert.equal(D.isEasyRace({ id: 'rival', rival: true }), false);
  assert.equal(D.isEasyRace({ id: 'time' }), false);
  assert.equal(D.isEasyRace(null), false);
});
test('slower opponents retain a speed disadvantage even against the slowest kart', () => {
  assert.ok(140 * 1.05 * D.EASY_AI_SPEED < 110 * D.EASY_PLAYER_SPEED);
  assert.equal(D.EASY_ITEM_DELAY, 4);
});
test('no steering follows the course without starting an accidental drift', () => {
  assert.deepEqual(D.assistInput(kart(), { steer: 0, drift: true, jump: true, use: true }, { steer: .6 }),
    { steer: .6, drift: false, jump: true, use: true });
});
test('manual lane choice stays effective at the center of a straight', () => {
  assert.equal(D.assistInput(kart(), { steer: -1, drift: true }, { steer: 0 }).steer, -.85);
  assert.equal(D.assistInput(kart(), { steer: 1, drift: true }, { steer: 0 }).drift, true);
});
test('near a guardrail the guide wins against steering off-road', () => {
  const result = D.assistInput(kart(40), { steer: 1, drift: true }, { steer: -1 });
  assert.equal(result.steer, -.8);
  assert.equal(result.drift, false);
});
test('all assisted steering stays bounded', () => {
  for (const dist of [0, 40]) for (const steer of [-1, 0, 1]) for (const guide of [-1, 1]) {
    assert.ok(Math.abs(D.assistInput(kart(dist), { steer }, { steer: guide }).steer) <= 1);
  }
});
test('a hit loses at most 18 percent speed and one coin without a disorienting spin', () => {
  const k = { speed: 45, coins: 8, spin: 1, slip: 2, shield: 0 };
  assert.equal(D.softenHit(k, { speed: 100, coins: 10 }), true);
  assert.deepEqual(k, { speed: 82, coins: 9, spin: 0, slip: 0, shield: 1.8 });
});
test('a hit never shortens an existing shield or removes newly collected coins', () => {
  const k = { speed: 45, coins: 12, spin: 1, shield: 8 };
  D.softenHit(k, { speed: 100, coins: 10 });
  assert.equal(k.shield, 8); assert.equal(k.coins, 12);
});
test('normal acceleration and boost are not mistaken for damage', () => {
  const k = { speed: 120, coins: 11, spin: 0, slip: 0, shield: 0 };
  assert.equal(D.softenHit(k, { speed: 100, coins: 10 }), false);
  assert.equal(k.shield, 0);
});
test('finish deceleration is not rescued by the damage helper', () => {
  const k = { finished: true, speed: 0, coins: 10, spin: 0 };
  assert.equal(D.softenHit(k, { speed: 100, coins: 10 }), false);
  assert.equal(k.speed, 0);
});
