// 운동회 효과음: Web Audio 로 그 자리에서 합성(파일 없음). speechSynthesis 는 절대 쓰지 않는다(아이패드 마이크가 죽는다).
// AudioContext 는 첫 손가락 입력 때 하나만 만들고 깨운다(iOS 는 입력 처리 안에서 만들어야 소리가 난다).
// Node·자동 검증 브라우저(navigator.webdriver)에서는 아무것도 안 한다.
// 해설(아나운서) 목소리 자리: voice(key) — 지금은 VOICE_CLIPS 가 비어 있어 효과음만 난다. 녹음 클립이 생기면 표에 주소만 넣는다.
const OK = typeof window !== "undefined" && !(typeof navigator !== "undefined" && navigator.webdriver);
const VOICE_MAX = 28;
let ac = null, master = null, on = true, voices = 0, noiseBuf = null;
const last = {};
export const VOICE_CLIPS = {};   // 예: { nice: "audio/nice.mp3" } — 비어 있으면 무음
const clipCache = {};

export function setOn(v) { on = !!v; if (master) master.gain.value = on ? 0.6 : 0; }
export function isOn() { return on; }
export function context() { return ac; }
export function output() { return master; }
export function unlock() {
  if (!OK) return null;
  if (!ac) {
    const AC = window.AudioContext || window.webkitAudioContext; if (!AC) return null;
    try {
      ac = new AC();
      const comp = ac.createDynamicsCompressor();
      comp.threshold.value = -14; comp.knee.value = 10; comp.ratio.value = 5; comp.attack.value = 0.003; comp.release.value = 0.2;
      master = ac.createGain(); master.gain.value = on ? 0.6 : 0;
      master.connect(comp); comp.connect(ac.destination);
    } catch (_) { ac = null; return null; }
  }
  if (ac.state === "suspended") ac.resume().catch(() => {});
  return ac;
}
const ready = () => (OK && on && ac && ac.state === "running" ? ac : null);
function gap(k, ms) { const now = performance.now(); if (now - (last[k] || 0) < ms) return false; last[k] = now; return true; }
function tone(freq, dur, type = "sine", vol = 0.1, slide = 0, at = 0) {
  const a = ready(); if (!a || voices >= VOICE_MAX) return;
  const o = a.createOscillator(), g = a.createGain(), t = a.currentTime + at;
  o.type = type; o.frequency.setValueAtTime(freq, t);
  if (slide) o.frequency.exponentialRampToValueAtTime(Math.max(30, slide), t + dur);
  g.gain.setValueAtTime(0.0001, t); g.gain.linearRampToValueAtTime(vol, t + 0.01); g.gain.exponentialRampToValueAtTime(0.0008, t + dur);
  o.connect(g); g.connect(master); o.start(t); o.stop(t + dur + 0.03);
  voices++; o.onended = () => { voices--; try { g.disconnect(); } catch (_) {} };
}
function noise(dur, vol = 0.1, from = 800, to = 3000, at = 0, q = 1.1, type = "bandpass") {
  const a = ready(); if (!a || voices >= VOICE_MAX) return;
  if (!noiseBuf) { noiseBuf = a.createBuffer(1, a.sampleRate * 1.2, a.sampleRate); const d = noiseBuf.getChannelData(0); for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1; }
  const s = a.createBufferSource(), f = a.createBiquadFilter(), g = a.createGain(), t = a.currentTime + at;
  s.buffer = noiseBuf; s.loop = true; f.type = type; f.Q.value = q;
  f.frequency.setValueAtTime(from, t); f.frequency.exponentialRampToValueAtTime(Math.max(40, to), t + dur);
  g.gain.setValueAtTime(0.0001, t); g.gain.linearRampToValueAtTime(vol, t + Math.min(0.08, dur * 0.3)); g.gain.exponentialRampToValueAtTime(0.0008, t + dur);
  s.connect(f); f.connect(g); g.connect(master); s.start(t); s.stop(t + dur + 0.03);
  voices++; s.onended = () => { voices--; try { g.disconnect(); } catch (_) {} };
}
const C = [523, 587, 659, 698, 784, 880, 988, 1047, 1175, 1319, 1397, 1568, 1760, 2093];

export const sfx = {
  click: () => { tone(880, 0.06, "triangle", 0.07, 1200); },
  jump: () => { if (!gap("jump", 60)) return; tone(330, 0.16, "square", 0.045, 660); tone(660, 0.1, "sine", 0.04, 990, 0.02); },
  bigjump: () => { tone(392, 0.28, "square", 0.05, 1175); tone(784, 0.2, "triangle", 0.05, 1568, 0.05); },
  whoosh: (fast = 1) => { if (!gap("whoosh", 120)) return; noise(0.22 / fast, 0.07, 500, 2600, 0, 1.6); },
  ok: (combo = 0) => { const n = C[Math.min(C.length - 1, combo % 10)]; tone(n, 0.12, "triangle", 0.08); tone(n * 2, 0.08, "sine", 0.03, 0, 0.02); },
  perfect: () => { [0, 4, 7, 11].forEach((k, i) => tone(C[Math.min(13, 5 + i)], 0.22, "sine", 0.06, 0, i * 0.04)); noise(0.3, 0.03, 4000, 9000, 0, 2, "highpass"); },
  combo: n => { const base = 4 + Math.min(6, Math.floor(n / 5)); for (let i = 0; i < 4; i++) tone(C[Math.min(13, base + i)], 0.12, "square", 0.04, 0, i * 0.06); },
  miss: () => { tone(220, 0.08, "square", 0.08, 160); tone(180, 0.35, "sawtooth", 0.06, 70, 0.06); noise(0.2, 0.06, 300, 120, 0.02, 0.8, "lowpass"); },
  save: () => { for (let i = 0; i < 6; i++) tone(C[6 + i], 0.18, "sine", 0.05, 0, i * 0.035); },
  double: () => { sfx.bigjump(); [0, 2, 4, 7].forEach((k, i) => tone(C[k + 5], 0.3, "square", 0.05, 0, 0.08 + i * 0.07)); sfx.crowd(1.2); },
  enter: () => { tone(523, 0.1, "triangle", 0.07); tone(784, 0.14, "triangle", 0.07, 0, 0.08); },
  bonk: () => { tone(150, 0.2, "square", 0.08, 90); },
  join: () => { tone(659, 0.1, "square", 0.05); tone(880, 0.1, "square", 0.05, 0, 0.1); tone(1047, 0.18, "square", 0.05, 0, 0.2); noise(0.25, 0.04, 2000, 600, 0.05); },
  beep: (hi = false) => { tone(hi ? 1320 : 660, hi ? 0.32 : 0.14, "square", 0.06); },
  whistle: () => { const a = ready(); if (!a) return; tone(2100, 0.5, "sine", 0.06, 2200); for (let i = 0; i < 8; i++) tone(i % 2 ? 2350 : 2050, 0.05, "sine", 0.035, 0, 0.02 + i * 0.055); noise(0.5, 0.025, 3000, 3500, 0, 4); },
  crowd: (power = 1) => { if (!gap("crowd", 250)) return; noise(1.1 * power, 0.07 * power, 900, 1600, 0, 0.6); noise(0.9 * power, 0.05 * power, 2400, 1800, 0.08, 0.8); for (let i = 0; i < 5; i++) tone(700 + Math.random() * 900, 0.08, "triangle", 0.012, 0, Math.random() * 0.6); },
  rainbow: () => { for (let i = 0; i < 10; i++) tone(C[i + 2], 0.25, i % 2 ? "triangle" : "sine", 0.06, 0, i * 0.045); noise(0.6, 0.04, 3000, 9000, 0, 1.4, "highpass"); },
  fanfare: () => {
    const seq = [[523, 0], [659, 0.12], [784, 0.24], [1047, 0.38], [784, 0.62], [1047, 0.74]];
    for (const [f, at] of seq) { tone(f, 0.22, "sawtooth", 0.045, 0, at); tone(f / 2, 0.22, "square", 0.03, 0, at); }
    tone(1047, 0.9, "sawtooth", 0.04, 0, 0.86); tone(1319, 0.9, "sawtooth", 0.035, 0, 0.86); tone(1568, 0.9, "sawtooth", 0.03, 0, 0.86);
  },
  medal: (kind = "gold") => { const b = kind === "gold" ? 1568 : kind === "silver" ? 1319 : 1047; [0, 0.09, 0.18].forEach((at, i) => tone(b * (1 + i * 0.25), 0.6, "sine", 0.06, 0, at)); },
  drumroll: (dur = 1.2) => { for (let i = 0; i < dur * 22; i++) noise(0.05, 0.03 + 0.02 * (i / (dur * 22)), 180, 160, i / 22, 0.7, "lowpass"); },
  turn: () => { tone(784, 0.12, "triangle", 0.07); tone(1047, 0.12, "triangle", 0.07, 0, 0.1); tone(1319, 0.22, "triangle", 0.07, 0, 0.2); },
  pop: () => { tone(1200, 0.05, "sine", 0.05, 600); },
  // 해설 목소리 자리(지금은 클립 없음 → 무음). key 예: "ready", "go", "nice", "perfect", "double", "gold", "teamWin"
  voice: key => {
    const url = VOICE_CLIPS[key]; if (!url || !OK || !on) return;
    try { const el = clipCache[key] || (clipCache[key] = new Audio(url)); el.currentTime = 0; el.play().catch(() => {}); } catch (_) {}
  },
};
