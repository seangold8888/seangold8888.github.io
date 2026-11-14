// Spell Towers — 성과 마법 탑. 받침에 탑을 세우면 저절로 주문을 쏴 괴물을 비눗방울에 태워 돌려보낸다.
// ? 부엉이 문제를 맞히면 대마법이 터지고 탑 강화 카드를 고른다.
// 규칙 표는 logic.js, 한 걸음은 engine.js, 여기서는 그리기·입력·화면·저장.
// 그림은 art/ 의 그림 파일을 쓰고, 못 읽으면 캔버스 도형으로 대신 그린다. shadowBlur 와 매 프레임 그라데이션은 쓰지 않는다.
import * as L from "./logic.js?v=1";
import * as E from "./engine.js?v=1";

const $ = id => document.getElementById(id);
const canvas = $("map"), ctx = canvas.getContext("2d", { alpha: false });
const QS = new URLSearchParams(location.search), QA = QS.get("qa") === "1";
// 공통 문제 모듈이 없으면 부엉이를 눌렀을 때 작은 마법 + 카드 2장 중 1장(검증: ?qa=1&noquiz=1)
let GameQuiz = QA && QS.get("noquiz") === "1" ? null : window.GameQuiz || null;
const rnd = (a, b) => a + Math.random() * (b - a);
const TAU = Math.PI * 2;
const FONT = "'Pretendard Variable', system-ui, sans-serif";

/* ---------- 저장 ---------- */
let save = L.defaultSave();
try { save = L.normalizeSave(localStorage.getItem(L.SAVE_KEY)); } catch (_) {}
function writeSave() { try { localStorage.setItem(L.SAVE_KEY, JSON.stringify(save)); } catch (_) {} }
let pilot = 1;
try { const v = parseInt(localStorage.getItem(L.WIZ_KEY), 10); if (v >= 0 && v < L.PILOTS.length) pilot = v; } catch (_) {}
try { const k = GameQuiz && GameQuiz.currentKid(); const i = L.PILOTS.findIndex(p => p.kid === k); if (i >= 0) pilot = i; } catch (_) {}
let mapId = save.map || "field";

/* ---------- 그림 ---------- */
const ART = {}, WHITE = {};
const MON_ART = L.MONSTER_IDS;
const ART_NAMES = ["wiz0", "wiz1", "wiz2", "wiz3", ...L.TOWER_IDS.map(k => "tower_" + k), ...L.TOWER_IDS.map(k => "tower_" + k + "_big"), ...MON_ART,
  "castle", "cake", "crystal", "owl", "pad", "bubble", "tree", "mushroom", "rock", "snowpine", "ground"];
function whiten(im) {
  const c = document.createElement("canvas"); c.width = im.width; c.height = im.height;
  const x = c.getContext("2d"); x.drawImage(im, 0, 0); x.globalCompositeOperation = "source-in"; x.fillStyle = "#fff"; x.fillRect(0, 0, c.width, c.height);
  return c;
}
let artTimer = 0;
for (const n of ART_NAMES) {
  const im = new Image();
  im.onload = () => {
    ART[n] = im; if (MON_ART.includes(n)) WHITE[n] = whiten(im);
    // 그림이 들어오면 미리 그려 둔 것들을 다시 만든다(몰려 들어오니 조금 모아서)
    clearTimeout(artTimer); artTimer = setTimeout(() => { bgKey = ""; towerCache.clear(); monCache.clear(); iconCache.clear(); paintStart(); }, 60);
  };
  im.src = "art/" + n + ".webp?v=1";
}
const aspect = n => (ART[n] ? ART[n].height / ART[n].width : 1);
function canvasOf(w, h, draw) { const c = document.createElement("canvas"); c.width = Math.max(1, Math.round(w)); c.height = Math.max(1, Math.round(h)); draw(c.getContext("2d"), c.width, c.height); return c; }
const rgbOf = hex => { const n = parseInt(hex.slice(1), 16); return ((n >> 16) & 255) + "," + ((n >> 8) & 255) + "," + (n & 255); };
const glowTex = (rgb, size = 64) => canvasOf(size, size, (x, w) => {
  const g = x.createRadialGradient(w / 2, w / 2, 0, w / 2, w / 2, w / 2);
  g.addColorStop(0, "rgba(" + rgb + ",.95)"); g.addColorStop(0.4, "rgba(" + rgb + ",.45)"); g.addColorStop(1, "rgba(" + rgb + ",0)");
  x.fillStyle = g; x.fillRect(0, 0, w, w);
});
const LV_GLOW = L.LV_COLORS.map(c => glowTex(rgbOf(c), 128));
const GLOW = { fire: glowTex("255,140,60"), phoenix: glowTex("255,90,60"), volcano: glowTex("255,190,80", 96), gold: glowTex("255,226,120", 128), owl: glowTex("255,240,170", 128), purple: glowTex("190,140,255", 128), white: glowTex("255,255,255") };
function bubbleTex() {
  return canvasOf(96, 96, (x) => {
    const g = x.createRadialGradient(38, 34, 6, 48, 48, 46);
    g.addColorStop(0, "rgba(255,255,255,.35)"); g.addColorStop(0.7, "rgba(190,230,255,.18)"); g.addColorStop(0.92, "rgba(255,190,240,.55)"); g.addColorStop(1, "rgba(255,255,255,.9)");
    x.fillStyle = g; x.beginPath(); x.arc(48, 48, 45, 0, TAU); x.fill();
    x.strokeStyle = "rgba(255,255,255,.9)"; x.lineWidth = 3; x.beginPath(); x.arc(48, 48, 44, 0, TAU); x.stroke();
    x.fillStyle = "rgba(255,255,255,.95)"; x.beginPath(); x.ellipse(32, 28, 11, 6, -0.6, 0, TAU); x.fill();
  });
}
const BUBBLE = bubbleTex();
function starTex(color, size = 48) {
  return canvasOf(size, size, (x, w) => {
    x.drawImage(glowTex(rgbOf(color), w), 0, 0);
    star5(x, w / 2, w / 2, w * 0.3, "#ffffff");
  });
}
const STAR = { gold: starTex("#ffd24a"), pink: starTex("#ff9ee0"), blue: starTex("#8fe0ff"), green: starTex("#8fffb0") };
const STAR_LIST = [STAR.gold, STAR.pink, STAR.blue, STAR.green];
function swirlTex(c1, c2) {
  return canvasOf(64, 64, (x) => {
    x.lineCap = "round";
    for (let i = 0; i < 3; i++) { x.strokeStyle = i % 2 ? c2 : c1; x.lineWidth = 7 - i * 1.5; x.beginPath(); x.arc(32, 32, 24 - i * 7, i * 2.1, i * 2.1 + 3.6); x.stroke(); }
  });
}
const SWIRL = L.LV_COLORS.map(c => swirlTex("#c8ffe0", c));
function star5(x, cx, cy, r, color, n = 5) {
  x.fillStyle = color; x.beginPath();
  for (let i = 0; i < n * 2; i++) { const a = -Math.PI / 2 + i * Math.PI / n, rr = i % 2 ? r * 0.45 : r; x.lineTo(cx + Math.cos(a) * rr, cy + Math.sin(a) * rr); }
  x.closePath(); x.fill();
}
// 그림이 없을 때 쓰는 풀밭 무늬(한 번만 만든다)
const GRASS = canvasOf(256, 256, (x, w, h) => {
  x.fillStyle = "#8fcf6a"; x.fillRect(0, 0, w, h);
  let s = 11; const r = () => (s = s * 16807 % 2147483647) / 2147483647;
  for (let i = 0; i < 260; i++) { x.fillStyle = r() < 0.5 ? "rgba(40,110,40,.16)" : "rgba(255,255,220,.18)"; x.beginPath(); x.ellipse(r() * w, r() * h, 2 + r() * 4, 1 + r() * 2, r() * 3, 0, TAU); x.fill(); }
});

/* ---------- 소리: Web Audio 비프(음성 합성 금지) ---------- */
let ac = null, soundOn = true;
try { soundOn = localStorage.getItem(L.SOUND_KEY) !== "0"; } catch (_) {}
function audio() {
  if (!soundOn) return null;
  if (!ac) { const AC = window.AudioContext || window.webkitAudioContext; if (!AC) return null; try { ac = new AC(); } catch (_) { return null; } }
  if (ac.state === "suspended") ac.resume().catch(() => {});
  return ac;
}
function beep(freq, dur, type = "sine", vol = 0.1, slide = 0) {
  const a = audio(); if (!a) return;
  const o = a.createOscillator(), g = a.createGain(), t = a.currentTime;
  o.type = type; o.frequency.setValueAtTime(freq, t);
  if (slide) o.frequency.exponentialRampToValueAtTime(Math.max(30, slide), t + dur);
  g.gain.setValueAtTime(vol, t); g.gain.exponentialRampToValueAtTime(0.001, t + dur);
  o.connect(g); g.connect(a.destination); o.start(t); o.stop(t + dur + 0.02);
}
const lastSfx = {};
const once = (k, gap, fn) => { const now = performance.now(); if (now - (lastSfx[k] || 0) < gap) return; lastSfx[k] = now; fn(); };
const sfx = {
  home: () => once("home", 80, () => beep(rnd(700, 900), 0.12, "sine", 0.05, 1500)),
  fire: () => once("fire", 140, () => beep(420, 0.06, "triangle", 0.025, 260)),
  ice: () => once("ice", 300, () => beep(1500, 0.12, "sine", 0.025, 1100)),
  bolt: () => once("bolt", 160, () => beep(1300, 0.05, "square", 0.02, 600)),
  wind: () => once("wind", 300, () => beep(300, 0.2, "sine", 0.03, 600)),
  light: () => once("light", 220, () => beep(900, 0.14, "sine", 0.03, 1400)),
  owl: () => { beep(520, 0.16, "sine", 0.07, 440); setTimeout(() => beep(440, 0.22, "sine", 0.07, 380), 200); },
  tap: () => beep(880, 0.06, "sine", 0.06),
  sparkle: () => once("spark", 60, () => beep(rnd(1400, 1900), 0.07, "triangle", 0.05)),
  build: () => [392, 523, 659].forEach((f, i) => setTimeout(() => beep(f, 0.12, "triangle", 0.09), i * 70)),
  up: () => [523, 659, 784, 1047].forEach((f, i) => setTimeout(() => beep(f, 0.15, "triangle", 0.11), i * 85)),
  no: () => beep(220, 0.18, "sine", 0.09, 160),
  steal: () => beep(330, 0.25, "triangle", 0.07, 200),
  wave: () => { beep(392, 0.15, "square", 0.04); setTimeout(() => beep(523, 0.2, "square", 0.04), 160); },
  boss: () => { beep(130, 0.5, "square", 0.06, 90); setTimeout(() => beep(110, 0.6, "square", 0.05, 70), 300); },
  blast: big => { beep(big ? 180 : 300, 0.6, "sine", 0.13, big ? 1000 : 700); setTimeout(() => [784, 988, 1175, 1568].slice(0, big ? 4 : 3).forEach((f, i) => setTimeout(() => beep(f, 0.14, "triangle", 0.1), i * 70)), 120); },
  win: () => [523, 659, 784, 1047, 1319].forEach((f, i) => setTimeout(() => beep(f, 0.2, "triangle", 0.11), i * 110)),
};

/* ---------- 화면 크기 ----------
   맵(논리 960x600)에서 꼭 보여야 하는 상자(SAFE: 길·받침·성·위쪽 탑 꼭대기)만 화면에 꽉 맞추고, HUD 는 맵 위에 겹쳐 띄운다(위·아래 띠 없음).
   맵 바깥은 같은 잔디로 이어 칠해 레터박스가 보이지 않게. 탑·괴물·부엉이 그림은 VS 배로 크게 그린다(보이는 크기만, 규칙 수치는 논리 좌표 그대로).
   크기는 visualViewport(사파리 주소창·탭바를 뺀 실제 보이는 영역) 기준.
   세로 화면(ROT)에서는 맵을 90도 돌려 긴 변(960)을 화면 세로에 둔다. 위치만 돌리고 그림(탑·괴물·성·나무·글자)은 항상 똑바로.
   논리(world) 좌표 → 화면 논리 좌표 변환은 SX/SY(그리고 역변환 toMap) 한 쌍에만 모았다. 화면 논리 좌표 × mapS + (mapX, mapY) = CSS px.
   ROT: 화면 x = 600 − 월드 y, 화면 y = 월드 x (괴물이 위 동굴에서 내려와 아래 성으로 간다). */
const HUD_H = 58, SAFE_L = { x0: 8, y0: -40, x1: 958, y1: 596 }, SAFE_R = { x0: 8, y0: -20, x1: 572, y1: 955 };
let vw = 1, vh = 1, dpr = 1, mapS = 1, mapX = 0, mapY = 0, portrait = false, VS = 1.25, ROT = false, PHONE = false, FX_MAX = 40, HUD_SAFE = 64;
const SX = (x, y) => (ROT ? L.MAP_H - y : x), SY = (x, y) => (ROT ? x : y);
const SCR_W = () => (ROT ? L.MAP_H : L.MAP_W), SCR_H = () => (ROT ? L.MAP_W : L.MAP_H);
// 캔버스에 월드 좌표 그대로 선·원을 그릴 때의 변환(돌려도 모양이 같은 것만: 길·사거리 원·빛줄기·번개·탄)
function setWorldTf(k, ox, oy) { if (ROT) ctx.setTransform(0, k, -k, 0, ox + L.MAP_H * k, oy); else ctx.setTransform(k, 0, 0, k, ox, oy); }
function resize() {
  const vv = window.visualViewport;
  vw = Math.max(1, Math.round(vv && vv.width ? vv.width : innerWidth)); vh = Math.max(1, Math.round(vv && vv.height ? vv.height : innerHeight));
  dpr = Math.min(devicePixelRatio || 1, 1.5);
  canvas.width = Math.round(vw * dpr); canvas.height = Math.round(vh * dpr);
  canvas.style.width = vw + "px"; canvas.style.height = vh + "px";
  portrait = ROT = vh > vw * 1.1;
  const S = ROT ? SAFE_R : SAFE_L, sw = S.x1 - S.x0, sh = S.y1 - S.y0;
  mapS = Math.min(vw / sw, vh / sh); mapX = vw / 2 - (S.x0 + S.x1) / 2 * mapS; mapY = vh / 2 - (S.y0 + S.y1) / 2 * mapS;
  // 그림 배율: 세로(회전) 1.35, 폰 가로처럼 낮은 화면 1.4, 그 밖 가로 1.25
  VS = ROT ? 1.35 : vh < 500 ? 1.4 : 1.25;
  PHONE = Math.min(vw, vh) < 500;
  FX_MAX = PHONE ? 28 : 40;          // 폰은 효과 동시 상한을 조금 낮춘다
  HUD_SAFE = PHONE ? 50 : 64;
  layoutCtrl();
  bgKey = ""; groundKey = ""; towerCache.clear(); monCache.clear();
  if (focusPad >= 0 && world && (mode === "build" || mode === "info")) placeDock($(mode), focusPad);   // 창이 열린 채 돌려도 위치 다시
}
function layoutCtrl() {
  const c = $("ctrl"), tip = $("tip");
  // 세로: 빨리 감기·정지·소리는 오른쪽 아래 모서리. 가로: 오른쪽 위(HUD 줄)
  if (portrait) { c.style.top = "auto"; c.style.bottom = "calc(12px + env(safe-area-inset-bottom))"; }
  else { c.style.top = ""; c.style.bottom = ""; }
  tip.hidden = true;
}
// 화면 CSS px → 월드 좌표(역변환)
function toMap(cx, cy) { const sx = (cx - mapX) / mapS, sy = (cy - mapY) / mapS; return ROT ? { x: sy, y: L.MAP_H - sx } : { x: sx, y: sy }; }
// 월드 좌표 → 화면 CSS px
const toScreen = (x, y) => ({ x: mapX + SX(x, y) * mapS, y: mapY + SY(x, y) * mapS });

/* ---------- 미리 그려 두기: 배경(바탕 + 길 + 장식 + 받침 + 성) ---------- */
let bgCanvas = null, bgKey = "";
function decorShape(x, kind, cx, cy, w) {
  if (kind === "rock") { x.fillStyle = "#9a97a8"; x.beginPath(); x.ellipse(cx, cy, w * 0.45, w * 0.3, 0, 0, TAU); x.fill(); x.fillStyle = "rgba(255,255,255,.35)"; x.beginPath(); x.ellipse(cx - w * 0.12, cy - w * 0.1, w * 0.15, w * 0.08, 0, 0, TAU); x.fill(); return; }
  if (kind === "mushroom") { x.fillStyle = "#f4ead8"; x.fillRect(cx - w * 0.12, cy - w * 0.1, w * 0.24, w * 0.4); x.fillStyle = "#e8505a"; x.beginPath(); x.ellipse(cx, cy - w * 0.12, w * 0.45, w * 0.3, 0, Math.PI, 0); x.fill(); x.fillStyle = "#fff"; for (const [a, b] of [[-0.2, -0.25], [0.15, -0.3], [0.05, -0.18]]) { x.beginPath(); x.arc(cx + a * w, cy + b * w, w * 0.05, 0, TAU); x.fill(); } return; }
  const snow = kind === "snowpine";
  x.fillStyle = "#7a5638"; x.fillRect(cx - w * 0.07, cy + w * 0.1, w * 0.14, w * 0.3);
  x.fillStyle = snow ? "#3f7a63" : "#4f9a4a";
  for (let i = 0; i < 3; i++) { const yy = cy + w * 0.15 - i * w * 0.22, ww = w * (0.5 - i * 0.12); x.beginPath(); x.moveTo(cx - ww, yy); x.lineTo(cx + ww, yy); x.lineTo(cx, yy - w * 0.35); x.closePath(); x.fill(); if (snow) { x.fillStyle = "#ffffff"; x.beginPath(); x.moveTo(cx - ww * 0.4, yy - w * 0.21); x.lineTo(cx + ww * 0.4, yy - w * 0.21); x.lineTo(cx, yy - w * 0.35); x.closePath(); x.fill(); x.fillStyle = "#3f7a63"; } }
}
function castleShape(x, cx, cy) {
  x.fillStyle = "#d9d2e8"; x.fillRect(cx - 44, cy - 40, 88, 70);
  x.fillStyle = "#c4bcd8"; x.fillRect(cx - 56, cy - 62, 24, 92); x.fillRect(cx + 32, cy - 62, 24, 92);
  x.fillStyle = "#7d5ad6"; for (const tx of [cx - 44, cx + 44]) { x.beginPath(); x.moveTo(tx - 16, cy - 62); x.lineTo(tx + 16, cy - 62); x.lineTo(tx, cy - 96); x.closePath(); x.fill(); }
  x.fillStyle = "#ff7aa8"; x.beginPath(); x.moveTo(cx - 30, cy - 40); x.lineTo(cx + 30, cy - 40); x.lineTo(cx, cy - 74); x.closePath(); x.fill();
  x.fillStyle = "#6b4a2e"; x.beginPath(); x.moveTo(cx - 16, cy + 30); x.lineTo(cx - 16, cy + 4); x.arc(cx, cy + 4, 16, Math.PI, 0); x.lineTo(cx + 16, cy + 30); x.closePath(); x.fill();
}
function padShape(x, cx, cy, r) {
  x.fillStyle = "rgba(60,50,40,.25)"; x.beginPath(); x.ellipse(cx, cy + 4, r * 1.05, r * 0.62, 0, 0, TAU); x.fill();
  x.fillStyle = "#b9b2a6"; x.beginPath(); x.ellipse(cx, cy, r, r * 0.6, 0, 0, TAU); x.fill();
  x.strokeStyle = "#8a8377"; x.lineWidth = 3; x.stroke();
  x.fillStyle = "#d8d2c6"; x.beginPath(); x.ellipse(cx, cy - 2, r * 0.72, r * 0.38, 0, 0, TAU); x.fill();
}
const PAD_R = 30;
function buildBg() {
  const k = mapS * dpr, map = world ? world.map : L.mapOf(mapId), key = map.id + ":" + k.toFixed(3) + (ROT ? "r" : "");
  if (bgCanvas && bgKey === key) return bgCanvas;
  const W0 = SCR_W(), H0 = SCR_H();
  bgCanvas = canvasOf(W0 * k, H0 * k, (x) => {
    x.setTransform(k, 0, 0, k, 0, 0);
    // 바탕 타일(맵별 색조)
    const src = ART.ground || GRASS, tile = 320;
    const pat = x.createPattern(canvasOf(tile * k, tile * k * (src.height / src.width), (y, w, h) => y.drawImage(src, 0, 0, w, h)), "repeat");
    x.save(); x.setTransform(1, 0, 0, 1, 0, 0); x.fillStyle = pat; x.fillRect(0, 0, W0 * k, H0 * k); x.restore();
    if (!ART.ground) { x.fillStyle = map.ground; x.globalAlpha = 0.45; x.fillRect(0, 0, W0, H0); x.globalAlpha = 1; }
    if (map.tint) { x.fillStyle = map.tint; x.fillRect(0, 0, W0, H0); }
    // 길·다리·동굴은 월드 좌표 그대로(세로면 돌린 변환으로)
    if (ROT) x.setTransform(0, k, -k, 0, L.MAP_H * k, 0);
    // 길: 가장자리 → 흙길 → 가운데 밝은 줄
    x.lineJoin = "round"; x.lineCap = "round";
    const stroke = (pts, wdt, col) => { x.strokeStyle = col; x.lineWidth = wdt; x.beginPath(); pts.forEach(([px, py], i) => (i ? x.lineTo(px, py) : x.moveTo(px, py))); x.stroke(); };
    for (const p of map.paths) stroke(p, 58, map.edge);
    for (const p of map.paths) stroke(p, 46, map.dirt);
    for (const p of map.paths) { x.setLineDash([6, 18]); stroke(p, 4, "rgba(255,255,255,.35)"); x.setLineDash([]); }
    // 눈 다리: 첫 구간에 다리 널빤지
    if (map.id === "snow") {
      const [a, b] = [map.paths[0][0], map.paths[0][1]];
      x.fillStyle = "#8a6440"; x.fillRect(a[0] + 60, a[1] - 30, b[0] - a[0] - 140, 8); x.fillRect(a[0] + 60, a[1] + 22, b[0] - a[0] - 140, 8);
      x.strokeStyle = "rgba(90,60,30,.55)"; x.lineWidth = 3; x.lineCap = "butt";
      for (let px = a[0] + 70; px < b[0] - 80; px += 16) { x.beginPath(); x.moveTo(px, a[1] - 22); x.lineTo(px, a[1] + 22); x.stroke(); }
    }
    // 괴물이 나오는 동굴
    const st = map.paths[0][1];
    x.fillStyle = "rgba(40,30,50,.55)"; x.beginPath(); x.ellipse(8, map.paths[0][0][1], 26, 36, 0, 0, TAU); x.fill();
    // 그림(장식·받침·성)은 똑바로: 위치만 변환
    x.setTransform(k, 0, 0, k, 0, 0);
    for (const [kind, wx, wy, dw] of map.decor) {
      const dx = SX(wx, wy), dy = SY(wx, wy);
      if (ART[kind]) { const h = dw * aspect(kind); x.drawImage(ART[kind], dx - dw / 2, dy - h * 0.6, dw, h); } else decorShape(x, kind, dx, dy, dw);
    }
    // 받침
    for (const [wx, wy] of map.pads) {
      const px = SX(wx, wy), py = SY(wx, wy);
      if (ART.pad) { const w = PAD_R * 2.6, h = w * aspect("pad"); x.drawImage(ART.pad, px - w / 2, py - h / 2, w, h); } else padShape(x, px, py, PAD_R);
    }
    // 성
    const c = map.castle, cx = SX(c.x, c.y), cy = SY(c.x, c.y);
    if (ART.castle) { const w = 136, h = w * aspect("castle"); x.drawImage(ART.castle, cx - w / 2, cy + 36 - h, w, h); } else castleShape(x, cx, cy);
    void st;
  });
  bgKey = key;
  return bgCanvas;
}

/* ---------- 탑 그림: (종류, 단계, 갈림길)마다 한 번 그려 두고 붙인다 ---------- */
const towerCache = new Map();
const KIND_COL = { fire: "#ff7a3c", ice: "#5fc8ff", bolt: "#ffd23c", wind: "#5fd894", light: "#fff0a0" };
const BRANCH_MARK = { "fire:a": "새", "fire:b": "화", "ice:a": "눈", "ice:b": "꽁", "bolt:a": "천", "bolt:b": "폭", "wind:a": "회", "wind:b": "돌", "light:a": "무", "light:b": "등" };
// 탑 하나의 모양(논리 좌표, 받침 가운데가 (0,0), 위로 그린다). 크기·지붕색·깃발·수정·왕관이 단계마다 다르다.
function towerShape(x, kind, lv, branch, W) {
  const D = L.TOWER_DECOR[lv - 1], lc = L.LV_COLORS[lv - 1], kc = KIND_COL[kind];
  const big = lv >= 3, artName = "tower_" + kind + (big ? "_big" : "");
  const im = ART[artName] || (big ? ART["tower_" + kind] : null);
  let top;
  if (im) { const h = W * im.height / im.width; x.drawImage(im, -W / 2, -h + 6, W, h); top = -h + 6; }
  else {
    const bw = W * 0.5, bh = W * (0.9 + lv * 0.06);
    x.fillStyle = big ? "#efe8ff" : "#d9d2c4"; x.fillRect(-bw / 2, -bh, bw, bh);
    x.strokeStyle = "rgba(0,0,0,.18)"; x.lineWidth = 2; x.strokeRect(-bw / 2, -bh, bw, bh);
    x.fillStyle = "rgba(0,0,0,.08)"; for (let i = 1; i < 4; i++) x.fillRect(-bw / 2, -bh * i / 4, bw, 2);
    x.fillStyle = kc; x.fillRect(-bw / 2 - 3, -bh * 0.18, bw + 6, 8);           // 탑 종류 띠
    x.fillStyle = "#3a2c55"; x.beginPath(); x.arc(0, -bh * 0.55, bw * 0.17, Math.PI, 0); x.lineTo(bw * 0.17, -bh * 0.45); x.lineTo(-bw * 0.17, -bh * 0.45); x.fill();
    // 지붕: 단계 색
    x.fillStyle = lv === 1 ? "#8a7bb0" : lc; x.beginPath(); x.moveTo(-bw * 0.75, -bh); x.lineTo(bw * 0.75, -bh); x.lineTo(0, -bh - W * (0.55 + lv * 0.05)); x.closePath(); x.fill();
    x.strokeStyle = "rgba(0,0,0,.2)"; x.stroke();
    top = -bh - W * (0.55 + lv * 0.05);
    // 꼭대기 보석(탑 종류 색)
    x.fillStyle = kc; x.beginPath(); x.arc(0, top, 5 + lv, 0, TAU); x.fill(); x.strokeStyle = "#fff"; x.lineWidth = 2; x.stroke();
  }
  // 깃발
  for (let i = 0; i < D.flags; i++) {
    const fx = (i ? 1 : -1) * W * (D.flags === 1 ? 0 : 0.3), fy = top + (D.flags === 1 ? -2 : W * 0.25);
    x.strokeStyle = "#5a4630"; x.lineWidth = 2; x.beginPath(); x.moveTo(fx, fy); x.lineTo(fx, fy - 20); x.stroke();
    x.fillStyle = i ? lc : kc; x.beginPath(); x.moveTo(fx, fy - 20); x.lineTo(fx + 15, fy - 15); x.lineTo(fx, fy - 10); x.closePath(); x.fill();
  }
  // 수정 장식
  for (let i = 0; i < D.crystals; i++) {
    const cx = [-W * 0.42, W * 0.42, 0][i], cy = i < 2 ? -W * 0.25 : -W * 0.05, s = 7;
    x.fillStyle = "#c08cff"; x.beginPath(); x.moveTo(cx, cy - s * 1.6); x.lineTo(cx + s, cy); x.lineTo(cx, cy + s * 1.2); x.lineTo(cx - s, cy); x.closePath(); x.fill();
    x.strokeStyle = "#fff"; x.lineWidth = 1.5; x.stroke();
  }
  // 왕관(5단계)
  if (D.crown) {
    const cy = top - (D.flags ? 26 : 8);
    x.fillStyle = "#ffd24a"; x.beginPath(); x.moveTo(-14, cy); x.lineTo(-14, cy - 12); x.lineTo(-7, cy - 5); x.lineTo(0, cy - 16); x.lineTo(7, cy - 5); x.lineTo(14, cy - 12); x.lineTo(14, cy); x.closePath(); x.fill();
    x.strokeStyle = "#a8780a"; x.lineWidth = 1.5; x.stroke();
  }
  // 갈림길 표식
  if (branch) {
    const bx = W * 0.4, by = -12;
    x.fillStyle = lc; x.beginPath(); x.arc(bx, by, 11, 0, TAU); x.fill(); x.strokeStyle = "#3a2c55"; x.lineWidth = 2; x.stroke();
    x.fillStyle = "#2a1c50"; x.font = "900 13px " + FONT; x.textAlign = "center"; x.textBaseline = "middle"; x.fillText(BRANCH_MARK[kind + ":" + branch] || "", bx, by + 1);
  }
  return top;
}
// 탑 위 보석 칸 ●●●○○
function gemRow(x, lv, y) {
  for (let i = 0; i < L.MAX_LV; i++) {
    const gx = (i - 2) * 11;
    x.fillStyle = i < lv ? L.LV_COLORS[lv - 1] : "rgba(30,20,60,.55)"; x.beginPath(); x.arc(gx, y, 4.6, 0, TAU); x.fill();
    x.strokeStyle = i < lv ? "#fff" : "rgba(255,255,255,.45)"; x.lineWidth = 1.4; x.stroke();
  }
}
// 탑 그림 캔버스. 돌려주는 값: { c, ox, oy, w, h } (논리 크기, 받침 가운데 기준 그리기 위치)
function towerSprite(kind, lv, branch, k0 = mapS * dpr, withGems = true) {
  const k = k0 * VS, key = kind + lv + (branch || "") + ":" + k.toFixed(3) + (withGems ? "g" : "");
  let s = towerCache.get(key);
  if (s) return s;
  const W = L.TOWER_W[lv - 1], cw = W * 1.6, ch = W * 2.6 + 30;
  let gemY = 0;
  const c = canvasOf(cw * k, ch * k, (x) => {
    x.setTransform(k, 0, 0, k, cw / 2 * k, (ch - 8) * k);
    const top = towerShape(x, kind, lv, branch, W);
    gemY = Math.max(-ch + 16, top - (L.TOWER_DECOR[lv - 1].crown ? 36 : L.TOWER_DECOR[lv - 1].flags ? 26 : 10));
    if (withGems) gemRow(x, lv, gemY);
  });
  // 받침 가운데 기준, VS 배로 크게. gemY: 보석 칸 높이(VS 곱한 값) — 보석 칸은 drawTower 가 따로 그린다(HUD 에 가리면 탑 아래로)
  s = { c, ox: -cw / 2 * VS, oy: -(ch - 8) * VS, w: cw * VS, h: ch * VS, gemY: gemY * VS };
  towerCache.set(key, s);
  return s;
}

/* ---------- 괴물 그림(그림이 없으면 도형을 한 번 그려 둔다) ---------- */
const monCache = new Map();
const MON_COL = { slime: "#7fe08a", imp: "#ff8a5c", shell: "#5fb3a0", bat: "#9b7bd8", ghost: "#e8f0ff", troll: "#b0a070", boss: "#ff6fa8" };
function monShape(x, kind, r, white) {
  const col = white ? "#ffffff" : MON_COL[kind];
  x.fillStyle = col; x.beginPath();
  if (kind === "slime") { x.moveTo(-r, r * 0.6); x.quadraticCurveTo(-r, -r * 0.9, 0, -r * 0.9); x.quadraticCurveTo(r, -r * 0.9, r, r * 0.6); x.closePath(); }
  else if (kind === "bat") { x.ellipse(0, 0, r * 0.6, r * 0.55, 0, 0, TAU); x.moveTo(-r * 0.4, 0); x.lineTo(-r * 1.4, -r * 0.6); x.lineTo(-r * 1.1, r * 0.2); x.closePath(); x.moveTo(r * 0.4, 0); x.lineTo(r * 1.4, -r * 0.6); x.lineTo(r * 1.1, r * 0.2); x.closePath(); }
  else if (kind === "ghost") { x.arc(0, -r * 0.1, r * 0.8, Math.PI, 0); x.lineTo(r * 0.8, r * 0.7); for (let i = 0; i < 4; i++) x.lineTo(r * (0.6 - i * 0.4), r * (i % 2 ? 0.7 : 0.45)); x.lineTo(-r * 0.8, r * 0.7); x.closePath(); }
  else if (kind === "shell") { x.ellipse(0, -r * 0.1, r * 1.05, r * 0.7, 0, Math.PI, 0); x.lineTo(r * 1.05, r * 0.3); x.lineTo(-r * 1.05, r * 0.3); x.closePath(); x.moveTo(-r * 0.9, 0); x.arc(-r * 1.1, 0, r * 0.35, 0, TAU); }
  else x.ellipse(0, 0, r * 0.9, r, 0, 0, TAU);
  x.fill();
  if (white) return;
  if (kind === "shell") { x.strokeStyle = "#2f7a68"; x.lineWidth = 2; x.beginPath(); x.moveTo(-r * 0.5, -r * 0.6); x.lineTo(-r * 0.2, r * 0.2); x.moveTo(r * 0.4, -r * 0.6); x.lineTo(r * 0.2, r * 0.2); x.stroke(); }
  if (kind === "imp") { x.fillStyle = "#ffd24a"; x.beginPath(); x.moveTo(-r * 0.5, -r * 0.8); x.lineTo(-r * 0.3, -r * 1.3); x.lineTo(-r * 0.1, -r * 0.85); x.moveTo(r * 0.1, -r * 0.85); x.lineTo(r * 0.3, -r * 1.3); x.lineTo(r * 0.5, -r * 0.8); x.fill(); }
  if (kind === "boss") { x.fillStyle = "#ffd24a"; x.beginPath(); x.moveTo(-r * 0.5, -r * 0.85); x.lineTo(-r * 0.5, -r * 1.3); x.lineTo(-r * 0.25, -r * 1.05); x.lineTo(0, -r * 1.4); x.lineTo(r * 0.25, -r * 1.05); x.lineTo(r * 0.5, -r * 1.3); x.lineTo(r * 0.5, -r * 0.85); x.closePath(); x.fill(); }
  // 장난스러운 얼굴(왼쪽을 본다)
  const ex = -r * 0.35, ey = kind === "bat" ? -r * 0.1 : -r * 0.2;
  x.fillStyle = "#fff"; x.beginPath(); x.arc(ex, ey, r * 0.22, 0, TAU); x.arc(ex + r * 0.42, ey, r * 0.18, 0, TAU); x.fill();
  x.fillStyle = "#2a1c50"; x.beginPath(); x.arc(ex - r * 0.04, ey, r * 0.11, 0, TAU); x.arc(ex + r * 0.38, ey, r * 0.09, 0, TAU); x.fill();
  x.strokeStyle = "#2a1c50"; x.lineWidth = Math.max(1.5, r * 0.1); x.beginPath(); x.moveTo(ex - r * 0.1, ey + r * 0.4); x.quadraticCurveTo(ex + r * 0.15, ey + r * 0.6, ex + r * 0.4, ey + r * 0.38); x.stroke();
}
function monSprite(kind, white = false) {
  const art = ART[kind];
  if (art) return white ? WHITE[kind] : art;
  const key = kind + (white ? "w" : "") + ":" + (mapS * dpr).toFixed(2);
  let c = monCache.get(key);
  if (!c) {
    const M = L.MONSTERS[kind], W = M.w, k = Math.max(1, mapS * dpr) * 1.2;
    c = canvasOf(W * k, W * k, (x) => { x.setTransform(k, 0, 0, k, W * k / 2, W * k / 2); monShape(x, kind, W * 0.36, white); });
    monCache.set(key, c);
  }
  return c;
}
const aspectOf = kind => { const s = monSprite(kind); return s ? s.height / s.width : 1; };
// 가운데 (x,y), 너비 w. 그림은 왼쪽을 본다 → 오른쪽으로 갈 때 뒤집는다.
// foot: y 가 발 위치(그림 아래 가운데가 y 에 닿는다). 아니면 y 가 그림 가운데.
function drawMon(kind, x, y, w, faceRight, white, alpha = 1, foot = false) {
  const src = monSprite(kind, white); if (!src) return;
  const h = w * src.height / src.width, top = foot ? -h : -h / 2;
  if (alpha !== 1) ctx.globalAlpha = alpha;
  if (faceRight) { ctx.save(); ctx.translate(x, y); ctx.scale(-1, 1); ctx.drawImage(src, -w / 2, top, w, h); ctx.restore(); }
  else ctx.drawImage(src, x - w / 2, y + top, w, h);
  if (alpha !== 1) ctx.globalAlpha = 1;
}

/* ---------- 카드·탑 버튼 그림 ---------- */
const iconCache = new Map();
function cakeIcon(x, cx, cy, s) {
  if (ART.cake) { const h = s * aspect("cake"); x.drawImage(ART.cake, cx - s / 2, cy - h / 2, s, h); return; }
  x.fillStyle = "#fff3e0"; x.beginPath(); x.moveTo(cx - s * 0.4, cy + s * 0.25); x.lineTo(cx + s * 0.4, cy + s * 0.25); x.lineTo(cx + s * 0.4, cy - s * 0.05); x.lineTo(cx - s * 0.4, cy - s * 0.25); x.closePath(); x.fill();
  x.fillStyle = "#ff8fb4"; x.fillRect(cx - s * 0.4, cy + s * 0.02, s * 0.8, s * 0.08);
  x.fillStyle = "#e8505a"; x.beginPath(); x.arc(cx - s * 0.1, cy - s * 0.25, s * 0.08, 0, TAU); x.fill();
}
function gemIcon(x, cx, cy, s) {
  if (ART.crystal) { const h = s * aspect("crystal"); x.drawImage(ART.crystal, cx - s / 2, cy - h / 2, s, h); return; }
  x.fillStyle = "#b07cff"; x.beginPath(); x.moveTo(cx, cy - s * 0.45); x.lineTo(cx + s * 0.3, cy - s * 0.1); x.lineTo(cx, cy + s * 0.45); x.lineTo(cx - s * 0.3, cy - s * 0.1); x.closePath(); x.fill();
  x.fillStyle = "rgba(255,255,255,.6)"; x.beginPath(); x.moveTo(cx, cy - s * 0.45); x.lineTo(cx + s * 0.12, cy - s * 0.1); x.lineTo(cx, cy + s * 0.2); x.closePath(); x.fill();
}
// 카드·버튼용 작은 그림(캔버스). 탑이면 그 단계의 탑 모양을 보여 준다(무엇이 될지 미리).
function iconFor(c, w = 96, h = 112) {
  const key = (c.type || "t") + ":" + (c.kind || c.id) + ":" + (c.lv || 1) + ":" + (c.branch || "") + ":" + w;
  let im = iconCache.get(key);
  if (!im) {
    im = canvasOf(w, h, (x) => {
      if (c.kind) {
        const lv = c.lv || 1, br = lv >= 3 ? (c.branch || "a") : null;
        if (lv >= 3) x.drawImage(LV_GLOW[lv - 1], w * 0.05, h * 0.05, w * 0.9, w * 0.9);
        const W = L.TOWER_W[lv - 1], sc = Math.min(w / (W * 1.25), h / (W * (lv >= 3 ? 1.95 : 1.75)));
        x.setTransform(sc, 0, 0, sc, w / 2, h - 6);
        towerShape(x, c.kind, lv, br, W);
        x.setTransform(1, 0, 0, 1, 0, 0);
      } else if (c.type === "spell") {
        x.drawImage(GLOW.gold, 0, 4, w, w);
        x.strokeStyle = "#ffe27a"; x.lineWidth = 7; x.beginPath(); x.arc(w / 2, h / 2, w * 0.28, -Math.PI / 2, Math.PI * 1.15); x.stroke();
        x.fillStyle = "#fff"; x.beginPath(); x.moveTo(w / 2 + 6, h / 2 - 22); x.lineTo(w / 2 - 12, h / 2 + 4); x.lineTo(w / 2, h / 2 + 4); x.lineTo(w / 2 - 6, h / 2 + 24); x.lineTo(w / 2 + 14, h / 2 - 4); x.lineTo(w / 2 + 2, h / 2 - 4); x.closePath(); x.fill();
      } else { x.drawImage(GLOW.white, 4, 8, w - 8, w - 8); cakeIcon(x, w / 2, h / 2, w * 0.7); }
    });
    iconCache.set(key, im);
  }
  const out = document.createElement("canvas"); out.width = w; out.height = h; out.getContext("2d").drawImage(im, 0, 0);
  return out;
}

/* ---------- 상태 ---------- */
let mode = "start";      // start | play | build | info | quiz | reward | cards | resume | paused | over
let world = null, clock = 0, banner = "", bannerT = 0, bannerBig = false, flash = 0, flashCol = "255,255,255";
let speed = 1, resumeT = 0, runSaved = false, saidOwl = false, saidPad = false, wandT = 0, focusPad = -1;
const PILOT_COLOR = L.PILOTS.map(p => p.color);
function say(text, big) { banner = text; bannerT = big ? 2.6 : 1.8; bannerBig = !!big; }

/* ---------- HUD ---------- */
const hudEls = { cake: $("cake"), gems: $("gems"), wave: $("wave"), go: $("goBtn") };
let hudKey = "";
function hud() {
  if (!world) return;
  const prep = world.phase === "prep", left = Math.ceil(Math.max(0, world.prepT)), haste = E.hasteOn(world);
  const k = world.cake + "/" + world.gems + "/" + world.wave + "/" + prep + "/" + left + "/" + haste;
  if (k === hudKey) return; hudKey = k;
  hudEls.cake.textContent = world.cake;
  hudEls.gems.textContent = world.gems;
  hudEls.wave.textContent = (prep ? "파도 " + world.wave + " 준비 " + left : "파도 " + world.wave + "/" + L.WAVES) + (haste ? " · 빠른 주문" : "");
  hudEls.wave.classList.toggle("prep", prep); hudEls.wave.classList.toggle("haste", haste);
  hudEls.go.hidden = !prep;
}

/* ---------- 실수 터치 막기(탑 세우기·강화·카드) ----------
   (1) 화면이 뜨고 LOCK_MS 동안은 버튼이 흐리고 잠겨 있다.
   (2) 잠금이 풀린 뒤 그 버튼 위에서 새로 누르고 같은 버튼 위에서 뗀 것만 고른 것으로 친다. 키보드는 새로 누른 숫자키만. */
const LOCK_MS = 700;
let guard = null, freshKeyAt = 0;
function armChoices(panel, buttons, onPick) {
  if (guard && guard.panel !== panel) guard.panel.classList.remove("locked");
  const g = guard = { armAt: performance.now() + LOCK_MS, buttons, onPick, panel, down: null };
  panel.classList.add("locked");
  setTimeout(() => { if (guard === g) panel.classList.remove("locked"); }, LOCK_MS);
  buttons.forEach((b, i) => {
    b.onpointerdown = e => { g.down = guard === g && performance.now() >= g.armAt ? { b, id: e.pointerId } : null; };
    b.onpointerup = e => {
      const d = g.down; g.down = null;
      if (guard !== g || !d || d.b !== b || d.id !== e.pointerId || performance.now() < g.armAt || b.disabled) return;
      const at = document.elementFromPoint(e.clientX, e.clientY);
      if (at && !b.contains(at)) return;
      onPick(b, i);
    };
    b.onpointercancel = () => { g.down = null; };
    b.onclick = e => { if (e.detail === 0 && guard === g && freshKeyAt >= g.armAt && performance.now() - freshKeyAt < 1500 && !b.disabled) onPick(b, i); };
  });
}
function disarm() { if (guard) guard.panel.classList.remove("locked"); guard = null; }
addEventListener("keydown", e => {
  if (e.key === "Escape" || e.key === "p") { if (mode === "play") pause(); else if (mode === "paused") unpause(); else if (mode === "build" || mode === "info") closeDock(); }
  if (e.repeat || !guard || performance.now() < guard.armAt) return;
  freshKeyAt = performance.now();
  const n = parseInt(e.key, 10);
  if (n >= 1 && n <= guard.buttons.length && !guard.buttons[n - 1].disabled) { e.preventDefault(); guard.onPick(guard.buttons[n - 1], n - 1); }
});

/* ---------- 입력: 탭만 ---------- */
canvas.addEventListener("pointerdown", e => {
  audio();
  if (mode !== "play" || !world) return;
  const p = toMap(e.clientX, e.clientY);
  tapAt(p.x, p.y);
});
function tapAt(x, y) {
  // 1) 부엉이(큰 탭 범위: 화면에서 최소 72px)
  if (world.owl) {
    const o = E.owlPos(world.owl), R = Math.max(L.OWL_HIT_R * VS * 0.9, 44 / mapS);
    if ((x - o.x) ** 2 + (y - o.y) ** 2 <= R * R) { E.tapOwl(world); sfx.tap(); openQuiz(); return "owl"; }
  }
  // 2) 받침·탑
  const PR = Math.max(PAD_R + 10, 40 / mapS);   // 화면에서 지름 80px 이상
  let best = -1, bd = PR * PR;
  for (const p of world.pads) { const d = (p.x - x) ** 2 + (p.y - 8 - y) ** 2; if (d < bd) { bd = d; best = p.i; } }
  if (best >= 0) { sfx.tap(); if (world.pads[best].tower) openInfo(best); else openBuild(best); return "pad"; }
  // 3) 괴물 → 반짝 가루
  const hit = E.sparkle(world, x, y);
  if (hit) sfx.sparkle();
  return hit ? "sparkle" : "none";
}
addEventListener("blur", () => { if (mode === "play") pause(); });
document.addEventListener("visibilitychange", () => { if (document.hidden && mode === "play") pause(); });

/* ---------- 탑 세우기·정보(아래에 붙는 창, 그동안 게임 정지) ---------- */
function openBuild(padIdx) {
  mode = "build"; focusPad = padIdx;
  const rec = E.recommendKind(world, padIdx);
  $("buildKicker").textContent = world.freeTower ? "마법 배지: 첫 탑은 공짜!" : "수정 " + world.gems + "개 있어요";
  const row = $("buildRow"); row.innerHTML = "";
  const kinds = L.TOWER_IDS;
  const buttons = kinds.map(kind => {
    const T = L.TOWERS[kind], b = document.createElement("button"), cost = E.buildCost(world, kind);
    b.type = "button"; b.className = "tbtn" + (kind === rec ? " rec" : "");
    b.disabled = !E.canBuild(world, padIdx, kind);
    const name = document.createElement("b"); name.textContent = T.name;
    const price = document.createElement("span"); price.innerHTML = cost ? '<i class="ic ic-gem"></i>' + cost : "공짜!";
    b.append(iconFor({ kind, lv: 1 }, 96, 114), name, price);
    row.appendChild(b); return b;
  });
  if (!buttons.some(b => !b.disabled)) $("buildKicker").textContent = "수정이 모자라요 · 괴물을 돌려보내거나 ? 부엉이 문제를 맞히면 모여요";
  placeDock($("build"), padIdx);
  $("build").hidden = false; $("info").hidden = true;
  armChoices($("build"), buttons, (b, i) => {
    const kind = kinds[i], t = E.build(world, padIdx, kind);
    if (!t) return;
    disarm(); b.classList.add("ok"); sfx.build();
    say(L.TOWERS[kind].name + "을 세웠어요!", false);
    hudKey = ""; hud();
    setTimeout(closeDock, 180);
  });
}
function openInfo(padIdx) {
  mode = "info"; focusPad = padIdx;
  const t = E.towerOf(world, padIdx), s = L.towerStats(t.kind, t.lv, t.branch);
  const ic = $("infoIcon"), x = ic.getContext("2d"); x.clearRect(0, 0, 96, 96); x.drawImage(iconFor({ kind: t.kind, lv: t.lv, branch: t.branch }, 96, 112), 8, -4, 80, 93);
  $("infoName").textContent = s.name + " " + t.lv + "단계";
  $("infoGems").textContent = "●".repeat(t.lv) + "○".repeat(L.MAX_LV - t.lv);
  $("infoSay").textContent = t.branch ? L.TOWERS[t.kind].branches[t.branch].say : L.TOWERS[t.kind].say + (L.TOWERS[t.kind].air ? " · 박쥐도 맞혀요" : "");
  const cost = E.upgradeCost(world, padIdx), up = $("upBtn");
  if (cost != null) {
    up.hidden = false; up.disabled = world.gems < cost;
    up.innerHTML = '수정 <i class="ic ic-gem"></i>' + cost + "으로 " + (t.lv + 1) + "단계";
    $("infoNote").textContent = world.gems < cost ? "수정이 " + (cost - world.gems) + "개 더 있어야 해요" : "3단계부터는 ? 부엉이 문제를 맞히고 카드로 강해져요";
  } else {
    up.hidden = true;
    $("infoNote").textContent = t.lv >= L.MAX_LV ? "가장 강한 5단계예요!" : "더 강하게 하려면 ? 부엉이 문제를 맞혀 강화 카드를 골라요";
  }
  placeDock($("info"), padIdx);
  $("info").hidden = false; $("build").hidden = true;
  armChoices($("info"), [up], () => {
    if (!E.upgradeWithGems(world, padIdx)) return;
    handleEvents();
    disarm(); sfx.up(); flash = 0.2; flashCol = "255,240,180";
    say(L.towerName(t.kind, t.lv, t.branch) + " " + t.lv + "단계! " + L.upgradeGain(t.kind, t.lv, t.branch), true);
    hudKey = ""; hud();
    setTimeout(closeDock, 200);
  });
}
// 고르는 받침이 화면 아래쪽이면 창을 위에 띄운다(받침이 가려지지 않게)
function placeDock(panel, padIdx) { const p = world.pads[padIdx]; panel.classList.toggle("top", toScreen(p.x, p.y).y > vh * 0.5); }
function closeDock() {
  disarm(); $("build").hidden = true; $("info").hidden = true; focusPad = -1;
  if (mode === "build" || mode === "info") { mode = "play"; last = performance.now(); }
}
$("buildClose").addEventListener("click", closeDock);
$("infoClose").addEventListener("click", closeDock);

/* ---------- ? 부엉이 → 문제 → 대마법 → 카드 ---------- */
let cardsShown = null;
const QUIZ_THEME = { top: 60, bg: "rgba(34,20,78,.97)", accent: "#ffe27a" };
function openQuiz() {
  mode = "quiz"; closePanels();
  if (!GameQuiz) { rewardBlast(false); afterReward(false, true); return; }
  const n = world.tune.cards;
  GameQuiz.ask({
    kid: L.PILOTS[pilot].kid, voice: soundOn, title: "맞히면 대마법 + 탑 강화!",
    hint: "한 번에 맞히면 길 위 괴물이 모두 방울에 실려 가요 · 수정 +" + L.BLAST_GEMS + " · 카드 " + n + "장 중 하나", theme: QUIZ_THEME,
    onWrong: () => sfx.no(),
    onCorrect: r => { E.recordQuiz(world, r.firstTry); return rewardBlast(r.firstTry); },
    onDone: r => { if (mode !== "quiz") return; afterReward(r.firstTry, false); },
  });
}
// 맞힌 그 순간(카드 고르기 전): 대마법(한 번에) / 작은 마법(고쳐서)
function rewardBlast(firstTry) {
  const r = E.quizBlast(world, firstTry);
  handleEvents(); megaFx(firstTry ? 1.4 : 0.7, firstTry ? 0.8 : 0.6); if (firstTry) shakeT = 0.25;
  sfx.blast(firstTry); flash = firstTry ? 0.2 : 0.12; flashCol = firstTry ? "230,200,255" : "255,255,255"; wandT = firstTry ? 1.8 : 1;
  hudKey = ""; hud();
  const msg = (firstTry ? "대마법! " : "작은 마법! ") + (r.n ? "괴물 " + r.n + "마리를 방울에 태워 보냈어요" : "길이 깨끗해졌어요") + " · 수정 +" + r.gems + (r.cake ? " · 케이크 +1" : "");
  say(msg, true);
  return msg;
}
// 대마법이 눈에 보이게 잠깐 기다렸다가 카드
function afterReward(firstTry, noQuiz) {
  mode = "reward";
  setTimeout(() => { if (mode === "reward" && world) openCards({ firstTry, noQuiz }); }, firstTry ? 1000 : 700);
}
function openCards({ firstTry, noQuiz = false }) {
  mode = "cards";
  const { cards, rare } = E.drawCardsFor(world, { firstTry, noQuiz, rng: Math.random });
  if (!cards.length) { startResume(); return; }
  cardsShown = cards;
  $("cardKicker").textContent = noQuiz ? "? 부엉이가 선물을 줬어요!" : rare ? "세 번 연속 한 번에! 전설 카드가 섞였어요" : firstTry ? "한 번에 맞혔어요! 카드 " + cards.length + "장 중 하나" : "고쳐서 맞혔어요! 카드 2장 중 하나";
  $("cardTitle").textContent = "어떤 카드를 고를까요?";
  showCardRow(cards, (c, b) => {
    if (L.needsBranch(c)) { openBranch(c); return; }
    applyChosen(c, null);
  });
}
function showCardRow(cards, onPick) {
  const row = $("cardRow"); row.innerHTML = ""; row.style.setProperty("--n", String(cards.length));
  const buttons = cards.map(c => {
    const t = c.text || L.cardText(c), b = document.createElement("button");
    b.type = "button"; b.className = "card r" + (c.rarity || 1) + (c.recommend ? " rec" : "");
    if (t.tag) { const em = document.createElement("em"); em.textContent = t.tag; b.appendChild(em); }
    const name = document.createElement("b"); name.textContent = t.name;
    const tip = document.createElement("span"); tip.textContent = t.say;
    b.append(iconFor(c.icon || c), name, tip); row.appendChild(b); return b;
  });
  $("cards").hidden = false;
  armChoices($("cards"), buttons, (b, i) => { disarm(); buttons.forEach(x => { x.disabled = true; }); b.classList.add("ok"); onPick(cards[i], b); });
}
// 3단계 갈림길: 두 모양 중 하나
function openBranch(c) {
  const T = L.TOWERS[c.kind];
  $("cardKicker").textContent = T.name + " " + c.lv + "단계! 변신할 모양을 골라요";
  $("cardTitle").textContent = "어떤 탑으로 변신할까요?";
  const opts = ["a", "b"].map(br => ({ type: "branch", kind: c.kind, lv: c.lv, branch: br, rarity: 2, text: { name: T.branches[br].name, tag: save.branches[c.kind + ":" + br] ? "" : "새 발견!", say: T.branches[br].say } }));
  setTimeout(() => showCardRow(opts, o => applyChosen(c, o.branch)), 260);
}
function applyChosen(c, branch) {
  sfx.up();
  const r = E.applyCard(world, c, branch);
  handleEvents();
  say(r.text, true); bannerT = 3;
  flash = 0.3; flashCol = "255,240,180";
  hudKey = ""; hud();
  setTimeout(() => { $("cards").hidden = true; cardsShown = null; startResume(); }, 380);
}
// 재개: 1초 뒤(그동안 탑이 커지는 모습이 보인다)
function startResume() { mode = "resume"; resumeT = 1; closePanels(); }
function closePanels() { disarm(); ["build", "info", "cards"].forEach(id => { $(id).hidden = true; }); focusPad = -1; }

// 케이크 0: 한 판에 한 번 구조 문제
function openRescue() {
  mode = "quiz"; closePanels(); say("케이크를 다 가져갔어요!", true);
  const done = () => { E.rescue(world); handleEvents(); megaFx(1.4, 0.8); shakeT = 0.25; sfx.blast(true); flash = 0.2; flashCol = "230,200,255"; wandT = 1.8; hudKey = ""; hud(); say("구조 마법! 케이크 " + L.RESCUE_CAKE + "조각 + 괴물 모두 방울로", true); startResume(); };
  if (!GameQuiz) { done(); return; }
  GameQuiz.ask({
    kid: L.PILOTS[pilot].kid, voice: soundOn, title: "케이크를 다 가져갔어요 · 맞히면 케이크 " + L.RESCUE_CAKE + "조각!", hint: "맞히면 화면의 괴물도 모두 방울에 실려 가요", theme: QUIZ_THEME,
    onWrong: () => sfx.no(),
    onCorrect: r => { E.recordQuiz(world, r.firstTry); return "구조 마법!"; },
    onDone: () => { if (mode !== "quiz") return; done(); },
  });
}

/* ---------- 판 시작·끝 ---------- */
function begin(opts = {}) {
  disarm(); if (GameQuiz) { GameQuiz.close(); GameQuiz.setKid(L.PILOTS[pilot].kid); }
  if (opts.kid != null) pilot = opts.kid;
  if (opts.map) mapId = opts.map;
  if (!L.openMaps(save.wins).includes(mapId)) mapId = "field";
  world = E.createWorld({ kid: pilot, map: mapId, badges: L.openBadges(save.solved) });
  ["start", "over", "cards", "pause", "dex", "build", "info"].forEach(id => { $(id).hidden = true; });
  $("hud").hidden = false; $("ctrl").hidden = false; hudKey = ""; hud();
  runSaved = false; banner = ""; bannerT = 0; speed = 1; paintFast(); saidOwl = false; saidPad = false;
  audio(); last = performance.now(); mode = "play"; layoutCtrl();
  $("tip").textContent = "";
  say(world.map.name + "을 지켜요! 빈 받침을 눌러 탑을 세워요", true);
}
function endRun(quit) {
  if (runSaved || !world) return null;
  runSaved = true;
  const rec = E.runRecord(world);
  if (quit) rec.result = "quit";
  const r = L.applyRun(save, rec);
  save = r.save; save.map = mapId; writeSave();
  return { rec, r };
}
function showOver() {
  mode = "over"; disarm(); if (GameQuiz) GameQuiz.close();
  closePanels(); $("pause").hidden = true; $("ctrl").hidden = true; layoutCtrl();
  const out = endRun(false); if (!out) return;
  const { rec, r } = out, win = rec.result === "win";
  if (win) sfx.win();
  $("overTitle").textContent = win ? "케이크를 지켰어요! 파도 " + L.WAVES + "개 성공" : "괴물들이 케이크를 다 가져갔어요. 파도 " + rec.wave + "개를 막았어요!";
  // 문제를 맞혀서 얻은 것: 맨 위에 크게
  const quizBox = rec.solved
    ? '<div class="quizwin"><p class="qw-title">문제를 맞혀서 얻은 것</p><div class="qw-row"><span><b>' + rec.solved + '</b>문제</span><span><b>' + rec.blasts + '</b>대마법</span><span><b>' + rec.cards + '</b>카드</span><span><b>' + rec.blastSent + "</b>마리 방울</span></div>" + (rec.blastSent ? '<p class="qw-sub">대마법으로 괴물 ' + rec.blastSent + "마리를 한꺼번에 돌려보냈어요</p>" : "") + "</div>"
    : '<div class="quizwin dim"><p class="qw-title">다음엔 ? 부엉이를 눌러 봐요</p><p class="qw-sub">문제를 맞히면 대마법이 터지고 탑이 3·4·5단계로 커져요</p></div>';
  const lines = [quizBox,
    win ? '<p class="stars">' + "★".repeat(r.stars) + "☆".repeat(3 - r.stars) + "</p>" : "",
    "<p>남은 케이크 <b>" + rec.cake + "</b>조각 · 돌려보낸 괴물 <b>" + rec.sent + "</b>마리</p>"];
  const news = [];
  for (const m of r.newMaps) news.push("새 맵 ‘" + L.mapOf(m).name + "’이 열렸어요!");
  for (const b of r.newBadges) { const B = L.BADGES.find(x => x.id === b); if (B) news.push("마법 배지: " + B.name); }
  for (const k of r.newTowers) news.push("새 발견! " + L.TOWERS[k].name);
  for (const k of r.newBranches) { const [kind, br] = k.split(":"); news.push("새 발견! " + L.TOWERS[kind].branches[br].name); }
  if (r.newMonsters.length) news.push("도감에 새 괴물: " + r.newMonsters.map(k => L.MONSTERS[k].name).join(" · "));
  $("overText").innerHTML = lines.join("") + (news.length ? '<p class="news">' + news.join("<br>") + "</p>" : "");
  $("over").hidden = false;
  paintStart();
}
function pause() {
  if (mode !== "play") return;
  mode = "paused"; $("pause").hidden = false;
}
function unpause() { if (mode !== "paused") return; $("pause").hidden = true; mode = "play"; last = performance.now(); }
function toMenu() {
  if (world && mode !== "over" && mode !== "start") endRun(true);
  disarm(); if (GameQuiz) GameQuiz.close();
  mode = "start"; world = null;
  ["over", "cards", "pause", "dex", "build", "info"].forEach(id => { $(id).hidden = true; });
  $("hud").hidden = true; $("ctrl").hidden = true; layoutCtrl(); paintStart(); $("start").hidden = false; bgKey = "";
}

/* ---------- 이벤트 → 소리·글자 ---------- */
/* ---------- 효과 그림 fx_*.webp (4x2 = 8컷, 순검정 바탕) ----------
   불러올 때 한 번만 검정 → 투명으로 바꾼 시트를 만들어 두고(alpha = max(r,g,b), 색은 alpha 로 나눠 되돌림),
   그릴 때는 보통으로 한 번 + lighter 로 약하게 한 번(밝은 잔디 위에서도 색이 살아 있게). 시트가 없으면 아무것도 안 그린다(도형 효과는 그대로). */
const FX = {}, FX_NAMES = ["fire", "ice", "bolt", "wind", "light", "mega"];
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
let fxList = [], shakeT = 0;
// size: 논리 칸(map) 또는 화면 px(screen). dur 초 동안 8컷.
function addFx(name, x, y, size, { dur = 0.4, rot = 0, screen = false, alpha = 1, oy = 0 } = {}) {
  if (!FX[name]) return null;
  if (fxList.length >= FX_MAX) { const i = fxList.findIndex(f => !f.screen); fxList.splice(i >= 0 ? i : 0, 1); }   // 큰 충격파는 남기고 오래된 것부터
  const f = { name, x, y, size, t: 0, dur, rot, screen, alpha, oy };   // 맵 효과는 x,y 가 월드 좌표, oy 는 화면 위쪽 어긋남
  fxList.push(f); return f;
}
function drawFxItem(f) {
  const S = FX[f.name]; if (!S) return;
  const fr = Math.min(7, Math.floor(f.t / f.dur * 8)), cell = S.cell, sx = (fr % 4) * cell, sy = Math.floor(fr / 4) * cell, h = f.size / 2;
  const px = f.screen ? f.x : SX(f.x, f.y), py = f.screen ? f.y : SY(f.x, f.y) + f.oy;
  if (f.rot) { ctx.save(); ctx.translate(px, py); ctx.rotate(f.rot); }
  const dx = f.rot ? -h : px - h, dy = f.rot ? -h : py - h;
  ctx.globalAlpha = f.alpha; ctx.drawImage(S.c, sx, sy, cell, cell, dx, dy, f.size, f.size);
  ctx.globalCompositeOperation = "lighter"; ctx.globalAlpha = f.alpha * 0.42; ctx.drawImage(S.c, sx, sy, cell, cell, dx, dy, f.size, f.size);
  ctx.globalCompositeOperation = "source-over"; ctx.globalAlpha = 1;
  if (f.rot) ctx.restore();
}
// 맞는 순간: 단계가 오를수록 크게(1단계 ≈ 괴물 1.2배 → 5단계 ≈ 2.4배), 갈림길 탑은 한 번 더 크게 + 살짝 회전
function hitEffect(e) {
  const lvK = 1.2 + (Math.max(1, e.lv) - 1) * 0.3, evo = e.lv >= 3 && e.br;
  let size = 46 * VS * lvK * (evo ? 1.18 : 1);
  if (e.kind === "ice") size = Math.max(size, e.R * 1.7);                 // 둘레 공격: 범위에 맞춰
  if (e.kind === "fire" && e.R) size = Math.max(size, e.R * 2.4);         // 화산: 터지는 범위
  addFx(e.kind, e.x, e.y, size, { oy: -12, dur: e.kind === "ice" ? 0.55 : 0.45, rot: evo ? (e.br === "a" ? 0.5 : -0.5) + Math.random() * 0.4 : 0, alpha: e.kind === "ice" ? 0.85 : 1 });
}
// 화면 가운데 큰 무지개 충격파(대마법·대장)
function megaFx(k = 1.4, dur = 0.7) {
  const S = Math.min(SCR_W() * mapS, SCR_H() * mapS) * dpr * k;
  addFx("mega", (mapX + SCR_W() * mapS / 2) * dpr, (mapY + SCR_H() * mapS / 2) * dpr, S, { dur, screen: true });
}
const lightAt = (x, y, size = 80, oy = 0) => addFx("light", x, y, size * VS, { dur: 0.45, oy });
function padFx(pad) { const p = world && world.pads[pad]; if (p) lightAt(p.x, p.y, 96, -36 * VS); }
function handleEvents() {
  const ev = world.events; if (!ev.length) return;
  for (const e of ev) {
    if (e.type === "hit") hitEffect(e);
    else if (e.type === "home") { if (e.via !== "storm") sfx.home(); else lightAt(e.x, e.y, 76, -14); if (e.kind === "boss") { megaFx(1.1, 0.8); shakeT = 0.25; } }
    else if (e.type === "build" || e.type === "upgrade") padFx(e.pad);
    else if (e.type === "card") { if (e.pad >= 0) padFx(e.pad); }
    else if (e.type === "shot") sfx[e.kind] && sfx[e.kind]();
    else if (e.type === "owl") { sfx.owl(); if (!saidOwl) { saidOwl = true; say("? 부엉이가 왔어요! 눌러 보세요", true); } }
    else if (e.type === "steal") { sfx.steal(); flash = 0.12; flashCol = "255,150,170"; say(L.MONSTERS[e.kind].name + "이 케이크를 " + e.n + "조각 가져갔어요", false); }
    else if (e.type === "wave") { if (e.boss) { sfx.boss(); megaFx(1.0, 0.8); say("파도 " + e.n + " · 케이크 대왕이 와요!", true); } else { sfx.wave(); say("파도 " + e.n + " 시작!", false); } }
    else if (e.type === "wave-clear") { if (e.n < L.WAVES) say("파도 " + e.n + " 막았어요! 수정 +" + L.WAVE_GEMS, false); }
    else if (e.type === "meet" && e.kind === "ghost") say("숨바꼭질 유령! 눌러서 반짝 가루로 찾아요", false);
    else if (e.type === "meet" && e.kind === "bat") say("팔랑 박쥐는 번개·바람·빛 탑만 닿아요", false);
  }
  ev.length = 0;
}
function update(dt) {
  // 빨리 감기는 게임 시간만 두 배(작게 나눠서). 문제·카드는 이 밖이라 정상 속도.
  const total = dt * speed, n = Math.max(1, Math.ceil(total / 0.034));
  for (let i = 0; i < n && mode === "play"; i++) {
    E.stepWorld(world, total / n);
    handleEvents();
    if (world.over) { showOver(); return; }
    if (world.pending === "rescue") { openRescue(); return; }
  }
  if (!saidPad && world.t > 9 && !world.towers.length) { saidPad = true; say("빈 받침(동그란 돌)을 눌러 탑을 세워요!", true); }
  hud();
}

// 맵 바깥(화면 가장자리)도 같은 잔디로 이어 칠한다(무늬는 맵 원점에 맞춰 이음매 없이). 패턴은 크기가 바뀔 때만 다시 만든다.
let groundPat = null, groundKey = "";
function fillGround(ox, oy, k) {
  const map = world ? world.map : L.mapOf(mapId), key = map.id + ":" + k.toFixed(3) + (ART.ground ? "a" : "g");
  if (!groundPat || groundKey !== key) {
    const src = ART.ground || GRASS, tile = 320;
    groundPat = ctx.createPattern(canvasOf(tile * k, tile * k * (src.height / src.width), (y, w, h) => y.drawImage(src, 0, 0, w, h)), "repeat"); groundKey = key;
  }
  ctx.save(); ctx.translate(ox, oy); ctx.fillStyle = groundPat; ctx.fillRect(-ox, -oy, canvas.width, canvas.height);
  if (!ART.ground) { ctx.globalAlpha = 0.45; ctx.fillStyle = map.ground; ctx.fillRect(-ox, -oy, canvas.width, canvas.height); ctx.globalAlpha = 1; }
  if (map.tint) { ctx.fillStyle = map.tint; ctx.fillRect(-ox, -oy, canvas.width, canvas.height); }
  ctx.restore();
}
/* ---------- 그리기 ---------- */
function render() {
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  const sh = shakeT > 0 ? 4 * dpr : 0, k = mapS * dpr, ox = mapX * dpr + (sh ? (Math.random() - 0.5) * 2 * sh : 0), oy = mapY * dpr + (sh ? (Math.random() - 0.5) * 2 * sh : 0);
  fillGround(ox, oy, k);
  ctx.drawImage(buildBg(), ox, oy);
  if (!world) { ctx.fillStyle = "rgba(30,18,70,.45)"; ctx.fillRect(0, 0, canvas.width, canvas.height); return; }
  const w = world, fx = w.fx, setScr = () => ctx.setTransform(k, 0, 0, k, ox, oy);
  // ── 1) 월드 변환으로 그리는 바닥 것(원은 돌려도 같다): 사거리 원, 얼음·폭발 고리 ──
  setWorldTf(k, ox, oy);
  if (focusPad >= 0) { const p = w.pads[focusPad], t = p.tower; if (t) { const s = L.towerStats(t.kind, t.lv, t.branch); ctx.globalAlpha = 0.14; ctx.fillStyle = "#ffffff"; ctx.beginPath(); ctx.arc(p.x, p.y, s.range, 0, TAU); ctx.fill(); ctx.globalAlpha = 1; } }
  for (const r of fx.rings) {
    const kk = r.t / r.T;
    if (r.k === "ice") { ctx.globalAlpha = (1 - kk) * 0.22; ctx.fillStyle = r.color; ctx.beginPath(); ctx.arc(r.x, r.y, r.R * (0.4 + kk * 0.6), 0, TAU); ctx.fill(); ctx.globalAlpha = 1 - kk; ctx.strokeStyle = r.color; ctx.lineWidth = 3 + r.lv; ctx.stroke(); }
    else { ctx.globalAlpha = (1 - kk) * 0.5; ctx.fillStyle = r.color; ctx.beginPath(); ctx.arc(r.x, r.y, r.R * (0.3 + kk * 0.7), 0, TAU); ctx.fill(); }
  }
  ctx.globalAlpha = 1;
  // ── 2) 화면 변환: 그림은 항상 똑바로, 위치만 SX/SY ──
  setScr();
  // 받침 강조(고르는 중)
  if (focusPad >= 0) { const p = w.pads[focusPad], px = SX(p.x, p.y), py = SY(p.x, p.y); ctx.globalAlpha = 0.6 + Math.sin(clock * 8) * 0.3; ctx.strokeStyle = "#ffe27a"; ctx.lineWidth = 5; ctx.beginPath(); ctx.ellipse(px, py, PAD_R + 8, (PAD_R + 8) * 0.62, 0, 0, TAU); ctx.stroke(); ctx.globalAlpha = 1; }
  // 빈 받침이 처음엔 살짝 반짝(어디를 누를지)
  if (!w.towers.length || (w.t < 30 && w.gems >= 70)) { ctx.globalAlpha = 0.25 + Math.sin(clock * 4) * 0.2; ctx.strokeStyle = "#ffffff"; ctx.lineWidth = 3; for (const p of w.pads) if (!p.tower) { ctx.beginPath(); ctx.ellipse(SX(p.x, p.y), SY(p.x, p.y), PAD_R + 4, (PAD_R + 4) * 0.62, 0, 0, TAU); ctx.stroke(); } ctx.globalAlpha = 1; }
  // 탑과 괴물을 화면 y 순으로(탑은 아래 가운데가 받침에 닿는다)
  const items = [];
  for (const t of w.towers) items.push({ o: t, tw: true, sx: SX(t.x, t.y), sy: SY(t.x, t.y) });
  for (const e of w.monsters) items.push({ o: e, tw: false, sx: SX(e.x, e.y), sy: SY(e.x, e.y) });
  items.sort((a, b) => a.sy - b.sy);
  for (const it of items) { if (it.tw) drawTower(it.o, it.sx, it.sy); else drawMonster(it.o, it.sx, it.sy, screenFace(it.o, it.sx)); }
  // ── 3) 월드 변환: 탄·빛줄기·번개·바람(선과 둥근 빛이라 돌려도 같다) ──
  setWorldTf(k, ox, oy);
  for (const s of w.shots) {
    const g = s.br === "b" ? GLOW.volcano : s.br === "a" ? GLOW.phoenix : GLOW.fire, sz = s.size * 3.2;
    // 꼬리: 단계가 오를수록 입자 수·굵기 증가(진행 방향 반대쪽)
    { const dx = s.tx - s.x, dy = s.ty - s.y, d = Math.hypot(dx, dy) || 1, ux = dx / d, uy = dy / d, n = 2 + s.lv, gap = 5 + s.lv;
      for (let i = 1; i <= n; i++) { const q = 1 - i / (n + 1), r = (2 + s.lv * 0.9) * q * (s.br ? 1.3 : 1), px = s.x - ux * gap * i + Math.sin(clock * 30 + i * 2) * 2, py = s.y - uy * gap * i + Math.cos(clock * 30 + i * 2) * 2;
        ctx.globalAlpha = q * 0.9; if (i % 2) ctx.drawImage(STAR_LIST[(i + s.lv) % 4], px - r * 2, py - r * 2, r * 4, r * 4); else { ctx.fillStyle = L.LV_COLORS[s.lv - 1]; ctx.beginPath(); ctx.arc(px, py, r, 0, TAU); ctx.fill(); } }
      ctx.globalAlpha = 1; }
    ctx.drawImage(g, s.x - sz / 2, s.y - sz / 2, sz, sz);
    ctx.fillStyle = L.LV_COLORS[s.lv - 1]; ctx.beginPath(); ctx.arc(s.x, s.y, s.size * 0.55, 0, TAU); ctx.fill();
  }
  for (const q of fx.pops) { const kk = q.t / 0.3; ctx.globalAlpha = 1 - kk; ctx.drawImage(GLOW.fire, q.x - 14 - kk * 10, q.y - 14 - kk * 10, 28 + kk * 20, 28 + kk * 20); }
  ctx.globalAlpha = 1;
  // 빛줄기
  ctx.lineCap = "round";
  for (const b of fx.beams) {
    const kk = b.t / b.T, a = 1 - kk;
    ctx.globalAlpha = a * 0.55; ctx.strokeStyle = L.LV_COLORS[b.lv - 1]; ctx.lineWidth = b.size * (1.2 - kk * 0.4);
    ctx.beginPath(); ctx.moveTo(b.x0, b.y0); ctx.lineTo(b.x1, b.y1); ctx.stroke();
    ctx.globalAlpha = a; ctx.strokeStyle = "#ffffff"; ctx.lineWidth = Math.max(2, b.size * 0.35); ctx.stroke();
  }
  ctx.globalAlpha = 1;
  // 번개
  ctx.lineJoin = "round";
  for (const z of fx.bolts) {
    const a = Math.min(1, z.t / 0.12);
    ctx.beginPath();
    for (let i = 0; i < z.pts.length; i++) {
      const [x, y] = z.pts[i];
      if (!i) { ctx.moveTo(x, y); continue; }
      const [px, py] = z.pts[i - 1], dx = x - px, dy = y - py, len = Math.hypot(dx, dy) || 1, nx = -dy / len, ny = dx / len;
      for (let s = 1; s <= 3; s++) { const j = Math.sin(z.seed + i * 7 + s * 3.1 + clock * 30) * 9; ctx.lineTo(px + dx * s / 4 + nx * j, py + dy * s / 4 + ny * j); }
      ctx.lineTo(x, y);
    }
    ctx.globalAlpha = a * 0.75; ctx.strokeStyle = z.lv >= 3 ? L.LV_COLORS[z.lv - 1] : "#ffe45c"; ctx.lineWidth = z.size * 1.6 + 2; ctx.stroke();
    ctx.globalAlpha = a; ctx.strokeStyle = "#ffffff"; ctx.lineWidth = Math.max(1.5, z.size * 0.5); ctx.stroke();
  }
  ctx.globalAlpha = 1;
  // 바람
  for (const g of fx.gusts) {
    const kk = g.t / 0.4, x = g.x0 + (g.x1 - g.x0) * Math.min(1, kk * 1.5), y = g.y0 + (g.y1 - g.y0) * Math.min(1, kk * 1.5), sz = g.size * 1.8;
    ctx.globalAlpha = 1 - kk; ctx.save(); ctx.translate(x, y); ctx.rotate(-clock * 10); ctx.drawImage(SWIRL[g.lv - 1], -sz / 2, -sz / 2, sz, sz); ctx.restore();
  }
  ctx.globalAlpha = 1;
  // ── 4) 화면 변환: 방울·케이크·커지는 탑·반짝 가루·효과 그림·마법사·부엉이·숫자 ──
  setScr();
  for (const h of fx.homes) {
    const hx = SX(h.x, h.y), hy = SY(h.x, h.y), hf = ROT ? 1 : h.face;
    const t = h.t - h.delay; if (t < 0) { drawMon(h.kind, hx, hy, L.MONSTERS[h.kind].w * VS, hf > 0, true, 0.8); continue; }
    const W = L.MONSTERS[h.kind].w * VS, rise = t * t * 60 + t * 50, x = hx + Math.sin(t * 5) * 8 + h.vx * t, y = hy - rise, a = t < 1.4 ? 1 : Math.max(0, 1 - (t - 1.4) / 0.4);
    if (y < -SCR_H()) continue;
    const bs = W * 1.35 * Math.min(1, 0.5 + t * 2.5);
    ctx.globalAlpha = a;
    // 방울을 먼저, 괴물을 위에(방울 그림이 진해도 괴물이 보이게), 반짝 테두리를 한 번 더
    if (ART.bubble) { const bh = bs * aspect("bubble"); ctx.drawImage(ART.bubble, x - bs / 2, y - bh / 2 - 4, bs, bh); } else ctx.drawImage(BUBBLE, x - bs / 2, y - bs / 2 - 4, bs, bs);
    drawMon(h.kind, x, y, W * 0.7, hf > 0, false, a);
    ctx.globalAlpha = a * 0.5; ctx.strokeStyle = "#ffffff"; ctx.lineWidth = 2.5; ctx.beginPath(); ctx.arc(x, y - 4, bs * 0.46, 0, TAU); ctx.stroke(); ctx.globalAlpha = a;
  }
  ctx.globalAlpha = 1;
  // 케이크를 들고 가는 괴물
  for (const s of fx.steals) { const kk = s.t / 1.4, x = SX(s.x, s.y) + kk * 30, y = SY(s.x, s.y) - kk * 10; ctx.globalAlpha = 1 - kk; drawMon(s.kind, x, y, L.MONSTERS[s.kind].w * 0.8 * VS, true, false); cakeIconCtx(x, y - 34 * VS - kk * 20, 28 * VS); }
  ctx.globalAlpha = 1;
  // 탑이 커지는 순간
  for (const g of fx.grow) {
    const kk = g.t / 1.2, R = (30 + kk * 90) * VS, gx = SX(g.x, g.y), gy = SY(g.x, g.y) - 40 * VS;
    ctx.globalAlpha = (1 - kk); ctx.drawImage(LV_GLOW[g.lv - 1], gx - R, gy - 10 - R, R * 2, R * 2);
    ctx.strokeStyle = L.LV_COLORS[g.lv - 1]; ctx.lineWidth = 8 * (1 - kk) + 2; ctx.beginPath(); ctx.arc(gx, gy, R * 0.8, 0, TAU); ctx.stroke();
    for (let i = 0; i < 8; i++) { const a = i * TAU / 8 + kk * 2, rr = (20 + kk * 80) * VS; ctx.drawImage(STAR_LIST[i % 4], gx + Math.cos(a) * rr - 10, gy + Math.sin(a) * rr - 10, 20, 20); }
  }
  ctx.globalAlpha = 1;
  // 반짝 가루
  for (const s of fx.sparks) { const kk = s.t / 0.5, px = SX(s.x, s.y), py = SY(s.x, s.y); ctx.globalAlpha = 1 - kk; for (let i = 0; i < 6; i++) { const a = i * TAU / 6 + kk, r = 6 + kk * 34, sz = s.hit ? 22 : 14; ctx.drawImage(s.hit ? STAR.gold : STAR.blue, px + Math.cos(a) * r - sz / 2, py + Math.sin(a) * r - sz / 2, sz, sz); } }
  ctx.globalAlpha = 1;
  for (const f of fxList) if (!f.screen) drawFxItem(f);
  drawWizard();
  drawOwl();
  // 떠오르는 숫자(수정·케이크)
  ctx.textAlign = "left"; ctx.textBaseline = "middle"; ctx.lineJoin = "round";
  for (const n of fx.nums) {
    const dur = n.small ? 0.8 : 1.6, kk = n.t / dur, nx = SX(n.x, n.y), y = SY(n.x, n.y) - (n.small ? 26 : 50) * Math.min(1, kk * 1.6), a = kk < 0.7 ? 1 : (1 - kk) / 0.3, s = (n.small ? 16 : 30 * (kk < 0.15 ? 0.6 + kk * 2.7 : 1)) * (VS > 1.3 ? 1.15 : 1);
    ctx.globalAlpha = Math.max(0, a);
    if (n.icon === "cake") cakeIconCtx(nx - s * 0.5, y, s * 1.2); else gemIconCtx(nx - s * 0.5, y, s * 1.1);
    ctx.font = "900 " + Math.round(s) + "px " + FONT; ctx.lineWidth = n.small ? 3 : 6; ctx.strokeStyle = "rgba(40,20,80,.9)"; ctx.strokeText(n.text, nx + s * 0.2, y + 1);
    ctx.fillStyle = n.icon === "cake" ? "#ffb3cf" : "#e3c8ff"; ctx.fillText(n.text, nx + s * 0.2, y + 1);
  }
  ctx.globalAlpha = 1;
  // 화면 전체(대마법·번쩍임·글자)
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  if (fx.storm) drawStorm(fx.storm);
  for (const f of fxList) if (f.screen) drawFxItem(f);
  if (flash > 0) { ctx.fillStyle = "rgba(" + flashCol + "," + Math.min(0.5, flash * 1.6).toFixed(2) + ")"; ctx.fillRect(0, 0, canvas.width, canvas.height); }
  if (bannerT > 0 && mode !== "over") {
    const by = mode === "cards" || mode === "quiz" ? vh * 0.86 : (portrait ? vh * 0.3 : mapY + L.MAP_H * mapS * 0.16);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    const size = bannerBig ? Math.min(30, Math.max(16, Math.floor(vw * 0.9 / Math.max(1, banner.length) * 1.05))) : Math.min(21, Math.max(14, Math.floor(vw * 0.9 / Math.max(1, banner.length) * 1.05)));
    ctx.globalAlpha = Math.min(1, bannerT * 2); ctx.font = (bannerBig ? "900 " : "800 ") + size + "px " + FONT; ctx.textAlign = "center"; ctx.textBaseline = "middle";
    ctx.lineWidth = 6; ctx.lineJoin = "round"; ctx.strokeStyle = "rgba(30,14,70,.9)"; ctx.strokeText(banner, vw / 2, by);
    ctx.fillStyle = bannerBig ? "#ffe27a" : "#ffffff"; ctx.fillText(banner, vw / 2, by); ctx.globalAlpha = 1;
  }
}
function cakeIconCtx(x, y, s) { cakeIcon(ctx, x, y, s); }
function gemIconCtx(x, y, s) { gemIcon(ctx, x, y, s); }
// 괴물이 화면에서 가는 쪽(세로면 월드와 축이 달라서 화면 x 변화로 정한다)
const faceMem = new Map();
function screenFace(e, sx) {
  if (!ROT) return e.face;
  const m = faceMem.get(e.id);
  if (!m) { if (faceMem.size > 300) faceMem.clear(); faceMem.set(e.id, { x: sx, f: -1 }); return -1; }
  if (Math.abs(sx - m.x) > 0.4) { m.f = sx > m.x ? 1 : -1; m.x = sx; }
  return m.f;
}
// HUD_SAFE(화면 CSS px)보다 위에 보석 칸이 오면 HUD 칩에 가리니 탑 아래쪽에 그린다(resize 에서 폰 52 / 그 밖 64)
function drawTower(t, x, y) {
  const lv = t.lv, sp = towerSprite(t.kind, lv, t.branch, mapS * dpr, false);
  // 단계 색 후광(3단계부터, 미리 그린 그림)
  if (lv >= 3) { const R = (34 + lv * 8 + Math.sin(clock * 3 + t.id) * 4) * VS; ctx.globalAlpha = 0.55; ctx.drawImage(LV_GLOW[lv - 1], x - R, y - 30 * VS - R, R * 2, R * 2); ctx.globalAlpha = 1; }
  if (world && E.hasteOn(world)) { ctx.globalAlpha = 0.3 + Math.sin(clock * 10) * 0.15; ctx.drawImage(GLOW.gold, x - 40 * VS, y - 60 * VS, 80 * VS, 80 * VS); ctx.globalAlpha = 1; }
  const g = t.grow > 0 ? 1 + Math.sin(t.grow * Math.PI) * 0.35 : 1;
  if (g !== 1) { ctx.save(); ctx.translate(x, y); ctx.scale(g, g); ctx.drawImage(sp.c, sp.ox, sp.oy, sp.w, sp.h); ctx.restore(); }
  else ctx.drawImage(sp.c, x + sp.ox, y + sp.oy, sp.w, sp.h);
  // 보석 칸 ●●●○○: 탑 위. HUD 칩에 가리는 자리면 받침 아래로
  let gy = y + sp.gemY;
  if (mapY + gy * mapS < HUD_SAFE) gy = y + 26 * VS;
  ctx.save(); ctx.translate(x, gy); ctx.scale(VS, VS); gemRow(ctx, lv, 0); ctx.restore();
  if (t.flash > 0) { ctx.globalAlpha = Math.min(0.8, t.flash); ctx.drawImage(GLOW.white, x - 46 * VS, y - 90 * VS, 92 * VS, 92 * VS); ctx.globalAlpha = 1; }
}
function drawMonster(e, ex, ey, face) {
  const M = L.MONSTERS[e.kind], hidden = e.hidden && e.revealT <= 0, bob = M.fly ? Math.sin(e.t * 8) * 4 : Math.abs(Math.sin(e.t * 6)) * -3;
  const y = M.fly ? ey + bob - 18 : ey + M.r * 0.7 + bob, foot = !M.fly;
  if (!M.fly) { ctx.fillStyle = "rgba(30,20,40,.2)"; ctx.beginPath(); ctx.ellipse(ex, ey + M.r * 0.6, M.r * VS, M.r * 0.35 * VS, 0, 0, TAU); ctx.fill(); }
  const alpha = hidden ? 0.16 : e.kind === "ghost" ? 0.85 : 1;
  const MW = M.w * VS;
  drawMon(e.kind, ex, y, MW, face > 0, false, alpha, foot);
  if (e.fl > 0 && !hidden) drawMon(e.kind, ex, y, MW, face > 0, true, 0.55, foot);
  const cy = foot ? y - MW * aspectOf(e.kind) * 0.5 : y;
  if (e.freezeT > 0) { ctx.globalAlpha = 0.5; ctx.fillStyle = "#cfefff"; ctx.fillRect(ex - MW * 0.45, cy - MW * 0.45, MW * 0.9, MW * 0.9); ctx.globalAlpha = 1; }
  else if (e.slowT > 0) { ctx.fillStyle = "#8fe0ff"; for (let i = 0; i < 3; i++) { const a = clock * 4 + i * 2.1; ctx.beginPath(); ctx.arc(ex + Math.cos(a) * M.r * VS, ey + 4 + Math.sin(a) * M.r * 0.3, 3, 0, TAU); ctx.fill(); } }
  if (e.hp < e.max && !hidden) {
    const bw = e.kind === "boss" ? 90 * VS : Math.max(26, MW * 0.6), by = cy - MW * aspectOf(e.kind) * 0.5 - 10;
    ctx.fillStyle = "rgba(30,20,60,.6)"; ctx.fillRect(ex - bw / 2, by, bw, e.kind === "boss" ? 9 : 5);
    ctx.fillStyle = e.kind === "boss" ? "#ff8fd0" : "#b0f0a0"; ctx.fillRect(ex - bw / 2, by, bw * Math.max(0, e.hp / e.max), e.kind === "boss" ? 9 : 5);
  }
}function drawWizard() {
  const c = world.map.castle, art = L.PILOTS[world.kid].art, up = wandT > 0 ? Math.min(1, wandT) : 0;
  const x = SX(c.x, c.y), y = SY(c.x, c.y) - 62 - up * 14 + Math.sin(clock * 2) * 1.5;
  if (up > 0) { const R = 50 + Math.sin(clock * 12) * 6; ctx.globalAlpha = up; ctx.drawImage(GLOW.purple, x - R, y - R, R * 2, R * 2); ctx.globalAlpha = 1; }
  // 지팡이(대마법 때 높이 든다)
  ctx.strokeStyle = "#7a5638"; ctx.lineWidth = 4; ctx.lineCap = "round";
  const wa = -0.5 - up * 0.9, wx = x + 12, wy = y;
  ctx.beginPath(); ctx.moveTo(wx, wy); ctx.lineTo(wx + Math.cos(wa) * 34, wy + Math.sin(wa) * 34); ctx.stroke();
  ctx.drawImage(up > 0 ? STAR.gold : STAR.pink, wx + Math.cos(wa) * 34 - 11, wy + Math.sin(wa) * 34 - 11, 22, 22);
  if (ART[art]) { const w = 44 * VS, h = w * aspect(art); ctx.drawImage(ART[art], x - w / 2, y - h / 2, w, h); }
  else {
    ctx.fillStyle = PILOT_COLOR[world.kid]; ctx.beginPath(); ctx.ellipse(x, y + 8, 14, 16, 0, 0, TAU); ctx.fill();
    ctx.fillStyle = "#ffe0c2"; ctx.beginPath(); ctx.arc(x, y - 6, 10, 0, TAU); ctx.fill();
    ctx.fillStyle = PILOT_COLOR[world.kid]; ctx.beginPath(); ctx.moveTo(x - 14, y - 10); ctx.lineTo(x + 14, y - 10); ctx.lineTo(x + 2, y - 36); ctx.closePath(); ctx.fill();
    ctx.fillStyle = "#2a1c50"; ctx.beginPath(); ctx.arc(x - 3, y - 6, 1.8, 0, TAU); ctx.arc(x + 4, y - 6, 1.8, 0, TAU); ctx.fill();
  }
}
function drawOwl() {
  const o = world.owl; if (!o) return;
  const wp = E.owlPos(o), p = { x: SX(wp.x, wp.y), y: SY(wp.x, wp.y) }, flap = Math.sin(clock * 9), s = Math.max(66 * VS, 76 / mapS);   // 화면에서 최소 76px(누르는 대상)
  const fade = o.life - o.t < 1.5 ? (o.life - o.t) / 1.5 : 1;
  ctx.globalAlpha = fade;
  const R = s * (1.1 + Math.sin(clock * 5) * 0.1);
  ctx.drawImage(GLOW.owl, p.x - R, p.y - R, R * 2, R * 2);
  if (ART.owl) { const h = s * aspect("owl"); ctx.save(); ctx.translate(p.x, p.y); if (o.dir < 0 && !ROT) ctx.scale(-1, 1); ctx.scale(1, 1 + flap * 0.06); ctx.drawImage(ART.owl, -s / 2, -h / 2, s, h); ctx.restore(); }
  else {
    ctx.fillStyle = "#a07850"; ctx.beginPath(); ctx.ellipse(p.x, p.y, 20, 24, 0, 0, TAU); ctx.fill();
    ctx.beginPath(); ctx.moveTo(p.x - 16, p.y - 4); ctx.lineTo(p.x - 44, p.y - 10 - flap * 14); ctx.lineTo(p.x - 18, p.y + 12); ctx.closePath(); ctx.fill();
    ctx.beginPath(); ctx.moveTo(p.x + 16, p.y - 4); ctx.lineTo(p.x + 44, p.y - 10 - flap * 14); ctx.lineTo(p.x + 18, p.y + 12); ctx.closePath(); ctx.fill();
    ctx.fillStyle = "#fff"; ctx.beginPath(); ctx.arc(p.x - 8, p.y - 8, 7, 0, TAU); ctx.arc(p.x + 8, p.y - 8, 7, 0, TAU); ctx.fill();
    ctx.fillStyle = "#2a1c50"; ctx.beginPath(); ctx.arc(p.x - 8, p.y - 8, 3, 0, TAU); ctx.arc(p.x + 8, p.y - 8, 3, 0, TAU); ctx.fill();
    ctx.fillStyle = "#fff6e0"; ctx.fillRect(p.x - 12, p.y + 8, 24, 16);
  }
  // 큰 ? 표시
  ctx.fillStyle = "#ffe27a"; ctx.beginPath(); ctx.arc(p.x + 30, p.y - 30, 15, 0, TAU); ctx.fill(); ctx.strokeStyle = "#7a4ad0"; ctx.lineWidth = 3; ctx.stroke();
  ctx.fillStyle = "#5a2fb0"; ctx.font = "900 22px " + FONT; ctx.textAlign = "center"; ctx.textBaseline = "middle"; ctx.fillText("?", p.x + 30, p.y - 29);
  // 남은 시간 고리
  ctx.strokeStyle = "rgba(255,255,255,.7)"; ctx.lineWidth = 3; ctx.beginPath(); ctx.arc(p.x, p.y, 46, -Math.PI / 2, -Math.PI / 2 + TAU * (1 - o.t / o.life)); ctx.stroke();
  ctx.globalAlpha = 1;
}
// 대마법: 성에서 퍼지는 큰 고리 + 화면 가득 별이 소용돌이 + 보랏빛
function drawStorm(st) {
  const kk = st.t / st.T, k = mapS * dpr, cx = mapX * dpr + SX(st.x, st.y) * k, cy = mapY * dpr + SY(st.x, st.y) * k;
  const W = canvas.width, H = canvas.height, a = kk < 0.15 ? kk / 0.15 : 1 - (kk - 0.15) / 0.85;
  ctx.globalAlpha = Math.max(0, a) * (st.big ? 0.32 : 0.16); ctx.fillStyle = st.big ? "#7a4ad0" : "#a0d8ff"; ctx.fillRect(0, 0, W, H);
  const R = Math.hypot(W, H) * kk * 1.1;
  ctx.globalAlpha = Math.max(0, 1 - kk); ctx.strokeStyle = st.big ? "#ffe27a" : "#ffffff"; ctx.lineWidth = (st.big ? 40 : 18) * (1 - kk) + 2; ctx.beginPath(); ctx.arc(cx, cy, R, 0, TAU); ctx.stroke();
  if (st.big) { ctx.strokeStyle = "#ff9ee0"; ctx.lineWidth = 16 * (1 - kk) + 1; ctx.beginPath(); ctx.arc(cx, cy, R * 0.75, 0, TAU); ctx.stroke(); }
  const n = st.big ? 46 : 18, base = Math.min(W, H);
  ctx.globalAlpha = Math.max(0, a);
  for (let i = 0; i < n; i++) {
    const ang = i * 2.399 + st.t * (2 + (i % 3)), rr = base * (0.12 + ((i * 37) % 100) / 100 * 0.62) * (0.4 + kk * 0.8);
    const x = W / 2 + Math.cos(ang) * rr * 1.3, y = H / 2 + Math.sin(ang) * rr, sz = (14 + (i % 4) * 8) * dpr * (st.big ? 1.2 : 0.8);
    ctx.drawImage(STAR_LIST[i % 4], x - sz / 2, y - sz / 2, sz, sz);
  }
  ctx.globalAlpha = 1;
}

let last = performance.now(), lastUpdateMs = 0, lastRenderMs = 0, frozen = false;   // frozen: 검증 스크린샷용(?qa=1)
// 화면 꾸밈 시계. 게임 시간과 따로 간다.
function ui(dt) {
  clock += dt; if (bannerT > 0) bannerT -= dt; if (flash > 0) flash -= dt; if (wandT > 0) wandT -= dt; if (shakeT > 0) shakeT -= dt;
  if (fxList.length) { for (const f of fxList) f.t += dt; fxList = fxList.filter(f => f.t < f.dur); }
  if (world && mode !== "play" && mode !== "paused" && mode !== "over") {
    E.stepFx(world, dt);
    for (const t of world.towers) { if (t.grow > 0) t.grow -= dt * 1.6; if (t.flash > 0) t.flash -= dt; }
  }
  if (mode === "resume") { resumeT -= dt; if (resumeT <= 0) { E.resumeAfter(world); mode = "play"; last = performance.now(); } }
}
function frame(now) {
  const dt = frozen ? 0 : Math.min(0.05, Math.max(0, (now - last) / 1000)); last = now;
  ui(dt);
  const t0 = performance.now();
  if (mode === "play" && world && !document.hidden && !frozen) update(dt);
  const t1 = performance.now();
  render();
  lastUpdateMs = t1 - t0; lastRenderMs = performance.now() - t1;
  requestAnimationFrame(frame);
}

/* ---------- 시작 화면 ---------- */
const pilotBox = $("pilots"), mapBox = $("maps");
function pickPilot(i) {
  if (!(i >= 0 && i < L.PILOTS.length)) return;
  pilot = i; try { localStorage.setItem(L.WIZ_KEY, String(i)); } catch (_) {}
  if (GameQuiz) GameQuiz.setKid(L.PILOTS[i].kid);
  [...pilotBox.children].forEach((c, k) => c.setAttribute("aria-pressed", String(k === i)));
  paintBest();
}
L.PILOTS.forEach((p, i) => {
  const b = document.createElement("button"); b.type = "button"; b.className = "pilot"; b.setAttribute("aria-pressed", String(i === pilot));
  const img = document.createElement("img"); img.className = "face"; img.alt = ""; img.draggable = false; img.src = "art/" + p.art + ".webp?v=1";
  img.onerror = () => { const hat = document.createElement("i"); hat.className = "hat"; hat.style.background = p.color; img.replaceWith(hat); };
  const name = document.createElement("span"); name.textContent = p.name;
  b.append(img, name);
  b.addEventListener("click", () => { pickPilot(i); sfx.tap(); });
  pilotBox.appendChild(b);
});
function paintMaps() {
  mapBox.innerHTML = "";
  const open = L.openMaps(save.wins);
  for (const m of L.MAPS) {
    if (!open.includes(m.id)) continue;
    const st = save.maps[m.id].stars;
    const b = document.createElement("button"); b.type = "button"; b.className = "zone"; b.setAttribute("aria-pressed", String(m.id === mapId));
    b.innerHTML = m.name + "<small>" + "★".repeat(st) + "☆".repeat(3 - st) + "</small>";
    b.addEventListener("click", () => { mapId = m.id; save.map = m.id; writeSave(); paintMaps(); sfx.tap(); bgKey = ""; });
    mapBox.appendChild(b);
  }
  const next = L.MAPS.find(m => !open.includes(m.id));
  if (next) { const s = document.createElement("span"); s.className = "small"; s.style.alignSelf = "center"; s.textContent = "다음 맵 ‘" + next.name + "’: 성공 " + (next.need - save.wins) + "번 더"; mapBox.appendChild(s); }
}
function paintBest() {
  const b = save.best[L.PILOTS[pilot].kid];
  $("bestLine").textContent = b && b.runs ? L.PILOTS[pilot].name + " 기록 · 가장 멀리 막은 파도 " + b.wave + " · 한 판에 맞힌 문제 " + b.solved + "개" : "";
}
function paintStart() {
  if (!L.openMaps(save.wins).includes(mapId)) mapId = "field";
  paintMaps(); paintBest();
  const open = L.BADGES.filter(g => save.solved >= g.need), next = L.BADGES.find(g => save.solved < g.need);
  $("badgeLine").textContent = (open.length ? "마법 배지: " + open.map(g => g.name).join(" · ") : "") + (next ? (open.length ? " / " : "") + "문제 " + (next.need - save.solved) + "개 더 맞히면 ‘" + next.name + "’" : "");
}
function paintDex() {
  const g1 = $("dexMon"); g1.innerHTML = "";
  for (const k of L.MONSTER_IDS) {
    const n = save.monsters[k] || 0, box = document.createElement("div");
    box.className = "friend" + (n ? "" : " locked");
    const c = document.createElement("canvas"); c.width = c.height = 96; const x = c.getContext("2d");
    if (n) { const src = monSprite(k); const h = 80 * src.height / src.width; x.drawImage(src, 8, 48 - h / 2, 80, h); }
    else { x.fillStyle = "rgba(255,255,255,.3)"; x.font = "900 48px " + FONT; x.textAlign = "center"; x.textBaseline = "middle"; x.fillText("?", 48, 50); }
    const name = document.createElement("div"); name.textContent = n ? L.MONSTERS[k].name : "???";
    const cnt = document.createElement("span"); cnt.textContent = n ? n + "마리 돌려보냄" : "아직 못 만났어요";
    box.append(c, name, cnt); g1.appendChild(box);
  }
  const g2 = $("dexTow"); g2.innerHTML = "";
  for (const k of L.TOWER_IDS) {
    const T = L.TOWERS[k], used = save.towers[k] || 0, box = document.createElement("div");
    box.className = "friend" + (used ? "" : " locked");
    const ic = iconFor({ kind: k, lv: 1 }, 96, 112);
    const name = document.createElement("div"); name.textContent = T.name;
    const br = document.createElement("span");
    br.textContent = ["a", "b"].map(b => save.branches[k + ":" + b] ? T.branches[b].name : "???").join(" · ");
    box.append(ic, name, br); g2.appendChild(box);
  }
  $("dexNote").textContent = "가족이 함께 맞힌 문제 " + save.solved + "개 · 성공 " + save.wins + "번";
}
$("dexBtn").addEventListener("click", () => { paintDex(); $("start").hidden = true; $("dex").hidden = false; });
$("dexClose").addEventListener("click", () => { $("dex").hidden = true; $("start").hidden = false; });
$("startBtn").addEventListener("click", () => begin());
$("againBtn").addEventListener("click", () => begin());
$("menuBtn").addEventListener("click", toMenu);
$("pauseBtn").addEventListener("click", () => { if (mode === "play") pause(); else if (mode === "paused") unpause(); });
$("resumeBtn").addEventListener("click", unpause);
$("quitBtn").addEventListener("click", toMenu);
$("goBtn").addEventListener("click", () => { if (world && mode === "play") { E.startWaveNow(world); sfx.tap(); } });
const fastBtn = $("fastBtn");
function paintFast() { fastBtn.setAttribute("aria-pressed", String(speed === 2)); fastBtn.textContent = speed === 2 ? "×2" : "▶▶"; }
fastBtn.addEventListener("click", () => { speed = speed === 2 ? 1 : 2; paintFast(); sfx.tap(); });
const soundBtn = $("sound");
function paintSound() { soundBtn.setAttribute("aria-pressed", String(soundOn)); soundBtn.textContent = soundOn ? "♪" : "♪×"; }
soundBtn.addEventListener("click", () => { soundOn = !soundOn; try { localStorage.setItem(L.SOUND_KEY, soundOn ? "1" : "0"); } catch (_) {} paintSound(); });
paintSound();
paintStart();
addEventListener("resize", resize);
addEventListener("orientationchange", () => setTimeout(resize, 150));
if (window.visualViewport) visualViewport.addEventListener("resize", resize);
resize();

/* ---------- 검증 훅(?qa=1 일 때만) ---------- */
if (QA) {
  const tapMapPx = (x, y) => { const p = toScreen(x, y); return { clientX: p.x, clientY: p.y }; };
  window.__towers = {
    begin, toMenu, pause, unpause, tapAt: (x, y) => (world && mode === "play" ? tapAt(x, y) : null), tapMapPx,
    // 화면 CSS px 를 누른 것처럼(역변환 확인용)
    tapClient: (cx, cy) => { if (!world || mode !== "play") return null; const p = toMap(cx, cy); return tapAt(p.x, p.y); },
    padScreen: i => (world ? toScreen(world.pads[i].x, world.pads[i].y) : null), focusPad: () => focusPad,
    tick: (dt = 1 / 60, n = 1) => { for (let i = 0; i < n && mode === "play"; i++) update(dt); },
    step: (dt = 1 / 60, n = 1) => { for (let i = 0; i < n; i++) { ui(dt); if (mode === "play") update(dt); render(); } },
    get s() { return world ? { mode, t: +world.t.toFixed(2), wave: world.wave, phase: world.phase, cake: world.cake, gems: world.gems, monsters: world.monsters.length, shots: world.shots.length, towers: world.towers.map(t => t.kind + t.lv + (t.branch || "") + "@" + t.pad), owl: !!world.owl, sent: world.sent, solved: world.solved, streak: world.streak, blasts: world.blasts, cards: world.cards, pending: world.pending, over: world.over, rescueUsed: world.rescueUsed, pilot, map: mapId, speed, haste: E.hasteOn(world) } : { mode, pilot, map: mapId }; },
    get save() { return save; },
    world: () => world, E, L,
    build: (pad, kind) => { const t = world && E.build(world, pad, kind); hudKey = ""; hud(); return !!t; },
    setLevel: (pad, lv, branch = "a") => { const t = world && E.towerOf(world, pad); if (!t) return false; t.lv = lv; t.branch = lv >= 3 ? branch : null; return true; },
    owlHere: () => { if (world) { world.owl = { x: 0, y: L.OWL_Y, dir: 1, t: L.OWL_LIFE * 0.45, life: L.OWL_LIFE }; } return world && E.owlPos(world.owl); },
    spawn: (kind, n = 1, path = null) => { for (let i = 0; i < n; i++) { const e = E.spawnMonster(world, kind, path); if (e) { e.s = Math.random() * e.path.len * 0.8; } } },
    gems: n => { if (world) { world.gems = n; hudKey = ""; hud(); } },
    cake: n => { if (world) { world.cake = n; hudKey = ""; hud(); } },
    setWave: n => { if (world) { world.wave = n; world.phase = "prep"; world.prepT = 0.01; } },
    win: () => { if (world) { world.wave = L.WAVES; world.phase = "wave"; world.queue = []; world.monsters = []; } },
    setPilot: pickPilot, cards: () => cardsShown, quiz: () => (GameQuiz ? GameQuiz.peek() : null),
    answer: () => { const q = GameQuiz && GameQuiz.peek(); return q && q.kind === "ask" ? q.answer : null; },
    guard: () => { if (guard) return { panel: guard.panel.id, armIn: Math.round(guard.armAt - performance.now()) }; const q = GameQuiz && GameQuiz.peek(); return q ? { panel: "quiz", armIn: q.armIn } : null; },
    pick: i => { if (!guard) return false; const b = guard.buttons[i]; if (!b || b.disabled) return false; guard.onPick(b, i); return true; },
    noQuiz: () => { GameQuiz = null; },
    openCards: (firstTry = true) => { if (world && mode === "play") openCards({ firstTry }); return cardsShown; },
    freeze: (on = true) => { frozen = on; },
    blast: (firstTry = true) => (world ? rewardBlast(firstTry) : null),
    timing: () => ({ update: lastUpdateMs, render: lastRenderMs }),
    bench: (n = 60) => { const t0 = performance.now(); let up = 0, rd = 0, mx = 0; for (let i = 0; i < n; i++) { const a = performance.now(); if (mode === "play") update(1 / 60); const b = performance.now(); render(); const c = performance.now(); up += b - a; rd += c - b; mx = Math.max(mx, c - a); } return { frames: n, updateMs: +(up / n).toFixed(2), renderMs: +(rd / n).toFixed(2), totalMs: +((performance.now() - t0) / n).toFixed(2), maxMs: +mx.toFixed(2) }; },
    fxCount: () => fxList.length, fxLoaded: () => Object.keys(FX), fxList: () => fxList.map(f => f.name + ":" + Math.round(f.size)),
    snap: (scale = 1) => { const c = document.createElement("canvas"); c.width = Math.round(canvas.width * scale); c.height = Math.round(canvas.height * scale); c.getContext("2d").drawImage(canvas, 0, 0, c.width, c.height); return c.toDataURL("image/jpeg", 0.85); },
    art: () => Object.keys(ART), view: () => ({ vw, vh, mapS, mapX, mapY, dpr, portrait }),
  };
}
requestAnimationFrame(frame);
