"use strict";
const test = require("node:test"), assert = require("node:assert/strict");
const fs = require("node:fs"), path = require("node:path"), vm = require("node:vm");
const reading = require("../../assets/study/english-reading.js");
const html = fs.readFileSync(path.join(__dirname, "../../index.html"), "utf8").replace(/\r/g, "");
function fn(name) {
  const start = html.indexOf("  function " + name + "(");
  assert.ok(start >= 0, name);
  return html.slice(start, html.indexOf("\n  }", start) + 4);
}
function setup() {
  const stored = new Map();
  const ctx = {
    window: {EnglishReading: reading}, readingFallback: false, lastReadingIndex: -1, readingRecent: [], rememberReading() {},
    sinceReview: 0, lastReviewKey: "", REVIEW_GAP: 2, BOOK_MAX: 24,
    SET: 10, DAILY: 100, BANK_SIZES: {reading:16}, SKILL_INFO: {reading:{name:"영어"}},
    todayKey: () => "2026-9-6", dayNum: () => 100, MASTER_AT:9,
    localStorage:{getItem:k=>stored.get(k) ?? null,setItem:(k,v)=>stored.set(k,v)},
    state:{solved:0,credit:0,level:2,streak:2,wrong:[],skills:{},readingWords:{},parentMode:false},
    current:null, setCorrect:0, CHEERS:["잘했어요"], cheerEl:{},
    drawDaily(){}, drawSetStars(){}, setTimeout:()=>1, applyState(){},renderProblem(){}
  };
  vm.createContext(ctx);
  vm.runInContext(["nextStudySeed","readingMistake","bookKey","addToBook","removeFromBook",
    "skillOf","saveState","loadState","pick","isFree","hasTicket"].map(fn).join("\n"), ctx);
  const question = (idx = 0) => {
    const sentence = reading.sentences[idx];
    ctx.current = {answer:sentence.text,reading:sentence,seed:{type:"reading",idx},
      review:ctx.state.wrong.some(e=>e.type==="reading" && e.idx===idx)};
    return ctx.current;
  };
  return {ctx,stored,question};
}
test("single stream schedules 80 reading questions per 100, starting with English, without mode controls",()=>{
  const {ctx} = setup(); let count=0;
  for(let i=0;i<100;i++) {
    ctx.state.solved=i;
    const seed=ctx.nextStudySeed();
    if(seed) { count++; ctx.lastReadingIndex=seed.idx; }
    assert.equal(!!seed, i%5!==4);
  }
  assert.equal(count,80);
  assert.doesNotMatch(html,/data-study-mode|id="studyModes"|studyMode ===/);
});
test("English review gets priority after a gap without taking other-subject slots or immediate duplicates",()=>{
  const {ctx}=setup();
  ctx.state.wrong=[{type:"reading",idx:0,miss:2},{type:"word",idx:1,miss:1}];
  ctx.sinceReview=2; ctx.lastReviewKey="reading:i1"; ctx.lastReadingIndex=1;
  assert.equal(ctx.nextStudySeed().idx,0);
  ctx.state.solved=4;
  assert.equal(ctx.nextStudySeed().type,"word");
  ctx.state.solved=5; ctx.lastReviewKey="reading:i0"; ctx.lastReadingIndex=0;
  assert.notEqual(ctx.nextStudySeed().idx,0);
});
test("only expected difficult words are recorded once per displayed question; no transcript is saved",()=>{
  const {ctx,stored,question}=setup(); const q=question();
  ctx.readingMistake(q,["apples","bananas","apples"]);
  ctx.readingMistake(q,["apples"]);
  assert.equal(ctx.state.wrong.length,1);
  assert.equal(ctx.state.wrong[0].miss,1);
  assert.equal(ctx.state.readingWords.apples,1);
  assert.equal(ctx.state.readingWords.bananas,undefined);
  assert.equal(ctx.state.solved,0);
  assert.equal(ctx.state.streak,2);
  assert.equal(ctx.state.level,2);
  assert.equal(stored.get("hub2_reading_words"),'{"apples":1}');
  ctx.current=question(1);
  ctx.readingMistake(q,["like"]);
  assert.equal(ctx.state.readingWords.like,undefined,"old callbacks ignored");
});
test("repairing the same attempt keeps the review; later clean success clears it and lowers word priority",()=>{
  const {ctx,question}=setup(); const first=question();
  ctx.readingMistake(first,["apples"]);
  ctx.pick(first.answer,null);
  assert.equal(ctx.state.solved,1);
  assert.equal(ctx.state.wrong.length,1);
  assert.equal(ctx.state.readingWords.apples,1);
  const review=question(); ctx.pick(review.answer,null);
  assert.equal(ctx.state.solved,2);
  assert.equal(ctx.state.wrong.length,0);
  assert.equal(ctx.state.readingWords.apples,undefined);
});
test("word trouble raises selection frequency, spans sentences, and never immediately repeats the last sentence",()=>{
  let base=0, weighted=0;
  for(let n=0;n<1000;n++) {
    const random=()=>n/1000;
    if(reading.chooseSentence({},n,-1,random)===0) base++;
    if(reading.chooseSentence({apples:5},n,-1,random)===0) weighted++;
    assert.notEqual(reading.chooseSentence({apples:5},n,0,random),0);
  }
  assert.ok(weighted>base*3);
  const seen=new Set();
  for(let n=0;n<1000;n++) {
    const idx=reading.chooseSentence({like:5},n,-1,()=>n/1000);
    if(reading.sentences[idx].text.includes("like")) seen.add(idx);
  }
  assert.equal(seen.size,reading.sentences.filter(s=>/\blike\b/i.test(s.text)).length);
});
test("review and vocabulary survive reload and date rollover with bounded, allowlisted data",()=>{
  const {ctx,stored,question}=setup();
  ctx.readingMistake(question(),["apples"]);
  ctx.todayKey=()=>"2026-9-7";
  ctx.state=ctx.loadState();
  assert.equal(ctx.state.solved,0);
  assert.equal(ctx.state.wrong[0].idx,0);
  assert.equal(ctx.state.readingWords.apples,1);
  stored.set("hub2_reading_words",'{"apples":900,"secret":99,"like":"2","milk":-4}');
  const clean=ctx.loadState();
  assert.deepEqual(Object.assign({},clean.readingWords),{apples:5});
  stored.set("hub2_reading_words","not json");
  assert.doesNotThrow(()=>ctx.loadState());
});
test("fallback still permits non-reading reviews, and parent or ticket states cannot record mistakes",()=>{
  const {ctx,question}=setup();
  ctx.readingFallback=true;
  assert.equal(ctx.nextStudySeed(),null);
  const q=question();
  ctx.state.parentMode=true; ctx.readingMistake(q,["apples"]);
  ctx.state.parentMode=false; ctx.state.credit=1; ctx.readingMistake(q,["apples"]);
  assert.equal(ctx.state.wrong.length,0);
});
test("recent sentences are skipped in order and under word weighting; the hub remembers 12 on this device only",()=>{
  const n=reading.sentences.length;
  assert.equal(n,68);
  assert.equal(reading.chooseSentence({},0,-1,()=>0,[0,1,2]),3);
  assert.equal(reading.chooseSentence({},67,-1,()=>0,[67,0]),1);
  for(let k=0;k<200;k++){
    const idx=reading.chooseSentence({apples:5,like:5},k,0,()=>k/200,[0,5,22,23]);
    assert.ok(![0,5,22,23].includes(idx),String(idx));
  }
  const all=[...Array(n).keys()];
  assert.equal(typeof reading.chooseSentence({},7,3,()=>0,all),"number");
  assert.equal(reading.recentLimit,12);
  assert.match(html,/hub2_reading_recent/);
  assert.match(html,/rememberReading\(target\.seed\.idx\)/);
  assert.match(html,/readingRecent\.indexOf\(entry\.idx\) >= 0/);
  const {ctx}=setup();
  ctx.readingRecent=[0,1,2,3];
  ctx.state.wrong=[{type:"reading",idx:2,miss:1}];ctx.sinceReview=5;
  const seed=ctx.nextStudySeed();
  assert.equal(seed.type,"reading");assert.notEqual(seed.idx,2);assert.ok(![0,1,2,3].includes(seed.idx));
});
