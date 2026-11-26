// 축구 전용 효과음(WebAudio 합성, 파일 없음). 공용 sfx.js 의 AudioContext·출력(소리 켜기/끄기 포함)을 그대로 빌려 쓴다.
// 자동 검증 브라우저·Node 에서는 context() 가 null 이라 아무 소리도 안 난다. speechSynthesis 는 쓰지 않는다.
import { context, output, isOn } from "../sfx.js?v=1";

let noiseBuf = null, voices = 0;
const MAX = 24;
function ac() { const a = context(); return a && a.state === "running" && isOn() && output() ? a : null; }
function tone(freq, dur, type = "sine", vol = 0.1, slide = 0, at = 0) {
  const a = ac(); if (!a || voices >= MAX) return;
  const o = a.createOscillator(), g = a.createGain(), t = a.currentTime + at;
  o.type = type; o.frequency.setValueAtTime(freq, t);
  if (slide) o.frequency.exponentialRampToValueAtTime(Math.max(30, slide), t + dur);
  g.gain.setValueAtTime(0.0001, t); g.gain.linearRampToValueAtTime(vol, t + 0.006); g.gain.exponentialRampToValueAtTime(0.0008, t + dur);
  o.connect(g); g.connect(output()); o.start(t); o.stop(t + dur + 0.03);
  voices++; o.onended = () => { voices--; try { g.disconnect(); } catch (_) {} };
}
function noise(dur, vol = 0.1, from = 800, to = 3000, at = 0, q = 1, type = "bandpass") {
  const a = ac(); if (!a || voices >= MAX) return;
  if (!noiseBuf) { noiseBuf = a.createBuffer(1, a.sampleRate * 1.5, a.sampleRate); const d = noiseBuf.getChannelData(0); for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1; }
  const s = a.createBufferSource(), f = a.createBiquadFilter(), g = a.createGain(), t = a.currentTime + at;
  s.buffer = noiseBuf; s.loop = true; f.type = type; f.Q.value = q;
  f.frequency.setValueAtTime(from, t); f.frequency.exponentialRampToValueAtTime(Math.max(40, to), t + dur);
  g.gain.setValueAtTime(0.0001, t); g.gain.linearRampToValueAtTime(vol, t + Math.min(0.03, dur * 0.3)); g.gain.exponentialRampToValueAtTime(0.0008, t + dur);
  s.connect(f); f.connect(g); g.connect(output()); s.start(t); s.stop(t + dur + 0.03);
  voices++; s.onended = () => { voices--; try { g.disconnect(); } catch (_) {} };
}

export const ssfx = {
  // 뻥! 공 차는 소리(세기에 따라)
  kick: (p = 1) => { tone(140, 0.16, "sine", 0.16 * Math.min(1.2, p + 0.3), 55); noise(0.07, 0.12, 2500, 900, 0, 0.9); tone(420, 0.05, "triangle", 0.05, 200); },
  // 슝~ 공 날아가는 바람(불꽃 슛은 길게)
  fly: (T = 0.6, fire = false) => { noise(T, fire ? 0.08 : 0.045, fire ? 400 : 900, fire ? 3200 : 2400, 0, 1.4); if (fire) { noise(T + 0.2, 0.05, 200, 900, 0, 0.6, "lowpass"); for (let i = 0; i < 8; i++) tone(300 + Math.random() * 500, 0.04, "square", 0.012, 0, Math.random() * T); } },
  // 출렁! 그물
  net: () => { noise(0.5, 0.12, 4000, 700, 0, 0.7); noise(0.3, 0.06, 900, 300, 0.05, 0.8, "lowpass"); },
  // 땡! 골대
  post: () => { [880, 1320, 2050, 2770].forEach((f, i) => tone(f, 0.9 - i * 0.15, "sine", 0.07 - i * 0.012, f * 0.98)); noise(0.05, 0.1, 5000, 3000, 0, 2); },
  // 퍽! 골키퍼 장갑
  save: () => { noise(0.12, 0.16, 1200, 300, 0, 0.8); tone(180, 0.12, "triangle", 0.08, 90); },
  // 골! 팡파르(짧고 신나게)
  goal: (big = false) => {
    const seq = big ? [523, 659, 784, 1047, 1319, 1568] : [523, 659, 784, 1047];
    seq.forEach((f, i) => { tone(f, 0.18, "square", 0.045, 0, i * 0.07); tone(f * 2, 0.12, "sine", 0.025, 0, i * 0.07 + 0.01); });
    tone(seq[seq.length - 1], 0.6, "sawtooth", 0.035, 0, seq.length * 0.07);
  },
  // 우와아~(아까울 때 관중)
  ooh: () => { noise(0.9, 0.06, 700, 400, 0, 0.7); tone(520, 0.7, "triangle", 0.02, 300); },
  // 불꽃 붙는 소리
  ignite: () => { noise(0.7, 0.12, 300, 5000, 0, 0.9); tone(220, 0.5, "sawtooth", 0.05, 880); for (let i = 0; i < 10; i++) noise(0.03, 0.05, 3000, 2000, Math.random() * 0.6, 3); },
  // 느림보(뿌우우~ 내려가는 소리)
  slow: () => { tone(500, 0.9, "triangle", 0.07, 160); tone(505, 0.9, "sine", 0.04, 165, 0.05); },
  // 조준 틱(미끄럼 과녁·쓱 조준)
  tick: () => { tone(1500, 0.03, "sine", 0.025); },
};
