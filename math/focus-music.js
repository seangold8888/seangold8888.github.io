/* 재이의 수학놀이터 집중 음악 — 외부 음원 없이 Web Audio로 만드는 느린 무가사 배경음. */
(function (root) {
  "use strict";
  const BPM=66, BEAT=60/BPM;
  const NOTES={C4:261.63,D4:293.66,E4:329.63,G4:392,A4:440,C5:523.25,D5:587.33,E5:659.25};
  const HOME=["C5",null,"G4",null,"E5",null,"D5",null,"A4",null,"G4",null,"E4",null,"D4",null];
  const QUIZ=["C5",null,null,null,"G4",null,null,null,"E5",null,null,null,"D5",null,null,null];
  const ROOTS=["C4","A4","E4","G4"];
  function create(options){
    options=options||{};
    const Audio=options.AudioContext||root.AudioContext||root.webkitAudioContext;
    let ctx=null,master=null,timer=null,step=0,nextAt=0,scene="home",on=false;
    function ramp(param,value,at,duration){param.cancelScheduledValues(at);param.setValueAtTime(Math.max(.0001,param.value||.0001),at);param.exponentialRampToValueAtTime(Math.max(.0001,value),at+duration);}
    function voice(frequency,at,duration,volume,type){
      if(!ctx||!master)return;
      const osc=ctx.createOscillator(),gain=ctx.createGain();
      osc.type=type||"sine";osc.frequency.setValueAtTime(frequency,at);
      gain.gain.setValueAtTime(.0001,at);gain.gain.exponentialRampToValueAtTime(volume,at+.08);gain.gain.exponentialRampToValueAtTime(.0001,at+duration);
      osc.connect(gain);gain.connect(master);osc.start(at);osc.stop(at+duration+.05);
    }
    function scheduleBeat(at){
      const pattern=scene==="quiz"?QUIZ:HOME,note=pattern[step%pattern.length];
      if(note)voice(NOTES[note],at,scene==="quiz"?BEAT*1.6:BEAT*1.35,scene==="quiz"?.13:.16,"sine");
      if(step%8===0){const base=NOTES[ROOTS[Math.floor(step/8)%ROOTS.length]];voice(base/2,at,BEAT*7.5,scene==="quiz"?.045:.07,"sine");voice(base*1.5,at+.04,BEAT*6.8,scene==="quiz"?.025:.04,"triangle");}
      step++;
    }
    function tick(){if(!ctx||!on||scene==="rest")return;while(nextAt<ctx.currentTime+2.5){scheduleBeat(nextAt);nextAt+=BEAT;}}
    function ensure(){if(!Audio)return false;if(!ctx||ctx.state==="closed"){ctx=new Audio();master=ctx.createGain();master.gain.value=.0001;master.connect(ctx.destination);}return true;}
    function run(){if(!ctx||timer||scene==="rest")return;nextAt=Math.max(ctx.currentTime+.08,nextAt);tick();timer=root.setInterval(tick,900);}
    function enable(nextScene){if(nextScene)scene=nextScene;if(!ensure())return false;on=true;if(ctx.state==="suspended")ctx.resume();ramp(master.gain,scene==="quiz"?.022:scene==="home"?.032:.0001,ctx.currentTime,.6);run();return true;}
    function disable(){on=false;if(timer){root.clearInterval(timer);timer=null;}if(ctx&&master)ramp(master.gain,.0001,ctx.currentTime,.25);}
    function setScene(nextScene){scene=nextScene||"rest";if(!ctx||!on)return;if(scene==="rest"){ramp(master.gain,.0001,ctx.currentTime,.3);if(timer){root.clearInterval(timer);timer=null;}}else{ramp(master.gain,scene==="quiz"?.022:.032,ctx.currentTime,.45);run();}}
    function celebrate(){if(!ctx||!on||scene!=="quiz")return;["C5","E5"].forEach(function(name,i){voice(NOTES[name],ctx.currentTime+i*.11,.55,.13,"sine");});}
    function status(){return{supported:!!Audio,enabled:on,scene:scene,audioState:ctx?ctx.state:"none",bpm:BPM,step:step};}
    return{enable:enable,disable:disable,setScene:setScene,celebrate:celebrate,status:status};
  }
  const api={BPM:BPM,BEAT:BEAT,HOME:HOME,QUIZ:QUIZ,create:create};
  if(typeof module!=="undefined"&&module.exports)module.exports=api;else root.MathFocusMusic=api;
})(typeof window!=="undefined"?window:globalThis);
