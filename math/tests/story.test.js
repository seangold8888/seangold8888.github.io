'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const E=require('../story/engine.js');

test('each daily story introduces a different number and both parity claims occur',()=>{
 const dates=Array.from({length:12},(_,i)=>'2026-10-'+String(i+1).padStart(2,'0'));
 const plans=dates.map(E.plan);
 assert.ok(plans.every(p=>p.count>=5&&p.count<=10&&p.count%2!==p.transfer%2));
 assert.ok(plans.some(p=>p.claimEven===(p.count%2===0)));
 assert.ok(plans.some(p=>p.claimEven!==(p.count%2===0)));
 dates.forEach(date=>{
  const p=E.plan(date),s=E.create(date,'purin');
  while(s.phase==='pair')E.pair(s);
  E.advance(s);
  assert.equal(E.judge(s,p.claimEven===(p.count%2===0)),true,date+': teacher decision');
  assert.equal(E.transfer(s,p.transfer%2===0),true,date+': new number');
  assert.equal(E.reason(s,p.transfer%2===1),true,date+': explanation');
 });
});

test('pairing, teaching and an independent new example require the child to finish each stage',()=>{
 const date='2026-09-28',p=E.plan(date),s=E.create(date,'kitty');
 for(let i=0;i<Math.floor(p.count/2);i++) assert.equal(E.pair(s),true);
 assert.equal(s.phase,'paired');assert.equal(E.pair(s),false);
 assert.equal(E.advance(s),true);assert.equal(s.phase,'teach');
 assert.equal(E.judge(s,p.claimEven!==(p.count%2===0)),false);
 assert.equal(s.phase,'teach');assert.equal(s.assisted,true);
 assert.equal(E.judge(s,p.claimEven===(p.count%2===0)),true);
 assert.equal(s.phase,'transfer');
 assert.equal(E.transfer(s,p.transfer%2!==0),false);
 assert.equal(s.phase,'transfer');
 assert.equal(E.transfer(s,p.transfer%2===0),true);
 assert.equal(s.phase,'reason');
 assert.equal(E.reason(s,p.transfer%2!==1),false);
 assert.equal(E.reason(s,p.transfer%2===1),true);
 assert.equal(s.phase,'done');
});

test('a paused story resumes, while a new day starts with the next story',()=>{
 const data=new Map(),storage={getItem:k=>data.get(k)||null,setItem:(k,v)=>data.set(k,v)};
 const s=E.create('2026-09-28','purin');E.pair(s);E.save(storage,s);
 assert.equal(E.load(storage,'2026-09-28','kitty').pairs,1);
 assert.equal(E.load(storage,'2026-09-29','kitty').pairs,0);
 assert.equal(E.load(storage,'2026-09-29','kitty').character,'kitty');
});
