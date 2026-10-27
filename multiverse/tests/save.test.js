"use strict";
// 멀티버스 2 저장 규칙: 미션 잠금, 별 계산, 캡슐은 없는 조각만, 망가진 저장도 게임이 뜬다.
const test = require("node:test"), assert = require("node:assert/strict"), vm = require("node:vm"), fs = require("node:fs"), path = require("node:path");
const ctx = { window: {} };
vm.runInNewContext(fs.readFileSync(path.join(__dirname, "../data.js"), "utf8"), ctx);
const D = ctx.window.MV_DATA;
const S = require("../save.js");

test("처음엔 첫 세계의 첫 미션만 열리고, 앞 미션을 깨야 다음이 열린다", () => {
  let s = S.fresh(D);
  assert.equal(S.missionOpen(s, D, 0, 0), true);
  assert.equal(S.missionOpen(s, D, 0, 1), false);
  assert.equal(S.missionOpen(s, D, 1, 0), false);
  s = S.recordMission(s, "city", "rescue", 2).state;
  assert.equal(S.missionOpen(s, D, 0, 1), true);
  s = S.recordMission(s, "city", "treasure", 1).state;
  s = S.recordMission(s, "city", "boss", 1).state;
  assert.equal(S.missionOpen(s, D, 1, 0), true, "보스를 이기면 다음 세계");
});

test("별은 최고 기록을 넘은 만큼 받고, 다 깬 미션도 다시 깨면 1개", () => {
  let s = S.fresh(D);
  let r = S.recordMission(s, "city", "rescue", 2); assert.equal(r.earned, 2); s = r.state;
  r = S.recordMission(s, "city", "rescue", 3); assert.equal(r.earned, 1); s = r.state;
  r = S.recordMission(s, "city", "rescue", 3); assert.equal(r.earned, 1, "반복도 조금은 보상");
  r = S.recordMission(r.state, "city", "rescue", 0); assert.equal(r.earned, 0, "실패는 별 없음");
  assert.equal(r.state.best["city:rescue"], 3);
});

test("캡슐은 별 3개로 아직 없는 조각만 주고, 다 모으면 더 열리지 않는다", () => {
  let s = S.fresh(D); s.stars = 3 * D.ITEMS.length;
  const seen = new Set(s.owned);
  for (let i = 0; i < D.ITEMS.length; i++) {
    const r = S.openCapsule(s, D, () => 0.999);
    if (!r.item) break;
    assert.ok(!seen.has(r.item.id), "같은 조각이 두 번 나오면 안 된다");
    assert.ok(!r.item.drop, "보스 선물은 캡슐에서 안 나온다");
    seen.add(r.item.id); s = r.state;
  }
  assert.equal(s.owned.length, S.capsulePool(D).length);
  assert.ok(S.capsuleDone(s, D));
  assert.equal(S.openCapsule(s, D).item, null);
  const poor = Object.assign(S.fresh(D), { stars: 2 });
  assert.equal(S.openCapsule(poor, D).item, null);
});

test("가진 조각만 입을 수 있고, 망가진 저장은 버리고 새로 시작한다", () => {
  let s = S.fresh(D);
  assert.deepEqual(S.equip(s, D, "jaei", "cape-rainbow"), s, "없는 조각은 못 입는다");
  s.owned.push("cape-rainbow");
  s = S.equip(s, D, "jaei", "cape-rainbow");
  assert.equal(s.outfit.jaei.cape, "cape-rainbow");
  assert.equal(S.equip(s, D, "jaei", null, "cape").outfit.jaei.cape, null);
  const broken = S.normalise({ version: 1, stars: -5, owned: ["nope", "mask-cat"], outfit: { jaei: { mask: "mask-cat", cape: "weapon-web" } }, best: { "city:rescue": 9, "x": 1 }, hero: "zzz" }, D);
  assert.equal(broken.stars, 0);
  assert.ok(broken.owned.includes("mask-cat") && !broken.owned.includes("nope"));
  assert.equal(broken.outfit.jaei.mask, "mask-cat");
  assert.equal(broken.outfit.jaei.cape, "cape-purple", "다른 칸 조각은 무시");
  assert.deepEqual(broken.best, {});
  assert.equal(broken.hero, "jaei");
  assert.equal(S.normalise("garbage", D).version, 1);
});

test("모든 그림 파일이 있다", () => {
  const files = [];
  Object.values(D.HEROES).forEach(h => Object.values(h.poses).forEach(p => files.push(p.src)));
  Object.values(D.ENEMIES).forEach(e => files.push(e.src));
  Object.values(D.BOSSES).forEach(b => files.push(b.src));
  D.WORLDS.forEach(w => files.push(w.bg));
  files.forEach(f => assert.ok(fs.existsSync(path.join(__dirname, "..", f.split("?")[0])), f));
});

test("사촌 넷 중 주인공과 동료를 고르고, 옛 저장도 새 아이 옷차림을 받는다", () => {
  assert.equal(D.HERO_ORDER.join(","), "yunchan,jaei,yungeon,taeo");
  const old = S.normalise({ version: 1, stars: 4, owned: [], outfit: { jaei: {}, taeo: {} }, best: {}, hero: "taeo" }, D);
  assert.equal(old.hero, "taeo");
  assert.equal(old.buddy, "jaei", "동료를 고른 적 없으면 짝꿍");
  assert.ok(old.outfit.yunchan && old.outfit.yungeon, "새로 온 아이도 처음 옷을 입는다");
  const picked = S.normalise(Object.assign({}, old, { hero: "yunchan", buddy: "taeo" }), D);
  assert.equal(picked.buddy, "taeo");
  const same = S.normalise(Object.assign({}, old, { hero: "yungeon", buddy: "yungeon" }), D);
  assert.equal(same.buddy, "yunchan", "주인공과 같은 동료는 짝꿍으로 바꾼다");
});

test("공룡 화산섬은 쓰구미 메카를 이겨야 열리고, 티라노를 이길 때마다 선물 조각을 하나씩 준다", () => {
  const wi = D.WORLDS.findIndex(w => w.id === "volcano");
  assert.equal(wi, 4, "다섯째 세계");
  assert.equal(D.WORLDS[wi].boss, "trex");
  let s = S.fresh(D);
  ["city", "web", "sky"].forEach(w => { s.best[w + ":boss"] = 1; });
  assert.equal(S.missionOpen(s, D, wi, 0), false);
  s = S.recordMission(s, "core", "boss", 2).state;
  assert.equal(S.missionOpen(s, D, wi, 0), true);
  const drops = D.BOSSES.trex.drops;
  assert.ok(drops.length >= 3);
  drops.forEach(id => assert.ok(D.ITEMS.some(it => it.id === id && it.drop === "trex"), id));
  const got = [];
  for (let i = 0; i < drops.length; i++) { const r = S.bossDrop(s, D, "trex"); got.push(r.item.id); s = r.state; }
  assert.deepEqual(got, [...drops], "차례로 하나씩");
  assert.equal(S.bossDrop(s, D, "trex").item, null, "다 받으면 더 없다");
  assert.equal(S.bossDrop(s, D, "spider").item, null, "다른 보스는 선물 없음");
  const back = S.normalise(JSON.parse(JSON.stringify(s)), D);
  assert.ok(drops.every(id => back.owned.includes(id)), "선물은 저장에 남는다");
  assert.ok(S.missionOpen(S.normalise(Object.assign({}, s, { best: { "volcano:rescue": 3 } }), D), D, 0, 0));
});
