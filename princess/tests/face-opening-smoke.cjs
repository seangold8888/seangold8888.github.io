'use strict';
// Requires the local preview server and Playwright. Tests rendered pixels, not only markup.
const {chromium}=require('playwright'),assert=require('node:assert/strict'),fs=require('node:fs'),os=require('node:os'),path=require('node:path');
(async()=>{
 const output=fs.mkdtempSync(path.join(os.tmpdir(),'princess-face-opening-'));
 const browser=await chromium.launch({channel:'msedge',headless:true});
 try{
  const page=await browser.newPage({viewport:{width:1100,height:950},serviceWorkers:'block'}),errors=[];
  page.on('pageerror',e=>errors.push(e.message));
  await page.goto((process.env.PRINCESS_BASE_URL||'http://127.0.0.1:8765')+'/princess/?v=face-v42');
  const results=await page.evaluate(async()=>{
   const results=[],reader=blob=>new Promise((resolve,reject)=>{const r=new FileReader();r.onload=()=>resolve(r.result);r.onerror=reject;r.readAsDataURL(blob)});
   for(const style of Object.keys(PrincessStudio.hairSilhouettes)){
    const data=await reader(await (await fetch(PrincessStudio.path('hair',style))).blob());
    for(const p of PRINCESSES){
     const doc=new DOMParser().parseFromString(PrincessStudio.portrait({...p,hair:style},p.hairColor),'image/svg+xml');
     const front=doc.querySelector('[data-wear-layer="hair-front"]');
     front.querySelector('image').setAttribute('href',data);
     const svg=`<svg xmlns="http://www.w3.org/2000/svg" width="420" height="250" viewBox="0 -30 420 250">${new XMLSerializer().serializeToString(front)}</svg>`;
     const img=new Image();img.src=await reader(new Blob([svg],{type:'image/svg+xml'}));await img.decode();
     const canvas=document.createElement('canvas');canvas.width=420;canvas.height=250;const ctx=canvas.getContext('2d');ctx.drawImage(img,0,0);
     const [,l,r]=PrincessStudio.headAnchors[p.id],c=(l+r)/2;
     const alpha=[[-11,67],[11,67],[-16,78],[16,78],[0,91]].map(([x,y])=>ctx.getImageData(Math.round(c+x),y+30,1,1).data[3]);
     const pixels=ctx.getImageData(0,0,420,250).data;let painted=0;for(let i=3;i<pixels.length;i+=4)if(pixels[i]>64)painted++;
     let withoutGuard=null;
     if(p.id==='moon'&&style==='afro'){
      front.querySelector('[data-face-opening]').removeAttribute('mask');
      const unguarded=`<svg xmlns="http://www.w3.org/2000/svg" width="420" height="250" viewBox="0 -30 420 250">${new XMLSerializer().serializeToString(front)}</svg>`;
      img.src=await reader(new Blob([unguarded],{type:'image/svg+xml'}));await img.decode();ctx.clearRect(0,0,420,250);ctx.drawImage(img,0,0);
      withoutGuard=[[-11,67],[11,67],[-16,78],[16,78],[0,91]].map(([x,y])=>ctx.getImageData(Math.round(c+x),y+30,1,1).data[3]);
     }
     results.push({id:p.id,style,alpha,painted,withoutGuard});
    }
   }
   return results;
  });
  assert.equal(results.length,84);
  for(const result of results){assert.ok(result.alpha.every(a=>a<=8),'hair covers eye/cheek/chin: '+JSON.stringify(result));assert.ok(result.painted>1000,'hair disappeared: '+JSON.stringify(result));}
  assert.ok(results.find(r=>r.withoutGuard).withoutGuard.some(a=>a>64),'pixel check must reject the former face-obscuring render');
  for(const mode of ['portraits','stages']){
   await page.evaluate(mode=>{
    const board=document.createElement('div');board.id='review';board.style='display:grid;grid-template-columns:repeat(4,240px);gap:10px;background:#e8ddeb;padding:10px';
    board.innerHTML=PRINCESSES.map(p=>'<div style="min-width:0"><b>'+p.name+'</b>'+(mode==='stages'?dollSVG(defaultState(p),p):PrincessStudio.portrait(p,p.hairColor))+'</div>').join('');document.body.replaceChildren(board);
    board.querySelectorAll('div>svg').forEach(s=>s.style='display:block;width:240px;height:'+(mode==='stages'?389:280)+'px');
   },mode);
   await page.waitForTimeout(1500);await page.locator('#review').screenshot({path:path.join(output,mode+'.png')});
  }
  assert.deepEqual(errors,[]);console.log('PASS 84 rendered hair/face combinations: both eyes, both cheeks, chin clear; hair retained.');console.log('SCREENSHOTS',output);
 }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
