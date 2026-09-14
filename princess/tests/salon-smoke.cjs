'use strict';
const {chromium}=require('playwright'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),os=require('node:os');
(async()=>{
 const out=fs.mkdtempSync(path.join(os.tmpdir(),'princess-salon-'));
 const browser=await chromium.launch({channel:'msedge',headless:true});
 try{for(const viewport of [{width:1180,height:820},{width:820,height:1180},{width:390,height:844}]){
 const context=await browser.newContext({viewport,serviceWorkers:'block'}),page=await context.newPage(),errors=[];
 page.on('pageerror',e=>errors.push(e.message));
 await page.goto('http://127.0.0.1:8765/princess/?heads=natural&princess=mermaid&v=44');
 await page.locator('#tabs [data-key="hair"]').click();
 assert.equal(await page.locator('[data-salon]').count(),3);
 for(const style of ['half','braid','wave']){
 await page.locator('[data-salon="'+style+'"]').click();
 assert.equal(await page.locator('[data-salon="'+style+'"]').getAttribute('aria-pressed'),'true');
 assert.equal(await page.evaluate(()=>JSON.parse(localStorage.getItem('princess:outfits')).mermaid.salonStyle),style);
 assert.equal(await page.locator('#stage [data-art-version="salon-worn-v44"]').count(),1);
 await page.waitForTimeout(700);
 if(viewport.width===820)await page.locator('#stage').screenshot({path:path.join(out,style+'.png')});
 }
 await page.locator('[data-salon="braid"]').click();await page.reload();
 await page.locator('#tabs [data-key="hair"]').click();
 assert.equal(await page.locator('[data-salon="braid"]').getAttribute('aria-pressed'),'true');
 await page.locator('#tabs [data-key="dress"]').click();
 assert.equal(await page.locator('#swatches .sw').count(),0,'no fake recoloring of skin/body');
 await page.locator('#items [data-id="party"]').click();
 assert.equal(await page.locator('#stage [data-studio-part="dress/party"]').count(),1);
 assert(await page.locator('#swatches .sw').count()>0);
 await page.locator('#items [data-id="tail"]').click();
 await page.locator('#tabs [data-key="hair"]').click();
 assert.equal(await page.locator('[data-salon="braid"]').getAttribute('aria-pressed'),'true');
 // All generated art is loaded online, then style swaps and exports must work offline.
 await page.evaluate(async()=>{const p=princess();for(const s of PrincessStudio.salonStyles)await PrincessStudio.exportAssets({...state,salonStyle:s.id},p);});
 await context.setOffline(true);
 for(const style of ['wave','half','braid']){
 await page.locator('[data-salon="'+style+'"]').click();
 const external=await page.evaluate(async()=>{const svg=await buildExportSvg(state,princess());const doc=new DOMParser().parseFromString(svg,'image/svg+xml');return [...doc.querySelectorAll('image')].map(i=>i.getAttribute('href')).filter(h=>!h?.startsWith('data:image/'));});assert.deepEqual(external,[],style);
 }
 assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));
 assert.deepEqual(errors,[]);
 await page.waitForTimeout(1000);await page.screenshot({path:path.join(out,viewport.width+'.png')});
 console.log('PASS',viewport.width,'3 salon styles, saves, garment swaps, warmed offline exports');
 await context.close();
 }console.log('SCREENSHOTS',out);}finally{await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
