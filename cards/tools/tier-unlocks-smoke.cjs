"use strict";
const {chromium}=require("playwright"),assert=require("node:assert/strict"),fs=require("node:fs"),path=require("node:path"),http=require("node:http"),os=require("node:os");
const root=path.resolve(__dirname,"../.."),output=fs.mkdtempSync(path.join(os.tmpdir(),"tier-unlocks-"));
const mime={".html":"text/html; charset=utf-8",".js":"application/javascript",".css":"text/css",".json":"application/json",".webp":"image/webp",".png":"image/png",".svg":"image/svg+xml"};
const server=http.createServer((req,res)=>{
 const p=decodeURIComponent(new URL(req.url,"http://local").pathname),file=path.resolve(root,"."+p+(p.endsWith("/")?"index.html":""));
 if(!file.startsWith(root+path.sep)){res.writeHead(403);return res.end();}
 fs.readFile(file,(e,d)=>{res.writeHead(e?404:200,{"Content-Type":mime[path.extname(file)]||"application/octet-stream"});res.end(e?"missing":d);});
});
(async()=>{
 await new Promise(r=>server.listen(0,"127.0.0.1",r));
 const browser=await chromium.launch({headless:true,channel:"msedge"}),base="http://127.0.0.1:"+server.address().port;
 try{
  for(const viewport of [{width:820,height:1180},{width:1180,height:820},{width:390,height:844}]){
   const context=await browser.newContext({viewport,reducedMotion:"reduce"}),page=await context.newPage(),errors=[];
   page.on('pageerror',e=>errors.push(String(e)));
   const ready=()=>page.waitForFunction(()=>document.querySelectorAll('.card-gallery-item').length===84);
   const open=async id=>{await page.locator('#collectionGrid [data-card-id="'+id+'"]').click();};
   const close=()=>page.locator('[data-detail-close]').first().click();
   await page.goto(base+'/cards/');await ready();
   assert.deepEqual(await page.evaluate(()=>JSON.parse(localStorage.card_collection_unlocks_v1).unlocked),[]);
   await open('jack');assert.equal(await page.locator('#detailSelectButton').isDisabled(),false);await close();
   await open('mermaid');assert.match(await page.locator('#cardDetailStatus').innerText(),/5일.*60문제/);assert.equal(await page.locator('#detailUnlockLink').getAttribute('href'),'../story/');await close();
   await page.evaluate(()=>localStorage.setItem('story_done_mermaid','1'));await page.reload();await ready();
   await open('mermaid');assert.equal(await page.locator('#detailSelectButton').isDisabled(),true);assert.equal(await page.locator('#detailUnlockLink').getAttribute('href'),'../math/');
   assert.match(await page.locator('#cardDetailStatus').innerText(),/완료/);
   assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1));
   await page.screenshot({path:path.join(output,viewport.width+'-mermaid-goals.png')});await close();
   await page.evaluate(()=>navigator.serviceWorker.register('/sw.js'));await page.waitForFunction(()=>navigator.serviceWorker.controller,null,{timeout:60000});
   await context.setOffline(true);
   for(const [days,problems,locked] of [[4,60,true],[5,59,true],[5,60,false]]){
    await page.evaluate(({days,problems})=>{
     const records={};for(let i=0;i<days;i++){const d=new Date();d.setDate(d.getDate()-i*2);records[d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0')+'-'+String(d.getDate()).padStart(2,'0')]=1;}
     localStorage.setItem('math10_state',JSON.stringify({garden:problems,cardStudyDays:records}));
    },{days,problems});
    await page.reload();await ready();await open('mermaid');assert.equal(await page.locator('#detailSelectButton').isDisabled(),locked);await close();
   }
   await open('kimhongdo');assert.equal(await page.locator('#detailSelectButton').isDisabled(),false);await close();
   await page.evaluate(()=>{localStorage.removeItem('math10_state');localStorage.removeItem('story_done_mermaid');});await page.reload();await ready();
   await open('mermaid');assert.equal(await page.locator('#detailSelectButton').isDisabled(),false);await close();
   await open('jaei');assert.equal(await page.locator('#detailSelectButton').isDisabled(),true);assert.match(await page.locator('#cardDetailStatus').innerText(),/30일.*400문제/);await close();
   assert.deepEqual(errors,[]);await context.close();console.log('PASS',viewport,'starter, source gate, AND boundaries, offline ownership, math-only tier and family unchanged');
  }
  const context=await browser.newContext(),page=await context.newPage();
  await page.goto(base+'/cards/cards.json');await page.evaluate(()=>localStorage.setItem('story_done_mermaid','1'));
  await page.goto(base+'/cards/');await page.waitForFunction(()=>document.querySelectorAll('.card-gallery-item').length===84);
  assert.doesNotMatch(await page.locator('#collectionGrid [data-card-id="mermaid"]').getAttribute('class'),/is-locked/);await context.close();
  console.log('PASS first-upgrade legacy ownership; SCREENSHOTS',output);
 }finally{await browser.close();server.closeAllConnections();await new Promise(r=>server.close(r));}
})().catch(e=>{console.error(e);process.exitCode=1;server.close();});
