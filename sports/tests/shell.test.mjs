// 셸 순수 논리 검사: 청백 편 나누기·메달·점수·저장·종목 등록표 약속·몸짓 감지. node --test sports/tests/*.test.mjs
import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync, existsSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { KIDS, makeTeams } from "../src/kids.js";
import { medalFor, rankResults, teamPoints, winner, cpuScore, betterMedal } from "../src/scoring.js";
import { cleanSave, recordResult, blankSave, loadSave, writeSave, SAVE_KEY } from "../src/save.js";
import { SLOTS, checkEvent, isOpen } from "../src/events/index.js";
import { createReplay } from "../src/replay.js";
import { bodyFrame, createCalibrator, createJumpDetector, createHipCircleDetector, createSwingDetector, createKickDetector, createThrowDetector, LM } from "../src/camera/gestures.js";
import jumprope from "../src/events/jumprope.js";

const here = p => fileURLToPath(new URL(p, import.meta.url));

test("선수 = 재이(청군)·태오(백군) 둘, 허브 GameQuiz id, 난이도 칸 재이 2·태오 0", () => {
  assert.deepEqual(KIDS.map(k => k.id), ["jaei", "taeo"]);
  assert.deepEqual(KIDS.map(k => k.team), ["blue", "white"]);
  assert.deepEqual(KIDS.map(k => k.level), [2, 0]);
});

test("청백 나누기: 둘이면 재이 청 vs 태오 백, 혼자면 다른 아이가 사촌 친구(컴퓨터)로 상대 편", () => {
  const both = makeTeams(["taeo", "jaei"]);
  assert.deepEqual(both.map(p => [p.id, p.team, p.cpu]), [["jaei", "blue", false], ["taeo", "white", false]]);
  const solo = makeTeams(["taeo"]);
  assert.deepEqual(solo.map(p => [p.id, p.team, p.cpu]), [["jaei", "blue", true], ["taeo", "white", false]]);
  const solo2 = makeTeams(["jaei"]);
  assert.deepEqual(solo2.map(p => [p.id, p.cpu]), [["jaei", false], ["taeo", true]]);
  assert.deepEqual(makeTeams(["yunchan", "nobody"]).filter(p => !p.cpu).map(p => p.id), ["jaei"], "모르는 아이는 빼고 기본 재이");
});

test("메달·순위·청백 점수", () => {
  const th = { gold: 100, silver: 60, bronze: 30 };
  assert.equal(medalFor(120, th), "gold"); assert.equal(medalFor(60, th), "silver"); assert.equal(medalFor(29, th), null);
  assert.equal(betterMedal("silver", "gold"), "gold"); assert.equal(betterMedal("gold", null), "gold");
  const res = [
    { id: "taeo", team: "blue", score: 900, medal: "gold", gold: 1000 },     // 0.9
    { id: "yunchan", team: "white", score: 1500, medal: "silver", gold: 2000 }, // 0.75
  ];
  const r = rankResults(res);
  assert.equal(r[0].id, "taeo", "다른 난이도는 기준 대비 점수로 견준다");
  const pts = teamPoints(res);
  assert.deepEqual(pts, { blue: 3 + 1, white: 2 });
  assert.equal(winner({ blue: 4, white: 2 }), "blue"); assert.equal(winner({ blue: 2, white: 2 }), "tie");
  // 컴퓨터 친구 점수는 기준 안에서 다정하게
  let x = 1; const rnd = () => ((x = (x * 16807) % 2147483647) / 2147483647);
  const medals = { gold: 0, silver: 0, bronze: 0, none: 0 };
  for (let i = 0; i < 2000; i++) medals[medalFor(cpuScore(th, rnd), th) || "none"]++;
  assert.ok(medals.gold < 600 && medals.silver > medals.gold && medals.none < 200, JSON.stringify(medals));
});

test("저장: 깨진 값은 버리고 가장 좋은 메달·점수만 남긴다", () => {
  assert.deepEqual(cleanSave("x"), blankSave());
  const s = cleanSave({ kids: ["jaei", 3], medals: [], best: { a: 1 } });
  assert.deepEqual(s.kids, ["jaei"]); assert.deepEqual(s.medals, {});
  recordResult(s, "jumprope", "jaei", 500, "silver");
  const r = recordResult(s, "jumprope", "jaei", 300, "bronze");
  assert.equal(s.medals.jumprope.jaei, "silver"); assert.equal(s.best.jumprope.jaei, 500); assert.equal(r.medalUp, false);
  const store = new Map(); const fake = { getItem: k => store.get(k) ?? null, setItem: (k, v) => store.set(k, v) };
  writeSave(s, fake); assert.ok(store.has(SAVE_KEY)); assert.equal(loadSave(fake).medals.jumprope.jaei, "silver");
  const broken = { getItem: () => { throw new Error("no"); }, setItem: () => { throw new Error("no"); } };
  assert.deepEqual(loadSave(broken), blankSave()); assert.equal(writeSave(s, broken), false);
});

test("종목 등록표: 5칸 모두 열림, 칸마다 load 한 줄 + 칸 사이 빈 줄로 동시 수정이 부딪히지 않게", () => {
  assert.deepEqual(SLOTS.map(s => s.id), ["jumprope", "baseball", "hula", "soccer", "basketball"]);
  assert.ok(SLOTS.every(s => isOpen(s)), "다섯 종목 모두 열림(곧 열려요 없음)");
  const src = readFileSync(here("../src/events/index.js"), "utf8");
  const lf = src.replace(/\r\n/g, "\n");
  // 칸마다 load 는 null(곧 열려요) 이거나 자기 파일 한 줄(import("./<id>.js?v=N")) — 새 칸을 만들 때도 같은 모양
  for (const id of ["baseball", "hula", "soccer", "basketball"]) assert.ok(lf.includes(`{ id: "${id}"`) && new RegExp(`\\{ id: "${id}"[^\\n]*\\n    load: (null|\\(\\) => import\\("\\./${id}\\.js\\?v=\\d+"\\)) \\},\\n\\n`).test(lf), id);
});

test("줄넘기 종목이 약속을 지킨다", () => {
  assert.deepEqual(checkEvent(jumprope, "jumprope"), []);
  assert.equal(jumprope.cameraMode, true); assert.deepEqual(jumprope.gestures, ["jump"]);
  assert.deepEqual(checkEvent({ id: "x", name: "x", icon: "x", start() {}, medals: () => ({ gold: 1, silver: 2, bronze: 3 }) }, "x").length, 4, "메달 순서가 틀리면 걸린다");
  assert.ok(checkEvent(null, "x").length);
});

test("다시 보기 버퍼: 가장 멋진 순간의 앞 2초를 떼어 둔다", () => {
  const rp = createReplay({ seconds: 2, tail: 0.4 });
  for (let i = 0; i < 600; i++) {
    const t = i / 60; rp.push(t, { t });
    if (i === 200) rp.mark(t, 5, "콤보");
    if (i === 300) rp.mark(t, 3, "작은 것");     // 더 작은 순간은 무시
  }
  const c = rp.clip; assert.ok(c); assert.equal(c.label, "콤보");
  assert.ok(Math.abs(c.frames[c.frames.length - 1].t - 2.4) < 0.05, "앞 2초 + 뒤 0.4초");
  assert.ok(Math.abs(c.frames[0].s.t - (200 / 60 - 2)) < 0.05);
});

/* ---------- 몸짓 감지(가짜 관절 흐름) ---------- */
function pose({ hipY = 0.6, hipX = 0.5, torso = 0.2, lw = null, rw = null, la = null, ra = null } = {}) {
  const p = Array.from({ length: 33 }, () => ({ x: 0.5, y: 0.5, visibility: 0.9 }));
  p[LM.lShoulder] = { x: hipX - 0.06, y: hipY - torso, visibility: 1 }; p[LM.rShoulder] = { x: hipX + 0.06, y: hipY - torso, visibility: 1 };
  p[LM.lHip] = { x: hipX - 0.05, y: hipY, visibility: 1 }; p[LM.rHip] = { x: hipX + 0.05, y: hipY, visibility: 1 };
  p[LM.lAnkle] = la || { x: hipX - 0.05, y: hipY + torso * 2, visibility: 1 }; p[LM.rAnkle] = ra || { x: hipX + 0.05, y: hipY + torso * 2, visibility: 1 };
  p[LM.lKnee] = { x: hipX - 0.05, y: hipY + torso, visibility: 1 }; p[LM.rKnee] = { x: hipX + 0.05, y: hipY + torso, visibility: 1 };
  p[LM.lWrist] = lw || { x: hipX - 0.1, y: hipY, visibility: 1 }; p[LM.rWrist] = rw || { x: hipX + 0.1, y: hipY, visibility: 1 };
  return p;
}

test("보정: 가만히 1.2초 서 있으면 기준 완성, 움직이면 다시", () => {
  const c = createCalibrator({ needMs: 1200 });
  let r;
  for (let t = 0; t <= 600; t += 33) r = c.push(bodyFrame(pose()), t);
  assert.equal(r.done, false);
  r = c.push(bodyFrame(pose({ hipY: 0.7 })), 633); assert.equal(r.reason, "move");
  for (let t = 666; t <= 2000; t += 33) r = c.push(bodyFrame(pose({ hipY: 0.7 })), t);
  assert.equal(r.done, true); assert.ok(Math.abs(r.baseline.hipY - 0.7) < 1e-6);
  assert.equal(c.push(bodyFrame(null), 0).reason, "body");
});

test("제자리 뛰기 감지: 뛸 때마다 한 번, 뛰기 시작 시각을 준다, 작은 흔들림은 무시", () => {
  const d = createJumpDetector({ hipY: 0.6, torso: 0.2 });
  const evs = [];
  let t = 0;
  const run = y => { const e = d.push(bodyFrame(pose({ hipY: y })), t); if (e) evs.push(e); t += 33; };
  for (let i = 0; i < 10; i++) run(0.6 + (i % 2 ? 0.004 : -0.004));     // 흔들림
  assert.equal(evs.length, 0);
  for (let k = 0; k < 3; k++) {
    for (const up of [0.01, 0.03, 0.06, 0.08, 0.06, 0.03, 0.0, 0, 0, 0]) run(0.6 - up);
  }
  assert.equal(evs.length, 3);
  assert.ok(evs.every(e => e.takeoff < e.t), "뛰기 시작은 감지보다 앞");
});

test("훌라후프 감지: 엉덩이를 두 바퀴 돌리면 circle 두 번", () => {
  const d = createHipCircleDetector({ hipX: 0.5, hipY: 0.6, torso: 0.2 });
  let n = 0;
  for (let i = 0; i <= 80; i++) { const a = i / 40 * Math.PI * 2; if (d.push(bodyFrame(pose({ hipX: 0.5 + Math.cos(a) * 0.02, hipY: 0.6 + Math.sin(a) * 0.02 })), i * 33)) n++; }
  assert.equal(n, 2);
});

test("휘두르기·발차기·던지기 감지", () => {
  const base = { hipX: 0.5, hipY: 0.6, torso: 0.2, ankleY: 1.0 };
  const sw = createSwingDetector(base);
  assert.equal(sw.push(bodyFrame(pose()), 0), null);
  assert.equal(sw.push(bodyFrame(pose({ rw: { x: 0.9, y: 0.4, visibility: 1 } })), 33).type, "swing");
  const kk = createKickDetector(base);
  kk.push(bodyFrame(pose()), 0);
  assert.equal(kk.push(bodyFrame(pose({ ra: { x: 0.6, y: 0.85, visibility: 1 } })), 50).type, "kick");
  const th = createThrowDetector(base);
  th.push(bodyFrame(pose({ rw: { x: 0.6, y: 0.3, visibility: 1 } })), 0);       // 손이 어깨 위(준비)
  assert.equal(th.push(bodyFrame(pose({ rw: { x: 0.6, y: 0.62, visibility: 1 } })), 60).type, "throw");
});

test("그림 목록(manifest): 적힌 아틀라스·그림판 파일이 있고, 줄이 든 줄넘기 아틀라스는 contact·top 이 있다", () => {
  const man = JSON.parse(readFileSync(here("../art/manifest.json"), "utf8"));
  for (const [kid, acts] of Object.entries(man.kids)) for (const a of acts) {
    assert.ok(existsSync(here(`../art/${kid}/${a}.webp`)), `${kid}/${a}.webp`);
    const meta = JSON.parse(readFileSync(here(`../art/${kid}/${a}.json`), "utf8"));
    assert.ok(meta.frames.length >= 8 && meta.fps > 0 && meta.anchor, `${kid}/${a}.json`);
    if (a === "jump" && meta.rope) assert.ok(meta.events.contact != null && meta.events.top != null && meta.events.top !== meta.events.contact);
  }
  for (const pl of Object.values(man.plates || {})) { assert.ok(existsSync(here("../art/" + pl.file)), pl.file); assert.ok(pl.ground > 0.5 && pl.ground <= 1 && pl.kidH > 0.1 && pl.kidH < 0.9); }
  for (const bg of Object.values(man.backgrounds || {})) if (bg.plate) assert.ok(man.plates[bg.plate], bg.plate);
  // 오프라인: 그림 주소(?v=manifest.version)가 sw.js 에 있다
  const sw = readFileSync(here("../../sw.js"), "utf8"), v = man.version || 1;
  for (const [kid, acts] of Object.entries(man.kids)) for (const a of acts) for (const ext of ["webp", "json"]) assert.ok(sw.includes(`"./sports/art/${kid}/${a}.${ext}?v=${v}"`), `sw ${kid}/${a}.${ext}?v=${v}`);
  for (const pl of Object.values(man.plates || {})) assert.ok(sw.includes(`"./sports/art/${pl.file}?v=${v}"`), "sw " + pl.file);
  for (const k of KIDS) if (k.portrait) assert.ok(sw.includes(`"./sports/${k.portrait}"`) && existsSync(here("../" + k.portrait.split("?")[0])), k.portrait);
});

test("화면 파일: 허브 규칙(문제 모듈 순서·버전, 터치 안전장치, 음성 합성 금지, '별빛' 금지)", () => {
  const html = readFileSync(here("../index.html"), "utf8"), plane = readFileSync(here("../../plane/index.html"), "utf8");
  const order = ["play-timer.js", "touch-guard.js", "curriculum.js", "learning.js", "store.js", "math-bridge.js", "kid-voices.js", "game-quiz.js"];
  let at = -1; for (const f of order) { const i = html.indexOf(f); assert.ok(i > at, f); at = i; }
  for (const f of ["curriculum.js", "learning.js", "store.js", "math-bridge.js", "kid-voices.js", "game-quiz.js"]) {
    const v = s => (s.match(new RegExp(f.replace(".", "\\.") + "\\?v=(\\d+)")) || [])[1];
    assert.equal(v(html), v(plane), f + " ?v= 가 plane 과 같다");
  }
  const src = ["main.js", "sfx.js", "events/jumprope.js", "quiz.js"].map(f => readFileSync(here("../src/" + f), "utf8")).join("\n");
  assert.ok(!/speechSynthesis\s*\./.test(src.replace(/\/\/.*$/gm, "")), "speechSynthesis 금지");
  assert.ok(!html.includes("별빛") && !src.includes("별빛"));
  assert.match(readFileSync(here("../src/quiz.js"), "utf8"), /navigator\.webdriver/);
  for (const k of [2, 4]) for (const p of ["kid", "cheer", "run"]) assert.ok(existsSync(here(`../art/${p}${k}.webp`)), `${p}${k}`);
});

test("오프라인: index.html·모든 import 의 ?v= 주소가 sw.js 사전 저장 목록에 그대로 있다", async () => {
  const { readdirSync, statSync } = await import("node:fs");
  const { join, relative, dirname, posix } = await import("node:path");
  const root = here("..");
  const sw = readFileSync(here("../../sw.js"), "utf8");
  const html = readFileSync(here("../index.html"), "utf8");
  for (const m of html.matchAll(/(?:href|src)="((?:style\.css|src\/main\.js)\?v=\d+)"/g)) assert.ok(sw.includes(`"./sports/${m[1]}"`), m[1]);
  const walk = d => readdirSync(d).flatMap(f => { const p = join(d, f); return statSync(p).isDirectory() ? walk(p) : [p]; });
  const files = walk(join(root, "src")).filter(f => f.endsWith(".js"));
  for (const f of files) {
    const src = readFileSync(f, "utf8"), dir = dirname(relative(root, f)).split("\\").join("/");
    for (const m of src.matchAll(/(?:from\s+|import\()\s*"(\.{1,2}\/[^"]+)"/g)) {
      const url = "./sports/" + posix.normalize(posix.join(dir, m[1]));
      assert.ok(sw.includes(`"${url}"`), `${relative(root, f)} → ${url} 가 sw.js 에 없음`);
    }
    // 모든 src 파일이 사전 저장에 있다
    const self = "./sports/" + relative(root, f).split("\\").join("/");
    assert.ok(sw.includes(`"${self}?v=`), self);
  }
});
