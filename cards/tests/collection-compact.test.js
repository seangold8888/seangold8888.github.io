"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");

const cardsRoot = path.join(__dirname, "..");
const siteRoot = path.join(cardsRoot, "..");
const data = JSON.parse(fs.readFileSync(path.join(cardsRoot, "cards.json"), "utf8"));
const html = fs.readFileSync(path.join(cardsRoot, "index.html"), "utf8");
const app = fs.readFileSync(path.join(cardsRoot, "js", "app.js"), "utf8");
const viewSource = fs.readFileSync(path.join(cardsRoot, "js", "card-view.js"), "utf8");
const css = fs.readFileSync(path.join(cardsRoot, "styles.css"), "utf8");
const sw = fs.readFileSync(path.join(siteRoot, "sw.js"), "utf8");

class FakeElement {
  constructor(tagName) {
    this.tagName = tagName.toUpperCase();
    this.className = "";
    this.children = [];
    this.attributes = new Map();
    this.dataset = {};
    this.style = {};
    this.hidden = false;
    this.textContent = "";
    this.classList = {
      add: (...names) => {
        const set = new Set(this.className.split(/\s+/).filter(Boolean));
        names.forEach((name) => set.add(name));
        this.className = [...set].join(" ");
      },
      contains: (name) => this.className.split(/\s+/).includes(name),
    };
  }
  append(...nodes) { nodes.forEach((node) => this.appendChild(node)); }
  appendChild(node) { this.children.push(node); return node; }
  setAttribute(name, value) { this.attributes.set(name, String(value)); }
  getAttribute(name) { return this.attributes.get(name) || null; }
  addEventListener() {}
}

function walk(node) {
  return [node].concat((node.children || []).flatMap(walk));
}

function hasClass(node, name) {
  return (node.className || "").split(/\s+/).includes(name);
}

function loadCardView() {
  const document = {
    createElement(tag) { return new FakeElement(tag); },
    createTextNode(text) { return { nodeType: 3, textContent: String(text), children: [] }; },
  };
  const sandbox = { window: {}, document };
  vm.runInNewContext(viewSource, sandbox, { filename: "cards/js/card-view.js" });
  return sandbox.window.CardView;
}

test("24장 모두 공격력·방어력·정신력 1~5 별점을 가진다", () => {
  assert.equal(data.cards.length, 24);
  assert.equal(data.collection.length, 24);
  data.cards.forEach((card) => {
    assert.deepEqual(Object.keys(card.stats).sort(), ["attack", "defense", "spirit"]);
    Object.values(card.stats).forEach((value) => {
      assert.equal(Number.isInteger(value), true, card.id);
      assert.ok(value >= 1 && value <= 5, card.id + " stat out of range");
    });
  });
  const byId = new Map(data.cards.map((card) => [card.id, card]));
  assert.deepEqual(byId.get("heracles").stats, { attack: 5, defense: 5, spirit: 1 });
  assert.deepEqual(byId.get("pinocchio").stats, { attack: 2, defense: 2, spirit: 4 });
  assert.deepEqual(byId.get("polyphemus").stats, { attack: 5, defense: 5, spirit: 1 });
  assert.deepEqual(byId.get("fairygodmother").stats, { attack: 1, defense: 4, spirit: 4 });
});

test("컴팩트 카드는 4:5 원화·이름·HP·고정 5칸 별점 세 줄만 렌더한다", () => {
  const CardView = loadCardView();
  const card = data.cards.find((item) => item.id === "heracles");
  const element = CardView.create(card, {
    interactive: true,
    compact: true,
    collectionCompact: true,
  });
  const nodes = walk(element);
  const rows = nodes.filter((node) => hasClass(node, "stat-row"));

  assert.equal(hasClass(element, "is-collection-compact"), true);
  assert.equal(element.getAttribute("aria-haspopup"), "dialog");
  assert.deepEqual(
    element.children.slice(1).map((node) => node.className),
    ["card-art", "card-crown", "card-stats"],
  );
  assert.equal(rows.length, 3);
  assert.deepEqual(rows.map((row) => row.getAttribute("aria-label")), [
    "공격력 5점 만점 5",
    "방어력 5점 만점 5",
    "정신력 1점 만점 5",
  ]);
  assert.deepEqual(rows.map((row) => walk(row).filter((node) => hasClass(node, "stat-star")).length), [5, 5, 5]);
  assert.deepEqual(rows.map((row) => walk(row).filter((node) => hasClass(node, "is-filled")).length), [5, 5, 1]);
  assert.equal(nodes.some((node) => hasClass(node, "card-details")), false);
  assert.match(css, /\.story-card\.is-collection-compact \.card-art \{[\s\S]*?aspect-ratio: 4 \/ 5/);
  assert.deepEqual(rows.map((row) => row.getAttribute("role")), ["img", "img", "img"]);
  assert.match(css, /\.stat-star \{[\s\S]*?clip-path: polygon/);
});

test("컬렉션은 폰 2열·iPad 세로 3열·가로 5열이며 큰 소개 없이 바로 시작한다", () => {
  assert.doesNotMatch(html, /class="hero-copy"/);
  assert.match(css, /grid-template-columns: repeat\(3, minmax\(0, 138px\)\)/);
  assert.match(css, /@media \(min-width: 600px\) and \(orientation: portrait\)[\s\S]*?repeat\(3, minmax\(0, 138px\)\)/);
  assert.match(css, /@media \(min-width: 820px\) and \(orientation: landscape\)[\s\S]*?repeat\(5, minmax\(0, 138px\)\)/);
  assert.match(css, /@media \(max-width: 599px\)[\s\S]*?repeat\(2, minmax\(0, 1fr\)\)/);
  assert.match(css, /@media \(max-height: 599px\) and \(hover: none\) and \(pointer: coarse\)[\s\S]*?repeat\(2, minmax\(0, 138px\)\)/);
  assert.match(css, /\.card-gallery \.story-card\.is-collection-compact \{[\s\S]*?width: 138px;[\s\S]*?min-height: 60px/);
  assert.match(css, /\.collection-toolbar \{[\s\S]*?min-height: 52px/);
  assert.match(css, /\.collection-toolbar \.story-link \{[\s\S]*?min-height: 60px/);
  assert.match(css, /\.story-card\.is-collection-compact \.card-art \{[\s\S]*?width: calc\(100% - 8px\)/);
  assert.match(css, /\.story-card\.is-collection-compact \.stat-row \{ min-height: 14px; \}/);
  assert.match(html, /⚔ 세기[\s\S]*?🛡 튼튼[\s\S]*?✨ 똑똑/);

  const estimatedCardHeight = 1.25 * 138 + 65;
  const portraitGridBottom = 72 + 20 + 8 + 60 + 3 + 24 + 5 + (estimatedCardHeight * 3) + 16;
  const portraitDockTop = 1024 - 20 - 70;
  assert.ok(portraitGridBottom < portraitDockTop, "iPad portrait must show three complete rows above the dock");
});

test("열린 카드는 상세에서만 출전 선택하고 잠긴 카드는 기존 이야기 dialog를 쓴다", () => {
  ["cardDetailDialog", "cardDetailCard", "cardDetailTitle", "cardDetailStatus", "detailSelectButton", "lockedDialog"]
    .forEach((id) => assert.match(html, new RegExp('id="' + id + '"')));
  const lockedStart = html.indexOf('id="lockedDialog"');
  const lockedEnd = html.indexOf("</dialog>", lockedStart);
  const detailStart = html.indexOf('id="cardDetailDialog"');
  assert.ok(lockedStart >= 0 && lockedEnd > lockedStart && detailStart > lockedEnd);
  const collectionBlock = app.slice(app.indexOf("function renderCollection()"), app.indexOf("function closeCardDetail()"));
  const detailBlock = app.slice(app.indexOf("function openCardDetail"), app.indexOf("function selectCard"));
  assert.match(collectionBlock, /if \(locked\) \{[\s\S]*?openLockedDialog\(card\);[\s\S]*?return;[\s\S]*?openCardDetail\(chosenCard, chosenElement\)/);
  assert.doesNotMatch(collectionBlock, /selectCard\(/);
  assert.match(detailBlock, /cardDetailDialog\.showModal\(\)/);
  assert.match(detailBlock, /detailSelectButton\.disabled = !playable/);
  assert.match(app, /detailSelectButton\.addEventListener\("click"[\s\S]*?selectCard\(detailCard, detailOrigin\)/);
  assert.match(app, /origin && origin\.isConnected[\s\S]*?origin\.focus/);
});

test("양쪽 전투 카드가 같은 3줄 별점 렌더러를 사용하고 캐시는 v25다", () => {
  assert.match(app, /syncBattleCard\(dom\.playerCardSlot/);
  assert.match(app, /syncBattleCard\(dom\.enemyCardSlot/);
  assert.match(app, /CardView\.create\(side\.card, \{[\s\S]*?compact: true/);
  assert.match(viewSource, /else if \(options\.compact\) \{[\s\S]*?crown, stats, art/);
  assert.equal((html.match(/\?v=25/g) || []).length, 7);
  assert.doesNotMatch(html, /\?v=24/);
  assert.match(sw, /const CACHE_VERSION = "v25"/);
  assert.equal((sw.match(/\.\/cards\/[^"\n]+\?v=25/g) || []).length, 7);
});
