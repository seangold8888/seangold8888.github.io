'use strict';
const test = require('node:test'), assert = require('node:assert/strict');
const fs = require('node:fs'), path = require('node:path'), vm = require('node:vm');
const motion = require('../attack-motion.js');
const html = fs.readFileSync(path.join(__dirname, '../index.html'), 'utf8').replace(/\r/g, '');
const source = fs.readFileSync(path.join(__dirname, '../attack-motion.js'), 'utf8');
function array(name) { const start = html.indexOf('const '+name+' = ['); return html.slice(start,html.indexOf('\n];',start)+3); }
const ctx = vm.createContext({});
vm.runInContext(array('COMBO_STEPS')+'\n'+array('GUARDIANS')+'\nglobalThis.steps=COMBO_STEPS;globalThis.heroes=GUARDIANS;', ctx);
const {steps, heroes} = ctx;
function player(row, elapsed, hero = heroes[0]) {
  const s = steps[row], total = (s.windup+s.active+s.recovery)/hero.attackRate;
  return {attackStep:row, attackTotal:total, attack:total-elapsed/hero.attackRate};
}
test('all 27 hero/combo/phase poses use distinct cells on the real damage clock', () => {
  for (const hero of heroes) for (let row=0;row<3;row++) {
    const s=steps[row];
    for (const [col,time,phase] of [[0,s.windup*.5,'windup'],[1,s.windup+s.active*.5,'strike'],[2,s.windup+s.active+s.recovery*.5,'recover']]) {
      const pose=motion.sample(player(row,time,hero),hero,steps);
      assert.equal(pose.row,row); assert.equal(pose.col,col); assert.equal(pose.phase,phase);
      if(col===0) assert.equal(pose.trail,0);
    }
  }
});
test('paused/hit-stopped simulation repeats the exact pose; hurt/dash/ultimate/dead cannot swing', () => {
  const p=player(0,.15),g=heroes[0];
  assert.deepEqual(motion.sample(p,g,steps),motion.sample(p,g,steps));
  for (const state of [{attack:0},{hurt:.2},{dash:.1},{ultimate:.5},{dead:true}]) assert.equal(motion.sample({...p,...state},g,steps),null);
});
test('no slash sound or damage in windup; once per swing and never on cancelled states', () => {
  const fn=html.match(/  resolveAttack\(\) \{[\s\S]*?\n  \}/)[0];
  const local=vm.createContext({COMBO_STEPS:steps,guardianOf:()=>heroes[0],overlap:()=>true});
  vm.runInContext('globalThis.obj={'+fn+'};',local);
  const g=local.obj; let sounds=0,hits=0;
  Object.assign(g,{guardianId:'lumi',audio:{play:()=>sounds++},strike:()=>hits++,enemies:[{lastHit:-1,height:80,width:50,x:50,y:610}]});
  g.player={...player(0,.04),attackSerial:1,facing:1,x:0,y:610};g.resolveAttack();
  assert.equal(sounds,0);assert.equal(hits,0);
  g.player.attack=player(0,.16).attack;g.resolveAttack();g.resolveAttack();
  assert.equal(sounds,1);assert.equal(hits,1);
  for(const state of [{hurt:1},{dead:true},{dash:1},{ultimate:1}]) {
    g.player={...player(0,.16),attackSerial:2,...state};g.resolveAttack();
  }
  assert.equal(sounds,1);assert.equal(hits,1);
});
test('atlas loader settles failures and a timeout, with an original-art fallback', async () => {
  class FakeImage {
    set src(v) { if(v.includes('lumi'))queueMicrotask(()=>this.onload());if(v.includes('mira'))queueMicrotask(()=>this.onerror()); }
  }
  const local=vm.createContext({Image:FakeImage,setTimeout:cb=>setTimeout(cb,2),clearTimeout});
  vm.runInContext(source,local);
  const result=await local.KedehunAttackMotion.ready;
  assert.deepEqual(Array.from(result,r=>r.value.loaded),[true,false,false]);
  assert.equal(local.KedehunAttackMotion.draw({},player(0,.15),heroes[0],steps,{combatHeight:134}),false);
});
test('atlas draw crops one cell without allocating images during combat', async () => {
  class FakeImage { constructor(){this.complete=true;this.naturalWidth=1536;this.naturalHeight=1536;} set src(v){queueMicrotask(()=>this.onload());} }
  const local=vm.createContext({Image:FakeImage,setTimeout,clearTimeout});vm.runInContext(source,local);await local.KedehunAttackMotion.ready;
  let args;const canvas={save(){},restore(){},translate(){},drawImage(...a){args=a;}};
  assert.equal(local.KedehunAttackMotion.draw(canvas,player(2,.23),heroes[0],steps,{combatHeight:134,footOffset:7}),true);
  assert.deepEqual(args.slice(1,5),[512,1024,512,512]);
  assert.ok(args.slice(5).every(Number.isFinite));
});
test('travelling trails stay hidden during anticipation and reduced motion keeps the readable pose', () => {
  let strokes=0;const canvas={globalAlpha:1,save(){},restore(){},beginPath(){},arc(){},stroke(){strokes++;}};
  motion.trail(canvas,player(0,.04),heroes[0],steps,false);assert.equal(strokes,0);
  motion.trail(canvas,player(0,.17),heroes[0],steps,true);assert.equal(strokes,2);
});
test('all attack atlases are real local PNGs and included in the offline cache', () => {
  const sw=require('../../sw.js');
  for(const art of Object.values(motion.ART)) {
    const file=path.join(__dirname,'..',art.src.split('?')[0]);
    const png=fs.readFileSync(file);
    assert.equal(png.toString('hex',0,8),'89504e470d0a1a0a');
    assert.equal(png[25],6,'final PNG must have a real RGBA channel, not a baked checkerboard');
    assert.ok(png.readUInt32BE(16)>=1024);assert.equal(png.readUInt32BE(16),png.readUInt32BE(20));
    assert.ok(sw.OPTIONAL_SHELL.includes('./kedehun/'+art.src));
  }
  assert.ok(sw.OPTIONAL_SHELL.includes('./kedehun/attack-motion.js?v=1'));
  assert.match(html,/await globalThis.KedehunAttackMotion\?\.ready/);
});
