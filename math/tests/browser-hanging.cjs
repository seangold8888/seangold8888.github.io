'use strict';
const {chromium}=require(process.env.PLAYWRIGHT_PATH || 'C:/Users/김시현/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const fs=require('fs'),path=require('path'),http=require('http'),assert=require('assert/strict');
const root=path.resolve(__dirname,'../..'),out=path.resolve(root,'../math-hanging-qa');
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
  const base=process.env.TEST_BASE || 'http://127.0.0.1:'+server.address().port;
  const context=await browser.newContext({viewport:{width:820,height:1180},hasTouch:true,serviceWorkers:'block'});
  const page=await context.newPage(),errors=[];page.on('pageerror',e=>errors.push(e.message));
  await page.goto(base+'/math/');
  await page.evaluate(()=>{const s=MathStore.defaults();s.name='재이';s.placed=true;s.level=4;s.coins=52;localStorage.setItem(MathStore.KEY,JSON.stringify(s));});
  await page.reload();await page.locator('#homeRungs img').evaluate(el=>el.decode());
  assert.ok((await page.locator('#homeRungs img').getAttribute('src')).includes('purin-hanging'));
  await page.locator('[data-climber="kitty"]').click();await page.locator('#homeRungs img').evaluate(el=>el.decode());
  assert.equal(await page.evaluate(()=>JSON.parse(localStorage.getItem('math10_state')).climber),'kitty');
  await page.reload();assert.equal(await page.locator('[data-climber="kitty"]').getAttribute('aria-pressed'),'true');
  await page.locator('#quickBtn').click();await page.locator('#questRungs img').evaluate(el=>el.decode());
  await page.locator('#questRungs').screenshot({path:path.join(out,'kitty-before.png')});
  const position=()=>page.locator('#questRungs .monkey-climber').evaluate(el=>el.offsetLeft);
  const initial=await position();
  async function answer(n){for(const d of String(n)) await page.locator('[data-k="'+d+'"]').click();await page.locator('[data-k="go"]').click();}
  await answer(99);assert.equal(await position(),initial,'wrong answer does not advance character');
  const current=()=>page.evaluate(()=>{const p=JSON.parse(localStorage.getItem('math10_state')).pending;return p.problems[p.index].answer;});
  await answer(await current());
  assert.equal(await page.locator('#questRungs').getAttribute('aria-valuenow'),'1');
  assert.equal(await page.locator('#questRungs .monkey-climber').evaluate(el=>el.classList.contains('is-moving')),true);
  await page.locator('#questRungs').screenshot({path:path.join(out,'kitty-crossing.png')});
  await page.waitForTimeout(950);
  assert.ok(await position()>initial,'correct answer advances to next bar');
  await page.locator('#quitBtn').click();await page.reload();await page.locator('#startBtn').click();
  assert.equal(await page.locator('#questRungs').getAttribute('aria-valuenow'),'1');
  assert.ok((await page.locator('#questRungs img').getAttribute('src')).includes('kitty-hanging'));
  await answer(await current());await page.waitForTimeout(950);
  await answer(await current());
  // Completion is committed before the visual arrival finishes.
  assert.equal(await page.evaluate(()=>JSON.parse(localStorage.getItem('math10_state')).pending),null);
  assert.equal(await page.evaluate(()=>JSON.parse(localStorage.getItem('math10_state')).history.length),1);
  assert.equal(await page.locator('#questRungs').getAttribute('aria-valuenow'),'3');
  await page.waitForTimeout(700);
  await page.locator('#questRungs').screenshot({path:path.join(out,'kitty-arrived.png')});
  await page.locator('#capsule:not([hidden])').waitFor();
  // Long tracks pan inside their viewport; full-size characters stay visible at either end.
  await page.goto(base+'/math/');await page.setViewportSize({width:320,height:850});
  await page.evaluate(()=>MathPlayground.renderLadder(document.getElementById('homeRungs'),16,16,'테스트','purin'));
  await page.waitForTimeout(800);
  const bounds=await page.locator('#homeRungs').evaluate(box=>{
   const b=box.getBoundingClientRect(),i=box.querySelector('img').getBoundingClientRect();
   return {scroll:box.scrollLeft,left:i.left-b.left,right:i.right-b.right};
  });
  assert.ok(bounds.scroll>0);assert.ok(bounds.left>=0 && bounds.right<=1,'full sprite at final bar');
  assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);
  await page.locator('#homeRungs').screenshot({path:path.join(out,'purin-phone-finish.png')});
  await page.emulateMedia({reducedMotion:'reduce'});
  await page.evaluate(()=>MathPlayground.renderLadder(document.getElementById('homeRungs'),16,0,'테스트','kitty'));
  await page.evaluate(()=>MathPlayground.renderLadder(document.getElementById('homeRungs'),16,1,'테스트','kitty'));
  assert.equal(await page.locator('#homeRungs .hanging-body').evaluate(el=>getComputedStyle(el).animationName),'none');
  assert.equal(await page.locator('#homeRungs .monkey-climber').evaluate(el=>getComputedStyle(el).transitionDuration),'0s');
  assert.deepEqual(errors,[]);
  console.log(JSON.stringify({ok:true,checks:'character choice persistence, raised-hand assets, correct-answer travel, no travel on mistakes, resume, committed completion before arrival, narrow-screen tracking, reduced motion',screenshots:out}));
 } finally {await browser.close();server.close();}
})().catch(e=>{console.error(e);process.exitCode=1;server.close();});
