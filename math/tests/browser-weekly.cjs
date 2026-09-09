const {chromium}=require(process.env.PLAYWRIGHT_PATH||'C:/Users/김시현/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const fs=require('fs'),path=require('path'),http=require('http'),assert=require('assert/strict');
const root=path.resolve(__dirname,'../..'),out=path.resolve(root,'../math-weekly-qa');fs.mkdirSync(out,{recursive:true});
const server=http.createServer((req,res)=>{const pathname=decodeURIComponent(new URL(req.url,'http://localhost').pathname),file=path.resolve(root,'.'+pathname+(pathname.endsWith('/')?'index.html':''));if(!file.startsWith(root+path.sep)){res.writeHead(403);return res.end();}try{res.setHeader('Content-Type',({'.html':'text/html; charset=utf-8','.js':'application/javascript','.css':'text/css','.png':'image/png','.webp':'image/webp'})[path.extname(file)]||'application/octet-stream');res.end(fs.readFileSync(file));}catch{res.writeHead(404);res.end();}});
(async()=>{await new Promise(r=>server.listen(0,'127.0.0.1',r));const browser=await chromium.launch({headless:true});try{
 const base=process.env.TEST_BASE||'http://127.0.0.1:'+server.address().port,errors=[],context=await browser.newContext({viewport:{width:1024,height:768},hasTouch:true,serviceWorkers:'block'}),page=await context.newPage();page.on('pageerror',e=>errors.push(e.message));
 await page.goto(base+'/math/school/');await page.evaluate(()=>{localStorage.setItem('math10_state',JSON.stringify({level:4,sentinel:'keep'}));localStorage.setItem('math10_school_v1',JSON.stringify({version:1,covered:[2,5,10,17,18]}));localStorage.setItem('math10_party_v1','keep party');});
 const preserved=await page.evaluate(()=>['math10_state','math10_school_v1','math10_party_v1'].map(k=>localStorage.getItem(k)));
 await page.locator('a[href="weekly.html"]').click();await page.waitForURL('**/weekly.html');
 const snapshot=()=>page.evaluate(()=>JSON.parse(localStorage.getItem('math10_weekly_v1')));
 await page.locator('#settingsPanel summary').click();await page.locator('#weekday').selectOption(String(await page.evaluate(()=>new Date().getDay())));await page.locator('#count').selectOption('5');await page.locator('#source').selectOption('manual');
 for(const type of [2,5,10,17,18])await page.locator('#typeChecks input[value="'+type+'"]').check();
 await page.locator('#settingsForm button[type=submit]').click();assert.deepEqual(errors,[]);await page.screenshot({path:path.join(out,'settings-ipad.png'),fullPage:true});
 await page.locator('#startExam').click();const frozen=(await snapshot()).exams[0].questions;
 assert.equal(await page.locator('#hint,#reveal,#solution').count(),0,'exam offers no hints or solutions');
 async function fill(q,correct=true){if(q.mode==='fields'){for(let i=0;i<q.inputs.length;i++){const loc=page.locator('[data-answer="'+i+'"]');if(q.inputs[i].options)await loc.selectOption(correct?q.answers[i]:q.inputs[i].options.find(x=>x!==q.answers[i]));else await loc.fill(correct?q.answers[i]:'999');}}else{for(const input of await page.locator('#answers input[type=checkbox]').all())await input.uncheck();for(const v of correct?q.answers:[String(q.options.findIndex((_,i)=>!q.answers.includes(String(i))))])await page.locator('#answers input[value="'+v+'"]').check();}}
 for(let i=0;i<4;i++){
  await fill(frozen[i],i!==0);if(frozen[i].reason)await page.locator('#reason').fill('십의 자리와 일의 자리를 나누어 생각했어요.');
  if(i===1){await page.reload();await page.locator('#resumeExam').click();assert.equal((await snapshot()).exams[0].index,1);assert.deepEqual((await snapshot()).exams[0].questions,frozen);}
  assert.equal((await snapshot()).exams[0].submittedAt,null);
  await page.locator('#next').click();
 }
 for(const [w,h] of [[320,740],[768,1024],[1024,768]]){
  await page.setViewportSize({width:w,height:h});assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false,'weekly overflow '+w);
  assert.deepEqual(await page.locator('button:visible,a:visible').evaluateAll(nodes=>nodes.filter(n=>{const r=n.getBoundingClientRect();return r.width<44||r.height<44}).map(n=>n.id)),[]);
  await page.screenshot({path:path.join(out,'exam-'+w+'.png'),fullPage:true});
 }
 await page.locator('#reviewSubmit').click();assert.match(await page.locator('#missingNote').innerText(),/1개/);
 await page.locator('#answerOverview button').first().click();await fill(frozen[0],true);
 await page.locator('#reviewSubmit').click();assert.equal(await page.locator('#score').isVisible(),false);
 await page.locator('#submitFinal').click();assert.match(await page.locator('#score').innerText(),/80점/);assert.equal((await snapshot()).exams.length,1);
 await page.screenshot({path:path.join(out,'result-ipad.png'),fullPage:true});const submitted=(await snapshot()).exams[0];
 await page.reload();assert.equal(await page.locator('#startExam').isVisible(),false);assert.equal(await page.locator('#thisResult').isVisible(),true);await page.locator('#thisResult').click();assert.deepEqual((await snapshot()).exams[0],submitted);
 const tab=await context.newPage();await tab.goto(base+'/math/school/weekly.html');assert.equal(await tab.locator('#startExam').isVisible(),false);await tab.close();
 assert.deepEqual(await page.evaluate(()=>['math10_state','math10_school_v1','math10_party_v1'].map(k=>localStorage.getItem(k))),preserved);
 await page.goto(base+'/math/parent.html');assert.match(await page.locator('#weeklySummary').innerText(),/최근 시험 80점/);
 assert.deepEqual(errors,[]);
 await context.close();
 // A separate device can choose the actual playground stage without touching its level.
 const ctx2=await browser.newContext({viewport:{width:768,height:1024},serviceWorkers:'block'}),p2=await ctx2.newPage();await p2.goto(base+'/math/school/weekly.html');
 await p2.evaluate(()=>localStorage.setItem('math10_state',JSON.stringify({level:4})));
 await p2.locator('#settingsPanel summary').click();await p2.locator('#weekday').selectOption(String(await p2.evaluate(()=>new Date().getDay())));await p2.locator('#source').selectOption('level');await p2.locator('#settingsForm button[type=submit]').click();
 await p2.locator('#startExam').click();assert.match(await p2.locator('#frozenScope').innerText(),/4단계/);
 assert.ok(await p2.evaluate(()=>JSON.parse(localStorage.getItem('math10_weekly_v1')).exams[0].questions.every(q=>['level-4','level-3'].includes(q.group))));
 await p2.evaluate(()=>{const set=Storage.prototype.setItem;Storage.prototype.setItem=function(k,v){if(k==='math10_weekly_v1')throw Error('quota');return set.call(this,k,v);};});
 await p2.locator('[data-answer="0"]').fill('99');assert.match(await p2.locator('#storageNote').innerText(),/저장이 어려워요/);
 await p2.locator('#pause').click();await p2.locator('#resumeExam').click();assert.equal(await p2.locator('[data-answer="0"]').inputValue(),'99');
 await ctx2.close();console.log('Weekly browser passed: settings, frozen scope, editable saved answers, no hints before submit, unanswered review, final grading, one attempt, history, parent report, iPad/mobile.');
 }finally{await browser.close();server.close();}})().catch(e=>{console.error(e);process.exitCode=1;server.close();});
