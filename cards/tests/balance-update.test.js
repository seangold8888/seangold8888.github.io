"use strict";
const test=require("node:test"),assert=require("node:assert/strict"),crypto=require("node:crypto");
const data=require("../cards.json"),C=require("../js/campaign.js"),E=require("../js/engine.js");
const {beforeMidasRollback}=require("./approved-card-baseline.cjs");
const sha=o=>crypto.createHash("sha256").update(JSON.stringify(o)).digest("hex");
test("only the approved Midas passive changes; family and recruited Sseugumi remain byte-stable",()=>{
 assert.equal(sha(beforeMidasRollback(data.cards)),"36dab38a3d811d84de2d847e32760f26382848c161c261ccc3ad66a2280722dd");
 assert.equal(sha(data.cards.filter(c=>["jaei","taeo","appa","eomma"].includes(c.id))),"2b60354935c9e8ab9bdeb7f9b5376b414d6732d1f40e5f61adb0d5e2e1b034a5");
 assert.equal(sha(data.cards.find(c=>c.id==="sseugumi")),"e48575b93f5e6a2a1c6b4db5fa0e0de7066650f96ba2fa291ffaad7db8bf66bc");
 assert.deepEqual(data.cards.find(c=>c.id==="midas").passive,{name:"황금의 저주",desc:"내 턴이 끝날 때마다 내 체력이 10 줄어요",fx:"self_hurt_10_eot"});
});
test("Midas actually loses 10 HP at the end of its own turn",()=>{
 const m=data.cards.find(c=>c.id==="midas"),foe={id:"dummy",name:"시험 상대",hp:990,attacks:[{name:"시험",cost:1,dmg:10}]};
 const s=E.performAction(E.createGame(m,foe),{type:"attack",attackIndex:0},()=>.9);
 assert.equal(s.sides.player.hp,m.hp-10);
});
test("only the final encounter copy gets 140 HP and 40/80 damage, including the no-asset template path",()=>{
 const before=JSON.stringify(data),template=JSON.stringify(C.FINAL_BOSS);
 for (const pool of [data.cards,[]]){
  const boss=C.encounter(7,3,pool);
  assert.equal(boss.hpBonus,40);assert.equal(boss.card.hp,140);
  assert.deepEqual(boss.card.attacks.map(a=>a.dmg),[20,10,40,80]);
  boss.card.attacks[2].dmg=999;boss.card.passive.fx="changed";
  assert.deepEqual(C.encounter(7,3,pool).card.attacks.map(a=>a.dmg),[20,10,40,80]);
 }
 assert.equal(JSON.stringify(data),before);assert.equal(JSON.stringify(C.FINAL_BOSS),template);
 assert.deepEqual(data.cards.find(c=>c.id==="sseugumi").attacks.map(a=>a.dmg),[20,10,30,60]);
});
