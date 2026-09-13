"use strict";
const test=require("node:test"),assert=require("node:assert/strict"),fs=require("node:fs"),path=require("node:path"),vm=require("node:vm");
const root=path.resolve(__dirname,"..");
const box={window:{}};vm.runInNewContext(fs.readFileSync(path.join(root,"js/story-gates.js"),"utf8"),box);
const gates=box.window.CardStoryGates;
test("display shuffle allows every permutation and every answer position without mutating IDs or bank",()=>{
 const question=gates.all.find(q=>q.id==="taeo-belt"),before=JSON.stringify(gates.all),orders=new Set(),positions=new Set();
 for(const a of [0,.4,.8])for(const b of [0,.8]){
  const rolls=[a,b];const copy=gates.shuffleChoices(question.choices,()=>rolls.shift());
  orders.add(copy.map(c=>c.id).join(","));positions.add(copy.findIndex(c=>c.id===question.correctChoiceId));
  assert.equal(rolls.length,0);
  assert.deepEqual(Array.from(copy,c=>c.id).sort(),Array.from(question.choices,c=>c.id).sort());
  copy[0].text="display only";
 }
 assert.equal(orders.size,6);assert.equal(positions.size,3);assert.equal(JSON.stringify(gates.all),before);
});
test("all question answers survive display shuffling; display code normalizes IDs before shuffle",()=>{
 for(const q of gates.all){
  const choices=gates.shuffleChoices(q.choices,()=>0);
  assert.equal(choices.filter(c=>c.id===q.correctChoiceId).length,1,q.id);
 }
 const app=fs.readFileSync(path.join(root,"js/app.js"),"utf8");
 assert.match(app,/choices \|\| \[\]\)\.map\(normalizedQuizChoice\)/);
 assert.match(app,/CardStoryGates\.shuffleChoices\(choices\)\.forEach/);
 assert.match(app,/ultimateTriedChoices\.includes\(choice.id\)/);
 assert.match(app,/String\(choice.id\) === String\(storyChallenge.correctChoiceId\)/);
});
