// 공개판으로 각색할 화를 글 대본으로 뽑고, 제미나이에게 붙여 넣을 부탁 글을 붙인다.
// 사용법(저장소 루트에서): node webtoon/tools/episode-script.cjs 1        → 화면에 출력
//                          node webtoon/tools/episode-script.cjs 1-5 출력폴더 → 폴더에 001.txt …
// 친구 이름은 공개판 가명으로 나온다. 말풍선의 말한 사람은 가장 가까운 인물로 추정한 것이다.
const fs = require("fs"), path = require("path");
const dir = path.resolve(__dirname, "..");
global.window = globalThis;
require(path.join(dir, "words.js"));
require(path.join(dir, "episodes.js"));
require(path.join(dir, "public/adapted.js"));
require(path.join(dir, "public/edition.js"));
const { CHARACTERS, EPISODES } = window.WebtoonData;
const NAME = Object.fromEntries(CHARACTERS.map((c) => [c.id, c.name]));

const BG = { kitchen: "부엌", living: "거실", "living-night": "밤 거실", halmae: "할머니 댁", bedroom: "방", "bedroom-night": "밤 방", bath: "욕실", entrance: "현관", street: "길", memory: "회상", gloom: "(충격·속마음 연출)", rain: "비 오는 길", pool: "수영장", tabletop: "식탁 위", floortop: "바닥" };
const bgName = (bg) => { if (!bg) return ""; const k = String(bg).split(":")[0]; return BG[bg] || BG[k] || (k === "split" ? "(두 사람 나눔 화면)" : k === "burst" || k === "speed" || k === "sparkle" ? "(강조 연출)" : k === "plain" ? "" : k); };

function speaker(panel, bub) {
  const cs = panel.chars || [];
  if (!cs.length) return "?";
  let best = cs[0], d = 1e9;
  for (const c of cs) { const dd = Math.abs((c.x || 0) - bub.x); if (dd < d) { d = dd; best = c; } }
  return NAME[best.c] || best.c;
}

function script(ep) {
  const L = [];
  L.push(`${ep.id}화 「${ep.title}」 (${ep.panels.length}컷)`);
  L.push(`줄거리: ${ep.summary}`);
  ep.panels.forEach((p, i) => {
    const who = (p.chars || []).map((c) => NAME[c.c] || c.c);
    const place = bgName(p.bg);
    L.push("");
    L.push(`${i + 1}컷${place ? " · " + place : ""}${who.length ? " · 등장: " + [...new Set(who)].join(", ") : ""}`);
    if (p.n) L.push(`  (내레이션) ${p.n}`);
    (p.b || []).forEach((b) => {
      const kind = b.k === "think" ? " (속마음)" : b.k === "whisper" ? " (작게)" : b.k === "shout" ? " (크게)" : "";
      L.push(`  ${speaker(p, b)}${kind}: ${b.t}`);
    });
    if (p.n2) L.push(`  (내레이션) ${p.n2}`);
    const fx = (p.sfx || []).map((f) => f.t).join(", ");
    if (fx) L.push(`  효과음: ${fx}`);
  });
  L.push("");
  L.push(`오늘의 한 줄: ${ep.lesson}`);
  return L.join("\n");
}

const PROMPT = `아래는 가족 웹툰 「오늘도 우리 집」의 한 화 대본이야. 네이버 웹툰 도전만화에 올릴 공개판으로 각색해 줘.
세로 스크롤 웹툰, 10~13컷, 컷마다 장면 설명과 대사.
등장인물: 태오(만 5세 남자, 반쪽 레몬을 늘 들고 다님, 발음이 귀엽게 틀림, 누나 괴롭히기 선수, “맛있는 거 죠!” 입버릇),
재이(초등학생 누나, “아니야!” 입버릇, 정리왕), 엄마, 아빠(놀 때는 늘 타노스 역),
할머니(외할머니, 늘 아이들과 놀아 주고 아빠를 “김서방”이라 부름), 할아버지.
조건:
- 실제로 아이들이 한 말(따옴표 대사)은 글자 그대로 살리고, 나머지 장면은 더 재미있게 바꿔도 돼.
- 처음 보는 독자도 1컷만 보고 상황을 알 수 있게 해 줘.
- 마지막 컷은 교훈이 아니라 웃음(반전이나 되받아치기)으로 끝내 줘. 교훈은 ‘오늘의 한 줄’에만.
- 재이는 “바보야”라고 하지 않고, 할머니·할아버지는 표준말.
- 실제 상호나 상품 이름, 실제 만화·영화 캐릭터 이름은 쓰지 마(필요하면 ‘거미 영웅’, ‘우주 악당’처럼 바꿔 줘).
- 친구 이름은 대본에 나온 이름 그대로 써.

[원래 대본]
`;

const which = process.argv[2] || "1";
const outDir = process.argv[3];
let list;
if (which === "all") list = EPISODES;
else if (which.includes("-")) { const [a, z] = which.split("-").map(Number); list = EPISODES.filter((e) => e.id >= a && e.id <= z); }
else list = which.split(",").map(Number).map((i) => EPISODES.find((e) => e.id === i)).filter(Boolean);
if (!list.length) { console.error("그런 화가 없어요: " + which); process.exit(1); }
for (const ep of list) {
  const text = PROMPT + script(ep) + "\n";
  if (outDir) { fs.mkdirSync(outDir, { recursive: true }); fs.writeFileSync(path.join(outDir, String(ep.id).padStart(3, "0") + ".txt"), text); }
  else console.log(text + "\n" + "=".repeat(40) + "\n");
}
if (outDir) console.log(`저장: ${outDir} (${list.length}개)`);
