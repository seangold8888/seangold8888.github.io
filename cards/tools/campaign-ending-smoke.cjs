"use strict";
// Real shared service worker and actual assets, in an isolated localhost profile.
const {chromium} = require("playwright");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const http = require("node:http");
const path = require("node:path");
const os = require("node:os");
const C = require("../js/campaign.js");
const SW = require("../../sw.js");
const root = path.resolve(__dirname,"../..");
const output = fs.mkdtempSync(path.join(os.tmpdir(),"campaign-s3-offline-"));
const mime = {".html":"text/html; charset=utf-8",".js":"application/javascript",".css":"text/css",".json":"application/json",".webp":"image/webp",".png":"image/png",".svg":"image/svg+xml",".mp3":"audio/mpeg",".wav":"audio/wav"};
const server = http.createServer((req,res)=>{
  const url = new URL(req.url,"http://fixture");
  const pathname = decodeURIComponent(url.pathname);
  const file = path.resolve(root,"."+pathname+(pathname.endsWith("/")?"index.html":""));
  if(!file.startsWith(root+path.sep)){res.writeHead(403);return res.end();}
  fs.readFile(file,(error,data)=>{
    res.writeHead(error?404:200,{"Content-Type":mime[path.extname(file)]||"application/octet-stream"});
    res.end(error?"not found":data);
  });
});
function ending() {
  let p=C.createProgress();
  for(let chapter=0;chapter<8;chapter++){
    p=C.finishIntro(p);
    if(chapter)p=C.selectParty(p,["jaei","taeo","redhood"]);
    for(const id of C.encounterIds(chapter)){
      p=C.beginBattle(p,"jaei");p=C.finishBattle(p,p.battleSerial,"player");
    }
    if(chapter<7)p=C.finishChapter(p);
  }
  return C.advanceEnding(C.advanceEnding(p));
}
(async()=>{
  await new Promise(resolve=>server.listen(0,"127.0.0.1",resolve));
  const base="http://127.0.0.1:"+server.address().port;
  const browser=await chromium.launch({headless:true,channel:"msedge"});
  const context=await browser.newContext({viewport:{width:820,height:1180},reducedMotion:"reduce"});
  const page=await context.newPage();
  const errors=[];page.on("pageerror",error=>errors.push(String(error)));
  try{
    await page.goto(base+"/cards/");
    await page.evaluate(async p=>{
      localStorage.setItem("card_campaign",JSON.stringify(p));
      await navigator.serviceWorker.register("/sw.js");
    },ending());
    await page.waitForFunction(()=>navigator.serviceWorker.controller,null,{timeout:60000});
    await page.waitForFunction(async name=>(await caches.keys()).includes(name),SW.STATIC_CACHE);
    const cached=await page.evaluate(async name=>{
      const cache=await caches.open(name);
      const files=["/cards/js/campaign.js?v=57","/cards/art/sseugumi.webp",...["appa","eomma","jaei","taeo"].map(id=>"/cards/art/"+id+".webp")];
      return Promise.all(files.map(async file=>Boolean(await cache.match(file))));
    },SW.STATIC_CACHE);
    assert.deepEqual(cached,[true,true,true,true,true,true]);
    await page.evaluate(async name=>{
      const cache=await caches.open(name);
      await cache.put("/cards/",new Response("<html><body>OLD CARD SCREEN</body></html>",{headers:{"Content-Type":"text/html"}}));
    },SW.STATIC_CACHE);
    await page.goto(base+"/cards/?v=fresh-navigation-test");
    await page.waitForFunction(()=>document.querySelectorAll(".card-gallery-item").length===85);
    assert.equal(await page.locator("#collectionTrait").count(),0);
    const savedBefore=await page.evaluate(()=>localStorage.getItem("card_campaign"));
    await page.goto(base+"/cards/latest.html");
    await page.waitForURL("**/cards/?v=history-eight",{timeout:60000});
    await page.waitForFunction(()=>document.querySelectorAll(".card-gallery-item").length===85);
    assert.equal(await page.locator("#collectionGrid .trait-badge").count(),0);
    assert.equal(await page.evaluate(()=>localStorage.getItem("card_campaign")),savedBefore);
    await context.setOffline(true);
    await page.reload();
    await page.waitForFunction(()=>document.querySelectorAll(".card-gallery-item").length===85);
    assert.match(await page.locator('#collectionGrid [data-card-id="sseugumi"]').getAttribute("class"),/is-locked/);
    await page.locator("#campaignButton").click();
    await page.locator(".expedition-map-footer .primary-button").click();
    assert.match(await page.locator(".expedition-header").innerText(),/우리 집 아침/);
    await page.waitForFunction(()=>{const imgs=[...document.querySelectorAll(".is-family-ending img")];return imgs.length===4&&imgs.every(img=>img.complete&&img.naturalWidth>0);});
    await page.screenshot({path:path.join(output,"ipad-offline-family.png")});
    const familyPages=Number(await page.locator(".expedition-scene").getAttribute("data-page-count"));
    for(let i=0;i<familyPages;i++)await page.locator(".expedition-scene .primary-button").click();
    assert.match(await page.locator(".expedition-header").innerText(),/우리가 지킨 이야기/);
    const finalPages=Number(await page.locator(".expedition-scene").getAttribute("data-page-count"));
    for(let i=0;i<finalPages;i++)await page.locator(".expedition-scene .primary-button").click();
    assert.equal(await page.evaluate(()=>JSON.parse(localStorage.card_campaign).ending),1);
    await page.locator(".expedition-map-footer .primary-button").click();
    await page.locator('#collectionGrid [data-card-id="sseugumi"]').click();
    assert.ok(await page.locator("#cardDetailDialog").isVisible());
    await page.locator("#cardDetailDialog").screenshot({path:path.join(output,"ipad-offline-sseugumi.png")});
    await page.locator("#detailSelectButton").click();
    assert.equal(await page.locator("#actionList button").count(),7);
    assert.equal(await page.locator("#storyGateButton").innerText(),"문제 열기");
    for(const viewport of [{width:820,height:1180},{width:1180,height:820},{width:390,height:844}]){
      await page.setViewportSize(viewport);
      for(const button of await page.locator("#actionList button").all()){
        await button.scrollIntoViewIfNeeded();
        const box=await button.boundingBox();
        assert.ok(box&&box.x>=0&&box.y>=0&&box.x+box.width<=viewport.width+1&&box.y+box.height<=viewport.height+1);
      }
      assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1));
      await page.evaluate(()=>window.scrollTo(0,0));
      await page.screenshot({path:path.join(output,viewport.width+"-offline-battle.png")});
    }
    await page.locator("#storyGateButton").click();
    assert.ok(await page.locator("#storyQuizDialog").isVisible());
    assert.deepEqual(errors,[]);
    console.log("PASS offline v98: ending resume, family art, reward art, recruitment, seven actions and card quiz; 3 viewports");
    console.log("SCREENSHOTS",output);
  }finally{
    await context.close();await browser.close();
    server.closeAllConnections();await new Promise(resolve=>server.close(resolve));
  }
})().catch(error=>{console.error(error);process.exitCode=1;server.close();});
