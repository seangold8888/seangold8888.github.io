const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const path = require('node:path');
const skills = () => import('../src/game/dashSkills.js');
const roster = () => import('../src/data/sanguoRoster.js');
test('27 unique techniques cover all main and representative heroes with bounded damage/cooldown', async () => {
  const [{DASH_SKILLS}, {SANGUO_EXPANSION_STATS}] = await Promise.all([skills(), roster()]);
  assert.equal(Object.keys(DASH_SKILLS).length, 27);
  assert.equal(new Set(Object.values(DASH_SKILLS).map(s => s.name)).size, 27);
  const data = JSON.parse(fs.readFileSync(path.join(__dirname,'../data/gamedata.json')));
  for (const id of Object.keys(data.ACTION_HEROES)) assert.ok(DASH_SKILLS[id], id);
  for (const id of Object.keys(SANGUO_EXPANSION_STATS)) assert.ok(DASH_SKILLS[id], id);
  for (const s of Object.values(DASH_SKILLS)) {
    assert.equal(s.cooldown, 2600); assert.ok(s.duration >= 400 && s.duration <= 700);
    assert.ok(s.damage * s.hits + s.shots * 62 * .42 <= 110);
  }
});
test('swept collision hits crossed enemies in both directions, not other lanes', async () => {
  const {dashSkill,startDashState,collectDashHits} = await skills(), s = dashSkill('zhaoyun');
  for (const facing of [1,-1]) {
    const p = {x:500,lane:0,facing,actionStarted:1000};
    startDashState(p,s,1000);
    const crossed={x:500+facing*100,lane:0,hp:500}, farLane={x:crossed.x,lane:100,hp:500};
    p.x += facing * 300;
    assert.deepEqual(collectDashHits(p,[crossed,farLane],s,1200),[crossed]);
    assert.equal(collectDashHits(p,[crossed],s,1300).length,0);
  }
});
test('two-strike technique obeys interval, hit cap, startup and dead filters', async () => {
  const {dashSkill,startDashState,collectDashHits}=await skills(),s=dashSkill('liubei');
  const p={x:0,lane:0,facing:1,actionStarted:1000},e={x:100,lane:0,hp:500};
  startDashState(p,s,1000);
  assert.equal(collectDashHits(p,[e],s,1010).length,0);
  assert.equal(collectDashHits(p,[e],s,1100).length,1);
  assert.equal(collectDashHits(p,[e],s,1200).length,0);
  assert.equal(collectDashHits(p,[e],s,1300).length,1);
  assert.equal(collectDashHits(p,[e],s,1500).length,0);
});
test('growth cooldown multiplier retained', async () => {
  const {dashSkill,startDashState}=await skills(),p={x:0,dashCooldownScale:.88};
  startDashState(p,dashSkill('guanyu'),1000);
  assert.equal(p.dashReady,3288);
});
test('new runtime imports and styles are present and precached', () => {
  const base=path.resolve(__dirname,'../..'),sw=fs.readFileSync(path.join(base,'sw.js'),'utf8');
  const modules=['main.js','data.js','data/works.js','data/sanguoRoster.js','game/sideScroller.js','game/hud.js','game/dashSkills.js','game/scenery.js','game/tint.js','game/difficulty.js','game/progression.js','ui/result.js','ui/title.js','ui/storyIntro.js','ui/workSelect.js'];
  for(const file of [...modules.map(f=>'sanguo/src/'+f),'sanguo/game-controls.css','sanguo/mobile-hud.css']){
    assert.ok(fs.existsSync(path.join(base,file)),file);assert.ok(sw.includes('"./'+file+'"'),file+' cache');
  }
});
test('I and C dispatch dash once; original J/K hold and tap stay distinct', () => {
  const source=fs.readFileSync(path.join(__dirname,'../src/game/sideScroller.js'),'utf8');
  let now=0;const events={};
  const ctx={performance:{now:()=>now},navigator:{},document:{querySelectorAll:()=>[],getElementById:()=>null},addEventListener:(n,f)=>events[n]=f,removeEventListener:()=>{}};
  vm.createContext(ctx);
  vm.runInContext(source.slice(source.indexOf('function createInput('),source.indexOf('export async function startSideBattle'))+';globalThis.input=createInput({});',ctx);
  const input=ctx.input,down=code=>events.keydown({code,repeat:false,preventDefault(){}}),up=code=>events.keyup({code});
  for(const code of ['KeyI','KeyC']) {down(code);assert.ok(input.consume('dash'));assert.equal(input.consume('dash'),false);up(code);}
  down('KeyJ');now+=80;up('KeyJ');assert.ok(input.consumeTap('attack'));assert.equal(input.consumeHold('attack'),false);
  down('KeyK');now+=259;assert.equal(input.consumeHold('ranged'),false);now++;assert.ok(input.consumeHold('ranged'));up('KeyK');assert.equal(input.consumeTap('ranged'),false);
});
