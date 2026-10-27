import * as THREE from '../../kart3d/vendor/three.module.min.js';
import {mergeVertices} from '../../kart3d/vendor/BufferGeometryUtils.js';
import {createJelly,clamp} from './physics.js?v=workshop-17';
import {jellyMaterial} from './material.js?v=workshop-17';
import {jellyMixins} from './mixins.js?v=workshop-17';
// Room-mates beside the main friend. Same soft-body solver and gel material, but a
// 642-vertex skin (about 1/7 of the touch skin), no caustic pass and a pooled set
// of meshes: splitting never allocates new GPU programs or geometry after the first.
let topology=null;
function smallTopology(){
 if(!topology){const g=new THREE.IcosahedronGeometry(1,7);g.deleteAttribute('normal');g.deleteAttribute('uv');const s=mergeVertices(g,1e-5);g.dispose();
  topology={unit:s.attributes.position.array.slice(),indices:s.index.array.slice()};s.dispose();}
 return topology;
}
function shadowTexture(){const cv=document.createElement('canvas');cv.width=cv.height=64;const c=cv.getContext('2d'),g=c.createRadialGradient(32,32,0,32,32,32);
 g.addColorStop(0,'rgba(255,255,255,1)');g.addColorStop(.5,'rgba(255,255,255,.45)');g.addColorStop(1,'rgba(255,255,255,0)');c.fillStyle=g;c.fillRect(0,0,64,64);return new THREE.CanvasTexture(cv);}
// Soft push between bodies on the floor plane. Held or fixed bodies do not move.
export function separate(items){
 const bumps=[];
 for(let i=0;i<items.length;i++)for(let j=i+1;j<items.length;j++){
  const a=items[i],b=items[j],dx=b.body.x-a.body.x,dz=(b.body.z-a.body.z)*1.25,d=Math.hypot(dx,dz),min=a.r+b.r;
  if(d>=min)continue;const nx=d>1e-4?dx/d:(i%2?1:-1),nz=d>1e-4?dz/d:0,overlap=min-d,wa=a.fixed?0:b.fixed?1:.5,wb=1-wa;
  const closing=(a.body.vx-b.body.vx)*nx+(a.body.vz-b.body.vz)*nz;
  a.body.x-=nx*overlap*wa;a.body.z-=nz*overlap*wa*.8;b.body.x+=nx*overlap*wb;b.body.z+=nz*overlap*wb*.8;
  if(closing>0){a.body.vx-=nx*closing*wa*1.2;a.body.vz-=nz*closing*wa*1.2;b.body.vx+=nx*closing*wb*1.2;b.body.vz+=nz*closing*wb*1.2;}
  if(closing>1.8)bumps.push({a,b,force:closing});
 }
 return bumps;
}
export function jellyBuddies(scene,camera,{onLand=()=>{}}={}){
 const pool=[],active=[],shade=shadowTexture(),ray=new THREE.Raycaster(),ndc=new THREE.Vector2(),minRadii=new THREE.Vector3(.04,.04,.04);
 function build(){
  const solver=createJelly(smallTopology()),group=new THREE.Group(),geometry=new THREE.BufferGeometry();
  geometry.setIndex(new THREE.BufferAttribute(solver.indices,1));
  geometry.setAttribute('position',new THREE.BufferAttribute(solver.position,3).setUsage(THREE.DynamicDrawUsage));geometry.setAttribute('jellyRest',new THREE.BufferAttribute(solver.unit,3));
  geometry.computeVertexNormals();geometry.computeBoundingBox();geometry.boundingSphere=new THREE.Sphere(new THREE.Vector3(0,1,0),6);
  // Double-sided: three.js then draws its back faces into the shared transmission
  // texture, so a room-mate stays visible through the main jelly in front of it.
  const {material,expression}=jellyMaterial(),mesh=new THREE.Mesh(geometry,material);material.side=THREE.DoubleSide;mesh.frustumCulled=false;group.add(mesh);
  const mixins=jellyMixins(group,solver,31+pool.length*17);
  const shadow=new THREE.Mesh(new THREE.PlaneGeometry(2.3,1.4),new THREE.MeshBasicMaterial({color:'#3a414b',alphaMap:shade,transparent:true,opacity:.3,depthWrite:false,toneMapped:false}));
  shadow.rotation.x=-Math.PI/2;shadow.position.y=-.011;
  const b={solver,group,geometry,mesh,material,expression,mixins,shadow,entry:null,paint:null,size:.72,target:.72,next:2,blinkAt:2,blinkUntil:0,happyUntil:0,acc:0,
   center:new THREE.Vector3(),radii:new THREE.Vector3(),eye:new THREE.Vector4(1,0,0,0)};
  mesh.userData.buddy=b;pool.push(b);return b;
 }
 function paint(b,p,instant=true){
  b.paint=p;b.material.color.set(p.color);b.material.attenuationColor.set(p.deep);b.expression.glow.value.set(p.glow);
  b.expression.rainbow.value=p.rainbow?1:0;b.material.iridescence=p.rainbow?.4:.2;
  b.expression.glitter.value=p.mix?.glitter?1:0;b.expression.glitterColor.value.set(p.glitterColor||'#fff6d8');
  b.mixins.setLook(p);if(p.feel)b.solver.feel(p.feel.spring,p.feel.damping);
  if(instant){b.size=b.target;b.solver.setSize(b.size);}
 }
 function add(entry,p,{x=0,z=0,y=0,size=.72}={}){
  const b=pool.find(x=>!active.includes(x))||build();b.entry=entry;b.target=size;b.size=size;
  b.solver.reset();b.solver.setSize(size);Object.assign(b.solver.body,{x,y,z});paint(b,p);
  b.next=1.5+Math.random()*3;b.happyUntil=0;scene.add(b.group,b.shadow);active.push(b);return b;
 }
 function remove(b){const i=active.indexOf(b);if(i<0)return;active.splice(i,1);scene.remove(b.group,b.shadow);b.entry=null;}
 const backRow=(main,bounds)=>Math.max(bounds.zMin+.2,Math.min(-.7,main.body.z-1.1));
 function hop(b,tx,tz,bounds){
  const s=b.solver,x=clamp(tx,-bounds.x,bounds.x),z=clamp(tz,bounds.zMin,bounds.zMax*.8),dx=x-s.body.x,dz=z-s.body.z,reach=Math.hypot(dx,dz),power=3.4+Math.min(4,reach)*.4;
  if(!s.jump(power))return false;const flight=2*power/26;s.body.vx=clamp(dx/flight*.8,-7,7);s.body.vz=clamp(dz/flight*.8,-7,7);return true;
 }
 function update(dt,{time,now,reduced,low,sleeping,bounds,main,avoid=0}){
  for(const b of active){
   const s=b.solver,body=s.body;Object.assign(s.bounds,bounds);
   const grounded=body.y<=s.groundHeight+.03;b.next-=dt;
   if(!sleeping&&!reduced&&grounded&&b.next<=0){
    b.next=2.4+Math.random()*3.6;const r=Math.random();
    if(r<.5)hop(b,(Math.random()*2-1)*bounds.x,backRow(main,bounds)-Math.random()*.5,bounds);
    else if(r<.75)hop(b,main.body.x+(body.x<main.body.x?-1.9:1.9),backRow(main,bounds),bounds);
    else if(s.jump(2.6))b.happyUntil=now+.6;
   }
   // A room-mate overlapping the main friend on screen drifts behind it, never in front.
   if(grounded&&Math.abs(body.x-main.body.x)<1.3*(b.size+(main.size||1))&&body.z>main.body.z-.9)body.vz=Math.min(body.vz,-1.6);
   if(avoid>0&&grounded){const d=Math.hypot(body.x,body.z);if(d<avoid){if(d<1e-3){body.x=avoid;body.z=0;}else{body.x*=avoid/d;body.z*=avoid/d;}}}
   // Quality governor: on low, room-mates step physics at half rate (same fixed-step result).
   b.acc+=dt;if(low&&b.acc<1/45)continue;const step=b.acc;b.acc=0;
   b.size+=(b.target-b.size)*Math.min(1,step*6);if(Math.abs(b.target-b.size)<1e-4)b.size=b.target;s.setSize(b.size);
   s.advance(step);
   for(const ev of s.events.splice(0))if(ev.type==='land'){b.happyUntil=now+.6;onLand(b,ev.force);}
   b.group.position.set(body.x,body.y,body.z);b.group.rotation.y+=((main.body.x-body.x)*.06-b.group.rotation.y)*Math.min(1,step*3);
   b.geometry.attributes.position.needsUpdate=true;b.geometry.computeVertexNormals();b.geometry.computeBoundingBox();
   b.geometry.boundingBox.getCenter(b.center);b.geometry.boundingBox.getSize(b.radii).multiplyScalar(.5);
   if(now>b.blinkAt&&!sleeping){b.blinkUntil=now+.16;b.blinkAt=now+2.2+Math.random()*3.4;}
   const open=now<b.blinkUntil?Math.abs((b.blinkUntil-now)/.08-1):1;
   b.expression.eye.value.lerp(b.eye.set(sleeping?1:open,now<b.happyUntil?1:0,Number(sleeping),body.vy<-3?1:0),Math.min(1,step*20));
   b.expression.squeeze.value+=(Number(s.squash<-.14&&!sleeping)-b.expression.squeeze.value)*Math.min(1,step*18);
   b.expression.look.value.set(clamp((main.body.x-body.x)*.012,-.036,.036),0);
   b.expression.time.value=time;b.expression.rippleStrength.value=0;
   if(b.paint?.rainbow&&!reduced)b.expression.filmPhase.value+=step*(Math.PI*2/5);
   // Low quality: single-sided room-mates skip the extra back-face transmission draw.
   const side=low?THREE.FrontSide:THREE.DoubleSide;if(b.material.side!==side){b.material.side=side;b.material.needsUpdate=true;}
   b.material.dispersion=low?0:.35;b.expression.auroraSamples.value=low?4:6;
   b.mixins.update(b.center,b.size,time,reduced);
   const spread=1/Math.sqrt(1+s.squash);b.shadow.position.set(body.x,-.011,body.z+.05);b.shadow.scale.set(b.size*spread*(1+body.y*.15),b.size*spread,1);b.shadow.material.opacity=.3/(1+body.y*.8);
  }
 }
 // Per-render optics inputs, after the camera has moved this frame.
 function prepare(){for(const b of active){b.mesh.updateWorldMatrix(true,false);b.expression.center.value.copy(b.center);b.expression.radii.value.copy(b.radii).max(minRadii);
  b.expression.localCamera.value.copy(camera.position);b.mesh.worldToLocal(b.expression.localCamera.value);}}
 function hit(x,y){if(!active.length)return null;ndc.set(x/innerWidth*2-1,1-y/innerHeight*2);ray.setFromCamera(ndc,camera);for(const b of active)b.group.updateMatrixWorld(true);
  const h=ray.intersectObjects(active.map(b=>b.mesh),false)[0];return h?{buddy:h.object.userData.buddy,distance:h.distance}:null;}
 return{add,remove,paint,update,prepare,hit,hop,get list(){return active;},pool};
}
