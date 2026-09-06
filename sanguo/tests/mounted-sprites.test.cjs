const test=require('node:test'),assert=require('node:assert/strict');
const mod=()=>import('../src/game/mountedSprites.js');
test('every mount profile asset is shipped and registered for offline caching',async()=>{
 const fs=require('node:fs'),path=require('node:path');
 const {MOUNT_PROFILES}=await mod();
 const sw=fs.readFileSync(path.join(__dirname,'../../sw.js'),'utf8');
 assert.ok(sw.includes('/sanguo/src/game/mountedSprites.js'));
 for(const profile of Object.values(MOUNT_PROFILES))for(const key of ['horse','rider','bow']){
  if(!profile[key])continue;
  const asset=path.join(__dirname,'..',profile[key]);
  assert.ok(fs.statSync(asset).size>1000,profile[key]);
  assert.ok(sw.includes('/sanguo/'+profile[key]),'cached '+profile[key]);
 }
});
test('four distinct mounts retain their own horse in every combat pose',async()=>{
 const {MOUNT_PROFILES,drawConsistentMount}=await mod();
 assert.equal(new Set(Object.values(MOUNT_PROFILES).map(p=>p.horse)).size,4);
 for(const [id,profile] of Object.entries(MOUNT_PROFILES)){
  const horse={src:profile.horse},rider={src:profile.rider,width:1280,height:1280},draws=[];
  const ctx={save(){},restore(){},translate(){},scale(){},beginPath(){},moveTo(){},lineTo(){},closePath(){},clip(){},drawImage(...args){draws.push(args);}};
  for(const facing of [-1,1])for(const ranged of [false,true])for(let frame=0;frame<4;frame++){
   const calls=[];drawConsistentMount(ctx,(...args)=>calls.push(args),{horse,rider,x:400,y:400,height:240,facing,frame,ranged});
   assert.equal(calls.length,1);assert.equal(calls[0][1],horse,id);
   assert.equal(calls[0][2],0,'stationary horse must not change pose with rider attack');
   assert.equal(calls[0][5],240,'horse scale must not change with archery');
   assert.equal(draws.at(-1)[0],rider);
  }
 }
});
test('rider switches melee and bow overlays; gallop uses the same horse sheet',async()=>{
 const {riderPose,drawConsistentMount}=await mod();
 assert.deepEqual([0,1,2,3].map(f=>riderPose(f,false)),[0,0,0,1]);
 assert.deepEqual([0,1,2,3].map(f=>riderPose(f,true)),[2,2,2,3]);
 const ctx={save(){},restore(){},translate(){},scale(){},drawImage(){}},horse={};
 for(const now of [0,125,250]){
  let args;drawConsistentMount(ctx,(...a)=>args=a,{horse,rider:{width:1280,height:1280},height:240,moving:true,now});
  assert.equal(args[1],horse);assert.ok([1,2].includes(args[2]));
 }
});
