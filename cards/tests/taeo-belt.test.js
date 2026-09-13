"use strict";
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const root=path.resolve(__dirname,'..');
test('Taeo belt quiz uses the clarified blue base with green stripe, not a black belt',()=>{
 const box={window:{}};vm.runInNewContext(fs.readFileSync(path.join(root,'js/story-gates.js'),'utf8'),box);
 const bank=box.window.CardStoryGates.all.filter(q=>q.cardId==='taeo'),q=bank.find(q=>q.id==='taeo-belt');
 assert.equal(bank.length,5);assert.equal(q.correctChoiceId,'blue-green');assert.equal(q.choices.find(c=>c.id===q.correctChoiceId).text,'파란 바탕에 초록 줄이 있는 띠');
 assert.ok(q.source.refs.some(ref=>ref.includes('도복은 흰색')));
 const png=fs.readFileSync(path.join(root,'art/taeo.png'));assert.equal(png.readUInt32BE(16),1024);assert.equal(png.readUInt32BE(20),1536);
 assert.equal(fs.readFileSync(path.join(root,'art/taeo.webp')).toString('ascii',8,12),'WEBP');
 const campaign=fs.readFileSync(path.join(root,'js/campaign-ui.js'),'utf8');assert.match(campaign,/\["appa", "eomma", "jaei", "taeo"\]/);
});
