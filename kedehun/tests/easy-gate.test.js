"use strict";
const test=require("node:test"),assert=require("node:assert/strict"),fs=require("node:fs"),path=require("node:path"),vm=require("node:vm");
const html=fs.readFileSync(path.join(__dirname,"../index.html"),"utf8").replace(/\r/g,"");
function array(name){const start=html.indexOf("const "+name+" = [");return html.slice(start,html.indexOf("\n];",start)+3);}
function fixture(stageIndex=0,guardianId="lumi"){
  const ctx=vm.createContext({console});
  const game=html.slice(html.indexOf("class Game {"),html.indexOf("/* Rendering"));
  vm.runInContext(array("GUARDIANS")+"\n"+array("STAGES")+"\n"+array("COMBO_STEPS")+`
    const GROUND_Y=610, MAX_HEALTH=120, MAX_ENERGY=100, GRAVITY=2400;
    const guardianOf=id=>GUARDIANS.find(g=>g.id===id)||GUARDIANS[0];
    const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
    const approach=(v,t,d)=>v<t?Math.min(t,v+d):Math.max(t,v-d);
    globalThis.stages=STAGES;
  `+game+"\nglobalThis.Engine=Game;",ctx);
  const g=Object.create(ctx.Engine.prototype);
  let direction=0;
  Object.assign(g,{stageIndex,guardianId,nextId:1,score:0,playTime:0,
    gateOpen:false,bossSpawned:false,bossDefeated:false,clearTimer:0,checkpointReached:true,
    enemies:[],projectiles:[],particles:[],floaters:[],trauma:0,runDustTimer:0,reduced:true,
    input:{advance(){},held:key=>key==="right"?direction>0:key==="left"?direction<0:false,consume:()=>false,clear(){}},
    audio:{play(){}},music:{setBoss(){},duck(){},stop(){}},
    burst(){},dust(){},afterimage(){},ring(){},publish(){},announce(){},
    playStory(_,done){done();}
  });
  g.player=g.makePlayer();
  return {g,stage:ctx.stages[stageIndex],move:d=>direction=d};
}
test("all heroes cross both gates with an off-screen enemy alive and can move back",()=>{
  for(const stageIndex of [0,1])for(const hero of ["lumi","mira","joy"]){
    const {g,stage,move}=fixture(stageIndex,hero);
    const foe=g.makeEnemy("shade",100);g.enemies=[foe];
    g.player.x=stage.bossGate-70;move(1);
    for(let i=0;i<120;i++){g.updatePlayer(1/60);g.directStage(1/60);}
    assert.ok(g.player.x>stage.bossGate+90,hero+" stage "+stageIndex);
    assert.equal(g.gateOpen,true);assert.equal(g.bossSpawned,true);
    assert.equal(g.enemies.filter(e=>e.kind==="boss").length,1);
    const before=g.player.x;move(-1);
    for(let i=0;i<60;i++)g.updatePlayer(1/60);
    assert.ok(g.player.x<before-100,"retreat must remain possible");
  }
});
test("remaining enemies cannot snap a player back to the old gate boundary",()=>{
  const {g,stage}=fixture();g.enemies=[g.makeEnemy("shade",100)];
  g.player.x=stage.bossGate+160;
  g.updatePlayer(1/60);
  assert.equal(g.player.x,stage.bossGate+160);
});
test("gate opens on approach or full clear, stays open, and never spawns a boss too early",()=>{
  const {g,stage}=fixture();g.enemies=[g.makeEnemy("shade",100)];
  g.player.x=stage.bossGate-250;g.directStage(1/60);
  assert.equal(g.gateOpen,false);
  g.player.x=stage.bossGate-240;g.directStage(1/60);
  assert.equal(g.gateOpen,true);assert.equal(g.bossSpawned,false);
  g.player.x=500;g.directStage(1/60);assert.equal(g.gateOpen,true);
  const early=fixture().g;early.enemies=[];early.directStage(1/60);
  assert.equal(early.gateOpen,true);assert.equal(early.bossSpawned,false);
});
test("boss entry heals once and clears leftover crossfire without defeat points",()=>{
  const {g,stage}=fixture(1);
  g.player.x=stage.bossGate+100;g.player.health=25;
  g.enemies=[g.makeEnemy("shade",100),g.makeEnemy("wisp",200)];
  g.projectiles=[{damage:9}];g.score=123;
  g.directStage(1/60);
  assert.equal(g.player.health,120);assert.equal(g.player.invulnerable,2);
  assert.equal(g.projectiles.length,0);assert.equal(g.enemies.length,1);
  assert.equal(g.score,123);
  g.player.health=50;g.directStage(1/60);
  assert.equal(g.player.health,50);assert.equal(g.enemies.length,1);
});
test("ordinary and boss health are reduced by one quarter with matching max health",()=>{
  for(const stageIndex of [0,1]){
    const {g,stage}=fixture(stageIndex);
    for(const [kind,hp] of [["shade",44],["wisp",36],["saja",105],["brute",95]]){
      const e=g.makeEnemy(kind,500);
      assert.equal(e.health,Math.round(hp*.75));assert.equal(e.health,e.maxHealth);
    }
    const boss=g.makeBoss();
    assert.equal(boss.health,Math.round(stage.bossHealth*.75));
    assert.equal(boss.health,boss.maxHealth);
  }
});
test("damage is reduced, recovery protection lasts longer and repeat hits are ignored",()=>{
  const {g}=fixture();g.hurtPlayer(18,1);
  assert.equal(g.player.health,108);
  assert.equal(g.player.invulnerable,1.6);
  assert.equal(g.player.vx,250);
  assert.equal(g.player.vy,-260);
  g.hurtPlayer(18,1);assert.equal(g.player.health,108);
  g.player.invulnerable=0;g.hurtPlayer(18,-1);
  assert.equal(g.player.health,96);assert.equal(g.player.vx,-250);
});
test("world edges still bound walking and the gate explains automatic opening",()=>{
  const {g,stage,move}=fixture();
  g.player.x=stage.worldWidth-120;move(1);
  for(let i=0;i<100;i++)g.updatePlayer(1/60);
  assert.equal(g.player.x,stage.worldWidth-120);
  g.player.x=70;g.player.vx=0;move(-1);
  for(let i=0;i<100;i++)g.updatePlayer(1/60);
  assert.equal(g.player.x,70);
  assert.match(html,/가까이 오면 열려요/);
  assert.doesNotMatch(html,/const gateLocked =/);
});
