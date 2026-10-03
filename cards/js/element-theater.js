(function(root,factory){const api=factory();if(typeof module==='object'&&module.exports)module.exports=api;else root.CardElementTheater=api;})(typeof globalThis!=='undefined'?globalThis:this,function(){'use strict';
 const PALETTES=Object.freeze({wood:['#56eea7','#baffe0','#207e68'],fire:['#ff963e','#ffe8a8','#e34752'],water:['#5bccff','#d4fbff','#536edb'],metal:['#cddded','#ffffff','#7189af'],earth:['#e7b967','#fff0c1','#996f49'],aether:['#ca9bff','#fff1ff','#7959c3']});
 const MAX_PIXELS=420000,TAIL=460;
 function profile(plan){if(!plan||plan.outcome==='support'||plan.kind==='aura')return '';return PALETTES[plan.element]?plan.element:plan.ultimate?'aether':'';}
 function resolution(w,h,dpr){const scale=Math.min(1.2,Math.max(.5,dpr||1),Math.sqrt(MAX_PIXELS/Math.max(1,w*h)));return {width:Math.max(1,Math.floor(w*scale)),height:Math.max(1,Math.floor(h*scale))};}
 function canImpact(plan){return !!plan&&plan.targetImpact!==false&&(plan.outcome==='hit'||plan.outcome==='blocked');}
 function create(arena){
  const canvas=document.createElement('canvas');canvas.className='element-theater';canvas.setAttribute('aria-hidden','true');arena.appendChild(canvas);
  const ctx=canvas.getContext('2d',{alpha:true}),motion=window.matchMedia('(prefers-reduced-motion: reduce)');let active=null,frame=0,quality=1,slow=0,last=0;
  const stats={active:false,profile:'',contactAt:null,frames:0,quality:1};
  function reset(){cancelAnimationFrame(frame);frame=0;active=null;stats.active=false;last=0;if(ctx){ctx.setTransform(1,0,0,1,0,0);ctx.clearRect(0,0,canvas.width,canvas.height);}arena.classList.remove('ultimate-spotlight');}
  function stroke(color,width,draw){ctx.strokeStyle=color;ctx.lineWidth=width;ctx.beginPath();draw();ctx.stroke();}
  function glow(x,y,r,color,alpha){ctx.save();ctx.globalAlpha*=alpha;const g=ctx.createRadialGradient(x,y,0,x,y,r);g.addColorStop(0,color);g.addColorStop(.25,color+'88');g.addColorStop(1,color+'00');ctx.fillStyle=g;ctx.fillRect(x-r,y-r,r*2,r*2);ctx.restore();}
  function leaf(x,y,size,angle,color){ctx.save();ctx.translate(x,y);ctx.rotate(angle);ctx.fillStyle=color;ctx.beginPath();ctx.moveTo(-size,0);ctx.quadraticCurveTo(0,-size,size,0);ctx.quadraticCurveTo(0,size,-size,0);ctx.fill();ctx.restore();}
  function shard(x,y,size,angle,color){ctx.save();ctx.translate(x,y);ctx.rotate(angle);ctx.fillStyle=color;ctx.beginPath();ctx.moveTo(-size,-size*.4);ctx.lineTo(size*.3,-size*.8);ctx.lineTo(size,size*.3);ctx.lineTo(-size*.2,size*.7);ctx.closePath();ctx.fill();ctx.restore();}
  function draw(now){if(!active||!ctx)return;const a=active,age=now-a.started,contact=a.contact===null?-1:now-a.contact;
   if(document.hidden||motion.matches||age>Math.max(a.plan.totalMs,a.plan.impactAtMs+TAIL)+120){reset();return;}
   if(last&&now-last>32){if(++slow>5){quality=.65;stats.quality=quality;}}else slow=Math.max(0,slow-1);last=now;
   ctx.setTransform(1,0,0,1,0,0);ctx.clearRect(0,0,canvas.width,canvas.height);ctx.setTransform(canvas.width/a.w,0,0,canvas.height/a.h,0,0);
   const p=a.points,c=PALETTES[a.profile],travel=Math.max(1,a.plan.impactAtMs),t=Math.min(1,age/travel),flight=Math.max(0,Math.min(1,(t-.18)/.82));
   const dx=p.endX-p.startX,dy=p.endY-p.startY,angle=Math.atan2(dy,dx),len=Math.max(1,Math.hypot(dx,dy)),nx=-dy/len,ny=dx/len;
   const size=Math.min(a.w*.4,a.h*.43,a.plan.ultimate?280:a.plan.big?240:200);
   if(a.plan.ultimate&&age<travel){ctx.fillStyle='rgba(12,8,30,.22)';ctx.fillRect(0,0,a.w,a.h);ctx.save();ctx.globalAlpha=Math.sin(Math.PI*Math.min(1,t/.85));ctx.fillStyle=c[1];ctx.textAlign='center';ctx.font='800 '+Math.max(18,Math.min(32,a.w*.055))+'px sans-serif';ctx.fillText(a.plan.attack,a.w/2,Math.max(34,a.h*.12),a.w*.85);ctx.restore();}
   if(contact<0&&t<1){
    const charge=(1-Math.min(1,t/.45));glow(p.startX,p.startY,size*.7,c[0],charge*.6);
    stroke(c[1],2,()=>ctx.arc(p.startX,p.startY,18+t*size*.5,-Math.PI*t,Math.PI*(1+t)));
    const x=p.startX+dx*flight,y=p.startY+dy*flight;
    ctx.save();ctx.globalAlpha=.82;ctx.lineCap='round';
    const count=Math.round(16*quality);
    if(a.profile==='wood'||a.profile==='water'){
      for(let lane=-1;lane<=1;lane+=2)stroke(c[lane===1?0:1],a.profile==='wood'?5:7,()=>{ctx.moveTo(p.startX,p.startY);for(let i=1;i<=24;i++){const f=flight*i/24,wave=Math.sin(f*Math.PI*4-age*.004)*Math.sin(f*Math.PI)*size*.18*lane;ctx.lineTo(p.startX+dx*f+nx*wave,p.startY+dy*f+ny*wave);}});
      for(let i=0;i<count;i++){const f=flight*i/count,off=Math.sin(f*12-age*.005)*size*.12,px=p.startX+dx*f+nx*off,py=p.startY+dy*f+ny*off;if(a.profile==='wood')leaf(px,py,5+i*.35,angle+i,c[i%2]);else stroke(c[1],2,()=>ctx.arc(px,py,2+i*.2,0,Math.PI*2));}
    }else if(a.profile==='metal'){
      for(let i=0;i<3;i++)stroke(c[i%2],i===0?8:3,()=>ctx.ellipse(x-nx*i*12,y-ny*i*12,size*.7,size*.25,angle+Math.PI/4,-2.6,.6));
    }else if(a.profile==='earth'){
      for(let i=0;i<count;i++){const f=Math.max(0,flight-i*.024),r=(count-i)/count*size*.11,off=Math.sin(i*2.3+age*.012)*i;shard(p.startX+dx*f+nx*off,p.startY+dy*f+ny*off,r,angle+i,c[i%2]);}
    }else{
      // A continuous tapered flame, not a row of opaque leaf-shaped stamps.
      ctx.save();ctx.translate(x,y);ctx.rotate(angle);const tail=Math.min(size*1.05,len*flight+12);
      for(let i=0;i<3;i++){const width=size*(.18-i*.05),length=tail*(1-i*.22),wave=Math.sin(age*.02+i)*width*.25;const gradient=ctx.createLinearGradient(-length,0,5,0);gradient.addColorStop(0,c[0]+'00');gradient.addColorStop(.55,c[i%2]+'99');gradient.addColorStop(1,c[1]);ctx.fillStyle=gradient;ctx.beginPath();ctx.moveTo(9,0);ctx.bezierCurveTo(-length*.18,-width,-length*.5,-width+wave,-length,wave);ctx.bezierCurveTo(-length*.5,width+wave,-length*.15,width,9,0);ctx.fill();}
      ctx.restore();
      for(let i=0;i<count;i++){const f=Math.max(0,flight-i*.028),off=Math.sin(i*2.3+age*.012)*size*.12;ctx.globalAlpha=.7*(1-i/count);leaf(p.startX+dx*f+nx*off,p.startY+dy*f+ny*off,3+(i%3),angle,c[i%2]);}
      ctx.globalAlpha=.82;
    }
    glow(x,y,size*.55,c[0],.6);ctx.restore();
   }
   if(contact>=0&&contact<TAIL){
    const q=contact/TAIL,fade=(1-q)*(a.plan.outcome==='blocked'?.4:1),radius=size*(.42+q*.93);ctx.save();ctx.globalAlpha=fade;
    glow(p.endX,p.endY,size*.78,c[0],.32);
    for(let i=0;i<(a.profile==='water'?3:2);i++)stroke(c[i%2],Math.max(1,5-i-q*3),()=>ctx.ellipse(p.endX,p.endY,radius*(1-i*.17),radius*(a.profile==='earth'?.34:.72)*(1-i*.17),angle,0,Math.PI*2));
    const count=Math.round((a.plan.ultimate?28:20)*quality);
    for(let i=0;i<count;i++){const theta=i*2.399963+angle,spread=radius*(.55+(i%5)*.13),x=p.endX+Math.cos(theta)*spread,y=p.endY+Math.sin(theta)*spread;const r=(1-q)*(4+i%4)*1.5;
      if(a.profile==='wood')leaf(x,y,r*1.5,theta+q*2,c[i%2]);
      else if(a.profile==='earth')shard(x,y+q*q*35,r,theta+q*3,c[i%3]);
      else if(a.profile==='water'){stroke(c[1],2,()=>ctx.arc(x,y,r,0,6.3));}
      else {stroke(c[i%2],a.profile==='metal'?2:3,()=>{ctx.moveTo(x,y);ctx.lineTo(x+Math.cos(theta)*r*3,y+Math.sin(theta)*r*3);});}
    }
    if(a.profile==='metal')for(let i=0;i<2;i++)stroke(c[1],3,()=>{const a1=angle+(i?-.6:.6);ctx.moveTo(p.endX-Math.cos(a1)*radius,p.endY-Math.sin(a1)*radius);ctx.lineTo(p.endX+Math.cos(a1)*radius,p.endY+Math.sin(a1)*radius);});
    ctx.restore();
   }
   stats.frames++;frame=requestAnimationFrame(draw);
  }
  document.addEventListener('visibilitychange',()=>{if(document.hidden)reset();});window.addEventListener('pagehide',reset);window.addEventListener('resize',reset);if(motion.addEventListener)motion.addEventListener('change',()=>{if(motion.matches)reset();});
  return {start(plan,points){reset();const style=profile(plan);if(!ctx||!style||motion.matches||document.hidden)return false;const box=arena.getBoundingClientRect();if(!box.width||!box.height)return false;const size=resolution(box.width,box.height,window.devicePixelRatio);canvas.width=size.width;canvas.height=size.height;active={plan,points,profile:style,w:box.width,h:box.height,started:performance.now(),contact:null};stats.active=true;stats.profile=style;stats.contactAt=null;if(plan.ultimate)arena.classList.add('ultimate-spotlight');frame=requestAnimationFrame(draw);return true;},impact(plan){if(active&&active.plan===plan&&canImpact(plan)){active.contact=performance.now();stats.contactAt=active.contact;}},reset,inspect(){return {...stats,width:canvas.width,height:canvas.height};}};
 }
 return Object.freeze({create,profile,resolution,canImpact,MAX_PIXELS,TAIL,PALETTES});
});
