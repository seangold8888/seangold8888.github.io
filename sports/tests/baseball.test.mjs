// 야구(홈런 더비) 규칙 검사: node --test sports/tests/*.test.mjs
import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync, existsSync } from "node:fs";
import { fileURLToPath } from "node:url";
import * as R from "../src/events/baseball-rules.js";
import baseball from "../src/events/baseball.js";
import { checkEvent } from "../src/events/index.js";

const here = p => fileURLToPath(new URL(p, import.meta.url));
const run = (lv, o = {}) => R.createRun({ level: lv, rnd: () => 0.5, ...o });
// 공이 나올 때까지(또는 원하는 단계까지) 돌리기
function until(s, pred, max = 60 * 40) { for (let i = 0; i < max && !pred(s); i++) { R.step(s, 1 / 60); s.events.length = 0; } return s; }

test("종목 약속을 지킨다(몸으로 휘두르기 = swing)", () => {
  assert.deepEqual(checkEvent(baseball, "baseball"), []);
  assert.equal(baseball.cameraMode, true); assert.deepEqual(baseball.gestures, ["swing"]);
});

test("아이별 난이도: 어린 아이일수록 공이 느리고 창이 넓다, 태오는 커브 없음·고리 늘", () => {
  for (let lv = 1; lv < 4; lv++) {
    const a = R.LEVELS[lv - 1], b = R.LEVELS[lv];
    assert.ok(a.flight0 > b.flight0 && a.flight1 > b.flight1, `공 속도 ${lv - 1} 가 더 느림`);
    for (const k of ["perfect", "great", "good", "foul"]) assert.ok(a[k] > b[k], `${k} 창 ${lv - 1} > ${lv}`);
    assert.ok(a.wind >= b.wind);
  }
  for (const L of R.LEVELS) assert.ok(L.perfect < L.great && L.great < L.good && L.good < L.foul);
  const T = R.LEVELS[0], J = R.LEVELS[2];
  assert.equal(T.kid, "taeo"); assert.equal(J.kid, "jaei");
  assert.equal(T.curve, 0); assert.equal(T.ring, true); assert.equal(J.ring, false);
  assert.ok(T.good >= 0.22, "태오 맞힘 창 ±0.22초 이상");
  // 태오의 공은 끝까지 곧고 느리다, 재이는 뒤쪽에 느린 커브가 꼭 한 번은 나온다
  for (let seed = 1; seed < 20; seed++) {
    let x = seed; const rnd = () => ((x = (x * 16807) % 2147483647) / 2147483647);
    const tp = R.planPitches(R.params(0), rnd), jp = R.planPitches(R.params(2), rnd);
    assert.ok(tp.every(p => !p.curve && p.flight >= 1.4), "태오 곧은 느린 공");
    assert.ok(jp.some(p => p.curve), "재이 커브");
    assert.ok(jp.every((p, i) => !p.curve || i >= R.LEVELS[2].curveFrom), "커브는 뒤쪽에만");
    assert.ok(jp.filter(p => !p.curve).every(p => p.flight < tp[0].flight), "재이 곧은 공이 더 빠르다");
  }
});

test("판정: 0 근처 장외 홈런, 멀어질수록 홈런·안타·파울·헛스윙", () => {
  for (let lv = 0; lv < 4; lv++) {
    const P = R.params(lv);
    assert.equal(R.judge(0, P), "perfect");
    assert.equal(R.judge(-(P.perfect + P.great) / 2, P), "great");
    assert.equal(R.judge((P.great + P.good) / 2, P), "good");
    assert.equal(R.judge(-(P.good + P.foul) / 2, P), "foul");
    assert.equal(R.judge(P.foul + 0.02, P), "whiff");
  }
});

test("타이밍 → 방향·점수: 딱 맞게 톡 = 장외 홈런 + 느린 화면, 빠르면 왼쪽, 늦으면 오른쪽", () => {
  const hitWith = (lv, d) => {
    const s = until(run(lv), x => x.phase === "pitch");
    const at = s.cur.flight + d - R.SWING_LEAD;
    until(s, x => x.phaseT >= at);
    assert.ok(R.tap(s, at - s.phaseT));
    until(s, x => x.phase === "result");
    return s;
  };
  for (const lv of [0, 2]) {
    const P = R.params(lv);
    const p = hitWith(lv, 0);
    assert.equal(p.hit.grade, "perfect"); assert.equal(p.score, R.POINTS.perfect); assert.ok(p.hit.dist >= 120);
    assert.ok(p.slow > 0 || p.stats.perfects === 1, "느린 화면");
    const early = hitWith(lv, -(P.perfect + P.great) / 2), late = hitWith(lv, (P.great + P.good) / 2);
    assert.equal(early.hit.grade, "great"); assert.ok(early.hit.dir < 0, "빠르면 왼쪽");
    assert.equal(late.hit.grade, "good"); assert.ok(late.hit.dir > 0, "늦으면 오른쪽");
    const foul = hitWith(lv, (P.good + P.foul) / 2);
    assert.equal(foul.hit.grade, "foul"); assert.ok(Math.abs(foul.hit.dir) > 1, "파울은 선 밖");
    const whiff = hitWith(lv, -P.foul - 0.05);
    assert.equal(whiff.hit, null); assert.equal(whiff.stats.whiffs, 1); assert.equal(whiff.score, 0);
  }
});

test("안 휘두르면 스트라이크, 던지자마자 누른 톡은 무시, 한 공에 한 번만 휘두른다", () => {
  const s = until(run(2), x => x.phase === "pitch");
  assert.equal(R.tap(s), false, "막 던진 공(30% 전) 톡은 무시");
  until(s, x => x.phase !== "pitch");
  assert.equal(s.stats.strikes, 1); assert.equal(s.stats.swings, 0);
  const s2 = until(run(2), x => x.phase === "pitch" && x.phaseT > x.cur.flight * 0.5);
  assert.ok(R.tap(s2)); assert.equal(R.tap(s2), false);
  assert.equal(R.tap(run(2)), false, "준비 중엔 휘두르지 않음");
});

test("한 판 = 공 10개, 5번째 공 뒤 보너스 타임에서 멈춘다(휘두르는 중엔 절대 안 멈춤)", () => {
  const s = run(0);
  let maxPitch = 0;
  for (let i = 0; i < 60 * 200 && s.phase !== "break"; i++) { R.step(s, 1 / 60); s.events.length = 0; maxPitch = Math.max(maxPitch, s.pitch); }
  assert.equal(s.phase, "break"); assert.equal(s.pitch, R.BONUS_AFTER); assert.equal(s.results.length, R.BONUS_AFTER);
  R.afterBreak(s, null);
  assert.equal(s.phase, "windup");
  for (let i = 0; i < 60 * 200 && s.phase !== "done"; i++) { assert.notEqual(s.phase, "break"); R.step(s, 1 / 60); s.events.length = 0; }
  assert.equal(s.phase, "done"); assert.equal(s.results.length, R.PITCHES);
});

test("황금 방망이(문제 보상): 다음 공 3개(고쳐 맞히면 1개) 휘두르기만 하면 무조건 홈런, 안 휘둘러도 저절로", () => {
  const rw = R.quizReward(true), rw2 = R.quizReward(false);
  assert.equal(rw.golden, 3); assert.equal(rw2.golden, 1); assert.ok(rw.bonus > rw2.bonus && rw2.bonus > 0);
  const s = run(2);
  until(s, x => x.phase === "break", 60 * 200);
  const before = s.score;
  R.afterBreak(s, rw);
  assert.equal(s.score, before + rw.bonus, "점수 바로");
  assert.equal(s.cur.golden, true); assert.equal(s.golden, 2);
  // 1) 아주 이르게(헛스윙 자리) 휘둘러도 홈런
  until(s, x => x.phase === "pitch" && x.phaseT >= x.cur.flight * 0.35);
  assert.ok(R.tap(s));
  until(s, x => x.phase === "result");
  assert.ok(R.isHomer(s.hit.grade), "이르게 휘둘러도 홈런: " + s.hit.grade); assert.equal(s.hit.golden, true);
  // 2) 아예 안 휘둘러도 방망이가 저절로 → 홈런(딱 맞는 때라 장외)
  until(s, x => x.phase === "pitch");
  until(s, x => x.phase === "result");
  assert.equal(s.hit.grade, "perfect");
  // 3) 세 번째도 황금, 네 번째는 보통 공
  until(s, x => x.phase === "pitch"); assert.equal(s.cur.golden, true);
  until(s, x => x.phase === "result");
  until(s, x => x.phase === "pitch"); assert.equal(s.cur.golden, false);
  assert.equal(s.stats.golden, 3);
  // 고쳐 맞힘 = 1개
  const t = run(0); until(t, x => x.phase === "break", 60 * 200); R.afterBreak(t, rw2);
  assert.equal(t.cur.golden, true); assert.equal(t.golden, 0);
});

test("엔진: 완벽하게 치면 홈런 10개, 한 판 60~90초(문제 시간 빼고)", () => {
  for (let lv = 0; lv < 4; lv++) {
    const s = R.simulate({ level: lv, hit: 1, perfect: 1, seed: 3 });
    assert.equal(s.phase, "done"); assert.equal(s.stats.homers, 10, `lv${lv}`);
    assert.ok(s.score >= R.medalTable(lv, false).gold && s.score >= R.medalTable(lv, true).gold, "완벽하면 금");
    assert.ok(s.t > 55 && s.t < 90, `lv${lv} ${s.t}`);
  }
});

test("메달 기준: 맞힘 85% ≈ 금, 65% ≈ 은, 40% ≈ 동 (보너스 문제 한 번에 맞힌 보통 판)", () => {
  const reward = R.quizReward(true);
  const mean = (lv, hit, pf, rw) => { let t = 0; for (let i = 1; i <= 30; i++) t += R.simulate({ level: lv, hit, perfect: pf, reward: rw, seed: i * 7919 }).score; return t / 30; };
  for (let lv = 0; lv < 4; lv++) {
    for (const [quizOn, rw] of [[true, reward], [false, null]]) {
      const m = R.medalTable(lv, quizOn);
      const g = mean(lv, 0.85, 0.4, rw), sv = mean(lv, 0.65, 0.25, rw), bz = mean(lv, 0.4, 0.1, rw);
      const tag = `lv${lv} ${quizOn ? "문제" : "문제 없음"}`;
      assert.ok(g >= m.gold * 0.95 && g <= m.gold * 1.5, `${tag} 85%=${Math.round(g)} 금 ${m.gold}`);
      assert.ok(sv >= m.silver * 0.95 && sv < m.gold, `${tag} 65%=${Math.round(sv)} 은 ${m.silver}`);
      assert.ok(bz >= m.bronze * 0.9 && bz < m.silver, `${tag} 40%=${Math.round(bz)} 동 ${m.bronze}`);
    }
  }
  // 문제 하나 없이 모두 헛스윙이면 메달 없음
  assert.ok(R.simulate({ level: 0, hit: 0, reward: null, seed: 9 }).score < R.medalTable(0, false).bronze);
});

test("카메라(진짜로 휘두르기)는 공이 느리고 창이 넓고 커브가 없다", () => {
  for (let lv = 0; lv < 4; lv++) {
    const t = R.params(lv), c = R.params(lv, true);
    assert.ok(c.flight0 > t.flight0 && c.good > t.good && c.curve === 0 && c.wind > t.wind);
  }
});

test("그림: 재이·태오 swing(load<contact<finish, 30fps)·batidle 아틀라스와 sw.js 목록", () => {
  const sw = readFileSync(here("../../sw.js"), "utf8");
  for (const kid of ["jaei", "taeo"]) {
    for (const a of ["swing", "batidle"]) {
      assert.ok(existsSync(here(`../art/${kid}/${a}.webp`)), `${kid}/${a}.webp`);
      for (const ext of ["webp", "json"]) assert.ok(sw.includes(`"./sports/art/${kid}/${a}.${ext}?v=2"`), `sw ${kid}/${a}.${ext}`);
    }
    const m = JSON.parse(readFileSync(here(`../art/${kid}/swing.json`), "utf8"));
    assert.equal(m.fps, 30); assert.equal(m.loop, false); assert.ok(m.frames.length >= 14 && m.anchor && m.height > 300);
    assert.ok(m.events.load < m.events.contact && m.events.contact < m.events.finish && m.events.finish === m.frames.length - 1);
    const idle = JSON.parse(readFileSync(here(`../art/${kid}/batidle.json`), "utf8"));
    assert.equal(idle.loop, true); assert.deepEqual(idle.anchor, m.anchor, "준비 자세와 스윙의 발 자리가 같다"); assert.equal(idle.height, m.height);
  }
  // 공용 manifest 의 "idle" 에 방망이 그림을 넣지 않는다(다른 종목에 방망이가 끼지 않게)
  const man = JSON.parse(readFileSync(here("../art/manifest.json"), "utf8"));
  for (const acts of Object.values(man.kids)) assert.ok(!acts.includes("batidle"));
});
