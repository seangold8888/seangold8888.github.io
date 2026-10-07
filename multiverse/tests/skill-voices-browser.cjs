const {chromium}=require('playwright'),a=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),http=require('node:http');
const root=path.resolve(__dirname,'../..');
const body=fs.readFileSync(path.join(root,'multiverse/game.js'),'utf8').replace('  window.__MV = {','  window.__skillQA={startAttack,doSpecial,hurtHero,skillVoices,showScreen};\n  window.__MV = {').replaceAll('requestAnimationFrame(frame);','/* deterministic QA frames */');
const server=http.createServer((req,res)=>{const u=new URL(req.url,'http://local'),file=path.resolve(root,'.'+decodeURIComponent(u.pathname)+(u.pathname.endsWith('/')?'index.html':''));if(!file.startsWith(root+path.sep)){res.writeHead(403).end();return;}fs.readFile(file,(e,b)=>res.writeHead(e?404:200,{'Content-Type':({'.html':'text/html;charset=utf-8','.js':'text/javascript','.wav':'audio/wav','.mp3':'audio/mpeg','.json':'application/json','.webp':'image/webp','.png':'image/png'})[path.extname(file)]||'application/octet-stream'}).end(e?'missing':b));});
(async()=>{
 await new Promise(r=>server.listen(0,'127.0.0.1',r));const base='http://127.0.0.1:'+server.address().port;
 const browser=await chromium.launch({channel:'msedge',headless:true,args:['--autoplay-policy=no-user-gesture-required']});
 try{
  for(const [width,height] of [[390,844],[820,1180]]){
   const context=await browser.newContext({viewport:{width,height},hasTouch:true,serviceWorkers:'block'});
   await context.addInitScript(()=>{const d=new Date();localStorage.setItem('hub_play_pass',JSON.stringify({free:true,day:d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0')+'-'+String(d.getDate()).padStart(2,'0')}));window.__plays=[];const play=HTMLMediaElement.prototype.play;HTMLMediaElement.prototype.play=function(){if(this.src.includes('family-skills')||this.src.includes('hero-callouts-eleven-v2'))window.__plays.push(this.src);return play.apply(this,arguments);};});
   const p=await context.newPage(),errors=[],missing=[];p.on('pageerror',e=>errors.push(e.message));p.on('response',r=>{if(r.status()>=400)missing.push(r.url());});
   await p.route('**/multiverse/game.js*',r=>r.fulfill({body,contentType:'text/javascript'}));
   await p.goto(base+'/multiverse/');await p.waitForFunction(()=>window.__skillQA);
   for(const kid of ['taeo','jaei']){
    await p.evaluate(k=>{__MV.setState({...__MV.state,hero:k,buddy:MV_DATA.BUDDY[k]});__MV.start(0,0);},kid);
    await p.waitForFunction(()=>__MV.game?.running);
    const result=await p.evaluate(()=>{const h=__MV.game.player,q=__skillQA;window.__plays=[];h.st='idle';h.comboT=0;q.startAttack(h);q.startAttack(h);const attacks=__plays.length;h.meter=0;q.doSpecial(h);const noMeter=__plays.length;h.meter=100;q.doSpecial(h);const special=__plays.at(-1),withSpecial=__plays.length;q.skillVoices.play(h.kid,'heavy');const overlap=__plays.length;q.showScreen('pause',true);q.skillVoices.play(h.kid,'attack');return{attacks,noMeter,special,withSpecial,overlap};});
    a.equal(result.attacks,1);a.equal(result.noMeter,1);a.equal(result.withSpecial,2);a.equal(result.overlap,2);
    a.ok(result.special.includes(kid==='taeo'?'meganaptor':'water'));
   }
   // Actual recordings decode and start in the browser, not only mocked paths.
   await p.goto(base+'/sanguo/voices.html');await p.waitForSelector('[data-hero="taeo"] audio');
   for(const hero of ['taeo','jaei']){
    const clips=p.locator('[data-hero="'+hero+'"] audio');a.equal(await clips.count(),hero==='taeo'?5:3);
    for(let i=0;i<await clips.count();i++){
      await clips.nth(i).evaluate(async e=>{await e.play();});
      await p.waitForFunction(({hero,i})=>{const e=document.querySelectorAll('[data-hero="'+hero+'"] audio')[i];return Number.isFinite(e.duration)&&e.readyState>=2;},{hero,i});
      const result=await clips.nth(i).evaluate(e=>({duration:e.duration,error:!!e.error,paused:e.paused}));
      a.ok(result.duration>.25&&result.duration<4.5,hero+' clip '+i+': '+JSON.stringify(result));a.equal(result.error,false);a.equal(result.paused,false);
      await clips.nth(i).evaluate(e=>e.pause());
    }
   }
   a.deepEqual(errors,[]);a.deepEqual(missing,[]);await context.close();console.log('PASS '+width+'x'+height+': player-only action cries, invalid skill silent, special priority, all eight actual clips decode/play, no 404 or console errors');
  }
 }finally{await browser.close();server.closeAllConnections();await new Promise(r=>server.close(r));}
})().catch(e=>{console.error(e);process.exitCode=1;});
