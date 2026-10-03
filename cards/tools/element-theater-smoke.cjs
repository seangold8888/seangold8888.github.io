"use strict";
// Browser-only QA fixtures. Never modifies production saves or card data.
const { chromium } = require("playwright");
const assert = require("node:assert/strict");
const fs = require("node:fs"), http = require("node:http"), path = require("node:path"), os = require("node:os");
const root = path.resolve(__dirname, "../..");
const output = fs.mkdtempSync(path.join(os.tmpdir(), "card-elements-"));
const server = http.createServer((req, res) => {
  const url = new URL(req.url, "http://local");
  const file = path.resolve(root, "." + decodeURIComponent(url.pathname) + (url.pathname.endsWith("/") ? "index.html" : ""));
  if (!file.startsWith(root + path.sep)) { res.writeHead(403); return res.end(); }
  fs.readFile(file, (error, data) => {
    res.writeHead(error ? 404 : 200, { "Content-Type": ({ ".js": "application/javascript", ".html": "text/html", ".css": "text/css", ".json": "application/json", ".png": "image/png", ".webp": "image/webp" })[path.extname(file)] || "application/octet-stream" });
    res.end(error ? "missing" : data);
  });
});
async function main() {
  await new Promise(resolve => server.listen(0, "127.0.0.1", resolve));
  const browser = await chromium.launch({ channel: "msedge", headless: true, args: ["--enable-unsafe-swiftshader"] });
  const base = "http://127.0.0.1:" + server.address().port;
  async function open(card, viewport, reducedMotion = "no-preference", ultimate = false) {
    const context = await browser.newContext({ viewport, reducedMotion, serviceWorkers: "block" });
    await context.addInitScript(ultimate => {
      localStorage.setItem("cards_bgm_muted", "1");
      let engine;
      Object.defineProperty(window, "CardEngine", { configurable: true, get: () => engine, set(value) {
        engine = { ...value, createGame(player, enemy, options) {
          const game = value.createGame(player, { ...enemy, hp: 500, passive: null }, options);
          if (ultimate) { game.sides.player.flags.ultimateUnlocked = true; game.sides.player.stars = 5; }
          return game;
        } };
      } });
      let audio;
      Object.defineProperty(window, "CardAudio", { configurable: true, get: () => audio, set(value) {
        audio = { ...value, techniqueImpact(plan) { window.__soundContact = performance.now(); return value.techniqueImpact(plan); } };
      } });
    }, ultimate);
    const page = await context.newPage(), errors = [];
    page.on("pageerror", error => errors.push(String(error)));
    await page.clock.install();
    await page.goto(base + "/cards/?preview=all&card=" + card + "&battle=1");
    await page.waitForSelector("#battleScreen:not([hidden])");
    await page.evaluate(async () => Promise.all(Array.from(document.querySelectorAll('.battle-card-slot img')).map(img => img.decode().catch(() => {}))));
    await page.clock.pauseAt(new Date(Date.now() + 60000));
    await page.clock.runFor(250);
    return { page, context, errors };
  }
  try {
    const examples = [
      ["redhood", "조약돌 던지기", "wood", 640], ["heracles", "사자 주먹", "fire", 275],
      ["odysseus", "꾀돌이 찌르기", "water", 275], ["arthur", "바위에서 뽑은 검", "metal", 275],
      ["threepigs", "지푸라기 던지기", "earth", 640]
    ];
    for (const [card, name, element, contact] of examples) {
      const { page, context, errors } = await open(card, { width: 1180, height: 820 });
      await page.locator("#actionList button").filter({ hasText: name }).click();
      await page.clock.runFor(contact - 65);
      let status = await page.evaluate(() => CardBattleFx.elementStatus());
      assert.equal(status.profile, element);
      assert.equal(status.contactAt, null, "no early collision");
      await page.screenshot({ path: path.join(output, element + "-flight.png") });
      await page.clock.runFor(150);
      status = await page.evaluate(() => CardBattleFx.elementStatus());
      assert.ok(status.active && status.contactAt !== null);
      assert.ok(status.width * status.height <= 420000);
      assert.ok(await page.evaluate(() => Math.abs(CardBattleFx.elementStatus().contactAt - __soundContact) < 2), "sound and impact same callback");
      const pixels = await page.evaluate(() => {
        const c = document.querySelector(".element-theater"), data = c.getContext("2d").getImageData(0, 0, c.width, c.height).data;
        let lit = 0; for (let i = 3; i < data.length; i += 4) if (data[i] > 25) lit++;
        return lit;
      });
      assert.ok(pixels > 500, "visible elemental footprint");
      await page.screenshot({ path: path.join(output, element + "-impact.png") });
      await page.clock.runFor(220);
      assert.equal(await page.evaluate(() => CardBattleFx.elementStatus().active), true, "readable afterglow");
      await page.screenshot({ path: path.join(output, element + "-tail.png") });
      await page.evaluate(() => window.dispatchEvent(new Event("pagehide")));
      assert.equal(await page.evaluate(() => CardBattleFx.elementStatus().active), false);
      assert.deepEqual(errors, []);
      console.log("PASS", element, pixels + " visible pixels", "audio synchronized");
      await context.close();
    }
    for (const viewport of [{ width: 390, height: 844 }, { width: 820, height: 1180 }]) {
      const { page, context, errors } = await open("zeus", viewport);
      await page.locator("#actionList button").filter({ hasText: "번개 창" }).click();
      await page.clock.runFor(725);
      assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1));
      if (viewport.width >= 800) assert.ok(await page.evaluate(() => document.documentElement.scrollHeight <= innerHeight + 1));
      await page.screenshot({ path: path.join(output, "layout-" + viewport.width + ".png"), fullPage: true });
      assert.deepEqual(errors, []);
      await context.close();
      console.log("PASS layout", viewport);
    }
    {
      const { page, context, errors } = await open("zeus", { width: 820, height: 1180 }, "no-preference", true);
      await page.locator('#actionList .ultimate-button').click();
      await page.clock.runFor(150);
      assert.ok(await page.locator('.arena.ultimate-spotlight').count(), 'ultimate spotlight starts');
      await page.screenshot({ path: path.join(output, 'ultimate-charge.png') });
      await page.clock.runFor(600);
      assert.ok(await page.evaluate(() => CardBattleFx.elementStatus().contactAt !== null));
      await page.screenshot({ path: path.join(output, 'ultimate-impact.png') });
      await page.evaluate(() => window.dispatchEvent(new Event('resize')));
      assert.equal(await page.locator('.arena.ultimate-spotlight').count(), 0);
      assert.equal(await page.evaluate(() => CardBattleFx.elementStatus().active), false);
      assert.deepEqual(errors, []);
      await context.close();
      console.log('PASS ultimate and resize cleanup');
    }
    const { page, context, errors } = await open("zeus", { width: 820, height: 1180 }, "reduce");
    await page.locator("#actionList button").filter({ hasText: "번개 창" }).click();
    await page.clock.runFor(50);
    assert.equal(await page.evaluate(() => CardBattleFx.elementStatus().active), false);
    assert.deepEqual(errors, []);
    await context.close();
    console.log("PASS reduced motion");
    console.log("Artifacts:", output);
  } finally { await browser.close(); server.close(); }
}
main().catch(error => { console.error(error); server.close(); process.exitCode = 1; });
