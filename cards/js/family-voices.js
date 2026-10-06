(function (root) {
  "use strict";
  const FILES = Object.freeze({
    taeo: 'taeo-callout-v2.wav', jaei: 'jaei-callout-v2.wav',
    yunchan: 'yunchan-callout-v2.wav', yungeon: 'yungeon-callout-v2.wav'
  });
  const supports = id => Object.prototype.hasOwnProperty.call(FILES, id);
  const skill = name => '../sanguo/audio/family-skills-v1/' + name + '.wav';
  const ACTION_FILES = Object.freeze({
    jaei: Object.freeze({
      '코딱지 날리기': Object.freeze(['../sanguo/audio/hero-callouts-eleven-v2/jaei-callout-v2.wav']),
      '트림 폭탄': Object.freeze([skill('jaei-special-eleven-no-v1')]),
      '참았던 방귀': Object.freeze([skill('jaei-special-eleven-water-v1')]),
    }),
    taeo: Object.freeze({
      '발냄새 공격': Object.freeze([skill('taeo-special-eleven-fight-v1'), skill('taeo-special-eleven-yummy-v1')]),
      '연속 방귀': Object.freeze([skill('taeo-special-eleven-kiap-v1')]),
      '대왕 방귀': Object.freeze([skill('taeo-special-eleven-sseugumi-only-v1')]),
      '메가랩터킥': Object.freeze([skill('taeo-special-eleven-meganaptor-v1')]),
    }),
  });
  function actionFiles(plan) {
    const actions = plan && ACTION_FILES[plan.cardId];
    return actions && Object.prototype.hasOwnProperty.call(actions, plan.attack) ? actions[plan.attack] : null;
  }
  function eligible(plan) { return !!(plan && supports(plan.cardId) && (actionFiles(plan) || plan.big || plan.ultimate)); }
  function create(host) {
    const buffers = new WeakMap();
    const playedPlans = new WeakSet(), cursors = new Map();
    let active = null, generation = 0;
    const now = () => host.performance ? host.performance.now() : Date.now();
    const muted = () => !host.CardAudio || host.CardAudio.isMuted() || host.document.hidden;
    const fallbackFile = id => '../sanguo/audio/hero-callouts-eleven-v2/' + FILES[id];
    async function load(file, audio) {
      let cache = buffers.get(audio);
      if (!cache) { cache = new Map(); buffers.set(audio, cache); }
      if (!cache.has(file)) {
        const pending = host.fetch(new URL(file, host.location.href).href).then(response => {
          if (!response.ok) throw Error('Voice unavailable');
          return response.arrayBuffer();
        }).then(bytes => audio.decodeAudioData(bytes));
        cache.set(file, pending);
        pending.catch(() => { if (cache.get(file) === pending) cache.delete(file); });
      }
      return cache.get(file);
    }
    function stop(fade) {
      generation += 1;
      const previous = active; active = null;
      if (!previous) return;
      const time = previous.audio.currentTime;
      try {
        previous.gain.gain.cancelScheduledValues(time);
        previous.gain.gain.setValueAtTime(previous.gain.gain.value, time);
        previous.gain.gain.linearRampToValueAtTime(0, time + (fade ? .075 : .008));
        previous.source.stop(time + (fade ? .075 : .008));
      } catch (error) {}
    }
    async function warm(id) {
      if (!supports(id) || muted()) return false;
      const audio = host.CardAudio.prime();
      if (!audio || audio.state === 'closed') return false;
      const files = [...new Set([fallbackFile(id), ...Object.values(ACTION_FILES[id] || {}).flat()])];
      const results = await Promise.all(files.map(file => load(file, audio).then(() => true, () => false)));
      return results.every(Boolean);
    }
    async function play(plan) {
      if (!eligible(plan) || muted() || playedPlans.has(plan)) return false;
      const key = plan.cardId + ':' + plan.attack;
      const variants = actionFiles(plan) || [fallbackFile(plan.cardId)];
      const cursor = cursors.get(key) || 0, file = variants[cursor % variants.length];
      stop(true);
      const ticket = generation, deadline = now() + 600;
      const audio = host.CardAudio.prime();
      if (!audio) return false;
      try {
        const buffer = await load(file, audio);
        // Never play a late decode after another action, mute, navigation or recovery.
        if (ticket !== generation || muted() || now() > deadline || audio.state !== 'running' || host.CardAudio.prime() !== audio) return false;
        const source = audio.createBufferSource(), gain = audio.createGain();
        source.buffer = buffer; source.playbackRate.value = 1;
        gain.gain.value = .95;
        source.connect(gain);
        if (!host.CardAudio.connectVoice(gain)) { source.disconnect(); gain.disconnect(); return false; }
        const entry = { audio, source, gain };
        active = entry;
        source.onended = () => {
          source.disconnect(); gain.disconnect();
          if (active === entry) active = null;
        };
        source.start(audio.currentTime);
        playedPlans.add(plan); cursors.set(key, cursor + 1);
        return true;
      } catch (error) { return false; }
    }
    host.addEventListener?.('pagehide', () => stop());
    host.document.addEventListener?.('visibilitychange', () => { if (host.document.hidden) stop(); });
    return Object.freeze({ warm, play, stop });
  }
  if (typeof module === 'object' && module.exports) module.exports = { FILES, ACTION_FILES, eligible, create };
  else root.CardFamilyVoice = create(root);
}(typeof window !== 'undefined' ? window : globalThis));
