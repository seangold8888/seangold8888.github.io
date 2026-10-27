// 효과음은 모두 Web Audio로 그 자리에서 만든다(음성 합성은 쓰지 않는다).
let ac = null, master = null, noiseBuf = null, muted = false;

function ctx() {
  if (!ac) {
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return null;
    try { ac = new AC(); } catch (e) { return null; }
    master = ac.createGain();
    master.gain.value = 0.55;
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
export function now() { return ac ? ac.currentTime : 0; }

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
  g.gain.exponentialRampToValueAtTime(v, t + (opt.attack || 0.01));
  g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  src.connect(f); f.connect(g); g.connect(master);
  src.start(t, Math.random() * 0.5); src.stop(t + dur + 0.05);
}

const N = n => 440 * Math.pow(2, (n - 69) / 12); // MIDI → Hz

export const sfx = {
  N,
  tap() { tone(660, 0.08, { type: "triangle", vol: 0.12 }); },
  chime(midi, vol = 0.2) { tone(N(midi), 0.5, { type: "triangle", vol }); tone(N(midi + 12), 0.3, { vol: vol * 0.35, at: 0.01 }); },
  pop() { tone(500, 0.12, { type: "sine", vol: 0.2, slide: 1100 }); },
  star() { tone(N(84), 0.12, { type: "triangle", vol: 0.14 }); tone(N(88), 0.18, { type: "triangle", vol: 0.14, at: 0.06 }); },
  coin() { tone(N(83), 0.08, { type: "square", vol: 0.07 }); tone(N(88), 0.3, { type: "square", vol: 0.07, at: 0.08 }); },
  wrong() { tone(260, 0.18, { type: "sine", vol: 0.14, slide: 200 }); },
  splash(big) { noise(big ? 0.9 : 0.45, { freq: big ? 2500 : 3500, sweep: 400, vol: big ? 0.32 : 0.2, filter: "lowpass" }); },
  whoosh() { noise(0.35, { freq: 400, sweep: 3000, vol: 0.12, filter: "bandpass" }); },
  jump() { tone(330, 0.2, { type: "sine", vol: 0.16, slide: 760 }); },
  build() { noise(0.12, { freq: 900, vol: 0.18 }); tone(180, 0.1, { type: "triangle", vol: 0.12 }); },
  level() { [72, 76, 79, 84].forEach((m, i) => tone(N(m), 0.25, { type: "triangle", vol: 0.13, at: i * 0.08 })); },
  boom() { tone(120, 0.6, { type: "sine", vol: 0.3, slide: 40 }); noise(0.9, { freq: 1800, sweep: 200, vol: 0.22 }); noise(0.5, { freq: 6000, filter: "highpass", vol: 0.06, at: 0.25 }); },
  launch() { noise(0.6, { freq: 600, sweep: 3000, vol: 0.08, filter: "bandpass" }); },
  kick() { tone(130, 0.18, { type: "sine", vol: 0.22, slide: 45 }); },
  hat() { noise(0.05, { freq: 8000, filter: "highpass", vol: 0.05 }); },
  pad(midis, dur) { midis.forEach(m => tone(N(m), dur, { type: "triangle", vol: 0.04, attack: 0.08 })); },
  bass(midi, dur) { tone(N(midi), dur, { type: "sine", vol: 0.14 }); },
  fanfare() { [[72, 0], [76, .12], [79, .24], [84, .4]].forEach(([m, t]) => { tone(N(m), 0.35, { type: "triangle", vol: 0.14, at: t }); tone(N(m - 12), 0.35, { type: "sine", vol: 0.08, at: t }); }); },
  count(go) { tone(go ? N(84) : N(72), go ? 0.4 : 0.15, { type: "triangle", vol: 0.15 }); },
  hit() { tone(200, 0.25, { type: "sine", vol: 0.2, slide: 90 }); noise(0.3, { freq: 1500, vol: 0.15 }); },
};
