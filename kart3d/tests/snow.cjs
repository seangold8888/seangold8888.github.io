// 눈꽃 마을(2026-10-27) 점검: 코스·컵·얼음길·눈사람/선물/눈덩이·내리는 눈·조향 방향·AI 완주·자원 정리
// 실행: NODE_PATH=<playwright node_modules> node kart3d/tests/snow.cjs [스크린샷 폴더]
const { chromium } = require('playwright');
const fs = require('fs'), path = require('path'), http = require('http');
const site = path.resolve(__dirname, '..', '..');
const shots = process.argv[2] || null;
const T = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript', '.css': 'text/css', '.glb': 'model/gltf-binary', '.webp': 'image/webp', '.mp3': 'audio/mpeg', '.woff2': 'font/woff2' };
const server = http.createServer((q, r) => {
  const u = decodeURIComponent(new URL(q.url, 'http://x').pathname);
  let f = path.resolve(site, '.' + u); if (u.endsWith('/')) f = path.join(f, 'index.html');
  if (!f.startsWith(site) || !fs.existsSync(f)) { r.writeHead(404); return r.end(); }
  r.writeHead(200, { 'Content-Type': T[path.extname(f)] || 'application/octet-stream' }); r.end(fs.readFileSync(f));
});
function check(ok, msg) { if (!ok) { console.error('FAIL', msg); process.exitCode = 1; } else console.log('ok  ', msg); }

(async () => {
  await new Promise(r => server.listen(0, '127.0.0.1', r));
  const base = 'http://127.0.0.1:' + server.address().port;
  const browser = await chromium.launch({ channel: 'msedge', headless: true, args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
  const page = await browser.newPage({ viewport: { width: 1180, height: 820 }, serviceWorkers: 'block' });
  page.setDefaultTimeout(120000);
  const errors = [];
  page.on('pageerror', e => errors.push(e.message));
  page.on('console', m => { if (m.type() === 'error') errors.push(m.text()); });
  await page.addInitScript(() => {
    const d = new Date();
    localStorage.setItem('hub_play_pass', JSON.stringify({ free: true, day: d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0') }));
    if (!sessionStorage.getItem('k3snow')) { localStorage.removeItem('sanrio-kart3d:garage:v1'); sessionStorage.setItem('k3snow', '1'); }
  });
  await page.goto(base + '/kart3d/');
  await page.waitForFunction(() => !!window.__game);
  await page.waitForTimeout(1200);
  const shot = async n => { if (shots) await page.screenshot({ path: path.join(shots, 'snow-' + n + '.png') }); };

  // ---- 메뉴: 코스 카드 7장(눈꽃 마을 엽서), 컵 3개(눈꽃 컵) ----
  await page.evaluate(() => { const G = __game; G.state.menuStep = 1; G.state.modeIndex = 2; G.nextStep(); });
  const courses = await page.$$eval('#menu-list .card', els => els.map(e => ({ t: e.textContent, img: !!(e.querySelector('img') && e.querySelector('img').src.startsWith('data:image')) })));
  check(courses.length === 7 && courses.some(c => c.t.includes('눈꽃 마을')) && courses.every(c => c.img), '코스 7개 · 눈꽃 마을 엽서 ' + courses.length);
  await page.getByRole('button', { name: '눈꽃 마을 선택', exact: true }).click();
  await shot('menu-courses');
  await page.evaluate(() => { const G = __game; G.state.menuStep = 1; G.state.modeIndex = 0; G.nextStep(); });
  const cups = await page.$$eval('#menu-list .card', els => els.map(e => e.textContent));
  check(cups.length === 3 && /눈꽃 컵/.test(cups[2]) && /눈꽃 마을 · 사탕 숲 · 별빛 밤길/.test(cups[2]), '그랑프리 컵 3개 · 눈꽃 컵 ' + cups[2]);

  // ---- 코스 구성 ----
  const fx = await page.evaluate(() => {
    const G = __game, idx = G.state && 6;
    G.pick(0, 6, 1); G.state.gp = null; document.getElementById('menu').style.display = 'none';
    G.startRace(); G.autopilot(true);
    const f = G.fx, T = G.state.track;
    const tg = G.state.trackGroup;
    let inst = 0; tg.traverse(o => { if (o.isInstancedMesh) inst++; });
    return {
      id: T.def.id, idx, ramps: T.ramps.length, pads: f.pads.length, coins: f.coins.length, sky: f.coins.length,
      kinds: f.obstacles.map(o => o.kind), ice: f.ice.length, snow: typeof tg.userData.snow === 'function', inst
    };
  });
  check(fx.id === 'snow' && fx.ramps === 2 && fx.pads === 6 && fx.coins >= 30, '눈꽃 마을: 점프대 2 · 발판 6(부스트 줄 3) · 코인 ' + fx.coins);
  check(['snowball', 'gift', 'snowman'].every(k => fx.kinds.includes(k)) && fx.ice === 3, '눈덩이·선물 상자·눈사람 ' + fx.kinds.join(',') + ' · 얼음길 ' + fx.ice);
  check(fx.snow && fx.inst >= 10, '내리는 눈 + 인스턴싱 소품 ' + fx.inst + '덩어리');

  // ---- 오른쪽 키 = 화면 오른쪽(카메라 해석식: 화면 오른쪽 축 = (-cos a, 0, sin a)) ----
  const steer = await page.evaluate(() => {
    const G = __game, out = {};
    for (const key of ['ArrowRight', 'ArrowLeft']) {
      G.pick(0, 6, 3); G.autopilot(false); G.startRace(); G.state.countdown = 0;
      const p = G.state.player, a0 = p.angle, x0 = p.x, z0 = p.z;
      for (let i = 0; i < 30; i++) G.step(1 / 60);       // 먼저 속도를 붙인다
      const x1 = p.x, z1 = p.z;
      G.press(key); for (let i = 0; i < 36; i++) G.step(1 / 60); G.release(key);
      const rx = -Math.cos(a0), rz = Math.sin(a0);
      const fwd = [Math.sin(a0), Math.cos(a0)];
      const mx = p.x - x1, mz = p.z - z1;
      out[key] = { right: +(mx * rx + mz * rz).toFixed(1), fwd: +(mx * fwd[0] + mz * fwd[1]).toFixed(1), dAngle: +(p.angle - a0).toFixed(3) };
      void x0; void z0;
    }
    return out;
  });
  check(steer.ArrowRight.right > 3 && steer.ArrowLeft.right < -3, '눈꽃 마을에서 → 는 화면 오른쪽, ← 는 왼쪽 ' + JSON.stringify(steer));

  // ---- 얼음길: 같은 조향이라도 덜 돌고 옆으로 미끄러진다 ----
  const ice = await page.evaluate(() => {
    const G = __game, res = {};
    for (const onIce of [false, true]) {
      G.pick(0, 6, 3); G.autopilot(false); G.startRace(); G.state.countdown = 0;
      const T = G.state.track, r = G.fx.ice[0];
      const i = onIce ? r.i0 + 2 : r.i0 - 25;     // 비교 지점은 점프대·발판이 없는 평범한 길
      const q = T.points[i];
      const p = G.state.player;
      p.x = q.x; p.z = q.z; p.y = q.y; p.angle = p.vAngle = Math.atan2(q.tx, q.tz); p.speed = p.baseTop * 0.85;
      G.press('ArrowRight');
      let maxSlip = 0, iceSeen = false;
      for (let k = 0; k < 20; k++) { G.step(1 / 60); maxSlip = Math.max(maxSlip, Math.abs(p.slipAngle || 0)); iceSeen = iceSeen || p.ice > 0; }
      G.release('ArrowRight');
      res[onIce ? 'ice' : 'road'] = { turned: +Math.abs(p.angle - Math.atan2(q.tx, q.tz)).toFixed(3), maxSlip: +maxSlip.toFixed(3), iceSeen };
    }
    return res;
  });
  check(ice.ice.iceSeen && !ice.road.iceSeen && ice.ice.turned < ice.road.turned * 0.8 && ice.ice.maxSlip > ice.road.maxSlip * 1.3, '얼음길은 미끌미끌(덜 돌고 더 미끄러짐) ' + JSON.stringify(ice));

  // ---- 눈사람에 부딪히면 쿵, 선물 상자는 통 튀고 코인 +1 ----
  const hits = await page.evaluate(() => {
    const G = __game; G.pick(0, 6, 3); G.autopilot(false); G.startRace(); G.state.countdown = 0;
    const p = G.state.player, out = {};
    const sm = G.fx.obstacles.find(o => o.kind === 'snowman');
    G.step(1 / 60);
    p.x = sm.x; p.z = sm.z; p.y = G.state.track.sample(p.x, p.z).y; p.speed = 100; p.shield = 0; p.airborne = false;
    G.state.fx.update(1 / 60, [p], 1, () => {});
    out.snowman = { spin: +p.spin.toFixed(2), speed: Math.round(p.speed) };
    p.spin = 0; p.speed = 100;
    const gift = G.fx.obstacles.find(o => o.kind === 'gift');
    const c0 = p.coins || 0;
    p.x = gift.x; p.z = gift.z; p.y = G.state.track.sample(p.x, p.z).y; p.airborne = false;
    G.state.fx.update(1 / 60, [p], 1, () => {});
    out.gift = { air: p.airborne, coins: (p.coins || 0) - c0 };
    return out;
  });
  check(hits.snowman.spin > 0 && hits.snowman.speed < 70, '눈사람에 쿵 ' + JSON.stringify(hits.snowman));
  check(hits.gift.air && hits.gift.coins === 1, '선물 상자 통! 코인 +1 ' + JSON.stringify(hits.gift));

  // ---- 자동 주행 완주: 플레이어 + AI 전원(멈춤·역주행 없음) ----
  async function fullRace(mode, holdForAll) {
    return page.evaluate(([mode, holdForAll]) => {
      const G = __game; G.pick(7, 6, mode); G.state.gp = null; G.startRace(); G.autopilot(true);
      const ks = G.state.karts, L = G.state.track.length, HALF = G.state.track.roadHalf;
      const hist = ks.map(() => []);
      let n = 0, off = 0, iceFrames = 0, airFrames = 0;
      while (G.state.scene === 'race' && n < 60 * 300) {
        if (holdForAll && G.state.player.finished && ks.some(k => !k.finished)) G.state.finishDelay = 0;
        G.step(1 / 60); n++;
        ks.forEach((k, i) => {
          if (n % 30 === 0) hist[i].push(k.finished ? null : k.total);
          if (G.state.track.nearest(k.x, k.z).dist > HALF + 16) off++;   // 칸막이(+7) 밖으로 크게 벗어남
        });
        if (G.state.player.ice > 0) iceFrames++;
        if (G.state.player.airborne) airFrames++;
      }
      // 10초 창마다 얼마나 나아갔나 — 갇히거나 거꾸로 돌면 작다.
      // (4초 창은 아이템·장애물에 연달아 맞는 것만으로도 기존 코스에서도 20~120 까지 떨어진다)
      const worst = hist.map(h => {
        let w = Infinity;
        // 카운트다운(3.6초) 뒤부터 본다
        for (let j = 28; j < h.length; j++) if (h[j] != null && h[j - 20] != null) w = Math.min(w, h[j] - h[j - 20]);
        return Number.isFinite(w) ? Math.round(w) : -1;
      });
      return {
        scene: G.state.scene, secs: Math.round(n / 60), off, iceFrames, airFrames,
        results: G.state.results.map(k => ({ id: k.spec.id, t: k.finishTime > 9000 ? null : Math.round(k.finishTime), lap: k.lap })),
        worst, coins: G.state.coinPicks, L: Math.round(L)
      };
    }, [mode, holdForAll]);
  }
  const race = await fullRace(1, true);
  check(race.scene === 'result', '아이템 배틀 자동 주행 완주 ' + race.secs + '초');
  check(race.results.length === 6 && race.results.every(r => r.t != null), 'AI 포함 6대 모두 결승 통과 ' + JSON.stringify(race.results));
  check(race.worst.every(w => w > 250), '갇힌 카트 없음(10초마다 최소 전진 ' + race.worst.join(',') + ')');
  check(race.off === 0, '칸막이 밖으로 나간 프레임 0 (' + race.off + ')');
  check(race.iceFrames > 20 && race.airFrames > 30, '얼음길 ' + race.iceFrames + '프레임 · 공중 ' + race.airFrames + '프레임(점프대·선물 상자)');
  check(race.coins > 0, '코인 주움 ' + race.coins);

  // 스피드 매치(아이템 없음)에서도
  const speed = await fullRace(2, true);
  check(speed.scene === 'result' && speed.results.every(r => r.t != null) && speed.worst.every(w => w > 250), '스피드 매치 4대 완주 ' + JSON.stringify(speed.results.map(r => r.t)));

  // ---- 눈꽃 컵: 자동 주행 세 경주 → 시상식, 트로피 저장 ----
  const cup = await page.evaluate(() => {
    const G = __game; G.pick(8, 0, 0); G.state.cupIndex = 2; G.startCup(); G.autopilot(true);
    const lineup = G.state.karts.map(k => k.spec.id), tracks = [], secs = [];
    for (let race = 0; race < 3; race++) {
      tracks.push(G.state.track.def.id);
      let n = 0; while (G.state.scene === 'race' && n < 60 * 300) { G.step(1 / 60); n++; }
      secs.push(Math.round(n / 60));
      if (G.state.scene !== 'result') break;
      document.getElementById('result').style.display = 'none';
      G.nextCupRace(); G.autopilot(true);
    }
    return { lineup, tracks, secs, scene: G.state.scene, podiumTrack: G.state.track.def.id, snow: !!(G.state.trackGroup && G.state.trackGroup.userData.snow), trophies: G.state.garage.trophies };
  });
  check(cup.tracks.join(',') === 'snow,candy,night' && cup.scene === 'podium', '눈꽃 컵 세 경주 → 시상식 ' + JSON.stringify(cup.secs));
  check(cup.lineup.includes('taeppul') && cup.lineup.includes('jaewing'), '눈꽃 컵 장난꾸러기 태뿔·재윙 ' + cup.lineup.join(','));
  check(cup.podiumTrack === 'snow' && cup.snow && cup.trophies.snow >= 1, '시상식은 눈 내리는 마을에서 · 트로피 ' + JSON.stringify(cup.trophies));
  await page.waitForTimeout(1500); await shot('podium');
  const note = await page.textContent('#podium-note');
  check(!/황금 바퀴/.test(note), '눈꽃 컵 상품 문구가 다른 컵 것과 섞이지 않음: ' + note);

  // ---- 내리는 눈이 실제로 움직인다 ----
  const flakes = await page.evaluate(() => {
    const G = __game; let pts = null;
    G.state.trackGroup.traverse(o => { if (o.isPoints) pts = o; });
    const a = Array.from(pts.geometry.attributes.position.array.slice(0, 6));
    G.render(); G.render();
    const b = Array.from(pts.geometry.attributes.position.array.slice(0, 6));
    return { n: pts.geometry.attributes.position.count, moved: a.some((v, i) => Math.abs(v - b[i]) > 1e-3) };
  });
  check(flakes.n >= 500 && flakes.moved, '눈송이 ' + flakes.n + '개가 내린다');

  // ---- 경주를 거듭해도 GPU 자원이 쌓이지 않는다 ----
  const mem = await page.evaluate(() => {
    const G = __game; document.getElementById('podium').style.display = 'none';
    const out = [];
    for (let r = 0; r < 4; r++) {
      G.pick(0, 6, 3); G.state.gp = null; G.startRace(); G.autopilot(true);
      for (let i = 0; i < 300; i++) G.step(1 / 60);
      G.render();
      out.push(G.renderer.info.memory.geometries + '/' + G.renderer.info.memory.textures);
    }
    return out;
  });
  check(mem[1] === mem[3], '눈꽃 마을 4판 뒤 지오메트리/텍스처 수 그대로 ' + mem.join(' → '));

  // ---- 화면 ----
  await page.evaluate(() => {
    const G = __game; G.pick(9, 6, 1); G.state.gp = null; G.startRace(); G.autopilot(true);
    // 썰매 비탈 부스트 줄 직전까지 달린다
    let n = 0; while (n < 60 * 60 && !(G.state.player.lap >= 0 && G.state.player.progress > G.state.track.length * 0.352 - 30)) { G.step(1 / 60); n++; }
  });
  await page.waitForTimeout(300); await shot('boost-lane');
  await page.evaluate(() => { const G = __game; for (let i = 0; i < 70; i++) G.step(1 / 60); });
  await page.waitForTimeout(300); await shot('jump');

  check(errors.length === 0, '콘솔·페이지 오류 0 ' + JSON.stringify(errors.slice(0, 3)));
  await browser.close(); server.close();
})().catch(e => { console.error(e); process.exit(1); });
