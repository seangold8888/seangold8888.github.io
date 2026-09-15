'use strict';
const {test}=require('node:test'),assert=require('node:assert/strict'),G=require('../../assets/study/princess-growth.js');
const memory=()=>{const data=new Map();return {getItem:k=>data.get(k)||null,setItem:(k,v)=>data.set(k,v),data};};
test('new answers belong to selected child; dedup survives refresh, child switch and next day',()=>{
 const s=memory();for(let ordinal=1;ordinal<=10;ordinal++)assert(G.record(s,{day:'2026-9-15',ordinal,subject:ordinal===5?'math':'reading'}).ok);
 assert.equal(G.summary(G.read(s).children.jaei).stars,1);G.select(s,'taeo');
 assert.equal(G.record(s,{day:'2026-9-15',ordinal:10,subject:'reading'}).changed,false);
 assert.equal(G.record(s,{day:'2026-9-14',ordinal:1,subject:'math',parentMode:true}).ok,false);
 G.record(s,{day:'2026-9-16',ordinal:1,subject:'math'});
 assert.equal(G.read(s).children.taeo.math,1);assert.equal(G.read(s).children.jaei.math,1);
 assert.equal(G.select(s,'__proto__').ok,false);assert.equal(s.getItem('hub2_solved'),null);
});
test('picnic is resumable, requires equal sharing, preserves wardrobe and only rewards once',()=>{
 const s=memory();s.setItem('princess:outfits','keep');
 assert.equal(G.quest(s,'jaei','finish').changed,false);G.quest(s,'jaei','start');
 G.quest(s,'jaei','apple',0);assert.equal(G.read(s).children.jaei.quest.plates[0],1);
 assert.equal(G.quest(s,'jaei','share').changed,false);G.quest(s,'jaei','reset');
 for(let i=0;i<3;i++)for(let n=0;n<2;n++)G.quest(s,'jaei','apple',i);
 G.quest(s,'jaei','share');assert.equal(G.quest(s,'jaei','trail','stone').changed,false);
 G.quest(s,'jaei','trail','prints');assert.equal(G.quest(s,'jaei','greet','Good night.').changed,false);G.quest(s,'jaei','greet','Come with me.');
 G.quest(s,'jaei','finish',{princess:'신데렐라',photo:'data:image/jpeg;base64,YQ=='});
 const before=G.read(s).children.jaei.diary;assert(before.photo);assert(G.read(s).children.jaei.friend);
 assert.equal(G.quest(s,'jaei','finish').changed,false);G.quest(s,'jaei','replay');
 assert.deepEqual(G.read(s).children.jaei.diary,before);assert.equal(G.read(s).children.taeo.friend,false);assert.equal(s.getItem('princess:outfits'),'keep');
});
test('corrupt/future data and quota failures never overwrite existing progress',()=>{
 const s=memory();s.setItem(G.KEY,'{broken');assert.equal(G.select(s,'taeo').ok,false);assert.equal(s.getItem(G.KEY),'{broken');
 s.setItem(G.KEY,JSON.stringify({version:2,children:{}}));assert.equal(G.select(s,'taeo').ok,false);
 const full={getItem:()=>null,setItem:()=>{throw Error('QuotaExceededError');}};assert.equal(G.record(full,{day:'2026-9-15',ordinal:1,subject:'math'}).ok,false);
});
test('learning unlocks optional assistance without making the adventure require study',()=>{
 const s=memory();G.quest(s,'jaei','start');assert.equal(G.quest(s,'jaei','share-help').changed,false);
 for(let ordinal=1;ordinal<=3;ordinal++)G.record(s,{day:'2026-9-15',ordinal,subject:'math'});
 assert(G.quest(s,'jaei','share-help').changed);assert.deepEqual(G.read(s).children.jaei.quest.plates,[2,2,2]);
 assert.equal(G.read(s).children.jaei.math,3);assert.equal(G.summary(G.read(s).children.jaei).total,3);
});

test('worker caches integration, and hub records only inside its accepted-answer branch',()=>{
 const fs=require('fs'),path=require('path'),root=path.resolve(__dirname,'../..'),sw=require('../../sw.js');
 for(const file of ['assets/study/princess-growth.js','assets/study/princess-growth.css','princess/journey.js','princess/journey.css'])assert(sw.OPTIONAL_SHELL.includes('./'+file+'?v=1'));
 const h=fs.readFileSync(path.join(root,'game/index.html'),'utf8');assert(h.indexOf('window.PrincessGrowth.record')>h.indexOf('current.answered = true'));assert(h.includes('parentMode: state.parentMode'));assert(h.includes('var SET = 10, DAILY = 100;'));
});
