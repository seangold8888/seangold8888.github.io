const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const os = require('node:os');
const { chromium } = require('playwright');
const { createServer } = require('../preview-server.cjs');

(async () => {
  const manifest = JSON.parse(fs.readFileSync(path.join(__dirname, '../audio/warrior-callouts-eleven-v2/manifest.json')));
  assert.equal(Object.keys(manifest.heroes).length, 29);
  assert.ok(!manifest.heroes.zhangfei, 'requested Zhang Fei preservation');
  const sw = fs.readFileSync(path.join(__dirname, '../../sw.js'), 'utf8');
  for (const [id, take] of Object.entries(manifest.heroes)) {
    assert.ok(fs.statSync(path.join(__dirname, '../audio/warrior-callouts-eleven-v2', take.file)).size > 10000, id);
    assert.ok(sw.includes(`"./sanguo/audio/warrior-callouts-eleven-v2/${take.file}"`));
  }
  const server = createServer(); await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  const browser = await chromium.launch({ headless: true });
  const output = fs.mkdtempSync(path.join(os.tmpdir(), 'warrior-voices-'));
  const errors = [], requests = [];
  try {
    const page = await browser.newPage({ viewport: { width: 390, height: 844 } });
    page.on('pageerror', e => errors.push(e.message));
    page.on('request', req => requests.push(req.url()));
    page.on('response', res => { if (res.status() >= 400) errors.push(res.status() + ' ' + res.url()); });
    let source = fs.readFileSync(path.join(__dirname, '../src/game/sideScroller.js'), 'utf8');
    source = source.replace('function makeAudio(', 'export function makeAudio(')
      .replace('    source.start(startedAt, sourceOffset, sourceDuration);',
        '    globalThis.__voiceEvents?.push({group,rate:source.playbackRate.value});\n    source.start(startedAt, sourceOffset, sourceDuration);');
    await page.route('**/src/game/sideScroller.js', route => route.fulfill({ body: source, contentType: 'text/javascript' }));
    await page.goto(`http://127.0.0.1:${server.address().port}/voices.html`);
    await page.waitForFunction(() => document.querySelectorAll('.voice-card').length === 34);
    assert.equal(await page.locator('[data-hero=zhangfei] audio').getAttribute('src'), 'audio/hero-callouts-ko-v6/zhangfei-special-v6.wav');
    assert.ok(await page.locator('[data-hero=zhangfei] button').isDisabled());
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true);
    await page.locator('nav [data-work=family]').click();
    assert.equal(await page.locator('.voice-card:visible').count(), 4);
    for (const id of ['taeo', 'jaei', 'yunchan', 'yungeon']) {
      assert.equal(await page.locator(`[data-hero=${id}] audio`).getAttribute('src'), `audio/hero-callouts-eleven-v2/${id}-callout-v2.wav`);
      assert.ok(await page.locator(`[data-hero=${id}] button`).isDisabled());
    }
    await page.screenshot({ path: path.join(output, 'phone-family-voices.png'), fullPage: true });
    await page.setViewportSize({ width: 820, height: 1180 });
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true);
    await page.screenshot({ path: path.join(output, 'tablet-family-voices.png'), fullPage: false });
    await page.setViewportSize({ width: 390, height: 844 });
    await page.locator('nav [data-work=korea]').click();
    assert.equal(await page.locator('.voice-card:visible').count(), 4);
    await page.locator('nav [data-work=xiyou]').click();
    assert.equal(await page.locator('.voice-card:visible').count(), 7);
    await page.locator('nav [data-work=sanguo]').click();
    assert.equal(await page.locator('.voice-card:visible').count(), 19);
    await page.locator('[data-hero=guanyu] button').click();
    assert.equal(await page.locator('nav [data-work=sanguo]').getAttribute('aria-pressed'), 'true', 'card clicks do not change filter');
    await page.reload(); await page.waitForFunction(() => document.querySelectorAll('.voice-card').length === 34);
    assert.equal(await page.locator('[data-hero=guanyu] button').getAttribute('aria-pressed'), 'true', 'choice retained');
    const decoded = await page.evaluate(async manifest => {
      const ctx = new AudioContext(), results = [];
      for (const [id, take] of Object.entries(manifest.heroes)) {
        const response = await fetch(`audio/warrior-callouts-eleven-v2/${take.file}`);
        const buffer = await ctx.decodeAudioData(await response.arrayBuffer());
        const pcm = buffer.getChannelData(0); let peak = 0, energy = 0;
        for (const value of pcm) { peak = Math.max(peak, Math.abs(value)); energy += value * value; }
        results.push({ id, duration: buffer.duration, peak, rms: Math.sqrt(energy / pcm.length) });
      }
      await ctx.close(); return results;
    }, manifest);
    for (const d of decoded) {
      assert.ok(Math.abs(d.duration - manifest.heroes[d.id].duration) < .025, d.id + ' decoded length');
      assert.ok(d.peak > .05 && d.peak < .99 && d.rms > .01, d.id + ' audible non-clipped signal');
    }
    const playback = await page.evaluate(async () => {
      const { makeAudio } = await import('./src/game/sideScroller.js');
      const { elevenVoiceFiles, selectWarriorVoice } = await import('./src/game/elevenVoicePacks.js');
      const result = {};
      for (const id of ['guanyu', 'sunshangxiang', 'yisunsin']) {
        selectWarriorVoice(id, true); const audio = makeAudio(id); await audio.ready();
        globalThis.__voiceEvents = []; audio.specialCry(false); result[id] = [...__voiceEvents]; audio.stop();
      }
      result.zhangfei = elevenVoiceFiles('zhangfei');
      selectWarriorVoice('guanyu', false); result.restored = elevenVoiceFiles('guanyu');
      return result;
    });
    for (const id of ['guanyu', 'sunshangxiang', 'yisunsin']) {
      assert.equal(playback[id].filter(e => e.group === 'elevenSpecial').length, 1, id);
      assert.ok(playback[id].filter(e => e.group === 'elevenSpecial').every(e => e.rate === 1));
      assert.ok(!playback[id].some(e => ['voiceSpecial', 'battleCry', 'breathDeep', 'breathNeutral'].includes(e.group)), id + ' one performance');
    }
    assert.deepEqual(playback.zhangfei, { dash: [], special: [], musou: [] });
    assert.deepEqual(playback.restored, { dash: [], special: [], musou: [] });
    await page.screenshot({ path: path.join(output, 'phone-voices.png'), fullPage: false });
    assert.ok(!requests.some(url => url.includes('api.elevenlabs.io')));
    assert.deepEqual(errors, []);
    console.log('PASS 29 real WAVs decoded, 34 voice cards including approved family voices, phone/tablet filters, saved/reversible selection, 3 real performances, Zhang Fei unchanged. Screenshots:', output);
  } finally { await browser.close(); server.closeAllConnections(); await new Promise(resolve => server.close(resolve)); }
})().catch(error => { console.error(error); process.exitCode = 1; });
