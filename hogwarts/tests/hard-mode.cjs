// 호그와트 「어려운 학년」 검사.
// 1) 일반 모드 동일성: 이전 커밋의 index.html 과 현재 파일로 여섯 학년을 같은 난수·같은 입력으로
//    돌려, 60프레임마다 캔버스 픽셀 해시가 전부 같아야 한다.
// 2) 어려운 학년 동작: 별빛 게이지 연성 상한, 금빛 공격 반사, 보스 공략 창 열림, 구조, 저장 v3.
// 계측은 page.route 응답에만 주입한다. 배포 소스에는 넣지 않는다.
// 실행(사이트 루트): node hogwarts/tests/hard-mode.cjs [baseline.html]
'use strict';
const assert = require('node:assert/strict');
const fs = require('node:fs'), path = require('node:path'), http = require('node:http');
const { execFileSync } = require('node:child_process');
const { chromium } = require('playwright');

const site = path.resolve(__dirname, '..', '..');
const current = fs.readFileSync(path.join(site, 'hogwarts', 'index.html'), 'utf8');
const baseline = process.argv[2]
  ? fs.readFileSync(process.argv[2], 'utf8')
  : execFileSync('git', ['show', 'HEAD~0:hogwarts/index.html'], { cwd: site, encoding: 'utf8', maxBuffer: 1 << 26 });

function instrument(html) {
  // 페이지 루프를 멈추고, 결과·학년 선택 장면을 테스트에서 부를 수 있게 한다.
  return html
    .split('requestAnimationFrame(frame)').join('(window.__frame=frame)')
    .replace('WQ.App={chapters,', 'WQ.App={Clear,startChapter,ChapterSelect,loadSave,chapters,');
}

const pages = { '/current.html': instrument(current), '/baseline.html': instrument(baseline) };

(async () => {
  const server = http.createServer((req, res) => {
    const url = new URL(req.url, 'http://localhost');
    if (pages[url.pathname]) { res.setHeader('Content-Type', 'text/html; charset=utf-8'); res.end(pages[url.pathname]); return; }
    const file = path.resolve(site, 'hogwarts', '.' + decodeURIComponent(url.pathname));
    fs.readFile(file, (err, data) => { if (err) { res.writeHead(404).end(); return; } res.end(data); });
  });
  await new Promise(r => server.listen(0, '127.0.0.1', r));
  const base = 'http://127.0.0.1:' + server.address().port;
  const browser = await chromium.launch({ headless: true });
  const errors = [];

  async function open(name, save) {
    const ctx = await browser.newContext({ viewport: { width: 960, height: 540 } });
    const page = await ctx.newPage();
    page.on('pageerror', e => errors.push(name + ': ' + e.message));
    await page.addInitScript(s => {
      let seed = 20260913;
      Math.random = () => { seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0; return seed / 4294967296; };
      localStorage.clear();
      if (s) localStorage.setItem('wq_save', JSON.stringify(s));
      window.WQ = { DEBUG: true };
    }, save || null);
    await page.goto(base + name);
    await page.waitForFunction(() => window.WQ && WQ.App && WQ.BroomRescue);
    return { page, ctx };
  }

  // ── 1. 일반 모드 동일성 ─────────────────────────────────────────
  const STAGES = ['BroomRescue', 'MovingStairs', 'PotionClass', 'Quidditch', 'RequireRoom', 'CastleDefense'];
  async function trace(name) {
    const { page, ctx } = await open(name);
    const out = await page.evaluate(stages => {
      const E = WQ.E, F = WQ.Feel, cv = document.createElement('canvas');
      cv.width = 960; cv.height = 540; const g = cv.getContext('2d');
      const hash = () => { const d = g.getImageData(0, 0, 960, 540).data; let h = 2166136261; for (let i = 0; i < d.length; i += 7) h = Math.imul(h ^ d[i], 16777619) >>>0; return h; };
      const result = {};
      for (const id of stages) {
        E.input.clear(); F.reset();
        const stage = WQ[id](() => {}); stage.enter();
        const frames = [];
        for (let f = 0; f < 60 * 45; f++) {
          // 결정적인 입력: 위아래 왕복 + 오른쪽 조금 + 주문 연타
          const phase = Math.floor(f / 50) % 4;
          ['up', 'down', 'left', 'right'].forEach(a => E.input.release(a));
          E.input.press(phase === 0 ? 'up' : phase === 2 ? 'down' : 'right');
          if (f % 23 === 0) E.input.press('cast'); else E.input.release('cast');
          E.time += 1 / 60;
          stage.update(1 / 60, 1 / 60); F.update(1 / 60, 1 / 60);
          if (f % 60 === 0) { g.setTransform(1, 0, 0, 1, 0, 0); g.fillStyle = '#17142d'; g.fillRect(0, 0, 960, 540); stage.draw(g); frames.push(hash()); }
        }
        stage.exit?.(); result[id] = frames;
      }
      return result;
    }, STAGES);
    await ctx.close();
    return out;
  }
  const before = await trace('/baseline.html');
  const after = await trace('/current.html');
  for (const id of STAGES) {
    const a = before[id], b = after[id];
    const diff = a.findIndex((h, i) => h !== b[i]);
    assert.equal(diff, -1, `${id}: normal mode diverged at sample ${diff}`);
  }
  console.log('PASS normal mode identical for 6 chapters,', before.BroomRescue.length, 'samples each');

  // ── 2. 어려운 학년 ────────────────────────────────────────────
  const clearedSave = { version: 2, character: 'harry', sawPrologue: true, chapters: Object.fromEntries(
    ['forest', 'stairs', 'potion', 'quidditch', 'require', 'defense'].map((id, i) => [id, { unlocked: true, cleared: i < 5, bestStars: 2 }])) };
  const { page } = await open('/current.html', clearedSave);

  const hard = await page.evaluate(() => {
    const E = WQ.E, F = WQ.Feel, r = {};
    const run = (id, frames, each) => { for (let f = 0; f < frames; f++) { E.time += 1 / 60; each && each(f); WQ._cur.update(1 / 60, 1 / 60); F.update(1 / 60, 1 / 60); } };
    const start = (id, hardOn) => { E.input.clear(); F.reset(); WQ.Hard.pending = hardOn; WQ._cur = WQ[id](() => { r.cleared = true; }); WQ.Hard.pending = false; WQ._cur.enter(); return WQ.Hard.last; };

    // 2-a 일반으로 만들면 꺼져 있다
    r.normalOff = start('Quidditch', false).on === false && document.getElementById('shieldBtn').hidden === true;

    // 2-b 연성 상한: 60 아래는 60까지만 회복, 60 위로는 자동으로 오르지 않음, 보상은 위로 갈수록 덜 오름
    let H = start('Quidditch', true);
    r.buttonShown = document.getElementById('shieldBtn').hidden === false;
    H.value = 40; H.update(10, false); r.regenCap = Math.round(H.value);
    H.value = 80; H.update(10, false); r.noRegenAbove = Math.round(H.value);
    H.value = 40; H.update(20, true); r.restCap = Math.round(H.value);

    // 2-b' 밸런스 가드: 일정 간격으로 맞을 때 몇 대째에 구조되는가 (일반 하트는 언제나 5대)
    const periodic = interval => { const h = start('PotionClass', true); let n = 0; for (let f = 1; f <= 60 * 150; f++) { E.time += 1 / 60; WQ._cur.update(1 / 60, 1 / 60); if (f % Math.round(interval * 60) === 0) { n++; h.hurt({ hp: 5, max: 5 }); if (h.rescues) return n; } } return null; };
    r.hitsToRescue = { every1_2s: periodic(1.2), every6s: periodic(6), every8s: periodic(8), every15s: periodic(15) };
    H.value = 60; H.reward('reflect'); const g60 = H.value; H.value = 95; H.reward('reflect'); const g95 = H.value - 95;
    r.taper = [Math.round((g60 - 60) * 10) / 10, Math.round(g95 * 10) / 10];

    // 2-c 퀴디치 1구간: 가만히 있으면 블러저에 맞아 별빛이 준다. 방패를 켜 두면 금빛은 반사된다.
    // 디버그 훅은 장을 만들 때마다 새로 생기므로 항상 최신 것을 가리키게 한다.
    const Q = new Proxy({}, { get: (_, k) => WQ._quidditch[k] });
    H = start('Quidditch', true);
    Q.skip(); Q.warp(850, 130); run('Quidditch', 60);         // 1구간으로
    r.room1 = Q.state().room;
    H.forceShield = true; Q.warp(200, 240);
    let gold = 0; run('Quidditch', 60 * 40, () => Q.warp(200, 240));
    r.reflectsRoom1 = H.reflects; r.hinted = H.hinted;

    // 2-d 보스: 금빛 반사가 공략 창을 연다
    H = start('Quidditch', true); H.forceShield = true;
    for (let i = 0; i < 4; i++) { Q.skip(); Q.warp(850, 130); run('Quidditch', 60); }
    r.bossRoom = Q.state().room;
    Q.openBoss(); Q.hitBoss();                                  // 블러저가 나오기 시작하게 한 번 맞힘
    let opened = false, prev = H.reflects;
    run('Quidditch', 60 * 60, () => {
      Q.warp(640, 240);
      const st = Q.state().boss;
      if (H.reflects > prev) { if (st && st.state === 'vulnerable') opened = true; prev = H.reflects; }
    });
    r.bossReflects = H.reflects; r.bossOpened = opened;

    // 2-e 아무것도 안 하면(1학년) 구조된다. 일반 하트는 쓰지 않는다. 몇 초에 처음 구조되는지 기록.
    H = start('BroomRescue', true);
    let firstRescueAt = null, t = 0, minGlow = 100;
    run('BroomRescue', 60 * 70, () => { t += 1 / 60; minGlow = Math.min(minGlow, H.value); if (firstRescueAt === null && H.rescues > 0) firstRescueAt = Math.round(t); });
    r.idleRescueAt = firstRescueAt; r.idleRescues = H.rescues; r.idleMinGlow = Math.round(minGlow);

    // 2-f 금빛 구름은 주문으로 사라지지 않는다 (방어전 1구간). 성벽을 훑으며 주문을 쏘면
    //     보통 구름은 다 터지고 금빛 구름만 남는다.
    const D = new Proxy({}, { get: (_, k) => WQ._defense[k] });
    H = start('CastleDefense', true);
    D.skip(); D.warp(850, 330); run('CastleDefense', 60);
    r.defRoom = D.state().room;
    run('CastleDefense', 60 * 30, f => { D.warp(100 + (f % 480) / 480 * 700, 400); if (f % 20 === 0) E.input.press('cast'); else E.input.release('cast'); });
    r.goldCloudsSurviveCast = D.state().clouds > 0 && H.hinted;

    // 2-g 별 등급
    H = start('PotionClass', true); H.rescues = 0; H.reflects = 4; r.rating3 = H.rating(1);
    H.rescues = 1; r.rating2 = H.rating(3); H.rescues = 2; r.rating1 = H.rating(3);
    return r;
  });
  console.log('hard', JSON.stringify(hard));
  assert.equal(hard.normalOff, true, 'normal stage has hard off and no shield button');
  assert.equal(hard.buttonShown, true, 'hard stage shows the shield button');
  assert.equal(hard.regenCap, 60, 'automatic recovery stops at 60');
  assert.equal(hard.noRegenAbove, 80, 'no automatic recovery above the soft cap');
  assert.equal(hard.restCap, 75, 'rest rooms recover to 75');
  assert.ok(hard.taper[0] === 9 && hard.taper[1] < 1.5, 'rewards shrink near the maximum');
  assert.equal(hard.hitsToRescue.every1_2s, 3, 'back-to-back hits rescue on the third');
  assert.ok(hard.hitsToRescue.every6s <= 4, 'frequent hits rescue sooner than five hearts');
  assert.ok(hard.hitsToRescue.every8s !== null && hard.hitsToRescue.every8s <= 5, 'a hit every 8s is never easier than normal hearts');
  assert.equal(hard.hitsToRescue.every15s, null, 'a few spread-out mistakes never force a rescue');
  assert.equal(hard.room1, 1);
  assert.ok(hard.reflectsRoom1 >= 1 && hard.hinted, 'gold bludgers get reflected by the shield');
  assert.equal(hard.bossRoom, 4);
  assert.ok(hard.bossReflects >= 1 && hard.bossOpened, 'reflecting a gold bludger opens the snitch window');
  assert.ok(hard.idleRescues >= 1, 'doing nothing in the forest ends in a rescue');
  assert.equal(hard.defRoom, 1);
  assert.equal(hard.goldCloudsSurviveCast, true, 'gold clouds survive spells');
  assert.deepEqual([hard.rating3, hard.rating2, hard.rating1], [3, 2, 1]);
  console.log('PASS hard mechanics: soft cap, reflect, boss window, idle rescue, gold immune to spells, rating');

  // ── 3. 저장 v3 · 해금 · 결과 ─────────────────────────────────────
  const saveCheck = await page.evaluate(() => {
    const A = WQ.App, E = WQ.E, r = {};
    const loaded = A.loadSave();
    r.migrated = loaded.version === 3 && loaded.chapters.forest.hardCleared === false && loaded.chapters.forest.bestStars === 2;
    // 깨지 않은 6학년에서 Shift 는 아무 일도 하지 않고, 깬 1학년에서는 어려운 학년이 바로 시작된다
    WQ.Hard.last = null; E.setScene(A.ChapterSelect('defense'));
    E.input.press('shield'); window.__frame(performance.now()); E.input.release('shield');
    r.lockedIgnored = WQ.Hard.last === null;
    E.setScene(A.ChapterSelect('forest'));
    E.input.press('shield'); window.__frame(performance.now() + 20); E.input.release('shield');
    r.clearedStartsHard = !!(WQ.Hard.last && WQ.Hard.last.on && WQ.Hard.last.stage === 'forest' && WQ.Hard.pending === false);
    // 1학년 결과(어려운 학년)는 hardCleared 만 바꾸고 일반 기록·해금은 그대로
    const before = JSON.stringify(A.save.chapters.stairs);
    E.setScene(A.Clear(A.chapters[0], { stars: 3, wisdom: 20, hits: 0, time: 50 }, true));
    const saved = JSON.parse(localStorage.getItem('wq_save'));
    r.hardSaved = saved.version === 3 && saved.chapters.forest.hardCleared === true && saved.chapters.forest.hardBestStars === 3 && saved.chapters.forest.bestStars === 2;
    r.othersUntouched = JSON.stringify(saved.chapters.stairs) === before;
    // 손상 JSON
    localStorage.setItem('wq_save', '{broken');
    try { const s = A.loadSave(); r.brokenSafe = s.version === 3 && s.chapters.forest.unlocked === true && s.chapters.forest.hardCleared === false; } catch (e) { r.brokenSafe = false; }
    localStorage.setItem('wq_save', JSON.stringify({ version: 2, chapters: { forest: { cleared: false, hardCleared: true, hardBestStars: 9 } } }));
    const odd = A.loadSave(); r.hardNeedsClear = odd.chapters.forest.hardCleared === false && odd.chapters.forest.hardBestStars === 0;
    return r;
  });
  console.log('save', JSON.stringify(saveCheck));
  for (const [k, v] of Object.entries(saveCheck)) assert.equal(v, true, k);
  console.log('PASS save v3 migration, hard clear isolation, corrupt data');

  assert.deepEqual(errors, []);
  console.log('PASS hogwarts hard-mode: zero page errors');
  await browser.close(); server.close();
})().catch(e => { console.error(e); process.exit(1); });
