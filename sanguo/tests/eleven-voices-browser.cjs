// Guan Yu's CC0 fixture tests legacy compatibility. Family cases use the real
// shipped ElevenLabs files, including Yungeon's revised catchphrase.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { chromium } = require('playwright');
const { createServer } = require('../preview-server.cjs');

(async () => {
  const server = createServer();
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  const browser = await chromium.launch({ headless: true });
  try {
    const page = await browser.newPage({ viewport: { width: 640, height: 400 } });
    const errors = [], requests = [];
    page.on('pageerror', error => errors.push(error.message));
    page.on('request', req => requests.push(req.url()));
    let source = fs.readFileSync(path.join(__dirname, '../src/game/sideScroller.js'), 'utf8');
    source = source.replace('function makeAudio(', 'export function makeAudio(')
      .replace('    source.start(startedAt, sourceOffset, sourceDuration);',
        '    globalThis.__voiceEvents?.push({ group, rate: source.playbackRate.value });\n    source.start(startedAt, sourceOffset, sourceDuration);')
      .replace('        previous.source.stop(fadeAt + .075);',
        '        globalThis.__voiceFades = (globalThis.__voiceFades || 0) + 1;\n        previous.source.stop(fadeAt + .075);');
    let registry = fs.readFileSync(path.join(__dirname, '../src/game/elevenVoicePacks.js'), 'utf8');
    registry = registry.replace('export const ELEVEN_VOICE_PACKS = Object.freeze({', `export const ELEVEN_VOICE_PACKS = Object.freeze({guanyu: {
      dash: 'audio/battle-cries/male-noble-a-cc0.wav',
      special: 'audio/battle-cries/male-noble-a-cc0.wav',
      musou: 'audio/battle-cries/male-noble-b-cc0.wav'
    },`);
    await page.route('**/src/game/sideScroller.js', route => route.fulfill({ contentType: 'text/javascript', body: source }));
    await page.route('**/src/game/elevenVoicePacks.js', route => route.fulfill({ contentType: 'text/javascript', body: registry }));
    await page.goto(`http://127.0.0.1:${server.address().port}/`);
    const result = await page.evaluate(async () => {
      const { makeAudio } = await import('./src/game/sideScroller.js');
      const audio = makeAudio('guanyu');
      await audio.ready();
      globalThis.__voiceEvents = [];
      audio.specialCry(false);
      const special = [...__voiceEvents];
      // A dash supersedes the previous voice without waiting for the full take.
      audio.dashCry();
      const dash = [...__voiceEvents];
      const fades = globalThis.__voiceFades || 0;
      await new Promise(resolve => setTimeout(resolve, 800));
      __voiceEvents = [];
      audio.specialCry(true);
      const musou = [...__voiceEvents];
      audio.toggleMute();
      __voiceEvents = [];
      audio.dashCry(); audio.shout(true);
      await new Promise(resolve => setTimeout(resolve, 800));
      audio.specialCry(false);
      const muted = [...__voiceEvents];
      audio.stop();
      const fallback = makeAudio('xuchu');
      await fallback.ready();
      __voiceEvents = [];
      fallback.specialCry(false);
      const legacy = [...__voiceEvents];
      fallback.stop();
      const families = {};
      for (const id of ['taeo', 'jaei', 'yunchan', 'yungeon']) {
        const family = makeAudio(id); await family.ready();
        __voiceEvents = [];
        family.specialCry(false); family.dashCry();
        await new Promise(resolve => setTimeout(resolve, 800));
        family.specialCry(true);
        families[id] = [...__voiceEvents];
        family.stop();
      }
      return { special, dash, fades, musou, muted, legacy, families };
    });
    assert.equal(result.special.filter(e => e.group === 'elevenSpecial').length, 1);
    assert.ok(!result.special.some(e => ['voiceSpecial', 'battleCry', 'breathDeep', 'breathNeutral'].includes(e.group)), 'one actor per performed special');
    assert.equal(result.dash.filter(e => e.group === 'elevenDash').length, 1);
    assert.ok(result.fades >= 1, 'new voice crossfades old voice');
    assert.equal(result.musou.filter(e => e.group === 'elevenMusou').length, 1);
    assert.ok(!result.musou.some(e => ['voiceMusou', 'battleCry'].includes(e.group)));
    for (const event of [...result.special, ...result.dash, ...result.musou].filter(e => e.group.startsWith('eleven'))) {
      assert.equal(event.rate, 1, 'keep the recorded performance pitch');
    }
    assert.deepEqual(result.muted, [], 'muted controls cannot start new voice sources');
    assert.equal(result.legacy.filter(e => e.group === 'battleCry').length, 1, 'unrecorded heroes keep working');
    for (const [id, events] of Object.entries(result.families)) {
      assert.ok(requests.some(url => url.endsWith(`/audio/hero-callouts-eleven-v2/${id}-callout-v2.wav`)), id + ': approved v2 recording loaded');
      for (const group of ['elevenSpecial', 'elevenDash', 'elevenMusou']) assert.equal(events.filter(e => e.group === group).length, 1, `${id}: ${group}`);
      assert.ok(!events.some(e => ['voiceSpecial', 'voiceMusou', 'battleCry', 'breathDeep', 'breathNeutral'].includes(e.group)), id + ': no second actor');
      assert.ok(events.filter(e => e.group.startsWith('eleven')).every(e => e.rate === 1), id + ': natural pitch');
    }
    assert.ok(!requests.some(url => url.includes('api.elevenlabs.io')), 'no paid API in the game');
    assert.deepEqual(errors, []);
    console.log('PASS real family voices: 4 heroes × 3 actions; no double actor, crossfade, natural rate, mute and legacy fallback');
  } finally {
    await browser.close(); server.closeAllConnections();
    await new Promise(resolve => server.close(resolve));
  }
})().catch(error => { console.error(error); process.exitCode = 1; });
