"use strict";
// 미국 여행 점검: 여섯 미니게임을 끝까지 돌리고, 열리는 순서·도장·앨범(사진 0장/1장)·새로고침 저장·한 화면 맞춤·오류 0을 본다.
// 사용: (사이트 뿌리에서) python -m http.server 8791  →  BASE=http://127.0.0.1:8791 SHOTS=<폴더> node usa/tests/smoke.cjs
const { chromium } = require("playwright");
const assert = require("node:assert/strict");
const fs = require("fs"), path = require("path"), os = require("os");

const BASE = process.env.BASE || "http://127.0.0.1:8791";
const SHOTS = process.env.SHOTS || fs.mkdtempSync(path.join(os.tmpdir(), "usa-shots-"));
fs.mkdirSync(SHOTS, { recursive: true });
const IDS = ["vegas", "park", "beverly", "santamonica", "huntington", "erewhon"];

async function fitsOneScreen(page, label) {
  const r = await page.evaluate(() => {
    const se = document.scrollingElement;
    const out = { sw: se.scrollWidth, sh: se.scrollHeight, iw: innerWidth, ih: innerHeight, off: [] };
    document.querySelectorAll("button, a, .pin, .page, .card, .kid-card").forEach(el => {
      if (!el.offsetParent && getComputedStyle(el).position !== "fixed") return;
      const b = el.getBoundingClientRect();
      if (!b.width || !b.height) return;
      if (b.left < -1 || b.top < -1 || b.right > innerWidth + 1 || b.bottom > innerHeight + 1) out.off.push((el.id || el.className || el.tagName) + " " + [b.left, b.top, b.right, b.bottom].map(Math.round).join(","));
    });
    return out;
  });
  assert.ok(r.sw <= r.iw && r.sh <= r.ih, `${label}: page scrolls (${r.sw}x${r.sh} in ${r.iw}x${r.ih})`);
  assert.deepEqual(r.off, [], `${label}: elements outside the screen`);
}

(async () => {
  const browser = await chromium.launch({ channel: "msedge", headless: true });
  const problems = [];
  // 가짜 사진은 임시 폴더에만 만든다(저장소에는 넣지 않는다).
  const tmpPhoto = path.join(fs.mkdtempSync(path.join(os.tmpdir(), "usa-photo-")), "vegas.jpg");
  try {
    for (const [vp, kid] of [[{ width: 1180, height: 820 }, "jaei"], [{ width: 820, height: 1180 }, "taeo"]]) {
      const tag = vp.width + "x" + vp.height;
      const ctx = await browser.newContext({ viewport: vp, hasTouch: true, deviceScaleFactor: 1 });
      await ctx.addInitScript(() => {
        const d = new Date();
        localStorage.setItem("hub_play_pass", JSON.stringify({ free: true, day: d.getFullYear() + "-" + String(d.getMonth() + 1).padStart(2, "0") + "-" + String(d.getDate()).padStart(2, "0") }));
      });
      const page = await ctx.newPage();
      const errors = [];
      page.on("pageerror", e => errors.push("pageerror " + e.message));
      page.on("console", m => {
        if (m.type() !== "error") return;
        const url = (m.location() && m.location().url) || "";
        if (/Failed to load resource/.test(m.text()) && /\/usa\/photos\//.test(url)) return; // 사진이 아직 없을 때의 404는 정상
        errors.push("console " + m.text() + " " + url);
      });
      page.on("response", r => { if (r.status() >= 400 && !/\/usa\/photos\//.test(r.url())) errors.push(r.status() + " " + r.url()); });

      await page.goto(BASE + "/usa/");
      await page.waitForFunction(() => window.__USA && __USA.ready);
      assert.equal(await page.evaluate(() => __USA.state.screen), "home");
      await fitsOneScreen(page, tag + " home");
      await page.screenshot({ path: path.join(SHOTS, tag + "-01-home.png") });

      await page.click(`.kid-card[data-kid="${kid}"]`);
      await page.waitForTimeout(2600); // 비행기 도착
      assert.equal(await page.evaluate(() => __USA.state.screen), "map");
      assert.equal(await page.evaluate(() => __USA.state.mode), kid === "taeo" ? "easy" : "normal", "태오=쉬움, 재이=보통이 기본");
      assert.equal(await page.locator(".pin").count(), 6);
      assert.equal(await page.locator(".pin:not(.locked)").count(), 1, "처음엔 라스베이거스만 열림");
      await fitsOneScreen(page, tag + " map");
      await page.screenshot({ path: path.join(SHOTS, tag + "-02-map.png") });
      // 잠긴 곳은 눌러도 안 열린다
      await page.click('.pin[data-id="park"]', { force: true });
      assert.equal(await page.evaluate(() => __USA.state.screen), "map");

      for (let i = 0; i < IDS.length; i++) {
        const id = IDS[i];
        await page.click(`.pin[data-id="${id}"]`);
        await page.waitForSelector("#intro:not([hidden])");
        await fitsOneScreen(page, tag + " intro " + id);
        if (i === 0) await page.screenshot({ path: path.join(SHOTS, tag + "-03-intro-" + id + ".png") });
        await page.click("#startBtn");
        await page.waitForFunction(() => __USA.state.state === "play", null, { timeout: 6000 });
        if (id === "beverly") {
          // 진짜 손가락 입력: 물건을 직접 눌러 본다
          const at = await page.evaluate(() => __USA.game.where());
          await page.mouse.click(at[0], at[1]);
          assert.equal(await page.evaluate(() => __USA.game.summary().found), 1, "베벌리힐스: 눌러서 찾기");
        }
        await page.evaluate(() => __USA.bot(true));
        await page.waitForTimeout(5500);
        await page.screenshot({ path: path.join(SHOTS, `${tag}-1${i}-${id}.png`) });
        await page.evaluate(() => __USA.bot(false));
        const out = await page.evaluate(() => __USA.sim(240));
        console.log(tag, id, JSON.stringify(out));
        assert.ok(out.res && out.res.stars >= 1 && out.res.stars <= 3, id + " finished with stars");
        assert.ok(out.t <= 130, id + " should end within ~2 minutes of play");
        await page.waitForSelector("#result:not([hidden])");
        await page.waitForTimeout(1300); // 별·도장 애니메이션
        assert.equal(await page.locator("#resultStamp:not([hidden]) svg").count(), 1, id + " first clear gives a stamp");
        await fitsOneScreen(page, tag + " result " + id);
        await page.screenshot({ path: path.join(SHOTS, `${tag}-2${i}-${id}-result.png`) });
        const save = await page.evaluate(() => __USA.save);
        assert.ok(save.places[id].stamp && save.places[id].stars >= 1, id + " saved");
        await page.click("#nextBtn");
        if (i < IDS.length - 1) {
          await page.waitForFunction(() => __USA.state.screen === "map");
          assert.equal(await page.locator(".pin:not(.locked)").count(), i + 2, "다음 장소가 하나씩 열림");
          assert.equal(await page.locator(`.pin[data-id="${IDS[i + 1]}"].next`).count(), 1, "다음 장소에 '여기!'");
        }
      }
      // 마지막 장소 → 앨범 완성 화면
      await page.waitForFunction(() => __USA.state.screen === "album");
      await page.waitForTimeout(400);
      assert.equal(await page.locator("#albumBanner:not([hidden])").count(), 1, "앨범 완성 배너");
      assert.equal(await page.locator(".stamp-slot svg").count(), 6, "도장 6개");
      assert.equal(await page.locator(".photo.has").count(), 0, "사진 0장");
      assert.equal(await page.locator(".photo .wait:visible").count(), 6, "'사진을 기다려요' 6칸");
      await fitsOneScreen(page, tag + " album");
      await page.screenshot({ path: path.join(SHOTS, tag + "-30-album-ending.png") });

      // 새로고침해도 그대로
      await page.reload();
      await page.waitForFunction(() => window.__USA && __USA.ready);
      assert.equal(await page.evaluate(() => __USA.state.screen), "map", "다녀온 아이는 지도부터");
      assert.equal(await page.locator(".pin.locked").count(), 0);
      assert.equal(await page.evaluate(() => Object.values(__USA.save.places).filter(p => p.stamp).length), 6);
      await page.screenshot({ path: path.join(SHOTS, tag + "-31-map-done.png") });

      // 사진 한 장(임시 파일)만 있을 때
      if (!fs.existsSync(tmpPhoto)) {
        const b64 = await page.evaluate(() => {
          const c = document.createElement("canvas"); c.width = 640; c.height = 480;
          const x = c.getContext("2d"); const g = x.createLinearGradient(0, 0, 640, 480);
          g.addColorStop(0, "#ff9a6b"); g.addColorStop(1, "#6b8cff"); x.fillStyle = g; x.fillRect(0, 0, 640, 480);
          x.fillStyle = "#fff"; x.font = "bold 80px sans-serif"; x.fillText("TEST", 200, 270);
          return c.toDataURL("image/jpeg", 0.8).split(",")[1];
        });
        fs.writeFileSync(tmpPhoto, Buffer.from(b64, "base64"));
      }
      await page.route("**/usa/photos/vegas.jpg", r => r.fulfill({ status: 200, contentType: "image/jpeg", body: fs.readFileSync(tmpPhoto) }));
      await page.click("#goAlbum");
      await page.waitForFunction(() => document.querySelector('.page[data-id="vegas"] .photo.has'));
      assert.equal(await page.locator(".photo.has").count(), 1, "사진 1장만 보임");
      assert.ok(await page.evaluate(() => document.querySelector('.page[data-id="vegas"] img').naturalWidth > 0));
      await fitsOneScreen(page, tag + " album photo");
      await page.screenshot({ path: path.join(SHOTS, tag + "-32-album-photo.png") });

      if (errors.length) problems.push(tag + ":\n  " + errors.join("\n  "));
      await ctx.close();
    }
    assert.deepEqual(problems, [], "console/page errors");
    console.log("ALL OK · shots:", SHOTS);
  } finally {
    await browser.close();
  }
})().catch(e => { console.error(e); process.exit(1); });
