"use strict";
// 쓰구미의 장난 부하 태뿔·찬뿔·건뿔: 원정 장에 악당으로 나오고, 그 장을 되돌리면 카드로 얻는다.
const test=require("node:test"),assert=require("node:assert/strict"),fs=require("node:fs"),vm=require("node:vm"),path=require("node:path");
const data=require("../cards.json");
const Campaign=require("../js/campaign.js");
const source=fs.readFileSync(path.join(__dirname,"../js/app.js"),"utf8");
function setup(progress){
 const map=new Map();
 const box={window:{CardCampaign:{CHAPTERS:Campaign.CHAPTERS,load:()=>Object.assign({ending:0,recruited:[],cleared:[]},progress)}},document:{addEventListener(){}},URLSearchParams,
  location:{hostname:"example.test",search:""},localStorage:{getItem:k=>map.get(k)||null,setItem(k,v){map.set(k,String(v));}}};
 vm.runInNewContext(fs.readFileSync(path.join(__dirname,"../js/card-view.js"),"utf8"),box);
 vm.runInNewContext(source.replace('document.addEventListener("DOMContentLoaded", init);',`window.qa={isUnlocked,unlockLeadPhrase,unlockDestination,configure(d){cards=d.cards;familyUnlockGoals=d.familyUnlockGoals;tierUnlockGoals=d.tierUnlockGoals;loadCollectionLedger();}};`),box);
 box.window.qa.configure(data);
 return {api:box.window.qa,card:id=>data.cards.find(c=>c.id===id)};
}
const CAPTURE={taeppul:1,chanppul:3,geonppul:5};

test("장난 4인방이 원정 장마다 악당으로 나오고, 왕궁 문을 셋이 지킨다",()=>{
 assert.ok(Campaign.CHAPTERS[1].enemies.includes("taeppul"));
 assert.ok(Campaign.CHAPTERS[3].enemies.includes("chanppul"));
 assert.ok(Campaign.CHAPTERS[5].enemies.includes("geonppul"));
 assert.ok(Campaign.CHAPTERS[6].enemies.includes("jaewing"));
 assert.deepEqual(Array.from(Campaign.CHAPTERS[7].enemies),["taeppul","chanppul","geonppul"]);
 for(const [id,ch] of Object.entries(CAPTURE)){
  const name=data.cards.find(c=>c.id===id).name;
  assert.ok(Object.values(Campaign.SCENES[ch]).flat().some(line=>line.includes(name)),name+" 장면 글에 나와야 한다");
  const opponent=Campaign.encounter(ch,Campaign.encounterIds(ch).indexOf(id),data.cards);
  assert.equal(opponent.card.id,id);
 }
});

test("그 장을 되돌리기 전엔 잠겨 있고, 되돌리거나 원정을 끝내면 카드가 열린다",()=>{
 for(const [id,ch] of Object.entries(CAPTURE)){
  const locked=setup({cleared:[]});
  assert.equal(locked.api.isUnlocked(locked.card(id)),false,id);
  assert.match(locked.api.unlockLeadPhrase(locked.card(id)),new RegExp("원정 "+ch+"장"));
  assert.equal(locked.api.unlockDestination(locked.card(id)),null);
  const cleared=setup({cleared:Array.from({length:ch+1},(_,i)=>i)});
  assert.equal(cleared.api.isUnlocked(cleared.card(id)),true,id+" cleared");
  const ended=setup({ending:1,cleared:[]});
  assert.equal(ended.api.isUnlocked(ended.card(id)),true,id+" after a finished run");
 }
});

test("악당 셋은 가족보다 약하고 문제 관문을 5개씩 가진다",()=>{
 const ctx={window:{}};ctx.globalThis=ctx;
 vm.runInNewContext(fs.readFileSync(path.join(__dirname,"../js/story-gates.js"),"utf8"),ctx);
 vm.runInNewContext(fs.readFileSync(path.join(__dirname,"../js/card-view.js"),"utf8"),ctx);
 for(const id of Object.keys(CAPTURE)){
  assert.ok(ctx.window.CardStoryGates.countForCard(id)>=5,id);
  assert.equal(ctx.window.CardView.battleTier({id}),"B",id);
  assert.ok(fs.existsSync(path.join(__dirname,"../art",id+".webp")),id);
 }
});
