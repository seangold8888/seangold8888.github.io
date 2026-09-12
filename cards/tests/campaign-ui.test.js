"use strict";
const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");
const C = require("../js/campaign.js");
const Engine = require("../js/engine.js");
const data = require("../cards.json");
const source = fs.readFileSync(path.join(__dirname,"../js/campaign-ui.js"),"utf8");
const walk = node => [node,...node.children.flatMap(walk)];
const hasClass = (node,name) => node.className.split(" ").includes(name);
class Node {
  constructor(tag) {this.tag=tag;this.children=[];this.className="";this.textContent="";this.dataset={};this.attrs={};this.style={setProperty(){}};this.events={};this.disabled=false;}
  append(...nodes) {for(const n of nodes){n.parent=this;this.children.push(n);}}
  replaceChildren(...nodes) {this.children=[];this.append(...nodes);}
  replaceWith(node) {const i=this.parent.children.indexOf(this);this.parent.children[i]=node;node.parent=this.parent;}
  addEventListener(type,fn) {this.events[type]=fn;}
  setAttribute(key,value) {this.attrs[key]=String(value);}
  querySelector(selector) {
    let parent=this;
    for(const part of selector.split(" ")) parent=walk(parent).slice(1).find(n=>part.startsWith(".")?hasClass(n,part.slice(1)):n.tag===part);
    return parent;
  }
  click() {if(!this.disabled&&this.events.click)this.events.click();}
}
function setup(initial) {
  let raw=initial?JSON.stringify(initial):null;
  const storage={getItem:()=>raw,setItem:(key,value)=>raw=value};
  const nodes=Object.fromEntries(["campaignScreen","campaignButton","campaignSaveNotice"].map(id=>[id,new Node("div")]));
  const document={createElement:tag=>new Node(tag),getElementById:id=>nodes[id]};
  const window={CardCampaign:{...C,load:()=>C.load(storage),save:p=>C.save(p,storage)},CardEngine:Engine,CardView:{artPosition:{}},CardAudio:{prime(){}}};
  vm.runInNewContext(source,{window,document});
  let battle=null;
  const ui=window.CardCampaignUI.create({cards:data.cards,showScreen(){},onExit(){},onBattle:request=>battle=request});
  const root=nodes.campaignScreen;
  const find=(className)=>walk(root).find(n=>hasClass(n,className));
  function scene() {for(let i=0;i<4;i++)find("expedition-scene-sheet").querySelector("button").click();}
  return {ui,root,find,scene,nodes,get battle(){return battle;},get progress(){return C.load(storage);}};
}
function chapterOne() {
  let p=C.beginBattle(C.finishIntro(C.createProgress()),"jaei");
  return C.finishChapter(C.finishBattle(p,p.battleSerial,"player"));
}
test("S2 map exposes eight worlds but only the current approved chapter can start",()=>{
  const qa=setup();qa.ui.showMap();
  const worlds=walk(qa.root).filter(n=>hasClass(n,"expedition-world"));
  assert.equal(worlds.length,8);assert.equal(worlds.filter(n=>!n.disabled).length,1);
  assert.equal(worlds.find(n=>!n.disabled).dataset.chapter,0);
  assert.ok(!/speechSynthesis|SpeechSynthesisUtterance/.test(source));
});
test("UI saves battle serial, ignores duplicate results and unlocks a recruit only after its scene",()=>{
  const qa=setup();qa.ui.resume();qa.scene();qa.scene();
  const deploy=qa.find("expedition-deploy");deploy.children.find(n=>n.dataset.cardId==="jaei").click();
  const serial=qa.battle.serial;
  qa.ui.settle(serial,"player");assert.equal(qa.progress.phase,"restore");
  assert.equal(qa.ui.hasRecruited("redhood"),false);
  const snapshot=JSON.stringify(qa.progress);qa.ui.settle(serial,"enemy");assert.equal(JSON.stringify(qa.progress),snapshot);
  qa.ui.resume();qa.scene();assert.equal(qa.progress.chapter,1);assert.equal(qa.ui.hasRecruited("redhood"),true);
});
test("S2 party only offers starters and recruits, and records a lost card as resting",()=>{
  const qa=setup(chapterOne());qa.ui.resume();qa.scene();
  const choices=qa.find("expedition-candidates");
  assert.deepEqual(choices.children.map(n=>n.dataset.cardId),["jaei","taeo","redhood"]);
  choices.children.find(n=>n.dataset.cardId==="redhood").click();qa.find("expedition-go").click();
  qa.find("expedition-deploy").children.find(n=>n.dataset.cardId==="taeo").click();
  qa.ui.settle(qa.battle.serial,"enemy");qa.ui.resume();
  assert.ok(qa.find("expedition-deploy").children.find(n=>n.dataset.cardId==="taeo").disabled);
});
test("S3 continues into chapter two without granting the ending early",()=>{
  let p=C.selectParty(C.finishIntro(chapterOne()),["jaei","taeo","redhood"]);
  for(let i=0;i<4;i++){p=C.beginBattle(p,"jaei");p=C.finishBattle(p,p.battleSerial,"player");}
  const qa=setup(p);qa.ui.resume();qa.scene();
  assert.equal(qa.progress.chapter,2);assert.equal(qa.progress.ending,0);
  assert.ok(qa.ui.hasRecruited("cinderella"));
  assert.equal(walk(qa.root).filter(n=>hasClass(n,"expedition-world") && !n.disabled).length,1);
  qa.ui.resume();assert.ok(qa.find("expedition-scene"));assert.equal(qa.battle,null);
});
test("S2 module and styles are cached exactly once and load before the app",()=>{
  const html=fs.readFileSync(path.join(__dirname,"../index.html"),"utf8");
  const sw=require("../../sw.js");
  for(const name of ["campaign.css","js/campaign.js","js/campaign-ui.js"]){
    assert.equal(sw.CORE_SHELL.filter(item=>item==="./cards/"+name+"?v=46").length,1);
    assert.ok(html.indexOf(name+"?v=46")<html.indexOf("js/app.js?v=46"));
  }
});
