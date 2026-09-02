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
  vm.runInNewContext(read(path.join("js", "vfx-recipes.js")), sandbox, {
    filename: "cards/js/vfx-recipes.js"
  });
  vm.runInNewContext(read(path.join("js", "app.js")), sandbox, {
    filename: "cards/js/app.js"
  });
  return sandbox.window.CardBattleFx;
}

function loadAudioRuntime() {
  const sandbox = {
    window: {},
    document: { hidden: false },
    localStorage: {
      getItem() { return null; },
      setItem() {}
    },
    setTimeout,
    clearTimeout
  };
  vm.runInNewContext(read(path.join("js", "audio.js")), sandbox, {
    filename: "cards/js/audio.js"
  });
  return sandbox.window.CardAudio;
}

function loadAudioRuntimeWithFakeContext() {
  const contexts = [];
  const started = [];
  class Param {
    constructor(value = 1) { this.value = value; }
    setValueAtTime(value) { this.value = value; }
    linearRampToValueAtTime(value) { this.value = value; }
    exponentialRampToValueAtTime(value) { this.value = value; }
    cancelScheduledValues() {}
  }
  class Node {
    constructor() {
      [
        "gain", "frequency", "Q", "detune", "delayTime", "pan",
        "threshold", "knee", "ratio", "attack", "release"
      ].forEach((key) => { this[key] = new Param(); });
    }
    connect(target) { return target; }
    start(when = 0) {
      this.startAt = when;
      started.push(this);
    }
    stop(when = 0) { this.stopAt = when; }
    addEventListener() {}
  }
  class FakeAudioContext {
    constructor() {
      this.state = "running";
      this.currentTime = 0;
      this.sampleRate = 100;
      this.destination = new Node();
      contexts.push(this);
    }
    createGain() { return new Node(); }
    createConvolver() { return new Node(); }
    createDynamicsCompressor() { return new Node(); }
    createBiquadFilter() { return new Node(); }
    createWaveShaper() { return new Node(); }
    createDelay() { return new Node(); }
    createStereoPanner() { return new Node(); }
    createOscillator() { return new Node(); }
    createBufferSource() { return new Node(); }
    createBuffer(channels, length, rate) {
      const data = Array.from(
        { length: channels },
        () => new Float32Array(length)
      );
      return {
        numberOfChannels: channels,
        duration: length / rate,
        getChannelData(index) { return data[index]; }
      };
    }
    resume() {
      this.state = "running";
      return Promise.resolve();
    }
  }
  const sandbox = {
    window: { AudioContext: FakeAudioContext },
    document: { hidden: false },
    localStorage: {
      getItem() { return null; },
      setItem() {}
    },
    setTimeout() { return 1; },
    clearTimeout() {}
  };
  vm.runInNewContext(read(path.join("js", "audio.js")), sandbox, {
    filename: "cards/js/audio.js"
  });
  return {
    Audio: sandbox.window.CardAudio,
    contexts,
    started
  };
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

test("손패 UI와 캐시 버전 24이 함께 배포되도록 묶여 있다", () => {
  const html = read("index.html");
  const css = read("styles.css");
  const app = read(path.join("js", "app.js"));

  ["fragmentTray", "fragmentHand", "fragmentPreview"].forEach((id) => {
    assert.match(html, new RegExp('id="' + id + '"'));
  });
  assert.match(html, /styles\.css\?v=24/);
  ["engine", "audio", "card-view", "vfx-recipes", "story-gates", "app"].forEach((file) => {
    assert.match(html, new RegExp("js/" + file + "\\.js\\?v=24"));
  });
  assert.doesNotMatch(html, /\?v=(?:19|20|21|22)/);

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
  assert.match(app, /actionNeedsCoin\(action\)/);
  assert.match(
    app,
    /restartArenaImpact\(\s*impactFlags\.weak,\s*impactFlags\.monster,\s*Boolean\(/
  );
});

test("공격 비주얼은 네 타입·피격·약점·기절·부활을 읽기 쉬운 타임라인에 동기화한다", () => {
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
    /persistentKnockout = Boolean\([\s\S]*?displayGame\.winner && displayGame\.sides\[sideName\]\.hp <= 0/
  );
  assert.match(app, /damage\.firstHitBlocked[\s\S]*?effect: "무효!"/);
  assert.match(app, /requested\.replace\(\/\\\.png\$\/i, "\.webp"\)/);

  const animateBlock = app.slice(
    app.indexOf("function animateAction(actor, previousGame)"),
    app.indexOf("function performPlayerAction(action)")
  );
  assert.ok(animateBlock.indexOf("restartArenaImpact(") >= 0);
  assert.ok(
    animateBlock.indexOf("playTechniqueFx(techniquePlan)") <
      animateBlock.indexOf("const revealImpact"),
    "기술 이동 연출은 명중 프레임 전에 시작해야 한다"
  );
  assert.ok(
    animateBlock.indexOf("CardAudio.techniqueLaunch") <
      animateBlock.indexOf("const revealImpact"),
    "발동음은 이동 연출과 함께 시작해야 한다"
  );
  assert.ok(
    animateBlock.indexOf("restartArenaImpact(") <
      animateBlock.indexOf("CardAudio.techniqueImpact"),
    "명중 시각 효과와 같은 JS 프레임에서 명중음을 시작해야 한다"
  );
  assert.match(
    animateBlock,
    /if \(techniquePlan && window\.CardAudio\.techniqueImpact\)[\s\S]*?else \{\s*playSound\(actionSound, actor\)/,
    "새 명중음 위에 레거시 타격음을 겹쳐 재생하면 안 된다"
  );
  assert.match(
    animateBlock,
    /setTimeout\(revealImpact,\s*techniquePlan\.impactAtMs\)/
  );
  assert.match(
    animateBlock,
    /displayState: previousGame \|\| game/,
    "투사체가 닿기 전에는 이전 HP를 보여야 한다"
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
    /event\.target === gameOver\.loser[\s\S]*?finishingDamage\.weakness \|\| bigTechnique \? "strongHit" : "hit"/,
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

test("프리미엄 사운드는 발동·명중을 나누고 재질·결과·안전 믹스를 고정한다", () => {
  const audio = read(path.join("js", "audio.js"));
  const Audio = loadAudioRuntime();

  assert.match(audio, /createWaveShaper\(\)/);
  assert.match(audio, /makeSoftClipCurve\(2048, 1\.4\)/);
  assert.match(audio, /toneFilter\.frequency\.value = 9500/);
  assert.match(audio, /bodyLow\.frequency\.value = 170/);
  assert.match(audio, /bodyLow\.gain\.value = 2\.4/);
  assert.match(audio, /compressor\.threshold\.value = -8/);
  assert.match(audio, /compressor\.ratio\.value = 12/);
  assert.match(audio, /Math\.min\(0\.003,/);
  assert.match(audio, /const MATERIAL_BY_EMOJI/);
  assert.match(audio, /const MATERIAL_PROFILES/);
  assert.match(audio, /function materialResonanceAt\(audio, start, soundPlan\)/);
  assert.match(audio, /function stableTechniqueSignature\(plan\)/);
  assert.match(audio, /const MAX_ACTIVE_ONE_SHOTS = 24/);
  assert.match(audio, /function trackOneShot\(audio, source, start, stopAt, priority\)/);
  assert.match(audio, /function techniqueLaunch\(plan\)/);
  assert.match(audio, /function techniqueImpact\(plan\)/);
  assert.match(audio, /musicDuckBus/);
  assert.match(audio, /function attemptContextResume\(audio\)/);
  assert.match(audio, /audio\.state === "running"/);
  assert.match(audio, /}, 480\)/);
  assert.match(audio, /context\.state !== "closed"/);
  assert.match(audio, /function releaseClosedGraph\(\)/);
  assert.match(audio, /activeOneShots\.splice\(0\)/);
  assert.match(audio, /lastSelectAt = -Infinity/);
  assert.doesNotMatch(audio, /function impactCore/);
  assert.equal(typeof Audio.techniqueLaunch, "function");
  assert.equal(typeof Audio.techniqueImpact, "function");
  assert.equal(typeof Audio.soundPlanForTechnique, "function");
  assert.equal(Audio.soundConfig.version, 20);
  assert.equal(Audio.soundConfig.maxActiveOneShots, 24);
  assert.equal(Audio.soundConfig.maxMusicStepsPerTick, 8);
  assert.equal(Audio.soundConfig.materialProfiles.length, 11);
  assert.match(audio, /scheduledSteps < MAX_MUSIC_STEPS_PER_TICK/);

  const base = {
    type: "wise",
    kind: "projectile",
    emoji: "🪨",
    outcome: "hit",
    impactAtMs: 450,
    totalMs: 590
  };
  const first = Audio.soundPlanForTechnique(base);
  const second = Audio.soundPlanForTechnique(base);
  assert.equal(first.material, "stone");
  assert.equal(first.hasTransient, true);
  assert.equal(first.hasBody, true);
  assert.notEqual(first.variation, second.variation);

  for (const outcome of ["miss", "evade", "support"]) {
    const plan = Audio.soundPlanForTechnique({ ...base, outcome });
    assert.equal(plan.hasImpact, false, outcome);
    assert.equal(plan.hasBody, false, outcome);
  }
  const blocked = Audio.soundPlanForTechnique({ ...base, outcome: "blocked" });
  assert.equal(blocked.hasTransient, true);
  assert.equal(blocked.hasBody, false);
  const magic = Audio.soundPlanForTechnique({
    ...base,
    type: "magic",
    emoji: "✨",
    weakness: true
  });
  assert.equal(magic.material, "crystal");
  assert.equal(magic.strong, true);
  assert.equal(magic.hasBody, false);
  assert.equal(Audio.soundPlanForTechnique({ ...base, emoji: "👠" }).material, "glass");
  assert.equal(Audio.soundPlanForTechnique({ ...base, emoji: "🌾" }).material, "paper");
  assert.equal(Audio.soundPlanForTechnique({ ...base, emoji: "🐴" }).material, "hollow");
  assert.equal(Audio.soundPlanForTechnique({ ...base, emoji: "👊" }).material, "body");
  assert.equal(Audio.soundPlanForTechnique({ ...base, emoji: "📏" }).material, "wood");

  assert.doesNotMatch(audio, /\bfetch\s*\(|new\s+Audio\s*\(|\.(mp3|ogg|wav)\b/i);
});

test("닫힌 iPad AudioContext를 다시 만들어도 선택음 시계가 초기화된다", () => {
  const runtime = loadAudioRuntimeWithFakeContext();
  const first = runtime.Audio.prime();
  first.currentTime = 100;
  runtime.Audio.select();
  assert.ok(runtime.started.length > 0);

  first.state = "closed";
  const second = runtime.Audio.prime();
  assert.notEqual(second, first);
  assert.equal(runtime.contexts.length, 2);

  const before = runtime.started.length;
  runtime.Audio.select();
  assert.ok(
    runtime.started.length > before,
    "새 context의 0초를 예전 100초 선택음 throttle과 비교하면 안 된다"
  );
});

test("연속 강타에도 실제 동시 발음은 24개를 넘지 않고 UI가 강타를 밀어내지 않는다", () => {
  const runtime = loadAudioRuntimeWithFakeContext();
  runtime.Audio.prime();
  const plan = {
    attack: "열두 과업",
    type: "brave",
    kind: "burst",
    emoji: "💥",
    outcome: "hit",
    big: true,
    weakness: false,
    impactAtMs: 0,
    totalMs: 500
  };
  for (let index = 0; index < 20; index += 1) {
    runtime.Audio.techniqueImpact(plan);
  }

  let peak = 0;
  for (let time = 0; time < 0.6; time += 0.0005) {
    const active = runtime.started.filter((source) =>
      source.startAt <= time && time < source.stopAt
    ).length;
    peak = Math.max(peak, active);
  }
  assert.ok(
    peak <= runtime.Audio.soundConfig.maxActiveOneShots,
    "peak " + peak
  );

  const beforeUi = runtime.started.length;
  runtime.Audio.star();
  assert.equal(
    runtime.started.length,
    beforeUi,
    "priority 1 UI tails must be dropped before priority 3 impact voices"
  );
});

test("iPad pagehide 뒤 예약음을 버리고 다음 사용자 prime에서 새 그래프를 만든다", () => {
  const runtime = loadAudioRuntimeWithFakeContext();
  const first = runtime.Audio.prime();
  first.currentTime = 12;
  runtime.Audio.setScene("battle");
  runtime.Audio.select();
  assert.ok(runtime.started.length > 0);

  runtime.Audio.setPageHidden(true);
  assert.ok(runtime.started.every((source) => source.stopAt <= 12));
  const hiddenCount = runtime.started.length;
  runtime.Audio.techniqueImpact({
    attack: "청동 검",
    type: "brave",
    kind: "strike",
    emoji: "⚔️",
    outcome: "hit"
  });
  assert.equal(runtime.started.length, hiddenCount, "hidden timer SFX must be dropped");

  runtime.Audio.setPageHidden(false);
  runtime.Audio.prime();
  assert.equal(runtime.contexts.length, 2);
  assert.notEqual(runtime.contexts[1], first);
  runtime.Audio.select();
  assert.ok(runtime.started.length > hiddenCount);
});

test("miss·evade는 충돌음을 만들지 않고 날아가는 시작음만 낸다", () => {
  ["miss", "evade"].forEach((outcome) => {
    const runtime = loadAudioRuntimeWithFakeContext();
    runtime.Audio.prime();
    const input = {
      attack: "조약돌 던지기",
      type: "wise",
      kind: "projectile",
      emoji: "🪨",
      outcome,
      impactAtMs: 450,
      totalMs: 590
    };
    const before = runtime.started.length;
    const result = runtime.Audio.techniqueImpact(input);
    assert.equal(runtime.started.length, before, outcome + " impact");
    assert.equal(result.hasBody, false);
    assert.equal(result.hasTransient, false);
    runtime.Audio.techniqueLaunch(input);
    assert.ok(runtime.started.length > before, outcome + " fly-by");
  });
});

test("48개 기술은 §9의 6종 VFX 매핑을 빠짐없이 가진다", () => {
  const data = JSON.parse(read("cards.json"));
  const attacks = data.cards.flatMap((card) =>
    card.attacks.map((attack) => ({
      card: card.id,
      cardType: card.type,
      attack
    }))
  );
  const Audio = loadAudioRuntime();
  const counts = {};
  const materialCounts = {};
  const signatures = new Set();

  assert.equal(attacks.length, 48);
  attacks.forEach(({ card, cardType, attack }) => {
    assert.ok(attack.vfx, card + " / " + attack.name);
    assert.ok(attack.vfx.emoji, card + " / " + attack.name);
    assert.ok(
      ["projectile", "summon", "strike", "burst", "aura", "debuff"]
        .includes(attack.vfx.kind),
      card + " / " + attack.name
    );
    if ("big" in attack.vfx) assert.equal(typeof attack.vfx.big, "boolean");
    counts[attack.vfx.kind] = (counts[attack.vfx.kind] || 0) + 1;
    const soundPlan = Audio.soundPlanForTechnique({
      type: cardType,
      attack: attack.name,
      kind: attack.vfx.kind,
      emoji: attack.vfx.emoji,
      big: attack.vfx.big,
      outcome: attack.dmg > 0 || attack.fx === "dmg_half_enemy_hp"
        ? "hit"
        : "support",
      impactAtMs: 220,
      totalMs: 500
    });
    assert.ok(["stone", "metal", "wood", "glass", "body", "paper",
      "crystal", "air", "fire", "earth", "hollow"]
      .includes(soundPlan.material), card + " / " + attack.name + " sound");
    assert.equal(soundPlan.materialProfile, soundPlan.material);
    assert.ok(soundPlan.tailMs >= 140 && soundPlan.tailMs <= 470);
    assert.ok(Number.isInteger(soundPlan.signature));
    signatures.add(soundPlan.signature);
    materialCounts[soundPlan.material] = (materialCounts[soundPlan.material] || 0) + 1;
    assert.ok(["brave", "wise", "magic", "monster"].includes(soundPlan.type));
  });
  assert.equal(signatures.size, 48, "48개 기술은 각각 고유한 안정 음색 서명을 가져야 한다");
  assert.deepEqual(materialCounts, {
    body: 8,
    fire: 3,
    air: 10,
    wood: 3,
    metal: 7,
    stone: 4,
    paper: 2,
    hollow: 3,
    glass: 2,
    crystal: 5,
    earth: 1
  });

  assert.deepEqual(counts, {
    strike: 12,
    burst: 9,
    debuff: 8,
    projectile: 9,
    aura: 4,
    summon: 6
  });
  assert.equal(attacks.filter(({ attack }) => attack.vfx.big).length, 15);

  const redhood = data.cards.find((card) => card.id === "redhood");
  assert.deepEqual(redhood.attacks[0].vfx, {
    kind: "projectile",
    emoji: "🪨"
  });
  assert.deepEqual(redhood.attacks[1].vfx, {
    kind: "summon",
    emoji: "🪓",
    big: true
  });
});

test("기술 플래너는 종류·빗나감·회피·큰 기술·모션 감소를 결정한다", () => {
  const Fx = loadFxRuntime();
  const battleState = {
    sides: {
      player: { card: { type: "wise", attacks: [] } },
      enemy: { card: { type: "monster", attacks: [] } }
    }
  };
  const attack = (vfx) => ({
    type: "attack",
    actor: "player",
    target: "enemy",
    attackIndex: 0,
    attack: "시험 기술",
    vfx
  });
  const plan = (vfx, tail, reduced = false) =>
    Fx.techniquePlanForEvents(
      [attack(vfx), ...tail],
      battleState,
      "player",
      reduced
    );

  assert.deepEqual(
    JSON.parse(JSON.stringify(Fx.techniqueTimings)),
    {
      projectile: { impactAtMs: 640, totalMs: 840 },
      summon: { impactAtMs: 635, totalMs: 960 },
      strike: { impactAtMs: 275, totalMs: 720 },
      burst: { impactAtMs: 350, totalMs: 800 },
      aura: { impactAtMs: 270, totalMs: 760 },
      debuff: { impactAtMs: 350, totalMs: 800 }
    }
  );

  const hit = plan(
    { kind: "projectile", emoji: "🪨" },
    [{ type: "damage", target: "enemy", amount: 20 }]
  );
  assert.equal(hit.outcome, "hit");
  assert.equal(hit.actualImpact, true);
  assert.equal(hit.impactAtMs, 640);
  assert.equal(hit.totalMs, 840);

  const miss = plan(
    { kind: "projectile", emoji: "🪨", big: true },
    [{ type: "attack_missed", target: "enemy" }]
  );
  assert.equal(miss.outcome, "miss");
  assert.equal(miss.actualImpact, false);
  assert.equal(miss.big, true);

  const evade = plan(
    { kind: "strike", emoji: "⚔️" },
    [{ type: "attack_evaded", target: "enemy" }]
  );
  assert.equal(evade.outcome, "evade");
  assert.equal(evade.actualImpact, false);

  const reduced = plan(
    { kind: "summon", emoji: "🪓", big: true },
    [{ type: "damage", target: "enemy", amount: 50 }],
    true
  );
  assert.equal(reduced.impactAtMs, 0);
  assert.ok(reduced.totalMs <= 20);

  Object.values(JSON.parse(JSON.stringify(Fx.techniqueTimings))).forEach((timing) => {
    assert.ok(timing.impactAtMs <= timing.totalMs);
    assert.ok(timing.totalMs >= 720);
    assert.ok(timing.totalMs <= 1000);
  });
});

test("대표 기술은 원본 텍스처·재질 파편·접촉 정지 레시피를 사용한다", () => {
  const sandbox = { window: {} };
  vm.runInNewContext(read(path.join("js", "vfx-recipes.js")), sandbox, {
    filename: "cards/js/vfx-recipes.js"
  });
  const registry = sandbox.window.CardVfxRecipes;
  const expected = new Map([
    ["redhood:0", "stone"],
    ["arthur:0", "metal"],
    ["snowqueen:0", "ice"],
    ["tiger:1", "earth"]
  ]);
  expected.forEach((material, key) => {
    const [cardId, attackIndex] = key.split(":");
    const recipe = registry.get(cardId, Number(attackIndex));
    assert.ok(recipe, key);
    assert.equal(recipe.material, material, key);
    assert.ok(recipe.hitStopMs >= 28 && recipe.hitStopMs <= 55, key);
    assert.ok(recipe.recoilPx >= 3 && recipe.recoilPx <= 10, key);
    const assetPath = path.join(cardsRoot, recipe.asset);
    assert.ok(fs.existsSync(assetPath), recipe.asset);
    assert.ok(fs.statSync(assetPath).size > 1000, recipe.asset);
    assert.ok(fs.statSync(assetPath).size < 100000, recipe.asset);
  });

  const css = read("styles.css");
  const app = read(path.join("js", "app.js"));
  assert.match(css, /\.technique-fx\.has-premium-art/);
  assert.match(css, /premium-v21-target-recoil/);
  assert.match(app, /triggerTechniqueContact\(effect, plan\)/);
  assert.match(app, /const spread = plan\.recipe \? Math\.PI \* 0\.78/);
  assert.match(app, /slotAnchorPoint\(sourceSlot/);
});

test("기술 무대는 풀을 재사용하고 프레임·기울기·60px 조작 기준을 지킨다", () => {
  const html = read("index.html");
  const app = read(path.join("js", "app.js"));
  const view = read(path.join("js", "card-view.js"));
  const css = read("styles.css");

  assert.match(
    html,
    /<canvas[^>]+id="combatParticleCanvas"[^>]+aria-hidden="true"/
  );
  assert.match(html, /id="techniqueFxLayer"/);
  assert.match(app, /for \(let index = 0; index < 4; index \+= 1\)/);
  const playBlock = app.slice(
    app.indexOf("function playTechniqueFx(plan)"),
    app.indexOf("function playFragmentAura")
  );
  assert.doesNotMatch(playBlock, /createElement/);
  const Fx = loadFxRuntime();
  const kinds = ["projectile", "summon", "strike", "burst", "aura", "debuff"];
  assert.equal(Fx.particleConfig.capacity, 120);
  assert.equal(Fx.particleConfig.dprCap, 1.5);
  const signatures = new Set();
  kinds.forEach((kind) => {
    assert.match(css, new RegExp("\\.vfx-kind-" + kind));
    const recipe = Fx.particleRecipeForPlan({
      kind,
      outcome: "hit",
      big: false
    }, false);
    assert.ok(recipe.total > 0 && recipe.total <= Fx.particleConfig.capacity);
    assert.ok(recipe.lifeMs > 0 && recipe.lifeMs <= 800);
    signatures.add([recipe.motion, recipe.shape, recipe.blend].join(":"));
    const big = Fx.particleRecipeForPlan({
      kind,
      outcome: "hit",
      big: true
    }, false);
    assert.ok(big.total >= recipe.total);
    assert.ok(big.total <= Fx.particleConfig.capacity);
  });
  assert.equal(signatures.size, kinds.length, "6종 기술은 서로 다른 움직임 문법이어야 한다");
  assert.equal(
    Fx.particleRecipeForPlan({
      kind: "projectile",
      outcome: "miss"
    }, false).impactCount,
    0
  );
  assert.equal(
    Fx.particleRecipeForPlan({
      kind: "strike",
      outcome: "evade"
    }, false).impactCount,
    0
  );
  assert.equal(
    Fx.particleRecipeForPlan({
      kind: "burst",
      outcome: "hit"
    }, true).total,
    0
  );
  [".is-miss", ".is-evade", ".is-dodging", ".is-big"].forEach((selector) => {
    assert.ok(css.includes(selector), selector);
  });
  assert.match(css, /@keyframes premium-projectile-core/);
  assert.match(css, /@keyframes premium-summon-core/);
  assert.match(css, /@keyframes premium-strike-slash-a/);
  assert.match(css, /@keyframes premium-burst-core/);
  assert.match(css, /@keyframes premium-aura-core/);
  assert.match(css, /@keyframes premium-debuff-core/);
  assert.match(css, /\.technique-fx\.has-impact[\s\S]*?premium-contact-flare/);
  assert.match(css, /premium-technique-dodge var\(--dodge-duration/);
  assert.match(css, /@keyframes premium-arena-finisher-hit/);
  assert.match(app, /Math\.max\(420, plan\.impactAtMs \+ 120\)/);
  assert.match(app, /Math\.min\([\s\S]*?COMBAT_PARTICLE_CONFIG\.dprCap/);
  assert.match(app, /cancelAnimationFrame/);
  assert.match(app, /window\.addEventListener\("resize"/);
  assert.match(css, /\.combat-particle-canvas \{[\s\S]*?pointer-events: none/);
  assert.match(
    css,
    /prefers-reduced-motion[\s\S]*?\.combat-particle-canvas[\s\S]*?display: none/
  );
  assert.match(
    css,
    /@media \(max-width: 0px\) \{\s*\/\* §9/,
    "구형 §9 선택자는 실제 뷰포트에서 적용되면 안 된다"
  );
  assert.doesNotMatch(
    css.slice(css.indexOf("/* v19 프리미엄 전투 무대")),
    /\.technique-fx-layer\s*\{\s*display:\s*none/,
    "모션 감소에서도 정적 명중 플래시는 남아야 한다"
  );
  const tickBlock = app.slice(
    app.indexOf("function combatParticleTick(now)"),
    app.indexOf("function scheduleCombatParticleFrame()")
  );
  assert.doesNotMatch(
    tickBlock,
    /resizeCombatParticleCanvas|getBoundingClientRect/,
    "rAF 중 레이아웃을 다시 읽으면 iPad 프레임이 떨어진다"
  );
  const journeyBlock = app.slice(
    app.indexOf("function registerCombatJourney(plan, points)"),
    app.indexOf("function spawnCombatImpact(plan, points)")
  );
  assert.match(journeyBlock, /resizeCombatParticleCanvas\(\)/);
  assert.match(
    css,
    /\.technique-sigil \{[\s\S]*?font-size: clamp\(28px, 4vw, 44px\)/
  );
  assert.match(css, /\.technique-fx\.is-big \.technique-sigil \{[\s\S]*?48px/);

  assert.match(view, /dataset\.type = card\.type/);
  assert.match(view, /classList\.add\("rarity-" \+ rarity\)/);
  assert.match(view, /frame-ornament/);
  assert.match(view, /frame-crest/);
  assert.match(css, /\.story-card\.rarity-1[\s\S]*?\.story-card\.rarity-2[\s\S]*?\.story-card\.rarity-3/);
  ["brave", "wise", "magic", "monster"].forEach((type) => {
    assert.match(css, new RegExp("\\.story-card\\.type-" + type));
  });
  assert.match(css, /\.card-name[\s\S]*?font-family:[^;]*serif/);
  assert.match(app, /pointermove/);
  assert.match(app, /requestAnimationFrame/);
  assert.match(app, /--tilt-x/);
  assert.match(app, /--shine-x/);
  assert.match(app, /\(hover: hover\) and \(pointer: fine\)/);
  const primeBlock = app.slice(
    app.indexOf("const primeAudioOnce"),
    app.indexOf('window.addEventListener("pageshow"')
  );
  assert.doesNotMatch(
    primeBlock,
    /once:\s*true/,
    "iPad 오디오 인터럽트 뒤 다음 사용자 제스처로 다시 prime해야 한다"
  );
  assert.match(app, /window\.addEventListener\("pagehide"/);
  assert.match(app, /window\.CardAudio\.requestRecovery\(\)/);
  assert.match(
    app,
    /window\.addEventListener\("pageshow"[\s\S]*?setPageHidden\(document\.hidden\)[\s\S]*?refreshUnlocks\(\)/
  );

  const selectBlock = app.slice(
    app.indexOf("function selectCard(card, cardEl)"),
    app.indexOf("function updateSelectionDock()")
  );
  assert.doesNotMatch(selectBlock, /renderCollection\(\)/);
  assert.match(css, /\.audio-controls \.icon-button \{[\s\S]*?width: 60px;[\s\S]*?height: 60px/);
  assert.match(css, /\.dialog-close \{[\s\S]*?width: 60px;[\s\S]*?height: 60px/);
  assert.match(css, /\.action-button \{[\s\S]*?min-height: 68px/);
});

test("§9c BGM은 합성 음원·두 장면·위기 변주·별도 토글을 제공한다", () => {
  const html = read("index.html");
  const app = read(path.join("js", "app.js"));
  const audio = read(path.join("js", "audio.js"));

  assert.match(html, /id="musicButton"/);
  assert.match(audio, /const LOOKAHEAD_MS = 50/);
  assert.match(audio, /const SCHEDULE_AHEAD_SECONDS = 0\.18/);
  assert.match(audio, /const COLLECTION_BPM = 66/);
  assert.match(audio, /const BATTLE_BPM = 92/);
  assert.match(audio, /const COLLECTION_BARS = 8/);
  assert.match(audio, /const BATTLE_BARS = 8/);
  assert.match(audio, /Math\.pow\(2, 1 \/ 12\)/);
  assert.match(audio, /setTimeout\(schedulerTick, LOOKAHEAD_MS\)/);
  assert.match(audio, /cards_bgm_muted/);
  assert.match(audio, /musicVariation = Math\.random\(\) < 0\.5 \? 0 : 1/);
  assert.match(audio, /win: function \(\) \{\s*stopBgm\(\)/);
  assert.match(audio, /lose: function \(\) \{\s*stopBgm\(\)/);
  assert.doesNotMatch(audio, /\bfetch\s*\(|new\s+Audio\s*\(|\.(mp3|ogg|wav)\b/i);
  ["setScene", "stopBgm", "updateBattleHp", "setPageHidden", "isBgmMuted", "setBgmMuted"]
    .forEach((name) => assert.ok(audio.includes(name), name));

  assert.match(app, /CardAudio\.setScene\(battle \? "battle" : "collection"\)/);
  assert.match(app, /updateBattleHp\(player\.hp, player\.card\.hp\)/);
  assert.match(app, /setPageHidden\(document\.hidden\)/);
  assert.match(app, /musicButton\.addEventListener\("click"/);
});
