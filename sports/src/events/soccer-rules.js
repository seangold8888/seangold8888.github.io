// 축구(승부차기) 규칙 엔진(DOM 없음). 화면(soccer.js)과 Node 모의 실험(tests/soccer.test.mjs)이 같은 엔진을 쓴다.
//
// 골대 좌표: u = 가로(-1 왼쪽 골대 … +1 오른쪽 골대, 차는 아이가 볼 때), v = 높이(0 땅 … 1 크로스바).
//   |u| > 1 이나 v > 1 이면 골대 밖(재이만 — 태오는 늘 골대 안으로 들어가게 잡아 준다). 골대·크로스바 근처는 "땡!"(POST).
// 한 판 = 5번 차기(+청백전 동점이면 서든 데스). 2번째·4번째 뒤 "보너스 타임"(문제) → 다음 슛이 불꽃 슛 / 느림보 골키퍼.
// 슛 하나: prepareShot(s) → (아이가 조준) → shoot(s, { u, v, power }) → 결과 { result, points, keeper:{…}, T … }.
//   골키퍼는 공을 차는 순간 계획을 세운다(미리 몸 날리기 / 보고 따라가기). 공이 골라인에 닿는 시각 T 의 손 위치로 막았는지 정한다.
//   화면은 그 계획을 그대로 그린다(엔진과 그림이 늘 같은 결과).

export const SHOTS = 5;
export const BONUS_AFTER = Object.freeze([2, 4]);   // 이 슛 수가 끝난 뒤 보너스 타임
export const SUDDEN_MAX = 3;                           // 서든 데스 최대 슛
export const POST = 0.06;                              // 골대·크로스바 두께(골대 좌표)

// 아이별 난이도(level 0 = 태오, 2 = 재이; 1·3 은 나중 칸).
//   react 골키퍼가 공을 보고 움직이기 시작할 때까지(초), speed 몸 날리는 빠르기(골대 너비/초), reach 손이 닿는 반경
//   gap 골키퍼가 한쪽으로 비켜 서는 정도(태오: 빈 쪽이 확 보이게), read 지난번 쪽으로 미리 몸 날릴 확률(재이: 같은 쪽만 차면 막힌다)
//   guess 아무 정보 없이 맞는 쪽으로 미리 날 확률, assist 조준 도움(빈 곳 쪽으로 끌어당김 0~1)
//   slide 미끄럼 과녁 속도(왕복/초), miss 골대 밖으로 나갈 수 있나, flight 공이 골라인까지 가는 기본 초
export const LEVELS = Object.freeze([
  Object.freeze({ kid: "taeo", react: 0.36, speed: 1.0, reach: 0.25, gap: 0.5, read: 0, guess: 0.05, assist: 0.45, slide: 0.3, miss: false, flight: 0.62 }),
  Object.freeze({ kid: "", react: 0.32, speed: 1.15, reach: 0.28, gap: 0.3, read: 0.35, guess: 0.1, assist: 0.25, slide: 0.4, miss: true, flight: 0.56 }),
  Object.freeze({ kid: "jaei", react: 0.28, speed: 1.2, reach: 0.3, gap: 0.12, read: 0.6, guess: 0.15, assist: 0, slide: 0.5, miss: true, flight: 0.52 }),
  Object.freeze({ kid: "", react: 0.25, speed: 1.4, reach: 0.31, gap: 0.06, read: 0.7, guess: 0.2, assist: 0, slide: 0.6, miss: true, flight: 0.5 }),
]);

// 진짜로 차기(카메라): 몸 기울이기 조준은 손가락보다 거칠다 → 골키퍼 조금 느리게, 조준 도움 조금 더
export const CAMERA = Object.freeze({ react: 0.08, speed: 0.85, assist: 0.2 });

export const POINTS = Object.freeze({ goal: 100, corner: 40, top: 30, power: 20, post: 50, streak: 25, sudden: 80, fireMult: 1.5 });

// 메달 기준 점수(level 별). 보너스 문제를 한 번에 맞힌 보통 판 기준. tests/soccer.test.mjs 가 모의 실험과 맞는지 검사한다.
export const MEDALS = Object.freeze([
  Object.freeze({ gold: 1320, silver: 1180, bronze: 980 }),
  Object.freeze({ gold: 1300, silver: 1150, bronze: 950 }),
  Object.freeze({ gold: 1210, silver: 1070, bronze: 880 }),
  Object.freeze({ gold: 1160, silver: 1040, bronze: 870 }),
]);
export const NO_QUIZ_SCALE = 0.6;
export function medalTable(level, quizOn = true) {
  const m = MEDALS[Math.max(0, Math.min(3, level | 0))];
  if (quizOn) return m;
  const k = NO_QUIZ_SCALE;
  return { gold: Math.round(m.gold * k), silver: Math.round(m.silver * k), bronze: Math.round(m.bronze * k) };
}

export function params(level, camera = false) {
  const b = LEVELS[Math.max(0, Math.min(3, level | 0))];
  if (!camera) return { ...b, camera: false };
  return { ...b, camera: true, react: b.react + CAMERA.react, speed: b.speed * CAMERA.speed, assist: Math.min(0.7, b.assist + CAMERA.assist) };
}

const clamp = (x, a, b) => Math.max(a, Math.min(b, x));
const sgn = x => (x < 0 ? -1 : 1);

export function createRun(opts = {}) {
  const P = params(opts.level, !!opts.camera);
  return {
    P, rnd: opts.rnd || Math.random, level: opts.level | 0,
    shot: 0, total: SHOTS, sudden: false, suddenLeft: 0,
    score: 0, goals: 0, streak: 0, bestStreak: 0,
    lastSide: 0,                 // 지난 슛이 간 쪽(-1 왼 / 1 오른 / 0 가운데·처음)
    keeper: null,                // prepareShot 이 정한 이번 골키퍼 자세
    fire: false, slow: false,    // 보너스 문제 보상(다음 한 슛)
    history: [],
    phase: "aim",                // aim | break | done (화면이 슛 사이 연출을 맡는다)
    stats: { shots: 0, goals: 0, saves: 0, miss: 0, posts: 0, corners: 0, fire: 0, sudden: 0 },
  };
}

// 이번 슛의 골키퍼 자세: 태오는 한쪽으로 확 비켜 선다(빈 곳이 보이게), 재이는 가운데서 지난번 쪽으로 살짝 기운다(읽는 척)
export function prepareShot(s) {
  const P = s.P;
  const side = s.rnd() < 0.5 ? -1 : 1;
  const k0 = P.gap > 0.2 ? side * P.gap : (s.rnd() - 0.5) * 2 * P.gap;
  const reads = P.read > 0 && s.lastSide !== 0;
  s.keeper = { k0, lean: reads ? s.lastSide * 0.12 : 0, reads, gapSide: Math.abs(k0) > 0.2 ? -sgn(k0) : 0, slow: s.slow, fire: s.fire };
  return s.keeper;
}

// 조준 도움: 태오는 빈 곳(골키퍼 반대쪽 구석) 쪽으로 끌어당기고 늘 골대 안에 들어오게
export function assistAim(s, u, v) {
  const P = s.P, k = s.keeper || { k0: 0, gapSide: 0 };
  let a = P.assist;
  if (a > 0) {
    const tgtU = k.gapSide ? k.gapSide * 0.62 : (Math.abs(u) < 0.3 ? sgn(u - k.k0) * 0.6 : u);
    // 빈 쪽을 노렸으면 더 세게 도와준다, 골키퍼 쪽이면 살짝만
    const toward = k.gapSide && sgn(u) === k.gapSide ? 1 : 0.3;
    u = u + (tgtU - u) * a * toward;
    v = v + (0.38 - v) * a * 0.5;
  }
  if (!P.miss) { u = clamp(u, -0.86, 0.86); v = clamp(v, 0.06, 0.84); }
  else { u = clamp(u, -1.45, 1.45); v = clamp(v, 0, 1.5); }
  return { u, v };
}

// 미끄럼 과녁(톡으로 차기): 골대 안을 8자로 오간다. t = 초
export function slideAim(s, t) {
  const f = s.P.slide * Math.PI * 2;
  return { u: Math.sin(t * f) * 0.82, v: 0.42 + Math.sin(t * f * 0.5 + 0.7) * 0.3 };
}

// 공이 골라인까지 가는 시간(세게 찰수록 짧다)
export function flightTime(P, power) {
  const p = clamp(power, 0.15, 1.3);
  return clamp(P.flight + 0.42 * (1 - Math.min(1, p)) - 0.08 * Math.max(0, p - 1), 0.36, 1.1);
}

// 골키퍼 계획 → T 시각 손 위치. plan = { target, react, speed } (target = 골대 u)
function keeperAt(k0, plan, t) {
  const move = Math.max(0, t - plan.react) * plan.speed;
  const d = plan.target - k0;
  return k0 + sgn(d) * Math.min(Math.abs(d), move);
}

// 손이 닿는 반경: 높은 공·땅볼 구석은 조금 덜 닿는다
export function reachAt(P, v, slow) {
  const r = P.reach * (v > 0.62 ? 1 - (v - 0.62) * 0.8 : 1) * (slow ? 0.8 : 1);
  return Math.max(0.12, r);
}

// 슛! shot = { u, v, power, camera? } (조준 도움은 부르는 쪽에서 assistAim 으로 먼저). 결과를 s 에 반영하고 돌려준다.
export function shoot(s, shot) {
  if (s.phase !== "aim") return null;
  if (!s.keeper) prepareShot(s);
  const P = s.P, k = s.keeper, rnd = s.rnd;
  let { u, v } = shot;
  const power = clamp(shot.power == null ? 0.85 : shot.power, 0.1, 1.4);
  // 너무 세게(재이만): 공이 뜬다
  if (P.miss && power > 1.12) v += (power - 1.12) * 1.6;
  if (!P.miss) { u = clamp(u, -0.86, 0.86); v = clamp(v, 0.06, 0.84); }
  const fire = !!s.fire, slow = !!s.slow;
  const T = fire ? 0.62 : flightTime(P, power);
  const side = Math.abs(u) < 0.22 ? 0 : sgn(u);
  // 골키퍼 계획
  let plan, kind;
  const react = (P.react + (power < 0.4 ? -0.12 : 0)) * (slow ? 2.2 : 1);
  const speed = P.speed * (slow ? 0.45 : 1) * (power < 0.4 ? 1.5 : 1);
  if (fire) {                                                   // 불꽃 슛: 반대로 날아 버린다(못 막는다)
    plan = { target: -sgn(u || 1) * 0.85, react: 0.05, speed: P.speed * 1.2 }; kind = "fooled";
  } else if (k.reads && rnd() < P.read) {                       // 재이: 지난번 쪽으로 미리
    plan = { target: s.lastSide * 0.72, react: 0.06, speed: speed * 1.1 }; kind = "read";
  } else if (rnd() < P.guess) {                                 // 운 좋게 맞는 쪽으로 미리
    plan = { target: side ? side * 0.7 : 0, react: 0.08, speed }; kind = "guess";
  } else {
    plan = { target: clamp(u, -1, 1), react, speed }; kind = "react";
  }
  const kT = keeperAt(k.k0, plan, T);
  const reach = reachAt(P, v, slow);
  let result;
  const inU = Math.abs(u) <= 1 - POST / 2, inV = v <= 1 - POST / 2;
  const nearPost = Math.abs(Math.abs(u) - 1) < POST && v <= 1 + POST, nearBar = Math.abs(v - 1) < POST && Math.abs(u) <= 1 + POST;
  if (fire) result = "goal";
  else if (nearPost || nearBar) result = rnd() < 0.4 ? "postIn" : "post";
  else if (!inU || !inV) result = "miss";
  else if (Math.abs(kT - u) <= reach || Math.abs(k.k0 - u) < 0.14 && v < 0.75 && kind !== "read") result = "save";
  else result = "goal";
  // 도움 판정: 보고 따라가서 막을 뻔했나(화면 연출용)
  const close = Math.abs(kT - u) - reach;

  // 점수
  let points = 0;
  const corner = Math.abs(u) >= 0.6, top = v >= 0.6;
  const scored = result === "goal" || result === "postIn";
  if (scored) {
    s.streak++; s.bestStreak = Math.max(s.bestStreak, s.streak); s.goals++; s.stats.goals++;
    points = POINTS.goal + (corner ? POINTS.corner : 0) + (corner && top ? POINTS.top : 0) + (power >= 0.9 && power <= 1.12 ? POINTS.power : 0)
      + (result === "postIn" ? POINTS.post : 0) + POINTS.streak * Math.max(0, s.streak - 1);
    if (fire) points = Math.round(points * POINTS.fireMult);
    if (s.sudden) points += POINTS.sudden;
    if (corner) s.stats.corners++;
  } else {
    s.streak = 0;
    if (result === "save") s.stats.saves++; else if (result === "post") s.stats.posts++; else s.stats.miss++;
  }
  if (fire) s.stats.fire++;
  if (s.sudden) s.stats.sudden++;
  s.score += points; s.stats.shots++;
  // 골키퍼가 날아간 쪽(그림): 막았으면 공 쪽, 아니면 계획한 쪽
  const out = {
    result, scored, points, u, v, power, T, side, fire, slow, corner, top, close,
    keeper: { k0: k.k0, target: plan.target, react: plan.react, speed: plan.speed, at: kT, kind, reach },
    streak: s.streak, shot: s.shot, sudden: s.sudden,
  };
  s.history.push(out);
  s.lastSide = side;
  s.fire = false; s.slow = false; s.keeper = null;
  s.shot++;
  if (s.sudden) {
    s.suddenLeft--;
    s.phase = !scored || s.suddenLeft <= 0 ? "done" : "aim";
  } else if (s.shot >= s.total) s.phase = "done";
  else if (BONUS_AFTER.includes(s.shot)) s.phase = "break";
  else s.phase = "aim";
  return out;
}

// 보너스 타임 끝 → 다음 슛. reward = quizReward(firstTry) 또는 null
export function nextShot(s, reward) {
  if (s.phase !== "break") return s;
  if (reward) {
    if (reward.fire) s.fire = true;
    if (reward.slow) s.slow = true;
    if (reward.bonus) s.score += reward.bonus;
  }
  s.phase = "aim";
  return s;
}

// 보너스 문제 보상: 한 번에 = 불꽃 슛(골키퍼가 반대로 날아 꼭 골 + 점수 ×2) +100 / 고쳐서 = 느림보 골키퍼(다음 한 슛) +50
export function quizReward(firstTry) {
  return firstTry ? { fire: true, bonus: 100 } : { slow: true, bonus: 50 };
}

// 청백전 서든 데스: 다섯 번이 끝나고 상대 편과 골 수가 같으면. 골을 넣는 동안 계속(최대 SUDDEN_MAX)
export function startSudden(s) {
  if (s.phase !== "done" || s.sudden) return false;
  s.sudden = true; s.suddenLeft = SUDDEN_MAX; s.total = s.shot + SUDDEN_MAX; s.phase = "aim";
  return true;
}

// 골대 위 결과 이름(화면 글자)
export const RESULT_TEXT = Object.freeze({ goal: "골!", postIn: "골대 맞고 골!", save: "막았다!", post: "땡! 골대", miss: "아깝다!" });

// 모의 실험: hit = "좋은 슛"을 할 확률. 좋은 슛 = 빈 곳·구석을 알맞은 힘으로(재이는 같은 쪽만 차지 않음), 나쁜 슛 = 가운데·약하게·밖으로.
export function simulate({ level = 2, hit = 0.85, reward = null, camera = false, seed = 1, sudden = false } = {}) {
  let x = seed >>> 0 || 1;
  const rnd = () => { x ^= x << 13; x >>>= 0; x ^= x >>> 17; x ^= x << 5; x >>>= 0; return x / 4294967296; };
  const s = createRun({ level, camera, rnd });
  let guard = 0;
  while (s.phase !== "done" && guard++ < 50) {
    if (s.phase === "break") { nextShot(s, reward); continue; }
    const k = prepareShot(s), P = s.P;
    let u, v, power;
    if (rnd() < hit) {
      // 좋은 슛: 태오는 빈 곳 쪽, 재이는 구석(지난번과 다른 쪽을 고를 때가 많다)
      let side = k.gapSide || (rnd() < 0.5 ? -1 : 1);
      if (!k.gapSide && s.lastSide && rnd() < 0.8) side = -s.lastSide;
      u = side * (0.65 + rnd() * 0.3); v = 0.12 + rnd() * 0.7; power = 0.85 + rnd() * 0.25;
    } else {
      const r = rnd();
      if (r < 0.45) { u = (rnd() - 0.5) * 0.5; v = 0.2 + rnd() * 0.5; power = 0.6 + rnd() * 0.4; }          // 가운데
      else if (r < 0.75) { u = (rnd() < 0.5 ? -1 : 1) * (0.3 + rnd() * 0.5); v = 0.1 + rnd() * 0.3; power = 0.2 + rnd() * 0.15; }   // 약하게
      else { const sd = s.lastSide || (rnd() < 0.5 ? -1 : 1); u = sd * (1.02 + rnd() * 0.25); v = 0.3 + rnd() * 0.9; power = 0.9 + rnd() * 0.4; }  // 밖으로(같은 쪽)
    }
    const a = assistAim(s, u, v);
    shoot(s, { u: a.u, v: a.v, power });
    if (s.phase === "done" && sudden && !s.sudden) startSudden(s);
  }
  return s;
}
