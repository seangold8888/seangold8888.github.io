"use strict";
const test=require("node:test"),assert=require("node:assert/strict"),fs=require("node:fs"),path=require("node:path"),vm=require("node:vm");
const dir=path.resolve(__dirname,".."),ctx={};vm.createContext(ctx);vm.runInContext(fs.readFileSync(path.join(dir,"outings.js"),"utf8"),ctx);const O=ctx.PrincessOutings;
const photo="data:image/jpeg;base64,YQ==";
function memory(seed={}){const map=new Map(Object.entries(seed));return {getItem:k=>map.get(k)||null,setItem:(k,v)=>map.set(k,v),map};}
test("six invitations have one achievable request and real existing scenery and companions",()=>{
 assert.equal(O.INVITES.length,6);assert.equal(new Set(O.INVITES.map(i=>i.id)).size,6);
 for(const i of O.INVITES){
  assert.ok(fs.existsSync(path.join(dir,"assets/studio-v3/bg-"+i.bg+".jpg")));
  assert.ok(fs.existsSync(path.join(dir,"assets/studio-v3/pet-"+i.pet+".webp")));
  assert.equal(O.matches(i,{}),false);
  const ready=["crown","hand","pet"].includes(i.rule)?{[i.rule]:{id:"test"}}:{dress:{id:"aline",color:{pink:"#ff8fc1",blue:"#6fc3ff",white:"#ffffff"}[i.rule]}};
  assert.equal(O.matches(i,ready),true,i.id);
 }
});
test("scene copies cannot overwrite wardrobe or force a pet or dress",()=>{
 const original={bg:"forest",dress:{id:"hanbok",color:"#ff8fc1"},pet:null},before=JSON.stringify(original);
 const state=O.sceneState(original,O.INVITES[2]);assert.equal(state.bg,"ballroom");state.dress.color="#ffffff";state.pet={id:"cat"};
 assert.equal(JSON.stringify(original),before);
});
test("storybook stores photo and invitation, deduplicates save, preserves old keys and earned stickers",()=>{
 const s=memory({"princess:album":"OLD PHOTOS","princess:outfits":"OLD OUTFITS"});
 const page={id:"one",inviteId:"moon",photo,princessName:"달빛 공주"};
 assert.equal(O.addPage(s,page).ok,true);O.addPage(s,page);assert.equal(O.readBook(s).pages.length,1);
 O.addPage(s,{...page,id:"two"});assert.equal(O.readBook(s).stickers.length,1);
 assert.equal(O.removePage(s,"one"),true);assert.equal(O.readBook(s).pages.length,1);assert.equal(O.readBook(s).stickers[0],"moon");
 assert.equal(s.getItem("princess:album"),"OLD PHOTOS");assert.equal(s.getItem("princess:outfits"),"OLD OUTFITS");
});
test("full or unavailable storage never silently deletes existing photos",()=>{
 const s=memory();for(let i=0;i<O.MAX_PAGES;i++)assert.equal(O.addPage(s,{id:String(i),inviteId:"moon",photo}).ok,true);
 const before=s.getItem(O.KEY);assert.equal(O.addPage(s,{id:"overflow",inviteId:"sea",photo}).reason,"full");assert.equal(s.getItem(O.KEY),before);
 const failing={getItem:k=>s.getItem(k),setItem(){throw Error("quota");}};
 assert.equal(O.removePage(failing,"0"),false);assert.equal(s.getItem(O.KEY),before);
 const emptyFail={getItem(){return null;},setItem(){throw Error("quota");}};
 assert.equal(O.addPage(emptyFail,{id:"x",inviteId:"moon",photo}).reason,"storage");
});
test("corrupt or unsafe storybook records are not rendered",()=>{
 const s=memory({[O.KEY]:"{"});assert.equal(O.readBook(s).pages.length,0);
 s.setItem(O.KEY,JSON.stringify({version:1,pages:[{id:"x",inviteId:"moon",photo:"https://tracker.invalid/pixel"}],stickers:["moon","moon","bad"]}));
 assert.equal(O.readBook(s).pages.length,0);assert.equal(O.readBook(s).stickers.length,1);
});
test("offline worker includes both outing modules; photo album keys and studio version remain unchanged",()=>{
 const sw=require("../../sw.js"),html=fs.readFileSync(path.join(dir,"index.html"),"utf8");
 for(const f of ["outings.js?v=1","outings.css?v=1"]){assert.ok(sw.OPTIONAL_SHELL.includes("./princess/"+f));assert.ok(html.includes(f));}
 assert.ok(html.includes("studio.js?v=39"));assert.ok(html.includes("ALBUM_KEY='princess:album'"));
});
