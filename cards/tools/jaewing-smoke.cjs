"use strict";
// Isolated QA: bonus starting stars exist only in this script, never production.
const {chromium}=require('playwright'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),http=require('node:http'),os=require('node:os');
const root=path.resolve(__dirname,'../..'),output=fs.mkdtempSync(path.join(os.tmpdir(),'jaewing-'));
const mime={'.html':'text/html; charset=utf-8','.js':'application/javascript','.css':'text/css','.json':'application/json','.webp':'image/webp','.png':'image/png','.svg':'image/svg+xml'};
const server=http.createServer((req,res)=>{const url=new URL(req.url,'http://local'),p=decodeURIComponent(url.pathname),file=path.resolve(root,'.'+p+(p.endsWith('/')?'index.html':''));if(!file.startsWith(root+path.sep)){res.writeHead(403);return res.end();}fs.readFile(file,(e,d)=>{res.writeHead(e?404:200,{'Content-Type':mime[path.extname(file)]||'application/octet-stream'});res.end(e?'missing':d);});});
(async()=>{
 await new Promise(r=>server.listen(0,'127.0.0.1',r));const browser=await chromium.launch({channel:'msedge',headless:true}),base='http://127.0.0.1:'+server.address().port;
 try{
  for(const viewport of [{width:390,height:844},{width:820,height:1180},{width:1180,height:820}]){
   const context=await browser.newContext({viewport}),page=await context.newPage(),errors=[];
   page.on('pageerror',e=>errors.push(String(e)));
   await context.addInitScript(()=>{
    window.__qaSounds=[];window.__qaActions=[];let engine,audio;
    Object.defineProperty(window,'CardEngine',{configurable:true,get:()=>engine,set(value){engine={...value,createGame(...args){const s=value.createGame(...args);s.sides.player.stars=5;window.__qaGame=s;return s;},performAction(s,a,...args){const out=value.performAction(s,a,...args);window.__qaActions.push({actor:s.turn,...a});window.__qaGame=out;return out;}};}});
    Object.defineProperty(window,'CardAudio',{configurable:true,get:()=>audio,set(value){audio={...value,techniqueImpact(p){window.__qaSounds.push(p);return value.techniqueImpact(p);}};}});
   });
   const ready=()=>page.waitForFunction(()=>document.querySelectorAll('.card-gallery-item').length===85);
   await page.goto(base+'/cards/');await ready();await page.locator('#collectionGrid [data-card-id="jaewing"]').click();
   assert.match(await page.locator('#cardDetailStatus').innerText(),/7일.*70문제/);assert.equal(await page.locator('#detailSelectButton').isDisabled(),true);
   assert.equal(await page.locator('#detailUnlockLink').getAttribute('href'),'../math/');
   assert.match(await page.locator('#cardDetailCard').innerText(),/날개 악당/);
   await page.locator('[data-detail-close]').first().click();
   await page.evaluate(()=>{const days={};for(let i=0;i<7;i++){const d=new Date();d.setDate(d.getDate()-i*2);days[d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0')+'-'+String(d.getDate()).padStart(2,'0')]=1;}localStorage.setItem('math10_state',JSON.stringify({cardStudyDays:days,garden:70}));});
   await page.reload();await ready();await page.locator('#collectionGrid [data-card-id="jaewing"]').click();assert.equal(await page.locator('#detailSelectButton').isDisabled(),false);
   await page.waitForFunction(()=>[...document.querySelectorAll('#cardDetailCard img')].every(i=>i.complete&&i.naturalWidth));
   await page.locator('#cardDetailCard img').evaluate(img=>img.decode());
   await page.screenshot({animations:'disabled',path:path.join(output,viewport.width+'-detail.png')});
   await page.locator('#detailSelectButton').click();await page.locator('#storyGateButton').click();assert.equal(await page.locator('#storyQuizTitle').innerText(),'재윙 카드 관문');
   const answer=await page.evaluate(()=>{const q=CardStoryGates.all.find(q=>q.cardId==='jaewing'&&q.prompt===document.getElementById('storyQuizQuestion').textContent);return q.choices.find(c=>c.id===q.correctChoiceId).text;});
   await page.locator('#storyQuizChoices button').filter({hasText:answer}).click();assert.equal(await page.evaluate(()=>__qaGame.sides.player.flags.ultimateUnlocked),true);
   for(const [i,name] of ['메롱 날갯짓','숙제 날려버리기','거꾸로 회오리'].entries()){
    await page.goto(base+'/cards/?card=jaewing&battle=1');
    await page.locator('#playerCardSlot img').evaluate(img=>img.decode());
    if(i===0)await page.screenshot({animations:'disabled',path:path.join(output,viewport.width+'-battle.png')});
    await page.locator('#actionList button').filter({hasText:name}).click();
    if(await page.locator('#coinDialog').isVisible())await page.locator('#coinButton').click();
    await page.waitForFunction(name=>__qaSounds.some(p=>p.attack===name),name);
    assert.ok(await page.evaluate(i=>__qaActions.some(a=>a.actor==='player'&&a.type==='attack'&&a.attackIndex===i),i));
    if(i===2)await page.screenshot({path:path.join(output,viewport.width+'-twirl.png')});
    assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1));
   }
   await page.goto(base+'/cards/');await ready();await page.evaluate(()=>navigator.serviceWorker.register('/sw.js'));await page.waitForFunction(()=>navigator.serviceWorker.controller,null,{timeout:60000});await context.setOffline(true);
   await page.reload();await ready();await page.locator('#collectionGrid [data-card-id="jaewing"]').click();assert.equal(await page.locator('#detailSelectButton').isDisabled(),false);
   await page.waitForFunction(()=>[...document.querySelectorAll('#cardDetailCard img')].every(i=>i.complete&&i.naturalWidth));
   assert.deepEqual(errors,[]);await context.close();console.log('PASS',viewport,'locked/earned, portrait, quiz, all three real attacks/audio calls, offline');
  }
  console.log('SCREENSHOTS',output);
 }finally{await browser.close();server.closeAllConnections();await new Promise(r=>server.close(r));}
})().catch(e=>{console.error(e);process.exitCode=1;server.close();});
