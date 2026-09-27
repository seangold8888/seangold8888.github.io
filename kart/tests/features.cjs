// 산리오 카트(간단판) 업그레이드 점검(2026-09-27): 코스 거리·아이들·장난꾸러기·그랑프리·차고(3D와 같은 지갑)
// 실행: NODE_PATH=<playwright node_modules> node kart/tests/features.cjs [스크린샷 폴더]
const { chromium } = require('playwright');
const fs = require('fs'), path = require('path'), http = require('http');
const site = path.resolve(__dirname, '..', '..');
const shots = process.argv[2] || null;
const T = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript', '.css': 'text/css', '.webp': 'image/webp', '.mp3': 'audio/mpeg' };
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
  const browser = await chromium.launch({ channel: 'msedge', headless: true });
  const page = await browser.newPage({ viewport: { width: 1180, height: 820 } });
  const errors = [];
  page.on('pageerror', e => errors.push(e.message));
  await page.addInitScript(() => {
    const d = new Date();
    localStorage.setItem('hub_play_pass', JSON.stringify({ free: true, day: d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0') }));
    if (!sessionStorage.getItem('k2')) { localStorage.removeItem('sanrio-kart3d:garage:v1'); sessionStorage.setItem('k2', '1'); }
  });
  await page.goto(base + '/kart/');
  await page.waitForTimeout(1200);
  const shot = async n => { if (shots) await page.screenshot({ path: path.join(shots, 'k2-' + n + '.png') }); };
  await shot('select');

  const names = await page.evaluate(() => SK.CHARACTERS.map(c => c.name));
  check(names.length === 11 && ['재이', '태오', '윤찬', '윤건'].every(n => names.includes(n)), '드라이버 11명 ' + names.join(','));

  await page.evaluate(() => { SK._debug.setStep(1); SK._debug.setCup(0); });
  await page.waitForTimeout(300); await shot('courses');

  // 그랑프리 하트 컵(2경주)
  await page.evaluate(() => { SK._debug.pick(7); SK._debug.startCup(0); SK._debug.autopilot(true); });
  const lineup = await page.evaluate(() => SK._debug.karts.map(k => k.spec.id));
  check(lineup.length === 6 && lineup[0] === 'jaei' && lineup.includes('taeppul') && lineup.includes('geonppul'), '하트 컵 명단 ' + lineup.join(','));
  const fx = await page.evaluate(() => { const f = SK._debug.fx; return { pads: f.pads.length, coins: f.coins.length, obs: f.obstacles.length }; });
  check(fx.pads === 4 && fx.coins === 25 && fx.obs === 3, '코스 거리 ' + JSON.stringify(fx));
  const run = () => page.evaluate(() => { let n = 0; while (SK._debug.scene === 'race' && n < 60 * 240) { SK._debug.step(1 / 60); n++; } return { scene: SK._debug.scene, secs: n / 60 }; });
  await page.evaluate(() => { for (let i = 0; i < 60 * 9; i++) SK._debug.step(1 / 60); });
  await page.waitForTimeout(300); await shot('race');
  let r = await run();
  check(r.scene === 'result', '1경주 완주 ' + r.secs.toFixed(0) + '초');
  const g1 = await page.evaluate(() => ({ pts: SK._debug.gp.points.slice(), picks: SK._debug.coinPicks }));
  check(g1.pts.reduce((a, b) => a + b, 0) === 31, '점수 합 31 ' + g1.pts.join(','));
  await page.waitForTimeout(300); await shot('standings');
  await page.evaluate(() => { SK._debug.nextCupRace(); SK._debug.autopilot(true); });
  r = await run();
  check(r.scene === 'result', '2경주 완주 ' + r.secs.toFixed(0) + '초');
  await page.evaluate(() => SK._debug.nextCupRace());
  check(await page.evaluate(() => SK._debug.scene) === 'podium', '시상식');
  await page.waitForTimeout(1200); await shot('podium');
  const wallet = await page.evaluate(() => JSON.parse(localStorage.getItem('sanrio-kart3d:garage:v1')));
  check(wallet && wallet.coins > 10, '3D판과 같은 지갑에 코인 ' + (wallet && wallet.coins));

  // 번개: 떨어질 자리에서 비키면 무사, 그대로면 빙글
  const zap = await page.evaluate(() => {
    const D = SK._debug;
    D.setScene('select'); D.pick(0); D.setTrack(0); D.startRace(); D.autopilot(false);
    for (let i = 0; i < 60 * 5; i++) D.step(1 / 60);
    const p = D.player;
    const v = D.karts.find(k => k.prank);
    D.karts.forEach(k => { if (k !== v) k.prankClock = 99; if (k !== v && k !== p) k.total = p.total - 5000; });
    v.prank = 'zap'; v.total = p.total - 300; v.prankClock = 0;
    D.updateVillains(0.016);
    const st = D.strikes[0];
    const out = { warned: !!st };
    // 그대로 두면 맞는다
    st.x = p.x; st.y = p.y; st.t = 0.01;
    D.updateVillains(0.02);
    out.hit = p.spin > 0;
    p.spin = 0;
    v.prankClock = 0; v.total = p.total - 300;
    D.updateVillains(0.016);
    const st2 = D.strikes[0];
    st2.x = p.x + 400; st2.y = p.y; st2.t = 0.01;       // 멀리 비켜 있음
    D.updateVillains(0.02);
    out.dodged = p.spin === 0;
    return out;
  });
  check(zap.warned && zap.hit && zap.dodged, '번개 예고·맞음·비킴 ' + JSON.stringify(zap));

  // 차고
  await page.evaluate(() => {
    const g = JSON.parse(localStorage.getItem('sanrio-kart3d:garage:v1')); g.coins = 200;
    localStorage.setItem('sanrio-kart3d:garage:v1', JSON.stringify(g));
    SK._debug.pick(8); SK._debug.openGarage();
    const P = (x, y) => SK._debug.garagePointer({ x, y });
    P(452 + 162 + 70, 176 + 30);                 // 딸기 핑크(두 번째 칸)
    P(452 + 118 + 50, 130); P(452 + 162 + 70, 176 + 30);     // 바퀴 탭 → 별 바퀴
    P(452 + 236 + 50, 130); P(452 + 70, 176 + 88 + 30);   // 꼭대기 → 풍선(4번째: 둘째 줄 첫 칸)
  });
  await page.waitForTimeout(500); await shot('garage');
  const g2 = await page.evaluate(() => JSON.parse(localStorage.getItem('sanrio-kart3d:garage:v1')));
  check(g2.equip.paint === 'strawberry' && g2.equip.wheels === 'star' && g2.equip.topper === 'balloon', '차고 장착 ' + JSON.stringify(g2.equip) + ' 코인 ' + g2.coins);

  check(errors.length === 0, '페이지 오류 없음 ' + JSON.stringify(errors.slice(0, 3)));
  await browser.close(); server.close();
})().catch(e => { console.error(e); process.exit(1); });
