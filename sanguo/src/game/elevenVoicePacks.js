// Local ElevenLabs recordings only: the game never calls a paid API.
// One chosen catchphrase per family hero, shared by dash/special/musou.
const familyPack = file => Object.freeze(Object.fromEntries(
  ['dash', 'special', 'musou'].map(action => [action, `audio/hero-callouts-eleven-v1/${file}`]),
));
export const ELEVEN_VOICE_PACKS = Object.freeze({
  taeo: familyPack('taeo-callout-v1.wav'),
  jaei: familyPack('jaei-callout-v1.wav'),
  yunchan: familyPack('yunchan-callout-v1.wav'),
  yungeon: familyPack('yungeon-callout-v2.wav'),
});

export function elevenVoiceFiles(heroId) {
  const pack = ELEVEN_VOICE_PACKS[heroId];
  return Object.fromEntries(['dash', 'special', 'musou'].map(action => [
    action, typeof pack?.[action] === 'string' ? [pack[action]] : [],
  ]));
}
