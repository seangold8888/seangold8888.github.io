const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const path = require('node:path');
const sandbox = { window: {}, document: { addEventListener() {} } };
vm.runInNewContext(fs.readFileSync(path.join(__dirname, '../js/app.js'), 'utf8'), sandbox);
const motion = sandbox.window.CardBattleFx.cardMotionFrames;
test('melee contact and hold match the sound clock in both board orientations', () => {
  const plan = {kind:'strike', impactAtMs:275, totalMs:720, hitStopMs:44};
  for (const [x,y] of [[520,0],[-520,0],[0,460],[0,-460]]) {
    const frames = motion(plan,x,y,200);
    assert.equal(frames[2].offset * 720,275);
    assert.ok(Math.abs((frames[3].offset-frames[2].offset)*720-44)<.001);
    assert.equal(frames[2].transform,frames[3].transform);
    const xy=frames[2].transform.match(/translate3d\(([-.\d]+)px,([-.\d]+)px/);
    assert.ok(Number(xy[1])*x+Number(xy[2])*y>0);
    assert.ok(Math.hypot(Number(xy[1]),Number(xy[2]))>250);
    assert.equal(frames[0].transform,frames.at(-1).transform);
    assert.ok(frames.every((f,i)=>i===0||f.offset>=frames[i-1].offset));
  }
});
test('ranged casting stays near its starting position and degenerate geometry is finite', () => {
  for(const [x,y] of [[520,0],[0,0]]) {
    const frames=motion({kind:'projectile',impactAtMs:640,totalMs:840,hitStopMs:36},x,y,180);
    assert.ok(!JSON.stringify(frames).includes('NaN'));
    const xy=frames[2].transform.match(/translate3d\(([-.\d]+)px,([-.\d]+)px/);
    assert.ok(Math.hypot(Number(xy[1]),Number(xy[2]))<=16);
  }
});
