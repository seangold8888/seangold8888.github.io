// 딥 다이브 효과음: Web Audio 로 그 자리에서 합성(파일 없음, 음성 합성 금지 — 아이패드 마이크가 죽는다).
// AudioContext 는 첫 손가락/키 입력 때 하나만 만들고 깨운다. 모든 소리는 master → compressor → 스피커.
// 동시에 울리는 소리는 VOICE_MAX 개까지, 같은 종류는 간격을 둔다. Node·자동 검증 브라우저(navigator.webdriver)에서는 아무것도 안 한다.
const OK = typeof window !== "undefined" && !(typeof navigator !== "undefined" && navigator.webdriver);
const VOICE_MAX = 18;
let ac = null, master = null, on = true, pitch = 1, voices = 0;
const last = {};
export function setOn(v) { on = !!v; if (master) master.gain.value = on ? 0.55 : 0; }
export function setPitch(p) { pitch = p; }           // 무지개 터보 동안 1.25
// 첫 사용자 입력에서 부른다(iOS 는 입력 처리 안에서 만들어야 소리가 난다).
export function unlock() {
  if (!OK || !on) return null;
  if (!ac) {
    const AC = window.AudioContext || window.webkitAudioContext; if (!AC) return null;
    try {
      ac = new AC();
      const comp = ac.createDynamicsCompressor();
      comp.threshold.value = -16; comp.knee.value = 12; comp.ratio.value = 6; comp.attack.value = 0.003; comp.release.value = 0.15;
      master = ac.createGain(); master.gain.value = 0.55;
      master.connect(comp); comp.connect(ac.destination);
    } catch (_) { ac = null; return null; }
  }
  if (ac.state === "suspended") ac.resume().catch(() => {});
  return ac;
}
const ready = () => (OK && on && ac && ac.state === "running" ? ac : null);
function gap(k, ms) { const now = performance.now(); if (now - (last[k] || 0) < ms) return false; last[k] = now; return true; }
// 짧은 음 하나: freq Hz, dur 초, type 파형, vol, slide 끝 주파수, at 몇 초 뒤
function tone(freq, dur, type = "sine", vol = 0.1, slide = 0, at = 0) {
  const a = ready(); if (!a || voices >= VOICE_MAX) return;
  const o = a.createOscillator(), g = a.createGain(), t = a.currentTime + at, f = freq * pitch;
  o.type = type; o.frequency.setValueAtTime(f, t);
  if (slide) o.frequency.exponentialRampToValueAtTime(Math.max(30, slide * pitch), t + dur);
  g.gain.setValueAtTime(0.0001, t); g.gain.linearRampToValueAtTime(vol, t + 0.008); g.gain.exponentialRampToValueAtTime(0.0008, t + dur);
  o.connect(g); g.connect(master); o.start(t); o.stop(t + dur + 0.03);
  voices++; o.onended = () => { voices--; try { g.disconnect(); } catch (_) {} };
}
// 쉬익 소리(흰 소음 한 번 만들어 두고 재사용)
let noiseBuf = null;
function noise(dur, vol = 0.1, from = 800, to = 3000, at = 0) {
  const a = ready(); if (!a || voices >= VOICE_MAX) return;
  if (!noiseBuf) { noiseBuf = a.createBuffer(1, a.sampleRate * 0.6, a.sampleRate); const d = noiseBuf.getChannelData(0); for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1; }
  const s = a.createBufferSource(), f = a.createBiquadFilter(), g = a.createGain(), t = a.currentTime + at;
  s.buffer = noiseBuf; f.type = "bandpass"; f.Q.value = 1.2;
  f.frequency.setValueAtTime(from * pitch, t); f.frequency.exponentialRampToValueAtTime(to * pitch, t + dur);
  g.gain.setValueAtTime(0.0001, t); g.gain.linearRampToValueAtTime(vol, t + 0.02); g.gain.exponentialRampToValueAtTime(0.0008, t + dur);
  s.connect(f); f.connect(g); g.connect(master); s.start(t); s.stop(t + dur + 0.03);
  voices++; s.onended = () => { voices--; try { g.disconnect(); } catch (_) {} };
}
const NOTES = [523, 587, 659, 784, 880, 1047, 1175, 1319, 1568, 1760];
export const sfx = {
  // 두두두: 높은 틱 + 낮은 퉁(층 두 개)
  shot: () => { if (gap("shot", 95)) { tone(1300 + Math.random() * 200, 0.035, "sine", 0.03, 800); tone(190, 0.07, "triangle", 0.045, 110); } },
  // 씻김 '뽁': 콤보가 이어질수록 음이 올라간다(10칸 뒤 처음으로)
  wash: combo => { if (gap("wash", 50)) { const n = NOTES[Math.min(NOTES.length - 1, Math.floor((combo || 1) / 3) % NOTES.length)]; tone(n, 0.08, "triangle", 0.06, n * 1.5); } },
  pop: () => { if (gap("pop", 140)) { tone(300, 0.14, "sine", 0.1, 900); noise(0.12, 0.05, 1200, 400); } },
  // 연쇄 뽁: 콤보가 클수록 높게
  chain: combo => { if (gap("chain", 70)) { const f = 500 + Math.min(30, (combo || 0) % 40) * 40; tone(f, 0.06, "sine", 0.045, f * 1.6); } },
  // 빛 방울 딩: 연달아 먹으면 음계가 올라간다
  orb: n => { if (gap("orb", 60)) { const f = NOTES[Math.min(NOTES.length - 1, ((n || 1) - 1) % NOTES.length)] * 2; tone(f, 0.05, "sine", 0.035); } },
  // 한 번에 여러 마리: 낮은 쿵(단계가 높을수록 길고 크게)
  thud: tier => { tone(95, 0.35 + tier * 0.1, "sine", 0.22, 38); noise(0.22, 0.08 + tier * 0.03, 300, 90); if (tier >= 1) [784, 1047, 1319].slice(0, tier + 1).forEach((f, i) => tone(f, 0.12, "triangle", 0.06, 0, 0.08 + i * 0.06)); },
  tier: t => [659, 880, 1175, 1568].slice(0, t + 2).forEach((f, i) => tone(f, 0.1, "square", 0.04, 0, i * 0.05)),
  // 터보 중 베이스 리듬(쿵·짝·쿵쿵)
  bass: i => { const k = i % 4; if (k === 1 || k === 3) noise(0.05, 0.04, 4000, 6000); tone(k === 2 ? 98 : 73, 0.16, "triangle", 0.11, 55); },
  dash: () => { noise(0.28, 0.16, 500, 3500); tone(220, 0.22, "sawtooth", 0.035, 660); },
  fever: () => { [523, 659, 784, 1047, 1319, 1568].forEach((f, i) => tone(f, 0.16, "square", 0.045, 0, i * 0.06)); noise(0.5, 0.06, 2000, 6000, 0.1); },
  feverEnd: () => tone(880, 0.25, "triangle", 0.05, 440),
  event: () => { tone(392, 0.14, "square", 0.06); tone(523, 0.14, "square", 0.06, 0, 0.12); tone(784, 0.3, "square", 0.06, 0, 0.24); },
  bossHit: () => { if (gap("bosshit", 120)) { tone(110, 0.14, "square", 0.07, 70); noise(0.08, 0.05, 300, 200); } },
  fanfare: big => { tone(big ? 196 : 262, 0.45, "sine", 0.12, big ? 880 : 660); [784, 988, 1175, 1568].forEach((f, i) => tone(f, 0.18, "triangle", 0.09, 0, 0.12 + i * 0.08)); if (big) noise(0.6, 0.08, 400, 5000, 0.05); },
  pearl: () => { tone(880, 0.1, "sine", 0.1); tone(1320, 0.16, "sine", 0.1, 0, 0.09); },
  up: () => [523, 659, 784, 1047].forEach((f, i) => tone(f, 0.15, "triangle", 0.1, 0, i * 0.085)),
  no: () => tone(220, 0.18, "sine", 0.09, 160),
  hurt: () => tone(180, 0.3, "sawtooth", 0.09, 70),
  boss: () => { tone(110, 0.6, "square", 0.07, 70); tone(98, 0.6, "square", 0.06, 60, 0.3); },
  zap: () => { if (gap("zap", 120)) tone(1500, 0.05, "square", 0.02, 700); },
  light: () => { if (gap("light", 300)) tone(660, 0.25, "sine", 0.04, 990); },
  warn: () => { tone(700, 0.1, "square", 0.05); tone(700, 0.1, "square", 0.05, 0, 0.2); },
  gold: () => [1047, 1319, 1568, 2093].forEach((f, i) => tone(f, 0.12, "sine", 0.07, 0, i * 0.05)),
  whale: () => { tone(160, 0.9, "sine", 0.09, 120); tone(240, 0.7, "sine", 0.05, 200, 0.3); },
  win: () => [523, 659, 784, 1047, 1319].forEach((f, i) => tone(f, 0.2, "triangle", 0.11, 0, i * 0.11)),
};
export const stats = () => ({ ctx: ac ? ac.state : "none", voices, on, pitch });
