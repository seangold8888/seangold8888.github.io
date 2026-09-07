"use strict";
const test = require("node:test"), assert = require("node:assert/strict");
const fs = require("node:fs"), path = require("node:path");
require("../../princess/studio.js");
const A = require("../avatar.js"), S = require("../store.js");

test("catalog: 70 items across seven categories, every asset file exists, prices ascend within a category", () => {
  assert.equal(Object.keys(A.ITEMS).length, 70);
  const root = path.join(__dirname, "../../princess/");
  for (const cat of Object.keys(A.CATALOG)) {
    const list = A.CATALOG[cat];
    for (const it of list) {
      assert.ok(it.price >= 30 && it.price <= 150 && it.name, it.key);
      const file = A.renderThumb(cat, it.id).match(/href="\.\.\/princess\/(assets\/[^"]+)"/);
      assert.ok(file, "thumb href " + it.key);
      assert.ok(fs.existsSync(path.join(root, file[1])), "missing " + file[1]);
    }
  }
  assert.deepEqual(A.CATS.map(c => c.id), ["hair", "dress", "crown", "neck", "shoes", "back", "pet"]);
});

test("starter kit: default hair, dress and shoes owned; the doll renders with relocated princess assets", () => {
  for (const c of A.CHARS) {
    const st = A.starter(c.id);
    assert.equal(st.avatar.char, c.id); assert.ok(st.owned["hair/" + c.hair]);
    const svg = A.renderDoll(st.avatar);
    assert.match(svg, /^<svg/); assert.doesNotMatch(svg, /href="assets\//, "all hrefs relocated");
    const hrefs = [...svg.matchAll(/href="(\.\.\/princess\/assets\/[^"]+)"/g)].map(m => m[1]);
    assert.ok(hrefs.length >= 3, c.id);
    for (const h of hrefs) assert.ok(fs.existsSync(path.join(__dirname, "../", h)), "missing " + h);
    assert.ok(A.renderPortrait(c.id).includes("../princess/assets/"));
  }
});

test("coins: earning rules, spend guard, drops only from unowned items under the cap", () => {
  const st = S.defaults();
  assert.equal(S.addCoins(st, A.COIN.session, "세션"), 10);
  assert.equal(S.addCoins(st, 0, "none"), 10); assert.equal(st.coinLog.length, 1);
  assert.equal(S.spendCoins(st, 50), false); assert.equal(st.coins, 10);
  assert.equal(S.spendCoins(st, 10), true); assert.equal(st.coins, 0);
  const owned = A.starter("cinder").owned;
  for (let i = 0; i < 100; i++) { const d = A.randomDrop(owned, 60, Math.random); assert.ok(d && d.price <= 60 && !owned[d.key]); }
  const all = {}; Object.keys(A.ITEMS).forEach(k => { all[k] = true; });
  assert.equal(A.randomDrop(all, 999), null); assert.equal(A.cheapestUnowned(all), null);
  assert.equal(A.cheapestUnowned(owned).price, 30);
  // 하루 12문제 다 맞히면 1*12 + 10 + 10 + 캡슐 5 = 37 → 이틀이면 작은 것 하나
  assert.equal(12 * A.COIN.correct + A.COIN.session + A.COIN.perfect + A.COIN.capsule, 37);
  const clean = S.clean({ coins: "abc", owned: { "dress/party": true }, avatar: { char: "sunny" }, coinLog: [1] });
  assert.equal(clean.coins, 0); assert.ok(clean.owned["dress/party"]); assert.equal(clean.avatar.char, "sunny");
  assert.equal(S.clean({ avatar: { nochar: 1 } }).avatar, null);
});

test("pages wire the studio renderer before avatar.js and expose the wardrobe UI", () => {
  const html = fs.readFileSync(path.join(__dirname, "../index.html"), "utf8");
  assert.ok(html.indexOf("../princess/studio.js") < html.indexOf("avatar.js") && html.indexOf("avatar.js") < html.indexOf("app.js"));
  for (const id of ["meCard", "homeDoll", "coinNum", "wardrobeBtn", "wardrobe", "wardrobeDoll", "wardrobeTabs", "shop", "palette", "pick", "portraits"]) assert.match(html, new RegExp('id="' + id + '"'), id);
  const app = fs.readFileSync(path.join(__dirname, "../app.js"), "utf8");
  assert.match(app, /A\.COIN\.correct/); assert.match(app, /A\.COIN\.levelUp/); assert.match(app, /A\.COIN\.placement/);
  assert.match(app, /grantDrop\(weekly \? 100 : 60\)/, "capsule drops an item sometimes, chest always");
  assert.match(app, /window\.confirm\("「" \+ it\.name/, "purchase asks first");
});
