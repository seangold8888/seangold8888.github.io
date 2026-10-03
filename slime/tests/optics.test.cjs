const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const load=import('data:text/javascript;base64,'+fs.readFileSync(path.join(__dirname,'../src/optics.js')).toString('base64'));
test('Beer-Lambert absorption increases with optical path, not an arbitrary color pulse',async()=>{
 const {beerLambert}=await load,c=[.2,.6,.9],a=beerLambert(c,.5,2),b=beerLambert(c,2,2);
 assert.deepEqual(beerLambert(c,0,2),[1,1,1]);b.forEach((v,i)=>{assert.ok(v<a[i]);assert.ok(Math.abs(v-c[i])<1e-12);});
 assert.throws(()=>beerLambert(c,-1,2),RangeError);assert.throws(()=>beerLambert(c,1,0),RangeError);
});
test('Snell refraction preserves a normal ray and detects total internal reflection',async()=>{
 const {refractRay}=await load;assert.deepEqual(refractRay([0,-1,0],[0,1,0],1/1.36),[0,-1,0]);
 assert.equal(refractRay([Math.sqrt(.99),-.1,0],[0,1,0],1.36),null);
 const r=refractRay([.6,-.8,0],[0,1,0],1/1.36);assert.ok(r[0]<.6);assert.ok(Math.abs(Math.hypot(...r)-1)<1e-12);
});
test('fitted-volume exit distinguishes thick body and thin stretched skin',async()=>{
 const {ellipsoidExit}=await load;assert.equal(ellipsoidExit([0,1,0],[0,-1,0],[0,0,0],[1,1,1]),2);
 assert.equal(ellipsoidExit([0,.5,0],[0,-1,0],[0,0,0],[1,.5,1]),1);
 for(let i=0;i<100;i++){const x=i/100,y=Math.sqrt(1-x*x),d=ellipsoidExit([x,y,0],[0,-1,0],[0,0,0],[1,1,1]);assert.ok(Number.isFinite(d)&&d>=0&&d<=2);}
 assert.equal(ellipsoidExit([3,3,3],[1,0,0],[0,0,0],[1,1,1]),0);
});
test('jelly optics have a fixed small render target and do not claim a full ray tracer',async()=>{
 const {OPTICS_BUDGET:b}=await load;assert.ok(b.touchSize<=128&&b.desktopSize<=192&&b.hz<=30&&b.maxFocus<=8);
 const s=fs.readFileSync(path.join(__dirname,'../src/caustics.js'),'utf8');assert.match(s,/actual animated skin/);assert.match(s,/fitted ellipsoid/);
 assert.match(s,/finally\{renderer\.setRenderTarget/);assert.match(s,/disc/);assert.match(s,/refract\(/);assert.match(s,/dFdx/);
});
