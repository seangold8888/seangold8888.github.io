// Spell Towers — 성과 마법 탑. 받침에 탑을 세우면 저절로 주문을 쏴 괴물을 비눗방울에 태워 돌려보낸다.
// ? 부엉이 문제를 맞히면 대마법이 터지고 탑 강화 카드를 고른다.
// 규칙 표는 logic.js, 한 걸음은 engine.js, 여기서는 그리기·입력·화면·저장.
// 그림은 art/ 의 그림 파일을 쓰고, 못 읽으면 캔버스 도형으로 대신 그린다. shadowBlur 와 매 프레임 그라데이션은 쓰지 않는다.
import * as L from "./logic.js?v=1";
import * as E from "./engine.js?v=3";
import { createParticles, createSynth, P_GLOW, P_STREAK, P_SPIN, P_RING, P_GEM } from "./juice.js?v=2";

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
const ART = {}, WHITE = {}, TINT = {};   // TINT: 상태 색(불꽃 주황·얼음 하늘·번개 노랑) 실루엣
const MON_ART = L.MONSTER_IDS;
const ART_NAMES = ["wiz0", "wiz1", "wiz2", "wiz3", ...L.TOWER_IDS.map(k => "tower_" + k), ...L.TOWER_IDS.map(k => "tower_" + k + "_big"), ...MON_ART,
  "castle", "cake", "crystal", "owl", "pad", "bubble", "tree", "mushroom", "rock", "snowpine", "ground"];
function whiten(im, col = "#fff") {
  // 실루엣은 작게(최대 128px) 만든다 — 덧칠용이라 크게 둘 필요가 없고 메모리를 아낀다
  const sc = Math.min(1, 128 / Math.max(im.width, im.height)), c = document.createElement("canvas"); c.width = Math.max(1, Math.round(im.width * sc)); c.height = Math.max(1, Math.round(im.height * sc));
  const x = c.getContext("2d"); x.drawImage(im, 0, 0, c.width, c.height); x.globalCompositeOperation = "source-in"; x.fillStyle = col; x.fillRect(0, 0, c.width, c.height);
  return c;
}
let artTimer = 0;
for (const n of ART_NAMES) {
  const im = new Image();
  im.onload = () => {
    ART[n] = im; if (MON_ART.includes(n)) { WHITE[n] = whiten(im); TINT[n] = { fire: whiten(im, "#ff8a2a"), ice: whiten(im, "#7fdcff"), zap: whiten(im, "#fff27a") }; }
    if (n === "crystal") paintGemTex();
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
// 받침 아래 속성 빛(타원으로 늘려 그린다). 가운데 진하게 → 바깥 투명 + 옅은 테두리 고리
const auraTex = rgb => canvasOf(128, 128, (x, w) => {
  const g = x.createRadialGradient(64, 64, 0, 64, 64, 64);
  g.addColorStop(0, "rgba(" + rgb + ",.55)"); g.addColorStop(0.55, "rgba(" + rgb + ",.22)"); g.addColorStop(0.82, "rgba(" + rgb + ",.32)"); g.addColorStop(0.9, "rgba(" + rgb + ",.08)"); g.addColorStop(1, "rgba(" + rgb + ",0)");
  x.fillStyle = g; x.fillRect(0, 0, w, w);
});
const ringDots = col => canvasOf(128, 128, (x) => { x.fillStyle = col; for (let i = 0; i < 18; i++) { const a = i * TAU / 18; x.beginPath(); x.arc(64 + Math.cos(a) * 58, 64 + Math.sin(a) * 58, i % 3 ? 2.6 : 4, 0, TAU); x.fill(); } });
const RING_DOTS = { fire: ringDots("#ffb04a"), ice: ringDots("#bff0ff"), bolt: ringDots("#fff3a0"), wind: ringDots("#c8ffdc"), light: ringDots("#fff6c0") };
const AURA = { fire: auraTex("255,120,40"), ice: auraTex("90,220,255"), bolt: auraTex("255,226,60"), wind: auraTex("90,235,160"), light: auraTex("255,236,170") };
// 길 바닥 자국(맞은 자리에 1~1.5초 남는다): 그을린 따뜻한 빛 · 성에 무늬 · 남은 불꽃 선 · 빛 웅덩이 · 바람 소용돌이
const decalTex = (kind) => canvasOf(96, 96, (x) => {
  const rg = (c0, c1) => { const g = x.createRadialGradient(48, 48, 0, 48, 48, 46); g.addColorStop(0, c0); g.addColorStop(1, c1); return g; };
  if (kind === "fire") { x.fillStyle = rg("rgba(255,170,60,.85)", "rgba(255,69,0,0)"); x.beginPath(); x.arc(48, 48, 46, 0, TAU); x.fill(); x.fillStyle = "rgba(90,40,20,.35)"; x.beginPath(); x.ellipse(48, 50, 26, 18, 0, 0, TAU); x.fill(); x.fillStyle = "rgba(255,230,140,.8)"; for (let i = 0; i < 6; i++) { x.beginPath(); x.arc(48 + Math.cos(i) * 20, 48 + Math.sin(i * 1.7) * 14, 2.5, 0, TAU); x.fill(); } }
  else if (kind === "ice") { x.fillStyle = rg("rgba(200,245,255,.7)", "rgba(128,234,255,0)"); x.beginPath(); x.arc(48, 48, 46, 0, TAU); x.fill(); x.strokeStyle = "rgba(255,255,255,.85)"; x.lineWidth = 3; x.lineCap = "round"; for (let i = 0; i < 6; i++) { const a = i * Math.PI / 3; x.beginPath(); x.moveTo(48, 48); x.lineTo(48 + Math.cos(a) * 36, 48 + Math.sin(a) * 36); x.moveTo(48 + Math.cos(a) * 22, 48 + Math.sin(a) * 22); x.lineTo(48 + Math.cos(a + 0.4) * 30, 48 + Math.sin(a + 0.4) * 30); x.stroke(); } }
  else if (kind === "bolt") { x.fillStyle = rg("rgba(255,250,170,.7)", "rgba(255,240,77,0)"); x.beginPath(); x.arc(48, 48, 46, 0, TAU); x.fill(); x.strokeStyle = "rgba(255,255,220,.95)"; x.lineWidth = 2.5; for (let i = 0; i < 5; i++) { const a = i * 1.26 + 0.3; x.beginPath(); x.moveTo(48, 48); x.lineTo(48 + Math.cos(a) * 16 + 5, 48 + Math.sin(a) * 16); x.lineTo(48 + Math.cos(a) * 34, 48 + Math.sin(a) * 34); x.stroke(); } }
  else if (kind === "light") { x.fillStyle = rg("rgba(255,255,240,.85)", "rgba(255,184,255,0)"); x.beginPath(); x.arc(48, 48, 46, 0, TAU); x.fill(); }
  else { x.fillStyle = rg("rgba(200,255,220,.6)", "rgba(150,255,190,0)"); x.beginPath(); x.arc(48, 48, 46, 0, TAU); x.fill(); x.strokeStyle = "rgba(255,255,255,.7)"; x.lineWidth = 3; for (let i = 0; i < 3; i++) { x.beginPath(); x.arc(48, 48, 14 + i * 9, i * 2, i * 2 + 2.6); x.stroke(); } }
});
const DECAL = { fire: decalTex("fire"), ice: decalTex("ice"), bolt: decalTex("bolt"), light: decalTex("light"), wind: decalTex("wind") };
const decals = [];   // { x, y(화면 논리), t, T, im, s, a } — 상한 40
function decalAt(sx, sy, kind, size, T = 1.1, a = 0.45) { if (decals.length >= 40) decals.shift(); decals.push({ x: sx, y: sy, t: 0, T, im: DECAL[kind], s: size * AS, a }); }
const KIND_GLOW = { fire: glowTex("255,140,60", 96), ice: glowTex("140,220,255", 96), bolt: glowTex("255,236,110", 96), wind: glowTex("150,255,190", 96), light: glowTex("255,246,200", 96) };
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

/* ---------- 화려한 효과: 입자 풀 ----------
   상한: 데스크톱·태블릿 PCAP_DESK(480), 폰 PCAP_PHONE(300). 실제 상한 = 그 값 × 품질(quality, 0.35~1). 대마법 중에는 보통 공격의 입자를 만들지 않는다.
   품질: 최근 30프레임 평균 간격이 20ms 를 넘으면 0.7배(0.5초에 한 번까지), 17.5ms 안쪽이 6초 이어지면 +0.1. 입자 수·효과 그림 수가 품질을 따른다.
   prefers-reduced-motion 이면 흔들기 0.3배·번쩍임 0.5배·확대 없음. */
const PCAP_DESK = 480, PCAP_PHONE = 300;
const SKIP = {};   // 검증용(?qa=1): 효과 묶음을 하나씩 꺼서 비용을 잰다
const parts = createParticles(PCAP_DESK);
let pcap = PCAP_DESK, quality = 1;
let RM = false;
try { const mq = matchMedia("(prefers-reduced-motion: reduce)"); RM = mq.matches; mq.addEventListener && mq.addEventListener("change", e => { RM = e.matches; }); } catch (_) {}
const QN = n => Math.max(1, Math.round(n * quality * 0.75));   // 0.75: 보통 공격 한 번 6~12개 안쪽(측정해 보니 입자가 가장 큰 비용)
function shardTex(size = 40) {
  return canvasOf(size, size, (x, w) => {
    x.drawImage(glowTex("150,225,255", w), 0, 0);
    x.fillStyle = "#e9fbff"; x.strokeStyle = "#7fd0ff"; x.lineWidth = 2;
    x.beginPath(); x.moveTo(w / 2, w * 0.08); x.lineTo(w * 0.66, w / 2); x.lineTo(w / 2, w * 0.92); x.lineTo(w * 0.34, w / 2); x.closePath(); x.fill(); x.stroke();
  });
}
function flakeTex(size = 36) {
  return canvasOf(size, size, (x, w) => {
    x.drawImage(glowTex("180,235,255", w), 0, 0);
    x.strokeStyle = "#ffffff"; x.lineWidth = 2.4; x.lineCap = "round";
    for (let i = 0; i < 3; i++) { const a = i * Math.PI / 3; x.beginPath(); x.moveTo(w / 2 - Math.cos(a) * w * 0.34, w / 2 - Math.sin(a) * w * 0.34); x.lineTo(w / 2 + Math.cos(a) * w * 0.34, w / 2 + Math.sin(a) * w * 0.34); x.stroke(); }
  });
}
function confettiTex(col) { return canvasOf(16, 16, (x) => { x.fillStyle = col; x.beginPath(); x.ellipse(8, 8, 7, 3.6, 0, 0, TAU); x.fill(); x.fillStyle = "rgba(255,255,255,.55)"; x.fillRect(5, 6, 4, 2); }); }
function leafTex() { return canvasOf(24, 24, (x) => { x.fillStyle = "#7fe08a"; x.beginPath(); x.ellipse(12, 12, 10, 5, 0.5, 0, TAU); x.fill(); x.strokeStyle = "#3f9a4a"; x.lineWidth = 1.5; x.beginPath(); x.moveTo(4, 16); x.lineTo(20, 8); x.stroke(); }); }
function heartTex(col) { return canvasOf(24, 24, (x) => { x.fillStyle = col; x.beginPath(); x.moveTo(12, 21); x.bezierCurveTo(1, 13, 3, 3, 12, 8); x.bezierCurveTo(21, 3, 23, 13, 12, 21); x.fill(); }); }
// 수정 입자 그림(crystal 그림이 오면 그것으로 다시 칠한다 — 캔버스는 같은 것)
const GEM_TEX = canvasOf(40, 40, () => {});
function paintGemTex() { const x = GEM_TEX.getContext("2d"); x.clearRect(0, 0, 40, 40); x.drawImage(glowTex("200,150,255", 40), 0, 0); gemIcon(x, 20, 20, 30); }
const SHARD_IMG = shardTex(), FLAKE_IMG = flakeTex();
const TX = {
  // 둥근 빛(glow)
  gFire: parts.reg(glowTex("255,140,50")), gEmber: parts.reg(glowTex("255,200,90")), gPink: parts.reg(glowTex("255,120,200")), gIce: parts.reg(glowTex("140,220,255")),
  gBolt: parts.reg(glowTex("255,240,120")), gWind: parts.reg(glowTex("150,255,190")), gLight: parts.reg(glowTex("255,248,210")), gWhite: parts.reg(glowTex("255,255,255")),
  gGold: parts.reg(glowTex("255,214,90")), gPurple: parts.reg(glowTex("190,140,255")), gSky: parts.reg(glowTex("120,200,255")),
  // 선·고리 색
  cFire: parts.reg("#ffb04a"), cYellow: parts.reg("#fff3a0"), cIce: parts.reg("#bff0ff"), cWhite: parts.reg("#ffffff"), cWind: parts.reg("#c8ffdc"),
  cGold: parts.reg("#ffd24a"), cPink: parts.reg("#ff9ee0"), cPurple: parts.reg("#c8a0ff"), cOrange: parts.reg("#ff7a3c"), cSky: parts.reg("#7fd8ff"),
  // 도는 그림
  star: STAR_LIST.map(s => parts.reg(s)), shard: parts.reg(SHARD_IMG), flake: parts.reg(FLAKE_IMG), leaf: parts.reg(leafTex()), gem: parts.reg(GEM_TEX),
  conf: ["#ff6fa8", "#ffd24a", "#6fd0ff", "#7fe08a", "#c08cff", "#ff9f43"].map(c => parts.reg(confettiTex(c))), heart: parts.reg(heartTex("#ff8fc8")),
};
TX.lv = L.LV_COLORS.map(c => parts.reg(c));
TX.lvGlow = LV_GLOW.map(c => parts.reg(c));
TX.kind = { fire: TX.gFire, ice: TX.gIce, bolt: TX.gBolt, wind: TX.gWind, light: TX.gLight };
TX.gDust = parts.reg(glowTex("255,244,220"));
TX.miniBubble = parts.reg(canvasOf(24, 24, (x) => { x.fillStyle = "rgba(255,182,193,.25)"; x.beginPath(); x.arc(12, 12, 10, 0, TAU); x.fill(); x.strokeStyle = "rgba(224,255,255,.9)"; x.lineWidth = 2; x.stroke(); x.fillStyle = "#fff"; x.beginPath(); x.arc(8, 8, 2.5, 0, TAU); x.fill(); }));
TX.pastel = ["#ff9aa2", "#ffdac1", "#e2f0cb", "#b5ead7", "#c7ceea"].map(c => parts.reg(c));
paintGemTex();
const rr = () => Math.random();
// 입자 하나(상한 넘으면 버림)
function pa(ty, tex, x, y, vx, vy, life, s0, s1, g = 0, drag = 0, add = 0, rot = 0, vr = 0, alpha = 1) {
  if (parts.count >= ((spell && spell.on) || clock < bossFinU ? Math.min(pcap, 320) : pcap)) return -1;   // 큰 장면 동안은 상한 320
  return parts.add(ty, tex, x, y, vx, vy, life, s0, s1, g, drag, add, rot, vr, alpha);
}
// 아래 도우미는 모두 화면 논리 좌표(sx, sy)
function glowAt(sx, sy, tex, s0, s1, life, add = 1, alpha = 1) { return pa(P_GLOW, tex, sx, sy, 0, 0, life, s0, s1, 0, 0, add, 0, 0, alpha); }
function ringAt(sx, sy, col, r0, r1, life, width) { return pa(P_RING, col, sx, sy, 0, 0, AS < 1 ? Math.min(life, 0.25) : life, r0, r1, 0, 0, 0, 0, width); }   // 좁은 화면은 고리를 0.25초 안으로
function sparks(sx, sy, n, col, spd, width, len, g = 0, dir = null, spread = TAU, add = 0) {
  for (let i = 0; i < n; i++) {
    const a = dir == null ? rr() * TAU : dir + (rr() - 0.5) * spread, s = spd * (0.45 + rr() * 0.8);
    pa(P_STREAK, col, sx, sy, Math.cos(a) * s, Math.sin(a) * s, 0.22 + rr() * 0.22, width, len, g, 2.5, add);
  }
}
function spinBurst(sx, sy, n, texs, spd, size, life = 0.6, g = 0, up = 0) {
  for (let i = 0; i < n; i++) {
    const a = rr() * TAU, s = spd * (0.4 + rr() * 0.8), tx = Array.isArray(texs) ? texs[i % texs.length] : texs;
    pa(P_SPIN, tx, sx, sy, Math.cos(a) * s, Math.sin(a) * s - up, life * (0.7 + rr() * 0.5), size * (0.7 + rr() * 0.5), size * 0.3, g, 1.6, 0, rr() * TAU, (rr() - 0.5) * 14);
  }
}
// HUD 수정 칩(화면 논리 좌표). resize·판 시작 때 다시 잰다
let gemHud = { x: 120, y: 0 }, cakeHud = { x: 40, y: 0 }, waveHud = { x: 260, y: 0 };
function measureHud() {
  const at = (id, o) => { const el = $(id); if (!el) return; const r = el.getBoundingClientRect(); if (!r.width) return; o.x = (r.left + r.width / 2 - mapX) / mapS; o.y = (r.top + r.height / 2 - mapY) / mapS; };
  at("gems", gemHud); at("cake", cakeHud); at("wave", waveHud);
}
let gemBudget = 0;   // 한 번에 날아가는 수정 입자 수 제한(대마법 등)
function gemsToHud(sx, sy, n) {
  for (let i = 0; i < n; i++) {
    const a = -Math.PI / 2 + (rr() - 0.5) * 2.4, s = 160 + rr() * 160;
    const id = pa(P_GEM, TX.gem, sx, sy, Math.cos(a) * s, Math.sin(a) * s, 0.75 + rr() * 0.3, 20 * VS, 20 * VS, 0, 5, 0, rr() * TAU, (rr() - 0.5) * 8);
    parts.target(id, gemHud.x, gemHud.y);
  }
}
function confetti(sx, sy, n, spd = 220) {
  for (let i = 0; i < n; i++) {
    const a = -Math.PI / 2 + (rr() - 0.5) * 2.6, s = spd * (0.5 + rr() * 0.8);
    pa(P_SPIN, TX.conf[i % TX.conf.length], sx, sy, Math.cos(a) * s, Math.sin(a) * s, 0.8 + rr() * 0.5, 13 * VS, 11 * VS, 520, 1.2, 0, rr() * TAU, (rr() - 0.5) * 18);
  }
}

/* ---------- 카메라: 흔들림(트라우마)·멈칫(hit-stop)·느리게(slow-mo)·확대 펀치 ----------
   멈칫·느리게는 게임 시뮬레이션 전체(괴물·탑·탄)를 같이 멈추거나 같이 느리게 한다 — 결과는 바뀌지 않고 시간만 늘어난다. */
let trauma = 0, hitStop = 0, slowT = 0, zoomP = 0, lastFlashAt = -9;
const shake = a => { trauma = Math.min(1, trauma + a); };
// 번쩍임: 1초에 3번 넘게 터지지 않게(0.34초 안의 작은 번쩍임은 무시), 반투명만
function flashFx(a, col) {
  if (RM) a *= 0.5;
  if (clock - lastFlashAt < 0.34 && a <= flash) return;
  if (clock - lastFlashAt < 0.34) a = Math.min(a, flash + 0.05);
  flash = Math.min(0.3, a); flashCol = col; lastFlashAt = clock;
}
// 떠오르는 큰 글자(콤보·한꺼번에·변신·대왕). 화면 CSS px. world 가 있으면 그 자리 위에
const callouts = [];
function callout(text, { size = 34, col = "#ffe27a", x = null, y = null, wx = null, wy = null, T = 1.3, rise = 30, top = false } = {}) {
  if (callouts.length >= 6) callouts.shift();
  for (const c of callouts) if (c.t > 0.15) c.t = Math.max(c.t, c.T * 0.78);   // 앞 글자는 얼른 비켜 준다(겹쳐 읽기 어렵지 않게)
  callouts.push({ text, size, col, x, y, wx, wy, t: 0, T, rise, top });
}

/* ---------- 소리: Web Audio 비프(음성 합성 금지) ---------- */
let ac = null, soundOn = true, quiet = false;   // quiet: 처음 화면 시연이 내는 소리는 끈다
try { soundOn = localStorage.getItem(L.SOUND_KEY) !== "0"; } catch (_) {}
function audio() {
  if (!soundOn || quiet) return null;
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
// 겹소리(쿵 + 몸통 + 반짝 꼬리). 소리 끔이면 audio() 가 null 이라 아무것도 안 난다.
const synth = createSynth(audio);
const sfx = {
  home: step => once("home", 55, () => synth.pop(step || 0)),
  fire: (lv = 1, br) => once("fire", 120, () => synth.fire(lv, br)),
  ice: (lv = 1) => once("ice", 260, () => synth.ice(lv)),
  bolt: (lv = 1, br) => once("bolt", 150, () => synth.bolt(lv, br)),
  wind: (lv = 1) => once("wind", 280, () => synth.wind(lv)),
  light: (lv = 1, br) => once("light", 200, () => synth.light(lv, br)),
  owl: () => { beep(520, 0.16, "sine", 0.07, 440); setTimeout(() => beep(440, 0.22, "sine", 0.07, 380), 200); },
  tap: () => beep(880, 0.06, "sine", 0.06),
  sparkle: () => once("spark", 60, () => beep(rnd(1400, 1900), 0.07, "triangle", 0.05)),
  build: () => [392, 523, 659].forEach((f, i) => setTimeout(() => beep(f, 0.12, "triangle", 0.09), i * 70)),
  up: () => [523, 659, 784, 1047].forEach((f, i) => setTimeout(() => beep(f, 0.15, "triangle", 0.11), i * 85)),
  no: () => beep(220, 0.18, "sine", 0.09, 160),
  steal: () => beep(330, 0.25, "triangle", 0.07, 200),
  wave: () => { beep(392, 0.15, "square", 0.04); setTimeout(() => beep(523, 0.2, "square", 0.04), 160); },
  boss: () => { beep(130, 0.5, "square", 0.06, 90); setTimeout(() => beep(110, 0.6, "square", 0.05, 70), 300); },
  blast: (big, hit) => synth.stinger(big, hit),
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
let AS = 1, vw = 1, vh = 1, dpr = 1, mapS = 1, mapX = 0, mapY = 0, portrait = false, VS = 1.25, ROT = false, PHONE = false, FX_MAX = 40, HUD_SAFE = 64;
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
  AS = ROT || PHONE ? 0.72 : 1;          // 세로·폰: 범위 효과 크기 0.72배(보이는 크기만)
  FX_MAX = PHONE ? 28 : 40;          // 폰은 효과 동시 상한을 조금 낮춘다
  HUD_SAFE = PHONE ? 50 : 64;
  pcap = Math.round((PHONE ? PCAP_PHONE : PCAP_DESK) * quality);
  layoutCtrl(); measureHud();
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
function drawMon(kind, x, y, w, faceRight, white, alpha = 1, foot = false) { drawMonSrc(monSprite(kind, white), x, y, w, faceRight, alpha, foot); }
let SQX = 1, SQY = 1;   // 맞은 괴물 납작 비율(그리는 동안만)
function drawMonSrc(src, x, y, w0, faceRight, alpha = 1, foot = false) {
  if (!src) return;
  const w = w0 * SQX, h = w0 * src.height / src.width * SQY, top = foot ? -h : -h / 2;
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
let mode = "start";      // start | play | build | buildquiz | info | quiz | reward | cards | resume | paused | over
let world = null, clock = 0, banner = "", bannerT = 0, bannerBig = false, flash = 0, flashCol = "255,255,255";
let speed = 1, resumeT = 0, runSaved = false, saidOwl = false, saidPad = false, wandT = 0, focusPad = -1;
const PILOT_COLOR = L.PILOTS.map(p => p.color);
// DEMO: 처음 화면 뒤에서 저절로 도는 시연 판(world 가 시연용). 소리·문제·저장·안내 글 없음.
// guide: 판의 첫 탑을 세울 때까지 길 시작에 가장 가까운 빈 받침을 큰 화살표로 가리킨다 { pad, t, wait }
let DEMO = false, guide = null;
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
  if (e.key === "Escape" || e.key === "p") { if (mode === "play") pause(); else if (mode === "paused") unpause(); else if (mode === "build" || mode === "info") closeDock(); else if (mode === "buildquiz") cancelBuildQuiz(); }
  if (e.repeat || !guard || performance.now() < guard.armAt) return;
  freshKeyAt = performance.now();
  const n = parseInt(e.key, 10);
  if (n >= 1 && n <= guard.buttons.length && !guard.buttons[n - 1].disabled) { e.preventDefault(); guard.onPick(guard.buttons[n - 1], n - 1); }
});

/* ---------- 입력: 탭만 ---------- */
canvas.addEventListener("pointerdown", e => {
  audio();
  if (spell && spell.on && mode === "reward") { skipSpell(); return; }   // 대마법 장면은 눌러서 건너뛸 수 있다
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
  const quiz = !!GameQuiz && E.buildNeedsQuiz(world);
  const first = !!guide && !world.towers.length && !!rec;   // 판의 첫 탑: 추천 하나만 크게(한 번 누르면 문제)
  $("build").classList.toggle("first", first);
  $("buildKicker").textContent = first ? (quiz ? "반짝이는 탑을 눌러요 · 문제를 맞히면 탑이 생겨요" : "반짝이는 탑을 눌러요!") : world.freeTower ? "마법 배지: 첫 탑은 공짜!" : "수정 " + world.gems + "개 있어요" + (quiz ? " · 고르면 문제가 나와요" : "");
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
    if (mode !== "build" || focusPad !== padIdx) return;     // 두 번 눌러도 한 번만
    const kind = kinds[i];
    if (!E.canBuild(world, padIdx, kind)) return;
    // 문제로 세우는 탑: 수정은 정답을 맞힌 순간에 낸다(창을 닫고 그만두면 그대로)
    if (GameQuiz && E.buildNeedsQuiz(world)) { disarm(); b.classList.add("ok"); sfx.tap(); openBuildQuiz(padIdx, kind); return; }
    const t = E.build(world, padIdx, kind);
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
    disarm(); towerUpFx(t, false);
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

/* ---------- 새 탑 → 문제 → 탑이 태어난다 ----------
   탑을 고르면 게임이 멈추고(world.pending = "build") 공통 문제 창이 뜬다.
   한 번에 맞히면 2단계 탑 + 큰 탄생 효과, 고쳐 맞히면 1단계 탑(틀린 보기는 흐려질 뿐 벌 없음).
   수정은 맞힌 순간에만 나간다. 틀리기 전에는 "← 다른 탑" 으로 그만둘 수 있다(수정 그대로, 탑 없음). */
let buildAsk = null;           // { pad, kind, wrong, done, t }
const backBtn = $("quizBack");
let backArmAt = 0, backDown = null;
function showBack(on) {
  backBtn.hidden = !on;
  if (on) { backArmAt = performance.now() + LOCK_MS; backBtn.classList.add("locked"); setTimeout(() => backBtn.classList.remove("locked"), LOCK_MS); }
}
backBtn.addEventListener("pointerdown", e => { e.stopPropagation(); backDown = performance.now() >= backArmAt ? e.pointerId : null; });
backBtn.addEventListener("pointerup", e => { const d = backDown; backDown = null; if (d === null || d !== e.pointerId || performance.now() < backArmAt) return; cancelBuildQuiz(); });
backBtn.addEventListener("pointercancel", () => { backDown = null; });
backBtn.addEventListener("click", e => { if (e.detail === 0 && performance.now() >= backArmAt) cancelBuildQuiz(); });
function openBuildQuiz(padIdx, kind) {
  const T = L.TOWERS[kind], cost = E.buildCost(world, kind);
  $("build").hidden = true; mode = "buildquiz"; focusPad = padIdx;   // 받침 강조는 그대로(어디에 생길지 보이게)
  world.pending = "build";                                            // 파도 시계·괴물·탑 모두 멈춤
  const ba = buildAsk = { pad: padIdx, kind, wrong: false, done: false, t: null };
  showBack(true);
  GameQuiz.ask({
    kid: L.PILOTS[pilot].kid, voice: soundOn, title: "한 번에 맞히면 2단계 탑!", pace: "quick",
    hint: T.name + " · 수정 " + cost + " · 고쳐 맞혀도 탑이 생겨요", theme: QUIZ_THEME, closeDelay: 520,
    onWrong: () => { sfx.no(); if (buildAsk === ba) { ba.wrong = true; showBack(false); } },
    onCorrect: r => {
      if (buildAsk !== ba || !world) return "";
      showBack(false);
      E.recordQuiz(world, r.firstTry);
      const t = E.buildByQuiz(world, padIdx, kind, r.firstTry);
      ba.done = true; ba.t = t; ba.firstTry = r.firstTry;
      handleEvents();
      if (r.firstTry) sfx.up(); else sfx.build();
      hudKey = ""; hud();
      return t ? (r.firstTry ? "2단계 " + T.name + "!" : T.name + " 완성!") : "";
    },
    onDone: () => { if (buildAsk !== ba) return; buildAsk = null; if (mode !== "buildquiz" || !world) return; towerBorn(ba); },
  });
}
// 문제 창이 닫힌 바로 그때 탄생 효과(창에 가리지 않게). 2단계는 훨씬 크게.
function towerBorn(ba) {
  const t = ba.t, T = L.TOWERS[ba.kind];
  if (t) { birthFx(t, !!ba.firstTry); say(ba.firstTry ? "한 번에 맞혔어요! 2단계 " + T.name + "!" : T.name + "을 세웠어요!", !!ba.firstTry); }
  startResume();
}
function birthFx(t, big) {
  t.grow = 1; t.bigGrow = big; t.flash = big ? 1.6 : 1;
  world.fx.grow.push({ x: t.x, y: t.y, t: 0, lv: t.lv, big }); if (world.fx.grow.length > 8) world.fx.grow.shift();
  if (big) {
    addFx("mega", t.x, t.y, 300 * VS, { dur: 0.8, oy: -40 * VS });
    lightAt(t.x, t.y, 200, -60 * VS);
    flashFx(0.22, "255,236,150"); shake(0.35); wandT = 1.2;
    towerUpFx(t, false, true);
  } else { padFx(t.pad); flashFx(0.1, "255,255,255"); towerUpFx(t, false, true, true); }
}
// 틀리기 전 "← 다른 탑": 수정 그대로, 탑 없음, 다시 탑 고르기로
function cancelBuildQuiz() {
  const ba = buildAsk;
  if (!ba || ba.done || ba.wrong || mode !== "buildquiz") return false;
  buildAsk = null; showBack(false);
  if (GameQuiz) GameQuiz.close();
  E.resumeAfter(world); mode = "play"; last = performance.now();
  sfx.tap(); openBuild(ba.pad);
  return true;
}
// 판이 끝나거나 처음 화면으로 갈 때: 열린 탑 문제는 그냥 버린다(수정·탑 변화 없음)
function dropBuildQuiz() { buildAsk = null; showBack(false); }

/* ---------- ? 부엉이 → 문제 → 대마법 → 카드 ---------- */
let cardsShown = null;
const QUIZ_THEME = { top: 60, bg: "rgba(34,20,78,.97)", accent: "#ffe27a" };
function openQuiz() {
  mode = "quiz"; closePanels();
  if (!GameQuiz) { rewardBlast(false); afterReward(false, true); return; }
  const n = world.tune.cards;
  GameQuiz.ask({
    kid: L.PILOTS[pilot].kid, voice: soundOn, title: "맞히면 대마법 + 탑 강화!", pace: "challenge",
    hint: "한 번에 맞히면 길 위 괴물이 모두 방울에 실려 가요 · 수정 +" + L.BLAST_GEMS + " · 카드 " + n + "장 중 하나", theme: QUIZ_THEME,
    onWrong: () => sfx.no(),
    onCorrect: r => { E.recordQuiz(world, r.firstTry); return rewardBlast(r.firstTry, true); },
    onDone: r => { if (mode !== "quiz") return; startSpell(); afterReward(r.firstTry, false); },
  });
}
// 맞힌 그 순간(카드 고르기 전): 대마법(한 번에) / 작은 마법(고쳐서)
// 결과(괴물·수정·케이크)는 바로 정해지고, 보이는 연출(대마법 장면)은 문제 창이 닫힌 뒤(hold) 시작한다.
function rewardBlast(firstTry, hold = false) {
  const snap = prepSpell();
  const r = E.quizBlast(world, firstTry);
  armSpell(snap, firstTry, null);
  handleEvents();
  wandT = firstTry ? 2.2 : 1.2;
  hudKey = ""; hud();
  if (!hold) startSpell();
  const msg = (firstTry ? "대마법! " : "작은 마법! ") + (r.n ? "괴물 " + r.n + "마리를 방울에 태워 보냈어요" : "길이 깨끗해졌어요") + " · 수정 +" + r.gems + (r.cake ? " · 케이크 +1" : "");
  say(msg, true);
  return msg;
}
// 대마법 장면이 끝나면(또는 눌러서 건너뛰면) 카드 — ui() 가 본다
let rewardNext = null;
function afterReward(firstTry, noQuiz) {
  mode = "reward"; rewardNext = { firstTry, noQuiz };
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
  armChoices($("cards"), buttons, (b, i) => { disarm(); buttons.forEach(x => { x.disabled = true; }); b.classList.add("ok"); pickedCardBtn = b; onPick(cards[i], b); });
}
// 3단계 갈림길: 두 모양 중 하나
function openBranch(c) {
  const T = L.TOWERS[c.kind];
  $("cardKicker").textContent = T.name + " " + c.lv + "단계! 변신할 모양을 골라요";
  $("cardTitle").textContent = "어떤 탑으로 변신할까요?";
  const opts = ["a", "b"].map(br => ({ type: "branch", kind: c.kind, lv: c.lv, branch: br, rarity: 2, text: { name: T.branches[br].name, tag: save.branches[c.kind + ":" + br] ? "" : "새 발견!", say: T.branches[br].say } }));
  setTimeout(() => showCardRow(opts, o => applyChosen(c, o.branch)), 260);
}
let pickedCardBtn = null, cardFlying = 0;
function applyChosen(c, branch) {
  const evo = !!branch || c.type === "legend";      // 갈림길 변신·전설 카드는 더 크게
  cardFlying++;
  const r = E.applyCard(world, c, branch);
  handleEvents();
  cardFlying--;
  say(r.text, true); bannerT = 3;
  hudKey = ""; hud();
  // 고른 카드가 탑(또는 성·HUD)으로 날아가 부딪히며 터진다. 탑은 카드가 닿을 때 커진다.
  const t = r.pad >= 0 ? E.towerOf(world, r.pad) : null;
  if (t) { t.grow = 0; t.flash = 0; world.fx.grow = world.fx.grow.filter(g => g.x !== t.x || g.y !== t.y); }
  flyCard(pickedCardBtn, c, t, () => {
    if (!world) return;
    if (t) towerUpFx(t, evo, false);
    else cardBurst(c);
  });
  pickedCardBtn = null;
  setTimeout(() => { $("cards").hidden = true; cardsShown = null; startResume(); }, 380);
}
// 재개: 1초 뒤(그동안 탑이 커지는 모습이 보인다)
function startResume() { mode = "resume"; resumeT = 1; closePanels(); }
function closePanels() { disarm(); ["build", "info", "cards"].forEach(id => { $(id).hidden = true; }); focusPad = -1; }

// 케이크 0: 한 판에 한 번 구조 문제
function openRescue() {
  mode = "quiz"; closePanels(); say("케이크를 다 가져갔어요!", true);
  const done = () => { const snap = prepSpell(); E.rescue(world); armSpell(snap, true, "구조 마법!"); handleEvents(); startSpell(); wandT = 2.2; hudKey = ""; hud(); say("구조 마법! 케이크 " + L.RESCUE_CAKE + "조각 + 괴물 모두 방울로", true); startResume(); };
  if (!GameQuiz) { done(); return; }
  GameQuiz.ask({
    kid: L.PILOTS[pilot].kid, voice: soundOn, title: "케이크를 다 가져갔어요 · 맞히면 케이크 " + L.RESCUE_CAKE + "조각!", hint: "맞히면 화면의 괴물도 모두 방울에 실려 가요", theme: QUIZ_THEME, pace: "quick",
    onWrong: () => sfx.no(),
    onCorrect: r => { E.recordQuiz(world, r.firstTry); return "구조 마법!"; },
    onDone: () => { if (mode !== "quiz") return; done(); },
  });
}

/* ---------- 판 시작·끝 ---------- */
function begin(opts = {}) {
  DEMO = false;
  disarm(); dropBuildQuiz(); if (GameQuiz) { GameQuiz.close(); GameQuiz.setKid(L.PILOTS[pilot].kid); }
  if (opts.kid != null) pilot = opts.kid;
  if (opts.map) mapId = opts.map;
  if (!L.openMaps(save.wins).includes(mapId)) mapId = "field";
  world = E.createWorld({ kid: pilot, map: mapId, badges: L.openBadges(save.solved) });
  ["start", "over", "cards", "pause", "dex", "build", "info"].forEach(id => { $(id).hidden = true; });
  $("hud").hidden = false; $("ctrl").hidden = false; hudKey = ""; hud();
  runSaved = false; banner = ""; bannerT = 0; speed = 1; fxList = []; flash = 0; paintFast(); saidOwl = false; saidPad = false;
  resetJuice();
  audio(); last = performance.now(); mode = "play"; layoutCtrl(); measureHud();
  $("tip").textContent = "";
  // 첫 탑 안내: 처음 하는 아이는 바로, 해 본 아이는 4초 동안 안 세우면 화살표
  const b = save.best[L.PILOTS[pilot].kid], veteran = !!(b && b.runs);
  guide = { pad: guidePad(), t: 0, wait: veteran ? 4 : 0 };
  if (guide.pad < 0) guide = null;
  if (!guide || veteran) say(world.map.name + "을 지켜요! 빈 받침을 눌러 탑을 세워요", true);
}
// 괴물이 들어오는 길 시작에 가장 가까운 빈 받침
function guidePad() {
  const s = world.paths[0].pts[0]; let best = -1, bd = Infinity;
  for (const p of world.pads) { if (p.tower) continue; const d = (p.x - s[0]) ** 2 + (p.y - s[1]) ** 2; if (d < bd) { bd = d; best = p.i; } }
  return best;
}
/* ---------- 처음 화면 시연: 진짜 엔진·그리기를 그대로, 소리 끔·문제 없음·저장 없음 ---------- */
function startDemo() {
  DEMO = true; guide = null;
  resetJuice(); fxList = []; flash = 0; bannerT = 0; banner = ""; speed = 1; focusPad = -1; wandT = 0;
  world = E.createWorld({ kid: pilot, map: mapId });
  world.owl = null; world.gems = 0; world.events.length = 0;
  for (const [k, lv] of [["fire", 2], ["bolt", 1]]) { const i = E.bestPad(world, k); if (i >= 0) E.placeTower(world, i, k, lv); }
  // 파도는 시연이 직접 낸다: 끝나지 않는 파도(먼 뒤 가짜 줄 하나로 파도 끝·부엉이를 막음), 괴물은 아래 demoStep 이 조금씩
  world.wave = 2; world.phase = "wave"; world.queue = [{ at: 1e9, kind: "slime" }]; world.midOwl = true;
  demoSpawnT = 0.2;
}
const DEMO_KINDS = ["slime", "slime", "imp", "shell", "bat", "imp", "slime", "ghost"];
let demoSpawnT = 0, demoSpawnN = 0;
function demoStep(dt) {
  const w = world, n = Math.max(1, Math.ceil(dt / 0.034));
  quiet = true;
  try {
    for (let i = 0; i < n && world === w; i++) {
      demoSpawnT -= dt / n;
      if (demoSpawnT <= 0) {           // 길 위에 괴물 3~6마리쯤 걸어 다니게(시연에서만 조금 더 튼튼하게)
        demoSpawnT = w.monsters.length < 3 ? 0.55 : 1.1;
        if (w.monsters.length < 6) { const e = E.spawnMonster(w, DEMO_KINDS[demoSpawnN++ % DEMO_KINDS.length]); if (e) { e.hp = e.max = e.max * 2.2; } }
      }
      w.waveT = 0;
      E.stepWorld(w, dt / n);
      for (const e of w.events) {
        if (e.type === "hit") hitEffect(e);
        else if (e.type === "shot") onShot(e);
        else if (e.type === "home" && e.via !== "storm") killFx(e.x, e.y, e.kind);
      }
      w.events.length = 0;
      w.pending = null; w.cake = w.cakeMax; w.owl = null; w.gems = 0;   // 끝나지 않는 시연
    }
  } finally { quiet = false; }
  if (w.over || w.phase !== "wave") startDemo();   // 혹시 끝나면 처음부터
}
function endRun(quit) {
  if (DEMO || runSaved || !world) return null;
  runSaved = true;
  const rec = E.runRecord(world);
  if (quit) rec.result = "quit";
  const r = L.applyRun(save, rec);
  save = r.save; save.map = mapId; writeSave();
  return { rec, r };
}
function showOver() {
  mode = "over"; disarm(); dropBuildQuiz(); if (GameQuiz) GameQuiz.close();
  closePanels(); $("pause").hidden = true; $("ctrl").hidden = true; layoutCtrl();
  const out = endRun(false); if (!out) return;
  const { rec, r } = out, win = rec.result === "win";
  if (win) sfx.win();
  $("overTitle").textContent = win ? "케이크를 지켰어요! 파도 " + L.WAVES + "개 성공" : "괴물들이 케이크를 다 가져갔어요. 파도 " + rec.wave + "개를 막았어요!";
  // 문제를 맞혀서 얻은 것: 맨 위에 크게
  const quizBox = rec.solved
    ? '<div class="quizwin"><p class="qw-title">문제를 맞혀서 얻은 것</p><div class="qw-row"><span><b>' + rec.solved + '</b>문제</span><span><b>' + (rec.quizTowers || 0) + '</b>탑</span><span><b>' + rec.blasts + '</b>대마법</span><span><b>' + rec.cards + '</b>카드</span><span><b>' + rec.blastSent + "</b>마리 방울</span></div>" + (rec.blastSent ? '<p class="qw-sub">대마법으로 괴물 ' + rec.blastSent + "마리를 한꺼번에 돌려보냈어요</p>" : "") + "</div>"
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
  disarm(); dropBuildQuiz(); if (GameQuiz) GameQuiz.close();
  mode = "start"; world = null; resetJuice();
  ["over", "cards", "pause", "dex", "build", "info"].forEach(id => { $(id).hidden = true; });
  $("hud").hidden = true; $("ctrl").hidden = true; layoutCtrl(); paintStart(); $("start").hidden = false; bgKey = "";
  startDemo();
}

/* ---------- 이벤트 → 소리·글자 ---------- */
/* ---------- 효과 그림 fx_*.webp (4x2 = 8컷, 순검정 바탕) ----------
   불러올 때 한 번만 검정 → 투명으로 바꾼 시트를 만들어 두고(alpha = max(r,g,b), 색은 alpha 로 나눠 되돌림),
   그릴 때는 보통으로 한 번 + lighter 로 약하게 한 번(밝은 잔디 위에서도 색이 살아 있게). 시트가 없으면 아무것도 안 그린다(도형 효과는 그대로). */
// burst: 비눗방울 퐁 + 별 폭죽(괴물을 돌려보낼 때), nova: 금빛 큰 별 폭발(변신·대장). 한 장짜리: circle 마법진, comet 별똥별, flare 빛살
const FX = {}, FX_NAMES = ["fire", "ice", "bolt", "wind", "light", "mega", "burst", "nova"], FXI = {};
function keyBlack(im, maxW = 0) {
  try {
    // maxW: 효과 시트는 가로 768(칸 192px)로 줄여 둔다 — 그릴 때 큰 칸을 줄이는 비용이 커서(측정)
    const sc = maxW && im.width > maxW ? maxW / im.width : 1;
    const c = document.createElement("canvas"); c.width = Math.round(im.width * sc); c.height = Math.round(im.height * sc);
    const x = c.getContext("2d"); x.drawImage(im, 0, 0, c.width, c.height);
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
// getImageData 로 읽은 캔버스는 브라우저가 CPU 쪽에 두어서, 그릴 때마다 큰 그림을 다시 올린다(측정: 효과 그림이 가장 큰 비용).
// 그래서 한 번 바꾼 뒤 ImageBitmap(없으면 새 캔버스로 복사)으로 옮겨 GPU 에 머물게 한다.
function settle(c, done) {
  if (window.createImageBitmap) createImageBitmap(c).then(done, () => done(copyCanvas(c)));
  else done(copyCanvas(c));
}
function copyCanvas(c) { const d = document.createElement("canvas"); d.width = c.width; d.height = c.height; d.getContext("2d").drawImage(c, 0, 0); return d; }
FX_NAMES.forEach((n, i) => {
  const im = new Image();
  im.onload = () => setTimeout(() => { const c = keyBlack(im, n === "mega" ? 1024 : 768); if (c) settle(c, b => { FX[n] = { c: b, cell: b.width / 4 }; }); }, 40 + i * 30);   // 한꺼번에 몰리지 않게
  im.src = "art/fx_" + n + ".webp?v=1";
});
["circle", "comet", "flare"].forEach((n, i) => {
  const im = new Image();
  im.onload = () => setTimeout(() => { const c = keyBlack(im); if (c) settle(c, b => { FXI[n] = b; if (n === "flare") TX.flare = parts.reg(b); }); }, 320 + i * 40);
  im.src = "art/fx_" + n + ".webp?v=1";
});
let fxList = [];
// size: 논리 칸(map) 또는 화면 px(screen). dur 초 동안 8컷.
function addFx(name, x, y, size, { dur = 0.4, rot = 0, screen = false, alpha = 1, oy = 0, f0 = 0 } = {}) {
  if (!FX[name]) return null;
  const cap = Math.max(10, Math.round(FX_MAX * (0.25 + quality * 0.75)));
  if (fxList.length >= cap) { const i = fxList.findIndex(f => !f.screen); fxList.splice(i >= 0 ? i : 0, 1); }   // 큰 충격파는 남기고 오래된 것부터
  const f = { name, x, y, size, t: 0, dur, rot, screen, alpha, oy, f0 };   // 맵 효과는 x,y 가 월드 좌표, oy 는 화면 위쪽 어긋남
  fxList.push(f); return f;
}
function drawFxItem(f) {
  const S = FX[f.name]; if (!S) return;
  const fr = Math.min(7, f.f0 + Math.floor(f.t / f.dur * (8 - f.f0))), cell = S.cell, sx = (fr % 4) * cell, sy = Math.floor(fr / 4) * cell, h = f.size / 2;
  const px = f.screen ? f.x : SX(f.x, f.y), py = f.screen ? f.y : SY(f.x, f.y) + f.oy;
  if (f.rot) { ctx.save(); ctx.translate(px, py); ctx.rotate(f.rot); }
  const dx = f.rot ? -h : px - h, dy = f.rot ? -h : py - h;
  ctx.globalAlpha = f.alpha; ctx.drawImage(S.c, sx, sy, cell, cell, dx, dy, f.size, f.size);
  if (quality >= 0.6 || f.screen) { ctx.globalCompositeOperation = "lighter"; ctx.globalAlpha = f.alpha * 0.42; ctx.drawImage(S.c, sx, sy, cell, cell, dx, dy, f.size, f.size); }
  ctx.globalCompositeOperation = "source-over"; ctx.globalAlpha = 1;
  if (f.rot) ctx.restore();
}
// 맞는 순간: 단계가 오를수록 크게(1단계 ≈ 괴물 1.2배 → 5단계 ≈ 2.4배), 갈림길 탑은 한 번 더 크게 + 살짝 회전
function hitEffect(e) {
  if (spellBusy() || clock < bossFinU) return;      // 큰 장면 동안은 보통 공격의 효과 그림을 쉰다(그 장면이 돋보이고 가볍게)
  const lvK = 1.2 + (Math.max(1, e.lv) - 1) * 0.3, evo = e.lv >= 3 && e.br;
  let size = 46 * VS * lvK * (evo ? 1.18 : 1);
  if (e.kind === "ice") size = Math.max(size, e.R * 1.7);                 // 둘레 공격: 범위에 맞춰
  if (e.kind === "fire" && e.R) size = Math.max(size, e.R * 2.4);         // 화산: 터지는 범위
  addFx(e.kind, e.x, e.y, size * (e.kind === "bolt" ? 0.65 : 1.2) * (e.kind === "ice" || e.R ? AS : 1), { oy: -12, dur: e.kind === "ice" ? 0.55 : 0.45, rot: evo ? (e.br === "a" ? 0.5 : -0.5) + Math.random() * 0.4 : 0, alpha: e.kind === "ice" ? 0.85 : 1 });
  onHit(e);
}
/* ---------- 탑 공격 효과(쏠 때·맞을 때) ----------
   모두 화면 논리 좌표. 단계(lv)가 오를수록 빛 크기·입자 수·소리가 커지고, 3단계부터(갈림길) 모양이 달라진다. */
const topOf = lv => L.TOWER_W[lv - 1] * 1.15 * VS;
const sdir = (dx, dy) => (ROT ? Math.atan2(dx, -dy) : Math.atan2(dy, dx));   // 월드 방향 → 화면 각도
const spellBusy = () => !!(spell && spell.on && spell.big && spell.t < spell.T);
function monAt(x, y) { for (const m of world.monsters) if (Math.abs(m.x - x) < 0.6 && Math.abs(m.y - y) < 0.6) return m; return null; }
function onShot(e) {
  if (sfx[e.kind]) sfx[e.kind](e.lv, e.br);
  const t = world.pads[e.pad] && world.pads[e.pad].tower; if (t) t._kick = clock;
  if (spellBusy()) return;           // 대마법 장면 동안은 보통 공격 입자를 쉬게(대마법이 돋보이고 입자 상한도 아낀다)
  const lv = e.lv || 1, bx = SX(e.x, e.y), by = SY(e.x, e.y), sx = bx, sy = by - topOf(lv);
  if (e.kind === "fire") {
    const a = t ? sdir(Math.cos(t.aim), Math.sin(t.aim)) : -Math.PI / 2;
    glowAt(sx, sy, e.br === "a" ? TX.gPink : TX.gFire, 20 + lv * 6, 56 + lv * 16, 0.16);
    glowAt(sx, sy, TX.gWhite, 8, 24 + lv * 5, 0.09);
    sparks(sx, sy, QN(2 + lv), lv >= 3 ? TX.cGold : TX.cFire, 240 + lv * 30, 2.5 + lv * 0.5, 0.05, 0, a, 0.9, 1);
  } else if (e.kind === "ice") {
    glowAt(sx, sy, TX.gIce, 30, 70 + lv * 16, 0.32);
    spinBurst(sx, sy, QN(2 + lv), TX.flake, 90, 14 + lv * 2, 0.6, 0, 40);
  } else if (e.kind === "bolt") {
    const fb = world.fx.bolts; if (fb.length && !fb[fb.length - 1]._e) { fb[fb.length - 1]._e = 1; addEcho(fb[fb.length - 1]); }
    glowAt(sx, sy, TX.gBolt, 30, 80 + lv * 18, 0.2);
    glowAt(sx, sy, TX.gWhite, 10, 30 + lv * 6, 0.1);
    sparks(sx, sy, QN(3 + lv), TX.cYellow, 260, 2 + lv * 0.4, 0.04, 0, null, TAU, 1);
  } else if (e.kind === "wind") {
    const cy = by - 18 * VS;
    ringAt(bx, cy, TX.cWind, 14 * VS, (52 + lv * 12) * VS, 0.45, 6 + lv);
    for (let i = 0, n = QN(3 + lv); i < n; i++) { const a = rr() * TAU, r = 22 * VS; pa(P_SPIN, TX.leaf, bx + Math.cos(a) * r, cy + Math.sin(a) * r * 0.5, -Math.sin(a) * 190, Math.cos(a) * 90 - 70, 0.6, 16, 8, 0, 1.4, 0, rr() * TAU, 12); }
    for (const g of world.fx.gusts) {
      if (g._s) continue; g._s = 1;
      const x0 = SX(g.x0, g.y0), y0 = SY(g.x0, g.y0), x1 = SX(g.x1, g.y1), y1 = SY(g.x1, g.y1), a = Math.atan2(y1 - y0, x1 - x0), d = Math.hypot(x1 - x0, y1 - y0);
      for (let i = 0, n = QN(2 + lv); i < n; i++) { const k = rr() * 0.5, s = d / 0.3; pa(P_STREAK, TX.cWind, x0 + (x1 - x0) * k + (rr() - 0.5) * 16, y0 + (y1 - y0) * k + (rr() - 0.5) * 16, Math.cos(a) * s, Math.sin(a) * s, 0.28, 3 + lv * 0.6, 0.06, 0, 1.5, 0); }
    }
  } else if (e.kind === "light") {
    glowAt(sx, sy, TX.gLight, 40, 110 + lv * 26, 0.28);
    if (TX.flare != null) pa(P_SPIN, TX.flare, sx, sy, 0, 0, 0.34, (70 + lv * 22) * VS, (120 + lv * 30) * VS, 0, 0, 1, rr() * TAU, 1.5);
    for (const b of world.fx.beams) {
      if (b._s) continue; b._s = 1;
      const x0 = SX(b.x0, b.y0), y0 = SY(b.x0, b.y0), x1 = SX(b.x1, b.y1), y1 = SY(b.x1, b.y1);
      for (let i = 0, n = QN(4 + lv); i < n; i++) { const k = 0.1 + rr() * 0.9; pa(P_SPIN, TX.star[(i + lv) % 4], x0 + (x1 - x0) * k, y0 + (y1 - y0) * k, (rr() - 0.5) * 60, -40 - rr() * 60, 0.5 + rr() * 0.3, 12 + lv * 2.5, 4, 0, 1, 0, rr() * TAU, 6); }
    }
  }
}
function onHit(e) {
  if (spellBusy()) return;
  const lv = e.lv || 1, sx = SX(e.x, e.y), sy = SY(e.x, e.y) - 12, m = e.kind === "ice" ? null : monAt(e.x, e.y);
  if (m) m._hk = TX.kind[e.kind];
  // 길 바닥 자국(괴물 아래, 1~1.5초에 걸쳐 사라짐)
  if (e.kind === "fire") decalAt(sx, sy + 14, "fire", e.R ? e.R * 1.7 : 44 + lv * 7, lv >= 4 ? 1.5 : 1.1, 0.5);
  else if (e.kind === "ice") decalAt(sx, sy + 12, "ice", (e.R || 100) * 1.5, 1.1, 0.3);
  else decalAt(sx, sy + 14, e.kind, 40 + lv * 6, 1.0, e.kind === "wind" ? 0.4 : 0.5);
  if (e.kind === "light" && lv >= 4) { if (cols.length >= 16) cols.shift(); cols.push({ x: sx, y: sy + 14, t: 0, T: 0.4, w: 20 * VS, tex: GLOW.gold }); }   // 하늘에서 내려오는 금빛 기둥
  // 남는 빛 뭉게(0.5~0.8초) — 맞은 자리가 잠깐 더 빛난다
  const pt = e.kind === "fire" ? (e.br === "a" ? TX.gPink : TX.gEmber) : e.kind === "bolt" ? TX.gBolt : e.kind === "wind" ? TX.gWind : e.kind === "light" ? TX.gLight : 0;
  if (pt) for (let i = 0, n = QN(1 + (lv >> 1)); i < n; i++) pa(P_GLOW, pt, sx + (rr() - 0.5) * 16, sy + (rr() - 0.5) * 10, (rr() - 0.5) * 30, -15 - rr() * 20, 0.5 + rr() * 0.3, 14 + lv * 3, 40 + lv * 9, 0, 1, 0, 0, 0, 0.55);
  if (e.kind === "fire") {
    glowAt(sx, sy, e.br === "a" ? TX.gPink : TX.gFire, 30, 64 + lv * 18, 0.22);
    glowAt(sx, sy, TX.gWhite, 10, 30 + lv * 7, 0.1);
    sparks(sx, sy, QN(4 + lv * 2), lv >= 3 ? TX.cGold : TX.cFire, 200 + lv * 40, 2.5 + lv * 0.5, 0.045, 380);
    for (let i = 0, n = QN(1 + lv); i < n; i++) pa(P_GLOW, TX.gEmber, sx + (rr() - 0.5) * 14, sy, (rr() - 0.5) * 80, -40 - rr() * 70, 0.5, 14 + lv * 3, 3, -30, 1.5, 1);
    if (m) m._burnU = clock + 0.6 + lv * 0.12;
    if (e.R) {                       // 화산: 둘레까지 펑
      ringAt(sx, sy + 8, TX.cOrange, e.R * 0.3, e.R * 1.15, 0.45, 10 + lv);
      ringAt(sx, sy + 8, TX.cGold, e.R * 0.2, e.R * 0.8, 0.3, 6);
      for (let i = 0, n = QN(5 + lv * 2); i < n; i++) { const a = rr() * TAU, s = 120 + rr() * 200; pa(P_GLOW, TX.gFire, sx, sy, Math.cos(a) * s, Math.sin(a) * s - 120, 0.55, 22 + lv * 3, 4, 420, 1, 0); }
      if (lv >= 4) once("volcShake", 400, () => shake(0.05 + (lv - 3) * 0.03));
      once("fhitB", 260, () => synth.fireHit(lv, true));
    } else if (lv >= 2) once("fhit", 110, () => synth.fireHit(lv, false));
  } else if (e.kind === "ice") {
    const R = e.R || 100, cy = sy + 12;
    glowAt(sx, cy, TX.gIce, R * 0.5, R * 2.1, 0.45, 0, 0.42);
    ringAt(sx, cy, TX.cWhite, R * 0.2, R, 0.4, 4 + lv);
    ringAt(sx, cy, TX.cSky, R * 0.1, R * 0.75, 0.5, 3 + lv * 0.6);
    for (let i = 0, n = QN(5 + lv * 2); i < n; i++) { const a = rr() * TAU, s = R / 0.42; pa(P_SPIN, TX.shard, sx, cy, Math.cos(a) * s, Math.sin(a) * s * 0.62, 0.42, 18 + lv * 2.5, 10, 0, 1.4, 0, a + Math.PI / 2, 0); }
    for (let i = 0, n = QN(2 + lv); i < n; i++) { const a = rr() * TAU, r = rr() * R; pa(P_SPIN, TX.flake, sx + Math.cos(a) * r, cy + Math.sin(a) * r * 0.6, (rr() - 0.5) * 30, -20 - rr() * 30, 0.8, 16 + lv * 2, 6, 0, 0.5, 0, rr() * TAU, 3); }
    if (e.br === "a") for (let i = 0, n = QN(6 + lv * 2); i < n; i++) { const a = rr() * TAU, r = R * (0.4 + rr() * 0.6), sp = 220; pa(P_SPIN, TX.flake, sx + Math.cos(a) * r, cy + Math.sin(a) * r * 0.6, -Math.sin(a) * sp, Math.cos(a) * sp * 0.6, 0.6, 14 + lv * 2, 6, 0, 1, 0, 0, 8); }
  } else if (e.kind === "bolt") {
    glowAt(sx, sy, TX.gBolt, 24, 64 + lv * 16, 0.17);
    glowAt(sx, sy, TX.gWhite, 10, 30 + lv * 7, 0.1);
    sparks(sx, sy, QN(3 + lv * 2), (lv & 1) ? TX.cYellow : TX.cWhite, 280 + lv * 30, 2 + lv * 0.45, 0.035, 0, null, TAU, 1);
    if (m) m._zapU = clock + 0.4;
    if (e.br === "b") { ringAt(sx, sy, TX.cYellow, 10, 60 + lv * 12, 0.3, 8); once("stormShake", 300, () => shake(0.08 + lv * 0.01)); }
  } else if (e.kind === "wind") {
    let dir = -Math.PI / 2;
    for (const g of world.fx.gusts) if (Math.abs(g.x1 - e.x) < 0.6 && Math.abs(g.y1 - e.y) < 0.6) { dir = sdir(g.x1 - g.x0, g.y1 - g.y0); break; }
    glowAt(sx, sy, TX.gWind, 20, 60 + lv * 16, 0.3, 0, 0.7);
    ringAt(sx, sy, TX.cWind, 8, 40 + lv * 9, 0.3, 5);
    for (let i = 0, n = QN(3 + lv); i < n; i++) { const a = dir + (rr() - 0.5) * 1.2, s = 160 + rr() * 160; pa(P_SPIN, TX.leaf, sx, sy, Math.cos(a) * s, Math.sin(a) * s, 0.6, 15, 7, 0, 2, 0, rr() * TAU, 12); }
    sparks(sx, sy, QN(3 + lv), TX.cWind, 320, 3 + lv * 0.5, 0.06, 0, dir, 0.7, 0);
    if (m) { m._pushU = clock + 0.4; m._pdir = dir; }
  } else if (e.kind === "light") {
    glowAt(sx, sy, TX.gLight, 30, 74 + lv * 18, 0.22);
    glowAt(sx, sy, TX.gWhite, 10, 34 + lv * 6, 0.12);
    spinBurst(sx, sy, QN(2 + lv), TX.star, 170, 16 + lv * 2, 0.5);
    if (m) m._litU = clock + 0.25;
  }
}

/* ---------- 돌려보내기·콤보·한꺼번에·대장 ---------- */
let combo = 0, comboAt = -9, comboPop = 0, multiShown = 0, multiAt = -9, multiText = "", multiCol = "#fff", multiPop = 0;
const killTimes = new Float32Array(16).fill(-9); let killIdx = 0;
function comboStep(x, y) {
  if (clock - comboAt > 1.8) combo = 0;
  combo++; comboAt = clock; comboPop = 1;
  killTimes[killIdx++ & 15] = clock;
  let c = 0; for (let i = 0; i < 16; i++) if (clock - killTimes[i] < 0.5) c++;
  if (clock - multiAt > 0.7) multiShown = 0;
  const th = c >= 8 ? 8 : c >= 5 ? 5 : c >= 3 ? 3 : 0;
  if (th && th > multiShown) {
    multiShown = th; multiAt = clock;
    multiText = "한꺼번에 " + c + "마리!"; multiCol = th >= 8 ? "#ff9ee0" : th >= 5 ? "#ffd24a" : "#ffffff"; multiPop = 1;   // 싸움 위가 아니라 콤보 옆 고정 자리에
    once("multi", 250, () => synth.multi(th)); shake(0.08 + th * 0.02);
    if (th >= 5) hitStop = Math.max(hitStop, 0.05);
  }
}
function killFx(x, y, kind) {
  const sx = SX(x, y), sy = SY(x, y) - 14 * VS, M = L.MONSTERS[kind];
  if (!DEMO) comboStep(x, y);
  addFx("burst", x, y, 118 * VS, { oy: -14 * VS, dur: 0.42, f0: 3 });   // 방울은 이미 그려지니 별 폭죽 칸(4~8)만
  glowAt(sx, sy, TX.gWhite, 20, 74 * VS, 0.18);
  ringAt(sx, sy, TX.cWhite, 8, 48 * VS, 0.35, 5);
  confetti(sx, sy, QN(6));
  spinBurst(sx, sy, QN(3), TX.star, 210, 16, 0.6, 300, 60);
  if (!DEMO) gemsToHud(sx, sy, M.gem > 4 ? 3 : M.gem > 2 ? 2 : 1);
  sfx.home(combo);
}
let bossFinU = -9;   // 대장 마무리 장면이 끝나는 화면 시각(그동안 안내 글·수정 숫자 숨김)
const sched = [];   // { at(화면 시계), fn } — 대장 폭발처럼 몇 단계로 나눈 효과
function later(d, fn) { sched.push({ at: clock + d, fn }); }
function bossPhaseFx(e) {
  const sx = SX(e.x, e.y), sy = SY(e.x, e.y) - 40 * VS;
  addFx("nova", e.x, e.y, 250 * VS, { oy: -40 * VS, dur: 0.6 });
  ringAt(sx, sy, TX.cPink, 20, 170 * VS, 0.6, 14); ringAt(sx, sy, TX.cWhite, 10, 120 * VS, 0.45, 8);
  confetti(sx, sy, QN(12), 300); spinBurst(sx, sy, QN(8), TX.star, 260, 22, 0.8, 200);
  shake(0.4); hitStop = Math.max(hitStop, 0.07); flashFx(0.12, "255,220,240"); synth.bossPhase();
  callout(e._ph === 1 ? "대왕이 휘청휘청!" : "조금만 더!", { wx: e.x, wy: e.y, size: 36, col: "#ff9ee0", rise: 70, T: 1.4 });
}
function checkBoss() {
  for (const e of world.monsters) {
    if (e.kind !== "boss" || e.gone) continue;
    const r = e.hp / e.max, ph = r < 0.34 ? 2 : r < 0.67 ? 1 : 0;
    if ((e._ph || 0) < ph) { e._ph = ph; bossPhaseFx(e); }
  }
}
function bossDownFx(x, y) {
  if (mode === "play") slowT = 0.9;
  hitStop = Math.max(hitStop, 0.12); shake(0.7); flashFx(0.2, "255,236,170"); synth.bossDown(); bossFinU = clock + 1.8;
  callout("케이크 대왕을 집으로 보냈어요!", { size: 36, T: 2.2, rise: 0, top: true });
  const sx = SX(x, y), sy = SY(x, y) - 40 * VS;
  [0, 0.25, 0.5, 0.8].forEach((d, i) => later(d, () => {
    const ox = (rr() - 0.5) * 70, oy = (rr() - 0.5) * 50;
    // 흰 심이 길·탑을 하얗게 덮지 않게: 작고(반투명) 짧게, 둘레는 파스텔 고리
    addFx("nova", x + ox, y + oy, (150 + i * 40) * VS * AS, { oy: -40 * VS, dur: 0.5, alpha: 0.7 });
    ringAt(sx + ox, sy + oy, i & 1 ? TX.cGold : TX.cPink, 20, (150 + i * 50) * VS * AS, 0.6, 10);
    confetti(sx + ox, sy + oy, QN(10), 340); spinBurst(sx + ox, sy + oy, QN(6), TX.star, 280, 24, 0.9, 200, 80);
    shake(0.3);
  }));
  later(0.9, () => gemsToHud(sx, sy, QN(24)));
}
// 탑이 강해지는 순간(강화·카드·변신·탄생): 빛기둥 + 겹고리 + 솟는 별 + 큰 별 폭발 + 글자
const cols = [];   // 빛기둥 { x, y, t, T, w, tex }
function towerUpFx(t, evo, birth = false, small = false) {
  if (!world) return;
  const gx = SX(t.x, t.y), gy = SY(t.x, t.y), cy = gy - 34 * VS, lc = TX.lv[t.lv - 1];
  if (cols.length >= 16) cols.shift();
  cols.push({ x: gx, y: gy, t: 0, T: evo ? 1.1 : small ? 0.6 : 0.85, w: (evo ? 64 : small ? 34 : 48) * VS, tex: evo ? GLOW.gold : LV_GLOW[t.lv - 1] });
  ringAt(gx, cy, lc, 10, (evo ? 200 : small ? 90 : 140) * VS * AS, 0.6, evo ? 16 : 10);
  ringAt(gx, cy, TX.cWhite, 10, (evo ? 150 : small ? 60 : 100) * VS * AS, 0.45, 8);
  for (let i = 0, n = QN(evo ? 28 : small ? 8 : 16); i < n; i++) { const a = i / n * TAU; pa(P_SPIN, TX.star[i % 4], gx + Math.cos(a) * 30, gy - 10 + Math.sin(a) * 12, Math.cos(a) * 130, -170 - rr() * 220, 0.9, 22, 6, 170, 1, 0, rr() * TAU, 6); }
  sparks(gx, cy, QN(evo ? 16 : 8), TX.cGold, 400, 3, 0.05, 0, -Math.PI / 2, 1.4, 1);
  if (!birth) {
    addFx(evo ? "nova" : "mega", t.x, t.y, (evo ? 300 : 210) * VS * AS, { oy: -50 * VS, dur: 0.7, alpha: 0.85 });
    world.fx.grow.push({ x: t.x, y: t.y, t: 0, lv: t.lv }); if (world.fx.grow.length > 8) world.fx.grow.shift();
    t.grow = 1; t.flash = 1.2;
    callout(evo ? "변신!" : t.lv + "단계!", { wx: t.x, wy: t.y, size: evo ? 46 : 38, col: evo ? "#ffd24a" : L.LV_COLORS[t.lv - 1], rise: 60, T: 1.2 });
  }
  shake(evo ? 0.4 : small ? 0.1 : 0.22); if (!small) flashFx(evo ? 0.2 : 0.12, "255,240,180");
  synth.levelUp(t.lv, evo);
}
// 빠른 주문·케이크 카드: 탑마다 금빛 고리 / 성에 케이크 폭죽
function cardBurst(c) {
  if (c.type === "spell") {
    for (const t of world.towers) { const gx = SX(t.x, t.y), gy = SY(t.x, t.y) - 34 * VS; ringAt(gx, gy, TX.cGold, 10, 110 * VS, 0.55, 10); glowAt(gx, gy, TX.gGold, 30, 150 * VS, 0.5, 0, 0.8); sparks(gx, gy, QN(6), TX.cYellow, 320, 3, 0.05, 0, -Math.PI / 2, 1.2, 1); }
    callout("빠른 주문!", { size: 40, col: "#ffd24a", T: 1.3 });
  } else {
    const c0 = world.map.castle, gx = SX(c0.x, c0.y), gy = SY(c0.x, c0.y) - 40;
    confetti(gx, gy, QN(24), 340); spinBurst(gx, gy, QN(8), TX.heart, 240, 22, 0.9, 200, 80); ringAt(gx, gy, TX.cPink, 10, 140 * VS, 0.6, 12);
  }
  shake(0.2); flashFx(0.12, "255,240,180"); synth.levelUp(2, false);
}
// 고른 카드가 날아가는 길(진짜 카드 단추를 몸에서 떼어 날린다 — 그림 캔버스가 그대로 보인다)
let cardTrail = null;
function flyCard(b, c, t, done) {
  if (!b || !b.animate) { done(); return; }
  const r = b.getBoundingClientRect(); if (!r.width) { done(); return; }
  let tx, ty;
  if (t) { const p = toScreen(t.x, t.y); tx = p.x; ty = p.y - 40 * VS * mapS; }
  else { const q = $(c.type === "cake" ? "cake" : "wave").getBoundingClientRect(); tx = q.left + q.width / 2; ty = q.top + q.height / 2; }
  b.classList.add("fly"); b.style.left = r.left + "px"; b.style.top = r.top + "px"; b.style.width = r.width + "px"; b.style.height = r.height + "px";
  document.body.appendChild(b);
  const dx = tx - (r.left + r.width / 2), dy = ty - (r.top + r.height / 2);
  synth.cardFly();
  let anim = null;
  try {
    anim = b.animate([
      { transform: "translate(0px,0px) scale(1) rotate(0deg)", opacity: 1 },
      { offset: 0.28, transform: "translate(" + (dx * 0.04) + "px," + (dy * 0.04 - 40) + "px) scale(1.15) rotate(-8deg)", opacity: 1 },
      { transform: "translate(" + dx + "px," + dy + "px) scale(.16) rotate(25deg)", opacity: 0.85 },
    ], { duration: RM ? 300 : 620, easing: "cubic-bezier(.55,0,.8,.25)", fill: "forwards" });
  } catch (_) { anim = null; }
  cardTrail = b;
  let fin = false;
  const end = () => { if (fin) return; fin = true; b.remove(); if (cardTrail === b) cardTrail = null; done(); };
  if (anim) anim.onfinish = end;
  setTimeout(end, RM ? 450 : 800);
}

/* ---------- 대마법 장면(한 번에 맞혔을 때): 어둡게 → 마법사 등장 → 마법진 → 별똥별이 길을 따라 차례로 → 쿵 → 남은 빛 ---------- */
const SPELL_NAMES = ["파랑 별똥 소나기", "분홍 하트 별비", "주황 불꽃별 축제", "노랑 꿀별 소나기"];
const KID_GLOW = () => [TX.gSky, TX.gPink, TX.gFire, TX.gGold];
const KID_COL = () => [TX.cSky, TX.cPink, TX.cOrange, TX.cGold];
let spell = null, comets = [];
const PT2 = { x: 0, y: 0, dx: 0, dy: 0 };
// 대마법 직전 괴물 자리(성문에 가까운 쪽부터 = 마법이 성에서 길을 거슬러 퍼진다)
function prepSpell() {
  return world.monsters.filter(e => !e.gone).sort((a, b) => E.progress(b) - E.progress(a)).map(e => ({ x: e.x, y: e.y, kind: e.kind, boss: e.kind === "boss" }));
}
function armSpell(snap, big, name) {
  world.fx.storm = null;
  const fresh = world.fx.homes.filter(h => h.t === 0 && !h._sp), targets = [];
  for (const s of snap) {
    const h = fresh.find(q => !q._sp && q.x === s.x && q.y === s.y) || null;
    if (h) { h._sp = true; h.delay = 999; }          // 별똥별이 닿을 때까지 그 자리에서 반짝이며 기다린다
    if (h || s.boss) targets.push({ x: s.x, y: s.y, kind: s.kind, boss: s.boss, h, at: 0, done: false, comet: false });
  }
  const n = targets.length, c0 = big ? 0.85 : 0.3, span = big ? Math.min(0.62, 0.07 * n) : Math.min(0.4, 0.045 * n);
  targets.forEach((g, i) => { g.at = c0 + (n > 1 ? span * i / (n - 1) : 0); });
  const deco = [];
  if (big) for (let i = 0, m = QN(12); i < m; i++) {
    const p = world.paths[i % world.paths.length]; L.pathPoint(p, rr() * p.len, PT2);
    deco.push({ x: PT2.x, y: PT2.y, at: 0.62 + rr() * 0.8, done: false, comet: false, deco: true });
  }
  const kid = world.kid;
  spell = { t: 0, on: false, big, name: name || SPELL_NAMES[kid] + "!", who: L.PILOTS[kid].name, kid, art: L.PILOTS[kid].art, targets, deco, T: big ? 2.15 : 1.15, boom: false, glow: false, pops: 0 };
  gemBudget = big ? 22 : 10;
}
function startSpell() {
  if (!spell || spell.on) return;
  spell.on = true; spell.t = 0;
  if (bannerT > 0) bannerT = Math.max(bannerT, spell.T + 1.6);   // 대마법 결과 글은 장면이 끝난 뒤에 보이게
  sfx.blast(spell.big, spell.big ? 0.82 : 0.3);
  shake(spell.big ? 0.15 : 0.1); zoomP = Math.max(zoomP, 0.02);
  // 모으기: 빛 알갱이가 마법사(성)로 빨려 든다(0.45초)
  const c0 = world.map.castle, cx = SX(c0.x, c0.y), cy = SY(c0.x, c0.y) - 70, kg = KID_GLOW()[spell.kid];
  for (let i = 0, n = QN(spell.big ? 32 : 12); i < n; i++) { const a = rr() * TAU, r = 200 + rr() * 160, life = 0.35 + rr() * 0.15; pa(P_GLOW, i & 1 ? kg : TX.gGold, cx + Math.cos(a) * r, cy + Math.sin(a) * r, -Math.cos(a) * r / life, -Math.sin(a) * r / life, life, 26, 8, 0, 0, 1); }
}
function skipSpell() {
  const s = spell; if (!s || !s.on || s.t >= s.T - 0.4) return;
  for (const g of s.targets) if (!g.done) { g.done = true; g.comet = true; if (g.h) g.h.delay = g.h.t; }
  for (const g of s.deco) { g.done = true; g.comet = true; }
  s.boom = true; s.glow = true; s.t = s.T - 0.4; comets.length = 0;
}
function launchComet(g, travel) {
  const x1 = SX(g.x, g.y), y1 = SY(g.x, g.y) - 14 * VS;
  if (comets.length >= 40) comets.shift();
  comets.push({ x0: x1 + 240 + rr() * 140, y0: y1 - 560 - rr() * 140, x1, y1, t: 0, T: travel, big: !g.deco });
}
function spellImpact(g, i) {
  const s = spell, sx = SX(g.x, g.y), sy = SY(g.x, g.y) - 14 * VS, kg = KID_GLOW()[s.kid], kc = KID_COL()[s.kid];
  if (g.deco) {
    glowAt(sx, sy, kg, 20, 90 * VS, 0.28); ringAt(sx, sy, kc, 6, 50 * VS, 0.35, 5);
    sparks(sx, sy, QN(5), TX.cGold, 260, 2.5, 0.04, 200, null, TAU, 1);
    return;
  }
  if (g.h) g.h.delay = g.h.t;     // 이제 방울이 둥실
  addFx("burst", g.x, g.y, (g.boss ? 240 : 115) * VS * AS, { oy: -14 * VS, dur: 0.45, f0: 3 });
  glowAt(sx, sy, kg, 24, (g.boss ? 200 : 96) * VS * AS, 0.3, 1, 0.8);
  ringAt(sx, sy, TX.cWhite, 10, (g.boss ? 140 : 66) * VS * AS, 0.35, 6);
  sparks(sx, sy, QN(5), TX.cGold, 300, 3, 0.045, 260, null, TAU, 1);
  confetti(sx, sy, QN(3), 260);
  if (gemBudget > 0) { gemBudget--; gemsToHud(sx, sy, 1); }
  once("spop", 38, () => synth.pop(s.pops++));
  if (g.boss) shake(0.4);
}
function updateSpell(dt) {
  for (const c of comets) c.t += dt;
  if (comets.length) comets = comets.filter(c => c.t < c.T);
  const s = spell; if (!s || !s.on) return;
  s.t += dt;
  const travel = s.big ? 0.26 : 0.18;
  for (let i = 0; i < s.targets.length; i++) { const g = s.targets[i]; if (!g.comet && s.t >= g.at - travel) { g.comet = true; launchComet(g, travel); } if (!g.done && s.t >= g.at) { g.done = true; spellImpact(g, i); } }
  for (const g of s.deco) { if (!g.comet && s.t >= g.at - travel) { g.comet = true; launchComet(g, travel); } if (!g.done && s.t >= g.at) { g.done = true; spellImpact(g, 0); } }
  if (!s.boom && s.t >= (s.big ? 0.82 : 0.3)) {
    s.boom = true;
    shake(s.big ? 0.7 : 0.3); zoomP = Math.max(zoomP, s.big ? 0.06 : 0.025);
    flashFx(s.big ? 0.24 : 0.12, ["210,235,255", "255,220,240", "255,225,190", "255,245,190"][s.kid]);
    // 파스텔 빛 물결(부드럽고 얇게, lighter, 알파 0.45 이하) — 원색 무지개 띠 대신
    const c0 = world.map.castle, wx = s.big ? SCR_W() / 2 : SX(c0.x, c0.y), wy = s.big ? SCR_H() / 2 : SY(c0.x, c0.y), R = (s.big ? Math.max(SCR_W(), SCR_H()) * 0.62 : 260) * AS;
    for (let i = 0; i < TX.pastel.length; i++) pa(P_RING, TX.pastel[i], wx, wy, 0, 0, 0.6 + i * 0.09, 20 + i * 10, R * (0.45 + i * 0.14), 0, 0, 1, 0, s.big ? 7 - i * 0.8 : 5, 0.36);
    glowAt(wx, wy, TX.gWhite, 60, R * 0.5, 0.3, 1, 0.35);
  }
  if (!s.glow && s.t >= (s.big ? 1.35 : 0.75)) {
    s.glow = true;
    const kg = KID_GLOW()[s.kid], W = SCR_W(), H = SCR_H();
    for (let i = 0, n = QN(s.big ? 40 : 14); i < n; i++) pa(P_GLOW, i & 1 ? kg : TX.gGold, rr() * W, H * (0.2 + rr() * 0.8), (rr() - 0.5) * 30, -40 - rr() * 60, 1 + rr() * 0.6, 10 + rr() * 16, 4, -10, 0.3, 1, 0, 0, 0.9);
    for (let i = 0, n = QN(s.big ? 14 : 5); i < n; i++) pa(P_SPIN, TX.star[i % 4], rr() * W, H * (0.2 + rr() * 0.8), (rr() - 0.5) * 30, -50 - rr() * 50, 1.1, 18, 6, 0, 0.3, 0, rr() * TAU, 3);
  }
  if (s.t >= s.T + 0.45) spell = null;
}
// 장면 밑그림(괴물 위·방울 아래): 어둡게 + 바닥 마법진 + 성의 빛기둥
function drawSpellUnder(k, ox, oy) {
  const s = spell; if (!s || !s.on) return;
  const t = s.t, T = s.T, big = s.big;
  const dimA = (big ? 0.5 : 0.25) * (t < 0.15 ? t / 0.15 : t > T - 0.5 ? Math.max(0, (T - t) / 0.5) : 1);
  if (dimA > 0 && !SKIP.dim) { ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.globalAlpha = dimA; ctx.fillStyle = "#180a3c"; ctx.fillRect(0, 0, canvas.width, canvas.height); ctx.globalAlpha = 1; }
  ctx.setTransform(k, 0, 0, k, ox, oy);
  // 마법진: 큰 마법은 맵 가운데 크게, 작은 마법은 성 앞에 작게
  const c0 = world.map.castle, cx = big ? SCR_W() / 2 : SX(c0.x, c0.y), cy = big ? SCR_H() / 2 + 20 : SY(c0.x, c0.y);
  const a0 = big ? 0.28 : 0.05, kk = Math.max(0, Math.min(1, (t - a0) / 0.4));
  if (kk > 0) {
    const back = 1 + 2.2 * Math.pow(kk - 1, 3) + 1.2 * Math.pow(kk - 1, 2);    // 살짝 넘쳤다 돌아오는 확대
    const R = (big ? Math.min(SCR_W(), SCR_H()) * 0.62 : 150) * back, al = (t > T - 0.6 ? Math.max(0, (T - t) / 0.6) : 1) * (big ? 1 : 0.75);
    const rot = clock * (big ? 0.7 : 1.2), c = Math.cos(rot), sn = Math.sin(rot), sq = 0.58;
    ctx.setTransform(c * k, sn * k * sq, -sn * k, c * k * sq, ox + cx * k, oy + cy * k);
    if (FXI.circle) {
      // 별똥별이 떨어지기 시작하면(0.55초~) 마법진은 0.35 로 물러난다 — 위에서 터지는 별과 방울이 잘 보이게
      const back2 = big ? (t < 0.55 ? 1 : t < 0.75 ? 1 - (t - 0.55) / 0.2 * 0.61 : 0.39) : 0.7;
      ctx.globalAlpha = al * 0.9 * back2; ctx.drawImage(FXI.circle, -R, -R, R * 2, R * 2);
      if (back2 > 0.9 && quality >= 0.6) { ctx.globalCompositeOperation = "lighter"; ctx.globalAlpha = al * 0.45; ctx.drawImage(FXI.circle, -R, -R, R * 2, R * 2); ctx.globalCompositeOperation = "source-over"; }
    } else {
      ctx.globalAlpha = al; ctx.strokeStyle = "#ffe27a"; ctx.lineWidth = 6; ctx.beginPath(); ctx.arc(0, 0, R * 0.95, 0, TAU); ctx.stroke();
      ctx.strokeStyle = PILOT_COLOR[s.kid]; ctx.lineWidth = 4; ctx.beginPath(); ctx.arc(0, 0, R * 0.7, 0, TAU); ctx.stroke();
      ctx.beginPath(); for (let i = 0; i <= 8; i++) { const a = i * TAU * 3 / 8; if (i) ctx.lineTo(Math.cos(a) * R * 0.7, Math.sin(a) * R * 0.7); else ctx.moveTo(Math.cos(a) * R * 0.7, Math.sin(a) * R * 0.7); } ctx.stroke();
    }
    // 바깥에서 거꾸로 도는 점선 고리(움직임)
    ctx.setTransform(Math.cos(-rot * 1.6) * k, Math.sin(-rot * 1.6) * k * sq, -Math.sin(-rot * 1.6) * k, Math.cos(-rot * 1.6) * k * sq, ox + cx * k, oy + cy * k);
    ctx.globalAlpha = al * (t > 0.6 && big ? 0.35 : 0.8); ctx.strokeStyle = "#fff6c0"; ctx.lineWidth = 5; ctx.setLineDash([18, 22]); ctx.beginPath(); ctx.arc(0, 0, R * 1.08, 0, TAU); ctx.stroke(); ctx.setLineDash([]);
    ctx.globalAlpha = 1; ctx.setTransform(k, 0, 0, k, ox, oy);
  }
  // 성 위 마법사의 빛기둥
  const pa_ = Math.max(0, 1 - Math.abs(t - 0.55) / 0.55);
  if (pa_ > 0) { const px = SX(c0.x, c0.y), py = SY(c0.x, c0.y) - 70, pw = 46 * VS; ctx.globalAlpha = pa_; ctx.drawImage(GLOW.purple, px - pw, py - 420, pw * 2, 480); ctx.drawImage(GLOW.white, px - pw * 0.4, py - 380, pw * 0.8, 420); ctx.globalAlpha = 1; }
}
// 별똥별(화면 논리 좌표)
function drawComets() {
  for (const c of comets) {
    const q = c.t / c.T, e = q * q, x = c.x0 + (c.x1 - c.x0) * e, y = c.y0 + (c.y1 - c.y0) * e, a = Math.atan2(c.y1 - c.y0, c.x1 - c.x0);
    const len = (c.big ? 230 : 160) * VS;
    if (FXI.comet) {
      const im = FXI.comet, h = len * im.height / im.width, cs = Math.cos(a), sn = Math.sin(a), k = mapS * dpr;
      ctx.save(); ctx.translate(x, y); ctx.rotate(a);
      ctx.globalAlpha = 1; ctx.drawImage(im, -len * 0.88, -h * 0.48, len, h);
      if (quality >= 0.6) { ctx.globalCompositeOperation = "lighter"; ctx.globalAlpha = 0.22; ctx.drawImage(im, -len * 0.88, -h * 0.48, len, h); }
      ctx.restore(); ctx.globalCompositeOperation = "source-over"; ctx.globalAlpha = 1; void cs; void sn; void k;
    } else {
      ctx.globalAlpha = 0.9; ctx.strokeStyle = "#fff3a0"; ctx.lineWidth = 6; ctx.lineCap = "round"; ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x - Math.cos(a) * len * 0.7, y - Math.sin(a) * len * 0.7); ctx.stroke();
      ctx.drawImage(STAR.gold, x - 18, y - 18, 36, 36); ctx.globalAlpha = 1;
    }
  }
}
// 마법사 등장 띠(화면 CSS px). 0~0.22초 들어오고, 0.72~0.88초 나간다.
function drawCutIn() {
  const s = spell; if (!s || !s.on || !s.big || s.t > 0.9) return;
  const t = s.t, W = vw, H = vh, bandH = Math.min(H * 0.34, 210), cy = H * (portrait ? 0.36 : 0.44);
  const easeBack = x => { const c1 = 1.70158, c3 = c1 + 1; return 1 + c3 * Math.pow(x - 1, 3) + c1 * Math.pow(x - 1, 2); };
  const inK = Math.min(1, t / 0.22), inK2 = Math.min(1, Math.max(0, (t - 0.05) / 0.24)), outK = t > 0.72 ? Math.min(1, (t - 0.72) / 0.16) : 0;
  const off = (1 - easeBack(inK)) * -W * 1.1 + outK * W * 1.3;
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  ctx.save(); ctx.translate(W / 2 + off, cy); ctx.rotate(-0.07);
  ctx.fillStyle = "rgba(24,10,60,.92)"; ctx.fillRect(-W * 0.8, -bandH / 2 - 9, W * 1.6, bandH + 18);
  ctx.globalAlpha = 0.92; ctx.fillStyle = PILOT_COLOR[s.kid]; ctx.fillRect(-W * 0.8, -bandH / 2, W * 1.6, bandH); ctx.globalAlpha = 1;
  // 빠르게 지나가는 빛줄(속도감)
  ctx.strokeStyle = "rgba(255,255,255,.55)"; ctx.lineCap = "round";
  for (let i = 0, nLn = quality >= 0.6 ? 12 : 6; i < nLn; i++) { const ly = (((i * 53) % 100) / 100 - 0.5) * bandH * 0.9, lx = ((clock * 2200 + i * 311) % (W * 1.6)) - W * 0.8, ll = 60 + (i * 37) % 120; ctx.lineWidth = 2 + (i % 3); ctx.beginPath(); ctx.moveTo(lx, ly); ctx.lineTo(lx + ll, ly); ctx.stroke(); }
  // 마법사(띠 위로 튀어나오게)
  const im = ART[s.art], hh = bandH * (W < 600 ? 1.15 : 1.45), ww = im ? hh * im.width / im.height : hh * 0.8;
  const wx0 = Math.max(-W / 2 + 4, -W * 0.3 - ww / 2), wx = wx0 + (1 - easeBack(inK2)) * -W * 0.5, wy = bandH / 2 + 6 - hh;
  // 띠 안의 반짝이(깜빡이는 별) + 마법사 뒤의 도는 빛살 — 납작한 UI 띠처럼 보이지 않게
  for (let i = 0, nStar = quality >= 0.6 ? 18 : 8; i < nStar; i++) {
    const sx2 = (((i * 97) % 160) / 160 - 0.5) * W * 1.5 - off * 0.2, sy2 = (((i * 61) % 100) / 100 - 0.5) * bandH * 0.85, tw = 0.5 + 0.5 * Math.sin(clock * 9 + i * 1.7), ss = (6 + (i % 4) * 4) * (0.6 + tw * 0.6);
    ctx.globalAlpha = 0.35 + tw * 0.6; ctx.drawImage(STAR_LIST[i % 4], sx2 - ss, sy2 - ss, ss * 2, ss * 2);
  }
  const fcx = wx + ww / 2, fcy = wy + hh * 0.45;
  if (FXI.flare && quality >= 0.6) { ctx.save(); ctx.translate(fcx, fcy); ctx.rotate(clock * 0.8); ctx.globalAlpha = 0.75; ctx.drawImage(FXI.flare, -hh * 0.85, -hh * 0.85, hh * 1.7, hh * 1.7); ctx.restore(); }
  ctx.globalAlpha = 0.85; ctx.drawImage(GLOW.white, wx - ww * 0.3, wy + hh * 0.05, ww * 1.6, ww * 1.6); ctx.globalAlpha = 1;
  if (im) ctx.drawImage(im, wx, wy, ww, hh);
  // 주문 이름(오른쪽에서 들어온다). 화면이 좁으면 글자를 줄인다
  const tx0 = wx0 + ww + 12, tx = tx0 + (1 - easeBack(inK)) * W * 0.6;
  let big = Math.min(bandH * 0.3, 52); ctx.font = "900 " + Math.round(big) + "px " + FONT;
  const tw = ctx.measureText(s.name).width, room = Math.max(80, W / 2 - tx0 - 14);
  if (tw > room) { big = Math.max(16, big * room / tw); ctx.font = "900 " + Math.round(big) + "px " + FONT; }
  ctx.textAlign = "left"; ctx.textBaseline = "middle"; ctx.lineJoin = "round";
  const small = Math.max(14, Math.round(big * 0.5));
  outlined(s.who + "의", tx, -big * 0.62, small, "#ffffff", "left", 1, 800, 5);
  outlined(s.name, tx, big * 0.38, Math.round(big), "#ffe27a", "left", 1, 900, 8);
  ctx.restore();
}
function resetJuice() {
  parts.clear(); comets.length = 0; decals.length = 0; echoes.length = 0; ribbons.length = 0; bossFinU = -9; multiText = ""; spell = null; rewardNext = null; cols.length = 0; callouts.length = 0; sched.length = 0;
  trauma = 0; hitStop = 0; slowT = 0; zoomP = 0; combo = 0; comboAt = -9; cardTrail = null;
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
    else if (e.type === "home") {
      if (e.kind === "boss") bossDownFx(e.x, e.y);
      if (e.via !== "storm") killFx(e.x, e.y, e.kind);      // 대마법으로 간 괴물은 대마법 장면이 터뜨린다
    }
    else if (e.type === "build" || e.type === "upgrade") padFx(e.pad);
    else if (e.type === "card") { if (e.pad >= 0 && !cardFlying) padFx(e.pad); }
    else if (e.type === "shot") onShot(e);
    else if (e.type === "owl") { sfx.owl(); if (!saidOwl && !guide) { saidOwl = true; say("? 부엉이가 왔어요! 눌러 보세요", true); } }
    else if (e.type === "steal") { sfx.steal(); flashFx(0.12, "255,150,170"); say(L.MONSTERS[e.kind].name + "이 케이크를 " + e.n + "조각 가져갔어요", false); }
    else if (e.type === "wave") { if (e.boss) { sfx.boss(); megaFx(1.0, 0.8); shake(0.35); say("파도 " + e.n + " · 케이크 대왕이 와요!", true); } else { sfx.wave(); say("파도 " + e.n + " 시작!", false); } }
    else if (e.type === "wave-clear") { if (e.n < L.WAVES) say("파도 " + e.n + " 막았어요! 수정 +" + L.WAVE_GEMS, false); }
    else if (e.type === "meet" && e.kind === "ghost") say("숨바꼭질 유령! 눌러서 반짝 가루로 찾아요", false);
    else if (e.type === "meet" && e.kind === "bat") say("팔랑 박쥐는 번개·바람·빛 탑만 닿아요", false);
  }
  ev.length = 0;
}
function update(dt) {
  // 빨리 감기는 게임 시간만 두 배(작게 나눠서). 문제·카드는 이 밖이라 정상 속도.
  // 멈칫(hitStop): 게임 전체가 잠깐 멈춘다. 느리게(slowT): 게임 전체가 0.3배로(대장을 돌려보낸 순간). 둘 다 결과는 그대로, 시간만 늘어난다.
  if (hitStop > 0) { hud(); return; }
  const total = dt * speed * (slowT > 0 ? 0.3 : 1), n = Math.max(1, Math.ceil(total / 0.034));
  for (let i = 0; i < n && mode === "play"; i++) {
    E.stepWorld(world, total / n);
    handleEvents();
    if (world.over) { showOver(); return; }
    if (world.pending === "rescue") { openRescue(); return; }
  }
  checkBoss();
  if (guide) {
    if (world.towers.length) { guide = null; if (world.owl && world.owl.life - world.owl.t > 4 && !saidOwl) { saidOwl = true; say("? 부엉이가 왔어요! 눌러 보세요", true); } }
    else {
      guide.t += dt;
      // 첫 탑을 세울 때까지 첫 파도는 기다린다(준비 시계 멈춤). "바로 시작"을 누르면 그대로 시작.
      if (world.phase === "prep" && world.wave === 1) world.prepT = Math.max(world.prepT, L.PREP_TIME);
    }
  }
  if (!saidPad && !guide && world.t > 9 && !world.towers.length) { saidPad = true; say("빈 받침(동그란 돌)을 눌러 탑을 세워요!", true); }
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
  // 흔들림: 트라우마² 에 비례(부드러운 사인 잡음), 확대 펀치: 화면 가운데 기준
  const tr = trauma * trauma * (RM ? 0.3 : 1), sh = tr * 8 * dpr, z = 1 + (RM ? 0 : zoomP);   // 두 사인 합이 최대 1.5배 → 최대 12px
  const k0 = mapS * dpr, k = k0 * z, cxs = canvas.width / 2, cys = canvas.height / 2;
  const ox = cxs - (cxs - mapX * dpr) * z + (sh ? Math.sin(clock * 71.3) * sh + Math.sin(clock * 37.1) * sh * 0.5 : 0);
  const oy = cys - (cys - mapY * dpr) * z + (sh ? Math.cos(clock * 63.7) * sh + Math.sin(clock * 29.3) * sh * 0.5 : 0);
  fillGround(ox, oy, k0);
  const bgc = buildBg();
  if (z !== 1) ctx.drawImage(bgc, ox, oy, bgc.width * z, bgc.height * z); else ctx.drawImage(bgc, ox, oy);
  if (!world) { ctx.fillStyle = "rgba(30,18,70,.45)"; ctx.fillRect(0, 0, canvas.width, canvas.height); return; }
  const w = world, fx = w.fx, setScr = () => ctx.setTransform(k, 0, 0, k, ox, oy);
  curK = k; curOX = ox; curOY = oy;
  // ── 1) 월드 변환으로 그리는 바닥 것(원은 돌려도 같다): 사거리 원, 얼음·폭발 고리 ──
  setWorldTf(k, ox, oy);
  if (focusPad >= 0) { const p = w.pads[focusPad], t = p.tower; if (t) { const s = L.towerStats(t.kind, t.lv, t.branch); ctx.globalAlpha = 0.14; ctx.fillStyle = "#ffffff"; ctx.beginPath(); ctx.arc(p.x, p.y, s.range, 0, TAU); ctx.fill(); ctx.globalAlpha = 1; } }
  for (const r of fx.rings) {
    const kk = r.t / r.T;
    if (r.k === "ice") { ctx.globalAlpha = (1 - kk) * 0.3; ctx.fillStyle = r.color; ctx.beginPath(); ctx.arc(r.x, r.y, r.R * (0.4 + kk * 0.6), 0, TAU); ctx.fill(); ctx.globalAlpha = 1 - kk; ctx.strokeStyle = r.color; ctx.lineWidth = 4 + r.lv * 1.6; ctx.stroke(); ctx.globalAlpha = (1 - kk) * 0.8; ctx.strokeStyle = "#ffffff"; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(r.x, r.y, r.R * (0.25 + kk * 0.5), 0, TAU); ctx.stroke(); }
    else { ctx.globalAlpha = (1 - kk) * 0.5; ctx.fillStyle = r.color; ctx.beginPath(); ctx.arc(r.x, r.y, r.R * (0.3 + kk * 0.7), 0, TAU); ctx.fill(); }
  }
  ctx.globalAlpha = 1;
  // ── 2) 화면 변환: 그림은 항상 똑바로, 위치만 SX/SY ──
  setScr();
  // 받침 강조(고르는 중)
  if (focusPad >= 0) { const p = w.pads[focusPad], px = SX(p.x, p.y), py = SY(p.x, p.y); ctx.globalAlpha = 0.6 + Math.sin(clock * 8) * 0.3; ctx.strokeStyle = "#ffe27a"; ctx.lineWidth = 5; ctx.beginPath(); ctx.ellipse(px, py, PAD_R + 8, (PAD_R + 8) * 0.62, 0, 0, TAU); ctx.stroke(); ctx.globalAlpha = 1; }
  // 빈 받침이 처음엔 살짝 반짝(어디를 누를지)
  if (!w.towers.length || (w.t < 30 && w.gems >= 70)) { ctx.globalAlpha = 0.25 + Math.sin(clock * 4) * 0.2; ctx.strokeStyle = "#ffffff"; ctx.lineWidth = 3; for (const p of w.pads) if (!p.tower) { ctx.beginPath(); ctx.ellipse(SX(p.x, p.y), SY(p.x, p.y), PAD_R + 4, (PAD_R + 4) * 0.62, 0, 0, TAU); ctx.stroke(); } ctx.globalAlpha = 1; }
  // 길 바닥 자국(괴물·탑 아래)
  if (!SKIP.decals && quality >= 0.45) for (const d of decals) { const q = d.t / d.T, a = d.a * (q < 0.06 ? q / 0.06 : 1 - q); if (a <= 0.01) continue; ctx.globalAlpha = a; const sw2 = d.s * (1 + q * 0.15); ctx.drawImage(d.im, d.x - sw2 / 2, d.y - sw2 * 0.31, sw2, sw2 * 0.62); }
  ctx.globalAlpha = 1;
  // 탑과 괴물을 화면 y 순으로(탑은 아래 가운데가 받침에 닿는다)
  const items = [];
  for (const t of w.towers) items.push({ o: t, tw: true, sx: SX(t.x, t.y), sy: SY(t.x, t.y) });
  for (const e of w.monsters) items.push({ o: e, tw: false, sx: SX(e.x, e.y), sy: SY(e.x, e.y) });
  items.sort((a, b) => a.sy - b.sy);
  for (const it of items) { if (it.tw) drawTower(it.o, it.sx, it.sy); else drawMonster(it.o, it.sx, it.sy, screenFace(it.o, it.sx)); }
  if (!SKIP.under) drawSpellUnder(k, ox, oy);
  // ── 3) 월드 변환: 탄·빛줄기·번개·바람(선과 둥근 빛이라 돌려도 같다) ──
  setWorldTf(k, ox, oy);
  if (!SKIP.shots) { drawRibbons(); drawShots(w); }
  if (!SKIP.beams) { drawStandingBeams(w); drawBeams(fx); }
  if (!SKIP.bolts) drawBolts();
  if (!SKIP.gusts) drawGusts(fx);
  ctx.globalAlpha = 1;
  // ── 4) 화면 변환: 방울·케이크·커지는 탑·반짝 가루·효과 그림·마법사·부엉이·숫자 ──
  setScr();
  if (!SKIP.homes) for (const h of fx.homes) {
    const hx = SX(h.x, h.y), hy = SY(h.x, h.y), hf = ROT ? 1 : h.face;
    const t = h.t - h.delay;
    if (t < 0) {
      // 마법에 붙잡혀 반짝이며 기다리는 중(별똥별이 닿으면 방울로)
      const W0 = L.MONSTERS[h.kind].w * VS;
      drawMon(h.kind, hx, hy, W0, hf > 0, false, 1);
      drawMon(h.kind, hx, hy, W0, hf > 0, true, 0.35 + Math.sin(clock * 14 + h.x) * 0.2);
      continue;
    }
    const W = L.MONSTERS[h.kind].w * VS, rise = t * t * 60 + t * 50, x = hx + Math.sin(t * 5) * 8 + h.vx * t, y = hy - rise, a = t < 1.4 ? 1 : Math.max(0, 1 - (t - 1.4) / 0.4);
    if (y < -SCR_H()) continue;
    const bs = W * 1.35 * Math.min(1, 0.5 + t * 2.5);
    ctx.globalAlpha = a;
    // 방울을 먼저, 괴물을 위에(방울 그림이 진해도 괴물이 보이게), 반짝 테두리를 한 번 더
    if (ART.bubble) { const bh = bs * aspect("bubble"); ctx.drawImage(ART.bubble, x - bs / 2, y - bh / 2 - 4, bs, bh); } else ctx.drawImage(BUBBLE, x - bs / 2, y - bs / 2 - 4, bs, bs);
    drawMon(h.kind, x, y, W * 0.7, hf > 0, false, a);
    ctx.globalAlpha = a * 0.5; ctx.strokeStyle = "#ffffff"; ctx.lineWidth = 2.5; ctx.beginPath(); ctx.arc(x, y - 4, bs * 0.46, 0, TAU); ctx.stroke();
    // 방울 표면을 도는 반짝 호 + 뒤로 흘리는 꼬마 방울·별가루
    if (quality >= 0.6) { const hr = clock * 3 + h.x * 0.05; ctx.globalAlpha = a * 0.9; ctx.lineWidth = 3.5; ctx.beginPath(); ctx.arc(x, y - 4, bs * 0.38, hr, hr + 1.1); ctx.stroke(); } ctx.globalAlpha = a;
    if (rdt > 0 && t > 0.05 && a > 0.3 && quality >= 0.5 && rr() < rdt * 10) { if (rr() < 0.75) pa(P_SPIN, TX.miniBubble, x + (rr() - 0.5) * bs * 0.6, y + bs * 0.35, (rr() - 0.5) * 30, 20, 0.65, 7 + rr() * 9, 5, -60, 0.5, 0, 0, 0, 0.9); else pa(P_SPIN, TX.star[(h.x | 0) % 4], x + (rr() - 0.5) * bs * 0.5, y + bs * 0.3, (rr() - 0.5) * 40, 10, 0.5, 10, 3, -40, 0.5, 0, rr() * TAU, 6); }
  }
  ctx.globalAlpha = 1;
  // 케이크를 들고 가는 괴물
  for (const s of fx.steals) { const kk = s.t / 1.4, x = SX(s.x, s.y) + kk * 30, y = SY(s.x, s.y) - kk * 10; ctx.globalAlpha = 1 - kk; drawMon(s.kind, x, y, L.MONSTERS[s.kind].w * 0.8 * VS, true, false); cakeIconCtx(x, y - 34 * VS - kk * 20, 28 * VS); }
  ctx.globalAlpha = 1;
  // 빛기둥(강화·변신)
  for (const c of cols) {
    const kk = c.t / c.T, a = kk < 0.12 ? kk / 0.12 : 1 - (kk - 0.12) / 0.88, wv = c.w * (1 + Math.sin(clock * 30) * 0.06) * (1 - kk * 0.4);
    ctx.globalAlpha = Math.max(0, a); ctx.drawImage(c.tex, c.x - wv, c.y - 460 * VS, wv * 2, 520 * VS);
    ctx.drawImage(GLOW.white, c.x - wv * 0.4, c.y - 420 * VS, wv * 0.8, 470 * VS);
  }
  ctx.globalAlpha = 1;
  // 탑이 커지는 순간
  for (const g of fx.grow) {
    if (g.big) { drawBigBirth(g); continue; }
    const kk = g.t / 1.2, R = (30 + kk * 90) * VS, gx = SX(g.x, g.y), gy = SY(g.x, g.y) - 40 * VS;
    ctx.globalAlpha = (1 - kk); ctx.drawImage(LV_GLOW[g.lv - 1], gx - R, gy - 10 - R, R * 2, R * 2);
    ctx.strokeStyle = L.LV_COLORS[g.lv - 1]; ctx.lineWidth = 8 * (1 - kk) + 2; ctx.beginPath(); ctx.arc(gx, gy, R * 0.8, 0, TAU); ctx.stroke();
    for (let i = 0; i < 8; i++) { const a = i * TAU / 8 + kk * 2, rr = (20 + kk * 80) * VS; ctx.drawImage(STAR_LIST[i % 4], gx + Math.cos(a) * rr - 10, gy + Math.sin(a) * rr - 10, 20, 20); }
  }
  ctx.globalAlpha = 1;
  // 반짝 가루
  for (const s of fx.sparks) { const kk = s.t / 0.5, px = SX(s.x, s.y), py = SY(s.x, s.y); ctx.globalAlpha = 1 - kk; for (let i = 0; i < 6; i++) { const a = i * TAU / 6 + kk, r = 6 + kk * 34, sz = s.hit ? 22 : 14; ctx.drawImage(s.hit ? STAR.gold : STAR.blue, px + Math.cos(a) * r - sz / 2, py + Math.sin(a) * r - sz / 2, sz, sz); } }
  ctx.globalAlpha = 1;
  if (!SKIP.sheets) for (const f of fxList) if (!f.screen) drawFxItem(f);
  if (!SKIP.parts) parts.draw(ctx, k, ox, oy, quality < 0.6);
  if (!SKIP.comets) drawComets();
  setScr();
  drawWizard();
  drawOwl();
  // 떠오르는 숫자(수정·케이크)
  ctx.textAlign = "left"; ctx.textBaseline = "middle"; ctx.lineJoin = "round";
  const quietTxt = textQuiet();
  for (const n of fx.nums) {
    if (n.small || quietTxt || DEMO) continue;     // 작은 +2 는 HUD 로 날아가는 수정이 대신 보여 준다 · 대마법·대장 마무리 중엔 숫자 숨김
    const dur = n.small ? 0.8 : 1.6, kk = n.t / dur, nx = SX(n.x, n.y), y = SY(n.x, n.y) - (n.small ? 26 : 50) * Math.min(1, kk * 1.6), a = kk < 0.7 ? 1 : (1 - kk) / 0.3, s = (n.small ? 16 : 30 * (kk < 0.15 ? 0.6 + kk * 2.7 : 1)) * (VS > 1.3 ? 1.15 : 1);
    ctx.globalAlpha = Math.max(0, a);
    if (n.icon === "cake") cakeIconCtx(nx - s * 0.5, y, s * 1.2); else gemIconCtx(nx - s * 0.5, y, s * 1.1);
    ctx.font = "900 " + Math.round(s) + "px " + FONT; ctx.lineWidth = n.small ? 3 : 6; ctx.strokeStyle = "rgba(40,20,80,.9)"; ctx.strokeText(n.text, nx + s * 0.2, y + 1);
    ctx.fillStyle = n.icon === "cake" ? "#ffb3cf" : "#e3c8ff"; ctx.fillText(n.text, nx + s * 0.2, y + 1);
  }
  ctx.globalAlpha = 1;
  // 화면 전체(대마법·번쩍임·글자)
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  if (DEMO) { ctx.fillStyle = "rgba(28,16,64,.24)"; ctx.fillRect(0, 0, canvas.width, canvas.height); }   // 시연은 살짝 어둡게(창 글씨가 잘 읽히게)
  if (fx.storm) drawStorm(fx.storm);
  if (!SKIP.screenfx) for (const f of fxList) if (f.screen) drawFxItem(f);
  if (!SKIP.cut) drawCutIn();
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  if (flash > 0) { ctx.fillStyle = "rgba(" + flashCol + "," + Math.min(0.42, flash * 1.6).toFixed(2) + ")"; ctx.fillRect(0, 0, canvas.width, canvas.height); }
  drawCallouts();
  drawGuide();
  if (bannerT > 0 && mode !== "over" && !(quietTxt && mode !== "cards")) {   // 대마법·대장 마무리 중에는 숨김
    // 안내 글은 싸움터 한가운데가 아니라 HUD 바로 아래 한 줄(카드·문제 화면에서는 아래쪽)
    const by = mode === "cards" || mode === "quiz" ? vh * 0.86 : topRow();
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    const size = bannerBig ? Math.min(30, Math.max(16, Math.floor(vw * 0.9 / Math.max(1, banner.length) * 1.05))) : Math.min(21, Math.max(14, Math.floor(vw * 0.9 / Math.max(1, banner.length) * 1.05)));
    ctx.globalAlpha = Math.min(1, bannerT * 2); ctx.font = (bannerBig ? "900 " : "800 ") + size + "px " + FONT; ctx.textAlign = "center"; ctx.textBaseline = "middle";
    outlined(banner, vw / 2, by, size, bannerBig ? "#ffe27a" : "#ffffff", "center", 1, bannerBig ? 900 : 800, 6); ctx.globalAlpha = 1;
  }
}
const easeOutBack = x => { const c1 = 1.70158, c3 = c1 + 1; return 1 + c3 * Math.pow(x - 1, 3) + c1 * Math.pow(x - 1, 2); };
let rdt = 0, curK = 1, curOX = 0, curOY = 0;   // 이번 프레임의 화면 시간 · 화면 변환(돌려 그릴 때 되돌릴 값)   // 이번 프레임의 화면 시간(꼬리 입자용)
// 불꽃 구슬: 겹빛(보통 + lighter) + 잔상 3~6개 + 꼬리 불씨. 불새(a)는 분홍, 화산(b)은 크고 금빛
function drawShots(w) {
  for (const s of w.shots) {
    const lv = s.lv, ph = s.br === "a", vo = s.br === "b";
    const g = vo ? GLOW.volcano : ph ? GLOW.phoenix : GLOW.fire, sz = s.size * (4.2 + lv * 0.3);
    if (rdt > 0) {
      const sx = SX(s.x, s.y), sy = SY(s.x, s.y), n = lv >= 3 ? 2 : 1;
      for (let i = 0; i < n; i++) pa(P_GLOW, ph ? TX.gPink : TX.gEmber, sx + (rr() - 0.5) * 5, sy + (rr() - 0.5) * 5, (rr() - 0.5) * 30, (rr() - 0.5) * 30 - 24, 0.22 + lv * 0.04, s.size * 2.7, s.size * 0.4, 0, 0, i & 1);
      if (lv >= 3 && rr() < 0.45) pa(P_SPIN, TX.star[lv % 4], sx, sy, (rr() - 0.5) * 60, (rr() - 0.5) * 60, 0.35, 10 + lv * 2, 2, 0, 0, 0, rr() * TAU, 8);
      // 4·5단계: 탄 둘레를 나선으로 감아 도는 불티(자홍·금)
      if (lv >= 4) { const sd = sdir(s.tx - s.x, s.ty - s.y), ph2 = clock * 26 + (s.tx | 0), off = s.size * 1.6; for (let k2 = 0; k2 < 2; k2++) { const o2 = Math.sin(ph2 + k2 * Math.PI) * off; pa(P_GLOW, k2 ? TX.gPink : TX.gGold, sx - Math.sin(sd) * o2, sy + Math.cos(sd) * o2, (rr() - 0.5) * 20, -20, 0.4, 10 + lv, 2, 0, 0, 1); } }
    }
    ctx.globalAlpha = 1; ctx.drawImage(g, s.x - sz / 2, s.y - sz / 2, sz, sz);
    if (quality >= 0.6) { ctx.globalCompositeOperation = "lighter"; ctx.globalAlpha = 0.5; ctx.drawImage(g, s.x - sz * 0.35, s.y - sz * 0.35, sz * 0.7, sz * 0.7); }
    ctx.globalCompositeOperation = "source-over"; ctx.globalAlpha = 1;
    ctx.fillStyle = "#fffbe8"; ctx.beginPath(); ctx.arc(s.x, s.y, s.size * 0.5, 0, TAU); ctx.fill();
    ctx.strokeStyle = L.LV_COLORS[lv - 1]; ctx.lineWidth = 2 + lv * 0.4; ctx.stroke();
  }
  for (const q of world.fx.pops) { const kk = q.t / 0.3; ctx.globalAlpha = 1 - kk; ctx.drawImage(GLOW.fire, q.x - 14 - kk * 10, q.y - 14 - kk * 10, 28 + kk * 20, 28 + kk * 20); }
  ctx.globalAlpha = 1;
}
// 불꽃 구슬 리본 꼬리: 탄의 지난 자리 10곳을 이어 뒤로 갈수록 가늘고 흐린 띠(겉: 불꽃색, 속: 흰빛). 탄이 맞은 뒤에도 0.25초 남는다. 상한 30
const ribbons = [];
let ribbonFrame = 0;
function syncRibbons(dt) {
  if (!world) { ribbons.length = 0; return; }
  ribbonFrame++;
  for (const s of world.shots) {
    s._seen = ribbonFrame;
    if (!s._rb) { if (ribbons.length >= 30) ribbons.shift(); s._rb = { s, px: new Float32Array(10), py: new Float32Array(10), n: 0, dead: false, t: 0, lv: s.lv, br: s.br, size: s.size }; ribbons.push(s._rb); }
    const rb = s._rb;
    if (rdt > 0) { for (let i = Math.min(9, rb.n); i > 0; i--) { rb.px[i] = rb.px[i - 1]; rb.py[i] = rb.py[i - 1]; } rb.px[0] = s.x; rb.py[0] = s.y; rb.n = Math.min(10, rb.n + 1); }
  }
  for (const rb of ribbons) if (!rb.dead && rb.s._seen !== ribbonFrame) { rb.dead = true; rb.px[0] = rb.s.tx; rb.py[0] = rb.s.ty; }
  for (const rb of ribbons) if (rb.dead) rb.t += dt;
  for (let i = ribbons.length - 1; i >= 0; i--) if (ribbons[i].dead && ribbons[i].t > 0.34) ribbons.splice(i, 1);
}
const RIB_COL = (rb) => rb.br === "a" ? (rb.lv >= 4 ? "#ff2a85" : "#ff6fb0") : rb.br === "b" ? (rb.lv >= 4 ? "#ff2a85" : "#ffb03c") : "#ff8a2a";
function ribbonPoly(rb, wmul) {
  const n = rb.n; if (n < 2) return false;
  const W = (rb.size * 1.3 + 4) * wmul;
  ctx.beginPath();
  for (let i = 0; i < n; i++) { const j = Math.min(n - 1, i + 1), i0 = Math.max(0, i - 1), dx = rb.px[i0] - rb.px[j], dy = rb.py[i0] - rb.py[j], l = Math.hypot(dx, dy) || 1, w2 = W * (1 - i / n) * 0.5; const x = rb.px[i] - dy / l * w2, y = rb.py[i] + dx / l * w2; if (i) ctx.lineTo(x, y); else ctx.moveTo(x, y); }
  for (let i = n - 1; i >= 0; i--) { const j = Math.min(n - 1, i + 1), i0 = Math.max(0, i - 1), dx = rb.px[i0] - rb.px[j], dy = rb.py[i0] - rb.py[j], l = Math.hypot(dx, dy) || 1, w2 = W * (1 - i / n) * 0.5; ctx.lineTo(rb.px[i] + dy / l * w2, rb.py[i] - dx / l * w2); }
  ctx.closePath(); return true;
}
function drawRibbons() {
  for (const rb of ribbons) {
    const a = rb.dead ? Math.max(0, 1 - rb.t / 0.34) : 1; if (a <= 0) continue;
    if (!ribbonPoly(rb, 1)) continue;
    ctx.globalAlpha = 0.75 * a; ctx.fillStyle = RIB_COL(rb); ctx.fill();
    if (quality >= 0.6 && ribbonPoly(rb, 0.45)) { ctx.globalAlpha = 0.9 * a; ctx.fillStyle = "#fff6e0"; ctx.fill(); }
  }
  ctx.globalAlpha = 1;
}
// 4·5단계 빛 탑: 쏘지 않을 때도 겨눈 쪽으로 가는 가는 빛줄기가 서 있고, 빛 알갱이가 그 위를 달린다
function drawStandingBeams(w) {
  for (const t of w.towers) {
    if (t.kind !== "light" || t.lv < 4 || !t._s) continue;
    const s = t._s, ox2 = t.x, oy2 = t.y - s.w * 0.6, L2 = s.range * 0.85, x1 = ox2 + Math.cos(t.aim) * L2, y1 = oy2 + Math.sin(t.aim) * L2;
    const pul = 0.22 + Math.sin(clock * 4 + t.id) * 0.08, wv = s.size * 0.35, col = t.branch === "b" ? "#ffd24a" : RAINBOW[((clock * 2) | 0) % 3];
    ctx.lineCap = "round"; ctx.beginPath(); ctx.moveTo(ox2, oy2); ctx.lineTo(x1, y1);
    ctx.globalAlpha = pul; ctx.strokeStyle = col; ctx.lineWidth = wv * 2.2; ctx.stroke();
    ctx.globalAlpha = pul + 0.2; ctx.strokeStyle = "#ffffff"; ctx.lineWidth = Math.max(1.5, wv * 0.5); ctx.stroke();
    for (let i = 0; i < 2; i++) { const p = (clock * 0.9 + i * 0.5 + t.id * 0.13) % 1, x = ox2 + (x1 - ox2) * p, y = oy2 + (y1 - oy2) * p, r = wv * 2.2; ctx.globalAlpha = 0.8 * (1 - p); ctx.drawImage(GLOW.white, x - r, y - r, r * 2, r * 2); }
  }
  ctx.globalAlpha = 1;
}
// 빛줄기: 넓은 번짐(lighter) → 색 → 흰 심 + 줄을 따라 달리는 빛 알갱이 + 시작점 빛. 무지개(a)는 줄마다 색, 등대(b)는 굵은 금빛
const RAINBOW = ["#ff9ee0", "#8fe0ff", "#b8ff9a"];
function drawBeams(fx) {
  ctx.lineCap = "round";
  for (const b of fx.beams) {
    const kk = b.t / b.T, a = 1 - kk, lv = b.lv, gold = b.size >= 26, rainbow = !gold && lv >= 3;
    const col = gold ? "#ffd24a" : rainbow ? RAINBOW[((Math.floor(Math.atan2(b.y1 - b.y0, b.x1 - b.x0) * 3.4) % 3) + 3) % 3] : L.LV_COLORS[lv - 1];
    const wv = b.size * (1.25 - kk * 0.5) * (kk < 0.1 ? 0.6 + kk * 4 : 1);
    ctx.beginPath(); ctx.moveTo(b.x0, b.y0); ctx.lineTo(b.x1, b.y1);
    ctx.strokeStyle = col;
    if (quality >= 0.6) { ctx.globalCompositeOperation = "lighter"; ctx.globalAlpha = a * 0.35; ctx.lineWidth = wv * 2.4; ctx.stroke(); }
    ctx.globalCompositeOperation = "source-over"; ctx.globalAlpha = a * 0.75; ctx.lineWidth = wv * 1.25; ctx.stroke();
    ctx.globalAlpha = a; ctx.strokeStyle = "#ffffff"; ctx.lineWidth = Math.max(2, wv * 0.42); ctx.stroke();
    for (let i = 0; i < 3; i++) { const p = (clock * 2.6 + i / 3) % 1, x = b.x0 + (b.x1 - b.x0) * p, y = b.y0 + (b.y1 - b.y0) * p, r = wv * 1.3; ctx.globalAlpha = a * 0.9; ctx.drawImage(GLOW.white, x - r, y - r, r * 2, r * 2); }
    const r0 = wv * 2.4; ctx.globalAlpha = a; ctx.drawImage(GLOW.gold, b.x0 - r0, b.y0 - r0, r0 * 2, r0 * 2);
  }
  ctx.globalAlpha = 1;
}
// 번개 색: 흰 심은 늘 그대로, 겉빛이 단계마다 바뀐다. 1·2 노랑 → 3 금 + 하늘빛 → 4 보라 + 시안 → 5 시안 + 보라(무지개 반짝)
const BOLT_GLOW = ["#ffe45c", "#ffd84a", "#ffc93c", "#b537f2", "#00e0ff"], BOLT_RIM = [null, null, "#7fd8ff", "#7ff0ff", "#c88bff"], RAINBOW5 = ["#ff9ee0", "#ffd24a", "#8fe0ff", "#b8ff9a", "#d9a8ff"];
// 번개 메아리: 엔진의 번개(0.25초)를 베껴 0.38초 동안 깜빡이며 남긴다(정지 화면에서도 번개가 보이게). 상한 16
const echoes = [];
function addEcho(z) {
  if (echoes.length >= 16) echoes.shift();
  const pts = z.pts.map(p => [p[0], p[1]]);
  echoes.push({ pts, t: 0, T: 0.42, lv: z.lv, size: z.size, seed: z.seed, sky: z.lv >= 4 });
}
function boltPath(pts, seed, J, upto, forks, lv) {
  const segs = pts.length - 1;
  ctx.beginPath();
  for (let i = 0; i <= segs; i++) {
    const x = pts[i][0], y = pts[i][1];
    if (!i) { ctx.moveTo(x, y); continue; }
    const frac = upto - (i - 1); if (frac <= 0) break;
    const px = pts[i - 1][0], py = pts[i - 1][1], dx = x - px, dy = y - py, len = Math.hypot(dx, dy) || 1, nx = -dy / len, ny = dx / len;
    // 날카로운 지그재그: 약 13칸마다 꺾이고, 꺾는 폭은 해시로 들쭉날쭉(부드러운 물결이 아니게)
    const nSeg = Math.max(4, Math.min(14, Math.round(len / 13)));
    for (let s = 1; s < nSeg; s++) { if (s / nSeg > frac) break; const hsh = Math.sin(seed * 12.9898 + i * 78.233 + s * 37.719) * 43758.5453, rnd = hsh - Math.floor(hsh); const j = (s & 1 ? 1 : -1) * (0.35 + rnd * 0.65) * J; ctx.lineTo(px + dx * s / nSeg + nx * j, py + dy * s / nSeg + ny * j); }
    if (frac < 1) break;
    ctx.lineTo(x, y);
    if (forks) {
      const fa = Math.atan2(dy, dx) + Math.sin(seed * 3 + i * 1.7) * 1.3, fl = 16 + lv * 6, j2 = Math.sin(seed + i) * 7;
      ctx.lineTo(x + Math.cos(fa) * fl * 0.5 - Math.sin(fa) * j2, y + Math.sin(fa) * fl * 0.5 + Math.cos(fa) * j2); ctx.lineTo(x + Math.cos(fa) * fl, y + Math.sin(fa) * fl); ctx.moveTo(x, y);
    }
  }
}
const SKYP = [[0, 0], [0, 0]];
function drawBolts() {
  ctx.lineJoin = "round"; ctx.lineCap = "round";
  for (const z of echoes) {
    const q = z.t / z.T, segs = z.pts.length - 1, upto = Math.min(1, z.t / 0.05) * segs;
    // 깜빡임: 처음 밝게, 그다음 3번에 1번 어둡게(메아리), 끝으로 갈수록 흐리게
    const fl = z.t < 0.07 ? 1 : (((z.t * 40) | 0) % 3 === 1 ? 0.35 : 0.9), a = fl * (1 - q * 0.8);
    const seed = z.seed + ((z.t * 20) | 0) * 1.37, J = 10 + z.size * 1.1, lv = z.lv;
    const glow = lv >= 5 ? RAINBOW5[((clock * 12) | 0) % 5] : BOLT_GLOW[lv - 1], rim = BOLT_RIM[lv - 1];
    const layers = (wide) => {
      ctx.lineJoin = "miter"; ctx.miterLimit = 3;
      if (quality >= 0.6) { ctx.globalCompositeOperation = "lighter"; ctx.globalAlpha = a * 0.35; ctx.strokeStyle = glow; ctx.lineWidth = z.size * 2.6 + 8 + wide; ctx.stroke(); ctx.globalCompositeOperation = "source-over"; }
      if (rim) { ctx.globalAlpha = a * 0.85; ctx.strokeStyle = rim; ctx.lineWidth = z.size * 1.5 + 3 + wide * 0.4; ctx.stroke(); }
      ctx.globalAlpha = a; ctx.strokeStyle = glow; ctx.lineWidth = z.size * 0.95 + 2; ctx.stroke();
      ctx.strokeStyle = "#ffffff"; ctx.lineWidth = Math.max(1.8, z.size * 0.42); ctx.stroke();
      ctx.lineJoin = "round";
    };
    boltPath(z.pts, seed, J, upto, lv >= 3, lv); layers(0);
    // 4·5단계: 하늘에서 첫 괴물 머리 위로 내리꽂는 낙뢰 한 줄 더
    if (z.sky && segs >= 1) { const p = z.pts[1]; SKYP[0][0] = p[0] + 30; SKYP[0][1] = p[1] - 300; SKYP[1][0] = p[0]; SKYP[1][1] = p[1]; boltPath(SKYP, seed * 1.7, J * 1.6, Math.min(1, z.t / 0.04), false, lv); layers(4); }
    ctx.globalAlpha = a;
    for (let i = 1; i <= Math.min(segs, Math.floor(upto)); i++) { const r = z.size * 3 + 12; ctx.drawImage(GLOW.white, z.pts[i][0] - r, z.pts[i][1] - r, r * 2, r * 2); }
  }
  ctx.globalAlpha = 1;
}// 바람: 큰 소용돌이 두 겹 + 잔상, 돌풍(크기 30 이상)은 앞에 초승달 바람결
function drawGusts(fx) {
  for (const g of fx.gusts) {
    const kk = g.t / 0.4, a = 1 - kk, sw = SWIRL[g.lv - 1], sz = g.size * (2.3 + g.lv * 0.15);
    for (let i = quality >= 0.6 ? 3 : 0; i >= 0; i--) {
      const m = Math.max(0, Math.min(1, kk * 1.5) - i * 0.1), x = g.x0 + (g.x1 - g.x0) * m, y = g.y0 + (g.y1 - g.y0) * m, s2 = sz * (1 - i * 0.15);
      ctx.globalAlpha = a * (i ? 0.3 * (1 - i / 4) : 1);
      ctx.save(); ctx.translate(x, y); ctx.rotate(-clock * 12 - i); ctx.drawImage(sw, -s2 / 2, -s2 / 2, s2, s2);
      if (!i) { ctx.rotate(clock * 22); ctx.drawImage(sw, -s2 * 0.3, -s2 * 0.3, s2 * 0.6, s2 * 0.6); }
      ctx.restore();
      if (!i && g.size >= 30) { const an = Math.atan2(g.y1 - g.y0, g.x1 - g.x0); ctx.strokeStyle = "rgba(220,255,235,.9)"; ctx.lineWidth = 7 * a + 2; ctx.beginPath(); ctx.arc(x, y, sz * 0.62, an - 1.0, an + 1.0); ctx.stroke(); }
    }
  }
  ctx.globalAlpha = 1;
}
// 큰 글자(화면 CSS px): 튀어나오며 커졌다 제자리(ease-out-back), 끝에 흐려짐. 콤보는 HUD 아래 왼쪽
// 글자 줄: HUD 바로 아래 한 줄. 대마법·대장 마무리 중에는 안내 글·숫자·작은 글자를 숨긴다
const topRow = () => HUD_SAFE + (PHONE ? 16 : 22);
const textQuiet = () => !!(spell && spell.on && spell.t < spell.T) || clock < bossFinU;
let bannerShown = false;
// 테두리 글자는 한 번 그려 둔 그림을 붙인다(매 프레임 strokeText 는 비싸다). 튀어나오는 크기 변화는 그림을 늘려서.
const textCache = new Map();
function textSprite(text, px, fill, weight, lw) {
  const key = text + "|" + px + "|" + fill + "|" + weight + "|" + lw + "|" + dpr;
  let c = textCache.get(key);
  if (!c) {
    if (textCache.size > 80) textCache.clear();
    const font = weight + " " + px + "px " + FONT, m = document.createElement("canvas").getContext("2d"); m.font = font;
    const tw = m.measureText(text).width, W = tw + lw * 2 + 4, H = px * 1.5 + lw * 2;
    c = document.createElement("canvas"); c.width = Math.ceil(W * dpr); c.height = Math.ceil(H * dpr);
    const x = c.getContext("2d"); x.scale(dpr, dpr); x.font = font; x.textBaseline = "middle"; x.lineJoin = "round";
    x.lineWidth = lw; x.strokeStyle = "rgba(30,14,70,.92)"; x.strokeText(text, lw + 2, H / 2); x.fillStyle = fill; x.fillText(text, lw + 2, H / 2);
    c._w = W; c._h = H; c._ox = lw + 2; c._tw = tw; textCache.set(key, c);
  }
  return c;
}
try { document.fonts && document.fonts.addEventListener && document.fonts.addEventListener("loadingdone", () => textCache.clear()); } catch (_) {}
// align: "center" | "left". 돌려주는 값: 글자 너비(늘린 뒤)
function outlined(text, x, y, px, fill, align, scale, weight, lw) {
  const c = textSprite(text, Math.round(px), fill, weight || 900, lw || 7), w = c._w * scale, h = c._h * scale;
  const left = align === "left" ? x - c._ox * scale : x - w / 2;
  ctx.drawImage(c, left, y - h / 2, w, h);
  return c._tw * scale;
}
/* ---------- 첫 탑 안내: 받침 둘레 고리 + 통통 튀는 큰 화살표 + 한 줄 ----------
   화살표는 받침 위에서 아래로(받침이 화면 위쪽 HUD 가까이면 아래에서 위로). 문제·탑 고르기 창이 떠 있을 땐 숨김. */
function pillPath(x, y, w, h) { const r = h / 2; ctx.beginPath(); ctx.moveTo(x + r, y); ctx.lineTo(x + w - r, y); ctx.arc(x + w - r, y + r, r, -Math.PI / 2, Math.PI / 2); ctx.lineTo(x + r, y + h); ctx.arc(x + r, y + r, r, Math.PI / 2, Math.PI * 1.5); ctx.closePath(); }
function drawArrow(x, y, dir, k) {   // y: 화살촉 끝, dir 1 = 아래를 가리킴
  const hl = 34 * k, hw = 30 * k, sw = 12 * k, len = 80 * k;
  ctx.drawImage(GLOW.gold, x - 70 * k, y - dir * len * 0.5 - 70 * k, 140 * k, 140 * k);
  ctx.beginPath(); ctx.moveTo(x, y);
  ctx.lineTo(x + hw, y - dir * hl); ctx.lineTo(x + sw, y - dir * hl); ctx.lineTo(x + sw, y - dir * len);
  ctx.lineTo(x - sw, y - dir * len); ctx.lineTo(x - sw, y - dir * hl); ctx.lineTo(x - hw, y - dir * hl); ctx.closePath();
  ctx.lineJoin = "round"; ctx.lineWidth = 7 * k; ctx.strokeStyle = "#3a2500"; ctx.stroke();
  ctx.fillStyle = "#ffe27a"; ctx.fill();
  ctx.lineWidth = 2.5 * k; ctx.strokeStyle = "#fff8d0"; ctx.beginPath(); ctx.moveTo(x - sw * 0.35, y - dir * (len - 8 * k)); ctx.lineTo(x - sw * 0.35, y - dir * (hl + 4 * k)); ctx.stroke();
}
const GUIDE_TEXT = "여기를 눌러 탑을 세워요!";
function guideOn() { return !!(guide && mode === "play" && world && !world.towers.length && guide.t >= guide.wait && world.pads[guide.pad] && !world.pads[guide.pad].tower); }
function drawGuide() {
  if (!guideOn()) return;
  const p = world.pads[guide.pad], c = toScreen(p.x, p.y), k = PHONE ? 0.78 : 1, a = Math.min(1, (guide.t - guide.wait) / 0.35);
  const r = Math.max(36, (PAD_R + 10) * mapS), pul = 1 + Math.sin(clock * 6) * 0.08, q = (clock * 0.9) % 1;
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  ctx.globalAlpha = a; ctx.lineWidth = 5; ctx.strokeStyle = "#ffe27a";
  ctx.beginPath(); ctx.ellipse(c.x, c.y, r * pul, r * 0.62 * pul, 0, 0, TAU); ctx.stroke();
  ctx.globalAlpha = a * (1 - q); ctx.lineWidth = 3; ctx.strokeStyle = "#ffffff";
  ctx.beginPath(); ctx.ellipse(c.x, c.y, r * (1 + q), r * 0.62 * (1 + q), 0, 0, TAU); ctx.stroke();
  ctx.globalAlpha = a;
  const fs = Math.round(22 * k); ctx.font = "900 " + fs + "px " + FONT;
  const tw = ctx.measureText(GUIDE_TEXT).width + 30 * k, th = fs + 20 * k, gap = r * 0.7 + 4, len = 80 * k, bob = Math.abs(Math.sin(clock * 5)) * 16 * k;
  const reach = gap + len + 16 * k + 10 + th;              // 받침에서 글 끝까지
  const dir = c.y - reach > HUD_SAFE + 6 ? 1 : -1;          // 위에 자리가 있으면 위에서 아래로
  drawArrow(c.x, c.y - dir * (gap + bob), dir, k);
  const cy = c.y - dir * (gap + len + 16 * k + 10 + th / 2), cx = Math.max(tw / 2 + 8, Math.min(vw - tw / 2 - 8, c.x));
  pillPath(cx - tw / 2, cy - th / 2, tw, th); ctx.fillStyle = "rgba(34,20,78,.94)"; ctx.fill(); ctx.lineWidth = 3; ctx.strokeStyle = "#ffe27a"; ctx.stroke();
  ctx.fillStyle = "#ffffff"; ctx.textAlign = "center"; ctx.textBaseline = "middle"; ctx.fillText(GUIDE_TEXT, cx, cy + 1);
  ctx.globalAlpha = 1;
}
function drawCallouts() {
  bannerShown = bannerT > 0 && mode !== "over" && mode !== "cards" && mode !== "quiz" && !textQuiet();
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  const cut = textQuiet();
  for (const c of callouts) {
    if (cut && !c.top) continue;
    const q = c.t / c.T, sc = q < 0.12 ? 0.4 + 0.6 * easeOutBack(q / 0.12) : 1, a = q > 0.75 ? (1 - q) / 0.25 : 1;
    let x, y;
    if (c.wx != null) { const p = toScreen(c.wx, c.wy); x = p.x; y = p.y - 70 * VS * mapS - c.rise * q; }
    else { x = vw / 2; y = (c.top ? topRow() + 40 : c.y != null ? c.y : vh * (portrait ? 0.24 : 0.3)) - c.rise * q; }
    const base = Math.round(c.size * (PHONE ? 0.78 : 1)), sp = textSprite(c.text, base, c.col, 900, 7);
    const hw = sp._w * sc / 2; x = Math.max(hw, Math.min(vw - hw, x)); y = Math.max(HUD_SAFE + base * sc / 2, y);
    ctx.globalAlpha = Math.max(0, a); outlined(c.text, x, y, base, c.col, "center", sc);
  }
  if (combo >= 3 && clock - comboAt < 1.8 && mode !== "over" && world) {
    const a = Math.min(1, (1.8 - (clock - comboAt)) / 0.4), sc = 1 + comboPop * 0.45, base = PHONE ? 22 : 28;
    const tx = "콤보 " + combo + "!", x = 14, y = topRow() + (bannerShown ? (PHONE ? 30 : 36) : 0);
    ctx.globalAlpha = a;
    const tw = outlined(tx, x, y, base, combo >= 20 ? "#ff9ee0" : combo >= 10 ? "#ffd24a" : "#ffffff", "left", sc);
    // 한꺼번에 N마리: 콤보 바로 옆 같은 줄(고정 자리)
    if (multiText && clock - multiAt < 1.3) {
      const mq = (clock - multiAt) / 1.3;
      ctx.globalAlpha = a * (mq > 0.75 ? (1 - mq) / 0.25 : 1);
      outlined(multiText, x + tw + 12, y, PHONE ? 18 : 24, multiCol, "left", 1 + multiPop * 0.35);
    }
  }
  ctx.globalAlpha = 1;
}
// 한 번에 맞혀 2단계로 태어나는 탑: 하늘로 솟는 빛기둥 + 겹고리 두 개 + 별 16개가 크게 퍼진다(1.8초)
function drawBigBirth(g) {
  const kk = Math.min(1, g.t / 1.8), gx = SX(g.x, g.y), gy = SY(g.x, g.y) - 40 * VS, a = kk < 0.1 ? kk / 0.1 : 1 - (kk - 0.1) / 0.9;
  // 빛기둥(처음 0.6초에 가장 밝다)
  const pa = Math.max(0, 1 - kk * 1.6), pw = (46 + Math.sin(clock * 30) * 4) * VS;
  if (pa > 0) { ctx.globalAlpha = pa; ctx.drawImage(GLOW.gold, gx - pw, gy - 420 * VS, pw * 2, 520 * VS); ctx.drawImage(GLOW.white, gx - pw * 0.45, gy - 380 * VS, pw * 0.9, 460 * VS); }
  const R = (40 + kk * 170) * VS;
  ctx.globalAlpha = Math.max(0, a); ctx.drawImage(LV_GLOW[1], gx - R * 1.1, gy - R * 1.1, R * 2.2, R * 2.2);
  ctx.strokeStyle = "#ffe27a"; ctx.lineWidth = 14 * (1 - kk) + 3; ctx.beginPath(); ctx.arc(gx, gy, R, 0, TAU); ctx.stroke();
  const R2 = (20 + Math.max(0, kk - 0.15) * 200) * VS;
  ctx.strokeStyle = L.LV_COLORS[1]; ctx.lineWidth = 10 * (1 - kk) + 2; ctx.beginPath(); ctx.arc(gx, gy, R2, 0, TAU); ctx.stroke();
  for (let i = 0; i < 16; i++) { const an = i * TAU / 16 + kk * 3, rr = (24 + kk * 150) * VS * (i % 2 ? 0.75 : 1), sz = (i % 2 ? 22 : 34) * VS * (1 - kk * 0.4); ctx.drawImage(STAR_LIST[i % 4], gx + Math.cos(an) * rr - sz / 2, gy + Math.sin(an) * rr - sz / 2, sz, sz); }
  // 단계 숫자 "2" 가 솟아오른다
  const ny = gy - 60 * VS - kk * 50 * VS, ns = Math.round(44 * VS * (kk < 0.12 ? 0.5 + kk * 4.2 : 1));
  ctx.font = "900 " + ns + "px " + FONT; ctx.textAlign = "center"; ctx.textBaseline = "middle"; ctx.lineJoin = "round";
  ctx.lineWidth = 7; ctx.strokeStyle = "rgba(40,20,80,.95)"; ctx.strokeText("2단계!", gx, ny); ctx.fillStyle = "#ffe27a"; ctx.fillText("2단계!", gx, ny);
  ctx.globalAlpha = 1;
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
function drawOrb(t, x, y, lv) {
    const key = t.lv + (t.branch || "");
    if (t._sk !== key) { t._sk = key; t._s = L.towerStats(t.kind, t.lv, t.branch); }
    const ch = Math.max(0, Math.min(1, 1 - t.cd / t._s.every)), oy2 = y - topOf(lv) * 0.92, pul = 1 + Math.sin(clock * 9 + t.id) * 0.08;
    const R = (12 + ch * 16 + lv * 3) * VS * pul, gtex = KIND_GLOW[t.kind];
    ctx.globalAlpha = 0.45 + ch * 0.5; ctx.drawImage(gtex, x - R, oy2 - R, R * 2, R * 2);
    if (quality >= 0.6) { ctx.globalCompositeOperation = "lighter"; ctx.globalAlpha = 0.25 + ch * 0.45; ctx.drawImage(GLOW.white, x - R * 0.45, oy2 - R * 0.45, R * 0.9, R * 0.9); ctx.globalCompositeOperation = "source-over"; }
    if (ch > 0.92) { const n = lv, rr2 = R * 0.9, ss = (8 + lv * 1.5) * VS; ctx.globalAlpha = 0.95; for (let i = 0; i < n; i++) { const a = clock * 4 + i * TAU / n; ctx.drawImage(STAR_LIST[(i + lv) % 4], x + Math.cos(a) * rr2 - ss / 2, oy2 + Math.sin(a) * rr2 * 0.5 - ss / 2, ss, ss); } }
    // 모으기: 70% 넘게 차면 빛 알갱이가 구슬로 빨려 든다
    if (ch > 0.7 && quality >= 0.6 && rr() < rdt * (8 + lv * 2)) { const a = rr() * TAU, r = (30 + lv * 3) * VS, life = 0.42; pa(P_GLOW, TX.kind[t.kind], x + Math.cos(a) * r, oy2 + Math.sin(a) * r * 0.7, -Math.cos(a) * r / life, -Math.sin(a) * r * 0.7 / life, life, 14, 5, 0, 0, 1); }
    // 4·5단계: 탑 둘레를 도는 작은 속성 구슬 2~3개(가만히 있어도 "최종 모습"이 보이게)
    if (lv >= 4) { const n = quality >= 0.6 ? lv - 2 : 1, orR = 38 * VS, oyc = y - topOf(lv) * 0.5, os = (lv >= 5 ? 26 : 20) * VS;
      for (let i = 0; i < n; i++) { const a = clock * 2.2 + i * TAU / n + t.id; ctx.globalAlpha = 0.9; ctx.drawImage(gtex, x + Math.cos(a) * orR - os / 2, oyc + Math.sin(a) * orR * 0.38 - os / 2, os, os); ctx.drawImage(GLOW.white, x + Math.cos(a) * orR - os * 0.2, oyc + Math.sin(a) * orR * 0.38 - os * 0.2, os * 0.4, os * 0.4); } }
    ctx.globalAlpha = 1;
}
function drawTower(t, x, y) {
  const lv = t.lv, sp = towerSprite(t.kind, lv, t.branch, mapS * dpr, false);
  // 받침 아래 숨 쉬는 속성 빛(1.8초 주기 ±12%) — 쉬는 탑도 살아 있게
  if (world && !SKIP.aura && quality >= 0.45) { const br2 = 1 + Math.sin(clock * 3.49 + t.id) * 0.12, aw = (56 + lv * 4) * VS * br2, ah = aw * 0.52; ctx.globalAlpha = Math.min(1, 0.8 + lv * 0.05); ctx.drawImage(AURA[t.kind], x - aw, y + 4 - ah, aw * 2, ah * 2);
    // 천천히 도는 점 고리(미리 그린 그림을 돌려 납작하게 붙인다 — 점선 그리기보다 싸다)
    if (quality >= 0.6) { const rt = clock * 0.6 + t.id, k2 = curK, c2 = Math.cos(rt), s2 = Math.sin(rt), ringW = aw * 0.8; ctx.globalAlpha = 0.6; ctx.setTransform(c2 * k2, s2 * k2 * 0.52, -s2 * k2, c2 * k2 * 0.52, curOX + x * k2, curOY + (y + 4) * k2); ctx.drawImage(RING_DOTS[t.kind], -ringW, -ringW, ringW * 2, ringW * 2); ctx.setTransform(k2, 0, 0, k2, curOX, curOY); }
    ctx.globalAlpha = 1; }
  // 단계 색 후광(3단계부터, 미리 그린 그림)
  if (lv >= 3) { const R = (34 + lv * 8 + Math.sin(clock * 3 + t.id) * 4) * VS; ctx.globalAlpha = 0.55; ctx.drawImage(LV_GLOW[lv - 1], x - R, y - 30 * VS - R, R * 2, R * 2); ctx.globalAlpha = 1; }
  if (world && E.hasteOn(world)) { ctx.globalAlpha = 0.3 + Math.sin(clock * 10) * 0.15; ctx.drawImage(GLOW.gold, x - 40 * VS, y - 60 * VS, 80 * VS, 80 * VS); ctx.globalAlpha = 1; }
  if (t.grow <= 0) t.bigGrow = false;
  // 꼭대기 마력 구슬: 다음 주문까지 차오른다(쏘기 직전이 가장 크다). 가득 차면 단계 수만큼 별이 돈다
  // 쏠 때 살짝 움찔(0.14초), 4·5단계는 꼭대기에서 별이 가끔 솟는다
  const kick = t._kick != null && clock - t._kick < 0.14 ? 1 + 0.07 * (1 - (clock - t._kick) / 0.14) : 1;
  if (lv >= 4 && quality >= 0.6 && rr() < rdt * (lv - 2) * 1.2) pa(P_SPIN, TX.star[(t.id + lv) % 4], x + (rr() - 0.5) * 40 * VS, y - topOf(lv) + rr() * 30, (rr() - 0.5) * 20, -40 - rr() * 30, 0.9, 12 + lv * 2, 3, 0, 0, 0, rr() * TAU, 3, 0.9);
  const g = (t.grow > 0 ? 1 + Math.sin(t.grow * Math.PI) * (t.bigGrow ? 0.6 : 0.35) : 1) * kick;
  if (g !== 1) { ctx.save(); ctx.translate(x, y); ctx.scale(g, g); ctx.drawImage(sp.c, sp.ox, sp.oy, sp.w, sp.h); ctx.restore(); }
  else ctx.drawImage(sp.c, x + sp.ox, y + sp.oy, sp.w, sp.h);
  if (world && !SKIP.orb) drawOrb(t, x, y, lv);
  // 보석 칸 ●●●○○: 탑 위. HUD 칩에 가리는 자리면 받침 아래로
  let gy = y + sp.gemY;
  if (mapY + gy * mapS < HUD_SAFE) gy = y + 26 * VS;
  if (lv < L.MAX_LV) { ctx.save(); ctx.translate(x, gy); ctx.scale(VS, VS); gemRow(ctx, lv, 0); ctx.restore(); }   // 5단계는 왕관이 있으니 점은 숨긴다(화면 정리)
  if (t.flash > 0) { ctx.globalAlpha = Math.min(0.8, t.flash); ctx.drawImage(GLOW.white, x - 46 * VS, y - 90 * VS, 92 * VS, 92 * VS); ctx.globalAlpha = 1; }
}
function drawMonster(e, ex, ey, face) {
  const M = L.MONSTERS[e.kind], hidden = e.hidden && e.revealT <= 0, bob = M.fly ? Math.sin(e.t * 8) * 4 : Math.abs(Math.sin(e.t * 6)) * -3;
  const y = M.fly ? ey + bob - 18 : ey + M.r * 0.7 + bob, foot = !M.fly;
  if (!M.fly) { ctx.fillStyle = "rgba(30,20,40,.2)"; ctx.beginPath(); ctx.ellipse(ex, ey + M.r * 0.6, M.r * VS, M.r * 0.35 * VS, 0, 0, TAU); ctx.fill(); }
  const alpha = hidden ? 0.16 : e.kind === "ghost" ? 0.85 : 1;
  const MW = M.w * VS;
  // 맞는 순간 젤리처럼 납작(1.2 × 0.82) → 0.15초에 통 돌아온다 + 흰 덮개
  if (e.fl > 0) { if (!e._flS) { e._flS = true; e._hitT = clock; } } else e._flS = false;
  const hk = e._hitT != null ? (clock - e._hitT) / 0.15 : 9;
  if (hk < 1 && !hidden && !SKIP.squash) { const c2 = Math.cos(hk * Math.PI * 1.5) * (1 - hk); SQX = 1 + 0.2 * c2; SQY = 1 - 0.18 * c2; }
  const MWd = MW;
  drawMon(e.kind, ex, y, MWd, face > 0, false, alpha, foot);
  if (e.fl > 0 && !hidden) drawMon(e.kind, ex, y, MWd, face > 0, true, 0.65, foot);
  // 발먼지(걷는 괴물, 0.45초마다) · 맞은 뒤 0.8초 동안 속성 알갱이
  if (!hidden && rdt > 0 && !SKIP.dust) {
    if (!M.fly && quality >= 0.6 && e.freezeT <= 0 && clock > (e._dustT || 0)) { e._dustT = clock + 0.42 + rr() * 0.12; pa(P_GLOW, TX.gDust, ex + (rr() - 0.5) * M.r, ey + M.r * 0.55, (rr() - 0.5) * 24, -12 - rr() * 10, 0.38, 8, 16, 0, 1, 0, 0, 0, 0.55); }
    if (e._hk && clock - e._hitT < 0.8 && rr() < rdt * 6) pa(P_GLOW, e._hk, ex + (rr() - 0.5) * MW * 0.4, y - MW * 0.4, (rr() - 0.5) * 20, -30 - rr() * 20, 0.5, 10, 3, 0, 0, 1);
  }
  const cy = foot ? y - MW * aspectOf(e.kind) * 0.5 : y, T = TINT[e.kind];
  if (!hidden && !SKIP.status) {
    // 상태 색: 불꽃(주황 깜빡 + 불씨) · 꽁꽁(하늘색 + 얼음 조각) · 느림(옅은 하늘 + 눈송이) · 번개(노랑 깜빡 + 지지직) · 빛(흰빛)
    if (T && e._burnU > clock && quality >= 0.6) { drawMonSrc(T.fire, ex, y, MWd, face > 0, 0.28 + Math.sin(clock * 24 + e.id) * 0.12, foot); if (rr() < rdt * 9) pa(P_GLOW, TX.gFire, ex + (rr() - 0.5) * MW * 0.5, cy + (rr() - 0.3) * MW * 0.4, (rr() - 0.5) * 20, -50 - rr() * 40, 0.45, 14, 3, 0, 0, 1); }
    if (e.freezeT > 0) {
      if (T) drawMonSrc(T.ice, ex, y, MWd, face > 0, 0.55, foot);
      if (!e._fz) { e._fz = true; spinBurst(ex, cy, QN(6), TX.shard, 140, 18, 0.45); glowAt(ex, cy, TX.gIce, 20, MW * 1.8, 0.3); once("freeze", 200, () => synth.freeze()); }
      ctx.globalAlpha = 0.9;
      for (let i = 0; i < 5; i++) { const a = i * TAU / 5 + 0.3, r = MW * 0.42, s = MW * (0.34 + (i & 1) * 0.12); ctx.drawImage(SHARD_IMG, ex + Math.cos(a) * r - s / 2, cy + Math.sin(a) * r * 0.8 - s / 2, s, s); }
      ctx.globalAlpha = 1;
    } else {
      e._fz = false;
      if (e.slowT > 0) {
        if (T && quality >= 0.6) drawMonSrc(T.ice, ex, y, MWd, face > 0, 0.22, foot);
        for (let i = 0; i < 3; i++) { const a = clock * 4 + i * 2.1, s = 12 * VS; ctx.drawImage(FLAKE_IMG, ex + Math.cos(a) * M.r * VS - s / 2, ey + 4 + Math.sin(a) * M.r * 0.35 - s / 2, s, s); }
      }
    }
    if (e._zapU > clock) {
      if (T && ((clock * 30) | 0) % 2) drawMonSrc(T.zap, ex, y, MWd, face > 0, 0.5, foot);
      ctx.strokeStyle = "#fff6a0"; ctx.lineWidth = 2.5; ctx.beginPath();
      for (let i = 0; i < 2; i++) { const a = clock * 20 + i * 3 + e.id, r = MW * 0.45; ctx.moveTo(ex + Math.cos(a) * r, cy + Math.sin(a) * r); ctx.lineTo(ex + Math.cos(a + 0.5) * r * 0.7 + 4, cy + Math.sin(a + 0.5) * r * 0.7); ctx.lineTo(ex + Math.cos(a + 0.9) * r, cy + Math.sin(a + 0.9) * r); }
      ctx.stroke();
    }
    if (e._pushU > clock) {
      const d = e._pdir || 0, k2 = (e._pushU - clock) / 0.4; ctx.strokeStyle = "rgba(235,255,240," + (0.9 * k2).toFixed(2) + ")"; ctx.lineWidth = 3; ctx.lineCap = "round"; ctx.beginPath();
      for (let i = -1; i <= 1; i++) { const px = ex - Math.sin(d) * i * MW * 0.28, py = cy + Math.cos(d) * i * MW * 0.28, back = MW * (0.45 + (i & 1) * 0.15); ctx.moveTo(px - Math.cos(d) * back, py - Math.sin(d) * back); ctx.lineTo(px - Math.cos(d) * (back + MW * 0.5), py - Math.sin(d) * (back + MW * 0.5)); }
      ctx.stroke();
    }
    if (e._litU > clock) drawMon(e.kind, ex, y, MWd, face > 0, true, 0.45 * (e._litU - clock) / 0.25, foot);
  }
  SQX = 1; SQY = 1;
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
  clock += dt; rdt = mode === "paused" ? 0 : dt; if (bannerT > 0) bannerT -= dt; if (flash > 0) flash -= dt; if (wandT > 0) wandT -= dt;
  // 카메라: 트라우마는 지수로 줄고(약 0.3초), 멈칫·느리게·확대는 화면 시간으로
  trauma = trauma > 0.001 ? trauma * Math.exp(-dt * 4.5) - dt * 0.15 : 0; if (trauma < 0) trauma = 0;
  if (hitStop > 0) hitStop -= dt; if (slowT > 0) slowT -= dt; zoomP *= Math.exp(-dt * 5); if (zoomP < 0.001) zoomP = 0;
  if (comboPop > 0) comboPop = Math.max(0, comboPop - dt * 5); if (multiPop > 0) multiPop = Math.max(0, multiPop - dt * 6);
  if (mode !== "paused") {
    parts.update(dt);
    if (parts.arrived) { parts.arrived = 0; once("gemTing", 45, () => synth.tone(1568 * (1 + rr() * 0.06), 2093, 0.08, "sine", 0.03)); bumpChip("gems"); }
    for (const c of cols) c.t += dt; for (let i = cols.length - 1; i >= 0; i--) if (cols[i].t >= cols[i].T) cols.splice(i, 1);
    for (const d of decals) d.t += dt; while (decals.length && decals[0].t >= decals[0].T) decals.shift();
    for (const z of echoes) z.t += dt; while (echoes.length && echoes[0].t >= echoes[0].T) echoes.shift();
    syncRibbons(dt);
    for (const c of callouts) c.t += dt; while (callouts.length && callouts[0].t >= callouts[0].T) callouts.shift();
    for (let i = sched.length - 1; i >= 0; i--) if (clock >= sched[i].at) { const f = sched[i].fn; sched.splice(i, 1); if (world) f(); }
    updateSpell(dt);
    if (cardTrail) { const r = cardTrail.getBoundingClientRect(); if (r.width) { const sx = (r.left + r.width / 2 - mapX) / mapS, sy = (r.top + r.height / 2 - mapY) / mapS; glowAt(sx, sy, TX.gGold, 30, 90, 0.3, 1, 0.8); pa(P_SPIN, TX.star[(clock * 30 | 0) % 4], sx, sy, (rr() - 0.5) * 80, (rr() - 0.5) * 80, 0.5, 22, 6, 0, 1, 0, rr() * TAU, 6); } }
  }
  if (mode === "reward" && rewardNext && world && (!spell || !spell.on || spell.t >= spell.T)) { const r = rewardNext; rewardNext = null; openCards(r); }
  if (fxList.length) { for (const f of fxList) f.t += dt; fxList = fxList.filter(f => f.t < f.dur); }
  if (world && mode !== "play" && mode !== "paused" && mode !== "over" && mode !== "start") {
    E.stepFx(world, dt);
    for (const t of world.towers) { if (t.grow > 0) t.grow -= dt * 1.6; if (t.flash > 0) t.flash -= dt; }
  }
  if (mode === "resume") { resumeT -= dt; if (resumeT <= 0) { E.resumeAfter(world); mode = "play"; last = performance.now(); } }
}
// 품질 자동 조절: 최근 30프레임 평균 간격이 20ms(50fps)를 넘으면 품질 ×0.7(최저 0.35, 0.5초에 한 번까지), 17.5ms 안쪽이 6초 이어지면 +0.1
const ivBuf = new Float32Array(30); let ivN = 0, ivSum = 0, lastNow = 0, qCool = 0, fastAcc = 0;
function tuneQuality(now) {
  const iv = now - lastNow; lastNow = now;
  if (frozen || document.hidden || iv > 200 || iv <= 0) return;
  const i = ivN++ % 30; ivSum += iv - ivBuf[i]; ivBuf[i] = iv;
  if (ivN < 30) return;
  const avg = ivSum / 30;
  if (qCool > 0) qCool -= iv / 1000;
  if (avg > 20 && qCool <= 0 && quality > 0.35) { quality = Math.max(0.35, quality * 0.7); qCool = 0.5; fastAcc = 0; pcap = Math.round((PHONE ? PCAP_PHONE : PCAP_DESK) * quality); }
  else if (avg < 17.5) { fastAcc += iv / 1000; if (fastAcc > 6 && quality < 1) { quality = Math.min(1, quality + 0.1); fastAcc = 0; pcap = Math.round((PHONE ? PCAP_PHONE : PCAP_DESK) * quality); } }
  else fastAcc = 0;
}
// HUD 칩이 통 튄다(수정이 닿을 때)
let bumpAt = 0;
function bumpChip(id) { const now = performance.now(); if (now - bumpAt < 90) return; bumpAt = now; const el = $(id) && $(id).parentElement; if (!el) return; el.classList.remove("bump"); void el.offsetWidth; el.classList.add("bump"); }
function frame(now) {
  tuneQuality(now);
  const dt = frozen ? 0 : Math.min(0.05, Math.max(0, (now - last) / 1000)); last = now;
  ui(dt);
  const t0 = performance.now();
  if (mode === "play" && world && !document.hidden && !frozen) update(dt);
  else if (mode === "start" && DEMO && world && !document.hidden && !frozen) demoStep(dt);
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
  if (DEMO && world) world.kid = i;     // 시연 판의 성 위 마법사도 바로 바뀐다
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
    b.addEventListener("click", () => {
      const changed = mapId !== m.id;
      mapId = m.id; save.map = m.id; writeSave(); paintMaps(); paintChips(); sfx.tap(); bgKey = "";
      if (changed && mode === "start") startDemo();   // 시연도 고른 길로
    });
    mapBox.appendChild(b);
  }
  const next = L.MAPS.find(m => !open.includes(m.id)), stars = L.MAPS.reduce((n, m) => n + save.maps[m.id].stars, 0);
  $("nextMap").textContent = "별 " + stars + "/" + L.MAPS.length * 3 + " · 열린 길 " + open.length + "/" + L.MAPS.length + (next ? " · 다음 길 ‘" + next.name + "’: 성공 " + (next.need - save.wins) + "번 더" : "");
}
function paintBest() {
  const b = save.best[L.PILOTS[pilot].kid];
  $("bestLine").textContent = b && b.runs ? L.PILOTS[pilot].name + " 기록 · 가장 멀리 막은 파도 " + b.wave + " · 한 판에 맞힌 문제 " + b.solved + "개" : "";
}
// 처음 화면 칩: 고른 길(별) · 도감 모은 수 · 다음 배지까지 남은 문제 — 목표는 늘 보이고, 자세한 글은 눌렀을 때만
const mapChip = $("mapChip"), goalChip = $("goalChip"), dexChip = $("dexBtn");
function dexCount() {
  let n = 0, all = 0;
  for (const k of L.MONSTER_IDS) { all++; if (save.monsters[k]) n++; }
  for (const k of L.TOWER_IDS) { all += 3; if (save.towers[k]) n++; if (save.branches[k + ":a"]) n++; if (save.branches[k + ":b"]) n++; }
  return { n, all };
}
function paintChips() {
  const m = L.mapOf(mapId), st = save.maps[mapId].stars, d = dexCount();
  mapChip.innerHTML = "<span>" + m.name + '</span><span class="st">' + "★".repeat(st) + '<i class="st0">' + "☆".repeat(3 - st) + '</i></span><span class="cv">▼</span>';
  mapChip.setAttribute("aria-label", "지킬 길 " + m.name + " 별 " + st + "개 · 눌러서 다른 길");
  dexChip.innerHTML = "도감 <b>" + d.n + "/" + d.all + "</b>";
  const next = L.BADGES.find(g => save.solved < g.need), got = L.BADGES.filter(g => save.solved >= g.need).length;
  goalChip.innerHTML = '<i class="ic ic-gem"></i>' + (next ? "배지까지 " + (next.need - save.solved) + "문제" : "배지 " + got + "/" + L.BADGES.length);
  goalChip.setAttribute("aria-label", "마법 배지 " + got + "개" + (next ? " · 문제 " + (next.need - save.solved) + "개 더 맞히면 " + next.name : ""));
}
function toggleDrawer(chip, id) {
  const el = $(id), open = el.hidden;
  ["mapDrawer", "goalDrawer"].forEach(k => { $(k).hidden = true; });
  [mapChip, goalChip].forEach(c => c.setAttribute("aria-expanded", "false"));
  el.hidden = !open; chip.setAttribute("aria-expanded", String(open));
  sfx.tap();
}
mapChip.addEventListener("click", () => toggleDrawer(mapChip, "mapDrawer"));
goalChip.addEventListener("click", () => toggleDrawer(goalChip, "goalDrawer"));
function paintStart() {
  if (!L.openMaps(save.wins).includes(mapId)) mapId = "field";
  paintMaps(); paintBest(); paintChips();
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
startDemo();

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
    get s() { if (DEMO) return { mode, pilot, map: mapId, demo: true, monsters: world ? world.monsters.length : 0, towers: world ? world.towers.map(t => t.kind + t.lv + "@" + t.pad) : [] }; return world ? { mode, t: +world.t.toFixed(2), wave: world.wave, phase: world.phase, cake: world.cake, gems: world.gems, monsters: world.monsters.length, shots: world.shots.length, towers: world.towers.map(t => t.kind + t.lv + (t.branch || "") + "@" + t.pad), owl: !!world.owl, sent: world.sent, solved: world.solved, streak: world.streak, blasts: world.blasts, cards: world.cards, quizTowers: world.quizTowers, prepT: +world.prepT.toFixed(2), waveT: +world.waveT.toFixed(2), pending: world.pending, over: world.over, rescueUsed: world.rescueUsed, pilot, map: mapId, speed, haste: E.hasteOn(world) } : { mode, pilot, map: mapId }; },
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
    hasQuiz: () => !!GameQuiz,
    buildAsk: () => (buildAsk ? { pad: buildAsk.pad, kind: buildAsk.kind, wrong: buildAsk.wrong, done: buildAsk.done, back: !backBtn.hidden } : null),
    cancelBuild: () => cancelBuildQuiz(),
    freeTower: (on = true) => { if (world) world.freeTower = on; },
    grow: () => (world ? world.fx.grow.map(g => ({ lv: g.lv, big: !!g.big, t: +g.t.toFixed(2) })) : []),
    openCards: (firstTry = true) => { if (world && mode === "play") openCards({ firstTry }); return cardsShown; },
    freeze: (on = true) => { frozen = on; },
    blast: (firstTry = true) => (world ? rewardBlast(firstTry) : null),
    timing: () => ({ update: lastUpdateMs, render: lastRenderMs }),
    bench: (n = 60) => { const t0 = performance.now(); let up = 0, rd = 0, mx = 0; for (let i = 0; i < n; i++) { const a = performance.now(); if (mode === "play") update(1 / 60); const b = performance.now(); render(); const c = performance.now(); up += b - a; rd += c - b; mx = Math.max(mx, c - a); } return { frames: n, updateMs: +(up / n).toFixed(2), renderMs: +(rd / n).toFixed(2), totalMs: +((performance.now() - t0) / n).toFixed(2), maxMs: +mx.toFixed(2) }; },
    fxCount: () => fxList.length, fxLoaded: () => Object.keys(FX).concat(Object.keys(FXI)),
    juice: () => ({ particles: parts.count, pcap, quality, fx: fxList.length, trauma: +trauma.toFixed(2), hitStop: +Math.max(0, hitStop).toFixed(2), slowT: +Math.max(0, slowT).toFixed(2), combo, callouts: callouts.map(c => c.text), spell: spell ? { t: +spell.t.toFixed(2), on: spell.on, T: spell.T, targets: spell.targets.length, done: spell.targets.filter(g => g.done).length } : null, comets: comets.length, echoes: echoes.length, ribbons: ribbons.length, decals: decals.length }),
    setQuality: q => { quality = q; pcap = Math.round((PHONE ? PCAP_PHONE : PCAP_DESK) * quality); },
    skipSpell: () => skipSpell(), skip: (k, on = true) => { SKIP[k] = on; return SKIP; }, fxList: () => fxList.map(f => f.name + ":" + Math.round(f.size)),
    snap: (scale = 1) => { const c = document.createElement("canvas"); c.width = Math.round(canvas.width * scale); c.height = Math.round(canvas.height * scale); c.getContext("2d").drawImage(canvas, 0, 0, c.width, c.height); return c.toDataURL("image/jpeg", 0.85); },
    demo: () => DEMO, startDemo,
    guide: () => (guide ? { pad: guide.pad, t: +guide.t.toFixed(2), wait: guide.wait, on: guideOn() } : null),
    buildFirst: () => $("build").classList.contains("first"),
    art: () => Object.keys(ART), view: () => ({ vw, vh, mapS, mapX, mapY, dpr, portrait }),
  };
}
requestAnimationFrame(frame);
