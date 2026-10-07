// Fictional childlike acting, not recordings or clones of real children.
// Paths are relative to the hub root. Playback is entirely local: no paid API in games.
const take = (phrase, file) => Object.freeze({ phrase, file });
export const FAMILY_SKILL_LINES = Object.freeze({
  jaei: Object.freeze({
    kim: take('김태오!', 'sanguo/audio/hero-callouts-eleven-v2/jaei-callout-v2.wav'),
    no: take('아니야!', 'sanguo/audio/family-skills-v1/jaei-special-eleven-no-v1.wav'),
    water: take('물통 바꿔줘!', 'sanguo/audio/family-skills-v1/jaei-special-eleven-water-v1.wav'),
  }),
  taeo: Object.freeze({
    kiap: take('치앗! 촤! 치앗! 촤!', 'sanguo/audio/family-skills-v1/taeo-special-eleven-kiap-v1.wav'),
    sseugumi: take('쓰구미!', 'sanguo/audio/family-skills-v1/taeo-special-eleven-sseugumi-only-v1.wav'),
    kick: take('메가냅터킥!', 'sanguo/audio/family-skills-v1/taeo-special-eleven-meganaptor-v1.wav'),
    yummy: take('맛있는 거죠!', 'sanguo/audio/family-skills-v1/taeo-special-eleven-yummy-v1.wav'),
    fight: take('싸우자!', 'sanguo/audio/family-skills-v1/taeo-special-eleven-fight-v1.wav'),
  }),
});
export const FAMILY_SKILL_MAP = Object.freeze({
  jaei: Object.freeze({ attack:'kim', heavy:'no', dash:'no', ranged:'water', special:'water', musou:'kim', whirlwind:'no', counter:'no', hurt:'no' }),
  taeo: Object.freeze({ attack:'kiap', heavy:'yummy', dash:'sseugumi', ranged:'fight', special:'kick', musou:'fight', whirlwind:'kiap', counter:'sseugumi', combo:'sseugumi', finisher:'fight', pickup:'yummy' }),
});
export function familySkillLine(hero, action) {
  return FAMILY_SKILL_LINES[hero]?.[FAMILY_SKILL_MAP[hero]?.[action]] || null;
}

// One speaker at a time. Important skills replace an ordinary quip; ordinary
// attacks never cut off a special or queue stale shouts for later playback.
export function createFamilySkillPlayer(env, base = '../', options = {}) {
  let current = null, currentPriority = 0, serial = 0;
  const last = new Map();
  const now = () => env.performance?.now?.() ?? Date.now();
  function stop() {
    serial++;
    if (current) { current.pause(); try { current.currentTime = 0; } catch (_) {} }
    current = null; currentPriority = 0;
  }
  function play(hero, action, priority = 1) {
    const line = familySkillLine(hero, action);
    if (!line || options.muted?.() || env.document?.hidden || !env.Audio) return false;
    const at = now(), key = hero + ':' + action, previous = last.get(key) ?? -Infinity;
    if (at - previous < (priority >= 3 ? 700 : 2400)) return false;
    if (current && priority <= currentPriority) return false;
    stop();
    const token = serial, audio = new env.Audio(base + line.file);
    current = audio; currentPriority = priority; audio.volume = .85; audio.preload = 'auto';
    const clear = () => { if (serial === token && current === audio) { current = null; currentPriority = 0; } };
    audio.addEventListener('ended', clear, { once:true });
    audio.addEventListener('error', clear, { once:true });
    last.set(key, at);
    try {
      const pending = audio.play();
      if (pending?.catch) pending.catch(clear);
    } catch (_) { clear(); return false; }
    return true;
  }
  return Object.freeze({ play, stop });
}
