// 농구 겉모습(2.5D 무대): 운동장 그림판(field) + 코드로 그린 코트 바닥·골대(백보드·림·그물) + 아이 Actor(shoot 아틀라스) + 코드 공.
// 약속: createView({ root, kid, demo, juice, frame }) → { render(snap, dt), cue(ev), replay(clip, {speed,label}) → Promise, destroy() }
//   + shootTiming(u0) → { delay } (손을 떠날 때까지 초) · toScreen(x, y) → 화면 비율 좌표(점수 글자 자리)
// 공·소품은 코드가 그린다(물리 위치 그대로). 진짜 그림(art/<kid>/shoot.*)은 공이 손을 떠난 프레임부터 공을 지워 두었고,
// 손을 떠나기 전 프레임은 json 의 ball[i](프레임 픽셀) 자리에 코드 공을 덮어 그린다(불공·머니볼 무늬도 같은 자리).
import { createStage } from "../render/stage.js?v=1";
import { createActor, loadKidSprites, loadImage } from "../render/sprites.js?v=1";
import * as Ph from "../events/basketball-physics.js?v=1";

const ART = new URL("../../art/", import.meta.url).href;
const ACTS = { shoot: "shoot", idle: "shoot-idle", cheer: "shoot-cheer" };   // 동작 → 파일 이름(다른 종목 그림과 안 겹치게)
// 그림 판(version). 그림은 tools/sports-basketball 로 영상 클립(또는 그림 한 장 대신 그림)에서 만든다.
// 같은 이름으로 덮어쓰면 이 숫자 + sw.js 의 ?v= 만 올린다.
// (manifest.json 은 다른 종목과 같이 쓰는 파일이라 건드리지 않고 농구 그림은 여기서 직접 읽는다)
const ART_V = 2;
const TAU = Math.PI * 2;
const DX = 0.22, DY = -0.3;            // 깊이(화면 안쪽) 1 → 화면 x·y 이동(살짝 위에서 비스듬히 본 코트)
const MONEY = ["#ff3b4e", "#ffffff", "#2f6bff"];

async function loadAtlas(kidId, file) {
  try {
    const meta = await fetch(ART + `${kidId}/${file}.json?v=${ART_V}`).then(r => (r.ok ? r.json() : null));
    const img = meta && await loadImage(ART + `${kidId}/${file}.webp?v=${ART_V}`);
    return meta && img && Array.isArray(meta.frames) && meta.frames.length ? { ...meta, img } : null;
  } catch (_) { return null; }
}

export function createView({ root, kid, demo = false, safe = null }) {
  const st = createStage(root, { eventId: "basketball" });
  const KH = 340 * (kid.scale || 1);
  let actor = null, sprites = null;
  loadKidSprites(kid.id, ["idle", "cheer", "jump"]).then(async s => {
    for (const [k, f] of Object.entries(ACTS)) { const at = await loadAtlas(kid.id, f); if (at) s.atlases[k] = at; }
    sprites = s; actor = createActor(s);
  });
  let bg = null;
  loadImage(ART + "bg/field.webp?v=3").then(im => {
    if (!im) return;
    const avg = (y0, h, fb) => { try { const c = document.createElement("canvas"); c.width = c.height = 1; const x = c.getContext("2d"); x.drawImage(im, 0, im.height * y0, im.width, im.height * h, 0, 0, 1, 1); const d = x.getImageData(0, 0, 1, 1).data; return `rgb(${d[0]},${d[1]},${d[2]})`; } catch (_) { return fb; } };
    bg = { img: im, sky: avg(0, 0.03, "#2f7be8"), floor: avg(0.96, 0.04, "#b08458") };
  });

  const trails = new Map();             // 공 id → 지난 자리(잔상)
  let replaying = false, flashT = 0, magnetT = 0, zapT = 0, prevMagnet = 0;

  /* ---------- 좌표 도우미 ---------- */
  const P = (x, y, dep) => ({ x: x + dep * DX, y: y + dep * DY });   // 깊이 dep 의 바닥/공중 점

  /* ---------- 카메라: 아이·골대·백보드가 다 보이게(점수판 자리 비우기) ---------- */
  function frameCam(sn) {
    const W = st.W || 1, H = st.H || 1, tall = H > W * 1.15;
    // 안전 구역: 위는 점수판 띠 아래(되면 알림 띠 아래까지), 아래는 화면 끝. 백보드·기둥 보호대까지 다 보이게.
    const sa = safe ? safe() : null;
    const short = W > H && H < 500, g = sn.geo, left = sn.kidX - KH * (tall ? 0.42 : 0.62), right = g.boardX + (tall ? 178 : 210), top = g.boardTop - (short ? 24 : 60), bottom = short ? 60 : 120;
    const rw = right - left, rh = bottom - top;
    const botPx = sa ? Math.max(6, H - sa.bottom) : 6;
    let topPx = sa ? sa.top + 4 : Math.min(78, H * 0.13);
    if (sa && !short) { const sB = Math.min(W / rw, (H - sa.bannerBottom - botPx) / rh), sT = Math.min(W / rw, (H - topPx - botPx) / rh); if (sB >= sT * 0.88) topPx = sa.bannerBottom; }
    const s = Math.min(W / rw, (H - topPx - botPx) / rh);
    const slack = (H - topPx - botPx) - rh * s;
    const botY = H - botPx - Math.min(slack, H * 0.08);
    const cx = (left + right) / 2 + Math.max(0, (W / s - rw) * 0.06);
    st.lookAt(cx, bottom - (botY - H / 2) / s, (s * 1000) / H);
  }

  /* ---------- 배경: 운동장 그림판 + 하늘 이어 붙이기 ---------- */
  function drawBackdrop(g) {
    const v = st.view(), cx = st.cam.x, cy = st.cam.y, x0 = cx - v.w / 2 - 20, x1 = cx + v.w / 2 + 20, y0 = cy - v.h / 2 - 20, y1 = cy + v.h / 2 + 20;
    const sky = bg ? bg.sky : "#3f8ff0";
    if (!bg) { g.fillStyle = sky; g.fillRect(x0, y0, x1 - x0, y1 - y0); }
    if (bg) {
      const ground = -70, needW = (v.w + 2 * Math.abs(cx * 0.15)) * 1.04 + 40;
      const Hi = Math.max(760, (needW * bg.img.height) / bg.img.width), Wi = (Hi * bg.img.width) / bg.img.height;
      const left = cx * 0.85 - Wi / 2, top = ground - 0.93 * Hi;
      // 그림판 위(세로 화면에서 보이는 하늘): 위는 짙게, 그림판 위 끝은 그림 하늘색으로 이어 붙인다
      const gr = g.createLinearGradient(0, Math.min(y0, top - 400), 0, top + Hi * 0.22); gr.addColorStop(0, "#1a56c9"); gr.addColorStop(1, sky);
      g.fillStyle = gr; g.fillRect(x0, y0, x1 - x0, top + Hi * 0.22 - y0);
      g.drawImage(bg.img, left, top, Wi, Hi);
      const k = Hi * 0.2, fade = g.createLinearGradient(0, top - 2, 0, top + k);
      fade.addColorStop(0, sky); fade.addColorStop(0.35, sky.startsWith("rgb(") ? sky.replace("rgb(", "rgba(").replace(")", ",.75)") : sky); fade.addColorStop(1, "rgba(0,0,0,0)");
      g.fillStyle = fade; g.fillRect(x0, top - 2, x1 - x0, k + 2);
      g.fillStyle = bg.floor; g.fillRect(x0, top + Hi - 1, x1 - x0, Math.max(0, y1 - top - Hi + 1));
    }
    return { x0, x1, y1 };
  }

  /* ---------- 코트 바닥(코드): 나무 바닥 + 페인트존 + 3점 선 + 서는 자리 ---------- */
  function drawCourt(g, sn, ext) {
    const far = -80, x0 = ext.x0, x1 = ext.x1, y1 = Math.max(ext.y1, 200);
    // 코트 뒤 끝 그늘(코트가 흙 위에 놓여 보이게)
    const edge = g.createLinearGradient(0, far - 34, 0, far); edge.addColorStop(0, "rgba(60,35,15,0)"); edge.addColorStop(1, "rgba(60,35,15,.35)");
    g.fillStyle = edge; g.fillRect(x0, far - 34, x1 - x0, 34);
    const wood = g.createLinearGradient(0, far, 0, y1); wood.addColorStop(0, "#cf9558"); wood.addColorStop(0.25, "#e4b072"); wood.addColorStop(1, "#c48549");
    g.fillStyle = wood; g.fillRect(x0, far, x1 - x0, y1 - far);
    g.save(); g.globalAlpha = 0.55; g.fillStyle = planks(g); g.fillRect(x0, far, x1 - x0, y1 - far); g.restore();     // 마루 판·나뭇결
    g.fillStyle = "rgba(255,255,255,.7)"; g.fillRect(x0, far - 6, x1 - x0, 7);          // 코트 끝 흰 선
    g.fillStyle = "rgba(60,30,10,.35)"; g.fillRect(x0, far + 1, x1 - x0, 3);
    g.strokeStyle = "rgba(110,60,20,.14)"; g.lineWidth = 2;                                   // 마루 판 줄(원근)
    for (let y = far + 14, k = 0; y < y1; k++, y += 9 + k * 1.6) { g.beginPath(); g.moveTo(x0, y); g.lineTo(x1, y); g.stroke(); }
    // 운동장 햇빛 색에 맞춰 살짝(위는 밝게, 아래 가장자리는 어둡게)
    const amb = g.createLinearGradient(0, far, 0, y1); amb.addColorStop(0, "rgba(255,250,230,.18)"); amb.addColorStop(0.6, "rgba(255,250,230,0)"); amb.addColorStop(1, "rgba(50,25,5,.18)");
    g.fillStyle = amb; g.fillRect(x0, far, x1 - x0, y1 - far);
    // 광택(골대 쪽 조명)
    const sh = g.createRadialGradient(sn.geo.rimX, 10, 10, sn.geo.rimX, 10, 700); sh.addColorStop(0, "rgba(255,250,230,.35)"); sh.addColorStop(1, "rgba(255,250,230,0)");
    g.fillStyle = sh; g.fillRect(x0, far, x1 - x0, y1 - far);
    const geo = sn.geo, D = 150, ftX = -300;
    // 페인트존(청군 파랑)
    const k1 = P(ftX, 0, -D), k2 = P(geo.boardX, 0, -D), k3 = P(geo.boardX, 0, D), k4 = P(ftX, 0, D);
    const pz = g.createLinearGradient(k1.x, 0, k2.x, 0); pz.addColorStop(0, "rgba(47,107,255,.26)"); pz.addColorStop(1, "rgba(47,107,255,.4)");
    g.fillStyle = pz; g.beginPath(); g.moveTo(k1.x, k1.y); g.lineTo(k2.x, k2.y); g.lineTo(k3.x, k3.y); g.lineTo(k4.x, k4.y); g.closePath(); g.fill();
    g.strokeStyle = "rgba(255,255,255,.9)"; g.lineWidth = 5; g.stroke();
    g.beginPath(); for (let i = 0; i <= 24; i++) { const a = (i / 24) * Math.PI - Math.PI / 2, p = P(ftX - 95 * Math.cos(a), 0, 95 * Math.sin(a) * 1.2); i ? g.lineTo(p.x, p.y) : g.moveTo(p.x, p.y); } g.stroke();
    // 3점 선(림 가운데에서 같은 거리)
    const R3 = sn.three - 30;
    g.lineWidth = 6; g.strokeStyle = "rgba(255,255,255,.92)"; g.beginPath();
    for (let i = 0; i <= 30; i++) { const a = -1.05 + (i / 30) * 2.1, p = P(-R3 * Math.cos(a), 0, R3 * Math.sin(a) * 0.55); i ? g.lineTo(p.x, p.y) : g.moveTo(p.x, p.y); }
    g.stroke();
    // 지금 서는 자리 ★
    const sp = sn.kidX, pulse = 1 + Math.sin(st.t * 5) * 0.06;
    g.fillStyle = sn.three3 ? "rgba(255,210,63,.95)" : "rgba(255,255,255,.85)";
    g.beginPath(); g.ellipse(sp, 4, 70 * pulse, 18 * pulse, 0, 0, TAU); g.fill();
    g.fillStyle = "rgba(120,60,0,.35)"; g.beginPath(); g.ellipse(sp, 4, 52, 12, 0, 0, TAU); g.fill();
  }

  // 마루 판 무늬(한 번 만들어 반복)
  let plankPat = null;
  function planks(g) {
    if (plankPat) return plankPat;
    const c = document.createElement("canvas"); c.width = 320; c.height = 96; const x = c.getContext("2d");
    let sd = 3; const rnd = () => (sd = (sd * 16807) % 2147483647) / 2147483647;
    for (let row = 0; row < 4; row++) {
      let px = -rnd() * 120;
      while (px < 320) {
        const w = 90 + rnd() * 110, l = 0.85 + rnd() * 0.3;
        x.fillStyle = `rgb(${Math.round(222 * l)},${Math.round(170 * l)},${Math.round(110 * l)})`; x.fillRect(px, row * 24, w, 24);
        x.strokeStyle = "rgba(90,45,10,.22)"; x.lineWidth = 1; x.strokeRect(px + 0.5, row * 24 + 0.5, w, 23);
        for (let k = 0; k < 4; k++) { x.strokeStyle = `rgba(120,65,20,${0.06 + rnd() * 0.08})`; x.beginPath(); const yy = row * 24 + 4 + rnd() * 16; x.moveTo(px, yy); x.bezierCurveTo(px + w * 0.3, yy + rnd() * 4 - 2, px + w * 0.7, yy + rnd() * 4 - 2, px + w, yy); x.stroke(); }
        px += w;
      }
    }
    plankPat = g.createPattern(c, "repeat"); return plankPat;
  }

  /* ---------- 골대 ---------- */
  function rimRing(geo, from, to, n = 18) {
    const pts = [];
    for (let i = 0; i <= n; i++) { const a = from + ((to - from) * i) / n; pts.push(P(Math.cos(a) * Ph.RIM_R, geo.rimY, Math.sin(a) * Ph.RIM_R)); }
    return pts;
  }
  function polyline(g, pts) { g.beginPath(); pts.forEach((p, i) => (i ? g.lineTo(p.x, p.y) : g.moveTo(p.x, p.y))); }
  function drawStand(g, geo, glow) {
    const px = geo.boardX + 150, armY = geo.rimY - 70;
    // 바닥 받침 그늘(진한 가운데 + 넓게 번짐) + 백보드가 바닥에 드리운 그림자
    { const ao = g.createRadialGradient(px, 6, 4, px, 6, 170); ao.addColorStop(0, "rgba(30,20,10,.45)"); ao.addColorStop(1, "rgba(30,20,10,0)"); g.fillStyle = ao; g.beginPath(); g.ellipse(px, 6, 170, 36, 0, 0, TAU); g.fill(); }
    { const bs = g.createRadialGradient(geo.boardX - 40, 18, 4, geo.boardX - 40, 18, 160); bs.addColorStop(0, "rgba(30,20,10,.22)"); bs.addColorStop(1, "rgba(30,20,10,0)"); g.fillStyle = bs; g.beginPath(); g.ellipse(geo.boardX - 40, 18, 160, 26, 0, 0, TAU); g.fill(); }
    // 기둥
    const pg = g.createLinearGradient(px - 16, 0, px + 16, 0); pg.addColorStop(0, "#1b2340"); pg.addColorStop(0.45, "#55638f"); pg.addColorStop(1, "#151b33");
    g.fillStyle = pg; g.beginPath(); g.roundRect(px - 16, armY - 10, 32, -armY + 10, 8); g.fill();
    g.fillStyle = "rgba(255,255,255,.18)"; g.fillRect(px - 9, armY, 4, -armY - 10);
    // 팔(백보드까지) + 비스듬한 버팀
    g.fillStyle = "#2a3558"; g.beginPath(); g.roundRect(geo.boardX + 4, armY - 9, px - geo.boardX, 18, 6); g.fill();
    g.strokeStyle = "#2a3558"; g.lineWidth = 10; g.beginPath(); g.moveTo(px, armY + 90); g.lineTo(geo.boardX + 30, armY + 12); g.stroke();
    // 푹신한 보호대(청군 파랑)
    const pad = g.createLinearGradient(px - 40, 0, px + 40, 0); pad.addColorStop(0, "#1f4fd1"); pad.addColorStop(0.4, "#4f86ff"); pad.addColorStop(1, "#1a3fa8");
    g.fillStyle = pad; g.beginPath(); g.roundRect(px - 40, -190, 80, 190, 18); g.fill();
    g.fillStyle = "rgba(255,255,255,.85)"; g.fillRect(px - 40, -120, 80, 10);
    // 백보드(유리, 비스듬히)
    const Dd = 190, a = P(geo.boardX, geo.boardTop, -Dd), b = P(geo.boardX, geo.boardTop, Dd), c = P(geo.boardX, geo.boardBot, Dd), d = P(geo.boardX, geo.boardBot, -Dd);
    g.fillStyle = "rgba(20,30,60,.25)"; g.beginPath(); g.moveTo(a.x + 10, a.y + 12); g.lineTo(b.x + 10, b.y + 12); g.lineTo(c.x + 10, c.y + 12); g.lineTo(d.x + 10, d.y + 12); g.closePath(); g.fill();
    const glass = g.createLinearGradient(a.x, a.y, c.x, c.y); glass.addColorStop(0, "rgba(255,255,255,.95)"); glass.addColorStop(0.5, "rgba(225,240,255,.88)"); glass.addColorStop(1, "rgba(200,225,255,.9)");
    g.fillStyle = glass; g.beginPath(); g.moveTo(a.x, a.y); g.lineTo(b.x, b.y); g.lineTo(c.x, c.y); g.lineTo(d.x, d.y); g.closePath(); g.fill();
    g.lineWidth = 9; g.strokeStyle = glow ? `hsl(${(st.t * 240) % 360},90%,60%)` : "#3a3f55"; g.stroke();
    // 유리 반사 줄
    g.save(); g.clip(); g.fillStyle = "rgba(255,255,255,.55)";
    for (const o of [-60, 30]) { g.beginPath(); g.moveTo(a.x + o, a.y - 20); g.lineTo(a.x + o + 34, a.y - 20); g.lineTo(d.x + o + 160, d.y + 40); g.lineTo(d.x + o + 126, d.y + 40); g.closePath(); g.fill(); }
    g.restore();
    // 과녁 네모(빨강)
    const sq = (dep, y) => P(geo.boardX, y, dep), q1 = sq(-62, geo.rimY - 118), q2 = sq(62, geo.rimY - 118), q3 = sq(62, geo.rimY - 8), q4 = sq(-62, geo.rimY - 8);
    g.lineWidth = 7; g.strokeStyle = "#ff4d2e"; g.beginPath(); g.moveTo(q1.x, q1.y); g.lineTo(q2.x, q2.y); g.lineTo(q3.x, q3.y); g.lineTo(q4.x, q4.y); g.closePath(); g.stroke();
    // 림을 백보드에 다는 쇠
    g.fillStyle = "#c2410c"; g.beginPath(); g.roundRect(Ph.RIM_R - 4, geo.rimY - 6, geo.boardX - Ph.RIM_R + 8, 12, 4); g.fill();
  }
  function drawRim(g, geo, front, glow) {
    const pts = front ? rimRing(geo, Math.PI, TAU) : rimRing(geo, 0, Math.PI);
    g.lineCap = "round"; g.lineJoin = "round";
    if (glow) { g.strokeStyle = `hsla(${(st.t * 300) % 360},95%,65%,.55)`; g.lineWidth = 26; polyline(g, pts); g.stroke(); }
    g.strokeStyle = "#7a2400"; g.lineWidth = 15; polyline(g, pts); g.stroke();
    g.strokeStyle = front ? "#ff6a1a" : "#e0520f"; g.lineWidth = 10; polyline(g, pts); g.stroke();
    if (front) { g.strokeStyle = "rgba(255,230,190,.85)"; g.lineWidth = 3; polyline(g, pts.map(p => ({ x: p.x, y: p.y - 3 }))); g.stroke(); }
  }
  // 그물: 림(위 고리) → 가운데 → 아래 고리, 다이아몬드 무늬. ripple = 공이 지나간 뒤 출렁임(0~1), sway = 옆으로
  function netRings(geo, sn) {
    const t = sn.netT, pow = sn.netPow || 0;
    const e = t >= 0 && t < 1.6 ? Math.exp(-t * 3.2) * pow : 0;
    const stretch = e * Math.sin(t * 18 + 0.6) * 0.9 + e * 0.5;
    const len = Ph.NET_LEN * (1 + stretch * 0.32), sway = e * Math.sin(t * 13) * 12;
    const rings = [], N = 12;
    for (let r = 0; r <= 3; r++) {
      const u = r / 3, rad = Ph.RIM_R * (1 - u * 0.42 * (1 - stretch * 0.25)), y = geo.rimY + len * u, ring = [];
      for (let i = 0; i < N; i++) { const a = (i + (r % 2) * 0.5) / N * TAU; ring.push({ a, ...P(Math.cos(a) * rad + sway * u, y, Math.sin(a) * rad) }); }
      rings.push(ring);
    }
    return rings;
  }
  function drawNet(g, geo, sn, front) {
    const rings = netRings(geo, sn), N = rings[0].length;
    g.strokeStyle = front ? "rgba(255,255,255,.95)" : "rgba(225,232,245,.75)"; g.lineWidth = front ? 3.2 : 2.6; g.lineCap = "round";
    const isFront = a => Math.sin(a) < 0.05;
    for (let r = 0; r < rings.length - 1; r++) {
      const A = rings[r], B = rings[r + 1];
      for (let i = 0; i < N; i++) {
        const b1 = B[(r % 2) ? (i + 1) % N : i], b0 = B[(r % 2) ? i : (i - 1 + N) % N];
        for (const b of [b0, b1]) {
          if (isFront(A[i].a) !== front) continue;
          g.beginPath(); g.moveTo(A[i].x, A[i].y); g.lineTo(b.x, b.y); g.stroke();
        }
      }
    }
    // 아래 고리
    const last = rings[rings.length - 1];
    g.beginPath(); last.forEach((p, i) => { if (isFront(p.a) === front) { g.moveTo(p.x, p.y); const q = last[(i + 1) % N]; g.lineTo(q.x, q.y); } }); g.stroke();
  }

  /* ---------- 공 ---------- */
  function drawBall(g, x, y, r, rot, o = {}) {
    g.save(); g.translate(x, y);
    if (o.alpha != null) g.globalAlpha *= o.alpha;
    if (o.fire) {   // 불꽃 테
      const fg = g.createRadialGradient(0, 0, r * 0.6, 0, 0, r * 2.1); fg.addColorStop(0, "rgba(255,240,120,.85)"); fg.addColorStop(0.5, "rgba(255,120,20,.45)"); fg.addColorStop(1, "rgba(255,60,0,0)");
      g.fillStyle = fg; g.beginPath(); g.arc(0, 0, r * 2.1, 0, TAU); g.fill();
    }
    if (o.magnet) {
      g.strokeStyle = `hsla(${(st.t * 400) % 360},95%,65%,.8)`; g.lineWidth = 6; g.beginPath(); g.arc(0, 0, r + 9 + Math.sin(st.t * 20) * 2, 0, TAU); g.stroke();
    }
    g.rotate(rot);
    if (o.money) {
      for (let i = 0; i < 6; i++) { g.fillStyle = MONEY[i % 3]; g.beginPath(); g.moveTo(0, 0); g.arc(0, 0, r, (i / 6) * TAU, ((i + 1) / 6) * TAU); g.closePath(); g.fill(); }
    } else {
      const bg2 = g.createRadialGradient(-r * 0.35, -r * 0.4, r * 0.1, 0, 0, r);
      if (o.fire) { bg2.addColorStop(0, "#fff3a0"); bg2.addColorStop(0.45, "#ff9a1f"); bg2.addColorStop(1, "#d23a00"); }
      else { bg2.addColorStop(0, "#ffb062"); bg2.addColorStop(0.55, "#f2781c"); bg2.addColorStop(1, "#b9470a"); }
      g.fillStyle = bg2; g.beginPath(); g.arc(0, 0, r, 0, TAU); g.fill();
    }
    g.strokeStyle = o.money ? "rgba(20,20,40,.75)" : "rgba(40,15,0,.85)"; g.lineWidth = Math.max(2, r * 0.09);
    g.beginPath(); g.moveTo(0, -r); g.lineTo(0, r); g.stroke();
    g.beginPath(); g.moveTo(-r, 0); g.lineTo(r, 0); g.stroke();
    g.beginPath(); g.ellipse(-r * 0.95, 0, r * 0.55, r * 0.92, 0, -1.2, 1.2); g.stroke();
    g.beginPath(); g.ellipse(r * 0.95, 0, r * 0.55, r * 0.92, 0, Math.PI - 1.2, Math.PI + 1.2); g.stroke();
    g.rotate(-rot);
    g.fillStyle = "rgba(255,255,255,.45)"; g.beginPath(); g.ellipse(-r * 0.35, -r * 0.45, r * 0.32, r * 0.2, -0.6, 0, TAU); g.fill();
    g.strokeStyle = "rgba(60,20,0,.35)"; g.lineWidth = 2; g.beginPath(); g.arc(0, 0, r, 0, TAU); g.stroke();
    g.restore();
  }
  function ballShadow(g, x, y, r) {
    const h = Math.max(0, -y), s = Math.max(0.25, 1 - h / 900);
    g.fillStyle = `rgba(40,20,0,${0.28 * s})`; g.beginPath(); g.ellipse(x, 2, r * 1.3 * s, r * 0.35 * s, 0, 0, TAU); g.fill();
  }

  /* ---------- 아이 프레임 고르기 ---------- */
  function shootInfo() {
    const at = actor && actor.atlas("shoot");
    if (!at) return null;
    const ev = at.events || {};
    return { at, n: at.frames.length, crouch: ev.crouch != null ? ev.crouch : Math.round(at.frames.length * 0.3), release: ev.release != null ? ev.release : Math.round(at.frames.length * 0.5), land: ev.land != null ? ev.land : at.frames.length - 1, fps: at.fps || 30 };
  }
  // 진짜 그림 던지기 빠르기: 손가락을 놓은 뒤 공이 떠날 때까지는 빠르게(PRE), 그 뒤 착지까지는 조금 느리게(POST)
  const PRE = 2.2, POST = 1.6;
  function shootFrame(si, pose) {
    const f0 = Math.round(si.crouch * Math.min(1, pose.u0 || 0)), pre = (si.release - f0) / (si.fps * PRE);
    if (pose.t < pre) return Math.min(si.release, f0 + Math.floor(pose.t * si.fps * PRE));
    return Math.min(si.n - 1, si.release + Math.floor((pose.t - pre) * si.fps * POST));
  }
  // 되풀이 동작의 프레임: json "pingpong" 이면 앞→뒤→앞(같은 프레임을 두 번 넣지 않아 그림이 가볍다)
  function loopIdx(at, t) {
    const n = at.frames.length, f = Math.floor(t * (at.fps || 24));
    if (!at.pingpong || n < 3) return f % n;
    const p = f % (2 * n - 2); return p < n ? p : 2 * n - 2 - p;
  }
  // 손에 든 공 자리(world). 아틀라스 json 의 ball[i] = [x, y](프레임 픽셀) 또는 null
  function heldBallPos(at, idx, x, h) {
    const b = at && at.ball && at.ball[idx];
    if (!b) return null;
    const H = at.height || Math.max(...at.frames.map(f => f.h)), sc = h / H, ax = at.anchor ? at.anchor.x : at.frames[idx].w / 2, ay = at.anchor ? at.anchor.y : at.frames[idx].h;
    return { x: x + (b[0] - ax) * sc, y: (b[1] - ay) * sc, r: at.ballR ? at.ballR * sc : Ph.BALL_R };
  }

  /* ---------- 한 장면 ---------- */
  function scene(sn, dt) {
    flashT = Math.max(0, flashT - dt); magnetT = Math.max(0, magnetT - dt); zapT = Math.max(0, zapT - dt);
    if (!replaying) frameCam(sn);
    st.begin(dt);
    const geo = sn.geo;
    let ext = null;
    st.add({ z: -1000, draw: g => { ext = drawBackdrop(g); } });
    st.add({ z: -900, draw: g => drawCourt(g, sn, ext || { x0: -3000, x1: 3000, y1: 600 }) });
    const glow = sn.magnet > 0;
    if (glow && sn.magnet !== prevMagnet && sn.magnet > prevMagnet) magnetT = 1.2;
    prevMagnet = sn.magnet;
    st.add({ z: -60, draw: g => {
      drawStand(g, geo, glow);
      if (glow) {      // 자석 골대: 림 둘레로 빨려 드는 빛 고리
        for (let i = 0; i < 4; i++) {
          const k = ((st.t * 0.9 + i / 4) % 1), r = 260 * (1 - k) + 70;
          g.strokeStyle = `hsla(${(i * 90 + st.t * 200) % 360},95%,65%,${0.5 * k})`; g.lineWidth = 8;
          g.beginPath(); g.ellipse(geo.rimX, geo.rimY, r, r * 0.42, 0, 0, TAU); g.stroke();
        }
      }
      drawNet(g, geo, sn, false); drawRim(g, geo, false, glow);
    } });
    // 랙(공 받침) — 아이 뒤
    st.add({ z: -5, draw: g => drawRack(g, sn) });
    // 아이
    const kx = sn.kidX;
    let held = null;
    if (actor) {
      const si = shootInfo(), pose = sn.pose || { name: "idle", t: 0 };
      let sq = { x: 1, y: 1 }, lift = 0, tilt = 0, idx = -1, act = "idle";
      if (si) {
        if (pose.name === "aim") { act = "shoot"; idx = Math.round(si.crouch * Math.min(1, pose.u)); }
        else if (pose.name === "shoot") { act = "shoot"; idx = shootFrame(si, pose); }
        else if (pose.name === "cheer") {
          const c = actor.atlas("cheer");
          if (c) { act = "cheer"; idx = loopIdx(c, pose.t); } else { act = "shoot"; idx = si.land; }
        } else {
          const c = actor.atlas("idle");
          if (c) { act = "idle"; idx = loopIdx(c, st.t); } else { act = "shoot"; idx = 0; }
        }
        actor.scrubFrame(act, idx);
      } else {   // 그림 없음: 자리표시 + 코드 몸짓
        if (pose.name === "aim") { sq = { x: 1 + pose.u * 0.08, y: 1 - pose.u * 0.1 }; actor.play("idle"); }
        else if (pose.name === "shoot") { const k = Math.min(1, pose.t / 0.35); lift = Math.sin(k * Math.PI) * KH * 0.18; sq = { x: 0.94, y: 1.08 }; actor.play("cheer"); }
        else if (pose.name === "cheer") actor.play("cheer"); else actor.play("idle");
      }
      if (pose.name === "walk") lift = Math.abs(Math.sin(pose.t * 14)) * 10;
      if (pose.name === "sad") { sq = { x: 1.03, y: 0.95 }; tilt = -0.05; }
      actor.update(dt);
      st.add({ z: 0, draw: g => actor.draw(g, kx, -lift, KH, { squash: sq, tilt, ground: 0 }) });
      // 손에 든 공(진짜 그림이면 그 프레임의 공 자리)
      if (sn.held) {
        const hp = si && idx >= 0 ? heldBallPos(actor.atlas(act), idx, kx, KH) : null;
        held = hp ? { ...hp, y: hp.y - lift } : { x: kx + KH * 0.17, y: -KH * (pose.name === "aim" ? 0.95 - pose.u * 0.08 : 1.0) - lift, r: Ph.BALL_R };
      }
    } else if (sn.held) held = { x: kx + KH * 0.17, y: -KH, r: Ph.BALL_R };
    if (held) {
      const hb = sn.held;
      st.add({ z: 6, draw: g => {
        drawBall(g, held.x, held.y, held.r || Ph.BALL_R, sn.t * 0.6, { fire: hb.fire, money: hb.money, magnet: hb.magnet });
        if (hb.money && !sn.aim) { g.font = "900 34px Pretendard Variable, Pretendard, system-ui, sans-serif"; g.textAlign = "center"; g.lineWidth = 7; g.strokeStyle = "#7a0010"; g.fillStyle = "#ffe14a"; g.strokeText("머니볼 ×2", held.x, held.y - 62); g.fillText("머니볼 ×2", held.x, held.y - 62); }
      } });
      if (hb.fire && Math.random() < 0.8) flame(held.x, held.y);
      if (hb.magnet && Math.random() < 0.5) st.sparkle(held.x + (Math.random() - 0.5) * 50, held.y + (Math.random() - 0.5) * 50);
    }
    // 조준: 안내 점선 + 힘 고리 + 새총 줄
    if (sn.aim) {
      const a = sn.aim;
      st.add({ z: 30, draw: g => {
        const pts = a.pts || [];
        for (let i = 0; i < pts.length; i++) {
          const k = i / Math.max(1, pts.length - 1), r = 9 - k * 3;
          g.globalAlpha = 0.95 - k * 0.45;
          g.fillStyle = a.gold ? "#ffd23f" : "#ffffff"; g.strokeStyle = a.gold ? "#8a4b00" : "rgba(20,40,90,.65)"; g.lineWidth = 3;
          g.beginPath(); g.arc(pts[i].x, pts[i].y, r, 0, TAU); g.fill(); g.stroke();
        }
        g.globalAlpha = 1;
        if (held) {   // 힘 고리
          const u = a.u, r = 64;
          g.lineWidth = 12; g.strokeStyle = "rgba(0,0,0,.25)"; g.beginPath(); g.arc(held.x, held.y, r, -Math.PI * 0.5, Math.PI * 1.5); g.stroke();
          g.strokeStyle = `hsl(${130 - u * 130},95%,55%)`; g.beginPath(); g.arc(held.x, held.y, r, -Math.PI * 0.5, -Math.PI * 0.5 + u * TAU); g.stroke();
        }
        if (a.gold) {   // 들어갈 길: 림이 반짝
          g.strokeStyle = `rgba(255,230,80,${0.6 + Math.sin(st.t * 16) * 0.3})`; g.lineWidth = 10;
          g.beginPath(); g.ellipse(geo.rimX, geo.rimY, Ph.RIM_R + 26, 30, 0, 0, TAU); g.stroke();
        }
      } });
    }
    // 알려 주기(첫 공): 손가락이 공에서 뒤로 당겼다 놓는 시늉
    if (sn.tutorial && held && !sn.aim) {
      st.add({ z: 40, draw: g => {
        const k = (st.t % 1.6) / 1.6, pull = k < 0.6 ? k / 0.6 : 1 - (k - 0.6) / 0.15, pp = Math.max(0, Math.min(1, pull));
        const fx = held.x - 40 - pp * 150, fy = held.y + 30 + pp * 120;
        if (k < 0.75) { g.setLineDash([10, 12]); g.strokeStyle = "rgba(255,255,255,.85)"; g.lineWidth = 5; g.beginPath(); g.moveTo(held.x, held.y); g.lineTo(fx, fy); g.stroke(); g.setLineDash([]); }
        // 잡는 곳: 공 둘레가 두근두근
        g.strokeStyle = `rgba(255,236,120,${0.55 + Math.sin(st.t * 8) * 0.3})`; g.lineWidth = 8; g.beginPath(); g.arc(held.x, held.y, (held.r || 30) + 16 + Math.sin(st.t * 8) * 5, 0, TAU); g.stroke();
        g.font = "112px system-ui, sans-serif"; g.textAlign = "center"; g.textBaseline = "middle";
        g.save(); g.shadowColor = "rgba(0,0,0,.35)"; g.shadowBlur = 10; g.fillText("👆", fx, fy + 40); g.restore();
        // 놓으면 공이 날아갈 길(골대 쪽 화살표)
        if (k >= 0.6) {
          const q = Math.min(1, (k - 0.6) / 0.3), ex = held.x + (geo.rimX - held.x) * 0.55 * q, ey = held.y - 220 * Math.sin(q * Math.PI * 0.5);
          g.strokeStyle = "rgba(255,225,74,.95)"; g.lineWidth = 10; g.lineCap = "round"; g.setLineDash([16, 12]);
          g.beginPath(); g.moveTo(held.x, held.y); g.quadraticCurveTo(held.x + (ex - held.x) * 0.3, ey - 60, ex, ey); g.stroke(); g.setLineDash([]);
          const a = Math.atan2(ey - (ey - 60), ex - (held.x + (ex - held.x) * 0.3));
          g.fillStyle = "rgba(255,225,74,.95)"; g.beginPath(); g.moveTo(ex + Math.cos(a) * 26, ey + Math.sin(a) * 26); g.lineTo(ex + Math.cos(a + 2.5) * 22, ey + Math.sin(a + 2.5) * 22); g.lineTo(ex + Math.cos(a - 2.5) * 22, ey + Math.sin(a - 2.5) * 22); g.closePath(); g.fill();
        }
        bubble(g, held.x + 40, held.y - 150, k < 0.6 ? "공을 잡고 뒤로 쭉 당겨요" : "놓으면 슛!");
      } });
    }
    // 날아가는 공들(잔상 + 불꽃 + 반짝)
    for (const b of sn.balls) {
      let tr = trails.get(b.id); if (!tr) { tr = []; trails.set(b.id, tr); }
      tr.unshift({ x: b.x, y: b.y }); if (tr.length > 5) tr.length = 5;
      if (b.fire) flame(b.x, b.y);
      if (b.magnet && !b.made) { st.sparkle(b.x + (Math.random() - 0.5) * 30, b.y + (Math.random() - 0.5) * 30); st.sparkle(b.x, b.y); }
      if (b.money && Math.random() < 0.5) st.sparkle(b.x, b.y, MONEY[(Math.random() * 3) | 0]);
      const inNet = b.made && b.y > geo.rimY - Ph.BALL_R && b.y < geo.rimY + Ph.NET_LEN + 10;
      const sat = actor && actor.atlas("shoot"), hr = sat && sat.ballR ? (sat.ballR * KH) / (sat.height || 400) : Ph.BALL_R;
      const br = Ph.BALL_R + (hr - Ph.BALL_R) * Math.max(0, 1 - (b.age || 0) / 0.3);   // 손에 든 그림 공 크기 → 물리 공 크기로 부드럽게
      st.add({ z: inNet ? 15 : 12, draw: g => {
        ballShadow(g, b.x, b.y, br);
        for (let i = tr.length - 1; i >= 1; i--) drawBall(g, tr[i].x, tr[i].y, br * (1 - i * 0.06), b.rot, { alpha: 0.16, fire: b.fire, money: b.money });
        drawBall(g, b.x, b.y, br, b.rot, { fire: b.fire, money: b.money, magnet: b.magnet && !b.made });
      } });
    }
    for (const id of [...trails.keys()]) if (!sn.balls.some(b => b.id === id)) trails.delete(id);
    st.add({ z: 20, draw: g => { drawNet(g, geo, sn, true); drawRim(g, geo, true, glow); } });
    // 자석 남은 개수 · 불타는 손 · 제한 시간
    st.add({ z: 45, draw: g => {
      if (sn.magnet > 0) tag(g, geo.rimX - 30, geo.boardTop - 30, `🧲 ×${sn.magnet}`, "#7b2cff", magnetT);
      if (sn.fire) { const v = st.view(); tag(g, Math.max(st.cam.x - v.w / 2 + 230, sn.kidX), -KH - 120, "🔥 불타는 손 ×1.5", "#d23a00", 0); }
    } });
    st.flush(dt);
    if (flashT > 0) { st.g.setTransform(st.dpr, 0, 0, st.dpr, 0, 0); st.g.fillStyle = `rgba(255,255,255,${flashT * 0.7})`; st.g.fillRect(0, 0, st.W, st.H); }
  }

  function flame(x, y) {
    for (let i = 0; i < 2; i++) { const k = Math.random(); st.parts.push({ x: x + (Math.random() - 0.5) * 24, y: y + (Math.random() - 0.5) * 24, vx: (Math.random() - 0.5) * 60, vy: -80 - Math.random() * 140, g: -220, life: 0.3, max: 0.3, r: 5 + Math.random() * 9, c: k < 0.25 ? "rgba(255,250,200,.8)" : k < 0.65 ? "rgba(255,190,40,.6)" : "rgba(255,80,10,.5)", kind: "puff" }); }
  }
  function drawRack(g, sn) {
    const x = sn.kidX - KH * 0.42, n = sn.rackBalls || 0, r = 22;
    // 받침대
    g.fillStyle = "rgba(30,20,10,.3)"; g.beginPath(); g.ellipse(x, 4, 70, 14, 0, 0, TAU); g.fill();
    g.strokeStyle = "#3b4566"; g.lineWidth = 8; g.lineCap = "round";
    g.beginPath(); g.moveTo(x - 52, 0); g.lineTo(x - 46, -78); g.moveTo(x + 52, 0); g.lineTo(x + 46, -78); g.moveTo(x - 50, -78); g.lineTo(x + 50, -78); g.moveTo(x - 50, -40); g.lineTo(x + 50, -40); g.stroke();
    for (let i = 0; i < n; i++) {
      const row = i < 2 ? 0 : 1, col = row ? i - 2 : i, bx = x - 22 + col * 44 + row * 0, by = row ? -40 - r - 2 : -78 - r - 2;
      const money = sn.rackMoney && i === n - 1;
      drawBall(g, bx, by + (row ? 40 : 0) * 0, r, i * 1.3, { money });
    }
  }
  function tag(g, x, y, text, color, pop) {
    const s = 1 + pop * 0.35;
    g.save(); g.translate(x, y); g.scale(s, s);
    g.font = "900 40px Pretendard Variable, Pretendard, system-ui, sans-serif"; g.textAlign = "center"; g.textBaseline = "middle";
    const w = g.measureText(text).width + 36;
    g.fillStyle = "rgba(255,255,255,.92)"; g.strokeStyle = color; g.lineWidth = 6;
    g.beginPath(); g.roundRect(-w / 2, -30, w, 60, 30); g.fill(); g.stroke();
    g.fillStyle = color; g.fillText(text, 0, 2);
    g.restore();
  }
  function bubble(g, x, y, text) {
    g.font = "900 40px Pretendard Variable, Pretendard, system-ui, sans-serif"; g.textAlign = "center"; g.textBaseline = "middle";
    const w = g.measureText(text).width + 50;
    g.fillStyle = "#ffe14a"; g.strokeStyle = "#a35b00"; g.lineWidth = 5;
    g.beginPath(); g.roundRect(x - w / 2, y - 34, w, 68, 34); g.fill(); g.stroke();
    g.fillStyle = "#5a2b00"; g.fillText(text, x, y + 2);
  }

  let lastKidX = 0, lastGeo = null;
  return {
    stage: st,
    actorRect() { return st.rectPx(lastKidX - KH * 0.28, -KH, lastKidX + KH * 0.28, 0); },
    // 백보드·기둥 상자(화면 px) — 검증용(잘리지 않는지)
    boardRect() { const g = lastGeo; if (!g) return null; return st.rectPx(g.boardX - 190 * DX - 10, g.boardTop - 190 * 0.3 - 10, g.boardX + 190 * DX + 10, g.boardBot + 190 * 0.3); },
    render(sn, dt) { lastKidX = sn.kidX; lastGeo = sn.geo; if (!replaying) scene(sn, dt); },
    toScreen: (x, y) => st.toScreen(x, y),
    // 손가락을 놓고 공이 손을 떠날 때까지(초): 진짜 그림이면 웅크린 프레임 → release 프레임
    shootTiming(u0) {
      const si = shootInfo();
      if (!si) return { delay: 0.12, total: 0.6 };
      const f0 = Math.round(si.crouch * Math.min(1, u0 || 0)), delay = Math.max(0.04, (si.release - f0) / (si.fps * PRE));
      return { delay, total: delay + (si.n - 1 - si.release) / (si.fps * POST) };
    },
    cue(ev) {
      switch (ev.type) {
        case "made": {
          const g = ev.geo, big = ev.money || ev.fire || ev.kind !== "rim";
          st.punch(big ? 0.08 : 0.04); if (ev.money) st.shake(0.5);
          st.burst(g.rimX, g.rimY + 30, { n: big ? 34 : 18, speed: big ? 700 : 420, colors: ev.money ? MONEY : ev.fire ? ["#fff3a0", "#ffb020", "#ff5a1a"] : ["#fff7a8", "#ffd23f", "#ffffff"] });
          if (ev.kind === "swish") st.burst(g.rimX, g.rimY + 70, { n: 16, speed: 300, angle: Math.PI / 2, spread: 0.8, colors: ["#ffffff", "#bfe6ff"] });
          if (ev.money) flashT = 0.35;
          break;
        }
        case "rim": st.shake(0.25); break;
        case "board": st.shake(0.2); break;
        case "magnet": magnetT = 1.4; flashT = 0.6; st.burst(0, -500, { n: 70, speed: 900, colors: ["#ff4d6d", "#ffd23f", "#3ec1ff", "#7cff6b", "#b98bff"] }); break;
        case "fire": st.punch(0.06); st.burst(ev.x || 0, ev.y || -300, { n: 40, speed: 600, colors: ["#fff3a0", "#ffb020", "#ff5a1a"] }); break;
        case "done": break;
      }
    },
    // 느린 다시 보기: 골대 쪽으로 가까이 + 0.4배속 + 위아래 검은 띠
    replay(clip, { speed = 0.4, label = "" } = {}) {
      return new Promise(resolve => {
        const tagEl = document.createElement("div"); tagEl.className = "replay-tag"; tagEl.innerHTML = `<b>다시 보기</b><span></span>`;
        tagEl.querySelector("span").textContent = label; root.appendChild(tagEl);
        const bars = document.createElement("div"); bars.className = "letterbox"; root.appendChild(bars);
        const len = clip.frames[clip.frames.length - 1].t;
        let u = 0, last = performance.now(), raf = 0, prevU = 0;
        const end = () => { cancelAnimationFrame(raf); replaying = false; tagEl.remove(); bars.remove(); root.removeEventListener("pointerdown", end); resolve(); };
        root.addEventListener("pointerdown", end);
        replaying = true;
        const tick = now => {
          const stepT = Math.min(0.05, (now - last) / 1000) * speed; last = now; u += stepT;
          if (u >= len) { end(); return; }
          let i = 0; while (i < clip.frames.length - 1 && clip.frames[i + 1].t <= u) i++;
          const f = clip.frames[i].s;
          const kidX = f.kidX, mid = (kidX + f.geo.boardX) / 2, k = Math.min(1, u / len);
          st.lookAt(mid + (f.geo.rimX - mid) * k * 0.6, f.geo.rimY * 0.55 - 60, Math.max(0.6, Math.min(1.6, (st.H / 1000) > 0 ? 1.05 * (1000 / Math.max(600, (f.geo.boardX + 260 - kidX + KH)) * (st.W / st.H)) : 1)));
          scene(f, Math.max(0.001, u - prevU)); prevU = u;
          raf = requestAnimationFrame(tick);
        };
        raf = requestAnimationFrame(tick);
      });
    },
    destroy() { st.destroy(); },
  };
}
