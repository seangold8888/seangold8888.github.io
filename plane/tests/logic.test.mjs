// 스카이 샷 규칙 점검: node --test plane/tests/
import test from "node:test";
import assert from "node:assert/strict";
import * as L from "../src/logic.js";

test("무기는 단계가 오를수록 반드시 더 세다 — 어느 갈래를 골라도", () => {
  assert.equal(L.MAX_WEAPON, 8);
  for (let level = 2; level <= L.MAX_WEAPON; level++) assert.ok(L.dps(level) > L.dps(level - 1), "level " + level);
  assert.equal(L.allPaths().length, 9);
  for (const path of L.allPaths()) for (let level = 2; level <= L.MAX_WEAPON; level++) assert.ok(L.dps(level, path) > L.dps(level - 1, path), JSON.stringify(path) + " level " + level);
  assert.equal(L.weapon(0).name, L.weapon(1).name);
  assert.equal(L.weapon(99).name, L.weapon(L.MAX_WEAPON).name);
});

test("갈래끼리 세기가 비슷하다(한 무기만 압도적이지 않다)", () => {
  for (let level = L.FORK_MAIN; level <= L.MAX_WEAPON; level++) {
    const all = L.allPaths().map(p => L.dps(level, p)), ratio = Math.max(...all) / Math.min(...all);
    assert.ok(ratio <= 1.25, "level " + level + " ratio " + ratio.toFixed(2));
  }
});

test("갈림길은 3단계(큰 무기)와 6단계(곁무기)에 있고, 갈래마다 생김새가 다르다", () => {
  assert.equal(L.forkAt(3), "main"); assert.equal(L.forkAt(6), "side");
  for (const lv of [1, 2, 4, 5, 7, 8]) assert.equal(L.forkAt(lv), null);
  for (const id of L.MAIN_IDS) {
    assert.equal(L.MAINS[id].tiers.length, L.MAX_WEAPON - L.FORK_MAIN + 1);
    assert.ok(L.weapon(3, { main: id })[id], id);
    assert.equal(L.weapon(2, { main: id })[id], undefined, "갈림길 전에는 큰 무기가 없다");
  }
  for (const id of L.SIDE_IDS) {
    assert.equal(L.SIDES[id].tiers.length, L.MAX_WEAPON - L.FORK_SIDE + 1);
    assert.ok(L.weapon(6, { main: "bolt", side: id })[id]);
    assert.equal(L.weapon(5, { main: "bolt", side: id })[id], undefined);
  }
  const names = new Set(); for (const id of L.MAIN_IDS) for (const t of L.MAINS[id].tiers) names.add(t.name);
  assert.equal(names.size, 18, "큰 무기 이름이 모두 다르다");
  const every = [...names, ...L.SIDE_IDS.map(id => L.SIDES[id].name), ...L.MAIN_IDS.map(id => L.MAINS[id].name)];
  for (const n of every) assert.ok(!n.includes("별빛"), n);
  assert.equal(L.weaponLabel(6, { main: "missile", side: "boom" }), "6단계 미사일 떼 + 부메랑");
});

test("비행기는 화면 아래쪽 구간에서만 오르내린다", () => {
  for (const fh of [545, 640, 800, 1024, 1400]) {
    const r = L.playerYRange(fh);
    assert.ok(r.min >= fh * 0.45 - 1 && r.min >= 140, "위 끝 " + fh);
    assert.ok(r.max <= fh - 50 && r.max > r.min + 50, "아래 끝 " + fh);
    assert.ok(r.home >= r.min && r.home <= r.max);
  }
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
  for (const path of L.allPaths()) for (let level = 2; level <= L.MAX_WEAPON; level++) { const a = L.weapon(level - 1, path), b = L.weapon(level, path); assert.ok((b.guns || 0) >= (a.guns || 0) && (b.helpers || 0) >= (a.helpers || 0)); }
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
