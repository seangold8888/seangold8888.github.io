const {test}=require('node:test');
const assert=require('node:assert/strict');
const music=require('../party/music.js');
function fixture(){
 const events={},docEvents={},contexts=[],timers=new Set();let pending=null;
 class AC{
  constructor(){this.currentTime=0;this.state='running';this.destination={};this.notes=0;contexts.push(this);}
  resume(){return pending||Promise.resolve();}
  close(){this.state='closed';return Promise.resolve();}
  createOscillator(){this.notes++;return {frequency:{},connect(){},disconnect(){},start(){},stop(){}};}
  createGain(){return {gain:{setValueAtTime(){},exponentialRampToValueAtTime(){}},connect(){},disconnect(){}};}
 }
 const env={AudioContext:AC,document:{hidden:false,addEventListener:(n,f)=>docEvents[n]=f,removeEventListener:n=>delete docEvents[n]},addEventListener:(n,f)=>events[n]=f,removeEventListener:n=>delete events[n],setInterval:f=>{timers.add(f);return f;},clearInterval:f=>timers.delete(f)};
 return {env,contexts,timers,events,docEvents,defer(){let resolve;pending=new Promise(r=>resolve=r);return resolve;}};
}
test('birthday music is opt-in, schedules notes and closes on hide without automatic restart',async()=>{
 const f=fixture(),p=music.create(f.env);assert.equal(f.contexts.length,0);
 assert.equal(await p.start(),true);assert.ok(f.contexts[0].notes>=2);assert.equal(f.timers.size,1);
 f.env.document.hidden=true;f.docEvents.visibilitychange();assert.equal(f.contexts[0].state,'closed');assert.equal(f.timers.size,0);assert.equal(p.playing,false);
 f.env.document.hidden=false;f.docEvents.visibilitychange();assert.equal(p.playing,false);
 await p.start();f.events.pagehide();assert.equal(f.contexts[1].state,'closed');p.destroy();assert.deepEqual(f.events,{});
});
test('leaving while audio resume is pending cannot restart music',async()=>{
 const f=fixture(),resolve=f.defer(),p=music.create(f.env),started=p.start();p.stop();resolve();assert.equal(await started,false);assert.equal(f.timers.size,0);assert.equal(p.playing,false);
});
test('unsupported audio fails gracefully',async()=>{
 const f=fixture();delete f.env.AudioContext;const p=music.create(f.env);assert.equal(await p.start(),false);assert.equal(p.playing,false);
});
