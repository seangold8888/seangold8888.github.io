"use strict";
// 공용 배경음악 재생기가 카드 게임에서 실제로 곡을 틀고, 장면에 따라 바꾸고,
// 끄기 설정을 지키는지 진짜 브라우저로 확인한다.
const {chromium}=require("playwright"),assert=require("node:assert/strict"),fs=require("node:fs"),path=require("node:path"),http=require("node:http");
const root=path.resolve(__dirname,"../..");
const mime={".html":"text/html; charset=utf-8",".js":"application/javascript",".css":"text/css",".json":"application/json",".webp":"image/webp",".png":"image/png",".mp3":"audio/mpeg"};
const server=http.createServer((q,r)=>{const p=decodeURIComponent(new URL(q.url,"http://x").pathname);const f=path.resolve(root,"."+p+(p.endsWith("/")?"index.html":""));
 if(!f.startsWith(root+path.sep)){r.writeHead(403);return r.end();}
 fs.readFile(f,(e,d)=>{r.writeHead(e?404:200,{"Content-Type":mime[path.extname(f)]||"application/octet-stream"});r.end(e?"":d);});});
const look=page=>page.evaluate(()=>Object.assign(window.CardBgm.state(),{suspended:window.CardAudio.isSynthBgmSuspended()}));
(async()=>{
 await new Promise(r=>server.listen(0,"127.0.0.1",r));
 const base="http://127.0.0.1:"+server.address().port;
 const browser=await chromium.launch({channel:"msedge",headless:true,args:["--autoplay-policy=no-user-gesture-required"]});
 try{
  for(const viewport of [{width:390,height:844},{width:820,height:1180}]){
   const context=await browser.newContext({viewport});const page=await context.newPage();const errors=[];
   const served=[];
   page.on("pageerror",e=>errors.push(String(e)));
   page.on("response",r=>{if(/.mp3$/.test(new URL(r.url()).pathname))served.push(r.status());});
   await page.goto(base+"/cards/?preview=1");
   await page.waitForFunction(()=>document.querySelectorAll(".card-gallery-item").length>0);
   await page.mouse.click(5,5);                       // 첫 조작으로 소리 잠금 해제
   await page.waitForFunction(()=>window.CardBgm&&window.CardBgm.isPlaying(),null,{timeout:15000});
   const menu=await look(page);
   assert.equal(menu.track,"cards-menu");
   assert.equal(menu.suspended,true,"파일이 울리면 합성 배경음은 멈춰야 한다");
   await page.waitForFunction(()=>window.CardBgm.state().time>0.2,null,{timeout:15000});
   await page.waitForFunction(()=>window.CardBgm.state().volume>0.2,null,{timeout:15000});
   // 대결 화면으로 가면 전투곡으로 바뀐다
   await page.locator("#collectionGrid .card-gallery-item").first().click();
   await page.locator("#detailSelectButton").click();
   await page.waitForFunction(()=>window.CardBgm.state().track==="cards-battle"&&window.CardBgm.state().volume>0.2&&!window.CardBgm.state().paused,null,{timeout:15000});
   // 배경음악 끄기 버튼은 파일 재생도 멈추고 설정을 기억한다
   await page.locator("#musicButton").click();
   await page.waitForFunction(()=>window.CardBgm.state().paused||window.CardBgm.state().volume<0.02,null,{timeout:15000});
   assert.equal(await page.evaluate(()=>localStorage.getItem("cards_bgm_muted")),"1");
   await page.reload();
   await page.waitForFunction(()=>document.querySelectorAll(".card-gallery-item").length>0);
   await page.mouse.click(5,5);
   await page.waitForTimeout(1200);
   const after=await look(page);
   assert.equal(after.playing,false,"끈 설정은 새로고침 뒤에도 지켜야 한다");
   assert.equal(after.suspended,false,"파일이 안 울리면 합성 배경음 차단도 풀려야 한다");
   assert.ok(served.length>0&&served.every(code=>code===200),"곡 파일 응답: "+served.join(","));
   assert.deepEqual(errors,[]);
   await context.close();
   console.log("PASS",viewport,"메뉴곡 재생 · 전투곡 전환 · 끄기 유지 · 합성음 대체");
  }
  // 모험 상자 첫 화면
  {
   const context=await browser.newContext({viewport:{width:820,height:1180}});const page=await context.newPage();const errors=[];
   page.on("pageerror",e=>errors.push(String(e)));
   await page.goto(base+"/game/");
   await page.waitForSelector("#hubMusic");
   await page.mouse.click(5,5);
   await page.waitForFunction(()=>window.HubBgm&&document.getElementById("hubMusic"),null,{timeout:15000});
   await page.waitForFunction(()=>performance.getEntriesByType("resource").some(r=>r.name.includes("hub.mp3")),null,{timeout:15000});
   await page.locator("#hubMusic").click();
   assert.equal(await page.evaluate(()=>localStorage.getItem("hub_bgm_muted")),"1");
   assert.equal(await page.locator("#hubMusic").getAttribute("aria-pressed"),"true");
   await page.reload();
   await page.waitForSelector("#hubMusic");
   assert.equal(await page.locator("#hubMusic").getAttribute("aria-pressed"),"true","끈 설정은 새로고침 뒤에도 지켜야 한다");
   assert.deepEqual(errors,[]);
   await context.close();
   console.log("PASS 모험 상자 첫 화면 곡 요청 · 끄기 버튼 · 설정 유지");
  }
 }finally{await browser.close();if(server.closeAllConnections)server.closeAllConnections();await new Promise(r=>server.close(r));}
})().catch(e=>{console.error(e);process.exitCode=1;});
