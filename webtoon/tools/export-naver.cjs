// 공개판(public.html)의 한 화를 웹툰 업로드용 세로 이미지(JPG)로 뽑는다.
// 사용법(저장소 루트에서):
//   node webtoon/tools/export-naver.cjs 7            → webtoon-export/007/007_01.jpg …
//   node webtoon/tools/export-naver.cjs 1-10 출력폴더
//   node webtoon/tools/export-naver.cjs all --width 690 --max 1600 --quality 92
// 규격 기본값: 가로 690px, 한 장 세로 1600px 이하. 업로드 화면 안내와 다르면 --width / --max 로 맞춘다.
// 컷 경계에서 자르고, 한 컷이 한 장보다 길 때만 컷 중간을 자른다. 움직임은 멈춘 마지막 모습으로 찍는다.
// 필요한 것: node, playwright
const http = require("http"), fs = require("fs"), path = require("path");
let chromium;
try { ({ chromium } = require("playwright")); } catch (e) { console.error("playwright 가 필요해요: npm i -D playwright && npx playwright install chromium"); process.exit(1); }

const args = process.argv.slice(2);
const opt = (name, def) => { const i = args.indexOf("--" + name); if (i < 0) return def; const v = args[i + 1]; args.splice(i, 2); return Number(v); };
const WIDTH = opt("width", 690), MAXH = opt("max", 1600), QUALITY = opt("quality", 92);
const which = args[0] || "1";
const out = path.resolve(args[1] || "webtoon-export");
const root = path.resolve(__dirname, "../..");
const CSS_W = 480; // 휴대폰 폭으로 그린 뒤 배율로 키운다
const scale = WIDTH / CSS_W;

const types = { ".html": "text/html; charset=utf-8", ".js": "text/javascript", ".css": "text/css", ".webp": "image/webp", ".png": "image/png", ".json": "application/json" };
const server = http.createServer((q, r) => {
  let f = path.join(root, decodeURIComponent(new URL(q.url, "http://x").pathname));
  if (f.endsWith(path.sep) || (fs.existsSync(f) && fs.statSync(f).isDirectory())) f = path.join(f, "index.html");
  if (!f.startsWith(root) || !fs.existsSync(f)) { r.writeHead(404); return r.end(); }
  r.writeHead(200, { "Content-Type": types[path.extname(f)] || "application/octet-stream" });
  r.end(fs.readFileSync(f));
});

server.listen(0, "127.0.0.1", async () => {
  const base = `http://127.0.0.1:${server.address().port}/webtoon/public.html`;
  const b = await chromium.launch();
  const ctx = await b.newContext({ viewport: { width: CSS_W, height: 900 }, deviceScaleFactor: scale, reducedMotion: "reduce" });
  const p = await ctx.newPage();
  p.on("pageerror", (e) => console.log("페이지 오류:", e.message));
  await p.goto(base);
  const ids = await p.evaluate(() => window.WebtoonData.EPISODES.map((e) => e.id));
  let list;
  if (which === "all") list = ids;
  else if (which.includes("-")) { const [a, z] = which.split("-").map(Number); list = ids.filter((i) => i >= a && i <= z); }
  else list = which.split(",").map(Number).filter((i) => ids.includes(i));
  if (!list.length) { console.error("그런 화가 없어요: " + which); process.exit(1); }

  for (const id of list) {
    await p.goto(`${base}#ep=${id}`);
    await p.waitForTimeout(400);
    await p.evaluate(() => {
      document.querySelectorAll(".panel").forEach((x) => x.classList.add("in"));
      const t = document.querySelector(".topbar"); if (t) t.style.display = "none";
    });
    await p.evaluate(() => document.fonts && document.fonts.ready);
    await p.waitForTimeout(500);
    const boxes = await p.$$eval(".strip .panel", (els) => els.map((el) => { const r = el.getBoundingClientRect(); return { y: r.top + scrollY, h: r.height }; }));
    if (!boxes.length) { console.log(`${id}화: 컷이 없어요`); continue; }
    const maxCss = Math.floor(MAXH / scale);
    const gap = boxes.length > 1 ? Math.max(0, boxes[1].y - boxes[0].y - boxes[0].h) : 0;
    const pad = Math.round(gap / 2);
    // 컷을 묶어서 한 장(세로 maxCss 이하)씩 만든다.
    const slices = [];
    let start = boxes[0].y - pad, end = start;
    for (const bx of boxes) {
      const top = bx.y - pad, bottom = bx.y + bx.h + pad;
      if (bottom - start > maxCss && end > start) { slices.push([start, end]); start = top; }
      end = bottom;
      while (end - start > maxCss) { slices.push([start, start + maxCss]); start += maxCss; }
    }
    if (end > start) slices.push([start, end]);
    const dir = path.join(out, String(id).padStart(3, "0"));
    fs.rmSync(dir, { recursive: true, force: true });
    fs.mkdirSync(dir, { recursive: true });
    let n = 0;
    for (const [y0, y1] of slices) {
      n++;
      const file = path.join(dir, `${String(id).padStart(3, "0")}_${String(n).padStart(2, "0")}.jpg`);
      await p.screenshot({ path: file, type: "jpeg", quality: QUALITY, fullPage: true, clip: { x: 0, y: Math.max(0, y0), width: CSS_W, height: Math.round(y1 - Math.max(0, y0)) } });
    }
    const title = await p.evaluate((i) => window.WebtoonData.EPISODES.find((e) => e.id === i).title, id);
    console.log(`${id}화 「${title}」: ${n}장 → ${path.relative(process.cwd(), dir)}`);
  }
  await b.close();
  server.close();
});
