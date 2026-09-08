/* Run with Node + Playwright. Instrumentation is injected into HTTP responses only. */
'use strict';
const fs=require('node:fs'),path=require('node:path'),http=require('node:http'),assert=require('node:assert/strict'),vm=require('node:vm'),cp=require('node:child_process');
const {chromium}=require('playwright');
const root=path.resolve(__dirname,'..'),site=path.resolve(root,'..');
const source=fs.readFileSync(path.join(root,'index.html'),'utf8').replace(/\r\n/g,'\n');
const baseline=cp.execFileSync('git',['show','acec123:odyssey/index.html'],{cwd:site,encoding:'utf8',maxBuffer:4*1024*1024}).replace(/\r\n/g,'\n');
function moduleCode(html,name){const start=html.indexOf('/* src/'+name+' */');assert.ok(start>=0,name);return html.slice(start,html.indexOf('</script>',start));}
function runnerEnv(html,hard){
 const held=new Set(),press=new Set(),W={time:0,input:{held:k=>held.has(k),buffered:k=>press.has(k),consume:k=>press.delete(k)}};
 const F={makeSquash:()=>({sx:1,sy:1,vx:0,vy:0}),damp:(a,b,k,dt)=>a+(b-a)*(1-Math.exp(-k*dt)),clamp:(x,a,b)=>Math.max(a,Math.min(b,x)),squash:(s,x,y)=>{s.sx=x;s.sy=y},updSquash(){}};
 const ODY={E:W,Feel:F},ctx=vm.createContext({ODY,window:{ODY},Math});vm.runInContext(moduleCode(html,'stages/runner-controller.js'),ctx);
 const p=new ODY.RunnerController({hard});
 return {p,held,press,step(dt=1/60){W.time+=dt;p.update(dt,350,true);press.clear();}};
}
function runnerTests(){
 const a=runnerEnv(baseline,false),b=runnerEnv(source,false);
 for(let i=0;i<5000;i++){
  for(const env of [a,b]){env.held.clear();if(i%77<24)env.held.add('jump');if(i%97<30)env.held.add('down');if(i%121<50)env.held.add('left');if(i%77===0)env.press.add('jump');env.step();}
  for(const k of ['x','y','vy','grounded','runPhase','coyote','xOffset','landTime'])assert.equal(b.p[k],a.p[k],'normal frame '+i+' '+k);
 }
 const h=runnerEnv(source,true);h.press.add('down');h.held.add('down');h.step();assert.equal(h.p.sliding,true);
 for(let i=0;i<90;i++)h.step();assert.equal(h.p.sliding,false,'no infinite held slide');
 h.held.clear();h.press.add('down');h.step();assert.equal(h.p.sliding,true);h.press.add('jump');h.held.add('jump');h.step();assert.equal(h.p.sliding,false);assert.equal(h.p.grounded,false);
 h.held.clear();h.held.add('down');for(let i=0;i<90&&!h.p.grounded;i++)h.step();assert.equal(h.p.sliding,true,'landing with down');
 function level(html,hard){const ODY={};const c=vm.createContext({window:{ODY},ODY,Math});vm.runInContext(moduleCode(html,'stages/cyclops-level.js'),c);return ODY.Levels.cyclops.build({hard});}
 const old=level(baseline,false),normal=level(source,false),hard=level(source,true);
 assert.equal(JSON.stringify(normal),JSON.stringify(old),'normal level unchanged');
 assert.equal(hard.hazards.filter(h=>h.type==='hang').length,7);
 for(const h of hard.hazards.filter(h=>h.type==='hang'))assert.ok(!hard.restZones.some(z=>h.x>=z.from&&h.x<=z.to),'hand inside rest');
 console.log('PASS normal runner 5000-frame parity, normal data, slide duration/jump/landing, rest zones');
}
function instrument(html){
 html=html.replaceAll('requestAnimationFrame(frame);','window.__drawFrame=frame;');
 const marker='/* src/stages/cyclops.js */',start=html.indexOf(marker),end=html.indexOf('</script>',start);let stage=html.slice(start,end);
 stage=stage.replace('    return {\n      debug: {',
 "    window.__stageQA={player,level,hit,updateWorld,updateHazards,collectStar,updateCheckpoints,resumeFromRescue,triggerClear,makeView,jumpButton,slideButton:typeof slideButton==='undefined'?null:slideButton,pauseGame,resumeFromPause,\n"+
 "      get lead(){return typeof lead==='undefined'?null:lead},get state(){return state},get dist(){return dist},get combo(){return combo},get hearts(){return hearts},get assistTarget(){return assistTarget},\n"+
 "      setup(v={}){state=v.state||'run';stateTime=0;dist=v.dist??4000;if(typeof lead!=='undefined')lead=v.lead??62;currentSpeed=v.speed??350;hitSlow=v.hitSlow??1;player.reset();player.invin=v.invin??0;},\n"+
 "      setLead(v){lead=v},setDist(v){dist=v},setStars(v){starsGot=v},get speed(){return currentSpeed}};\n    return {\n      debug: {");
 html=html.slice(0,start)+stage+html.slice(end);
 html=html.replace('  ODY.Progress = {','  window.__appQA={startCyclops,showAdventureSelect,loadProgress,showTitle};\n  ODY.Progress = {');
 return html;
}
(async()=>{
 runnerTests();
 for(const m of source.matchAll(/<script[^>]*>([\s\S]*?)<\/script>/g))new vm.Script(m[1]);
 const errors=[],server=http.createServer((req,res)=>{res.setHeader('Content-Type','text/html; charset=utf-8');res.end(source);});
 await new Promise(r=>server.listen(0,'127.0.0.1',r));let browser;
 try{
  browser=await chromium.launch({headless:true});
  const context=await browser.newContext({viewport:{width:1180,height:820},hasTouch:true,deviceScaleFactor:1});
  const page=await context.newPage();page.on('pageerror',e=>errors.push(e.message));
  await page.route('**/*',async route=>{if(route.request().resourceType()==='document')await route.fulfill({body:instrument(source),contentType:'text/html'});else await route.continue();});
  await page.goto('http://127.0.0.1:'+server.address().port+'/');
  const result=await page.evaluate(()=>{
    const results=[];const check=(b,s)=>{if(!b)throw Error(s);results.push(s)};
    function tick(n=1){for(let i=0;i<n;i++){ODY.E.time+=1/60;ODY.E.scene.update(1/60,1/60);ODY.Feel.update(1/60,1/60);}}
    function start(){__appQA.startCyclops({hard:true});const q=window.__stageQA;q.setup();ODY.E.input.clearAll();return q;}
    function buttons(){const labels=[],f=ODY.UI.Button.prototype.draw;ODY.UI.Button.prototype.draw=function(){labels.push(this.label)};ODY.E.scene.draw(document.getElementById('game').getContext('2d'));ODY.UI.Button.prototype.draw=f;return labels;}
    localStorage.removeItem('ody_progress');__appQA.showAdventureSelect(null);check(!buttons().some(s=>s.includes('어려운 길')),'hard hidden before clear');
    const v2={version:2,wisdom:1,stages:{cyclops:{cleared:true,bestStars:23}}};localStorage.setItem('ody_progress',JSON.stringify(v2));
    __appQA.showAdventureSelect(null);let labels=buttons();check(labels[1].includes('어려운 길'),'hard keyboard order');check(JSON.parse(localStorage.getItem('ody_progress')).version===3,'v2 migrated');
    ODY.E.time+=1;ODY.E.scene.update(1,1);ODY.E.input.press('right');ODY.E.scene.update(.016,.016);ODY.E.input.press('ok');ODY.E.scene.update(.016,.016);
    check(document.getElementById('game').getAttribute('aria-label').includes('어려운 길'),'keyboard hard entry');
    let q=start();let h=q.level.hazards.find(h=>h.type==='hang'&&!h.demo);
    q.setDist(h.x-q.player.x);q.updateHazards(0);check(q.lead===36,'standing hit -26');
    q=start();h=q.level.hazards.find(h=>h.type==='hang'&&!h.demo);q.setDist(h.x-q.player.x);q.player.startSlide();q.updateHazards(0);check(q.lead===62,'slide avoids hand');
    q=start();h=q.level.hazards.find(h=>h.type==='hang'&&!h.demo);q.setDist(h.x-q.player.x);q.player.y-=160;q.player.grounded=false;q.updateHazards(0);check(q.lead===36,'jump cannot avoid hand');
    q=start();h=q.level.hazards.find(h=>h.demo);q.setDist(h.x-q.player.x);q.updateHazards(0);check(q.lead===62&&h.dead,'demo harmless');
    q=start();q.setLead(0);q.updateWorld(1/60);check(q.state==='rescue','zero lead rescues');q.resumeFromRescue();check(q.lead===62&&q.state==='return','rescue resets lead');
    q=start();let prev=q.lead;for(let i=0;i<4;i++)q.collectStar({drawX:200,drawY:300});check(Math.abs(q.lead-prev-8.8)<.001,'combo bonus exactly once at third');
    q=start();q.setLead(40);q.setDist(q.level.checkpoints[1]);q.updateCheckpoints();check(q.lead===70,'checkpoint restores lead');
    q=start();q.setup({state:'intro'});prev=q.lead;tick(30);check(q.lead===prev,'no lead regen in intro');
    q=start();q.pauseGame();prev=q.lead;tick(30);check(q.lead===prev,'pause freezes lead');q.resumeFromPause();
    q=start();q.player.invin=0;const s=ODY.E.scene;
    s.pointer('down',q.jumpButton.x,q.jumpButton.y,41);s.pointer('down',q.slideButton.x,q.slideButton.y,42);
    s.pointer('up',q.slideButton.x,q.slideButton.y,42);check(ODY.E.input.held('jump')&&!ODY.E.input.held('down'),'slide up does not steal jump');
    s.pointer('down',q.slideButton.x,q.slideButton.y,43);s.pointer('cancel',NaN,NaN,41);check(!ODY.E.input.held('jump')&&ODY.E.input.held('down'),'jump cancel does not steal slide');
    s.pointer('cancel',NaN,NaN,43);check(!ODY.E.input.held('down'),'slide cancel released');
    q=start();for(let i=0;i<3;i++){q.player.invin=0;q.hit({group:'거인의 손'});}check(q.assistTarget>=.9&&q.assistTarget<1,'assist survives hard');
    const normalized=ODY.Progress.normalize(v2);check(normalized.stages.cyclops.bestStars===23,'v2 stars preserved');
    const hard=ODY.Progress.applyStageResult(v2,'cyclops',40,{hard:true,lead:71});
    check(hard.wisdom===1&&hard.stages.cyclops.hardCleared&&hard.stages.cyclops.bestLead===71,'hard result does not add wisdom');
    check(JSON.stringify(ODY.Progress.unlockedStageIds(v2))===JSON.stringify(ODY.Progress.unlockedStageIds(hard)),'unlocks unchanged');
    const replay=ODY.Progress.applyStageResult(hard,'cyclops',2);check(replay.stages.cyclops.hardCleared&&replay.stages.cyclops.bestLead===71,'normal replay preserves hard record');
    for(const data of [null,[],{},false,{stages:{cyclops:null}},{stages:{cyclops:[]}}, {wisdom:'oops',stages:{cyclops:{bestStars:'bad',bestLead:-2}}}])check(ODY.Progress.normalize(data).version===3,'corrupt data safe');
    localStorage.setItem('ody_progress','broken JSON');check(__appQA.loadProgress().version===3,'broken JSON safe');
    localStorage.setItem('ody_progress',JSON.stringify(v2));q=start();q.setLead(71);q.triggerClear();tick(120);
    const saved=JSON.parse(localStorage.getItem('ody_progress'));check(saved.stages.cyclops.hardCleared&&saved.wisdom===1,'actual clear saves hard record');
    __appQA.showAdventureSelect('cyclops');check(buttons().some(s=>s.includes('어려운 길 ✓')),'completed hard label');
    q=start();q.setup({lead:62,dist:2000});q.level.hazards.length=0;q.level.drops.length=0;q.level.stars.length=0;q.hit({group:'test'});for(let i=0;i<6;i++)q.updateWorld(1/60);check(q.lead<36,'hit slowdown causes extra chase loss');
    q=start();q.setup({lead:12});ODY.E.scene.draw(document.getElementById('game').getContext('2d'));
    return results;
  });
  console.log('PASS browser: '+result.join(', '));
  const corridor=await page.evaluate(()=>{
    const results=[];ODY.Snd.muted()||ODY.Snd.toggleMute();
    for(const dt of [1/60,1/30])for(const speed of [320,360,395]){
      let success=null;
      search:for(let jumpGap=80;jumpGap<=200;jumpGap+=10)for(const hold of [0,.04,.08,.12,.16,.2]){
        __appQA.startCyclops({hard:true});const q=__stageQA,rockX=11340;
        const handData=q.level.hazards.find(h=>h.type==='hang'&&h.x>11340&&h.x<11720);
        q.setup({dist:rockX-q.player.x-250,speed});q.level.drops.length=0;q.level.hazards.length=0;
        const rock={x:rockX,type:'drop',w:31,h:56,group:'낙하 바위',hit:false};
        const hand={...handData,hit:false,dead:false};q.level.hazards.push(rock,hand);
        ODY.E.input.clearAll();let elapsed=0,jumpedAt=null,slid=false;
        for(let i=0;i<200;i++){
          ODY.E.time+=dt;elapsed+=dt;const gap=rock.x-q.dist-q.player.x;
          if(jumpedAt===null&&gap<=jumpGap){ODY.E.input.setHeld('jump',true);jumpedAt=elapsed;}
          if(jumpedAt!==null&&elapsed-jumpedAt>=hold){ODY.E.input.setHeld('jump',false);ODY.E.input.setHeld('down',true);}
          q.player.update(dt,speed,true);q.setDist(q.dist+speed*dt);q.updateHazards(dt);
          slid=slid||q.player.sliding;
          if(rock.hit||hand.hit)break;
          if(hand.x-q.dist<q.player.x-hand.w-20){if(slid){success={dt,speed,jumpGap,hold,hand:hand.x};break search;}break;}
        }
      }
      if(!success)throw Error('No jump-slide corridor: '+dt+' '+speed);results.push(success);
    }return results;
  });
  console.log('PASS connected drop → hand at 30/60fps: '+JSON.stringify(corridor));
  await page.emulateMedia({reducedMotion:'reduce'});await page.reload();
  const accessibility=await page.evaluate(()=>{
    localStorage.setItem('ody_progress',JSON.stringify({version:3,wisdom:1,stages:{cyclops:{cleared:true,bestStars:1}}}));
    __appQA.startCyclops({hard:true});const q=__stageQA;q.setup({lead:20,dist:3500});q.level.hazards.length=0;q.level.drops.length=0;q.level.stars.length=0;
    let sounds=0,shakes=0,announcements=0;
    const warning=ODY.Snd.chaseRoar,shake=ODY.Feel.addShake,announce=ODY.UI.announce;
    ODY.Snd.chaseRoar=()=>sounds++;ODY.Feel.addShake=()=>shakes++;ODY.UI.announce=()=>announcements++;
    if(!ODY.Snd.muted())ODY.Snd.toggleMute();
    q.updateWorld(0);q.updateWorld(0);
    const mutedSounds=sounds;if(ODY.Snd.muted())ODY.Snd.toggleMute();
    for(let i=0;i<220;i++){q.setLead(20);q.updateWorld(1/60);}
    ODY.Snd.chaseRoar=warning;ODY.Feel.addShake=shake;ODY.UI.announce=announce;
    return {mutedSounds,sounds,shakes,announcements};
  });
  assert.equal(accessibility.mutedSounds,0);assert.ok(accessibility.sounds>=1);assert.equal(accessibility.shakes,0);assert.equal(accessibility.announcements,1);
  console.log('PASS mute, reduced-motion, one-shot low-lead announcement');
  await page.emulateMedia({reducedMotion:'no-preference'});
  if(process.env.ODY_QA_OUTPUT){
    fs.mkdirSync(process.env.ODY_QA_OUTPUT,{recursive:true});
    await page.evaluate(()=>{__appQA.showAdventureSelect(null);const now=performance.now();for(let i=0;i<60;i++)window.__drawFrame(now+i*17)});
    await page.screenshot({path:path.join(process.env.ODY_QA_OUTPUT,'hard-entry.png')});
    await page.evaluate(()=>{__appQA.startCyclops({hard:true});const q=__stageQA;q.setup({dist:5020-q.player.x,lead:20});q.player.startSlide();window.__drawFrame(performance.now()+1550)});
    await page.screenshot({path:path.join(process.env.ODY_QA_OUTPUT,'hard-slide.png')});
  }
  // Normal full-stage parity against the pre-change bundle, same input stream.
  async function runNormal(html){
    await page.route('**/*',async route=>{if(route.request().resourceType()==='document')await route.fulfill({body:instrument(html),contentType:'text/html'});else await route.continue();});
    await page.reload();
    return page.evaluate(()=>{
      __appQA.startCyclops();const rows=[];let q=__stageQA;
      for(let i=0;i<4600;i++){ODY.E.time+=1/60;
        ODY.E.input.setHeld('jump',i%50<12);ODY.E.input.setHeld('down',i%113<18);
        if(q.state==='rescue')q.resumeFromRescue();
        ODY.E.scene.update(1/60,1/60);ODY.Feel.update(1/60,1/60);
        if(i%10===0)rows.push([q.state,q.dist,q.speed,q.hearts,q.player.x,q.player.y]);
        if(q.state==='clear')break;
      }
      return rows;
    });
  }
  const oldFrames=await runNormal(baseline),newFrames=await runNormal(source);assert.deepEqual(newFrames,oldFrames,'normal stage frame parity');
  console.log('PASS normal stage '+newFrames.length+' sampled frames identical');
  assert.deepEqual(errors,[]);
  await context.close();
  console.log('PASS hardmode-smoke: zero page errors');
 }finally{await browser?.close();server.closeAllConnections();await new Promise(r=>server.close(r));}
})().catch(e=>{console.error(e);process.exitCode=1;});
