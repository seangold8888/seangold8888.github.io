const test = require('node:test');
const assert = require('node:assert/strict');
const combat = () => import('../src/game/familyCombat.js');

test('four family techniques drain crossed beats exactly once and preserve damage budget', async () => {
  const { startFamilyTechnique, familyTechniquePulses, familyPulseDamage } = await combat();
  for (const id of ['taeo', 'jaei', 'yunchan', 'yungeon']) for (const action of ['special', 'musou']) {
    const state = startFamilyTechnique(id, action, 1000);
    assert.deepEqual(familyTechniquePulses(state, 1001), []);
    const pulses = familyTechniquePulses(state, 3000); // low FPS / hitstop crossing all beats
    assert.equal(pulses.length, id === 'jaei' ? 2 : 3);
    assert.equal(pulses.filter(p => p.final).length, 1);
    assert.equal(pulses.reduce((sum, p) => sum + familyPulseDamage(p, state.budget), 0), action === 'musou' ? 110 : 82);
    assert.deepEqual(familyTechniquePulses(state, 4000), []);
  }
  assert.equal(startFamilyTechnique('guanyu', 'special', 0), null);
  assert.equal(startFamilyTechnique('taeo', 'attack', 0), null);
});

test('kicks face forward, bubble waves surround, all ignore dead/grabbed/out-of-lane targets', async () => {
  const { startFamilyTechnique, familyTechniquePulses, familyTechniqueTargets } = await combat();
  for (const facing of [-1, 1]) {
    const player = { x: 500, lane: 0, facing };
    const front = { x: 500 + 100 * facing, lane: 0, hp: 100 };
    const behind = { x: 500 - 100 * facing, lane: 0, hp: 100 };
    const dead = { ...front, deadAt: 1 }, grabbed = { ...front, grabbed: true };
    const outside = { ...front, lane: 200 }, far = { ...front, x: 1600 };
    const enemies = [front, behind, dead, grabbed, outside, far];
    const kick = familyTechniquePulses(startFamilyTechnique('taeo', 'special', 0), 300)[0];
    const bubble = familyTechniquePulses(startFamilyTechnique('jaei', 'special', 0), 300)[0];
    assert.deepEqual(familyTechniqueTargets(kick, player, enemies), [front]);
    assert.deepEqual(familyTechniqueTargets(bubble, player, enemies), [front, behind]);
  }
});

test('fireflies steer toward moving target with bounded velocity and release a passed/dead target', async () => {
  const { steerFamilyProjectile } = await combat();
  for (const facing of [-1, 1]) {
    const target = { x: 500 + 400 * facing, lane: 70, hp: 100 };
    const arrow = { x: 500, vx: 1020 * facing, lane: 0, height: 130, laneV: 0, vz: 0, homingTarget: target };
    steerFamilyProjectile(arrow, .016, 200);
    assert.ok(arrow.laneV > 0 && arrow.laneV <= 380);
    assert.ok(Number.isFinite(arrow.vz) && Math.abs(arrow.vz) <= 600);
    target.x = 500 - 20 * facing;
    steerFamilyProjectile(arrow, .016, 200);
    assert.equal(arrow.homingTarget, null);
    arrow.homingTarget = { ...target, deadAt: 1 };
    const before = arrow.laneV;
    steerFamilyProjectile(arrow, .016, 200);
    assert.equal(arrow.laneV, before);
  }
});
