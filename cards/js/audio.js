(function () {
  "use strict";

  let context = null;
  let master = null;
  let noiseBuffer = null;
  let muted = false;
  try {
    muted = localStorage.getItem("cards_muted") === "1";
  } catch (error) {
    muted = false;
  }

  function ctx() {
    if (!context) {
      const AudioContext = window.AudioContext || window.webkitAudioContext;
      if (AudioContext) context = new AudioContext();
    }
    if (context && context.state === "suspended") context.resume();
    return context;
  }

  // 마스터 체인: 저역 통과 + 컴프레서. 날것 발진음의 쨍한 고역을 깎아
  // 장난감 실로폰처럼 순한 음색으로 만든다.
  function bus() {
    const audio = ctx();
    if (!audio) return null;
    if (!master) {
      const lowpass = audio.createBiquadFilter();
      lowpass.type = "lowpass";
      lowpass.frequency.value = 4200;
      lowpass.Q.value = 0.6;
      const comp = audio.createDynamicsCompressor();
      comp.threshold.value = -20;
      comp.knee.value = 24;
      comp.ratio.value = 5;
      comp.attack.value = 0.004;
      comp.release.value = 0.18;
      lowpass.connect(comp).connect(audio.destination);
      master = lowpass;
    }
    return master;
  }

  function noise() {
    const audio = ctx();
    if (!noiseBuffer) {
      const length = Math.floor(audio.sampleRate * 0.4);
      noiseBuffer = audio.createBuffer(1, length, audio.sampleRate);
      const data = noiseBuffer.getChannelData(0);
      for (let i = 0; i < length; i += 1) data[i] = Math.random() * 2 - 1;
    }
    return noiseBuffer;
  }

  // FM 벨: 반송파 + 변조파. 오르골/차임 계열의 둥근 반짝임.
  function bell(frequency, duration, options) {
    if (muted) return;
    const audio = ctx();
    const out = bus();
    if (!audio || !out) return;
    options = options || {};
    const now = audio.currentTime + (options.delay || 0);
    const carrier = audio.createOscillator();
    const modulator = audio.createOscillator();
    const modGain = audio.createGain();
    const gain = audio.createGain();
    carrier.type = "sine";
    carrier.frequency.setValueAtTime(frequency, now);
    modulator.type = "sine";
    modulator.frequency.setValueAtTime(frequency * (options.ratio || 2.4), now);
    modGain.gain.setValueAtTime(frequency * (options.fm || 0.9), now);
    modGain.gain.exponentialRampToValueAtTime(frequency * 0.02, now + duration);
    modulator.connect(modGain).connect(carrier.frequency);
    const volume = options.volume || 0.1;
    gain.gain.setValueAtTime(0.0001, now);
    gain.gain.exponentialRampToValueAtTime(volume, now + 0.008);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + duration);
    carrier.connect(gain).connect(out);
    modulator.start(now);
    carrier.start(now);
    modulator.stop(now + duration + 0.05);
    carrier.stop(now + duration + 0.05);
  }

  // 노이즈 버스트: 북·바람·박수 계열의 질감.
  function thump(duration, options) {
    if (muted) return;
    const audio = ctx();
    const out = bus();
    if (!audio || !out) return;
    options = options || {};
    const now = audio.currentTime + (options.delay || 0);
    const source = audio.createBufferSource();
    source.buffer = noise();
    const filter = audio.createBiquadFilter();
    filter.type = options.type || "bandpass";
    filter.frequency.setValueAtTime(options.from || 400, now);
    if (options.to) filter.frequency.exponentialRampToValueAtTime(options.to, now + duration);
    filter.Q.value = options.q || 1.2;
    const gain = audio.createGain();
    gain.gain.setValueAtTime(0.0001, now);
    gain.gain.exponentialRampToValueAtTime(options.volume || 0.1, now + 0.006);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + duration);
    source.connect(filter).connect(gain).connect(out);
    source.start(now);
    source.stop(now + duration + 0.02);
  }

  // 저음 몸통: 타격의 "쿵".
  function body(frequency, duration, options) {
    if (muted) return;
    const audio = ctx();
    const out = bus();
    if (!audio || !out) return;
    options = options || {};
    const now = audio.currentTime + (options.delay || 0);
    const oscillator = audio.createOscillator();
    const gain = audio.createGain();
    oscillator.type = "sine";
    oscillator.frequency.setValueAtTime(frequency, now);
    oscillator.frequency.exponentialRampToValueAtTime(options.to || frequency * 0.4, now + duration);
    gain.gain.setValueAtTime(0.0001, now);
    gain.gain.exponentialRampToValueAtTime(options.volume || 0.16, now + 0.008);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + duration);
    oscillator.connect(gain).connect(out);
    oscillator.start(now);
    oscillator.stop(now + duration + 0.03);
  }

  function chime(notes, duration, gap, volume) {
    notes.forEach(function (note, index) {
      bell(note, duration, { delay: index * gap, volume: volume || 0.09, ratio: 3, fm: 0.6 });
    });
  }

  const api = {
    prime: function () { ctx(); bus(); },
    isMuted: function () { return muted; },
    setMuted: function (value) {
      muted = Boolean(value);
      try {
        localStorage.setItem("cards_muted", muted ? "1" : "0");
      } catch (error) {}
      if (!muted) chime([523, 784], 0.3, 0.06);
      return muted;
    },
    // 별사탕: 오르골 한 방울.
    star: function () {
      bell(1046, 0.35, { volume: 0.07, ratio: 3.01, fm: 0.5 });
      thump(0.12, { from: 5200, to: 7800, q: 2.5, volume: 0.02, type: "highpass" });
    },
    // 타격: 큰북 쿵 + 손바닥 촥.
    hit: function () {
      body(130, 0.22, { to: 48, volume: 0.2 });
      thump(0.1, { from: 260, to: 120, q: 0.8, volume: 0.12 });
      thump(0.05, { from: 2400, q: 1.4, volume: 0.04, delay: 0.005 });
    },
    // 마법: 하프 글리산도풍 차임.
    magic: function () {
      chime([523, 659, 784, 1046], 0.5, 0.05, 0.06);
      thump(0.4, { from: 3200, to: 6800, q: 3, volume: 0.02, type: "bandpass" });
    },
    // 동전: 쟁반 위 진짜 동전처럼 금속 배음 두 번.
    coin: function () {
      bell(2093, 0.22, { volume: 0.06, ratio: 3.47, fm: 1.6 });
      bell(2637, 0.3, { delay: 0.09, volume: 0.05, ratio: 3.47, fm: 1.2 });
    },
    // 승리: 오르골 팡파르 + 반짝이 가루.
    win: function () {
      chime([523, 659, 784, 1046, 1318], 0.55, 0.09, 0.08);
      thump(0.7, { from: 4200, to: 8200, q: 2.2, volume: 0.03, type: "bandpass", delay: 0.2 });
    },
    // 패배: 나긋한 목금 두 방울. 슬프지만 무섭지 않게.
    lose: function () {
      bell(392, 0.5, { volume: 0.07, ratio: 2, fm: 0.35 });
      bell(311, 0.7, { delay: 0.22, volume: 0.06, ratio: 2, fm: 0.3 });
    }
  };

  window.CardAudio = api;
}());
