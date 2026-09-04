// 별빛 카트 배틀 — WebAudio 합성 사운드. Owner: Agent PRESENTATION.
// 외부 파일 없음. 하우스 스타일(cards/js/audio.js): Karplus-Strong 플럭, 모달 벨, 컨볼버 룸, 소프트 클리핑.
// 순수 헬퍼(makeSoftClipCurve, makePluckSamples, pentatonicFreq, stepSeconds, readMutedFrom)는 Node 테스트 가능.
// createAudio() 는 window/AudioContext 가 없으면 no-op 객체를 돌려준다.

export const MUTE_KEY = "starkart_muted";
export const SCALE_PENTA = Object.freeze([0, 2, 4, 7, 9]); // 장조 펜타토닉(반음)

const LOOKAHEAD_MS = 50;
const SCHEDULE_AHEAD = 0.18;
const MAX_STEPS_PER_TICK = 8;
const MUSIC_LEVEL = 0.3;

// 음계 도수(0=근음, 5=한 옥타브 위 근음), null=쉼표. 스텝 = 8분음표.
export const MUSIC_SCENES = Object.freeze({
  race: {
    bpm: 128, subdiv: 2, root: 261.63, hat: true, kick: true,
    melody: [5, null, 7, 5, 9, null, 7, 5, 4, null, 5, 4, 2, null, 4, null,
             5, null, 7, 9, 10, null, 9, 7, 5, 4, 2, null, 0, null, 2, 4],
    bass: [0, 0, 7, 7, 9, 9, 7, 7, 4, 4, 0, 0, 2, 2, 7, 7], // 반음(근음/2 기준), 박마다
  },
  menu: {
    bpm: 92, subdiv: 2, root: 261.63, hat: false, kick: false,
    melody: [5, null, null, 7, null, 9, null, null, 7, null, null, 5, null, null, 4, null,
             2, null, null, 4, null, 5, null, null, 4, null, null, 2, null, null, 0, null],
    bass: [0, 0, 0, 0, 9, 9, 9, 9, 4, 4, 4, 4, 7, 7, 7, 7],
  },
  results: {
    bpm: 104, subdiv: 2, root: 293.66, hat: true, kick: false,
    melody: [5, 7, 9, null, 7, 9, 10, null, 9, 10, 12, null, 10, 9, 7, null,
             5, 7, 9, null, 10, 9, 7, null, 5, null, 4, null, 5, null, null, null],
    bass: [0, 0, 4, 4, 7, 7, 9, 9, 0, 0, 4, 4, 7, 7, 0, 0],
  },
});

// ---------- 순수 헬퍼 ----------

export function makeSoftClipCurve(size = 2048, drive = 1.3) {
  const curve = new Float32Array(size);
  const norm = Math.tanh(drive);
  for (let i = 0; i < size; i++) {
    const x = (i * 2) / (size - 1) - 1;
    curve[i] = Math.tanh(drive * x) / norm;
  }
  return curve;
}

/** Karplus-Strong 현 시뮬레이션 → Float32Array 샘플 */
export function makePluckSamples(sampleRate, frequency, duration, rng = Math.random) {
  const length = Math.max(1, Math.floor(sampleRate * duration));
  const data = new Float32Array(length);
  const period = Math.max(2, Math.round(sampleRate / Math.max(20, frequency)));
  const ring = new Float32Array(period);
  const damping = 0.994 + rng() * 0.002;
  for (let i = 0; i < period; i++) ring[i] = (rng() * 2 - 1) * 0.72;
  let cursor = 0;
  for (let i = 0; i < length; i++) {
    const cur = ring[cursor];
    const next = ring[(cursor + 1) % period];
    ring[cursor] = (cur + next) * 0.5 * damping;
    data[i] = cur;
    cursor = (cursor + 1) % period;
  }
  return data;
}

/** 펜타토닉 도수(음수/두 옥타브 이상 가능) → 주파수 */
export function pentatonicFreq(degree, root = 261.63) {
  const d = Math.round(Number(degree) || 0);
  const octave = Math.floor(d / 5);
  const idx = ((d % 5) + 5) % 5;
  return root * Math.pow(2, octave + SCALE_PENTA[idx] / 12);
}

export function stepSeconds(bpm, subdiv = 2) {
  return 60 / Math.max(1, bpm) / Math.max(1, subdiv);
}

export function readMutedFrom(storage) {
  try { return !!storage && storage.getItem(MUTE_KEY) === "1"; } catch (_) { return false; }
}

function noop() {}
function noopAudio(muted) {
  let m = !!muted;
  return {
    prime: noop, engine: noop, drift: noop, hit: noop, card: noop, countdown: noop,
    fanfare: noop, music: noop, mute(v) { m = !!v; }, isMuted() { return m; }, destroy: noop,
  };
}

// ---------- createAudio ----------

export function createAudio() {
  const hasWindow = typeof window !== "undefined";
  const storage = hasWindow ? safeStorage() : null;
  const Ctor = hasWindow ? (window.AudioContext || window.webkitAudioContext) : null;
  let muted = readMutedFrom(storage);
  if (!Ctor) return noopAudio(muted);

  let ctxRef = null;
  let master = null, sfxBus = null, engineBus = null, musicBus = null, roomSend = null;
  let noiseBuffer = null;
  let engineNodes = null;
  let driftNodes = null;
  let pageHidden = typeof document !== "undefined" && !!document.hidden;
  let scene = null;
  let musicTimer = 0;
  let nextStepTime = 0;
  let musicStep = 0;
  let visibilityBound = false;
  const pluckCache = new Map();
  const lastEngine = { speed: -1, boosting: null };

  function safeStorage() { try { return window.localStorage; } catch (_) { return null; } }

  function makeRoomImpulse(a) {
    const len = Math.floor(a.sampleRate * 0.4);
    const buf = a.createBuffer(2, len, a.sampleRate);
    for (let ch = 0; ch < 2; ch++) {
      const d = buf.getChannelData(ch);
      for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, 3.2);
    }
    return buf;
  }

  function setupGraph(a) {
    master = a.createGain();
    master.gain.value = muted ? 0.0001 : 0.6;
    const tone = a.createBiquadFilter();
    tone.type = "lowpass"; tone.frequency.value = 9500; tone.Q.value = 0.4;
    const shaper = a.createWaveShaper();
    shaper.curve = makeSoftClipCurve(2048, 1.3);
    if ("oversample" in shaper) shaper.oversample = "2x";
    const comp = a.createDynamicsCompressor();
    comp.threshold.value = -10; comp.knee.value = 6; comp.ratio.value = 10;
    comp.attack.value = 0.003; comp.release.value = 0.12;
    master.connect(tone).connect(shaper).connect(comp).connect(a.destination);

    sfxBus = a.createGain(); sfxBus.gain.value = 1;
    engineBus = a.createGain(); engineBus.gain.value = 0.9;
    musicBus = a.createGain(); musicBus.gain.value = 0.0001;
    const room = a.createConvolver();
    room.buffer = makeRoomImpulse(a);
    roomSend = a.createGain(); roomSend.gain.value = 0.16;
    sfxBus.connect(master);
    sfxBus.connect(roomSend).connect(room).connect(master);
    engineBus.connect(master);
    musicBus.connect(master);

    noiseBuffer = a.createBuffer(1, Math.floor(a.sampleRate * 1.0), a.sampleRate);
    const nd = noiseBuffer.getChannelData(0);
    for (let i = 0; i < nd.length; i++) nd[i] = Math.random() * 2 - 1;
  }

  function ctx() {
    if (ctxRef) {
      if (ctxRef.state === "suspended") ctxRef.resume().catch(noop);
      return ctxRef;
    }
    try {
      ctxRef = new Ctor({ latencyHint: "interactive" });
    } catch (_) {
      try { ctxRef = new Ctor(); } catch (__) { return null; }
    }
    setupGraph(ctxRef);
    bindVisibility();
    return ctxRef;
  }

  function bindVisibility() {
    if (visibilityBound || typeof document === "undefined") return;
    visibilityBound = true;
    document.addEventListener("visibilitychange", () => {
      pageHidden = !!document.hidden;
      if (pageHidden) {
        stopScheduler();
        rampGain(musicBus, 0.0001, 0.08);
        if (engineNodes) { rampGain(engineNodes.gain, 0.0001, 0.05); rampGain(engineNodes.boostGain, 0.0001, 0.05); lastEngine.speed = -1; }
        if (driftNodes) rampGain(driftNodes.gain, 0.0001, 0.05);
      } else {
        ensureScheduler();
      }
    });
  }

  function rampGain(param, target, dur) {
    if (!param || !ctxRef) return;
    const p = param.gain || param;
    const now = ctxRef.currentTime;
    p.cancelScheduledValues(now);
    p.setValueAtTime(Math.max(0.0001, p.value || 0.0001), now);
    p.exponentialRampToValueAtTime(Math.max(0.0001, target), now + Math.max(0.01, dur));
  }

  function env(gain, start, attack, dur, vol) {
    gain.gain.setValueAtTime(0.0001, start);
    gain.gain.linearRampToValueAtTime(vol, start + attack);
    gain.gain.exponentialRampToValueAtTime(0.0001, start + dur);
  }

  // ---- 원샷 보이스 ----

  function pluckBuffer(a, freq, dur) {
    const key = Math.round(freq) + ":" + Math.round(dur * 100);
    let buf = pluckCache.get(key);
    if (buf) return buf;
    const samples = makePluckSamples(a.sampleRate, freq, dur);
    buf = a.createBuffer(1, samples.length, a.sampleRate);
    buf.getChannelData(0).set(samples);
    if (pluckCache.size > 48) pluckCache.clear();
    pluckCache.set(key, buf);
    return buf;
  }

  function pluck(freq, delay, o) {
    const a = ctx(); if (!a) return;
    o = o || {};
    const start = a.currentTime + (delay || 0);
    const dur = o.dur || 0.38;
    const src = a.createBufferSource();
    const filter = a.createBiquadFilter();
    const gain = a.createGain();
    src.buffer = pluckBuffer(a, freq, dur);
    filter.type = "lowpass"; filter.Q.value = 0.8;
    filter.frequency.setValueAtTime(Math.min(4200, freq * 5), start);
    filter.frequency.exponentialRampToValueAtTime(Math.max(800, freq * 1.6), start + dur);
    env(gain, start, 0.003, dur, o.vol || 0.08);
    src.connect(filter).connect(gain).connect(o.bus || sfxBus);
    src.start(start);
    src.stop(start + dur + 0.02);
  }

  const BELL_MODES = [
    { ratio: 1, level: 1, decay: 1 },
    { ratio: 2.01, level: 0.36, decay: 0.72 },
    { ratio: 3.93, level: 0.14, decay: 0.46 },
    { ratio: 5.38, level: 0.065, decay: 0.3 },
  ];
  function bell(freq, delay, o) {
    const a = ctx(); if (!a) return;
    o = o || {};
    const start = a.currentTime + (delay || 0);
    const dur = o.dur || 0.6;
    const vol = o.vol || 0.05;
    for (const m of BELL_MODES) {
      const osc = a.createOscillator();
      const gain = a.createGain();
      const md = Math.max(0.12, dur * m.decay);
      osc.type = "sine";
      osc.frequency.value = freq * m.ratio;
      osc.detune.value = (Math.random() - 0.5) * 6;
      env(gain, start, 0.003, md, vol * m.level);
      osc.connect(gain).connect(o.bus || sfxBus);
      osc.start(start);
      osc.stop(start + md + 0.03);
    }
  }

  function noiseBurst(delay, o) {
    const a = ctx(); if (!a || !noiseBuffer) return;
    o = o || {};
    const start = a.currentTime + (delay || 0);
    const dur = o.dur || 0.15;
    const src = a.createBufferSource();
    src.buffer = noiseBuffer;
    src.loop = true;
    const f = a.createBiquadFilter();
    f.type = o.type || "bandpass";
    f.Q.value = o.q || 0.9;
    f.frequency.setValueAtTime(o.from || 1500, start);
    f.frequency.exponentialRampToValueAtTime(Math.max(40, o.to || o.from || 1500), start + dur);
    const gain = a.createGain();
    env(gain, start, o.attack || 0.005, dur, o.vol || 0.06);
    src.connect(f).connect(gain).connect(o.bus || sfxBus);
    src.start(start);
    src.stop(start + dur + 0.02);
  }

  function sweep(delay, o) {
    const a = ctx(); if (!a) return;
    o = o || {};
    const start = a.currentTime + (delay || 0);
    const dur = o.dur || 0.3;
    const osc = a.createOscillator();
    osc.type = o.type || "triangle";
    osc.frequency.setValueAtTime(o.from || 200, start);
    osc.frequency.exponentialRampToValueAtTime(Math.max(30, o.to || 600), start + dur);
    const f = a.createBiquadFilter();
    f.type = "lowpass"; f.frequency.value = o.cutoff || 2600; f.Q.value = 0.7;
    const gain = a.createGain();
    env(gain, start, o.attack || 0.01, dur, o.vol || 0.08);
    osc.connect(f).connect(gain).connect(o.bus || sfxBus);
    osc.start(start);
    osc.stop(start + dur + 0.03);
  }

  function thud(delay, o) {
    sweep(delay, { type: "sine", from: (o && o.from) || 130, to: (o && o.to) || 40, dur: (o && o.dur) || 0.22, vol: (o && o.vol) || 0.2, cutoff: 900 });
  }

  // ---- 엔진 / 드리프트 (지속음) ----

  function ensureEngine() {
    if (engineNodes) return engineNodes;
    const a = ctx(); if (!a) return null;
    const osc1 = a.createOscillator(); osc1.type = "sawtooth"; osc1.frequency.value = 50; osc1.detune.value = -7;
    const osc2 = a.createOscillator(); osc2.type = "triangle"; osc2.frequency.value = 50; osc2.detune.value = 8;
    const filter = a.createBiquadFilter(); filter.type = "lowpass"; filter.frequency.value = 320; filter.Q.value = 1.1;
    const gain = a.createGain(); gain.gain.value = 0.0001;
    osc1.connect(filter); osc2.connect(filter);
    filter.connect(gain).connect(engineBus);
    const osc3 = a.createOscillator(); osc3.type = "sawtooth"; osc3.frequency.value = 100;
    const bp = a.createBiquadFilter(); bp.type = "bandpass"; bp.frequency.value = 1400; bp.Q.value = 1.6;
    const boostGain = a.createGain(); boostGain.gain.value = 0.0001;
    osc3.connect(bp).connect(boostGain).connect(engineBus);
    osc1.start(); osc2.start(); osc3.start();
    engineNodes = { osc1, osc2, osc3, filter, bp, gain, boostGain };
    return engineNodes;
  }

  function engine(speed01, boosting) {
    const s = Math.max(0, Math.min(1, Number(speed01) || 0));
    const b = !!boosting;
    if (Math.abs(s - lastEngine.speed) < 0.004 && lastEngine.boosting === b) return;
    const n = ensureEngine(); if (!n) return;
    if (pageHidden) return;
    lastEngine.speed = s; lastEngine.boosting = b;
    const now = ctxRef.currentTime;
    const f = 46 + s * 170 + (b ? 22 : 0);
    n.osc1.frequency.setTargetAtTime(f, now, 0.05);
    n.osc2.frequency.setTargetAtTime(f * 1.004, now, 0.05);
    n.osc3.frequency.setTargetAtTime(f * 2, now, 0.05);
    n.filter.frequency.setTargetAtTime(300 + s * 1900 + (b ? 900 : 0), now, 0.06);
    n.gain.gain.setTargetAtTime(0.03 + s * 0.075, now, 0.06);
    n.boostGain.gain.setTargetAtTime(b ? 0.045 : 0.0001, now, 0.05);
  }

  function ensureDrift() {
    if (driftNodes) return driftNodes;
    const a = ctx(); if (!a || !noiseBuffer) return null;
    const src = a.createBufferSource(); src.buffer = noiseBuffer; src.loop = true;
    const f = a.createBiquadFilter(); f.type = "bandpass"; f.frequency.value = 2200; f.Q.value = 0.9;
    const gain = a.createGain(); gain.gain.value = 0.0001;
    src.connect(f).connect(gain).connect(sfxBus);
    src.start();
    driftNodes = { src, f, gain, on: false };
    return driftNodes;
  }

  function drift(on) {
    const d = ensureDrift(); if (!d) return;
    if (d.on === !!on) return;
    d.on = !!on;
    const now = ctxRef.currentTime;
    d.gain.gain.setTargetAtTime(on && !pageHidden ? 0.05 : 0.0001, now, on ? 0.04 : 0.08);
  }

  // ---- 스팅어 ----

  function hit(kind) {
    if (!ctx()) return;
    duckMusic(0.35, 0.4);
    switch (kind) {
      case "spin":
        sweep(0, { type: "triangle", from: 560, to: 160, dur: 0.38, vol: 0.09 });
        noiseBurst(0, { from: 2400, to: 500, dur: 0.14, vol: 0.05 });
        bell(660, 0.05, { dur: 0.4, vol: 0.04 });
        break;
      case "slow":
        bell(1318.5, 0, { dur: 0.7, vol: 0.045 });
        bell(1046.5, 0.09, { dur: 0.7, vol: 0.04 });
        bell(880, 0.18, { dur: 0.8, vol: 0.035 });
        noiseBurst(0, { type: "highpass", from: 5000, to: 3000, dur: 0.45, vol: 0.025, attack: 0.05 });
        break;
      case "knockback":
      default:
        thud(0, { from: 140, to: 38, dur: 0.24, vol: 0.22 });
        noiseBurst(0, { type: "lowpass", from: 1800, to: 300, dur: 0.16, vol: 0.07 });
        break;
    }
  }

  function card(kind) {
    if (!ctx()) return;
    switch (kind) {
      case "attack":
        pluck(392, 0, { vol: 0.08 });
        pluck(523.25, 0.06, { vol: 0.08 });
        noiseBurst(0.02, { from: 800, to: 3200, dur: 0.25, vol: 0.05, attack: 0.03 });
        break;
      case "defense":
        bell(783.99, 0, { dur: 0.7, vol: 0.05 });
        bell(1174.66, 0.1, { dur: 0.8, vol: 0.045 });
        break;
      case "boost":
        sweep(0, { type: "sawtooth", from: 180, to: 760, dur: 0.35, vol: 0.06, cutoff: 1800 });
        pluck(659.25, 0.28, { vol: 0.08 });
        break;
      case "trick":
        pluck(659.25, 0, { vol: 0.08, dur: 0.25 });
        pluck(523.25, 0.09, { vol: 0.08, dur: 0.25 });
        pluck(783.99, 0.18, { vol: 0.09, dur: 0.3 });
        break;
      default: // 마나 등
        pluck(880, 0, { vol: 0.07 });
        bell(1760, 0.04, { dur: 0.5, vol: 0.03 });
        break;
    }
  }

  function countdown(n) {
    if (!ctx()) return;
    if (n > 0) {
      bell(440, 0, { dur: 0.22, vol: 0.09 });
      pluck(440, 0, { vol: 0.06, dur: 0.2 });
      return;
    }
    // 출발 코드
    [523.25, 659.25, 783.99, 1046.5].forEach((f, i) => bell(f, i * 0.02, { dur: 0.9, vol: 0.07 }));
    pluck(261.63, 0, { vol: 0.09, dur: 0.5 });
    noiseBurst(0, { from: 600, to: 4000, dur: 0.35, vol: 0.05, attack: 0.02 });
  }

  function fanfare(rank) {
    if (!ctx()) return;
    duckMusic(0.5, 1.6);
    if (rank === 1) {
      const notes = [523.25, 659.25, 783.99, 1046.5, 1318.5];
      notes.forEach((f, i) => pluck(f, i * 0.12, { vol: 0.09, dur: 0.4 }));
      bell(1046.5, 0.6, { dur: 1.2, vol: 0.06 });
      bell(1318.5, 0.66, { dur: 1.2, vol: 0.05 });
      bell(1567.98, 0.72, { dur: 1.4, vol: 0.045 });
    } else if (rank === 2 || rank === 3) {
      [523.25, 659.25, 783.99].forEach((f, i) => pluck(f, i * 0.13, { vol: 0.085, dur: 0.38 }));
      bell(783.99, 0.42, { dur: 1.0, vol: 0.05 });
    } else {
      pluck(392, 0, { vol: 0.07, dur: 0.4 });
      pluck(523.25, 0.18, { vol: 0.07, dur: 0.5 });
      bell(523.25, 0.4, { dur: 0.9, vol: 0.04 });
    }
  }

  // ---- 음악 (룩어헤드 스케줄러) ----

  function musicCanRun() {
    return !!(ctxRef && ctxRef.state === "running" && musicBus && scene && !muted && !pageHidden);
  }

  function duckMusic(depth, dur) {
    if (!ctxRef || !musicBus || !musicCanRun()) return;
    const now = ctxRef.currentTime;
    const g = musicBus.gain;
    g.cancelScheduledValues(now);
    g.setValueAtTime(Math.max(0.0001, g.value), now);
    g.exponentialRampToValueAtTime(Math.max(0.0001, MUSIC_LEVEL * (1 - depth)), now + 0.04);
    g.exponentialRampToValueAtTime(MUSIC_LEVEL, now + dur);
  }

  function bgmPluck(a, start, freq, vol, dur) {
    const src = a.createBufferSource();
    src.buffer = pluckBuffer(a, freq, dur);
    const f = a.createBiquadFilter();
    f.type = "lowpass"; f.Q.value = 0.6;
    f.frequency.setValueAtTime(Math.min(3600, freq * 4), start);
    f.frequency.exponentialRampToValueAtTime(Math.max(700, freq * 1.5), start + dur);
    const gain = a.createGain();
    env(gain, start, 0.004, dur, vol);
    src.connect(f).connect(gain).connect(musicBus);
    src.start(start);
    src.stop(start + dur + 0.02);
  }

  function bgmBass(a, start, freq, vol, dur) {
    const osc = a.createOscillator();
    osc.type = "triangle";
    osc.frequency.setValueAtTime(freq, start);
    const f = a.createBiquadFilter();
    f.type = "lowpass"; f.frequency.value = 380; f.Q.value = 0.6;
    const gain = a.createGain();
    gain.gain.setValueAtTime(0.0001, start);
    gain.gain.linearRampToValueAtTime(vol, start + 0.02);
    gain.gain.setValueAtTime(vol, start + Math.max(0.05, dur * 0.6));
    gain.gain.exponentialRampToValueAtTime(0.0001, start + dur);
    osc.connect(f).connect(gain).connect(musicBus);
    osc.start(start);
    osc.stop(start + dur + 0.03);
  }

  function bgmHat(a, start, vol) {
    const src = a.createBufferSource();
    src.buffer = noiseBuffer;
    const f = a.createBiquadFilter();
    f.type = "highpass"; f.frequency.value = 6500;
    const gain = a.createGain();
    env(gain, start, 0.002, 0.05, vol);
    src.connect(f).connect(gain).connect(musicBus);
    src.start(start);
    src.stop(start + 0.07);
  }

  function bgmKick(a, start, vol) {
    const osc = a.createOscillator();
    osc.type = "sine";
    osc.frequency.setValueAtTime(150, start);
    osc.frequency.exponentialRampToValueAtTime(45, start + 0.1);
    const gain = a.createGain();
    env(gain, start, 0.003, 0.14, vol);
    osc.connect(gain).connect(musicBus);
    osc.start(start);
    osc.stop(start + 0.17);
  }

  function scheduleStep(a, start, step) {
    const def = MUSIC_SCENES[scene];
    if (!def) return;
    const secs = stepSeconds(def.bpm, def.subdiv);
    const deg = def.melody[step % def.melody.length];
    if (deg !== null && deg !== undefined) {
      bgmPluck(a, start, pentatonicFreq(deg, def.root), 0.07, Math.min(0.5, secs * 1.8));
    }
    if (step % def.subdiv === 0) {
      const beat = (step / def.subdiv) | 0;
      const semis = def.bass[beat % def.bass.length];
      bgmBass(a, start, (def.root / 2) * Math.pow(2, semis / 12), 0.05, secs * def.subdiv * 0.9);
      if (def.kick && beat % 2 === 0) bgmKick(a, start, 0.09);
    }
    if (def.hat && step % def.subdiv === def.subdiv - 1) bgmHat(a, start, 0.02);
  }

  function schedulerTick() {
    clearTimeout(musicTimer);
    musicTimer = 0;
    if (!musicCanRun()) { rampGain(musicBus, 0.0001, 0.08); return; }
    const a = ctxRef;
    const def = MUSIC_SCENES[scene];
    const secs = stepSeconds(def.bpm, def.subdiv);
    if (nextStepTime < a.currentTime - SCHEDULE_AHEAD * 2) nextStepTime = a.currentTime + 0.04;
    let n = 0;
    while (nextStepTime < a.currentTime + SCHEDULE_AHEAD && n < MAX_STEPS_PER_TICK) {
      scheduleStep(a, nextStepTime, musicStep);
      musicStep += 1;
      n += 1;
      nextStepTime += secs;
    }
    if (n === MAX_STEPS_PER_TICK && nextStepTime < a.currentTime) nextStepTime = a.currentTime + 0.04;
    musicTimer = setTimeout(schedulerTick, LOOKAHEAD_MS);
  }

  function stopScheduler() {
    clearTimeout(musicTimer);
    musicTimer = 0;
  }

  function ensureScheduler() {
    if (!ctxRef || !musicBus) return;
    if (!musicCanRun()) { stopScheduler(); rampGain(musicBus, 0.0001, 0.08); return; }
    rampGain(musicBus, MUSIC_LEVEL, 0.2);
    if (!musicTimer) {
      nextStepTime = Math.max(ctxRef.currentTime + 0.04, nextStepTime);
      schedulerTick();
    }
  }

  function music(next) {
    const s = MUSIC_SCENES[next] ? next : null;
    if (!s) {
      scene = null;
      stopScheduler();
      rampGain(musicBus, 0.0001, 0.15);
      return;
    }
    if (!ctx()) return;
    if (scene !== s) {
      scene = s;
      musicStep = 0;
      nextStepTime = ctxRef.currentTime + 0.05;
    }
    ensureScheduler();
  }

  // ---- 공개 API ----

  function prime() {
    const a = ctx();
    if (!a) return;
    if (a.state === "suspended") a.resume().catch(noop);
    // iOS 잠금 해제용 무음 버퍼
    try {
      const src = a.createBufferSource();
      src.buffer = a.createBuffer(1, 1, a.sampleRate);
      src.connect(a.destination);
      src.start(0);
    } catch (_) { /* 무시 */ }
    ensureEngine();
    ensureDrift();
    if (scene) ensureScheduler();
  }

  function mute(v) {
    muted = !!v;
    try { if (storage) storage.setItem(MUTE_KEY, muted ? "1" : "0"); } catch (_) { /* 무시 */ }
    if (master) rampGain(master, muted ? 0.0001 : 0.6, 0.08);
    if (muted) stopScheduler(); else ensureScheduler();
  }

  function isMuted() { return muted; }

  function destroy() {
    stopScheduler();
    scene = null;
    if (ctxRef && typeof ctxRef.close === "function") ctxRef.close().catch(noop);
    ctxRef = null; engineNodes = null; driftNodes = null;
  }

  return { prime, engine, drift, hit, card, countdown, fanfare, music, mute, isMuted, destroy };
}
