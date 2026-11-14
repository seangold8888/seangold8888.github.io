// 스카이 샷 소리 — 효과음은 Web Audio 로 그 자리에서 만든다(소리 파일 없음). 조종사 외침만 카드게임·삼국지의 기존 함성 클립.
// 지킬 것: speechSynthesis 금지(아이패드 마이크가 죽는다). AudioContext 는 손가락이 닿을 때(사용자 동작 안에서)만 만들고 깨운다.
// 연사 안전: 소리마다 최소 간격, 동시에 울리는 소리 12개까지, 압축기로 찢어지지 않게. 문제 화면이 떠 있는 동안은 정답 축하음만.
// Node·자동화 브라우저(navigator.webdriver)에서는 소리를 내지 않는다(기록만 남는다).

const W = typeof window !== "undefined" ? window : null;
const SILENT = !W || !!(W.navigator && W.navigator.webdriver) || !(W.AudioContext || W.webkitAudioContext);
const now = () => (W && W.performance ? W.performance.now() : Date.now());
const MAX_VOICES = 12;
const VOL = 1.0;                         // 전체 볼륨(압축기 뒤). 최고값이 0.5 안팎에 머문다
const SHOUT_GAP = 4500;                 // 무기를 쓸 때 나오는 외침은 4.5초에 한 번까지

/* ---------- 소리 조각 ---------- */
const noiseBufs = new WeakMap();
function noiseBuf(c) {
  let b = noiseBufs.get(c);
  if (!b) { b = c.createBuffer(1, c.sampleRate, c.sampleRate); const d = b.getChannelData(0); for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1; noiseBufs.set(c, b); }
  return b;
}
function env(c, t, vol, attack, dur) {
  const g = c.createGain();
  g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(Math.max(0.0002, vol), t + attack); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  return g;
}
// 음 하나: f → f2 로 미끄러진다.
function tone(c, out, t, { type = "sine", f, f2, dur, vol, attack = 0.004, detune = 0, lfo = 0, lfoDepth = 0 }) {
  const o = c.createOscillator(), g = env(c, t, vol, attack, dur);
  o.type = type; o.frequency.setValueAtTime(f, t); if (f2) o.frequency.exponentialRampToValueAtTime(Math.max(20, f2), t + dur);
  if (detune) o.detune.setValueAtTime(detune, t);
  if (lfo) { const l = c.createOscillator(), lg = c.createGain(); l.frequency.value = lfo; lg.gain.value = lfoDepth; l.connect(lg); lg.connect(o.frequency); l.start(t); l.stop(t + dur + 0.05); }
  o.connect(g); g.connect(out); o.start(t); o.stop(t + dur + 0.05);
}
// 바람·폭발 소리: 거른 잡음.
function hiss(c, out, t, { dur, vol, type = "lowpass", f = 1200, f2, q = 0.8, attack = 0.004, lfo = 0, lfoDepth = 0 }) {
  const s = c.createBufferSource(), fl = c.createBiquadFilter(), g = env(c, t, vol, attack, dur);
  s.buffer = noiseBuf(c); fl.type = type; fl.Q.value = q;
  fl.frequency.setValueAtTime(f, t); if (f2) fl.frequency.exponentialRampToValueAtTime(Math.max(30, f2), t + dur);
  if (lfo) { const l = c.createOscillator(), lg = c.createGain(); l.frequency.value = lfo; lg.gain.value = lfoDepth; l.connect(lg); lg.connect(fl.frequency); l.start(t); l.stop(t + dur + 0.05); }
  s.connect(fl); fl.connect(g); g.connect(out); s.start(t, Math.random() * 0.4); s.stop(t + dur + 0.05);
}
const NOTE = n => 440 * Math.pow(2, (n - 69) / 12);          // MIDI 번호 → 주파수
const lvVol = (lv, base) => base * (0.82 + Math.min(8, lv) * 0.045);   // 단계가 오를수록 조금씩 크게

/* ---------- 소리 목록: (컨텍스트, 출력, 시작 시각, 무기 단계) → 길이(초) ---------- */
const R = {
  // 바탕 탄: 1단계 콩알 → 2단계 쌍둥이(겹음) → 4단계 아래 두께 → 7단계 반짝이
  shot(c, o, t, lv) {
    const v = lvVol(lv, 0.09);
    tone(c, o, t, { type: "square", f: 960, f2: 480, dur: 0.06, vol: v * 0.55 });
    tone(c, o, t, { type: "triangle", f: 1440, f2: 720, dur: 0.05, vol: v * 0.5 });
    if (lv >= 2) tone(c, o, t + 0.012, { type: "square", f: 900, f2: 450, dur: 0.06, vol: v * 0.4, detune: 14 });
    if (lv >= 4) tone(c, o, t, { type: "sine", f: 300, f2: 120, dur: 0.09, vol: v * 1.1 });
    if (lv >= 7) tone(c, o, t, { type: "triangle", f: 2600, f2: 1900, dur: 0.05, vol: v * 0.35 });
    return 0.1;
  },
  // 레이저: 찌잉 내려가는 소리. 단계마다 한 겹씩.
  laser(c, o, t, lv) {
    const v = lvVol(lv, 0.08);
    tone(c, o, t, { type: "sawtooth", f: 2100, f2: 380, dur: 0.13, vol: v * 0.45 });
    tone(c, o, t, { type: "square", f: 1600, f2: 700, dur: 0.1, vol: v * 0.3, detune: 9 });
    if (lv >= 4) tone(c, o, t, { type: "square", f: 1050, f2: 190, dur: 0.14, vol: v * 0.35 });
    if (lv >= 6) tone(c, o, t, { type: "sine", f: 170, f2: 80, dur: 0.16, vol: v * 1.0 });
    if (lv >= 8) tone(c, o, t, { type: "triangle", f: 3200, f2: 1300, dur: 0.12, vol: v * 0.4, lfo: 30, lfoDepth: 300 });
    return 0.17;
  },
  // 미사일 발사: 슈웅(바람) + 낮은 출발음
  missile(c, o, t, lv) {
    const v = lvVol(lv, 0.11);
    hiss(c, o, t, { type: "bandpass", f: 500, f2: 2600, dur: 0.34, vol: v * 0.9, q: 1.2, attack: 0.04 });
    tone(c, o, t, { type: "triangle", f: 190, f2: 520, dur: 0.28, vol: v * 0.35 });
    if (lv >= 5) tone(c, o, t, { type: "sine", f: 110, f2: 55, dur: 0.18, vol: v * 0.9 });
    if (lv >= 7) hiss(c, o, t + 0.05, { type: "bandpass", f: 300, f2: 1800, dur: 0.4, vol: v * 0.6, q: 1 });
    return 0.42;
  },
  // 미사일이 맞아 터짐: 쿵
  missileHit(c, o, t, lv) {
    const v = lvVol(lv, 0.17);
    tone(c, o, t, { type: "sine", f: 150, f2: 45, dur: 0.24, vol: v });
    hiss(c, o, t, { f: 1800, f2: 220, dur: 0.22, vol: v * 0.6 });
    if (lv >= 6) tone(c, o, t, { type: "sine", f: 75, f2: 35, dur: 0.32, vol: v * 0.8 });
    return 0.32;
  },
  // 번개: 찌지직(짧은 잡음 여러 개) + 찡
  bolt(c, o, t, lv) {
    const v = lvVol(lv, 0.1), n = 4 + lv;
    for (let i = 0; i < n; i++) hiss(c, o, t + Math.random() * 0.14, { type: "highpass", f: 2600 + Math.random() * 2000, dur: 0.018 + Math.random() * 0.02, vol: v * 0.8, attack: 0.001 });
    tone(c, o, t, { type: "square", f: 2300, f2: 600, dur: 0.08, vol: v * 0.35 });
    if (lv >= 5) tone(c, o, t, { type: "sine", f: 95, f2: 60, dur: 0.22, vol: v * 0.9 });
    if (lv >= 7) hiss(c, o, t + 0.04, { f: 420, f2: 120, dur: 0.38, vol: v * 0.6 });
    return 0.42;
  },
  // 빙글 구슬: 따뜻하게 웅 울리는 맥박
  orb(c, o, t, lv) {
    const v = lvVol(lv, 0.075);
    tone(c, o, t, { f: 330, dur: 0.24, vol: v, attack: 0.02, lfo: 9, lfoDepth: 6 });
    tone(c, o, t, { f: 495, dur: 0.2, vol: v * 0.55, attack: 0.02 });
    if (lv >= 7) tone(c, o, t, { f: 165, dur: 0.26, vol: v * 0.8, attack: 0.02 });
    if (lv >= 8) tone(c, o, t, { type: "triangle", f: 990, dur: 0.16, vol: v * 0.3, attack: 0.02 });
    return 0.28;
  },
  // 폭탄 던짐: 휘익(작게)
  bombDrop(c, o, t, lv) { tone(c, o, t, { type: "triangle", f: 700, f2: 240, dur: 0.18, vol: lvVol(lv, 0.05) }); return 0.2; },
  // 폭탄 터짐: 크고 낮은 쾅
  bomb(c, o, t, lv) {
    const v = lvVol(lv, 0.24);
    tone(c, o, t, { type: "sine", f: 120, f2: 34, dur: 0.6, vol: v });
    hiss(c, o, t, { f: 2400, f2: 110, dur: 0.7, vol: v * 0.75, attack: 0.003 });
    tone(c, o, t, { type: "triangle", f: 240, f2: 60, dur: 0.25, vol: v * 0.4 });
    if (lv >= 7) tone(c, o, t + 0.02, { type: "sine", f: 62, f2: 30, dur: 0.8, vol: v * 0.8 });
    if (lv >= 8) for (let i = 0; i < 6; i++) hiss(c, o, t + 0.15 + Math.random() * 0.4, { type: "highpass", f: 3000, dur: 0.03, vol: v * 0.25, attack: 0.001 });
    return 0.85;
  },
  // 부메랑: 휘휘휘 도는 바람
  boom(c, o, t, lv) {
    const v = lvVol(lv, 0.1);
    hiss(c, o, t, { type: "bandpass", f: 900, dur: 0.7, vol: v, q: 3, attack: 0.12, lfo: 11, lfoDepth: 550 });
    tone(c, o, t, { type: "triangle", f: 420, dur: 0.6, vol: v * 0.3, attack: 0.1, lfo: 11, lfoDepth: 90 });
    if (lv >= 7) tone(c, o, t, { type: "triangle", f: 840, dur: 0.55, vol: v * 0.18, attack: 0.1, lfo: 11, lfoDepth: 160 });
    return 0.72;
  },
  // 맞힘: 아주 작은 톡
  hit(c, o, t) { tone(c, o, t, { type: "triangle", f: 1500 + Math.random() * 200, f2: 900, dur: 0.03, vol: 0.045 }); return 0.04; },
  // 적이 터짐: 뽁
  pop(c, o, t) {
    const k = 0.9 + Math.random() * 0.2;
    tone(c, o, t, { f: 420 * k, f2: 1000 * k, dur: 0.07, vol: 0.09 });
    hiss(c, o, t, { type: "highpass", f: 2200, dur: 0.05, vol: 0.04 });
    return 0.08;
  },
  bossHit(c, o, t) {
    tone(c, o, t, { type: "square", f: 190, f2: 120, dur: 0.09, vol: 0.06 });
    tone(c, o, t, { type: "triangle", f: 640, f2: 420, dur: 0.07, vol: 0.05 });
    return 0.1;
  },
  // 대장을 물리침: 큰 폭발 + 빰빠밤
  bossDown(c, o, t) {
    R.bomb(c, o, t, 8);
    const fan = [72, 76, 79, 84];
    fan.forEach((n, i) => { tone(c, o, t + 0.3 + i * 0.12, { type: "square", f: NOTE(n), dur: 0.14, vol: 0.06 }); tone(c, o, t + 0.3 + i * 0.12, { type: "triangle", f: NOTE(n), dur: 0.16, vol: 0.09 }); });
    for (const n of [84, 88, 91]) tone(c, o, t + 0.8, { type: "triangle", f: NOTE(n), dur: 0.8, vol: 0.07, attack: 0.01 });
    tone(c, o, t + 0.8, { type: "square", f: NOTE(60), dur: 0.6, vol: 0.05, attack: 0.01 });
    return 1.65;
  },
  // 비행기가 다침: 우웅(내려감)
  playerHit(c, o, t) {
    tone(c, o, t, { type: "square", f: 420, f2: 110, dur: 0.32, vol: 0.07 });
    tone(c, o, t, { type: "triangle", f: 300, f2: 80, dur: 0.36, vol: 0.12 });
    hiss(c, o, t, { f: 900, f2: 200, dur: 0.2, vol: 0.08 });
    return 0.38;
  },
  shieldOn(c, o, t) {
    tone(c, o, t, { f: 600, f2: 1500, dur: 0.32, vol: 0.08, attack: 0.02 });
    tone(c, o, t + 0.04, { type: "triangle", f: 900, f2: 2200, dur: 0.3, vol: 0.06, attack: 0.02, detune: 8 });
    tone(c, o, t + 0.2, { f: 1760, dur: 0.25, vol: 0.05 });
    return 0.46;
  },
  shieldBreak(c, o, t) {
    hiss(c, o, t, { type: "highpass", f: 3200, dur: 0.24, vol: 0.09, attack: 0.002 });
    tone(c, o, t, { f: 1300, f2: 320, dur: 0.3, vol: 0.08 });
    tone(c, o, t + 0.03, { type: "triangle", f: 2000, f2: 900, dur: 0.12, vol: 0.05 });
    return 0.32;
  },
  // 별(문제 상자)을 먹음: 딩-동
  star(c, o, t) {
    tone(c, o, t, { f: 1319, dur: 0.22, vol: 0.09 }); tone(c, o, t, { type: "triangle", f: 2638, dur: 0.12, vol: 0.025 });
    tone(c, o, t + 0.07, { f: 1976, dur: 0.3, vol: 0.09 }); tone(c, o, t + 0.07, { type: "triangle", f: 3952, dur: 0.14, vol: 0.02 });
    return 0.38;
  },
  // 무기 강화 축하음: 올라가는 빰빠밤 + 화음 + 반짝. 바로(0초) 시작한다. 단계가 높을수록 화음이 두꺼워진다.
  levelup(c, o, t, lv) {
    const up = [72, 76, 79, 84, 88];
    up.forEach((n, i) => { const s = t + i * 0.07; tone(c, o, s, { type: "square", f: NOTE(n), dur: 0.11, vol: 0.05 }); tone(c, o, s, { type: "triangle", f: NOTE(n), dur: 0.13, vol: 0.085 }); });
    const end = t + 0.36, chord = lv >= 7 ? [84, 88, 91, 96] : [84, 88, 91];
    for (const n of chord) tone(c, o, end, { type: "triangle", f: NOTE(n), dur: 0.6, vol: 0.065, attack: 0.01 });
    if (lv >= 4) tone(c, o, end, { type: "square", f: NOTE(48), dur: 0.5, vol: 0.05, attack: 0.01 });
    hiss(c, o, end, { type: "highpass", f: 6000, dur: 0.5, vol: 0.035, attack: 0.02 });
    return 0.98;
  },
  // 정답(보호막만 받을 때): 반짝 두 음
  correct(c, o, t) { tone(c, o, t, { type: "triangle", f: NOTE(79), dur: 0.16, vol: 0.09 }); tone(c, o, t + 0.09, { type: "triangle", f: NOTE(86), dur: 0.3, vol: 0.09 }); R.shieldOn(c, o, t + 0.1); return 0.6; },
  // 갈림길에서 무기를 골랐음: 딩딩 + 휙
  fork(c, o, t) {
    tone(c, o, t, { type: "triangle", f: NOTE(84), dur: 0.14, vol: 0.09 }); tone(c, o, t + 0.1, { type: "triangle", f: NOTE(91), dur: 0.3, vol: 0.09 });
    tone(c, o, t, { f: 500, f2: 1800, dur: 0.22, vol: 0.05 });
    return 0.42;
  },
  bossWarn(c, o, t) { for (const [i, f] of [[0, 220], [1, 165], [2, 220], [3, 165]]) tone(c, o, t + i * 0.24, { type: "square", f, dur: 0.22, vol: 0.05, attack: 0.02 }); return 1.0; },
  warn(c, o, t) { tone(c, o, t, { type: "square", f: 700, dur: 0.12, vol: 0.05 }); tone(c, o, t + 0.22, { type: "square", f: 700, dur: 0.12, vol: 0.05 }); return 0.36; },
  wrong(c, o, t) { tone(c, o, t, { f: 240, f2: 160, dur: 0.2, vol: 0.08 }); return 0.22; },
  tap(c, o, t) { tone(c, o, t, { type: "triangle", f: 1200, f2: 1500, dur: 0.06, vol: 0.06 }); return 0.07; },
};
// 소리마다 최소 간격(ms). 바탕 탄은 1초에 8번까지.
const GAP = { shot: 120, laser: 180, missile: 200, missileHit: 90, bolt: 120, orb: 140, bombDrop: 300, bomb: 150, boom: 250, hit: 70, pop: 45, bossHit: 200, bossDown: 0, playerHit: 200, shieldOn: 300, shieldBreak: 200, star: 80, levelup: 300, correct: 300, fork: 200, bossWarn: 1000, warn: 400, wrong: 300, tap: 80 };
// 꽉 찼을 때 오래된 소리를 밀어내고라도 꼭 나는 소리
const PRIO = new Set(["levelup", "correct", "fork", "bossDown", "playerHit", "shieldBreak", "shieldOn", "bossWarn", "bomb", "star"]);
// 문제 화면이 떠 있을 때도 나는 소리(정답 축하)
const GATE_OK = new Set(["levelup", "correct", "fork"]);

/* ---------- 엔진 ---------- */
let ac = null, comp = null, master = null, sfxBus = null, voiceBus = null;
let enabled = true, gated = false, unlocked = false, hiddenPaused = false;
const last = {}, voices = [], log = [], t0 = now();
let pilotId = null, clips = {}, loading = {}, shoutUntil = 0, lastShoutAt = -1e9, shoutSrc = null;

function record(e) { e.t = Math.round(now() - t0); log.push(e); if (log.length > 600) log.splice(0, log.length - 600); }
function chain(c) {
  const k = c.createDynamicsCompressor();
  k.threshold.value = -20; k.knee.value = 10; k.ratio.value = 8; k.attack.value = 0.002; k.release.value = 0.18;
  const m = c.createGain(); m.gain.value = VOL;
  const s = c.createGain(), v = c.createGain(); v.gain.value = 1.15;
  s.connect(k); v.connect(k); k.connect(m); m.connect(c.destination);
  return { comp: k, master: m, sfxBus: s, voiceBus: v };
}
function ensure() {
  if (SILENT || ac) return ac;
  try {
    const AC = W.AudioContext || W.webkitAudioContext; ac = new AC();
    ({ comp, master, sfxBus, voiceBus } = chain(ac));
    master.gain.value = enabled ? VOL : 0;
  } catch (_) { ac = null; }
  return ac;
}
// 손가락이 닿을 때마다 부른다(첫 번째에 만들고, 잠들어 있으면 깨운다).
export function unlock() {
  if (SILENT || !enabled) return;
  const c = ensure(); if (!c) return;
  try {
    if (c.state !== "running") c.resume().catch(() => {});
    if (!unlocked) { const b = c.createBuffer(1, 1, 22050), s = c.createBufferSource(); s.buffer = b; s.connect(c.destination); s.start(0); }   // 옛 iOS 깨우기
  } catch (_) {}
  unlocked = true;
  if (pilotId) loadPilot(pilotId);
}
// gesture: 손가락·클릭 처리 안에서 부를 때만 true(그때만 AudioContext 를 만들거나 깨운다).
export function setEnabled(on, gesture = false) {
  enabled = !!on;
  if (ac && master) { try { master.gain.setTargetAtTime(enabled ? VOL : 0, ac.currentTime, 0.02); } catch (_) {} }
  if (enabled && gesture) unlock();
  if (!enabled && shoutSrc) { try { shoutSrc.stop(); } catch (_) {} shoutSrc = null; }
  record({ name: "toggle", on: enabled });
}
export const isEnabled = () => enabled;
// 문제·갈림길 화면이 떠 있는 동안 true. 그동안은 정답 축하음만 난다.
export function gate(on) { gated = !!on; }

function prune(t) { for (let i = voices.length - 1; i >= 0; i--) if (voices[i].end <= t) voices.splice(i, 1); }
export function play(name, lv = 1) {
  const recipe = R[name]; if (!recipe) return false;
  const t = now(), e = { name, lv };
  if (!enabled) { e.blocked = "off"; record(e); return false; }
  if (gated && !GATE_OK.has(name)) { e.blocked = "gate"; record(e); return false; }
  if (t - (last[name] || -1e9) < (GAP[name] || 60)) { e.blocked = "rate"; record(e); return false; }
  prune(t);
  if (voices.length >= MAX_VOICES) {
    if (!PRIO.has(name)) { e.blocked = "cap"; record(e); return false; }
    const old = voices.findIndex(v => !v.prio); const victim = voices.splice(old >= 0 ? old : 0, 1)[0];
    if (victim && victim.gain && ac) { try { victim.gain.gain.setTargetAtTime(0, ac.currentTime, 0.008); } catch (_) {} }
    e.evicted = victim ? victim.name : null;
  }
  last[name] = t;
  let dur = 0.3, g = null;
  if (ac && ac.state === "running" && !hiddenPaused) {
    try { g = ac.createGain(); g.connect(sfxBus); dur = recipe(ac, g, ac.currentTime + 0.005, lv); setTimeout(() => { try { g.disconnect(); } catch (_) {} }, (dur + 0.3) * 1000); }
    catch (_) { g = null; }
  } else { e.silent = true; dur = DUR[name] || 0.3; }
  voices.push({ name, end: t + dur * 1000, gain: g, prio: PRIO.has(name) });
  e.voices = voices.length;
  record(e);
  return true;
}
const DUR = { shot: 0.1, laser: 0.17, missile: 0.42, missileHit: 0.32, bolt: 0.42, orb: 0.28, bombDrop: 0.2, bomb: 0.85, boom: 0.72, hit: 0.04, pop: 0.08, bossHit: 0.1, bossDown: 1.65, playerHit: 0.38, shieldOn: 0.46, shieldBreak: 0.32, star: 0.38, levelup: 0.98, correct: 0.6, fork: 0.42, bossWarn: 1.0, warn: 0.36, wrong: 0.22, tap: 0.07 };

/* ---------- 조종사 외침: 공통 표 assets/study/kid-voices.js(window.KidVoices.list)를 쓴다 ----------
   새 대사가 그 표에 들어가면 여기서도 바로 나온다. 표를 못 읽었을 때만 아래 옛 목록(plane/ 페이지 기준 경로)을 쓴다.
   재생은 이 파일의 AudioContext 로 한다(효과음과 같은 압축기·덕킹). 그 아이 목소리가 아닌 클립은 넣지 않는다. */
const VOICE_FALLBACK = {
  yunchan: [["../sanguo/audio/hero-callouts-eleven-v2/yunchan-callout-v2.wav", "마마보이!"], ["../cards/audio/attack-voices-v1/chanppul.mp3", "번개맨 천둥쇼!"]],
  jaei: [["../sanguo/audio/hero-callouts-eleven-v2/jaei-callout-v2.wav", "김태오!"], ["../sanguo/audio/family-skills-v1/jaei-special-eleven-no-v1.mp3", "아니야!"],
    ["../sanguo/audio/family-skills-v1/jaei-special-eleven-wait-v1.mp3", "기다려!"], ["../sanguo/audio/family-skills-v1/jaei-special-eleven-sireo-v1.mp3", "시러!"],
    ["../cards/audio/attack-voices-v1/jaewing.mp3", "바이킹 그네 밀기!"]],
  yungeon: [["../sanguo/audio/hero-callouts-eleven-v2/yungeon-callout-v2.wav", "너무 쉽잖아!"], ["../cards/audio/attack-voices-v1/geonppul.mp3", "헐크 박치기!"]],
  taeo: [["../sanguo/audio/family-skills-v1/taeo-special-eleven-sseugumi-only-v1.mp3", "쓰구미!"], ["../sanguo/audio/family-skills-v1/taeo-special-eleven-fight-v1.mp3", "싸우자!"],
    ["../sanguo/audio/family-skills-v1/taeo-special-eleven-kiap-v1.mp3", "치앗! 촤! 치앗! 촤!"], ["../sanguo/audio/family-skills-v1/taeo-special-eleven-meganaptor-v1.mp3", "메가냅터킥!"],
    ["../sanguo/audio/family-skills-v1/taeo-special-eleven-yummy-v1.mp3", "맛있는 거죠!"]],
};
const VOICE = {};
for (const id of Object.keys(VOICE_FALLBACK)) {
  let l = null;
  try { const KV = W && W.KidVoices; l = KV && KV.list ? KV.list(id) : null; } catch (_) { l = null; }
  VOICE[id] = l && l.length ? l : VOICE_FALLBACK[id];
}
const lastPick = {};
export function setPilot(id) {
  if (id === pilotId) return;
  pilotId = id;
  if (unlocked) loadPilot(id);
}
function loadPilot(id) {
  if (SILENT || !ac || loading[id] || !VOICE[id]) return;
  loading[id] = true; clips[id] = clips[id] || {};
  VOICE[id].forEach(([url], i) => {
    fetch(url).then(r => (r.ok ? r.arrayBuffer() : Promise.reject(r.status)))
      .then(buf => new Promise((ok, no) => { const p = ac.decodeAudioData(buf, ok, no); if (p && p.catch) p.catch(no); }))
      .then(b => {                                                  // 클립마다 크기가 달라(최고 -9~0dB) 최고값을 맞춘다
        let p = 0; const d = b.getChannelData(0); for (let k = 0; k < d.length; k += 2) p = Math.max(p, Math.abs(d[k]));
        clips[id][i] = { buf: b, gain: Math.min(2.5, 0.85 / Math.max(0.05, p)) };
      }).catch(() => {});                                           // 없거나 못 읽으면 조용히 넘어간다
  });
}
// 같은 클립이 두 번 연달아 나오지 않게 무작위로 고른다.
function pick(id) {
  const n = VOICE[id] ? VOICE[id].length : 0; if (!n) return -1;
  let i = Math.floor(Math.random() * n);
  if (n > 1 && i === lastPick[id]) i = (i + 1 + Math.floor(Math.random() * (n - 1))) % n;
  lastPick[id] = i; return i;
}
// event: 무엇 때문에 외치는가(upgrade·fork·shield·bomb·bossDown·boss 등, 기록용).
// force: 정답 보상(무기 강화·갈래 고르기·보호막)과 대장 물리침 — 4.5초 간격을 건너뛰고 문제 화면 중에도 난다. 하던 외침은 끊는다(겹치지 않음).
// 그 밖(폭탄 터짐·대장 등장)은 4.5초에 한 번까지, 다른 외침이 끝난 뒤에만.
export function shout(event, force = false) {
  const t = now(), e = { name: "shout", event, pilot: pilotId, force };
  if (!enabled) { e.blocked = "off"; record(e); return false; }
  if (!pilotId || !VOICE[pilotId]) { e.blocked = "none"; record(e); return false; }
  if (!force) {
    if (gated) { e.blocked = "gate"; record(e); return false; }
    if (t < shoutUntil) { e.blocked = "busy"; record(e); return false; }
    if (t - lastShoutAt < SHOUT_GAP) { e.blocked = "gap"; record(e); return false; }
  }
  if (shoutSrc) { try { shoutSrc.stop(); } catch (_) {} shoutSrc = null; e.cut = true; }
  const i = pick(pilotId), clip = clips[pilotId] && clips[pilotId][i];
  e.line = VOICE[pilotId][i][1];
  let dur = 1.6;
  if (clip && ac && ac.state === "running" && !hiddenPaused) {
    try {
      const s = ac.createBufferSource(), g = ac.createGain(); s.buffer = clip.buf; g.gain.value = clip.gain; s.connect(g); g.connect(voiceBus);
      const at = ac.currentTime + 0.01; s.start(at); shoutSrc = s; dur = clip.buf.duration;
      s.onended = () => { if (shoutSrc === s) shoutSrc = null; };
      sfxBus.gain.cancelScheduledValues(at); sfxBus.gain.setTargetAtTime(0.5, at, 0.03); sfxBus.gain.setTargetAtTime(1, at + dur, 0.08);   // 외침이 잘 들리게 효과음을 잠깐 줄인다
    } catch (_) { e.silent = true; }
  } else e.silent = true;
  e.clip = !!clip; e.dur = Math.round(dur * 1000) / 1000;
  lastShoutAt = t; shoutUntil = t + dur * 1000;
  record(e);
  return true;
}

/* ---------- 화면이 가려지면 쉬기 ---------- */
if (W && W.document) W.document.addEventListener("visibilitychange", () => {
  if (!ac) return;
  try { if (W.document.hidden) { hiddenPaused = true; ac.suspend(); } else { hiddenPaused = false; if (enabled) ac.resume().catch(() => {}); } } catch (_) {}
});

/* ---------- 점검용(?qa=1) ---------- */
export const qa = {
  log: () => log.slice(),
  clear: () => { log.length = 0; },
  voices: () => { prune(now()); return voices.length; },
  state: () => ({ silent: SILENT, ctx: ac ? ac.state : null, enabled, gated, unlocked, pilot: pilotId, loaded: Object.keys(clips[pilotId] || {}).length }),
  voiceTable: () => JSON.parse(JSON.stringify(VOICE)),
  names: () => Object.keys(R),
  // 소리 하나를 OfflineAudioContext 로 실제 만들어 최고값을 잰다(같은 압축기·볼륨 사슬을 거친다).
  async render(name, lv = 1) {
    const OAC = W && (W.OfflineAudioContext || W.webkitOfflineAudioContext); if (!OAC || !R[name]) return null;
    const c = new OAC(1, 44100 * 2, 44100), ch = chain(c), g = c.createGain(); g.connect(ch.sfxBus);
    const dur = R[name](c, g, 0.01, lv), buf = await c.startRendering(), d = buf.getChannelData(0);
    let peak = 0, sum = 0; for (let i = 0; i < d.length; i++) { const a = Math.abs(d[i]); if (a > peak) peak = a; sum += d[i] * d[i]; }
    return { name, lv, dur, peak: +peak.toFixed(4), rms: +Math.sqrt(sum / d.length).toFixed(5) };
  },
  // 조종사 클립을 받아 풀어 본다(길이·최고값).
  async clipCheck(id) {
    const OAC = W && (W.OfflineAudioContext || W.webkitOfflineAudioContext); if (!OAC) return null;
    const c = new OAC(1, 44100, 44100), out = [];
    for (const [url, line] of VOICE[id] || []) {
      try {
        const r = await fetch(url); if (!r.ok) { out.push({ url, line, error: "missing " + r.status }); continue; }
        const b = await c.decodeAudioData(await r.arrayBuffer()), d = b.getChannelData(0); let p = 0; for (let i = 0; i < d.length; i++) p = Math.max(p, Math.abs(d[i]));
        out.push({ url, line, dur: +b.duration.toFixed(3), peak: +p.toFixed(3) });
      } catch (err) { out.push({ url, line, error: String(err) }); }
    }
    return out;
  },
};
