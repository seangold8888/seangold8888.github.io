// Fictional childlike acting, not recordings or clones of real children.
// Paths are relative to the hub root. Playback is entirely local: no paid API in games.
const take = (phrase, file) => Object.freeze({ phrase, file });
export const FAMILY_SKILL_LINES = Object.freeze({
  jaei: Object.freeze({
    kim: take('김태오!', 'sanguo/audio/hero-callouts-eleven-v2/jaei-callout-v2.wav'),
    no: take('아니야!', 'sanguo/audio/family-skills-v1/jaei-special-eleven-no-v1.wav'),
    water: take('물통 바꿔줘!', 'sanguo/audio/family-skills-v1/jaei-special-eleven-water-v1.wav'),
    sireo: take('시러!', 'sanguo/audio/family-skills-v1/jaei-special-eleven-sireo-v1.wav'),
    wait: take('기다려!', 'sanguo/audio/family-skills-v1/jaei-special-eleven-wait-v1.wav'),
  }),
  taeo: Object.freeze({
    kiap: take('치앗! 촤! 치앗! 촤!', 'sanguo/audio/family-skills-v1/taeo-special-eleven-kiap-v1.wav'),
    sseugumi: take('쓰구미!', 'sanguo/audio/family-skills-v1/taeo-special-eleven-sseugumi-only-v1.wav'),
    kick: take('메가냅터킥!', 'sanguo/audio/family-skills-v1/taeo-special-eleven-meganaptor-v1.wav'),
    yummy: take('맛있는 거죠!', 'sanguo/audio/family-skills-v1/taeo-special-eleven-yummy-v1.wav'),
    fight: take('싸우자!', 'sanguo/audio/family-skills-v1/taeo-special-eleven-fight-v1.wav'),
    nosleep: take('잠 못 자게 한다!', 'sanguo/audio/family-skills-v1/taeo-special-eleven-nosleep-v1.wav'),
  }),
  // 11-14: 윤찬·윤건도 필살기 외침을 여러 개 돌려 쓴다(첫 줄 = 원래 대표 대사).
  yunchan: Object.freeze({
    mamaboy: take('마마보이!', 'sanguo/audio/hero-callouts-eleven-v2/yunchan-callout-v2.wav'),
    bored: take('엄마 심심해!', 'sanguo/audio/family-skills-v1/yunchan-special-eleven-bored-v1.wav'),
    funthing: take('재밌는 거 없어?', 'sanguo/audio/family-skills-v1/yunchan-special-eleven-funthing-v1.wav'),
  }),
  yungeon: Object.freeze({
    easy: take('너무 쉽잖아!', 'sanguo/audio/hero-callouts-eleven-v2/yungeon-callout-v2.wav'),
    bullet: take('총알 슛!', 'sanguo/audio/family-skills-v1/yungeon-special-eleven-bulletshot-v1.wav'),
    hurricane: take('해리케인 슛!', 'sanguo/audio/family-skills-v1/yungeon-special-eleven-hurricaneshot-v1.wav'),
    yamal: take('라민 야말 슛!', 'sanguo/audio/family-skills-v1/yungeon-special-eleven-yamalshot-v1.wav'),
  }),
});
export const FAMILY_SKILL_MAP = Object.freeze({
  // A list means the game takes turns among those lines; the first one is the default.
  jaei: Object.freeze({ attack:'kim', heavy:['no','sireo'], dash:['wait','no'], ranged:'water', special:['water','sireo','wait'], musou:'kim', whirlwind:['sireo','no'], counter:['wait','sireo'], hurt:['sireo','no'] }),
  taeo: Object.freeze({ attack:'kiap', heavy:'yummy', dash:'sseugumi', ranged:'fight', special:['kick','nosleep'], musou:'fight', whirlwind:'kiap', counter:'sseugumi', combo:'sseugumi', finisher:'fight', pickup:'yummy' }),
  yunchan: Object.freeze({ special:['mamaboy','bored','funthing'] }),
  yungeon: Object.freeze({ special:['easy','bullet','hurricane','yamal'] }),
});
export function familySkillLines(hero, action) {
  const keys = [].concat(FAMILY_SKILL_MAP[hero]?.[action] ?? []);
  return keys.map(key => FAMILY_SKILL_LINES[hero]?.[key]).filter(Boolean);
}
export function familySkillLine(hero, action, turn = 0) {
  const lines = familySkillLines(hero, action);
  return lines.length ? lines[turn % lines.length] : null;
}

// One speaker at a time. Important skills replace an ordinary quip; ordinary
// attacks never cut off a special or queue stale shouts for later playback.
export function createFamilySkillPlayer(env, base = '../', options = {}) {
  let current = null, currentPriority = 0, serial = 0;
  const last = new Map(), turns = new Map();
  const now = () => env.performance?.now?.() ?? Date.now();
  function stop() {
    serial++;
    if (current) { current.pause(); try { current.currentTime = 0; } catch (_) {} }
    current = null; currentPriority = 0;
  }
  function play(hero, action, priority = 1) {
    const key = hero + ':' + action, turn = turns.get(key) || 0;
    const line = familySkillLine(hero, action, turn);
    if (!line || options.muted?.() || env.document?.hidden || !env.Audio) return false;
    const at = now(), previous = last.get(key) ?? -Infinity;
    if (at - previous < (priority >= 3 ? 700 : 2400)) return false;
    if (current && priority <= currentPriority) return false;
    stop();
    const token = serial, audio = new env.Audio(base + line.file);
    current = audio; currentPriority = priority; audio.volume = .85; audio.preload = 'auto';
    const clear = () => { if (serial === token && current === audio) { current = null; currentPriority = 0; } };
    audio.addEventListener('ended', clear, { once:true });
    audio.addEventListener('error', clear, { once:true });
    last.set(key, at); turns.set(key, turn + 1);
    try {
      const pending = audio.play();
      if (pending?.catch) pending.catch(clear);
    } catch (_) { clear(); return false; }
    return true;
  }
  return Object.freeze({ play, stop });
}
