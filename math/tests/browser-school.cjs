const {chromium}=require(process.env.PLAYWRIGHT_PATH||'C:/Users/김시현/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const fs=require('fs'),path=require('path'),http=require('http'),assert=require('assert/strict');
const root=path.resolve(__dirname,'../..'),out=path.resolve(root,'../math-school-qa');fs.mkdirSync(out,{recursive:true});
const server=http.createServer((req,res)=>{const pathname=decodeURIComponent(new URL(req.url,'http://localhost').pathname),file=path.resolve(root,'.'+pathname+(pathname.endsWith('/')?'index.html':''));if(!file.startsWith(root+path.sep)){res.writeHead(403);return res.end();}try{res.setHeader('Content-Type',({'.html':'text/html; charset=utf-8','.js':'application/javascript','.css':'text/css','.png':'image/png','.webp':'image/webp'})[path.extname(file)]||'application/octet-stream');res.end(fs.readFileSync(file));}catch{res.writeHead(404);res.end();}});
(async()=>{await new Promise(r=>server.listen(0,'127.0.0.1',r));const browser=await chromium.launch({headless:true});try{
 const base=process.env.TEST_BASE||'http://127.0.0.1:'+server.address().port,errors=[],context=await browser.newContext({viewport:{width:1024,height:768},hasTouch:true,serviceWorkers:'block'}),page=await context.newPage();page.on('pageerror',e=>errors.push(e.message));
 await page.goto(base+'/math/');await page.locator('#setup a[href="school/"]').waitFor();
 await page.locator('#setup a[href="school/"]').click();await page.waitForURL('**/math/school/');
 await page.evaluate(()=>{localStorage.setItem('math10_state','keep learning');localStorage.setItem('math10_party_v1','keep party');localStorage.setItem('hub2_tickets','7');});
 const snapshot=()=>page.evaluate(()=>JSON.parse(localStorage.getItem('math10_school_v1')));
 await page.screenshot({path:path.join(out,'menu-ipad.png'),fullPage:true});
 await page.locator('#startFull').click();
 async function answer(q,correct=true){
  if(q.mode==='fields'){for(let i=0;i<q.inputs.length;i++){const loc=page.locator('[data-answer="'+i+'"]');if(q.inputs[i].options)await loc.selectOption(correct?q.answers[i]:q.inputs[i].options.find(x=>x!==q.answers[i]));else await loc.fill(correct?q.answers[i]:'999');}}
  else for(const value of correct?q.answers:[String(q.options.findIndex((_,i)=>!q.answers.includes(String(i))))])await page.locator('#answers input[value="'+value+'"]').check();
 }
 for(let type=0;type<20;type++){
  const q=await page.evaluate(()=>{const s=JSON.parse(localStorage.getItem('math10_school_v1')).session;return SchoolQuestions.question(s.order[s.index],s.seed);});assert.equal(q.type,type);
  if(type===0){await page.locator('#check').click();assert.match(await page.locator('#feedback').innerText(),/빈칸/);await answer(q,false);await page.locator('#check').click();await page.reload();await page.locator('#resume').click();assert.equal((await snapshot()).session.attempts,1);await page.locator('#hint').click();await page.reload();await page.locator('#resume').click();assert.equal((await snapshot()).session.help,true);}
  if(type===5||type===13){await page.locator('#reason').fill('<내 생각> 두 자리 수를 만들었어요.');await page.reload();await page.locator('#resume').click();assert.match(await page.locator('#reason').inputValue(),/내 생각/);}
  if([1,2,9,13,17,18].includes(type)){
   for(const [w,h] of [[320,740],[768,1024],[1024,768]]){await page.setViewportSize({width:w,height:h});assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false,'overflow type '+type+' '+w);await page.screenshot({path:path.join(out,'type-'+type+'-'+w+'.png'),fullPage:true});}
  }
  if(type===11){await page.locator('#reveal').click();assert.equal((await snapshot()).session.results.at(-1).correct,false);}
  else {await answer(q);await page.locator('#check').click();}
  assert.equal(await page.locator('#next').isVisible(),true,'next type '+type);
  assert.equal((await snapshot()).session.results.length,type+1);
  if(type===10){await page.reload();await page.locator('#resume').click();assert.equal((await snapshot()).session.results.length,11);}
  await page.locator('#next').click();
 }
 await page.locator('#result:not([hidden])').waitFor();assert.equal((await snapshot()).history.length,1);assert.equal((await snapshot()).history[0].total,20);assert.equal((await snapshot()).history[0].independent,18);assert.equal((await snapshot()).history[0].helped,2);
 await page.screenshot({path:path.join(out,'result-ipad.png'),fullPage:true});await page.reload();await page.locator('#lastResult').click();assert.equal((await snapshot()).history.length,1);
 assert.deepEqual(await page.evaluate(()=>['math10_state','math10_party_v1','hub2_tickets'].map(k=>localStorage.getItem(k))),['keep learning','keep party','7']);
 await page.locator('#backMenu').click();await page.locator('#group').selectOption('parity');await page.locator('#startShort').click();assert.equal((await snapshot()).session.order.length,4);
 await page.locator('#pause').click();await page.locator('#finishEarly').click();await page.reload();assert.equal(await page.locator('#newOptions').isVisible(),true,'finished early can start afresh');
 assert.equal((await snapshot()).history.length,2);
 await page.goto(base+'/math/parent.html');assert.match(await page.locator('#schoolPracticeSummary').innerText(),/마친 연습 2회/);
 assert.deepEqual(errors,[]);console.log('School practice passed: 20 formats, all input modes, hints/retries/resume, explanations, separate records, mobile/iPad.');
 await context.close();
 }finally{await browser.close();server.close();}})().catch(e=>{console.error(e);process.exitCode=1;server.close();});
