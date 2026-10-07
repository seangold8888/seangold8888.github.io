'use strict';
const {chromium}=require('playwright'),a=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),http=require('node:http');
const root=path.resolve(__dirname,'..'),books=require('../story/english/books.js');
const server=http.createServer((req,res)=>{
  const u=new URL(req.url,'http://local'),f=path.resolve(root,'.'+decodeURIComponent(u.pathname)+(u.pathname.endsWith('/')?'index.html':''));
  if(!f.startsWith(root+path.sep)){res.writeHead(403).end();return;}
  const mime={'.html':'text/html;charset=utf-8','.js':'text/javascript','.css':'text/css','.webp':'image/webp','.png':'image/png','.jpg':'image/jpeg','.svg':'image/svg+xml','.mp3':'audio/mpeg'};
  fs.readFile(f,(e,b)=>res.writeHead(e?404:200,{'Content-Type':mime[path.extname(f)]||'application/octet-stream','Cache-Control':'no-store'}).end(e?'missing':b));
});
(async()=>{
  if(!process.env.HUB_VERIFY_BASE)await new Promise(r=>server.listen(0,'127.0.0.1',r));
  const base=(process.env.HUB_VERIFY_BASE||'http://127.0.0.1:'+server.address().port).replace(/\/$/,'');
  const browser=await chromium.launch({channel:'msedge',headless:true});
  try{
    for(const width of [390,820]){
      const c=await browser.newContext({viewport:{width,height:1180},hasTouch:true,serviceWorkers:'block'});
      await c.addInitScript(()=>{window.__clips=[];const Native=window.Audio;window.Audio=function(...args){const x=new Native(...args);window.__clips.push(x);return x;};});
      const p=await c.newPage(),errors=[],missing=[];p.on('pageerror',e=>errors.push(e.message));p.on('response',r=>{if(r.status()>=400)missing.push(r.status()+' '+r.url());});
      await p.goto(base+'/story/english/?book=picnic&from=study&listen=1&page=0');
      for(const mode of ['easy','sentence','page']){
        await p.locator('#bookReadingMode').selectOption(mode);const line=books.practice(books.books[0].pages[0],mode)[0];
        a.equal(await p.locator('#page .text').innerText(),line.text);
        await p.locator('#page .listen').click();await p.waitForFunction(()=>window.__clips.at(-1)?.currentTime>0);
        a.ok((await p.evaluate(()=>window.__clips.at(-1).src)).endsWith('/story/english/'+line.audio));
        a.equal(await p.evaluate(()=>window.__clips.at(-1).playbackRate),1);
        if(mode==='easy'){
          await p.locator('.listening-original summary').click();await p.locator('.original-listen').click();await p.waitForFunction(()=>window.__clips.at(-1)?.currentTime>0);
          a.ok((await p.evaluate(()=>window.__clips.at(-1).src)).endsWith('/audio/picnic-1.mp3'));
          a.equal(await p.locator('.original-text').innerText(),books.books[0].pages[0].text);
        }
        a.equal(await p.evaluate(()=>window.__clips.slice(0,-1).every(x=>x.paused)),true);
        a.equal(await p.evaluate(()=>document.documentElement.scrollWidth>innerWidth+1),false);
      }
      if(width===390){
        const decoded=await p.evaluate(async plan=>{
          const ctx=new OfflineAudioContext(1,48000,48000),queue=plan.slice(),result=[];
          await Promise.all(Array.from({length:6},async()=>{while(queue.length){const line=queue.shift(),r=await fetch(line.audio);if(!r.ok)throw Error(line.audio+' '+r.status);const b=await ctx.decodeAudioData(await r.arrayBuffer());const samples=b.getChannelData(0);let energy=0;for(let i=0;i<samples.length;i+=32)energy+=samples[i]*samples[i];result.push({file:line.audio,duration:b.duration,energy});}}));return result;
        },books.practiceAudioPlan());
        a.equal(decoded.length,books.practiceAudioPlan().length);for(const x of decoded){a.ok(x.duration>.25&&x.duration<45,x.file+' duration');a.ok(x.energy>.01,x.file+' audible');}
        console.log('PASS all '+decoded.length+' original/practice MP3 files decode as audible audio');
      }
      a.deepEqual(errors,[]);a.deepEqual(missing,[]);await c.close();console.log('PASS '+width+': all difficulty modes use visible-text audio; original narration separate; no overlapping sounds, no overflow or errors');
    }
  }finally{await browser.close();server.closeAllConnections();if(server.listening)await new Promise(r=>server.close(r));}
})().catch(e=>{console.error(e);process.exitCode=1;});
