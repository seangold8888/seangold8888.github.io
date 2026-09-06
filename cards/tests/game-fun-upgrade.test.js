'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const root=path.resolve(__dirname,'../..');
const read=f=>fs.readFileSync(path.join(root,f),'utf8');
const html=read('hogwarts/index.html'),main=read('kart/src/main.js');
const scripts=[...html.matchAll(/<script[^>]*>([\s\S]*?)<\/script>/g)].map(m=>m[1]);
test('all magic school scripts and kart scripts compile',()=>{
  scripts.forEach(s=>new vm.Script(s));
  for(const f of ['main','kart','track','mode7','sprites','music','track-art'])new vm.Script(read('kart/src/'+f+'.js'));
});
function forest(){
  const held=new Set(),pressed=new Set(),button={style:{}},reports=[],announcements=[];
  const WQ={E:{frame:0,announce:s=>announcements.push(s),input:{held:k=>held.has(k),buffered:k=>pressed.has(k),consume:k=>pressed.delete(k),release:k=>held.delete(k)}},
    Snd:new Proxy({},{get:()=>()=>{}}),Characters:{current:()=>({hp:5,cast:.19,spell:8,speed:1}),helper:()=>({name:'친구'})}};
  const context=vm.createContext({window:{WQ},document:{getElementById:()=>button},Math,console});
  vm.runInContext(scripts.find(s=>s.includes('F.timescale=1')),context);
  const code=scripts.find(s=>s.includes('function BroomRescue(onClear)')).replace(
    'return{enter,exit,update,draw,pointer};',
    'return{enter,exit,update,draw,pointer,probe:{p,cast,nova,hitEnemy,addPixie,addStar,get shots(){return shots},get enemies(){return enemies},get charge(){return charge},get done(){return done},get boss(){return boss},setBoss(e){boss=e},setTime(v){t=v},get time(){return t}}};');
  vm.runInContext(code,context);const game=WQ.BroomRescue(r=>reports.push(r));game.enter();
  return {game,p:game.probe,held,pressed,button,reports,context};
}
test('holding cast fires repeatedly, release stops firing',()=>{
  const {game,p,held}=forest();held.add('cast');for(let i=0;i<30;i++)game.update(1/60);assert.ok(p.shots.length>=2);
  held.clear();const n=p.shots.length;game.update(.05);assert.equal(p.shots.length,n);
});
test('five collected stars unlock nova and consumption is exactly once',()=>{
  const {game,p,button}=forest();assert.equal(p.nova(),false);
  for(let i=0;i<5;i++)p.addStar(p.p.x,p.p.y);
  game.update(.001);assert.equal(p.charge,5);assert.equal(button.disabled,false);
  p.addPixie();const enemy=p.enemies.at(-1);enemy.x=700;
  assert.equal(p.nova(),true);assert.equal(enemy.dead,true);assert.equal(p.charge,0);assert.equal(p.nova(),false);assert.ok(p.p.inv>=2);
});
test('mid-stage big pixie cannot end chapter; real boss can',()=>{
  const {game,p,reports}=forest();p.addPixie('big');let e=p.enemies.at(-1);
  for(let i=0;i<18;i++)p.hitEnemy(e,{x:700,y:200});assert.equal(p.done,false);
  p.addPixie('big');e=p.enemies.at(-1);p.setBoss(e);
  for(let i=0;i<18;i++)p.hitEnemy(e,{x:700,y:200});assert.equal(p.done,true);
  game.update(1,1);game.update(1,1);assert.equal(reports.length,1);
});
test('stage exit hides special button and clears held controls',()=>{
  const {game,held,button}=forest();held.add('cast');held.add('nova');game.exit();
  assert.equal(button.hidden,true);assert.equal(held.size,0);
});
test('boss arrives at 48 seconds without requiring a timer reset',()=>{
  const {game,p}=forest();p.setTime(48);game.update(.01);assert.ok(p.boss);assert.equal(p.done,false);
});
test('first chapter can run through actual cast/collect/update loop',()=>{
  const {game,p,held}=forest();held.add('cast');
  for(let i=0;i<60*150&&!p.done;i++){if(p.boss)p.p.y=p.boss.y;game.update(1/60);}
  assert.equal(p.done,true);assert.ok(Number.isFinite(p.p.x));assert.ok(Number.isFinite(p.p.y));
});
function kart(){
  const storage=new Map(),win={SK:{},addEventListener(){}},audio=new Proxy({},{get:()=>()=>{}});
  const context=vm.createContext({window:win,console,localStorage:{getItem:k=>storage.get(k),setItem:(k,v)=>storage.set(k,v)},Math,setTimeout});
  context.SK=win.SK;context.navigator={maxTouchPoints:0};vm.runInContext(read('kart/src/track.js'),context);
  vm.runInContext(read('kart/src/kart.js'),context);
  context.SK.createAudio=()=>audio;context.SK.buildTrackTexture=()=>({width:2048,height:2048});
  vm.runInContext(main.replace('SK._debug = {','SK._test={challenge:()=>challenge,useItem,earnedMedals,readRecords,best:()=>bestLap,medals:()=>medals};\n  SK._debug = {'),context);
  return {SK:context.SK,storage};
}
test('kart race resets inputs and starts with two actual full laps',()=>{
  const {SK}=kart();SK._debug.press('Space');SK._debug.startRace();const p=SK._debug.player;
  assert.equal(p.lap,-1);const T=SK.Track;
  function cross(){p.progress=T.length-1;const pt=T.center[0];p.x=pt.x;p.y=pt.y;return p.updateProgress(2);}
  assert.equal(cross(),false);assert.equal(p.lap,0);
  assert.equal(cross(),false);assert.equal(cross(),true);
});
test('kart challenge progress counts only player items and resets on retry',()=>{
  const {SK}=kart();SK._debug.startRace();const p=SK._debug.player;
  p.item='boost';SK._test.useItem(p);p.item='ribbon';SK._test.useItem(p);
  assert.equal(SK._test.challenge().items,2);assert.equal(SK._test.earnedMedals(),2);
  const ai=SK._debug.karts[1];ai.item='boost';SK._test.useItem(ai);assert.equal(SK._test.challenge().items,2);
  SK._debug.startRace();assert.equal(SK._test.challenge().items,0);
});
test('lap records are isolated by course and legacy meadow record survives',()=>{
  const {SK,storage}=kart();storage.set('sanrio-kart:best:meadow','31');SK._test.readRecords();assert.equal(SK._test.best(),31);
  SK._debug.setTrack(1);SK._test.readRecords();assert.equal(SK._test.best(),null);
});
test('kart physics remains finite on every track over a simulated minute',()=>{
  const {SK}=kart();
  for(let i=0;i<SK.TRACKS.length;i++){SK._debug.setTrack(i);SK._debug.startRace();for(let j=0;j<3600;j++)SK._debug.step(1/60);
    assert.ok(SK._debug.karts.every(k=>Number.isFinite(k.x)&&Number.isFinite(k.y)&&Number.isFinite(k.speed)));}
});
