// 딥 다이브 — 꼬마 잠수정 자동 공격 생존 게임. 먹물에 물든 바다 친구를 씻어 주고, ? 진주 문제를 맞히면 장비를 골라 세진다.
// 규칙 표는 logic.js, 바다 속 한 걸음은 engine.js, 여기서는 그리기·입력·화면·저장.
// 그림은 art/ 의 그림 파일을 쓰고, 못 읽으면 캔버스 도형으로 대신 그린다. shadowBlur 는 쓰지 않는다(아이패드에서 가장 느리다).
import * as L from "./logic.js?v=3";
import * as E from "./engine.js?v=3";
import * as S from "./sfx.js?v=2";

const $ = id => document.getElementById(id);
const canvas = $("sea"), ctx = canvas.getContext("2d", { alpha: false });
const QS = new URLSearchParams(location.search), QA = QS.get("qa") === "1";
// 공통 문제 모듈이 없으면 문제 없이 2장 중 1장 고르기로 대신한다(검증: ?qa=1&noquiz=1)
const GameQuiz = QA && QS.get("noquiz") === "1" ? null : window.GameQuiz || null;
const rnd = (a, b) => a + Math.random() * (b - a);
const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
const TAU = Math.PI * 2;
const FONT = "'Pretendard Variable', system-ui, sans-serif";

/* ---------- 저장 ---------- */
let save = L.defaultSave();
try { save = L.normalizeSave(localStorage.getItem(L.SAVE_KEY)); } catch (_) {}
function writeSave() { try { localStorage.setItem(L.SAVE_KEY, JSON.stringify(save)); } catch (_) {} }
let pilot = 1;
try { const v = parseInt(localStorage.getItem(L.PILOT_KEY), 10); if (v >= 0 && v < L.PILOTS.length) pilot = v; } catch (_) {}
try { const k = GameQuiz && GameQuiz.currentKid(); const i = L.PILOTS.findIndex(p => p.kid === k); if (i >= 0) pilot = i; } catch (_) {}
let zoneId = save.zone || "coral";

/* ---------- 그림 ---------- */
const ART = {}, WHITE = {};
const ART_NAMES = ["sub0", "sub1", "sub2", "sub3", "inkfish", "crab", "jelly", "puffer", "eel", "boss", "fish_ok", "crab_ok", "jelly_ok", "puffer_ok", "eel_ok", "boss_ok",
  "pearl", "qpearl", "heart", "chest", "bubble", "shell", "star", "zapjelly", "coral", "seaweed", "rock", "wreck", "floor"];
const INKY = new Set(["inkfish", "crab", "jelly", "puffer", "eel", "boss"]);
function whiten(im) {
  const c = document.createElement("canvas"); c.width = im.width; c.height = im.height;
  const x = c.getContext("2d"); x.drawImage(im, 0, 0); x.globalCompositeOperation = "source-in"; x.fillStyle = "#fff"; x.fillRect(0, 0, c.width, c.height);
  return c;
}
for (const n of ART_NAMES) {
  const im = new Image();
  im.onload = () => { ART[n] = im; if (INKY.has(n)) WHITE[n] = whiten(im); if (n === "floor") floorPat = null; if (n === "zapjelly" || n === "bubble" || n === "shell" || n === "star") iconCache.clear(); };
  im.src = "art/" + n + ".webp?v=1";
}
// 가운데 (x, y), 너비 w 로(높이는 그림 비율대로) 그린다. 그림이 없으면 false.
function sprite(n, x, y, w, hit, rot, flip) {
  const im = ART[n]; if (!im) return false;
  const h = w * im.height / im.width, src = hit && WHITE[n] ? WHITE[n] : im;
  if (rot || flip) { ctx.save(); ctx.translate(x, y); if (rot) ctx.rotate(rot); if (flip) ctx.scale(-1, 1); ctx.drawImage(src, -w / 2, -h / 2, w, h); ctx.restore(); }
  else ctx.drawImage(src, x - w / 2, y - h / 2, w, h);
  return true;
}
// 한 번만 그려 두고 붙이는 그림(매 프레임 그라데이션을 만들지 않는다)
function canvasOf(w, h, draw) { const c = document.createElement("canvas"); c.width = w; c.height = h; draw(c.getContext("2d"), w, h); return c; }
function bubbleTex(rgb, rim = "rgba(255,255,255,.95)") {
  return canvasOf(64, 64, (x) => {
    const g = x.createRadialGradient(26, 24, 4, 32, 32, 30);
    g.addColorStop(0, "rgba(255,255,255,.95)"); g.addColorStop(0.35, "rgba(" + rgb + ",.55)"); g.addColorStop(0.85, "rgba(" + rgb + ",.75)"); g.addColorStop(1, "rgba(255,255,255,.95)");
    x.fillStyle = g; x.beginPath(); x.arc(32, 32, 29, 0, TAU); x.fill();
    x.strokeStyle = rim; x.lineWidth = 5; x.beginPath(); x.arc(32, 32, 28, 0, TAU); x.stroke();
    x.fillStyle = "#fff"; x.beginPath(); x.ellipse(22, 20, 7, 4, -0.6, 0, TAU); x.fill();
  });
}
// 물방울 탄: 단계마다 색이 다르고 테두리가 진하다(빛 방울은 금색 빛무리 — 서로 헷갈리지 않게)
const BUB = { 1: bubbleTex("150,235,255", "#ffffff"), 2: bubbleTex("90,190,255", "#d8f2ff"), 3: bubbleTex("40,220,200", "#d6fff6"), 4: bubbleTex("170,130,255", "#efe6ff") };
// 방울 단계 색(꼬리·섬광): 1 하늘 · 2 파랑 · 3 청록 · 4 보라 · 5 무지개
const BUB_COL = ["#9fefff", "#5cc0ff", "#3fe6c8", "#b48cff", "#ffd75a"];
const RAINBOW = ["255,122,156", "255,178,74", "255,228,92", "125,255,176", "111,211,255", "185,162,255"].map(c => bubbleTex(c, "#ffffff"));   // map 의 둘째 인자(번호)가 테두리 색으로 들어가 검게 그려지던 것 고침
const RAINBOW_COL = ["#ff7a9c", "#ffb24a", "#ffe45c", "#7dffb0", "#6fd3ff", "#b9a2ff"];
const glowTex = (rgb, size = 64) => canvasOf(size, size, (x, w) => {
  const g = x.createRadialGradient(w / 2, w / 2, 0, w / 2, w / 2, w / 2);
  g.addColorStop(0, "rgba(" + rgb + ",.9)"); g.addColorStop(0.4, "rgba(" + rgb + ",.45)"); g.addColorStop(1, "rgba(" + rgb + ",0)");
  x.fillStyle = g; x.fillRect(0, 0, w, w);
});
const GLOW_BUB = glowTex("170,240,255", 64);
const GLOW_PEARL = glowTex("255,214,80"), GLOW_Q = glowTex("255,230,120", 128), GLOW_SUB = glowTex("190,245,255", 128);
// 회오리 물살 한 덩이(초승달 물결 셋)
function swirlTex(c1, c2) {
  return canvasOf(64, 64, (x) => {
    x.lineCap = "round";
    for (let i = 0; i < 3; i++) { x.strokeStyle = i % 2 ? c2 : c1; x.lineWidth = 7 - i * 1.5; x.beginPath(); x.arc(32, 32, 24 - i * 7, i * 2.1, i * 2.1 + 3.6); x.stroke(); }
    x.fillStyle = "rgba(255,255,255,.9)"; x.beginPath(); x.arc(32, 32, 4, 0, TAU); x.fill();
  });
}
// 회오리: 단계마다 색이 바뀐다(1 하늘 · 2 파랑 · 3 진파랑 · 4 보라 · 5 금), 합체는 보라+분홍
const SWIRL = [swirlTex("#bff3ff", "#ffffff"), swirlTex("#7fd0ff", "#e6fbff"), swirlTex("#4f8dff", "#bff3ff"), swirlTex("#b48cff", "#ffffff"), swirlTex("#ffd75a", "#ffffff"), swirlTex("#c58cff", "#ff9ee0")];
// 소라·불가사리 뒤의 단계 색 빛무리
const LV_GLOW = L.LV_COLORS.map(c => { const n = parseInt(c.slice(1), 16); return glowTex(((n >> 16) & 255) + "," + ((n >> 8) & 255) + "," + (n & 255)); });
// 빛줄기(위에서 비스듬히 내려오는 반투명 띠)
const RAY = canvasOf(128, 8, (x, w, h) => {
  const g = x.createLinearGradient(0, 0, w, 0);
  g.addColorStop(0, "rgba(220,250,255,0)"); g.addColorStop(0.5, "rgba(220,250,255,1)"); g.addColorStop(1, "rgba(220,250,255,0)");
  x.fillStyle = g; x.fillRect(0, 0, w, h);
});
// 무지개 터보 테두리(한 번만 만들고 화면 크기로 늘여 붙인다)
const FEVER_EDGE = canvasOf(256, 160, (x, w, h) => {
  const cols = ["255,90,140", "255,170,60", "255,230,80", "110,255,160", "90,200,255", "190,140,255"];
  for (let i = 0; i < 4; i++) {
    const side = [[0, 0, w, 0, 0, 22], [0, h, w, h, 0, h - 22], [0, 0, 0, h, 22, 0], [w, 0, w, h, w - 22, 0]][i];
    const g = i < 2 ? x.createLinearGradient(0, side[1], 0, side[5]) : x.createLinearGradient(side[0], 0, side[4], 0);
    g.addColorStop(0, "rgba(" + cols[i] + ",.75)"); g.addColorStop(1, "rgba(" + cols[i] + ",0)");
    x.fillStyle = g; x.fillRect(i === 3 ? w - 22 : 0, i === 1 ? h - 22 : 0, i < 2 ? w : 22, i < 2 ? 22 : h);
  }
});
// 다중 처치 때 화면 가장자리 번쩍(흰·금, 한 번만 만든다)
const EDGE_FLASH = canvasOf(256, 160, (x, w, h) => {
  for (let i = 0; i < 4; i++) {
    const g = i < 2 ? x.createLinearGradient(0, i ? h : 0, 0, i ? h - 30 : 30) : x.createLinearGradient(i === 3 ? w : 0, 0, i === 3 ? w - 30 : 30, 0);
    g.addColorStop(0, "rgba(255,255,255,.9)"); g.addColorStop(1, "rgba(255,255,255,0)");
    x.fillStyle = g; x.fillRect(i === 3 ? w - 30 : 0, i === 1 ? h - 30 : 0, i < 2 ? w : 30, i < 2 ? 30 : h);
  }
});
// 고래 친구(도형으로 한 번만 그린다 — 오른쪽을 본다)
const WHALE = canvasOf(320, 170, (x) => {
  x.fillStyle = "#5fa8e8"; x.beginPath(); x.ellipse(170, 92, 128, 62, 0, 0, TAU); x.fill();
  x.beginPath(); x.moveTo(52, 92); x.quadraticCurveTo(10, 40, 6, 30); x.quadraticCurveTo(30, 80, 6, 150); x.quadraticCurveTo(20, 140, 52, 100); x.fill();
  x.fillStyle = "#cfe9ff"; x.beginPath(); x.ellipse(190, 122, 96, 30, 0, 0, Math.PI); x.fill();
  x.fillStyle = "#4c8fd0"; x.beginPath(); x.ellipse(170, 130, 40, 14, 0.5, 0, TAU); x.fill();
  x.fillStyle = "#fff"; x.beginPath(); x.arc(240, 76, 12, 0, TAU); x.fill();
  x.fillStyle = "#1c2350"; x.beginPath(); x.arc(243, 77, 6, 0, TAU); x.fill();
  x.strokeStyle = "#1c2350"; x.lineWidth = 4; x.lineCap = "round"; x.beginPath(); x.moveTo(250, 104); x.quadraticCurveTo(272, 116, 290, 100); x.stroke();
  x.fillStyle = "rgba(255,140,170,.6)"; x.beginPath(); x.arc(262, 98, 9, 0, TAU); x.fill();
  x.fillStyle = "rgba(255,255,255,.85)"; for (let i = 0; i < 3; i++) { x.beginPath(); x.arc(200 + i * 14, 20 - i * 6, 6 - i, 0, TAU); x.fill(); }
});
// 그림이 없을 때 쓰는 모래 바닥 무늬(한 번만 만든다)
const SAND = canvasOf(256, 256, (x, w, h) => {
  x.fillStyle = "#e9d6a8"; x.fillRect(0, 0, w, h);
  let s = 7; const r = () => (s = s * 16807 % 2147483647) / 2147483647;
  for (let i = 0; i < 220; i++) { x.fillStyle = r() < 0.5 ? "rgba(160,120,70,.16)" : "rgba(255,255,255,.22)"; x.beginPath(); x.arc(r() * w, r() * h, 1 + r() * 3, 0, TAU); x.fill(); }
  x.strokeStyle = "rgba(170,130,80,.18)"; x.lineWidth = 3;
  for (let i = 0; i < 5; i++) { const y = r() * h; x.beginPath(); x.moveTo(0, y); x.bezierCurveTo(w * 0.3, y - 14, w * 0.6, y + 14, w, y); x.stroke(); }
});

/* ---------- 소리: sfx.js(Web Audio 합성, 음성 합성 금지 — 아이패드 마이크가 죽는다) ---------- */
let soundOn = true;
try { soundOn = localStorage.getItem(L.SOUND_KEY) !== "0"; } catch (_) {}
S.setOn(soundOn);
const audio = () => S.unlock();
const sfx = S.sfx;

/* ---------- 효과 그림 fx_*.webp (4x2 = 8컷, 순검정 바탕 — 탑 게임과 같은 시트) ----------
   불러올 때 한 번만 검정 → 투명으로 바꾼 시트를 만들어 두고(alpha = max(r,g,b)), 그릴 때 보통 한 번 + lighter 로 약하게 한 번.
   매 프레임 getImageData·그라데이션·shadowBlur 없음. 동시에 FX_MAX 개까지. 시트가 없으면 아무것도 안 그린다(도형 효과는 그대로). */
const FX = {}, FX_NAMES = ["light", "ice", "wind", "bolt", "mega"], FX_MAX = 60;
function keyBlack(im) {
  try {
    const c = document.createElement("canvas"); c.width = im.width; c.height = im.height;
    const x = c.getContext("2d"); x.drawImage(im, 0, 0);
    const d = x.getImageData(0, 0, c.width, c.height), p = d.data;
    for (let i = 0; i < p.length; i += 4) {
      const a = Math.max(p[i], p[i + 1], p[i + 2]);
      if (a < 6) { p[i + 3] = 0; continue; }
      const k = 255 / a; p[i] = Math.min(255, p[i] * k); p[i + 1] = Math.min(255, p[i + 1] * k); p[i + 2] = Math.min(255, p[i + 2] * k); p[i + 3] = a;
    }
    x.putImageData(d, 0, 0);
    return c;
  } catch (_) { return null; }
}
FX_NAMES.forEach((n, i) => {
  const im = new Image();
  im.onload = () => setTimeout(() => { const c = keyBlack(im); if (c) FX[n] = { c, cell: c.width / 4 }; }, 40 + i * 30);   // 한꺼번에 몰리지 않게
  im.src = "art/fx_" + n + ".webp?v=1";
});
let fxList = [];
// 월드 좌표(논리 칸) 위의 효과. size 는 논리 칸, dur 초 동안 8컷.
function addFx(name, x, y, size, { dur = 0.4, rot = 0, alpha = 1, keep = false } = {}) {
  if (!FX[name]) return null;
  if (fxList.length >= FX_MAX) { const i = fxList.findIndex(f => !f.keep); fxList.splice(i >= 0 ? i : 0, 1); }   // 큰 충격파는 남기고 오래된 것부터
  const f = { name, x, y, size, t: 0, dur, rot, alpha, keep };
  fxList.push(f); return f;
}
function drawFxItem(f) {
  const Sh = FX[f.name]; if (!Sh) return;
  const fr = Math.min(7, Math.floor(f.t / f.dur * 8)), cell = Sh.cell, sx = (fr % 4) * cell, sy = Math.floor(fr / 4) * cell, h = f.size / 2;
  if (f.rot) { ctx.save(); ctx.translate(f.x, f.y); ctx.rotate(f.rot); }
  const dx = f.rot ? -h : f.x - h, dy = f.rot ? -h : f.y - h;
  ctx.globalAlpha = f.alpha; ctx.drawImage(Sh.c, sx, sy, cell, cell, dx, dy, f.size, f.size);
  ctx.globalCompositeOperation = "lighter"; ctx.globalAlpha = f.alpha * 0.42; ctx.drawImage(Sh.c, sx, sy, cell, cell, dx, dy, f.size, f.size);
  ctx.globalCompositeOperation = "source-over"; ctx.globalAlpha = 1;
  if (f.rot) ctx.restore();
}
/* ---------- 손맛: 떠오르는 글자·흔들림·멈칫·꼬리 ---------- */
let floats = [], shakeT = 0, shakeA = 0, hitStop = 0, trail = [];
const FLOAT_MAX = 22;
/* 물보라 입자: 미리 만든 PART_MAX 개를 돌려 쓴다(매번 새로 만들지 않음). 색 번호별로 한 번에 그린다. */
const PART_COL = ["#ffffff", "#bff3ff", "#6fdcff", "#ffe27a", "#b9a2ff", "#7dffb0", "#ff9ee0", "#ffb24a"];
const PART_MAX = 420, PARTS = [];
for (let i = 0; i < PART_MAX; i++) PARTS.push({ on: false, x: 0, y: 0, vx: 0, vy: 0, t: 0, life: 1, r: 1, c: 0 });
let partHead = 0, partOn = 0;
// col: 색 번호 또는 -1(무지개 섞기)
function burst(x, y, n, spd, col, r = 3, life = 0.5) {
  for (let i = 0; i < n; i++) {
    const q = PARTS[partHead]; partHead = (partHead + 1) % PART_MAX;
    const a = Math.random() * TAU, v = spd * (0.35 + Math.random() * 0.8);
    q.on = true; q.x = x; q.y = y; q.vx = Math.cos(a) * v; q.vy = Math.sin(a) * v; q.t = 0; q.life = life * (0.7 + Math.random() * 0.6); q.r = r * (0.6 + Math.random() * 0.8);
    q.c = col < 0 ? 1 + ((Math.random() * 7) | 0) : col;
  }
}
// 퍼지는 고리(가벼운 선 하나)
let ringsM = [];
const ring = (x, y, R, color = "#ffffff", T = 0.35, w = 6) => { if (ringsM.length >= 40) ringsM.shift(); ringsM.push({ x, y, R, color, T, w, t: 0 }); };
let lastMulti0 = -9, hitBudget = 8, muzzle = null, multiBan = null, comboPop = 0, edgeFlash = 0, feverBeat = 0, beatN = 0;
function floatText(x, y, text, color = "#ffffff", size = 16, life = 0.8) {
  if (floats.length >= FLOAT_MAX) floats.shift();
  floats.push({ x, y, text, color, size, t: 0, life });
}
const shake = (amp, t) => { shakeA = Math.max(shakeA, Math.min(4, amp)); shakeT = Math.max(shakeT, t); };   // 최대 4px
const stopFor = ms => { hitStop = Math.max(hitStop, Math.min(40, ms) / 1000); };                         // 최대 40ms

/* ---------- 화면 크기: 짧은 변이 논리 540 ---------- */
let vw = 1, vh = 1, dpr = 1, scale = 1, view = { w: 720, h: 540 }, floorPat = null, floorKey = "";
function resize() {
  vw = Math.max(1, innerWidth); vh = Math.max(1, innerHeight);
  dpr = Math.min(devicePixelRatio || 1, 1.5);
  canvas.width = Math.round(vw * dpr); canvas.height = Math.round(vh * dpr);
  scale = Math.min(vw, vh) / 540;
  view = { w: vw / scale, h: vh / scale };
  if (world) world.view = view;
  floorPat = null;
}
// 바닥 무늬: 그림(또는 대신 만든 모래)을 화면 화소 크기 타일로 한 번만 만들어 패턴으로 붙인다.
const TILE = 320;   // 바닥 타일 한 장의 논리 크기
function floorPattern() {
  const key = (ART.floor ? "a" : "s") + scale.toFixed(3) + dpr;
  if (floorPat && floorKey === key) return floorPat;
  const src = ART.floor || SAND, px = Math.max(16, Math.round(TILE * scale * dpr));
  const tile = canvasOf(px, Math.round(px * src.height / src.width), (x, w, h) => x.drawImage(src, 0, 0, w, h));
  floorPat = ctx.createPattern(tile, "repeat"); floorKey = key;
  return floorPat;
}

/* ---------- 상태 ---------- */
let mode = "start";      // start | play | quiz | cards | paused | over
let world = null, cam = { x: 0, y: 0 }, decor = [], wallWeeds = [], clock = 0, banner = "", bannerT = 0, bannerBig = false, flash = 0;
let firstPearlSaid = false, runSaved = false;
const PILOT_COLOR = L.PILOTS.map(p => p.color);
function makeDecor(zone) {
  let s = 1234 + zone.id.length * 77; const r = () => (s = s * 16807 % 2147483647) / 2147483647;
  decor = [];
  for (let i = 0; i < 46; i++) {
    const kind = zone.decor[i % zone.decor.length], x = 60 + r() * (L.WORLD.w - 120), y = 60 + r() * (L.WORLD.h - 120);
    if (Math.abs(x - L.WORLD.w / 2) < 140 && Math.abs(y - L.WORLD.h / 2) < 120) continue;
    decor.push({ kind, x, y, w: kind === "wreck" ? rnd(110, 160) : kind === "rock" ? rnd(50, 90) : kind === "seaweed" ? rnd(44, 70) : rnd(56, 96), flip: r() < 0.5, hue: r() });
  }
  decor.sort((a, b) => a.y - b.y);
  wallWeeds = [];
  for (let x = 20; x < L.WORLD.w; x += 70) { wallWeeds.push({ x, y: 6 }); wallWeeds.push({ x: x + 35, y: L.WORLD.h - 6 }); }
  for (let y = 40; y < L.WORLD.h; y += 70) { wallWeeds.push({ x: 6, y }); wallWeeds.push({ x: L.WORLD.w - 6, y: y + 35 }); }
}
// "숲으로", "골짜기로", "동굴로": 받침이 있으면 '으로'(ㄹ 받침은 '로')
function josaRo(word) { const c = word.charCodeAt(word.length - 1) - 0xac00; if (c < 0 || c > 11171) return "로"; const jong = c % 28; return jong === 0 || jong === 8 ? "로" : "으로"; }
// big: 노란 큰 글자, sub: 아래 작은 줄, huge: 문제 보상·이벤트처럼 아주 크게(튀어나오듯)
let bannerSub = "", bannerHuge = false, bannerT0 = 0;
function say(text, big, sub = "", huge = false) { banner = text; bannerT = huge ? 2.6 : big ? 2.4 : 1.7; bannerT0 = bannerT; bannerBig = !!big; bannerSub = sub; bannerHuge = huge; }

/* ---------- HUD ---------- */
const hudEls = { hearts: $("hearts"), xp: $("xpfill"), q: $("qcount"), clock: $("clock") };
let hudKey = "";
function hud() {
  if (!world) return;
  const left = Math.max(0, Math.ceil(L.RUN_TIME - world.t)), goal = E.xpGoal(world);
  const k = world.hearts + "/" + world.maxHearts + "/" + Math.round(world.xp / goal * 50) + "/" + world.qpearls.length + "/" + left + "/" + world.bossSpawned;
  if (k === hudKey) return; hudKey = k;
  hudEls.hearts.textContent = world.maxHearts > 5 ? "♥ " + Math.max(0, world.hearts) + "/" + world.maxHearts : "♥".repeat(Math.max(0, world.hearts)) + "♡".repeat(Math.max(0, world.maxHearts - world.hearts));
  hudEls.xp.style.width = Math.min(100, world.xp / goal * 100).toFixed(1) + "%";
  hudEls.q.textContent = world.qpearls.length ? "? ×" + world.qpearls.length : "";
  hudEls.clock.textContent = (world.bossSpawned ? "대왕 " : "") + Math.floor(left / 60) + ":" + String(left % 60).padStart(2, "0");
}
// 슈웅! 버튼 고리·터보 게이지(바뀔 때만 스타일을 고친다)
const dashBtn = $("dashBtn"), feverEl = $("fever"), feverFill = $("feverFill");
let dashKey = "", feverKey = "";
function hudFast() {
  if (!world) return;
  const cd = world.tune.dashCd * (world.fever > 0 ? L.FEVER.dashCool : 1), ready = E.dashReady(world);
  const p = ready ? 1 : Math.max(0, Math.min(1, 1 - world.dashCd / cd));
  const dk = ready ? "R" : (p * 40 | 0);
  if (dk !== dashKey) { dashKey = dk; dashBtn.style.setProperty("--p", p.toFixed(3)); dashBtn.classList.toggle("ready", ready); }
  const fv = world.fever > 0, g = fv ? world.fever / L.FEVER.dur : world.gauge;
  const fk = (fv ? "F" : "G") + (g * 60 | 0);
  if (fk !== feverKey) { feverKey = fk; feverFill.style.width = (Math.min(1, g) * 100).toFixed(1) + "%"; feverEl.classList.toggle("on", fv); }
}

/* ---------- 입력: 누른 자리 기준 가상 스틱 ---------- */
let stick = null;            // { id, ax, ay, x, y } (화면 CSS px)
const keys = {};
function clearInput() { stick = null; for (const k in keys) keys[k] = false; }
canvas.addEventListener("pointerdown", e => {
  audio();
  if (mode !== "play") return;
  if (stick) { if (e.pointerId !== stick.id) doDash(); return; }   // 두 번째 손가락으로 톡 = 슈웅!
  stick = { id: e.pointerId, ax: e.clientX, ay: e.clientY, x: e.clientX, y: e.clientY };
  try { canvas.setPointerCapture(e.pointerId); } catch (_) {}
});
// 슈웅!: 움직이는 쪽(없으면 바라보는 쪽)으로
function doDash() {
  if (mode !== "play" || !world) return false;
  const mv = moveVector(), ok = E.dash(world, Math.hypot(mv.x, mv.y) > 0.1 ? mv : null);
  if (ok) handleEvents();
  return ok;
}
// 버튼은 누르는 순간 바로(떼기를 기다리지 않는다). 버튼을 누른 손가락은 끌기 막대가 되지 않는다.
$("dashBtn").addEventListener("pointerdown", e => { e.preventDefault(); e.stopPropagation(); audio(); doDash(); });
canvas.addEventListener("pointermove", e => { if (stick && stick.id === e.pointerId) { stick.x = e.clientX; stick.y = e.clientY; } });
const release = e => { if (stick && (!e || stick.id === e.pointerId)) stick = null; };
canvas.addEventListener("pointerup", release);
canvas.addEventListener("pointercancel", release);
canvas.addEventListener("lostpointercapture", release);
// 손가락이 하나도 안 남았으면 무조건 놓는다(아이패드에서 pointerup 이 사라질 때가 있다)
addEventListener("touchend", e => { if (e.touches.length === 0) stick = null; }, { passive: true });
addEventListener("touchcancel", e => { if (e.touches.length === 0) stick = null; }, { passive: true });
addEventListener("blur", () => { clearInput(); if (mode === "play") pause(); });
document.addEventListener("visibilitychange", () => { if (document.hidden) { clearInput(); if (mode === "play") pause(); } });
let qaMove = null;   // 검증용(?qa=1): 끌기 대신 정한 움직임
function moveVector() {
  let x = 0, y = 0;
  if (qaMove) return { x: qaMove.x, y: qaMove.y };
  if (stick) { const dx = stick.x - stick.ax, dy = stick.y - stick.ay, d = Math.hypot(dx, dy); if (d > 4) { const k = Math.min(1, d / L.STICK_R) / d; x = dx * k; y = dy * k; } }
  const kx = (keys.ArrowRight || keys.d || keys.D ? 1 : 0) - (keys.ArrowLeft || keys.a || keys.A ? 1 : 0);
  const ky = (keys.ArrowDown || keys.s || keys.S ? 1 : 0) - (keys.ArrowUp || keys.w || keys.W ? 1 : 0);
  if (kx || ky) { const n = Math.hypot(kx, ky); x = kx / n; y = ky / n; }
  return { x, y };
}
addEventListener("keydown", e => {
  audio();
  if (mode === "play") { keys[e.key] = true; if (e.key === " " || e.code === "Space") { e.preventDefault(); if (!e.repeat) doDash(); } }
  if (e.key === "Escape" || e.key === "p") { if (mode === "play") pause(); else if (mode === "paused") unpause(); }
  if (e.repeat || !guard || performance.now() < guard.armAt) return;
  freshKeyAt = performance.now();
  const n = parseInt(e.key, 10);
  if (n >= 1 && n <= guard.buttons.length) { e.preventDefault(); guard.onPick(guard.buttons[n - 1], n - 1); }
});
addEventListener("keyup", e => { keys[e.key] = false; });

/* ---------- 실수 터치 막기(장비 고르기) ----------
   진주를 먹을 때 잠수정을 끌던 손가락이 화면에 붙어 있으면, 뗄 때 카드가 눌려 버린다.
   (1) 화면이 뜨고 LOCK_MS 동안은 버튼이 흐리고 잠겨 있다.
   (2) 잠금이 풀린 뒤 그 버튼 위에서 새로 누르고(pointerdown) 같은 버튼 위에서 뗀(pointerup) 것만 고른 것으로 친다.
       키보드는 화면이 뜬 뒤 새로 누른 숫자키·Enter 만. */
const LOCK_MS = 700;
let guard = null, freshKeyAt = 0;
function armChoices(panel, buttons, onPick) {
  if (guard && guard.panel !== panel) guard.panel.classList.remove("locked");
  const g = guard = { armAt: performance.now() + LOCK_MS, buttons, onPick, panel, down: null };
  panel.classList.add("locked");
  setTimeout(() => { if (guard === g) panel.classList.remove("locked"); }, LOCK_MS);
  buttons.forEach((b, i) => {
    b.addEventListener("pointerdown", e => { g.down = guard === g && performance.now() >= g.armAt ? { b, id: e.pointerId } : null; });
    b.addEventListener("pointerup", e => {
      const d = g.down; g.down = null;
      if (guard !== g || !d || d.b !== b || d.id !== e.pointerId || performance.now() < g.armAt) return;
      const at = document.elementFromPoint(e.clientX, e.clientY);
      if (at && !b.contains(at)) return;
      onPick(b, i);
    });
    b.addEventListener("pointercancel", () => { g.down = null; });
    b.addEventListener("click", e => { if (e.detail === 0 && guard === g && freshKeyAt >= g.armAt && performance.now() - freshKeyAt < 1500) onPick(b, i); });
  });
}
function disarm() { if (guard) guard.panel.classList.remove("locked"); guard = null; }

/* ---------- 카드 그림 ---------- */
const iconCache = new Map();
function star5(x, cx, cy, r, color, n = 5) {
  x.fillStyle = color; x.beginPath();
  for (let i = 0; i < n * 2; i++) { const a = -Math.PI / 2 + i * Math.PI / n, rr = i % 2 ? r * 0.45 : r; x.lineTo(cx + Math.cos(a) * rr, cy + Math.sin(a) * rr); }
  x.closePath(); x.fill();
}
function drawArt(x, n, cx, cy, w) { const im = ART[n]; if (!im) return false; const h = w * im.height / im.width; x.drawImage(im, cx - w / 2, cy - h / 2, w, h); return true; }
function drawIcon(x, c, s) {
  const m = s / 2;
  x.lineJoin = "round"; x.lineCap = "round";
  const id = c.kind === "combo" ? c.id : c.id;
  if (c.kind === "combo" && id === "fall") { for (let i = 0; i < 6; i++) x.drawImage(RAINBOW[i], m - 30 + (i % 3) * 22 - 4, 6 + Math.floor(i / 3) * 24 + (i % 2) * 8, 26, 26); x.drawImage(RAINBOW[2], m - 18, s - 36, 36, 36); return; }
  if (c.kind === "combo" && id === "maelstrom") { for (let i = 0; i < 6; i++) { const a = i * TAU / 6; x.drawImage(SWIRL[5], m + Math.cos(a) * s * 0.3 - 14, m + Math.sin(a) * s * 0.3 - 14, 28, 28); } x.drawImage(SWIRL[4], m - 18, m - 18, 36, 36); return; }
  if (c.kind === "heal") { heartPath(x, m, m, s * 0.36); x.fillStyle = "#ff7a9c"; x.fill(); return; }
  if (c.kind === "gem") { if (!drawArt(x, "chest", m, m, s * 0.8)) { x.fillStyle = "#fff6dc"; x.beginPath(); x.arc(m, m, s * 0.25, 0, TAU); x.fill(); } return; }
  switch (id) {
    case "bubble": if (!drawArt(x, "bubble", m, m, s * 0.6)) { x.drawImage(BUB[1], m - 22, m - 22, 44, 44); x.drawImage(BUB[3], m + 6, m - 30, 22, 22); } break;
    case "whirl": x.drawImage(SWIRL[1], 6, 6, s - 12, s - 12); break;
    case "zap": if (!drawArt(x, "zapjelly", m, m, s * 0.7)) { x.fillStyle = "#b9a2ff"; x.beginPath(); x.arc(m, m - 6, s * 0.24, Math.PI, 0); x.fill(); x.strokeStyle = "#ffe45c"; x.lineWidth = 3; x.beginPath(); x.moveTo(m - 12, m + 4); x.lineTo(m - 4, m + 14); x.lineTo(m - 10, m + 18); x.lineTo(m + 2, m + 30); x.stroke(); } break;
    case "shell": if (!drawArt(x, "shell", m, m, s * 0.66)) shellShape(x, m, m, s * 0.3, 0); break;
    case "light": x.strokeStyle = "#ffe27a"; for (let i = 0; i < 3; i++) { x.globalAlpha = 1 - i * 0.28; x.lineWidth = 5 - i; x.beginPath(); x.arc(m, m, 10 + i * 10, 0, TAU); x.stroke(); } x.globalAlpha = 1; x.fillStyle = "#fff6c0"; x.beginPath(); x.arc(m, m, 8, 0, TAU); x.fill(); break;
    case "star": if (!drawArt(x, "star", m, m, s * 0.6)) star5(x, m, m, s * 0.3, "#ff9b5a"); break;
    case "prop": x.fillStyle = "#cfe6ff"; for (let i = 0; i < 3; i++) { x.save(); x.translate(m, m); x.rotate(i * TAU / 3); x.beginPath(); x.ellipse(0, -s * 0.18, s * 0.1, s * 0.2, 0, 0, TAU); x.fill(); x.restore(); } x.fillStyle = "#4a7bd8"; x.beginPath(); x.arc(m, m, 6, 0, TAU); x.fill(); break;
    case "magnet": x.lineWidth = 11; x.strokeStyle = "#ff6b7a"; x.beginPath(); x.arc(m, m - 2, s * 0.22, Math.PI, 0); x.stroke(); x.strokeStyle = "#e9eef8"; x.beginPath(); x.moveTo(m - s * 0.22, m - 2); x.lineTo(m - s * 0.22, m + 16); x.moveTo(m + s * 0.22, m - 2); x.lineTo(m + s * 0.22, m + 16); x.stroke(); break;
    case "heart": heartPath(x, m, m, s * 0.34); x.fillStyle = "#ff7a9c"; x.fill(); x.lineWidth = 4; x.strokeStyle = "#fff"; x.stroke(); break;
    case "big": x.drawImage(BUB[2], m - 30, m - 30, 60, 60); x.fillStyle = "#fff"; x.font = "900 22px " + FONT; x.textAlign = "center"; x.textBaseline = "middle"; x.fillText("+", m, m + 1); break;
    case "quick": x.strokeStyle = "#ffe27a"; x.lineWidth = 6; x.beginPath(); x.arc(m, m, s * 0.26, -Math.PI / 2, Math.PI * 1.1); x.stroke(); x.fillStyle = "#ffe27a"; x.beginPath(); x.moveTo(m + 4, m - 4); x.lineTo(m - 8, m + 4); x.lineTo(m, m + 4); x.lineTo(m - 4, m + 14); x.lineTo(m + 10, m + 2); x.lineTo(m + 2, m + 2); x.closePath(); x.fill(); break;
  }
}
function heartPath(x, cx, cy, r) {
  x.beginPath(); x.moveTo(cx, cy + r * 0.9);
  x.bezierCurveTo(cx - r * 1.4, cy - r * 0.1, cx - r * 0.7, cy - r * 1.1, cx, cy - r * 0.35);
  x.bezierCurveTo(cx + r * 0.7, cy - r * 1.1, cx + r * 1.4, cy - r * 0.1, cx, cy + r * 0.9); x.closePath();
}
function shellShape(x, cx, cy, r, rot) {
  x.save(); x.translate(cx, cy); x.rotate(rot);
  x.fillStyle = "#ffb27a"; x.beginPath(); x.moveTo(0, -r); x.quadraticCurveTo(r * 1.1, -r * 0.2, r * 0.5, r * 0.9); x.lineTo(-r * 0.5, r * 0.9); x.quadraticCurveTo(-r * 1.1, -r * 0.2, 0, -r); x.fill();
  x.strokeStyle = "#fff1dc"; x.lineWidth = Math.max(1.5, r * 0.12); x.beginPath(); x.moveTo(0, -r * 0.8); x.lineTo(0, r * 0.8); x.moveTo(-r * 0.35, -r * 0.3); x.lineTo(-r * 0.25, r * 0.8); x.moveTo(r * 0.35, -r * 0.3); x.lineTo(r * 0.25, r * 0.8); x.stroke();
  x.restore();
}
function iconCanvas(c, size = 84) {
  const k = c.kind + ":" + c.id;
  let im = iconCache.get(k);
  if (!im) { im = canvasOf(size, size, (x) => drawIcon(x, c, size)); iconCache.set(k, im); }
  const out = document.createElement("canvas"); out.width = out.height = size; out.getContext("2d").drawImage(im, 0, 0);
  return out;
}

/* ---------- 문제 → 장비 고르기 ---------- */
let cardsShown = null;   // 검증용: 지금 떠 있는 카드
const QUIZ_THEME = { top: 60, bg: "rgba(6,34,66,.96)", accent: "#ffe27a" };
function openQuiz() {
  mode = "quiz"; clearInput();
  if (!GameQuiz) { openCards({ firstTry: false, noQuiz: true }); return; }
  GameQuiz.ask({
    kid: L.PILOTS[pilot].kid, title: "맞히면 물결 파동 + 새 장비!", hint: "한 번에 맞히면 화면의 친구를 모두 씻어 주고 하트도 채워요", theme: QUIZ_THEME,
    onWrong: () => sfx.no(),
    onCorrect: r => { E.recordQuiz(world, r.firstTry); return rewardBlast(r.firstTry); },
    onDone: r => { if (mode !== "quiz") return; openCards({ firstTry: r.firstTry }); },
  });
}
// 문제를 맞힌 그 순간의 보상(카드 고르기 전): 물결 파동이 퍼지며 친구를 씻겨 주고, 한 번에 맞히면 하트 1 회복
function rewardBlast(firstTry) {
  const r = E.quizBlast(world, firstTry);
  handleEvents();
  const p = world.p;
  // 무지개 충격파(fx_mega)가 잠수정에서 퍼진다 + 팡파르 + 흔들림·멈칫
  addFx("mega", p.x, p.y, firstTry ? Math.max(view.w, view.h) * 1.15 : BLAST_FX_NEAR, { dur: firstTry ? 0.85 : 0.6, keep: true });
  if (firstTry) addFx("light", p.x, p.y, 260, { dur: 0.6, keep: true });
  sfx.fanfare(firstTry); flash = firstTry ? 0.35 : 0.15; shake(firstTry ? 4 : 2.5, 0.3); stopFor(40); hudKey = ""; hud();
  const msg = (firstTry ? "물결 파동! " : "작은 물결! ") + (r.n ? "친구 " + r.n + "마리 씻김" : "바다가 깨끗해졌어요") + (r.healed ? " · 하트 +1" : "");
  say(msg, true, "장비를 골라요!", true);
  floatText(p.x, p.y - 120, r.n ? "+" + r.n : "반짝!", "#ffe27a", 30, 1.2);
  return msg + " · 장비 " + (firstTry ? world.tune.cards : 2) + "장 중 골라요";
}
const BLAST_FX_NEAR = E.BLAST_NEAR * 2.3;
let equipFx = null;
function openCards({ firstTry, noQuiz = false, gift = null, onDone = null, chest = false }) {
  mode = "cards"; clearInput();
  const tune = world.tune, taeo = tune.cards === 2;
  let cards, kicker, title;
  if (gift === "support" || gift === "weapon") {
    const want = gift === "support" ? "support" : "weapon";
    let pool = L.cardOptions(world.load).filter(c => c.kind === want && c.isNew);
    for (let i = pool.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [pool[i], pool[j]] = [pool[j], pool[i]]; }
    cards = pool.slice(0, taeo ? 2 : 3);
    if (taeo && cards.length) { let best = 0; cards.forEach((c, i) => { if (L.cardScore(c, world.load) > L.cardScore(cards[best], world.load)) best = i; }); cards[best] = Object.assign({}, cards[best], { recommend: true }); }
    kicker = "출발 선물!"; title = gift === "support" ? "보조 장비를 하나 골라요" : "무기를 하나 더 골라요";
  } else if (chest) {
    // 보물 조개: 문제 없이 2장 중 1장(희귀도 낮은 쪽 — 문제를 맞힌 보상이 늘 더 크게)
    cards = L.drawCards(world.load, { count: 2, low: true, recommend: taeo, hearts: world.hearts, maxHearts: world.maxHearts });
    kicker = "보물 조개가 열렸어요!"; title = "선물 장비를 하나 골라요";
  } else {
    const rare = firstTry && world.streak > 0 && world.streak % 3 === 0;
    cards = L.drawCards(world.load, { count: firstTry ? tune.cards : 2, low: !firstTry, rare, recommend: taeo, hearts: world.hearts, maxHearts: world.maxHearts });
    kicker = noQuiz ? "? 진주를 찾았어요!" : rare ? "콤보 진주! 세 번 연속 한 번에 맞혔어요" : firstTry ? "한 번에 맞혔어요!" : "고쳐서 맞혔어요!";
    title = "어떤 장비가 좋아요?";
  }
  if (!cards.length) { finishCards(onDone); return; }
  cardsShown = cards;
  $("cardKicker").textContent = kicker; $("cardTitle").textContent = title;
  const row = $("cardRow"); row.innerHTML = ""; row.style.setProperty("--n", String(cards.length));
  const buttons = cards.map(c => {
    const t = L.cardText(c), b = document.createElement("button");
    b.type = "button"; b.className = "card r" + (c.rarity || 1) + (c.recommend ? " rec" : "");
    if (t.tag) { const em = document.createElement("em"); em.textContent = t.tag; b.appendChild(em); }
    const name = document.createElement("b"); name.textContent = t.name;
    const tip = document.createElement("span"); tip.textContent = t.say;
    b.append(iconCanvas(c), name, tip); row.appendChild(b); return b;
  });
  $("cards").hidden = false;
  armChoices($("cards"), buttons, (b, i) => {
    disarm(); buttons.forEach(x => { x.disabled = true; }); b.classList.add("ok"); sfx.up();
    const c = cards[i];
    E.setLoadout(world, L.applyCard(world.load, c), c);
    if (!gift && !noQuiz && !chest) world.quizGear++;
    say(L.gainText(c), true, chest ? "보물 조개 선물" : gift ? "출발 선물" : noQuiz ? "" : "문제를 맞혀서 얻었어요!", true); bannerT = 2.8;
    equipFx = { img: iconCanvas(c, 96), t: 0 };
    world.fx.rings.push({ x: world.p.x, y: world.p.y, t: 0, T: 0.7, R: 110, color: "#ffe27a" });
    addFx("light", world.p.x, world.p.y, 150, { dur: 0.5 });
    flash = 0.25;
    setTimeout(() => { $("cards").hidden = true; cardsShown = null; finishCards(onDone); }, 360);
  });
}
function finishCards(onDone) {
  if (onDone) { onDone(); return; }
  E.resumeAfter(world); hudKey = ""; hud();
  mode = "play"; clearInput(); last = performance.now();
}
// 하트 0: 한 판에 한 번 구조 문제
function openRescue() {
  mode = "quiz"; clearInput(); say("잠수정이 지쳤어요", true);
  if (!GameQuiz) { E.revive(world); mode = "play"; say("다시 출발!", true); return; }
  GameQuiz.ask({
    kid: L.PILOTS[pilot].kid, title: "잠수정이 지쳤어요 · 맞히면 하트 " + (world.gifts.includes("rescue3") ? 3 : 2) + "개로 다시 출발!", theme: QUIZ_THEME,
    onWrong: () => sfx.no(),
    onCorrect: r => { E.recordQuiz(world, r.firstTry); sfx.up(); return "다시 출발!"; },
    onDone: () => { if (mode !== "quiz") return; E.revive(world); hudKey = ""; hud(); mode = "play"; clearInput(); last = performance.now(); say("다시 출발!", true); },
  });
}

/* ---------- 판 시작·끝 ---------- */
function begin(opts = {}) {
  disarm(); if (GameQuiz) { GameQuiz.close(); GameQuiz.setKid(L.PILOTS[pilot].kid); }
  if (opts.kid != null) pilot = opts.kid;
  if (opts.zone) zoneId = opts.zone;
  if (!save.zones.includes(zoneId)) zoneId = "coral";
  const zone = L.zoneOf(zoneId);
  world = E.createWorld({ kid: pilot, zone: zoneId, view, gifts: save.gifts });
  makeDecor(zone);
  ["start", "over", "cards", "pause", "dex"].forEach(id => { $(id).hidden = true; });
  $("hud").hidden = false; hudKey = ""; hud();
  firstPearlSaid = false; runSaved = false; banner = ""; bannerT = 0;
  fxList = []; floats = []; trail = []; shakeT = 0; hitStop = 0; S.setPitch(1); dashKey = feverKey = "";
  for (const q of PARTS) q.on = false; ringsM = []; muzzle = null; multiBan = null; comboPop = 0; edgeFlash = 0;
  $("dashBtn").hidden = false; $("fever").hidden = false;
  clearInput(); audio(); last = performance.now();
  say(zone.name + josaRo(zone.name) + " 잠수!", true);
  // 출발 선물: 보조 장비 / 무기 하나 고르기
  const gifts = [];
  if (!opts.noGift && save.gifts.includes("support")) gifts.push("support");
  if (!opts.noGift && save.gifts.includes("weapon")) gifts.push("weapon");
  const next = () => { const g = gifts.shift(); if (!g) { E.resumeAfter(world); mode = "play"; clearInput(); last = performance.now(); hudKey = ""; hud(); return; } openCards({ gift: g, onDone: next }); };
  if (gifts.length) next(); else mode = "play";
}
function endRun(quit) {
  if (runSaved || !world) return;
  runSaved = true;
  const rec = E.runRecord(world);
  if (quit) rec.result = "quit";
  const r = L.applyRun(save, rec);
  save = r.save; save.zone = zoneId; writeSave();
  return { rec, r };
}
function showOver() {
  mode = "over"; clearInput(); disarm(); if (GameQuiz) GameQuiz.close(); S.setPitch(1);
  $("cards").hidden = true; $("pause").hidden = true; $("dashBtn").hidden = true; $("fever").hidden = true;
  const out = endRun(false); if (!out) return;
  const { rec, r } = out, res = rec.result;
  if (res === "boss" || res === "escape") sfx.win();
  $("overTitle").textContent = res === "boss" ? "먹물 대왕을 씻어 줬어요!" : res === "escape" ? L.runLabel() + " 버텼어요! 대왕은 오늘은 도망갔어요" : "잠수정이 지쳤어요. 잘 다녀왔어요!";
  const best = save.best[rec.kid] || { time: 0 };
  // 문제를 맞혀서 얻은 것을 따로 크게
  const quizBox = rec.solved
    ? '<div class="quizwin"><p class="qw-title">문제를 맞혀서 얻은 것</p><div class="qw-row"><span><b>' + rec.solved + '</b>문제</span><span><b>' + rec.quizGear + '</b>장비</span><span><b>' + rec.blasts + '</b>물결 파동</span><span><b>+' + rec.solved * 2 + '</b>진주</span></div>' + (rec.blastWashed ? '<p class="qw-sub">물결 파동으로 친구 ' + rec.blastWashed + "마리를 한꺼번에 씻어 줬어요</p>" : "") + "</div>"
    : '<div class="quizwin dim"><p class="qw-title">다음엔 ? 진주를 먹어 봐요</p><p class="qw-sub">문제를 맞히면 물결 파동과 새 장비를 받아요</p></div>';
  const lines = [
    quizBox,
    "<p>구해 준 친구 <b>" + rec.rescued + "</b>마리" + (rec.firstTries ? " · 한 번에 맞힌 문제 " + rec.firstTries + "개" : "") + "</p>",
    "<p>최고 콤보 <b>" + rec.bestCombo + "</b> · 무지개 터보 <b>" + rec.fevers + "</b>번</p>",
    "<p>버틴 시간 <b>" + Math.floor(rec.time / 60) + "분 " + (rec.time % 60) + "초</b>" + (rec.time >= best.time && rec.time > 0 ? " · " + L.PILOTS[pilot].name + " 최고 기록!" : "") + "</p>",
    "<p>얻은 진주 <b>+" + r.pearls + "</b> · 가족 진주함 " + save.pearls + "</p>",
  ];
  const news = [];
  for (const z of r.newZones) news.push("새 바다 ‘" + L.zoneOf(z).name + "’가 열렸어요!");
  for (const g of r.newGifts) { const G = L.GIFTS.find(x => x.id === g); if (G) news.push("출발 선물 ‘" + G.name + "’: " + G.say); }
  if (r.newFriends.length) news.push("도감에 새 친구: " + r.newFriends.map(f => L.ENEMIES[f].ok).join(" · "));
  $("overText").innerHTML = lines.join("") + (news.length ? '<p class="news">' + news.join("<br>") + "</p>" : "");
  $("over").hidden = false;
  paintStart();
}
function pause() {
  if (mode !== "play") return;
  mode = "paused"; clearInput(); $("pause").hidden = false;
}
function unpause() { if (mode !== "paused") return; $("pause").hidden = true; mode = "play"; clearInput(); last = performance.now(); }
function toMenu() {
  if (world && mode !== "over" && mode !== "start") endRun(true);
  disarm(); if (GameQuiz) GameQuiz.close();
  mode = "start"; world = null; clearInput(); S.setPitch(1);
  ["over", "cards", "pause", "dex", "dashBtn", "fever"].forEach(id => { $(id).hidden = true; });
  $("hud").hidden = true; paintStart(); $("start").hidden = false;
}

/* ---------- 이벤트 → 소리·글자 ---------- */
let lastComboFloat = 0;
const COMBO_SHOW = [50, 150, 300, 500, 1000];   // 10·30·60·100 은 단계 이름으로 따로 알린다
function handleEvents() {
  const ev = world.events; if (!ev.length) return;
  for (const e of ev) {
    switch (e.type) {
      case "hit": {
        // 맞는 순간 = 물보라: 무기마다 다른 효과 시트, 단계가 높을수록 크게(한 프레임에 몇 개까지만)
        if (hitBudget <= 0) break;
        hitBudget--;
        const lv = e.lv || 1, sz = 46 + lv * 14 + (e.r || 16);
        const name = e.src === "zap" ? "bolt" : e.src === "whirl" || e.src === "dash" ? "wind" : e.src === "light" ? "light" : "ice";
        addFx(name, e.x + (Math.random() - 0.5) * 10, e.y + (Math.random() - 0.5) * 10, sz * (e.src === "light" ? 1.2 : 1), { dur: 0.32, rot: Math.random() * TAU, alpha: 0.95 });
        burst(e.x, e.y, 3 + Math.min(3, lv), 150 + lv * 25, e.src === "zap" ? 3 : e.src === "light" ? 3 : 1, 3 + lv * 0.5, 0.35);
        break;
      }
      case "wash": {
        sfx.wash(e.combo);
        // 씻기는 순간: 방울 8~12개가 사방으로 + 고리 하나 + 반짝이
        burst(e.x, e.y, e.chain ? 7 : 10, 260, 1, 5, 0.5); burst(e.x, e.y, 3, 180, 3, 3.5, 0.6);
        ring(e.x, e.y, e.chain ? 40 : 52, e.chain ? "#bff3ff" : "#ffffff", 0.32, 6);
        if (e.elite || e.king) { addFx(e.king ? "mega" : "light", e.x, e.y, e.king ? 260 : 120, { dur: 0.5 }); shake(e.king ? 4 : 2, 0.15); if (e.king) { stopFor(40); sfx.fanfare(false); } }
        else if (!e.chain && Math.random() < 0.25) addFx("light", e.x, e.y, 56, { dur: 0.35, alpha: 0.8 });
        // 떠오르는 숫자: 콤보 고비마다 크게, 그 밖에는 가끔 +1(개수 상한 있음)
        if (e.combo >= 5 && COMBO_SHOW.includes(e.combo) && e.combo !== lastComboFloat) { lastComboFloat = e.combo; floatText(world.p.x, world.p.y - 46, "콤보 ×" + e.combo, e.combo >= 50 ? "#ff9ee0" : "#ffe27a", e.combo >= 50 ? 26 : 21, 1.0); }
        else if (floats.length < 10 && Math.random() < 0.35) floatText(e.x, e.y - 10, "+1", e.chain ? "#bff3ff" : "#ffffff", 14, 0.6);
        break;
      }
      case "burst": if (e.big) { addFx("mega", e.x, e.y, 230, { dur: 0.5 }); burst(e.x, e.y, 18, 340, -1, 5, 0.6); sfx.pop(world.combo); shake(2, 0.12); } else if (Math.random() < 0.5) sfx.chain(world.combo); break;
      case "orb": sfx.orb(e.n); break;
      case "shot": sfx.shot(); if (e.a != null) muzzle = { a: e.a, t: 0, lv: e.lv || 1 }; break;
      case "multi": {
        // 그 자리에서 무지개 폭발. 5마리 알림은 자주 나오니 큰 글자·쿵은 4초에 한 번만(10·20마리는 늘)
        addFx("mega", e.x, e.y, 170 + e.tier * 90, { dur: 0.55 }); burst(e.x, e.y, 14 + e.tier * 8, 420, -1, 6, 0.7); ring(e.x, e.y, 120 + e.tier * 60, "#fff6c8", 0.45, 12);
        if (e.tier === 0 && clock - lastMulti0 < 4) { shake(1.5, 0.1); break; }
        if (e.tier === 0) lastMulti0 = clock;
        multiBan = { text: L.MULTI.say[e.tier], t: 0, tier: e.tier };
        sfx.thud(e.tier); stopFor(e.tier ? 40 : 25); shake(2.5 + e.tier * 0.75, 0.25); edgeFlash = 0.2 + e.tier * 0.1;
        break;
      }
      case "combo-tier": { const T = L.COMBO_TIERS[e.tier]; comboPop = 0.45; floatText(world.p.x, world.p.y - 60, T.name, T.color === "rainbow" ? "#ffe27a" : T.color, 30, 1.1); sfx.tier(e.tier); break; }
      case "qpearl-up": sfx.pearl(); if (e.sure) floatText(e.x, e.y - 30, "? 진주!", "#ffe27a", 22, 1.4); if (!firstPearlSaid) { firstPearlSaid = true; say("? 진주가 떠올랐어요! 먹어 봐요", true, "문제를 맞히면 물결 파동 + 새 장비"); } break;
      case "hurt": sfx.hurt(); flash = 0.15; shake(3, 0.2); break;
      case "boss": sfx.boss(); say("먹물 대왕 등장!", true, "씻겨 주면 오늘의 대성공", true); shake(3, 0.4); break;
      case "bosshit": sfx.bossHit(); if (Math.random() < 0.18) { addFx("light", e.x + (Math.random() - 0.5) * 60, e.y + (Math.random() - 0.5) * 60, 90, { dur: 0.35 }); stopFor(25); shake(1.5, 0.08); } break;
      case "warn": sfx.warn(); break;
      case "zap": sfx.zap(); if (e.x != null && Math.random() < 0.5) addFx("bolt", e.x, e.y, 90, { dur: 0.3 }); break;
      case "light": sfx.light(); break;
      case "dash": sfx.dash(); addFx("wind", e.x + Math.cos(e.a) * 60, e.y + Math.sin(e.a) * 60, 170, { dur: 0.35, rot: e.a + Math.PI / 2 }); if (e.auto) floatText(e.x, e.y - 36, "슈웅!", "#bff3ff", 18, 0.6); break;
      case "fever": sfx.fever(); S.setPitch(1.25); stopFor(40); shake(3, 0.3); addFx("mega", e.x, e.y, 420, { dur: 0.7, keep: true }); say("무지개 터보!", true, "더 빨리 · 더 크게 · 빛 방울이 다 날아와요", true); break;
      case "fever-end": S.setPitch(1); sfx.feverEnd(); break;
      case "event": sfx.event(); say(e.name, true, e.sub, true); shake(2, 0.25); break;
      case "gold": sfx.gold(); addFx("light", e.x, e.y, 200, { dur: 0.6 }); floatText(e.x, e.y - 30, "빛 방울 비!", "#ffe27a", 24, 1.2); break;
      case "gold-bye": floatText(e.x, e.y - 20, "황금 물고기가 숨었어요", "#fff3c4", 16, 1.2); break;
      case "clam": sfx.gold(); addFx("mega", e.x, e.y, 220, { dur: 0.6 }); break;
      case "clam-bye": floatText(e.x, e.y - 20, "조개가 닫혔어요", "#fff3c4", 16, 1.2); break;
      case "ink": break;
    }
  }
  ev.length = 0;
}
function update(dt) {
  // 큰 dt 는 나눠서(탄이 친구를 건너뛰지 않게)
  const n = dt > 0.034 ? 2 : 1;
  for (let i = 0; i < n && mode === "play"; i++) {
    const whaleBefore = !!world.whale;
    E.stepWorld(world, dt / n, moveVector());
    if (!whaleBefore && world.whale) sfx.whale();
    handleEvents();
    if (world.over) { showOver(); return; }
    if (world.pending === "quiz") { openQuiz(); return; }
    if (world.pending === "rescue") { openRescue(); return; }
    if (world.pending === "chest") { openCards({ chest: true }); return; }
  }
  hud(); hudFast();
}

/* ---------- 그리기 ---------- */
// 그림이 없을 때 쓰는 친구 모양(몸 색 위에 먹물을 덮는다 — 먹물은 씻길수록 옅어진다)
const BODY = { inkfish: "#ff9f43", crab: "#ff5e5e", jelly: "#ff8fd0", puffer: "#ffd84a", eel: "#59d38a", boss: "#b07cff" };
function friendShape(c, kind, x, y, r, ink, hit, face, t) {
  c.save(); c.translate(x, y); if (face < 0) c.scale(-1, 1);
  const col = hit ? "#ffffff" : BODY[kind] || "#ffaa66";
  c.fillStyle = col; c.beginPath();
  if (kind === "inkfish" || kind === "puffer") { c.ellipse(0, 0, r * 1.05, r * 0.82, 0, 0, TAU); c.moveTo(-r * 0.9, 0); c.lineTo(-r * 1.55, -r * 0.6); c.lineTo(-r * 1.55, r * 0.6); c.closePath(); }
  else if (kind === "crab") { c.ellipse(0, 0, r * 1.1, r * 0.75, 0, 0, TAU); c.moveTo(r * 1.2, -r * 0.5); c.arc(r * 1.1, -r * 0.6, r * 0.35, 0, TAU); c.moveTo(-r * 0.8, -r * 0.6); c.arc(-r * 1.1, -r * 0.6, r * 0.35, 0, TAU); }
  else if (kind === "jelly") { c.arc(0, -r * 0.1, r, Math.PI, 0); c.lineTo(r, r * 0.3); for (let i = 0; i < 4; i++) c.lineTo(r * (0.75 - i * 0.5), r * (0.3 + 0.5 * ((i + Math.floor(t * 4)) % 2))); c.lineTo(-r, r * 0.3); c.closePath(); }
  else if (kind === "eel") { c.ellipse(0, 0, r * 2.1, r * 0.55, 0, 0, TAU); }
  else { c.ellipse(0, -r * 0.2, r * 0.95, r * 0.8, 0, 0, TAU); for (let i = 0; i < 6; i++) { const a = 0.4 + i * 0.47; c.moveTo(Math.cos(a) * r * 0.6, r * 0.3); c.ellipse(Math.cos(a) * r * 0.8, r * 0.75, r * 0.16, r * 0.42, a - 1.57, 0, TAU); } }
  c.fill();
  if (ink > 0.02 && !hit) { c.globalAlpha = ink * 0.85; c.fillStyle = "#2b2550"; c.fill(); c.globalAlpha = 1; }
  // 눈과 입: 먹물이면 찡그림, 씻기면 웃음
  const ex = kind === "eel" ? r * 1.2 : r * 0.35;
  c.fillStyle = "#fff"; c.beginPath(); c.arc(ex, -r * 0.18, r * 0.24, 0, TAU); c.fill();
  c.fillStyle = "#1c2350"; c.beginPath(); c.arc(ex + r * 0.05, -r * 0.16, r * 0.12, 0, TAU); c.fill();
  c.strokeStyle = "#1c2350"; c.lineWidth = Math.max(1.5, r * 0.1); c.beginPath();
  if (ink > 0.02) { c.moveTo(ex - r * 0.2, r * 0.32); c.quadraticCurveTo(ex, r * 0.2, ex + r * 0.2, r * 0.32); }
  else { c.moveTo(ex - r * 0.22, r * 0.2); c.quadraticCurveTo(ex, r * 0.42, ex + r * 0.22, r * 0.2); }
  c.stroke();
  c.restore();
}
const EW = { inkfish: 44, crab: 46, jelly: 44, puffer: 46, eel: 84, boss: 150, kingjelly: 92, kingpuffer: 92, gold: 50, clam: 64 };
// 그림이 바라보는 쪽: 물고기·복어는 왼쪽, 곰치는 오른쪽, 게·해파리·문어는 좌우 대칭(뒤집지 않음)
const FACING = { inkfish: -1, puffer: -1, eel: 1, crab: 0, jelly: 0, boss: 0, kingjelly: 0, kingpuffer: -1, gold: -1, clam: 0 };
const flipFor = (kind, face) => FACING[kind] !== 0 && face * FACING[kind] < 0;
const OK_ART = { inkfish: "fish_ok", crab: "crab_ok", jelly: "jelly_ok", puffer: "puffer_ok", eel: "eel_ok", boss: "boss_ok", kingjelly: "jelly_ok", kingpuffer: "puffer_ok", gold: "fish_ok", clam: "chest" };
const ART_OF = { kingjelly: "jelly", kingpuffer: "puffer", gold: "fish_ok", clam: "chest" };
const SHAPE_OF = { kingjelly: "jelly", kingpuffer: "puffer", gold: "inkfish", clam: "puffer" };
function crown(x, y, s) {
  ctx.fillStyle = "#ffd75a"; ctx.beginPath(); ctx.moveTo(x - s, y); ctx.lineTo(x - s, y - s * 0.8); ctx.lineTo(x - s * 0.5, y - s * 0.35); ctx.lineTo(x, y - s); ctx.lineTo(x + s * 0.5, y - s * 0.35); ctx.lineTo(x + s, y - s * 0.8); ctx.lineTo(x + s, y); ctx.closePath(); ctx.fill();
  ctx.strokeStyle = "#a8741a"; ctx.lineWidth = 2; ctx.stroke();
}
function hpBar(x, y, wdt, k, col) { ctx.fillStyle = "rgba(0,0,0,.45)"; ctx.fillRect(x - wdt / 2, y, wdt, 8); ctx.fillStyle = col; ctx.fillRect(x - wdt / 2, y, wdt * k, 8); }
function drawEnemy(e) {
  const hit = e.fl > 0, ink = Math.max(0, e.hp / e.max), bob = Math.sin(e.t * 3) * 1.5, art = ART_OF[e.kind] || e.kind;
  let w = EW[e.kind] * (e.elite ? L.ELITE.r : 1); if ((e.kind === "puffer" || e.kind === "kingpuffer") && e.puff > 0) w *= 1.35;
  // 맞으면 살짝 찌그러졌다 돌아온다
  if (hit) w *= 1.08;
  if (e.elite) { ctx.drawImage(GLOW_Q, e.x - w * 0.8, e.y - w * 0.8, w * 1.6, w * 1.6); }
  if (e.kind === "gold") { ctx.drawImage(GLOW_PEARL, e.x - w, e.y - w, w * 2, w * 2); }
  const flip = ART[art] ? flipFor(e.kind, e.face) : e.face < 0, rot = e.kind === "eel" ? Math.atan2(e.vy, Math.abs(e.vx)) * (flip ? -1 : 1) : 0;
  if (e.kind === "gold" || e.kind === "clam") {
    if (!sprite(art, e.x, e.y + bob, w, hit && e.kind === "clam" ? false : false, e.kind === "clam" ? Math.sin(e.t * 8) * (hit ? 0.12 : 0.03) : 0, flip)) friendShape(ctx, SHAPE_OF[e.kind], e.x, e.y + bob, e.r, 0, hit, e.face, e.t);
    if (e.kind === "gold") { ctx.fillStyle = "#fff6b0"; for (let i = 0; i < 3; i++) { const a = e.t * 4 + i * 2.1; ctx.fillRect(e.x + Math.cos(a) * w * 0.6 - 2, e.y + Math.sin(a) * w * 0.5 - 2, 4, 4); } }
    if (e.kind === "clam") hpBar(e.x, e.y - w * 0.7, 60, ink, "#ffe27a");
    return;
  }
  if (ART[art]) {
    // 씻긴 모습을 밑에 두고, 먹물 모습을 남은 체력만큼 덮는다 → 맞을수록 원래 색이 비친다
    if (ART[OK_ART[e.kind]] && ink < 0.98) sprite(OK_ART[e.kind], e.x, e.y + bob, w, false, rot, flip);
    ctx.globalAlpha = 0.3 + ink * 0.7;
    sprite(art, e.x, e.y + bob, w, false, rot, flip);
    if (hit && WHITE[art]) { ctx.globalAlpha = 0.55; sprite(art, e.x, e.y + bob, w, true, rot, flip); }
    ctx.globalAlpha = 1;
  } else friendShape(ctx, SHAPE_OF[e.kind] || e.kind, e.x, e.y + bob, e.r * (e.puff > 0 ? 1.35 : 1), ink, hit, e.face, e.t);
  if (e.kind === "boss") hpBar(e.x, e.y - 100, 120, ink, "#8ff0ff");
  else if (e.king) { crown(e.x, e.y - w * 0.45, 14); hpBar(e.x, e.y - w * 0.62, 80, ink, "#ffe27a"); }
}
function drawSub(p, t) {
  if (p.inv > 0 && p.dashT <= 0 && mode === "play" && Math.floor(p.inv * 12) % 2) ctx.globalAlpha = 0.45;
  const rot = p.face + Math.PI / 2;
  const gs = p.dashT > 0 ? 150 : world.fever > 0 ? 125 + Math.sin(t * 12) * 10 : 100;
  ctx.drawImage(world.fever > 0 ? GLOW_Q : GLOW_SUB, p.x - gs / 2, p.y - gs / 2, gs, gs);
  const art = L.PILOTS[world.kid].art;
  if (!sprite(art, p.x, p.y, 50, false, rot)) {
    ctx.save(); ctx.translate(p.x, p.y); ctx.rotate(rot);
    ctx.fillStyle = PILOT_COLOR[world.kid]; ctx.beginPath(); ctx.ellipse(0, 2, 20, 27, 0, 0, TAU); ctx.fill();
    ctx.fillStyle = "#cfefff"; ctx.beginPath(); ctx.arc(0, -6, 12, 0, TAU); ctx.fill();
    ctx.fillStyle = "#ffe0c2"; ctx.beginPath(); ctx.arc(0, -6, 7, 0, TAU); ctx.fill();
    ctx.fillStyle = "#555"; ctx.fillRect(-7, 26, 14, 6);
    ctx.restore();
  }
  ctx.globalAlpha = 1;
  // 전기 해파리 친구가 곁에서 둥실
  if (world.load.weapons.zap) { const zx = p.x + Math.cos(t * 1.3) * 40, zy = p.y - 34 + Math.sin(t * 2.6) * 5, zw = 24 + world.load.weapons.zap * 3; if (!sprite("zapjelly", zx, zy, zw)) { ctx.fillStyle = "#b9a2ff"; ctx.beginPath(); ctx.arc(zx, zy, zw * 0.35, Math.PI, 0); ctx.fill(); ctx.fillRect(zx - zw * 0.3, zy, zw * 0.08, 8); ctx.fillRect(zx + zw * 0.2, zy, zw * 0.08, 8); } }
}
function render() {
  const k = scale * dpr;
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  const zone = world ? world.zone : L.zoneOf(zoneId);
  if (!world) { // 시작 화면 뒤: 천천히 흐르는 바다
    ctx.fillStyle = zone.deep; ctx.fillRect(0, 0, canvas.width, canvas.height);
    const pat = floorPattern(), ox = (clock * 12) % (TILE * k);
    ctx.globalAlpha = 0.55; ctx.setTransform(1, 0, 0, 1, -ox, 0); ctx.fillStyle = pat; ctx.fillRect(ox, 0, canvas.width, canvas.height); ctx.globalAlpha = 1;
    ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.fillStyle = "rgba(10,50,100,.45)"; ctx.fillRect(0, 0, canvas.width, canvas.height);
    rays(k); return;
  }
  const p = world.p;
  // 카메라: 잠수정을 따라가되 바다 밖은 안 보이게
  cam.x = view.w >= L.WORLD.w ? (L.WORLD.w - view.w) / 2 : clamp(p.x - view.w / 2, 0, L.WORLD.w - view.w);
  cam.y = view.h >= L.WORLD.h ? (L.WORLD.h - view.h) / 2 : clamp(p.y - view.h / 2, 0, L.WORLD.h - view.h);
  // 흔들림: 화면 px 로 최대 4
  if (shakeT > 0 && mode === "play") { cam.x += (Math.random() - 0.5) * 2 * shakeA / scale; cam.y += (Math.random() - 0.5) * 2 * shakeA / scale; }
  ctx.fillStyle = "#0a2a48"; ctx.fillRect(0, 0, canvas.width, canvas.height);
  // 바닥(패턴은 월드 원점에 붙는다)
  ctx.setTransform(1, 0, 0, 1, -cam.x * k, -cam.y * k);
  ctx.fillStyle = floorPattern();
  ctx.fillRect(Math.max(0, cam.x) * k, Math.max(0, cam.y) * k, Math.min(view.w, L.WORLD.w) * k, Math.min(view.h, L.WORLD.h) * k);
  ctx.setTransform(k, 0, 0, k, -cam.x * k, -cam.y * k);
  if (zone.tint) { ctx.fillStyle = zone.tint; ctx.fillRect(cam.x, cam.y, view.w, view.h); }
  const x0 = cam.x - 100, y0 = cam.y - 100, x1 = cam.x + view.w + 100, y1 = cam.y + view.h + 100;
  const vis = (x, y) => x > x0 && x < x1 && y > y0 && y < y1;
  // 장식
  for (const d of decor) {
    if (!vis(d.x, d.y)) continue;
    if (!sprite(d.kind, d.x, d.y, d.w, false, 0, d.flip)) {
      if (d.kind === "rock") { ctx.fillStyle = "#8d8a9e"; ctx.beginPath(); ctx.ellipse(d.x, d.y, d.w * 0.45, d.w * 0.32, 0, 0, TAU); ctx.fill(); }
      else if (d.kind === "seaweed") { ctx.strokeStyle = "#3f9b5a"; ctx.lineWidth = 6; ctx.lineCap = "round"; ctx.beginPath(); for (let i = 0; i < 3; i++) { ctx.moveTo(d.x + (i - 1) * 10, d.y + d.w * 0.4); ctx.quadraticCurveTo(d.x + (i - 1) * 10 + Math.sin(clock * 1.5 + i + d.hue * 6) * 10, d.y, d.x + (i - 1) * 12, d.y - d.w * 0.4); } ctx.stroke(); }
      else if (d.kind === "wreck") { ctx.fillStyle = "#7a5638"; ctx.fillRect(d.x - d.w * 0.4, d.y - 10, d.w * 0.8, 20); ctx.fillStyle = "#5e4029"; ctx.fillRect(d.x - d.w * 0.3, d.y - 26, 12, 50); }
      else { ctx.fillStyle = d.hue < 0.5 ? "#ff8a9a" : "#ffb35c"; ctx.beginPath(); for (let i = 0; i < 5; i++) { const a = -Math.PI / 2 + (i - 2) * 0.45; ctx.moveTo(d.x, d.y + d.w * 0.3); ctx.lineTo(d.x + Math.cos(a) * d.w * 0.45 - 4, d.y + Math.sin(a) * d.w * 0.45); ctx.lineTo(d.x + Math.cos(a) * d.w * 0.45 + 4, d.y + Math.sin(a) * d.w * 0.45); } ctx.fill(); }
    }
  }
  // 해초 벽
  ctx.fillStyle = "rgba(20,70,50,.65)";
  if (cam.x < 30) ctx.fillRect(-40, cam.y, 52, view.h); if (cam.x + view.w > L.WORLD.w - 30) ctx.fillRect(L.WORLD.w - 12, cam.y, 52, view.h);
  if (cam.y < 30) ctx.fillRect(cam.x, -40, view.w, 52); if (cam.y + view.h > L.WORLD.h - 30) ctx.fillRect(cam.x, L.WORLD.h - 12, view.w, 52);
  for (const s of wallWeeds) { if (!vis(s.x, s.y)) continue; if (!sprite("seaweed", s.x, s.y, 58)) { ctx.strokeStyle = "#2f8a4a"; ctx.lineWidth = 7; ctx.lineCap = "round"; ctx.beginPath(); ctx.moveTo(s.x, s.y + 24); ctx.quadraticCurveTo(s.x + Math.sin(clock + s.x) * 12, s.y, s.x, s.y - 24); ctx.stroke(); } }
  // 빛 방울
  for (const o of world.orbs) {
    if (!vis(o.x, o.y)) continue;
    const s = (o.v > 2 ? 24 : 17) * (1 + Math.sin(o.t * 6 + o.x) * 0.1);
    ctx.drawImage(GLOW_PEARL, o.x - s, o.y - s, s * 2, s * 2);
    if (!sprite("pearl", o.x, o.y, s * 0.75)) { ctx.fillStyle = "#fffbe0"; ctx.beginPath(); ctx.arc(o.x, o.y, s * 0.32, 0, TAU); ctx.fill(); }
  }
  // 빨려 오는 빛 방울: 지나온 쪽으로 빛 줄기 꼬리
  ctx.lineCap = "round"; ctx.strokeStyle = "rgba(255,226,122,.55)"; ctx.lineWidth = 7; ctx.beginPath();
  for (const o of world.orbs) { if (!o.pull || !vis(o.x, o.y)) continue; const dx = o.x - p.x, dy = o.y - p.y, d = Math.hypot(dx, dy) || 1, L2 = Math.min(40, 14 + o.t * 30); ctx.moveTo(o.x, o.y); ctx.lineTo(o.x + dx / d * L2, o.y + dy / d * L2); }
  ctx.stroke();
  // 빛 방울은 금색 테두리(물방울 탄은 파랑·보라 테두리) — 한 번에 그린다
  ctx.strokeStyle = "#ffd75a"; ctx.lineWidth = 2.5; ctx.beginPath();
  for (const o of world.orbs) { if (!vis(o.x, o.y)) continue; const r = (o.v > 2 ? 24 : 17) * 0.4; ctx.moveTo(o.x + r, o.y); ctx.arc(o.x, o.y, r, 0, TAU); }
  ctx.stroke();
  // ? 진주
  for (const q of world.qpearls) {
    const pulse = 1 + Math.sin(q.t * 4) * 0.08, s = 46 * pulse;
    ctx.drawImage(GLOW_Q, q.x - s * 1.4, q.y - s * 1.4, s * 2.8, s * 2.8);
    if (!sprite("qpearl", q.x, q.y + Math.sin(q.t * 2) * 3, s)) {
      ctx.fillStyle = "#fff6e8"; ctx.beginPath(); ctx.arc(q.x, q.y, s * 0.42, 0, TAU); ctx.fill();
      ctx.fillStyle = "#c27bd8"; ctx.font = "900 " + Math.round(s * 0.5) + "px " + FONT; ctx.textAlign = "center"; ctx.textBaseline = "middle"; ctx.fillText("?", q.x, q.y + 1);
    }
  }
  // 곰치 경고
  for (const a of world.warns) {
    if (Math.floor(a.t * 8) % 2) continue;
    ctx.strokeStyle = "rgba(255,70,90,.38)"; ctx.lineWidth = 34; ctx.lineCap = "butt";
    ctx.beginPath(); ctx.moveTo(a.x1, a.y1); ctx.lineTo(a.x2, a.y2); ctx.stroke();
    ctx.strokeStyle = "rgba(255,255,255,.7)"; ctx.lineWidth = 3; ctx.setLineDash([14, 12]); ctx.stroke(); ctx.setLineDash([]);
    // 화면 가장자리 쪽 느낌표
    const ex = clamp(a.x1, cam.x + 30, cam.x + view.w - 30), ey = clamp(a.y1, cam.y + 70, cam.y + view.h - 30);
    ctx.fillStyle = "#ff5a5a"; ctx.beginPath(); ctx.arc(ex, ey, 17, 0, TAU); ctx.fill();
    ctx.fillStyle = "#fff"; ctx.font = "900 24px " + FONT; ctx.textAlign = "center"; ctx.textBaseline = "middle"; ctx.fillText("!", ex, ey + 1);
  }
  // 씻긴 친구: 원래 색으로 웃으며 헤엄쳐 간다
  for (const f of world.fx.freed) {
    if (!vis(f.x, f.y)) continue;
    const a = f.t < 1 ? 1 : 1 - (f.t - 1) / 0.4;
    ctx.globalAlpha = Math.max(0, a);
    // 씻기는 순간 '뽁' 하고 커졌다가(찌그러짐) 웃으며 헤엄쳐 간다
    const pop = f.t < 0.2 ? 1 + Math.sin(f.t / 0.2 * Math.PI) * 0.4 : 1;
    const w = EW[f.kind] * (f.kind === "boss" ? 1 : 0.95) * (f.elite ? L.ELITE.r : 1) * pop, wig = Math.sin(f.t * 14) * 0.12;
    if (f.t < 0.12) { ctx.globalAlpha = 0.8 * (1 - f.t / 0.12); ctx.fillStyle = "#ffffff"; ctx.beginPath(); ctx.arc(f.x, f.y, w * 0.55 * (1 + f.t * 4), 0, TAU); ctx.fill(); ctx.globalAlpha = Math.max(0, a); }
    if (!sprite(OK_ART[f.kind], f.x, f.y, w, false, wig, flipFor(f.kind, f.face))) friendShape(ctx, SHAPE_OF[f.kind] || f.kind, f.x, f.y, L.ENEMIES[f.kind].r * pop, 0, false, f.face, f.t);
    if (f.t < 0.6) { ctx.fillStyle = "#ffffff"; for (let i = 0; i < 3; i++) { ctx.beginPath(); ctx.arc(f.x + Math.cos(i * 2.1 + f.t * 3) * (12 + f.t * 40), f.y + Math.sin(i * 2.1 + f.t * 3) * (12 + f.t * 40), 3.5, 0, TAU); ctx.fill(); } }
    ctx.globalAlpha = 1;
  }
  // 센 물살: 옆으로 흐르는 줄무늬
  if (world.current) {
    const c = world.current, dir = c.vx > 0 ? 1 : -1, kk = Math.min(1, c.t / 0.6, (c.T - c.t) / 0.4);
    ctx.globalAlpha = 0.35 * Math.max(0, kk); ctx.strokeStyle = "#e6fbff"; ctx.lineWidth = 3; ctx.lineCap = "round"; ctx.beginPath();
    for (let i = 0; i < 22; i++) {
      const yy = cam.y + ((i * 97) % view.h), len = 60 + (i % 4) * 30, xx = cam.x + (((i * 173 + clock * 520 * dir) % (view.w + 200)) + view.w + 200) % (view.w + 200) - 100;
      ctx.moveTo(xx, yy); ctx.lineTo(xx - dir * len, yy);
    }
    ctx.stroke(); ctx.globalAlpha = 1;
  }
  // 친구들
  for (const e of world.enemies) if (vis(e.x, e.y)) drawEnemy(e);
  // 고래 친구: 지나가는 줄을 씻어 준다
  if (world.whale) {
    const h = world.whale, wd = 300, ht = wd * WHALE.height / WHALE.width;
    ctx.globalAlpha = 0.18; ctx.fillStyle = "#bff3ff"; ctx.fillRect(cam.x, h.y - h.band, view.w, h.band * 2); ctx.globalAlpha = 1;
    ctx.save(); ctx.translate(h.x, h.y + Math.sin(h.t * 3) * 6); if (h.vx < 0) ctx.scale(-1, 1); ctx.drawImage(WHALE, -wd / 2, -ht / 2, wd, ht); ctx.restore();
    ctx.fillStyle = "rgba(255,255,255,.8)"; for (let i = 0; i < 6; i++) { const bx = h.x - Math.sign(h.vx) * (150 + i * 26), by = h.y + Math.sin(h.t * 6 + i) * 30; ctx.beginPath(); ctx.arc(bx, by, 7 - i, 0, TAU); ctx.fill(); }
  }
  // 대왕 먹물 방울
  ctx.fillStyle = "#2b2550";
  for (const ink of world.inks) { if (!vis(ink.x, ink.y)) continue; ctx.beginPath(); ctx.arc(ink.x, ink.y, 10, 0, TAU); ctx.fill(); }
  ctx.fillStyle = "rgba(255,255,255,.5)";
  for (const ink of world.inks) { if (!vis(ink.x, ink.y)) continue; ctx.beginPath(); ctx.arc(ink.x - 3, ink.y - 3, 3, 0, TAU); ctx.fill(); }
  // 등대 빛 파동
  for (const q of world.fx.pulses) {
    const kk = q.t / 0.45, R = q.R * (0.3 + kk * 0.7);
    ctx.globalAlpha = (1 - kk) * 0.26; ctx.fillStyle = "#fff4b0"; ctx.beginPath(); ctx.arc(q.x, q.y, R, 0, TAU); ctx.fill();
    ctx.globalAlpha = (1 - kk) * 0.35; ctx.strokeStyle = "#fff6c0"; ctx.lineWidth = 26 + q.lv * 4; ctx.beginPath(); ctx.arc(q.x, q.y, R * 1.08, 0, TAU); ctx.stroke();
    ctx.globalAlpha = 1 - kk; ctx.strokeStyle = ["#fff6c0", "#ffe27a", "#ffc23c", "#ff9f5a", "#ffffff"][q.lv - 1] || "#fff"; ctx.lineWidth = 9 + q.lv * 3; ctx.beginPath(); ctx.arc(q.x, q.y, R, 0, TAU); ctx.stroke();
    if (q.lv >= 4) { ctx.lineWidth = 2; ctx.strokeStyle = "#ffb24a"; ctx.beginPath(); ctx.arc(q.x, q.y, R * 0.8, 0, TAU); ctx.stroke(); }
  }
  ctx.globalAlpha = 1;
  // 회오리 물살
  const ld = world.load;
  if (ld.weapons.whirl) {
    const s = L.weaponStats("whirl", ld.weapons.whirl, !!ld.evo.whirl, world.m), tex = s.evo ? SWIRL[5] : SWIRL[s.lv - 1];
    const wc = s.evo ? "#c58cff" : L.LV_COLORS[s.lv - 1];
    ctx.globalAlpha = 0.28; ctx.strokeStyle = wc; ctx.lineWidth = s.size * 1.6; ctx.beginPath(); ctx.arc(p.x, p.y, s.r, 0, TAU); ctx.stroke();
    // 물살 꼬리: 각 물살 뒤로 굵은 호 + 가는 흰 호
    ctx.lineCap = "round";
    for (let i = 0; i < s.n; i++) {
      const a = world.whirlAng + i * TAU / s.n;
      ctx.globalAlpha = 0.75; ctx.strokeStyle = wc; ctx.lineWidth = s.size * 1.25; ctx.beginPath(); ctx.arc(p.x, p.y, s.r, a - 1.1, a); ctx.stroke();
      ctx.globalAlpha = 0.9; ctx.strokeStyle = "#ffffff"; ctx.lineWidth = s.size * 0.35; ctx.beginPath(); ctx.arc(p.x, p.y, s.r, a - 0.7, a); ctx.stroke();
    }
    ctx.globalAlpha = 1;
    for (let i = 0; i < s.n; i++) {
      const a = world.whirlAng + i * TAU / s.n, ox = p.x + Math.cos(a) * s.r, oy = p.y + Math.sin(a) * s.r, sz = s.size * 2.6;
      ctx.save(); ctx.translate(ox, oy); ctx.rotate(-world.t * 9); ctx.drawImage(tex, -sz / 2, -sz / 2, sz, sz); ctx.restore();
    }
  }
  // 소라 부메랑
  for (const sh of world.shells) for (let gI = 3; gI >= 1; gI--) { // 회전 잔상
    const tt = sh.t - gI * 0.04; if (tt <= 0) continue;
    const kq = tt / sh.T, out = Math.sin(Math.PI * kq) * sh.dist, side = Math.sin(TAU * kq) * 34 * sh.k, ux = Math.cos(sh.a), uy = Math.sin(sh.a);
    ctx.globalAlpha = 0.42 - gI * 0.11; const gx = p.x + ux * out - uy * side, gy = p.y + uy * out + ux * side;
    if (!sprite("shell", gx, gy, sh.r * 2.3, false, tt * 14 * sh.k)) shellShape(ctx, gx, gy, sh.r, tt * 14 * sh.k);
  }
  ctx.globalAlpha = 1;
  for (const sh of world.shells) { const rot = sh.t * 14 * sh.k, g = sh.r * 3.2; ctx.drawImage(LV_GLOW[sh.lv - 1], sh.x - g / 2, sh.y - g / 2, g, g); if (!sprite("shell", sh.x, sh.y, sh.r * 2.3, false, rot)) shellShape(ctx, sh.x, sh.y, sh.r, rot); }
  // 탄: 방울·불가사리
  let ri = 0;
  // 꼬리: 방울은 뒤로 길게 남는 물줄기(단계 색), 불가사리는 빛나는 꼬리
  ctx.lineCap = "round";
  for (let pass = 0; pass < 2; pass++) for (const s of world.shots) {
    if (!vis(s.x, s.y)) continue;
    const tl = s.k === "b" ? 0.075 : 0.06, col = s.k === "b" ? (s.rainbow ? RAINBOW_COL[(s.x | 0) % 6] : BUB_COL[Math.min(4, s.lv - 1)]) : "#ffd27a";
    ctx.globalAlpha = pass ? 0.9 : 0.4; ctx.strokeStyle = pass ? "#ffffff" : col; ctx.lineWidth = pass ? s.r * 0.45 : s.r * 1.5;
    ctx.beginPath(); ctx.moveTo(s.x - s.vx * tl * (pass ? 0.6 : 1), s.y - s.vy * tl * (pass ? 0.6 : 1)); ctx.lineTo(s.x, s.y); ctx.stroke();
  }
  ctx.globalAlpha = 0.55;
  for (const s of world.shots) { if (s.k !== "b" || !vis(s.x, s.y)) continue; const g = s.r * 4.2; ctx.drawImage(GLOW_BUB, s.x - g / 2, s.y - g / 2, g, g); }
  ctx.globalAlpha = 1;
  for (const s of world.shots) {
    if (!vis(s.x, s.y)) continue;
    if (s.k === "b") {
      const sz = s.r * 2.6;
      if (s.rainbow) ctx.drawImage(RAINBOW[ri++ % 6], s.x - sz / 2, s.y - sz / 2, sz, sz);
      else ctx.drawImage(BUB[Math.min(4, s.lv)], s.x - sz / 2, s.y - sz / 2, sz, sz);
    } else {
      const sz = s.r * 2.6;
      ctx.drawImage(LV_GLOW[s.lv - 1], s.x - sz * 0.8, s.y - sz * 0.8, sz * 1.6, sz * 1.6);
      if (!sprite("star", s.x, s.y, sz, false, s.spin)) { ctx.save(); ctx.translate(s.x, s.y); ctx.rotate(s.spin); star5(ctx, 0, 0, s.r * 1.2, s.lv >= 5 ? "#ff6fae" : s.lv >= 3 ? "#ff8a4a" : "#ffad5a"); ctx.restore(); }
    }
  }
  // 전기: 굵은 띠 + 가는 흰 줄(지그재그는 seed 로 고정)
  ctx.lineJoin = "round"; ctx.lineCap = "round";
  for (const z of world.fx.zaps) {
    ctx.globalAlpha = Math.min(1, z.t / 0.12);
    ctx.beginPath();
    for (let i = 0; i < z.pts.length; i++) {
      const [x, y] = z.pts[i];
      if (!i) { ctx.moveTo(x, y); continue; }
      const [px, py] = z.pts[i - 1], dx = x - px, dy = y - py, len = Math.hypot(dx, dy) || 1, nx = -dy / len, ny = dx / len;
      for (let s = 1; s <= 3; s++) { const j = Math.sin(z.seed + i * 7 + s * 3.1 + clock * 30) * 10; ctx.lineTo(px + dx * s / 4 + nx * j, py + dy * s / 4 + ny * j); }
      ctx.lineTo(x, y);
    }
    const za = Math.min(1, z.t / 0.12);
    ctx.globalAlpha = za * 0.25; ctx.strokeStyle = "#fff6a0"; ctx.lineWidth = 26 + z.lv * 5; ctx.stroke();
    ctx.globalAlpha = za * 0.85; ctx.strokeStyle = L.LV_COLORS[z.lv - 1]; ctx.lineWidth = 11 + z.lv * 2.5; ctx.stroke();
    ctx.globalAlpha = za; ctx.strokeStyle = "#ffffff"; ctx.lineWidth = 3 + z.lv * 0.7; ctx.stroke();
  }
  ctx.globalAlpha = 1;
  // 맞을 때 터지는 작은 방울
  ctx.strokeStyle = "rgba(255,255,255,.85)"; ctx.lineWidth = 2;
  for (const q of world.fx.pops) { if (!vis(q.x, q.y)) continue; const kk = q.t / 0.35; ctx.globalAlpha = 1 - kk; ctx.beginPath(); ctx.arc(q.x, q.y - kk * 14, q.s * (0.6 + kk), 0, TAU); ctx.stroke(); }
  ctx.globalAlpha = 1;
  // 물보라 입자(색 번호별로 한 번에)
  if (partOn) for (let c = 0; c < PART_COL.length; c++) {
    ctx.fillStyle = PART_COL[c]; ctx.beginPath(); let any = false;
    for (const q of PARTS) { if (!q.on || q.c !== c) continue; const r = q.r * (1 - q.t / q.life * 0.7); ctx.moveTo(q.x + r, q.y); ctx.arc(q.x, q.y, r, 0, TAU); any = true; }
    if (any) ctx.fill();
  }
  // 퍼지는 고리
  for (const r of ringsM) { const kk = r.t / r.T; ctx.globalAlpha = Math.max(0, 1 - kk); ctx.strokeStyle = r.color; ctx.lineWidth = r.w * (1 - kk) + 1; ctx.beginPath(); ctx.arc(r.x, r.y, r.R * (0.3 + kk * 0.9), 0, TAU); ctx.stroke(); }
  ctx.globalAlpha = 1;
  // 발사 섬광: 잠수정 앞
  if (muzzle && muzzle.t < 0.08) {
    const mk = 1 - muzzle.t / 0.08, mx = p.x + Math.cos(muzzle.a) * 30, my = p.y + Math.sin(muzzle.a) * 30, ms = (44 + muzzle.lv * 10) * (0.7 + mk * 0.5);
    ctx.globalAlpha = mk; ctx.drawImage(GLOW_SUB, mx - ms / 2, my - ms / 2, ms, ms);
    ctx.fillStyle = "#ffffff"; ctx.beginPath(); ctx.ellipse(mx, my, ms * 0.28, ms * 0.14, muzzle.a, 0, TAU); ctx.fill(); ctx.globalAlpha = 1;
  }
  // 잠수정 꼬리: 빠를수록·슈웅!·터보일수록 길고 굵게(터보는 무지개)
  const fever = world.fever > 0;
  for (let i = 0; i < trail.length; i++) {
    const q = trail[i], kk = i / trail.length, r = (4 + q.s * 9) * kk;
    if (r < 1) continue;
    ctx.globalAlpha = kk * (fever ? 0.75 : 0.45);
    ctx.fillStyle = fever ? RAINBOW_COL[(i + Math.floor(clock * 12)) % 6] : q.d ? "#e6fbff" : "#bff3ff";
    ctx.beginPath(); ctx.arc(q.x, q.y, r, 0, TAU); ctx.fill();
  }
  ctx.globalAlpha = 1;
  drawSub(p, clock);
  // 효과 그림(fx_*.webp)
  for (const f of fxList) drawFxItem(f);
  // 떠오르는 글자
  ctx.textAlign = "center"; ctx.textBaseline = "middle"; ctx.lineJoin = "round";
  for (const f of floats) {
    const kk = f.t / f.life, sz = f.size * (kk < 0.15 ? 0.6 + kk / 0.15 * 0.5 : 1.1 - Math.min(0.1, (kk - 0.15)));
    ctx.globalAlpha = kk > 0.7 ? (1 - kk) / 0.3 : 1;
    ctx.font = "900 " + Math.round(sz) + "px " + FONT; ctx.lineWidth = 4; ctx.strokeStyle = "rgba(6,30,60,.85)";
    ctx.strokeText(f.text, f.x, f.y - kk * 34); ctx.fillStyle = f.color; ctx.fillText(f.text, f.x, f.y - kk * 34);
  }
  ctx.globalAlpha = 1;
  // 밀어내는 물결
  for (const r of world.fx.rings) { if (r.t < 0) continue; const kk = r.t / (r.T || 0.6); ctx.globalAlpha = Math.max(0, 1 - kk); ctx.strokeStyle = r.color; ctx.lineWidth = (r.big ? 22 : 8) * (1 - kk) + 1; ctx.beginPath(); ctx.arc(r.x, r.y, 20 + kk * r.R, 0, TAU); ctx.stroke(); if (r.big) { ctx.globalAlpha = Math.max(0, 1 - kk) * 0.12; ctx.fillStyle = r.color; ctx.fill(); } }
  ctx.globalAlpha = 1;
  // 장비를 고른 순간: 장비 그림이 커졌다가 잠수정으로 쏙 들어간다
  if (equipFx) { const k2 = equipFx.t / 1.1, sz = 70 * (k2 < 0.3 ? 0.6 + k2 * 2 : 1.2 - (k2 - 0.3) * 1.3), yy = p.y - 70 * (1 - Math.max(0, (k2 - 0.3) / 0.7)); ctx.globalAlpha = k2 < 0.85 ? 1 : (1 - k2) / 0.15; ctx.drawImage(equipFx.img, p.x - sz / 2, yy - sz / 2, sz, sz); ctx.globalAlpha = 1; }
  ctx.globalAlpha = 1;
  // 화면 위 꾸밈
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  rays(k);
  if (fever) { ctx.globalAlpha = 0.55 + Math.sin(clock * 10) * 0.25; ctx.drawImage(FEVER_EDGE, 0, 0, canvas.width, canvas.height); ctx.globalAlpha = 1; }
  if (edgeFlash > 0) { ctx.globalAlpha = Math.min(0.75, edgeFlash * 2.5); ctx.drawImage(EDGE_FLASH, 0, 0, canvas.width, canvas.height); ctx.globalAlpha = 1; }
  if (flash > 0) { ctx.fillStyle = "rgba(255,255,255," + Math.min(0.45, flash * 1.8).toFixed(2) + ")"; ctx.fillRect(0, 0, canvas.width, canvas.height); }
  // 한 번에 여러 마리: 가운데 큰 글자가 튀어 오른다
  if (multiBan && mode === "play") {
    ctx.setTransform(k, 0, 0, k, 0, 0);
    const mt = multiBan.t, pop = mt < 0.15 ? 0.5 + mt / 0.15 * 0.75 : mt < 0.3 ? 1.25 - (mt - 0.15) / 0.15 * 0.25 : 1, px = [34, 42, 52][multiBan.tier] * pop;
    ctx.globalAlpha = mt > 0.8 ? Math.max(0, (1.1 - mt) / 0.3) : 1;
    ctx.font = "900 " + Math.round(px) + "px " + FONT; ctx.textAlign = "center"; ctx.textBaseline = "middle"; ctx.lineJoin = "round"; ctx.lineWidth = 9; ctx.strokeStyle = "rgba(6,30,60,.92)";
    const my = view.h * 0.7 - mt * 20; ctx.strokeText(multiBan.text, view.w / 2, my);
    ctx.fillStyle = multiBan.tier === 2 ? RAINBOW_COL[Math.floor(clock * 12) % 6] : multiBan.tier === 1 ? "#ff9ee0" : "#7dffb0"; ctx.fillText(multiBan.text, view.w / 2, my);
    ctx.globalAlpha = 1;
  }
  // 콤보 숫자(오른쪽 위): 단계 이름과 색, 단계가 바뀌면 튀어 오른다
  if (world.combo >= 3 && mode === "play") {
    ctx.setTransform(k, 0, 0, k, 0, 0);
    const c = world.combo, sz = Math.min(44, 22 + Math.log2(c) * 4), bump = (world.comboT > L.FEVER.gap - 0.1 ? 1.12 : 1) * (1 + comboPop * 0.9);
    ctx.textAlign = "right"; ctx.textBaseline = "middle"; ctx.lineJoin = "round";
    ctx.font = "900 " + Math.round(sz * bump) + "px " + FONT; ctx.lineWidth = 6; ctx.strokeStyle = "rgba(6,30,60,.88)";
    const cx = view.w - 16, cy = 92;
    ctx.globalAlpha = Math.min(1, world.comboT / 0.4 + 0.3);
    const ti = L.comboTier(c), T = ti >= 0 ? L.COMBO_TIERS[ti] : null;
    ctx.strokeText(c + " 콤보", cx, cy); ctx.fillStyle = !T ? "#ffe27a" : T.color === "rainbow" ? RAINBOW_COL[Math.floor(clock * 10) % 6] : T.color; ctx.fillText(c + " 콤보", cx, cy);
    if (T) { ctx.font = "900 " + Math.round(20 * (1 + comboPop)) + "px " + FONT; ctx.lineWidth = 5; ctx.strokeText(T.name, cx, cy + sz * 0.75); ctx.fillText(T.name, cx, cy + sz * 0.75); }
    ctx.globalAlpha = 1;
  }
  // 가상 스틱(옅게)
  if (stick && mode === "play") {
    const dx = stick.x - stick.ax, dy = stick.y - stick.ay, d = Math.hypot(dx, dy), m = Math.min(1, L.STICK_R / Math.max(1, d));
    ctx.globalAlpha = 0.22; ctx.fillStyle = "#ffffff"; ctx.beginPath(); ctx.arc(stick.ax * dpr, stick.ay * dpr, L.STICK_R * dpr, 0, TAU); ctx.fill();
    ctx.globalAlpha = 0.5; ctx.beginPath(); ctx.arc((stick.ax + dx * m) * dpr, (stick.ay + dy * m) * dpr, 24 * dpr, 0, TAU); ctx.fill();
    ctx.globalAlpha = 1;
  }
  if (bannerT > 0 && mode !== "over") {
    const by = mode === "play" || mode === "paused" ? view.h * 0.26 : view.h * 0.74;
    ctx.setTransform(k, 0, 0, k, 0, 0);
    // 아주 큰 글자는 튀어나오듯 커졌다가 자리 잡는다
    const age = bannerT0 - bannerT, pop = bannerHuge && age < 0.25 ? 0.6 + age / 0.25 * 0.55 : bannerHuge && age < 0.4 ? 1.15 - (age - 0.25) / 0.15 * 0.15 : 1;
    const maxPx = bannerHuge ? 40 : 26, px = Math.min(maxPx, Math.max(16, Math.floor(view.w * 0.94 / Math.max(1, banner.length)))) * pop;
    ctx.globalAlpha = Math.min(1, bannerT * 2); ctx.font = (bannerBig ? "900 " + Math.round(px) + "px " : "800 21px ") + FONT; ctx.textAlign = "center"; ctx.textBaseline = "middle";
    ctx.lineWidth = bannerHuge ? 8 : 6; ctx.lineJoin = "round"; ctx.strokeStyle = "rgba(6,30,60,.9)"; ctx.strokeText(banner, view.w / 2, by);
    ctx.fillStyle = bannerBig ? (world && world.fever > 0 && banner.startsWith("무지개") ? RAINBOW_COL[Math.floor(clock * 10) % 6] : "#ffe27a") : "#ffffff"; ctx.fillText(banner, view.w / 2, by);
    if (bannerSub) { ctx.font = "800 " + Math.min(19, Math.max(13, Math.floor(view.w * 0.9 / Math.max(1, bannerSub.length)))) + "px " + FONT; ctx.lineWidth = 5; ctx.strokeText(bannerSub, view.w / 2, by + px * 0.5 + 18); ctx.fillStyle = "#ffffff"; ctx.fillText(bannerSub, view.w / 2, by + px * 0.5 + 18); }
    ctx.globalAlpha = 1;
  }
}
// 빛줄기 셋(미리 그린 띠를 비스듬히 늘여 붙인다)
function rays(k) {
  ctx.globalAlpha = 0.07;
  for (let i = 0; i < 3; i++) {
    const x = ((i * 0.37 + clock * 0.012 * (i + 1)) % 1.3 - 0.15) * canvas.width;
    ctx.save(); ctx.translate(x, -20); ctx.rotate(0.35); ctx.drawImage(RAY, -90 * k, 0, 180 * k, canvas.height * 1.4); ctx.restore();
  }
  ctx.globalAlpha = 1;
}

let last = performance.now(), lastUpdateMs = 0, lastRenderMs = 0;
// 화면 꾸밈 시계(글자·번쩍임·물결). 게임 시간과는 따로 간다.
function ui(dt) {
  clock += dt; if (bannerT > 0) bannerT -= dt; if (flash > 0) flash -= dt;
  if (shakeT > 0) { shakeT -= dt; if (shakeT <= 0) shakeA = 0; }
  if (equipFx) { equipFx.t += dt; if (equipFx.t > 1.1) equipFx = null; }
  for (const f of fxList) f.t += dt; if (fxList.length) fxList = fxList.filter(f => f.t < f.dur);
  for (const f of floats) f.t += dt; if (floats.length) floats = floats.filter(f => f.t < f.life);
  hitBudget = 8;
  partOn = 0;
  const drag = Math.max(0, 1 - dt * 3.2);
  for (const q of PARTS) { if (!q.on) continue; q.t += dt; if (q.t >= q.life) { q.on = false; continue; } q.x += q.vx * dt; q.y += q.vy * dt; q.vx *= drag; q.vy *= drag; partOn++; }
  for (const r of ringsM) r.t += dt; if (ringsM.length) ringsM = ringsM.filter(r => r.t < r.T);
  if (muzzle) { muzzle.t += dt; if (muzzle.t > 0.1) muzzle = null; }
  if (multiBan) { multiBan.t += dt; if (multiBan.t > 1.1) multiBan = null; }
  if (comboPop > 0) comboPop = Math.max(0, comboPop - dt * 1.6);
  if (edgeFlash > 0) edgeFlash -= dt;
  // 터보 중 낮은 북소리 리듬 + 회오리 반짝이
  if (world && mode === "play") {
    if (world.fever > 0) { feverBeat -= dt; if (feverBeat <= 0) { feverBeat = 0.25; sfx.bass(beatN++); } } else beatN = 0;
    const ld = world.load;
    if (ld.weapons.whirl && Math.random() < 0.6) { const s2 = L.weaponStats("whirl", ld.weapons.whirl, !!ld.evo.whirl, world.m), a = world.whirlAng + ((Math.random() * s2.n) | 0) * TAU / s2.n; burst(world.p.x + Math.cos(a) * s2.r, world.p.y + Math.sin(a) * s2.r, 1, 60, 0, 3, 0.4); }
  }
  // 꼬리: 잠수정 자리를 기억(빠를수록 크게)
  if (world && mode === "play") {
    const p = world.p, sp = Math.hypot(p.vx, p.vy) / L.SUB_SPEED, dashing = p.dashT > 0;
    trail.push({ x: p.x, y: p.y, s: Math.min(2, sp + (dashing ? 1 : 0) + (world.fever > 0 ? 0.6 : 0)), d: dashing });
    const maxLen = world.fever > 0 ? 22 : dashing ? 18 : 12;
    while (trail.length > maxLen) trail.shift();
  }
  // 문제·카드 화면 동안에도 물결과 씻긴 친구는 움직인다(게임 시간은 멈춘 채)
  if (world && (mode === "quiz" || mode === "cards")) E.stepFx(world, dt);
}
function frame(now) {
  const dt = Math.min(0.05, Math.max(0, (now - last) / 1000)); last = now;
  ui(dt);
  const t0 = performance.now();
  // 멈칫(hit-stop): 아주 잠깐 게임 시간을 세운다(최대 40ms)
  if (hitStop > 0) hitStop -= dt;
  else if (mode === "play" && world && !document.hidden) update(dt);
  const t1 = performance.now();
  render();
  lastUpdateMs = t1 - t0; lastRenderMs = performance.now() - t1;
  requestAnimationFrame(frame);
}

/* ---------- 시작 화면 ---------- */
const pilotBox = $("pilots"), zoneBox = $("zones");
function pickPilot(i) {
  if (!(i >= 0 && i < L.PILOTS.length)) return;
  pilot = i; try { localStorage.setItem(L.PILOT_KEY, String(i)); } catch (_) {}
  if (GameQuiz) GameQuiz.setKid(L.PILOTS[i].kid);
  [...pilotBox.children].forEach((c, k) => c.setAttribute("aria-pressed", String(k === i)));
  paintBest();
}
L.PILOTS.forEach((p, i) => {
  const b = document.createElement("button"); b.type = "button"; b.className = "pilot"; b.setAttribute("aria-pressed", String(i === pilot));
  const img = document.createElement("img"); img.className = "face"; img.alt = ""; img.draggable = false; img.src = "art/" + p.art + ".webp?v=1";
  img.onerror = () => { const dot = document.createElement("i"); dot.className = "dot"; dot.style.background = p.color; img.replaceWith(dot); };
  const name = document.createElement("span"); name.textContent = p.name;
  b.append(img, name);
  b.addEventListener("click", () => { pickPilot(i); sfx.pearl(); });
  pilotBox.appendChild(b);
});
function paintZones() {
  zoneBox.innerHTML = "";
  for (const z of L.ZONES) {
    if (!save.zones.includes(z.id)) continue;
    const b = document.createElement("button"); b.type = "button"; b.className = "zone"; b.textContent = z.name; b.setAttribute("aria-pressed", String(z.id === zoneId));
    b.addEventListener("click", () => { zoneId = z.id; save.zone = z.id; writeSave(); paintZones(); sfx.pearl(); floorPat = null; });
    zoneBox.appendChild(b);
  }
  const next = L.ZONES.find(z => !save.zones.includes(z.id));
  if (next) { const s = document.createElement("span"); s.className = "small"; s.style.alignSelf = "center"; s.textContent = "다음 바다: 진주 " + next.need; zoneBox.appendChild(s); }
}
function paintBest() {
  const b = save.best[L.PILOTS[pilot].kid];
  $("bestLine").textContent = b && b.runs ? L.PILOTS[pilot].name + " 기록 · 가장 오래 버틴 시간 " + Math.floor(b.time / 60) + "분 " + (b.time % 60) + "초 · 한 판에 맞힌 문제 " + b.solved + "개" : "";
}
function paintStart() {
  if (!save.zones.includes(zoneId)) zoneId = "coral";
  paintZones(); paintBest();
  $("chest").textContent = "가족 진주함 " + save.pearls;
  const open = L.GIFTS.filter(g => save.gifts.includes(g.id)), next = L.GIFTS.find(g => !save.gifts.includes(g.id));
  $("giftLine").textContent = (open.length ? "출발 선물: " + open.map(g => g.name).join(" · ") : "") + (next ? (open.length ? " / " : "") + "진주 " + next.need + "개면 ‘" + next.name + "’" : "");
}
function paintDex() {
  const grid = $("dexGrid"); grid.innerHTML = "";
  for (const k of L.DEX_IDS) {
    const n = save.dex[k] || 0, E2 = L.ENEMIES[k], box = document.createElement("div");
    box.className = "friend" + (n ? "" : " locked");
    const c = document.createElement("canvas"); c.width = c.height = 96;
    const x = c.getContext("2d");
    if (n) { if (!drawArt(x, E2.okArt, 48, 48, k === "boss" ? 90 : 76)) drawFriendIcon(x, k); }
    else { x.fillStyle = "rgba(255,255,255,.25)"; x.font = "900 48px " + FONT; x.textAlign = "center"; x.textBaseline = "middle"; x.fillText("?", 48, 50); }
    const name = document.createElement("div"); name.textContent = n ? E2.ok : "???";
    const cnt = document.createElement("span"); cnt.textContent = k === "boss" ? (save.bossRescued ? "구해 준 횟수 " + save.bossRescued : "아직 못 만났어요") : n ? n + "마리 구해 줬어요" : "아직 못 만났어요";
    box.append(c, name, cnt); grid.appendChild(box);
  }
  let total = 0; for (const k of L.DEX_IDS) total += save.dex[k] || 0;
  $("dexNote").textContent = "가족이 함께 구해 준 친구 " + total + "마리";
}
// 도감 그림이 없을 때: 도형 친구를 작은 캔버스에 그린다
function drawFriendIcon(x, kind) { friendShape(x, SHAPE_OF[kind] || kind, 48, 50, kind === "boss" ? 30 : kind === "eel" ? 16 : 24, 0, false, 1, 0); }
$("dexBtn").addEventListener("click", () => { paintDex(); $("start").hidden = true; $("dex").hidden = false; });
$("dexClose").addEventListener("click", () => { $("dex").hidden = true; $("start").hidden = false; });
$("startBtn").addEventListener("click", () => begin());
$("againBtn").addEventListener("click", () => begin());
$("menuBtn").addEventListener("click", toMenu);
$("pauseBtn").addEventListener("click", () => { if (mode === "play") pause(); else if (mode === "paused") unpause(); });
$("resumeBtn").addEventListener("click", unpause);
$("quitBtn").addEventListener("click", toMenu);
const soundBtn = $("sound");
function paintSound() { soundBtn.setAttribute("aria-pressed", String(soundOn)); soundBtn.textContent = soundOn ? "♪" : "♪×"; }
soundBtn.addEventListener("click", () => { soundOn = !soundOn; try { localStorage.setItem(L.SOUND_KEY, soundOn ? "1" : "0"); } catch (_) {} paintSound(); });
paintSound();
paintStart();
addEventListener("resize", resize);
resize();

/* ---------- 검증 훅(?qa=1 일 때만) ---------- */
if (QA) {
  const give = (id, lv = 1) => {
    if (!world) return;
    let c;
    if (L.WEAPONS[id]) c = { kind: "weapon", id, lv };
    else if (L.SUPPORTS[id]) c = { kind: "support", id, lv };
    else if (L.COMBOS[id]) { const C = L.COMBOS[id]; let ld = world.load; ld = L.applyCard(ld, { kind: "weapon", id: C.weapon, lv: 5 }); ld = L.applyCard(ld, { kind: "support", id: C.support, lv: Math.max(1, ld.supports[C.support] || 1) }); E.setLoadout(world, ld); c = { kind: "combo", id }; }
    if (c) E.setLoadout(world, L.applyCard(world.load, c), c);
    hudKey = ""; hud();
  };
  window.__dive = {
    begin, toMenu, pause, unpause,
    tick: (dt = 1 / 60, n = 1) => { for (let i = 0; i < n && mode === "play"; i++) update(dt); },
    step: (dt = 1 / 60, n = 1) => { for (let i = 0; i < n; i++) { ui(dt); if (mode === "play") update(dt); render(); } },
    get s() { return world ? { mode, t: +world.t.toFixed(2), hearts: world.hearts, maxHearts: world.maxHearts, xp: world.xp, goal: E.xpGoal(world), qpearls: world.qpearls.length, pearlN: world.pearlN, enemies: world.enemies.length, vis: world.vis, shots: world.shots.length, orbs: world.orbs.length, rescued: world.rescued, solved: world.solved, streak: world.streak, load: world.load, boss: !!world.boss, pending: world.pending, over: world.over, rescueUsed: world.rescueUsed, pilot, zone: zoneId, p: { x: Math.round(world.p.x), y: Math.round(world.p.y) }, stick: !!stick,
      combo: world.combo, bestCombo: world.bestCombo, gauge: +world.gauge.toFixed(3), fever: +world.fever.toFixed(2), fevers: world.fevers, dashCd: +Math.max(0, world.dashCd).toFixed(2), dashes: world.dashes, autoDashes: world.autoDashes, events: world.eventsSeen.slice(), whale: !!world.whale, current: !!world.current, firstPearlT: world.firstPearlT, fx: fxList.length, floats: floats.length, parts: partOn, multis: world.multis.slice(), banner, sound: S.stats() } : { mode, pilot, zone: zoneId }; },
    // 슈웅!·무지개 터보·이벤트를 바로 일으키기, 끌기 대신 움직임 정하기
    dash: (x, y) => { if (x != null) qaMove = { x, y }; const ok = doDash(); return ok; },
    fever: () => { if (world) { E.startFever(world); handleEvents(); } },
    event: (id, kind) => { if (world) { E.startEventQA(world, { id, kind }); handleEvents(); } },
    move: (x, y) => { qaMove = x == null ? null : { x, y }; },
    blast: (firstTry = true) => world && rewardBlast(firstTry),
    hitStop: () => hitStop,
    get save() { return save; },
    world: () => world,
    levelUp: () => { if (world) { E.gainXp(world, E.xpGoal(world) - world.xp); } },
    pearlHere: () => { if (world) world.qpearls.push({ x: world.p.x, y: world.p.y, t: 0 }); },
    give, spawn: (kind, n = 1) => { for (let i = 0; i < n; i++) E.spawnEnemy(world, kind); },
    spawnNear: (kind, dx = 80, dy = 0) => E.spawnEnemy(world, kind, { x: world.p.x + dx, y: world.p.y + dy }),
    setT: t => { if (world) world.t = t; }, hurt: () => world && E.hurt(world),
    setPilot: pickPilot, cards: () => cardsShown, openCards: (firstTry = true) => { if (world && mode === "play") openCards({ firstTry }); return cardsShown; }, quiz: () => (GameQuiz ? GameQuiz.peek() : null),
    answer: () => { const q = GameQuiz && GameQuiz.peek(); return q && q.kind === "ask" ? q.answer : null; },
    guard: () => { if (guard) return { panel: guard.panel.id, armIn: Math.round(guard.armAt - performance.now()) }; const q = GameQuiz && GameQuiz.peek(); return q ? { panel: "quiz", armIn: q.armIn } : null; },
    timing: () => ({ update: lastUpdateMs, render: lastRenderMs }),
    bench: (n = 60) => { const t0 = performance.now(); let up = 0, rd = 0, worst = 0; for (let i = 0; i < n; i++) { const a = performance.now(); ui(1 / 60); if (mode === "play") update(1 / 60); const b = performance.now(); render(); const c = performance.now(); up += b - a; rd += c - b; worst = Math.max(worst, c - a); } return { frames: n, updateMs: +(up / n).toFixed(2), renderMs: +(rd / n).toFixed(2), totalMs: +((performance.now() - t0) / n).toFixed(2), worstMs: +worst.toFixed(2), enemies: world ? world.enemies.length : 0, fx: fxList.length }; },
    art: () => Object.keys(ART), view: () => ({ view, scale, dpr }),
  };
}
requestAnimationFrame(frame);
