(function (root, factory) {
  const api = factory();
  if (typeof module === "object" && module.exports) module.exports = api;
  if (root) root.CardCombatCinema = api;
})(typeof globalThis !== "undefined" ? globalThis : this, function () {
  "use strict";
  const CONFIG = Object.freeze({maxPixels: 520000, dprCap: 1.25, impactTailMs: 320});
  function profileForPlan(plan) {
    if (!plan || plan.outcome === "support" || plan.kind === "aura") return "";
    if (["⚡", "🌩️", "🌩"].includes(plan.emoji)) return "lightning";
    if (["❄️", "❄", "🧊", "🌨️"].includes(plan.emoji) || plan.material === "ice") return "frost";
    if (["⚔️", "⚔", "🗡️", "🗡"].includes(plan.emoji) || plan.material === "metal") return "blade";
    return "";
  }
  function resolution(width, height, dpr, quality) {
    const scale = Math.min(CONFIG.dprCap, Math.max(.5, dpr || 1), Math.sqrt(CONFIG.maxPixels / Math.max(1,width*height))) * (quality || 1);
    return {width: Math.max(1,Math.floor(width*scale)), height: Math.max(1,Math.floor(height*scale))};
  }
  const VERTEX = "attribute vec2 aPosition; varying vec2 vUv; void main(){vUv=aPosition*.5+.5;gl_Position=vec4(aPosition,0.,1.);}";
  const FRAGMENT = `
#ifdef GL_FRAGMENT_PRECISION_HIGH
precision highp float;
#else
precision mediump float;
#endif
varying vec2 vUv;
uniform vec2 uSize,uStart,uEnd;
uniform float uAge,uContact,uTravel,uStyle,uStrong,uBlocked;
float line(vec2 p,vec2 a,vec2 b){vec2 d=(b-a)*.001;vec2 q=(p-a)*.001;return length(q-d*clamp(dot(q,d)/max(dot(d,d),.000001),0.,1.))*1000.;}
float ring(vec2 p,float r,float w){return exp(-abs(length(p)-r)/w);}
float zig(float x){return abs(fract(x)*2.-1.)*2.-1.;}
void main(){
 vec2 p=vec2(vUv.x,1.-vUv.y)*uSize;
 vec2 axis=uEnd-uStart;float len=max(length(axis*.001)*1000.,1.);vec2 dir=axis/len;vec2 side=vec2(-dir.y,dir.x);
 float progress=clamp(uAge/max(.05,uTravel),0.,1.);
 float charge=sin(min(progress*2.5,1.)*1.57)*(1.-smoothstep(.25,.8,progress));
 float launched=smoothstep(.12,.4,progress)*(1.-smoothstep(.86,1.,progress));
 float hit=step(0.,uContact);float t=max(0.,uContact);float fade=(1.-smoothstep(.04,.32,t))*hit;
 float radius=mix(120.,165.,uStrong);
 vec2 q=(p-uEnd)/radius;
 vec3 color=uStyle<.5?vec3(.23,.62,1.):uStyle<1.5?vec3(1.,.63,.18):vec3(.40,.83,1.);
 float light=0.;float core=0.;
 vec2 startQ=(p-uStart)/radius;
 light+=charge*(ring(startQ,.25+.1*progress,.026)*.32+exp(-length(startQ)*12.)*.3);
 if(uStyle<.5){
   float along=clamp(dot(p-uStart,dir)/len,0.,1.);
   float wave=(zig(along*9.+floor(uAge*12.)*.13)*.8+zig(along*23.-.3)*.28)*sin(along*3.14159);
   float dist=abs(dot(p-uStart,side)-wave*24.);
   float mask=step(0.,dot(p-uStart,dir))*step(dot(p-uStart,dir),len*min(1.,progress*1.65));
   light+=exp(-dist/13.)*mask*launched*.6;
   core+=exp(-dist/1.7)*mask*launched;
   for(int i=0;i<3;i++){
     float f=float(i);vec2 tip=uEnd+vec2(cos(f*2.3+.4),sin(f*2.3+.4))*radius*(.5+t);
     float d=line(p,uEnd,tip);
     light+=exp(-d/4.)*fade*.2;
   }
 }else if(uStyle<1.5){
   vec2 bladeCenter=mix(uStart,uEnd,smoothstep(.16,.92,progress));
   vec2 b=(p-bladeCenter)/radius;
   float arc=abs(length(vec2(b.x,b.y*1.35))-.67);
   float cut=smoothstep(-.6,.25,b.x)*(1.-smoothstep(-.5,.8,b.y));
   light+=exp(-arc/.055)*cut*launched*.9;
   core+=exp(-arc/.013)*cut*launched;
   float slash=line(q,vec2(-.72,.56),vec2(.72,-.56));
   core+=exp(-slash/.014)*fade;
   light+=exp(-slash/.1)*fade*.65;
 }else{
   vec2 center=mix(uStart,uEnd,smoothstep(.18,.95,progress));
   vec2 b=p-center;vec2 needle=vec2(dot(b,dir),dot(b,side));
   float crystal=abs(needle.x)/52.+abs(needle.y)/11.;
   light+=exp(-abs(crystal-1.)*3.)*launched*.6;
   core+=exp(-abs(crystal-1.)*15.)*launched*.7;
   for(int i=0;i<6;i++){
     float a=float(i)*1.0472+.25;vec2 ray=vec2(cos(a),sin(a));
     float shard=line(q,ray*.08,ray*(.45+t*.9));
     light+=exp(-shard/.032)*fade*.35;core+=exp(-shard/.008)*fade*.32;
   }
 }
 float ripple=ring(vec2(q.x,q.y*1.2),.36+t*2.65,.022+t*.035);
 light+=(ripple*.62+exp(-dot(q,q)*9.)*.7)*fade;
 core+=exp(-dot(q,q)*100.)*fade*.8;
 float strength=mix(1.,.42,uBlocked);
 float alpha=clamp((light+core*.65)*strength,0.,.82);
 vec3 rgb=mix(color,vec3(1.,.97,.90),clamp(core,0.,.85));
 gl_FragColor=vec4(rgb*alpha,alpha);
}`;
  function create(canvas) {
    let gl=null, program=null, buffer=null, uniforms=null, frame=0, active=null, quality=1, last=0, slow=0, unavailable=false;
    const stats={frames:0,quality:1,backend:"idle",lastProfile:"",contactAt:null};
    function clear(){if(gl&&!gl.isContextLost())gl.clear(gl.COLOR_BUFFER_BIT);}
    function reset(){cancelAnimationFrame(frame);frame=0;active=null;last=0;clear();}
    function init(){
      if(program)return true;
      if(unavailable)return false;
      try {
        gl=canvas.getContext("webgl",{alpha:true,antialias:false,depth:false,stencil:false,premultipliedAlpha:true,powerPreference:"low-power"});
        if(!gl){unavailable=true;stats.backend="fallback";return false;}
        const compile=(type,source)=>{const s=gl.createShader(type);gl.shaderSource(s,source);gl.compileShader(s);return s;};
        const vs=compile(gl.VERTEX_SHADER,VERTEX),fs=compile(gl.FRAGMENT_SHADER,FRAGMENT);
        program=gl.createProgram();gl.attachShader(program,vs);gl.attachShader(program,fs);gl.bindAttribLocation(program,0,"aPosition");gl.linkProgram(program);
        const linked=gl.getProgramParameter(program,gl.LINK_STATUS);
        gl.deleteShader(vs);gl.deleteShader(fs);
        if(!linked){gl.deleteProgram(program);program=null;throw Error("shader link failed");}
        gl.useProgram(program);buffer=gl.createBuffer();gl.bindBuffer(gl.ARRAY_BUFFER,buffer);
        gl.bufferData(gl.ARRAY_BUFFER,new Float32Array([-1,-1,3,-1,-1,3]),gl.STATIC_DRAW);
        gl.enableVertexAttribArray(0);gl.vertexAttribPointer(0,2,gl.FLOAT,false,0,0);
        uniforms={};for(const key of ["Size","Start","End","Age","Contact","Travel","Style","Strong","Blocked"])uniforms[key]=gl.getUniformLocation(program,"u"+key);
        gl.clearColor(0,0,0,0);stats.backend="webgl";return true;
      }catch(_){unavailable=true;stats.backend="fallback";return false;}
    }
    function draw(now){
      frame=0;if(!active||document.hidden)return reset();
      const age=(now-active.started)/1000;
      if(age>active.plan.totalMs/1000+.04)return reset();
      if(last&&now-last>30)slow++;else slow=Math.max(0,slow-1);
      last=now;
      if(slow>=6&&quality> .65){quality=.65;stats.quality=quality;resize(active.width,active.height);}
      const a=active;gl.useProgram(program);clear();
      gl.uniform2f(uniforms.Size,a.width,a.height);gl.uniform2f(uniforms.Start,a.points.startX,a.points.startY);gl.uniform2f(uniforms.End,a.points.endX,a.points.endY);
      gl.uniform1f(uniforms.Age,age);gl.uniform1f(uniforms.Contact,a.contact===null?-1:(now-a.contact)/1000);
      gl.uniform1f(uniforms.Travel,Math.max(.05,a.plan.impactAtMs/1000));gl.uniform1f(uniforms.Style,["lightning","blade","frost"].indexOf(a.profile));
      gl.uniform1f(uniforms.Strong,a.plan.big||a.plan.weakness?1:0);gl.uniform1f(uniforms.Blocked,a.plan.outcome==="blocked"?1:0);
      gl.drawArrays(gl.TRIANGLES,0,3);stats.frames++;frame=requestAnimationFrame(draw);
    }
    function resize(width,height){const size=resolution(width,height,window.devicePixelRatio,quality);canvas.width=size.width;canvas.height=size.height;gl.viewport(0,0,size.width,size.height);}
    canvas.addEventListener("webglcontextlost",event=>{event.preventDefault();cancelAnimationFrame(frame);frame=0;active=null;program=null;buffer=null;stats.backend="lost";});
    canvas.addEventListener("webglcontextrestored",()=>{unavailable=false;gl=null;stats.backend="idle";});
    const motion=window.matchMedia("(prefers-reduced-motion: reduce)");
    if(motion.addEventListener)motion.addEventListener("change",()=>{if(motion.matches)reset();});
    document.addEventListener("visibilitychange",()=>{if(document.hidden)reset();});
    window.addEventListener("resize",reset);
    window.addEventListener("pagehide",reset);
    return {
      start(plan,points){
        reset();const profile=profileForPlan(plan);
        if(!profile||motion.matches||document.hidden||!init())return false;
        const rect=canvas.getBoundingClientRect();if(!rect.width||!rect.height)return false;
        resize(rect.width,rect.height);stats.lastProfile=profile;stats.contactAt=null;
        active={plan,points,profile,width:rect.width,height:rect.height,started:performance.now(),contact:null};frame=requestAnimationFrame(draw);return true;
      },
      impact(plan){if(active&&active.plan===plan&&["hit","blocked"].includes(plan.outcome)){active.contact=performance.now();stats.contactAt=active.contact;}},
      reset,
      inspect(){return {...stats,active:!!active,width:canvas.width,height:canvas.height};}
    };
  }
  return Object.freeze({create,profileForPlan,resolution,CONFIG,VERTEX,FRAGMENT});
});
