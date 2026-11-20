// 야구 전용 효과음(Web Audio 합성, 파일 없음). 공용 sfx.js 의 AudioContext·출력을 같이 쓴다(공용 파일은 건드리지 않음).
// 딱!(방망이) · 퍽(포수 미트) · 펑(불꽃놀이) · 쉭(공이 날아감). 자동 검증 브라우저·소리 끔이면 아무것도 안 한다.
import { context, output, isOn } from "../sfx.js?v=1";

const OK = typeof window !== "undefined" && !(typeof navigator !== "undefined" && navigator.webdriver);
let buf = null;
function ready() {
  const a = context();
  if (!OK || !isOn() || !a || a.state !== "running" || !output()) return null;
  if (!buf) { buf = a.createBuffer(1, a.sampleRate, a.sampleRate); const d = buf.getChannelData(0); for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1; }
  return a;
}
function noise(a, { at = 0, dur = 0.1, vol = 0.2, type = "highpass", f0 = 2000, f1 = 2000, q = 0.8 }) {
  const t = a.currentTime + at, s = a.createBufferSource(), f = a.createBiquadFilter(), g = a.createGain();
  s.buffer = buf; s.loop = true; f.type = type; f.Q.value = q;
  f.frequency.setValueAtTime(f0, t); f.frequency.exponentialRampToValueAtTime(Math.max(40, f1), t + dur);
  g.gain.setValueAtTime(0.0001, t); g.gain.linearRampToValueAtTime(vol, t + 0.004); g.gain.exponentialRampToValueAtTime(0.0008, t + dur);
  s.connect(f); f.connect(g); g.connect(output()); s.start(t); s.stop(t + dur + 0.05);
  s.onended = () => { try { g.disconnect(); } catch (_) {} };
}
function tone(a, { at = 0, dur = 0.1, vol = 0.1, f0 = 440, f1 = 0, type = "sine" }) {
  const t = a.currentTime + at, o = a.createOscillator(), g = a.createGain();
  o.type = type; o.frequency.setValueAtTime(f0, t); if (f1) o.frequency.exponentialRampToValueAtTime(Math.max(30, f1), t + dur);
  g.gain.setValueAtTime(0.0001, t); g.gain.linearRampToValueAtTime(vol, t + 0.004); g.gain.exponentialRampToValueAtTime(0.0008, t + dur);
  o.connect(g); g.connect(output()); o.start(t); o.stop(t + dur + 0.05);
  o.onended = () => { try { g.disconnect(); } catch (_) {} };
}

export const bb = {
  // 딱! power 0~1(장외 홈런 = 1: 더 크고 길게 울림)
  crack(power = 0.6) {
    const a = ready(); if (!a) return;
    noise(a, { dur: 0.05 + power * 0.04, vol: 0.32 + power * 0.2, type: "highpass", f0: 2600, f1: 1400, q: 0.7 });
    tone(a, { dur: 0.09 + power * 0.08, vol: 0.18 + power * 0.1, f0: 1900 + power * 500, f1: 700, type: "triangle" });
    tone(a, { dur: 0.16, vol: 0.18, f0: 180, f1: 60, type: "sine" });
    if (power > 0.8) noise(a, { at: 0.05, dur: 0.5, vol: 0.06, type: "bandpass", f0: 3000, f1: 1200, q: 3 });
  },
  // 퍽(공이 미트에)
  mitt() { const a = ready(); if (!a) return; noise(a, { dur: 0.12, vol: 0.3, type: "lowpass", f0: 900, f1: 200, q: 0.9 }); tone(a, { dur: 0.1, vol: 0.12, f0: 140, f1: 70 }); },
  // 쉭(던진 공)
  pitch(fast = 1) { const a = ready(); if (!a) return; noise(a, { dur: 0.32 / fast, vol: 0.06, type: "bandpass", f0: 700, f1: 2400, q: 1.6 }); },
  // 붕(헛스윙)
  whiff() { const a = ready(); if (!a) return; noise(a, { dur: 0.2, vol: 0.09, type: "bandpass", f0: 1600, f1: 400, q: 1.2 }); },
  // 펑! 불꽃놀이(조금씩 늦게)
  boom(at = 0) {
    const a = ready(); if (!a) return;
    noise(a, { at, dur: 0.5, vol: 0.18, type: "lowpass", f0: 600, f1: 90, q: 0.7 });
    for (let i = 0; i < 6; i++) noise(a, { at: at + 0.12 + Math.random() * 0.35, dur: 0.04, vol: 0.05, type: "highpass", f0: 4000, f1: 6000, q: 1 });
  },
  // 휘이잉(공이 하늘 높이)
  soar(dur = 1.4) { const a = ready(); if (!a) return; tone(a, { dur, vol: 0.05, f0: 900, f1: 2200, type: "sine" }); noise(a, { dur, vol: 0.03, type: "bandpass", f0: 1500, f1: 4500, q: 4 }); },
  // 황금 방망이 반짝(올라가는 종소리)
  golden() { const a = ready(); if (!a) return; [0, 4, 7, 12, 16, 19].forEach((k, i) => tone(a, { at: i * 0.05, dur: 0.5, vol: 0.06, f0: 784 * Math.pow(2, k / 12), type: i % 2 ? "triangle" : "sine" })); },
};
