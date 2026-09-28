'use strict';
const {chromium}=require(process.env.PLAYWRIGHT_PATH || 'C:/Users/김시현/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const fs=require('fs'),path=require('path'),http=require('http'),assert=require('assert/strict');
const root=path.resolve(__dirname,'../..'),out=path.resolve(root,'../math-story-qa');
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
 try{
  const base=process.env.TEST_BASE||'http://127.0.0.1:'+server.address().port,report=[];
  for(const [name,width,height] of [['phone',390,844],['small-phone',320,740],['ipad',820,1180],['desktop',1280,900]]){
   const context=await browser.newContext({viewport:{width,height},hasTouch:name!=='desktop',serviceWorkers:'block'});
   const page=await context.newPage(),errors=[];page.on('pageerror',e=>errors.push(e.message));
   await page.goto(base+'/math/');
   await page.evaluate(()=>{const s=MathStore.defaults();s.name='재이';s.placed=true;s.level=4;s.coins=17;localStorage.setItem(MathStore.KEY,JSON.stringify(s));});
   await page.reload();await page.locator('.story-launch').click();
   assert.match(page.url(),/\/math\/story\//,name+': story opens from home');
   const initial=await page.evaluate(()=>localStorage.getItem(MathStore.KEY));
   const p=await page.evaluate(()=>MathSwingStory.plan(MathStore.today()));
   assert.equal(await page.locator('.story-steps [aria-current="step"]').count(),1);
   await page.locator('[data-action="pair"]').click();
   assert.equal(await page.locator('.story-swing').count(),1);
   await page.reload();assert.equal(await page.locator('.story-swing').count(),1,name+': pairing resumes');
   for(let i=1;i<Math.floor(p.count/2);i++)await page.locator('[data-action="pair"]').click();
   const waiting=await page.locator('.waiting-friends .story-friend').count();
   assert.equal(waiting,p.count%2,name+': visually correct leftover');
   await page.screenshot({path:path.join(out,name+'-paired.png'),fullPage:true});
   await page.locator('[data-action="teach"]').click();
   const agreement=p.claimEven===(p.count%2===0);
   await page.locator('[data-action="'+(agreement?'disagree':'agree')+'"]').click();
   assert.ok(await page.locator('#storyNotice').textContent());
   assert.ok(await page.locator('[data-action="agree"]').isVisible(),name+': mistake allows retry');
   await page.locator('[data-action="'+(agreement?'agree':'disagree')+'"]').click();
   assert.ok(await page.locator('[data-action="even"]').isVisible());
   await page.screenshot({path:path.join(out,name+'-new-number.png'),fullPage:true});
   const transferEven=p.transfer%2===0;
   await page.locator('[data-action="'+(transferEven?'even':'odd')+'"]').click();
   assert.ok(await page.locator('[data-action="none"]').isVisible());
   await page.locator('[data-action="'+(transferEven?'none':'one')+'"]').click();
   assert.ok(await page.locator('.story-finish').isVisible());
   assert.equal(await page.evaluate(()=>localStorage.getItem(MathStore.KEY)),initial,name+': existing learning record untouched');
   assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false,name+': no horizontal overflow');
   const targets=await page.locator('.story-button').evaluateAll(els=>els.map(el=>el.getBoundingClientRect().height));
   assert.ok(targets.every(n=>n>=44),name+': touch targets');
   await page.reload();assert.ok(await page.locator('.story-finish').isVisible(),name+': completion resumes');
   await page.goto(base+'/math/');assert.match(await page.locator('.story-launch').textContent(),/오늘의 짝꿍 그네 완료/);
   await page.locator('.story-launch').click();
   await page.locator('[data-action="replay"]').click();assert.ok(await page.locator('[data-action="pair"]').isVisible());
   assert.deepEqual(errors,[],name+': no page errors');
   report.push(name);await context.close();
  }
  console.log(JSON.stringify({ok:true,checked:report,screenshots:out}));
 }finally{await browser.close();server.close();}
})().catch(e=>{console.error(e);process.exitCode=1;server.close();});
