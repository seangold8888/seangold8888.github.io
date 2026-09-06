// 확장 장수는 원본 연대기 JSON과 분리한다. 역사 전장은 원문 그대로 두고,
// 대표 장수 연무장에서만 자유롭게 전투를 익힐 수 있게 하는 게임용 명단이다.
export const SANGUO_EXPANSION_PEOPLE = Object.freeze({
  zhangliao: { name:'장료', faction:'위', robe:'#31495c', accent:'#c5ced6', skin:'#d6a07c', hair:'#211d1c', head:'warrior', weapon:'halberd', beard:'short', bio:'위나라의 기동전 지휘관으로, 빠른 판단과 단호한 돌파를 상징하는 장수예요.', fact:'이 게임의 전용 연무장 설명은 역사 사건과 구분한 자유 출전용 설정이에요.' },
  xuchu: { name:'허저', faction:'위', robe:'#29394d', accent:'#bb9760', skin:'#c9906b', hair:'#201b19', head:'warrior', weapon:'maul', beard:'short', bio:'조조 곁을 지킨 힘센 호위 장수예요. 단단한 수비와 묵직한 한 방이 특징입니다.', fact:'이 게임의 전용 연무장 설명은 역사 사건과 구분한 자유 출전용 설정이에요.' },
  taishici: { name:'태사자', faction:'오', robe:'#98423a', accent:'#d4dce4', skin:'#d7a07a', hair:'#241e1d', head:'silver', weapon:'spear', beard:'none', bio:'재빠른 창술과 원거리 견제를 함께 쓰는 강동의 무장으로 그렸어요.', fact:'이 게임의 전용 연무장 설명은 역사 사건과 구분한 자유 출전용 설정이에요.' },
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
});

export const SANGUO_REPRESENTATIVE_ROSTER = Object.freeze({
  shu: Object.freeze(['liubei','guanyu','zhangfei','zhaoyun','zhugeliang','machao','huangzhong']),
  wei: Object.freeze(['caocao','xiahoudun','zhangliao','xuchu','simayi']),
  wu: Object.freeze(['sunquan','zhouyu','huanggai','sunshangxiang','taishici','ganning','luxun']),
});

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
});

export const factionKeyFor = (faction='') => faction.includes('촉') ? 'shu' : faction.includes('위') ? 'wei' : faction.includes('오') ? 'wu' : 'other';
