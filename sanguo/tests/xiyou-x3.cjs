// Reproducible X3 integration. Hooks are injected only into locally served test responses.
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const {chromium}=require('playwright'),{createServer}=require('../preview-server.cjs');
const source=fs.readFileSync(path.join(__dirname,'../src/game/sideScroller.js'),'utf8');
const marker='  function loop(now) {';
assert.ok(source.includes(marker));
const hook=[
 'globalThis.__x3={player,input,beginAttack,update,render,finish,heroTuning,heroAssets,horse,',
 'supportsMount,supportsRanged,supportsMountedRanged,rangedStyle,rangedUsesBase,mountKind,isFireWheelMount,',
 'get arrows(){return arrows;},get enemies(){return enemies;},get effects(){return effects;},get afterimages(){return afterimages;},get dust(){return dust;},',
 "prepare(n=1){enemies=[];arrows=[];enemyArrows=[];shockwaves=[];wave=n-1;player.x=330;player.lane=0;player.facing=1;player.hp=player.maxHp;player.rage=100;player.mounted=false;player.action='idle';player.actionUntil=0;player.invulnerableUntil=Infinity;horse.active=false;horse.mounted=false;spawnWave();effects=[];impacts=[];afterimages=[];dust=[];floatingTexts=[];}};",
 "for(const key of Object.keys(audio))if(typeof audio[key]==='function')audio[key]=()=>{};",
].join('\n');
const instrumented=source.replace(marker,hook+marker).replace('function loop(now) {','function loop(now) { return;');
(async()=>{
 const {WORK_STAGES,WORK_STATS}=await import('../src/data/works.js');
 assert.ok(WORK_STAGES.flamemountain.heroes.includes('honghaier'));
 assert.deepEqual({hp:WORK_STATS.honghaier.hp,power:WORK_STATS.honghaier.power,speed:WORK_STATS.honghaier.speed,range:WORK_STATS.honghaier.range},{hp:110,power:23,speed:4.3,range:102});
 const sw=fs.readFileSync(path.join(__dirname,'../../sw.js'),'utf8');
 const art=['honghaier','honghaier-bow','mount-fenghuolun','mounted-nezha','mounted-nezha-bow'];
 for(const id of art){const file='sanguo/art/side-scroller/'+id+'-painted-sheet-v1.png';assert.ok(fs.statSync(path.join(__dirname,'../..',file)).size>1000,file);assert.ok(sw.includes('"./'+file+'"'),file+' offline');}
 const server=createServer();await new Promise(r=>server.listen(0,'127.0.0.1',r));let browser;
 const output=process.env.XIYOU_QA_OUTPUT;if(output)fs.mkdirSync(output,{recursive:true});
 try{
  browser=await chromium.launch({headless:true,args:['--disable-gpu-vsync','--disable-frame-rate-limit']});
  const origin='http://127.0.0.1:'+server.address().port;
  for(const [width,height]of [[1180,820],[768,1024],[390,844]]){
   const context=await browser.newContext({viewport:{width,height},hasTouch:true}),page=await context.newPage(),errors=[];
   page.on('pageerror',e=>errors.push(e.message));await page.goto(origin);await page.locator('[data-work=xiyou]').click();
   if(width<=680)await page.locator('.cm-stage-toggle').click();
   await page.locator('[data-stage=flamemountain]').click();
   const card=page.locator('[data-hero=honghaier]');assert.ok(await card.isEnabled(),'X3 Honghaier unlocked');
   await card.click();assert.ok(await page.locator('#menu-deploy').isEnabled());
   await card.locator('.cm-portrait').evaluate(async el=>{const image=new Image();image.src=el.style.backgroundImage.slice(5,-2);await image.decode();});
   assert.ok(await page.evaluate(()=>{const e=document.querySelector('.command-menu');return e.scrollWidth<=e.clientWidth+1;}),'menu width '+width);
   if(output)await page.screenshot({path:path.join(output,'x3-menu-'+width+'.png'),fullPage:true});
   await page.locator('#menu-deploy').click();await page.waitForSelector('#story-begin');assert.match(await page.locator('.story-screen').innerText(),/홍해아/);
   await page.locator('#story-back').click();assert.equal(await card.getAttribute('aria-pressed'),'true');assert.deepEqual(errors,[]);
   console.log('PASS X3 menu '+width+'x'+height);await context.close();
  }
  async function battle(hero,stage,check){
   const context=await browser.newContext({viewport:{width:640,height:400},hasTouch:true}),page=await context.newPage(),errors=[],bad=[];
   page.on('pageerror',e=>errors.push(e.message));page.on('response',r=>{if(r.status()>=400)bad.push(r.status()+' '+r.url());});
   await page.route('**/src/game/sideScroller.js',r=>r.fulfill({contentType:'text/javascript',body:instrumented}));
   await page.goto(origin);await page.waitForSelector('.cm-hero');
   await page.evaluate(async({hero,stage})=>{document.getElementById('ui').innerHTML='';const {startSideBattle}=await import('./src/game/sideScroller.js');await startSideBattle(hero,stage);},{hero,stage});
   const result=await page.evaluate(check);
   assert.deepEqual(errors,[]);assert.deepEqual(bad,[]);
   return {context,page,result};
  }
  {
   const {context,page,result}=await battle('honghaier','flamemountain',()=>{
    const b=__x3,p=b.player,check=(v,m)=>{if(!v)throw Error(m);};let now=performance.now()+2000;
    check(!b.supportsMount,'Honghaier has no mount');check(b.supportsRanged&&b.rangedStyle==='fire'&&!b.rangedUsesBase,'dedicated fire action');
    check(b.heroAssets.hero.src.includes('/honghaier-painted-')&&b.heroAssets.heroBow.src.includes('/honghaier-bow-painted-'),'player art distinct from boss');
    const shot={};
    for(const charged of [false,true]){
     b.prepare(1);const target=b.enemies[0];for(const e of b.enemies)if(e!==target)e.deadAt=now;
     Object.assign(target,{x:650,lane:0,hp:1000,attackAt:Infinity,hitUntil:Infinity});now+=2000;b.beginAttack('ranged',now,{charged});now+=360;b.update(0,now);
     check(b.arrows.at(-1)?.kind==='samadhi','fire projectile');check(b.arrows.at(-1)?.charged===charged,'charge state');
     for(let i=0;i<30&&target.hp===1000;i++){now+=17;b.update(.017,now);}check(target.hp<1000,'fire hit');shot[charged?'hold':'tap']=1000-target.hp;
    }
    const hits={};
    for(const action of ['dash','special','musou']){
     b.prepare(1);const target=b.enemies[0];for(const e of b.enemies)if(e!==target)e.deadAt=now;
     Object.assign(target,{x:430,lane:0,hp:1000,attackAt:Infinity,hitUntil:Infinity});Object.assign(p,{x:330,lane:0,actionUntil:0,dashReady:0,rage:100});now+=2000;b.beginAttack(action,now);
     if(['special','musou'].includes(action))check(b.effects.some(e=>e.kind==='samadhi'),action+' fire cone');
     for(let i=0;i<45;i++){now+=17;b.update(.017,now);}check(target.hp<1000,action+' hit');hits[action]=1000-target.hp;
    }
    return {shot,hits,rangedStyle:b.rangedStyle};
   });
   assert.match(await page.locator('[data-touch-action=ranged]').innerText(),/화염탄/);
   if(output){await page.evaluate(()=>{const b=__x3,n=performance.now()+2000;b.prepare(1);b.beginAttack('ranged',n,{charged:true});b.update(0,n+360);b.render(n+380);});await page.screenshot({path:path.join(output,'x3-honghaier-fire.png')});}
   console.log(JSON.stringify({hero:'honghaier',...result}));await context.close();
  }
  {
   const {context,page,result}=await battle('nezha','shituoling',()=>{
    const b=__x3,p=b.player,check=(v,m)=>{if(!v)throw Error(m);};let now=performance.now()+2000;
    check(b.supportsMount&&b.supportsMountedRanged&&b.mountKind==='wheels'&&b.isFireWheelMount,'Fenghuolun mount');
    check(b.heroAssets.mounted.src.includes('mounted-nezha-painted')&&b.heroAssets.mountedBow.src.includes('mounted-nezha-bow-painted'),'mounted sheets');
    b.prepare(1);const target=b.enemies[0];for(const e of b.enemies)if(e!==target)e.deadAt=now;
    Object.assign(target,{x:430,lane:0,hp:1000,attackAt:Infinity,hitUntil:Infinity});Object.assign(p,{mounted:true,x:330,lane:0,actionUntil:0});Object.assign(b.horse,{active:true,mounted:true,x:330,lane:0});b.beginAttack('mountedThrust',now);
    for(let i=0;i<40;i++){now+=17;b.update(.017,now);}check(target.hp<1000,'mounted melee hit');const melee=1000-target.hp;
    b.prepare(1);Object.assign(p,{mounted:true,actionUntil:0});Object.assign(b.horse,{active:true,mounted:true,x:330,lane:0});now+=2000;b.beginAttack('ranged',now,{charged:true});now+=360;b.update(0,now);check(b.arrows.at(-1)?.kind==='ring','mounted ring');
    return {melee,mountKind:b.mountKind,mountedRanged:b.supportsMountedRanged};
   });
   assert.match(await page.locator('[data-touch-action=ranged]').innerText(),/건곤권/);assert.match(await page.locator('[data-touch-action=mount]').innerText(),/풍화륜/);assert.ok(await page.locator('[data-touch-action=mount]').isEnabled());
   if(output){await page.evaluate(()=>{const b=__x3,n=performance.now()+2000;b.prepare(1);Object.assign(b.player,{mounted:true,actionUntil:0});Object.assign(b.horse,{active:true,mounted:true,x:b.player.x,lane:b.player.lane});b.beginAttack('ranged',n,{charged:true});b.render(n+310);});await page.screenshot({path:path.join(output,'x3-nezha-fenghuolun.png')});}
   console.log(JSON.stringify({hero:'nezha',...result}));await context.close();
  }
  {
   const {context,page,result}=await battle('wukong','huaguoshan',()=>{
    const b=__x3,p=b.player;let now=performance.now()+2000;b.prepare(1);b.beginAttack('special',now);const special=b.afterimages.filter(g=>g.clone).length;
    b.prepare(1);Object.assign(p,{rage:100,actionUntil:0});now+=2000;b.beginAttack('musou',now);const musou=b.afterimages.filter(g=>g.clone).length;b.render(now+160);
    if(special!==4||musou!==6)throw Error('clone counts '+special+'/'+musou);return {specialClones:special,musouClones:musou};
   });
   if(output)await page.screenshot({path:path.join(output,'x3-wukong-clones.png')});
   console.log(JSON.stringify({hero:'wukong',...result}));await context.close();
  }
 }finally{await browser?.close();server.closeAllConnections();await new Promise(r=>server.close(r));}
 console.log('PASS X3 Honghaier, Fenghuolun, clone and Samadhi effects');
})().catch(e=>{console.error(e);process.exitCode=1;});
