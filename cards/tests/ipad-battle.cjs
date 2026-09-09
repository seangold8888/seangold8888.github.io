const {chromium}=require('C:/Users/김시현/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const fs=require('node:fs'),path=require('node:path'),http=require('node:http'),assert=require('node:assert/strict');
const root=path.resolve(__dirname,'../..');
const mime={'.html':'text/html','.js':'application/javascript','.css':'text/css','.json':'application/json','.png':'image/png','.webp':'image/webp'};
const server=http.createServer((req,res)=>{
 const url=new URL(req.url,'http://localhost');
 const file=path.resolve(root,'.'+decodeURIComponent(url.pathname)+(url.pathname.endsWith('/')?'index.html':''));
 if(!file.startsWith(root+path.sep)){res.writeHead(403).end();return;}
 try{res.setHeader('Content-Type',mime[path.extname(file)]||'application/octet-stream');res.end(fs.readFileSync(file));}catch{res.writeHead(404).end();}
});
(async()=>{
 await new Promise(r=>server.listen(0,'127.0.0.1',r));
 const browser=await chromium.launch({headless:true});
 try{
  for(const [width,height] of [[768,900],[1024,650],[820,1060],[1180,700],[1024,1246],[1366,904]]){
   const context=await browser.newContext({viewport:{width,height},hasTouch:true,isMobile:true,serviceWorkers:'block'});
   const page=await context.newPage(),errors=[];
   page.on('pageerror',e=>errors.push(e.message));
   await page.goto('http://127.0.0.1:'+server.address().port+'/cards/?preview=all&card=erlangshen&battle=1');
   await page.locator('#actionList button').first().waitFor();
   await page.evaluate(()=>document.fonts.ready);
   const report=await page.evaluate(()=>{
    const rect=id=>{const r=document.getElementById(id).getBoundingClientRect();return {x:r.x,y:r.y,w:r.width,h:r.height,bottom:r.bottom,right:r.right}};
    return {viewport:innerHeight,scroll:document.documentElement.scrollHeight,screen:rect('battleScreen'),arena:rect('arena'),actions:rect('actionList'),player:rect('playerCardSlot'),enemy:rect('enemyCardSlot'),
     buttons:[...document.querySelectorAll('#actionList button,#storyGateButton,#fragmentHand button')].map(e=>{const r=e.getBoundingClientRect();return {text:e.textContent.slice(0,30),bottom:r.bottom,right:r.right,h:r.height,w:r.width}})};
   });
   console.log(width+'x'+height+' scroll='+report.scroll+' buttons='+report.buttons.length+' last='+report.actions.bottom);
   assert.deepEqual(errors,[]);
   assert.ok(report.scroll<=height+2,'page scroll at '+width+'x'+height);
   for(const b of report.buttons){assert.ok(b.bottom<=height && b.right<=width,'button offscreen '+b.text);assert.ok(b.h>=59,'small target '+b.text);}
   for(const id of ['player','enemy'])assert.ok(report[id].bottom<=report.arena.bottom+1,'card exceeds arena');
   await page.locator('.rest-button').click();
   await page.waitForTimeout(2200);
   assert.ok(await page.evaluate(()=>document.documentElement.scrollHeight<=innerHeight+2), 'overflow after turn');
   assert.deepEqual(errors,[]);
   if(width===1024 && height===650) await page.screenshot({path:path.join(root,'../ipad-battle-landscape.png')});
   if(width===768) await page.screenshot({path:path.join(root,'../ipad-battle-portrait.png')});
   await context.close();
  }
 }finally{await browser.close();server.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
