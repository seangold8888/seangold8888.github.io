"use strict";
const Engine = require("../js/engine.js");
const Campaign = require("../js/campaign.js");
const data = require("../cards.json");
const BOSS_LIMITS = Object.freeze({viableRate: 0.25, minimumChoices: 2, meanActions: 26, p95Actions: 36});

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
    let wins = 0, totalActions = 0, winningActions = 0;
    const durations = [];
    for (let seed = 0; seed < samples; seed++) {
      const result = play(card, opponent.card, hash(chapter + "/" + stage + "/" + id) + seed * 7919, opponent.options.aiMistakeRate);
      if (result.winner === "player") {wins++; winningActions += result.actions;}
      totalActions += result.actions;
      durations.push(result.actions);
      if (!result.winner) stalls++;
      if (result.invalid) invalid++;
      longest = Math.max(longest, result.actions);
    }
    durations.sort((a,b)=>a-b);
    return {id, rate: wins / samples, averageActions: totalActions / samples,
      winningAverageActions: wins ? winningActions / wins : null,
      p95Actions: durations[Math.ceil(samples * .95) - 1]};
  });
  rates.sort((a, b) => b.rate - a.rate);
  const minimum = opponent.card.id === "sseugumi" ? 0.3 : opponent.boss ? 0.35 : 0.45;
  const middle = Math.floor(rates.length / 2);
  const median = rates.length % 2 ? rates[middle].rate : (rates[middle - 1].rate + rates[middle].rate) / 2;
  const spread = rates[0].rate - rates.at(-1).rate;
  // Approved 2026-09-12: a good counter may win 100%. Boss difficulty comes
  // from the choice: typical candidates <=80%, best/worst gap >=25 points.
  const choiceMatters = !opponent.boss || (median <= 0.8 && spread >= 0.25);
  const viable = rates.filter(row => row.rate >= BOSS_LIMITS.viableRate);
  const choiceBreadth = !opponent.boss || viable.length >= BOSS_LIMITS.minimumChoices;
  // Actions count both sides; this is not a promise about human thinking time.
  const durationOk = !opponent.boss || viable.every(row =>
    row.averageActions <= BOSS_LIMITS.meanActions && row.p95Actions <= BOSS_LIMITS.p95Actions);
  const finalFamilyOk = opponent.card.id !== "sseugumi" || (
    rates[0].id === "jaei" && rates.find(row=>row.id==="taeo").rate >= .25 &&
    rates.every(row=>row.averageActions<=26 && row.p95Actions<=36));
  return {chapter, stage, enemy: opponent.card.id, boss: opponent.boss, hp: opponent.card.hp,
    hpBonus: opponent.hpBonus, rates, best: rates[0], minimum, median, spread, choiceMatters,
    viableCount: viable.length, choiceBreadth, durationOk, stalls, invalid, longest,
    finalFamilyOk,
    pass: rates[0].rate >= minimum && choiceMatters && choiceBreadth && durationOk && finalFamilyOk && stalls === 0 && invalid === 0};
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
    const minimum = chapter.id <= 1 ? 0.7 : 0.5;
    return {chapter: chapter.id, combinations: candidates.length, best: candidates[0], worst: candidates.at(-1), minimum,
      pass: candidates[0].chance >= minimum};
  });
  const recruit = measureRecruit(samples);
  return {samples, rows, parties, recruit, pass: rows.every(row => row.pass) && parties.every(party => party.pass) && recruit.pass};
}
function printRow(row) {
  console.log(`${row.pass ? "PASS" : "FAIL"} ${row.chapter}장 ${row.stage + 1} ${row.enemy} HP${row.hp} (+${row.hpBonus}) 최선 ${row.best.id} ${(row.best.rate * 100).toFixed(1)}% 교착 ${row.stalls}`);
  if (row.boss) console.log(`  후보 중앙 ${(row.median * 100).toFixed(1)}% · 선택 격차 ${(row.spread * 100).toFixed(1)}%p · 승산 있는 카드 ${row.viableCount}장 · 최선 평균 ${row.best.averageActions.toFixed(1)}행동 / P95 ${row.best.p95Actions}`);
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
          // Discrete damage makes HP -> win rate discontinuous. Do not chase
          // a target win rate with unbounded HP; enforce breadth and length too.
          const attempts = [0, 10, 20, 30, 40].map(bonus => measure(chapter.id, stage, samples, bonus));
          row = attempts.filter(item => item.pass).sort((a, b) =>
            Math.abs(a.hpBonus - 20) - Math.abs(b.hpBonus - 20) ||
            b.viableCount - a.viableCount)[0] || row;
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
module.exports = {BOSS_LIMITS, play, measure, measureRecruit, combinations, partyChance, run};
