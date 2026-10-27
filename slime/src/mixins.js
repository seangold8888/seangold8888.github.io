import * as THREE from '../../kart3d/vendor/three.module.min.js';
// Beads, foam and star flakes suspended inside a jelly. They are opaque instanced
// pieces, so the transmission pass shows them refracted through the gel. Each piece
// rides an interior point between the body centre and one skin vertex: it squashes,
// stretches and wobbles with the body. Two draw calls per slime at most.
export const MIX_LIMITS=Object.freeze({beads:9,foam:16,stars:8});
const BEAD_COLORS=['#ff6f91','#ffc94d','#5ec8ff','#7be0a8','#b28cff','#ff9f43'];
const roundGeo=new THREE.SphereGeometry(1,12,8);
const starShape=new THREE.Shape();for(let i=0;i<10;i++){const a=Math.PI/2+i*Math.PI/5,r=i%2?.42:1,x=Math.cos(a)*r,y=Math.sin(a)*r;i?starShape.lineTo(x,y):starShape.moveTo(x,y);}starShape.closePath();
const starGeo=new THREE.ExtrudeGeometry(starShape,{depth:.35,bevelEnabled:false});starGeo.center();
const roundMat=new THREE.MeshStandardMaterial({roughness:.2,metalness:.04,emissive:'#ffffff',emissiveIntensity:.1});
const starMat=new THREE.MeshStandardMaterial({roughness:.28,metalness:.3,emissive:'#ffc93a',emissiveIntensity:.55});
function random(seed){let s=seed>>>0||1;return()=>{s=(s*1664525+1013904223)>>>0;return s/4294967296;};}
export function jellyMixins(parent,solver,seed=7){
 const N=solver.unit.length/3,rand=random(seed),unit=solver.unit;
 // Skip the flattened sole and the face front so pieces float in the clear middle.
 const pool=[];for(let i=0;i<N;i++){const y=unit[i*3+1],z=unit[i*3+2];if(y>-.55&&y<.86&&!(z>.55&&y>-.25&&y<.45))pool.push(i);}
 const pick=(n,lo,hi,s0,s1)=>Array.from({length:n},()=>({vertex:pool[Math.floor(rand()*pool.length)],depth:lo+rand()*(hi-lo),scale:s0+rand()*(s1-s0),phase:rand()*Math.PI*2,spin:new THREE.Euler(rand()*6,rand()*6,rand()*6)}));
 const slots={beads:pick(MIX_LIMITS.beads,.32,.7,.07,.095),foam:pick(MIX_LIMITS.foam,.45,.86,.022,.05),stars:pick(MIX_LIMITS.stars,.3,.78,.055,.075)};
 const round=new THREE.InstancedMesh(roundGeo,roundMat,MIX_LIMITS.beads+MIX_LIMITS.foam),stars=new THREE.InstancedMesh(starGeo,starMat,MIX_LIMITS.stars);
 round.frustumCulled=stars.frustumCulled=false;round.visible=stars.visible=false;round.count=stars.count=0;parent.add(round,stars);
 const color=new THREE.Color(),matrix=new THREE.Matrix4(),point=new THREE.Vector3(),scale=new THREE.Vector3(),turn=new THREE.Quaternion(),euler=new THREE.Euler();
 let active={beads:false,foam:false,stars:false},roundSlots=[];
 function setLook(look){
  active={beads:!!look?.mix?.beads,foam:!!look?.mix?.foam,stars:!!look?.mix?.stars};
  roundSlots=[...(active.beads?slots.beads.map((s,i)=>({...s,kind:'bead',color:(look.beadColors||BEAD_COLORS)[i%(look.beadColors||BEAD_COLORS).length]})):[]),
   ...(active.foam?slots.foam.map(s=>({...s,kind:'foam',color:'#ffffff'})):[])];
  roundSlots.forEach((s,i)=>round.setColorAt(i,color.set(s.color)));if(round.instanceColor)round.instanceColor.needsUpdate=true;
  for(let i=0;i<MIX_LIMITS.stars;i++)stars.setColorAt(i,color.set(i%3===2?'#ffffff':look?.starColor||'#ffd95e'));if(stars.instanceColor)stars.instanceColor.needsUpdate=true;
  round.count=roundSlots.length;stars.count=active.stars?MIX_LIMITS.stars:0;round.visible=round.count>0;stars.visible=stars.count>0;
 }
 function place(mesh,i,s,center,size,time,reduced,foam){
  const p=solver.position,v=s.vertex*3,drift=reduced?0:foam?Math.sin(time*.9+s.phase)*.06:Math.sin(time*.5+s.phase)*.025,t=Math.min(.9,s.depth+drift);
  point.set(center.x+(p[v]-center.x)*t,center.y+(p[v+1]-center.y)*t,center.z+(p[v+2]-center.z)*t);
  if(foam&&!reduced)point.y+=((time*.06+s.phase)%1)*.05*size;
  euler.set(s.spin.x+(reduced?0:time*.4),s.spin.y+(reduced?0:time*.55),s.spin.z);turn.setFromEuler(euler);
  scale.setScalar(s.scale*size);mesh.setMatrixAt(i,matrix.compose(point,turn,scale));
 }
 function update(center,size,time,reduced=false){
  if(round.visible){roundSlots.forEach((s,i)=>place(round,i,s,center,size,time,reduced,s.kind==='foam'));round.instanceMatrix.needsUpdate=true;}
  if(stars.visible){slots.stars.forEach((s,i)=>place(stars,i,s,center,size,time,reduced,false));stars.instanceMatrix.needsUpdate=true;}
 }
 return{setLook,update,round,stars,get active(){return{...active};},dispose(){parent.remove(round,stars);round.dispose();stars.dispose();}};
}
