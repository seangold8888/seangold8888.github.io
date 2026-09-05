const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const assert = require('node:assert/strict');
const dir = path.resolve(__dirname, '..');
const studioSource = fs.readFileSync(path.join(dir, 'studio.js'), 'utf8');
const html = fs.readFileSync(path.join(dir, 'index.html'), 'utf8');
const inline = [...html.matchAll(/<script(?:\s[^>]*)?>([\s\S]*?)<\/script>/g)].map(m => m[1]).find(s => s.includes('const PRINCESSES='));
const appSource = inline.slice(0, inline.indexOf('// ---------- 시작 ----------'));
const json = value => JSON.parse(JSON.stringify(value));
function environment(seed = {}, options = {}) {
  const stored = new Map(Object.entries(seed));
  const calls = new Map();
  const pendingFailures = new Map(Object.entries(options.failures || {}));
  const ctx = {console, setTimeout, clearTimeout, Promise, Blob, URL,
    localStorage: {getItem: k => stored.get(k) ?? null, setItem: (k,v) => stored.set(k,String(v))},
    fetch: async (url) => {
      calls.set(url, (calls.get(url) || 0) + 1);
      const failures = pendingFailures.get(url) || 0;
      if (failures) { pendingFailures.set(url, failures - 1); throw new Error('injected network failure: '+url); }
      const bytes = fs.readFileSync(path.join(dir,url));
      return {ok: true, status: 200, blob: async () => ({bytes, type: url.endsWith('.jpg')?'image/jpeg':'image/png'})};
    },
    FileReader: class { readAsDataURL(blob) { queueMicrotask(() => {
      if(options.readerFailures > 0){options.readerFailures--; this.onerror(new Error('injected reader failure')); return;}
      this.result='data:'+blob.type+';base64,'+blob.bytes.toString('base64'); this.onload();
    }); } }
  };
  vm.createContext(ctx);
  vm.runInContext(studioSource,ctx,{filename:'studio.js'});
  vm.runInContext(appSource,ctx,{filename:'index.html-inline'});
  vm.runInContext('globalThis.QA={PRINCESSES,CATS,SLOTS,defaultState,loadPrincess,princess,dollSVG,thumbSVG,princessThumb,buildExportSvg,ensureDollBaseData,getState:()=>state,getOutfits:()=>outfits}',ctx);
  return {ctx, api: ctx.QA, studio: ctx.PrincessStudio, calls, stored};
}
function ids(svg){return [...svg.matchAll(/\bid="([^"]+)"/g)].map(m=>m[1]);}
function refs(svg){return [...svg.matchAll(/(?:url\(#([^)]*)\)|href="#([^"]+)")/g)].map(m=>m[1]||m[2]);}
function checkSvg(svg){
  const all = ids(svg), defined = new Set(all);
  assert.equal(all.length,defined.size,'duplicate id in individual SVG');
  for(const r of refs(svg))assert(defined.has(r),'undefined SVG reference: '+r);
  assert(!svg.replace(/data:image\/[^\"]*/g,'').includes('NaN'),'invalid numeric output');
  assert(!svg.includes('href="undefined"'),'undefined image href');
}
async function main(){
  const env=environment(), {api,studio}=env;
  const allPaths=[];
  const catalogCounts={};
  for(const cat of api.CATS.filter(c=>c.list)){
    catalogCounts[cat.key]=cat.list.length;
    for(const item of cat.list){
      const relative=studio.path(cat.key,item.id), absolute=path.join(dir,relative);
      assert(fs.existsSync(absolute),relative+' missing');
      assert(fs.statSync(absolute).size>0,relative+' empty');
      if(cat.key!=='bg')assert(studio.rects[cat.key]?.[item.id],relative+' rectangle missing');
      allPaths.push(relative);
      checkSvg(api.thumbSVG(cat.key,item,'#ff8fc1'));
    }
  }
  for(const p of api.PRINCESSES){
    const relative=studio.path('hair',p.hair);assert(fs.existsSync(path.join(dir,relative)),relative);
    assert(studio.rects.hair[p.hair]);allPaths.push(relative);checkSvg(api.princessThumb(p,p.hairColor));
    const bodyPath=studio.path('body',p.id);
    assert(fs.existsSync(path.join(dir,bodyPath)),bodyPath);allPaths.push(bodyPath);
    const bytes=fs.readFileSync(path.join(dir,bodyPath));
    assert(bytes.includes(Buffer.from('tRNS'))||bytes[25]===6,'body PNG has no transparency: '+p.id);
    assert(studio.identities[p.id]);
  }
  assert.equal(new Set(allPaths).size,103,'expected 95 wardrobe/scenery assets and 8 individual bodies');
  const dirFiles=fs.readdirSync(path.join(dir,'assets/studio-v3'));
  assert.equal(dirFiles.filter(f=>/\.(png|jpg)$/.test(f)).length,95,'studio image count');
  const thumbDocument=api.CATS.filter(c=>c.list).map(c=>c.list.map(i=>api.thumbSVG(c.key,i,'#ff8fc1')).join('')).join('')+api.PRINCESSES.map(p=>api.princessThumb(p,p.hairColor)).join('');
  assert.equal(ids(thumbDocument).length,new Set(ids(thumbDocument)).size,'cross-thumbnail duplicate IDs');
  let exportCases=0;
  for(const p of api.PRINCESSES){
    const s=json(api.defaultState(p));
    checkSvg(api.dollSVG(s,p));
    const svg=await api.buildExportSvg(s,p);checkSvg(svg);
    const images=[...svg.matchAll(/<image\b[^>]*href="([^"]+)"/g)].map(m=>m[1]);
    assert(images.every(s=>s.startsWith('data:image/')),'export has external image reference');
    for(const k of studio.fileKeys(s,p)){
      const [cat,id]=k.split('/');
      if(cat==='bg')assert(svg.includes('data-studio-background="'+id+'"'));
      else assert(svg.includes('data-studio-part="'+k+'"'));
    }
    exportCases++;
  }
  const p=api.PRINCESSES[0];
  for(const cat of api.CATS.filter(c=>c.list))for(const item of cat.list){
    const s=json(api.defaultState(p));
    if(cat.key==='bg')s.bg=item.id;else s[cat.key]={id:item.id,color:'#6fc3ff'};
    const svg=await api.buildExportSvg(s,p);checkSvg(svg);
    assert(!/<image\b[^>]*href="(?!data:image\/)/.test(svg),'unembedded image: '+cat.key+'/'+item.id);
    if(cat.key==='bg')assert(svg.includes('data-studio-background="'+item.id+'"'));
    else assert(svg.includes('data-studio-part="'+cat.key+'/'+item.id+'"'));
    exportCases++;
  }
  const allSlots=json(api.defaultState(p));
  for(const cat of api.CATS.filter(c=>api.SLOTS.includes(c.key)))allSlots[cat.key]={id:cat.list[0].id,color:'#ffffff'};
  const allSvg=await api.buildExportSvg(allSlots,p);checkSvg(allSvg);
  for(const cat of api.SLOTS)assert(allSvg.includes('data-studio-part="'+cat+'/'+allSlots[cat].id+'"'),'missing selected slot '+cat);
  const tailState={...allSlots,dress:{id:'tail',color:'#5fd9c9'}};
  const tailSvg=await api.buildExportSvg(tailState,p);checkSvg(tailSvg);
  assert(!tailSvg.includes('data-studio-part="shoes/'),'tail shoes drawn');
  assert(studio.fileKeys(tailState,p).every(k=>!k.startsWith('shoes/')),'tail shoes fetched');
  const legacyOutfits=Object.fromEntries(api.PRINCESSES.map(p=>[p.id,json(api.defaultState(p))]));
  for(const cat of api.CATS.filter(c=>api.SLOTS.includes(c.key)))legacyOutfits.snow[cat.key]={id:cat.list.at(-1).id,color:'#8b5a3c'};
  legacyOutfits.snow.bg='cherry';legacyOutfits.snow.hairColor='#e9e4f5';
  const legacy=environment({'princess:outfits':JSON.stringify(legacyOutfits)});
  for(const p of legacy.api.PRINCESSES){legacy.api.loadPrincess(p.id);assert.deepEqual(json(legacy.api.getState()),legacyOutfits[p.id]);checkSvg(legacy.api.dollSVG(legacy.api.getState(),p));}
  const partial=environment({'princess:outfits':JSON.stringify({snow:{bg:'deleted-scene',dress:{id:'deleted-dress',color:'#ffffff'},shoes:null,hairColor:'#3b3f7a'}})});
  partial.api.loadPrincess('snow');assert.equal(partial.api.getState().bg,'forest');assert.equal(partial.api.getState().dress.id,'aline');assert.equal(partial.api.getState().shoes,null);assert.equal(partial.api.getState().hairColor,'#3b3f7a');
  const retryAsset=studio.path('bg','forest');
  const retry=environment({}, {failures:{[retryAsset]:1}});
  await assert.rejects(()=>retry.api.buildExportSvg(allSlots,p));
  await retry.api.buildExportSvg(allSlots,p);assert.equal(retry.calls.get(retryAsset),2);
  const bodyPath=studio.path('body',p.id);
  const retryBody=environment({}, {failures:{[bodyPath]:1}});
  await assert.rejects(()=>retryBody.api.buildExportSvg(allSlots,p));
  await retryBody.api.buildExportSvg(allSlots,p);assert.equal(retryBody.calls.get(bodyPath),2);
  const retryReader=environment({}, {readerFailures:1});
  await assert.rejects(()=>retryReader.api.buildExportSvg(allSlots,p));
  await retryReader.api.buildExportSvg(allSlots,p);
  const concurrent=environment();
  await Promise.all([concurrent.api.buildExportSvg(allSlots,p),concurrent.api.buildExportSvg(allSlots,p)]);
  assert([...concurrent.calls.values()].every(n=>n===1),'duplicate concurrent requests');
  const repeated=api.thumbSVG('dress',api.CATS.find(c=>c.key==='dress').list[0],'#ff8fc1')+api.thumbSVG('dress',api.CATS.find(c=>c.key==='dress').list[0],'#6fc3ff');
  console.log(JSON.stringify({ok:true,studioPaths:new Set(allPaths).size,catalogCounts,exportCases,legacyPrincesses:api.PRINCESSES.length,thumbnailIds:ids(thumbDocument).length,allSlots:true,tailShoeSuppression:true,assetRetry:true,bodyRetry:true,readerRetry:true,concurrentRequestDeduplication:true,repeatSameItemThumbnailDuplicateIds:ids(repeated).length-new Set(ids(repeated)).size},null,2));
}
require('node:test')('studio assets, all selections, saved outfits and photo export stay in sync', main);
