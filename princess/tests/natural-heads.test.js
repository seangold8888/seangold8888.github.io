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
 assert(s.includes('data-hide-old-head="true"')||s.includes('data-art-version="salon-worn-v44"'));
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
test('salon preserves outfit state across all three heads and embeds the worn body',async()=>{
 const ctx=env(true),studio=ctx.PrincessStudio,p=ctx.qa.PRINCESSES.find(p=>p.id==='mermaid');
 assert.equal(studio.salonStyles.length,3);
 for(const style of studio.salonStyles){
 const st=ctx.qa.defaultState(p);st.salonStyle=style.id;const before=JSON.stringify(st);
 const assets=await studio.exportAssets(st,p),svg=studio.render(st,p,undefined,assets);
 assert.equal(JSON.stringify(st),before);
 assert(svg.includes('data-art-version="salon-worn-v44"'));
 for(const old of ['fabric-lining','arms-over-clothes','data-studio-part="dress/tail"','body-source','hair-front'])assert(!svg.includes(old),old);
 assert.equal((svg.match(/data-studio-part="outfit\/mermaid-tail"/g)||[]).length,1);
 assert(!/<image\b[^>]*href="(?!data:image\/)/.test(svg));
 const k=style.id==='wave'?'head/mermaid':'head/mermaid-'+style.id;assert(assets[k]);
 st.dress={id:'party',color:'#ff8fc1'};
 const other=studio.render(st,p);assert(other.includes('data-studio-part="dress/party"'));
 assert(!other.includes('data-art-version="salon-worn-v44"'));assert.equal(st.salonStyle,style.id);
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
test('salon delivery PNGs really have alpha, not painted checkerboards',()=>{
 for(const id of ['half','braid','tail-body']){
 const png=fs.readFileSync(path.join(root,'assets/salon-v44/mermaid-'+id+'.png'));
 assert.equal(png[25],6,'RGBA required '+id);
 assert(fs.statSync(path.join(root,'assets/salon-v44/mermaid-'+id+'.webp')).size>10000);
 }
 const sw=fs.readFileSync(path.join(root,'..','sw.js'),'utf8');
 assert(sw.includes('assets/salon-v44/mermaid-'));
});
test('octet-stream WebP responses export with a truthful image MIME',async()=>{
 const ctx=env(true),p=ctx.qa.PRINCESSES.find(p=>p.id==='mermaid');
 ctx.fetch=async url=>({ok:true,blob:async()=>new Blob([fs.readFileSync(path.join(root,url))],{type:'application/octet-stream'})});
 ctx.FileReader=class{readAsDataURL(blob){blob.arrayBuffer().then(b=>{this.result='data:'+blob.type+';base64,'+Buffer.from(b).toString('base64');this.onload();});}};
 const assets=await ctx.PrincessStudio.exportAssets(ctx.qa.defaultState(p),p);
 assert(assets['outfit/mermaid-tail'].startsWith('data:image/webp;base64,'));
 assert(assets['head/mermaid'].startsWith('data:image/webp;base64,'));
});
