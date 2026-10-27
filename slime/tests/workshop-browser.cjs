// Workshop, collection, feeding and splitting with real touches on iPad sizes.
// Needs the site root served at http://127.0.0.1:8765 (python -m http.server 8765).
const{chromium}=require('playwright'),fs=require('node:fs'),os=require('node:os'),path=require('node:path'),assert=require('node:assert/strict');
const out=process.env.SLIME_SHOTS||fs.mkdtempSync(path.join(os.tmpdir(),'slime-workshop17-'));fs.mkdirSync(out,{recursive:true});
const pass=()=>{const d=new Date();return JSON.stringify({free:true,day:d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0')+'-'+String(d.getDate()).padStart(2,'0')});};
(async()=>{const b=await chromium.launch({channel:'msedge',headless:true,args:['--use-angle=swiftshader','--enable-unsafe-swiftshader']});
 try{
  const c=await b.newContext({viewport:{width:1180,height:820},hasTouch:true,serviceWorkers:'block'});
  await c.addInitScript(p=>{if(!sessionStorage.getItem('qa'))localStorage.setItem('hub_play_pass',p);sessionStorage.setItem('qa','1');},pass());
  const p=await c.newPage(),errors=[];p.on('pageerror',e=>errors.push(e.message));p.on('console',e=>{if(e.type()==='error')errors.push(e.text());});
  await p.goto('http://127.0.0.1:8765/slime/?v=workshop-17',{timeout:90000});await p.waitForFunction(()=>!!window.__slime,{},{polling:100,timeout:90000});
  await p.evaluate(()=>{__slime.reset();__slime.advance(.5);});
  const tap=async sel=>{const r=await p.locator(sel).boundingBox();assert.ok(r,sel);await p.touchscreen.tap(r.x+r.width/2,r.y+r.height/2);};
  const inView=sel=>p.locator(sel).evaluate(e=>{const r=e.getBoundingClientRect();return r.left>=0&&r.right<=innerWidth+.5&&r.top>=0&&r.bottom<=innerHeight+.5;});
  // 1. Mix blue + white, add foam: the 바닷물 secret, made with real taps.
  await tap('#shop-button');assert.ok(await p.locator('#workshop').evaluate(d=>d.open));assert.ok(await inView('#workshop'));
  assert.equal(await p.locator('#make-go').isDisabled(),true,'nothing to make from an empty bowl');
  await tap('[data-paint=b]');await tap('[data-paint=w]');await tap('[data-mixin=foam]');
  let bowl=await p.evaluate(()=>__slime.shop.state());assert.equal(bowl.look.secret,'sea');assert.deepEqual(bowl.drops,{r:0,y:0,b:1,w:1,a:0});
  assert.equal(await p.locator('#bowl .blob .foam').count(),7,'foam is visible in the bowl preview');
  await p.waitForTimeout(500);await p.screenshot({path:path.join(out,'01-workshop-ipad-landscape.png')});
  await p.locator('#slime-name').fill('파도');await tap('#make-go');
  assert.equal(await p.locator('#workshop').evaluate(d=>d.open),false);await p.evaluate(()=>__slime.advance(2.5));
  let s=await p.evaluate(()=>({st:__slime.state(),room:__slime.room.slimes,dex:__slime.dex.entries.length,secrets:[...__slime.dex.secrets],foam:__slime.mainMixins.round.count,color:'#'+__slime.mesh.material.color.getHexString()}));
  assert.equal(s.room[0].name,'파도');assert.equal(s.room[0].kind,'recipe');assert.equal(s.dex,1);assert.deepEqual(s.secrets,['sea']);assert.equal(s.foam,16);assert.equal(s.st.slimes,2,'old friend stays in the room');
  assert.equal(s.st.size,.86);assert.equal(await p.locator('.eyebrow').textContent(),'파도 · 나의 젤리 친구');
  console.log('PASS real-touch mixing, 바닷물 secret, foam mix-in on the gel, old friend kept as room-mate');
  // 2. Colour mixing like paint: yellow + blue = green, red + yellow = orange.
  await tap('#shop-button');await tap('[data-paint=y]');await tap('[data-paint=b]');await tap('[data-mixin=beads]');
  bowl=await p.evaluate(()=>__slime.shop.state());assert.equal(bowl.look.secret,'forest');await tap('#make-go');await p.evaluate(()=>__slime.advance(1));
  await tap('#shop-button');await tap('[data-paint=r]');await tap('[data-paint=y]');await tap('[data-mixin=glitter]');
  bowl=await p.evaluate(()=>__slime.shop.state());const rgb=h=>[1,3,5].map(i=>parseInt(h.slice(i,i+2),16));const orange=rgb(bowl.look.color);
  assert.ok(orange[0]>orange[1]&&orange[1]>orange[2],'red + yellow is orange '+bowl.look.color);assert.equal(bowl.look.secret,null);
  await tap('#make-go');await p.evaluate(()=>__slime.advance(1.5));
  const green=await p.evaluate(()=>__slime.dex.entries.find(e=>e.secret==='forest'));assert.ok(green);
  s=await p.evaluate(()=>({glitter:__slime.expression.glitter.value,dex:__slime.dex.entries.length,slimes:__slime.room.slimes.length,beads:__slime.buddies.list.some(b=>b.mixins.round.count===9)}));
  assert.equal(s.glitter,1);assert.equal(s.dex,3);assert.equal(s.slimes,4);assert.ok(s.beads,'forest beads ride along on the room-mate');
  await p.evaluate(()=>{__slime.advance(1.5);__slime.renderOnce();});await p.screenshot({path:path.join(out,'02-room-four-friends.png')});
  console.log('PASS paint mixing (yellow+blue green, red+yellow orange), glitter shader, beads, room of four');
  // 3. 도감: locked silhouettes with hints, made slimes, summon by touch.
  await tap('#shop-button');await tap('#tab-dex');
  assert.equal(await p.locator('#secret-grid .dex-tile').count(),6);assert.equal(await p.locator('#secret-grid .dex-tile.locked').count(),4);
  assert.equal(await p.locator('#secret-grid .dex-tile.locked .dex-name').first().textContent(),'???');assert.ok((await p.locator('#secret-grid .dex-tile.locked small').first().textContent()).length>4);
  assert.equal(await p.locator('#dex-grid .dex-tile').count(),3);assert.equal(await p.locator('#secret-count').textContent(),'2 / 6');assert.equal(await p.locator('#room-count').textContent(),'놀이방 친구 4 / 4');
  assert.ok(await inView('#workshop'));await p.screenshot({path:path.join(out,'03-collection-ipad-landscape.png')});
  await tap('#dex-grid .dex-tile >> nth=0');assert.equal(await p.locator('#workshop').evaluate(d=>d.open),false);
  s=await p.evaluate(()=>({active:__slime.room.active.name,n:__slime.room.slimes.length}));assert.equal(s.active,'파도');assert.equal(s.n,4,'full room: previous friend rests in the collection');
  console.log('PASS collection grid, 4 locked secret silhouettes with hints, summon from 도감');
  // 4. Room full: feeding grows to full size but cannot split; resting room-mates frees space.
  await tap('#food-button');assert.equal(await p.locator('#food-hud').isVisible(),true);assert.ok(await inView('#food-hud'));
  const sizes=[];for(let i=0;i<4;i++){await tap('[data-food=candy]');await p.evaluate(()=>__slime.advance(1.4));sizes.push(await p.evaluate(()=>__slime.state().size));}
  for(let i=1;i<sizes.length;i++)assert.ok(sizes[i]>sizes[i-1],'each snack grows the slime '+sizes);
  s=await p.evaluate(()=>__slime.state());assert.equal(s.fed,6);assert.equal(s.slimes,4);assert.equal(s.splitting,false);assert.equal(await p.locator('#grow-label').textContent(),'다 컸어요!');
  await tap('#shop-button');await tap('#tab-dex');await tap('#room-rest');await tap('#shop-close');assert.equal(await p.evaluate(()=>__slime.room.slimes.length),1);
  console.log('PASS snacks grow the slime (sizes '+sizes.map(x=>x.toFixed(2)).join(' → ')+'), full room blocks a split, rest button clears room-mates');
  // 5. Split: one more snack at full size pops it into two; repeat up to the cap of four.
  await tap('#food-button');if(!(await p.locator('#food-hud').isVisible()))await tap('#food-button');
  for(let n=2;n<=4;n++){
   for(let i=0;i<8&&(await p.evaluate(()=>__slime.room.slimes.length))<n;i++){await tap('[data-food=berry]');await p.evaluate(()=>__slime.advance(1.5));}
   assert.equal(await p.evaluate(()=>__slime.room.slimes.length),n,'split to '+n);
  }
  s=await p.evaluate(()=>({st:__slime.state(),names:__slime.room.slimes.map(x=>x.name),sizes:__slime.buddies.list.map(b=>b.size)}));
  assert.equal(s.st.buddies,3);assert.equal(s.st.size,.72+.07*s.st.fed);assert.deepEqual(s.names,['파도','파도 2','파도 3','파도 4']);
  for(let i=0;i<8;i++){await tap('[data-food=water]');await p.evaluate(()=>__slime.advance(1.4));}
  assert.equal(await p.evaluate(()=>__slime.room.slimes.length),4,'cap holds at four');
  await p.evaluate(()=>__slime.advance(3));
  const spread=await p.evaluate(()=>{const all=[__slime.solver.body,...__slime.buddies.list.map(b=>b.solver.body)];let min=Infinity;for(let i=0;i<all.length;i++)for(let j=i+1;j<all.length;j++)min=Math.min(min,Math.hypot(all[i].x-all[j].x,(all[i].z-all[j].z)*1.25));return min;});
  assert.ok(spread>1.2,'friends do not sink into each other ('+spread.toFixed(2)+')');
  console.log('PASS feed → grow → split into twins up to four friends, cap respected, bodies separated');
  // 6. Tap a room-mate: it becomes the full-detail friend.
  await p.locator('#food-close').click();await p.evaluate(()=>{__slime.advance(.6);__slime.renderOnce();});
  // Room-mates hop on their own: pause that, then touch a point that only a room-mate covers.
  await p.evaluate(()=>{__slime.buddies.list.forEach(b=>b.next=99);__slime.advance(1.5);__slime.renderOnce();});
  const before=await p.evaluate(()=>__slime.room.active.name);let swapped=false;
  const findSpot=()=>p.evaluate(()=>{const S=__slime;for(const b of S.buddies.list){b.group.updateMatrixWorld(true);
   for(const [x,y,z] of [[0,.6,.5],[-.55,.55,.4],[.55,.55,.4],[0,1.1,.3]]){const v=b.group.localToWorld(new S.camera.position.constructor(x*b.size,y*b.size,z*b.size)).project(S.camera);
    const px=(v.x*.5+.5)*innerWidth,py=(-.5*v.y+.5)*innerHeight,h=S.buddies.hit(px,py);
    if(h&&h.buddy===b&&!S.input.probe(px,py)&&document.elementFromPoint(px,py)?.id==='jelly')return{x:px,y:py};}}return null;});
  let spot=await findSpot();
  if(!spot){await p.evaluate(()=>{const S=__slime,b=S.buddies.list[0];b.solver.body.x=S.solver.body.x>0?-S.solver.bounds.x:S.solver.bounds.x;b.solver.body.z=S.solver.body.z;S.advance(.6);S.renderOnce();});spot=await findSpot();}
  assert.ok(spot,'a room-mate is visible somewhere');await p.touchscreen.tap(spot.x,spot.y);swapped=(await p.evaluate(()=>__slime.room.active.name))!==before||(await p.evaluate(()=>__slime.room.slimes[0]!==__slime.room.slimes.find(x=>x.name===before)));
  assert.ok(swapped,'touching a room-mate swaps it in');console.log('PASS real touch on a room-mate swaps it into the main jelly');
  // 7. Performance budget with four slimes (CPU side of one simulated frame).
  const perf=await p.evaluate(()=>{let sim=1e9;for(let k=0;k<6;k++){const t=performance.now();__slime.advance(.5);sim=Math.min(sim,(performance.now()-t)/30);}const r=performance.now();for(let i=0;i<10;i++)__slime.renderOnce();return{sim,render:(performance.now()-r)/10,calls:__slime.renderer.info.render.calls};});
  console.log('Perf with 4 slimes: simulate '+perf.sim.toFixed(2)+' ms/frame, render calls '+perf.calls+' (swiftshader render '+perf.render.toFixed(1)+' ms)');
  assert.ok(perf.calls<110);
  // 8. Lost pointerup: no finger left on the glass releases the drag.
  await p.evaluate(()=>{__slime.input.cancel();__slime.advance(1);});const xy=await p.evaluate(()=>__slime.screen()),cdp=await c.newCDPSession(p);
  await cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x:xy.x,y:xy.y,id:9,radiusX:4,radiusY:4,force:1}]});
  assert.equal(await p.evaluate(()=>__slime.state().grab),true);
  await p.evaluate(()=>window.dispatchEvent(new TouchEvent('touchend',{touches:[],changedTouches:[]})));await p.waitForTimeout(150);
  assert.equal(await p.evaluate(()=>__slime.state().grab),false,'zero touches releases the grab');
  await cdp.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});console.log('PASS zero-finger release of a drag');
  // 9. Persistence across reload.
  await p.reload();await p.waitForFunction(()=>!!window.__slime,{},{polling:100,timeout:90000});
  s=await p.evaluate(()=>({n:__slime.room.slimes.length,buddies:__slime.buddies.list.length,dex:__slime.dex.entries.length,secrets:__slime.dex.secrets.size}));
  assert.deepEqual(s,{n:4,buddies:3,dex:3,secrets:2});console.log('PASS room, collection and secrets survive reload');
  // 10. iPad portrait: everything inside the screen, no sideways scroll.
  await p.setViewportSize({width:820,height:1180});await p.evaluate(()=>{dispatchEvent(new Event('resize'));__slime.advance(2);});
  for(const sel of ['.friend-actions','#palette'])assert.ok(await inView(sel),sel);assert.ok(await p.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));
  await tap('#food-button');assert.ok(await inView('#food-hud'));await tap('[data-food=honey]');await p.evaluate(()=>__slime.advance(.45));await p.evaluate(()=>__slime.renderOnce());
  await p.screenshot({path:path.join(out,'04-ipad-portrait-feeding.png')});await p.evaluate(()=>__slime.advance(1));
  await tap('#shop-button');assert.ok(await inView('#workshop'));await tap('#tab-make');await tap('[data-paint=r]');await tap('[data-paint=b]');await p.waitForTimeout(450);
  await p.screenshot({path:path.join(out,'05-workshop-ipad-portrait.png')});await tap('#shop-close');
  for(const v of [{width:390,height:844},{width:844,height:390}]){await p.setViewportSize(v);await p.evaluate(()=>dispatchEvent(new Event('resize')));
   for(const sel of ['.friend-actions','#food-hud'])assert.ok(await inView(sel),sel+' '+v.width);await tap('#shop-button');assert.ok(await inView('#workshop'),'workshop '+v.width);await tap('#shop-close');}
  console.log('PASS iPad portrait/landscape and phone layouts');
  assert.deepEqual(errors,[]);
  // 11. Storage blocked (private mode): the page still works, nothing is saved.
  const blocked=await b.newContext({viewport:{width:1180,height:820},hasTouch:true,serviceWorkers:'block'});
  await blocked.addInitScript(()=>{Object.defineProperty(window,'localStorage',{configurable:true,get(){throw new DOMException('blocked','SecurityError');}});});
  const q=await blocked.newPage(),qErrors=[];q.on('pageerror',e=>qErrors.push(e.message));q.on('console',e=>{if(e.type()==='error')qErrors.push(e.text());});
  await q.goto('http://127.0.0.1:8765/slime/?v=workshop-17',{timeout:90000});await q.waitForFunction(()=>!!window.__slime,{},{polling:100,timeout:90000});
  const r=await q.evaluate(()=>{__slime.make({a:1},{stars:true},'별이');__slime.advance(1);for(let i=0;i<5;i++){__slime.feed('water');__slime.advance(1.3);}__slime.advance(1.5);return{n:__slime.room.slimes.length,dex:__slime.dex.entries.length,name:__slime.room.active.name};});
  assert.deepEqual(r,{n:3,dex:1,name:'별이'});assert.deepEqual(qErrors,[]);await blocked.close();
  console.log('PASS works with storage blocked, no console errors');
  // 12. iPad-like touch device (coarse pointer = 4412-vertex skin): CPU cost of one frame, 1 vs 4 slimes.
  await c.close();// software WebGL of the earlier page would compete for the same CPU
  const pad=await b.newContext({viewport:{width:1180,height:820},hasTouch:true,isMobile:true,deviceScaleFactor:1,serviceWorkers:'block'});const z=await pad.newPage();
  await z.goto('http://127.0.0.1:8765/slime/?v=workshop-17',{timeout:90000});await z.waitForFunction(()=>!!window.__slime,{},{polling:100,timeout:90000});
  const cost=await z.evaluate(()=>{const S=__slime,m=()=>{let best=1e9;for(let k=0;k<6;k++){const t=performance.now();S.advance(.5);best=Math.min(best,(performance.now()-t)/30);}return best;};
   S.advance(1);const one=m();S.make({r:1,w:1},{beads:true,foam:true,stars:true,glitter:true},'');for(let i=0;i<30&&S.room.slimes.length<4;i++){S.feed('candy');S.advance(1.3);}S.advance(2);
   return{vertices:S.state().vertices,slimes:S.room.slimes.length,one,four:m()};});
  await pad.close();assert.equal(cost.vertices,4412);assert.equal(cost.slimes,4);assert.ok(cost.four<12,'four slimes stay well inside a 16.7 ms frame: '+cost.four);
  console.log('PASS iPad-size CPU budget: simulate '+cost.one.toFixed(2)+' ms with 1 slime, '+cost.four.toFixed(2)+' ms with 4 (frame budget 16.7 ms)');console.log('Screenshots: '+out);
 }finally{await b.close();}})().catch(e=>{console.error(e);process.exitCode=1;});
