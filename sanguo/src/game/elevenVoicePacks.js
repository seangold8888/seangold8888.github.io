// Local ElevenLabs recordings only: the game never calls a paid API.
// Catchphrases stay intact; named techniques may have their own performance.
import { FAMILY_SKILL_MAP, familySkillLine } from '../../../assets/audio/family-skill-voices.js?v=1';
const skillPack = hero => Object.freeze(Object.fromEntries(Object.keys(FAMILY_SKILL_MAP[hero]).map(action => [action, familySkillLine(hero, action).file.replace(/^sanguo\//, '')])));
const familyPack = file => Object.freeze(Object.fromEntries(
  ['dash', 'special', 'musou'].map(action => [action, `audio/hero-callouts-eleven-v2/${file}`]),
));
export const ELEVEN_VOICE_PACKS = Object.freeze({
  taeo: skillPack('taeo'),
  jaei: skillPack('jaei'),
  yunchan: familyPack('yunchan-callout-v2.wav'),
  yungeon: familyPack('yungeon-callout-v2.wav'),
});

// Ages describe the approved fictional performance, not real child recordings.
export const FAMILY_VOICE_PREVIEWS = Object.freeze({
  taeo: { phrase: '치앗! 촤! 치앗! 촤!', specialPhrase: '메가냅터킥!', role: '5살 남자아이풍 · 태권 용사' },
  jaei: { phrase: '김태오!', specialPhrase: '물통 바꿔줘!', role: '8살 여자아이풍 · 방울 마법사' },
  yunchan: { phrase: '마마보이!', role: '10살 남자아이풍 · 곤충 탐험가' },
  yungeon: { phrase: '너무 쉽잖아!', role: '7살 남자아이풍 · 불꽃 스트라이커' },
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
  return Object.fromEntries(['attack', 'heavy', 'ranged', 'whirlwind', 'counter', 'dash', 'special', 'musou'].map(action => [
    action, typeof pack?.[action] === 'string' ? [pack[action]] : [],
  ]));
}
