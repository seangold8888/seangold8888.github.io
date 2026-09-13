"use strict";
const {chromium}=require("playwright"),assert=require("node:assert/strict"),fs=require("node:fs"),path=require("node:path"),http=require("node:http"),os=require("node:os");
const SW=require("../../sw.js"),ids=["sejong","jangyeongsil","heojun","shinsaimdang","jeongyakyong","kimhongdo","yugwansun","kimgu"],root=path.resolve(__dirname,"../..");
const output=fs.mkdtempSync(path.join(os.tmpdir(),"history-eight-"));
const mime={".html":"text/html; charset=utf-8",".js":"application/javascript",".css":"text/css",".json":"application/json",".png":"image/png",".webp":"image/webp",".svg":"image/svg+xml"};
const server=http.createServer((req,res)=>{
 const p=decodeURIComponent(new URL(req.url,"http://local").pathname),file=path.resolve(root,"."+p+(p.endsWith("/")?"index.html":""));
 if(!file.startsWith(root+path.sep)){res.writeHead(403);return res.end();}
 fs.readFile(file,(error,data)=>{res.writeHead(error?404:200,{"Content-Type":mime[path.extname(file)]||"application/octet-stream"});res.end(error?"not found":data);});
});
(async()=>{
 await new Promise(r=>server.listen(0,"127.0.0.1",r));
 const browser=await chromium.launch({headless:true,channel:"msedge"});
 const context=await browser.newContext({viewport:{width:820,height:1180},reducedMotion:"reduce"});
 const page=await context.newPage(),errors=[];page.on("pageerror",e=>errors.push(String(e)));
 const base="http://127.0.0.1:"+server.address().port;
 try{
  await page.goto(base+"/cards/");
  await page.waitForFunction(()=>document.querySelectorAll(".card-gallery-item").length===85);
  await page.evaluate(()=>navigator.serviceWorker.register("/sw.js"));
  await page.waitForFunction(()=>navigator.serviceWorker.controller,null,{timeout:60000});
  await page.waitForFunction(async ({name,ids})=>{const c=await caches.open(name);return (await Promise.all(ids.map(id=>c.match("/cards/art/"+id+".webp")))).every(Boolean);},{name:SW.STATIC_CACHE,ids});
  await context.setOffline(true);await page.reload();
  await page.waitForFunction(()=>document.querySelectorAll(".card-gallery-item").length===85);
  for(const viewport of [{width:820,height:1180},{width:1180,height:820},{width:390,height:844}]){
   await page.setViewportSize(viewport);
   for(const id of ids){
    const card=page.locator('#collectionGrid [data-card-id="'+id+'"]');await card.click();
    assert.equal(await page.locator("#cardDetailCard .card-history").count(),1);
    assert.equal(await page.locator("#cardDetailCard .attack-row").count(),2);
    await page.waitForFunction(()=>{const img=document.querySelector("#cardDetailCard .card-art img");return img&&img.complete&&img.naturalWidth===1024;});
    assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1));
    if(id==="sejong")assert.ok(await page.locator("#detailSelectButton").isEnabled());
    else {assert.ok(await page.locator("#detailSelectButton").isDisabled());assert.match(await page.locator("#detailUnlockLink").getAttribute("href"),/math/);}
    if(id==="sejong"||id==="yugwansun"){
     await page.locator("#cardDetailCard .card-history").scrollIntoViewIfNeeded();
     await page.screenshot({path:path.join(output,viewport.width+"-"+id+"-story.png")});
    }
    await page.locator("[data-detail-close]").first().click();
   }
   console.log("PASS offline biographies, art and correct unlock links",viewport);
  }
  await page.setViewportSize({width:1180,height:820});
  await page.evaluate(ids=>{const grid=document.getElementById("collectionGrid");grid.prepend(...ids.map(id=>grid.querySelector('[data-card-id="'+id+'"]').parentElement));window.scrollTo(0,0);},ids);
  await page.waitForFunction(()=>[...document.querySelectorAll("#collectionGrid img")].filter(i=>i.getBoundingClientRect().top<innerHeight).every(i=>i.complete&&i.naturalWidth));
  assert.ok(await page.locator("#collectionGrid .collection-tier").evaluateAll(ns=>ns.every(n=>/^[SABCD]$/.test(n.textContent))));
  await page.screenshot({path:path.join(output,"eight-gallery.png")});
  await page.locator('#collectionGrid [data-card-id="sejong"]').click();
  await page.locator("#detailSelectButton").click();
  assert.equal(await page.locator("#storyGateButton").innerText(),"문제 열기");
  await page.locator("#storyGateButton").click();
  const answer=await page.evaluate(()=>{
   const prompt=document.getElementById("storyQuizQuestion").textContent;
   const q=CardStoryGates.all.find(q=>q.cardId==="sejong"&&q.prompt===prompt);
   return q.choices.find(c=>c.id===q.correctChoiceId).text;
  });
  await page.locator("#storyQuizChoices button").filter({hasText:answer}).click();
  await page.waitForFunction(()=>document.getElementById("storyGateButton").disabled&&/완료/.test(document.getElementById("storyGateButton").textContent));
  assert.deepEqual(errors,[]);
  console.log("PASS offline Sejong battle and biography quiz, no missing audiobook link");
  console.log("SCREENSHOTS",output);
 }finally{await context.close();await browser.close();server.closeAllConnections();await new Promise(r=>server.close(r));}
})().catch(e=>{console.error(e);process.exitCode=1;server.close();});
