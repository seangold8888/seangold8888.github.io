// 확장 장수는 원본 연대기 JSON과 분리한다. 역사 전장은 원문 그대로 두고,
// 대표 장수 연무장에서만 자유롭게 전투를 익힐 수 있게 하는 게임용 명단이다.
export const SANGUO_EXPANSION_PEOPLE = Object.freeze({
  zhangliao: { name:'장료', faction:'위', robe:'#31495c', accent:'#c5ced6', skin:'#d6a07c', hair:'#211d1c', head:'warrior', weapon:'halberd', beard:'short', bio:'위나라의 기동전 지휘관으로, 빠른 판단과 단호한 돌파를 상징하는 장수예요.', fact:'이 게임의 전용 연무장 설명은 역사 사건과 구분한 자유 출전용 설정이에요.' },
  xuchu: { name:'허저', faction:'위', robe:'#29394d', accent:'#bb9760', skin:'#c9906b', hair:'#201b19', head:'warrior', weapon:'maul', beard:'short', bio:'조조 곁을 지킨 힘센 호위 장수예요. 단단한 수비와 묵직한 한 방이 특징입니다.', fact:'이 게임의 전용 연무장 설명은 역사 사건과 구분한 자유 출전용 설정이에요.' },
  taishici: { name:'태사자', faction:'오', robe:'#98423a', accent:'#d4dce4', skin:'#d7a07a', hair:'#241e1d', head:'silver', weapon:'spear', beard:'none', bio:'재빠른 창술과 원거리 견제를 함께 쓰는 강동의 무장으로 그렸어요.', fact:'이 게임의 전용 연무장 설명은 역사 사건과 구분한 자유 출전용 설정이에요.' },
  diaochan: { name:'초선', faction:'군웅', robe:'#e7b3c8', accent:'#d9b25c', skin:'#efc6a8', hair:'#1d1717', head:'phoenix', weapon:'fan', beard:'none', bio:'『삼국지연의』에서 왕윤의 연환계로 동탁과 여포 사이를 갈라놓은 인물이에요. 비단 부채를 춤추듯 휘두르는 게임 속 모습으로 그렸어요.', fact:'초선은 소설이 만든 인물이에요. 정사에는 여포가 동탁의 시녀와 몰래 가까웠다는 기록만 남아 있어요.' },
  dongzhuo: { name:'동탁', faction:'군웅', robe:'#5a1f24', accent:'#d4a24a', skin:'#c98c66', hair:'#1b1515', head:'warrior', weapon:'guandao', beard:'long', bio:'어린 황제를 앞세워 낙양과 장안을 손에 쥔 욕심 많은 권력자예요. 큰 몸집과 무거운 대도로 밀어붙이는 힘을 게임 속 특징으로 삼았어요.', fact:'192년 장안에서 왕윤과 여포의 손에 최후를 맞았어요. 연무장에서는 악역도 직접 조종해 볼 수 있어요.' },
  ganning: { name:'감녕', faction:'오', robe:'#173a4a', accent:'#e5dfc7', skin:'#cd916b', hair:'#201d1d', head:'blue', weapon:'dual', beard:'none', bio:'강 위를 누비는 빠른 기습형 장수예요. 쌍도 연계와 대시가 강점입니다.', fact:'이 게임의 전용 연무장 설명은 역사 사건과 구분한 자유 출전용 설정이에요.' },
});

export const SANGUO_EXPANSION_STATS = Object.freeze({
  xiahoudun: { hp:150, power:22, speed:3.15, jump:12.3, range:105, special:'독안 진파', symbol:'🛡️', sigil:'剛', style:'철벽 돌파' },
  zhangliao: { hp:128, power:20, speed:4.15, jump:14.5, range:102, special:'소요진 돌파령', symbol:'⚡', sigil:'遼', style:'번개 기동전' },
  xuchu: { hp:168, power:25, speed:2.7, jump:11.7, range:96, special:'호위 철벽', symbol:'🐯', sigil:'虎', style:'중갑 파쇄' },
  simayi: { hp:112, power:18, speed:3.65, jump:13.2, range:108, special:'위수 봉쇄진', symbol:'🧠', sigil:'謀', style:'진형 제어' },
  sunquan: { hp:132, power:20, speed:3.65, jump:13.4, range:96, special:'강동 결집령', symbol:'👑', sigil:'吳', style:'지휘형 검술' },
  taishici: { hp:126, power:21, speed:4.1, jump:14.3, range:112, special:'동래 관통시', symbol:'🎯', sigil:'弓', style:'창·궁 연계' },
  ganning: { hp:124, power:22, speed:4.3, jump:14.7, range:88, special:'금범 급습', symbol:'🌊', sigil:'錦', style:'수상 기습' },
  luxun: { hp:114, power:19, speed:3.75, jump:13.7, range:114, special:'연영 화계', symbol:'🪶', sigil:'陸', style:'화공 책략' },
  lvbu: { hp:150, power:26, speed:4.05, jump:14.2, range:118, special:'방천화극 무쌍', symbol:'🔥', sigil:'呂', style:'천하무쌍' },
  diaochan: { hp:110, power:18, speed:4.4, jump:15.0, range:112, special:'연환 화선무', symbol:'🌸', sigil:'貂', style:'부채 춤 연격' },
  dongzhuo: { hp:182, power:24, speed:2.6, jump:11.3, range:100, special:'폭군 대도', symbol:'🐗', sigil:'董', style:'중갑 압박' },
});

export const SANGUO_EXPANSION_SIGNATURES = Object.freeze({
  xiahoudun: { name:'독안 언월극', len:1.14, width:1.10, curve:.8, metal:0xd2d9de },
  zhangliao: { name:'소요 장극', len:1.17, width:1.02, curve:.45, metal:0xdbe7ed },
  xuchu: { name:'호치 대부', len:1.16, width:1.34, curve:1.2, metal:0xc9b58d },
  simayi: { name:'낭고 지휘검', len:1.02, width:.93, curve:0, metal:0xdde4ee },
  sunquan: { name:'강동 패검', len:1.08, width:1.02, curve:0, metal:0xe6d49d },
  taishici: { name:'동래 철창', len:1.15, width:.88, curve:0, metal:0xe3edf3 },
  ganning: { name:'금범 쌍도', len:1.02, width:.92, curve:.25, metal:0xd9e3e4 },
  luxun: { name:'연영 우선', len:.98, width:1.06, curve:0, metal:0xf0efe2 },
  lvbu: { name:'방천화극', len:1.2, width:1.08, curve:.6, metal:0xe3d7a6 },
  diaochan: { name:'월하 쌍선', len:.9, width:1.04, curve:0, metal:0xf6dce8 },
  dongzhuo: { name:'상국 대도', len:1.06, width:1.36, curve:.9, metal:0xc9c3b4 },
});

export const SANGUO_REPRESENTATIVE_ROSTER = Object.freeze({
  shu: Object.freeze(['liubei','guanyu','zhangfei','zhaoyun','zhugeliang','machao','huangzhong']),
  wei: Object.freeze(['caocao','xiahoudun','zhangliao','xuchu','simayi']),
  wu: Object.freeze(['sunquan','zhouyu','huanggai','sunshangxiang','taishici','ganning','luxun']),
  qun: Object.freeze(['lvbu','diaochan','dongzhuo']),
});

// 호로관(191)과 관도(200) 사이. 연의의 초선 이야기와 정사 기록을 함께 보여 준다.
export const SANGUO_LIANHUAN_STAGE_KEY = 'lianhuan';

export const SANGUO_DRILL_STAGE_KEY = 'trilands';
export const SANGUO_SPECIAL_STAGES = Object.freeze({
  [SANGUO_DRILL_STAGE_KEY]: Object.freeze({
    id:'a-trilands', chapter:11, year:'대표 장수 연무', title:'삼국 연무장 · 세 나라의 대련',
    mission:'촉·위·오 대표 장수의 무예를 비교하며, 자신에게 맞는 전투 방식을 찾아보세요.',
    lesson:'이 연무장은 실제 역사 사건이 아닌 자유 출전용 게임 전장입니다. 역사 전장은 위 목록에서 따로 이어집니다.',
    midTip:'진영 필터로 장수를 고르면 카드가 간결해집니다. 전장 보스와 같은 장수도 여기서는 안전하게 연습할 수 있어요.',
    heroes:Object.freeze(Object.values(SANGUO_REPRESENTATIVE_ROSTER).flat()),
    item:'⚑', itemName:'훈련 깃발', required:4, goal:'🏯', goalName:'연무장', length:4.45, par:78,
    deck:false, troop:'yellow', bossName:'연무장 교관', bossId:'default', bossLine:'무예를 익히고, 서로의 장점을 배워라.',
    colors:{s1:'#819daa',s2:'#d7c28f',g1:'#716044',g2:'#554532',m:'#708b87'}, far:'⛰️　🏯　⛰️　', mid:'⚑　⛺　⚑　',
    items:[.72,1.56,2.44,3.36], high:[0,48,12,54], enemies:[1.0,1.72,2.3,3.0,3.62], obstacles:[1.3,2.58,3.18], boss:4.08,
  }),
  [SANGUO_LIANHUAN_STAGE_KEY]: Object.freeze({
    id:'a-lianhuan', chapter:2.5, year:'192년', title:'장안 · 연환계',
    mission:'장안 궁궐로 가는 길의 동탁군을 뚫고, 연환의 고리 넷을 모아 폭군 동탁과 맞서세요.',
    lesson:'호로관 싸움 뒤 동탁은 낙양을 불태우고 장안으로 수도를 옮겨 마음대로 권력을 휘둘렀어요. 사도 왕윤은 동탁과 가장 강한 장수 여포 사이를 갈라놓는 계책을 세웠고, 결국 여포가 동탁을 쓰러뜨렸습니다.',
    midTip:'초선은 『삼국지연의』가 만든 인물이에요. 정사에는 여포가 동탁의 시녀와 몰래 가까워져 들킬까 걱정했다는 기록만 있고, 왕윤이 여포를 설득해 동탁을 친 것은 실제 역사예요.',
    heroes:Object.freeze(['diaochan','lvbu']),
    item:'⛓️', itemName:'연환의 고리', required:4, goal:'🏯', goalName:'미앙궁', length:4.7, par:78,
    deck:false, troop:'dong', bossName:'상국 동탁', bossId:'dongzhuo', bossLine:'감히 이 상국에게 칼을 겨누느냐!',
    colors:{s1:'#3b2a3f',s2:'#c98f6b',g1:'#6b4a3a',g2:'#3e2a22',m:'#7a5a62'}, far:'🏯　🏮　🏯　', mid:'🏮　🌸　🏮　',
    items:[.84,1.7,2.6,3.48], high:[0,44,10,50], enemies:[1.1,1.9,2.32,3.06,3.8], obstacles:[1.42,2.74,3.3], boss:4.2,
  }),
});

export const factionKeyFor = (faction='') => faction.includes('촉') ? 'shu' : faction.includes('위') ? 'wei' : faction.includes('오') ? 'wu' : faction.includes('군웅') ? 'qun' : 'other';
