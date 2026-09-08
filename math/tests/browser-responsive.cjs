'use strict';
const {chromium}=require(process.env.PLAYWRIGHT_PATH || 'C:/Users/김시현/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const fs=require('fs'),path=require('path'),http=require('http'),assert=require('assert/strict');
const root=path.resolve(__dirname,'../..'),out=path.resolve(root,'../math-ipad-qa');
fs.mkdirSync(out,{recursive:true});
const mime={'.html':'text/html; charset=utf-8','.js':'application/javascript','.css':'text/css','.png':'image/png','.webp':'image/webp','.svg':'image/svg+xml'};
const server=http.createServer((req,res)=>{
 const url=new URL(req.url,'http://localhost'),pathname=decodeURIComponent(url.pathname),file=path.resolve(root,'.'+pathname+(pathname.endsWith('/')?'index.html':''));
 if(!file.startsWith(root+path.sep)){res.writeHead(403);res.end();return;}
 try{res.setHeader('Content-Type',mime[path.extname(file)]||'application/octet-stream');res.end(fs.readFileSync(file));}catch{res.writeHead(404);res.end();}
});
(async()=>{
 await new Promise(r=>server.listen(0,'127.0.0.1',r));
 const browser=await chromium.launch({headless:true});
 const cases=[['ipad-portrait',768,1024],['ipad-landscape',1024,768],['ipad-air-portrait',820,1180],['ipad-air-landscape',1180,820],['ipad-pro-portrait',1024,1366],['ipad-pro-landscape',1366,1024],['ipad-split',507,1080],['phone',390,844],['desktop',1440,900]];
 const report=[];
 try {
  for(const [name,width,height] of cases) {
   const context=await browser.newContext({viewport:{width,height},deviceScaleFactor:1,isMobile:name!=='desktop',hasTouch:name!=='desktop',serviceWorkers:'block'});
   const page=await context.newPage(),errors=[];page.on('pageerror',e=>errors.push(e.message));
   const base=process.env.TEST_BASE || 'http://127.0.0.1:'+server.address().port;
   await page.goto(base+'/math/');await page.locator('.welcome-art').evaluate(el=>el.decode());
   assert.equal(await page.locator('.welcome-art').evaluate(el=>getComputedStyle(el).objectFit),'contain');
   await page.evaluate(()=>{const s=MathStore.defaults();s.name='재이';s.placed=true;localStorage.setItem(MathStore.KEY,JSON.stringify(s));});
   await page.reload();await page.locator('.hero-scene').evaluate(el=>el.decode());
   const art=await page.locator('.hero-scene').boundingBox(),copy=await page.locator('.hero-copy').boundingBox();
   assert.ok(Math.abs(art.width/art.height-1.5)<.01,name+': original illustration aspect ratio');
   assert.ok(copy.x+copy.width<=art.x+1 || copy.y+copy.height<=art.y+1,name+': text does not cover illustration');
   const start=await page.locator('#startBtn').boundingBox();assert.ok(start.y+start.height<height,name+': start visible without scrolling');
   assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false,name+': home overflow');
   await page.screenshot({path:path.join(out,name+'-home.png')});
   if(name!=='desktop') {await page.locator('[data-spot="slide"]').tap();await page.locator('[data-spot="bars"]').tap();await page.locator('#quickBtn').tap();}
   else await page.locator('#quickBtn').click();
   await page.locator('#togetherBtn').click();
   const before=await page.evaluate(()=>JSON.parse(localStorage.getItem('math10_state')).pending);
   if(width>=900 && width>height) {
    const content=await page.locator('.quiz-content').boundingBox(),pad=await page.locator('#keypad').boundingBox();
    assert.ok(content.x+content.width<=pad.x,name+': landscape side-by-side keypad');
    assert.ok(pad.y+pad.height<=height,name+': keypad visible');
   }
   const targets=await page.locator('#keypad button').evaluateAll(els=>els.map(e=>({w:e.getBoundingClientRect().width,h:e.getBoundingClientRect().height})));
   assert.ok(targets.every(t=>t.w>=44 && t.h>=44),name+': touch targets');
   assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false,name+': quiz overflow');
   await page.screenshot({path:path.join(out,name+'-quiz.png')});
   if(name==='ipad-portrait') {
    await page.setViewportSize({width:1024,height:768});
    const after=await page.evaluate(()=>JSON.parse(localStorage.getItem('math10_state')).pending);
    assert.deepEqual(after,before,'rotation preserves progress and help');
   }
   await page.locator('#quitBtn').click();await page.locator('#startBtn').click();
   assert.equal(await page.evaluate(()=>JSON.parse(localStorage.getItem('math10_state')).pending.firstTry),false,'resume preserves help');
   await page.goto(base+'/math/parent.html');
   assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false,name+': parent overflow');
   assert.deepEqual(errors,[]);report.push(name);await context.close();
  }
  console.log(JSON.stringify({ok:true,engine:'Chromium with touch emulation; physical iPad/Safari not tested',checked:report,screenshots:out}));
 } finally {await browser.close();server.close();}
})().catch(e=>{console.error(e);process.exitCode=1;server.close();});
