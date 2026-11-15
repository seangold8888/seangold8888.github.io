// 탑 문제 흐름의 정적 점검 + 버전 고정: node --test towers/tests/quiz-build.test.mjs
// (화면 흐름 자체는 tests/quiz-flow.browser.js 를 ?qa=1 페이지에서 돌려 본다)
import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

const here = p => fileURLToPath(new URL(p, import.meta.url));
const main = readFileSync(here("../src/main.js"), "utf8");
const html = readFileSync(here("../index.html"), "utf8");
const css = readFileSync(here("../style.css"), "utf8");
const sw = readFileSync(here("../../sw.js"), "utf8");

test("새 탑은 문제를 거친다: 문제 모듈이 있고 배지 공짜가 아닐 때만, 없으면 예전처럼 바로", () => {
  assert.match(main, /if \(GameQuiz && E\.buildNeedsQuiz\(world\)\) \{[^}]*openBuildQuiz\(padIdx, kind\)/, "탑 고르기 → 문제");
  assert.match(main, /const t = E\.build\(world, padIdx, kind\);/, "문제 모듈이 없으면 바로 세움");
  assert.match(main, /world\.pending = "build";/, "문제 동안 게임 정지");
  assert.match(main, /E\.buildByQuiz\(world, padIdx, kind, r\.firstTry\)/, "맞힌 순간(onCorrect)에 세움");
  assert.match(main, /title: "한 번에 맞히면 2단계 탑!"/);
  assert.match(main, /onWrong: \(\) => \{ sfx\.no\(\); if \(buildAsk === ba\) \{ ba\.wrong = true; showBack\(false\); \} \}/, "틀린 뒤에는 그만두기 없음");
  assert.match(main, /if \(mode !== "build" \|\| focusPad !== padIdx\) return;/, "두 번 눌러도 한 번");
  assert.ok(!/KidVoices/.test(main), "아이 외침은 GameQuiz 가 한 번만");
});

test("화면 글자에 '별빛' 금지", () => {
  for (const [n, s] of [["main.js", main], ["index.html", html]]) assert.ok(!s.includes("별빛"), n);
});

test("버전: index.html·main.js import·sw.js 사전 저장이 같은 ?v= 를 가리킨다", () => {
  const css_v = html.match(/style\.css\?v=(\d+)/)[1], main_v = html.match(/src\/main\.js\?v=(\d+)/)[1];
  const eng_v = main.match(/engine\.js\?v=(\d+)/)[1], logic_v = main.match(/logic\.js\?v=(\d+)/)[1];
  assert.ok(sw.includes(`"./towers/style.css?v=${css_v}"`), "sw style.css");
  assert.ok(sw.includes(`"./towers/src/main.js?v=${main_v}"`), "sw main.js");
  assert.ok(sw.includes(`"./towers/src/engine.js?v=${eng_v}"`), "sw engine.js");
  assert.ok(sw.includes(`"./towers/src/logic.js?v=${logic_v}"`), "sw logic.js");
  assert.ok(+css_v >= 4 && +main_v >= 6 && +eng_v >= 2, "이번 변경으로 올린 번호");
  assert.ok(/id="quizBack"/.test(html) && /\.chip\.qback/.test(css), "← 다른 탑 버튼");
});
