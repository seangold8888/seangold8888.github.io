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
function setup(options = {}, callbacks) {
  const instances = [], timers = new Map();
  let counter = 0, passes = 0;
  class Recognition {
    constructor() { instances.push(this); }
    start() { this.started = true; if (this.onstart) this.onstart(); }
    abort() { this.aborted = true; }
  }
  const doc = Object.assign(target(), { hidden: false, createElement: node });
  const env = Object.assign(target(), { document: doc, navigator: { onLine: true }, isSecureContext: true,
    SpeechRecognition: Recognition, SpeechSynthesisUtterance: class { constructor(text) { this.text = text; } },
    speechSynthesis: { speaking: false, getVoices: () => [{ lang: "en-US" }],
      speak(speech) { this.last = speech; this.speaking = true; },
      cancel() { this.speaking = false; } },
    setTimeout: fn => { timers.set(++counter, fn); return counter; }, clearTimeout: id => timers.delete(id)
  }, options);
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

test("sixteen short sentences have unique text and meanings", () => {
  assert.equal(reading.sentences.length, 16);
  assert.equal(new Set(reading.sentences.map(s => s.text)).size, 16);
  for (const s of reading.sentences) { assert.ok(s.meaning); assert.ok(s.text.split(" ").length <= 6); }
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
test("listen button and speech playback are removed", () => {
  const s = setup();
  assert.equal(s.container.children[3].children.length, 2);
  assert.equal(s.mic.textContent, "🎤 읽어 보기");
  const source = fs.readFileSync(path.join(__dirname, "../../assets/study/english-reading.js"), "utf8");
  assert.doesNotMatch(source, /먼저 듣기|speechSynthesis|SpeechSynthesisUtterance/);
});
test("final mismatch marks the different word red, stops and permits a clean retry", () => {
  const s = setup(); s.mic.fire("click");
  const late = s.instances[0].onresult;
  s.result([["I like bananas", true]]);
  const words = s.container.children[1].children;
  assert.equal(words[0].classList.contains("heard"), true);
  assert.equal(words[2].classList.contains("retry"), true);
  assert.equal(s.status.classList.contains("retry"), true);
  assert.match(s.status.textContent, /다시 읽어 주세요/);
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
  assert.doesNotMatch(source, /innerHTML|localStorage|sessionStorage|MediaRecorder|fetch\(/);
});
const html = fs.readFileSync(path.join(__dirname, "../../index.html"), "utf8").replace(/\r/g, "");
function fn(name) {
  const start = html.indexOf("  function " + name + "(");
  return html.slice(start, html.indexOf("\n  }", start) + 4);
}
test("a reading success advances progress once and earns the tenth-answer ticket without math growth", () => {
  const skill = { s: 0, d: 0 };
  const ctx = { isFree: () => false, hasTicket: () => ctx.state.credit > 0,
    current: { answer: "I like apples.", reading: {}, seed: { type: "reading", idx: 0 } },
    state: { solved: 9, credit: 0, streak: 3, level: 2 }, setCorrect: 9, SET: 10, DAILY: 100,
    CHEERS: ["잘했어요"], BANK_SIZES: { reading: 16 }, MASTER_AT: 9, cheerEl: {},
    skillOf: () => skill, dayNum: () => 100, drawSetStars() {}, drawDaily() {}, saveState() {},
    setTimeout: () => 1, applyState() {}, renderProblem() {} };
  vm.runInNewContext(fn("pick"), ctx);
  ctx.pick("I like apples.", null); ctx.pick("I like apples.", null);
  assert.equal(ctx.state.solved, 10); assert.equal(ctx.state.credit, 1); assert.equal(ctx.setCorrect, 0);
  assert.equal(skill.s, 1); assert.equal(ctx.state.streak, 3); assert.equal(ctx.state.level, 2);
});
test("reading support is cached and its script loads before the study controller", () => {
  const sw = require("../../sw.js");
  assert.ok(sw.CORE_SHELL.includes("./assets/study/english-reading.js?v=3"));
  assert.ok(html.indexOf('src="assets/study/english-reading.js?v=3"') < html.indexOf("var BANK_SIZES"));
  assert.match(html, /\.reading-word\.retry\s*\{[^}]*text-decoration:underline wavy/);
  assert.match(html, /if \(current !== target \|\| isFree\(\) \|\| hasTicket\(\) \|\| target\.answered\) return/);
  assert.match(html, /function stopReading\(\)[\s\S]*?clearTimeout\(answerTimer\)/);
});
