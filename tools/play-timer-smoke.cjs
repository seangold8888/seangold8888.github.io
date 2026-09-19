"use strict";
// 게임 시간(티켓 1장 = 5분)이 진짜 브라우저에서 지켜지는지 확인한다.
// 자동 점검 브라우저에서는 시간 제한이 꺼지므로 hub_play_timer_force 로 켠 채 본다.
const { chromium } = require("playwright");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const http = require("node:http");

const root = path.resolve(__dirname, "..");
const mime = {
  ".html": "text/html; charset=utf-8", ".js": "application/javascript", ".css": "text/css",
  ".json": "application/json", ".webp": "image/webp", ".png": "image/png", ".jpg": "image/jpeg",
  ".mp3": "audio/mpeg", ".ogg": "audio/ogg", ".wav": "audio/wav", ".svg": "image/svg+xml", ".woff2": "font/woff2"
};
const server = http.createServer((req, res) => {
  const pathname = decodeURIComponent(new URL(req.url, "http://x").pathname);
  const file = path.resolve(root, "." + pathname + (pathname.endsWith("/") ? "index.html" : ""));
  if (!file.startsWith(root + path.sep)) { res.writeHead(403); return res.end(); }
  fs.readFile(file, (error, data) => {
    res.writeHead(error ? 404 : 200, { "Content-Type": mime[path.extname(file)] || "application/octet-stream" });
    res.end(error ? "" : data);
  });
});
const GAMES = ["cards", "hogwarts", "bori", "avengers", "kart", "kart3d", "princess", "odyssey", "kedehun", "sanguo"];

(async () => {
  await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
  const base = "http://127.0.0.1:" + server.address().port;
  const browser = await chromium.launch({ channel: "msedge", headless: true });
  const fresh = async (pass) => {
    const context = await browser.newContext({ viewport: { width: 820, height: 1180 } });
    await context.addInitScript((value) => {
      localStorage.setItem("hub_play_timer_force", "1");
      if (value === "none") {
        if (!sessionStorage.getItem("seeded")) { localStorage.removeItem("hub_play_pass"); sessionStorage.setItem("seeded", "1"); }
      } else if (value) {
        const pass = typeof value.inMs === "number" ? { until: Date.now() + value.inMs } : value;
        if (!sessionStorage.getItem("seeded")) { localStorage.setItem("hub_play_pass", JSON.stringify(pass)); sessionStorage.setItem("seeded", "1"); }
      }
    }, pass);
    return context;
  };
  try {
    // 1. 시간이 없으면 10개 게임 모두 막힌다.
    for (const game of GAMES) {
      const context = await fresh("none");
      const page = await context.newPage();
      await page.goto(base + "/" + game + "/", { waitUntil: "domcontentloaded" });
      await page.waitForSelector(".hub-play-over", { timeout: 15000 });
      assert.match(await page.locator(".hub-play-over h2").innerText(), /티켓이 필요/);
      assert.equal(new URL(await page.locator(".hub-play-over a").getAttribute("href")).pathname, "/game/");
      await context.close();
    }
    console.log("PASS 시간 없이 연 게임 10개 모두 막힘 · 모험 상자로 안내");

    // 2. 남은 시간 표시, 1분 전 경고
    {
      const context = await fresh({ inMs: 70000 });
      const page = await context.newPage();
      await page.goto(base + "/kart/", { waitUntil: "domcontentloaded" });
      await page.waitForSelector(".hub-play-chip");
      assert.match(await page.locator(".hub-play-chip").innerText(), /⏱ 1:(0\d|1\d)/);
      assert.equal(await page.locator(".hub-play-over").count(), 0);
      assert.equal(await page.locator(".hub-play-chip.is-warn").count(), 0);
      await page.waitForSelector(".hub-play-chip.is-warn", { timeout: 20000 });
      assert.match(await page.locator(".hub-play-chip").innerText(), /곧 끝나요/);
      await context.close();
      console.log("PASS 남은 시간 표시 · 1분 전 경고");
    }

    // 3. 시간이 끝나면 막고 10초 뒤 모험 상자로 돌아간다.
    {
      const context = await fresh({ inMs: 2500 });
      const page = await context.newPage();
      await page.goto(base + "/odyssey/", { waitUntil: "domcontentloaded" });
      await page.waitForSelector(".hub-play-over", { timeout: 15000 });
      assert.match(await page.locator(".hub-play-over h2").innerText(), /시간이 끝났어요/);
      await page.waitForURL("**/game/", { timeout: 20000 });
      await context.close();
      console.log("PASS 시간 끝 → 막힘 → 10초 뒤 모험 상자로 이동");
    }

    // 4. 자유 모험(하루 100문제·부모님)이면 제한 없음
    {
      const context = await fresh(null);
      const page = await context.newPage();
      await page.addInitScript(() => {
        const d = new Date(), day = d.getFullYear() + "-" + String(d.getMonth() + 1).padStart(2, "0") + "-" + String(d.getDate()).padStart(2, "0");
        localStorage.setItem("hub_play_pass", JSON.stringify({ free: true, day, until: 0 }));
      });
      await page.goto(base + "/kedehun/", { waitUntil: "domcontentloaded" });
      await page.waitForTimeout(2000);
      assert.equal(await page.locator(".hub-play-over").count(), 0);
      assert.equal(await page.locator(".hub-play-chip").count(), 0);
      await context.close();
      console.log("PASS 자유 모험은 시간 제한 없음");
    }

    // 5. 대시보드: 티켓 1장을 쓰면 5분, 남은 시간이 있으면 다음 게임은 티켓 없이 들어간다.
    {
      const context = await fresh("none");
      const page = await context.newPage();
      await page.goto(base + "/game/", { waitUntil: "domcontentloaded" });
      await page.waitForFunction(() => window.HubPlayTimer);
      // 오늘 10문제를 풀어 티켓 1장을 받은 상태
      await page.evaluate(() => {
        const d = new Date();
        localStorage.setItem("hub2_date", d.getFullYear() + "-" + (d.getMonth() + 1) + "-" + d.getDate());
        localStorage.setItem("hub2_solved", "10");
        localStorage.setItem("hub2_credit", "1");
        localStorage.setItem("hub2_parent_mode", "0");
      });
      await page.reload({ waitUntil: "domcontentloaded" });
      await page.waitForFunction(() => window.HubPlayTimer);
      const beforeCredit = await page.evaluate(() => localStorage.getItem("hub2_credit"));
      assert.equal(beforeCredit, "1", "티켓 1장 준비");
      await page.locator('a.card[href="kart/"]').click();
      await page.waitForURL("**/kart/");
      const pass = await page.evaluate(() => JSON.parse(localStorage.getItem("hub_play_pass")));
      const left = pass.until - Date.now();
      assert.ok(left > 280000 && left <= 300000, "5분: " + left);
      assert.equal(await page.evaluate(() => localStorage.getItem("hub2_credit")), "0");
      await page.waitForSelector(".hub-play-chip");
      assert.match(await page.locator(".hub-play-chip").innerText(), /⏱ [45]:\d\d/);
      // 모험 상자로 돌아가 다른 게임을 고르면 남은 시간으로 들어가고 티켓을 더 쓰지 않는다.
      await page.goto(base + "/game/", { waitUntil: "domcontentloaded" });
      await page.waitForFunction(() => window.HubPlayTimer);
      assert.match(await page.locator("#hubTicketStat").innerText(), /게임 [45]:\d\d 남음/);
      await page.locator('a.card[href="kart3d/"]').click();
      await page.waitForURL("**/kart3d/");
      const again = await page.evaluate(() => JSON.parse(localStorage.getItem("hub_play_pass")));
      assert.equal(again.until, pass.until, "남은 시간으로 들어가면 시간이 늘지 않는다");
      await context.close();
      console.log("PASS 티켓 1장 = 5분 · 남은 시간으로 다른 게임 입장 · 티켓 추가 소모 없음");
    }
  } finally {
    await browser.close();
    if (server.closeAllConnections) server.closeAllConnections();
    await new Promise((resolve) => server.close(resolve));
  }
  console.log("게임 시간 점검 모두 통과");
})().catch((error) => { console.error(error); process.exitCode = 1; });
