// 공개판 《얼음짐방》 로고·대표 이미지·회차 썸네일을 PNG 로 뽑는다(그림은 webtoon/brand.html).
// 사용법(저장소 루트에서): node webtoon/tools/make-brand.cjs            → webtoon/public/brand/
//                          node webtoon/tools/make-brand.cjs ep 1 2 3   → 회차 썸네일만
// 크기는 도전만화 업로드 화면 안내에 맞춰 SIZES 를 고친다.
const http = require("http"), fs = require("fs"), path = require("path");
let chromium;
try { ({ chromium } = require("playwright")); } catch (e) { console.error("playwright 가 필요해요"); process.exit(1); }
const root = path.resolve(__dirname, "../..");
const out = path.join(root, "webtoon/public/brand");
fs.mkdirSync(out, { recursive: true });

// [파일 이름, 쿼리, 가로, 세로, 투명 배경]
const SIZES = [
  ["logo.png", "m=logo", 1000, 400, true],
  ["logo-tagline.png", "m=logo&tag=1", 1000, 470, true],
  ["cover-1000x1000.png", "m=cover", 1000, 1000],
  ["cover-860x660.png", "m=cover", 860, 660],
  ["cover-430x330.png", "m=cover", 430, 330],
];
const epThumbs = (ids) => ids.flatMap((id) => [
  [`ep${String(id).padStart(3, "0")}-202x120.png`, `m=ep&ep=${id}`, 202, 120],
  [`ep${String(id).padStart(3, "0")}-404x240.png`, `m=ep&ep=${id}`, 404, 240],
]);
const args = process.argv.slice(2);
const jobs = args[0] === "ep" ? epThumbs(args.slice(1).map(Number)) : SIZES.concat(epThumbs([1]));

const types = { ".html": "text/html; charset=utf-8", ".js": "text/javascript", ".css": "text/css", ".webp": "image/webp", ".png": "image/png" };
const server = http.createServer((q, r) => {
  const f = path.join(root, decodeURIComponent(new URL(q.url, "http://x").pathname));
  if (!f.startsWith(root) || !fs.existsSync(f) || fs.statSync(f).isDirectory()) { r.writeHead(404); return r.end(); }
  r.writeHead(200, { "Content-Type": types[path.extname(f)] || "application/octet-stream" });
  r.end(fs.readFileSync(f));
});
server.listen(0, "127.0.0.1", async () => {
  const b = await chromium.launch();
  for (const [name, query, w, h, transparent] of jobs) {
    // 작은 그림도 또렷하게: 큰 배율로 그린 뒤 브라우저가 줄이게 하지 않고, 그 크기 그대로 그린다.
    const p = await b.newPage({ viewport: { width: w, height: h } });
    p.on("pageerror", (e) => console.log("페이지 오류:", e.message));
    await p.goto(`http://127.0.0.1:${server.address().port}/webtoon/brand.html?${query}&w=${w}&h=${h}`);
    await p.waitForSelector("body[data-ready]");
    await p.waitForTimeout(500);
    await p.screenshot({ path: path.join(out, name), omitBackground: !!transparent, clip: { x: 0, y: 0, width: w, height: h } });
    await p.close();
    console.log("저장:", path.relative(root, path.join(out, name)));
  }
  await b.close();
  server.close();
});
