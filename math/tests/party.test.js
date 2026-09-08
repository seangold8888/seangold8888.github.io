const test=require('node:test'),assert=require('node:assert/strict'),E=require('../party/engine.js');
function lights(s){while(!E.completed(s)[0])E.act(s,'power',1);E.act(s,'next');}
function cookies(s){for(let i=0;i<s.cookie.visual.cross;i++)E.act(s,'cookie',i);E.act(s,'pack');E.act(s,'next');}
function balloons(s){for(let id=0;id<6;id+=2){E.act(s,'balloon',id);E.act(s,'balloon',id+1);}E.act(s,'next');}
test('100 varied parties use level 4 facts and preserve ten through all activities',()=>{
 for(let seed=0;seed<100;seed++){const s=E.create(seed);assert.equal(s.light.level,4);assert.equal(s.light.visual.a+s.light.answer,10);assert.equal(s.cookie.answer+s.cookie.visual.cross,10);assert.equal(E.act(s,'next'),'ignored');lights(s);cookies(s);balloons(s);assert.equal(s.stage,3);assert.equal(s.history.length,3);assert.equal(E.act(s,'next'),'ignored');assert.equal(s.history.length,3);}
});
test('overfill and wrong pairs neither advance nor reset earlier progress',()=>{
 const s=E.create(72);while(s.light.visual.a+s.placed<9)E.act(s,'power',1);const before=s.placed;assert.equal(E.act(s,'power',3),'overflow');assert.equal(s.placed,before);assert.equal(s.mistakes[0],1);lights(s);cookies(s);
 const a=s.cards[0],b=s.cards.find(c=>c.id!==a.id&&c.value+a.value!==10);
 E.act(s,'balloon',a.id);assert.equal(E.act(s,'balloon',b.id),'mismatch');assert.equal(s.matched.length,0);assert.equal(s.mistakes[2],1);assert.equal(s.history.length,2);
});
test('cookie movement is reversible; wrong wrapping never records completion',()=>{
 const s=E.create(8);lights(s);assert.equal(E.act(s,'pack'),'too-few');E.act(s,'cookie',0);E.act(s,'cookie',0);assert.deepEqual(s.selected,[]);
 for(let i=0;i<10;i++)E.act(s,'cookie',i);assert.equal(E.act(s,'pack'),'too-many');assert.equal(s.history.length,1);
 for(let i=s.cookie.visual.cross;i<10;i++)E.act(s,'cookie',i);assert.equal(E.act(s,'pack'),'complete');assert.equal(s.selected.length+s.cookie.answer,10);
});
test('resume retains assistance, failures, matched pairs, and completed free play',()=>{
 let s=E.create(34);E.act(s,'start');E.act(s,'help');lights(s);s=E.clean(JSON.parse(JSON.stringify(s)));assert.equal(s.stage,1);assert.equal(s.history[0].help,true);assert.equal(s.help[0],true);cookies(s);E.act(s,'balloon',0);s=E.clean(s);assert.equal(s.picked,0);E.act(s,'balloon',1);s=E.clean(s);assert.deepEqual(s.matched,[0,1]);for(let i=2;i<6;i+=2){E.act(s,'balloon',i);E.act(s,'balloon',i+1);}E.act(s,'next');s=E.clean(s);assert.equal(s.stage,3);assert.ok(s.finishedAt);assert.equal(s.history.length,3);const replay=E.create(99,s.history);assert.equal(replay.stage,0);assert.equal(replay.history.length,3);
});
test('corrupt saves cannot skip preparation; storage only writes its own key',()=>{
 const s=E.create(1);s.stage=3;s.selected=[100,-1,1,1];s.matched=[0];const fixed=E.clean(s);assert.equal(fixed.stage,0);assert.deepEqual(fixed.selected,[1]);assert.deepEqual(fixed.matched,[]);
 const data=new Map([['math10_state','original'],['hub2_tickets','7']]),storage={getItem:k=>data.get(k),setItem:(k,v)=>data.set(k,v)};E.save(storage,fixed);assert.equal(data.get('math10_state'),'original');assert.equal(data.get('hub2_tickets'),'7');assert.equal(data.size,3);assert.equal(E.load(storage).seed,1);
 assert.equal(E.save({setItem(){throw Error('quota')}},fixed),false);assert.equal(E.load({getItem(){throw Error('blocked')}}).version,1);
});
