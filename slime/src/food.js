import * as THREE from '../../kart3d/vendor/three.module.min.js';
// Snacks fall onto the active friend, are swallowed and stay visible inside the gel
// for a moment (opaque, so the transmission pass refracts them) before dissolving.
export const FOODS=[
 {id:'water',name:'물방울',icon:'💧',color:'#6fcfff',spark:'#8fdcff'},
 {id:'berry',name:'딸기',icon:'🍓',color:'#ff4d6d',spark:'#ff7c98'},
 {id:'candy',name:'별사탕',icon:'⭐',color:'#ffd23f',spark:'#ffd23f'},
 {id:'honey',name:'꿀',icon:'🍯',color:'#f4a823',spark:'#ffc24d'}
];
const MAX_IN_FLIGHT=3;
function model(id){
 const g=new THREE.Group(),std=(color,o={})=>new THREE.MeshStandardMaterial({color,roughness:.25,...o});
 if(id==='water'){const m=new THREE.Mesh(new THREE.LatheGeometry([0,.08,.14,.165,.15,.1,0].map((r,i)=>new THREE.Vector2(r,.19-i*.06)).reverse(),18),std('#6fcfff',{roughness:.05,metalness:.1,emissive:'#1d6f9c',emissiveIntensity:.25}));g.add(m);}
 else if(id==='berry'){const m=new THREE.Mesh(new THREE.SphereGeometry(.16,16,12),std('#ff4d6d'));m.scale.set(1,1.15,1);g.add(m);
  const leaf=std('#4fbf5a');for(let i=0;i<4;i++){const l=new THREE.Mesh(new THREE.ConeGeometry(.05,.13,4),leaf);const a=i*Math.PI/2;l.position.set(Math.cos(a)*.06,.17,Math.sin(a)*.06);l.rotation.set(Math.sin(a)*1.2,0,-Math.cos(a)*1.2);g.add(l);}
  const seed=std('#fff1a6');for(let i=0;i<7;i++){const s=new THREE.Mesh(new THREE.SphereGeometry(.014,6,4),seed);const a=i*2.4,y=-.1+i*.03;s.position.set(Math.cos(a)*.155,y,Math.sin(a)*.155);g.add(s);}}
 else if(id==='candy'){const m=new THREE.Mesh(new THREE.IcosahedronGeometry(.15,0),std('#ffd23f',{emissive:'#a86b00',emissiveIntensity:.15}));g.add(m);
  const spike=std('#ffe680');for(const v of [[1,0,0],[-1,0,0],[0,1,0],[0,-1,0],[0,0,1],[0,0,-1]]){const s=new THREE.Mesh(new THREE.SphereGeometry(.055,8,6),spike);s.position.set(v[0]*.14,v[1]*.14,v[2]*.14);g.add(s);}}
 else{const m=new THREE.Mesh(new THREE.SphereGeometry(.15,16,12),std('#f4a823',{roughness:.08,emissive:'#7a4700',emissiveIntensity:.2}));m.scale.set(1.1,.9,1.1);g.add(m);
  const top=new THREE.Mesh(new THREE.SphereGeometry(.07,10,8),std('#ffd27a',{roughness:.1}));top.position.set(-.05,.08,.08);g.add(top);}
 return g;
}
export function jellyFood(scene){
 const items=[],models={};
 function get(id){models[id]??=[];let g=models[id].find(m=>!m.visible);if(!g){g=model(id);g.visible=false;scene.add(g);models[id].push(g);}return g;}
 function drop(id,body,top){
  if(!FOODS.some(f=>f.id===id)||items.length>=MAX_IN_FLIGHT)return false;
  const g=get(id);g.visible=true;g.scale.setScalar(1);g.position.set(body.x+(Math.random()-.5)*.3,Math.max(top+2.8,4.2),body.z+.3);g.rotation.set(0,Math.random()*6,0);
  items.push({id,g,state:'fall',vy:0,t:0});return true;
 }
 // target(): {x,y,z,top,size} of the active friend this frame. Returns swallowed snacks.
 function update(dt,target,reduced){
  const eaten=[];
  for(let i=items.length-1;i>=0;i--){const it=items[i],g=it.g,t=target();
   if(it.state==='fall'){
    it.vy-=16*dt;g.position.y+=it.vy*dt;const k=Math.min(1,dt*7);g.position.x+=(t.x-g.position.x)*k;g.position.z+=(t.z+.25*t.size-g.position.z)*k;
    if(!reduced)g.rotation.y+=dt*4;
    if(g.position.y<=t.top-.05){it.state='inside';it.t=0;eaten.push(it.id);}
   }else{
    it.t+=dt;const k=Math.min(1,dt*5);g.position.x+=(t.x-g.position.x)*k;g.position.z+=(t.z+.2*t.size-g.position.z)*k;g.position.y+=(t.y+.95*t.size-g.position.y)*k;
    g.scale.setScalar(Math.max(.001,1-it.t/1.1));if(!reduced)g.rotation.y+=dt*2;
    if(it.t>1.1){g.visible=false;items.splice(i,1);}
   }
  }
  return eaten;
 }
 function clear(){for(const it of items)it.g.visible=false;items.length=0;}
 return{drop,update,clear,get inFlight(){return items.length;}};
}
