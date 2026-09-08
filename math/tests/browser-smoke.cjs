'use strict';
const {chromium}=require(process.env.PLAYWRIGHT_PATH || 'C:/Users/김시현/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const fs=require('fs'),path=require('path'),http=require('http'),assert=require('assert/strict');
const root=path.resolve(__dirname,'../..'),out=path.resolve(root,'../math-playground-qa');
fs.mkdirSync(out,{recursive:true});
const mime={'.html':'text/html; charset=utf-8','.js':'application/javascript','.css':'text/css','.png':'image/png','.webp':'image/webp','.svg':'image/svg+xml'};
const server=http.createServer((req,res)=>{
 const url=new URL(req.url,'http://localhost'),pathname=decodeURIComponent(url.pathname),file=path.resolve(root,'.'+pathname+(pathname.endsWith('/')?'index.html':''));
 if(!file.startsWith(root+path.sep)){res.writeHead(403);res.end();return;}
 try{res.setHeader('Content-Type',mime[path.extname(file)]||'application/octet-stream');res.end(fs.readFileSync(file));}catch{res.writeHead(404);res.end();}
});
(async()=>{
 await new Promise(r=>server.listen(0,'127.0.0.1',r));
 const browser=await chromium.launch({headless:true}),errors=[];
 try {
  const base=process.env.TEST_BASE || 'http://127.0.0.1:'+server.address().port;
  const context=await browser.newContext({viewport:{width:390,height:844},deviceScaleFactor:1,serviceWorkers:'block'});
  const page=await context.newPage();page.on('pageerror',e=>errors.push(e.message));
  await page.goto(base+'/math/');await page.locator('#quickSetupBtn').waitFor();
  await page.screenshot({path:path.join(out,'welcome-mobile.png')});
  await page.locator('#setupName').fill('재이');await page.locator('#quickSetupBtn').click();
  await page.locator('#quiz:not([hidden])').waitFor();
  const state=()=>page.evaluate(()=>JSON.parse(localStorage.getItem('math10_state')));
  async function answer(value) {for(const n of String(value))await page.locator('[data-k="'+n+'"]').click();await page.locator('[data-k="go"]').click();}
  let st=await state();assert.equal(st.pending.problems.length,3);
  assert.match(await page.locator("#quizMission").innerText(),/구름사다리/);
  const completed=await page.locator(".rung.done").count();
  await answer(99);
  assert.equal(await page.locator(".rung.done").count(),completed,"wrong answer preserves progress");
  assert.equal(await page.locator('#retryBtn').isVisible(),false,'first error must not reveal model answer');
  assert.ok(await page.locator('#explain').isVisible());assert.equal((await state()).pending.firstTry,false);
  await page.locator('#togetherBtn').click();assert.ok(await page.locator('#mathPlay').isVisible());
  await page.locator('.math-block:not([disabled])').first().click();
  await page.screenshot({path:path.join(out,'hint-mobile.png')});
  await page.reload();await page.locator('#startBtn').click();
  assert.equal((await state()).pending.firstTry,false,'reload cannot erase assistance');
  st=await state();await answer(st.pending.problems[st.pending.index].answer);
  await page.waitForTimeout(1000);st=await state();assert.equal(st.pending.index,1);
  assert.equal(await page.locator(".rung.done").count(),1);
  const coins=st.coins;await page.locator('#quitBtn').click();await page.locator('#startBtn').click();
  assert.equal((await state()).coins,coins,'resume must not duplicate coins');
  for(let i=0;i<2;i++){st=await state();await answer(st.pending.problems[st.pending.index].answer);await page.waitForTimeout(1000);}
  await page.locator('#capsule:not([hidden])').waitFor();await page.locator('.cap').first().click();
  await page.locator('#result:not([hidden])').waitFor();
  st=await state();assert.equal(st.pending,null);assert.equal(st.garden,3);assert.equal(st.history.length,1);
  await page.screenshot({path:path.join(out,'result-mobile.png')});
  await page.locator('#doneBtn').click();await page.screenshot({path:path.join(out,'home-mobile.png'),fullPage:true});
  assert.equal(await page.locator('[data-spot="bars"]').getAttribute('aria-pressed'),'true');
  assert.doesNotMatch(await page.locator('#home').innerText(),/정원|꽃씨|새싹|꽃밭/);
  await page.locator('[data-spot="slide"]').click();assert.match(await page.locator('#startBtn').innerText(),/미끄럼틀/);
  await page.reload();assert.equal((await state()).playgroundSpot,'slide');
  await page.locator('[data-spot="bars"]').click();
  await page.setViewportSize({width:320,height:740});
  assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false,'no 320px overflow');
  await page.screenshot({path:path.join(out,'home-small.png')});
  await page.setViewportSize({width:390,height:844});
  const overflow=await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth);assert.equal(overflow,false,'no mobile overflow');
  const startBox=await page.locator('#startBtn').boundingBox();assert.ok(startBox.y+startBox.height<844,'start action above fold');
  await page.locator('#wardrobeBtn').click();await page.locator('.portrait').first().click();
  const wish=await page.locator('#wishSelect option').nth(1).getAttribute('value');await page.locator('#wishSelect').selectOption(wish);assert.equal((await state()).wish,wish);
  await page.screenshot({path:path.join(out,'wardrobe-mobile.png'),fullPage:true});
  await page.locator('#wardrobeBack').click();await page.setViewportSize({width:1280,height:900});
  await page.screenshot({path:path.join(out,'home-desktop.png'),fullPage:true});
  await page.goto(base+'/math/parent.html');await page.locator('#skillList .skill-item').first().waitFor();
  assert.doesNotMatch(await page.locator('body').innerText(),/안정이 되어야 자동화/);
  await page.screenshot({path:path.join(out,'parent-desktop.png'),fullPage:true});
  // Existing-device migration and a scaffold followed by a delayed new example.
  await page.evaluate(()=>{const s=MathStore.defaults();s.name='재이';s.level=9;s.placed=true;s.perSession=8;s.coins=123;s.garden=27;delete s.playgroundSpot;s.owned={'dress/party':true};s.album=[{id:'elsa',date:'2026-09-07',r:1}];localStorage.setItem(MathStore.KEY,JSON.stringify(s));});
  await page.goto(base+'/math/');assert.equal((await state()).coins,123);assert.ok((await state()).owned['dress/party']);assert.equal((await state()).garden,27);assert.equal(await page.locator('[data-spot="bars"]').getAttribute('aria-pressed'),'true');
  await page.locator('#startBtn').click();st=await state();await answer(st.pending.problems[0].answer);await page.waitForTimeout(950);
  await page.locator('#togetherBtn').click();assert.ok(await page.locator('.ten-frame').isVisible());
  await page.screenshot({path:path.join(out,'carry-desktop.png')});
  st=await state();const helped=st.pending.problems[st.pending.index];await answer(helped.answer);await page.waitForTimeout(950);
  st=await state();const transfer=st.pending.problems.find(p=>p.transfer);assert.ok(transfer);assert.equal(transfer.type,helped.type);assert.notEqual(transfer.key,helped.key);
  assert.equal(st.pending.problems.length,9,'only one transfer check added');
  // First-time diagnosis remains available.
  await page.evaluate(()=>localStorage.clear());await page.goto(base+'/math/');await page.locator('#setupBtn').click();
  assert.ok(await page.locator('#count').innerText().then(t=>t.includes('실력 확인')));
  assert.equal(await page.locator('#hintBtn').isVisible(),false);
  assert.deepEqual(errors,[]);console.log(JSON.stringify({ok:true,checks:'onboarding, 3-question completion, progressive hints, block interaction, reload/resume, rewards, wardrobe, parent, migration, transfer, diagnosis',screenshots:out}));
 } finally {await browser.close();server.close();}
})().catch(e=>{console.error(e);process.exitCode=1;server.close();});
