"use strict";
const {chromium}=require("playwright"),assert=require("node:assert/strict"),fs=require("node:fs"),http=require("node:http"),path=require("node:path"),os=require("node:os");
const root=path.resolve(__dirname,"../.."),output=fs.mkdtempSync(path.join(os.tmpdir(),"card-review-"));
const server=http.createServer((req,res)=>{
 const p=decodeURIComponent(new URL(req.url,"http://local").pathname),file=path.resolve(root,"."+p+(p.endsWith("/")?"index.html":""));
 if(!file.startsWith(root+path.sep)){res.writeHead(403);return res.end();}
 fs.readFile(file,(e,d)=>{res.writeHead(e?404:200,{"Content-Type":({".html":"text/html; charset=utf-8",".js":"application/javascript",".css":"text/css",".json":"application/json",".png":"image/png",".webp":"image/webp"})[path.extname(file)]||"application/octet-stream"});res.end(e?"missing":d);});
});
(async()=>{
 await new Promise(r=>server.listen(0,"127.0.0.1",r));const b=await chromium.launch({channel:"msedge",headless:true}),base="http://127.0.0.1:"+server.address().port;
 try{
  for(const viewport of [{width:390,height:844},{width:820,height:1180},{width:1180,height:820},{width:768,height:1024},{width:1024,height:768}]){
   const context=await b.newContext({viewport,serviceWorkers:"block",reducedMotion:"reduce"}),page=await context.newPage(),errors=[];
   page.on("pageerror",e=>errors.push(String(e)));
   await page.goto(base+"/cards/?preview=all&card=sherlockholmes&battle=1");
   await page.waitForSelector("#playerCardSlot .card-name");
   await page.locator("#playerCardSlot img").evaluate(async i=>{await i.decode();await new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r)));});
   await page.screenshot({path:path.join(output,viewport.width+"-sherlock.png")});
   const failures=await page.evaluate(async()=>{
    const data=await(await fetch("cards.json")).json(),slot=document.getElementById("playerCardSlot"),saved=[...slot.childNodes],bad=[];
    for(const card of data.cards){
     slot.replaceChildren(CardView.create(card,{compact:true,eager:true}));
     const el=slot.querySelector(".story-card"),r=el.getBoundingClientRect(),hp=el.querySelector(".hp-gem").getBoundingClientRect();
     const rails=[...el.querySelectorAll(".frame-corner")].flatMap(c=>{
      const b=c.getBoundingClientRect(),s=getComputedStyle(c),strips=[];
      if(parseFloat(s.borderLeftWidth))strips.push({left:b.left,right:b.left+parseFloat(s.borderLeftWidth),top:b.top,bottom:b.bottom});
      if(parseFloat(s.borderRightWidth))strips.push({left:b.right-parseFloat(s.borderRightWidth),right:b.right,top:b.top,bottom:b.bottom});
      return strips;
     });
     for(const n of el.querySelectorAll(".card-name,.combat-fact > strong,.combat-fact > span")){
      const range=document.createRange();range.selectNodeContents(n);const rects=[...range.getClientRects()];
      for(const t of rects)if(t.width&&(t.left<r.left+13||t.right>r.right-13||t.top<r.top||t.bottom>r.bottom))bad.push({id:card.id,text:n.textContent,r:r.toJSON(),t:t.toJSON()});
      if(rects.some(t=>rails.some(b=>t.left<b.right&&t.right>b.left&&t.top<b.bottom&&t.bottom>b.top)))bad.push({id:card.id,text:n.textContent,cornerOverlap:true});
      if(n.classList.contains("card-name")&&rects.some(t=>t.right>hp.left-3))bad.push({id:card.id,overlapsHP:true});
     }
    }
    slot.replaceChildren(...saved);return bad;
   });
   assert.deepEqual(failures,[],"text stays inside frame: "+viewport.width);
   assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1));
   if(viewport.width>=681)assert.ok(await page.evaluate(()=>document.documentElement.scrollHeight<=innerHeight+1),"tablet needs no document scroll");
   await page.goto(base+"/cards/?preview=all&card=jaewing&battle=1");
   await page.locator("#playerCardSlot img").evaluate(async i=>{await i.decode();await new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r)));});
   await page.screenshot({path:path.join(output,viewport.width+"-jaewing.png")});
   assert.deepEqual(errors,[]);await context.close();console.log("PASS",viewport,"all 85 names and numeric rows fit");
  }
  const context=await b.newContext({viewport:{width:820,height:1180},serviceWorkers:"block"});
  await context.addInitScript(()=>{
   let gates,engine;window.__roll=.999;window.__gateActions=[];
   Object.defineProperty(window,"CardStoryGates",{get:()=>gates,set(value){gates={...value,getForCard(){return JSON.parse(JSON.stringify(value.all.find(q=>q.id==="taeo-belt")));},shuffleChoices(choices){return value.shuffleChoices(choices,()=>window.__roll);}};}});
   Object.defineProperty(window,"CardEngine",{get:()=>engine,set(value){engine={...value,performAction(s,a,...rest){window.__gateActions.push(a);return value.performAction(s,a,...rest);}};}});
  });
  const p=await context.newPage(),positions=new Set();
  for(const roll of [0,.4,.999]){
   await p.goto(base+"/cards/?preview=all&card=taeo&battle=1");await p.waitForSelector("#storyGateButton");
   await p.evaluate(r=>{window.__roll=r},roll);await p.locator("#storyGateButton").click();
   const texts=await p.locator("#storyQuizChoices button").allTextContents();
   const correct="파란 바탕에 초록 줄이 있는 띠";positions.add(texts.indexOf(correct));
   assert.equal(new Set(texts.map(t=>t.length)).size,1);
   await p.locator("#storyQuizChoices button").filter({hasText:correct}).click();
   assert.ok(await p.evaluate(()=>__gateActions.some(a=>a.type==="story_gate_answer"&&a.choiceId==="blue-green"&&a.correct===true)));
   assert.match(await p.locator("#storyQuizResult").innerText(),/정답/);
  }
  assert.equal(positions.size,3);
  await p.goto(base+"/cards/?preview=all&card=taeo&battle=1");
  await p.locator("#storyGateButton").click();
  const wrong="빨간 바탕에 하얀 줄이 있는 띠";
  await p.locator("#storyQuizChoices button").filter({hasText:wrong}).click();
  await p.waitForFunction(()=>!document.getElementById("storyQuizDialog").open);
  await p.locator("#actionList button").filter({hasText:"방어하기"}).click();
  await p.waitForFunction(()=>!document.getElementById("storyGateButton").disabled);
  await p.evaluate(()=>{window.__roll=0});
  await p.locator("#storyGateButton").click();
  assert.equal(await p.locator("#storyQuizChoices button").filter({hasText:wrong}).isDisabled(),true);
  await p.locator("#storyQuizChoices button").filter({hasText:"파란 바탕에 초록 줄이 있는 띠"}).click();
  assert.match(await p.locator("#storyQuizResult").innerText(),/정답/);
  await context.close();console.log("PASS correct answer works in all three button positions; retry preserves disabled wrong ID after reshuffle");console.log("SCREENSHOTS",output);
 }finally{await b.close();server.closeAllConnections();await new Promise(r=>server.close(r));}
})().catch(e=>{console.error(e);process.exitCode=1;server.close();});
