"use strict";
const test = require("node:test"), assert = require("node:assert/strict");
const fs = require("node:fs"), path = require("node:path");
const reading = require("../../assets/study/english-reading.js");
function target() {
  const listeners = {};
  return { listeners, addEventListener(n,f) { listeners[n]=f; }, removeEventListener(n,f) { if(listeners[n]===f) delete listeners[n]; },
    fire(n) { if (!this.disabled && listeners[n]) listeners[n](); } };
}
function node() {
  const classes = new Set();
  return Object.assign(target(), {children:[], textContent:"", disabled:false,
    appendChild(n) { this.children.push(n); }, setAttribute() {},
    classList:{ add:k=>classes.add(k), remove:k=>classes.delete(k), contains:k=>classes.has(k), toggle:(k,on)=>on?classes.add(k):classes.delete(k) } });
}
function setup(options={}) {
  let now=0, timerId=0, passes=0;
  const timers=new Map(), events=[], recognizers=[], audios=[], utterances=[], retries=[];
  const doc=Object.assign(target(),{hidden:false,createElement:node});
  class Recognition {
    constructor() { recognizers.push(this); }
    start() { events.push("start"); this.live=true; if(options.assertReleased)assert.ok(audios.every(a=>!a.src),'media src must be released before microphone start'); if(!options.neverStarts&&this.onstart)this.onstart(); }
    stop() { events.push("stop"); this.stopped=true; }
    end() { events.push("end");this.live=false; if(this.onend)this.onend(); }
    abort() {events.push("abort");this.live=false;}
  }
  class Audio {
    constructor(src) {this.src=src||"";this.paused=true;this.playing=false;audios.push(this);}
    getAttribute(name) {return name==='src'?this.src:null;}
    removeAttribute(name) {if(name==='src'){this.src='';events.push('release');}}
    load() {events.push("load");}
    pause() {this.playing=false;this.paused=true;events.push("pause");}
    play() {
      assert.ok(recognizers.every(r=>!r.live), "praise cannot play while mic is live");
      this.playing=true;this.paused=false;events.push("play:"+this.src);
      return options.rejectAudio ? Promise.reject(Error("blocked")) : Promise.resolve();
    }
  }
  const synth={ getVoices:()=>options.voices || [{lang:"ko-KR",localService:true},{lang:"en-US",localService:false},{name:"Samantha",lang:"en-US",localService:true}],
    speak(u) { assert.ok(recognizers.every(r=>!r.live)); events.push("speak:"+u.text);utterances.push(u); },
    cancel() {events.push("cancel");} };
  const env=Object.assign(target(),{document:doc,navigator:{onLine:true},isSecureContext:true,SpeechRecognition:Recognition,Audio,
    SpeechSynthesisUtterance:class {constructor(text){this.text=text;}},speechSynthesis:synth,
    setTimeout(fn,delay) {timers.set(++timerId,{fn,at:now+delay});return timerId;},clearTimeout:id=>timers.delete(id)});
  if(options.noAudio)env.Audio=null;
  function tick(ms) {
    const end=now+ms;
    while(true) {
      const entry=[...timers.entries()].filter(([,t])=>t.at<=end).sort((a,b)=>a[1].at-b[1].at)[0];
      if(!entry)break; timers.delete(entry[0]);now=entry[1].at;entry[1].fn();
    }
    now=end;
  }
  function mount(sentence=reading.sentences[0]) {
    const container=node();
    const view=reading.mount(container,sentence,()=>passes++,env,{onRetry:w=>retries.push(w)});
    return {container,view,mic:container.children[3].children[0],stop:container.children[3].children[1],status:container.children[4],words:container.children[1].children};
  }
  function result(text) {
    const result=Object.assign([{transcript:text}],{isFinal:true});
    recognizers.at(-1).onresult({results:[result]});
  }
  return {env,doc,events,recognizers,audios,utterances,retries,timers,tick,mount,result,passes:()=>passes};
}
test("first/retry praise pools, every third first-attempt pass and 100 nonrepeating draws",()=>{
  const session=reading.createFeedbackSession();
  const first=["excellent","perfect","awesome","wonderful"], retry=["great","verygood","youdidit","super"];
  for(let i=1;i<=100;i++) {
    const previous=session.lastClip, clip=reading.choosePraise(session,true,()=>0);
    assert.ok(i%3===0 ? clip==="threeinarow" : first.includes(clip));
    assert.notEqual(clip,previous);
  }
  for(let i=0;i<100;i++) {
    const previous=session.lastClip,clip=reading.choosePraise(session,false,()=>0);
    assert.ok(retry.includes(clip));assert.notEqual(clip,previous);assert.equal(session.streak,0);
  }
});
test("retry list follows sentence order, deduplicates, caps three, omits wholeLine",()=>{
  assert.deepEqual(reading.retryWords("I see a red flower.", "I"),["see","a","red"]);
  assert.deepEqual(reading.retryWords("Go go red red blue.", "green"),["go","red","blue"]);
  assert.deepEqual(reading.retryWords("I like apples.", "I like apples and milk"),[]);
});
test("word feedback waits for stop AND end; stale recognition cannot score speaker audio",()=>{
  const s=setup(),v=s.mount();v.mic.fire("click");
  const late=s.recognizers[0].onresult;
  assert.equal(s.audios.length,1);assert.equal(s.events.filter(e=>e==="load").length,0);
  assert.ok(!s.events.some(e=>e.startsWith("speak")));
  s.result("I like bananas");
  assert.equal(s.recognizers[0].stopped,true);
  assert.ok(!s.events.some(e=>e.startsWith("play:")));assert.equal(v.mic.disabled,true);
  s.recognizers[0].end();
  const audio=s.audios[0];
  assert.ok(audio.src.endsWith("assets/study/words/apples.mp3"));assert.equal(audio.playing,true);
  assert.ok(v.words[2].classList.contains("listening"));
  assert.equal(v.status.textContent,"이렇게 읽어요 👂 apples");
  assert.ok(s.events.indexOf("stop")<s.events.indexOf("play:"+audio.src));
  late({results:[Object.assign([{transcript:"I like apples"}],{isFinal:true})]});
  assert.equal(s.passes(),0);assert.equal(s.retries.length,1);
  audio.onended();s.tick(0);
  assert.equal(v.mic.disabled,false);assert.equal(s.recognizers.length,1);assert.equal(audio.playing,false);
  assert.ok(!v.words[2].classList.contains("listening"));
  v.mic.fire("click");assert.equal(s.recognizers.length,2);
  assert.equal(s.events.filter(e=>e==="load").length,1);assert.equal(s.audios.length,1);
  v.view.destroy();const w=s.mount();w.mic.fire("click");
  assert.equal(s.audios.length,2);assert.equal(s.events.filter(e=>e==="load").length,1);
});
test("three words play once with 400ms gaps; interrupt pauses before restarting mic",()=>{
  const s=setup(),v=s.mount({text:"I see a red flower.",meaning:"꽃"});
  v.mic.fire("click");s.result("I hear");s.recognizers[0].end();
  const audio=s.audios[0], plays=()=>s.events.filter(e=>e.startsWith("play:")).map(e=>e.split("/").pop());
  assert.deepEqual(plays(),["see.mp3"]);
  audio.onended();s.tick(399);assert.deepEqual(plays(),["see.mp3"]);
  s.tick(1);assert.deepEqual(plays(),["see.mp3","a.mp3"]);assert.equal(v.status.textContent,"이렇게 읽어요 👂 a");
  v.stop.fire("click");
  assert.equal(s.recognizers.length,2);assert.equal(audio.playing,false);
  assert.ok(s.events.lastIndexOf("pause")<s.events.lastIndexOf("start"));
  assert.equal(audio.onended,null);s.tick(5000);assert.deepEqual(plays(),["see.mp3","a.mp3"]);
  assert.equal(s.recognizers.length,2);
});
test("a failed word clip, a blocked one and wholeLine all stay silent with neutral text",()=>{
  const s=setup(),v=s.mount({text:"I see a red flower.",meaning:"꽃"});
  v.mic.fire("click");s.result("I hear");s.recognizers[0].end();
  const audio=s.audios[0];
  audio.onerror();s.tick(400);
  assert.ok(audio.src.endsWith("/a.mp3"));assert.equal(v.mic.disabled,true);
  audio.onended();s.tick(400);assert.ok(audio.src.endsWith("/red.mp3"));
  s.tick(4000);assert.equal(v.mic.disabled,false);assert.equal(audio.playing,false);
  const b=setup({rejectAudio:true}),w=b.mount();w.mic.fire("click");b.result("I like bananas");b.recognizers[0].end();
  return Promise.resolve().then(()=>{
    assert.equal(w.mic.disabled,false);assert.equal(w.status.textContent,"이렇게 읽어요 👂 apples");
    const x=setup(),y=x.mount();y.mic.fire("click");x.result("I like apples and milk");x.recognizers[0].end();
    assert.ok(!x.events.some(e=>e.startsWith("play:")));
    assert.equal(y.status.textContent,"문장에 있는 말만 읽어 주세요");assert.equal(y.mic.disabled,false);
  });
});
test("three passes across mounts select dedicated clip; failure and mic error reset flow",()=>{
  const s=setup();
  function pass(v) {s.result("I like apples");assert.equal(s.audios.at(-1).playing,false);s.recognizers.at(-1).end();const src=s.audios.at(-1).src;s.audios.at(-1).onended();v.view.destroy();return src;}
  for(let i=1;i<=3;i++){const v=s.mount();v.mic.fire("click");const clip=pass(v);assert.equal(clip.endsWith("threeinarow.mp3"),i===3);}
  assert.equal(s.passes(),3);
  const v=s.mount();v.mic.fire("click");s.result("I like bananas");s.recognizers.at(-1).end();v.stop.fire("click");
  assert.match(pass(v),/\/(great|verygood|youdidit|super)\.mp3$/);
  const w=s.mount();w.mic.fire("click");s.recognizers.at(-1).onerror({error:"network"});w.mic.fire("click");
  assert.match(pass(w),/\/(great|verygood|youdidit|super)\.mp3$/);
  for(let i=1;i<=3;i++){const n=s.mount();n.mic.fire("click");assert.equal(pass(n).endsWith("threeinarow.mp3"),i===3);}
});
test("every praise clip plays to its ended event, and never automatically opens a microphone",()=>{
  const s=setup(),v=s.mount();v.mic.fire("click");s.result("I like apples");s.tick(100);s.recognizers[0].end();
  const audio=s.audios[0],ended=audio.onended;
  assert.ok(/\/(excellent|perfect|awesome|wonderful)\.mp3$/.test(audio.src));
  assert.equal(s.passes(),0);assert.equal(v.mic.disabled,true);
  s.tick(1800);assert.equal(s.passes(),0);assert.equal(audio.playing,true);
  audio.ontimeupdate();s.tick(2500);assert.equal(s.passes(),0);
  ended();assert.equal(s.passes(),1);assert.equal(audio.playing,false);
  ended();s.tick(9000);assert.equal(s.passes(),1);assert.equal(s.recognizers.length,1);
});
test("missing end event skips audio; silent failures keep visible praise until timeout",async()=>{
  for(const options of [{},{noAudio:true},{rejectAudio:true}]){
    const s=setup(options),v=s.mount();v.mic.fire("click");s.result("I like apples");
    if(options.noAudio||options.rejectAudio)s.recognizers[0].end();
    await Promise.resolve();
    s.tick(600);
    assert.ok(v.status.children.some(n=>n.className==="reading-praise"));assert.equal(s.passes(),0);
    if(!options.noAudio&&!options.rejectAudio)assert.ok(!s.events.some(e=>e.startsWith("play:")));
    s.tick(1200);assert.equal(s.passes(),1);
  }
});
test("hidden page cancels speech/praise, destroy invalidates delayed ends and removes listeners",()=>{
  for(const success of [false,true]){
    const s=setup(),v=s.mount();v.mic.fire("click");s.result(success?"I like apples":"I like bananas");s.recognizers[0].end();
    s.doc.hidden=true;s.doc.fire("visibilitychange");s.tick(5000);
    assert.equal(s.audios[0].playing,false);assert.equal(s.recognizers.length,1);
    assert.equal(s.passes(),success?1:0);
    v.view.destroy();assert.deepEqual(Object.keys(s.doc.listeners),[]);assert.deepEqual(Object.keys(s.env.listeners),[]);
  }
  const s=setup(),v=s.mount();v.mic.fire("click");s.result("I like apples");const late=s.recognizers[0].onend;v.view.destroy();late();s.tick(5000);assert.equal(s.passes(),0);assert.ok(!s.events.some(e=>e.startsWith("play:")));
});
test("cache v44 precaches nine praise and 38 word MP3s; hub has no second celebration delay",()=>{
  const sw=require("../../sw.js"),html=fs.readFileSync(path.join(__dirname,"../../index.html"),"utf8");
  assert.equal(sw.CACHE_VERSION,"v44");assert.ok(sw.CORE_SHELL.includes("./assets/study/english-reading.js?v=7"));
  assert.match(html,/english-reading\.js\?v=7/);
  const clips=sw.CORE_SHELL.filter(p=>p.includes("/praise/"));
  assert.equal(clips.length,9);
  for(const clip of clips)assert.ok(fs.statSync(path.join(__dirname,"../..",clip)).size>0);
  const words=sw.CORE_SHELL.filter(p=>p.includes("/words/"));
  assert.equal(words.length,Object.keys(reading.wordClips).length);assert.equal(words.length,100);
  for(const word of Object.values(reading.wordClips)){assert.ok(sw.CORE_SHELL.includes("./"+word),word);assert.ok(fs.statSync(path.join(__dirname,"../..",word)).size>0,word);}
  assert.doesNotMatch(fs.readFileSync(path.join(__dirname,"../../assets/study/english-reading.js"),"utf8"),/speechSynthesis|SpeechSynthesisUtterance/);
  assert.match(html,/setTimeout\(renderProblem, current\.reading \? 0 : 750\)/);
  assert.match(html,/setTimeout\(applyState, current\.reading \? 0 : 650\)/);
});
test("offline praise reads static precache for full and Safari byte-range requests",async()=>{
  const sw=require("../../sw.js"), originalCaches=global.caches, originalFetch=global.fetch;
  const bytes=fs.readFileSync(path.join(__dirname,"../../assets/study/praise/threeinarow.mp3"));
  const url="http://localhost/assets/study/praise/threeinarow.mp3";
  global.caches={open:async name=>({match:async request=>name===sw.STATIC_CACHE&&request.url===url?new Response(bytes,{status:200,headers:{"Content-Type":"audio/mpeg"}}):undefined})};
  global.fetch=async()=>{throw Error("offline");};
  try{
    const full=await sw.handleAudioRequest(new Request(url),{waitUntil(){throw Error("network warmup unexpected");}});
    assert.equal(full.status,200);assert.equal((await full.arrayBuffer()).byteLength,bytes.length);
    const partial=await sw.handleAudioRequest(new Request(url,{headers:{Range:"bytes=0-31"}}),{waitUntil(){throw Error("network warmup unexpected");}});
    assert.equal(partial.status,206);assert.equal(partial.headers.get("Content-Range"),"bytes 0-31/"+bytes.length);
    assert.deepEqual(Buffer.from(await partial.arrayBuffer()),bytes.subarray(0,32));
  }finally{global.caches=originalCaches;global.fetch=originalFetch;}
});


test("three-in-a-row plays to ended beyond 1.8s and the mic stays off",()=>{
  const s=setup();
  for(let i=0;i<2;i++){
    const v=s.mount();v.mic.fire("click");s.result("I like apples");s.recognizers.at(-1).end();s.audios.at(-1).onended();v.view.destroy();
  }
  const v=s.mount();v.mic.fire("click");s.result("I like apples");s.recognizers.at(-1).end();
  const audio=s.audios.at(-1),ended=audio.onended;
  assert.ok(audio.src.endsWith("/threeinarow.mp3"));
  s.tick(1800);
  assert.equal(s.passes(),2);assert.equal(audio.playing,true);assert.equal(v.mic.disabled,true);
  assert.ok(s.recognizers.every(r=>!r.live));
  audio.ontimeupdate();s.tick(1400);
  assert.equal(s.passes(),2);assert.equal(audio.playing,true);
  ended();
  assert.equal(s.passes(),3);assert.equal(audio.playing,false);
  assert.equal(audio.ontimeupdate,null);assert.equal(s.recognizers.length,3);
  ended();s.tick(6000);assert.equal(s.passes(),3);
});
test("special praise progress renews the stall watchdog; stalled playback cannot trap the question",()=>{
  const s=setup();
  for(let i=0;i<2;i++){
    const v=s.mount();v.mic.fire("click");s.result("I like apples");s.recognizers.at(-1).end();s.audios.at(-1).onended();v.view.destroy();
  }
  const v=s.mount();v.mic.fire("click");s.result("I like apples");s.recognizers.at(-1).end();
  const audio=s.audios.at(-1);
  s.tick(4000);audio.ontimeupdate();
  s.tick(4999);assert.equal(s.passes(),2);assert.equal(audio.playing,true);
  s.tick(1);assert.equal(s.passes(),3);assert.equal(audio.playing,false);
});

test("recognizer alternatives can pass; display uses the first guess; session shape is stable",()=>{
  assert.deepEqual(reading.alternativeTexts([["the board","the bird"],["can fly","can fry"]]),["the board can fly","the bird can fly","the board can fry"]);
  assert.equal(reading.anyMatches("The bird can fly.",[["the boat","the bird"],["can fly"]]),true);
  assert.equal(reading.anyMatches("The bird can fly.",[["the boat","the bike"],["can fly"]]),false);
  const s=setup(),v=s.mount({text:"The bird can fly.",meaning:"새"});v.mic.fire("click");
  assert.equal(s.recognizers[0].maxAlternatives,5);
  s.recognizers[0].onresult({results:[Object.assign([{transcript:"the boat can fly"},{transcript:"the bird can fly"}],{isFinal:true})]});
  assert.equal(s.recognizers[0].stopped,true);
  assert.ok(v.status.children.some(n=>n.className==="reading-praise"));
  const session=reading.createFeedbackSession();
  assert.deepEqual(Object.keys(session).sort(),["lastClip","log","streak"]);
});

test('no media load accompanies mic start; praise releases its source before the next question',()=>{
  const s=setup({assertReleased:true});
  for(let i=0;i<3;i++){
    const v=s.mount();v.mic.fire('click');
    assert.equal(s.audios.at(-1).src,'');
    s.result('I like apples');s.recognizers.at(-1).end();
    const audio=s.audios.at(-1);assert.ok(audio.src.endsWith('.mp3'));
    audio.onended();assert.equal(audio.src,'');assert.equal(audio.playing,false);
    v.view.destroy();
  }
  assert.equal(s.passes(),3);
});
test('a recognizer that never starts or never returns results cannot lock the question',()=>{
  for(const neverStarts of [true,false]){
    const s=setup({neverStarts}),v=s.mount();v.mic.fire('click');
    const late=s.recognizers[0].onresult;s.tick(12000);
    assert.equal(v.mic.disabled,false);assert.equal(s.passes(),0);assert.equal(s.retries.length,0);
    assert.match(v.status.textContent,/마이크가 응답하지/);
    assert.ok(v.container.children[3].children.some(n=>n.className==='reading-recovery'));
    late({results:[Object.assign([{transcript:'I like apples'}],{isFinal:true})]});
    assert.equal(s.passes(),0);assert.equal(s.timers.size,0);
  }
});
test('interim recognition proves responsiveness and does not hit the no-result watchdog',()=>{
  const s=setup(),v=s.mount();v.mic.fire('click');s.tick(10000);
  s.recognizers[0].onresult({results:[Object.assign([{transcript:'I like'}],{isFinal:false})]});
  s.tick(3000);assert.equal(s.recognizers[0].live,true);assert.equal(s.passes(),0);
  v.view.destroy();assert.equal(s.timers.size,0);
});
test('explicit recovery primes then closes tracks, starts once and preserves silent praise progress',async()=>{
  const s=setup({assertReleased:true}),v=s.mount();let requests=0,closed=0;
  s.env.navigator.mediaDevices={getUserMedia:()=>{requests++;return Promise.resolve({getTracks:()=>[{stop(){closed++;}}]});}};
  v.mic.fire('click');s.tick(12000);
  const recover=v.container.children[3].children.find(n=>n.className==='reading-recovery');
  recover.fire('click');recover.fire('click');assert.equal(requests,1);
  await Promise.resolve();assert.equal(closed,1);s.tick(350);
  assert.equal(s.recognizers.length,2);assert.equal(s.recognizers[1].live,true);
  s.result('I like apples');s.recognizers[1].end();s.tick(1800);
  assert.equal(s.passes(),1);assert.ok(!s.events.some(e=>e.startsWith('play:')));
  v.view.destroy();const next=s.mount();next.mic.fire('click');s.result('I like apples');s.recognizers.at(-1).end();s.tick(1800);
  assert.equal(s.passes(),2);assert.ok(!s.events.some(e=>e.startsWith('play:')));
});
test('late recovery permission is closed after destroy or timeout and cannot start another microphone',async()=>{
  for(const cancel of ['destroy','timeout']){
    const s=setup(),v=s.mount();let resolve,closed=0;
    s.env.navigator.mediaDevices={getUserMedia:()=>new Promise(r=>resolve=r)};
    v.mic.fire('click');s.tick(12000);
    v.container.children[3].children.find(n=>n.className==='reading-recovery').fire('click');
    if(cancel==='destroy')v.view.destroy();else s.tick(8000);
    resolve({getTracks:()=>[{stop(){closed++;}}]});await Promise.resolve();s.tick(1000);
    assert.equal(closed,1);assert.equal(s.recognizers.length,1);assert.equal(s.passes(),0);
  }
});
test('recovery permission denial restores controls without red words or a score',async()=>{
  const s=setup(),v=s.mount();s.env.navigator.mediaDevices={getUserMedia:()=>Promise.reject(Error('denied'))};
  v.mic.fire('click');s.tick(12000);
  v.container.children[3].children.find(n=>n.className==='reading-recovery').fire('click');
  await Promise.resolve();assert.equal(v.mic.disabled,false);assert.match(v.status.textContent,/권한/);
  assert.equal(s.passes(),0);assert.equal(s.retries.length,0);assert.equal(s.timers.size,0);
});
