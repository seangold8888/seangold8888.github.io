"use strict";
// 멈춘 사이 뗀 버튼이 남아 저절로 걷던 문제(2026-09-25, 루미가 계속 왼쪽으로 감)를 다시 막는다.
// 왼쪽을 누른 채 일시정지·보스 등장 장면으로 넘어가고, 그 사이에 손을 뗀 뒤 다시 진행하면 멈춰 있어야 한다.
// 사용법: node kedehun/tests/stuck-input.cjs [옛 index.html 경로(재현 확인용)]
const { chromium } = require("playwright"), assert = require("node:assert/strict");
const fs = require("fs"), path = require("path"), http = require("http");
const site = path.resolve(__dirname, "../..");
const override = process.argv[2] ? fs.readFileSync(process.argv[2]) : null;
const types = { ".html": "text/html; charset=utf-8", ".js": "text/javascript", ".css": "text/css", ".webp": "image/webp", ".png": "image/png", ".mp3": "audio/mpeg", ".json": "application/json" };
const server = http.createServer((q, r) => {
  const u = decodeURIComponent(new URL(q.url, "http://x").pathname);
  let f = path.resolve(site, "." + u); if (u.endsWith("/")) f = path.join(f, "index.html");
  if (override && f === path.join(site, "kedehun", "index.html")) { r.writeHead(200, { "Content-Type": types[".html"] }); return r.end(override); }
  if (!f.startsWith(site) || !fs.existsSync(f)) { r.writeHead(404); return r.end(); }
  r.writeHead(200, { "Content-Type": types[path.extname(f)] || "application/octet-stream" }); r.end(fs.readFileSync(f));
});
(async () => {
  await new Promise(r => server.listen(0, "127.0.0.1", r));
  const browser = await chromium.launch({ channel: "msedge", headless: true });
  const results = {};
  try {
    const page = await browser.newPage({ viewport: { width: 1180, height: 820 } });
    const errors = []; page.on("pageerror", e => errors.push(e.message));
    await page.goto("http://127.0.0.1:" + server.address().port + "/kedehun/");
    await page.waitForFunction(() => window.__game);
    // 원화가 준비되기 전에는 start가 그냥 돌아온다. 준비될 때까지 다시 누른다.
    await page.waitForFunction(() => { const g = window.__game; if (g.phase === "select") g.start("lumi"); return g.phase !== "select"; }, null, { timeout: 30000, polling: 500 });
    await page.evaluate(() => { const g = window.__game; if (g.phase === "story") g.finishStory(); });
    await page.waitForFunction(() => window.__game.phase === "playing", null, { timeout: 15000 });
    for (const [label, pauseIn, pauseOut] of [
      ["pause", g => g.togglePause(), g => g.togglePause()],
      ["story", g => g.playStory("sajaIntro", () => { g.phase = "playing"; }), g => g.finishStory()],
    ]) {
      // 터치: 왼쪽 누름 → 멈춤 → 손 뗌 → 다시 진행
      const moved = await page.evaluate(async ([a, b]) => {
        const g = window.__game, pauseIn = eval(a), pauseOut = eval(b), wait = n => new Promise(r => { let i = 0; const f = () => ++i >= n ? r() : requestAnimationFrame(f); requestAnimationFrame(f); });
        g.setAction("left", "touch:7", true); await wait(6);
        pauseIn(g); await wait(3);
        g.setAction("left", "touch:7", false); await wait(3);
        pauseOut(g); await wait(3);
        const x0 = g.player.x; await wait(40);
        return { held: g.input.held("left"), dx: Math.round(g.player.x - x0) };
      }, [pauseIn.toString(), pauseOut.toString()]);
      // 키보드: ← 누름 → 멈춤 → 뗌 → 다시 진행
      const key = await page.evaluate(async ([a, b]) => {
        const g = window.__game, pauseIn = eval(a), pauseOut = eval(b), wait = n => new Promise(r => { let i = 0; const f = () => ++i >= n ? r() : requestAnimationFrame(f); requestAnimationFrame(f); });
        window.dispatchEvent(new KeyboardEvent("keydown", { code: "ArrowLeft" })); await wait(6);
        pauseIn(g); await wait(3);
        window.dispatchEvent(new KeyboardEvent("keyup", { code: "ArrowLeft" })); await wait(3);
        pauseOut(g); await wait(3);
        const x0 = g.player.x; await wait(40);
        return { held: g.input.held("left"), dx: Math.round(g.player.x - x0) };
      }, [pauseIn.toString(), pauseOut.toString()]);
      results[label] = { touch: moved, key };
    }
    // 뗀 신호를 아예 못 받은 경우(아이패드 모서리 제스처): 손가락이 모두 떨어지면 풀려야 한다.
    results.lost = await page.evaluate(async () => {
      const g = window.__game, wait = ms => new Promise(r => setTimeout(r, ms));
      g.setAction("left", "touch:9", true); await wait(150);
      document.dispatchEvent(new TouchEvent("touchend", { touches: [], bubbles: true }));
      await wait(200);
      const x0 = g.player.x; await wait(600);
      return { held: g.input.held("left"), dx: Math.round(g.player.x - x0) };
    });
    // 버튼 밖에서 끝난 손가락
    results.outside = await page.evaluate(async () => {
      const g = window.__game, wait = ms => new Promise(r => setTimeout(r, ms));
      g.setAction("right", "touch:11", true); await wait(100);
      window.dispatchEvent(new PointerEvent("pointerup", { pointerId: 11, pointerType: "touch", bubbles: true }));
      await wait(50);
      return { held: g.input.held("right") };
    });
    // 톡 쳐서 공격은 그대로 되어야 한다(버튼 처리가 먼저).
    results.tap = await page.evaluate(async () => {
      const g = window.__game, wait = ms => new Promise(r => setTimeout(r, ms));
      const el = document.getElementById("touchAttack"), before = g.player.attackSerial;
      el.dispatchEvent(new PointerEvent("pointerdown", { pointerId: 21, pointerType: "touch", bubbles: true, cancelable: true }));
      await wait(60);
      el.dispatchEvent(new PointerEvent("pointerup", { pointerId: 21, pointerType: "touch", bubbles: true }));
      document.dispatchEvent(new TouchEvent("touchend", { touches: [], bubbles: true }));
      await wait(400);
      return { attacked: g.player.attackSerial > before };
    });
    console.log(JSON.stringify(results));
    if (!override) {
      for (const label of ["pause", "story"]) { const r = results[label];
        assert.equal(r.touch.held, false, label + " touch left still held");
        assert.ok(Math.abs(r.touch.dx) < 6, label + " touch drift " + r.touch.dx);
        assert.equal(r.key.held, false, label + " key left still held");
        assert.ok(Math.abs(r.key.dx) < 6, label + " key drift " + r.key.dx);
      }
      assert.equal(results.lost.held, false, "lost pointerup must be released when no finger remains");
      assert.ok(Math.abs(results.lost.dx) < 6, "lost pointerup drift " + results.lost.dx);
      assert.equal(results.outside.held, false, "a finger lifted outside the button releases it");
      assert.equal(results.tap.attacked, true, "a quick tap still attacks");
      assert.deepEqual(errors, []);
      console.log("PASS 멈춘 사이 뗀 왼쪽 버튼이 남지 않는다(터치·키보드, 일시정지·장면)");
    }
  } finally { await browser.close(); server.close(); }
})().catch(e => { console.error(e); process.exitCode = 1; });
