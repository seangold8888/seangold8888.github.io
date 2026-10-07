// End-to-end quick study, reload/return and ticket boundaries. Probes exist only in test responses.
"use strict";
const a=require("node:assert/strict"),fs=require("node:fs"),path=require("node:path"),os=require("node:os"),http=require("node:http");
const {chromium}=require("playwright"),C=require("../math/curriculum.js"),S=require("../math/store.js");
const root=path.resolve(__dirname,".."),output=fs.mkdtempSync(path.join(os.tmpdir(),"math-hub-"));
const mime={".html":"text/html",".js":"text/javascript",".css":"text/css",".json":"application/json",".webp":"image/webp",".png":"image/png",".jpg":"image/jpeg",".svg":"image/svg+xml",".mp3":"audio/mpeg",".wav":"audio/wav"};
const server=http.createServer((req,res)=>{
  const u=new URL(req.url,"http://local"),file=path.resolve(root,"."+decodeURIComponent(u.pathname)+(u.pathname.endsWith("/")?"index.html":""));
  if(!file.startsWith(root+path.sep)){res.writeHead(403).end();return;}
  fs.readFile(file,(err,bytes)=>{
    if(err){res.writeHead(404).end();return;}
    if(file===path.join(root,"math/app.js")){
      let src=bytes.toString().replace(/\r/g,"");const marker="  renderHome();\n  if (hubQuick)";a.ok(src.includes(marker));
      src=src.replace(marker,"  window.__mathProbe=()=>({answer:current&&current.answer,index,length:session&&session.length,run:hubRun,added:hubAdded,pending:state.pending,level:state.level});\n"+marker);bytes=Buffer.from(src);
    }
    if(file===path.join(root,"game/index.html")){
      let src=bytes.toString().replace(/\r/g,"");const marker="  applyState();\n  annotatePlays();";a.ok(src.includes(marker));
      src=src.replace(marker,"  window.__hubProbe=()=>({solved:state.solved,credit:state.credit,correct:setCorrect});\n"+marker);bytes=Buffer.from(src);
    }
    res.writeHead(200,{"Content-Type":mime[path.extname(file)]||"application/octet-stream","Cache-Control":"no-store"}).end(bytes);
  });
});
async function solve(p, wrong=false){
  await p.waitForFunction(()=>window.__mathProbe&&document.body.dataset.screen==="quiz"&&!document.querySelector("#keypad").hidden);
  const before=await p.evaluate(()=>__mathProbe());
  if(wrong){
    await p.locator('#keypad [data-k="9"]').click();await p.locator('#keypad [data-k="9"]').click();await p.locator('#keypad [data-k="go"]').click();
    a.equal(await p.evaluate(()=>__mathProbe().added),before.added,"wrong answer must not earn credit");
    if(await p.locator('#retryBtn').isVisible())await p.locator('#retryBtn').click();
  }
  for(const digit of String(before.answer))await p.locator('#keypad [data-k="'+digit+'"]').click();
  await p.locator('#keypad [data-k="go"]').click();
  await p.waitForFunction(i=>__mathProbe().index===i,before.index+1);
  await p.evaluate(()=>document.querySelector('#keypad [data-k="go"]').click());
  a.equal(await p.evaluate(()=>__mathProbe().index),before.index+1,"duplicate submission ignored");
}
(async()=>{
  if(!process.env.HUB_VERIFY_BASE)await new Promise(r=>server.listen(0,"127.0.0.1",r));
  const base=(process.env.HUB_VERIFY_BASE||"http://127.0.0.1:"+server.address().port).replace(/\/$/,"");
  const browser=await chromium.launch({channel:"msedge",headless:true});
  async function newContext(options){
    const context=await browser.newContext(options);
    if(process.env.HUB_VERIFY_BASE)await context.addInitScript(()=>{
      // Live checks read real checkpoints and DOM; no served code or scoring is replaced.
      window.__mathProbe=()=>{
        const s=JSON.parse(localStorage.getItem("math10_state")||"{}"),p=s.pending,last=(s.history||[]).slice(-1)[0];
        const label=document.getElementById("hubStudyProgress"),added=label&&label.textContent.match(/이번 놀이 \+(\d+)문제/);
        return {answer:p&&p.problems[p.index].answer,index:p?p.index:last?last.count:0,length:p?p.problems.length:last?last.count:null,
          run:p?p.hubRun:"",added:p?p.hubAdded||0:added?Number(added[1]):0,pending:p,level:s.level};
      };
      window.__hubProbe=()=>({solved:Number(localStorage.getItem("hub2_solved")||0),credit:Number(localStorage.getItem("hub2_credit")||0),correct:Number(localStorage.getItem("hub2_solved")||0)%15});
    });
    return context;
  }
  try{
    for(const scene of [{name:"desktop",width:1180,height:820,initial:0},{name:"ipad-ticket",width:820,height:1180,initial:14},{name:"phone-reload",width:390,height:844,initial:0,reload:true}]){
      const context=await newContext({viewport:{width:scene.width,height:scene.height},hasTouch:scene.width<1000,serviceWorkers:"block",reducedMotion:"reduce"});
      await context.addInitScript(s=>{
        if(sessionStorage.getItem("math-hub-seed"))return;sessionStorage.setItem("math-hub-seed","1");
        const d=new Date(),day=d.getFullYear()+"-"+(d.getMonth()+1)+"-"+d.getDate();
        localStorage.setItem("hub2_date",day);localStorage.setItem("hub2_solved",String(s.initial));localStorage.setItem("hub2_credit","0");localStorage.setItem("hub2_parent_mode","0");
        localStorage.setItem("hub_play_timer_force","1");localStorage.setItem("hub_play_pass",JSON.stringify({until:1}));
      },scene);
      const p=await context.newPage(),errors=[],bad=[];p.on("pageerror",e=>errors.push(e.message));p.on("response",r=>{if(r.url().startsWith(base)&&r.status()>=400)bad.push(r.url());});
      await p.goto(base+"/game/");await p.waitForFunction(()=>window.__hubProbe);
      a.equal(await p.locator('#mathPlaygroundLaunch').getAttribute('aria-disabled'),null);
      a.equal(await p.locator('#mathLaunchAction').innerText(),"문제 수 골라 시작 →");
      await p.locator('#mathPlaygroundLaunch').scrollIntoViewIfNeeded();await p.screenshot({path:path.join(output,scene.name+"-entry.png")});
      await p.locator('#mathPlaygroundLaunch').click();await p.locator('#hubChoices').waitFor({state:'visible'});
      a.equal(await p.locator('#setup').isVisible(),false);a.equal(await p.evaluate(()=>__mathProbe().pending),null);
      a.match(await p.locator('#hubStudyLabel').innerText(),new RegExp('남은 '+(15-scene.initial)+'문제'));
      a.equal(await p.evaluate(()=>document.documentElement.scrollWidth>innerWidth+1),false);
      await p.screenshot({path:path.join(output,scene.name+'-choices.png')});
      await p.locator('#hubQuickBtn').click();await p.waitForFunction(()=>window.__mathProbe&&document.body.dataset.screen==="quiz");
      a.equal(await p.evaluate(()=>__mathProbe().length),3);a.equal(await p.locator('#setup').isVisible(),false);
      a.equal(await p.locator('.hub-play-over').count(),0);a.equal(await p.evaluate(()=>document.documentElement.scrollWidth>innerWidth+1),false);
      await p.screenshot({path:path.join(output,scene.name+"-quiz.png")});
      await solve(p,true);
      const run=await p.evaluate(()=>__mathProbe().run);
      if(scene.reload){
        await p.reload();await p.waitForFunction(()=>window.__mathProbe&&__mathProbe().index===1);
        a.equal(await p.evaluate(()=>__mathProbe().run),run);
      }
      await solve(p);await solve(p);await p.waitForFunction(()=>["capsule","result"].includes(document.body.dataset.screen));
      a.match(await p.locator('#hubStudyProgress').innerText(),/이번 놀이 \+3문제/);
      a.equal(await p.evaluate(()=>document.documentElement.scrollWidth>innerWidth+1),false);
      if(await p.locator('#capsule').isVisible())await p.locator('#capsules button').first().click();
      await p.waitForFunction(()=>document.body.dataset.screen==="result");
      await p.screenshot({path:path.join(output,scene.name+"-done.png")});
      await p.locator('#doneBtn').click();await p.waitForURL("**/game/#study");await p.waitForFunction(()=>window.__hubProbe);
      let hub=await p.evaluate(()=>__hubProbe());a.equal(hub.solved,scene.initial+3);a.equal(hub.credit,scene.initial===14?1:0);
      await p.reload();await p.waitForFunction(()=>window.__hubProbe);a.equal(await p.evaluate(()=>__hubProbe().solved),hub.solved,"reload cannot re-import");
      if(scene.initial===14){
        await p.route("**/cards/",r=>r.fulfill({contentType:"text/html",body:"Game entry fixture"}));
        await p.locator('a.card[href="cards/"]').click();await p.waitForURL("**/cards/");
        await p.goto(base+"/game/");await p.waitForFunction(()=>window.__hubProbe);
        a.deepEqual(await p.evaluate(()=>__hubProbe()),{solved:17,credit:0,correct:2});
      }else{
        await p.locator('#mathPlaygroundLaunch').click();await p.locator('#hubQuickBtn').click();await p.waitForFunction(()=>window.__mathProbe&&__mathProbe().index===0);
        a.notEqual(await p.evaluate(()=>__mathProbe().run),run,"new session earns new receipts");
        await solve(p);await p.locator('#quitBtn').click();await p.waitForURL("**/game/#study");await p.waitForFunction(()=>window.__hubProbe);
        a.equal(await p.evaluate(()=>__hubProbe().solved),4);a.equal(await p.locator('#mathLaunchAction').innerText(),"하던 놀이 이어하기 →");
        await p.locator('#mathPlaygroundLaunch').click();await p.waitForFunction(()=>window.__mathProbe&&__mathProbe().index===1);
        await p.locator('#hubStudyLink a').click();await p.waitForURL("**/game/#study");await p.waitForFunction(()=>window.__hubProbe);
        a.equal(await p.evaluate(()=>__hubProbe().solved),4,"unfinished return cannot duplicate an answer");
      }
      a.deepEqual(errors,[]);a.deepEqual(bad,[]);await context.close();console.log("PASS "+scene.name+": unlocked quick entry, wrong/duplicate protection, completion, return and reload");
    }
    for(const scene of [{initial:0,count:15,width:390},{initial:14,count:1,width:820},{initial:17,count:13,width:390},{initial:99,count:1,width:320},{initial:100,count:0,width:390}]){
      const c=await newContext({viewport:{width:scene.width,height:1180},hasTouch:true,serviceWorkers:'block',reducedMotion:'reduce'});
      const p=await c.newPage(),errors=[],bad=[];p.on('pageerror',e=>errors.push(e.message));p.on('response',r=>{if(r.url().startsWith(base)&&r.status()>=400)bad.push(r.url());});
      await p.goto(base+'/game/');await p.evaluate(n=>{const d=new Date(),day=d.getFullYear()+'-'+(d.getMonth()+1)+'-'+d.getDate();localStorage.setItem('hub2_date',day);localStorage.setItem('hub2_solved',String(n));localStorage.setItem('hub2_credit','0');},scene.initial);
      await p.goto(base+'/math/?from=hub');await p.locator('#hubChoices').waitFor({state:'visible'});
      a.equal(await p.evaluate(()=>JSON.parse(localStorage.getItem('math10_state')||'null')),null,'opening choices never modifies math progress');
      a.equal(await p.evaluate(()=>Number(localStorage.getItem('hub2_solved'))),scene.initial);
      for(const id of ['hubStudyBtn','hubQuickBtn','hubAdventureBtn']){const b=await p.locator('#'+id).boundingBox();a.ok(b.height>=44);}
      a.equal(await p.evaluate(()=>document.documentElement.scrollWidth>innerWidth+1),false);
      await p.screenshot({path:path.join(output,'study-'+scene.initial+'-choices.png')});
      if(!scene.count){
        a.equal(await p.locator('#hubStudyBtn').isDisabled(),true);a.equal(await p.locator('#hubQuickBtn').isEnabled(),true);a.equal(await p.locator('#hubAdventureBtn').isEnabled(),true);
        await p.locator('#hubQuickBtn').click();a.equal(await p.evaluate(()=>__mathProbe().length),3);
      }else{
        a.match(await p.locator('#hubStudyLabel').innerText(),new RegExp('남은 '+scene.count+'문제'));
        await p.locator('#hubStudyBtn').click();await p.waitForFunction(()=>document.body.dataset.screen==='quiz');
        a.equal(await p.evaluate(()=>__mathProbe().length),scene.count);
        if(scene.count>1){
          await solve(p,true);a.equal(await p.evaluate(()=>__mathProbe().length),scene.count,'hint cannot append an extra study question');
          const run=await p.evaluate(()=>__mathProbe().run);await p.reload();await p.waitForFunction(()=>document.body.dataset.screen==='quiz');
          a.equal(await p.evaluate(()=>__mathProbe().run),run);a.equal(await p.evaluate(()=>__mathProbe().index),1);
          a.equal(await p.evaluate(()=>__mathProbe().length),scene.count,'reload preserves chosen length');
        }
        while((await p.evaluate(()=>__mathProbe().index))<scene.count)await solve(p);
        await p.waitForFunction(()=>['capsule','result'].includes(document.body.dataset.screen));
        a.match(await p.locator('#hubStudyProgress').innerText(),new RegExp('이번 놀이 \\+'+scene.count+'문제'));
        if(await p.locator('#capsule').isVisible())await p.locator('#capsules button').first().click();
        await p.waitForFunction(()=>document.body.dataset.screen==='result');
        await p.locator('#againBtn').click();await p.locator('#hubChoices').waitFor({state:'visible'});
        a.equal(await p.evaluate(()=>__mathProbe().pending),null);
        await p.locator('#hubStudyLink a').click();await p.waitForURL('**/game/#study');await p.waitForFunction(()=>window.__hubProbe);
        const expected=scene.initial+scene.count;a.equal(await p.evaluate(()=>__hubProbe().solved),expected);
        a.equal(await p.evaluate(()=>__hubProbe().credit),expected<100?1:0);
      }
      a.deepEqual(errors,[]);a.deepEqual(bad,[]);await c.close();console.log('PASS study choice '+scene.initial+' + '+scene.count+': exact round length, hints/reload/return, preserved progress and ticket boundary');
    }
    for(const count of [8,12,16]){
      const c=await newContext({viewport:{width:820,height:1180},serviceWorkers:'block',reducedMotion:'reduce'}),p=await c.newPage();
      await p.goto(base+'/math/?from=hub');await p.evaluate(n=>{const s=MathStore.defaults();s.placed=true;s.perSession=n;s.coins=23;s.level=4;localStorage.setItem('math10_state',JSON.stringify(s));},count);
      await p.reload();await p.locator('#hubAdventureBtn').waitFor();a.match(await p.locator('#hubAdventureLabel').innerText(),new RegExp(count+'문제'));
      await p.locator('#hubAdventureBtn').click();await p.waitForFunction(()=>document.body.dataset.screen==='quiz');
      a.equal(await p.evaluate(()=>__mathProbe().length),count);a.equal(await p.evaluate(()=>JSON.parse(localStorage.getItem('math10_state')).coins),23);a.equal(await p.evaluate(()=>__mathProbe().level),4);
      await c.close();console.log('PASS general adventure follows parent '+count+' questions without altering coins or level');
    }
    const legacy=await newContext({viewport:{width:390,height:844},serviceWorkers:'block',reducedMotion:'reduce'}),lp=await legacy.newPage();
    await lp.goto(base+'/math/?from=hub&quick=1');await lp.waitForFunction(()=>document.body.dataset.screen==='quiz');a.equal(await lp.evaluate(()=>__mathProbe().length),3);await legacy.close();console.log('PASS old quick=1 links remain compatible');
    const context=await newContext({viewport:{width:320,height:720},serviceWorkers:"block"});
    const pending=S.defaults();pending.placed=true;pending.pending={level:1,index:2,results:[{},{}],problems:Array.from({length:12},()=>C.makeProblem(1)),mode:"adventure",firstTry:true};
    const p=await context.newPage();await p.goto(base+"/game/");await p.evaluate(s=>localStorage.setItem("math10_state",JSON.stringify(s)),pending);
    await p.reload();await p.waitForFunction(()=>window.__hubProbe);a.equal(await p.locator('#mathLaunchAction').innerText(),"하던 놀이 이어하기 →");
    await p.locator('#mathPlaygroundLaunch').click();await p.waitForFunction(()=>window.__mathProbe&&document.body.dataset.screen==="quiz");
    a.equal(await p.evaluate(()=>__mathProbe().length),12);a.equal(await p.evaluate(()=>__mathProbe().index),2);
    a.equal(await p.evaluate(()=>document.documentElement.scrollWidth>innerWidth+1),false);await context.close();
    console.log("PASS 320px pending session: 12-question unfinished adventure preserved, no clipping");
    const direct=await newContext({viewport:{width:820,height:1180},serviceWorkers:"block",reducedMotion:"reduce"});
    const q=await direct.newPage(),directErrors=[];q.on("pageerror",e=>directErrors.push(e.message));
    await q.goto(base+"/math/");a.equal(await q.locator('#setup').isVisible(),true);
    a.equal(await q.locator('#hubStudyLink').isVisible(),false);
    await q.locator('#quickSetupBtn').click();await solve(q);await solve(q);await solve(q);
    await q.goto(base+"/game/");await q.waitForFunction(()=>window.__hubProbe);
    a.equal(await q.evaluate(()=>__hubProbe().solved),3);a.deepEqual(directErrors,[]);await direct.close();
    console.log("PASS standalone math: existing welcome flow preserved; three answers count on hub return");
    console.log("SCREENSHOTS "+output);
  }finally{await browser.close();if(server.listening){server.closeAllConnections();await new Promise(r=>server.close(r));}}
})().catch(e=>{console.error(e);process.exitCode=1;});
