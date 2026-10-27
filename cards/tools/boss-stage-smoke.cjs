"use strict";
// 보스전 무대·오늘의 보스 브라우저 검사. 강제 체력/승패는 이 검사 안에서만 쓴다.
// 사용: node cards/tools/boss-stage-smoke.cjs [스크린샷 폴더]
const {chromium} = require("playwright");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const http = require("node:http");
const os = require("node:os");
const path = require("node:path");
const C = require("../js/campaign.js");
const root = path.resolve(__dirname, "../..");
const output = process.argv[2] ? path.resolve(process.argv[2]) : fs.mkdtempSync(path.join(os.tmpdir(), "boss-stage-"));
fs.mkdirSync(output, {recursive: true});
const mime = {".html":"text/html", ".js":"application/javascript", ".css":"text/css", ".json":"application/json", ".webp":"image/webp", ".png":"image/png", ".mp3":"audio/mpeg", ".wav":"audio/wav", ".svg":"image/svg+xml"};
const server = http.createServer((req, res) => {
  let pathname;
  try {pathname = decodeURIComponent(new URL(req.url, "http://local").pathname);} catch (_) {res.writeHead(400); return res.end();}
  const file = path.resolve(root, "." + pathname + (pathname.endsWith("/") ? "index.html" : ""));
  if (!file.startsWith(root + path.sep)) {res.writeHead(403); return res.end();}
  fs.readFile(file, (error, data) => {
    res.writeHead(error ? 404 : 200, {"Content-Type": mime[path.extname(file)] || "application/octet-stream"});
    res.end(error ? "not found" : data);
  });
});
function progressAt(chapter, stage) {
  let p = C.finishIntro(C.createProgress());
  const win = () => { p = C.beginBattle(p, C.availableParty(p)[0]); p = C.finishBattle(p, p.battleSerial, "player"); };
  for (let ch = 0; ch < chapter; ch++) {
    if (ch > 0) { p = C.finishIntro(p); p = C.selectParty(p, ["jaei", "taeo", C.CHAPTERS[ch - 1].recruit]); }
    while (p.phase !== "restore") win();
    if (ch === 7) while (p.endingScene < 3) p = C.advanceEnding(p);
    p = C.finishChapter(p);
  }
  if (chapter > 0 && chapter <= 7) { p = C.finishIntro(p); p = C.selectParty(p, ["jaei", "taeo", C.CHAPTERS[chapter - 1].recruit]); }
  for (let s = 0; s < stage; s++) win();
  return p;
}
async function main() {
  await new Promise(resolve => server.listen(0, "127.0.0.1", resolve));
  const base = "http://127.0.0.1:" + server.address().port;
  const browser = await chromium.launch({headless: true, channel: "msedge"});
  const allErrors = [];
  async function open(progress) {
    const context = await browser.newContext({viewport: {width: 1180, height: 820}, serviceWorkers: "block", hasTouch: true});
    await context.addInitScript(seed => {
      if (!sessionStorage.getItem("seeded")) {localStorage.setItem("card_campaign", JSON.stringify(seed)); sessionStorage.setItem("seeded", "1");}
      let engine;
      Object.defineProperty(window, "CardEngine", {configurable: true, get: () => engine, set(value) {
        engine = {...value,
          createGame(...args) {const state = value.createGame(...args); window.__testGame = state; return state;},
          performAction(...args) {
            const state = value.performAction(...args);
            if (window.__enemyHp != null && !state.winner) {state.sides.enemy.hp = window.__enemyHp; window.__enemyHp = null;}
            if (window.__testWinner) state.winner = window.__testWinner;
            window.__testGame = state;
            return state;
          }};
      }});
    }, progress);
    const page = await context.newPage();
    page.setDefaultTimeout(15000);
    const errors = [];
    page.on("pageerror", error => errors.push(String(error)));
    page.on("console", message => { if (message.type() === "error") errors.push("console: " + message.text()); });
    await page.goto(base + "/cards/");
    await page.waitForFunction(() => document.querySelectorAll(".card-gallery-item").length === 90);
    return {context, page, errors};
  }
  async function fitsOneScreen(page, label) {
    const size = await page.evaluate(() => ({h: document.documentElement.scrollHeight, w: document.documentElement.scrollWidth, ih: innerHeight, iw: innerWidth}));
    assert.ok(size.h <= size.ih + 1 && size.w <= size.iw + 1, label + " fits 1180x820: " + JSON.stringify(size));
  }
  async function skipScenes(page) {
    for (let i = 0; i < 10 && await page.locator(".expedition-scene").count(); i++) {
      await page.locator(".expedition-scene .expedition-page-controls .primary-button").click();
    }
  }
  async function enabledActions(page) {
    return page.locator("#actionList button:not(:disabled)").count();
  }
  async function act(page) {
    await page.locator("#actionList button:not(:disabled)").first().click();
  }
  async function waitPlayerTurn(page) {
    await page.waitForFunction(() => document.querySelectorAll("#actionList button:not(:disabled)").length > 0 || document.getElementById("resultDialog").open, null, {timeout: 20000});
    if (await page.locator("#coinDialog").isVisible()) { await page.locator("#coinButton").click(); }
  }
  try {
    // 1) 원정 보스전: 등장 장면 → 체력 막대 → 화남 → 격파 도장.
    const boss = await open(progressAt(3, 3));
    let page = boss.page;
    await page.locator("#campaignButton").click();
    await page.locator(".expedition-map-footer .primary-button").click();
    await skipScenes(page);
    await page.locator('.expedition-deploy [data-card-id="jaei"]').click();
    await page.locator(".boss-intro").waitFor();
    assert.equal(await enabledActions(page), 0, "actions wait for the boss intro");
    assert.match(await page.locator(".boss-intro-name").innerText(), /케르베로스/);
    assert.match(await page.locator(".boss-intro-kicker").innerText(), /보스 등장/);
    await page.waitForTimeout(900);
    await fitsOneScreen(page, "boss intro");
    await page.screenshot({path: path.join(output, "boss-1-intro.png")});
    await page.locator(".boss-intro").click();
    await page.locator(".boss-intro").waitFor({state: "detached"});
    assert.ok(await enabledActions(page) > 0, "tap skips the intro and returns the turn");
    const bar = page.locator(".boss-hp");
    assert.ok(await bar.isVisible());
    const max = await page.evaluate(() => __testGame.sides.enemy.card.hp);
    assert.equal(await bar.locator(".boss-hp-value").innerText(), max + " / " + max);
    assert.equal(await bar.getAttribute("data-phase"), "calm");
    console.log("PASS boss intro blocks then hands back the turn; HP bar", max);
    // 반 아래로 내려가면 화남 알림 한 번.
    const rageHp = Math.floor(max * 0.4);
    await page.evaluate(hp => { window.__enemyHp = hp; }, rageHp);
    await act(page);
    await page.locator(".boss-banner").waitFor({timeout: 5000});
    assert.match(await page.locator(".boss-banner").innerText(), /케르베로스가 화났어요/);
    assert.ok(await page.evaluate(() => document.querySelector(".arena").classList.contains("is-boss-rage")));
    assert.equal(await bar.getAttribute("data-phase"), "rage");
    await page.waitForTimeout(250);
    await fitsOneScreen(page, "rage banner");
    await page.screenshot({path: path.join(output, "boss-2-rage.png")});
    console.log("PASS boss rage banner at", rageHp, "/", max);
    await waitPlayerTurn(page);
    await page.locator(".boss-banner").waitFor({state: "detached", timeout: 3000});
    // 이기면 결과 창 전에 격파 도장.
    await page.evaluate(() => { window.__testWinner = "player"; });
    await act(page);
    await page.locator(".boss-defeat").waitFor({timeout: 6000});
    assert.match(await page.locator(".boss-defeat-stamp").innerText(), /보스 격파/);
    assert.ok(!await page.locator("#resultDialog").isVisible(), "stamp shows before the result dialog");
    await page.waitForTimeout(500);
    await page.screenshot({path: path.join(output, "boss-3-defeat.png")});
    await page.locator("#resultDialog").waitFor({state: "visible", timeout: 4000});
    assert.equal(await page.locator("#resultKicker").innerText(), "보스 격파");
    assert.equal(await page.locator("#rematchButton").innerText(), "다음으로 →");
    await page.locator("#rematchButton").click();
    assert.equal(await page.locator(".boss-hp, .boss-defeat, .boss-intro").count(), 0, "stage cleaned after leaving");
    assert.deepEqual(boss.errors, []);
    allErrors.push(...boss.errors);
    console.log("PASS boss defeat stamp → result → restore scene");
    await boss.context.close();

    // 2) 보통 상대에는 보스 무대가 없다.
    const plain = await open(progressAt(3, 0));
    page = plain.page;
    await page.locator("#campaignButton").click();
    await page.locator(".expedition-map-footer .primary-button").click();
    await skipScenes(page);
    await page.locator('.expedition-deploy [data-card-id="jaei"]').click();
    await page.waitForTimeout(400);
    assert.equal(await page.locator(".boss-hp, .boss-intro").count(), 0);
    assert.ok(await enabledActions(page) > 0);
    assert.deepEqual(plain.errors, []);
    console.log("PASS ordinary encounter has no boss stage");
    await plain.context.close();

    // 3) 오늘의 보스: 원정을 끝낸 뒤 왕관 모으기.
    const done = await open(progressAt(8, 0));
    page = done.page;
    const daily = await page.evaluate(() => CardBossStage.dailyBoss(CardBossStage.localDay(new Date())).id);
    await page.locator("#campaignButton").click();
    const dailyButton = page.locator(".expedition-daily-boss");
    assert.equal(await dailyButton.getAttribute("data-boss-id"), daily);
    await fitsOneScreen(page, "completed map with daily boss");
    await dailyButton.click();
    assert.equal(await page.locator(".boss-shelf-item").count(), 7);
    assert.equal(await page.locator(".boss-challenge-party .expedition-card").count(), 4);
    assert.deepEqual(await page.locator(".boss-challenge-party .expedition-card").evaluateAll(nodes => nodes.slice(0, 2).map(n => n.dataset.cardId)), ["jaei", "taeo"]);
    assert.match(await page.locator(".boss-challenge-reward").innerText(), /왕관 \+1/);
    await fitsOneScreen(page, "boss challenge room");
    await page.screenshot({path: path.join(output, "boss-4-daily.png")});
    async function winChallenge(cardIndex) {
      await page.locator(".boss-challenge-party .expedition-card").nth(cardIndex).click();
      await page.locator(".boss-intro").waitFor();
      await page.locator(".boss-intro").click();
      await page.locator(".boss-intro").waitFor({state: "detached"});
      await page.evaluate(() => { window.__testWinner = "player"; });
      await act(page);
      await page.locator("#resultDialog").waitFor({state: "visible", timeout: 6000});
      const text = await page.locator("#resultText").innerText();
      assert.equal(await page.locator("#rematchButton").innerText(), "보스 도전실로 →");
      await page.evaluate(() => { window.__testWinner = null; });
      await page.locator("#rematchButton").click();
      return text;
    }
    assert.match(await winChallenge(0), /왕관 \+1/);
    assert.equal(await page.evaluate(id => JSON.parse(localStorage.getItem("card_boss_crowns")).crowns[id], daily), 1);
    assert.match(await page.locator(`.boss-shelf-item[data-boss-id="${daily}"] .boss-shelf-crowns`).innerText(), /👑×1/);
    assert.match(await page.locator(".boss-challenge-reward").innerText(), /오늘 왕관을 받았어요/);
    assert.match(await winChallenge(1), /연습 승리/);
    assert.equal(await page.evaluate(id => JSON.parse(localStorage.getItem("card_boss_crowns")).crowns[id], daily), 1, "one crown per day");
    const progressAfter = await page.evaluate(() => JSON.parse(localStorage.getItem("card_campaign")));
    assert.equal(progressAfter.phase, "complete", "challenge never touches expedition progress");
    // 다른 보스는 연습 대결이다.
    const other = await page.locator(".boss-shelf-item:not(.is-daily)").first().getAttribute("data-boss-id");
    await page.locator(`.boss-shelf-item[data-boss-id="${other}"]`).click();
    assert.match(await page.locator(".boss-challenge-target .eyebrow").innerText(), /연습 대결/);
    await page.locator(".expedition-header .ghost-button").click();
    assert.match(await page.locator(".expedition-daily-boss").innerText(), /✓/);
    assert.deepEqual(done.errors, []);
    console.log("PASS daily boss crown once per day, practice bosses, progress untouched");
    await done.context.close();
    console.log("SCREENSHOTS", output);
  } finally {
    await browser.close();
    server.close();
  }
}
main().catch(error => { console.error(error); process.exitCode = 1; server.close(); });
