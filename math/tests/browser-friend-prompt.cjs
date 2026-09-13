'use strict';
const {chromium}=require(process.env.PLAYWRIGHT_PATH || 'C:/Users/김시현/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const fs=require('fs'),path=require('path'),http=require('http'),assert=require('assert/strict');
const root=path.resolve(__dirname,'../..'),out=path.resolve(root,'../math-friend-prompt-qa');
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
  await page.clock.install();
  await page.goto(base+'/math/');
  await page.evaluate(()=>{const s=MathStore.defaults();s.name='재이';s.placed=true;s.level=4;s.climber='purin';localStorage.setItem(MathStore.KEY,JSON.stringify(s));});
  await page.reload();await page.locator('#quickBtn').click();
  assert.equal(await page.locator('#friendPrompt').isHidden(),true,'prompt starts hidden');
  await page.clock.fastForward(17000);
  assert.equal(await page.locator('#friendPrompt').isHidden(),true,'prompt waits before nudging');
  await page.locator('[data-k="1"]').click();
  await page.clock.fastForward(17000);
  assert.equal(await page.locator('#friendPrompt').isHidden(),true,'typing restarts the quiet timer');
  await page.clock.fastForward(1100);
  assert.equal(await page.locator('#friendPrompt').isVisible(),true,'one gentle prompt appears after a pause');
  const purinText=await page.locator('#friendPromptText').textContent();
  assert.match(purinText,/폼폼푸린.*도와줘/);assert.doesNotMatch(purinText,/빨리/);
  assert.equal(await page.locator('#questRungs .monkey-climber').evaluate(el=>el.classList.contains('waiting')),true);
  assert.ok(await page.locator('#friendHelpBtn').evaluate(el=>el.getBoundingClientRect().height)>=44,'help target is touch sized');
  assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false,'iPad layout does not overflow');
  await page.screenshot({path:path.join(out,'purin-asks-for-help.png'),fullPage:true});
  await page.locator('#friendHelpBtn').click();
  const helped=await page.evaluate(()=>JSON.parse(localStorage.getItem(MathStore.KEY)).pending);
  assert.equal(helped.firstTry,false);assert.ok(helped.hintStep>=2,'friend button opens the visual help step');
  assert.equal(await page.locator('#friendPrompt').isHidden(),true);
  assert.equal(await page.locator('#questRungs .monkey-climber').evaluate(el=>el.classList.contains('waiting')),false);

  await page.evaluate(()=>{const s=JSON.parse(localStorage.getItem(MathStore.KEY));s.pending=null;s.climber='kitty';s.friendPrompts=true;localStorage.setItem(MathStore.KEY,JSON.stringify(s));});
  await page.reload();await page.locator('#quickBtn').click();await page.clock.fastForward(18100);
  assert.match(await page.locator('#friendPromptText').textContent(),/^키티:/,'selected character speaks');

  await page.goto(base+'/math/parent.html');
  await page.locator('#friendPrompts').selectOption('0');await page.locator('#saveBtn').click();
  assert.equal(await page.evaluate(()=>JSON.parse(localStorage.getItem(MathStore.KEY)).friendPrompts),false,'parent can disable prompts');
  await page.evaluate(()=>{const s=JSON.parse(localStorage.getItem(MathStore.KEY));s.pending=null;localStorage.setItem(MathStore.KEY,JSON.stringify(s));});
  await page.goto(base+'/math/');await page.locator('#quickBtn').click();await page.clock.fastForward(19000);
  assert.equal(await page.locator('#friendPrompt').isHidden(),true,'disabled prompt stays hidden');
  assert.deepEqual(errors,[]);
  console.log(JSON.stringify({ok:true,checks:'18-second pause, input reset, gentle copy, visual hint, selected character, parent off switch, iPad layout',screenshots:out}));
 } finally {await browser.close();server.close();}
})().catch(e=>{console.error(e);process.exitCode=1;server.close();});
