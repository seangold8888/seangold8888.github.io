const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const scales = () => import('../src/game/heroRenderScale.js');

test('13 recently painted heroes have deliberate visual-only scale corrections', async () => {
  const { HERO_RENDER_SCALES, heroRenderScale } = await scales();
  assert.deepEqual(Object.keys(HERO_RENDER_SCALES).sort(), [
    'erlangshen', 'ganning', 'honghaier', 'huangzhong', 'luxun', 'machao', 'nezha',
    'simayi', 'sunquan', 'taishici', 'xiahoudun', 'xuchu', 'zhangliao',
  ]);
  for (const [heroId, scale] of Object.entries(HERO_RENDER_SCALES)) {
    assert.ok(scale >= .80 && scale <= .96, `${heroId}: bounded scale`);
  }
  // Atlas-visible heights differ, so compare the calibrated on-screen result,
  // not the raw multiplier by itself.
  assert.ok(195 * heroRenderScale('nezha') < 194.6 * heroRenderScale('xuchu'), 'child shorter than heavy general');
  assert.ok(196.7 * heroRenderScale('honghaier') < 223.4 * heroRenderScale('erlangshen'), 'child shorter than celestial general');
  assert.equal(heroRenderScale('guanyu'), 1, 'existing reference art remains unchanged');
});

test('standing, ranged and afterimage rendering share one corrected height and anchors', () => {
  const root = path.resolve(__dirname, '../..');
  const source = fs.readFileSync(path.join(root, 'sanguo/src/game/sideScroller.js'), 'utf8');
  const sw = fs.readFileSync(path.join(root, 'sw.js'), 'utf8');
  assert.match(source, /const heroVisualScale = heroRenderScale\(heroId\)/);
  assert.match(source, /function standingHeroHeight\(depthScale = 1\)/);
  assert.equal((source.match(/standingHeroHeight\(/g) || []).length, 4);
  assert.doesNotMatch(source, /heroAssets\.hero, ghost\.frame[^\n]+Math\.min\(320/);
  assert.match(source, /launch: 58 \* heroVisualScale/);
  assert.ok(sw.includes('"./sanguo/src/game/heroRenderScale.js"'));
});
