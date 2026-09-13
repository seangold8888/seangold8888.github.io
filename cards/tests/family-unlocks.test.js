"use strict";
const test=require("node:test"),assert=require("node:assert/strict"),fs=require("node:fs"),vm=require("node:vm");
const data=require("../cards.json"),S=require("../../math/store.js"),B=require("../../assets/study/math-bridge.js");
const source=fs.readFileSync(require("node:path").join(__dirname,"../js/app.js"),"utf8");
const KEY="card_family_unlocks_v1";
function setup(initial={},opts={}){
 const map=new Map(Object.entries(initial)),now=opts.now||"2026-11-01T12:00:00";
 class Clock extends Date { constructor(...args){super(...(args.length?args:[now]));} static now(){return new Date(now).getTime();} }
 const storage={getItem:k=>map.get(k)||null,setItem(k,v){if(opts.blocked)throw Error("quota");map.set(k,String(v));}};
 const box={window:{},document:{addEventListener(){}},localStorage:storage,location:{hostname:opts.preview?"127.0.0.1":"example.test",search:opts.preview?"?preview=all":""},URLSearchParams,Date:Clock};
 vm.runInNewContext(source.replace('document.addEventListener("DOMContentLoaded", init);','window.qa={isUnlocked,unlockLeadPhrase,unlockDestination,mathCollectionProgress,configure(c,g){cards=c;familyUnlockGoals=g;}};'),box);
 box.window.qa.configure(data.cards,data.familyUnlockGoals);
 return {api:box.window.qa,map,storage,card:id=>data.cards.find(c=>c.id===id)};
}
function stamps(n,start="2026-10-01"){return Object.fromEntries(Array.from({length:n},(_,i)=>[S.addDays(start,i),1]));}
function state(days,problems){return JSON.stringify({stamps:stamps(days),garden:problems});}
test("stronger family members require strictly more study days AND problems",()=>{
 assert.deepEqual(data.familyUnlockGoals,{appa:{studyDays:10,problems:100},eomma:{studyDays:15,problems:180},taeo:{studyDays:20,problems:260},jaei:{studyDays:30,problems:400}});
 for(const [id,goal] of Object.entries(data.familyUnlockGoals)){
  for(const [days,count,expected] of [[goal.studyDays-1,goal.problems,false],[goal.studyDays,goal.problems-1,false],[goal.studyDays,goal.problems,true]]){
   const q=setup({math10_state:state(days,count)});
   assert.equal(q.api.isUnlocked(q.card(id)),expected,id+" "+days+"/"+count);
  }
 }
});
test("study days are cumulative, deduplicated and ignore impossible/future/invalid stamps",()=>{
 const q=setup({math10_state:JSON.stringify({stamps:{"2026-10-01":1,"2026-10-20":1,"2026-02-30":1,"2027-01-01":1,bad:1,"2026-10-22":-1},cardStudyDays:{"2026-10-01":12,"2026-10-25":1},garden:11,history:[{count:10},{count:10}]})});
 assert.deepEqual(JSON.parse(JSON.stringify(q.api.mathCollectionProgress())),{studyDays:3,problems:20});
});
test("newly earned family ownership survives a break, reload and unavailable storage",()=>{
 const q=setup({math10_state:state(30,400)});
 assert.equal(q.api.isUnlocked(q.card("jaei")),true);
 q.map.set("math10_state",state(0,0));
 assert.equal(q.api.isUnlocked(q.card("jaei")),true);
 const again=setup(Object.fromEntries(q.map));
 assert.equal(again.api.isUnlocked(again.card("jaei")),true);
 const blocked=setup({math10_state:state(30,400)},{blocked:true});
 assert.equal(blocked.api.isUnlocked(blocked.card("jaei")),true);
 blocked.map.set("math10_state","{}");
 assert.equal(blocked.api.isUnlocked(blocked.card("jaei")),true);
});
test("legacy eligibility before rollout is preserved once, but a later 3/7-day streak is not a shortcut",()=>{
 const old=setup({math10_state:JSON.stringify({stamps:stamps(7,"2026-09-01"),planDays:7})});
 for(const id of Object.keys(data.familyUnlockGoals)) assert.equal(old.api.isUnlocked(old.card(id)),true,id);
 assert.equal(JSON.parse(old.map.get(KEY)).unlocked.length,4);
 const fresh=setup({math10_state:JSON.stringify({stamps:stamps(7),planDays:7})});
 for(const id of Object.keys(data.familyUnlockGoals)) assert.equal(fresh.api.isUnlocked(fresh.card(id)),false,id);
});
test("preview cannot persist a grant and corrupt state is safely treated as incomplete",()=>{
 const p=setup({},{preview:true});assert.equal(p.api.isUnlocked(p.card("jaei")),true);assert.equal(p.map.has(KEY),false);
 for(const value of ["bad","null","[]",JSON.stringify({stamps:[],garden:-9})]){
  const q=setup({math10_state:value,[KEY]:"bad"});assert.equal(q.api.isUnlocked(q.card("jaei")),false);
 }
});
test("locked family details show both goals, current progress and the math destination",()=>{
 const q=setup({math10_state:state(4,35)}),card=q.card("jaei");
 const text=q.api.unlockLeadPhrase(card);
 assert.match(text,/30일 \+ 400문제/);assert.match(text,/4\/30일/);assert.match(text,/35\/400문제/);
 assert.doesNotMatch(text,/이야기|연속/);assert.equal(q.api.unlockDestination(card).href,"../math/");
});
test("hub math and standalone math record the same cumulative day ledger without double counting days",()=>{
 const q=setup(),s=S.defaults(),problem=B.next(s,7,()=>.3,"","2026-10-01");
 B.record(q.storage,s,problem,true,7,"2026-10-01");
 B.record(q.storage,s,problem,false,7,"2026-10-01");
 S.finishSession(s,[{key:problem.key,level:s.level,firstTry:true,ms:1000}],"2026-10-01");S.save(q.storage,s);
 assert.equal(s.cardStudyDays["2026-10-01"],3);
 assert.equal(q.api.mathCollectionProgress().studyDays,1);
 assert.equal(q.api.mathCollectionProgress().problems,3);
});
