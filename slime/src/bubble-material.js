import * as THREE from '../../kart3d/vendor/three.module.min.js';
// A clear soap-film shell, not a filled white ball. Shared by the six toys.
export function jellyBubbleMaterial(){return new THREE.ShaderMaterial({
 transparent:true,depthWrite:false,toneMapped:false,
 vertexShader:`
 varying vec3 filmNormal;
 varying vec3 filmView;
 void main(){
  vec4 view=modelViewMatrix*vec4(position,1.0);
  filmNormal=normalize(normalMatrix*normal);
  filmView=-view.xyz;
  gl_Position=projectionMatrix*view;
 }`,
 fragmentShader:`
 varying vec3 filmNormal;
 varying vec3 filmView;
 void main(){
  vec3 n=normalize(filmNormal),v=normalize(filmView);
  float grazing=1.0-clamp(dot(n,v),0.0,1.0);
  float rim=pow(grazing,1.65);
  // A restrained pearlescent tint around the rim leaves the centre clear.
  float tint=0.5+0.5*sin(n.x*4.0+n.y*3.0+grazing*5.0);
  vec3 film=mix(vec3(0.13,0.43,0.66),vec3(0.65,0.22,0.43),tint);
  film=mix(film,vec3(0.18,0.57,0.48),smoothstep(0.1,0.9,n.y)*0.45);
  film=mix(film,vec3(0.12,0.24,0.38),smoothstep(0.65,1.0,grazing)*0.25);
  float gloss=pow(max(0.0,dot(n,normalize(vec3(-0.42,0.56,0.72)))),42.0);
  gloss+=pow(max(0.0,dot(n,normalize(vec3(0.58,-0.25,0.77)))),85.0)*0.65;
  float alpha=clamp(0.025+rim*0.78+gloss*0.95,0.0,0.96);
  vec3 color=mix(film,vec3(1.0),clamp(gloss*1.8,0.0,1.0));
  gl_FragColor=vec4(color,alpha);
  #include <colorspace_fragment>
 }`
});}
