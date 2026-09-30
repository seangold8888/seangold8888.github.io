// Read-only visual comparison with the user's reference, at a shared virtual clock.
const {chromium}=require('playwright'),fs=require('node:fs'),path=require('node:path'),os=require('node:os');
const output=fs.mkdtempSync(path.join(os.tmpdir(),'slime-motion-'));
(async()=>{
 const browser=await chromium.launch({channel:'msedge',headless:true,args:['--use-angle=swiftshader','--enable-unsafe-swiftshader']});
 try{
  for(const [name,url,key] of [['reference','https://pururu-slime.matodesign.workers.dev/','__pururu'],['local','http://127.0.0.1:8765/slime/?v=jelly-4','__slime']].filter(([name])=>!process.argv[2]||process.argv[2]===name)){
   const context=await browser.newContext({viewport:{width:800,height:600},hasTouch:true,serviceWorkers:'block'}),p=await context.newPage();
   await p.clock.install({time:new Date('2026-09-30T00:00:00Z')});await p.clock.pauseAt(new Date('2026-09-30T00:00:02Z'));
   if(name==='local')await p.addInitScript(()=>{localStorage.setItem('hub_play_pass',JSON.stringify({free:true,day:'2026-09-30'}));});
   await p.goto(url,{waitUntil:'load'});console.log(name,'loaded');
   await p.clock.runFor(4000);
   const cdp=await context.newCDPSession(p);
   async function capture(label){
    const {data}=await cdp.send('Page.captureScreenshot',{format:'png',fromSurface:true,captureBeyondViewport:false});
    fs.writeFileSync(path.join(output,name+'-'+label+'.png'),Buffer.from(data,'base64'));
    console.log(name,label,JSON.stringify(await p.evaluate(k=>typeof window[k].state==='function'?window[k].state():window[k].state,key)));
   }
   await capture('rest');
   const xy=await p.evaluate(k=>window[k].screen(),key);await p.mouse.move(xy.x,xy.y-20);await p.mouse.down();await p.clock.runFor(16);
   for(let i=1;i<=12;i++){await p.mouse.move(xy.x+i*7,xy.y-20-i*12);await p.clock.runFor(16);}
   await capture('pull');
   await p.clock.runFor(480);await capture('held');
   await p.mouse.up();await p.clock.runFor(160);await capture('release');
   await p.clock.runFor(640);await capture('settle');
   await context.close();
  }
 }finally{await browser.close();}
 console.log('Motion comparison: '+output);
})().catch(e=>{console.error(e);process.exitCode=1;});
