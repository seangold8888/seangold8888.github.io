const{test}=require('node:test'),assert=require('node:assert/strict'),path=require('node:path'),{pathToFileURL}=require('node:url');
const load=import(pathToFileURL(path.join(__dirname,'../src/workshop.js')));
const store=v=>{let raw=v;return{getItem:()=>raw,setItem:(_,x)=>{raw=x;},get raw(){return raw;}};};
const rgb=h=>[1,3,5].map(i=>parseInt(h.slice(i,i+2),16));
test('paint mixing behaves like children expect from paint',async()=>{const{cook}=await load;
 const green=rgb(cook({y:1,b:1},{}).color),orange=rgb(cook({r:1,y:1},{}).color),purple=rgb(cook({r:1,b:1},{}).color),pink=rgb(cook({r:1,w:1},{}).color),red=rgb(cook({r:1},{}).color);
 assert.ok(green[1]>green[0]&&green[1]>green[2],'yellow + blue = green');assert.ok(orange[0]>orange[1]&&orange[1]>orange[2],'red + yellow = orange');
 assert.ok(purple[2]>purple[1]&&purple[0]>purple[1],'red + blue = purple');assert.ok(pink[1]>red[1]&&pink[2]>red[2],'white makes it paler');
 assert.equal(cook({r:2,y:1},{}).key===cook({r:1,y:1},{}).key,false);assert.equal(cook({y:1,b:1},{}).key,cook({b:1,y:1},{}).key,'order of drops does not matter');
 assert.equal(cook({a:1},{}).rainbow,true);assert.equal(cook({a:1},{}).base,5);assert.equal(cook({b:1},{}).rainbow,false);
});
test('six secret recipes are reachable and mutually exclusive',async()=>{const{cook,SECRETS}=await load;
 const recipes={rainbow:[{r:1,y:1,b:1,a:1},{}],galaxy:[{r:1,b:1},{glitter:1,stars:1}],sea:[{b:1,w:1},{foam:1}],milk:[{r:1,w:2},{foam:1}],forest:[{y:1,b:1},{beads:1}],gold:[{y:2},{glitter:1}]};
 assert.deepEqual(SECRETS.map(s=>s.id).sort(),Object.keys(recipes).sort());
 for(const [id,[d,m]] of Object.entries(recipes)){const look=cook(d,m);assert.equal(look.secret,id);assert.ok(SECRETS.find(s=>s.id===id).hint.length>4);assert.ok(look.suggest.length<=8);}
 assert.equal(cook({b:1,w:1},{}).secret,null,'바닷물 needs foam');assert.equal(cook({y:2,w:1},{glitter:1}).secret,null);
 // Every recipe of up to four drops maps to at most one secret.
 const ids=['r','y','b','w','a'];let count=0;
 for(let n=0;n<625;n++){const d={};let k=n,t=0;for(const id of ids){d[id]=k%5;t+=d[id];k=Math.floor(k/5);}if(!t||t>4)continue;
  for(let mm=0;mm<16;mm++){const m={glitter:!!(mm&1),beads:!!(mm&2),foam:!!(mm&4),stars:!!(mm&8)};assert.ok(SECRETS.filter(s=>s.test(d,m)).length<=1);count++;}}
 assert.ok(count>1000);
});
test('collection survives malformed, blocked and repeated saves',async()=>{const{createDex,cook,DEX_MAX}=await load;
 for(const raw of ['{','null','[]','{"entries":[{"drops":{"r":-3}},{"drops":{"b":1,"w":1},"mix":{"foam":true},"name":"  바다  "}]}']){const d=createDex(store(raw));assert.ok(Array.isArray(d.entries));}
 assert.equal(createDex(store('{"entries":[{"drops":{"b":1,"w":1},"mix":{"foam":true},"name":"  바다  "}]}')).entries[0].name,'바다');
 const blocked=createDex({getItem(){throw Error('blocked');},setItem(){throw Error('blocked');}});assert.equal(blocked.add(cook({r:1},{}),'빨강').isNew,true);assert.equal(blocked.entries.length,1);
 const s=store(null),d=createDex(s);assert.deepEqual(d.add(cook({b:1,w:1},{foam:1}),''),{isNew:true,secretNew:true});assert.deepEqual(d.add(cook({w:1,b:1},{foam:1}),'x'),{isNew:false,secretNew:false});
 assert.deepEqual(d.add(cook({b:2,w:1},{foam:1}),''),{isNew:true,secretNew:false},'second sea recipe is new but not a new secret');
 const again=createDex(s);assert.equal(again.entries.length,2);assert.equal(again.secrets.has('sea'),true);assert.equal(again.entries[0].name,'바닷물 슬라임');
 for(let i=0;i<200;i++){const r=i%5,y=Math.floor(i/5)%5;if(r+y===0||r+y>4)continue;d.add(cook({r,y,w:i%2},{glitter:i%3===0,beads:i%7===0}),'');}
 assert.ok(d.entries.length<=DEX_MAX);assert.equal(createDex(s).secrets.has('sea'),true,'secret discoveries are never evicted');
});
test('room keeps up to four valid slimes, falls back to the classic friend',async()=>{const{createRoom,ROOM_MAX,sizeFor,FEED_FULL,twinName}=await load;
 assert.deepEqual(createRoom(store('{'),{flavor:2,name:'재이'}).slimes,[{kind:'classic',flavor:2,name:'재이',fed:4}]);
 assert.equal(sizeFor(4),1,'the original friend keeps today\'s size');assert.equal(sizeFor(-5),.72);assert.ok(Math.abs(sizeFor(FEED_FULL)-1.14)<1e-9);
 const raw=JSON.stringify({slimes:[{kind:'classic',flavor:9},{kind:'recipe',drops:{b:1},fed:99},{kind:'recipe',drops:{}},{kind:'classic',flavor:1,name:'딸기',fed:2},{kind:'recipe',drops:{y:1}},{kind:'recipe',drops:{r:1}},{kind:'recipe',drops:{w:1}}]});
 const r=createRoom(store(raw));assert.equal(r.slimes.length,ROOM_MAX);assert.equal(r.slimes[0].fed,FEED_FULL);assert.equal(r.slimes[1].name,'딸기');
 assert.equal(createRoom({getItem(){throw Error();},setItem(){throw Error();}}).slimes.length,1);
 assert.equal(twinName('말랑이',['말랑이']),'말랑이 2');assert.equal(twinName('말랑이 2',['말랑이','말랑이 2']),'말랑이 3');assert.equal(twinName('은하수 슬라임',[]),'은하수 2');
});
