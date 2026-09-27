// 8장 이타카 활쏘기 + 결말 점검.
// 금빛 띠에 맞춰 쏘면 여섯 발로 끝나고, 빗나가면 띠가 넓어지며, 구혼자 방패는 화살을 막는다.
// 끝나면 신화 카드 → 결말 그림책 4쪽 → "끝" 화면 → 8번 섬 지도로 이어져야 한다.
// 실행: NODE_PATH=<playwright가 있는 node_modules> node odyssey/tests/ithaca-smoke.cjs [스크린샷 폴더]
const { chromium } = require('playwright');
const fs = require('fs'), path = require('path'), http = require('http');
const site = path.resolve(__dirname, '..', '..');
const shots = process.argv[2] || null;
const types = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript', '.css': 'text/css', '.mp3': 'audio/mpeg', '.webp': 'image/webp', '.png': 'image/png' };
const server = http.createServer((q, r) => {
  const u = decodeURIComponent(new URL(q.url, 'http://x').pathname);
  let f = path.resolve(site, '.' + u); if (u.endsWith('/')) f = path.join(f, 'index.html');
  if (!fs.existsSync(f)) { r.writeHead(404); return r.end(); }
  r.writeHead(200, { 'Content-Type': types[path.extname(f)] || 'application/octet-stream' }); r.end(fs.readFileSync(f));
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
    const st = {};
    for (const id of ['cyclops', 'windVoyage', 'circe', 'underworld', 'sirens', 'scylla', 'helios']) st[id] = { cleared: true, bestStars: 3 };
    if (!sessionStorage.getItem('seeded')) { localStorage.setItem('ody_progress', JSON.stringify({ version: 3, wisdom: 7, stages: st })); sessionStorage.setItem('seeded', '1'); }
  });
  const page = await ctx.newPage();
  const errors = [];
  page.on('pageerror', e => errors.push(e.message));
  await page.goto(base + '/odyssey/');
  await page.waitForTimeout(1200);
  const shot = async name => { if (shots) await page.screenshot({ path: path.join(shots, 'ithaca-' + name + '.png') }); };

  const unlocked = await page.evaluate(() => ODY.Progress.unlockedStageIds(JSON.parse(localStorage.getItem('ody_progress'))));
  check(unlocked.includes('ithaca'), '헬리오스까지 끝내면 8장 이타카가 열린다');

  // 그림책 첫 장
  await page.evaluate(() => {
    const pages = ['ithacaShore', 'bowChallenge', 'twelveAxes', 'endingBow', 'argos', 'reunion', 'crewHome'];
    window.__pages = pages;
  });
  for (const scene of ['ithacaShore', 'bowChallenge', 'twelveAxes', 'argos', 'reunion', 'crewHome']) {
    await page.evaluate(sc => ODY.E.setScene(ODY.Story.Cutscene([{ scene: sc, chapter: sc, lines: ['그림 점검'] }], () => {})), scene);
    await page.waitForTimeout(700); await shot('story-' + scene);
  }

  // 스테이지: 구혼자가 올라온 순간 쏘면 막힌다
  let cleared = null;
  await page.evaluate(() => { window.__clear = null; window.__stage = ODY.Stages.ithaca({ onClear: r => { window.__clear = r; } }); ODY.E.setScene(window.__stage); });
  await page.waitForTimeout(2300);
  await shot('stage-aim');
  const s0 = await page.evaluate(() => ({ state: __stage.debug.state, round: __stage.debug.round }));
  check(s0.state === 'aim' && s0.round === 0, '소개 뒤 첫 화살 조준 상태');

  // 빗나감: 띠 밖일 때 쏜다
  await page.waitForFunction(() => { const d = __stage.debug; if (d.state === 'aim' && Math.abs(d.aimY - d.ringY) > d.tolerance + 30) { d.shoot(); return true; } return false; }, null, { timeout: 6000 });
  await page.waitForFunction(() => __stage.debug.state === 'aim', null, { timeout: 5000 });
  const miss = await page.evaluate(() => ({ misses: __stage.debug.misses, tol: __stage.debug.tolerance, state: __stage.debug.state }));
  check(miss.misses === 1 && miss.state === 'aim', '띠 밖에서 쏘면 빗나가고 다시 조준');

  // 맞히기: 여섯 번 성공할 때까지 정렬될 때만 쏜다
  for (let guard = 0; guard < 40; guard++) {
    const st = await page.evaluate(() => __stage.debug.state);
    if (st === 'clear') break;
    if (st !== 'aim') { await page.waitForTimeout(200); continue; }
    const round = await page.evaluate(() => __stage.debug.round);
    if (round === 2) {
      // 방패 점검(한 번): 방패가 올라와 있을 때 쏘면 막힌다
      const tested = await page.evaluate(() => window.__shieldTested || false);
      if (!tested) {
        await page.waitForFunction(() => __stage.debug.blocked && __stage.debug.state === 'aim', null, { timeout: 8000 });
        await shot('stage-suitor');
        const before = await page.evaluate(() => __stage.debug.misses);
        await page.evaluate(() => { window.__shieldTested = true; __stage.debug.shoot(); });
        await page.waitForFunction(() => __stage.debug.state === 'aim', null, { timeout: 5000 });
        const after = await page.evaluate(() => ({ misses: __stage.debug.misses, round: __stage.debug.round }));
        check(after.misses === before + 1 && after.round === 2, '구혼자 방패가 올라와 있으면 화살이 막힌다');
        continue;
      }
    }
    if (round === 4) await shot('stage-sway');
    // 띠 한가운데(허용치의 절반 안)일 때 같은 프레임에서 쏜다.
    await page.waitForFunction(() => { const d = __stage.debug; if (d.state === 'aim' && Math.abs(d.aimY - d.ringY) < d.tolerance * 0.5 && !d.blocked) { d.shoot(); return true; } return false; }, null, { timeout: 12000, polling: 'raf' });
    await page.waitForTimeout(300);
    if (round === 0) await shot('stage-flight');
    await page.waitForTimeout(1500);
  }
  await page.waitForFunction(() => window.__clear, null, { timeout: 8000 });
  cleared = await page.evaluate(() => window.__clear);
  check(cleared && cleared.passed === 6 && cleared.misses === 2, '빗나감 2번(일부러) + 여섯 발 성공으로 끝난다 (' + JSON.stringify(cleared) + ')');
  check(cleared.stars >= 1 && cleared.stars <= 3, '별 1~3개');

  // 실제 흐름: 메인 onIthacaClear → 카드 → 결말 4쪽 → 끝 → 지도
  await page.evaluate(() => {
    const st = ODY.Stages.ithaca;
    ODY.Stages.ithaca = o => { const scene = st(o); setTimeout(() => o.onClear({ stars: 3, misses: 0, passed: 6 }), 50); return scene; };
  });
  // 장 고르기에서 8장 버튼 보기
  await page.evaluate(() => { const p = JSON.parse(localStorage.getItem('ody_progress')); return p; });
  await page.goto(base + '/odyssey/');
  await page.waitForTimeout(1000);
  await page.keyboard.press('Enter'); // 지도
  await page.waitForTimeout(900);
  await shot('map-before');
  await page.evaluate(() => {
    const st = ODY.Stages.ithaca;
    ODY.Stages.ithaca = o => { const scene = st(o); setTimeout(() => o.onClear({ stars: 3, misses: 0, passed: 6 }), 50); return scene; };
  });
  await page.keyboard.press('Enter'); // 이타카로 → 그림책
  // 그림책 → (가짜로 바로 끝나는) 스테이지 → 카드 → 결말 그림책 → 끝: 엔터를 계속 눌러 끝까지 간다.
  const seen = new Set();
  for (let i = 0; i < 60; i++) {
    const label = await page.evaluate(() => document.getElementById('game').getAttribute('aria-label') || '');
    if (/끝/.test(label)) break;
    if (!seen.has('clear') && i === 14) { await shot('clearcard'); seen.add('clear'); }
    if (!seen.has('ending') && i === 26) { await shot('ending-1'); seen.add('ending'); }
    await page.keyboard.press('Enter');
    await page.waitForTimeout(450);
  }
  await page.waitForTimeout(1200);
  await shot('the-end');
  const endLabel = await page.evaluate(() => document.getElementById('game').getAttribute('aria-label'));
  check(/끝/.test(endLabel), '결말 뒤 "끝" 화면 (' + endLabel + ')');
  const prog = await page.evaluate(() => JSON.parse(localStorage.getItem('ody_progress')));
  check(prog.stages.ithaca && prog.stages.ithaca.cleared && prog.wisdom === 8, '지혜의 별 8개 저장');
  await page.keyboard.press('Enter');
  await page.waitForTimeout(900);
  await shot('map-after');

  // 헬리오스: 구할 친구 1~4가 아이들
  const kids = await page.evaluate(() => ODY.Levels.helios.build().crew.slice(0, 4).map(c => c.kid + ':' + c.name));
  check(kids.join(',') === 'taeo:태오,jaei:재이,yungeon:윤건,yunchan:윤찬', '목장 구할 친구 = 아이들 넷');
  check(ODY_subject_ok(await page.evaluate(() => [ODY.Kids.subject('태오'), ODY.Kids.subject('윤건')])), '조사(태오가·윤건이)');
  await page.evaluate(() => ODY.E.setScene(ODY.Stages.helios({ onClear() {} })));
  await page.waitForTimeout(2500);
  await shot('helios');

  check(errors.length === 0, '페이지 오류 없음 ' + JSON.stringify(errors.slice(0, 3)));
  await browser.close(); server.close();
})().catch(e => { console.error(e); process.exit(1); });

function ODY_subject_ok(v) { return v[0] === '태오가' && v[1] === '윤건이'; }
