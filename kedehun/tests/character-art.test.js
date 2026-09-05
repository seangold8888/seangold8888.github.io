"use strict";

const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");
const vm = require("node:vm");

const siteRoot = path.resolve(__dirname, "..", "..");
const gameRoot = path.join(siteRoot, "kedehun");
const htmlPath = path.join(gameRoot, "index.html");
const html = fs.readFileSync(htmlPath, "utf8");
const sw = require(path.join(siteRoot, "sw.js"));

const heroes = ["lumi", "mira", "joy"];

function pngSize(filePath) {
  const bytes = fs.readFileSync(filePath);
  assert.deepEqual([...bytes.subarray(0, 8)], [137, 80, 78, 71, 13, 10, 26, 10]);
  return {
    width: bytes.readUInt32BE(16),
    height: bytes.readUInt32BE(20),
  };
}

test("all inline scripts remain valid JavaScript", () => {
  const scripts = [...html.matchAll(/<script[^>]*>([\s\S]*?)<\/script>/g)];
  assert.ok(scripts.length >= 2);
  scripts.forEach((match, index) => {
    assert.doesNotThrow(() => new vm.Script(match[1], { filename: `kedehun-inline-${index}.js` }));
  });
});

test("the three playable heroes share one local high-resolution art set", () => {
  for (const hero of heroes) {
    const relative = `art/characters/${hero}-v2.png?v=27`;
    assert.ok(html.includes(relative), relative);
    assert.match(html, new RegExp(`<link rel="preload" as="image" href="${relative.replace("?", "\\?")}">`));

    const filePath = path.join(gameRoot, "art", "characters", `${hero}-v2.png`);
    assert.ok(fs.existsSync(filePath), filePath);
    assert.deepEqual(pngSize(filePath), { width: 1024, height: 1536 });
    assert.ok(fs.statSync(filePath).size > 500_000, `${hero} art is unexpectedly small`);
    assert.ok(fs.statSync(filePath).size < 8_000_000, `${hero} art is too large for an iPad game`);
  }

  assert.doesNotMatch(html, /src:\s*["'](?:https?:|data:)/);
  assert.match(html, /const characterArtCache = new Map\(\)/);
  assert.match(html, /Promise\.allSettled/);
});

test("combat uses explicit, deterministic character states", () => {
  const match = html.match(/function resolvePlayerArtState\(player\) \{[\s\S]*?\n\}/);
  assert.ok(match, "resolvePlayerArtState");
  const context = {};
  vm.runInNewContext(`${match[0]}; resolve = resolvePlayerArtState;`, context);

  const base = {
    dead: false, ultimate: 0, hurt: 0, dash: 0, attack: 0,
    attackStep: 0, grounded: true, vy: 0, vx: 0,
  };
  assert.equal(context.resolve(base), "idle");
  assert.equal(context.resolve({ ...base, vx: 100 }), "run");
  assert.equal(context.resolve({ ...base, grounded: false, vy: -1 }), "jump");
  assert.equal(context.resolve({ ...base, grounded: false, vy: 1 }), "fall");
  assert.equal(context.resolve({ ...base, attack: 1, attackStep: 2 }), "attack3");
  assert.equal(context.resolve({ ...base, dash: 1, attack: 1 }), "dash");
  assert.equal(context.resolve({ ...base, hurt: 1, dash: 1 }), "hurt");
  assert.equal(context.resolve({ ...base, ultimate: 1, hurt: 1 }), "ultimate");
  assert.equal(context.resolve({ ...base, dead: true, ultimate: 1 }), "dead");

  assert.match(html, /invulnerable: 0, hurt: 0/);
  assert.match(html, /p\.hurt = Math\.max\(0, p\.hurt - dt\)/);
  assert.match(html, /p\.hurt = 0\.3/);
});

test("generated art is reused in battle, selection, HUD and story with safe fallbacks", () => {
  assert.match(html, /drawGeneratedPlayer\(ctx, p, g, this\.ambient, this\.reduced\)/);
  assert.match(html, /ctx\.drawImage\(image, -width \* \.5, -height \+ spec\.footOffset, width, height\)/);
  assert.match(html, /function makeCharacterPortrait\(id, w, h\)/);
  assert.match(html, /return makeCharacterPortrait\(id, w, h\)/);
  assert.match(html, /return makePortraitCanvas\(id, w, h\)/);
  assert.match(html, /replaceChild\(fallback, image\)/);

  const portraitStart = html.indexOf("function portraitEl(id, w, h)");
  const portraitEnd = html.indexOf("function refreshPortraits", portraitStart);
  const portraitSource = html.slice(portraitStart, portraitEnd);
  assert.ok(portraitSource.indexOf("photos.get(id)") < portraitSource.indexOf("makeCharacterPortrait"));
  assert.match(html, /option\.append\(card, tools\)/);
  assert.doesNotMatch(html, /card\.querySelector\('\.guardian-card-content'\)\.append\(tools\)/);
  assert.match(html, /guardian-mark > img\.character-portrait-art \{[\s\S]*?scale\(3\)/);

  const renderStart = html.indexOf("drawPlayer(frameAlpha) {");
  const renderEnd = html.indexOf("drawEnemy(", renderStart);
  const renderSource = html.slice(renderStart, renderEnd);
  assert.doesNotMatch(renderSource, /new Image\(/);
  assert.match(renderSource, /if \(drawGeneratedPlayer/);
  assert.doesNotMatch(html.match(/function drawGeneratedPlayer[\s\S]*?\n\}/)[0], /new Image\(/);
  const combatHeights = [...html.matchAll(/combatHeight: (\d+)/g)].map((match) => Number(match[1]));
  assert.deepEqual(combatHeights, [134, 142, 130]);
  assert.ok(combatHeights.every((height) => height >= 120 && height <= 150));
});

test("art loading settles success, failure and an unresponsive request", async () => {
  const loaderStart = html.indexOf("const characterArtCache = new Map();");
  const loaderEnd = html.indexOf("\nfunction getCharacterImage", loaderStart);
  const loaderSource = html.slice(loaderStart, loaderEnd);
  assert.ok(loaderStart >= 0 && loaderEnd > loaderStart);

  class FakeImage {
    constructor() {
      this.listeners = new Map();
      this.decoding = "";
    }
    addEventListener(type, handler) { this.listeners.set(type, handler); }
    set src(value) {
      this._src = value;
      if (value.includes("lumi")) queueMicrotask(() => this.listeners.get("load")?.());
      if (value.includes("mira")) queueMicrotask(() => this.listeners.get("error")?.());
    }
    get src() { return this._src; }
    decode() { FakeImage.decodeCalls += 1; return Promise.resolve(); }
  }
  FakeImage.decodeCalls = 0;

  const context = vm.createContext({
    CHARACTER_ART: {
      lumi: { src: "lumi.png" },
      mira: { src: "mira.png" },
      joy: { src: "joy.png" },
    },
    Image: FakeImage,
    setTimeout: (callback) => setTimeout(callback, 1),
    clearTimeout,
  });
  new vm.Script(loaderSource).runInContext(context);
  const results = await new vm.Script("CHARACTER_ART_READY").runInContext(context);
  assert.deepEqual(Array.from(results, (result) => result.value.loaded), [true, false, false]);
  assert.equal(FakeImage.decodeCalls, 1);
});

test("loading, reduced-motion and offline behavior cover the new art", () => {
  assert.match(html, /refs\.startBtn\.disabled = true/);
  assert.match(html, /CHARACTER_ART_READY\.then/);
  assert.match(html, /refs\.startBtn\.disabled = false/);
  assert.match(html, /@media \(prefers-reduced-motion: reduce\)/);
  assert.match(html, /this\.reduced \? \.74/);
  assert.match(html, /setTimeout\(\(\) => finish\(false\), 7000\)/);
  assert.match(html, /image\.decode\(\)\.catch/);
  assert.match(html, /if \(!characterArtReadyForPlay\) return/);
  // CACHE_VERSION은 사이트 전체가 공유하는 캐시 세대라 다른 게임 업데이트가 올릴 수 있다.
  // 고정값 대신 형식만 확인하고, 캐릭터 아트는 index.html이 요청하는 ?v= 태그 그대로
  // 오프라인 목록에 들어 있는지 본다.
  assert.match(sw.CACHE_VERSION, /^v\d+$/);

  for (const hero of heroes) {
    const tagMatch = html.match(new RegExp(`art/characters/${hero}-v2\\.png\\?v=(\\d+)`));
    assert.ok(tagMatch, `${hero} art must be referenced with a ?v= tag`);
    assert.ok(
      sw.OPTIONAL_SHELL.includes(`./kedehun/art/characters/${hero}-v2.png?v=${tagMatch[1]}`),
      `${hero} must be available offline`,
    );
  }
});
