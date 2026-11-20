// 딥 다이브 — 꼬마 잠수정 자동 공격 생존 게임. 먹물에 물든 바다 친구를 씻어 주고, ? 진주 문제를 맞히면 장비를 골라 세진다.
// 규칙 표는 logic.js, 바다 속 한 걸음은 engine.js, 여기서는 그리기·입력·화면·저장.
// 그림은 art/ 의 그림 파일을 쓰고, 못 읽으면 캔버스 도형으로 대신 그린다. shadowBlur 는 쓰지 않는다(아이패드에서 가장 느리다).
import * as L from "./logic.js?v=4";
import * as E from "./engine.js?v=4";
import * as S from "./sfx.js?v=5";
import * as F from "./fx.js?v=4";

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
  im.onload = () => { ART[n] = im; if (INKY.has(n) || n.endsWith("_ok")) WHITE[n] = whiten(im); if (n === "floor") floorPat = null; if (n === "zapjelly" || n === "bubble" || n === "shell" || n === "star") iconCache.clear(); };
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
const BUB = { 1: bubbleTex("150,235,255", "#ffffff"), 2: bubbleTex("90,190,255", "#d8f2ff"), 3: bubbleTex("255,205,70", "#fff6d0"), 4: bubbleTex("255,150,50", "#ffe8c8") };
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
  size *= AREA;
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
let recoil = null;
let lastMulti0 = -9, hitBudget = 8, muzzle = null, multiBan = null, comboPop = 0, edgeFlash = 0, feverBeat = 0, beatN = 0;
function floatText(x, y, text, color = "#ffffff", size = 16, life = 0.8) {
  if (floats.length >= FLOAT_MAX) floats.shift();
  floats.push({ x, y, text, color, size, t: 0, life });
}
/* 카메라 손맛: 흔들림은 '충격량(trauma 0~1)'의 제곱만큼(크게 맞을수록 확 커지고 빨리 잦아든다), 화면 px 최대 14.
   움직임 줄이기(prefers-reduced-motion)를 켠 기기는 흔들림·번쩍임·확대를 크게 줄인다. */
let AREA = 1;
const RM = (() => { try { return matchMedia("(prefers-reduced-motion: reduce)").matches; } catch (_) { return false; } })();
let trauma = 0, zoomK = 0, flashCol = "255,255,255", lastFullFlash = -9, cine = 0, slowK = 1, slowT = 0, dimA = 0, dimTo = 0, lbox = 0, lboxTo = 0, speedA = 0, speedCol = "#ffffff";
const shake = (amp, t) => { trauma = Math.min(1, Math.max(trauma, amp / 6 + t * 0.4)); shakeT = Math.max(shakeT, t); };
const stopFor = ms => { hitStop = Math.max(hitStop, Math.min(60, ms) / 1000); };                         // 최대 60ms(약 4프레임)
const punch = z => { if (!RM) zoomK = Math.max(zoomK, Math.min(0.1, z)); };                              // 화면 확 당기기
// 화면 전체 번쩍임: 1초에 3번을 넘지 않게(0.34초 안의 두 번째는 건너뜀), 흰색은 반투명으로 짧게
function setFlash(a, rgb = "255,255,255") {
  if (clock - lastFullFlash < 0.34) return;
  lastFullFlash = clock; flashCol = rgb; flash = Math.max(flash, (RM ? 0.35 : 1) * Math.min(0.4, a));
}
// 잠깐 느리게(꾸밈 시계만 — 게임 시간은 cine 동안 멈춰 있거나 그대로 흐른다)
const slowmo = (k, t) => { if (RM) return; slowK = Math.min(slowK, k); slowT = Math.max(slowT, t); };
// 시뮬레이션을 잠깐 통째로 세운다(멈춘 동안 게임 시간이 흐르지 않으니 결과는 그대로)
const cinema = t => { cine = Math.max(cine, t); };

/* ---------- 화면 크기: 짧은 변이 논리 540 ---------- */
let vw = 1, vh = 1, dpr = 1, scale = 1, view = { w: 720, h: 540 }, floorPat = null, floorKey = "", causticPat = null;
function resize() {
  vw = Math.max(1, innerWidth); vh = Math.max(1, innerHeight);
  dpr = Math.min(devicePixelRatio || 1, 1.5);
  // 폰(짧은 변 500px 미만)에서는 넓게 퍼지는 꾸밈을 0.72배로(규칙과 무관)
  AREA = Math.min(vw, vh) < 500 ? 0.72 : 1; F.setArea(AREA);
  canvas.width = Math.round(vw * dpr); canvas.height = Math.round(vh * dpr);
  scale = Math.min(vw, vh) / 540;
  view = { w: vw / scale, h: vh / scale };
  if (world) world.view = view;
  if (demo) demo.view = view;
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
// 시작 화면 뒤에서 저절로 헤엄치는 보기 판(소리·문제·저장·다침 없음). 끄기: ?qa=1&nodemo=1
let demo = null, demoGoal = null, demoGoalT = 0;
const DEMO_ON = !(QA && QS.get("nodemo") === "1");
let camBiasX = 0, camBiasY = 0;
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
function say(text, big, sub = "", huge = false) { banner = text; bannerT = huge ? 1.8 : big ? 1.6 : 1.4; bannerT0 = bannerT; bannerBig = !!big; bannerSub = sub; bannerHuge = huge; }

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
const QUIZ_THEME_BIG = { top: 60, bg: "rgba(40,20,90,.96)", accent: "#ffd0ff" };
function openQuiz() {
  mode = "quiz"; clearInput();
  if (!GameQuiz) { openCards({ firstTry: false, noQuiz: true }); return; }
  GameQuiz.ask({
    kid: L.PILOTS[pilot].kid, title: "맞히면 물결 + 새 장비!", hint: "한 번에 맞히면 물결이 친구들을 씻어 주고 하트도 채워요", theme: QUIZ_THEME,
    onWrong: () => sfx.no(),
    closeDelay: 520,
    // 한 번에 맞히면: 문제 창이 닫힌 뒤 화면 가득 필살기(깨끗깨끗 대파도)를 보여 주고 카드. 고쳐 맞히면 작은 물결을 바로.
    // 보통 ? 진주: 한 번에 → 물결 파도(작은 물결 + 하트), 고쳐서 → 작은 물결. 필살기는 큰 진주(어려운 문제)에서만.
    onCorrect: r => { E.recordQuiz(world, r.firstTry); return rewardBlast(r.firstTry ? "wave" : "near"); },
    onDone: r => { if (mode !== "quiz") return; openCards({ firstTry: r.firstTry }); },
  });
}
/* ---------- 필살기: 깨끗깨끗 대파도 (한 번에 맞힌 보상, 약 2.1초) ----------
   0.00 화면이 어두워지고 위아래 띠 · 조종사 그림이 옆에서 쓱 들어오며 기술 이름
   0.25~0.9 빛이 잠수정으로 빨려 들어가며 모인다(낮은 소리가 올라간다)
   0.95 펑! 여기서 E.quizBlast(예전과 같은 규칙·같은 순서 — 게임 시간은 이 동안 멈춰 있다) · 물결이 퍼지는 순서대로 친구가 하나씩 씻긴다
   1.9~2.1 잔광이 남고 원래 화면으로 → 카드 고르기 */
const ULT_NAME = "깨끗깨끗 대파도";
const ULT_T = 2.1, ULT_HIT = 0.72, ULT_WAVE = 0.7;
let ult = null, ultV = 1, ultO = null;
// 늦게 터뜨릴 꾸밈(필살기 물결이 닿는 순서·대왕 끝 장면 단계). 한 번에 몰아 만들지 않게 시각순으로 꺼낸다.
let later = [];
const LATER_MAX = 200;
function afterFx(delay, kind, x, y, a = 0) { if (later.length < LATER_MAX) later.push({ at: clock + delay, kind, x, y, a }); }
// 큰 진주 → 어려운 문제(공통 문제 모듈이 고른 한 단계 위 문제). 한 번에 → 필살기, 고쳐서 → 큰 물결. 장비 카드는 없다.
function resumePlay() { if (!world) return; E.resumeAfter(world); hudKey = ""; hud(); mode = "play"; clearInput(); last = performance.now(); releaseWave(); }
function openChallenge() {
  mode = "quiz"; clearInput();
  if (!GameQuiz) { E.returnBig(world); mode = "play"; return; }
  try {
    GameQuiz.ask({
      kid: L.PILOTS[pilot].kid, pace: "challenge", title: "어려운 문제! 맞히면 필살기!", hint: "한 번에 맞히면 " + ULT_NAME + "! 고쳐서 맞혀도 큰 물결", theme: QUIZ_THEME_BIG,
      onWrong: () => sfx.no(),
      onCorrect: r => { E.recordChallenge(world, r.firstTry); if (r.firstTry) return ULT_NAME + " 준비!"; return rewardBlast("mid"); },
      onDone: r => { if (mode !== "quiz") return; if (r.firstTry) startUlt(resumePlay); else resumePlay(); },
    });
  } catch (_) { E.returnBig(world); mode = "play"; }
}
function startUlt(next) {
  mode = "ult"; clearInput();
  ult = { t: 0, next, fired: false, n: 0, healed: false, shown: 0, maxD: 1 };
  dimTo = 0.68; lboxTo = 1; sfx.ultCharge();
  slowmo(0.6, 0.6);
}
function ultFire() {
  const p = world.p;
  const r = E.quizBlast(world, true);
  ult.fired = true; ult.n = r.n; ult.healed = r.healed;
  // 씻긴 친구들은 물결 앞머리가 닿는 순서대로 나타난다(꾸밈만 늦춘다: 시작 시각을 거꾸로 당겨 둔다)
  const fr = world.fx.freed; let maxD = 1;
  for (const f of fr) if (f.t === 0) maxD = Math.max(maxD, Math.hypot(f.x - p.x, f.y - p.y));
  ult.maxD = maxD; ultV = maxD / ULT_WAVE; ultO = { x: p.x, y: p.y };
  for (const f of fr) { if (f.t !== 0) continue; const lag = Math.hypot(f.x - p.x, f.y - p.y) / ultV; f.t = -lag; f.x -= f.vx * lag; f.y -= f.vy * lag; f.ult = true; }
  handleEvents();
  ultO = null;
  sfx.ultBlast(); sfx.fanfare(true);
  const R = Math.max(view.w, view.h);
  bigBurst(p.x, p.y, R, 1);
  setFlash(0.22, "190,245,255"); shake(10, 0.5); punch(0.08); slowmo(0.3, 0.25); dimTo = 0.55;
  F.ambientPush(view.w / 2, view.h / 2, Math.max(view.w, view.h), 900);
  hudKey = ""; hud();
}
function ultStep(dt) {
  const u = ult; u.t += dt;
  const p = world.p;
  if (!u.fired && u.t > 0.18 && u.t < ULT_HIT - 0.05) {
    // 모으기: 빛 줄과 물방울이 소용돌이치며 잠수정으로 빨려 든다
    F.implode(p.x, p.y, 3, 260, -1, 1, 0.42, 3); F.implode(p.x, p.y, 1, 200, 1, 4, 0.4, 4);
    if (Math.random() < 0.6) { const a = Math.random() * TAU, r = 180, v = r / 0.5; F.spark(p.x + Math.cos(a) * r, p.y + Math.sin(a) * r, -Math.cos(a) * v - Math.sin(a) * v * 0.5, -Math.sin(a) * v + Math.cos(a) * v * 0.5, 0.5, 4 + Math.random() * 4, 0, 3, 0, 0); }
  }
  // 펑 뒤: 무지개 반짝이가 천천히 내려앉는 잔광
  if (u.fired && u.t < 1.9 && Math.random() < 0.8) F.spark(p.x + (Math.random() - 0.5) * view.w, p.y + (Math.random() - 0.5) * view.h, (Math.random() - 0.5) * 30, 40 + Math.random() * 40, 1.0, 5 + Math.random() * 4, -1, 2, 0, 0.5);
  if (!u.fired && u.t >= ULT_HIT) ultFire();
  if (u.fired) {
    // 씻긴 수가 물결을 따라 올라간다
    const k = Math.min(1, (u.t - ULT_HIT) / ULT_WAVE); u.shown = Math.round(u.n * k);
    if (u.t > 1.55) { dimTo = 0; lboxTo = 0; }
  }
  if (u.t >= ULT_T) {
    const n = u.next; ult = null; dimTo = 0; lboxTo = 0;
    const msg = (u.n ? "친구 " + u.n + "마리 씻김" : "바다가 깨끗해졌어요") + (u.healed ? " · 하트 +1" : "");
    say(ULT_NAME + "!", true, msg, true);
    n();
  }
}
// 필살기 화면 위 그림: 조종사 띠(그림 + 기술 이름) · 씻긴 수
function drawUltOverlay(k) {
  const u = ult; if (!u) return;
  ctx.setTransform(k, 0, 0, k, 0, 0);
  const W = view.w, H = view.h, t = u.t;
  // 들어옴 0~0.22 · 머묾 · 나감 0.82~1.0
  const inK = Math.min(1, t / 0.18), outK = Math.max(0, Math.min(1, (t - 0.56) / 0.16));
  if (outK < 1) {
    const ease = 1 - Math.pow(1 - inK, 3), slide = (1 - ease) * -W + outK * outK * W * 1.1;
    const bandH = Math.min(150, H * 0.3), by = H * 0.34;
    ctx.save(); ctx.translate(slide, 0);
    // 비스듬한 띠
    ctx.fillStyle = "rgba(10,30,80,.88)";
    ctx.beginPath(); ctx.moveTo(-40, by - bandH / 2 + 26); ctx.lineTo(W + 40, by - bandH / 2 - 26); ctx.lineTo(W + 40, by + bandH / 2 - 26); ctx.lineTo(-40, by + bandH / 2 + 26); ctx.closePath(); ctx.fill();
    ctx.save(); ctx.clip();
    // 띠 안의 흐르는 속도선(조종사 색)
    ctx.strokeStyle = PILOT_COLOR[world.kid]; ctx.globalAlpha = 0.55; ctx.lineWidth = 5; ctx.lineCap = "round"; ctx.beginPath();
    for (let i = 0; i < 16; i++) { const yy = by - bandH / 2 + ((i * 37) % bandH) - 20, xx = ((i * 211 - t * 2400) % (W + 300) + W + 300) % (W + 300) - 150; ctx.moveTo(xx, yy); ctx.lineTo(xx + 90 + (i % 3) * 40, yy - 8); }
    ctx.stroke(); ctx.globalAlpha = 1;
    // 빛줄 테두리
    ctx.restore();
    ctx.strokeStyle = "#ffe27a"; ctx.lineWidth = 5; ctx.beginPath(); ctx.moveTo(-40, by - bandH / 2 + 26); ctx.lineTo(W + 40, by - bandH / 2 - 26); ctx.moveTo(-40, by + bandH / 2 + 26); ctx.lineTo(W + 40, by + bandH / 2 - 26); ctx.stroke();
    // 조종사(잠수정 그림) 크게
    const art = L.PILOTS[world.kid].art, sw = Math.min(190, bandH * 1.35), bob = Math.sin(t * 9) * 4;
    ctx.drawImage(GLOW_Q, W * 0.2 - sw * 0.75, by - sw * 0.75 + bob, sw * 1.5, sw * 1.5);
    if (!sprite(art, W * 0.2, by + bob, sw, false, -0.25)) { ctx.fillStyle = PILOT_COLOR[world.kid]; ctx.beginPath(); ctx.arc(W * 0.2, by, sw * 0.35, 0, TAU); ctx.fill(); }
    // 기술 이름
    const fs = Math.min(54, W * 0.075), tx = W * 0.62;
    ctx.font = "900 " + Math.round(fs) + "px " + FONT; ctx.textAlign = "center"; ctx.textBaseline = "middle"; ctx.lineJoin = "round";
    ctx.lineWidth = 10; ctx.strokeStyle = "rgba(6,20,60,.95)"; ctx.strokeText(ULT_NAME + "!", tx, by - 8);
    ctx.fillStyle = RAINBOW_COL[Math.floor(t * 14) % 6]; ctx.fillText(ULT_NAME + "!", tx, by - 8);
    ctx.font = "800 " + Math.round(fs * 0.4) + "px " + FONT; ctx.lineWidth = 6; ctx.strokeText(L.PILOTS[world.kid].name + " · 한 번에 맞혔어요!", tx, by + fs * 0.62);
    ctx.fillStyle = "#ffffff"; ctx.fillText(L.PILOTS[world.kid].name + " · 한 번에 맞혔어요!", tx, by + fs * 0.62);
    ctx.restore();
  }
  // 씻긴 수가 크게 올라간다
  if (u.fired && u.n) {
    const age = u.t - ULT_HIT, pop = age < 0.15 ? 0.5 + age / 0.15 * 0.8 : age < 0.3 ? 1.3 - (age - 0.15) / 0.15 * 0.3 : 1;
    ctx.globalAlpha = Math.min(1, (ULT_T - u.t) / 0.25);
    ctx.font = "900 " + Math.round(Math.min(64, W * 0.09) * pop) + "px " + FONT; ctx.textAlign = "center"; ctx.textBaseline = "middle"; ctx.lineJoin = "round";
    ctx.lineWidth = 10; ctx.strokeStyle = "rgba(6,20,60,.92)"; ctx.strokeText("친구 " + u.shown + "마리 깨끗!", W / 2, H * 0.68);
    ctx.fillStyle = "#ffe27a"; ctx.fillText("친구 " + u.shown + "마리 깨끗!", W / 2, H * 0.68);
    ctx.globalAlpha = 1;
  }
}
/* 문제를 맞힌 그 순간의 보상: 규칙(E.quizBlast)은 맞힌 순간 그대로 적용하고(카드 뽑기가 하트 수를 보므로 순서 그대로),
   화면 꾸밈은 문제·카드 창이 닫혀 바다가 보일 때 터뜨린다(물결이 퍼지는 순서대로 친구가 하나씩 씻김).
   mode: "wave" 보통 문제 한 번에(작은 물결 + 하트) · "near" 보통 문제 고쳐서(더 작은 물결) · "mid" 어려운 문제 고쳐서(중간 물결) */
let heldWave = null, holdO = null;
const WAVE_NAME = { wave: "물결 파도", near: "작은 물결", mid: "큰 물결" };
function rewardBlast(mode) {
  const p = world.p;
  holdO = { x: p.x, y: p.y, list: [] };
  const r = E.quizBlast(world, mode);
  for (const f of world.fx.freed) if (f.t === 0) { f.t = -999; f.hx = f.x; f.hy = f.y; }
  handleEvents();
  heldWave = { mode, n: r.n, healed: r.healed, list: holdO.list };
  holdO = null;
  hudKey = ""; hud();
  const msg = WAVE_NAME[mode] + "! " + (r.n ? "친구 " + r.n + "마리 씻김" : "바다가 깨끗해졌어요") + (r.healed ? " · 하트 +1" : "");
  return mode === "mid" ? msg : msg + " · 장비 " + (mode === "wave" ? world.tune.cards : 2) + "장 중 골라요";
}
// 다시 헤엄칠 때 붙잡아 둔 물결을 터뜨린다
function releaseWave() {
  const h = heldWave; heldWave = null; if (!h || !world) return;
  const p = world.p, R = L.BIG.blast[h.mode].r * AREA, big = h.mode === "mid", V = R / (big ? 0.55 : 0.45);
  for (const f of world.fx.freed) if (f.t < -500) { const d = Math.hypot(f.hx - p.x, f.hy - p.y), lag = Math.min(0.9, d / V); f.t = -lag; f.x = f.hx - f.vx * lag; f.y = f.hy - f.vy * lag; }
  for (const q of h.list) afterFx(Math.min(0.9, Math.hypot(q.x - p.x, q.y - p.y) / V), q.king ? "uking" : "uwash", q.x, q.y);
  // 물결: 하얀 앞머리의 날카로운 고리 둘 + 부드러운 물빛 고리 + 가장자리 물방울 마루 + 반짝이
  F.shock(p.x, p.y, R, big ? 0.6 : 0.5, 1, big ? 34 : 24, 1);
  F.shock(p.x, p.y, R * 1.02, big ? 0.5 : 0.42, 0, 7, 0, 0.03);
  F.shock(p.x, p.y, R * 0.75, 0.45, 2, 5, 0, 0.1);
  F.ringOut(p.x, p.y, big ? 40 : 26, 30, R / 0.6, 1, 4, 0.55, 4.5);
  F.ringOut(p.x, p.y, big ? 20 : 12, 30, R / 0.7, 0, 2, 0.7, 6);
  F.spark(p.x, p.y, 0, 0, 0.3, big ? 34 : 24, 1, 0);
  sfx.fanfare(big); shake(big ? 6 : 4, 0.25); punch(big ? 0.05 : 0.03); setFlash(big ? 0.16 : 0.1, "190,245,255");
  if (big) { dimTo = 0.3; setTimeout(() => { if (!ult && mode === "play") dimTo = 0; }, 700); }
  say(WAVE_NAME[h.mode] + "!", true, h.n ? "친구 " + h.n + "마리 깨끗" + (h.healed ? " · 하트 +1" : "") : "바다가 깨끗해졌어요");
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
    say(L.gainText(c), true, chest ? "보물 조개 선물" : gift ? "출발 선물" : noQuiz ? "" : "문제를 맞혀서 얻었어요!", true); bannerT = bannerT0 = 2.8;
    equipFx = { img: iconCanvas(c, 96), t: 0 };
    setTimeout(() => { $("cards").hidden = true; cardsShown = null; transformBurst(c); finishCards(onDone); }, 360);
  });
}
function finishCards(onDone) {
  if (onDone) { onDone(); return; }
  E.resumeAfter(world); hudKey = ""; hud();
  mode = "play"; clearInput(); last = performance.now();
  releaseWave();
}
// 하트 0: 한 판에 한 번 구조 문제
function openRescue() {
  mode = "quiz"; clearInput(); say("잠수정이 지쳤어요", true);
  if (!GameQuiz) { E.revive(world); mode = "play"; say("다시 출발!", true); return; }
  GameQuiz.ask({
    kid: L.PILOTS[pilot].kid, title: "잠수정이 지쳤어요 · 맞히면 하트 " + (world.gifts.includes("rescue3") ? 3 : 2) + "개로 다시 출발!", theme: QUIZ_THEME, pace: "quick",
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
  world = E.createWorld({ kid: pilot, zone: zoneId, view, gifts: save.gifts, bigPearl: !!GameQuiz });
  makeDecor(zone);
  ["start", "over", "cards", "pause", "dex"].forEach(id => { $(id).hidden = true; });
  $("hud").hidden = false; hudKey = ""; hud();
  firstPearlSaid = false; runSaved = false; banner = ""; bannerT = 0;
  fxList = []; floats = []; trail = []; shakeT = 0; hitStop = 0; S.setPitch(1); dashKey = feverKey = "";
  for (const q of PARTS) q.on = false; ringsM = []; muzzle = null; multiBan = null; comboPop = 0; edgeFlash = 0;
  resetJuice();
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
function resetJuice() {
  F.clearAll(); later.length = 0; ult = null; finale = null; finaleAt = null; trauma = 0; zoomK = 0; dimA = dimTo = 0; lbox = lboxTo = 0; cine = 0; slowK = 1; slowT = 0;
  speedA = 0; subGlow = 0; ringWarn = 0; godRays = 0; heldWave = null; bigSaid = false; recoil = null; bossIntroT = 0; feverIntro = 0; feverOutro = 0; currentFx = 0; ghostT = 0; for (const g of ghosts) g.age = 9;
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
  mode = "start"; world = null; demo = null; clearInput(); S.setPitch(1); resetJuice();
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
        hitSplash(e);
        break;
      }
      case "wash": {
        if (e.kind === "boss") { lastBossX = e.x; lastBossY = e.y; }
        // 필살기 물결: 물결 앞머리가 닿을 때 터지도록 늦춘다
        if (holdO) { if (holdO.list.length < 90) holdO.list.push({ x: e.x, y: e.y, king: e.king }); break; }
        if (ultO) { afterFx(Math.hypot(e.x - ultO.x, e.y - ultO.y) / ultV, e.king ? "uking" : "uwash", e.x, e.y); break; }
        sfx.wash(e.combo);
        washPop(e.x, e.y, e.chain, e.elite, e.combo);
        if (e.elite || e.king) { addFx("light", e.x, e.y, e.king ? 240 : 140, { dur: 0.5, alpha: 0.7 }); F.shock(e.x, e.y, e.king ? 240 : 120, 0.55, 3, e.king ? 26 : 16, e.king ? 2 : 1); F.radial(e.x, e.y, e.king ? 40 : 18, 520, -1, 2, 0.8, 6); shake(e.king ? 8 : 4, 0.2); punch(e.king ? 0.06 : 0.02); if (e.king) { stopFor(60); sfx.fanfare(false); setFlash(0.2, "255,240,180"); } }
        else if (!e.chain && Math.random() < 0.25) addFx("light", e.x, e.y, 64, { dur: 0.35, alpha: 0.8 });
        // 떠오르는 숫자: 콤보 고비마다 크게, 그 밖에는 가끔 +1(개수 상한 있음)
        if (e.combo >= 5 && COMBO_SHOW.includes(e.combo) && e.combo !== lastComboFloat) { lastComboFloat = e.combo; comboPop = 0.8; }
        break;
      }
      case "burst": if (e.big) { addFx("light", e.x, e.y, 160, { dur: 0.45, alpha: 0.6 }); F.shock(e.x, e.y, 170, 0.5, 3, 18, 5); F.radial(e.x, e.y, 26, 480, -1, 1, 0.6, 3.5); F.radial(e.x, e.y, 12, 300, -1, 2, 0.7, 6); burst(e.x, e.y, 18, 340, -1, 5, 0.6); sfx.pop(world.combo); shake(4, 0.14); }
        else { F.shock(e.x, e.y, L.CHAIN.r * 0.9, 0.3, 1, 7, 1); if (Math.random() < 0.5) sfx.chain(world.combo); } break;
      case "orb": sfx.orb(e.n); break;
      case "shot": sfx.shot(e.lv || 1); if (e.a != null) { muzzle = { a: e.a, t: 0, lv: e.lv || 1 }; recoil = { a: e.a, t: 0 }; const p = world.p, lv = e.lv || 1; F.cone(p.x + Math.cos(e.a) * 28, p.y + Math.sin(e.a) * 28, e.a, 0.8, 5 + lv * 1.5, 280 + lv * 50, world.fever > 0 ? -1 : lvCol(lv), 4, 0.26, 3 + lv * 0.4); F.cone(p.x + Math.cos(e.a) * 28, p.y + Math.sin(e.a) * 28, e.a, 0.5, 2 + lv, 420, 0, 1, 0.16, 3); } break;
      case "multi": {
        // 그 자리에서 무지개 폭발. 5마리 알림은 자주 나오니 큰 글자·쿵은 4초에 한 번만(10·20마리는 늘)
        addFx("light", e.x, e.y, 100 + e.tier * 40, { dur: 0.45, alpha: 0.55 });
        F.shock(e.x, e.y, 110 + e.tier * 60, 0.5, 0, 14 + e.tier * 4, 5); F.radial(e.x, e.y, 20 + e.tier * 14, 560, -1, 1, 0.6, 3.5); F.ringOut(e.x, e.y, 12 + e.tier * 6, 50, 380, -1, 2, 0.7, 7);
        if (e.tier === 0 && clock - lastMulti0 < 4) { shake(3, 0.1); break; }
        if (e.tier === 0) lastMulti0 = clock;
        multiBan = { text: L.MULTI.say[e.tier], t: 0, tier: e.tier };
        sfx.thud(e.tier); stopFor(e.tier ? 50 : 30); shake(4 + e.tier * 2, 0.25); punch(0.03 + e.tier * 0.025); edgeFlash = 0.2 + e.tier * 0.1;
        break;
      }
      case "combo-tier": { const T = L.COMBO_TIERS[e.tier], p = world.p; comboPop = 0.8; sfx.tier(e.tier); F.shock(p.x, p.y, 140 + e.tier * 40, 0.5, e.tier >= 3 ? 3 : [5, 2, 6][e.tier], 18, e.tier >= 3 ? 5 : 4); F.ringOut(p.x, p.y, 14 + e.tier * 4, 40, 340, e.tier >= 3 ? -1 : [5, 2, 6][e.tier], 2, 0.6, 6); punch(0.03); break; }
      case "qpearl-up": sfx.pearl(); F.shock(e.x, e.y, 90, 0.6, 3, 12, 1); F.ringOut(e.x, e.y, 12, 20, 200, 3, 2, 0.7, 6); if (e.sure) floatText(e.x, e.y - 30, "? 진주!", "#ffe27a", 22, 1.4); if (!firstPearlSaid) { firstPearlSaid = true; say("? 진주가 떠올랐어요! 먹어 봐요", true, "문제를 맞히면 물결 파동 + 새 장비"); } break;
      case "big-up": sfx.bigPearl(); F.shock(e.x, e.y, 150, 0.8, 3, 20, 5); F.ringOut(e.x, e.y, 18, 30, 220, -1, 2, 0.9, 7); floatText(e.x, e.y - 60, "큰 진주!", "#ffe27a", 22, 1.4); if (!bigSaid) { bigSaid = true; say("큰 진주가 나왔어요!", true, "먹으면 어려운 문제 · 맞히면 필살기"); } break;
      case "bigpearl": { sfx.bigPearl(); const p = world.p; F.shock(p.x, p.y, 160, 0.5, 3, 20, 5); F.radial(p.x, p.y, 30, 380, -1, 2, 0.7, 7); punch(0.05); break; }
      case "qpearl": { const p = world.p; F.shock(p.x, p.y, 120, 0.45, 3, 18, 1); F.radial(p.x, p.y, 20, 360, 3, 2, 0.6, 6); punch(0.05); break; }
      case "hurt": sfx.hurt(); setFlash(0.15, "255,150,180"); shake(6, 0.22); break;
      case "boss": bossIntro(); break;
      case "bosshit": sfx.bossHit(); if (Math.random() < 0.18) { addFx("light", e.x + (Math.random() - 0.5) * 60, e.y + (Math.random() - 0.5) * 60, 100, { dur: 0.35 }); F.radial(e.x, e.y, 8, 300, 4, 4, 0.5, 5, 200); stopFor(25); shake(2.5, 0.08); } break;
      case "warn": sfx.warn(); break;
      case "zap": sfx.zap(zapLv()); if (e.x != null) { addFx("bolt", e.x, e.y, 80 + zapLv() * 14, { dur: 0.3 }); F.radial(e.x, e.y, 4 + zapLv() * 2, 380, 10, 1, 0.3, 3); } break;
      case "light": lightBurst(e); break;
      case "dash": dashFx(e); break;
      case "fever": feverIn(e); break;
      case "fever-end": feverOut(); break;
      case "event": eventBeat(e); break;
      case "gold": sfx.gold(); addFx("light", e.x, e.y, 220, { dur: 0.6 }); F.shock(e.x, e.y, 200, 0.6, 3, 22, 2); F.radial(e.x, e.y, 40, 420, 3, 4, 1.0, 5, 380); F.radial(e.x, e.y, 18, 300, 10, 2, 0.9, 7); punch(0.05); shake(4, 0.15); floatText(e.x, e.y - 30, "빛 방울 비!", "#ffe27a", 26, 1.2); break;
      case "gold-bye": floatText(e.x, e.y - 20, "황금 물고기가 숨었어요", "#fff3c4", 16, 1.2); break;
      case "clam": sfx.gold(); addFx("light", e.x, e.y, 220, { dur: 0.6, alpha: 0.7 }); F.shock(e.x, e.y, 220, 0.6, 3, 24, 5); F.radial(e.x, e.y, 36, 360, 3, 4, 1.0, 5, 300); F.radial(e.x, e.y, 16, 260, -1, 2, 0.9, 7); punch(0.06); shake(5, 0.2); break;
      case "clam-bye": floatText(e.x, e.y - 20, "조개가 닫혔어요", "#fff3c4", 16, 1.2); break;
      case "ink": if (world.boss) { const b = world.boss; F.radial(b.x, b.y, 10, 240, 4, 3, 0.6, 6); F.shock(b.x, b.y, 110, 0.4, 4, 10, 1); } break;
      case "over": if (e.result === "boss" && world.over) finaleAt = { x: lastBossX, y: lastBossY }; break;
    }
  }
  ev.length = 0;
}
/* ---------- 무기마다의 빛깔·맞는 자리 효과 ---------- */
// 무기 색(F.COL 번호): [본색, 덧색]
const WCOL = { bubble: [2, 1], whirl: [1, 0], zap: [4, 10], shell: [7, 3], light: [3, 10], star: [6, 7] };
// 단계 색: 1 하늘 · 2 파랑 · 3 진파랑 · 4 보라 · 5 금
// 1 하늘 · 2 파랑 · 3 금 · 4 주황금 · 5 무지개(돌아가며) — 낮은 단계는 차갑고 하얗게, 높을수록 따뜻하고 화려하게
const LV4 = [1, 2, 3, 7], LVH = ["#bff3ff", "#5fd2ff", "#ffd75a", "#ffa53c"];
const lvCol = lv => (lv >= 5 ? F.RAINBOW_IDX[((clock * 8) | 0) % 6] : LV4[Math.max(0, lv - 1)]);
const lvHex = lv => (lv >= 5 ? RAINBOW_COL[((clock * 10) | 0) % 6] : LVH[Math.max(0, lv - 1)]);
const RGBC = F.COL.map(h => { const n = parseInt(h.slice(1), 16); return ((n >> 16) & 255) + "," + ((n >> 8) & 255) + "," + (n & 255); });
const zapLv = () => (world && world.load.weapons.zap) || 1;
let boltEcho = [];
let subGlow = 0, lastBossX = 0, lastBossY = 0, finaleAt = null;
// 맞는 순간: 무기마다 다른 물보라. 단계가 오를수록 크고 많게(한 프레임 hitBudget 개까지)
function hitSplash(e) {
  const lv = e.lv || 1, x = e.x, y = e.y, r = e.r || 16, src = e.src;
  if (src === "b") {
    const rain = world.fever > 0 || lv >= 5, col = rain ? -1 : lvCol(lv);
    F.radial(x, y, 7 + lv * 1.5, 250 + lv * 45, col, 4, 0.45, 3.4 + lv * 0.8, 160); F.spark(x, y, 0, 0, 0.12, 8 + lv * 3, 0, 0); F.radial(x, y, 2 + (lv >> 1), 200, col, 2, 0.4, 4 + lv);
    F.radial(x, y, 2 + lv, 300, 0, 1, 0.25, 2.5);
    F.shock(x, y, 24 + lv * 10 + r * 0.6, 0.22, 0, 5, 0); F.shock(x, y, 18 + lv * 8 + r * 0.5, 0.3, rain ? 1 : lvCol(lv), 4, 0, 0.05);
    if (lv >= 3 && Math.random() < 0.35) addFx("ice", x, y, 40 + lv * 12 + r, { dur: 0.3, rot: Math.random() * TAU, alpha: 0.8 });
    if (rain && Math.random() < 0.5) F.radial(x, y, 4, 200, -1, 2, 0.5, 5);
  } else if (src === "s") {
    F.radial(x, y, 3 + lv, 260 + lv * 30, lv >= 5 ? -1 : 6, 2, 0.4, 4 + lv * 0.6);
    F.radial(x, y, 3 + lv, 220, 7, 4, 0.35, 2.6);
    F.shock(x, y, 26 + lv * 6, 0.25, lv >= 5 ? 3 : 6, 5, 0);
  } else if (src === "zap") {
    addFx("bolt", x, y, 50 + lv * 12 + r, { dur: 0.28, rot: Math.random() * TAU, alpha: 0.95 });
    F.radial(x, y, 3 + lv, 340, 10, 1, 0.22, 3);
    F.spark(x, y, 0, 0, 0.2, 9 + lv * 2, 4, 0);
  } else if (src === "whirl") {
    const a = Math.atan2(y - world.p.y, x - world.p.x) + Math.PI / 2;
    F.cone(x, y, a, 1.0, 4 + lv, 300 + lv * 30, world.load.evo.whirl ? 11 : lvCol(lv), 5, 0.3, 3);
    F.radial(x, y, 2 + lv, 160, 0, 3, 0.4, 3 + lv * 0.6);
    if (Math.random() < 0.4) addFx("wind", x, y, 50 + lv * 12, { dur: 0.3, rot: a, alpha: 0.85 });
  } else if (src === "shell") {
    F.radial(x, y, 4 + lv, 300, 7, 1, 0.3, 3.2); F.radial(x, y, 2 + lv, 200, 3, 2, 0.45, 5);
    F.shock(x, y, 30 + lv * 8, 0.3, 3, 7, 0);
    addFx("light", x, y, 50 + lv * 10, { dur: 0.28, alpha: 0.8 });
  } else if (src === "light") {
    F.radial(x, y, 3 + lv, 240, 3, 2, 0.45, 4 + lv * 0.5);
    F.spark(x, y, 0, 0, 0.25, 10 + lv * 2, 10, 0);
  } else if (src === "dash") {
    F.radial(x, y, 10, 360, 1, 4, 0.4, 4); F.radial(x, y, 6, 420, 0, 1, 0.3, 3); F.shock(x, y, 50, 0.3, 0, 10, 1);
    addFx("wind", x, y, 70 + r, { dur: 0.3, rot: Math.random() * TAU });
  }
  if (e.src !== "zap" && Math.random() < 0.3) burst(x, y, 2, 150, 1, 3, 0.3);
}
// 씻기는 순간: 물방울 왕관 + 흰 섬광 + 반짝 별 + 고리 + 거품
function washPop(x, y, chain, elite, combo) {
  // 짧고 빽빽한 반짝 폭발(약 16~30개, 0.3~0.9초): 흰 심 → 물방울(눈물 모양) → 네 갈래 반짝 → 빛 줄 → 비누 거품
  const big = elite ? 1.5 : 1, k = chain ? 0.7 : 1;
  F.spark(x, y, 0, 0, 0.12, 15 * big, 0, 0);
  F.radial(x, y, 8 * k * big, 330, 1, 4, 0.55, 4.2, 140); F.radial(x, y, 4 * k * big, 300, 5, 4, 0.5, 3.8, 140);
  F.radial(x, y, 5 * k * big, 360, combo >= 30 ? -1 : 3, 2, 0.7, 5.5);
  F.radial(x, y, 5 * k * big, 480, 0, 1, 0.3, 3);
  F.radial(x, y, 3, 110, 0, 3, 0.8, 5, -30);
  F.radial(x, y, 6 * k, 120, 0, 6, 0.6, 5, -160, 3);
  F.shock(x, y, (chain ? 34 : 46) * big, 0.28, 1, 5, 1);
  if (Math.random() < 0.3) F.ambientPush((x - cam.x), (y - cam.y), 160, 160);
}
/* 큰 폭발(필살기·대왕 끝 장면): 어두워진 바다 위에서 가장 밝게.
   뜨거운 흰 심 → 옅은 하늘 → 진한 물빛·무지개 테두리. 두꺼운 부드러운 물결 + 하얀 앞머리 + 물방울 마루, 길이가 제각각인 빛살,
   물방울 수백 개(크기 섞기), 비누 거품 나선, 천천히 도는 빛살 쐐기, 오래 남는 무지개 잔광. */
let godRays = 0, godX = 0, godY = 0, godR = 400;
function bigBurst(x, y, R, s = 1) {
  F.spark(x, y, 0, 0, 0.18, 40 * s, 0, 0); F.spark(x, y, 0, 0, 0.45, 40 * s, 1, 0); F.spark(x, y, 0, 0, 0.8, 30 * s, 2, 0);
  F.shock(x, y, R * 0.95 * s, 0.8, 1, 60, 4); F.shock(x, y, R * 0.82 * s, 0.65, 2, 30, 4, 0.03); F.shock(x, y, R * 0.75 * s, 1.3, 0, 40, 6, 0.18); F.shock(x, y, R * 0.42 * s, 0.5, 10, 24, 3, 0.02);
  F.ringOut(x, y, 60, 40, 900 * s, 1, 4, 0.8, 5); F.ringOut(x, y, 24, 40, 760 * s, 0, 2, 0.8, 8);
  F.radial(x, y, 140, 1100 * s, 1, 4, 0.9, 5, 200); F.radial(x, y, 40, 900 * s, 2, 4, 0.8, 4, 200); F.radial(x, y, 90, 1400 * s, -1, 1, 0.6, 4); F.radial(x, y, 50, 600 * s, -1, 2, 1.1, 8);
  const n = F.qn(40);
  for (let i = 0; i < n; i++) { const a = i * 0.55, v = 160 + i * 14; F.spark(x, y, Math.cos(a) * v - Math.sin(a) * v * 0.7, Math.sin(a) * v + Math.cos(a) * v * 0.7, 1.3, 4 + Math.random() * 6, 0, 3, -40, 1.1); }
  godRays = 1.5; godX = x; godY = y; godR = R * 0.9 * s;
  F.ambientPush(x - cam.x, y - cam.y, Math.max(view.w, view.h), 900);
}
// 카드를 고른 순간: 잠수정이 장비 색으로 변신하듯 번쩍
function transformBurst(c) {
  if (!world) return;
  const p = world.p, evo = c.kind === "combo", wid = c.kind === "weapon" ? c.id : evo ? L.COMBOS[c.id].weapon : null;
  const lv = evo ? 5 : c.lv || 1, col = wid ? WCOL[wid][0] : c.kind === "heal" || c.id === "heart" ? 9 : 5, acc = wid ? WCOL[wid][1] : 0, big = evo || (wid && lv >= 5);
  F.shock(p.x, p.y, 120 + lv * 24, 0.55, col, 24, 1); F.shock(p.x, p.y, 90 + lv * 16, 0.5, acc, 12, 0, 0.1); F.shock(p.x, p.y, 70 + lv * 20, 0.6, col, 12, 3, 0.05);
  if (big) { F.shock(p.x, p.y, 300, 0.8, 0, 28, 2, 0.05); F.shock(p.x, p.y, 380, 0.9, 3, 16, 0, 0.15); }
  F.radial(p.x, p.y, 18 + lv * 6, 380 + lv * 40, evo ? -1 : col, 1, 0.55, 3.5); F.radial(p.x, p.y, 10 + lv * 3, 260, evo ? -1 : acc, 2, 0.8, 6);
  const n = F.qn(14 + lv * 3);
  for (let i = 0; i < n; i++) { const a = i * 0.9; F.spark(p.x + Math.cos(a) * 24, p.y + Math.sin(a) * 24, Math.cos(a) * 70, -150 - i * 10, 0.9, 4.5, evo ? -1 : i % 2 ? col : acc, 0, 0, 1.2); }
  addFx(big ? "mega" : "light", p.x, p.y, big ? 300 : 180, { dur: 0.6, alpha: big ? 0.5 : 0.8 });
  setFlash(big ? 0.28 : 0.14, RGBC[col]); punch(big ? 0.07 : 0.04); shake(big ? 7 : 4, 0.2); subGlow = big ? 1.2 : 0.8;
  sfx.equip(lv, !!big);
  if (big) slowmo(0.4, 0.45);
}
// 등대 빛: 가운데 섬광 + 두꺼운 빛 물결 + 빛살 + 가장자리 반짝이(단계가 오를수록 겹이 늘고 5단계는 무지개)
function lightBurst(e) {
  const lv = (world.load.weapons.light) || 1, x = e.x, y = e.y, R = e.R;
  sfx.light(lv);
  F.spark(x, y, 0, 0, 0.3, 22 + lv * 4, 10, 0);
  F.shock(x, y, R * 1.05, 0.5, 3, 18 + lv * 4, 1);
  F.shock(x, y, R * 1.15, 0.55, 10, 10 + lv * 3, 3, 0.04);
  if (lv >= 3) F.shock(x, y, R * 0.8, 0.45, 0, 8, 0, 0.08);
  if (lv >= 5) F.shock(x, y, R * 1.3, 0.65, 0, 16, 2, 0.1);
  F.ringOut(x, y, 10 + lv * 4, R * 0.9, 160 + lv * 20, lv >= 5 ? -1 : 3, 2, 0.6, 5 + lv * 0.6);
  addFx("light", x, y, R * 1.6, { dur: 0.45, alpha: 0.85 });
  if (lv >= 4) { shake(2 + lv * 0.5, 0.12); punch(0.02); }
}
// 슈웅!: 잔상 + 뒤로 뿜는 물줄기 + 앞쪽 빛 줄 + 물결 고리 + 화면 속도선
const ghosts = Array.from({ length: 8 }, () => ({ x: 0, y: 0, rot: 0, age: 9 }));
let ghostT = 0, ghostHead = 0, ghostAcc = 0;
function stepGhosts(dt) {
  for (const g of ghosts) g.age += dt;
  if (!world || !(world.p.dashT > 0 || ghostT > 0.1)) return;
  ghostAcc += dt; if (ghostAcc < 0.028) return; ghostAcc = 0;
  const g = ghosts[ghostHead]; ghostHead = (ghostHead + 1) % ghosts.length;
  g.x = world.p.x; g.y = world.p.y; g.rot = world.p.face + Math.PI / 2; g.age = 0;
}
function dashFx(e) {
  sfx.dash();
  const a = e.a, x = e.x, y = e.y;
  addFx("wind", x + Math.cos(a) * 60, y + Math.sin(a) * 60, 200, { dur: 0.35, rot: a + Math.PI / 2 });
  F.cone(x, y, a + Math.PI, 0.9, 26, 520, 1, 5, 0.4, 4); F.cone(x, y, a + Math.PI, 0.5, 14, 380, 0, 3, 0.6, 4);
  F.cone(x, y, a, 0.35, 14, 900, 0, 1, 0.25, 3);
  F.shock(x, y, 110, 0.4, 1, 18, 1); F.shock(x, y, 70, 0.3, 0, 10, 0, 0.05);
  speedA = Math.max(speedA, 0.5); speedCol = "#e6fbff"; punch(0.04); shake(3, 0.1);
  floatText(x, y - 40, "슈웅!", "#bff3ff", e.auto ? 20 : 24, 0.6);
  ghostT = 0.32;
}
// 무지개 터보 들어감: 잠깐 멈칫 → 무지개 고리 여섯 겹이 차례로 → 속도선 → 높아진 음악
function feverIn(e) {
  sfx.fever(); S.setPitch(1.25); stopFor(60); cinema(0.22); slowmo(0.35, 0.45); shake(7, 0.3); punch(0.07);
  F.shock(e.x, e.y, 360, 0.7, 0, 30, 6);
  for (let i = 0; i < 6; i++) F.shock(e.x, e.y, 180 + i * 50, 0.65, F.RAINBOW_IDX[i], 10, 0, i * 0.06, 0.5);
  F.shock(e.x, e.y, 520, 0.8, 0, 26, 2, 0.1);
  F.radial(e.x, e.y, 60, 800, -1, 1, 0.6, 4); F.radial(e.x, e.y, 30, 500, -1, 2, 0.8, 7);
  setFlash(0.22, "255,240,200"); speedA = 1; feverIntro = 1;
  say("무지개 터보!", true, "더 빨리 · 더 크게 · 빛 방울이 다 날아와요", true);
}
let feverIntro = 0, feverOutro = 0;
function feverOut() {
  S.setPitch(1); sfx.feverEnd();
  if (!world) return;
  const p = world.p;
  F.shock(p.x, p.y, 200, 0.5, 0, 14, 2); F.radial(p.x, p.y, 24, 300, -1, 2, 0.7, 5);
  floatText(p.x, p.y - 56, "터보 끝! 또 모아요", "#ffffff", 20, 1.0); feverOutro = 0.5;
}
// 대왕 등장: 게임을 0.9초 멈추고(게임 시간도 멈춤) 어두워지며 위아래 띠, 쿠르릉, 대왕 쪽에서 물결
let bossIntroT = 0;
function bossIntro() {
  sfx.boss(); say("먹물 대왕 등장!", true, "씻겨 주면 오늘의 대성공", true);
  cinema(0.9); dimTo = 0.55; lboxTo = 1; bossIntroT = 1.3; shake(4.6, 0.5); punch(0.06);
  const b = world.boss; if (b) { F.shock(b.x, b.y, 260, 0.8, 4, 28, 1); F.shock(b.x, b.y, 200, 0.7, 11, 14, 0, 0.2); F.radial(b.x, b.y, 30, 380, 4, 4, 0.9, 6); }
}
// 이벤트 한가운데 순간
function eventBeat(e) {
  sfx.event(); say(e.name, true, e.sub, true); shake(4, 0.25); punch(0.04);
  const p = world.p;
  if (e.id === "ring") { ringWarn = 1.6; F.shock(p.x, p.y, Math.min(view.w, view.h) * 0.6, 0.9, 4, 18, 1); }
  else if (e.id === "king") { const k = world.enemies.find(x => x.king); if (k) { F.shock(k.x, k.y, 200, 0.7, 3, 24, 2); F.ringOut(k.x, k.y, 20, 40, 300, 3, 2, 0.8, 7); } }
  else if (e.id === "current") { currentFx = 1; }
  else if (e.id === "whale") { F.shock(p.x, p.y, 300, 0.7, 1, 22, 1); }
  else { F.shock(p.x, p.y, 200, 0.6, 3, 18, 1); }
}
let ringWarn = 0, currentFx = 0;
function update(dt) {
  // 큰 dt 는 나눠서(탄이 친구를 건너뛰지 않게)
  const n = dt > 0.034 ? 2 : 1;
  for (let i = 0; i < n && mode === "play"; i++) {
    const whaleBefore = !!world.whale;
    E.stepWorld(world, dt / n, moveVector());
    if (!whaleBefore && world.whale) sfx.whale();
    handleEvents();
    if (world.over) { if (world.over.result === "boss") startFinale(); else showOver(); return; }
    if (world.pending === "quiz") { openQuiz(); return; }
    if (world.pending === "rescue") { openRescue(); return; }
    if (world.pending === "chest") { openCards({ chest: true }); return; }
    if (world.pending === "big") { openChallenge(); return; }
  }
  hud(); hudFast();
}
/* ---------- 대왕을 씻긴 끝 장면(약 2.6초) ----------
   게임은 이미 끝났다(world.over). 느리게 → 세 번에 걸친 무지개 폭발 → 진주 비가 잠수정으로 쏟아짐 → 결과 화면. 결과·저장은 그대로. */
let finale = null;
function startFinale() {
  mode = "finale"; clearInput(); S.setPitch(1); bossIntroT = 0;
  const at = finaleAt || { x: lastBossX || world.p.x, y: lastBossY || world.p.y };
  finale = { t: 0, x: at.x, y: at.y, stage: 0, rain: 0 };
  sfx.victory(); slowmo(0.35, 0.8); stopFor(60); dimTo = 0.62; lboxTo = 1;
  say("먹물 대왕을 씻어 줬어요!", true, "오늘의 대성공!", true); bannerT = 2.8; bannerT0 = 2.8;
}
function finaleStep(dt) {
  const f = finale; f.t += dt;
  const stages = [0, 0.45, 0.9];
  while (f.stage < 3 && f.t >= stages[f.stage]) {
    const s = f.stage++, x = f.x + (s === 1 ? -60 : s === 2 ? 60 : 0), y = f.y + (s === 1 ? 30 : s === 2 ? -30 : 0);
    const R = Math.max(view.w, view.h);
    if (s === 2) bigBurst(x, y, R * 0.9, 1);
    else { F.shock(x, y, R * (s ? 0.45 : 0.35), 0.7, s ? 3 : 1, 34, 4); F.shock(x, y, R * 0.3, 0.5, 0, 6, 0, 0.04); F.radial(x, y, 50, 800, s ? 3 : 1, 4, 0.9, 5, 200); F.radial(x, y, 24, 600, -1, 2, 1.0, 7); F.radial(x, y, 14, 300, 0, 6, 0.9, 6, -80); }
    if (s !== 1) setFlash(0.2, s === 2 ? "255,240,190" : "190,245,255"); shake(10 - s * 2, 0.4); punch(0.08 - s * 0.02); sfx.thud(Math.min(2, s));
    F.ambientPush(x - cam.x, y - cam.y, 700, 700);
  }
  // 진주 비: 위에서 쏟아져 잠수정으로 빨려 든다
  if (f.t > 0.9 && f.t < 2.3) { f.rain += dt * 40; while (f.rain >= 1) { f.rain--; const p = world.p, sx = cam.x + Math.random() * view.w; F.spark(sx, cam.y - 10, (p.x - sx) * 0.6, 420 + Math.random() * 200, 1.3, 5, Math.random() < 0.7 ? 3 : -1, 0, 0, 0.3); } }
  if (f.t > 2.2) { dimTo = 0; lboxTo = 0; }
  if (f.t >= 2.6) { finale = null; dimTo = 0; lboxTo = 0; showOver(); }
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
  if (e.kind === "boss") {
    ctx.drawImage(BOSS_SHADOW, e.x - w * 1.1, e.y - w * 0.55, w * 2.2, w * 1.6);
    ctx.globalAlpha = 0.55; ctx.save(); ctx.translate(e.x, e.y); ctx.rotate(-clock * 0.7); ctx.drawImage(INK_SWIRL, -w * 0.95, -w * 0.95, w * 1.9, w * 1.9); ctx.restore(); ctx.globalAlpha = 1;
  }
  if (e.kind === "gold") { ctx.drawImage(GLOW_PEARL, e.x - w, e.y - w, w * 2, w * 2); }
  const flip = ART[art] ? flipFor(e.kind, e.face) : e.face < 0, rot = e.kind === "eel" ? Math.atan2(e.vy, Math.abs(e.vx)) * (flip ? -1 : 1) : 0;
  if (e.kind === "gold" || e.kind === "clam") {
    if (!sprite(art, e.x, e.y + bob, w, hit && e.kind === "clam" ? false : false, e.kind === "clam" ? Math.sin(e.t * 8) * (hit ? 0.12 : 0.03) : 0, flip)) friendShape(ctx, SHAPE_OF[e.kind], e.x, e.y + bob, e.r, 0, hit, e.face, e.t);
    if (e.kind === "gold") { ctx.fillStyle = "#fff6b0"; for (let i = 0; i < 3; i++) { const a = e.t * 4 + i * 2.1; ctx.fillRect(e.x + Math.cos(a) * w * 0.6 - 2, e.y + Math.sin(a) * w * 0.5 - 2, 4, 4); } }
    if (e.kind === "clam") hpBar(e.x, e.y - w * 0.7, 60, ink, "#ffe27a");
    return;
  }
  const sq = hit && !RM;
  if (sq) { ctx.save(); ctx.translate(e.x, e.y + bob); ctx.scale(1.18, 0.86); ctx.translate(-e.x, -e.y - bob); }
  if (ART[art]) {
    // 씻긴 모습을 밑에 두고, 먹물 모습을 남은 체력만큼 덮는다 → 맞을수록 원래 색이 비친다
    if (ART[OK_ART[e.kind]] && ink < 0.98) sprite(OK_ART[e.kind], e.x, e.y + bob, w, false, rot, flip);
    ctx.globalAlpha = 0.3 + ink * 0.7;
    sprite(art, e.x, e.y + bob, w, false, rot, flip);
    if (hit && WHITE[art]) { ctx.globalAlpha = 0.75; sprite(art, e.x, e.y + bob, w, true, rot, flip); }
    ctx.globalAlpha = 1;
  } else friendShape(ctx, SHAPE_OF[e.kind] || e.kind, e.x, e.y + bob, e.r * (e.puff > 0 ? 1.35 : 1), ink, hit, e.face, e.t);
  if (sq) ctx.restore();
  if (e.kind === "boss") hpBar(e.x, e.y - 100, 120, ink, "#8ff0ff");
  else if (e.king) { crown(e.x, e.y - w * 0.45, 14); hpBar(e.x, e.y - w * 0.62, 80, ink, "#ffe27a"); }
}
const JPTS = [[0, 0], [0, 0]];
const SUB_HALO = canvasOf(128, 128, (x, w) => {
  const g = x.createRadialGradient(w / 2, w / 2, 0, w / 2, w / 2, w / 2);
  g.addColorStop(0, "rgba(255,255,255,.3)"); g.addColorStop(0.3, "rgba(210,248,255,.18)"); g.addColorStop(0.5, "rgba(210,248,255,0)");
  g.addColorStop(0.62, "rgba(4,24,60,0)"); g.addColorStop(0.78, "rgba(4,24,60,.18)"); g.addColorStop(1, "rgba(4,24,60,0)");
  x.fillStyle = g; x.fillRect(0, 0, w, w);
});
// 대왕 아래: 땅 그림자 같은 짙은 보랏빛 + 천천히 도는 먹물 소용돌이(무섭지 않게 연보라)
const BOSS_SHADOW = canvasOf(128, 128, (x, w) => { const g = x.createRadialGradient(w / 2, w / 2, 0, w / 2, w / 2, w / 2); g.addColorStop(0, "rgba(30,12,70,.55)"); g.addColorStop(0.6, "rgba(30,12,70,.3)"); g.addColorStop(1, "rgba(30,12,70,0)"); x.fillStyle = g; x.fillRect(0, 0, w, w); });
const INK_SWIRL = canvasOf(256, 256, (x, w) => {
  const m = w / 2; x.lineCap = "round";
  for (let arm = 0; arm < 3; arm++) for (let i = 0; i < 36; i++) { const t0 = i / 36, a = arm * TAU / 3 + t0 * 3.6, r = 30 + t0 * (m - 34); x.strokeStyle = "rgba(" + (arm % 2 ? "120,70,200" : "190,150,255") + "," + (0.75 * (1 - t0)).toFixed(3) + ")"; x.lineWidth = 3 + (1 - t0) * 9; x.beginPath(); x.arc(m, m, r, a, a + 0.25); x.stroke(); }
});
function drawSub(p, t) {
  if (p.inv > 0 && p.dashT <= 0 && mode === "play" && Math.floor(p.inv * 12) % 2) ctx.globalAlpha = 0.45;
  const rot = p.face + Math.PI / 2;
  // 잠수정은 늘 가장 잘 보이게: 바깥은 옅은 그림자 고리, 안은 밝은 빛(미리 그린 그림)
  // 발사 반동만큼 선체가 잠깐 뒤로(그리기만)
  if (recoil && recoil.t < 0.12) { const rk = (1 - recoil.t / 0.12) * 5; p = { x: p.x - Math.cos(recoil.a) * rk, y: p.y - Math.sin(recoil.a) * rk, face: p.face, inv: p.inv, dashT: p.dashT }; }
  // 아래에서 숨 쉬듯 맥동하는 부드러운 빛(lighter) + 바깥 옅은 그림자 고리
  { const pg = 92 + Math.sin(t * 3.2) * 12; ctx.globalCompositeOperation = "lighter"; ctx.globalAlpha = 0.28; ctx.drawImage(F.glowTex(2), p.x - pg / 2, p.y - pg / 2, pg, pg); ctx.globalAlpha = 1; ctx.globalCompositeOperation = "source-over"; }
  ctx.drawImage(SUB_HALO, p.x - 70, p.y - 70, 140, 140);
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
  if (world.load.weapons.zap) { const zl = world.load.weapons.zap, zx = p.x + Math.cos(t * 1.3) * 40, zy = p.y - 34 + Math.sin(t * 2.6) * 5, zw = 28 + zl * 5, charge = 1 - Math.min(1, (world.cd.zap || 0) / 1.0);
    ctx.globalCompositeOperation = "lighter"; const zg = zw * (1.8 + charge * 1.2 + Math.sin(t * 20) * 0.1); ctx.globalAlpha = 0.45 + charge * 0.4; ctx.drawImage(F.glowTex(zl >= 5 ? 10 : 4), zx - zg / 2, zy - zg / 2, zg, zg); ctx.globalAlpha = 1; ctx.globalCompositeOperation = "source-over";
    ctx.globalCompositeOperation = "lighter"; ctx.globalAlpha = 0.7; ctx.drawImage(F.softRing(1), zx - zw * 0.85, zy - zw * 0.85, zw * 1.7, zw * 1.7); ctx.globalAlpha = 1; ctx.globalCompositeOperation = "source-over";
    if (zl >= 3 && charge > 0.6) { JPTS[0][0] = zx - zw * 0.4; JPTS[0][1] = zy; JPTS[1][0] = zx + zw * 0.4; JPTS[1][1] = zy + 4; F.drawLightning(ctx, JPTS, 1, 0.7, (t * 30) | 0, "#fff6a0"); } if (!sprite("zapjelly", zx, zy, zw)) { ctx.fillStyle = "#b9a2ff"; ctx.beginPath(); ctx.arc(zx, zy, zw * 0.35, Math.PI, 0); ctx.fill(); ctx.fillRect(zx - zw * 0.3, zy, zw * 0.08, 8); ctx.fillRect(zx + zw * 0.2, zy, zw * 0.08, 8); } }
}
function render() {
  const k = scale * dpr;
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  const zone = world ? world.zone : L.zoneOf(zoneId);
  // 시작 화면 뒤: 보기 판을 진짜 게임 그림으로 그린다(잠수정은 판에 가리지 않게 한쪽으로 비켜 보인다)
  if (!world && demo && mode === "start") {
    const land = view.w > view.h * 1.15;
    camBiasX = land ? view.w * 0.2 : 0; camBiasY = land ? 0 : view.h * 0.16;
    world = demo;
    try { render(); } finally { world = null; camBiasX = camBiasY = 0; }
    ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.fillStyle = "rgba(8,40,80," + (0.18 + demoFade * 0.7).toFixed(3) + ")"; ctx.fillRect(0, 0, canvas.width, canvas.height);
    return;
  }
  if (!world) { // 보기 판이 없을 때: 천천히 흐르는 바다
    ctx.fillStyle = zone.deep; ctx.fillRect(0, 0, canvas.width, canvas.height);
    const pat = floorPattern(), ox = (clock * 12) % (TILE * k);
    ctx.globalAlpha = 0.55; ctx.setTransform(1, 0, 0, 1, -ox, 0); ctx.fillStyle = pat; ctx.fillRect(ox, 0, canvas.width, canvas.height); ctx.globalAlpha = 1;
    ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.fillStyle = "rgba(10,50,100,.45)"; ctx.fillRect(0, 0, canvas.width, canvas.height);
    rays(k); return;
  }
  const p = world.p;
  // 카메라: 잠수정을 따라가되 바다 밖은 안 보이게
  cam.x = view.w >= L.WORLD.w ? (L.WORLD.w - view.w) / 2 : clamp(p.x - view.w / 2 + camBiasX, 0, L.WORLD.w - view.w);
  cam.y = view.h >= L.WORLD.h ? (L.WORLD.h - view.h) / 2 : clamp(p.y - view.h / 2 + camBiasY, 0, L.WORLD.h - view.h);
  // 흔들림: 충격량의 제곱 × 최대 14 화면 px(움직임 줄이기면 30%), 부드러운 흔들림(사인 섞기)
  if (trauma > 0.01 && mode !== "over") {
    const amp = trauma * trauma * (RM ? 4 : 12) / scale;
    cam.x += (Math.sin(clock * 61.3) * 0.6 + (Math.random() - 0.5) * 0.8) * amp; cam.y += (Math.cos(clock * 53.7) * 0.6 + (Math.random() - 0.5) * 0.8) * amp;
  }
  ctx.fillStyle = "#0a2a48"; ctx.fillRect(0, 0, canvas.width, canvas.height);
  // 확대(punch): 화면 가운데를 기준으로 1 + zoomK 배. 확대만 하므로 바다 밖이 보이지 않는다.
  const zm = 1 + zoomK, wk = k * zm, ox = canvas.width / 2 - (cam.x + view.w / 2) * wk, oy = canvas.height / 2 - (cam.y + view.h / 2) * wk;
  // 바닥(패턴은 월드 원점에 붙는다)
  ctx.setTransform(zm, 0, 0, zm, ox, oy);
  ctx.fillStyle = floorPattern();
  ctx.fillRect(Math.max(0, cam.x) * k, Math.max(0, cam.y) * k, Math.min(view.w, L.WORLD.w) * k, Math.min(view.h, L.WORLD.h) * k);
  ctx.setTransform(wk, 0, 0, wk, ox, oy);
  if (zone.tint) { ctx.fillStyle = zone.tint; ctx.fillRect(cam.x, cam.y, view.w, view.h); }
  // 물결 빛무늬(코스틱) 두 겹이 서로 다르게 흐른다
  if (!causticPat) causticPat = ctx.createPattern(F.CAUSTIC, "repeat");
  ctx.globalCompositeOperation = "lighter"; ctx.fillStyle = causticPat;
  for (let i = 0, nL = F.getQuality() > 0.8 ? 2 : F.getQuality() > 0.5 ? 1 : 0; i < nL; i++) {
    const s = i ? 1.6 : 1.1, dx = clock * (i ? -9 : 14), dy = clock * (i ? 6 : 4);
    ctx.globalAlpha = i ? 0.07 : 0.1; ctx.save(); ctx.translate(dx, dy); ctx.scale(s, s);
    ctx.fillRect((cam.x - dx) / s, (cam.y - dy) / s, view.w / s + 2, view.h / s + 2); ctx.restore();
  }
  ctx.globalAlpha = 1; ctx.globalCompositeOperation = "source-over";
  // 바탕 거품(화면 기준 — 시차로 천천히 흐른다)
  ctx.save(); ctx.translate(cam.x, cam.y); F.ambientDraw(ctx); ctx.restore();
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
  // 큰 진주: 크고, 무지개빛이 돌고, 사라지지 않는다(먹으면 어려운 문제 → 필살기)
  for (const b of world.bigs) {
    const s = 78 * (1 + Math.sin(b.t * 3.5) * 0.07), yb = b.y + Math.sin(b.t * 2) * 4;
    ctx.globalCompositeOperation = "lighter";
    for (let i = 0; i < 6; i++) { const a = b.t * 1.6 + i * TAU / 6, gx = b.x + Math.cos(a) * s * 0.42, gy = yb + Math.sin(a) * s * 0.42, g = s * 0.9; ctx.globalAlpha = 0.45; ctx.drawImage(F.glowTex(F.RAINBOW_IDX[i]), gx - g / 2, gy - g / 2, g, g); }
    const rr = s * (1.05 + ((b.t * 0.8) % 1) * 0.6); ctx.globalAlpha = 0.7 * (1 - ((b.t * 0.8) % 1)); ctx.drawImage(F.softRing(3), b.x - rr, yb - rr, rr * 2, rr * 2);
    ctx.globalAlpha = 1; ctx.globalCompositeOperation = "source-over";
    ctx.drawImage(GLOW_Q, b.x - s * 1.2, yb - s * 1.2, s * 2.4, s * 2.4);
    if (!sprite("qpearl", b.x, yb, s)) { ctx.fillStyle = "#fff6e8"; ctx.beginPath(); ctx.arc(b.x, yb, s * 0.42, 0, TAU); ctx.fill(); }
    ctx.font = "900 17px " + FONT; ctx.textAlign = "center"; ctx.textBaseline = "middle"; ctx.lineJoin = "round"; ctx.lineWidth = 5; ctx.strokeStyle = "rgba(40,20,90,.9)";
    ctx.strokeText("큰 진주", b.x, yb + s * 0.62); ctx.fillStyle = RAINBOW_COL[Math.floor(clock * 6) % 6]; ctx.fillText("큰 진주", b.x, yb + s * 0.62);
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
    // 필살기 물결이 아직 안 닿은 친구: 먹물 모습 그대로 그 자리에서 떨고 있다
    if (f.t < 0) { const x = f.x - f.vx * f.t, y = f.y - f.vy * f.t; if (!vis(x, y)) continue; const art = ART_OF[f.kind] || f.kind, w = EW[f.kind] * (f.elite ? L.ELITE.r : 1); if (!sprite(art, x + Math.sin(clock * 40 + x) * 1.5, y, w, false, 0, false)) friendShape(ctx, SHAPE_OF[f.kind] || f.kind, x, y, L.ENEMIES[f.kind].r, 1, false, 1, clock); continue; }
    if (!vis(f.x, f.y)) continue;
    const a = f.t < 1 ? 1 : 1 - (f.t - 1) / 0.4;
    ctx.globalAlpha = Math.max(0, a);
    // 씻기는 순간 '뽁' 하고 커졌다가(찌그러짐) 웃으며 헤엄쳐 간다
    const pop = f.t < 0.2 ? 1 + Math.sin(f.t / 0.2 * Math.PI) * 0.4 : 1;
    const w = EW[f.kind] * (f.kind === "boss" ? 1 : 0.95) * (f.elite ? L.ELITE.r : 1) * pop, wig = Math.sin(f.t * 14) * 0.12;
    if (!sprite(OK_ART[f.kind], f.x, f.y, w, false, wig, flipFor(f.kind, f.face))) friendShape(ctx, SHAPE_OF[f.kind] || f.kind, f.x, f.y, L.ENEMIES[f.kind].r * pop, 0, false, f.face, f.t);
    // 씻기는 순간 그 친구 모양 그대로 하얗게 번쩍(과녁 같은 원판 대신)
    if (f.t < 0.1 && WHITE[OK_ART[f.kind]]) { ctx.globalAlpha = 0.9 * (1 - f.t / 0.1); sprite(OK_ART[f.kind], f.x, f.y, w * 1.04, true, wig, flipFor(f.kind, f.face)); ctx.globalAlpha = Math.max(0, a); }
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
  drawUnderFx(p);
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
  // 먹물 방울은 피해야 하는 것: 분홍빨강 고리가 콩닥(씻어 줄 친구와 한눈에 구별)
  ctx.strokeStyle = "#ff4f7a"; ctx.lineWidth = 3; ctx.globalAlpha = 0.65 + Math.sin(clock * 14) * 0.3; ctx.beginPath();
  for (const ink of world.inks) { if (!vis(ink.x, ink.y)) continue; const rr = 15 + Math.sin(clock * 14) * 2; ctx.moveTo(ink.x + rr, ink.y); ctx.arc(ink.x, ink.y, rr, 0, TAU); }
  ctx.stroke(); ctx.globalAlpha = 1; ctx.fillStyle = "#2b2550";
  ctx.fillStyle = "rgba(255,255,255,.5)";
  for (const ink of world.inks) { if (!vis(ink.x, ink.y)) continue; ctx.beginPath(); ctx.arc(ink.x - 3, ink.y - 3, 3, 0, TAU); ctx.fill(); }
  // 장면 어둡게(필살기·대왕·터보): 짙은 남청색을 곱해서 바다만 가라앉힌다. 이 아래(바다·친구)는 어두워지고, 이 위(효과·잠수정)는 그대로 밝다.
  if (dimA > 0.01) { ctx.globalCompositeOperation = "multiply"; ctx.globalAlpha = Math.min(1, dimA * 1.15); ctx.fillStyle = "#3a5f8c"; ctx.fillRect(cam.x - 20, cam.y - 20, view.w + 40, view.h + 40); ctx.globalCompositeOperation = "source-over"; ctx.globalAlpha = 1; }
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
    const wc = s.evo ? "#c58cff" : lvHex(s.lv);
    ctx.globalAlpha = 0.28; ctx.strokeStyle = wc; ctx.lineWidth = s.size * 1.6; ctx.beginPath(); ctx.arc(p.x, p.y, s.r, 0, TAU); ctx.stroke();
    // 물살 꼬리: 각 물살 뒤로 굵은 호 + 가는 흰 호
    ctx.lineCap = "round";
    for (let i = 0; i < s.n; i++) {
      const a = world.whirlAng + i * TAU / s.n;
      ctx.globalAlpha = 0.75; ctx.strokeStyle = wc; ctx.lineWidth = s.size * 1.25; ctx.beginPath(); ctx.arc(p.x, p.y, s.r, a - 1.1, a); ctx.stroke();
      ctx.globalAlpha = 0.9; ctx.strokeStyle = "#ffffff"; ctx.lineWidth = s.size * 0.35; ctx.beginPath(); ctx.arc(p.x, p.y, s.r, a - 0.7, a); ctx.stroke();
    }
    ctx.globalAlpha = 1;
    // 물살 머리 뒤의 빛무리(lighter) — 단계가 오를수록 크고 진하게
    ctx.globalCompositeOperation = "lighter";
    const wci = s.evo ? 11 : lvCol(s.lv);
    for (let i = 0; i < s.n; i++) {
      const a = world.whirlAng + i * TAU / s.n, ox = p.x + Math.cos(a) * s.r, oy = p.y + Math.sin(a) * s.r, g = s.size * (3 + s.lv * 0.95);
      ctx.globalAlpha = 0.55 + s.lv * 0.07; ctx.drawImage(F.glowTex(wci), ox - g / 2, oy - g / 2, g, g);
    }
    ctx.globalAlpha = 1; ctx.globalCompositeOperation = "source-over";
    for (let i = 0; i < s.n; i++) {
      const a = world.whirlAng + i * TAU / s.n, ox = p.x + Math.cos(a) * s.r, oy = p.y + Math.sin(a) * s.r, sz = s.size * (2.2 + s.lv * 0.38);
      ctx.save(); ctx.translate(ox, oy); ctx.rotate(-world.t * 9); ctx.drawImage(tex, -sz / 2, -sz / 2, sz, sz); ctx.restore();
    }
  }
  // 소라 부메랑
  // 소라 빛 리본: 지나온 길(같은 식으로 거꾸로 계산)을 굵게→가늘게, 단계 색 + 흰 심
  ctx.lineCap = "round"; ctx.lineJoin = "round";
  for (const sh of world.shells) {
    const segs = 6 + sh.lv * 2, ux = Math.cos(sh.a), uy = Math.sin(sh.a), col = lvHex(sh.lv);
    for (let pass = 0; pass < 2; pass++) {
      let px0 = sh.x, py0 = sh.y;
      if (pass === 0) ctx.globalCompositeOperation = "lighter";
      for (let i = 1; i <= segs; i++) {
        const tt = sh.t - i * 0.022; if (tt <= 0) break;
        const kq = tt / sh.T, out = Math.sin(Math.PI * kq) * sh.dist, side = Math.sin(TAU * kq) * 34 * sh.k, gx = p.x + ux * out - uy * side, gy = p.y + uy * out + ux * side, f = 1 - i / segs;
        ctx.globalAlpha = pass ? f * 0.9 : f * 0.75; ctx.strokeStyle = pass ? "#ffffff" : col; ctx.lineWidth = (pass ? 0.35 : 1.1) * sh.r * (0.3 + f);
        ctx.beginPath(); ctx.moveTo(px0, py0); ctx.lineTo(gx, gy); ctx.stroke(); px0 = gx; py0 = gy;
      }
      ctx.globalCompositeOperation = "source-over";
    }
  }
  ctx.globalAlpha = 1;
  for (const sh of world.shells) for (let gI = 3; gI >= 1; gI--) { // 회전 잔상
    const tt = sh.t - gI * 0.04; if (tt <= 0) continue;
    const kq = tt / sh.T, out = Math.sin(Math.PI * kq) * sh.dist, side = Math.sin(TAU * kq) * 34 * sh.k, ux = Math.cos(sh.a), uy = Math.sin(sh.a);
    ctx.globalAlpha = 0.42 - gI * 0.11; const gx = p.x + ux * out - uy * side, gy = p.y + uy * out + ux * side;
    if (!sprite("shell", gx, gy, sh.r * 2.3, false, tt * 14 * sh.k)) shellShape(ctx, gx, gy, sh.r, tt * 14 * sh.k);
  }
  ctx.globalAlpha = 1;
  for (const sh of world.shells) { const rot = sh.t * 14 * sh.k, g = sh.r * (2.6 + sh.lv * 0.7); ctx.globalCompositeOperation = "lighter"; ctx.globalAlpha = 0.5 + sh.lv * 0.1; ctx.drawImage(F.glowTex(lvCol(sh.lv)), sh.x - g / 2, sh.y - g / 2, g, g); ctx.globalAlpha = 0.8; ctx.drawImage(F.softRing(1), sh.x - sh.r * 1.8, sh.y - sh.r * 1.8, sh.r * 3.6, sh.r * 3.6); ctx.globalCompositeOperation = "source-over"; ctx.globalAlpha = 1; if (!sprite("shell", sh.x, sh.y, sh.r * (1.9 + sh.lv * 0.2), false, rot)) shellShape(ctx, sh.x, sh.y, sh.r, rot); }
  // 탄: 방울·불가사리
  let ri = 0;
  // 꼬리: 방울은 뒤로 길게 남는 물줄기(단계 색), 불가사리는 빛나는 꼬리
  ctx.lineCap = "round";
  for (let pass = 0; pass < 2; pass++) for (const s of world.shots) {
    if (!vis(s.x, s.y)) continue;
    const tl = s.k === "b" ? 0.08 + s.lv * 0.045 : 0.07 + s.lv * 0.035, col = s.k === "b" ? (s.rainbow ? RAINBOW_COL[(s.x | 0) % 6] : BUB_COL[Math.min(4, s.lv - 1)]) : "#ffd27a";
    ctx.globalAlpha = pass ? 0.9 : 0.4; ctx.strokeStyle = pass ? "#ffffff" : col; ctx.lineWidth = pass ? s.r * 0.45 : s.r * (1.1 + s.lv * 0.18);
    ctx.beginPath(); ctx.moveTo(s.x - s.vx * tl * (pass ? 0.6 : 1), s.y - s.vy * tl * (pass ? 0.6 : 1)); ctx.lineTo(s.x, s.y); ctx.stroke();
  }
  // 탄 빛무리: lighter 로 겹쳐 진짜 빛나 보이게(단계 색, 무지개면 돌아가며)
  ctx.globalCompositeOperation = "lighter";
  for (const s of world.shots) {
    if (!vis(s.x, s.y)) continue;
    const ci = s.k === "b" ? (s.rainbow ? F.RAINBOW_IDX[((s.x | 0) % 6 + 6) % 6] : lvCol(s.lv)) : s.lv >= 5 ? 6 : 7, g = s.r * (s.k === "b" ? 3.2 + s.lv * 0.5 : 3.2 + s.lv * 0.4);
    ctx.globalAlpha = s.k === "b" ? 0.55 + s.lv * 0.09 : 0.6 + s.lv * 0.08; ctx.drawImage(F.glowTex(ci), s.x - g / 2, s.y - g / 2, g, g);
    if (s.k === "b") for (let j = 1; j <= 3; j++) { const gj = g * (0.7 - j * 0.14); ctx.globalAlpha = 0.42 - j * 0.11; ctx.drawImage(F.glowTex(ci), s.x - s.vx * 0.022 * j - gj / 2, s.y - s.vy * 0.022 * j - gj / 2, gj, gj); }
    // 내 것 표시: 불가사리 표창은 하늘빛 고리
    else { ctx.globalAlpha = 0.8; ctx.drawImage(F.softRing(1), s.x - s.r * 1.9, s.y - s.r * 1.9, s.r * 3.8, s.r * 3.8); }
  }
  ctx.globalAlpha = 1; ctx.globalCompositeOperation = "source-over";
  for (const s of world.shots) {
    if (!vis(s.x, s.y)) continue;
    if (s.k === "b") {
      const sz = s.r * (2.3 + s.lv * 0.22) * (1 + Math.sin(clock * 30 + s.x) * 0.06);
      // 4단계부터 잔상 방울이 뒤따른다(5단계는 둘)
      if (s.lv >= 4) for (let gI = s.lv >= 5 ? 2 : 1; gI >= 1; gI--) { const tex = s.rainbow ? RAINBOW[(ri + gI) % 6] : BUB[Math.min(4, s.lv)], gs = sz * (1 - gI * 0.18), gx = s.x - s.vx * 0.035 * gI, gy = s.y - s.vy * 0.035 * gI; ctx.globalAlpha = 0.45 - gI * 0.15; ctx.drawImage(tex, gx - gs / 2, gy - gs / 2, gs, gs); }
      ctx.globalAlpha = 1;
      if (s.rainbow) ctx.drawImage(RAINBOW[ri++ % 6], s.x - sz / 2, s.y - sz / 2, sz, sz);
      else ctx.drawImage(BUB[Math.min(4, s.lv)], s.x - sz / 2, s.y - sz / 2, sz, sz);
    } else {
      const sz = s.r * (2.1 + s.lv * 0.32);
      if (s.lv >= 4) for (let gI = s.lv >= 5 ? 2 : 1; gI >= 1; gI--) { ctx.globalAlpha = 0.4 - gI * 0.12; sprite("star", s.x - s.vx * 0.035 * gI, s.y - s.vy * 0.035 * gI, sz * (1 - gI * 0.15), false, s.spin - gI * 0.5); }
      ctx.globalAlpha = 1;
      if (!sprite("star", s.x, s.y, sz, false, s.spin)) { ctx.save(); ctx.translate(s.x, s.y); ctx.rotate(s.spin); star5(ctx, 0, 0, s.r * 1.2, s.lv >= 5 ? "#ff6fae" : s.lv >= 3 ? "#ff8a4a" : "#ffad5a"); ctx.restore(); }
    }
  }
  // 전기: 굵은 띠 + 가는 흰 줄(지그재그는 seed 로 고정)
  ctx.lineJoin = "round"; ctx.lineCap = "round";
  // 번개는 곁의 전기 해파리에게서 나간다. 두 프레임마다 모양이 바뀌어 지지직 떨린다. 단계가 오를수록 굵고 곁가지가 많다.
  // 잔번개: 엔진 번개가 사라진 뒤에도 0.45초 동안 두세 번 다시 번쩍(꾸밈만). 새 번개는 한 번만 베껴 둔다.
  for (const z of world.fx.zaps) if (!z.seen) { z.seen = true; if (boltEcho.length >= 6) boltEcho.shift(); boltEcho.push({ pts: z.pts.map(q => [q[0], q[1]]), lv: z.lv, t: 0, seed: (z.seed * 1000) | 0 }); }
  for (const b of boltEcho) {
    if (b.t < 0.2 || b.t > 0.45) continue;
    const fl = (Math.floor(b.t * 30) % 3 === 0 ? 1 : 0.35) * (1 - (b.t - 0.2) / 0.25);
    b.pts[0][0] = p.x + Math.cos(clock * 1.3) * 40; b.pts[0][1] = p.y - 34 + Math.sin(clock * 2.6) * 5;
    F.drawLightning(ctx, b.pts, Math.max(1, b.lv - 1), fl * 0.8, b.seed + ((clock * 20) | 0), lvHex(b.lv));
  }
  for (const z of world.fx.zaps) {
    const za = Math.min(1, z.t / 0.12), pts = z.pts;
    if (pts.length > 1) { pts[0][0] = p.x + Math.cos(clock * 1.3) * 40; pts[0][1] = p.y - 34 + Math.sin(clock * 2.6) * 5; }
    F.drawLightning(ctx, pts, z.lv, za, ((z.seed * 100) | 0) + ((clock * 30) | 0), lvHex(z.lv));
    // 맞은 자리마다 빛 꽃
    ctx.globalCompositeOperation = "lighter";
    for (let i = 1; i < pts.length; i++) { const g = 40 + z.lv * 10; ctx.globalAlpha = za * 0.9; ctx.drawImage(F.glowTex(10), pts[i][0] - g / 2, pts[i][1] - g / 2, g, g); }
    ctx.globalAlpha = 1; ctx.globalCompositeOperation = "source-over";
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
    const mk = 1 - muzzle.t / 0.08, mx = p.x + Math.cos(muzzle.a) * 30, my = p.y + Math.sin(muzzle.a) * 30, ms = (60 + muzzle.lv * 14) * (0.7 + mk * 0.5);
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
  // 충격파
  F.drawShocks(ctx);
  // 슈웅! 잔상: 지나온 자리에 잠수정 그림이 옅게(밝게 겹쳐) 남는다
  if (ghosts.length) {
    const art = L.PILOTS[world.kid].art;
    for (let i = 0; i < ghosts.length; i++) { const g = ghosts[i], a = (1 - g.age / 0.3) * 0.55; if (a <= 0) continue; ctx.globalAlpha = a; sprite(art, g.x, g.y, 50, false, g.rot); ctx.globalCompositeOperation = "lighter"; ctx.globalAlpha = a * 0.6; sprite(art, g.x, g.y, 52, false, g.rot); ctx.globalCompositeOperation = "source-over"; }
    ctx.globalAlpha = 1;
  }
  // 잠수정 뒤 빛: 카드로 변신한 직후·무지개 터보면 크게
  if (subGlow > 0 || fever) {
    ctx.globalCompositeOperation = "lighter";
    const sg2 = Math.max(0, subGlow), gs = 120 + sg2 * 160 + (fever ? 50 + Math.sin(clock * 14) * 14 : 0);
    ctx.globalAlpha = Math.min(0.7, 0.22 + sg2 * 0.5); ctx.drawImage(F.glowTex(fever ? F.RAINBOW_IDX[Math.floor(clock * 10) % 6] : 0), p.x - gs / 2, p.y - gs / 2, gs, gs);
    ctx.globalAlpha = 1; ctx.globalCompositeOperation = "source-over";
  }
  // 무지개 터보: 잠수정을 감싸는 무지개 고리가 돈다
  if (fever) { for (let i = 0; i < 3; i++) { ctx.globalAlpha = 0.75; ctx.strokeStyle = RAINBOW_COL[(i * 2 + Math.floor(clock * 12)) % 6]; ctx.lineWidth = 4; ctx.beginPath(); ctx.arc(p.x, p.y, 40 + i * 6 + Math.sin(clock * 9 + i) * 3, clock * 6 + i, clock * 6 + i + 4.2); ctx.stroke(); } ctx.globalAlpha = 1; }
  // 효과 그림(fx_*.webp)
  for (const f of fxList) drawFxItem(f);
  // 반짝 입자(물방울·빛 줄·별)
  F.drawSparks(ctx, cam.x - 60, cam.y - 60, cam.x + view.w + 60, cam.y + view.h + 60);
  // 큰 폭발 뒤 천천히 도는 빛살 쐐기 · 필살기 모으는 동안 커지는 빛
  if (godRays > 0 || (ult && !ult.fired)) {
    ctx.globalCompositeOperation = "lighter";
    if (godRays > 0) { const a = Math.min(1, godRays / 0.6) * 0.18; for (let i = 0; i < 7; i++) { const an = clock * 0.35 + i * TAU / 7, len = godR * (0.8 + (i % 3) * 0.15), bw = len * 0.2; ctx.globalAlpha = a; ctx.save(); ctx.translate(godX, godY); ctx.rotate(an); ctx.drawImage(F.RAYTEX, 0, -bw / 2, len, bw); ctx.restore(); } }
    if (ult && !ult.fired) { const k2 = Math.min(1, ult.t / ULT_HIT), g = 50 + k2 * k2 * 150 + Math.sin(clock * 30) * 6; ctx.globalAlpha = 0.35 + k2 * 0.35; ctx.drawImage(F.glowTex(1), p.x - g / 2, p.y - g / 2, g, g); }
    ctx.globalAlpha = 1; ctx.globalCompositeOperation = "source-over";
  }
  // 잠수정은 모든 공격 효과보다 위에(아이가 자기 잠수정을 놓치지 않게)
  drawSub(p, clock);
  if (finale) drawFinaleFriend();
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
  const CW = canvas.width, CH = canvas.height;
  // 속도선: 슈웅!·무지개 터보·필살기 때 가운데(잠수정)에서 바깥으로
  if (speedA > 0.01 && !RM) {
    const sx2 = ox + p.x * wk, sy2 = oy + p.y * wk, seed = Math.floor(clock * 20);
    if (fever) { for (let i = 0; i < 3; i++) F.speedLines(ctx, sx2, sy2, CW, CH, F.getQuality() > 0.6 ? 14 : 8, speedA * 0.5, seed + i * 31, RAINBOW_COL[(i * 2 + seed) % 6], 0.3, 3 * dpr); }
    else F.speedLines(ctx, sx2, sy2, CW, CH, 26, speedA * 0.55, seed, speedCol, 0.3, 3 * dpr);
  }
  // 무지개 터보 들어갈 때: 화면 가장자리에서 무지개 띠가 쓸고 지나간다
  if (feverIntro > 0) { const fi = Math.max(0, feverIntro); ctx.globalCompositeOperation = "lighter"; ctx.globalAlpha = fi * 0.5; for (let i = 0; i < 6; i++) { ctx.fillStyle = RAINBOW_COL[i]; const hgt = CH / 6, yy = i * hgt, xs = (1 - fi) * CW * 1.4 - CW * 0.4; ctx.fillRect(xs - CW * 0.25, yy, CW * 0.25, hgt); } ctx.globalAlpha = 1; ctx.globalCompositeOperation = "source-over"; }
  // 어둡게(필살기·대왕 등장·끝 장면): 가장자리 그림자 + 옅은 전체
  if (dimA > 0.01) { ctx.globalAlpha = Math.min(0.85, dimA * 1.1); ctx.drawImage(F.VIGNETTE, 0, 0, CW, CH); ctx.globalAlpha = 1; }
  if (fever) { ctx.globalAlpha = 0.55 + Math.sin(clock * 10) * 0.25; ctx.drawImage(FEVER_EDGE, 0, 0, CW, CH); ctx.globalAlpha = 1; }
  if (edgeFlash > 0) { ctx.globalAlpha = Math.min(0.75, edgeFlash * 2.5); ctx.drawImage(EDGE_FLASH, 0, 0, CW, CH); ctx.globalAlpha = 1; }
  if (flash > 0) { ctx.fillStyle = "rgba(" + flashCol + "," + Math.min(0.42, flash * 1.8).toFixed(2) + ")"; ctx.fillRect(0, 0, CW, CH); }
  // 위아래 영화 띠
  if (lbox > 0.01) { const bh = CH * 0.085 * lbox; ctx.fillStyle = "rgba(2,8,24,.9)"; ctx.fillRect(0, 0, CW, bh); ctx.fillRect(0, CH - bh, CW, bh); }
  // 대왕이 화면 밖이면 가장자리에 대왕 쪽을 가리키는 표시
  if (world.boss && mode === "play") {
    const b = world.boss, bx = ox + b.x * wk, by2 = oy + b.y * wk, pad = 46 * dpr;
    if (bx < 0 || bx > CW || by2 < 0 || by2 > CH) {
      const cx2 = CW / 2, cy2 = CH / 2, dx = bx - cx2, dy = by2 - cy2, kx = (CW / 2 - pad) / Math.max(1, Math.abs(dx)), ky = (CH / 2 - pad) / Math.max(1, Math.abs(dy)), kk = Math.min(kx, ky), ax = cx2 + dx * kk, ay = cy2 + dy * kk, an = Math.atan2(dy, dx), rr = 20 * dpr * (1 + Math.sin(clock * 8) * 0.08);
      ctx.fillStyle = "#7a4fd8"; ctx.beginPath(); ctx.moveTo(ax + Math.cos(an) * rr * 1.9, ay + Math.sin(an) * rr * 1.9); ctx.lineTo(ax + Math.cos(an + 0.6) * rr, ay + Math.sin(an + 0.6) * rr); ctx.lineTo(ax + Math.cos(an - 0.6) * rr, ay + Math.sin(an - 0.6) * rr); ctx.closePath(); ctx.fill();
      ctx.beginPath(); ctx.arc(ax, ay, rr, 0, TAU); ctx.fill(); ctx.strokeStyle = "#ffffff"; ctx.lineWidth = 3 * dpr; ctx.stroke();
      ctx.fillStyle = "#ffe27a"; ctx.font = "900 " + Math.round(18 * dpr) + "px " + FONT; ctx.textAlign = "center"; ctx.textBaseline = "middle"; ctx.fillText("대왕", ax, ay + 1);
    }
  }
  // 대왕 등장 글씨 띠
  if (bossIntroT > 0) {
    ctx.setTransform(k, 0, 0, k, 0, 0);
    const a = Math.min(1, bossIntroT / 0.3, (1.3 - bossIntroT) / 0.15 + 0.01), yy = view.h * 0.74;
    ctx.globalAlpha = a * 0.8; ctx.fillStyle = "#2a1650"; ctx.fillRect(0, yy - 26, view.w, 52);
    ctx.globalAlpha = a; ctx.fillStyle = "#c58cff"; ctx.fillRect(0, yy - 30, view.w, 4); ctx.fillRect(0, yy + 26, view.w, 4);
    ctx.font = "900 26px " + FONT; ctx.textAlign = "center"; ctx.textBaseline = "middle"; ctx.fillStyle = "#ffffff";
    const off = (clock * 120) % 260; for (let x = -260 + off; x < view.w + 260; x += 260) ctx.fillText("대왕 등장 · 대왕 등장", x, yy + 1);
    ctx.globalAlpha = 1; ctx.setTransform(1, 0, 0, 1, 0, 0);
  }
  // 한 번에 여러 마리: 가운데 큰 글자가 튀어 오른다
  if (multiBan && mode === "play" && !(bannerT > 0)) {
    ctx.setTransform(k, 0, 0, k, 0, 0);
    const mt = multiBan.t, pop = mt < 0.15 ? 0.5 + mt / 0.15 * 0.75 : mt < 0.3 ? 1.25 - (mt - 0.15) / 0.15 * 0.25 : 1, px = [34, 42, 52][multiBan.tier] * pop * (Math.min(vw, vh) < 500 ? 0.7 : 1);
    ctx.globalAlpha = mt > 0.8 ? Math.max(0, (1.1 - mt) / 0.3) : 1;
    ctx.font = "900 " + Math.round(px) + "px " + FONT; ctx.textBaseline = "middle"; ctx.lineJoin = "round"; ctx.lineWidth = 9; ctx.strokeStyle = "rgba(6,30,60,.92)";
    // 잠수정·가운데를 가리지 않게: 넓은 화면은 왼쪽 위, 세로 화면은 HUD 아래 가운데(콤보 숫자 밑)
    const wide = view.w > view.h * 1.2, mxp = wide ? 18 : view.w / 2, my = topSafe + 28 - mt * 8;
    ctx.textAlign = wide ? "left" : "center"; ctx.strokeText(multiBan.text, mxp, my);
    ctx.fillStyle = multiBan.tier === 2 ? RAINBOW_COL[Math.floor(clock * 12) % 6] : multiBan.tier === 1 ? "#ff9ee0" : "#7dffb0"; ctx.fillText(multiBan.text, mxp, my);
    ctx.globalAlpha = 1;
  }
  // 콤보 숫자(오른쪽 위): 단계 이름과 색, 단계가 바뀌면 튀어 오른다
  if (world.combo >= 3 && mode === "play" && !(bannerT > 0) && !(multiBan && !(view.w > view.h * 1.2))) {
    ctx.setTransform(k, 0, 0, k, 0, 0);
    const c = world.combo, sz = Math.min(52, 24 + Math.log2(c) * 5) * (Math.min(vw, vh) < 500 ? 0.62 : 1), bump = (world.comboT > L.FEVER.gap - 0.1 ? 1.15 : 1) * (1 + comboPop * 0.9);
    const cx = view.w - 16, cy = topSafe + sz * bump * 0.62 + 6;
    ctx.globalAlpha = Math.min(1, world.comboT / 0.4 + 0.3);
    const ti = L.comboTier(c), T = ti >= 0 ? L.COMBO_TIERS[ti] : null;
    // 콤보가 끊기기까지 남은 시간: 숫자 왼쪽의 작은 고리
    { ctx.font = "900 " + Math.round(sz * bump) + "px " + FONT; const rx = cx - ctx.measureText(c + " 콤보").width - 24, kk = Math.max(0, world.comboT / L.FEVER.gap); ctx.lineWidth = 6; ctx.strokeStyle = "rgba(6,30,60,.6)"; ctx.beginPath(); ctx.arc(rx, cy, 13, 0, TAU); ctx.stroke(); ctx.strokeStyle = !T ? "#ffe27a" : T.color === "rainbow" ? RAINBOW_COL[Math.floor(clock * 10) % 6] : T.color; ctx.lineWidth = 5; ctx.beginPath(); ctx.arc(rx, cy, 13, -Math.PI / 2, -Math.PI / 2 + kk * TAU); ctx.stroke(); }
    ctx.textAlign = "right"; ctx.textBaseline = "middle"; ctx.lineJoin = "round";
    ctx.font = "900 " + Math.round(sz * bump) + "px " + FONT; ctx.lineWidth = 7; ctx.strokeStyle = "rgba(6,30,60,.88)";
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
  if (bannerT > 0 && mode !== "over" && !ult) {
    const by = mode === "play" || mode === "paused" ? topSafe + 24 : view.h * 0.74;
    ctx.setTransform(k, 0, 0, k, 0, 0);
    // 아주 큰 글자는 튀어나오듯 커졌다가 자리 잡는다
    const age = bannerT0 - bannerT, pop = bannerHuge && age < 0.25 ? 0.6 + age / 0.25 * 0.55 : bannerHuge && age < 0.4 ? 1.15 - (age - 0.25) / 0.15 * 0.15 : 1;
    const maxPx = mode === "play" ? (bannerHuge ? 30 : 24) : bannerHuge ? 40 : 26, px = Math.min(maxPx, Math.max(16, Math.floor(view.w * 0.94 / Math.max(1, banner.length)))) * pop;
    ctx.globalAlpha = Math.min(1, bannerT * 2); ctx.font = (bannerBig ? "900 " + Math.round(px) + "px " : "800 21px ") + FONT; ctx.textAlign = "center"; ctx.textBaseline = "middle";
    ctx.lineWidth = bannerHuge ? 8 : 6; ctx.lineJoin = "round"; ctx.strokeStyle = "rgba(6,30,60,.9)"; ctx.strokeText(banner, view.w / 2, by);
    ctx.fillStyle = bannerBig ? (world && world.fever > 0 && banner.startsWith("무지개") ? RAINBOW_COL[Math.floor(clock * 10) % 6] : "#ffe27a") : "#ffffff"; ctx.fillText(banner, view.w / 2, by);
    if (bannerSub) { ctx.font = "800 " + Math.min(19, Math.max(13, Math.floor(view.w * 0.9 / Math.max(1, bannerSub.length)))) + "px " + FONT; ctx.lineWidth = 5; ctx.strokeText(bannerSub, view.w / 2, by + px * 0.5 + 18); ctx.fillStyle = "#ffffff"; ctx.fillText(bannerSub, view.w / 2, by + px * 0.5 + 18); }
    ctx.globalAlpha = 1;
  }
  if (ult) drawUltOverlay(k);
}
/* ---------- 친구 아래에 까는 빛: 등대 빛 회전 빛살 · 소용돌이 판 · 보물 조개 빛기둥 · 둘러싸기 경고 ---------- */
const BEAM = canvasOf(256, 64, (x, w, h) => {
  const g = x.createLinearGradient(0, 0, w, 0); g.addColorStop(0, "rgba(255,246,190,.95)"); g.addColorStop(0.5, "rgba(255,226,122,.35)"); g.addColorStop(1, "rgba(255,226,122,0)");
  x.fillStyle = g; x.beginPath(); x.moveTo(0, h / 2 - 4); x.lineTo(w, 0); x.lineTo(w, h); x.lineTo(0, h / 2 + 4); x.closePath(); x.fill();
});
const VORTEX = canvasOf(256, 256, (x, w) => {
  const m = w / 2; x.lineCap = "round";
  for (let arm = 0; arm < 4; arm++) for (let i = 0; i < 40; i++) {
    const t0 = i / 40, a = arm * TAU / 4 + t0 * 4.2, r = 18 + t0 * (m - 22);
    x.strokeStyle = "rgba(255,255,255," + (0.85 * (1 - t0)).toFixed(3) + ")"; x.lineWidth = 2 + (1 - t0) * 7;
    x.beginPath(); x.arc(m, m, r, a, a + 0.22); x.stroke();
  }
});
const COLUMN = canvasOf(64, 256, (x, w, h) => { const g = x.createLinearGradient(0, h, 0, 0); g.addColorStop(0, "rgba(255,236,150,.9)"); g.addColorStop(1, "rgba(255,236,150,0)"); x.fillStyle = g; x.fillRect(w * 0.2, 0, w * 0.6, h); });
function drawUnderFx(p) {
  const ld = world.load;
  ctx.globalCompositeOperation = "lighter";
  // 등대 빛: 단계만큼 빛살이 빙글 돈다(2·2·3·3·4), 빛 물결을 쏠 때가 다가오면 밝아진다
  if (ld.weapons.light) {
    const lv = ld.weapons.light, s = L.weaponStats("light", lv, false, world.m), n = lv >= 5 ? 4 : lv >= 3 ? 3 : 2, len = s.r * 1.25;
    const charge = 1 - Math.min(1, (world.cd.light || 0) / s.every), base = 0.08 + charge * 0.14;
    for (let i = 0; i < n; i++) {
      const a = clock * (0.9 + lv * 0.1) + i * TAU / n;
      ctx.save(); ctx.translate(p.x, p.y); ctx.rotate(a); ctx.globalAlpha = base; { const bw = len * (0.18 + lv * 0.06); ctx.drawImage(BEAM, 0, -bw / 2, len, bw); } ctx.restore();
    }
    ctx.globalAlpha = 0.25 + charge * 0.35; const g = 60 + charge * 50; ctx.drawImage(F.glowTex(3), p.x - g / 2, p.y - g / 2, g, g);
  }
  // 회오리: 3단계부터 잠수정 아래 소용돌이 판(합체면 크고 보라·분홍)
  if (ld.weapons.whirl) {
    const s = L.weaponStats("whirl", ld.weapons.whirl, !!ld.evo.whirl, world.m);
    if (s.lv >= 3 || s.evo) { const R = s.r * (s.evo ? 1.7 : 1.3); ctx.globalAlpha = s.evo ? 0.28 : 0.08 + s.lv * 0.025; ctx.save(); ctx.translate(p.x, p.y); ctx.rotate(-world.whirlAng * 0.8); ctx.drawImage(VORTEX, -R, -R, R * 2, R * 2); if (s.evo) { ctx.rotate(world.whirlAng * 1.3); ctx.globalAlpha = 0.25; ctx.drawImage(VORTEX, -R * 0.7, -R * 0.7, R * 1.4, R * 1.4); } ctx.restore(); }
  }
  // 보물 조개: 위로 솟는 빛기둥
  for (const e of world.enemies) if (e.kind === "clam") { ctx.globalAlpha = 0.45 + Math.sin(clock * 5) * 0.15; ctx.drawImage(COLUMN, e.x - 40, e.y - 300, 80, 300); }
  ctx.globalAlpha = 1; ctx.globalCompositeOperation = "source-over";
  // 먹물 떼가 둘러쌀 때: 조여 오는 점선 고리
  if (ringWarn > 0) {
    const k2 = 1 - ringWarn / 1.6, R = Math.min(view.w, view.h) * (0.62 - k2 * 0.25);
    ctx.globalAlpha = Math.min(1, ringWarn) * 0.8; ctx.strokeStyle = "#c58cff"; ctx.lineWidth = 6; ctx.setLineDash([18, 14]); ctx.lineDashOffset = -clock * 60;
    ctx.beginPath(); ctx.arc(p.x, p.y, R, 0, TAU); ctx.stroke(); ctx.setLineDash([]); ctx.globalAlpha = 1;
  }
}
// 빛줄기 셋(미리 그린 띠를 비스듬히 늘여 붙인다)
function rays(k) {
  for (let i = 0; i < 4; i++) {
    const x = ((i * 0.29 + clock * 0.01 * (i + 1)) % 1.3 - 0.15) * canvas.width, wd = (90 + (i * 37) % 70) * k;
    ctx.globalAlpha = 0.06 + 0.05 * (0.5 + 0.5 * Math.sin(clock * 0.7 + i * 1.9));
    ctx.save(); ctx.translate(x, -20); ctx.rotate(0.38); ctx.drawImage(RAY, -wd / 2, 0, wd, canvas.height * 1.5); ctx.restore();
  }
  ctx.globalAlpha = 1;
}

let last = performance.now(), lastUpdateMs = 0, lastRenderMs = 0;
// 화면 꾸밈 시계(글자·번쩍임·물결). 게임 시간과는 따로 간다.
// HUD·터보 막대 바로 아래(논리 칸). 큰 글자는 이보다 아래, 가운데·잠수정에서 비켜 둔다. 0.5초마다 다시 잰다.
let topSafe = 70, topSafeAt = -9;
function measureTop() { try { const r = feverEl.getBoundingClientRect(), h = $("hud").getBoundingClientRect(); const b = Math.max(r.bottom || 0, h.bottom || 0); if (b > 0) topSafe = b / scale + 6; } catch (_) {} }
let lastCamX = 0, lastCamY = 0, lastShellCd = 0, lastStarCd = 0, emitAcc = 0;
function ui(rdt) {
  // 느리게(slow-mo): 꾸밈 시계만 늦춘다. 흔들림·확대·어둡게는 실제 시간으로 잦아든다.
  if (slowT > 0) { slowT -= rdt; if (slowT <= 0) slowK = 1; }
  const dt = rdt * slowK;
  trauma = Math.max(0, trauma - rdt * 1.7); zoomK *= Math.exp(-rdt * 7); if (zoomK < 0.002) zoomK = 0;
  // 터보·대왕 싸움 동안은 살짝(가장자리 그림자 + 옅은 남청) — 효과와 잠수정이 바다보다 또렷하게
  const dimBase = world && mode === "play" && (world.fever > 0 || world.boss) ? (RM ? 0.12 : 0.2) : 0;
  dimA += (Math.max(dimTo, dimBase) - dimA) * Math.min(1, rdt * 8); lbox += (lboxTo - lbox) * Math.min(1, rdt * 9);
  if (speedA > 0) speedA = Math.max(world && world.fever > 0 ? 0.28 : 0, speedA - rdt * 2.2);
  if (subGlow > 0) subGlow -= rdt * 1.6;
  if (feverIntro > 0) feverIntro -= rdt * 1.4; if (feverOutro > 0) feverOutro -= rdt;
  if (bossIntroT > 0) { bossIntroT -= rdt; if (bossIntroT <= 0.4 && mode === "play") { dimTo = 0; lboxTo = 0; } }
  if (ringWarn > 0) ringWarn -= rdt; if (currentFx > 0 && world && !world.current) currentFx = 0;
  if (clock - topSafeAt > 0.5) { topSafeAt = clock; measureTop(); }
  if (ghostT > 0) ghostT -= rdt;
  if (godRays > 0) godRays -= rdt;
  stepGhosts(dt);
  for (const b of boltEcho) b.t += dt; while (boltEcho.length && boltEcho[0].t > 0.5) boltEcho.shift();
  F.stepSparks(dt); F.stepShocks(dt);
  // 바탕 거품: 카메라 움직임의 일부만 따라온다(시차)
  F.ambientStep(dt, view.w, view.h, cam.x - lastCamX, cam.y - lastCamY); lastCamX = cam.x; lastCamY = cam.y;
  // 늦게 터뜨릴 꾸밈
  if (later.length) {
    for (let i = 0; i < later.length; i++) { const q = later[i]; if (q.at > clock) continue; laterFx(q); q.at = Infinity; }
    if (later.every(q => q.at === Infinity)) later.length = 0;
  }
  if (world && mode === "play") emitters(dt);
  clock += dt; if (bannerT > 0) bannerT -= dt; if (flash > 0) flash -= rdt;
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
  if (recoil) { recoil.t += dt; if (recoil.t > 0.2) recoil = null; }
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
  // 문제·카드·필살기·끝 장면 동안에도 물결과 씻긴 친구는 움직인다(게임 시간은 멈춘 채)
  if (world && (mode === "quiz" || mode === "cards" || mode === "ult" || mode === "finale")) E.stepFx(world, dt);
  if (world && mode === "ult" && ult) ultStep(rdt);
  if (world && mode === "finale" && finale) finaleStep(rdt);
}
// 늦게 터뜨리는 꾸밈 하나
let tingN = 0, tingAt = -9, bigSaid = false;
// 대왕 끝 장면: 씻긴 대왕 친구가 효과 위에서 커졌다가 웃으며 둥실(하얗게 날아가지 않게 효과 위에 그림)
function drawFinaleFriend() {
  const f = finale; if (!f) return;
  const k = Math.min(1, f.t / 0.5), s = 150 * (0.8 + k * 0.3 + Math.sin(f.t * 5) * 0.03), y = f.y - f.t * 12;
  ctx.globalAlpha = Math.min(1, f.t * 4) * (f.t > 2.3 ? Math.max(0, (2.6 - f.t) / 0.3) : 1);
  if (!sprite("boss_ok", f.x, y, s, false, Math.sin(f.t * 3) * 0.08)) friendShape(ctx, "boss", f.x, y, 60, 0, false, 1, f.t);
  if (f.t < 0.12 && WHITE.boss_ok) { ctx.globalAlpha = 0.8 * (1 - f.t / 0.12); sprite("boss_ok", f.x, y, s * 1.03, true); }
  ctx.globalAlpha = 1;
}
function laterFx(q) {
  if (q.kind === "uwash" || q.kind === "uking") {
    const big = q.kind === "uking";
    washPop(q.x, q.y, false, big, 40);
    F.radial(q.x, q.y, big ? 20 : 5, 360, -1, 2, 0.7, 6);
    if (big) addFx("light", q.x, q.y, 160, { dur: 0.45 });
    sfx.wash(10 + ((q.x + q.y) | 0) % 20);
    // 빛 알갱이가 잠수정으로 쪼르르(도착할 때 딩 — 음이 한 칸씩 올라간다)
    { const p = world.p, life = 0.45 + Math.random() * 0.25; F.spark(q.x, q.y, (p.x - q.x) / life, (p.y - q.y) / life, life, 6, 3, 0, 0, 0); afterFx(life, "ting", p.x, p.y); }
  } else if (q.kind === "ting") {
    tingN = clock - tingAt > 0.6 ? 1 : tingN + 1; tingAt = clock; sfx.orb(tingN);
    F.spark(q.x, q.y, 0, 0, 0.15, 9, 3, 0);
    floatText(q.x, q.y - 14, "깨끗!", RAINBOW_COL[(((q.x | 0) >> 3) % 6 + 6) % 6], 16, 0.7);
  }
}
/* ---------- 장비가 늘 내는 반짝임(프레임마다 조금씩, 품질에 맞춰) ---------- */
function emitters(dt) {
  const w = world, p = w.p, ld = w.load, q = F.getQuality();
  emitAcc += dt * 60;
  const ticks = emitAcc >= 1 ? 1 : 0; if (!ticks) return; emitAcc = Math.min(2, emitAcc - 1);
  // 물방울·불가사리 꼬리 입자
  let budget = Math.round(14 * q);
  for (const s of w.shots) {
    if (budget <= 0) break;
    if (s.k === "b") { if (Math.random() < 0.18 + s.lv * 0.05) { budget--; F.spark(s.x, s.y, -s.vx * 0.1 + (Math.random() - 0.5) * 40, -s.vy * 0.1 + (Math.random() - 0.5) * 40, 0.35, 2 + s.lv * 0.6, s.rainbow ? -1 : s.lv >= 3 ? lvCol(s.lv) : 0, s.lv >= 3 ? 0 : 3, 0, 3); } }
    else if (Math.random() < 0.25 + s.lv * 0.06) { budget--; F.spark(s.x, s.y, (Math.random() - 0.5) * 50, (Math.random() - 0.5) * 50, 0.4, 3 + s.lv * 0.5, s.lv >= 5 ? -1 : s.lv >= 3 ? 3 : 7, 2, 0, 3); }
  }
  // 회오리 거품·빛, 합체 소용돌이는 바깥에서 빨려 든다
  if (ld.weapons.whirl) {
    const s = L.weaponStats("whirl", ld.weapons.whirl, !!ld.evo.whirl, w.m);
    for (let i = 0; i < s.n; i++) if (Math.random() < 0.35 * q + s.lv * 0.05) { const a = w.whirlAng + i * TAU / s.n, ox = p.x + Math.cos(a) * s.r, oy = p.y + Math.sin(a) * s.r; F.spark(ox, oy, -Math.sin(a) * 120, Math.cos(a) * 120, 0.4, 2.5 + s.lv * 0.5, s.evo ? 11 : s.lv >= 4 ? lvCol(s.lv) : 0, s.lv >= 3 ? 0 : 3, 0, 3); }
    if (s.evo && Math.random() < q) F.implode(p.x, p.y, 1, s.r * 1.9, Math.random() < 0.5 ? 11 : 6, 1, 0.5, 3);
  }
  // 소라: 던지는 순간 바람 소리·물결, 돌아오는 길 반짝
  if (ld.weapons.shell) {
    const cdS = w.cd.shell || 0; if (cdS > lastShellCd + 0.2) { const lv = ld.weapons.shell; sfx.shellThrow(lv); F.shock(p.x, p.y, 60 + lv * 10, 0.3, 7, 8, 1); } lastShellCd = cdS;
    for (const sh of w.shells) if (Math.random() < 0.3 + sh.lv * 0.08) F.spark(sh.x, sh.y, (Math.random() - 0.5) * 60, (Math.random() - 0.5) * 60, 0.45, 3 + sh.lv * 0.6, sh.lv >= 5 ? 3 : 7, sh.lv >= 3 ? 2 : 0, 0, 3);
  }
  if (ld.weapons.star) { const cdT = w.cd.star || 0; if (cdT > lastStarCd + 0.2) { const lv = ld.weapons.star; sfx.star(lv); F.radial(p.x, p.y, 4 + lv, 220, lv >= 5 ? -1 : 6, 2, 0.35, 4); } lastStarCd = cdT; }
  // 전기 해파리: 다시 쏠 때가 다가오면 찌릿찌릿 모인다
  if (ld.weapons.zap && (w.cd.zap || 0) < 0.3 && Math.random() < 0.6 * q) { const zx = p.x + Math.cos(clock * 1.3) * 40, zy = p.y - 34 + Math.sin(clock * 2.6) * 5; F.implode(zx, zy, 1, 30, 10, 1, 0.18, 2); }
  // 무지개 터보: 잠수정 뒤로 무지개 빛 가루
  if (w.fever > 0) { F.spark(p.x + (Math.random() - 0.5) * 20, p.y + (Math.random() - 0.5) * 20, -p.vx * 0.3 + (Math.random() - 0.5) * 80, -p.vy * 0.3 + (Math.random() - 0.5) * 80, 0.6, 5, -1, Math.random() < 0.5 ? 0 : 2, 0, 2); }
  // 슈웅! 동안 뒤로 물보라
  if (p.dashT > 0) { const a = Math.atan2(p.dvy, p.dvx) + Math.PI; F.cone(p.x, p.y, a, 0.8, 3, 380, 1, 5, 0.35, 3.5); }
  // 잠수정 프로펠러 거품(움직일 때)
  if (Math.random() < (p.moving ? 0.5 : 0.3)) { const a = p.face + Math.PI; F.spark(p.x + Math.cos(a) * 26, p.y + Math.sin(a) * 26, Math.cos(a) * 60 + (Math.random() - 0.5) * 30, Math.sin(a) * 60 + (Math.random() - 0.5) * 30, 0.6, 2.5 + Math.random() * 2, 0, 3, -40, 2); }
  // 황금 물고기 반짝 꼬리 · 왕관 반짝 · 보물 조개 빛기둥 반짝
  for (const e of w.enemies) {
    if (e.kind === "gold" && Math.random() < 0.7) F.spark(e.x, e.y, (Math.random() - 0.5) * 40, (Math.random() - 0.5) * 40, 0.6, 5, Math.random() < 0.5 ? 3 : 10, 2, 0, 2);
    else if (e.king && Math.random() < 0.25) F.spark(e.x + (Math.random() - 0.5) * 50, e.y - 40, 0, -40, 0.6, 5, 3, 2, 0, 1);
    else if (e.kind === "clam" && Math.random() < 0.4) F.spark(e.x + (Math.random() - 0.5) * 40, e.y, 0, -120, 0.9, 4, 3, 2, 0, 0.5);
    else if (e.kind === "boss" && Math.random() < 0.3 * q) F.spark(e.x + (Math.random() - 0.5) * 120, e.y + (Math.random() - 0.5) * 100, 0, -50, 1.0, 6, Math.random() < 0.5 ? 4 : 11, 3, -20, 1);
  }
  // 고래: 머리 앞 물보라와 뒤로 거품 길
  if (w.whale) { const h = w.whale, dir = Math.sign(h.vx); F.cone(h.x + dir * 140, h.y, dir > 0 ? 0 : Math.PI, 1.6, 3, 300, 1, 5, 0.4, 4); F.spark(h.x - dir * 150, h.y + (Math.random() - 0.5) * 60, -dir * 40, -30, 0.9, 4 + Math.random() * 4, 0, 3, -30, 1); }
  // 센 물살: 화면을 가로지르는 거품과 물줄
  if (w.current) { const dir = w.current.vx > 0 ? 1 : -1; for (let i = 0; i < 2; i++) { const yy = cam.y + Math.random() * view.h, xx = dir > 0 ? cam.x - 10 : cam.x + view.w + 10; F.spark(xx, yy, dir * (500 + Math.random() * 300), 0, 1.4, 2 + Math.random() * 3, 0, Math.random() < 0.5 ? 3 : 1, 0, 0); } }
}
/* ---------- 시작 화면 뒤 보기 판(attract demo) ----------
   진짜 엔진·그림을 그대로 쓰되: 소리 없음(사건은 그림 효과만), 문제·상자·구조 없음(? 진주를 지우고 pending 을 비움),
   저장 없음(endRun 을 안 부름), 다침 없음(늘 무적). 약 70초마다 새로 시작한다. */
let demoFade = 0;
function makeDemo() {
  const w = E.createWorld({ kid: pilot, zone: zoneId, view, gifts: [], bigPearl: false });
  let ld = w.load;
  ld = L.applyCard(ld, { kind: "weapon", id: "bubble", lv: 3 });
  ld = L.applyCard(ld, { kind: "weapon", id: "whirl", lv: 2 });
  E.setLoadout(w, ld); w.events.length = 0;
  w.demo = true; demoGoal = null; demoGoalT = 0; demoFade = 1;
  makeDecor(w.zone);
  return w;
}
function demoMove(w) {
  const p = w.p; let fx = 0, fy = 0;
  // 가장 가까운 먹물 친구 둘레를 빙 돌며 물방울로 씻는다
  let best = null, bd = Infinity;
  for (const e of w.enemies) { if (L.harmless(e.kind) || e.kind === "eel") continue; const d = (e.x - p.x) ** 2 + (e.y - p.y) ** 2; if (d < bd) { bd = d; best = e; } }
  if (best) {
    const dx = best.x - p.x, dy = best.y - p.y, d = Math.sqrt(bd) || 1, want = d > 190 ? 1 : d < 120 ? -1.2 : 0.1;
    fx += dx / d * want - dy / d * 0.7; fy += dy / d * want + dx / d * 0.7;
  } else {
    demoGoalT -= 1 / 60;
    if (!demoGoal || demoGoalT <= 0) { demoGoal = { x: 300 + Math.random() * (L.WORLD.w - 600), y: 300 + Math.random() * (L.WORLD.h - 600) }; demoGoalT = 4; }
    const dx = demoGoal.x - p.x, dy = demoGoal.y - p.y, d = Math.hypot(dx, dy) || 1; fx += dx / d; fy += dy / d;
  }
  // 가까운 빛 방울은 줍는다
  for (const o of w.orbs) { const dx = o.x - p.x, dy = o.y - p.y, d = Math.hypot(dx, dy); if (d < 160 && d > 1) { fx += dx / d * 0.5; fy += dy / d * 0.5; break; } }
  // 벽에 몰리지 않게
  const M = 260;
  if (p.x < M) fx += (M - p.x) / M * 2; if (p.x > L.WORLD.w - M) fx -= (p.x - (L.WORLD.w - M)) / M * 2;
  if (p.y < M) fy += (M - p.y) / M * 2; if (p.y > L.WORLD.h - M) fy -= (p.y - (L.WORLD.h - M)) / M * 2;
  const n = Math.hypot(fx, fy);
  return n < 0.05 ? { x: 0, y: 0 } : { x: fx / n * 0.8, y: fy / n * 0.8 };
}
function demoStep(dt) {
  if (!DEMO_ON) return;
  if (!demo || demo.over || demo.t > 70) demo = makeDemo();
  if (demoFade > 0) demoFade = Math.max(0, demoFade - dt * 1.5);
  const w = demo, n = dt > 0.034 ? 2 : 1;
  world = w;   // 그림 효과 함수들이 world 를 본다 — 끝나면 꼭 되돌린다
  try {
    for (let i = 0; i < n; i++) {
      w.p.inv = Math.max(w.p.inv, 1); w.hearts = w.maxHearts;
      E.stepWorld(w, dt / n, demoMove(w));
      w.pending = null; w.chestOwed = 0; w.qpearls.length = 0; w.bigs.length = 0;
      for (const e of w.events) {
        if (e.type === "wash") washPop(e.x, e.y, e.chain, e.elite, e.combo);
        else if (e.type === "hit" && hitBudget > 0) { hitBudget--; hitSplash(e); }
      }
      w.events.length = 0;
    }
    emitters(dt);
  } finally { world = null; }
}
// 화질 자동 조절: 프레임 사이 시간이 20ms 를 오래 넘으면 입자 수를 줄이고, 여유가 생기면 천천히 되돌린다.
let frameEma = 1 / 60, qualityT = 0;
function frame(now) {
  const raw = Math.max(0, (now - last) / 1000), dt = Math.min(0.05, raw); last = now;
  if (raw < 0.1) { frameEma += (raw - frameEma) * 0.06; qualityT += raw; if (qualityT > 0.5) { qualityT = 0; const q = F.getQuality(); if (frameEma > 0.02) F.setQuality(q - 0.15); else if (frameEma < 0.0175) F.setQuality(q + 0.05); } }
  ui(dt);
  const t0 = performance.now();
  // 멈칫(hit-stop): 아주 잠깐 게임 시간을 세운다(최대 60ms). 큰 장면(cine)은 조금 더 길게 세운다 — 세우는 동안 게임 시간도 안 흐르니 결과는 같다.
  if (hitStop > 0) hitStop -= dt;
  else if (cine > 0) cine -= dt;
  else if (mode === "play" && world && !document.hidden) update(dt);
  if (mode === "start" && !world && !document.hidden) demoStep(dt);
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
  if (demo) demo.kid = i;   // 뒤에서 헤엄치는 잠수정도 바로 바뀐다
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
// 바다 고르기·선물 안내는 작은 칩 뒤의 판으로(한 번에 하나만 열린다)
const SHEETS = { zoneSheet: ["zoneChip", "pearlChip"], giftSheet: ["giftChip"] };
function openSheet(id) {
  for (const k in SHEETS) {
    const on = k === id && $(k).hidden;
    $(k).hidden = !on; for (const c of SHEETS[k]) $(c).setAttribute("aria-expanded", String(on));
  }
}
function closeSheets() { openSheet(null); }
function paintZones() {
  zoneBox.innerHTML = "";
  for (const z of L.ZONES) {
    const open = save.zones.includes(z.id);
    const b = document.createElement("button"); b.type = "button"; b.className = "zone" + (open ? "" : " locked");
    b.textContent = open ? z.name : "🔒 진주 " + z.need; b.setAttribute("aria-pressed", String(z.id === zoneId));
    if (open) b.addEventListener("click", () => { zoneId = z.id; save.zone = z.id; writeSave(); paintStart(); closeSheets(); sfx.pearl(); floorPat = null; demo = null; });
    else { b.disabled = true; b.setAttribute("aria-label", z.name + " · 진주 " + z.need + "개면 열려요"); }
    zoneBox.appendChild(b);
  }
  const next = L.ZONES.find(z => !save.zones.includes(z.id));
  $("nextSea").textContent = next ? "‘" + next.name + "’까지 진주 " + Math.max(0, next.need - save.pearls) + "개 더" : "바다를 모두 열었어요!";
  // 칩: 지금 바다 이름 + 열린 바다 점
  $("zoneName").textContent = L.zoneOf(zoneId).name;
  $("zoneDots").innerHTML = L.ZONES.map(z => '<i class="' + (save.zones.includes(z.id) ? "on" : "") + '"></i>').join("");
  $("zoneChip").setAttribute("aria-label", "바다 고르기 · 지금 " + L.zoneOf(zoneId).name + " · 열린 바다 " + save.zones.length + "/" + L.ZONES.length);
}
// 진주 막대: 다음 바다까지(바다를 다 열었으면 다음 출발 선물까지)
function pearlGoal() {
  const z = L.ZONES.find(q => !save.zones.includes(q.id));
  if (z) return { need: z.need, label: z.name };
  const g = L.GIFTS.find(q => !save.gifts.includes(q.id));
  return g ? { need: g.need, label: g.name } : null;
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
  const goal = pearlGoal(), chip = $("pearlChip");
  $("pearlFill").style.width = (goal ? Math.min(100, save.pearls / goal.need * 100) : 100).toFixed(1) + "%";
  $("pearlNum").textContent = goal ? save.pearls + "/" + goal.need : String(save.pearls);
  chip.classList.toggle("done", !goal);
  chip.setAttribute("aria-label", "가족 진주함 " + save.pearls + (goal ? " · ‘" + goal.label + "’까지 " + goal.need : ""));
  const seen = L.DEX_IDS.filter(k => (save.dex[k] || 0) > 0 || (k === "boss" && save.bossRescued)).length;
  $("dexNum").textContent = seen + "/" + L.DEX_IDS.length;
  $("dexBtn").setAttribute("aria-label", "바다 친구 도감 · 만난 친구 " + seen + "/" + L.DEX_IDS.length);
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
$("dexBtn").addEventListener("click", () => { closeSheets(); paintDex(); $("start").hidden = true; $("dex").hidden = false; });
$("zoneChip").addEventListener("click", () => openSheet("zoneSheet"));
$("pearlChip").addEventListener("click", () => openSheet("zoneSheet"));
$("giftChip").addEventListener("click", () => openSheet("giftSheet"));
$("dexClose").addEventListener("click", () => { $("dex").hidden = true; $("start").hidden = false; });
$("startBtn").addEventListener("click", () => { closeSheets(); begin(); });
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
    step: (dt = 1 / 60, n = 1) => { for (let i = 0; i < n; i++) { ui(dt); if (hitStop > 0) hitStop -= dt; else if (cine > 0) cine -= dt; else if (mode === "play") update(dt); render(); } },
    ult: () => { if (world && mode === "play") { E.recordChallenge(world, true); startUlt(resumePlay); } return mode; },
    wave: (m = "wave") => { if (world && mode === "play") { rewardBlast(m); releaseWave(); } return mode; },
    bigHere: () => { if (world) { world.bigOn = true; E.spawnBigQA(world); const b = world.bigs[world.bigs.length - 1]; b.x = world.p.x + 120; b.y = world.p.y; } },
    sparks: () => F.sparkCount(), quality: q => { if (q != null) F.setQuality(q); return F.getQuality(); },
    get s() { return world ? { mode, t: +world.t.toFixed(2), hearts: world.hearts, maxHearts: world.maxHearts, xp: world.xp, goal: E.xpGoal(world), qpearls: world.qpearls.length, pearlN: world.pearlN, enemies: world.enemies.length, vis: world.vis, shots: world.shots.length, orbs: world.orbs.length, rescued: world.rescued, solved: world.solved, streak: world.streak, load: world.load, boss: !!world.boss, pending: world.pending, over: world.over, rescueUsed: world.rescueUsed, pilot, zone: zoneId, p: { x: Math.round(world.p.x), y: Math.round(world.p.y) }, stick: !!stick,
      combo: world.combo, bestCombo: world.bestCombo, gauge: +world.gauge.toFixed(3), fever: +world.fever.toFixed(2), fevers: world.fevers, dashCd: +Math.max(0, world.dashCd).toFixed(2), dashes: world.dashes, autoDashes: world.autoDashes, events: world.eventsSeen.slice(), whale: !!world.whale, current: !!world.current, firstPearlT: world.firstPearlT, fx: fxList.length, floats: floats.length, parts: partOn, multis: world.multis.slice(), banner, sound: S.stats() } : { mode, pilot, zone: zoneId }; },
    // 슈웅!·무지개 터보·이벤트를 바로 일으키기, 끌기 대신 움직임 정하기
    dash: (x, y) => { if (x != null) qaMove = { x, y }; const ok = doDash(); return ok; },
    fever: () => { if (world) { E.startFever(world); handleEvents(); } },
    event: (id, kind) => { if (world) { E.startEventQA(world, { id, kind }); handleEvents(); } },
    move: (x, y) => { qaMove = x == null ? null : { x, y }; },
    blast: (m = "wave") => { if (!world) return null; const r = rewardBlast(m === true ? "wave" : m === false ? "near" : m); releaseWave(); return r; },
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
    bench: (n = 60) => { const t0 = performance.now(); let up = 0, rd = 0, worst = 0; for (let i = 0; i < n; i++) { const a = performance.now(); ui(1 / 60); if (mode === "play") update(1 / 60); const b = performance.now(); render(); const c = performance.now(); up += b - a; rd += c - b; worst = Math.max(worst, c - a); } return { frames: n, updateMs: +(up / n).toFixed(2), renderMs: +(rd / n).toFixed(2), totalMs: +((performance.now() - t0) / n).toFixed(2), worstMs: +worst.toFixed(2), enemies: world ? world.enemies.length : 0, fx: fxList.length, sparks: F.sparkCount(), parts: partOn, quality: F.getQuality() }; },
    art: () => Object.keys(ART), view: () => ({ view, scale, dpr }),
    // 시작 화면 뒤 보기 판: 상태 보기·몇 프레임 돌리기
    demo: () => (demo ? { t: +demo.t.toFixed(2), kid: demo.kid, zone: demo.zone.id, enemies: demo.enemies.length, rescued: demo.rescued, hearts: demo.hearts, pending: demo.pending, qpearls: demo.qpearls.length, p: { x: Math.round(demo.p.x), y: Math.round(demo.p.y) } } : null),
    demoStep: (dt = 1 / 60, n = 1) => { for (let i = 0; i < n && mode === "start" && !world; i++) { ui(dt); demoStep(dt); render(); } return !!demo; },
  };
}
requestAnimationFrame(frame);
