"use strict";
// Isolated local browser QA. Fixtures/forced results are ONLY in this test,
// never shipped as game controls. Real engine balance is checked separately.
const {chromium} = require("playwright");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const http = require("node:http");
const path = require("node:path");
const os = require("node:os");
const C = require("../js/campaign.js");
const root = path.resolve(__dirname, "../..");
const output = fs.mkdtempSync(path.join(os.tmpdir(), "campaign-s3-"));
const mime = {".html":"text/html", ".js":"application/javascript", ".css":"text/css", ".json":"application/json", ".webp":"image/webp", ".png":"image/png", ".mp3":"audio/mpeg", ".wav":"audio/wav", ".svg":"image/svg+xml"};
const server = http.createServer((req,res) => {
  let pathname;
  try {pathname = decodeURIComponent(new URL(req.url, "http://local").pathname);} catch (_) {res.writeHead(400); return res.end();}
  const file = path.resolve(root, "." + pathname + (pathname.endsWith("/") ? "index.html" : ""));
  if (!file.startsWith(root + path.sep)) {res.writeHead(403); return res.end();}
  fs.readFile(file,(error, data) => {
    res.writeHead(error ? 404 : 200, {"Content-Type": mime[path.extname(file)] || "application/octet-stream"});
    res.end(error ? "not found" : data);
  });
});
function afterPrologue() {
  let p = C.finishIntro(C.createProgress());
  p = C.beginBattle(p,"jaei"); p = C.finishBattle(p,p.battleSerial,"player");
  return C.finishChapter(p);
}
async function main() {
  await new Promise(resolve => server.listen(0,"127.0.0.1",resolve));
  const base = "http://127.0.0.1:" + server.address().port;
  const browser = await chromium.launch({headless:true,channel:"msedge"});
  async function open(viewport, progress, storageBlocked = false) {
    const context = await browser.newContext({viewport, serviceWorkers:"block", reducedMotion:"reduce"});
    await context.addInitScript(({progress,storageBlocked}) => {
      if (progress && !sessionStorage.getItem("seeded")) {localStorage.setItem("card_campaign",JSON.stringify(progress));sessionStorage.setItem("seeded","1");}
      if (storageBlocked) Object.defineProperty(Storage.prototype,"setItem",{value(){throw Error("blocked QA storage");}});
      let engine;
      Object.defineProperty(window,"CardEngine",{configurable:true,get:()=>engine,set(value) {
        engine = {...value,createGame(...args) {const state=value.createGame(...args);window.__testGame=state;return state;},
          performAction(...args) {const state=value.performAction(...args);if(window.__testWinner)state.winner=window.__testWinner;window.__testGame=state;return state;}};
      }});
    },{progress,storageBlocked});
    const page = await context.newPage();
    page.setDefaultTimeout(15000);
    await page.clock.install();
    const errors=[]; page.on("pageerror",error=>errors.push(String(error)));
    await page.goto(base+"/cards/");
    await page.waitForFunction(()=>document.querySelectorAll(".card-gallery-item").length===85);
    return {context,page,errors};
  }
  async function advanceScene(page) {
    const scene=page.locator(".expedition-scene");
    const key=await scene.getAttribute("data-scene-key");
    for(let i=0;i<10 && await scene.count() && await scene.getAttribute("data-scene-key")===key;i++)
      await scene.locator(".primary-button").click();
    assert.ok(!await scene.count() || await scene.getAttribute("data-scene-key")!==key);
  }
  async function mapContinue(page) {
    await page.locator("#campaignButton").click();
    await page.locator(".expedition-map-footer .primary-button").click();
  }
  async function noHorizontalOverflow(page) {
    assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1),"no horizontal overflow");
  }
  async function checkFamilyGate(page, id, name, answer = false) {
    assert.equal(await page.locator("#storyGateButton").innerText(),"문제 열기");
    assert.doesNotMatch(await page.locator("#storyGateStatus").innerText(),/새로운 이야기|들으면/);
    const before=await page.evaluate(()=>({hp:__testGame.sides.player.hp,stars:__testGame.sides.player.stars,turn:__testGame.turnNumber}));
    await page.locator("#storyGateButton").click();
    assert.ok(await page.locator("#storyQuizDialog").isVisible());
    assert.ok(!await page.locator("#lockedDialog").isVisible());
    assert.equal(await page.locator("#storyQuizTitle").innerText(),name+" 카드 관문");
    if(answer) {
      const label=await page.evaluate(id=>{
        const question=CardStoryGates.all.find(q=>q.cardId===id && q.prompt===document.getElementById("storyQuizQuestion").textContent);
        return question.choices.find(c=>c.id===question.correctChoiceId).text;
      },id);
      await page.locator("#storyQuizChoices button").filter({hasText:label}).click();
      assert.ok(await page.evaluate(()=>__testGame.sides.player.flags.ultimateUnlocked));
      assert.deepEqual(await page.evaluate(()=>({hp:__testGame.sides.player.hp,stars:__testGame.sides.player.stars,turn:__testGame.turnNumber})),before);
      await page.clock.runFor(1000);
    } else await page.locator("[data-quiz-close]").first().click();
    console.log("PASS",id,"expedition card quiz, no listening redirect");
  }
  async function finish(page,winner) {
    await page.evaluate(winner=>window.__testWinner=winner,winner);
    await page.locator("#actionList button:not(:disabled)").last().click();
    for(let i=0;i<8&&!await page.locator("#resultDialog").isVisible();i++) await page.clock.runFor(1000);
    assert.ok(await page.locator("#resultDialog").isVisible(),"result dialog shown");
  }
  try {
    // Fresh prologue, real actions against Jack (no forced winner).
    const fresh=await open({width:820,height:1180});
    const {page}=fresh;
    assert.match(await page.locator('#collectionGrid [data-card-id="jaei"]').getAttribute("class"),/is-locked/);
    await page.locator("#campaignButton").click();
    assert.equal(await page.locator(".expedition-world").count(),8);
    await noHorizontalOverflow(page);
    await page.screenshot({path:path.join(output,"ipad-map.png"),fullPage:true});
    await page.locator(".expedition-map-footer .primary-button").click();
    await advanceScene(page); await advanceScene(page);
    await page.locator('.expedition-deploy [data-card-id="jaei"]').click();
    assert.match(await page.locator("#campaignBattleLabel").innerText(),/0장/);
    await checkFamilyGate(page,"jaei","재이",true);
    for(let i=0;i<30&&!await page.locator("#resultDialog").isVisible();i++) {
      if(await page.locator("#coinDialog").isVisible()) await page.locator("#coinButton").click();
      else if(await page.locator("#actionList button:not(:disabled)").count()) {
        const name=await page.evaluate(()=>{
          const g=window.__testGame;const action=window.CardEngine.chooseAiAction(g,()=>.9);
          return action.type==="attack"?g.sides.player.card.attacks[action.attackIndex].name:null;
        });
        if(name) await page.locator("#actionList button").filter({hasText:name}).click();
        else await page.locator("#actionList button:not(:disabled)").last().click();
      }
      await page.clock.runFor(2500);
    }
    assert.ok(await page.locator("#resultDialog").isVisible(),"real prologue battle finished");
    assert.equal(await page.evaluate(()=>window.__testGame.winner),"player");
    await page.locator("#rematchButton").click(); await advanceScene(page);
    assert.equal(await page.evaluate(()=>JSON.parse(localStorage.card_campaign).chapter),1);
    await page.locator(".expedition-header button").click();
    assert.ok(!await page.locator('#collectionGrid [data-card-id="redhood"]').getAttribute("class").then(v=>v.includes("is-locked")));
    console.log("PASS real prologue battle, restoration, recruitment");
    assert.deepEqual(fresh.errors,[]);await fresh.context.close();

    for(const viewport of [{width:820,height:1180},{width:1180,height:820},{width:390,height:844}]) {
      const run=await open(viewport,afterPrologue());const p=run.page;
      await mapContinue(p);await advanceScene(p);
      assert.equal(await p.locator(".expedition-opponent-chip").count(),4);
      await noHorizontalOverflow(p);
      if(viewport.width>=700) assert.ok(await p.evaluate(()=>document.documentElement.scrollHeight<=innerHeight+2),"tablet party fits viewport");
      await p.screenshot({path:path.join(output,viewport.width+"-party.png"),fullPage:true});
      await p.locator('.expedition-candidates [data-card-id="redhood"]').click();
      await p.locator(".expedition-go").click();
      await noHorizontalOverflow(p);
      await p.locator('.expedition-deploy [data-card-id="taeo"]').click();
      await checkFamilyGate(p,"taeo","태오");
      assert.equal(await p.locator("#actionList button").count(),7);
      await noHorizontalOverflow(p);
      if(viewport.width>=700) {
        const size=await p.evaluate(()=>({height:innerHeight,scroll:document.documentElement.scrollHeight,y:scrollY,
          topbar:{rect:document.querySelector(".topbar").getBoundingClientRect().toJSON(),css:getComputedStyle(document.querySelector(".topbar")).height,body:document.body.className,inline:document.querySelector(".topbar").style.cssText,
            animations:document.querySelector(".topbar").getAnimations().map(a=>a.effect.getKeyframes())},
          outside:[...document.querySelectorAll("body *")].filter(n=>{const r=n.getBoundingClientRect();return r.width&&r.height&&r.bottom>innerHeight;}).map(n=>({tag:n.tagName,id:n.id,class:n.className,bottom:n.getBoundingClientRect().bottom,position:getComputedStyle(n).position})).slice(0,18)}));
        if(size.scroll>size.height+2) console.log("ENTRY OVERFLOW",JSON.stringify(size));
        assert.ok(size.scroll<=size.height+2,"tablet entry animation stays in viewport");
      }
      await p.clock.runFor(1200);
      if(viewport.width>=700) assert.ok(await p.evaluate(()=>document.documentElement.scrollHeight<=innerHeight+2),"tablet battle fits viewport");
      else {
        assert.ok(await p.evaluate(()=>{const n=document.getElementById("actionList");return n.scrollWidth>n.clientWidth && n.scrollHeight<=n.clientHeight+8;}),"seven actions scroll horizontally without clipped rows");
        for(const action of await p.locator("#actionList button").all()) {
          await action.scrollIntoViewIfNeeded();
          assert.ok(await action.evaluate(node=>{const r=node.getBoundingClientRect(),p=node.parentElement.getBoundingClientRect();return r.width>=59&&r.height>=59&&r.left>=p.left-1&&r.right<=p.right+1;}),"every action can be brought into view");
        }
      }
      await p.screenshot({path:path.join(output,viewport.width+"-battle.png"),fullPage:true});
      // Reload an unfinished fight: same opponent, no accidental win/loss.
      await p.reload();await p.waitForFunction(()=>document.querySelectorAll(".card-gallery-item").length===85);
      await mapContinue(p);
      assert.match(await p.locator(".expedition-target h2").innerText(),/늑대/);
      await p.locator('.expedition-deploy [data-card-id="taeo"]').click();
      await finish(p,"enemy");await p.locator("#rematchButton").click();
      assert.ok(await p.locator('.expedition-deploy [data-card-id="taeo"]').isDisabled());
      for(const id of ["jaei","redhood"]) {
        await p.locator('.expedition-deploy [data-card-id="'+id+'"]').click();
        await finish(p,"enemy");await p.locator("#rematchButton").click();
      }
      const state=await p.evaluate(()=>JSON.parse(localStorage.card_campaign));
      assert.equal(state.stage,0);assert.deepEqual(state.resting,[]);assert.equal(state.phase,"intro");
      assert.deepEqual(run.errors,[]);
      console.log("PASS",viewport.width+"x"+viewport.height,"party / 7 actions / reload / resting / full-party retry");
      await run.context.close();
    }
    // Boss scene, corrected combat hint, boosted copy and continuation to S3.
    let boss=C.selectParty(C.finishIntro(afterPrologue()),["jaei","taeo","redhood"]);
    for(let i=0;i<3;i++){boss=C.beginBattle(boss,"jaei");boss=C.finishBattle(boss,boss.battleSerial,"player");}
    const last=await open({width:820,height:1180},boss);const p=last.page;
    await mapContinue(p);
    for(let i=0;i<3;i++) await p.locator(".expedition-scene .primary-button").click();
    assert.match(await p.locator(".expedition-rule-note").innerText(),/땅 → 물/);
    await p.screenshot({path:path.join(output,"ipad-boss-scene.png"),fullPage:true});
    await p.locator(".expedition-scene .primary-button").click();
    await p.locator('.expedition-deploy [data-card-id="jaei"]').click();
    assert.equal(await p.evaluate(()=>window.__testGame.sides.enemy.card.hp),110);
    assert.equal(await p.evaluate(()=>window.__testGame.aiMistakeRate),0);
    await finish(p,"player");await p.locator("#rematchButton").click();await advanceScene(p);
    assert.equal(await p.locator(".expedition-world:not(:disabled)").count(),1);
    assert.match(await p.locator(".expedition-map-footer").innerText(),/옛이야기/);
    const saved=await p.evaluate(()=>JSON.parse(localStorage.card_campaign));
    assert.deepEqual(saved.recruited,["redhood","cinderella"]);assert.equal(saved.ending,0);
    await p.locator(".expedition-header button").click();
    await p.locator('#collectionGrid [data-card-id="cinderella"]').click();
    assert.ok(await p.locator("#cardDetailDialog").isVisible(),"campaign recruit unlocked without listening");
    await p.locator("#detailSelectButton").click();
    assert.ok(await p.locator("#campaignBattleLabel").isHidden());
    assert.equal(await p.evaluate(()=>window.__testGame.aiMistakeRate),.3);
    assert.equal(await p.locator("#storyGateButton").innerText(),"이야기 듣기");
    await p.locator("#storyGateButton").click();
    assert.ok(await p.locator("#lockedDialog").isVisible(),"ordinary unlistened story still requires listening");
    assert.ok(!await p.locator("#storyQuizDialog").isVisible());
    assert.deepEqual(last.errors,[]);await last.context.close();
    console.log("PASS boss copy / chapter two continuation / recruit unlock / ordinary battle preserved");
    const blocked=await open({width:390,height:844},null,true);
    await mapContinue(blocked.page);await advanceScene(blocked.page);
    assert.ok(await blocked.page.locator("#campaignSaveNotice").isVisible());
    assert.deepEqual(blocked.errors,[]);await blocked.context.close();
    console.log("PASS blocked storage remains playable with visible warning");
    // Actual UI traversal through all 29 encounters. Forced wins are a QA-only
    // engine wrapper; production battle balance is tested by campaign-balance.
    for(const viewport of [{width:820,height:1180},{width:1180,height:820},{width:390,height:844}]) {
      const run=await open(viewport);const q=run.page;
      await q.locator('#collectionGrid [data-card-id="sseugumi"]').click();
      assert.match(await q.locator("#cardDetailStatus").innerText(),/원정을 끝까지/);
      assert.ok(await q.locator("#detailUnlockLink").isHidden());
      assert.ok(await q.locator("#detailSelectButton").isDisabled());
      await q.locator("[data-detail-close]").first().click();
      await q.locator("#campaignButton").click();
      let fights=0,reloaded=false;
      for(let step=0;step<280;step++){
        const state=await q.evaluate(()=>JSON.parse(localStorage.getItem("card_campaign")||"null"));
        if(state && state.phase==="complete")break;
        if(state && state.chapter===7 && state.phase==="restore"){
          assert.equal(state.ending,0);assert.ok(!state.recruited.includes("sseugumi"));
          if(state.endingScene===2 && !reloaded){
            await q.reload();await q.waitForFunction(()=>document.querySelectorAll(".card-gallery-item").length===85);
            assert.match(await q.locator('#collectionGrid [data-card-id="sseugumi"]').getAttribute("class"),/is-locked/);
            await mapContinue(q);reloaded=true;
            await q.waitForFunction(()=>{const images=[...document.querySelectorAll(".is-family-ending img")];return images.length===4&&images.every(n=>n.complete&&n.naturalWidth>0);});
            assert.deepEqual(await q.locator(".is-family-ending img").evaluateAll(ns=>ns.map(n=>new URL(n.src).pathname)),["/cards/art/appa.webp","/cards/art/eomma.webp","/cards/art/jaei.webp","/cards/art/taeo.webp"]);
            await q.screenshot({path:path.join(output,viewport.width+"-family-ending.png"),fullPage:true});
          }
        }
        if(await q.locator(".expedition-scene").isVisible()){
          await noHorizontalOverflow(q);
          assert.ok(await q.locator(".expedition-scene-lines p").count()<=2,"two paragraphs per page");
          const controls=await q.locator(".expedition-page-controls").boundingBox();
          assert.ok(controls && controls.y>=0 && controls.y+controls.height<=viewport.height+1,
            "story controls stay visible: "+JSON.stringify({viewport,state,controls}));
          if((await q.locator(".expedition-scene").getAttribute("data-scene-key")).startsWith("0:0:intro:") && await q.locator(".expedition-scene").getAttribute("data-page")==="1")
            await q.screenshot({path:path.join(output,viewport.width+"-rainbow-story.png")});
          await q.waitForFunction(()=>[...document.querySelectorAll(".expedition-scene img")].every(n=>n.complete&&n.naturalWidth>0));
          await q.locator(".expedition-scene .primary-button").click();
        }else if(await q.locator(".expedition-go").isVisible()){
          for(const id of ["jaei","taeo","redhood"]){
            const card=q.locator('.expedition-candidates [data-card-id="'+id+'"]');
            if(await card.getAttribute("aria-pressed")==="false")await card.click();
          }
          await q.locator(".expedition-go").click();
        }else if(await q.locator(".expedition-deploy").isVisible()){
          await q.locator(".expedition-deploy button:not(:disabled)").first().click();
        }else if(await q.locator("#battleScreen").isVisible()){
          await finish(q,"player");fights++;
          await q.locator("#rematchButton").click();
        }else await q.locator(".expedition-map-footer .primary-button").click();
      }
      const state=await q.evaluate(()=>JSON.parse(localStorage.card_campaign));
      assert.equal(state.phase,"complete");assert.equal(state.ending,1);assert.equal(fights,29);
      assert.equal(state.recruited.filter(id=>id==="sseugumi").length,1);assert.ok(reloaded);
      assert.equal(await q.locator(".expedition-world:not(:disabled)").count(),0);
      console.log("CHECK S3 free battle",viewport);
      await q.screenshot({path:path.join(output,viewport.width+"-complete.png"),fullPage:true});
      await q.locator(".expedition-map-footer .primary-button").click();
      await q.locator('#collectionGrid [data-card-id="sseugumi"]').click();
      assert.ok(await q.locator("#cardDetailDialog").isVisible());
      await q.locator("#detailSelectButton").click();
      assert.equal(await q.evaluate(()=>__testGame.sides.player.card.id),"sseugumi");
      assert.equal(await q.evaluate(()=>__testGame.sides.player.card.hp),100);
      assert.deepEqual(await q.evaluate(()=>__testGame.sides.player.card.attacks.map(a=>a.dmg)),[20,10,30,60]);
      assert.equal(await q.locator('#playerCardSlot .story-card').count(),1);
      assert.equal(await q.locator('#playerCardSlot .frame-crest, #playerCardSlot .element-rune').count(),0);
      assert.equal(await q.locator("#actionList button").count(),7);
      assert.equal(await q.locator("#storyGateButton").innerText(),"문제 열기");
      assert.deepEqual(run.errors,[]);
      console.log("PASS S3",viewport,"29 battles, 4 ending scenes, reload, recruitment, free battle");
      await run.context.close();
    }
    console.log("SCREENSHOTS",output);
  } finally {await browser.close();server.closeAllConnections();await new Promise(resolve=>server.close(resolve));}
}
main().catch(error=>{console.error(error);process.exitCode=1;server.close();});
