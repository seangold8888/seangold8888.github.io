'use strict';
const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const root=path.resolve(__dirname,'..');
function env(){const e={console,URL,setTimeout,clearTimeout,location:{search:'?heads=natural'},localStorage:{getItem:()=>null,setItem:()=>{}}};vm.createContext(e);for(const f of ['wardrobe','footwear','salon','studio'])vm.runInContext(fs.readFileSync(path.join(root,f+'.js'),'utf8'),e);const html=fs.readFileSync(path.join(root,'index.html'),'utf8'),js=[...html.matchAll(/<script(?:\s[^>]*)?>([\s\S]*?)<\/script>/g)].map(m=>m[1]).find(s=>s.includes('const PRINCESSES='));vm.runInContext(js.slice(0,js.indexOf('// ---------- 시작 ----------'))+';globalThis.qa={PRINCESSES,DRESSES,SHOES,defaultState};',e);return e;}
test('all 1,404 princess/outfit/shoe combinations preserve state and valid self-contained SVG references',()=>{
 const e=env();let count=0;for(const p of e.qa.PRINCESSES)for(const d of e.qa.DRESSES)for(const shoe of e.qa.SHOES){
  const st={...e.qa.defaultState(p),dress:{id:d.id,color:'#439cdd'},shoes:{id:shoe.id,color:'#439cdd'}},before=JSON.stringify(st),s=e.PrincessStudio.render(st,p);
  assert.equal(JSON.stringify(st),before);assert(!/NaN|undefined/.test(s),`${p.id}/${d.id}/${shoe.id}`);
  const ids=[...s.matchAll(/\bid="([^"]+)"/g)].map(m=>m[1]);assert.equal(ids.length,new Set(ids).size);
  for(const m of s.matchAll(/(?:url\(#([^)]*)\)|href="#([^"]+)")/g))assert(ids.includes(m[1]||m[2]),m[0]);
  if(d.id==='tail'){assert(!s.includes('data-foot-fit='));assert(!e.PrincessFootwear.layout(d.id,shoe.id));}
  else{assert(s.includes('data-foot-fit="worn-v49"'));assert(e.PrincessStudio.fileKeys(st,p).includes('footwear/'+shoe.id));const fit=e.PrincessFootwear.layout(d.id,shoe.id);assert(fit.cutY>fit.top&&fit.cutY<=fit.sole);}
  count++;
 }assert.equal(count,1404);
});
test('nine generated originals stay intact, WebP pairs and runtime chroma are explicit',()=>{
 const e=env();assert.equal(Object.keys(e.PrincessFootwear.worn).length,9);
 for(const [id,a] of Object.entries(e.PrincessFootwear.worn)){const png=fs.readFileSync(path.join(root,e.PrincessFootwear.path(id).replace('.webp','.png')));assert.equal(png.readUInt32BE(16),a.size);assert.equal(png.readUInt32BE(20),a.size);assert(fs.statSync(path.join(root,e.PrincessFootwear.path(id))).size>10000);assert(a.start<a.sole&&a.forefoot<a.sole);}
});
test('all masks explicitly bound source coordinates, with no sliced skin or old flat-lay renderer in natural output',()=>{
 const e=env(),p=e.qa.PRINCESSES[1];for(const shoe of e.qa.SHOES){const st={...e.qa.defaultState(p),dress:{id:'party',color:null},shoes:{id:shoe.id,color:null}},s=e.PrincessStudio.render(st,p);for(const m of s.matchAll(/<mask\b[^>]*maskUnits="userSpaceOnUse"[^>]*>/g)){assert(/\bx="/.test(m[0]),m[0]);assert(/\by="/.test(m[0]),m[0]);}assert(!s.includes('data-foot-fit="outfit-v49"'));assert(!s.includes('-cut-fade'));}
});
test('worn footwear module and nine assets are warmed offline without changing old art paths',()=>{
 const e=env(),sw=require('../../sw.js'),html=fs.readFileSync(path.join(root,'index.html'),'utf8');assert(sw.OPTIONAL_SHELL.includes('./princess/footwear.js?v=1'));assert(html.indexOf('footwear.js?v=1')<html.indexOf('studio.js?v=49'));for(const id of Object.keys(e.PrincessFootwear.worn))assert(sw.OPTIONAL_SHELL.includes('./princess/'+e.PrincessFootwear.path(id)));assert.equal(e.PrincessStudio.path('shoes','boots'),'assets/studio-v3/shoes-boots.webp');
});
