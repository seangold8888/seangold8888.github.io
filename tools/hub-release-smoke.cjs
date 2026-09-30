'use strict';
// Check the exact release tree, or HUB_VERIFY_BASE after deployment.
// All progress belongs to a fresh browser context; no real family saves change.
const {chromium}=require('playwright');
const fs=require('node:fs'),path=require('node:path'),http=require('node:http'),assert=require('node:assert/strict');
const root=path.resolve(__dirname,'..');
const types={'.html':'text/html;charset=utf-8','.js':'text/javascript','.css':'text/css','.json':'application/json','.svg':'image/svg+xml','.png':'image/png','.webp':'image/webp','.jpg':'image/jpeg','.mp3':'audio/mpeg','.wav':'audio/wav','.ogg':'audio/ogg','.glb':'model/gltf-binary','.woff2':'font/woff2'};
const server=http.createServer((req,res)=>{
  const u=decodeURIComponent(new URL(req.url,'http://local').pathname),f=path.resolve(root,'.'+u+(u.endsWith('/')?'index.html':''));
  if(!f.startsWith(root+path.sep)){res.writeHead(403).end();return;}
  fs.readFile(f,(e,b)=>{res.writeHead(e?404:200,{'Content-Type':types[path.extname(f)]||'application/octet-stream','Cache-Control':'no-store'}).end(e?'missing':b);});
});
(async()=>{
  if(!process.env.HUB_VERIFY_BASE)await new Promise(r=>server.listen(0,'127.0.0.1',r));
  const base=(process.env.HUB_VERIFY_BASE||'http://127.0.0.1:'+server.address().port).replace(/\/$/,'');
  const browser=await chromium.launch({channel:'msedge',headless:true,args:['--use-angle=swiftshader','--enable-unsafe-swiftshader']});
  try{
    const context=await browser.newContext({viewport:{width:820,height:1180},hasTouch:true,serviceWorkers:'block'});
    await context.addInitScript(()=>{
      const d=new Date(),day=d.getFullYear()+'-'+(d.getMonth()+1)+'-'+d.getDate();
      localStorage.setItem('hub2_date',day);localStorage.setItem('hub2_solved','15');localStorage.setItem('hub2_credit','1');
      localStorage.setItem('hub2_parent_mode','0');localStorage.setItem('hub_play_pass',JSON.stringify({day,until:Date.now()+600000}));
    });
    const menu=await context.newPage();await menu.goto(base+'/game/?v=hub-release-194');
    await menu.waitForFunction(()=>document.querySelector('#hubTicketStat').textContent!=='준비 중');
    assert.equal(await menu.locator('.feature-stage,#nextAdventure').count(),0);
    const links=await menu.locator('a.card').evaluateAll(es=>es.map(e=>({name:e.querySelector('.name').textContent,url:e.href})));
    assert.equal(links.length,10);
    for(const link of links){
      const page=await context.newPage(),errors=[],missing=[];
      page.on('pageerror',e=>errors.push(e.message));
      page.on('console',m=>{if(m.type()==='error')errors.push(m.text());});
      page.on('response',r=>{if(r.status()>=400)missing.push(r.status()+' '+r.url());});
      await page.goto(link.url,{waitUntil:'load',timeout:60000});await page.waitForTimeout(1200);
      if(new URL(link.url).pathname==='/slime/'){
        await page.waitForFunction(()=>!!window.__slime,null,{timeout:90000});
        await page.locator('#play-menu').click();await page.locator('[data-toy=stars]').click();
        assert.equal(await page.evaluate(()=>__slime.toys.state().mode),'stars');
        await page.locator('#toy-stop').click();assert.equal(await page.evaluate(()=>__slime.toys.state().mode),'none');
      }
      const broken=await page.locator('img').evaluateAll(es=>es.filter(i=>i.getAttribute('src')?.trim()&&i.complete&&!i.naturalWidth).map(i=>i.src));
      assert.deepEqual(broken,[],link.name+': broken images');assert.deepEqual(errors,[],link.name+': runtime errors');assert.deepEqual(missing,[],link.name+': HTTP errors');
      console.log('PASS',link.name,'entry; no runtime/HTTP/image errors');await page.close();
    }
    await context.close();console.log('PASS release:',base,'10 games; banner removed; fresh isolated saves');
  }finally{await browser.close();if(server.listening){server.closeAllConnections();await new Promise(r=>server.close(r));}}
})().catch(e=>{console.error(e);process.exitCode=1;});
