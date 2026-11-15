// 효과 작업 지킴이: node --test plane/tests/
// (1) 무기 피해·적 체력·속도·조종사 난이도 표가 효과 작업 전과 똑같다(효과만 바꾸고 판정·세기는 그대로).
// (2) 효과 엔진은 느린 그리기(shadowBlur·filter)를 쓰지 않고, 입자 수 상한이 있다.
// (3) 화면 글자에 '별빛'이 없다.
import test from "node:test";
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import * as L from "../src/logic.js";

const here = p => new URL(p, import.meta.url);

test("무기·적·난이도 표가 바뀌지 않았다", () => {
  const lv = [];
  for (let l = 1; l <= 8; l++) for (const p of [{}, ...L.allPaths()]) lv.push(L.weapon(l, p));
  const s = JSON.stringify({ lv, MAINS: L.MAINS, SIDES: L.SIDES, hp: [1, 5, 10, 20].map(L.enemyHp), boss: [6, 12].map(L.bossHp), sp: [1, 10, 30].map(L.enemySpeed), t: L.PILOT_TUNING, stay: L.BOSS_STAY });
  assert.equal(createHash("sha256").update(s).digest("hex"), "fe5b0b76fd9e15d753fad9db31d073b0f159881d460ca67d3ca8a1a60e06f062");
});

test("효과 엔진: shadowBlur·filter 없음, 상한이 있다, 필살기 넷의 이름이 다르다", () => {
  const fx = readFileSync(here("../src/fx.js"), "utf8"), main = readFileSync(here("../src/main.js"), "utf8");
  for (const src of [fx, main]) { assert.ok(!/\.shadowBlur\s*=/.test(src), "shadowBlur"); assert.ok(!/\.filter\s*=\s*["'`]/.test(src), "canvas filter"); }
  const caps = fx.match(/CAPS = \{ particles: (\d+), sheets: (\d+), rings: (\d+), lines: (\d+), wind: (\d+) \}/);
  assert.ok(caps, "CAPS"); assert.ok(+caps[1] <= 600 && +caps[2] <= 64);
  const names = [...fx.matchAll(/\{ name: "([^"]+)", color: "#/g)].map(m => m[1]);
  assert.equal(names.length, 4); assert.equal(new Set(names).size, 4);
  for (const src of [fx, main]) assert.ok(!src.includes("별빛"));
  assert.ok(!/speechSynthesis\.|SpeechSynthesisUtterance/.test(fx + main + readFileSync(here("../src/sfx.js"), "utf8")));
});

// 함수 몸통을 잘라 낸다(중괄호 짝 맞추기). 소스 점검용.
function body(src, head) {
  const i = src.indexOf(head); assert.ok(i >= 0, head);
  let d = 0, j = src.indexOf("{", i);
  for (let k = j; k < src.length; k++) { if (src[k] === "{") d++; else if (src[k] === "}" && --d === 0) return src.slice(j, k + 1); }
  return "";
}
test("필살기는 어려운 문제(challenge)로만: 보통 별 문제의 한 번에 맞힘은 필살기를 주지 않는다", () => {
  const main = readFileSync(here("../src/main.js"), "utf8");
  // 보통 별 문제(무기 강화) 쪽에는 필살기 시작이 없다
  for (const fn of ["function solve(", "function openQuiz(", "function resume(", "function openFork("]) assert.ok(!/startUlt|ultAt\s*=|FX\.ultimate/.test(body(main, fn)), fn);
  // 필살기를 시작하는 곳은 updUlt 의 ultAt 타이머 하나뿐이고, ultAt 을 거는 곳은 어려운 문제(openUltQuiz)의 onDone 하나뿐이다
  const calls = main.match(/startUlt\((?!mini\)\s*\{)/g) || [];
  const defs = (main.match(/function startUlt\(/g) || []).length;
  assert.equal(defs, 1);
  const outsideQa = main.replace(/window\.__plane = \{[\s\S]*$/, "");
  assert.equal((outsideQa.match(/startUlt\(ultMini\)/g) || []).length, 1, "필살기 시작은 한 곳");
  assert.equal((outsideQa.match(/[^=!<>]ultAt = 0\.2/g) || []).length, 1, "필살기 예약은 한 곳");
  const uq = body(main, "function openUltQuiz(");
  assert.ok(/pace: "challenge"/.test(uq) && /ultAt = 0\.2/.test(uq), "어려운 문제의 정답 뒤에만");
  assert.ok(/ultMini = !\(res && res\.firstTry\)/.test(uq), "고쳐 맞히면 작은 필살기");
  // 규칙 숫자는 ULT_RULES 한 곳
  assert.ok(/const ULT_RULES = \{/.test(main));
  for (const k of ["popEnemies", "clearShots", "bossDamagePct", "invuln", "miniRadius", "gaugePerSec", "gaugePerKill", "pickupSpeed", "pickupLife"]) assert.ok(new RegExp("\\b" + k + ":").test(body(main, "const ULT_RULES =")), k);
  // 수학 모듈이 없으면 게이지·별도 없다
  assert.ok(/const ultOn = \(\) => !!GameQuiz/.test(main) && /if \(!ultOn\(\)\) return;/.test(body(main, "function updUlt(")));
  void calls;
});

test("src 파일이 ES 모듈로 문법 오류 없이 읽힌다(브라우저는 모듈로 읽는다)", async () => {
  const { execFileSync } = await import("node:child_process");
  const { mkdtempSync, writeFileSync } = await import("node:fs");
  const { tmpdir } = await import("node:os");
  const { join } = await import("node:path");
  const dir = mkdtempSync(join(tmpdir(), "plane-mod-"));
  for (const f of ["main.js", "fx.js", "sfx.js", "logic.js"]) {
    const p = join(dir, f.replace(/\.js$/, ".mjs")); writeFileSync(p, readFileSync(here("../src/" + f), "utf8"));
    execFileSync(process.execPath, ["--check", p]);     // 오류면 던진다
  }
});

test("새 효과 그림 시트가 모두 있고 250KB 아래다", () => {
  for (const n of ["boom", "hit", "zap", "swing", "flame", "stomp"]) {
    const b = readFileSync(here("../art/fx_" + n + ".webp"));
    assert.ok(b.length > 1000 && b.length < 250 * 1024, n + " " + b.length);
    assert.equal(b.toString("ascii", 8, 12), "WEBP");
  }
});
