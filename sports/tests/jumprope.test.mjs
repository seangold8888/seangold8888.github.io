// 줄넘기 규칙 검사: node --test sports/tests/*.test.mjs
import test from "node:test";
import assert from "node:assert/strict";
import * as R from "../src/events/jumprope-rules.js";

test("아이별 성공 창: 어린 아이일수록 넓고 줄이 느리다", () => {
  for (let lv = 1; lv < 4; lv++) {
    const a = R.LEVELS[lv - 1], b = R.LEVELS[lv];
    assert.ok(a.hi - a.lo > b.hi - b.lo, `창 너비 ${lv - 1} > ${lv}`);
    assert.ok(a.period0 > b.period0 && a.periodMin > b.periodMin, `줄 속도 ${lv - 1} 가 더 느림`);
    assert.ok(a.perfect >= b.perfect, "퍼펙트 창");
  }
  assert.equal(R.LEVELS[0].dbl, 0, "태오는 2단 뛰기 없음");
  for (const L of R.LEVELS) {
    assert.ok(L.hi <= L.air, "체공 안에서만 성공");
    assert.ok(L.periodMin > L.hi + 0.1, "가장 빠를 때도 한 바퀴 안에 다음 뛰기가 가능");
  }
});

test("judge: 창 안은 성공, 꼭대기 근처는 퍼펙트, 창 밖은 실패", () => {
  for (let lv = 0; lv < 4; lv++) {
    const P = R.params(lv);
    assert.equal(R.judge(P.air / 2, P), "perfect");
    assert.equal(R.judge(P.lo + 0.001, P), "good");
    assert.equal(R.judge(P.hi - 0.001, P), P.hi - 0.001 - P.air / 2 <= P.perfect ? "perfect" : "good");
    assert.equal(R.judge(P.hi + 0.02, P), "miss");
    assert.equal(R.judge(Math.max(0, P.lo - 0.02) - 0.001, P), "miss");
  }
});

test("카메라(진짜로 뛰기) 모드는 더 느리고 창이 넓고 2단 뛰기가 없다", () => {
  for (let lv = 0; lv < 4; lv++) {
    const t = R.params(lv), c = R.params(lv, true);
    assert.ok(c.period0 > t.period0 && c.hi - c.lo > t.hi - t.lo && c.dbl === 0);
  }
});

test("꼬마 기차 들어가기: 줄이 막 발밑을 지난 뒤(올라가는 동안)만", () => {
  const P = R.params(2), per = 1;
  assert.ok(R.entryOk(0.25 * per, per, P));
  assert.ok(!R.entryOk(0.01, per, P));
  assert.ok(!R.entryOk(0.9 * per, per, P));
});

test("2단 뛰기 간격: 잘 뛰었으면 두 번째 줄도 반드시 넘을 수 있다", () => {
  for (let lv = 1; lv < 4; lv++) {
    const P = R.params(lv);
    for (const period of [P.period0, P.periodMin]) {
      const lead = P.air / 2, gap = R.doubleGap(lead, period, P);
      assert.ok(lead + gap <= P.air * 1.75 - P.lo * 0.5, `lv${lv} period ${period}`);
    }
  }
});

test("엔진: 완벽한 자동 뛰기는 실수 없이 세 판을 끝내고 70초 안팎", () => {
  for (let lv = 0; lv < 4; lv++) {
    const s = R.simulate({ level: lv, hit: 1, perfect: 1, dblHit: 1, seed: 11 });
    assert.equal(s.phase, "done");
    assert.equal(s.stats.miss, 0, `lv${lv} 실수 0`);
    assert.ok(s.t > 62 && s.t < 80, `lv${lv} 시간 ${s.t}`);
    assert.deepEqual(s.rounds, ["basic", "fast", "super"]);
    assert.ok(s.score >= R.medalTable(lv, false).gold, "문제 없이도 완벽하면 금");
    if (lv >= 2) assert.ok(s.stats.doubles >= 1, `lv${lv} 2단 뛰기가 나온다`);
  }
});

test("엔진: 판 사이에서 멈추고 보너스 보상(무지개 줄)이 다음 판에 적용", () => {
  const s = R.createRun({ level: 2, rnd: () => 0.99 });
  for (let i = 0; i < 60 * 30 && s.phase !== "break"; i++) R.step(s, 1 / 60);
  assert.equal(s.phase, "break");
  const before = s.score, rw = R.quizReward(true);
  R.nextRound(s, rw);
  assert.equal(s.score, before + rw.bonus, "+100 바로");
  assert.equal(s.mult, 1.5); assert.equal(s.shield, 2); assert.equal(s.rainbow, true);
  // 실수 한 번은 무지개가 지켜 준다(콤보 유지)
  s.combo = 7; s.phase = "play";
  s.theta = Math.PI - 0.001; R.step(s, 1 / 60);           // 안 뛰고 발밑 통과
  assert.equal(s.combo, 7); assert.equal(s.shield, 1); assert.equal(s.stats.saves, 1);
  const retry = R.quizReward(false);
  assert.ok(retry.mult > 1 && retry.shield >= 1 && retry.bonus > 0, "고쳐 맞혀도 손에 잡히는 보상");
  assert.ok(rw.mult > retry.mult && rw.shield > retry.shield, "한 번에 맞히면 더 크게");
});

test("메달 기준: 성공률 85% ≈ 금, 65% ≈ 은, 40% ≈ 동 (보너스 문제 한 번에 맞힌 보통 판)", () => {
  const reward = R.quizReward(true);
  const mean = (lv, hit, pf) => { let t = 0; for (let i = 1; i <= 24; i++) t += R.simulate({ level: lv, hit, perfect: pf, reward, seed: i * 7919 }).score; return t / 24; };
  for (let lv = 0; lv < 4; lv++) {
    const m = R.MEDALS[lv];
    const g = mean(lv, 0.85, 0.4), sv = mean(lv, 0.65, 0.25), bz = mean(lv, 0.4, 0.1);
    assert.ok(g >= m.gold * 0.95 && g <= m.gold * 1.5, `lv${lv} 85%=${Math.round(g)} 금 ${m.gold}`);
    assert.ok(sv >= m.silver * 0.95 && sv < m.gold, `lv${lv} 65%=${Math.round(sv)} 은 ${m.silver}`);
    assert.ok(bz >= m.bronze * 0.9 && bz < m.silver, `lv${lv} 40%=${Math.round(bz)} 동 ${m.bronze}`);
  }
});

test("꼬마 기차 판(선택): 한 번에 들어가고 친구가 올라타며 점수 배수가 붙는다", () => {
  const s = R.simulate({ level: 2, hit: 1, perfect: 1, dblHit: 1, seed: 5, rounds: ["basic", "fast", "train"] });
  assert.equal(s.phase, "done"); assert.equal(s.stats.entries, 1); assert.ok(s.stats.joins >= 3, "joins " + s.stats.joins);
  assert.equal(R.roundDef(s, 2).id, "train");
});

test("판 이름: 기본 세 판 = 줄넘기 · 빨라져요 · 슈퍼 스피드, 슈퍼 스피드는 2단 기회가 더 자주", () => {
  assert.deepEqual(R.ROUNDS.map(r => r.name), ["줄넘기", "빨라져요!", "슈퍼 스피드"]);
  const count = rounds => { let n = 0; for (let i = 1; i <= 12; i++) n += R.simulate({ level: 2, hit: 1, perfect: 1, dblHit: 1, seed: i, rounds }).stats.doubles; return n; };
  assert.ok(count(["basic", "fast", "super"]) > count(["basic", "fast", "basic"]));
});

test("메달 기준: 문제 모듈이 없으면 절반으로", () => {
  for (let lv = 0; lv < 4; lv++) assert.equal(R.medalTable(lv, false).gold, Math.round(R.MEDALS[lv].gold * R.NO_QUIZ_SCALE));
});
