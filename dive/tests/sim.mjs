// 딥 다이브 균형 시뮬레이션: 진짜 엔진(engine.js)을 화면 없이 돌리고, "피하기만 잘하는" 꼬마 로봇이 조종한다.
// policy: none(문제를 하나도 안 풂) | all(? 진주마다 한 번에 맞힘) | half(절반은 한 번에, 절반은 고쳐 맞힘)
// 직접 돌리기: node dive/tests/sim.mjs
import * as L from "../src/logic.js";
import * as E from "../src/engine.js";

export function seeded(seed) { let s = (seed * 2654435761) >>> 0 || 1; return () => { s ^= s << 13; s >>>= 0; s ^= s >> 17; s ^= s << 5; s >>>= 0; return s / 4294967296; }; }

function botMove(w, policy) {
  const p = w.p; let fx = 0, fy = 0;
  for (const e of w.enemies) {
    const dx = p.x - e.x, dy = p.y - e.y, d = Math.hypot(dx, dy) || 1, R = e.kind === "boss" ? 300 : e.kind === "eel" ? 140 : 190;
    if (d < R) { const s = (R - d) / R, k = s * s * (e.kind === "boss" ? 3 : 1); fx += dx / d * k; fy += dy / d * k; }
  }
  for (const k of w.inks) { const dx = p.x - k.x, dy = p.y - k.y, d = Math.hypot(dx, dy) || 1; if (d < 110) { const s = (110 - d) / 110; fx += dx / d * s * 2; fy += dy / d * s * 2; } }
  for (const a of w.warns) { // 곰치 경고 줄에서 옆으로 비킨다
    const rx = p.x - a.x1, ry = p.y - a.y1, cross = rx * -a.uy + ry * a.ux;
    if (Math.abs(cross) < 70) { const sgn = cross >= 0 ? 1 : -1; fx += -a.uy * sgn * 2; fy += a.ux * sgn * 2; }
  }
  const M = 160; // 벽
  if (p.x < M) fx += (M - p.x) / M * 1.5; if (p.x > L.WORLD.w - M) fx -= (p.x - (L.WORLD.w - M)) / M * 1.5;
  if (p.y < M) fy += (M - p.y) / M * 1.5; if (p.y > L.WORLD.h - M) fy -= (p.y - (L.WORLD.h - M)) / M * 1.5;
  // 위험이 크면 살짝 옆으로 돌아 빠진다(원을 그리며 피하기)
  const mag = Math.hypot(fx, fy);
  if (mag > 0.05) { const c = Math.cos(0.5), s = Math.sin(0.5); const x = fx * c - fy * s, y = fx * s + fy * c; fx = x; fy = y; }
  // 끌리는 것: ? 진주(푸는 아이만), 빛 방울
  const want = (tx, ty, k) => { const dx = tx - p.x, dy = ty - p.y, d = Math.hypot(dx, dy) || 1; fx += dx / d * k; fy += dy / d * k; };
  if (policy !== "none" && w.qpearls.length) { const q = w.qpearls[0]; want(q.x, q.y, mag < 0.6 ? 0.9 : 0.3); }
  let best = null, bd = 260 * 260; for (const o of w.orbs) { const d = (o.x - p.x) ** 2 + (o.y - p.y) ** 2; if (d < bd) { bd = d; best = o; } }
  if (best) want(best.x, best.y, mag < 0.4 ? 0.5 : 0.15);
  if (!best && mag < 0.05) want(L.WORLD.w / 2 + Math.cos(w.t * 0.3) * 300, L.WORLD.h / 2 + Math.sin(w.t * 0.3) * 220, 0.4);
  const n = Math.hypot(fx, fy);
  if (n < 0.05) return { x: 0, y: 0 };
  return { x: fx / Math.max(n, 0.35), y: fy / Math.max(n, 0.35) };
}

export function runSim({ kid = 1, policy = "all", seed = 1, zone = "coral", dt = 1 / 20, firstTryRate = null } = {}) {
  const rng = seeded(seed), qrng = seeded(seed * 7 + 3);
  const w = E.createWorld({ kid, zone, rng, view: { w: 720, h: 540 } });
  const rate = firstTryRate != null ? firstTryRate : policy === "all" ? 1 : policy === "half" ? 0.5 : 0;
  let quizzes = 0, firstHurt = null, overloadT = null;
  while (!w.over) {
    if (w.pending === "quiz") {
      if (policy === "none") { w.pending = null; continue; }
      quizzes++;
      const first = qrng() < rate; E.recordQuiz(w, first); E.quizBlast(w, first); w.quizGear++;
      const cards = L.drawCards(w.load, { count: first ? w.tune.cards : 2, low: !first, rare: first && w.streak > 0 && w.streak % 3 === 0, recommend: w.tune.cards === 2, rng, hearts: w.hearts, maxHearts: w.maxHearts });
      let pick = cards[0];
      for (const c of cards) if (c.recommend || L.cardScore(c, w.load, w.hearts, w.maxHearts) > L.cardScore(pick, w.load, w.hearts, w.maxHearts)) { pick = c; if (c.recommend) break; }
      E.setLoadout(w, L.applyCard(w.load, pick), pick);
      E.resumeAfter(w);
      continue;
    }
    if (w.pending === "rescue") {
      if (policy === "none") { w.over = { result: "tired", time: w.t }; break; }
      E.recordQuiz(w, qrng() < rate); E.revive(w); continue;
    }
    const h = w.hurts;
    E.stepWorld(w, dt, botMove(w, policy));
    if (w.hurts > h && firstHurt == null) firstHurt = w.t;
    if (overloadT == null && w.enemies.length >= 45) overloadT = w.t;
    if (w.t > L.RUN_TIME + 5) break;
  }
  return {
    result: w.over ? w.over.result : "?", time: Math.round(w.t), success: !!w.over && (w.over.result === "boss" || w.over.result === "escape"),
    pearls: w.pearlN, quizzes, rescued: w.rescued, hurts: w.hurts, firstHurt: firstHurt == null ? null : Math.round(firstHurt), overloadT: overloadT == null ? null : Math.round(overloadT),
    rescueUsed: w.rescueUsed, blastWashed: w.blastWashed, dps: Math.round(L.loadoutDps(w.load)), load: w.load,
  };
}

export function summary(opts, seeds = 12) {
  const runs = [];
  for (let s = 1; s <= seeds; s++) runs.push(runSim(Object.assign({}, opts, { seed: s })));
  const avg = k => runs.reduce((a, r) => a + (r[k] || 0), 0) / runs.length;
  const fh = runs.filter(r => r.firstHurt != null).map(r => r.firstHurt).sort((a, b) => a - b);
  return {
    success: runs.filter(r => r.success).length / runs.length, bossWashed: runs.filter(r => r.result === "boss").length / runs.length,
    time: Math.round(avg("time")), pearls: +avg("pearls").toFixed(1), quizzes: +avg("quizzes").toFixed(1), rescued: Math.round(avg("rescued")), hurts: +avg("hurts").toFixed(1),
    firstHurtMedian: fh.length ? fh[Math.floor(fh.length / 2)] : null, rescueUsed: runs.filter(r => r.rescueUsed).length / runs.length, blastWashed: Math.round(avg("blastWashed")), dps: Math.round(avg("dps")), runs,
  };
}

if (import.meta.url === "file:///" + process.argv[1].replace(/\\/g, "/").replace(/^\//, "") || process.argv[1].endsWith("sim.mjs")) {
  const seeds = +(process.argv[2] || 12);
  const t0 = Date.now();
  for (const [label, o] of [["(가) 재이·안 풂", { kid: 1, policy: "none" }], ["(가') 윤찬·안 풂", { kid: 0, policy: "none" }], ["(나) 재이·다 맞힘", { kid: 1, policy: "all" }], ["(나') 윤찬·다 맞힘", { kid: 0, policy: "all" }], ["(다) 재이·절반", { kid: 1, policy: "half" }], ["(다') 윤찬·절반", { kid: 0, policy: "half" }], ["(라) 태오·절반", { kid: 3, policy: "half" }], ["(라') 태오·안 풂", { kid: 3, policy: "none" }], ["윤건·절반", { kid: 2, policy: "half" }], ["재이·절반·동굴", { kid: 1, policy: "half", zone: "cave" }]]) {
    const r = summary(o, seeds); delete r.runs;
    console.log(label.padEnd(14), JSON.stringify(r));
  }
  console.log("ms", Date.now() - t0);
}
