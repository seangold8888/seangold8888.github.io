"use strict";
// 폰 화면 점검: 세로 360·390·430, 가로 844·740 + 아이패드·PC가 예전 배치를 지키는지.
// 가로 넘침 0, 위쪽 버튼 모두 화면 안, 세로는 옷 2줄 이상, 가로는 페이지 세로 넘침 0,
// 손가락 탭으로 옷 고르기, 대화상자(사진·앨범·소풍·초대장·이야기책·패션쇼·진열장)가 화면 안, 콘솔 오류 0.
// BASE=http://127.0.0.1:8000 처럼 떠 있는 정적 서버를 쓸 수 있고, 없으면 자체 서버를 띄운다. SHOTS=<폴더>면 스크린샷 저장.
const {chromium}=require("playwright"),assert=require("node:assert/strict"),http=require("node:http"),fs=require("node:fs"),path=require("node:path");
const root=path.resolve(__dirname,"../.."),shots=process.env.SHOTS||"";
if(shots)fs.mkdirSync(shots,{recursive:true});
const server=http.createServer((req,res)=>{
 const p=decodeURIComponent(new URL(req.url,"http://local").pathname),file=path.resolve(root,"."+p+(p.endsWith("/")?"index.html":""));
 if(!file.startsWith(root+path.sep)){res.writeHead(403);return res.end();}
 fs.readFile(file,(e,d)=>{res.writeHead(e?404:200,{"Content-Type":({".html":"text/html; charset=utf-8",".js":"application/javascript",".css":"text/css",".json":"application/json",".png":"image/png",".jpg":"image/jpeg",".webp":"image/webp",".svg":"image/svg+xml",".mp3":"audio/mpeg"})[path.extname(file)]||"application/octet-stream"});res.end(e?"missing":d);});
});
const PHONES=[[360,740],[390,844],[430,932],[844,390],[740,360]],BIG=[[1180,820],[820,1180],[1440,900]];
const NAV=["숲속 소풍 · 공주 키우기","💌 초대장 6통","📖 내 이야기책","🎤 패션쇼"];

async function fitsViewport(p,selector,what,clipped){
 const r=await p.locator(selector).evaluate(n=>{const b=n.getBoundingClientRect();return {l:b.left,t:b.top,r:b.right,b:b.bottom,w:innerWidth,h:innerHeight,sw:n.scrollWidth,cw:n.clientWidth};});
 assert.ok(r.l>=-1&&r.t>=-1&&r.r<=r.w+1&&r.b<=r.h+1,what+" off-screen "+JSON.stringify(r));
 if(!clipped)assert.ok(r.sw<=r.cw+1,what+" scrolls sideways "+JSON.stringify(r));
}
async function shot(p,name){if(shots)await p.screenshot({path:path.join(shots,name+".png")});}

(async()=>{
 let base=process.env.BASE;
 if(!base){await new Promise(r=>server.listen(0,"127.0.0.1",r));base="http://127.0.0.1:"+server.address().port;}
 const browser=await chromium.launch({channel:"msedge",headless:true});
 try{
  for(const [w,h] of [...PHONES,...BIG]){
   const phone=PHONES.some(([a,b])=>a===w&&b===h),portrait=h>w,tag=(phone?(portrait?"p":"l"):"t")+w+"x"+h;
   const context=await browser.newContext({viewport:{width:w,height:h},isMobile:phone,hasTouch:phone,deviceScaleFactor:phone?2:1,serviceWorkers:"block"});
   await context.addInitScript(()=>{if(!sessionStorage.getItem("ps-init")){localStorage.clear();sessionStorage.setItem("ps-init","1");}localStorage.setItem("princess:mute","1");});
   const p=await context.newPage(),errors=[];
   p.on("pageerror",e=>errors.push("pageerror: "+e));p.on("console",m=>{if(m.type()==="error")errors.push("console: "+m.text());});
   await p.goto(base+"/princess/?heads=natural&v=picnic-1");
   await p.locator("#stage > svg").waitFor();
   const tap=async loc=>phone?loc.tap():loc.click();
   // 읽는 이름은 화면 크기와 상관없이 원래 글자.
   for(const name of NAV)assert.equal(await p.getByRole("button",{name,exact:true}).count(),1,tag+" "+name);
   const g=await p.evaluate(()=>{
    const box=e=>{const r=e.getBoundingClientRect();return {t:(e.getAttribute("aria-label")||e.textContent).trim(),l:r.left,r:r.right,top:r.top,b:r.bottom,w:r.width,h:r.height};};
    return {sw:document.documentElement.scrollWidth,iw:innerWidth,sh:document.documentElement.scrollHeight,ih:innerHeight,
     buttons:[...document.querySelectorAll("header .btn,.outing-nav button")].map(box),
     main:["#stage","#panel","#tabs","#items"].map(s=>box(document.querySelector(s))),
     tabs:[...document.querySelectorAll("#tabs .tab")].map(box),stage:box(document.querySelector("#stage")),
     full:getComputedStyle(document.querySelector(".outing-nav .nv-full")).display};
   });
   assert.equal(g.sw,g.iw,tag+" page scrolls sideways");
   for(const b of [...g.buttons,...g.main])assert.ok(b.l>=-1&&b.r<=g.iw+1&&b.top>=-1&&b.b<=g.ih+1,tag+" off-screen: "+JSON.stringify(b));
   if(phone){
    assert.equal(g.full,"none",tag+" phone shows short nav chips");
    for(const b of [...g.buttons,...g.tabs])assert.ok(b.h>=44&&b.w>=44,tag+" small touch target "+JSON.stringify(b));
    if(portrait)assert.ok(g.stage.h>=h*.33,tag+" doll too small "+g.stage.h);
    else{assert.ok(g.sh<=g.ih,tag+" page taller than screen "+g.sh);assert.ok(g.stage.h>=h*.7,tag+" doll not full height "+g.stage.h);}
   }else assert.equal(g.full,"inline",tag+" wide screens keep full labels");
   await shot(p,tag+"-1-home");
   // 손가락으로 드레스 탭 → 옷 → 색.
   await tap(p.locator('#tabs .tab[data-key="dress"]'));
   await tap(p.locator('#items .item[data-id="party"]'));
   assert.equal(await p.evaluate(()=>state.dress&&state.dress.id),"party",tag+" tap selects dress");
   await tap(p.locator('#swatches .sw[data-c="#ff8fc1"]'));
   assert.equal(await p.evaluate(()=>state.dress.color),"#ff8fc1",tag+" tap dyes dress");
   const rows=await p.evaluate(()=>{const box=document.querySelector("#items").getBoundingClientRect();
    const tops=new Set([...document.querySelectorAll("#items .item")].map(i=>i.getBoundingClientRect()).filter(r=>r.top>=box.top-1&&r.bottom<=box.bottom+1&&r.height>=80).map(r=>Math.round(r.top)));
    return tops.size;});
   if(phone&&portrait)assert.ok(rows>=2,tag+" item grid shows "+rows+" full rows");
   if(phone&&!portrait)assert.ok(rows>=1,tag+" item grid shows "+rows+" full rows");
   if(phone){
    const sizes=await p.locator("#items .item,#swatches .sw").evaluateAll(n=>n.map(x=>{const r=x.getBoundingClientRect();return [r.width,r.height];}));
    assert.ok(sizes.every(([a,b])=>a>=44&&b>=44),tag+" item/swatch below 44px");
    assert.equal(await p.evaluate(()=>getComputedStyle(document.querySelector("#intro")).display),"none");
   }
   await shot(p,tag+"-2-dress");
   if(phone){
    // 사진·앨범
    await tap(p.locator("#btnPhoto"));await p.locator("#photoOverlay.show").waitFor();await p.locator("#photoImg").evaluate(i=>i.decode());
    await fitsViewport(p,"#photoOverlay .sheet","photo sheet");await fitsViewport(p,"#photoSave","photo save button");
    await shot(p,tag+"-3-photo");await tap(p.locator("#photoSave"));
    await p.locator("#photoOverlay.show").waitFor({state:"hidden"});
    await tap(p.locator("#btnAlbum"));await p.locator("#albumOverlay.show").waitFor();
    await fitsViewport(p,"#albumOverlay .sheet","album sheet");assert.equal(await p.locator("#albumGrid .shot").count(),1);
    await tap(p.locator("#albumClose"));
    // 숲속 소풍, 초대장, 이야기책
    await tap(p.getByRole("button",{name:NAV[0],exact:true}));await p.locator(".pj-dialog[open]").waitFor();
    await fitsViewport(p,".pj-dialog[open]","journey dialog");await fitsViewport(p,".pj-dialog[open] .pj-art","journey art");
    await shot(p,tag+"-4-journey");await p.keyboard.press("Escape");
    await tap(p.getByRole("button",{name:NAV[1],exact:true}));const inv=p.locator(".outing-dialog[open]");await inv.waitFor();
    await fitsViewport(p,".outing-dialog[open]","invite dialog");
    await tap(inv.locator("[data-invite]").first());await p.locator(".outing-quest").waitFor({state:"visible"});
    await fitsViewport(p,".outing-quest","outing quest bar");
    await tap(p.locator(".outing-quest .outing-primary"));await p.locator(".outing-scene[open]").waitFor();
    await fitsViewport(p,".outing-scene[open]","outing scene");await fitsViewport(p,".outing-scene[open] .outing-stage","outing stage");
    await shot(p,tag+"-5-scene");await p.keyboard.press("Escape");
    await tap(p.getByRole("button",{name:NAV[2],exact:true}));await p.locator(".outing-dialog[open]").waitFor();
    await fitsViewport(p,".outing-dialog[open]","story book");await p.keyboard.press("Escape");
    await tap(p.locator(".outing-quest").getByRole("button",{name:"자유 꾸미기",exact:true}));
    // 패션쇼: 주제 카드 + 트로피 진열장 → 준비 막대 → 무대 → 심사
    await tap(p.getByRole("button",{name:NAV[3],exact:true}));const pick=p.locator(".fs-pick");await pick.waitFor({state:"visible"});
    await fitsViewport(p,".fs-pick","fashion pick dialog");
    const shelf=await pick.locator(".fs-shelf").evaluate(n=>{const r=n.getBoundingClientRect();return {w:r.width,sw:n.scrollWidth,cw:n.clientWidth,slots:[...n.children].map(s=>s.getBoundingClientRect().width)};});
    assert.ok(shelf.sw<=shelf.cw+1&&shelf.slots.every(x=>x>=90),tag+" trophy shelf "+JSON.stringify(shelf));
    await shot(p,tag+"-6-pick");
    await tap(pick.getByRole("button",{name:"👗 이 주제로 꾸미기 →",exact:true}));
    const bar=p.locator(".fs-bar");await bar.waitFor({state:"visible"});await fitsViewport(p,".fs-bar","fashion bar");
    assert.equal(await p.evaluate(()=>document.documentElement.scrollWidth),w);
    const barButtons=await bar.locator("button").evaluateAll(n=>n.map(b=>b.getBoundingClientRect().height));assert.ok(barButtons.every(x=>x>=44),tag+" bar buttons "+barButtons);
    await shot(p,tag+"-7-bar");
    await tap(bar.getByRole("button",{name:"무대로! 🎤",exact:true}));
    const show=p.locator(".fs-show");await show.waitFor({state:"visible"});
    await p.locator(".fs-runway.is-walking").waitFor({timeout:5000});
    await fitsViewport(p,".fs-show","fashion show dialog");await fitsViewport(p,".fs-show .fs-runway","runway",true);
    await shot(p,tag+"-8-runway");
    await tap(show.getByRole("button",{name:"⏩ 빨리 보기",exact:true}));
    await show.locator(".fs-result").waitFor({state:"visible",timeout:25000});
    assert.equal(await show.locator(".fs-judge").count(),3);
    await fitsViewport(p,".fs-show","fashion show result");
    const btns=await show.locator("button").evaluateAll(n=>n.filter(b=>b.offsetParent).map(b=>b.getBoundingClientRect().height));assert.ok(btns.every(x=>x>=44),tag+" show buttons "+btns);
    await shot(p,tag+"-9-judges");
    await tap(show.getByRole("button",{name:"닫기",exact:true}));await show.waitFor({state:"hidden"});
    const after=await p.evaluate(()=>({sw:document.documentElement.scrollWidth,sh:document.documentElement.scrollHeight,ih:innerHeight}));
    assert.equal(after.sw,w,tag+" sideways after show");if(!portrait)assert.ok(after.sh<=after.ih,tag+" landscape overflow with bar "+JSON.stringify(after));
   }
   assert.deepEqual(errors,[],tag+" console errors");
   console.log("PASS",tag,phone?"phone layout, taps, dialogs, fashion show":"wide layout unchanged (full labels)");
   await context.close();
  }
 }finally{await browser.close();server.close();}
})().catch(e=>{console.error(e);process.exitCode=1;server.close();});
