'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const gameRoot = path.resolve(__dirname, '..');
const html = fs.readFileSync(path.join(gameRoot, 'index.html'), 'utf8');
const moduleSource = fs.readFileSync(path.join(gameRoot, 'combat-v2.js'), 'utf8');
function fixture() {
  const context = vm.createContext({ console, setTimeout, clearTimeout,
    GROUND_Y: 610, MAX_HEALTH: 120, MAX_ENERGY: 100,
    STAGES: [{ worldWidth: 4250, bossGate: 3260, bossHealth: 380, boss: '그림자 사자' }],
    clamp: (v,a,b) => Math.max(a,Math.min(b,v)),
    approach: (v,t,d) => v < t ? Math.min(t,v+d) : Math.max(t,v-d),
    overlap: (ax,ay,aw,ah,bx,by,bw,bh) => Math.abs(ax-bx)*2 < aw+bw && Math.abs(ay-by)*2 < ah+bh,
  });
  vm.runInContext(moduleSource, context);
  const input = html.slice(html.indexOf('class InputBuffer {'), html.indexOf('class AudioEngine {'));
  const game = html.slice(html.indexOf('class Game {'), html.indexOf('/* Rendering'));
  vm.runInContext('const COMBAT = KedehunCombat;\n' + input + '\n' + game + '\nglobalThis.Input = InputBuffer; globalThis.Engine = Game;', context);
  return context;
}
test('259ms release is a tap; 260ms hold fires once with no release duplicate', () => {
  const { Input } = fixture(); const input = new Input();
  input.set('attack','touch:1',true,1);
  input.set('attack','touch:1',false,1.259);
  assert.equal(input.consume('attack',1.259),true);
  assert.equal(input.consume('heavy',1.259),false);
  input.set('attack','key:KeyJ',true,2);
  input.advance(2.260);
  assert.equal(input.consume('heavy',2.260),true);
  input.advance(3);
  assert.equal(input.consume('heavy',3),false);
  input.set('attack','key:KeyJ',false,3);
  assert.equal(input.consume('attack',3),false);
});
test('cancellation, blur clear and multitouch preserve only deliberate inputs', () => {
  const { Input } = fixture(); const input = new Input();
  input.set('left','touch:1',true,0);
  input.set('attack','touch:2',true,0);
  input.cancel('attack','touch:2'); input.advance(.3);
  assert.equal(input.consume('heavy',.3),false);
  assert.equal(input.held('left'),true);
  input.set('attack','touch:3',true,1); input.clear(); input.advance(2);
  assert.equal(input.consume('heavy',2),false);
  assert.equal(input.held('left'),false);
  assert.equal(input.holdProgress(2),0);
});
test('Saja members choose distinct patterns and atlas entries', () => {
  const { KedehunCombat: c } = fixture();
  const member = (name) => ({kind:'saja',name});
  assert.equal(c.chooseSajaAttack(member('애비'),350),1);
  assert.equal(c.chooseSajaAttack(member('미스터리'),350),2);
  assert.equal(c.chooseSajaAttack(member('베이비'),350),0);
  assert.equal(c.profile(member('베이비')).spreads.length,2);
  assert.equal(c.profile(member('로맨스')).spreads.length,3);
  assert.equal(new Set(Object.keys(c.PROFILES)).size,9);
  for (const p of Object.values(c.PROFILES)) {
    const [x,y,w,h] = p.crop;
    assert.ok(x>=0 && y>=0 && w>0 && h>0 && x+w<=1254 && y+h<=1254);
  }
});
function battle() {
  const ctx = fixture(), g = Object.create(ctx.Engine.prototype);
  Object.assign(g, { stageIndex:0, nextId:1, playTime:0, viewWidth:1180, sajaMet:true,
    player:{x:800,y:610}, enemies:[], projectiles:[], trauma:0,
    hits:0, hurtPlayer(){this.hits++;}, burst(){}, ring(){}, announce(){}, audio:{play(){}},
  });
  return {ctx,g};
}
test('crossing behind a winding-up enemy does not redirect its attack', () => {
  const { g }=battle(), e=g.makeEnemy('shade',760);
  e.spawn=0; e.telegraph=.6; e.telegraphTotal=.75; e.facing=1;
  g.enemies=[e]; g.player.x=700; g.updateEnemies(1/60);
  assert.equal(e.facing,1);
  for(let i=0;i<34;i++)g.updateEnemies(1/60);
  assert.equal(g.hits,0);
  assert.ok(e.recovery>0);
});
test('standing in an idle enemy does not cause unannounced contact damage', () => {
  const {g}=battle(), e=g.makeEnemy('shade',800);
  e.spawn=0; e.cooldown=3; g.enemies=[e];
  for(let i=0;i<30;i++)g.updateEnemies(1/60);
  assert.equal(g.hits,0);
});
test('boss rotates all three moves at close range and exposes recovery', () => {
  const {g}=battle(), e=g.makeBoss(); e.spawn=0;
  const moves=new Set(); let sawRecovery=false; g.enemies=[e];
  for(let i=0;i<1100;i++){
    g.player.x=e.x-90; g.playTime+=1/60; g.updateEnemies(1/60);
    if(e.telegraph>0&&!e.attackFired)moves.add(e.attackType);
    if(e.recovery>0&&e.telegraph<=0&&e.dash<=0)sawRecovery=true;
  }
  assert.deepEqual([...moves].sort(),[0,1,2]);
  assert.equal(sawRecovery,true);
});
test('failed art loads leave both existing procedural render paths available', () => {
  const {KedehunCombat:c}=fixture();
  assert.equal(c.drawEnemy({}, {kind:'shade'},0,0,0,true),false);
  assert.equal(c.drawBackground({},1180,720,0,0),false);
});

