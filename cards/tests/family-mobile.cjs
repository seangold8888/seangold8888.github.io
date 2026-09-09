"use strict";

const { chromium } = require("C:/Users/김시현/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright");
const fs = require("node:fs");
const http = require("node:http");
const path = require("node:path");
const assert = require("node:assert/strict");

const root = path.resolve(__dirname, "../..");
const mime = {
  ".html": "text/html",
  ".js": "application/javascript",
  ".css": "text/css",
  ".json": "application/json",
  ".png": "image/png",
  ".webp": "image/webp"
};
const server = http.createServer((request, response) => {
  const url = new URL(request.url, "http://localhost");
  const file = path.resolve(
    root,
    "." + decodeURIComponent(url.pathname) + (url.pathname.endsWith("/") ? "index.html" : "")
  );
  if (!file.startsWith(root + path.sep)) {
    response.writeHead(403).end();
    return;
  }
  try {
    response.setHeader("Content-Type", mime[path.extname(file)] || "application/octet-stream");
    response.end(fs.readFileSync(file));
  } catch (error) {
    response.writeHead(404).end();
  }
});

(async () => {
  await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
  const browser = await chromium.launch({ headless: true });
  try {
    {
      const context = await browser.newContext({
        viewport: { width: 768, height: 900 },
        serviceWorkers: "block"
      });
      const page = await context.newPage();
      await page.goto("http://127.0.0.1:" + server.address().port + "/cards/");
      await page.locator('[data-card-id="taeo"]').waitFor();
      const lockState = () => page.evaluate(() => Object.fromEntries(
        ["jaei", "taeo", "appa", "eomma"].map((id) => [
          id,
          document.querySelector('[data-card-id="' + id + '"]').classList.contains("is-locked")
        ])
      ));
      assert.deepEqual(await lockState(), { jaei: true, taeo: true, appa: true, eomma: true });

      const setMathDays = (days) => page.evaluate((wanted) => {
        const stamps = {};
        const cursor = new Date();
        let count = 0;
        while (count < wanted) {
          if (cursor.getDay() !== 0) {
            const key = [
              cursor.getFullYear(),
              String(cursor.getMonth() + 1).padStart(2, "0"),
              String(cursor.getDate()).padStart(2, "0")
            ].join("-");
            stamps[key] = 1;
            count += 1;
          }
          cursor.setDate(cursor.getDate() - 1);
        }
        localStorage.setItem("math10_state", JSON.stringify({ stamps, planDays: 6 }));
      }, days);

      await setMathDays(3);
      await page.reload();
      await page.locator('[data-card-id="taeo"]').waitFor();
      assert.deepEqual(await lockState(), { jaei: true, taeo: false, appa: true, eomma: true });
      await setMathDays(7);
      await page.reload();
      await page.locator('[data-card-id="jaei"]').waitFor();
      assert.deepEqual(await lockState(), { jaei: false, taeo: false, appa: false, eomma: false });
      console.log("math streak unlock · 0/3/7 days passed");
      await context.close();
    }

    for (const viewport of [{ width: 375, height: 667 }, { width: 390, height: 844 }]) {
      const context = await browser.newContext({
        viewport,
        hasTouch: true,
        isMobile: true,
        serviceWorkers: "block"
      });
      const page = await context.newPage();
      const errors = [];
      page.on("pageerror", (error) => errors.push(error.message));
      await page.goto(
        "http://127.0.0.1:" + server.address().port +
        "/cards/?preview=all&card=taeo&battle=1"
      );
      await page.locator("#actionList .action-button").first().waitFor();
      const report = await page.evaluate(() => {
        const list = document.getElementById("actionList");
        const buttons = [...list.querySelectorAll(".action-button")];
        const image = document.querySelector("#playerCardSlot .card-art img");
        return {
          viewportHeight: innerHeight,
          pageHeight: document.documentElement.scrollHeight,
          count: buttons.length,
          scrollable: list.classList.contains("is-scrollable"),
          clientWidth: list.clientWidth,
          scrollWidth: list.scrollWidth,
          listHeight: list.getBoundingClientRect().height,
          minHeight: Math.min(...buttons.map((button) => button.getBoundingClientRect().height)),
          imageLoaded: Boolean(image && image.complete && image.naturalWidth === 1024 && image.naturalHeight === 1536)
        };
      });
      console.log(viewport.width + "x" + viewport.height, report);
      assert.deepEqual(errors, []);
      assert.equal(report.count, 7);
      assert.equal(report.scrollable, true);
      assert.ok(report.scrollWidth > report.clientWidth);
      assert.ok(report.minHeight >= 59);
      assert.ok(report.listHeight <= 90, "7개 버튼은 세로로 화면을 밀지 않고 한 줄이어야 한다");
      assert.equal(report.imageLoaded, true);

      await page.locator("#actionList").evaluate((list) => {
        list.scrollLeft = list.scrollWidth;
      });
      const lastVisible = await page.locator("#actionList .action-button").last().evaluate((button) => {
        const item = button.getBoundingClientRect();
        const list = button.parentElement.getBoundingClientRect();
        return item.left >= list.left - 1 && item.right <= list.right + 1;
      });
      assert.equal(lastVisible, true);
      console.log(
        viewport.width + "x" + viewport.height +
        " · 7 buttons · horizontal scroll " + report.clientWidth + "/" + report.scrollWidth +
        " · page " + report.pageHeight
      );
      await context.close();
    }
  } finally {
    await browser.close();
    server.close();
  }
})().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
