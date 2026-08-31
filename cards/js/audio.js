(function () {
  "use strict";

  let context = null;
  let master = null;
  let room = null;
  let impactBus = null;
  let impactRoomSend = null;
  let musicBus = null;
  let noiseBuffer = null;
  let lastSelectAt = -Infinity;
  let muted = false;
  let musicMuted = false;
  let desiredScene = null;
  let musicTimer = 0;
  let nextMusicTime = 0;
  let musicStep = 0;
  let musicVariation = 0;
  let battleTense = false;
  let pageHidden = typeof document !== "undefined" && document.hidden;

  const LOOKAHEAD_MS = 50;
  const SCHEDULE_AHEAD_SECONDS = 0.18;
  const COLLECTION_BPM = 66;
  const BATTLE_BPM = 92;
  const COLLECTION_BARS = 8;
  const BATTLE_BARS = 8;
  const TENSION_SEMITONE = Math.pow(2, 1 / 12);

  try {
    muted = localStorage.getItem("cards_muted") === "1";
  } catch (error) {
    muted = false;
  }
  try {
    musicMuted = localStorage.getItem("cards_bgm_muted") === "1";
  } catch (error) {
    musicMuted = false;
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
    musicBus = audio.createGain();

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
    musicBus.gain.value = 0.0001;

    room.connect(roomGain).connect(master);
    impactBus.connect(impactLow).connect(impactShaper).connect(impactTrim);
    impactTrim.connect(master);
    impactTrim.connect(impactRoomSend).connect(room);
    musicBus.connect(master);
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
    if (context && context.state === "suspended") {
      const resumed = context.resume();
      if (resumed && typeof resumed.then === "function") {
        resumed.then(ensureMusicScheduler).catch(function () {});
      }
    }
    if (context && context.state === "running") ensureMusicScheduler();
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

    duckMusicAt(start, strong ? 0.14 : 0.22, strong ? 0.38 : 0.25);

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

  const COLLECTION_PATTERNS = Object.freeze([
    Object.freeze([0, null, 2, null, 3, null, 1, null, 0, null, 3, null, 4, null, 2, null, 1, null, 3, null, 5, null, 4, null, 2, null, 1, null, 0, null, 2, null]),
    Object.freeze([0, null, 1, null, 3, null, 4, null, 2, null, 4, null, 5, null, 3, null, 1, null, 2, null, 4, null, 3, null, 0, null, 2, null, 1, null, 0, null])
  ]);
  const BATTLE_PATTERNS = Object.freeze([
    Object.freeze([0, null, 2, 1, null, 3, 2, null, 0, 2, null, 4, 3, null, 2, 1]),
    Object.freeze([0, 1, null, 3, 2, null, 4, 2, 1, null, 3, 4, null, 2, 1, null])
  ]);
  const COLLECTION_NOTES = Object.freeze([261.63, 293.66, 329.63, 392, 440, 523.25]);
  const BATTLE_NOTES = Object.freeze([293.66, 349.23, 392, 440, 523.25]);

  function musicCanRun() {
    return Boolean(
      context &&
      context.state === "running" &&
      musicBus &&
      desiredScene &&
      !muted &&
      !musicMuted &&
      !pageHidden
    );
  }

  function musicGainTarget() {
    return musicCanRun() ? 0.72 : 0.0001;
  }

  function rampMusicBus(target, duration) {
    if (!context || !musicBus) return;
    const now = context.currentTime;
    const current = Math.max(0.0001, musicBus.gain.value || 0.0001);
    musicBus.gain.cancelScheduledValues(now);
    musicBus.gain.setValueAtTime(current, now);
    musicBus.gain.exponentialRampToValueAtTime(
      Math.max(0.0001, target),
      now + Math.max(0.01, duration || 0.08)
    );
  }

  function bgmPluckAt(audio, start, frequency, volume, duration) {
    if (!musicBus) return;
    [1, 2.01].forEach(function (ratio, index) {
      const oscillator = audio.createOscillator();
      const gain = audio.createGain();
      const level = volume * (index ? 0.18 : 1);
      const voiceDuration = duration * (index ? 0.55 : 1);
      oscillator.type = index ? "sine" : "triangle";
      oscillator.frequency.setValueAtTime(frequency * ratio, start);
      oscillator.detune.value = humanDetune(index ? 2 : 4);
      gain.gain.setValueAtTime(0.0001, start);
      gain.gain.linearRampToValueAtTime(level, start + 0.006);
      gain.gain.exponentialRampToValueAtTime(0.0001, start + voiceDuration);
      oscillator.connect(gain).connect(musicBus);
      oscillator.start(start);
      oscillator.stop(start + voiceDuration + 0.03);
    });
  }

  function bgmDroneAt(audio, start, frequency, volume, duration) {
    if (!musicBus) return;
    const oscillator = audio.createOscillator();
    const filter = audio.createBiquadFilter();
    const gain = audio.createGain();
    oscillator.type = "triangle";
    oscillator.frequency.setValueAtTime(frequency, start);
    filter.type = "lowpass";
    filter.frequency.value = 420;
    filter.Q.value = 0.55;
    gain.gain.setValueAtTime(0.0001, start);
    gain.gain.linearRampToValueAtTime(volume, start + 0.12);
    gain.gain.setValueAtTime(volume, start + Math.max(0.14, duration - 0.28));
    gain.gain.exponentialRampToValueAtTime(0.0001, start + duration);
    oscillator.connect(filter).connect(gain).connect(musicBus);
    oscillator.start(start);
    oscillator.stop(start + duration + 0.04);
  }

  function scheduleCollectionStep(audio, start, step) {
    const pattern = COLLECTION_PATTERNS[musicVariation % COLLECTION_PATTERNS.length];
    const degree = pattern[step % pattern.length];
    if (degree === null || degree === undefined) return;
    const bar = Math.floor(step / 4) % COLLECTION_BARS;
    const breath = bar % 2 ? 0.92 : 1;
    bgmPluckAt(audio, start, COLLECTION_NOTES[degree], 0.018 * breath, 0.72);
  }

  function scheduleBattleStep(audio, start, step) {
    const pattern = BATTLE_PATTERNS[musicVariation % BATTLE_PATTERNS.length];
    const degree = pattern[step % pattern.length];
    const pitchLift = battleTense ? TENSION_SEMITONE : 1;
    if (step % 8 === 0) {
      const droneFrequency = (musicVariation % 2 ? 130.81 : 146.83) * pitchLift;
      bgmDroneAt(audio, start, droneFrequency, 0.006, (60 / BATTLE_BPM) * 3.8);
    }
    if (degree === null || degree === undefined) return;
    bgmPluckAt(audio, start, BATTLE_NOTES[degree] * pitchLift, 0.014, 0.28);
  }

  function schedulerTick() {
    clearTimeout(musicTimer);
    musicTimer = 0;
    if (!musicCanRun()) {
      rampMusicBus(0.0001, 0.08);
      return;
    }

    const audio = context;
    const collection = desiredScene === "collection";
    const stepSeconds = collection ? 60 / COLLECTION_BPM : (60 / BATTLE_BPM) / 2;
    const cycleSteps = collection ? COLLECTION_BARS * 4 : BATTLE_BARS * 8;
    while (nextMusicTime < audio.currentTime + SCHEDULE_AHEAD_SECONDS) {
      if (collection) {
        scheduleCollectionStep(audio, nextMusicTime, musicStep);
      } else {
        scheduleBattleStep(audio, nextMusicTime, musicStep);
      }
      musicStep += 1;
      nextMusicTime += stepSeconds;
      if (musicStep % cycleSteps === 0) {
        musicVariation = Math.random() < 0.5 ? 0 : 1;
      }
    }
    musicTimer = setTimeout(schedulerTick, LOOKAHEAD_MS);
  }

  function ensureMusicScheduler() {
    if (!context || !musicBus) return;
    if (!musicCanRun()) {
      clearTimeout(musicTimer);
      musicTimer = 0;
      rampMusicBus(0.0001, 0.08);
      return;
    }
    rampMusicBus(musicGainTarget(), 0.16);
    if (!musicTimer) {
      nextMusicTime = Math.max(context.currentTime + 0.04, nextMusicTime);
      schedulerTick();
    }
  }

  function stopBgm() {
    desiredScene = null;
    clearTimeout(musicTimer);
    musicTimer = 0;
    nextMusicTime = 0;
    musicStep = 0;
    rampMusicBus(0.0001, 0.12);
  }

  function setScene(scene) {
    const nextScene = scene === "battle" ? "battle" : scene === "collection" ? "collection" : null;
    if (!nextScene) {
      stopBgm();
      return null;
    }
    if (desiredScene !== nextScene) {
      desiredScene = nextScene;
      musicStep = 0;
      musicVariation = 0;
      nextMusicTime = context ? context.currentTime + 0.05 : 0;
    }
    ensureMusicScheduler();
    return desiredScene;
  }

  function duckMusicAt(start, depth, duration) {
    if (!musicCanRun()) return;
    const current = Math.max(0.0001, musicBus.gain.value || musicGainTarget());
    musicBus.gain.cancelScheduledValues(start);
    musicBus.gain.setValueAtTime(current, start);
    musicBus.gain.exponentialRampToValueAtTime(Math.max(0.0001, depth), start + 0.012);
    musicBus.gain.exponentialRampToValueAtTime(musicGainTarget(), start + duration);
  }

  function duckMusic() {
    const audio = context;
    if (!audio) return;
    duckMusicAt(audio.currentTime, 0.22, 0.28);
  }

  function melody(notes, gap, options) {
    options = options || {};
    notes.forEach(function (note, index) {
      pluck(note, index * gap, options);
    });
  }

  function castSound() {
    duckMusic();
    softSweep(0);
    pluck(523.25, 0, { volume: 0.038, duration: 0.34 });
    pluck(783.99, 0.065, { volume: 0.04, duration: 0.38 });
    bell(1046.5, 0.13, { volume: 0.025, duration: 0.56 });
  }

  const api = {
    prime: function () {
      const audio = ctx();
      ensureMusicScheduler();
      return audio;
    },
    isMuted: function () { return muted; },
    setMuted: function (value) {
      muted = Boolean(value);
      try {
        localStorage.setItem("cards_muted", muted ? "1" : "0");
      } catch (error) {}
      if (!muted) {
        ctx();
        pluck(523.25, 0, { volume: 0.045, duration: 0.3 });
        bell(659.25, 0.055, { volume: 0.026, duration: 0.46 });
      }
      ensureMusicScheduler();
      return muted;
    },
    isBgmMuted: function () { return musicMuted; },
    setBgmMuted: function (value) {
      musicMuted = Boolean(value);
      try {
        localStorage.setItem("cards_bgm_muted", musicMuted ? "1" : "0");
      } catch (error) {}
      if (!musicMuted) ctx();
      ensureMusicScheduler();
      return musicMuted;
    },
    setScene: setScene,
    stopBgm: stopBgm,
    updateBattleHp: function (currentHp, maxHp) {
      const maximum = Math.max(1, Number(maxHp) || 1);
      battleTense = Math.max(0, Number(currentHp) || 0) / maximum <= 0.3;
      return battleTense;
    },
    setPageHidden: function (hidden) {
      pageHidden = Boolean(hidden);
      ensureMusicScheduler();
      return pageHidden;
    },
    bgmConfig: Object.freeze({
      collectionBpm: COLLECTION_BPM,
      battleBpm: BATTLE_BPM,
      lookaheadMs: LOOKAHEAD_MS,
      scheduleAheadSeconds: SCHEDULE_AHEAD_SECONDS,
      collectionBars: COLLECTION_BARS,
      battleBars: BATTLE_BARS
    }),
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
      stopBgm();
      melody([523.25, 659.25, 783.99, 1046.5], 0.105, { volume: 0.052, duration: 0.46 });
      bell(1318.51, 0.39, { volume: 0.034, duration: 0.82 });
    },
    lose: function () {
      stopBgm();
      melody([392, 329.63, 261.63], 0.14, { volume: 0.043, duration: 0.52, room: 0.24 });
      woodHit(0.32, 0.025);
    }
  };

  window.CardAudio = api;
}());
