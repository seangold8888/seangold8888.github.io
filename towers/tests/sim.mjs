// Spell Towers 균형 시뮬레이션: 진짜 엔진(engine.js)을 화면 없이 돌리고, 탑을 합리적으로 놓는 꼬마 로봇이 한다.
// policy: none(문제를 하나도 안 풂 — 부엉이를 안 누름) | all(부엉이마다 한 번에 맞힘) | half(절반은 한 번에, 절반은 고쳐 맞힘)
//         loose(가장 느슨한 아이: 부엉이를 절반만 누르고, 그중 절반만 한 번에)
// 새 탑은 문제를 거친다(buildQuiz, 기본 켬): 탑 고르기+풀이 5~10초 정지, 한 번에 맞히면 2단계로 태어남. 배지 공짜 탑·카드 탑은 문제 없음.
// 아이처럼: 부엉이를 보고 누르기까지 1~3초, 문제 풀이 4~8초(게임은 정지 — 판 길이에만 더한다), 준비 시간은 4초 쓴다.
// 로봇: 수정이 모이면 "효율(초당 피해 × 길이 닿는 길이 ÷ 값)"이 가장 좋은 일(새 탑 / 2단계 강화)을 한다.
//       카드는 가장 낮은 단계 탑 강화를 먼저, 갈림길은 셈이 더 센 쪽.
// 직접 돌리기: node towers/tests/sim.mjs [판 수]
import * as L from "../src/logic.js";
import * as E from "../src/engine.js";

export function seeded(seed) { let s = (seed * 2654435761) >>> 0 || 1; return () => { s ^= s << 13; s >>>= 0; s ^= s >> 17; s ^= s << 5; s >>>= 0; return s / 4294967296; }; }

function value(w, kind, lv, padIdx) {
  const s = L.towerStats(kind, lv), c = L.padCoverage(w.map, padIdx, s.range);
  const airShare = w.wave >= 3 ? 0.35 : 0.1;
  let v = L.towerDps(kind, lv) * (c.ground + (s.air ? c.air * airShare * 2 : 0));
  if (w.wave >= 3 && s.air && !w.towers.some(t => L.TOWERS[t.kind].air)) v *= 2;
  return v;
}
// quizBuild(pad, kind): 새 탑을 문제로 세운다(없으면 옛 방식 — 수정만 내고 바로)
export function botAct(w, quizBuild = null) {
  for (let guard = 0; guard < 4; guard++) {
    let best = null, bv = 0;
    for (const p of w.pads) {
      if (p.tower) {
        const t = p.tower, c = E.upgradeCost(w, p.i);
        if (c == null) continue;
        const v = (value(w, t.kind, t.lv + 1, p.i) - value(w, t.kind, t.lv, p.i)) / c;
        if (v > bv) { bv = v; best = { up: p.i, cost: c }; }
      } else for (const kind of L.TOWER_IDS) {
        const cost = E.buildCost(w, kind);
        const owned = w.towers.filter(t => t.kind === kind).length;
        const v = value(w, kind, 1, p.i) / Math.max(30, cost) * (owned ? 1 / (1 + owned * 0.25) : 1.2);
        if (v > bv) { bv = v; best = { pad: p.i, kind, cost }; }
      }
    }
    if (!best || w.gems < best.cost) return;   // 가장 좋은 일을 위해 모은다
    if (best.up != null) E.upgradeWithGems(w, best.up);
    else if (quizBuild && E.buildNeedsQuiz(w)) quizBuild(best.pad, best.kind);
    else E.build(w, best.pad, best.kind);
  }
}
export function botCard(w, cards) {
  let pick = cards[0];
  for (const c of cards) if (c.recommend || L.cardScore(c, E.cardState(w)) > L.cardScore(pick, E.cardState(w))) { pick = c; if (c.recommend) break; }
  let branch = null;
  if (L.needsBranch(pick)) branch = L.towerDps(pick.kind, 3, "a") >= L.towerDps(pick.kind, 3, "b") ? "a" : "b";
  return { pick, branch };
}

// buildQuiz: 새 탑마다 문제(지금 규칙). false 면 옛 규칙(수정만)으로 비교용.
// buildRate: 탑 문제를 한 번에 맞히는 비율(없으면 부엉이와 같은 rate)
export function runSim({ kid = 1, policy = "all", seed = 1, map = "field", dt = 1 / 20, firstTryRate = null, buildQuiz = true, buildRate = null, badges = [] } = {}) {
  const rng = seeded(seed), qrng = seeded(seed * 7 + 3), brng = seeded(seed * 13 + 5);
  const w = E.createWorld({ kid, map, rng, badges });
  const rate = firstTryRate != null ? firstTryRate : policy === "all" ? 1 : policy === "half" || policy === "loose" ? 0.5 : 0;
  const bRate = buildRate != null ? buildRate : rate;
  let quizzes = 0, buildQuizzes = 0, firstSteal = null, maxMon = 0, act = 0, quizTime = 0, owlSeen = null, owlWait = 0, owlTap = false;
  // 탑 문제: 탑 고르기 1~2초 + 풀이 4~8초(게임 정지), 한 번에 맞히면 2단계
  const quizBuild = buildQuiz ? (pad, kind) => {
    buildQuizzes++; quizTime += 5 + brng() * 5;
    const first = brng() < bRate; E.recordQuiz(w, first); E.buildByQuiz(w, pad, kind, first);
  } : null;
  while (!w.over) {
    if (w.pending === "quiz") {
      quizzes++; quizTime += 4 + qrng() * 4;
      const first = qrng() < rate; E.recordQuiz(w, first); E.quizBlast(w, first);
      const { cards } = E.drawCardsFor(w, { firstTry: first, rng });
      if (cards.length) { const { pick, branch } = botCard(w, cards); E.applyCard(w, pick, branch); }
      E.resumeAfter(w);
      continue;
    }
    if (w.pending === "rescue") {
      if (policy === "none") { E.giveUp(w); break; }
      quizTime += 4 + qrng() * 4; E.recordQuiz(w, qrng() < rate); E.rescue(w); continue;
    }
    if (w.owl && w.owl !== owlSeen) { owlSeen = w.owl; owlWait = 1 + qrng() * 2; owlTap = policy !== "none" && (policy !== "loose" || qrng() < 0.5); }
    if (owlTap && w.owl && w.owl.t >= owlWait) E.tapOwl(w);
    act -= dt; if (act <= 0) { botAct(w, quizBuild); act = 0.5; }
    if (w.phase === "prep" && w.prepT < L.PREP_TIME - 4) E.startWaveNow(w);   // 준비 시간은 4초 쓴다(나머지는 바로 시작)
    const st = w.stolen;
    E.stepWorld(w, dt);
    if (w.stolen > st && firstSteal == null) firstSteal = w.wave;
    maxMon = Math.max(maxMon, w.monsters.length);
    if (w.t > 1500) break;
  }
  const res = w.over ? w.over.result : "?";
  return { result: res, success: res === "win", wave: res === "win" ? L.WAVES : w.wave, cake: w.cake, cakeMax: w.cakeMax, time: Math.round(w.t), play: Math.round(w.t + quizTime), quizzes, buildQuizzes, problems: w.solved, firstSteal, rescueUsed: w.rescueUsed, towers: w.towers.length, lv: w.towers.map(t => t.lv).join(""), maxMon, gems: w.gems };
}

export function summary(opts, seeds = 12) {
  const runs = [];
  for (let s = 1; s <= seeds; s++) runs.push(runSim(Object.assign({}, opts, { seed: s })));
  const avg = k => runs.reduce((a, r) => a + (r[k] || 0), 0) / runs.length;
  const wins = runs.filter(r => r.success);
  const fs = runs.filter(r => r.firstSteal != null).map(r => r.firstSteal).sort((a, b) => a - b);
  return {
    success: +(wins.length / runs.length).toFixed(2), wave: +avg("wave").toFixed(1),
    cakeWin: wins.length ? +(wins.reduce((a, r) => a + r.cake, 0) / wins.length).toFixed(1) : null,
    cakeAll: +avg("cake").toFixed(1), time: Math.round(avg("time")), play: Math.round(avg("play")), quizzes: +avg("quizzes").toFixed(1), buildQuizzes: +avg("buildQuizzes").toFixed(1), problems: +avg("problems").toFixed(1), maxProblems: Math.max(...runs.map(r => r.problems)), firstStealMedian: fs.length ? fs[Math.floor(fs.length / 2)] : null,
    rescue: +(runs.filter(r => r.rescueUsed).length / runs.length).toFixed(2), maxMon: Math.max(...runs.map(r => r.maxMon)), runs,
  };
}

if (process.argv[1] && process.argv[1].replace(/\\/g, "/").endsWith("towers/tests/sim.mjs")) {
  const seeds = +(process.argv[2] || 12);
  const t0 = Date.now();
  for (const map of L.MAP_IDS) {
    for (const [label, o] of [["(가) 재이·안 풂", { kid: 1, policy: "none" }], ["(가) 윤건·안 풂", { kid: 2, policy: "none" }], ["(가) 윤찬·안 풂", { kid: 0, policy: "none" }], ["(가) 태오·안 풂", { kid: 3, policy: "none" }], ["(나) 재이·다 맞힘", { kid: 1, policy: "all" }], ["(다) 재이·절반", { kid: 1, policy: "half" }], ["(다) 윤건·절반", { kid: 2, policy: "half" }], ["(다) 윤찬·절반", { kid: 0, policy: "half" }], ["(라) 태오·절반", { kid: 3, policy: "half" }], ["느슨 재이", { kid: 1, policy: "loose" }], ["느슨 윤건", { kid: 2, policy: "loose" }]]) {
      const r = summary(Object.assign({ map }, o), seeds); delete r.runs;
      console.log((map + " " + label).padEnd(22), JSON.stringify(r));
    }
  }
  console.log("ms", Date.now() - t0);
}
