const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const {chromium}=require('playwright'),{createServer}=require('../preview-server.cjs');
const source=fs.readFileSync(path.join(__dirname,'../src/game/sideScroller.js'),'utf8');
const hook=`
  let qaNow=performance.now()+1000,qaDraws=[];
  const qaDrawImage=ctx.drawImage.bind(ctx);
  ctx.drawImage=(...args)=>{if(args[0]?.src)qaDraws.push({src:args[0].src,dest:args.slice(5)});return qaDrawImage(...args);};
  for(const key of Object.keys(audio))if(typeof audio[key]==='function')audio[key]=()=>{};
  globalThis.__mountQA={
    player,horse,beginAttack,input,supportsMount,supportsRanged,supportsMountedRanged,usesConsistentMount,
    step(seconds=.017){qaNow+=seconds*1000;update(seconds,qaNow);},
    render(){qaDraws=[];render(qaNow);return qaDraws.filter(d=>/\\/mount-[^/]+\\.png$/.test(d.src));},
    setup(){for(const e of enemies)e.deadAt=qaNow;const e=enemies[0];Object.assign(e,{deadAt:0,hp:10000,maxHp:10000,x:player.x+300,lane:0,hitUntil:Infinity,attackAt:Infinity,speed:0});player.invulnerableUntil=Infinity;player.actionUntil=0;player.lane=0;horse.x=player.x+80;horse.lane=0;horse.active=true;return e.hp;},
    target(distance=300){const e=enemies[0];e.x=player.x+distance;e.lane=player.lane;e.hitUntil=Infinity;e.attackAt=Infinity;return e.hp;},
    hp(){return enemies[0].hp;},arrows(){return arrows.map(a=>({charged:a.charged,damage:a.damage}));},
    resetPose(){player.action='idle';player.actionUntil=0;player.invulnerableUntil=0;},
    pose(action){player.actionUntil=0;beginAttack(action,qaNow);qaNow+=300;},
  };
`;
const instrumented=source.replace('  function loop(now) {',hook+'  function loop(now) { return;');
(async()=>{
 const server=createServer();await new Promise(r=>server.listen(0,'127.0.0.1',r));let browser;
 const output=process.env.MOUNT_QA_OUTPUT||path.resolve(__dirname,'../qa-mount');fs.mkdirSync(output,{recursive:true});
 try{
  browser=await chromium.launch({headless:true});
  for(const [hero,stage]of [['guanyu','hulao'],['zhaoyun','changban'],['caocao','guandu'],['machao','dongguan']]){
   const context=await browser.newContext({viewport:{width:960,height:600},hasTouch:true}),page=await context.newPage(),errors=[];
   page.on('pageerror',e=>errors.push(e.message));
   await page.route('**/src/game/sideScroller.js',r=>r.fulfill({contentType:'text/javascript',body:instrumented}));
   await page.goto('http://127.0.0.1:'+server.address().port);await page.waitForSelector('.cm-hero');
   await page.evaluate(async({hero,stage})=>{document.getElementById('ui').innerHTML='';await(await import('./src/game/sideScroller.js')).startSideBattle(hero,stage);__mountQA.setup();},{hero,stage});
   assert.deepEqual(await page.evaluate(()=>{const q=__mountQA;return[q.supportsRanged,q.supportsMount,q.supportsMountedRanged,q.usesConsistentMount];}),[true,true,true,true]);
   for(const action of ['mount','ranged'])assert.equal(await page.locator('[data-touch-action='+action+']').evaluate(e=>e.classList.contains('unavailable')),false);
   const advance=async()=>page.evaluate(()=>{for(let i=0;i<48;i++)__mountQA.step();});
   const shoot=async charged=>{
    const before=await page.evaluate(()=>__mountQA.target());
    if(charged){await page.keyboard.down('k');await page.waitForTimeout(280);await page.evaluate(()=>__mountQA.step(.001));await page.keyboard.up('k');}
    else{await page.keyboard.press('k');await page.evaluate(()=>__mountQA.step(.001));}
    assert.equal(await page.evaluate(()=>__mountQA.player.action),'ranged');
    await advance();const damage=before-await page.evaluate(()=>__mountQA.hp());assert.ok(damage>0,hero+' projectile damage');return damage;
   };
   const foot={tap:await shoot(false),hold:await shoot(true)};assert.ok(foot.hold>foot.tap);
   await page.evaluate(()=>__mountQA.resetPose());
   const standing=await page.evaluate(()=>__mountQA.render());
   await page.screenshot({path:path.join(output,hero+'-standing.png')});
   await page.keyboard.press('f');await page.evaluate(()=>__mountQA.step(.001));
   assert.equal(await page.evaluate(()=>__mountQA.player.mounted),true);
   const riding=await page.evaluate(()=>__mountQA.render());
   await page.screenshot({path:path.join(output,hero+'-mounted.png')});
   const mounted={tap:await shoot(false),hold:await shoot(true)};assert.ok(mounted.hold>mounted.tap);
   const meleeHp=await page.evaluate(()=>__mountQA.target(180));
   await page.keyboard.press('j');await page.evaluate(()=>__mountQA.step(.001));
   assert.equal(await page.evaluate(()=>__mountQA.player.action),'mountedThrust');
   await advance();const mountedMelee=meleeHp-await page.evaluate(()=>__mountQA.hp());assert.ok(mountedMelee>0);
   const dashHp=await page.evaluate(()=>__mountQA.target(180));
   await page.keyboard.press('i');await page.evaluate(()=>__mountQA.step(.001));
   assert.equal(await page.evaluate(()=>__mountQA.player.action),'dash');
   await advance();const mountedDash=dashHp-await page.evaluate(()=>__mountQA.hp());assert.ok(mountedDash>0);
   // Let the real 240 ms dash afterimages expire before comparing idle/bow poses.
   await advance();
   await page.evaluate(()=>{__mountQA.resetPose();__mountQA.pose('ranged');});
   const archery=await page.evaluate(()=>__mountQA.render());
   await page.screenshot({path:path.join(output,hero+'-mounted-bow.png')});
   for(const draws of [standing,riding,archery]){
    assert.equal(draws.length,1,hero+' one horse only');
    assert.ok(draws[0].src.endsWith('/mount-'+hero+'-painted-sheet-v1.png'));
    assert.equal(draws[0].dest[3],standing[0].dest[3],'same horse height');
   }
   await advance();await page.keyboard.press('f');await page.evaluate(()=>__mountQA.step(.001));
   assert.equal(await page.evaluate(()=>__mountQA.player.mounted),false);
   // Touch buttons follow the same mount/ranged dispatch as keyboard.
   await page.locator('[data-touch-action=mount]').tap();await page.evaluate(()=>__mountQA.step(.001));
   assert.equal(await page.evaluate(()=>__mountQA.player.mounted),true);
   await page.locator('[data-touch-action=ranged]').tap();await page.evaluate(()=>__mountQA.step(.001));
   assert.equal(await page.evaluate(()=>__mountQA.player.action),'ranged');
   assert.deepEqual(errors,[]);console.log(JSON.stringify({hero,foot,mounted,mountedMelee,mountedDash,sameHorse:true,touch:true,errors}));
   await context.close();
  }
 }finally{await browser?.close();server.closeAllConnections();await new Promise(r=>server.close(r));}
})().catch(e=>{console.error(e);process.exitCode=1;});
