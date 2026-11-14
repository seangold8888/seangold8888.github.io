// 스카이 샷 — 세로로 나는 비행기 슈팅. 별을 먹고 수학 문제를 맞히면 무기가 한 단계씩 세진다.
// 그림은 art/ 의 그림책풍 그림 파일을 쓴다(못 읽으면 캔버스 도형으로 대신 그린다). shadowBlur 는 쓰지 않는다 — 아이패드에서 가장 느리다.
import { weapon, weaponLabel, forkAt, MAINS, SIDES, MAIN_IDS, SIDE_IDS, playerYRange, MAX_WEAPON, enemyHp, bossHp, enemySpeed, formation, isBossWave, BOSS_STAY, SHIELD_LEVELS, bossOf, tuning, TRAILS, unlockedTrails } from "./logic.js?v=4";
import * as S from "./sfx.js?v=2";

const $ = id => document.getElementById(id);
const canvas = $("sky"), ctx = canvas.getContext("2d", { alpha: false });
const FW = 360;                       // 놀이판 논리 너비. 높이는 화면 비율에 맞춘다.
let FH = 640, scale = 1, offX = 0, vw = 0, vh = 0, dpr = 1, bg = null;
const BEST_KEY = "plane_best_v1", SOUND_KEY = "plane_sound_v1", PILOT_KEY = "plane_pilot_v1", STAR_KEY = "plane_stars_v1", TRAIL_KEY = "plane_trail_v1";
// 조종사: 아이 넷. 고른 아이의 비행기로 난다.
// kid: 공통 수학 모듈(GameQuiz)의 아이 id. 고른 조종사는 GameQuiz 의 "지금 하는 아이"(gq_kid_v1)와 같이 쓴다.
const PILOTS = [{ name: "윤찬", art: "p0", kid: "yunchan" }, { name: "재이", art: "p1", kid: "jaei" }, { name: "윤건", art: "p2", kid: "yungeon" }, { name: "태오", art: "p3", kid: "taeo" }];
let pilot = 1;
try { const saved = parseInt(localStorage.getItem(PILOT_KEY), 10); if (saved >= 0 && saved < PILOTS.length) pilot = saved; } catch (_) {}
try { const k = window.GameQuiz && window.GameQuiz.currentKid(); const i = PILOTS.findIndex(p => p.kid === k); if (i >= 0) pilot = i; } catch (_) {}
// 모은 별(맞힌 문제 수)과 고른 꼬리 모양. 판이 끝나도 남는다.
let stars = 0, trail = 0, tune = tuning(pilot), runStars = 0, starsAtStart = 0;
try { stars = Math.max(0, parseInt(localStorage.getItem(STAR_KEY) || "0", 10) || 0); const t = parseInt(localStorage.getItem(TRAIL_KEY), 10); if (t >= 0 && t < unlockedTrails(stars)) trail = t; } catch (_) {}

/* ---------- 그림 ---------- */
const ART = {}, WHITE = {};           // WHITE: 맞았을 때 번쩍이는 흰 실루엣
let skyTile = null, skyY = 0;
function whiten(im) {
  const c = document.createElement("canvas"); c.width = im.width; c.height = im.height;
  const x = c.getContext("2d"); x.drawImage(im, 0, 0); x.globalCompositeOperation = "source-in"; x.fillStyle = "#fff"; x.fillRect(0, 0, c.width, c.height);
  return c;
}
const FLASHY = new Set(["cloud", "zig", "bolt", "gift", "boss", "tornado", "hail", "baby", "snowking", "typhoon"]);
for (const n of ["p0", "p1", "p2", "p3", "cloud", "zig", "bolt", "gift", "boss", "star", "drop", "sky", "gun", "helper", "pellet", "candy", "comet", "rainbow", "pop", "meteor", "tornado", "hail", "baby", "flake", "snowking", "typhoon", "heart"]) {
  const im = new Image();
  im.onload = () => { ART[n] = im; if (n === "sky") skyTile = null; else if (FLASHY.has(n)) WHITE[n] = whiten(im); };
  im.src = "art/" + n + ".webp?v=" + (/^p\d$/.test(n) ? 2 : 1);
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
const CREAM = "#fff6dc";
const missileTex = canvasOf(24, 56, (x) => {          // 위를 보는 미사일(그릴 때 날아가는 쪽으로 돌린다)
  x.lineJoin = "round"; x.lineWidth = 3; x.strokeStyle = CREAM;
  x.fillStyle = "#4a6bd8"; x.beginPath(); x.moveTo(3, 46); x.lineTo(12, 36); x.lineTo(21, 46); x.lineTo(21, 52); x.lineTo(3, 52); x.closePath(); x.stroke(); x.fill();     // 꼬리 날개
  x.fillStyle = "#f4f6ff"; x.beginPath(); x.moveTo(12, 3); x.quadraticCurveTo(19, 12, 18, 22); x.lineTo(18, 46); x.lineTo(6, 46); x.lineTo(6, 22); x.quadraticCurveTo(5, 12, 12, 3); x.closePath(); x.stroke(); x.fill();
  x.fillStyle = "#ff5a6e"; x.beginPath(); x.moveTo(12, 4); x.quadraticCurveTo(17.5, 11, 17.6, 17); x.lineTo(6.4, 17); x.quadraticCurveTo(6.5, 11, 12, 4); x.fill();      // 빨간 코
  x.fillStyle = "#ffb24a"; x.fillRect(6, 28, 12, 4);
});
const bombTex = canvasOf(48, 52, (x) => {
  x.lineWidth = 4; x.strokeStyle = CREAM; x.fillStyle = "#2b2f5e";
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
function sky() {
  const im = ART.sky; if (!im) return null;
  if (!skyTile) {
    const w = Math.max(1, Math.round(FW * scale * dpr)), h = Math.round(w * im.height / im.width);
    skyTile = document.createElement("canvas"); skyTile.width = w; skyTile.height = h * 2;
    const x = skyTile.getContext("2d"); x.drawImage(im, 0, 0, w, h); x.translate(0, h * 2); x.scale(1, -1); x.drawImage(im, 0, 0, w, h);
  }
  return skyTile;
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
  warn: () => S.play("warn"),
};

/* ---------- 수학: 공통 모듈 GameQuiz(아이별 단계·기록) ----------
   조종사 = 아이. 문제는 그 아이 나이에 맞는 단계에서 나오고, 기록도 아이별로 따로 쌓인다.
   문제 화면(위쪽 패널·잠금·새 터치만 인정)도 GameQuiz 것을 쓴다. 갈림길 고르기 화면만 이 게임 것. */
const GameQuiz = window.GameQuiz;

/* ---------- 상태 ---------- */
let mode = "start";                  // start | play | quiz | over
let player, bullets, enemies, drops, rain, sparks, clouds, pops, rings, warns, smoke, zaps, bombs, booms;
let level, hearts, dist, wave, queue, waveGap, fireT, solved, firstTries, shield, shake, banner, bannerT, halfStep, flash = 0, trailT = 0, clock = 0, bannerBig = false;
let path = {}, missileT = 0, boltT = 0, bombT = 0, boomT = 0, boomSide = 1, orbAng = 0, yr = null;
const rnd = (a, b) => a + Math.random() * (b - a);
const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
// 지금 무기(단계·갈래가 바뀔 때만 새로 만든다)
let wCache = null, wKey = "";
function W() { const k = level + "/" + (path.main || "") + "/" + (path.side || ""); if (k !== wKey) { wKey = k; wCache = weapon(level, path); } return wCache; }

function reset() {
  player = { x: FW / 2, y: yr.home, tx: FW / 2, ty: yr.home, inv: 0, tilt: 0 };
  bullets = []; enemies = []; drops = []; rain = []; sparks = []; pops = []; rings = []; warns = []; smoke = []; zaps = []; bombs = []; booms = []; flash = 0;
  tune = tuning(pilot); runStars = 0; starsAtStart = stars;
  level = 1; hearts = tune.hearts; dist = 0; wave = 0; queue = []; waveGap = 1.2; fireT = 0;
  path = {}; missileT = 0; boltT = 0; bombT = 1; boomT = 0.5;
  solved = 0; firstTries = 0; shield = 0; shake = 0; banner = ""; bannerT = 0; halfStep = 0;
  hud();
}
function hud() {
  $("hearts").textContent = "♥".repeat(Math.max(0, hearts)) + "♡".repeat(Math.max(0, tune.hearts - hearts));
  $("weaponName").textContent = weaponLabel(level, path);
  $("pips").innerHTML = Array.from({ length: MAX_WEAPON }, (_, i) => '<i class="' + (i < level ? "on" : "") + '"></i>').join("");
  $("dist").textContent = Math.floor(dist) + "m";
}
function say(text, big) { banner = text; bannerT = big ? 2.4 : 1.8; bannerBig = !!big; }

/* ---------- 화면 크기 ---------- */
function resize() {
  vw = Math.max(1, innerWidth); vh = Math.max(1, innerHeight);
  dpr = Math.min(devicePixelRatio || 1, 1.5);
  canvas.width = Math.round(vw * dpr); canvas.height = Math.round(vh * dpr);
  const fieldPx = Math.min(vw, vh * 0.66);          // 가로 화면에서는 가운데 세로 띠만 놀이판
  scale = fieldPx / FW; offX = (vw - fieldPx) / 2; FH = vh / scale;
  // 세로로 움직일 수 있는 구간. 화면 크기가 바뀌면 구간 안에서의 상대 위치를 그대로 옮긴다.
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
  wave++;
  queue = formation(wave, Math.random, tune).map(f => Object.assign({}, f));
  if (isBossWave(wave)) { say(bossOf(wave).name + " 등장!", true); sfx.boss(); setTimeout(() => S.shout("boss"), 1100); }
}
function spawn(f) {
  const x = 26 + f.x * (FW - 52), hp = Math.max(1, Math.round(enemyHp(wave) * tune.hp)), speed = enemySpeed(wave) * tune.speed;
  if (f.kind === "boss") { const bh = Math.round(bossHp(wave) * tune.hp); enemies.push({ kind: "boss", who: f.who || "boss", x: FW / 2, y: -70, r: 54, hp: bh, max: bh, vy: 40, t: 0, shot: 1.5 }); }
  else if (f.kind === "tornado") enemies.push({ kind: "tornado", x, y: -30, r: 19, hp, max: hp, vy: speed * 0.85, vx: (Math.random() < 0.5 ? -1 : 1) * 105 * tune.speed, t: 0 });
  else if (f.kind === "hail") { const hh = Math.ceil(hp * 2.5); enemies.push({ kind: "hail", x, y: -34, r: 27, hp: hh, max: hh, vy: speed * 0.6, t: rnd(0, 6) }); }
  else if (f.kind === "gift") enemies.push({ kind: "gift", x, y: -30, r: 20, hp: Math.max(1, Math.ceil(hp * 0.5)), max: Math.max(1, Math.ceil(hp * 0.5)), vy: 62, t: rnd(0, 6) });
  else if (f.kind === "meteor") { warns.push({ x: Math.min(FW - 24, Math.max(24, player.x)), t: 1.2 }); sfx.warn(); }   // 경고 먼저, 조금 뒤에 떨어진다
  else if (f.kind === "zig") enemies.push({ kind: "zig", x, y: -30, r: 20, hp, max: hp, vy: speed * 1.2, t: 0, bx: x });
  else if (f.kind === "bolt") enemies.push({ kind: "bolt", x, y: -30, r: 16, hp: Math.ceil(hp * 0.6), max: Math.ceil(hp * 0.6), vy: 150, t: 0 });
  else enemies.push({ kind: "cloud", x, y: -30, r: 24, hp, max: hp, vy: speed, t: rnd(0, 6) });
}
function burst(x, y, color, n = 8) {
  for (let i = 0; i < n && sparks.length < 90; i++) sparks.push({ x, y, vx: rnd(-120, 120), vy: rnd(-140, 80), life: rnd(0.25, 0.55), color });
}

/* ---------- 문제 ---------- */
// 문제 화면은 GameQuiz.ask 가 띄운다(위쪽 패널, 0.7초 잠금, 새로 누른 터치만, 숫자키 1~3, 틀리면 그 보기만 꺼짐).
let quiz = null;
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
  player.inv = Math.max(player.inv, 1.2); say(msg, leveled);
  if (leveled) { rings.push({ x: player.x, y: player.y, t: 0 }); flash = 0.3; burst(player.x, player.y, "#ffe45c", 22); }
  hud(); if (mode === "quiz") mode = "play"; if (mode === "play") S.gate(false); last = performance.now();
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
  const gains = [], pre = growth && growth.promoted ? "수학 " + growth.level + "단계로 올라갔어요! · " : "";
  if (level < MAX_WEAPON && (quiz.firstTry || halfStep >= 2)) {
    if (!quiz.firstTry) halfStep = 0; level++; leveled = true;
    // 맞힌 그 순간 빰빠밤(1초 안에 느껴지는 보상). 갈림길이 아니면 0.55초 뒤 조종사 함성 — 갈림길이면 고를 때 외친다.
    S.play("levelup", level); if (!forkAt(level)) setTimeout(() => S.shout("upgrade", true), 550);
    const before = weapon(level - 1, path), now = weapon(level, path);
    if ((now.guns || 0) > (before.guns || 0)) gains.push("기관총 +" + (now.guns - (before.guns || 0)));
    if ((now.helpers || 0) > (before.helpers || 0)) gains.push("호위기 +" + now.helpers);
    if (SHIELD_LEVELS.includes(level)) { shield = Math.min(2, shield + 1); gains.push("보호막 +1"); }
  }
  else { shield = Math.min(2, shield + 1); msg = quiz.firstTry ? "보호막 +1" : "정답! 보호막 +1 · 한 번 더 맞히면 무기 강화"; S.play("correct"); setTimeout(() => S.shout("shield", true), 450); }
  // 갈림길 단계면 고른 뒤에 이름이 정해지므로 배너 문구는 그때 만든다.
  const fork = leveled ? forkAt(level) : null;
  const levelMsg = () => pre + weaponLabel(level, path) + "!" + (gains.length ? " " + gains.join(" · ") : "");
  msg = leveled ? (fork ? pre + (fork === "main" ? "새 무기를 고를 수 있어요!" : "곁무기를 고를 수 있어요!") : levelMsg()) : pre + msg;
  quiz = null;
  return { msg, leveled, fork: fork ? { kind: fork, levelMsg } : null };
}

/* ---------- 진행 ---------- */
function hurt() {
  if (player.inv > 0) return;
  if (shield > 0) { shield--; player.inv = 1.2; say("보호막이 막아 줬어요"); S.play("shieldBreak"); return; }
  hearts--; player.inv = 1.8; shake = 0.35; sfx.hit(); hud();
  if (hearts <= 0) gameOver();
}
function gameOver() {
  mode = "over"; grab = null; disarm(); S.gate(false); if (GameQuiz) GameQuiz.close(); $("fork").hidden = true;
  let best = 0; try { best = parseInt(localStorage.getItem(BEST_KEY) || "0", 10) || 0; } catch (_) {}
  const d = Math.floor(dist), record = d > best;
  if (record) { try { localStorage.setItem(BEST_KEY, String(d)); } catch (_) {} }
  $("overText").innerHTML = "<b>" + d + "m</b> 날았어요" + (record ? " · 새 기록!" : " · 최고 " + best + "m") +
    "<br>문제 " + solved + "개 풀고, 그중 " + firstTries + "개를 한 번에 맞혔어요.<br>마지막 무기: <b>" + W().name + (W().sideName ? " + " + W().sideName : "") + "</b>" +
    "<br>⭐ 별 <b>+" + runStars + "</b> · 모은 별 " + stars + "개" +
    (unlockedTrails(stars) > unlockedTrails(starsAtStart) ? "<br><b>새 꼬리 ‘" + TRAILS[unlockedTrails(stars) - 1].name + "’가 열렸어요!</b>" : "");
  paintTrails();
  $("overTitle").textContent = PILOTS[pilot].name + " 조종사, 잘 날았어요!";
  $("over").hidden = false;
}
// 레이저 줄기의 시작점·방향(각 줄기마다). 그리기와 맞히기가 같은 값을 쓴다.
function beamGeo(b) { const a = b[0]; return { ox: player.x + b[1], oy: player.y - 26, sx: Math.sin(a), sy: -Math.cos(a), a }; }
const targetable = e => e.kind !== "meteor" && e.y > -10 && !e.dead;
function explode(x, y, r, dmg, direct) {
  for (const m of enemies) if (targetable(m) && (m.x - x) ** 2 + (m.y - y) ** 2 < (r + m.r) ** 2) damage(m, m === direct ? dmg : dmg * 0.6);
  if (pops.length < 14) pops.push({ x, y, t: 0, w: r * 2.2 });
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
        if (Math.random() < dt * 8 && sparks.length < 80) sparks.push({ x: e.x + rnd(-6, 6), y: e.y + e.r * 0.6, vx: rnd(-90, 90), vy: rnd(20, 120), life: 0.3, color: "#ffffff" });
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
          damage(e, B.dmg); burst(e.x, e.y, "#bdf3ff", 3);
        }
        if (zaps.length < 8) zaps.push({ pts, t: 0.16, big: B.chain >= 4 });
        sfx.zap();
      } else boltT = 0.1;           // 칠 적이 없으면 곧 다시 살핀다
    }
  }
  if (w.orb) {
    const O = w.orb; orbAng += dt * 3.4;
    for (let i = 0; i < O.n; i++) {
      const a = orbAng + i * Math.PI * 2 / O.n, ox = player.x + Math.cos(a) * 46, oy = player.y + Math.sin(a) * 46;
      for (const e of enemies) if (targetable(e) && !(e.cdOrb > 0) && (e.x - ox) ** 2 + (e.y - oy) ** 2 < (e.r + 10) ** 2) { damage(e, O.dmg); e.cdOrb = O.cd; burst(ox, oy, "#9ff0ff", 2); S.play("orb", w.level); }
      for (const r of rain) if (!r.dead && (r.x - ox) ** 2 + (r.y - oy) ** 2 < 15 * 15) { r.dead = true; burst(r.x, r.y, "#d8f6ff", 3); S.play("orb", w.level); }       // 빗방울·눈송이를 막아 준다
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
    if (go) { m.dead = true; explode(m.x, m.y, m.r, m.dmg, null); rings.push({ x: m.x, y: m.y, t: 0, max: m.r * 1.3, color: "#ffb24a" }); burst(m.x, m.y, "#ffcf5a", 12); sfx.boom(); S.shout("bomb"); }
  }
  for (const m of booms) {
    m.t += dt; const th = m.t / m.T * Math.PI * 2;
    m.x = player.x + m.k * 58 * Math.sin(th); m.y = player.y - 26 - 120 * (1 - Math.cos(th));
    if (m.t >= m.T) { m.dead = true; continue; }
    for (const e of enemies) if (targetable(e) && !(e.cdBoom > 0) && (e.x - m.x) ** 2 + (e.y - m.y) ** 2 < (e.r + 13) ** 2) { damage(e, m.dmg); e.cdBoom = 0.2; }
  }
  bombs = bombs.filter(m => !m.dead); booms = booms.filter(m => !m.dead);
  for (const z of zaps) z.t -= dt; zaps = zaps.filter(z => z.t > 0);
  for (const s of smoke) s.t += dt; smoke = smoke.filter(s => s.t < 0.5);
}
function fire() {
  const w = W();
  S.play(w.laser ? "laser" : "shot", w.level);       // 레이저를 달면 바탕 탄 소리 대신 찌잉
  for (const [angle, dx] of w.shots) {
    if (bullets.length >= 140) break;
    bullets.push({ x: player.x + dx, y: player.y - 22, vx: Math.sin(angle) * 520, vy: -Math.cos(angle) * 520, dmg: w.dmg, pierce: !!w.pierce, beam: !!w.beam, art: w.bullet, hitT: 0 });
  }
  if (w.homing) for (let i = 0; i < w.homing && bullets.length < 140; i++) bullets.push({ x: player.x + (i ? 48 : -48), y: player.y + 4, vx: i ? 60 : -60, vy: -380, dmg: w.dmg, home: true, life: 2.2 });
}
function damage(e, amount) {
  e.hp -= amount; if (!(e.flash > -0.14)) e.flash = 0.06;      // 연사로 맞아도 계속 하얗게 남지 않도록 번쩍임 사이를 띄운다
  if (e.hp > 0) return;
  e.dead = true;
  if (e.kind === "boss") { S.play("bossDown"); setTimeout(() => S.shout("bossDown", true), 900); } else sfx.pop();
  if (pops.length < 14) pops.push({ x: e.x, y: e.y, t: 0, w: e.kind === "boss" ? 190 : e.r * 3.4 });
  burst(e.x, e.y, e.kind === "gift" ? "#ffd95a" : "#ffffff", e.kind === "boss" ? 26 : 8);
  if (e.kind === "gift") drops.push({ x: e.x, y: e.y, vy: 70, t: 0 });
  if (e.kind === "hail") for (const k of [-1, 1]) { const bh = Math.max(1, Math.ceil(e.max * 0.15)); enemies.push({ kind: "baby", x: e.x + k * 14, y: e.y, r: 13, hp: bh, max: bh, vy: e.vy * 1.9, vx: k * 70, t: 0 }); }
  if (e.kind === "boss") { drops.push({ x: e.x, y: e.y, vy: 70, t: 0 }); const name = bossOf(wave).name; if (hearts < tune.hearts) { hearts++; pops.push({ x: e.x, y: e.y - 20, t: -0.5, w: 60, art: "heart" }); say(name + "을 물리쳤어요! 하트 +1", true); } else say(name + "을 물리쳤어요!", true); rain = []; for (const m of enemies) if (m.kind === "tornado") m.hp = 0, m.dead = true; hud(); }
}
function update(dt) {
  dist += dt * (9 + wave * 0.6);
  // 비행기
  const kx = (keys.ArrowRight || keys.d || keys.D ? 1 : 0) - (keys.ArrowLeft || keys.a || keys.A ? 1 : 0);
  const ky = (keys.ArrowDown || keys.s || keys.S ? 1 : 0) - (keys.ArrowUp || keys.w || keys.W ? 1 : 0);
  if (kx) player.tx = clamp(player.tx + kx * 300 * dt, 20, FW - 20);
  if (ky) player.ty = clamp(player.ty + ky * 260 * dt, yr.min, yr.max);
  player.ty = clamp(player.ty, yr.min, yr.max);
  const dx = player.tx - player.x; player.x += dx * Math.min(1, dt * 18); player.tilt += (Math.max(-1, Math.min(1, dx / 30)) - player.tilt) * Math.min(1, dt * 10);
  player.y += (player.ty - player.y) * Math.min(1, dt * 18);
  if (player.inv > 0) player.inv -= dt;
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
    }
    b.x += b.vx * dt; b.y += b.vy * dt; if (b.hitT > 0) b.hitT -= dt;
    if (b.y < -20 || b.x < -20 || b.x > FW + 20 || b.y > FH + 20) b.dead = true;
  }
  // 적
  for (const e of enemies) {
    e.t += dt; e.flash = (e.flash || 0) - dt; if (e.cdOrb > 0) e.cdOrb -= dt; if (e.cdBoom > 0) e.cdBoom -= dt;
    if (e.kind === "boss") {
      if (e.t > BOSS_STAY) { e.y -= 90 * dt; if (e.y < -90) { e.dead = true; rain = []; say("대장이 도망갔어요"); } }
      else if (e.y < 138) e.y += e.vy * dt; else e.x = FW / 2 + Math.sin(e.t * (e.who === "typhoon" ? 1.5 : 0.9)) * (FW / 2 - 70);
      e.shot -= dt;
      // 비는 두 줄기만, 천천히. 가운데는 늘 비워 둔다.
      if (e.shot <= 0 && e.y >= 138 && e.t <= BOSS_STAY) {
        e.shot = Math.max(1.1, 1.8 - wave * 0.02) / Math.max(0.75, tune.speed);
        if (e.who === "snowking") { for (const k of [-1, 0, 1]) if (rain.length < 30) rain.push({ x: e.x + k * 44, y: e.y + 44, vx: 0, vy: 92 * tune.speed, art: "flake", sway: rnd(0, 6), bx: e.x + k * 44 }); e.shot *= 1.25; }      // 눈송이는 느리지만 좌우로 흔들린다
        else if (e.who === "typhoon") { if (enemies.filter(m => m.kind === "tornado").length < 3) { const mh = Math.max(1, Math.round(enemyHp(wave) * tune.hp * 0.6)); enemies.push({ kind: "tornado", x: e.x, y: e.y + 40, r: 19, hp: mh, max: mh, vy: 70 * tune.speed, vx: (Math.random() < 0.5 ? -1 : 1) * 105 * tune.speed, t: 0 }); } e.shot *= 1.5; }   // 회오리 부하를 내보낸다
        else for (const k of [-1, 1]) if (rain.length < 30) rain.push({ x: e.x + k * 34, y: e.y + 40, vx: k * 22, vy: 118 * tune.speed });
      }
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
      if (b.kind === "missile") { b.dead = true; explode(b.x, b.y, b.splash, b.dmg, e); burst(b.x, b.y, "#ffb24a", 5); S.play("missileHit", level); if (e.dead) break; continue; }
      damage(e, b.dmg);
      if (!e.dead) S.play(e.kind === "boss" ? "bossHit" : "hit");
      if (b.pierce) b.hitT = 0.12; else b.dead = true;
      if (e.dead) break;
    }
    if (!e.dead && e.kind !== "gift" && (player.x - e.x) ** 2 + (player.y - e.y) ** 2 < (e.r + 12) ** 2) { hurt(); if (e.kind !== "boss") { e.dead = true; burst(e.x, e.y, "#ffffff"); if (pops.length < 14) pops.push({ x: e.x, y: e.y, t: 0, w: 70 }); } }
  }
  arms(dt, W());
  for (const r of rain) { if (r.dead) continue; r.x += r.vx * dt; r.y += r.vy * dt; if (r.art === "flake") r.x = r.bx + Math.sin(r.y * 0.035 + r.sway) * 26; if (r.y > FH + 20) r.dead = true; else if ((player.x - r.x) ** 2 + (player.y - r.y) ** 2 < 15 * 15) { r.dead = true; hurt(); } }
  // 별: 가까이 오면 빨려 온다
  for (const d of drops) {
    d.t += dt; d.y += d.vy * dt;
    const dd = Math.hypot(player.x - d.x, player.y - d.y);
    if (dd < tune.magnet) { d.x += (player.x - d.x) * Math.min(1, dt * 6); d.y += (player.y - d.y) * Math.min(1, dt * 6); }
    if (dd < 26) { d.dead = true; sfx.star(); if (mode === "play") openQuiz(); }
    else if (d.y > FH + 30) d.dead = true;
  }
  for (const s of sparks) { s.life -= dt; s.x += s.vx * dt; s.y += s.vy * dt; if (!s.shape) s.vy += 260 * dt; }
  for (const c of clouds) { c.y += c.v * dt; if (c.y - c.r > FH) { c.y = -c.r; c.x = rnd(0, FW); } }
  skyY += dt * (42 + Math.min(60, wave * 2));
  for (const w of warns) { w.t -= dt; if (w.t <= 0) { w.dead = true; enemies.push({ kind: "meteor", x: w.x, y: -40, r: 15, hp: 1e9, max: 1e9, vy: 430, t: 0 }); } }
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
  $("dist").textContent = Math.floor(dist) + "m";
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
  if (player.inv > 0 && Math.floor(player.inv * 12) % 2) return;
  const w = W();
  ctx.save(); ctx.translate(player.x, player.y);
  if (w.aura) { ctx.save(); ctx.rotate(clock * 1.8); ctx.drawImage(aura, -52, -50, 104, 104); ctx.restore(); }
  if (w.helpers) for (const k of [-1, 1]) sprite("helper", k * 48, 12 + Math.sin(clock * 4 + k) * 3, 30);       // 양옆 호위기
  ctx.save(); ctx.rotate(player.tilt * 0.2); ctx.scale(1 - Math.abs(player.tilt) * 0.16, 1);                 // 기울 때 살짝 좁아져 몸을 트는 느낌
  if (!sprite(PILOTS[pilot].art, 0, 0, 56)) { ctx.fillStyle = "#ffffff"; ctx.beginPath(); ctx.ellipse(0, 0, 10, 24, 0, 0, 7); ctx.fill(); ctx.fillStyle = "#ff8fb4"; ctx.fillRect(-30, 4, 60, 9); }
  if (w.guns >= 2) for (const k of [-1, 1]) sprite("gun", k * 17, 2, 15);                                     // 날개 위 기관총
  if (w.guns >= 4) for (const k of [-1, 1]) sprite("gun", k * 25, 7, 13);
  ctx.restore();
  if (shield > 0) { ctx.drawImage(bubble, -46, -44, 92, 92); if (shield > 1) { ctx.globalAlpha = 0.7; ctx.drawImage(bubble, -54, -52, 108, 108); ctx.globalAlpha = 1; } }
  ctx.restore();
}
function render() {
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  if (bg) ctx.drawImage(bg, 0, 0);
  const sx = shake > 0 ? rnd(-4, 4) : 0;
  ctx.setTransform(scale * dpr, 0, 0, scale * dpr, (offX + sx) * dpr, 0);
  ctx.save(); ctx.beginPath(); ctx.rect(0, 0, FW, FH); ctx.clip();
  const tile = sky();
  if (tile) { const th = FW * tile.height / tile.width; for (let y = (skyY % th) - th; y < FH; y += th) ctx.drawImage(tile, 0, y, FW, th + 0.5); ctx.fillStyle = "rgba(24,70,170,.16)"; ctx.fillRect(0, 0, FW, FH); }
  else { ctx.globalAlpha = 0.16; for (const c of clouds) puff(c.x, c.y, c.r, "#ffffff"); ctx.globalAlpha = 1; }
  for (const d of drops) { ctx.fillStyle = "rgba(255,240,150,.38)"; ctx.beginPath(); ctx.arc(d.x, d.y, 24 + Math.sin(d.t * 6) * 3, 0, 7); ctx.fill(); if (!sprite("star", d.x, d.y, 38)) star(d.x, d.y, 15, "#ffd95a"); }
  for (const e of enemies) {
    const hit = e.flash > 0;
    const bob = Math.sin(e.t * 3) * 1.5;                 // 살짝 둥실거린다
    if (e.kind === "boss") { if (!sprite(e.who || "boss", e.x, e.y + bob, e.who === "boss" || !e.who ? 176 : 160, hit)) puff(e.x, e.y, e.r, hit ? "#ffffff" : "#4a4f7c", "grump"); ctx.fillStyle = "rgba(0,0,0,.4)"; ctx.fillRect(e.x - 50, e.y + 84, 100, 8); ctx.fillStyle = "#ff7a9c"; ctx.fillRect(e.x - 50, e.y + 84, 100 * Math.max(0, e.hp / e.max), 8); }
    else if (e.kind === "tornado" && sprite("tornado", e.x + Math.sin(e.t * 14) * 1.5, e.y, 46, hit)) {}
    else if (e.kind === "hail" && sprite("hail", e.x, e.y + bob, 76, hit)) {}
    else if (e.kind === "baby" && sprite("baby", e.x, e.y, 36, hit)) {}
    else if (e.kind === "tornado" || e.kind === "hail" || e.kind === "baby") puff(e.x, e.y, e.r, hit ? "#ffffff" : "#bcd3ee", "grump");
    else if (e.kind === "meteor") { if (!sprite("meteor", e.x, e.y - 12, 36)) { ctx.fillStyle = "#c9762f"; ctx.beginPath(); ctx.arc(e.x, e.y, 15, 0, 7); ctx.fill(); } }
    else if (e.kind === "gift" && sprite("gift", e.x, e.y + 24 + bob, 44, hit)) {}
    else if (e.kind === "bolt" && sprite("bolt", e.x, e.y, 36, hit)) {}
    else if ((e.kind === "cloud" || e.kind === "zig") && sprite(e.kind, e.x, e.y + bob, e.kind === "zig" ? 60 : 68, hit)) {}
    else if (e.kind === "gift") { ctx.strokeStyle = "#ffffff"; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.moveTo(e.x, e.y + e.r); ctx.lineTo(e.x, e.y + e.r + 16); ctx.stroke(); ctx.fillStyle = hit ? "#ffffff" : "#ff9ec4"; ctx.beginPath(); ctx.ellipse(e.x, e.y, e.r * 0.86, e.r, 0, 0, 7); ctx.fill(); star(e.x, e.y, 10, "#ffd95a"); }
    else if (e.kind === "bolt") { ctx.fillStyle = hit ? "#ffffff" : "#ffe45c"; ctx.beginPath(); ctx.moveTo(e.x + 4, e.y - 18); ctx.lineTo(e.x - 10, e.y + 2); ctx.lineTo(e.x - 1, e.y + 2); ctx.lineTo(e.x - 5, e.y + 18); ctx.lineTo(e.x + 10, e.y - 3); ctx.lineTo(e.x + 1, e.y - 3); ctx.closePath(); ctx.fill(); }
    else puff(e.x, e.y, e.r, hit ? "#ffffff" : e.kind === "zig" ? "#b9a2ff" : "#8f9bd6", e.kind === "zig" ? "smile" : "grump");
  }
  for (const r of rain) { if (r.art === "flake" ? sprite("flake", r.x, r.y, 22) : sprite("drop", r.x, r.y, 15)) continue; ctx.fillStyle = "#9fe2ff"; ctx.beginPath(); ctx.ellipse(r.x, r.y, 5, 8, 0, 0, 7); ctx.fill(); }
  // 미사일 연기 꼬리
  if (smoke.length) { ctx.fillStyle = "#eef2ff"; for (const s of smoke) { const k = s.t / 0.5; ctx.globalAlpha = (1 - k) * 0.55; ctx.beginPath(); ctx.arc(s.x, s.y, 3 + k * 9, 0, 7); ctx.fill(); } ctx.globalAlpha = 1; }
  // 레이저 줄기(미리 그려 둔 띠를 늘여 붙인다)
  const wNow = mode !== "start" ? W() : null;
  if (wNow && wNow.laser) {
    const L = wNow.laser, tex = BEAM[L.color] || BEAM.pink, flick = 0.82 + Math.sin(clock * 40) * 0.12;
    for (const b of L.beams) {
      const g = beamGeo(b), len = (g.oy + 20) / Math.max(0.3, -g.sy), half = L.w * (1.1 + Math.sin(clock * 25 + b[1]) * 0.08);
      ctx.save(); ctx.translate(g.ox, g.oy); ctx.rotate(g.a); ctx.globalAlpha = flick;
      ctx.drawImage(tex, -half, -len, half * 2, len);
      ctx.globalAlpha = 1; ctx.fillStyle = "#ffffff"; ctx.beginPath(); ctx.arc(0, 0, L.w * 0.55 + Math.sin(clock * 30) * 1.2, 0, 7); ctx.fill();
      ctx.restore();
    }
  }
  for (const b of bullets) {
    if (b.kind === "missile") {
      ctx.save(); ctx.translate(b.x, b.y); ctx.rotate(Math.atan2(b.vy, b.vx) + Math.PI / 2);
      ctx.fillStyle = Math.floor(clock * 30) % 2 ? "#ffe45c" : "#ff9b3d"; ctx.beginPath(); ctx.arc(0, 15, 4, 0, 7); ctx.fill();
      ctx.drawImage(missileTex, -7, -16, 14, 32); ctx.restore();
    }
    else if (b.home) { if (!sprite("star", b.x, b.y, 18)) star(b.x, b.y, 7, "#fff3a8"); }
    else if (b.art && sprite(b.art, b.x, b.y, b.art === "rainbow" ? 19 : b.art === "candy" ? 15 : b.art === "comet" ? 12 : 11)) {}
    else if (b.beam) { ctx.fillStyle = ["#ff7a9c", "#ffd95a", "#7dffb0", "#6fd3ff"][Math.floor((b.y + b.x) / 24) & 3]; ctx.fillRect(b.x - 4, b.y - 12, 8, 24); }
    else { ctx.fillStyle = b.pierce ? "#3fd8ff" : "#ff9d2e"; ctx.fillRect(b.x - 4, b.y - 9, 8, 18); ctx.fillStyle = b.pierce ? "#eaffff" : "#fff6b0"; ctx.fillRect(b.x - 2, b.y - 7, 4, 14); }
  }
  for (const m of bombs) { ctx.save(); ctx.translate(m.x, m.y); ctx.rotate(m.t * 5); ctx.drawImage(bombTex, -13, -14, 26, 28); ctx.restore(); }
  for (const m of booms) { ctx.save(); ctx.translate(m.x, m.y); ctx.rotate(m.t * 16 * m.k); ctx.drawImage(boomTex, -15, -15, 30, 30); ctx.restore(); }
  // 번개: 굵은 파란 띠 + 가는 흰 줄
  for (const z of zaps) {
    ctx.globalAlpha = Math.min(1, z.t / 0.1); ctx.lineJoin = "round"; ctx.lineCap = "round";
    ctx.beginPath(); z.pts.forEach((p, i) => (i ? ctx.lineTo(p[0], p[1]) : ctx.moveTo(p[0], p[1])));
    ctx.strokeStyle = "rgba(120,220,255,.6)"; ctx.lineWidth = z.big ? 9 : 7; ctx.stroke();
    ctx.strokeStyle = "#ffffff"; ctx.lineWidth = z.big ? 3 : 2.2; ctx.stroke();
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
  for (const w of warns) {
    if (Math.floor(w.t * 8) % 2) continue;
    ctx.fillStyle = "rgba(255,90,90,.16)"; ctx.fillRect(w.x - 18, 0, 36, FH);
    ctx.fillStyle = "#ff5a5a"; ctx.beginPath(); ctx.arc(w.x, 84, 15, 0, 7); ctx.fill();
    ctx.fillStyle = "#ffffff"; ctx.font = "900 22px 'Pretendard Variable', system-ui, sans-serif"; ctx.textAlign = "center"; ctx.fillText("!", w.x, 92);
  }
  if (mode !== "start") drawPlane();
  if (wNow && wNow.orb) for (let i = 0; i < wNow.orb.n; i++) { const a = orbAng + i * Math.PI * 2 / wNow.orb.n; ctx.drawImage(orbTex, player.x + Math.cos(a) * 46 - 13, player.y + Math.sin(a) * 46 - 13, 26, 26); }
  for (const r of rings) { const k = r.t / 0.6; ctx.globalAlpha = 1 - k; ctx.strokeStyle = r.color || "#ffe45c"; ctx.lineWidth = 7 * (1 - k) + 1; ctx.beginPath(); ctx.arc(r.x, r.y, 20 + k * (r.max || 330), 0, 7); ctx.stroke(); } ctx.globalAlpha = 1;
  if (flash > 0) { ctx.fillStyle = "rgba(255,255,255," + Math.min(0.5, flash * 1.8).toFixed(2) + ")"; ctx.fillRect(0, 0, FW, FH); }
  if (bannerT > 0 && mode !== "quiz") { ctx.globalAlpha = Math.min(1, bannerT * 2); ctx.font = (bannerBig ? "900 22px" : "800 19px") + " 'Pretendard Variable', system-ui, sans-serif"; ctx.textAlign = "center"; ctx.lineWidth = 5; ctx.lineJoin = "round"; ctx.strokeStyle = "rgba(16,26,80,.85)"; ctx.strokeText(banner, FW / 2, FH * 0.3); ctx.fillStyle = bannerBig ? "#ffe45c" : "#ffffff"; ctx.fillText(banner, FW / 2, FH * 0.3); ctx.globalAlpha = 1; }
  ctx.restore();
}

let last = performance.now();
function frame(now) {
  const dt = Math.min(0.034, Math.max(0, (now - last) / 1000)); last = now; clock += dt;
  if (mode === "play" && !document.hidden) update(dt);
  else if (mode !== "play") { skyY += dt * 42; for (const c of clouds) { c.y += c.v * dt; if (c.y - c.r > FH) { c.y = -c.r; c.x = rnd(0, FW); } } }
  render();
  requestAnimationFrame(frame);
}

/* ---------- 시작 ---------- */
function begin() { disarm(); if (GameQuiz) { GameQuiz.close(); GameQuiz.setKid(PILOTS[pilot].kid); } quiz = null; $("start").hidden = true; $("over").hidden = true; $("fork").hidden = true; reset(); mode = "play"; last = performance.now(); S.gate(false); S.setPilot(PILOTS[pilot].kid); audio(); }
$("startBtn").addEventListener("click", begin);
$("againBtn").addEventListener("click", begin);
const soundBtn = $("sound");
function paintSound() { soundBtn.setAttribute("aria-pressed", String(soundOn)); soundBtn.textContent = soundOn ? "♪" : "♪×"; }
soundBtn.addEventListener("click", () => { soundOn = !soundOn; try { localStorage.setItem(SOUND_KEY, soundOn ? "1" : "0"); } catch (_) {} S.setEnabled(soundOn, true); paintSound(); if (soundOn) S.play("tap"); });
paintSound();
const pilotBox = $("pilots");
// 조종사를 고르면 공통 수학 모듈의 "지금 하는 아이"도 같이 바뀐다(문제 수준·기록이 그 아이 것으로).
function pickPilot(i) {
  if (!(i >= 0 && i < PILOTS.length)) return;
  pilot = i; try { localStorage.setItem(PILOT_KEY, String(i)); } catch (_) {}
  if (GameQuiz) GameQuiz.setKid(PILOTS[i].kid);
  S.setPilot(PILOTS[i].kid);
  [...pilotBox.children].forEach((c, k) => c.setAttribute("aria-pressed", String(k === i)));
}
PILOTS.forEach((p, i) => {
  const b = document.createElement("button"); b.type = "button"; b.className = "pilot"; b.setAttribute("aria-pressed", String(i === pilot));
  b.innerHTML = '<img src="art/' + p.art + '.webp?v=2" alt="" draggable="false"><span>' + p.name + "</span>";
  b.addEventListener("click", () => { pickPilot(i); sfx.star(); });
  pilotBox.appendChild(b);
});
// 꼬리 꾸미기: 모은 별만큼 열린다.
function paintTrails() {
  const box = $("trails"), open = unlockedTrails(stars);
  $("starCount").textContent = "⭐ " + stars;
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
S.setPilot(PILOTS[pilot].kid);           // 함성 클립은 첫 터치(소리 깨우기) 뒤에 이 조종사 것만 받는다
try { const best = parseInt(localStorage.getItem(BEST_KEY) || "0", 10) || 0; if (best) $("bestStart").textContent = "최고 기록 " + best + "m"; } catch (_) {}
addEventListener("resize", resize);
resize(); reset();
// 미리보기·테스트가 프레임 없이도 한 걸음씩 돌려 볼 수 있게 내놓는다(주소에 ?qa=1 일 때만).
if (new URLSearchParams(location.search).get("qa") === "1") window.__plane = { begin, step: dt => { if (mode === "play") update(dt); render(); }, tick: dt => { if (mode === "play") update(dt); }, get s() { return { mode, level, hearts, wave, dist, solved, enemies: enemies.length, bullets: bullets.length, drops: drops.length, shield, pilot, stars, trail }; }, set: o => { if (o.level) level = o.level; if (o.main || o.side) path = Object.assign({}, path, o.main ? { main: o.main } : {}, o.side ? { side: o.side } : {}); if (o.shield != null) shield = o.shield; if (o.wave) wave = o.wave; if (o.stars != null) { stars = o.stars; paintTrails(); } if (o.trail != null) trail = o.trail; hud(); }, spawn, player: () => player, answer: () => { const q = GameQuiz && GameQuiz.peek(); return q && q.kind === "ask" ? q.answer : null; }, quiz: () => (GameQuiz ? GameQuiz.peek() : null), setPilot: i => pickPilot(i), world: () => ({ enemies, drops, rain }), drop: () => drops.push({ x: player.x, y: player.y - 60, vy: 70, t: 0 }), hurt, path: () => path, yr: () => yr, openQuiz, openFork: kind => openFork(kind, () => resume(weaponLabel(level, path) + "!", true)), guard: () => { if (guard) return { panel: guard.panel.id, armIn: Math.round(guard.armAt - performance.now()) }; const q = GameQuiz && GameQuiz.peek(); return q ? { panel: "quiz", armIn: q.armIn } : null; }, extra: () => ({ smoke: smoke.length, zaps: zaps.length, bombs: bombs.length, booms: booms.length }), sfxLog: () => S.qa.log(), sfx: S.qa, solve: firstTry => { const r = solve(firstTry !== false, null); return r; } };
requestAnimationFrame(frame);
