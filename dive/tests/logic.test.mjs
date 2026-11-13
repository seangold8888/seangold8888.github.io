// 딥 다이브 규칙 점검: node --test dive/tests/logic.test.mjs
import test from "node:test";
import assert from "node:assert/strict";
import * as L from "../src/logic.js";
import * as E from "../src/engine.js";
import { summary, seeded } from "./sim.mjs";

test("무기는 단계가 오를수록 반드시 더 세고, 합체하면 5단계보다 세다", () => {
  assert.equal(L.WEAPON_IDS.length, 6);
  for (const id of L.WEAPON_IDS) {
    assert.equal(L.WEAPONS[id].tiers.length, L.MAX_LV, id);
    for (let lv = 2; lv <= L.MAX_LV; lv++) assert.ok(L.weaponDps(id, lv) > L.weaponDps(id, lv - 1), id + " lv" + lv);
  }
  for (const c of L.COMBO_IDS) { const w = L.COMBOS[c].weapon; assert.ok(L.weaponDps(w, 5, true) > L.weaponDps(w, 5) * 1.3, c); }
  // 단계 밖 값은 끝으로 붙는다
  assert.deepEqual(L.weaponStats("bubble", 0), L.weaponStats("bubble", 1));
  assert.deepEqual(L.weaponStats("bubble", 99), L.weaponStats("bubble", 5));
});

test("무기는 단계마다 눈에 보이게 커진다(수·크기·범위 중 하나는 반드시 늘어남)", () => {
  const visible = { bubble: ["n", "size"], whirl: ["n", "r", "size"], zap: ["chain"], shell: ["n", "size"], light: ["r"], star: ["dirs", "size"] };
  for (const id of L.WEAPON_IDS) for (let lv = 2; lv <= 5; lv++) {
    const a = L.WEAPONS[id].tiers[lv - 2], b = L.WEAPONS[id].tiers[lv - 1];
    assert.ok(visible[id].some(k => b[k] > a[k]), id + " lv" + lv);
    for (const k of visible[id]) assert.ok(b[k] >= a[k], id + " " + k + " 줄어들면 안 됨");
  }
  assert.equal(L.WEAPONS.bubble.tiers[4].rainbow, true, "5단계 물방울은 무지개 방울");
  assert.ok(L.WEAPONS.bubble.tiers[4].pierce > 0, "무지개 방울은 관통");
});

test("단계 차이는 한눈에: 단계마다 색이 바뀌고, 개수가 늘거나 크기가 9% 넘게 커진다", () => {
  assert.equal(L.LV_COLORS.length, L.MAX_LV); assert.equal(new Set(L.LV_COLORS).size, L.MAX_LV, "단계 색은 모두 다르다");
  const count = { bubble: "n", whirl: "n", zap: "chain", shell: "n", light: null, star: "dirs" }, size = { bubble: "size", whirl: "r", zap: null, shell: "size", light: "r", star: "size" };
  for (const id of L.WEAPON_IDS) for (let lv = 2; lv <= 5; lv++) {
    const a = L.WEAPONS[id].tiers[lv - 2], b = L.WEAPONS[id].tiers[lv - 1];
    const more = count[id] && b[count[id]] > a[count[id]], bigger = size[id] && b[size[id]] >= a[size[id]] * 1.09;
    assert.ok(more || bigger, id + " lv" + lv + " 수치만 오르는 단계");
    assert.ok(L.upgradeGain(id, lv).length > 0, id + " lv" + lv + " 배너 글자");
  }
  assert.equal(L.gainText({ kind: "weapon", id: "whirl", from: 1, lv: 2 }), "회오리 물살 2단계! 고리 +1");
  assert.equal(L.gainText({ kind: "weapon", id: "star", from: 0, lv: 1, isNew: true }), "불가사리 표창 장착!");
  assert.equal(L.gainText({ kind: "combo", id: "fall" }), "합체! 방울 폭포");
});

test("문제를 맞힌 순간의 보상: 한 번에 → 화면 안 친구 전부 + 하트 1, 고쳐서 → 가까운 친구만", () => {
  const make = () => {
    const w = E.createWorld({ kid: 1, rng: seeded(9), view: { w: 720, h: 540 } }); w.t = 100;
    for (const [dx, dy] of [[100, 0], [-150, 60], [300, 200], [-330, -240], [600, 0], [0, 500]]) E.spawnEnemy(w, "jelly", { x: w.p.x + dx, y: w.p.y + dy });
    const boss = E.spawnEnemy(w, "boss", { x: w.p.x + 200, y: w.p.y - 100 });
    w.hearts = 1; return { w, boss };
  };
  const A = make(), ra = E.quizBlast(A.w, true);
  assert.equal(ra.n, 4, "화면 안(720x540) 친구 넷"); assert.equal(ra.healed, true); assert.equal(A.w.hearts, 2);
  assert.ok(A.boss.hp > 0 && Math.abs(A.boss.hp - A.boss.max * 0.85) < 1, "대왕은 15%만");
  assert.ok(A.w.orbs.length >= 4, "씻긴 친구는 빛 방울을 남긴다");
  const B = make(), rb = E.quizBlast(B.w, false);
  assert.equal(rb.n, 2, "가까운 친구 둘"); assert.equal(rb.healed, false); assert.equal(B.w.hearts, 1);
  assert.equal(B.w.blasts, 1); assert.equal(B.w.blastWashed, 2);
  const full = make(); full.w.hearts = full.w.maxHearts; assert.equal(E.quizBlast(full.w, true).healed, false, "하트가 가득이면 회복 없음");
});

test("보조 장비는 단조롭게 세지고, 한계가 있다", () => {
  for (let lv = 1; lv <= 5; lv++) {
    const a = L.mods({ prop: lv - 1, magnet: lv - 1, big: lv - 1, quick: lv - 1, heart: lv - 1 }), b = L.mods({ prop: lv, magnet: lv, big: lv, quick: lv, heart: lv });
    assert.ok(b.speed > a.speed && b.magnet > a.magnet && b.area > a.area && b.cool < a.cool && b.hearts >= a.hearts);
  }
  const top = L.mods({ prop: 99, quick: 99, heart: 99 });
  assert.ok(top.speed <= 1.4 && top.cool >= 0.6 && top.hearts <= 3);
  // 큰 방울·빠른 손은 무기 수치에 실제로 반영된다
  assert.ok(L.weaponStats("whirl", 3, false, L.mods({ big: 3 })).r > L.weaponStats("whirl", 3).r);
  assert.ok(L.weaponStats("bubble", 3, false, L.mods({ quick: 3 })).every < L.weaponStats("bubble", 3).every);
  assert.ok(L.loadoutDps({ weapons: { bubble: 3, zap: 2 }, evo: {}, supports: { quick: 2 } }) > L.loadoutDps({ weapons: { bubble: 3, zap: 2 }, evo: {}, supports: {} }));
});

test("적 곡선: 시간에 따라 많아지고 단단해지고 빨라지되 상한이 있다", () => {
  for (let t = 1; t < L.BOSS_AT; t++) {
    assert.ok(L.spawnRate(t) >= L.spawnRate(t - 1), "spawn " + t);
    assert.ok(L.hpMul(t) >= L.hpMul(t - 1), "hp " + t);
    assert.ok(L.speedMul(t) >= L.speedMul(t - 1), "speed " + t);
  }
  assert.ok(L.spawnRate(0) > 0.3 && L.spawnRate(0) < 1, "처음엔 천천히");
  assert.ok(L.spawnRate(239) < 3, "1초에 3마리 안쪽");
  assert.ok(L.spawnRate(250) < L.spawnRate(239), "대왕이 나오면 졸개는 줄어든다");
  assert.ok(L.hpMul(1e4) <= 4, "체력 배수 상한");
  assert.ok(L.speedMul(1e4) <= 1.4, "속도 배수 상한");
  // 친구별로 나오는 때가 지켜진다
  for (const [k, from] of Object.entries({ crab: 40, jelly: 80, puffer: 130 })) {
    assert.equal(k in L.enemyMix(from - 1), false, k); assert.equal(k in L.enemyMix(from), true, k);
  }
  assert.equal("eel" in L.enemyMix(299), false, "곰치는 섞는 표가 아니라 경고 뒤 따로 나온다");
  // 쫓아오는 친구는 늘 잠수정보다 느리다(복어 부풀기 1.9배까지 포함해 기본 속도로는 못 따라잡게)
  for (let i = 0; i < 4; i++) for (const k of ["inkfish", "crab", "jelly", "puffer"]) assert.ok(L.enemySpeed(k, 300, L.tuning(i)) < L.SUB_SPEED * 0.6, k + " " + i);
  assert.ok(L.bossHp(L.zoneOf("cave")) > L.bossHp(L.zoneOf("wreck")) && L.bossHp(L.zoneOf("wreck")) > L.bossHp(L.zoneOf("coral")));
});

test("경험치 곡선: ? 진주가 갈수록 조금씩 멀어지고, 한 판에 10~14번쯤", () => {
  for (let n = 1; n < 30; n++) assert.ok(L.xpNeed(n) > L.xpNeed(n - 1));
  assert.ok(L.xpNeed(0) <= 8, "첫 진주는 금방");
  assert.ok(L.xpNeedFor(0, true) < L.xpNeed(0) && L.xpNeedFor(1, true) === L.xpNeed(1));
  assert.equal(L.pearlsFor(0), 0); assert.equal(L.pearlsFor(L.xpNeed(0)), 1);
  // 잘하는 판의 빛 방울 양(구해 준 친구 ~310마리, 평균 값 ~1.5)이면 10~14개
  const p = L.pearlsFor(310 * 1.5);
  assert.ok(p >= 10 && p <= 14, "pearls " + p);
});

test("아이별 난이도: 어릴수록 쉽고, 태오는 하트 4·끌림 1.6배·곰치 없음·카드 2장", () => {
  const T = L.PILOT_TUNING;
  assert.equal(T.length, 4);
  for (let i = 1; i < 4; i++) { assert.ok(T[i].speed <= T[i - 1].speed); assert.ok(T[i].hp <= T[i - 1].hp); assert.ok(T[i].hearts >= T[i - 1].hearts); assert.ok(T[i].magnet >= T[i - 1].magnet); }
  assert.deepEqual([T[0].speed, T[0].hp], [1.15, 1.3]);
  assert.deepEqual([T[3].speed, T[3].hp, T[3].hearts, T[3].magnet, T[3].eel, T[3].cards], [0.7, 0.6, 4, 1.6, false, 2]);
  assert.equal(L.tuning(99), T[1]);
  // 태오 판에는 곰치가 나오지 않는다
  const w = E.createWorld({ kid: 3, rng: seeded(5) }); w.t = 200;
  for (let i = 0; i < 400; i++) E.stepWorld(w, 0.05, { x: 0, y: 0 }), (w.pending = null), (w.hearts = 9);
  assert.equal(w.warns.length + w.enemies.filter(e => e.kind === "eel").length, 0);
  assert.equal(L.PILOTS.map(p => p.name).join(","), "윤찬,재이,윤건,태오");
});

test("카드 뽑기: 중복 없음, 최대 종수, 태오 2장+추천, 고쳐 맞히면 2장·희귀 없음", () => {
  const rng = seeded(11);
  for (let i = 0; i < 300; i++) {
    const cards = L.drawCards(L.newLoadout(), { count: 3, rng });
    assert.equal(cards.length, 3);
    assert.equal(new Set(cards.map(c => c.kind + c.id)).size, 3, "중복 없음");
    assert.ok(cards.some(c => c.kind === "weapon"), "무기 카드는 꼭 하나");
  }
  // 무기 4종·보조 3종이 꽉 차면 새 종류는 안 나온다
  const full = { weapons: { bubble: 2, whirl: 1, zap: 1, star: 1 }, evo: {}, supports: { prop: 1, magnet: 1, quick: 1 } };
  for (let i = 0; i < 200; i++) for (const c of L.drawCards(full, { count: 3, rng })) {
    if (c.kind === "weapon") assert.ok(c.id in full.weapons, "새 무기 금지 " + c.id);
    if (c.kind === "support") assert.ok(c.id in full.supports, "새 보조 금지 " + c.id);
  }
  // 태오: 2장, 그중 한 장 추천
  const t = L.drawCards(L.newLoadout(), { count: L.tuning(3).cards, recommend: true, rng });
  assert.equal(t.length, 2); assert.equal(t.filter(c => c.recommend).length, 1);
  // 합체: 5단계+짝 보조면 한 번에 맞혔을 때 반드시 뜨고, 고쳐 맞히면 안 뜬다
  const ready = { weapons: { bubble: 5 }, evo: {}, supports: { quick: 1 } };
  assert.ok(L.drawCards(ready, { count: 3, rng }).some(c => c.kind === "combo" && c.id === "fall"));
  assert.ok(!L.drawCards(ready, { count: 2, low: true, rng }).some(c => c.kind === "combo"));
  assert.equal(L.drawCards(ready, { count: 2, low: true, rng }).length, 2);
  // 합체를 고른 뒤에는 다시 안 뜬다
  const evo = L.applyCard(ready, { kind: "combo", id: "fall" });
  assert.equal(evo.evo.bubble, true);
  assert.ok(!L.cardOptions(evo).some(c => c.kind === "combo"));
  // 콤보 진주(3연속): 반짝 카드(두 단계) 하나가 섞인다
  const rare = L.drawCards({ weapons: { bubble: 2 }, evo: {}, supports: {} }, { count: 3, rare: true, rng });
  assert.equal(rare.filter(c => c.rare).length, 1); assert.equal(rare.find(c => c.rare).lv, 4);
  // 5단계를 넘지 않는다, 다 채우면 하트·진주 카드로 채운다
  const maxed = { weapons: { bubble: 5, whirl: 5, zap: 5, star: 5 }, evo: { bubble: true, whirl: true }, supports: { prop: 5, magnet: 5, quick: 5 } };
  const m = L.drawCards(maxed, { count: 3, rng });
  assert.equal(m.length, 2); assert.deepEqual(m.map(c => c.kind).sort(), ["gem", "heal"]);
  assert.equal(L.applyCard({ weapons: { bubble: 4 }, evo: {}, supports: {} }, { kind: "weapon", id: "bubble", lv: 6 }).weapons.bubble, 5);
  // 화면 글자에 "별빛"이 없다
  const all = [...Object.values(L.WEAPONS), ...Object.values(L.SUPPORTS), ...Object.values(L.COMBOS), ...Object.values(L.ENEMIES), ...L.ZONES, ...L.GIFTS].flatMap(o => [o.name, o.say, o.ok].filter(Boolean));
  for (const s of all) assert.ok(!s.includes("별빛"), s);
});

test("저장: 깨진 값은 기본값으로, 진주 누적으로 구역·선물이 열린다", () => {
  for (const bad of [null, undefined, "", "{", "[]", "123", JSON.stringify({ pearls: -5, dex: "x", best: 3 })]) {
    const s = L.normalizeSave(bad);
    assert.equal(s.pearls, 0); assert.deepEqual(s.zones, ["coral"]); assert.equal(s.dex.inkfish, 0); assert.equal(s.best.taeo.time, 0);
  }
  const s = L.normalizeSave({ pearls: "45.7", zones: ["cave"], zone: "cave", dex: { crab: 3, eel: "2", nope: 9 }, best: { jaei: { time: 9999, solved: 4 } } });
  assert.equal(s.pearls, 45); assert.deepEqual(s.zones, ["coral", "wreck"], "구역은 진주로 다시 계산"); assert.equal(s.zone, "coral");
  assert.equal(s.dex.crab, 3); assert.equal(s.dex.eel, 2); assert.equal("nope" in s.dex, false); assert.equal(s.best.jaei.time, L.RUN_TIME);
  assert.deepEqual(L.openGifts(20), ["support"]); assert.deepEqual(L.openGifts(160), ["support", "quickpearl", "weapon", "rescue3"]);
  assert.deepEqual(L.openZones(120), ["coral", "wreck", "cave"]);
  // 판 결과 더하기
  const r = L.applyRun(L.defaultSave(), { kid: "jaei", time: 300, solved: 10, rescued: 305, dex: { inkfish: 200, crab: 105, boss: 1 }, result: "boss" });
  assert.equal(r.pearls, 30 + 20 + 10); assert.equal(r.save.pearls, 60); assert.deepEqual(r.newZones, ["wreck"]); assert.deepEqual(r.newGifts, ["support", "quickpearl"]);
  assert.equal(r.save.bossRescued, 1); assert.equal(r.save.best.jaei.wins, 1); assert.ok(r.newFriends.includes("crab"));
  assert.equal(L.runPearls({ rescued: 50, solved: 0, result: "escape" }), 9);
  assert.equal(L.runPearls({ rescued: 50, solved: 0, result: "tired" }), 5);
  assert.deepEqual(L.normalizeSave(JSON.stringify(r.save)), r.save, "저장→읽기 왕복");
});

test("엔진: 하트 0 → 구조(한 번) → 두 번째엔 끝, 문제 뒤 무적, 시간은 dt 누적", () => {
  const w = E.createWorld({ kid: 1, rng: seeded(3) });
  E.stepWorld(w, 0.5); E.stepWorld(w, 0.25);
  assert.equal(w.t, 0.75);
  w.hearts = 1; E.hurt(w);
  assert.equal(w.pending, "rescue");
  const t = w.t; E.stepWorld(w, 1); assert.equal(w.t, t, "멈춘 동안 시간이 안 간다");
  E.revive(w); assert.equal(w.hearts, 2); assert.ok(w.p.inv >= L.RESUME_INV - 1e-9); assert.equal(w.rescueUsed, true);
  w.p.inv = 0; w.hearts = 1; E.hurt(w); assert.equal(w.over.result, "tired");
  // 300초가 지나면 대왕이 있으면 도망, 없으면 성공
  const w2 = E.createWorld({ kid: 1, rng: seeded(4) }); w2.t = L.RUN_TIME - 0.01; w2.bossSpawned = true; w2.boss = { kind: "boss" };
  E.stepWorld(w2, 0.05); assert.equal(w2.over.result, "escape");
  // ? 진주는 최대 2개까지 쌓이고, 막대는 가득 찬 채 기다린다
  const w3 = E.createWorld({ kid: 1, rng: seeded(5) });
  E.gainXp(w3, 10000); assert.equal(w3.qpearls.length, L.MAX_QPEARLS); assert.equal(w3.xp, E.xpGoal(w3));
  // 상한: 적 60, 빛 방울 150
  const w4 = E.createWorld({ kid: 1, rng: seeded(6) });
  for (let i = 0; i < 90; i++) E.spawnEnemy(w4, "jelly");
  assert.equal(w4.enemies.length, L.MAX_ENEMIES);
  w4.p.x = 100; w4.p.y = 100;
  for (let i = 0; i < 300; i++) { const e = E.spawnEnemy(w4, "inkfish", { x: 900 + (i % 30) * 25, y: 300 + Math.floor(i / 30) * 60 }); E.damage(w4, e, 1e6); }
  assert.ok(w4.orbs.length <= L.MAX_ORBS, "빛 방울 상한 " + w4.orbs.length);
  assert.equal(w4.rescued, 300);
});

test("균형 시뮬레이션 (가)~(라)", { timeout: 240000 }, () => {
  const S = 8;
  const none = summary({ kid: 1, policy: "none" }, S), all = summary({ kid: 1, policy: "all" }, S), half = summary({ kid: 1, policy: "half" }, S), taeo = summary({ kid: 3, policy: "half" }, S);
  const line = (n, r) => console.log("  " + n, JSON.stringify({ success: r.success, bossWashed: r.bossWashed, time: r.time, firstHurt: r.firstHurtMedian, pearls: r.pearls, dps: r.dps }));
  line("(가) 재이·문제 안 풂", none); line("(나) 재이·다 맞힘  ", all); line("(다) 재이·절반     ", half); line("(라) 태오·절반     ", taeo);
  // (가) 안 풀면 180초 전후로 버거워진다(첫 다침 120~200초, 성공 거의 없음)
  assert.ok(none.firstHurtMedian >= 110 && none.firstHurtMedian <= 210, "가 첫 다침 " + none.firstHurtMedian);
  assert.ok(none.time >= 140 && none.time <= 240, "가 버틴 시간 " + none.time);
  assert.ok(none.success <= 0.25, "가 성공률 " + none.success);
  // (나) 다 맞히면 무난히 성공
  assert.ok(all.success >= 0.85, "나 성공률 " + all.success);
  // (다) 절반도 성공 가능
  assert.ok(half.success >= 0.4, "다 성공률 " + half.success);
  // (라) 태오 설정에서는 절반이 더 쉽다
  assert.ok(taeo.success >= half.success && taeo.success >= 0.75, "라 성공률 " + taeo.success);
  assert.ok(taeo.hurts <= half.hurts);
  // 풀수록 확실히 유리: 다 맞히는 아이와 안 푸는 아이의 버틴 시간 차이
  assert.ok(all.time - none.time >= 80, "차이 " + (all.time - none.time));
  // 진주는 한 판에 10~14번쯤(다 맞히는 아이 기준)
  assert.ok(all.pearls >= 9.5 && all.pearls <= 14.5, "진주 " + all.pearls);
});
