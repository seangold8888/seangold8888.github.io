const {chromium}=require('playwright'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),os=require('node:os');
const out=fs.mkdtempSync(path.join(os.tmpdir(),'slime-optics-'));
(async()=>{
 const browser=await chromium.launch({channel:'msedge',headless:true,args:['--use-angle=swiftshader','--enable-unsafe-swiftshader']});
 try{
  const context=await browser.newContext({viewport:{width:800,height:600},hasTouch:true,serviceWorkers:'block',reducedMotion:'reduce'}),p=await context.newPage(),errors=[];
  p.on('pageerror',e=>errors.push(e.message));p.on('console',m=>{if(m.type()==='error')errors.push(m.text());});
  await context.addInitScript(()=>{const d=new Date();localStorage.setItem('hub_play_pass',JSON.stringify({free:true,day:d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0')+'-'+String(d.getDate()).padStart(2,'0')}));});
  await p.clock.install({time:new Date('2026-09-30T00:00:00Z')});await p.clock.pauseAt(new Date('2026-09-30T00:00:02Z'));
  await p.goto('http://127.0.0.1:8765/slime/?v=aurora-8');await p.waitForFunction(()=>!!window.__slime);
  const cdp=await context.newCDPSession(p);
  async function capture(name){await p.clock.runFor(32);const {data}=await cdp.send('Page.captureScreenshot',{format:'png',fromSurface:true});fs.writeFileSync(path.join(out,name+'.png'),Buffer.from(data,'base64'));}
  await p.evaluate(()=>{__slime.reset();__slime.setOptics(false);__slime.renderOnce();});await capture('basic');
  await p.evaluate(()=>{__slime.setOptics(true);__slime.renderOnce();});await capture('enhanced');
  const energy=await p.evaluate(()=>{
   const c=__slime.caustics,t=c.debugTarget,bytes=new Uint8Array(t.width*t.height*4);__slime.renderer.readRenderTargetPixels(t,0,0,t.width,t.height,bytes);
   let sum=0,lit=0;for(let i=0;i<bytes.length;i+=4){const v=bytes[i]+bytes[i+1]+bytes[i+2];sum+=v;if(v)lit++;}
   return{sum,lit,pixels:t.width*t.height,state:c.state()};
  });console.log('Caustic energy:',JSON.stringify(energy));assert.ok(energy.sum>0&&energy.lit>5);assert.ok(energy.lit<energy.pixels*.8);assert.equal(energy.state.size,128);
  const originalSum=energy.sum;
  await p.evaluate(()=>{const s=__slime.solver;let i=0;for(let j=1;j<s.unit.length/3;j++)if(s.unit[j*3+1]>s.unit[i*3+1])i=j;
   s.grab(i,{x:s.position[i*3],y:s.position[i*3+1],z:s.position[i*3+2]});s.move({x:.8,y:3,z:.5});__slime.advance(.15);__slime.renderOnce();});await capture('stretched');
  const stretchedSum=await p.evaluate(()=>{const t=__slime.caustics.debugTarget,b=new Uint8Array(t.width*t.height*4);__slime.renderer.readRenderTargetPixels(t,0,0,t.width,t.height,b);let sum=0;for(let i=0;i<b.length;i++)if(i%4!==3)sum+=b[i];return sum;});
  assert.notEqual(stretchedSum,originalSum);assert.ok(await p.evaluate(()=>__slime.solver.state().maxDeformation>.05));
  await p.evaluate(()=>{__slime.setOptics(false);});const before=await p.evaluate(()=>__slime.caustics.state().passes);await p.evaluate(()=>__slime.renderOnce());assert.equal(await p.evaluate(()=>__slime.caustics.state().passes),before);
  await p.evaluate(()=>{__slime.setOptics(true);__slime.renderOnce();});assert.equal(await p.evaluate(()=>__slime.renderer.getRenderTarget()),null);
  const budget=await p.evaluate(()=>{const c=__slime.caustics,before=c.state().passes;c.invalidate();c.update(0,__slime.mesh.material);for(let i=0;i<24;i++)c.update(1/120,__slime.mesh.material);return c.state().passes-before;});assert.ok(budget<=7);
  const restored=await p.evaluate(()=>{const r=__slime.renderer,c=__slime.caustics,temporary=new c.debugTarget.constructor(16,16);r.setRenderTarget(temporary);c.invalidate();c.update(0,__slime.mesh.material);const ok=r.getRenderTarget()===temporary;r.setRenderTarget(null);temporary.dispose();return ok;});assert.ok(restored);
  await p.setViewportSize({width:768,height:1024});
  // With a paused virtual clock, flush the viewport's resize before drawing.
  await p.evaluate(()=>{dispatchEvent(new Event('resize'));__slime.reset();__slime.renderOnce();});await capture('tablet');
  assert.ok(await p.evaluate(()=>Math.abs(__slime.camera.aspect-innerWidth/innerHeight)<.00001));
  assert.ok(await p.evaluate(()=>__slime.renderer.info.render.calls>15));
  const sharp=require('sharp'),a=await sharp(path.join(out,'basic.png')).raw().toBuffer(),b=await sharp(path.join(out,'enhanced.png')).raw().toBuffer();let changed=0;for(let i=0;i<a.length;i++)if(Math.abs(a[i]-b[i])>2)changed++;
  assert.ok(changed>100);
  // The earlier reduced-motion checks intentionally suppress waves. Enable them
  // now, and capture the canvas synchronously so compositor latency cannot hide A/B.
  await p.emulateMedia({reducedMotion:'no-preference'});
  const waveOff=await p.evaluate(()=>{__slime.reset();const s=__slime.solver;let i=0;for(let j=1;j<s.unit.length/3;j++)if(s.unit[j*3+2]>s.unit[i*3+2])i=j;__slime.ripple(i,1);__slime.advance(.12);__slime.expression.rippleStrength.value=0;__slime.expression.eye.value.set(1,1,0,0);__slime.renderOnce();return document.getElementById('jelly').toDataURL();});
  fs.writeFileSync(path.join(out,'wave-off.png'),Buffer.from(waveOff.split(',')[1],'base64'));
  const waveOn=await p.evaluate(()=>{__slime.expression.rippleStrength.value=1;__slime.renderOnce();return document.getElementById('jelly').toDataURL();});
  fs.writeFileSync(path.join(out,'wave-on.png'),Buffer.from(waveOn.split(',')[1],'base64'));
  const wa=await sharp(path.join(out,'wave-off.png')).raw().toBuffer(),wb=await sharp(path.join(out,'wave-on.png')).raw().toBuffer();let waveChange=0;for(let i=0;i<wa.length;i++)if(Math.abs(wa[i]-wb[i])>3)waveChange++;assert.ok(waveChange>50);
  assert.deepEqual(errors,[]);console.log('PASS optics shader compile, real caustic pixels, optical A/B ('+changed+' changed channels), shape-linked light, ripple/smile ('+waveChange+' changed channels), toggle, render-target restore, portrait');
  console.log('Optics screenshots: '+out);
 }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
