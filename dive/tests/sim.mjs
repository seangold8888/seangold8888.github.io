// 딥 다이브 균형 시뮬레이션: 진짜 엔진(engine.js)을 화면 없이 돌리고, "피하기만 잘하는" 꼬마 로봇이 조종한다.
// policy: none(문제를 하나도 안 풂) | all(? 진주마다 한 번에 맞힘) | half(절반은 한 번에, 절반은 고쳐 맞힘)
// 로봇은 위험하면 슈웅!(돌진)으로 빠지고, 앞에 친구가 몰려 있으면 슈웅!으로 뚫는다(보통으로 움직이는 아이 흉내).
// 직접 돌리기: node dive/tests/sim.mjs [판 수]
import * as L from "../src/logic.js";
import * as E from "../src/engine.js";

export function seeded(seed) { let s = (seed * 2654435761) >>> 0 || 1; return () => { s ^= s << 13; s >>>= 0; s ^= s >> 17; s ^= s << 5; s >>>= 0; return s / 4294967296; }; }

export function botMove(w, policy) {
  const p = w.p; let fx = 0, fy = 0;
  for (const e of w.enemies) {
    if (L.harmless(e.kind)) continue;
    const dx = p.x - e.x, dy = p.y - e.y, d = Math.hypot(dx, dy) || 1, R = (e.kind === "boss" ? 300 : e.kind === "eel" ? 140 : 190) + (e.r > 20 ? e.r : 0);
    if (d < R) { const s = (R - d) / R, k = s * s * (e.kind === "boss" ? 3 : 1); fx += dx / d * k; fy += dy / d * k; }
  }
  for (const k of w.inks) { const dx = p.x - k.x, dy = p.y - k.y, d = Math.hypot(dx, dy) || 1; if (d < 110) { const s = (110 - d) / 110; fx += dx / d * s * 2; fy += dy / d * s * 2; } }
  for (const a of w.warns) { // 곰치 경고 줄에서 옆으로 비킨다
    const rx = p.x - a.x1, ry = p.y - a.y1, cross = rx * -a.uy + ry * a.ux;
    if (Math.abs(cross) < 70) { const sgn = cross >= 0 ? 1 : -1; fx += -a.uy * sgn * 2; fy += a.ux * sgn * 2; }
  }
  const M = 240; // 벽(구석에 몰리지 않게 일찍 비킨다)
  if (p.x < M) fx += (M - p.x) / M * 2.5; if (p.x > L.WORLD.w - M) fx -= (p.x - (L.WORLD.w - M)) / M * 2.5;
  if (p.y < M) fy += (M - p.y) / M * 2.5; if (p.y > L.WORLD.h - M) fy -= (p.y - (L.WORLD.h - M)) / M * 2.5;
  // 위험이 크면 살짝 옆으로 돌아 빠진다(원을 그리며 피하기)
  const mag = Math.hypot(fx, fy);
  if (mag > 0.05) { const c = Math.cos(0.5), s = Math.sin(0.5); const x = fx * c - fy * s, y = fx * s + fy * c; fx = x; fy = y; }
  // 끌리는 것: ? 진주(푸는 아이만), 황금 물고기·보물 조개(누구나), 빛 방울
  const want = (tx, ty, k) => { const dx = tx - p.x, dy = ty - p.y, d = Math.hypot(dx, dy) || 1; fx += dx / d * k; fy += dy / d * k; };
  if (policy !== "none" && w.qpearls.length) { const q = w.qpearls[0]; want(q.x, q.y, mag < 0.6 ? 0.9 : 0.3); }
  for (const e of w.enemies) if (e.kind === "gold" || e.kind === "clam") { want(e.x, e.y, mag < 0.6 ? 0.7 : 0.2); break; }
  let best = null, bd = 260 * 260; for (const o of w.orbs) { const d = (o.x - p.x) ** 2 + (o.y - p.y) ** 2; if (d < bd) { bd = d; best = o; } }
  if (best) want(best.x, best.y, mag < 0.4 ? 0.5 : 0.15);
  if (!best && mag < 0.05) want(L.WORLD.w / 2 + Math.cos(w.t * 0.3) * 300, L.WORLD.h / 2 + Math.sin(w.t * 0.3) * 220, 0.4);
  const n = Math.hypot(fx, fy);
  if (n < 0.05) return { x: 0, y: 0 };
  return { x: fx / Math.max(n, 0.35), y: fy / Math.max(n, 0.35) };
}
// 슈웅! 판단: 아주 가까이 위험하면 빠지고, 앞에 셋 이상 몰려 있으면 뚫는다. 반응이 늦은 아이처럼 react 확률로만.
export function botDash(w, mv, rng, react = 0.5) {
  if (!E.dashReady(w)) return false;
  const p = w.p, n = Math.hypot(mv.x, mv.y);
  if (n < 0.1) return false;
  const ux = mv.x / n, uy = mv.y / n;
  let close = false, ahead = 0;
  for (const e of w.enemies) {
    if (L.harmless(e.kind)) continue;
    const dx = e.x - p.x, dy = e.y - p.y, d = Math.hypot(dx, dy);
    if (d < p.r + e.r + 30) close = true;
    const along = dx * ux + dy * uy, side = Math.abs(dx * -uy + dy * ux);
    if (along > 0 && along < 210 && side < 34) ahead++;
  }
  if ((close || ahead >= 3) && rng() < react) return E.dash(w, mv);
  return false;
}

export function runSim({ kid = 1, policy = "all", seed = 1, zone = "coral", dt = 1 / 20, firstTryRate = null, react = 0.5, noDash = false } = {}) {
  const rng = seeded(seed), qrng = seeded(seed * 7 + 3), drng = seeded(seed * 13 + 5);
  const w = E.createWorld({ kid, zone, rng, view: { w: 720, h: 540 } });
  const rate = firstTryRate != null ? firstTryRate : policy === "all" ? 1 : policy === "half" ? 0.5 : 0;
  let quizzes = 0, quiz60 = 0, firstHurt = null, overloadT = null, frames = 0;
  const screen = [], washBins = [];
  let lastRescued = 0, nextBin = 30;
  const pickCard = cards => { let pick = cards[0]; for (const c of cards) if (c.recommend || L.cardScore(c, w.load, w.hearts, w.maxHearts) > L.cardScore(pick, w.load, w.hearts, w.maxHearts)) { pick = c; if (c.recommend) break; } return pick; };
  while (!w.over) {
    if (w.pending === "quiz") {
      if (policy === "none") { w.pending = null; continue; }
      quizzes++; if (w.t <= 60) quiz60++;
      const first = qrng() < rate; E.recordQuiz(w, first); E.quizBlast(w, first); w.quizGear++;
      const cards = L.drawCards(w.load, { count: first ? w.tune.cards : 2, low: !first, rare: first && w.streak > 0 && w.streak % 3 === 0, recommend: w.tune.cards === 2, rng, hearts: w.hearts, maxHearts: w.maxHearts });
      const pick = pickCard(cards);
      E.setLoadout(w, L.applyCard(w.load, pick), pick);
      E.resumeAfter(w);
      continue;
    }
    if (w.pending === "chest") { // 보물 조개: 문제 없이 2장 중 1장(희귀도 낮은 쪽)
      const cards = L.drawCards(w.load, { count: 2, low: true, rng, hearts: w.hearts, maxHearts: w.maxHearts });
      const pick = pickCard(cards); E.setLoadout(w, L.applyCard(w.load, pick), pick); E.resumeAfter(w); continue;
    }
    if (w.pending === "rescue") {
      if (policy === "none") { w.over = { result: "tired", time: w.t }; break; }
      E.recordQuiz(w, qrng() < rate); E.revive(w); continue;
    }
    const h = w.hurts, mv = botMove(w, policy);
    if (!noDash) botDash(w, mv, drng, react);
    E.stepWorld(w, dt, mv); frames++;
    if (w.hurts > h && firstHurt == null) firstHurt = w.t;
    if (overloadT == null && w.enemies.length >= 45) overloadT = w.t;
    // 화면(720x540) 안의 친구 수: 1초마다
    if (frames % 20 === 0) { let c = 0; for (const e of w.enemies) if (Math.abs(e.x - w.p.x) < 360 && Math.abs(e.y - w.p.y) < 270) c++; screen.push([w.t, c]); }
    if (w.t >= nextBin) { washBins.push(w.rescued - lastRescued); lastRescued = w.rescued; nextBin += 30; }
    if (w.t > L.RUN_TIME + 5) break;
  }
  const after20 = screen.filter(s => s[0] >= 20 && s[0] < L.BOSS_AT).map(s => s[1]).sort((a, b) => a - b);
  const at = t => { const s = screen.find(x => x[0] >= t); return s ? s[1] : null; };
  return {
    result: w.over ? w.over.result : "?", time: Math.round(w.t), success: !!w.over && (w.over.result === "boss" || w.over.result === "escape"),
    pearls: w.pearlN, quizzes, quiz60, rescued: w.rescued, hurts: w.hurts, firstHurt: firstHurt == null ? null : Math.round(firstHurt), overloadT: overloadT == null ? null : Math.round(overloadT),
    rescueUsed: w.rescueUsed, blastWashed: w.blastWashed, dps: Math.round(L.loadoutDps(w.load)), load: w.load,
    firstPearl: w.firstPearlT, fevers: w.fevers, bestCombo: w.bestCombo, dashes: w.dashes, autoDashes: w.autoDashes, chained: w.chained,
    screenMed: after20.length ? after20[Math.floor(after20.length / 2)] : 0, screen20: at(20), screen60: at(60), screen120: at(120),
    washPerMin: Math.round(w.rescued / Math.max(1, w.t) * 60), washBins, kings: w.kingsWashed, golds: w.goldCaught, clams: w.clamsOpened,
  };
}

export function summary(opts, seeds = 12) {
  const runs = [];
  for (let s = 1; s <= seeds; s++) runs.push(runSim(Object.assign({}, opts, { seed: s })));
  const avg = k => runs.reduce((a, r) => a + (r[k] || 0), 0) / runs.length;
  const med = k => { const v = runs.map(r => r[k]).filter(x => x != null).sort((a, b) => a - b); return v.length ? v[Math.floor(v.length / 2)] : null; };
  const fh = runs.filter(r => r.firstHurt != null).map(r => r.firstHurt).sort((a, b) => a - b);
  return {
    success: +(runs.filter(r => r.success).length / runs.length).toFixed(2), bossWashed: +(runs.filter(r => r.result === "boss").length / runs.length).toFixed(2),
    time: Math.round(avg("time")), timeMed: med("time"), pearls: +avg("pearls").toFixed(1), quizzes: +avg("quizzes").toFixed(1), quiz60: +avg("quiz60").toFixed(1), rescued: Math.round(avg("rescued")), hurts: +avg("hurts").toFixed(1),
    firstHurtMedian: fh.length ? fh[Math.floor(fh.length / 2)] : null, rescueUsed: +(runs.filter(r => r.rescueUsed).length / runs.length).toFixed(2), blastWashed: Math.round(avg("blastWashed")), dps: Math.round(avg("dps")),
    firstPearl: +(med("firstPearl") || 0).toFixed(1), firstPearlMax: +Math.max(...runs.map(r => r.firstPearl || 99)).toFixed(1), fevers: +avg("fevers").toFixed(1), fevMin: Math.min(...runs.map(r => r.fevers)), fevMax: Math.max(...runs.map(r => r.fevers)),
    bestCombo: med("bestCombo"), dashes: Math.round(avg("dashes")), screenMed: med("screenMed"), screen20: med("screen20"), screen60: med("screen60"), screen120: med("screen120"), washPerMin: med("washPerMin"), chained: Math.round(avg("chained")),
    kings: +avg("kings").toFixed(1), golds: +avg("golds").toFixed(1), clams: +avg("clams").toFixed(1), runs,
  };
}

if (process.argv[1] && process.argv[1].replace(/\\/g, "/").endsWith("tests/sim.mjs")) {
  const seeds = +(process.argv[2] || 12);
  const only = process.argv[3] || "";
  const t0 = Date.now();
  const rows = [];
  for (const kid of [0, 1, 2, 3]) for (const policy of ["none", "half", "all"]) rows.push([L.PILOTS[kid].name + "·" + { none: "안 풂", half: "절반", all: "다 맞힘" }[policy], { kid, policy }]);
  rows.push(["재이·절반·동굴", { kid: 1, policy: "half", zone: "cave" }]);
  for (const [label, o] of rows) {
    if (only && !label.includes(only)) continue;
    const r = summary(o, seeds); delete r.runs;
    console.log(label.padEnd(10), JSON.stringify(r));
  }
  console.log("ms", Date.now() - t0);
}
