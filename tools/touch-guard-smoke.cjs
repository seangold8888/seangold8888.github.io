"use strict";
// 공용 터치 안전장치(assets/touch-guard.js) 점검. 게임마다 조작 요소를 누른 채 뗌 신호 없이
// 손가락이 모두 떨어진 상황을 만들고, 그 요소가 pointercancel을 받는지 본다.
// 정상적으로 뗀 터치(pointerup)에는 끼어들지 않아야 한다.
const { chromium } = require("playwright"), assert = require("node:assert/strict");
const fs = require("fs"), path = require("path"), http = require("http");
const site = path.resolve(__dirname, "..");
const types = { ".html": "text/html; charset=utf-8", ".js": "text/javascript", ".mjs": "text/javascript", ".css": "text/css", ".webp": "image/webp", ".png": "image/png", ".jpg": "image/jpeg", ".mp3": "audio/mpeg", ".ogg": "audio/ogg", ".json": "application/json", ".svg": "image/svg+xml", ".glb": "model/gltf-binary", ".woff2": "font/woff2" };
const server = http.createServer((q, r) => {
  const u = decodeURIComponent(new URL(q.url, "http://x").pathname);
  let f = path.resolve(site, "." + u); if (u.endsWith("/")) f = path.join(f, "index.html");
  if (!f.startsWith(site) || !fs.existsSync(f)) { r.writeHead(404); return r.end(); }
  r.writeHead(200, { "Content-Type": types[path.extname(f)] || "application/octet-stream" }); r.end(fs.readFileSync(f));
});
const GAMES = [
  ["/hogwarts/", "[data-action]"],
  ["/kart/", "canvas"],
  ["/kart3d/", "#t-left"],
  ["/odyssey/", "canvas"],
  ["/sanguo/", "body"], // 막대기(#touch-stick)는 전투 화면에서만 생긴다. 막대기는 pointercancel에 stickUp을 건다.
];
(async () => {
  await new Promise(r => server.listen(0, "127.0.0.1", r));
  const base = "http://127.0.0.1:" + server.address().port;
  const browser = await chromium.launch({ channel: "msedge", headless: true, args: ["--use-angle=swiftshader", "--enable-unsafe-swiftshader"] });
  try {
    for (const [url, selector] of GAMES) {
      const ctx = await browser.newContext({ viewport: { width: 1180, height: 820 }, hasTouch: true });
      const page = await ctx.newPage(); const errors = [];
      page.on("pageerror", e => errors.push(e.message));
      await page.goto(base + url, { waitUntil: "domcontentloaded" });
      await page.waitForFunction(s => window.__touchGuard && document.querySelector(s), selector, { timeout: 30000 });
      const r = await page.evaluate(async (s) => {
        const wait = ms => new Promise(res => setTimeout(res, ms));
        const el = document.querySelector(s), got = [];
        el.addEventListener("pointercancel", e => got.push(e.pointerId));
        const box = el.getBoundingClientRect(), opts = id => ({ pointerId: id, pointerType: "touch", isPrimary: true, bubbles: true, cancelable: true, clientX: box.left + 10, clientY: box.top + 10 });
        // 1) 정상: 누르고 떼면 대신 취소를 보내지 않는다.
        el.dispatchEvent(new PointerEvent("pointerdown", opts(41)));
        el.dispatchEvent(new PointerEvent("pointerup", opts(41)));
        document.dispatchEvent(new TouchEvent("touchend", { touches: [], bubbles: true }));
        await wait(150);
        const afterNormal = got.slice();
        // 2) 뗌 신호가 사라짐: 손가락이 모두 떨어지면 그 요소에 취소가 온다.
        el.dispatchEvent(new PointerEvent("pointerdown", opts(42)));
        document.dispatchEvent(new TouchEvent("touchend", { touches: [], bubbles: true }));
        await wait(150);
        return { afterNormal, afterLost: got.slice(), state: window.__touchGuardState() };
      }, selector);
      console.log(url, JSON.stringify(r));
      assert.deepEqual(r.afterNormal, [], url + " must not cancel a finger that lifted normally");
      assert.deepEqual(r.afterLost, [42], url + " must cancel the lost finger");
      assert.equal(r.state.active, 0);
      // 가짜 손가락으로 누르면 setPointerCapture가 실패하는 건 점검 방식 탓이라 뺀다.
      assert.deepEqual(errors.filter(e => !/setPointerCapture|WebGL|webgl/i.test(e)), [], url + " page errors");
      await ctx.close();
    }
    console.log("PASS 사라진 손가락 뗌 신호를 5개 게임에서 대신 보낸다(정상 뗌에는 끼어들지 않음)");
  } finally { await browser.close(); server.close(); }
})().catch(e => { console.error(e); process.exitCode = 1; });
