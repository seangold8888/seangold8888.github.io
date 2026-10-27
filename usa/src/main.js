// 재이와 태오의 미국 여행: 화면 전환, 지도, 앨범, 미니게임 실행기
import { PLACES, KIDS, byId, stampSVG } from "./places.js";
import * as Save from "./save.js";
import { sfx, unlock as audioUnlock, setMuted } from "./sfx.js";
import { loadImage, text, rr } from "./engine.js";
import * as vegas from "./games/vegas.js";
import * as park from "./games/park.js?v=2";
import * as beverly from "./games/beverly.js";
import * as santamonica from "./games/santamonica.js";
import * as huntington from "./games/huntington.js";
import * as erewhon from "./games/erewhon.js";

const GAMES = { vegas, park, beverly, santamonica, huntington, erewhon };
const $ = s => document.querySelector(s);
const $$ = s => Array.from(document.querySelectorAll(s));

const S = Save.load();
const IMG = {};
const ART = ["map", "bg-vegas", "bg-park", "bg-beverly", "bg-market",
  "jaei-travel", "jaei-cheer", "jaei-beach", "jaei-surf", "taeo-travel", "taeo-cheer", "taeo-beach", "taeo-surf"];
const ready = Promise.all(ART.map(k => loadImage("art/" + k + ".webp").then(im => { IMG[k] = im; })))
  .then(() => (document.fonts && document.fonts.load ? document.fonts.load('900 20px "Pretendard"').catch(() => {}) : null));

// ---------- 배경음악 ----------
const bgm = window.HubBgm ? window.HubBgm.create({ basePath: "../assets/bgm/", volume: 0.42 }) : null;
function music(track) { if (!bgm) return; if (track) bgm.setTrack(track); else bgm.stop(); }
function applySound() {
  setMuted(!S.sound);
  if (bgm) bgm.setMuted(!S.sound);
  $$(".sound-btn").forEach(b => { b.textContent = S.sound ? "🔊" : "🔇"; });
}
$$(".sound-btn").forEach(b => b.addEventListener("click", () => { S.sound = !S.sound; Save.save(S); applySound(); }));
document.addEventListener("pointerdown", audioUnlock, { capture: true, passive: true });

// ---------- 화면 ----------
let screen = "home";
function show(id) {
  ["home", "map", "play", "album"].forEach(s => { $("#" + s).hidden = s !== id; });
  ["intro", "result", "pause"].forEach(s => { $("#" + s).hidden = true; });
  screen = id;
  if (id === "home") { renderHome(); music("story"); }
  if (id === "map") { renderMap(); music("story"); }
  if (id === "album") { renderAlbum(); music("story"); }
  if (id !== "play") stopGame();
}
$$("[data-go]").forEach(b => b.addEventListener("click", () => { sfx.tap(); show(b.dataset.go); }));

const buddyOf = k => (k === "jaei" ? "taeo" : "jaei");
const mode = () => S.mode || (S.player === "taeo" ? "easy" : "normal");

// ---------- 첫 화면 ----------
function renderHome() {
  $$(".kid-card").forEach(c => c.classList.toggle("on", c.dataset.kid === S.player));
  $("#homeNote").textContent = S.player ? `지난번엔 ${KIDS[S.player].name}! 다시 골라도 기록은 그대로예요.` : "한 명을 고르면 다른 한 명이 같이 가요!";
}
$$(".kid-card").forEach(c => c.addEventListener("click", () => {
  sfx.pop();
  if (S.player !== c.dataset.kid) S.mode = "";
  S.player = c.dataset.kid; Save.save(S);
  show("map");
}));

// ---------- 지도 ----------
let carIndex = -1;
function currentIndex() {
  const i = PLACES.findIndex((p, k) => Save.isOpen(S, k) && !Save.isDone(S, p.id));
  return i < 0 ? PLACES.length - 1 : i;
}
function routePath(from, to) {
  let d = "";
  for (let i = from; i < to; i++) {
    const [x0, y0] = PLACES[i].pin, [x1, y1] = PLACES[i + 1].pin;
    const mx = (x0 + x1) / 2, my = (y0 + y1) / 2, dx = x1 - x0, dy = y1 - y0;
    const cx = mx - dy * 0.18, cy = my + dx * 0.18;
    d += (i === from ? `M ${x0} ${y0} ` : "") + `Q ${cx} ${cy} ${x1} ${y1} `;
  }
  return d;
}
function renderMap() {
  const cur = currentIndex();
  const doneTo = PLACES.reduce((n, p, i) => (Save.isDone(S, p.id) ? i : n), -1);
  $("#route").innerHTML = `<path class="r-base" d="${routePath(0, PLACES.length - 1)}"/><path class="r-dash" d="${routePath(0, PLACES.length - 1)}"/>` +
    (doneTo >= 0 && cur > 0 ? `<path class="r-done" d="${routePath(0, Math.min(cur, PLACES.length - 1))}"/>` : "");
  $("#pins").innerHTML = PLACES.map((p, i) => {
    const open = Save.isOpen(S, i), rec = S.places[p.id], stars = (rec && rec.stars) || 0;
    const cls = !open ? "locked" : (i === cur && !Save.isDone(S, p.id) ? "next" : "");
    return `<button class="pin ${cls}" type="button" data-id="${p.id}" style="left:${p.pin[0]}%;top:${p.pin[1]}%;--pc:${p.color}" ${open ? "" : 'aria-disabled="true"'} aria-label="${p.name}${open ? "" : " (잠김)"}">
      <span class="pin-badge">${p.icon}</span>${!open ? '<span class="lock">🔒</span>' : rec && rec.stamp ? '<span class="done-stamp">🏷️</span>' : ""}
      <span class="pin-label">${p.name}</span><span class="pin-stars">${open && stars ? "⭐".repeat(stars) : ""}</span></button>`;
  }).join("");
  $$("#pins .pin").forEach(b => b.addEventListener("click", () => {
    const i = PLACES.findIndex(p => p.id === b.dataset.id);
    if (!Save.isOpen(S, i)) { sfx.wrong(); flashLock(b); return; }
    sfx.pop(); openIntro(b.dataset.id);
  }));
  const kid = S.player || "jaei";
  $("#travelers").innerHTML = `<img src="art/${kid}-travel.webp" alt="${KIDS[kid].name}"><img class="buddy" src="art/${buddyOf(kid)}-travel.webp" alt="${KIDS[buddyOf(kid)].name}">`;
  $("#statStars").textContent = `⭐ ${Save.totalStars(S)}`;
  $("#statStamps").textContent = `🏷️ ${Save.stampCount(S)}/${PLACES.length}`;
  renderModes();
  // 자동차: 지난 위치에서 새 위치로 달려간다.
  const car = $("#mapCar");
  const target = PLACES[cur].pin;
  if (carIndex < 0 || carIndex === cur) {
    car.style.transition = "none";
    car.style.left = target[0] + "%"; car.style.top = target[1] + "%";
    void car.offsetWidth; car.style.transition = "";
  } else {
    const from = PLACES[carIndex].pin;
    car.style.transition = "none";
    car.style.left = from[0] + "%"; car.style.top = from[1] + "%";
    void car.offsetWidth; car.style.transition = "";
    requestAnimationFrame(() => { car.style.left = target[0] + "%"; car.style.top = target[1] + "%"; });
    sfx.whoosh();
  }
  carIndex = cur;
  if (!S.flown) {
    const pl = $("#mapPlane");
    pl.style.setProperty("--px", PLACES[0].pin[0] + "%"); pl.style.setProperty("--py", PLACES[0].pin[1] + "%");
    pl.classList.remove("fly"); void pl.offsetWidth; pl.classList.add("fly");
    car.style.opacity = "0";
    setTimeout(() => { car.style.opacity = ""; }, 2300);
    S.flown = true; Save.save(S);
  }
}
function flashLock(b) {
  b.animate([{ transform: "translate(-50%,-50%)" }, { transform: "translate(-56%,-50%)" }, { transform: "translate(-44%,-50%)" }, { transform: "translate(-50%,-50%)" }], { duration: 300 });
}
function renderModes() {
  $$(".mode-btn").forEach(b => b.classList.toggle("on", b.dataset.mode === mode()));
}
$$(".mode-btn").forEach(b => b.addEventListener("click", () => { sfx.tap(); S.mode = b.dataset.mode; Save.save(S); renderModes(); }));
$("#goAlbum").addEventListener("click", () => { sfx.tap(); show("album"); });

// ---------- 앨범 ----------
let endingMode = false;
function renderAlbum() {
  const kid = S.player || "jaei";
  $("#albumTitle").textContent = `📒 ${KIDS[kid].name}와 ${KIDS[buddyOf(kid)].name}의 여행 앨범`;
  const n = Save.stampCount(S);
  $("#albumCount").textContent = `🏷️ ${n}/${PLACES.length}`;
  const banner = $("#albumBanner");
  banner.hidden = n < PLACES.length;
  banner.textContent = endingMode ? "🎉 여행 앨범 완성! 재이와 태오의 미국 여행 끝! 또 가자! ✈️" : "🎉 여행 앨범 완성! 도장 여섯 개를 다 모았어요!";
  $("#albumGrid").innerHTML = PLACES.map(p => {
    const rec = S.places[p.id];
    return `<div class="page" data-id="${p.id}">
      <div class="photo"><img alt="${p.name} 사진" data-src="photos/${p.id}.jpg"><div class="wait"><span>📷</span>사진을 기다려요</div></div>
      <div class="page-foot"><div class="page-name">${p.name}<small>${p.en}</small></div><div class="page-stars">${rec && rec.stars ? "⭐".repeat(rec.stars) : ""}</div></div>
      <div class="stamp-slot ${rec && rec.stamp ? "" : "empty"}">${rec && rec.stamp ? stampSVG(p, rec.stamp) : "도장<br>자리"}</div>
    </div>`;
  }).join("");
  $$("#albumGrid .photo img").forEach(im => {
    im.addEventListener("load", () => im.parentElement.classList.add("has"));
    im.addEventListener("error", () => im.remove());
    im.src = im.dataset.src;
  });
  if (n === PLACES.length && endingMode) confetti();
  endingMode = false;
}
function confetti() {
  const colors = ["#ff7a6b", "#ffd166", "#4cc9a7", "#2f8fd8", "#c084fc"];
  for (let i = 0; i < 60; i++) {
    const c = document.createElement("i");
    c.className = "confetti";
    c.style.left = Math.random() * 100 + "vw";
    c.style.background = colors[i % colors.length];
    c.style.animationDuration = 2.5 + Math.random() * 2.5 + "s";
    c.style.animationDelay = Math.random() * 1.2 + "s";
    document.getElementById("app").appendChild(c);
    setTimeout(() => c.remove(), 6000);
  }
}

// ---------- 미니게임 실행 ----------
const canvas = $("#stage");
const cx = canvas.getContext("2d");
let W = 0, H = 0, dpr = 1;
let game = null, place = null, state = "idle", countT = 0, endAt = 0, lastRes = null, paused = false;
const pointers = new Set();
let toastTimer = 0;

function resize() {
  const r = canvas.getBoundingClientRect();
  if (!r.width) return;
  dpr = Math.min(2, window.devicePixelRatio || 1);
  W = r.width; H = r.height;
  canvas.width = Math.round(W * dpr); canvas.height = Math.round(H * dpr);
}
window.addEventListener("resize", resize);

const env = {
  get W() { return W; }, get H() { return H; },
  img: k => IMG[k],
  kid: (pose, who = "player") => IMG[(who === "player" ? S.player || "jaei" : buddyOf(S.player || "jaei")) + "-" + pose],
  player: "jaei", buddy: "taeo", easy: false, bot: false, sfx,
  setScore(s) { $("#hudScore").textContent = s; },
  setProgress(f) { $("#hudBar").style.width = Math.round(Math.max(0, Math.min(1, f)) * 100) + "%"; },
  toast(s, ms = 1800) {
    const t = $("#toast"); t.textContent = s; t.classList.add("show");
    clearTimeout(toastTimer); toastTimer = setTimeout(() => t.classList.remove("show"), ms);
  },
  finish(res) {
    if (state !== "play") return;
    lastRes = res; state = "end"; endAt = performance.now() + 1300;
  },
};

function openIntro(id) {
  place = byId(id);
  show("play");
  resize();
  $("#introIcon").textContent = place.icon;
  $("#introPlace").textContent = "📍 " + place.name;
  const G = GAMES[place.id];
  $("#introTitle").textContent = G.TITLE || place.title;
  $("#introGoal").innerHTML = G.GOAL || place.goal;
  renderModes();
  $("#hudTitle").textContent = place.icon + " " + place.name;
  makeGame();
  state = "intro";
  $("#intro").hidden = false;
  music(place.bgm);
}
function makeGame() {
  env.player = S.player || "jaei"; env.buddy = buddyOf(env.player); env.easy = mode() === "easy";
  env.setScore(""); env.setProgress(0);
  game = GAMES[place.id].create(env);
  paused = false;
}
$("#startBtn").addEventListener("click", () => { sfx.pop(); startPlay(); });
function startPlay() {
  makeGame(); // 난이도를 바꿨을 수 있으니 새로 만든다
  $("#intro").hidden = true; $("#result").hidden = true;
  state = "count"; countT = 3.2;
  music(place.bgm);
}
function stopGame() { if (game && game.stop) game.stop(); game = null; state = "idle"; pointers.clear(); }

function showResult() {
  const res = lastRes || { stars: 1 };
  state = "result";
  const first = Save.record(S, place.id, res.stars);
  $("#resultTitle").textContent = res.stars >= 3 ? "최고예요! 🎉" : res.stars === 2 ? "잘했어요! 👏" : "끝까지 해냈어요! 😊";
  $("#resultStars").innerHTML = [1, 2, 3].map(i => `<span class="${i <= res.stars ? "" : "off"}">⭐</span>`).join("");
  $("#resultText").textContent = res.text || "";
  const st = $("#resultStamp");
  st.hidden = !first;
  if (first) st.innerHTML = stampSVG(place, S.places[place.id].stamp) + "<span>여행 도장 쾅!<br>앨범에 찍었어요</span>";
  const idx = PLACES.indexOf(place);
  const allDone = Save.stampCount(S) === PLACES.length;
  const next = $("#nextBtn");
  if (idx === PLACES.length - 1 || (allDone && first)) {
    next.textContent = "📒 앨범 보기"; next.dataset.act = "album";
    if (allDone && !S.endingSeen) { S.endingSeen = true; Save.save(S); endingMode = true; next.textContent = "🎉 앨범 완성!"; }
  } else { next.textContent = "다음 장소로 🚙"; next.dataset.act = "map"; }
  $("#result").hidden = false;
  if (res.stars >= 2) sfx.fanfare(); else sfx.level();
}
$("#againBtn").addEventListener("click", () => { sfx.tap(); startPlay(); });
$("#nextBtn").addEventListener("click", e => { sfx.tap(); show(e.currentTarget.dataset.act === "album" ? "album" : "map"); });
$("#pauseBtn").addEventListener("click", () => { if (state === "play" || state === "count") { sfx.tap(); paused = true; $("#pause").hidden = false; releaseAll(); } });
$("#resumeBtn").addEventListener("click", () => { sfx.tap(); paused = false; $("#pause").hidden = true; });
$("#quitBtn").addEventListener("click", () => { sfx.tap(); show("map"); });
document.addEventListener("visibilitychange", () => {
  if (document.hidden && (state === "play" || state === "count") && !paused) { paused = true; $("#pause").hidden = false; releaseAll(); }
});

// 입력: 아이패드 모서리 제스처가 손뗌 신호를 삼킬 수 있으니, 손가락이 0개가 되면 전부 놓는다.
function pos(e) { const r = canvas.getBoundingClientRect(); return [e.clientX - r.left, e.clientY - r.top]; }
function releaseAll() { pointers.clear(); if (game && game.release) game.release(); }
canvas.addEventListener("pointerdown", e => {
  e.preventDefault();
  pointers.add(e.pointerId);
  try { canvas.setPointerCapture(e.pointerId); } catch (err) { /* 무시 */ }
  if (state === "play" && !paused && game && game.down) { const [x, y] = pos(e); game.down(x, y, e.pointerId); }
});
canvas.addEventListener("pointermove", e => { if (state === "play" && !paused && game && game.move) { const [x, y] = pos(e); game.move(x, y, e.pointerId); } });
["pointerup", "pointercancel", "lostpointercapture"].forEach(t => canvas.addEventListener(t, e => {
  const had = pointers.delete(e.pointerId);
  if (had && game && game.up && state === "play") { const [x, y] = pos(e); game.up(x, y, e.pointerId); }
  if (pointers.size === 0 && had) releaseAll();
}));
window.addEventListener("touchend", e => { if (e.touches.length === 0) releaseAll(); }, { passive: true });
window.addEventListener("touchcancel", e => { if (e.touches.length === 0) releaseAll(); }, { passive: true });
window.addEventListener("blur", releaseAll);

function frame(dt) {
  if (!game) return;
  if (!paused) {
    if (state === "count") {
      const before = Math.ceil(countT);
      countT -= dt;
      if (Math.ceil(countT) !== before && countT > 0.2) sfx.count(false);
      if (countT <= 0.2 && before > 0 && Math.ceil(countT) !== before) sfx.count(true);
      if (countT <= 0) state = "play";
    } else if (state === "play" || state === "end") {
      if (env.bot && game.bot && state === "play") game.bot(dt);
      game.update(dt);
    }
  }
}
function draw() {
  if (!game || !W) return;
  cx.setTransform(dpr, 0, 0, dpr, 0, 0);
  cx.clearRect(0, 0, W, H);
  game.draw(cx);
  if (state === "count") {
    cx.fillStyle = "rgba(0,0,0,.25)"; cx.fillRect(0, 0, W, H);
    const n = Math.ceil(countT - 0.2);
    const k = (countT - 0.2) % 1;
    text(cx, n > 0 ? String(n) : "출발!", W / 2, H / 2, (n > 0 ? 150 : 110) * (1 + Math.max(0, k - 0.7)), { color: "#fff", stroke: "#ff6f61", lw: 16 });
  }
}
let last = performance.now();
function loop(t) {
  const dt = Math.min(0.05, (t - last) / 1000); last = t;
  if (screen === "play") {
    if (!W) resize();
    frame(dt);
    draw();
    if (state === "end" && performance.now() >= endAt) showResult();
  }
  requestAnimationFrame(loop);
}

// ---------- 점검용 창구 ----------
window.__USA = {
  get save() { return JSON.parse(JSON.stringify(S)); },
  get state() { return { screen, state, place: place && place.id, paused, mode: mode(), W, H }; },
  get game() { return game; },
  places: PLACES.map(p => p.id),
  ready: false,
  open(id) { openIntro(id); },
  start(id) { openIntro(id); startPlay(); },
  bot(on) { env.bot = !!on; },
  // 봇이 끝까지 빠르게 플레이한다(1/60초 간격 계산). 결과 화면까지 띄운다.
  sim(maxSec = 300) {
    if (!game) return null;
    if (state === "count") state = "play";
    env.bot = true;
    setMuted(true); // 빨리 돌리는 동안 소리가 한꺼번에 쏟아지지 않게
    let t = 0;
    while (state === "play" && t < maxSec) { game.bot && game.bot(1 / 60); game.update(1 / 60); t += 1 / 60; }
    for (let i = 0; i < 30; i++) game.update(1 / 60);
    env.bot = false;
    applySound();
    const res = lastRes;
    if (state === "end") showResult();
    return { t: Math.round(t), res, summary: game && game.summary ? game.summary() : null };
  },
  go: show,
};

ready.then(() => {
  applySound();
  if (S.player) show("map"); else show("home");
  requestAnimationFrame(loop);
  window.__USA.ready = true;
});
applySound();
