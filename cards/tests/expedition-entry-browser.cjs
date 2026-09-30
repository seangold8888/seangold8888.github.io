const assert = require('node:assert/strict'), fs = require('node:fs'), path = require('node:path'), http = require('node:http'), os = require('node:os');
const { chromium } = require('playwright');
const root = path.resolve(__dirname, '../..');
const mime = { '.html': 'text/html', '.js': 'text/javascript', '.json': 'application/json', '.css': 'text/css', '.webp': 'image/webp', '.png': 'image/png', '.svg': 'image/svg+xml', '.wav': 'audio/wav', '.mp3': 'audio/mpeg', '.woff2': 'font/woff2' };
const server = http.createServer((req, res) => {
  const pathname = decodeURIComponent(new URL(req.url, 'http://localhost').pathname);
  const file = path.resolve(root, '.' + pathname + (pathname.endsWith('/') ? 'index.html' : ''));
  if (!file.startsWith(root + path.sep)) { res.writeHead(403).end(); return; }
  if (!fs.existsSync(file) || !fs.statSync(file).isFile()) { res.writeHead(404).end(); return; }
  res.setHeader('Content-Type', mime[path.extname(file)] || 'application/octet-stream');
  fs.createReadStream(file).pipe(res);
});
(async () => {
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  const browser = await chromium.launch({ headless: true });
  const output = fs.mkdtempSync(path.join(os.tmpdir(), 'jt-expedition-entry-'));
  try {
    for (const [width, height] of [[375,667],[390,844],[820,1180],[1180,820],[844,390]]) {
      const page = await browser.newPage({ viewport: { width, height }, serviceWorkers: 'block' });
      const errors = []; page.on('pageerror', error => errors.push(error.message));
      await page.goto(`http://127.0.0.1:${server.address().port}/cards/`);
      await page.waitForFunction(() => document.querySelectorAll('#collectionGrid .story-card').length > 0);
      await page.locator('.adventure-portraits img').evaluateAll(images => Promise.all(images.map(img => img.decode())));
      assert.equal(await page.locator('#cardBrowse').evaluate(el => el.open), false);
      assert.equal(await page.locator('#collectionGrid').isVisible(), false);
      const bounds = await page.locator('#campaignButton').boundingBox();
      assert.ok(bounds.height >= 64 && bounds.width >= 250);
      assert.ok(bounds.y + bounds.height <= height, `main button below fold at ${width}×${height}: ${JSON.stringify(bounds)}`);
      assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), 'no horizontal overflow');
      await page.screenshot({ path: path.join(output, `home-${width}x${height}.png`) });
      const before = await page.evaluate(() => ({ chapter: CardCampaign.load().chapter, phase: CardCampaign.load().phase }));
      await page.locator('#campaignButton').click();
      await page.locator('#campaignScreen .expedition-world').first().waitFor();
      assert.equal(await page.locator('#campaignScreen .expedition-world').count(), 8);
      await page.getByRole('button', { name: '← 모험 홈', exact: true }).click();
      assert.equal(await page.locator('#cardBrowse').evaluate(el => el.open), false);
      assert.deepEqual(await page.evaluate(() => ({ chapter: CardCampaign.load().chapter, phase: CardCampaign.load().phase })), before);
      await page.locator('#cardBrowse > summary').focus();
      await page.keyboard.press('Enter');
      assert.equal(await page.locator('#cardBrowse').evaluate(el => el.open), true);
      assert.equal(await page.locator('#collectionGrid').isVisible(), true);
      await page.locator('#collectionGrid .story-card').first().click();
      await page.locator('#cardDetailDialog').waitFor();
      await page.locator('#cardDetailDialog [data-detail-close]').first().click();
      assert.deepEqual(errors, []);
      console.log(`PASS ${width}×${height}: expedition button above fold, hidden cards, map/home, keyboard card browsing, detail, progress unchanged`);
      await page.close();
    }
    const resumePage = await browser.newPage({ viewport: { width: 390, height: 844 }, serviceWorkers: 'block' });
    await resumePage.goto(`http://127.0.0.1:${server.address().port}/cards/`);
    await resumePage.waitForFunction(() => document.querySelectorAll('#collectionGrid .story-card').length > 0);
    const saved = await resumePage.evaluate(() => {
      const C = CardCampaign;
      let p = C.beginBattle(C.finishIntro(C.createProgress()), 'jaei');
      p = C.finishChapter(C.finishBattle(p, p.battleSerial, 'player'));
      C.save(p); return { chapter: p.chapter, recruited: p.recruited };
    });
    await resumePage.reload();
    await resumePage.waitForFunction(() => document.getElementById('campaignButton').textContent.includes('이어서'));
    assert.match(await resumePage.locator('#campaignButton').textContent(), /이어서.*1장/);
    assert.deepEqual(await resumePage.evaluate(() => ({ chapter: CardCampaign.load().chapter, recruited: CardCampaign.load().recruited })), saved);
    await resumePage.locator('#campaignButton').click();
    assert.equal(await resumePage.locator('.expedition-world.is-current').getAttribute('data-chapter'), '1');
    await resumePage.getByRole('button', { name: '← 모험 홈', exact: true }).click();
    await resumePage.goto(`http://127.0.0.1:${server.address().port}/cards/?view=cards`);
    await resumePage.waitForFunction(() => document.querySelectorAll('#collectionGrid .story-card').length > 0);
    assert.equal(await resumePage.locator('#cardBrowse').evaluate(el => el.open), true);
    console.log('PASS saved expedition resumes chapter 1; recruited cards preserved; direct card-view link opens cards');
    await resumePage.close();
    console.log('Screenshots:', output);
  } finally { await browser.close(); server.closeAllConnections(); await new Promise(resolve => server.close(resolve)); }
})().catch(error => { console.error(error); process.exitCode = 1; });
