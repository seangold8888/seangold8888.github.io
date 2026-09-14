'use strict';
const {chromium}=require('playwright'),assert=require('node:assert/strict'),fs=require('node:fs'),os=require('node:os'),path=require('node:path');
(async()=>{
 const out=fs.mkdtempSync(path.join(os.tmpdir(),'princess-wardrobe-')),browser=await chromium.launch({channel:'msedge',headless:true});
 try{
 const page=await browser.newPage({viewport:{width:1180,height:820},serviceWorkers:'block'}),errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.goto('http://127.0.0.1:8765/princess/?heads=natural&wardrobe=all&v=45');await page.waitForFunction(()=>PrincessStudio.fullWardrobe);
 const result=await page.evaluate(async()=>{
 let count=0;
 for(const p of PRINCESSES)for(const d of DRESSES){
 const st={...defaultState(p),dress:{id:d.id,color:p.def.dress[1]}};
 const svg=await buildExportSvg(st,p),doc=new DOMParser().parseFromString(svg,'image/svg+xml');
 if(doc.querySelector('parsererror'))throw Error('invalid SVG '+p.id+'/'+d.id);
 if(doc.querySelector('[data-art-version]')?.getAttribute('data-art-version')!=='wardrobe-v45')throw Error('legacy dress '+p.id+'/'+d.id);
 if([...doc.querySelectorAll('image')].some(i=>!i.getAttribute('href')?.startsWith('data:image/')))throw Error('external image');
 const ids=[...doc.querySelectorAll('[id]')].map(e=>e.id);if(ids.length!==new Set(ids).size)throw Error('duplicate ids');
 if(svg.includes('fabric-lining')||svg.includes('arms-over-clothes'))throw Error('legacy layers');
 count++;
 }
 return count;
 });
 assert.equal(result,156);console.log('PASS',result,'painted outfit combinations and embedded exports');
 for(const group of ['princesses','dresses']){
 await page.evaluate(group=>{
 const existing=document.getElementById('wardrobe-review');if(existing)existing.remove();
 const cases=group==='princesses'?PRINCESSES.map(p=>({p,st:defaultState(p),label:p.name})):DRESSES.map(d=>{const p=PRINCESSES.find(p=>p.id==='mermaid');return {p,st:{...defaultState(p),dress:{id:d.id,color:d.id==='rainbow'?null:'#9b74dd'}},label:d.name};});
 const el=document.createElement('div');el.id='wardrobe-review';el.style='position:absolute;top:0;left:0;z-index:9999;padding:10px;display:grid;grid-template-columns:repeat(4,280px);gap:10px;background:#eee5f3';
 el.innerHTML='<style>#wardrobe-review section{width:280px}#wardrobe-review h3{margin:5px;font:18px sans-serif}#wardrobe-review svg{display:block;width:280px;height:453px}</style>'+cases.map((c,i)=>'<section><h3>'+c.label+'</h3>'+scopeSvgIds(PrincessStudio.render(c.st,c.p),'review-'+i)+'</section>').join('');
 document.body.append(el);
 },group);
 await page.waitForTimeout(2500);await page.locator('#wardrobe-review').screenshot({path:path.join(out,group+'.png')});
 }
 assert.deepEqual(errors,[]);console.log('SCREENSHOTS',out);
 }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
