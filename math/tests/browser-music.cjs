'use strict';
const {chromium}=require(process.env.PLAYWRIGHT_PATH||'C:/Users/김시현/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const fs=require('fs'),path=require('path'),http=require('http'),assert=require('assert/strict');
const root=path.resolve(__dirname,'../..'),out=path.resolve(root,'../math-music-qa');fs.mkdirSync(out,{recursive:true});
const mime={'.html':'text/html; charset=utf-8','.js':'application/javascript','.css':'text/css','.png':'image/png','.webp':'image/webp','.svg':'image/svg+xml'};
const server=http.createServer((req,res)=>{
 const url=new URL(req.url,'http://localhost'),pathname=decodeURIComponent(url.pathname),file=path.resolve(root,'.'+pathname+(pathname.endsWith('/')?'index.html':''));
 if(!file.startsWith(root+path.sep)){res.writeHead(403);res.end();return;}
 try{res.setHeader('Content-Type',mime[path.extname(file)]||'application/octet-stream');res.end(fs.readFileSync(file));}catch{res.writeHead(404);res.end();}
});
(async()=>{
 await new Promise(r=>server.listen(0,'127.0.0.1',r));const browser=await chromium.launch({headless:true});
 try{
  const context=await browser.newContext({viewport:{width:390,height:844},serviceWorkers:'block'});
  await context.addInitScript(()=>{
   window.__audio={contexts:0,oscillators:0,starts:0,ramps:[]};
   class Param{constructor(){this.value=.0001;}cancelScheduledValues(){}setValueAtTime(v){this.value=v;}exponentialRampToValueAtTime(v,t){this.value=v;window.__audio.ramps.push([v,t]);}}
   window.AudioContext=class{constructor(){window.__audio.contexts++;this.currentTime=0;this.state='running';this.destination={};}createGain(){return{gain:new Param(),connect(){}};}createOscillator(){window.__audio.oscillators++;return{type:'sine',frequency:new Param(),connect(){},start(){window.__audio.starts++;},stop(){}};}resume(){return Promise.resolve();}};
   window.webkitAudioContext=window.AudioContext;
  });
  const page=await context.newPage(),errors=[];page.on('pageerror',e=>errors.push(e.message));
  const base=process.env.TEST_BASE||'http://127.0.0.1:'+server.address().port;
  await page.goto(base+'/math/');
  await page.evaluate(()=>{const s=MathStore.defaults();s.name='재이';s.placed=true;s.level=4;localStorage.setItem(MathStore.KEY,JSON.stringify(s));});
  await page.reload();
  assert.equal(await page.locator('#musicBtn').getAttribute('aria-pressed'),'false');
  assert.match(await page.locator('#musicBtn').innerText(),/켜기/);
  assert.equal((await page.evaluate(()=>window.__audio)).contexts,0,'no autoplay');
  await page.locator('#musicBtn').click();
  let audio=await page.evaluate(()=>window.__audio);
  assert.equal(await page.locator('#musicBtn').getAttribute('aria-pressed'),'true');
  assert.equal(await page.evaluate(()=>JSON.parse(localStorage.getItem(MathStore.KEY)).music),true);
  assert.ok(audio.starts>0,'user gesture starts synthesized music');
  await page.screenshot({path:path.join(out,'music-on-phone.png'),fullPage:true});
  await page.locator('#quickBtn').click();
  const before=(await page.evaluate(()=>window.__audio)).starts;
  const answer=await page.evaluate(()=>{const p=JSON.parse(localStorage.getItem(MathStore.KEY)).pending;return p.problems[p.index].answer;});
  for(const digit of String(answer))await page.locator('[data-k="'+digit+'"]').click();
  await page.locator('[data-k="go"]').click();
  assert.ok((await page.evaluate(()=>window.__audio)).starts>before,'correct answer adds a quiet two-note cue');
  await page.locator('#quitBtn').click();
  await page.reload();
  assert.equal(await page.locator('#musicBtn').getAttribute('aria-pressed'),'true');
  assert.equal((await page.evaluate(()=>window.__audio)).contexts,0,'remembered choice still waits for a gesture after reload');
  await page.locator('#startBtn').click();
  assert.ok((await page.evaluate(()=>window.__audio)).starts>0,'first normal gesture resumes remembered music');
  await page.locator('#quitBtn').click();await page.locator('#musicBtn').click();
  assert.equal(await page.evaluate(()=>JSON.parse(localStorage.getItem(MathStore.KEY)).music),false);
  assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);
  await page.goto(base+'/math/parent.html');await page.locator('#music').selectOption('1');await page.locator('#saveBtn').click();
  assert.equal(await page.evaluate(()=>JSON.parse(localStorage.getItem(MathStore.KEY)).music),true);
  assert.deepEqual(errors,[]);
  console.log(JSON.stringify({ok:true,checks:'opt-in, no autoplay, synthesized notes, quiet answer cue, persisted choice, gesture resume, off switch, parent control, phone layout',screenshots:out}));
 }finally{await browser.close();server.close();}
})().catch(e=>{console.error(e);process.exitCode=1;server.close();});
