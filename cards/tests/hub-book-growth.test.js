"use strict";
const test=require('node:test'),a=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const books=require('../../story/english/books.js');
function storage(){const data=new Map();return {data,getItem:k=>data.get(k)??null,setItem:(k,v)=>data.set(k,String(v))};}
function pass(s,id,options={}){return books.recordPass(s,{mode:books.readMode(s),id,firstTry:true,pageComplete:true,...options});}
test('six independent first-try short passages promote once, then eight sentences promote to full page',()=>{
  const s=storage();
  for(let i=0;i<5;i++){a.equal(pass(s,'picnic:'+i+':0').promoted,false);a.equal(books.readMode(s),'easy');}
  a.equal(pass(s,'picnic:5:0').promoted,true);a.equal(books.readMode(s),'sentence');
  a.equal(books.readGrowth(s).streak,0);
  for(let i=0;i<7;i++)a.equal(pass(s,'momo:'+i+':0').promoted,false);
  a.equal(pass(s,'momo:7:0').promoted,true);a.equal(books.readMode(s),'page');
  for(let i=0;i<15;i++)a.equal(pass(s,'pigs:'+i+':0').promoted,false);
  a.equal(books.readMode(s),'page');
});
test('streak persists across reloads and both surfaces; repeated or stale callbacks cannot count',()=>{
  const s=storage();pass(s,'picnic:0:0');
  const reloaded={getItem:s.getItem,setItem:s.setItem};
  a.equal(books.readGrowth(reloaded).streak,1);
  a.equal(pass(reloaded,'picnic:0:0').counted,false);
  a.equal(pass(reloaded,'picnic:1:0',{mode:'sentence'}).counted,false);
  a.equal(books.readGrowth(s).streak,1);a.match(books.growthLabel(s),/1\/6/);
});
test('promotion waits for the last sentence without abandoning the unfinished page',()=>{
  const s=storage();books.saveMode(s,'sentence');
  for(let i=0;i<7;i++)pass(s,'momo:'+i+':0');
  a.equal(pass(s,'picnic:0:0',{pageComplete:false}).promoted,false);
  a.equal(books.readMode(s),'sentence');a.equal(books.readGrowth(s).streak,8);
  a.equal(pass(s,'picnic:0:1').promoted,true);a.equal(books.readMode(s),'page');
});
test('retried passages reset success streak and three successive struggles ease one level only',()=>{
  const s=storage();books.saveMode(s,'page');
  pass(s,'picnic:0:0',{firstTry:false});pass(s,'picnic:1:0',{firstTry:false});
  a.equal(pass(s,'picnic:2:0',{firstTry:false}).eased,true);a.equal(books.readMode(s),'sentence');
  pass(s,'picnic:3:0',{firstTry:false,pageComplete:false});
  pass(s,'picnic:3:1',{firstTry:false});
  a.equal(pass(s,'picnic:4:0',{firstTry:false}).eased,true);a.equal(books.readMode(s),'easy');
  for(let i=0;i<4;i++)a.equal(pass(s,'momo:'+i+':0',{firstTry:false}).eased,false);
  pass(s,'momo:5:0');a.equal(books.readGrowth(s).struggles,0);
  pass(s,'momo:6:0',{firstTry:false});a.equal(books.readGrowth(s).streak,0);
});
test('manual parent choice resets growth, not the saved book or daily-study rewards',()=>{
  const s=storage();s.setItem('hub2_book_cursor','{"i":12,"part":1,"done":["picnic"]}');s.setItem('hub2_credit','1');s.setItem('hub2_solved','15');
  pass(s,'picnic:0:0');books.saveMode(s,'sentence');
  a.equal(books.readGrowth(s).streak,0);a.deepEqual(books.readGrowth(s).recent,[]);
  a.equal(s.getItem('hub2_book_cursor'),'{"i":12,"part":1,"done":["picnic"]}');
  a.equal(s.getItem('hub2_credit'),'1');a.equal(s.getItem('hub2_solved'),'15');
});
test('invalid state and denied storage remain usable and bounded',()=>{
  const s=storage();s.setItem(books.ADAPTIVE_KEY,'invalid');a.equal(books.readGrowth(s).streak,0);
  s.setItem(books.ADAPTIVE_KEY,JSON.stringify({mode:'easy',streak:10000,struggles:-2,recent:[4,'ok']}));
  a.equal(books.readGrowth(s).streak,6);a.equal(books.readGrowth(s).struggles,0);a.deepEqual(books.readGrowth(s).recent,['ok']);
  const blocked={getItem(){throw Error('denied');},setItem(){throw Error('denied');}};
  a.equal(pass(blocked,'picnic:0:0').mode,'easy');a.match(books.growthLabel(blocked),/0\/6/);
});
test('hub and reader wire accepted passages, guard duplicates, and leave microphone faults out',()=>{
  const root=path.resolve(__dirname,'../..'),hub=fs.readFileSync(path.join(root,'game/index.html'),'utf8'),reader=fs.readFileSync(path.join(root,'story/english/index.html'),'utf8');
  a.match(hub,/!current\.story && firstTry && recordReadingPass/);
  a.match(hub,/firstTry: firstTry, pageComplete: current\.story\.part === current\.story\.partCount - 1/);
  a.match(reader,/serial !== renderSerial \|\| accepted/);a.match(reader,/onRetry: function/);
  const errors=hub.slice(hub.indexOf('onUnavailable: function'),hub.indexOf('// Preserve the full microphone'));
  a.doesNotMatch(errors,/recordPass/);
});
