"use strict";
const test=require("node:test"),assert=require("node:assert/strict"),fs=require("node:fs"),path=require("node:path"),vm=require("node:vm"),crypto=require("node:crypto");
const data=require("../cards.json"),E=require("../js/engine.js"),sw=require("../../sw.js"),root=path.resolve(__dirname,".."),c=data.cards.find(c=>c.id==='jaewing');
const sha=o=>crypto.createHash('sha256').update(JSON.stringify(o)).digest('hex');
function runtime(file){const box={window:{},document:{hidden:false},localStorage:{getItem(){return null},setItem(){}},setTimeout,clearTimeout};box.Math=Object.create(Math);box.Math.random=()=>.25;vm.runInNewContext(fs.readFileSync(path.join(root,'js',file),'utf8'),box);return box.window;}
test('Jaewing appends exactly one card and preserves all 84 existing cards and their order',()=>{
 assert.equal(data.cards.length,85);assert.equal(data.collection.length,85);assert.equal(data.cards.at(-1).id,'jaewing');assert.equal(data.collection.at(-1),'jaewing');
 assert.equal(sha(data.cards.slice(0,84)),'10e78e90ad191f1206ceeb421c6aad61c643b775d366b112b8c143bd2b867c60');
 assert.equal(sha(data.collection.slice(0,84)),'c52eafbffcc49f068e5378763d301bd4551f6513242296a3a539b357f89f751f');
});
test('all 570 legacy sound plans are unchanged; three new unused emoji route to air',()=>{
 const audio=runtime('audio.js').CardAudio;
 const plans=data.cards.slice(0,84).flatMap(card=>card.attacks.flatMap(a=>['hit','weakness','miss'].map(outcome=>audio.soundPlanForTechnique({type:card.type,attack:a.name,kind:a.vfx.kind,emoji:a.vfx.emoji,big:a.vfx.big,outcome,impactAtMs:220,totalMs:500}))));
 assert.equal(plans.length,570);assert.equal(sha(plans),'35ce3a62ebc9da448979e57a9f91568c289f1ec3f364149d6a1e8d50fdbf9451');
 const used=new Set(data.cards.slice(0,84).flatMap(card=>card.attacks.map(a=>a.vfx.emoji)));
 for(const a of c.attacks){assert.ok(!used.has(a.vfx.emoji));const plan=audio.soundPlanForTechnique({type:c.type,attack:a.name,...a.vfx,outcome:'hit',impactAtMs:220,totalMs:500});assert.equal(plan.material,'air');assert.ok(plan.tailMs<=1000);}
});
test('Jaewing has safe complete mechanics, a lore introduction, crop, earned math goal and one offline portrait',()=>{
 assert.ok(E.isBattleCard(c));assert.equal(c.hp,110);assert.equal(c.element,'water');assert.equal(c.passive.fx,'first_hit_zero');
 assert.deepEqual(c.attacks.map(a=>[a.cost,a.dmg,a.fx]),[[1,20,null],[2,30,'weaken_next_20'],[4,70,null]]);
 assert.match(c.lore,/재이의 괴물 친구/);assert.equal(c.unlock,'game:math/streak7');
 const view=runtime('card-view.js').CardView;assert.equal(view.battleTier(c),'C');assert.equal(view.artPosition.jaewing,'50% 40%');
 assert.deepEqual(data.tierUnlockGoals.math.C,{studyDays:2,problems:10});
 assert.equal(sw.CARD_ART_FILES.filter(p=>p==='./cards/art/jaewing.webp').length,1);
 const png=fs.readFileSync(path.join(root,c.art));assert.equal(png.readUInt32BE(16),1024);assert.equal(png.readUInt32BE(20),1536);
 assert.equal(fs.readFileSync(path.join(root,'art/jaewing.webp')).toString('ascii',8,12),'WEBP');
});
test('five Jaewing questions use card facts, not an unavailable audio story',()=>{
 const gates=runtime('story-gates.js').CardStoryGates;assert.equal(gates.storyIdForCard(c),'legend:jaewing');assert.equal(gates.countForCard(c),5);
 const bank=gates.all.filter(q=>q.cardId===c.id);assert.equal(new Set(bank.map(q=>q.id)).size,5);
 for(const q of bank){assert.equal(q.source.kind,'local_metadata');assert.equal(q.choices.length,3);assert.ok(q.choices.find(a=>a.id===q.correctChoiceId));}
});
