'use strict';
const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const root=path.resolve(__dirname,'..'),ctx={};vm.createContext(ctx);vm.runInContext(fs.readFileSync(path.join(root,'icons.js'),'utf8'),ctx);
const I=ctx.PrincessIcons;
test('all ten wardrobe categories have decorative vector icons, without font emoji or remote images',()=>{
  assert.deepEqual(Array.from(I.keys),['princess','hair','dress','shoes','crown','neck','hand','back','pet','bg']);
  for(const key of I.keys){const svg=I.render(key);assert.match(svg,/viewBox="0 0 64 64"/);assert.match(svg,/aria-hidden="true" focusable="false"/);assert.ok(!/<image|<text|<script|@\w|NaN/.test(svg));assert.match(svg,new RegExp('data-wardrobe-icon="'+key+'"'));}
  assert.throws(()=>I.render('unknown'),/Unknown wardrobe icon/);
});
test('repeated tab rendering never duplicates gradient ids or references another icon',()=>{
  const ids=new Set();for(let round=0;round<3;round++)for(const key of I.keys){const svg=I.render(key),local=new Set([...svg.matchAll(/\bid="([^"]+)"/g)].map(m=>m[1]));for(const id of local){assert.ok(!ids.has(id));ids.add(id);}for(const m of svg.matchAll(/url\(#([^)]*)\)/g))assert.ok(local.has(m[1]),m[1]);}
});
test('icons load before tab rendering, remain cached offline, and labels carry selection state',()=>{
  const html=fs.readFileSync(path.join(root,'index.html'),'utf8'),sw=fs.readFileSync(path.join(root,'../sw.js'),'utf8');
  assert.ok(html.indexOf('icons.js?v=1')<html.indexOf('function renderTabs()'));
  assert.match(html,/PrincessIcons\.render\(c.key\)/);assert.match(html,/aria-pressed="\$\{c.key===tab\}"/);
  assert.equal((sw.match(/"\.\/princess\/icons.js\?v=1"/g)||[]).length,1);
  assert.match(html,/#panel\{\s*min-width:0/);
  assert.match(html,/@media \(orientation:portrait\)\{\s*main\{grid-template-columns:minmax\(0,1fr\)/);
});
