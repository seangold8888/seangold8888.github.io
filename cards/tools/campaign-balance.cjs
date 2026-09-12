"use strict";
const Engine = require("../js/engine.js");
const Campaign = require("../js/campaign.js");
const data = require("../cards.json");

function seeded(seed) {
  let value = seed >>> 0;
  return () => ((value = (Math.imul(value, 1664525) + 1013904223) >>> 0) / 4294967296);
}
function hash(text) {
  let value = 2166136261;
  for (const letter of text) value = Math.imul(value ^ letter.charCodeAt(0), 16777619) >>> 0;
  return value;
}
function play(player, enemy, seed, enemyMistakeRate = 0.3) {
  const rng = seeded(seed);
  let state = Engine.createGame(player, enemy, {aiMistakeRate: enemyMistakeRate});
  let actions = 0;
  // Simulated child keeps the normal 30% policy even against a zero-mistake
  // boss. Cards heal between battles, as they will with createGame in the UI.
  while (!state.winner && actions < 150) {
    const decision = state.turn === "player" ? {...state, aiMistakeRate: 0.3} : state;
    const action = Engine.chooseAiAction(decision, rng) || {type: "rest"};
    state = Engine.performAction(state, action, rng);
    if (state.events.some(event => event.type === "invalid_action")) {
      return {winner: null, invalid: true, actions};
    }
    actions++;
  }
  return {winner: state.winner, invalid: false, actions};
}
function measure(chapter, stage, samples, bonus) {
  const opponent = Campaign.encounter(chapter, stage, data.cards, bonus === undefined ? undefined : {hpBonus: bonus});
  let stalls = 0;
  let invalid = 0;
  let longest = 0;
  const rates = Campaign.candidatesForChapter(chapter).map(id => {
    const card = data.cards.find(item => item.id === id);
    if (!card) throw new Error("합류 카드 누락: " + id);
    let wins = 0;
    for (let seed = 0; seed < samples; seed++) {
      const result = play(card, opponent.card, hash(chapter + "/" + stage + "/" + id) + seed * 7919, opponent.options.aiMistakeRate);
      if (result.winner === "player") wins++;
      if (!result.winner) stalls++;
      if (result.invalid) invalid++;
      longest = Math.max(longest, result.actions);
    }
    return {id, rate: wins / samples};
  });
  rates.sort((a, b) => b.rate - a.rate);
  const minimum = opponent.card.id === "sseugumi" ? 0.3 : opponent.boss ? 0.35 : 0.45;
  return {chapter, stage, enemy: opponent.card.id, boss: opponent.boss, hp: opponent.card.hp,
    hpBonus: opponent.hpBonus, rates, best: rates[0], minimum, stalls, invalid, longest,
    pass: rates[0].rate >= minimum && rates[0].rate <= 0.9 && stalls === 0 && invalid === 0};
}

function combinations(ids, size = 3) {
  if (ids.length <= size) return [ids.slice()];
  const result = [];
  function visit(start, selected) {
    if (selected.length === size) { result.push(selected); return; }
    for (let i = start; i < ids.length; i++) visit(i + 1, selected.concat(ids[i]));
  }
  visit(0, []);
  return result;
}
// Exact per-chapter survival estimate from measured matchup probabilities:
// losses consume a card, wins preserve it, and the best remaining card can be
// chosen for each opponent. This is not measured human completion probability.
function partyChance(party, rows) {
  const memo = new Map();
  function chance(stage, mask) {
    if (stage === rows.length) return 1;
    if (mask === 0) return 0;
    const key = stage + "/" + mask;
    if (memo.has(key)) return memo.get(key);
    let best = 0;
    for (let i = 0; i < party.length; i++) {
      if (!(mask & (1 << i))) continue;
      const rate = rows[stage].rates.find(row => row.id === party[i]).rate;
      best = Math.max(best, rate * chance(stage + 1, mask) + (1 - rate) * chance(stage, mask & ~(1 << i)));
    }
    memo.set(key, best);
    return best;
  }
  return chance(0, (1 << party.length) - 1);
}
function measureRecruit(samples) {
  const card = data.cards.find(item => item.id === "sseugumi") || Campaign.FINAL_BOSS;
  let wins = 0, games = 0, stalls = 0, invalid = 0;
  for (const opponent of data.cards.filter(item => Engine.isBattleCard(item) && item.id !== card.id)) {
    for (let seed = 0; seed < samples; seed++) {
      for (const first of [true, false]) {
        const result = play(first ? card : opponent, first ? opponent : card, hash(opponent.id) + seed * 7919);
        if (result.winner === (first ? "player" : "enemy")) wins++;
        if (!result.winner) stalls++;
        if (result.invalid) invalid++;
        games++;
      }
    }
  }
  const rate = wins / games;
  return {rate, games, stalls, invalid, pass: rate >= 0.35 && rate <= 0.8 && !stalls && !invalid};
}
function run(options = {}) {
  const samples = options.samples || 64;
  const rows = [];
  for (const chapter of Campaign.CHAPTERS) {
    for (let stage = 0; stage < Campaign.encounterIds(chapter.id).length; stage++) {
      const row = measure(chapter.id, stage, samples);
      rows.push(row);
      if (options.onRow) options.onRow(row);
    }
  }
  const parties = Campaign.CHAPTERS.map(chapter => {
    const options = combinations(Campaign.candidatesForChapter(chapter.id));
    const chapterRows = rows.filter(row => row.chapter === chapter.id);
    const candidates = options.map(party => ({party, chance: partyChance(party, chapterRows)})).sort((a, b) => b.chance - a.chance);
    return {chapter: chapter.id, combinations: candidates.length, best: candidates[0], worst: candidates.at(-1)};
  });
  const recruit = measureRecruit(samples);
  return {samples, rows, parties, recruit, pass: rows.every(row => row.pass) && recruit.pass};
}
function printRow(row) {
  console.log(`${row.pass ? "PASS" : "FAIL"} ${row.chapter}장 ${row.stage + 1} ${row.enemy} HP${row.hp} (+${row.hpBonus}) 최선 ${row.best.id} ${(row.best.rate * 100).toFixed(1)}% 교착 ${row.stalls}`);
}
if (require.main === module) {
  const samplesArg = process.argv.find(arg => arg.startsWith("--samples="));
  const samples = samplesArg ? Number(samplesArg.split("=")[1]) : 64;
  if (!Number.isSafeInteger(samples) || samples < 1 || samples > 2048) throw new Error("--samples must be 1..2048");
  if (process.argv.includes("--calibrate")) {
    let unresolved = 0;
    // Diagnostic only: report a proposed bonus; never rewrite data or relax
    // the thresholds. Final validation must run without --calibrate.
    for (const chapter of Campaign.CHAPTERS) {
      for (let stage = 0; stage < Campaign.encounterIds(chapter.id).length; stage++) {
        let row = measure(chapter.id, stage, samples);
        if (!row.pass) {
          let low = -Math.min(row.hp - row.hpBonus - 10, 100), high = 1000;
          while (high - low > 10) {
            const mid = Math.floor((low + high) / 20) * 10;
            const attempt = measure(chapter.id, stage, samples, mid);
            if (attempt.best.rate > 0.85) low = mid;
            else high = mid;
          }
          const attempts = [high - 10, high, high + 10].map(bonus => measure(chapter.id, stage, samples, bonus));
          row = attempts.filter(item => item.pass).sort((a, b) => Math.abs(a.best.rate - 0.75) - Math.abs(b.best.rate - 0.75))[0] || attempts[1];
        }
        printRow(row);
        if (!row.pass) unresolved++;
      }
    }
    if (unresolved) process.exitCode = 1;
  } else {
    const json = process.argv.includes("--json");
    const report = run({samples, onRow: json ? null : printRow});
    if (json) console.log(JSON.stringify(report, null, 2));
    else {
      for (const chapter of report.parties) console.log(`${chapter.chapter}장 원정대 ${chapter.combinations}조합 최선 ${chapter.best.party.join("/")} 장 완주 추정 ${(chapter.best.chance * 100).toFixed(1)}%`);
      console.log(`합류 쓰구미 ${(report.recruit.rate * 100).toFixed(1)}% / ${report.recruit.games}판 · 교착 ${report.recruit.stalls}`);
      console.log(report.pass ? "S1 균형 기준 통과" : "S1 균형 기준 미달");
    }
    if (!report.pass) process.exitCode = 1;
  }
}
module.exports = {play, measure, measureRecruit, combinations, partyChance, run};
