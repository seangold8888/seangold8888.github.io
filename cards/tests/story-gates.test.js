const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");

const PLAYABLE_CARD_IDS = [
  "heracles",
  "honggildong",
  "perseus",
  "jack",
  "threepigs",
  "odysseus",
  "cinderella",
  "tortoisehare",
  "redhood",
  "pinocchio",
  "fairygodmother",
  "genie",
  "snowqueen",
  "mermaid",
  "polyphemus",
  "wolf",
  "medusa",
  "midas",
  "tiger"
];

function loadStoryGates() {
  const source = fs.readFileSync(
    path.join(__dirname, "..", "js", "story-gates.js"),
    "utf8"
  );
  const sandbox = { window: {} };
  vm.runInNewContext(source, sandbox, { filename: "cards/js/story-gates.js" });
  return sandbox.window.CardStoryGates;
}

test("exports one story gate for every playable card", function () {
  const gates = loadStoryGates();
  const expected = PLAYABLE_CARD_IDS.slice().sort();
  const mappedIds = Object.keys(gates.cardStories).sort();
  const questionCardIds = Array.from(
    gates.all,
    function (question) { return question.cardId; }
  ).sort();

  assert.equal(gates.all.length, 19);
  assert.equal(
    new Set(Array.from(gates.all, function (question) {
      return question.id;
    })).size,
    19
  );
  assert.deepEqual(mappedIds, expected);
  assert.deepEqual(questionCardIds, expected);

  PLAYABLE_CARD_IDS.forEach(function (cardId) {
    const question = gates.getForCard(cardId, function () { return 0; });
    assert.ok(question, "missing question for " + cardId);
    assert.equal(question.cardId, cardId);
    assert.equal(question.storyId, gates.storyIdForCard(cardId));
    assert.equal(
      gates.storyIdForCard({ id: cardId }),
      gates.storyIdForCard(cardId)
    );
  });
});

test("maps Jack and Red Riding Hood to their local story IDs", function () {
  const gates = loadStoryGates();

  assert.equal(gates.storyIdForCard("jack"), "jack_story");
  assert.equal(gates.storyIdForCard({ id: "redhood" }), "redhood_story");
  assert.equal(
    gates.getForCard("jack", function () { return 0; }).storyId,
    "jack_story"
  );
  assert.equal(
    gates.getForCard("redhood", function () { return 0; }).storyId,
    "redhood_story"
  );
});

test("every question has three unique choices and a valid answer", function () {
  const gates = loadStoryGates();

  Array.from(gates.all).forEach(function (question) {
    assert.equal(typeof question.prompt, "string");
    assert.ok(question.prompt.trim(), question.id + " has an empty prompt");
    assert.equal(question.choices.length, 3, question.id);

    const choiceIds = Array.from(question.choices, function (choice) {
      assert.equal(typeof choice.id, "string");
      assert.equal(typeof choice.text, "string");
      assert.ok(choice.id.trim(), question.id + " has an empty choice ID");
      assert.ok(choice.text.trim(), question.id + " has empty choice text");
      return choice.id;
    });
    const choiceTexts = Array.from(question.choices, function (choice) {
      return choice.text.trim();
    });

    assert.equal(new Set(choiceIds).size, 3, question.id + " repeats a choice ID");
    assert.equal(
      new Set(choiceTexts).size,
      3,
      question.id + " repeats choice text"
    );
    assert.ok(
      choiceIds.includes(question.correctChoiceId),
      question.id + " has an invalid correctChoiceId"
    );
    assert.equal(
      question.storyId,
      gates.storyIdForCard(question.cardId),
      question.id + " disagrees with cardStories"
    );
  });
});

test("getForCard uses the supplied rng and returns a deep clone", function () {
  const gates = loadStoryGates();
  let calls = 0;
  const rng = function () {
    calls += 1;
    return 0.75;
  };

  const first = gates.getForCard("cinderella", rng);
  const second = gates.getForCard({ id: "cinderella" }, function () {
    return 0.75;
  });
  const third = gates.getForCard("cinderella", function () { return 0.75; });

  assert.equal(calls, 1);
  assert.equal(first.id, second.id);
  assert.notStrictEqual(first, second);
  assert.notStrictEqual(first.choices, second.choices);
  assert.notStrictEqual(first.choices[0], second.choices[0]);
  assert.notStrictEqual(first.source, second.source);
  assert.notStrictEqual(first.source.refs, second.source.refs);

  first.prompt = "바뀐 질문";
  first.choices[0].text = "바뀐 선택지";
  first.source.refs[0] = "바뀐 출처";
  assert.notEqual(third.prompt, first.prompt);
  assert.notEqual(third.choices[0].text, first.choices[0].text);
  assert.notEqual(third.source.refs[0], first.source.refs[0]);

  assert.equal(
    gates.getForCard("cinderella", function () { return -1; }).id,
    third.id
  );
  assert.equal(
    gates.getForCard("cinderella", function () { return 1; }).id,
    third.id
  );
});

test("unknown or malformed card inputs return null", function () {
  const gates = loadStoryGates();

  assert.equal(gates.getForCard("not-a-card"), null);
  assert.equal(gates.getForCard(null), null);
  assert.equal(gates.getForCard({}), null);
  assert.equal(gates.getForCard("cinderella", null), null);
  assert.equal(gates.storyIdForCard("not-a-card"), null);
  assert.equal(gates.storyIdForCard(null), null);
});

