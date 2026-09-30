"use strict";
const test = require("node:test"), assert = require("node:assert/strict"), fs = require("node:fs"), path = require("node:path"), vm = require("node:vm"), crypto = require("node:crypto");
const root = path.resolve(__dirname, "../..");
function playerFixture() {
  const elements = [], callbacks = [], documentEvents = {}, windowEvents = {};
  class Audio {
    constructor(src) { this.src = src; this.paused = true; this.currentTime = 0; this.volume = 0; elements.push(this); }
    addEventListener() {}
    play() { this.paused = false; return Promise.resolve(); }
    pause() { this.paused = true; }
  }
  const document = { hidden: false, addEventListener(type, callback) { documentEvents[type] = callback; } };
  const window = { localStorage: { getItem() { return null; }, setItem() {} }, setTimeout(fn) { callbacks.push(fn); return callbacks.length; }, addEventListener(type, callback) { windowEvents[type] = callback; } };
  vm.runInNewContext(fs.readFileSync(path.join(root, "assets/bgm/bgm-player.js"), "utf8"), {window, document, Audio});
  return {elements, window, document, documentEvents, windowEvents, settle() { for (let i = 0; callbacks.length && i < 100; i++) callbacks.shift()(); }};
}
test("both kart scenes use the versioned original candy cue without changing other games", () => {
  const q = playerFixture(), p = q.window.HubBgm.create({basePath: "../assets/bgm/", volume: .66});
  for (const scene of ["kart", "kart3d", "cards-menu"]) {
    p.setTrack(scene);
    assert.equal(p.track(), scene);
    assert.ok(q.elements.at(-1).src.endsWith(scene === "cards-menu" ? "cards-menu.mp3" : "kart-candy-parade-v1.mp3"));
    assert.equal(q.elements.at(-1).loop, true);
  }
  assert.equal(p.isPlaying(), false, "no sound before user gesture");
  q.documentEvents.pointerdown(); q.settle();
  assert.equal(p.state().volume, .66); assert.equal(p.isPlaying(), true);
  p.setMuted(true); q.settle(); assert.equal(p.state().paused, true);
  p.setMuted(false); q.settle(); assert.equal(p.isPlaying(), true);
  q.document.hidden = true; q.documentEvents.visibilitychange(); q.settle(); assert.equal(p.state().paused, true);
  q.document.hidden = false; q.documentEvents.visibilitychange(); q.settle(); assert.equal(p.isPlaying(), true);
  q.windowEvents.pagehide(); q.settle(); assert.equal(p.state().paused, true);
  q.windowEvents.pageshow(); q.settle(); assert.equal(p.isPlaying(), true);
  p.stop(); q.settle(); assert.equal(p.isPlaying(), false);
});
test("new cue and player revision are deployed without erasing previous music or making all music core assets", () => {
  const info = JSON.parse(fs.readFileSync(path.join(root, "assets/bgm/kart-candy-parade-v1.json")));
  const bytes = fs.readFileSync(path.join(root, "assets/bgm", info.file));
  assert.equal(bytes.length, info.measured.sizeBytes);
  assert.equal(crypto.createHash("sha256").update(bytes).digest("hex"), info.measured.sha256);
  assert.equal(info.measured.durationSeconds, 30); assert.ok(info.measured.truePeakDbfs < -2);
  for (const game of ["kart", "kart3d"]) {
    assert.match(fs.readFileSync(path.join(root, game, "index.html"), "utf8"), /bgm-player\.js\?v=67/);
    const music = fs.readFileSync(path.join(root, game, "src/music.js"), "utf8");
    assert.match(music, /if \(file && !userBuf\)/, "private uploaded music still takes precedence");
    assert.ok(fs.existsSync(path.join(root, "assets/bgm", game + ".mp3")), "previous cue retained");
  }
  const sw = require("../../sw.js");
  assert.ok(sw.CORE_SHELL.includes("./assets/bgm/bgm-player.js?v=67"));
  assert.ok(!sw.CORE_SHELL.some(s => s.includes(info.file)), "new music is cached on demand, not forced on install");
});
