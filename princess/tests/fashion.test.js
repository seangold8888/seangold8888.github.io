"use strict";
const test=require("node:test"),assert=require("node:assert/strict"),fs=require("node:fs"),path=require("node:path"),vm=require("node:vm");
const dir=path.resolve(__dirname,".."),ctx={};vm.createContext(ctx);vm.runInContext(fs.readFileSync(path.join(dir,"fashion.js"),"utf8"),ctx);const F=ctx.PrincessFashion;
function memory(seed={}){const map=new Map(Object.entries(seed));return {getItem:k=>map.has(k)?map.get(k):null,setItem:(k,v)=>map.set(k,String(v)),map};}
const ACC=["shoes","crown","neck","hand","back"];
function perfectOutfit(t){
 const first=cat=>F.suggestions(cat,t.id)[0];
 const st={dress:{id:first("dress"),color:t.colors[0]},bg:first("bg"),pet:{id:first("pet")}};
 let n=0;for(const k of ACC){const id=first(k);if(id&&n<2&&!(k==="shoes"&&st.dress.id==="tail")){st[k]={id,color:null};n++;}}
 return st;
}
const html=fs.readFileSync(path.join(dir,"index.html"),"utf8");
const listIds=name=>{const m=html.match(new RegExp("const "+name+"=\\[([\\s\\S]*?)\\n\\];"));assert.ok(m,name);return [...m[1].matchAll(/\{id:'([a-z]+)'/g)].map(x=>x[1]);};
test("eight theme cards, each one fully achievable with existing tagged items",()=>{
 assert.ok(F.THEMES.length>=6&&F.THEMES.length<=10);assert.equal(new Set(F.THEMES.map(t=>t.id)).size,F.THEMES.length);
 for(const t of F.THEMES){
  assert.ok(F.suggestions("dress",t.id).length,t.id+" dress");assert.ok(F.suggestions("bg",t.id).length,t.id+" bg");assert.ok(F.suggestions("pet",t.id).length,t.id+" pet");
  assert.ok(ACC.filter(k=>F.suggestions(k,t.id).length).length>=2,t.id+" accessories");
  assert.ok(t.colors.length&&t.colors.every(c=>F.COLOR_NAMES[c]),t.id+" palette colours");
  const r=F.judge(t.id,perfectOutfit(t));assert.equal(r.total,15,t.id);assert.equal(r.perfect,true);
 }
});
test("tags use only existing wardrobe items and existing art (no new images)",()=>{
 const lists={dress:"DRESSES",shoes:"SHOES",crown:"CROWNS",neck:"NECKS",hand:"HANDS_ITEMS",back:"BACKS",pet:"PETS",bg:"BGS"};
 for(const [cat,name] of Object.entries(lists)){
  const ids=new Set(listIds(name));
  for(const [id,tags] of Object.entries(F.ITEM_TAGS[cat])){
   assert.ok(ids.has(id),cat+"/"+id+" exists in wardrobe");
   assert.ok(tags.every(tag=>F.theme(tag)),cat+"/"+id+" tags");
   assert.ok(fs.existsSync(path.join(dir,"assets/studio-v3/"+cat+"-"+id+(cat==="bg"?".jpg":".webp"))),cat+"/"+id+" art");
  }
 }
 const src=fs.readFileSync(path.join(dir,"fashion.js"),"utf8");
 assert.ok(!/speechSynthesis/.test(src));assert.ok(!/\.(png|jpe?g|webp|gif)['"]/.test(src),"no new image files referenced");
});
test("scoring is generous: never below three stars per judge, kind comments only",()=>{
 const bad=/못|나빠|별로|틀렸|실패|안 ?돼|0점|최악|꽝/;
 for(const t of F.THEMES){
  for(const st of [{},{dress:{id:"winter",color:"#3b3f7a"},bg:"plain"},{dress:{id:"tail"},shoes:{id:"boots"}},perfectOutfit(t)]){
   const r=F.judge(t.id,st,(c,id)=>c+":"+id);assert.equal(r.judges.length,3);
   for(const j of r.judges){assert.ok(j.stars>=3&&j.stars<=5);assert.ok(j.text.length>4);assert.ok(!bad.test(j.text+j.tip),j.text+j.tip);assert.ok(!/undefined|null/.test(j.text+j.tip));}
   assert.ok(r.total>=9);assert.ok(F.headline(r).length>0);assert.ok(!bad.test(F.headline(r)));
  }
 }
 const empty=F.judge("beach",{});assert.equal(empty.total,9);assert.equal(empty.perfect,false);assert.match(empty.judges[0].tip,/💡/);
});
test("checklist counts colours, hidden mermaid shoes, and theme accessories",()=>{
 const c=F.checklist("beach",{dress:{id:"tail",color:null},shoes:{id:"sandals",color:"#6fc3ff"},crown:{id:"pearls",color:null},hand:{id:"umbrella",color:null},bg:"sea",pet:{id:"fish"}});
 assert.equal(c.dress,true);assert.equal(c.color,false,"shoes hidden by tail do not count");assert.equal(c.accessories,2);assert.equal(c.bg,true);assert.equal(c.pet,true);
 assert.equal(F.checklist("flower",{dress:{id:"rainbow"}}).color,true,"rainbow dress is already colourful");
 assert.equal(F.checklist("snow",{dress:{id:"winter",color:"#FFFFFF"}}).color,true);
});
test("trophy shelf keeps best score, sticky trophy, and never throws on storage trouble",()=>{
 const s=memory({"princess:album":"OLD","princess:outfits":"OUTFITS"});
 const low=F.judge("snow",{}),top=F.judge("snow",perfectOutfit(F.theme("snow")));
 let r=F.recordShow(s,low);assert.equal(r.ok,true);assert.equal(r.newRibbon,true);assert.equal(r.newTrophy,false);
 r=F.recordShow(s,top);assert.equal(r.newTrophy,true);assert.equal(r.newRibbon,false);
 r=F.recordShow(s,low);assert.equal(r.newTrophy,false);
 const shelf=F.readShelf(s);assert.equal(shelf.themes.snow.best,15);assert.equal(shelf.themes.snow.perfect,true);assert.equal(shelf.themes.snow.count,3);assert.equal(shelf.shows,3);
 assert.equal(s.getItem("princess:album"),"OLD");assert.equal(s.getItem("princess:outfits"),"OUTFITS");
 assert.equal(F.setCurrent(s,"ball"),true);assert.equal(F.readShelf(s).current,"ball");F.setCurrent(s,"nope");assert.equal(F.readShelf(s).current,null);
 const broken={getItem(){throw Error("blocked");},setItem(){throw Error("quota");}};
 assert.equal(F.readShelf(broken).version,1);assert.equal(F.recordShow(broken,low).ok,false);assert.equal(F.setCurrent(broken,"ball"),false);
 const bogus=memory({[F.KEY]:JSON.stringify({version:1,themes:{snow:{best:99,perfect:"yes"},hack:{best:15}},current:"x"})});
 const b=F.readShelf(bogus);assert.equal(b.themes.snow.best,15);assert.equal(Object.keys(b.themes).length,1);assert.equal(b.current,null);
 assert.equal(F.readShelf(memory({[F.KEY]:"{"})).shows,0);
});
test("drawing prefers themes without a gold trophy and never repeats the current card",()=>{
 const all={themes:Object.fromEntries(F.THEMES.slice(1).map(t=>[t.id,{best:15,perfect:true}]))};
 assert.equal(F.draw(all,null,()=>.99).id,F.THEMES[0].id);
 for(let i=0;i<20;i++)assert.notEqual(F.draw({themes:{}},"ball",()=>i/20).id,"ball");
});
test("page loads the fashion show module, keeps the album key and existing module versions",()=>{
 for(const f of ["fashion.js?v=1","fashion.css?v=1","studio.js?v=49","outings.js?v=1","journey.js?v=2"])assert.ok(html.includes(f),f);
 assert.ok(html.includes("ALBUM_KEY='princess:album'"));assert.ok(html.includes("PrincessFashion.mount("));assert.ok(html.includes("princessFashionUI?.refresh()"));
 assert.equal(F.KEY,"princess:fashion:v1");
});
