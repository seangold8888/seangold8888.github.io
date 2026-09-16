(function(root){
'use strict';
// Original instrumental birthday waltz: celesta melody, plucked bass and soft chords.
const melody=[72,76,79,81,79,76,74,77,81,83,81,77,76,79,84,83,81,79,77,76,74,72,74,67];
function create(env,changed=()=>{}){
 let ctx=null,timer=null,beat=0,next=0,generation=0;const voices=new Set();
 const hz=n=>440*Math.pow(2,(n-69)/12);
 function note(midi,time,length,volume,type='sine'){
  const o=ctx.createOscillator(),g=ctx.createGain();o.type=type;o.frequency.value=hz(midi);
  g.gain.setValueAtTime(.0001,time);g.gain.exponentialRampToValueAtTime(volume,time+.012);g.gain.exponentialRampToValueAtTime(.0001,time+length);
  o.connect(g);g.connect(ctx.destination);voices.add(o);o.onended=()=>{voices.delete(o);o.disconnect();g.disconnect();};o.start(time);o.stop(time+length+.03);
 }
 function schedule(){if(!ctx)return;while(next<ctx.currentTime+.18){
  const bar=Math.floor(beat/3),chords=[[48,60,64,67],[53,60,65,69],[55,62,67,71],[48,60,64,67]],chord=chords[Math.floor(bar/2)%4];
  note(melody[beat%melody.length],next,.43,.065,'triangle');
  if(beat%3===0)note(chord[0],next,.65,.035);else chord.slice(1).forEach(n=>note(n,next,.3,.018));
  next+=60/108;beat++;
 }}
 function stop(){generation++;if(timer!==null)env.clearInterval(timer);timer=null;const old=ctx;ctx=null;for(const o of voices){o.onended=null;try{o.stop();o.disconnect();}catch(_){}}voices.clear();if(old)try{const p=old.close();if(p&&p.catch)p.catch(()=>{});}catch(_){}changed(false);}
 async function start(){stop();const id=generation;const AC=env.AudioContext||env.webkitAudioContext;if(!AC){changed(false,'이 브라우저에서는 음악을 켤 수 없어요.');return false;}
  try{ctx=new AC();await ctx.resume();if(id!==generation||!ctx)return false;beat=0;next=ctx.currentTime+.04;schedule();timer=env.setInterval(schedule,70);changed(true);return true;}catch(_){if(id===generation){stop();changed(false,'음악을 켜지 못했어요. 다시 눌러 주세요.');}return false;}
 }
 function effect(notes){if(!ctx||ctx.state!=='running')return;notes.forEach((f,i)=>note(69+12*Math.log2(f/440),ctx.currentTime+i*.1,.2,.045));}
 const hide=()=>{if(env.document.hidden)stop();};env.document.addEventListener('visibilitychange',hide);env.addEventListener('pagehide',stop);
 return {start,stop,effect,get playing(){return !!ctx;},destroy(){stop();env.document.removeEventListener('visibilitychange',hide);env.removeEventListener('pagehide',stop);}};
}
const api={create,melody,bpm:108};if(typeof module!=='undefined'&&module.exports)module.exports=api;else root.PartyMusic=api;
})(globalThis);
