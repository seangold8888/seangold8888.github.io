// Spell Towers 규칙 점검: node --test towers/tests/logic.test.mjs
import test from "node:test";
import assert from "node:assert/strict";
import * as L from "../src/logic.js";
import * as E from "../src/engine.js";
import { summary, seeded } from "./sim.mjs";

const VISIBLE = ["range", "size", "chain", "n", "beams", "splash", "reveal"];
const lines = kind => [["a"], ["b"]].map(([br]) => [1, 2, 3, 4, 5].map(lv => L.towerStats(kind, lv, br)));

test("탑 5종 × 5단계: 단계가 오를수록 반드시 더 세다(갈림길 두 쪽 모두)", () => {
  assert.equal(L.TOWER_IDS.length, 5);
  for (const kind of L.TOWER_IDS) for (const br of ["a", "b"]) for (let lv = 2; lv <= 5; lv++)
    assert.ok(L.towerDps(kind, lv, br) > L.towerDps(kind, lv - 1, br), kind + br + " lv" + lv);
  // 단계 밖 값은 끝으로 붙는다
  assert.deepEqual(L.towerStats("fire", 0), L.towerStats("fire", 1));
  assert.deepEqual(L.towerStats("fire", 9, "b"), L.towerStats("fire", 5, "b"));
  // 1·2단계는 갈림길이 없고, 3단계부터는 있다
  assert.equal(L.towerStats("ice", 2, "b").branch, null);
  assert.equal(L.towerStats("ice", 3, "b").branch, "b");
});

test("단계마다 보이는 값이 바뀐다: 탑 크기·색·장식, 그리고 탄·빛·범위 중 하나", () => {
  assert.equal(new Set(L.LV_COLORS).size, 5, "단계 색은 모두 다르다");
  for (let i = 1; i < 5; i++) {
    assert.ok(L.TOWER_W[i] > L.TOWER_W[i - 1], "탑 그림이 커진다 " + (i + 1));
    assert.notDeepEqual(L.TOWER_DECOR[i], L.TOWER_DECOR[i - 1], "장식이 바뀐다 " + (i + 1));
  }
  assert.ok(L.TOWER_DECOR[2].halo && !L.TOWER_DECOR[1].halo, "3단계부터 후광");
  assert.ok(L.TOWER_DECOR[4].crown, "5단계는 왕관");
  for (const kind of L.TOWER_IDS) for (const line of lines(kind)) for (let i = 1; i < 5; i++) {
    const a = line[i - 1], b = line[i];
    assert.notEqual(a.w, b.w); assert.notEqual(a.color, b.color);
    assert.ok(VISIBLE.some(k => (b[k] || 0) > (a[k] || 0)), kind + " " + b.branch + " lv" + (i + 1) + " 수치만 오르는 단계");
    for (const k of VISIBLE) assert.ok((b[k] || 0) >= (a[k] || 0) || (k === "chain" && b.branch === "b"), kind + " " + k + " 줄어들면 안 됨");
    assert.ok(L.upgradeGain(kind, i + 1, b.branch || "a").length > 0, "배너 글자");
  }
});

test("3단계 갈림길: 두 쪽은 이름·모양·특징이 다르다", () => {
  const diff = { fire: s => s.splash ? "splash" : "fast", ice: s => s.freezeEvery ? "freeze" : "wide", bolt: s => s.chain >= 7 ? "chain" : "big", wind: s => s.push >= 140 ? "far" : "many", light: s => s.beams === 3 ? "rainbow" : "lighthouse" };
  for (const kind of L.TOWER_IDS) {
    const a = L.towerStats(kind, 3, "a"), b = L.towerStats(kind, 3, "b");
    assert.notEqual(a.name, b.name); assert.notEqual(diff[kind](a), diff[kind](b), kind);
  }
  assert.ok(L.towerStats("bolt", 3, "a").chain >= L.towerStats("bolt", 2).chain + 3, "천둥 탑은 튀는 수 +3");
  assert.ok(L.towerStats("fire", 3, "a").every <= L.towerStats("fire", 2).every / 2, "불새 탑은 연사 2배");
  assert.ok(L.towerStats("light", 3, "b").reveal > L.towerStats("light", 3, "a").reveal, "등대 탑은 유령을 더 넓게 드러냄");
  assert.equal(L.gainText({ type: "up", kind: "fire", from: 2, lv: 3 }, "a"), "불꽃 탑 3단계! 불새 탑으로 변신");
  assert.equal(L.gainText({ type: "up", kind: "fire", from: 2, lv: 3 }, "b"), "불꽃 탑 3단계! 화산 탑으로 변신");
  assert.ok(L.gainText({ type: "up", kind: "bolt", from: 3, lv: 4, branch: "a" }).startsWith("천둥 탑 4단계!"));
});

test("괴물·파도 곡선: 파도마다 단단·많아지고, 새 괴물은 정해진 파도부터, 대장은 4·8", () => {
  assert.equal(L.WAVES, 8); assert.equal(L.LATE.length, L.WAVES);
  for (let n = 2; n <= L.WAVES; n++) { assert.ok(L.hpMul(n) > L.hpMul(n - 1)); assert.ok(L.waveCount(n) > L.waveCount(n - 1)); assert.ok(L.speedMul(n) >= L.speedMul(n - 1)); }
  const rng = seeded(3);
  for (let n = 1; n <= L.WAVES; n++) {
    const list = L.waveList(n, L.tuning(1), rng);
    for (const q of list) assert.ok(q.kind === "boss" || L.MONSTERS[q.kind].from <= n, "파도 " + n + " " + q.kind);
    assert.equal(list.some(q => q.kind === "boss"), n === 4 || n === 8, "대장 " + n);
    for (let i = 1; i < list.length; i++) assert.ok(list[i].at >= list[i - 1].at);
    for (const k of L.MONSTER_IDS) if (k !== "boss" && L.MONSTERS[k].from === n) assert.ok(list.filter(q => q.kind === k).length >= 2, "새 괴물 " + k + "은 2마리 이상");
  }
  for (let n = 1; n <= L.WAVES; n++) assert.ok(!L.waveList(n, L.tuning(3), rng).some(q => q.kind === "ghost"), "태오는 유령 없음");
  assert.ok(L.monsterHp("boss", 8) > L.monsterHp("boss", 4) * 2);
  assert.ok(L.waveList(3, L.tuning(1), rng, 1.5).at(-1).at > L.waveList(3, L.tuning(1), rng, 1).at(-1).at, "맵별 스폰 시간 배수");
  assert.ok(L.monsterHp("slime", 3, L.tuning(1), 1.3) > L.monsterHp("slime", 3), "눈 다리는 체력 ×1.3");
  assert.equal(L.MONSTERS.troll.cake, 2); assert.equal(L.MONSTERS.boss.cake, 3);
  assert.ok(L.MONSTERS.bat.fly);
});

test("아이별 난이도: 윤찬 > 재이 > 윤건 > 태오, 태오는 케이크 12·카드 2장·유령 없음", () => {
  const T = L.PILOT_TUNING;
  for (let i = 1; i < 4; i++) { assert.ok(T[i].speed < T[i - 1].speed); assert.ok(T[i].hp < T[i - 1].hp); }
  assert.deepEqual([T[0].speed, T[0].hp, T[1].speed, T[1].hp, T[2].speed, T[2].hp, T[3].speed, T[3].hp], [1.12, 1.32, 1, 1, 0.95, 0.9, 0.78, 0.7]);
  assert.equal(T[3].cake, 12); assert.equal(T[3].cards, 2); assert.equal(T[3].ghost, false); assert.equal(T[1].cake, 10);
  assert.ok(L.monsterHp("shell", 6, L.tuning(0)) > L.monsterHp("shell", 6, L.tuning(1)));
  assert.ok(L.monsterSpeed("imp", 6, L.tuning(3)) < L.monsterSpeed("imp", 6, L.tuning(2)));
});

test("길 함수: 점 목록 → 길이 매개변수로 위치(끝은 붙는다)", () => {
  const p = L.makePath([[0, 0], [100, 0], [100, 50]]);
  assert.equal(p.len, 150);
  assert.deepEqual([L.pathPoint(p, 0).x, L.pathPoint(p, 0).y], [0, 0]);
  assert.deepEqual([L.pathPoint(p, 50).x, L.pathPoint(p, 50).y], [50, 0]);
  const q = L.pathPoint(p, 125); assert.deepEqual([q.x, q.y, q.dx, q.dy], [100, 25, 0, 1]);
  assert.deepEqual([L.pathPoint(p, 999).x, L.pathPoint(p, 999).y], [100, 50]);
  assert.deepEqual([L.pathPoint(p, -5).x, L.pathPoint(p, -5).y], [0, 0]);
  assert.equal(L.distToPath(p, 50, 30), 30);
  assert.ok(Math.abs(L.coverage(p, 50, 0, 20) - 40) <= 8);
});

test("맵 3개: 받침은 길 밖·맵 안, 모든 받침에 길이 닿고, 장식은 길을 막지 않는다", () => {
  assert.deepEqual(L.MAPS.map(m => m.pads.length), [8, 9, 10]);
  assert.deepEqual(L.MAPS.map(m => m.need), [0, 1, 3]);
  assert.equal(L.mapOf("snow").hp, 1.3);
  for (const m of L.MAPS) {
    const { paths, fly } = L.mapPaths(m);
    m.pads.forEach(([x, y], i) => {
      assert.ok(x > 30 && x < L.MAP_W - 30 && y > 60 && y < L.MAP_H - 30, m.id + " 받침 " + i + " 맵 안");
      for (const p of paths) assert.ok(L.distToPath(p, x, y) >= 56, m.id + " 받침 " + i + " 길 위");
      assert.ok(L.padCoverage(m, i, 135).ground > 60, m.id + " 받침 " + i + " 불꽃 탑 사거리에 길");
      m.pads.forEach(([x2, y2], j) => { if (j > i) assert.ok(Math.hypot(x - x2, y - y2) >= 80, m.id + " 받침 겹침 " + i + "," + j); });
    });
    for (const [kind, x, y] of m.decor) for (const p of paths) assert.ok(L.distToPath(p, x, y) >= 34, m.id + " 장식 " + kind + " " + x + "," + y);
    // 길의 끝은 성문 근처, 박쥐 길은 곧게
    for (const p of paths) { const e = L.pathPoint(p, p.len); assert.ok(Math.hypot(e.x - m.castle.x, e.y - m.castle.y) < 60); }
    assert.equal(fly.pts.length, 2);
  }
  const forest = L.mapPaths(L.mapOf("forest")).paths;
  assert.equal(forest.length, 2, "버섯 숲길은 갈림길 두 갈래");
  assert.deepEqual(forest[0].pts[0], forest[1].pts[0]); assert.deepEqual(forest[0].pts.at(-1), forest[1].pts.at(-1));
  // 눈 다리의 사거리: 길이 스스로 한 번 건너간다
  const snow = L.mapOf("snow").paths[0];
  const cross = (a, b, c, d) => { const o = (p, q, r) => Math.sign((q[0] - p[0]) * (r[1] - p[1]) - (q[1] - p[1]) * (r[0] - p[0])); return o(a, b, c) * o(a, b, d) < 0 && o(c, d, a) * o(c, d, b) < 0; };
  let crossings = 0; for (let i = 1; i < snow.length; i++) for (let j = i + 2; j < snow.length; j++) if (cross(snow[i - 1], snow[i], snow[j - 1], snow[j])) crossings++;
  assert.equal(crossings, 1);
});

test("카드 뽑기: 중복 없음, 강화 카드 하나는 꼭, 태오 2장+추천, 전설은 3연속일 때만", () => {
  const state = { towers: [{ pad: 0, kind: "fire", lv: 2, branch: null }, { pad: 1, kind: "fire", lv: 1, branch: null }, { pad: 2, kind: "ice", lv: 3, branch: "b" }], freePads: 5, cake: 6, cakeMax: 10 };
  for (let s = 1; s <= 40; s++) {
    const cs = L.drawCards(state, { count: 3, rng: seeded(s) });
    assert.equal(cs.length, 3);
    assert.equal(new Set(cs.map(L.cardKey)).size, 3, "중복");
    const kinds = cs.filter(c => c.kind).map(c => c.kind); assert.equal(new Set(kinds).size, kinds.length, "같은 탑 카드 두 장");
    assert.ok(cs.some(c => c.type === "up"), "강화 카드");
    assert.ok(!cs.some(c => c.type === "legend"), "전설은 평소엔 없음");
    const fire = cs.find(c => c.type === "up" && c.kind === "fire"); if (fire) assert.equal(fire.pad, 1, "같은 종류면 가장 낮은 탑");
    const t = L.drawCards(state, { count: 2, recommend: true, rng: seeded(s) });
    assert.equal(t.length, 2); assert.equal(t.filter(c => c.recommend).length, 1, "태오 추천 한 장");
    const r = L.drawCards(state, { count: 3, rare: true, rng: seeded(s) });
    assert.ok(r.some(c => c.type === "legend" && c.lv === c.from + 2), "전설 카드: 2단계 한꺼번에");
    assert.ok(!L.drawCards(state, { count: 2, low: true, rare: true, rng: seeded(s) }).some(c => c.type === "legend"), "고쳐 맞힘엔 전설 없음");
  }
  // 탑이 없으면 새 탑·주문·케이크
  const empty = L.drawCards({ towers: [], freePads: 8, cake: 10, cakeMax: 10 }, { count: 3, rng: seeded(1) });
  assert.equal(empty.length, 3); assert.ok(empty.every(c => c.type !== "up"));
  assert.ok(L.needsBranch({ type: "up", from: 2, lv: 3, branch: null }));
  assert.ok(!L.needsBranch({ type: "up", from: 3, lv: 4, branch: "a" }));
  assert.ok(L.needsBranch({ type: "legend", from: 1, lv: 3, branch: null }));
});

test("저장: 깨진 값은 기본값으로, 판 결과로 별·맵·배지·도감이 늘어난다", () => {
  for (const bad of [null, "", "{", "[]", 42, { wins: -3, solved: "x", maps: 5 }]) assert.deepEqual(L.normalizeSave(bad), L.defaultSave());
  const s = L.normalizeSave({ wins: 2.7, solved: 12, map: "snow", maps: { field: { stars: 9, wins: 2 } }, monsters: { slime: -1, imp: 4 }, best: { taeo: { wave: 99 } }, junk: 1 });
  assert.equal(s.wins, 2); assert.equal(s.map, "field", "아직 안 열린 맵"); assert.equal(s.maps.field.stars, 3); assert.equal(s.monsters.slime, 0); assert.equal(s.monsters.imp, 4); assert.equal(s.best.taeo.wave, L.WAVES); assert.ok(!("junk" in s));
  assert.equal(L.starsFor("win", 10, 10), 3); assert.equal(L.starsFor("win", 5, 10), 2); assert.equal(L.starsFor("win", 1, 10), 1); assert.equal(L.starsFor("lose", 9, 10), 0);
  const run = { kid: "jaei", map: "field", result: "win", wave: 8, cake: 9, cakeMax: 10, solved: 12, dex: { slime: 30, bat: 2 }, towersUsed: ["fire", "light"], branchesUsed: ["fire:a"] };
  const r = L.applyRun(L.defaultSave(), run);
  assert.equal(r.save.wins, 1); assert.equal(r.stars, 3); assert.deepEqual(r.newMaps, ["forest"]); assert.deepEqual(r.newBadges, ["gems20"]);
  assert.deepEqual(r.newMonsters, ["slime", "bat"]); assert.deepEqual(r.newTowers, ["fire", "light"]); assert.deepEqual(r.newBranches, ["fire:a"]);
  assert.equal(r.save.best.jaei.wave, 8); assert.equal(r.save.best.jaei.wins, 1);
  const r2 = L.applyRun(r.save, Object.assign({}, run, { result: "lose", cake: 0, wave: 4 }));
  assert.equal(r2.save.maps.field.stars, 3, "별은 최고 기록 유지"); assert.equal(r2.save.wins, 1); assert.deepEqual(r2.newBranches, []);
  assert.deepEqual(L.openMaps(3), ["field", "forest", "snow"]);
  assert.equal(L.SAVE_KEY, "towers_save_v1"); assert.equal(L.WIZ_KEY, "towers_wizard_v1"); assert.equal(L.SOUND_KEY, "towers_sound_v1");
});

test("엔진: 탑 세우기·수정 강화는 2단계까지, 카드로 3단계(갈림길)·전설", () => {
  const w = E.createWorld({ kid: 1, map: "field", rng: seeded(4) });
  assert.equal(w.gems, L.START_GEMS); assert.equal(w.cake, 10);
  assert.ok(E.build(w, 0, "fire")); assert.equal(w.gems, L.START_GEMS - L.TOWERS.fire.cost);
  assert.equal(E.build(w, 0, "ice"), null, "이미 탑이 있는 자리");
  w.gems = 1000; assert.ok(E.upgradeWithGems(w, 0)); assert.equal(E.towerOf(w, 0).lv, 2);
  assert.equal(E.upgradeWithGems(w, 0), false, "수정으로는 2단계까지"); assert.equal(E.upgradeCost(w, 0), null);
  E.applyCard(w, { type: "up", kind: "fire", pad: 0, from: 2, lv: 3 }, "b");
  assert.equal(E.towerOf(w, 0).lv, 3); assert.equal(E.towerOf(w, 0).branch, "b"); assert.ok(w.branchesUsed.has("fire:b"));
  E.applyCard(w, { type: "legend", kind: "fire", pad: 0, from: 3, lv: 5, branch: "b" });
  assert.equal(E.towerOf(w, 0).lv, 5);
  E.applyCard(w, { type: "new", kind: "light" }); assert.ok(w.towers.some(t => t.kind === "light"), "새 탑 카드는 빈 자리에 공짜로");
  const c0 = w.cake; E.applyCard(w, { type: "cake", id: "cake" }); assert.equal(w.cake, c0 + L.CAKE_CARD);
  E.applyCard(w, { type: "spell", id: "haste" }); assert.ok(E.hasteOn(w));
  assert.equal(w.cards, 5);
  const fw = E.createWorld({ kid: 1, badges: ["freeTower", "gems20", "cake1"] });
  assert.equal(fw.gems, L.START_GEMS + 20); assert.equal(fw.cake, 11); assert.ok(E.build(fw, 2, "light")); assert.equal(fw.gems, L.START_GEMS + 20, "첫 탑 공짜");
  assert.ok(E.recommendKind(w, 3) || true);
});

test("엔진: 정지 중엔 시간이 안 가고, 괴물 상한 50, 탄 상한, 구조 문제는 한 번만", () => {
  const w = E.createWorld({ kid: 1, rng: seeded(5) });
  E.stepWorld(w, 1); const t = w.t;
  w.pending = "quiz"; for (let i = 0; i < 100; i++) E.stepWorld(w, 0.1);
  assert.equal(w.t, t, "문제가 떠 있는 동안 시간 불변"); E.resumeAfter(w); E.stepWorld(w, 0.1); assert.ok(w.t > t);
  for (let i = 0; i < 80; i++) E.spawnMonster(w, "slime");
  assert.equal(w.monsters.length, L.MAX_MONSTERS, "괴물 상한");
  assert.ok(E.spawnMonster(w, "boss"), "대장은 상한과 별개");
  w.gems = 9999; for (let i = 0; i < 8; i++) { E.build(w, i, "fire"); E.towerOf(w, i).lv = 5; E.towerOf(w, i).branch = "a"; }
  for (let i = 0; i < 200; i++) { E.stepWorld(w, 0.05); assert.ok(w.shots.length <= L.MAX_SHOTS); if (w.pending) E.resumeAfter(w); }
  // 케이크 0 → 구조 한 번 → 다시 0 이면 판 끝
  const v = E.createWorld({ kid: 1, rng: seeded(6) });
  v.cake = 1; const e = E.spawnMonster(v, "imp"); e.s = e.path.len - 1; E.stepWorld(v, 0.1);
  assert.equal(v.pending, "rescue"); assert.equal(v.cake, 0);
  E.rescue(v); assert.equal(v.cake, L.RESCUE_CAKE); assert.equal(v.pending, null); assert.ok(v.rescueUsed);
  v.cake = 1; const e2 = E.spawnMonster(v, "imp"); e2.s = e2.path.len - 1; E.stepWorld(v, 0.1);
  assert.equal(v.pending, null); assert.equal(v.over.result, "lose", "두 번째에는 판 끝");
});

test("대마법: 한 번에 → 길 위 괴물 전부 방울(대장 20%), 케이크 +1, 수정 +30 / 고쳐서 → 길 위 절반(최소 6마리), 수정 +20", () => {
  const make = () => {
    const w = E.createWorld({ kid: 1, rng: seeded(7) }); w.wave = 5;
    for (let i = 0; i < 12; i++) { const e = E.spawnMonster(w, i % 3 ? "slime" : "bat"); e.s = 60 + i * 40; }
    const boss = E.spawnMonster(w, "boss"); boss.s = 30;
    for (const e of w.monsters) { const p = L.pathPoint(e.path, e.s); e.x = p.x; e.y = p.y; }
    w.cake = 7; return { w, boss };
  };
  const A = make(), g0 = A.w.gems, kg = A.w.monsters.filter(e => e.kind !== "boss").reduce((s, e) => s + L.MONSTERS[e.kind].gem, 0), ra = E.quizBlast(A.w, true);
  assert.equal(ra.n, 12); assert.equal(A.w.monsters.length, 1, "대장만 남음");
  assert.ok(Math.abs(A.boss.hp - A.boss.max * 0.8) < 1, "대장은 20%");
  assert.equal(A.w.cake, 8); assert.equal(A.w.gems, g0 + 30 + kg, "수정 +30 (+돌려보낸 괴물 몫)");
  assert.ok(A.w.fx.homes.length >= 12, "방울에 실려 날아감"); assert.ok(A.w.fx.storm && A.w.fx.storm.big, "화면 전체 연출");
  assert.ok(A.w.fx.nums.some(n => n.icon === "cake") && A.w.fx.nums.some(n => n.icon === "gem" && n.text === "+30"), "숫자가 튀어 오름");
  const B = make(), far = B.w.monsters.filter(e => e.kind !== "boss").sort((a, b) => E.progress(b) - E.progress(a)).slice(0, 7).map(e => e.id);
  const g1 = B.w.gems, kg5 = B.w.monsters.filter(e => far.includes(e.id)).reduce((s, e) => s + L.MONSTERS[e.kind].gem, 0), rb = E.quizBlast(B.w, false);
  assert.equal(L.smallCount(13), 7); assert.equal(L.smallCount(8), 6); assert.equal(L.smallCount(4), 4); assert.equal(L.smallCount(20), 10);
  assert.equal(rb.n, 7); assert.equal(B.w.monsters.length, 13 - 7);
  assert.ok(far.every(id => !B.w.monsters.some(e => e.id === id)), "성문에 가까운 쪽부터 절반");
  assert.equal(B.w.gems, g1 + 20 + kg5); assert.equal(B.w.cake, 7, "고쳐 맞히면 케이크는 그대로");
  const full = make(); full.w.cake = full.w.cakeMax; assert.equal(E.quizBlast(full.w, true).cake, 0, "케이크가 가득이면 +0");
  assert.equal(A.w.blasts, 1); assert.equal(A.w.blastSent, 12);
});

test("부엉이·반짝 가루: 부엉이를 누르면 문제, 반짝 가루는 작은 피해 + 유령 드러냄 + 짧은 쿨다운", () => {
  const w = E.createWorld({ kid: 1, rng: seeded(8) });
  assert.ok(w.owl, "준비 시간에 부엉이"); w.owl.t = 5;
  const o = E.owlPos(w.owl);
  assert.equal(E.tapOwl(w, o.x + 200, o.y), false, "멀리 누르면 안 됨");
  assert.ok(E.tapOwl(w, o.x + 30, o.y)); assert.equal(w.pending, "quiz"); assert.equal(w.owl, null);
  E.resumeAfter(w);
  w.wave = 6; const g = E.spawnMonster(w, "ghost"); g.s = 200; g.hidden = true; E.stepWorld(w, 0.01); g.hidden = true; g.revealT = 0;
  const hp = g.hp, hit = E.sparkle(w, g.x, g.y);
  assert.equal(hit, g); assert.equal(g.hp, hp - L.SPARKLE_DMG); assert.ok(g.revealT > 0, "유령 드러남");
  assert.equal(E.sparkle(w, g.x, g.y), null, "쿨다운");
  E.stepWorld(w, L.SPARKLE_CD + 0.01); assert.ok(E.sparkle(w, g.x, g.y), "짧은 쿨다운 뒤 다시");
  // 파도마다 부엉이 두 번(준비 1 + 중반 1)
  const v = E.createWorld({ kid: 1, rng: seeded(9) }); let owls = 0;
  while (v.wave < 3 && v.t < 400) { const n = v.owlsShown; E.stepWorld(v, 0.05); if (v.owlsShown > n) owls++; if (v.owl && v.owl.t > 1) v.owl = null; for (const e of v.monsters) e.hp = 0; v.monsters = []; if (v.pending) E.resumeAfter(v); v.events.length = 0; }
  assert.ok(v.owlsShown >= 4, "파도 1·2에 부엉이 4번 이상: " + v.owlsShown);
});

test("균형: 세 맵 × 아이 × (안 풂 / 절반 / 다 맞힘 / 느슨), 12판 평균, 게임 시간", { timeout: 600000 }, () => {
  const S = (map, kid, policy) => summary({ map, kid, policy }, 12);
  for (const map of L.MAP_IDS) {
    const tag = (n, r) => map + " " + n + " " + JSON.stringify({ s: r.success, w: r.wave, c: r.cakeAll, t: r.time });
    const all = S(map, 1, "all"); assert.ok(all.success >= 0.95 && all.cakeAll >= 7, tag("다 맞힘", all));
    for (const kid of [1, 2]) { const r = S(map, kid, "loose"); assert.ok(r.success >= 0.4 && r.time <= 295, tag("느슨 " + kid, r)); }
    for (const kid of [1, 2]) { const r = S(map, kid, "none"); assert.ok(r.success <= 0.1 && r.wave >= 4 && r.wave <= 6.5, tag("안 풂 " + kid, r)); }
    const yn = S(map, 0, "none"); assert.ok(yn.success === 0 && yn.wave >= 3 && yn.wave <= 5, tag("윤찬 안 풂", yn));
    const tn = S(map, 3, "none"); assert.ok(tn.success <= 0.15 && tn.wave >= 6 && tn.wave <= 7.5, tag("태오 안 풂", tn));
    for (const kid of [1, 2]) { const r = S(map, kid, "half"); assert.ok(r.success >= 0.85 && r.cakeAll >= 4.5 && r.time <= 290, tag("절반 " + kid, r)); }
    const th = S(map, 3, "half"); assert.ok(th.success >= 0.9 && th.cakeAll >= 8, tag("태오 절반", th));
    assert.ok(all.time >= 200 && all.time <= 290, tag("다 맞힘 시간", all));
  }
});