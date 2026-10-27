"use strict";
// 미국 여행 점검: 여섯 미니게임을 끝까지 돌리고(디즈니랜드는 줄 서기·놀이기구 다섯 중 셋, 다시 하기로 나머지 둘까지), 열리는 순서·도장·앨범(사진 0장/1장)·새로고침 저장·놀이기구 도감·한 화면 맞춤·오류 0을 본다.
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

// 디즈니랜드 놀이기구 하루: 다섯 중에 고르기 → 줄 서기(말풍선·떼쓰기·⚡ 라이트닝 패스) → 타고, 세 번이면 하루 끝. 진짜 손가락 입력도 섞는다.
async function playPark(page, tag, ORDER, everBefore) {
  const shot = n => page.screenshot({ path: path.join(SHOTS, `${tag}-park-${n}.png`) });
  const G = f => page.evaluate(f);
  // 조건이 될 때까지 1/60초씩 빨리 돌린다(bot=봇이 대신 누름)
  const ff = (cond, bot = true, max = 90) => page.evaluate(([c, b, m]) => {
    const g = __USA.game, f = new Function("g", "return " + c);
    let i = 0;
    while (!f(g) && i < m * 60) { if (b) g.bot(1 / 60); g.update(1 / 60); i++; }
    return f(g) ? i / 60 : -1;
  }, [cond, bot, max]);
  const phase = () => G(() => __USA.game.summary().phase);
  assert.equal(await phase(), "menu", "park starts at the ride menu");
  const menu0 = await G(() => __USA.game.menuCards());
  assert.equal(menu0.length, 5, "menu shows all five rides");
  assert.deepEqual(menu0.filter(c => c.ever).map(c => c.id).sort(), [...everBefore].sort(), "ride collection on the menu");
  assert.ok(menu0.every(c => !c.ridden), "a new day: nothing ridden yet");
  const vw = await G(() => [innerWidth, innerHeight]);
  for (const c of menu0) assert.ok(c.x - c.w / 2 >= 0 && c.x + c.w / 2 <= vw[0] && c.y - c.h / 2 >= 70 && c.y + c.h / 2 <= vw[1], "menu card on screen: " + c.id);
  await page.waitForTimeout(400);
  await shot("01-menu");
  for (let k = 0; k < 3; k++) {
    const cardsNow = await G(() => __USA.game.menuCards());
    if (k > 0) {
      // 이미 탄 카드는 '탔다!' 그대로, 다시 눌러도 줄이 안 생긴다
      const old = cardsNow.find(c => c.id === ORDER[0]);
      assert.ok(old.ridden, "ridden ride is marked");
      await page.mouse.click(old.x, old.y);
      assert.equal(await phase(), "menu", "a ride already ridden today can't be picked again");
    }
    const c = cardsNow.find(c => c.id === ORDER[k]);
    await page.mouse.click(c.x, c.y);
    assert.equal(await phase(), "queue", ORDER[k] + ": tapping a card starts its queue");
    if (k === 0) {
      await page.waitForFunction(() => __USA.game.queueInfo().bubbles.length > 0, null, { timeout: 8000 });
      await page.waitForTimeout(600);
      await shot("02-queue-bubble");
      const b = (await G(() => __USA.game.queueInfo())).bubbles[0];
      await page.mouse.click(b.x, b.y);
      assert.ok((await G(() => __USA.game.queueInfo())).cheered >= 1, "tapping a grumble bubble cheers the kid up");
      await G(() => __USA.game.queueMeter(0.995));
      await page.waitForFunction(() => __USA.game.queueInfo().state === "melt", null, { timeout: 3000 });
      await page.waitForTimeout(1900);
      await shot("03-queue-meltdown");
      await page.waitForFunction(() => __USA.game.queueInfo().state === "wait", null, { timeout: 6000 });
      const qi = await G(() => __USA.game.queueInfo());
      assert.equal(qi.melts, 1, "full grumble meter = one meltdown, then back to waiting (no fail)");
      assert.ok(qi.meter < 0.5, "meter resets after the meltdown");
    }
    const before = await G(() => __USA.game.queueInfo());
    assert.ok(before.canPass, "lightning pass ready");
    await page.mouse.click(before.button.x, before.button.y);
    assert.equal((await G(() => __USA.game.queueInfo())).passes, 0, "lightning pass used");
    if (k === 0) { await page.waitForTimeout(350); await shot("04-lightning-zip"); }
    await page.waitForTimeout(k === 0 ? 1000 : 1300);
    if (k === 0) await shot("05-lightning-joke");
    const after = await G(() => __USA.game.queueInfo());
    assert.ok(after.minutes < before.minutes, `wait sign drops (${before.minutes} -> ${after.minutes})`);
    assert.ok(await ff('g.queueInfo() && g.queueInfo().state === "board"') >= 0, "queue reaches the front");
    await page.waitForTimeout(450);
    await shot(`0${6 + k}-finally-${ORDER[k]}`);
    assert.ok(await ff('g.summary().phase === "ride"') >= 0);
    assert.ok(await ff('g.rideInfo().stage === "play"', false) >= 0);
    const W = await G(() => innerWidth), H = await G(() => innerHeight);
    if (ORDER[k] === "racers") {
      await page.mouse.move(W / 2, H * 0.55); await page.mouse.down();
      let ri = await G(() => __USA.game.rideInfo());
      assert.ok(ri.hold && ri.lane === 0, "racers: hold = accelerate, finger height = lane");
      await page.mouse.up();
      assert.equal((await G(() => __USA.game.rideInfo())).hold, false, "racers: letting go stops accelerating");
    } else if (ORDER[k] === "space") {
      assert.ok(await ff("g.rideInfo().blasts.some(b => b.x < innerWidth - 60 && b.x > innerWidth * 0.45)", false, 10) >= 0, "space: blasts come");
      const bl = (await G(() => __USA.game.rideInfo())).blasts.find(b => b.x < W - 60 && b.x > W * 0.45);
      const d0 = (await G(() => __USA.game.rideInfo())).deflected;
      await page.mouse.click(bl.x, bl.y);
      assert.ok((await G(() => __USA.game.rideInfo())).deflected > d0, "space: tapping a blast deflects it");
    } else if (ORDER[k] === "pan") {
      await page.mouse.click(W / 2, H * 0.3);
      assert.ok(Math.abs((await G(() => __USA.game.rideInfo())).ty - H * 0.3) < 2, "pan: ship flies to the finger height");
    } else if (ORDER[k] === "toy") {
      await playToy(page, G, ff, shot);
    } else if (ORDER[k] === "web") {
      await playWeb(page, G, ff, shot);
    }
    await G(() => __USA.bot(true));
    await page.waitForTimeout(4500);
    await shot(`1${k}-ride-${ORDER[k]}`);
    await G(() => __USA.bot(false));
    if (ORDER[k] === "racers") {
      assert.ok(await ff('g.rideInfo().race', true) >= 0);
      await page.waitForTimeout(300);
      await shot("13-racers-race");
    }
    if (ORDER[k] === "space") {
      assert.ok(await ff('g.rideInfo().time > 13.2') >= 0);
      await page.waitForTimeout(200);
      await shot("14-space-outside");
    }
    if (ORDER[k] === "pan") {
      assert.ok(await ff('g.rideInfo().p > 0.8') >= 0);
      await page.waitForTimeout(200);
      await shot("15-pan-neverland");
    }
    if (ORDER[k] === "toy") {
      assert.ok(await ff('g.rideInfo().stage === "final"') >= 0, "toy: three booths then the scoreboard");
      await page.waitForTimeout(1600);
      await shot("16-toy-scoreboard");
      const ti = await G(() => __USA.game.rideInfo());
      assert.ok(ti.score > 0 && ti.buddy > 0, "toy: both kids scored (vs sibling)");
    }
    if (ORDER[k] === "web") {
      assert.ok(await ff('g.rideInfo().stage === "outro"') >= 0, "web: every robot caught");
      await page.waitForTimeout(700);
      await shot("17-web-all-caught");
      const wi = await G(() => __USA.game.rideInfo());
      assert.equal(wi.mine + wi.theirs, wi.cap, "web: caught them all");
      assert.ok(wi.spawned >= wi.cap, "web: robots multiplied up to the cap");
    }
    assert.ok(await ff('g.summary().phase !== "ride"') >= 0, ORDER[k] + " ride finishes");
    const sum = await G(() => __USA.game.summary());
    assert.ok(sum.rides[ORDER[k]] >= 1 && sum.rides[ORDER[k]] <= 3, ORDER[k] + " scored");
    console.log(tag, "park", ORDER[k], JSON.stringify(sum.rides), "cheered", sum.cheered);
    if (k === 1) { await page.waitForTimeout(500); await shot("09-menu-two-ridden"); }
  }
  assert.equal(await phase(), "fire", "after three rides: fireworks finale");
  const fin = await G(() => __USA.game.summary());
  assert.equal(Object.keys(fin.rides).length, 3, "the day is three rides, not five");
  return fin;
}

// 토이스토리: 부스 셋(접시·풍선·고리)에서 진짜로 과녁을 콕콕
async function playToy(page, G, ff, shot) {
  const info = () => G(() => __USA.game.rideInfo());
  const pickT = async () => {
    const vw = await G(() => [innerWidth, innerHeight]);
    const list = (await info()).targets.filter(t => t.x > 70 && t.x < vw[0] - 70 && t.y > 150);
    list.sort((a, b) => Math.abs(a.x - vw[0] / 2) - Math.abs(b.x - vw[0] / 2));
    return list[0];
  };
  assert.equal((await info()).boothId, "plates");
  await page.waitForTimeout(300);
  for (let n = 0; n < 2; n++) {
    const tg = await pickT();
    assert.ok(tg, "toy: a target to tap");
    const h0 = (await info()).hits;
    await page.mouse.click(tg.x, tg.y);
    assert.equal((await info()).hits, h0 + 1, "toy: tapping a plate hits it");
  }
  const ti = await info();
  assert.ok(ti.combo >= 2, "toy: quick hits make a combo (" + ti.combo + ")");
  assert.ok(ti.score >= 300, "toy: combo points");
  const vh = await G(() => [innerWidth, innerHeight]);
  await page.mouse.click(vh[0] / 2, vh[1] * 0.735 + 6); // 계산대(과녁 없는 곳)
  assert.ok((await info()).misses >= 1, "toy: tapping empty space is just a miss");
  await page.waitForTimeout(250);
  await shot("16a-toy-plates");
  for (const [b, id] of [[1, "balloons"], [2, "rings"]]) {
    assert.ok(await ff(`g.rideInfo().booth === ${b} && g.rideInfo().stage === "play" && g.rideInfo().targets.length >= 3`, true) >= 0, "toy: car spins to booth " + id);
    assert.equal((await info()).boothId, id);
    await G(() => __USA.bot(false));
    const tg = await pickT();
    const h0 = (await info()).hits;
    await page.mouse.click(tg.x, tg.y);
    assert.equal((await info()).hits, h0 + 1, "toy: tap in booth " + id);
    if (b === 2) { await page.waitForTimeout(350); await shot("16b-toy-rings"); }
    else { await page.waitForTimeout(150); await shot("16b-toy-balloons"); }
  }
}

// 스파이더맨: 로봇을 콕(거미줄 휙), 손가락으로 쓱 그어 끈끈이 거미줄 줄줄이
async function playWeb(page, G, ff, shot) {
  const info = () => G(() => __USA.game.rideInfo());
  assert.ok(await ff("g.rideInfo().robots.length >= 3", false, 10) >= 0, "web: runaway robots appear");
  const near = async () => {
    const vw = await G(() => [innerWidth, innerHeight]);
    const list = (await info()).robots.filter(b => b.x > 220 && b.x < vw[0] - 220 && b.y > 160);
    return list[0] || (await info()).robots[0];
  };
  let b = await near();
  const m0 = (await info()).mine;
  await page.mouse.click(b.x, b.y);
  assert.equal((await info()).mine, m0 + 1, "web: tapping a robot catches it");
  // 쓱 긋기: 거미줄이 줄줄이 날아가고 빗나간 건 끈끈이 덫이 된다
  assert.ok(await ff("g.rideInfo().robots.length >= 2", false, 10) >= 0);
  b = await near();
  const m1 = (await info()).mine;
  await page.mouse.move(b.x - 150, b.y);
  await page.mouse.down();
  await page.mouse.move(b.x + 70, b.y, { steps: 8 });
  assert.equal((await info()).fingers, 1, "web: finger tracked while swiping");
  await page.mouse.up();
  const after = await info();
  assert.ok(after.mine > m1, "web: a swipe through a robot catches it");
  assert.ok(after.traps >= 1, "web: missed webs stick as traps");
  assert.equal(after.fingers, 0, "web: lifting the finger releases it");
  // 로봇이 늘어나게 잠깐 두고 화면 보기
  await page.waitForTimeout(2600);
  const mid = await info();
  if (mid.robots.length) { const r = mid.robots[0]; await page.mouse.click(r.x, r.y); }
  await page.waitForTimeout(120);
  await shot("17a-web-play");
  assert.ok((await info()).spawned > 3, "web: robots multiply");
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
        if (id === "park") await playPark(page, tag, ["toy", "web", "racers"], []);
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

      // 놀이기구 도감은 새로고침 뒤에도 남는다 → 디즈니랜드 다시 하기: 안 탄 두 개(스타워즈·피터팬)를 고른다
      assert.deepEqual([...(await page.evaluate(() => __USA.save.memo.parkRides))].sort(), ["racers", "toy", "web"], "ride collection saved");
      await page.click('.pin[data-id="park"]');
      await page.waitForSelector("#intro:not([hidden])");
      await page.click("#startBtn");
      await page.waitForFunction(() => __USA.state.state === "play", null, { timeout: 6000 });
      const day2 = await playPark(page, tag + "-day2", ["space", "pan", "toy"], ["racers", "toy", "web"]);
      assert.equal(day2.ever.length, 5, "collection complete 5/5");
      const out2 = await page.evaluate(() => __USA.sim(240));
      assert.ok(out2.res && out2.res.stars >= 1 && /도감 5\/5/.test(out2.res.text), "replay result shows the full collection");
      console.log(tag, "park day2", JSON.stringify(out2));
      await page.waitForSelector("#result:not([hidden])");
      await page.waitForTimeout(900);
      await page.screenshot({ path: path.join(SHOTS, tag + "-33-park-day2-result.png") });
      await page.click("#nextBtn");
      await page.waitForFunction(() => __USA.state.screen === "map");
      assert.equal((await page.evaluate(() => __USA.save.memo.parkRides)).length, 5);

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
