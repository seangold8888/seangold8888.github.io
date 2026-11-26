// 훌라후프 규칙 검사: node --test sports/tests/*.test.mjs
import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync, existsSync } from "node:fs";
import { fileURLToPath } from "node:url";
import * as R from "../src/events/hula-rules.js";
import { checkEvent } from "../src/events/index.js";
import hula from "../src/events/hula.js";

const here = p => fileURLToPath(new URL(p, import.meta.url));
const TAU = Math.PI * 2;
const run = (s, sec, each) => { for (let i = 0; i < sec * 60 && s.phase !== "done" && s.phase !== "break"; i++) { if (each) each(s); R.step(s, 1 / 60); } return s; };
const toPlay = s => { while (s.phase === "ready") R.step(s, 1 / 60); s.events.length = 0; return s; };

test("종목 약속: 훌라후프 = 몸으로 하기(hipCircle)·시연 지원·메달 순서", () => {
  assert.deepEqual(checkEvent(hula, "hula"), []);
  assert.equal(hula.cameraMode, true); assert.deepEqual(hula.gestures, ["hipCircle"]); assert.equal(hula.demo, true);
});

test("아이별 난이도: 태오 = 톡(느리고 넓은 창), 재이 = 동그라미(빠르기 띠), 어릴수록 느리다", () => {
  assert.equal(R.LEVELS[0].mode, "tap"); assert.equal(R.LEVELS[2].mode, "circle");
  assert.equal(R.LEVELS[0].kid, "taeo"); assert.equal(R.LEVELS[2].kid, "jaei");
  for (let lv = 1; lv < 4; lv++) {
    const a = R.LEVELS[lv - 1], b = R.LEVELS[lv];
    for (let k = 0; k < 3; k++) assert.ok(a.period[k] > b.period[k], `lv${lv - 1} 판${k} 이 더 느림`);
    assert.ok(a.extra <= b.extra || lv === 1, "덤 후프");
  }
  for (const L of R.LEVELS) {
    assert.ok(L.period[0] > L.period[1] && L.period[1] > L.period[2], "판마다 빨라진다");
    if (L.mode === "tap") { assert.ok(L.window * 2 < L.period[2] * 0.75, "가장 빠를 때도 박자 창이 겹치지 않는다"); assert.ok(L.perfect < L.window); }
    else assert.ok(L.perfect < L.band && L.band < 0.35);
  }
  assert.ok(R.LEVELS[0].window >= 0.28, "태오 창 ±0.28초 이상");
  assert.ok(R.LEVELS[0].period[0] >= 1.4, "태오 첫 박자 1.4초 이상(느린 템포)");
});

test("판정: 동그라미 빠르기 비율·톡 시각", () => {
  const J = R.params(2), T = R.params(0);
  assert.equal(R.judgeSpin(1, J), "perfect"); assert.equal(R.judgeSpin(1 + J.band - 0.01, J), "good");
  assert.equal(R.judgeSpin(1 - J.band - 0.02, J), "slow"); assert.equal(R.judgeSpin(1 + J.band + 0.02, J), "fast");
  assert.equal(R.judgeTap(0, T), "perfect"); assert.equal(R.judgeTap(-T.window + 0.01, T), "good"); assert.equal(R.judgeTap(T.window + 0.02, T), "off");
});

test("몸으로 돌리기(카메라): 두 아이 모두 톡 규칙, 더 느리고 창이 가장 빠른 한 바퀴의 40% 이상", () => {
  for (let lv = 0; lv < 4; lv++) {
    const t = R.params(lv), c = R.params(lv, true);
    assert.equal(c.mode, "tap"); assert.ok(c.period[0] > t.period[0]);
    assert.ok(c.window >= c.period[2] * 0.4 && c.window * 2 < c.period[2] * 0.95 && c.window > t.window, `lv${lv}`);
  }
});

test("엔진: 완벽하게 하면 실수 없이 세 판, 70초 안팎, 후프가 최대까지 늘고 문제 없이도 금", () => {
  for (let lv = 0; lv < 4; lv++) {
    const s = R.simulate({ level: lv, hit: 1, perfect: 1, seed: 3 });
    assert.equal(s.phase, "done"); assert.equal(s.stats.drops, 0); assert.equal(s.stats.slip, 0, `lv${lv} 실수 0`);
    assert.ok(s.t > 66 && s.t < 80, `lv${lv} 시간 ${s.t}`);
    assert.deepEqual(s.rounds, ["basic", "fast", "swap"]);
    assert.equal(s.stats.hoopsMax, 1 + R.LEVELS[lv].extra, `lv${lv} 후프 ${s.stats.hoopsMax}`);
    assert.ok(s.score >= R.medalTable(lv, false).gold, `lv${lv} 문제 없이도 완벽하면 금 ${s.score}`);
  }
});

test("동그라미: 손가락을 멈추면 후프가 처지다 2초 안에 '앗!' 떨어지고, 잠시 뒤 다시 돈다", () => {
  const s = toPlay(R.createRun({ level: 2 }));
  let dropAt = null;
  run(s, 3, x => { R.setInput(x, 0); if (dropAt == null && x.events.some(e => e.type === "drop")) dropAt = x.t; x.events.length = 0; });
  assert.ok(dropAt != null && s.stats.drops >= 1, "떨어짐");
  const s2 = toPlay(R.createRun({ level: 2 }));
  let t0 = s2.t, dropped = false;
  for (let i = 0; i < 240 && !dropped; i++) { R.setInput(s2, 0); R.step(s2, 1 / 60); dropped = s2.phase === "drop"; }
  assert.ok(dropped && s2.t - t0 < 2, `떨어지기까지 ${s2.t - t0}`);
  for (let i = 0; i < 60 * R.DROP_LEN + 10 && s2.phase === "drop"; i++) R.step(s2, 1 / 60);
  assert.equal(s2.phase, "play"); assert.ok(s2.h > R.START_H - 0.02, "다시 허리 높이에서");
});

test("동그라미: 빠르기를 맞추면 후프가 올라가고 콤보로 후프가 는다, 너무 느리면 덤 후프가 다 툭", () => {
  const s = toPlay(R.createRun({ level: 2 }));
  run(s, 12, x => R.setInput(x, TAU / x.period));
  assert.ok(s.h > 0.95 && s.stats.ok >= 9 && s.stats.slip === 0);
  assert.ok(R.hoops(s) >= 2, `후프 ${R.hoops(s)}`);
  const before = R.hoops(s); s.events.length = 0;
  // 한 바퀴를 느리게(비율 0.55)
  const k0 = Math.floor(s.phi / TAU);
  for (let i = 0; i < 400 && Math.floor(s.phi / TAU) <= k0 + 1; i++) { R.setInput(s, 0.55 * TAU / s.period); R.step(s, 1 / 60); }
  assert.ok(s.events.some(e => e.type === "slip" && e.kind === "slow" && e.lost === before - 1), "느린 바퀴 = 실수 + 덤 후프 툭");
  assert.equal(R.hoops(s), 1); assert.equal(s.combo, 0);
});

test("톡: 박자에 맞추면 성공, 놓치면 처짐, 마구 누르기로는 못 버틴다", () => {
  const s = toPlay(R.createRun({ level: 0 }));
  const plan = { k: null };
  run(s, 15, x => { const k = Math.floor(x.phi / TAU); if (plan.k !== k && R.timeToBeat(x) < 0.05) { plan.k = k; R.tap(x); } });
  assert.ok(s.stats.ok >= 8 && s.stats.slip === 0, `ok ${s.stats.ok} slip ${s.stats.slip}`);
  const n = toPlay(R.createRun({ level: 0 }));
  run(n, 6);
  assert.ok(n.stats.slip >= 2 && n.stats.drops >= 1, "안 누르면 떨어진다");
  // 0.12초마다 마구 톡
  const m = toPlay(R.createRun({ level: 0 }));
  let c = 0;
  run(m, 20, x => { if (++c % 7 === 0) R.tap(x); });
  assert.ok(m.stats.drops >= 2 && m.stats.off > 50, `마구 누르기 drops ${m.stats.drops} off ${m.stats.off}`);
  const mash = R.simulate({ level: 0, hit: 0, seed: 2 });
  assert.ok(mash.score < R.medalTable(0).bronze, "전혀 못 맞히면 메달 없음");
});

test("빠르게 천천히 판: 박자가 바뀌고 알려 준다", () => {
  const s = R.createRun({ level: 2, rounds: ["swap"] });
  toPlay(s);
  const tempos = [];
  run(s, 18, x => { R.setInput(x, TAU / x.period); for (const e of x.events) if (e.type === "tempo") tempos.push(e.fast); x.events.length = 0; });
  assert.ok(tempos.length >= 2 && tempos[0] === true && tempos[1] === false, JSON.stringify(tempos));
  assert.equal(s.stats.slip, 0, "빠르기를 따라가면 실수 없음");
});

test("요술 후프(보너스 문제): 정답 순간 덤 후프·점수, 다음 판 시작부터 저절로 돌기(한 번에 8초 / 고쳐서 4초)", () => {
  const one = R.quizReward(true), fix = R.quizReward(false);
  assert.equal(one.magic, 8); assert.equal(fix.magic, 4);
  assert.ok(one.hoop >= 1 && fix.hoop >= 1 && one.bonus > fix.bonus && fix.bonus > 0, "고쳐 맞혀도 손에 잡히는 보상, 한 번에 맞히면 더 크게");
  const s = R.createRun({ level: 2 });
  run(s, 30, x => R.setInput(x, TAU / x.period));
  assert.equal(s.phase, "break");
  const sc = s.score, hp = R.hoops(s);
  s.events.length = 0;
  R.applyReward(s, one);
  assert.equal(s.score, sc + one.bonus, "점수 바로");
  assert.equal(R.hoops(s), Math.min(R.MAX_HOOPS, hp + 1), "후프 하나 바로");
  assert.ok(s.events.some(e => e.type === "magic"), "그림에 바로 알림");
  R.nextRound(s, null);
  // 준비 중에는 요술 시간이 줄지 않는다
  toPlay(s); assert.equal(s.magic, 8);
  // 손가락을 아예 안 돌려도 8초 동안 안 떨어진다
  let t0 = s.t;
  for (let i = 0; i < 60 * 7.9; i++) { R.setInput(s, 0); R.step(s, 1 / 60); }
  assert.equal(s.stats.drops, 0); assert.ok(s.stats.magicBeats >= 6, `요술 바퀴 ${s.stats.magicBeats}`);
  assert.ok(s.magic > 0 && s.magic < 0.2);
  for (let i = 0; i < 60 * 3; i++) { R.setInput(s, 0); R.step(s, 1 / 60); }
  assert.equal(s.magic, 0); assert.ok(s.stats.drops >= 1, "요술이 끝나면 다시 내 힘으로");
  assert.ok(s.t - t0 > 8);
  // 태오(톡)도 요술 동안은 안 눌러도 성공
  const k = R.createRun({ level: 0, rounds: ["basic", "fast"] });
  run(k, 30, x => { if (R.timeToBeat(x) < 0.03) R.tap(x); });
  R.applyReward(k, fix); R.nextRound(k, null); toPlay(k);
  const ok0 = k.stats.ok;
  for (let i = 0; i < 60 * 3.9; i++) R.step(k, 1 / 60);
  assert.equal(k.stats.slip, 0); assert.ok(k.stats.ok - ok0 >= 2);
});

test("메달 기준: 성공률 85% ≈ 금, 65% ≈ 은, 40% ≈ 동 (보너스 문제 한 번에 맞힌 보통 판)", () => {
  const reward = R.quizReward(true);
  const mean = (lv, hit, pf, rw) => { let t = 0; for (let i = 1; i <= 24; i++) t += R.simulate({ level: lv, hit, perfect: pf, reward: rw, seed: i * 7919 }).score; return t / 24; };
  for (let lv = 0; lv < 4; lv++) {
    for (const [rw, m] of [[reward, R.MEDALS[lv]], [null, R.MEDALS_NOQUIZ[lv]]]) {
      const g = mean(lv, 0.85, 0.4, rw), sv = mean(lv, 0.65, 0.25, rw), bz = mean(lv, 0.4, 0.1, rw);
      const tag = `lv${lv} ${rw ? "문제" : "문제없음"}`;
      assert.ok(g >= m.gold * 0.95 && g <= m.gold * 1.5, `${tag} 85%=${Math.round(g)} 금 ${m.gold}`);
      assert.ok(sv >= m.silver * 0.95 && sv < m.gold, `${tag} 65%=${Math.round(sv)} 은 ${m.silver}`);
      assert.ok(bz >= m.bronze * 0.9 && bz < m.silver, `${tag} 40%=${Math.round(bz)} 동 ${m.bronze}`);
    }
  }
  for (let lv = 0; lv < 4; lv++) { const a = R.medalTable(lv, true), b = R.medalTable(lv, false); assert.ok(b.gold < a.gold && b.silver < a.silver && b.bronze < a.bronze); }
});

test("그림: 재이·태오 hula 아틀라스(후프 지운 몸 + 프레임마다 후프 타원·front 박자 프레임)", () => {
  for (const kid of ["jaei", "taeo"]) {
    const j = here(`../art/${kid}/hula.json`);
    assert.ok(existsSync(j) && existsSync(here(`../art/${kid}/hula.webp`)), kid);
    const a = JSON.parse(readFileSync(j, "utf8"));
    const n = a.frames.length;
    assert.ok(n >= 12 && n <= 120, `${kid} 프레임 ${n}`);
    assert.equal(a.loop, true);
    assert.ok(a.events && Number.isInteger(a.events.front) && a.events.front >= 0 && a.events.front < n, "front");
    assert.ok(Number.isInteger(a.revs) && a.revs >= 1);
    assert.ok(Array.isArray(a.hoop) && a.hoop.length === n && a.hoop.every(e => e.rx > e.ry && e.ry > 0), "후프 타원");
    assert.ok(Array.isArray(a.hands) && a.hands.length === n && Array.isArray(a.neck) && a.neck.length === n);
  }
});
