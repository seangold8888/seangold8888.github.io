"use strict";
// 영어 그림책: 책장 → 책 열기 → 뜻 숨김/보기 → 듣기 → 끝까지 넘기기 → 다 읽음 표시를 진짜 브라우저로 확인한다.
const { chromium } = require("playwright");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const http = require("node:http");
const os = require("node:os");

const root = path.resolve(__dirname, "..");
const books = require("../story/english/books.js").books;
const shots = fs.mkdtempSync(path.join(os.tmpdir(), "english-books-"));
const mime = { ".html": "text/html; charset=utf-8", ".js": "application/javascript", ".css": "text/css", ".json": "application/json",
  ".webp": "image/webp", ".png": "image/png", ".mp3": "audio/mpeg" };
const server = http.createServer((req, res) => {
  const pathname = decodeURIComponent(new URL(req.url, "http://x").pathname);
  const file = path.resolve(root, "." + pathname + (pathname.endsWith("/") ? "index.html" : ""));
  if (!file.startsWith(root + path.sep)) { res.writeHead(403); return res.end(); }
  fs.readFile(file, (error, data) => {
    res.writeHead(error ? 404 : 200, { "Content-Type": mime[path.extname(file)] || "application/octet-stream" });
    res.end(error ? "" : data);
  });
});

(async () => {
  // 모든 쪽의 그림과 낭독 파일이 있어야 한다.
  for (const book of books) {
    for (const page of book.pages) {
      assert.ok(fs.existsSync(path.join(root, "cards/art", page.art + ".webp")), book.id + " 그림 " + page.art);
      assert.ok(fs.existsSync(path.join(root, "story/english", page.audio)), "낭독 " + page.audio);
    }
  }
  await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
  const base = "http://127.0.0.1:" + server.address().port;
  const browser = await chromium.launch({ channel: "msedge", headless: true, args: ["--autoplay-policy=no-user-gesture-required"] });
  try {
    for (const viewport of [{ width: 390, height: 844 }, { width: 820, height: 1180 }]) {
      const context = await browser.newContext({ viewport });
      const page = await context.newPage();
      const errors = [], audio = [];
      page.on("pageerror", (e) => errors.push(String(e)));
      page.on("response", (r) => { if (/\/story\/english\/audio\/.+\.mp3$/.test(new URL(r.url()).pathname)) audio.push(r.status()); });
      await page.goto(base + "/story/english/");
      await page.waitForSelector(".book");
      assert.equal(await page.locator(".book").count(), books.length);
      await page.screenshot({ path: path.join(shots, viewport.width + "-shelf.png") });
      await page.locator(".book").first().click();
      await page.waitForSelector(".page .text");
      assert.equal(await page.locator(".page .text").innerText(), books[0].pages[0].text);
      assert.equal(await page.locator(".page .meaning").isHidden(), true, "뜻은 처음에 숨는다");
      await page.locator(".page .show").click();
      assert.equal(await page.locator(".page .meaning").innerText(), books[0].pages[0].meaning);
      await page.locator(".page .listen").click();
      await page.waitForFunction(() => document.querySelector(".page .text.playing") || true);
      await page.waitForTimeout(600);
      assert.ok(audio.length > 0 && audio.every((s) => s === 200), "낭독 응답 " + audio.join(","));
      await page.locator(".page .read").click();
      await page.waitForSelector(".practice .reading-sentence");
      await page.screenshot({ path: path.join(shots, viewport.width + "-page.png") });
      for (let i = 0; i < books[0].pages.length; i++) await page.locator("#nextBtn").click();
      await page.waitForSelector(".finish");
      assert.match(await page.locator(".finish h2").innerText(), /The End/);
      await page.locator("#nextBtn").click();
      await page.waitForSelector(".book .done");
      assert.equal(await page.locator(".book .done").count(), 1);
      assert.deepEqual(errors, []);
      await context.close();
      console.log("PASS", viewport, "책장 · 뜻 숨김/보기 · 낭독 · 따라 읽기 열림 · 끝까지 · 다 읽음 표시");
    }
    // 입구: 이야기 극장과 모험 상자
    const context = await browser.newContext({ viewport: { width: 820, height: 1180 } });
    const page = await context.newPage();
    await page.goto(base + "/story/");
    assert.equal(await page.locator('a.english-books[href="english/"]').count(), 1);
    await page.goto(base + "/game/");
    assert.equal(await page.locator('a.shop[href="story/english/"]').count(), 1);
    await context.close();
    console.log("PASS 이야기 극장·모험 상자 입구");
    console.log("SCREENSHOTS", shots);
  } finally {
    await browser.close();
    if (server.closeAllConnections) server.closeAllConnections();
    await new Promise((resolve) => server.close(resolve));
  }
})().catch((error) => { console.error(error.message || error); process.exitCode = 1; });
