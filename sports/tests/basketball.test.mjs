// 농구 슛 대회 검사(공 물리·보조·자석 골대·점수·메달): node --test sports/tests/*.test.mjs
import test from "node:test";
import assert from "node:assert/strict";
import * as Ph from "../src/events/basketball-physics.js";
import * as R from "../src/events/basketball-rules.js";
import { checkEvent } from "../src/events/index.js";
import basketball from "../src/events/basketball.js";

const MADE = new Set(["swish", "bank", "rim"]);
const spots = lv => { const P = R.params(lv), out = []; for (let r = 0; r < 3; r++) for (let k = 0; k < P.dist[r].length; k++) out.push(R.makeSpot(P, P.scale, r, k, R.RELEASE_BY_KID[P.kid] || R.RELEASE)); return out; };
// 결정적 난수 + 정규분포 근사(아이 손가락의 흔들림)
function rng(seed) { let x = seed; const r = () => ((x = (x * 16807) % 2147483647) / 2147483647); r.gauss = () => { let u = 0; for (let i = 0; i < 6; i++) u += r(); return (u - 3) / Math.sqrt(0.5); }; return r; }
function makeRate(lv, sigP, sigA, seed = 7, n = 40) {
  const P = R.params(lv), r = rng(seed); let made = 0, all = 0;
  for (const sp of spots(lv)) for (let i = 0; i < n; i++) {
    const a = Ph.assist(sp.geo, sp.from, sp.refDeg + r.gauss() * sigA, sp.refSpeed * (1 + r.gauss() * sigP), P.tolP, P.tolA);
    all++; if (MADE.has(a.result)) made++;
  }
  return made / all;
}

test("종목 약속: id·이름·메달 순서·카메라 몸짓(throw)", () => {
  assert.deepEqual(checkEvent(basketball, "basketball"), []);
  assert.equal(basketball.cameraMode, true);
  assert.deepEqual(basketball.gestures, ["throw"]);
});

test("물리: 모든 자리에서 기준 각도·속도로 던지면 클린 슛, 너무 약하면 안 들어간다", () => {
  for (let lv = 0; lv < 4; lv++) for (const sp of spots(lv)) {
    const v = Ph.velocity(sp.refDeg, sp.refSpeed);
    assert.equal(Ph.predict(sp.geo, sp.from, v).result, "swish", `lv${lv} d${sp.dist}`);
    assert.ok(!Ph.predict(sp.geo, sp.from, Ph.velocity(sp.refDeg, sp.refSpeed * 0.8)).made, "80% 힘은 짧다");
    assert.ok(sp.refDeg >= 50 && sp.refDeg <= 72);
  }
});

test("물리: 림 맞고 쏙·뱅크 슛·림 맞고 튕겨 나감이 모두 일어난다", () => {
  const sp = spots(2)[4], seen = new Set();
  for (let k = 0.85; k <= 1.2; k += 0.005) seen.add(Ph.predict(sp.geo, sp.from, Ph.velocity(sp.refDeg, sp.refSpeed * k)).result);
  for (const r of ["swish", "rim", "bank", "rimout"]) assert.ok(seen.has(r), `${r} in ${[...seen]}`);
});

test("물리: 고정 걸음이라 미리 계산(predict)과 실제 비행(stepBall, 들쭉날쭉한 프레임)이 같다", () => {
  const sp = spots(2)[2], r = rng(3);
  for (let i = 0; i < 30; i++) {
    const v = Ph.velocity(sp.refDeg + (r() - 0.5) * 10, sp.refSpeed * (0.9 + r() * 0.25));
    const want = Ph.predict(sp.geo, sp.from, v).result, b = Ph.createBall(sp.from, v);
    while (!b.result) Ph.stepBall(b, sp.geo, 1 / 75 + r() * 0.03);
    assert.equal(b.result, want);
  }
});

test("보조: 태오는 크게 빗나가도 들어가게 고쳐 주고, 재이는 조금만", () => {
  const t = spots(0)[1], j = spots(2)[1], T = R.params(0), J = R.params(2);
  const short = (sp, P, k) => Ph.assist(sp.geo, sp.from, sp.refDeg, sp.refSpeed * k, P.tolP, P.tolA);
  assert.ok(MADE.has(short(t, T, 0.86).result) && short(t, T, 0.86).assisted, "태오 14% 짧아도 쏙");
  assert.ok(!MADE.has(short(j, J, 0.86).result), "재이 14% 짧으면 안 들어감");
  assert.ok(MADE.has(short(j, J, 0.965).result), "재이 3.5% 짧은 건 들어감");
  assert.ok(T.tolP > J.tolP && T.tolA > J.tolA && T.guide > J.guide && T.hint && !J.hint);
  assert.equal(T.clock, null, "태오는 시간 압박 없음");
  assert.ok(Array.isArray(J.clock), "재이는 가벼운 제한 시간");
});

test("아이별 골인율: 손가락이 흔들려도 80% 안팎(태오 ±20%·±10°, 재이 ±8%·±4°)", () => {
  const taeo = makeRate(0, 0.2, 10), jaei = makeRate(2, 0.08, 4);
  assert.ok(taeo >= 0.74 && taeo <= 0.95, `태오 ${taeo}`);
  assert.ok(jaei >= 0.7 && jaei <= 0.92, `재이 ${jaei}`);
  assert.ok(makeRate(2, 0.2, 10) < taeo - 0.15, "태오만큼 흔들리면 재이 칸은 확실히 더 어렵다");
});

test("자리는 판마다 멀어지고(3점 대회는 랙마다), 태오 골대가 더 가깝고 낮다", () => {
  for (let lv = 0; lv < 4; lv++) {
    const P = R.params(lv);
    assert.ok(P.dist[0][0] < P.dist[1][0] && P.dist[1][0] < Math.min(...P.dist[2]));
    assert.equal(P.dist[2].length, 5);
  }
  assert.ok(R.params(0).dist[2][0] < R.params(2).dist[2][0] && R.params(0).rimY > R.params(2).rimY);
});

test("자석 골대: 아무렇게나 던져도 휘어서 클린 슛", () => {
  const r = rng(11);
  for (const lv of [0, 2]) for (const sp of spots(lv)) for (let i = 0; i < 6; i++) {
    const b = Ph.createBall(sp.from, Ph.velocity(25 + r() * 60, sp.refSpeed * (0.6 + r() * 0.8)));
    Ph.magnetize(b, sp.geo);
    while (!b.result) Ph.stepBall(b, sp.geo, 1 / 60);
    assert.equal(b.result, "swish", `lv${lv} d${sp.dist}`);
  }
});

test("점수: 클린 +50·뱅크 +30·3점 대회 150·머니볼 ×2·불타는 손 ×1.5(3개 연속 뒤)", () => {
  const s = R.createRun({ level: 2, rnd: () => 0.5 });
  while (s.phase !== "aim") R.step(s, 0.1);
  const shot = () => { s.reload = 0; return R.shoot(s, null); };
  assert.equal(R.resolve(s, shot(), "swish"), 150);
  assert.equal(R.resolve(s, shot(), "bank"), 130);
  assert.equal(R.resolve(s, shot(), "rim"), 100);
  assert.ok(R.onFire(s), "3개 연속 = 불타는 손");
  assert.equal(R.resolve(s, shot(), "rim"), 150, "불타는 손 ×1.5");
  // 판 끝 → 보너스 → 3점 대회
  for (let i = 0; i < 30 && s.phase !== "break"; i++) R.step(s, 0.1);
  assert.equal(s.phase, "break");
  R.nextRound(s, null);
  for (let i = 0; i < 400 && s.phase !== "break"; i++) { R.step(s, 0.1); if (R.canShoot(s)) R.resolve(s, R.shoot(s, null), "air"); }
  R.nextRound(s, null);
  while (s.phase !== "aim") R.step(s, 0.1);
  assert.equal(R.roundDef(s).id, "three");
  const a = shot(); assert.ok(!a.money); R.resolve(s, a, "rim");
  const b = shot(); assert.ok(!b.money); R.resolve(s, b, "rim");
  assert.ok(R.isMoney(s), "랙 마지막 공 = 머니볼");
  const c = shot(); assert.ok(c.money);
  assert.equal(R.resolve(s, c, "swish"), (150 + 50) * 2);
  // 다음 랙으로 걸어간다(자리가 바뀐다)
  const d0 = s.spot.dist;
  for (let i = 0; i < 20 && s.phase !== "aim"; i++) R.step(s, 0.1);
  for (let i = 0; i < 20 && s.phase !== "move" && s.rack === 0; i++) R.step(s, 0.1);
  assert.equal(s.rack, 1); assert.notEqual(s.spot.dist, d0);
});

test("보너스 문제 보상(자석 골대): 한 번에 = 다음 5개, 고쳐서 = 2개, 점수도 바로", () => {
  const first = R.quizReward(true), retry = R.quizReward(false);
  assert.equal(first.magnet, 5); assert.equal(retry.magnet, 2);
  assert.ok(first.bonus > retry.bonus && retry.bonus > 0);
  const s = R.createRun({ level: 0 });
  s.phase = "break"; const before = s.score;
  R.nextRound(s, first);
  assert.equal(s.score, before + first.bonus); assert.equal(s.magnet, 5);
  while (s.phase !== "aim") R.step(s, 0.1);
  const sp = s.spot, shot = R.shoot(s, { deg: 30, speed: sp.refSpeed * 0.5 });   // 엉뚱하게 던져도
  assert.ok(shot.magnet); assert.equal(s.magnet, 4); assert.equal(shot.assisted, false);
});

test("재이 제한 시간: 시간이 끝나면 남은 공은 못 던지고 다음 판으로", () => {
  const s = R.createRun({ level: 2 });
  for (let i = 0; i < 400 && s.phase !== "break"; i++) R.step(s, 0.1);
  assert.equal(s.phase, "break"); assert.equal(s.stats.timeup, R.ROUND_DEFS[0].balls);
  const t = R.createRun({ level: 0 });
  for (let i = 0; i < 400; i++) R.step(t, 0.1);
  assert.equal(t.phase, "aim", "태오는 기다려 준다");
});

test("한 판 시간: 60~75초 안팎(보너스 문제 시간 빼고)", () => {
  for (let lv = 0; lv < 4; lv++) {
    const s = R.simulate({ level: lv, hit: 0.8, reward: R.quizReward(true), seed: 5 });
    assert.equal(s.phase, "done");
    assert.equal(s.stats.shots, 4 + 4 + 15, `lv${lv} 공 23개 다 던짐`);
    assert.ok(s.t > 50 && s.t < 78, `lv${lv} ${s.t}`);
  }
});

test("메달 기준: 골인 85% ≈ 금, 65% ≈ 은, 40% ≈ 동 (보너스 문제 한 번에 맞힌 보통 판)", () => {
  const reward = R.quizReward(true);
  const mean = (lv, hit, rw) => { let t = 0; for (let i = 1; i <= 24; i++) t += R.simulate({ level: lv, hit, reward: rw, seed: i * 7919 }).score; return t / 24; };
  for (let lv = 0; lv < 4; lv++) for (const quizOn of [true, false]) {
    const m = R.medalTable(lv, quizOn), rw = quizOn ? reward : null;
    const g = mean(lv, 0.85, rw), sv = mean(lv, 0.65, rw), bz = mean(lv, 0.4, rw);
    const tag = `lv${lv} quiz=${quizOn}`;
    assert.ok(g >= m.gold * 0.95 && g <= m.gold * 1.5, `${tag} 85%=${Math.round(g)} 금 ${m.gold}`);
    assert.ok(sv >= m.silver * 0.95 && sv < m.gold, `${tag} 65%=${Math.round(sv)} 은 ${m.silver}`);
    assert.ok(bz >= m.bronze * 0.9 && bz < m.silver, `${tag} 40%=${Math.round(bz)} 동 ${m.bronze}`);
  }
  assert.ok(R.simulate({ level: 2, hit: 0, reward: null, seed: 1 }).score < R.medalTable(2, false).bronze, "다 놓치면 메달 없음");
});
