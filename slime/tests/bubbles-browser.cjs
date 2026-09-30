const{chromium}=require('playwright'),fs=require('node:fs'),os=require('node:os'),path=require('node:path'),assert=require('node:assert/strict');
(async()=>{const out=fs.mkdtempSync(path.join(os.tmpdir(),'slime-bubbles10-')),b=await chromium.launch({channel:'msedge',headless:true,args:['--use-angle=swiftshader','--enable-unsafe-swiftshader']});
 try{const p=await b.newPage({viewport:{width:768,height:1024},hasTouch:true,serviceWorkers:'block'}),errors=[];p.on('pageerror',e=>errors.push(e.message));p.on('console',e=>{if(e.type()==='error')errors.push(e.text());});
 await p.emulateMedia({reducedMotion:'reduce'});await p.clock.install({time:new Date('2026-09-30T00:00:00Z')});await p.clock.pauseAt(new Date('2026-09-30T00:00:02Z'));
 await p.goto('http://127.0.0.1:8765/slime/?v=bubbles-10');await p.waitForFunction(()=>!!window.__slime,{},{polling:100,timeout:90000});
 for(const viewport of [{width:768,height:1024},{width:390,height:844},{width:844,height:390}]){await p.setViewportSize(viewport);await p.evaluate(()=>{dispatchEvent(new Event('resize'));__slime.reset();});await p.locator('#play-menu').click();await p.locator('[data-toy=bubbles]').click();
  await p.evaluate(()=>{__slime.advance(.1);__slime.renderOnce();});
  const image=await p.evaluate(()=>{__slime.renderOnce();return document.getElementById('jelly').toDataURL();});fs.writeFileSync(path.join(out,'bubbles-'+viewport.width+'.png'),Buffer.from(image.split(',')[1],'base64'));
  for(let i=0;i<6;i++){const xy=await p.evaluate(i=>{const s=__slime,m=s.toys.bubbles[i],v=m.position.clone().project(s.camera),r=m.geometry.parameters.radius*m.scale.x,px=innerHeight/(2*Math.tan(s.camera.fov*Math.PI/360)*s.camera.position.distanceTo(m.position));return{x:(v.x*.5+.5)*innerWidth,y:(-.5*v.y+.5)*innerHeight,diameter:2*r*px,material:m.material.type};},i);
   assert.ok(xy.diameter>=43,JSON.stringify(xy));assert.equal(xy.material,'ShaderMaterial');assert.equal(await p.evaluate(xy=>document.elementFromPoint(xy.x,xy.y)?.id,xy),'jelly','bubble must not hide behind controls');await p.touchscreen.tap(xy.x,xy.y);
   assert.equal(await p.evaluate(()=>__slime.toys.state().hits),i+1);assert.equal(await p.evaluate(i=>__slime.toys.bubbles[i].visible,i),false);
  }
  await p.evaluate(()=>{__slime.advance(2.3);__slime.renderOnce();});assert.equal(await p.evaluate(()=>__slime.toys.bubbles.filter(m=>m.visible).length),6);await p.locator('#toy-stop').click();assert.equal(await p.evaluate(()=>__slime.toys.bubbles.some(m=>m.visible)),false);
 }
 await p.emulateMedia({reducedMotion:'no-preference'});await p.locator('#play-menu').click();await p.locator('[data-toy=bubbles]').click();await p.evaluate(()=>{__slime.advance(.4);__slime.renderOnce();});
 assert.ok(await p.evaluate(()=>__slime.toys.bubbles.every(m=>Number.isFinite(m.position.y)&&Number.isFinite(m.scale.x))));assert.deepEqual(errors,[]);console.log('PASS six visible soap-film bubbles, >=43px touch diameter, all real-touch pops, respawn/stop, portrait/landscape, reduced motion, no shader errors');console.log('Screenshots: '+out);
 }finally{await b.close();}})().catch(e=>{console.error(e);process.exitCode=1;});
