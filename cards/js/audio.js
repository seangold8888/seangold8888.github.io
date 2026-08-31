(function () {
  "use strict";

  let context = null;
  let master = null;
  let room = null;
  let impactBus = null;
  let impactRoomSend = null;
  let noiseBuffer = null;
  let lastSelectAt = -Infinity;
  let muted = false;

  try {
    muted = localStorage.getItem("cards_muted") === "1";
  } catch (error) {
    muted = false;
  }

  function makeRoomImpulse(audio) {
    const length = Math.floor(audio.sampleRate * 0.42);
    const impulse = audio.createBuffer(2, length, audio.sampleRate);
    for (let channel = 0; channel < impulse.numberOfChannels; channel += 1) {
      const data = impulse.getChannelData(channel);
      for (let index = 0; index < length; index += 1) {
        const fade = Math.pow(1 - index / length, 3.4);
        data[index] = (Math.random() * 2 - 1) * fade;
      }
    }
    return impulse;
  }

  function makeSoftClipCurve(size, drive) {
    const curve = new Float32Array(size);
    const normalise = Math.tanh(drive);
    for (let index = 0; index < size; index += 1) {
      const input = index * 2 / (size - 1) - 1;
      curve[index] = Math.tanh(drive * input) / normalise;
    }
    return curve;
  }

  function setupGraph(audio) {
    const compressor = audio.createDynamicsCompressor();
    const toneFilter = audio.createBiquadFilter();
    const roomGain = audio.createGain();
    const impactLow = audio.createBiquadFilter();
    const impactShaper = audio.createWaveShaper();
    const impactTrim = audio.createGain();
    master = audio.createGain();
    room = audio.createConvolver();
    impactBus = audio.createGain();
    impactRoomSend = audio.createGain();

    master.gain.value = 0.56;
    toneFilter.type = "lowpass";
    toneFilter.frequency.value = 4700;
    toneFilter.Q.value = 0.5;
    compressor.threshold.value = -18;
    compressor.knee.value = 20;
    compressor.ratio.value = 2.5;
    compressor.attack.value = 0.014;
    compressor.release.value = 0.3;
    room.buffer = makeRoomImpulse(audio);
    roomGain.gain.value = 0.16;
    impactLow.type = "lowshelf";
    impactLow.frequency.value = 140;
    impactLow.gain.value = 4.5;
    impactShaper.curve = makeSoftClipCurve(2048, 1.7);
    if ("oversample" in impactShaper) impactShaper.oversample = "2x";
    impactTrim.gain.value = 0.55;
    impactRoomSend.gain.value = 0.0001;

    room.connect(roomGain).connect(master);
    impactBus.connect(impactLow).connect(impactShaper).connect(impactTrim);
    impactTrim.connect(master);
    impactTrim.connect(impactRoomSend).connect(room);
    master.connect(toneFilter).connect(compressor).connect(audio.destination);
  }

  function ctx() {
    if (!context) {
      const AudioContext = window.AudioContext || window.webkitAudioContext;
      if (AudioContext) {
        context = new AudioContext();
        setupGraph(context);
      }
    }
    if (context && context.state === "suspended") context.resume();
    return context;
  }

  function connectToMix(audio, node, roomAmount) {
    node.connect(master);
    if (roomAmount > 0) {
      const send = audio.createGain();
      send.gain.value = roomAmount;
      node.connect(send).connect(room);
    }
  }

  function shape(gain, start, attack, duration, volume) {
    gain.gain.setValueAtTime(0.0001, start);
    gain.gain.exponentialRampToValueAtTime(Math.max(0.0002, volume), start + attack);
    gain.gain.exponentialRampToValueAtTime(0.0001, start + duration);
  }

  function humanDetune(amount) {
    return (Math.random() * 2 - 1) * (amount || 4);
  }

  function getNoise(audio) {
    if (!noiseBuffer) {
      noiseBuffer = audio.createBuffer(1, audio.sampleRate, audio.sampleRate);
      const data = noiseBuffer.getChannelData(0);
      for (let index = 0; index < data.length; index += 1) {
        data[index] = Math.random() * 2 - 1;
      }
    }
    return noiseBuffer;
  }

  function makePluckBuffer(audio, frequency, duration) {
    const length = Math.floor(audio.sampleRate * duration);
    const buffer = audio.createBuffer(1, length, audio.sampleRate);
    const data = buffer.getChannelData(0);
    const cents = humanDetune(4);
    const tunedFrequency = frequency * Math.pow(2, cents / 1200);
    const period = Math.max(2, Math.round(audio.sampleRate / tunedFrequency));
    const ring = new Float32Array(period);
    const damping = 0.994 + Math.random() * 0.002;
    let cursor = 0;

    for (let index = 0; index < period; index += 1) {
      ring[index] = (Math.random() * 2 - 1) * 0.72;
    }
    for (let index = 0; index < length; index += 1) {
      const current = ring[cursor];
      const next = ring[(cursor + 1) % period];
      ring[cursor] = (current + next) * 0.5 * damping;
      data[index] = current;
      cursor = (cursor + 1) % period;
    }
    return buffer;
  }

  function pluck(frequency, delay, options) {
    if (muted) return;
    const audio = ctx();
    if (!audio) return;
    options = options || {};

    const start = audio.currentTime + (delay || 0);
    const duration = options.duration || 0.38;
    const source = audio.createBufferSource();
    const filter = audio.createBiquadFilter();
    const gain = audio.createGain();

    source.buffer = makePluckBuffer(audio, frequency, duration);
    filter.type = "lowpass";
    filter.Q.value = 0.8;
    filter.frequency.setValueAtTime(Math.min(3900, frequency * 5), start);
    filter.frequency.exponentialRampToValueAtTime(Math.max(850, frequency * 1.6), start + duration);
    shape(gain, start, 0.003, duration, options.volume || 0.07);

    source.connect(filter).connect(gain);
    connectToMix(audio, gain, options.room === undefined ? 0.18 : options.room);
    source.start(start);
    source.stop(start + duration + 0.02);
  }

  function bell(frequency, delay, options) {
    if (muted) return;
    const audio = ctx();
    if (!audio) return;
    options = options || {};

    const start = audio.currentTime + (delay || 0);
    const duration = options.duration || 0.62;
    const volume = options.volume || 0.045;
    const bus = audio.createGain();
    const modes = [
      { ratio: 1, level: 1, decay: 1 },
      { ratio: 2.01, level: 0.36, decay: 0.72 },
      { ratio: 3.93, level: 0.14, decay: 0.46 },
      { ratio: 5.38, level: 0.065, decay: 0.3 }
    ];

    modes.forEach(function (mode) {
      const oscillator = audio.createOscillator();
      const gain = audio.createGain();
      const modeDuration = Math.max(0.12, duration * mode.decay);
      oscillator.type = "sine";
      oscillator.frequency.value = frequency * mode.ratio;
      oscillator.detune.value = humanDetune(3);
      shape(gain, start, 0.003, modeDuration, volume * mode.level);
      oscillator.connect(gain).connect(bus);
      oscillator.start(start);
      oscillator.stop(start + modeDuration + 0.03);
    });

    connectToMix(audio, bus, options.room === undefined ? 0.32 : options.room);
  }

  function noiseTap(start, frequency, duration, volume) {
    const audio = ctx();
    if (!audio) return;
    const source = audio.createBufferSource();
    const filter = audio.createBiquadFilter();
    const gain = audio.createGain();
    source.buffer = getNoise(audio);
    filter.type = "bandpass";
    filter.frequency.value = frequency;
    filter.Q.value = 0.85;
    shape(gain, start, 0.002, duration, volume);
    source.connect(filter).connect(gain);
    connectToMix(audio, gain, 0.035);
    source.start(start);
    source.stop(start + duration + 0.01);
  }

  function woodHit(delay, volume) {
    if (muted) return;
    const audio = ctx();
    if (!audio) return;
    const start = audio.currentTime + (delay || 0);
    const body = audio.createOscillator();
    const gain = audio.createGain();
    const level = volume || 0.11;

    body.type = "sine";
    body.frequency.setValueAtTime(132 + humanDetune(7), start);
    body.frequency.exponentialRampToValueAtTime(76, start + 0.16);
    shape(gain, start, 0.003, 0.18, level);
    body.connect(gain);
    connectToMix(audio, gain, 0.055);
    body.start(start);
    body.stop(start + 0.2);
    noiseTap(start, 520 + Math.random() * 130, 0.105, level * 0.55);
    noiseTap(start + 0.008, 1280 + Math.random() * 180, 0.045, level * 0.16);
  }

  function softSweep(delay) {
    if (muted) return;
    const audio = ctx();
    if (!audio) return;
    const start = audio.currentTime + (delay || 0);
    const source = audio.createBufferSource();
    const filter = audio.createBiquadFilter();
    const gain = audio.createGain();

    source.buffer = getNoise(audio);
    filter.type = "bandpass";
    filter.Q.value = 0.55;
    filter.frequency.setValueAtTime(700, start);
    filter.frequency.exponentialRampToValueAtTime(2600, start + 0.3);
    shape(gain, start, 0.06, 0.34, 0.018);
    source.connect(filter).connect(gain);
    connectToMix(audio, gain, 0.24);
    source.start(start);
    source.stop(start + 0.36);
  }

  function noiseSweep(delay, from, to, duration, volume, roomAmount) {
    if (muted) return;
    const audio = ctx();
    if (!audio) return;
    const start = audio.currentTime + (delay || 0);
    noiseSweepAt(audio, start, from, to, duration, volume, roomAmount);
  }

  function noiseSweepAt(audio, start, from, to, duration, volume, roomAmount) {
    const source = audio.createBufferSource();
    const filter = audio.createBiquadFilter();
    const gain = audio.createGain();

    source.buffer = getNoise(audio);
    filter.type = "bandpass";
    filter.Q.value = 0.72;
    filter.frequency.setValueAtTime(from, start);
    filter.frequency.exponentialRampToValueAtTime(to, start + duration);
    shape(gain, start, 0.004, duration, volume);
    source.connect(filter).connect(gain);
    connectToMix(audio, gain, roomAmount || 0.04);
    source.start(start);
    source.stop(start + duration + 0.02);
  }

  function scheduleImpactRoom(start, strong) {
    const tailEnd = start + (strong ? 0.36 : 0.18);
    const roomPeak = strong ? 0.075 : 0.045;
    impactRoomSend.gain.cancelScheduledValues(start);
    impactRoomSend.gain.setValueAtTime(0.0001, start);
    impactRoomSend.gain.setValueAtTime(0.0001, start + 0.045);
    impactRoomSend.gain.linearRampToValueAtTime(roomPeak, start + 0.075);
    impactRoomSend.gain.exponentialRampToValueAtTime(0.0001, tailEnd);
  }

  function impactCore(audio, start, type, strong) {
    const frequencies = {
      brave: [108, 72],
      wise: [100, 66],
      magic: [96, 64],
      monster: [92, 60]
    };
    const range = frequencies[type] || frequencies.brave;
    const bodyDuration = strong ? 0.36 : 0.18;
    const body = audio.createOscillator();
    const bodyGain = audio.createGain();
    const crack = audio.createBufferSource();
    const crackFilter = audio.createBiquadFilter();
    const crackGain = audio.createGain();
    const crackDuration = strong ? 0.065 : 0.045;

    body.type = "sine";
    body.frequency.setValueAtTime(range[0] + humanDetune(3), start);
    body.frequency.exponentialRampToValueAtTime(range[1], start + bodyDuration);
    bodyGain.gain.setValueAtTime(0.0001, start);
    bodyGain.gain.linearRampToValueAtTime(strong ? 0.13 : 0.11, start + 0.0025);
    bodyGain.gain.exponentialRampToValueAtTime(0.0001, start + bodyDuration);
    body.connect(bodyGain).connect(impactBus);
    body.start(start);
    body.stop(start + bodyDuration + 0.02);

    crack.buffer = getNoise(audio);
    crackFilter.type = "bandpass";
    crackFilter.frequency.value = strong ? 1850 : 900;
    crackFilter.Q.value = strong ? 0.55 : 0.7;
    crackGain.gain.setValueAtTime(0.0001, start);
    crackGain.gain.linearRampToValueAtTime(strong ? 0.13 : 0.075, start + 0.002);
    crackGain.gain.exponentialRampToValueAtTime(0.0001, start + crackDuration);
    crack.connect(crackFilter).connect(crackGain).connect(impactBus);
    crack.start(start);
    crack.stop(start + crackDuration + 0.02);

    scheduleImpactRoom(start, strong);
  }

  function attackSound(type, strong) {
    if (muted) return;
    const audio = ctx();
    if (!audio) return;
    const start = audio.currentTime + 0.012;
    const weight = strong ? 1.08 : 1;
    impactCore(audio, start, type, strong);

    if (type === "magic") {
      noiseSweepAt(audio, start, 680, 2900, 0.24, 0.014 * weight, 0.03);
      bell(strong ? 783.99 : 659.25, 0.055, {
        volume: 0.015 * weight,
        duration: 0.4,
        room: 0.1
      });
      return;
    }

    if (type === "wise") {
      noiseSweepAt(audio, start, 2400, 920, 0.11, 0.018 * weight, 0.02);
      pluck(392, 0.018, { volume: 0.036 * weight, duration: 0.26, room: 0.08 });
      pluck(783.99, 0.052, { volume: 0.018 * weight, duration: 0.22, room: 0.1 });
      return;
    }

    if (type === "monster") {
      noiseSweepAt(audio, start, 620, 260, 0.16, 0.026 * weight, 0.02);
      return;
    }

    noiseSweepAt(audio, start, 3400, 850, 0.13, 0.024 * weight, 0.02);
    bell(880, 0.045, {
      volume: 0.008 * weight,
      duration: 0.19,
      room: 0.08
    });
  }

  function melody(notes, gap, options) {
    options = options || {};
    notes.forEach(function (note, index) {
      pluck(note, index * gap, options);
    });
  }

  function castSound() {
    softSweep(0);
    pluck(523.25, 0, { volume: 0.038, duration: 0.34 });
    pluck(783.99, 0.065, { volume: 0.04, duration: 0.38 });
    bell(1046.5, 0.13, { volume: 0.025, duration: 0.56 });
  }

  const api = {
    prime: ctx,
    isMuted: function () { return muted; },
    setMuted: function (value) {
      muted = Boolean(value);
      try {
        localStorage.setItem("cards_muted", muted ? "1" : "0");
      } catch (error) {}
      if (!muted) {
        pluck(523.25, 0, { volume: 0.045, duration: 0.3 });
        bell(659.25, 0.055, { volume: 0.026, duration: 0.46 });
      }
      return muted;
    },
    select: function () {
      if (muted) return;
      const audio = ctx();
      if (!audio || audio.currentTime - lastSelectAt < 0.09) return;
      lastSelectAt = audio.currentTime;
      pluck(783.99, 0, { volume: 0.028, duration: 0.24, room: 0.12 });
      bell(1046.5, 0.035, { volume: 0.013, duration: 0.28, room: 0.14 });
    },
    turn: function () {
      pluck(587.33, 0, { volume: 0.032, duration: 0.28, room: 0.14 });
    },
    star: function () {
      bell(880, 0, { volume: 0.032, duration: 0.5 });
      bell(1318.51, 0.055, { volume: 0.021, duration: 0.42 });
    },
    attack: attackSound,
    hit: function () {
      attackSound("brave", false);
    },
    strongHit: function () {
      attackSound("brave", true);
    },
    cast: castSound,
    magic: function () {
      castSound();
    },
    heal: function () {
      melody([659.25, 783.99, 1046.5], 0.07, { volume: 0.036, duration: 0.42, room: 0.26 });
    },
    revive: function () {
      melody([523.25, 659.25, 783.99, 1046.5], 0.075, { volume: 0.04, duration: 0.48, room: 0.28 });
      bell(1318.51, 0.3, { volume: 0.026, duration: 0.72 });
    },
    coinSpin: function () {
      if (muted) return;
      const audio = ctx();
      if (!audio) return;
      const start = audio.currentTime;
      noiseTap(start, 980, 0.032, 0.018);
      noiseTap(start + 0.055, 1120, 0.03, 0.016);
      noiseTap(start + 0.125, 1260, 0.027, 0.014);
    },
    coinLand: function () {
      bell(880, 0, { volume: 0.025, duration: 0.28, room: 0.13 });
      bell(1320, 0.045, { volume: 0.018, duration: 0.34, room: 0.16 });
      woodHit(0.11, 0.028);
    },
    coin: function () {
      api.coinLand();
    },
    win: function () {
      melody([523.25, 659.25, 783.99, 1046.5], 0.105, { volume: 0.052, duration: 0.46 });
      bell(1318.51, 0.39, { volume: 0.034, duration: 0.82 });
    },
    lose: function () {
      melody([392, 329.63, 261.63], 0.14, { volume: 0.043, duration: 0.52, room: 0.24 });
      woodHit(0.32, 0.025);
    }
  };

  window.CardAudio = api;
}());
