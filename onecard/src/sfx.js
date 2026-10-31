// 효과음은 모두 Web Audio로 그 자리에서 만든다(음성 합성은 쓰지 않는다: 다른 게임의 아이패드 마이크가 죽는다).
let ac = null, master = null, noiseBuf = null, muted = false;

function ctx() {
  if (!ac) {
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return null;
    try { ac = new AC(); } catch (e) { return null; }
    master = ac.createGain();
    master.gain.value = muted ? 0 : 0.55;
    master.connect(ac.destination);
    noiseBuf = ac.createBuffer(1, ac.sampleRate, ac.sampleRate);
    const d = noiseBuf.getChannelData(0);
    for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
  }
  if (ac.state === "suspended") ac.resume().catch(() => {});
  return ac;
}

export function unlock() { ctx(); }
export function setMuted(m) { muted = !!m; if (master) master.gain.value = muted ? 0 : 0.55; }

function tone(freq, dur, opt = {}) {
  const a = muted ? null : ctx();
  if (!a) return;
  const t = a.currentTime + (opt.at || 0);
  const o = a.createOscillator(), g = a.createGain();
  o.type = opt.type || "sine";
  o.frequency.setValueAtTime(freq, t);
  if (opt.slide) o.frequency.exponentialRampToValueAtTime(Math.max(20, opt.slide), t + dur);
  const v = opt.vol == null ? 0.18 : opt.vol;
  g.gain.setValueAtTime(0.0001, t);
  g.gain.exponentialRampToValueAtTime(v, t + (opt.attack || 0.01));
  g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  o.connect(g); g.connect(master);
  o.start(t); o.stop(t + dur + 0.05);
}

function noise(dur, opt = {}) {
  const a = muted ? null : ctx();
  if (!a) return;
  const t = a.currentTime + (opt.at || 0);
  const src = a.createBufferSource(); src.buffer = noiseBuf;
  const f = a.createBiquadFilter(); f.type = opt.filter || "lowpass";
  f.frequency.setValueAtTime(opt.freq || 1200, t);
  if (opt.sweep) f.frequency.exponentialRampToValueAtTime(opt.sweep, t + dur);
  const g = a.createGain(); const v = opt.vol == null ? 0.2 : opt.vol;
  g.gain.setValueAtTime(0.0001, t);
  g.gain.exponentialRampToValueAtTime(v, t + (opt.attack || 0.005));
  g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  src.connect(f); f.connect(g); g.connect(master);
  src.start(t, Math.random() * 0.5); src.stop(t + dur + 0.05);
}

const N = n => 440 * Math.pow(2, (n - 69) / 12); // MIDI → Hz

export const sfx = {
  tap() { tone(660, 0.07, { type: "triangle", vol: 0.1 }); },
  // 카드 착: 짧은 종이 소리 + 톡
  flick() { noise(0.07, { freq: 5000, filter: "highpass", vol: 0.16 }); tone(240, 0.06, { type: "triangle", vol: 0.1, slide: 140 }); },
  deal() { noise(0.05, { freq: 4200, filter: "highpass", vol: 0.08 }); },
  draw() { noise(0.18, { freq: 900, sweep: 3200, vol: 0.1, filter: "bandpass" }); tone(520, 0.09, { type: "sine", vol: 0.08, at: 0.06 }); },
  wrong() { tone(300, 0.12, { type: "sine", vol: 0.13, slide: 220 }); tone(240, 0.16, { type: "sine", vol: 0.1, at: 0.1, slide: 180 }); },
  suit() { [76, 79, 83, 88].forEach((m, i) => tone(N(m), 0.22, { type: "triangle", vol: 0.1, at: i * 0.05 })); },
  turn() { tone(N(81), 0.12, { type: "sine", vol: 0.07 }); },
  pop() { tone(420, 0.14, { type: "sine", vol: 0.2, slide: 1200 }); },
  // 원카드! 외침(안전)
  oneCard() { [[72, 0], [79, .09], [84, .18]].forEach(([m, t]) => { tone(N(m), 0.3, { type: "square", vol: 0.06, at: t }); tone(N(m), 0.3, { type: "triangle", vol: 0.12, at: t }); }); },
  // 잡았다! (아이가 컴퓨터를 잡음)
  caught() {
    tone(180, 0.22, { type: "sine", vol: 0.22, slide: 520 });
    noise(0.25, { freq: 2500, sweep: 600, vol: 0.12, at: 0.05 });
    [[76, .2], [80, .3], [83, .4], [88, .52]].forEach(([m, t]) => tone(N(m), 0.32, { type: "triangle", vol: 0.13, at: t }));
  },
  // 벌칙(부드럽게)
  oops() { tone(N(67), 0.18, { type: "triangle", vol: 0.1 }); tone(N(64), 0.26, { type: "triangle", vol: 0.1, at: 0.14 }); },
  win() {
    [[72, 0], [76, .12], [79, .24], [84, .4], [79, .56], [84, .68]].forEach(([m, t]) => {
      tone(N(m), 0.36, { type: "triangle", vol: 0.14, at: t }); tone(N(m - 12), 0.36, { type: "sine", vol: 0.08, at: t });
    });
  },
  lose() { [[67, 0], [65, .18], [64, .36]].forEach(([m, t]) => tone(N(m), 0.32, { type: "triangle", vol: 0.1, at: t })); },
};
