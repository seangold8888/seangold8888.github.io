(function () {
  "use strict";

  let context = null;
  let master = null;
  let room = null;
  let roomGain = null;
  let uiBus = null;
  let sfxBus = null;
  let transientBus = null;
  let bodyBus = null;
  let materialBus = null;
  let materialRoomSend = null;
  let materialRoomDelay = null;
  let musicBus = null;
  let musicDuckBus = null;
  let noiseBuffers = null;
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
  let needsAudioRecovery = false;
  let resumePending = false;
  let resumeWatchdog = 0;
  let resumeGeneration = 0;
  const techniquePlanCache = new WeakMap();
  const lastTechniqueVariation = Object.create(null);
  const activeOneShots = [];
  const activeMusicSources = [];

  const LOOKAHEAD_MS = 50;
  const SCHEDULE_AHEAD_SECONDS = 0.18;
  const COLLECTION_BPM = 66;
  const BATTLE_BPM = 92;
  const COLLECTION_BARS = 8;
  const BATTLE_BARS = 8;
  const TENSION_SEMITONE = Math.pow(2, 1 / 12);
  const MAX_ACTIVE_ONE_SHOTS = 24;
  const MAX_MUSIC_STEPS_PER_TICK = 8;

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
    const uiFilter = audio.createBiquadFilter();
    const dcFilter = audio.createBiquadFilter();
    const bodyLow = audio.createBiquadFilter();
    const bodyShaper = audio.createWaveShaper();
    const bodyTrim = audio.createGain();
    master = audio.createGain();
    room = audio.createConvolver();
    roomGain = audio.createGain();
    uiBus = audio.createGain();
    sfxBus = audio.createGain();
    transientBus = audio.createGain();
    bodyBus = audio.createGain();
    materialBus = audio.createGain();
    materialRoomSend = audio.createGain();
    materialRoomDelay = audio.createDelay(0.1);
    musicBus = audio.createGain();
    musicDuckBus = audio.createGain();

    master.gain.value = 0.54;
    toneFilter.type = "lowpass";
    toneFilter.frequency.value = 9500;
    toneFilter.Q.value = 0.42;
    uiFilter.type = "lowpass";
    uiFilter.frequency.value = 6600;
    uiFilter.Q.value = 0.45;
    dcFilter.type = "highpass";
    dcFilter.frequency.value = 35;
    dcFilter.Q.value = 0.52;
    compressor.threshold.value = -8;
    compressor.knee.value = 4;
    compressor.ratio.value = 12;
    compressor.attack.value = 0.002;
    compressor.release.value = 0.11;
    room.buffer = makeRoomImpulse(audio);
    roomGain.gain.value = 0.16;
    uiBus.gain.value = 1;
    sfxBus.gain.value = 1;
    transientBus.gain.value = 0.94;
    bodyBus.gain.value = 1;
    materialBus.gain.value = 0.92;
    bodyLow.type = "lowshelf";
    bodyLow.frequency.value = 170;
    bodyLow.gain.value = 2.4;
    bodyShaper.curve = makeSoftClipCurve(2048, 1.4);
    if ("oversample" in bodyShaper) bodyShaper.oversample = "2x";
    bodyTrim.gain.value = 0.62;
    materialRoomSend.gain.value = 0.12;
    materialRoomDelay.delayTime.value = 0.035;
    musicBus.gain.value = 0.0001;
    musicDuckBus.gain.value = 1;

    room.connect(roomGain).connect(master);
    uiBus.connect(uiFilter).connect(master);
    transientBus.connect(sfxBus);
    bodyBus.connect(bodyLow).connect(bodyShaper).connect(bodyTrim).connect(sfxBus);
    materialBus.connect(sfxBus);
    materialBus.connect(materialRoomSend).connect(materialRoomDelay).connect(room);
    sfxBus.connect(dcFilter).connect(master);
    musicBus.connect(musicDuckBus).connect(master);
    master.connect(toneFilter).connect(compressor).connect(audio.destination);
  }

  function stopActiveOneShots(atTime) {
    const sources = activeOneShots.splice(0);
    sources.forEach(function (entry) {
      try {
        entry.source.stop(atTime);
      } catch (error) {}
    });
  }

  function forgetMusicSource(entry) {
    const index = activeMusicSources.indexOf(entry);
    if (index >= 0) activeMusicSources.splice(index, 1);
  }

  function trackMusicSource(source, stopAt) {
    const entry = { source: source, stopAt: stopAt };
    activeMusicSources.push(entry);
    if (typeof source.addEventListener === "function") {
      source.addEventListener("ended", function () {
        forgetMusicSource(entry);
      }, { once: true });
    }
  }

  function stopActiveMusic(atTime) {
    const sources = activeMusicSources.splice(0);
    sources.forEach(function (entry) {
      try {
        entry.source.stop(atTime);
      } catch (error) {}
    });
  }

  function releaseAudioGraph(force) {
    if (!context || (!force && context.state !== "closed")) return false;
    const staleContext = context;
    stopActiveOneShots(staleContext.currentTime);
    stopActiveMusic(staleContext.currentTime);
    clearTimeout(musicTimer);
    clearTimeout(resumeWatchdog);
    musicTimer = 0;
    resumeWatchdog = 0;
    resumePending = false;
    resumeGeneration += 1;
    nextMusicTime = 0;
    musicStep = 0;
    lastSelectAt = -Infinity;
    context = null;
    master = null;
    room = null;
    roomGain = null;
    uiBus = null;
    sfxBus = null;
    transientBus = null;
    bodyBus = null;
    materialBus = null;
    materialRoomSend = null;
    materialRoomDelay = null;
    musicBus = null;
    musicDuckBus = null;
    noiseBuffers = null;
    if (
      force &&
      staleContext.state !== "closed" &&
      typeof staleContext.close === "function"
    ) {
      try {
        const closing = staleContext.close();
        if (closing && typeof closing.catch === "function") {
          closing.catch(function () {});
        }
      } catch (error) {}
    }
    return true;
  }

  function releaseClosedGraph() {
    return releaseAudioGraph(false);
  }

  function requestAudioRecovery() {
    needsAudioRecovery = true;
    clearTimeout(musicTimer);
    musicTimer = 0;
    if (context) stopActiveOneShots(context.currentTime);
    if (context) stopActiveMusic(context.currentTime);
  }

  function attemptContextResume(audio) {
    if (
      !audio ||
      audio.state === "running" ||
      audio.state === "closed" ||
      resumePending ||
      typeof audio.resume !== "function"
    ) return;
    const generation = ++resumeGeneration;
    resumePending = true;
    clearTimeout(resumeWatchdog);
    resumeWatchdog = setTimeout(function () {
      if (context !== audio || generation !== resumeGeneration) return;
      resumePending = false;
      needsAudioRecovery = true;
    }, 480);
    try {
      const resumed = audio.resume();
      if (resumed && typeof resumed.then === "function") {
        resumed.then(function () {
          if (context !== audio || generation !== resumeGeneration) return;
          clearTimeout(resumeWatchdog);
          resumeWatchdog = 0;
          resumePending = false;
          if (audio.state === "running") ensureMusicScheduler();
          else needsAudioRecovery = true;
        }).catch(function () {
          if (context !== audio || generation !== resumeGeneration) return;
          clearTimeout(resumeWatchdog);
          resumeWatchdog = 0;
          resumePending = false;
          needsAudioRecovery = true;
        });
      } else {
        clearTimeout(resumeWatchdog);
        resumeWatchdog = 0;
        resumePending = false;
        if (audio.state !== "running") needsAudioRecovery = true;
      }
    } catch (error) {
      clearTimeout(resumeWatchdog);
      resumeWatchdog = 0;
      resumePending = false;
      needsAudioRecovery = true;
    }
  }

  function ctx(allowRecovery) {
    if (pageHidden) return null;
    if (needsAudioRecovery) {
      if (!allowRecovery) return null;
      releaseAudioGraph(true);
      needsAudioRecovery = false;
    } else {
      releaseClosedGraph();
    }
    if (!context) {
      const AudioContext = window.AudioContext || window.webkitAudioContext;
      if (AudioContext) {
        try {
          context = new AudioContext({ latencyHint: "interactive" });
        } catch (error) {
          context = new AudioContext();
        }
        setupGraph(context);
      }
    }
    attemptContextResume(context);
    if (context && context.state === "running") ensureMusicScheduler();
    return context;
  }

  function connectToMix(audio, node, roomAmount) {
    node.connect(uiBus || master);
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

  function forgetOneShot(entry) {
    const index = activeOneShots.indexOf(entry);
    if (index >= 0) activeOneShots.splice(index, 1);
  }

  function trackOneShot(audio, source, start, stopAt, priority) {
    const nextPriority = Math.max(0, Number(priority) || 0);
    for (let index = activeOneShots.length - 1; index >= 0; index -= 1) {
      if (activeOneShots[index].stopAt <= audio.currentTime) {
        activeOneShots.splice(index, 1);
      }
    }
    if (activeOneShots.length >= MAX_ACTIVE_ONE_SHOTS) {
      let victimIndex = 0;
      for (let index = 1; index < activeOneShots.length; index += 1) {
        const candidate = activeOneShots[index];
        const victim = activeOneShots[victimIndex];
        if (
          candidate.priority < victim.priority ||
          (candidate.priority === victim.priority && candidate.stopAt < victim.stopAt)
        ) {
          victimIndex = index;
        }
      }
      const victim = activeOneShots.splice(victimIndex, 1)[0];
      if (nextPriority <= victim.priority) {
        activeOneShots.splice(victimIndex, 0, victim);
        return false;
      }
      try {
        victim.source.stop(audio.currentTime);
      } catch (error) {}
    }
    const entry = {
      source: source,
      start: start,
      stopAt: stopAt,
      priority: nextPriority
    };
    activeOneShots.push(entry);
    if (typeof source.addEventListener === "function") {
      source.addEventListener("ended", function () {
        forgetOneShot(entry);
      }, { once: true });
    }
    return true;
  }

  function getNoise(audio, colourIndex) {
    if (!noiseBuffers) {
      noiseBuffers = Array.from({ length: 3 }, function (_, bufferIndex) {
        const length = Math.floor(audio.sampleRate * 0.72);
        const buffer = audio.createBuffer(1, length, audio.sampleRate);
        const data = buffer.getChannelData(0);
        let brown = 0;
        for (let index = 0; index < data.length; index += 1) {
          const white = Math.random() * 2 - 1;
          brown = (brown + 0.02 * white) / 1.02;
          data[index] = bufferIndex === 2
            ? Math.max(-1, Math.min(1, brown * 3.5))
            : bufferIndex === 1
              ? (white + (index ? data[index - 1] : 0)) * 0.42
              : white;
        }
        return buffer;
      });
    }
    const selected = Number.isInteger(colourIndex)
      ? Math.max(0, Math.min(noiseBuffers.length - 1, colourIndex))
      : Math.floor(Math.random() * noiseBuffers.length);
    return noiseBuffers[selected];
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

    if (!trackOneShot(audio, source, start, start + duration + 0.02, 1)) return;
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
      if (!trackOneShot(
        audio,
        oscillator,
        start,
        start + modeDuration + 0.03,
        1
      )) return;
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
    if (!trackOneShot(audio, source, start, start + duration + 0.01, 1)) return;
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
    if (!trackOneShot(audio, body, start, start + 0.2, 2)) return;
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
    if (!trackOneShot(audio, source, start, start + 0.36, 1)) return;
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
    if (!trackOneShot(audio, source, start, start + duration + 0.02, 1)) return;
    source.connect(filter).connect(gain);
    connectToMix(audio, gain, roomAmount || 0.04);
    source.start(start);
    source.stop(start + duration + 0.02);
  }

  const MATERIAL_PROFILES = Object.freeze({
    stone: Object.freeze({
      noise: 2, transientHz: 1450, transientQ: 0.58, transientDuration: 0.045,
      bodyFrom: 205, bodyTo: 92, bodyLevel: 0.074,
      baseHz: 190, modes: [1, 2.13, 4.67], levels: [1, 0.31, 0.1],
      qs: [6.2, 8.5, 10.5], decay: 0.27, room: 0.07, spread: 0.13
    }),
    metal: Object.freeze({
      noise: 0, transientHz: 4700, transientQ: 1.08, transientDuration: 0.032,
      bodyFrom: 232, bodyTo: 128, bodyLevel: 0.052,
      baseHz: 640, modes: [1, 1.63, 2.78, 4.07], levels: [1, 0.48, 0.23, 0.09],
      qs: [15, 18, 21, 24], decay: 0.39, room: 0.19, spread: 0.2
    }),
    wood: Object.freeze({
      noise: 1, transientHz: 1850, transientQ: 0.82, transientDuration: 0.038,
      bodyFrom: 194, bodyTo: 105, bodyLevel: 0.065,
      baseHz: 245, modes: [1, 2.46, 4.18], levels: [1, 0.34, 0.12],
      qs: [4.4, 6.2, 7.6], decay: 0.2, room: 0.055, spread: 0.11
    }),
    glass: Object.freeze({
      noise: 0, transientHz: 5600, transientQ: 1.22, transientDuration: 0.026,
      bodyFrom: 175, bodyTo: 112, bodyLevel: 0.018,
      baseHz: 760, modes: [1, 2.32, 4.21, 5.43], levels: [1, 0.35, 0.12, 0.055],
      qs: [18, 22, 25, 28], decay: 0.44, room: 0.22, spread: 0.23
    }),
    body: Object.freeze({
      noise: 2, transientHz: 920, transientQ: 0.48, transientDuration: 0.052,
      bodyFrom: 174, bodyTo: 74, bodyLevel: 0.09,
      baseHz: 128, modes: [1, 1.52, 2.61], levels: [1, 0.25, 0.08],
      qs: [2.1, 2.8, 3.6], decay: 0.17, room: 0.035, spread: 0.06
    }),
    paper: Object.freeze({
      noise: 0, transientHz: 3300, transientQ: 0.52, transientDuration: 0.075,
      bodyFrom: 168, bodyTo: 112, bodyLevel: 0.018,
      baseHz: 325, modes: [1, 1.72, 2.86], levels: [1, 0.24, 0.08],
      qs: [2.6, 3.1, 3.8], decay: 0.16, room: 0.045, spread: 0.2
    }),
    crystal: Object.freeze({
      noise: 0, transientHz: 4100, transientQ: 1.15, transientDuration: 0.035,
      bodyFrom: 186, bodyTo: 118, bodyLevel: 0.016,
      baseHz: 570, modes: [1, 2.74, 4.08, 5.77], levels: [1, 0.31, 0.12, 0.045],
      qs: [17, 21, 24, 27], decay: 0.47, room: 0.25, spread: 0.24
    }),
    air: Object.freeze({
      noise: 0, transientHz: 2450, transientQ: 0.43, transientDuration: 0.09,
      bodyFrom: 155, bodyTo: 104, bodyLevel: 0.014,
      baseHz: 410, modes: [1, 1.56, 2.42], levels: [1, 0.22, 0.07],
      qs: [2.2, 2.9, 3.4], decay: 0.2, room: 0.13, spread: 0.25
    }),
    fire: Object.freeze({
      noise: 0, transientHz: 2050, transientQ: 0.4, transientDuration: 0.115,
      bodyFrom: 194, bodyTo: 96, bodyLevel: 0.046,
      baseHz: 268, modes: [1, 1.47, 2.93], levels: [1, 0.22, 0.07],
      qs: [2.6, 3.2, 4.1], decay: 0.24, room: 0.09, spread: 0.19
    }),
    earth: Object.freeze({
      noise: 2, transientHz: 720, transientQ: 0.42, transientDuration: 0.105,
      bodyFrom: 166, bodyTo: 67, bodyLevel: 0.097,
      baseHz: 146, modes: [1, 1.57, 2.91], levels: [1, 0.27, 0.08],
      qs: [2.4, 3.3, 4.2], decay: 0.25, room: 0.045, spread: 0.07
    }),
    hollow: Object.freeze({
      noise: 1, transientHz: 1320, transientQ: 0.72, transientDuration: 0.052,
      bodyFrom: 186, bodyTo: 82, bodyLevel: 0.083,
      baseHz: 164, modes: [1, 2.31, 3.72], levels: [1, 0.38, 0.14],
      qs: [5.2, 7.1, 8.8], decay: 0.28, room: 0.085, spread: 0.14
    })
  });
  const MATERIAL_BY_EMOJI = Object.freeze({
    "🪨": "stone", "🗿": "stone",
    "⚔️": "metal", "🗡️": "metal", "🪓": "metal", "👑": "metal",
    "🪙": "metal", "🥚": "metal",
    "🏹": "wood", "🌱": "wood", "📏": "wood",
    "👠": "glass", "🍭": "glass",
    "👊": "body", "🐷": "body", "🐢": "body", "🐒": "body",
    "🐑": "body", "🐍": "body", "🐯": "body", "🍡": "body",
    "🌾": "paper", "🏁": "paper",
    "✨": "crystal", "🌟": "crystal", "❄️": "crystal",
    "🧊": "crystal", "🪄": "crystal",
    "💨": "air", "🌊": "air", "🎵": "air", "🎺": "air",
    "🌨️": "air", "🐦": "air", "👀": "air",
    "🔥": "fire", "💥": "fire", "🪔": "fire",
    "🦶": "earth",
    "🐴": "hollow", "🎃": "hollow"
  });
  const DEFAULT_MATERIAL_BY_TYPE = Object.freeze({
    brave: "body",
    wise: "paper",
    magic: "crystal",
    monster: "earth"
  });
  const VALID_TECHNIQUE_KINDS = Object.freeze([
    "projectile",
    "summon",
    "strike",
    "burst",
    "aura",
    "debuff"
  ]);

  function chooseTechniqueVariation(key) {
    const previous = lastTechniqueVariation[key];
    const first = Math.floor(Math.random() * 3);
    const next = first === previous ? (first + 1 + Math.floor(Math.random() * 2)) % 3 : first;
    lastTechniqueVariation[key] = next;
    return next;
  }

  function stableTechniqueSignature(plan) {
    const text = [
      plan && plan.attack ? plan.attack : "",
      plan && plan.emoji ? plan.emoji : "✦",
      plan && plan.kind ? plan.kind : "burst"
    ].join("|");
    let hash = 2166136261;
    for (let index = 0; index < text.length; index += 1) {
      hash ^= text.charCodeAt(index);
      hash = Math.imul(hash, 16777619);
    }
    return hash >>> 0;
  }

  function soundPlanForTechnique(plan) {
    plan = plan || {};
    const type = ["brave", "wise", "magic", "monster"].includes(plan.type)
      ? plan.type
      : "magic";
    const kind = VALID_TECHNIQUE_KINDS.includes(plan.kind)
      ? plan.kind
      : "burst";
    const outcome = ["hit", "blocked", "miss", "evade", "support"].includes(plan.outcome)
      ? plan.outcome
      : "support";
    const material = MATERIAL_BY_EMOJI[plan.emoji] ||
      DEFAULT_MATERIAL_BY_TYPE[type];
    const materialProfile = MATERIAL_PROFILES[material] || MATERIAL_PROFILES.earth;
    const strong = Boolean(plan.big || plan.weakness);
    const signature = stableTechniqueSignature(plan);
    const key = [kind, type, material, signature].join(":");
    const hasContact = outcome === "hit";
    const blocked = outcome === "blocked";
    return {
      kind: kind,
      type: type,
      material: material,
      materialProfile: material,
      tailMs: Math.round(materialProfile.decay * 1000),
      voicePriority: strong ? 3 : 2,
      signature: signature,
      signatureCents: (signature % 73) - 36,
      brightness: 0.9 + ((signature >>> 8) % 21) / 100,
      outcome: outcome,
      variation: chooseTechniqueVariation(key),
      strong: strong,
      weakness: Boolean(plan.weakness),
      knockout: Boolean(plan.knockout),
      revive: Boolean(plan.revive),
      intent: plan.sound || null,
      support: outcome === "support",
      hasTransient: hasContact || blocked,
      hasBody: hasContact && type !== "magic",
      hasImpact: hasContact,
      impactAtMs: Math.max(0, Number(plan.impactAtMs) || 0),
      totalMs: Math.max(0, Number(plan.totalMs) || 0),
      direction: plan.actor === "enemy" || plan.direction < 0 ? -1 : 1
    };
  }

  function resolvedTechniqueSoundPlan(plan) {
    if (!plan || typeof plan !== "object") return soundPlanForTechnique(plan);
    if (!techniquePlanCache.has(plan)) {
      techniquePlanCache.set(plan, soundPlanForTechnique(plan));
    }
    const cached = techniquePlanCache.get(plan);
    cached.knockout = Boolean(plan.knockout);
    cached.revive = Boolean(plan.revive);
    cached.weakness = Boolean(plan.weakness);
    cached.strong = Boolean(plan.big || plan.weakness);
    cached.voicePriority = cached.strong ? 3 : 2;
    return cached;
  }

  function connectWithPan(audio, node, destination, start, duration, from, to) {
    if (typeof audio.createStereoPanner !== "function") {
      node.connect(destination);
      return null;
    }
    const panner = audio.createStereoPanner();
    const safeFrom = Math.max(-0.35, Math.min(0.35, from || 0));
    const safeTo = Math.max(-0.35, Math.min(0.35, to || 0));
    panner.pan.setValueAtTime(safeFrom, start);
    panner.pan.linearRampToValueAtTime(safeTo, start + duration);
    node.connect(panner).connect(destination);
    return panner;
  }

  function noiseBurstAt(audio, start, options) {
    options = options || {};
    const duration = Math.max(0.008, options.duration || 0.045);
    const source = audio.createBufferSource();
    const filter = audio.createBiquadFilter();
    const gain = audio.createGain();
    const buffer = getNoise(audio, options.noise);
    const offsetLimit = Math.max(0, buffer.duration - duration - 0.015);
    source.buffer = buffer;
    filter.type = options.filterType || "bandpass";
    filter.frequency.value = Math.max(
      90,
      (options.frequency || 2200) * (0.94 + Math.random() * 0.12)
    );
    filter.Q.value = options.q || 0.72;
    gain.gain.setValueAtTime(0.0001, start);
    gain.gain.linearRampToValueAtTime(
      Math.min(0.075, options.volume || 0.052),
      start + Math.min(0.003, duration * 0.14)
    );
    gain.gain.exponentialRampToValueAtTime(0.0001, start + duration);
    if (!trackOneShot(
      audio,
      source,
      start,
      start + duration + 0.012,
      options.priority === undefined ? 2 : options.priority
    )) return;
    source.connect(filter).connect(gain);
    connectWithPan(
      audio,
      gain,
      options.bus || transientBus,
      start,
      duration,
      options.pan || 0,
      options.pan || 0
    );
    source.start(start, Math.random() * offsetLimit, duration + 0.008);
    source.stop(start + duration + 0.012);
  }

  function whooshAt(audio, start, options) {
    options = options || {};
    const duration = Math.max(0.06, Math.min(0.55, options.duration || 0.18));
    const source = audio.createBufferSource();
    const filter = audio.createBiquadFilter();
    const gain = audio.createGain();
    const buffer = getNoise(audio);
    const offsetLimit = Math.max(0, buffer.duration - duration - 0.02);
    source.buffer = buffer;
    filter.type = "bandpass";
    filter.Q.value = options.q || 0.58;
    filter.frequency.setValueAtTime(
      Math.max(90, options.fromHz || 700),
      start
    );
    filter.frequency.exponentialRampToValueAtTime(
      Math.max(90, options.toHz || 3200),
      start + duration
    );
    gain.gain.setValueAtTime(0.0001, start);
    gain.gain.linearRampToValueAtTime(
      Math.min(0.055, options.volume || 0.024),
      start + Math.min(0.055, duration * 0.28)
    );
    gain.gain.setValueAtTime(
      Math.min(0.055, options.volume || 0.024),
      start + duration * 0.62
    );
    gain.gain.exponentialRampToValueAtTime(0.0001, start + duration);
    if (!trackOneShot(
      audio,
      source,
      start,
      start + duration + 0.018,
      options.priority === undefined ? 1 : options.priority
    )) return;
    source.connect(filter).connect(gain);
    connectWithPan(
      audio,
      gain,
      materialBus,
      start,
      duration,
      options.panFrom || 0,
      options.panTo || 0
    );
    source.start(start, Math.random() * offsetLimit, duration + 0.012);
    source.stop(start + duration + 0.018);
  }

  function toneSweepAt(audio, start, options) {
    options = options || {};
    const duration = Math.max(0.045, options.duration || 0.16);
    const oscillator = audio.createOscillator();
    const gain = audio.createGain();
    oscillator.type = options.type || "triangle";
    oscillator.frequency.setValueAtTime(
      Math.max(45, (options.fromHz || 180) * Math.pow(2, humanDetune(8) / 1200)),
      start
    );
    oscillator.frequency.exponentialRampToValueAtTime(
      Math.max(40, options.toHz || 95),
      start + duration
    );
    gain.gain.setValueAtTime(0.0001, start);
    gain.gain.linearRampToValueAtTime(
      Math.min(0.13, options.volume || 0.07),
      start + Math.min(0.003, duration * 0.1)
    );
    gain.gain.exponentialRampToValueAtTime(0.0001, start + duration);
    if (!trackOneShot(
      audio,
      oscillator,
      start,
      start + duration + 0.02,
      options.priority === undefined ? 2 : options.priority
    )) return;
    oscillator.connect(gain).connect(options.bus || bodyBus);
    oscillator.start(start);
    oscillator.stop(start + duration + 0.02);
  }

  function modalHitAt(audio, start, options) {
    options = options || {};
    const ratios = options.ratios || [1, 2.17, 3.86];
    const levels = options.levels || [1, 0.38, 0.18];
    const decays = options.decays || [1, 0.72, 0.5];
    ratios.forEach(function (ratio, index) {
      const duration = Math.max(0.07, (options.duration || 0.28) * decays[index]);
      const oscillator = audio.createOscillator();
      const gain = audio.createGain();
      oscillator.type = index ? "sine" : (options.type || "triangle");
      oscillator.frequency.value = (options.baseHz || 420) * ratio;
      oscillator.detune.value = humanDetune(18);
      gain.gain.setValueAtTime(0.0001, start);
      gain.gain.linearRampToValueAtTime(
        Math.min(0.065, (options.volume || 0.035) * levels[index]),
        start + (index ? 0.004 : 0.0025)
      );
      gain.gain.exponentialRampToValueAtTime(0.0001, start + duration);
      if (!trackOneShot(
        audio,
        oscillator,
        start,
        start + duration + 0.02,
        options.priority === undefined ? 1 : options.priority
      )) return;
      oscillator.connect(gain).connect(materialBus);
      oscillator.start(start);
      oscillator.stop(start + duration + 0.02);
    });
  }

  function materialResonanceAt(audio, start, soundPlan) {
    const profile = MATERIAL_PROFILES[soundPlan.material] || MATERIAL_PROFILES.earth;
    const strong = soundPlan.strong;
    const duration = profile.decay * (strong ? 1.18 : 0.92);
    const source = audio.createBufferSource();
    const colourFilter = audio.createBiquadFilter();
    const excitation = audio.createGain();
    const buffer = getNoise(audio, profile.noise);
    const offsetLimit = Math.max(0, buffer.duration - duration - 0.018);
    const variationRatio = (
      1 + (soundPlan.variation - 1) * 0.014
    ) * Math.pow(2, (Number(soundPlan.signatureCents) || 0) / 1200);
    const targetPan = soundPlan.direction > 0 ? -0.075 : 0.075;

    source.buffer = buffer;
    colourFilter.type = "bandpass";
    colourFilter.frequency.value = Math.max(110, profile.transientHz * 0.64);
    colourFilter.Q.value = Math.max(0.32, profile.transientQ * 0.72);
    excitation.gain.setValueAtTime(0.0001, start);
    excitation.gain.linearRampToValueAtTime(
      strong ? 0.088 : 0.066,
      start + 0.0025
    );
    excitation.gain.exponentialRampToValueAtTime(0.0001, start + duration);
    if (!trackOneShot(
      audio,
      source,
      start,
      start + duration + 0.014,
      soundPlan.voicePriority
    )) return;
    source.connect(colourFilter).connect(excitation);

    profile.modes.forEach(function (ratio, index) {
      const resonator = audio.createBiquadFilter();
      const modeGain = audio.createGain();
      const roomSend = audio.createGain();
      const panOffset = (index % 2 ? 1 : -1) * profile.spread;
      resonator.type = "bandpass";
      resonator.frequency.value = Math.min(
        7600,
        profile.baseHz * ratio * variationRatio * Math.pow(2, humanDetune(7) / 1200)
      );
      resonator.Q.value = profile.qs[index] || profile.qs[profile.qs.length - 1];
      modeGain.gain.value = profile.levels[index] || 0.05;
      roomSend.gain.value = Math.max(0.001, profile.room * (strong ? 0.24 : 0.17));
      excitation.connect(resonator).connect(modeGain);
      connectWithPan(
        audio,
        modeGain,
        materialBus,
        start,
        duration,
        targetPan + panOffset,
        targetPan + panOffset * 0.45
      );
      modeGain.connect(roomSend).connect(room);
    });

    source.start(start, Math.random() * offsetLimit, duration + 0.01);
    source.stop(start + duration + 0.014);
  }

  function launchEnvelopeDuration(impactSeconds, startOffset, preImpactGap, minimum, maximum) {
    return Math.min(maximum, Math.max(minimum, impactSeconds - startOffset - preImpactGap));
  }

  function techniqueLaunch(plan) {
    if (muted || !plan) return null;
    const audio = ctx();
    if (!audio) return null;
    const soundPlan = resolvedTechniqueSoundPlan(plan);
    const start = audio.currentTime + 0.005;
    const direction = soundPlan.direction;
    const profile = MATERIAL_PROFILES[soundPlan.material] || MATERIAL_PROFILES.earth;
    const panFrom = direction > 0 ? 0.18 : -0.18;
    const panTo = -panFrom;
    const impactSeconds = Math.max(0.08, soundPlan.impactAtMs / 1000);

    if (soundPlan.kind === "projectile") {
      const startOffset = 0.028;
      noiseBurstAt(audio, start, {
        frequency: Math.max(
          1100,
          Math.min(4200, profile.transientHz * 0.78 * soundPlan.brightness)
        ),
        duration: 0.026,
        volume: 0.03,
        q: profile.transientQ,
        noise: profile.noise,
        pan: panFrom
      });
      whooshAt(audio, start + startOffset, {
        fromHz: ["stone", "body", "earth"].includes(soundPlan.material) ? 720 : 1280,
        toHz: (
          ["paper", "air"].includes(soundPlan.material) ? 3900 : 4700
        ) * soundPlan.brightness,
        duration: launchEnvelopeDuration(impactSeconds, startOffset, 0.09, 0.26, 0.55),
        volume: 0.022,
        panFrom: panFrom,
        panTo: panTo
      });
    } else if (soundPlan.kind === "summon") {
      const startOffset = 0.205;
      modalHitAt(audio, start, {
        baseHz: ["metal", "glass", "crystal"].includes(soundPlan.material) ? 540 : 420,
        ratios: [1, 1.5, 2.76],
        levels: [1, 0.32, 0.15],
        duration: 0.22,
        volume: 0.022
      });
      whooshAt(audio, start + startOffset, {
        fromHz: 900,
        toHz: 3600,
        duration: launchEnvelopeDuration(impactSeconds, startOffset, 0.05, 0.2, 0.38),
        volume: 0.027,
        panFrom: panFrom,
        panTo: panTo
      });
    } else if (soundPlan.kind === "strike") {
      const startOffset = 0.012;
      whooshAt(audio, start + startOffset, {
        fromHz: 3900,
        toHz: 1050,
        duration: launchEnvelopeDuration(impactSeconds, startOffset, 0.055, 0.14, 0.22),
        volume: 0.034,
        panFrom: panFrom,
        panTo: panTo
      });
    } else if (soundPlan.kind === "burst") {
      const whooshOffset = 0.01;
      const toneOffset = 0.018;
      whooshAt(audio, start + whooshOffset, {
        fromHz: 420,
        toHz: 3200,
        duration: launchEnvelopeDuration(impactSeconds, whooshOffset, 0.06, 0.18, 0.28),
        volume: 0.027,
        panFrom: 0,
        panTo: 0
      });
      toneSweepAt(audio, start + toneOffset, {
        fromHz: 240,
        toHz: 620,
        duration: launchEnvelopeDuration(impactSeconds, toneOffset, 0.06, 0.18, 0.27),
        volume: 0.018,
        bus: materialBus,
        type: "sine"
      });
    } else if (soundPlan.kind === "aura") {
      [523.25, 659.25, 880].forEach(function (frequency, index) {
        modalHitAt(audio, start + index * 0.045, {
          baseHz: frequency,
          ratios: [1, 2.01],
          levels: [1, 0.18],
          decays: [1, 0.58],
          duration: 0.26,
          volume: 0.018 + index * 0.002
        });
      });
    } else {
      const toneOffset = 0.045;
      whooshAt(audio, start, {
        fromHz: 3400,
        toHz: 520,
        duration: launchEnvelopeDuration(impactSeconds, 0, 0.06, 0.19, 0.29),
        volume: 0.024,
        panFrom: 0,
        panTo: panTo * 0.35
      });
      toneSweepAt(audio, start + toneOffset, {
        fromHz: 390,
        toHz: 205,
        duration: launchEnvelopeDuration(impactSeconds, toneOffset, 0.06, 0.17, 0.27),
        volume: 0.018,
        bus: materialBus,
        type: "sine"
      });
    }

    if (soundPlan.outcome === "miss" || soundPlan.outcome === "evade") {
      whooshAt(audio, start + Math.max(0.04, impactSeconds - 0.1), {
        fromHz: 4300,
        toHz: 1450,
        duration: 0.14,
        volume: soundPlan.outcome === "evade" ? 0.029 : 0.024,
        panFrom: panFrom,
        panTo: panTo
      });
    }
    return soundPlan;
  }

  function materialImpactAt(audio, start, soundPlan) {
    const profile = MATERIAL_PROFILES[soundPlan.material] || MATERIAL_PROFILES.earth;
    const strong = soundPlan.strong;
    const bodyDuration = profile.decay * (strong ? 1.06 : 0.78);
    noiseBurstAt(audio, start, {
      frequency: profile.transientHz * soundPlan.brightness,
      duration: profile.transientDuration * (strong ? 1.16 : 0.88),
      volume: strong ? 0.07 : 0.052,
      q: profile.transientQ,
      noise: profile.noise,
      priority: 3
    });

    if (soundPlan.hasBody && profile.bodyLevel > 0) {
      toneSweepAt(audio, start, {
        fromHz: profile.bodyFrom * (1 + soundPlan.variation * 0.018),
        toHz: profile.bodyTo,
        duration: bodyDuration,
        volume: profile.bodyLevel * (strong ? 1.12 : 0.82),
        type: soundPlan.type === "monster" ? "triangle" : "sine",
        priority: 3
      });
    }

    materialResonanceAt(audio, start + 0.003, soundPlan);

    if (soundPlan.material === "air" || soundPlan.material === "fire") {
      whooshAt(audio, start + 0.014, {
        fromHz: soundPlan.material === "fire" ? 920 : 3300,
        toHz: soundPlan.material === "fire" ? 2850 : 820,
        duration: strong ? 0.17 : 0.11,
        volume: strong ? 0.022 : 0.014,
        panFrom: soundPlan.direction > 0 ? 0.08 : -0.08,
        panTo: 0,
        priority: 2
      });
    } else if (soundPlan.material === "hollow") {
      noiseBurstAt(audio, start + 0.013, {
        frequency: 860 + soundPlan.variation * 90,
        duration: strong ? 0.085 : 0.055,
        volume: strong ? 0.029 : 0.021,
        q: 0.7,
        noise: 1,
        bus: materialBus,
        priority: 2
      });
    }

    if (strong) {
      toneSweepAt(audio, start + 0.002, {
        fromHz: 78,
        toHz: 55,
        duration: 0.31,
        volume: 0.038,
        type: "sine",
        priority: 3
      });
    }
  }

  function weaknessChimeAt(audio, start) {
    [1046.5, 1567.98].forEach(function (frequency, index) {
      modalHitAt(audio, start + 0.025 + index * 0.057, {
        baseHz: frequency,
        ratios: [1, 2.01],
        levels: [1, 0.13],
        decays: [1, 0.54],
        duration: 0.32,
        volume: index ? 0.015 : 0.019,
        type: "sine"
      });
    });
  }

  function supportBloomAt(audio, start, soundPlan) {
    const notes = soundPlan.revive
      ? [523.25, 659.25, 783.99, 1046.5]
      : [659.25, 830.61, 1046.5];
    notes.forEach(function (frequency, index) {
      modalHitAt(audio, start + index * 0.05, {
        baseHz: frequency,
        ratios: [1, 2.01],
        levels: [1, 0.13],
        decays: [1, 0.5],
        duration: soundPlan.revive ? 0.5 : 0.34,
        volume: soundPlan.revive ? 0.022 : 0.017,
        type: "sine"
      });
    });
  }

  function techniqueImpact(plan) {
    if (muted || !plan) return null;
    const audio = ctx();
    if (!audio) return null;
    const soundPlan = resolvedTechniqueSoundPlan(plan);
    const start = audio.currentTime + 0.003;

    if (soundPlan.outcome === "miss" || soundPlan.outcome === "evade") {
      return soundPlan;
    }
    if (soundPlan.intent === "guard") {
      guardSound();
      return soundPlan;
    }
    if (soundPlan.support && (
      soundPlan.kind === "aura" ||
      soundPlan.revive ||
      soundPlan.intent === "heal"
    )) {
      duckMusicAt(start, 0.58, 0.22);
      supportBloomAt(audio, start, soundPlan);
      return soundPlan;
    }
    if (soundPlan.support) {
      duckMusicAt(start, 0.62, 0.18);
      noiseBurstAt(audio, start, {
        frequency: soundPlan.kind === "debuff" ? 1150 : 2450,
        duration: 0.032,
        volume: 0.026,
        q: 0.72
      });
      modalHitAt(audio, start + 0.006, {
        baseHz: soundPlan.kind === "debuff" ? 330 : 620,
        ratios: soundPlan.kind === "debuff" ? [1, 1.41, 2.13] : [1, 1.5, 2.5],
        levels: [1, 0.23, 0.09],
        duration: 0.24,
        volume: 0.021,
        type: "sine"
      });
      return soundPlan;
    }
    if (soundPlan.outcome === "blocked") {
      duckMusicAt(start, 0.62, 0.16);
      noiseBurstAt(audio, start, {
        frequency: 3100,
        duration: 0.024,
        volume: 0.032
      });
      modalHitAt(audio, start + 0.008, {
        baseHz: 880,
        ratios: [1, 1.5, 2.42],
        levels: [1, 0.22, 0.08],
        duration: 0.22,
        volume: 0.022,
        type: "sine"
      });
      return soundPlan;
    }

    duckMusicAt(
      start,
      soundPlan.strong ? 0.28 : 0.42,
      soundPlan.strong ? 0.38 : 0.24
    );
    materialImpactAt(audio, start, soundPlan);
    if (soundPlan.weakness) weaknessChimeAt(audio, start);
    if (soundPlan.revive) {
      supportBloomAt(audio, start + 0.09, Object.assign({}, soundPlan, {
        revive: true
      }));
    }
    if (soundPlan.knockout) {
      noiseBurstAt(audio, start + 0.075, {
        frequency: 520,
        duration: 0.085,
        volume: 0.027,
        q: 0.55,
        bus: materialBus
      });
      toneSweepAt(audio, start + 0.09, {
        fromHz: 420,
        toHz: 220,
        duration: 0.3,
        volume: 0.016,
        bus: materialBus,
        type: "sine"
      });
    }
    return soundPlan;
  }

  function attackSound(type, strong) {
    return techniqueImpact({
      type: type,
      kind: "strike",
      emoji: type === "magic" ? "✨" : "⚔️",
      big: Boolean(strong),
      weakness: Boolean(strong),
      outcome: "hit",
      impactAtMs: 0,
      totalMs: 420
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
      !pageHidden &&
      !needsAudioRecovery
    );
  }

  function musicGainTarget() {
    return musicCanRun() ? 0.72 : 0.0001;
  }

  function rampMusicBus(target, duration) {
    releaseClosedGraph();
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
      trackMusicSource(oscillator, start + voiceDuration + 0.03);
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
    trackMusicSource(oscillator, start + duration + 0.04);
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
    if (nextMusicTime < audio.currentTime - SCHEDULE_AHEAD_SECONDS * 2) {
      nextMusicTime = audio.currentTime + 0.04;
    }
    let scheduledSteps = 0;
    while (
      nextMusicTime < audio.currentTime + SCHEDULE_AHEAD_SECONDS &&
      scheduledSteps < MAX_MUSIC_STEPS_PER_TICK
    ) {
      if (collection) {
        scheduleCollectionStep(audio, nextMusicTime, musicStep);
      } else {
        scheduleBattleStep(audio, nextMusicTime, musicStep);
      }
      musicStep += 1;
      scheduledSteps += 1;
      nextMusicTime += stepSeconds;
      if (musicStep % cycleSteps === 0) {
        musicVariation = Math.random() < 0.5 ? 0 : 1;
      }
    }
    if (
      scheduledSteps === MAX_MUSIC_STEPS_PER_TICK &&
      nextMusicTime < audio.currentTime
    ) {
      nextMusicTime = audio.currentTime + 0.04;
    }
    musicTimer = setTimeout(schedulerTick, LOOKAHEAD_MS);
  }

  function ensureMusicScheduler() {
    releaseClosedGraph();
    if (needsAudioRecovery) {
      clearTimeout(musicTimer);
      musicTimer = 0;
      return;
    }
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
    if (!musicCanRun() || !musicDuckBus) return;
    const current = Math.max(0.0001, musicDuckBus.gain.value || 1);
    musicDuckBus.gain.cancelScheduledValues(start);
    musicDuckBus.gain.setValueAtTime(current, start);
    musicDuckBus.gain.exponentialRampToValueAtTime(
      Math.max(0.0001, Math.min(1, depth)),
      start + 0.012
    );
    musicDuckBus.gain.exponentialRampToValueAtTime(1, start + duration);
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

  function pageFlipAt(audio, start, volume) {
    const duration = 0.13;
    const source = audio.createBufferSource();
    const filter = audio.createBiquadFilter();
    const gain = audio.createGain();
    const buffer = getNoise(audio, 0);
    const offsetLimit = Math.max(0, buffer.duration - duration - 0.02);
    source.buffer = buffer;
    filter.type = "bandpass";
    filter.Q.value = 0.48;
    filter.frequency.setValueAtTime(3800, start);
    filter.frequency.exponentialRampToValueAtTime(1250, start + duration);
    gain.gain.setValueAtTime(0.0001, start);
    gain.gain.linearRampToValueAtTime(volume || 0.014, start + 0.026);
    gain.gain.exponentialRampToValueAtTime(0.0001, start + duration);
    if (!trackOneShot(
      audio,
      source,
      start,
      start + duration + 0.014,
      1
    )) return;
    source.connect(filter).connect(gain);
    connectWithPan(audio, gain, uiBus, start, duration, -0.14, 0.14);
    source.start(start, Math.random() * offsetLimit, duration + 0.01);
    source.stop(start + duration + 0.014);
  }

  function coinTickAt(audio, start, frequency, pan, volume) {
    noiseBurstAt(audio, start, {
      frequency: Math.min(6500, frequency * 2.8),
      duration: 0.012,
      volume: volume * 0.72,
      q: 1.2,
      noise: 0,
      pan: pan,
      bus: uiBus,
      priority: 2
    });
    modalHitAt(audio, start + 0.001, {
      baseHz: frequency,
      ratios: [1, 1.57],
      levels: [1, 0.24],
      decays: [1, 0.58],
      duration: 0.12,
      volume: volume,
      type: "sine",
      priority: 2
    });
  }

  function guardSound() {
    if (muted) return null;
    const audio = ctx();
    if (!audio) return null;
    const start = audio.currentTime + 0.003;
    duckMusicAt(start, 0.72, 0.22);
    noiseBurstAt(audio, start, {
      frequency: 760,
      duration: 0.075,
      volume: 0.027,
      q: 0.58,
      noise: 2,
      bus: materialBus,
      priority: 2
    });
    toneSweepAt(audio, start + 0.004, {
      fromHz: 246.94,
      toHz: 196,
      duration: 0.2,
      volume: 0.027,
      type: "sine",
      bus: bodyBus,
      priority: 2
    });
    modalHitAt(audio, start + 0.026, {
      baseHz: 392,
      ratios: [1, 1.5],
      levels: [1, 0.18],
      decays: [1, 0.62],
      duration: 0.24,
      volume: 0.018,
      type: "sine",
      priority: 2
    });
    return true;
  }

  function quizCorrectSound() {
    if (muted) return null;
    const audio = ctx();
    if (!audio) return null;
    const start = audio.currentTime + 0.003;
    duckMusicAt(start, 0.82, 0.28);
    pageFlipAt(audio, start, 0.009);
    modalHitAt(audio, start + 0.02, {
      baseHz: 659.25,
      ratios: [1, 2.01],
      levels: [1, 0.15],
      decays: [1, 0.58],
      duration: 0.24,
      volume: 0.017,
      type: "sine",
      priority: 2
    });
    modalHitAt(audio, start + 0.115, {
      baseHz: 880,
      ratios: [1, 1.5],
      levels: [1, 0.13],
      decays: [1, 0.54],
      duration: 0.32,
      volume: 0.02,
      type: "sine",
      priority: 2
    });
    noiseBurstAt(audio, start + 0.118, {
      frequency: 5200,
      duration: 0.016,
      volume: 0.011,
      q: 0.92,
      noise: 0,
      bus: uiBus,
      priority: 2
    });
    return true;
  }

  function quizWrongSound() {
    if (muted) return null;
    const audio = ctx();
    if (!audio) return null;
    const start = audio.currentTime + 0.003;
    duckMusicAt(start, 0.86, 0.25);
    noiseBurstAt(audio, start, {
      frequency: 1100,
      duration: 0.085,
      volume: 0.014,
      q: 0.52,
      noise: 2,
      bus: uiBus,
      priority: 2
    });
    toneSweepAt(audio, start + 0.008, {
      fromHz: 392,
      toHz: 329.63,
      duration: 0.22,
      volume: 0.019,
      type: "sine",
      bus: uiBus,
      priority: 2
    });
    modalHitAt(audio, start + 0.13, {
      baseHz: 293.66,
      ratios: [1, 1.5],
      levels: [1, 0.1],
      decays: [1, 0.55],
      duration: 0.21,
      volume: 0.013,
      type: "sine",
      priority: 2
    });
    return true;
  }

  function ultimateUnlockSound() {
    if (muted) return null;
    const audio = ctx();
    if (!audio) return null;
    const start = audio.currentTime + 0.003;
    duckMusicAt(start, 0.58, 0.56);
    whooshAt(audio, start, {
      fromHz: 650,
      toHz: 5200,
      duration: 0.32,
      volume: 0.021,
      panFrom: -0.16,
      panTo: 0.16,
      priority: 3
    });
    toneSweepAt(audio, start + 0.015, {
      fromHz: 130.81,
      toHz: 261.63,
      duration: 0.38,
      volume: 0.028,
      type: "sine",
      bus: bodyBus,
      priority: 3
    });
    modalHitAt(audio, start + 0.185, {
      baseHz: 523.25,
      ratios: [1, 1.5, 2.01],
      levels: [1, 0.28, 0.13],
      decays: [1, 0.72, 0.55],
      duration: 0.42,
      volume: 0.026,
      type: "sine",
      priority: 3
    });
    modalHitAt(audio, start + 0.33, {
      baseHz: 783.99,
      ratios: [1, 2.01],
      levels: [1, 0.14],
      decays: [1, 0.58],
      duration: 0.5,
      volume: 0.018,
      type: "sine",
      priority: 3
    });
    noiseBurstAt(audio, start + 0.33, {
      frequency: 4700,
      duration: 0.018,
      volume: 0.018,
      q: 1.04,
      noise: 0,
      bus: transientBus,
      priority: 3
    });
    return true;
  }

  function rampEffectsMuteState(value) {
    releaseClosedGraph();
    if (!context) return;
    const now = context.currentTime;
    [uiBus, sfxBus].forEach(function (bus) {
      if (!bus) return;
      const current = Math.max(0.0001, bus.gain.value || 0.0001);
      bus.gain.cancelScheduledValues(now);
      bus.gain.setValueAtTime(current, now);
      bus.gain.exponentialRampToValueAtTime(
        value ? 0.0001 : 1,
        now + 0.02
      );
    });
    if (roomGain) {
      const currentRoom = Math.max(0.0001, roomGain.gain.value || 0.0001);
      roomGain.gain.cancelScheduledValues(now);
      roomGain.gain.setValueAtTime(currentRoom, now);
      roomGain.gain.exponentialRampToValueAtTime(
        value ? 0.0001 : 0.16,
        now + 0.025
      );
    }
  }

  const api = {
    prime: function () {
      const audio = ctx(true);
      ensureMusicScheduler();
      return audio;
    },
    isMuted: function () { return muted; },
    setMuted: function (value) {
      muted = Boolean(value);
      try {
        localStorage.setItem("cards_muted", muted ? "1" : "0");
      } catch (error) {}
      rampEffectsMuteState(muted);
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
      if (pageHidden) requestAudioRecovery();
      ensureMusicScheduler();
      return pageHidden;
    },
    requestRecovery: requestAudioRecovery,
    bgmConfig: Object.freeze({
      collectionBpm: COLLECTION_BPM,
      battleBpm: BATTLE_BPM,
      lookaheadMs: LOOKAHEAD_MS,
      scheduleAheadSeconds: SCHEDULE_AHEAD_SECONDS,
      collectionBars: COLLECTION_BARS,
      battleBars: BATTLE_BARS
    }),
    soundConfig: Object.freeze({
      version: 20,
      maxActiveOneShots: MAX_ACTIVE_ONE_SHOTS,
      maxMusicStepsPerTick: MAX_MUSIC_STEPS_PER_TICK,
      materialProfiles: Object.freeze(Object.keys(MATERIAL_PROFILES))
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
      if (muted) return;
      const audio = ctx();
      if (!audio) return;
      pageFlipAt(audio, audio.currentTime, 0.012);
      pluck(587.33, 0.075, { volume: 0.028, duration: 0.3, room: 0.13 });
      pluck(880, 0.108, { volume: 0.012, duration: 0.22, room: 0.16 });
    },
    star: function () {
      bell(880, 0, { volume: 0.026, duration: 0.46, room: 0.24 });
      bell(1174.66, 0.047, { volume: 0.019, duration: 0.4, room: 0.28 });
      bell(1567.98, 0.092, { volume: 0.013, duration: 0.48, room: 0.31 });
    },
    guard: guardSound,
    quizCorrect: quizCorrectSound,
    quizWrong: quizWrongSound,
    ultimateUnlock: ultimateUnlockSound,
    soundPlanForTechnique: soundPlanForTechnique,
    techniqueLaunch: techniqueLaunch,
    techniqueImpact: techniqueImpact,
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
      [0, 0.038, 0.083, 0.137, 0.203, 0.286].forEach(function (delay, index) {
        const pans = [-0.2, 0.17, -0.14, 0.11, -0.075, 0.035];
        coinTickAt(
          audio,
          start + delay,
          1760 - index * 118,
          pans[index],
          0.013 - index * 0.0008
        );
      });
    },
    coinLand: function () {
      if (muted) return;
      const audio = ctx();
      if (!audio) return;
      const start = audio.currentTime + 0.003;
      noiseBurstAt(audio, start, {
        frequency: 5100,
        duration: 0.018,
        volume: 0.032,
        q: 1.18,
        noise: 0,
        bus: uiBus,
        priority: 3
      });
      materialResonanceAt(audio, start, {
        material: "metal",
        strong: false,
        variation: Math.floor(Math.random() * 3),
        direction: 1,
        voicePriority: 3
      });
      woodHit(0.065, 0.022);
    },
    coin: function () {
      api.coinLand();
    },
    win: function () {
      stopBgm();
      const audio = ctx();
      if (audio && !muted) pageFlipAt(audio, audio.currentTime, 0.011);
      melody([523.25, 659.25, 783.99, 1046.5], 0.085, {
        volume: 0.043,
        duration: 0.48,
        room: 0.22
      });
      bell(1318.51, 0.34, { volume: 0.028, duration: 0.78, room: 0.34 });
      bell(1567.98, 0.405, { volume: 0.014, duration: 0.66, room: 0.38 });
    },
    lose: function () {
      stopBgm();
      const audio = ctx();
      if (audio && !muted) pageFlipAt(audio, audio.currentTime + 0.04, 0.009);
      melody([392, 349.23, 293.66], 0.135, {
        volume: 0.033,
        duration: 0.52,
        room: 0.21
      });
      woodHit(0.34, 0.02);
    }
  };

  window.CardAudio = api;
}());
