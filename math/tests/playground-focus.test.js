'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const P=require('../playground.js'),L=require('../learning.js'),C=require('../curriculum.js'),S=require('../store.js');
function random(seed) { return ()=>((seed=seed*16807%2147483647)-1)/2147483646; }
test('equipment changes actual level-four problems, with current-level variety retained',()=>{
 const expected={bars:[4,'make10'],slide:[4,'from10'],swing:[3,'add'],seesaw:[4,'split10'],blocks:[4,'split10']};
 for(const [id,[level,type]] of Object.entries(expected)) {
  const focus=P.focus(id,4),questions=L.buildSession({level:4,count:3,focus,rng:random(23),state:S.defaults()});
  assert.deepEqual([focus.level,focus.types[0]],[level,type]);
  assert.equal(questions.length,3);
  assert.ok(questions.slice(0,2).every(p=>p.level===level && p.type===type));
  assert.equal(questions[2].level,4);
  assert.ok(level<4 || questions[2].type!==type);
 }
 assert.deepEqual(P.focus('steps',5).types,['nextNum','prevNum','tenMore','seq','evenPick','oddPick']);
});
test('all equipment, levels and session sizes stay in scope, have unique valid questions and fill sessions',()=>{
 for(let level=1;level<=12;level++) for(const spot of P.SPOTS) for(const count of [3,8,12,16]) for(let seed=1;seed<=8;seed++) {
  const focus=P.focus(spot.id,level),before=JSON.stringify(focus);
  assert.ok(focus.level>=1 && focus.level<=level);
  const set=L.buildSession({level,count,focus,rng:random(seed),state:S.defaults()});
  const context=JSON.stringify({level,id:spot.id,count,seed});
  assert.equal(set.length,count,context);
  assert.equal(new Set(set.map(p=>p.key)).size,count,context);
  assert.ok(set.every(p=>p.level<=level && C.levelById(p.level).types.includes(p.type) && Number.isInteger(p.answer)),context);
  assert.ok(set.filter(p=>p.focused).every(p=>p.level===focus.level && focus.types.includes(p.type)),context);
  assert.equal(JSON.stringify(focus),before);
 }
});
test('every current concept is reachable; focused practice cannot imply mastery of other concepts',()=>{
 for(let level=1;level<=12;level++) {
  const reachable=new Set();
  for(const spot of P.SPOTS) for(let seed=1;seed<=30;seed++) {
   L.buildSession({level,count:16,focus:P.focus(spot.id,level),rng:random(seed)}).filter(p=>p.level===level).forEach(p=>reachable.add(p.type));
  }
  assert.deepEqual([...reachable].sort(),C.levelById(level).types.slice().sort());
 }
 const state=S.defaults();state.level=4;
 for(let day=1;day<=3;day++) for(const p of L.buildSession({level:4,count:3,focus:P.focus('swing',4),rng:random(day)}).filter(p=>p.level===3)) L.record(state,p,true,'2026-09-0'+day);
 assert.equal(L.ready(state,4),false);
 assert.ok(Object.keys(state.skills).every(k=>k.startsWith('3:')));
});
test('due-review identity survives focused practice and future review is excluded',()=>{
 const r=C.makeProblem(4,random(12),'split10'),future=C.makeProblem(9,random(13),'carry');
 const set=L.buildSession({level:4,count:8,focus:P.focus('slide',4),rng:random(8),review:[{key:future.key,problem:future},{key:r.key,problem:r}]});
 const review=set.find(p=>p.review);
 assert.equal(review.reviewKey,r.key);assert.notEqual(review.key,r.key);assert.equal(review.type,'split10');
 assert.ok(set.every(p=>p.level<=4));
 const variant=L.variant(set[0],random(9));assert.equal(variant.type,'from10');
});
test('pending equipment and question snapshots survive save/load without changing legacy sessions',()=>{
 const questions=L.buildSession({level:4,count:3,focus:P.focus('slide',4),rng:random(42)});
 const state=S.defaults();state.level=4;state.playgroundSpot='slide';
 state.pending={problems:questions,index:0,results:[],level:4,spot:'slide',focusTitle:'10에서 빼기',firstTry:false};
 const copy=S.clean(JSON.parse(JSON.stringify(state)));
 assert.deepEqual(copy.pending,state.pending);
 delete state.pending.spot;delete state.pending.focusTitle;
 assert.deepEqual(S.clean(JSON.parse(JSON.stringify(state))).pending,state.pending);
});
