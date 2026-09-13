// 가족 4장을 현재 전체 카드 풀과 붙여 실제 전투 등급과 순서를 검산한다.
const fs = require("fs");
const root = require("path").join(__dirname, "..") + "/";
const Engine = require(root + "js/engine.js");
const data = JSON.parse(fs.readFileSync(root + "cards.json", "utf8"));

const A = (name, cost, dmg, fx, desc, kind, emoji, big) => ({
  name, cost, dmg, fx, desc, vfx: big ? { kind, emoji, big: true } : { kind, emoji },
});
const FAMILY_FALLBACK = [
  {
    id: "jaei", name: "재이", emoji: "🎀", type: "wise", element: "water", rarity: 3,
    summonCost: 3, hp: 90,
    passive: { name: "누나는 다 알아", desc: "처음 받는 공격은 미리 알아채고 피해요", fx: "first_hit_zero" },
    attacks: [
      A("코딱지 날리기", 1, 20, null, "", "projectile", "🤧"),
      A("트림 폭탄", 2, 40, "weaken_next_20", "깜짝 놀라 다음 기술 피해가 최대 20 줄어요", "burst", "😮"),
      A("참았던 방귀", 3, 60, null, "", "burst", "💨", true),
    ],
    stats: { attack: 4, defense: 4, spirit: 3 },
  },
  {
    id: "taeo", name: "태오", emoji: "🧦", type: "monster", element: "fire", rarity: 2,
    summonCost: 2, hp: 80,
    passive: { name: "누나 뒤에 숨기", desc: "누나가 막아 줘서 받는 피해가 10 줄어요", fx: "reduce_dmg_10" },
    attacks: [
      A("발냄새 공격", 1, 20, null, "", "aura", "🦶"),
      A("연속 방귀", 2, 20, "dmg_stack_10", "쓸 때마다 피해가 10씩 늘어요", "burst", "💨"),
      A("대왕 방귀", 3, 50, null, "", "burst", "💥", true),
      A("메가랩터킥", 4, 60, null, "", "strike", "🦖", true),
    ],
    stats: { attack: 2, defense: 3, spirit: 2 },
  },
  {
    id: "appa", name: "아빠", emoji: "👔", type: "brave", element: "earth", rarity: 2,
    summonCost: 3, hp: 80,
    passive: { name: "퇴근 후 힘내기", desc: "체력이 절반 아래면 공격 피해 +20", fx: "boost_20_below_half" },
    attacks: [
      A("목말 태우기", 1, 10, null, "", "strike", "🙌"),
      A("간지럽히기", 2, 20, "skip_next_enemy", "간지러워서 상대는 다음 턴에 기술을 못 써요", "debuff", "🤣"),
    ],
    stats: { attack: 3, defense: 4, spirit: 2 },
  },
  {
    id: "eomma", name: "엄마", emoji: "🌸", type: "magic", element: "wood", rarity: 3,
    summonCost: 4, hp: 70,
    passive: { name: "엄마 눈썰미", desc: "받는 피해가 10 줄어요", fx: "reduce_dmg_10" },
    attacks: [
      A("이제 그만!", 1, 10, "weaken_next_20", "다음 기술 피해가 최대 20 줄어요", "debuff", "✋"),
      A("정리정돈", 2, 30, null, "", "strike", "🧹"),
      A("엄마의 한마디", 3, 30, "skip_next_enemy", "상대는 다음 턴에 기술을 못 써요", "aura", "💬"),
    ],
    stats: { attack: 3, defense: 5, spirit: 4 },
  },
];
const familyIds = ["jaei", "taeo", "appa", "eomma"];
const FAMILY = familyIds.every((id) => data.cards.some((card) => card.id === id))
  ? familyIds.map((id) => data.cards.find((card) => card.id === id))
  : FAMILY_FALLBACK;

const implemented = familyIds.every((id) => data.collection.includes(id));
const all = data.collection.map((id) => data.cards.find((c) => c.id === id))
  .concat(implemented ? [] : FAMILY)
  .filter(Engine.isBattleCard);
const rngOf = (s) => { let x = s >>> 0; return () => { x = (Math.imul(x, 1664525) + 1013904223) >>> 0; return x / 4294967296; }; };
function play(a, b, seed) {
  const r = rngOf(seed);
  let st = Engine.createGame(a, b);
  for (let i = 0; i < 400 && !st.winner; i += 1) st = Engine.performAction(st, Engine.chooseAiAction(st) || { type: "rest" }, r);
  return st.winner;
}
const SEEDS = [11, 29, 47, 83, 101];
const wins = new Map(all.map((c) => [c.id, 0]));
const games = new Map(all.map((c) => [c.id, 0]));
let stalls = 0;
for (const p of all) {
  for (const e of Engine.getBalancedEnemyPool(all, p)) {
    for (const seed of SEEDS) {
      const w = play(p, e, seed);
      games.set(p.id, games.get(p.id) + 1);
      games.set(e.id, games.get(e.id) + 1);
      if (w === "player") wins.set(p.id, wins.get(p.id) + 1);
      else if (w === "enemy") wins.set(e.id, wins.get(e.id) + 1);
      else stalls += 1;
    }
  }
}
const rate = (c) => (games.get(c.id) ? wins.get(c.id) / games.get(c.id) : 0);
console.log("교착", stalls, "건 · 전체", all.length, "장");
console.log("\n가족 4장");
for (const c of FAMILY) {
  console.log(`  ${c.name}  ${(rate(c) * 100).toFixed(2)}%  ${c.type}/${c.element} hp${c.hp}`);
}
console.log("\n전체 순위");
all.slice().sort((a, b) => rate(b) - rate(a)).forEach((card, index) => {
  console.log(String(index + 1).padStart(2) + "위  " + card.name.padEnd(10) + " " + (rate(card) * 100).toFixed(1) + "%");
});
const sorted = all.map(rate).sort((a, b) => a - b);
console.log("\n전체 분포: 최저", (sorted[0] * 100).toFixed(0) + "%", "중앙", (sorted[Math.floor(sorted.length / 2)] * 100).toFixed(0) + "%", "최고", (sorted[sorted.length - 1] * 100).toFixed(0) + "%");
const types = {};
for (const c of all) types[c.type] = (types[c.type] || 0) + 1;
console.log("타입", JSON.stringify(types));
if (implemented) {
  const ranked=all.slice().sort((a,b)=>rate(b)-rate(a)).map(c=>c.id);
  const family=new Set(["jaei","taeo","appa","eomma"]);
  const passed=ranked[0]==="jaei" && ranked[1]==="taeo" && ranked.slice(0,4).every(id=>family.has(id)) && stalls===0;
  console.log("가족 상위 4위 · 재이 1위 · 태오 2위:",passed?"PASS":"FAIL");
  if(!passed)process.exitCode=1;
}
