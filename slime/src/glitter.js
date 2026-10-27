// Glitter suspended in the gel: three refracted depth layers of sparse twinkling flakes.
// Same bounded volume as the aurora light; one early return keeps plain slimes free.
export const GLITTER_GLSL=`
uniform float uGlitter;uniform vec3 uGlitterColor;
float glitterHash(vec3 p){return fract(sin(dot(p,vec3(127.1,311.7,74.7)))*43758.5453);}
vec3 glitterField(){
 if(uGlitter<.001)return vec3(0.0);
 vec3 incident=normalize(vSkinPoint-uLocalCamera);
 vec3 ray=refract(incident,normalize(vSkinNormal),1.0/1.36);
 vec3 radius=max(uBodyRadii,vec3(.04));
 float path=jellyPath(1.36),light=0.0;
 for(int i=0;i<3;i++){
  float depth=(.16+float(i)*.26)*path;
  vec3 q=(vSkinPoint+ray*depth-uBodyCenter)/radius;
  vec3 cell=q*7.0+vec3(float(i)*3.7,float(i)*1.9,float(i)*5.3),id=floor(cell),f=fract(cell)-.5;
  float h=glitterHash(id);
  vec3 jitter=vec3(glitterHash(id+1.7),glitterHash(id+3.1),glitterHash(id+5.3))-.5;
  float r=length(f-jitter*.55);
  float twinkle=.5+.5*sin(uTime*(1.5+h*3.0)+h*43.0+dot(incident,vec3(13.0,9.0,7.0)));
  float flake=step(.42,h)*(1.0-smoothstep(.02,.12,r))*(.25+.75*pow(twinkle,4.0));
  light+=flake*(1.0-smoothstep(.72,1.0,dot(q,q)));
 }
 return mix(uGlitterColor,vec3(1.0),.25)*light*2.0*uGlitter;
}
`;
