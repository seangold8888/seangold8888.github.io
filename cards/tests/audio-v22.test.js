"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");

const audioPath = path.join(__dirname, "..", "js", "audio.js");
const audioSource = fs.readFileSync(audioPath, "utf8");

function loadMutedAudioRuntime() {
  const sandbox = {
    window: {},
    document: { hidden: false },
    localStorage: {
      getItem(key) { return key === "cards_muted" ? "1" : null; },
      setItem() {}
    },
    setTimeout,
    clearTimeout
  };
  vm.runInNewContext(audioSource, sandbox, { filename: "cards/js/audio.js" });
  return sandbox.window.CardAudio;
}

function loadActiveAudioRuntime() {
  const started = [];
  class Param {
    constructor(value = 1) { this.value = value; }
    setValueAtTime(value) { this.value = value; }
    linearRampToValueAtTime(value) { this.value = value; }
    exponentialRampToValueAtTime(value) { this.value = value; }
    cancelScheduledValues() {}
  }
  class FakeNode {
    constructor() {
      [
        "gain", "frequency", "Q", "detune", "delayTime", "pan",
        "threshold", "knee", "ratio", "attack", "release"
      ].forEach((key) => { this[key] = new Param(); });
    }
    connect(target) { return target; }
    start(when = 0) {
      this.startAt = when;
      started.push(this);
    }
    stop(when = 0) { this.stopAt = when; }
    addEventListener() {}
  }
  class FakeAudioContext {
    constructor() {
      this.state = "running";
      this.currentTime = 0;
      this.sampleRate = 100;
      this.destination = new FakeNode();
    }
    createGain() { return new FakeNode(); }
    createConvolver() { return new FakeNode(); }
    createDynamicsCompressor() { return new FakeNode(); }
    createBiquadFilter() { return new FakeNode(); }
    createWaveShaper() { return new FakeNode(); }
    createDelay() { return new FakeNode(); }
    createStereoPanner() { return new FakeNode(); }
    createOscillator() { return new FakeNode(); }
    createBufferSource() { return new FakeNode(); }
    createBuffer(channels, length, rate) {
      const data = Array.from({ length: channels }, () => new Float32Array(length));
      return {
        numberOfChannels: channels,
        duration: length / rate,
        getChannelData(index) { return data[index]; }
      };
    }
    resume() {
      this.state = "running";
      return Promise.resolve();
    }
  }
  const sandbox = {
    window: { AudioContext: FakeAudioContext },
    document: { hidden: false },
    localStorage: {
      getItem(key) { return key === "cards_bgm_muted" ? "1" : null; },
      setItem() {}
    },
    setTimeout() { return 1; },
    clearTimeout() {}
  };
  vm.runInNewContext(audioSource, sandbox, { filename: "cards/js/audio.js" });
  return { Audio: sandbox.window.CardAudio, started };
}

test("story-gate audio cues are public and remain silent while muted", () => {
  const Audio = loadMutedAudioRuntime();
  ["guard", "quizCorrect", "quizWrong", "ultimateUnlock"].forEach((name) => {
    assert.equal(typeof Audio[name], "function", name);
    assert.equal(Audio[name](), null, name + " mute guard");
  });
});

test("story-gate cues schedule compact layered synthesis without errors", () => {
  const runtime = loadActiveAudioRuntime();
  const audioContext = runtime.Audio.prime();
  const maximumVoices = {
    guard: 4,
    quizCorrect: 6,
    quizWrong: 4,
    ultimateUnlock: 8
  };

  Object.entries(maximumVoices).forEach(([name, maximum]) => {
    const before = runtime.started.length;
    assert.equal(runtime.Audio[name](), true, name);
    const scheduled = runtime.started.length - before;
    assert.ok(scheduled > 0, name + " voices");
    assert.ok(scheduled <= maximum, name + " compact voice budget");
    audioContext.currentTime += 1;
  });
});

test("launch envelopes end shortly before their matching impact frame", () => {
  const helperMatch = audioSource.match(
    /function launchEnvelopeDuration\(([^)]*)\) \{([\s\S]*?)\n  \}/
  );
  assert.ok(helperMatch, "launchEnvelopeDuration helper");
  const durationFor = Function(...helperMatch[1].split(/,\s*/), helperMatch[2]);
  const cases = [
    { name: "projectile", impact: 0.64, offset: 0.028, gap: 0.09, min: 0.26, max: 0.55 },
    { name: "summon", impact: 0.635, offset: 0.205, gap: 0.05, min: 0.2, max: 0.38 },
    { name: "strike", impact: 0.275, offset: 0.012, gap: 0.055, min: 0.14, max: 0.22 },
    { name: "burst", impact: 0.35, offset: 0.01, gap: 0.06, min: 0.18, max: 0.28 },
    { name: "debuff", impact: 0.35, offset: 0, gap: 0.06, min: 0.19, max: 0.29 }
  ];

  cases.forEach((entry) => {
    const duration = durationFor(
      entry.impact,
      entry.offset,
      entry.gap,
      entry.min,
      entry.max
    );
    assert.ok(duration <= entry.max, entry.name + " maximum");
    assert.ok(
      Math.abs(entry.impact - (entry.offset + duration) - entry.gap) < 1e-9,
      entry.name + " pre-impact gap"
    );
  });

  [
    /launchEnvelopeDuration\(impactSeconds, startOffset, 0\.09, 0\.26, 0\.55\)/,
    /launchEnvelopeDuration\(impactSeconds, startOffset, 0\.05, 0\.2, 0\.38\)/,
    /launchEnvelopeDuration\(impactSeconds, startOffset, 0\.055, 0\.14, 0\.22\)/,
    /launchEnvelopeDuration\(impactSeconds, whooshOffset, 0\.06, 0\.18, 0\.28\)/,
    /launchEnvelopeDuration\(impactSeconds, 0, 0\.06, 0\.19, 0\.29\)/
  ].forEach((pattern) => assert.match(audioSource, pattern));
});

test("impact remains immediate and every new cue stays internally synthesized", () => {
  const impactStart = audioSource.indexOf("function techniqueImpact(plan)");
  const impactEnd = audioSource.indexOf("function attackSound", impactStart);
  assert.ok(impactStart >= 0 && impactEnd > impactStart);
  const impactBlock = audioSource.slice(impactStart, impactEnd);
  assert.match(impactBlock, /audio\.currentTime \+ 0\.003/);
  assert.doesNotMatch(impactBlock, /setTimeout|impactAtMs/);
  assert.match(audioSource, /const MAX_ACTIVE_ONE_SHOTS = 24/);
  assert.doesNotMatch(audioSource, /\bfetch\s*\(|new\s+Audio\s*\(|\.(mp3|ogg|wav)\b/i);
});
