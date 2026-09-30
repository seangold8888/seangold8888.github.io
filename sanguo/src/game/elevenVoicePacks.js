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

// Zhang Fei keeps his existing performance, as requested. New warrior takes
// can be heard and selected individually before changing battle playback.
export const WARRIOR_VOICE_PREVIEWS = Object.freeze(Object.fromEntries([
  'liubei', 'guanyu', 'caocao', 'zhaoyun', 'machao', 'huangzhong',
  'xiahoudun', 'zhangliao', 'xuchu', 'simayi', 'sunquan', 'taishici',
  'ganning', 'luxun', 'zhouyu', 'huanggai', 'zhugeliang', 'sunshangxiang',
  'wukong', 'bajie', 'wujing', 'tieshangongzhu', 'nezha', 'erlangshen',
  'honghaier', 'euljimundeok', 'ganggamchan', 'kwonyul', 'yisunsin',
].map(id => [id, `audio/warrior-callouts-eleven-v2/${id}-special-v2.wav`])));

export function warriorVoiceSelected(heroId) {
  try { return !!WARRIOR_VOICE_PREVIEWS[heroId] && localStorage.getItem(`sanguo_warrior_voice_${heroId}`) === 'new'; }
  catch { return false; }
}

export function selectWarriorVoice(heroId, selected) {
  if (!WARRIOR_VOICE_PREVIEWS[heroId]) return false;
  try { localStorage.setItem(`sanguo_warrior_voice_${heroId}`, selected ? 'new' : 'original'); return true; }
  catch { return false; }
}

export function elevenVoiceFiles(heroId) {
  const pack = ELEVEN_VOICE_PACKS[heroId] || (warriorVoiceSelected(heroId) ? { special: WARRIOR_VOICE_PREVIEWS[heroId] } : null);
  return Object.fromEntries(['dash', 'special', 'musou'].map(action => [
    action, typeof pack?.[action] === 'string' ? [pack[action]] : [],
  ]));
}
