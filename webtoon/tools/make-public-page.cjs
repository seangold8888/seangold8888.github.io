// 가족용 webtoon/index.html 로 공개판 webtoon/public.html 을 만든다(스크립트 버전 숫자도 그대로 따라간다).
// 사용법(저장소 루트에서): node webtoon/tools/make-public-page.cjs
const fs = require("fs"), path = require("path"), crypto = require("crypto");
const dir = path.resolve(__dirname, "..");
let html = fs.readFileSync(path.join(dir, "index.html"), "utf8");
const must = (cond, what) => { if (!cond) { console.error("index.html 모양이 바뀌었어요: " + what); process.exit(1); } };
must(html.includes("<title>오늘도 우리 집</title>"), "title");
must(/<script src="app\.js\?v=\d+"><\/script>/.test(html), "app.js");
const ver = (f) => crypto.createHash("sha1").update(fs.readFileSync(path.join(dir, "public", f))).digest("hex").slice(0, 8);
html = html
  .replace("<title>오늘도 우리 집</title>", '<meta name="robots" content="noindex">\n<title>오늘도 우리 집 (공개판)</title>')
  .replace(/(<script src="app\.js\?v=\d+"><\/script>)/, '<script src="public/adapted.js?v=' + ver("adapted.js") + '"></script>\n<script src="public/edition.js?v=' + ver("edition.js") + '"></script>\n$1')
  .replace('<link rel="manifest" href="../manifest.json">\n', "");
html = html.replace("<!doctype html>\n", "<!doctype html>\n<!-- 자동으로 만든 파일: node webtoon/tools/make-public-page.cjs (직접 고치지 마세요) -->\n");
fs.writeFileSync(path.join(dir, "public.html"), html);
console.log("저장: webtoon/public.html");
