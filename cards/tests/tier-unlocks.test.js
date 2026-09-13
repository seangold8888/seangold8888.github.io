"use strict";
const test=require("node:test"),assert=require("node:assert/strict"),fs=require("node:fs"),vm=require("node:vm"),path=require("node:path");
const data=require("../cards.json"),KEY="card_collection_unlocks_v1";
const source=fs.readFileSync(path.join(__dirname,"../js/app.js"),"utf8");
function setup(initial={},options={}){
 const map=new Map(Object.entries(initial));
 const box={window:{CardCampaign:{load:()=>({ending:options.ending||0,recruited:options.recruited||[]})}},document:{addEventListener(){}},URLSearchParams,
  location:{hostname:options.preview?"127.0.0.1":"example.test",search:options.preview?"?preview=all":""},
  localStorage:{getItem:k=>map.get(k)||null,setItem(k,v){if(options.blocked)throw Error("quota");map.set(k,String(v));}}};
 vm.runInNewContext(fs.readFileSync(path.join(__dirname,"../js/card-view.js"),"utf8"),box);
 vm.runInNewContext(source.replace('document.addEventListener("DOMContentLoaded", init);',`window.qa={isUnlocked,tierGoal,unlockLeadPhrase,unlockDestination,configure(d){cards=d.cards;familyUnlockGoals=d.familyUnlockGoals;tierUnlockGoals=d.tierUnlockGoals;if(!isPreviewMode())loadCollectionLedger();}};`),box);
 box.window.qa.configure(data);
 return {api:box.window.qa,map,card:id=>data.cards.find(c=>c.id===id)};
}
function math(days,problems){const records={};for(let i=0;i<days;i++)records['2026-08-'+String(i*2+1).padStart(2,'0')]=1;return JSON.stringify({cardStudyDays:records,garden:problems});}
test("tiers are strictly graduated, existing card combat objects and starters are not redefined",()=>{
 const q=setup();
 for(const route of ["story","math"]){let prev={studyDays:-1,problems:-1};for(const t of ["D","C","B","A","S"]){const g=data.tierUnlockGoals[route][t];assert.ok(g.studyDays>=prev.studyDays&&g.problems>=prev.problems);prev=g;}}
 for(const c of data.cards.filter(c=>!c.unlock&&!c.unlockAll?.length)){assert.equal(q.api.tierGoal(c),null);assert.equal(q.api.isUnlocked(c),true,c.id);}
 for(const id of ["jaei","taeo","appa","eomma","sseugumi"])assert.equal(q.api.tierGoal(q.card(id)),null);
 assert.ok(data.tierUnlockGoals.math.S.studyDays<data.familyUnlockGoals.appa.studyDays);
});
test("all non-family card tiers enforce BOTH study boundaries and the original story/game gate",()=>{
 for(const c of data.cards){const first=setup(),g=first.api.tierGoal(c);if(!g)continue;
  for(const [days,problems,expected] of [[g.studyDays,g.problems,true],...(g.problems?[[g.studyDays-1,g.problems,false],[g.studyDays,g.problems-1,false]]:[])]){
   const q=setup();q.map.set("math10_state",math(days,problems));
   if(!g.mathOnly){assert.equal(q.api.isUnlocked(c),false,c.id+' missing source');for(const token of c.unlockAll||[c.unlock]){
    if(token.startsWith('game:sanguo/'))q.map.set('sanguo_clear_'+token.split('/')[1],'1');
    else if(token.startsWith('game:odyssey/'))q.map.set('ody_progress',JSON.stringify({stages:{[token.split('/')[1]]:{cleared:true}}}));
    else q.map.set('story_done_'+token,'1');
   }}
   assert.equal(q.api.isUnlocked(c),expected,c.id+':'+days+'/'+problems);
  }
 }
});
test("legacy flags and historic math eligibility survive upgrade and newly earned cards survive reload",()=>{
 const old=setup({story_done_mermaid:'1',math10_state:JSON.stringify({stamps:{'2026-09-01':1,'2026-09-02':1,'2026-09-03':1},planDays:7})});
 assert.equal(old.api.isUnlocked(old.card('mermaid')),true);assert.equal(old.api.isUnlocked(old.card('kimhongdo')),true);
 const q=setup();q.map.set('story_done_mermaid','1');assert.equal(q.api.isUnlocked(q.card('mermaid')),false);
 q.map.set('math10_state',math(5,60));assert.equal(q.api.isUnlocked(q.card('mermaid')),true);
 q.map.delete('math10_state');q.map.delete('story_done_mermaid');const again=setup(Object.fromEntries(q.map));assert.equal(again.api.isUnlocked(again.card('mermaid')),true);
});
test("preview has no migration side effects, broken storage is safe and campaign rewards bypass extra goals",()=>{
 const p=setup({},{preview:true});assert.equal(p.api.isUnlocked(p.card('mermaid')),true);assert.equal(p.map.has(KEY),false);
 const q=setup({[KEY]:'broken',math10_state:'null'},{blocked:true});assert.equal(q.api.isUnlocked(q.card('mermaid')),false);
 const r=setup({},{recruited:['mermaid']});assert.equal(r.api.isUnlocked(r.card('mermaid')),true);
 assert.equal(setup().api.isUnlocked(q.card('sseugumi')),false);
 assert.equal(setup({},{ending:1}).api.isUnlocked(q.card('sseugumi')),true);
});
test("detail navigation goes to missing story first then math, with progress in plain language",()=>{
 const q=setup(),c=q.card('mermaid');assert.equal(q.api.unlockDestination(c).href,'../story/');
 assert.match(q.api.unlockLeadPhrase(c),/5일 \+ 60문제/);
 q.map.set('story_done_mermaid','1');assert.equal(q.api.unlockDestination(c).href,'../math/');assert.match(q.api.unlockLeadPhrase(c),/완료/);
 assert.match(q.api.unlockLeadPhrase(q.card('kimhongdo')),/A등급.*5일 \+ 40문제/);
 assert.doesNotMatch(q.api.unlockLeadPhrase(q.card('kimhongdo')),/이야기|이어서/);
});
