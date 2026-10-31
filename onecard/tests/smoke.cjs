"use strict";
// 원카드 점검: 8개 화면 크기에서 손가락(터치)으로 한 판을 끝까지 두고, 원카드 버튼(내가 외치기·잡기·벌칙)·모양 고르기·승리 화면·한 화면 맞춤·오류 0을 본다.
// 사용: (사이트 뿌리에서) python -m http.server 8817  →  BASE=http://127.0.0.1:8817 SHOTS=<폴더> node onecard/tests/smoke.cjs
const { chromium } = require("playwright");
const assert = require("node:assert/strict");
const fs = require("fs"), path = require("path"), os = require("os");

const BASE = process.env.BASE || "http://127.0.0.1:8817";
const SHOTS = process.env.SHOTS || fs.mkdtempSync(path.join(os.tmpdir(), "onecard-shots-"));
fs.mkdirSync(SHOTS, { recursive: true });
const VIEWPORTS = [[375, 667], [390, 844], [844, 390], [667, 375], [768, 1024], [1024, 768], [1366, 1024], [1280, 800]];
const NAMED = { "1024x768": "ipad-landscape", "390x844": "phone-portrait", "844x390": "phone-landscape" };

async function fits(page, label) {
  const r = await page.evaluate(() => {
    const se = document.scrollingElement;
    const out = { sw: se.scrollWidth, sh: se.scrollHeight, iw: innerWidth, ih: innerHeight, off: [] };
    document.querySelectorAll("button, a, .pc, .opp, .kid-card").forEach(el => {
      if (el.closest("[hidden]") || el.closest(".fly") || el.closest(".title-fan")) return;
      const b = el.getBoundingClientRect();
      if (!b.width || !b.height) return;
      // 반짝이며 들린 카드(-15%)까지 화면 안이어야 한다
      if (b.left < -1 || b.top < -1 || b.right > innerWidth + 1 || b.bottom > innerHeight + 1) out.off.push((el.id || el.className || el.tagName) + " " + [b.left, b.top, b.right, b.bottom].map(Math.round).join(","));
    });
    return out;
  });
  assert.ok(r.sw <= r.iw && r.sh <= r.ih, `${label}: page scrolls (${r.sw}x${r.sh} in ${r.iw}x${r.ih})`);
  assert.deepEqual(r.off, [], `${label}: elements outside the screen`);
}

// 겹쳐 있는 손패에서 그 카드가 실제로 보이는 곳을 찾아 손가락으로 누른다
async function tapCard(page, id) {
  const pt = await page.evaluate(id => {
    const e = document.querySelector(`#hand .pc[data-id="${id}"]`);
    if (!e) return null;
    const b = e.getBoundingClientRect();
    for (const fy of [0.3, 0.15, 0.6, 0.85]) for (const fx of [0.15, 0.3, 0.5, 0.08, 0.7, 0.9]) {
      const x = b.left + b.width * fx, y = b.top + b.height * fy;
      const hit = document.elementFromPoint(x, y);
      if (hit && hit.closest(".pc") === e) return { x, y };
    }
    return null;
  }, id);
  assert.ok(pt, "card visible somewhere: " + id);
  if (process.env.DEBUG_TAP) console.log("tap", id, pt, await page.evaluate(() => { const G = __ONECARD.G; return [G.phase, G.busy, !!G.dealt, G.st.turn, G.st.drawn]; }));
  if (process.env.DEBUG_TAP) await page.evaluate(() => { if (!window.__pdlog) { window.__pdlog = 1; document.addEventListener("pointerdown", e => console.log("PD", e.pointerType, e.target.className, e.target.dataset && e.target.dataset.id, e.clientX, e.clientY), true); } });
  await page.touchscreen.tap(pt.x, pt.y);
}
async function tapEl(page, sel) {
  const b = await page.locator(sel).boundingBox();
  assert.ok(b, "visible: " + sel);
  await page.touchscreen.tap(b.x + b.width / 2, b.y + b.height / 2);
}
const S = page => page.evaluate(() => {
  const G = __ONECARD.G;
  if (!G) return null;
  const st = G.st;
  return {
    phase: G.phase, busy: G.busy, dealing: !!G.dealt, turn: st.turn, winner: st.winner, pending: st.pending && st.pending.player,
    drawn: st.drawn, hands: st.hands.map(h => h.length), legal: __ONECARD.R.legalCards(st, 0).map(c => c.id),
    oneOpen: !document.querySelector("#oneCard").hidden, suitOpen: !document.querySelector("#suitPick").hidden,
    resultOpen: !document.querySelector("#result").hidden, top: __ONECARD.R.topCard(st).id, suit: st.suit,
  };
});
async function until(page, cond, ms = 8000) {
  const t0 = Date.now();
  while (Date.now() - t0 < ms) {
    const s = await S(page);
    if (s && cond(s)) return s;
    await page.waitForTimeout(40);
  }
  throw new Error("timeout waiting: " + cond);
}

// 손패·맨 위 카드를 정해 둔다. 카드는 덱·더미·손에서 옮겨 오고, 비운 손의 카드는 덱으로 → 52장 그대로.
function rig(page, spec) {
  return page.evaluate(spec => __ONECARD.rig(st => {
    const want = new Set([...Object.entries(spec.hands).filter(([p]) => Number(p) < st.players).flatMap(([, ids]) => ids), spec.top]);
    const all = [...st.deck, ...st.pile, ...st.hands.flat()];
    const byId = Object.fromEntries(all.map(c => [c.id, c]));
    const strip = arr => arr.filter(c => !want.has(c.id));
    st.deck = strip(st.deck); st.pile = strip(st.pile); st.hands = st.hands.map(strip);
    for (const [p, ids] of Object.entries(spec.hands)) {
      if (Number(p) >= st.players) continue;
      st.deck.unshift(...st.hands[p]);
      st.hands[p] = ids.map(id => byId[id]);
    }
    st.pile.push(byId[spec.top]);
    st.suit = byId[spec.top].s;
    if (__ONECARD.R.cardCount(st) !== 52) throw new Error("rig broke the deck");
  }), spec);
}

async function playFullGame(page, label, opts) {
  const stats = { plays: 0, draws: 0, passes: 0, oneSafe: 0, catches: 0, sevens: 0, steps: 0, wrongTaps: 0 };
  const t0 = Date.now();
  let shotOne = false, shotPicker = false, midShot = false;
  while (Date.now() - t0 < 150000) {
    const s = await S(page);
    if (s.resultOpen) return { stats, s };
    stats.steps++;
    if (s.oneOpen && s.phase === "one") {
      if (!shotOne && opts.shots && s.pending === 0) { shotOne = true; await page.waitForTimeout(260); await page.screenshot({ path: path.join(SHOTS, "onecard-popup.png") }); }
      // 컴퓨터가 먼저 외치면 버튼이 사라진다(경주에서 진 것). 그때는 그냥 넘어간다.
      const b = await page.locator("#oneBtn").boundingBox();
      if (!b) { stats.lostRace = (stats.lostRace || 0) + 1; continue; }
      await page.touchscreen.tap(b.x + b.width / 2, b.y + b.height / 2);
      if (s.pending === 0) stats.oneSafe++; else stats.catches++;
      await page.waitForTimeout(120);
      continue;
    }
    if (s.suitOpen) {
      if (!shotPicker && opts.shots) { shotPicker = true; await page.screenshot({ path: path.join(SHOTS, "suit-picker.png") }); }
      const pick = ["S", "H", "D", "C"][stats.sevens % 4];
      await tapEl(page, `.suit-btn[data-suit="${pick}"]`);
      stats.sevens++;
      const after = await until(page, x => !x.suitOpen);
      void after;
      continue;
    }
    if (s.phase === "play" && s.turn === 0 && !s.busy && s.winner < 0) {
      if (stats.plays === 3 && !midShot) {
        midShot = true;
        await fits(page, label + " mid-game");
        if (opts.midShot) await page.screenshot({ path: path.join(SHOTS, opts.midShot) });
      }
      if (s.drawn) {
        if (s.legal.length && (stats.drawnSeen = (stats.drawnSeen || 0) + 1) % 2 === 1) { await tapCard(page, s.legal[0]); stats.plays++; }
        else { await tapEl(page, "#passBtn"); stats.passes++; await until(page, x => !x.drawn || x.turn !== 0); }
      } else if (s.legal.length) {
        // 7은 아껴 둔다(가끔 일부러 7로 모양 바꾸기도 해 본다)
        const non7 = s.legal.filter(id => !id.endsWith("7") || id.length > 2);
        const id = (stats.plays % 5 === 2 || !non7.length) ? s.legal[s.legal.length - 1] : non7[0];
        await tapCard(page, id);
        stats.plays++;
      } else {
        await tapEl(page, "#deck");
        stats.draws++;
      }
      await page.waitForTimeout(90);
      continue;
    }
    await page.waitForTimeout(50);
  }
  await page.screenshot({ path: path.join(SHOTS, `stuck-${label}.png`) });
  throw new Error(label + ": game did not finish in time " + JSON.stringify(await S(page)) + " " + JSON.stringify(stats));
}

(async () => {
  const browser = await chromium.launch({ channel: "msedge", headless: true });
  const report = [];
  try {
    for (const [i, [w, h]] of VIEWPORTS.entries()) {
      if (process.env.ONLY && process.env.ONLY !== `${w}x${h}`) continue;
      const label = `${w}x${h}`;
      const ctx = await browser.newContext({ viewport: { width: w, height: h }, hasTouch: true, deviceScaleFactor: 1 });
      await ctx.addInitScript(() => {
        const d = new Date();
        localStorage.setItem("hub_play_pass", JSON.stringify({ free: true, day: d.getFullYear() + "-" + String(d.getMonth() + 1).padStart(2, "0") + "-" + String(d.getDate()).padStart(2, "0") }));
      });
      const page = await ctx.newPage();
      const errors = [];
      page.on("console", m => { if (m.type() === "error") errors.push(m.text()); if (process.env.DEBUG_TAP && m.text().startsWith("PD")) console.log(m.text()); });
      page.on("pageerror", e => errors.push(String(e)));
      page.on("requestfailed", r => errors.push("requestfailed " + r.url()));
      const kid = i % 2 ? "taeo" : "jaei";
      const opp = i % 3 === 2 ? 2 : 1;
      await page.goto(`${BASE}/onecard/?seed=${11 + i}&speed=4`, { waitUntil: "networkidle" });
      await fits(page, label + " home");
      if (NAMED[label]) await page.screenshot({ path: path.join(SHOTS, `home-${NAMED[label]}.png`) });
      if (opp === 2) await page.click('.opp-btn[data-opp="2"]');
      await tapEl(page, `.kid-card[data-kid="${kid}"]`);
      await until(page, s => !s.dealing && s.phase === "play", 10000);
      const s0 = await S(page);
      assert.equal(s0.hands.length, 1 + opp);
      assert.ok(s0.hands.every(n => n === (kid === "taeo" ? 5 : 7)), "dealt hand size");
      assert.ok(!s0.top.endsWith("7") || s0.top.length > 2, "never starts on a 7");
      await fits(page, label + " game start");

      // 한 판 끝까지(아이는 터치로, 원카드는 늘 외치고/잡고)
      const { stats, s } = await playFullGame(page, label, { midShot: NAMED[label] ? `game-${NAMED[label]}.png` : null, shots: label === "1024x768" });
      assert.ok(s.winner >= 0);
      await fits(page, label + " result");
      if (label === "1024x768" || label === "390x844") await page.screenshot({ path: path.join(SHOTS, `result-${label}-${s.winner === 0 ? "win" : "lose"}.png`) });
      report.push({ label, kid, opp, winner: s.winner, ...stats });

      // ---- 정해 둔 장면들 (한 판 더 → 새 판) ----
      await tapEl(page, "#againBtn");
      await until(page, x => !x.dealing && x.phase === "play" && x.turn === 0, 10000);
      // 1) 모양 고르기: 7을 내면 네 모양 버튼, 고른 모양이 지금 모양
      await rig(page, { hands: { 0: ["S7", "H2", "C9", "D4"] }, top: "D10" });
      await until(page, x => x.phase === "play" && x.legal.includes("S7"));
      await tapCard(page, "S7");
      await until(page, x => x.suitOpen);
      await fits(page, label + " suit picker");
      await tapEl(page, '.suit-btn[data-suit="C"]');
      const afterSeven = await until(page, x => !x.suitOpen && x.top === "S7");
      assert.equal(afterSeven.suit, "C", "picked suit becomes the suit");
      // 2) 컴퓨터가 1장 → 내가 먼저 눌러 잡기
      await until(page, x => x.phase === "play" && x.turn === 0, 15000);
      await rig(page, { hands: { 0: ["H5", "C3", "S12"], 1: ["H9", "H10"], 2: ["D2", "D3", "D4"] }, top: "H2" });
      await until(page, x => x.legal.includes("H5"));
      await tapCard(page, "H5");
      // 쉬움 컴퓨터는 낼 수 있어도 가끔 뽑는다 → 그때는 그 판 흐름대로 기다린다
      const open = await until(page, x => (x.oneOpen && x.pending === 1) || (x.turn === 0 && x.phase === "play"), 15000);
      if (open.oneOpen) {
        await tapEl(page, "#oneBtn");
        const caught = await until(page, x => !x.oneOpen);
        assert.equal(caught.hands[1], 2, "caught computer draws 1");
        report[report.length - 1].scriptedCatch = "ok";
      } else report[report.length - 1].scriptedCatch = "ai drew instead";
      // 3) 내가 1장인데 안 누르면 → 컴퓨터가 외치고 나는 1장 받기
      await until(page, x => x.phase === "play" && x.turn === 0, 15000);
      await rig(page, { hands: { 0: ["C5", "D9"], 1: ["S2", "S3", "S4", "S5", "S6"], 2: ["S8", "S9", "S10", "S11", "S12"] }, top: "C2" });
      await until(page, x => x.legal.includes("C5"));
      await tapCard(page, "C5");
      await until(page, x => x.oneOpen && x.pending === 0);
      const pen = await until(page, x => !x.oneOpen, 6000);
      assert.equal(pen.hands[0], 2, "no call → 1 penalty card");
      // 4) 마지막 카드 → 이겼다 화면
      await until(page, x => x.phase === "play" && x.turn === 0, 15000);
      await rig(page, { hands: { 0: ["H13"], 1: ["S2", "S3", "S4", "S5", "S6"], 2: ["S8", "S9", "S10", "S11", "S12"] }, top: "H4" });
      await until(page, x => x.legal.includes("H13"));
      await tapCard(page, "H13");
      await until(page, x => x.resultOpen && x.winner === 0, 6000);
      await page.waitForTimeout(500);
      await fits(page, label + " win");
      if (label === "1024x768") await page.screenshot({ path: path.join(SHOTS, "win-screen.png") });
      if (label === "844x390") await page.screenshot({ path: path.join(SHOTS, "win-screen-phone-landscape.png") });
      const saved = await page.evaluate(() => JSON.parse(localStorage.getItem("onecard:v1")));
      assert.ok(saved.wins[kid] >= 1, "win saved");
      // 처음 화면에 스티커
      await tapEl(page, "#homeBtn");
      const sticker = await page.textContent(`.kid-card[data-kid="${kid}"] .stickers`);
      assert.match(sticker, /승/);
      assert.deepEqual(errors, [], label + ": console errors");
      await ctx.close();
      console.log("ok", label, JSON.stringify(report[report.length - 1]));
    }
  } finally {
    await browser.close();
  }
  console.log("SHOTS", SHOTS);
})().catch(e => { console.error(e); process.exit(1); });
