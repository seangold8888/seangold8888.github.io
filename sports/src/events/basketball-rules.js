// 농구(슛 대회) 규칙 엔진(DOM 없음). 화면(basketball.js)과 Node 모의 실험(tests/basketball.test.mjs)이 같은 엔진을 쓴다.
// 공 날기·림·백보드는 basketball-physics.js.
//
// 판: 1 골밑 슛(공 4개) → 보너스 문제(자석 골대) → 2 중거리 슛(4개, 더 멀리) → 보너스 문제 → 3 3점 슛 대회(랙 5개 × 3개,
//   랙마다 마지막 공 = 머니볼 ×2, 랙마다 자리가 바뀐다). 한 사람 약 60~75초.
// 손가락: 뒤로 당겼다 놓기(새총). 당긴 방향 = 각도, 당긴 길이 = 힘. 공이 손을 떠나면 다음 공을 바로 잡을 수 있다(던지는 동안 다음 공 조준).
// 점수: 골인 100(3점 대회 150) + 클린 슛 +50 · 뱅크 슛 +30, 3개 연속 골인 뒤로는 "불타는 손" ×1.5, 머니볼 ×2.
import * as Ph from "./basketball-physics.js?v=1";

export const READY_LEN = 1.4;     // "준비… 시작!"
export const MOVE_LEN = 0.8;      // 다음 랙 자리로 걸어가기
export const RELOAD = 0.5;        // 공이 손을 떠난 뒤 다음 공을 잡을 때까지
export const FIRE_AT = 3, FIRE_MULT = 1.5, MONEY_MULT = 2;
export const POINTS = Object.freeze({ basket: 100, three: 150, swish: 50, bank: 30 });
// 손을 떠나는 공 자리(발 기준, 아이 키 배율). 진짜 그림(shoot 아틀라스)의 공 위치에서 잰 값.
export const RELEASE = Object.freeze({ x: 0.2, y: -1.12 });
// 아이별(진짜 그림의 공이 손을 떠나는 프레임에서 잰 값: (공 가운데 − 발) ÷ 키). 그림을 바꾸면 여기도 다시 잰다.
export const RELEASE_BY_KID = Object.freeze({
  jaei: Object.freeze({ x: 0.25, y: -1.22 }),
  taeo: Object.freeze({ x: 0.245, y: -1.27 }),
});
export const KID_H = 340;          // 재이 키(world). 태오는 kids.js scale 0.86

export const ROUND_DEFS = Object.freeze([
  Object.freeze({ id: "close", name: "골밑 슛", line: "뒤로 당겼다 놓아요!", racks: 1, balls: 4, pts: POINTS.basket, money: false }),
  Object.freeze({ id: "mid", name: "중거리 슛", line: "한 걸음 더 멀리!", racks: 1, balls: 4, pts: POINTS.basket, money: false }),
  Object.freeze({ id: "three", name: "3점 슛 대회", line: "랙마다 마지막 공은 머니볼 ×2!", racks: 5, balls: 3, pts: POINTS.three, money: true }),
]);

// 아이별 난이도(level 0 = 태오, 2 = 재이; 1·3 은 나중 선수 칸). 목표: 그 아이가 한 판에 80% 안팎 골인.
//   scale 아이 키 배율 / rimY 림 높이 / dist 판별 자리(림까지 가로 거리, 3점 대회는 랙마다)
//   tolP·tolA 보조 너그러움(힘 비율·각도 도) / guide 안내 점선 길이(림까지 비행의 비율) / hint 들어갈 길이면 점선이 금빛
//   clock 판마다 제한 시간(초, null = 없음: 가벼운 시간 압박은 재이부터) / aim 모의 실험에서 한 번 조준하는 데 걸리는 초
export const LEVELS = Object.freeze([
  Object.freeze({ kid: "taeo", scale: 0.86, rimY: -480, dist: [[290], [390], [440, 465, 490, 465, 440]], tolP: 0.2, tolA: 12, guide: 1, hint: true, clock: null, aim: 2.0 }),
  Object.freeze({ kid: "", scale: 0.93, rimY: -520, dist: [[330], [450], [520, 550, 580, 550, 520]], tolP: 0.11, tolA: 7, guide: 0.6, hint: true, clock: null, aim: 1.8 }),
  Object.freeze({ kid: "jaei", scale: 1, rimY: -560, dist: [[370], [520], [610, 640, 680, 640, 610]], tolP: 0.045, tolA: 3.5, guide: 0.3, hint: false, clock: [11, 11, 36], aim: 1.5 }),
  Object.freeze({ kid: "", scale: 1.03, rimY: -580, dist: [[410], [570], [690, 720, 760, 720, 690]], tolP: 0.03, tolA: 2.5, guide: 0.22, hint: false, clock: [10, 10, 32], aim: 1.35 }),
]);
// 몸으로 던지기(카메라): 각도는 기준 각도로, 힘은 팔 속도로. 더 너그럽게.
export const CAMERA = Object.freeze({ tolMul: 1.8, minTolP: 0.16, minTolA: 10 });

// 메달 기준 점수(level 별). 보너스 문제(한 번에 맞힘 보상)를 받는 보통 판 기준.
// tests/basketball.test.mjs 가 모의 실험(골인 85% → 금 근처, 65% → 은, 40% → 동)과 맞는지 검사한다.
export const MEDALS = Object.freeze([
  Object.freeze({ gold: 6000, silver: 5000, bronze: 3900 }),
  Object.freeze({ gold: 6000, silver: 5000, bronze: 3900 }),
  Object.freeze({ gold: 6000, silver: 5000, bronze: 3900 }),
  Object.freeze({ gold: 6000, silver: 5000, bronze: 3900 }),
]);
// 문제 모듈이 없을 때(검증 브라우저 등): 자석 골대가 없으니 기준표를 따로(같은 모의 실험으로 맞춘 값)
export const MEDALS_NO_QUIZ = Object.freeze([
  Object.freeze({ gold: 4900, silver: 3300, bronze: 1800 }),
  Object.freeze({ gold: 4900, silver: 3300, bronze: 1800 }),
  Object.freeze({ gold: 4900, silver: 3300, bronze: 1800 }),
  Object.freeze({ gold: 4900, silver: 3300, bronze: 1800 }),
]);
export function medalTable(level, quizOn = true) {
  const i = Math.max(0, Math.min(3, level | 0));
  return quizOn ? MEDALS[i] : MEDALS_NO_QUIZ[i];
}

// 보너스 문제 보상: 자석 골대(다음 공 몇 개가 저절로 휘어 들어간다) + 바로 점수
export function quizReward(firstTry) { return firstTry ? { bonus: 100, magnet: 5 } : { bonus: 50, magnet: 2 }; }

export function params(level, camera = false) {
  const b = LEVELS[Math.max(0, Math.min(3, level | 0))];
  if (!camera) return { ...b, camera: false };
  return { ...b, camera: true, tolP: Math.max(CAMERA.minTolP, b.tolP * CAMERA.tolMul), tolA: Math.max(CAMERA.minTolA, b.tolA * CAMERA.tolMul), guide: 1, hint: true, clock: null };
}

export function roundDef(s, i = s.round) { return ROUND_DEFS[Math.max(0, Math.min(ROUND_DEFS.length - 1, i))]; }

// 지금 서는 자리(림 가운데 = x 0): 발 x, 공이 손을 떠나는 점, 기준 각도·속도
export function makeSpot(P, scale, rIdx, rack, rel = RELEASE) {
  const dists = P.dist[rIdx], dist = dists[Math.min(rack, dists.length - 1)];
  const H = KID_H * scale, geo = Ph.geometry(P.rimY);
  const from = { x: -dist + rel.x * H, y: rel.y * H };
  const refDeg = Ph.refAngle(geo, from);
  return { dist, x: -dist, H, geo, from, refDeg, refSpeed: Ph.speedThrough(geo, from, refDeg) };
}

// 새 판: opts = { level, camera, rnd, scale, kid }
export function createRun(opts = {}) {
  const P = params(opts.level, !!opts.camera);
  const scale = opts.scale || P.scale, rel = RELEASE_BY_KID[opts.kid] || RELEASE;
  const s = {
    P, scale, rel, rnd: opts.rnd || Math.random,
    t: 0, round: 0, rack: 0, phase: "ready", phaseT: 0,
    ballsLeft: ROUND_DEFS[0].balls, ballIdx: 0, reload: 0, clock: P.clock ? P.clock[0] : null,
    spot: null, inFlight: [], nextId: 1,
    score: 0, roundScore: ROUND_DEFS.map(() => 0), streak: 0, bestStreak: 0, magnet: 0,
    stats: { shots: 0, made: 0, swish: 0, bank: 0, rim: 0, miss: 0, money: 0, moneyMade: 0, fire: 0, magnet: 0, assisted: 0, timeup: 0 },
    events: [],
  };
  s.spot = makeSpot(P, scale, 0, 0, rel);
  return s;
}

function emit(s, type, data) { s.events.push({ type, t: s.t, ...(data || {}) }); }
export const onFire = s => s.streak >= FIRE_AT;
// 이번 랙에서 지금 잡을 공이 머니볼인가(3점 대회 랙의 마지막 공)
export function isMoney(s) { return !!roundDef(s).money && s.ballsLeft === 1; }
export function canShoot(s) { return s.phase === "aim" && s.reload <= 0 && s.ballsLeft > 0; }
export function timeLeft(s) { return s.clock == null ? null : Math.max(0, s.clock) / s.P.clock[s.round]; }

// 던지기. aim = { deg, speed } (손가락이 정한 각도·속도) 또는 null(모의 실험: 물리 없이).
// 자석 골대가 남아 있으면 그 공은 반드시 들어간다(화면은 Ph.magnetize 로 휘어 날린다).
export function shoot(s, aim) {
  if (!canShoot(s)) return null;
  const money = isMoney(s), magnet = s.magnet > 0;
  if (magnet) { s.magnet--; s.stats.magnet++; }
  let deg = aim ? aim.deg : 0, speed = aim ? aim.speed : 0, assisted = false, predicted = null;
  if (aim && !magnet) {
    const a = Ph.assist(s.spot.geo, s.spot.from, deg, speed, s.P.tolP, s.P.tolA);
    deg = a.deg; speed = a.speed; assisted = a.assisted; predicted = a.result;
    if (assisted) s.stats.assisted++;
  }
  const shot = { id: s.nextId++, money, magnet, fire: onFire(s), deg, speed, assisted, predicted, from: { ...s.spot.from }, round: s.round, rack: s.rack };
  s.ballsLeft--; s.ballIdx++; s.reload = RELOAD; s.stats.shots++; if (money) s.stats.money++;
  s.inFlight.push(shot.id);
  emit(s, "shot", { shot });
  return shot;
}

// 공 결과. result = "swish" | "bank" | "rim"(골인) 또는 "air" | "rimout" | "boardout"(놓침)
export function resolve(s, shot, result) {
  const i = s.inFlight.indexOf(shot.id);
  if (i < 0) return 0;
  s.inFlight.splice(i, 1);
  const made = result === "swish" || result === "bank" || result === "rim";
  const def = ROUND_DEFS[shot.round];
  if (!made) {
    const wasFire = onFire(s);
    s.streak = 0; s.stats.miss++;
    emit(s, "miss", { shot, kind: result });
    if (wasFire) emit(s, "fireout");
    return 0;
  }
  const fire = onFire(s);
  const bonus = result === "swish" ? POINTS.swish : result === "bank" ? POINTS.bank : 0;
  const mult = (shot.money ? MONEY_MULT : 1) * (fire ? FIRE_MULT : 1);
  const pts = Math.round((def.pts + bonus) * mult);
  s.score += pts; s.roundScore[shot.round] += pts;
  s.streak++; s.bestStreak = Math.max(s.bestStreak, s.streak);
  s.stats.made++; s.stats[result]++; if (shot.money) s.stats.moneyMade++; if (fire) s.stats.fire++;
  emit(s, "made", { shot, kind: result, pts, fire, money: shot.money, streak: s.streak });
  if (s.streak === FIRE_AT) emit(s, "fire");
  return pts;
}

export function step(s, dt) {
  s.t += dt; s.phaseT += dt;
  if (s.phase === "ready") {
    if (s.phaseT >= READY_LEN) { s.phase = "aim"; s.phaseT = 0; emit(s, "go", { round: s.round }); }
    return;
  }
  if (s.phase === "move") {
    if (s.phaseT >= MOVE_LEN) { s.phase = "aim"; s.phaseT = 0; emit(s, "rack", { rack: s.rack }); }
    return;
  }
  if (s.phase !== "aim") return;
  s.reload = Math.max(0, s.reload - dt);
  if (s.clock != null && s.ballsLeft > 0) {
    s.clock -= dt;
    if (s.clock <= 0) { s.clock = 0; s.stats.timeup += s.ballsLeft; s.ballsLeft = 0; emit(s, "timeup"); }
  }
  if (s.ballsLeft > 0 || s.inFlight.length) return;
  const def = roundDef(s);
  if (s.rack + 1 < def.racks && !(s.clock != null && s.clock <= 0)) {
    s.rack++; s.ballsLeft = def.balls; s.phase = "move"; s.phaseT = 0;
    s.spot = makeSpot(s.P, s.scale, s.round, s.rack, s.rel);
    emit(s, "move", { rack: s.rack, dist: s.spot.dist });
    return;
  }
  s.phase = s.round + 1 < ROUND_DEFS.length ? "break" : "done"; s.phaseT = 0;
  emit(s, s.phase === "done" ? "done" : "roundEnd", { round: s.round, score: s.roundScore[s.round] });
}

// 판 사이(보너스 문제 뒤) 다음 판으로. reward = quizReward(...) 또는 null
export function nextRound(s, reward) {
  if (s.phase !== "break") return;
  if (reward) { s.score += reward.bonus; s.magnet += reward.magnet; }
  s.round++; s.rack = 0; s.ballsLeft = ROUND_DEFS[s.round].balls; s.ballIdx = 0;
  s.clock = s.P.clock ? s.P.clock[s.round] : null;
  s.spot = makeSpot(s.P, s.scale, s.round, 0, s.rel);
  s.phase = "ready"; s.phaseT = 0; s.reload = 0;
  emit(s, "round", { round: s.round, reward });
}

// 모의 실험(메달 기준·시간): hit = 골인 확률, reward = 보너스 문제 보상(판 사이마다), flight = 공 나는 시간
export function simulate({ level = 0, hit = 0.8, reward = null, seed = 1, flight = 1.0, camera = false } = {}) {
  let x = seed >>> 0 || 1; const rnd = () => ((x = (x * 16807) % 2147483647) / 2147483647);
  const s = createRun({ level, camera, rnd });
  const dt = 1 / 30, pending = [];
  let wait = s.P.aim * (0.7 + rnd() * 0.6);
  for (let i = 0; i < 30 * 400 && s.phase !== "done"; i++) {
    step(s, dt);
    for (let j = pending.length - 1; j >= 0; j--) if (s.t >= pending[j].at) { resolve(s, pending[j].shot, pending[j].result); pending.splice(j, 1); }
    if (s.phase === "break") { nextRound(s, reward); continue; }
    if (s.phase === "aim" && s.reload <= 0 && s.ballsLeft > 0) {
      wait -= dt;
      if (wait <= 0) {
        const shot = shoot(s, null);
        let result;
        if (shot.magnet || rnd() < hit) { const k = rnd(); result = shot.magnet ? "swish" : k < 0.4 ? "swish" : k < 0.82 ? "rim" : "bank"; }
        else result = rnd() < 0.6 ? "rimout" : "air";
        pending.push({ at: s.t + flight, shot, result });
        wait = s.P.aim * (0.7 + rnd() * 0.6);
      }
    }
    s.events.length = 0;
  }
  return s;
}
