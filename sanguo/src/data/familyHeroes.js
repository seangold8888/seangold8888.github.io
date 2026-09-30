// Original family adventurers, not historical people or novel characters.
// Keep IDs identical to cards/cards.json so identity and future saves agree.
export const FAMILY_HERO_IDS = Object.freeze(['taeo', 'jaei', 'yunchan', 'yungeon']);
export const isFamilyHero = id => FAMILY_HERO_IDS.includes(id);
export const FAMILY_FICTION_NOTE = '우리 영웅이 이야기 속으로 들어가는 상상 모험이에요. 실제 역사나 원작에 등장한 인물은 아니에요.';

export const FAMILY_PEOPLE = {
  taeo: { name: '태오', work: 'family', faction: '우리 영웅 · 태권 용사', robe: '#f5efe3', accent: '#5198ff', skin: '#edbb91', hair: '#4b3022', weapon: 'taekwondo', head: 'none', beard: 'none', bio: '하얀 도복과 파란 띠를 두른 태권 용사예요. 빠른 발차기로 길을 열고, 친구들이 위험하면 메가랩터킥으로 달려갑니다.' },
  jaei: { name: '재이', work: 'family', faction: '우리 영웅 · 방울 마법사', robe: '#eea2bf', accent: '#b2eafa', skin: '#f1c5a5', hair: '#503329', weapon: 'bubbleMagic', head: 'none', beard: 'none', bio: '토끼 잠옷을 입은 방울 마법사예요. 무지개 방울을 날리고 넓은 마법으로 친구들이 지나갈 길을 열어 줍니다.' },
  yunchan: { name: '윤찬', work: 'family', faction: '우리 영웅 · 곤충 탐험가', robe: '#47badd', accent: '#bfea70', skin: '#e6b185', hair: '#22252b', weapon: 'insectNet', head: 'none', beard: 'none', bio: '잠자리채와 곤충 도감을 챙긴 탐험가예요. 반딧불이의 빛으로 앞을 밝히고 장수풍뎅이의 기운으로 힘차게 돌진해요.' },
  yungeon: { name: '윤건', work: 'family', faction: '우리 영웅 · 불꽃 스트라이커', robe: '#ffd658', accent: '#ff913d', skin: '#edb78c', hair: '#513427', weapon: 'football', head: 'none', beard: 'none', bio: '노란 유니폼을 입은 축구 용사예요. 재빠른 드리블로 빈틈을 찾고 불꽃 슛으로 이야기 속 모험을 헤쳐 나갑니다.' },
};
export const FAMILY_STATS = {
  taeo: { hp: 130, power: 23, speed: 4.2, range: 92, style: '태권도 · 빠른 연격', special: '메가랩터킥', symbol: '🥋', sigil: '태' },
  jaei: { hp: 140, power: 20, speed: 3.6, range: 112, style: '방울 마법 · 넓은 공격', special: '무지개 방울폭풍', symbol: '🫧', sigil: '재' },
  yunchan: { hp: 134, power: 21, speed: 3.8, range: 116, style: '곤충 탐험 · 긴 사거리', special: '장수풍뎅이 돌진', symbol: '🪲', sigil: '찬' },
  yungeon: { hp: 128, power: 24, speed: 4.1, range: 96, style: '축구 · 강력한 슛', special: '불꽃 슛', symbol: '⚽', sigil: '건' },
};
export const FAMILY_WEAPONS = {
  taekwondo: { name: '태권 발차기', style: 'dual', len: .9, width: 1 },
  bubbleMagic: { name: '무지개 방울', style: 'fan', len: 1.05, width: 1.2 },
  insectNet: { name: '탐험 잠자리채', style: 'staff', len: 1.15, width: 1.1 },
  football: { name: '불꽃 축구공', style: 'dual', len: .95, width: 1 },
};

export const FAMILY_RANGED = {
  taeo: { kind: 'kiwave', label: '기합파', speed: 1120, damage: 44, color: '#74cfff', launch: .64 },
  jaei: { kind: 'bubble', label: '방울', speed: 860, damage: 46, color: '#ffb8e1', launch: .72 },
  yunchan: { kind: 'firefly', label: '반딧불', speed: 1020, damage: 45, color: '#c4ed73', launch: .72 },
  yungeon: { kind: 'football', label: '슛', speed: 1240, damage: 52, color: '#ffb248', launch: .22 },
};
export const FAMILY_CALLOUTS = {
  taeo: { special: { name: '메가랩터킥', cry: '쓰구미!' }, musou: { name: '태권 유성난무', cry: '쓰구미!' } },
  jaei: { special: { name: '무지개 방울폭풍', cry: '김태오!' }, musou: { name: '별빛 방울축제', cry: '김태오!' } },
  yunchan: { special: { name: '장수풍뎅이 돌진', cry: '마마보이!' }, musou: { name: '반딧불 은하수', cry: '마마보이!' } },
  yungeon: { special: { name: '불꽃 슛', cry: '너무 쉽잖아!' }, musou: { name: '해트트릭 유성슛', cry: '너무 쉽잖아!' } },
};

const profile = (theme, color, audioStyle, kinds) => ({ attackTheme: theme, specialTheme: theme, whirlwindTheme: theme, musouTheme: theme, arrowColor: color, hitColor: color, impactStyle: 'burst', audioStyle, kinds });
export const FAMILY_COMBAT_PROFILES = {
  taeo: profile('lightning', '#74cfff', 'dual', { 1: 'thrust', 2: 'reverse', 3: 'wide', heavy: 'overhead', special: 'reverse' }),
  jaei: profile('water', '#ffb8e1', 'fan', { 1: 'sweep', 2: 'wide', 3: 'spin', heavy: 'wide', special: 'spin' }),
  yunchan: profile('jade', '#c4ed73', 'staff', { 1: 'sweep', 2: 'thrust', 3: 'wide', heavy: 'overhead', special: 'thrust' }),
  yungeon: profile('flame', '#ffb248', 'dual', { 1: 'thrust', 2: 'reverse', 3: 'wide', heavy: 'overhead', special: 'wide' }),
};
