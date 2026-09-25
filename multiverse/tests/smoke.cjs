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
      // 드론 비눗방울은 화면에 그려지고, 때리면 터진다. 새 무기(축구공·잠자리채)도 실제로 맞힌다.
      const shots = await page.evaluate(() => {
        const s = __MV.state; s.best = { "city:boss": 1 }; s.owned.push("weapon-ball", "weapon-net");
        s.outfit[s.hero].weapon = "weapon-ball"; __MV.setState(s);
        __MV.start(1, 0);
        return true;
      });
      await page.waitForFunction(() => __MV.game && __MV.game.running, null, { timeout: 8000 });
      const bubble = await page.evaluate(() => {
        const g = __MV.game;
        g.enemies.length = 0; g.cages.forEach(c => { c.freed = true; });
        g.spawnT = 99; g.maxEnemies = 0;
        const d = { kind: "enemy", type: "drone", def: __MV.data.ENEMIES.drone, x: 900, y: 640, z: 120, vx: 0, facing: -1, hp: 999, maxHp: 999, st: "windup", t: 0.59, cd: 0, flash: 0, slow: 0, kbx: 0, dmg: 5, dead: 0 };
        g.enemies.push(d);
        __MV.step(0.05);
        const shot = g.shots.find(x => x.owner === "enemy");
        if (!shot) return { made: false };
        const info = { made: true, kind: shot.kind, type: shot.type };
        // 주인공을 방울 앞에 세우고 때린다(드론은 치운다).
        g.enemies.length = 0;
        const p = g.player; p.x = shot.x - 60; p.y = shot.y; p.facing = 1; p.st = "idle";
        window.dispatchEvent(new KeyboardEvent("keydown", { code: "KeyJ" }));
        __MV.step(0.4);
        info.popped = !g.shots.includes(shot);
        // 축구공: 멀리 있는 적에게 날아가 맞힌다.
        const target = { kind: "enemy", type: "tin", def: __MV.data.ENEMIES.tin, x: p.x + 500, y: p.y, z: 0, vx: 0, facing: -1, hp: 500, maxHp: 500, st: "walk", t: 0, cd: 9, flash: 0, slow: 0, kbx: 0, dmg: 1, dead: 0 };
        g.enemies.push(target); p.st = "idle"; p.comboT = 0;
        window.dispatchEvent(new KeyboardEvent("keydown", { code: "KeyJ" }));
        __MV.step(0.2);
        info.ball = g.shots.some(x => x.type === "ball") || target.hp < 500;
        __MV.step(1);
        info.ballHit = target.hp < 500;
        return info;
      });
      console.log(tag, "bubble/ball", JSON.stringify(bubble));
      // 막대기를 끄는 중에 뗌 신호를 놓쳐도(아이패드 모서리 제스처) 손가락이 다 떨어지면 멈춘다.
      const stuck = await page.evaluate(async () => {
        const wait = ms => new Promise(r => setTimeout(r, ms));
        const zone = document.getElementById("stickZone"), r = zone.getBoundingClientRect();
        const x = r.left + 120, y = r.bottom - 120;
        zone.dispatchEvent(new PointerEvent("pointerdown", { pointerId: 31, pointerType: "touch", clientX: x, clientY: y, bubbles: true, cancelable: true }));
        zone.dispatchEvent(new PointerEvent("pointermove", { pointerId: 31, pointerType: "touch", clientX: x - 60, clientY: y, bubbles: true }));
        await wait(80);
        const p = __MV.game.player, held = p.st;
        document.dispatchEvent(new TouchEvent("touchend", { touches: [], bubbles: true }));
        await wait(150);
        const x0 = p.x; __MV.step(0.5);
        return { whileHeld: held, dx: Math.round(p.x - x0) };
      });
      console.log(tag, "stick", JSON.stringify(stuck));
      assert.ok(Math.abs(stuck.dx) < 5, "막대기가 끌린 채 남으면 안 된다: " + stuck.dx);
      assert.ok(bubble.made && bubble.kind === "shot" && bubble.type === "bubble", "드론이 비눗방울을 쏜다");
      assert.ok(bubble.popped, "비눗방울은 때리면 터진다");
      assert.ok(bubble.ball && bubble.ballHit, "불꽃 축구공이 날아가 맞힌다");
      await page.screenshot({ path: path.join(out, tag + "-ball.png") });
      await page.evaluate(() => { const g = __MV.game; g.time = 0; });
      await page.waitForSelector("#result:not([hidden])", { timeout: 8000 });
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
