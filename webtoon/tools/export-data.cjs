// 웹툰 대본과 말 모음을 JSON 하나로 내보낸다(엑셀 기획표 만들기용).
// 사용법: node webtoon/tools/export-data.cjs data.json
const path = require("path"), fs = require("fs");
const dir = path.resolve(__dirname, "..");
require(path.join(dir, "words.js"));
require(path.join(dir, "episodes.js"));
const d = globalThis.WebtoonData;
d.WORDS = globalThis.TaeoWords;
d.SAYINGS = globalThis.TaeoSayings;
d.JWORDS = globalThis.JaeiWords;
d.JSAYINGS = globalThis.JaeiSayings;
fs.writeFileSync(process.argv[2] || "data.json", JSON.stringify(d));
console.log("saved", process.argv[2] || "data.json");
