// Browser integration, with test-only closure access injected into the served module.
// Production source has no debug API. Simulation uses the real update/attack/AI code.
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const {chromium}=require('playwright');
const {createServer}=require('../preview-server.cjs');
const source=fs.readFileSync(path.join(__dirname,'../src/game/sideScroller.js'),'utf8');
const hook = `
  globalThis.__battle = {
    player, input, beginAttack, resolveAttack, update, render,
    get enemies(){ return enemies; }, get wave(){ return wave; },
    get gate(){ return waveGate; }, get ended(){ return ended; },
    get locked(){ return combatLocked; }, get arrows(){ return arrows; },
    get supportsRanged(){ return supportsRanged; },
    prepare(n,x){ enemies=[]; arrows=[]; enemyArrows=[]; shockwaves=[]; wave=n-1; player.x=x; player.action='idle'; player.actionUntil=0; player.hitDone=true; spawnWave(); },
  };
  for (const key of Object.keys(audio)) if(typeof audio[key]==='function') audio[key]=()=>{};
`;
const marker='  function loop(now) {';
assert.ok(source.includes(marker));
const instrumented=source.replace(marker,hook+marker).replace('function loop(now) {','function loop(now) { return;');
const representativeCases=[
 ['zhaoyun','changban'],['caocao','guandu'],['machao','dongguan'],['huangzhong','dingjunshan'],
 ['xiahoudun','trilands'],['zhangliao','trilands'],['xuchu','trilands'],['simayi','trilands'],
 ['sunquan','trilands'],['taishici','trilands'],['ganning','trilands'],['luxun','trilands'],
];
const rangedHeroes=new Set(['huangzhong','xiahoudun','zhangliao','xuchu','simayi','sunquan','taishici','ganning','luxun']);
(async()=>{
 const server=createServer();await new Promise(r=>server.listen(0,'127.0.0.1',r));let browser;
 try{
  browser=await chromium.launch({headless:true});
  for(const [hero,stage] of representativeCases){
   const ranged=rangedHeroes.has(hero);
   const context=await browser.newContext({viewport:{width:640,height:400}}),page=await context.newPage(),errors=[];
   page.on('pageerror',e=>errors.push(e.message));
   await page.addInitScript(()=>{let seed=20260906;Math.random=()=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed/4294967296;};});
   await page.route('**/src/game/sideScroller.js',r=>r.fulfill({contentType:'text/javascript',body:instrumented}));
   await page.goto('http://127.0.0.1:'+server.address().port);
   await page.waitForSelector('.cm-hero');
   await page.evaluate(async({hero,stage})=>{
    document.getElementById('ui').innerHTML='';
    const {startSideBattle}=await import('./src/game/sideScroller.js');
    await startSideBattle(hero,stage);
   },{hero,stage});
   if(process.env.COMBAT_QA_OUTPUT){
    const output=process.env.COMBAT_QA_OUTPUT;fs.mkdirSync(output,{recursive:true});
    await page.evaluate(()=>{const b=__battle,n=performance.now();b.update(.034,n);b.render(n);});
    await page.screenshot({path:path.join(output,hero+'-battle.png')});
    if(['huangzhong','taishici','luxun'].includes(hero)){
     await page.evaluate(()=>{const b=__battle,n=performance.now()+1000;b.beginAttack('ranged',n);b.render(n+300);});
     await page.screenshot({path:path.join(output,hero+'-bow.png')});
    }
   }
   const result=await page.evaluate(({hero,ranged})=>{
    const b=globalThis.__battle,p=b.player; let now=performance.now()+1000,axis=0,laneAxis=0;
    b.input.axis=()=>axis;b.input.axisY=()=>laneAxis;p.invulnerableUntil=Infinity;
    const check=(ok,message)=>{if(!ok)throw Error(hero+': '+message);};
    const tick=(dt=0)=>{now+=Math.max(1,dt*1000);b.update(dt,now);
     for(const e of b.enemies.filter(e=>!e.deadAt)){
      check(e.x>=170&&e.x<=b.gate,'enemy outside gate '+e.x+'/'+b.gate);
      e.attackAt=Infinity;
     }
    };
    // Exact former failure: archer stands 390px past player-only gate.
    b.prepare(5,330);
    const archer=b.enemies.find(e=>e.role==='archer');
    for(const e of b.enemies)if(e!==archer)e.deadAt=now;
    p.x=b.gate;p.lane=0;archer.x=b.gate+390;archer.lane=0;archer.attackAt=Infinity;
    tick();check(archer.x<=b.gate,'outside archer must recover');
    p.x=archer.x-90;p.facing=1;const before=archer.hp;
    b.beginAttack('attack',now);now+=p.actionDuration*.6;tick();
    check(archer.hp<before,'recovered archer must take melee damage');
    const recoveredDamage=before-archer.hp;
    // Symmetric left edge + repeated high-power knockback.
    archer.x=-200;archer.deadAt=0;archer.hp=1000;tick();
    check(archer.x>=170,'left enemy recovered');
    p.x=archer.x+90;p.facing=-1;p.lane=archer.lane;
    for(let n=0;n<4;n++){now+=1000;b.beginAttack('heavy',now);now+=p.actionDuration*.6;tick();}
    check(archer.x>=170,'heavy knockback stays reachable');
    b.prepare(5,7550);p.actionUntil=0;tick();
    check(b.gate===7560,'last world gate');
    const endTarget=b.enemies[0];endTarget.x=9000;endTarget.lane=0;endTarget.attackAt=Infinity;tick();
    p.x=7560;p.lane=0;p.facing=-1;
    const endHp=endTarget.hp;now+=1000;b.beginAttack('attack',now);now+=p.actionDuration*.6;tick();
    check(endTarget.hp<endHp,'enemy at world end must take melee damage');
    let arrowDamage=null;
    if(ranged){
     check(b.supportsRanged,'representative must have a ranged action');
     b.prepare(1,330);const target=b.enemies[0];
     for(const e of b.enemies)if(e!==target)e.deadAt=now;
     Object.assign(target,{x:650,lane:0,hp:1000,attackAt:Infinity,hitUntil:Infinity});
     Object.assign(p,{x:330,lane:0,facing:1,actionUntil:0});
     const fire=charged=>{
      target.x=650;target.lane=0;const hp=target.hp;now+=1000;
      b.beginAttack('ranged',now,{charged});now+=400;tick();
      const shot=b.arrows.at(-1);check(shot&&shot.charged===charged,'arrow charge state');
      for(let i=0;i<30;i++)tick(.017);
      check(target.hp<hp,'arrow must damage target');return hp-target.hp;
     };
     arrowDamage={tap:fire(false),hold:fire(true)};
     check(arrowDamage.hold>arrowDamage.tap,'hold increases actual damage');
    }
    // Natural seven-wave advancement; defeat every unit through actual melee damage.
    b.prepare(1,330);p.lane=0;let attacks=0,moves=0;const waves=[];
    while(!b.ended){
     const wave=b.wave;if(!waves.includes(wave))waves.push(wave);
     const target=b.enemies.find(e=>!e.deadAt);
     if(!target){axis=laneAxis=0;tick(.034);check(moves++<18000,'wave advancement timeout');continue;}
     target.attackAt=Infinity;
     axis=Math.abs(target.x-p.x)>85?Math.sign(target.x-p.x):0;
     laneAxis=Math.abs(target.lane-p.lane)>10?Math.sign(target.lane-p.lane):0;
     if(axis||laneAxis){tick(.034);check(moves++<18000,'approach timeout');continue;}
     p.facing=Math.sign(target.x-p.x)||1;
     now+=p.actionDuration+1;b.beginAttack('attack',now);
     now+=p.actionDuration*.6;tick();attacks++;
     check(attacks<2500,'melee defeat timeout');
    }
    check(p.hp>0,'victory, not defeat');check(waves.length===7,'all seven waves');
    return {hero,recoveredDamage,arrowDamage,waves,attacks,moves,ko:p.ko,win:b.ended&&p.hp>0,ranged:b.supportsRanged};
   },{hero,ranged});
   assert.ok(result.win);assert.deepEqual(result.waves,[1,2,3,4,5,6,7]);
   if(ranged)assert.equal(result.ranged,true);
   assert.deepEqual(errors,[]);console.log(JSON.stringify(result));
   await context.close();
  }
 }finally{await browser?.close();server.closeAllConnections();await new Promise(r=>server.close(r));}
})().catch(e=>{console.error(e);process.exitCode=1;});
