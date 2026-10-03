const { chromium } = require('playwright');
const assert = require('node:assert/strict');
const fs = require('node:fs'), path = require('node:path'), os = require('node:os'), http = require('node:http');
const cp = require('node:child_process');
const root = path.resolve(__dirname, '../..');
const useIndex = process.env.KART_LOBBY_TEST_INDEX === '1';
const liveBase = process.env.KART_LOBBY_TEST_URL;
const indexed = new Map();
const output = fs.mkdtempSync(path.join(os.tmpdir(), 'kart-lobby-'));
const server = http.createServer((q,r) => {
  const u = decodeURIComponent(new URL(q.url,'http://local').pathname);
  const f = path.resolve(root,'.'+u+(u.endsWith('/')?'index.html':''));
  if (!f.startsWith(root+path.sep) || !fs.existsSync(f)) { r.writeHead(404);return r.end(); }
  r.setHeader('Content-Type', {'.js':'text/javascript','.css':'text/css','.html':'text/html','.woff2':'font/woff2','.png':'image/png','.webp':'image/webp'}[path.extname(f)]||'application/octet-stream');
  if (useIndex) {
    const relative = path.relative(root, f).replaceAll(path.sep, '/');
    try {
      if (!indexed.has(relative)) indexed.set(relative, cp.execFileSync('git', ['show', ':' + relative], {cwd:root, stdio:['ignore','pipe','ignore'],maxBuffer:64*1024*1024}));
      r.end(indexed.get(relative));
    } catch { r.statusCode=404; r.end('Not included in staged release'); }
  } else r.end(fs.readFileSync(f));
});
(async()=>{
  if (!liveBase) await new Promise(r=>server.listen(0,'127.0.0.1',r));
  const browser = await chromium.launch({channel:'msedge',headless:true,args:['--use-angle=swiftshader','--enable-unsafe-swiftshader']});
  try {
    const page = await browser.newPage({viewport:{width:1180,height:820},serviceWorkers:'block'});
    const errors=[];page.on('pageerror',e=>errors.push(e.message));
    await page.addInitScript(()=>{
      const d=new Date();localStorage.setItem('hub_play_pass',JSON.stringify({free:true,day:d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0')+'-'+String(d.getDate()).padStart(2,'0')}));
    });
    await page.goto((liveBase || 'http://127.0.0.1:'+server.address().port)+'/kart3d/?verify=lobby-1');
    await page.waitForFunction(()=>!!window.__game);
    await page.evaluate(()=>document.fonts.load('16px "Kart Pretendard"'));
    await page.evaluate(()=>document.fonts.ready);
    const fonts = await page.evaluate(()=>[...document.fonts].map(f=>({family:f.family,status:f.status})));
    assert.ok(fonts.some(f=>f.family.replace(/["']/g,'')==='Kart Pretendard' && f.status==='loaded'), 'local Korean font really loads: '+JSON.stringify(fonts));
    await page.locator('#menu-hero').evaluate(img=>img.decode());
    async function fit() {
      return page.evaluate(()=>{
        const m=document.querySelector('#menu'), b=document.querySelector('#menu-next').getBoundingClientRect(), h=document.querySelector('.lobby-header').getBoundingClientRect();
        return {width:m.scrollWidth<=m.clientWidth+1,height:m.scrollHeight<=m.clientHeight+1,button:b.bottom<=innerHeight&&b.left>=0,header:h.top>=0};
      });
    }
    for (const size of [{width:1180,height:820},{width:1024,height:768},{width:844,height:390}]) {
      await page.setViewportSize(size);
      assert.deepEqual(await fit(),{width:true,height:true,button:true,header:true});
      assert.ok(await page.locator('#menu-list .card').evaluateAll(cards => cards.every(card => {
        const box = card.getBoundingClientRect();
        return [...card.children].every(child => { const r=child.getBoundingClientRect();return r.top>=box.top && r.bottom<=box.bottom; });
      })), 'card contents stay inside each tile instead of overlapping rows');
      if(size.width===1024) assert.ok(await page.locator('#menu-list').evaluate(list=>[...list.children].every(e=>e.getBoundingClientRect().bottom<=list.getBoundingClientRect().bottom)), 'iPad shows all eleven friends');
      await page.screenshot({path:path.join(output,'friends-'+size.width+'.png')});
    }
    console.log('PASS desktop / iPad landscape / short landscape: header and start button fit');
    await page.setViewportSize({width:1024,height:768});
    await page.getByRole('button',{name:'재이 선택',exact:true}).click();
    assert.equal(await page.locator('#hero-name').textContent(),'재이!');
    assert.equal(await page.evaluate(()=>__game.state.menuStep),0);
    assert.equal(await page.locator('[aria-pressed=true]').count(),1);
    await page.locator('#menu-hero').evaluate(img=>img.decode());
    await page.screenshot({path:path.join(output,'jaei.png')});
    await page.locator('#menu-next').click();
    assert.equal(await page.evaluate(()=>__game.state.menuStep),1);
    await page.screenshot({path:path.join(output,'modes.png')});
    await page.locator('#menu-next').click();
    assert.equal(await page.locator('#menu-list .card').count(),2);
    assert.equal(await page.locator('#menu-list img').count(),2);
    await page.screenshot({path:path.join(output,'cups.png')});
    await page.locator('#menu-next').click();
    assert.equal(await page.evaluate(()=>__game.state.scene),'race');
    assert.equal(await page.evaluate(()=>__game.state.player.spec.id),'jaei');
    assert.ok(await page.evaluate(()=>!!__game.state.gp));
    console.log('PASS actual clicks: select child, preview, grand prix, cup, race');
    await page.keyboard.press('Escape');
    await page.locator('#menu-next').click();
    await page.getByRole('button',{name:'스피드 매치 선택',exact:true}).click();
    await page.locator('#menu-next').click();
    assert.equal(await page.locator('#menu-list .card').count(),6);
    await page.getByRole('button',{name:'노을 해변 선택',exact:true}).click();
    assert.ok(await page.locator('#menu-list .card').evaluateAll(cards=>cards.every(card=>card.lastElementChild.getBoundingClientRect().bottom<=card.getBoundingClientRect().bottom)), 'course captions stay inside their tiles');
    await page.screenshot({path:path.join(output,'courses.png')});
    await page.locator('#menu-next').click();
    assert.equal(await page.evaluate(()=>__game.state.track.def.id),'beach');
    console.log('PASS course postcards and individual race selection');
    await page.keyboard.press('Escape');
    await page.locator('.lobby-settings summary').focus();
    await page.keyboard.press('Enter');
    assert.ok(await page.locator('.lobby-settings').evaluate(e=>e.open));
    assert.equal(await page.evaluate(()=>__game.state.menuStep),0);
    await page.keyboard.press('Enter');
    await page.locator('#menu-next').focus();
    await page.keyboard.press('Enter');
    assert.equal(await page.evaluate(()=>__game.state.menuStep),1);
    await page.locator('#menu-back').focus();await page.keyboard.press('Enter');
    assert.equal(await page.evaluate(()=>__game.state.menuStep),0);
    console.log('PASS native settings / back / keyboard next do not skip steps');
    await page.getByRole('button',{name:'태오 선택',exact:true}).focus();
    await page.keyboard.press('Enter');
    assert.equal(await page.locator('#hero-name').textContent(),'태오!');
    assert.equal(await page.evaluate(()=>__game.state.menuStep),0);
    console.log('PASS keyboard character selection previews without skipping a step');
    await page.emulateMedia({reducedMotion:'reduce'});
    assert.equal(await page.locator('#menu-hero').evaluate(e=>getComputedStyle(e).animationName),'none');
    assert.deepEqual(errors,[]);
    console.log('PASS reduced motion and no runtime errors');console.log('Screenshots: '+output);
  } finally { await browser.close();server.close(); }
})().catch(e=>{console.error(e);process.exitCode=1;server.close();});
