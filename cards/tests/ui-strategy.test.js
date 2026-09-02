"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const cardsRoot = path.resolve(__dirname, "..");
const read = (relative) => fs.readFileSync(path.join(cardsRoot, relative), "utf8");

test("battle UI exposes enemy intent, defense, and an independent story gate dialog", () => {
  const html = read("index.html");
  const app = read(path.join("js", "app.js"));

  [
    "enemyIntent",
    "enemyIntentName",
    "enemyIntentDetail",
    "storyGateBar",
    "storyGateButton",
    "storyQuizDialog",
    "storyQuizQuestion",
    "storyQuizChoices",
    "storyQuizResult",
  ].forEach((id) => assert.match(html, new RegExp(`id="${id}"`), id));

  const lockedStart = html.indexOf('id="lockedDialog"');
  const lockedEnd = html.indexOf("</dialog>", lockedStart);
  const quizStart = html.indexOf('id="storyQuizDialog"');
  assert.ok(lockedStart >= 0 && lockedEnd > lockedStart && quizStart > lockedEnd);

  assert.match(app, /previewAiIntent\(game, "enemy", Math\.random\)/);
  assert.match(app, /reservedEnemyActionIsAvailable\(enemyIntent\)/);
  assert.match(app, /performPlayerAction\(\{ type: "guard" \}\)/);
  assert.match(app, /performPlayerAction\(\{ type: "ultimate" \}\)/);
});

test("story gate is backed by completion storage and cannot punish HP, stars, or a turn", () => {
  const app = read(path.join("js", "app.js"));
  const engine = read(path.join("js", "engine.js"));

  assert.match(app, /localStorage\.getItem\("story_done_" \+ storyId\) === "1"/);
  assert.match(app, /storyGateHasListeningProof\(\)/);
  assert.match(app, /type: "story_gate_answer"/);

  const answerStart = engine.indexOf('if (action.type === "story_gate_answer")');
  const answerEnd = engine.indexOf('if (action.type === "fragment")', answerStart);
  const block = engine.slice(answerStart, answerEnd);
  assert.ok(block.length > 0);
  assert.doesNotMatch(block, /\.hp\s*[-+]?=/);
  assert.doesNotMatch(block, /\.stars\s*[-+]?=/);
  assert.doesNotMatch(block, /finishTurn\(/);
  assert.match(block, /ultimateAttempts \+= 1/);
  assert.match(block, /ultimateAttempts >= 2/);
});

test("large combat effects stay on screen through contact and settle", () => {
  const app = read(path.join("js", "app.js"));
  const css = read("styles.css");

  assert.match(app, /projectile: Object\.freeze\(\{ impactAtMs: 640, totalMs: 840 \}\)/);
  assert.match(app, /summon: Object\.freeze\(\{ impactAtMs: 635, totalMs: 960 \}\)/);
  assert.match(app, /Math\.max\(850, techniquePlan\.totalMs \+ 60,/);
  assert.match(app, /Math\.PI \* 0\.78 : Math\.PI \* 0\.92/);
  assert.match(app, /Math\.min\(340, baseArtSize \* footprintScale\)/);

  assert.match(css, /\.technique-ribbon \{ width: min\(var\(--fx-distance\), 380px\)/);
  assert.match(css, /\.technique-flare \{ width: 128px; height: 128px/);
  assert.match(css, /\.technique-fx\.is-weakness\.has-impact \.technique-flare \{ width: 176px/);
  assert.match(css, /\.battle-card-slot\.is-guard-ready/);
  assert.match(css, /@media \(prefers-reduced-motion: reduce\)[\s\S]*?\.fx-guard-dome/);
});
