// 토핑 대행진 — 저녁 식탁 90초 시험판 (프로토타입, 단일 파일)
(() => {
"use strict";
const W = 540, H = 960, HOR = 300, CROWD_Y = 790, F = 320, ROADPX = 240;
const Q = new URLSearchParams(location.search);
const QA = Q.has("qa"), AUTO = Q.has("auto");
const cv = document.getElementById("c"), ctx = cv.getContext("2d");
const wrap = document.getElementById("wrap");
let scale = 1, dpr = 1;
function fit() {
  scale = Math.min(innerWidth / W, innerHeight / H);
  dpr = Math.min(2, window.devicePixelRatio || 1);
  wrap.style.width = W * scale + "px"; wrap.style.height = H * scale + "px"; wrap.style.setProperty("--s", scale);
  cv.width = Math.round(W * scale * dpr); cv.height = Math.round(H * scale * dpr);
}
addEventListener("resize", fit); fit();

const rand = (a, b) => a + Math.random() * (b - a);
const ri = (a, b) => Math.floor(rand(a, b + 1));
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const pick = a => a[Math.floor(Math.random() * a.length)];
const proj = (x, z) => { const s = F / (F + z); return { x: W / 2 + x * ROADPX * s, y: HOR + (CROWD_Y - HOR) * s, s }; };
const FONT = '"Jua","Apple SD Gothic Neo","Malgun Gothic",sans-serif';
const BIG = '"Black Han Sans","Jua","Apple SD Gothic Neo",sans-serif';
if (document.fonts) { document.fonts.load('40px "Jua"'); document.fonts.load('40px "Black Han Sans"'); }
// 게임식 글자: 그림자 + 굵은 남색 테두리 + 위아래 그라데이션 + 위쪽 하이라이트
function gtext(str, x, y, size, o = {}) {
  const c1 = o.c1 || "#ffffff", c2 = o.c2 || "#ffe066", st = o.stroke || "#2a1050", font = o.font || BIG;
  ctx.save();
  ctx.font = `${Math.round(size)}px ${font}`; ctx.textAlign = o.align || "center"; ctx.textBaseline = "middle"; ctx.lineJoin = "round";
  if (o.max) { const w = ctx.measureText(str).width; if (w > o.max) { ctx.translate(x, y); ctx.scale(o.max / w, o.max / w); ctx.translate(-x, -y); } }
  ctx.lineWidth = Math.max(3, size * 0.26); ctx.strokeStyle = "rgba(0,0,0,.45)"; ctx.strokeText(str, x, y + size * 0.09);
  ctx.lineWidth = Math.max(3, size * 0.22); ctx.strokeStyle = st; ctx.strokeText(str, x, y);
  const g = ctx.createLinearGradient(0, y - size * 0.5, 0, y + size * 0.45); g.addColorStop(0, c1); g.addColorStop(0.55, c2); g.addColorStop(1, o.c3 || c2);
  ctx.fillStyle = g; ctx.fillText(str, x, y);
  ctx.globalAlpha *= 0.35; ctx.lineWidth = Math.max(1, size * 0.04); ctx.strokeStyle = "#fff"; ctx.strokeText(str, x, y - size * 0.03);
  ctx.restore();
}
// 게임 UI 판: 남색 그라데이션 + 금테 + 위쪽 광택
function panel(x, y, w, h, r, o = {}) {
  ctx.save();
  ctx.fillStyle = "rgba(0,0,0,.35)"; ctx.beginPath(); ctx.roundRect(x, y + 4, w, h, r); ctx.fill();
  const g = ctx.createLinearGradient(0, y, 0, y + h); g.addColorStop(0, o.top || "#3b2a8a"); g.addColorStop(1, o.bot || "#160c3d");
  ctx.fillStyle = g; ctx.beginPath(); ctx.roundRect(x, y, w, h, r); ctx.fill();
  ctx.lineWidth = 3; ctx.strokeStyle = o.rim || "#f6c544"; ctx.stroke();
  ctx.fillStyle = "rgba(255,255,255,.18)"; ctx.beginPath(); ctx.roundRect(x + 4, y + 3, w - 8, h * 0.42, r * 0.8); ctx.fill();
  ctx.restore();
}
function starIcon(x, y, r) {
  ctx.save(); ctx.translate(x, y); ctx.beginPath();
  for (let i = 0; i < 10; i++) { const rr = i % 2 ? r * 0.45 : r; ctx.lineTo(Math.sin(i * Math.PI / 5) * rr, -Math.cos(i * Math.PI / 5) * rr); }
  ctx.closePath(); const g = ctx.createLinearGradient(0, -r, 0, r); g.addColorStop(0, "#fff7ae"); g.addColorStop(1, "#f59e0b");
  ctx.fillStyle = g; ctx.fill(); ctx.lineWidth = 3; ctx.strokeStyle = "#7c2d12"; ctx.stroke(); ctx.restore();
}

// ---------- 오디오 (합성, 음성 없음) ----------
let AC = null, master = null, musicBus = null;
function audioInit() {
  if (AC) return;
  try {
    AC = new (window.AudioContext || window.webkitAudioContext)();
    master = AC.createGain(); master.gain.value = 0.8; master.connect(AC.destination);
    musicBus = AC.createGain(); musicBus.gain.value = 0.35; musicBus.connect(master);
    loadTracks();
  } catch (e) { AC = null; }
}
function tone(f, dur, type = "sine", vol = 0.2, slide = 0, delay = 0, bus) {
  if (!AC || (S && S.demo && !bus)) return; // 첫 화면 시연 중엔 효과음 없음
  const t = AC.currentTime + delay, o = AC.createOscillator(), g = AC.createGain();
  o.type = type; o.frequency.setValueAtTime(f, t);
  if (slide) o.frequency.exponentialRampToValueAtTime(Math.max(20, slide), t + dur);
  g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(vol, t + 0.008);
  g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  o.connect(g); g.connect(bus || master); o.start(t); o.stop(t + dur + 0.02);
}
let noiseBuf = null;
function noise(dur, vol = 0.2, freq = 2000, ftype = "highpass", delay = 0, bus) {
  if (!AC || (S && S.demo && !bus)) return;
  if (!noiseBuf) { noiseBuf = AC.createBuffer(1, AC.sampleRate, AC.sampleRate); const d = noiseBuf.getChannelData(0); for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1; }
  const t = AC.currentTime + delay, s = AC.createBufferSource(), fl = AC.createBiquadFilter(), g = AC.createGain();
  s.buffer = noiseBuf; fl.type = ftype; fl.frequency.value = freq;
  g.gain.setValueAtTime(vol, t); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  s.connect(fl); fl.connect(g); g.connect(bus || master); s.start(t, Math.random() * 0.5); s.stop(t + dur + 0.02);
}
const SMP = {};
function smp(n, vol = 0.6, rate = 1, delay = 0) {
  if (!AC || !SMP[n]) return false;
  if (S && S.demo) return true;
  const src = AC.createBufferSource(), g = AC.createGain(); src.buffer = SMP[n]; src.playbackRate.value = rate; g.gain.value = vol;
  src.connect(g); g.connect(master); src.start(AC.currentTime + delay); return true;
}
const SFX = {
  pop(i) { if (smp("pop", 0.5, 0.9 + Math.min(i, 24) * 0.04)) return; const f = 520 * Math.pow(2, Math.min(i, 24) / 12); tone(f, 0.09, "triangle", 0.12, f * 1.6); },
  shatter() { if (smp("shatter", 0.7, rand(0.95, 1.08))) return; noise(0.45, 0.35, 3500); for (let i = 0; i < 6; i++) tone(rand(2000, 4200), 0.25, "sine", 0.05, 0, i * 0.03); },
  plus() { [0, 4, 7, 12].forEach((s, i) => tone(660 * Math.pow(2, s / 12), 0.14, "square", 0.06, 0, i * 0.05)); },
  mult() { [0, 4, 7, 12, 16, 19, 24].forEach((s, i) => tone(440 * Math.pow(2, s / 12), 0.16, "sawtooth", 0.05, 0, i * 0.04)); tone(110, 0.5, "sine", 0.3, 55); },
  soft() { tone(330, 0.25, "triangle", 0.12, 220); },
  bark(d = 0) { if (smp("bark", 0.45, rand(0.85, 1.25), d)) return; const f = rand(520, 700); tone(f, 0.07, "square", 0.07, f * 0.55, d); tone(f * 0.7, 0.09, "square", 0.05, f * 0.4, d + 0.08); },
  boom() { if (smp("boom", 0.9)) return; noise(0.9, 0.5, 260, "lowpass"); tone(90, 0.8, "sine", 0.5, 30); },
  ding(i = 0) { tone(1320 * Math.pow(2, i / 12), 0.3, "sine", 0.12); tone(1980 * Math.pow(2, i / 12), 0.25, "sine", 0.05); },
  whoosh() { noise(0.35, 0.18, 900, "bandpass"); },
  fanfare() { if (smp("fanfare", 0.6)) return; [0, 4, 7, 12, 7, 12, 16].forEach((s, i) => tone(523 * Math.pow(2, s / 12), 0.22, "square", 0.07, 0, i * 0.11)); },
  slam(i) { tone(140 + i * 40, 0.3, "square", 0.15, 60); noise(0.25, 0.3, 500, "lowpass"); tone(880 * Math.pow(2, i * 4 / 12), 0.4, "sine", 0.1, 0, 0.05); },
};
// 음악: 연속 정답에 따라 층이 늘어남
const music = { on: false, step: 0, next: 0, layers: 1, duck: 1, bpm: 128 };
const SCALE = [0, 2, 4, 7, 9, 12, 14, 16];
const BASS = [0, 0, 7, 7, 9, 9, 5, 7];
const LEAD = [7, -1, 9, 7, 4, -1, 2, 4, 7, -1, 12, 9, 7, -1, 4, -1];
const TRACK = { run: null, boss: null }, LP = { f: null };
let trackSrc = null, trackName = "";
function loadTracks() {
  for (const n of ["bark", "shatter", "boom", "fanfare", "pop"]) fetch(`audio/${n}.mp3`).then(r => r.ok ? r.arrayBuffer() : Promise.reject()).then(b => AC.decodeAudioData(b)).then(buf => { SMP[n] = buf; }).catch(() => {});
  for (const n of ["run", "boss"]) fetch(`audio/${n}.mp3`).then(r => r.ok ? r.arrayBuffer() : Promise.reject()).then(b => AC.decodeAudioData(b)).then(buf => { TRACK[n] = buf; }).catch(() => {});
}
// music_v1 곡은 끝 1~3초가 페이드아웃·무음 → 소리가 끝나는 지점에서 되감음 (audio/RECORD.md)
const LOOP_END = { run: 28.8, boss: 30.2 };
function playTrack(n) {
  if (!AC || trackName === n) return;
  if (trackSrc) { try { trackSrc.stop(); } catch (e) {} trackSrc = null; }
  trackName = n; if (!TRACK[n]) return;
  if (!LP.f) { LP.f = AC.createBiquadFilter(); LP.f.type = "lowpass"; LP.f.frequency.value = 1200; LP.f.connect(musicBus); }
  trackSrc = AC.createBufferSource(); trackSrc.buffer = TRACK[n]; trackSrc.loop = true; if (LOOP_END[n]) trackSrc.loopEnd = LOOP_END[n]; trackSrc.connect(LP.f); trackSrc.start();
}
function stopTrack() { if (trackSrc) { try { trackSrc.stop(); } catch (e) {} } trackSrc = null; trackName = ""; }
function musicTick() {
  if (!AC || !music.on) return;
  const want = S && S.mode === "boss" && TRACK.boss ? "boss" : TRACK.run ? "run" : "";
  if (want) {
    if (trackName !== want) playTrack(want);
    const f = [0, 700, 1600, 4000, 20000][Math.min(4, music.layers)];
    LP.f.frequency.setTargetAtTime(f, AC.currentTime, 0.25);
    musicBus.gain.setTargetAtTime(0.5 * music.duck, AC.currentTime, 0.1);
    return;
  }
  const spb = 60 / music.bpm / 4;
  musicBus.gain.setTargetAtTime(0.35 * music.duck, AC.currentTime, 0.1);
  while (music.next < AC.currentTime + 0.12) {
    const s = music.step % 16, bar = Math.floor(music.step / 16) % 8, d = Math.max(0, music.next - AC.currentTime);
    const root = 130.8 * Math.pow(2, BASS[bar] / 12);
    if (s % 4 === 0) { tone(150, 0.12, "sine", 0.5, 45, d, musicBus); }
    if (s % 4 === 2) tone(root, 0.18, "triangle", 0.25, 0, d, musicBus);
    if (music.layers >= 2) { if (s % 2 === 0) noise(0.04, 0.08, 7000, "highpass", d, musicBus); if (s === 4 || s === 12) noise(0.14, 0.22, 1500, "bandpass", d, musicBus); }
    if (music.layers >= 3) tone(root * 4 * Math.pow(2, SCALE[(s * 3 + bar) % 8] / 12) / 2, 0.08, "square", 0.04, 0, d, musicBus);
    if (music.layers >= 4 && LEAD[s] >= 0) tone(523 * Math.pow(2, (LEAD[s] + BASS[bar]) / 12), 0.16, "sawtooth", 0.05, 0, d, musicBus);
    music.step++; music.next += spb;
  }
}

// ---------- 그림 미리 그리기 ----------
function mk(w, h, fn) { const c = document.createElement("canvas"); c.width = w; c.height = h; fn(c.getContext("2d"), w, h); return c; }
const BREEDS = [
  { body: "#2b2522", fur: "#3d3531", ear: "poodle", collar: "#22c55e" },   // 올리브
  { body: "#1f1a18", fur: "#2e2724", ear: "chi", collar: "#ef4444" },      // 로니
  { body: "#e0a43c", fur: "#f2c063", ear: "golden", collar: "#3b82f6" },   // 체다
  { body: "#efe9dd", fur: "#ffffff", ear: "chi", collar: "#3b6fd6" },      // 도우 (흰 진돗개, 파란 스카프)
];
function dogSprite(b, frame) {
  return mk(64, 64, (g) => {
    g.translate(32, 36);
    // 다리
    g.fillStyle = b.body;
    const lo = frame ? 4 : -4;
    [[-11, 14 + lo], [11, 14 - lo], [-7, 18 - lo], [7, 18 + lo]].forEach(([x, y]) => { g.beginPath(); g.ellipse(x, y, 4.5, 6, 0, 0, 7); g.fill(); });
    // 꼬리
    g.strokeStyle = b.fur; g.lineWidth = 6; g.lineCap = "round";
    g.beginPath(); g.moveTo(0, 12); g.quadraticCurveTo(frame ? 10 : -10, 18, frame ? 6 : -6, 26); g.stroke();
    // 몸
    g.fillStyle = b.body; g.beginPath(); g.ellipse(0, 6, 15, 14, 0, 0, 7); g.fill();
    if (b.ear === "poodle") { g.fillStyle = b.fur; for (let i = 0; i < 9; i++) { const a = i / 9 * 6.28; g.beginPath(); g.arc(Math.cos(a) * 11, 6 + Math.sin(a) * 10, 5, 0, 7); g.fill(); } }
    // 목걸이
    g.fillStyle = b.collar; g.beginPath(); g.ellipse(0, -5, 12, 4, 0, 0, 7); g.fill();
    // 머리 (뒤통수)
    g.fillStyle = b.body; g.beginPath(); g.arc(0, -13, 12, 0, 7); g.fill();
    g.fillStyle = b.fur;
    if (b.ear === "poodle") { for (let i = 0; i < 7; i++) { g.beginPath(); g.arc(-8 + i * 2.7, -22 + Math.sin(i) * 2, 5.5, 0, 7); g.fill(); } g.beginPath(); g.ellipse(-13, -10, 6, 9, 0.2, 0, 7); g.ellipse(13, -10, 6, 9, -0.2, 0, 7); g.fill(); }
    if (b.ear === "chi") { g.fillStyle = b.body; [[-1, 1]].forEach(() => {}); g.beginPath(); g.moveTo(-12, -16); g.lineTo(-19, -34); g.lineTo(-4, -22); g.fill(); g.beginPath(); g.moveTo(12, -16); g.lineTo(19, -34); g.lineTo(4, -22); g.fill(); g.fillStyle = "#d9a07a"; g.beginPath(); g.moveTo(-11, -18); g.lineTo(-16, -30); g.lineTo(-7, -22); g.fill(); g.beginPath(); g.moveTo(11, -18); g.lineTo(16, -30); g.lineTo(7, -22); g.fill(); }
    if (b.ear === "golden") { g.beginPath(); g.ellipse(-12, -10, 6, 10, 0.35, 0, 7); g.ellipse(12, -10, 6, 10, -0.35, 0, 7); g.fill(); g.fillStyle = "rgba(255,255,255,.25)"; g.beginPath(); g.arc(-3, -17, 4, 0, 7); g.fill(); }
    // 하이라이트
    g.fillStyle = "rgba(255,255,255,.12)"; g.beginPath(); g.ellipse(-5, 0, 6, 8, -0.4, 0, 7); g.fill();
  });
}
// 판 설정. 앱판 기본값 = 올리브·도우·로니·체다. 허브판은 edition-hub.js 가 window.TP_EDITION 으로 아이 넷을 넣는다.
const ED = Object.assign({
  id: "app", picker: "age",
  cast: [
    { id: "olive", name: "올리브", sticker: "art/g/dog_olive_1.webp" }, { id: "dough", name: "도우", sticker: "art/g/dog_dough_1.webp" },
    { id: "roni", name: "로니", sticker: "art/g/dog_roni_1.webp" }, { id: "cheddar", name: "체다", sticker: "art/g/dog_cheddar_1.webp" },
  ],
  coin: { icon: "🦴", name: "뼈다귀" },
  hero: "dough", heroFront: "dough_run_front", heroUlt: "dough_howl", ultName: "도우 하울링 필살기!", ultShout: "아우우우~!",
}, window.TP_EDITION || {});
const josa = (w, a, b) => { const c = w.charCodeAt(w.length - 1); return c >= 0xac00 && c <= 0xd7a3 && (c - 0xac00) % 28 ? w + a : w + b; }; // 받침 → 이/가
const DOG = ED.cast.map((c, i) => [dogSprite(BREEDS[i % BREEDS.length], 0), dogSprite(BREEDS[i % BREEDS.length], 1)]);
function face(g, x, y, s, mad = true) {
  g.fillStyle = "#fff"; g.beginPath(); g.ellipse(x - 7 * s, y, 5 * s, 6 * s, 0, 0, 7); g.ellipse(x + 7 * s, y, 5 * s, 6 * s, 0, 0, 7); g.fill();
  g.fillStyle = "#111"; g.beginPath(); g.arc(x - 6 * s, y + 1.5 * s, 2.6 * s, 0, 7); g.arc(x + 6 * s, y + 1.5 * s, 2.6 * s, 0, 7); g.fill();
  g.fillStyle = "#fff"; g.beginPath(); g.arc(x - 5 * s, y, 1 * s, 0, 7); g.arc(x + 7 * s, y, 1 * s, 0, 7); g.fill();
  g.strokeStyle = "#111"; g.lineWidth = 2.4 * s; g.lineCap = "round";
  if (mad) { g.beginPath(); g.moveTo(x - 12 * s, y - 9 * s); g.lineTo(x - 3 * s, y - 6 * s); g.moveTo(x + 12 * s, y - 9 * s); g.lineTo(x + 3 * s, y - 6 * s); g.stroke(); }
  g.beginPath(); g.arc(x, y + 12 * s, 4 * s, 1.1 * Math.PI, 1.9 * Math.PI); g.stroke();
  g.fillStyle = "rgba(255,90,120,.45)"; g.beginPath(); g.arc(x - 12 * s, y + 7 * s, 3 * s, 0, 7); g.arc(x + 12 * s, y + 7 * s, 3 * s, 0, 7); g.fill();
}
const VEG = [
  mk(80, 80, g => { // 브로콜리
    g.fillStyle = "#86c06c"; g.beginPath(); g.roundRect(30, 44, 20, 30, 8); g.fill();
    g.fillStyle = "#2f8a3a"; [[40, 26, 18], [24, 34, 13], [56, 34, 13], [30, 20, 11], [50, 20, 11], [40, 14, 10]].forEach(([x, y, r]) => { g.beginPath(); g.arc(x, y, r, 0, 7); g.fill(); });
    g.fillStyle = "#45a84f"; [[34, 22, 5], [48, 28, 5], [26, 32, 4]].forEach(([x, y, r]) => { g.beginPath(); g.arc(x, y, r, 0, 7); g.fill(); });
    face(g, 40, 54, 0.75);
  }),
  mk(80, 80, g => { // 당근
    g.fillStyle = "#3f9b3f"; [[-0.4], [0], [0.4]].forEach(([a]) => { g.save(); g.translate(40, 16); g.rotate(a); g.beginPath(); g.ellipse(0, -6, 5, 12, 0, 0, 7); g.fill(); g.restore(); });
    g.fillStyle = "#f97316"; g.beginPath(); g.moveTo(18, 18); g.quadraticCurveTo(40, 10, 62, 18); g.quadraticCurveTo(50, 60, 40, 78); g.quadraticCurveTo(30, 60, 18, 18); g.fill();
    g.strokeStyle = "#c2410c"; g.lineWidth = 2; [[26, 46], [52, 40], [30, 60]].forEach(([x, y]) => { g.beginPath(); g.moveTo(x, y); g.lineTo(x + 7, y - 2); g.stroke(); });
    face(g, 40, 34, 0.75);
  }),
  mk(80, 80, g => { // 가지
    g.fillStyle = "#7c3aed"; g.beginPath(); g.ellipse(40, 50, 22, 26, 0, 0, 7); g.fill(); g.beginPath(); g.ellipse(40, 26, 14, 16, 0, 0, 7); g.fill();
    g.fillStyle = "#a78bfa"; g.beginPath(); g.ellipse(32, 42, 5, 10, -0.3, 0, 7); g.fill();
    g.fillStyle = "#3f9b3f"; g.beginPath(); g.moveTo(26, 14); g.lineTo(54, 14); g.lineTo(46, 22); g.lineTo(40, 16); g.lineTo(34, 22); g.fill(); g.fillRect(37, 2, 6, 12);
    face(g, 40, 46, 0.8);
  }),
];
const DISH = [
  mk(56, 56, g => { g.fillStyle = "#fde047"; g.beginPath(); g.arc(28, 28, 20, 0, 7); g.fill(); g.fillStyle = "#16a34a"; [[20, 22], [33, 20], [26, 34], [37, 32]].forEach(([x, y]) => { g.beginPath(); g.arc(x, y, 4, 0, 7); g.fill(); }); g.fillStyle = "rgba(255,255,255,.7)"; g.beginPath(); g.arc(20, 18, 5, 0, 7); g.fill(); }),
  mk(56, 56, g => { g.fillStyle = "#c2853f"; g.beginPath(); g.moveTo(6, 44); g.lineTo(50, 44); g.lineTo(28, 10); g.fill(); g.fillStyle = "#fff7ed"; g.beginPath(); g.moveTo(10, 38); g.lineTo(46, 38); g.lineTo(28, 10); g.fill(); g.fillStyle = "#f97316"; g.beginPath(); g.ellipse(28, 26, 3, 7, 0.3, 0, 7); g.fill(); }),
  mk(56, 56, g => { g.fillStyle = "#e7b05a"; g.beginPath(); g.moveTo(28, 50); g.lineTo(6, 10); g.quadraticCurveTo(28, 2, 50, 10); g.fill(); g.fillStyle = "#ef4444"; g.beginPath(); g.moveTo(28, 44); g.lineTo(10, 13); g.quadraticCurveTo(28, 7, 46, 13); g.fill(); g.fillStyle = "#fde68a"; g.fillRect(14, 14, 28, 6); g.fillStyle = "#7c3aed"; [[22, 20], [34, 22], [28, 32]].forEach(([x, y]) => { g.beginPath(); g.arc(x, y, 4, 0, 7); g.fill(); }); }),
];
// ---------- 스테이지 ----------
// 순서 = 기획서(거품 욕실 → 한밤 침대 → 양치 시간 → 장난감 정리 → 저녁 식탁). 판마다 길어지고 적·대장이 세짐.
const C_ = (...a) => a.map(([t, p]) => [t, p]);
const STAGES = [
  { id: "bath", ground: "#b9d7e8", icon: "🛁", name: "욕실", title: "거품 욕실 대모험", bossName: "거품 대왕!", win: "보송보송 목욕 끝!", swarm: 0.45, throws: 4,
    floor: ["#f5fbff", "#bfe3f7", "#7cc7ec"], side: "#8fbfdc", edge: "rgba(30,90,140,.45)", fog: [196, 224, 240], light: [200, 235, 255], sky: ["#5aa9d6", "#cfeaf7"],
    props: [["prop_bath_duck", 80], ["prop_bath_soap", 66]], emo: ["🫧", "💦", "🧼", "🦆", "🛁"],
    course: C_(["gate", 1400], ["gate", 3200], ["target", 5000], ["swarm", 6600], ["gate", 8000], ["gate", 9800], ["swarm", 11400], ["gate", 12800], ["target", 14400], ["boss", 16400]) },
  { id: "bed", ground: "#17173f", icon: "🛏️", name: "침대", title: "한밤 침대 대모험", bossName: "깜깜 악몽 구름!", win: "꿈나라 별 잔치!", swarm: 0.5, throws: 5,
    floor: ["#d9defc", "#9aa6f0", "#5b5fd6"], side: "#2b2a6e", edge: "rgba(40,30,120,.55)", fog: [34, 34, 86], light: [190, 200, 255], sky: ["#0f1240", "#3b3f8f"],
    props: [["prop_bed_pillow", 74], ["prop_bed_lamp", 96]], emo: ["🦟", "⏰", "🌫️", "⭐", "⛈️"],
    course: C_(["gate", 1400], ["gate", 3200], ["swarm", 4800], ["gate", 6200], ["target", 8000], ["swarm", 9600], ["gate", 11000], ["gate", 12800], ["swarm", 14400], ["gate", 15800], ["boss", 17800]) },
  { id: "teeth", ground: "#c4e8db", icon: "🪥", name: "양치", title: "양치 시간 대모험", bossName: "충치 대장!", win: "반짝반짝 이 잔치!", swarm: 0.55, throws: 6,
    floor: ["#f2fdf7", "#b4f0d5", "#4fd1a5"], side: "#79c4ad", edge: "rgba(15,110,90,.45)", fog: [206, 240, 228], light: [215, 255, 240], sky: ["#5cc6a8", "#d8f7ec"],
    props: [["prop_teeth_cup", 96], ["prop_teeth_paste", 70]], emo: ["🦠", "🦠", "🍬", "🦷", "👑"],
    course: C_(["gate", 1400], ["gate", 3200], ["gate", 5000], ["swarm", 6600], ["gate", 8000], ["target", 9800], ["swarm", 11400], ["gate", 12800], ["gate", 14600], ["swarm", 16200], ["gate", 17600], ["boss", 19600]) },
  { id: "toys", ground: "#d9a066", icon: "🧸", name: "장난감", title: "장난감 정리 대모험", bossName: "장난감 산더미 괴물!", win: "말끔 정리 잔치!", swarm: 0.6, throws: 6,
    floor: ["#fff4d6", "#fdc88a", "#f59e7b"], side: "#c98a4b", edge: "rgba(140,70,20,.45)", fog: [244, 214, 166], light: [255, 236, 190], sky: ["#f6c453", "#fff0c2"],
    props: [["prop_toys_bear", 92], ["prop_toys_box", 80]], emo: ["🧱", "🚗", "🧩", "🎁", "🧸"],
    course: C_(["gate", 1400], ["gate", 3200], ["swarm", 4800], ["gate", 6200], ["gate", 8000], ["swarm", 9600], ["gate", 11000], ["target", 12800], ["gate", 14600], ["swarm", 16200], ["gate", 17600], ["gate", 19400], ["boss", 21400]) },
  { id: "table", icon: "🍽️", name: "식탁", title: "저녁 식탁 대모험", bossName: "편식 대마왕 야채 냄비!", win: "야채 피자 잔치!", swarm: 0.55, throws: 6,
    floor: ["#f2ecdf", "#e4908c", "#d02a2a"], side: "#3a1c0c", edge: "rgba(120,10,10,.55)", fog: [70, 30, 12], light: [255, 214, 140], sky: ["#3b1d10", "#7a3b1c"],
    props: [["prop_plate", 70], ["prop_candle", 120], ["prop_juice", 96], ["prop_salt", 78]], emo: null,
    course: null },
];
const STG = () => STAGES[(S && S.stage) || 0];
const emoCanvas = (e, sz) => mk(sz, sz, g => { g.font = `${Math.round(sz * 0.78)}px "Apple Color Emoji","Segoe UI Emoji","Noto Color Emoji",sans-serif`; g.textAlign = "center"; g.textBaseline = "middle"; g.fillText(e, sz / 2, sz * 0.54); });
const FB = {}; // 그록 그림이 오기 전 임시 그림(이모지)
for (const st of STAGES) if (st.emo) FB[st.id] = { foe: st.emo.slice(0, 3).map(e => emoCanvas(e, 96)), good: emoCanvas(st.emo[3], 96), boss: emoCanvas(st.emo[4], 320) };
function foeImg(k) { const st = STG(); return st.id === "table" ? VEG[k] : (ART[`foe_${st.id}_${k + 1}`] || FB[st.id].foe[k]); }
function goodImg(k) { const st = STG(); return st.id === "table" ? DISH[k] : (ART[`good_${st.id}`] || FB[st.id].good); }
function goodList() { const st = STG(); return st.id === "table" ? DISH : [goodImg(0)]; }
const TREATS = [1, 2, 3, 4].map(i => { const im = new Image(); im.src = `art/treat${i}.webp`; return im; });
// 그록 그림이 있으면 바꿔 끼움 (없으면 위의 손그림 유지)
const ART = {};
function loadArt(name, cb) { const im = new Image(); im.onload = () => { ART[name] = im; cb && cb(im); }; im.src = `art/g/${name}.webp`; }
ED.cast.forEach((c, b) => [1, 2].forEach(f => loadArt(`back_${c.id}_${f}`, im => { DOG[b][f - 1] = im; })));
// 구조·필살기 그림: 앱판은 도우, 허브판은 아이마다
(ED.id === "hub" ? ED.cast.flatMap(c => [`${c.id}_run_front`, `${c.id}_cheer`]) : [ED.heroFront, ED.heroUlt]).forEach(n => loadArt(n));
["broccoli", "carrot", "eggplant"].forEach((n, k) => loadArt(`veg_${n}`, im => { VEG[k] = im; }));
["broccoli_cheeseball", "carrot_cake", "eggplant_pizza"].forEach((n, k) => loadArt(`dish_${n}`, im => { DISH[k] = im; }));
for (const st of STAGES) if (st.emo) [`bg_${st.id}`, `foe_${st.id}_1`, `foe_${st.id}_2`, `foe_${st.id}_3`, `good_${st.id}`, `boss_${st.id}`, `boss_${st.id}_hit`, ...st.props.map(p => p[0])].forEach(n => loadArt(n));
["boss_pot", "boss_pot_hit", "boss_pizza", "fx_bark_wave", "bg_room", "gate_frame", "prop_candle", "prop_juice", "prop_plate", "prop_salt", "cloth_tile"].forEach(n => loadArt(n));
function drawFit(im, cx, by, box) { const r = im.width / im.height, w = r >= 1 ? box : box * r, h = r >= 1 ? box / r : box; ctx.drawImage(im, cx - w / 2, by - h, w, h); }

// ---------- 나이별 문 ----------
// 2022 개정 초등 수학 기준, 만 나이 (7살=1학년). 11-19 제미나이·그록 검수 반영.
//  5살: 10까지 +1~3/−1~2 (문은 간식 그림 개수로)     6살: 받아올림 없이 (합 ≤10, 십몇은 일의 자리만)
//  7살 1학년: (몇)+(몇) 합≤18, 십몇−몇, 두 자리±한 자리·몇십은 받아올림/내림 없이
//  8살 2학년: 두 자리 ± (결과 ≤99), 곱셈구구(쉬움·보통 2·5단, 어려움 2~9단)
//  9살 3학년: ≤300, 세 자리는 몇십·몇백만, 몇십×몇, 나눗셈구구(몫 ≤9)
//  10살 4학년: 20부터 몇십·몇백 단위만, 몇십×몇·몇십×몇십, 몇백÷몇십(몫 ≤9)
const op = (o, v) => ({ op: o, v });
const R10 = (lo, hi) => (hi < lo ? null : ri(Math.ceil(lo / 10), Math.floor(hi / 10)) * 10);
const R100 = (lo, hi) => (hi < lo ? null : ri(Math.ceil(lo / 100), Math.floor(hi / 100)) * 100);
const nz = (o, v) => (v == null || v < 1 ? null : op(o, v));
const rr = (o, lo, hi) => (hi < lo ? null : op(o, ri(lo, hi)));
const curTier = () => (S && S.tier != null ? S.tier : 1);
const AGE = {
  5: { start: 2, max: 10, ms: [5, 10], slow: 0.45, label: "유치원", ops: [
    [6, c => rr("+", 1, Math.min(3, 10 - c))],
    [3, c => rr("−", 1, Math.min(2, c - 1))]] },
  6: { start: 3, max: 19, ms: [10, 15], slow: 0.52, label: "유치원", ops: [
    [5, c => rr("+", 1, Math.min(5, c < 10 ? 10 - c : 9 - c % 10))],
    [3, c => rr("−", 1, Math.min(5, c <= 10 ? c - 1 : c % 10))]] },
  7: { start: 5, max: 99, ms: [30, 50, 90], slow: 0.6, label: "1학년", ops: [
    [4, c => rr("+", 1, c <= 9 ? Math.min(9, 18 - c) : Math.min(9, 9 - c % 10))],
    [2, c => nz("+", R10(10, Math.min(30, 99 - c)))],
    [3, c => c <= 10 ? rr("−", 1, c - 1) : c <= 18 ? rr("−", 2, Math.min(9, c - 1)) : rr("−", 1, c % 10)],
    [1, c => c >= 20 ? nz("−", R10(10, Math.min(30, c - 1))) : null]] },
  8: { start: 6, max: 99, ms: [40, 70, 99], slow: 0.6, label: "2학년", ops: [
    [3, c => rr("+", 11, Math.min(49, 99 - c))],
    [2, c => nz("+", R10(10, Math.min(40, 99 - c)))],
    [1, c => rr("+", 2, Math.min(9, 99 - c))],
    [2, c => c > 20 ? rr("−", 11, Math.min(39, c - 1)) : null],
    [4, c => c <= 9 ? op("×", curTier() < 2 ? pick([2, 5]) : ri(2, 9)) : null]] },
  9: { start: 8, max: 300, ms: [100, 200, 300], slow: 0.6, label: "3학년", ops: [
    [3, c => c < 100 ? rr("+", 10, Math.min(99, 300 - c)) : nz("+", Math.random() < 0.5 ? R10(10, Math.min(90, 300 - c)) : R100(100, Math.min(200, 300 - c)))],
    [2, c => c < 30 ? null : c < 100 ? rr("−", 10, Math.min(99, c - 1)) : nz("−", Math.random() < 0.5 ? R10(10, Math.min(90, c - 1)) : R100(100, Math.min(200, c - 1)))],
    [3, c => c <= 9 ? op("×", ri(2, 9)) : ((c % 10 === 0 && c <= 90) || c <= 30) ? op("×", ri(2, 3)) : null],
    [3, c => { const ds = [2, 3, 4, 5, 6, 7, 8, 9].filter(v => c % v === 0 && c / v >= 2 && c / v <= 9); return ds.length ? op("÷", pick(ds)) : null; }]] },
  10: { start: 20, max: 3000, ms: [500, 1000, 2000], slow: 0.6, label: "4학년", ops: [
    [2, c => nz("+", c < 100 ? R10(10, 90) : R100(100, Math.min(900, 3000 - c)))],
    [2, c => c < 30 ? null : nz("−", c <= 100 ? R10(10, c - 10) : R100(100, Math.min(900, c - 100)))],
    [3, c => (c <= 90 || (c % 100 === 0 && c <= 300)) ? op("×", ri(2, 9)) : null],
    [1, c => (c % 10 === 0 && c <= 90) ? op("×", pick([10, 20, 30])) : null],
    [2, c => { const ds = [10, 20, 30, 40, 50, 60, 70, 80, 90].filter(v => c % v === 0 && c / v >= 2 && c / v <= 9).concat([2, 3, 4, 5].filter(v => c % v === 0 && (c / v) % 10 === 0 && c / v >= 20)); return ds.length ? op("÷", pick(ds)) : null; }]] },
};
function applyOp(o, c) {
  switch (o.op) { case "+": return c + o.v; case "−": return c - o.v; case "×": return c * o.v; case "÷": return Math.floor(c / o.v); }
}
function randOp(c, age) {
  const list = AGE[age].ops;
  for (let t = 0; t < 40; t++) {
    let r = Math.random() * list.reduce((s, x) => s + x[0], 0);
    for (const [w, fn] of list) { if ((r -= w) <= 0) { const o = fn(c); if (o) return o; break; } }
  }
  return null;
}
// 학년 안 자동 난이도: 0 쉬움(차이 큼, 한 학년 아래 섞음, 함정 없음) 1 보통 2 어려움(차이 작음, 계산 필요한 짝만)
// 올림 = 최근 5문 중 4문 정답(문 앞에서 움직여 고른 정답만 셈), 내림 = 2문 연속 오답. 판 끝나도 나이별로 기억.
const TIER_GAP = [[0.3, 1], [0.1, 0.5], [0.06, 0.2]]; // [최소, 최대] 차이 비율
const TARGET_P = [0, 0.2, 0.35]; // 딱 N 문 비율
function tierOp(c, age, tier) {
  const lower = { 6: 5, 7: 6, 8: 7, 9: 8 }[age]; // 10살은 몇백 단위가 깨져서 섞지 않음
  const o = tier === 0 && lower && c <= AGE[lower].max && Math.random() < 0.5 ? randOp(c, lower) : null;
  return o || randOp(c, age);
}
// 숫자만 보면 끝나는 짝 (+ vs −, × vs ÷, ×끼리, ÷끼리)
function trivialPair(a, b, age) {
  if (age >= 9 && a.op === b.op) return true; // 9살+: 같은 연산끼리는 숫자만 비교 → 딱 N 으로
  const s = [a.op, b.op].sort().join("");
  return s === "+−" || s === "×÷" || s === "××" || s === "÷÷";
}
// 어려움(7살+)은 계산해야 알 수 있는 짝만: × vs + , ÷ vs −
function needsMath(a, b) { const s = [a.op, b.op].sort().join(""); return s === "+×" || s === "÷−"; }
// strict: 규칙에 맞는 짝을 못 만들면 null (부르는 쪽이 딱 N 문으로 바꿈)
function genPair(c, age, wantTrap, mMul = 1, strict = false) {
  const M = Math.round(AGE[age].max * mMul), tier = curTier();
  if (tier === 0) wantTrap = false;
  for (let pass = 0; pass < 3; pass++) {
    if (pass === 2 && strict) return null;
    const [gMin, gMax] = pass < 2 ? TIER_GAP[tier] : [0, 1];
    for (let t = 0; t < 400; t++) {
      const a = tierOp(c, age, tier), b = tierOp(c, age, tier);
      if (!a || !b) continue;
      const ra = applyOp(a, c), rb = applyOp(b, c);
      if (ra === rb || Math.abs(ra - rb) < 2 || Math.max(ra, rb) > M || Math.min(ra, rb) < 1) continue;
      const gap = Math.abs(ra - rb) / Math.max(ra, rb);
      if (gap < gMin || gap > gMax) continue;
      if (a.op === b.op && a.v === b.v) continue;
      if (pass < 2 && tier >= 1 && trivialPair(a, b, age)) continue;
      if (pass < 2 && tier === 2 && age >= 7 && !needsMath(a, b)) continue;
      if (wantTrap && pass === 0) {
        const m = a.op === "×" ? [a, ra, b, rb] : b.op === "×" ? [b, rb, a, ra] : null;
        if (!m || m[2].op !== "+" || m[3] <= m[1]) continue;
      }
      return Math.random() < 0.5 ? [a, b] : [b, a];
    }
  }
  return anyPair(c, age, M);
}
// 규칙 없이라도 그 학년 연산으로 만든 짝 (마지막 수단)
function anyPair(c, age, M = AGE[age].max) {
  for (let t = 0; t < 400; t++) {
    const a = randOp(c, age), b = randOp(c, age);
    if (!a || !b) continue;
    const ra = applyOp(a, c), rb = applyOp(b, c);
    if (ra !== rb && ra >= 1 && rb >= 1 && ra <= M && rb <= M) return [a, b];
  }
  return c > 3 ? [op("−", 1), op("−", 2)] : [op("+", 1), op("+", 2)];
}
function genTarget(c, age) {
  const M = AGE[age].max;
  if (age === 7 && c < 10 && Math.random() < 0.5) { // 1학년 핵심: 10 만들기
    const want = 10 - c, others = [];
    for (let v = 1; v <= Math.min(9, 18 - c); v++) if (v !== want) others.push(v);
    if (others.length) { const a = op("+", want), b = op("+", pick(others)); return { opts: Math.random() < 0.5 ? [a, b] : [b, a], target: 10 }; }
  }
  for (let t = 0; t < 600; t++) {
    const a = randOp(c, age), b = randOp(c, age);
    if (!a || !b) continue;
    const ra = applyOp(a, c), rb = applyOp(b, c);
    if (ra === rb || ra < 1 || rb < 1 || ra > M || rb > M) continue;
    if (a.op === "−" || ra < c) continue; // 목표는 늘어나는 쪽
    if (age >= 7 && (b.op === "−" || b.op === "÷")) continue; // 두 쪽 다 계산해 봐야 알게
    if (age === 8 && a.op === "+" && b.op === "+" && a.v % 10 !== 0 && b.v % 10 !== 0) continue; // 2학년: 한쪽은 몇십
    return { opts: Math.random() < 0.5 ? [a, b] : [b, a], target: ra };
  }
  const p = anyPair(c, age), rs = p.map(o => applyOp(o, c));
  return { opts: p, target: rs[Math.random() < 0.5 ? 0 : 1] };
}

// ---------- 상태 ----------
let S = null;
const COURSE = [
  ["gate", 1400], ["gate", 3200], ["gate", 5000], ["swarm", 6600],
  ["gate", 8000], ["gate", 9800], ["swarm", 11400],
  ["gate", 12800], ["target", 14600], ["gate", 16400], ["swarm", 18000],
  ["gate", 19400], ["gate", 21200], ["boss", 23200],
];
STAGES[4].course = COURSE;
const V = 430, SPAWN = 1900;
function lsGet(k) { try { return localStorage.getItem(k); } catch (e) { return null; } }
function lsSet(k, v) { try { localStorage.setItem(k, v); } catch (e) {} }
// 첫 문 2개: 그 나이 연산 중 + 하나, − 하나 (+가 항상 정답). 첫 판이 아니어도 판 시작은 쉽게.
function easyPair(c, age) {
  const M = AGE[age].max;
  for (let t = 0; t < 200; t++) {
    const a = randOp(c, age), b = randOp(c, age);
    if (!a || !b || a.op !== "+" || b.op !== "−") continue;
    const ra = applyOp(a, c), rb = applyOp(b, c);
    if (ra > M || rb < 1) continue;
    return Math.random() < 0.5 ? [a, b] : [b, a];
  }
  for (let t = 0; t < 300; t++) { // − 가 안 되는 수면: ×·÷ 없이 차이가 큰 짝 (+40 vs +11)
    const a = randOp(c, age), b = randOp(c, age);
    if (!a || !b || "×÷".includes(a.op) || "×÷".includes(b.op)) continue;
    const ra = applyOp(a, c), rb = applyOp(b, c);
    if (ra > M || rb > M || ra < 1 || rb < 1 || Math.abs(ra - rb) / Math.max(ra, rb) < 0.35) continue;
    return [a, b];
  }
  return null;
}
// 해금(별 2개 이상으로 깨면 다음 판), 코인, 강화 4종 — 판마다 강해짐
const KEY = k => `tp_${k}_${ED.id}`;
function unlocked() { return Math.min(STAGES.length - 1, Math.max(0, +lsGet(KEY("stage")) || 0)); }
function selStage() { const v = lsGet(KEY("stsel")); return v == null ? unlocked() : Math.min(unlocked(), +v || 0); }
function coins() { return Math.max(0, +lsGet(KEY("coin")) || 0); }
const UPS = [
  { id: "start", icon: "🐾", name: "출발 친구", max: 5, desc: l => `출발할 때 친구 더 많이 (${l}단계)` },
  { id: "shield", icon: "🛡️", name: "연속 방패", max: 3, desc: l => `틀려도 연속 지키기 ${l}번` },
  { id: "storm", icon: "🌈", name: "토핑 폭풍", max: 5, desc: l => `폭풍 ${5 + l}초` },
  { id: "ult", icon: "💥", name: "필살기", max: 5, desc: l => `필살기 ${l * 25}% 더 빨리·세게` },
];
const UP_COST = [15, 30, 50, 80, 120];
function ups() { let o = {}; try { o = JSON.parse(lsGet(KEY("ups")) || "{}"); } catch (e) {} for (const u of UPS) o[u.id] = Math.min(u.max, Math.max(0, +o[u.id] || 0)); return o; }
function startBonus(age, l) { const st = AGE[age].start; return Math.min(st * 2, l * Math.max(1, Math.round(st * 0.4))); }
function loadTier(age) { try { const r = localStorage.getItem("tp_tier_" + age); const v = +r; return r != null && v >= 0 && v <= 2 ? v : 1; } catch (e) { return 1; } }
function adaptTier(ok, moved) {
  if (ok) { S.wrongRun = 0; if (moved) S.hist.push(1); } else { S.wrongRun++; S.hist.push(0); }
  if (S.hist.length > 5) S.hist.shift();
  if (S.hist.length >= 5 && S.hist.filter(x => x).length >= 4 && S.tier < 2) { S.tier++; S.hist = []; }
  if (S.wrongRun >= 2 && S.tier > 0) { S.tier--; S.wrongRun = 0; S.hist = []; }
  try { localStorage.setItem("tp_tier_" + S.age, S.tier); } catch (e) {}
}
function newGame(age, demo, stage) {
  const UP = demo ? { start: 0, shield: 0, storm: 0, ult: 0 } : ups(), stg = stage ?? selStage();
  S = {
    stage: stg, up: UP, shields: UP.shield,
    age, mode: "run", t: 0, d: 0, speed: V, count: AGE[age].start, shown: AGE[age].start,
    cx: 0, tx: 0, score: 0, streak: 0, best: 0, correct: 0, total: 0, combo: 0, comboT: 0,
    ev: STAGES[stg].course.map(([type, p]) => ({ type, p, spawned: false, done: false })),
    end: STAGES[stg].course[STAGES[stg].course.length - 1][1],
    dogs: [], parts: [], texts: [], rings: [], notes: [], balls: [],
    shake: 0, hitstop: 0, slow: 1, slowT: 0, msHit: {}, flashCol: null, flashA: 0,
    boss: null, battle: null, resultT: -1, bannerT: 0, banner: "", bannerCol: "#fff",
    trapLeft: 4, gatesMade: 0, gateIdx: 0, stormT: 0, stormRain: 0, tut: !demo && !lsGet("tp_tut_done"), crowdZ: 0, jump: 0, ultBtn: false, ultGauge: 0,
    tier: demo ? 1 : loadTier(age), hist: [], wrongRun: 0, lastMoveT: -1, log: [], demo: !!demo,
  };
  if (demo) { S.count = S.shown = 14; S.dogs = []; }
  syncDogs(true);
  music.on = true; music.layers = 1; music.step = 0; if (AC) music.next = AC.currentTime + 0.05;
  const sb = demo ? 0 : startBonus(age, UP.start);
  if (sb) { S.count = S.shown = S.count + sb; syncDogs(true); }
  if (!demo) banner(sb ? `${STAGES[stg].title}! 친구 +${sb}` : `${STAGES[stg].title}!`, "#fde047");
}

// 강아지 배치 (해바라기 씨 배열)
const DOG_CAP = 120;
function slot(i) { const r = 0.05 * Math.sqrt(i + 0.5), a = i * 2.39996; return { x: Math.cos(a) * r, z: Math.sin(a) * r * 260 + r * 120 }; }
function syncDogs(instant, fromX, fromZ) {
  const n = Math.min(DOG_CAP, S.count);
  while (S.dogs.length < n) {
    const i = S.dogs.length, sl = slot(i);
    S.dogs.push({ i, b: i % ED.cast.length, ox: instant ? sl.x : (fromX ?? 0) - S.cx + rand(-0.3, 0.3), oz: instant ? sl.z : (fromZ ?? 100) + rand(0, 200), vy: instant ? 0 : rand(2, 4), y: 0, sc: instant ? 1 : 0, ph: Math.random() * 6 });
  }
  while (S.dogs.length > n) {
    const d = S.dogs.pop(), p = proj(S.cx + d.ox, d.oz + S.crowdZ);
    burst(p.x, p.y - 10, 6, ["#fff", "#d6d3d1"], 3, 0.5);
  }
}

// ---------- 연출 도구 ----------
function burst(x, y, n, cols, sp = 6, life = 0.8, kind = "spark") {
  for (let i = 0; i < n && S.parts.length < 900; i++) {
    const a = rand(0, 6.28), v = rand(0.3, 1) * sp * 60;
    S.parts.push({ kind, x, y, vx: Math.cos(a) * v, vy: Math.sin(a) * v - sp * 25, g: 600, life, max: life, col: pick(cols), r: rand(3, 7), rot: rand(0, 6), vr: rand(-10, 10), img: null });
  }
}
function shards(x, y, w, h, n) {
  for (let i = 0; i < n && S.parts.length < 900; i++) {
    S.parts.push({ kind: "shard", x: x + rand(-w / 2, w / 2), y: y + rand(-h, 0), vx: rand(-420, 420), vy: rand(-650, -100), g: 1100, life: rand(0.7, 1.2), max: 1.2, col: pick(["rgba(147,197,253,.9)", "rgba(191,219,254,.95)", "rgba(255,255,255,.9)", "rgba(196,181,253,.9)"]), r: rand(8, 20), rot: rand(0, 6), vr: rand(-14, 14) });
  }
}
function confetti(n, y0 = -20) {
  for (let i = 0; i < n && S.parts.length < 900; i++) S.parts.push({ kind: "conf", x: rand(0, W), y: y0 - rand(0, 200), vx: rand(-60, 60), vy: rand(80, 260), g: 120, life: 3, max: 3, col: pick(["#f43f5e", "#facc15", "#22c55e", "#3b82f6", "#a855f7", "#fb923c"]), r: rand(5, 10), rot: rand(0, 6), vr: rand(-8, 8) });
}
const STORM_IMGS = () => [...TREATS, ...goodList()].filter(im => im && (im.complete === undefined || im.complete));
function startStorm() {
  S.stormT = 5 + (S.up.storm || 0); S.stormRain = 0;
  banner("토핑 폭풍!", "#f9a8d4"); SFX.fanfare(); SFX.mult(); vib(60);
  rain(46, STORM_IMGS(), -60); confetti(60);
  const p = proj(S.cx, S.crowdZ + 40); ring(p.x, p.y - 80, "rainbow", 520, 1.0, 30); ring(p.x, p.y - 80, "#f9a8d4", 380, 0.8, 18);
  shake(0.55); flash("#f472b6", 0.22); S.hitstop = 0.12;
}
function rain(n, imgs, y0 = -40) {
  for (let i = 0; i < n && S.parts.length < 900; i++) S.parts.push({ kind: "img", x: rand(20, W - 20), y: y0 - rand(0, 500), vx: rand(-40, 40), vy: rand(120, 300), g: 500, life: 3.2, max: 3.2, img: pick(imgs), r: rand(34, 56), rot: rand(-0.5, 0.5), vr: rand(-3, 3), bounce: 1 });
}
function text(str, x, y, size = 40, col = "#fff", life = 1, vy = -70) { S.texts.push({ str, x, y, size, col, life, max: life, vy }); }
function ring(x, y, col, maxR = 260, life = 0.6, w = 14) { S.rings.push({ x, y, col, maxR, life, max: life, w }); }
function banner(str, col = "#fff") { if (S.demo) return; if (S.stormT > 4.2 && str !== "토핑 폭풍!") return; S.banner = str; S.bannerCol = col; S.bannerT = 1.6; }
function shake(a) { S.shake = Math.min(1, S.shake + a); }
let touched = false;
function vib(ms) { if (!touched || (S && S.demo)) return; try { navigator.vibrate && navigator.vibrate(ms); } catch (e) {} }
function flash(col, a = 0.25) { S.flashCol = col; S.flashA = Math.min(0.35, a); } // 전체 흰 번쩍임 금지, 색 낮은 알파만

function setCount(n, fromX, fromZ) {
  const prev = S.count; S.count = Math.max(0, Math.round(n));
  syncDogs(false, fromX, fromZ);
  for (const m of AGE[S.age].ms) if (prev < m && S.count >= m && !S.msHit[m]) {
    S.msHit[m] = true; const p = proj(S.cx, 0);
    ring(p.x, p.y - 30, "#facc15", 340, 0.8, 20); burst(p.x, p.y - 30, 50, ["#fde047", "#facc15", "#fff"], 9, 1.1, "star");
    banner(`와르르! ${m}마리!`, "#facc15"); SFX.fanfare(); shake(0.3); S.score += m;
  }
}
function updateMusicLayers() { const k = S.streak; music.layers = 1 + (k >= 3) + (k >= 5) + (k >= 10); if (S.mode === "boss") music.layers = Math.max(3, music.layers); }

// 남은 일들을 최선으로 풀었을 때의 수 (문 생성용)
function projected() {
  let c = S.count;
  for (const e of S.ev) {
    if (!e.spawned || e.done) continue;
    if (e.opts) { const rs = e.opts.map(o => applyOp(o, c)); c = e.target != null ? e.target : Math.max(...rs); }
    else if (e.type === "swarm" && e.n != null) c = Math.max(1, c - e.left);
  }
  return c;
}

// ---------- 문 통과 ----------
function passGate(e, z = 0) {
  const side = S.cx < 0 ? 0 : 1, c = S.count;
  const rs = e.opts.map(o => applyOp(o, c)), mine = rs[side], other = rs[1 - side];
  let ok;
  if (e.target != null) ok = Math.abs(mine - e.target) <= Math.abs(other - e.target);
  else ok = mine >= other;
  e.chosen = side; e.done = true; e.flashT = 0.6;
  const gx = side === 0 ? -0.5 : 0.5, p = proj(gx, Math.max(z, 1));
  const o = e.opts[side];
  S.total++;
  const moved = S.lastMoveT >= (e.spawnT ?? -1);
  S.log.push({ c, opts: e.opts.map(o => o.op + o.v), rs, ok, genTier: e.genTier, tier: S.tier, target: e.target, moved });
  if (!S.demo && e.genTier != null) adaptTier(ok, moved);
  if (ok) {
    S.correct++; S.streak++; S.best = Math.max(S.best, S.streak);
    const exact = e.target != null && mine === e.target;
    const gain = 10 * S.streak * (exact ? 2 : 1) * (S.stormT > 0 ? 2 : 1); S.score += gain;
    if (S.streak % 5 === 0) startStorm();
    shards(p.x, p.y, ROADPX * 0.9 * p.s, ROADPX * 0.9 * p.s, 60);
    SFX.shatter(); vib(30);
    if (o.op === "×") { S.hitstop = 0.15; SFX.mult(); ring(p.x, p.y - 60, "rainbow", 420, 0.8, 26); shake(0.45); flash("#a855f7", 0.18); }
    else { SFX.plus(); ring(p.x, p.y - 60, "#93c5fd", 260, 0.5, 14); shake(0.2); }
    if (exact) { banner(`딱 ${e.target}! 대단해!`, "#facc15"); burst(p.x, p.y - 60, 80, ["#fde047", "#fff", "#facc15"], 11, 1.2, "star"); SFX.fanfare(); flash("#facc15", 0.2); }
    text(`${o.op}${o.v}`, p.x, p.y - 120, 64, "#fff", 0.9, -90);
    text(`+${gain}점`, W - 110, 120, 30, "#fde047", 0.9, -40);
    if (S.streak >= 3) text(`${S.streak}연속!`, W / 2, 230, 44 + Math.min(30, S.streak * 2), "#fb923c", 1.0, -30);
  } else {
    if (S.shields > 0 && S.streak > 0) { S.shields--; banner(`방패가 ${S.streak}연속을 지켰어!`, "#7dd3fc"); ring(p.x, p.y - 60, "#7dd3fc", 300, 0.6, 18); }
    else S.streak = 0;
    SFX.soft();
    burst(p.x, p.y - 40, 20, ["#e7e5e4", "#a8a29e"], 4, 0.7);
    text(`${o.op}${o.v} 앗!`, p.x, p.y - 120, 48, "#fecaca", 0.9);
    const best = e.opts[1 - side];
    text(`${best.op}${best.v} 쪽이 ${other}이었어`, W / 2, 330, 26, "#fff", 1.6, -20);
  }
  updateMusicLayers();
  setCount(mine, gx, 80);
  if (e.spawnT != null) regenFar();
  if (S.tut && e.easy && e.gateIdx >= 1) { S.tut = false; lsSet("tp_tut_done", "1"); }
  if (S.count <= 0) rescue();
  return ok;
}
function castOf(id) { return ED.cast.find(c => c.id === id) || ED.cast[0]; }
function rescuer() {
  if (ED.id !== "hub") return { name: castOf(ED.hero).name, front: ED.heroFront };
  const c = ED.cast.find(x => x.id !== S.kid) || ED.cast[0];
  return { name: c.name, front: `${c.id}_run_front` };
}
function rescue() {
  setCount(AGE[S.age].start, S.cx, 300);
  const r = rescuer(); S.rescueImg = r.front;
  banner(`${josa(r.name, "이가", "가")} 친구들을 데리고 왔어!`, "#93c5fd"); SFX.fanfare(); S.rescueT = 1.6; SFX.bark(0); SFX.bark(0.15);
}

// ---------- 갱신 ----------
let keys = {};
function update(dt) {
  S.t += dt;
  if (S.flashA > 0) S.flashA = Math.max(0, S.flashA - dt * 1.2);
  S.shake = Math.max(0, S.shake - dt * 1.8);
  if (S.bannerT > 0) S.bannerT -= dt;
  if (S.rescueT > 0) S.rescueT -= dt;
  if (S.stormT > 0) { S.stormT -= dt; S.stormRain -= dt; if (S.stormRain <= 0 && S.mode === "run") { S.stormRain = 0.3; rain(5, STORM_IMGS(), -40); } }
  if (S.comboT > 0) S.comboT -= dt; else S.combo = 0;
  for (const e of S.ev) if (e.flashT > 0) e.flashT -= dt * 1.5;
  if (S.boss && S.boss.gate && S.boss.gate.flashT > 0) S.boss.gate.flashT -= dt * 1.5;
  // 조종
  if (keys.ArrowLeft || keys.ArrowRight) S.lastMoveT = S.t;
  if (keys.ArrowLeft) S.tx -= dt * 2.4; if (keys.ArrowRight) S.tx += dt * 2.4;
  if (AUTO || S.demo) autoplay();
  S.tx = clamp(S.tx, -0.85, 0.85);
  S.cx += (S.tx - S.cx) * Math.min(1, dt * 12);

  // 강아지 움직임
  for (const d of S.dogs) {
    const sl = slot(d.i);
    d.ox += (sl.x - d.ox) * Math.min(1, dt * 5); d.oz += (sl.z - d.oz) * Math.min(1, dt * 5);
    d.sc += (1 - d.sc) * Math.min(1, dt * 8);
    if (d.vy || d.y) { d.y += d.vy * dt * 60; d.vy -= dt * 14; if (d.y < 0) { d.y = 0; d.vy = 0; } }
    d.ph += dt * 16;
  }
  S.shown += (S.count - S.shown) * Math.min(1, dt * 10);

  if (S.mode === "run") updateRun(dt);
  else if (S.mode === "boss") updateBoss(dt);
  else if (S.mode === "end") { S.resultT += dt; if (S.resultT > 3.6 && !S.resultShown) showResult(); }

  // 입자
  for (const p of S.parts) {
    p.vy += p.g * dt; p.x += p.vx * dt; p.y += p.vy * dt; p.rot += p.vr * dt; p.life -= dt;
    if (p.bounce && p.y > H - 60 && p.vy > 0) { p.vy *= -0.45; p.y = H - 60; p.bounce--; }
  }
  S.parts = S.parts.filter(p => p.life > 0 && p.y < H + 80);
  for (const t of S.texts) { t.y += t.vy * dt; t.life -= dt; }
  S.texts = S.texts.filter(t => t.life > 0);
  for (const r of S.rings) r.life -= dt;
  S.rings = S.rings.filter(r => r.life > 0);
}

function updateRun(dt) {
  if (S.demo && S.d > S.end - 2600) { newGame(7, true, S.stage); return; } // 첫 화면: 대장 앞에서 처음부터 다시
  let f = 1, think = false;
  for (const e of S.ev) {
    if (e.done) continue;
    const z = e.p - S.d;
    if (!e.spawned && z < SPAWN) spawnEv(e);
    if (!e.spawned) continue;
    if ((e.type === "gate" || e.type === "target") && z < 900 && z > 120) { think = true; }
    if ((e.type === "gate" || e.type === "target") && z <= 0) passGate(e);
    if (e.type === "swarm" && z <= 70 && !S.battle) { S.battle = { e, tick: 0 }; banner("돌격!", "#fb7185"); SFX.whoosh(); }
    if (e.type === "boss" && z <= BOSS_Z) { startBoss(e); return; }
  }
  if (think) f = S.demo ? 0.7 : AGE[S.age].slow; // 생각 시간: 5살 약 4초, 6살 3.5초, 7살+ 3초
  music.duck = think ? 0.55 : 1;
  if (S.battle) { f = 0.12; battleTick(dt); }
  if (S.stormT > 0 && !think && !S.battle) f *= 1.35; // 폭풍: 생각 구간 밖에서만 빨라짐
  S.speed += (V * f - S.speed) * Math.min(1, dt * 4);
  S.d += S.speed * dt;
}
// 문은 '다 맞힌다'고 예측한 수로 미리 만든다. 틀려서 실제 수가 달라지면, 아직 먼(생각 구간 전) 문을 실제 수로 다시 만든다.
function regenFar() {
  const far = S.ev.filter(x => x.spawned && !x.done && x.opts && (x.type === "gate" || x.type === "target") && x.p - S.d > 950).sort((a, b) => a.p - b.p);
  for (const x of far) {
    const keep = [x.opts, x.target]; x.opts = null; x.target = undefined;
    if (projected() === x.genC) { [x.opts, x.target] = keep; continue; }
    const keepTier = x.genTier; spawnEv(x); x.genTier = keepTier;
  }
}
function spawnEv(e) {
  e.spawned = true;
  e.spawnT = S.t; e.genTier = S.tier;
  if (e.type === "gate") {
    const c = projected();
    e.genC = c;
    const idx = e.gateIdx ?? (e.gateIdx = S.gateIdx++);
    if (!S.demo && idx < 2 && (e.opts = easyPair(c, S.age))) { e.easy = true; }
    else if (S.demo) { e.opts = c <= 60 ? [op("×", 2), op("+", ri(3, 9))] : [op("−", ri(10, 30)), op("+", ri(3, 9))]; if (Math.random() < 0.5) e.opts.reverse(); } // 첫 화면 시연: 확 불어나는 장면
    else if (Math.random() < TARGET_P[S.tier]) { const g = genTarget(c, S.age); e.opts = g.opts; e.target = g.target; }
    else {
      const trap = S.trapLeft > 0 && Math.random() < 0.45, opts = genPair(c, S.age, trap, 1, S.tier >= 1);
      if (opts) { e.opts = opts; if (trap) S.trapLeft--; }
      else { const g = genTarget(c, S.age); e.opts = g.opts; e.target = g.target; }
    }
  } else if (e.type === "target") {
    const c = projected(); e.genC = c; const g = genTarget(c, S.age); e.opts = g.opts; e.target = g.target;
  } else if (e.type === "swarm") {
    const c = projected(); e.n = S.age === 8 && c > 12 ? c - ri(4, 9) : S.age >= 9 && !S.demo ? Math.max(10, Math.round(c * 0.055) * 10) : Math.max(2, Math.round(c * STG().swarm)); if (e.n >= c) e.n = Math.max(1, c - 2); e.left = e.n;
    e.veg = []; const shown = Math.min(e.n, 60), cols = Math.min(8, Math.max(3, Math.ceil(Math.sqrt(shown * 2))));
    for (let i = 0; i < shown; i++) e.veg.push({ x: ((i % cols) - (cols - 1) / 2) * (1.7 / Math.max(cols, 4)), z: Math.floor(i / cols) * 70, k: i % 3, ph: Math.random() * 6, alive: true });
  }
}
function battleTick(dt) {
  const b = S.battle, e = b.e;
  b.tick -= dt;
  if (b.tick > 0) return;
  b.tick = 0.045;
  const k = Math.max(1, Math.ceil(Math.min(S.count, e.left) / 18));
  for (let j = 0; j < k && e.left > 0 && S.count > 0; j++) {
    e.left--; S.combo++; S.comboT = 1.2; S.score += 1;
    const alive = e.veg.filter(v => v.alive);
    const shownLeft = Math.min(alive.length, Math.ceil(e.left * e.veg.length / e.n));
    let v = null;
    if (alive.length > shownLeft) { v = alive[0]; v.alive = false; }
    const zz = e.p - S.d + (v ? v.z : 0), p = proj(v ? v.x : S.cx + rand(-0.4, 0.4), Math.max(zz, 5));
    // 팝콘처럼 터지고 맛있는 요리로 변신
    burst(p.x, p.y - 20, 10, ["#fff", "#fef3c7", "#fde047"], 5, 0.6, "pop");
    S.parts.push({ kind: "img", x: p.x, y: p.y - 20, vx: rand(-160, 160), vy: rand(-620, -420), g: 900, life: 1.1, max: 1.1, img: goodImg(v ? v.k : ri(0, 2)), r: 40, rot: 0, vr: rand(-6, 6) });
    SFX.pop(S.combo % 25);
    setCount(S.count - 1);
  }
  if (S.combo > 0 && S.combo % 10 === 0) text(`콤보 ${S.combo}!`, W / 2, 400, Math.min(84, 40 + S.combo), "#fde047", 0.6, -60);
  shake(0.06);
  if (e.left <= 0 || S.count <= 0) {
    e.done = true; S.battle = null;
    if (S.count > 0) { banner("싹쓸이!", "#facc15"); confetti(80); SFX.fanfare(); S.score += 20; vib(40); }
    else rescue();
  }
}

// ---------- 대장전 ----------
function startBoss(e) {
  e.done = true; S.mode = "boss"; S.speed = 0;
  S.boss = { hp: 1, phase: 0, t: 0, throwT: 1.5, throws: 0, noteT: 0, x: 0, hitT: 0, shield: 0, gate: null, charge: 0, dead: false, intro: 2.2, ultT: -1 };
  banner(STG().bossName, "#f87171"); SFX.boom(); shake(0.6); flash("#7f1d1d", 0.3);
  updateMusicLayers(); music.bpm = 140;
}
const BOSS_Z = 380;
function bossPos() { const b = S.boss; return proj(b.x + Math.sin(S.t * 1.3) * 0.15, BOSS_Z); }
function updateBoss(dt) {
  const b = S.boss; b.t += dt; b.hitT = Math.max(0, b.hitT - dt);
  music.duck = 1;
  if (b.intro > 0) { b.intro -= dt; if (b.intro <= 0) { b.phase = 1; banner("피하면서 멍멍!", "#fde047"); } return; }
  // 멍멍 음표 공격
  if (b.phase === 1 || b.phase === 2) {
    b.noteT -= dt;
    if (b.noteT <= 0 && S.dogs.length) {
      b.noteT = 0.11;
      const d = pick(S.dogs), p = proj(S.cx + d.ox, d.oz);
      S.notes.push({ x: p.x, y: p.y - 30, t: 0, T: 0.55, sx: p.x, sy: p.y - 30 });
      if (Math.random() < 0.12) SFX.bark();
    }
  }
  for (const n of S.notes) {
    n.t += dt; const bp = bossPos(), k = n.t / n.T;
    n.x = n.sx + (bp.x - n.sx) * k; n.y = n.sy + (bp.y - 120 - n.sy) * k - Math.sin(k * Math.PI) * 80;
    if (k >= 1) {
      n.dead = true;
      if (b.phase === 2) burst(n.x, n.y, 3, ["#a5f3fc", "#fff"], 2, 0.3);
      else { b.hp = Math.max(b.phase === 1 ? 0.72 : 0, b.hp - 0.004 * (1 + S.count / 80) * (1 + 0.2 * (S.up.ult || 0))); b.hitT = 0.08; burst(n.x, n.y, 4, ["#fde047", "#fb923c", "#fff"], 3, 0.35); }
    }
  }
  S.notes = S.notes.filter(n => !n.dead);
  if (b.phase === 1) {
    b.throwT -= dt;
    if (b.throwT <= 0 && b.throws < STG().throws) {
      b.throwT = 1.25; b.throws++;
      S.balls.push({ tx: clamp(S.cx + rand(-0.25, 0.25), -0.85, 0.85), t: 0, T: 1.15, k: ri(0, 2), fx: b.x });
      SFX.whoosh();
    }
    for (const ball of S.balls) {
      ball.t += dt;
      if (ball.t >= ball.T && !ball.hit) {
        ball.hit = true; const p = proj(ball.tx, 0);
        if (Math.abs(S.cx - ball.tx) < 0.24) {
          const lose = Math.max(1, Math.round(S.count * 0.06)); setCount(S.count - lose);
          burst(p.x, p.y - 20, 30, ["#22c55e", "#86efac", "#f97316"], 6, 0.8); shake(0.35); SFX.soft();
          text(`으앗! -${lose}`, p.x, p.y - 80, 40, "#fecaca"); S.streak = 0; updateMusicLayers();
          if (S.count <= 0) rescue();
        } else { text("휙! 피했다", p.x, p.y - 80, 32, "#bbf7d0", 0.8); S.score += 5; SFX.ding(2); burst(p.x, p.y - 10, 12, ["#bbf7d0", "#fff"], 4, 0.5, "star"); }
      }
    }
    S.balls = S.balls.filter(x => x.t < x.T + 0.05);
    if (b.throws >= STG().throws && !S.balls.length) startShield();
  } else if (b.phase === 2) {
    const g = b.gate;
    if (g && !g.done) {
      g.z -= dt * 150; const think = g.z > 90;
      music.duck = think ? 0.55 : 1;
      if (g.z <= 0) { passGate(g, 1); b.charge = 0.0001; }
    }
    if (b.charge > 0) {
      b.charge += dt; S.crowdZ = Math.sin(Math.min(1, b.charge / 0.9) * Math.PI) * (BOSS_Z - 60);
      if (b.charge >= 0.45 && !b.chargeHit) {
        b.chargeHit = true; const bp = bossPos();
        if (S.count > b.shield) {
          S.hitstop = 0.22; shards(bp.x, bp.y - 60, 320, 300, 140); SFX.shatter(); SFX.boom(); shake(0.8); vib(80);
          ring(bp.x, bp.y - 120, "rainbow", 520, 0.9, 30); flash("#38bdf8", 0.25);
          b.hp = Math.min(b.hp, 0.38); b.hitT = 0.3; b.shield = 0; S.score += 50;
          banner("방패 와장창!", "#7dd3fc"); b.next = 3;
        } else {
          b.shield -= Math.floor(S.count / 2); shake(0.3); SFX.soft();
          banner(`방패에 금이 갔어! ${b.shield}보다 많게!`, "#fde68a"); b.next = 2;
        }
      }
      if (b.charge >= 0.9) {
        b.charge = 0; S.crowdZ = 0; b.chargeHit = false;
        if (b.next === 3) startUlt(); else newShieldGate();
      }
    }
  } else if (b.phase === 3) {
    if (b.ultT < 0) { S.ultGauge = Math.min(1, S.ultGauge + dt / (1.2 / (1 + 0.25 * (S.up.ult || 0)))); S.ultBtn = S.ultGauge >= 1; if (AUTO && S.ultBtn && b.t > 1) fireUlt(); }
    else ultTick(dt);
  }
}
function startShield() {
  const b = S.boss; b.phase = 2; S.balls = [];
  newShieldGate();
}
function newShieldGate() {
  const b = S.boss, c = S.count;
  const opts = genPair(c, S.age, false, S.age <= 8 ? 1 : 1.6), rs = opts.map(o => applyOp(o, c));
  const hi = Math.max(...rs), lo = Math.min(...rs);
  b.shield = lo + Math.floor((hi - lo) / 2);
  if (b.shield < 1) b.shield = 1;
  b.gate = { opts, z: BOSS_Z - 40, done: false, shieldGate: true };
  banner(`숫자 방패 ${b.shield}! 더 많아져라!`, "#7dd3fc"); SFX.whoosh();
}
function startUlt() {
  const b = S.boss; b.phase = 3; b.t = 0; S.ultGauge = 0;
  banner("필살기 준비!", "#fde047"); SFX.ding(0);
}
function fireUlt() {
  const b = S.boss; if (b.ultT >= 0) return;
  b.ultT = 0; S.ultBtn = false; S.jump = 1;
  for (const d of S.dogs) d.vy = rand(5, 8);
  for (let i = 0; i < 8; i++) SFX.bark(i * 0.07);
  banner(ED.id === "hub" ? `${castOf(S.kid).name} 필살기!` : ED.ultName, "#93c5fd");
  if (ED.id === "hub") { // 아이마다 자기 스킬 외침(허브 공용 KidVoices)
    try { const v = castOf(S.kid).voice; if (v && window.KidVoices) KidVoices.shout(v, AC ? { ctx: AC, out: master, force: true, reason: "ult" } : { force: true, reason: "ult" }); } catch (e) {}
  }
}
function ultTick(dt) {
  const b = S.boss; const prev = b.ultT; b.ultT += dt;
  const bp = bossPos();
  if (b.ultT > 0.35 && b.ultT < 1.5) {
    b.hp = Math.max(0, b.hp - dt * 0.38); b.hitT = 0.2; shake(0.12);
    if (Math.random() < 0.6) burst(bp.x + rand(-80, 80), bp.y - rand(40, 200), 6, ["#fde047", "#fff", "#fb923c"], 6, 0.5, "star");
    if (prev <= 0.35) { SFX.mult(); ring(W / 2, CROWD_Y - 40, "#fde047", 500, 0.7, 30); }
  }
  if (prev < 1.5 && b.ultT >= 1.5) {
    b.hp = 0; b.dead = true; S.slow = 0.25; S.slowT = 0.9; S.hitstop = 0.12;
    SFX.boom(); SFX.boom(); shake(1); vib(150);
    for (let i = 0; i < 5; i++) ring(bp.x, bp.y - 120, i % 2 ? "#fde047" : "rainbow", 300 + i * 120, 1 + i * 0.15, 24);
    burst(bp.x, bp.y - 120, 160, ["#fde047", "#fb923c", "#f43f5e", "#22c55e", "#fff"], 14, 1.6, "star");
    flash("#fb923c", 0.3); S.score += 100;
  }
  if (prev < 2.1 && b.ultT >= 2.1) {
    banner(STG().win, "#facc15"); SFX.fanfare(); confetti(160);
    rain(36, TREATS.filter(i => i.complete && i.naturalWidth)); rain(30, goodList());
  }
  if (b.ultT >= 2.6 && S.mode !== "end") { S.mode = "end"; S.resultT = 0; music.bpm = 128; }
}

// ---------- 결과 ----------
const $ = id => document.getElementById(id);
// 스티커: 별 1개 = 새 스티커 1장 (판마다 확실히 받음). 다 모으면 '완성' 표시.
const STICKERS = [
  ...ED.cast.map(c => [c.id, c.sticker, c.name]),
  ["cheeseball", "art/g/dish_broccoli_cheeseball.webp", "브로콜리 치즈볼"], ["carrotcake", "art/g/dish_carrot_cake.webp", "당근 케이크"], ["eggpizza", "art/g/dish_eggplant_pizza.webp", "가지 피자"],
  ["t1", "art/treat1.webp", "간식 1"], ["t2", "art/treat2.webp", "간식 2"], ["t3", "art/treat3.webp", "간식 3"], ["t4", "art/treat4.webp", "간식 4"],
  ["pizza", "art/g/boss_pizza.webp", "대왕 피자"], ["pot", "art/g/boss_pot.webp", "편식 대마왕"],
  ["g_bath", "art/g/good_bath.webp", "반짝 오리"], ["b_bath", "art/g/boss_bath.webp", "거품 대왕"],
  ["g_bed", "art/g/good_bed.webp", "꿈나라 별"], ["b_bed", "art/g/boss_bed.webp", "악몽 구름"],
  ["g_teeth", "art/g/good_teeth.webp", "반짝 이"], ["b_teeth", "art/g/boss_teeth.webp", "충치 대장"],
  ["g_toys", "art/g/good_toys.webp", "장난감 상자"], ["b_toys", "art/g/boss_toys.webp", "산더미 괴물"],
];
function bookGet() { try { return JSON.parse(lsGet("tp_book_" + ED.id) || "[]"); } catch (e) { return []; } }
function awardStickers(n) {
  const own = bookGet(), got = [];
  for (let i = 0; i < n; i++) { const left = STICKERS.filter(x => !own.includes(x[0])); if (!left.length) break; const pickd = pick(left); own.push(pickd[0]); got.push(pickd); }
  lsSet("tp_book_" + ED.id, JSON.stringify(own)); lsSet("tp_stars", String((+lsGet("tp_stars") || 0) + n));
  return { got, own: own.length };
}
function renderBook() {
  const own = bookGet();
  $("bookGrid").innerHTML = STICKERS.map(([id, src, name]) => `<div class="stk${own.includes(id) ? " own" : ""}"><img src="${src}" alt=""><span>${own.includes(id) ? name : "?"}</span></div>`).join("");
  $("bookCount").textContent = `${own.length} / ${STICKERS.length}`;
  $("bookBtnN").textContent = `${own.length}/${STICKERS.length}`;
}
function showResult() {
  S.resultShown = true;
  const ratio = S.total ? S.correct / S.total : 0, stars = ratio >= 0.8 ? 3 : ratio >= 0.5 ? 2 : 1;
  const aw = awardStickers(stars), box = $("newStk");
  // 코인: 정답 2 + 별 5 + 처음 깬 판 20. 별 2개 이상이면 다음 스테이지 열림
  const firstClear = stars >= 2 && unlocked() === S.stage && S.stage < STAGES.length - 1;
  const earn = S.correct * 2 + stars * 5 + (firstClear ? 20 : 0);
  lsSet(KEY("coin"), String(coins() + earn));
  if (firstClear) lsSet(KEY("stage"), String(S.stage + 1));
  const nxt = STAGES[S.stage + 1], canNext = nxt && unlocked() > S.stage;
  $("next").classList.toggle("hide", !canNext); if (canNext) $("next").textContent = `다음: ${nxt.icon} ${nxt.name} ▶`;
  $("rtitle").textContent = STG().win;
  $("coinGain").innerHTML = `${ED.coin.icon} +${earn} <small>(모은 ${ED.coin.name} ${coins()})</small>` + (firstClear ? `<div class="unlock">새 스테이지 열림! ${nxt.icon} ${nxt.name}</div>` : stars < 2 && S.stage < STAGES.length - 1 && unlocked() === S.stage ? `<div class="unlock dim">별 2개면 다음 스테이지가 열려요</div>` : "");
  if (firstClear) setTimeout(() => { SFX.fanfare(); confetti(80); }, 2600);
  box.innerHTML = aw.got.length ? `<div class="nlab">새 스티커!</div>` + aw.got.map(([, src, name], i) => `<div class="nst" style="animation-delay:${1.9 + i * 0.35}s"><img src="${src}" alt=""><span>${name}</span></div>`).join("")
    : `<div class="nlab">스티커북 완성! ⭐ +${stars}</div>`;
  aw.got.forEach((_, i) => setTimeout(() => { SFX.ding(7 + i * 2); confetti(20); }, 1900 + i * 350));
  renderBook();
  $("result").classList.remove("hide");
  $("rinfo").textContent = `문 ${S.total}개 중 ${S.correct}개 정답 · 최고 ${S.best}연속`;
  const els = [...document.querySelectorAll(".star")];
  els.forEach(e => e.className = "star");
  els.forEach((e, i) => setTimeout(() => { e.classList.add("slam"); if (i < stars) { e.classList.add("on"); SFX.slam(i); shake(0.4); confetti(30); } else SFX.soft(); }, 400 + i * 450));
  const sc = $("score"); let shown = 0; const target = S.score, t0 = performance.now();
  (function up() { const k = Math.min(1, (performance.now() - t0) / 1400); shown = Math.round(target * (1 - Math.pow(1 - k, 3))); sc.textContent = shown + "점"; if (k < 1) requestAnimationFrame(up); else SFX.ding(5); })();
  window.__TP_RESULT = { stars, score: S.score, correct: S.correct, total: S.total, count: S.count };
}

// ---------- 그리기 ----------
function drawBG() {
  const st = STG(), bgi = ART[st.id === "table" ? "bg_room" : `bg_${st.id}`], L = st.light.join(",");
  if (bgi) { // 그록 배경: 아래 띠가 바닥 수평선에 오게
    const h = W / bgi.width * bgi.height, y = HOR + 14 - h;
    if (y > 0) { ctx.fillStyle = st.sky[0]; ctx.fillRect(0, 0, W, y + 1); }
    ctx.drawImage(bgi, 0, y, W, h);
  } else {
    const g = ctx.createLinearGradient(0, 0, 0, HOR);
    g.addColorStop(0, st.sky[0]); g.addColorStop(1, st.sky[1]); ctx.fillStyle = g; ctx.fillRect(0, 0, W, HOR + 2);
  }
  // 전등 빛 + 떠다니는 빛망울
  const lg = ctx.createRadialGradient(W / 2, 40, 10, W / 2, 40, 460);
  lg.addColorStop(0, `rgba(${L},.38)`); lg.addColorStop(1, `rgba(${L},0)`); ctx.fillStyle = lg; ctx.fillRect(0, 0, W, H);
  for (let i = 0; i < 16; i++) { const x = (i * 97 + S.t * 14) % W, y = 30 + (i * 53) % (HOR - 40); ctx.fillStyle = `rgba(${L},${0.06 + 0.05 * Math.sin(S.t * 2 + i)})`; ctx.beginPath(); ctx.arc(x, y, 6 + (i % 4) * 4, 0, 7); ctx.fill(); }
}
// 체크 식탁보 3색(빨강·분홍·크림) = 그록 cloth_tile 색
const CLOTH = ["#f2ecdf", "#e4908c", "#d02a2a"];
let clothPat = null;
function drawTable() {
  const st = STG(), CL = st.floor, F = st.fog.join(","), TW = 1.6, near = -160, far = 2600, step = 90, off = S.d % (step * 2);
  // 식탁 옆면(두께)과 아래 그림자
  const a = proj(-TW, far), b = proj(TW, far), c = proj(TW * 1.08, near), d = proj(-TW * 1.08, near);
  if (st.ground) { const gg = ctx.createLinearGradient(0, HOR, 0, H); gg.addColorStop(0, `rgba(${F},1)`); gg.addColorStop(0.35, st.ground); gg.addColorStop(1, st.ground); ctx.fillStyle = gg; ctx.fillRect(0, HOR, W, H - HOR); }
  ctx.fillStyle = st.side; ctx.beginPath(); ctx.moveTo(a.x - 8, a.y); ctx.lineTo(b.x + 8, b.y); ctx.lineTo(c.x + 40, H); ctx.lineTo(d.x - 40, H); ctx.fill();
  const tl = proj(-TW, far), tr = proj(TW, far), br = proj(TW, near), bl = proj(-TW, near);
  ctx.save(); ctx.beginPath(); ctx.moveTo(tl.x, tl.y); ctx.lineTo(tr.x, tr.y); ctx.lineTo(br.x, br.y); ctx.lineTo(bl.x, bl.y); ctx.closePath(); ctx.clip();
  for (let z = far; z > near - step; z -= step) {
    const z0 = z - off, z1 = z0 + step; if (z1 < near) continue;
    const row = Math.round((z0 + S.d) / step);
    for (let i = 0; i < 8; i++) {
      const x0 = -TW + i * TW / 4, x1 = x0 + TW / 4;
      const p0 = proj(x0, z0), p1 = proj(x1, z0), p2 = proj(x1, z1), p3 = proj(x0, z1);
      ctx.fillStyle = CL[(row & 1) + (i & 1)];
      ctx.beginPath(); ctx.moveTo(p0.x, p0.y); ctx.lineTo(p1.x, p1.y); ctx.lineTo(p2.x, p2.y); ctx.lineTo(p3.x, p3.y); ctx.fill();
    }
  }
  // 천 결(그록 타일을 아주 옅게) + 조명 웅덩이 + 가장자리 어둡게
  if (ART.cloth_tile && !clothPat) clothPat = ctx.createPattern(ART.cloth_tile, "repeat");
  if (clothPat && st.id === "table") { ctx.globalAlpha = 0.1; ctx.globalCompositeOperation = "multiply"; ctx.fillStyle = clothPat; ctx.fillRect(0, HOR, W, H - HOR); ctx.globalCompositeOperation = "source-over"; ctx.globalAlpha = 1; }
  const pool = ctx.createRadialGradient(W / 2, H * 0.62, 40, W / 2, H * 0.62, H * 0.62);
  pool.addColorStop(0, "rgba(255,236,190,.22)"); pool.addColorStop(0.6, "rgba(255,236,190,0)"); pool.addColorStop(1, "rgba(40,10,0,.28)");
  ctx.fillStyle = pool; ctx.fillRect(0, HOR, W, H - HOR);
  ctx.restore();
  // 식탁보 앞 단(주름 띠)
  ctx.strokeStyle = st.edge; ctx.lineWidth = 6; ctx.beginPath(); ctx.moveTo(tl.x, tl.y); ctx.lineTo(bl.x, bl.y); ctx.moveTo(tr.x, tr.y); ctx.lineTo(br.x, br.y); ctx.stroke();
  // 먼 쪽 안개
  const fg = ctx.createLinearGradient(0, HOR, 0, HOR + 120); fg.addColorStop(0, `rgba(${F},1)`); fg.addColorStop(1, `rgba(${F},0)`);
  ctx.fillStyle = fg; ctx.fillRect(0, HOR - 2, W, 122);
  // 가장자리 소품: 그록 그림 (접시·촛대·주스·소금통)
  const PS = 520, poff = S.d % PS, PROPS = st.props.map(p => p[0]), PH = Object.fromEntries(st.props), NP = PROPS.length;
  for (let z = 2400 - poff; z > -220; z -= PS) {
    const k = Math.round((z + S.d) / PS);
    for (const sx of [-1, 1]) {
      const p = proj(sx * 1.36, z); if (p.y > H + 80) continue; const s = p.s;
      const name = PROPS[(k + (sx > 0 ? (NP > 2 ? 2 : 1) : 0)) % NP], im = ART[name];
      ctx.fillStyle = "rgba(60,0,0,.22)"; ctx.beginPath(); ctx.ellipse(p.x, p.y, 46 * s, 14 * s, 0, 0, 7); ctx.fill();
      if (im) drawFit(im, p.x, p.y + 4 * s, PH[name] * 1.25 * s);
      if (name === "prop_candle" || name === "prop_bed_lamp") { const fl = 1 + Math.sin(S.t * 18 + k) * 0.15; ctx.fillStyle = "rgba(255,200,90,.22)"; ctx.beginPath(); ctx.arc(p.x, p.y - 128 * s, 54 * s * fl, 0, 7); ctx.fill(); }
    }
  }
}
function drawPicOp(o, cx, cy, sc) {
  const n = o.v, sz = 62 * sc, gap = 6 * sc, w = n * sz + (n - 1) * gap, signW = 54 * sc;
  const x0 = cx - (w + signW) / 2;
  ctx.font = `${Math.round(90 * sc)}px ${FONT}`; ctx.textAlign = "center"; ctx.textBaseline = "middle";
  ctx.lineWidth = Math.max(2, 10 * sc); ctx.strokeStyle = "#1e1b4b"; ctx.strokeText(o.op, x0 + signW / 2, cy);
  ctx.fillStyle = o.op === "+" ? "#fde047" : "#fb7185"; ctx.fillText(o.op, x0 + signW / 2, cy);
  for (let i = 0; i < n; i++) {
    const im = TREATS[i % TREATS.length], x = x0 + signW + i * (sz + gap), bob = Math.sin(S.t * 6 + i) * 3 * sc;
    ctx.globalAlpha *= o.op === "−" ? 0.6 : 1;
    if (im && im.complete && im.naturalWidth) ctx.drawImage(im, x, cy - sz / 2 + bob, sz, sz);
    else { ctx.fillStyle = "#fbbf24"; ctx.beginPath(); ctx.arc(x + sz / 2, cy + bob, sz * 0.4, 0, 7); ctx.fill(); }
    if (o.op === "−") { ctx.globalAlpha /= 0.6; ctx.strokeStyle = "#e11d48"; ctx.lineWidth = Math.max(2, 7 * sc); ctx.beginPath(); ctx.moveTo(x + 6 * sc, cy + sz / 2 - 6 * sc + bob); ctx.lineTo(x + sz - 6 * sc, cy - sz / 2 + 6 * sc + bob); ctx.stroke(); }
  }
}
function drawGate(e, z) {
  if (z < -60 || z > SPAWN + 200) return;
  const fade = clamp((SPAWN + 100 - z) / 400, 0, 1);
  const pulse = z < 900 && z > 120 ? 1 + Math.sin(S.t * 10) * 0.04 : 1;
  for (let side = 0; side < 2; side++) {
    if (e.done && e.chosen === side) continue;
    const x0 = side === 0 ? -0.96 : 0.04, x1 = side === 0 ? -0.04 : 0.96;
    const a = proj(x0, z), b = proj(x1, z), hpx = 190 * a.s * pulse;
    let alpha = fade * (e.done ? Math.max(0, e.flashT || 0) : 1);
    if (alpha <= 0) continue;
    ctx.globalAlpha = alpha;
    if (ART.gate_frame) { // 그록 전구 문틀: 문 폭에 맞춰 늘림, 생각 구간엔 반짝
      const fw = (b.x - a.x) * 1.04, fh = hpx * 1.12, fx = (a.x + b.x) / 2 - fw / 2, fy = a.y - fh;
      ctx.fillStyle = "rgba(0,0,0,.25)"; ctx.beginPath(); ctx.ellipse((a.x + b.x) / 2, a.y, fw * 0.5, 10 * a.s, 0, 0, 7); ctx.fill();
      ctx.drawImage(ART.gate_frame, fx, fy, fw, fh);
      if (pulse > 1) { ctx.save(); ctx.globalCompositeOperation = "lighter"; ctx.globalAlpha = alpha * (0.18 + Math.sin(S.t * 10) * 0.12); ctx.drawImage(ART.gate_frame, fx, fy, fw, fh); ctx.restore(); }
    } else {
      const g = ctx.createLinearGradient(0, a.y - hpx, 0, a.y);
      g.addColorStop(0, "rgba(96,165,250,.75)"); g.addColorStop(1, "rgba(129,140,248,.55)");
      ctx.fillStyle = g; ctx.fillRect(a.x, a.y - hpx, b.x - a.x, hpx);
      ctx.strokeStyle = "#facc15"; ctx.lineWidth = Math.max(2, 10 * a.s); ctx.strokeRect(a.x, a.y - hpx, b.x - a.x, hpx);
    }
    const o = e.opts[side];
    if (S.age === 5 && !S.demo && (o.op === "+" || o.op === "−")) drawPicOp(o, (a.x + b.x) / 2, a.y - hpx / 2, a.s);
    else {
      const good = o.op === "×" ? ["#fff8d6", "#ffd23f", "#ff9f1c"] : o.op === "÷" || o.op === "−" ? ["#ffffff", "#ffd1dc", "#ff6b8b"] : ["#ffffff", "#c8f7ff", "#5ad1ff"];
      gtext(`${o.op}${o.v}`, (a.x + b.x) / 2, a.y - hpx / 2, 100 * a.s, { c1: good[0], c2: good[1], c3: good[2], max: (b.x - a.x) * 0.66 });
    }
    ctx.globalAlpha = 1;
  }
  if (!e.done && (e.target != null || e.shieldGate)) {
    const p = proj(0, z), label = e.target != null ? `딱 ${e.target} 만들기!` : `${S.boss.shield}보다 많게!`;
    ctx.globalAlpha = fade; gtext(label, p.x, p.y - 232 * p.s, 64 * p.s, { c1: "#fffbe0", c2: "#ffd23f", c3: "#ff8a00", stroke: "#5a1a00" }); ctx.globalAlpha = 1;
  }
}
function drawSwarm(e, z) {
  if (z < -400 || z > SPAWN + 200 || e.done) return;
  const fade = clamp((SPAWN + 100 - z) / 400, 0, 1); ctx.globalAlpha = fade;
  const vs = e.veg.filter(v => v.alive).sort((a, b) => b.z - a.z);
  for (const v of vs) {
    const p = proj(v.x, Math.max(z + v.z, -100)), s = p.s * 1.25, hop = Math.abs(Math.sin(S.t * 8 + v.ph)) * 10 * s;
    drawFit(foeImg(v.k), p.x, p.y + 4 * s - hop, 80 * s);
  }
  const p = proj(0, Math.max(z, -100));
  gtext(String(e.left), p.x, p.y - 190 * p.s, 84 * p.s, { c1: "#f0fff0", c2: "#86efac", c3: "#16a34a", stroke: "#0b3d1e" });
  ctx.globalAlpha = 1;
}
function drawDogs() {
  const list = S.dogs.map(d => ({ d, z: d.oz + S.crowdZ })).sort((a, b) => b.z - a.z);
  for (const { d, z } of list) {
    const p = proj(S.cx + d.ox, z), s = p.s * 0.9 * d.sc;
    const bob = Math.abs(Math.sin(d.ph)) * 5 * s;
    const img = DOG[d.b][Math.sin(d.ph) > 0 ? 1 : 0];
    ctx.fillStyle = "rgba(0,0,0,.18)"; ctx.beginPath(); ctx.ellipse(p.x, p.y, 16 * s, 6 * s, 0, 0, 7); ctx.fill();
    if (img instanceof HTMLImageElement) drawFit(img, p.x, p.y + 4 * s - bob - d.y * 6 * s, 76 * s * (ED.cast[d.b].scale || 1));
    else ctx.drawImage(img, p.x - 32 * s, p.y - 60 * s - bob - d.y * 6 * s, 64 * s, 64 * s);
  }
  // 수 표시
  const p = proj(S.cx, S.crowdZ + 40);
  const n = Math.round(S.shown), big = 1 + Math.min(0.5, Math.abs(S.count - S.shown) * 0.05);
  ctx.save(); ctx.translate(p.x, p.y - 150 * p.s); ctx.scale(big, big);
  ctx.font = `52px ${FONT}`; const bw = Math.max(124, ctx.measureText(n).width + 70);
  panel(-bw / 2, -34, bw, 66, 33); ctx.fillStyle = "#f6c544"; ctx.beginPath(); ctx.moveTo(-12, 31); ctx.lineTo(12, 31); ctx.lineTo(0, 46); ctx.fill();
  ctx.font = `30px ${FONT}`; ctx.textAlign = "center"; ctx.textBaseline = "middle"; ctx.fillText(ED.countIcon || "🐶", -bw / 2 + 26, 0);
  gtext(String(n), 14, 1, 50, { font: FONT, c1: "#ffffff", c2: "#ffffff", c3: "#cfe8ff" });
  ctx.restore();
}
function drawBoss() {
  const b = S.boss, p = bossPos(), s = p.s * 1.25;
  if (b.dead && b.ultT > 1.6) { // 야채 피자 잔치
    const k = Math.min(1, (b.ultT - 1.6) * 3), r = 170 * s * k;
    const wim = STG().id === "table" ? ART.boss_pizza : goodImg(0);
    if (wim) { ctx.save(); ctx.translate(p.x, p.y - 120 * s); ctx.rotate(STG().id === "table" ? S.t * 0.6 : Math.sin(S.t * 4) * 0.2); drawFit(wim, 0, r, r * 2); ctx.restore(); return; }
    ctx.save(); ctx.translate(p.x, p.y - 120 * s); ctx.rotate(S.t * 0.6);
    ctx.fillStyle = "#e7b05a"; ctx.beginPath(); ctx.arc(0, 0, r, 0, 7); ctx.fill();
    ctx.fillStyle = "#ef4444"; ctx.beginPath(); ctx.arc(0, 0, r * 0.86, 0, 7); ctx.fill();
    ctx.fillStyle = "#fde68a"; ctx.beginPath(); ctx.arc(0, 0, r * 0.8, 0, 7); ctx.fill();
    for (let i = 0; i < 9; i++) { const a = i * 0.7, rr = r * (0.25 + (i % 3) * 0.2); ctx.drawImage(DISH[i % 3], Math.cos(a) * rr - 18 * s, Math.sin(a) * rr - 18 * s, 36 * s, 36 * s); }
    ctx.restore();
    return;
  }
  if (b.dead) return;
  const y0 = p.y, wob = Math.sin(S.t * 3) * 6 * s, grow = b.intro > 0 ? Math.min(1, (2.2 - b.intro) * 1.5) : 1;
  const bst = STG(), bkey = bst.id === "table" ? "boss_pot" : `boss_${bst.id}`, bimg = ART[bkey] || (FB[bst.id] && FB[bst.id].boss);
  if (bimg) {
    const im = b.hitT > 0.12 && ART[bkey + "_hit"] ? ART[bkey + "_hit"] : bimg;
    ctx.save(); ctx.translate(p.x, y0 + wob * 0.3); ctx.scale(grow * (1 + (b.hitT > 0 ? 0.04 : 0)), grow); drawFit(im, 0, 10 * s, 360 * s); ctx.restore();
  } else {
  ctx.save(); ctx.translate(p.x, y0); ctx.scale(grow, grow);
  // 김
  for (let i = 0; i < 4; i++) { const t = (S.t * 0.6 + i / 4) % 1; ctx.fillStyle = `rgba(255,255,255,${0.35 * (1 - t)})`; ctx.beginPath(); ctx.arc(-60 * s + i * 40 * s, -250 * s - t * 120 * s, (20 + t * 30) * s, 0, 7); ctx.fill(); }
  // 채소 머리카락
  ctx.drawImage(VEG[0], -110 * s, -300 * s + wob, 110 * s, 110 * s);
  ctx.drawImage(VEG[2], 10 * s, -300 * s - wob, 100 * s, 100 * s);
  ctx.save(); ctx.translate(-120 * s, -200 * s); ctx.rotate(-0.6); ctx.drawImage(VEG[1], -40 * s, -60 * s, 80 * s, 80 * s); ctx.restore();
  ctx.save(); ctx.translate(120 * s, -200 * s); ctx.rotate(0.6); ctx.drawImage(VEG[1], -40 * s, -60 * s, 80 * s, 80 * s); ctx.restore();
  // 냄비 몸
  ctx.fillStyle = "#991b1b"; ctx.beginPath(); ctx.ellipse(-150 * s, -110 * s, 30 * s, 18 * s, 0, 0, 7); ctx.ellipse(150 * s, -110 * s, 30 * s, 18 * s, 0, 0, 7); ctx.fill();
  const pg = ctx.createLinearGradient(-140 * s, 0, 140 * s, 0); pg.addColorStop(0, "#7f1d1d"); pg.addColorStop(0.4, "#dc2626"); pg.addColorStop(1, "#7f1d1d");
  ctx.fillStyle = pg; ctx.beginPath(); ctx.roundRect(-140 * s, -200 * s, 280 * s, 200 * s, 40 * s); ctx.fill();
  ctx.fillStyle = "#d6d3d1"; ctx.beginPath(); ctx.ellipse(0, -200 * s, 150 * s, 26 * s, 0, 0, 7); ctx.fill();
  ctx.fillStyle = "#57534e"; ctx.beginPath(); ctx.ellipse(0, -200 * s, 130 * s, 18 * s, 0, 0, 7); ctx.fill();
  face(ctx, 0, -110 * s, 3.2 * s);
  if (b.hitT > 0) { ctx.globalCompositeOperation = "lighter"; ctx.fillStyle = "rgba(255,200,120,.35)"; ctx.beginPath(); ctx.roundRect(-140 * s, -200 * s, 280 * s, 200 * s, 40 * s); ctx.fill(); ctx.globalCompositeOperation = "source-over"; }
  ctx.restore();
  }
  // 방패
  if (b.phase === 2 && b.shield > 0) {
    const r = 210 * s;
    ctx.save(); ctx.translate(p.x, p.y - 120 * s);
    const sg = ctx.createRadialGradient(0, 0, r * 0.3, 0, 0, r); sg.addColorStop(0, "rgba(125,211,252,.15)"); sg.addColorStop(1, "rgba(56,189,248,.55)");
    ctx.fillStyle = sg; ctx.beginPath(); for (let i = 0; i < 6; i++) { const a = i / 6 * 6.28 + S.t * 0.4; ctx.lineTo(Math.cos(a) * r, Math.sin(a) * r); } ctx.closePath(); ctx.fill();
    ctx.strokeStyle = "#e0f2fe"; ctx.lineWidth = 6; ctx.stroke();
    ctx.font = `${Math.round(120 * s)}px ${FONT}`; ctx.textAlign = "center"; ctx.textBaseline = "middle";
    ctx.lineWidth = 12; ctx.strokeStyle = "#0c4a6e"; ctx.strokeText(b.shield, 0, 0); ctx.fillStyle = "#fff"; ctx.fillText(b.shield, 0, 0);
    ctx.restore();
  }
  // 날아오는 채소공
  for (const ball of S.balls) {
    const k = Math.min(1, ball.t / ball.T), tp = proj(ball.tx, 0);
    ctx.strokeStyle = `rgba(239,68,68,${0.4 + 0.5 * k})`; ctx.lineWidth = 5; ctx.beginPath(); ctx.ellipse(tp.x, tp.y, 30 + 30 * k, 12 + 10 * k, 0, 0, 7); ctx.stroke();
    const z = BOSS_Z * (1 - k), bp = proj(ball.fx + (ball.tx - ball.fx) * k, z), arc = Math.sin(k * Math.PI) * 260 * bp.s + 150 * bp.s * (1 - k);
    const sz = 90 * bp.s * 1.2; ctx.save(); ctx.translate(bp.x, bp.y - arc); ctx.rotate(S.t * 8); drawFit(foeImg(ball.k), 0, sz / 2, sz); ctx.restore();
  }
}
function drawUltBeam() {
  const b = S.boss; if (!b || b.ultT < 0.35 || b.ultT > 1.55) return;
  const bp = bossPos(), k = Math.min(1, (b.ultT - 0.35) * 4), wdt = 120 + Math.sin(S.t * 40) * 20;
  ctx.save(); ctx.globalCompositeOperation = "lighter";
  const g = ctx.createLinearGradient(W / 2, CROWD_Y, bp.x, bp.y - 120);
  g.addColorStop(0, "rgba(253,224,71,.0)"); g.addColorStop(0.2, "rgba(253,224,71,.7)"); g.addColorStop(1, "rgba(251,146,60,.9)");
  ctx.fillStyle = g; ctx.beginPath();
  const ex = bp.x, ey = bp.y - 120 * k;
  ctx.moveTo(W / 2 - wdt, CROWD_Y); ctx.lineTo(W / 2 + wdt, CROWD_Y); ctx.lineTo(ex + 40, ey); ctx.lineTo(ex - 40, ey); ctx.fill();
  if (ART.fx_bark_wave) { for (let i = 0; i < 3; i++) { const t = ((b.ultT * 2.5) + i / 3) % 1, mx = W / 2 + (bp.x - W / 2) * t, my = CROWD_Y - 40 + (bp.y - 120 - CROWD_Y + 40) * t, sz = 200 + 260 * (1 - t); ctx.globalAlpha = 0.9 * (1 - t * 0.6); ctx.drawImage(ART.fx_bark_wave, mx - sz / 2, my - sz / 2, sz, sz); } ctx.globalAlpha = 1; }
  ctx.restore();
  const uim = ART[ED.id === "hub" ? `${S.kid}_cheer` : ED.heroUlt];
  if (uim) { // 주인공이 앞에 서서 필살기 → 파동
    const pop = Math.min(1, (b.ultT - 0.35) * 6), sz = 260 * (0.6 + 0.4 * pop) * (1 + Math.sin(S.t * 30) * 0.02);
    ctx.save(); ctx.globalCompositeOperation = "lighter"; ctx.globalAlpha = 0.6;
    for (let i = 0; i < 3; i++) { const t = ((b.ultT * 3) + i / 3) % 1; ctx.strokeStyle = "rgba(147,197,253,1)"; ctx.lineWidth = 14 * (1 - t); ctx.beginPath(); ctx.arc(W / 2, CROWD_Y - 150, 60 + t * 260, 0, 7); ctx.stroke(); }
    ctx.restore();
    drawFit(uim, W / 2, CROWD_Y + 10, sz);
  }
  gtext(ED.id === "hub" ? "얍!" : ED.ultShout, W / 2, CROWD_Y - 330, 70 + Math.sin(S.t * 30) * 6, { c1: "#ffffff", c2: "#bfdbfe", c3: "#60a5fa", stroke: "#0b2a5a" });
}
function drawParts() {
  for (const p of S.parts) {
    const a = clamp(p.life / p.max * 1.5, 0, 1); ctx.globalAlpha = a;
    if (p.kind === "img") { if (!p.img) continue; ctx.save(); ctx.translate(p.x, p.y); ctx.rotate(p.rot); ctx.drawImage(p.img, -p.r / 2, -p.r / 2, p.r, p.r); ctx.restore(); }
    else if (p.kind === "shard") { ctx.save(); ctx.translate(p.x, p.y); ctx.rotate(p.rot); ctx.fillStyle = p.col; ctx.beginPath(); ctx.moveTo(0, -p.r); ctx.lineTo(p.r * 0.6, p.r * 0.4); ctx.lineTo(-p.r * 0.5, p.r * 0.6); ctx.fill(); ctx.restore(); }
    else if (p.kind === "conf") { ctx.save(); ctx.translate(p.x, p.y); ctx.rotate(p.rot); ctx.fillStyle = p.col; ctx.fillRect(-p.r / 2, -p.r / 4, p.r, p.r / 2); ctx.restore(); }
    else if (p.kind === "star") { ctx.save(); ctx.translate(p.x, p.y); ctx.rotate(p.rot); ctx.fillStyle = p.col; ctx.beginPath(); for (let i = 0; i < 10; i++) { const r = i % 2 ? p.r * 0.45 : p.r * 1.3; ctx.lineTo(Math.cos(i * 0.628) * r, Math.sin(i * 0.628) * r); } ctx.fill(); ctx.restore(); }
    else { ctx.fillStyle = p.col; ctx.beginPath(); ctx.arc(p.x, p.y, p.r * (p.kind === "pop" ? 1.4 : 1), 0, 7); ctx.fill(); }
  }
  ctx.globalAlpha = 1;
  for (const n of S.notes) { ctx.font = `30px ${FONT}`; ctx.fillStyle = "#fde047"; ctx.textAlign = "center"; ctx.fillText("♪", n.x, n.y); }
  for (const r of S.rings) {
    const k = 1 - r.life / r.max; ctx.globalAlpha = 1 - k; ctx.lineWidth = r.w * (1 - k) + 2;
    if (r.col === "rainbow") { const g = ctx.createConicGradient ? ctx.createConicGradient(S.t * 3, r.x, r.y) : null; if (g) { ["#f43f5e", "#facc15", "#22c55e", "#3b82f6", "#a855f7", "#f43f5e"].forEach((c, i) => g.addColorStop(i / 5, c)); ctx.strokeStyle = g; } else ctx.strokeStyle = "#facc15"; }
    else ctx.strokeStyle = r.col;
    ctx.beginPath(); ctx.arc(r.x, r.y, r.maxR * (0.15 + 0.85 * Math.sqrt(k)), 0, 7); ctx.stroke();
  }
  ctx.globalAlpha = 1;
  for (const t of S.texts) {
    const k = t.life / t.max, pop = k > 0.85 ? 1 + (k - 0.85) * 4 : 1;
    ctx.globalAlpha = clamp(k * 2, 0, 1); gtext(t.str, t.x, t.y, t.size * pop, { c1: "#ffffff", c2: t.col, c3: t.col, max: W - 30 });
  }
  ctx.globalAlpha = 1;
}
function drawTutorial() {
  if (!S.tut || S.mode !== "run") return;
  const e = S.ev.find(x => x.spawned && !x.done && x.easy && x.gateIdx < 2);
  if (!e) return;
  const z = e.p - S.d; if (z > 1500 || z < 40) return;
  const rs = e.opts.map(o => applyOp(o, S.count)), good = rs[0] >= rs[1] ? 0 : 1, gx = good === 0 ? -0.5 : 0.5;
  const k = (Math.sin(S.t * 5) + 1) / 2, p = proj(S.cx + (gx - S.cx) * k, 60);
  ctx.save(); ctx.globalAlpha = 0.95;
  ctx.font = `90px ${FONT}`; ctx.textAlign = "center"; ctx.textBaseline = "middle";
  ctx.fillText("👆", p.x, p.y - 60);
  const msg = good === 0 ? "◀ 큰 수 쪽으로 밀어요!" : "큰 수 쪽으로 밀어요! ▶";
  gtext(msg, W / 2, 380, 40, { font: FONT, c1: "#fffbe0", c2: "#ffe066", c3: "#ffb703", max: W - 30 });
  ctx.restore();
}
function drawRescue() {
  const rim = ART[S.rescueImg || ED.heroFront]; if (!(S.rescueT > 0) || !rim) return;
  const k = 1 - S.rescueT / 1.6, e = 1 - Math.pow(1 - Math.min(1, k * 1.4), 3);
  const y = HOR + 40 + (CROWD_Y - 40 - HOR) * e, sz = 70 + 260 * e, bob = Math.abs(Math.sin(S.t * 18)) * 12 * e;
  ctx.save(); ctx.globalAlpha = k > 0.8 ? (1 - k) * 5 : 1;
  ctx.fillStyle = "rgba(0,0,0,.25)"; ctx.beginPath(); ctx.ellipse(W / 2, y, sz * 0.32, sz * 0.08, 0, 0, 7); ctx.fill();
  const g = ctx.createRadialGradient(W / 2, y - sz * 0.5, 10, W / 2, y - sz * 0.5, sz * 0.9); g.addColorStop(0, "rgba(147,197,253,.55)"); g.addColorStop(1, "rgba(147,197,253,0)");
  ctx.fillStyle = g; ctx.fillRect(W / 2 - sz, y - sz * 1.4, sz * 2, sz * 1.6);
  drawFit(rim, W / 2, y - bob, sz);
  ctx.restore();
}
function drawHUD() {
  drawRescue();
  drawTutorial();
  ctx.textBaseline = "middle";
  // 점수
  panel(14, 14, 176, 54, 27); starIcon(42, 41, 17);
  gtext(String(S.score), 66, 42, 34, { font: FONT, align: "left", c1: "#ffffff", c2: "#ffe066", c3: "#ffb703" });
  // 연속
  if (S.streak > 0) {
    const f = 1 + Math.sin(S.t * 12) * 0.06 * Math.min(1, S.streak / 3);
    ctx.save(); ctx.translate(W - 80, 42); ctx.scale(f, f);
    if (S.streak >= 5) panel(-68, -27, 136, 54, 27, { top: "#ff8a3d", bot: "#c2410c", rim: "#fff1a8" }); else panel(-68, -27, 136, 54, 27);
    gtext(`🔥${S.streak}연속`, 0, 1, 28, { font: FONT, c1: "#fff", c2: "#fff3c4", c3: "#ffd166" }); ctx.restore();
  }
  // 진행 막대 / 대장 체력
  if (S.mode === "boss" && S.boss && !S.boss.dead) {
    panel(56, 80, W - 112, 32, 16, { top: "#4a1d1d", bot: "#1f0a0a" });
    const hg = ctx.createLinearGradient(0, 86, 0, 106); hg.addColorStop(0, "#d9f99d"); hg.addColorStop(0.5, "#4ade80"); hg.addColorStop(1, "#15803d");
    ctx.fillStyle = hg; ctx.beginPath(); ctx.roundRect(62, 86, Math.max(0, (W - 124) * S.boss.hp), 20, 10); ctx.fill();
    ctx.fillStyle = "rgba(255,255,255,.35)"; ctx.beginPath(); ctx.roundRect(66, 88, Math.max(0, (W - 132) * S.boss.hp), 6, 3); ctx.fill();
    gtext(STG().bossName.replace(/!$/, ""), W / 2, 130, 24, { font: FONT, c1: "#fff", c2: "#d9f99d", c3: "#84cc16", stroke: "#1a2e05" });
  } else if (S.mode === "run") {
    const k = clamp(S.d / (S.end - 650), 0, 1);
    panel(204, 30, 132, 22, 11); const pg = ctx.createLinearGradient(0, 33, 0, 49); pg.addColorStop(0, "#fff3a0"); pg.addColorStop(1, "#f59e0b");
    ctx.fillStyle = pg; ctx.beginPath(); ctx.roundRect(208, 34, Math.max(12, 124 * k), 14, 7); ctx.fill();
    ctx.font = `22px ${FONT}`; ctx.textAlign = "center"; ctx.textBaseline = "middle"; ctx.fillText(STG().icon, 208 + Math.max(12, 124 * k), 40);
  }
  // 콤보
  if (S.combo > 3) gtext(`콤보 ${S.combo}`, W / 2, 470, Math.min(76, 34 + S.combo), { c1: "#fffbe0", c2: "#ffd23f", c3: "#ff7b00", stroke: "#4a1500" });
  if (S.stormT > 0 && S.mode === "run") {
    const k = Math.min(1, S.stormT / 5), pz = 1 + Math.sin(S.t * 14) * 0.05;
    ctx.save(); ctx.translate(W / 2, 140); ctx.scale(pz, pz);
    const g = ctx.createLinearGradient(-130, 0, 130, 0); ["#f43f5e", "#facc15", "#22c55e", "#3b82f6", "#a855f7"].forEach((c, i) => g.addColorStop(i / 4, c));
    ctx.fillStyle = "rgba(0,0,0,.45)"; ctx.beginPath(); ctx.roundRect(-130, -24, 260, 48, 24); ctx.fill();
    ctx.fillStyle = g; ctx.beginPath(); ctx.roundRect(-126, -20, 252 * k, 40, 20); ctx.fill();
    gtext("토핑 폭풍 점수 ×2", 0, 1, 27, { font: FONT, c1: "#fff", c2: "#fff", c3: "#ffe4f1" }); ctx.restore();
  }
  // 배너
  if (S.bannerT > 0) {
    const k = S.bannerT, sc = k > 1.4 ? 1 + (k - 1.4) * 3 : 1;
    ctx.save(); ctx.globalAlpha = clamp(k * 2, 0, 1); ctx.translate(W / 2, 200); ctx.scale(sc, sc); ctx.rotate(-0.04);
    gtext(S.banner, 0, 0, 62, { c1: "#ffffff", c2: S.bannerCol, c3: S.bannerCol, max: W - 40 });
    ctx.restore();
  }
  // 필살기 버튼
  if (S.mode === "boss" && S.boss.phase === 3 && S.boss.ultT < 0) {
    const r = 70, x = W / 2, y = H - 110, k = S.ultGauge;
    ctx.fillStyle = "rgba(0,0,0,.4)"; ctx.beginPath(); ctx.arc(x, y, r + 10, 0, 7); ctx.fill();
    ctx.strokeStyle = "#fde047"; ctx.lineWidth = 10; ctx.beginPath(); ctx.arc(x, y, r + 4, -Math.PI / 2, -Math.PI / 2 + k * 6.283); ctx.stroke();
    if (S.ultBtn) {
      const pz = 1 + Math.sin(S.t * 10) * 0.08; ctx.save(); ctx.translate(x, y); ctx.scale(pz, pz);
      const g = ctx.createRadialGradient(0, -20, 10, 0, 0, r); g.addColorStop(0, "#fef08a"); g.addColorStop(1, "#f97316"); ctx.fillStyle = g; ctx.beginPath(); ctx.arc(0, 0, r, 0, 7); ctx.fill();
      ctx.font = `26px ${FONT}`; ctx.textAlign = "center"; ctx.fillStyle = "#7c2d12"; ctx.fillText("멍멍", 0, -12); ctx.fillText("필살기!", 0, 20); ctx.restore();
      ctx.font = `24px ${FONT}`; ctx.fillStyle = "#fff"; ctx.fillText("눌러!", x, y - r - 30);
    }
  }
}
function render() {
  ctx.setTransform(scale * dpr, 0, 0, scale * dpr, 0, 0);
  ctx.save();
  if (S && S.shake > 0) { const m = S.shake * S.shake * 18; ctx.translate(rand(-m, m), rand(-m, m)); }
  if (!S) { ctx.fillStyle = "#1b0f0a"; ctx.fillRect(0, 0, W, H); ctx.restore(); return; }
  ctx.save(); if (S.demo) ctx.translate(0, -230); // 첫 화면: 강아지 무리가 버튼 위로 보이게
  drawBG(); drawTable();
  const objs = [];
  for (const e of S.ev) {
    if (!e.spawned) continue;
    const z = e.p - S.d;
    if (e.type === "gate" || e.type === "target") objs.push({ z, f: () => drawGate(e, z) });
    if (e.type === "swarm") objs.push({ z, f: () => drawSwarm(e, z) });
  }
  if (S.boss) objs.push({ z: BOSS_Z, f: drawBoss });
  if (S.boss && S.boss.gate && !S.boss.gate.done) { const g = S.boss.gate; objs.push({ z: g.z, f: () => drawGate(g, g.z) }); }
  else if (S.boss && S.boss.gate && S.boss.gate.done && S.boss.gate.flashT > 0) { const g = S.boss.gate; objs.push({ z: 0, f: () => drawGate(g, 0) }); }
  objs.push({ z: S.crowdZ + 60, f: drawDogs });
  objs.sort((a, b) => b.z - a.z).forEach(o => o.f());
  drawUltBeam();
  drawParts();
  ctx.restore();
  if (S.flashA > 0) { ctx.fillStyle = S.flashCol; ctx.globalAlpha = S.flashA; ctx.fillRect(-20, -20, W + 40, H + 40); ctx.globalAlpha = 1; }
  // 테두리 어둡게
  const vg = ctx.createRadialGradient(W / 2, H / 2, H * 0.35, W / 2, H / 2, H * 0.75); vg.addColorStop(0, "rgba(0,0,0,0)"); vg.addColorStop(1, "rgba(0,0,0,.35)"); ctx.fillStyle = vg; ctx.fillRect(0, 0, W, H);
  if (!S.demo) drawHUD();
  ctx.restore();
}

// ---------- 자동 진행 (점검용) ----------
function autoplay() {
  let best = null;
  const gs = S.ev.filter(e => e.spawned && !e.done && e.opts).map(e => ({ e, z: e.p - S.d }));
  if (S.boss && S.boss.gate && !S.boss.gate.done) gs.push({ e: S.boss.gate, z: S.boss.gate.z });
  gs.sort((a, b) => a.z - b.z);
  if (gs.length && gs[0].z < 700) {
    const e = gs[0].e, rs = e.opts.map(o => applyOp(o, S.count));
    const side = e.target != null ? (Math.abs(rs[0] - e.target) <= Math.abs(rs[1] - e.target) ? 0 : 1) : (rs[0] >= rs[1] ? 0 : 1);
    best = side === 0 ? -0.5 : 0.5;
  } else if (S.balls.length) {
    const ball = S.balls[0]; best = ball.tx > 0 ? ball.tx - 0.6 : ball.tx + 0.6;
  }
  if (best != null) { if (Math.abs(S.tx - best) > 0.01) S.lastMoveT = S.t; S.tx = best; }
}

// ---------- 입력 ----------
let drag = null;
cv.addEventListener("pointerdown", ev => {
  touched = true; audioInit(); if (AC && AC.state === "suspended") AC.resume();
  if (!S) return;
  const r = cv.getBoundingClientRect(), x = (ev.clientX - r.left) / scale, y = (ev.clientY - r.top) / scale;
  if (S.mode === "boss" && S.ultBtn && Math.hypot(x - W / 2, y - (H - 110)) < 95) { fireUlt(); return; }
  drag = { x: ev.clientX, tx: S.tx }; cv.setPointerCapture(ev.pointerId);
});
cv.addEventListener("pointermove", ev => { if (!drag || !S) return; S.lastMoveT = S.t; S.tx = drag.tx + (ev.clientX - drag.x) / scale / ROADPX * 1.3; });
const endDrag = () => { drag = null; };
cv.addEventListener("pointerup", endDrag); cv.addEventListener("pointercancel", endDrag);
addEventListener("keydown", e => { keys[e.key] = true; if (e.key === " " && S && S.ultBtn) fireUlt(); });
addEventListener("keyup", e => { keys[e.key] = false; });

function start(age, kid) {
  touched = true; audioInit(); if (AC && AC.state === "suspended") AC.resume();
  $("menu").classList.add("hide"); $("result").classList.add("hide"); document.body.classList.remove("title");
  newGame(age); S.kid = kid || null; window.__TP = S;
}
if (ED.picker === "kid") { // 허브판: 아이 얼굴 4개 + 큰 출발. 고른 아이 = 나이(난이도)
  const box = document.querySelector(".ages"), last = lsGet("tp_kid") || ED.cast[1].id;
  document.querySelector(".ask").textContent = "누가 달릴까요?";
  box.classList.add("kids");
  box.innerHTML = ED.cast.map(c => `<button class="kidbtn${c.id === last ? " sel" : ""}" data-kid="${c.id}"><img src="${c.sticker}" alt=""><b>${c.name}</b></button>`).join("") + `<button class="gobtn" id="goBtn">출발!</button>`;
  box.querySelectorAll(".kidbtn").forEach(b => b.addEventListener("click", () => { box.querySelectorAll(".kidbtn").forEach(x => x.classList.toggle("sel", x === b)); lsSet("tp_kid", b.dataset.kid); }));
  $("goBtn").addEventListener("click", () => { const id = lsGet("tp_kid") || last, c = castOf(id); start(c.age, c.id); });
} else document.querySelectorAll("[data-age]").forEach(b => b.addEventListener("click", () => start(+b.dataset.age)));
$("again").addEventListener("click", () => start(S.age, S.kid));
$("next").addEventListener("click", () => { lsSet(KEY("stsel"), String(S.stage + 1)); start(S.age, S.kid); });
function renderMap() {
  const u = unlocked(), sel = selStage();
  $("map").innerHTML = STAGES.map((st, i) => `${i ? "<b></b>" : ""}<button class="st${i > u ? " lock" : ""}${i === sel ? " now" : ""}" data-st="${i}"><i>${i > u ? "🔒" : st.icon}</i><small>${st.name}</small></button>`).join("");
  $("map").querySelectorAll(".st").forEach(b => b.addEventListener("click", () => {
    const i = +b.dataset.st; if (i > u) { b.classList.remove("shake"); void b.offsetWidth; b.classList.add("shake"); return; }
    lsSet(KEY("stsel"), String(i)); renderMap(); newGame(7, true, i); SFX.ding && SFX.ding(3);
  }));
  $("stTitle").textContent = STAGES[sel].title;
  $("shopBtnN").textContent = `${ED.coin.icon} ${coins()}`;
}
function renderShop() {
  const o = ups(), c = coins();
  $("shopCoin").textContent = `${ED.coin.icon} ${c} ${ED.coin.name}`;
  $("shopList").innerHTML = UPS.map(u => {
    const l = o[u.id], full = l >= u.max, cost = UP_COST[l];
    return `<div class="up"><i>${u.icon}</i><div class="ut"><b>${u.name}</b><span>${"●".repeat(l)}${"○".repeat(u.max - l)}</span><small>${l ? u.desc(l) : "아직 없음"}${full ? "" : ` → ${u.desc(l + 1)}`}</small></div>` +
      `<button data-up="${u.id}" ${full || c < cost ? "disabled" : ""}>${full ? "최고!" : `${ED.coin.icon} ${cost}`}</button></div>`;
  }).join("");
  $("shopList").querySelectorAll("[data-up]").forEach(b => b.addEventListener("click", () => {
    const o2 = ups(), id = b.dataset.up, l = o2[id], cost = UP_COST[l];
    if (coins() < cost || l >= UPS.find(u => u.id === id).max) return;
    lsSet(KEY("coin"), String(coins() - cost)); o2[id] = l + 1; lsSet(KEY("ups"), JSON.stringify(o2));
    audioInit(); SFX.fanfare && SFX.fanfare(); renderShop(); renderMap();
  }));
}
$("shopBtn").addEventListener("click", () => { renderShop(); $("shop").classList.remove("hide"); });
$("shopClose").addEventListener("click", () => $("shop").classList.add("hide"));
function toTitle() { $("result").classList.add("hide"); $("menu").classList.remove("hide"); document.body.classList.add("title"); renderMap(); newGame(7, true); }
$("toMenu").addEventListener("click", toTitle);
$("bookBtn").addEventListener("click", () => { renderBook(); $("book").classList.remove("hide"); });
$("bookClose").addEventListener("click", () => $("book").classList.add("hide"));
renderBook();

// ---------- 루프 ----------
let last = performance.now();
const TS = +(Q.get("speed") || 1);
function frame(now) {
  let dt = Math.min(0.05, (now - last) / 1000); last = now;
  if (S) {
    if (S.hitstop > 0) { S.hitstop -= dt; dt = 0; }
    if (S.slowT > 0) { S.slowT -= dt; dt *= S.slow; }
    dt *= TS;
    const n = TS > 1 ? Math.ceil(TS) : 1;
    for (let i = 0; i < n; i++) if (dt > 0) update(dt / n);
  }
  musicTick();
  render();
  requestAnimationFrame(frame);
}
requestAnimationFrame(frame);
if (Q.get("age")) start(+Q.get("age")); else toTitle();
if (QA) window.__TP_API = {
  get music() { return { ac: AC ? AC.state : "none", name: trackName, loopEnd: trackSrc ? trackSrc.loopEnd : null, tracks: Object.keys(TRACK) }; },
  start, get S() { return S; }, fireUlt, STAGES, ups, coins, unlocked, renderMap, genPair, genTarget, applyOp, rescue,
  sim(sec) { const n = Math.round(sec * 60); for (let i = 0; i < n && S; i++) { if (S.hitstop > 0) { S.hitstop -= 1 / 60; continue; } update(1 / 60); } render(); },
};
})();
