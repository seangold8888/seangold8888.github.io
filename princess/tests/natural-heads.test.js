'use strict';
const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const root=path.resolve(__dirname,'..'),source=fs.readFileSync(path.join(root,'studio.js'),'utf8');
const html=fs.readFileSync(path.join(root,'index.html'),'utf8');
const inline=[...html.matchAll(/<script(?:\s[^>]*)?>([\s\S]*?)<\/script>/g)].map(m=>m[1]).find(s=>s.includes('const PRINCESSES='));
function env(natural){
 const ctx={console,setTimeout,clearTimeout,URL,location:{search:natural?'?heads=natural&v=43':''},localStorage:{getItem:()=>null,setItem:()=>{}},fetch:async url=>({ok:true,blob:async()=>({bytes:fs.readFileSync(path.join(root,url))})}),FileReader:class{readAsDataURL(b){this.result='data:image/webp;base64,'+b.bytes.toString('base64');this.onload();}}};
 vm.createContext(ctx);vm.runInContext(source,ctx);
 vm.runInContext(inline.slice(0,inline.indexOf('// ---------- 시작 ----------')),ctx);
 vm.runInContext('globalThis.qa={PRINCESSES,defaultState}',ctx);
 return ctx;
}
test('12 distinct natural heads preserve original alpha PNGs and WebP pairs',()=>{
 const rows=require('../head-prompts-v43.json');assert.equal(rows.length,12);assert.equal(new Set(rows.map(r=>r.source)).size,12);
 for(const r of rows){for(const ext of ['png','webp'])assert(fs.statSync(path.join(root,'assets/heads-v43',r.id+'.'+ext)).size>10000);
 const b=fs.readFileSync(path.join(root,'assets/heads-v43',r.id+'.png'));
 assert.equal(b.readUInt32BE(16),1254);assert.equal(b.readUInt32BE(20),1254);assert.equal(b[25],6,'RGBA original '+r.id);
 }
});
test('preview replaces both old face and wig with one unfiltered natural head',()=>{
 const ctx=env(true),studio=ctx.PrincessStudio;assert.equal(studio.naturalHeads,true);
 for(const p of ctx.qa.PRINCESSES){
 const state=ctx.qa.defaultState(p),before=JSON.stringify(state);
 const svg=studio.render(state,p),portrait=studio.portrait(p,p.hairColor);
 for(const s of [svg,portrait]){
 assert.equal((s.match(/data-wear-layer="natural-head"/g)||[]).length,1,p.id);
 assert(s.includes('data-hide-old-head="true"'));
 assert(!/data-wear-layer="hair-(?:front|back)"/.test(s));
 assert(s.includes('assets/heads-v43/'+p.id+'.webp'));
 assert(!s.includes('NaN'));const ids=[...s.matchAll(/\bid="([^"]+)"/g)].map(m=>m[1]);
 assert.equal(ids.length,new Set(ids).size);
 for(const r of s.matchAll(/(?:url\(#([^)]*)\)|href="#([^"]+)")/g))assert(ids.includes(r[1]||r[2]),r[0]);
 }
 assert.equal(JSON.stringify(state),before,'outfit state untouched');
 const [w,c,e]=studio.headFits[p.id];assert(w>=110&&w<=150);assert(c>.45&&c<.55);assert(e>.3&&e<.6);
 assert(studio.fileKeys(state,p).includes('head/'+p.id));assert(!studio.fileKeys(state,p).some(k=>k.startsWith('hair/')));
 }
});
test('photo exports embed new heads with no external image references',async()=>{
 const ctx=env(true),studio=ctx.PrincessStudio;
 for(const p of ctx.qa.PRINCESSES){const st=ctx.qa.defaultState(p),assets=await studio.exportAssets(st,p),svg=studio.render(st,p,undefined,assets);
 assert(assets['head/'+p.id].startsWith('data:image/'));assert(!/<image\b[^>]*href="(?!data:image\/)/.test(svg));}
});
test('normal game keeps saved hairstyle and color behavior until user decides',()=>{
 const ctx=env(false),studio=ctx.PrincessStudio;assert.equal(studio.naturalHeads,false);
 for(const p of ctx.qa.PRINCESSES){const st=ctx.qa.defaultState(p);st.hairStyle='braid';st.hairColor='#ff8fc1';
 const svg=studio.render(st,p);assert(svg.includes('data-studio-part="hair/braid"'));assert(!svg.includes('data-wear-layer="natural-head"'));
 assert.equal(st.hairStyle,'braid');assert.equal(st.hairColor,'#ff8fc1');}
});
