// 한 화를 휴대폰 폭(480px)으로 캡처한다. 말풍선 겹침을 눈으로 확인할 때 쓴다.
// 사용법(저장소 루트에서): node webtoon/tools/preview.cjs 21 [출력폴더]
//   → 출력폴더에 ep21_0.png, ep21_1.png … (컷 네 개씩) 와 ep21_full.png 가 생긴다.
// 필요한 것: node, playwright (npm i -D playwright 후 npx playwright install chromium)
const http = require("http"), fs = require("fs"), path = require("path");
let chromium;
try { ({ chromium } = require("playwright")); } catch (e) { console.error("playwright 가 필요해요: npm i -D playwright && npx playwright install chromium"); process.exit(1); }
const root = path.resolve(__dirname, "../..");
const ep = process.argv[2] || "1";
const out = path.resolve(process.argv[3] || "webtoon-preview");
fs.mkdirSync(out, { recursive: true });
const types = { ".html": "text/html; charset=utf-8", ".js": "text/javascript", ".css": "text/css", ".webp": "image/webp", ".png": "image/png", ".json": "application/json" };
const server = http.createServer((q, r) => {
  let f = path.join(root, decodeURIComponent(new URL(q.url, "http://x").pathname));
  if (f.endsWith(path.sep) || (fs.existsSync(f) && fs.statSync(f).isDirectory())) f = path.join(f, "index.html");
  if (!f.startsWith(root) || !fs.existsSync(f)) { r.writeHead(404); return r.end(); }
  r.writeHead(200, { "Content-Type": types[path.extname(f)] || "application/octet-stream" });
  r.end(fs.readFileSync(f));
});
server.listen(0, "127.0.0.1", async () => {
  const url = `http://127.0.0.1:${server.address().port}/webtoon/#ep=${ep}`;
  const b = await chromium.launch();
  const p = await b.newPage({ viewport: { width: 480, height: 900 } });
  p.on("pageerror", (e) => console.log("페이지 오류:", e.message));
  await p.goto(url);
  await p.waitForTimeout(500);
  await p.evaluate(() => { document.querySelectorAll(".panel").forEach((x) => x.classList.add("in")); document.querySelector(".topbar").style.position = "static"; });
  await p.waitForTimeout(700);
  const panels = await p.$$(".panel");
  for (let i = 0; i < panels.length; i += 4) {
    const boxes = [];
    for (const el of panels.slice(i, i + 4)) boxes.push(await el.boundingBox());
    const y0 = boxes[0].y, last = boxes[boxes.length - 1];
    await p.screenshot({ path: path.join(out, `ep${ep}_${i / 4}.png`), fullPage: true, clip: { x: 0, y: y0, width: 480, height: last.y + last.height - y0 } });
  }
  await p.screenshot({ path: path.join(out, `ep${ep}_full.png`), fullPage: true });
  console.log(`저장: ${out} (컷 ${panels.length}개)`);
  await b.close();
  server.close();
});
