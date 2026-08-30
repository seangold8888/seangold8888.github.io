(function () {
  "use strict";

  let context = null;
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

  function tone(frequency, duration, options) {
    if (muted) return;
    const audio = ctx();
    if (!audio) return;
    options = options || {};
    const now = audio.currentTime + (options.delay || 0);
    const oscillator = audio.createOscillator();
    const gain = audio.createGain();
    oscillator.type = options.type || "sine";
    oscillator.frequency.setValueAtTime(frequency, now);
    if (options.to) oscillator.frequency.exponentialRampToValueAtTime(options.to, now + duration);
    gain.gain.setValueAtTime(0.0001, now);
    gain.gain.exponentialRampToValueAtTime(options.volume || 0.12, now + 0.015);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + duration);
    oscillator.connect(gain).connect(audio.destination);
    oscillator.start(now);
    oscillator.stop(now + duration + 0.02);
  }

  function chord(notes, duration, gap) {
    notes.forEach(function (note, index) {
      tone(note, duration, { delay: index * (gap || 0.07), type: index % 2 ? "triangle" : "sine", volume: 0.09 });
    });
  }

  const api = {
    prime: ctx,
    isMuted: function () { return muted; },
    setMuted: function (value) {
      muted = Boolean(value);
      try {
        localStorage.setItem("cards_muted", muted ? "1" : "0");
      } catch (error) {}
      if (!muted) chord([523, 659], 0.16, 0.04);
      return muted;
    },
    star: function () { tone(880, 0.14, { to: 1320, type: "sine", volume: 0.08 }); },
    hit: function () {
      tone(145, 0.18, { to: 65, type: "sawtooth", volume: 0.11 });
      tone(340, 0.1, { delay: 0.02, to: 180, type: "square", volume: 0.035 });
    },
    magic: function () { chord([523, 784, 1047], 0.28, 0.055); },
    coin: function () {
      tone(1180, 0.09, { to: 1760, type: "triangle", volume: 0.06 });
      tone(1568, 0.16, { delay: 0.1, to: 920, type: "triangle", volume: 0.07 });
    },
    win: function () { chord([523, 659, 784, 1047], 0.42, 0.11); },
    lose: function () { chord([392, 330, 262], 0.34, 0.13); }
  };

  window.CardAudio = api;
}());
