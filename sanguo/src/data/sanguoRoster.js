// 확장 장수는 원본 연대기 JSON과 분리한다. 역사 전장은 원문 그대로 두고,
// 대표 장수 연무장에서만 자유롭게 전투를 익힐 수 있게 하는 게임용 명단이다.
export const SANGUO_EXPANSION_PEOPLE = Object.freeze({
  zhangliao: { name:'장료', faction:'위', robe:'#31495c', accent:'#c5ced6', skin:'#d6a07c', hair:'#211d1c', head:'warrior', weapon:'halberd', beard:'short', bio:'위나라의 기동전 지휘관으로, 빠른 판단과 단호한 돌파를 상징하는 장수예요.', fact:'이 게임의 전용 연무장 설명은 역사 사건과 구분한 자유 출전용 설정이에요.' },
  xuchu: { name:'허저', faction:'위', robe:'#29394d', accent:'#bb9760', skin:'#c9906b', hair:'#201b19', head:'warrior', weapon:'maul', beard:'short', bio:'조조 곁을 지킨 힘센 호위 장수예요. 단단한 수비와 묵직한 한 방이 특징입니다.', fact:'이 게임의 전용 연무장 설명은 역사 사건과 구분한 자유 출전용 설정이에요.' },
  taishici: { name:'태사자', faction:'오', robe:'#98423a', accent:'#d4dce4', skin:'#d7a07a', hair:'#241e1d', head:'silver', weapon:'spear', beard:'none', bio:'재빠른 창술과 원거리 견제를 함께 쓰는 강동의 무장으로 그렸어요.', fact:'이 게임의 전용 연무장 설명은 역사 사건과 구분한 자유 출전용 설정이에요.' },
  diaochan: { name:'초선', faction:'군웅', robe:'#e7b3c8', accent:'#d9b25c', skin:'#efc6a8', hair:'#1d1717', head:'phoenix', weapon:'fan', beard:'none', bio:'『삼국지연의』에서 왕윤의 연환계로 동탁과 여포 사이를 갈라놓은 인물이에요. 비단 부채를 춤추듯 휘두르는 게임 속 모습으로 그렸어요.', fact:'초선은 소설이 만든 인물이에요. 정사에는 여포가 동탁의 시녀와 몰래 가까웠다는 기록만 남아 있어요.' },
  dongzhuo: { name:'동탁', faction:'군웅', robe:'#5a1f24', accent:'#d4a24a', skin:'#c98c66', hair:'#1b1515', head:'warrior', weapon:'guandao', beard:'long', bio:'어린 황제를 앞세워 낙양과 장안을 손에 쥔 욕심 많은 권력자예요. 큰 몸집과 무거운 대도로 밀어붙이는 힘을 게임 속 특징으로 삼았어요.', fact:'192년 장안에서 왕윤과 여포의 손에 최후를 맞았어요. 연무장에서는 악역도 직접 조종해 볼 수 있어요.' },
  menghuo: { name:'맹획', faction:'남만', robe:'#6a4a2a', accent:'#e8b04a', skin:'#b97a52', hair:'#1b1512', head:'warrior', weapon:'maul', beard:'short', bio:'남쪽 여러 부족을 이끈 남만의 왕이에요. 제갈량에게 여러 번 붙잡혔다 풀려난 끝에 마음으로 따랐다는 이야기로 유명합니다.', fact:'일곱 번 잡혔다 일곱 번 풀려났다는 「칠종칠금」은 정사 본문이 아니라 주석에 실린 『한진춘추』의 이야기예요.' },
  zhurong: { name:'축융부인', faction:'남만', robe:'#c8502a', accent:'#f2c24a', skin:'#c98a60', hair:'#1b1414', head:'phoenix', weapon:'spear', beard:'none', bio:'맹획의 아내로, 불의 신 축융의 후손이라 불린 용감한 장수예요. 긴 장표와 날아가는 비도를 쓰는 모습으로 그렸어요.', fact:'축융부인은 『삼국지연의』에만 나오는 인물이에요. 정사에는 기록이 없어요.' },
  pangde: { name:'방덕', faction:'위', robe:'#3a4a66', accent:'#c2cbe0', skin:'#cf9a74', hair:'#1e1a19', head:'warrior', weapon:'blade', beard:'short', bio:'마초를 따르다 조조에게 간 장수예요. 번성 싸움에 관을 메고 나가 죽을 각오로 싸웠다고 전해집니다.', fact:'219년 한수가 넘쳐 우금이 항복했을 때도 방덕은 끝까지 항복하지 않았어요.' },
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
  menghuo: { hp:176, power:24, speed:3.0, jump:12.0, range:104, special:'남만왕 철퇴', symbol:'🐘', sigil:'蠻', style:'불굴 돌격' },
  zhurong: { hp:122, power:21, speed:4.25, jump:14.6, range:112, special:'화신 비도', symbol:'🗡️', sigil:'融', style:'장표·비도' },
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
  menghuo: { name:'남만 철퇴', len:1.08, width:1.4, curve:0, metal:0xc9a46a },
  zhurong: { name:'화염 장표', len:1.16, width:.9, curve:.3, metal:0xffc27a },
});

export const SANGUO_REPRESENTATIVE_ROSTER = Object.freeze({
  shu: Object.freeze(['liubei','guanyu','zhangfei','zhaoyun','zhugeliang','machao','huangzhong']),
  wei: Object.freeze(['caocao','xiahoudun','zhangliao','xuchu','simayi']),
  wu: Object.freeze(['sunquan','zhouyu','huanggai','sunshangxiang','taishici','ganning','luxun']),
  qun: Object.freeze(['lvbu','diaochan','dongzhuo','menghuo','zhurong']),
});

// 호로관(191)과 관도(200) 사이. 연의의 초선 이야기와 정사 기록을 함께 보여 준다.
export const SANGUO_LIANHUAN_STAGE_KEY = 'lianhuan';

// 기존 장수로 출전하는 역사 전장 넷. chapter 소수로 연대 사이에 끼운다.
export const SANGUO_HEFEI_STAGE_KEY = 'hefei';
export const SANGUO_FANCHENG_STAGE_KEY = 'fancheng';
export const SANGUO_NANMAN_STAGE_KEY = 'nanman';
export const SANGUO_WUZHANGYUAN_STAGE_KEY = 'wuzhangyuan';

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
  [SANGUO_HEFEI_STAGE_KEY]: Object.freeze({
    id:'a-hefei', chapter:7.5, year:'215년', title:'합비 · 팔백 결사대',
    mission:'새벽에 팔백 결사대를 이끌고 오군 진영으로 뛰어들어, 돌격 북 넷을 울리고 손권을 소요진 다리까지 몰아붙이세요.',
    lesson:'215년 손권이 10만 대군으로 합비성을 에워쌌어요. 성을 지키던 장료는 군사 800명을 골라 새벽에 먼저 쳐들어갔고, 손권은 소요진 다리가 끊어진 곳에서 말을 뛰어 넘어 겨우 빠져나갔습니다.',
    midTip:'장료·이전·악진은 서로 사이가 나빴지만, 이전이 「나랏일 앞에서 개인의 미움은 잊겠다」며 힘을 합쳤어요. 「장료가 온다」 하면 강동의 우는 아이도 울음을 그쳤다는 이야기도 전해져요.',
    heroes:Object.freeze(['zhangliao']),
    item:'🥁', itemName:'돌격 북', required:4, goal:'🌉', goalName:'소요진 다리', length:4.7, par:76,
    deck:false, troop:'wu', bossName:'오나라 군주 손권', bossId:'sunquan', bossLine:'고작 팔백으로 십만을 치겠다고?',
    colors:{s1:'#55687a',s2:'#e3c08a',g1:'#6e6248',g2:'#463d2c',m:'#6f7f86'}, far:'🏯　🌫️　⛰️　', mid:'⛺　🚩　🌾　',
    items:[.82,1.68,2.56,3.44], high:[0,46,12,52], enemies:[1.08,1.9,2.3,3.04,3.8], obstacles:[1.4,2.72,3.3], boss:4.22,
  }),
  [SANGUO_FANCHENG_STAGE_KEY]: Object.freeze({
    id:'a-fancheng', chapter:8.5, year:'219년', title:'번성 · 한수가 넘친 가을',
    mission:'불어난 한수를 따라 작은 배 넷을 모아 우금의 일곱 군을 흩어 놓고, 끝까지 버티는 방덕과 맞서세요.',
    lesson:'219년 가을, 관우가 번성을 에워쌌을 때 큰비가 그치지 않아 한수가 넘쳤어요. 우금이 이끌던 일곱 군이 물에 잠겨 항복했고, 관우의 이름이 온 나라에 떨쳤습니다.',
    midTip:'『삼국지연의』는 관우가 둑을 막았다가 터뜨려 물을 쏟았다고 쓰지만, 정사에는 가을 장마로 한수가 넘쳤다고 적혀 있어요. 관우는 그 때를 놓치지 않고 배를 띄웠어요.',
    heroes:Object.freeze(['guanyu']),
    item:'🛶', itemName:'작은 배', required:4, goal:'🏯', goalName:'번성', length:4.8, par:78,
    deck:false, troop:'wei', bossName:'위군 장수 방덕', bossId:'pangde', bossLine:'나는 관을 메고 왔다. 물러서지 않는다!',
    colors:{s1:'#3f4a52',s2:'#9aa6a2',g1:'#4f5a56',g2:'#2f3836',m:'#5b6a6c'}, far:'⛰️　🌧️　🏯　', mid:'🌊　⛵　🌾　',
    items:[.86,1.72,2.62,3.5], high:[0,44,8,50], enemies:[1.12,1.96,2.34,3.08,3.86], obstacles:[1.46,2.78,3.34], boss:4.3,
  }),
  [SANGUO_NANMAN_STAGE_KEY]: Object.freeze({
    id:'a-nanman', chapter:9.5, year:'225년', title:'남만 · 일곱 번 잡고 일곱 번 놓아주다',
    mission:'코끼리 부대가 지키는 남쪽 밀림을 지나 해독 약초 넷을 모으고, 남만왕 맹획을 일곱 번 사로잡으세요.',
    lesson:'225년 제갈량은 남쪽 땅이 흔들리자 직접 군사를 이끌고 내려갔어요. 맹획을 사로잡고도 다시 놓아주며, 힘이 아니라 마음으로 따르게 하려 했습니다.',
    midTip:'일곱 번 잡고 일곱 번 놓아주었다는 이야기는 정사 본문이 아니라 주석에 실린 『한진춘추』에 나와요. 코끼리 부대와 축융부인은 『삼국지연의』가 더한 장면이에요.',
    heroes:Object.freeze(['zhugeliang']),
    item:'🌿', itemName:'해독 약초', required:4, goal:'🏕️', goalName:'은갱동', length:4.8, par:84,
    deck:false, troop:'nanman', bossName:'남만왕 맹획', bossId:'menghuo', bossCaptures:7, bossLine:'이번엔 진짜 진 게 아니다! 다시 붙자!',
    colors:{s1:'#2f5a3a',s2:'#d8c27a',g1:'#5a5a32',g2:'#3a3a22',m:'#4f6e46'}, far:'🌴　⛰️　🌴　', mid:'🐘　🌿　🌴　',
    items:[.84,1.7,2.6,3.48], high:[0,46,10,54], enemies:[1.1,1.92,2.32,3.06,3.84], obstacles:[1.44,2.76,3.32], boss:4.26,
  }),
  [SANGUO_WUZHANGYUAN_STAGE_KEY]: Object.freeze({
    id:'a-wuzhangyuan', chapter:10.5, year:'234년', title:'오장원 · 별이 떨어진 밤',
    mission:'위수 남쪽 들판에서 칠성등 넷을 밝히고, 굳게 버티는 사마의와 마지막으로 겨루세요.',
    lesson:'234년 제갈량은 다섯 번째 북벌에서 오장원에 진을 쳤어요. 사마의는 싸우지 않고 굳게 지켰고, 백 일 넘게 맞서던 제갈량은 진중에서 병으로 세상을 떠났습니다.',
    midTip:'촉군이 물러날 때 강유가 깃발을 돌려 반격하는 척하자 사마의가 놀라 물러났어요. 사람들은 「죽은 제갈량이 산 사마의를 달아나게 했다」고 말했지요. 나무 인형 이야기는 『삼국지연의』가 더한 장면이에요.',
    heroes:Object.freeze(['zhugeliang']),
    item:'🏮', itemName:'칠성등', required:4, goal:'⛺', goalName:'오장원 진영', length:4.8, par:82,
    deck:false, troop:'wei', bossName:'위군 도독 사마의', bossId:'simayi', bossLine:'기다리는 자가 이긴다. 나는 서두르지 않는다.',
    colors:{s1:'#141a2c',s2:'#6a6a8a',g1:'#4a4a3e',g2:'#2c2c26',m:'#4c5468'}, far:'⛰️　⭐　🏯　', mid:'🏮　⛺　🚩　',
    items:[.84,1.7,2.6,3.48], high:[0,48,14,54], enemies:[1.1,1.92,2.32,3.06,3.84], obstacles:[1.44,2.76,3.32], boss:4.24,
  }),
});

export const factionKeyFor = (faction='') => faction.includes('촉') ? 'shu' : faction.includes('위') ? 'wei' : faction.includes('오') ? 'wu' : faction.includes('군웅') || faction.includes('남만') ? 'qun' : 'other';
