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
  const sandbox = { window: {CardEngine: require("../js/engine.js")}, document };
  vm.runInNewContext(viewSource, sandbox, { filename: "cards/js/card-view.js" });
  return sandbox.window.CardView;
}

test("동양 확장 51장 모두 공격력·방어력·정신력 1~5 별점을 가진다", () => {
  assert.equal(data.cards.length, 51);
  assert.equal(data.collection.length, 51);
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
  assert.deepEqual(byId.get("polyphemus").stats, { attack: 5, defense: 4, spirit: 1 });
  assert.deepEqual(byId.get("fairygodmother").stats, { attack: 1, defense: 4, spirit: 4 });
});

test("작은 카드는 실제 피해·비용·약점·특성을 표시하고 별점은 상세에 둔다", () => {
  const view = loadCardView();
  const card = data.cards.find(c => c.id === "heracles");
  const compact = view.create(card, {interactive:true, compact:true, collectionCompact:true});
  const nodes = walk(compact);
  assert.equal(nodes.filter(n => hasClass(n, "combat-fact")).length, 3);
  assert.equal(nodes.some(n => hasClass(n, "card-stats")), false);
  const info = view.combatInfo(card);
  const best = card.attacks.slice().sort((a,b) => b.dmg-a.dmg || a.cost-b.cost)[0];
  assert.equal(info.attack, best.dmg + " 피해 · ⭐" + best.cost);
  assert.match(info.weakness, /물에게 피해 \+10/);
  assert.equal(view.combatInfo(data.cards.find(c => c.id === "perseus")).weakness, "🛡 상성 방어");
  assert.equal(view.combatInfo(data.cards.find(c => c.id === "polyphemus")).weakness, "🌳 나무에게 피해 +10");
  const detailed = walk(view.create(card, {}));
  assert.ok(detailed.some(n => n.tagName === "DETAILS" && hasClass(n, "card-reference")));
  assert.ok(detailed.some(n => hasClass(n, "card-stats")));
  const three = data.cards.find(c => c.attacks.length === 3);
  assert.equal(walk(view.create(three, {})).filter(n => hasClass(n, "attack-row")).length, 3);
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
  assert.match(html, /남은 체력[\s\S]*?기본 피해[\s\S]*?약점/);
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

test("양쪽 전투 카드가 같은 전투 정보 렌더러를 사용하고 카드 자산은 v38이다", () => {
  assert.match(app, /syncBattleCard\(dom\.playerCardSlot/);
  assert.match(app, /syncBattleCard\(dom\.enemyCardSlot/);
  assert.match(app, /CardView\.create\(side\.card, \{[\s\S]*?compact: true/);
  assert.match(viewSource, /else if \(options\.compact\) \{[\s\S]*?crown, facts, art/);
  assert.equal((html.match(/\?v=38/g) || []).length, 7);
  assert.doesNotMatch(html, /\?v=(?:25|26|27|28|29|30|31)/);
  assert.equal((sw.match(/\.\/cards\/[^"\n]+\?v=38/g) || []).length, 7);
});

test("오행 속성이 카드 클래스, 원화 배지와 접근성 이름에 함께 드러난다", () => {
  const view = loadCardView();
  const card = data.cards.find(entry => entry.id === "redhood");
  const rendered = view.create(card, {compact: true});
  const nodes = walk(rendered);
  assert.equal(rendered.dataset.element, "wood");
  assert.ok(rendered.classList.contains("element-wood"));
  assert.match(rendered.getAttribute("aria-label"), /🌳 나무/);
  assert.ok(nodes.some(node => hasClass(node, "element-rune") && node.textContent === "🌳 나무"));
  assert.match(css, /\.story-card\.element-wood/);
  assert.match(css, /\.element-rune/);
  for (const element of ["wood", "fire", "earth", "metal", "water"]) {
    assert.match(css, new RegExp("\\.story-card\\.element-" + element + "\\s*\\{"));
  }
  assert.match(css, /--element-pattern:/);
  assert.match(css, /\.frame-ornament::before/);
  assert.match(css, /\.story-card\.element-water \.frame-crest/);
});
