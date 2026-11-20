// 농구 흐름 검사(사이트 루트에서 http 서버를 띄운 뒤): node smoke.cjs PORT W H NAME [--kid=jaei|taeo] [--quiz] [--drag] [--strip] [--shots]  (SHOTS_DIR=스크린샷 폴더)
const { chromium } = require("playwright-core");
const OUT = process.env.SHOTS_DIR ? process.env.SHOTS_DIR + "/" : __dirname + "/";
const a = process.argv.slice(2);
const PORT = +a[0], W = +a[1] || 1024, H = +a[2] || 768, NAME = a[3] || `${W}x${H}`;
const KID = ((a.find(x => x.startsWith("--kid=")) || "--kid=jaei").slice(6));
const QUIZ = a.includes("--quiz"), DRAG = a.includes("--drag"), SHOTS = a.includes("--shots");
(async () => {
  const b = await chromium.launch({ channel: "msedge", headless: true });
  const ctx = await b.newContext({ viewport: { width: W, height: H }, hasTouch: W < 1100 });
  const p = await ctx.newPage();
  const errs = [];
  p.on("console", m => { if (m.type() === "error") errs.push("console: " + m.text()); });
  p.on("pageerror", e => errs.push("pageerror: " + e.message));
  p.on("requestfailed", r => errs.push("reqfail: " + r.url()));
  p.on("response", r => { if (r.status() >= 400) errs.push("http " + r.status() + " " + r.url()); });
  const speed = DRAG ? 1 : QUIZ ? 2 : 3;
  await p.goto(`http://127.0.0.1:${PORT}/sports/?qa=1&nodemo=1${DRAG ? "" : "&auto=1"}&speed=${speed}${QUIZ ? "&quiz=1" : ""}${a.includes("--replay") ? "&replay=1" : ""}`);
  await p.waitForFunction(() => window.__sports && __sports.screen() === "title");
  await p.evaluate(k => __sports.select([k]), KID);
  await p.waitForTimeout(300);
  await p.click("#goBtn");
  await p.waitForFunction(() => __sports.screen() === "eventCard");
  await p.click("#evBack");
  await p.waitForFunction(() => __sports.screen() === "lobby");
  if (SHOTS) await p.screenshot({ path: OUT + `basketball-${NAME}-lobby.png` });
  await p.locator(".ev-tile", { hasText: "농구" }).click();
  await p.waitForFunction(() => __sports.screen() === "eventCard");
  if (SHOTS) await p.screenshot({ path: OUT + `basketball-${NAME}-card.png` });
  await p.click("#evStart");
  const t0 = Date.now(); let shots = 0, lastLog = 0, quizShot = false, dragged = 0, next = [3, 9, 16, 30, 45];
  const scroll = async tag => { const r = await p.evaluate(() => ({ sw: document.documentElement.scrollWidth, sh: document.documentElement.scrollHeight, iw: innerWidth, ih: innerHeight })); if (r.sw > r.iw || r.sh > r.ih) errs.push(`scroll at ${tag}: ${JSON.stringify(r)}`); };
  let result = null;
  while (Date.now() - t0 < 240000) {
    if (SHOTS && !p._rp && await p.$(".replay-tag")) { p._rp = 1; await p.waitForTimeout(900); await p.screenshot({ path: OUT + `basketball-${NAME}-replay.png` }); }
    const st = await p.evaluate(() => { const s = __sports.run(); return { scr: __sports.screen(), q: __sports.quiz(), ev: __sports.session().events, run: s && { t: +s.t.toFixed(1), round: s.round, rack: s.rack, phase: s.phase, score: s.score, shots: s.stats.shots, made: s.stats.made, magnet: s.magnet, can: s.phase === "aim" && s.reload <= 0 && s.ballsLeft > 0 } }; });
    if (st.scr === "result" && !result) { result = await p.evaluate(() => document.getElementById("resScore").textContent + " " + document.getElementById("resText").textContent); if (SHOTS) await p.screenshot({ path: OUT + `basketball-${NAME}-result.png` }); }
    if (st.scr === "ceremony" || st.ev >= 1) { if (SHOTS) await p.screenshot({ path: OUT + `basketball-${NAME}-ceremony.png` }); break; }
    if (Date.now() - lastLog > 4000) { lastLog = Date.now(); console.log("  ", JSON.stringify(st.run), st.scr); }
    if (st.scr === "turn") await p.click("#turnGo", { timeout: 1000 }).catch(() => {});
    if (st.scr === "result") await p.click("#resNext", { timeout: 1000 }).catch(() => {});
    const q = st.q;
    if (q && q.kind === "ask") {
      await p.waitForTimeout(700);
      if (SHOTS && !quizShot) { quizShot = true; await p.screenshot({ path: OUT + `basketball-${NAME}-quiz.png` }); }
      const idx = await p.evaluate(ans => [...document.querySelectorAll(".gq-layer button")].findIndex(b => !b.disabled && b.textContent.trim() === String(ans)), q.answer);
      const btns = p.locator(".gq-layer button");
      if (idx >= 0) { await btns.nth(idx).click().catch(() => {}); await p.waitForTimeout(250); if (SHOTS && !p._mag) { p._mag = 1; await p.screenshot({ path: OUT + `basketball-${NAME}-magnet.png` }); } }
      await p.waitForTimeout(600);
      continue;
    }
    if (st.run && SHOTS && next.length && st.run.t >= next[0]) { const tt = next.shift(); await p.screenshot({ path: OUT + `basketball-${NAME}-t${tt}.png` }); await scroll("t" + tt); }
    if (DRAG && st.run && st.run.can && dragged < 40) {
      // 화면 가운데를 누르고 왼쪽 아래로 당겼다 놓기(각도·힘을 조금씩 바꿔 가며)
      const cx = W * 0.5, cy = H * 0.5, L = 0.3 * Math.min(W, H) * (0.48 + (dragged % 5) * 0.015), ang = (60 + (dragged % 3) * 2) * Math.PI / 180;
      await p.mouse.move(cx, cy); await p.mouse.down();
      for (let i = 1; i <= 6; i++) { await p.mouse.move(cx - Math.cos(ang) * L * i / 6, cy + Math.sin(ang) * L * i / 6); await p.waitForTimeout(30); }
      if (SHOTS && dragged === 1) await p.screenshot({ path: OUT + `basketball-${NAME}-aim.png` });
      await p.mouse.up(); dragged++;
      if (a.includes("--strip") && dragged === 3) { for (let f = 0; f < 10; f++) { await p.screenshot({ path: OUT + `strip-${NAME}-${f}.png` }); await p.waitForTimeout(70); } }
      await p.waitForTimeout(300);
      if (SHOTS && dragged === 2) { await p.waitForTimeout(250); await p.screenshot({ path: OUT + `basketball-${NAME}-flight.png` }); }
    }
    await p.waitForTimeout(DRAG ? 60 : 150);
  }
  const fin = await p.evaluate(() => __sports.session());
  console.log(NAME, KID, "result:", result, "events:", fin.events, "errors:", errs.length ? errs : "none");
  await b.close();
  process.exit(errs.length ? 1 : 0);
})().catch(e => { console.error(e); process.exit(2); });
