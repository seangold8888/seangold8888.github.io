// 스카이 샷 효과 엔진 — 화려한 폭발·빛·충격파·화면 흔들림·잠깐 멈춤·느린 화면·조종사 필살기.
// 규칙: 효과만 그린다(맞는 판정·피해·적 움직임은 main.js). 필살기가 적을 터뜨릴 때도 main 의 콜백을 부른다(규칙은 main 의 ULT_RULES).
// 빠르게: 모든 입자는 미리 만든 칸(풀)을 돌려 쓴다(매 프레임 새 객체 없음). 빛 번짐·캡슐 탄·불꽃·십자 빛은 미리 그린 그림을 붙인다(shadowBlur·filter 없음).
//   상한(CAPS): 입자 260 · 시트 30 · 고리 28 · 속도선 26 · 바람선 11. 필살기 중에는 보통 타격 불꽃을 막는다.
//   프레임이 오래(>20ms) 무거우면 품질을 낮춘다(입자 0.8 → 0.55배, 꼬리·앞 구름 끔, 마지막엔 main 이 화면 해상도를 1배로).
// 아이 눈 보호: 화면 전체 번쩍임은 0.34초에 한 번까지·최대 불투명도 0.42, '움직임 줄이기' 설정이면 흔들림·번쩍임·바람선을 크게 줄인다.
// 글자: 칭찬·여럿 터뜨림 문구는 콤보 아래 한 칸(callout)에만, 더 높은 문구가 이전 것을 바꿔 쓴다. 적·대장 위에는 글자를 띄우지 않는다.

const TAU = Math.PI * 2;
const rnd = (a, b) => a + Math.random() * (b - a);
const easeOut = k => 1 - (1 - k) * (1 - k) * (1 - k);
const easeBack = k => { const c = 1.9; return 1 + (c + 1) * Math.pow(k - 1, 3) + c * Math.pow(k - 1, 2); };
let REDUCED = false;
try { const mq = matchMedia("(prefers-reduced-motion: reduce)"); REDUCED = mq.matches; mq.addEventListener && mq.addEventListener("change", e => { REDUCED = e.matches; }); } catch (_) {}

export const CAPS = { particles: 220, sheets: 30, rings: 24, lines: 26, wind: 11 };
let ctx = null, FW = 360, FH = 640;
export function init(c) { ctx = c; }
export function setField(w, h) { FW = w; FH = h; }

/* ---------- 미리 그린 그림 ---------- */
function cv(w, h, draw) { const c = document.createElement("canvas"); c.width = w; c.height = h; draw(c.getContext("2d"), w, h); return c; }
function hexA(hex, a) {
  if (hex[0] !== "#") return hex;
  const n = parseInt(hex.length === 4 ? hex.slice(1).split("").map(c => c + c).join("") : hex.slice(1, 7), 16);
  return "rgba(" + (n >> 16 & 255) + "," + (n >> 8 & 255) + "," + (n & 255) + "," + a + ")";
}
const glowCache = {};
// 둥근 빛: 가운데 하양 → 색 → 투명
export function glow(color) {
  let g = glowCache[color]; if (g) return g;
  g = glowCache[color] = cv(64, 64, (x) => {
    const r = x.createRadialGradient(32, 32, 0, 32, 32, 32);
    r.addColorStop(0, "rgba(255,255,255,1)"); r.addColorStop(0.22, color); r.addColorStop(0.5, hexA(color, 0.45)); r.addColorStop(1, hexA(color, 0));
    x.fillStyle = r; x.fillRect(0, 0, 64, 64);
  });
  return g;
}
const tailCache = {};
// 끝이 가늘어지는 리본 꼬리(위 = 탄 쪽, 아래로 사라짐). 똑바로 나는 탄은 6마디 리본과 같은 모양이다.
export function tail(color) {
  let t = tailCache[color]; if (t) return t;
  t = tailCache[color] = cv(16, 80, (x) => {
    const g = x.createLinearGradient(0, 0, 0, 80);
    g.addColorStop(0, hexA(color, 0.75)); g.addColorStop(0.45, hexA(color, 0.35)); g.addColorStop(1, hexA(color, 0));
    x.fillStyle = g; x.beginPath(); x.moveTo(1, 0); x.lineTo(15, 0); x.lineTo(9, 80); x.lineTo(7, 80); x.closePath(); x.fill();
    const w = x.createLinearGradient(0, 0, 0, 40); w.addColorStop(0, "rgba(255,255,255,.95)"); w.addColorStop(1, "rgba(255,255,255,0)");
    x.fillStyle = w; x.fillRect(6.5, 0, 3, 40);
  });
  return t;
}
const capCache = {};
// 캡슐 탄: 바깥 번짐(색, 0.45) → 몸통(색, 0.9) → 흰 심. 위를 보는 모양 32x56.
export function capsule(color) {
  let c = capCache[color]; if (c) return c;
  c = capCache[color] = cv(32, 56, (x) => {
    const rr = (cx, cy, w, h) => { x.beginPath(); x.moveTo(cx - w / 2, cy - h / 2 + w / 2); x.arc(cx, cy - h / 2 + w / 2, w / 2, Math.PI, 0); x.lineTo(cx + w / 2, cy + h / 2 - w / 2); x.arc(cx, cy + h / 2 - w / 2, w / 2, 0, Math.PI); x.closePath(); x.fill(); };
    x.fillStyle = hexA(color, 0.42); rr(16, 28, 26, 52);
    x.fillStyle = hexA(color, 0.92); rr(16, 26, 15, 36);
    x.fillStyle = "#ffffff"; rr(16, 23, 8, 24);
  });
  return c;
}
// 탄 한 발 = 그림 한 장: 리본 꼬리 + 캡슐을 미리 합쳐 둔다(그리기 횟수를 줄인다)
const bulCache = {};
export function bullet(color, tl) {
  const key = color + tl; let b = bulCache[key]; if (b) return b;
  b = bulCache[key] = cv(32, 56 + tl, (x) => { x.globalAlpha = 0.9; x.drawImage(tail(color), 8, 36, 16, tl); x.globalAlpha = 1; x.drawImage(capsule(color), 0, 0, 32, 56); });
  return b;
}
// 별 보석 = 빛 + 별을 한 장으로
const gemCache = {};
function gemTex(color) { let g = gemCache[color]; if (g) return g; g = gemCache[color] = cv(48, 48, (x) => { x.drawImage(glow(color), 0, 0, 48, 48); x.drawImage(starTex(color), 12, 12, 24, 24); }); return g; }
const starCache = {};
function starTex(color) {
  let s = starCache[color]; if (s) return s;
  s = starCache[color] = cv(32, 32, (x) => {
    x.fillStyle = color; x.strokeStyle = "rgba(255,255,255,.95)"; x.lineWidth = 2.5; x.lineJoin = "round"; x.beginPath();
    for (let i = 0; i < 10; i++) { const a = -Math.PI / 2 + i * Math.PI / 5, r = i % 2 ? 6 : 14; x.lineTo(16 + Math.cos(a) * r, 16 + Math.sin(a) * r); }
    x.closePath(); x.stroke(); x.fill();
  });
  return s;
}
const heartPath = (x, s) => { x.beginPath(); x.moveTo(s * 0.5, s * 0.86); x.bezierCurveTo(s * 0.06, s * 0.56, s * 0.12, s * 0.12, s * 0.5, s * 0.33); x.bezierCurveTo(s * 0.88, s * 0.12, s * 0.94, s * 0.56, s * 0.5, s * 0.86); x.closePath(); };
const heartTex = cv(32, 32, (x) => { heartPath(x, 32); x.fillStyle = "#ff3f9a"; x.strokeStyle = "#fff"; x.lineWidth = 2.5; x.stroke(); x.fill(); x.fillStyle = "rgba(255,255,255,.6)"; x.beginPath(); x.arc(11, 13, 3, 0, TAU); x.fill(); });
// 필살기 '하트 그네' 가운데에 매달린 커다란 빛나는 하트
const bigHeart = cv(220, 220, (x) => {
  const g = x.createRadialGradient(110, 110, 10, 110, 110, 110); g.addColorStop(0, "rgba(255,170,215,.9)"); g.addColorStop(1, "rgba(255,80,170,0)");
  x.fillStyle = g; x.fillRect(0, 0, 220, 220);
  x.save(); x.translate(30, 30); heartPath(x, 160);
  const f = x.createLinearGradient(0, 20, 0, 150); f.addColorStop(0, "#ffd0ea"); f.addColorStop(0.5, "#ff5fb0"); f.addColorStop(1, "#d81b7e");
  x.fillStyle = f; x.lineWidth = 9; x.strokeStyle = "#ffffff"; x.stroke(); x.fill();
  x.fillStyle = "rgba(255,255,255,.7)"; x.beginPath(); x.ellipse(52, 52, 16, 24, -0.6, 0, TAU); x.fill();
  x.restore();
});
const puffCache = {};
function puffOf(color) {
  let p = puffCache[color]; if (p) return p;
  p = puffCache[color] = cv(64, 64, (x) => { const r = x.createRadialGradient(32, 30, 4, 32, 32, 30); r.addColorStop(0, hexA(color, 1)); r.addColorStop(0.6, hexA(color, 0.7)); r.addColorStop(1, hexA(color, 0)); x.fillStyle = r; x.beginPath(); x.arc(32, 32, 30, 0, TAU); x.fill(); });
  return p;
}
// 십자 빛(맞은 자리): 가늘고 긴 마름모 둘을 겹친다 + 주황 테
const flareTex = cv(64, 64, (x) => {
  const dia = (w, h) => { x.beginPath(); x.moveTo(32 - w, 32); x.lineTo(32, 32 - h); x.lineTo(32 + w, 32); x.lineTo(32, 32 + h); x.closePath(); };
  x.lineJoin = "round"; x.strokeStyle = "rgba(255,136,0,.9)"; x.lineWidth = 2; x.fillStyle = "#ffffff";
  dia(31, 4); x.stroke(); x.fill(); dia(4, 31); x.stroke(); x.fill();
  const g = x.createRadialGradient(32, 32, 0, 32, 32, 12); g.addColorStop(0, "#fff"); g.addColorStop(1, "rgba(255,240,180,0)"); x.fillStyle = g; x.fillRect(16, 16, 32, 32);
});
const diaTex = { w: cv(10, 10, (x) => { x.fillStyle = "#ffffff"; x.beginPath(); x.moveTo(5, 0); x.lineTo(10, 5); x.lineTo(5, 10); x.lineTo(0, 5); x.fill(); }), g: cv(10, 10, (x) => { x.fillStyle = "#ffd166"; x.beginPath(); x.moveTo(5, 0); x.lineTo(10, 5); x.lineTo(5, 10); x.lineTo(0, 5); x.fill(); }) };
// 빛갈래(8단계 총구 · 대장 물리침): 12줄 방사 빛
const burstTex = cv(160, 160, (x) => {
  x.translate(80, 80);
  for (let i = 0; i < 12; i++) { x.rotate(TAU / 12); const g = x.createLinearGradient(0, 0, 0, -78); g.addColorStop(0, "rgba(255,255,255,1)"); g.addColorStop(0.5, "rgba(255,226,120,.55)"); g.addColorStop(1, "rgba(255,200,80,0)"); x.fillStyle = g; x.beginPath(); x.moveTo(-(i % 2 ? 4 : 7), 0); x.lineTo(0, i % 2 ? -60 : -78); x.lineTo(i % 2 ? 4 : 7, 0); x.fill(); }
  const c = x.createRadialGradient(0, 0, 0, 0, 0, 22); c.addColorStop(0, "#fff"); c.addColorStop(1, "rgba(255,255,255,0)"); x.fillStyle = c; x.beginPath(); x.arc(0, 0, 22, 0, TAU); x.fill();
});
// 어두운 받침(밝은 폭발·빔 아래에 먼저 깐다 — 밝은 구름 위에서도 빛이 보이게)
const plateTex = cv(64, 64, (x) => { const r = x.createRadialGradient(32, 32, 0, 32, 32, 32); r.addColorStop(0, "rgba(34,8,62,.5)"); r.addColorStop(0.6, "rgba(34,8,62,.3)"); r.addColorStop(1, "rgba(34,8,62,0)"); x.fillStyle = r; x.fillRect(0, 0, 64, 64); });
export const plate = plateTex;
const stripTex = cv(32, 4, (x) => { const g = x.createLinearGradient(0, 0, 32, 0); g.addColorStop(0, "rgba(30,8,60,0)"); g.addColorStop(0.5, "rgba(30,8,60,.42)"); g.addColorStop(1, "rgba(30,8,60,0)"); x.fillStyle = g; x.fillRect(0, 0, 32, 4); });
export const darkStrip = stripTex;
// 엔진 불꽃: 아래로 뻗는 물방울 모양 세 겹(바깥 주황 · 가운데 노랑 · 흰 심)
function cone(color, a) { return cv(32, 64, (x) => { const g = x.createLinearGradient(0, 0, 0, 64); g.addColorStop(0, hexA(color, a)); g.addColorStop(0.7, hexA(color, a * 0.6)); g.addColorStop(1, hexA(color, 0)); x.fillStyle = g; x.beginPath(); x.moveTo(2, 8); x.quadraticCurveTo(2, 0, 16, 0); x.quadraticCurveTo(30, 0, 30, 8); x.quadraticCurveTo(26, 34, 16, 64); x.quadraticCurveTo(6, 34, 2, 8); x.fill(); }); }
const PLUME = [cone("#ff5500", 0.55), cone("#ffcc00", 0.9), cone("#ffffff", 1)];
const cloudTex = cv(220, 110, (x) => {
  x.fillStyle = "rgba(255,255,255,1)";
  for (const [cx, cy, r] of [[60, 70, 36], [105, 52, 46], [152, 66, 38], [185, 78, 24], [32, 82, 22], [110, 84, 34]]) { x.beginPath(); x.arc(cx, cy, r, 0, TAU); x.fill(); }
});
// 적 탄 둘레: 빨강 테 ↔ 짙은 테가 번갈아 깜빡이는 고리(어떤 아군 효과도 이 모양·색을 쓰지 않는다)
function dRing(stroke) { return cv(48, 48, (x) => { const g = x.createRadialGradient(24, 24, 9, 24, 24, 23); g.addColorStop(0, "rgba(255,0,51,0)"); g.addColorStop(0.6, "rgba(255,0,51,.32)"); g.addColorStop(1, "rgba(255,0,51,0)"); x.fillStyle = g; x.fillRect(0, 0, 48, 48); x.strokeStyle = stroke; x.lineWidth = 4; x.beginPath(); x.arc(24, 24, 14, 0, TAU); x.stroke(); }); }
const DANGER = [dRing("#ff0033"), dRing("rgba(25,10,40,.95)")];
export const dangerRing = DANGER[0];
export function drawDanger(x, y, r) { const s = r * (2.1 + Math.sin(clockR * 12) * 0.12); ctx.drawImage(DANGER[Math.floor(clockR * 6) & 1], x - s / 2, y - s / 2, s, s); }
const edgeTex = cv(64, 4, (x) => { const g = x.createLinearGradient(0, 0, 64, 0); g.addColorStop(0, "rgba(255,255,255,1)"); g.addColorStop(0.4, "rgba(255,255,255,.35)"); g.addColorStop(1, "rgba(255,255,255,0)"); x.fillStyle = g; x.fillRect(0, 0, 64, 4); });
const edgeTint = {};
function edgeOf(color) { let e = edgeTint[color]; if (e) return e; e = edgeTint[color] = cv(64, 4, (x) => { x.drawImage(edgeTex, 0, 0); x.globalCompositeOperation = "source-in"; x.fillStyle = color; x.fillRect(0, 0, 64, 4); }); return e; }
// HUD 아래 어두운 띠: 위쪽 알약 글자가 폭발 빛에 묻히지 않게
const hudFade = cv(4, 64, (x) => { const g = x.createLinearGradient(0, 0, 0, 64); g.addColorStop(0, "rgba(10,14,48,.62)"); g.addColorStop(0.65, "rgba(10,14,48,.3)"); g.addColorStop(1, "rgba(10,14,48,0)"); x.fillStyle = g; x.fillRect(0, 0, 4, 64); });

/* ---------- 효과 시트 fx_*.webp(4x2 = 8컷, 순검정 바탕) → 불러올 때 한 번만 검정을 투명으로 ---------- */
const SHEET = {}, SHEET_NAMES = ["boom", "hit", "zap", "swing", "flame", "stomp"];
function keyBlack(im) {
  try {
    const c = document.createElement("canvas"); c.width = im.width; c.height = im.height;
    const x = c.getContext("2d"); x.drawImage(im, 0, 0);
    const d = x.getImageData(0, 0, c.width, c.height), p = d.data;
    for (let i = 0; i < p.length; i += 4) {
      const a = Math.max(p[i], p[i + 1], p[i + 2]);
      if (a < 8) { p[i + 3] = 0; continue; }
      const k = 255 / a; p[i] = Math.min(255, p[i] * k); p[i + 1] = Math.min(255, p[i + 1] * k); p[i + 2] = Math.min(255, p[i + 2] * k); p[i + 3] = a;
    }
    x.putImageData(d, 0, 0);
    return c;
  } catch (_) { return null; }
}
export function loadSheets(base, v) {
  SHEET_NAMES.forEach((n, i) => {
    const im = new Image();
    im.onload = () => setTimeout(() => { const c = keyBlack(im); if (c) SHEET[n] = { c, cell: c.width / 4 }; }, 30 + i * 40);
    im.src = base + "fx_" + n + ".webp?v=" + v;
  });
}
export const sheetsReady = () => Object.keys(SHEET).length;

/* ---------- 풀 ---------- */
const P = [];
for (let i = 0; i < CAPS.particles; i++) P.push({ on: false, type: 0, x: 0, y: 0, vx: 0, vy: 0, life: 0, max: 1, size: 1, grow: 0, color: "#fff", drag: 0, grav: 0 });
let pCount = 0;
const T_GLOW = 0, T_STREAK = 1, T_PUFF = 2, T_STAR = 3, T_GEM = 4, T_HEART = 5, T_DIA = 6, T_FLARE = 7, T_IN = 8;
let freeHint = 0;
function part(type, x, y, vx, vy, life, size, color) {
  if (pCount >= capP()) return null;
  for (let n = 0; n < P.length; n++) {
    const i = (freeHint + n) % P.length, p = P[i]; if (p.on) continue;
    freeHint = i + 1;
    p.on = true; p.type = type; p.x = x; p.y = y; p.vx = vx; p.vy = vy; p.life = p.max = life; p.size = size; p.grow = 0; p.color = color; p.drag = 0; p.grav = 0;
    pCount++; return p;
  }
  return null;
}
const SH = []; for (let i = 0; i < CAPS.sheets; i++) SH.push({ on: false, name: "", x: 0, y: 0, w: 0, h: 0, t: 0, dur: 0.4, rot: 0, alpha: 1, plate: 0 });
function sheet(name, x, y, size, dur = 0.42, rot = 0, alpha = 1, h = 0, plate = 0) {
  if (!SHEET[name]) return null;
  if (quality < 0.6) { let n = 0; for (let i = 0; i < SH.length; i++) if (SH[i].on) n++; if (n >= (ult || chain ? 12 : 7)) return null; }   // 느린 기기: 시트 7장(필살기·대장 물리침 때 12장)까지
  let s = null;
  for (let i = 0; i < SH.length; i++) if (!SH[i].on) { s = SH[i]; break; }
  if (!s) { let best = 0; for (let i = 1; i < SH.length; i++) if (SH[i].t / SH[i].dur > SH[best].t / SH[best].dur) best = i; s = SH[best]; }  // 가장 끝나가는 것을 밀어낸다
  s.on = true; s.name = name; s.x = x; s.y = y; s.w = size; s.h = h || size; s.t = 0; s.dur = dur; s.rot = rot; s.alpha = alpha; s.plate = plate;
  return s;
}
const RG = []; for (let i = 0; i < CAPS.rings; i++) RG.push({ on: false, x: 0, y: 0, t: 0, dur: 0.5, r0: 10, r1: 100, color: "#fff", w: 8, delay: 0 });
export function ring(x, y, r1, color = "#ffffff", dur = 0.5, w = 8, r0 = 8, delay = 0) {
  let r = null; for (let i = 0; i < RG.length; i++) if (!RG[i].on) { r = RG[i]; break; }
  if (!r) return;
  r.on = true; r.x = x; r.y = y; r.t = 0; r.dur = dur; r.r0 = r0; r.r1 = r1; r.color = color; r.w = w; r.delay = delay;
}
const LN = []; for (let i = 0; i < CAPS.lines; i++) LN.push({ x: Math.random() * 360, y: Math.random() * 800, len: rnd(30, 90), v: rnd(700, 1100), a: rnd(0.25, 0.6) });
const WIND = []; for (let i = 0; i < CAPS.wind; i++) WIND.push({ x: Math.random() * 360, y: Math.random() * 800, len: rnd(90, 140), v: rnd(820, 980) });

/* ---------- 칭찬 한 칸(callout): 콤보 숫자 바로 아래. 더 높은 등급이 이전 것을 바꿔 쓴다 ---------- */
const CO = { on: false, text: "", t: 0, dur: 1, pri: 0, color: "#ffe45c", size: 18 };
export function callout(text, pri = 1, color = "#ffe45c", dur = 1.1) {
  if (CO.on && CO.t < CO.dur && pri < CO.pri && CO.t < 0.6) return;          // 더 낮은 문구는 막 뜬 높은 문구를 덮지 않는다
  CO.on = true; CO.text = text; CO.t = 0; CO.dur = dur; CO.pri = pri; CO.color = color; CO.size = pri >= 4 ? 21 : pri >= 3 ? 19 : 17;
}
// 예전 이름(text)으로 부르는 곳도 같은 한 칸으로 보낸다
export function text(str, x, y, size = 20, color = "#ffe45c", dur = 0.9) { callout(str, 2, color, dur); }

/* ---------- 품질·카메라·시간 ---------- */
// 품질 단계는 기기에 기억해 둔다(느린 기기는 다음 판부터 처음부터 가볍게). 저장이 안 되면 매번 1부터.
const Q_KEY = "plane_fxq_v1";
let quality = 1, slowFrames = 0, fastFrames = 0, avgMs = 16;
try { const s = parseFloat(localStorage.getItem(Q_KEY)); if (s === 0.45 || s === 0.7) quality = s; } catch (_) {}
function saveQ() { try { localStorage.setItem(Q_KEY, String(quality)); } catch (_) {} }
const capP = () => Math.round(CAPS.particles * (quality < 0.6 ? 0.28 : quality < 0.9 ? 0.75 : 1));
const q = n => Math.max(1, Math.round(n * quality));
export function frameTime(ms) {
  avgMs += (Math.min(60, ms) - avgMs) * 0.08;
  // 느리면 빨리 낮춘다: 0.5초쯤(30프레임) 계속 20ms 넘으면 한 단계, 26ms 넘게 무거우면 바로 가장 낮은 단계로
  if (avgMs > 20) { slowFrames++; fastFrames = 0; if (slowFrames > 30 && quality > 0.45) { quality = avgMs > 26 || quality < 0.9 ? 0.45 : 0.7; slowFrames = 0; saveQ(); } }
  else if (avgMs < 14.5) { fastFrames++; slowFrames = 0; if (fastFrames > 300 && quality < 1) { quality = quality < 0.6 ? 0.7 : 1; fastFrames = 0; saveQ(); } }
  else { slowFrames = Math.max(0, slowFrames - 1); }
}
export const qualityNow = () => quality;
let shakeA = 0, punch = 0, hitStop = 0, slowT = 0, slowDur = 0, slowScale = 1, flashA = 0, flashColor = "#ffffff", lastFlashAt = -9, clockR = 0;
let dimA = 0, dimTarget = 0, dimColor = "rgba(14,10,48,1)";
export function shake(a) { shakeA = Math.min(1, Math.max(shakeA, a * (REDUCED ? 0.3 : 1))); }
export function zoom(a) { if (!REDUCED) punch = Math.max(punch, a); }
export function stop(sec) { hitStop = Math.max(hitStop, sec); }
export function slow(scale, dur) { slowScale = scale; slowT = 0; slowDur = dur; }
// 화면 전체 번쩍임: 0.34초 안에 다시 오면 약하게 이어 붙인다(3회/초 넘는 깜빡임 없음)
export function flash(color = "#ffffff", a = 0.3) {
  const cap = REDUCED ? 0.14 : 0.42, gap = clockR - lastFlashAt;
  if (gap < 0.34) { flashA = Math.max(flashA, Math.min(cap, a) * 0.35); return; }
  flashColor = color; flashA = Math.max(flashA, Math.min(cap, a)); lastFlashAt = clockR;
}
export function dim(a, color) { dimTarget = a; if (color) dimColor = color; }
// 바깥 세계가 흐르는 빠르기(0 = 멈춤). 비행기는 이 값과 상관없이 손가락을 따라간다.
export function timeScale() {
  if (hitStop > 0) return 0;
  if (slowT < slowDur) { const k = slowT / slowDur; return slowScale + (1 - slowScale) * (k < 0.7 ? 0 : (k - 0.7) / 0.3); }
  return 1;
}
export const cam = { x: 0, y: 0, z: 1 };
let speedK = 0, speedTarget = 0, edgeColor = null, edgeK = 0, player = { x: 180, y: 500 }, hudTop = 50;
export function setPlayer(x, y) { player.x = x; player.y = y; }
export function setHud(y) { hudTop = y; }
export function speedLines(k) { speedTarget = REDUCED ? 0 : k; }
export function edgeGlow(color, k) { edgeColor = color; edgeK = k; }
// 발사 반동(그림만): 40ms 동안 1.08×0.92 로 눌렸다가 110ms 동안 돌아온다. 비행기 위치·손가락 따라가기는 건드리지 않는다.
let recoilT = 9;
export function recoil() { if (!REDUCED) recoilT = 0; }
export const squash = { sx: 1, sy: 1, dy: 0 };
function updRecoil(rdt) {
  recoilT += rdt; const t = recoilT;
  let k = 0; if (t < 0.04) k = t / 0.04; else if (t < 0.15) k = 1 - easeOut((t - 0.04) / 0.11);
  squash.sx = 1 + 0.08 * k; squash.sy = 1 - 0.08 * k; squash.dy = 4 * k;
}

/* ---------- 쓰기 쉬운 효과 묶음 ---------- */
// 탄이 맞은 자리: 십자 빛 + 얇은 고리 + 별 번쩍 + 튀는 불꽃(한 프레임에 너무 많으면 건너뛴다. 필살기 중에는 막는다)
let hitBudget = 0;
export function hit(x, y, color = "#fff3a0", power = 1) {
  if (hitBudget <= 0 || ult) return; hitBudget--;
  if (quality >= 0.9) { const f = part(T_FLARE, x, y, 0, 0, 0.12, 40 + power * 12, "#fff"); if (f) f.grow = -120; if (power < 2) ring(x, y, 34 + power * 6, "#fff7ae", 0.18, 3.5, 8); }
  if (quality >= 0.6) sheet("hit", x, y, 30 + power * 14, 0.2, 0, 0.9);
  const n = q(1 + power);
  for (let i = 0; i < n; i++) { const a = rnd(-Math.PI, 0) + rnd(-0.6, 0.6), s = rnd(120, 260); const p = part(T_STREAK, x, y, Math.cos(a) * s, Math.sin(a) * s, rnd(0.12, 0.24), rnd(1.6, 2.6), color); if (p) p.drag = 4; }
}
// 총구 번쩍: 흰 → 노랑 → 주황 둥근 빛이 90ms 동안 줄어든다 + 작은 십자 빛
export function muzzle(x, y, color, size) {
  if (ult) return;
  const p = part(T_GLOW, x, y, 0, 0, 0.09, size, color); if (p) p.grow = -size * 7;
  if (size >= 30 && quality >= 0.6) { const f = part(T_FLARE, x, y, 0, 0, 0.07, size * 0.9, "#fff"); if (f) f.grow = -size * 8; }
}
// 날아가는 탄 옆으로 흘리는 작은 마름모 불티
export function wake(x, y) { if (ult || quality < 0.6) return; const p = part(T_DIA, x + rnd(-5, 5), y + 8, rnd(-30, 30), rnd(20, 60), 0.22, 6, Math.random() < 0.5 ? "w" : "g"); if (p) p.grow = -22; }
// 총구 기운: 1~3단계 없음 → 4~7단계 에너지 구슬 → 8단계 도는 빛갈래
export function muzzleAura(x, y, level, color) {
  if (level < 4 || quality < 0.6) return;
  if (level < 8) { const s = 34 + Math.sin(clockR * 14) * 4 + (level - 4) * 3; ctx.globalAlpha = 0.85; ctx.drawImage(glow(color), x - s, y - s, s * 2, s * 2); ctx.globalAlpha = 1; return; }
  const s = 58 + Math.sin(clockR * 10) * 5;
  ctx.globalAlpha = 0.9; ctx.drawImage(glow(color), x - s * 0.7, y - s * 0.7, s * 1.4, s * 1.4);
  ctx.save(); ctx.translate(x, y); ctx.rotate(clockR * 2.2); ctx.drawImage(burstTex, -s, -s, s * 2, s * 2); ctx.restore(); ctx.globalAlpha = 1;
}
// 적이 터짐: 크기에 맞춘 여러 겹 폭발(어두운 받침 → 흰 심 → 불덩이 시트 → 가늘어지는 고리 → 연기 → 불꽃 → 별 보석이 비행기로)
let combo = 0, comboT = 0, comboPop = 0, multi = 0, multiT = 0, bestShown = 0;
export function kill(x, y, r, opts = {}) {
  if (ult && !opts.silentCombo) { ultBurst(x, y, r); countKill(); return; }
  const big = r >= 26, color = opts.color || "#ffb347", s = r * (big ? 5.6 : 4.9) * (quality < 0.6 ? 0.78 : 1);
  sheet("boom", x, y, s, big ? 0.55 : 0.42, 0, 1, 0, 1.15);
  const g = part(T_GLOW, x, y, 0, 0, 0.12, r * 2.4, "#fff6c8"); if (g) g.grow = r * 9;
  if (big || quality >= 0.9) ring(x, y, r * (big ? 3.4 : 2.6), opts.ring || "#fff1b0", big ? 0.4 : 0.3, big ? 7 : 5);
  const np = q(big ? 6 : 3);
  for (let i = 0; i < np; i++) { const a = rnd(0, TAU), sp = rnd(30, 90); const p = part(T_PUFF, x + Math.cos(a) * r * 0.4, y + Math.sin(a) * r * 0.4, Math.cos(a) * sp, Math.sin(a) * sp, rnd(0.4, 0.7), rnd(r * 0.5, r * 0.9), "#fff4e0"); if (p) { p.grow = r * 1.2; p.drag = 2.5; } }
  const ns = q(big ? 10 : 6);
  for (let i = 0; i < ns; i++) { const a = rnd(0, TAU), sp = rnd(160, 340); const p = part(T_STREAK, x, y, Math.cos(a) * sp, Math.sin(a) * sp, rnd(0.2, 0.38), rnd(2, 3.2), i % 3 ? color : "#ffffff"); if (p) p.drag = 3.2; }
  gems(x, y, big ? 4 : 2, 1.6);
  if (big) shake(0.22);
  if (!opts.silentCombo) countKill();
}
function gems(x, y, n, life) { const cs = ["#ffe45c", "#ff9ec4", "#7fe3ff", "#9dffb8"]; for (let i = 0; i < q(n); i++) { const a = rnd(0, TAU), sp = rnd(90, 170); const p = part(T_GEM, x, y, Math.cos(a) * sp, Math.sin(a) * sp - 40, life, rnd(9, 12), cs[(Math.random() * 4) | 0]); if (p) p.drag = 2.6; } }
function countKill() {
  combo++; comboT = 2.0; comboPop = 1;
  multi++; multiT = 0.32;
  if (ult) return;                                  // 필살기 중에는 필살기 칭찬 한 번만
  if (multi === 8) callout("싹쓸이!", 4, "#ff9ec4");
  else if (multi === 5) callout("와르르! 5개!", 3, "#ffb347");
  else if (multi === 3) callout("3개 한꺼번에!", 2, "#7fe3ff");
  if (combo >= 10 && combo % 10 === 0 && combo > bestShown) { bestShown = combo; callout(combo >= 40 ? "굉장해요!" : combo >= 30 ? "대단해요!" : combo >= 20 ? "최고예요!" : "멋져요!", 1, "#ffe45c"); }
}
export const comboNow = () => combo;
// 큰 폭탄·미사일 폭발
export function blast(x, y, r, color = "#ffb24a", sh = 0.32) {
  sheet("boom", x, y, r * 2.6, 0.55, 0, 1, 0, 1.1);
  ring(x, y, r * 1.35, color, 0.45, 8); if (sh > 0.25) ring(x, y, r * 0.9, "#ffffff", 0.3, 4);
  const g = part(T_GLOW, x, y, 0, 0, 0.18, r * 1.1, "#fff2c0"); if (g) g.grow = r * 4;
  for (let i = 0; i < q(sh > 0.25 ? 9 : 5); i++) { const a = rnd(0, TAU), sp = rnd(180, 360); const p = part(T_STREAK, x, y, Math.cos(a) * sp, Math.sin(a) * sp, rnd(0.25, 0.4), 3, i % 2 ? color : "#fff"); if (p) p.drag = 3; }
  for (let i = 0; i < q(sh > 0.25 ? 5 : 2); i++) { const a = rnd(0, TAU), sp = rnd(40, 110); const p = part(T_PUFF, x, y, Math.cos(a) * sp, Math.sin(a) * sp, rnd(0.5, 0.8), rnd(14, 22), "#fff4e0"); if (p) { p.grow = 30; p.drag = 2.4; } }
  shake(sh); if (sh > 0.25) zoom(0.012);
}
export function zapAt(x, y, scale = 1) { sheet("zap", x, y - 30 * scale, 70 * scale, 0.22, 0, 0.9, 110 * scale); const g = part(T_GLOW, x, y, 0, 0, 0.14, 26 * scale, "#8fe8ff"); if (g) g.grow = 60; }
export function sparkleBurst(x, y, n = 16, colors = ["#ffe45c", "#ff9ec4", "#7fe3ff", "#9dffb8"]) {
  for (let i = 0; i < q(n); i++) { const a = rnd(0, TAU), sp = rnd(80, 260); const p = part(T_STAR, x, y, Math.cos(a) * sp, Math.sin(a) * sp, rnd(0.5, 0.9), rnd(7, 12), colors[i % colors.length]); if (p) p.drag = 2.2; }
}
// 엔진: 세 겹 불꽃이 흔들리며 1단계부터 나온다(단계가 오를수록 길고 굵다) + 불티
let engineT = 0, engineLv = 1;
export function engine(x, y, lv, dt) {
  engineLv = lv; engineT -= dt; if (engineT > 0 || quality < 0.6) return;
  engineT = 0.066 / Math.max(0.5, quality);
  const p = part(T_GLOW, x + rnd(-3, 3), y + 34, rnd(-14, 14), rnd(120, 180), 0.3, 6 + lv * 0.6, Math.random() < 0.5 ? "#ffcc00" : "#ff6a00"); if (p) p.grow = -12;
}
export function engineGlow(x, y) {
  const k = 1 + engineLv * 0.07, fl = Math.sin(clockR * 105) * 0.15;
  const L = [[24, 55], [16, 38], [8, 20]];
  for (let i = quality < 0.6 ? 1 : 0; i < 3; i++) { const w = L[i][0] * k, h = (L[i][1] + Math.sin(clockR * 105 + i) * 8) * k * (1 + fl * (i === 0 ? 1 : 0.5)); ctx.drawImage(PLUME[i], x - w / 2, y + 20, w, h); }
}

/* ---------- 큰 장면: 무기 강화, 대장, 필살기 ---------- */
let banner = null;            // 강화 띠: 비행기 바로 위, 짧게
export function levelUp(x, y, title, color = "#ffe45c") {
  stop(0.085); shake(0.35); zoom(0.04); flash("#fff6c8", 0.3);
  ring(x, y, 230, color, 0.6, 12); ring(x, y, 150, "#ffffff", 0.42, 6, 8, 0.06); ring(x, y, 320, "#7fe3ff", 0.75, 5, 30, 0.1);
  const g = part(T_GLOW, x, y, 0, 0, 0.35, 80, "#fff6c8"); if (g) g.grow = 400;
  sparkleBurst(x, y, 22);
  for (let i = 0; i < q(14); i++) { const a = i / 14 * TAU, p = part(T_STREAK, x, y, Math.cos(a) * 420, Math.sin(a) * 420, 0.3, 3, i % 2 ? color : "#ffffff"); if (p) p.drag = 2; }
  banner = { kick: "파워 업!", title, t: 0, dur: 1.15, color, y: Math.max(hudTop + 70, y - 92) };
  planeFlash = 0.32;
}
export let planeFlash = 0;
let boss = null;
export function bossIntro(name) { boss = { name, t: 0, dur: 2.2 }; shake(0.5); flash("#ffd36b", 0.18); }
export function bossPhase(x, y, label) { stop(0.07); shake(0.45); zoom(0.03); flash("#ffffff", 0.24); ring(x, y, 170, "#ffe45c", 0.55, 10); sheet("boom", x, y, 170, 0.5, 0, 1, 0, 1.1); sparkleBurst(x, y, 12); callout(label, 5, "#ffffff", 1.2); }
// 대장 물리침: 2.4초. 느린 화면 + 무지개 색 연쇄 폭발 12번 + 도는 빛갈래 + 세 겹 충격파 + 반투명 흰 화면 + 보석 비
let chain = null;
export function bossDefeat(x, y, w) {
  slow(0.3, 2.1); stop(0.12); shake(0.8); zoom(0.06);
  chain = { x, y, w, t: 0, next: 0, n: 0, final: false };
  ring(x, y, 140, "#ffffff", 0.4, 10);
}
const CHAIN_C = ["#ff9ec4", "#7fe3ff", "#ffe45c", "#b9a2ff", "#9dffb8", "#ffb24a"];
function updChain(dt) {
  if (!chain) return;
  chain.t += dt; chain.next -= dt;
  if (chain.n < 12 && chain.next <= 0) {
    chain.n++; chain.next = 0.1;
    const px = chain.x + rnd(-chain.w * 0.45, chain.w * 0.45), py = chain.y + rnd(-chain.w * 0.32, chain.w * 0.32), c = CHAIN_C[chain.n % 6], r = rnd(48, 74);
    sheet("boom", px, py, r * 3, 0.6, Math.random() * TAU, 1, 0, 1.25); ring(px, py, r * 1.6, c, 0.5, 9);
    const g = part(T_GLOW, px, py, 0, 0, 0.25, r * 1.4, c); if (g) g.grow = r * 5;
    for (let i = 0; i < q(6); i++) { const a = rnd(0, TAU), sp = rnd(200, 380); const p = part(T_STREAK, px, py, Math.cos(a) * sp, Math.sin(a) * sp, 0.35, 3.2, c); if (p) p.drag = 2.8; }
    shake(0.5);
  }
  if (chain.n >= 12 && chain.t > 1.3 && !chain.final) {
    chain.final = true; chain.ft = 0;
    flash("#ffffff", 0.42); shake(1); zoom(0.09);
    sheet("boom", chain.x, chain.y, 440, 0.8, 0, 1, 0, 1.3);
    ring(chain.x, chain.y, 460, "#ffe45c", 1.0, 16); ring(chain.x, chain.y, 340, "#ffffff", 0.7, 9, 20, 0.08); ring(chain.x, chain.y, 520, "#ff9ec4", 1.1, 7, 40, 0.22);
    sparkleBurst(chain.x, chain.y, 36);
    gems(chain.x, chain.y, 30, 2.4);
  }
  if (chain.final) chain.ft += dt;
  if (chain.t > 2.4) chain = null;
}

/* ---------- 조종사 필살기 ---------- */
// 큰 필살기 2.2초: 0~0.75초 모으기(느린 화면·어둡게·조종사 띠·외침) → 0.75~1.85초 큰 공격(적이 차례로 터짐) → 남은 빛.
// 작은 필살기 1초(고쳐서 맞혔을 때): 조종사 색 고리 셋 + 주변 적만 터짐, 띠·느린 화면 없음.
export const ULTS = [
  { name: "번개 소나기", color: "#4fb8ff", dark: "rgba(8,20,70,1)" },
  { name: "하트 그네 바람", color: "#ff5fb0", dark: "rgba(60,10,52,1)" },
  { name: "불꽃 로켓 돌진", color: "#ff7a1a", dark: "rgba(60,20,8,1)" },
  { name: "공룡 쿵쿵 발자국", color: "#2ec4a0", dark: "rgba(16,40,30,1)" },
];
let ult = null, mini = null;
export const ultActive = () => !!ult || !!mini;
// pilot: 0~3, art: 조종사 그림, api: { targets(), kill(e), bossHit(), clearShots(), player() }
export function ultimate(pilot, art, api) {
  const U = ULTS[pilot] || ULTS[0];
  if (banner) banner.dur = Math.min(banner.dur, banner.t + 0.3);
  ult = { p: pilot, U, art, api, t: 0, list: [], done: new Set(), sweep: -1.05, stomps: 0, strikes: 0, strikeT: 0, ghostY: 0, fired: 0, order: null };
  stop(0.11); slow(0.3, 2.1); dim(0.38, U.dark); flash(U.color, 0.22); shake(0.25); speedLines(1);
}
// 작은 필살기: 주변 radius 안의 적만, 적 탄은 모두 지운다(그 판정은 main 의 api 가 한다)
export function miniUltimate(pilot, api, radius) {
  const U = ULTS[pilot] || ULTS[0], pl = api.player();
  mini = { t: 0, U, x: pl.x, y: pl.y, r: radius };
  stop(0.06); shake(0.4); zoom(0.03); flash(U.color, 0.2);
  ring(pl.x, pl.y, radius, U.color, 0.55, 12); ring(pl.x, pl.y, radius * 0.75, "#ffffff", 0.4, 6, 10, 0.08); ring(pl.x, pl.y, radius * 1.2, U.color, 0.7, 5, 20, 0.16);
  const g = part(T_GLOW, pl.x, pl.y, 0, 0, 0.3, 60, U.color); if (g) g.grow = radius * 4;
  sparkleBurst(pl.x, pl.y, 18, [U.color, "#ffffff", "#ffe45c"]);
  callout("작은 필살기!", 5, U.color, 1.0);
}
function ultKill(e) { if (!ult || ult.done.has(e) || e.dead) return; ult.done.add(e); ult.api.kill(e); }
// 필살기마다 다른 터짐: 번개 = 하늘색·흰 불꽃 / 하트 = 진분홍 하트 / 불꽃 = 붉은 불 / 공룡 = 흙먼지 + 금빛 별
function ultBurst(x, y, r) {
  const p = ult ? ult.p : 0;
  if (p === 0) {
    const g = part(T_GLOW, x, y, 0, 0, 0.2, r * 2, "#9fe8ff"); if (g) g.grow = r * 10;
    const f = part(T_FLARE, x, y, 0, 0, 0.18, r * 4, "#fff"); if (f) f.grow = -r * 8;
    ring(x, y, r * 2.8, "#7fe3ff", 0.35, 5);
    for (let i = 0; i < q(10); i++) { const a = rnd(0, TAU), sp = rnd(220, 420); const s = part(T_STREAK, x, y, Math.cos(a) * sp, Math.sin(a) * sp, 0.3, 2.6, i % 2 ? "#ffffff" : "#5fd8ff"); if (s) s.drag = 3; }
  } else if (p === 1) {
    const g = part(T_GLOW, x, y, 0, 0, 0.22, r * 2, "#ff5fb0"); if (g) g.grow = r * 8;
    ring(x, y, r * 2.6, "#ff5fb0", 0.4, 6);
    for (let i = 0; i < q(8); i++) { const a = rnd(0, TAU), sp = rnd(120, 260); const h = part(T_HEART, x, y, Math.cos(a) * sp, Math.sin(a) * sp - 60, rnd(0.6, 0.9), rnd(14, 20), "#fff"); if (h) { h.grav = 260; h.drag = 1.5; } }
  } else if (p === 2) {
    sheet("flame", x, y, r * 4.4, 0.5, rnd(-0.5, 0.5), 1, 0, 1.1);
    const g = part(T_GLOW, x, y, 0, 0, 0.2, r * 2.2, "#ff4a1a"); if (g) g.grow = r * 8;
    ring(x, y, r * 2.6, "#ff5a1f", 0.35, 6);
    for (let i = 0; i < q(9); i++) { const a = rnd(0, TAU), sp = rnd(160, 320); const s = part(T_STREAK, x, y, Math.cos(a) * sp, Math.sin(a) * sp, 0.35, 3, i % 2 ? "#ff3a12" : "#ffb020"); if (s) { s.drag = 2.5; s.grav = -60; } }
  } else {
    for (let i = 0; i < q(7); i++) { const a = rnd(0, TAU), sp = rnd(50, 140); const d = part(T_PUFF, x, y, Math.cos(a) * sp, Math.sin(a) * sp, rnd(0.5, 0.8), rnd(r * 0.7, r * 1.1), "#c79a62"); if (d) { d.grow = r * 1.4; d.drag = 2.4; } }
    for (let i = 0; i < q(5); i++) { const a = rnd(0, TAU), sp = rnd(120, 240); const s = part(T_STAR, x, y, Math.cos(a) * sp, Math.sin(a) * sp, 0.7, rnd(10, 14), "#ffd23a"); if (s) s.drag = 2; }
    ring(x, y, r * 2.6, "#2ec4a0", 0.4, 6);
  }
}
function updUlt(dt) {
  if (mini) { mini.t += dt; if (mini.t > 1.0) mini = null; }
  if (!ult) return;
  const u = ult, t0 = u.t; u.t += dt; const t = u.t, A = 0.75, B = 1.85;
  const pl = u.api.player();
  // 모으기(0.1~0.6초): 빛 알갱이가 비행기로 빨려 들어온다
  if (t > 0.1 && t < 0.6) for (let i = 0; i < 2; i++) { const a = rnd(0, TAU), r = rnd(120, 170); part(T_IN, pl.x + Math.cos(a) * r, pl.y + Math.sin(a) * r, -Math.cos(a) * r / 0.42, -Math.sin(a) * r / 0.42, 0.4, rnd(10, 18), i ? u.U.color : "#ffffff"); }
  if (t0 < 0.55 && t >= 0.55) { const g = part(T_GLOW, pl.x, pl.y - 10, 0, 0, 0.3, 40, "#ffffff"); if (g) g.grow = 260; ring(pl.x, pl.y, 90, u.U.color, 0.3, 8); zoom(0.06); }
  if (t0 < A && t >= A) { u.list = u.api.targets(); u.order = u.list.slice().sort((a, b) => a.x - b.x); u.api.clearShots(); shake(0.4); flash("#ffffff", 0.2); }
  if (t >= A && t < B + 0.05) {
    const k = Math.min(1, (t - A) / (B - A));
    if (u.p === 0) {                  // 번개 소나기: 화면 꼭대기부터 바닥까지 꽂히는 번개가 적마다 차례로 + 사이사이 빈 번개
      const order = u.order, want = Math.floor(k * (order.length + 1));
      while (u.strikes < Math.min(want, order.length)) { const e = order[u.strikes++]; if (!e.dead) { strike(e.x, e.y); ultKill(e); } }
      u.strikeT -= dt; if (u.strikeT <= 0) { u.strikeT = quality < 0.6 ? 0.24 : 0.1; strike(rnd(20, FW - 20), rnd(FH * 0.2, FH * 0.7)); }
    } else if (u.p === 1) {           // 하트 그네: 위 가운데에 매단 커다란 하트가 왼쪽→오른쪽→가운데로 크게 흔들리며 분홍 돌풍으로 쓸어 간다
      const G = swingGeo(), ang = Math.sin((k * 1.5 - 0.5) * Math.PI) * G.amp; u.sweep = ang;
      const px = G.px, py = G.py;
      for (const e of u.list) { if (u.done.has(e) || e.dead) continue; const ea = Math.atan2(e.x - px, e.y - py); if ((k < 0.67 && ang > ea) || k >= 0.98) ultKill(e); }
      const L = G.L, bx = px + Math.sin(ang) * L, by = py + Math.cos(ang) * L;
      if (Math.random() < 0.7) { const h = part(T_HEART, bx + rnd(-50, 50), by + rnd(-40, 40), rnd(-90, 90), rnd(-90, 60), 0.7, rnd(12, 18), "#fff"); }
    } else if (u.p === 2) {           // 불꽃 로켓 돌진: 커다란 불꽃 비행기가 화면 끝까지 솟구친다. 지나간 줄의 적이 다 터진다
      const kk = Math.min(1, k / 0.65), gy = pl.y - (pl.y + 180) * (kk * kk);
      u.ghostY = gy;
      for (const e of u.list) if (!u.done.has(e) && !e.dead && e.y > gy - 10) { ultKill(e); }
      if (kk < 1) {
        // 불기둥: 불꽃·폭발 시트를 크기·기울기·자리·투명도를 바꿔 가며(같은 모양을 찍어 내지 않게)
        const nm = Math.random() < 0.65 ? "flame" : "boom";
        sheet(nm, pl.x + rnd(-30, 30), gy + rnd(80, 170), rnd(90, 180), rnd(0.35, 0.6), rnd(-0.45, 0.45), rnd(0.7, 1));
        u.fired += dt; if (u.fired > 0.09) { u.fired = 0; ring(pl.x, gy + 40, FW * 0.75, "#ffcf6a", 0.5, 7, 30); }
        const s = part(T_STREAK, pl.x + rnd(-60, 60), gy + rnd(0, 120), 0, 900, 0.18, 2.4, "#fff2d0");
      } else for (const e of u.list) ultKill(e);
    } else {                          // 공룡 쿵쿵: 커다란 청록 발자국 다섯 개가 위에서 아래로 쿵! 쿵!
      const n = Math.min(5, Math.floor(k * 5.4) + 1);
      while (u.stomps < n) {
        const i = u.stomps++, sx = i % 2 ? FW * 0.7 : FW * 0.3, sy = FH * 0.1 + (Math.max(FH * 0.3, pl.y - 110) - FH * 0.1) * (i / 4);
        stomps.push({ x: sx, y: sy, t: 0, flip: i % 2 }); if (stomps.length > 6) stomps.shift();
        sheet("stomp", sx, sy, 300, 0.6, 0, 0.85); ring(sx, sy, 170, "#2ec4a0", 0.5, 12); shake(0.55); zoom(0.025);
        for (let j = 0; j < q(7); j++) { const a = rnd(0, TAU), sp = rnd(60, 160); const p = part(T_PUFF, sx, sy, Math.cos(a) * sp, Math.sin(a) * sp, rnd(0.5, 0.8), rnd(16, 26), "#c79a62"); if (p) { p.grow = 30; p.drag = 2.5; } }
        for (const e of u.list) if (!u.done.has(e) && !e.dead && (e.y < sy + 90 || i === 4)) ultKill(e);
      }
    }
  }
  if (t0 < B && t >= B) {             // 마무리: 큰 고리 + 대장에게 한 방 + 칭찬 한 줄
    for (const e of u.list) ultKill(e);
    u.api.bossHit();
    ring(FW / 2, FH * 0.45, FH * 0.8, u.U.color, 0.6, 14); ring(FW / 2, FH * 0.45, FH * 0.55, "#ffffff", 0.45, 6, 20, 0.05);
    shake(0.6); zoom(0.05);
    dim(0); speedLines(0);
    callout(u.done.size >= 5 ? "싹 다 펑! 최고예요!" : "멋져요!", 6, "#ffe45c", 1.3);
  }
  if (t >= 2.2) ult = null;
}
let stomps = [];
// 하트 그네의 줄: 화면 위 멀리 매달려 하트가 화면 가운데 높이(45%)를 왼쪽 끝에서 오른쪽 끝까지 가로지른다
function swingGeo() { const L = FH * 1.35, py = FH * 0.45 - L; return { px: FW / 2, py, L, amp: Math.asin(Math.min(0.95, (FW / 2 + 30) / L)) }; }
function strike(x, y) {
  sheet("zap", x, FH * 0.5, 104, 0.32, 0, 1, FH + 40);
  sheet("hit", x, y, 96, 0.3, 0, 1);
  const g = part(T_GLOW, x, y, 0, 0, 0.18, 40, "#9fe8ff"); if (g) g.grow = 220;
  shake(0.18);
}

/* ---------- 매 프레임 ---------- */
export function update(dt, rdt) {
  clockR += rdt; hitBudget = Math.max(hitBudget, q(6));
  if (hitStop > 0) hitStop -= rdt;
  if (slowT < slowDur) slowT += rdt;
  shakeA = Math.max(0, shakeA - rdt * 1.9); punch *= Math.exp(-rdt * 9);
  const s = shakeA * shakeA * 9;
  cam.x = s ? (Math.sin(clockR * 71) + Math.sin(clockR * 43)) * 0.5 * s : 0;
  cam.y = s ? (Math.sin(clockR * 59 + 1) + Math.sin(clockR * 37)) * 0.5 * s : 0;
  cam.z = 1 + punch;
  if (flashA > 0) flashA = Math.max(0, flashA - rdt * 2.6);
  dimA += (dimTarget - dimA) * Math.min(1, rdt * 7);
  speedK += (speedTarget - speedK) * Math.min(1, rdt * 4);
  if (planeFlash > 0) planeFlash -= rdt;
  updRecoil(rdt);
  if (comboT > 0) { comboT -= rdt; if (comboT <= 0) { combo = 0; bestShown = 0; } }
  if (comboPop > 0) comboPop = Math.max(0, comboPop - rdt * 5);
  if (multiT > 0) { multiT -= dt; if (multiT <= 0) multi = 0; }
  if (CO.on) { CO.t += rdt; if (CO.t >= CO.dur) CO.on = false; }
  updUlt(rdt); updChain(rdt);
  // 입자: 보통은 세계 시간(느린 화면이면 같이 느려진다). 잠깐 멈춤 중에도 조금은 움직이고, 필살기 중에는 제 빠르기로.
  dt = ult ? rdt : Math.max(dt, rdt * 0.35);
  for (let i = 0; i < P.length; i++) {
    const p = P[i]; if (!p.on) continue;
    p.life -= dt; if (p.life <= 0) { p.on = false; pCount--; continue; }
    if (p.type === T_GEM && p.max - p.life > 0.3) {             // 잠깐 퍼졌다가 비행기로 빨려 간다
      const dx = player.x - p.x, dy = player.y - p.y, d = Math.hypot(dx, dy) || 1, sp = 520 + (p.max - p.life) * 400;
      p.vx += (dx / d * sp - p.vx) * Math.min(1, dt * 7); p.vy += (dy / d * sp - p.vy) * Math.min(1, dt * 7);
      if (d < 20) { p.on = false; pCount--; const g = part(T_GLOW, player.x, player.y, 0, 0, 0.12, 22, p.color); if (g) g.grow = 90; continue; }
    } else if (p.drag) { const k = Math.max(0, 1 - p.drag * dt); p.vx *= k; p.vy *= k; }
    p.vy += p.grav * dt; p.x += p.vx * dt; p.y += p.vy * dt; p.size = Math.max(0.5, p.size + p.grow * dt);
  }
  for (let i = 0; i < SH.length; i++) { const s = SH[i]; if (!s.on) continue; s.t += dt; if (s.t >= s.dur) s.on = false; }
  for (let i = 0; i < RG.length; i++) { const r = RG[i]; if (!r.on) continue; if (r.delay > 0) { r.delay -= rdt; continue; } r.t += rdt; if (r.t >= r.dur) r.on = false; }
  for (let i = stomps.length - 1; i >= 0; i--) { stomps[i].t += rdt; if (stomps[i].t > 1.4) stomps.splice(i, 1); }
  if (banner) { banner.t += rdt; if (banner.t >= banner.dur) banner = null; }
  if (boss) { boss.t += rdt; if (boss.t >= boss.dur) boss = null; }
  if (speedK > 0.02) for (let i = 0; i < LN.length; i++) { const l = LN[i]; l.y += l.v * rdt * (0.4 + speedK); if (l.y - l.len > FH) { l.y = -rnd(0, 80); l.x = Math.random() * FW; } }
  for (let i = 0; i < WIND.length; i++) { const w = WIND[i]; w.y += w.v * rdt; if (w.y - w.len > FH) { w.y = -rnd(0, 200); w.x = Math.random() * FW; } }
}

/* ---------- 그리기 ---------- */
export const OFF = {};       // 점검용: 층별로 끄고 빠르기를 잰다(?qa=1)
// 먼 구름(느리게) 네 덩이 — 하늘 그림 위, 적 아래
const BACK = []; for (let i = 0; i < 4; i++) BACK.push({ x: Math.random() * 360, y: Math.random() * 900, s: rnd(0.45, 0.7) });
export function drawBack(scrollV, rdt) {
  if (OFF.back || quality < 0.6) return;                 // 느린 기기: 흐르는 구름·속도선 없이(하늘 그림만)
  ctx.globalAlpha = 0.28;
  for (const c of BACK) {
    c.y += scrollV * rdt * 0.55;
    const w = 220 * c.s, h = 110 * c.s;
    if (c.y - h > FH) { c.y = -h - rnd(0, 200); c.x = rnd(-40, FW - w + 40); }
    ctx.drawImage(cloudTex, c.x, c.y, w, h);
  }
  ctx.globalAlpha = 1;
  if (speedK > 0.02) {
    ctx.strokeStyle = "#ffffff"; ctx.lineWidth = 1.6; ctx.lineCap = "round"; ctx.globalAlpha = speedK * 0.32;
    ctx.beginPath(); for (let i = 0; i < LN.length; i++) { const l = LN[i]; ctx.moveTo(l.x, l.y - l.len * (0.6 + speedK)); ctx.lineTo(l.x, l.y); } ctx.stroke();
    ctx.globalAlpha = 1;
  }
}
export function drawDim() { if (dimA > 0.01) { ctx.globalAlpha = dimA; ctx.fillStyle = dimColor; ctx.fillRect(-20, -20, FW + 40, FH + 40); ctx.globalAlpha = 1; } }
function drawSheet(s) {
  const S = SHEET[s.name]; if (!S) return;
  const fr = Math.min(7, Math.floor(s.t / s.dur * 8)), cell = S.cell, sx = (fr & 3) * cell, sy = (fr >> 2) * cell;
  const fade = s.t / s.dur > 0.85 ? (1 - s.t / s.dur) / 0.15 : 1;
  if (s.rot) { ctx.save(); ctx.translate(s.x, s.y); ctx.rotate(s.rot); }
  const dx = s.rot ? -s.w / 2 : s.x - s.w / 2, dy = s.rot ? -s.h / 2 : s.y - s.h / 2;
  ctx.globalAlpha = s.alpha * fade; ctx.drawImage(S.c, sx, sy, cell, cell, dx, dy, s.w, s.h);
  if (s.rot) ctx.restore();
}
// 세계 효과(적 탄과 비행기보다 아래)
const streakColors = [];
export function drawWorld() {
  if (ult) drawUlt();
  if (!OFF.sheets) {
    // 어두운 받침을 먼저(밝은 폭발 아래), 그 위에 시트
    if (quality >= 0.9) for (let i = 0; i < SH.length; i++) { const s = SH[i]; if (!s.on || !s.plate || s.w < 90) continue; const k = s.t / s.dur, w = s.w * s.plate; ctx.globalAlpha = 1 - k; ctx.drawImage(plateTex, s.x - w / 2, s.y - w / 2, w, w); }
    for (let i = 0; i < SH.length; i++) if (SH[i].on) drawSheet(SH[i]);
    ctx.globalAlpha = 1;
  }
  for (let i = 0; i < RG.length; i++) {
    const r = RG[i]; if (!r.on || r.delay > 0) continue;
    const k = r.t / r.dur, e = easeOut(k);
    ctx.globalAlpha = (1 - k) * 0.9; ctx.strokeStyle = r.color; ctx.lineWidth = Math.max(1, r.w * (1 - k * 0.8));
    ctx.beginPath(); ctx.arc(r.x, r.y, r.r0 + (r.r1 - r.r0) * e, 0, TAU); ctx.stroke();
  }
  ctx.globalAlpha = 1;
  if (OFF.parts) return;
  // 불꽃 줄: 같은 색끼리 한 번에 긋는다(그리기 횟수를 줄인다)
  streakColors.length = 0;
  for (let i = 0; i < P.length; i++) { const p = P[i]; if (p.on && p.type === T_STREAK && streakColors.indexOf(p.color) < 0) streakColors.push(p.color); }
  if (streakColors.length) {
    ctx.lineCap = "round"; ctx.lineWidth = 2.6; ctx.globalAlpha = 0.9;
    for (const c of streakColors) {
      ctx.strokeStyle = c; ctx.beginPath();
      for (let i = 0; i < P.length; i++) { const p = P[i]; if (!p.on || p.type !== T_STREAK || p.color !== c) continue; const sp = Math.hypot(p.vx, p.vy) || 1, len = Math.min(26, 4 + sp * 0.05) * Math.min(1, p.life / p.max * 2); ctx.moveTo(p.x, p.y); ctx.lineTo(p.x - p.vx / sp * len, p.y - p.vy / sp * len); }
      ctx.stroke();
    }
  }
  for (let i = 0; i < P.length; i++) {
    const p = P[i]; if (!p.on || p.type === T_STREAK) continue;
    const k = p.life / p.max, s = p.size;
    if (p.type === T_GLOW || p.type === T_IN) { ctx.globalAlpha = Math.min(1, k * 1.6); ctx.drawImage(glow(p.color), p.x - s / 2, p.y - s / 2, s, s); }
    else if (p.type === T_PUFF) { if (quality < 0.6) continue; ctx.globalAlpha = k * 0.75; ctx.drawImage(puffOf(p.color), p.x - s / 2, p.y - s / 2, s, s); }
    else if (p.type === T_STAR || p.type === T_GEM) {
      const z = s * (p.type === T_GEM ? 1 : 0.6 + k * 0.4);
      ctx.globalAlpha = p.type === T_GEM ? Math.min(1, k * 4) : Math.min(1, k * 2);
      ctx.drawImage(gemTex(p.color), p.x - z, p.y - z, z * 2, z * 2);
    }
    else if (p.type === T_HEART) { ctx.globalAlpha = Math.min(1, k * 2); ctx.drawImage(heartTex, p.x - s / 2, p.y - s / 2, s, s); }
    else if (p.type === T_DIA) { ctx.globalAlpha = 0.85 * Math.min(1, k * 2); ctx.drawImage(p.color === "w" ? diaTex.w : diaTex.g, p.x - s / 2, p.y - s / 2, s, s); }
    else if (p.type === T_FLARE) { ctx.globalAlpha = Math.min(1, k * 1.5); ctx.drawImage(flareTex, p.x - s / 2, p.y - s / 2, s, s); }
  }
  ctx.globalAlpha = 1;
  if (mini) {
    const m = mini, k = m.t;
    ctx.globalAlpha = Math.max(0, 0.5 - k * 0.5); ctx.drawImage(glow(m.U.color), m.x - m.r, m.y - m.r, m.r * 2, m.r * 2); ctx.globalAlpha = 1;
  }
}
function drawUlt() {
  const u = ult, t = u.t, A = 0.75, pl = u.api.player();
  if (t < A) return;
  const k = Math.min(1, (t - A) / 1.1);
  if (u.p === 1) {
    const G = swingGeo(), px = G.px, py = G.py, L = G.L, ang = u.sweep;
    // 분홍 돌풍 띠: 휩쓸고 지나간 부채꼴 전체(화면 폭을 가로지른다) — 두꺼운 띠 셋 + 흰 결
    const a0 = Math.PI / 2 + G.amp, a1 = Math.PI / 2 - ang, lo = Math.min(a0, a1), hi = Math.max(a0, a1);
    const bands = [["rgba(255,95,176,.42)", 70, 0], ["rgba(255,170,215,.38)", 40, -64], ["rgba(255,95,176,.3)", 34, 60]];
    ctx.lineCap = "round";
    for (const [c, w, off] of bands) { ctx.strokeStyle = c; ctx.lineWidth = w; ctx.beginPath(); ctx.arc(px, py, L + off, lo, hi); ctx.stroke(); }
    ctx.strokeStyle = "rgba(255,255,255,.7)"; ctx.lineWidth = 3;
    for (let i = 0; i < 4; i++) { const r = L - 50 + i * 34, sh = (t * 3 + i * 0.3) % 1; ctx.beginPath(); ctx.arc(px, py, r, lo + (hi - lo) * sh * 0.6, lo + (hi - lo) * (sh * 0.6 + 0.3)); ctx.stroke(); }
    // 바람 줄: 흔들리는 쪽으로 화면을 가로지른다
    const dir = Math.cos((k * 1.5 - 0.5) * Math.PI) >= 0 ? 1 : -1;
    ctx.strokeStyle = "rgba(255,210,235,.75)"; ctx.lineWidth = 4; ctx.beginPath();
    for (let i = 0; i < 9; i++) { const y = FH * (0.12 + i * 0.08), x = ((t * 1100 * dir + i * 97) % (FW + 200) + FW + 200) % (FW + 200) - 100; ctx.moveTo(x, y); ctx.lineTo(x - dir * 110, y + 6); }
    ctx.stroke();
    // 끝에 매달린 커다란 하트 + 그 둘레를 도는 소용돌이
    const bx = px + Math.sin(ang) * L, by = py + Math.cos(ang) * L, size = Math.min(FW * 0.62, 230);
    ctx.strokeStyle = "rgba(255,255,255,.55)"; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(px, py); ctx.lineTo(bx, by - size * 0.3); ctx.stroke();
    ctx.lineWidth = 6;
    for (let i = 0; i < 3; i++) { const r = size * (0.45 + i * 0.12), st = t * (7 + i * 2) + i * 2; ctx.strokeStyle = i === 1 ? "rgba(255,255,255,.7)" : "rgba(255,95,176,.7)"; ctx.beginPath(); ctx.arc(bx, by, r, st, st + 2.2); ctx.stroke(); }
    ctx.save(); ctx.translate(bx, by); ctx.rotate(-ang * 0.35); ctx.drawImage(bigHeart, -size / 2, -size / 2, size, size); ctx.restore();
  } else if (u.p === 2) {
    const gy = u.ghostY, art = u.art;
    if (gy > -220) {
      ctx.globalAlpha = 0.55; ctx.drawImage(tail("#ff7a1a"), pl.x - 64, gy + 30, 128, Math.max(10, pl.y - gy + 40)); ctx.globalAlpha = 1;
      ctx.drawImage(glow("#ff9a3a"), pl.x - 110, gy - 110, 220, 220);
      if (art) {
        const w = 150 * (1 + Math.sin(t * 40) * 0.03), h = w * art.height / art.width;
        ctx.globalAlpha = 0.3; ctx.drawImage(art, pl.x - w / 2, gy + 70 - h / 2, w, h);      // 뒤따르는 잔상
        ctx.globalAlpha = 0.5; ctx.drawImage(art, pl.x - w / 2, gy + 35 - h / 2, w, h);
        ctx.globalAlpha = 1; ctx.drawImage(art, pl.x - w / 2, gy - h / 2, w, h);
      }
      ctx.strokeStyle = "rgba(255,255,255,.8)"; ctx.lineWidth = 3; ctx.beginPath();
      for (let i = 0; i < 6; i++) { const x = pl.x + (i < 3 ? -1 : 1) * (90 + (i % 3) * 22), y = gy + ((t * 1400 + i * 40) % 160); ctx.moveTo(x, y); ctx.lineTo(x, y + 60); }
      ctx.stroke();
    }
  } else if (u.p === 3) {
    for (const s of stomps) {
      const kk = Math.min(1, s.t / 0.12), a = s.t < 0.9 ? 1 : Math.max(0, 1 - (s.t - 0.9) / 0.5), sc = 1.5 - 0.5 * kk;
      ctx.save(); ctx.translate(s.x, s.y); ctx.scale(sc * (s.flip ? -1 : 1), sc); ctx.globalAlpha = a;
      foot();
      ctx.restore();
    }
    ctx.globalAlpha = 1;
  } else {
    ctx.globalAlpha = 0.35 * (1 - k * 0.5); ctx.fillStyle = "#bfe9ff"; ctx.fillRect(0, 0, FW, 40 + Math.sin(t * 30) * 4); ctx.globalAlpha = 1;
  }
}
// 커다란 공룡 발자국(청록 발바닥 + 발가락 셋, 굵은 진갈색 테)
function foot() {
  ctx.fillStyle = "#2ec4a0"; ctx.strokeStyle = "#4a2a0a"; ctx.lineWidth = 9; ctx.lineJoin = "round";
  ctx.beginPath(); ctx.ellipse(0, 14, 34, 40, 0, 0, TAU); ctx.stroke(); ctx.fill();
  for (const [x, y, r] of [[-30, -34, 14], [0, -46, 15], [30, -34, 14]]) { ctx.beginPath(); ctx.ellipse(x, y, r * 0.8, r * 1.15, x * 0.012, 0, TAU); ctx.stroke(); ctx.fill(); }
  ctx.fillStyle = "rgba(255,255,255,.5)"; ctx.beginPath(); ctx.ellipse(-10, 0, 9, 14, 0, 0, TAU); ctx.fill();
}
// 화면 위에 덮는 것: HUD 띠 · 바람선 · 가장자리 빛 · 번쩍임 · 조종사 띠 · 강화 띠 · 콤보 · 칭찬 한 칸
const FONT = "'Pretendard Variable', system-ui, sans-serif";
// 테두리 글자는 한 번만 그려 두고 붙인다(매 프레임 strokeText 는 느리다). 같은 글자·크기·색이면 다시 쓴다(최대 48장).
const txtCache = new Map();
function txtSprite(str, size, fill, weight) {
  const key = str + "|" + size + "|" + fill + "|" + weight; let c = txtCache.get(key); if (c) return c;
  const lw = Math.max(4, size * 0.24), m = document.createElement("canvas").getContext("2d"); m.font = weight + " " + size + "px " + FONT;
  const w = Math.ceil(m.measureText(str).width + lw * 2 + 4), h = Math.ceil(size * 1.5 + lw * 2);
  c = cv(w, h, (x) => { x.font = weight + " " + size + "px " + FONT; x.textAlign = "center"; x.textBaseline = "middle"; x.lineJoin = "round"; x.lineWidth = lw; x.strokeStyle = "rgba(20,18,70,.9)"; x.strokeText(str, w / 2, h / 2); x.fillStyle = fill; x.fillText(str, w / 2, h / 2); });
  if (document.fonts && document.fonts.status !== "loaded") return c;     // 글꼴이 아직이면 저장하지 않는다(다른 글꼴로 굳지 않게)
  if (txtCache.size > 200) txtCache.delete(txtCache.keys().next().value);
  txtCache.set(key, c); return c;
}
// 숫자 + 꼬리말(오른쪽 끝 맞춤): 글자마다 테두리 그림·속 그림을 따로 한 번만 만들어 두고, 테두리를 먼저 다 그린 뒤 속을 그린다
// (콤보가 바뀔 때마다 새 글자 그림을 만들지 않고, 이웃 글자 테두리가 속을 덮지 않게).
const glyphCache = new Map();
function glyph(ch, size, fill) {
  const key = ch + "|" + size + "|" + fill; let g = glyphCache.get(key); if (g) return g;
  const lw = Math.max(4, size * 0.24), font = "900 " + size + "px " + FONT, m = document.createElement("canvas").getContext("2d"); m.font = font;
  const adv = m.measureText(ch).width, w = Math.ceil(adv + lw * 2 + 4), h = Math.ceil(size * 1.5 + lw * 2);
  const mk = stroke => cv(w, h, (x) => { x.font = font; x.textAlign = "left"; x.textBaseline = "middle"; x.lineJoin = "round"; if (stroke) { x.lineWidth = lw; x.strokeStyle = "rgba(20,18,70,.9)"; x.strokeText(ch, lw + 2, h / 2); } else { x.fillStyle = fill; x.fillText(ch, lw + 2, h / 2); } });
  g = { s: mk(true), f: mk(false), adv, pad: lw + 2 };
  if (!(document.fonts && document.fonts.status !== "loaded")) glyphCache.set(key, g);
  return g;
}
function drawCount(n, tailStr, size, fill) {
  const t = txtSprite(tailStr, size, fill, 900), ds = String(n);
  let w = 0; for (let i = 0; i < ds.length; i++) w += glyph(ds[i], size, fill).adv;
  const tPad = Math.max(4, size * 0.24) + 2, x0 = -(t.width - tPad) - w;
  for (let pass = 0; pass < 2; pass++) { let x = x0; for (let i = 0; i < ds.length; i++) { const g = glyph(ds[i], size, fill); ctx.drawImage(pass ? g.f : g.s, x - g.pad, -g.s.height / 2); x += g.adv; } }
  ctx.drawImage(t, x0 + w - tPad, -t.height / 2);
}
function outlined(str, x, y, size, fill, weight = 900, align = "center") {
  const c = txtSprite(String(str), size, fill, weight);
  ctx.drawImage(c, align === "right" ? x - c.width : x - c.width / 2, y - c.height / 2);
}
export const label = (str, x, y, size, fill) => outlined(str, x, y, size, fill);
export function drawTop() {
  if (!OFF.hud) ctx.drawImage(hudFade, -20, -20, FW + 40, hudTop + 46);
  if (!REDUCED && !OFF.wind && quality >= 0.6) {                // 앞쪽 바람선(1단계부터 속도감). 비행기 가까이는 흐리게
    ctx.strokeStyle = "#ffffff"; ctx.lineWidth = 2; ctx.lineCap = "round";
    ctx.globalAlpha = 0.2; ctx.beginPath();
    for (const w of WIND) { if (Math.abs(w.x - player.x) < 34 && w.y > player.y - 160) continue; ctx.moveTo(w.x, w.y - w.len); ctx.lineTo(w.x, w.y); } ctx.stroke();
    ctx.globalAlpha = 0.07; ctx.beginPath();
    for (const w of WIND) { if (!(Math.abs(w.x - player.x) < 34 && w.y > player.y - 160)) continue; ctx.moveTo(w.x, w.y - w.len); ctx.lineTo(w.x, w.y); } ctx.stroke();
    ctx.globalAlpha = 1;
  }
  if (edgeColor && edgeK > 0 && !OFF.edge && quality >= 0.6) {
    const e = edgeOf(edgeColor), a = edgeK * (0.55 + Math.sin(clockR * 5) * 0.2), w = 26 + edgeK * 18;
    ctx.globalAlpha = a; ctx.drawImage(e, 0, 0, w, FH);
    ctx.save(); ctx.translate(FW, 0); ctx.scale(-1, 1); ctx.drawImage(e, 0, 0, w, FH); ctx.restore(); ctx.globalAlpha = 1;
  }
  if (boss) {                          // 대장 등장: 노란 줄무늬 띠가 위아래에서 밀려 들어온다(무섭지 않게 밝은 색)
    const k = boss.t / boss.dur, inK = Math.min(1, boss.t / 0.25), out = k > 0.82 ? (1 - k) / 0.18 : 1, h = 30 * inK * out;
    ctx.fillStyle = "rgba(255,200,40,.92)"; ctx.fillRect(0, hudTop, FW, h); ctx.fillRect(0, FH - h, FW, h);
    ctx.save(); ctx.beginPath(); ctx.rect(0, hudTop, FW, h); ctx.rect(0, FH - h, FW, h); ctx.clip();
    ctx.fillStyle = "rgba(40,30,90,.85)"; const off = (clockR * 60) % 40;
    for (let x = -40 + off; x < FW + 40; x += 40) { ctx.beginPath(); ctx.moveTo(x, hudTop); ctx.lineTo(x + 18, hudTop); ctx.lineTo(x - 2, hudTop + 30); ctx.lineTo(x - 20, hudTop + 30); ctx.fill(); ctx.beginPath(); ctx.moveTo(x, FH - 30); ctx.lineTo(x + 18, FH - 30); ctx.lineTo(x - 2, FH); ctx.lineTo(x - 20, FH); ctx.fill(); }
    ctx.restore();
    const pop = easeBack(Math.min(1, boss.t / 0.35));
    ctx.save(); ctx.translate(FW / 2, FH * 0.36); ctx.scale(pop, pop); ctx.globalAlpha = out;
    outlined("조심! 대장이 와요", 0, -24, 18, "#ffffff", 800); outlined(boss.name, 0, 8, 32, "#ffd23a");
    ctx.restore(); ctx.globalAlpha = 1;
  }
  if (chain && chain.final && chain.ft < 0.9) {      // 대장 물리침 마지막: 도는 큰 빛갈래
    const k = chain.ft / 0.9, s = 260 + k * 260;
    ctx.save(); ctx.globalAlpha = (1 - k) * 0.85; ctx.translate(chain.x, chain.y); ctx.rotate(chain.ft * 1.6); ctx.drawImage(burstTex, -s / 2, -s / 2, s, s); ctx.restore(); ctx.globalAlpha = 1;
  }
  if (ult) drawCutIn();
  if (banner) {                         // 강화 띠: 비행기 바로 위에 짧고 낮게(위에서 내려오는 적을 가리지 않게)
    const b = banner, k = b.t / b.dur, pop = easeBack(Math.min(1, b.t / 0.25)), out = k > 0.75 ? (1 - k) / 0.25 : 1, y = b.y;
    ctx.save(); ctx.globalAlpha = out * 0.8;
    const bandW = Math.min(FW * 0.86, 300) * Math.min(1, b.t / 0.14);
    ctx.fillStyle = "rgba(20,24,90,.7)"; ctx.fillRect(FW / 2 - bandW / 2, y - 21, bandW, 42);
    ctx.fillStyle = b.color; ctx.fillRect(FW / 2 - bandW / 2, y - 22, bandW, 3); ctx.fillRect(FW / 2 - bandW / 2, y + 19, bandW, 3);
    ctx.globalAlpha = out; ctx.translate(FW / 2, y); ctx.scale(pop, pop);
    outlined(b.kick, 0, -8, 12, b.color, 900);
    const size = b.title.length > 20 ? 13 : b.title.length > 14 ? 15 : 17;
    outlined(b.title, 0, 9, size, "#ffffff", 900);
    ctx.restore(); ctx.globalAlpha = 1;
  }
  if (combo >= 3 && !OFF.text) {
    // 글자 크기는 4단계로만(같은 콤보 글자 그림을 다시 쓴다 — 매 프레임 새로 그리지 않게)
    const sc = 1 + comboPop * 0.45, a = Math.min(1, comboT * 2), size = combo >= 30 ? 28 : combo >= 20 ? 24 : combo >= 10 ? 21 : 18;
    const col = combo >= 30 ? "#ff9ec4" : combo >= 15 ? "#ffb347" : "#ffe45c";
    ctx.save(); ctx.globalAlpha = a; ctx.translate(FW - 12, hudTop + 24); ctx.scale(sc, sc);
    drawCount(combo, " 콤보", size, col);
    ctx.restore(); ctx.globalAlpha = 1;
  }
  if (CO.on && !OFF.text) {              // 칭찬 한 칸: 콤보 바로 아래 오른쪽(적 위가 아닌 고정 자리)
    const k = CO.t / CO.dur, pop = 1 + 0.4 * (1 - easeBack(Math.min(1, CO.t / 0.15))), a = k > 0.75 ? (1 - k) / 0.25 : 1;
    ctx.save(); ctx.globalAlpha = a; ctx.translate(FW - 12, hudTop + 54); ctx.scale(pop, pop);
    outlined(CO.text, 0, 0, CO.size, CO.color, 900, "right"); ctx.restore(); ctx.globalAlpha = 1;
  }
  if (flashA > 0.005) { ctx.globalAlpha = flashA; ctx.fillStyle = flashColor; ctx.fillRect(-20, -20, FW + 40, FH + 40); ctx.globalAlpha = 1; }
}
// 조종사 띠: 비스듬한 색 띠 + 뒤에서 도는 빛갈래·반짝이 + 조종사 그림 + 필살기 이름. 세로 화면에서는 낮게(60%) HUD 바로 아래.
function drawCutIn() {
  const u = ult, t = u.t; if (t > 1.05) return;
  const tall = FH > FW * 1.45, h = tall ? 72 : 120, y = tall ? hudTop + 74 : FH * 0.42;
  const inK = easeOut(Math.min(1, t / 0.16)), out = t > 0.85 ? Math.max(0, 1 - (t - 0.85) / 0.2) : 1;
  ctx.save(); ctx.globalAlpha = out; ctx.translate((1 - inK) * -FW, 0);
  ctx.fillStyle = u.U.color; ctx.beginPath(); ctx.moveTo(-10, y - h / 2 + 14); ctx.lineTo(FW + 10, y - h / 2 - 10); ctx.lineTo(FW + 10, y + h / 2 - 10); ctx.lineTo(-10, y + h / 2 + 14); ctx.fill();
  ctx.fillStyle = "rgba(255,255,255,.9)"; ctx.fillRect(-10, y + h / 2 + 2, FW + 20, 4);
  ctx.fillStyle = "rgba(255,255,255,.35)";
  for (let i = 0; i < 7; i++) { const lx = ((t * 900 + i * 70) % (FW + 100)) - 50; ctx.fillRect(FW - lx, y - h * 0.36 + i * h * 0.11, 46, 3); }
  const ax = tall ? 48 : 70, as = tall ? 62 : 92;
  if (u.art) {
    ctx.save(); ctx.translate(ax, y + 2); ctx.save(); ctx.rotate(t * 3); ctx.drawImage(burstTex, -as * 0.95, -as * 0.95, as * 1.9, as * 1.9); ctx.restore();
    for (let i = 0; i < 5; i++) { const a = t * 4 + i * 1.26, r = as * 0.62; ctx.drawImage(starTex("#fff6a8"), Math.cos(a) * r - 6, Math.sin(a) * r - 6, 12, 12); }
    ctx.rotate(-0.35); const hh = as * u.art.height / u.art.width; ctx.drawImage(u.art, -as / 2, -hh / 2, as, hh); ctx.restore();
  }
  const pop = easeBack(Math.min(1, Math.max(0, (t - 0.1) / 0.25)));
  ctx.translate(FW * (tall ? 0.6 : 0.62), y); ctx.scale(pop, pop);
  outlined("필살기!", 0, tall ? -15 : -24, tall ? 13 : 16, "#ffffff", 900);
  outlined(u.U.name, 0, tall ? 8 : 10, tall ? (u.U.name.length > 6 ? 19 : 22) : (u.U.name.length > 6 ? 24 : 28), "#fff6a8", 900);
  ctx.restore(); ctx.globalAlpha = 1;
}
const countOn = a => { let n = 0; for (let i = 0; i < a.length; i++) if (a[i].on) n++; return n; };
export const qa = () => ({ particles: pCount, sheets: countOn(SH), rings: countOn(RG), callout: CO.on ? CO.text : null, quality, avgMs: +avgMs.toFixed(2), ult: ult ? { p: ult.p, t: +ult.t.toFixed(2) } : null, mini: !!mini, combo, scale: timeScale(), sheetsReady: sheetsReady(), reduced: REDUCED });
export function setQuality(v) { quality = v; }
// 처음 쓰는 순간 멈칫하지 않게, 자주 쓰는 빛·캡슐·숫자 그림을 쉬는 틈에 미리 만들어 둔다(콤보 숫자 0~9 × 크기 4 × 색 3 등)
export function prewarm(colors, bullets) {
  const jobs = [];
  for (const c of colors) jobs.push(() => glow(c));
  for (const [c, tl] of bullets) jobs.push(() => { bullet(c, tl); capsule(c); });
  for (const c of ["#ffe45c", "#ff9ec4", "#7fe3ff", "#9dffb8", "#ffd23a"]) jobs.push(() => gemTex(c));
  for (const [size, col] of [[18, "#ffe45c"], [21, "#ffe45c"], [21, "#ffb347"], [24, "#ffb347"], [28, "#ff9ec4"]]) jobs.push(() => { txtSprite(" 콤보", size, col, 900); for (let d = 0; d < 10; d++) glyph(String(d), size, col); });
  const step = () => { const t = performance.now(); while (jobs.length && performance.now() - t < 6) jobs.shift()(); if (jobs.length) setTimeout(step, 30); };
  setTimeout(step, 200);
}
// 새 판: 남은 효과를 모두 지운다
export function reset() {
  for (const p of P) p.on = false; pCount = 0;
  for (const s of SH) s.on = false; for (const r of RG) r.on = false; CO.on = false;
  combo = 0; comboT = 0; multi = 0; bestShown = 0; ult = null; mini = null; chain = null; banner = null; boss = null; stomps = [];
  slowFrames = 0; fastFrames = 0; avgMs = 16;          // 품질 판단은 새 판부터 다시(품질 단계 자체는 그대로 둔다)
  dimA = dimTarget = 0; slowT = slowDur = 0; hitStop = 0; flashA = 0; shakeA = 0; punch = 0; planeFlash = 0; speedTarget = speedK = 0;
}
