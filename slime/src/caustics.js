import * as THREE from '../../kart3d/vendor/three.module.min.js';
import {OPTICS_BUDGET as B} from './optics.js?v=5';

// Forward refractive caustic map. Entry uses the actual animated skin and normals;
// exit uses its fitted ellipsoid, not an expensive full-volume ray tracer.
export function jellyCaustics(renderer,skin,coarse){
 let size=coarse?B.touchSize:B.desktopSize,hz=B.hz;
 const target=new THREE.WebGLRenderTarget(size,size,{depthBuffer:false,stencilBuffer:false,type:THREE.UnsignedByteType});
 target.texture.name='Jelly refracted light';target.texture.generateMipmaps=false;
 // Match the stage's key light (4,6,3), so light and its refracted footprint agree.
 const origin=new THREE.Vector2(),center=new THREE.Vector3(),radii=new THREE.Vector3(),sun=new THREE.Vector3(-4,-6,-3).normalize();
 const uniforms={uModel:{value:skin.matrixWorld},uCenter:{value:center},uRadii:{value:radii},uOrigin:{value:origin},
  uSun:{value:sun},uIor:{value:1.36},uExtent:{value:B.extent},uAttenuation:{value:new THREE.Color()},uDistance:{value:2.4},uMaxFocus:{value:B.maxFocus}};
 const material=new THREE.ShaderMaterial({uniforms,side:THREE.DoubleSide,transparent:true,depthTest:false,depthWrite:false,blending:THREE.AdditiveBlending,toneMapped:false,
  vertexShader:`
   uniform mat4 uModel;uniform vec3 uCenter,uRadii,uSun;uniform vec2 uOrigin;uniform float uIor,uExtent;
   varying vec2 vSource,vLanding;varying float vFlux,vPath,vValid;
   void main(){
    vec3 entry=(uModel*vec4(position,1.0)).xyz;
    vec3 n=normalize(mat3(uModel)*normal),r=refract(uSun,n,1.0/uIor);
    vec3 q=(entry-uCenter)/uRadii,d=r/uRadii;
    float a=max(dot(d,d),.0001),b=2.0*dot(q,d),disc=b*b-4.0*a*(dot(q,q)-1.0);
    float path=clamp((-b+sqrt(max(0.0,disc)))/(2.0*a),0.0,4.5);
    vec3 exitPoint=entry+r*path,exitNormal=normalize((exitPoint-uCenter)/(uRadii*uRadii));
    vec3 outgoing=refract(r,-exitNormal,uIor);
    float t=(-.025-exitPoint.y)/min(outgoing.y,-.0001);
    vValid=step(.001,disc)*step(.01,-outgoing.y)*step(0.0,t);
    vec3 hit=exitPoint+outgoing*clamp(t,0.0,30.0);
    float cosine=max(0.0,-dot(n,uSun)),exitCosine=max(0.0,dot(r,exitNormal));
    float f0=pow((uIor-1.0)/(uIor+1.0),2.0);
    float enterReflection=f0+(1.0-f0)*pow(1.0-cosine,5.0),exitReflection=f0+(1.0-f0)*pow(1.0-exitCosine,5.0);
    vSource=entry.xz;vLanding=hit.xz;vPath=path;vFlux=cosine*(1.0-enterReflection)*(1.0-exitReflection);
    gl_Position=vec4((hit.xz-uOrigin)/uExtent*2.0,0.0,1.0);
   }
  `,
  fragmentShader:`
   uniform vec3 uAttenuation;uniform float uDistance,uMaxFocus;
   varying vec2 vSource,vLanding;varying float vFlux,vPath,vValid;
   float area(vec2 a,vec2 b){return abs(a.x*b.y-a.y*b.x);}
   void main(){
    if(vFlux<.03||vValid<.5)discard;
    float sourceArea=area(dFdx(vSource),dFdy(vSource));
    float landingArea=max(.00001,area(dFdx(vLanding),dFdy(vLanding)));
    float gain=min(uMaxFocus,sourceArea/landingArea)*vFlux;
    vec3 transmitted=exp(log(max(uAttenuation,vec3(.02)))*vPath/max(.05,uDistance));
    float focus=smoothstep(.65,3.8,gain)*.22;
    gl_FragColor=vec4(transmitted*focus,1.0);
   }
  `});
 const scene=new THREE.Scene(),projection=new THREE.Mesh(skin.geometry,material),camera=new THREE.Camera();
 projection.frustumCulled=false;scene.add(projection);
 let elapsed=Infinity,enabled=true,passes=0;
 const savedColor=new THREE.Color(),worldPoint=new THREE.Vector3(),localCenter=new THREE.Vector3(),localRadii=new THREE.Vector3(),minRadii=new THREE.Vector3(.04,.04,.04);
 function update(dt,opticalMaterial){
  if(!enabled)return;elapsed+=dt;if(elapsed<1/hz)return;elapsed=0;
  skin.updateWorldMatrix(true,false);const box=skin.geometry.boundingBox;
  box.getCenter(localCenter);box.getSize(localRadii).multiplyScalar(.5);
  center.copy(localCenter).applyMatrix4(skin.matrixWorld);radii.copy(localRadii).max(minRadii);
  skin.getWorldPosition(worldPoint);origin.set(worldPoint.x,worldPoint.z);
  uniforms.uIor.value=opticalMaterial.ior;uniforms.uAttenuation.value.copy(opticalMaterial.attenuationColor);uniforms.uDistance.value=opticalMaterial.attenuationDistance;
  const previous=renderer.getRenderTarget(),cubeFace=renderer.getActiveCubeFace(),mip=renderer.getActiveMipmapLevel(),scissor=renderer.getScissorTest(),alpha=renderer.getClearAlpha();
  renderer.getClearColor(savedColor);
  try{renderer.setRenderTarget(target);renderer.setScissorTest(false);renderer.setClearColor(0,0);renderer.clear();renderer.render(scene,camera);passes++;}
  finally{renderer.setRenderTarget(previous,cubeFace,mip);renderer.setScissorTest(scissor);renderer.setClearColor(savedColor,alpha);}
 }
 return{texture:target.texture,debugTarget:target,origin,extent:B.extent,update,invalidate:()=>{elapsed=Infinity;},setEnabled:value=>{enabled=!!value;elapsed=Infinity;},
  setLowQuality:low=>{const next=low?96:coarse?B.touchSize:B.desktopSize;if(next!==size){size=next;target.setSize(size,size);}hz=low?15:B.hz;uniforms.uMaxFocus.value=low?5:B.maxFocus;elapsed=Infinity;},
  state:()=>({enabled,size,passes,hz}),dispose:()=>{target.dispose();material.dispose();}};
}
