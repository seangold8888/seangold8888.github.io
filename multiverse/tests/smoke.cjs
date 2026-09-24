"use strict";
// 멀티버스 2 점검: 첫 화면·세 미션·옷장·캡슐이 오류 없이 돌고, 미션이 끝까지 진행되는지 본다.
const { chromium } = require("playwright"), assert = require("node:assert/strict");
const fs = require("fs"), path = require("path"), http = require("http"), os = require("os");
const site = path.resolve(__dirname, "../..");
const types = { ".html": "text/html; charset=utf-8", ".js": "text/javascript", ".css": "text/css", ".webp": "image/webp", ".png": "image/png", ".mp3": "audio/mpeg", ".ico": "image/x-icon", ".json": "application/json" };
const server = http.createServer((q, r) => {
  const u = decodeURIComponent(new URL(q.url, "http://x").pathname);
  let f = path.resolve(site, "." + u); if (u.endsWith("/")) f = path.join(f, "index.html");
  if (!f.startsWith(site) || !fs.existsSync(f)) { r.writeHead(404); return r.end(); }
  r.writeHead(200, { "Content-Type": types[path.extname(f)] || "application/octet-stream" }); r.end(fs.readFileSync(f));
});
const out = fs.mkdtempSync(path.join(os.tmpdir(), "multiverse-"));
(async () => {
  await new Promise(r => server.listen(0, "127.0.0.1", r));
  const base = "http://127.0.0.1:" + server.address().port;
  const browser = await chromium.launch({ channel: "msedge", headless: true });
  try {
    for (const viewport of [{ width: 1180, height: 820 }, { width: 844, height: 390 }]) {
      const ctx = await browser.newContext({ viewport, hasTouch: true });
      await ctx.addInitScript(() => {
        const d = new Date();
        localStorage.setItem("hub_play_pass", JSON.stringify({ free: true, day: d.getFullYear() + "-" + String(d.getMonth() + 1).padStart(2, "0") + "-" + String(d.getDate()).padStart(2, "0") }));
      });
      const page = await ctx.newPage(); const errors = [], missing = [];
      page.on("pageerror", e => errors.push(e.message));
      page.on("response", r => { if (r.status() >= 400) missing.push(r.status() + " " + r.url()); });
      await page.goto(base + "/multiverse/");
      await page.waitForFunction(() => window.__MV && [...document.images].every(i => i.complete));
      const tag = viewport.width + "x" + viewport.height;
      await page.screenshot({ path: path.join(out, tag + "-home.png") });
      // 태오로 바꿔 보고 다시 재이
      await page.locator('.hero-card[data-kid="taeo"]').click();
      assert.equal(await page.evaluate(() => __MV.state.hero), "taeo");
      await page.locator('.hero-card[data-kid="yunchan"]').click();
      assert.equal(await page.evaluate(() => __MV.state.buddy), "yungeon", "윤찬의 짝꿍은 윤건");
      await page.locator('.buddy-chip[data-kid="taeo"]').click();
      assert.equal(await page.evaluate(() => __MV.state.buddy), "taeo");
      assert.equal(await page.locator(".hero-card").count(), 4);
      await page.screenshot({ path: path.join(out, tag + "-home4.png") });
      await page.locator("#goMap").click();
      assert.equal(await page.locator(".world").count(), 4);
      assert.equal(await page.locator(".mission-btn:not([disabled])").count(), 1, "처음엔 첫 미션만 열린다");
      await page.screenshot({ path: path.join(out, tag + "-map.png") });
      // 세 미션 모두: 인트로 → 진행 → 결과
      for (const mission of [0, 1, 2]) {
        await page.evaluate(m => __MV.start(0, m), mission);
        await page.waitForFunction(() => __MV.game && __MV.game.running, null, { timeout: 8000 });
        // 주인공이 계속 가까운 적을 때리게 한다(자동 점검).
        await page.evaluate(() => {
          window.__auto = setInterval(() => {
            const g = __MV.game; if (!g || !g.running) return;
            window.dispatchEvent(new KeyboardEvent("keydown", { code: "KeyJ" }));
            if (g.player.meter >= 100) window.dispatchEvent(new KeyboardEvent("keydown", { code: "KeyK" }));
          }, 120);
        });
        await page.waitForTimeout(2500);
        await page.screenshot({ path: path.join(out, tag + "-mission" + mission + ".png") });
        // 남은 시간을 빨리 돌린다: 동료와 주인공이 싸우는 계산을 그대로 돌린다.
        const summary = await page.evaluate(() => {
          const g = __MV.game;
          for (let i = 0; i < 95 * 60 && !g.over; i++) {
            // 주인공을 가장 가까운 목표로 데려간다.
            const t = (g.boss && g.boss.st !== "dead" ? [g.boss] : []).concat(g.cages.filter(c => !c.freed), g.enemies.filter(e => e.st !== "dead"), g.sparks);
            const p = g.player;
            if (t.length) { const n = t.sort((a, b) => Math.abs(a.x - p.x) - Math.abs(b.x - p.x))[0]; p.x += Math.sign(n.x - p.x) * 4; p.y += Math.sign(n.y - p.y) * 2; }
            if (i % 8 === 0) window.dispatchEvent(new KeyboardEvent("keydown", { code: "KeyJ" }));
            __MV.step(1 / 60);
          }
          __MV.step(3);
          return { over: g.over, stars: g.stars, freed: g.freed, collected: g.collected, boss: g.boss ? g.boss.hp : null, time: Math.round(g.time), php: g.player.hp };
        });
        await page.evaluate(() => clearInterval(window.__auto));
        console.log(tag, "mission", mission, JSON.stringify(summary));
        assert.ok(summary.over, "미션이 끝나야 한다");
        await page.waitForSelector("#result:not([hidden])", { timeout: 5000 });
        await page.screenshot({ path: path.join(out, tag + "-result" + mission + ".png") });
      }
      // 별을 넉넉히 주고 캡슐 → 옷장
      await page.evaluate(() => { const s = __MV.state; s.stars = 12; __MV.setState(s); });
      await page.locator("#goCapsule").click();
      await page.locator("#openCapsule").click();
      await page.waitForSelector("#capsulePrize:not([hidden])", { timeout: 4000 });
      const owned = await page.evaluate(() => __MV.state.owned.length);
      await page.screenshot({ path: path.join(out, tag + "-capsule.png") });
      await page.locator("#wearPrize").click();
      await page.waitForSelector("#wardrobe:not([hidden])");
      await page.waitForTimeout(300);
      await page.screenshot({ path: path.join(out, tag + "-wardrobe.png") });
      assert.ok(owned >= 7, "캡슐로 조각이 늘어야 한다");
      assert.deepEqual(errors, []);
      assert.deepEqual(missing.filter(m => !/bgm|favicon/.test(m)), []);
      await ctx.close();
      console.log("PASS", tag);
    }
  } finally { await browser.close(); server.close(); }
  console.log("SCREENSHOTS", out);
})().catch(e => { console.error(e); process.exitCode = 1; });
