"use strict";
// 모험 상자: 영어 읽기가 그림책을 한 쪽씩 이어 읽는지, 조용 모드면 산수로 바뀌는지 본다.
// 음성 인식은 가짜로 바꿔 화면에 뜬 문장을 그대로 "들었다"고 돌려준다.
const { chromium } = require("playwright"), assert = require("node:assert/strict");
const fs = require("fs"), path = require("path"), http = require("http");
const site = path.resolve(__dirname, "..");
const types = { ".html": "text/html; charset=utf-8", ".js": "text/javascript", ".css": "text/css", ".webp": "image/webp", ".png": "image/png", ".jpg": "image/jpeg", ".mp3": "audio/mpeg", ".json": "application/json", ".svg": "image/svg+xml" };
const server = http.createServer((q, r) => {
  const u = decodeURIComponent(new URL(q.url, "http://x").pathname);
  let f = path.resolve(site, "." + u); if (u.endsWith("/")) f = path.join(f, "index.html");
  if (!f.startsWith(site) || !fs.existsSync(f)) { r.writeHead(404); return r.end(); }
  r.writeHead(200, { "Content-Type": types[path.extname(f)] || "application/octet-stream" }); r.end(fs.readFileSync(f));
});
const books = require(path.join(site, "story/english/books.js")).books;
(async () => {
  await new Promise(r => server.listen(0, "127.0.0.1", r));
  const base = "http://127.0.0.1:" + server.address().port;
  const browser = await chromium.launch({ channel: "msedge", headless: true });
  try {
    const ctx = await browser.newContext({ viewport: { width: 820, height: 1180 } });
    await ctx.addInitScript(() => {
      // 가짜 음성 인식: 시작하면 화면의 읽을 문장을 그대로 들려준다.
      class FakeRecognition {
        constructor() { this.continuous = false; this.interimResults = false; this.lang = "en-US"; this.maxAlternatives = 1; }
        start() {
          const text = (document.querySelector(".reading-sentence") || {}).getAttribute?.("aria-label") || "";
          setTimeout(() => {
            this.onstart && this.onstart();
            this.onaudiostart && this.onaudiostart();
            const alt = { transcript: text, confidence: 0.95 };
            const result = Object.assign([alt], { isFinal: true });
            const results = Object.assign([result], { item: i => results[i] });
            result.item = i => result[i];
            this.onresult && this.onresult({ resultIndex: 0, results });
            setTimeout(() => { this.onend && this.onend(); }, 60);
          }, 80);
        }
        stop() { setTimeout(() => this.onend && this.onend(), 20); }
        abort() { this.stop(); }
      }
      window.SpeechRecognition = FakeRecognition; window.webkitSpeechRecognition = FakeRecognition;
    });
    const page = await ctx.newPage(); const errors = [];
    page.on("pageerror", e => errors.push(e.message));
    await page.goto(base + "/game/");
    await page.waitForSelector(".reading-sentence", { timeout: 20000 });
    const first = await page.evaluate(() => ({ eyebrow: document.getElementById("eyebrow")?.textContent || document.querySelector(".eyebrow")?.textContent,
      text: document.querySelector(".reading-sentence").getAttribute("aria-label"),
      img: document.querySelector(".items .story-page-art")?.getAttribute("src") }));
    console.log("first", JSON.stringify(first));
    assert.equal(first.text, books[0].pages[0].text, "첫 문제는 첫 그림책 1쪽");
    assert.match(first.img, /story\/english\/art\/picnic-1\.webp/);
    await page.waitForFunction(() => { const i = document.querySelector(".items .story-page-art"); return i && i.complete && i.naturalWidth > 0; });
    await page.screenshot({ path: path.join(require("os").tmpdir(), "hub-book-page1.png") });
    // 맞게 읽으면 다음 쪽이 나온다.
    await page.locator(".reading-actions button").first().click();
    await page.waitForFunction(t => { const s = document.querySelector(".reading-sentence"); return s && s.getAttribute("aria-label") !== t; }, books[0].pages[0].text, { timeout: 20000 });
    const second = await page.evaluate(() => document.querySelector(".reading-sentence").getAttribute("aria-label"));
    const cursor = await page.evaluate(() => JSON.parse(localStorage.getItem("hub2_book_cursor")));
    console.log("second", second, JSON.stringify(cursor));
    assert.equal(second, books[0].pages[1].text, "맞게 읽으면 2쪽");
    assert.equal(cursor.i, 1);
    // 조용 모드: 읽기 문제가 산수로 바로 바뀌고, 계속 읽기 문제가 안 나온다.
    await page.locator("#quietMode").click();
    assert.equal(await page.locator("#quietMode").getAttribute("aria-pressed"), "true");
    assert.equal(await page.locator(".reading-sentence").count(), 0, "조용 모드면 읽기 문제가 사라진다");
    await page.screenshot({ path: path.join(require("os").tmpdir(), "hub-quiet.png") });
    const quietDay = await page.evaluate(() => localStorage.getItem("hub_quiet_day"));
    assert.ok(quietDay);
    // 새로고침해도 오늘은 조용 모드, 읽기 문제 없음
    await page.reload(); await page.waitForTimeout(1500);
    assert.equal(await page.locator(".reading-sentence").count(), 0);
    assert.equal(await page.locator("#quietMode").getAttribute("aria-pressed"), "true");
    // 어제 날짜로 켜 둔 조용 모드는 오늘 꺼져 있다.
    await page.evaluate(() => localStorage.setItem("hub_quiet_day", "2000-1-1"));
    await page.reload(); await page.waitForSelector(".reading-sentence", { timeout: 20000 });
    assert.equal(await page.locator("#quietMode").getAttribute("aria-pressed"), "false");
    assert.equal(await page.evaluate(() => document.querySelector(".reading-sentence").getAttribute("aria-label")), books[0].pages[1].text, "진도는 이어진다");
    assert.deepEqual(errors, []);
    console.log("PASS 그림책 1쪽→2쪽 이어 읽기 · 조용 모드는 산수만·오늘만 · 진도 유지");
    await ctx.close();
  } finally { await browser.close(); server.close(); }
})().catch(e => { console.error(e); process.exitCode = 1; });
