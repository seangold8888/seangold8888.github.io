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
  const techniquePlanCache = new WeakMap();
  const lastTechniqueVariation = Object.create(null);

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

  function ctx() {
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
    if (
      context &&
      context.state !== "running" &&
      context.state !== "closed" &&
      typeof context.resume === "function"
    ) {
      try {
        const resumed = context.resume();
        if (resumed && typeof resumed.then === "function") {
          resumed.then(ensureMusicScheduler).catch(function () {});
        }
      } catch (error) {}
    }
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

  function getNoise(audio) {
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
    return noiseBuffers[Math.floor(Math.random() * noiseBuffers.length)];
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

  const MATERIAL_BY_EMOJI = Object.freeze({
    "🪨": "stone",
    "🗿": "stone",
    "⚔️": "metal",
    "🗡️": "metal",
    "🪓": "metal",
    "👑": "metal",
    "🪙": "metal",
    "🏹": "metal",
    "✨": "crystal",
    "🌟": "crystal",
    "❄️": "crystal",
    "🧊": "crystal",
    "🪄": "crystal",
    "💨": "air",
    "🌊": "air",
    "🎵": "air",
    "🎺": "air",
    "🔥": "fire",
    "💥": "fire",
    "🪔": "fire"
  });
  const DEFAULT_MATERIAL_BY_TYPE = Object.freeze({
    brave: "metal",
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
    const strong = Boolean(plan.big || plan.weakness);
    const key = [kind, type, material].join(":");
    const hasContact = outcome === "hit";
    const blocked = outcome === "blocked";
    return {
      kind: kind,
      type: type,
      material: material,
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
    const buffer = getNoise(audio);
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
    const duration = Math.max(0.06, Math.min(0.44, options.duration || 0.18));
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
      oscillator.connect(gain).connect(materialBus);
      oscillator.start(start);
      oscillator.stop(start + duration + 0.02);
    });
  }

  function techniqueLaunch(plan) {
    if (muted || !plan) return null;
    const audio = ctx();
    if (!audio) return null;
    const soundPlan = resolvedTechniqueSoundPlan(plan);
    const start = audio.currentTime + 0.005;
    const direction = soundPlan.direction;
    const panFrom = direction > 0 ? 0.18 : -0.18;
    const panTo = -panFrom;
    const impactSeconds = Math.max(0.08, soundPlan.impactAtMs / 1000);

    if (soundPlan.kind === "projectile") {
      noiseBurstAt(audio, start, {
        frequency: soundPlan.material === "stone" ? 1800 : 3100,
        duration: 0.026,
        volume: 0.03,
        pan: panFrom
      });
      whooshAt(audio, start + 0.028, {
        fromHz: soundPlan.material === "stone" ? 780 : 1250,
        toHz: soundPlan.material === "stone" ? 3200 : 4700,
        duration: Math.min(0.38, Math.max(0.18, impactSeconds - 0.065)),
        volume: 0.022,
        panFrom: panFrom,
        panTo: panTo
      });
    } else if (soundPlan.kind === "summon") {
      modalHitAt(audio, start, {
        baseHz: soundPlan.material === "metal" ? 520 : 610,
        ratios: [1, 1.5, 2.76],
        levels: [1, 0.32, 0.15],
        duration: 0.22,
        volume: 0.022
      });
      whooshAt(audio, start + 0.205, {
        fromHz: 900,
        toHz: 3600,
        duration: Math.min(0.28, Math.max(0.16, impactSeconds - 0.23)),
        volume: 0.027,
        panFrom: panFrom,
        panTo: panTo
      });
    } else if (soundPlan.kind === "strike") {
      whooshAt(audio, start + 0.012, {
        fromHz: 3900,
        toHz: 1050,
        duration: 0.12,
        volume: 0.034,
        panFrom: panFrom,
        panTo: panTo
      });
    } else if (soundPlan.kind === "burst") {
      whooshAt(audio, start + 0.01, {
        fromHz: 420,
        toHz: 3200,
        duration: 0.17,
        volume: 0.027,
        panFrom: 0,
        panTo: 0
      });
      toneSweepAt(audio, start + 0.018, {
        fromHz: 240,
        toHz: 620,
        duration: 0.17,
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
      whooshAt(audio, start, {
        fromHz: 3400,
        toHz: 520,
        duration: 0.19,
        volume: 0.024,
        panFrom: 0,
        panTo: panTo * 0.35
      });
      toneSweepAt(audio, start + 0.045, {
        fromHz: 390,
        toHz: 205,
        duration: 0.17,
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
    const strong = soundPlan.strong;
    const variation = soundPlan.variation;
    const duration = strong ? 0.29 : 0.17;
    const transientFrequencies = {
      stone: 1500,
      metal: 4300,
      paper: 2750,
      crystal: 3600,
      air: 2400,
      fire: 2100,
      earth: 980
    };
    noiseBurstAt(audio, start, {
      frequency: transientFrequencies[soundPlan.material] || 2200,
      duration: strong ? 0.052 : 0.036,
      volume: strong ? 0.07 : 0.052,
      q: soundPlan.material === "earth" ? 0.5 : 0.76
    });

    if (soundPlan.hasBody) {
      const bodyRanges = {
        stone: [205, 108],
        metal: [230, 126],
        paper: [188, 116],
        air: [170, 112],
        fire: [195, 104],
        earth: [178, 88]
      };
      const range = bodyRanges[soundPlan.material] ||
        (soundPlan.type === "monster" ? [178, 88] : [210, 116]);
      toneSweepAt(audio, start, {
        fromHz: range[0] * (1 + variation * 0.025),
        toHz: range[1],
        duration: duration,
        volume: strong ? 0.108 : 0.078,
        type: soundPlan.type === "monster" ? "triangle" : "sine"
      });
    }

    if (soundPlan.material === "stone") {
      modalHitAt(audio, start + 0.008, {
        baseHz: 210 + variation * 14,
        ratios: [1, 2.1, 4.67],
        levels: [1, 0.29, 0.1],
        duration: strong ? 0.34 : 0.24,
        volume: 0.039
      });
    } else if (soundPlan.material === "metal") {
      modalHitAt(audio, start + 0.006, {
        baseHz: 620 + variation * 26,
        ratios: [1, 1.63, 2.78],
        levels: [1, 0.42, 0.18],
        duration: strong ? 0.4 : 0.26,
        volume: strong ? 0.036 : 0.03
      });
    } else if (soundPlan.material === "crystal") {
      modalHitAt(audio, start + 0.004, {
        baseHz: 540 + variation * 34,
        ratios: [1, 2.74, 4.08],
        levels: [1, 0.28, 0.1],
        duration: strong ? 0.48 : 0.34,
        volume: strong ? 0.034 : 0.028,
        type: "sine"
      });
    } else if (soundPlan.material === "paper" || soundPlan.material === "air") {
      noiseBurstAt(audio, start + 0.012, {
        frequency: soundPlan.material === "paper" ? 3150 : 2500,
        duration: 0.075,
        volume: 0.026,
        filterType: "highpass",
        bus: materialBus
      });
      modalHitAt(audio, start + 0.012, {
        baseHz: 305 + variation * 18,
        ratios: [1, 1.71, 2.83],
        levels: [1, 0.28, 0.12],
        duration: 0.22,
        volume: 0.027
      });
    } else {
      noiseBurstAt(audio, start + 0.008, {
        frequency: soundPlan.material === "fire" ? 1700 : 720,
        duration: strong ? 0.12 : 0.085,
        volume: 0.031,
        q: 0.46,
        bus: materialBus
      });
      modalHitAt(audio, start + 0.01, {
        baseHz: soundPlan.material === "fire" ? 260 : 185,
        ratios: [1, 1.56, 2.94],
        levels: [1, 0.25, 0.1],
        duration: strong ? 0.34 : 0.23,
        volume: 0.032
      });
    }

    if (strong) {
      toneSweepAt(audio, start + 0.002, {
        fromHz: 78,
        toHz: 55,
        duration: 0.31,
        volume: 0.038,
        type: "sine"
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

  function rampEffectsMuteState(value) {
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
