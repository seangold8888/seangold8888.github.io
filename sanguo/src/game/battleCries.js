const pack = (...files) => Object.freeze(files.map((file) => `audio/battle-cries/${file}`));

// CC0 field recordings. A small shared source set is mastered differently for
// every hero so a shout reads as part of that hero, not as a random hit sound.
export const BATTLE_CRY_PACKS = Object.freeze({
  noble: pack('male-noble-a-cc0.wav', 'male-noble-b-cc0.wav'),
  fierce: pack('male-fierce-a-cc0.wav', 'male-fierce-b-cc0.wav'),
  heavy: pack('male-heavy-a-cc0.wav', 'male-heavy-b-cc0.wav'),
  agile: pack('male-agile-a-cc0.wav', 'male-agile-b-cc0.wav'),
  female: pack('female-warrior-cheers-cc0.mp3'),
});

// The source MP3 contains four separated cheers. The long fourth take is
// intentionally omitted: short calls land on the special's contact frame and
// leave room for the Korean technique-name recording.
export const FEMALE_BATTLE_CRY_SEGMENTS = Object.freeze([
  Object.freeze({ offset: .33, duration: 1.13 }),
  Object.freeze({ offset: 1.67, duration: 1.13 }),
  Object.freeze({ offset: 3.13, duration: .89 }),
]);

const voice = (packId, rate, gain, lowpass, highpass, wet) =>
  Object.freeze({ pack: packId, rate, gain, lowpass, highpass, wet });

// One explicit profile per playable hero. Rates stay in a natural range and
// filters mostly remove rumble/hiss; they do not synthesize a different voice.
export const BATTLE_CRY_PROFILES = Object.freeze({
  liubei: voice('noble', .98, .66, 5600, 82, .09),
  guanyu: voice('noble', .91, .74, 4500, 68, .12),
  zhangfei: voice('fierce', .88, .80, 4100, 62, .10),
  caocao: voice('noble', .94, .72, 5000, 78, .10),
  zhaoyun: voice('agile', 1.02, .68, 6200, 105, .08),
  machao: voice('fierce', 1.03, .70, 5700, 92, .09),
  huangzhong: voice('heavy', .87, .76, 3900, 58, .13),
  xiahoudun: voice('heavy', .91, .78, 4300, 64, .10),
  zhangliao: voice('fierce', .98, .73, 5200, 82, .09),
  xuchu: voice('heavy', .85, .82, 3600, 52, .08),
  simayi: voice('noble', .95, .66, 5200, 88, .14),
  sunquan: voice('noble', .99, .68, 5500, 90, .10),
  taishici: voice('agile', .98, .72, 5700, 92, .08),
  ganning: voice('fierce', 1.05, .70, 6100, 110, .07),
  luxun: voice('agile', 1.07, .64, 6500, 120, .11),
  zhouyu: voice('noble', 1.03, .65, 6000, 108, .12),
  huanggai: voice('heavy', .89, .79, 4100, 58, .09),
  zhugeliang: voice('noble', .98, .62, 5700, 100, .15),
  sunshangxiang: voice('female', 1.05, .65, 6900, 145, .10),
  wukong: voice('fierce', 1.06, .72, 6200, 105, .12),
  bajie: voice('heavy', .87, .78, 3950, 55, .08),
  wujing: voice('noble', .93, .70, 4700, 70, .13),
  tieshangongzhu: voice('female', .98, .69, 6400, 125, .14),
  nezha: voice('agile', 1.09, .65, 7000, 140, .09),
  erlangshen: voice('noble', .94, .72, 4900, 74, .12),
  honghaier: voice('fierce', 1.10, .67, 6600, 130, .11),
  wusong: voice('fierce', .96, .76, 4800, 72, .08),
  linchong: voice('agile', 1.00, .70, 5900, 98, .10),
  lizhishen: voice('heavy', .86, .82, 3700, 52, .09),
  husanniang: voice('female', 1.08, .64, 7000, 150, .08),
});

export const battleCryProfile = (heroId) => BATTLE_CRY_PROFILES[heroId] || BATTLE_CRY_PROFILES.guanyu;
