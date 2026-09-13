"use strict";
const {chromium}=require("playwright");
const assert=require("node:assert/strict"),fs=require("node:fs"),http=require("node:http"),path=require("node:path"),os=require("node:os");
const root=path.resolve(__dirname,"../..");
const output=fs.mkdtempSync(path.join(os.tmpdir(),"collection-gallery-"));
const mime={".html":"text/html; charset=utf-8",".js":"application/javascript",".css":"text/css",".json":"application/json",".png":"image/png",".webp":"image/webp",".svg":"image/svg+xml"};
const server=http.createServer((req,res)=>{
  const url=new URL(req.url,"http://fixture"),p=decodeURIComponent(url.pathname);
  const file=path.resolve(root,"."+p+(p.endsWith("/")?"index.html":""));
  if(!file.startsWith(root+path.sep)){res.writeHead(403);return res.end();}
  fs.readFile(file,(error,data)=>{res.writeHead(error?404:200,{"Content-Type":mime[path.extname(file)]||"application/octet-stream"});res.end(error?"not found":data);});
});
(async()=>{
 await new Promise(resolve=>server.listen(0,"127.0.0.1",resolve));
 const browser=await chromium.launch({headless:true,channel:"msedge"});
 try{
  for(const viewport of [{width:820,height:1180},{width:1180,height:820},{width:390,height:844}]){
   const context=await browser.newContext({viewport,serviceWorkers:"block",reducedMotion:"reduce"});
   const page=await context.newPage(),errors=[];
   page.on("pageerror",e=>errors.push(String(e)));
   await page.goto("http://127.0.0.1:"+server.address().port+"/cards/");
   await page.waitForFunction(()=>document.querySelectorAll(".card-gallery-item").length===76);
   const geometry=await page.evaluate(()=>{
     const cards=[...document.querySelectorAll("#collectionGrid .story-card")];
     return cards.map(c=>{const b=c.getBoundingClientRect(),a=c.querySelector(".card-art").getBoundingClientRect();return {id:c.dataset.cardId,w:b.width,h:b.height,art:a.height,y:b.y};});
   });
   assert.ok(Math.max(...geometry.map(c=>c.w))-Math.min(...geometry.map(c=>c.w))<1);
   assert.ok(Math.max(...geometry.map(c=>c.h))-Math.min(...geometry.map(c=>c.h))<1);
   for(const c of geometry)assert.ok(c.art/c.h>.65,JSON.stringify(c));
   assert.equal(geometry.filter(c=>Math.abs(c.y-geometry[0].y)<1).length,viewport.width===820?3:viewport.width===1180?5:2);
   assert.equal(await page.locator("#collectionGrid .combat-facts").count(),0);
   assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1));
   await page.waitForFunction(()=>[...document.querySelectorAll("#collectionGrid img")].filter(img=>img.getBoundingClientRect().top<innerHeight).every(img=>img.complete&&img.naturalWidth>0));
   await page.screenshot({path:path.join(output,viewport.width+"-gallery.png")});
   for(const mode of ["hp","power","element","name","ready"]){
     await page.locator("#collectionSort").selectOption(mode);
     const ids=await page.locator("#collectionGrid .story-card").evaluateAll(nodes=>nodes.map(n=>n.dataset.cardId));
     const expected=await page.evaluate(async mode=>{
       const data=await (await fetch("cards.json")).json();
       const cardMap=new Map(data.cards.map(c=>[c.id,c]));
       const order=data.collection.map(id=>cardMap.get(id));
       if(mode==="ready")return null;
       return CardView.sortCollection(order,mode,()=>false,()=>true).map(c=>c.id);
     },mode);
     if(expected)assert.deepEqual(ids,expected,mode);
   }
   await page.locator("#collectionSort").selectOption("name");
   await page.reload();await page.waitForFunction(()=>document.querySelectorAll(".card-gallery-item").length===76);
   assert.equal(await page.locator("#collectionSort").inputValue(),"name");
   for(const [id,destination] of [["jaei","/math/"],["guanyu","/sanguo/"],["circe","/odyssey/"],["cinderella","/story/"]]){
     await page.locator('#collectionGrid [data-card-id="'+id+'"]').click();
     assert.ok(await page.locator("#cardDetailDialog").isVisible());
     assert.ok(await page.locator("#detailSelectButton").isDisabled());
     assert.ok((await page.locator("#detailUnlockLink").getAttribute("href")).endsWith(destination));
     assert.ok(await page.locator("#cardDetailCard .attack-row").count()>=2);
     if(id==="jaei"){
       assert.match(await page.locator("#cardDetailStatus").innerText(),/7일/);
       assert.match(await page.locator("#detailUnlockLink").innerText(),/수학/);
       const wrapping=await page.locator("#cardDetailCard .attack-copy small").first().evaluate(n=>({whiteSpace:getComputedStyle(n).whiteSpace,overflow:getComputedStyle(n).overflow}));
       assert.equal(wrapping.whiteSpace,"normal");assert.equal(wrapping.overflow,"visible");
       await page.locator("#cardDetailDialog").screenshot({path:path.join(output,viewport.width+"-detail.png")});
     }
     await page.locator("[data-detail-close]").first().click();
   }
   await page.locator('#collectionGrid [data-card-id="sseugumi"]').click();
   assert.ok(await page.locator("#detailUnlockLink").isHidden());
   await page.locator("[data-detail-close]").first().click();
   await page.locator('#collectionGrid [data-card-id="redhood"]').click();
   assert.ok(await page.locator("#detailSelectButton").isEnabled());
   await page.locator("#detailSelectButton").click();
   assert.match(await page.locator("#selectedName").innerText(),/빨간 모자/);
   assert.deepEqual(errors,[]);
   console.log("PASS",viewport,"uniform art-first cards, sorting persistence, full locked details and correct unlock links");
   await context.close();
  }
  console.log("SCREENSHOTS",output);
 }finally{await browser.close();server.closeAllConnections();await new Promise(resolve=>server.close(resolve));}
})().catch(error=>{console.error(error);process.exitCode=1;server.close();});
