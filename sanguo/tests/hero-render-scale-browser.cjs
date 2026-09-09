// Real Chromium render check. The hook is injected only into the local response.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { chromium } = require('playwright');
const { createServer } = require('../preview-server.cjs');

const source = fs.readFileSync(path.join(__dirname, '../src/game/sideScroller.js'), 'utf8');
const marker = '  function loop(now) {';
assert.ok(source.includes(marker));
const hook = [
  'globalThis.__heroScale={player,render,heroVisualScale,standingHeroHeight};',
  "for(const key of Object.keys(audio))if(typeof audio[key]==='function')audio[key]=()=>{};",
].join('\n');
const instrumented = source.replace(marker, hook + '\n' + marker).replace('function loop(now) {', 'function loop(now) { return;');
const cases = [
  ['machao', .96], ['huangzhong', .94], ['xiahoudun', .90], ['zhangliao', .92],
  ['xuchu', .92], ['simayi', .89], ['sunquan', .89], ['taishici', .93],
  ['ganning', .90], ['luxun', .88], ['nezha', .84], ['erlangshen', .80], ['honghaier', .83],
];

(async () => {
  const server = createServer();
  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
  let browser;
  const output = process.env.HERO_SCALE_QA_OUTPUT;
  if (output) fs.mkdirSync(output, { recursive: true });
  try {
    browser = await chromium.launch({ headless: true });
    const origin = `http://127.0.0.1:${server.address().port}`;
    for (const [hero, expectedScale] of cases) {
      const context = await browser.newContext({ viewport: { width: 640, height: 400 } });
      const page = await context.newPage();
      const errors = [], bad = [];
      page.on('pageerror', (error) => errors.push(error.message));
      page.on('response', (response) => { if (response.status() >= 400) bad.push(`${response.status()} ${response.url()}`); });
      await page.route('**/src/game/sideScroller.js', (route) => route.fulfill({ contentType: 'text/javascript', body: instrumented }));
      await page.goto(origin);
      await page.evaluate(async (hero) => {
        document.getElementById('ui').innerHTML = '';
        const { startSideBattle } = await import('./src/game/sideScroller.js');
        await startSideBattle(hero, 'hulao');
        __heroScale.player.x = 430;
        __heroScale.player.lane = 0;
        __heroScale.player.action = 'idle';
        __heroScale.render(performance.now());
      }, hero);
      const measured = await page.evaluate(() => ({ scale: __heroScale.heroVisualScale, height: __heroScale.standingHeroHeight() }));
      assert.equal(measured.scale, expectedScale, `${hero}: profile`);
      assert.ok(Math.abs(measured.height - 200 * expectedScale) < .01, `${hero}: 400px viewport height`);
      assert.deepEqual(errors, [], `${hero}: page errors`);
      assert.deepEqual(bad, [], `${hero}: request errors`);
      if (output) await page.locator('#stage').screenshot({ path: path.join(output, `${hero}.png`) });
      console.log(`PASS ${hero} scale ${measured.scale}, draw height ${measured.height}`);
      await context.close();
    }
  } finally {
    await browser?.close();
    server.closeAllConnections();
    await new Promise((resolve) => server.close(resolve));
  }
  console.log('PASS 13 corrected heroes render at calibrated heights');
})().catch((error) => { console.error(error); process.exitCode = 1; });
