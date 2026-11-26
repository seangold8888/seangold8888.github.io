"use strict";
// 히어로즈 폰 화면 점검: 폰 세로 375x667·390x844, 폰 가로 667x375·844x390·932x430, 아이패드 768x1024·1024x768, PC 1366x1024.
// 폰: 모든 화면(첫 화면·지도·인트로·미션·멈춤·문제·결과·옷장·캡슐)이 스크롤 없이 화면 안, 버튼 44px 이상,
//     미션 중 글자 판(HUD)과 조작 버튼이 안 겹치고 주인공이 충분히 크게 보이며, 두 손가락(이동+공격) 터치가 먹고
//     손가락을 다 떼면 막대기가 풀린다. 콘솔 오류 0.
// 아이패드·PC: BASELINE=<폴더>가 있으면 예전 그림과 픽셀 비교(BASELINE_WRITE=1이면 지금 그림을 기준으로 저장).
// BASE=http://127.0.0.1:8000 처럼 떠 있는 정적 서버를 쓸 수 있고, 없으면 자체 서버를 띄운다. SHOTS=<폴더>면 스크린샷 저장.
// SOFT=1이면 실패를 모아서 마지막에 보여 준다(고치기 전 상태 기록용).
let pw; try { pw = require("playwright"); } catch (e) { pw = require("playwright-core"); }
const { chromium } = pw;
const assert = require("node:assert/strict"), http = require("node:http"), fs = require("node:fs"), path = require("node:path");
const root = path.resolve(__dirname, "../.."), shots = process.env.SHOTS || "", baseline = process.env.BASELINE || "";
const writeBase = process.env.BASELINE_WRITE === "1", soft = process.env.SOFT === "1";
if (shots) fs.mkdirSync(shots, { recursive: true });
if (baseline) fs.mkdirSync(baseline, { recursive: true });
const TYPES = { ".html": "text/html; charset=utf-8", ".js": "application/javascript", ".mjs": "application/javascript", ".css": "text/css", ".json": "application/json",
  ".png": "image/png", ".jpg": "image/jpeg", ".webp": "image/webp", ".svg": "image/svg+xml", ".mp3": "audio/mpeg", ".ico": "image/x-icon" };
const server = http.createServer((req, res) => {
  const p = decodeURIComponent(new URL(req.url, "http://local").pathname), file = path.resolve(root, "." + p + (p.endsWith("/") ? "index.html" : ""));
  if (!file.startsWith(root + path.sep)) { res.writeHead(403); return res.end(); }
  fs.readFile(file, (e, d) => { res.writeHead(e ? 404 : 200, { "Content-Type": TYPES[path.extname(file)] || "application/octet-stream" }); res.end(e ? "missing" : d); });
});
const ONLY = (process.env.ONLY || "").split(",").filter(Boolean);
const SIZES = [[375, 667], [390, 844], [667, 375], [844, 390], [932, 430], [768, 1024], [1024, 768], [1366, 1024]]
  .filter(([w, h]) => !ONLY.length || ONLY.includes(w + "x" + h));
const isPhone = (w, h) => w <= 540 || h <= 500;
const failures = [];
function check(ok, msg) {
  if (ok) return;
  if (soft) { failures.push(msg); console.log("  FAIL", msg); } else assert.fail(msg);
}

(async () => {
  let base = process.env.BASE;
  if (!base) { await new Promise(r => server.listen(0, "127.0.0.1", r)); base = "http://127.0.0.1:" + server.address().port; }
  const browser = await chromium.launch({ channel: "msedge", headless: true });
  // PNG 두 장을 픽셀로 비교하는 빈 페이지
  const cmpPage = await browser.newPage();
  async function pixelDiff(a, b) {
    return cmpPage.evaluate(async ([a, b]) => {
      const load = src => new Promise((ok, bad) => { const i = new Image(); i.onload = () => ok(i); i.onerror = bad; i.src = src; });
      const [ia, ib] = await Promise.all([load(a), load(b)]);
      if (ia.width !== ib.width || ia.height !== ib.height) return { size: [ia.width, ia.height, ib.width, ib.height], diff: -1 };
      const read = im => { const c = document.createElement("canvas"); c.width = im.width; c.height = im.height; const g = c.getContext("2d"); g.drawImage(im, 0, 0); return g.getImageData(0, 0, im.width, im.height).data; };
      const da = read(ia), db = read(ib); let diff = 0;
      for (let i = 0; i < da.length; i += 4) if (da[i] !== db[i] || da[i + 1] !== db[i + 1] || da[i + 2] !== db[i + 2]) diff++;
      return { diff, total: da.length / 4 };
    }, ["data:image/png;base64," + a.toString("base64"), "data:image/png;base64," + b.toString("base64")]);
  }
  const pixelReport = [];
  try {
    for (const [w, h] of SIZES) {
      const phone = isPhone(w, h), portrait = h > w, tag = (phone ? (portrait ? "p" : "l") : "t") + w + "x" + h;
      console.log("==", tag, phone ? "phone" : "tablet/desktop");
      const context = await browser.newContext({ viewport: { width: w, height: h }, isMobile: phone, hasTouch: true, deviceScaleFactor: phone ? 2 : 1, serviceWorkers: "block" });
      await context.addInitScript(() => {
        if (!sessionStorage.getItem("mvps-init")) { localStorage.clear(); sessionStorage.setItem("mvps-init", "1"); }
        const d = new Date();
        localStorage.setItem("hub_play_pass", JSON.stringify({ free: true, day: d.getFullYear() + "-" + String(d.getMonth() + 1).padStart(2, "0") + "-" + String(d.getDate()).padStart(2, "0") }));
        localStorage.setItem("mv2_muted", "1");
        // 같은 그림이 나오게 난수를 고정한다.
        let s = 20261120; Math.random = () => { s = (s + 0x6D2B79F5) | 0; let t = Math.imul(s ^ (s >>> 15), 1 | s); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
        window.__seed = n => { s = n; };
        // 픽셀 비교 때는 애니메이션 시계를 멈춘다(옷장 미리보기의 흔들림 등).
        const raf = window.requestAnimationFrame.bind(window);
        window.requestAnimationFrame = cb => raf(ts => cb(window.__frozenT != null ? window.__frozenT : ts));
      });
      const p = await context.newPage(), errors = [];
      p.on("pageerror", e => errors.push("pageerror: " + e.message));
      p.on("console", m => { if (m.type() === "error") errors.push("console: " + m.text()); });
      p.on("response", r => { if (r.status() >= 400) errors.push(r.status() + " " + r.url()); });
      await p.goto(base + "/multiverse/");
      await p.waitForFunction(() => window.__MV && [...document.images].every(i => i.complete));
      await p.evaluate(() => document.fonts && document.fonts.ready);
      const tap = async loc => { await loc.scrollIntoViewIfNeeded().catch(() => {}); return loc.tap(); };
      const snap = async (name, opts) => {
        const buf = await p.screenshot(Object.assign({ animations: "disabled", caret: "hide" }, opts || {}));
        if (shots) fs.writeFileSync(path.join(shots, tag + "-" + name + ".png"), buf);
        return buf;
      };
      // 아이패드·PC: 예전 그림과 똑같은지
      const pixel = async (name) => {
        const buf = await snap(name);
        if (phone || !baseline) return;
        const f = path.join(baseline, tag + "-" + name + ".png");
        if (writeBase) { fs.writeFileSync(f, buf); return; }
        if (!fs.existsSync(f)) { check(false, tag + " no baseline for " + name); return; }
        const r = await pixelDiff(fs.readFileSync(f), buf);
        pixelReport.push(tag + " " + name + " diff=" + r.diff);
        check(r.diff === 0, tag + " " + name + " differs from baseline: " + JSON.stringify(r));
      };
      // 지금 보이는 화면 점검: 스크롤 없음, 버튼이 화면 안·44px 이상
      const fit = async (sel, what) => {
        const g = await p.evaluate((sel) => {
          const box = e => { const r = e.getBoundingClientRect(); return { t: (e.getAttribute("aria-label") || e.textContent || e.id).trim().slice(0, 24), l: r.left, r: r.right, top: r.top, b: r.bottom, w: r.width, h: r.height }; };
          const scr = sel ? document.querySelector(sel) : null;
          const visible = e => e.offsetParent !== null || getComputedStyle(e).position === "fixed";
          const scope = [scr, document.getElementById("controls")].filter(e => e && !e.hidden);
          const btns = scope.flatMap(s => [...s.querySelectorAll("button, a")]).filter(visible).map(box).filter(b => b.w > 0 && b.h > 0);
          return { iw: innerWidth, ih: innerHeight, dsh: document.documentElement.scrollHeight, dsw: document.documentElement.scrollWidth,
            sh: scr ? scr.scrollHeight : 0, ch: scr ? scr.clientHeight : 0, sw: scr ? scr.scrollWidth : 0, cw: scr ? scr.clientWidth : 0, btns };
        }, sel);
        check(g.dsh <= g.ih + 1 && g.dsw <= g.iw + 1, tag + " " + what + " page scrolls " + JSON.stringify([g.dsw, g.dsh]));
        if (sel) check(g.sh <= g.ch + 1 && g.sw <= g.cw + 1, tag + " " + what + " screen scrolls " + JSON.stringify({ sh: g.sh, ch: g.ch, sw: g.sw, cw: g.cw }));
        for (const b of g.btns) {
          check(b.l >= -1 && b.top >= -1 && b.r <= g.iw + 1 && b.b <= g.ih + 1, tag + " " + what + " button off-screen " + JSON.stringify(b));
          if (phone) check(b.w >= 44 && b.h >= 44, tag + " " + what + " small button " + JSON.stringify(b));
        }
        return g;
      };

      // ---- 1부: 고정 장면(아이패드·PC는 예전 그림과 픽셀 비교, 폰은 전후 스크린샷) ----
      await p.addStyleTag({ content: ".hub-play-chip{visibility:hidden!important}" });
      await p.evaluate(() => Promise.all([...document.images].map(i => i.decode().catch(() => {}))));
      await p.waitForTimeout(400);
      await pixel("home");
      await p.evaluate(() => { const s = __MV.state; s.stars = 30; s.best = { "city:rescue": 2, "city:treasure": 1 }; __MV.setState(s); });
      await tap(p.locator("#goMap"));
      await p.locator("#map:not([hidden])").waitFor();
      await pixel("map");
      for (const mi of [0, 1, 2]) {
        await p.evaluate(mi => { window.__seed(1000 + mi); __MV.start(0, mi); __MV.game.paused = true; }, mi);
        await p.waitForFunction(() => __MV.game && __MV.game.running && document.getElementById("intro").hidden, null, { timeout: 8000 });
        await p.evaluate(() => {
          const g = __MV.game;
          if (g.boss) Object.assign(g.boss, { x: 1000, y: 640, st: "idle", t: 0, hp: g.boss.maxHp * 0.8 });
          g.player.hp = g.player.maxHp * 0.7; g.player.meter = 60;
        });
        await p.waitForTimeout(150);
        await pixel(["mission-rescue", "mission-treasure", "mission-boss"][mi]);
        if (mi === 0) {
          await tap(p.locator("#pauseBtn"));
          await p.locator("#pause:not([hidden])").waitFor();
          await pixel("pause");
        }
        await p.evaluate(() => document.getElementById("quitBtn").click());   // 멈춤 화면의 그만하기 → 지도
        await p.locator("#map:not([hidden])").waitFor();
      }
      await tap(p.locator("#map .back-btn"));
      await p.evaluate(() => { window.__frozenT = 5000; });
      await tap(p.locator("#goWardrobe"));
      await p.locator("#wardrobe:not([hidden])").waitFor();
      await p.waitForTimeout(150);
      await pixel("wardrobe");
      await tap(p.locator("#wardrobe .back-btn"));
      await p.evaluate(() => { window.__frozenT = null; });
      await tap(p.locator("#goCapsule"));
      await p.locator("#capsule:not([hidden])").waitFor();
      await pixel("capsule");
      await tap(p.locator("#capsule .back-btn"));

      // ---- 2부: 실제로 눌러 보며 점검 ----
      await fit("#home", "home");
      // 별·진행을 채워 지도·캡슐이 다 보이게
      await p.evaluate(() => { const s = __MV.state; s.stars = 30; s.best = { "city:rescue": 2, "city:treasure": 1 }; __MV.setState(s); });
      await fit("#home", "home-progress");
      // ---- 지도 ----
      await tap(p.locator("#goMap"));
      await p.locator("#map:not([hidden])").waitFor();
      await fit("#map", "map");
      // ---- 미션 세 종류: 탭으로 시작 → 인트로 → 터치로 조작 → 끝까지 ----
      for (const mi of [0, 1, 2]) {
        if (!(await p.locator("#map").isVisible())) await tap(p.locator('#result [data-go="map"]'));
        await tap(p.locator(".world").nth(0).locator(".mission-btn").nth(mi));
        await p.locator("#intro:not([hidden])").waitFor();
        await p.waitForFunction(() => document.getElementById("introCount").textContent === "1", null, { timeout: 5000 });
        await fit("#intro", "intro" + mi); await snap("intro" + mi);
        await p.waitForFunction(() => __MV.game && __MV.game.running, null, { timeout: 8000 });
        // 터치: 왼손으로 막대기를 오른쪽으로 끌면서 오른손으로 공격을 여러 번
        const cdp = await context.newCDPSession(p);
        const geo = await p.evaluate(() => {
          const r = id => { const b = document.getElementById(id).getBoundingClientRect(); return { x: b.left + b.width / 2, y: b.top + b.height / 2, l: b.left, t: b.top, r: b.right, b: b.bottom, w: b.width, h: b.height }; };
          return { zone: r("stickZone"), base: r("stickBase"), atk: r("attackBtn"), sp: r("specialBtn"), pause: r("pauseBtn") };
        });
        const sx = geo.base.x, sy = geo.base.y;
        const x0 = await p.evaluate(() => {
          window.__atk = { n: 0, held: 0 };
          document.getElementById("attackBtn").addEventListener("pointerdown", () => {
            window.__atk.n++; if (document.getElementById("stickKnob").style.transform) window.__atk.held++;
          });
          return __MV.game.player.x;
        });
        // CDP 터치: touchStart/touchMove에는 지금 닿아 있는 손가락을 모두 적는다(빠진 손가락은 뗀 것).
        await cdp.send("Input.dispatchTouchEvent", { type: "touchStart", touchPoints: [{ x: sx, y: sy, id: 1 }] });
        for (let k = 1; k <= 12; k++) {
          const mv = { x: sx + Math.min(50, k * 8), y: sy, id: 1 };
          if (k % 3 === 1) await cdp.send("Input.dispatchTouchEvent", { type: "touchStart", touchPoints: [mv, { x: geo.atk.x, y: geo.atk.y, id: 10 + k }] });
          else await cdp.send("Input.dispatchTouchEvent", { type: "touchMove", touchPoints: [mv] });
          await p.waitForTimeout(70);
        }
        const mid = await p.evaluate(() => ({ x: __MV.game.player.x, knob: document.getElementById("stickKnob").style.transform, atk: window.__atk }));
        await cdp.send("Input.dispatchTouchEvent", { type: "touchEnd", touchPoints: [] });
        await p.waitForTimeout(150);
        const after = await p.evaluate(() => ({ knob: document.getElementById("stickKnob").style.transform, down: document.querySelectorAll("#controls .is-down").length }));
        check(mid.x > x0 + 20, tag + " mission" + mi + " drag did not move hero " + JSON.stringify({ x0, mid }));
        check(mid.knob !== "", tag + " mission" + mi + " knob did not follow finger");
        check(mid.atk.n >= 3 && mid.atk.held >= 3, tag + " mission" + mi + " attack taps while moving " + JSON.stringify(mid.atk));
        check(after.knob === "" && after.down === 0, tag + " mission" + mi + " release-all failed " + JSON.stringify(after));
        // 놓친 뗌 신호(아이패드 모서리): 손가락이 0개가 되면 풀린다.
        const lost = await p.evaluate(async () => {
          const wait = ms => new Promise(r => setTimeout(r, ms));
          const zone = document.getElementById("stickZone"), r = zone.getBoundingClientRect(), x = r.left + r.width / 2, y = r.bottom - 60;
          zone.dispatchEvent(new PointerEvent("pointerdown", { pointerId: 77, pointerType: "touch", clientX: x, clientY: y, bubbles: true, cancelable: true }));
          zone.dispatchEvent(new PointerEvent("pointermove", { pointerId: 77, pointerType: "touch", clientX: x + 50, clientY: y, bubbles: true }));
          const held = document.getElementById("stickKnob").style.transform;
          document.dispatchEvent(new TouchEvent("touchend", { touches: [], bubbles: true }));
          await wait(120);
          return { held, after: document.getElementById("stickKnob").style.transform };
        });
        check(lost.held !== "" && lost.after === "", tag + " mission" + mi + " lost release not cleared " + JSON.stringify(lost));
        await cdp.detach();
        if (mi === 2) await p.evaluate(() => __MV.step(4));   // 보스가 들어와 체력 줄이 보이게
        await p.waitForTimeout(250);
        // 배치 점검: 글자 판·조작 버튼·주인공 크기
        const lay = await p.evaluate(() => {
          const r = id => { const b = document.getElementById(id).getBoundingClientRect(); return { l: b.left, t: b.top, r: b.right, b: b.bottom, w: b.width, h: b.height }; };
          return { L: __MV.layout ? __MV.layout() : null, atk: r("attackBtn"), sp: r("specialBtn"), pause: r("pauseBtn"), base: r("stickBase"), iw: innerWidth, ih: innerHeight };
        });
        await fit(null, "mission" + mi);
        if (phone) {
          check(!!lay.L, tag + " __MV.layout() missing");
          if (lay.L) {
            const hit = (a, b) => a.l < b.r && b.l < a.r && a.t < b.b && b.t < a.b;
            for (const k of ["atk", "sp", "base"]) check(!hit(lay.L.hud, lay[k]), tag + " mission" + mi + " HUD overlaps " + k + " " + JSON.stringify([lay.L.hud, lay[k]]));
            check(!hit(lay.L.hudLeft, lay.pause), tag + " mission" + mi + " HUD bars under pause " + JSON.stringify([lay.L.hudLeft, lay.pause]));
            check(lay.L.heroPx >= 110, tag + " mission" + mi + " hero too small " + lay.L.heroPx);
            check(lay.L.hudFont >= 13, tag + " mission" + mi + " HUD text too small " + lay.L.hudFont);
            if (portrait) {
              // 세로: 조작 버튼은 땅(주인공이 걷는 띠) 아래에
              for (const k of ["atk", "sp", "base"]) check(lay[k].t >= lay.L.groundBottom - 2, tag + " mission" + mi + " " + k + " covers the ground " + JSON.stringify([lay[k], lay.L.groundBottom]));
            }
            for (const k of ["atk", "sp", "pause"]) check(lay[k].w >= 44 && lay[k].h >= 44, tag + " " + k + " small");
          }
        }
        await snap("mission" + mi + "-live");
        // 멈춤
        if (mi === 0) {
          await p.evaluate(() => { __MV.game.paused = false; });
          await tap(p.locator("#pauseBtn"));
          await p.locator("#pause:not([hidden])").waitFor();
          await fit("#pause", "pause");
          await tap(p.locator("#resumeBtn"));
          // 문제(GameQuiz) 패널
          await p.evaluate(() => { __MV.quiz(true); const g = __MV.game; g.quizMade = 0; const s = __MV.quizStar(g.player.x, g.player.y); if (s) { s.z = 0; s.vz = 0; } __MV.step(0.1); });
          const open = await p.waitForFunction(() => window.GameQuiz && GameQuiz.isOpen && GameQuiz.isOpen(), null, { timeout: 3000 }).then(() => true, () => false);
          check(open, tag + " quiz did not open");
          if (open) {
            await p.waitForTimeout(800);
            const q = await p.evaluate(() => {
              const pn = document.querySelector(".gq-panel"), b = pn.getBoundingClientRect();
              return { panel: { l: b.left, t: b.top, r: b.right, b: b.bottom }, sh: pn.scrollHeight, ch: pn.clientHeight, iw: innerWidth, ih: innerHeight,
                btns: [...pn.querySelectorAll("button")].map(x => { const r = x.getBoundingClientRect(); return { l: r.left, t: r.top, r: r.right, b: r.bottom, w: r.width, h: r.height }; }) };
            });
            check(q.panel.t >= 0 && q.panel.b <= q.ih + 1 && q.panel.l >= 0 && q.panel.r <= q.iw + 1, tag + " quiz panel off-screen " + JSON.stringify(q.panel));
            if (phone) check(q.sh <= q.ch + 1, tag + " quiz panel scrolls " + JSON.stringify([q.sh, q.ch]));
            for (const b of q.btns) { check(b.b <= q.ih + 1 && b.t >= 0, tag + " quiz button off-screen " + JSON.stringify(b)); if (phone) check(b.h >= 44 && b.w >= 44, tag + " quiz button small"); }
            await snap("quiz");
            await p.evaluate(() => GameQuiz.close());
            await p.waitForTimeout(200);
            await p.evaluate(() => __MV.quiz(false));
          }
        }
        // 나머지는 빨리 돌려 끝낸다(주인공을 가까운 목표로 옮기며 공격).
        const summary = await p.evaluate(() => {
          const g = __MV.game; g.paused = false;
          for (let i = 0; i < 95 * 60 && !g.over; i++) {
            const t = (g.boss && g.boss.st !== "dead" ? [g.boss] : []).concat(g.cages.filter(c => !c.freed), g.enemies.filter(e => e.st !== "dead"), g.sparks);
            const pl = g.player;
            if (t.length) { const n = t.sort((a, b) => Math.abs(a.x - pl.x) - Math.abs(b.x - pl.x))[0]; pl.x += Math.sign(n.x - pl.x) * 4; pl.y += Math.sign(n.y - pl.y) * 2; }
            if (i % 8 === 0) window.dispatchEvent(new KeyboardEvent("keydown", { code: "KeyJ" }));
            __MV.step(1 / 60);
          }
          __MV.step(3);
          return { over: g.over, stars: g.stars };
        });
        check(summary.over, tag + " mission" + mi + " did not finish");
        await p.waitForSelector("#result:not([hidden])", { timeout: 6000 });
        await p.waitForTimeout(900);
        await fit("#result", "result" + mi); await snap("result" + mi);
      }
      await tap(p.locator('#result [data-go="map"]'));
      await tap(p.locator("#map .back-btn"));
      // ---- 옷장 ----
      await p.evaluate(() => { const s = __MV.state; s.owned = __MV.data.ITEMS.map(i => i.id); __MV.setState(s); });
      await tap(p.locator("#goWardrobe"));
      await p.locator("#wardrobe:not([hidden])").waitFor();
      await fit("#wardrobe", "wardrobe"); await snap("wardrobe-live");
      for (const slot of [1, 2]) {
        await tap(p.locator("#slotTabs button").nth(slot));
        await fit("#wardrobe", "wardrobe-slot" + slot);
      }
      await snap("wardrobe-emblem");
      await tap(p.locator("#itemGrid .item").nth(3));
      await tap(p.locator('#wardrobe .back-btn'));
      // ---- 캡슐 ----
      await p.evaluate(() => { const s = __MV.state; s.owned = []; s.stars = 30; __MV.setState(s); });
      await tap(p.locator("#goCapsule"));
      await p.locator("#capsule:not([hidden])").waitFor();
      await fit("#capsule", "capsule");
      await tap(p.locator("#openCapsule"));
      await p.locator("#capsulePrize:not([hidden])").waitFor({ timeout: 5000 });
      await p.waitForTimeout(700);
      await fit("#capsule", "capsule-open"); await snap("capsule-open");
      check(errors.length === 0, tag + " console errors " + JSON.stringify(errors));
      console.log("done", tag);
      await context.close();
    }
  } finally { await browser.close(); server.close(); }
  if (pixelReport.length) console.log("pixel:", pixelReport.join(" | "));
  if (failures.length) { console.log(failures.length + " failures"); process.exitCode = 1; }
  else console.log("PASS all sizes");
})().catch(e => { console.error(e); process.exitCode = 1; server.close(); });
