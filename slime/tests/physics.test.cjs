const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const modulePromise=import('data:text/javascript;base64,'+fs.readFileSync(path.join(__dirname,'../src/physics.js')).toString('base64'));
async function jelly(){return(await modulePromise).createJelly(16,32);}
function tick(s,seconds,rate=60){for(let i=0;i<seconds*rate;i++)s.advance(1/rate);}
test('indexed surface has shared seams and a fixed vertex budget',async()=>{const s=await jelly();assert.ok(s.unit.length/3<600);assert.ok([...s.indices].every(i=>i<s.unit.length/3));assert.ok([...s.position].every(Number.isFinite));});
test('a poke deforms then returns to the same rest shape',async()=>{const s=await jelly();s.poke(200);tick(s,.15);assert.ok(s.state().maxDeformation>.01);tick(s,8);assert.ok(s.state().maxDeformation<.01);assert.ok(Math.abs(s.squash)<.01);});
test('grab stretches a neighbourhood and release never leaves the floor penetrated',async()=>{const s=await jelly(),i=200,n=i*3;s.grab(i,{x:s.position[n],y:s.position[n+1],z:s.position[n+2]});s.move({x:.8,y:3.3,z:1});tick(s,.5);assert.ok(s.state().held);assert.ok(s.state().maxDeformation>.025);s.release({x:50,y:30,z:20});tick(s,6);assert.ok([...s.position].every(Number.isFinite));assert.ok(s.position.every((v,k)=>k%3!==1||v+s.body.y>=-.00001));assert.ok(Math.abs(s.body.x)<=s.bounds.x);assert.ok(!s.state().held);});
test('pinch stretches globally without multiplying the volume',async()=>{const s=await jelly();s.stretch(.4);tick(s,2);const q=s.squash;assert.ok(q>.35&&q<.45);const height=1+q,width=1/Math.sqrt(height);assert.ok(Math.abs(height*width*width-1)<1e-9);s.stretch(0);tick(s,4);assert.ok(Math.abs(s.squash)<.01);});
test('30 / 60 / 120 Hz rendering follows the same fixed-step physics',async()=>{const states=[];for(const rate of [30,60,120]){const s=await jelly();s.jump();s.body.vx=3;tick(s,3,rate);states.push(s.state());}for(const s of states){assert.ok(Math.abs(s.body.x-states[0].body.x)<.03);assert.ok(Math.abs(s.body.y)<.02);}});
test('reset clears movement, held input and events without allocating new geometry',async()=>{const s=await jelly(),positions=s.position,rest=s.rest;s.jump();tick(s,.2);s.grab(200,{x:1,y:3,z:1});s.reset();assert.equal(s.position,positions);assert.equal(s.rest,rest);assert.deepEqual(s.state().body,{x:0,y:0,z:0,vx:0,vy:0,vz:0});assert.ok(!s.state().held);assert.equal(s.events.length,0);assert.deepEqual(s.position,rest);});
test('release preserves body inertia and limits the whole throw vector',async()=>{
 const s=await jelly(),i=200,n=i*3;s.grab(i,{x:s.position[n],y:s.position[n+1],z:s.position[n+2]});
 Object.assign(s.body,{vx:2,vy:3,vz:-1});s.release();assert.deepEqual([s.body.vx,s.body.vy,s.body.vz],[.6,.8999999999999999,-.3]);
 s.grab(i,{x:1,y:2,z:1});Object.assign(s.body,{vx:0,vy:0,vz:0});s.release({x:100,y:100,z:100});
 assert.ok(Math.abs(Math.hypot(s.body.vx,s.body.vy,s.body.vz)-15.2)<1e-9);
});
test('jump first crouches, then launches while skin lags behind the body',async()=>{
 const s=await jelly();assert.ok(s.jump());tick(s,.05);assert.equal(s.body.y,0);assert.ok(s.squash<0);
 tick(s,.1);assert.ok(s.body.y>.1);assert.ok(s.state().maxDeformation>.02);
 tick(s,4);assert.ok(s.body.y<.01);assert.ok(s.state().maxDeformation<.03);
});
test('dense icosahedral topology matches desktop and touch surface budgets',async()=>{
 const {jellyTopology}=await import(require('node:url').pathToFileURL(path.join(__dirname,'../src/geometry.js')));
 const {createJelly}=await modulePromise;
 for(const [coarse,expected] of [[false,7292],[true,4412]]){
  const topology=jellyTopology(coarse),s=createJelly(topology);assert.equal(s.state().vertices,expected);
  assert.equal(s.indices.length/3,2*expected-4);assert.ok(s.rest.every(Number.isFinite));
  let vertex=0;for(let i=1;i<expected;i++)if(s.unit[i*3+2]>s.unit[vertex*3+2])vertex=i;
  s.grab(vertex,{x:s.rest[vertex*3],y:s.rest[vertex*3+1],z:s.rest[vertex*3+2]});
  for(let i=0;i<90;i++){s.move({x:Math.sin(i*.13)*2,y:2.3+Math.sin(i*.17)*2,z:1});s.advance(1/60);}
  assert.ok(s.state().maxDeformation>.1);assert.ok(s.position.every(Number.isFinite));
  for(let i=0;i<expected;i++){const b=i*3,d=s.disp[b]*s.unit[b]+s.disp[b+1]*s.unit[b+1]+s.disp[b+2]*s.unit[b+2];assert.ok(d>=-.301,'grab cannot pull a vertex through the skin');}
  s.release({x:12,y:10,z:9});tick(s,4);assert.ok(s.position.every(Number.isFinite));assert.ok(s.position.every((v,k)=>k%3!==1||v+s.body.y>=-.0001));
 }
});
test('new local rendering dependencies are all available to the offline worker',()=>{
 const worker=require('../../sw.js');
 for(const file of ['src/main.js?v=rainbow-16','src/physics.js?v=play-7','src/audio.js?v=playroom-9','src/material.js?v=rainbow-16','src/aurora-volume.js?v=rainbow-16','src/input.js?v=play-7','src/friend.js?v=playroom-9','src/toys.js?v=bubbles-10','src/bubble-material.js?v=bubbles-10','src/stage.js?v=play-7','src/geometry.js?v=5','src/optics.js?v=5','src/caustics.js?v=visual-1','vendor/RoomEnvironment.js','vendor/Reflector.js','vendor/THREE-LICENSE.txt']){
  const asset='./slime/'+file;assert.equal(worker.BACKGROUND_ASSETS.filter(x=>x===asset).length,1,asset);
 }
});
test('raised trampoline floor supports the body and still permits jump, exit and reset',async()=>{
 const s=await jelly();s.setGround(.32);tick(s,.2);assert.equal(s.groundHeight,.32);assert.ok(s.body.y>=.32);
 assert.ok(s.position.every((v,k)=>k%3!==1||v+s.body.y>=.3199));assert.equal(s.jump(8.2),true);tick(s,.22);assert.ok(s.body.y>.7);
 tick(s,3);assert.ok(s.body.y>=.32);assert.equal(s.jump(),true);s.setGround(0);tick(s,4);assert.ok(s.body.y<.01);s.reset();assert.equal(s.groundHeight,0);
});
