// 스카이 샷 — 세로로 나는 비행기 슈팅. 별을 먹고 수학 문제를 맞히면 무기가 한 단계씩 세진다.
// 그림은 art/ 의 그림책풍 그림 파일을 쓴다(못 읽으면 캔버스 도형으로 대신 그린다). shadowBlur 는 쓰지 않는다 — 아이패드에서 가장 느리다.
import { weapon, MAX_WEAPON, enemyHp, bossHp, enemySpeed, formation, isBossWave, BOSS_STAY, SHIELD_LEVELS, bossOf, tuning, TRAILS, unlockedTrails } from "./logic.js?v=3";

const $ = id => document.getElementById(id);
const canvas = $("sky"), ctx = canvas.getContext("2d", { alpha: false });
const FW = 360;                       // 놀이판 논리 너비. 높이는 화면 비율에 맞춘다.
let FH = 640, scale = 1, offX = 0, vw = 0, vh = 0, dpr = 1, bg = null;
const BEST_KEY = "plane_best_v1", SOUND_KEY = "plane_sound_v1", PILOT_KEY = "plane_pilot_v1", STAR_KEY = "plane_stars_v1", TRAIL_KEY = "plane_trail_v1";
// 조종사: 아이 넷. 고른 아이의 비행기로 난다.
const PILOTS = [{ name: "윤찬", art: "p0" }, { name: "재이", art: "p1" }, { name: "윤건", art: "p2" }, { name: "태오", art: "p3" }];
let pilot = 1;
try { const saved = parseInt(localStorage.getItem(PILOT_KEY), 10); if (saved >= 0 && saved < PILOTS.length) pilot = saved; } catch (_) {}
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

/* ---------- 소리: Web Audio 로 그 자리에서 만든다(음성 합성 금지 — 아이패드 마이크가 죽는다) ---------- */
let ac = null, soundOn = true;
try { soundOn = localStorage.getItem(SOUND_KEY) !== "0"; } catch (_) {}
function audio() {
  if (!soundOn) return null;
  if (!ac) { const AC = window.AudioContext || window.webkitAudioContext; if (!AC) return null; try { ac = new AC(); } catch (_) { return null; } }
  if (ac.state === "suspended") ac.resume().catch(() => {});
  return ac;
}
function beep(freq, dur, type = "sine", vol = 0.12, slide = 0) {
  const a = audio(); if (!a) return;
  const o = a.createOscillator(), g = a.createGain(), t = a.currentTime;
  o.type = type; o.frequency.setValueAtTime(freq, t);
  if (slide) o.frequency.exponentialRampToValueAtTime(Math.max(30, slide), t + dur);
  g.gain.setValueAtTime(vol, t); g.gain.exponentialRampToValueAtTime(0.001, t + dur);
  o.connect(g); g.connect(a.destination); o.start(t); o.stop(t + dur + 0.02);
}
const sfx = {
  pop: () => beep(520, 0.07, "triangle", 0.06, 260),
  star: () => { beep(880, 0.10, "sine", 0.12); setTimeout(() => beep(1320, 0.14, "sine", 0.12), 80); },
  up: () => [523, 659, 784, 1047].forEach((f, i) => setTimeout(() => beep(f, 0.16, "triangle", 0.13), i * 90)),
  no: () => beep(220, 0.18, "sine", 0.10, 160),
  hit: () => beep(160, 0.28, "sawtooth", 0.12, 60),
  boss: () => beep(110, 0.5, "square", 0.08, 55),
  warn: () => { beep(700, 0.12, "square", 0.07); setTimeout(() => beep(700, 0.12, "square", 0.07), 220); },
};

/* ---------- 수학: 모험상자와 같은 단계·기록을 쓴다 ---------- */
const HubMath = window.HubMath;
let profile = null, lastKey = null;
try { profile = HubMath ? HubMath.load(localStorage) : null; } catch (_) { profile = null; }
function nextProblem() {
  if (profile) {
    try {
      const p = HubMath.next(profile.state, profile.age, Math.random, lastKey);
      lastKey = p.key;
      return { text: p.text, answer: Number(p.answer), choices: HubMath.choices(p, Math.random), raw: p };
    } catch (_) {}
  }
  // 수학 모듈을 못 읽었을 때의 예비 문제
  const a = 1 + Math.floor(Math.random() * 8), b = 1 + Math.floor(Math.random() * (9 - a)), ans = a + b;
  const set = new Set([ans]); while (set.size < 3) set.add(Math.max(0, ans + Math.floor(Math.random() * 7) - 3));
  return { text: a + " + " + b + " = □", answer: ans, choices: [...set].sort((x, y) => x - y), raw: null };
}
function recordAnswer(problem, firstTry) {
  if (!profile || !problem.raw) return null;
  try { return HubMath.record(localStorage, profile.state, problem.raw, firstTry, profile.age); } catch (_) { return null; }
}

/* ---------- 상태 ---------- */
let mode = "start";                  // start | play | quiz | over
let player, bullets, enemies, drops, rain, sparks, clouds, pops, rings, warns;
let level, hearts, dist, wave, queue, waveGap, fireT, solved, firstTries, shield, shake, banner, bannerT, halfStep, flash = 0, trailT = 0, clock = 0, bannerBig = false;
const rnd = (a, b) => a + Math.random() * (b - a);

function reset() {
  player = { x: FW / 2, y: FH - 92, tx: FW / 2, inv: 0, tilt: 0 };
  bullets = []; enemies = []; drops = []; rain = []; sparks = []; pops = []; rings = []; warns = []; flash = 0;
  tune = tuning(pilot); runStars = 0; starsAtStart = stars;
  level = 1; hearts = tune.hearts; dist = 0; wave = 0; queue = []; waveGap = 1.2; fireT = 0;
  solved = 0; firstTries = 0; shield = 0; shake = 0; banner = ""; bannerT = 0; halfStep = 0;
  hud();
}
function hud() {
  $("hearts").textContent = "♥".repeat(Math.max(0, hearts)) + "♡".repeat(Math.max(0, tune.hearts - hearts));
  $("weaponName").textContent = level + "단계 " + weapon(level).name;
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
  if (player) player.y = FH - 92;
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

/* ---------- 입력: 손가락이 가는 만큼 비행기가 좌우로 따라간다 ---------- */
let grab = null;
const toField = clientX => (clientX - offX) / scale;
canvas.addEventListener("pointerdown", e => { audio(); if (mode !== "play") return; grab = { id: e.pointerId, dx: player.tx - toField(e.clientX) }; });
canvas.addEventListener("pointermove", e => { if (mode !== "play" || !grab || grab.id !== e.pointerId) return; player.tx = Math.min(FW - 20, Math.max(20, toField(e.clientX) + grab.dx)); });
const release = e => { if (grab && (!e || grab.id === e.pointerId)) grab = null; };
canvas.addEventListener("pointerup", release); canvas.addEventListener("pointercancel", release);
addEventListener("blur", () => release());
const keys = {};
addEventListener("keydown", e => { keys[e.key] = true; });
addEventListener("keyup", e => { keys[e.key] = false; });

/* ---------- 파도 ---------- */
function startWave() {
  wave++;
  queue = formation(wave, Math.random, tune).map(f => Object.assign({}, f));
  if (isBossWave(wave)) { say(bossOf(wave).name + " 등장!", true); sfx.boss(); }
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
let quiz = null;
function openQuiz() {
  mode = "quiz"; grab = null;
  quiz = { problem: nextProblem(), firstTry: true };
  $("quizKicker").textContent = level >= MAX_WEAPON ? "맞히면 보호막이 생겨요" : "맞히면 무기가 세져요 → " + weapon(level + 1).name;
  $("formula").textContent = quiz.problem.text;
  $("quizSay").textContent = "";
  const box = $("answers"); box.innerHTML = "";
  quiz.problem.choices.forEach(value => {
    const b = document.createElement("button"); b.type = "button"; b.textContent = value;
    b.addEventListener("click", () => pick(b, value));
    box.appendChild(b);
  });
  $("quiz").hidden = false;
}
function pick(button, value) {
  if (!quiz || button.disabled) return;
  if (value !== quiz.problem.answer) {
    quiz.firstTry = false; button.disabled = true; button.classList.add("no");
    $("quizSay").textContent = "괜찮아요. 천천히 다시 골라 봐요.";
    sfx.no(); return;
  }
  button.classList.add("ok");
  [...$("answers").children].forEach(b => { b.disabled = true; });
  const growth = recordAnswer(quiz.problem, quiz.firstTry);
  solved++; if (quiz.firstTry) firstTries++;
  stars++; runStars++; try { localStorage.setItem(STAR_KEY, String(stars)); } catch (_) {}
  let msg;
  // 한 번에 맞히면 바로 한 단계. 고쳐서 맞히면 반 단계(두 번 모이면 한 단계) + 보호막.
  if (!quiz.firstTry) halfStep++;
  let leveled = false;
  if (level < MAX_WEAPON && (quiz.firstTry || halfStep >= 2)) {
    if (!quiz.firstTry) halfStep = 0; level++; leveled = true; sfx.up();
    const before = weapon(level - 1), now = weapon(level), gains = [];
    if ((now.guns || 0) > (before.guns || 0)) gains.push("기관총 +" + (now.guns - (before.guns || 0)));
    if ((now.helpers || 0) > (before.helpers || 0)) gains.push("호위기 +" + now.helpers);
    if (SHIELD_LEVELS.includes(level)) { shield = Math.min(2, shield + 1); gains.push("보호막 +1"); }
    msg = level + "단계 " + now.name + "!" + (gains.length ? " " + gains.join(" · ") : "");
  }
  else { shield = Math.min(2, shield + 1); msg = quiz.firstTry ? "보호막 +1" : "정답! 보호막 +1 · 한 번 더 맞히면 무기 강화"; sfx.star(); }
  if (growth && growth.promoted) msg = "수학 " + growth.level + "단계로 올라갔어요! · " + msg;
  $("quizSay").textContent = msg;
  quiz = null;
  setTimeout(() => { $("quiz").hidden = true; player.inv = Math.max(player.inv, 1.2); say(msg, leveled); if (leveled) { rings.push({ x: player.x, y: player.y, t: 0 }); flash = 0.3; burst(player.x, player.y, "#ffe45c", 22); } hud(); if (mode === "quiz") mode = "play"; last = performance.now(); }, 650);
}

/* ---------- 진행 ---------- */
function hurt() {
  if (player.inv > 0) return;
  if (shield > 0) { shield--; player.inv = 1.2; say("보호막이 막아 줬어요"); sfx.star(); return; }
  hearts--; player.inv = 1.8; shake = 0.35; sfx.hit(); hud();
  if (hearts <= 0) gameOver();
}
function gameOver() {
  mode = "over"; grab = null;
  let best = 0; try { best = parseInt(localStorage.getItem(BEST_KEY) || "0", 10) || 0; } catch (_) {}
  const d = Math.floor(dist), record = d > best;
  if (record) { try { localStorage.setItem(BEST_KEY, String(d)); } catch (_) {} }
  $("overText").innerHTML = "<b>" + d + "m</b> 날았어요" + (record ? " · 새 기록!" : " · 최고 " + best + "m") +
    "<br>문제 " + solved + "개 풀고, 그중 " + firstTries + "개를 한 번에 맞혔어요.<br>마지막 무기: <b>" + weapon(level).name + "</b>" +
    "<br>⭐ 별 <b>+" + runStars + "</b> · 모은 별 " + stars + "개" +
    (unlockedTrails(stars) > unlockedTrails(starsAtStart) ? "<br><b>새 꼬리 ‘" + TRAILS[unlockedTrails(stars) - 1].name + "’가 열렸어요!</b>" : "");
  paintTrails();
  $("overTitle").textContent = PILOTS[pilot].name + " 조종사, 잘 날았어요!";
  $("over").hidden = false;
}
function fire() {
  const w = weapon(level);
  for (const [angle, dx] of w.shots) {
    if (bullets.length >= 140) break;
    bullets.push({ x: player.x + dx, y: player.y - 22, vx: Math.sin(angle) * 520, vy: -Math.cos(angle) * 520, dmg: w.dmg, pierce: !!w.pierce, beam: !!w.beam, art: w.bullet, hitT: 0 });
  }
  if (w.homing) for (let i = 0; i < w.homing && bullets.length < 140; i++) bullets.push({ x: player.x + (i ? 48 : -48), y: player.y + 4, vx: i ? 60 : -60, vy: -380, dmg: w.dmg, home: true, life: 2.2 });
}
function damage(e, amount) {
  e.hp -= amount; if (!(e.flash > -0.14)) e.flash = 0.06;      // 연사로 맞아도 계속 하얗게 남지 않도록 번쩍임 사이를 띄운다
  if (e.hp > 0) return;
  e.dead = true; sfx.pop();
  if (pops.length < 14) pops.push({ x: e.x, y: e.y, t: 0, w: e.kind === "boss" ? 190 : e.r * 3.4 });
  burst(e.x, e.y, e.kind === "gift" ? "#ffd95a" : "#ffffff", e.kind === "boss" ? 26 : 8);
  if (e.kind === "gift") drops.push({ x: e.x, y: e.y, vy: 70, t: 0 });
  if (e.kind === "hail") for (const k of [-1, 1]) { const bh = Math.max(1, Math.ceil(e.max * 0.15)); enemies.push({ kind: "baby", x: e.x + k * 14, y: e.y, r: 13, hp: bh, max: bh, vy: e.vy * 1.9, vx: k * 70, t: 0 }); }
  if (e.kind === "boss") { drops.push({ x: e.x, y: e.y, vy: 70, t: 0 }); const name = bossOf(wave).name; if (hearts < tune.hearts) { hearts++; pops.push({ x: e.x, y: e.y - 20, t: -0.5, w: 60, art: "heart" }); say(name + "을 물리쳤어요! 하트 +1", true); } else say(name + "을 물리쳤어요!", true); rain = []; for (const m of enemies) if (m.kind === "tornado") m.hp = 0, m.dead = true; hud(); }
}
function update(dt) {
  dist += dt * (9 + wave * 0.6);
  // 비행기
  const kx = (keys.ArrowRight || keys.d ? 1 : 0) - (keys.ArrowLeft || keys.a ? 1 : 0);
  if (kx) player.tx = Math.min(FW - 20, Math.max(20, player.tx + kx * 300 * dt));
  const dx = player.tx - player.x; player.x += dx * Math.min(1, dt * 18); player.tilt += (Math.max(-1, Math.min(1, dx / 30)) - player.tilt) * Math.min(1, dt * 10);
  if (player.inv > 0) player.inv -= dt;
  // 발사
  fireT -= dt; if (fireT <= 0) { fire(); fireT = weapon(level).every; }
  // 파도
  if (!queue.length && !enemies.length && !warns.length) { waveGap -= dt; if (waveGap <= 0) { startWave(); waveGap = 1.1; } }
  for (const f of queue) f.delay -= dt;
  while (queue.length && queue[0].delay <= 0) spawn(queue.shift());
  queue = queue.filter(f => { if (f.delay <= 0) { spawn(f); return false; } return true; });
  // 탄
  for (const b of bullets) {
    if (b.home) {
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
    e.t += dt; e.flash = (e.flash || 0) - dt;
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
      const rr = e.r + (b.beam ? 7 : 4);
      if ((b.x - e.x) ** 2 + (b.y - e.y) ** 2 > rr * rr) continue;
      damage(e, b.dmg);
      if (b.pierce) b.hitT = 0.12; else b.dead = true;
      if (e.dead) break;
    }
    if (!e.dead && e.kind !== "gift" && (player.x - e.x) ** 2 + (player.y - e.y) ** 2 < (e.r + 12) ** 2) { hurt(); if (e.kind !== "boss") { e.dead = true; burst(e.x, e.y, "#ffffff"); if (pops.length < 14) pops.push({ x: e.x, y: e.y, t: 0, w: 70 }); } }
  }
  for (const r of rain) { r.x += r.vx * dt; r.y += r.vy * dt; if (r.art === "flake") r.x = r.bx + Math.sin(r.y * 0.035 + r.sway) * 26; if (r.y > FH + 20) r.dead = true; else if ((player.x - r.x) ** 2 + (player.y - r.y) ** 2 < 15 * 15) { r.dead = true; hurt(); } }
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
  for (const r of rings) r.t += dt; rings = rings.filter(r => r.t < 0.6);
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
  const w = weapon(level);
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
  for (const b of bullets) {
    if (b.home) { if (!sprite("star", b.x, b.y, 18)) star(b.x, b.y, 7, "#fff3a8"); }
    else if (b.art && sprite(b.art, b.x, b.y, b.art === "rainbow" ? 19 : b.art === "candy" ? 15 : b.art === "comet" ? 12 : 11)) {}
    else if (b.beam) { ctx.fillStyle = ["#ff7a9c", "#ffd95a", "#7dffb0", "#6fd3ff"][Math.floor((b.y + b.x) / 24) & 3]; ctx.fillRect(b.x - 4, b.y - 12, 8, 24); }
    else { ctx.fillStyle = b.pierce ? "#3fd8ff" : "#ff9d2e"; ctx.fillRect(b.x - 4, b.y - 9, 8, 18); ctx.fillStyle = b.pierce ? "#eaffff" : "#fff6b0"; ctx.fillRect(b.x - 2, b.y - 7, 4, 14); }
  }
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
  for (const r of rings) { const k = r.t / 0.6; ctx.globalAlpha = 1 - k; ctx.strokeStyle = "#ffe45c"; ctx.lineWidth = 7 * (1 - k) + 1; ctx.beginPath(); ctx.arc(r.x, r.y, 20 + k * 330, 0, 7); ctx.stroke(); } ctx.globalAlpha = 1;
  if (flash > 0) { ctx.fillStyle = "rgba(255,255,255," + Math.min(0.5, flash * 1.8).toFixed(2) + ")"; ctx.fillRect(0, 0, FW, FH); }
  if (bannerT > 0) { ctx.globalAlpha = Math.min(1, bannerT * 2); ctx.font = (bannerBig ? "900 22px" : "800 19px") + " 'Pretendard Variable', system-ui, sans-serif"; ctx.textAlign = "center"; ctx.lineWidth = 5; ctx.lineJoin = "round"; ctx.strokeStyle = "rgba(16,26,80,.85)"; ctx.strokeText(banner, FW / 2, FH * 0.3); ctx.fillStyle = bannerBig ? "#ffe45c" : "#ffffff"; ctx.fillText(banner, FW / 2, FH * 0.3); ctx.globalAlpha = 1; }
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
function begin() { $("start").hidden = true; $("over").hidden = true; $("quiz").hidden = true; reset(); mode = "play"; last = performance.now(); audio(); }
$("startBtn").addEventListener("click", begin);
$("againBtn").addEventListener("click", begin);
const soundBtn = $("sound");
function paintSound() { soundBtn.setAttribute("aria-pressed", String(soundOn)); soundBtn.textContent = soundOn ? "♪" : "♪×"; }
soundBtn.addEventListener("click", () => { soundOn = !soundOn; try { localStorage.setItem(SOUND_KEY, soundOn ? "1" : "0"); } catch (_) {} paintSound(); });
paintSound();
const pilotBox = $("pilots");
PILOTS.forEach((p, i) => {
  const b = document.createElement("button"); b.type = "button"; b.className = "pilot"; b.setAttribute("aria-pressed", String(i === pilot));
  b.innerHTML = '<img src="art/' + p.art + '.webp?v=2" alt="" draggable="false"><span>' + p.name + "</span>";
  b.addEventListener("click", () => { pilot = i; try { localStorage.setItem(PILOT_KEY, String(i)); } catch (_) {} [...pilotBox.children].forEach((c, k) => c.setAttribute("aria-pressed", String(k === i))); sfx.star(); });
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
try { const best = parseInt(localStorage.getItem(BEST_KEY) || "0", 10) || 0; if (best) $("bestStart").textContent = "최고 기록 " + best + "m"; } catch (_) {}
addEventListener("resize", resize);
resize(); reset();
// 미리보기·테스트가 프레임 없이도 한 걸음씩 돌려 볼 수 있게 내놓는다(주소에 ?qa=1 일 때만).
if (new URLSearchParams(location.search).get("qa") === "1") window.__plane = { begin, step: dt => { if (mode === "play") update(dt); render(); }, tick: dt => { if (mode === "play") update(dt); }, get s() { return { mode, level, hearts, wave, dist, solved, enemies: enemies.length, bullets: bullets.length, drops: drops.length, shield, pilot, stars, trail }; }, set: o => { if (o.level) level = o.level; if (o.shield != null) shield = o.shield; if (o.wave) wave = o.wave; if (o.stars != null) { stars = o.stars; paintTrails(); } if (o.trail != null) trail = o.trail; hud(); }, spawn, player: () => player, answer: () => (quiz ? quiz.problem.answer : null), world: () => ({ enemies, drops, rain }), drop: () => drops.push({ x: player.x, y: player.y - 60, vy: 70, t: 0 }), hurt };
requestAnimationFrame(frame);
