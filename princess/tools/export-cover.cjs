'use strict';
// Export the actual game renderer, not a separate illustration of an old doll.
const {chromium}=require('playwright'),path=require('node:path');
(async()=>{const browser=await chromium.launch({channel:'msedge',headless:true});try{
 const page=await browser.newPage({viewport:{width:900,height:800},serviceWorkers:'block'});
 await page.goto('http://127.0.0.1:8765/princess/?heads=natural&princess=snow&v=49');
 await page.evaluate(async()=>{
  const p=PRINCESSES.find(p=>p.id==='snow');
  const outfit={...defaultState(p),hand:null,neck:null,pet:null,back:null};
  const svg=await buildExportSvg(outfit,p);
  const box=document.createElement('div');box.id='cover-export';box.style.cssText='position:fixed;inset:0 auto auto 0;width:840px;height:600px;z-index:99999;background:#ece5f3;';
  box.innerHTML=svg;const image=box.querySelector('svg');image.setAttribute('viewBox','0 30 420 300');image.setAttribute('width','840');image.setAttribute('height','600');image.style.cssText='display:block;width:840px;height:600px';document.body.appendChild(box);
  await Promise.all([...image.querySelectorAll('image')].map(n=>new Promise((resolve,reject)=>{const i=new Image();i.onload=resolve;i.onerror=reject;i.src=n.getAttribute('href');})));
 });
 await page.locator('#cover-export').screenshot({path:path.resolve(__dirname,'../cover-natural-v50.png')});
}finally{await browser.close();}})().catch(e=>{console.error(e);process.exitCode=1;});
