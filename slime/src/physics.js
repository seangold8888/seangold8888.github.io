// Fixed-step, seam-shared soft body. Pure math: usable without WebGL in tests.
export const clamp=(n,a,b)=>Math.max(a,Math.min(b,n));
export function createJelly(rings=18,segments=36) {
  let units=[],tri=[];
  if(typeof rings==='object'){units=rings.unit;tri=rings.indices;}
  else {
    units=[0,1,0];
    for(let i=1;i<rings;i++)for(let j=0;j<segments;j++){const p=Math.PI*i/rings,a=2*Math.PI*j/segments;units.push(Math.sin(p)*Math.sin(a),Math.cos(p),Math.sin(p)*Math.cos(a));}
    const bottom=units.length/3;units.push(0,-1,0);
    const node=(i,j)=>1+(i-1)*segments+(j+segments)%segments;
    for(let j=0;j<segments;j++)tri.push(0,node(1,j),node(1,j+1));
    for(let i=1;i<rings-1;i++)for(let j=0;j<segments;j++){const a=node(i,j),b=node(i,j+1),c=node(i+1,j),d=node(i+1,j+1);tri.push(a,c,b,b,c,d);}
    for(let j=0;j<segments;j++)tri.push(node(rings-1,j),bottom,node(rings-1,j+1));
  }
  const unit=new Float32Array(units),indices=new Uint16Array(tri),N=unit.length/3,rest=new Float32Array(unit.length);
  for(let i=0;i<N;i++){
    const n=i*3,y=unit[n+1],base=clamp((.75-y)/1.3,0,1),tip=clamp((y-.3)/.7,0,1),wide=1+.11*base*base*(3-2*base)-.05*tip*tip*(3-2*tip),raw=y*(y<0?.92:1.08),h=clamp(.5+.5*(raw+.7)/.2,0,1);
    rest[n]=unit[n]*1.16*1.06*wide;rest[n+1]=(-.7+(raw+.7)*h+.2*h*(1-h))*1.16+.812;
    rest[n+2]=unit[n+2]*1.16*.98*wide;
  }
  const sets=Array.from({length:N},()=>new Set());
  for(let i=0;i<indices.length;i+=3){const a=indices[i],b=indices[i+1],c=indices[i+2];sets[a].add(b).add(c);sets[b].add(a).add(c);sets[c].add(a).add(b);}
  const offsets=new Uint32Array(N+1);for(let i=0;i<N;i++)offsets[i+1]=offsets[i]+sets[i].size;
  const neighbours=new Uint16Array(offsets[N]);sets.forEach((s,i)=>neighbours.set([...s],offsets[i]));
  // Rest-shape mobility and graph degree do not change: keep them out of the 240 Hz loop.
  const mobility=new Float64Array(N),inverseDegree=new Float64Array(N);
  for(let i=0;i<N;i++){const t=clamp(rest[i*3+1]/2.065,0,1);mobility[i]=.25+.75*t*t*(3-2*t);inverseDegree[i]=1/(offsets[i+1]-offsets[i]);}
  const disp=new Float32Array(unit.length),vel=new Float32Array(unit.length),deltaVelocity=new Float32Array(unit.length),position=rest.slice(),weights=new Float32Array(N);
  const body={x:0,y:0,z:0,vx:0,vy:0,vz:0},events=[],bounds={x:3.8,zMin:-1.8,zMax:2.0,yMax:4};
  const H=1/240;let q=0,qv=0,target=0,held=null,accumulator=0,queuedJump=null,spring=1,damping=1,ground=0;
  function setGround(y=0){ground=clamp(Number.isFinite(y)?y:0,0,.5);body.y=Math.max(ground,body.y);}
  function feel(s=1,d=1){spring=clamp(Number.isFinite(s)?s:1,.65,1.25);damping=clamp(Number.isFinite(d)?d:1,.9,1.8);}
  function state(){let max=0;for(const d of disp)max=Math.max(max,Math.abs(d));return{body:{...body},squash:q,held:!!held,vertices:N,maxDeformation:max};}
  function reset(){Object.assign(body,{x:0,y:0,z:0,vx:0,vy:0,vz:0});disp.fill(0);vel.fill(0);q=qv=target=accumulator=ground=0;held=queuedJump=null;events.length=0;write();}
  function grab(i,cursor){
    const a=i*3,sigma=.42,limit=9*sigma*sigma;for(let j=0;j<N;j++){const b=j*3,d2=(rest[b]-rest[a])**2+(rest[b+1]-rest[a+1])**2+(rest[b+2]-rest[a+2])**2;weights[j]=d2<limit?Math.exp(-d2/(2*sigma*sigma)):0;}
    queuedJump=null;
    held={i,anchor:[position[a],position[a+1],position[a+2]],cursor:{...cursor},peak:0};
  }
  function move(cursor){if(held)held.cursor={...cursor};}
  function release(v={x:0,y:0,z:0}){
    if(!held)return;const stretch=held.peak;held=null;
    const speed=Math.hypot(v.x,v.y,v.z),scale=speed>16?16/speed:1;
    body.vx=body.vx*.3+v.x*scale*.95;body.vy=body.vy*.3+v.y*scale*.95;body.vz=body.vz*.3+v.z*scale*.95;
    qv+=Math.min(3,stretch*1.4);target=0;
  }
  function poke(i,force=1){
    const a=i*3,sigma=.36,limit=9*sigma*sigma;for(let j=0;j<N;j++){const b=j*3,d2=(rest[b]-rest[a])**2+(rest[b+1]-rest[a+1])**2+(rest[b+2]-rest[a+2])**2;if(d2>=limit)continue;const w=Math.exp(-d2/(2*sigma*sigma));for(let k=0;k<3;k++)vel[b+k]-=unit[b+k]*w*force*4.2;}
    qv-=force*1.2;events.push({type:'poke',force});
  }
  function jump(power=8){if(body.y>ground+.12||held||queuedJump)return false;qv-=2.2;queuedJump={delay:.09,power};events.push({type:'jump',force:power/8});return true;}
  function step(h){
    if(queuedJump){queuedJump.delay-=h;if(queuedJump.delay<=0){body.vy=queuedJump.power;for(let i=0;i<N;i++)vel[i*3+1]-=queuedJump.power*mobility[i]*.55;queuedJump=null;}}
    const ox=body.vx,oy=body.vy,oz=body.vz;
    let gravityImpulse=0;
    if(held){
      const p=held.cursor,a=held.anchor;
      body.vx+=((clamp(p.x-a[0],-bounds.x,bounds.x)-body.x)*75-10*body.vx)*h;
      const lift=p.y-a[1],forward=Math.max(0,-lift)*1.25;
      body.vy+=((clamp(lift,ground,bounds.yMax)-body.y)*75-10*body.vy)*h;
      body.vz+=((clamp(p.z-a[2]+forward,bounds.zMin,bounds.zMax)-body.z)*75-10*body.vz)*h;
    }else{if(body.y>ground||body.vy>0){gravityImpulse=-26*h;body.vy+=gravityImpulse;}else{const drag=Math.exp(-2.4*h);body.vx*=drag;body.vz*=drag;}}
    body.x+=body.vx*h;body.y+=body.vy*h;body.z+=body.vz*h;
    if(body.y<ground){const force=-body.vy;body.y=ground;body.vy=force>2.8?force*.3:0;if(force>.5){qv-=force*.62;events.push({type:'land',force});}}
    for(const [axis,min,max] of [['x',-bounds.x,bounds.x],['z',bounds.zMin,bounds.zMax]]){
      if(body[axis]<min||body[axis]>max){const k='v'+axis,force=Math.abs(body[k]);body[axis]=clamp(body[axis],min,max);body[k]*=-.4;if(force>1.6){events.push({type:'wall',force});qv-=.6;}}
    }
    if(body.y>bounds.yMax){body.y=bounds.yMax;if(body.vy>0)body.vy*=-.3;}
    qv+=(-300*spring*(q-target)-4.6*damping*qv)*h;q=clamp(q+qv*h,-.5,.95);
    const sy=1+q,sx=1/Math.sqrt(sy),dv=[body.vx-ox,body.vy-oy-gravityImpulse,body.vz-oz];
    let tx=0,ty=0,tz=0;
    if(held){
      const a=held.i*3;tx=held.cursor.x-body.x-rest[a]*sx;ty=held.cursor.y-body.y-rest[a+1]*sy;tz=held.cursor.z-body.z-rest[a+2]*sx;
      // A dragged point cannot invert through the opposite side of the skin.
      const dot=tx*unit[a]+ty*unit[a+1]+tz*unit[a+2];if(dot<-.3){tx+=unit[a]*(-.3-dot);ty+=unit[a+1]*(-.3-dot);tz+=unit[a+2]*(-.3-dot);}
      const len=Math.hypot(tx,ty,tz),scale=len>1e-6?2.3*Math.tanh(len/2.3)/len:1;tx*=scale;ty*=scale;tz*=scale;held.peak=Math.max(held.peak,len);
    }
    // Evaluate all velocities before positions, preventing traversal-order bias.
    for(let i=0;i<N;i++){
      const b=i*3,start=offsets[i],end=offsets[i+1],mob=mobility[i],w=held?weights[i]:0;
      for(let k=0;k<3;k++){
        let nd=0,nv=0;for(let j=start;j<end;j++){const a=neighbours[j]*3+k;nd+=disp[a];nv+=vel[a];}const inv=inverseDegree[i];
        let acc=-300*spring*disp[b+k]-3.2*damping*vel[b+k]+900*spring*(nd*inv-disp[b+k])+8*damping*(nv*inv-vel[b+k]);
        if(held){const wish=k===0?tx:k===1?ty:tz;acc+=1300*w*(wish*w-disp[b+k])-16*w*vel[b+k];if(k===1){const lift=clamp(body.y/.7,0,1);acc-=26*lift*lift*(3-2*lift)*(1-w)*mob;}}
        deltaVelocity[b+k]=acc*h-dv[k]*mob;
      }
    }
    for(let i=0;i<N;i++){
      const b=i*3;for(let k=0;k<3;k++){vel[b+k]+=deltaVelocity[b+k];disp[b+k]=clamp(disp[b+k]+vel[b+k]*h,-2.3,2.3);}
      if(held){
        const inward=disp[b]*unit[b]+disp[b+1]*unit[b+1]+disp[b+2]*unit[b+2];
        if(inward<-.3){const push=-.3-inward;disp[b]+=unit[b]*push;disp[b+1]+=unit[b+1]*push;disp[b+2]+=unit[b+2]*push;}
      }
      const py=body.y+rest[b+1]*sy+disp[b+1]-ground;if(py<0){const radius=Math.hypot(unit[b],unit[b+2])||1;disp[b+1]-=py;vel[b+1]=Math.max(0,vel[b+1]);disp[b]+=unit[b]/radius*-py*.65;disp[b+2]+=unit[b+2]/radius*-py*.65;vel[b]*=.94;vel[b+2]*=.94;}
      // Local pressure, not just centre-of-mass bounce: a wall makes jelly splat.
      const wx=body.x+rest[b]*sx+disp[b],wz=body.z+rest[b+2]*sx+disp[b+2],edge=bounds.x+1.365;
      if(wx>edge){vel[b]-=(wx-edge)*900*h;if(vel[b]>0)vel[b]*=.8;}
      else if(wx<-edge){vel[b]+=(-edge-wx)*900*h;if(vel[b]<0)vel[b]*=.8;}
      if(wz<-4.6){vel[b+2]+=(-4.6-wz)*900*h;if(vel[b+2]<0)vel[b+2]*=.8;}
    }
  }
  function write(){const sy=1+q,sx=1/Math.sqrt(sy);for(let i=0;i<N;i++){const b=i*3;position[b]=rest[b]*sx+disp[b];position[b+1]=Math.max(ground-body.y,rest[b+1]*sy+disp[b+1]);position[b+2]=rest[b+2]*sx+disp[b+2];}}
  function advance(dt){accumulator+=clamp(dt,0,.05);let n=0;while(accumulator+1e-10>=H&&n++<12){step(H);accumulator-=H;}write();}
  return{unit,rest,indices,position,disp,body,bounds,events,advance,grab,move,release,poke,jump,reset,state,feel,setGround,get groundHeight(){return ground;},get squash(){return q;},stretch:v=>{target=clamp(v,-.45,.8);}};
}
