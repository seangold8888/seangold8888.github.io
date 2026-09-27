// 산리오 카트 3D 업그레이드 점검(2026-09-27): 코스 거리·아이들·장난꾸러기·그랑프리·차고
// 실행: NODE_PATH=<playwright node_modules> node kart3d/tests/features.cjs [스크린샷 폴더]
const { chromium } = require('playwright');
const fs = require('fs'), path = require('path'), http = require('http');
const site = path.resolve(__dirname, '..', '..');
const shots = process.argv[2] || null;
const T = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript', '.css': 'text/css', '.glb': 'model/gltf-binary', '.webp': 'image/webp', '.mp3': 'audio/mpeg' };
const server = http.createServer((q, r) => {
  const u = decodeURIComponent(new URL(q.url, 'http://x').pathname);
  let f = path.resolve(site, '.' + u); if (u.endsWith('/')) f = path.join(f, 'index.html');
  if (!fs.existsSync(f)) { r.writeHead(404); return r.end(); }
  r.writeHead(200, { 'Content-Type': T[path.extname(f)] || 'application/octet-stream' }); r.end(fs.readFileSync(f));
});
function check(ok, msg) { if (!ok) { console.error('FAIL', msg); process.exitCode = 1; } else console.log('ok  ', msg); }

(async () => {
  await new Promise(r => server.listen(0, '127.0.0.1', r));
  const base = 'http://127.0.0.1:' + server.address().port;
  const browser = await chromium.launch({ channel: 'msedge', headless: true, args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
  const page = await browser.newPage({ viewport: { width: 1180, height: 820 } });
  const errors = [];
  page.on('pageerror', e => errors.push(e.message));
  await page.addInitScript(() => {
    const d = new Date();
    localStorage.setItem('hub_play_pass', JSON.stringify({ free: true, day: d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0') }));
    if (!sessionStorage.getItem('k3')) { localStorage.removeItem('sanrio-kart3d:garage:v1'); sessionStorage.setItem('k3', '1'); }
  });
  await page.goto(base + '/kart3d/');
  await page.waitForTimeout(2000);
  const shot = async n => { if (shots) await page.screenshot({ path: path.join(shots, 'k3-' + n + '.png') }); };
  await shot('menu');

  // 메뉴: 아이들 4명이 사진과 함께
  const cards = await page.$$eval('#menu-list .card', els => els.map(e => ({ t: e.textContent, img: !!(e.querySelector('img') && e.querySelector('img').src.startsWith('data:image')) })));
  check(cards.length === 11 && ['재이', '태오', '윤찬', '윤건'].every(n => cards.some(c => c.t.includes(n))), '드라이버 11명(아이들 넷 포함)');
  check(cards.every(c => c.img), '모든 카드에 카트 사진');

  // 그랑프리 하트 컵, 재이로 자동 주행
  const run = async () => page.evaluate(() => {
    const G = window.__game;
    let n = 0;
    while (G.state.scene === 'race' && n < 60 * 240) { G.step(1 / 60); n++; }
    return { scene: G.state.scene, secs: n / 60 };
  });
  await page.evaluate(() => {
    const G = window.__game;
    G.pick(7, 0, 0); G.state.cupIndex = 0;
    document.getElementById('menu').style.display = 'none';
    G.startCup(); G.autopilot(true);
  });
  const lineup = await page.evaluate(() => window.__game.state.karts.map(k => k.spec.id));
  check(lineup.length === 6 && lineup[0] === 'jaei' && lineup.includes('taeppul') && lineup.includes('geonppul'), '하트 컵 출전: 재이 + 태뿔·건뿔 + 친구 셋 ' + lineup.join(','));
  const lap0 = await page.evaluate(() => { const G = window.__game; for (let i = 0; i < 60 * 6; i++) G.step(1 / 60); return document.getElementById('lap').textContent; });
  check(lap0 === '1 / 2', '출발 직후 바퀴 표시 1 / 2 (' + lap0 + ')');
  const fx = await page.evaluate(() => { const f = window.__game.fx; return { pads: f.pads.length, coins: f.coins.length, obs: f.obstacles.length, rings: f.rings.length }; });
  check(fx.pads === 4 && fx.coins >= 25 && fx.obs === 3, '코스 거리: 발판 4 · 코인 ' + fx.coins + ' · 장애물 3 · 링 ' + fx.rings);
  // 카메라가 발판·코인 근처를 보도록 몇 초 더 달린 뒤 찍는다
  await page.evaluate(() => { const G = window.__game; for (let i = 0; i < 60 * 3; i++) G.step(1 / 60); });
  await page.waitForTimeout(300); await shot('race1');

  let r = await run();
  check(r.scene === 'result', '1경주 완주 ' + r.secs.toFixed(0) + '초');
  const st1 = await page.evaluate(() => ({ picks: window.__game.state.coinPicks, gp: window.__game.state.gp.points.slice(), txt: document.getElementById('result-coins').textContent, next: document.getElementById('next-race').textContent }));
  check(st1.picks > 0, '코인 주움 ' + st1.picks);
  check(st1.gp.reduce((a, b) => a + b, 0) === 10 + 8 + 6 + 4 + 2 + 1, '점수 합 31 ' + st1.gp.join(','));
  check(/다음 경주/.test(st1.next), '다음 경주 버튼');
  await shot('standings');
  for (let race = 2; race <= 3; race++) {
    await page.evaluate(() => { document.getElementById('result').style.display = 'none'; window.__game.nextCupRace(); window.__game.autopilot(true); });
    r = await run();
    check(r.scene === 'result', race + '경주 완주 ' + r.secs.toFixed(0) + '초');
  }
  const podium = await page.evaluate(() => { document.getElementById('result').style.display = 'none'; window.__game.nextCupRace(); return window.__game.state.scene; });
  check(podium === 'podium', '세 경주 뒤 시상식');
  await page.waitForTimeout(1500); await shot('podium');
  const g1 = await page.evaluate(() => JSON.parse(localStorage.getItem('sanrio-kart3d:garage:v1')));
  check(g1 && g1.coins > 20, '코인이 지갑에 쌓임 ' + (g1 && g1.coins));

  // 번개: 예고 중 점프하면 피하고, 아니면 빙글
  const zap = await page.evaluate(() => {
    const G = window.__game;
    document.getElementById('podium').style.display = 'none';
    G.pick(0, 1, 1); G.state.gp = null; G.startRace(); G.autopilot(false);
    for (let i = 0; i < 60 * 5; i++) G.step(1 / 60);
    const p = G.state.player;
    const out = {};
    // 장난꾸러기를 찬뿔로 바꿔 끼우고 바로 뒤에 둔다
    const v = G.state.karts.find(k => k.prank);
    v.prank = 'zap'; v.x = p.x - Math.sin(p.angle) * 60; v.z = p.z - Math.cos(p.angle) * 60; v.total = p.total - 60; v.prankClock = 0;
    G.state.karts.forEach(k => { if (k !== v) k.prankClock = 99; if (k !== v && k !== p) k.total = p.total - 3000; });
    G.updateVillains(0.016);
    out.warned = !!p.zapBy;
    for (let i = 0; i < 50; i++) G.step(1 / 60);
    p.airborne = true; p.vy = 80; p.y += 1;
    for (let i = 0; i < 40; i++) G.step(1 / 60);
    out.dodged = p.spin === 0 && !p.zapBy;
    out.dbg = { spin: p.spin, zapBy: !!p.zapBy, air: p.airborne };
    v.prankClock = 0; v.total = p.total - 60;
    G.updateVillains(0.016);
    for (let i = 0; i < 90; i++) G.step(1 / 60);
    out.hitSpin = p.spin > 0 || p.speed < p.baseTop * 0.8;
    return out;
  });
  check(zap.warned && zap.dodged, '번개 예고 → 점프로 피함 ' + JSON.stringify(zap));
  check(zap.hitSpin, '가만있으면 번개에 빙글');

  // 차고: 코인으로 사고 끼우면 저장
  await page.evaluate(() => {
    const G = window.__game; G.state.scene = 'menu';
    const g = JSON.parse(localStorage.getItem('sanrio-kart3d:garage:v1')); g.coins = 200;
    localStorage.setItem('sanrio-kart3d:garage:v1', JSON.stringify(g));
    G.state.garage.coins = 200;
    G.pick(7, 0, 0); G.openGarage();
  });
  await page.waitForTimeout(500);
  await page.click('.gitem:nth-child(2)');       // 딸기 핑크
  await page.click('.tab:nth-child(2)'); await page.click('.gitem:nth-child(2)');   // 별 바퀴
  await page.click('.tab:nth-child(3)'); await page.click('.gitem:nth-child(4)');   // 풍선
  await page.click('.tab:nth-child(4)'); await page.click('.gitem:nth-child(4)');   // 무지개 꼬리
  await page.waitForTimeout(600); await shot('garage');
  const g2 = await page.evaluate(() => JSON.parse(localStorage.getItem('sanrio-kart3d:garage:v1')));
  check(g2.equip.paint === 'strawberry' && g2.equip.wheels === 'star' && g2.equip.topper === 'balloon' && g2.equip.trail === 'rainbow' && g2.coins === 200 - 15 - 20 - 25 - 50,
    '차고 구매·장착 저장 ' + JSON.stringify(g2.equip) + ' 코인 ' + g2.coins);
  const locked = await page.$$eval('.tab', t => t.length);
  void locked;

  check(errors.length === 0, '페이지 오류 없음 ' + JSON.stringify(errors.slice(0, 3)));
  await browser.close(); server.close();
})().catch(e => { console.error(e); process.exit(1); });
