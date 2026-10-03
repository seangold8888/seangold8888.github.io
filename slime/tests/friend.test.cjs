const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const load=import('data:text/javascript;base64,'+fs.readFileSync(path.join(__dirname,'../src/friend.js')).toString('base64'));
function store(value){let raw=value;return{getItem:()=>raw,setItem:(_,v)=>{raw=v;}};}
test('friend safely loads old, malformed and unavailable storage',async()=>{const{createFriend}=await load;
 for(const value of ['{','null','{"affection":-12,"flavor":50,"ornament":"hat"}']){const f=createFriend(store(value));assert.ok(f.data.affection>=0);assert.ok(f.data.flavor<=5);assert.equal(f.data.ornament,'none');}
 assert.equal(createFriend({getItem(){throw Error();},setItem(){throw Error();}}).data.name,'말랑이');});
test('name, flavor and earned decorations survive absence without time-based needs',async()=>{const{createFriend}=await load,s=store('{}'),f=createFriend(s);f.rename('재이의 젤리');f.flavor(4);
 assert.equal(f.dress('hat'),false);for(let i=0;i<15;i++)f.reward(i);assert.equal(f.dress('hat'),true);
 const again=createFriend(s);assert.deepEqual(again.data,{name:'재이의 젤리',flavor:4,affection:15,ornament:'hat',accessoryColor:0});assert.equal('lastVisit' in again.data,false);});

test('free dress-up gifts and six accessory colors preserve old saves',async()=>{const{createFriend,ACCESSORY_COLORS}=await load,s=store('{"name":"젤리","affection":0}'),f=createFriend(s);
 assert.equal(f.data.accessoryColor,0);assert.equal(ACCESSORY_COLORS.length,6);for(const id of ['flower','cat','crown'])assert.equal(f.dress(id),true);
 assert.equal(f.tint(4),true);assert.equal(createFriend(s).data.accessoryColor,4);assert.equal(createFriend(s).data.ornament,'crown');
 for(const v of [-1,6,.5,NaN,'pink'])assert.equal(f.tint(v),false);assert.equal(f.data.accessoryColor,4);assert.equal(f.dress('unknown'),false);
 assert.equal(createFriend(store('{"accessoryColor":99}')).data.accessoryColor,0);});
test('affection throttles fast taps and announces a reward only once',async()=>{const{createFriend}=await load,f=createFriend(store('{}'));f.reward(0);for(let i=1;i<50;i++)f.reward(i*.01);assert.equal(f.data.affection,1);
 let gifts=[];for(let i=1;i<20;i++)gifts.push(...f.reward(i));assert.deepEqual(gifts.map(x=>x.id),['ribbon','hat']);assert.equal(f.reward(NaN).length,0);});
test('six flavors vary stable elasticity, damping and sound, keeping soda baseline',async()=>{const{FEELS}=await load;assert.equal(FEELS.length,6);assert.equal(FEELS[0].spring,1);assert.equal(FEELS[0].damping,1);
 assert.equal(new Set(FEELS.map(x=>x.pitch)).size,6);for(const f of FEELS){assert.ok(f.spring>=.65&&f.spring<=1.25);assert.ok(f.damping>=.9&&f.damping<=1.8);}});
test('ripple normals use a four-entry pool and respect reduced motion',()=>{const s=fs.readFileSync(path.join(__dirname,'../src/material.js'),'utf8'),m=fs.readFileSync(path.join(__dirname,'../src/main.js'),'utf8');assert.match(s,/length:4/);assert.match(s,/skinRipple/);assert.match(s,/dFdx\(rippleHeight\)/);assert.match(m,/rippleStrength\.value=reduced\(\)\?0/);});
test('aurora keeps real gel transmission and absorption instead of painted RGB bands',()=>{
 const s=fs.readFileSync(path.join(__dirname,'../src/material.js'),'utf8'),m=fs.readFileSync(path.join(__dirname,'../src/main.js'),'utf8');
 assert.doesNotMatch(s,/diffuseColor\.rgb=mix\(diffuseColor\.rgb,spectrum/);assert.doesNotMatch(s,/material\.attenuationColor = mix/);
 assert.match(m,/material\.transmission\+=\(1-material\.transmission\)/);assert.match(m,/const film=flavorIndex===5/);
 assert.match(s,/material\.iridescenceThickness=mix/);assert.match(s,/auroraMask=uRainbow\*\(1\.0-faceMask\)/);assert.match(m,/flavorIndex===5&&!reduced\(\)/);
});

test('aurora volume uses bounded refraction samples, masks the face and keeps a low-quality path',()=>{
 const v=fs.readFileSync(path.join(__dirname,'../src/aurora-volume.js'),'utf8'),m=fs.readFileSync(path.join(__dirname,'../src/material.js'),'utf8'),app=fs.readFileSync(path.join(__dirname,'../src/main.js'),'utf8');
 assert.match(v,/if\(uRainbow<\.001\)return vec3\(0\.0\)/);
 assert.match(v,/refract\(incident,normalize\(vSkinNormal\),1\.0\/1\.36\)/);
 assert.match(v,/count=clamp\(uAuroraSamples,4\.0,8\.0\),stepLength=jellyPath\(1\.36\)\/count/);
 assert.match(v,/for\(int i=0;i<8;i\+\+\)/);assert.match(v,/if\(float\(i\)>=count\)break/);
 assert.match(v,/dot\(q,q\)/);assert.match(v,/min\(light,vec3\(1\.3\)\)\*uRainbow/);
 assert.match(m,/auroraVolume\(\)\*\(1\.0-faceMask\)/);assert.match(app,/auroraSamples\.value=quality\.low\?4:8/);
});
test('soft rainbow is gradual, broadly blended and not striped or green-only',()=>{
 const v=fs.readFileSync(path.join(__dirname,'../src/aurora-volume.js'),'utf8'),m=fs.readFileSync(path.join(__dirname,'../src/main.js'),'utf8');
 assert.match(v,/vec3 spectrum=\.5\+\.5\*cos/);assert.match(v,/vec3 pastel=mix\(vec3\(\.48\),spectrum,\.62\)/);
 assert.match(v,/rainbowGlow\(q,uFilmPhase\)/);assert.doesNotMatch(v,/auroraCurtain|threads|floorLine/);
 assert.match(m,/filmPhase\.value\+=dt\*\(Math\.PI\*2\/5\)/);assert.doesNotMatch(m,/filmPhase\.value=.*%/);
 // Check the palette's range and a small time step rather than merely different images.
 const spectrum=t=>[0,2/3,1/3].map(o=>.48*.38+(.5+.5*Math.cos(t+Math.PI*2*o))*.62);
 const frames=Array.from({length:64},(_,i)=>spectrum(i*Math.PI*2/64));
 for(let c=0;c<3;c++){assert.ok(Math.max(...frames.map(f=>f[c]))>.79);assert.ok(Math.min(...frames.map(f=>f[c]))<.20);}
 for(const t of [0,1.8,3.6,5.4]){const a=spectrum(t),b=spectrum(t+(Math.PI*2/5)/60);assert.ok(Math.max(...a.map((x,i)=>Math.abs(x-b[i])))<.007);}
});
test('aurora coating leaves the five original flavor colors untouched',async()=>{const{FLAVORS}=await import(require('node:url').pathToFileURL(path.join(__dirname,'../src/material.js')));
 assert.deepEqual(FLAVORS.slice(0,5).map(x=>[x.color,x.deep,x.glow]),[
 ['#a2eaff','#3db8f6','#a8eeff'],['#ffa3c2','#f2508a','#ffc6da'],['#b6ec86','#58c45e','#dbffb4'],['#ffe27e','#ffb42a','#fff2ae'],['#c6adff','#8a63f5','#e2d5ff']]);
 assert.equal(FLAVORS[5].color,'#e9edf4');});
test('every feel profile remains finite through stretching, poking, jumping and settling',async()=>{const{FEELS}=await load,{createJelly}=await import('data:text/javascript;base64,'+fs.readFileSync(path.join(__dirname,'../src/physics.js')).toString('base64'));
 const shapes=[];for(const f of FEELS){const s=createJelly(12,24);s.feel(f.spring,f.damping);s.poke(30);for(let t=0;t<12;t++)s.advance(1/60);shapes.push(s.squash);
  s.grab(40,{x:s.position[120],y:s.position[121],z:s.position[122]});s.move({x:1.3,y:3,z:.4});for(let t=0;t<30;t++)s.advance(1/60);s.release({x:4,y:3,z:1});for(let t=0;t<600;t++)s.advance(1/60);
  assert.ok(s.position.every(Number.isFinite));assert.ok(Math.abs(s.squash)<.02);assert.ok(s.state().maxDeformation<.03);assert.ok(s.position.every((v,k)=>k%3!==1||v+s.body.y>=-.0001));}
 assert.ok(new Set(shapes.map(x=>x.toFixed(4))).size>3);});
