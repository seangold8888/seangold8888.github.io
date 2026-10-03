'use strict';
// Browser lifecycle tests use a controllable recognizer, not a real microphone.
// They verify recovery UI, final-result scoring, and preserved book/ticket data.
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),http=require('node:http');
const {chromium}=require('playwright');
const root=path.resolve(__dirname,'..');
const server=http.createServer((req,res)=>{
 const u=decodeURIComponent(new URL(req.url,'http://local').pathname),f=path.resolve(root,'.'+u+(u.endsWith('/')?'index.html':''));
 if(!f.startsWith(root+path.sep)){res.writeHead(403).end();return;}
 fs.readFile(f,(e,b)=>{if(e){res.writeHead(404).end();return;}res.writeHead(200,{'Content-Type':f.endsWith('.html')?'text/html; charset=utf-8':f.endsWith('.js')?'text/javascript; charset=utf-8':'application/octet-stream','Cache-Control':'no-store'}).end(b);});
});
(async()=>{
 await new Promise(r=>server.listen(0,'127.0.0.1',r));const base='http://127.0.0.1:'+server.address().port;
 const browser=await chromium.launch({channel:'msedge',headless:true});
 try{
  for(const profile of [
   {name:'desktop',viewport:{width:1180,height:820}},
   {name:'ipad',viewport:{width:820,height:1180},hasTouch:true,userAgent:'Mozilla/5.0 (iPad; CPU OS 18_0 like Mac OS X) AppleWebKit/605.1.15 Version/18.0 Mobile/15E148 Safari/604.1'},
   {name:'phone',viewport:{width:390,height:844},hasTouch:true,userAgent:'Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 Version/18.0 Mobile/15E148 Safari/604.1'}
  ]){
   const {name,...options}=profile;
   const context=await browser.newContext({...options,serviceWorkers:'block'}),page=await context.newPage(),errors=[];
   page.on('pageerror',e=>errors.push(e.message));
   await page.clock.install();
   await context.addInitScript(()=>{
    const d=new Date(),day=d.getFullYear()+'-'+(d.getMonth()+1)+'-'+d.getDate();
    localStorage.setItem('hub2_date',day);localStorage.setItem('hub2_solved','0');localStorage.setItem('hub2_credit','0');localStorage.setItem('hub2_parent_mode','0');
    window.__mic={instances:[],requests:0,closed:0,stall:false};
    Object.defineProperty(navigator,'mediaDevices',{configurable:true,value:{getUserMedia:async()=>{__mic.requests++;return {getTracks:()=>[{stop(){__mic.closed++;}}]};}}});
    class Recognition{
     constructor(){__mic.instances.push(this);}
     start(){this.live=true;if(!__mic.stall)this.onstart?.();}
     abort(){this.live=false;}
     stop(){if(this.flush){this.result(this.flush);this.end();}}
     end(){this.live=false;this.onend?.();}
     result(text,final=true){this.onresult?.({results:[Object.assign([{transcript:text}],{isFinal:final})]});}
     error(error){this.onerror?.({error});}
    }
    window.SpeechRecognition=Recognition;window.AudioContext=undefined;window.webkitAudioContext=undefined;
   });
   await page.goto(base+'/game/');await page.locator('.reading-sentence').waitFor();
   const before=await page.evaluate(()=>({solved:localStorage.hub2_solved,credit:localStorage.hub2_credit,book:localStorage.hub2_book_cursor,review:localStorage.hub2_wrongbook}));
   const text=await page.locator('.reading-sentence').getAttribute('aria-label'),words=text.split(/\s+/);
   const mic=()=>page.locator('.reading-actions button').first();
   await mic().click();await page.evaluate(()=>__mic.instances.at(-1).error('no-speech'));
   assert(await page.getByRole('button',{name:'🎤 마이크 다시 켜기',exact:true}).isVisible());
   assert(await page.getByRole('button',{name:'마이크가 안 돼요 · 다른 문제 풀기',exact:true}).isVisible());
   assert.equal(await page.locator('.reading-word.retry').count(),0);
   await page.getByRole('button',{name:'🎤 마이크 다시 켜기',exact:true}).click();
   await page.clock.runFor(400);await page.waitForFunction(()=>__mic.closed===1&&__mic.instances.length===2);
   await page.evaluate(prefix=>{__mic.instances.at(-1).result(prefix);__mic.instances.at(-1).end();},words.slice(0,1).join(' '));
   assert.equal(await mic().innerText(),'🎤 이어 읽기');
   await mic().click();await page.evaluate(t=>__mic.instances.at(-1).result(t,false),words.slice(1).join(' '));
   assert.equal(await page.evaluate(()=>localStorage.hub2_solved),'0','interim tail must never award a pass');
   // Deliberately switch to alternative study: neither book cursor nor score advances.
   await page.evaluate(()=>__mic.instances.at(-1).end());
   await page.getByRole('button',{name:'마이크가 안 돼요 · 다른 문제 풀기',exact:true}).click();
   await page.getByRole('button',{name:'🎤 영어 읽기 다시 시도',exact:true}).waitFor();
   const after=await page.evaluate(()=>({solved:localStorage.hub2_solved,credit:localStorage.hub2_credit,book:localStorage.hub2_book_cursor,review:localStorage.hub2_wrongbook}));
   assert.deepEqual(after,before);assert.equal(await page.locator('.reading-sentence').count(),0);
   await page.getByRole('button',{name:'🎤 영어 읽기 다시 시도',exact:true}).click();await page.locator('.reading-sentence').waitFor();
   assert.equal(await page.locator('.reading-sentence').getAttribute('aria-label'),text,'unread book page remains available');
   // A pending final must still be accepted after the child taps completion.
   await mic().click();await page.evaluate(t=>{const r=__mic.instances.at(-1);r.result(t,false);r.flush=t;},text);
   await page.getByRole('button',{name:'다 읽었어요',exact:true}).click();await page.clock.runFor(2500);
   assert.equal(await page.evaluate(()=>localStorage.hub2_solved),'1');assert.equal(await page.evaluate(()=>localStorage.hub2_credit),'0');
   // Stalled mic exposes a way out, and switching away cancels all queued retries.
   await page.evaluate(()=>__mic.stall=true);await mic().click();await page.clock.runFor(12000);
   await page.getByRole('button',{name:'마이크가 안 돼요 · 다른 문제 풀기',exact:true}).click();
   const count=await page.evaluate(()=>__mic.instances.length);await page.clock.runFor(60000);
   assert.equal(await page.evaluate(()=>__mic.instances.length),count);assert.equal(await page.evaluate(()=>localStorage.hub2_solved),'1');
   assert.deepEqual(errors,[]);console.log(profile.name+': error/recovery, prefix, interim rejection, fallback/return, final flush, stale retry cancellation passed');
   await context.close();
  }
 }finally{await browser.close();await new Promise(r=>server.close(r));}
})().catch(e=>{console.error(e);process.exitCode=1;server.close();});
