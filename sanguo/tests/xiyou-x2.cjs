// Reproducible X2 integration. Hooks are injected only into test responses.
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const {chromium}=require('playwright'),{createServer}=require('../preview-server.cjs');
const source=fs.readFileSync(path.join(__dirname,'../src/game/sideScroller.js'),'utf8');
const marker='  function loop(now) {';
assert.ok(source.includes(marker));
const hook=[
 'globalThis.__x2={player,input,beginAttack,resolveAttack,update,render,finish,heroTuning,',
 'supportsMount,supportsRanged,rangedStyle,rangedUsesBase,heroAssets,',
 'bossId,bossLabel,bossProfile,bossSheet,enemyRoster,weaponStyle,',
 'get arrows(){return arrows;},get enemies(){return enemies;},',
 "prepare(n=1){enemies=[];arrows=[];enemyArrows=[];shockwaves=[];wave=n-1;player.x=330;player.lane=0;player.facing=1;player.action='idle';player.actionUntil=0;player.invulnerableUntil=Infinity;spawnWave();effects=[];impacts=[];afterimages=[];dust=[];floatingTexts=[];}};",
 "for(const key of Object.keys(audio))if(typeof audio[key]==='function')audio[key]=()=>{};",
].join('\n');
const instrumented=source.replace(marker,hook+marker).replace('function loop(now) {','function loop(now) { return;');
const expected=[['huaguoshan',1],['donghai',2],['heavenpalace',3],['baihuling',4],['lianhuadong',5],['huoyundong',6],['flamemountain',7],['shituoling',8]];
(async()=>{
 const {WORK_STAGES,WORK_STATS,stagesOfWork}=await import('../src/data/works.js');
 const {SCENES}=await import('../src/game/scenery.js');
 assert.deepEqual(stagesOfWork('xiyou').map(key=>[key,WORK_STAGES[key].chapter]),expected);
 assert.deepEqual(WORK_STAGES.heavenpalace.heroes,['wukong','nezha','erlangshen']);
 assert.equal(WORK_STATS.erlangshen.speed,3.6);assert.equal(WORK_STATS.erlangshen.hp,140);
 const spec=fs.readFileSync(path.join(__dirname,'../DESIGN-XIYOU-EXPANSION.md'),'utf8');
 for(const key of ['lianhuadong','huoyundong','shituoling']){
  for(const field of ['lesson','scene_intro','real','fiction'])assert.ok(spec.includes(WORK_STAGES[key][field]),key+' '+field+' verbatim');
  assert.ok(SCENES[key].layers.length>=3,key+' scenery');
 }
 assert.equal(new Set(['lianhuadong','huoyundong','shituoling'].map(k=>SCENES[k].sky.join())).size,3);
 const sw=fs.readFileSync(path.join(__dirname,'../../sw.js'),'utf8');
 for(const id of ['erlangshen-hero','erlangshen-hero-bow','boss-yinjiao','boss-honghaier','boss-dapeng']){
  const file='sanguo/art/side-scroller/'+id+'-painted-sheet-v1.png';
  assert.ok(fs.existsSync(path.join(__dirname,'../..',file)),file);
  assert.ok(sw.includes('"./'+file+'"'),file+' offline');
 }
 const server=createServer();await new Promise(r=>server.listen(0,'127.0.0.1',r));let browser;
 const output=process.env.XIYOU_QA_OUTPUT;
 if(output)fs.mkdirSync(output,{recursive:true});
 try{
  browser=await chromium.launch({headless:true});
  const origin='http://127.0.0.1:'+server.address().port;
  for(const [width,height]of [[1180,820],[768,1024],[390,844]]){
   const context=await browser.newContext({viewport:{width,height},hasTouch:true});
   const page=await context.newPage();await page.goto(origin);await page.locator('[data-work=xiyou]').click();
   assert.deepEqual(await page.locator('[data-stage]').evaluateAll(es=>es.map(e=>e.dataset.stage)),expected.map(([k])=>k));
   assert.deepEqual(await page.locator('.cm-stage-number').allTextContents(),['01','02','03','04','05','06','07','08']);
   if(width<=680)await page.locator('.cm-stage-toggle').click();
   await page.locator('[data-stage=heavenpalace]').click();
   await page.locator('[data-hero=erlangshen]').click();
   assert.ok(await page.locator('[data-hero=erlangshen]').isEnabled(),'X2 painted hero unlocked');
   assert.ok(await page.locator('#menu-deploy').isEnabled());
   await page.locator('[data-hero=erlangshen] .cm-portrait').evaluate(async el=>{
    const image=new Image();image.src=el.style.backgroundImage.slice(5,-2);await image.decode();
   });
   assert.ok(await page.evaluate(()=>{const e=document.querySelector('.command-menu');return e.scrollWidth<=e.clientWidth+1;}),'menu width '+width);
   if(output)await page.screenshot({path:path.join(output,'menu-'+width+'.png'),fullPage:true});
   await page.locator('#menu-deploy').click();await page.waitForSelector('#story-begin');
   assert.match(await page.locator('.story-screen').innerText(),/이랑진군/);
   await page.locator('#story-back').click();
   assert.equal(await page.locator('[data-hero=erlangshen]').getAttribute('aria-pressed'),'true');
   console.log('PASS X2 menu '+width+'x'+height);await context.close();
  }
  for(const [hero,stage,boss,damage]of [
   ['erlangshen','heavenpalace','erlangshen',null],
   ['wukong','lianhuadong','yinjiao',25],
   ['wukong','huoyundong','honghaier',26],
   ['wukong','shituoling','dapeng',30],
  ]){
   const context=await browser.newContext({viewport:{width:640,height:400},hasTouch:true});
   const page=await context.newPage(),errors=[],bad=[];
   page.on('pageerror',e=>errors.push(e.message));
   page.on('response',r=>{if(r.status()>=400)bad.push(r.status()+' '+r.url());});
   await page.route('**/src/game/sideScroller.js',r=>r.fulfill({contentType:'text/javascript',body:instrumented}));
   await page.goto(origin);await page.waitForSelector('.cm-hero');
   await page.evaluate(async({hero,stage})=>{
    document.getElementById('ui').innerHTML='';
    const {startSideBattle}=await import('./src/game/sideScroller.js');await startSideBattle(hero,stage);
   },{hero,stage});
   const result=await page.evaluate(({hero,boss,damage})=>{
    const b=__x2,p=b.player,check=(v,m)=>{if(!v)throw Error(m);};
    check(b.bossId===boss,'boss identity');if(damage)check(b.bossProfile.damage===damage,'boss damage');
    check(b.bossSheet.src.includes('boss-'+boss+'-painted'),'dedicated boss sheet');
    b.prepare(7);check(b.enemies.some(e=>e.trueBoss&&e.bossId===boss),'final wave boss spawn');
    if(hero==='erlangshen'){
     check(!b.supportsMount,'Erlang has no mount');
     check(b.supportsRanged&&b.rangedStyle==='bow'&&!b.rangedUsesBase,'dedicated pellet-bow animation');
     check(b.heroAssets.heroBow.src.includes('erlangshen-hero-bow-'),'pellet bow sheet');
     check(b.weaponStyle==='spear','trident spear grammar');
     check(b.heroTuning.reach===118/90,'long reach is not clamped to 1.22');
     let now=performance.now()+2000;const hits={};
     b.input.axis=()=>0;b.input.axisY=()=>0;
     for(const action of ['dash','special','musou']){
      b.prepare(1);const target=b.enemies[0];for(const e of b.enemies)if(e!==target)e.deadAt=now;
      Object.assign(target,{x:430,lane:0,hp:1000,attackAt:Infinity,hitUntil:Infinity});
      Object.assign(p,{x:330,lane:0,actionUntil:0,dashReady:0,rage:100,invulnerableUntil:Infinity});
      now+=2000;b.beginAttack(action,now);
      for(let i=0;i<40;i++){now+=17;b.update(.017,now);}
      check(target.hp<1000,action+' actual damage');hits[action]=1000-target.hp;
     }
     for(const charged of [false,true]){
      b.prepare(1);now+=2000;b.beginAttack('ranged',now,{charged});
      now+=360;b.update(0,now);
      check(b.arrows.at(-1)?.kind==='pellet','pellet rather than arrow');
      check(b.arrows.at(-1)?.charged===charged,'charge state preserved');
     }
     return {hero,boss,hits,reach:b.heroTuning.reach};
    }
    return {hero,boss,damage:b.bossProfile.damage};
   },{hero,boss,damage});
   assert.match(await page.locator('[data-touch-action=ranged]').innerText(),hero==='erlangshen'?/탄궁/:/./);
   if(output){
    await page.evaluate(()=>{const b=__x2;b.prepare(7);const n=performance.now();b.player.invulnerableUntil=0;const boss=b.enemies.find(e=>e.trueBoss);for(const e of b.enemies){e.attackAt=Infinity;if(e!==boss)e.deadAt=n;}boss.x=560;boss.lane=0;b.update(0,n);b.render(n);});
    await page.screenshot({path:path.join(output,stage+'-boss.png')});
   }
   await page.evaluate(()=>__x2.finish(true));await page.waitForSelector('.result-story');
   await page.locator('.result-story summary').click();
   for(const field of ['lesson','real','fiction'])assert.ok((await page.locator('.result-story').innerText()).includes(WORK_STAGES[stage][field]));
   await page.locator('.result-screen').evaluate(e=>{e.scrollTop=0;});
   assert.ok(await page.locator('.result-seal').evaluate(e=>e.getBoundingClientRect().top>=0),'result heading reachable');
   await page.locator('#btn-menu').scrollIntoViewIfNeeded();
   assert.ok(await page.locator('#btn-menu').evaluate(e=>{const r=e.getBoundingClientRect();return r.top>=0&&r.bottom<=innerHeight;}),'result actions reachable after expanding story');
   await page.locator('.result-screen').evaluate(e=>{e.scrollTop=0;});
   if(output)await page.screenshot({path:path.join(output,stage+'-result.png'),fullPage:true});
   assert.deepEqual(errors,[]);assert.deepEqual(bad,[]);
   console.log(JSON.stringify(result));await context.close();
  }
 }finally{await browser?.close();server.closeAllConnections();await new Promise(r=>server.close(r));}
 console.log('PASS X2 data, chapter menu, portraits, boss spawns, Erlang skills, education and asset loading');
})().catch(e=>{console.error(e);process.exitCode=1;});
