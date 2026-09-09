const test=require("node:test"),assert=require("node:assert/strict"),W=require("../school/weekly-engine.js"),Q=require("../school/questions.js");
test("calendar weeks start Monday, including year and Sunday boundaries",()=>{
 assert.equal(W.week("2026-09-06"),"2026-08-31");assert.equal(W.week("2026-09-07"),"2026-09-07");
 assert.equal(W.week("2027-01-01"),"2026-12-28");assert.equal(W.add("2026-12-28",7),"2027-01-04");
 const d=W.fresh();assert.equal(W.status(d,"2026-09-10").ready,false);assert.equal(W.status(d,"2026-09-11").ready,true);assert.equal(W.status(d,"2026-09-13").ready,true);assert.equal(W.status(d,"2026-09-14").ready,false);
});
test("school coverage comes only from recorded practice or explicit parent scope",()=>{
 assert.deepEqual(W.covered({covered:[2,5,2],session:{results:[{type:17}]} }),[2,5,17]);
 assert.deepEqual(W.covered({history:[{total:20,group:"all"}]}),[]);
 assert.deepEqual(W.scope({source:"manual",types:[3,8]},null,null).types,[3,8]);
});
test("only one frozen exam per week; unfinished exams survive week rollover",()=>{
 const d=W.fresh();d.settings=W.settings({source:"manual",types:[2,5,17,18],count:5});
 assert.equal(W.start(d,null,null,"2026-09-10",1),null);
 const e=W.start(d,null,null,"2026-09-11",1),snapshot=JSON.stringify(e.questions);
 d.settings=W.settings({source:"level",weekday:1,count:20});
 assert.equal(W.start(d,null,{level:12},"2026-09-11",99),e);assert.equal(JSON.stringify(e.questions),snapshot);
 assert.equal(W.start(d,null,{level:12},"2026-09-14",99),e);
 W.submit(e,"2026-09-14");assert.equal(W.start(d,null,{level:12},"2026-09-14",99).week,"2026-09-14");
 assert.equal(d.exams.length,2);
});
test("grading is final at submit; multi-field answers are whole-question graded",()=>{
 const d=W.fresh();d.settings=W.settings({source:"manual",types:[2,17],count:5});
 const e=W.start(d,null,null,"2026-09-11",21);
 e.questions.forEach((q,i)=>W.edit(e,i,i===0?[]:q.answers,"내 풀이"));
 assert.deepEqual(W.unanswered(e),[0]);assert.equal(W.result(e).correct,e.questions.length-1);
 assert.equal(W.submit(e,"2026-09-11"),true);assert.equal(W.submit(e,"2026-09-11"),false);
 assert.equal(W.edit(e,0,e.questions[0].answers),false);assert.equal(W.start(d,null,null,"2026-09-12",2),e);assert.equal(d.exams.length,1);
});
test("generated exams stay inside selected school or current playground scope",()=>{
 for(let level=1;level<=12;level++){const qs=W.generate({source:"level",level},10,level);assert.ok(qs.length>0);qs.forEach(q=>{assert.ok(["level-"+level,"level-"+Math.max(1,level-1)].includes(q.group));assert.ok(Q.grade(q,q.answers));assert.equal(q.visual,null);});}
 const qs=W.generate({source:"school",types:[10]},20,2);assert.equal(qs.length,1,"do not repeat the only 100-definition question");
 const d=W.fresh();assert.equal(W.start(d,null,null,"2026-09-11",3),null);
});
test("storage preserves snapshots and touches only the weekly key",()=>{
 const map=new Map([["math10_state","old"],["math10_school_v1","practice"]]),storage={getItem:k=>map.get(k)||null,setItem:(k,v)=>map.set(k,v)};
 const d=W.fresh();d.settings=W.settings({source:"manual",types:[18]});const e=W.start(d,null,null,"2026-09-11",5);W.edit(e,0,e.questions[0].answers);
 assert.ok(W.save(storage,d));assert.deepEqual(W.load(storage),d);assert.equal(map.get("math10_state"),"old");assert.equal(map.get("math10_school_v1"),"practice");assert.equal(map.size,3);
 assert.equal(W.save({setItem(){throw Error("full")}},d),false);
});
