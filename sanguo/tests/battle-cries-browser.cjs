// Browser-level audio decoding and scheduling check. Hooks exist only in the
// locally served response; production code exposes no debug API.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { chromium } = require('playwright');
const { createServer } = require('../preview-server.cjs');

const source = fs.readFileSync(path.join(__dirname, '../src/game/sideScroller.js'), 'utf8');
const loopMarker = '  function loop(now) {';
const startMarker = '    source.start(startedAt, sourceOffset, sourceDuration);';
assert.ok(source.includes(loopMarker));
assert.ok(source.includes(startMarker));
const hook = 'globalThis.__battleAudio={audio};\n';
const instrumented = source
  .replace(loopMarker, hook + loopMarker)
  .replace('function loop(now) {', 'function loop(now) { return;')
  .replace(startMarker, "    globalThis.__battleCryEvents?.push({group,sourceOffset,sourceDuration,rate:source.playbackRate.value,delay:filters?.delay||0});\n" + startMarker);

(async () => {
  const server = createServer();
  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
  let browser;
  try {
    browser = await chromium.launch({ headless: true });
    const origin = `http://127.0.0.1:${server.address().port}`;
    const cases = [
      ['liubei', 'hulao', 'noble', true],
      ['zhangfei', 'hulao', 'fierce', true],
      ['xuchu', 'guandu', 'heavy', false],
      ['zhaoyun', 'changban', 'agile', true],
      ['sunshangxiang', 'chibi', 'female', true],
    ];
    for (const [hero, stage, pack, hasCallout] of cases) {
      const context = await browser.newContext({ viewport: { width: 640, height: 400 }, hasTouch: true });
      const page = await context.newPage();
      const errors = [], failed = [];
      page.on('pageerror', (error) => errors.push(error.message));
      page.on('response', (response) => { if (response.status() >= 400) failed.push(`${response.status()} ${response.url()}`); });
      await page.route('**/src/game/sideScroller.js', (route) => route.fulfill({ contentType: 'text/javascript', body: instrumented }));
      await page.goto(origin);
      await page.waitForSelector('.cm-hero');
      const result = await page.evaluate(async ({ hero, stage }) => {
        document.getElementById('ui').innerHTML = '';
        globalThis.__battleCryEvents = [];
        const { startSideBattle } = await import('./src/game/sideScroller.js');
        await startSideBattle(hero, stage);
        await __battleAudio.audio.ready();
        __battleAudio.audio.specialCry(false, 'steel');
        await new Promise((resolve) => setTimeout(resolve, 80));
        return __battleCryEvents;
      }, { hero, stage });
      const battleEvents = result.filter((event) => event.group === 'battleCry');
      assert.equal(battleEvents.length, 1, `${hero}: one battle cry`);
      assert.ok(battleEvents[0].sourceDuration >= .8 && battleEvents[0].sourceDuration <= 1.2, `${hero}: short cry`);
      assert.ok(battleEvents[0].delay >= .1 && battleEvents[0].delay <= .2, `${hero}: pre-impact timing`);
      assert.equal(result.some((event) => event.group === 'voiceSpecial'), hasCallout, `${hero}: technique callout`);
      if (pack === 'female') assert.ok([.33, 1.67, 3.13].some((offset) => Math.abs(offset - battleEvents[0].sourceOffset) < .001), `${hero}: segmented source`);
      else assert.equal(battleEvents[0].sourceOffset, 0, `${hero}: full take`);
      assert.deepEqual(errors, [], `${hero}: page errors`);
      assert.deepEqual(failed, [], `${hero}: failed requests`);
      console.log(`PASS ${hero} ${pack} cry, ${hasCallout ? 'layered callout' : 'cry-only fallback'}`);
      await context.close();
    }
  } finally {
    await browser?.close();
    server.closeAllConnections();
    await new Promise((resolve) => server.close(resolve));
  }
  console.log('PASS five voice families decode and schedule in real Chromium');
})().catch((error) => { console.error(error); process.exitCode = 1; });
