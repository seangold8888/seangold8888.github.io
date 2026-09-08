'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const L=require('../learning.js'),C=require('../curriculum.js'),S=require('../store.js');
function rng(seed) { return ()=>((seed=seed*16807%2147483647)-1)/2147483646; }
function master(st,level,dates=['2026-09-07','2026-09-08']) {
  const random=rng(25);
  C.levelById(level).types.forEach(type=>{
    const used=new Set();let n=0;
    while(n<3){const p=C.makeProblem(level,random,type);if(used.has(p.key))continue;used.add(p.key);L.record(st,p,true,dates[n%dates.length]);n++;}
    const again=C.makeProblem(level,random,type);L.record(st,again,true,dates[dates.length-1]);
  });
}
test('mastery needs varied independent answers on different days for every concept',()=>{
 const st=S.defaults();master(st,5,['2026-09-07']);assert.equal(L.ready(st,5),false);
 master(st,5);assert.equal(L.ready(st,5),true);
 const missing=Object.keys(st.skills)[0];delete st.skills[missing];assert.equal(L.ready(st,5),false);
});
test('same-day repetition and answer-copying cannot manufacture mastery',()=>{
 const st=S.defaults(),p=C.makeProblem(1,rng(2),'join');
 L.record(st,p,false,'2026-09-07');for(let i=0;i<20;i++)L.record(st,p,true,'2026-09-07');
 assert.deepEqual(st.skills[L.skillKey(p)],[{date:'2026-09-07',key:p.key,ok:false}]);
});
test('calendar neither accelerates nor caps mastery; a hard session does not demote',()=>{
 const st=S.defaults(),rows=[{key:'x',level:1,type:'join',firstTry:true,ms:1}];
 S.finishSession(st,rows,'2026-09-07',{behind:true});assert.equal(st.level,1);
 master(st,1);S.finishSession(st,rows,'2026-09-08',{cap:1});assert.equal(st.level,2);
 S.finishSession(st,[{...rows[0],level:2,firstTry:false}],'2026-09-09');assert.equal(st.level,2);
});
test('short sessions stay short, distribute weak skills and review with a new example',()=>{
 const random=rng(3),p=C.makeProblem(5,random,'tensOnes'),review=[{key:p.key,problem:p}];
 for(const count of [3,8,12,16]) {
  const set=L.buildSession({level:5,count,rng:random,review,state:S.defaults()});
  assert.equal(set.length,count);assert.equal(new Set(set.map(p=>p.key)).size,count);
  assert.equal(set[0].level,4);const r=set.find(p=>p.review);assert.equal(r.reviewKey,p.key);assert.notEqual(r.key,p.key);assert.equal(r.type,p.type);
 }
});
test('a variant advances its original review queue entry and records its own concept',()=>{
 const st=S.defaults(),p=C.makeProblem(3,rng(4),'add');S.recordAnswer(st,p,false,'2026-09-07');
 const variant=L.variant(p,rng(5));variant.reviewKey=p.key;variant.review=true;
 S.recordAnswer(st,variant,true,'2026-09-08');assert.equal(st.wrong.length,1);assert.equal(st.wrong[0].stage,1);assert.equal(st.wrong[0].due,'2026-09-11');
});
test('old wardrobes survive migration; checkpoints and help state round-trip',()=>{
 const p=C.makeProblem(1,rng(6)),st=S.clean({name:'재이',coins:77,owned:{'dress/test':true},album:[{id:'kitty',date:'2026-09-07'}]});
 assert.equal(st.coins,77);assert.equal(st.owned['dress/test'],true);assert.equal(st.album.length,1);
 st.pending={problems:[p],index:0,results:[],firstTry:false,hintStep:2,level:1};
 const copy=S.clean(JSON.parse(JSON.stringify(st)));assert.equal(copy.pending.firstTry,false);assert.equal(copy.pending.hintStep,2);
 assert.equal(S.clean({pending:{problems:[null],index:0,results:[]}}).pending,null);
});
test('warmups do not inflate the current-level accuracy',()=>{
 const st=S.defaults();st.level=5;
 const entry=S.finishSession(st,[{level:4,firstTry:true},{level:5,firstTry:false},{level:5,firstTry:true,review:true}],'2026-09-07');
 assert.equal(entry.fresh,1);assert.equal(entry.acc,0);assert.equal(entry.reviews,1);
});
