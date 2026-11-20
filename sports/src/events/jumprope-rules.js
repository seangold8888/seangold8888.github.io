// 줄넘기 규칙 엔진(DOM 없음). 화면(jumprope.js)과 Node 모의 실험(tests/)이 같은 엔진을 쓴다.
//
// 줄 각도 theta: 0 = 머리 위, PI = 발밑(이 순간 공중에 있어야 한다). 한 바퀴 시간 = period 초.
// 톡 하면 그 순간 뛴다(체공 air 초). 줄이 발밑을 지나는 순간 "뛴 지 lead 초"가 [lo, hi] 안이면 성공.
//   lead 가 air/2 (꼭대기) 에 가까우면 퍼펙트. 공중에서 또 누른 톡은 무시(2단 뛰기 자리만 예외).
// 판 구성(기본): 1판 기본 줄넘기 → (보너스 문제) → 2판 빨라져요(2단 뛰기 기회) → (보너스 문제) → 3판 슈퍼 스피드.
// "꼬마 기차"(긴 줄에 쏙 들어가기·친구가 올라타기) 판도 엔진에 있다: createRun({ rounds: [..., "train"] }).
//   긴 줄을 돌려 줄 사람 그림과 "줄 없이 뛰는" 아틀라스가 생기면 기본 판에 넣는다(ART-SPEC.md).

export const ROUND_LEN = 22;          // 판마다 초(판 끝은 다음 줄 지나감까지 기다리지 않고 끊는다)
export const READY_LEN = 1.6;         // "준비… 시작!" 시간
export const TRIP_LEN = 0.9;          // 걸려 넘어진 뒤 다시 돌 때까지
export const ROUND_DEFS = Object.freeze({
  basic: Object.freeze({ id: "basic", name: "줄넘기", line: "줄이 발에 오면 톡!" }),
  fast: Object.freeze({ id: "fast", name: "빨라져요!", line: "점점 빨라져요!" }),
  super: Object.freeze({ id: "super", name: "슈퍼 스피드", line: "더 빨리! 금빛 줄은 톡톡!" }),
  train: Object.freeze({ id: "train", name: "꼬마 기차", line: "줄이 올라갈 때 쏙 들어가요!" }),
});
export const DEFAULT_ROUNDS = Object.freeze(["basic", "fast", "super"]);
export const ROUNDS = DEFAULT_ROUNDS.map(id => ROUND_DEFS[id]);       // 기본 판 목록(이름·한 줄)
export function roundDef(s, i = s.round) { return ROUND_DEFS[s.rounds[i]] || ROUND_DEFS.basic; }
const isTrain = s => s.rounds[s.round] === "train";
const dblRound = s => s.rounds[s.round] === "fast" || s.rounds[s.round] === "super";

// 아이별 난이도(level 0 = 태오, 2 = 재이; 1·3 은 나중에 다른 선수가 생길 때를 위한 칸). 목표: 그 아이가 한 판에 80% 안팎 성공.
//   period0  처음 한 바퀴 초 / periodMin 가장 빠를 때 / speedUp 성공할 때마다 곱
//   air 체공 초, lo~hi 성공 창(뛴 뒤 줄이 지나가기까지 초), perfect 꼭대기 ± 초
//   dbl 빨라져요 판에서 2단 뛰기 기회가 나올 확률(슈퍼 스피드 판은 ×1.6, 태오는 0이라 늘 한 번 뛰기), dblGap 두 번 톡 사이 허용 초, entry 꼬마 기차 들어가기 창(한 바퀴 비율)
export const LEVELS = Object.freeze([
  Object.freeze({ kid: "taeo", period0: 1.55, periodMin: 1.08, speedUp: 0.99, air: 0.66, lo: 0.02, hi: 0.64, perfect: 0.13, dbl: 0, dblGap: 0, entry: [0.03, 0.62] }),
  Object.freeze({ kid: "", period0: 1.35, periodMin: 0.88, speedUp: 0.986, air: 0.58, lo: 0.04, hi: 0.54, perfect: 0.10, dbl: 0.07, dblGap: 0.4, entry: [0.05, 0.55] }),
  Object.freeze({ kid: "jaei", period0: 1.18, periodMin: 0.74, speedUp: 0.983, air: 0.52, lo: 0.06, hi: 0.47, perfect: 0.075, dbl: 0.15, dblGap: 0.36, entry: [0.06, 0.5] }),
  Object.freeze({ kid: "", period0: 1.0, periodMin: 0.6, speedUp: 0.98, air: 0.47, lo: 0.07, hi: 0.41, perfect: 0.06, dbl: 0.24, dblGap: 0.32, entry: [0.07, 0.45] }),
]);

// 진짜로 뛰기(카메라) 보정: 몸으로 뛰는 것은 손가락보다 느리고 감지가 0.1초쯤 늦다.
export const CAMERA = Object.freeze({ periodMul: 1.25, lo: -0.06, hi: 0.16, perfect: 0.05, air: 0.12 });

// 메달 기준 점수(level 별). 보너스 문제(한 번에 맞힘 보상)를 받는 보통 판 기준.
// tests/jumprope.test.mjs 가 모의 실험(성공률 85% → 금 근처, 65% → 은, 40% → 동)과 맞는지 검사한다.
export const MEDALS = Object.freeze([
  Object.freeze({ gold: 1450, silver: 880, bronze: 530 }),
  Object.freeze({ gold: 1800, silver: 970, bronze: 550 }),
  Object.freeze({ gold: 2100, silver: 1080, bronze: 580 }),
  Object.freeze({ gold: 2600, silver: 1160, bronze: 600 }),
]);
// 문제 모듈이 없을 때(검증 브라우저 등)는 보상 배수가 없으니 기준을 낮춘다
export const NO_QUIZ_SCALE = 0.5;
export function medalTable(level, quizOn = true) {
  const m = MEDALS[Math.max(0, Math.min(3, level | 0))];
  if (quizOn) return m;
  const k = NO_QUIZ_SCALE;
  return { gold: Math.round(m.gold * k), silver: Math.round(m.silver * k), bronze: Math.round(m.bronze * k) };
}

export const POINTS = Object.freeze({ ok: 10, perfect: 5, double: 30, doublePerfect: 10, enter: 20 });
export function comboMult(c) { return 1 + Math.min(3, Math.floor(c / 5)) * 0.5; }
export function trainMult(n) { return 1 + 0.5 * Math.max(0, n - 1); }

export function params(level, camera = false) {
  const b = LEVELS[Math.max(0, Math.min(3, level | 0))];
  if (!camera) return { ...b, camera: false };
  return {
    ...b, camera: true, dbl: 0,
    period0: b.period0 * CAMERA.periodMul, periodMin: b.periodMin * CAMERA.periodMul,
    air: b.air + CAMERA.air, lo: Math.max(0, b.lo + CAMERA.lo), hi: b.hi + CAMERA.hi, perfect: b.perfect + CAMERA.perfect,
    entry: [Math.max(0.02, b.entry[0] - 0.02), Math.min(0.7, b.entry[1] + 0.12)],
  };
}

// 한 번 뛰기 판정: lead = 줄이 발밑을 지난 시각 - 뛴 시각
export function judge(lead, P, big = false) {
  const hi = big ? P.air * 1.75 - P.lo : P.hi;
  if (!(lead >= P.lo && lead <= hi)) return "miss";
  const apex = big ? null : P.air / 2;
  if (apex != null && Math.abs(lead - apex) <= P.perfect) return "perfect";
  return "good";
}

// 꼬마 기차 들어가기: sinceCross = 줄이 발밑을 지난 뒤 흐른 초(줄이 올라가는 동안 들어가야 한다)
export function entryOk(sinceCross, period, P) {
  const f = sinceCross / period;
  return f >= P.entry[0] && f <= P.entry[1];
}

// 2단 뛰기 두 번째 줄 간격: 첫 줄을 넘은 뒤 남은 체공 안에 꼭 들어오게(잘 뛰었으면 반드시 넘을 수 있게)
export function doubleGap(lead1, period, P) {
  const air2 = P.air * 1.75;
  return Math.max(0.12, Math.min(period * 0.5, air2 - lead1 - P.lo * 1.5));
}

const TAU = Math.PI * 2;

// 새 판: opts = { level, camera, rnd, rounds }
export function createRun(opts = {}) {
  const P = params(opts.level, !!opts.camera);
  const rounds = (opts.rounds && opts.rounds.length ? opts.rounds : DEFAULT_ROUNDS).filter(id => ROUND_DEFS[id]);
  return {
    P, rnd: opts.rnd || Math.random, rounds,
    t: 0, round: 0, phase: "ready", phaseT: 0, roundT: 0,
    period: P.period0, theta: 0, lastCross: -9,
    jumpT: -9, big: false, lastTap: -9,
    combo: 0, bestCombo: 0, score: 0, roundScore: rounds.map(() => 0),
    mult: 1, shield: 0, rainbow: false,
    dbl: null,            // null | "warn"(금빛 줄: 두 번 톡 기회) | "spin"(두 번째 줄이 도는 중)
    dblCross: 0,
    inRope: true, jumpers: 1, trainRun: 0,
    stats: { jumps: 0, ok: 0, perfect: 0, miss: 0, saves: 0, doubles: 0, entries: 0, joins: 0, crossings: 0 },
    events: [],
  };
}

function emit(s, type, data) { s.events.push({ type, t: s.t, ...(data || {}) }); }
export function airborne(s) { const air = s.big ? s.P.air * 1.75 : s.P.air; return s.t - s.jumpT < air; }
// 지금 몸 높이 0~1(그리기용)
export function height(s) {
  const air = s.big ? s.P.air * 1.75 : s.P.air, u = (s.t - s.jumpT) / air;
  if (!(u >= 0 && u < 1)) return 0;
  return 4 * u * (1 - u) * (s.big ? 1.45 : 1);
}

// 손가락 톡(또는 몸으로 뛴 순간). at = 실제 뛴 시각 보정(카메라 감지 지연, 초 단위 음수)
export function tap(s, at = 0) {
  if (s.phase !== "play") return false;
  const now = s.t + at;
  if (isTrain(s) && !s.inRope) {
    if (s.t - s.lastTap < 0.45) return false;    // 막 부딪힌 뒤 연타 막기
    s.lastTap = s.t;
    if (entryOk(now - s.lastCross, s.period, s.P)) {
      s.inRope = true; s.jumpT = -9; s.stats.entries++; s.score += POINTS.enter; s.roundScore[s.round] += POINTS.enter;
      emit(s, "enter", { points: POINTS.enter });
    } else { s.combo = 0; emit(s, "bonk"); }
    return true;
  }
  if (airborne(s)) {
    // 2단 뛰기: 금빛 줄에서 두 번째 톡이 짧은 간격 안에 오면 크게 뛴다
    if (s.dbl === "warn" && !s.big && now - s.jumpT <= s.P.dblGap) { s.big = true; emit(s, "bigjump"); return true; }
    return false;
  }
  s.jumpT = now; s.big = false; s.lastTap = s.t; s.stats.jumps++;
  emit(s, "jump");
  return true;
}

function award(s, base, extra) {
  const pts = Math.round((base + extra) * comboMult(s.combo) * s.mult * (isTrain(s) ? trainMult(s.jumpers) : 1));
  s.score += pts; s.roundScore[s.round] += pts;
  return pts;
}

function crossing(s) {
  s.stats.crossings++;
  s.lastCross = s.t;
  if (isTrain(s) && !s.inRope) return;                // 아직 줄 밖(기차 들어가기 전)
  const lead = s.t - s.jumpT;
  if (s.dbl === "spin") {                             // 2단 뛰기 두 번째 줄
    s.dbl = null;
    if (s.big && lead <= s.P.air * 1.75 - s.P.lo * 0.5) {
      s.combo++; s.stats.doubles++; s.stats.ok++;
      const pts = award(s, POINTS.double, POINTS.doublePerfect);
      emit(s, "double", { points: pts, combo: s.combo });
    } else miss(s);
    s.bestCombo = Math.max(s.bestCombo, s.combo);
    return;
  }
  const g = judge(lead, s.P, s.big);
  if (g === "miss") { s.dbl = null; miss(s); return; }
  s.combo++; s.stats.ok++; if (g === "perfect") s.stats.perfect++;
  s.bestCombo = Math.max(s.bestCombo, s.combo);
  const pts = award(s, POINTS.ok, g === "perfect" ? POINTS.perfect : 0);
  emit(s, "ok", { grade: g, points: pts, combo: s.combo });
  s.period = Math.max(s.P.periodMin * (isTrain(s) ? 1.12 : 1), s.period * s.P.speedUp);
  if (s.dbl === "warn") {
    if (s.big) { s.dbl = "spin"; s.dblCross = doubleGap(lead, s.period, s.P); emit(s, "spin"); return; }
    s.dbl = null;                                     // 한 번만 뛰었으면 그냥 보통 성공(벌 없음)
  }
  if (isTrain(s)) {
    s.trainRun++;
    if (s.trainRun >= 3 && s.jumpers < 4) { s.trainRun = 0; s.jumpers++; s.stats.joins++; emit(s, "join", { n: s.jumpers }); }
  }
  const chance = s.P.dbl * (s.rounds[s.round] === "super" ? 1.6 : 1);
  if (dblRound(s) && !s.dbl && chance > 0 && s.rnd() < chance) { s.dbl = "warn"; emit(s, "dblwarn"); }
}

function miss(s) {
  if (s.shield > 0) {                                 // 무지개 줄: 한 번 봐줌(콤보 유지, 넘어지지 않음)
    s.shield--; s.stats.saves++;
    if (s.shield <= 0) s.rainbow = false;             // 봐주기를 다 쓰면 줄도 원래 색으로(계속 무지개면 아직 지켜 주는 줄 안다)
    emit(s, "save", { left: s.shield });
    return;
  }
  s.stats.miss++; s.combo = 0; s.trainRun = 0;
  const scatter = isTrain(s) && s.jumpers > 1; s.jumpers = 1;
  s.phase = "trip"; s.phaseT = 0; s.big = false; s.jumpT = -9;
  s.period = Math.min(s.P.period0 * (isTrain(s) ? 1.05 : s.rounds[s.round] === "super" ? 0.85 : 1), s.period * 1.12);
  emit(s, "miss", { scatter });
}

export function step(s, dt) {
  if (s.phase === "done" || s.phase === "break") return s;
  dt = Math.min(0.1, Math.max(0, dt));
  s.t += dt; s.phaseT += dt;
  if (s.phase === "ready") {
    if (s.phaseT >= READY_LEN) { s.phase = "play"; s.phaseT = 0; emit(s, "go", { round: s.round }); }
    return s;
  }
  s.roundT += dt;
  if (s.phase === "trip") {
    s.theta = Math.PI + 0.25;                         // 줄은 발 앞에 멈춰 있다
    if (s.phaseT >= TRIP_LEN) { s.phase = "play"; s.phaseT = 0; s.theta = Math.PI + 0.3; }
  } else {
    const speed = s.dbl === "spin" ? TAU / s.dblCross : TAU / s.period;
    const before = s.theta;
    s.theta += speed * dt;
    // 발밑(PI)을 지났나: 한 바퀴 단위로 본다
    const k0 = Math.floor((before - Math.PI) / TAU), k1 = Math.floor((s.theta - Math.PI) / TAU);
    if (k1 > k0) crossing(s);
    if (s.theta > TAU * 4) s.theta -= TAU * 2;
  }
  if (s.roundT >= ROUND_LEN && s.phase !== "trip" && s.dbl !== "spin") {
    emit(s, "roundEnd", { round: s.round, score: s.roundScore[s.round] });
    if (s.round >= s.rounds.length - 1) { s.phase = "done"; emit(s, "done", { score: s.score }); }
    else { s.phase = "break"; s.phaseT = 0; }
  }
  return s;
}

// 다음 판으로. reward = { mult, shield, rainbow } (보너스 문제를 맞혔을 때) 또는 null
export function nextRound(s, reward) {
  if (s.phase !== "break") return s;
  s.round++; s.roundT = 0; s.phase = "ready"; s.phaseT = 0; s.theta = 0; s.dbl = null; s.big = false; s.jumpT = -9;
  s.mult = reward && reward.mult ? reward.mult : 1;
  s.shield = reward && reward.shield ? reward.shield : 0;
  s.rainbow = !!(reward && reward.rainbow);
  if (reward && reward.bonus) { s.score += reward.bonus; s.roundScore[s.round] += reward.bonus; }
  const id = s.rounds[s.round];
  if (id === "fast") s.period = Math.max(s.P.periodMin, Math.min(s.period, s.P.period0 * 0.9));
  if (id === "super") s.period = Math.max(s.P.periodMin, Math.min(s.period, s.P.period0 * 0.8));
  if (id === "train") { s.inRope = false; s.jumpers = 1; s.trainRun = 0; s.period = s.P.period0 * 0.95; s.lastCross = -9; }
  emit(s, "round", { round: s.round });
  return s;
}

// 보너스 문제 보상(한 번에 맞힘 / 고쳐서 맞힘). 점수 배수는 다음 판 내내, 무지개 줄은 봐주기(shield)가 남아 있는 동안만.
export function quizReward(firstTry) {
  return firstTry ? { mult: 1.5, shield: 2, rainbow: true, bonus: 100 } : { mult: 1.25, shield: 1, rainbow: true, bonus: 50 };
}

// 판이 끝나기까지 남은 초(그리기용)
export function timeLeft(s) { return Math.max(0, ROUND_LEN - s.roundT); }

// 자동 뛰기(시연 화면·모의 실험·검증용): 다음 발밑까지 남은 시간을 보고 정한 lead 에 톡
export function nextCrossIn(s) {
  if (s.phase !== "play") return Infinity;
  const speed = s.dbl === "spin" ? TAU / s.dblCross : TAU / s.period;
  let d = Math.PI - (((s.theta % TAU) + TAU) % TAU);
  if (d <= 0) d += TAU;
  return d / speed;
}

// 모의 실험: hit 확률로 "좋은 때" 또는 "나쁜 때"에 톡. 결과 = 끝난 판 상태
export function simulate({ level = 2, hit = 0.85, perfect = 0.4, dblHit = 0.5, camera = false, reward = null, seed = 1, rounds } = {}) {
  let x = seed >>> 0 || 1;
  const rnd = () => { x ^= x << 13; x >>>= 0; x ^= x >>> 17; x ^= x << 5; x >>>= 0; return x / 4294967296; };
  const s = createRun({ level, camera, rnd, rounds });
  const dt = 1 / 60;
  let plan = null;          // { at: 톡할 게임 시각, dbl: 2단 두 번째 톡 시각 }
  for (let i = 0; i < 60 * 400 && s.phase !== "done"; i++) {
    if (s.phase === "break") { nextRound(s, reward); plan = null; continue; }
    if (s.phase === "play") {
      if (s.rounds[s.round] === "train" && !s.inRope) {
        if (!plan) {
          const good = rnd() < hit, f = good ? (s.P.entry[0] + s.P.entry[1]) / 2 : s.P.entry[1] + 0.2;
          plan = { at: (s.lastCross > 0 ? s.lastCross : s.t) + f * s.period };
          if (plan.at < s.t) plan.at = s.t + f * s.period;
        }
      } else if (!plan && !airborne(s)) {
        const until = nextCrossIn(s);
        if (until < 2) {
          const P = s.P, good = rnd() < hit;
          let lead;
          if (good) lead = rnd() < perfect ? P.air / 2 : (rnd() < 0.5 ? P.lo + (P.air / 2 - P.perfect - P.lo) * rnd() : P.air / 2 + P.perfect + (P.hi - P.air / 2 - P.perfect) * rnd());
          else lead = rnd() < 0.5 ? P.hi + 0.06 + rnd() * 0.12 : Math.max(0, P.lo - 0.05 - rnd() * 0.05);
          lead = Math.max(0, Math.min(lead, until));
          plan = { at: s.t + until - lead, dbl: s.dbl === "warn" && rnd() < dblHit };
        }
      }
      if (plan && s.t >= plan.at) {
        tap(s);
        if (plan.dbl) tap(s);
        plan = null;
      }
    } else plan = null;
    step(s, dt);
    s.events.length = 0;
  }
  return s;
}
