const {chromium}=require(process.env.PLAYWRIGHT_PATH||'C:/Users/김시현/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const fs=require('fs'),path=require('path'),http=require('http'),assert=require('assert/strict');
const root=path.resolve(__dirname,'../..'),out=path.resolve(root,'../math-party-qa');fs.mkdirSync(out,{recursive:true});
const server=http.createServer((req,res)=>{const pathname=decodeURIComponent(new URL(req.url,'http://localhost').pathname),file=path.resolve(root,'.'+pathname+(pathname.endsWith('/')?'index.html':''));if(!file.startsWith(root+path.sep)){res.writeHead(403);return res.end();}try{res.setHeader('Content-Type',({'.html':'text/html; charset=utf-8','.js':'application/javascript','.css':'text/css','.png':'image/png','.webp':'image/webp'})[path.extname(file)]||'application/octet-stream');res.end(fs.readFileSync(file));}catch{res.writeHead(404);res.end();}});
(async()=>{await new Promise(r=>server.listen(0,'127.0.0.1',r));const browser=await chromium.launch({headless:true});try{
const base=process.env.TEST_BASE||'http://127.0.0.1:'+server.address().port,errors=[];
const context=await browser.newContext({viewport:{width:1024,height:768},hasTouch:true,reducedMotion:'reduce',serviceWorkers:'block'}),page=await context.newPage();page.on('pageerror',e=>errors.push(e.message));
await page.goto(base+'/');await page.locator('#partyAdventure').waitFor();
await page.evaluate(()=>{localStorage.setItem('hub2_tickets','0');localStorage.setItem('math10_state',JSON.stringify({sentinel:'unchanged',level:4}));});
const protectedBefore=await page.evaluate(()=>Object.fromEntries(Object.entries(localStorage).filter(([k])=>k==='math10_state'||k.startsWith('hub2_'))));
await page.locator('#partyAdventure').click();await page.waitForURL('**/math/party/');await page.locator('#start').waitFor();
const state=()=>page.evaluate(()=>JSON.parse(localStorage.getItem('math10_party_v1')));
await page.screenshot({path:path.join(out,'welcome-ipad-landscape.png'),fullPage:true});
const partyBeforeParity=await state();
await page.locator('#welcome [data-open-parity]').click();
await page.locator('#parityDialog[open]').waitFor();
await page.locator('[data-parity-example="5"]').click();
await page.locator('#parityPair').click();await page.locator('#parityPair').click();
assert.match(await page.locator('#parityResult').innerText(),/5는 홀수/);
await page.locator('[data-parity-example="4"]').click();
for(let i=0;i<4;i++)await page.locator('#parityLess').click();
for(let n=0;n<=10;n++){
 assert.equal(await page.locator('.parity-cookie').count(),n);
 for(let i=0;i<Math.floor(n/2);i++)await page.locator('#parityPair').click();
 assert.equal(await page.locator('.cookie-pair').count(),Math.floor(n/2));
 assert.equal(await page.locator('.leftover .parity-cookie').count(),n%2);
 assert.equal(await page.locator('#parityResult').getAttribute('data-kind'),n%2?'odd':'even');
 assert.equal(await page.locator('#parityPair').isDisabled(),true);
 if(n<10)await page.locator('#parityMore').click();
}
assert.equal(await page.locator('#parityMore').isDisabled(),true);
await page.locator('[data-parity-example="5"]').click();
await page.locator('#parityPair').click();await page.locator('#parityPair').click();
for(const [w,h] of [[320,740],[390,844],[768,1024],[1024,768]]){
 await page.setViewportSize({width:w,height:h});
 const bounds=await page.locator('#parityDialog').evaluate(n=>({overflow:n.scrollWidth>n.clientWidth,w:n.getBoundingClientRect().width,h:n.getBoundingClientRect().height}));
 assert.equal(bounds.overflow,false,'parity dialog overflow '+w);assert.ok(bounds.w<=w&&bounds.h<=h);
 assert.deepEqual(await page.locator('#parityDialog button').evaluateAll(nodes=>nodes.filter(n=>{const r=n.getBoundingClientRect();return r.width<44||r.height<44}).map(n=>n.id)),[]);
 await page.screenshot({path:path.join(out,'parity-'+w+'.png'),fullPage:true});
}
await page.keyboard.press('Escape');assert.equal(await page.locator('#parityDialog').isVisible(),false);
assert.equal(await page.locator('#welcome [data-open-parity]').evaluate(n=>n===document.activeElement),true);
assert.deepEqual(await state(),partyBeforeParity,'exploration must preserve party progress');
await page.setViewportSize({width:1024,height:768});

await page.locator('button[data-theme=sky]').click();assert.equal((await state()).theme,'sky');
await page.locator('#start').click();await page.locator('#help').click();let s=await state();assert.equal(s.help[0],true);
await page.reload();assert.equal((await state()).help[0],true);
while((s=await state()).light.visual.a+s.placed<9)await page.locator('[data-power="1"]').click();
await page.locator('[data-power="3"]').click();assert.equal((await state()).mistakes[0],1);
await page.locator('[data-power="1"]').click();assert.equal(await page.locator('.scene-light.on').count(),10);
await page.screenshot({path:path.join(out,'lights-ipad.png'),fullPage:true});
await page.locator('#next').click();await page.locator('#parityInPlay').click();await page.locator('#parityClose').click();await page.locator('[data-pack]').click();assert.equal((await state()).mistakes[1],1);
await page.locator('[data-cookie="0"]').click();await page.reload();assert.deepEqual((await state()).selected,[0]);await page.locator('[data-cookie="0"]').click();
for(const [w,h] of [[320,740],[390,844],[768,1024],[900,768],[1024,768]]){
 await page.setViewportSize({width:w,height:h});
 assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false,'cookie overflow '+w);
 const clipped=await page.locator('.cookie').evaluateAll(nodes=>nodes.some(n=>{const r=n.getBoundingClientRect(),p=n.parentElement.getBoundingClientRect();return r.left<p.left-1||r.right>p.right+1}));assert.equal(clipped,false,'cookie fits tray '+w);
}
s=await state();for(let i=0;i<s.cookie.visual.cross;i++)await page.locator('[data-cookie="'+i+'"]').click();assert.equal(await page.locator('.cookie').count(),10);
await page.setViewportSize({width:768,height:1024});await page.screenshot({path:path.join(out,'cookies-ipad-portrait.png'),fullPage:true});
await page.locator('[data-pack]').click();await page.locator('#next').click();
s=await state();const a=s.cards[0],b=s.cards.find(c=>c.id!==a.id&&c.value+a.value!==10);await page.locator('[data-balloon="'+a.id+'"]').click();await page.locator('[data-balloon="'+b.id+'"]').click();assert.equal((await state()).mistakes[2],1);
await page.locator('[data-balloon="0"]').click();await page.reload();assert.equal(await page.locator('[data-balloon="0"]').getAttribute('aria-pressed'),'true');await page.locator('[data-balloon="1"]').click();await page.reload();assert.equal(await page.locator('.mini-balloon').count(),2);
await page.screenshot({path:path.join(out,'balloons-ipad.png'),fullPage:true});
for(let i=2;i<6;i+=2){await page.locator('[data-balloon="'+i+'"]').click();await page.locator('[data-balloon="'+(i+1)+'"]').click();}await page.locator('#next').click();
assert.equal((await state()).stage,3);await page.locator('#parityInPlay').click();await page.locator('#parityClose').click();assert.equal((await state()).history.length,3);await page.locator('#blow').click();assert.equal(await page.locator('.candles.out').count(),1);await page.locator('[data-cake=chocolate]').click();await page.locator('#dance').click();await page.locator('#pop').click();await page.locator('.toy-balloon').click();assert.equal(await page.locator('.toy-balloon').count(),0);
await page.reload();assert.equal(await page.locator('#partyActions').isVisible(),true);assert.equal((await state()).cake,'chocolate');
for(const [w,h] of [[320,740],[390,844],[768,1024],[1024,768],[1180,820],[1440,900]]){
 await page.setViewportSize({width:w,height:h});await page.evaluate(()=>scrollTo(0,0));
 assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false,'overflow '+w);
 const small=await page.locator('button:visible,a:visible').evaluateAll(nodes=>nodes.filter(n=>{const r=n.getBoundingClientRect();return r.width<44||r.height<44}).map(n=>n.outerHTML));assert.deepEqual(small,[],'touch targets '+w);
 await page.screenshot({path:path.join(out,'party-'+w+'.png'),fullPage:true});
}
assert.deepEqual(await page.evaluate(()=>Object.fromEntries(Object.entries(localStorage).filter(([k])=>k==='math10_state'||k.startsWith('hub2_')))),protectedBefore,'party must not change study or ticket state');
await page.locator('#replay').click();assert.equal(await page.locator('#welcome').isVisible(),true);assert.equal((await state()).history.length,3);
await page.locator('#start').click();await page.setViewportSize({width:320,height:740});assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);
await page.goto(base+'/math/parent.html');assert.match(await page.locator('#partyPracticeSummary').innerText(),/저장된 활동 3개/);
assert.deepEqual(errors,[]);await context.close();console.log('Party browser checks passed: ticket-free entry, parity 0–10 and modal accessibility, all 3 activities, retries, resume, separate records, free play, 6 viewports.');
}finally{await browser.close();server.close();}})().catch(e=>{console.error(e);process.exitCode=1;server.close();});
