"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const crypto = require("node:crypto");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");
const Engine = require("../js/engine.js");

const root = path.join(__dirname, "..");
const data = JSON.parse(fs.readFileSync(path.join(root, "cards.json"), "utf8"));
const newIds = [
  "guanyu", "zhangfei", "zhaoyun", "zhugeliang", "caocao", "simayi",
  "nezha", "erlangshen", "wumawang", "honghaier", "baigujing"
];
const eastIds = ["sunwukong", ...newIds];
const get = id => data.cards.find(card => card.id === id);

function loadGates() {
  const sandbox = { window: {} };
  vm.runInNewContext(fs.readFileSync(path.join(root, "js", "story-gates.js"), "utf8"), sandbox);
  return sandbox.window.CardStoryGates;
}

test("동양 확장 11장은 가족 4장이 붙은 뒤에도 그대로다", () => {
  assert.equal(data.cards.length, 71);
  assert.equal(data.collection.length, 71);
  assert.equal(new Set(data.collection).size, 71);
  assert.deepEqual(data.collection.slice(40, 51), newIds, "동양 11장 순서는 새 확장 뒤에도 고정된다");
  assert.deepEqual(
    data.cards.slice(0, 55).reduce((counts, card) => {
      counts[card.type] = (counts[card.type] || 0) + 1;
      return counts;
    }, {}),
    { brave: 14, wise: 14, magic: 13, monster: 14 },
    "첫 55장의 타입 분포는 새 확장 뒤에도 고정된다"
  );
  eastIds.forEach(id => assert.equal(Engine.isBattleCard(get(id)), true, id));
});

test("동양 12장 능력치·해금·손오공 v1 기술이 설계 계약과 일치한다", () => {
  const expected = {
    guanyu: ["brave", 3, 90, "reduce_dmg_10", "game:sanguo/hulao", [4, 5, 1]],
    zhangfei: ["brave", 2, 100, "boost_20_below_half", "game:sanguo/changban", [2, 4, 2]],
    zhaoyun: ["brave", 3, 60, "coin_evade", "game:sanguo/changban", [2, 3, 3]],
    zhugeliang: ["wise", 3, 60, "first_hit_zero", "game:sanguo/chushi", [4, 3, 3]],
    caocao: ["wise", 2, 70, "reduce_dmg_10", "game:sanguo/guandu", [4, 4, 3]],
    simayi: ["wise", 2, 70, "boost_20_below_half", "game:sanguo/chushi", [4, 3, 4]],
    sunwukong: ["magic", 3, 90, "coin_evade", "sunwukong", [5, 4, 4]],
    nezha: ["magic", 2, 60, "revive_half_once", "game:sanguo/heavenpalace", [4, 3, 2]],
    erlangshen: ["magic", 3, 80, "reduce_dmg_20_monster", "game:sanguo/heavenpalace", [3, 5, 4]],
    wumawang: ["monster", 3, 120, "reduce_dmg_10", "game:sanguo/flamemountain", [5, 5, 1]],
    honghaier: ["monster", 2, 50, "boost_20_below_half", "game:sanguo/huoyundong", [5, 2, 1]],
    baigujing: ["monster", 2, 50, "coin_evade", "game:sanguo/baihuling", [3, 3, 3]]
  };
  for (const [id, spec] of Object.entries(expected)) {
    const card = get(id);
    assert.deepEqual(
      [card.type, card.rarity, card.hp, card.passive?.fx, card.unlock,
        [card.stats.attack, card.stats.defense, card.stats.spirit]],
      spec,
      id
    );
    card.attacks.forEach(attack => {
      assert.equal(attack.dmg % 10, 0, id + " / " + attack.name);
      assert.ok(attack.vfx?.kind && attack.vfx?.emoji, id + " / " + attack.name);
    });
  }
  assert.deepEqual(get("sunwukong").attacks.map(attack => [attack.name, attack.cost, attack.dmg, attack.fx]), [
    ["여의봉 연타", 1, 10, "dmg_stack_10"],
    ["근두운 급습", 2, 30, null],
    ["여의봉 크게!", 3, 50, null]
  ]);
});

test("게임 클리어 해금은 카드와 삼국지 승리 저장 양쪽에 연결된다", () => {
  const app = fs.readFileSync(path.join(root, "js", "app.js"), "utf8");
  const sanguo = fs.readFileSync(path.join(root, "..", "sanguo", "src", "game", "sideScroller.js"), "utf8");
  assert.match(app, /function isGameDone\(token\)/);
  assert.match(app, /localStorage\.getItem\("sanguo_clear_" \+ stage\) === "1"/);
  assert.match(app, /card\.unlock\.indexOf\("game:"\) === 0/);
  assert.match(app, /\? "에서 이기면 "/);
  assert.match(sanguo, /if \(win\) \{[\s\S]*?localStorage\.setItem\('sanguo_clear_' \+ stageKey, '1'\)/);
  for (const id of newIds) assert.ok(get(id).unlock.startsWith("game:sanguo/"), id);
});

test("동양 12장 모두 필살기 문항 5개와 실제 이야기 출처를 가진다", () => {
  const gates = loadGates();
  eastIds.forEach(id => {
    assert.equal(gates.countForCard(id), 5, id);
    assert.equal(gates.storyIdForCard(id), get(id).unlock, id);
    const questions = gates.all.filter(question => question.cardId === id);
    assert.equal(new Set(questions.map(question => question.id)).size, 5, id);
    questions.forEach(question => {
      assert.equal(question.choices.length, 3, question.id);
      assert.ok(question.choices.some(choice => choice.id === question.correctChoiceId), question.id);
      assert.ok(question.source.refs.length > 0, question.id);
      if (id !== "sunwukong") assert.match(question.source.refs[0], /^sanguo\//, question.id);
    });
  });
});

test("신규 원화 22개는 검수 매니페스트와 일치하고 손오공 원화는 재생성하지 않는다", () => {
  const files = newIds.flatMap(id => [id + ".png", id + ".webp"]).sort();
  const sha = value => crypto.createHash("sha256").update(value).digest("hex");
  const manifest = files.map(name => {
    const file = path.join(root, "art", name);
    assert.ok(fs.existsSync(file), name);
    return name + ":" + sha(fs.readFileSync(file));
  }).join("\n");
  assert.equal(files.length, 22);
  assert.equal(sha(manifest), "e2292d58c1e376f13c76c955ac6c1b41f4bf2546ccfeefeb69a8e1246c35bc7f");
  assert.ok(fs.existsSync(path.join(root, "art", "sunwukong.png")));
  assert.ok(fs.existsSync(path.join(root, "art", "sunwukong.webp")));
});

test("동양 12장은 1200회 교차 자동대전에서 150행동 안에 모두 끝난다", () => {
  const opponents = ["heracles", "perseus", "odysseus", "polyphemus", "medusa",
    "midas", "zeus", "minotaur", "athena", "prometheus"];
  let matches = 0;
  let longest = 0;
  for (const id of eastIds) {
    for (const opponentId of opponents) {
      for (let seed = 1; seed <= 5; seed++) {
        for (const eastFirst of [true, false]) {
          let value = seed;
          const rng = () => {
            value = (Math.imul(value, 1664525) + 1013904223) >>> 0;
            return value / 4294967296;
          };
          let state = Engine.createGame(
            get(eastFirst ? id : opponentId),
            get(eastFirst ? opponentId : id)
          );
          let actions = 0;
          while (!state.winner && actions < 150) {
            state = Engine.performAction(
              state,
              Engine.chooseAiAction(state, rng) || { type: "rest" },
              rng
            );
            assert.equal(state.events.some(event => event.type === "invalid_action"), false);
            actions++;
          }
          assert.ok(state.winner, id + " vs " + opponentId + " seed " + seed);
          longest = Math.max(longest, actions);
          matches++;
        }
      }
    }
  }
  assert.equal(matches, 1200);
  assert.ok(longest <= 80, "동양 카드 대전이 너무 길다: " + longest);
});
