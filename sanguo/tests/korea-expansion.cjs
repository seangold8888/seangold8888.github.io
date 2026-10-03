"use strict";
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const os = require('node:os');
const { chromium } = require('playwright');
const { createServer } = require('../preview-server.cjs');

const root = path.resolve(__dirname, '..');
const heroIds = ['euljimundeok', 'ganggamchan', 'kwonyul', 'yisunsin'];
const stageKeys = ['salsu', 'gwiju', 'haengju', 'myeongnyang'];
const bossSheets = {
  suiVanguard: 'boss-sui-vanguard-painted-sheet-v1.png',
  khitanVanguard: 'boss-khitan-vanguard-painted-sheet-v1.png',
  haengjuVanguard: 'boss-haengju-vanguard-painted-sheet-v1.png',
  myeongnyangVanguard: 'boss-myeongnyang-vanguard-painted-sheet-v1.png',
};

(async () => {
  const { WORKS, WORK_PEOPLE, WORK_STATS, WORK_STAGES, stagesOfWork } = await import('../src/data/works.js');
  const { DASH_SKILLS } = await import('../src/game/dashSkills.js');
  const { BATTLE_CRY_PROFILES } = await import('../src/game/battleCries.js');
  const { SCENES } = await import('../src/game/scenery.js');
  assert.equal(WORKS.korea.ready, true);
  assert.equal(WORKS.shuihu, undefined, '수호지 메뉴는 보이지 않아야 한다');
  assert.deepEqual(stagesOfWork('korea'), stageKeys);
  for (const id of heroIds) {
    assert.equal(WORK_PEOPLE[id].work, 'korea');
    assert.ok(WORK_STATS[id] && DASH_SKILLS[id] && BATTLE_CRY_PROFILES[id], id);
    for (const suffix of ['painted-sheet-v1.png', 'bow-painted-sheet-v1.png']) {
      assert.ok(fs.existsSync(path.join(root, 'art/side-scroller', `${id}-${suffix}`)), id + ' ' + suffix);
    }
  }
  for (const key of stageKeys) {
    const stage = WORK_STAGES[key];
    assert.equal(stage.heroes.length, 1, key);
    assert.ok(heroIds.includes(stage.heroes[0]) && SCENES[key], key);
    for (const field of ['scene_intro', 'mission', 'lesson', 'real', 'fiction']) assert.ok(stage[field], key + ' ' + field);
    assert.ok(fs.existsSync(path.join(root, 'art/side-scroller', bossSheets[stage.bossId])), key + ' boss');
  }

  const server = createServer();
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  const browser = await chromium.launch({ headless: true });
  try {
    const page = await browser.newPage({ viewport: { width: 820, height: 1180 }, hasTouch: true });
    const errors = [];
    page.on('pageerror', error => errors.push(error.message));
    page.on('console', message => { if (message.type() === 'error') errors.push(message.text()); });
    page.on('response', response => { if (response.status() >= 400) errors.push(`${response.status()} ${response.url()}`); });
    const shots = fs.mkdtempSync(path.join(os.tmpdir(), 'korea-expansion-'));
    const base = `http://127.0.0.1:${server.address().port}/`;
    await page.goto(base);
    await page.locator('[data-work=korea]').click();
    assert.equal(await page.locator('[data-work=shuihu]').count(), 0);
    assert.equal(await page.locator('[data-stage]').count(), 4);
    for (const [index, key] of stageKeys.entries()) {
      await page.locator(`[data-stage=${key}]`).click();
      const id = heroIds[index];
      assert.equal(await page.locator(`#hero-grid [data-hero=${id}]`).count(), 1, key);
      assert.ok(await page.locator('#menu-deploy').isEnabled(), key);
      await page.locator(`[data-hero=${id}] .cm-portrait`).evaluate(async element => {
        const image = new Image(); image.src = element.style.backgroundImage.slice(5, -2);
        await image.decode(); if (!image.naturalWidth) throw new Error('장수 원화를 읽지 못했습니다');
      });
    }
    await page.screenshot({ path: path.join(shots, 'menu.png'), fullPage: true });
    await page.locator('#menu-deploy').click();
    await page.waitForSelector('#story-begin');
    assert.match(await page.locator('.record-card').innerText(), /실제 역사/);
    assert.match(await page.locator('.record-card').innerText(), /게임 속 연출/);
    await page.locator('#story-begin').click();
    await page.waitForSelector('#hud', { timeout: 30000 });
    await page.waitForTimeout(900);
    await page.screenshot({ path: path.join(shots, 'myeongnyang.png') });
    for (const key of stageKeys.slice(0, -1)) {
      await page.goto(base);
      await page.locator('[data-work=korea]').click();
      await page.locator(`[data-stage=${key}]`).click();
      await page.locator('#menu-deploy').click();
      await page.locator('#story-begin').click();
      await page.waitForSelector('#hud', { timeout: 30000 });
      await page.waitForTimeout(650);
      await page.screenshot({ path: path.join(shots, `${key}.png`) });
    }
    assert.deepEqual(errors, []);
    console.log('PASS 한국 명장 4명 · 4전장 · 역사 구분 · 전투 로딩', shots);
  } finally {
    await browser.close();
    server.closeAllConnections();
    await new Promise(resolve => server.close(resolve));
  }
})().catch(error => { console.error(error); process.exitCode = 1; });
