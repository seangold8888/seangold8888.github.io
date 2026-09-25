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
const cardViewSource = fs.readFileSync(path.join(__dirname,"../js/card-view.js"),"utf8");
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
  querySelectorAll(selector) {return walk(this).slice(1).filter(n=>selector.startsWith(".")?hasClass(n,selector.slice(1)):n.tag===selector);}
  click() {if(!this.disabled&&this.events.click)this.events.click();}
}
function setup(initial,owned) {
  let raw=initial?JSON.stringify(initial):null;
  const storage={getItem:()=>raw,setItem:(key,value)=>raw=value};
  const nodes=Object.fromEntries(["campaignScreen","campaignButton","campaignSaveNotice"].map(id=>[id,new Node("div")]));
  const document={createElement:tag=>new Node(tag),getElementById:id=>nodes[id]};
  const window={CardCampaign:{...C,load:()=>C.load(storage),save:p=>C.save(p,storage)},CardEngine:Engine,CardAudio:{prime(){}}};
  const context={window,document};
  vm.runInNewContext(cardViewSource,context);   // 실전 등급으로 모은 카드를 정렬한다
  vm.runInNewContext(source,context);
  let battle=null;
  const ui=window.CardCampaignUI.create({cards:data.cards,showScreen(){},onExit(){},onBattle:request=>battle=request,
    ownedIds:()=>(owned||[]).slice()});
  const root=nodes.campaignScreen;
  const find=(className)=>walk(root).find(n=>hasClass(n,className));
  function scene() {
    const key=find("expedition-scene").dataset.sceneKey;
    for(let i=0;i<10 && find("expedition-scene")?.dataset.sceneKey===key;i++)
      find("expedition-scene-sheet").querySelector(".primary-button").click();
    assert.notEqual(find("expedition-scene")?.dataset.sceneKey,key,"scene must finish");
  }
  return {ui,root,find,scene,nodes,get battle(){return battle;},get progress(){return C.load(storage);}};
}
function chapterOne() {
  let p=C.beginBattle(C.finishIntro(C.createProgress()),"jaei");
  return C.finishChapter(C.finishBattle(p,p.battleSerial,"player"));
}
test("family ending reuses the four card portraits, never the differently dressed math picture",()=>{
  let p=C.createProgress();
  for(let chapter=0;chapter<8;chapter++){
    p=C.finishIntro(p);
    if(chapter)p=C.selectParty(p,["jaei","taeo","redhood"]);
    for(const id of C.encounterIds(chapter)){p=C.beginBattle(p,"jaei");p=C.finishBattle(p,p.battleSerial,"player");}
    if(chapter<7)p=C.finishChapter(p);
  }
  p=C.advanceEnding(C.advanceEnding(p));
  const qa=setup(p);qa.ui.resume();
  const images=walk(qa.find("expedition-family-art")).filter(n=>n.tag==="img");
  assert.deepEqual(images.map(n=>n.src),["art/appa.webp","art/eomma.webp","art/jaei.webp","art/taeo.webp"]);
  assert.equal(images.length,4);
  assert.ok(images.every(n=>typeof n.events.click==="function"));
  assert.doesNotMatch(source,/math\/assets\/jaei-family/);
});

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
test("S2 party offers starters and recruits when nothing else is collected, and records a lost card as resting",()=>{
  const qa=setup(chapterOne());qa.ui.resume();qa.scene();
  const choices=qa.find("expedition-candidates");
  assert.deepEqual(choices.children.map(n=>n.dataset.cardId),["jaei","taeo","yunchan","yungeon","redhood"]);
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
test("expanded scenes show two paragraphs per page, support rereading and advance only after the last page",()=>{
  const qa=setup();qa.ui.resume();
  const initial=qa.find("expedition-scene-lines").children.map(n=>n.textContent);
  assert.deepEqual(initial,C.SCENES[0].intro.slice(0,2));
  assert.ok(qa.find("expedition-previous").disabled);
  const count=Number(qa.find("expedition-scene").dataset.pageCount);
  qa.find("expedition-scene-sheet").querySelector(".primary-button").click();
  assert.equal(qa.find("expedition-scene").dataset.page,"1");
  assert.equal(qa.find("expedition-scene-lines").children.length,2);
  assert.match(qa.find("expedition-scene-lines").children.map(n=>n.textContent).join(" "),/블레이뽀/);
  qa.find("expedition-previous").click();
  assert.deepEqual(qa.find("expedition-scene-lines").children.map(n=>n.textContent),initial);
  for(let i=0;i<count-1;i++)qa.find("expedition-scene-sheet").querySelector(".primary-button").click();
  assert.equal(qa.progress.phase,"intro","reading pages must not finish the intro");
  assert.equal(qa.find("expedition-scene-lines").children.length,2);
  qa.find("expedition-scene-sheet").querySelector(".primary-button").click();
  assert.equal(qa.progress.phase,"encounter");
});

test("expanded story keeps Ta eo's family song and gives each scene actions and dialogue",()=>{
  const scenes=Object.values(C.SCENES).flatMap(chapter=>Object.values(chapter));
  assert.equal(scenes.length,23);
  for(const lines of scenes) {
    assert.ok(lines.length>=6 && lines.length<=8);
    assert.ok(lines.every(line=>line.length>10 && line.length<=180));
    assert.ok(lines.some(line=>line.includes("“")));
  }
  for(const lines of [C.SCENES[0].intro,C.SCENES[4].intro,C.ENDING[1]]) {
    assert.ok(lines.some(line=>line.includes("잇츠 레인보우, 잇츠 레인보우")));
    assert.ok(lines.some(line=>line.includes("블레이뽀, 블레이뽀, 잇츠 레인보우")));
    assert.ok(!lines.join("").includes("뷰티풀"),"keep the family's intentional pronunciation");
  }
  assert.equal(C.SCENE_PAGE_SIZE,2);
});

test("S2 module and styles are cached exactly once and load before the app",()=>{
  const html=fs.readFileSync(path.join(__dirname,"../index.html"),"utf8");
  const sw=require("../../sw.js");
  for(const name of ["campaign.css","js/campaign.js","js/campaign-ui.js"]){
    assert.equal(sw.CORE_SHELL.filter(item=>item==="./cards/"+name+"?v=70").length,1);
    assert.ok(html.indexOf(name+"?v=70")<html.indexOf("js/app.js?v=70"));
  }
});

test("collected cards join the expedition after the starters and recruits",()=>{
  const qa=setup(chapterOne(),["taeo","mermaid","zhangfei"]);qa.ui.resume();qa.scene();
  const choices=qa.find("expedition-candidates");
  assert.deepEqual(choices.children.map(n=>n.dataset.cardId),["jaei","taeo","yunchan","yungeon","redhood","mermaid","zhangfei"],
    "expedition friends first, then collected cards with the strongest tier in front");
  choices.children.filter(n=>["mermaid","zhangfei"].includes(n.dataset.cardId))
    .forEach(n=>assert.ok(walk(n).some(child=>child.textContent==="모은 카드"),n.dataset.cardId));
  choices.children.find(n=>n.dataset.cardId==="mermaid").click();
  qa.find("expedition-go").click();
  assert.deepEqual(qa.progress.party,["jaei","taeo","mermaid"]);
  assert.equal(qa.progress.phase,"encounter");
  qa.find("expedition-deploy").children.find(n=>n.dataset.cardId==="mermaid").click();
  assert.equal(qa.battle.player.id,"mermaid","a collected card can be sent into an expedition battle");
});

test("a party saved with a collected card survives a reload while that card is still owned",()=>{
  const first=setup(chapterOne(),["mermaid"]);first.ui.resume();first.scene();
  first.find("expedition-candidates").children.find(n=>n.dataset.cardId==="mermaid").click();
  first.find("expedition-go").click();
  const saved=first.progress;
  assert.deepEqual(saved.party,["jaei","taeo","mermaid"]);
  const again=setup(saved,["mermaid"]);
  assert.deepEqual(again.progress.party,saved.party);
});

test("a big collection is narrowed by element chips and can be picked for the child",()=>{
  const owned=data.cards.filter(card=>Engine.isBattleCard(card)).slice(0,24).map(card=>card.id);
  const qa=setup(chapterOne(),owned);qa.ui.resume();qa.scene();
  const chips=qa.find("expedition-filters").children.map(n=>n.textContent);
  assert.ok(chips[0].startsWith("전체"),chips.join("|"));
  assert.ok(chips.length>2,"one chip per element in the collection");
  const water=qa.find("expedition-filters").children.find(n=>n.textContent.startsWith("💧"));
  water.click();
  const cards=qa.find("expedition-candidates").children;
  const shown=cards.map(n=>n.dataset.cardId);
  const total=Number(qa.find("expedition-filters").children[0].textContent.split(" ").pop());
  assert.ok(shown.length>0 && shown.length<total,shown.length+"/"+total);
  // 물 카드이거나, 이미 고른 카드(재이·태오)만 남는다.
  shown.forEach(id=>assert.ok(data.cards.find(card=>card.id===id).element==="water" ||
    cards.find(n=>n.dataset.cardId===id).attrs["aria-pressed"]==="true",id));
  const picked=cards.find(n=>n.attrs["aria-pressed"]==="true").dataset.cardId;
  qa.find("expedition-filters").children.find(n=>n.textContent.startsWith("🔥")).click();
  assert.ok(qa.find("expedition-candidates").children.some(n=>n.dataset.cardId===picked),"a picked card stays visible");
});

test("the recommend button fills three friends that suit the chapter",()=>{
  const owned=data.cards.filter(card=>Engine.isBattleCard(card)).slice(0,24).map(card=>card.id);
  const qa=setup(chapterOne(),owned);qa.ui.resume();qa.scene();
  qa.find("expedition-recommend").click();
  const chosen=qa.root.querySelectorAll(".expedition-card").filter(n=>n.attrs["aria-pressed"]==="true")
    .map(n=>n.dataset.cardId);
  const party=Array.from(new Set(chosen));
  assert.equal(party.length,3,"three different friends");
  const elements=new Set(party.map(id=>data.cards.find(card=>card.id===id).element));
  assert.ok(elements.size>=2,"the picks do not all share one element");
  const foes=C.encounterIds(1).map((id,stage)=>C.encounter(1,stage,data.cards).card);
  const good=party.filter(id=>{
    const element=data.cards.find(card=>card.id===id).element;
    return foes.some(foe=>Engine.ELEMENT_CHART[foe.element] && Engine.ELEMENT_CHART[foe.element].weakTo===element);
  });
  assert.ok(good.length>=1,"at least one pick beats an enemy of this chapter");
  assert.equal(qa.find("expedition-go").disabled,false);
  qa.find("expedition-go").click();
  assert.deepEqual(qa.progress.party.slice().sort(),party.slice().sort());
});

test("a finished expedition offers a new run with medals, sturdier foes and a story skip",()=>{
  let p=C.createProgress();
  for(let chapter=0;chapter<8;chapter++){
    p=C.finishIntro(p);
    if(chapter)p=C.selectParty(p,["jaei","taeo","redhood"]);
    for(const id of C.encounterIds(chapter)){p=C.beginBattle(p,"jaei");p=C.finishBattle(p,p.battleSerial,"player");}
    if(chapter===7)for(let i=0;i<3;i++)p=C.advanceEnding(p);
    p=C.finishChapter(p);
  }
  let kept=null;
  const qa=setup(p);
  qa.ui.showMap();
  assert.match(qa.nodes.campaignButton.textContent,/🏅/);
  const again=qa.find("expedition-new-run");
  assert.match(again.textContent,/2번째 원정/);
  again.click();
  assert.equal(qa.progress.run,2);
  assert.equal(qa.progress.ending,1);
  assert.equal(qa.progress.chapter,0);
  const skip=qa.find("expedition-skip");
  assert.ok(skip,"second runs can skip the story they already heard");
  const key=qa.find("expedition-scene").dataset.sceneKey;
  skip.click();
  assert.notEqual(qa.find("expedition-scene")?.dataset.sceneKey,key);
});
