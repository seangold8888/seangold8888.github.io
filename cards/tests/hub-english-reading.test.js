"use strict";
const test = require("node:test"), assert = require("node:assert/strict");
const fs = require("node:fs"), path = require("node:path"), vm = require("node:vm");
const reading = require("../../assets/study/english-reading.js");
function target() {
  const listeners = {};
  return { addEventListener: (name, fn) => { listeners[name] = fn; },
    removeEventListener: (name, fn) => { if (listeners[name] === fn) delete listeners[name]; },
    fire: name => { if (listeners[name]) listeners[name](); }, listeners };
}
function node() {
  const n = Object.assign(target(), { children: [], attrs: {}, textContent: "", disabled: false,
    appendChild(child) { this.children.push(child); },
    setAttribute(k, v) { this.attrs[k] = v; } });
  const classes = new Set();
  n.classList = { add: k => classes.add(k), remove: k => classes.delete(k),
    toggle: (k, yes) => yes ? classes.add(k) : classes.delete(k), contains: k => classes.has(k) };
  return n;
}
// 소리는 Web Audio 로만 난다. 동기 thenable 목이라 클립은 시작하자마자 끝난다.
const settled = value => ({ then(fn) { const out = fn ? fn(value) : value; return out && out.then ? out : settled(out); }, catch() { return this; } });
class Ctx {
  constructor() { this.state = "running"; this.destination = {}; }
  resume() { this.state = "running"; return settled(); }
  decodeAudioData() { return settled({ duration: 1 }); }
  createBufferSource() {
    return { buffer: null, connect() {}, onended: null,
      start() { const done = this.onended; if (done) done(); }, stop() {} };
  }
  close() { this.closed = true; return settled(); }
}
function fetchClip() { return settled({ ok: true, arrayBuffer: () => settled({ slice: () => ({}) }) }); }
function setup(options = {}, callbacks) {
  const instances = [], timers = new Map();
  let counter = 0, passes = 0;
  class Recognition {
    constructor() { instances.push(this); }
    start() { this.started = true; if (this.onstart) this.onstart(); }
    stop() { this.aborted = true; if (this.onend) this.onend(); }
    abort() { this.aborted = true; }
  }
  const doc = Object.assign(target(), { hidden: false, createElement: node });
  const env = Object.assign(target(), { document: doc, navigator: { onLine: true }, isSecureContext: true,
    SpeechRecognition: Recognition, AudioContext: Ctx, fetch: fetchClip, SpeechSynthesisUtterance: class { constructor(text) { this.text = text; } },
    speechSynthesis: { speaking: false, getVoices: () => [{ lang: "en-US" }],
      speak(speech) { this.last = speech; this.speaking = true; },
      cancel() { this.speaking = false; } },
    setTimeout: fn => { timers.set(++counter, fn); return counter; }, clearTimeout: id => timers.delete(id)
  }, { speechSynthesis: null }, options);
  const container = node();
  const view = reading.mount(container, reading.sentences[0], () => passes++, env, callbacks);
  const actions = container.children[3].children;
  function result(parts) {
    const results = parts.map(([text, final]) => Object.assign([{ transcript: text }], { isFinal: final }));
    instances.at(-1).onresult({ results });
  }
  return { env, container, view, instances, timers, result, mic: actions[0], stop: actions[1],
    status: container.children[4], passes: () => passes };
}
test("retry callback contains only expected missed words, not the recognized phrase", () => {
  const retries = [];
  const s = setup({}, {onRetry: words => retries.push(words)});
  s.mic.fire("click");
  s.result([["I like bananas", true]]);
  assert.deepEqual(retries, [["apples"]]);
  s.mic.fire("click");
  s.instances.at(-1).onerror({error:"network"});
  assert.equal(retries.length, 1);
  s.mic.fire("click");
  s.result([["I like apples", true]]);
  assert.equal(s.passes(), 1);
});
test("microphone fallback appears only on errors and cannot advance progress", () => {
  let fallbackCount = 0, retryCount = 0;
  const s = setup({}, {onUnavailable: () => fallbackCount++, onRetry: () => retryCount++});
  const fallback = s.container.children[3].children[2];
  assert.equal(fallback.hidden, true);
  fallback.fire("click"); assert.equal(fallbackCount, 0);
  s.mic.fire("click");
  s.instances[0].onerror({error:"not-allowed"});
  assert.equal(fallback.hidden, false);
  fallback.fire("click");
  assert.equal(fallbackCount, 1);
  assert.equal(retryCount, 0);
  assert.equal(s.passes(), 0);
  s.view.destroy(); fallback.fire("click");
  assert.equal(fallbackCount, 1);
});
test("unsupported and offline devices offer fallback without requesting microphone access", () => {
  for (const opts of [{SpeechRecognition:null}, {navigator:{onLine:false}}]) {
    let count = 0;
    const s = setup(opts, {onUnavailable:()=>count++});
    const fallback = s.container.children[3].children[2];
    assert.equal(fallback.hidden,false);
    fallback.fire("click");
    assert.equal(count,1); assert.equal(s.instances.length,0);
  }
});

test("eight reading levels keep old indexes and grow from short lines to a picture-book page", () => {
  assert.equal(reading.sentences.length, 276);
  assert.equal(new Set(reading.sentences.map(s => s.text)).size, 276);
  assert.equal(reading.sentences[0].text, "I like apples.", "기존 번호가 그대로여야 오답노트가 안 깨진다");
  assert.equal(reading.sentences[67].text, "The bird is small.");
  const count = {}, words = {}, lines = {};
  reading.sentences.forEach((s) => {
    assert.ok(s.meaning, s.text);
    count[s.level] = (count[s.level] || 0) + 1;
    const n = reading.normalize(s.text).split(" ").length, k = (s.text.match(/[.!?](\s|$)/g) || []).length;
    words[s.level] = [Math.min(n, (words[s.level] || [99])[0]), Math.max(n, (words[s.level] || [0, 0])[1])];
    lines[s.level] = [Math.min(k, (lines[s.level] || [99])[0]), Math.max(k, (lines[s.level] || [0, 0])[1])];
  });
  assert.deepEqual(count, { 1: 63, 2: 32, 3: 31, 4: 30, 5: 30, 6: 30, 7: 30, 8: 30 });
  assert.deepEqual(words[1], [3, 4]); assert.deepEqual(words[2], [5, 6]); assert.deepEqual(words[3], [7, 8]);
  assert.deepEqual(lines[4], [2, 2]); assert.deepEqual(lines[5], [2, 2]); assert.deepEqual(lines[6], [1, 1]);
  assert.deepEqual(lines[7], [3, 3]); assert.deepEqual(lines[8], [4, 4]);
  assert.ok(reading.sentences.filter(s => s.level === 5).every(s => s.text.includes("?")), "5단계는 묻고 답하기");
  assert.equal(reading.levelNames.length, 9);
});
test("every word in every level has a recorded clip that the worker precaches", () => {
  const root = path.resolve(__dirname, "../..");
  const sw = fs.readFileSync(path.join(root, "sw.js"), "utf8");
  const words = new Set(reading.sentences.flatMap(s => reading.normalize(s.text).split(" ")));
  for (const word of words) {
    assert.ok(fs.existsSync(path.join(root, "assets/study/words", word + ".mp3")), word);
    assert.ok(sw.includes('"./assets/study/words/' + word + '.mp3"'), "precache " + word);
  }
});
test("levels: level one alone by default, higher levels mostly new with some review", () => {
  for (let i = 0; i < 200; i++) assert.equal(reading.sentences[reading.chooseSentence({}, i, -1, Math.random, [])].level, 1);
  let seq = 0;
  const cycle = [0.1, 0.9, 0.3, 0.5];
  const random = () => cycle[seq++ % cycle.length];
  const seen = {};
  for (let i = 0; i < 400; i++) { const lv = reading.sentences[reading.chooseSentence({}, i, -1, random, [], 8)].level; seen[lv] = (seen[lv] || 0) + 1; }
  assert.ok(seen[8] > (seen[6] || 0) + (seen[7] || 0), JSON.stringify(seen));
  assert.ok((seen[6] || 0) + (seen[7] || 0) > 0, "바로 아래 두 단계 복습이 섞여야 한다");
  assert.deepEqual(Object.keys(seen).map(Number).sort(), [6, 7, 8], "너무 쉬운 단계는 복습으로 나오지 않는다");
  for (let i = 0; i < 100; i++) assert.ok(reading.sentences[reading.chooseSentence({}, i, -1, Math.random, [], 2)].level <= 2);
  assert.equal(reading.clampLevel(9), 1);
  assert.equal(reading.clampLevel(8), 8);
  assert.equal(reading.passesToLevelUp, 30);
  assert.equal(reading.maxLevel, 8);
});
test("long sentences forgive one or two misheard or dropped words; ten words or fewer stay exact", () => {
  const seven = "I plant a seed. I give it water. It grows into a flower.";
  const eight = "The hare was very fast. The tortoise was very slow. The hare took a nap. The tortoise won the race.";
  assert.equal(reading.matches(seven, "I plant a seat I give it water it grows into a flower"), true);
  assert.equal(reading.matches(seven, "I plant seed I give it water it grows into a flower"), true);
  assert.equal(reading.matches(seven, "I plant a seat I give water it grows into a flower"), false);
  assert.equal(reading.matches(eight, "the hair was very fast the tortoise was so slow the hare took a nap the tortoise won the race"), true);
  assert.equal(reading.matches(eight, "the hair was very fast the tortoise was slow the hare took nap the tortoise won the race"), false);
  assert.equal(reading.matches(eight, "the hare was very fast"), false);
  assert.equal(reading.matches("Where is my cat? It is under the bed.", "where is my cat it is under a bed"), false, "10단어는 정확히");
});
test("matching tolerates casing, punctuation and I'm, not missing, extra or reordered words", () => {
  assert.equal(reading.matches("I like apples.", " I LIKE apples! "), true);
  assert.equal(reading.matches("I am happy.", "I'm happy."), true);
  for (const text of ["I like", "like I apples", "I like an apple", "I like apples and milk", ""]) {
    assert.equal(reading.matches("I like apples.", text), false, text);
  }
});
test("microphone waits for a click, interim text never passes, final full sentence passes once", () => {
  const s = setup();
  assert.equal(s.instances.length, 0);
  s.mic.fire("click");
  assert.equal(s.instances.length, 1);
  assert.equal(s.instances[0].lang, "en-US");
  s.result([["I like apples", false]]);
  assert.equal(s.passes(), 0);
  const delayed = s.instances[0].onresult;
  s.result([["I like", true], ["apples", true]]);
  assert.equal(s.passes(), 1);
  delayed({ results: [Object.assign([{ transcript: "I like apples" }], { isFinal: true })] });
  assert.equal(s.passes(), 1);
  assert.equal(s.instances[0].aborted, true);
  assert.equal(s.mic.disabled, true);
  assert.equal(s.timers.size, 0);
});
test("mismatch and permission/network failures allow retry without a wrong answer", () => {
  for (const error of ["not-allowed", "network", "no-speech", "audio-capture", "service-not-allowed"]) {
    const s = setup(); s.mic.fire("click"); s.result([["I like", true]]);
    assert.equal(s.passes(), 0);
    s.instances[0].onerror({ error });
    assert.equal(s.passes(), 0);
    assert.equal(s.mic.disabled, false);
    s.mic.fire("click"); s.result([["I like apples", true]]);
    assert.equal(s.passes(), 1);
  }
});
test("unsupported/offline environments never request recognition", () => {
  for (const opts of [{ SpeechRecognition: null }, { navigator: { onLine: false } }, { isSecureContext: false }]) {
    const s = setup(opts); s.mic.fire("click");
    assert.equal(s.instances.length, 0); assert.equal(s.passes(), 0); assert.equal(s.mic.disabled, true);
  }
});
test("no listen button or full-sentence speech model", () => {
  const s = setup();
  assert.equal(s.container.children[3].children.length, 2);
  assert.equal(s.mic.textContent, "🎤 읽어 보기");
  const source = fs.readFileSync(path.join(__dirname, "../../assets/study/english-reading.js"), "utf8");
  assert.doesNotMatch(source, /먼저 듣기|들어 보기|SpeechSynthesisUtterance\(sentence/);
});
test("final mismatch marks the different word red, stops and permits a clean retry", () => {
  const s = setup(); s.mic.fire("click");
  const late = s.instances[0].onresult;
  s.result([["I like bananas", true]]);
  const words = s.container.children[1].children;
  assert.equal(words[0].classList.contains("heard"), true);
  assert.equal(words[2].classList.contains("retry"), true);
  assert.equal(s.status.classList.contains("retry"), true);
  assert.match(s.status.textContent, /이렇게 읽어요 👂 apples/);
  assert.equal(s.mic.textContent, "🎤 다시 읽기");
  assert.equal(s.instances[0].aborted, true);
  assert.equal(s.passes(), 0);
  late({results: [Object.assign([{transcript: "I like apples"}], {isFinal: true})]});
  assert.equal(s.passes(), 0);
  s.mic.fire("click");
  assert.ok(words.every(w => !w.classList.contains("retry")));
  assert.equal(s.status.classList.contains("retry"), false);
  s.result([["I like apples", true]]);
  assert.equal(s.passes(), 1);
});
test("interim mistakes and valid final prefixes are not prematurely red", () => {
  const s = setup(); s.mic.fire("click");
  s.result([["I hate bananas", false]]);
  assert.ok(s.container.children[1].children.every(w => !w.classList.contains("retry")));
  s.result([["I like", true]]);
  assert.equal(s.instances[0].aborted, undefined);
  s.result([["I like", true], ["apples", true]]);
  assert.equal(s.passes(), 1);
});
test("unfinished final sentence is marked for retry on end, stop or timeout", () => {
  for (const ending of ["end", "stop", "timeout"]) {
    const s = setup(); s.mic.fire("click"); s.result([["I like", true]]);
    if (ending === "end") s.instances[0].onend();
    else if (ending === "stop") s.stop.fire("click");
    else [...s.timers.values()][0]();
    assert.equal(s.container.children[1].children[2].classList.contains("retry"), true, ending);
    assert.equal(s.mic.disabled, false);
    assert.equal(s.passes(), 0);
  }
});
test("extra words cannot leave an all-green failed sentence", () => {
  const s = setup(); s.mic.fire("click"); s.result([["I like apples and milk", true]]);
  assert.ok(s.container.children[1].children.every(w => w.classList.contains("retry")));
  assert.equal(s.passes(), 0);
});
test("no speech and microphone errors never mark words red", () => {
  for (const error of ["no-speech", "network", "not-allowed"]) {
    const s = setup(); s.mic.fire("click");
    s.instances[0].onerror({error});
    assert.ok(s.container.children[1].children.every(w => !w.classList.contains("retry")));
    assert.equal(s.status.classList.contains("retry"), false);
    assert.equal(s.passes(), 0);
  }
});
test("hidden page, page exit, offline, timeout and disposal abort recording", () => {
  for (const action of ["hidden", "pagehide", "offline", "timeout", "destroy"]) {
    const s = setup(); s.mic.fire("click");
    const delayed = s.instances[0].onresult;
    if (action === "hidden") { s.env.document.hidden = true; s.env.document.fire("visibilitychange"); }
    else if (action === "timeout") [...s.timers.values()][0]();
    else if (action === "destroy") s.view.destroy();
    else s.env.fire(action);
    assert.equal(s.instances[0].aborted, true, action);
    delayed({ results: [Object.assign([{ transcript: "I like apples" }], { isFinal: true })] });
    assert.equal(s.passes(), 0, action);
    if (action === "destroy") {
      assert.deepEqual(Object.keys(s.env.listeners), []);
      assert.deepEqual(Object.keys(s.env.document.listeners), []);
    }
  }
});
test("speech text stays textContent and audio/transcripts have no storage API", () => {
  const source = fs.readFileSync(path.join(__dirname, "../../assets/study/english-reading.js"), "utf8");
  assert.doesNotMatch(source, /innerHTML|localStorage|sessionStorage|MediaRecorder/);
  // 네트워크는 녹음된 mp3 클립을 받아 오는 한 곳뿐이다. 인식 결과는 어디에도 보내지 않는다.
  assert.deepEqual(source.match(/fetch\(/g), ["fetch("]);
  assert.match(source, /return env\.fetch\(url\)/);
});
const html = fs.readFileSync(path.join(__dirname, "../../game/index.html"), "utf8").replace(/\r/g, "");
function fn(name) {
  const start = html.indexOf("  function " + name + "(");
  return html.slice(start, html.indexOf("\n  }", start) + 4);
}
test("a reading success advances progress once and earns the tenth-answer ticket without math growth", () => {
  const skill = { s: 0, d: 0 };
  const ctx = { isFree: () => false, hasTicket: () => ctx.state.credit > 0, readingLevel: {level:1,passes:0}, recordReadingPass: () => false, 
    current: { answer: "I like apples.", reading: {}, seed: { type: "reading", idx: 0 } },
    state: { solved: 9, credit: 0, streak: 3, level: 2 }, setCorrect: 9, SET: 10, DAILY: 100,
    CHEERS: ["잘했어요"], BANK_SIZES: { reading: 16 }, MASTER_AT: 9, cheerEl: {},
    skillOf: () => skill, dayNum: () => 100, drawSetStars() {}, drawDaily() {}, saveState() {},
    setTimeout: () => 1, applyState() {}, renderProblem() {} };
  ctx.celebrateRound=()=>{};
  vm.runInNewContext(fn("pick"), ctx);
  ctx.pick("I like apples.", null); ctx.pick("I like apples.", null);
  assert.equal(ctx.state.solved, 10); assert.equal(ctx.state.credit, 1); assert.equal(ctx.setCorrect, 0);
  assert.equal(skill.s, 1); assert.equal(ctx.state.streak, 3); assert.equal(ctx.state.level, 2);
});
test("reading support is cached and its script loads before the study controller", () => {
  const sw = require("../../sw.js");
  assert.ok(sw.CORE_SHELL.includes("./assets/study/english-reading.js?v=20"));
  assert.ok(html.indexOf('src="assets/study/english-reading.js?v=20"') < html.indexOf("var BANK_SIZES"));
  assert.match(html, /\.reading-word\.retry\s*\{[^}]*text-decoration:underline wavy/);
  assert.match(html, /if \(current !== target \|\| isFree\(\) \|\| hasTicket\(\) \|\| target\.answered\) return/);
  assert.match(html, /function stopReading\(\)[\s\S]*?clearTimeout\(answerTimer\)/);
});
test("recognizer aliases pass a correctly read word the ASR mishears, never missing or extra words", () => {
  for (const heard of ["the board can fly", "the boy can fry", "the bard can flight", "The bird can fly"]) {
    assert.equal(reading.matches("The bird can fly.", heard), true, heard);
  }
  assert.equal(reading.matches("We can play together.", "we can play to get her"), true);
  assert.equal(reading.matches("I like apples.", "i like apple"), true);
  for (const heard of ["the bird can", "bird can fly the", "the bird can fly now", "the cat can fly"]) {
    assert.equal(reading.matches("The bird can fly.", heard), false, heard);
  }
  assert.deepEqual(reading.matchedWords("The bird can fly.", "the cat can fly"), [true, false, true, true]);
  assert.equal(reading.isPrefix("The bird can fly.", "the board"), true);
  assert.equal(reading.isPrefix("The bird can fly.", "the cat"), false);
  for (const word of Object.keys(reading.aliases)) {
    assert.ok(reading.aliases[word].every(alias => alias !== word && alias === alias.toLowerCase()), word);
  }
});
