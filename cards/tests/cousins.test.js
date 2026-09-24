"use strict";
// 사촌 윤찬(10세)·윤건(7세) 카드: 그림·가족 목표·문제 관문·등급이 모두 붙어 있어야 한다.
const test = require("node:test"), assert = require("node:assert/strict"), fs = require("node:fs"), path = require("node:path"), vm = require("node:vm");
const root = path.resolve(__dirname, "..");
const data = JSON.parse(fs.readFileSync(path.join(root, "cards.json"), "utf8"));

test("윤찬·윤건은 가족 카드 뒤, 컬렉션 맨 끝에 온다", () => {
  assert.deepEqual(data.collection.slice(-3), ["jaewing", "yunchan", "yungeon"]);
  for (const id of ["yunchan", "yungeon"]) {
    const card = data.cards.find(c => c.id === id);
    assert.ok(card, id);
    assert.ok(fs.existsSync(path.join(root, "art", id + ".webp")), id + " webp");
    assert.ok(card.lore && card.attacks.length === 3, id);
  }
});

test("가족 목표는 나이와 강함 순서를 따른다: 재이 > 태오 > 엄마 > 윤찬 > 아빠 > 윤건", () => {
  const g = data.familyUnlockGoals;
  const order = ["jaei", "taeo", "eomma", "yunchan", "appa", "yungeon"];
  for (let i = 1; i < order.length; i++) {
    assert.ok(g[order[i - 1]].studyDays > g[order[i]].studyDays, order[i - 1] + " days");
    assert.ok(g[order[i - 1]].problems > g[order[i]].problems, order[i - 1] + " problems");
  }
});

test("둘 다 문제 관문 5개 이상과 A등급을 가진다", () => {
  const ctx = { window: {} }; ctx.globalThis = ctx;
  vm.runInNewContext(fs.readFileSync(path.join(root, "js", "story-gates.js"), "utf8"), ctx);
  const gates = ctx.window.CardStoryGates;
  vm.runInNewContext(fs.readFileSync(path.join(root, "js", "card-view.js"), "utf8"), ctx);
  for (const id of ["yunchan", "yungeon"]) {
    assert.equal(gates.cardStories[id], "family:" + id);
    assert.ok(gates.countForCard(id) >= 5, id);
    assert.equal(ctx.window.CardView.battleTier({ id }), "A", id);
  }
});
