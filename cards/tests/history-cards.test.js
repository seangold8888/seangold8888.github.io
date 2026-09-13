"use strict";
const test=require("node:test"),assert=require("node:assert/strict"),fs=require("node:fs"),path=require("node:path"),vm=require("node:vm"),crypto=require("node:crypto");
const root=path.resolve(__dirname,".."),data=require("../cards.json"),Engine=require("../js/engine.js"),sw=require("../../sw.js");
const ids=["sejong","jangyeongsil","heojun","shinsaimdang","jeongyakyong","kimhongdo","yugwansun","kimgu"];
const sha=o=>crypto.createHash("sha256").update(JSON.stringify(o)).digest("hex");
function runtime(file) {
 const box={window:{},document:{hidden:false},localStorage:{getItem(){return null},setItem(){}},setTimeout,clearTimeout};
 box.Math=Object.create(Math);box.Math.random=()=>.25;
 vm.runInNewContext(fs.readFileSync(path.join(root,"js",file),"utf8"),box);return box.window;
}
test("history expansion preserves every original 76 card and collection entry",()=>{
 assert.equal(sha(data.cards.slice(0,76)),"c9f7be0431592cdfd17b5bb2418e23382a31f502434988ad69653610ec482397");
 assert.equal(sha(data.collection.slice(0,76)),"8223d33ea7f54966cd5613450f3116ac30f0f06940ca512405327a2ecc94a90a");
 assert.deepEqual(data.cards.slice(76).map(c=>c.id),ids);
 assert.deepEqual(data.collection.slice(76),ids);
});
test("all 522 original hit/weakness/miss sound plans remain unchanged",()=>{
 const audio=runtime("audio.js").CardAudio;
 const plans=data.cards.slice(0,76).flatMap(card=>card.attacks.flatMap(a=>["hit","weakness","miss"].map(outcome=>audio.soundPlanForTechnique({
 type:card.type,attack:a.name,kind:a.vfx.kind,emoji:a.vfx.emoji,big:a.vfx.big,outcome,impactAtMs:220,totalMs:500}))));
 assert.equal(plans.length,522);
 assert.equal(sha(plans),"e26fdbd03bda5f855b40c85e556ab9b8e759c0d23980fbe12559d2b8ef9c16b2");
});
test("eight history cards have playable mechanics, portraits, crops, tiers and offline entries",()=>{
 const view=runtime("card-view.js").CardView;
 for(const id of ids){
  const c=data.cards.find(c=>c.id===id);
  assert.ok(Engine.isBattleCard(c),id);assert.equal(c.hp%10,0);
  assert.equal(c.attacks.length,2);
  assert.ok(!c.attacks.some(a=>/heal|skip/.test(a.fx||"")));
  assert.notEqual(c.passive.fx,"coin_evade");
  assert.match(view.artPosition[id],/%/);
  assert.ok(Object.values(view.battleTiers).some(set=>set.has(id)));
  assert.equal(c.unlock,id==="sejong"?null:("game:math/streak"+(["jeongyakyong","yugwansun","kimgu"].includes(id)?7:3)));
  const png=fs.readFileSync(path.join(root,c.art)),webp=fs.readFileSync(path.join(root,"art",id+".webp"));
  assert.equal(png.readUInt32BE(16),1024);assert.equal(png.readUInt32BE(20),1536);
  assert.equal(webp.toString("ascii",8,12),"WEBP");
  assert.equal(sw.CARD_ART_FILES.filter(p=>p==="./cards/art/"+id+".webp").length,1);
 }
});
test("forty history questions are answerable from the matching sourced biography",()=>{
 const gates=runtime("story-gates.js").CardStoryGates;
 for(const id of ids){
  const profile=gates.historyForCard(id);
  assert.ok(profile&&Object.isFrozen(profile));assert.ok(profile.paragraphs.length>=2);
  assert.match(profile.source,/^https:\/\//);
  assert.equal(gates.storyIdForCard(id),"legend:"+id);
  assert.equal(gates.countForCard(id),5);
  const bank=gates.all.filter(q=>q.cardId===id);
  assert.equal(new Set(bank.map(q=>q.id)).size,5);
  for(const q of bank){assert.equal(q.choices.length,3);assert.ok(q.choices.find(c=>c.id===q.correctChoiceId));assert.equal(q.source.refs[0],profile.source);}
 }
 assert.equal(gates.historyForCard("jaei"),null);
});
