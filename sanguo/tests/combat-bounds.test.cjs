const test = require('node:test');
const assert = require('node:assert/strict');
const boundsModule = () => import('../src/game/combatBounds.js');
const fs = require('node:fs'), path = require('node:path');

test('both unlocked heroes and their new runtime assets are shipped and cached', () => {
  const root=path.resolve(__dirname,'../..'), sw=fs.readFileSync(path.join(root,'sw.js'),'utf8');
  for(const name of ['machao-painted-sheet-v1.png','huangzhong-painted-sheet-v1.png','huangzhong-bow-painted-sheet-v1.png']){
    const relative='sanguo/art/side-scroller/'+name;
    assert.ok(fs.statSync(path.join(root,relative)).size>10000);
    assert.ok(sw.includes('"./'+relative+'"'));
  }
  assert.ok(sw.includes('"./sanguo/src/game/combatBounds.js"'));
});

test('player and enemies share locked and world-end bounds', async () => {
  const {combatBounds, clampCombatX, constrainEnemy} = await boundsModule();
  for (const gate of [1410, 3000, 7560, 9000]) {
    const b = combatBounds(7800, gate);
    for (const x of [-500, 170, gate, 18000]) {
      const e = {x, lane: 400};
      constrainEnemy(e, b);
      assert.ok(e.x >= b.left && e.x <= b.right);
      assert.equal(e.lane, 72);
      assert.ok(Math.abs(e.x - clampCombatX(x, b)) <= 24);
    }
  }
  assert.deepEqual(combatBounds(7800, 1410, false), {left:170,right:7560});
});

test('all wave formations stay reachable at both ends and spread instead of stacking', async () => {
  const {combatBounds, waveSpawnX} = await boundsModule();
  for (const player of [170,330,1410,6480,7550,7560]) {
    const b = combatBounds(7800, player + 1080);
    for (const count of [2,4,5,6,7,8]) for (const side of [-1,1]) {
      const xs = [];
      for (let i=0;i<count;i++) for (const jitter of [0,.5,.999]) {
        const x = waveSpawnX(player,side,i,count,jitter,b);
        assert.ok(x >= b.left + 24 && x <= b.right - 24, JSON.stringify({player,count,side,x}));
        xs.push(x);
      }
      if (player===330 && side===1) assert.equal(new Set(xs).size,xs.length);
    }
  }
});

test('repeated knockback and lane separation cannot strand surviving enemies', async () => {
  const {combatBounds, constrainEnemy} = await boundsModule(), b=combatBounds(7800,1410);
  for (const side of [-1,1]) {
    const e={x:side>0?b.right:b.left,lane:0,hp:500};
    for (let i=0;i<100;i++) {
      e.x+=side*210;e.lane+=side*18;constrainEnemy(e,b);
      assert.ok(e.x>=b.left&&e.x<=b.right);
      assert.ok(e.lane>=-92&&e.lane<=72);
      assert.equal(e.hp,500,'bounds must not kill units to advance a wave');
    }
  }
});
