import * as THREE from '../../kart3d/vendor/three.module.min.js';
import {clamp} from './physics.js?v=play-7';
export function jellyInput({canvas,solver,mesh,group,scene,camera,touch,bump,particles,jump,mood,happy,audio,time,petMode=()=>false,toyTap=()=>false,ripple=()=>{}}){
 const ray=new THREE.Raycaster(),ndc=new THREE.Vector2(),plane=new THREE.Plane(),floor=new THREE.Plane(new THREE.Vector3(0,1,0),0),point=new THREE.Vector3();
 const fingers=new Map(),trace=[];let grab=null,pinch=null,floorTap=null,hover=null,lastTap=null,petStroke=null,strokeLevel=0,wheelUntil=0,gestureBase=0,pointer={x:0,y:0,has:false};
 function log(type,detail){trace.push({type,t:performance.now()/1000,...detail});if(trace.length>16)trace.shift();}
 function aim(x,y){pointer={x,y,has:true};ndc.set(x/innerWidth*2-1,1-y/innerHeight*2);ray.setFromCamera(ndc,camera);}
 function hit(x,y){
  aim(x,y);scene.updateMatrixWorld(true);
  let h=ray.intersectObject(mesh,false)[0];
  // An exactly centred ray can fall numerically between shared triangle edges.
  // Sub-pixel retries stay within the displayed pixel, not a larger hit area.
  if(!h)for(const [dx,dy] of [[.35,0],[-.35,0],[0,.35],[0,-.35]]){
   ndc.set((x+dx)/innerWidth*2-1,1-(y+dy)/innerHeight*2);ray.setFromCamera(ndc,camera);
   h=ray.intersectObject(mesh,false)[0];if(h)break;
  }
  aim(x,y);return h;
 }
 function nearest(h){let best=0,d=Infinity;const p=mesh.worldToLocal(h.point.clone());for(const i of [h.face.a,h.face.b,h.face.c]){const n=i*3,v=Math.hypot(solver.position[n]-p.x,solver.position[n+1]-p.y,solver.position[n+2]-p.z);if(v<d){d=v;best=i;}}return best;}
 function physical(p){const v=group.worldToLocal(p.clone());return{x:v.x+solver.body.x,y:v.y+solver.body.y,z:v.z+solver.body.z};}
 function release(cancel=false){
  if(!grab)return;const g=grab;grab=null;if(cancel){solver.release();return;}
  const now=performance.now()/1000,last=g.samples.at(-1),first=g.samples.find(s=>last.t-s.t<=.11)||last,dt=Math.max(.03,last.t-first.t);
  const stale=now-last.t>.14;solver.release(stale?{x:0,y:0,z:0}:{x:(last.x-first.x)/dt,y:(last.y-first.y)/dt,z:(last.z-first.z)/dt});
  if(g.distance<9&&now-g.start<.45){
   if(lastTap&&now-lastTap.t<.34&&Math.hypot(g.x-lastTap.x,g.y-lastTap.y)<45){jump();lastTap=null;}
   else{solver.poke(g.vertex);ripple(g.vertex,1);bump();particles(g.x,g.y);happy(1.1);lastTap={t:now,x:g.x,y:g.y};mood('콕! 살살 쓰다듬으면 더 좋아해요.');}
  }else{audio.play('release',Math.max(.4,solver.state().maxDeformation));happy(.8);bump();mood('쭈욱, 탱글! 손을 놓으면 다시 돌아와요.');}
 }
 function hopTo(p){
  const dx=p.x-solver.body.x,dz=p.z-solver.body.z,reach=Math.hypot(dx,dz);if(reach>4.5)return;
  const power=4.2+reach*.35;if(!solver.jump(power))return;const flight=2*power/26;
  solver.body.vx=clamp(dx/flight*.8,-9,9);solver.body.vz=clamp(dz/flight*.8,-9,9);happy(.9);bump();mood('여기로 와! 바닥을 누르면 통통 따라와요.');
 }
 canvas.addEventListener('pointerdown',e=>{
  e.preventDefault();touch();canvas.focus({preventScroll:true});canvas.setPointerCapture(e.pointerId);
  if(!grab&&!pinch&&!petStroke&&toyTap(e.clientX,e.clientY))return;
  if(e.pointerType==='touch')fingers.set(e.pointerId,{x:e.clientX,y:e.clientY});
  if(fingers.size===2){release(true);petStroke=null;floorTap=null;const[a,b]=[...fingers.values()];pinch={distance:Math.max(1,Math.hypot(a.x-b.x,a.y-b.y))};return;}
  if(grab||pinch)return;const h=hit(e.clientX,e.clientY),now=performance.now()/1000;log('down',{id:e.pointerId,hit:!!h,x:e.clientX,y:e.clientY});
  if(!h){const p=ray.ray.intersectPlane(floor,new THREE.Vector3());if(p)floorTap={id:e.pointerId,x:e.clientX,y:e.clientY,start:now,p:{x:clamp(p.x,-solver.bounds.x,solver.bounds.x),z:clamp(p.z,solver.bounds.zMin,solver.bounds.zMax)}};return;}
  if(petMode()){petStroke={id:e.pointerId,x:e.clientX,y:e.clientY,poke:time()};happy(.7);return;}
  const vertex=nearest(h);plane.setFromNormalAndCoplanarPoint(camera.getWorldDirection(new THREE.Vector3()),h.point);
  const p=physical(h.point);solver.grab(vertex,p);grab={id:e.pointerId,vertex,x:e.clientX,y:e.clientY,start:now,distance:0,samples:[{...p,t:now}]};happy(1);canvas.style.cursor='grabbing';
 });
 canvas.addEventListener('pointermove',e=>{
  if(fingers.has(e.pointerId))fingers.set(e.pointerId,{x:e.clientX,y:e.clientY});
  if(pinch&&fingers.size===2){const[a,b]=[...fingers.values()];solver.stretch((Math.hypot(a.x-b.x,a.y-b.y)/pinch.distance-1)*.8);touch();return;}
  if(petStroke&&petStroke.id===e.pointerId){
   const h=hit(e.clientX,e.clientY),distance=Math.hypot(e.clientX-petStroke.x,e.clientY-petStroke.y);
   if(h&&distance>1&&distance<100){touch();happy(1);strokeLevel+=distance/85;
    if(time()-petStroke.poke>.12){const i=nearest(h);solver.poke(i,.08);ripple(i,.35);petStroke.poke=time();}
    if(strokeLevel>=1){strokeLevel=0;bump();particles(e.clientX,e.clientY);audio.play('pet');mood('좋아! 살살 쓰다듬어 주니 볼이 발그레해요.');}}
   petStroke.x=e.clientX;petStroke.y=e.clientY;return;
  }
  if(grab&&grab.id===e.pointerId){
   aim(e.clientX,e.clientY);const p=ray.ray.intersectPlane(plane,point);
   if(p){const v=physical(p);solver.move(v);grab.distance=Math.max(grab.distance,Math.hypot(e.clientX-grab.x,e.clientY-grab.y));grab.samples.push({...v,t:performance.now()/1000});if(grab.samples.length>20)grab.samples.shift();}touch();return;
  }
  if(floorTap&&Math.hypot(e.clientX-floorTap.x,e.clientY-floorTap.y)>12)floorTap=null;
  const h=hit(e.clientX,e.clientY);canvas.style.cursor=h?'grab':'';
  if(h&&e.pointerType==='mouse'&&hover){
   const distance=Math.hypot(e.clientX-hover.x,e.clientY-hover.y);
   if(distance<65&&distance>2){touch();strokeLevel+=distance/110;happy(.65);if(time()-hover.poke>.12){const i=nearest(h);solver.poke(i,.09);ripple(i,.35);hover.poke=time();}
    if(strokeLevel>1){strokeLevel=0;bump();particles(e.clientX,e.clientY);audio.play('pet');mood('살살 쓰다듬어 주니 기분이 좋아졌어요.');}}
  }
  hover={x:e.clientX,y:e.clientY,poke:hover?.poke??time()};
 });
 function end(e){
  log(e.type,{id:e.pointerId});
  fingers.delete(e.pointerId);if(petStroke?.id===e.pointerId)petStroke=null;if(pinch){solver.stretch(0);if(!fingers.size)pinch=null;floorTap=null;return;}
  if(grab&&grab.id===e.pointerId)release(e.type!=='pointerup');
  if(floorTap&&floorTap.id===e.pointerId){if(e.type==='pointerup'&&performance.now()/1000-floorTap.start<.5)hopTo(floorTap.p);floorTap=null;}canvas.style.cursor='';
 }
 for(const name of ['pointerup','pointercancel','lostpointercapture'])canvas.addEventListener(name,end);
 canvas.addEventListener('pointerleave',()=>{if(!grab)pointer.has=false;hover=null;});canvas.addEventListener('contextmenu',e=>e.preventDefault());
 canvas.addEventListener('wheel',e=>{
  e.preventDefault();touch();if(grab||fingers.size)return;
  if(e.ctrlKey){solver.stretch(clamp(solver.squash-e.deltaY*.008,-.45,.8));wheelUntil=time()+.22;happy(.5);}
  else{const h=hit(e.clientX,e.clientY);if(h){solver.poke(nearest(h),Math.min(1.2,Math.abs(e.deltaY)*.01));happy(.5);}}
 },{passive:false});
 canvas.addEventListener('gesturestart',e=>{e.preventDefault();gestureBase=solver.squash;},{passive:false});
 canvas.addEventListener('gesturechange',e=>{e.preventDefault();if(fingers.size>1)return;touch();solver.stretch(gestureBase+(e.scale-1)*.8);wheelUntil=time()+.22;},{passive:false});
 canvas.addEventListener('gestureend',e=>{e.preventDefault();wheelUntil=0;if(!pinch)solver.stretch(0);},{passive:false});
 function update(){
  // Include still-held frames in fling sampling: pausing before release is not a throw.
  if(grab){const last=grab.samples.at(-1);grab.samples.push({...last,t:performance.now()/1000});if(grab.samples.length>30)grab.samples.shift();}
  if(wheelUntil&&time()>wheelUntil){wheelUntil=0;solver.stretch(0);}
 }
 function cancel(){log('cancel',{});release(true);fingers.clear();pinch=floorTap=hover=lastTap=petStroke=null;wheelUntil=0;solver.stretch(0);pointer.has=false;canvas.style.cursor='';}
 return{cancel,update,hopTo,get pointer(){return pointer;},state:()=>({pointers:fingers.size,grab:!!grab,petting:!!petStroke,pinch:!!pinch||wheelUntil>0,strokeLevel}),trace:()=>trace.slice(),probe:(x,y)=>!!hit(x,y)};
}
