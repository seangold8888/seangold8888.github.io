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

test("five sort choices are stable, leave source data intact and keep ready order as default", () => {
  const view=loadCardView(),before=JSON.stringify(data.cards);
  const unlocked=c=>["jack","redhood"].includes(c.id),playable=()=>true;
  const ready=Array.from(view.sortCollection(data.cards,"ready",unlocked,playable));
  assert.deepEqual(ready.slice(0,2).map(c=>c.id),data.cards.filter(unlocked).map(c=>c.id));
  const hp=Array.from(view.sortCollection(data.cards,"hp",unlocked,playable));
  assert.ok(hp.every((c,i)=>i===0||hp[i-1].hp>=c.hp));
  const name=Array.from(view.sortCollection(data.cards,"name",unlocked,playable));
  assert.ok(name.every((c,i)=>i===0||view.displayName(name[i-1]).localeCompare(view.displayName(c),"ko")<=0));
  const power=c=>Math.max(...c.attacks.filter(require("../js/engine.js").isAttackSupported).map(a=>a.dmg),0);
  const damage=Array.from(view.sortCollection(data.cards,"power",unlocked,playable));
  assert.ok(damage.every((c,i)=>i===0||power(damage[i-1])>=power(c)));
  const order=["wood","fire","earth","metal","water",null];
  const elements=Array.from(view.sortCollection(data.cards,"element",unlocked,playable));
  assert.ok(elements.every((c,i)=>i===0||order.indexOf(elements[i-1].element)<=order.indexOf(c.element)));
  assert.equal(JSON.stringify(data.cards),before);
  assert.deepEqual(Array.from(view.sortCollection(data.cards,"unknown",unlocked,playable)),ready);
});
test("familiar hero names stay consistent without changing stored cards or mechanics", () => {
  const view=loadCardView(),before=JSON.stringify(data.cards);
  for(const [id,name] of Object.entries({gearwing:"아이언 윙",starshield:"캡틴 스타",thunderguard:"토르 썬더",redknot:"블랙 위도",walllizard:"스파이더 키드",neonjumper:"마일스 점퍼",moonmoth:"고스트 스파이더"})) {
    const original=data.cards.find(c=>c.id===id),shown=view.presentCard(original);
    assert.equal(shown.name,name);assert.equal(shown.id,original.id);
    assert.equal(JSON.stringify({...shown,name:original.name}),JSON.stringify(original));
    const nodes=walk(view.create(original,{compact:true,collectionCompact:true}));
    assert.equal(nodes.find(n=>hasClass(n,"card-name")).textContent,name);
  }
  assert.equal(JSON.stringify(data.cards),before);
});
test("collection uses only element identity, without automatic-trait badges", () => {
  const view=loadCardView();
  for(const c of data.cards) {
    const nodes=walk(view.create(c,{compact:true,collectionCompact:true}));
    assert.ok(!nodes.some(n=>hasClass(n,"trait-badge")));
  }
  for(const element of ["all","wood","fire","earth","metal","water"]) {
    assert.deepEqual(Array.from(view.filterCollection(data.cards,element)),
      data.cards.filter(c=>element==="all"||c.element===element));
  }
  assert.doesNotMatch(html,/collectionTrait/);
  assert.match(css,/#collectionGrid \.card-art \.trait-badge \{ display: none !important; \}/);
  assert.match(css,/#collectionGrid \.card-gallery-item \{[^}]*aspect-ratio: 5 \/ 7/);
  assert.match(css,/#collectionGrid \.story-card.is-collection-compact \{[^}]*height: 100%/);
});
test("plain-language abilities explain costs, damage, timing and limits without changing card data", () => {
  const view=loadCardView();
  for(const card of data.cards) {
    assert.ok(view.describePassive(card).length>8,card.id);
    for(const attack of card.attacks)assert.ok(view.describeAttack(attack).length>8,card.id);
  }
  const get=id=>data.cards.find(c=>c.id===id);
  assert.match(view.describePassive(get("redhood")),/30 피해 → 20 피해/);
  assert.match(view.describePassive(get("jack")),/다음 공격은 이 능력으로 피할 수 없어요/);
  assert.match(view.describePassive(get("perseus")),/추가 피해 10/);
  const steal=get("sseugumi").attacks.find(a=>a.fx==="steal_star_1");
  assert.match(view.describeAttack(steal),/별사탕 2개/);
  assert.match(view.describeAttack(steal),/기본 피해는 10/);
  assert.match(view.describeAttack(steal),/5개면 가져오지 못해요/);
  assert.match(view.describeAttack({cost:1,dmg:0,fx:"heal_40"}),/처음 체력보다 높아지지는/);
  assert.match(view.describeAttack({cost:1,dmg:0,fx:"dmg_half_enemy_hp"}),/최소 피해는 10/);
});
test("unlock links follow the actual requirement and never send math cards to the audio theater", () => {
  const box={window:{},document:{addEventListener(){}},location:{hostname:"example.test",search:""},localStorage:{getItem(){return null;}},URLSearchParams};
  const source=app.replace('document.addEventListener("DOMContentLoaded", init);','window.Qa = {unlockDestination, setUnlockLink};');
  vm.runInNewContext(source,box);
  const qa=box.window.Qa;
  for(const [id,href] of [["jaei","../math/"],["taeo","../math/"],["guanyu","../sanguo/"],["circe","../odyssey/"],["cinderella","../story/"]])
    assert.equal(qa.unlockDestination(data.cards.find(c=>c.id===id)).href,href);
  assert.equal(qa.unlockDestination(data.cards.find(c=>c.id==="sseugumi")),null);
  const link={};
  qa.setUnlockLink(link,qa.unlockDestination(data.cards.find(c=>c.id==="jaei")));
  assert.match(link.textContent,/수학 공부/);
  qa.setUnlockLink(link,null);assert.equal(link.hidden,true);
  qa.setUnlockLink(link,{href:"../story/",label:"🎧 이야기 극장으로"});
  assert.equal(link.hidden,false);assert.equal(link.href,"../story/");
});

test("오디세이 확장 75장 모두 공격력·방어력·정신력 1~5 별점을 가진다", () => {
  assert.equal(data.cards.length, 85);
  assert.equal(data.collection.length, 85);
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

test("무속성 카드는 모든 화면에서 속성 보석과 룬을 만들지 않는다", () => {
  const view=loadCardView(),base=data.cards.find(c=>c.id==="sseugumi");
  for(const element of [null,undefined,"unknown"]) for(const options of [{},{compact:true},{compact:true,collectionCompact:true}]) {
    const nodes=walk(view.create({...base,element},options));
    assert.equal(nodes.filter(n=>hasClass(n,"frame-crest")||hasClass(n,"element-rune")).length,0);
  }
  const nodes=walk(view.create(data.cards.find(c=>c.id==="jaei"),{}));
  assert.equal(nodes.filter(n=>hasClass(n,"frame-crest")).length,1);
});

test("컬렉션은 원화·이름·체력·속성만 표시하고 전투 정보는 상세와 대결에 둔다", () => {
  const view = loadCardView();
  const card = data.cards.find(c => c.id === "heracles");
  const compact = view.create(card, {interactive:true, compact:true, collectionCompact:true});
  const nodes = walk(compact);
  assert.equal(nodes.filter(n => hasClass(n, "combat-fact")).length, 0);
  for (const name of ["card-art","card-name","hp-gem","element-rune","collection-tier"])
    assert.ok(nodes.some(n => hasClass(n,name)));
  const tier=nodes.find(n=>hasClass(n,"collection-tier"));
  assert.equal(walk(tier).some(n=>n.tagName === "SMALL"), false, "등급은 글자 하나만 표시한다");
  assert.equal(tier.getAttribute("aria-label"),"실전 등급 "+view.battleTier(card));
  assert.ok(!walk(nodes.find(n=>hasClass(n,"card-art"))).includes(tier));
  assert.equal(walk(view.create(card,{compact:true})).filter(n=>hasClass(n,"combat-fact")).length,3);
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
  assert.match(html, /id="collectionSort"/);
  const artFirstCss=css.slice(css.indexOf("/* v48"));
  assert.match(artFirstCss,/aspect-ratio: 5 \/ 7/);
  assert.match(artFirstCss,/grid-template-columns: repeat\(5, minmax\(0, 1fr\)\)/);
  assert.match(artFirstCss,/grid-template-columns: repeat\(3, minmax\(0, 1fr\)\)/);
  assert.match(artFirstCss,/grid-template-columns: repeat\(2, minmax\(0, 1fr\)\)/);
});

test("잠긴 카드도 상세를 보되 출전은 막고 실제 해금 장소로 안내한다", () => {
  ["cardDetailDialog", "cardDetailCard", "cardDetailTitle", "cardDetailStatus", "detailSelectButton", "lockedDialog"]
    .forEach((id) => assert.match(html, new RegExp('id="' + id + '"')));
  const lockedStart = html.indexOf('id="lockedDialog"');
  const lockedEnd = html.indexOf("</dialog>", lockedStart);
  const detailStart = html.indexOf('id="cardDetailDialog"');
  assert.ok(lockedStart >= 0 && lockedEnd > lockedStart && detailStart > lockedEnd);
  const collectionBlock = app.slice(app.indexOf("function renderCollection()"), app.indexOf("function closeCardDetail()"));
  const detailBlock = app.slice(app.indexOf("function openCardDetail"), app.indexOf("function selectCard"));
  assert.match(collectionBlock, /openCardDetail\(chosenCard, chosenElement\)/);
  assert.doesNotMatch(collectionBlock,/openLockedDialog\(card\)/);
  assert.doesNotMatch(collectionBlock, /selectCard\(/);
  assert.match(detailBlock, /cardDetailDialog\.showModal\(\)/);
  assert.match(detailBlock, /detailSelectButton\.disabled = !playable \|\| !unlocked/);
  assert.match(detailBlock, /setUnlockLink\(dom.detailUnlockLink, unlocked \? null : unlockDestination\(card\)\)/);
  assert.match(app, /detailSelectButton\.addEventListener\("click"[\s\S]*?selectCard\(detailCard, detailOrigin\)/);
  assert.match(app, /origin && origin\.isConnected[\s\S]*?origin\.focus/);
});

test("상세에서 바로 대결하며 하단 재확인과 중복 시작은 없다", () => {
  assert.doesNotMatch(html, /id="(?:selectionDock|battleButton)"/);
  assert.match(html, /id="detailSelectButton"[^>]*>이 카드로 대결 시작/);
  const handler=app.slice(app.indexOf('dom.detailSelectButton.addEventListener("click"'), app.indexOf('dom.cardDetailDialog.addEventListener("click"'));
  assert.match(handler, /!dom.cardDetailDialog.open \|\| !detailCard \|\| !isPlayableCard\(detailCard\) \|\| !isUnlocked\(detailCard\)/);
  assert.match(handler, /selectCard\(detailCard, detailOrigin\);\s*dom.cardDetailDialog.close\("battle"\);\s*startBattle\(\);/);
  assert.match(app, /origin && origin.isConnected && !dom.collectionScreen.hidden/);
  assert.doesNotMatch(app, /updateSelectionDock|dom.battleButton/);
});

test("양쪽 전투 카드가 같은 전투 정보 렌더러를 사용하고 카드·원정 자산은 v54이다", () => {
  assert.match(app, /syncBattleCard\(dom\.playerCardSlot/);
  assert.match(app, /syncBattleCard\(dom\.enemyCardSlot/);
  assert.match(app, /CardView\.create\(side\.card, \{[\s\S]*?compact: true/);
  assert.match(viewSource, /else if \(options\.compact\) \{[\s\S]*?crown, facts, art/);
  assert.equal((html.match(/\?v=59/g) || []).length, 11);
  assert.doesNotMatch(html, /\?v=(?:25|26|27|28|29|30|31)/);
  assert.equal((sw.match(/\.\/cards\/[^"\n]+\?v=59/g) || []).length, 11);
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
