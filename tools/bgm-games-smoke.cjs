"use strict";
// 게임마다 Lyria 배경음악 파일이 실제로 요청되고 재생되는지 진짜 브라우저로 확인한다.
// 각 게임은 첫 조작 뒤에 음악을 시작하므로, 화면을 누르고 시작 버튼이 보이면 눌러 본다.
const { chromium } = require("playwright");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const http = require("node:http");

const root = path.resolve(__dirname, "..");
const mime = {
  ".html": "text/html; charset=utf-8", ".js": "application/javascript", ".css": "text/css",
  ".json": "application/json", ".webp": "image/webp", ".png": "image/png", ".jpg": "image/jpeg",
  ".mp3": "audio/mpeg", ".ogg": "audio/ogg", ".wav": "audio/wav", ".svg": "image/svg+xml",
  ".woff2": "font/woff2", ".glb": "model/gltf-binary"
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

const GAMES = [
  { url: "/game/", track: "hub.mp3", name: "모험 상자" },
  { url: "/cards/", track: "cards-menu.mp3", name: "J&T Adventure" },
  { url: "/princess/", track: "princess.mp3", name: "공주 옷장" },
  { url: "/bori/", track: "bori.mp3", name: "보리 젬" },
  { url: "/odyssey/", track: "odyssey.mp3", name: "오디세이", starters: ["시작", "모험", "출발"] },
  { url: "/hogwarts/", track: "hogwarts.mp3", name: "호그와트", starters: ["시작", "입학", "출발"] },
  { url: "/kedehun/", track: "kedehun.mp3", name: "케데헌", selectors: ["#startBtn"], starters: ["무대 출격", "시작"] },
  { url: "/kart/", track: "kart.mp3", name: "카트", starters: ["시작", "출발", "레이스"] },
  { url: "/kart3d/", track: "kart3d.mp3", name: "3D 카트", starters: ["시작", "출발", "레이스"] }
];

async function poke(page, starters, selectors) {
  await page.mouse.click(10, 10).catch(() => null);
  const box = page.viewportSize();
  await page.mouse.click(Math.round(box.width / 2), Math.round(box.height / 2)).catch(() => null);
  for (const selector of selectors || []) {
    const node = page.locator(selector).first();
    if (await node.count().catch(() => 0)) await node.click({ timeout: 2000 }).catch(() => null);
  }
  for (const label of starters || []) {
    const button = page.getByText(label, { exact: false }).first();
    if (await button.count().catch(() => 0)) {
      await button.click({ timeout: 2000 }).catch(() => null);
    }
  }
  await page.keyboard.press("Enter").catch(() => null);
  await page.keyboard.press("Space").catch(() => null);
}

(async () => {
  await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
  const base = "http://127.0.0.1:" + server.address().port;
  const browser = await chromium.launch({
    channel: "msedge", headless: true, args: ["--autoplay-policy=no-user-gesture-required"]
  });
  const failures = [];
  try {
    for (const game of GAMES) {
      const context = await browser.newContext({ viewport: { width: 820, height: 1180 } });
      const page = await context.newPage();
      const played = new Set();
      const errors = [];
      page.on("pageerror", (error) => errors.push(String(error)));
      page.on("response", (response) => {
        const name = new URL(response.url()).pathname.split("/").pop();
        if (/\.mp3$/i.test(name) && response.status() === 200) played.add(name);
      });
      // 모험 상자는 문제를 푸는 동안 음악을 멈추므로 티켓을 받은 상태로 연다.
      if (game.url === "/game/") await page.addInitScript(()=>{const d=new Date();if(!sessionStorage.getItem("seeded")){localStorage.setItem("hub2_date",d.getFullYear()+"-"+(d.getMonth()+1)+"-"+d.getDate());localStorage.setItem("hub2_solved","10");localStorage.setItem("hub2_credit","1");localStorage.setItem("hub2_parent_mode","0");sessionStorage.setItem("seeded","1");}});
      await page.goto(base + game.url, { waitUntil: "domcontentloaded" });
      await page.waitForTimeout(1200);
      for (let round = 0; round < 6 && !played.has(game.track); round += 1) {
        await poke(page, game.starters, game.selectors);
        await page.waitForTimeout(1500);
      }
      const ok = played.has(game.track);
      const audioErrors = errors.filter((text) => /bgm|audio|HubBgm/i.test(text));
      console.log((ok ? "PASS " : "FAIL ") + game.name + " · " + game.track +
        (ok ? "" : " · 받은 곡: " + ([...played].join(",") || "없음")) +
        (audioErrors.length ? " · 오류 " + audioErrors[0].slice(0, 80) : ""));
      if (!ok || audioErrors.length) failures.push(game.name);
      await context.close();
    }
  } finally {
    await browser.close();
    if (server.closeAllConnections) server.closeAllConnections();
    await new Promise((resolve) => server.close(resolve));
  }
  assert.deepEqual(failures, [], "배경음악이 나오지 않은 게임: " + failures.join(", "));
  console.log("모든 게임에서 배경음악 파일이 재생됐어요");
})().catch((error) => { console.error(error.message || error); process.exitCode = 1; });
