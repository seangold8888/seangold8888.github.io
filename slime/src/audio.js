// Opt-in elastic synth. One context, no microphone, no third-party audio files.
export function jellyAudio(){
 let ctx,master,enabled=false,pitchScale=1;const voices=new Set();
 try{enabled=localStorage.getItem('slime:sound')==='on';}catch{}
 function unlock(){
  if(!enabled)return;
  if(!ctx){const AC=window.AudioContext||window.webkitAudioContext;if(!AC)return;ctx=new AC();master=ctx.createGain();master.gain.value=.55;
   const limiter=ctx.createDynamicsCompressor();limiter.threshold.value=-14;limiter.knee.value=18;limiter.ratio.value=4;master.connect(limiter).connect(ctx.destination);}
  if(ctx.state==='suspended')ctx.resume().catch(()=>{});
 }
 function voice(from,peak,to,duration,volume,delay=0,type='sine',wobble=0){
  if(!enabled||!ctx||ctx.state!=='running'||voices.size>=24)return;
  from*=pitchScale;peak*=pitchScale;to*=pitchScale;
  const o=ctx.createOscillator(),g=ctx.createGain(),lfo=ctx.createOscillator(),lg=ctx.createGain(),t=ctx.currentTime+delay;
  o.type=type;o.frequency.setValueAtTime(from,t);o.frequency.exponentialRampToValueAtTime(peak,t+duration*.2);o.frequency.exponentialRampToValueAtTime(Math.max(30,to),t+duration);
  g.gain.setValueAtTime(.0001,t);g.gain.exponentialRampToValueAtTime(Math.max(.001,volume),t+.008);g.gain.setTargetAtTime(.0001,t+duration*.18,duration*.21);
  lfo.frequency.value=11+Math.random()*4;lg.gain.setValueAtTime(wobble,t);lg.gain.exponentialRampToValueAtTime(.01,t+duration);
  lfo.connect(lg).connect(o.frequency);o.connect(g).connect(master);o.start(t);lfo.start(t);o.stop(t+duration+.05);lfo.stop(t+duration+.05);voices.add(o);
  o.onended=()=>{voices.delete(o);o.disconnect();g.disconnect();lfo.disconnect();lg.disconnect();};
 }
 function play(name,force=1){
  const k=Math.min(1,Math.max(.1,force/8)),pitch=.93+Math.random()*.14;
  if(name==='poke'){voice(420*pitch,900*pitch,520,.13,.12,0,'triangle',12);voice(900,1050,520,.12,.085,.05);}
  else if(name==='pet')voice(650,900,620,.17,.055,0,'sine',9);
  else if(name==='release'){const s=Math.min(1,force/2),f=150+s*60;voice(f,f*2.6,f*.8,.45+s*.35,.26,0,'sine',40+s*60);voice(f*2,f*3,f*1.5,.35,.045,.01,'triangle',10);}
  else if(name==='land'||name==='wall'){voice(200,230,70,.18,.04+.25*k);voice(170,380,140,.35+.2*k,.09+.08*k,.02,'sine',35);}
  else if(name==='jump')voice(260,650,820,.22,.16,0,'sine',20);
  else if(name==='wake')voice(500,1050,1100,.12,.11,0,'triangle',10);
  else if(name==='flavor'||name==='unlock')[520,650,780].forEach((f,i)=>voice(f,f*1.02,f,.26,.07,i*.06,'triangle',5));
  else if(name==='bubble'){voice(1000,1500,380,.11,.12);voice(1450,1600,900,.12,.05,.02);}
  else if(name==='ball')voice(220,480,140,.22,.17,0,'sine',30);
  else if(name==='trampoline')voice(180,780,950,.32,.18,0,'triangle',25);
  else if(name==='star')[784,1047].forEach((f,i)=>voice(f,f,f,.35,.09,i*.10));
  else if(name==='note'){const notes=[523.25,587.33,659.25,783.99,880],f=notes[Math.max(0,Math.min(4,Math.round(force)))];voice(f,f,f,.65,.16);voice(f*2,f*2,f*2,.38,.035,.004);}
 }
 function quiet(){if(ctx&&master)master.gain.setValueAtTime(0,ctx.currentTime);}
 function wake(){if(enabled&&ctx&&master)master.gain.setTargetAtTime(.55,ctx.currentTime,.015);}
 function toggle(){enabled=!enabled;try{localStorage.setItem('slime:sound',enabled?'on':'off');}catch{}if(enabled){unlock();wake();play('poke');}else quiet();return enabled;}
 return{unlock,play,toggle,quiet,wake,feel:p=>{pitchScale=Math.max(.7,Math.min(1.4,p||1));},get enabled(){return enabled;},state:()=>({enabled,context:ctx?.state??'not-created',voices:voices.size,pitch: pitchScale})};
}
