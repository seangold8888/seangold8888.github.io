import * as THREE from '../../kart3d/vendor/three.module.min.js';
import {createJelly,clamp} from './physics.js?v=play-7';
import {jellyTopology} from './geometry.js?v=5';
import {jellyMaterial,FLAVORS as flavors} from './material.js?v=rainbow-16';
import {jellyStage} from './stage.js?v=play-7';
import {jellyInput} from './input.js?v=play-7';
import {jellyAudio} from './audio.js?v=playroom-9';
import {createFriend,FEELS,ORNAMENTS,ACCESSORY_COLORS} from './friend.js?v=playroom-9';
import {jellyToys} from './toys.js?v=bubbles-10';
import {jellyCaustics} from './caustics.js?v=visual-1';
import {visualQuality} from '../../assets/effects/quality.js?v=visual-1';
const $=id=>document.getElementById(id),canvas=$('jelly'),coarse=matchMedia('(pointer:coarse)').matches;
const reduced=()=>matchMedia('(prefers-reduced-motion:reduce)').matches;
let friendStorage;try{friendStorage=localStorage;}catch{}
const friend=createFriend(friendStorage);let petMode=false,rippleIndex=0;
const quality=visualQuality({forcedLow:new URLSearchParams(location.search).get('quality')==='low'});
let renderer;
try{renderer=new THREE.WebGLRenderer({canvas,antialias:true,powerPreference:'high-performance'});}catch(error){$('fallback').hidden=false;throw error;}
renderer.outputColorSpace=THREE.SRGBColorSpace;renderer.toneMapping=THREE.NeutralToneMapping;renderer.toneMappingExposure=1;renderer.transmissionResolutionScale=.75;
const scene=new THREE.Scene();scene.background=new THREE.Color('#eeefeb');
const camera=new THREE.PerspectiveCamera(30,1,.1,150),viewTarget=new THREE.Vector3(),baseCamera=new THREE.Vector3();
const solver=createJelly(jellyTopology(coarse)),audio=jellyAudio(),stage=jellyStage(renderer,scene,camera);
const group=new THREE.Group();scene.add(group);
const geometry=new THREE.BufferGeometry();geometry.setIndex(new THREE.BufferAttribute(solver.indices,1));
geometry.setAttribute('position',new THREE.BufferAttribute(solver.position,3).setUsage(THREE.DynamicDrawUsage));geometry.setAttribute('jellyRest',new THREE.BufferAttribute(solver.unit,3));
geometry.computeVertexNormals();geometry.boundingSphere=new THREE.Sphere(new THREE.Vector3(0,1,0),6);
const{material,expression}=jellyMaterial(),mesh=new THREE.Mesh(geometry,material);mesh.frustumCulled=false;group.add(mesh);
const caustics=jellyCaustics(renderer,mesh,coarse);
const ornament=new THREE.Group(),ornamentCenter=new THREE.Vector3();group.add(ornament);
const bowMaterial=new THREE.MeshStandardMaterial({color:'#f582b1',roughness:.3});
const bow=new THREE.Group();for(const side of [-1,1]){const wing=new THREE.Mesh(new THREE.SphereGeometry(.14,12,8),bowMaterial);wing.scale.set(1,.64,.38);wing.position.x=side*.12;wing.rotation.z=side*.22;bow.add(wing);}
bow.add(new THREE.Mesh(new THREE.SphereGeometry(.055,10,8),new THREE.MeshStandardMaterial({color:'#ffcfdf'})));ornament.add(bow);
const hat=new THREE.Group();const cone=new THREE.Mesh(new THREE.ConeGeometry(.24,.46,20),new THREE.MeshStandardMaterial({color:'#8278ed',roughness:.3}));cone.position.y=.23;hat.add(cone);
const hatStar=new THREE.Mesh(new THREE.OctahedronGeometry(.065),new THREE.MeshStandardMaterial({color:'#ffe493',metalness:.15,roughness:.3}));hatStar.position.y=.49;hat.add(hatStar);ornament.add(hat);
const flower=new THREE.Group(),petalMat=new THREE.MeshStandardMaterial({color:'#fff0ad',roughness:.32}),petalGeo=new THREE.SphereGeometry(.09,12,8);
for(let i=0;i<6;i++){const a=i*Math.PI/3,p=new THREE.Mesh(petalGeo,petalMat);p.position.set(Math.cos(a)*.13,Math.sin(a)*.13+.14,.025);p.scale.set(1,.8,.38);flower.add(p);}
const pollen=new THREE.Mesh(new THREE.SphereGeometry(.067,12,8),new THREE.MeshStandardMaterial({color:'#f6b364',roughness:.4}));pollen.position.set(0,.14,.065);flower.add(pollen);flower.rotation.z=-.2;ornament.add(flower);
const cat=new THREE.Group(),earMat=new THREE.MeshStandardMaterial({color:'#cbc4ed',roughness:.38}),innerMat=new THREE.MeshStandardMaterial({color:'#ffd4de',roughness:.45});
for(const side of [-1,1]){const ear=new THREE.Mesh(new THREE.ConeGeometry(.15,.30,3),earMat);ear.scale.z=.42;ear.position.set(side*.29,.12,0);ear.rotation.z=side*-.18;cat.add(ear);
 const inner=new THREE.Mesh(new THREE.ConeGeometry(.08,.19,3),innerMat);inner.scale.z=.24;inner.position.copy(ear.position);inner.position.z=.055;inner.rotation.copy(ear.rotation);cat.add(inner);}ornament.add(cat);
const crown=new THREE.Group(),goldMat=new THREE.MeshStandardMaterial({color:'#ebbf60',metalness:.55,roughness:.26}),gemMat=new THREE.MeshStandardMaterial({color:'#ed91ba',metalness:.15,roughness:.15});
const band=new THREE.Mesh(new THREE.TorusGeometry(.22,.035,8,28),goldMat);band.rotation.x=Math.PI/2;band.position.y=.035;crown.add(band);
for(let i=0;i<5;i++){const a=i*Math.PI*2/5,tooth=new THREE.Mesh(new THREE.ConeGeometry(.065,.18,4),goldMat);tooth.position.set(Math.sin(a)*.20,.12,Math.cos(a)*.20);crown.add(tooth);const gem=new THREE.Mesh(new THREE.SphereGeometry(.027,8,6),gemMat);gem.position.set(Math.sin(a)*.225,.08,Math.cos(a)*.225);crown.add(gem);}ornament.add(crown);
const decorations={ribbon:bow,hat,flower,cat,crown},tintable=[bowMaterial,cone.material,petalMat,earMat,gemMat],originalTints=tintable.map(m=>m.color.clone());
function paintFriend(){
 $('room-title').textContent=friend.data.name+'의 놀이방';$('friend-name').value=friend.data.name;document.querySelector('.eyebrow').textContent=friend.data.name+' · 나의 젤리 친구';
 const next=ORNAMENTS.find(x=>x.need>friend.data.affection);$('friend-progress').textContent='함께 논 마음 '+friend.data.affection+' · '+(next?'마음 '+next.need+'개면 '+next.name+' 선물!':'선물을 모두 받았어요!');
 for(const [id,obj] of Object.entries(decorations))obj.visible=friend.data.ornament===id;
 const color=ACCESSORY_COLORS[friend.data.accessoryColor].color;tintable.forEach((m,i)=>color?m.color.set(color):m.color.copy(originalTints[i]));
 for(const [i,b] of [...$('accessory-colors').children].entries())b.setAttribute('aria-pressed',String(friend.data.accessoryColor===i));
 for(const b of $('ornaments').children){const item=ORNAMENTS.find(x=>x.id===b.dataset.ornament);b.disabled=friend.data.affection<item.need;b.setAttribute('aria-pressed',String(friend.data.ornament===item.id));b.textContent=item.name+(b.disabled?' · 마음 '+item.need:'');}
}
ORNAMENTS.forEach(item=>{const b=document.createElement('button');b.type='button';b.dataset.ornament=item.id;b.addEventListener('click',()=>{if(friend.dress(item.id)){paintFriend();$('playroom').close();mood('잘 어울려! '+friend.data.name+'의 '+item.name+'예요.');}});$('ornaments').append(b);});
ACCESSORY_COLORS.forEach((item,i)=>{const b=document.createElement('button');b.type='button';b.className='accessory-color';b.setAttribute('aria-label','장식 '+item.name);b.dataset.color=i;
 const swatch=document.createElement('span');swatch.style.background=item.color||'linear-gradient(135deg,#f8cb7e,#bba6ed)';swatch.setAttribute('aria-hidden','true');b.append(swatch,document.createTextNode(item.name));
 b.addEventListener('click',()=>{friend.tint(i);paintFriend();});$('accessory-colors').append(b);});
paintFriend();
function applyVisualQuality(){
 renderer.transmissionResolutionScale=quality.low?.5:.75;
 material.dispersion=quality.low?0:.35;
 caustics.setLowQuality(quality.low);
 const button=$('quality');button.textContent=quality.low?'가벼운 화면 ✓':'가볍게 보기';button.setAttribute('aria-pressed',String(quality.low));
}
applyVisualQuality();
let opticsEnabled=new URLSearchParams(location.search).get('optics')!=='basic';
function setOptics(value){opticsEnabled=!!value;expression.optics.value=Number(opticsEnabled);caustics.setEnabled(opticsEnabled);stage.setCaustics(caustics,opticsEnabled);}
setOptics(opticsEnabled);
const bubbles=[],bubbleGeometry=new THREE.SphereGeometry(1,10,6),bubbleMaterial=new THREE.MeshPhysicalMaterial({color:'#ffffff',roughness:.05,transparent:true,opacity:.22,depthWrite:false});
for(let i=0;i<12;i++){const b=new THREE.Mesh(bubbleGeometry,bubbleMaterial);b.scale.setScalar(.018+i%3*.007);b.userData={phase:i/12,angle:i*2.4};group.add(b);bubbles.push(b);}
let flavorIndex=0,count=0,time=0,qaMoodOffset=0,happyUntil=0,surpriseUntil=0,squeezeUntil=0,blinkUntil=0,sleeping=false,contextLost=false;
// Expressions use elapsed real seconds; a slow GPU must not prolong a wink.
const moodClock=()=>performance.now()/1000+qaMoodOffset;
let lastTouch=moodClock(),blinkAt=lastTouch+3,autoAt=lastTouch+6,zAt=lastTouch+20;
const targetColor=new THREE.Color(flavors[0].color),targetDeep=new THREE.Color(flavors[0].deep),targetGlow=new THREE.Color(flavors[0].glow);
const mood=text=>{$('mood').textContent=text;};
function paintSound(){$('sound').textContent=audio.enabled?'♫ 소리 켜짐':'♪ 소리 꺼짐';$('sound').setAttribute('aria-pressed',String(audio.enabled));}
paintSound();$('sound').addEventListener('click',()=>{audio.toggle();paintSound();touch();});
function bump(){count++;$('count').textContent=count;$('count').classList.remove('bump');void $('count').offsetWidth;$('count').classList.add('bump');if(count>=3)$('hints').classList.add('dim');
 const unlocked=friend.reward(moodClock());paintFriend();if(unlocked.length){audio.play('unlock');setTimeout(()=>mood(unlocked[0].name+' 선물을 받았어요! 놀이 · 꾸미기에서 골라요.'),0);}}
function touch(){const now=moodClock();if(sleeping){solver.jump(3.6);surpriseUntil=now+.8;audio.play('wake');}lastTouch=now;autoAt=now+6+Math.random()*2;sleeping=false;audio.unlock();audio.wake();}
function particles(x,y,kind='heart'){
 if(reduced())return;
 for(let i=0;i<(kind==='sleep'?1:4);i++){const e=document.createElement('span');e.className=kind==='sleep'?'sleep-z':'heart';e.textContent=kind==='sleep'?'z':i%2?'✦':'♥';
 e.style.cssText='--x:'+x+'px;--y:'+y+'px;--s:'+(kind==='sleep'?24:16+Math.random()*9)+'px;--color:'+(kind==='sleep'?'#8796a1':i%2?flavors[flavorIndex].deep:'#ea70a0')+';--dx:'+((Math.random()-.5)*95)+'px;--r:'+((Math.random()-.5)*40)+'deg';
 $('particles').append(e);e.addEventListener('animationend',()=>e.remove(),{once:true});}
}
function screen(){scene.updateMatrixWorld(true);const p=new THREE.Vector3(0,.93,.65).applyMatrix4(group.matrixWorld).project(camera);return{x:(p.x*.5+.5)*innerWidth,y:(-.5*p.y+.5)*innerHeight};}
function ripple(vertex,power=1){if(reduced())return;const n=vertex*3,v=expression.ripples.value[rippleIndex];v.set(solver.unit[n],solver.unit[n+1],solver.unit[n+2],time);expression.ripplePower.value.setComponent(rippleIndex,power);rippleIndex=(rippleIndex+1)%4;}
function setFeel(i){const f=FEELS[i];solver.feel(f.spring,f.damping);audio.feel(f.pitch);}
function flavor(i){
 if(i<0||i>=flavors.length)return;touch();if(flavorIndex===i){solver.body.vx+=(Math.random()-.5)*2;return;}
 flavorIndex=i;friend.flavor(i);setFeel(i);const f=flavors[i];targetColor.set(f.color);targetDeep.set(f.deep);targetGlow.set(f.glow);
 document.documentElement.style.setProperty('--accent',f.id==='aurora'?'#8a6ce0':f.deep);document.documentElement.style.setProperty('--tint',f.color);
 [...$('palette').children].forEach((b,j)=>b.setAttribute('aria-pressed',String(i===j)));happyUntil=moodClock()+1.3;solver.jump(3.8);audio.play('flavor');const p=screen();particles(p.x,p.y);mood(FEELS[i].label+'! 색마다 촉감과 목소리가 달라요.');
}
flavors.forEach((f,i)=>{const b=document.createElement('button');b.type='button';b.className='flavor';b.setAttribute('aria-label',f.name+' 색 선택');b.setAttribute('aria-pressed',String(i===0));
 b.innerHTML='<span class="swatch '+(f.id==='aurora'?'aurora':'')+'" style="--c:'+f.color+';--deep:'+f.deep+'" aria-hidden="true"></span><span>'+f.name+'</span>';b.addEventListener('click',()=>flavor(i));$('palette').append(b);});
flavorIndex=friend.data.flavor;setFeel(flavorIndex);targetColor.set(flavors[flavorIndex].color);targetDeep.set(flavors[flavorIndex].deep);targetGlow.set(flavors[flavorIndex].glow);
material.color.copy(targetColor);material.attenuationColor.copy(targetDeep);expression.glow.value.copy(targetGlow);
expression.rainbow.value=Number(flavorIndex===5);
document.documentElement.style.setProperty('--accent',flavors[flavorIndex].deep);document.documentElement.style.setProperty('--tint',flavors[flavorIndex].color);
[...$('palette').children].forEach((b,j)=>b.setAttribute('aria-pressed',String(flavorIndex===j)));
const toys=jellyToys(scene,camera,solver,(kind,hits,note)=>{bump();happyUntil=moodClock()+1.3;audio.play(kind,note??1);const p=screen();particles(p.x,p.y);paintToys();
 mood(kind==='star'?(hits===5?'별 다섯 개를 모두 찾았어요! 다시 눌러 한 번 더 해 봐요.':'반짝! 별 '+hits+'개를 찾았어요.'):kind==='note'?'딩동! 색깔 벨로 나만의 노래를 만들어요.':kind==='bubble'?'퐁! 비눗방울이 터졌어요.':kind==='ball'?'데굴데굴! 말랑이랑 공을 주고받아요.':'통통! 트램펄린 위에서 높이 뛰어요.');});
function jump(){touch();if(solver.jump()){happyUntil=moodClock()+1;bump();mood('통통! 두 번 콕 누르면 높이 뛰어요.');}}
$('jump').addEventListener('click',jump);
const input=jellyInput({canvas,solver,mesh,group,scene,camera,touch,bump,particles,jump,mood,happy:s=>{happyUntil=moodClock()+s;},audio,time:moodClock,petMode:()=>petMode,toyTap:(x,y)=>toys.tap(x,y),ripple});
function syncGeometry(){group.position.set(solver.body.x,solver.body.y,solver.body.z);geometry.attributes.position.needsUpdate=true;geometry.computeVertexNormals();geometry.computeBoundingBox();group.updateMatrixWorld(true);}
function reset(){input.cancel();solver.reset();petMode=false;paintPetMode();toys.choose('none');paintToys();sleeping=false;group.rotation.set(0,0,0);syncGeometry();caustics.invalidate();count=0;$('count').textContent='0';$('hints').classList.remove('dim');stage.reset();$('particles').textContent='';happyUntil=surpriseUntil=squeezeUntil=0;expression.eye.value.set(1,0,0,0);expression.squeeze.value=0;expression.ripples.value.forEach(v=>v.w=-10);touch();mood('오늘 놀이를 새로 시작해요! 이름과 선물은 그대로 기억해요.');}
$('reset').addEventListener('click',reset);
function paintPetMode(){$('pet-button').setAttribute('aria-pressed',String(petMode));$('pet-button').textContent=petMode?'쓰다듬기 ✓ · 잡기로':'살살 쓰다듬기';}
$('pet-button').addEventListener('click',()=>{input.cancel();petMode=!petMode;paintPetMode();touch();mood(petMode?'손가락으로 몸을 살살 문질러 주세요.':'이제 잡아 늘리고 던질 수 있어요.');});
$('play-menu').addEventListener('click',()=>{input.cancel();paintFriend();$('playroom').showModal();});$('room-close').addEventListener('click',()=>$('playroom').close());
$('name-form').addEventListener('submit',e=>{e.preventDefault();friend.rename($('friend-name').value);paintFriend();mood('안녕, '+friend.data.name+'! 내 이름을 기억할게요.');});
function paintToys(){const s=toys.state();for(const b of document.querySelectorAll('[data-toy]'))b.setAttribute('aria-pressed',String(b.dataset.toy===s.mode));$('trampoline-button').setAttribute('aria-pressed',String(s.mode==='trampoline'));
 $('toy-hud').hidden=s.mode==='none';$('toy-title').textContent=({bubbles:'비눗방울',ball:'공 굴리기',trampoline:'트램펄린',stars:'별 찾기',music:'색깔 벨'})[s.mode]||'';
 $('toy-score').textContent=s.mode==='stars'?s.hits+' / 5':s.mode==='music'?'자유 연주':s.hits+'번';}
function selectToy(id){input.cancel();toys.choose(id);paintToys();touch();if($('playroom').open)$('playroom').close();if(id==='music'&&!audio.enabled){audio.toggle();paintSound();}
 mood(id==='none'?'자유롭게 만지고 놀아요.':id==='stars'?'몸 주변에 있는 반짝이는 별 다섯 개를 찾아요.':id==='music'?'색깔 벨을 콕! 다른 높이의 소리가 나요.':id==='trampoline'?'분홍 테두리 트램펄린을 콕! 높은 점프를 해 봐요.':'장난감을 콕 눌러서 함께 놀아요!');}
$('playroom').addEventListener('click',e=>{const b=e.target.closest('[data-toy]');if(b)selectToy(b.dataset.toy);});
$('trampoline-button').addEventListener('click',()=>selectToy(toys.state().mode==='trampoline'?'none':'trampoline'));
$('toy-again').addEventListener('click',()=>selectToy(toys.state().mode));$('toy-stop').addEventListener('click',()=>selectToy('none'));
$('quality').addEventListener('click',()=>{quality.setLow(!quality.low);applyVisualQuality();layout();});
addEventListener('blur',()=>{input.cancel();audio.quiet();});addEventListener('focus',()=>audio.wake());
document.addEventListener('visibilitychange',()=>{input.cancel();if(document.hidden)audio.quiet();else{audio.wake();last=performance.now();}});
canvas.addEventListener('webglcontextlost',e=>{e.preventDefault();contextLost=true;input.cancel();audio.quiet();});
canvas.addEventListener('webglcontextrestored',()=>{stage.bake();caustics.invalidate();contextLost=false;last=performance.now();audio.wake();});
addEventListener('keydown',e=>{
 if(e.isComposing||e.target.closest('button,a,input'))return;
 if(e.code==='Space'){e.preventDefault();if(!e.repeat)jump();}if(e.code==='KeyR')reset();
 if(e.code==='Enter'){touch();solver.poke(0);ripple(0);bump();}if(/^Digit[1-6]$/.test(e.code))flavor(Number(e.code.slice(-1))-1);
 const axes={ArrowLeft:['vx',-3],ArrowRight:['vx',3],ArrowUp:['vz',-2.5],ArrowDown:['vz',2.5]};if(axes[e.code]){e.preventDefault();touch();const[a,v]=axes[e.code];solver.body[a]=v;happyUntil=moodClock()+.5;}
});
function layout(){
 const w=innerWidth,h=innerHeight,portrait=w/h<.9,dpr=Math.min(devicePixelRatio||1,2,Math.sqrt((coarse?1.4e6:3e6)/(w*h)))*quality.pixelScale;renderer.setPixelRatio(dpr);renderer.setSize(w,h,false);
 camera.aspect=w/h;camera.fov=portrait?40:30;const tangent=Math.tan(camera.fov*Math.PI/360),tilt=(portrait?15:12)*Math.PI/180;
 const d=Math.max(2.73/((portrait?.5:.24)*2*tangent*camera.aspect),2.065/(.3*2*tangent));
 viewTarget.set(0,1.033+((portrait?.54:.60)-.5)*2*d*tangent,0);baseCamera.set(0,viewTarget.y+Math.sin(tilt)*d,Math.cos(tilt)*d);
 camera.position.copy(baseCamera);camera.lookAt(viewTarget);camera.updateProjectionMatrix();
 solver.bounds.x=Math.max(.35,tangent*d*camera.aspect*.97-1.4);
 const topRay=new THREE.Raycaster(),top=new THREE.Vector3();camera.updateMatrixWorld(true);topRay.setFromCamera(new THREE.Vector2(0,.72),camera);topRay.ray.intersectPlane(new THREE.Plane(new THREE.Vector3(0,0,1),0),top);
 solver.bounds.yMax=Math.max(.8,top.y-2.065);
 const ray=new THREE.Raycaster(),probe=new THREE.Vector3();ray.setFromCamera(new THREE.Vector2(0,portrait?-.62:-.8),camera);ray.ray.intersectPlane(new THREE.Plane(new THREE.Vector3(0,1,0),0),probe);
 solver.bounds.zMax=clamp(probe.z-1.25,.35,4);solver.body.x=clamp(solver.body.x,-solver.bounds.x,solver.bounds.x);stage.resize(w,h,dpr,quality.low||coarse);
}
addEventListener('resize',layout,{passive:true});layout();
let last=performance.now();const eyeTarget=new THREE.Vector4(),lookTarget=new THREE.Vector2();
function simulate(dt){
 time+=dt;input.update();const now=moodClock(),held=input.state();sleeping=now-lastTouch>20&&!held.grab&&!held.pinch&&solver.body.y<solver.groundHeight+.03;
 if(!held.grab&&!held.pinch)solver.stretch(reduced()?0:sleeping?-.035+.035*Math.sin(time*1.3):.012*Math.sin(time*2.4));
 toys.update(dt,time,held.grab||held.pinch||held.petting,sleeping,reduced());
 if(!reduced()&&!held.grab&&!held.pinch&&!sleeping&&now-lastTouch>6&&now>autoAt&&solver.body.y<solver.groundHeight+.03){
  autoAt=now+3+Math.random()*3;const dist=Math.hypot(solver.body.x,solver.body.z);
  if(dist>1.2){if(solver.jump(3.6)){const reach=Math.min(dist,1.6),flight=7.2/26;solver.body.vx=-solver.body.x/dist*reach/flight*.75;solver.body.vz=-solver.body.z/dist*reach/flight*.75;happyUntil=now+.7;}}
  else if(Math.random()<.35){solver.jump(2.8);happyUntil=now+.6;}else solver.body.vx+=(Math.random()-.5)*2.4;
 }
 solver.advance(dt);syncGeometry();
 const mix=1-Math.exp(-dt*5);material.color.lerp(targetColor,mix);material.attenuationColor.lerp(targetDeep,mix);expression.glow.value.lerp(targetGlow,mix);
 const deformation=clamp(Math.abs(solver.squash)+(held.grab?solver.state().maxDeformation*.3:0),0,1);expression.deform.value=deformation;
 expression.rippleStrength.value=reduced()?0:quality.low?.45:1;material.dispersion=quality.low?0:.35+deformation*.45;
 const film=flavorIndex===5?.35+deformation*.10:.2+deformation*.25;material.iridescence=flavorIndex===5?material.iridescence+(film-material.iridescence)*mix:film;
 expression.auroraSamples.value=quality.low?4:8;
 if(flavorIndex===5&&!reduced())expression.filmPhase.value+=dt*(Math.PI*2/5);
 expression.time.value=time;expression.rainbow.value+=(Number(flavorIndex===5)-expression.rainbow.value)*mix;material.transmission+=(1-material.transmission)*mix;material.roughness+=(.14-deformation*.035-material.roughness)*mix;
 if(now>blinkAt&&!sleeping&&!held.grab){blinkUntil=now+.16;blinkAt=now+2.5+Math.random()*3;}
 const open=now<blinkUntil?Math.abs((blinkUntil-now)/.08-1):1,happy=now<happyUntil?1:0,surprise=solver.body.vy<-3||now<surpriseUntil?1:0;
 expression.eye.value.lerp(eyeTarget.set(open,happy,Number(sleeping),surprise),Math.min(1,dt*20));
 const squeezing=now<squeezeUntil||solver.squash<-.1||(held.grab&&solver.state().maxDeformation>.5)||(held.pinch&&Math.abs(solver.squash)>.18);
 expression.squeeze.value+=(Number(squeezing&&!sleeping)-expression.squeeze.value)*Math.min(1,dt*18);
 const p=screen(),pointer=input.pointer,lx=pointer.has?clamp((pointer.x-p.x)/260,-1,1):Math.sin(time*.37)*.35,ly=pointer.has?clamp((p.y-pointer.y)/220,-1,1):Math.sin(time*.23)*.2;
 expression.look.value.lerp(lookTarget.set(lx*.036,ly*.028),mix);if(!held.grab)group.rotation.y+=(lx*.18-group.rotation.y)*mix;
 if(!coarse&&!reduced()&&!held.grab){camera.position.x=baseCamera.x+lx*.12;camera.position.y=baseCamera.y+ly*.07;camera.lookAt(viewTarget);}
 for(const ev of solver.events.splice(0)){audio.play(ev.type,ev.force);if(ev.type==='land'){ripple(0,Math.min(1,ev.force/6));surpriseUntil=now+.16;happyUntil=now+.65;if(ev.force>2)squeezeUntil=now+.35;if(!reduced())stage.splash(solver.body,ev.force*.65);}}
 ornament.position.set(geometry.boundingBox.getCenter(ornamentCenter).x,geometry.boundingBox.max.y+.025,.3);ornament.rotation.z=clamp(-solver.body.vx*.025,-.2,.2);
 stage.update(solver.body,solver.squash,dt,material.color,0);
 bubbles.forEach(b=>{const phase=(time*.075+b.userData.phase)%1,a=b.userData.angle;b.position.set(Math.sin(a)*.5,(.28+phase*1.35)*(1+solver.squash),Math.cos(a)*.4);});
 if(sleeping&&!reduced()&&now>zAt){zAt=now+1.5;particles(p.x+35,p.y-45,'sleep');}
}
const minimumRadii=new THREE.Vector3(.04,.04,.04);
function render(dt){
 mesh.updateWorldMatrix(true,false);geometry.boundingBox.getCenter(expression.center.value);geometry.boundingBox.getSize(expression.radii.value).multiplyScalar(.5).max(minimumRadii);
 expression.localCamera.value.copy(camera.position);mesh.worldToLocal(expression.localCamera.value);
 caustics.update(dt,material);renderer.render(scene,camera);
}
function frame(now){requestAnimationFrame(frame);const elapsed=now-last,dt=Math.min(.045,Math.max(0,elapsed/1000));last=now;if(document.hidden||contextLost)return;if(quality.observe(elapsed)){applyVisualQuality();layout();}simulate(dt);render(dt);}
window.__slime={solver,renderer,scene,camera,reset,jump,flavor,mesh,audio,stage,screen,input,caustics,quality,friend,toys,expression,ripple,setOptics,renderOnce:()=>{caustics.invalidate();render(0);},
 state:()=>({...solver.state(),...input.state(),count,flavor:flavors[flavorIndex].id,sleeping,time,contextLost}),
 advance:seconds=>{for(let t=0;t<seconds;t+=1/60){qaMoodOffset+=1/60;simulate(1/60);}}};
if(!reduced())solver.body.y=6;
syncGeometry();
canvas.classList.add('ready');requestAnimationFrame(frame);
