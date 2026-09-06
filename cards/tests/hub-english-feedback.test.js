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
    start() { events.push("start"); this.live=true; if(this.onstart)this.onstart(); }
    stop() { events.push("stop"); this.stopped=true; }
    end() { events.push("end");this.live=false; if(this.onend)this.onend(); }
    abort() {events.push("abort");this.live=false;}
  }
  class Audio {
    constructor(src) {this.src=src;audios.push(this);}
    load() {events.push("load");}
    pause() {this.playing=false;events.push("pause");}
    play() {
      assert.ok(recognizers.every(r=>!r.live), "praise cannot play while mic is live");
      this.playing=true;events.push("play:"+this.src);
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
  assert.deepEqual(s.utterances.map(u=>u.text),[""]);
  s.result("I like bananas");
  assert.equal(s.recognizers[0].stopped,true);
  assert.equal(s.utterances.length,1);assert.equal(v.mic.disabled,true);
  s.recognizers[0].end();
  const speech=s.utterances.at(-1);
  assert.equal(speech.text,"apples");assert.equal(speech.voice.name,"Samantha");
  assert.equal(speech.rate,.8);assert.equal(speech.pitch,1);assert.equal(speech.lang,"en-US");
  assert.ok(v.words[2].classList.contains("listening"));
  assert.ok(s.events.indexOf("stop")<s.events.indexOf("speak:apples"));
  late({results:[Object.assign([{transcript:"I like apples"}],{isFinal:true})]});
  assert.equal(s.passes(),0);assert.equal(s.retries.length,1);
  speech.onend();s.tick(0);
  assert.equal(v.mic.disabled,false);assert.equal(s.recognizers.length,1);
  assert.ok(!v.words[2].classList.contains("listening"));
  v.mic.fire("click");assert.equal(s.recognizers.length,2);
  assert.equal(s.events.filter(e=>e==="load").length,1);
});
test("three words speak once with 400ms gaps; interrupt cancels before restarting mic",()=>{
  const s=setup(),v=s.mount({text:"I see a red flower.",meaning:"꽃"});
  v.mic.fire("click");s.result("I hear");s.recognizers[0].end();
  assert.equal(s.utterances.at(-1).text,"see");
  s.utterances.at(-1).onend();s.tick(399);assert.equal(s.utterances.length,2);
  s.tick(1);assert.equal(s.utterances.at(-1).text,"a");
  const stale=s.utterances.at(-1).onend;
  v.stop.fire("click");
  assert.equal(s.recognizers.length,2);
  assert.ok(s.events.lastIndexOf("cancel")<s.events.lastIndexOf("start"));
  stale();s.tick(500);assert.equal(s.utterances.length,3);
  assert.equal(s.recognizers.length,2);
});
test("no English voice and wholeLine stay silent with neutral text",()=>{
  const s=setup({voices:[{lang:"ko-KR"}]}),v=s.mount();
  v.mic.fire("click");s.result("I like bananas");s.recognizers[0].end();
  assert.equal(s.utterances.length,0);assert.equal(v.status.textContent,"이렇게 읽어요 👂 apples");assert.equal(v.mic.disabled,false);
  const x=setup(),w=x.mount();w.mic.fire("click");x.result("I like apples and milk");x.recognizers[0].end();
  assert.deepEqual(x.utterances.map(u=>u.text),[""]);
  assert.equal(w.status.textContent,"문장에 있는 말만 읽어 주세요");
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
test("praise ends once or at 1.8s, and never automatically opens a microphone",()=>{
  const s=setup(),v=s.mount();v.mic.fire("click");s.result("I like apples");s.tick(100);s.recognizers[0].end();
  const ended=s.audios[0].onended;
  assert.equal(s.passes(),0);assert.equal(v.mic.disabled,true);
  s.tick(1699);assert.equal(s.passes(),0);s.tick(1);assert.equal(s.passes(),1);
  assert.equal(s.audios[0].playing,false);ended();assert.equal(s.passes(),1);assert.equal(s.recognizers.length,1);
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
test("cache v42 precaches all nine MP3s and hub has no second celebration delay",()=>{
  const sw=require("../../sw.js"),html=fs.readFileSync(path.join(__dirname,"../../index.html"),"utf8");
  assert.equal(sw.CACHE_VERSION,"v42");assert.ok(sw.CORE_SHELL.includes("./assets/study/english-reading.js?v=5"));
  assert.match(html,/english-reading\.js\?v=5/);
  const clips=sw.CORE_SHELL.filter(p=>p.includes("/praise/"));
  assert.equal(clips.length,9);
  for(const clip of clips)assert.ok(fs.statSync(path.join(__dirname,"../..",clip)).size>0);
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

