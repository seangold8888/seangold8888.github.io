// Actual study choices and ticket entry; closure probe exists only in this server response.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const os = require('node:os');
const http = require('node:http');
const { chromium } = require('playwright');
const root = path.resolve(__dirname, '..');
const output = fs.mkdtempSync(path.join(os.tmpdir(), 'hub-study-15-'));
const mime = {'.html':'text/html','.js':'text/javascript','.css':'text/css','.json':'application/json','.jpg':'image/jpeg','.png':'image/png','.webp':'image/webp','.svg':'image/svg+xml','.mp3':'audio/mpeg','.wav':'audio/wav','.woff2':'font/woff2'};
const server = http.createServer((req, res) => {
  const url = new URL(req.url, 'http://local');
  const file = path.resolve(root, '.' + decodeURIComponent(url.pathname) + (url.pathname.endsWith('/') ? 'index.html' : ''));
  if (!file.startsWith(root + path.sep)) { res.writeHead(403).end(); return; }
  fs.readFile(file, (error, bytes) => {
    if(error) {res.writeHead(404).end();return;}
    if(file === path.join(root, 'game/index.html')) {
      const marker = '  applyState();\n  annotatePlays();';
      let source = bytes.toString().replace(/\r/g, ''); assert.ok(source.includes(marker));
      source = source.replace(marker, `  window.__studyProbe = () => ({solved:state.solved,credit:state.credit,correct:setCorrect,answer:current && String(current.answer)+current.unit,answered:!!(current && current.answered)});\n${marker}`);
      bytes = Buffer.from(source);
    }
    res.writeHead(200, {'Content-Type':mime[path.extname(file)] || 'application/octet-stream','Cache-Control':'no-store'});res.end(bytes);
  });
});
(async () => {
  await new Promise(resolve => server.listen(0,'127.0.0.1',resolve));
  const base = `http://127.0.0.1:${server.address().port}`;
  const browser = await chromium.launch({headless:true});
  try {
    for(const [name, width, height, initial] of [['desktop',1180,820,0],['ipad',820,1180,14],['phone',390,844,14]]) {
      const context = await browser.newContext({viewport:{width,height},serviceWorkers:'block'});
      await context.addInitScript(solved => {
        if(sessionStorage.getItem('studySeed'))return;
        sessionStorage.setItem('studySeed','1');
        const d=new Date(),day=d.getFullYear()+'-'+(d.getMonth()+1)+'-'+d.getDate();
        localStorage.setItem('hub2_date',day);localStorage.setItem('hub_quiet_day',day);
        localStorage.setItem('hub2_solved',String(solved));localStorage.setItem('hub2_credit','0');
        localStorage.setItem('hub2_parent_mode','0');localStorage.setItem('hub_play_timer_force','1');
      },initial);
      const page=await context.newPage(),errors=[];page.on('pageerror',e=>errors.push(e.message));
      await page.goto(base+'/game/');
      await page.waitForFunction(()=>window.__studyProbe && document.querySelector('#choices button'));
      const layout=await page.evaluate(()=>{
        const bounds=id=>document.getElementById(id).getBoundingClientRect();
        return {study:bounds('study').top,party:bounds('partyAdventure').top,worlds:bounds('adventureWorlds').top,
          overflow:document.documentElement.scrollWidth > innerWidth+1, title:document.querySelector('#studyTitle').getBoundingClientRect().bottom};
      });
      assert.ok(layout.study<layout.party && layout.study<layout.worlds, name+': study first');
      assert.ok(layout.title<height, name+': study title visible without scrolling');assert.equal(layout.overflow,false);
      await page.screenshot({path:path.join(output,name+'.png')});
      for(let solved=initial;solved<15;solved++) {
        await page.waitForFunction(()=>!__studyProbe().answered && document.querySelector('#choices button'));
        const answer=await page.evaluate(()=>__studyProbe().answer);
        await page.locator('#choices button').filter({hasText:new RegExp('^'+answer.replace(/[.*+?^${}()|[\]\\]/g,'\\$&')+'$')}).click();
        await page.waitForFunction(expected=>__studyProbe().solved===expected,solved+1);
        const progress=await page.evaluate(()=>__studyProbe());
        assert.equal(progress.credit,solved+1===15?1:0, name+': exact 15-answer gate');
      }
      await page.waitForFunction(()=>document.querySelector('#studyEyebrow').textContent==='게임 티켓');
      assert.match(await page.locator('#question').innerText(),/15문제 성공/);
      await page.route('**/cards/',r=>r.fulfill({contentType:'text/html',body:'Game entry fixture'}));
      await page.locator('a.card[href="cards/"]').click();await page.waitForURL('**/cards/');
      const trip=await page.evaluate(()=>({solved:localStorage.getItem('hub2_solved'),credit:localStorage.getItem('hub2_credit'),pass:JSON.parse(localStorage.getItem('hub_play_pass'))}));
      assert.equal(trip.solved,'15');assert.equal(trip.credit,'0');assert.ok(trip.pass.until>Date.now());
      await page.goto(base+'/game/');await page.waitForFunction(()=>window.__studyProbe && document.querySelector('#choices button'));
      assert.equal(await page.evaluate(()=>__studyProbe().solved),15);assert.equal(await page.evaluate(()=>__studyProbe().correct),0);
      assert.deepEqual(errors,[]);await context.close();
      console.log('PASS '+name+': study first, no overflow, 15-answer ticket, game entry and preserved return');
    }
    console.log('Screenshots: '+output);
  } finally {
    await browser.close();server.closeAllConnections();await new Promise(resolve=>server.close(resolve));
  }
})().catch(error=>{console.error(error);process.exitCode=1;});
