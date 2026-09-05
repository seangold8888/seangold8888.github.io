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
      return {ok: true, status: 200, blob: async () => ({bytes, type: url.endsWith('.jpg')?'image/jpeg':url.endsWith('.webp')?'image/webp':'image/png'})};
    },
    FileReader: class { readAsDataURL(blob) { queueMicrotask(() => {
      if(options.readerFailures > 0){options.readerFailures--; this.onerror(new Error('injected reader failure')); return;}
      this.result='data:'+blob.type+';base64,'+blob.bytes.toString('base64'); this.onload();
    }); } }
  };
  vm.createContext(ctx);
  vm.runInContext(studioSource,ctx,{filename:'studio.js'});
  vm.runInContext(appSource,ctx,{filename:'index.html-inline'});
  vm.runInContext('globalThis.QA={PRINCESSES,CATS,SLOTS,defaultState,loadPrincess,princess,dollSVG,thumbSVG,princessThumb,buildExportSvg,ensureDollBaseData,renderPanel,renderTabs,randomize,setTab:value=>tab=value,getState:()=>state,getOutfits:()=>outfits}',ctx);
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
    assert.equal(bytes.toString('ascii',8,12),'WEBP');
    assert(bytes[20]&16,'body WebP has no alpha channel: '+p.id);
    assert(studio.identities[p.id]);
    const gripPath=studio.path('grip',p.id);assert(fs.existsSync(path.join(dir,gripPath)));allPaths.push(gripPath);
  }
  assert.equal(new Set(allPaths).size,95+2*api.PRINCESSES.length,'expected wardrobe/scenery plus a unique body and grip for every princess');
  const dirFiles=fs.readdirSync(path.join(dir,'assets/studio-v3'));
  assert.equal(dirFiles.filter(f=>/\.(webp|jpg)$/.test(f)).length,95,'studio image count');
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
    if(cat.key==='bg')s.bg=item.id;else if(cat.key==='hair')s.hairStyle=item.id;else s[cat.key]={id:item.id,color:'#6fc3ff'};
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
  for(const p of legacy.api.PRINCESSES){legacy.api.loadPrincess(p.id);const expected=json(legacyOutfits[p.id]);if(expected.pet)delete expected.pet.color;assert.deepEqual(json(legacy.api.getState()),expected);checkSvg(legacy.api.dollSVG(legacy.api.getState(),p));}
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
require('node:test')('wearing layers preserve shoe openings, hair occlusion and gripping hands',()=>{
  const {api,studio}=environment();let combinations=0;
  for(const p of api.PRINCESSES)for(const dress of api.CATS.find(c=>c.key==='dress').list)for(const shoe of api.CATS.find(c=>c.key==='shoes').list){
    const s=json(api.defaultState(p));s.dress={id:dress.id,color:'#6fc3ff'};s.shoes={id:shoe.id,color:'#ff8fc1'};
    s.hand={id:'wand',color:'#ffd93d'};s.neck={id:'pearls',color:'#ffffff'};
    const svg=api.dollSVG(s,p);checkSvg(svg);
    const at=name=>svg.indexOf('data-wear-layer="'+name+'"');
    assert(at('neck-front')<at('hair-front'));
    assert(at('held-prop')<at('gripping-fingers'));
    assert(svg.includes('data-studio-part="grip/'+p.id+'"'));
    if(dress.id!=='tail'){
      assert(at('shoe-back')<svg.indexOf('data-studio-part="body/'));
      assert(dress.id==='adventure'?at('shoe-front')>at('clothes'):at('shoe-front')<at('clothes'));
      assert(svg.includes('-opening-0')&&svg.includes('-opening-1'));
    }else assert.equal(at('shoe-front'),-1);
    combinations++;
  }
  assert.equal(combinations,api.PRINCESSES.length*13*9);
  const p=api.PRINCESSES[0],s=json(api.defaultState(p));s.hand=null;
  assert(!studio.fileKeys(s,p).some(k=>k.startsWith('grip/')));
});
require('node:test')('all hair choices export and persist independently; old saves keep their original hair',async()=>{
  const {api,studio}=environment(),styles=api.CATS.find(c=>c.key==='hair').list;
  assert.equal(styles.length,8);
  for(const p of api.PRINCESSES)for(const hair of styles){
    const s={...json(api.defaultState(p)),hairStyle:hair.id,hairColor:'#c98bff'};
    assert(studio.fileKeys(s,p).includes('hair/'+hair.id));
    const svg=await api.buildExportSvg(s,p);checkSvg(svg);
    assert(svg.includes('data-studio-part="hair/'+hair.id+'"'));
    assert(svg.includes('data:image/webp;base64,'));
    assert(!/<image\b[^>]*href="(?!data:image\/)/.test(svg));
  }
  const saved={snow:{hairStyle:'afro',hairColor:'#c98bff'},moon:{hairStyle:'braid',hairColor:'#ffffff'},cinder:{hairStyle:'removed'}};
  const env=environment({'princess:outfits':JSON.stringify(saved)});
  env.api.loadPrincess('snow');assert.equal(env.api.getState().hairStyle,'afro');
  env.api.loadPrincess('moon');assert.equal(env.api.getState().hairStyle,'braid');
  env.api.loadPrincess('snow');assert.equal(env.api.getState().hairStyle,'afro');
  const reloaded=environment({'princess:outfits':env.stored.get('princess:outfits')});
  reloaded.api.loadPrincess('moon');assert.equal(reloaded.api.getState().hairStyle,'braid');
  env.api.loadPrincess('cinder');assert.equal(env.api.getState().hairStyle,'bun');
  for(const p of api.PRINCESSES){
    const old=json(api.defaultState(p));delete old.hairStyle;
    const migrated=environment({'princess:outfits':JSON.stringify({[p.id]:old})});
    migrated.api.loadPrincess(p.id);assert.equal(migrated.api.getState().hairStyle,p.hair);
    assert(studio.fileKeys(old,p).includes('hair/'+p.hair));
  }
});
require('node:test')('photo safe area contains every crown and hairstyle for all body heights',()=>{
  const {api,studio}=environment();
  for(const p of api.PRINCESSES){
    const identity=studio.identities[p.id],offset=604-580*identity.sy;
    for(const rect of [...Object.values(studio.rects.crown),...Object.values(studio.rects.hair)]){
      const top=24+.96*(offset+rect[1]*identity.sy);
      assert(top>=16,`${p.id} headwear outside safe top margin: ${top}`);
    }
    const s={...json(api.defaultState(p)),crown:{id:'bunny',color:'#ffffff'}};
    const svg=api.dollSVG(s,p);
    assert.match(svg,/data-photo-safe="true" transform="translate\(0 24\) scale\(1 .96\)"/);
    assert(24+.96*(offset+587*identity.sy)<650,'feet or tail outside frame');
  }
});
require('node:test')('hair tab controls change style and color without changing the princess or dress',()=>{
  const {api,ctx,stored}=environment(),nodes=new Map();
  function node(id){
    if(!nodes.has(id))nodes.set(id,{innerHTML:'',scrollLeft:0,scrollTop:0,classList:{add(){},remove(){}},querySelectorAll(){
      return [...this.innerHTML.matchAll(/<button\b([^>]*)>/g)].map(m=>({
        dataset:Object.fromEntries([...m[1].matchAll(/data-([\w]+)="([^"]*)"/g)].map(a=>[a[1],a[2]])),
        addEventListener(event,fn){this[event]=fn;},
      }));
    }});
    return nodes.get(id);
  }
  ctx.document={getElementById:node};ctx.requestAnimationFrame=fn=>fn();
  // Retain the synthetic buttons that receive the real event handlers.
  for(const id of ['items','swatches','tabs']){const el=node(id),query=el.querySelectorAll;el.querySelectorAll=function(){return this.buttons=query.call(this);};}
  api.loadPrincess('snow');api.renderTabs();
  node('tabs').buttons.find(b=>b.dataset.key==='hair').click();
  const previousDress=json(api.getState().dress);
  assert.equal(node('items').buttons.length,8);
  node('items').buttons.find(b=>b.dataset.id==='wavy').click();
  assert.equal(api.getState().hairStyle,'wavy');
  assert.equal(api.princess().id,'snow');assert.deepEqual(json(api.getState().dress),previousDress);
  const color=node('swatches').buttons.at(-1).dataset.c;
  node('swatches').buttons.at(-1).click();assert.equal(api.getState().hairColor,color);
  assert.equal(JSON.parse(stored.get('princess:outfits')).snow.hairStyle,'wavy');
  assert(node('stage').innerHTML.includes('data-studio-part="hair/wavy"'));
  api.setTab('pet');api.renderPanel();assert.equal(node('swatches').innerHTML,'');
  api.setTab('dress');api.renderPanel();
  node('swatches').buttons.find(b=>b.dataset.c==='').click();assert.equal(api.getState().dress.color,null);
  assert(node('stage').innerHTML.includes('data-wear-layer="fabric-lining"'));
  // The real picker must reach all four additions without losing the old outfit.
  const snowOutfit=json(api.getState());
  api.setTab('princess');api.renderPanel();
  assert.equal(node('items').buttons.length,12);
  for(const id of ['frost','sahara','lotus','sunny']){
    node('items').buttons.find(b=>b.dataset.id===id).click();
    assert.equal(api.princess().id,id);
    assert(node('stage').innerHTML.includes('data-studio-part="body/'+id+'"'));
    const ownDress=json(api.getState().dress);
    api.setTab('hair');api.renderPanel();
    node('items').buttons.find(b=>b.dataset.id==='bob').click();
    assert.deepEqual(json(api.getState().dress),ownDress);
    api.setTab('princess');api.renderPanel();
  }
  node('items').buttons.find(b=>b.dataset.id==='snow').click();
  assert.deepEqual(json(api.getState()),snowOutfit);
  const reloaded=environment({'princess:outfits':stored.get('princess:outfits')});
  for(const id of ['frost','sahara','lotus','sunny']){
    reloaded.api.loadPrincess(id);assert.equal(reloaded.api.getState().hairStyle,'bob');
    assert.deepEqual(Object.keys(reloaded.api.getState().pet),['id']);
  }
});
require('node:test')('all pets retain original colors in thumbnails, exports and random outfits',async()=>{
  const {api,studio,ctx}=environment(),p=api.PRINCESSES[0];
  for(const pet of api.CATS.find(c=>c.key==='pet').list){
    const a=api.thumbSVG('pet',pet,'#ff0000'),b=api.thumbSVG('pet',pet,'#0000ff');
    assert.equal(a,b);assert(!a.includes('filter='));assert(a.includes('data-natural-color="true"'));
    const s=json(api.defaultState(p));s.pet={id:pet.id,color:'#ff0000'};
    const one=await api.buildExportSvg(s,p);s.pet.color='#0000ff';
    assert.equal(one,await api.buildExportSvg(s,p));
  }
  ctx.setTimeout=()=>0;ctx.requestAnimationFrame=fn=>fn();
  const node={style:{},classList:{add(){},remove(){}},querySelectorAll:()=>[],getBoundingClientRect:()=>({left:0,top:0,width:1,height:1})};
  ctx.document={getElementById:()=>node,createElement:()=>({style:{},remove(){}}),body:{appendChild(){}}};
  api.loadPrincess(p.id);for(let i=0;i<100;i++){api.randomize();const pet=api.getState().pet;if(pet)assert.deepEqual(Object.keys(pet),['id']);}
  for(const q of api.PRINCESSES)if(api.defaultState(q).pet)assert(!('color' in api.defaultState(q).pet));
});
require('node:test')('materials use real cloth and accessories follow each body without covering the hair front',()=>{
  const {api,studio}=environment();
  for(const p of api.PRINCESSES){
    for(const item of api.CATS.find(c=>c.key==='crown').list){
      const fit=studio.accessoryPlacement('crown',item.id,p),r=studio.rects.crown[item.id];
      assert(r[1]*fit.sy+fit.dy>=-18.001,'headwear crosses photo safe area');
      assert(fit.sx>0&&fit.sx<1);
    }
    for(const item of api.CATS.find(c=>c.key==='neck').list){
      const fit=studio.accessoryPlacement('neck',item.id,p),r=studio.rects.neck[item.id];
      if(item.id!=='norigae')assert(Math.abs(r[1]*fit.sy+fit.dy-103)<.001);
    }
    const s={...json(api.defaultState(p)),neck:{id:'pearls',color:null}};
    const svg=api.dollSVG(s,p);checkSvg(svg);
    assert(svg.includes('data-wear-layer="fabric-lining"'));
    assert(svg.includes('data-attachment="neck"'));
    assert(svg.includes('data-contact-shading="true"'));
    assert(!svg.includes('<use href="#studio-'+p.id+'-body-source" filter="url(#studio-'+p.id+'-lining)'));
  }
});
require('node:test')('all hairstyles attach to measured foreheads and temples, including portrait offsets',()=>{
  const {api,studio}=environment();let combinations=0;
  for(const p of api.PRINCESSES)for(const {id} of api.CATS.find(c=>c.key==='hair').list){
    const q={...p,hair:id},fit=studio.hairPlacement(q),anchor=studio.hairAnchors[id];
    const [top,left,right]=studio.headAnchors[p.id],dx=studio.identities[p.id].dx;
    if(id==='bob'){
      assert(Math.abs(fit.height/fit.width-694/640)<.000001,'bob aspect ratio distorted');
      assert(fit.width<(right-left)*2.1,'bob still too wide');
      assert(Math.abs(fit.y+fit.height*.292-(top+18))<.001,'bob forehead detached');
      const portrait=studio.hairPlacement(q,0);assert(Math.abs(portrait.x+dx-fit.x)<.001);
      const svg=api.dollSVG({...json(api.defaultState(p)),hairStyle:id},p);checkSvg(svg);
      assert(svg.includes('data-hair-fit="natural-bob-v35"'));
      const pieces=[...svg.matchAll(/<g data-studio-part="hair\/bob"[\s\S]*?<\/g>/g)];
      assert.equal(pieces.length,2);
      for(const piece of pieces){assert(!piece[0].includes('<svg '),'bob was sliced');assert.equal((piece[0].match(/<image /g)||[]).length,1);}
      const identity=studio.identities[p.id];
      assert(24+.96*(604-580*identity.sy+fit.y*identity.sy)>=16,'bob clipped in photo');
      checkSvg(api.princessThumb(p,p.hairColor,id));combinations++;continue;
    }
    assert(Math.abs(fit.x+anchor[2]*fit.width-(left+dx+2))<.001,'left temple detached');
    assert(Math.abs(fit.x+anchor[3]*fit.width-(right+dx-2))<.001,'right temple detached');
    assert.equal(fit.knots[1][1],top+18,'forehead root mismatch');
    assert.equal(fit.knots[2][1],57.5,'temple height mismatch');
    for(let i=1;i<fit.knots.length;i++)assert(fit.knots[i][1]>fit.knots[i-1][1],'folded hair mesh');
    const identity=studio.identities[p.id];
    assert(24+.96*(604-580*identity.sy+fit.knots[0][1]*identity.sy)>=16,'hair clipped by photo');
    const portrait=studio.hairPlacement(q,0);assert(Math.abs(portrait.x+dx-fit.x)<.001);
    const st={...json(api.defaultState(p)),hairStyle:id};
    const svg=api.dollSVG(st,p);checkSvg(svg);assert(svg.includes('data-hair-fit="head-anchors-v33"'));
    checkSvg(api.princessThumb(p,p.hairColor,id));combinations++;
  }
  assert.equal(combinations,api.PRINCESSES.length*8);
  assert.equal(studio.path('hair','bob'),'assets/hair-v35/hair-bob.webp');
});
require('node:test')('original v37 presets migrate once without changing any customized outfit',()=>{
  const {api}=environment();
  const before={
    frost:{hairStyle:'braid',hairColor:'#e9e4f5',dress:{id:'winter',color:'#6fc3ff'}},
    sahara:{hairStyle:'wavy',hairColor:'#503325',dress:{id:'mermaidline',color:'#5fd9c9'}},
    sunny:{hairStyle:'curls',hairColor:'#b07a4a',dress:{id:'ballgown',color:'#ffd93d'}}
  };
  const defaults=Object.fromEntries(api.PRINCESSES.map(p=>[p.id,json(api.defaultState(p))]));
  const old=Object.fromEntries(Object.entries(defaults).map(([id,s])=>[id,{...s,...before[id]}]));
  const migrated=environment({'princess:outfits':JSON.stringify(old)});
  for(const p of api.PRINCESSES){
    migrated.api.loadPrincess(p.id);
    assert.deepEqual(json(migrated.api.getState()),defaults[p.id]);
  }
  assert.equal(migrated.stored.get('princess:defaults-v37'),'1');
  for(const id of Object.keys(before))for(const change of [{bg:'cherry'},{pet:null},{hairColor:'#ff8fc1'},{shoes:{id:'sneakers',color:'#ffffff'}}]){
    const custom={...old[id],...change};
    const env=environment({'princess:outfits':JSON.stringify({[id]:custom})});
    env.api.loadPrincess(id);assert.deepEqual(json(env.api.getState()),custom,'customized '+id+' was replaced');
  }
  const already=environment({'princess:outfits':JSON.stringify(old),'princess:defaults-v37':'1'});
  for(const id of Object.keys(before)){already.api.loadPrincess(id);assert.deepEqual(json(already.api.getState()),old[id]);}
  assert.deepEqual(defaults.sunny.dress,{id:'party',color:'#ff9a4d'});
  assert.equal(defaults.sunny.hairStyle,'pigtails');
  assert.deepEqual(defaults.frost.dress,{id:'winter',color:'#fff5df'});
  assert.equal(defaults.frost.hairStyle,'bun');
  assert.deepEqual(defaults.sahara.dress,{id:'aline',color:'#8a7dff'});
  assert.equal(defaults.sahara.hairStyle,'bob');
});
