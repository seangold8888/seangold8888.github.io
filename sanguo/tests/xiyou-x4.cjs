// Reproducible X4 integration. Hooks are injected only into locally served test responses.
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const {chromium}=require('playwright'),{createServer}=require('../preview-server.cjs');
const source=fs.readFileSync(path.join(__dirname,'../src/game/sideScroller.js'),'utf8');
const marker='  function loop(now) {';
assert.ok(source.includes(marker));
const hook=[
 'globalThis.__x4={render,finish,scenery,get paintedBackground(){return paintedBackground;}};',
 "for(const key of Object.keys(audio))if(typeof audio[key]==='function')audio[key]=()=>{};",
].join('\n');
const instrumented=source.replace(marker,hook+marker).replace('function loop(now) {','function loop(now) { return;');
const stages=['huaguoshan','donghai','heavenpalace','baihuling','lianhuadong','huoyundong','flamemountain','shituoling'];

(async()=>{
 const {WORK_STAGES,stagesOfWork}=await import('../src/data/works.js');
 assert.deepEqual(stagesOfWork('xiyou'),stages);
 const root=path.join(__dirname,'../..');
 const expected=[];
 for(const stage of stages){
  const background=WORK_STAGES[stage].background;
  assert.deepEqual(Object.keys(background),['far','mid','ground']);
  for(const layer of ['far','mid','ground']){
   const relative='sanguo/'+background[layer];
   expected.push('./'+relative);
   const file=path.join(root,relative);
   assert.ok(fs.existsSync(file),relative);
   const size=fs.statSync(file).size;
   assert.ok(size>1_000_000,relative+' '+size);
   const bytes=fs.readFileSync(file);
   assert.equal(bytes.subarray(1,4).toString(),'PNG',relative+' is PNG');
   const width=bytes.readUInt32BE(16),height=bytes.readUInt32BE(20);
   assert.ok(width>=1900&&height>=700,relative+' dimensions '+width+'x'+height);
   const colorType=bytes[25];
   if(layer==='mid')assert.equal(colorType,6,relative+' must carry RGBA transparency');
   else assert.equal(colorType,2,relative+' must be opaque RGB');
  }
 }
 const sw=fs.readFileSync(path.join(root,'sw.js'),'utf8');
 for(const asset of expected)assert.ok(sw.includes('"'+asset+'"'),asset+' offline');
 assert.match(source,/drawLayer\(paintedBackground\.far, \.06/);
 assert.match(source,/drawLayer\(paintedBackground\.mid, \.30/);
 assert.match(source,/drawLayer\(paintedGroundLayer \|\| paintedBackground\.ground, 1/);
 assert.match(source,/그림 배경 일부를 읽지 못해 절차 배경으로 전환/);
 assert.match(source,/releaseStageBackground/);

 const server=createServer();await new Promise(r=>server.listen(0,'127.0.0.1',r));let browser;
 const output=process.env.XIYOU_QA_OUTPUT;if(output)fs.mkdirSync(output,{recursive:true});
 try{
  browser=await chromium.launch({headless:true,args:['--disable-gpu-vsync','--disable-frame-rate-limit']});
  const origin='http://127.0.0.1:'+server.address().port;
  for(const stage of stages){
   const context=await browser.newContext({viewport:{width:640,height:400},hasTouch:true,serviceWorkers:'block'});
   const page=await context.newPage(),errors=[],bad=[],requests=[];
   page.on('pageerror',e=>errors.push(e.message));
   page.on('response',r=>{if(r.status()>=400)bad.push(r.status()+' '+r.url());});
   page.on('request',r=>{if(r.url().includes('/art/battlefield/'))requests.push(r.url());});
   await page.route('**/src/game/sideScroller.js',r=>r.fulfill({contentType:'text/javascript',body:instrumented}));
   await page.goto(origin);await page.waitForSelector('.cm-hero');
   await page.evaluate(async(stage)=>{
    const calls=[],draw=CanvasRenderingContext2D.prototype.drawImage;
    CanvasRenderingContext2D.prototype.drawImage=function(image,...args){
     const source=image?.src||image?.__sourceUrl;
     if(source?.includes('/art/battlefield/'))calls.push(source);
     return draw.call(this,image,...args);
    };
    globalThis.__x4DrawCalls=calls;
    document.getElementById('ui').innerHTML='';
    const {startSideBattle}=await import('./src/game/sideScroller.js');
    await startSideBattle('wukong',stage);
    __x4.render(performance.now()+1000);
   },stage);
   const state=await page.evaluate(()=>({
    loaded:Object.fromEntries(Object.entries(__x4.paintedBackground||{}).map(([k,v])=>[k,v.src])),
    drawCalls:[...new Set(__x4DrawCalls)],
    hasParticles:typeof __x4.scenery?.drawParticles==='function',
   }));
   assert.deepEqual(Object.keys(state.loaded),['far','mid','ground'],stage+' loaded layers');
   assert.equal(state.drawCalls.length,3,stage+' painted draw layers');
   assert.equal(new Set(requests).size,3,stage+' network layer count');
   assert.ok(state.hasParticles,stage+' lightweight themed scenery');
   for(const layer of ['far','mid','ground'])assert.ok(state.loaded[layer].endsWith('/'+stage+'-'+layer+'-v1.png'),stage+' '+layer);
   if(output)await page.screenshot({path:path.join(output,'x4-'+stage+'.jpg'),type:'jpeg',quality:52});
   await page.evaluate(()=>__x4.finish(false));
   assert.equal(await page.evaluate(()=>__x4.paintedBackground),null,stage+' released');
   assert.deepEqual(errors,[],stage+' page errors');assert.deepEqual(bad,[],stage+' failed requests');
   console.log('PASS X4 '+stage+' painted layers and release');
   await context.close();
  }
 }finally{await browser?.close();server.closeAllConnections();await new Promise(r=>server.close(r));}
 console.log('PASS X4 eight-stage painted parallax, offline assets, fallback contract and cleanup');
})().catch(e=>{console.error(e);process.exitCode=1;});
