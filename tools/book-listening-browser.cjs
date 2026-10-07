'use strict';
// Real narration playback; recognition is simulated, so no microphone permission is needed.
const {chromium}=require('playwright'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),http=require('node:http');
const root=path.resolve(__dirname,'..');
const server=http.createServer((req,res)=>{
  const u=new URL(req.url,'http://local'),f=path.resolve(root,'.'+decodeURIComponent(u.pathname)+(u.pathname.endsWith('/')?'index.html':''));
  if(!f.startsWith(root+path.sep)){res.writeHead(403).end();return;}
  const types={'.html':'text/html;charset=utf-8','.js':'text/javascript','.css':'text/css','.webp':'image/webp','.jpg':'image/jpeg','.png':'image/png','.svg':'image/svg+xml','.mp3':'audio/mpeg'};
  fs.readFile(f,(e,b)=>res.writeHead(e?404:200,{'Content-Type':types[path.extname(f)]||'application/octet-stream','Cache-Control':'no-store'}).end(e?'missing':b));
});
function seed(){
  window.AudioContext=undefined;window.webkitAudioContext=undefined;
  if(!sessionStorage.getItem('listen-seeded')){
    sessionStorage.setItem('listen-seeded','1');const d=new Date();
    localStorage.setItem('hub2_date',d.getFullYear()+'-'+(d.getMonth()+1)+'-'+d.getDate());
    localStorage.setItem('hub2_solved','10');localStorage.setItem('hub2_credit','0');localStorage.setItem('hub2_parent_mode','0');
    localStorage.setItem('hub2_book_cursor',JSON.stringify({i:3,part:1,done:['momo']}));
    localStorage.setItem('hub2_book_reading_mode','sentence');
    localStorage.setItem('hub2_book_reading_growth',JSON.stringify({mode:'sentence',streak:4,struggles:0,recent:[]}));
  }
  window.__micStops=0;window.__audios=[];const NativeAudio=window.Audio;
  window.Audio=function(...args){const a=new NativeAudio(...args);window.__audios.push(a);return a;};
  class Fake{
    start(){this.onstart?.();this.onaudiostart?.();setTimeout(()=>{const text='bananas bananas bananas';const result=Object.assign([{transcript:text,confidence:1}],{isFinal:true});this.onresult?.({resultIndex:0,results:[result]});},30);}
    stop(){window.__micStops++;setTimeout(()=>this.onend?.(),10);}abort(){this.stop();}
  }
  window.SpeechRecognition=window.webkitSpeechRecognition=Fake;
}
const progress=p=>p.evaluate(()=>Object.fromEntries(['hub2_solved','hub2_credit','hub2_book_cursor','hub2_book_reading_mode','hub2_book_reading_growth'].map(k=>[k,localStorage.getItem(k)])));
(async()=>{
  if(!process.env.HUB_VERIFY_BASE)await new Promise(r=>server.listen(0,'127.0.0.1',r));
  const base=(process.env.HUB_VERIFY_BASE||'http://127.0.0.1:'+server.address().port).replace(/\/$/,'');
  const browser=await chromium.launch({channel:'msedge',headless:true});
  try{
    for(const width of [390,820]){
      const c=await browser.newContext({viewport:{width,height:1180},hasTouch:true,serviceWorkers:'block'});await c.addInitScript(seed);
      const p=await c.newPage(),errors=[],missing=[];p.on('pageerror',e=>errors.push(e.message));p.on('response',r=>{if(r.status()>=400)missing.push(r.status()+' '+r.url());});
      await p.goto(base+'/game/?v=201');await p.waitForSelector('#bookListeningHelp');
      const before=await progress(p),line=await p.locator('.reading-sentence').getAttribute('aria-label');assert.equal(line,'He is so fast!');
      await p.locator('.reading-actions button').first().click();await p.waitForSelector('#bookListeningHelp.is-recommended');
      assert.deepEqual(await progress(p),before);
      assert.ok(await p.evaluate(()=>window.__micStops>0));
      await p.locator('#bookListeningHelp').click();await p.waitForSelector('#page .listen.is-help');
      const u=new URL(p.url());assert.equal(u.searchParams.get('book'),'picnic');assert.equal(u.searchParams.get('page'),'3');assert.equal(u.searchParams.get('part'),'1');
      assert.equal(await p.locator('#page .text').innerText(),line);assert.equal(await p.evaluate(()=>window.__audios.length),0);
      await p.locator('#page .listen').click();await p.waitForFunction(()=>window.__audios.some(a=>a.currentTime>0&&Number.isFinite(a.duration)&&a.duration>0));
      const expected=await p.evaluate(()=>window.EnglishBooks.practice(window.EnglishBooks.books[0].pages[3],'sentence')[1].audio);
      assert.ok((await p.evaluate(()=>window.__audios.at(-1).src)).endsWith('/story/english/'+expected));
      await p.locator('.listening-original summary').click(); await p.locator('.original-listen').click();
      await p.waitForFunction(()=>window.__audios.at(-1)?.currentTime>0);
      assert.match(await p.evaluate(()=>window.__audios.at(-1).src),/\/story\/english\/audio\/picnic-4\.mp3$/);
      assert.equal(await p.evaluate(()=>window.__audios.slice(0,-1).every(a=>a.paused)),true);
      assert.deepEqual(await progress(p),before);assert.equal(await p.locator('#page .meaning').isVisible(),true);
      assert.equal(await p.evaluate(()=>document.documentElement.scrollWidth>innerWidth+1),false);
      await p.locator('#studyReturn').click();await p.waitForSelector('#bookListeningHelp');
      assert.equal(await p.locator('.reading-sentence').getAttribute('aria-label'),line);assert.deepEqual(await progress(p),before);
      assert.deepEqual(errors,[]);assert.deepEqual(missing,[]);await c.close();
      console.log('PASS '+width+': wrong-read help, same book/page/sentence, real narration, no autoplay, return preserves score/credit/cursor/growth, no errors/404');
    }
  }finally{await browser.close();server.closeAllConnections();if(server.listening)await new Promise(r=>server.close(r));}
})().catch(e=>{console.error(e);process.exitCode=1;});
