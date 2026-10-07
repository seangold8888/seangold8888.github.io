"use strict";
const {chromium}=require('playwright'),a=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),http=require('node:http');
const root=path.resolve(__dirname,'..');
const server=http.createServer((req,res)=>{
  const u=new URL(req.url,'http://local'),f=path.resolve(root,'.'+decodeURIComponent(u.pathname)+(u.pathname.endsWith('/')?'index.html':''));
  if(!f.startsWith(root+path.sep)){res.writeHead(403).end();return;}
  const type={'.html':'text/html;charset=utf-8','.js':'application/javascript','.css':'text/css','.webp':'image/webp','.png':'image/png','.svg':'image/svg+xml','.mp3':'audio/mpeg'};
  fs.readFile(f,(err,b)=>res.writeHead(err?404:200,{'Content-Type':type[path.extname(f)]||'application/octet-stream','Cache-Control':'no-store'}).end(err?'missing':b));
});
function init(seed){
  window.AudioContext=undefined;window.webkitAudioContext=undefined;
  if(!sessionStorage.getItem('growth-seeded')){
    sessionStorage.setItem('growth-seeded','1');const d=new Date();
    localStorage.setItem('hub2_date',d.getFullYear()+'-'+(d.getMonth()+1)+'-'+d.getDate());
    localStorage.setItem('hub2_solved','0');localStorage.setItem('hub2_credit','0');localStorage.setItem('hub2_parent_mode','0');
    localStorage.setItem('hub2_book_cursor',JSON.stringify({i:0,part:0,done:['momo']}));
    localStorage.setItem('hub2_book_reading_mode',seed.mode);
    localStorage.setItem('hub2_book_reading_growth',JSON.stringify({mode:seed.mode,streak:seed.streak||0,struggles:seed.struggles||0,recent:[]}));
  }
  class Fake{
    start(){setTimeout(()=>{
      this.onstart&&this.onstart();this.onaudiostart&&this.onaudiostart();
      const say=window.__say;window.__say=null;
      if(say==='ERROR'){this.onerror&&this.onerror({error:'network'});return;}
      const text=say||document.querySelector('.reading-sentence').getAttribute('aria-label');
      const result=Object.assign([{transcript:text,confidence:1}],{isFinal:true});
      this.onresult&&this.onresult({resultIndex:0,results:[result]});
    },30);}
    stop(){setTimeout(()=>this.onend&&this.onend(),10);}abort(){this.stop();}
  }
  window.SpeechRecognition=window.webkitSpeechRecognition=Fake;
}
const read=p=>p.locator('.reading-actions button').first().click();
const mode=p=>p.evaluate(()=>localStorage.getItem('hub2_book_reading_mode'));
const growth=p=>p.evaluate(()=>JSON.parse(localStorage.getItem('hub2_book_reading_growth')));
async function retry(p,text){
  await p.evaluate(t=>window.__say=t,text);await read(p);
  await p.waitForFunction(()=>!document.querySelector('.reading-actions button').disabled);
}
(async()=>{
  await new Promise(r=>server.listen(0,'127.0.0.1',r));const base='http://127.0.0.1:'+server.address().port;
  const browser=await chromium.launch({channel:'msedge',headless:true});
  try{
    for(const [name,width,height] of [['phone',390,844],['ipad',820,1180]]){
      async function page(seed,url='/game/'){
        const c=await browser.newContext({viewport:{width,height},hasTouch:true,serviceWorkers:'block',reducedMotion:'reduce'});
        await c.addInitScript(init,seed);const p=await c.newPage(),errors=[];p.on('pageerror',e=>errors.push(e.message));
        await p.goto(base+url);return {c,p,errors};
      }
      let {c,p,errors}=await page({mode:'easy',streak:5});await p.waitForSelector('.reading-sentence');
      await retry(p,'ERROR');a.equal((await growth(p)).streak,5);a.equal(await mode(p),'easy');
      await read(p);await p.waitForFunction(()=>localStorage.getItem('hub2_book_reading_mode')==='sentence');
      a.equal(await p.evaluate(()=>JSON.parse(localStorage.getItem('hub2_book_cursor')).i),1);
      a.equal((await growth(p)).streak,0);a.equal(await p.evaluate(()=>localStorage.getItem('hub2_solved')),'1');
      await p.reload();await p.waitForSelector('.reading-sentence');a.equal(await mode(p),'sentence');
      a.deepEqual(errors,[]);await c.close();
      ({c,p,errors}=await page({mode:'sentence',streak:7}));await p.waitForSelector('.reading-sentence');
      await read(p);await p.waitForFunction(()=>JSON.parse(localStorage.getItem('hub2_book_cursor')).part===1);
      a.equal(await mode(p),'sentence');a.equal((await growth(p)).streak,8);
      await p.reload();await p.waitForSelector('.reading-sentence');
      a.equal(await p.locator('.reading-sentence').getAttribute('aria-label'),'Jay wants a picnic.');
      await read(p);await p.waitForFunction(()=>localStorage.getItem('hub2_book_reading_mode')==='page');
      a.equal(await p.evaluate(()=>JSON.parse(localStorage.getItem('hub2_book_cursor')).i),1);
      a.deepEqual(errors,[]);await c.close();
      ({c,p,errors}=await page({mode:'page',struggles:2}));await p.waitForSelector('.reading-sentence');
      await retry(p,'bananas bananas bananas');await read(p);
      await p.waitForFunction(()=>localStorage.getItem('hub2_book_reading_mode')==='sentence');
      a.equal(await p.evaluate(()=>localStorage.getItem('hub2_solved')),'1');a.deepEqual(errors,[]);await c.close();
      ({c,p,errors}=await page({mode:'easy',streak:5},'/story/english/?book=picnic'));
      await p.locator('#page .read').click();await read(p);
      await p.waitForFunction(()=>localStorage.getItem('hub2_book_reading_mode')==='sentence');
      a.match(await p.locator('#readingGrowth').innerText(),/잘 읽어서/);
      a.equal(await p.locator('#bookReadingMode').inputValue(),'sentence');
      await p.locator('#nextBtn').click();a.equal((await growth(p)).streak,0);
      a.equal(await p.evaluate(()=>document.documentElement.scrollWidth>innerWidth+1),false);
      await p.goto(base+'/game/');await p.waitForSelector('.reading-sentence');a.equal(await mode(p),'sentence');
      // Same sentence accepted on another surface cannot earn another growth point.
      await read(p);await p.waitForFunction(()=>JSON.parse(localStorage.getItem('hub2_book_cursor')).part===1);
      await p.locator('#lobbySettings > summary').click();await p.locator('#bookOpen').click();
      await p.locator('#bookReadingMode').selectOption('easy');await p.locator('#bookClose').click();
      a.equal(await mode(p),'easy');a.equal((await growth(p)).streak,0);
      a.deepEqual(errors,[]);await c.close();
      console.log('PASS '+name+': automatic promotion, page-boundary promotion/reload, microphone fault excluded, retry easing, shared reader/parent control; console errors 0');
    }
  }finally{await browser.close();server.closeAllConnections();await new Promise(r=>server.close(r));}
})().catch(e=>{console.error(e);process.exitCode=1;});
