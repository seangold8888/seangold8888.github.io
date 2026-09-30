'use strict';
// Export existing game art/renderers as dashboard covers. No AI-generated art,
// no gameplay changes, and no writes to the user's real browser storage.
const fs=require('node:fs'),path=require('node:path'),http=require('node:http'),assert=require('node:assert/strict');
const {chromium}=require('playwright'),sharp=require('sharp');
const root=path.resolve(__dirname,'..'),out=path.join(root,'assets','covers');
const server=http.createServer((req,res)=>{
 const u=decodeURIComponent(new URL(req.url,'http://local').pathname),f=path.resolve(root,'.'+u+(u.endsWith('/')?'index.html':''));
 if(!f.startsWith(root+path.sep)){res.writeHead(403).end();return;}
 fs.readFile(f,(e,b)=>{if(e){res.writeHead(404).end();return;}res.writeHead(200,{'Content-Type':f.endsWith('.html')?'text/html; charset=utf-8':f.endsWith('.js')?'text/javascript':f.endsWith('.webp')?'image/webp':f.endsWith('.css')?'text/css':'application/octet-stream'}).end(b);});
});
async function save(page,selector,name){
 const bytes=await page.locator(selector).screenshot({animations:'disabled'});
 await sharp(bytes).webp({quality:90}).toFile(path.join(out,name));
 console.log(name+': '+(await sharp(path.join(out,name)).metadata()).width+'px');
}
(async()=>{
 await new Promise(r=>server.listen(0,'127.0.0.1',r));const base='http://127.0.0.1:'+server.address().port;
 const browser=await chromium.launch({channel:'msedge',headless:true,args:['--use-angle=swiftshader','--enable-unsafe-swiftshader']});
 try{
  const context=await browser.newContext({viewport:{width:1200,height:800},serviceWorkers:'block',reducedMotion:'reduce'});
  await context.addInitScript(()=>{const d=new Date();localStorage.setItem('hub_play_pass',JSON.stringify({free:true,day:d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0')+'-'+String(d.getDate()).padStart(2,'0')}));});
  const page=await context.newPage();
  const cardsOnly=process.argv.includes('--cards-only');
  if(!process.argv.includes('--kart-only')&&!cardsOnly) {
  await page.goto(base+'/hogwarts/');await page.waitForFunction(()=>window.WQ?.Characters?.drawHero);
  const source=fs.readFileSync(path.join(root,'hogwarts/index.html'),'utf8');
  const start=source.indexOf('    function drawBackdrop(ctx){',source.indexOf('/* src/stages/castle-defense.js */'));
  const end=source.indexOf('    function drawDoor(ctx){',start);assert(start>0&&end>start);
  await page.evaluate(backdrop=>{
   const canvas=document.createElement('canvas');canvas.id='hub-cover-export';canvas.width=1200;canvas.height=800;
   canvas.style.cssText='position:fixed;inset:0;width:1200px;height:800px;z-index:9999;visibility:visible';document.body.append(canvas);
   const ctx=canvas.getContext('2d'),totalTime=1.7,TAU=Math.PI*2;
   function rounded(ctx,x,y,w,h,r){ctx.beginPath();ctx.roundRect(x,y,w,h,r);}
   // This is the exact native castle renderer, not a replacement illustration.
   const draw=new Function('ctx','rounded','totalTime','TAU',backdrop+';drawBackdrop(ctx);');
   ctx.save();ctx.scale(1.25,800/540);draw(ctx,rounded,totalTime,TAU);ctx.restore();
   [['hermione',325,510,4.4],['ron',905,530,4.4],['harry',600,555,5.9]].forEach(([id,x,y,s])=>{
    ctx.save();ctx.translate(x,y);ctx.scale(s,s);WQ.Characters.drawHero(ctx,WQ.Characters.list.find(d=>d.id===id),{t:0,tool:'wand',aimA:-.7});ctx.restore();
   });
  },source.slice(start,end));
  await save(page,'#hub-cover-export','cover-hogwarts-game-v1.webp');
  await page.goto(base+'/kedehun/');
  await page.evaluate(()=>{
   const el=document.createElement('div');el.id='hub-cover-export';
   el.style.cssText='position:fixed;inset:0;z-index:9999;width:1200px;height:800px;background:radial-gradient(ellipse at 50% 40%,#8256af,#221c49 65%,#111831);overflow:hidden';
   el.innerHTML='<div style="position:absolute;inset:0;background:linear-gradient(116deg,transparent 18%,#e8469638 18%,transparent 30%),linear-gradient(65deg,transparent 55%,#4adae74a 55%,transparent 70%)"></div>'+[
    ['mira',120,65,430],['joy',665,70,420],['lumi',355,10,515]
   ].map(([id,x,y,w])=>'<img src="art/characters/'+id+'-v2.webp" alt="" style="position:absolute;left:'+x+'px;top:'+y+'px;width:'+w+'px;height:auto;filter:drop-shadow(0 0 22px #0009)">').join('');
   document.body.append(el);
  });
  await page.waitForFunction(()=>[...document.querySelectorAll('#hub-cover-export img')].every(i=>i.complete&&i.naturalWidth));
  await save(page,'#hub-cover-export','cover-kedehun-team-v1.webp');
  await page.goto(base+'/bori/');await page.waitForFunction(()=>typeof roomSvg==='function');
  await page.evaluate(()=>{
   const el=document.createElement('div');el.id='hub-cover-export';
   el.style.cssText='position:fixed;inset:0;z-index:9999;width:1200px;height:800px;background:#ffe1eb;overflow:hidden';
   const room=roomSvg({wall:'hearts',window:'lace',bed:'ribbon',sofa:'strawberry',table:'applepie',lamp:'star',rug:'heart',deco:'bear'},false)
    .replace(/\bid="([^"]+)"/g,'id="cover-$1"').replace(/url\(#([^\)]+)\)/g,'url(#cover-$1)');
   el.innerHTML='<div style="position:absolute;inset:0;width:1334px;left:-67px">'+room+'</div><div class="portrait myMelody" style="position:absolute;left:245px;top:170px;width:235px;height:235px;border-radius:50%;border:9px solid white;box-shadow:0 12px 45px #be689948"></div><div class="portrait helloKitty" style="position:absolute;left:490px;top:180px;width:360px;height:360px;border-radius:50%;border:12px solid white;box-shadow:0 15px 50px #be689958"></div>';
   document.body.append(el);
  });
  await page.evaluate(async()=>{const urls=['--p-helloKitty','--p-myMelody'].map(k=>getComputedStyle(document.documentElement).getPropertyValue(k).trim().replace(/^url\(["']?|["']?\)$/g,''));await Promise.all(urls.map(url=>new Promise((r,j)=>{const i=new Image();i.onload=r;i.onerror=j;i.src=url;})));});
  await save(page,'#hub-cover-export','cover-ribbon-room-v1.webp');
  }
  if(!cardsOnly) {
  await page.goto(base+'/kart3d/');await page.waitForFunction(()=>window.__game&&document.getElementById('menu-hero').naturalWidth);
  const drivers=await page.evaluate(()=>{
   const images=[];
   for(const i of [1,2,0]) { __game.pick(i,0,0);__game.renderMenu();const img=document.getElementById('menu-hero');images.push({src:img.src,alt:img.alt}); }
   return images;
  });
  assert(drivers.every(d=>d.src.startsWith('data:image/png')),'native 3D kart previews must exist');
  await page.evaluate(drivers=>{
   const el=document.createElement('div');el.id='hub-cover-export';
   el.style.cssText='position:fixed;inset:0;z-index:9999;width:1200px;height:800px;overflow:hidden;background:linear-gradient(#bcdefb 0%,#e8f3ff 58%,#fdedc6 59%,#a8dfb8 70%,#77c89c 100%)';
   el.innerHTML='<div style="position:absolute;left:-170px;right:-170px;top:450px;height:360px;border:24px solid #fff0ab;border-radius:50%;background:#608695;transform:rotate(-10deg)"></div><div style="position:absolute;left:180px;top:95px;width:180px;height:65px;border-radius:100px;background:#ffffffbf;box-shadow:620px 15px 0 16px #ffffffb0"></div>'+drivers.map((d,i)=>{
    const [x,y,w]=[[100,150,490],[650,135,490],[290,150,670]][i];
    return '<img alt="'+d.alt+'" src="'+d.src+'" style="position:absolute;left:'+x+'px;top:'+y+'px;width:'+w+'px;height:auto;filter:drop-shadow(0 16px 12px #2f597535)">';
   }).join('')+'<div style="position:absolute;bottom:0;left:0;right:0;height:26px;background:conic-gradient(#203455 25%,white 0 50%,#203455 0 75%,white 0) 0 0/52px 52px"></div>';
   document.body.append(el);
  },drivers);
  await page.waitForFunction(()=>[...document.querySelectorAll('#hub-cover-export img')].every(i=>i.complete&&i.naturalWidth));
  await save(page,'#hub-cover-export','cover-sanrio-kart-team-v1.webp');
  }
  if(!process.argv.includes('--kart-only')) {
  await page.goto(base+'/cards/');
  await page.evaluate(()=>{
   const el=document.createElement('div');el.id='hub-cover-export';
   el.style.cssText='position:fixed;inset:0;z-index:9999;width:1200px;height:800px;overflow:hidden;background:radial-gradient(ellipse at 22% 30%,#375b8f,#161b3c 48%,#0f142b)';
   el.innerHTML='<div style="position:absolute;inset:0;background:radial-gradient(ellipse at 78% 45%,#ef96473b,transparent 50%),radial-gradient(ellipse at 32% 55%,#82e8fb26,transparent 45%)"></div>'+[
    ['jaei',135,75,-9,'#9de5f5','#304e78'],['taeo',615,80,8,'#ffc66d','#74502e']
   ].map(([id,x,y,angle,edge,shadow])=>'<div style="position:absolute;left:'+x+'px;top:'+y+'px;width:450px;height:620px;box-sizing:border-box;padding:9px;border:2px solid '+edge+';border-radius:29px;background:linear-gradient(145deg,'+edge+',#1e2446 64%);transform:rotate('+angle+'deg);box-shadow:0 24px 55px #0009,0 0 40px '+shadow+'"><div style="width:100%;height:100%;border-radius:19px;overflow:hidden"><img src="art/'+id+'.webp" alt="'+(id==='jaei'?'재이':'태오')+'" style="width:100%;height:100%;object-fit:cover;object-position:50% 15%;transform:scale(1.6);transform-origin:50% 15%"></div><div style="position:absolute;inset:9px;border-radius:19px;background:linear-gradient(transparent 62%,#131930bd)"></div></div>').join('')+
    '<div style="position:absolute;left:527px;top:345px;width:138px;height:138px;display:grid;place-items:center;border-radius:50%;background:radial-gradient(#fff9d8,#f2ba5d 28%,#e9b97410 65%,transparent 72%);color:#fff5c7;font:110px Georgia;text-shadow:0 0 18px #ffe0a0">✦</div>';
   document.body.append(el);
  });
  await page.waitForFunction(()=>[...document.querySelectorAll('#hub-cover-export img')].every(i=>i.complete&&i.naturalWidth));
  await save(page,'#hub-cover-export','cover-jaei-taeo-card-battle-v1.webp');
  }
  await context.close();
 }finally{await browser.close();await new Promise(r=>server.close(r));}
})().catch(e=>{console.error(e);process.exitCode=1;server.close();});
