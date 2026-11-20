// 야구(홈런 더비) 규칙 엔진(DOM 없음). 화면(baseball.js)과 Node 모의 실험(tests/baseball.test.mjs)이 같은 엔진을 쓴다.
//
// 한 판 = 공 10개. 공 하나: 던질 준비(windup) → 공이 날아옴(pitch, flight 초 뒤 방망이 자리에 도착) → 결과(result).
// 톡 = 휘두르기. 방망이가 공에 닿는 때 = 톡 + SWING_LEAD(휘두르는 시간). d = 닿는 때 - 공 도착 때.
//   |d| ≤ perfect → 장외 홈런(느린 화면) · ≤ great → 홈런(관중석) · ≤ good → 안타(잔디) · ≤ foul → 파울 · 그 밖 → 헛스윙.
//   방향: 빠르면(d<0) 왼쪽으로 당겨 치고, 늦으면(d>0) 오른쪽. 안 휘두르면 스트라이크.
// 5번째 공 뒤 "보너스 타임"(문제): 맞히면 황금 방망이 — 다음 공 3개(고쳐 맞히면 1개)는 휘두르기만 하면 무조건 홈런,
//   안 휘둘러도 공이 오면 방망이가 저절로 휘두른다(보상은 확실하게).

export const PITCHES = 10;
export const BONUS_AFTER = 5;            // 이 개수만큼 던진 뒤 보너스 타임(문제)
export const READY_LEN = 1.4;            // "플레이 볼!"
export const SWING_LEAD = 0.06;          // 톡 → 방망이가 공 자리에 닿기까지(그림: 당긴 자세 → contact 프레임)
export const EARLY_IGNORE = 0.3;         // 공이 이만큼(비율) 오기 전 톡은 무시(던지자마자 누른 실수 톡 막기)
export const RESULT_LEN = Object.freeze({ perfect: 4.6, great: 3.7, good: 2.8, foul: 2.0, whiff: 1.7, strike: 1.6 });
export const SLOWMO = Object.freeze({ len: 0.75, scale: 0.28 });   // 장외 홈런 순간 느린 화면(실제 초, 배속)

// 아이별 난이도(level 0 = 태오, 2 = 재이; 1·3 은 나중 칸). 목표: 그 아이가 한 판에 80% 안팎 맞힘.
//   wind 던질 준비 초 / flight0→flight1 공이 오는 초(처음→마지막, 점점 빨라짐) / jitter 공마다 속도 흔들림
//   perfect·great·good·foul 판정 반폭(초) / curve 느린 커브가 나올 확률(curveFrom 번째 공부터) / ring 타이밍 고리를 늘 보이기
export const LEVELS = Object.freeze([
  Object.freeze({ kid: "taeo", wind: 1.2, flight0: 1.7, flight1: 1.45, jitter: 0, perfect: 0.075, great: 0.15, good: 0.24, foul: 0.36, curve: 0, curveFrom: 99, ring: true }),
  Object.freeze({ kid: "", wind: 1.05, flight0: 1.4, flight1: 1.15, jitter: 0.04, perfect: 0.06, great: 0.12, good: 0.2, foul: 0.3, curve: 0.2, curveFrom: 5, ring: true }),
  Object.freeze({ kid: "jaei", wind: 0.95, flight0: 1.1, flight1: 0.9, jitter: 0.06, perfect: 0.048, great: 0.1, good: 0.16, foul: 0.24, curve: 0.35, curveFrom: 4, ring: false }),
  Object.freeze({ kid: "", wind: 0.85, flight0: 0.95, flight1: 0.78, jitter: 0.08, perfect: 0.04, great: 0.085, good: 0.135, foul: 0.2, curve: 0.45, curveFrom: 3, ring: false }),
]);
// 느린 커브: 더 느리게 오다가 휘어 떨어진다(타이밍을 한 번 더 기다려야 한다)
export const CURVE = Object.freeze({ flightMul: 1.4 });
// 진짜로 휘두르기(카메라): 감지가 늦고 몸이 느리다 → 공을 느리게, 창을 넓게
export const CAMERA = Object.freeze({ flightMul: 1.25, winMul: 1.45, wind: 0.25 });

export const POINTS = Object.freeze({ perfect: 100, great: 60, good: 30, foul: 5, whiff: 0, strike: 0, golden: 20, streak: 10, streakMax: 30 });
export const GRADE_NAME = Object.freeze({ perfect: "장외 홈런!", great: "홈런!", good: "안타!", foul: "파울", whiff: "헛스윙", strike: "스트라이크" });
export const isHomer = g => g === "perfect" || g === "great";
export const isHit = g => g === "perfect" || g === "great" || g === "good";

// 메달 기준 점수(level 별). 보너스 문제(한 번에 맞힘 = 황금 방망이 3개)를 받는 보통 판 기준.
// 판정 창이 아이별로 넓어지고(태오가 가장 넓고 느림) 점수표는 같아서 기준도 같다.
// tests/baseball.test.mjs 가 모의 실험(맞힘 85% → 금 근처, 65% → 은, 40% → 동)과 맞는지 검사한다.
export const MEDALS = Object.freeze([0, 1, 2, 3].map(() => Object.freeze({ gold: 860, silver: 680, bronze: 510 })));
// 문제 모듈이 없을 때(검증 브라우저 등)는 황금 방망이가 없으니 따로 낮춘 기준(같은 모의 실험으로 맞춤)
export const MEDALS_NO_QUIZ = Object.freeze([0, 1, 2, 3].map(() => Object.freeze({ gold: 590, silver: 400, bronze: 190 })));
export function medalTable(level, quizOn = true) {
  const i = Math.max(0, Math.min(3, level | 0));
  return { ...(quizOn ? MEDALS : MEDALS_NO_QUIZ)[i] };
}

// 보너스 문제 보상: 한 번에 = 황금 방망이 3개 + 30점, 고쳐서 = 1개 + 10점
export function quizReward(firstTry) {
  return firstTry ? { golden: 3, bonus: 30 } : { golden: 1, bonus: 10 };
}

export function params(level, camera = false) {
  const b = LEVELS[Math.max(0, Math.min(3, level | 0))];
  if (!camera) return { ...b, camera: false };
  const w = CAMERA.winMul;
  return {
    ...b, camera: true, wind: b.wind + CAMERA.wind,
    flight0: b.flight0 * CAMERA.flightMul, flight1: b.flight1 * CAMERA.flightMul,
    perfect: b.perfect * w, great: b.great * w, good: b.good * w, foul: b.foul * w, curve: 0,
  };
}

// 판정: d = 닿은 때 - 공 도착 때(초)
export function judge(d, P) {
  const a = Math.abs(d);
  if (a <= P.perfect) return "perfect";
  if (a <= P.great) return "great";
  if (a <= P.good) return "good";
  if (a <= P.foul) return "foul";
  return "whiff";
}

// 공 10개 계획(속도·커브). 같은 rnd 면 같은 계획.
export function planPitches(P, rnd) {
  const out = [];
  let lastCurve = -9;
  for (let i = 0; i < PITCHES; i++) {
    const k = i / (PITCHES - 1);
    let flight = P.flight0 + (P.flight1 - P.flight0) * k;
    flight *= 1 + (rnd() - 0.5) * 2 * P.jitter;
    const curve = P.curve > 0 && i >= P.curveFrom && i - lastCurve > 1 && rnd() < P.curve;
    if (curve) lastCurve = i;
    out.push({ flight, curve });
  }
  // 커브가 있는 아이는 적어도 한 번은 커브를 본다(마지막 쪽에)
  if (P.curve > 0 && !out.some(p => p.curve)) out[PITCHES - 2].curve = true;
  for (const p of out) if (p.curve) p.flight *= CURVE.flightMul;
  return out;
}

// 새 판: opts = { level, camera, rnd }
export function createRun(opts = {}) {
  const P = params(opts.level, !!opts.camera);
  const rnd = opts.rnd || Math.random;
  return {
    P, rnd, plan: planPitches(P, rnd),
    t: 0, phase: "ready", phaseT: 0, slow: 0,
    pitch: 0,                 // 지금(또는 다음) 공 번호 0~9
    cur: null,                // { flight, curve, golden, swungAt, swingGT, d, grade, contactAt, auto }
    prevSwing: false,
    hit: null,                // 친 공 { grade, dir, dist, hang, golden, at }
    golden: 0, bonusDone: false,
    score: 0, streak: 0, bestStreak: 0, results: [],
    stats: { swings: 0, hits: 0, homers: 0, perfects: 0, fouls: 0, whiffs: 0, strikes: 0, golden: 0, longest: 0 },
    events: [],
  };
}

function emit(s, type, data) { s.events.push({ type, t: s.t, ...(data || {}) }); }

// 공이 온 비율 0~1(그리기용; 1 = 방망이 자리)
export function ballU(s) {
  if (s.phase !== "pitch" || !s.cur) return s.phase === "result" && s.cur && !s.hit ? 1 + (s.phaseT / 0.5) : 0;
  return s.phaseT / s.cur.flight;
}
// 공 도착까지 남은 초(그리기·자동 휘두르기용)
export function arriveIn(s) { return s.phase === "pitch" && s.cur ? s.cur.flight - s.phaseT : Infinity; }

// 톡(또는 몸으로 휘두른 순간). at = 실제 휘두른 시각 보정(카메라 감지 지연, 초 단위 음수)
export function tap(s, at = 0) {
  if (s.phase !== "pitch" || !s.cur || s.cur.swungAt != null) return false;
  if (s.phaseT < s.cur.flight * EARLY_IGNORE) return false;
  const when = Math.max(0, s.phaseT + at);
  swing(s, when, false);
  return true;
}

function swing(s, when, auto) {
  const c = s.cur, P = s.P;
  c.swungAt = when; c.auto = auto; c.swingGT = s.t - (s.phaseT - when);   // swingGT = 휘두른 게임 시각(그리기용)
  c.d = when + SWING_LEAD - c.flight;
  let g = judge(c.d, P);
  if (c.golden) g = Math.abs(c.d) <= P.perfect * 2 ? "perfect" : "great";   // 황금 방망이: 휘두르면 무조건 홈런
  c.grade = g;
  c.contactAt = when + SWING_LEAD;
  s.stats.swings++;
  emit(s, "swing", { auto, golden: c.golden, grade: g });
}

function pts(s, g, golden) {
  let p = POINTS[g] || 0;
  if (golden && isHit(g)) p += POINTS.golden;
  if (isHomer(g) && s.streak >= 2) p += Math.min(POINTS.streakMax, POINTS.streak * (s.streak - 1));
  return p;
}

function resolve(s) {
  const c = s.cur, P = s.P, g = c.grade;
  if (g === "whiff") { s.stats.whiffs++; s.streak = 0; endPitch(s, "whiff"); return; }
  // 방향: 빠르면 왼쪽(-), 늦으면 오른쪽(+)
  const sgn = c.d < 0 ? -1 : 1;
  let dir = Math.max(-1, Math.min(1, c.d / P.good));
  if (g === "foul") dir = sgn * (1.25 + 0.25 * s.rnd());
  if (g === "perfect") dir *= 0.4;
  const r = s.rnd();
  const dist = Math.round(g === "perfect" ? 125 + 20 * r : g === "great" ? 95 + 22 * (1 - Math.abs(c.d) / P.great) + 6 * r : g === "good" ? 50 + 30 * r : 15 + 15 * r);
  const hang = g === "perfect" ? 2.6 : g === "great" ? 2.2 : g === "good" ? 1.5 : 0.9;
  if (isHomer(g)) s.streak++; else s.streak = 0;
  s.bestStreak = Math.max(s.bestStreak, s.streak);
  const p = pts(s, g, c.golden);
  s.score += p;
  if (isHit(g)) s.stats.hits++;
  if (isHomer(g)) s.stats.homers++;
  if (g === "perfect") { s.stats.perfects++; s.slow = SLOWMO.len; }
  if (g === "foul") s.stats.fouls++;
  if (c.golden && isHit(g)) s.stats.golden++;
  if (isHit(g)) s.stats.longest = Math.max(s.stats.longest, dist);
  s.hit = { grade: g, dir, dist, hang, golden: !!c.golden, at: s.t, points: p };
  emit(s, "hit", { grade: g, dir, dist, points: p, golden: !!c.golden, streak: s.streak, auto: !!c.auto });
  endPitch(s, g, true);
}

function endPitch(s, g, contact = false) {
  s.results.push({ grade: g, points: contact ? s.hit.points : 0, golden: !!s.cur.golden, curve: !!s.cur.curve });
  s.phase = "result"; s.phaseT = 0; s.resultLen = RESULT_LEN[g];
  if (!contact) { s.hit = null; emit(s, g === "strike" ? "strike" : "whiff", { golden: !!s.cur.golden }); }
}

function startPitch(s) {
  const p = s.plan[s.pitch];
  const golden = s.golden > 0;
  s.prevSwing = !!(s.cur && s.cur.swungAt != null);   // 앞 공을 휘둘렀으면 그림이 마무리 자세에서 준비 자세로 돌아온다
  if (golden) s.golden--;
  s.cur = { flight: golden ? Math.max(p.flight, s.P.flight0 * 0.95) : p.flight, curve: golden ? false : p.curve, golden, swungAt: null, d: null, grade: null, contactAt: null, auto: false };
  s.hit = null;
  s.phase = "windup"; s.phaseT = 0;
  emit(s, "windup", { pitch: s.pitch, golden, curve: s.cur.curve });
}

export function step(s, dt) {
  if (s.phase === "done" || s.phase === "break") return s;
  dt = Math.min(0.1, Math.max(0, dt));
  if (s.slow > 0) { s.slow = Math.max(0, s.slow - dt); dt *= SLOWMO.scale; }
  s.t += dt; s.phaseT += dt;
  if (s.phase === "ready") {
    if (s.phaseT >= READY_LEN) { emit(s, "go"); startPitch(s); }
    return s;
  }
  if (s.phase === "windup") {
    if (s.phaseT >= s.P.wind) { s.phase = "pitch"; s.phaseT = 0; emit(s, "release", { curve: s.cur.curve, golden: s.cur.golden, flight: s.cur.flight }); }
    return s;
  }
  if (s.phase === "pitch") {
    const c = s.cur;
    // 황금 방망이: 안 휘둘러도 딱 맞는 때에 저절로
    if (c.golden && c.swungAt == null && s.phaseT >= c.flight - SWING_LEAD) swing(s, c.flight - SWING_LEAD, true);
    if (c.swungAt != null && s.phaseT >= c.contactAt && c.grade !== "whiff") { resolve(s); return s; }
    if (c.swungAt != null && c.grade === "whiff" && s.phaseT >= Math.max(c.contactAt, c.flight + 0.12)) { resolve(s); return s; }
    if (c.swungAt == null && s.phaseT >= c.flight + s.P.foul + 0.05) { s.stats.strikes++; s.streak = 0; endPitch(s, "strike"); }
    return s;
  }
  if (s.phase === "result") {
    if (s.phaseT >= s.resultLen) {
      s.pitch++;
      emit(s, "next", { pitch: s.pitch });
      if (s.pitch >= PITCHES) { s.phase = "done"; s.cur = null; s.hit = null; emit(s, "done", { score: s.score }); }
      else if (s.pitch === BONUS_AFTER && !s.bonusDone) { s.phase = "break"; s.phaseT = 0; s.hit = null; }
      else startPitch(s);
    }
  }
  return s;
}

// 보너스 타임 뒤 다음 공으로. reward = quizReward(firstTry) 또는 null
export function afterBreak(s, reward) {
  if (s.phase !== "break") return s;
  s.bonusDone = true;
  if (reward) { s.golden = reward.golden || 0; if (reward.bonus) s.score += reward.bonus; emit(s, "golden", { n: s.golden }); }
  startPitch(s);
  return s;
}

// 남은 공(그리기용)
export function pitchesLeft(s) { return Math.max(0, PITCHES - s.pitch); }

// 자동 휘두르기 계획(시연·검증·모의 실험): 공이 나오면 목표 d 를 정해 그때 톡
export function autoPlanD(s, good, perfectP, rnd = s.rnd) {
  const P = s.P;
  if (good) {
    if (rnd() < perfectP) return (rnd() * 2 - 1) * P.perfect * 0.9;
    const a = P.perfect + (P.good - P.perfect) * rnd();
    return rnd() < 0.5 ? -a : a;
  }
  const r = rnd();
  if (r < 0.35) { const a = P.good + (P.foul - P.good) * (0.1 + 0.85 * rnd()); return rnd() < 0.5 ? -a : a; }   // 파울
  if (r < 0.75) { const a = P.foul * (1.1 + 0.6 * rnd()); return rnd() < 0.5 ? -a : a; }                       // 헛스윙
  return null;                                                                                                // 안 휘두름
}

// 모의 실험: hit 확률로 "좋은 때" 또는 "나쁜 때"에 톡. 결과 = 끝난 판 상태
export function simulate({ level = 2, hit = 0.85, perfect = 0.35, camera = false, reward = null, seed = 1 } = {}) {
  let x = seed >>> 0 || 1;
  const rnd = () => { x ^= x << 13; x >>>= 0; x ^= x >>> 17; x ^= x << 5; x >>>= 0; return x / 4294967296; };
  const s = createRun({ level, camera, rnd });
  const dt = 1 / 60;
  let plan = undefined;
  for (let i = 0; i < 60 * 300 && s.phase !== "done"; i++) {
    if (s.phase === "break") { afterBreak(s, reward); plan = undefined; continue; }
    if (s.phase === "pitch" && s.cur.swungAt == null) {
      if (plan === undefined) {
        const d = autoPlanD(s, rnd() < hit, perfect, rnd);
        plan = d == null ? null : Math.max(s.cur.flight * EARLY_IGNORE, s.cur.flight + d - SWING_LEAD);
      }
      if (plan != null && s.phaseT >= plan) tap(s, plan - s.phaseT);
    } else if (s.phase !== "pitch") plan = undefined;
    step(s, dt);
    s.events.length = 0;
  }
  return s;
}
