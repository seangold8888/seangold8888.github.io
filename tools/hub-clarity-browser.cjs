'use strict';
// The rendered study action must be visible before scrolling, not just its title.
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),os=require('node:os'),http=require('node:http');
const {chromium}=require('playwright');
const root=path.resolve(__dirname,'..'),output=fs.mkdtempSync(path.join(os.tmpdir(),'hub-clarity-ui-'));
const types={'.html':'text/html; charset=utf-8','.js':'text/javascript; charset=utf-8','.css':'text/css; charset=utf-8','.json':'application/json','.svg':'image/svg+xml','.png':'image/png','.jpg':'image/jpeg','.webp':'image/webp','.mp3':'audio/mpeg'};
const server=http.createServer((req,res)=>{
  const u=decodeURIComponent(new URL(req.url,'http://local').pathname),f=path.resolve(root,'.'+u+(u.endsWith('/')?'index.html':''));
  if(!f.startsWith(root+path.sep)){res.writeHead(403).end();return;}
  fs.readFile(f,(error,body)=>{if(error){res.writeHead(404).end();return;}res.writeHead(200,{'Content-Type':types[path.extname(f)]||'application/octet-stream','Cache-Control':'no-store'});res.end(body);});
});
(async()=>{
  await new Promise(r=>server.listen(0,'127.0.0.1',r));const base='http://127.0.0.1:'+server.address().port;
  const browser=await chromium.launch({channel:'msedge',headless:true});
  try{
    for(const scene of [
      {name:'desktop-reading',width:1180,height:820,reading:true},
      {name:'ipad-reading',width:820,height:1180,reading:true},
      {name:'phone-reading',width:390,height:844,reading:true},
      {name:'small-phone-reading',width:320,height:720,reading:true,reduced:true},
      {name:'phone-math',width:390,height:844,quiet:true},
      {name:'ipad-ticket',width:820,height:1180,solved:15,credit:1},
      {name:'phone-playing',width:390,height:844,solved:15,active:true},
      {name:'phone-complete',width:390,height:844,solved:100},
      {name:'phone-parent',width:390,height:844,solved:7,credit:1,parent:true},
    ]){
      const context=await browser.newContext({viewport:{width:scene.width,height:scene.height},hasTouch:scene.width<1000,serviceWorkers:'block',reducedMotion:scene.reduced?'reduce':'no-preference'});
      await context.addInitScript(s=>{
        if(sessionStorage.getItem('clarity-seeded'))return;sessionStorage.setItem('clarity-seeded','1');
        const d=new Date(),day=d.getFullYear()+'-'+(d.getMonth()+1)+'-'+d.getDate();
        localStorage.setItem('hub2_date',day);localStorage.setItem('hub2_solved',String(s.solved||0));localStorage.setItem('hub2_credit',String(s.credit||0));localStorage.setItem('hub2_parent_mode',s.parent?'1':'0');
        localStorage.setItem('hub2_plays',JSON.stringify({cards:{n:4,d:Math.floor(Date.now()/86400000)}}));localStorage.setItem('story_done_cinderella','1');
        if(s.quiet)localStorage.setItem('hub_quiet_day',day);
        if(s.active)localStorage.setItem('hub_play_pass',JSON.stringify({day,until:Date.now()+120000}));
      },scene);
      const page=await context.newPage(),errors=[];page.on('pageerror',e=>errors.push(e.message));
      await page.goto(base+'/game/');await page.waitForFunction(()=>document.querySelector('#question').textContent&&document.querySelector('#hubTicketStat').textContent!=='준비 중');
      assert.equal(await page.locator('a.card').count(),10);assert.equal(await page.locator('a.shop').count(),2);
      assert.equal(await page.locator('.games a[href="kart/"]').count(),0);
      assert.equal(await page.locator('.games a[href="kart3d/"]').count(),1);
      assert.equal(await page.locator('a.card.battle .name').innerText(),'재이태오 카드 배틀');
      for(const [cls,file] of [['castle','cover-hogwarts-game-v1.webp'],['stage','cover-kedehun-team-v1.webp'],['gem','cover-ribbon-room-v1.webp'],['kart3d','cover-sanrio-kart-team-v1.webp'],['battle','cover-jaei-taeo-card-battle-v1.webp']]){
        const background=await page.locator('a.card.'+cls).evaluate(el=>getComputedStyle(el,'::before').backgroundImage);
        assert(background.includes(file),cls+': representative cover not rendered');
      }
      assert.equal(await page.locator('.games > a').first().getAttribute('href'),'cards/','favorite order preserved');
      assert.equal(await page.locator('#quietMode').isVisible(),false);assert.equal(await page.locator('#hubDailyStat').isVisible(),false);
      const canPlay=!!(scene.credit||scene.active||scene.parent||scene.solved>=100);
      assert.equal(await page.locator('#nextAdventure,.feature-stage').count(),0);
      assert(await page.evaluate(()=>{
        const study=document.querySelector('#study'),math=document.querySelector('#mathPlaygroundLaunch'),worlds=document.querySelector('#adventureWorlds');
        const a=study.getBoundingClientRect(),m=math.getBoundingClientRect(),b=worlds.getBoundingClientRect(),grid=study.parentElement.getBoundingClientRect();
        return study.nextElementSibling===math&&study.parentElement.nextElementSibling===worlds&&Math.abs(a.width-grid.width)<2&&m.top>=a.bottom&&b.top>=m.bottom&&b.top-m.bottom<65;
      }),'study first, unlocked math shortcut second; games follow without a banner');
      assert.equal(await page.evaluate(()=>document.body.classList.contains('locked')),!canPlay);
      assert.equal(await page.locator('.card[aria-disabled="true"]').count(),canPlay?0:10);
      assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false,'horizontal overflow');
      assert(await page.evaluate(()=>[...document.querySelectorAll('.brand-orb,.brand-copy h1,.hud-chip.ticket,#lobbySettings > summary')].every(el=>{const b=el.getBoundingClientRect();return b.left>=0&&b.right<=innerWidth+1;})),'header controls clipped');
      const before=await page.evaluate(()=>({solved:localStorage.getItem('hub2_solved'),credit:localStorage.getItem('hub2_credit'),story:localStorage.getItem('story_done_cinderella'),plays:localStorage.getItem('hub2_plays')}));
      if(scene.reading||scene.quiet){
        const selector=scene.reading?'#choices .reading-actions button:first-child':'#choices button:first-child';
        const action=await page.locator(selector).boundingBox();assert(action&&action.y>=0&&action.y+action.height<scene.height,scene.name+': study action below first screen');assert(action.height>=44);
        if(scene.reading){assert.equal(await page.locator('.reading-help').count(),1);assert.equal(await page.locator('.reading-help').getAttribute('open'),null);assert.equal(await page.locator('.reading-privacy').isVisible(),false);}
      }
      await page.screenshot({path:path.join(output,scene.name+'.png')});
      if(scene.name==='desktop-reading'||scene.name==='phone-reading'){
        await page.locator('#adventureWorlds').screenshot({path:path.join(output,scene.name+'-games.png')});await page.evaluate(()=>scrollTo(0,0));
        await page.locator('.reading-help > summary').click();assert(await page.locator('.reading-privacy').isVisible());assert.match(await page.locator('.reading-privacy').innerText(),/음성은 브라우저의 인식 서비스로 전송될 수/);await page.locator('.reading-help > summary').click();
        await page.locator('#lobbySettings > summary').focus();await page.keyboard.press('Enter');assert(await page.locator('#bookOpen').isVisible());
        const panel=await page.locator('.settings-panel').boundingBox();assert(panel.x>=0&&panel.x+panel.width<=scene.width+1);
        await page.screenshot({path:path.join(output,scene.name+'-settings.png')});
        await page.locator('#bookOpen').click();assert(await page.evaluate(()=>document.querySelector('main').inert));
        await page.keyboard.press('Escape');assert.equal(await page.evaluate(()=>document.activeElement.id),'bookOpen');assert.equal(await page.evaluate(()=>document.querySelector('main').inert),false);
        await page.keyboard.press('Escape');assert.equal(await page.locator('#lobbySettings').getAttribute('open'),null);
        await page.locator('#lobbySettings > summary').click();await page.locator('#quietMode').click();assert.equal(await page.locator('.reading-sentence').count(),0);
        await page.locator('#hubMusic').click();assert.equal(await page.locator('#hubMusic').getAttribute('aria-pressed'),'true');assert.match(await page.locator('#hubMusic').innerText(),/음악/);
        await page.locator('.brand-copy h1').click();assert.equal(await page.locator('#lobbySettings').getAttribute('open'),null);
      }
      if(!canPlay){
        // aria-disabled is intentional; a real pointer still gets the friendly explanation.
        const locked=page.locator('a.card[href="cards/"]');await locked.scrollIntoViewIfNeeded();
        const box=await locked.boundingBox();await page.mouse.click(box.x+box.width/2,box.y+box.height/2);
        assert(page.url().includes('/game/'));assert(await page.locator('#lockNotice').isVisible());
        await page.locator('#lockNoticeClose').click();
      }
      const after=await page.evaluate(()=>({solved:localStorage.getItem('hub2_solved'),credit:localStorage.getItem('hub2_credit'),story:localStorage.getItem('story_done_cinderella'),plays:localStorage.getItem('hub2_plays')}));assert.deepEqual(after,before,'layout/settings/locked taps changed progress');
      assert.deepEqual(errors,[]);await context.close();console.log('PASS',scene.name,'first-screen study; native settings; correct access state; preserved records; no overflow/errors');
    }
    console.log('SCREENSHOTS',output);
  }finally{await browser.close();server.closeAllConnections();await new Promise(r=>server.close(r));}
})().catch(e=>{console.error(e);process.exitCode=1;});
