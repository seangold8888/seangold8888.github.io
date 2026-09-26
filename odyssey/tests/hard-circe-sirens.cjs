// 키르케·세이렌 어려운 길 점검(2026-09-26).
// - 일반 레벨 데이터는 그대로(세이렌 파동 좌표·종류, 키르케 돼지 수).
// - 세이렌: 보라 뾰족 노래는 방패로 막히지 않고, 피하면 '피했다'로 센다.
// - 키르케: 보라 리본 장난 돼지를 맞히면 속은 수가 늘고 치료되지 않는다. 진짜 친구만 세어 끝난다.
// - 장 고르기: 일반 길을 끝낸 장에만 어려운 길 버튼, 각 장 바로 뒤 키보드 순서.
// 실행: NODE_PATH=<playwright node_modules> node odyssey/tests/hard-circe-sirens.cjs [스크린샷 폴더]
const { chromium } = require('playwright');
const fs = require('fs'), path = require('path'), http = require('http');
const site = path.resolve(__dirname, '..', '..');
const shots = process.argv[2] || null;
const types = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript', '.css': 'text/css' };
const server = http.createServer((q, r) => {
  const u = decodeURIComponent(new URL(q.url, 'http://x').pathname);
  let f = path.resolve(site, '.' + u); if (u.endsWith('/')) f = path.join(f, 'index.html');
  if (!fs.existsSync(f)) { r.writeHead(404); return r.end(); }
  let body = fs.readFileSync(f);
  if (f.endsWith(path.join('odyssey', 'index.html'))) {
    body = body.toString('utf8').replace('  ODY.Progress = {', '  window.__app={showAdventureSelect,startCirce,startSirens};\n  ODY.Progress = {');
  }
  r.writeHead(200, { 'Content-Type': types[path.extname(f)] || 'application/octet-stream' }); r.end(body);
});
function check(ok, msg) { if (!ok) { console.error('FAIL', msg); process.exitCode = 1; } else console.log('ok  ', msg); }

(async () => {
  await new Promise(r => server.listen(0, '127.0.0.1', r));
  const base = 'http://127.0.0.1:' + server.address().port;
  const browser = await chromium.launch({ channel: 'msedge', headless: true });
  const ctx = await browser.newContext({ viewport: { width: 1180, height: 820 } });
  await ctx.addInitScript(() => {
    const d = new Date();
    const day = d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
    localStorage.setItem('hub_play_pass', JSON.stringify({ free: true, day }));
  });
  const page = await ctx.newPage();
  const errors = [];
  page.on('pageerror', e => errors.push(e.message));
  await page.goto(base + '/odyssey/');
  await page.waitForTimeout(900);
  const shot = async name => { if (shots) await page.screenshot({ path: path.join(shots, 'hard-' + name + '.png') }); };
  const labels = () => page.evaluate(() => ODY.E.scene && ODY.E.scene.__buttons ? ODY.E.scene.__buttons : null);
  void labels;

  // 일반 레벨 데이터 불변
  const normal = await page.evaluate(() => {
    const lv = ODY.Levels.sirens.build();
    return { n: lv.waves.length, deep: lv.waves.some(w => 'deep' in w), kinds: lv.waves.map(w => w.kind).join(',') };
  });
  check(normal.n === 24 && !normal.deep, '세이렌 일반 파동 24개, deep 속성 없음');
  const hard = await page.evaluate(() => {
    const lv = ODY.Levels.sirens.build({ hard: true });
    return { n: lv.waves.length, deep: lv.waves.filter(w => w.deep).length, sorted: lv.waves.every((w, i, a) => i === 0 || a[i - 1].x <= w.x) };
  });
  check(hard.n === 27 && hard.deep === 7 && hard.sorted, '세이렌 어려운 길: 뾰족 노래 7개(바꿈 4 + 추가 3), x 순서');

  // 진행도 규칙
  const prog = await page.evaluate(() => {
    const P = ODY.Progress;
    const base = { version: 3, wisdom: 0, stages: {} };
    const a = P.applyStageResult(base, 'sirens', 3, { hard: true });
    const b = P.applyStageResult(P.applyStageResult(base, 'sirens', 2), 'sirens', 3, { hard: true });
    const c = P.applyStageResult(P.applyStageResult(base, 'helios', 2), 'helios', 3, { hard: true });
    return { lockedHard: !(a.stages.sirens && a.stages.sirens.cleared), hardAfter: b.stages.sirens.hardCleared, wisdom: b.wisdom, noHelios: !c.stages.helios.hardCleared };
  });
  check(prog.lockedHard && prog.hardAfter && prog.wisdom === 1 && prog.noHelios, '어려운 길은 일반 클리어 뒤에만 기록, 지혜의 별 추가 없음, 없는 장은 무시');

  // 장 고르기 버튼
  await page.evaluate(() => {
    const st = {};
    for (const id of ['cyclops', 'windVoyage', 'circe', 'underworld', 'sirens']) st[id] = { cleared: true, bestStars: 3 };
    st.circe.hardCleared = true;
    localStorage.setItem('ody_progress', JSON.stringify({ version: 3, wisdom: 5, stages: st }));
    window.__app.showAdventureSelect(null);
  });
  await page.waitForTimeout(700);
  await shot('select');
  // 키보드로 버튼 차례를 훑어 이름을 모은다(오른쪽 화살표 + 알림 문구).
  const order = [];
  for (let i = 0; i < 14; i++) {
    const text = await page.evaluate(() => document.getElementById('game-status') ? document.getElementById('game-status').textContent : '');
    order.push(text);
    await page.keyboard.press('ArrowRight');
    await page.waitForTimeout(120);
  }
  const flat = order.join(' | ');
  check((flat.match(/어려운 길/g) || []).length >= 3, '어려운 길 버튼 세 개(키클롭스·키르케·세이렌)');
  check(/어려운 길 ✓/.test(flat), '끝낸 어려운 길에 ✓');

  // 세이렌 어려운 길: 뾰족 노래는 방패로 안 막힌다
  await page.evaluate(() => { window.__clear = null; window.__s = ODY.Stages.sirens({ hard: true, onClear: r => { window.__clear = r; } }); ODY.E.setScene(window.__s); });
  await page.waitForTimeout(2600);
  const deepTest = await page.evaluate(async () => {
    const d = __s.debug;
    const first = d.waves.find(w => w.deep);
    // 배를 파동 높이에 두고 방패를 계속 켠다.
    const until = t => new Promise(r => { const tick = () => (t() ? r() : requestAnimationFrame(tick)); tick(); });
    const hold = setInterval(() => { d.ship.y = first.y; d.ship.invin = 0; ODY.E.input.setHeld('action', true); ODY.E.input.setHeld('action', false); }, 30);
    const before = d.hearts;
    await until(() => first.resolved || d.distance > first.x + 200);
    clearInterval(hold);
    return { before, after: d.hearts, deepHits: d.deepHits, hit: first.hit };
  });
  await shot('sirens-deep');
  check(deepTest.hit && deepTest.after < deepTest.before && deepTest.deepHits === 1, '방패를 켜도 뾰족 노래에 맞는다 ' + JSON.stringify(deepTest));
  const dodge = await page.evaluate(async () => {
    const d = __s.debug;
    const next = d.waves.filter(w => w.deep)[1];
    const until = t => new Promise(r => { const tick = () => (t() ? r() : requestAnimationFrame(tick)); tick(); });
    const hold = setInterval(() => { d.ship.y = next.y < 275 ? 400 : 150; }, 30);
    const before = d.dodged;
    await until(() => d.distance > next.x + 250);
    clearInterval(hold);
    return { before, after: d.dodged, hit: !!next.hit };
  });
  check(!dodge.hit && dodge.after === dodge.before + 1, '다른 높이로 비키면 "피했다" ' + JSON.stringify(dodge));
  await page.waitForTimeout(400);
  await shot('sirens-run');

  // 키르케 어려운 길: 장난 돼지
  await page.evaluate(() => { window.__c = ODY.Stages.circe({ hard: true, onClear: r => { window.__clear = r; } }); ODY.E.setScene(window.__c); });
  await page.waitForTimeout(2600);
  const decoy = await page.evaluate(() => {
    const d = __c.debug;
    const decoys = d.decoys;
    const target = decoys[0];
    // 잎 하나를 쥐여 주고, 장난 돼지 바로 옆에서 그쪽을 보고 뿌린다.
    const hero = d.hero;
    hero.x = target.x - 40; hero.y = target.y; hero.facingAngle = 0;
    return { count: decoys.length };
  });
  check(decoy.count === 4, '장난 돼지 4마리(3~6번 친구 길)');
  const trick = await page.evaluate(() => {
    const d = __c.debug;
    const target = d.decoys[0];
    d.giveLeaf(); d.resetCast();
    const hero = d.hero;
    hero.x = target.x - 30; hero.y = target.y; hero.facingAngle = 0;
    const cured0 = d.cured;
    d.tryCast();
    return { tricked: d.tricked, gone: target.gone, cured: d.cured - cured0 };
  });
  check(trick.tricked === 1 && trick.gone && trick.cured === 0, '장난 돼지를 맞히면 속은 수 +1, 사라지고, 치료 0 ' + JSON.stringify(trick));
  const real = await page.evaluate(() => {
    const d = __c.debug;
    const pig = d.pigs[0];
    d.resetCast();
    d.hero.x = pig.x - 30; d.hero.y = pig.y; d.hero.facingAngle = 0;
    d.tryCast();
    return { cured: d.cured, kid: pig.kid };
  });
  check(real.cured === 1 && real.kid === 'taeo', '진짜 친구(태오 돼지)는 약초로 돌아온다 ' + JSON.stringify(real));
  await shot('circe');

  // 카메라를 장난 돼지 쪽으로 옮긴 모습
  await page.evaluate(() => { const d = __c.debug; const t = d.decoys[0]; d.hero.x = t.x - 90; d.hero.y = t.y; });
  await page.waitForTimeout(1200);
  await shot('circe-decoy');

  check(errors.length === 0, '페이지 오류 없음 ' + JSON.stringify(errors.slice(0, 3)));
  await browser.close(); server.close();
})().catch(e => { console.error(e); process.exit(1); });
