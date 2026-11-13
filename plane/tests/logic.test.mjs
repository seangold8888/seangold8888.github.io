// 스카이 샷 규칙 점검: node --test plane/tests/
import test from "node:test";
import assert from "node:assert/strict";
import * as L from "../src/logic.js";

test("무기는 단계가 오를수록 반드시 더 세다", () => {
  assert.equal(L.MAX_WEAPON, 8);
  for (let level = 2; level <= L.MAX_WEAPON; level++) assert.ok(L.dps(level) > L.dps(level - 1), "level " + level);
  assert.equal(L.weapon(0).name, L.weapon(1).name);
  assert.equal(L.weapon(99).name, L.weapon(L.MAX_WEAPON).name);
});

test("적은 파도마다 단단해지고, 여섯 번째마다 대장이 나온다", () => {
  for (let wave = 2; wave <= 60; wave++) assert.ok(L.enemyHp(wave) >= L.enemyHp(wave - 1));
  assert.deepEqual([6, 12, 18].map(L.isBossWave), [true, true, true]);
  assert.equal(L.isBossWave(0), false);
  assert.deepEqual(L.formation(6).map(f => f.kind), ["boss"]);
  assert.ok(L.BOSS_STAY > 0);
});

test("대형은 화면 안에 놓이고, 한 줄 대형은 지나갈 틈을 남긴다", () => {
  let seed = 7; const rng = () => (seed = seed * 16807 % 2147483647) / 2147483647;
  for (let wave = 1; wave <= 40; wave++) {
    if (L.isBossWave(wave)) continue;
    const set = L.formation(wave, rng);
    assert.ok(set.length >= 3 && set.length <= 11, "wave " + wave);
    for (const f of set) { assert.ok(f.x > 0 && f.x < 1); assert.ok(f.delay >= 0); }
    const row = set.filter(f => f.kind === "cloud" && f.delay === 0);
    assert.ok(row.length < 5, "한 줄을 꽉 채우면 피할 곳이 없다");
    assert.equal(set.some(f => f.kind === "gift"), L.hasGift(wave));
  }
});

test("첫 별은 첫 파도에 나온다", () => { assert.equal(L.hasGift(1), true); });

test("무기는 단계마다 눈에 보이는 장비가 늘고, 속도는 한계가 있다", () => {
  for (let level = 2; level <= L.MAX_WEAPON; level++) {
    const a = L.weapon(level - 1), b = L.weapon(level);
    assert.ok((b.guns || 0) >= (a.guns || 0) && (b.helpers || 0) >= (a.helpers || 0), "level " + level);
    assert.ok(typeof b.bullet === "string");
  }
  assert.equal(L.weapon(1).guns, 0); assert.equal(L.weapon(2).guns, 2); assert.equal(L.weapon(8).aura, true);
  for (let wave = 2; wave <= 80; wave++) assert.ok(L.enemySpeed(wave) >= L.enemySpeed(wave - 1));
  assert.ok(L.enemySpeed(200) <= 140);
  for (let wave = 1; wave < L.METEOR_FROM; wave++) for (let i = 0; i < 20; i++) assert.equal(L.formation(wave).some(f => f.kind === "meteor"), false);
  for (let wave = 1; wave <= 40; wave++) for (let i = 0; i < 10; i++) assert.equal(L.formation(wave, Math.random, L.tuning(3)).some(f => f.kind === "meteor"), false, "태오에게는 별똥별이 없다");
});

test("조종사마다 난이도가 다르고, 어릴수록 쉽다", () => {
  assert.equal(L.PILOT_TUNING.length, 4);
  for (let i = 1; i < 4; i++) { assert.ok(L.PILOT_TUNING[i].speed <= L.PILOT_TUNING[i - 1].speed); assert.ok(L.PILOT_TUNING[i].hp <= L.PILOT_TUNING[i - 1].hp); assert.ok(L.PILOT_TUNING[i].meteorFrom >= L.PILOT_TUNING[i - 1].meteorFrom); }
  assert.equal(L.tuning(99), L.PILOT_TUNING[1]);
  assert.ok(L.PILOT_TUNING[3].hearts >= 4);
});

test("대장 셋이 번갈아 나오고, 꼬리는 별을 모을수록 열린다", () => {
  assert.deepEqual([6, 12, 18, 24].map(w => L.bossOf(w).id), ["boss", "snowking", "typhoon", "boss"]);
  assert.equal(L.formation(12)[0].who, "snowking");
  assert.equal(L.TRAILS[0].need, 0);
  for (let i = 1; i < L.TRAILS.length; i++) assert.ok(L.TRAILS[i].need > L.TRAILS[i - 1].need);
  assert.equal(L.unlockedTrails(0), 1); assert.equal(L.unlockedTrails(5), 2); assert.equal(L.unlockedTrails(9999), L.TRAILS.length);
});
