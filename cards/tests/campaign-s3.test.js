"use strict";
const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");
const crypto = require("node:crypto");
const C = require("../js/campaign.js");
const data = require("../cards.json");
const root = path.join(__dirname, "..");
const read = file => fs.readFileSync(path.join(root, file), "utf8");

function runtime(file) {
  const box = {window:{}, document:{hidden:false}, localStorage:{getItem(){return null;},setItem(){}}, setTimeout, clearTimeout};
  box.Math = Object.create(Math);
  box.Math.random = () => 0.25;
  vm.runInNewContext(read(file), box);
  return box.window;
}
function endingProgress() {
  let p = C.createProgress();
  for (let chapter = 0; chapter < 8; chapter++) {
    p = C.finishIntro(p);
    if (chapter) p = C.selectParty(p, ["jaei","taeo","redhood"]);
    for (const id of C.encounterIds(chapter)) {
      p = C.beginBattle(p, "jaei");
      p = C.finishBattle(p, p.battleSerial, "player");
    }
    if (chapter < 7) p = C.finishChapter(p);
  }
  return p;
}
test("S3 saves all four ending panels and recruits only once, after the last panel", () => {
  let p = endingProgress();
  assert.equal(p.chapter, 7);
  assert.equal(p.phase, "restore");
  let saved = null;
  const storage = {getItem:()=>saved, setItem:(key,value)=>saved=value};
  for (let panel = 0; panel < 4; panel++) {
    assert.equal(p.endingScene, panel);
    assert.equal(p.ending, 0);
    assert.ok(!p.recruited.includes("sseugumi"));
    assert.ok(C.save(p, storage));
    assert.deepEqual(C.load(storage), p);
    if (panel < 3) {
      assert.deepEqual(C.finishChapter(p), p, "cannot skip to recruitment");
      p = C.advanceEnding(p);
    }
  }
  assert.deepEqual(C.advanceEnding(p), p, "last panel cannot overflow");
  const complete = C.finishChapter(p);
  assert.equal(complete.phase, "complete");
  assert.equal(complete.ending, 1);
  assert.equal(complete.recruited.filter(id=>id==="sseugumi").length, 1);
  assert.deepEqual(C.finishChapter(complete), complete);
  assert.deepEqual(C.advanceEnding(complete), complete);
  assert.ok(C.save(complete, storage));
  assert.deepEqual(C.load(storage), complete);
});
test("S3 ending progress migrates v1 records without losing chapters or accepting corrupt indexes", () => {
  const pending = endingProgress();
  const old = {...pending}; delete old.endingScene;
  assert.deepEqual(C.normaliseProgress(old), pending);
  for (const invalid of [-1,4,1.5,"2",null]) {
    assert.deepEqual(C.normaliseProgress({...pending,endingScene:invalid}), C.createProgress());
  }
  assert.deepEqual(C.normaliseProgress({...C.createProgress(),endingScene:1}), C.createProgress());
  assert.deepEqual(C.advanceEnding(C.createProgress()), C.createProgress());
  const complete = C.finishChapter({...pending,endingScene:3});
  const oldComplete = {...complete}; delete oldComplete.endingScene;
  assert.deepEqual(C.normaliseProgress(oldComplete), complete);
});
test("S3 includes every later scene, four ending panels and no narration dependency", () => {
  for (let chapter=2; chapter<=7; chapter++) {
    for (const kind of chapter===7 ? ["intro","beforeBoss"] : ["intro","beforeBoss","restore"]) {
      assert.ok(C.SCENES[chapter][kind].length >= 3);
      assert.ok(Object.isFrozen(C.SCENES[chapter][kind]));
    }
  }
  assert.deepEqual(C.ENDING.map(lines=>lines.length), [6,8,6,4]);
  assert.ok(C.ENDING[3].some(line=>line.includes("쓰구미 대마왕도 같이")));
  assert.doesNotMatch(read("js/campaign-ui.js"), /speechSynthesis|SpeechSynthesisUtterance/);
});
test("S3 published Sseugumi retains the simulated mechanics, with a 100 HP collectible and 140 HP boss copy", () => {
  const card = data.cards.at(-1);
  assert.equal(card.id, "sseugumi");
  assert.equal(data.collection.at(-1), card.id);
  assert.equal(card.unlock, "campaign:ending");
  assert.equal(card.element, null);
  assert.equal(card.hp, 100);
  assert.deepEqual(card.passive, C.FINAL_BOSS.passive);
  assert.deepEqual(card.attacks.map(({name,cost,dmg,fx})=>({name,cost,dmg,fx})), C.FINAL_BOSS.attacks);
  assert.equal(C.encounter(7,3,data.cards).card.hp,140);
  assert.equal(card.hp,100);
  const oldEmoji = new Set(data.cards.slice(0,75).flatMap(card=>card.attacks.map(attack=>attack.vfx.emoji)));
  for (const attack of card.attacks) assert.ok(!oldEmoji.has(attack.vfx.emoji),attack.name);
});
test("S3 leaves all 510 existing hit/support/miss sound plans byte-for-byte unchanged", () => {
  const Audio = runtime("js/audio.js").CardAudio;
  const plans = data.cards.slice(0,75).flatMap(card=>card.attacks.flatMap(attack=>
    ["hit","support","miss"].map(outcome=>Audio.soundPlanForTechnique({
      type:card.type,attack:attack.name,kind:attack.vfx.kind,emoji:attack.vfx.emoji,
      big:attack.vfx.big,outcome,impactAtMs:220,totalMs:500
    }))));
  assert.equal(plans.length,510);
  // Captured from the committed pre-S3 4fd314d audio.js and cards.json, not regenerated.
  assert.equal(crypto.createHash("sha256").update(JSON.stringify(plans)).digest("hex"),
    "61b388a011a250e4c02007188fea61a24c4bafad470767980dd6b1c85300fc00");
  const card=data.cards.at(-1);
  const materials=card.attacks.map(attack=>Audio.soundPlanForTechnique({
    type:card.type,attack:attack.name,kind:attack.vfx.kind,emoji:attack.vfx.emoji,
    big:attack.vfx.big,outcome:"hit",impactAtMs:220,totalMs:500
  }).material);
  assert.deepEqual(materials,["gas","body","body","gas"]);
});
test("S3 has five card-only questions, correctly sized art, crop and exactly one cache entry", () => {
  const gates=runtime("js/story-gates.js").CardStoryGates;
  assert.equal(gates.storyIdForCard("sseugumi"),"legend:sseugumi");
  assert.equal(gates.countForCard("sseugumi"),5);
  const answers = gates.all.filter(q=>q.cardId==="sseugumi").map(q=>q.choices.find(c=>c.id===q.correctChoiceId).text);
  assert.deepEqual(Array.from(answers),["방귀 쿠션","상대 별사탕 1개","다음 턴에 기술을 못 써요","받는 피해를 10 줄여요","대왕 장난"]);
  const png=fs.readFileSync(path.join(root,"art/sseugumi.png"));
  assert.equal(png.readUInt32BE(16),1024);
  assert.equal(png.readUInt32BE(20),1536);
  const webp=fs.readFileSync(path.join(root,"art/sseugumi.webp"));
  assert.equal(webp.toString("ascii",0,4),"RIFF");
  assert.equal(webp.toString("ascii",8,12),"WEBP");
  assert.match(read("js/card-view.js"),/sseugumi: "50% 22%"/);
  const sw=require("../../sw.js");
  assert.equal(sw.CARD_ART_FILES.filter(file=>file==="./cards/art/sseugumi.webp").length,1);
  assert.equal(sw.CORE_SHELL.filter(file=>file==="./math/assets/jaei-family-v4.webp").length,1);
});
