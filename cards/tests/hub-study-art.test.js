"use strict";
const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const crypto = require("node:crypto");
const vm = require("node:vm");
const root = path.resolve(__dirname, "../..");
const html = fs.readFileSync(path.join(root, "index.html"), "utf8");
const workerSource = fs.readFileSync(path.join(root, "sw.js"), "utf8");
const sw = require(path.join(root, "sw.js"));
const hashes = {
  "picnic-scene": "59128aad6f2eec665cff55db39a298034ab7948e9711d26200dced99924200f6",
  "jaei": "24f5bbe5584e3f4d8471b0bb95e5f0ddac87bf301dc93974abb1fea24456f72e",
  "taeo": "b45d9db2a58b58d20e0075e88e16897d480c019a977ee56e3913323606dfbb80",
  "mom": "5e9ba9a46932a6f379a571e4f7bb0024c33241b68de00be1a5c5a0bd628f4611",
  "dad": "cdc415dcd7c7f99f087df8f62fb34910208ebbb61b80b469f8f94f7fc05e4ebf"
};
test("today's study is first and embeds all five unchanged family images", () => {
  assert.ok(html.indexOf('<section id="study"') < html.indexOf('<article class="feature-stage"'));
  assert.match(html, /id="studyTitle">오늘의 공부/);
  for (const [id, hash] of Object.entries(hashes)) {
    const relative = "assets/study/" + id + ".jpg";
    const bytes = fs.readFileSync(path.join(root, relative));
    assert.equal(crypto.createHash("sha256").update(bytes).digest("hex"), hash);
    assert.ok(html.includes('src="' + relative + '"'));
    assert.ok(sw.CORE_SHELL.includes("./" + relative), relative + " must work offline");
  }
});
test("retired picnic game is absent from menu, deployment and cache warmup", () => {
  assert.doesNotMatch(html, /href="picnic\//);
  assert.equal(fs.existsSync(path.join(root, "picnic/index.html")), false);
  assert.ok(!sw.NAVIGATION_ROUTES.includes("picnic"));
  assert.ok(!sw.BACKGROUND_ASSETS.some(asset => asset.startsWith("./picnic/")));
  assert.ok(!sw.CORE_SHELL.some(asset => asset.startsWith("./picnic/")));
});
test("retirement purges only removed games, not family art, other games or story downloads", async () => {
  const start = workerSource.indexOf("      const retiredRoots =");
  const end = workerSource.indexOf("      await self.clients.claim();", start);
  assert.ok(start > 0 && end > start);
  const origin = "https://example.test/hub/";
  const assets = ["picnic/", "picnic/index.html", "picnic", "starkart/src/main.js?v=1", "keycap/", "keycap", "keycap/stl.js?v=1", "picnic-other/", "keycap-other/", "assets/study/jaei.jpg", "story/story.mp3", "cards/index.html"];
  const deleted = [], opened = [];
  await vm.runInNewContext("(async () => {" + workerSource.slice(start, end) + "})()", {
    URL, SITE_ROOT_URL: new URL(origin), STATIC_CACHE: "static", RUNTIME_CACHE: "runtime",
    caches: { open: async name => {
      opened.push(name);
      return { keys: async () => assets.map(asset => ({ url: origin + asset })), delete: async request => { deleted.push(request.url); } };
    } },
  });
  assert.deepEqual(opened, ["static", "runtime"]);
  assert.deepEqual(deleted, [...assets.slice(0, 7), ...assets.slice(0, 7)].map(asset => origin + asset));
});

test("keycap is removed from the hub and offline warmup while its source is retained", () => {
  assert.doesNotMatch(html, /keycap|키캡/);
  assert.ok(!sw.NAVIGATION_ROUTES.includes("keycap"));
  assert.ok(!sw.BACKGROUND_ASSETS.some(asset => asset.startsWith("./keycap/")));
  assert.ok(!sw.APP_SHELL.some(asset => asset.startsWith("./keycap/")));
  assert.ok(fs.existsSync(path.join(root, "keycap/index.html")));
});
