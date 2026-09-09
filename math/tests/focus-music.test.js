'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),Music=require('../focus-music.js');

class Param {
  constructor(){this.value=.0001;this.events=[];}
  cancelScheduledValues(at){this.events.push(['cancel',at]);}
  setValueAtTime(value,at){this.value=value;this.events.push(['set',value,at]);}
  exponentialRampToValueAtTime(value,at){this.value=value;this.events.push(['ramp',value,at]);}
}
class FakeAudio {
  constructor(){this.currentTime=0;this.state='running';this.destination={};this.oscillators=[];this.master=null;}
  createGain(){const node={gain:new Param(),connect(){}};if(!this.master)this.master=node;return node;}
  createOscillator(){const node={frequency:new Param(),connect(){},start(){},stop(){}};this.oscillators.push(node);return node;}
  resume(){this.state='running';return Promise.resolve();}
}

test('focus music is slow, lyric-free synthesis and quiz notes are intentionally sparse',()=>{
  assert.equal(Music.BPM,66);
  assert.equal(Music.BEAT,60/66);
  assert.ok(Music.QUIZ.filter(Boolean).length<Music.HOME.filter(Boolean).length);
  assert.equal(Music.QUIZ.length,Music.HOME.length);
});

test('music is opt-in, changes scene, schedules tones and stops cleanly',()=>{
  const engine=Music.create({AudioContext:FakeAudio});
  assert.deepEqual(engine.status(),{supported:true,enabled:false,scene:'home',audioState:'none',bpm:66,step:0});
  assert.equal(engine.enable('home'),true);
  assert.ok(engine.status().step>0);
  engine.setScene('quiz');assert.equal(engine.status().scene,'quiz');
  engine.celebrate();
  engine.setScene('rest');assert.equal(engine.status().scene,'rest');
  engine.disable();assert.equal(engine.status().enabled,false);
});

test('unsupported browsers remain silent instead of failing',()=>{
  const engine=Music.create({AudioContext:null});
  assert.equal(engine.enable('home'),false);
  assert.equal(engine.status().enabled,false);
});
