"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const crypto = require("node:crypto");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");
const { execFileSync } = require("node:child_process");

const root = path.join(__dirname, "..");
const data = JSON.parse(fs.readFileSync(path.join(root, "cards.json"), "utf8"));
const familyIds = ["jaei", "taeo", "appa", "eomma"];
const byId = new Map(data.cards.map((card) => [card.id, card]));
const sha = (value) => crypto.createHash("sha256").update(value).digest("hex");

function gatesRuntime() {
  const sandbox = { window: {} };
  vm.runInNewContext(
    fs.readFileSync(path.join(root, "js", "story-gates.js"), "utf8"),
    sandbox,
    { filename: "cards/js/story-gates.js" }
  );
  return sandbox.window.CardStoryGates;
}

function audioRuntime() {
  const sandbox = {
    window: {},
    document: { hidden: false },
    localStorage: { getItem() { return "1"; }, setItem() {} },
    setTimeout,
    clearTimeout
  };
  vm.runInNewContext(
    fs.readFileSync(path.join(root, "js", "audio.js"), "utf8"),
    sandbox,
    { filename: "cards/js/audio.js" }
  );
  return sandbox.window.CardAudio;
}

test("기존 51장 데이터와 컬렉션 순서는 바이트 의미상 고정된다", () => {
  assert.equal(
    sha(JSON.stringify(data.cards.slice(0, 51))),
    "36595a065e3d8dcbf7d9b8ee79872e75e2884668c5be0775102650cb9f6a0897"
  );
  assert.equal(
    sha(JSON.stringify(data.collection.slice(0, 51))),
    "87615c645cfda730f1d7bb5d783c0cd25dffff2222a2c04085083674679c51d3"
  );
  assert.deepEqual(data.collection.slice(-4), familyIds);
});

test("가족 4장 수치·기술·해금은 확정 설계와 일치한다", () => {
  assert.equal(data.cards.length, 55);
  assert.deepEqual(
    familyIds.map((id) => {
      const card = byId.get(id);
      return [
        card.id, card.type, card.element, card.rarity, card.hp,
        card.passive.fx, card.unlock,
        card.attacks.map((attack) => [attack.name, attack.cost, attack.dmg, attack.fx]),
        [card.stats.attack, card.stats.defense, card.stats.spirit]
      ];
    }),
    [
      ["jaei", "wise", "water", 3, 90, "first_hit_zero", "game:math/streak7",
        [["코딱지 날리기", 1, 20, null], ["트림 폭탄", 2, 40, "weaken_next_20"], ["참았던 방귀", 3, 60, null]], [4, 5, 3]],
      ["taeo", "monster", "fire", 2, 80, "reduce_dmg_10", "game:math/streak3",
        [["발냄새 공격", 1, 20, null], ["연속 방귀", 2, 20, "dmg_stack_10"], ["대왕 방귀", 3, 50, null], ["메가랩터킥", 4, 60, null]], [5, 5, 2]],
      ["appa", "brave", "earth", 2, 80, "boost_20_below_half", "game:math/streak7",
        [["목말 태우기", 1, 10, null], ["간지럽히기", 2, 20, "skip_next_enemy"]], [2, 5, 2]],
      ["eomma", "magic", "wood", 3, 70, "reduce_dmg_10", "game:math/streak7",
        [["이제 그만!", 1, 10, "weaken_next_20"], ["정리정돈", 2, 30, null], ["엄마의 한마디", 3, 30, "skip_next_enemy"]], [2, 4, 4]]
    ]
  );
});

test("가족 기술 이모지는 옛 51장과 겹치지 않고 새 소리 재질만 선택한다", () => {
  const oldEmojis = new Set(data.cards.slice(0, 51)
    .flatMap((card) => card.attacks.map((attack) => attack.vfx.emoji)));
  const familyAttacks = data.cards.slice(51).flatMap((card) =>
    card.attacks.map((attack) => ({ card, attack }))
  );
  familyAttacks.forEach(({ card, attack }) => {
    assert.equal(oldEmojis.has(attack.vfx.emoji), false, card.id + " / " + attack.name);
  });

  const Audio = audioRuntime();
  const materials = Object.fromEntries(familyAttacks.map(({ card, attack }) => [
    attack.name,
    Audio.soundPlanForTechnique({
      type: card.type,
      attack: attack.name,
      kind: attack.vfx.kind,
      emoji: attack.vfx.emoji,
      big: attack.vfx.big,
      outcome: "hit"
    }).material
  ]));
  assert.deepEqual(JSON.parse(JSON.stringify(materials)), {
    "코딱지 날리기": "flick",
    "트림 폭탄": "belch",
    "참았던 방귀": "gas",
    "발냄새 공격": "stink",
    "연속 방귀": "gas",
    "대왕 방귀": "gas",
    "메가랩터킥": "body",
    "목말 태우기": "air",
    "간지럽히기": "body",
    "이제 그만!": "body",
    "정리정돈": "wood",
    "엄마의 한마디": "air"
  });
});

test("기존 51장의 11개 소리 프로필과 이모지 매핑은 고정 해시다", () => {
  const source = fs.readFileSync(path.join(root, "js", "audio.js"), "utf8")
    .replace(/\r\n/g, "\n");
  const profiles = source.match(
    /    stone: Object\.freeze\([\s\S]*?    hollow: Object\.freeze\(\{[\s\S]*?\n    \}\)/
  );
  assert.ok(profiles);
  const mappingStart = source.indexOf('    "🪨": "stone"');
  const mappingEnd = source.indexOf('"♟️": "stone"', mappingStart) + '"♟️": "stone"'.length;
  assert.ok(mappingStart >= 0 && mappingEnd > mappingStart);
  assert.equal(
    sha(profiles[0]),
    "294c1dc579dcf5fc1cc1749dd352a1197b1b116ba0acd0f64afcf6e319847130"
  );
  assert.equal(
    sha(source.slice(mappingStart, mappingEnd)),
    "4b8a000b28d0dcf68011d3e02c9c94f25363eb236a74ddea5933bc3b8e754a2e"
  );
  assert.match(source, /if \(profile\.wobbleHz && profile\.wobbleCents\)/);
  assert.doesNotMatch(profiles[0], /wobble(?:Hz|Cents)/);
});

test("승률은 재이 > 태오 > 부모이고 네 장 모두 35~75%, 교착 0이다", () => {
  const output = execFileSync(
    process.execPath,
    [path.join(root, "tools", "family-balance.cjs")],
    { encoding: "utf8" }
  );
  assert.match(output, /교착 0 건/);
  const rates = Object.fromEntries(
    [...output.matchAll(/^\s+(재이|태오|아빠|엄마)\s+(\d+)%/gm)]
      .map((match) => [match[1], Number(match[2])])
  );
  assert.ok(rates["재이"] > rates["태오"]);
  assert.ok(rates["태오"] > rates["아빠"]);
  assert.ok(rates["태오"] > rates["엄마"]);
  Object.values(rates).forEach((rate) => assert.ok(rate >= 35 && rate <= 75));
});

test("가족 필살기 문항은 카드당 5개이며 가족 사실과 실제 기술을 묻는다", () => {
  const gates = gatesRuntime();
  familyIds.forEach((id) => {
    assert.equal(gates.countForCard(id), 5, id);
    assert.equal(gates.storyIdForCard(id), "family:" + id);
    gates.all.filter((item) => item.cardId === id).forEach((item) => {
      assert.equal(item.source.kind, "local_metadata");
      assert.equal(item.source.refs.some((ref) => /^audio:/i.test(ref)), false);
    });
  });
  const correctText = (id) => {
    const item = gates.all.find((question) => question.id === id);
    return item.choices.find((choice) => choice.id === item.correctChoiceId).text;
  };
  assert.equal(correctText("jaei-biggest-move"), byId.get("jaei").attacks.at(-1).name);
  assert.equal(correctText("taeo-first-move"), byId.get("taeo").attacks.find((attack) => attack.cost === 1).name);
  assert.equal(correctText("appa-first-move"), byId.get("appa").attacks.find((attack) => attack.cost === 1).name);
  assert.equal(correctText("eomma-second-move"), byId.get("eomma").attacks.find((attack) => attack.cost === 2).name);
});

test("수학 연속일 해금과 폰 세로 7버튼 가로 스크롤 계약이 코드에 있다", () => {
  const app = fs.readFileSync(path.join(root, "js", "app.js"), "utf8");
  const css = fs.readFileSync(path.join(root, "styles.css"), "utf8");
  assert.match(app, /localStorage\.getItem\("math10_state"\)/);
  assert.match(app, /\^streak\(3\|7\)\$/);
  assert.match(app, /수학을 " \+ days \+ "일 이어서 하면 만날 수 있어!/);
  assert.match(css, /@media \(max-width: 680px\) and \(orientation: portrait\)[\s\S]*?\.in-battle \.action-list[\s\S]*?overflow-x: auto/);
  assert.equal(byId.get("taeo").attacks.length + 3, 7);
});

