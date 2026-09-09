const test=require("node:test"),assert=require("node:assert/strict"),Q=require("../school/questions.js");
test("20 school formats produce complete, deterministic, unambiguous questions",()=>{
 for(let seed=0;seed<100;seed++)for(let type=0;type<20;type++){
  const q=Q.question(type,seed);assert.deepEqual(q,Q.question(type,seed));assert.ok(q.text&&q.hint&&q.explain);assert.ok(Q.grade(q,q.answers));
  assert.equal(Q.grade(q,[]),false);assert.equal(Q.grade(q,[""]),false);
  if(q.options){assert.equal(new Set(q.options).size,q.options.length);assert.equal(q.mode==="single"?q.answers.length===1:q.answers.length>1,true);for(const i of q.answers)assert.ok(q.options[Number(i)]!==undefined);}
  else{assert.equal(q.inputs.length,q.answers.length);assert.equal(Q.grade(q,q.answers.map(()=>"wrong")),false);}
 }
});
test("new sessions select the requested group without duplicates",()=>{
 for(const group of Object.keys(Q.GROUPS)){const s=Q.create(group,5,56);assert.equal(s.order.length,group==="parity"?4:5);assert.equal(new Set(s.order).size,s.order.length);assert.ok(s.order.every(t=>group==="all"||Q.group(t)===group));}
 assert.deepEqual(Q.create("all",20,1).order,Array.from({length:20},(_,i)=>i));
});
test("generated quantities and reasoning answers match independent arithmetic",()=>{
 for(let seed=0;seed<100;seed++){
  let q=Q.question(0,seed);assert.equal(Number(q.answers[0]),q.visual.tens*10);
  q=Q.question(1,seed);assert.equal(q.options[Number(q.answers[0])],q.visual.rows*10+"개");
  q=Q.question(6,seed);assert.equal(Number(q.answers[0]),q.visual.tens*10+q.visual.ones);
  q=Q.question(9,seed);assert.equal(Number(q.answers[0]),Number(q.visual.values[0])+2);assert.equal(Number(q.answers[1]),Number(q.visual.values[0])+5);
  q=Q.question(12,seed);const [lhs,rhs]=q.visual.value.split(" > □").map(Number);const eligible=Array.from({length:9},(_,i)=>i+1).filter(i=>i*10+rhs<lhs);assert.equal(Number(q.answers[0]),eligible.length);
  q=Q.question(13,seed);const cards=q.visual.values.map(Number),all=cards.flatMap(a=>cards.filter(b=>b!==a).map(b=>a*10+b));assert.equal(Number(q.answers[0]),Math.max(...all));
  q=Q.question(17,seed);assert.deepEqual(q.answers,q.options.flatMap((x,i)=>Number(x)%2===0?[String(i)]:[]));
  q=Q.question(18,seed);assert.deepEqual(q.answers,q.inputs.map(x=>Number(x.label)%2?"홀":"짝"));
  q=Q.question(19,seed);assert.deepEqual(q.answers,q.options.flatMap((x,i)=>x.split(", ").every(n=>Number(n)%2===1)?[String(i)]:[]));
 }
});
test("all-answer questions require exactly all correct selections; matching order matters",()=>{
 const q=Q.question(17,1);assert.equal(Q.grade(q,q.answers.slice().reverse()),true);assert.equal(Q.grade(q,[q.answers[0]]),false);assert.equal(Q.grade(q,[q.answers[0],q.answers[0]]),false);
 const m=Q.question(2,1);assert.equal(Q.grade(m,m.answers.slice().reverse()),false);
});
