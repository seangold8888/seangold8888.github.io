(function (root) {
  "use strict";
  const FILES = Object.freeze({
    taeo: 'taeo-callout-v2.wav', jaei: 'jaei-callout-v2.wav',
    yunchan: 'yunchan-callout-v2.wav', yungeon: 'yungeon-callout-v2.wav'
  });
  const supports = id => Object.prototype.hasOwnProperty.call(FILES, id);
  function eligible(plan) { return !!(plan && supports(plan.cardId) && (plan.big || plan.ultimate)); }
  function create(host) {
    const buffers = new WeakMap();
    let active = null, generation = 0;
    const now = () => host.performance ? host.performance.now() : Date.now();
    const muted = () => !host.CardAudio || host.CardAudio.isMuted() || host.document.hidden;
    const urlFor = id => new URL('../sanguo/audio/hero-callouts-eleven-v2/' + FILES[id], host.location.href).href;
    async function load(id, audio) {
      let cache = buffers.get(audio);
      if (!cache) { cache = new Map(); buffers.set(audio, cache); }
      if (!cache.has(id)) {
        const pending = host.fetch(urlFor(id)).then(response => {
          if (!response.ok) throw Error('Voice unavailable');
          return response.arrayBuffer();
        }).then(bytes => audio.decodeAudioData(bytes));
        cache.set(id, pending);
        pending.catch(() => { if (cache.get(id) === pending) cache.delete(id); });
      }
      return cache.get(id);
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
      try { await load(id, audio); return true; } catch (error) { return false; }
    }
    async function play(plan) {
      if (!eligible(plan) || muted()) return false;
      stop(true);
      const ticket = generation, deadline = now() + 600;
      const audio = host.CardAudio.prime();
      if (!audio) return false;
      try {
        const buffer = await load(plan.cardId, audio);
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
        return true;
      } catch (error) { return false; }
    }
    host.addEventListener?.('pagehide', () => stop());
    host.document.addEventListener?.('visibilitychange', () => { if (host.document.hidden) stop(); });
    return Object.freeze({ warm, play, stop });
  }
  if (typeof module === 'object' && module.exports) module.exports = { FILES, eligible, create };
  else root.CardFamilyVoice = create(root);
}(typeof window !== 'undefined' ? window : globalThis));
