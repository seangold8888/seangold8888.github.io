// 축구(승부차기) 규칙 검사: node --test sports/tests/*.test.mjs
import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync, existsSync } from "node:fs";
import { fileURLToPath } from "node:url";
import * as R from "../src/events/soccer-rules.js";
import { checkEvent } from "../src/events/index.js";
import soccer from "../src/events/soccer.js";

const here = p => fileURLToPath(new URL(p, import.meta.url));
const seq = vals => { let i = 0; return () => vals[i++ % vals.length]; };

test("종목 약속: 축구 모듈이 checkEvent 를 통과하고 몸으로 차기(kick)를 지원", () => {
  assert.deepEqual(checkEvent(soccer, "soccer"), []);
  assert.equal(soccer.cameraMode, true); assert.deepEqual(soccer.gestures, ["kick"]);
  for (let lv = 0; lv < 4; lv++) { const m = soccer.medals(lv, false); assert.ok(m.gold > m.silver && m.silver > m.bronze && m.bronze > 0); }
});

test("아이별 골키퍼: 어린 아이일수록 느리고 손이 짧고 빈 곳이 크다, 태오만 조준 도움·골대 밖 없음", () => {
  for (let lv = 1; lv < 4; lv++) {
    const a = R.LEVELS[lv - 1], b = R.LEVELS[lv];
    assert.ok(a.react > b.react && a.speed < b.speed && a.reach <= b.reach, `골키퍼 ${lv - 1} < ${lv}`);
    assert.ok(a.gap > b.gap, "빈 곳");
    assert.ok(a.read <= b.read && a.slide < b.slide);
  }
  assert.equal(R.LEVELS[0].kid, "taeo"); assert.equal(R.LEVELS[2].kid, "jaei");
  assert.ok(R.LEVELS[0].assist > 0 && R.LEVELS[2].assist === 0);
  assert.equal(R.LEVELS[0].miss, false); assert.equal(R.LEVELS[2].miss, true);
  assert.equal(R.LEVELS[0].read, 0, "태오 골키퍼는 읽지 않는다");
});

test("조준: 태오는 빈 곳으로 끌어당기고 늘 골대 안, 재이는 그대로(밖으로도 나갈 수 있다)", () => {
  const t = R.createRun({ level: 0, rnd: seq([0.9]) });            // 0.9 → 골키퍼가 오른쪽에 → 빈 곳 왼쪽
  const k = R.prepareShot(t);
  assert.ok(k.k0 > 0.3 && k.gapSide === -1, JSON.stringify(k));
  const a = R.assistAim(t, -0.3, 0.5);
  assert.ok(a.u < -0.4, "빈 쪽으로 더 깊이 " + a.u);
  const out = R.assistAim(t, 1.4, 1.3);
  assert.ok(Math.abs(out.u) <= 0.86 && out.v <= 0.84, "골대 안");
  const j = R.createRun({ level: 2, rnd: seq([0.4]) }); R.prepareShot(j);
  assert.deepEqual(R.assistAim(j, 1.2, 0.5), { u: 1.2, v: 0.5 });
});

test("미끄럼 과녁은 늘 골대 안을 오간다, 세게 찰수록 공이 빨리 간다", () => {
  for (const lv of [0, 2]) {
    const s = R.createRun({ level: lv });
    for (let t = 0; t < 10; t += 0.05) { const a = R.slideAim(s, t); assert.ok(Math.abs(a.u) < 0.9 && a.v > 0.05 && a.v < 0.8); }
    const P = R.params(lv);
    assert.ok(R.flightTime(P, 1) < R.flightTime(P, 0.5) && R.flightTime(P, 0.5) < R.flightTime(P, 0.2));
  }
});

test("골키퍼: 가운데 공은 막고, 반대쪽 구석 세게는 골, 약한 공은 막는다", () => {
  for (const lv of [0, 2]) {
    // rnd 0.99: 미리 날지 않고 보고 따라간다(read·guess 실패)
    const mk = () => { const s = R.createRun({ level: lv, rnd: seq([0.99]) }); R.prepareShot(s); s.keeper.k0 = 0; s.keeper.gapSide = 0; return s; };
    let s = mk(); assert.equal(R.shoot(s, { u: 0.05, v: 0.4, power: 0.9 }).result, "save", `lv${lv} 가운데`);
    s = mk(); assert.equal(R.shoot(s, { u: -0.85, v: 0.3, power: 1 }).result, "goal", `lv${lv} 구석`);
    s = mk(); assert.equal(R.shoot(s, { u: 0.5, v: 0.2, power: 0.2 }).result, "save", `lv${lv} 약하게`);
  }
});

test("재이 골키퍼는 지난번 쪽을 읽는다: 같은 쪽 구석만 차면 막힐 때가 많고, 번갈아 차면 잘 들어간다", () => {
  const rate = alternate => {
    let goals = 0, n = 0;
    for (let seed = 1; seed <= 200; seed++) {
      let x = seed; const rnd = () => ((x = (x * 16807) % 2147483647) / 2147483647);
      const s = R.createRun({ level: 2, rnd });
      for (let i = 0; i < 5; i++) {
        if (s.phase === "break") R.nextShot(s, null);
        R.prepareShot(s);
        const side = alternate ? (i % 2 ? 1 : -1) : 1;
        const r = R.shoot(s, { u: side * 0.8, v: 0.35, power: 1 });
        if (i > 0) { n++; if (r.scored) goals++; }
      }
    }
    return goals / n;
  };
  const same = rate(false), alt = rate(true);
  assert.ok(alt > same + 0.25, `번갈아 ${alt.toFixed(2)} vs 같은 쪽 ${same.toFixed(2)}`);
});

test("점수: 골 100 + 구석 + 위 구석 + 강슛 + 연속 골, 골대 맞고 골 보너스, 못 넣으면 0", () => {
  const s = R.createRun({ level: 2, rnd: seq([0.99]) });
  R.prepareShot(s); s.keeper.k0 = 0;
  const a = R.shoot(s, { u: -0.85, v: 0.7, power: 1 });
  assert.equal(a.result, "goal");
  assert.equal(a.points, R.POINTS.goal + R.POINTS.corner + R.POINTS.top + R.POINTS.power);
  R.prepareShot(s); s.keeper.k0 = 0;
  const b = R.shoot(s, { u: 0.85, v: 0.3, power: 1 });
  assert.equal(b.points, R.POINTS.goal + R.POINTS.corner + R.POINTS.power + R.POINTS.streak, "두 번째 연속 골");
  assert.equal(s.phase, "break", "두 번째 슛 뒤 보너스 타임");
  R.nextShot(s, null);
  R.prepareShot(s); s.keeper.k0 = 0;
  const c = R.shoot(s, { u: 0, v: 0.4, power: 0.9 });
  assert.equal(c.points, 0); assert.equal(s.streak, 0);
  const d = R.shoot(Object.assign(R.createRun({ level: 2, rnd: seq([0.99]) }), {}), { u: 1.3, v: 0.5, power: 1 });
  assert.equal(d.result, "miss");
  const e = R.shoot(R.createRun({ level: 2, rnd: seq([0.1]) }), { u: 1.0, v: 0.5, power: 1 });
  assert.ok(e.result === "postIn" || e.result === "post");
});

test("보너스 문제 보상: 한 번에 = 불꽃 슛(골키퍼가 반대로, 꼭 골, ×1.5) +100 / 고쳐서 = 느림보 골키퍼 +50", () => {
  const s = R.createRun({ level: 2, rnd: seq([0.99]) });
  for (let i = 0; i < 2; i++) { R.prepareShot(s); R.shoot(s, { u: 0, v: 0.3, power: 0.9 }); }
  assert.equal(s.phase, "break");
  const before = s.score, rw = R.quizReward(true);
  R.nextShot(s, rw);
  assert.equal(s.score, before + 100); assert.equal(s.fire, true);
  R.prepareShot(s);
  const r = R.shoot(s, { u: 0.1, v: 0.3, power: 0.6 });               // 가운데여도
  assert.equal(r.result, "goal"); assert.equal(r.fire, true); assert.equal(r.keeper.kind, "fooled");
  assert.ok(Math.sign(r.keeper.target) !== Math.sign(r.u), "골키퍼는 반대로 날아간다");
  assert.equal(r.points, Math.round(R.POINTS.goal * R.POINTS.fireMult));
  assert.equal(s.fire, false, "한 슛만");
  const retry = R.quizReward(false);
  assert.ok(retry.slow && retry.bonus === 50 && !retry.fire);
  // 느림보 골키퍼: 같은 슛이 보통보다 잘 들어간다
  const slowRate = slow => { let g = 0; for (let i = 1; i <= 200; i++) { let x = i; const rnd = () => ((x = (x * 48271) % 2147483647) / 2147483647); const t = R.createRun({ level: 2, rnd }); t.slow = slow; R.prepareShot(t); if (R.shoot(t, { u: 0.55, v: 0.4, power: 0.8 }).scored) g++; } return g / 200; };
  assert.ok(slowRate(true) > slowRate(false) + 0.2, `${slowRate(true)} vs ${slowRate(false)}`);
});

test("한 판: 5번 차고 끝, 보너스 타임은 2·4번째 뒤, 서든 데스는 골을 넣는 동안(최대 3번)", () => {
  const s = R.simulate({ level: 0, hit: 1, seed: 3 });
  assert.equal(s.phase, "done"); assert.equal(s.stats.shots, R.SHOTS);
  assert.deepEqual(R.BONUS_AFTER, [2, 4]);
  const sd = R.simulate({ level: 0, hit: 1, seed: 3, sudden: true });
  assert.ok(sd.sudden && sd.stats.shots > R.SHOTS && sd.stats.shots <= R.SHOTS + R.SUDDEN_MAX);
  const miss = R.createRun({ level: 2, rnd: seq([0.99]) });
  for (let i = 0; i < 5; i++) { if (miss.phase === "break") R.nextShot(miss, null); R.prepareShot(miss); R.shoot(miss, { u: 0, v: 0.3, power: 0.9 }); }
  assert.equal(miss.phase, "done"); assert.ok(R.startSudden(miss));
  R.prepareShot(miss); R.shoot(miss, { u: 0, v: 0.3, power: 0.9 });
  assert.equal(miss.phase, "done", "서든 데스에서 못 넣으면 끝");
});

test("성공률: 좋은 슛 85% 면 문제 보상 없이도 골 80% 안팎(태오는 넉넉하게)", () => {
  for (const lv of [0, 2]) {
    let g = 0, n = 0;
    for (let i = 1; i <= 200; i++) { const s = R.simulate({ level: lv, hit: 0.85, seed: i * 31 }); g += s.goals; n += s.stats.shots; }
    assert.ok(g / n >= 0.75 && g / n <= 0.97, `lv${lv} ${(g / n).toFixed(2)}`);
  }
});

test("메달 기준: 좋은 슛 85% ≈ 금, 65% ≈ 은, 40% ≈ 동 (보너스 문제 한 번에 맞힌 보통 판)", () => {
  const reward = R.quizReward(true);
  const mean = (lv, hit) => { let t = 0; for (let i = 1; i <= 120; i++) t += R.simulate({ level: lv, hit, reward, seed: i * 7919 }).score; return t / 120; };
  for (let lv = 0; lv < 4; lv++) {
    const m = R.MEDALS[lv];
    const g = mean(lv, 0.85), sv = mean(lv, 0.65), bz = mean(lv, 0.4);
    assert.ok(g >= m.gold * 0.97 && g <= m.gold * 1.2, `lv${lv} 85%=${Math.round(g)} 금 ${m.gold}`);
    assert.ok(sv >= m.silver * 0.97 && sv < m.gold, `lv${lv} 65%=${Math.round(sv)} 은 ${m.silver}`);
    assert.ok(bz >= m.bronze * 0.95 && bz < m.silver, `lv${lv} 40%=${Math.round(bz)} 동 ${m.bronze}`);
  }
});

test("메달 기준: 문제 모듈이 없으면 낮춘다(문제 없이도 잘 차면 금)", () => {
  for (let lv = 0; lv < 4; lv++) {
    assert.equal(R.medalTable(lv, false).gold, Math.round(R.MEDALS[lv].gold * R.NO_QUIZ_SCALE));
    let t = 0; for (let i = 1; i <= 60; i++) t += R.simulate({ level: lv, hit: 0.9, reward: null, seed: i * 101 }).score;
    assert.ok(t / 60 >= R.medalTable(lv, false).gold * 0.95, `lv${lv} 문제 없이 ${Math.round(t / 60)}`);
  }
});

test("그림: 재이·태오 kick(contact·공 위치)·cheer(루프) 아틀라스가 있고 sw.js 에 있다", () => {
  const sw = readFileSync(here("../../sw.js"), "utf8");
  for (const kid of ["jaei", "taeo"]) {
    const kick = JSON.parse(readFileSync(here(`../art/${kid}/kick.json`), "utf8"));
    assert.ok(kick.frames.length >= 12 && kick.fps > 0 && kick.anchor && kick.loop === false);
    const c = kick.events.contact;
    assert.ok(c > 4 && c < kick.frames.length - 6, "contact 앞뒤로 디딤·마무리");
    assert.ok(kick.ballR > 10 && kick.ball[c] && kick.ball[0], "공 자리");
    assert.ok(Math.abs(kick.ball[c].y + kick.ballR - kick.anchor.y) < kick.ballR * 0.5, "공이 땅 위");
    const cheer = JSON.parse(readFileSync(here(`../art/${kid}/cheer.json`), "utf8"));
    assert.ok(cheer.frames.length >= 8 && cheer.loop === true && cheer.height === kick.height, "같은 배율");
    for (const a of ["kick", "cheer"]) for (const ext of ["webp", "json"]) {
      assert.ok(existsSync(here(`../art/${kid}/${a}.${ext}`)));
      assert.ok(sw.includes(`"./sports/art/${kid}/${a}.${ext}?v=1"`), `sw ${kid}/${a}.${ext}`);
    }
  }
});
