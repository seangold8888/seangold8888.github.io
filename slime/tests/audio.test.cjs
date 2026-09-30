const{test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const load=import('data:text/javascript;base64,'+fs.readFileSync(path.join(__dirname,'../src/audio.js')).toString('base64'));
test('color bells play five pentatonic notes, stay bounded and respect mute',async()=>{const{jellyAudio}=await load,frequencies=[],oscillators=[];
 const param=()=>({value:0,setValueAtTime(){},setTargetAtTime(){},exponentialRampToValueAtTime(){}}),node=()=>({connect(n){return n;},disconnect(){}});
 class Context{constructor(){this.state='running';this.currentTime=0;this.destination=node();}createGain(){return{...node(),gain:param()};}createDynamicsCompressor(){return{...node(),threshold:param(),knee:param(),ratio:param()};}
  createOscillator(){const frequency=param();frequency.setValueAtTime=f=>frequencies.push(f);const o={...node(),frequency,start(){},stop(){}};oscillators.push(o);return o;}resume(){return Promise.resolve();}}
 const oldWindow=global.window,oldStorage=global.localStorage;global.window={AudioContext:Context};global.localStorage={getItem:()=>null,setItem(){}};
 try{const a=jellyAudio();a.play('note',0);assert.equal(oscillators.length,0);a.toggle();oscillators.splice(0).forEach(o=>o.onended?.());frequencies.length=0;
  for(let i=0;i<5;i++)a.play('note',i);assert.deepEqual(frequencies.filter((_,i)=>i%2===0),[523.25,587.33,659.25,783.99,880]);
  for(let i=0;i<50;i++)a.play('note',4);assert.equal(a.state().voices,24);a.toggle();const before=oscillators.length;a.play('note',0);assert.equal(oscillators.length,before);
  oscillators.forEach(o=>o.onended?.());assert.equal(a.state().voices,0);
 }finally{global.window=oldWindow;global.localStorage=oldStorage;}});
