import * as THREE from '../../kart3d/vendor/three.module.min.js';
import {RoomEnvironment} from '../vendor/RoomEnvironment.js';
import {Reflector} from '../vendor/Reflector.js';

const marbleShader={
 name:'SlimeMarble',uniforms:{color:{value:new THREE.Color()},tDiffuse:{value:null},textureMatrix:{value:new THREE.Matrix4()},uTexel:{value:new THREE.Vector2(1/512,1/384)},uFocus:{value:10},
  uCausticMap:{value:null},uCausticOrigin:{value:new THREE.Vector2()},uCausticExtent:{value:7},uCausticStrength:{value:0},uCausticTexel:{value:1/128}},
 vertexShader:`
   uniform mat4 textureMatrix;varying vec4 vMirror;varying vec3 vWorld;
   void main(){vec4 world=modelMatrix*vec4(position,1.0);vWorld=world.xyz;vMirror=textureMatrix*vec4(position,1.0);gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0);}
 `,
 fragmentShader:`
   uniform sampler2D tDiffuse,uCausticMap;uniform vec2 uTexel,uCausticOrigin;uniform float uFocus,uCausticExtent,uCausticStrength,uCausticTexel;varying vec4 vMirror;varying vec3 vWorld;
   float hash(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453);}
   float noise(vec2 p){vec2 i=floor(p),f=fract(p);f=f*f*(3.0-2.0*f);return mix(mix(hash(i),hash(i+vec2(1,0)),f.x),mix(hash(i+vec2(0,1)),hash(i+vec2(1,1)),f.x),f.y);}
   float fbm(vec2 p){float n=0.0,a=.5;for(int i=0;i<5;i++){n+=a*noise(p);p=mat2(1.6,1.2,-1.2,1.6)*p+3.1;a*=.5;}return n;}
   void main(){
     vec2 p=vWorld.xz*.30+vec2(3.1,1.7),warp=vec2(fbm(p*.9),fbm(p*.9+vec2(5.2,1.3)));
     float n=fbm(p*1.3+warp*1.8);
     float vein=pow(1.0-abs(sin(p.x*1.8+p.y*1.1+n*5.5)),16.0);
     float fine=pow(1.0-abs(sin(p.x*-2.1+p.y*5.04+fbm(p*2.4+warp)*7.0)),34.0)*.5;
     float blur=smoothstep(2.5,9.0,abs(distance(vWorld,cameraPosition)-uFocus));
     float grain=mix(fbm(p*3.5+warp),.5,blur*.8);
     vec3 stone=vec3(.904,.896,.871)*(.975+.05*grain);
     stone=mix(stone,vec3(.262,.275,.3),clamp((vein+fine)*(1.0-.7*blur),0.0,1.0)*.5);
     stone*=1.0-.11*exp(-max(0.0,vWorld.z+4.6)*1.2);
     vec2 uv=vMirror.xy/vMirror.w,off=vec2(.004+.01*blur);
     vec3 reflected=texture2D(tDiffuse,uv).rgb*.36;
     reflected+=(texture2D(tDiffuse,uv+vec2(off.x,0)).rgb+texture2D(tDiffuse,uv-vec2(off.x,0)).rgb+texture2D(tDiffuse,uv+vec2(0,off.y)).rgb+texture2D(tDiffuse,uv-vec2(0,off.y)).rgb)*.16;
     float grazing=1.0-clamp(normalize(cameraPosition-vWorld).y,0.0,1.0);
     float farMix=clamp(.125+.475*pow(grazing,5.0),0.0,.5);
     vec2 lightUv=(vWorld.xz-uCausticOrigin)/uCausticExtent+.5;
     float inField=step(0.0,lightUv.x)*step(0.0,lightUv.y)*step(lightUv.x,1.0)*step(lightUv.y,1.0);
     vec2 lightStep=vec2(uCausticTexel,0.0);
     vec3 light=texture2D(uCausticMap,lightUv).rgb*.5;
     light+=(texture2D(uCausticMap,lightUv+lightStep).rgb+texture2D(uCausticMap,lightUv-lightStep).rgb+texture2D(uCausticMap,lightUv+lightStep.yx).rgb+texture2D(uCausticMap,lightUv-lightStep.yx).rgb)*.125;
     vec3 surface=mix(stone,clamp(reflected,vec3(0),vec3(1.2)),farMix);
     surface+=light*inField*uCausticStrength;
     gl_FragColor=vec4(surface,1.0);
     #include <colorspace_fragment>
   }
 `
};
function bathroomTexture(){
 const cv=document.createElement('canvas');cv.width=1536;cv.height=768;const c=cv.getContext('2d');
 const sx=cv.width/24,sy=cv.height/12,x=v=>(v+12)*sx,y=v=>(12-v)*sy;
 c.fillStyle='#e8e8e5';c.fillRect(0,0,cv.width,cv.height);
 const daylight=c.createLinearGradient(0,0,0,cv.height);daylight.addColorStop(0,'#e3e6e9');daylight.addColorStop(.6,'#eef0f0');daylight.addColorStop(1,'#f5f5f4');c.fillStyle=daylight;c.fillRect(0,0,cv.width,cv.height);
 const windowLight=c.createRadialGradient(x(9),y(4),0,x(9),y(4),9*sx);windowLight.addColorStop(0,'#fff');windowLight.addColorStop(1,'#fff0');c.fillStyle=windowLight;c.fillRect(0,0,cv.width,cv.height);
 c.strokeStyle='rgba(160,166,174,.26)';c.lineWidth=3;
 for(let a=-12;a<=12;a+=2.4){c.beginPath();c.moveTo(x(a),0);c.lineTo(x(a),cv.height);c.stroke();}
 for(let a=0;a<=12;a+=1.2){c.beginPath();c.moveTo(0,y(a));c.lineTo(cv.width,y(a));c.stroke();}
 c.fillStyle='#c2c8c8';c.beginPath();c.roundRect(x(-4.3),y(8.6),8*sx,7.4*sy,.32*sx);c.fill();
 c.fillStyle='#e0e9e9';c.beginPath();c.roundRect(x(-4.18),y(8.5),7.76*sx,7.16*sy,.28*sx);c.fill();
 const mirror=c.createLinearGradient(x(-4),y(8.2),x(3.5),y(1.2));mirror.addColorStop(0,'#dce3e9');mirror.addColorStop(1,'#ecf0f3');c.fillStyle=mirror;c.fillRect(x(-4),y(8.2),7.35*sx,7*sy);
 c.fillStyle='#fdfefe';c.fillRect(x(.3),y(7.6),1.7*sx,4.45*sy);
 c.fillStyle='rgba(154,167,182,.32)';c.fillRect(x(-3.1),y(7.1),.35*sx,5.8*sy);
 c.fillStyle='rgba(188,198,210,.42)';c.fillRect(x(-4),y(2.7),7.35*sx,1.5*sy);
 c.strokeStyle='#aeb9b8';c.lineWidth=.13*sx;c.beginPath();c.moveTo(x(-2.75),y(.1));c.lineTo(x(-2.75),y(1.06));c.quadraticCurveTo(x(-2.7),y(1.38),x(-2.15),y(1.1));c.stroke();
 c.strokeStyle='#fdfefe';c.lineWidth=.045*sx;c.stroke();
 const bottle=c.createLinearGradient(x(4.2),0,x(4.9),0);bottle.addColorStop(0,'#a1c9e7');bottle.addColorStop(.5,'#d6eaf7');bottle.addColorStop(1,'#94bddd');c.fillStyle=bottle;c.beginPath();c.roundRect(x(4.2),y(1.9),.69*sx,1.9*sy,.14*sx);c.fill();
 c.fillStyle='#dae8eb';c.fillRect(x(4.25),y(1.28),.59*sx,.65*sy);
 c.fillStyle='#c9d0ce';c.fillRect(x(4.38),y(2.02),.32*sx,.25*sy);c.fillRect(x(4.37),y(2.04),.65*sx,.09*sy);
 c.fillStyle='#fafafa';c.beginPath();c.roundRect(x(5.45),y(.9),1.1*sx,.82*sy,.09*sx);c.fill();c.fillStyle='#d5e0df';c.fillRect(x(5.45),y(.78),1.1*sx,.055*sy);
 // A down/up sample gives optical softness without erasing the bathroom shapes.
 const soft=document.createElement('canvas');soft.width=112;soft.height=56;const sc=soft.getContext('2d');sc.imageSmoothingQuality='high';sc.drawImage(cv,0,0,112,56);
 c.clearRect(0,0,cv.width,cv.height);c.imageSmoothingQuality='high';c.drawImage(soft,0,0,cv.width,cv.height);
 const texture=new THREE.CanvasTexture(cv);texture.colorSpace=THREE.SRGBColorSpace;return texture;
}
function radialTexture(){
 const cv=document.createElement('canvas');cv.width=cv.height=128;const c=cv.getContext('2d'),g=c.createRadialGradient(64,64,0,64,64,64);
 g.addColorStop(0,'rgba(255,255,255,1)');g.addColorStop(.45,'rgba(255,255,255,.55)');g.addColorStop(.75,'rgba(255,255,255,.15)');g.addColorStop(1,'rgba(255,255,255,0)');c.fillStyle=g;c.fillRect(0,0,128,128);return new THREE.CanvasTexture(cv);
}
export function jellyStage(renderer,scene,camera){
 let environment;
 function bake(){const pmrem=new THREE.PMREMGenerator(renderer),room=new RoomEnvironment();const next=pmrem.fromScene(room,.035);room.dispose();pmrem.dispose();environment?.dispose();environment=next;scene.environment=next.texture;}
 bake();
 const key=new THREE.DirectionalLight('#ffffff',2);key.position.set(4,6,3);scene.add(key);
 const fill=new THREE.DirectionalLight('#ffffff',1);fill.position.set(-5,3,4);scene.add(fill);scene.add(new THREE.HemisphereLight('#ffffff','#e9e7e2',.7));
 const wall=new THREE.Mesh(new THREE.PlaneGeometry(24,12),new THREE.MeshBasicMaterial({map:bathroomTexture(),toneMapped:false}));wall.position.set(0,6,-4.6);scene.add(wall);
 const floor=new Reflector(new THREE.PlaneGeometry(140,60),{shader:marbleShader,textureWidth:512,textureHeight:384,clipBias:.003,multisample:0});
 floor.rotation.x=-Math.PI/2;floor.position.set(0,-.025,25.4);scene.add(floor);
 let frameId=0,reflected=-1;const renderReflection=floor.onBeforeRender;
 floor.onBeforeRender=function(r,s,c,...args){if(c!==camera||reflected===frameId)return;reflected=frameId;renderReflection.call(this,r,s,c,...args);};
 const shadows=[];
 const shadeTexture=radialTexture();
 for(const [width,depth,alpha,color] of [[3.4,2,.09,'#3a414b'],[2.1,1.3,.3,'#3a414b'],[2.5,1.4,.5,'#a2eaff']]){
   const m=new THREE.Mesh(new THREE.PlaneGeometry(width,depth),new THREE.MeshBasicMaterial({color,alphaMap:shadeTexture,transparent:true,opacity:alpha,depthWrite:false,toneMapped:false}));
   m.rotation.x=-Math.PI/2;m.position.y=-.012+shadows.length*.002;m.userData.opacity=alpha;scene.add(m);shadows.push(m);
 }
 const dropGeometry=new THREE.SphereGeometry(1,12,8),dropMaterial=new THREE.MeshPhysicalMaterial({color:'#ffffff',transmission:1,roughness:.02,thickness:.12,ior:1.33,envMapIntensity:1.5,attenuationColor:'#a2eaff',attenuationDistance:.35,clearcoat:1});
 const drops=[];for(let i=0;i<24;i++){const m=new THREE.Mesh(dropGeometry,dropMaterial);m.visible=false;m.userData.life=0;scene.add(m);drops.push(m);}let cursor=0;
 function splash(body,force){for(let i=0;i<Math.min(8,Math.ceil(force));i++){const m=drops[cursor++%drops.length],a=Math.random()*Math.PI*2,r=1.2+Math.random()*.9;m.position.set(body.x+Math.cos(a)*r,.025,body.z+Math.sin(a)*r*.75);m.userData.life=4+Math.random()*3;m.userData.size=.045+Math.random()*.075;m.visible=true;}}
 const focusPoint=new THREE.Vector3();let lightField=null,lightEnabled=false;
 function update(body,squash,dt,color,rainbow=0){
   frameId++;const spread=1/Math.sqrt(1+squash),height=body.y;
   if(lightField){floor.material.uniforms.uCausticTexel.value=1/lightField.state().size;floor.material.uniforms.uCausticStrength.value=lightEnabled?1.3+Math.min(.5,Math.abs(squash))*.6:0;}
   shadows.forEach((m,i)=>{m.position.x=body.x+(i===0?-.15:i===1?.05:.1);m.position.z=body.z+(i===0?-.2:i===1?-.05:.35);m.scale.set(spread*(1+height*(i<2?.15:0)),spread,1);m.material.opacity=m.userData.opacity/(1+height*.8)*(i===2?1-.5*rainbow:1);});
   shadows[2].material.color.copy(color);dropMaterial.attenuationColor.copy(color);floor.material.uniforms.uFocus.value=camera.position.distanceTo(focusPoint.set(body.x,body.y+.812,body.z));
   drops.forEach(m=>{if(!m.visible)return;m.userData.life-=dt;const size=m.userData.size*Math.min(1,m.userData.life);m.scale.set(size,size*.55,size);if(m.userData.life<=0)m.visible=false;});
 }
 function resize(w,h,dpr,low=false){const rw=Math.min(low?512:1024,Math.max(256,Math.round(w*dpr*.5))),rh=Math.min(low?384:768,Math.max(192,Math.round(h*dpr*.5)));floor.getRenderTarget().setSize(rw,rh);floor.material.uniforms.uTexel.value.set(1/rw,1/rh);}
 function setCaustics(field,enabled=true){lightField=field;lightEnabled=enabled;const u=floor.material.uniforms;u.uCausticMap.value=field.texture;u.uCausticOrigin.value=field.origin;u.uCausticExtent.value=field.extent;u.uCausticStrength.value=enabled?1.3:0;}
 return{bake,update,resize,splash,wall,floor,drops,setCaustics,reset:()=>drops.forEach(m=>m.visible=false)};
}
