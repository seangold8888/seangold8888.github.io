"use strict";
// Real MP3 playback and private-upload precedence, using an isolated browser profile.
// --committed-karts serves the release baseline plus this turn's player-version edit,
// so unrelated local kart redesigns cannot accidentally validate an unshipped build.
const assert = require("node:assert/strict"), fs = require("node:fs"), path = require("node:path"), http = require("node:http"), cp = require("node:child_process");
const { chromium } = require("playwright");
const root = path.resolve(__dirname, "..");
const releaseBaseline = process.argv.includes("--committed-karts");
const liveBase = process.env.KART_BGM_TEST_URL;
const mime = {".html":"text/html", ".js":"text/javascript", ".css":"text/css", ".json":"application/json", ".webp":"image/webp", ".png":"image/png", ".jpg":"image/jpeg", ".svg":"image/svg+xml", ".mp3":"audio/mpeg", ".glb":"model/gltf-binary", ".woff2":"font/woff2"};
const baseline = new Map();
const server = http.createServer((req, res) => {
  const pathname = decodeURIComponent(new URL(req.url, "http://localhost").pathname);
  const relative = pathname.slice(1) + (pathname.endsWith("/") ? "index.html" : "");
  const file = path.resolve(root, relative);
  if (!file.startsWith(root + path.sep)) { res.writeHead(403).end(); return; }
  let bytes;
  try {
    if (releaseBaseline && /^(kart|kart3d)\//.test(relative)) {
      if (!baseline.has(relative)) {
        let committed = cp.execFileSync("git", ["show", "HEAD:" + relative], {cwd:root, stdio:["ignore","pipe","ignore"]});
        if (relative.endsWith("index.html")) committed = Buffer.from(committed.toString().replace("bgm-player.js?v=66", "bgm-player.js?v=67"));
        baseline.set(relative, committed);
      }
      bytes = baseline.get(relative);
    } else bytes = fs.readFileSync(file);
  } catch { res.writeHead(404).end(); return; }
  res.writeHead(200, {"Content-Type":mime[path.extname(file)] || "application/octet-stream"}); res.end(bytes);
});
async function startRace(page, game) {
  await page.mouse.click(8, 8); // genuine browser gesture unlocks the music player
  await page.evaluate(game => {
    if (game === "kart3d") { window.__game.pick(0, 0, 0); window.__game.startRace(); }
    else { SK._debug.pick(0); SK._debug.setTrack(0); SK._debug.startRace(false); }
  }, game);
  await page.keyboard.press("ArrowUp"); // player is constructed by startMusic during race setup
}
(async () => {
  if (!liveBase) await new Promise(resolve => server.listen(0, "127.0.0.1", resolve));
  const base = liveBase || `http://127.0.0.1:${server.address().port}/`;
  const browser = await chromium.launch({headless:true, args:["--use-angle=swiftshader", "--enable-unsafe-swiftshader"]});
  try {
    for (const game of ["kart", "kart3d"]) {
      const context = await browser.newContext({viewport:{width:1180,height:820}, serviceWorkers:"block"});
      await context.addInitScript(() => {
        window.__qaPlayers = []; window.__qaMedia = []; window.__qaUserLoops = 0;
        let hub;
        Object.defineProperty(window, "HubBgm", {configurable:true, get(){return hub;}, set(value){
          const create = value.create;
          value.create = function(options){const p = create(options); window.__qaPlayers.push(p); return p;}; hub=value;
        }});
        const NativeAudio = window.Audio;
        window.Audio = function(src) {const audio = new NativeAudio(src); window.__qaMedia.push(audio); return audio;};
        window.Audio.prototype = NativeAudio.prototype;
        const AC = window.AudioContext || window.webkitAudioContext;
        if (AC) {
          const make = AC.prototype.createBufferSource;
          AC.prototype.createBufferSource = function(){const node=make.call(this), start=node.start;
            node.start=function(...args){if(node.loop && node.buffer)window.__qaUserLoops++; return start.apply(node,args);}; return node;};
        }
      });
      const page = await context.newPage(), errors = [];
      page.on("pageerror", e => errors.push(e.message));
      await page.goto(base + game + "/?music-test=candy-v1");
      await page.waitForFunction(game => game === "kart3d" ? Boolean(window.__game) : Boolean(window.SK && SK._debug), game);
      await startRace(page, game);
      await page.waitForFunction(() => window.__qaPlayers.some(p => p.state().time > .2 && p.state().volume > .2 && !p.state().paused));
      const info = await page.evaluate(() => {const a=window.__qaMedia.find(a=>a.src.includes("kart-candy-parade-v1.mp3"));return {src:a.src,duration:a.duration,loop:a.loop,error:a.error};});
      assert.ok(info.src.endsWith("kart-candy-parade-v1.mp3"));
      assert.ok(info.duration > 29.8 && info.duration < 30.2); assert.equal(info.loop,true); assert.equal(info.error,null);
      await page.evaluate(() => {const a=window.__qaMedia.find(a=>a.src.includes("kart-candy-parade-v1.mp3"));a.currentTime=a.duration-.25;});
      await page.waitForFunction(() => window.__qaPlayers.some(p => p.state().time > .1 && p.state().time < 2 && !p.state().paused));
      await page.locator("#sound").click();
      await page.waitForFunction(() => window.__qaPlayers.every(p => p.state().paused));
      await page.reload();
      await page.waitForFunction(game => game === "kart3d" ? Boolean(window.__game) : Boolean(window.SK && SK._debug), game);
      assert.equal(await page.locator("#sound").getAttribute("aria-label"), "소리 켜기");
      await startRace(page,game);
      assert.ok(await page.evaluate(() => window.__qaPlayers.every(p => p.isMuted() && !p.isPlaying())));
      await page.reload();
      await page.waitForFunction(game => game === "kart3d" ? Boolean(window.__game) : Boolean(window.SK && SK._debug), game);
      await page.locator("#sound").click();
      await page.locator("#bgm-file").setInputFiles({name:"private-test.mp3", mimeType:"audio/mpeg", buffer:fs.readFileSync(path.join(root,"assets/bgm/kart-candy-parade-v1.mp3"))});
      await page.waitForFunction(() => document.getElementById("bgm-name").textContent.includes("private-test.mp3"));
      await startRace(page,game);
      await page.waitForFunction(() => window.__qaUserLoops > 0);
      assert.equal(await page.evaluate(() => window.__qaPlayers.some(p=>p.isPlaying())),false,"uploaded music replaces, never overlaps, default cue");
      await page.reload();
      await page.waitForFunction(() => document.getElementById("bgm-name").textContent.includes("private-test.mp3"));
      await startRace(page,game);
      await page.waitForFunction(() => window.__qaUserLoops > 0);
      assert.equal(await page.evaluate(() => window.__qaPlayers.some(p=>p.isPlaying())),false);
      assert.deepEqual(errors,[]);
      console.log(`PASS ${game}: real 30s MP3 playback and repeat, saved mute, private-upload priority and restore, zero page errors`);
      await context.close();
    }
  } finally {
    await browser.close();
    if (!liveBase) {server.closeAllConnections(); await new Promise(resolve=>server.close(resolve));}
  }
})().catch(error=>{console.error(error);process.exitCode=1;});
