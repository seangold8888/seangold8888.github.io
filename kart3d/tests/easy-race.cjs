// Run with NODE_PATH pointing to Playwright. KART_LOBBY_TEST_INDEX=1 tests the exact staged release.
// KART_EASY_TEST_URL=https://seangold8888.github.io tests production in an isolated profile.
const { chromium } = require('playwright');
const assert = require('node:assert/strict');
const fs = require('node:fs'), path = require('node:path'), http = require('node:http');
const cp = require('node:child_process');
const root = path.resolve(__dirname, '../..');
const live = process.env.KART_EASY_TEST_URL;
const indexed = new Map();
const server = http.createServer((q, r) => {
  const u = decodeURIComponent(new URL(q.url, 'http://local').pathname);
  const f = path.resolve(root, '.' + u + (u.endsWith('/') ? 'index.html' : ''));
  if (!f.startsWith(root + path.sep) || !fs.existsSync(f)) { r.statusCode = 404; return r.end(); }
  r.setHeader('Content-Type', { '.js': 'text/javascript', '.html': 'text/html', '.css': 'text/css', '.woff2': 'font/woff2' }[path.extname(f)] || 'application/octet-stream');
  if (process.env.KART_LOBBY_TEST_INDEX === '1') {
    const name = path.relative(root, f).replaceAll(path.sep, '/');
    try {
      if (!indexed.has(name)) indexed.set(name, cp.execFileSync('git', ['show', ':' + name], { cwd: root, maxBuffer: 64 * 1024 * 1024, stdio: ['ignore', 'pipe', 'ignore'] }));
      r.end(indexed.get(name));
    } catch { r.statusCode = 404; r.end(); }
  } else r.end(fs.readFileSync(f));
});
(async () => {
  if (!live) await new Promise(r => server.listen(0, '127.0.0.1', r));
  const browser = await chromium.launch({ channel: 'msedge', headless: true, args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
  try {
    const page = await browser.newPage({ viewport: { width: 1024, height: 768 }, serviceWorkers: 'block' });
    page.setDefaultTimeout(90000);
    const errors = []; page.on('pageerror', e => errors.push(e.message));
    await page.addInitScript(() => {
      const d = new Date(); localStorage.setItem('hub_play_pass', JSON.stringify({ free: true, day: d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0') }));
      Math.random = () => .5;
    });
    await page.goto((live || 'http://127.0.0.1:' + server.address().port) + '/kart3d/?verify=easy-1');
    await page.waitForFunction(() => !!window.__game);
    assert.ok((await page.locator('#keys').textContent()).includes('코너 길잡이'));
    // No debug autopilot, no keyboard steering and no items: test the actual child's default input.
    for (const track of [0, 1, 2, 3, 4, 5]) {
      const r = await page.evaluate(track => {
        const G = __game; G.pick(0, track, 2); G.autopilot(false); G.startRace();
        document.querySelector('#menu').style.display = 'none';
        let frames = 0, off = 0;
        while (G.state.scene === 'race' && frames < 60 * 240) {
          G.step(1 / 60); frames++;
          if (G.state.track.nearest(G.state.player.x, G.state.player.z).dist > G.state.track.roadHalf + 7) off++;
        }
        return { track: G.state.track.def.id, scene: G.state.scene, place: G.state.player.place, seconds: frames / 60, off };
      }, track);
      assert.equal(r.scene, 'result', JSON.stringify(r));
      assert.ok(r.place <= 2, 'gentle race stays winnable: ' + JSON.stringify(r));
      assert.ok(r.off < 60, 'guide prevents getting stuck off-road: ' + JSON.stringify(r));
      console.log('PASS no-input guided finish', JSON.stringify(r));
    }
    // All family drivers and both cups' villains, still without test autopilot.
    for (const char of [7, 8, 9, 10]) {
      const r = await page.evaluate(char => {
        const G = __game; G.pick(char, char === 9 ? 3 : 0, 1); G.autopilot(false); G.startRace();
        let n = 0; while (G.state.scene === 'race' && n < 60 * 240) { G.step(1 / 60); n++; }
        return { driver: G.state.player.spec.id, scene: G.state.scene, place: G.state.player.place, villains: G.state.karts.filter(k => k.prank).length };
      }, char);
      assert.equal(r.scene, 'result', JSON.stringify(r)); assert.ok(r.place <= 2, JSON.stringify(r)); assert.equal(r.villains, 2);
      console.log('PASS gentle villain race', JSON.stringify(r));
    }
    const control = await page.evaluate(() => {
      const G = __game; G.pick(0, 0, 2); G.startRace(); G.state.countdown = 0;
      G.press('ArrowLeft'); for (let i = 0; i < 60; i++) G.step(1 / 60); G.release('ArrowLeft');
      const left = G.state.player.x;
      G.pick(0, 0, 2); G.startRace(); G.state.countdown = 0;
      G.press('ArrowRight'); for (let i = 0; i < 60; i++) G.step(1 / 60); G.release('ArrowRight');
      const right = G.state.player.x;
      // Holding steering the wrong way for a while should not trap a child permanently.
      G.press('ArrowRight'); for (let i = 0; i < 600; i++) G.step(1 / 60); G.release('ArrowRight');
      let n = 0; while (G.state.scene === 'race' && n < 60 * 240) { G.step(1 / 60); n++; }
      return { difference: Math.abs(left - right), scene: G.state.scene };
    });
    assert.ok(control.difference > 5, 'manual steering still works'); assert.equal(control.scene, 'result');
    console.log('PASS manual steering and recovery after wrong-way input');
    const impacts = await page.evaluate(() => {
      const G = __game, results = [];
      for (const mode of [2, 4]) {
        G.pick(0, 0, mode); G.startRace(); G.state.countdown = 0;
        const p = G.state.player, o = G.fx.obstacles.find(o => o.roller);
        p.x = o.x; p.z = o.z; p.y = G.state.track.sample(p.x, p.z).y;
        p.speed = 100; p.coins = 10; p.shield = 0;
        G.step(1 / 60);
        results.push({ spin: p.spin, speed: p.speed, coins: p.coins, shield: p.shield });
      }
      return results;
    });
    assert.equal(impacts[0].spin, 0); assert.ok(impacts[0].speed >= 82); assert.ok(impacts[0].coins >= 9); assert.ok(impacts[0].shield >= 1.8);
    assert.ok(impacts[1].spin > 0); assert.ok(impacts[1].speed < 65); assert.equal(impacts[1].shield, 0);
    console.log('PASS real obstacle impact softened only in easy races', JSON.stringify(impacts));
    for (const cup of [0, 1]) {
      const r = await page.evaluate(cup => {
        const G = __game; G.pick(8, 0, 0); G.state.cupIndex = cup; G.autopilot(false); G.startCup();
        const villains = G.state.karts.filter(k => k.prank).map(k => k.spec.id), places = [];
        for (let race = 0; race < 3; race++) {
          let n = 0; while (G.state.scene === 'race' && n < 60 * 240) { G.step(1 / 60); n++; }
          places.push(G.state.player.finished ? G.state.player.place : 99);
          G.nextCupRace();
        }
        return { cup: G.state.gp.cup.id, scene: G.state.scene, places, villains, points: G.state.gp.points[0], trophy: G.state.garage.trophies[G.state.gp.cup.id] };
      }, cup);
      assert.equal(r.scene, 'podium'); assert.ok(r.places.every(p => p <= 2), JSON.stringify(r)); assert.ok(r.points >= 24); assert.equal(r.trophy, 1);
      assert.deepEqual(r.villains, cup ? ['chanppul', 'jaewing'] : ['taeppul', 'geonppul']);
      console.log('PASS three-race cup and trophy', JSON.stringify(r));
    }
    const records = await page.evaluate(() => {
      const G = __game; localStorage.setItem('sanrio-kart3d:park:speed', '0.01');
      localStorage.removeItem('sanrio-kart3d:park:speed:easy-v1');
      G.pick(0, 0, 2); G.startRace(); const easy = G.state.bestLap;
      localStorage.setItem('sanrio-kart3d:park:time', '123'); G.pick(0, 0, 3); G.startRace();
      return { easy, time: G.state.bestLap, old: localStorage.getItem('sanrio-kart3d:park:speed') };
    });
    assert.deepEqual(records, { easy: null, time: 123, old: '0.01' });
    console.log('PASS new assisted records separated; previous records preserved');
    const challenge = await page.evaluate(() => {
      const G = __game; G.pick(0, 0, 4); G.startRace(); G.state.countdown = 0;
      const ai = G.state.karts[1], expected = (G.driveAI(ai, G.state.player.total), ai.baseTop);
      G.step(1 / 60);
      const rivalRatio = ai.baseTop / expected, rivalPlayerRatio = G.state.player.baseTop / G.state.player.spec.top;
      G.pick(0, 0, 3); G.startRace(); G.state.countdown = 0;
      const angle = G.state.player.angle;
      for (let i = 0; i < 60; i++) G.step(1 / 60);
      return { rivalRatio, rivalPlayerRatio, timeAngle: G.state.player.angle - angle, timeSpeedRatio: G.state.player.baseTop / G.state.player.spec.top };
    });
    assert.ok(Math.abs(challenge.rivalRatio - 1) < .001); assert.equal(challenge.rivalPlayerRatio, 1);
    assert.equal(challenge.timeAngle, 0); assert.equal(challenge.timeSpeedRatio, 1);
    console.log('PASS rival speed and time-attack steering unchanged');
    assert.deepEqual(errors, []); console.log('PASS console errors: 0');
  } finally { await browser.close(); server.close(); }
})().catch(e => { console.error(e); server.close(); process.exitCode = 1; });
