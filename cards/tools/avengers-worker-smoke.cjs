"use strict";
// Run with Playwright available via NODE_PATH. Uses isolated browser contexts
// and a local fixture origin; never touches a user's installed game or caches.
const {chromium} = require("playwright");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const http = require("node:http");
const path = require("node:path");
const root = path.resolve(__dirname, "../..");
const rootWorker = fs.readFileSync(path.join(root, "sw.js"), "utf8");
const retiredWorker = fs.readFileSync(path.join(root, "avengers/sw.js"), "utf8");
const migration = fs.readFileSync(path.join(root, "avengers/index.html"), "utf8")
  .match(/<script id="avengers-worker-migration">([\s\S]*?)<\/script>/)[1];
const {AUDIO_CACHE} = require(path.join(root, "sw.js"));
const legacyWorker = 'self.addEventListener("install", e => e.waitUntil(self.skipWaiting())); self.addEventListener("activate", e => e.waitUntil(self.clients.claim()));';

async function scenario(browser, prefix, failFirst) {
  let migrate = false;
  let failRoot = failFirst;
  const server = http.createServer((req, res) => {
    const pathname = new URL(req.url, "http://fixture").pathname;
    res.setHeader("Cache-Control", "no-store");
    if (pathname === prefix + "/sw.js") {
      res.setHeader("Content-Type", "application/javascript");
      res.statusCode = failRoot ? 503 : 200;
      return res.end(failRoot ? "offline fixture" : rootWorker);
    }
    if (pathname === prefix + "/avengers/sw.js" || pathname === prefix + "/other/sw.js") {
      res.setHeader("Content-Type", "application/javascript");
      return res.end(migrate && pathname.endsWith("/avengers/sw.js") ? retiredWorker : legacyWorker);
    }
    if (pathname === prefix + "/avengers/") {
      res.setHeader("Content-Type", "text/html; charset=utf-8");
      // Run the production migration and the same child registration made by
      // the game bundle, without loading the unrelated Phaser game into QA.
      return res.end('<!doctype html><script>' + migration + '</script><script>window.addEventListener("load",()=>navigator.serviceWorker.register("./sw.js").catch(()=>{}));</script>');
    }
    // Small stand-ins for immutable assets: this test checks real service
    // worker lifecycle/cache behavior, not artwork or audio decoding.
    res.setHeader("Content-Type", "text/html");
    res.end("<!doctype html><title>offline fixture</title>");
  });
  await new Promise(resolve => server.listen(0, "127.0.0.1", resolve));
  const base = "http://127.0.0.1:" + server.address().port;
  const context = await browser.newContext();
  const page = await context.newPage();
  const errors = [];
  page.on("pageerror", error => errors.push(String(error)));
  page.on("console", message => {if (["error", "warning"].includes(message.type())) errors.push(message.text());});
  try {
    await page.goto(base + prefix + "/seed");
    await page.evaluate(async ({prefix, audioCache}) => {
      for (const route of ["avengers", "other"]) {
        const registration = await navigator.serviceWorker.register(prefix + "/" + route + "/sw.js", {scope: prefix + "/" + route + "/"});
        const worker = registration.installing || registration.waiting || registration.active;
        if (worker.state !== "activated") await new Promise(resolve => worker.addEventListener("statechange", () => {if (worker.state === "activated") resolve();}));
      }
      for (const name of [audioCache, "unrelated-site-cache", "jay-teo-multiverse-m4-v3"]) {
        await (await caches.open(name)).put(prefix + "/sentinel", new Response("keep-me"));
      }
      localStorage.setItem("card_campaign", "progress-sentinel");
    }, {prefix, audioCache: AUDIO_CACHE});
    migrate = true;
    await page.goto(base + prefix + "/avengers/");
    if (failFirst) {
      await page.evaluate(() => navigator.serviceWorker.register("./sw.js").then(() => {throw Error("root must fail");}, () => true));
      const scopes = await page.evaluate(async () => (await navigator.serviceWorker.getRegistrations()).map(item => item.scope));
      assert.ok(scopes.includes(base + prefix + "/avengers/"), "failed root install preserves child registration");
      failRoot = false;
      await page.evaluate(() => navigator.serviceWorker.register("./sw.js").then(item => item.scope));
    }
    // Unregister does not evict an existing controlled document. Let the game
    // finish normally; verify that the next visit uses the shared worker.
    await page.evaluate(() => navigator.serviceWorker.register("./sw.js").then(item => item.scope));
    await page.reload();
    await page.waitForFunction(() => navigator.serviceWorker.controller && navigator.serviceWorker.controller.scriptURL === new URL("../sw.js", location.href).href, null, {timeout: 30000});
    const result = await page.evaluate(async ({prefix, audioCache}) => ({
      scopes: (await navigator.serviceWorker.getRegistrations()).map(item => item.scope),
      saved: await Promise.all([audioCache, "unrelated-site-cache", "jay-teo-multiverse-m4-v3"].map(async name => {
        const response = await (await caches.open(name)).match(prefix + "/sentinel");
        return response && response.text();
      })),
      progress: localStorage.getItem("card_campaign")
    }), {prefix, audioCache: AUDIO_CACHE});
    assert.ok(result.scopes.includes(base + prefix + "/"));
    assert.ok(result.scopes.includes(base + prefix + "/other/"));
    assert.ok(!result.scopes.includes(base + prefix + "/avengers/"));
    assert.deepEqual(result.saved, ["keep-me", "keep-me", "keep-me"]);
    assert.equal(result.progress, "progress-sentinel");
    console.log("PASS", prefix || "/", failFirst ? "failed install → retry" : "direct handoff", "audio/other caches/progress preserved");
  } catch (error) {
    console.error("Worker diagnostics", {prefix, failFirst, errors}, await page.evaluate(async () => ({
      controller: navigator.serviceWorker.controller && navigator.serviceWorker.controller.scriptURL,
      registrations: (await navigator.serviceWorker.getRegistrations()).map(item => ({scope: item.scope,
        active: item.active && item.active.state, waiting: item.waiting && item.waiting.state, installing: item.installing && item.installing.state}))
    })).catch(() => null));
    throw error;
  } finally {
    await context.close();
    server.closeAllConnections();
    await new Promise(resolve => server.close(resolve));
  }
}
(async () => {
  const browser = await chromium.launch({headless: true, channel: "msedge"});
  try {
    for (const prefix of ["", "/nested"]) for (const failFirst of [false, true]) await scenario(browser, prefix, failFirst);
  } finally { await browser.close(); }
})().catch(error => {console.error(error); process.exitCode = 1;});
