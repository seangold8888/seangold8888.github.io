"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");
const Engine = require("../js/engine.js");

const cardsRoot = path.join(__dirname, "..");
const siteRoot = path.join(cardsRoot, "..");

function read(relativePath) {
  return fs.readFileSync(path.join(cardsRoot, relativePath), "utf8");
}

function loadFxRuntime() {
  const sandbox = {
    window: {},
    document: { addEventListener() {} }
  };
  vm.runInNewContext(read(path.join("js", "app.js")), sandbox, {
    filename: "cards/js/app.js"
  });
  return sandbox.window.CardBattleFx;
}

test("이야기 조각 데이터는 9종 효과·완청 키·초기 3장 풀 계약을 지킨다", () => {
  const data = JSON.parse(read("cards.json"));
  const fragments = data.fragments;
  const storySource = fs.readFileSync(path.join(siteRoot, "story", "index.html"), "utf8");
  const episodeIds = new Set(
    Array.from(storySource.matchAll(/\{ id: "([^"]+)"/g), (match) => match[1])
  );
  const ids = fragments.map((fragment) => fragment.id);

  assert.equal(fragments.length, 9);
  assert.equal(new Set(ids).size, fragments.length, "조각 id는 중복될 수 없다");
  fragments.forEach((fragment) => {
    assert.ok(fragment.name && fragment.emoji && fragment.desc);
    assert.ok(episodeIds.has(fragment.unlock), fragment.unlock + " 완청 키가 실제 이야기와 맞아야 한다");
    assert.equal(
      Engine.SUPPORTED_FRAGMENT_EFFECTS[fragment.effect.type],
      true,
      fragment.id + " 효과가 엔진 allowlist에 있어야 한다"
    );
  });

  const firstTwoStories = fragments.filter((fragment) =>
    ["cinderella", "odyssey_cyclops"].includes(fragment.unlock)
  );
  const firstHand = Engine.drawFragments(firstTwoStories, () => 0.2);
  assert.equal(firstTwoStories.length, 3, "첫 두 이야기만으로도 서로 다른 조각 3개가 필요하다");
  assert.equal(firstHand.length, 3);
  assert.equal(new Set(firstHand.map((fragment) => fragment.id)).size, 3);

  assert.equal(
    fragments.find((fragment) => fragment.id === "golden_goose_egg").unlock,
    "jack_story",
    "기본 지급 Jack 카드가 아니라 완청 기록으로 황금 거위 알을 연다"
  );
  assert.equal(
    fragments.find((fragment) => fragment.id === "daedong_water").unlock,
    "bongi"
  );
});

test("손패 UI와 캐시 버전 17이 함께 배포되도록 묶여 있다", () => {
  const html = read("index.html");
  const css = read("styles.css");
  const app = read(path.join("js", "app.js"));

  ["fragmentTray", "fragmentHand", "fragmentPreview"].forEach((id) => {
    assert.match(html, new RegExp('id="' + id + '"'));
  });
  assert.match(html, /styles\.css\?v=17/);
  ["engine", "audio", "card-view", "app"].forEach((file) => {
    assert.match(html, new RegExp("js/" + file + "\\.js\\?v=17"));
  });

  assert.match(css, /\.fragment-chip[\s\S]*?min-height: 68px/);
  assert.match(
    css,
    /@media \(min-width: 681px\) and \(max-width: 1180px\) and \(max-height: 820px\)[\s\S]*?\.fragment-chip,\s*\.fragment-chip-inner \{[\s\S]*?min-height: 60px/
  );
  assert.match(css, /@keyframes arena-weak-hit/);
  assert.match(css, /\.arena\.is-weak-hit/);
  assert.match(css, /prefers-reduced-motion[\s\S]*?\.arena\.is-weak-hit/);
  assert.match(
    css,
    /@media \(min-width: 681px\) and \(max-width: 1180px\) and \(max-height: 820px\)[\s\S]*?\.action-panel \{[\s\S]*?position: static/
  );
  assert.match(app, /drawFragments\(fragmentPool, Math\.random, 3\)/);
  assert.match(app, /getAvailableFragmentActions\(game\)/);
  assert.match(app, /performAction\(game, \{[\s\S]*?type: "fragment"/);
  assert.match(app, /actionNeedsCoin\(game, action\)/);
  assert.match(app, /restartArenaImpact\(impactFlags\.weak, impactFlags\.monster\)/);
});

test("공격 비주얼은 네 타입·피격·약점·기절·부활을 0.6초 안에 소리와 동기화한다", () => {
  const css = read("styles.css");
  const app = read(path.join("js", "app.js"));

  ["brave", "wise", "magic", "monster"].forEach((type) => {
    assert.match(css, new RegExp("\\.fx-type-" + type + " \\.fx-core"));
  });
  [
    "fx-hit-flash",
    "damage-pop",
    "card-knockout",
    "fx-revive-pillar",
    "arena-monster-hit"
  ].forEach((name) => {
    assert.match(css, new RegExp("@keyframes " + name));
  });
  assert.match(css, /\.damage-pop\.is-weak[\s\S]*?color: #ffe36a/);
  assert.match(css, /\.damage-pop[\s\S]*?animation: damage-pop \.56s/);
  assert.match(css, /\.effect-burst\.show[\s\S]*?animation: burst \.56s/);
  assert.match(css, /\.fx-state-star \{[\s\S]*?animation: fx-knockout-star \.49s/);
  assert.match(css, /\.fx-revive-star \{[\s\S]*?animation: fx-revive-star \.49s/);
  assert.match(css, /\.fx-state-star-c[^\n]*animation-delay: \.07s/);
  assert.match(css, /\.fx-revive-star-c[^\n]*animation-delay: \.07s/);
  assert.doesNotMatch(css, /\.fx-revive-star-c[^\n]*\n\}\s*\n\s*\.battle-center/);
  assert.equal(
    (css.match(/\{/g) || []).length,
    (css.match(/\}/g) || []).length,
    "CSS 중괄호 수가 맞아야 한다"
  );
  assert.match(css, /prefers-reduced-motion[\s\S]*?\.combat-fx[\s\S]*?display: none/);

  const effectKeyframes = css.slice(
    css.indexOf("@keyframes card-knockout"),
    css.indexOf("@keyframes burst")
  );
  assert.ok(effectKeyframes.length > 0);
  assert.doesNotMatch(effectKeyframes, /filter\s*:|width\s*:|height\s*:/);

  assert.match(app, /function actionVisualsForEvents\(events, actor, battleState\)/);
  assert.match(app, /function impactFlagsForVisuals\(visuals\)/);
  assert.match(app, /function createCombatFx\(cardEl, visual\)/);
  assert.match(app, /visuals\.filter\(function \(visual\) \{ return visual\.impact; \}\)/);
  assert.match(app, /sideVisuals\.forEach\(function \(visual\)[\s\S]*?createCombatFx/);
  assert.match(
    app,
    /persistentKnockout = Boolean\([\s\S]*?game\.winner && game\.sides\[sideName\]\.hp <= 0/
  );
  assert.match(app, /damage\.firstHitBlocked[\s\S]*?effect: "무효!"/);
  assert.match(app, /requested\.replace\(\/\\\.png\$\/i, "\.webp"\)/);

  const animateBlock = app.slice(
    app.indexOf("function animateAction(actor)"),
    app.indexOf("function performPlayerAction(action)")
  );
  assert.ok(animateBlock.indexOf("restartArenaImpact(") >= 0);
  assert.ok(
    animateBlock.indexOf("restartArenaImpact(") < animateBlock.indexOf("playSound("),
    "시각 효과와 같은 JS 프레임에서 소리를 시작해야 한다"
  );

  const soundBlock = app.slice(
    app.indexOf("function soundForEvents(events, fallback)"),
    app.indexOf("function actionNeedsCoin(action)")
  );
  assert.ok(
    soundBlock.indexOf("if (gameOver)") < soundBlock.indexOf('if (find("revive"))'),
    "K.O. 사운드 분기가 같은 행동의 부활보다 먼저여야 한다"
  );
  assert.match(
    soundBlock,
    /event\.target === gameOver\.loser[\s\S]*?finishingDamage\.weakness \? "strongHit" : "hit"/,
    "약점 K.O.도 일반 타격음으로 약해지면 안 된다"
  );
});

test("복합 행동은 상대 부활·내 자해 K.O.를 두 카드에 나누고 0피해 약점은 흔들지 않는다", () => {
  const data = JSON.parse(read("cards.json"));
  const midas = data.cards.find((card) => card.id === "midas");
  const cinderella = data.cards.find((card) => card.id === "cinderella");
  const Fx = loadFxRuntime();
  let state = Engine.createGame(midas, cinderella);
  state.sides.player.hp = 10;
  state.sides.enemy.hp = 10;

  const result = Engine.performAction(state, { type: "attack", attackIndex: 0 });
  assert.equal(result.winner, "enemy");
  assert.equal(result.sides.player.hp, 0);
  assert.equal(result.sides.enemy.hp, 30);
  assert.deepEqual(
    result.events.map((event) => event.type),
    ["attack", "damage", "revive", "self_damage", "game_over"]
  );

  const visuals = Fx.actionVisualsForEvents(result.events, "player", result);
  assert.equal(visuals.length, 2);
  const enemyVisual = visuals.find((visual) => visual.target === "enemy");
  const playerVisual = visuals.find((visual) => visual.target === "player");
  assert.ok(enemyVisual);
  assert.equal(enemyVisual.attackType, "monster");
  assert.equal(enemyVisual.damage, 20);
  assert.equal(enemyVisual.impact, true);
  assert.equal(enemyVisual.revive, true);
  assert.equal(enemyVisual.knockout, false);
  assert.ok(playerVisual);
  assert.equal(playerVisual.attackType, null);
  assert.equal(playerVisual.damage, 10);
  assert.equal(playerVisual.impact, true);
  assert.equal(playerVisual.revive, false);
  assert.equal(playerVisual.knockout, true);
  assert.deepEqual(
    { ...Fx.impactFlagsForVisuals(visuals) },
    { weak: false, monster: true }
  );
  assert.equal(Fx.soundForEvents(result.events, "magic"), "hit");
  assert.equal(
    Fx.soundForEvents(
      result.events.filter((event) => event.type !== "game_over"),
      "magic"
    ),
    "revive",
    "K.O.가 없는 평범한 부활은 부활음을 유지해야 한다"
  );

  const zeroDamageEvents = [
    { type: "attack", actor: "player", target: "enemy", attack: "막힌 공격" },
    {
      type: "damage",
      actor: "player",
      target: "enemy",
      attack: "막힌 공격",
      amount: 0,
      weakness: true
    }
  ];
  const zeroVisuals = Fx.actionVisualsForEvents(zeroDamageEvents, "player", result);
  assert.equal(zeroVisuals.length, 1);
  assert.equal(zeroVisuals[0].attackType, "monster");
  assert.equal(zeroVisuals[0].impact, false);
  assert.equal(zeroVisuals[0].weakness, false);
  assert.deepEqual(
    { ...Fx.impactFlagsForVisuals(zeroVisuals) },
    { weak: false, monster: false }
  );
});

test("타격 버스는 3ms 이내 피크·저역 바디·소프트 클리핑·꼬리 잔향을 고정한다", () => {
  const audio = read(path.join("js", "audio.js"));

  assert.match(audio, /createWaveShaper\(\)/);
  assert.match(audio, /makeSoftClipCurve\(2048, 1\.7\)/);
  assert.match(audio, /impactLow\.frequency\.value = 140/);
  assert.match(audio, /impactLow\.gain\.value = 4\.5/);
  assert.match(audio, /bodyDuration = strong \? 0\.36 : 0\.18/);
  assert.match(audio, /start \+ 0\.0025/);
  assert.match(audio, /start \+ 0\.002/);
  assert.match(audio, /brave: \[108, 72\]/);
  assert.match(audio, /wise: \[100, 66\]/);
  assert.match(audio, /magic: \[96, 64\]/);
  assert.match(audio, /monster: \[92, 60\]/);
  assert.match(audio, /start \+ 0\.045/);
  assert.match(audio, /strong \? 0\.075 : 0\.045/);
});
