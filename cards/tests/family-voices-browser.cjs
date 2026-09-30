const assert = require('node:assert/strict');
const fs = require('node:fs'), path = require('node:path'), http = require('node:http');
const { chromium } = require('playwright');
const root = path.resolve(__dirname, '../..');
const mime = { '.html': 'text/html', '.js': 'text/javascript', '.json': 'application/json', '.css': 'text/css', '.wav': 'audio/wav', '.mp3': 'audio/mpeg', '.webp': 'image/webp', '.png': 'image/png', '.svg': 'image/svg+xml', '.woff2': 'font/woff2' };
const server = http.createServer((req, res) => {
  const url = new URL(req.url, 'http://localhost');
  const pathname = decodeURIComponent(url.pathname);
  const file = path.resolve(root, '.' + pathname + (pathname.endsWith('/') ? 'index.html' : ''));
  if (!file.startsWith(root + path.sep)) { res.writeHead(403).end(); return; }
  if (!fs.existsSync(file) || !fs.statSync(file).isFile()) { res.writeHead(404).end(); return; }
  res.setHeader('Content-Type', mime[path.extname(file)] || 'application/octet-stream');
  fs.createReadStream(file).pipe(res);
});
(async () => {
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  const browser = await chromium.launch({ headless: true, args: ['--autoplay-policy=no-user-gesture-required'] });
  const data = JSON.parse(fs.readFileSync(path.join(root, 'cards/cards.json')));
  try {
    for (const id of ['taeo', 'jaei', 'yunchan', 'yungeon']) {
      const page = await browser.newPage({ viewport: { width: 820, height: 1180 }, serviceWorkers: 'block' });
      const errors = [], requests = [];
      page.on('pageerror', error => errors.push(error.message));
      page.on('request', request => requests.push(request.url()));
      await page.addInitScript(() => { window.__familyVoiceEvents = []; window.__familyVoiceStops = 0; });
      // Telemetry only; approved audio decoding and playback use the actual module.
      await page.route('**/js/family-voices.js*', route => {
        const body = fs.readFileSync(path.join(root, 'cards/js/family-voices.js'), 'utf8')
          .replace('source.start(audio.currentTime);', '__familyVoiceEvents.push({id:plan.cardId,rate:source.playbackRate.value,duration:buffer.duration}); source.start(audio.currentTime);')
          .replace('const previous = active; active = null;', 'const previous = active; active = null; if(previous) __familyVoiceStops++;');
        return route.fulfill({ body, contentType: 'text/javascript' });
      });
      // Give this local QA battle enough stars to press the real large-technique button.
      await page.route('**/js/engine.js*', route => {
        const body = fs.readFileSync(path.join(root, 'cards/js/engine.js'), 'utf8') + '\nconst qaEngine=CardEngine;window.CardEngine={...qaEngine,createGame(...args){const s=qaEngine.createGame(...args);s.sides.player.stars=8;s.sides.enemy.hp=s.sides.enemy.maxHp=1000;return s;}};';
        return route.fulfill({ body, contentType: 'text/javascript' });
      });
      const base = `http://127.0.0.1:${server.address().port}/cards/?preview=all&card=${id}&enemy=jack&battle=1`;
      const card = data.cards.find(card => card.id === id), big = card.attacks.find(attack => attack.vfx?.big);
      const finishCoin = async () => {
        if (await page.locator('#coinDialog').isVisible()) {
          await page.locator('#coinButton').click();
          await page.locator('#coinDialog').waitFor({ state: 'hidden' });
        }
      };
      await page.goto(base);
      await page.locator('#actionList button').filter({ hasText: big.name }).waitFor();
      assert.equal((await page.evaluate(async id => {
        const api = CardFamilyVoice;
        window.__voiceDiagnostics = [];
        window.CardFamilyVoice = { ...api, play: async plan => {
          const result = await api.play(plan);
          __voiceDiagnostics.push({ plan, result, state: CardAudio.prime()?.state, muted: CardAudio.isMuted() });
          return result;
        } };
        return { loaded: await api.warm(id), state: CardAudio.prime()?.state, muted: CardAudio.isMuted() };
      }, id)).loaded, true, id + ' recording preloaded');
      await page.locator('#actionList button').filter({ hasText: big.name }).click();
      await finishCoin();
      try { await page.waitForFunction(id => __familyVoiceEvents.some(event => event.id === id), id, { timeout: 5000 }); }
      catch (error) { console.log('voice diagnostics', await page.evaluate(() => __voiceDiagnostics), errors); throw error; }
      assert.equal((await page.evaluate(() => __familyVoiceEvents))[0].rate, 1);
      assert.ok(requests.some(url => url.endsWith(`/sanguo/audio/hero-callouts-eleven-v2/${id}-callout-v2.wav`)));
      await page.locator('#muteButton').click();
      assert.ok(await page.evaluate(() => __familyVoiceStops > 0), 'mute stops the running cry');
      await page.locator('#leaveBattleButton').click();
      await page.goto(base);
      await page.evaluate(id => CardFamilyVoice.warm(id), id);
      await page.locator('#actionList button').filter({ hasText: big.name }).click();
      await finishCoin();
      await page.waitForTimeout(350);
      assert.equal(await page.evaluate(() => __familyVoiceEvents.length), 0, 'saved mute suppresses voice');
      await page.goto(base);
      await page.locator('#muteButton').click();
      await page.locator('#actionList button').filter({ hasText: card.attacks[0].name }).click();
      await finishCoin();
      await page.waitForTimeout(350);
      assert.equal(await page.evaluate(() => __familyVoiceEvents.length), 0, 'ordinary attack stays quiet');
      assert.deepEqual(errors, []); assert.ok(!requests.some(url => url.includes('api.elevenlabs.io')));
      console.log(`PASS ${id}: real large-technique voice, original pitch, mute, navigation and quiet ordinary attack`);
      await page.close();
    }
  } finally { await browser.close(); server.closeAllConnections(); await new Promise(resolve => server.close(resolve)); }
})().catch(error => { console.error(error); process.exitCode = 1; });
