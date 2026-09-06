"use strict";

const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");

const siteRoot = path.resolve(__dirname, "..", "..");
const swPath = path.join(siteRoot, "sw.js");
const swSource = fs.readFileSync(swPath, "utf8");
const sw = require(swPath);

function localPath(asset) {
  return asset.replace(/^\.\//, "").replace(/[?#].*$/, "");
}

function walkFiles(directory) {
  return fs.readdirSync(directory, { withFileTypes: true }).flatMap(entry => {
    const fullPath = path.join(directory, entry.name);
    return entry.isDirectory() ? walkFiles(fullPath) : [fullPath];
  });
}

function pngSize(filePath) {
  const bytes = fs.readFileSync(filePath);
  assert.equal(bytes.subarray(1, 4).toString("ascii"), "PNG", filePath);
  return {
    width: bytes.readUInt32BE(16),
    height: bytes.readUInt32BE(20),
  };
}

test("every declared shell, background and card asset exists", () => {
  const assets = [
    ...sw.CORE_SHELL,
    ...sw.BACKGROUND_ASSETS,
    ...sw.CARD_ART_FILES,
  ];
  for (const asset of assets) {
    const relative = localPath(asset);
    const target = path.join(siteRoot, relative || "index.html");
    const exists = relative.endsWith("/")
      ? fs.existsSync(path.join(target, "index.html"))
      : fs.existsSync(target);
    assert.equal(exists, true, `missing PWA asset: ${asset}`);
  }
});

test("install is strict only for core and card art; optional warmup is bounded and nonblocking", () => {
  const installStart = swSource.indexOf('self.addEventListener("install"');
  const activateStart = swSource.indexOf('self.addEventListener("activate"');
  const fetchStart = swSource.indexOf('self.addEventListener("fetch"');
  const installSource = swSource.slice(installStart, activateStart);
  const activateSource = swSource.slice(activateStart, fetchStart);

  assert.match(
    installSource,
    /cache\.addAll\(\[[\s\S]*\.\.\.CORE_SHELL,[\s\S]*\.\.\.CARD_ART_FILES,[\s\S]*\.\.\.VFX_ART_FILES/
  );
  assert.doesNotMatch(installSource, /OPTIONAL_SHELL|BACKGROUND_ASSETS|SANGUO_RUNTIME_ASSETS/);
  assert.match(activateSource, /void warmBackgroundAssets\(\)/);
  assert.ok(sw.BACKGROUND_WARM_CONCURRENCY >= 1);
  assert.ok(sw.BACKGROUND_WARM_CONCURRENCY <= 3);
  assert.equal(sw.BACKGROUND_RETRY_MS, 5 * 60 * 1000);
  assert.match(swSource, /runBounded\([\s\S]*BACKGROUND_WARM_CONCURRENCY/);
  assert.match(swSource, /warmup\.json/);
  assert.match(swSource, /retryAt/);
  for (const shell of ["./sanguo/", "./sanguo/assets/index-CiQbQyTw.js", "./sanguo/data/gamedata.json"]) {
    assert.equal(sw.backgroundCacheName(shell), sw.STATIC_CACHE, shell);
  }
  for (const runtime of [
    "./sanguo/art/side-scroller/guanyu-painted-sheet-v4.png",
    "./sanguo/audio/the_final_battle.ogg",
    "./sanguo/fonts/pretendard/PretendardVariable.woff2",
  ]) {
    assert.equal(sw.backgroundCacheName(runtime), sw.RUNTIME_CACHE, runtime);
  }

  for (const game of ["odyssey", "bori", "hogwarts", "kedehun"]) {
    assert.ok(sw.OPTIONAL_SHELL.includes(`./${game}/`), game);
    assert.ok(!sw.OPTIONAL_SHELL.includes(`./${game}/index.html`), game);
  }
});

test("all checked-in Sanguo PNG, OGG and WAV assets are best-effort background assets", () => {
  const expected = walkFiles(path.join(siteRoot, "sanguo"))
    .filter(file => /\.(?:png|ogg|wav)$/i.test(file))
    .map(file => `./${path.relative(siteRoot, file).split(path.sep).join("/")}`)
    .sort();
  assert.equal(expected.length, 138);
  assert.deepEqual([...sw.SANGUO_RUNTIME_ASSETS].sort(), expected);
  assert.equal(new Set(sw.SANGUO_RUNTIME_ASSETS).size, expected.length);
});

test("all 24 collection cards have an install-time webp", () => {
  const data = JSON.parse(fs.readFileSync(path.join(siteRoot, "cards", "cards.json"), "utf8"));
  assert.equal(data.collection.length, 24);
  assert.equal(sw.CARD_ART_FILES.length, 24);
  assert.equal(new Set(sw.CARD_ART_FILES).size, 24);
  for (const id of data.collection) {
    assert.ok(sw.CARD_ART_FILES.includes(`./cards/art/${id}.webp`), id);
  }
});

test("all story episode mp3 files match the service worker fallback list", () => {
  const story = fs.readFileSync(path.join(siteRoot, "story", "index.html"), "utf8");
  const episodeIds = [...story.matchAll(/src:\s*"audio\/([^"]+)\.mp3"/g)].map(match => match[1]);
  assert.equal(episodeIds.length, 20);
  assert.deepEqual(sw.AUDIO_FILES.map(item => item.id), episodeIds);
  for (const item of sw.AUDIO_FILES) {
    assert.ok(fs.existsSync(path.join(siteRoot, localPath(item.path))), item.path);
  }
});

test("cache generation v39 preserves exact v26 card assets and canonical navigation aliases", () => {
  assert.equal(sw.CACHE_VERSION, "v39");
  assert.match(sw.STATIC_CACHE, /^adventure-box-v39-/);
  const studioImages = fs.readdirSync(path.join(siteRoot, "princess/assets/studio-v3")).filter(name => /\.(webp|jpg)$/.test(name));
  assert.equal(studioImages.length, 95);
  for (const name of studioImages) assert.ok(sw.OPTIONAL_SHELL.includes("./princess/assets/studio-v3/" + name), name);
  assert.ok(sw.OPTIONAL_SHELL.includes("./princess/studio.js?v=36"));
  for(const id of ["frost","sahara","lotus","sunny"])for(const part of ["body","grip"]){
    const asset="./princess/assets/characters-v36/"+part+"-"+id+".webp";
    assert.ok(sw.OPTIONAL_SHELL.includes(asset));
    assert.ok(fs.existsSync(path.join(siteRoot,asset)));
  }
  assert.ok(sw.OPTIONAL_SHELL.includes("./princess/assets/hair-v35/hair-bob.webp"));
  for (const id of "snow cinder rapunzel mermaid thumb kongjwi briar moon".split(" ")) {
    assert.ok(sw.OPTIONAL_SHELL.includes("./princess/assets/wear-v5/grip-" + id + ".webp"));
    assert.ok(sw.OPTIONAL_SHELL.includes("./princess/assets/bodies-v4/body-" + id + ".webp"));
  }
  for (const asset of ["styles.css", "engine.js", "audio.js", "card-view.js", "vfx-recipes.js", "story-gates.js", "app.js"]) {
    assert.ok(sw.CORE_SHELL.some(entry => entry.endsWith(asset + "?v=26")), asset);
  }
  assert.doesNotMatch(swSource, /\?v=(?:19|20|21|22|23|24|25)|adventure-box-v(?:19|20|21|22|23|24|25|26)-/);
  assert.deepEqual(sw.VFX_ART_FILES, [
    "./cards/art/vfx/frost-needle.webp",
    "./cards/art/vfx/gold-blade.webp",
    "./cards/art/vfx/monster-impact.webp",
    "./cards/art/vfx/stone-arc.webp",
  ]);
  assert.match(swSource, /\.\.\.VFX_ART_FILES/);

  const cases = new Map([
    ["https://example.test/cards?preview=all", "https://example.test/cards/"],
    ["https://example.test/cards/index.html", "https://example.test/cards/"],
    ["https://example.test/story", "https://example.test/story/"],
    ["https://example.test/story/index.html?x=1", "https://example.test/story/"],
    ["https://example.test/index.html?x=1", "https://example.test/"],
  ]);
  for (const [input, expected] of cases) {
    assert.equal(sw.navigationCacheKey(new Request(input)).url, expected, input);
  }
  for (const route of sw.NAVIGATION_ROUTES) {
    for (const suffix of [route, `${route}/`, `${route}/index.html`]) {
      const expected = `https://example.test/${route}/`;
      assert.equal(
        sw.navigationCacheKey(new Request(`https://example.test/${suffix}?offline=1`)).url,
        expected,
        suffix,
      );
    }
  }
});

test("only full 200 or opaque responses are cacheable and cache failures preserve network success", async () => {
  assert.equal(sw.canCache({ status: 200, type: "basic" }), true);
  assert.equal(sw.canCache({ status: 206, type: "basic" }), false);
  assert.equal(sw.canCache({ status: 404, type: "basic" }), false);
  assert.equal(sw.canCache({ status: 0, type: "opaque" }), true);

  const response = new Response("network-success", { status: 200 });
  const result = await sw.putIfCacheable({
    put: async () => {
      throw new Error("quota exceeded");
    },
  }, "https://example.test/asset.bin", response);
  assert.equal(result, response);
  assert.equal(await result.text(), "network-success");
});

test("Cache API read failures fall back to successful network responses", async () => {
  const originalCaches = global.caches;
  const originalFetch = global.fetch;
  try {
    global.caches = {
      open: async () => {
        throw new Error("Cache API unavailable");
      },
    };
    global.fetch = async () => new Response("online", { status: 200 });
    const request = new Request("https://example.test/data.bin");
    assert.equal(await (await sw.cacheFirst(request)).text(), "online");
    assert.equal(await (await sw.staleWhileRevalidate(request)).text(), "online");
    assert.equal(await sw.matchCacheSafely(sw.RUNTIME_CACHE, request), null);
  } finally {
    global.caches = originalCaches;
    global.fetch = originalFetch;
  }
});

test("an individual audio fetch aborts instead of hanging the save queue forever", async () => {
  const originalFetch = global.fetch;
  try {
    global.fetch = async (request, options) => new Promise((resolve, reject) => {
      options.signal.addEventListener("abort", () => {
        const error = new Error("aborted");
        error.name = "AbortError";
        reject(error);
      }, { once: true });
    });
    await assert.rejects(
      sw.fetchWithTimeout(new Request("https://example.test/story/audio/test.mp3"), 5),
      /오디오 저장 시간이 초과/,
    );
  } finally {
    global.fetch = originalFetch;
  }
});

test("generic cache-first can read install-time icons from the static cache offline", async () => {
  const originalCaches = global.caches;
  const originalFetch = global.fetch;
  try {
    const expected = new Response("static-icon", { status: 200 });
    global.caches = {
      open: async cacheName => ({
        match: async () => cacheName === sw.STATIC_CACHE ? expected.clone() : undefined,
      }),
    };
    global.fetch = async () => {
      throw new Error("offline");
    };
    const response = await sw.cacheFirst(new Request("https://example.test/icon-192.png"));
    assert.equal(await response.text(), "static-icon");
  } finally {
    global.caches = originalCaches;
    global.fetch = originalFetch;
  }
});

test("Safari byte ranges parse and produce correct 206 and 416 responses", async () => {
  assert.deepEqual(sw.parseByteRange("bytes=2-5", 10), { start: 2, end: 5 });
  assert.deepEqual(sw.parseByteRange("bytes=7-", 10), { start: 7, end: 9 });
  assert.deepEqual(sw.parseByteRange("bytes=-3", 10), { start: 7, end: 9 });
  assert.equal(sw.parseByteRange("bytes=20-30", 10), null);
  assert.equal(sw.parseByteRange("bytes=0-1,4-5", 10), null);

  const full = new Response(Uint8Array.from([0, 1, 2, 3, 4, 5, 6, 7, 8, 9]), {
    headers: { "Content-Type": "audio/mpeg" },
  });
  const partial = await sw.rangeResponse(full, "bytes=2-5");
  assert.equal(partial.status, 206);
  assert.equal(partial.headers.get("Content-Range"), "bytes 2-5/10");
  assert.equal(partial.headers.get("Content-Length"), "4");
  assert.deepEqual([...new Uint8Array(await partial.arrayBuffer())], [2, 3, 4, 5]);

  const invalid = await sw.rangeResponse(new Response(Uint8Array.from([1, 2, 3])), "bytes=9-10");
  assert.equal(invalid.status, 416);
  assert.equal(invalid.headers.get("Content-Range"), "bytes */3");
  assert.match(swSource, /event\.waitUntil\(warmFullAudio/);
});

test("non-mp3 Range slices a cached full body and passes uncached 206 through without cache.put", async () => {
  const originalCaches = global.caches;
  const originalFetch = global.fetch;
  try {
    global.caches = {
      open: async () => ({
        match: async () => new Response(Uint8Array.from([0, 1, 2, 3, 4, 5]), {
          status: 200,
          headers: { "Content-Type": "application/octet-stream" },
        }),
      }),
    };
    const cachedPartial = await sw.handleGenericRangeRequest(new Request(
      "https://example.test/video.bin",
      { headers: { Range: "bytes=1-3" } },
    ));
    assert.equal(cachedPartial.status, 206);
    assert.deepEqual([...new Uint8Array(await cachedPartial.arrayBuffer())], [1, 2, 3]);

    let networkCalls = 0;
    global.caches = { open: async () => ({ match: async () => undefined }) };
    global.fetch = async () => {
      networkCalls += 1;
      return new Response(Uint8Array.from([8, 9]), {
        status: 206,
        headers: { "Content-Range": "bytes 0-1/10" },
      });
    };
    const networkPartial = await sw.handleGenericRangeRequest(new Request(
      "https://example.test/video.bin",
      { headers: { Range: "bytes=0-1" } },
    ));
    assert.equal(networkPartial.status, 206);
    assert.equal(networkCalls, 1);
    assert.match(swSource, /request\.headers\.has\("Range"\)/);
  } finally {
    global.caches = originalCaches;
    global.fetch = originalFetch;
  }
});

test("audio messages accept only same-origin story mp3 URLs", () => {
  const safe = sw.safeAudioList([
    { id: "ok", title: "ok", url: "http://localhost/story/audio/cinderella.mp3" },
    { id: "bad-origin", url: "https://example.com/story/audio/cinderella.mp3" },
    { id: "bad-path", url: "http://localhost/cards/cards.json" },
  ]);
  assert.deepEqual(safe.map(item => item.id), ["ok"]);
  assert.match(swSource, /CACHE_AUDIO/);
  assert.match(swSource, /CACHE_ALL_AUDIO/);
  assert.match(swSource, /GET_AUDIO_CACHE_STATUS/);
  assert.match(swSource, /AUDIO_CACHE_PROGRESS[\s\S]{0,180}saved/);
});

test("manifest icons have truthful 180, 192 and 512 pixel declarations", () => {
  const manifest = JSON.parse(fs.readFileSync(path.join(siteRoot, "manifest.json"), "utf8"));
  assert.equal(manifest.name, "모험 상자");
  assert.equal(manifest.display, "standalone");
  assert.equal(manifest.start_url, "./");
  assert.equal(manifest.scope, "./");

  for (const size of [180, 192, 512]) {
    const icon = manifest.icons.find(item => item.sizes === `${size}x${size}`);
    assert.ok(icon, `manifest ${size}px icon`);
    assert.deepEqual(pngSize(path.join(siteRoot, icon.src)), { width: size, height: size });
    assert.ok(sw.CORE_SHELL.includes(`./${icon.src}`));
  }
});

test("hub, story and cards expose the unified root PWA", () => {
  for (const relative of ["index.html", "story/index.html", "cards/index.html"]) {
    const html = fs.readFileSync(path.join(siteRoot, relative), "utf8");
    assert.match(html, /rel="manifest"/i, relative);
    assert.match(html, /serviceWorker[\s\S]{0,180}\.register/i, relative);
  }
});

test("story save UI uses saved count and reports service-worker readiness timeout", () => {
  const story = fs.readFileSync(path.join(siteRoot, "story", "index.html"), "utf8");
  assert.match(story, /id="saveAllAudio"/);
  assert.match(story, />📥 모두 저장</);
  assert.match(story, /id="offlineProgress"/);
  assert.match(story, /aria-live="polite"/);
  assert.match(story, /SERVICE_WORKER_READY_TIMEOUT_MS\s*=\s*12000/);
  assert.match(story, /AUDIO_SAVE_WATCHDOG_MS\s*=\s*55000/);
  assert.match(story, /armAudioSaveWatchdog\(\)/);
  assert.match(story, /Promise\.race\(/);
  assert.match(story, /offlineProgress\.value = saved/);
  assert.doesNotMatch(story, /offlineProgress\.value\s*=\s*data\.completed/);
  assert.match(story, /total - saved/);
  assert.match(story, /is-complete/);
  assert.match(story, /is-error/);
  assert.equal(sw.AUDIO_FETCH_TIMEOUT_MS, 45000);
  assert.match(swSource, /AbortController/);
  assert.match(swSource, /fetchWithTimeout\(key\)/);
});

test("Avengers migrates the legacy child scope before its bundle and tombstones the child worker", () => {
  const index = fs.readFileSync(path.join(siteRoot, "avengers", "index.html"), "utf8");
  // 번들 파일명은 빌드마다 해시가 바뀌므로 고정하지 않는다.
  const moduleMatch = index.match(/\.\/assets\/index-[A-Za-z0-9_-]+\.js/);
  assert.ok(moduleMatch, "avengers bundle script must be referenced");
  const modulePosition = moduleMatch.index;
  const migrationPosition = index.indexOf("migrateToRootWorker");
  assert.ok(migrationPosition >= 0 && migrationPosition < modulePosition);
  assert.match(index, /registration\.scope === childScopeUrl/);
  assert.match(index, /registration\.unregister\(\)/);
  assert.match(index, /nativeRegister\(rootScriptUrl, \{ scope: rootScopeUrl \}\)/);
  assert.match(index, /\.then\(waitForRootWorker\)/);
  assert.ok(
    index.indexOf("nativeRegister(rootScriptUrl") < index.indexOf("registration.unregister()"),
    "root registration must begin before child unregister",
  );
  assert.match(index, /resolved === childScriptUrl[\s\S]{0,100}migrateToRootWorker/);

  const tombstone = fs.readFileSync(path.join(siteRoot, "avengers", "sw.js"), "utf8");
  assert.doesNotMatch(tombstone, /registration\.unregister|importScripts|caches\.|addEventListener\("fetch"/);
  assert.match(swSource, /key\.startsWith\(CACHE_PREFIX\)/);
});
