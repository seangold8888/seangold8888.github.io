"use strict";
const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const B = require("../js/boss-stage.js");
const C = require("../js/campaign.js");

const read = name => fs.readFileSync(path.join(__dirname, "..", name), "utf8");
const data = JSON.parse(read("cards.json"));
const allCards = data.cards;

function memoryStorage(initial) {
  const store = new Map(Object.entries(initial || {}));
  return {getItem: key => (store.has(key) ? store.get(key) : null), setItem: (key, value) => store.set(key, String(value)), store};
}

test("boss list follows the expedition bosses in chapter order, each with lines", () => {
  const bosses = C.CHAPTERS.filter(row => row.boss).map(row => ({id: row.boss, chapter: row.id}));
  assert.deepEqual(B.BOSSES.map(boss => ({...boss})), bosses);
  for (const boss of B.BOSSES) {
    const lines = B.linesFor(boss.id);
    for (const key of ["intro", "rage", "defeat"]) assert.ok(lines[key] && lines[key].length <= 40, boss.id + " " + key);
  }
  assert.match(B.linesFor("sseugumi").intro, /쓰구미~/);
  assert.ok(B.linesFor("nobody").intro, "fallback lines");
});

test("Korean subject particle follows the final consonant", () => {
  assert.equal(B.withSubject("눈의 여왕"), "눈의 여왕이");
  assert.equal(B.withSubject("우마왕"), "우마왕이");
  assert.equal(B.withSubject("케르베로스"), "케르베로스가");
  assert.equal(B.withSubject("관우"), "관우가");
});

test("boss HP phases: calm, rage at half, low at a fifth, down at zero", () => {
  assert.equal(B.phaseFor(140, 140), "calm");
  assert.equal(B.phaseFor(71, 140), "calm");
  assert.equal(B.phaseFor(70, 140), "rage");
  assert.equal(B.phaseFor(28, 140), "low");
  assert.equal(B.phaseFor(0, 140), "down");
  assert.equal(B.phaseFor(-5, 0), "down");
});

test("today's boss rotates through all seven bosses over a week, by local date", () => {
  const seen = new Set();
  for (let day = 1; day <= 7; day++) seen.add(B.dailyBoss("2026-11-0" + day).id);
  assert.equal(seen.size, 7);
  assert.equal(B.dailyBoss("2026-10-27").id, B.dailyBoss("2026-11-03").id, "same weekday next week");
  assert.notEqual(B.dailyBoss("2026-10-27").id, B.dailyBoss("2026-10-28").id);
  assert.equal(B.localDay(new Date(2026, 0, 5, 23, 59)), "2026-01-05");
  assert.equal(B.dailyBoss("garbage").id, B.dailyBoss("1970-01-01").id);
});

test("crowns: today's boss once per day, practice bosses never, storage failures are safe", () => {
  const day = "2026-10-27";
  const daily = B.dailyBoss(day).id;
  const other = B.BOSSES.find(boss => boss.id !== daily).id;
  let state = B.loadCrowns(memoryStorage());
  assert.deepEqual(state, {version: 1, crowns: {}, wonDay: ""});
  let result = B.awardCrown(state, other, day);
  assert.equal(result.awarded, false, "practice boss");
  result = B.awardCrown(state, daily, day);
  assert.equal(result.awarded, true);
  assert.equal(result.state.crowns[daily], 1);
  assert.equal(B.awardCrown(result.state, daily, day).awarded, false, "once per day");
  const nextDay = "2026-10-28";
  const tomorrow = B.awardCrown(result.state, B.dailyBoss(nextDay).id, nextDay);
  assert.equal(tomorrow.awarded, true);
  assert.equal(B.totalCrowns(tomorrow.state), 2);
  assert.equal(B.crownSetComplete(tomorrow.state), false);
  const storage = memoryStorage();
  assert.equal(B.saveCrowns(tomorrow.state, storage), true);
  assert.deepEqual(B.loadCrowns(storage), B.normaliseCrowns(tomorrow.state));
  assert.deepEqual(B.loadCrowns({getItem() { throw Error("blocked"); }}), {version: 1, crowns: {}, wonDay: ""});
  assert.equal(B.saveCrowns(tomorrow.state, {setItem() { throw Error("full"); }}), false);
  assert.deepEqual(B.normaliseCrowns({version: 1, crowns: {tiger: -2, cerberus: 1.5, guanyu: 3, hacker: 9}, wonDay: "x"}),
    {version: 1, crowns: {guanyu: 3}, wonDay: ""});
  const full = {version: 1, crowns: Object.fromEntries(B.BOSSES.map(boss => [boss.id, 1])), wonDay: day};
  assert.equal(B.crownSetComplete(full), true);
});

test("boss challenge copies use run-2 boss strength without touching cards.json", () => {
  const before = JSON.stringify(data);
  for (const boss of B.BOSSES) {
    const encounter = C.encounter(boss.chapter, 3, allCards, {run: 2});
    assert.equal(encounter.boss, true);
    assert.equal(encounter.options.aiMistakeRate, 0);
  }
  assert.equal(JSON.stringify(data), before);
});

test("boss stage is wired into the expedition battle flow and loaded before the UI", () => {
  const html = read("index.html");
  const app = read("js/app.js");
  const ui = read("js/campaign-ui.js");
  const css = read("campaign.css");
  assert.ok(html.indexOf("js/boss-stage.js?v=1") > html.indexOf("js/campaign.js?v="));
  assert.ok(html.indexOf("js/boss-stage.js?v=1") < html.indexOf("js/campaign-ui.js?v=72"));
  assert.ok(html.indexOf("js/campaign-ui.js?v=72") < html.indexOf("js/app.js?v=76"));
  assert.match(html, /campaign\.css\?v=72/);
  // 등장 장면 동안 행동을 막고, 끝나면 같은 대결일 때만 턴을 돌려준다.
  assert.match(app, /if \(expedition && expedition\.boss\) \{[\s\S]*?busy = true;[\s\S]*?bossStage\.begin\([\s\S]*?session !== battleSession[\s\S]*?busy = false;/);
  assert.match(app, /if \(bossStage\) bossStage\.reset\(\);\s*battleSession \+= 1;/);
  assert.match(app, /bossStage\.update\(enemy\.hp, enemy\.card\.hp\)/);
  assert.match(app, /bossStage\.defeat\(\)[\s\S]*?Math\.max\(350, bossWait\)/);
  assert.match(ui, /boss: opponent\.boss, final: opponent\.boss && progress\.chapter === 7/);
  assert.match(ui, /if \(challengeBattle && challengeBattle\.serial === serial\) return settleChallenge\(serial, winner\);/);
  assert.match(ui, /if \(!B \|\| progress\.ending < 1\) return null;/);
  assert.match(css, /prefers-reduced-motion: reduce\) \{\s*\.boss-hp-fill/);
});

test("boss stage DOM: intro hands back the turn, rage fires once, defeat waits before the result", () => {
  // Minimal DOM stand-in, enough for createStage. Real rendering is checked by boss-stage-smoke.cjs.
  class Node {
    constructor(tag) { this.tag = tag; this.children = []; this.parent = null; this.dataset = {}; this.style = {setProperty() {}}; this.attrs = {}; this.listeners = {}; this.textContent = ""; this._class = new Set(); }
    get className() { return Array.from(this._class).join(" "); }
    set className(value) { this._class = new Set(String(value).split(/\s+/).filter(Boolean)); }
    get classList() { const set = this._class; return {add: (...n) => n.forEach(x => set.add(x)), remove: (...n) => n.forEach(x => set.delete(x)), contains: n => set.has(n)}; }
    get offsetWidth() { return 1; }
    append(...nodes) { nodes.forEach(n => { n.parent = this; this.children.push(n); }); }
    remove() { if (this.parent) this.parent.children = this.parent.children.filter(n => n !== this); this.parent = null; }
    setAttribute(k, v) { this.attrs[k] = String(v); }
    addEventListener(type, fn) { this.listeners[type] = fn; }
    all() { return this.children.flatMap(n => [n].concat(n.all())); }
    querySelectorAll(selector) { const names = selector.split(",").map(s => s.trim().replace(/^\./, "")); return this.all().filter(n => names.some(name => n._class.has(name))); }
    querySelector(selector) { return this.querySelectorAll(selector)[0] || null; }
  }
  const timers = [];
  const savedGlobals = {document: globalThis.document, matchMedia: globalThis.matchMedia, setTimeout: globalThis.setTimeout, clearTimeout: globalThis.clearTimeout};
  globalThis.document = {createElement: tag => new Node(tag)};
  globalThis.matchMedia = () => ({matches: false});
  globalThis.setTimeout = (fn, ms) => { timers.push({fn, ms, done: false}); return timers.length; };
  globalThis.clearTimeout = id => { if (timers[id - 1]) timers[id - 1].done = true; };
  const flush = () => { for (let i = 0; i < timers.length; i++) if (!timers[i].done) { timers[i].done = true; timers[i].fn(); } };
  try {
    const arena = new Node("div");
    const stage = B.createStage(arena);
    let handed = 0;
    stage.begin({id: "cerberus", name: "케르베로스", hp: 140}, {where: "3장"}, () => { handed += 1; });
    assert.ok(arena.querySelector(".boss-intro"));
    assert.ok(arena.classList.contains("is-boss-battle"));
    assert.equal(handed, 0);
    flush();
    assert.equal(handed, 1);
    assert.equal(arena.querySelector(".boss-intro"), null);
    const bar = arena.querySelector(".boss-hp");
    assert.equal(bar.querySelector(".boss-hp-value").textContent, "140 / 140");
    stage.update(100, 140);
    assert.equal(arena.classList.contains("is-boss-rage"), false);
    stage.update(60, 140);
    assert.equal(arena.classList.contains("is-boss-rage"), true);
    flush();
    const banners = arena.all().filter(n => n._class.has("boss-banner"));
    assert.equal(banners.length, 0, "banner removed after its time");
    stage.update(50, 140);
    assert.equal(timers.filter(t => !t.done).length, 0, "rage only once");
    const wait = stage.defeat();
    assert.ok(wait >= 1000);
    assert.ok(arena.querySelector(".boss-defeat"));
    assert.equal(bar.querySelector(".boss-hp-value").textContent, "0 / 140");
    stage.reset();
    assert.equal(arena.children.length, 0);
    assert.equal(stage.isActive(), false);
  } finally {
    Object.assign(globalThis, savedGlobals);
  }
});
