const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const mod = () => import('../src/game/mountedMoves.js');
const rider = (extra = {}) => ({ x: 1000, lane: 0, facing: 1, actionStarted: 0, actionDuration: 0, invulnerableUntil: 0, ...extra });
const foe = (x, lane = 0, extra = {}) => ({ x, lane, hp: 500, deadAt: 0, ...extra });

test('tap chain: thrust -> sweep -> thrust, and an expired window restarts at the thrust', async () => {
  const { nextMountedChainAction, peekMountedChainAction, MOUNTED_MOVES, MOUNTED_CHAIN_GRACE } = await mod();
  const p = rider();
  assert.equal(peekMountedChainAction(p, 0), 'mountedThrust');
  assert.equal(nextMountedChainAction(p, 0), 'mountedThrust');
  assert.equal(peekMountedChainAction(p, 500), 'mountedSweep');
  assert.equal(nextMountedChainAction(p, 500), 'mountedSweep');
  assert.equal(nextMountedChainAction(p, 1100), 'mountedThrust', 'third tap loops back');
  const late = 1100 + MOUNTED_MOVES.mountedThrust.duration + MOUNTED_CHAIN_GRACE + 1;
  assert.equal(nextMountedChainAction(p, late), 'mountedThrust', 'a late tap is a fresh chain, not the sweep');
  assert.equal(nextMountedChainAction(p, late + 300), 'mountedSweep');
});

test('timings: each move hits once at its own beat; charge and stomp are slower than the thrust', async () => {
  const { MOUNTED_MOVES, MOUNTED_CHARGE, mountedHitReady } = await mod();
  for (const [action, move] of Object.entries(MOUNTED_MOVES)) {
    const p = rider({ actionStarted: 1000 });
    assert.equal(mountedHitReady(action, p, 1000 + move.duration * move.hitAt - 1), false, action);
    assert.equal(mountedHitReady(action, p, 1000 + move.duration * move.hitAt), true, action);
    assert.ok(move.duration >= 400 && move.duration <= 800, action);
  }
  assert.ok(MOUNTED_MOVES.mountedThrust.duration < MOUNTED_MOVES.mountedSweep.duration);
  assert.ok(MOUNTED_MOVES.mountedSweep.duration < MOUNTED_MOVES.mountedStomp.duration);
  assert.ok(MOUNTED_CHARGE.cooldown >= 1500 && MOUNTED_CHARGE.cooldown <= 2000);
});

test('thrust is long and narrow, sweep reaches adjacent lanes, stomp hits all around the horse', async () => {
  const { mountedMoveTargets } = await mod();
  for (const facing of [1, -1]) {
    const p = rider({ facing });
    const far = foe(1000 + facing * 420), behind = foe(1000 - facing * 100), sideLane = foe(1000 + facing * 200, 140), dead = foe(1000 + facing * 100, 0, { deadAt: 5 });
    assert.deepEqual(mountedMoveTargets('mountedThrust', p, [far, behind, sideLane, dead]), [far]);
    assert.deepEqual(mountedMoveTargets('mountedSweep', p, [far, behind, sideLane, dead]), [behind, sideLane]);
    const leftNear = foe(1000 - 250, 60), rightNear = foe(1000 + 250, -60), tooFar = foe(1000 + 330);
    assert.deepEqual(mountedMoveTargets('mountedStomp', p, [leftNear, rightNear, tooFar]), [leftNear, rightNear]);
  }
});

test('knockback: thrust pushes forward, sweep flings into the next lane, stomp pushes away from the horse', async () => {
  const { mountedKnockback, MOUNTED_MOVES, MOUNTED_CHARGE } = await mod();
  const p = rider({ facing: -1 });
  assert.deepEqual(mountedKnockback('mountedThrust', p, foe(800)), { x: -MOUNTED_MOVES.mountedThrust.push, lane: 0 });
  const swept = mountedKnockback('mountedSweep', p, foe(900, 30));
  assert.equal(swept.x, -MOUNTED_MOVES.mountedSweep.push); assert.ok(swept.lane > 0, 'lane fling moves away from the rider lane');
  assert.ok(mountedKnockback('mountedStomp', p, foe(1200)).x > 0, 'enemy behind is stomped backwards, not pulled forward');
  assert.ok(mountedKnockback('mountedStomp', p, foe(800)).x < 0);
  const trampled = mountedKnockback('mountedCharge', p, foe(900, -20));
  assert.deepEqual(trampled, { x: -MOUNTED_CHARGE.push, lane: -MOUNTED_CHARGE.fling });
});

test('charge: fixed distance, brief invulnerability, cooldown scaled by growth', async () => {
  const { MOUNTED_CHARGE, startMountedCharge, mountedChargeStep, mountedChargeSpeed } = await mod();
  const p = rider({ actionStarted: 2000 });
  startMountedCharge(p, 2000, .9);
  assert.equal(p.dashReady, 2000 + MOUNTED_CHARGE.cooldown * .9);
  assert.equal(p.dashCooldownTotal, MOUNTED_CHARGE.cooldown * .9);
  assert.ok(p.invulnerableUntil >= 2000 + MOUNTED_CHARGE.duration, 'invulnerable for the whole gallop');
  assert.ok(p.invulnerableUntil <= 2000 + MOUNTED_CHARGE.duration + 200, 'but only briefly after it');
  let travelled = 0;
  for (let i = 0; i < 200; i++) { const dx = mountedChargeStep(p, 1 / 60); p.x += dx; travelled += dx; }
  assert.ok(Math.abs(travelled - MOUNTED_CHARGE.distance) < 1e-6, 'never overshoots the gallop distance');
  assert.ok(mountedChargeSpeed() > 1000, 'faster than any walk or dash');
  const q = rider({ facing: -1 }); startMountedCharge(q, 0);
  assert.ok(mountedChargeStep(q, .016) < 0, 'gallops toward facing');
});

test('charge tramples every enemy on the swept path exactly once, not other lanes', async () => {
  const { startMountedCharge, collectChargeHits, MOUNTED_CHARGE } = await mod();
  for (const facing of [1, -1]) {
    const p = rider({ facing, actionStarted: 0 });
    startMountedCharge(p, 0);
    const crowd = [foe(1000 + facing * 150), foe(1000 + facing * 260, 40), foe(1000 + facing * 380, -50)];
    const offLane = foe(1000 + facing * 200, MOUNTED_CHARGE.lane + 30), behind = foe(1000 - facing * 200);
    assert.equal(collectChargeHits(p, [...crowd, offLane, behind], 10).length, 0, 'startup frame');
    p.x += facing * 400;
    assert.deepEqual(collectChargeHits(p, [...crowd, offLane, behind], 200), crowd, 'skipped-over enemies still get hit');
    assert.equal(collectChargeHits(p, crowd, 260).length, 0, 'one hit per enemy per charge');
  }
});

test('mounted special/musou surge forward early, then finish in place', async () => {
  const { mountedSurgeStep, MOUNTED_SURGE } = await mod();
  const p = rider({ actionStarted: 0, actionDuration: 900 });
  let moved = 0;
  for (let t = 0; t < 900; t += 10) moved += mountedSurgeStep('special', p, t, .01);
  assert.ok(Math.abs(moved - MOUNTED_SURGE.special.distance) < 12, String(moved));
  assert.equal(mountedSurgeStep('special', p, 800, .016), 0);
  assert.equal(mountedSurgeStep('attack', p, 100, .016), 0);
  assert.ok(MOUNTED_SURGE.musou.distance > MOUNTED_SURGE.special.distance);
});

test('every riding hero has a mount kind and kid-facing labels; non-horse mounts keep their own names', async () => {
  const { MOUNT_KIND_BY_HERO, mountFlavor, mountedButtonLabels, canRide } = await mod();
  const source = fs.readFileSync(path.join(__dirname, '../src/game/sideScroller.js'), 'utf8');
  const art = source.slice(source.indexOf('const MOUNT_ART = {'), source.indexOf('};', source.indexOf('const MOUNT_ART = {')));
  const sprites = fs.readFileSync(path.join(__dirname, '../src/game/mountedSprites.js'), 'utf8');
  const riders = [...art.matchAll(/^\s+(\w+):/gm), ...sprites.matchAll(/^\s+(\w+): \{ horse:/gm)].map(m => m[1]);
  assert.ok(riders.length >= 14);
  for (const id of riders) assert.ok(canRide(id), id + ' rides but has no mount kind');
  assert.equal(MOUNT_KIND_BY_HERO.wukong, 'cloud'); assert.equal(MOUNT_KIND_BY_HERO.nezha, 'wheels');
  assert.equal(MOUNT_KIND_BY_HERO.lvbu, 'horse'); assert.equal(canRide('diaochan'), false);
  assert.equal(mountFlavor('cloud').charge, '근두운 돌격'); assert.equal(mountFlavor('wheels').charge, '풍화륜 돌격');
  const labels = mountedButtonLabels('horse', 'mountedSweep');
  assert.equal(labels.attack, '휩쓸기'); assert.equal(labels.icon, '🐎'); assert.equal(labels.dash, '돌격!'); assert.equal(labels.attackSub, '꾹 · 짓밟기'); assert.equal(labels.mount, '내리기');
  assert.equal(mountedButtonLabels('horse').attack, '찌르기'); assert.equal(mountedButtonLabels('cloud').icon, '☁');
});

test('battle code routes the mounted buttons to the mounted moveset and the module is precached', () => {
  const source = fs.readFileSync(path.join(__dirname, '../src/game/sideScroller.js'), 'utf8');
  assert.match(source, /input\.consume\('dash'\)\) beginAttack\(player\.mounted \? 'mountedCharge' : 'dash'/);
  assert.match(source, /input\.consumeHold\('attack'\)\) beginAttack\(player\.mounted \? 'mountedStomp' : 'heavy'/);
  assert.match(source, /if \(player\.mounted\) beginAttack\(nextMountedChainAction\(player, now\), now\)/);
  assert.match(source, /MOUNTED_SPEED_SCALE/);
  assert.match(source, /showToast\(hudRoot, '말 위 기술! 돌격으로 적진을 뚫어요'/);
  const locked = source.match(/const locked = \[([^\]]+)\]/)[1];
  for (const action of ['mountedThrust', 'mountedSweep', 'mountedStomp', 'mountedCharge']) assert.ok(locked.includes(action), action + ' locks movement');
  const sw = fs.readFileSync(path.join(__dirname, '../../sw.js'), 'utf8');
  assert.ok(sw.includes('"./sanguo/src/game/mountedMoves.js"'));
});
