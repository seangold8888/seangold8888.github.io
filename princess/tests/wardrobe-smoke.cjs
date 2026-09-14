'use strict';
const {chromium}=require('playwright'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),os=require('node:os');
(async()=>{
 const out=fs.mkdtempSync(path.join(os.tmpdir(),'princess-wardrobe-ui-')),browser=await chromium.launch({channel:'msedge',headless:true});
 try{
 for(const viewport of [{width:1180,height:820},{width:820,height:1180},{width:390,height:844}]){
 const context=await browser.newContext({viewport,serviceWorkers:'block'}),page=await context.newPage(),errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.goto('http://127.0.0.1:8765/princess/?heads=natural&princess=mermaid&v=45');
 await page.waitForFunction(()=>PrincessStudio.fullWardrobe);
 await page.locator('#tabs [data-key="dress"]').click();
 for(const id of 'ballgown aline party mermaidline hanbok tutu tail winter star rainbow summer rose adventure'.split(' ')){
 await page.locator('#items [data-id="'+id+'"]').click();
 assert.equal(await page.locator('#stage [data-studio-part="wardrobe/'+id+'"]').count(),1,id);
 }
 await page.locator('#items [data-id="party"]').click();
 await page.locator('#tabs [data-key="hair"]').click();await page.locator('[data-salon="braid"]').click();
 await page.reload();
 assert.equal(await page.locator('#stage [data-studio-part="wardrobe/party"]').count(),1);
 assert.equal(await page.evaluate(()=>state.salonStyle),'braid');
 for(const id of 'snow cinder rapunzel mermaid thumb kongjwi briar moon frost sahara lotus sunny'.split(' ')){
 await page.locator('#tabs [data-key="princess"]').click();await page.locator('#items [data-id="'+id+'"]').click();
 assert.equal(await page.locator('#stage [data-wear-layer="painted-outfit"]').count(),1);
 assert.equal(await page.locator('#stage [data-skin-tone="'+id+'"]').count(),1);
 }
 assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));
 await page.locator('#tabs [data-key="dress"]').click();
 if(viewport.width===820){
 const pixels=await page.evaluate(async()=>{
 const p=PRINCESSES.find(p=>p.id==='moon'),w=PrincessWardrobe,base={...defaultState(p),hand:null,crown:null,neck:null,pet:null,back:null};
 const g=w.geometry('party',p,PrincessStudio.identities,PrincessStudio.headAnchors),identity=PrincessStudio.identities[p.id];
 const point=(x,y)=>[Math.round(g.x+x*g.scale),Math.round(24+.96*(24+g.y+y*g.scale))];
 const coords=[point(335,330),point(740,520),point(512,450)],samples=[];
 for(const color of ['#ff0000','#0000ff']){
 const svg=await buildExportSvg({...base,dress:{id:'party',color}},p),url=URL.createObjectURL(new Blob([svg],{type:'image/svg+xml'}));
 const image=new Image();image.src=url;await image.decode();const c=document.createElement('canvas');c.width=420;c.height=680;const ctx=c.getContext('2d');ctx.drawImage(image,0,0);samples.push(coords.map(([x,y])=>Array.from(ctx.getImageData(x,y,1,1).data)));URL.revokeObjectURL(url);
 }
 return samples;
 });
 for(let i=0;i<2;i++)assert(pixels[0][i].every((v,c)=>Math.abs(v-pixels[1][i][c])<=3),'skin changed with dress dye '+JSON.stringify(pixels));
 assert(pixels[0][2].some((v,c)=>Math.abs(v-pixels[1][2][c])>30),'cloth did not change');
 console.log('PASS pixel check: two skin samples stable, fabric changes');
 }
 // Warm every dress for this princess, disable networking, then change dresses/export.
 await page.evaluate(async()=>{for(const d of DRESSES)await PrincessStudio.exportAssets({...state,dress:{id:d.id,color:'#ff8fc1'}},princess());});
 await context.setOffline(true);
 for(const id of ['rainbow','hanbok','party']){
 await page.locator('#items [data-id="'+id+'"]').click();
 const ok=await page.evaluate(async()=>{const s=await buildExportSvg(state,princess());const doc=new DOMParser().parseFromString(s,'image/svg+xml');return [...doc.querySelectorAll('image')].every(i=>i.getAttribute('href').startsWith('data:image/'));});assert(ok);
 }
 assert.deepEqual(errors,[]);
 await page.waitForTimeout(1500);await page.screenshot({path:path.join(out,viewport.width+'.png')});
 console.log('PASS',viewport.width,'13 dress taps, 12 princesses, saves, hair, warm-offline exports');
 await context.close();
 }console.log('SCREENSHOTS',out);
 }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
