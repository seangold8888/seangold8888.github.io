// Shared limits and CPU reference equations for the GPU jelly optics.
export const OPTICS_BUDGET=Object.freeze({touchSize:128,desktopSize:192,hz:30,extent:7,maxFocus:8});
export function beerLambert(color,path,distance){
 if(!Number.isFinite(path)||path<0||!(distance>0))throw new RangeError('Invalid optical path');
 return color.map(c=>Math.exp(Math.log(Math.max(.001,Math.min(1,c)))*path/distance));
}
export function refractRay(incident,normal,eta){
 const dot=incident.reduce((sum,v,i)=>sum+v*normal[i],0),k=1-eta*eta*(1-dot*dot);
 return k<0?null:incident.map((v,i)=>eta*v-(eta*dot+Math.sqrt(k))*normal[i]);
}
export function ellipsoidExit(point,ray,center,radii){
 const q=point.map((v,i)=>(v-center[i])/Math.max(.04,radii[i])),d=ray.map((v,i)=>v/Math.max(.04,radii[i]));
 const a=d.reduce((s,v)=>s+v*v,0),b=2*q.reduce((s,v,i)=>s+v*d[i],0),c=q.reduce((s,v)=>s+v*v,0)-1;
 if(a<1e-8||b*b-4*a*c<0)return 0;
 return Math.max(0,(-b+Math.sqrt(b*b-4*a*c))/(2*a));
}
