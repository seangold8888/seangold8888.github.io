import * as THREE from '../../kart3d/vendor/three.module.min.js';
import {AURORA_VOLUME_GLSL} from './aurora-volume.js?v=rainbow-16';
export const FLAVORS=[
 {id:'soda',name:'소다',color:'#a2eaff',deep:'#3db8f6',glow:'#a8eeff'},
 {id:'berry',name:'딸기',color:'#ffa3c2',deep:'#f2508a',glow:'#ffc6da'},
 {id:'mint',name:'멜론',color:'#b6ec86',deep:'#58c45e',glow:'#dbffb4'},
 {id:'lemon',name:'레몬',color:'#ffe27e',deep:'#ffb42a',glow:'#fff2ae'},
 {id:'grape',name:'포도',color:'#c6adff',deep:'#8a63f5',glow:'#e2d5ff'},
 {id:'aurora',name:'오로라',color:'#e9edf4',deep:'#a7a9b5',glow:'#dfe4f4'},
];
export function jellyMaterial(){
 const expression={eye:{value:new THREE.Vector4(1,0,0,0)},squeeze:{value:0},look:{value:new THREE.Vector2()},rainbow:{value:0},filmPhase:{value:1.8},filmRange:{value:new THREE.Vector2(280,680)},time:{value:0},glow:{value:new THREE.Color(FLAVORS[0].glow)},
  optics:{value:1},auroraSamples:{value:8},rippleStrength:{value:1},ripples:{value:Array.from({length:4},()=>new THREE.Vector4(0,0,1,-10))},ripplePower:{value:new THREE.Vector4()},deform:{value:0},
  localCamera:{value:new THREE.Vector3()},center:{value:new THREE.Vector3()},radii:{value:new THREE.Vector3(1,1,1)}};
 const material=new THREE.MeshPhysicalMaterial({color:FLAVORS[0].color,attenuationColor:FLAVORS[0].deep,
 transmission:1,thickness:1.1,ior:1.36,dispersion:.35,roughness:.14,metalness:0,attenuationDistance:2.4,
 clearcoat:1,clearcoatRoughness:.04,specularIntensity:1,iridescence:.2,iridescenceIOR:1.3,iridescenceThicknessRange:[120,700],envMapIntensity:1.2});
 material.onBeforeCompile=sh=>{
  Object.assign(sh.uniforms,{uEye:expression.eye,uSqueeze:expression.squeeze,uLook:expression.look,uRainbow:expression.rainbow,uFilmPhase:expression.filmPhase,uFilmRange:expression.filmRange,uTime:expression.time,uGlow:expression.glow,
   uOptics:expression.optics,uAuroraSamples:expression.auroraSamples,uLocalCamera:expression.localCamera,uBodyCenter:expression.center,uBodyRadii:expression.radii,
   uRipples:expression.ripples,uRipplePower:expression.ripplePower,uRippleStrength:expression.rippleStrength,uDeform:expression.deform});
  sh.vertexShader=sh.vertexShader.replace('#include <common>','#include <common>\nattribute vec3 jellyRest;varying vec3 vRest,vSkinPoint,vSkinNormal;').replace('#include <begin_vertex>','#include <begin_vertex>\nvRest=jellyRest;vSkinPoint=position;vSkinNormal=normal;');
  sh.fragmentShader=sh.fragmentShader.replace('#include <common>',`#include <common>
    varying vec3 vRest,vSkinPoint,vSkinNormal;uniform vec4 uEye;uniform vec2 uLook,uFilmRange;uniform float uRainbow,uFilmPhase,uTime,uSqueeze,uOptics;uniform vec3 uGlow,uLocalCamera,uBodyCenter,uBodyRadii;
    uniform vec4 uRipples[4],uRipplePower;uniform float uRippleStrength,uDeform;
    float faceMask=0.0,eyeShine=0.0;
    float skinRipple(vec3 point){
     if(uRippleStrength<.01)return 0.0;
     float h=0.0;for(int i=0;i<4;i++){float age=uTime-uRipples[i].w;
      if(age>=0.0&&age<1.6){float d=acos(clamp(dot(normalize(point),uRipples[i].xyz),-.9999,.9999));
       h+=sin(d*24.0-age*14.0)*exp(-pow((d-age*2.2)*4.0,2.0))*exp(-age*2.4)*uRipplePower[i]*.016;}}
     return h*uRippleStrength*uOptics;
    }
    float ellipse(vec2 p,vec2 r){return (length(p/r)-1.0)*min(r.x,r.y);}
    float ink(float d){return 1.0-smoothstep(-fwidth(d),fwidth(d)+.00001,d);}
    float lineDistance(vec2 p,vec2 a,vec2 b){vec2 v=b-a;return length(p-a-v*clamp(dot(p-a,v)/dot(v,v),0.0,1.0));}
    float pupil(vec2 p,float side){
      float oval=ellipse(p,vec2(.052,max(.01,.094*uEye.x))*(1.0+.16*uEye.w));
      float curve=.026-.038*pow(p.x/.062,2.0);
      float crescent=max(abs(p.y-curve)-.0135,abs(p.x)-.062);
      float asleep=max(abs(p.y+curve+.016)-.007,abs(p.x)-.06);
      vec2 q=vec2(p.x*side,p.y);
      float crease=min(lineDistance(q,vec2(-.04,.044),vec2(.036,0)),lineDistance(q,vec2(.036,0),vec2(-.04,-.044)))-.0135;
      return mix(mix(mix(oval,crescent,uEye.y),crease,uSqueeze),asleep,uEye.z);
    }
    float gleam(vec2 p){return max(ink(ellipse(p-vec2(-.014,.033),vec2(.016,.022))),ink(ellipse(p-vec2(.017,-.026),vec2(.008,.011))));}
    float jellyPath(float refractionIndex){
      vec3 incident=normalize(vSkinPoint-uLocalCamera),ray=refract(incident,normalize(vSkinNormal),1.0/refractionIndex);
      vec3 radius=max(uBodyRadii,vec3(.04)),q=(vSkinPoint-uBodyCenter)/radius,d=ray/radius;
      float a=max(.0001,dot(d,d)),b=2.0*dot(q,d),disc=max(0.0,b*b-4.0*a*(dot(q,q)-1.0));
      return clamp((-b+sqrt(disc))/(2.0*a),.12,3.5);
    }
    ${AURORA_VOLUME_GLSL}
  `).replace('#include <color_fragment>',`#include <color_fragment>
    vec3 jr=normalize(vRest);vec2 p=jr.xy/(.55+.45*max(0.0,jr.z));
    vec2 le=p-vec2(-.235,.05)-uLook,re=p-vec2(.235,.05)-uLook;
    float smile=max(abs(p.y+.20-.07*pow(p.x/.10,2.0))-.012,abs(p.x)-.10);
    float calm=max(abs(p.y+.18)-.008,abs(p.x)-.04);
    float mouth=mix(calm,smile,uEye.y);
    mouth=mix(mouth,ellipse(p-vec2(0,-.18),vec2(.032,.045)),uEye.w);
    mouth=mix(mouth,ellipse(p-vec2(0,-.18),vec2(.025,.017)),uEye.z);
    faceMask=max(ink(min(pupil(le,1.0),pupil(re,-1.0))),ink(mouth))*smoothstep(.12,.34,jr.z);
    eyeShine=max(gleam(le),gleam(re))*faceMask*uEye.x*(1.0-uEye.y)*(1.0-uEye.z)*(1.0-uSqueeze);
    // Aurora uses the same homogeneous gel volume as every other flavor.
    // Its soft rainbow light is integrated inside the refracted volume, not painted bands.
    float cheeks=exp(-pow(length((p-vec2(-.37,-.12))/vec2(.10,.043)),2.0))+exp(-pow(length((p-vec2(.37,-.12))/vec2(.10,.043)),2.0));
    diffuseColor.rgb=mix(diffuseColor.rgb,vec3(1.0,.40,.56),clamp(cheeks*(.13+.42*uEye.y)*smoothstep(.2,.4,jr.z),0.0,.6));
    diffuseColor.rgb=mix(diffuseColor.rgb,vec3(.006,.009,.014),faceMask);
    diffuseColor.rgb=mix(diffuseColor.rgb,vec3(1.0),eyeShine);
  `).replace('#include <normal_fragment_maps>',`#include <normal_fragment_maps>
    // Analytic travelling height waves perturb only optical normals, never physics.
    float rippleHeight=skinRipple(vRest);
    vec3 sx=dFdx(vViewPosition),sy=dFdy(vViewPosition),r1=cross(sy,normal),r2=cross(normal,sx);
    float det=dot(sx,r1);
    if(abs(det)>.00000001)normal=normalize(abs(det)*normal-sign(det)*(dFdx(rippleHeight)*r1+dFdy(rippleHeight)*r2));
  `).replace('#include <lights_physical_fragment>',`#include <lights_physical_fragment>
    #ifdef USE_IRIDESCENCE
     // Broad, curved variations in the film, not horizontal RGB stripes.
     // Only reflected light changes; the refracted gel stays homogeneous.
     if(uRainbow>.001){
     float auroraMask=uRainbow*(1.0-faceMask);
     float filmFlow=sin(jr.x*1.65+jr.z*.95+uFilmPhase)*.62+sin(jr.y*1.3-jr.z*.7-uFilmPhase*.6)*.38;
     float filmThickness=mix(uFilmRange.x,uFilmRange.y,smoothstep(-.85,.85,filmFlow));
     material.iridescenceThickness=mix(material.iridescenceThickness,filmThickness,auroraMask);
     material.iridescenceIOR=mix(material.iridescenceIOR,1.72,auroraMask);
     }
    #endif
  `).replace('#include <lights_fragment_begin>',THREE.ShaderChunk.lights_fragment_begin.replace(
   'material.iridescenceF0 = Schlick_to_F0( material.iridescenceFresnel, 1.0, dotNVi );',`
    // Art-direction grade only the magenta reflection, never the gel volume.
    if(uRainbow>.001){
     vec3 auroraReflection=material.iridescenceFresnel;
     float pinkExcess=max(0.0,min(auroraReflection.r,auroraReflection.b)-auroraReflection.g);
     float pinkSoftening=smoothstep(.005,.06,pinkExcess)*.55*uRainbow*(1.0-faceMask);
     float reflectionLight=dot(auroraReflection,vec3(.2126,.7152,.0722));
     material.iridescenceFresnel=mix(auroraReflection,vec3(reflectionLight),pinkSoftening);
    }
    material.iridescenceF0 = Schlick_to_F0( material.iridescenceFresnel, 1.0, dotNVi );
   `)).replace('#include <emissivemap_fragment>',`#include <emissivemap_fragment>
    float rim=pow(1.0-max(0.0,dot(normal,normalize(vViewPosition))),2.6);
    float low=1.0-smoothstep(-.7,.25,normalize(vRest).y);
    float gelGlow=mix(.05+rim*.42+low*.3,.025+rim*.30+low*.20,uOptics);
    totalEmissiveRadiance+=uGlow*gelGlow*(1.0-faceMask)+vec3(.95)*eyeShine;
    totalEmissiveRadiance+=auroraVolume()*(1.0-faceMask);
    totalEmissiveRadiance+=vec3(.5,.055,.10)*cheeks*uEye.y*.14*(1.0-faceMask)*smoothstep(.2,.4,jr.z);
  `).replace('#include <transmission_fragment>',THREE.ShaderChunk.transmission_fragment
   .replace('material.transmission = transmission;','material.transmission = transmission * (1.0-faceMask);')
   .replace('material.thickness = thickness;','material.thickness = thickness * mix(1.0,jellyPath(material.ior)/2.1,uOptics);'));
 };
 return{material,expression};
}
