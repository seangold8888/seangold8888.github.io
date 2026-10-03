import * as THREE from '../../kart3d/vendor/three.module.min.js';
import {jellyBubbleMaterial} from './bubble-material.js?v=bubbles-10';
// Fixed pools and shared geometry: no per-frame allocations or extra render pass.
export function jellyToys(scene,camera,solver,onPlay){
 const root=new THREE.Group();scene.add(root);const ray=new THREE.Raycaster(),pointer=new THREE.Vector2();let mode='none',hits=0,cooldown=0;
 const bubbleGeo=new THREE.SphereGeometry(.28,24,16),bubbleMat=jellyBubbleMaterial();
 const bubbles=Array.from({length:6},(_,i)=>{const m=new THREE.Mesh(bubbleGeo,bubbleMat);m.userData.index=i;root.add(m);return m;});
 const ball=new THREE.Mesh(new THREE.SphereGeometry(.27,20,12),new THREE.MeshStandardMaterial({color:'#ffa0ca',roughness:.3}));root.add(ball);
 const stripe=new THREE.Mesh(new THREE.TorusGeometry(.272,.025,6,24),new THREE.MeshStandardMaterial({color:'#fff1b8'}));ball.add(stripe);
 const starShape=new THREE.Shape();for(let i=0;i<10;i++){const a=Math.PI/2+i*Math.PI/5,r=i%2?.10:.23,x=Math.cos(a)*r,y=Math.sin(a)*r;i?starShape.lineTo(x,y):starShape.moveTo(x,y);}starShape.closePath();
 const starGeo=new THREE.ExtrudeGeometry(starShape,{depth:.07,bevelEnabled:true,bevelSegments:2,steps:1,bevelSize:.025,bevelThickness:.025});
 const starMat=new THREE.MeshStandardMaterial({color:'#ffce61',emissive:'#b36a13',emissiveIntensity:.18,metalness:.25,roughness:.28});
 const stars=Array.from({length:5},(_,i)=>{const m=new THREE.Mesh(starGeo,starMat);m.userData={index:i,collected:false};root.add(m);return m;});
 const bellGeo=new THREE.LatheGeometry([new THREE.Vector2(.01,.38),new THREE.Vector2(.06,.38),new THREE.Vector2(.12,.32),new THREE.Vector2(.14,.13),new THREE.Vector2(.22,.02),new THREE.Vector2(.23,0)],24);
 const bellColors=['#f19db7','#f4cc77','#8bd3ba','#87bfe7','#b7a0e2'],bellTrim=new THREE.MeshStandardMaterial({color:'#f8e6b7',metalness:.3,roughness:.3});
 const bells=bellColors.map((color,i)=>{const m=new THREE.Mesh(bellGeo,new THREE.MeshStandardMaterial({color,metalness:.25,roughness:.25,side:THREE.DoubleSide}));m.userData={index:i,pulse:0};
  const handle=new THREE.Mesh(new THREE.TorusGeometry(.065,.018,6,16),bellTrim);handle.position.y=.43;m.add(handle);const clapper=new THREE.Mesh(new THREE.SphereGeometry(.05,10,8),bellTrim);clapper.position.y=.015;m.add(clapper);root.add(m);return m;});
 const trampoline=new THREE.Group();const bed=new THREE.Mesh(new THREE.CylinderGeometry(1.63,1.63,.10,40),new THREE.MeshStandardMaterial({color:'#355e82',roughness:.72}));bed.position.y=.27;trampoline.add(bed);
 const rim=new THREE.Mesh(new THREE.TorusGeometry(1.7,.11,10,48),new THREE.MeshStandardMaterial({color:'#ef83b6',roughness:.35}));rim.rotation.x=Math.PI/2;rim.position.y=.30;trampoline.add(rim);
 const legMat=new THREE.MeshStandardMaterial({color:'#8094ab',metalness:.45,roughness:.4});
 const transform=new THREE.Object3D(),legs=new THREE.InstancedMesh(new THREE.CylinderGeometry(.065,.075,.26,8),legMat,6);
 for(let i=0;i<6;i++){const a=i*Math.PI/3;transform.position.set(Math.cos(a)*1.43,.13,Math.sin(a)*1.43);transform.updateMatrix();legs.setMatrixAt(i,transform.matrix);}trampoline.add(legs);
 const springMat=new THREE.MeshStandardMaterial({color:'#e4eaf0',metalness:.3,roughness:.4});
 const springs=new THREE.InstancedMesh(new THREE.BoxGeometry(.14,.025,.04),springMat,16);
 for(let i=0;i<16;i++){const a=i*Math.PI/8;transform.position.set(Math.cos(a)*1.60,.326,Math.sin(a)*1.60);transform.rotation.y=-a;transform.updateMatrix();springs.setMatrixAt(i,transform.matrix);}trampoline.add(springs);root.add(trampoline);
 let bx=0,bz=0,bvx=0,bvz=0,by=.27,bvy=0;
 function choose(id){mode=['none','bubbles','ball','trampoline','stars','music'].includes(id)?id:'none';hits=0;cooldown=0;bx=solver.bounds.x*.65;bz=.75;bvx=bvz=bvy=0;by=.27;
  bubbles.forEach(m=>{m.visible=mode==='bubbles';m.userData.cooldown=0;});ball.visible=mode==='ball';trampoline.visible=mode==='trampoline';
  stars.forEach(m=>{m.visible=mode==='stars';m.userData.collected=false;});bells.forEach(m=>{m.visible=mode==='music';m.userData.pulse=0;m.scale.setScalar(1);});
  if(mode==='trampoline'){solver.body.x=solver.body.z=0;solver.setGround(.32);}else solver.setGround(0);}
 function reward(kind,note){hits++;onPlay(kind,hits,note);}
 function tap(x,y){if(mode==='none')return false;pointer.set(x/innerWidth*2-1,1-y/innerHeight*2);ray.setFromCamera(pointer,camera);root.updateMatrixWorld(true);
  const objects=mode==='bubbles'?bubbles.filter(m=>m.visible):mode==='ball'?[ball]:mode==='stars'?stars.filter(m=>m.visible):mode==='music'?bells:[bed,rim],hit=ray.intersectObjects(objects,false)[0];if(!hit)return false;
  if(mode==='bubbles'){hit.object.visible=false;hit.object.userData.cooldown=2.2;reward('bubble');}
  else if(mode==='stars'){hit.object.userData.collected=true;hit.object.visible=false;solver.poke(0,.12);reward('star');}
  else if(mode==='music'){hit.object.userData.pulse=.35;solver.poke(0,.1);reward('note',hit.object.userData.index);}
  else if(mode==='ball'){const dx=solver.body.x-bx,dz=solver.body.z-bz,len=Math.hypot(dx,dz)||1;bvx=dx/len*3.6;bvz=dz/len*3.6;bvy=3;reward('ball');}
  else{solver.body.x=0;solver.body.z=0;solver.setGround(.32);if(solver.jump(8.2))reward('trampoline');}return true;
 }
 function update(dt,time,held,sleeping,reduced){cooldown=Math.max(0,cooldown-dt);
  if(mode==='stars'||mode==='music'){const spread=Math.min(solver.bounds.x+.50,1.65),pool=mode==='stars'?stars:bells;
   const short=innerHeight<500&&innerWidth>=700;
   pool.forEach((m,i)=>{const x=i===4?0:(i%2?1:-1)*spread,y=i===4?2.7:(short?1.05:.45)+Math.floor(i/2)*(short?.9:1.1);
    m.position.set(x,y+(reduced||sleeping?0:Math.sin(time*.8+i)*.035),.9);m.userData.pulse=Math.max(0,(m.userData.pulse||0)-dt);
    m.rotation.z=reduced?0:mode==='music'?Math.sin(m.userData.pulse*45)*m.userData.pulse*.3:Math.sin(time*.5+i)*.09;
    m.scale.setScalar(reduced?1:1+m.userData.pulse*.12);});}
  if(mode==='bubbles')bubbles.forEach((m,i)=>{m.userData.cooldown=Math.max(0,m.userData.cooldown-dt);m.visible=m.userData.cooldown===0;const side=i%2?1:-1,spread=Math.min(solver.bounds.x+.50,1.65),short=innerHeight<500&&innerWidth>=700;
   m.position.set(side*spread,(short?1.08:.45)+(i%3)*(short?.98:.78)+(reduced?0:Math.sin(time*.65+i)*.05),.95+Math.sin(i*2)*.12);
   const pixelsPerUnit=innerHeight/(2*Math.tan(camera.fov*Math.PI/360)*camera.position.distanceTo(m.position));
   m.scale.setScalar(Math.min(1.6,Math.max(1,24/(.28*pixelsPerUnit))));});
  if(mode==='ball'){
   bvx*=Math.exp(-dt*1.4);bvz*=Math.exp(-dt*1.4);bx+=bvx*dt;bz+=bvz*dt;bvy-=12*dt;by+=bvy*dt;if(by<.27){by=.27;bvy=Math.abs(bvy)>.7?-bvy*.5:0;}
   const edge=Math.max(.35,solver.bounds.x+.7);if(Math.abs(bx)>edge){bx=Math.sign(bx)*edge;bvx*=-.7;}if(bz>2.2||bz<-1.4){bz=Math.max(-1.4,Math.min(2.2,bz));bvz*=-.7;}
   ball.position.set(bx,by,bz);ball.rotation.z-=bvx*dt*2;ball.rotation.x+=bvz*dt*2;
   const dx=bx-solver.body.x,dz=bz-solver.body.z,len=Math.hypot(dx,dz);
   if(!held&&!sleeping&&cooldown===0&&len<1.4&&solver.body.y<.1){cooldown=.8;const nx=dx/(len||1),nz=dz/(len||1);bx=solver.body.x+nx*1.45;bz=solver.body.z+nz*1.45;bvx=nx*3.2;bvz=nz*3.2;bvy=2.4;solver.poke(0,.2);reward('ball');}
  }
  if(mode==='trampoline'){trampoline.position.set(0,0,0);bed.scale.y=1+Math.min(.15,Math.abs(solver.squash)*.15);const onBed=Math.hypot(solver.body.x,solver.body.z)<1.2;
   solver.setGround(onBed?.32:0);
   if(!held&&!sleeping&&!reduced&&cooldown===0&&onBed&&solver.body.y<solver.groundHeight+.035&&solver.body.vy<=0){cooldown=.9;if(solver.jump(8.2))reward('trampoline');}}
 }
 choose('none');return{choose,tap,update,state:()=>({mode,hits,pool:mode==='stars'||mode==='music'?5:6}),root,ball,bubbles,trampoline,stars,bells};
}
