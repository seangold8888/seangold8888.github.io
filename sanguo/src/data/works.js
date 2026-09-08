/**
 * 삼국지 외 고전 — 서유기·수호지 편.
 *
 * 원본 gamedata.json 은 삼국지 전용이라 건드리지 않는다. 여기서 새 작품의
 * 인물·전장·이야기를 따로 정의하고, 같은 전투 엔진에 얹는다.
 *
 * 서술 원칙(기존 삼국지 파트와 동일):
 *  - 어린이 독자 기준으로 쓴다.
 *  - "원전에 이렇게 나온다"와 "실제 역사/설화는 이렇다"를 구분해서 적는다.
 *    서유기는 현장(玄奘)의 실제 인도 구법 여행이 뼈대이고, 수호지는 북송
 *    선화 연간 송강의 난이라는 실제 사건이 씨앗이다. 그 대비가 재미다.
 */

/**
 * 전용 그림과 전투 시트가 준비된 작품만 플레이 가능하게 연다.
 *
 * 서유기·수호지는 인물별 기본·활·승마 시트를 모두 연결한 뒤
 * ready:true 로 공개한다. 새 작품을 추가할 때도 같은 검증을 거친다.
 */
export const WORKS = {
  sanguo: { id: 'sanguo', name: '삼국지', sub: '三國志演義', accent: '#c9762f', ready: true },
  xiyou: { id: 'xiyou', name: '서유기', sub: '西遊記', accent: '#ff8b3a', ready: true },
  shuihu: { id: 'shuihu', name: '수호지', sub: '水滸傳', accent: '#8fae74', ready: true },
};

/** 플레이 가능한 작품만 */
export const readyWorks = () => Object.values(WORKS).filter((w) => w.ready);

export const WORK_PEOPLE = {
  // ── 삼국지 보너스 인물 ───────────────────────────────────
  sunshangxiang: {
    name: '손상향', work: 'sanguo', faction: '삼국지 · 강동의 궁희',
    robe: '#a83d32', accent: '#e7c06a', skin: '#e5b28f', hair: '#251d1b',
    weapon: 'warrings', head: 'wu', beard: 'none',
    bio: '손권의 누이로, 《삼국지연의》에서는 무예를 익히고 무장한 시녀들을 거느린 당찬 인물로 그려져요. 실제 기록에는 유비와 혼인한 사실이 중심으로 남아 있습니다.',
  },
  // ── 서유기 ──────────────────────────────────────────────
  wukong: {
    name: '손오공', work: 'xiyou', faction: '서유기 · 제천대성',
    robe: '#d8a32b', accent: '#e04b2a', skin: '#c98d55', hair: '#3a2a1c',
    weapon: 'staff', head: 'circlet', beard: 'none',
    bio: '돌에서 태어난 원숭이 왕이에요. 여의봉을 자유자재로 늘였다 줄였다 하고, 근두운을 타면 한 번에 십만팔천 리를 날아가요.',
  },
  bajie: {
    name: '저팔계', work: 'xiyou', faction: '서유기 · 천봉원수',
    robe: '#6f7f4a', accent: '#c9a24b', skin: '#d9a06a', hair: '#2b2119',
    weapon: 'rake', head: 'none', beard: 'none',
    bio: '원래 하늘의 장수였지만 잘못을 저질러 돼지 모습이 되었어요. 게으르고 먹기를 좋아하지만, 힘은 아주 세답니다.',
  },
  wujing: {
    name: '사오정', work: 'xiyou', faction: '서유기 · 권렴대장',
    robe: '#3f6b74', accent: '#b9c9cf', skin: '#7fa0a4', hair: '#1e2b2e',
    weapon: 'crescent', head: 'none', beard: 'long',
    bio: '유사하(流沙河)를 지키던 장수예요. 말수가 적고 묵묵히 짐을 지지만, 위기에는 가장 먼저 앞에 섭니다.',
  },
  tieshangongzhu: {
    name: '철선공주', work: 'xiyou', faction: '서유기 · 나찰녀',
    robe: '#711f24', accent: '#d6ad58', skin: '#e2b08e', hair: '#21191a',
    weapon: 'plantainfan', head: 'crown', beard: 'none',
    bio: '화염산의 불길을 잠재울 수 있는 파초선을 지닌 나찰녀예요. 손오공과 여러 차례 지혜와 힘을 겨루며 이야기의 큰 고비를 만듭니다.',
  },
  nezha: {
    name: '나타', work: 'xiyou', faction: '서유기 · 삼단해회대신',
    robe: '#c8354a', accent: '#e8c85f', skin: '#f0cba6', hair: '#231a18',
    weapon: 'firespear', head: 'circlet', beard: 'none',
    bio: '천계 장수 이정의 셋째 아들이에요. 연꽃으로 다시 태어난 몸이라 지치지 않고, 풍화륜을 타고 하늘을 달리며 화첨창과 건곤권을 씁니다.',
  },
  erlangshen: {
    name: '이랑진군', work: 'xiyou', faction: '서유기 · 관강구 현성이랑',
    robe: '#2f5b8c', accent: '#cfe3ff', skin: '#e3b591', hair: '#1e232e',
    weapon: 'trident', head: 'warrior', beard: 'none',
    bio: '이마에 천안이 있어 어떤 변신도 꿰뚫어 봐요. 천궁 대소동 때 손오공과 일흔두 가지 변신을 겨룬 유일한 맞수이고, 효천견을 데리고 다닙니다.',
  },
  honghaier: {
    name: '홍해아', work: 'xiyou', faction: '서유기 · 성영대왕',
    robe: '#b8302a', accent: '#ffcf6a', skin: '#f2c7a4', hair: '#2a1a16',
    weapon: 'firespear', head: 'circlet', beard: 'none',
    bio: '우마왕과 철선공주의 아들이에요. 삼매진화라는 불을 뿜는데 물로도 꺼지지 않아요. 나중에는 관음보살의 선재동자가 됩니다.',
  },
  // ── 수호지 ──────────────────────────────────────────────
  wusong: {
    name: '무송', work: 'shuihu', faction: '수호지 · 행자',
    robe: '#2f3b46', accent: '#c0562f', skin: '#d2a077', hair: '#211a15',
    weapon: 'twinblade', head: 'headband', beard: 'short',
    bio: '경양강에서 맨손으로 호랑이를 때려잡은 장사예요. 술을 좋아하고 불의를 참지 못합니다.',
  },
  linchong: {
    name: '임충', work: 'shuihu', faction: '수호지 · 표자두',
    robe: '#3a4a63', accent: '#c8ccd4', skin: '#d8ad83', hair: '#241d18',
    weapon: 'spear', head: 'warrior', beard: 'short',
    bio: '팔십만 금군의 창술 교관이었어요. 억울하게 모함을 당해 모든 것을 잃고 양산박으로 향합니다.',
  },
  lizhishen: {
    name: '노지심', work: 'shuihu', faction: '수호지 · 화화상',
    robe: '#6b4a2c', accent: '#d0b070', skin: '#d6a479', hair: '#111111',
    weapon: 'monkstaff', head: 'bald', beard: 'none',
    bio: '스님이 된 장사예요. 온몸에 꽃 문신이 있어 화화상이라 불려요. 버드나무를 뿌리째 뽑을 만큼 힘이 셉니다.',
  },
  husanniang: {
    name: '호삼랑', work: 'shuihu', faction: '수호지 · 일장청',
    robe: '#233d64', accent: '#c34d47', skin: '#dfb08d', hair: '#1d1a1b',
    weapon: 'moonblades', head: 'warrior', beard: 'none',
    bio: '별호는 일장청이에요. 두 자루 일월쌍도와 홍금투삭을 다루며 말을 타고 빠르게 적장을 사로잡는 양산박의 여성 호걸입니다.',
  },
};

export const WORK_STATS = {
  sunshangxiang: { hp: 122, power: 20, speed: 4.0, range: 98, style: '쌍환 연격', special: '강동 비연무', symbol: '🏹', sigil: '香' },
  tieshangongzhu: { hp: 118, power: 21, speed: 3.7, range: 112, style: '화염풍 제어', special: '파초선 폭풍', symbol: '🪭', sigil: '羅' },
  husanniang: { hp: 134, power: 22, speed: 3.8, range: 92, style: '쌍도·투삭', special: '일월쌍도', symbol: '🌙', sigil: '扈' },
  wukong: { hp: 124, power: 22, speed: 4.2, range: 105, style: '빠른 연타', special: '분신 술법', symbol: '🐒', sigil: '悟' },
  bajie: { hp: 158, power: 24, speed: 2.6, range: 96, style: '느리고 강함', special: '구치정파', symbol: '🐗', sigil: '戒' },
  wujing: { hp: 142, power: 20, speed: 3.1, range: 100, style: '균형', special: '항요보장', symbol: '🌊', sigil: '淨' },
  nezha: { hp: 116, power: 21, speed: 4.5, range: 108, style: '전체 최속', special: '풍화륜 질주', symbol: '🔥', sigil: '哪' },
  erlangshen: { hp: 140, power: 24, speed: 3.6, range: 118, style: '긴 사거리·강타', special: '천안 삼첨도', symbol: '👁', sigil: '二' },
  honghaier: { hp: 110, power: 23, speed: 4.3, range: 102, style: '유리 대포', special: '삼매진화', symbol: '🔴', sigil: '紅' },
  wusong: { hp: 138, power: 23, speed: 3.6, range: 82, style: '근접 난타', special: '취권 난무', symbol: '🐯', sigil: '武' },
  linchong: { hp: 132, power: 21, speed: 3.3, range: 112, style: '긴 사거리', special: '표자두 연환창', symbol: '❄️', sigil: '林' },
  lizhishen: { hp: 166, power: 25, speed: 2.4, range: 92, style: '최고 체력', special: '선장 회오리', symbol: '🌸', sigil: '智' },
};

export const WORK_WEAPONS = {
  warrings: { name: '건곤쌍환', style: 'dual', len: 1.02, width: 1.05 },
  plantainfan: { name: '파초선', style: 'fan', len: 1.08, width: 1.25 },
  moonblades: { name: '일월쌍도', style: 'dual', len: 1.04, width: 1.0 },
  staff: { name: '여의봉', style: 'staff', len: 1.15, width: .8 },
  rake: { name: '구치정파', style: 'rake', len: 1.1, width: 1.3 },
  crescent: { name: '항요보장', style: 'crescent', len: 1.12, width: 1.15 },
  firespear: { name: '화첨창', style: 'spear', len: 1.14, width: .95 },
  // 삼첨양인도는 전용 리그가 없어 창 모션을 빌려 쓴다.
  trident: { name: '삼첨양인도', style: 'spear', len: 1.16, width: 1.20 },
  twinblade: { name: '계도 두 자루', style: 'dual', len: .95, width: .9 },
  spear: { name: '장창', style: 'spear', len: 1.18, width: .9 },
  monkstaff: { name: '수마선장', style: 'monkstaff', len: 1.18, width: 1.25 },
};

export const WORK_STAGES = {
  // ── 서유기 ──────────────────────────────────────────────
  // 원작 순서대로 여덟 전장. 화과산에서 시작해 사타령에서 끝난다.
  huaguoshan: {
    work: 'xiyou', scene: 'huaguoshan', chapter: 1,
    year: '아주 먼 옛날', title: '화과산 · 돌에서 태어난 원숭이 왕',
    mission: '수렴동을 노리는 혼세마왕의 무리를 몰아내요.',
    bossName: '혼세마왕', bossId: 'hunshimowang', heroes: ['wukong'],
    lesson: '오공이 처음 싸운 이유는 자기 자랑이 아니라 식구를 되찾기 위해서였어요. 힘은 지킬 것이 있을 때 쓰는 거예요.',
    scene_intro: '화과산 꼭대기 큰 바위가 갈라지며 돌원숭이가 태어났어요. 폭포 뒤 수렴동을 찾아내 원숭이들의 왕이 되었는데, 어느 날 혼세마왕이 쳐들어와 어린 원숭이들을 잡아갑니다.',
    real: '화과산은 실제로 중국 장쑤성 롄윈강에 있는 산 이름이에요. 소설이 유명해지면서 지금은 관광지가 되었습니다.',
    fiction: '《서유기》는 돌에서 태어난 원숭이라는 설정으로 이야기를 열어, 오공을 처음부터 하늘이 낸 존재로 만들었어요.',
  },
  donghai: {
    work: 'xiyou', scene: 'donghai', chapter: 2,
    year: '아주 먼 옛날', title: '동해 용궁 · 여의봉을 얻다',
    mission: '수궁의 하병해장을 헤치고 바다 밑 보물창고에 닿아요.',
    bossName: '동해용왕 오광', bossId: 'aoguang', heroes: ['wukong'],
    lesson: '오공은 필요한 것을 얻었지만 남의 것을 힘으로 가져온 셈이기도 해요. 이 일이 나중에 하늘에 고발당하는 빌미가 됩니다.',
    scene_intro: '손에 맞는 무기가 없던 오공이 바다 밑 용궁으로 찾아가요. 창고 한가운데 박힌 쇠기둥이 그를 알아보고 빛을 냅니다. 용왕 오광은 내주기 싫어 새우 병사와 게 장수를 부릅니다.',
    real: '여의봉의 본래 이름 정해신침은 바다 깊이를 재는 쇠기둥이라는 뜻이에요. 옛 중국에는 강물을 다스리는 쇠기둥 전설이 여럿 있었습니다.',
    fiction: '《서유기》는 그 쇠기둥을 마음대로 늘었다 줄었다 하는 무기로 바꾸어, 오공의 성격 그 자체처럼 만들었어요.',
  },
  heavenpalace: {
    work: 'xiyou', scene: 'heavenpalace', chapter: 3,
    year: '천계', title: '천궁 대소동 · 제천대성',
    mission: '하늘 병사들을 물리치고 천궁을 가로질러요.',
    bossName: '이랑진군', bossId: 'erlangshen', heroes: ['wukong', 'nezha', 'erlangshen'],
    lesson: '힘이 세다고 마음대로 해도 되는 건 아니에요. 손오공은 이 소동 끝에 오백 년 동안 산에 갇힙니다.',
    scene_intro: '벼슬이 낮다고 화가 난 손오공이 스스로 제천대성이라 부르며 하늘 궁전을 뒤집어 놓아요. 십만 천병이 몰려옵니다.',
    real: '손오공이라는 인물은 역사에 없어요. 인도 신화의 원숭이 신 하누만, 중국 민담의 원숭이 요괴 이야기가 섞여 만들어진 것으로 봅니다.',
    fiction: '《서유기》는 그를 하늘에 맞서는 반항아로 그려, 읽는 사람이 통쾌함을 느끼게 했어요.',
  },
  baihuling: {
    work: 'xiyou', scene: 'baihuling', chapter: 4,
    year: '당 정관 연간', title: '백호령 · 세 번 모습을 바꾼 요괴',
    mission: '모습을 바꿔 다가오는 요괴를 알아보고 물리쳐요.',
    bossName: '백골정', bossId: 'baigujing', heroes: ['wukong', 'bajie', 'wujing'],
    lesson: '진짜를 알아본 사람이 오히려 오해받기도 해요. 오공은 이 일로 쫓겨나지만 결국 다시 돌아와 스승을 구합니다.',
    scene_intro: '흰 언덕에서 요괴가 처녀, 할머니, 할아버지로 세 번 모습을 바꿔 삼장에게 다가와요. 오공만이 그 정체를 알아보는데, 삼장은 오히려 오공을 나무랍니다.',
    real: '길에서 만난 사람을 함부로 믿기 어려웠던 옛 여행길의 불안이 이런 변신 요괴 이야기로 남았다고 봐요.',
    fiction: '《서유기》는 같은 요괴를 세 번 다른 얼굴로 보내, 믿음과 의심이라는 어려운 주제를 아이도 아는 장면으로 만들었어요.',
  },
  lianhuadong: {
    work: 'xiyou', scene: 'lianhuadong', chapter: 5,
    year: '당 정관 연간', title: '평정산 연화동 · 금각과 은각',
    mission: '호리병에 빨려들지 않게 요괴 형제의 부하들을 흩어요.',
    bossName: '은각대왕', bossId: 'yinjiao', heroes: ['wukong', 'bajie', 'wujing'],
    lesson: '오공은 힘이 아니라 꾀로 호리병을 바꿔치기해 이겨요. 무기보다 머리가 이길 때도 있어요.',
    scene_intro: '평정산에는 이름을 부르면 대답한 사람을 빨아들이는 자금홍호로가 있어요. 금각과 은각 형제가 그 보물을 들고 길을 막습니다.',
    real: '호리병은 옛 중국에서 약과 술을 담고 나쁜 기운을 막는 물건이었어요. 그래서 이야기 속 보물로 자주 나옵니다.',
    fiction: '《서유기》는 그 흔한 물건에 이름을 대답하면 빨려든다는 규칙을 붙여, 아주 무서운 무기로 바꿔 놓았어요.',
  },
  huoyundong: {
    work: 'xiyou', scene: 'huoyundong', chapter: 6,
    year: '당 정관 연간', title: '호산 화운동 · 붉은 아이 홍해아',
    mission: '삼매진화의 불길을 피해 어린 요괴 왕을 막아요.',
    bossName: '홍해아', bossId: 'honghaier', heroes: ['wukong', 'bajie', 'wujing', 'tieshangongzhu'],
    lesson: '아무리 센 사람도 혼자서는 못 이기는 상대가 있어요. 도움을 청하는 것도 용기예요.',
    scene_intro: '우마왕과 나찰녀의 아들 홍해아가 삼매진화라는 불을 뿜어요. 물로도 꺼지지 않는 불이라 오공도 크게 다칩니다. 결국 관음보살의 도움을 받아야 했어요.',
    real: '삼매는 본래 마음을 한곳에 모은 상태를 뜻하는 불교 말이에요. 여기에 불을 붙여 삼매진화라는 이름이 되었습니다.',
    fiction: '《서유기》는 가장 무서운 적을 어린아이 모습으로 그려서, 겉모습으로 상대를 판단하면 안 된다는 점을 보여줬어요.',
  },
  flamemountain: {
    work: 'xiyou', scene: 'flamemountain', chapter: 7,
    year: '당 정관 연간', title: '화염산 · 파초선을 찾아서',
    mission: '불길을 뚫고 우마왕의 군세를 돌파해요.',
    bossName: '우마왕', bossId: 'wumawang', heroes: ['wukong', 'bajie', 'wujing', 'tieshangongzhu', 'honghaier'],
    lesson: '혼자 힘만으로 넘을 수 없는 벽도 있어요. 손오공은 결국 여러 사람의 도움을 받아 파초선을 얻습니다.',
    scene_intro: '서쪽으로 가는 길을 팔백 리 불바다가 가로막았어요. 이 불을 끄려면 나찰녀의 파초선이 필요한데, 그 남편 우마왕이 길을 막아섭니다.',
    real: '실제 현장 스님은 불바다가 아니라 타클라마칸 사막과 톈산산맥을 넘었어요. 물이 떨어져 죽을 고비를 넘긴 기록이 남아 있습니다.',
    fiction: '《서유기》는 그 험한 길을 "팔백 리 화염산"이라는 환상적인 장면으로 바꾸어 그렸어요.',
  },
  shituoling: {
    work: 'xiyou', scene: 'shituoling', chapter: 8,
    year: '당 정관 연간', title: '사타령 · 하늘을 덮은 날개',
    mission: '세 마왕의 군세를 뚫고 마지막 관문을 넘어요.',
    bossName: '대붕금시조', bossId: 'dapeng', heroes: ['wukong', 'bajie', 'wujing', 'nezha', 'erlangshen'],
    lesson: '오공이 처음으로 내 힘으로는 안 된다고 인정하고 도움을 청해요. 여정의 끝에서 가장 크게 자란 부분입니다.',
    scene_intro: '사타령에는 사자, 코끼리, 금시조 세 마왕이 있어요. 그중 대붕금시조는 한 번 날개를 치면 구만 리를 가서, 근두운으로도 달아날 수 없습니다.',
    real: '금시조는 인도 신화의 거대한 새 가루다예요. 불교와 함께 중국으로 들어와 《서유기》 속 마왕이 되었습니다.',
    fiction: '《서유기》는 인도에서 건너온 신화 속 새를 마지막 큰 적으로 삼아, 서쪽으로 가는 이야기의 끝을 장식했어요.',
  },
  // ── 수호지 ──────────────────────────────────────────────
  liangshan: {
    work: 'shuihu', scene: 'liangshan', chapter: 1,
    year: '북송 선화 연간', title: '양산박 · 물가의 의형제',
    mission: '갈대밭을 헤치고 관군의 포위를 돌파해요.',
    bossName: '고구의 관군', bossId: 'gaoqiu', heroes: ['linchong', 'wusong', 'lizhishen', 'husanniang'],
    lesson: '억울한 사람들이 모여 서로를 지켰어요. 다만 그들이 택한 방법이 옳았는지는 지금도 논쟁거리랍니다.',
    scene_intro: '나라의 벼슬아치들이 백성을 괴롭히자, 갈 곳 잃은 사람들이 양산박 물가에 모였어요. 관군이 그 습지를 에워쌉니다.',
    real: '북송 선화 연간에 송강이라는 인물이 실제로 반란을 일으켰다는 기록이 《송사》에 짧게 남아 있어요. 다만 36명 규모였다고 전합니다.',
    fiction: '《수호전》은 이를 108명의 호걸 이야기로 크게 부풀려, 저마다 사연을 가진 영웅들로 그렸어요.',
  },
  snowshrine: {
    work: 'shuihu', scene: 'snowshrine', chapter: 2,
    year: '북송 선화 연간', title: '설야 산신묘 · 임충의 길',
    mission: '눈보라 속에서 자객들을 물리치고 살아남아요.',
    bossName: '육겸', bossId: 'luqian', heroes: ['linchong'],
    lesson: '참고 또 참던 사람도 끝내 밀리면 돌아서게 돼요. 임충의 이야기는 그 순간을 아주 차갑게 그립니다.',
    scene_intro: '누명을 쓰고 유배된 임충이 눈 내리는 밤 산신묘에 몸을 피해요. 그런데 그를 죽이러 온 자들이 뒤를 따라옵니다.',
    real: '임충은 실존 인물이 아니라 《수호전》이 만들어낸 인물로 봅니다. 다만 당시 하급 무관이 권력자에게 짓밟히는 일은 흔했어요.',
    fiction: '《수호전》은 임충을 "끝까지 참다가 마침내 폭발하는 사람"으로 그려, 독자가 그 분노에 공감하게 만들었어요.',
  },
};

export const workPerson = (id) => WORK_PEOPLE[id] || null;
export const workStats = (id) => WORK_STATS[id] || null;
export const workStage = (key) => WORK_STAGES[key] || null;
export const workWeapon = (id) => WORK_WEAPONS[WORK_PEOPLE[id]?.weapon] || null;
export const stagesOfWork = (workId) => Object.entries(WORK_STAGES)
  .filter(([, s]) => s.work === workId)
  .sort(([, a], [, b]) => (a.chapter ?? 0) - (b.chapter ?? 0))
  .map(([k]) => k);
export const heroesOfWork = (workId) => Object.entries(WORK_PEOPLE).filter(([, p]) => p.work === workId).map(([k]) => k);
