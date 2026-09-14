'use strict';
const {chromium}=require('playwright'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),os=require('node:os');
(async()=>{const out=fs.mkdtempSync(path.join(os.tmpdir(),'princess-salon-all-')),b=await chromium.launch({channel:'msedge',headless:true});try{
 for(const viewport of [{width:1180,height:820},{width:820,height:1180},{width:390,height:844}]){const context=await b.newContext({viewport,serviceWorkers:'block'}),page=await context.newPage(),errors=[];page.on('pageerror',e=>errors.push(e.message));await page.goto('http://127.0.0.1:8765/princess/?heads=natural&v=47');
 for(const id of 'snow cinder rapunzel mermaid thumb kongjwi briar moon frost sahara lotus sunny'.split(' ')){
  await page.locator('#tabs [data-key="princess"]').click();await page.locator('#items [data-id="'+id+'"]').click();await page.locator('#tabs [data-key="hair"]').click();assert.equal(await page.locator('[data-salon]').count(),3,id);
  for(const style of ['wave','half','braid']){await page.locator('[data-salon="'+style+'"]').click();assert.equal(await page.evaluate(()=>state.salonStyle),style);const src=await page.locator('#stage [data-wear-layer="natural-head"] > image').getAttribute('href');assert(src.includes(style==='wave'?id+'.webp':id+'-'+style+'.webp'),id+' '+src);}
  await page.locator('#tabs [data-key="dress"]').click();await page.locator('#items [data-id="party"]').click();assert.equal(await page.evaluate(()=>state.salonStyle),'braid');await page.reload();assert.equal(await page.evaluate(()=>state.salonStyle),'braid');assert.equal(await page.evaluate(()=>state.dress.id),'party');
 }
 assert.equal(await page.evaluate(()=>Object.values(outfits).filter(s=>s.salonStyle==='braid').length),12);
 await page.evaluate(async()=>{const p=princess();for(const s of PrincessStudio.salonStyles)await PrincessStudio.exportAssets({...state,salonStyle:s.id},p);});await context.setOffline(true);await page.locator('#tabs [data-key="hair"]').click();
 for(const style of ['half','wave','braid']){await page.locator('[data-salon="'+style+'"]').click();assert(await page.evaluate(async()=>{const s=await buildExportSvg(state,princess());return !/<image\b[^>]*href="(?!data:image\/)/.test(s);}));}
 assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));assert.deepEqual(errors,[]);await page.waitForTimeout(1200);await page.screenshot({path:path.join(out,viewport.width+'.png')});console.log('PASS',viewport.width,'36 selections, 12 reloads, clothes preserved, offline exports');await context.close();
 }console.log('SCREENSHOTS',out);
}finally{await b.close();}})().catch(e=>{console.error(e);process.exitCode=1;});
