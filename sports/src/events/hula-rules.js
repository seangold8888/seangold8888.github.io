// 훌라후프 규칙 엔진(DOM 없음). 화면(hula.js)과 Node 모의 실험(tests/hula.test.mjs)이 같은 엔진을 쓴다.
//
// 후프 각도 phi: 한 바퀴 = 2π. phi 가 2π 의 배수를 지나는 순간 = "박자"(후프가 몸 앞을 지나는 순간, 아틀라스 events.front).
// 후프 높이 h: 0~1. 잘 돌리면 올라가고(1 = 허리 위로 반짝), 박자를 놓치면 내려가고, 0 이 되면 "앗!" 툭 떨어진다.
//
// 조작은 아이마다 다르다(LEVELS.mode):
//   "circle"(재이): 화면에 손가락으로 동그라미. 손가락이 도는 빠르기(rad/s)가 후프 빠르기(목표 박자)와 띠(band) 안에서 맞으면 성공.
//       후프는 손가락 빠르기로 돈다(느리게 돌리면 후프도 느려지고 처진다). 한 바퀴마다 그 바퀴의 평균 빠르기 비율로 판정.
//   "tap"(태오): 후프는 목표 박자로 저절로 돈다. 박자 고리가 줄어들어 겹칠 때 톡(창 ±window 초). 놓치면 처진다.
//       창 밖 톡은 후프가 흔들린다(조금 처짐) — 마구 누르기로는 못 버틴다.
//   카메라(몸으로 돌리기): 두 아이 모두 "tap" 규칙 + 넓은 창. 엉덩이 한 바퀴(circle 이벤트) = 톡.
// 콤보로 후프가 늘어난다(재이 최대 3개, 태오 2개). 실수하면 덤 후프가 하나 툭, 떨어지면 다 툭.
// 판: 1 빙글빙글 → 보너스 문제(요술 후프) → 2 빨라져요 → 보너스 문제 → 3 빠르게 천천히(박자가 바뀐다). 한 사람 약 75초.

export const ROUND_LEN = 22;          // 판마다 초
export const READY_LEN = 1.6;         // "준비… 시작!"(이때 후프는 목표 박자로 혼자 돌며 빠르기를 보여 준다)
export const DROP_LEN = 1.4;          // 떨어진 후프를 다시 주워 돌리기까지
export const START_H = 0.72;
export const ROUND_DEFS = Object.freeze({
  basic: Object.freeze({ id: "basic", name: "빙글빙글", line: { circle: "손가락으로 빙글빙글!", tap: "고리가 겹치면 톡!" } }),
  fast: Object.freeze({ id: "fast", name: "빨라져요!", line: { circle: "더 빨리 빙글빙글!", tap: "조금 더 빨리 톡!" } }),
  swap: Object.freeze({ id: "swap", name: "빠르게 천천히", line: { circle: "빠르기가 바뀌어요!", tap: "빠르기가 바뀌어요!" } }),
});
export const DEFAULT_ROUNDS = Object.freeze(["basic", "fast", "swap"]);
export const ROUNDS = DEFAULT_ROUNDS.map(id => ROUND_DEFS[id]);
export function roundDef(s, i = s.round) { return ROUND_DEFS[s.rounds[i]] || ROUND_DEFS.basic; }
export const SWAP_EVERY = 5.5;        // 빠르게 천천히 판: 박자가 바뀌는 간격(초)

// 아이별 난이도(level 0 = 태오, 2 = 재이; 1·3 은 나중 선수 칸). 목표: 그 아이가 한 판에 80% 안팎 성공.
//   period  판마다 후프 한 바퀴 초 [빙글빙글, 빨라져요, 빠르게천천히(빠른 쪽)] — 빠르게천천히의 느린 쪽은 period[0]
//   window  (tap) 박자 ± 초 / perfect 퍼펙트 ± 초 (circle 은 빠르기 비율 ±)
//   band    (circle) 빠르기 비율 성공 띠 ±
//   gain    성공 때 오르는 높이, slip 놓쳤을 때 내려가는 높이, wobble 창 밖 톡(흔들림)
//   step    덤 후프 하나 얻는 연속 성공 수, extra 덤 후프 최대 수
export const LEVELS = Object.freeze([   // 11-22 대표님 "훌라후프는 너무 어렵던데" → 느리게·넓게·덜 처지게
  Object.freeze({ kid: "taeo", mode: "tap", period: [1.6, 1.45, 1.3], window: 0.38, perfect: 0.13, band: 0, gain: 0.2, slip: 0.26, wobble: 0.04, step: 5, extra: 1 }),
  Object.freeze({ kid: "", mode: "tap", period: [1.4, 1.25, 1.1], window: 0.3, perfect: 0.1, band: 0, gain: 0.18, slip: 0.3, wobble: 0.06, step: 6, extra: 2 }),
  Object.freeze({ kid: "jaei", mode: "circle", period: [1.2, 1.05, 0.95], window: 0, perfect: 0.13, band: 0.33, gain: 0.2, slip: 0.26, wobble: 0, step: 6, extra: 2 }),
  Object.freeze({ kid: "", mode: "circle", period: [1.0, 0.85, 0.75], window: 0, perfect: 0.1, band: 0.28, gain: 0.17, slip: 0.32, wobble: 0, step: 7, extra: 2 }),
]);
// 너무 빨리 돌린 바퀴는 느린 바퀴보다 덜 처진다(신나서 빨리 돌린 것)
export const FAST_SLIP = 0.6;
// circle: 손가락이 거의 멈추면(목표의 STALL 배 미만) 후프가 계속 처진다(초당 DRAIN)
export const STALL = 0.3, DRAIN = 0.4;

// 몸으로 돌리기(카메라): 몸은 손가락보다 느리고 감지가 0.1초쯤 늦다 → 느리게, 창은 가장 빠른 한 바퀴의 windowFrac 만큼 넓게
export const CAMERA = Object.freeze({ periodMul: 1.3, windowFrac: 0.44, perfectFrac: 0.15 });

export const POINTS = Object.freeze({ ok: 10, perfect: 5, magic: 10 });
export const MAX_HOOPS = 4;           // 덤 후프 + 요술 후프 덤까지 합쳐 화면 최대

// 메달 기준 점수(level 별). 보너스 문제(한 번에 맞힘 보상)를 받는 보통 판 기준.
// tests/hula.test.mjs 가 모의 실험(성공률 85% → 금 근처, 65% → 은, 40% → 동)과 맞는지 검사한다.
export const MEDALS = Object.freeze([
  Object.freeze({ gold: 1020, silver: 730, bronze: 510 }),
  Object.freeze({ gold: 1240, silver: 850, bronze: 550 }),
  Object.freeze({ gold: 1270, silver: 850, bronze: 590 }),
  Object.freeze({ gold: 1400, silver: 950, bronze: 640 }),
]);
// 문제 모듈이 없을 때(요술 후프 없음 — 검증 브라우저 등). 요술 후프 몫이 빠지면 점수가 고르게 줄지 않아 표를 따로 둔다(같은 모의 실험).
export const MEDALS_NOQUIZ = Object.freeze([
  Object.freeze({ gold: 580, silver: 335, bronze: 150 }),
  Object.freeze({ gold: 700, silver: 375, bronze: 170 }),
  Object.freeze({ gold: 710, silver: 360, bronze: 150 }),
  Object.freeze({ gold: 880, silver: 425, bronze: 180 }),
]);
export function medalTable(level, quizOn = true) {
  const i = Math.max(0, Math.min(3, level | 0));
  return { ...(quizOn ? MEDALS : MEDALS_NOQUIZ)[i] };
}

export function params(level, camera = false) {
  const b = LEVELS[Math.max(0, Math.min(3, level | 0))];
  if (!camera) return { ...b, period: b.period.slice(), camera: false };
  const period = b.period.map(p => Math.max(1.05, p * CAMERA.periodMul));
  return { ...b, mode: "tap", camera: true, period, window: period[2] * CAMERA.windowFrac, perfect: period[2] * CAMERA.perfectFrac, wobble: 0 };
}

// 보너스 문제 보상(요술 후프): 한 번에 = 8초 동안 저절로 + 덤 후프 하나 바로 + 100점 / 고쳐서 = 4초 + 덤 후프 + 50점
export function quizReward(firstTry) {
  return firstTry ? { magic: 8, hoop: 1, bonus: 100 } : { magic: 4, hoop: 1, bonus: 50 };
}

// circle 판정: r = 그 바퀴 평균 손가락 빠르기 / 목표 빠르기
export function judgeSpin(r, P) {
  if (Math.abs(r - 1) <= P.perfect) return "perfect";
  if (Math.abs(r - 1) <= P.band) return "good";
  return r < 1 ? "slow" : "fast";
}
// tap 판정: off = 톡 시각 - 박자 시각(초)
export function judgeTap(off, P) {
  const a = Math.abs(off);
  if (a <= P.perfect) return "perfect";
  if (a <= P.window) return "good";
  return "off";
}

const TAU = Math.PI * 2;

// 새 판: opts = { level, camera, rnd, rounds }
export function createRun(opts = {}) {
  const P = params(opts.level, !!opts.camera);
  const rounds = (opts.rounds && opts.rounds.length ? opts.rounds : DEFAULT_ROUNDS).filter(id => ROUND_DEFS[id]);
  const s = {
    P, mode: P.mode, rnd: opts.rnd || Math.random, rounds,
    t: 0, round: 0, phase: "ready", phaseT: 0, roundT: 0,
    period: P.period[0], target: P.period[0], fastNow: false, swapT: 0,
    phi: -TAU * 0.25, spin: 0,           // spin = 후프가 지금 도는 빠르기(rad/s, 그리기용)
    h: START_H, combo: 0, bestCombo: 0, streak: 0, extra: 0, bonusHoop: 0,
    score: 0, roundScore: rounds.map(() => 0),
    magic: 0, magicMax: 0,               // 요술 후프 남은 초
    // tap
    lastBeat: -9, lastJudged: true, preJudged: false,
    // circle
    input: 0, accIn: 0, accT: 0, lastRatio: 1,
    stats: { beats: 0, ok: 0, perfect: 0, slip: 0, slow: 0, fast: 0, off: 0, drops: 0, hoopsMax: 1, magicBeats: 0 },
    events: [],
  };
  return s;
}

function emit(s, type, data) { s.events.push({ type, t: s.t, ...(data || {}) }); }
export function hoops(s) { return Math.min(MAX_HOOPS, 1 + s.extra + s.bonusHoop); }
const omega = s => TAU / s.period;

// circle 입력: 손가락(또는 자동) 빠르기 rad/s. 매 프레임 넣는다(멈추면 0).
export function setInput(s, w) { s.input = Math.max(0, +w || 0); }

// tap 입력(손가락 톡 또는 몸 한 바퀴). at = 실제 시각 보정(카메라 감지 지연, 초 단위 음수)
export function tap(s, at = 0) {
  if (s.phase !== "play" || s.mode !== "tap") return false;
  const now = s.t + at;
  const sincePrev = now - s.lastBeat, untilNext = timeToBeat(s) - at;
  if (!s.lastJudged && sincePrev <= s.P.window && (sincePrev <= untilNext || s.preJudged)) {
    s.lastJudged = true; good(s, judgeTap(sincePrev, s.P)); return true;
  }
  if (!s.preJudged && untilNext <= s.P.window) {
    s.preJudged = true; good(s, judgeTap(-untilNext, s.P)); return true;
  }
  // 창 밖 톡: 후프가 흔들린다(몸 모드는 벌 없음)
  s.stats.off++;
  if (s.magic <= 0 && s.P.wobble > 0) { s.h -= s.P.wobble; emit(s, "wobble", { h: s.h }); if (s.h <= 0) drop(s); }
  return true;
}

function award(s, grade) {
  // 요술 후프가 저절로 돌린 바퀴는 후프 수 배수 없이 기본 점수만(보상은 "안 떨어짐 + 후프"; 점수가 실력을 덮지 않게)
  const pts = grade === "magic" ? POINTS.magic : Math.round((POINTS.ok + (grade === "perfect" ? POINTS.perfect : 0)) * hoops(s));
  s.score += pts; s.roundScore[s.round] += pts;
  return pts;
}

function good(s, grade) {
  s.stats.beats++; s.stats.ok++; if (grade === "perfect" || grade === "magic") s.stats.perfect++;
  s.combo++; s.bestCombo = Math.max(s.bestCombo, s.combo); s.streak++;
  s.h = Math.min(1, s.h + s.P.gain * (grade === "good" ? 1 : 1.3));
  const pts = award(s, grade);
  emit(s, "ok", { grade, points: pts, combo: s.combo, hoops: hoops(s) });
  if (s.streak >= s.P.step && s.extra < s.P.extra && hoops(s) < MAX_HOOPS) {
    s.streak = 0; s.extra++;
    s.stats.hoopsMax = Math.max(s.stats.hoopsMax, hoops(s));
    emit(s, "hoopUp", { hoops: hoops(s) });
  }
}

function slip(s, kind) {
  s.stats.beats++; s.stats.slip++; if (kind === "slow" || kind === "fast") s.stats[kind]++;
  s.combo = 0; s.streak = 0;
  s.h -= s.P.slip * (kind === "fast" ? FAST_SLIP : 1);
  let lost = false;
  if (s.extra > 0 && s.h > 0) { lost = s.extra; s.extra = 0; }
  emit(s, "slip", { kind, h: s.h, lost, hoops: hoops(s) });
  if (s.h <= 0) drop(s);
}

function drop(s) {
  s.stats.drops++;
  s.combo = 0; s.streak = 0; s.extra = 0; s.bonusHoop = 0; s.h = 0;
  s.phase = "drop"; s.phaseT = 0; s.accIn = 0; s.accT = 0;
  emit(s, "drop");
}

// 박자(후프가 몸 앞을 지남)
function beat(s) {
  if (s.mode === "tap") {
    if (!s.lastJudged) { s.lastJudged = true; if (s.magic > 0) magicBeat(s); else slip(s, "miss"); }   // (보통은 창이 끝날 때 먼저 판정된다)
    if (s.phase !== "play") return;
    s.lastBeat = s.t;
    if (s.preJudged) { s.preJudged = false; s.lastJudged = true; }
    else if (s.magic > 0) { s.lastJudged = true; magicBeat(s); }
    else s.lastJudged = false;
    emit(s, "beat");
    return;
  }
  // circle: 그 바퀴 평균 빠르기 비율로 판정
  const r = s.accT > 0 ? s.accIn / s.accT : 0;
  s.lastRatio = r; s.accIn = 0; s.accT = 0;
  emit(s, "beat", { ratio: r });
  if (s.magic > 0) { magicBeat(s); return; }
  const g = judgeSpin(r, s.P);
  if (g === "perfect" || g === "good") good(s, g); else slip(s, g);
}
function magicBeat(s) { s.stats.magicBeats++; good(s, "magic"); }

export function timeToBeat(s) {
  const w = s.spin > 0 ? s.spin : omega(s);
  let d = TAU - (((s.phi % TAU) + TAU) % TAU);
  if (d <= 0) d += TAU;
  return d / w;
}

export function step(s, dt) {
  if (s.phase === "done" || s.phase === "break") return s;
  dt = Math.min(0.1, Math.max(0, dt));
  s.t += dt; s.phaseT += dt;
  // 목표 박자(빠르게 천천히 판은 SWAP_EVERY 초마다 바뀐다; 0.5초에 걸쳐 부드럽게)
  const id = s.rounds[s.round];
  if (id === "swap" && s.phase !== "ready") {
    s.swapT += dt;
    if (s.swapT >= SWAP_EVERY) { s.swapT = 0; s.fastNow = !s.fastNow; emit(s, "tempo", { fast: s.fastNow }); }
    s.target = s.fastNow ? s.P.period[2] : s.P.period[0];
  }
  s.period += (s.target - s.period) * Math.min(1, dt * 4);

  if (s.phase === "ready") {
    s.spin = omega(s); s.phi += s.spin * dt;
    if (s.phi > 0) s.phi -= TAU;     // 준비 중엔 박자를 세지 않는다
    if (s.phaseT >= READY_LEN) {
      s.phase = "play"; s.phaseT = 0; s.phi = -TAU * 0.6; s.accIn = 0; s.accT = 0;
      s.lastBeat = -9; s.lastJudged = true; s.preJudged = false;
      emit(s, "go", { round: s.round });
    }
    return s;
  }
  s.roundT += dt;
  if (s.phase === "drop") {
    s.spin = 0;
    if (s.phaseT >= DROP_LEN) {
      s.phase = "play"; s.phaseT = 0; s.h = START_H; s.phi = -TAU * 0.75; s.accIn = 0; s.accT = 0;
      s.lastJudged = true; s.preJudged = false; s.lastBeat = s.t - 9;
      emit(s, "pickup");
    }
  } else {
    // 후프 빠르기
    const w0 = omega(s);
    if (s.mode === "tap") s.spin = w0;
    else {
      const inW = s.magic > 0 ? Math.max(s.input, w0) : s.input;
      s.spin = w0 * Math.max(0.3, Math.min(1.7, inW / w0));
      s.accIn += (inW / w0) * dt; s.accT += dt;
      if (s.magic <= 0 && inW < w0 * STALL) {          // 거의 멈춤: 후프가 계속 처진다
        s.h -= DRAIN * dt;
        if (s.h <= 0) { s.stats.slip++; s.stats.slow++; drop(s); }
      }
    }
    if (s.phase === "play") {
      const before = s.phi;
      s.phi += s.spin * dt;
      if (Math.floor(s.phi / TAU) > Math.floor(before / TAU)) beat(s);
      // tap: 박자 창이 끝났는데 안 눌렀으면 놓침
      if (s.phase === "play" && s.mode === "tap" && !s.lastJudged && s.t - s.lastBeat > s.P.window) {
        s.lastJudged = true;
        if (s.magic > 0) magicBeat(s); else slip(s, "miss");
      }
    }
    if (s.magic > 0) { s.magic = Math.max(0, s.magic - dt); if (s.magic === 0) emit(s, "magicEnd"); }
  }
  if (s.roundT >= ROUND_LEN && s.phase !== "drop") {
    emit(s, "roundEnd", { round: s.round, score: s.roundScore[s.round] });
    if (s.round >= s.rounds.length - 1) { s.phase = "done"; emit(s, "done", { score: s.score }); }
    else { s.phase = "break"; s.phaseT = 0; }
  }
  return s;
}

// 다음 판으로. reward = quizReward(...) 또는 null
export function nextRound(s, reward) {
  if (s.phase !== "break") return s;
  s.round++; s.roundT = 0; s.phase = "ready"; s.phaseT = 0; s.swapT = 0; s.fastNow = false;
  const id = s.rounds[s.round];
  s.target = id === "fast" ? s.P.period[1] : s.P.period[0];
  if (reward) applyReward(s, reward);
  emit(s, "round", { round: s.round });
  return s;
}
// 요술 후프: 정답 순간 바로(덤 후프 + 점수), 저절로 돌기는 다음 판 "시작!" 부터 magic 초
export function applyReward(s, reward) {
  if (!reward) return s;
  if (reward.bonus) { s.score += reward.bonus; s.roundScore[Math.min(s.round, s.roundScore.length - 1)] += reward.bonus; }
  if (reward.hoop) { s.bonusHoop = 1; s.stats.hoopsMax = Math.max(s.stats.hoopsMax, hoops(s)); }
  if (reward.magic) { s.magic = reward.magic; s.magicMax = reward.magic; }
  s.h = Math.max(s.h, 0.9);
  emit(s, "magic", { magic: s.magic, hoops: hoops(s) });
  return s;
}

export function timeLeft(s) { return Math.max(0, ROUND_LEN - s.roundT); }

// 모의 실험: 한 바퀴(박자)마다 hit 확률로 잘 하거나 못 한다. 결과 = 끝난 판 상태
//   circle: 잘 하면 띠 안 빠르기(perfect 비율은 퍼펙트 띠), 못 하면 너무 느리게(70%) 또는 너무 빠르게(30%)
//   tap: 잘 하면 창 안에 톡, 못 하면 안 누르기(60%) 또는 창 밖 톡(40%)
export function simulate({ level = 2, hit = 0.85, perfect = 0.4, camera = false, reward = null, seed = 1, rounds } = {}) {
  let x = seed >>> 0 || 1;
  const rnd = () => { x ^= x << 13; x >>>= 0; x ^= x >>> 17; x ^= x << 5; x >>>= 0; return x / 4294967296; };
  const s = createRun({ level, camera, rnd, rounds });
  const dt = 1 / 60, P = s.P;
  let plan = null, lastK = null, planned = null, queue = [];
  for (let i = 0; i < 60 * 400 && s.phase !== "done"; i++) {
    if (s.phase === "break") { nextRound(s, reward); plan = null; lastK = null; planned = null; queue = []; continue; }
    if (s.phase === "play") {
      const k = Math.floor(s.phi / TAU);
      if (s.mode === "circle") {
        if (k !== lastK) {     // 새 바퀴: 이번 바퀴 빠르기를 정한다
          lastK = k;
          const good = rnd() < hit;
          let r;
          if (good) r = rnd() < perfect ? 1 + (rnd() * 2 - 1) * P.perfect * 0.9 : (rnd() < 0.5 ? -1 : 1) * (P.perfect + (P.band - P.perfect) * rnd() * 0.95) + 1;
          else r = rnd() < 0.7 ? 1 - P.band - 0.04 - rnd() * 0.3 : 1 + P.band + 0.04 + rnd() * 0.3;
          plan = { r };
        }
        setInput(s, plan.r * omega(s));
      } else {
        if (planned !== k + 1) {   // 다음 박자 하나를 미리 정한다(늦게 누르는 톡은 박자 뒤에 나간다)
          planned = k + 1;
          const good = rnd() < hit, until = timeToBeat(s);
          let off = null;
          if (good) off = rnd() < perfect ? (rnd() * 2 - 1) * P.perfect * 0.9 : (rnd() < 0.5 ? -1 : 1) * (P.perfect + (P.window - P.perfect) * rnd() * 0.95);
          else if (rnd() < 0.4) off = (rnd() < 0.5 ? -1 : 1) * (P.window + 0.05 + rnd() * 0.2);
          if (off != null) { queue.push(s.t + until + off); queue.sort((a, b) => a - b); }
        }
        while (queue.length && s.t >= queue[0]) { queue.shift(); tap(s); }
      }
    } else { plan = null; lastK = null; planned = null; queue = []; if (s.mode === "circle") setInput(s, 0); }
    step(s, dt);
    s.events.length = 0;
  }
  return s;
}
