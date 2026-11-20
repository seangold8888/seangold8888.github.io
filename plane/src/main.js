// 스카이 샷 — 세로로 나는 비행기 슈팅. 별을 먹고 수학 문제를 맞히면 무기가 한 단계씩 세진다.
// 그림은 art/ 의 그림책풍 그림 파일을 쓴다(못 읽으면 캔버스 도형으로 대신 그린다). shadowBlur 는 쓰지 않는다 — 아이패드에서 가장 느리다.
import { weapon, weaponLabel, forkAt, MAINS, SIDES, MAIN_IDS, SIDE_IDS, playerYRange, MAX_WEAPON, enemyHp, bossHp, enemySpeed, formation, isBossWave, BOSS_STAY, SHIELD_LEVELS, bossOf, tuning, TRAILS, unlockedTrails } from "./logic.js?v=6";
import * as S from "./sfx.js?v=5";
import * as FX from "./fx.js?v=3";
import { EDITION } from "./edition.js?v=1";   // 판마다 다른 값(조종사·제목·돌아가기 링크·수학 아이 목록·외침)

const $ = id => document.getElementById(id);
const canvas = $("sky"), ctx = canvas.getContext("2d", { alpha: false });
FX.init(ctx); FX.loadSheets("art/", 1);
// 글꼴이 다 읽힌 뒤에 미리 만든다(먼저 만들면 다른 글꼴로 굳는다)
(document.fonts && document.fonts.ready ? document.fonts.ready : Promise.resolve()).then(() => FX.prewarm(["#ffb627", "#ff5aa8", "#2fbfff", "#ff9ec4", "#ff7a9c", "#ffd95a", "#7dffb0", "#6fd3ff", "#fff6c8", "#fff2c0", "#ffb24a", "#ffcf5a", "#9fe8ff", "#8fe8ff", "#7fe8ff", "#ff9b3d", "#ffd23a", "#ff60aa", "#46d7ff", "#ffc83c", "#6fdcff", "#4fd0ff", "#ff7ab8", "#ffcc00", "#ff6a00", "#ffffff", "#ffe45c"], Object.values(SHOT_LOOK).map(l => [l.c, l.tl]).concat(RAINBOW4.map(c => [c, 92])))).catch(() => {});
const FW = 360;                       // 놀이판 논리 너비. 높이는 화면 비율에 맞춘다.
let FH = 640, scale = 1, offX = 0, vw = 0, vh = 0, dpr = 1, bg = null, dprCap = 1.5;   // 계속 무거우면 dprCap 을 1 로 낮춰 칠할 화소를 줄인다
const BEST_KEY = "plane_best_v1", SOUND_KEY = "plane_sound_v1", PILOT_KEY = "plane_pilot_v1", STAR_KEY = "plane_stars_v1", TRAIL_KEY = "plane_trail_v1", BEST_LV_KEY = "plane_bestlv_v1";
// 조종사 넷(edition.js). 고른 조종사의 비행기로 난다.
// kid: 공통 수학 모듈(GameQuiz)의 아이 id. 고른 조종사는 GameQuiz 의 "지금 하는 아이"(gq_kid_v1)와 같이 쓴다.
// 판이 자기 수학 아이 목록을 주면(quizProfiles) GameQuiz 를 그 목록으로 먼저 바꾼다. 가족판은 null(기본 목록 그대로).
if (EDITION.quizProfiles && window.GameQuiz && window.GameQuiz.configure) window.GameQuiz.configure({ profiles: EDITION.quizProfiles, voice: EDITION.shouts !== false, playPass: EDITION.playTimer !== false });
const PILOTS = EDITION.pilots;
const PILOT_ART = new Set(PILOTS.map(p => p.art));
// 대장 목록: 판이 bosses 를 주면 그 목록({ id, name, art?, act?, size? }), 없으면 logic.js 의 셋(가족판).
// art: 그림 이름(없으면 id), act: 움직임(boss 비·snowking 눈송이·typhoon 회오리 부하·squirrel 도토리 부채, 없으면 id), size: 그릴 너비,
// shot: 그 대장이 던지는 탄 그림(squirrel 의 도토리), spill: 이기면 쏟아지는 간식 그림들. squirrel 은 판 설정 대장으로만 나온다(가족판 셋에는 없다).
const BOSS_LIST = EDITION.bosses || undefined;
const bossInfo = who => (BOSS_LIST && BOSS_LIST.find(b => b.id === who)) || {};
const bossArt = who => bossInfo(who).art || who, bossAct = who => bossInfo(who).act || who;
const BOSS_EXTRA_ART = (BOSS_LIST || []).flatMap(b => [bossArt(b.id), ...(b.shot ? [b.shot] : []), ...(b.spill || [])]);
// 조종사의 난이도 칸(logic.js PILOT_TUNING)·필살기 칸(fx.js ULTS). 판이 tune/ult 를 주지 않으면 순서 번호 그대로(가족판).
const tuneOf = i => (PILOTS[i] && PILOTS[i].tune != null ? PILOTS[i].tune : i);
const ultOf = i => (PILOTS[i] && PILOTS[i].ult != null ? PILOTS[i].ult : i);
let pilot = EDITION.defaultPilot != null ? EDITION.defaultPilot : 1;
try { const saved = parseInt(localStorage.getItem(PILOT_KEY), 10); if (saved >= 0 && saved < PILOTS.length) pilot = saved; } catch (_) {}
// 저장된 조종사가 이미 그 아이면 그대로 둔다(조종사 여럿이 수학 아이 하나를 같이 쓰는 판에서 늘 첫 조종사로 돌아가지 않게).
try { const k = window.GameQuiz && window.GameQuiz.currentKid(); const i = PILOTS.findIndex(p => p.kid === k); if (i >= 0 && !(PILOTS[pilot] && PILOTS[pilot].kid === k)) pilot = i; } catch (_) {}
// 모은 별(맞힌 문제 수)과 고른 꼬리 모양. 판이 끝나도 남는다.
let stars = 0, trail = 0, tune = tuning(tuneOf(pilot)), runStars = 0, starsAtStart = 0;
try { stars = Math.max(0, parseInt(localStorage.getItem(STAR_KEY) || "0", 10) || 0); const t = parseInt(localStorage.getItem(TRAIL_KEY), 10); if (t >= 0 && t < unlockedTrails(stars)) trail = t; } catch (_) {}

/* ---------- 그림 ---------- */
const ART = {}, WHITE = {};           // WHITE: 맞았을 때 번쩍이는 흰 실루엣
let skyTile = null, skyY = 0;
function whiten(im) {
  const c = document.createElement("canvas"); c.width = im.width; c.height = im.height;
  const x = c.getContext("2d"); x.drawImage(im, 0, 0); x.globalCompositeOperation = "source-in"; x.fillStyle = "#fff"; x.fillRect(0, 0, c.width, c.height);
  return c;
}
// 조종사 비행기의 짙은 남색 그림자(조금 크게 깔아 테두리처럼 보이게)
const DARK = {};
function darken(im) { const c = whiten(im), x = c.getContext("2d"); x.globalCompositeOperation = "source-in"; x.fillStyle = "rgba(16,14,60,.78)"; x.fillRect(0, 0, c.width, c.height); return c; }
const FLASHY = new Set([...PILOT_ART, "cloud", "zig", "bolt", "gift", "boss", "tornado", "hail", "baby", "snowking", "typhoon", ...BOSS_EXTRA_ART]);
for (const n of new Set([...PILOT_ART, "cloud", "zig", "bolt", "gift", "boss", "star", "drop", "sky", "gun", "helper", "pellet", "candy", "comet", "rainbow", "pop", "meteor", "tornado", "hail", "baby", "flake", "snowking", "typhoon", "heart", ...BOSS_EXTRA_ART])) {
  const im = new Image();
  im.onload = () => { ART[n] = im; if (n === "sky") skyTile = null; else if (FLASHY.has(n)) WHITE[n] = whiten(im); if (PILOT_ART.has(n)) DARK[n] = darken(im); };
  im.src = "art/" + n + ".webp?v=" + (PILOT_ART.has(n) ? EDITION.pilotArtV : 1);
}
// 가운데 (x, y), 너비 w 로 그린다. 그림이 아직 없으면 false.
function sprite(n, x, y, w, hit) {
  const im = ART[n]; if (!im) return false;
  const h = w * im.height / im.width;
  ctx.drawImage(hit && WHITE[n] ? WHITE[n] : im, x - w / 2, y - h / 2, w, h);
  return true;
}
// 보호막 방울과 무지개 고리는 한 번만 그려 두고 붙인다(매 프레임 그라데이션을 만들지 않는다).
function prerender(size, draw) { const c = document.createElement("canvas"); c.width = c.height = size; draw(c.getContext("2d"), size / 2); return c; }
const bubble = prerender(184, (x, r) => {
  const g = x.createRadialGradient(r, r, r * 0.55, r, r, r - 3);
  g.addColorStop(0, "rgba(140,235,255,0)"); g.addColorStop(0.8, "rgba(140,235,255,.30)"); g.addColorStop(1, "rgba(235,255,255,.95)");
  x.fillStyle = g; x.beginPath(); x.arc(r, r, r - 3, 0, 7); x.fill();
  x.strokeStyle = "rgba(255,255,255,.9)"; x.lineWidth = 5; x.lineCap = "round"; x.beginPath(); x.arc(r, r, r * 0.74, 3.7, 4.5); x.stroke();
});
const aura = prerender(208, (x, r) => {
  const colors = ["#ff7a9c", "#ffb24a", "#ffe45c", "#7dffb0", "#6fd3ff", "#b9a2ff"];
  x.lineWidth = 9; x.lineCap = "round"; x.globalAlpha = 0.85;
  for (let i = 0; i < 12; i++) { x.strokeStyle = colors[i % 6]; x.beginPath(); x.arc(r, r, r - 8, i * Math.PI / 6 + 0.08, (i + 1) * Math.PI / 6 - 0.08); x.stroke(); }
});
// 새 무기 그림도 한 번만 그려 둔다. 레이저 줄기는 가로 그라데이션 띠를 세로로 늘여 붙인다.
function canvasOf(w, h, draw) { const c = document.createElement("canvas"); c.width = w; c.height = h; draw(c.getContext("2d"), w, h); return c; }
function beamTex(rgb) {
  return canvasOf(32, 4, (x, w, h) => {
    const g = x.createLinearGradient(0, 0, w, 0);
    g.addColorStop(0, "rgba(" + rgb + ",0)"); g.addColorStop(0.28, "rgba(" + rgb + ",.55)"); g.addColorStop(0.42, "rgba(" + rgb + ",1)");
    g.addColorStop(0.5, "#ffffff"); g.addColorStop(0.58, "rgba(" + rgb + ",1)"); g.addColorStop(0.72, "rgba(" + rgb + ",.55)"); g.addColorStop(1, "rgba(" + rgb + ",0)");
    x.fillStyle = g; x.fillRect(0, 0, w, h);
  });
}
const BEAM = {
  pink: beamTex("255,96,170"), cyan: beamTex("70,215,255"), gold: beamTex("255,200,60"),
  rainbow: canvasOf(32, 4, (x, w, h) => {
    const g = x.createLinearGradient(0, 0, w, 0), cs = ["255,122,156", "255,178,74", "255,228,92", "255,255,255", "125,255,176", "111,211,255", "185,162,255"];
    cs.forEach((c, i) => g.addColorStop(i / (cs.length - 1), "rgba(" + c + "," + (i === 0 || i === cs.length - 1 ? 0.15 : 0.95) + ")"));
    x.fillStyle = g; x.fillRect(0, 0, w, h);
  }),
};
const RAINBOW4 = ["#ff7a9c", "#ffd95a", "#7dffb0", "#6fd3ff"];
const beamHex = { pink: "#ff60aa", cyan: "#46d7ff", gold: "#ffc83c", rainbow: "#ff9ec4" };
// 바탕 탄 그림마다: 빛 색, 그릴 크기(예전보다 크게), 꼬리 길이
const SHOT_LOOK = { pellet: { c: "#ffb627", s: 17, tl: 70 }, candy: { c: "#ff5aa8", s: 21, tl: 74 }, comet: { c: "#2fbfff", s: 20, tl: 84 }, rainbow: { c: "#ff9ec4", s: 25, tl: 92 } };
const CREAM = "#fff6dc";
const missileTex = canvasOf(24, 56, (x) => {          // 위를 보는 미사일(그릴 때 날아가는 쪽으로 돌린다)
  x.lineJoin = "round"; x.lineWidth = 3; x.strokeStyle = CREAM;
  x.fillStyle = "#4a6bd8"; x.beginPath(); x.moveTo(3, 46); x.lineTo(12, 36); x.lineTo(21, 46); x.lineTo(21, 52); x.lineTo(3, 52); x.closePath(); x.stroke(); x.fill();     // 꼬리 날개
  x.fillStyle = "#f4f6ff"; x.beginPath(); x.moveTo(12, 3); x.quadraticCurveTo(19, 12, 18, 22); x.lineTo(18, 46); x.lineTo(6, 46); x.lineTo(6, 22); x.quadraticCurveTo(5, 12, 12, 3); x.closePath(); x.stroke(); x.fill();
  x.fillStyle = "#ff5a6e"; x.beginPath(); x.moveTo(12, 4); x.quadraticCurveTo(17.5, 11, 17.6, 17); x.lineTo(6.4, 17); x.quadraticCurveTo(6.5, 11, 12, 4); x.fill();      // 빨간 코
  x.fillStyle = "#ffb24a"; x.fillRect(6, 28, 12, 4);
});
const bombTex = canvasOf(48, 52, (x) => {
  x.lineWidth = 4; x.strokeStyle = CREAM; x.fillStyle = "#ff8a3d";      // 밝은 주황 폭탄: 어두운 적 탄과 헷갈리지 않게
  x.beginPath(); x.arc(24, 30, 18, 0, 7); x.stroke(); x.fill();
  x.fillStyle = "rgba(255,255,255,.35)"; x.beginPath(); x.arc(17, 23, 6, 0, 7); x.fill();
  x.fillStyle = "#6b6f9e"; x.fillRect(19, 8, 10, 6);
  x.strokeStyle = "#c9a26b"; x.lineWidth = 3; x.beginPath(); x.moveTo(24, 8); x.quadraticCurveTo(28, 2, 34, 4); x.stroke();
  x.fillStyle = "#ffe45c"; x.beginPath(); x.arc(35, 4, 4, 0, 7); x.fill();
});
const boomTex = canvasOf(48, 48, (x) => {             // 바나나 모양 부메랑
  x.lineJoin = "round"; x.lineCap = "round";
  const path = () => { x.beginPath(); x.moveTo(6, 40); x.quadraticCurveTo(10, 8, 42, 8); x.quadraticCurveTo(20, 16, 16, 42); x.closePath(); };
  path(); x.lineWidth = 6; x.strokeStyle = CREAM; x.stroke();
  path(); x.fillStyle = "#ff9b3d"; x.fill();
  x.strokeStyle = "#ffe08a"; x.lineWidth = 3; x.beginPath(); x.moveTo(13, 34); x.quadraticCurveTo(16, 16, 34, 12); x.stroke();
});
const orbTex = prerender(40, (x, r) => {
  const g = x.createRadialGradient(r, r, 2, r, r, r);
  g.addColorStop(0, "#ffffff"); g.addColorStop(0.35, "rgba(150,240,255,1)"); g.addColorStop(0.62, "rgba(90,170,255,.55)"); g.addColorStop(1, "rgba(90,170,255,0)");
  x.fillStyle = g; x.beginPath(); x.arc(r, r, r, 0, 7); x.fill();
});
// 하늘 그림을 위아래로 뒤집어 이어 붙여 끊김 없이 흐르게 한다. 놀이판 화소 크기로 한 번만 만들어 둔다.
// 차가운 남색 덧칠(빛 효과가 살아나게)도 이 그림에 미리 구워 둔다 — 매 프레임 화면 전체를 한 번 더 칠하지 않게. 진하기 세 가지(보통·7~8단계·대장전).
const skyTinted = {};
function sky(tint) {
  const im = ART.sky; if (!im) return null;
  if (!skyTile) {
    for (const k in skyTinted) delete skyTinted[k];
    const w = Math.max(1, Math.round(FW * scale * dpr)), h = Math.round(w * im.height / im.width);
    skyTile = document.createElement("canvas"); skyTile.width = w; skyTile.height = h * 2;
    const x = skyTile.getContext("2d"); x.drawImage(im, 0, 0, w, h); x.translate(0, h * 2); x.scale(1, -1); x.drawImage(im, 0, 0, w, h);
  }
  if (!tint) return skyTile;
  let t = skyTinted[tint];
  if (!t) { t = skyTinted[tint] = document.createElement("canvas"); t.width = skyTile.width; t.height = skyTile.height; const x = t.getContext("2d"); x.drawImage(skyTile, 0, 0); x.fillStyle = "rgba(15,35,80," + tint + ")"; x.fillRect(0, 0, t.width, t.height); }
  return t;
}

/* ---------- 소리: sfx.js(Web Audio 합성 효과음 + 조종사 함성 클립). 음성 합성 금지 — 아이패드 마이크가 죽는다 ---------- */
let soundOn = true;
try { soundOn = localStorage.getItem(SOUND_KEY) !== "0"; } catch (_) {}
S.setEnabled(soundOn);
// AudioContext 는 손가락·키가 닿을 때만 만들고 깨운다(iOS).
function audio() { S.unlock(); }
for (const ev of ["pointerdown", "touchend", "keydown", "click"]) addEventListener(ev, audio, { capture: true, passive: true });
const sfx = {
  pop: () => S.play("pop"),
  star: () => S.play("star"),
  no: () => S.play("wrong"),
  hit: () => S.play("playerHit"),
  boss: () => S.play("bossWarn"),
  zap: () => S.play("bolt", level),
  boom: () => S.play("bomb", level),
  kill: big => S.play(big ? "bigPop" : "pop", level),
  warn: () => S.play("warn"),
};

/* ---------- 수학: 공통 모듈 GameQuiz(아이별 단계·기록) ----------
   조종사 = 아이. 문제는 그 아이 나이에 맞는 단계에서 나오고, 기록도 아이별로 따로 쌓인다.
   문제 화면(위쪽 패널·잠금·새 터치만 인정)도 GameQuiz 것을 쓴다. 갈림길 고르기 화면만 이 게임 것. */
const GameQuiz = window.GameQuiz;

/* ---------- 상태 ---------- */
let mode = "start";                  // start | play | quiz | over
// 미리보기 비행(시작 화면 뒤): 진짜 엔진을 그대로 돌리지만 소리·문제·하트·필살기·기록은 없다. demoY = 비행기가 나는 높이(시작 패널 바로 위).
let demo = false, demoY = 0, demoT = 0, demoAimT = 0;
let player, bullets, enemies, drops, rain, sparks, clouds, pops, rings, warns, smoke, zaps, bombs, booms;
let level, hearts, dist, wave, queue, waveGap, fireT, solved, firstTries, shield, shake, banner, bannerT, halfStep, flash = 0, trailT = 0, clock = 0, bannerBig = false;
let path = {}, missileT = 0, boltT = 0, bombT = 0, boomT = 0, boomSide = 1, orbAng = 0, yr = null;
let spill = [];                       // 다람쥐 두목을 이기면 쏟아지는 간식 그림(그림만, 줍는 것 아님)
const rnd = (a, b) => a + Math.random() * (b - a);
const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
// 지금 무기(단계·갈래가 바뀔 때만 새로 만든다)
let wCache = null, wKey = "";
let wLv = -1, wMain, wSide;
function W() { if (level !== wLv || path.main !== wMain || path.side !== wSide) { wLv = level; wMain = path.main; wSide = path.side; wCache = weapon(level, path); } return wCache; }   // 문자열을 만들지 않고 비교(매 프레임 여러 번 불린다)

function reset() {
  player = { x: FW / 2, y: yr.home, tx: FW / 2, ty: yr.home, inv: 0, tilt: 0 };
  bullets = []; enemies = []; drops = []; rain = []; sparks = []; pops = []; rings = []; warns = []; smoke = []; zaps = []; bombs = []; booms = []; spill = []; flash = 0;
  tune = tuning(tuneOf(pilot)); runStars = 0; starsAtStart = stars;
  level = 1; hearts = tune.hearts; dist = 0; wave = 0; queue = []; waveGap = 1.2; fireT = 0;
  path = {}; missileT = 0; boltT = 0; bombT = 1; boomT = 0.5; ultAt = -1; ultMini = false; gauge = 0; ultStar = null; ultQueued = false; ultTries = 0; ultEarned = 0; FX.reset();
  solved = 0; firstTries = 0; shield = 0; shake = 0; banner = ""; bannerT = 0; halfStep = 0; quizCool = 0;
  // 첫 별 보장: 출발 3~4초에 비행기 바로 앞으로 내려온다(별을 못 만나 수십 초 동안 문제·보상이 없던 문제)
  if (!demo) drops.push({ x: FW / 2, y: yr.home - 300, vy: 70, t: 0, first: true });
  hud();
}
function hud() {
  $("hearts").textContent = "♥".repeat(Math.max(0, hearts)) + "♡".repeat(Math.max(0, tune.hearts - hearts));
  // 좁은 화면(폰 세로)에서는 "8단계 미사일"처럼 짧게(말줄임표로 잘리지 않게). 긴 이름은 접근성 이름으로 남긴다.
  const full = weaponLabel(level, path), w = W();
  $("weaponName").textContent = innerWidth < 520 ? level + "단계 " + (w.main ? MAINS[w.main].name : w.name) : full;
  $("weaponName").title = full;
  $("pips").innerHTML = Array.from({ length: MAX_WEAPON }, (_, i) => '<i class="' + (i < level ? "on" : "") + '"></i>').join("");
  $("dist").textContent = Math.floor(dist) + "m";
}
function say(text, big) { banner = text; bannerT = big ? 2.4 : 1.8; bannerBig = !!big; }

/* ---------- 화면 크기 ---------- */
function resize() {
  vw = Math.max(1, innerWidth); vh = Math.max(1, innerHeight);
  dpr = Math.min(devicePixelRatio || 1, dprCap);
  canvas.width = Math.round(vw * dpr); canvas.height = Math.round(vh * dpr);
  const fieldPx = Math.min(vw, vh * 0.66);          // 가로 화면에서는 가운데 세로 띠만 놀이판
  scale = fieldPx / FW; offX = (vw - fieldPx) / 2; FH = vh / scale;
  // 세로로 움직일 수 있는 구간. 화면 크기가 바뀌면 구간 안에서의 상대 위치를 그대로 옮긴다.
  FX.setField(FW, FH);
  try {
    const hb = document.querySelector(".hud").getBoundingClientRect().bottom; FX.setHud(Math.max(0, hb / scale)); hudBottom = Math.max(0, hb / scale);
    const g = $("ultBar"); g.style.top = Math.round(hb + 4) + "px"; g.style.left = Math.round(offX + 8) + "px";      // 필살기 게이지: HUD 바로 아래, 놀이판 왼쪽 끝
  } catch (_) {}
  if (player) hud();
  const oldYr = yr; yr = playerYRange(FH);
  if (player && oldYr) { const f = clamp((player.ty - oldYr.min) / Math.max(1, oldYr.max - oldYr.min), 0, 1); player.ty = player.y = yr.min + f * (yr.max - yr.min); }
  skyTile = null;
  // 하늘 배경은 한 번만 그려 두고 매 프레임 붙인다.
  bg = document.createElement("canvas"); bg.width = canvas.width; bg.height = canvas.height;
  const b = bg.getContext("2d"), g = b.createLinearGradient(0, 0, 0, bg.height);
  g.addColorStop(0, "#131f5c"); g.addColorStop(0.55, "#3b5fc4"); g.addColorStop(1, "#8fd0f4");
  b.fillStyle = g; b.fillRect(0, 0, bg.width, bg.height);
  b.fillStyle = "rgba(8,12,40,.38)";
  b.fillRect(0, 0, offX * dpr, bg.height); b.fillRect((offX + fieldPx) * dpr, 0, bg.width, bg.height);
  clouds = Array.from({ length: 9 }, () => ({ x: rnd(0, FW), y: rnd(0, FH), r: rnd(22, 46), v: rnd(18, 46) }));
}

/* ---------- 입력: 손가락이 가는 만큼 비행기가 앞뒤좌우로 따라간다(잡은 자리와의 차이를 그대로 둔다) ---------- */
let grab = null;
const toField = clientX => (clientX - offX) / scale, toFieldY = clientY => clientY / scale;
canvas.addEventListener("pointerdown", e => { audio(); if (mode !== "play") return; grab = { id: e.pointerId, dx: player.tx - toField(e.clientX), dy: player.ty - toFieldY(e.clientY) }; });
canvas.addEventListener("pointermove", e => {
  if (mode !== "play" || !grab || grab.id !== e.pointerId) return;
  player.tx = clamp(toField(e.clientX) + grab.dx, 20, FW - 20);
  player.ty = clamp(toFieldY(e.clientY) + grab.dy, yr.min, yr.max);
});
const release = e => { if (grab && (!e || grab.id === e.pointerId)) grab = null; };
canvas.addEventListener("pointerup", release); canvas.addEventListener("pointercancel", release);
addEventListener("blur", () => { release(); for (const k in keys) keys[k] = false; });
const keys = {};
addEventListener("keydown", e => {
  keys[e.key] = true;
  // 고르는 화면: 화면이 뜬 뒤 새로 누른 키만 인정한다(누르고 있던 키의 반복 입력은 무시).
  if (e.repeat || !guard || performance.now() < guard.armAt) return;
  freshKeyAt = performance.now();
  const n = parseInt(e.key, 10);
  if (n >= 1 && n <= guard.buttons.length) { e.preventDefault(); guard.onPick(guard.buttons[n - 1], n - 1); }
});
addEventListener("keyup", e => { keys[e.key] = false; });

/* ---------- 실수 터치 막기: 문제·무기 고르는 버튼 ----------
   별을 먹을 때 비행기를 끌던 손가락이 화면에 붙어 있으면, 그 손가락을 뗄 때 답이 눌려 버렸다.
   (1) 화면이 뜨고 LOCK_MS 동안은 버튼이 흐리고 잠겨 있다.
   (2) 잠금이 풀린 뒤 그 버튼 위에서 새로 누르고(pointerdown) 같은 버튼 위에서 뗀(pointerup) 것만 고른 것으로 친다.
       click 하나만 믿지 않는다. 키보드는 화면이 뜬 뒤 새로 누른 Enter/스페이스/숫자키만. */
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
      if (at && !b.contains(at)) return;                 // 누른 채 버튼 밖으로 나가서 뗐다
      onPick(b, i);
    });
    b.addEventListener("pointercancel", () => { g.down = null; });
    b.addEventListener("click", e => {
      // 손가락·마우스는 위 pointerup 이 처리한다. 여기서는 키보드로 누른 click(detail 0)만, 그것도 새로 누른 키일 때만.
      if (e.detail === 0 && guard === g && freshKeyAt >= g.armAt && performance.now() - freshKeyAt < 1500) onPick(b, i);
    });
  });
}
function disarm() { if (guard) guard.panel.classList.remove("locked"); guard = null; }

/* ---------- 파도 ---------- */
function startWave() {
  if (demo && wave >= DEMO_LAST_WAVE) { wave = 1; demoWeapon(); }   // 미리보기는 대장 없이 2~4번째 파도만 돈다
  wave++;
  queue = formation(wave, Math.random, tune, BOSS_LIST).map(f => Object.assign({}, f));
  if (isBossWave(wave)) { FX.bossIntro(bossOf(wave, BOSS_LIST).name); sfx.boss(); S.play("bossRumble"); setTimeout(() => S.shout("boss"), 1100); addGauge(ULT_RULES.gaugeBossIntro); }
}
function spawn(f) {
  const x = 26 + f.x * (FW - 52), hp = Math.max(1, Math.round(enemyHp(wave) * tune.hp)), speed = enemySpeed(wave) * tune.speed;
  if (f.kind === "boss") { const bh = Math.round(bossHp(wave) * tune.hp); enemies.push({ kind: "boss", who: f.who || "boss", x: FW / 2, y: spawnY() - 40, r: 54, hp: bh, max: bh, vy: 40, t: 0, shot: 1.5 }); }
  else if (f.kind === "tornado") enemies.push({ kind: "tornado", x, y: spawnY(), r: 19, hp, max: hp, vy: speed * 0.85, vx: (Math.random() < 0.5 ? -1 : 1) * 105 * tune.speed, t: 0 });
  else if (f.kind === "hail") { const hh = Math.ceil(hp * 2.5); enemies.push({ kind: "hail", x, y: spawnY() - 4, r: 27, hp: hh, max: hh, vy: speed * 0.6, t: rnd(0, 6) }); }
  else if (f.kind === "gift") enemies.push({ kind: "gift", x, y: spawnY(), r: 20, hp: Math.max(1, Math.ceil(hp * 0.5)), max: Math.max(1, Math.ceil(hp * 0.5)), vy: 62, t: rnd(0, 6) });
  else if (f.kind === "meteor") { warns.push({ x: Math.min(FW - 24, Math.max(24, player.x)), t: 1.2 }); sfx.warn(); }   // 경고 먼저, 조금 뒤에 떨어진다
  else if (f.kind === "zig") enemies.push({ kind: "zig", x, y: spawnY(), r: 20, hp, max: hp, vy: speed * 1.2, t: 0, bx: x });
  else if (f.kind === "bolt") enemies.push({ kind: "bolt", x, y: spawnY(), r: 16, hp: Math.ceil(hp * 0.6), max: Math.ceil(hp * 0.6), vy: 150, t: 0 });
  else enemies.push({ kind: "cloud", x, y: spawnY(), r: 24, hp, max: hp, vy: speed, t: rnd(0, 6) });
}
function burst(x, y, color, n = 8) {
  for (let i = 0; i < n && sparks.length < 90; i++) sparks.push({ x, y, vx: rnd(-120, 120), vy: rnd(-140, 80), life: rnd(0.25, 0.55), color });
}

/* ---------- 다람쥐 두목(act "squirrel" — 판 설정 bosses 로만 나온다) ---------- */
// 도토리 부채: 쏠 때마다 0.55초 몸을 흔들며 도토리를 들어 올린 뒤(예고) 3개(두 바퀴째부터 5개)를 비행기 쪽으로 부채꼴로 던진다. 천천히, 빙글빙글.
// 세 번째마다 큰 도토리: 곧장 떨어지다 화면 가운데쯤에서 멈춰 0.75초 번쩍이며 갈라질 세 방향을 점선으로 보여 주고, 작은 도토리 셋으로 갈라진다.
// 간격은 다른 대장과 같은 식(파도·조종사 빠르기)에 every 를 곱한다. 빠르기는 비(118)·거품(92) 사이.
const SQ = { wind: 0.55, every: 1.8, fanV: 100, spread: 0.3, aimMax: 0.6, bigV: 85, bigWarn: 0.75, splitV: 105, splitA: 0.55 };
const sqLater = () => wave > 6 * ((BOSS_LIST && BOSS_LIST.length) || 3);
function squirrelThrow(e) {
  const art = bossInfo(e.who).shot || "acorn", x0 = e.x, y0 = e.y + 40;
  e.throwN = (e.throwN || 0) + 1;
  FX.ring(x0, y0, 70, "#ffd36b", 0.35, 6); S.play("pop");
  if (e.throwN % 3 === 0) { if (rain.length < 30) rain.push({ x: x0, y: y0, vx: 0, vy: SQ.bigV * tune.speed, art, big: true, rot: 0, spin: 3, burstY: Math.max(y0 + 90, FH * 0.42) }); return; }
  const n = sqLater() ? 5 : 3, sp = n === 5 ? SQ.spread * 0.8 : SQ.spread, v = SQ.fanV * tune.speed;
  const a = Math.PI / 2 + clamp(Math.atan2(player.y - y0, player.x - x0) - Math.PI / 2, -SQ.aimMax, SQ.aimMax);   // 비행기 쪽, 너무 옆으로는 안 던진다
  for (let i = 0; i < n && rain.length < 30; i++) { const ai = a + (i - (n - 1) / 2) * sp; rain.push({ x: x0, y: y0, vx: Math.cos(ai) * v, vy: Math.sin(ai) * v, art, rot: rnd(0, 6), spin: (Math.random() < 0.5 ? -1 : 1) * rnd(5, 8) }); }
}
function acornSplit(r) {
  r.dead = true; S.play("bigPop"); FX.ring(r.x, r.y, 90, "#ffb24a", 0.4, 7); FX.sparkleBurst(r.x, r.y, 10, ["#ffd36b", "#c98a4a", "#ffffff"]);
  for (const k of [-1, 0, 1]) if (rain.length < 30) { const a = Math.PI / 2 + k * SQ.splitA, v = SQ.splitV * tune.speed; rain.push({ x: r.x, y: r.y, vx: Math.cos(a) * v, vy: Math.sin(a) * v, art: r.art, rot: rnd(0, 6), spin: k * 7 || 6 }); }
}
// 이기면 훔쳐 간 간식이 쏟아진다(그림만, 줍는 것 아님) + 진짜 별 2개 더(대장 별까지 3개. 별 하나 = 문제 하나 규칙 그대로).
// 간식은 대장 폭발이 한창일 때를 피해 조금 늦게(세계 시간 0.45~1초, 느린 화면이라 실제로는 1.5초쯤 뒤부터) 대장 가운데서 나와
// 낮게 튀어 오르고(화면 위로 나가지 않게), 양옆 벽에 튕기며 화면 가운데 아래까지 떨어져 한 번 통 튄 뒤 사라진다.
function squirrelSpill(who, x, y) {
  const arts = bossInfo(who).spill || ["gift"], y0 = Math.max(y, hudBottom + 90);
  for (let i = 0; i < 20; i++) spill.push({ x: x + rnd(-24, 24), y: y0 + rnd(-8, 12), vx: rnd(-150, 150), vy: rnd(-230, -90), rot: rnd(0, 6), spin: rnd(-5, 5), w: rnd(28, 38), t: 0, life: rnd(2.6, 3.2), delay: 0.45 + i * 0.028, art: arts[i % arts.length], fx: i === 0 });
  for (const k of [-1, 1]) drops.push({ x: clamp(x + k * 50, 30, FW - 30), y: y + 10, vy: 70, t: 0 });
}
function updSpill(dt) {
  for (const s of spill) {
    if (s.delay > 0) { if ((s.delay -= dt) > 0) continue; if (s.fx) { FX.sparkleBurst(s.x, s.y, 24); FX.ring(s.x, s.y, 200, "#ffd95a", 0.6, 10); FX.callout("간식을 되찾았어요!", 5, "#ffe45c", 1.8); S.play("pop"); } }
    s.t += dt; s.x += s.vx * dt; s.y += s.vy * dt; s.vy += 480 * dt; s.rot += s.spin * dt;
    if (s.x < 18 || s.x > FW - 18) { s.x = clamp(s.x, 18, FW - 18); s.vx = -s.vx * 0.8; }
    if (!s.hop && s.vy > 0 && s.y > FH * 0.58) { s.hop = true; s.vy = -s.vy * 0.42; s.spin = -s.spin; }    // 한 번 통 튄다
  }
  spill = spill.filter(s => s.t < s.life && s.y < FH + 40);
}
function drawAcorn(r) {
  const w = r.big ? 40 : 24, warn = r.warn > 0, blink = warn && Math.floor(r.warn * 10) % 2 === 1;
  if (warn) {                                           // 갈라질 세 방향(점선) + 오므라드는 고리
    const k = 1 - r.warn / SQ.bigWarn;
    ctx.save(); ctx.strokeStyle = "rgba(255,90,90,.8)"; ctx.lineWidth = 3; ctx.lineCap = "round"; ctx.setLineDash([6, 7]); ctx.beginPath();
    for (const s of [-1, 0, 1]) { const a = Math.PI / 2 + s * SQ.splitA; ctx.moveTo(r.x + Math.cos(a) * 28, r.y + Math.sin(a) * 28); ctx.lineTo(r.x + Math.cos(a) * 96, r.y + Math.sin(a) * 96); }
    ctx.stroke(); ctx.setLineDash([]);
    ctx.strokeStyle = "rgba(255,244,190," + (0.95 - k * 0.5).toFixed(2) + ")"; ctx.lineWidth = 4; ctx.beginPath(); ctx.arc(r.x, r.y, 52 - k * 26, 0, 7); ctx.stroke(); ctx.restore();
  }
  ctx.save(); ctx.translate(r.x, r.y); ctx.rotate(warn ? Math.sin(r.warn * 40) * 0.35 : r.rot || 0);
  if (warn) { const s = 1 + (1 - r.warn / SQ.bigWarn) * 0.25; ctx.scale(s, s); }
  if (!sprite(r.art, 0, 0, w, blink)) { ctx.fillStyle = blink ? "#ffffff" : "#b8783a"; ctx.beginPath(); ctx.ellipse(0, 0, w * 0.4, w * 0.5, 0, 0, 7); ctx.fill(); }
  ctx.restore();
}

/* ---------- 문제 ---------- */
// 문제 화면은 GameQuiz.ask 가 띄운다(위쪽 패널, 0.7초 잠금, 새로 누른 터치만, 숫자키 1~3, 틀리면 그 보기만 꺼짐).
let quiz = null, quizCool = 0;   // quizCool: 문제를 막 끝낸 뒤 잠깐(선물 별 2개를 연달아 먹어도 문제가 두 번 뜨지 않게)
function openQuiz() {
  mode = "quiz"; grab = null; S.gate(true);
  const nextFork = forkAt(level + 1);
  const title = level >= MAX_WEAPON ? "맞히면 보호막이 생겨요"
    : nextFork === "main" ? "맞히면 새 무기를 골라요! " + MAIN_IDS.map(id => MAINS[id].name).join(" · ")
    : nextFork === "side" ? "맞히면 곁무기를 골라요! " + SIDE_IDS.map(id => SIDES[id].name).join(" · ")
    : "맞히면 무기가 세져요 → " + weapon(level + 1, path).name;
  if (!GameQuiz) { quiz = { firstTry: true }; const r = solve(true, null); resume(r.msg, r.leveled, r.fork); return; }   // 수학 모듈을 못 읽었으면 문제 없이 강화
  quiz = { firstTry: true };
  let outcome = null;
  GameQuiz.ask({
    kid: PILOTS[pilot].kid, title, voice: false,          // 외침은 스카이 샷이 직접 낸다(무기 강화·보호막 때). 겹치지 않게 GameQuiz 외침은 끈다
    theme: { top: 62, bg: "rgba(12,18,58,.96)", accent: "#ffd95a" },
    onWrong: () => sfx.no(),
    onCorrect: r => { outcome = solve(r.firstTry, r.growth); return outcome.msg; },
    onDone: () => { if (mode !== "quiz" || !outcome) return; resume(outcome.msg, outcome.leveled, outcome.fork); },
  });
}
// 갈림길: 그림 + 짧은 이름 + 큰 버튼 셋. 고르면 onDone.
function drawIcon(x, id, s) {
  x.lineJoin = "round"; x.lineCap = "round";
  if (id === "laser") { x.drawImage(BEAM.pink, s / 2 - 16, 4, 32, s - 18); x.fillStyle = "#fff"; x.beginPath(); x.arc(s / 2, s - 14, 8, 0, 7); x.fill(); }
  else if (id === "missile") {
    for (const [cx, a] of [[s * 0.32, -0.25], [s * 0.68, 0.25]]) {
      x.fillStyle = "rgba(233,238,252,.7)"; for (let i = 0; i < 4; i++) { x.beginPath(); x.arc(cx - Math.sin(a) * (16 + i * 9), s * 0.55 + Math.cos(a) * (16 + i * 9), 4 + i * 2, 0, 7); x.fill(); }
      x.save(); x.translate(cx, s * 0.42); x.rotate(a); x.drawImage(missileTex, -10, -23, 20, 46); x.restore();
    }
  } else if (id === "bolt") {
    const pts = [[s * 0.5, s - 8], [s * 0.38, s * 0.7], [s * 0.6, s * 0.55], [s * 0.3, s * 0.32], [s * 0.55, s * 0.24], [s * 0.78, s * 0.12]];
    x.strokeStyle = "rgba(120,220,255,.6)"; x.lineWidth = 9; x.beginPath(); pts.forEach((p, i) => (i ? x.lineTo(p[0], p[1]) : x.moveTo(p[0], p[1]))); x.stroke();
    x.strokeStyle = "#fff"; x.lineWidth = 3; x.stroke();
    x.fillStyle = "#b9a2ff"; for (const p of [pts[3], pts[5]]) { x.beginPath(); x.arc(p[0], p[1], 7, 0, 7); x.fill(); }
  } else if (id === "orb") {
    x.strokeStyle = "rgba(150,240,255,.5)"; x.lineWidth = 2; x.setLineDash([4, 5]); x.beginPath(); x.arc(s / 2, s / 2, s * 0.32, 0, 7); x.stroke(); x.setLineDash([]);
    x.fillStyle = "#fff"; x.beginPath(); x.arc(s / 2, s / 2, 7, 0, 7); x.fill();
    for (let i = 0; i < 3; i++) { const a = i * 2.094 - 0.5; x.drawImage(orbTex, s / 2 + Math.cos(a) * s * 0.32 - 13, s / 2 + Math.sin(a) * s * 0.32 - 13, 26, 26); }
  } else if (id === "bomb") {
    x.fillStyle = "#ffe45c"; for (let i = 0; i < 8; i++) { const a = i * 0.785; x.beginPath(); x.moveTo(s / 2, s / 2); x.lineTo(s / 2 + Math.cos(a - 0.18) * s * 0.48, s / 2 + Math.sin(a - 0.18) * s * 0.48); x.lineTo(s / 2 + Math.cos(a + 0.18) * s * 0.48, s / 2 + Math.sin(a + 0.18) * s * 0.48); x.fill(); }
    x.drawImage(bombTex, s / 2 - 24, s / 2 - 28, 48, 52);
  } else {
    x.strokeStyle = "rgba(255,255,255,.6)"; x.lineWidth = 3; x.setLineDash([5, 5]); x.beginPath(); x.ellipse(s / 2, s / 2, s * 0.28, s * 0.4, 0, 0, 7); x.stroke(); x.setLineDash([]);
    x.save(); x.translate(s * 0.72, s * 0.4); x.rotate(0.6); x.drawImage(boomTex, -20, -20, 40, 40); x.restore();
  }
}
function openFork(kind, onDone) {
  mode = "quiz"; grab = null; S.gate(true);
  const table = kind === "main" ? MAINS : SIDES, ids = Object.keys(table);
  $("forkKicker").textContent = kind === "main" ? "새 무기를 골라요!" : "곁무기를 하나 더 달아요!";
  $("forkTitle").textContent = kind === "main" ? "어떤 무기가 좋아요?" : "무엇을 더 달까요?";
  const box = $("forks"); box.innerHTML = "";
  const buttons = ids.map(id => {
    const b = document.createElement("button"); b.type = "button"; b.className = "fork";
    const c = document.createElement("canvas"); c.width = c.height = 84; drawIcon(c.getContext("2d"), id, 84);
    const name = document.createElement("b"); name.textContent = table[id].name;
    const tip = document.createElement("span"); tip.textContent = table[id].say;
    b.append(c, name, tip); box.appendChild(b); return b;
  });
  $("fork").hidden = false;
  armChoices($("fork"), buttons, (b, i) => {
    path = Object.assign({}, path, { [kind]: ids[i] }); disarm();
    buttons.forEach(x => { x.disabled = true; }); b.classList.add("ok"); S.play("fork"); S.shout("fork", true);
    setTimeout(() => { $("fork").hidden = true; onDone(); }, 380);
  });
}
// 문제·갈림길이 끝나고 다시 날기 시작한다.
function resume(msg, leveled, fork) {
  if (fork && mode === "quiz") { openFork(fork.kind, () => resume(fork.levelMsg(), true)); return; }
  quizCool = 4;
  player.inv = Math.max(player.inv, 1.2);
  // 무기 강화 순간: 잠깐 멈춤 + 비행기 번쩍 + 퍼지는 고리(가까운 적 탄을 지운다) + 새 무기 이름 띠
  if (leveled) { FX.levelUp(player.x, player.y, msg, weaponColor()); S.play("levelBlast", level); clearShots(player.x, player.y, 150); }
  else say(msg, false);
  hud(); if (mode === "quiz") mode = "play"; if (mode === "play") S.gate(false); last = performance.now();
  if (leveled) levelUpAt = playT;
}
// 적 탄(빗방울·눈송이)을 반짝이로 바꿔 지운다. r 없으면 전부.
function clearShots(x, y, r) {
  for (const d of rain) { if (d.dead || (r && (d.x - x) ** 2 + (d.y - y) ** 2 > r * r)) continue; d.dead = true; FX.sparkleBurst(d.x, d.y, 3); }
}

/* ---------- 필살기: 게이지 → 금빛 필살기 별 → 어려운 문제 → 필살기 ----------
   보통 별 문제(무기 강화)는 예전 그대로이고 필살기를 주지 않는다. 필살기는 이 길 하나뿐이다:
   (1) 싸우는 동안 게이지가 찬다(시간 + 적을 터뜨릴 때 + 콤보 덤 + 대장 등장 덤).
   (2) 가득 차면 크고 느린 금빛 '필살기' 별이 나온다(사라지지 않고, 아래로 빠지면 위에서 다시 내려온다).
   (3) 잡으면 GameQuiz.ask({ pace: "challenge" }) — 공통 모듈이 아이별로 한 단계 위 문제를 낸다(잘하고 있을 때).
   (4) 한 번에 맞히면 큰 필살기(2.2초), 고쳐서 맞히면 작은 필살기(1초, 주변만). 어떤 경우에도 맞히면 눈에 보이는 보상이 있다.
   수학 모듈(GameQuiz)이 없으면 게이지도 별도 없다(예전과 같은 게임). 숫자는 모두 여기 한 곳에서 바꾼다. */
const ULT_RULES = {
  // 큰 필살기(한 번에 맞혔을 때)
  popEnemies: true,       // 화면의 보통 적(선물 풍선·대장 제외)을 모두 터뜨린다
  clearShots: true,       // 적 탄을 모두 지운다
  bossDamagePct: 10,      // 대장 최대 체력의 몇 % 를 한 번에
  invuln: true,           // 2.2초(+여유) 동안 비행기가 다치지 않는다
  // 작은 필살기(고쳐서 맞혔을 때)
  miniRadius: 130,        // 비행기 둘레 이 거리 안의 보통 적만 터뜨린다(대장 피해 없음, 적 탄은 모두 지움)
  miniInvuln: 1.2,        // 초
  // 게이지(100 이 차면 필살기 별)
  gaugeMax: 100,
  gaugePerSec: 0.55,      // 날기만 해도 1초에
  gaugePerKill: 1.3,      // 적 하나 터뜨릴 때
  gaugeComboBonus: 0.6,   // 콤보 10 이상일 때 하나마다 덤
  gaugeBossIntro: 40,     // 대장이 나올 때 덤(대장전에 필살기를 쓸 수 있게)
  // 필살기 별
  pickupSpeed: 26,        // 아래로 내려오는 빠르기(1초에 칸) — 보통 별(70)보다 훨씬 느리다
  pickupSway: 46,         // 좌우로 흔들리는 폭
  pickupMagnet: 1.7,      // 조종사 자석 거리의 몇 배에서 끌려온다
  pickupLife: 0,          // 0 = 사라지지 않음(아래로 빠지면 위에서 다시)
  holdAfterLevelUp: 1.4,  // 무기 강화 장면 뒤 이만큼은 별을 내보내지 않고 기다린다(겹치지 않게)
};
let playT = 0, gauge = 0, ultStar = null, ultQueued = false, ultAt = -1, ultMini = false, levelUpAt = -9, ultTries = 0, ultEarned = 0, gaugeShown = -1;
const ultOn = () => !!GameQuiz;
function addGauge(n) {
  if (demo || !ultOn() || ultStar || FX.ultActive() || ultAt >= 0 || gauge >= ULT_RULES.gaugeMax) return;
  gauge = Math.min(ULT_RULES.gaugeMax, gauge + n);
}
function paintGauge() {
  const el = $("ultBar"); if (!el) return;
  if (!ultOn()) { el.hidden = true; return; }
  const live = mode === "play" || mode === "quiz";
  const pct = gauge >= ULT_RULES.gaugeMax ? 100 : Math.floor(gauge / ULT_RULES.gaugeMax * 20) * 5;     // 5% 단위로만 다시 그린다(DOM 갱신을 줄인다)
  const v = pct + (ultStar ? 1000 : 0) + (live ? 0 : 2000);
  if (v === gaugeShown) return; gaugeShown = v;
  el.hidden = !live; el.classList.toggle("full", gauge >= ULT_RULES.gaugeMax);
  $("ultFill").style.width = Math.min(100, v % 1000) + "%";
  $("ultText").textContent = ultStar ? "별을 잡아요!" : gauge >= ULT_RULES.gaugeMax ? "가득!" : "필살기";
}
// 매 프레임(놀이 중): 게이지가 차면 별을 내보내고, 별을 움직이고, 잡으면 어려운 문제
function updUlt(dt, rdt) {
  if (demo) return;                    // 미리보기 비행에는 필살기 별이 없다
  playT += rdt;
  if (!ultOn()) return;
  addGauge(ULT_RULES.gaugePerSec * dt);
  if (gauge >= ULT_RULES.gaugeMax && !ultStar) {
    const busy = FX.ultActive() || ultAt >= 0 || playT - levelUpAt < ULT_RULES.holdAfterLevelUp || drops.length > 0;
    ultQueued = busy;
    // 별은 왼쪽 가운데에서 나온다(오른쪽 위 칭찬 글자와 겹치지 않게)
    if (!busy) { ultStar = { x: FW / 2, bx: rnd(FW * 0.22, FW * 0.38), y: hudY() + 96, t: 0 }; S.play("ultStar"); FX.callout("필살기 별!", 3, "#ffd23a", 1.6); }
  }
  if (ultStar) {
    const u = ultStar; u.t += dt;
    let d = Math.hypot(player.x - u.x, player.y - u.y);
    const mag = tune.magnet * ULT_RULES.pickupMagnet;
    if (d < mag) u.held = true;                              // 가까이 오면 흔들림을 멈추고 비행기로 끌려온다
    if (u.held) { u.x += (player.x - u.x) * Math.min(1, dt * 5); u.y += (player.y - u.y) * Math.min(1, dt * 5); }
    else {
      u.y += ULT_RULES.pickupSpeed * dt; u.x = clamp(u.bx + Math.sin(u.t * 1.2) * ULT_RULES.pickupSway, 30, FW - 30);
      if (u.y > FH + 40) u.y = hudY() + 30;               // 놓쳐도 위에서 다시 내려온다(사라지지 않음)
    }
    d = Math.hypot(player.x - u.x, player.y - u.y);
    if (d < 34 && mode === "play" && !FX.ultActive() && ultAt < 0) openUltQuiz();
  }
  if (ultAt >= 0) { ultAt -= rdt; if (ultAt < 0) startUlt(ultMini); }
}
// HUD 아래 끝(놀이판 좌표). resize 때 잰다.
let hudBottom = 50;
const hudY = () => hudBottom;
// 적이 나오는 줄: HUD 알약 바로 뒤에서 나와 곧바로 HUD 아래로 보이게(예전 -30 → 폰에서 약 70~90칸 아래). 대장이 머무는 줄도 HUD 아래로.
const spawnY = () => Math.max(-30, hudBottom - 34);
const bossHoverY = () => Math.max(138, Math.min(hudBottom + 92, yr.min - 110));     // 비행기가 올라갈 수 있는 곳과는 늘 떨어져 있게
function openUltQuiz() {
  mode = "quiz"; grab = null; S.gate(true); S.play("ultStarGet"); ultTries++;
  let res = null;
  GameQuiz.ask({
    kid: PILOTS[pilot].kid, title: "어려운 문제! 맞히면 필살기!", pace: "challenge", voice: false,   // 외침은 필살기가 시작될 때 직접 낸다
    theme: { top: 62, bg: "rgba(40,22,8,.96)", accent: "#ffd23a" },
    onWrong: () => sfx.no(),
    onCorrect: r => {
      res = r; solved++; if (r.firstTry) firstTries++; stars++; runStars++; try { localStorage.setItem(STAR_KEY, String(stars)); } catch (_) {}
      S.play("levelup", 8);
      return r.firstTry ? "정답! 필살기 발사!" : "정답! 작은 필살기!";
    },
    onDone: () => {
      if (mode !== "quiz") return;
      ultStar = null; gauge = 0; gaugeShown = -1; ultEarned++;
      ultMini = !(res && res.firstTry); ultAt = 0.2;
      player.inv = Math.max(player.inv, 1.2);
      mode = "play"; S.gate(false); last = performance.now(); hud();
    },
  });
}
// 큰 필살기: 조종사마다 다른 큰 공격(2.2초). 작은 필살기: 주변만 1초.
function startUlt(mini) {
  const R = ULT_RULES, u = ultOf(pilot);
  const killOne = e => { if (!e.dead) { damage(e, e.hp + 1); S.play("ultHit", u); } };
  if (mini) {
    player.inv = Math.max(player.inv, R.miniInvuln);
    S.play("ultHit", u); S.shout("ult", true);
    const api = { player: () => player };
    FX.miniUltimate(u, api, R.miniRadius);
    clearShots();
    for (const e of enemies) if (targetable(e) && e.kind !== "boss" && e.kind !== "gift" && (e.x - player.x) ** 2 + (e.y - player.y) ** 2 < R.miniRadius * R.miniRadius) killOne(e);
    return;
  }
  if (R.invuln) player.inv = Math.max(player.inv, 2.8);
  S.play("ultStart", u); S.shout("ult", true);
  FX.ultimate(u, ART[PILOTS[pilot].art], {
    targets: () => (R.popEnemies ? enemies.filter(e => targetable(e) && e.kind !== "boss" && e.kind !== "gift") : []),
    kill: killOne,
    bossHit: () => { const b = enemies.find(e => e.kind === "boss" && !e.dead); if (b && R.bossDamagePct > 0) damage(b, b.max * R.bossDamagePct / 100); S.play("ultHit", u); },
    clearShots: () => { if (R.clearShots) clearShots(); },
    player: () => player,
  });
}
// 필살기 별 그리기: 크고 느린 금빛 별 + 도는 빛갈래 + 반짝이 + "필살기" 글씨(보통 문제 별과 확실히 다르게)
function drawUltStar() {
  const u = ultStar; if (!u) return;
  const s = 64 + Math.sin(clock * 5) * 5;
  ctx.drawImage(FX.glow("#ffd23a"), u.x - s, u.y - s, s * 2, s * 2);
  ctx.save(); ctx.translate(u.x, u.y); ctx.rotate(clock * 1.5); ctx.globalAlpha = 0.8; ctx.drawImage(ultRays, -s * 0.95, -s * 0.95, s * 1.9, s * 1.9); ctx.restore(); ctx.globalAlpha = 1;
  if (!sprite("star", u.x, u.y, 58)) star(u.x, u.y, 24, "#ffd23a");
  for (let i = 0; i < 4; i++) { const a = clock * 3 + i * 1.57, r = 38; star(u.x + Math.cos(a) * r, u.y + Math.sin(a) * r, 5, "#fff6a8"); }
  FX.label("필살기", u.x, u.y + 40, 15, "#ffe45c");
}
const ultRays = prerender(128, (x, r) => { x.translate(r, r); for (let i = 0; i < 10; i++) { x.rotate(Math.PI / 5); const g = x.createLinearGradient(0, 0, 0, -r); g.addColorStop(0, "rgba(255,240,170,.95)"); g.addColorStop(1, "rgba(255,200,60,0)"); x.fillStyle = g; x.beginPath(); x.moveTo(-7, 0); x.lineTo(0, -r); x.lineTo(7, 0); x.fill(); } });
// 지금 무기의 대표 색(효과 색)
function weaponColor() {
  const w = W();
  if (w.laser) return beamHex[w.laser.color] || "#ff60aa";
  if (w.missile) return "#ff9b3d";
  if (w.bolt) return "#6fdcff";
  return level >= 7 ? "#4fd0ff" : level >= 4 ? "#ff7ab8" : "#ffd23a";
}
// 정답을 맞힌 순간(GameQuiz 가 기록을 마친 뒤) 보상을 정한다. 반환한 msg 는 패널에 잠깐 뜨고, 닫힌 뒤 resume 이 이어 간다.
function solve(firstTry, growth) {
  quiz = quiz || { firstTry };
  quiz.firstTry = firstTry;
  solved++; if (quiz.firstTry) firstTries++;
  stars++; runStars++; try { localStorage.setItem(STAR_KEY, String(stars)); } catch (_) {}
  let msg;
  // 한 번에 맞히면 바로 한 단계. 고쳐서 맞히면 반 단계(두 번 모이면 한 단계) + 보호막.
  if (!quiz.firstTry) halfStep++;
  let leveled = false;
  const shoutLater = (ev, ms) => setTimeout(() => S.shout(ev, true), ms);      // 보통 별 문제: 예전처럼 강화·보호막 외침(필살기 없음)
  const gains = [], pre = growth && growth.promoted ? "수학 " + growth.level + "단계로 올라갔어요! · " : "";
  if (level < MAX_WEAPON && (quiz.firstTry || halfStep >= 2)) {
    if (!quiz.firstTry) halfStep = 0; level++; leveled = true;
    // 맞힌 그 순간 빰빠밤(1초 안에 느껴지는 보상). 갈림길이 아니면 0.55초 뒤 조종사 함성 — 갈림길이면 고를 때 외친다.
    S.play("levelup", level); if (!forkAt(level)) shoutLater("upgrade", 550);
    const before = weapon(level - 1, path), now = weapon(level, path);
    if ((now.guns || 0) > (before.guns || 0)) gains.push("기관총 +" + (now.guns - (before.guns || 0)));
    if ((now.helpers || 0) > (before.helpers || 0)) gains.push("호위기 +" + now.helpers);
    if (SHIELD_LEVELS.includes(level)) { shield = Math.min(2, shield + 1); gains.push("보호막 +1"); }
  }
  else { shield = Math.min(2, shield + 1); msg = quiz.firstTry ? "보호막 +1" : "정답! 보호막 +1 · 한 번 더 맞히면 무기 강화"; S.play("correct"); shoutLater("shield", 450); }
  // 갈림길 단계면 고른 뒤에 이름이 정해지므로 배너 문구는 그때 만든다.
  const fork = leveled ? forkAt(level) : null;
  const levelMsg = () => pre + weaponLabel(level, path) + "!" + (gains.length ? " " + gains.join(" · ") : "");
  msg = leveled ? (fork ? pre + (fork === "main" ? "새 무기를 고를 수 있어요!" : "곁무기를 고를 수 있어요!") : levelMsg()) : pre + msg;
  quiz = null;
  return { msg, leveled, fork: fork ? { kind: fork, levelMsg } : null };
}

/* ---------- 진행 ---------- */
function hurt() {
  if (demo || player.inv > 0) return;
  if (shield > 0) { shield--; player.inv = 1.2; say("보호막이 막아 줬어요"); S.play("shieldBreak"); return; }
  hearts--; player.inv = 1.8; shake = 0.35; FX.shake(0.45); sfx.hit(); hud();
  if (hearts <= 0) gameOver();
}
function gameOver() {
  mode = "over"; grab = null; disarm(); S.gate(false); if (GameQuiz) GameQuiz.close(); $("fork").hidden = true;
  let best = 0; try { best = parseInt(localStorage.getItem(BEST_KEY) || "0", 10) || 0; } catch (_) {}
  const d = Math.floor(dist), record = d > best;
  if (record) { try { localStorage.setItem(BEST_KEY, String(d)); } catch (_) {} }
  try { if (level > (parseInt(localStorage.getItem(BEST_LV_KEY) || "0", 10) || 0)) localStorage.setItem(BEST_LV_KEY, String(level)); } catch (_) {}   // 시작 화면 목표 칸: 가장 높이 올린 무기 단계
  $("overText").innerHTML = "<b>" + d + "m</b> 날았어요" + (record ? " · 새 기록!" : " · 최고 " + best + "m") +
    "<br>문제 " + solved + "개 풀고, 그중 " + firstTries + "개를 한 번에 맞혔어요.<br>마지막 무기: <b>" + W().name + (W().sideName ? " + " + W().sideName : "") + "</b>" +
    "<br>⭐ 별 <b>+" + runStars + "</b> · 모은 별 " + stars + "개" +
    (unlockedTrails(stars) > unlockedTrails(starsAtStart) ? "<br><b>새 꼬리 ‘" + TRAILS[unlockedTrails(stars) - 1].name + "’가 열렸어요!</b>" : "");
  paintTrails(); paintGoals();
  $("overTitle").textContent = PILOTS[pilot].name + " 조종사, 잘 날았어요!";
  $("over").hidden = false;
}
// 레이저 줄기의 시작점·방향(각 줄기마다). 그리기와 맞히기가 같은 값을 쓴다.
function beamGeo(b) { const a = b[0]; return { ox: player.x + b[1], oy: player.y - 26, sx: Math.sin(a), sy: -Math.cos(a), a }; }
const targetable = e => e.kind !== "meteor" && e.y > -10 && !e.dead;
function explode(x, y, r, dmg, direct, big) {
  for (const m of enemies) if (targetable(m) && (m.x - x) ** 2 + (m.y - y) ** 2 < (r + m.r) ** 2) damage(m, m === direct ? dmg : dmg * 0.6);
  if (big) FX.blast(x, y, r, "#ffcf5a", 0.3); else FX.blast(x, y, r * 0.75, "#ffb24a", 0.12);
}
// 큰 무기·곁무기(바탕 탄 말고 나머지). 매 프레임 부른다.
function arms(dt, w) {
  if (w.laser) {
    const L = w.laser;
    for (const b of L.beams) {
      const g = beamGeo(b), reach = L.w / 2;
      for (const e of enemies) {
        if (!targetable(e)) continue;
        const rx = e.x - g.ox, ry = e.y - g.oy, along = rx * g.sx + ry * g.sy;
        if (along < -e.r || Math.abs(rx * g.sy - ry * g.sx) > e.r + reach) continue;
        damage(e, L.dps * dt); if (e.kind === "boss" && !e.dead) S.play("bossHit");
        if (Math.random() < dt * 14) FX.hit(e.x + rnd(-6, 6), e.y + e.r * 0.5, beamHex[L.color] || "#ffffff", L.w > 12 ? 2 : 1);
      }
    }
  }
  if (w.missile) {
    const M = w.missile; missileT -= dt;
    if (missileT <= 0) {
      missileT = M.every; S.play("missile", w.level);
      for (let i = 0; i < M.n && bullets.length < 140; i++) {
        const k = i % 2 ? 1 : -1, row = i >> 1;
        bullets.push({ kind: "missile", x: player.x + k * (14 + row * 8), y: player.y + 2, vx: k * (110 + row * 50), vy: -120 - row * 30, dmg: M.dmg, splash: M.splash, life: 3, smokeT: 0 });
      }
    }
  }
  if (w.bolt) {
    const B = w.bolt; boltT -= dt;
    if (boltT <= 0) {
      const hit = []; let from = { x: player.x, y: player.y - 24 }, range = 300;
      while (hit.length < B.chain) {
        let best = null, bd = range * range;
        for (const e of enemies) { if (!targetable(e) || hit.includes(e) || e.y > player.y + 10) continue; const d = (e.x - from.x) ** 2 + (e.y - from.y) ** 2; if (d < bd) { bd = d; best = e; } }
        if (!best) break;
        hit.push(best); from = best; range = 130;
      }
      if (hit.length) {
        boltT = B.every;
        const pts = [[player.x, player.y - 24]];
        let px = player.x, py = player.y - 24;
        for (const e of hit) {
          const dx = e.x - px, dy = e.y - py, len = Math.hypot(dx, dy) || 1, nx = -dy / len, ny = dx / len;
          for (let s = 1; s <= 3; s++) { const j = rnd(-11, 11); pts.push([px + dx * s / 4 + nx * j, py + dy * s / 4 + ny * j]); }
          pts.push([e.x, e.y]); px = e.x; py = e.y;
          damage(e, B.dmg); FX.zapAt(e.x, e.y, B.chain >= 4 ? 1.3 : 1);
        }
        // 0.36초 동안 남아 깜빡이며, 조금 다르게 꺾인 '메아리' 번개와 번갈아 보인다
        if (zaps.length < 8) zaps.push({ pts, echo: pts.map((p, i) => (i && i < pts.length - 1 ? [p[0] + rnd(-9, 9), p[1] + rnd(-9, 9)] : p)), t: 0.36, big: B.chain >= 4 });
        sfx.zap();
      } else boltT = 0.1;           // 칠 적이 없으면 곧 다시 살핀다
    }
  }
  if (w.orb) {
    const O = w.orb; orbAng += dt * 3.4;
    for (let i = 0; i < O.n; i++) {
      const a = orbAng + i * Math.PI * 2 / O.n, ox = player.x + Math.cos(a) * 46, oy = player.y + Math.sin(a) * 46;
      for (const e of enemies) if (targetable(e) && !(e.cdOrb > 0) && (e.x - ox) ** 2 + (e.y - oy) ** 2 < (e.r + 10) ** 2) { damage(e, O.dmg); e.cdOrb = O.cd; FX.hit(ox, oy, "#9ff0ff", 2); S.play("orb", w.level); }
      for (const r of rain) if (!r.dead && (r.x - ox) ** 2 + (r.y - oy) ** 2 < 15 * 15) { r.dead = true; FX.sparkleBurst(r.x, r.y, 4, ["#d8f6ff", "#9ff0ff"]); S.play("orb", w.level); }       // 빗방울·눈송이를 막아 준다
    }
  }
  if (w.bomb) {
    const K = w.bomb; bombT -= dt;
    if (bombT <= 0 && bombs.length < 4) { bombT = K.every; S.play("bombDrop", w.level); bombs.push({ x: player.x, y: player.y - 24, vy: -320, top: Math.max(70, player.y - 250), dmg: K.dmg, r: K.r, t: 0 }); }
  }
  if (w.boom) {
    const R = w.boom; boomT -= dt;
    if (boomT <= 0 && booms.length < 4) {
      boomT = R.every; S.play("boom", w.level);
      const sides = R.n >= 2 ? [-1, 1] : [boomSide = -boomSide];
      for (const k of sides) booms.push({ k, t: 0, T: 1.15, dmg: R.dmg, x: player.x, y: player.y });
    }
  }
  for (const m of bombs) {
    m.t += dt; m.y += m.vy * dt;
    let go = m.y <= m.top;
    if (!go) for (const e of enemies) if (targetable(e) && (e.x - m.x) ** 2 + (e.y - m.y) ** 2 < (e.r + 12) ** 2) { go = true; break; }
    if (go) { m.dead = true; explode(m.x, m.y, m.r, m.dmg, null, true); sfx.boom(); S.shout("bomb"); }
  }
  for (const m of booms) {
    m.t += dt; const th = m.t / m.T * Math.PI * 2; m.px = m.x; m.py = m.y;
    m.x = player.x + m.k * 58 * Math.sin(th); m.y = player.y - 26 - 120 * (1 - Math.cos(th));
    if (m.t >= m.T) { m.dead = true; continue; }
    for (const e of enemies) if (targetable(e) && !(e.cdBoom > 0) && (e.x - m.x) ** 2 + (e.y - m.y) ** 2 < (e.r + 13) ** 2) { damage(e, m.dmg); e.cdBoom = 0.2; FX.hit(m.x, m.y, "#ffb24a", 2); }
  }
  bombs = bombs.filter(m => !m.dead); booms = booms.filter(m => !m.dead);
  for (const z of zaps) z.t -= dt; zaps = zaps.filter(z => z.t > 0);
  for (const s of smoke) s.t += dt; smoke = smoke.filter(s => s.t < 0.5);
}
function fire() {
  const w = W();
  S.play(w.laser ? "laser" : "shot", w.level);       // 레이저를 달면 바탕 탄 소리 대신 찌잉
  // 총구 번쩍: 탄이 나오는 자리 + 날개 기관총 자리(단계가 오를수록 크게)
  // 1단계부터 넉넉하게: 코끝 큰 번쩍(1발이면 56, 2발이면 40) + 그림만 살짝 눌리는 반동
  const look = SHOT_LOOK[w.bullet] || SHOT_LOOK.pellet, mz = 16 + w.level * 2.4;
  FX.recoil();
  for (const [, dx] of w.shots) FX.muzzle(player.x + dx, player.y - 30, look.c, Math.max(w.shots.length > 1 ? 40 : 56, mz));
  if (FX.qualityNow() >= 0.9) {                         // 날개 기관총 번쩍(느린 기기에서는 뺀다)
    if (w.guns >= 2) for (const k of [-1, 1]) FX.muzzle(player.x + k * 17, player.y - 6, look.c, mz * 0.7);
    if (w.guns >= 4) for (const k of [-1, 1]) FX.muzzle(player.x + k * 25, player.y - 1, look.c, mz * 0.6);
  }
  for (const [angle, dx] of w.shots) {
    if (bullets.length >= 140) break;
    bullets.push({ x: player.x + dx, y: player.y - 22, vx: Math.sin(angle) * 520, vy: -Math.cos(angle) * 520, dmg: w.dmg, pierce: !!w.pierce, beam: !!w.beam, art: w.bullet, hitT: 0 });
  }
  if (w.homing) for (let i = 0; i < w.homing && bullets.length < 140; i++) bullets.push({ x: player.x + (i ? 48 : -48), y: player.y + 4, vx: i ? 60 : -60, vy: -380, dmg: w.dmg, home: true, life: 2.2, hist: new Float32Array(16).fill(NaN), hi: 0 });
}
function damage(e, amount) {
  const before = e.hp;
  e.hp -= amount; if (!(e.flash > -0.14)) e.flash = 0.06;      // 연사로 맞아도 계속 하얗게 남지 않도록 번쩍임 사이를 띄운다
  // 대장 고비: 체력 2/3·1/3 을 넘을 때 크게 번쩍(효과만)
  if (e.kind === "boss" && e.hp > 0) for (const f of [2 / 3, 1 / 3]) if (before > e.max * f && e.hp <= e.max * f) { FX.bossPhase(e.x, e.y, f > 0.5 ? "좋아요! 조금만 더!" : "거의 다 왔어요!"); S.play("bossPhase"); }
  if (e.hp > 0) return;
  e.dead = true;
  if (e.kind === "boss") { S.play("bossDown"); setTimeout(() => S.shout("bossDown", true), 900); FX.bossDefeat(e.x, e.y, 170); S.play("chainBoom"); }
  else { sfx.kill(e.r >= 26); if (!FX.ultActive()) addGauge(ULT_RULES.gaugePerKill + (FX.comboNow() >= 10 ? ULT_RULES.gaugeComboBonus : 0)); FX.kill(e.x, e.y, e.r, { silentCombo: demo, color: e.kind === "gift" ? "#ffd95a" : e.kind === "zig" ? "#c3a8ff" : e.kind === "tornado" ? "#9fe8ff" : "#ffb347" }); }
  if (e.kind === "gift") burst(e.x, e.y, "#ffd95a", 8);
  if (e.kind === "gift") drops.push({ x: e.x, y: e.y, vy: 70, t: 0 });
  if (e.kind === "hail") for (const k of [-1, 1]) { const bh = Math.max(1, Math.ceil(e.max * 0.15)); enemies.push({ kind: "baby", x: e.x + k * 14, y: e.y, r: 13, hp: bh, max: bh, vy: e.vy * 1.9, vx: k * 70, t: 0 }); }
  if (e.kind === "boss") { drops.push({ x: e.x, y: e.y, vy: 70, t: 0 }); if (bossAct(e.who) === "squirrel") squirrelSpill(e.who, e.x, e.y); const name = bossOf(wave, BOSS_LIST).name; if (hearts < tune.hearts) { hearts++; pops.push({ x: e.x, y: e.y - 20, t: -0.5, w: 60, art: "heart" }); say(name + "을 물리쳤어요! 하트 +1", true); } else say(name + "을 물리쳤어요!", true); rain = []; for (const m of enemies) if (m.kind === "tornado") m.hp = 0, m.dead = true; hud(); }
}
// dt: 세계 시간(잠깐 멈춤·느린 화면이면 작아진다). rdt: 실제 시간 — 비행기는 늘 손가락을 그대로 따라간다.
function update(dt, rdt = dt) {
  dist += dt * (9 + wave * 0.6);
  // 비행기
  const kx = (keys.ArrowRight || keys.d || keys.D ? 1 : 0) - (keys.ArrowLeft || keys.a || keys.A ? 1 : 0);
  const ky = (keys.ArrowDown || keys.s || keys.S ? 1 : 0) - (keys.ArrowUp || keys.w || keys.W ? 1 : 0);
  if (kx) player.tx = clamp(player.tx + kx * 300 * rdt, 20, FW - 20);
  if (ky) player.ty = clamp(player.ty + ky * 260 * rdt, yr.min, yr.max);
  if (!demo) player.ty = clamp(player.ty, yr.min, yr.max);
  const dx = player.tx - player.x; player.x += dx * Math.min(1, rdt * 18); player.tilt += (Math.max(-1, Math.min(1, dx / 30)) - player.tilt) * Math.min(1, rdt * 10);
  player.y += (player.ty - player.y) * Math.min(1, rdt * 18);
  if (player.inv > 0) player.inv -= dt;
  FX.setPlayer(player.x, player.y); FX.engine(player.x, player.y, level, rdt);
  updUlt(dt, rdt);
  // 발사
  fireT -= dt; if (fireT <= 0) { fire(); fireT = W().every; }
  // 파도
  if (!queue.length && !enemies.length && !warns.length) { waveGap -= dt; if (waveGap <= 0) { startWave(); waveGap = 1.1; } }
  for (const f of queue) f.delay -= dt;
  while (queue.length && queue[0].delay <= 0) spawn(queue.shift());
  queue = queue.filter(f => { if (f.delay <= 0) { spawn(f); return false; } return true; });
  // 탄
  for (const b of bullets) {
    if (b.kind === "missile") {
      // 처음엔 옆으로 퍼졌다가 가장 가까운 적에게 꺾어 든다. 연기 꼬리를 남긴다.
      b.life -= dt; if (b.life <= 0) b.dead = true;
      let target = null, bestD = 1e9;
      for (const e of enemies) { if (!targetable(e)) continue; const d = (e.x - b.x) ** 2 + (e.y - b.y) ** 2; if (d < bestD) { bestD = d; target = e; } }
      const sp = 440, turn = Math.min(1, dt * 4.5);
      if (target) { const a = Math.atan2(target.y - b.y, target.x - b.x); b.vx += (Math.cos(a) * sp - b.vx) * turn; b.vy += (Math.sin(a) * sp - b.vy) * turn; }
      else { b.vx *= 1 - turn; b.vy += (-sp - b.vy) * turn; }
      b.smokeT -= dt; if (b.smokeT <= 0 && smoke.length < 90) { b.smokeT = 0.04; smoke.push({ x: b.x - b.vx * 0.03, y: b.y - b.vy * 0.03, t: 0 }); }
    }
    else if (b.home) {
      b.life -= dt;
      let target = null, bestD = 1e9;
      for (const e of enemies) { const d = (e.x - b.x) ** 2 + (e.y - b.y) ** 2; if (e.y > 0 && e.kind !== "meteor" && d < bestD) { bestD = d; target = e; } }
      if (target) { const a = Math.atan2(target.y - b.y, target.x - b.x); b.vx += (Math.cos(a) * 420 - b.vx) * Math.min(1, dt * 6); b.vy += (Math.sin(a) * 420 - b.vy) * Math.min(1, dt * 6); }
      if (b.life <= 0) b.dead = true;
      if (b.hist && dt > 0) { b.hist[b.hi * 2] = b.x; b.hist[b.hi * 2 + 1] = b.y; b.hi = (b.hi + 1) & 7; }    // 리본 꼬리용 지난 자리 8개
    }
    b.x += b.vx * dt; b.y += b.vy * dt; if (b.hitT > 0) b.hitT -= dt;
    if (level <= 4 && !b.kind && !b.home && dt > 0 && (b.wk = (b.wk || 0) - dt) <= 0) { b.wk = level <= 3 ? 0.06 : 0.2; FX.wake(b.x, b.y); }    // 탄 옆 마름모 불티(탄이 적은 1~4단계만)
    if (b.y < -20 || b.x < -20 || b.x > FW + 20 || b.y > FH + 20) b.dead = true;
  }
  // 적
  for (const e of enemies) {
    e.t += dt; e.age = (e.age || 0) + dt; e.flash = (e.flash || 0) - dt; if (e.cdOrb > 0) e.cdOrb -= dt; if (e.cdBoom > 0) e.cdBoom -= dt;
    if (e.kind === "boss") {
      if (e.t > BOSS_STAY) { e.y -= 90 * dt; if (e.y < -90) { e.dead = true; rain = []; say("대장이 도망갔어요"); } }
      else if (e.y < bossHoverY()) e.y += e.vy * dt; else e.x = FW / 2 + Math.sin(e.t * (bossAct(e.who) === "typhoon" ? 1.5 : 0.9)) * (FW / 2 - 70);
      e.shot -= dt;
      // 비는 두 줄기만, 천천히. 가운데는 늘 비워 둔다.
      if (e.shot <= 0 && e.y >= bossHoverY() - 1 && e.t <= BOSS_STAY) {
        e.shot = Math.max(1.1, 1.8 - wave * 0.02) / Math.max(0.75, tune.speed);
        if (bossAct(e.who) === "snowking") { for (const k of [-1, 0, 1]) if (rain.length < 30) rain.push({ x: e.x + k * 44, y: e.y + 44, vx: 0, vy: 92 * tune.speed, art: "flake", sway: rnd(0, 6), bx: e.x + k * 44 }); e.shot *= 1.25; }      // 눈송이는 느리지만 좌우로 흔들린다
        else if (bossAct(e.who) === "squirrel") { e.wind = SQ.wind; e.shot *= SQ.every; }     // 몸을 흔드는 예고 뒤에 던진다(아래)
        else if (bossAct(e.who) === "typhoon") { if (enemies.filter(m => m.kind === "tornado").length < 3) { const mh = Math.max(1, Math.round(enemyHp(wave) * tune.hp * 0.6)); enemies.push({ kind: "tornado", x: e.x, y: e.y + 40, r: 19, hp: mh, max: mh, vy: 70 * tune.speed, vx: (Math.random() < 0.5 ? -1 : 1) * 105 * tune.speed, t: 0 }); } e.shot *= 1.5; }   // 회오리 부하를 내보낸다
        else for (const k of [-1, 1]) if (rain.length < 30) rain.push({ x: e.x + k * 34, y: e.y + 40, vx: k * 22, vy: 118 * tune.speed });
      }
      if (e.wind > 0 && (e.wind -= dt) <= 0 && e.t <= BOSS_STAY) squirrelThrow(e);
    } else {
      e.y += e.vy * dt;
      if (e.kind === "zig") e.x = Math.min(FW - 24, Math.max(24, e.bx + Math.sin(e.t * 2.6) * 70));
      if (e.kind === "tornado") { e.x += e.vx * dt; if (e.x < 24) { e.x = 24; e.vx = Math.abs(e.vx); } else if (e.x > FW - 24) { e.x = FW - 24; e.vx = -Math.abs(e.vx); } }
      if (e.kind === "baby") { e.x = Math.min(FW - 16, Math.max(16, e.x + e.vx * dt)); e.vx *= Math.max(0, 1 - dt * 2.5); }
      if (e.kind === "cloud" || e.kind === "gift") e.x += Math.sin(e.t * 1.7) * 10 * dt;
      if (e.y > FH + 40) e.dead = true;                // 지나간 적은 해가 없다
    }
    if (e.kind !== "meteor") for (const b of bullets) {
      if (b.dead || b.hitT > 0) continue;
      const rr = e.r + (b.beam ? 7 : b.kind === "missile" ? 6 : 4);
      if ((b.x - e.x) ** 2 + (b.y - e.y) ** 2 > rr * rr) continue;
      if (b.kind === "missile") { b.dead = true; explode(b.x, b.y, b.splash, b.dmg, e); S.play("missileHit", level); if (e.dead) break; continue; }
      damage(e, b.dmg);
      FX.hit(b.x, b.y - 4, b.home ? "#fff3a8" : (SHOT_LOOK[b.art] || SHOT_LOOK.pellet).c, b.pierce ? 2 : 1);
      if (!e.dead) S.play(e.kind === "boss" ? "bossHit" : "hit");
      if (b.pierce) b.hitT = 0.12; else b.dead = true;
      if (e.dead) break;
    }
    if (!e.dead && e.kind !== "gift" && (player.x - e.x) ** 2 + (player.y - e.y) ** 2 < (e.r + 12) ** 2) { hurt(); if (e.kind !== "boss") { e.dead = true; FX.kill(e.x, e.y, e.r, { silentCombo: true }); } }
  }
  arms(dt, W());
  for (const r of rain) {
    if (r.dead) continue;
    if (r.warn > 0) { if ((r.warn -= dt) <= 0) { acornSplit(r); continue; } }      // 큰 도토리: 멈춰 번쩍이다 갈라진다
    else { r.x += r.vx * dt; r.y += r.vy * dt; }
    if (r.art === "flake") r.x = r.bx + Math.sin(r.y * 0.035 + r.sway) * 26;
    if (r.spin) r.rot += r.spin * dt;
    if (r.big && r.vy && r.y >= r.burstY) { r.vy = 0; r.warn = SQ.bigWarn; S.play("warn"); }
    const hr = r.big ? 20 : r.spin ? 13 : 15;
    if (r.y > FH + 20) r.dead = true; else if ((player.x - r.x) ** 2 + (player.y - r.y) ** 2 < hr * hr) { r.dead = true; hurt(); }
  }
  if (spill.length) updSpill(dt);
  // 별: 가까이 오면 빨려 온다
  for (const d of drops) {
    d.t += dt; d.y += d.vy * dt;
    const dd = Math.hypot(player.x - d.x, player.y - d.y);
    if (dd < tune.magnet) { d.x += (player.x - d.x) * Math.min(1, dt * 6); d.y += (player.y - d.y) * Math.min(1, dt * 6); }
    if (dd < 26) {
      d.dead = true; sfx.star();
      if (mode === "play" && quizCool <= 0) openQuiz();
      else if (mode === "play") { addGauge(15); pops.push({ x: d.x, y: d.y - 20, t: -0.5, w: 46, art: "star" }); }   // 연달아 먹은 별 = 필살기 게이지
    }
    else if (d.y > FH + 30) d.dead = true;
  }
  for (const s of sparks) { s.life -= dt; s.x += s.vx * dt; s.y += s.vy * dt; if (!s.shape) s.vy += 260 * dt; }
  for (const c of clouds) { c.y += c.v * dt; if (c.y - c.r > FH) { c.y = -c.r; c.x = rnd(0, FW); } }
  skyY += dt * (42 + Math.min(60, wave * 2));
  for (const w of warns) { w.t -= dt; if (w.t <= 0) { w.dead = true; enemies.push({ kind: "meteor", x: w.x, y: spawnY() - 10, r: 15, hp: 1e9, max: 1e9, vy: 430, t: 0 }); } }
  warns = warns.filter(w => !w.dead);
  for (const p of pops) p.t += dt; pops = pops.filter(p => p.t < 0.3);
  for (const r of rings) r.t += dt; rings = rings.filter(r => r.t < 0.6); if (rings.length > 8) rings.splice(0, rings.length - 8);
  if (flash > 0) flash -= dt;
  // 무기가 셀수록 꼬리에 반짝이가 많이 날린다
  trailT -= dt;
  if (trailT <= 0 && sparks.length < 80) { trailT = 0.14 - level * 0.012; sparks.push({ x: player.x + rnd(-7, 7), y: player.y + 40, vx: rnd(-25, 25), vy: rnd(40, 110), life: rnd(0.35, 0.6), shape: TRAILS[trail].id, color: TRAILS[trail].id === "rainbow" ? ["#ff7a9c", "#ffb24a", "#ffe45c", "#7dffb0", "#6fd3ff", "#b9a2ff"][Math.floor(Math.random() * 6)] : TRAILS[trail].id === "heart" ? "#ff6f9c" : TRAILS[trail].id === "flower" ? "#ffb7e0" : TRAILS[trail].id === "note" ? "#ffffff" : ["#ffe45c", "#ff9ec4", "#6fd3ff", "#7dffb0", "#b9a2ff"][level >= 8 ? Math.floor(Math.random() * 5) : level >= 6 ? 2 : level >= 4 ? 1 : 0] }); }
  bullets = bullets.filter(b => !b.dead); enemies = enemies.filter(e => !e.dead); drops = drops.filter(d => !d.dead);
  rain = rain.filter(r => !r.dead); sparks = sparks.filter(s => s.life > 0);
  if (shake > 0) shake -= dt; if (bannerT > 0) bannerT -= dt;
  if (!demo) $("dist").textContent = Math.floor(dist) + "m";
}

/* ---------- 그리기 ---------- */
function puff(x, y, r, body, face) {
  ctx.fillStyle = body;
  ctx.beginPath();
  for (const [cx, cy, cr] of [[x - r * 0.55, y + r * 0.1, r * 0.62], [x + r * 0.55, y + r * 0.1, r * 0.62], [x, y - r * 0.25, r * 0.78]]) { ctx.moveTo(cx + cr, cy); ctx.arc(cx, cy, cr, 0, Math.PI * 2); }
  ctx.fill();
  if (!face) return;
  ctx.fillStyle = "#1c2350";
  ctx.beginPath(); ctx.arc(x - r * 0.26, y - r * 0.12, r * 0.09, 0, 7); ctx.arc(x + r * 0.26, y - r * 0.12, r * 0.09, 0, 7); ctx.fill();
  ctx.strokeStyle = "#1c2350"; ctx.lineWidth = 2; ctx.lineCap = "round";
  ctx.beginPath();
  if (face === "grump") { ctx.moveTo(x - r * 0.2, y + r * 0.2); ctx.quadraticCurveTo(x, y + r * 0.08, x + r * 0.2, y + r * 0.2); ctx.moveTo(x - r * 0.42, y - r * 0.34); ctx.lineTo(x - r * 0.14, y - r * 0.24); ctx.moveTo(x + r * 0.42, y - r * 0.34); ctx.lineTo(x + r * 0.14, y - r * 0.24); }
  else { ctx.moveTo(x - r * 0.18, y + r * 0.1); ctx.quadraticCurveTo(x, y + r * 0.28, x + r * 0.18, y + r * 0.1); }
  ctx.stroke();
}
function star(x, y, r, color) {
  ctx.fillStyle = color; ctx.beginPath();
  for (let i = 0; i < 10; i++) { const a = -Math.PI / 2 + i * Math.PI / 5, rr = i % 2 ? r * 0.46 : r; ctx.lineTo(x + Math.cos(a) * rr, y + Math.sin(a) * rr); }
  ctx.closePath(); ctx.fill();
}
function drawPlane() {
  const w = W();
  if (!FX.OFF.plane) FX.engineGlow(player.x, player.y);         // 세 겹 엔진 불꽃(깜빡일 때도 남겨 비행기 자리가 보이게)
  if (!FX.OFF.plane) FX.muzzleAura(player.x, player.y - 34, level, weaponColor());   // 총구 기운: 4단계 구슬 → 8단계 도는 빛갈래(비행기 뒤)
  // 다친 뒤 무적 깜빡임: 사라지지 않고 반투명으로(아이가 비행기를 놓치지 않게)
  const blink = player.inv > 0 && !FX.ultActive() && FX.planeFlash <= 0 && Math.floor(player.inv * 12) % 2;
  ctx.save(); ctx.translate(player.x, player.y); if (blink) ctx.globalAlpha = 0.35;
  if (w.aura) { ctx.save(); ctx.rotate(clock * 1.8); ctx.drawImage(aura, -52, -50, 104, 104); ctx.restore(); }
  if (w.helpers) for (const k of [-1, 1]) sprite("helper", k * 48, 12 + Math.sin(clock * 4 + k) * 3, 30);       // 양옆 호위기
  const sq = FX.squash;                                                                                         // 발사 반동(그림만 살짝 눌림)
  ctx.save(); ctx.translate(0, sq.dy); ctx.rotate(player.tilt * 0.2); ctx.scale((1 - Math.abs(player.tilt) * 0.16) * sq.sx, sq.sy);   // 기울 때 살짝 좁아져 몸을 트는 느낌
  const dk = DARK[PILOTS[pilot].art]; if (dk && !FX.OFF.plane) { const im = ART[PILOTS[pilot].art], hw = 64, hh = hw * im.height / im.width; ctx.drawImage(dk, -hw / 2, -hh / 2, hw, hh); }   // 짙은 테: 흰 빛 속에서도 비행기가 보이게
  if (!sprite(PILOTS[pilot].art, 0, 0, 56)) { ctx.fillStyle = "#ffffff"; ctx.beginPath(); ctx.ellipse(0, 0, 10, 24, 0, 0, 7); ctx.fill(); ctx.fillStyle = "#ff8fb4"; ctx.fillRect(-30, 4, 60, 9); }
  if (FX.planeFlash > 0 && WHITE[PILOTS[pilot].art]) { ctx.globalAlpha = Math.min(1, FX.planeFlash * 4); sprite(PILOTS[pilot].art, 0, 0, 56 * (1 + FX.planeFlash * 0.5), true); ctx.globalAlpha = 1; }
  if (w.guns >= 2) for (const k of [-1, 1]) sprite("gun", k * 17, 2, 15);                                     // 날개 위 기관총
  if (w.guns >= 4) for (const k of [-1, 1]) sprite("gun", k * 25, 7, 13);
  ctx.restore();
  if (shield > 0) { ctx.drawImage(bubble, -46, -44, 92, 92); if (shield > 1) { ctx.globalAlpha = 0.7; ctx.drawImage(bubble, -54, -52, 108, 108); ctx.globalAlpha = 1; } }
  ctx.restore();
}
function render() {
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  if (bg) ctx.drawImage(bg, 0, 0);
  // 카메라: 흔들림(cam.x/y) + 살짝 당겨 보기(cam.z, 놀이판 가운데 기준)
  const k = scale * dpr, cz = FX.cam.z, cx = FW / 2, cy = FH / 2;
  ctx.setTransform(k * cz, 0, 0, k * cz, offX * dpr + k * (cx * (1 - cz) + FX.cam.x), k * (cy * (1 - cz) + FX.cam.y));
  ctx.save(); ctx.beginPath(); ctx.rect(0, 0, FW, FH); ctx.clip();
  // 하늘(남색 덧칠을 미리 구운 그림): 보통 0.24 · 7~8단계 0.32 · 대장전 0.36
  const tile = sky(FX.OFF.tint ? 0 : isBossWave(wave) && enemies.length ? 0.36 : level >= 7 ? 0.32 : 0.24);
  if (tile) { const th = FW * tile.height / tile.width; for (let y = (skyY % th) - th; y < FH + 12; y += th) ctx.drawImage(tile, -12, y, FW + 24, th + 0.5); }
  else { ctx.globalAlpha = 0.16; for (const c of clouds) puff(c.x, c.y, c.r, "#ffffff"); ctx.globalAlpha = 1; }
  FX.drawBack(42 + Math.min(60, (wave || 0) * 2), lastRdt);     // 흐르는 구름 두 층 + 빠를 때 속도선
  for (const d of drops) { ctx.fillStyle = "rgba(255,240,150,.38)"; ctx.beginPath(); ctx.arc(d.x, d.y, 24 + Math.sin(d.t * 6) * 3, 0, 7); ctx.fill(); if (!sprite("star", d.x, d.y, 38)) star(d.x, d.y, 15, "#ffd95a"); }
  for (const e of enemies) {
    const hit = e.flash > 0;
    ctx.globalAlpha = (e.age || 0) < 0.3 ? Math.max(0, (e.age || 0) / 0.3) : 1;   // 막 나온 적은 0.3초 동안 스르르 나타난다(HUD 바로 아래에서 툭 튀어나오지 않게)
    const bob = Math.sin(e.t * 3) * 1.5;                 // 살짝 둥실거린다
    if (e.kind === "boss" && e.wind > 0) {               // 다람쥐 두목 예고: 몸을 흔들고 도토리를 들어 올린다(빛 + 점점 커짐)
      const k = 1 - e.wind / SQ.wind, wx = e.x + Math.sin(e.wind * 60) * 5, art = bossInfo(e.who).shot || "acorn";
      if (!sprite(bossArt(e.who), wx, e.y + bob, bossInfo(e.who).size || 160, hit)) puff(wx, e.y, e.r, "#8a5a3a", "grump");
      ctx.drawImage(FX.glow("#ffd36b"), e.x - 30, e.y + 10, 60, 60); sprite(art, e.x, e.y + 40 - k * 6, 12 + k * 14);
      ctx.fillStyle = "rgba(0,0,0,.4)"; ctx.fillRect(e.x - 50, e.y + 84, 100, 8); ctx.fillStyle = "#ff7a9c"; ctx.fillRect(e.x - 50, e.y + 84, 100 * Math.max(0, e.hp / e.max), 8);
    }
    else if (e.kind === "boss") { if (!sprite(bossArt(e.who || "boss"), e.x, e.y + bob, bossInfo(e.who).size || (e.who === "boss" || !e.who ? 176 : 160), hit)) puff(e.x, e.y, e.r, hit ? "#ffffff" : "#4a4f7c", "grump"); ctx.fillStyle = "rgba(0,0,0,.4)"; ctx.fillRect(e.x - 50, e.y + 84, 100, 8); ctx.fillStyle = "#ff7a9c"; ctx.fillRect(e.x - 50, e.y + 84, 100 * Math.max(0, e.hp / e.max), 8); }
    else if (e.kind === "tornado" && sprite("tornado", e.x + Math.sin(e.t * 14) * 1.5, e.y, 46, hit)) {}
    else if (e.kind === "hail" && sprite("hail", e.x, e.y + bob, 76, hit)) {}
    else if (e.kind === "baby" && sprite("baby", e.x, e.y, 36, hit)) {}
    else if (e.kind === "tornado" || e.kind === "hail" || e.kind === "baby") puff(e.x, e.y, e.r, hit ? "#ffffff" : "#bcd3ee", "grump");
    else if (e.kind === "meteor") continue;               // 별똥별은 적 탄과 함께 맨 위쪽에 그린다(효과에 가리지 않게)
    else if (e.kind === "gift" && sprite("gift", e.x, e.y + 24 + bob, 44, hit)) {}
    else if (e.kind === "bolt" && sprite("bolt", e.x, e.y, 36, hit)) {}
    else if ((e.kind === "cloud" || e.kind === "zig") && sprite(e.kind, e.x, e.y + bob, e.kind === "zig" ? 60 : 68, hit)) {}
    else if (e.kind === "gift") { ctx.strokeStyle = "#ffffff"; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.moveTo(e.x, e.y + e.r); ctx.lineTo(e.x, e.y + e.r + 16); ctx.stroke(); ctx.fillStyle = hit ? "#ffffff" : "#ff9ec4"; ctx.beginPath(); ctx.ellipse(e.x, e.y, e.r * 0.86, e.r, 0, 0, 7); ctx.fill(); star(e.x, e.y, 10, "#ffd95a"); }
    else if (e.kind === "bolt") { ctx.fillStyle = hit ? "#ffffff" : "#ffe45c"; ctx.beginPath(); ctx.moveTo(e.x + 4, e.y - 18); ctx.lineTo(e.x - 10, e.y + 2); ctx.lineTo(e.x - 1, e.y + 2); ctx.lineTo(e.x - 5, e.y + 18); ctx.lineTo(e.x + 10, e.y - 3); ctx.lineTo(e.x + 1, e.y - 3); ctx.closePath(); ctx.fill(); }
    else puff(e.x, e.y, e.r, hit ? "#ffffff" : e.kind === "zig" ? "#b9a2ff" : "#8f9bd6", e.kind === "zig" ? "smile" : "grump");
  }
  ctx.globalAlpha = 1;
  FX.drawDim();                                         // 필살기 동안 바깥을 어둡게(공격·비행기·적 탄은 이 위에 밝게)
  // 미사일 연기 꼬리
  if (smoke.length) { ctx.fillStyle = "#eef2ff"; for (const s of smoke) { const k = s.t / 0.5; ctx.globalAlpha = (1 - k) * 0.6; ctx.beginPath(); ctx.arc(s.x, s.y, 3.5 + k * 11, 0, 7); ctx.fill(); } ctx.globalAlpha = 1; }
  // 레이저 줄기(미리 그려 둔 띠를 늘여 붙인다) — 바깥 번짐 + 속 줄기 + 줄기를 타고 오르는 빛 고리 + 총구 빛
  const wNow = mode !== "start" || demo ? W() : null;
  const hiQ = FX.qualityNow() >= 0.6, topQ = FX.qualityNow() >= 0.9;
  if (wNow && wNow.laser) {
    const L = wNow.laser, tex = BEAM[L.color] || BEAM.pink, flick = 0.82 + Math.sin(clock * 40) * 0.12, hx = beamHex[L.color] || "#ff60aa";
    for (const b of L.beams) {
      // 굵기가 1초에 10번 ±15% 꿈틀거린다. 어두운 받침 → 바깥 번짐 → 속 줄기 → 단단한 흰 심(단계가 높을수록 굵게)
      const g = beamGeo(b), len = (g.oy + 20) / Math.max(0.3, -g.sy), half = L.w * (1.1 + Math.sin(clock * 62.8 + b[1]) * 0.15);
      ctx.save(); ctx.translate(g.ox, g.oy); ctx.rotate(g.a);
      if (hiQ) { ctx.globalAlpha = 1; ctx.drawImage(FX.darkStrip, -half * 2.6, -len, half * 5.2, len); }
      if (hiQ) { ctx.globalAlpha = 0.32; ctx.drawImage(tex, -half * 2.2, -len, half * 4.4, len); }
      ctx.globalAlpha = flick; ctx.drawImage(tex, -half, -len, half * 2, len);
      ctx.globalAlpha = 1; ctx.fillStyle = "#ffffff"; const core = Math.max(2.5, L.w * 0.32); ctx.fillRect(-core / 2, -len, core, len);
      ctx.globalAlpha = 0.7; ctx.strokeStyle = "#ffffff"; ctx.lineWidth = 1.6;
      if (hiQ) for (let i = 0; i < 4; i++) { const yy = -((clock * 520 + i * len / 4) % len); ctx.beginPath(); ctx.ellipse(0, yy, half * 1.3, half * 0.35, 0, 0, 7); ctx.stroke(); }
      ctx.globalAlpha = 1; const mz = L.w * (hiQ ? 3.4 : 1.8) + Math.sin(clock * 30) * 3; ctx.drawImage(FX.glow(hx), -mz, -mz, mz * 2, mz * 2);
      ctx.fillStyle = "#ffffff"; ctx.beginPath(); ctx.arc(0, 0, L.w * 0.6 + Math.sin(clock * 30) * 1.2, 0, 7); ctx.fill();
      ctx.restore();
    }
  }
  for (const b of bullets) {
    if (b.kind === "missile") {
      ctx.save(); ctx.translate(b.x, b.y); ctx.rotate(Math.atan2(b.vy, b.vx) + Math.PI / 2);
      ctx.drawImage(FX.glow("#ff9b3d"), -12, 6, 24, 24);
      ctx.fillStyle = Math.floor(clock * 30) % 2 ? "#ffe45c" : "#ff9b3d"; ctx.beginPath(); ctx.arc(0, 16, 5, 0, 7); ctx.fill();
      ctx.drawImage(missileTex, -8, -18, 16, 36); ctx.restore();
    }
    else if (b.home) {
      // 리본 꼬리: 지난 자리 8개를 이어 점점 가늘게
      if (b.hist) { ctx.lineCap = "round"; let px = b.x, py = b.y; for (let i = 1; i < 8; i++) { const j = ((b.hi - i) & 7) * 2, qx = b.hist[j], qy = b.hist[j + 1]; if (qx !== qx) break; ctx.globalAlpha = 0.75 * (1 - i / 8); ctx.strokeStyle = i & 1 ? "#ffe45c" : "#ff9ec4"; ctx.lineWidth = 7 * (1 - i / 9); ctx.beginPath(); ctx.moveTo(px, py); ctx.lineTo(qx, qy); ctx.stroke(); px = qx; py = qy; } ctx.globalAlpha = 1; }
      ctx.drawImage(FX.glow("#ffe45c"), b.x - 16, b.y - 16, 32, 32);
      if (!sprite("star", b.x, b.y, 20)) star(b.x, b.y, 8, "#fff3a8");
    }
    else {
      // 늘어난 캡슐 탄(흰 심 + 색 몸통 + 바깥 번짐) + 끝이 가늘어지는 리본 꼬리. 사탕·혜성·무지개 탄은 그 위에 그림을 얹는다.
      const look = SHOT_LOOK[b.art] || SHOT_LOOK.pellet, c = b.art === "rainbow" ? RAINBOW4[Math.floor((b.y + b.x) / 24) & 3] : look.c, s = look.s;
      if (!FX.OFF.bglow) { if (hiQ) ctx.drawImage(FX.bullet(c, look.tl), b.x - 16, b.y - 32); else ctx.drawImage(FX.capsule(c), b.x - 9, b.y - 20, 18, 32); }   // 꼬리+캡슐 한 장(느린 기기는 꼬리 없이)
      if (b.art !== "pellet" && b.art && topQ) sprite(b.art, b.x, b.y - 6, s * 0.8);
    }
  }
  for (const m of bombs) { ctx.drawImage(FX.glow("#ffd23a"), m.x - 22, m.y - 22, 44, 44); ctx.save(); ctx.translate(m.x, m.y); ctx.rotate(m.t * 5); ctx.drawImage(bombTex, -15, -16, 30, 32); ctx.restore(); }
  for (const m of booms) {
    // 잔상 셋 + 빛
    for (let i = 3; i >= 1; i--) { const tt = Math.max(0, m.t - i * 0.035), th = tt / m.T * Math.PI * 2, gx = player.x + m.k * 58 * Math.sin(th), gy = player.y - 26 - 120 * (1 - Math.cos(th)); ctx.globalAlpha = 0.22 * (4 - i) / 3; ctx.save(); ctx.translate(gx, gy); ctx.rotate(tt * 16 * m.k); ctx.drawImage(boomTex, -15, -15, 30, 30); ctx.restore(); }
    ctx.globalAlpha = 1; ctx.drawImage(FX.glow("#ffb24a"), m.x - 24, m.y - 24, 48, 48);
    ctx.save(); ctx.translate(m.x, m.y); ctx.rotate(m.t * 16 * m.k); ctx.drawImage(boomTex, -17, -17, 34, 34); ctx.restore();
  }
  // 번개: 넓은 번짐 + 굵은 파란 띠 + 가는 흰 줄
  for (const z of zaps) {
    const fl = Math.floor(clock * 20) & 1, pts = fl ? z.echo : z.pts;
    ctx.globalAlpha = Math.min(1, z.t / 0.1) * (fl ? 0.75 : 1); ctx.lineJoin = "round"; ctx.lineCap = "round";
    ctx.beginPath(); pts.forEach((p, i) => (i ? ctx.lineTo(p[0], p[1]) : ctx.moveTo(p[0], p[1])));
    ctx.strokeStyle = "rgba(30,8,60,.35)"; ctx.lineWidth = z.big ? 26 : 20; ctx.stroke();                 // 어두운 받침
    ctx.strokeStyle = "rgba(0,245,255,.35)"; ctx.lineWidth = z.big ? 20 : 15; ctx.stroke();
    ctx.strokeStyle = "#00f5ff"; ctx.lineWidth = z.big ? 9 : 7; ctx.stroke();
    ctx.strokeStyle = "#ffffff"; ctx.lineWidth = z.big ? 4 : 3; ctx.stroke();
  } ctx.globalAlpha = 1;
  for (const s of sparks) {
    ctx.globalAlpha = Math.min(1, s.life * 3); ctx.fillStyle = s.color;
    if (s.shape === "heart") { ctx.beginPath(); ctx.moveTo(s.x, s.y + 5); ctx.bezierCurveTo(s.x - 9, s.y - 2, s.x - 4, s.y - 8, s.x, s.y - 3); ctx.bezierCurveTo(s.x + 4, s.y - 8, s.x + 9, s.y - 2, s.x, s.y + 5); ctx.fill(); }
    else if (s.shape === "star") star(s.x, s.y, 6, s.color);
    else if (s.shape === "flower") { ctx.beginPath(); for (let i = 0; i < 5; i++) { const a = i * 1.2566; ctx.moveTo(s.x + Math.cos(a) * 3.5 + 3, s.y + Math.sin(a) * 3.5); ctx.arc(s.x + Math.cos(a) * 3.5, s.y + Math.sin(a) * 3.5, 3, 0, 7); } ctx.fill(); ctx.fillStyle = "#ffe45c"; ctx.beginPath(); ctx.arc(s.x, s.y, 2.2, 0, 7); ctx.fill(); }
    else if (s.shape === "note") { ctx.font = "900 15px 'Pretendard Variable', system-ui, sans-serif"; ctx.textAlign = "center"; ctx.fillText("♪", s.x, s.y + 5); }
    else if (s.shape === "rainbow") { ctx.beginPath(); ctx.arc(s.x, s.y, 4.5, 0, 7); ctx.fill(); }
    else ctx.fillRect(s.x - 2, s.y - 2, 4, 4);
  } ctx.globalAlpha = 1;
  for (const p of pops) { if (p.art) { const k = (p.t + 0.5) / 0.8; ctx.globalAlpha = Math.min(1, (1 - k) * 2.5); sprite(p.art, p.x, p.y - k * 50, p.w); continue; } const k = p.t / 0.3; ctx.globalAlpha = 1 - k * k; sprite("pop", p.x, p.y, p.w * (0.45 + k * 0.75)); } ctx.globalAlpha = 1;
  FX.drawWorld();                                       // 폭발·불꽃·고리·필살기(적 탄과 비행기 아래)
  for (const s of spill) { if (s.delay > 0) continue; ctx.globalAlpha = Math.min(1, (s.life - s.t) * 2.5, s.t * 8); ctx.save(); ctx.translate(s.x, s.y); ctx.rotate(s.rot); sprite(s.art, 0, 0, s.w); ctx.restore(); } ctx.globalAlpha = 1;   // 쏟아지는 간식(대장 폭발 위)
  for (const w of warns) {
    if (Math.floor(w.t * 8) % 2) continue;
    ctx.fillStyle = "rgba(255,90,90,.16)"; ctx.fillRect(w.x - 18, 0, 36, FH);
    ctx.fillStyle = "#ff5a5a"; ctx.beginPath(); ctx.arc(w.x, hudBottom + 34, 15, 0, 7); ctx.fill();
    ctx.fillStyle = "#ffffff"; ctx.font = "900 22px 'Pretendard Variable', system-ui, sans-serif"; ctx.textAlign = "center"; ctx.fillText("!", w.x, hudBottom + 42);
  }
  if (mode !== "start" || demo) drawPlane();
  if (wNow && wNow.orb) {
    ctx.lineCap = "round";
    for (let i = 0; i < wNow.orb.n; i++) {
      const a = orbAng + i * Math.PI * 2 / wNow.orb.n;
      if (hiQ) { ctx.globalAlpha = 0.45; ctx.strokeStyle = "#7fe8ff"; ctx.lineWidth = 9; ctx.beginPath(); ctx.arc(player.x, player.y, 46, a - 0.85, a); ctx.stroke();     // 구슬 리본 꼬리(느린 기기에서는 뺀다)
        ctx.globalAlpha = 0.8; ctx.strokeStyle = "#ffffff"; ctx.lineWidth = 2.5; ctx.beginPath(); ctx.arc(player.x, player.y, 46, a - 0.5, a); ctx.stroke(); ctx.globalAlpha = 1; }
      const ox = player.x + Math.cos(a) * 46, oy = player.y + Math.sin(a) * 46;
      ctx.drawImage(FX.glow("#7fe8ff"), ox - 22, oy - 22, 44, 44); ctx.drawImage(orbTex, ox - 14, oy - 14, 28, 28);
    }
  }
  for (const r of rings) { const k = r.t / 0.6; ctx.globalAlpha = 1 - k; ctx.strokeStyle = r.color || "#ffe45c"; ctx.lineWidth = 7 * (1 - k) + 1; ctx.beginPath(); ctx.arc(r.x, r.y, 20 + k * (r.max || 330), 0, 7); ctx.stroke(); } ctx.globalAlpha = 1;
  drawUltStar();
  // 적 탄·별똥별은 맨 위(비행기·모든 아군 효과 위): 빨강 ↔ 짙은 색으로 깜빡이는 위험 고리(아군 효과는 이 모양·색을 쓰지 않는다)
  for (const r of rain) { FX.drawDanger(r.x, r.y, r.big ? 24 : 14); if (r.spin) { drawAcorn(r); continue; } if (r.art === "flake" ? sprite("flake", r.x, r.y, 22) : sprite("drop", r.x, r.y, 15)) continue; ctx.fillStyle = "#9fe2ff"; ctx.beginPath(); ctx.ellipse(r.x, r.y, 5, 8, 0, 0, 7); ctx.fill(); }
  for (const e of enemies) if (e.kind === "meteor") { FX.drawDanger(e.x, e.y - 6, 24); if (!sprite("meteor", e.x, e.y - 12, 36)) { ctx.fillStyle = "#c9762f"; ctx.beginPath(); ctx.arc(e.x, e.y, 15, 0, 7); ctx.fill(); } }
  FX.drawTop();                                         // 가장자리 빛·번쩍임·조종사 띠·강화 띠·콤보·칭찬 한 칸
  // 짧은 알림(보호막·대장 물리침 등): 화면 가운데 아래쪽(위에서 오는 적을 가리지 않게)
  if (bannerT > 0 && mode !== "quiz") { ctx.globalAlpha = Math.min(1, bannerT * 2); ctx.font = (bannerBig ? "900 22px" : "800 19px") + " 'Pretendard Variable', system-ui, sans-serif"; ctx.textAlign = "center"; ctx.lineWidth = 5; ctx.lineJoin = "round"; ctx.strokeStyle = "rgba(16,26,80,.85)"; ctx.strokeText(banner, FW / 2, FH * 0.56); ctx.fillStyle = bannerBig ? "#ffe45c" : "#ffffff"; ctx.fillText(banner, FW / 2, FH * 0.56); ctx.globalAlpha = 1; }
  ctx.restore();
}

let last = performance.now(), lastRdt = 0, lastFrameAt = 0;
// 한 걸음: 실제 시간 rdt → 효과 엔진이 정한 세계 빠르기(잠깐 멈춤·느린 화면)를 곱해 세계를 움직인다. 비행기는 rdt 로.
function advance(rdt) {
  lastRdt = rdt;
  const playing = (mode === "play" || demo) && !document.hidden;
  const ts = playing ? FX.timeScale() : 0, dt = rdt * ts;
  if (playing && quizCool > 0) quizCool -= dt;
  if (playing && demo) {
    // 미리보기: 효과음·외침을 문제 화면처럼 막아 둔 채 한 걸음(막아도 통과하는 정답 축하음은 미리보기에서 나올 일이 없다)
    demoPilot(rdt); S.gate(true);
    try { update(dt, rdt); } finally { S.gate(false); }
  } else if (playing) {
    if (!FX.ultActive()) FX.speedLines(level >= 8 ? 0.6 : level >= 5 ? 0.3 : 0);
    FX.edgeGlow(weaponColor(), level >= 8 ? 1 : level >= 7 ? 0.5 : 0);
    update(dt, rdt);
  } else if (mode !== "play") { skyY += rdt * 42; for (const c of clouds) { c.y += c.v * rdt; if (c.y - c.r > FH) { c.y = -c.r; c.x = rnd(0, FW); } } }
  FX.update(mode === "quiz" ? 0 : dt || (mode === "play" || demo ? 0 : rdt), rdt);
  paintGauge();
}
function frame(now) {
  const rdt = Math.min(0.034, Math.max(0, (now - last) / 1000)); last = now; clock += rdt;
  const t0 = performance.now();
  advance(rdt);
  render();
  if (lastFrameAt && now - lastFrameAt < 100) FX.frameTime(now - lastFrameAt); lastFrameAt = now;    // 숨은 탭(드문 프레임)은 품질 판단에서 뺀다
  if (dprCap > 1 && FX.qualityNow() < 0.6 && (devicePixelRatio || 1) > 1) { dprCap = 1; resize(); }  // 가장 낮은 품질: 화면 해상도를 1배로
  workMs += (performance.now() - t0 - workMs) * 0.05;
  requestAnimationFrame(frame);
}
let workMs = 0;

/* ---------- 시작 ---------- */
function begin() { demo = false; document.body.classList.remove("attract"); disarm(); if (GameQuiz) { GameQuiz.close(); GameQuiz.setKid(PILOTS[pilot].kid); } quiz = null; $("start").hidden = true; $("over").hidden = true; $("fork").hidden = true; reset(); mode = "play"; last = performance.now(); S.gate(false); S.setPilot(PILOTS[pilot].kid); audio(); }
$("startBtn").addEventListener("click", begin);
$("againBtn").addEventListener("click", begin);
const soundBtn = $("sound");
function paintSound() { soundBtn.setAttribute("aria-pressed", String(soundOn)); soundBtn.textContent = soundOn ? "♪" : "♪×"; }
soundBtn.addEventListener("click", () => { soundOn = !soundOn; try { localStorage.setItem(SOUND_KEY, soundOn ? "1" : "0"); } catch (_) {} S.setEnabled(soundOn, true); paintSound(); if (soundOn) S.play("tap"); });
paintSound();
// 판 이름·돌아가기 링크(edition.js). 가족판 값은 index.html 에 적힌 것과 같다. home 이 null 인 판은 링크를 뺀다.
if (EDITION.title) document.title = EDITION.title;
{ const h = document.querySelector("#start h1"); if (h && EDITION.heading) h.textContent = EDITION.heading; }
for (const a of document.querySelectorAll("a.back, a.home")) {
  if (!EDITION.home) { a.remove(); continue; }
  a.setAttribute("href", EDITION.home.href);
  if (a.classList.contains("back")) a.setAttribute("aria-label", EDITION.home.aria); else a.textContent = EDITION.home.label;
}
const pilotBox = $("pilots");
// 조종사를 고르면 공통 수학 모듈의 "지금 하는 아이"도 같이 바뀐다(문제 수준·기록이 그 아이 것으로).
function pickPilot(i) {
  if (!(i >= 0 && i < PILOTS.length)) return;
  pilot = i; try { localStorage.setItem(PILOT_KEY, String(i)); } catch (_) {}
  if (GameQuiz) GameQuiz.setKid(PILOTS[i].kid);
  S.setPilot(PILOTS[i].kid);
  [...pilotBox.children].forEach((c, k) => c.setAttribute("aria-pressed", String(k === i)));
  paintGo();
}
// 큰 출발 버튼에 고른 조종사 이름(지난번 조종사가 미리 골라져 있어 한 번만 누르면 바로 난다)
function paintGo() { $("startBtn").textContent = PILOTS[pilot].name + " 출발!"; }
PILOTS.forEach((p, i) => {
  const b = document.createElement("button"); b.type = "button"; b.className = "pilot"; b.setAttribute("aria-pressed", String(i === pilot));
  b.innerHTML = '<img src="art/' + p.art + '.webp?v=' + EDITION.pilotArtV + '" alt="" draggable="false"><span>' + p.name + "</span>";
  b.addEventListener("click", () => { pickPilot(i); sfx.star(); });
  pilotBox.appendChild(b);
});
// 꼬리 꾸미기: 모은 별만큼 열린다.
function paintTrails() {
  const box = $("trails"), open = unlockedTrails(stars);
  // 꾸미기 칩: 모은 별 / 다음 꼬리까지(막대). 다 열었으면 별 수만.
  const next = TRAILS[open], prevNeed = TRAILS[open - 1] ? TRAILS[open - 1].need : 0;
  $("starCount").textContent = "⭐ " + stars + (next ? "/" + next.need : "");
  $("decoFill").style.width = (next ? Math.round(100 * (stars - prevNeed) / Math.max(1, next.need - prevNeed)) : 100) + "%";
  $("decoBtn").setAttribute("aria-label", "꼬리 꾸미기, 별 " + stars + "개" + (next ? ", 다음 꼬리 " + next.name + "까지 " + (next.need - stars) + "개" : ", 꼬리를 다 열었어요"));
  box.innerHTML = "";
  TRAILS.forEach((t, i) => {
    const b = document.createElement("button"); b.type = "button"; b.className = "trail"; b.disabled = i >= open; b.setAttribute("aria-pressed", String(i === trail));
    b.setAttribute("aria-label", i >= open ? t.name + " 꼬리, 별 " + t.need + "개 모으면 열려요" : t.name + " 꼬리");
    b.innerHTML = "<i>" + t.icon + "</i><span>" + (i >= open ? "⭐" + t.need : t.name) + "</span>";
    b.addEventListener("click", () => { trail = i; try { localStorage.setItem(TRAIL_KEY, String(i)); } catch (_) {} paintTrails(); sfx.star(); });
    box.appendChild(b);
  });
}
paintTrails();
// 꾸미기 줄은 작은 칩 뒤에 접어 둔다(시작 화면 글·줄을 줄인다). 누르면 펼친다.
$("decoBtn").addEventListener("click", () => {
  const box = $("trails"), open = box.hidden; box.hidden = !open; $("decoBtn").setAttribute("aria-expanded", String(open)); sfx.star();
  if (demo) measureDemo();
});
// 목표 칸: 최고 거리·가장 높이 올린 무기 단계(아직 없으면 숨김). 별·꼬리는 꾸미기 칩이 보여 준다.
function paintGoals() {
  let best = 0, lv = 0;
  try { best = parseInt(localStorage.getItem(BEST_KEY) || "0", 10) || 0; lv = parseInt(localStorage.getItem(BEST_LV_KEY) || "0", 10) || 0; } catch (_) {}
  const b = $("goalBest"), l = $("goalLv");
  b.hidden = !best; b.textContent = "🏆 " + best + "m"; b.setAttribute("aria-label", "최고 기록 " + best + "미터");
  l.hidden = !lv; l.textContent = "⚡ " + Math.min(lv, MAX_WEAPON) + "단계"; l.setAttribute("aria-label", "가장 센 무기 " + Math.min(lv, MAX_WEAPON) + "단계");
}
paintGoals(); paintGo();
S.setPilot(PILOTS[pilot].kid);           // 함성 클립은 첫 터치(소리 깨우기) 뒤에 이 조종사 것만 받는다

/* ---------- 미리보기 비행(시작 화면 뒤) ---------- */
const DEMO_LAST_WAVE = 4;
function demoWeapon() { level = 4 + (Math.random() < 0.5 ? 1 : 0); path = { main: MAIN_IDS[Math.floor(Math.random() * MAIN_IDS.length)] }; }
// 비행기는 시작 패널 바로 위에서 난다(패널에 가리지 않게). 화면 크기·패널 높이가 바뀌면 다시 잰다.
function measureDemo() {
  let top = vh;
  try { const r = $("start").getBoundingClientRect(); if (r.height) top = r.top; } catch (_) {}
  demoY = clamp(top / scale - 78, Math.min(yr.home, hudBottom + 150), yr.home);
}
function startDemo() {
  reset(); demo = true; demoT = 0; demoAimT = 0; demoWeapon(); wave = 1; waveGap = 0.3;
  measureDemo(); player.y = player.ty = demoY;
  document.body.classList.add("attract");
}
// 자동 조종: 가장 가까운 위쪽 적 밑으로 천천히 옮겨 가며 쏜다. 적이 없으면 좌우로 느리게 흔든다.
function demoPilot(rdt) {
  demoT += rdt;
  if ((demoAimT -= rdt) <= 0) { demoAimT = 0.5; measureDemo(); }
  let best = null, bd = 1e9;
  for (const e of enemies) { if (!targetable(e) || e.y > player.y - 40) continue; const d = Math.abs(e.x - player.x) + (player.y - e.y) * 0.3; if (d < bd) { bd = d; best = e; } }
  const want = best ? best.x : FW / 2 + Math.sin(demoT * 0.7) * FW * 0.3, gap = want - player.tx;
  player.tx = clamp(player.tx + Math.sign(gap) * Math.min(Math.abs(gap), 170 * rdt), 24, FW - 24);
  player.ty = demoY + Math.sin(demoT * 1.3) * 10;
}
addEventListener("resize", () => { resize(); if (demo) measureDemo(); });
resize(); startDemo();
// 미리보기·테스트가 프레임 없이도 한 걸음씩 돌려 볼 수 있게 내놓는다(주소에 ?qa=1 일 때만).
if (new URLSearchParams(location.search).get("qa") === "1") window.__plane = { begin, step: dt => { advance(dt); render(); }, tick: dt => { advance(dt); }, render, fx: () => Object.assign(FX.qa(), { workMs: +workMs.toFixed(2) }), ult: () => startUlt(false), miniUlt: () => startUlt(true), fxApi: FX, ultRules: ULT_RULES, ultState: () => ({ gauge, star: ultStar ? { x: ultStar.x, y: ultStar.y } : null, queued: ultQueued, at: ultAt, tries: ultTries, earned: ultEarned, on: ultOn() }), fillGauge: v => { gauge = v; }, catchUltStar: () => { if (ultStar) { ultStar.x = player.x; ultStar.y = player.y; ultStar.held = true; } }, kill: e => damage(e, e.hp + 1), demo: () => ({ on: demo, y: demoY, top: yr.min, wave, level, path, enemies: enemies.length, hearts }), get s() { return { mode, demo, level, hearts, wave, dist, solved, enemies: enemies.length, bullets: bullets.length, drops: drops.length, shield, pilot, stars, trail }; }, set: o => { if (o.level) level = o.level; if (o.main || o.side) path = Object.assign({}, path, o.main ? { main: o.main } : {}, o.side ? { side: o.side } : {}); if (o.shield != null) shield = o.shield; if (o.wave) wave = o.wave; if (o.stars != null) { stars = o.stars; paintTrails(); } if (o.trail != null) trail = o.trail; hud(); }, spawn, player: () => player, answer: () => { const q = GameQuiz && GameQuiz.peek(); return q && q.kind === "ask" ? q.answer : null; }, quiz: () => (GameQuiz ? GameQuiz.peek() : null), setPilot: i => pickPilot(i), world: () => ({ enemies, drops, rain }), drop: () => drops.push({ x: player.x, y: player.y - 60, vy: 70, t: 0 }), hurt, path: () => path, yr: () => yr, openQuiz, openFork: kind => openFork(kind, () => resume(weaponLabel(level, path) + "!", true)), guard: () => { if (guard) return { panel: guard.panel.id, armIn: Math.round(guard.armAt - performance.now()) }; const q = GameQuiz && GameQuiz.peek(); return q ? { panel: "quiz", armIn: q.armIn } : null; }, extra: () => ({ smoke: smoke.length, zaps: zaps.length, bombs: bombs.length, booms: booms.length }), sfxLog: () => S.qa.log(), sfx: S.qa, solve: firstTry => { const r = solve(firstTry !== false, null); return r; } };
requestAnimationFrame(frame);
