'use strict';
const {chromium}=require(process.env.PLAYWRIGHT_PATH || 'C:/Users/김시현/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const fs=require('fs'),path=require('path'),http=require('http'),assert=require('assert/strict');
const root=path.resolve(__dirname,'../..'),out=path.resolve(root,'../math-equipment-qa');
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
 try {
  const context=await browser.newContext({viewport:{width:820,height:1180},hasTouch:true,serviceWorkers:'block'});
  const page=await context.newPage(),errors=[];page.on('pageerror',e=>errors.push(e.message));
  const base=process.env.TEST_BASE || 'http://127.0.0.1:'+server.address().port;
  await page.goto(base+'/math/');
  await page.evaluate(()=>{const s=MathStore.defaults();s.name='재이';s.placed=true;s.level=4;s.coins=73;localStorage.setItem(MathStore.KEY,JSON.stringify(s));});
  const expected={bars:'make10',slide:'from10',swing:'add',seesaw:'split10',blocks:'split10',steps:null};
  for(const [spot,type] of Object.entries(expected)) {
   await page.reload();await page.locator('#homePlaces > summary').click();
   const button=page.locator('[data-spot="'+spot+'"]');await button.click();
   assert.ok((await button.getAttribute('aria-label')).includes(await button.locator('.spot-topic').innerText()));
   if(spot==='slide') await page.screenshot({path:path.join(out,'equipment-ipad.png'),fullPage:true});
   await page.locator('#quickBtn').click();
   const pending=await page.evaluate(()=>JSON.parse(localStorage.getItem('math10_state')).pending);
   assert.equal(pending.spot,spot);assert.equal(pending.problems.length,3);
   if(type) assert.ok(pending.problems.slice(0,2).every(p=>p.type===type));
   assert.ok((await page.locator('#quizMission').innerText()).includes(pending.focusTitle));
   await page.locator('#quitBtn').click();
   assert.equal(await page.locator('[data-spot="bars"]').isDisabled(),true);
   assert.ok(await page.locator('#spotChangeNote').isVisible());
   await page.reload();await page.locator('#startBtn').click();
   assert.deepEqual(await page.evaluate(()=>JSON.parse(localStorage.getItem('math10_state')).pending),pending);
   assert.ok((await page.locator('#quizMission').innerText()).includes(pending.focusTitle));
   await page.evaluate(()=>{const s=JSON.parse(localStorage.getItem('math10_state'));s.pending=null;localStorage.setItem('math10_state',JSON.stringify(s));});
  }
  for(const width of [320,390,768,1024]) {
   await page.setViewportSize({width,height:width===1024?768:1000});await page.reload();
   await page.locator('#homePlaces > summary').click();
   assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false,'expanded equipment overflow '+width);
   const targets=await page.locator('.play-spot').evaluateAll(es=>es.map(e=>({w:e.getBoundingClientRect().width,h:e.getBoundingClientRect().height})));
   assert.ok(targets.every(r=>r.w>=44&&r.h>=44));
   if(width===390) await page.screenshot({path:path.join(out,'equipment-phone.png'),fullPage:true});
  }
  assert.equal(await page.evaluate(()=>JSON.parse(localStorage.getItem('math10_state')).coins),73);
  // Sessions created before equipment focus existed must resume unchanged.
  await page.evaluate(()=>{const s=JSON.parse(localStorage.getItem('math10_state'));s.pending={level:4,problems:[Curriculum.makeProblem(4,Math.random,'from10')],index:0,results:[],firstTry:false,mode:'quick'};localStorage.setItem('math10_state',JSON.stringify(s));});
  await page.reload();await page.locator('#startBtn').click();
  assert.ok(await page.locator('#explain').isVisible());
  assert.equal(await page.evaluate(()=>JSON.parse(localStorage.getItem('math10_state')).pending.problems[0].type),'from10');
  assert.deepEqual(errors,[]);
  console.log(JSON.stringify({ok:true,checks:'six equipment choices affect real questions, progress scope, frozen resume, legacy resume, iPad/phone expanded layout, touch targets, records preserved',screenshots:out}));
 } finally {await browser.close();server.close();}
})().catch(e=>{console.error(e);process.exitCode=1;server.close();});
