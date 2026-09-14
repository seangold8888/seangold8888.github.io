'use strict';
const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const root=path.resolve(__dirname,'..');
function env(){const c={location:{search:'?heads=natural'}};vm.createContext(c);for(const file of ['wardrobe.js','salon.js','studio.js'])vm.runInContext(fs.readFileSync(path.join(root,file),'utf8'),c);return c;}
test('22 chroma originals and WebPs exist without replacing accepted base heads',()=>{
 const e=env();assert.equal(e.PrincessSalon.ids.size,22);
 for(const id of e.PrincessSalon.ids){const file=path.join(root,e.PrincessSalon.path(id)),png=fs.readFileSync(file.replace('.webp','.png'));assert(fs.statSync(file).size>10000);assert.equal(png.readUInt32BE(16),1254);assert.equal(png.readUInt32BE(20),1254);assert(fs.existsSync(path.join(root,'assets/heads-v43',id.split('-')[0]+'.png')));assert.equal(e.PrincessStudio.path('head',id),e.PrincessSalon.path(id));}
 assert.equal(e.PrincessStudio.path('head','mermaid-braid'),'assets/salon-v44/mermaid-braid.webp');
});
test('three stable hairstyle IDs preserve old saves, invalid values fall back to base',()=>{
 const e=env();assert.deepEqual(Array.from(e.PrincessStudio.salonStyles,s=>s.id),['wave','half','braid']);assert.equal(e.PrincessStudio.salonStyle({salonStyle:'braid'}),'braid');assert.equal(e.PrincessStudio.salonStyle({salonStyle:'broken'}),'wave');assert.equal(e.PrincessStudio.salonStyle({hairStyle:'bun'}),'wave');
 const html=fs.readFileSync(path.join(root,'index.html'),'utf8');assert(html.indexOf('salon.js?v=1')<html.indexOf('studio.js?v=48'));assert(html.includes("PrincessSalon?.has(p.id+'-half')"));
});
test('chroma processing is an embedded SVG filter, with selective spill correction',()=>{
 const e=env(),filter=e.PrincessSalon.filter('sample');assert(filter.includes('color-interpolation-filters="sRGB"'));assert(filter.includes('spillR'));assert(filter.includes('spillB'));assert(filter.includes('matteR'));assert(filter.includes('matteB'));assert(!filter.includes('http'));assert(!filter.includes('canvas'));
 const sw=fs.readFileSync(path.join(root,'..','sw.js'),'utf8');assert(sw.includes('./princess/salon.js?v=1'));assert(sw.includes('./princess/assets/salon-v47/'));
});
