const{chromium}=require('playwright'),fs=require('node:fs'),os=require('node:os'),path=require('node:path'),assert=require('node:assert/strict');
(async()=>{const out=fs.mkdtempSync(path.join(os.tmpdir(),'slime-play7-')),b=await chromium.launch({channel:'msedge',headless:true,args:['--use-angle=swiftshader','--enable-unsafe-swiftshader']});
 try{const p=await b.newPage({viewport:{width:768,height:1024},hasTouch:true,serviceWorkers:'block'}),errors=[];p.on('pageerror',e=>errors.push(e.message));p.on('console',e=>{if(e.type()==='error')errors.push(e.text());});
 await p.clock.install({time:new Date('2026-09-30T00:00:00Z')});await p.clock.pauseAt(new Date('2026-09-30T00:00:02Z'));
 await p.goto('http://127.0.0.1:8765/slime/?v=rainbow-16');await p.waitForFunction(()=>!!window.__slime);
 function save(name,data){fs.writeFileSync(path.join(out,name+'.png'),Buffer.from(data.split(',')[1],'base64'));}
 let image=await p.evaluate(()=>{__slime.reset();__slime.flavor(5);__slime.advance(2);__slime.renderOnce();return document.getElementById('jelly').toDataURL();});save('aurora',image);
 const mat=await p.evaluate(()=>({transmission:__slime.mesh.material.transmission,film:__slime.mesh.material.iridescence}));assert.ok(mat.transmission>.99);assert.ok(mat.film>.3&&mat.film<.5);
 await p.locator('#trampoline-button').click({force:true});await p.evaluate(()=>{__slime.flavor(0);__slime.advance(2);__slime.solver.reset();__slime.toys.choose('trampoline');__slime.toys.update(0,0,false,false,true);__slime.advance(.001);__slime.renderOnce();});
 image=await p.evaluate(()=>{__slime.renderOnce();return document.getElementById('jelly').toDataURL();});save('trampoline',image);
 const result=await p.evaluate(()=>{const s=__slime,t=s.toys.trampoline,rim=t.children[1],v=rim.position.clone();v.x+=1.7;t.localToWorld(v);v.project(s.camera);return{mode:s.toys.state().mode,ground:s.solver.groundHeight,ringRadius:rim.geometry.parameters.radius,slimeHalfWidth:(s.mesh.geometry.boundingBox.max.x-s.mesh.geometry.boundingBox.min.x)/2,x:(v.x*.5+.5)*innerWidth,y:(-.5*v.y+.5)*innerHeight,calls:s.renderer.info.render.calls};});
 assert.equal(result.mode,'trampoline');assert.equal(result.ground,.32);assert.ok(result.ringRadius>result.slimeHalfWidth+.15);assert.ok(result.x>0&&result.x<768&&result.y>0&&result.y<1024);assert.ok(result.calls<60);
 await p.touchscreen.tap(result.x,result.y);await p.evaluate(()=>__slime.advance(.22));assert.ok(await p.evaluate(()=>__slime.solver.body.y>.65));
 await p.locator('#trampoline-button').click({force:true});assert.equal(await p.evaluate(()=>__slime.toys.state().mode),'none');assert.equal(await p.evaluate(()=>__slime.solver.groundHeight),0);
 for(const v of [{width:390,height:844},{width:844,height:390}]){await p.setViewportSize(v);await p.evaluate(()=>dispatchEvent(new Event('resize')));assert.ok(await p.locator('.friend-actions').evaluate(e=>{const r=e.getBoundingClientRect();return r.left>=0&&r.right<=innerWidth&&r.top>=0&&r.bottom<=innerHeight;}));}
 assert.deepEqual(errors,[]);console.log('PASS translucent colored aurora, exposed wide trampoline rim, raised landing, real touch jump, direct toggle, phone/landscape button layout ('+result.calls+' draw calls)');console.log('Screenshots: '+out);
 }finally{await b.close();}})().catch(e=>{console.error(e);process.exitCode=1;});
