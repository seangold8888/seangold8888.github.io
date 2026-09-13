"use strict";
const Engine = require("../js/engine.js");
const data = require("../cards.json");
const ids = ["sejong","jangyeongsil","heojun","shinsaimdang","jeongyakyong","kimhongdo","yugwansun","kimgu"];
const pool = data.cards.filter(Engine.isBattleCard);
const rngOf = seed => { let n=seed; return () => ((n=(Math.imul(n,1664525)+1013904223)>>>0)/4294967296); };
let stalls=0, bad=0;
for (const id of ids) {
  const hero=pool.find(c=>c.id===id); let wins=0,games=0,actions=0;
  for (const foe of pool.filter(c=>c.id!==id)) for (const seed of [11,29,47,83,101]) for (const first of [true,false]) {
    const rng=rngOf(seed); let state=Engine.createGame(first?hero:foe,first?foe:hero), count=0;
    while (!state.winner && count<150) { state=Engine.performAction(state,Engine.chooseAiAction(state,rng)||{type:"rest"},rng); count++; }
    if (!state.winner) { stalls++; console.error("교착:",id,foe.id,first,seed); }
    else if(state.winner===(first?"player":"enemy")) wins++;
    games++; actions+=count;
  }
  const rate=100*wins/games;
  console.log(`${id} ${hero.name}: ${rate.toFixed(1)}% · ${games}전 · 평균 ${(actions/games).toFixed(1)}행동`);
  if(rate<35 || rate>80) bad++;
}
console.log(`교착 ${stalls}건`);
if(stalls || bad) process.exitCode=1;
