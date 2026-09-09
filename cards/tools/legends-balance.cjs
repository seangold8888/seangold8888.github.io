"use strict";
const Engine = require("../js/engine.js");
const data = require("../cards.json");
const IDS = data.collection.slice(-16);
const pool = data.cards.filter(Engine.isBattleCard);
const seeds = [11, 29, 47, 83, 101, 149, 211, 307, 401, 503];
const rngOf = seed => { let x = seed >>> 0; return () => { x = (Math.imul(x, 1664525) + 1013904223) >>> 0; return x / 4294967296; }; };

let stalls = 0;
const rates = [];
for (const id of IDS) {
  const card = pool.find(item => item.id === id);
  let wins = 0;
  let games = 0;
  for (const foe of pool) {
    if (foe.id === id) continue;
    for (const seed of seeds) {
      const rng = rngOf(seed + games * 13);
      let state = Engine.createGame(card, foe);
      let actions = 0;
      while (!state.winner && actions < 150) {
        state = Engine.performAction(state, Engine.chooseAiAction(state, rng) || {type: "rest"}, rng);
        actions += 1;
      }
      if (!state.winner) stalls += 1;
      else if (state.winner === "player") wins += 1;
      games += 1;
    }
  }
  const rate = Math.round(wins / games * 100);
  rates.push([card.name, rate]);
  console.log(card.name + " " + rate + "%");
}
console.log("교착 " + stalls + " 건");
if (stalls || rates.some(entry => entry[1] < 35 || entry[1] > 75)) process.exitCode = 1;
