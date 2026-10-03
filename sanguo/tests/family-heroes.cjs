'use strict';
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const os = require('node:os');
const { chromium } = require('playwright');
const { createServer } = require('../preview-server.cjs');
const root = path.resolve(__dirname, '..');

(async () => {
  const { FAMILY_HERO_IDS: ids, FAMILY_RANGED, FAMILY_STATS, FAMILY_CALLOUTS } = await import('../src/data/familyHeroes.js');
  const { familyProjectile } = await import('../src/game/familyCombat.js');
  const { WORK_PEOPLE, workWeapon } = await import('../src/data/works.js');
  const { BATTLE_CRY_PROFILES, BATTLE_CRY_PACKS } = await import('../src/game/battleCries.js');
  const { elevenVoiceFiles } = await import('../src/game/elevenVoicePacks.js');
  const sw = fs.readFileSync(path.join(root, '../sw.js'), 'utf8');
  for (const file of ['src/data/familyHeroes.js', 'src/game/familyCombat.js', ...ids.map(id => `art/side-scroller/${id}-painted-sheet-v1.png`)]) assert.ok(sw.includes(`"./sanguo/${file}"`), file + ' cached');
  for (const id of ids) {
    assert.equal(WORK_PEOPLE[id].work, 'family');
    assert.ok(workWeapon(id) && FAMILY_STATS[id] && FAMILY_CALLOUTS[id]);
    assert.equal(BATTLE_CRY_PACKS[BATTLE_CRY_PROFILES[id].pack].length, 0, 'no unapproved adult voice');
    for (const files of Object.values(elevenVoiceFiles(id))) {
      assert.equal(files.length, 1, id + ' dedicated voice');
      assert.ok(fs.statSync(path.join(root, files[0])).size > 10000);
      assert.ok(sw.includes(`"./sanguo/${files[0]}"`), id + ' voice cached');
    }
    assert.ok(fs.statSync(path.join(root, `art/side-scroller/${id}-painted-sheet-v1.png`)).size > 100000);
    for (const facing of [-1, 1]) {
      const player = { x: 500, lane: 0, facing, y: 0 }, target = { x: 500 + facing * 500, lane: 24 };
      const shot = familyProjectile(id, player, target, 180, 200, 0);
      const t = Math.abs(target.x - shot.x) / Math.abs(shot.vx);
      assert.ok(Math.abs(shot.height + shot.vz * t - 260 * t * t - 106) < .01, id + ' aimed height');
      assert.ok(Math.abs(shot.lane + shot.laneV * t - 24) < .01, id + ' aimed lane');
      assert.ok(t < shot.life && Number.isFinite(shot.vz));
    }
  }
  assert.equal(FAMILY_CALLOUTS.yungeon.special.cry, '너무 쉽잖아!');
  const server = createServer();
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  const browser = await chromium.launch({ headless: true });
  const output = fs.mkdtempSync(path.join(os.tmpdir(), 'family-heroes-'));
  const errors = [];
  const base = `http://127.0.0.1:${server.address().port}/`;
  try {
    for (const [width, height, label] of [[1180, 820, 'ipad'], [390, 844, 'phone']]) {
      const page = await browser.newPage({ viewport: { width, height }, hasTouch: true });
      page.on('pageerror', e => errors.push(e.message));
      page.on('response', r => { if (r.status() >= 400) errors.push(`${r.status()} ${r.url()}`); });
      await page.goto(base);
      await page.locator('[data-party=family]').click();
      assert.equal(await page.locator('#hero-grid [data-hero]').count(), 4);
      const alpha = await page.locator('.cm-portrait').evaluateAll(async elements => Promise.all(elements.map(async el => {
        const im = new Image(); im.src = el.style.backgroundImage.slice(5, -2); await im.decode();
        const c = document.createElement('canvas'); c.width = im.width; c.height = im.height;
        const ctx = c.getContext('2d'); ctx.drawImage(im, 0, 0); const p = ctx.getImageData(0, 0, c.width, c.height).data;
        let clear = 0, opaque = 0; for (let i = 3; i < p.length; i += 4) { if (p[i] === 0) clear++; if (p[i] > 200) opaque++; }
        return { clear, opaque };
      })));
      for (const a of alpha) assert.ok(a.clear > 100000 && a.opaque > 100000, 'genuine alpha and visible sprites');
      await page.screenshot({ path: path.join(output, `${label}-menu.png`) });
      assert.ok(await page.evaluate(() => document.querySelector('.command-menu').scrollWidth <= innerWidth + 1), 'no horizontal overflow');
      for (const work of ['sanguo', 'xiyou', 'korea']) {
        await page.locator(`[data-work=${work}]`).click();
        for (const id of ids) {
          await page.locator(`[data-hero=${id}]`).click();
          await page.locator('#menu-deploy').click();
          assert.match(await page.locator('.story-opening').innerText(), /실제 역사나 원작/);
          assert.match(await page.locator('#story-begin').innerText(), new RegExp(WORK_PEOPLE[id].name));
          await page.locator('#story-back').click();
          assert.equal(await page.locator(`[data-hero=${id}]`).getAttribute('aria-pressed'), 'true');
        }
      }
      await page.locator('[data-party=story]').click();
      assert.equal(await page.locator('[data-hero=euljimundeok]').count(), 1, 'historical roster still available');
      await page.close();
    }
    for (const [index, id] of ids.entries()) {
      const page = await browser.newPage({ viewport: { width: 820, height: 540 }, hasTouch: true });
      page.on('pageerror', e => errors.push(e.message));
      page.on('console', m => { if (m.type() === 'error') errors.push(m.text()); });
      page.on('response', r => { if (r.status() >= 400) errors.push(`${r.status()} ${r.url()}`); });
      await page.route('**/src/game/sideScroller.js', async route => {
        const source = fs.readFileSync(path.join(root, 'src/game/sideScroller.js'), 'utf8');
        const marker = '  showBanner(hudRoot, stageInfo ?';
        assert.ok(source.includes(marker));
        const probe = `  window.__qa={player,enemies,input,beginAttack,update,render,skill:dashTechnique,
          stop:()=>cancelAnimationFrame(raf),clearShots:()=>{arrows=[];},get arrows(){return arrows;}};\n`;
        await route.fulfill({ body: source.replace(marker, probe + marker), contentType: 'text/javascript' });
      });
      await page.goto(base);
      await page.locator(`[data-work=${['sanguo','xiyou','korea','sanguo'][index]}]`).click();
      await page.locator('[data-party=family]').click();
      await page.locator(`[data-hero=${id}]`).click();
      await page.locator('#menu-deploy').click(); await page.locator('#story-begin').click();
      await page.waitForFunction(() => window.__qa, { timeout: 30000 });
      await page.evaluate(() => { __qa.stop(); __qa.update(.016, performance.now()); __qa.render(performance.now()); });
      assert.equal(await page.locator('[data-touch-action=ranged] .key-label').innerText(), FAMILY_RANGED[id].label);
      assert.equal(await page.locator('#mount-readout').innerText(), '도보 전투');
      await page.screenshot({ path: path.join(output, `${id}-battle.png`) });
      const results = await page.evaluate(() => {
        const q = __qa, results = {};
        let clock = performance.now() + 5000;
        const template = q.enemies[0];
        if (!template) throw new Error('No spawned enemy fixture');
        const reset = (distance = 110) => {
          q.input.clear(); q.clearShots();
          Object.assign(q.player, { x: 420, lane: 0, y: 0, vy: 0, facing: 1, action: 'idle', actionUntil: 0, dashReady: 0, rage: 0, hp: 1000, maxHp: 1000, grab: null, invulnerableUntil: Infinity, comboUntil: 0, comboStep: 0 });
          q.enemies.length = 0;
          q.enemies.push({ ...template, x: 420 + distance, lane: 0, hp: 10000, maxHp: 10000, deadAt: 0, hitUntil: Infinity, attackAt: Infinity, boss: false, grabbed: false });
          clock += 4000;
        };
        for (const action of ['attack', 'ranged', 'charged', 'dash', 'special', 'musou']) {
          reset(action === 'ranged' || action === 'charged' ? 340 : 110);
          if (action === 'musou') q.player.rage = 100;
          q.beginAttack(action === 'charged' ? 'ranged' : action, clock, { charged: action === 'charged' });
          const kinds = new Set(), strikes = []; let lastHp = q.enemies[0].hp;
          for (let t = 16; t <= 1600; t += 16) {
            q.update(.016, clock + t); q.arrows.forEach(a => kinds.add(a.kind));
            if (q.enemies[0].hp < lastHp) strikes.push({ t, damage: lastHp - q.enemies[0].hp });
            lastHp = q.enemies[0].hp;
          }
          results[action] = { damage: 10000 - q.enemies[0].hp, kinds: [...kinds], x: q.player.x, strikes,
            pulses: q.player.familyTechnique?.next || 0, bindUntil: q.enemies[0].familyBindUntil || 0 };
        }
        reset(); window.__familyClock = clock;
        q.beginAttack('special', clock); q.update(.016, clock + 450); q.render(clock + 450);
        return results;
      });
      for (const action of ['attack', 'ranged', 'charged', 'dash', 'special', 'musou']) assert.ok(results[action].damage > 0, `${id} ${action} ${JSON.stringify(results)}`);
      assert.ok(results.charged.damage > results.ranged.damage, id + ' charge bonus');
      assert.ok(results.ranged.kinds.includes(FAMILY_RANGED[id].kind), id + ' own projectile');
      assert.ok(results.dash.x > 420, id + ' dash movement');
      for (const action of ['special', 'musou']) {
        assert.equal(results[action].pulses, id === 'jaei' ? 2 : 3, id + ' drains all technique beats');
        assert.equal(results[action].strikes.length, id === 'jaei' ? 2 : 3, id + ' actual repeated damage');
      }
      if (id === 'jaei') assert.ok(results.special.bindUntil > 0, 'bubble bind is applied');
      await page.screenshot({ path: path.join(output, `${id}-special.png`) });
      // Real touch/keyboard events use the shared input path, not direct beginAttack.
      await page.evaluate(() => { __qa.player.actionUntil = 0; __qa.player.action = 'idle'; __qa.input.clear(); });
      await page.locator('[data-touch-action=attack]').dispatchEvent('pointerdown', { pointerId: 9, pointerType: 'touch' });
      await page.locator('[data-touch-action=attack]').dispatchEvent('pointerup', { pointerId: 9, pointerType: 'touch' });
      await page.evaluate(() => __qa.update(.016, performance.now()));
      assert.equal(await page.evaluate(() => __qa.player.action), 'attack', id + ' touch attack');
      await page.evaluate(() => { __qa.player.actionUntil = 0; __qa.player.action = 'idle'; __qa.input.clear(); });
      await page.keyboard.press('k'); await page.evaluate(() => __qa.update(.016, performance.now()));
      assert.equal(await page.evaluate(() => __qa.player.action), 'ranged', id + ' keyboard ranged');
      console.log('PASS', id, JSON.stringify(results));
      await page.close();
    }
    assert.deepEqual(errors, []);
    console.log('PASS family heroes: 24 briefings, alpha, 4 battles, 24 damage checks, charge, touch/key input, zero errors. Screenshots:', output);
  } finally {
    await browser.close(); server.closeAllConnections(); await new Promise(resolve => server.close(resolve));
  }
})().catch(e => { console.error(e); process.exitCode = 1; });
