"use strict";
const {chromium}=require("playwright"),a=require("node:assert/strict"),fs=require("node:fs"),path=require("node:path"),http=require("node:http"),os=require("node:os");
const root=path.resolve(__dirname,".."),output=fs.mkdtempSync(path.join(os.tmpdir(),"reading-vs-"));
const mime={".html":"text/html;charset=utf-8",".js":"application/javascript",".css":"text/css",".json":"application/json",".png":"image/png",".webp":"image/webp",".jpg":"image/jpeg",".svg":"image/svg+xml",".mp3":"audio/mpeg",".wav":"audio/wav"};
const server=http.createServer((req,res)=>{
  const u=new URL(req.url,"http://local"),f=path.resolve(root,"."+decodeURIComponent(u.pathname)+(u.pathname.endsWith("/")?"index.html":""));
  if(!f.startsWith(root+path.sep)){res.writeHead(403).end();return;}
  fs.readFile(f,(err,b)=>res.writeHead(err?404:200,{"Content-Type":mime[path.extname(f)]||"application/octet-stream","Cache-Control":"no-store"}).end(err?"missing":b));
});
function fakeSpeech(){
  window.AudioContext=undefined;window.webkitAudioContext=undefined;
  class FakeRecognition{
    start(){setTimeout(()=>{
      this.onstart&&this.onstart();this.onaudiostart&&this.onaudiostart();
      const text=window.__say||document.querySelector('.reading-sentence').getAttribute('aria-label');window.__say=null;
      const result=Object.assign([{transcript:text,confidence:1}],{isFinal:true});
      this.onresult&&this.onresult({resultIndex:0,results:[result]});
    },30);}
    stop(){setTimeout(()=>this.onend&&this.onend(),10);}abort(){this.stop();}
  }
  window.SpeechRecognition=FakeRecognition;window.webkitSpeechRecognition=FakeRecognition;
}
async function line(p){return p.locator('.reading-sentence').getAttribute('aria-label');}
async function read(p){await p.locator('.reading-actions button').first().click();}
async function settings(p){await p.locator('#lobbySettings > summary').click();await p.locator('#bookOpen').click();}
(async()=>{
  await new Promise(r=>server.listen(0,"127.0.0.1",r));const base="http://127.0.0.1:"+server.address().port;
  const browser=await chromium.launch({channel:"msedge",headless:true});
  try{
    for(const [name,width,height] of [["ipad",820,1180],["phone",390,844]]){
      const context=await browser.newContext({viewport:{width,height},hasTouch:true,serviceWorkers:"block",reducedMotion:"reduce"});
      await context.addInitScript(fakeSpeech);
      await context.addInitScript(()=>{
        if(sessionStorage.getItem("reading-seed"))return;sessionStorage.setItem("reading-seed","1");
        const d=new Date();localStorage.setItem("hub2_date",d.getFullYear()+"-"+(d.getMonth()+1)+"-"+d.getDate());
        localStorage.setItem("hub2_solved","10");localStorage.setItem("hub2_credit","0");localStorage.setItem("hub2_parent_mode","0");
        localStorage.setItem("hub2_book_cursor",JSON.stringify({i:0,done:["momo"]}));
      });
      const p=await context.newPage(),errors=[];p.on("pageerror",e=>errors.push(e.message));
      await p.goto(base+"/game/");await p.waitForSelector('.reading-sentence');a.equal(await line(p),"It is sunny.");
      await p.screenshot({path:path.join(output,name+"-easy.png")});
      await p.evaluate(()=>window.__say="bananas bananas bananas");await read(p);
      await p.waitForFunction(()=>document.querySelector('.reading-status').textContent.includes('다시')||document.querySelector('.reading-actions button').disabled===false);
      a.equal(await p.evaluate(()=>localStorage.getItem("hub2_solved")),"10");
      a.equal(await p.evaluate(()=>JSON.parse(localStorage.getItem("hub2_book_cursor")).i),0);
      await read(p);await p.waitForFunction(()=>localStorage.getItem("hub2_solved")==="11");
      await p.waitForFunction(()=>document.querySelector('.reading-sentence')?.getAttribute('aria-label')==='Mom makes sandwiches.');
      await settings(p);await p.locator('#bookReadingMode').selectOption('sentence');await p.locator('#readingLevelSelect').selectOption('0');await p.locator('#bookClose').click();
      a.equal(await line(p),"It is a sunny day.");await read(p);
      await p.waitForFunction(()=>document.querySelector('.reading-sentence')?.getAttribute('aria-label')==='Jay wants a picnic.');
      let cursor=await p.evaluate(()=>JSON.parse(localStorage.getItem('hub2_book_cursor')));a.equal(cursor.i,0);a.equal(cursor.part,1);a.deepEqual(cursor.done,["momo"]);
      await p.reload();await p.waitForSelector('.reading-sentence');a.equal(await line(p),"Jay wants a picnic.");
      await read(p);await p.waitForFunction(()=>JSON.parse(localStorage.getItem('hub2_book_cursor')).i===1);
      await p.goto(base+'/story/english/?book=picnic');await p.waitForSelector('#reader:not([hidden])');
      await p.locator('#bookReadingMode').selectOption('easy');a.equal(await p.locator('#page .text').innerText(),"It is sunny.");
      await p.locator('#page .read').click();await read(p);
      await p.waitForFunction(()=>document.querySelector('#page .text')?.textContent==='Mom makes sandwiches.');
      await p.locator('#bookReadingMode').selectOption('page');a.equal(await p.locator('#page .text').innerText(),"Mom makes sandwiches.");
      a.equal(await p.evaluate(()=>document.documentElement.scrollWidth>innerWidth+1),false);
      a.deepEqual(errors,[]);await context.close();console.log('PASS '+name+': easy default, wrong answers do not advance, sentence checkpoint survives reload, standalone mode shares setting');
    }
    let reproduced=false;
    for(const [width,height] of [[320,720],[390,844],[768,900],[820,1180],[1024,650],[1180,700],[1366,904]]){
      const context=await browser.newContext({viewport:{width,height},hasTouch:true,serviceWorkers:"block",reducedMotion:"reduce"});
      const p=await context.newPage(),errors=[];p.on("pageerror",e=>errors.push(e.message));
      await p.goto(base+'/cards/?preview=all&card=erlangshen&battle=1');await p.locator('#actionList button').first().waitFor();await p.evaluate(()=>document.fonts.ready);await p.waitForTimeout(450);
      const measure=()=>p.evaluate(()=>{
        const r=e=>e.getBoundingClientRect(),arena=r(document.getElementById('arena')),center=r(document.querySelector('.battle-center')),vs=r(document.querySelector('.versus'));
        return {offset:vs.x+vs.width/2-(arena.x+arena.width/2),trackOffset:vs.x+vs.width/2-(center.x+center.width/2),overflow:document.documentElement.scrollWidth>innerWidth+1};
      });
      const fixed=await measure();a.ok(Math.abs(fixed.offset)<2,width+': VS not centered '+JSON.stringify(fixed));a.equal(fixed.overflow,false);
      const oldStyle=await p.addStyleTag({content:'.battle-center { grid-template-columns: none; min-width: auto; }'});
      const old=await measure();if(Math.abs(old.offset)>10)reproduced=true;
      await oldStyle.evaluate(el=>el.remove());
      if(width===820||width===390)await p.screenshot({path:path.join(output,'vs-'+width+'.png')});
      await p.locator('.rest-button').click();await p.waitForTimeout(700);
      a.ok(Math.abs((await measure()).offset)<2,'after turn '+width);a.deepEqual(errors,[]);await context.close();
      console.log('PASS VS '+width+'x'+height+': old offset '+old.offset.toFixed(1)+'px → '+fixed.offset.toFixed(1)+'px; stays centered after turn');
    }
    a.ok(reproduced,'must reproduce the original shifted VS layout');console.log('SCREENSHOTS '+output);
  }finally{await browser.close();server.closeAllConnections();await new Promise(r=>server.close(r));}
})().catch(e=>{console.error(e);process.exitCode=1;});
