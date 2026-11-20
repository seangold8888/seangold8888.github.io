// 2.5D 경기장 무대(Canvas2D) — 모든 종목 view 가 같이 쓴다.
//  - world 좌표: 땅 = y 0, 위로 갈수록 음수. 화면 세로 = 1000 world(줌 1). 가로는 화면 비율만큼.
//  - 카메라: 따라가기·확대 펀치·흔들림(부드럽게). fit(width) 로 세로 화면에서도 꼭 보여야 할 너비를 맞춘다.
//  - 배경: art/manifest.json 의 backgrounds[eventId] 가
//      { plate: "<이름>" } → 한 장짜리 그림판(plates[이름] = { file, ground, kidH }): 그림 높이의 ground 지점이 땅(y=0),
//          캐릭터 키(kidH, 그림 높이 비율)가 view 의 아이 키(setKidHeight)와 같아지게 놓고, 화면을 꽉 채우게(cover) 카메라를 묶는다.
//      ["sky","stands","field"] → 층 그림을 시차(parallax)로.
//      없으면 코드로 그린 자리표시 경기장(하늘·구름·관중석 파도·만국기·잔디·트랙).
//  - 깊이 정렬: add({ z, draw(g) }) 로 넣고 flush() 가 z(작을수록 뒤) 순으로 그린다.
//  - 파티클: burst / sparkle / dust (world 좌표). 꽃가루·큰 글자는 juice.js(DOM 층).
import { loadManifest, loadImage } from "./sprites.js?v=1";
import { feetFor, maxKidPx } from "../layout.js?v=1";

const MAX_PIXELS = 2.3e6;
const TEAM_BLUE = "#2f6bff", TEAM_WHITE = "#ffffff";

export function createStage(root, { eventId = "", crowd = true } = {}) {
  const cv = document.createElement("canvas"); cv.className = "view-canvas"; root.prepend(cv);
  const g = cv.getContext("2d", { alpha: false });
  const st = {
    g, canvas: cv, W: 0, H: 0, dpr: 1, t: 0,
    cam: { x: 0, y: -330, zoom: 1, tx: 0, ty: -330, tzoom: 1, punch: 0, shake: 0, fitW: 0 },
    cheer: 0,            // 관중 들썩임 0~1(저절로 줄어든다)
    layers: null,        // 진짜 배경 그림 { sky, stands, field, fore, crowd }
    plate: null,         // 한 장짜리 그림판 { img, ground, kidH }
    kidHWorld: 340,      // 이 무대의 아이 키(world) — 그림판 배율 기준
    overscan: false,     // true = 그림판 밖까지 카메라가 갈 수 있음(첫 화면 시연이 메뉴를 피할 때)
    floorExt: 0,         // 경기 중: 그림판 아래로 이만큼(world) 더 내려 볼 수 있음(발을 톡 버튼 위로 올릴 때 — 땅을 이어 붙인다)
    items: [], parts: [],
  };
  function size() {
    const w = root.clientWidth || innerWidth, h = root.clientHeight || innerHeight;
    const dpr = Math.max(1, Math.min(window.devicePixelRatio || 1, 2, Math.sqrt(MAX_PIXELS / Math.max(1, w * h))));
    st.W = w; st.H = h; st.dpr = dpr; cv.width = Math.round(w * dpr); cv.height = Math.round(h * dpr);
    cache = null;
    // 첫 그림이 나오기 전(그림 읽는 중)에도 까만 화면이 아니게: 하늘·땅 색을 먼저 칠해 둔다
    const pre = g.createLinearGradient(0, 0, 0, cv.height); pre.addColorStop(0, "#4f9df5"); pre.addColorStop(0.55, "#bfe3ff"); pre.addColorStop(0.62, "#8fbf62"); pre.addColorStop(1, "#b48a5c");
    g.setTransform(1, 0, 0, 1, 0, 0); g.fillStyle = pre; g.fillRect(0, 0, cv.width, cv.height);
  }
  let cache = null;   // 자리표시 배경 미리 그린 것
  const ro = typeof ResizeObserver !== "undefined" ? new ResizeObserver(size) : null;
  if (ro) ro.observe(root); else addEventListener("resize", size);
  size();

  // 진짜 배경 그림(있으면)
  loadManifest().then(async man => {
    const bg = man.backgrounds && man.backgrounds[eventId];
    if (!bg) return;
    const v = man.version || 1, L = {};
    if (bg.plate) {
      const pl = man.plates && man.plates[bg.plate]; if (!pl) return;
      const im = await loadImage(new URL(`../../art/${pl.file}?v=${v}`, import.meta.url).href);
      if (im) {
        // 그림판 아래로 이어 붙일 땅 색(맨 아래 줄 평균)
        // 그림판 위·아래로 이어 붙일 하늘·땅 색(맨 위·맨 아래 줄 평균)
        const avg = (y0, h, fb) => { try { const c = document.createElement("canvas"); c.width = c.height = 1; const x = c.getContext("2d"); x.drawImage(im, 0, im.height * y0, im.width, im.height * h, 0, 0, 1, 1); const d = x.getImageData(0, 0, 1, 1).data; return `rgb(${d[0]},${d[1]},${d[2]})`; } catch (_) { return fb; } };
        st.plate = { img: im, ground: pl.ground || 0.9, kidH: pl.kidH || 0.4, floor: avg(0.97, 0.03, "#a07a55"), sky: avg(0, 0.02, "#4aa3ff") };
      }
      return;
    }
    if (!bg.length) return;
    for (const name of bg) { const im = await loadImage(new URL(`../../art/bg/${eventId}/${name}.webp?v=${v}`, import.meta.url).href); if (im) L[name] = im; }
    if (man.crowd) { const im = await loadImage(new URL(`../../art/bg/crowd.webp?v=${v}`, import.meta.url).href); if (im) L.crowd = im; }
    st.layers = L;
  });

  /* ---------- 카메라 ---------- */
  function scale() { return (st.H / 1000) * st.cam.zoom * (1 + st.cam.punch); }
  st.view = () => { const s = scale(); return { s, w: st.W / s, h: st.H / s }; };
  st.toScreen = (x, y) => { const s = scale(); return { x: (st.W / 2 + (x - st.cam.x) * s) / st.W, y: (st.H / 2 + (y - st.cam.y) * s) / st.H }; };
  st.lookAt = (x, y, zoom) => { st.cam.tx = x; st.cam.ty = y; if (zoom) st.cam.tzoom = zoom; };
  st.fit = w => { st.cam.fitW = w; };       // 이 world 너비는 늘 보이게(세로 화면이면 줌을 줄인다)
  st.punch = (p = 0.06) => { st.cam.punch = Math.max(st.cam.punch, p); };
  st.shake = (p = 1) => { st.cam.shake = Math.max(st.cam.shake, p); };
  st.cheerUp = (p = 1) => { st.cheer = Math.min(1.4, Math.max(st.cheer, p)); };
  st.setKidHeight = h => { st.kidHWorld = h; };
  // 그림판이 화면을 덮는 최소 줌(절대값). 그림판이 없으면 1.
  st.coverZoom = () => { if (!st.plate) return 1; const pb = plateBox(); return Math.max(1000 / pb.Hp, (st.W / st.H) * 1000 / pb.Wp); };
  // 안전 구역(layout.js safeArea)에 아이를 맞추는 카메라: 발(world feetY)을 아래 띠 바로 위에, 머리(키 kidH world)는 알림 띠 아래로.
  //  x = 아이 가운데(world), zoom = 바라는 줌(그림판이면 덮는 줌 대비 배율), footPad·headPad(px), bias(0 아래 붙임) ·
  //  아이가 너무 크면 줌을 줄인다(그림판 덮기 아래로는 못 줄임 · 시연 overscan 이면 더 멀리도).
  //  돌려줌: { s(px/world), feet(화면 y), zoom(절대) }
  st.frameKid = ({ x = 0, kidH = st.kidHWorld, feetY = 0, sa, zoom = 1, footPad = 0, headPad = 6, footPadW = 0, headPadW = 0, bias = 0, offsetX = 0, minZoom = 0.2 }) => {
    const cover = st.coverZoom(), plateMode = !!st.plate;
    let z = plateMode ? cover * (st.overscan ? zoom : Math.max(1, zoom)) : zoom;
    if (!plateMode && st.cam.fitW) z = Math.min(z, (st.W / (st.H / 1000)) / st.cam.fitW);
    const mx = maxKidPx(sa, { footPad, headPad }), tot = kidH + footPadW + headPadW;
    if (tot * st.H / 1000 * z > mx) z = Math.max(plateMode && !st.overscan ? cover : minZoom, mx / (tot * st.H / 1000));
    const s = st.H / 1000 * z;
    const f = feetFor(sa, kidH * s, { footPad: footPad + footPadW * s, headPad: headPad + headPadW * s, bias });
    const camY = feetY - (f.feet - st.H / 2) / s;
    // 가로: 아이가 안전 구역(좌우) 가운데에 오게
    const cxScr = ((sa.left || 0) + (sa.right || st.W)) / 2;
    const camX = x - (cxScr - st.W / 2) / s + offsetX;
    if (plateMode && !st.overscan) {
      const pb = plateBox(), hh = 500 / z, yb = pb.top + pb.Hp;
      st.floorExt = Math.max(0, camY + hh - yb) + 2;
    } else st.floorExt = 0;
    st.lookAt(camX, camY, plateMode ? z / cover : z);
    return { s, feet: f.feet, zoom: z, fits: f.fits };
  };
  // world 점·상자 → 화면 px(목표 카메라가 아니라 지금 카메라 기준)
  st.toPx = (x, y) => { const p = st.toScreen(x, y); return { x: p.x * st.W, y: p.y * st.H }; };
  st.rectPx = (x0, y0, x1, y1) => { const a = st.toPx(x0, y0), b = st.toPx(x1, y1); return { x: Math.min(a.x, b.x), y: Math.min(a.y, b.y), w: Math.abs(b.x - a.x), h: Math.abs(b.y - a.y) }; };
  // 그림판 크기(world): 캐릭터 키가 맞게
  function plateBox() {
    const P = st.plate, Hp = st.kidHWorld / P.kidH, Wp = Hp * P.img.width / P.img.height;
    return { Hp, Wp, left: -Wp / 2, top: -P.ground * Hp };
  }

  /* ---------- 파티클 ---------- */
  st.burst = (x, y, o = {}) => {
    const n = o.n || 18, cols = o.colors || ["#fff7a8", "#ffd23f", "#ffffff"];
    for (let i = 0; i < n; i++) {
      const a = (o.angle != null ? o.angle : -Math.PI / 2) + (Math.random() * 2 - 1) * (o.spread != null ? o.spread : Math.PI), v = (o.speed || 520) * (0.4 + Math.random() * 0.8);
      st.parts.push({ x, y, vx: Math.cos(a) * v, vy: Math.sin(a) * v, g: o.gravity != null ? o.gravity : 900, life: (o.life || 0.6) * (0.6 + Math.random() * 0.6), max: 1, r: (o.size || 9) * (0.5 + Math.random()), c: cols[i % cols.length], kind: o.kind || "star" });
    }
  };
  st.sparkle = (x, y, color) => st.parts.push({ x, y, vx: (Math.random() - 0.5) * 60, vy: -40 - Math.random() * 80, g: 60, life: 0.5, max: 0.5, r: 6 + Math.random() * 6, c: color || `hsl(${Math.random() * 360},95%,65%)`, kind: "star" });
  st.dust = (x, y) => { for (let i = 0; i < 8; i++) st.parts.push({ x: x + (Math.random() - 0.5) * 60, y, vx: (Math.random() - 0.5) * 220, vy: -30 - Math.random() * 90, g: 120, life: 0.45, max: 0.45, r: 10 + Math.random() * 12, c: "rgba(235,220,190,.7)", kind: "puff" }); };

  /* ---------- 자리표시 배경(코드 그림, 미리 그려 둔다) ---------- */
  function buildCache() {
    const s = scale(), vw = st.W / s;
    // 관중 띠: 머리 여러 줄(한 번 그려 두고 세로 조각으로 파도)
    const cw = 1024, ch = 220, crowdCv = document.createElement("canvas"); crowdCv.width = cw; crowdCv.height = ch;
    const c = crowdCv.getContext("2d");
    const shirt = ["#ff5a5a", "#ffd23f", "#3ec1ff", "#7cdb5a", "#b98bff", "#ff9a3c", "#ffffff", "#2f6bff", "#f06bb0"];
    const skin = ["#ffd9b8", "#f2c39b", "#e8b088", "#ffe2c8"];
    const hair = ["#2b1d17", "#4a2f22", "#1a1a1a", "#6b4630"];
    let seed = 7; const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
    for (let row = 0; row < 5; row++) {
      const y = 40 + row * 40, step = 30 - row * 1.5;
      for (let x = 10 + (row % 2) * step / 2; x < cw; x += step) {
        const r = 11 - row * 0.4;
        c.fillStyle = shirt[(rnd() * shirt.length) | 0]; c.beginPath(); c.ellipse(x, y + r * 1.9, r * 1.25, r * 1.2, 0, 0, Math.PI * 2); c.fill();
        c.fillStyle = skin[(rnd() * skin.length) | 0]; c.beginPath(); c.arc(x, y, r, 0, Math.PI * 2); c.fill();
        c.fillStyle = hair[(rnd() * hair.length) | 0]; c.beginPath(); c.arc(x, y - r * 0.25, r * 1.02, Math.PI * 1.05, Math.PI * 1.95); c.fill();
        if (rnd() < 0.18) { c.fillStyle = rnd() < 0.5 ? TEAM_BLUE : TEAM_WHITE; c.fillRect(x - 3, y - r * 3.2, 14, 10); c.fillStyle = "#555"; c.fillRect(x - 4, y - r * 3.2, 2, r * 2.6); }
      }
    }
    cache = { vw, crowd: crowdCv, cw, ch };
  }

  function drawPlaceholderBack(vw) {
    const s = scale(), cam = st.cam, top = cam.y - 500 / (cam.zoom * (1 + cam.punch)), bottom = cam.y + 500 / (cam.zoom * (1 + cam.punch));
    // 하늘(화면 고정)
    g.setTransform(st.dpr, 0, 0, st.dpr, 0, 0);
    const horizonScr = st.H / 2 + (-430 - cam.y) * s;
    const sky = g.createLinearGradient(0, 0, 0, Math.max(10, horizonScr));
    sky.addColorStop(0, "#2f8cff"); sky.addColorStop(0.6, "#7cc8ff"); sky.addColorStop(1, "#d6f1ff");
    g.fillStyle = sky; g.fillRect(0, 0, st.W, st.H);
    // 해와 빛
    const sunX = st.W * 0.82, sunY = Math.min(st.H * 0.16, horizonScr * 0.4);
    const sun = g.createRadialGradient(sunX, sunY, 0, sunX, sunY, st.H * 0.35);
    sun.addColorStop(0, "rgba(255,250,210,.95)"); sun.addColorStop(0.12, "rgba(255,244,190,.6)"); sun.addColorStop(1, "rgba(255,244,190,0)");
    g.fillStyle = sun; g.fillRect(0, 0, st.W, st.H);
    // 구름(아주 느린 시차)
    g.fillStyle = "rgba(255,255,255,.9)";
    for (let i = 0; i < 5; i++) {
      const x = ((i * 0.27 + st.t * 0.006 - cam.x * 0.00008) % 1.3 - 0.15) * st.W, y = horizonScr * (0.18 + (i % 3) * 0.17), r = st.H * (0.035 + (i % 2) * 0.015);
      g.beginPath(); g.ellipse(x, y, r * 2.2, r, 0, 0, Math.PI * 2); g.ellipse(x + r * 1.4, y - r * 0.5, r * 1.4, r * 0.9, 0, 0, Math.PI * 2); g.ellipse(x - r * 1.3, y - r * 0.2, r * 1.2, r * 0.75, 0, 0, Math.PI * 2); g.fill();
    }
    // 관중석(시차 0.35): 지붕·벽·관중 파도
    const par = 0.35, ox = cam.x * (1 - par);
    worldTransform(ox, 0);
    const half = vw / 2 + 200, x0 = cam.x - half - ox, x1 = cam.x + half - ox;
    g.fillStyle = "#1d3c8f"; g.fillRect(x0, -760, x1 - x0, 50);                     // 지붕 띠
    g.fillStyle = "#2a55c4"; g.fillRect(x0, -712, x1 - x0, 12);
    const wall = g.createLinearGradient(0, -700, 0, -430); wall.addColorStop(0, "#5b6c9e"); wall.addColorStop(1, "#8193c7");
    g.fillStyle = wall; g.fillRect(x0, -700, x1 - x0, 270);
    // 관중 띠를 세로 조각으로 그리며 파도
    const cr = cache.crowd, sw = 32, amp = 6 + st.cheer * 26, crowdH = 250, k = crowdH / cache.ch;
    for (let x = Math.floor(x0 / (sw * k)) * sw * k; x < x1; x += sw * k) {
      const srcX = (((x / k) % cache.cw) + cache.cw) % cache.cw;
      const wave = Math.max(0, Math.sin(x * 0.004 - st.t * 3.2)) * amp + Math.sin(x * 0.05 + st.t * 9) * st.cheer * 4;
      g.drawImage(cr, srcX, 0, Math.min(sw, cache.cw - srcX), cache.ch, x, -690 - wave, Math.min(sw, cache.cw - srcX) * k + 0.6, crowdH);
    }
    g.fillStyle = "#24356e"; g.fillRect(x0, -445, x1 - x0, 22);                      // 관중석 앞 난간
    g.fillStyle = "#e9eefc"; g.fillRect(x0, -452, x1 - x0, 7);
    // 만국기(시차 0.55)
    worldTransform(cam.x * (1 - 0.55), 0);
    const fx0 = cam.x - half - cam.x * 0.45, flagCols = ["#ff4d4d", "#ffd23f", TEAM_BLUE, "#ffffff", "#3fcf6a", "#ff8ad8", "#ff9a1f"];
    for (let line = 0; line < 2; line++) {
      const yBase = -820 + line * 70, span = 520;
      for (let sx = Math.floor(fx0 / span) * span; sx < fx0 + vw + 600; sx += span) {
        g.strokeStyle = "rgba(60,60,80,.7)"; g.lineWidth = 2; g.beginPath();
        for (let i = 0; i <= 20; i++) { const u = i / 20, y = yBase + Math.sin(Math.PI * u) * 60; i ? g.lineTo(sx + u * span, y) : g.moveTo(sx, y); }
        g.stroke();
        for (let i = 1; i < 12; i++) {
          const u = i / 12, x = sx + u * span, y = yBase + Math.sin(Math.PI * u) * 60, sway = Math.sin(st.t * 3 + x * 0.02) * 0.18;
          g.save(); g.translate(x, y); g.rotate(sway); g.fillStyle = flagCols[(i + line * 3 + Math.round(sx / span)) % flagCols.length];
          g.fillRect(-13, 0, 26, 30); g.fillStyle = "rgba(255,255,255,.25)"; g.fillRect(-13, 0, 26, 6); g.restore();
        }
      }
    }
    // 땅(시차 1): 잔디 줄무늬 + 트랙
    worldTransform(0, 0);
    const gx0 = cam.x - half, gx1 = cam.x + half;
    const grass = g.createLinearGradient(0, -430, 0, bottom + 50); grass.addColorStop(0, "#5fbf4a"); grass.addColorStop(1, "#3f9a35");
    g.fillStyle = grass; g.fillRect(gx0, -430, gx1 - gx0, bottom + 480);
    g.fillStyle = "rgba(255,255,255,.07)";
    for (let i = -12; i <= 12; i++) {           // 원근 줄무늬(소실점은 관중석 가운데)
      if (i % 2) continue;
      const a = i * 160, b = (i + 1) * 160;
      g.beginPath(); g.moveTo(a * 0.25, -430); g.lineTo(b * 0.25, -430); g.lineTo(b * 2.2, bottom + 60); g.lineTo(a * 2.2, bottom + 60); g.fill();
    }
    // 트랙(뒤쪽 띠)
    const track = g.createLinearGradient(0, -430, 0, -330); track.addColorStop(0, "#d9643e"); track.addColorStop(1, "#ee7a4c");
    g.fillStyle = track; g.fillRect(gx0, -430, gx1 - gx0, 100);
    g.strokeStyle = "rgba(255,255,255,.85)"; g.lineWidth = 3;
    for (const y of [-405, -380, -355]) { g.beginPath(); g.moveTo(gx0, y); g.lineTo(gx1, y); g.stroke(); }
  }

  function drawImageLayers(vw) {
    // 진짜 배경: 각 층을 화면 높이에 맞춰 가로 반복 + 시차
    const L = st.layers, cam = st.cam;
    const order = [["sky", 0.05], ["stands", 0.35], ["field", 1]];
    g.setTransform(st.dpr, 0, 0, st.dpr, 0, 0); g.fillStyle = "#7cc8ff"; g.fillRect(0, 0, st.W, st.H);
    for (const [name, par] of order) {
      const im = L[name]; if (!im) continue;
      worldTransform(cam.x * (1 - par), 0);
      const h = 1400, w = h * im.width / im.height, x0 = cam.x * par - vw / 2 - w;
      for (let x = Math.floor(x0 / w) * w; x < cam.x * par + vw / 2 + w; x += w) g.drawImage(im, x, -1000, w, h);
      if (name === "stands" && L.crowd) {
        const c = L.crowd, ch = 260, cw = ch * c.width / c.height, sw = 40;
        for (let x = Math.floor((cam.x * par - vw / 2) / sw) * sw; x < cam.x * par + vw / 2 + sw; x += sw) {
          const srcX = ((x / cw * c.width) % c.width + c.width) % c.width, wave = Math.max(0, Math.sin(x * 0.004 - st.t * 3.2)) * (6 + st.cheer * 26);
          g.drawImage(c, srcX, 0, Math.min(sw / cw * c.width, c.width - srcX), c.height, x, -700 - wave, sw + 0.5, ch);
        }
      }
    }
  }

  function worldTransform(parallaxOffsetX, oy) {
    const s = scale(), cam = st.cam;
    let sx = 0, sy = 0;
    if (cam.shake > 0) { sx = (Math.random() * 2 - 1) * cam.shake * 12; sy = (Math.random() * 2 - 1) * cam.shake * 12; }
    g.setTransform(st.dpr * s, 0, 0, st.dpr * s, st.dpr * (st.W / 2 - (cam.x - parallaxOffsetX) * s + sx), st.dpr * (st.H / 2 - (cam.y - oy) * s + sy));
  }
  st.worldTransform = () => worldTransform(0, 0);

  /* ---------- 한 프레임 ---------- */
  st.begin = dt => {
    st.t += dt;
    const cam = st.cam;
    // 세로 화면: fitW 가 보이게 줌을 줄인다
    let tz = cam.tzoom;
    const pb = st.plate ? plateBox() : null;
    // 그림판이 화면을 꽉 채우게(cover). overscan(첫 화면 시연)일 때만 tzoom<1 로 더 멀리 볼 수 있다
    if (pb) tz = Math.max(1000 / pb.Hp, (st.W / st.H) * 1000 / pb.Wp) * (st.overscan ? cam.tzoom : Math.max(1, cam.tzoom));
    else if (cam.fitW) { const need = (st.W / (st.H / 1000)) / cam.fitW; tz = Math.min(tz, need); }
    const k = 1 - Math.pow(0.0009, dt);
    cam.x += (cam.tx - cam.x) * k; cam.y += (cam.ty - cam.y) * k; cam.zoom += (tz - cam.zoom) * k;
    if (pb) {
      if (!st.overscan) cam.zoom = Math.max(cam.zoom, tz / Math.max(1, cam.tzoom));
      const hh = 500 / cam.zoom, hw = hh * st.W / st.H;
      // 경기 중: 그림판 안에만. 첫 화면 시연(overscan): 양옆은 뒤집은 그림, 위아래는 하늘·땅 색으로 이어 붙여 메뉴를 피해 아이를 옮긴다
      const ox = st.overscan ? pb.Wp * 0.5 : 0, oy = st.overscan ? pb.Hp * 1.6 : 0;
      const clamp = (v, lo, hi) => (lo > hi ? (lo + hi) / 2 : Math.max(lo, Math.min(hi, v)));
      cam.x = clamp(cam.x, pb.left - ox + hw, pb.left + pb.Wp + ox - hw);
      cam.y = clamp(cam.y, pb.top - oy + hh, pb.top + pb.Hp + oy - hh + (st.overscan ? 0 : st.floorExt));
    }
    cam.punch *= Math.pow(0.02, dt); cam.shake = Math.max(0, cam.shake - dt * 3.5);
    st.cheer = Math.max(0, st.cheer - dt * 0.5);
    const vw = st.W / scale();
    if (pb) {
      worldTransform(0, 0);
      const P = st.plate, yb = pb.top + pb.Hp;
      if (st.overscan) {
        const sky = g.createLinearGradient(0, pb.top - pb.Hp * 1.6, 0, pb.top + 2);
        sky.addColorStop(0, P.sky); sky.addColorStop(1, P.sky);
        g.fillStyle = sky; g.fillRect(pb.left - pb.Wp, pb.top - pb.Hp * 1.6, pb.Wp * 3, pb.Hp * 1.6 + 2);
        g.fillStyle = P.floor; g.fillRect(pb.left - pb.Wp, yb - 2, pb.Wp * 3, pb.Hp * 1.6 + 2);
        for (const sx of [-1, 1]) {        // 양옆: 좌우로 뒤집은 그림판(이음매가 자연스럽게)
          g.save(); g.translate(sx < 0 ? pb.left : pb.left + pb.Wp, 0); g.scale(-1, 1);
          g.drawImage(P.img, sx < 0 ? 0 : -pb.Wp, pb.top, pb.Wp, pb.Hp); g.restore();
        }
      }
      g.drawImage(P.img, pb.left, pb.top, pb.Wp, pb.Hp);
      if (st.cam.y + 500 / st.cam.zoom > yb + 1) {   // 그림판 아래까지 보이면: 맨 아래 띠를 뒤집어 이어 붙이고 땅 색으로 부드럽게
        const strip = Math.min(P.img.height * 0.12, P.img.height), sh = pb.Hp * 0.12;
        const x0 = st.overscan ? pb.left - pb.Wp : pb.left, w0 = st.overscan ? pb.Wp * 3 : pb.Wp;
        g.fillStyle = P.floor; g.fillRect(x0, yb - 1, w0, pb.Hp * 0.8);
        g.save(); g.translate(0, yb * 2); g.scale(1, -1);
        g.drawImage(P.img, 0, P.img.height - strip, P.img.width, strip, pb.left, yb - sh, pb.Wp, sh);
        g.restore();
        const fade = g.createLinearGradient(0, yb - pb.Hp * 0.04, 0, yb + sh);
        fade.addColorStop(0, "rgba(0,0,0,0)"); fade.addColorStop(0.35, P.floor.replace("rgb(", "rgba(").replace(")", ",.55)")); fade.addColorStop(1, P.floor);
        g.fillStyle = fade; g.fillRect(x0, yb - pb.Hp * 0.04, w0, sh + pb.Hp * 0.04 + 1);
      }
    }
    else if (st.layers && Object.keys(st.layers).length) drawImageLayers(vw);
    else { if (!cache) buildCache(); drawPlaceholderBack(vw); }
    worldTransform(0, 0);
    st.items.length = 0;
  };
  st.add = item => { st.items.push(item); };
  st.flush = dt => {
    worldTransform(0, 0);
    st.items.sort((a, b) => a.z - b.z);
    for (const it of st.items) { g.save(); try { it.draw(g); } finally { g.restore(); } }
    // 파티클
    st.parts = st.parts.filter(p => (p.life -= dt) > 0);
    for (const p of st.parts) {
      p.vy += p.g * dt; p.x += p.vx * dt; p.y += p.vy * dt;
      const a = Math.min(1, p.life / (p.max * 0.5));
      g.globalAlpha = a; g.fillStyle = p.c;
      if (p.kind === "puff") { g.beginPath(); g.arc(p.x, p.y, p.r * (1.6 - a * 0.6), 0, Math.PI * 2); g.fill(); }
      else { star(g, p.x, p.y, p.r); }
    }
    g.globalAlpha = 1;
  };
  st.destroy = () => { if (ro) ro.disconnect(); else removeEventListener("resize", size); cv.remove(); };
  return st;
}

function star(g, x, y, r) {
  g.beginPath();
  for (let i = 0; i < 8; i++) { const a = i * Math.PI / 4, rr = i % 2 ? r * 0.4 : r; g.lineTo(x + Math.cos(a) * rr, y + Math.sin(a) * rr); }
  g.closePath(); g.fill();
}
