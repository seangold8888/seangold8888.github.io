'use strict';
const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const dir=path.resolve(__dirname,'..'),html=fs.readFileSync(path.join(dir,'index.html'),'utf8');
function env(){
 const ctx={console,setTimeout,clearTimeout,URL,location:{search:'?heads=natural'},localStorage:{getItem:()=>null,setItem:()=>{}},fetch:async url=>({ok:true,blob:async()=>({bytes:fs.readFileSync(path.join(dir,url))})}),FileReader:class{readAsDataURL(b){this.result='data:image/webp;base64,'+b.bytes.toString('base64');this.onload();}}};
 vm.createContext(ctx);for(const f of ['wardrobe.js','footwear.js','salon.js','studio.js'])vm.runInContext(fs.readFileSync(path.join(dir,f),'utf8'),ctx);
 const s=[...html.matchAll(/<script(?:\s[^>]*)?>([\s\S]*?)<\/script>/g)].map(m=>m[1]).find(s=>s.includes('const PRINCESSES='));
 vm.runInContext(s.slice(0,s.indexOf('// ---------- 시작 ----------')),ctx);vm.runInContext('globalThis.qa={PRINCESSES,DRESSES,defaultState,scopeSvgIds}',ctx);return ctx;
}
function check(svg){
 assert(!svg.replace(/data:image\/[^"]*/g,'').includes('NaN'));const ids=[...svg.matchAll(/\bid="([^"]+)"/g)].map(m=>m[1]);assert.equal(ids.length,new Set(ids).size);
 for(const m of svg.matchAll(/(?:url\(#([^)]*)\)|href="#([^"]+)")/g))assert(ids.includes(m[1]||m[2]),'broken reference '+m[0]);
}
test('all 13 clothing choices use painted outfits for all 12 princesses',async()=>{
 const e=env();assert(e.PrincessStudio.fullWardrobe);let count=0;
 assert.equal(e.qa.DRESSES.length,13);assert.equal(e.qa.PRINCESSES.length,12);
 for(const p of e.qa.PRINCESSES)for(const d of e.qa.DRESSES){
 const st={...e.qa.defaultState(p),salonStyle:'braid',dress:{id:d.id,color:'#ff8fc1'}},before=JSON.stringify(st);
 const assets=await e.PrincessStudio.exportAssets(st,p),svg=e.PrincessStudio.render(st,p,undefined,assets);
 assert(svg.includes('data-art-version="wardrobe-v45"'));assert(svg.includes('data-studio-part="wardrobe/'+d.id+'"'));
 for(const old of ['fabric-lining','arms-over-clothes','dress-fit'])assert(!svg.includes(old),old);
 assert(!/<image\b[^>]*href="(?!data:image\/)/.test(svg));check(svg);
 assert.equal(JSON.stringify(st),before);
 assert(e.PrincessStudio.fileKeys(st,p).includes('wardrobe/'+d.id));count++;
 }
 assert.equal(count,156);
});
test('new original PNGs retain alpha and every garment has a WebP',()=>{
 const e=env();
 for(const id of e.PrincessWardrobe.ids){
 const webp=path.join(dir,e.PrincessWardrobe.path(id)),png=webp.replace(/\.webp$/,'.png');
 assert(fs.statSync(webp).size>10000);const b=fs.readFileSync(png);assert.equal(b[25],6,id+' RGBA');
 assert.equal(b.readUInt32BE(16),1024);assert.equal(b.readUInt32BE(20),1536);
 }
});
test('skin tone and cloth color are separate SVG materials; rainbow stays multicolored',()=>{
 const e=env(),p=e.qa.PRINCESSES.find(p=>p.id==='moon');
 const s={...e.qa.defaultState(p),dress:{id:'party',color:'#ff0000'}},svg=e.PrincessStudio.render(s,p);
 assert(svg.includes('data-skin-tone="moon"'));assert(svg.includes('-skin-only'));assert(svg.includes('-cloth'));assert(svg.includes('-tone'));
 s.dress={id:'rainbow',color:'#ff0000'};const rainbow=e.PrincessStudio.render(s,p);
 assert(!/use href="#[^"]*-worn-source" filter="url\(#[^"]*-worn-cloth\)"/.test(rainbow));
});
test('scoped review/export SVGs also update local use href references',()=>{
 const e=env(),p=e.qa.PRINCESSES[0],svg=e.PrincessStudio.render(e.qa.defaultState(p),p);
 const a=e.qa.scopeSvgIds(svg,'one'),b=e.qa.scopeSvgIds(svg,'two');check(a);check(b);
 const ids=[...(a+b).matchAll(/\bid="([^"]+)"/g)].map(m=>m[1]);assert.equal(ids.length,new Set(ids).size);
});

test('natural wardrobe uses common body proportions and calibrated neck materials',()=>{
 const e=env();
 for(const p of e.qa.PRINCESSES){
  const svg=e.PrincessStudio.render({...e.qa.defaultState(p),dress:{id:'tail',color:'#ff80aa'}},p);
  assert(svg.includes('data-proportions="unified-v46" transform="translate(0 24)"'));
  assert(svg.includes('gradientUnits="userSpaceOnUse" x1="0" y1="100" x2="0" y2="110"'));
  const skinFilter=svg.match(/<filter id="[^"]*-worn-tone"[\s\S]*?<\/filter>/)[0];
  assert(!skinFilter.includes('type="saturate"'));assert(skinFilter.includes('type="linear" slope='));
  const head=svg.slice(svg.indexOf('data-wear-layer="natural-head"'));
  const width=Number(head.match(/<image[^>]* width="([\d.]+)"/)[1]);
  assert(Math.abs(width-e.PrincessStudio.headFits[p.id][0]*.9)<.001);
 }
});

test('all painted necks overlap the portrait fade and fit only the local neck band',()=>{
 const e=env();
 for(const p of e.qa.PRINCESSES)for(const id of e.PrincessWardrobe.ids){
  const g=e.PrincessWardrobe.geometry(id,p,e.PrincessStudio.identities,e.PrincessStudio.headAnchors);
  assert(Math.abs(g.y+e.PrincessWardrobe.fits[id].neckY*g.scale-94)<.001);
  for(const style of ['wave','half','braid']){
   const svg=e.PrincessStudio.render({...e.qa.defaultState(p),salonStyle:style,dress:{id,color:null}},p);
   assert(svg.includes('y="98"'));assert(svg.includes('height="26"'));
   assert(svg.includes('<feDisplacementMap'));assert(svg.includes('scale="14"'));
   const map=decodeURIComponent(svg.match(/<feImage href="data:image\/svg\+xml,([^"]+)"/)[1]);
   assert(map.includes('y="97"'));assert(map.includes('height="18"'));
   assert(map.includes('offset="1" stop-color="rgb(128,128,128)"'));
   assert(!svg.includes('NaN'));check(svg);
  }
 }
});

test('necklaces render a single front drape, not a clasp and rear loop on the throat',()=>{
 const e=env();
 for(const p of e.qa.PRINCESSES)for(const id of Object.keys(e.PrincessStudio.rects.neck)){
  const svg=e.PrincessStudio.render({...e.qa.defaultState(p),neck:{id,color:null}},p);check(svg);
  assert(!svg.includes('data-wear-layer="neck-back"'));
  if(id!=='norigae'){assert.equal((svg.match(/data-neck-fit="front-drape-v48"/g)||[]).length,1);assert(svg.includes('-drape'));}
 }
});

test('natural headwear follows hairstyle roots and keeps tiaras in front of hair',()=>{
 const e=env();
 for(const p of e.qa.PRINCESSES)for(const style of ['wave','half','braid']){
  for(const id of Object.keys(e.PrincessStudio.rects.crown)){
   const fit=e.PrincessStudio.accessoryPlacement('crown',id,{...p,salonStyle:style});
   assert(Object.values(fit).every(Number.isFinite));assert(fit.sx>0&&fit.sy>0);
   const svg=e.PrincessStudio.render({...e.qa.defaultState(p),salonStyle:style,crown:{id,color:null}},p);check(svg);
   assert(svg.includes('data-headwear-fit="hair-root-v48"'));
   if(['tiara','pearls'].includes(id))assert(!svg.includes('data-wear-layer="headwear-back"'));
   if(['crown','flowers'].includes(id))assert(svg.indexOf('headwear-back')<svg.indexOf('natural-head'));
   if(id==='veil'){assert(!svg.includes('data-wear-layer="headwear-front"'));assert(svg.indexOf('headwear-back')<svg.indexOf('painted-outfit'));}
  }
 }
});
