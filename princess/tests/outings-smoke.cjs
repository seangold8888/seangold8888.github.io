"use strict";
const {chromium}=require("playwright"),assert=require("node:assert/strict"),http=require("node:http"),fs=require("node:fs"),path=require("node:path"),os=require("node:os");
const root=path.resolve(__dirname,"../.."),output=fs.mkdtempSync(path.join(os.tmpdir(),"princess-outings-"));
const server=http.createServer((req,res)=>{
 const p=decodeURIComponent(new URL(req.url,"http://local").pathname),file=path.resolve(root,"."+p+(p.endsWith("/")?"index.html":""));
 if(!file.startsWith(root+path.sep)){res.writeHead(403);return res.end();}
 fs.readFile(file,(e,d)=>{res.writeHead(e?404:200,{"Content-Type":({".html":"text/html; charset=utf-8",".js":"application/javascript",".css":"text/css",".json":"application/json",".png":"image/png",".jpg":"image/jpeg",".webp":"image/webp",".svg":"image/svg+xml",".mp3":"audio/mpeg"})[path.extname(file)]||"application/octet-stream"});res.end(e?"missing":d);});
});
(async()=>{
 await new Promise(r=>server.listen(0,"127.0.0.1",r));const base="http://127.0.0.1:"+server.address().port,browser=await chromium.launch({channel:"msedge",headless:true});
 try{
  for(const viewport of [{width:1180,height:820},{width:820,height:1180},{width:390,height:844}]){
   const context=await browser.newContext({viewport,serviceWorkers:"block",reducedMotion:"reduce"});
   await context.addInitScript(()=>localStorage.setItem("princess:mute","1"));
   const p=await context.newPage(),errors=[];p.on("pageerror",e=>errors.push(String(e)));await p.goto(base+"/princess/");
   await p.getByRole("button",{name:"💌 초대장 6통",exact:true}).click();assert.equal(await p.locator("[data-invite]").count(),6);
   await p.screenshot({path:path.join(output,viewport.width+"-invites.png")});
   await p.locator("[data-invite=tea]").click();
   assert.match(await p.locator(".outing-quest").innerText(),/하늘색/);
   await p.locator("#swatches [data-c='#6fc3ff']").click();
   assert.match(await p.locator(".outing-quest").innerText(),/준비됐어요/);
   const wardrobe=await p.evaluate(()=>localStorage.getItem("princess:outfits"));
   await p.locator(".outing-quest .outing-primary").click();await p.locator(".outing-scene").waitFor({state:"visible"});
   await p.getByRole("button",{name:"🙇 꾸벅 인사",exact:true}).click();assert.match(await p.locator(".outing-live").innerText(),/꾸벅/);
   await p.getByRole("button",{name:"✨ 반짝 포즈",exact:true}).click();assert.match(await p.locator(".outing-actor").getAttribute("transform"),/rotate\(-3\)/);
   await p.getByRole("button",{name:"🐾 친구 부르기",exact:true}).click();assert.match(await p.locator(".outing-live").innerText(),/친구/);
   const geometry=await p.locator(".outing-scene").evaluate(dialog=>({client:dialog.clientWidth,scroll:dialog.scrollWidth,buttons:[...dialog.querySelectorAll("button")].map(b=>({text:b.textContent,w:b.getBoundingClientRect().width,h:b.getBoundingClientRect().height}))}));
   assert.ok(geometry.scroll<=geometry.client+1,JSON.stringify(geometry));assert.ok(geometry.buttons.every(b=>b.h>=44));
   await p.getByRole("button",{name:"📸 찍어서 이야기책에",exact:true}).click();
   await p.waitForFunction(()=>document.querySelector(".outing-live").textContent.includes("한 페이지"));
   assert.equal(await p.evaluate(()=>localStorage.getItem("princess:outfits")),wardrobe);
   assert.equal(await p.evaluate(()=>PrincessOutings.readBook(localStorage).pages.length),1);
   assert.equal(await p.getByRole("button",{name:"✓ 이야기책에 담았어요",exact:true}).isDisabled(),true);
   await p.screenshot({path:path.join(output,viewport.width+"-scene.png")});
   await p.getByRole("button",{name:"📖 이야기책 보기",exact:true}).click();await p.locator(".outing-page img").evaluate(i=>i.decode());
   await p.screenshot({path:path.join(output,viewport.width+"-book.png")});
   await p.reload();await p.getByRole("button",{name:"📖 내 이야기책",exact:true}).click();assert.equal(await p.locator(".outing-page").count(),1);
   const bookDialog=p.locator(".outing-dialog[open]");await bookDialog.getByRole("button",{name:"닫기",exact:true}).click();
   await p.getByRole("button",{name:"💌 초대장 6통",exact:true}).click();await p.locator("[data-invite=rainbow]").click();
   // An unmatched wish never blocks a child's own outfit.
   await p.locator(".outing-quest .outing-primary").click();assert.equal(await p.locator(".outing-scene").isVisible(),true);
   await p.locator(".outing-scene").getByRole("button",{name:"닫기",exact:true}).click();
   await p.locator(".outing-quest").getByRole("button",{name:"자유 꾸미기",exact:true}).click();assert.equal(await p.locator(".outing-quest").isVisible(),false);
   assert.deepEqual(errors,[]);await context.close();console.log("PASS",viewport,"invitation, actual color selection, reactions, photo, reload, free play");
  }
  const context=await browser.newContext({viewport:{width:820,height:1180}}),p=await context.newPage();
  await p.goto(base+"/princess/");await p.evaluate(()=>navigator.serviceWorker.register("/sw.js"));
  await p.waitForFunction(()=>navigator.serviceWorker.controller,null,{timeout:90000});
  await p.waitForFunction(async()=>{const names=await caches.keys();for(const name of names){const c=await caches.open(name);if(await c.match("/princess/outings.js?v=1"))return true;}return false;},null,{timeout:90000});
  // Wait for the actual selected outfit/scenery to be cached before going offline.
  await p.getByRole("button",{name:"💌 초대장 6통",exact:true}).click();await p.locator("[data-invite=moon]").click();await p.locator(".outing-quest .outing-primary").click();
  await p.getByRole("button",{name:"📸 찍어서 이야기책에",exact:true}).click();await p.waitForFunction(()=>document.querySelector(".outing-live").textContent.includes("한 페이지"));
  await context.setOffline(true);await p.reload();await p.getByRole("button",{name:"📖 내 이야기책",exact:true}).click();
  assert.equal(await p.locator(".outing-page").count(),1);await p.locator(".outing-page img").evaluate(i=>i.decode());
  await p.locator(".outing-dialog[open]").getByRole("button",{name:"닫기",exact:true}).click();
  await p.getByRole("button",{name:"💌 초대장 6통",exact:true}).click();await p.locator("[data-invite=moon]").click();await p.locator(".outing-quest .outing-primary").click();
  await p.getByRole("button",{name:"📸 찍어서 이야기책에",exact:true}).click();await p.waitForFunction(()=>document.querySelector(".outing-live").textContent.includes("한 페이지"));
  assert.equal(await p.evaluate(()=>PrincessOutings.readBook(localStorage).pages.length),2);
  await context.close();console.log("PASS offline reload, old photo and new outing photo");console.log("SCREENSHOTS",output);
 }finally{await browser.close();server.closeAllConnections();await new Promise(r=>server.close(r));}
})().catch(e=>{console.error(e);process.exitCode=1;server.close();});
