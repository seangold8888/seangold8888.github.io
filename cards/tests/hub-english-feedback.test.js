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
  const timers=new Map(), events=[], recognizers=[], audios=[], contexts=[], utterances=[], retries=[], gains=[];
  const doc=Object.assign(target(),{hidden:false,createElement:node});
  class Recognition {
    constructor() { recognizers.push(this); }
    start() { events.push("start"); this.live=true; if(options.assertReleased)assert.ok(audios.every(a=>!a.src),'media src must be released before microphone start'); if(!options.neverStarts&&this.onstart)this.onstart(); }
    stop() { events.push("stop"); this.stopped=true; }
    end() { events.push("end");this.live=false; if(this.onend)this.onend(); }
    abort() {events.push("abort");this.live=false;}
  }
  // 소리는 Web Audio 로만 난다. 목은 동기 thenable 이라 기존 동기 검사를 그대로 쓴다.
  const settled=v=>({then(f){try{const r=f?f(v):v;return r&&r.then?r:settled(r);}catch(e){return failed(e);}},catch(){return this;}});
  const failed=e=>({then(f,r){return r?settled(r(e)):failed(e);},catch(r){return settled(r(e));}});
  let lastClip="";
  function fetchMock(url) {
    lastClip=url; events.push("load");
    if(options.rejectAudio) return settled({ok:false});
    return settled({ok:true,arrayBuffer:()=>settled({slice:()=>({}),byteLength:8})});
  }
  class Ctx {
    constructor(){this.state=options.suspended?"suspended":"running";this.destination={};this.currentTime=0;contexts.push(this);}
    resume(){this.state="running";return settled();}
    decodeAudioData(){return options.decodeFails?failed(Error("decode")):settled({duration:options.clipSeconds||1});}
    createBufferSource(){
      const src=lastClip;
      const nodeObj={src,buffer:null,playing:false,connect(){},onended:null,
        start(){assert.ok(recognizers.every(r=>!r.live),"praise cannot play while mic is live");this.playing=true;events.push("play:"+src);},
        stop(){this.playing=false;events.push("pause");}};
      audios.push(nodeObj);return nodeObj;
    }
    createGain(){const param={value:1,setValueAtTime(){},exponentialRampToValueAtTime(){}};const gain={gain:param,connect(){}};gains.push(gain);return gain;}
    createOscillator(){return {type:"",frequency:{value:0},connect(){},start(){events.push("chime")},stop(){}};}
    createDynamicsCompressor(){return {threshold:{value:0},knee:{value:0},ratio:{value:0},attack:{value:0},release:{value:0},connect(){}};}
    close(){this.closed=true;events.push("release");return settled();}
  }
  const synth={ getVoices:()=>options.voices || [{lang:"ko-KR",localService:true},{lang:"en-US",localService:false},{name:"Samantha",lang:"en-US",localService:true}],
    speak(u) { assert.ok(recognizers.every(r=>!r.live)); events.push("speak:"+u.text);utterances.push(u); },
    cancel() {events.push("cancel");} };
  const env=Object.assign(target(),{document:doc,navigator:{onLine:true},isSecureContext:true,SpeechRecognition:Recognition,AudioContext:Ctx,fetch:fetchMock,
    SpeechSynthesisUtterance:class {constructor(text){this.text=text;}},speechSynthesis:synth,
    setTimeout(fn,delay) {timers.set(++timerId,{fn,at:now+delay});return timerId;},clearTimeout:id=>timers.delete(id)});
  if(options.noAudio){env.AudioContext=null;env.fetch=null;}
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
  return {env,doc,events,recognizers,audios,contexts,utterances,retries,gains,timers,tick,mount,result,passes:()=>passes};
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
test("Perfect uses the energetic replacement recording", () => {
  assert.equal(reading.praiseFile("perfect"), "assets/study/praise/perfect-v2.wav");
  assert.equal(reading.praiseFile("awesome"), "assets/study/praise/awesome.mp3");
});
test("retry list follows sentence order, deduplicates, caps three, omits wholeLine",()=>{
  assert.deepEqual(reading.retryWords("I see a red flower.", "I"),["see","a","red"]);
  assert.deepEqual(reading.retryWords("Go go red red blue.", "green"),["go","red","blue"]);
  assert.deepEqual(reading.retryWords("I like apples.", "I like apples and milk"),[]);
});

/* 소리는 Web Audio 로만 낸다. iOS Safari 는 <audio> 재생 뒤 음성 인식을 조용히
   멈추는 일이 있어(WebKit 321436), 재생이 끝나면 AudioContext 를 곧바로 닫는다. */
test("the microphone tap primes one silent context without loading or playing a clip", () => {
  const s = setup(), v = s.mount();
  v.mic.fire("click");
  assert.equal(s.audios.length, 0);
  assert.equal(s.contexts.length, 1);
  assert.equal(s.contexts[0].closed, undefined);
  assert.equal(s.events.filter(e => e === "load").length, 0);
  assert.ok(s.events.includes("start"));
});

test("praise waits for stop AND end, then releases the audio device before the next question", () => {
  const s = setup(), v = s.mount();
  v.mic.fire("click");
  s.result("I like apples");
  assert.equal(s.recognizers[0].stopped, true);
  assert.ok(!s.events.some(e => e.startsWith("play:")), "nothing plays while the recognizer is still ending");
  s.recognizers[0].end();
  const clip = s.audios[0];
  assert.match(clip.src, /assets\/study\/praise\/(?:[a-z]+\.mp3|perfect-v2\.wav)$/);
  assert.equal(clip.playing, true);
  assert.equal(s.contexts.length, 1, "praise reuses the context unlocked by the microphone tap");
  assert.ok(s.gains.some(g => g.gain.value === 1.28), "praise voice gets a clear volume lift");
  assert.equal(s.events.filter(e => e === "chime").length, 3, "a three-note victory chime starts with the voice");
  assert.ok(s.events.indexOf("stop") < s.events.indexOf("play:" + clip.src));
  assert.equal(s.passes(), 0);
  clip.onended(); s.tick(0);
  assert.equal(s.passes(), 1);
  assert.equal(s.contexts[0].closed, true, "the context is closed as soon as the clip ends");
  assert.ok(s.events.indexOf("release") > s.events.indexOf("play:" + clip.src));
});

test("a stale result from the previous recognizer cannot score, and the next question starts clean", () => {
  const s = setup(), v = s.mount();
  v.mic.fire("click");
  const late = s.recognizers[0].onresult;
  s.result("I like bananas");
  s.recognizers[0].end();
  const word = s.audios[0];
  assert.ok(word.src.endsWith("assets/study/words/apples.mp3"));
  assert.equal(v.status.textContent, "이렇게 읽어요 👂 apples");
  assert.ok(v.words[2].classList.contains("listening"));
  late({ results: [Object.assign([{ transcript: "I like apples" }], { isFinal: true })] });
  assert.equal(s.passes(), 0); assert.equal(s.retries.length, 1);
  word.onended(); s.tick(0);
  assert.equal(v.mic.disabled, false);
  assert.ok(!v.words[2].classList.contains("listening"));
  v.mic.fire("click");
  assert.equal(s.recognizers.length, 2);
  assert.equal(s.contexts.filter(c => !c.closed).length, 1, "only the new silent primed context remains open");
});

test("misread words play once each, in order, 400ms apart; interrupting stops the sound before the mic", () => {
  const s = setup(), v = s.mount({ text: "I see a red flower.", meaning: "꽃" });
  v.mic.fire("click"); s.result("I hear"); s.recognizers[0].end();
  const plays = () => s.events.filter(e => e.startsWith("play:")).map(e => e.split("/").pop());
  assert.deepEqual(plays(), ["see.mp3"]);
  s.audios[0].onended(); s.tick(399); assert.deepEqual(plays(), ["see.mp3"]);
  s.tick(1); assert.deepEqual(plays(), ["see.mp3", "a.mp3"]);
  assert.equal(v.status.textContent, "이렇게 읽어요 👂 a");
  v.stop.fire("click");
  assert.equal(s.recognizers.length, 2);
  assert.ok(s.events.lastIndexOf("pause") < s.events.lastIndexOf("start"));
  assert.equal(s.contexts.filter(c => !c.closed).length, 1, "the interrupted sound closes before one fresh silent context is primed");
  s.tick(5000); assert.deepEqual(plays(), ["see.mp3", "a.mp3"]);
});

test("wholeLine mistakes stay silent and a blocked or broken clip never traps the question", () => {
  const x = setup(), y = x.mount();
  y.mic.fire("click"); x.result("I like apples and milk"); x.recognizers[0].end();
  assert.ok(!x.events.some(e => e.startsWith("play:")));
  assert.equal(y.status.textContent, "문장에 있는 말만 읽어 주세요");
  assert.equal(y.mic.disabled, false);
  for (const options of [{ noAudio: true }, { rejectAudio: true }, { decodeFails: true }]) {
    const s = setup(options), v = s.mount();
    v.mic.fire("click"); s.result("I like apples"); s.recognizers[0].end();
    assert.ok(v.status.children.some(n => n.className === "reading-praise"), JSON.stringify(options));
    assert.equal(s.passes(), 0);
    s.tick(1800);
    assert.equal(s.passes(), 1, "text-only praise still moves on: " + JSON.stringify(options));
    assert.ok(s.contexts.every(c => c.closed));
  }
});

test("a suspended context is resumed, and every praise clip plays to its ended event", () => {
  const s = setup({ suspended: true, clipSeconds: 3 }), v = s.mount();
  v.mic.fire("click"); s.result("I like apples"); s.tick(100); s.recognizers[0].end();
  const clip = s.audios[0];
  assert.equal(s.contexts[0].state, "running");
  s.tick(1800); assert.equal(s.passes(), 0, "no fixed cap cuts the clip short");
  s.tick(2500); assert.equal(s.passes(), 0);
  clip.onended(); assert.equal(s.passes(), 1);
  assert.equal(clip.onended, null, "the handler is dropped so a late end cannot fire twice");
  s.tick(9000); assert.equal(s.passes(), 1);
  assert.equal(s.recognizers.length, 1, "praise never opens a microphone by itself");
});

test("three first-try passes reach the dedicated clip; a stalled clip still frees the question", () => {
  const s = setup();
  for (let i = 1; i <= 3; i++) {
    const v = s.mount(); v.mic.fire("click"); s.result("I like apples"); s.recognizers.at(-1).end();
    const clip = s.audios.at(-1);
    assert.equal(clip.src.endsWith("threeinarow.mp3"), i === 3, "pass " + i);
    if (i === 3) { s.tick(20000); assert.equal(s.passes(), 3, "a clip that never ends still frees the question"); }
    else { clip.onended(); s.tick(0); }
    v.view.destroy();
  }
});

test("hiding the page cancels the sound and destroy invalidates delayed ends", () => {
  for (const success of [false, true]) {
    const s = setup(), v = s.mount();
    v.mic.fire("click"); s.result(success ? "I like apples" : "I like bananas"); s.recognizers[0].end();
    s.doc.hidden = true; s.doc.fire("visibilitychange"); s.tick(5000);
    assert.ok(s.contexts.every(c => c.closed));
    assert.equal(s.recognizers.length, 1);
    assert.equal(s.passes(), success ? 1 : 0);
    v.view.destroy(); assert.deepEqual(Object.keys(s.doc.listeners), []); assert.deepEqual(Object.keys(s.env.listeners), []);
  }
  const s = setup(), v = s.mount();
  v.mic.fire("click"); s.result("I like apples"); const late = s.recognizers[0].onend;
  v.view.destroy(); late(); s.tick(5000);
  assert.equal(s.passes(), 0); assert.ok(!s.events.some(e => e.startsWith("play:")));
});

/* 소리를 낸 뒤 마이크가 먹통이 되는 기기(iOS WebKit 321436)에서, 아이가 아무것도
   누르지 않아도 스스로 소리를 끄고 마이크를 다시 켠다. 오답으로 세지 않는다. */
test("a microphone that never starts turns the sound off by itself and restarts", () => {
  const s = setup({ neverStarts: true }), v = s.mount();
  v.mic.fire("click");
  s.tick(12000);
  assert.match(v.status.textContent, /소리를 잠깐 끄고 마이크를 다시 켰어요/);
  assert.equal(s.retries.length, 0, "a dead microphone is never a reading mistake");
  assert.equal(s.passes(), 0);
  s.tick(500);
  assert.equal(s.recognizers.length, 2, "it restarts without asking the child");
  assert.ok(!v.container.children[3].children.some(n => n.className === "reading-recovery"), "no button yet");
});

test("automatic silent recovery is temporary and the next question celebrates again", () => {
  const s = setup({ neverStarts: true }), v = s.mount();
  v.mic.fire("click"); s.tick(12500);
  v.view.destroy();
  const w = s.mount();
  w.mic.fire("click");
  s.result("I like apples"); s.recognizers.at(-1).end();
  const clip = s.audios.at(-1);
  assert.ok(clip && clip.src.includes("/praise/"), "a fresh question retries recorded praise");
  assert.ok(w.status.children.some(n => n.className === "reading-praise"), "the praise is still shown");
  clip.onended();
  assert.equal(s.passes(), 1, "the question moves on after the full praise");
});

test("after two silent retries the child is offered the recovery button", () => {
  const s = setup({ neverStarts: true }), v = s.mount();
  v.mic.fire("click");
  s.tick(12500);             // 1) 자동으로 소리 끄고 다시 켜기
  s.tick(4500); s.tick(500); // 2) 조용히 재시도 1
  s.tick(4500); s.tick(500); // 3) 조용히 재시도 2
  s.tick(4500);              // 4) 그래도 안 되면 버튼
  const recover = v.container.children[3].children.find(n => n.className === "reading-recovery");
  assert.ok(recover, "the button appears only after the quiet retries");
  assert.match(v.status.textContent, /마이크 다시 켜기/);
  assert.equal(s.passes(), 0); assert.equal(s.retries.length, 0);
});

test("the recovery button asks for the microphone once, closes the track and starts a fresh recognizer", async () => {
  const s = setup({ neverStarts: true }), v = s.mount();
  let requests = 0, closed = 0;
  s.env.navigator.mediaDevices = { getUserMedia: () => { requests++; return Promise.resolve({ getTracks: () => [{ stop() { closed++; } }] }); } };
  v.mic.fire("click");
  s.tick(12500); s.tick(4500); s.tick(500); s.tick(4500); s.tick(500); s.tick(4500);
  const recover = v.container.children[3].children.find(n => n.className === "reading-recovery");
  recover.fire("click"); recover.fire("click");
  assert.equal(requests, 1, "a double tap still asks once");
  await Promise.resolve(); assert.equal(closed, 1, "the primed track is stopped immediately");
  s.tick(350);
  const started = s.recognizers.length;
  s.recognizers.at(-1).onstart && s.recognizers.at(-1).onstart();
  assert.ok(started >= 2);
});

test("a denied recovery leaves the controls usable and never scores a mistake", async () => {
  const s = setup({ neverStarts: true }), v = s.mount();
  s.env.navigator.mediaDevices = { getUserMedia: () => Promise.reject(Error("denied")) };
  v.mic.fire("click");
  s.tick(12500); s.tick(4500); s.tick(500); s.tick(4500); s.tick(500); s.tick(4500);
  v.container.children[3].children.find(n => n.className === "reading-recovery").fire("click");
  await Promise.resolve();
  assert.equal(v.mic.disabled, false, "the child can tap the microphone again");
  assert.equal(s.passes(), 0); assert.equal(s.retries.length, 0);
});

test("recognizer alternatives can pass; display uses the first guess; session shape is stable", () => {
  assert.deepEqual(reading.alternativeTexts([["the board", "the bird"], ["can fly", "can fry"]]), ["the board can fly", "the bird can fly", "the board can fry"]);
  assert.equal(reading.anyMatches("The bird can fly.", [["the boat", "the bird"], ["can fly"]]), true);
  assert.equal(reading.anyMatches("The bird can fly.", [["the boat", "the bike"], ["can fly"]]), false);
  const s = setup(), v = s.mount({ text: "The bird can fly.", meaning: "새" });
  v.mic.fire("click");
  assert.equal(s.recognizers[0].maxAlternatives, 5);
  s.recognizers[0].onresult({ results: [Object.assign([{ transcript: "the boat can fly" }, { transcript: "the bird can fly" }], { isFinal: true })] });
  assert.equal(s.recognizers[0].stopped, true);
  assert.ok(v.status.children.some(n => n.className === "reading-praise"));
  const session = reading.createFeedbackSession();
  assert.deepEqual(Object.keys(session).sort(), ["autoRetries", "lastClip", "log", "silent", "streak"]);
});

test("the hub clears stale permanent silence and the worker precaches every clip", () => {
  const sw = require("../../sw.js"), html = fs.readFileSync(path.join(__dirname, "../../game/index.html"), "utf8");
  assert.equal(sw.CACHE_VERSION, "v106");
  assert.ok(sw.CORE_SHELL.includes("./assets/study/english-reading.js?v=11"));
  assert.ok(sw.CORE_SHELL.includes("./assets/study/praise/perfect-v2.wav"));
  assert.match(html, /english-reading\.js\?v=11/);
  assert.match(html, /removeItem\('hub2_reading_silent'\)/);
  assert.doesNotMatch(html, /setItem\('hub2_reading_silent'/);
  assert.match(html, /silent: readingSilent/);
  const clips = sw.CORE_SHELL.filter(p => p.includes("/praise/"));
  assert.equal(clips.length, 9);
  for (const clip of clips) assert.ok(fs.statSync(path.join(__dirname, "../..", clip)).size > 0);
  const words = sw.CORE_SHELL.filter(p => p.includes("/words/"));
  assert.equal(words.length, Object.keys(reading.wordClips).length);
  assert.equal(words.length, 100);
  const source = fs.readFileSync(path.join(__dirname, "../../assets/study/english-reading.js"), "utf8");
  assert.doesNotMatch(source, /speechSynthesis|SpeechSynthesisUtterance|new Audio|MediaRecorder|localStorage|sessionStorage/);
  assert.match(source, /AudioContext/);
});

test("offline praise reads static precache for full and Safari byte-range requests", async () => {
  const sw = require("../../sw.js"), originalCaches = global.caches, originalFetch = global.fetch;
  const bytes = fs.readFileSync(path.join(__dirname, "../../assets/study/praise/threeinarow.mp3"));
  const url = "http://localhost/assets/study/praise/threeinarow.mp3";
  global.caches = { open: async name => ({ match: async request => name === sw.STATIC_CACHE && request.url === url ? new Response(bytes, { status: 200, headers: { "Content-Type": "audio/mpeg" } }) : undefined }) };
  global.fetch = async () => { throw Error("offline"); };
  try {
    const full = await sw.handleAudioRequest(new Request(url), { waitUntil() { throw Error("network warmup unexpected"); } });
    assert.equal(full.status, 200); assert.equal((await full.arrayBuffer()).byteLength, bytes.length);
    const partial = await sw.handleAudioRequest(new Request(url, { headers: { Range: "bytes=0-31" } }), { waitUntil() { throw Error("network warmup unexpected"); } });
    assert.equal(partial.status, 206); assert.equal(partial.headers.get("Content-Range"), "bytes 0-31/" + bytes.length);
    assert.deepEqual(Buffer.from(await partial.arrayBuffer()), bytes.subarray(0, 32));
  } finally { global.caches = originalCaches; global.fetch = originalFetch; }
});
