"use strict";
// 패션쇼 브라우저 흐름: 주제 카드 → 실제 옷장 UI로 꾸미기 → 무대 → 심사 → 앨범·진열장 → 새로고침.
// BASE=http://127.0.0.1:8000 처럼 이미 떠 있는 정적 서버를 쓸 수 있고, 없으면 자체 서버를 띄운다.
// SHOTS=<폴더> 를 주면 스크린샷을 그곳에 남긴다.
const {chromium}=require("playwright"),assert=require("node:assert/strict"),http=require("node:http"),fs=require("node:fs"),path=require("node:path"),os=require("node:os");
const root=path.resolve(__dirname,"../.."),shots=process.env.SHOTS||fs.mkdtempSync(path.join(os.tmpdir(),"princess-fashion-"));
fs.mkdirSync(shots,{recursive:true});
const server=http.createServer((req,res)=>{
 const p=decodeURIComponent(new URL(req.url,"http://local").pathname),file=path.resolve(root,"."+p+(p.endsWith("/")?"index.html":""));
 if(!file.startsWith(root+path.sep)){res.writeHead(403);return res.end();}
 fs.readFile(file,(e,d)=>{res.writeHead(e?404:200,{"Content-Type":({".html":"text/html; charset=utf-8",".js":"application/javascript",".css":"text/css",".json":"application/json",".png":"image/png",".jpg":"image/jpeg",".webp":"image/webp",".svg":"image/svg+xml",".mp3":"audio/mpeg"})[path.extname(file)]||"application/octet-stream"});res.end(e?"missing":d);});
});
const runs=[{viewport:{width:1180,height:820},theme:"beach",muted:false},{viewport:{width:820,height:1180},theme:"snow",muted:true}];
(async()=>{
 let base=process.env.BASE;
 if(!base){await new Promise(r=>server.listen(0,"127.0.0.1",r));base="http://127.0.0.1:"+server.address().port;}
 const browser=await chromium.launch({channel:"msedge",headless:true,args:["--autoplay-policy=no-user-gesture-required"]});
 try{
  for(const run of runs){
   const {viewport}=run,tag=viewport.width+"x"+viewport.height;
   const context=await browser.newContext({viewport,serviceWorkers:"block"});
   await context.addInitScript(m=>{if(!sessionStorage.getItem("fs-init")){localStorage.clear();sessionStorage.setItem("fs-init","1");}localStorage.setItem("princess:mute",m?"1":"0");},run.muted);
   const p=await context.newPage(),errors=[];
   p.on("pageerror",e=>errors.push("pageerror: "+e));p.on("console",m=>{if(m.type()==="error")errors.push("console: "+m.text());});
   await p.goto(base+"/princess/?heads=natural&v=picnic-1");
   await p.locator("#stage > svg").waitFor();
   // Existing outing/journey entry points still exist next to the new one.
   assert.equal(await p.locator(".outing-nav .pj-nav button").count(),1);
   assert.equal(await p.getByRole("button",{name:"💌 초대장 6통",exact:true}).count(),1);
   await p.getByRole("button",{name:"🎤 패션쇼",exact:true}).click();
   const pick=p.locator(".fs-pick");await pick.waitFor({state:"visible"});
   assert.equal(await pick.locator("[data-shelf]").count(),await p.evaluate(()=>PrincessFashion.THEMES.length));
   assert.equal(await pick.locator(".fs-slot.is-ribbon,.fs-slot.is-trophy").count(),0);
   let first=await pick.locator(".fs-card").getAttribute("data-theme");
   await pick.getByRole("button",{name:"🃏 다른 카드 뽑기",exact:true}).click();
   assert.notEqual(await pick.locator(".fs-card").getAttribute("data-theme"),first,"a new card is drawn");
   for(let i=0;i<80&&await pick.locator(".fs-card").getAttribute("data-theme")!==run.theme;i++)await pick.getByRole("button",{name:"🃏 다른 카드 뽑기",exact:true}).click();
   assert.equal(await pick.locator(".fs-card").getAttribute("data-theme"),run.theme);
   await pick.getByRole("button",{name:"👗 이 주제로 꾸미기 →",exact:true}).click();
   const bar=p.locator(".fs-bar");await bar.waitFor({state:"visible"});assert.equal(await bar.locator("[data-check]").count(),5);
   // Dress the princess with the real wardrobe UI, using only tagged existing items.
   const plan=await p.evaluate(id=>{const F=PrincessFashion,t=F.theme(id),first=c=>F.suggestions(c,id)[0];
    const acc=["crown","neck","hand","back","shoes"].filter(k=>first(k)).slice(0,2).map(k=>[k,first(k)]);
    return {dress:first("dress"),color:t.colors[0],acc,bg:first("bg"),pet:first("pet")};},run.theme);
   const choose=async(tab,id)=>{await p.locator(`#tabs .tab[data-key="${tab}"]`).click();await p.locator(`#items .item[data-id="${id}"]`).click();};
   await choose("dress",plan.dress);await p.locator(`#swatches .sw[data-c="${plan.color}"]`).click();
   for(const [k,id] of plan.acc)await choose(k,id);
   await choose("bg",plan.bg);await choose("pet",plan.pet);
   assert.equal(await bar.locator("[data-check].is-ok").count(),5,await bar.innerText());
   // Tapping a chip jumps to its wardrobe tab.
   await bar.locator('[data-check="bg"]').click();assert.equal(await p.locator('#tabs .tab.on').getAttribute("data-key"),"bg");
   await p.screenshot({path:path.join(shots,tag+"-1-dressing.png")});
   const wardrobe=await p.evaluate(()=>localStorage.getItem("princess:outfits"));
   const albumBefore=await p.evaluate(()=>JSON.parse(localStorage.getItem("princess:album")||"[]").length);
   await bar.getByRole("button",{name:"무대로! 🎤",exact:true}).click();
   const show=p.locator(".fs-show");await show.waitFor({state:"visible"});
   await p.locator(".fs-runway.is-walking").waitFor({timeout:5000});
   assert.equal(await show.locator(".fs-actor svg [data-studio-background]").count(),0,"walker has no background box");
   assert.ok(await show.locator(".fs-actor svg [data-body-identity]").count()>=1,"composited doll is on the runway");
   assert.ok((await show.locator(".fs-screen img").getAttribute("src")).includes("bg-"+plan.bg));
   await p.waitForTimeout(1200);
   if(run.viewport.width>1000)await p.screenshot({path:path.join(shots,tag+"-2-runway.png")});
   await show.locator(".fs-result").waitFor({state:"visible",timeout:25000});
   assert.equal(await show.locator(".fs-judge").count(),3);
   assert.deepEqual(await show.locator(".fs-judge").evaluateAll(n=>n.map(x=>x.dataset.stars)),["5","5","5"]);
   assert.equal(await show.locator(".fs-judge .fs-stars i.on").count(),15);
   assert.equal(await show.locator(".fs-result").getAttribute("data-award"),"trophy");
   assert.match(await show.locator(".fs-result").innerText(),/트로피/);
   const geometry=await show.evaluate(dialog=>({client:dialog.clientWidth,scroll:dialog.scrollWidth,buttons:[...dialog.querySelectorAll("button")].filter(b=>b.offsetParent).map(b=>({t:b.textContent,h:b.getBoundingClientRect().height}))}));
   assert.ok(geometry.scroll<=geometry.client+1,JSON.stringify(geometry));assert.ok(geometry.buttons.every(b=>b.h>=44),JSON.stringify(geometry.buttons));
   await p.screenshot({path:path.join(shots,tag+"-3-judges.png")});
   assert.equal(await p.evaluate(()=>localStorage.getItem("princess:outfits")),wardrobe,"show never rewrites the wardrobe");
   // Result photo goes to the existing album, once.
   await show.getByRole("button",{name:"📸 앨범에 넣기",exact:true}).click();
   await show.getByRole("button",{name:"✓ 앨범에 넣었어요",exact:true}).waitFor({timeout:20000});
   const album=await p.evaluate(()=>JSON.parse(localStorage.getItem("princess:album")||"[]"));
   assert.equal(album.length,albumBefore+1);assert.match(album[0].name,/패션쇼/);assert.match(album[0].src,/^data:image\/jpeg;base64,/);
   assert.equal(await show.getByRole("button",{name:"✓ 앨범에 넣었어요",exact:true}).isDisabled(),true);
   // Replay with the skip button finishes immediately and keeps the trophy.
   await show.getByRole("button",{name:"🔁 한 번 더 걷기",exact:true}).click();
   await show.getByRole("button",{name:"⏩ 빨리 보기",exact:true}).click();
   await show.locator(".fs-result").waitFor({state:"visible",timeout:3000});
   assert.equal(await show.getByRole("button",{name:"📸 앨범에 넣기",exact:true}).isDisabled(),false,"new show can be saved again");
   await show.getByRole("button",{name:"🏆 진열장",exact:true}).click();
   await pick.waitFor({state:"visible"});
   assert.equal(await pick.locator(`[data-shelf="${run.theme}"]`).getAttribute("class"),"fs-slot is-trophy");
   assert.match(await pick.locator(".fs-shelf-note").innerText(),/황금 트로피 1/);
   if(run.viewport.width<1000)await p.screenshot({path:path.join(shots,tag+"-4-shelf.png")});
   await pick.getByRole("button",{name:"닫기",exact:true}).click();
   // Album shows the new photo next to old ones.
   await p.locator("#btnAlbum").click();assert.equal(await p.locator("#albumGrid .shot img").count(),album.length);
   await p.locator("#albumClose").click();
   // Reload keeps the current theme bar and the shelf; ✕ ends the theme.
   await p.reload();await bar.waitFor({state:"visible"});assert.match(await bar.innerText(),new RegExp(await p.evaluate(id=>PrincessFashion.theme(id).title,run.theme)));
   const shelf=await p.evaluate(()=>PrincessFashion.readShelf(localStorage));assert.equal(shelf.themes[run.theme].perfect,true);assert.equal(shelf.themes[run.theme].count,2);
   // A plain outfit on another theme is still praised (ribbon, ≥9 stars).
   await p.evaluate(()=>{localStorage.setItem("princess:fashion:v1",JSON.stringify({...PrincessFashion.readShelf(localStorage),current:"hanok"}));});
   await p.reload();await bar.waitFor({state:"visible"});
   await choose("crown",await p.evaluate(()=>PrincessFashion.suggestions("crown","starry")[0]));
   await bar.getByRole("button",{name:"무대로! 🎤",exact:true}).click();
   await show.getByRole("button",{name:"⏩ 빨리 보기",exact:true}).click();
   await show.locator(".fs-result").waitFor({state:"visible",timeout:3000});
   const stars=await show.locator(".fs-judge").evaluateAll(n=>n.map(x=>+x.dataset.stars));
   assert.ok(stars.every(s=>s>=3),String(stars));assert.equal(await show.locator(".fs-result").getAttribute("data-award"),stars.reduce((a,b)=>a+b,0)===15?"trophy":"ribbon");
   await show.getByRole("button",{name:"👗 옷 바꾸기",exact:true}).click();
   await bar.getByRole("button",{name:"패션쇼 그만하기"}).click();assert.equal(await bar.isVisible(),false);
   await p.reload();await p.locator("#stage > svg").waitFor();assert.equal(await bar.isVisible(),false);
   assert.deepEqual(errors,[]);await context.close();console.log("PASS",tag,run.theme,"theme card, real dressing, runway, 3 judges 15★ trophy, album photo, skip, shelf, reload, generous ribbon");
  }
  console.log("SCREENSHOTS",shots);
 }finally{await browser.close();if(server.listening){server.closeAllConnections();await new Promise(r=>server.close(r));}}
})().catch(e=>{console.error(e);process.exitCode=1;if(server.listening)server.close();});
