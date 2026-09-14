'use strict';
const {chromium}=require('playwright'),assert=require('node:assert/strict'),fs=require('node:fs'),os=require('node:os'),path=require('node:path');
(async()=>{
 const output=fs.mkdtempSync(path.join(os.tmpdir(),'princess-natural-')),browser=await chromium.launch({channel:'msedge',headless:true});
 try{
 for(const viewport of [{width:1180,height:820},{width:820,height:1180},{width:390,height:844}]){
 const page=await browser.newPage({viewport,serviceWorkers:'block'}),errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.goto((process.env.PRINCESS_BASE_URL||'http://127.0.0.1:8765')+'/princess/?heads=natural&v=43');
 await page.waitForFunction(()=>globalThis.PrincessStudio?.naturalHeads);
 for(const id of ['snow','cinder','rapunzel','mermaid','thumb','kongjwi','briar','moon','frost','sahara','lotus','sunny']){
 await page.locator('#items [data-id="'+id+'"]').click();
 assert.equal(await page.locator('#stage [data-studio-part="head/'+id+'"]').count(),1);
 assert.equal(await page.locator('#stage [data-wear-layer="hair-front"]').count(),0);
 }
 await page.locator('#tabs [data-key="hair"]').click();assert(await page.locator('#intro').textContent().then(s=>s.includes('함께 그렸')));
 await page.locator('#tabs [data-key="princess"]').click();
 await page.waitForTimeout(1800);
 assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),'horizontal overflow');
 await page.screenshot({path:path.join(output,viewport.width+'.png')});
 assert.deepEqual(errors,[]);
 console.log('PASS',viewport.width,'12 heads, no legacy wigs, no horizontal overflow/errors');
 if(viewport.width===1180){
 await page.evaluate(()=>{
 const cards=PRINCESSES.map(p=>'<section><h3>'+p.name+'</h3>'+PrincessStudio.render(defaultState(p),p)+'</section>').join('');
 const gallery=document.createElement('div');gallery.id='qa-natural-gallery';gallery.style='position:absolute;top:0;left:0;z-index:9999;background:#eee8f2;display:grid;grid-template-columns:repeat(4,280px);gap:12px;padding:12px;';
 gallery.innerHTML='<style>#qa-natural-gallery section{width:280px}#qa-natural-gallery h3{margin:0;font:18px sans-serif;padding:8px}#qa-natural-gallery svg{width:280px;height:453px;display:block}</style>'+cards;
 document.body.append(gallery);
 });
 await page.waitForTimeout(2500);
 await page.locator('#qa-natural-gallery').screenshot({path:path.join(output,'all-12.png')});
 }
 await page.close();
 }
 console.log('SCREENSHOTS',output);
 }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
