// Soft rainbow light inside the gel, not stripes painted on the surface.
// Eight bounded samples in the existing material pass; four on low quality.
export const AURORA_VOLUME_GLSL=`
uniform float uAuroraSamples;
vec3 rainbowGlow(vec3 q,float phase){
 // One gradual 5-second color cycle, with broad overlapping hues.
 // Cosine is continuous at the loop boundary: no hard bands or color jumps.
 float hue=phase/6.2831853+dot(q,vec3(.095,.06,-.045));
 hue+=.035*sin(q.x*2.2+q.y*1.6-phase*.35);
 vec3 spectrum=.5+.5*cos(6.2831853*(hue+vec3(0.0,.6666667,.3333333)));
 vec3 pastel=mix(vec3(.48),spectrum,.62);
 float glow=.72+.28*(.5+.5*sin(q.x*1.6+q.z*1.3-phase*.4));
 return pastel*glow*.48;
}
vec3 auroraVolume(){
 if(uRainbow<.001)return vec3(0.0);
 vec3 incident=normalize(vSkinPoint-uLocalCamera);
 vec3 ray=refract(incident,normalize(vSkinNormal),1.0/1.36);
 vec3 radius=max(uBodyRadii,vec3(.04));
 float count=clamp(uAuroraSamples,4.0,8.0),stepLength=jellyPath(1.36)/count;
 vec3 light=vec3(0.0);
 for(int i=0;i<8;i++){
  if(float(i)>=count)break;
  float distance=(float(i)+.5)*stepLength;
  vec3 q=(vSkinPoint+ray*distance-uBodyCenter)/radius;
  float inside=1.0-smoothstep(.85,1.12,dot(q,q));
  light+=rainbowGlow(q,uFilmPhase)*inside*exp(-distance*.32)*stepLength;
 }
 return min(light,vec3(1.3))*uRainbow;
}
`;
