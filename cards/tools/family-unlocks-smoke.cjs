"use strict";
const {chromium}=require("playwright"),assert=require("node:assert/strict"),fs=require("node:fs"),path=require("node:path"),http=require("node:http"),os=require("node:os");
const root=path.resolve(__dirname,"../.."),data=require("../cards.json"),SW=require("../../sw.js");
const output=fs.mkdtempSync(path.join(os.tmpdir(),"family-unlocks-"));
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
  const expedition=await browser.newContext({viewport:{width:820,height:1180},serviceWorkers:"block",reducedMotion:"reduce"});
  const battle=await expedition.newPage();
  await battle.goto(base+"/cards/");await battle.waitForFunction(()=>document.querySelectorAll(".card-gallery-item").length===84);
  assert.match(await battle.locator('#collectionGrid [data-card-id="jaei"]').getAttribute("class"),/is-locked/);
  await battle.locator("#campaignButton").click();await battle.locator(".expedition-map-footer .primary-button").click();
  for(let i=0;i<20 && await battle.locator(".expedition-scene").isVisible();i++)await battle.locator(".expedition-scene .primary-button").click();
  await battle.locator('.expedition-deploy [data-card-id="jaei"]').click();
  assert.equal(await battle.locator("#storyGateButton").innerText(),"문제 열기");
  await battle.locator("#storyGateButton").click();assert.equal(await battle.locator("#storyQuizTitle").innerText(),"재이 카드 관문");
  assert.deepEqual(await battle.evaluate(()=>JSON.parse(localStorage.card_family_unlocks_v1).unlocked),[]);
  await expedition.close();
  console.log("PASS locked family can deploy and use the story quiz in expedition without granting collection ownership");
  for(const viewport of [{width:820,height:1180},{width:1180,height:820},{width:390,height:844}]){
   const context=await browser.newContext({viewport,reducedMotion:"reduce"}),page=await context.newPage(),errors=[];
   page.on("pageerror",e=>errors.push(String(e)));
   await page.goto(base+"/cards/");await page.waitForFunction(()=>document.querySelectorAll(".card-gallery-item").length===84);
   assert.deepEqual(await page.evaluate(()=>JSON.parse(localStorage.card_family_unlocks_v1).unlocked),[]);
   await page.locator('#collectionGrid [data-card-id="jaei"]').click();
   assert.match(await page.locator("#cardDetailStatus").innerText(),/30일.*400문제/);
   assert.ok(await page.locator("#detailSelectButton").isDisabled());
   await page.screenshot({path:path.join(output,viewport.width+"-jaei-goal.png")});
   await page.locator("[data-detail-close]").first().click();
   await page.evaluate(()=>navigator.serviceWorker.register("/sw.js"));
   await page.waitForFunction(()=>navigator.serviceWorker.controller,null,{timeout:60000});
   await page.waitForFunction(async name=>(await caches.keys()).includes(name),SW.STATIC_CACHE);
   await context.setOffline(true);
   for(const [id,goal] of Object.entries(data.familyUnlockGoals)){
    for(const [days,problems,locked] of [[goal.studyDays-1,goal.problems,true],[goal.studyDays,goal.problems-1,true],[goal.studyDays,goal.problems,false]]){
     await page.evaluate(({days,problems})=>{
      const stamps={};for(let i=0;i<days;i++){const d=new Date();d.setDate(d.getDate()-i*2);const date=[d.getFullYear(),String(d.getMonth()+1).padStart(2,"0"),String(d.getDate()).padStart(2,"0")].join("-");stamps[date]=1;}
      localStorage.setItem("math10_state",JSON.stringify({stamps,garden:problems}));
     },{days,problems});
     await page.reload();await page.waitForFunction(()=>document.querySelectorAll(".card-gallery-item").length===84);
     await page.locator('#collectionGrid [data-card-id="'+id+'"]').click();
     assert.equal(await page.locator("#detailSelectButton").isDisabled(),locked,id);
     if(locked)assert.match(await page.locator("#detailUnlockLink").getAttribute("href"),/math/);
     assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1));
     await page.locator("[data-detail-close]").first().click();
    }
   }
   await page.evaluate(()=>localStorage.setItem("math10_state","{}"));await page.reload();
   await page.waitForFunction(()=>document.querySelectorAll(".card-gallery-item").length===84);
   for(const id of Object.keys(data.familyUnlockGoals))assert.doesNotMatch(await page.locator('#collectionGrid [data-card-id="'+id+'"]').getAttribute("class"),/is-locked/);
   assert.deepEqual(errors,[]);
   await context.close();console.log("PASS",viewport,"goals, AND thresholds, skipped days, permanent ownership and offline");
  }
  console.log("SCREENSHOTS",output);
 }finally{await browser.close();server.closeAllConnections();await new Promise(r=>server.close(r));}
})().catch(e=>{console.error(e);process.exitCode=1;server.close();});
