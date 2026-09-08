# 서유기 확장 설계서 — 「서쪽으로 가는 길」

작성 2026-09-08 · 기획 클로드 · 구현 코덱스
기준 커밋 `9e3c9c3` (`site/sanguo/src` 직접 실행 구조)

## 0. 한 줄

지금 서유기는 삼국지에 얹힌 부록 2전장이다. 이것을 **8전장 여정 + 장수 7명**으로 만들어, 아이가 원작 순서대로 이야기를 따라가게 한다.

## 1. 현재 상태 (2026-09-08 실측)

| 항목 | 현재 |
|---|---|
| 장수 | 손오공 · 저팔계 · 사오정 · 철선공주 (4명, 전원 원화 보유) |
| 전장 | 화염산(ch1) · 천궁(ch2) — 2개 |
| 보스 | 우마왕 · 이랑진군 — 2개 (전용 원화 보유) |
| 배경 | 둘 다 절차 생성(`scenery.js`), 그림 배경 없음 |
| 승마 | 손오공만 근두운(`jindouyun-painted-sheet-v1.png`) |

삼국지는 19명·11전장인데 서유기는 4명·2전장이라 메뉴에서 "준비 중인 작품"처럼 보인다. 아이가 아는 인물(나타·이랑진군·홍해아·백골정·용왕)이 전부 빠져 있다.

## 2. 범위

**한다**
- 신규 전장 6개(총 8개), 원작 순서대로 챕터 재번호
- 신규 플레이 장수 3명(나타·이랑진군·홍해아), 총 7명
- 신규 보스 6종 + 적 진영 로스터 6종 + 절차 배경 팔레트 6종
- 각 전장의 교육 텍스트(`lesson`·`real`·`fiction`) 전문 — 이 문서에 완성본으로 들어 있다

**안 한다 (이번 범위 밖)**
- 서유기 전장의 **그림 배경**(3층 페인팅). 삼국지 `DESIGN-COMBAT-V2.md` M3·M4가 끝난 뒤 X4에서.
- 삼장법사·관음보살 등 비전투 인물. 전투 게임에 맞지 않는다.
- 수호지 확장. 별건.

## 3. 여정 8전장

챕터를 원작 순서로 바꾼다. 기존 두 전장의 번호가 이동한다(화염산 1→7, 천궁 2→3). 난이도도 이 순서로 오른다.

| ch | key | 전장 | 보스 | 상태 |
|---|---|---|---|---|
| 1 | `huaguoshan` | 화과산 · 수렴동 | 혼세마왕 | 신규 |
| 2 | `donghai` | 동해 용궁 | 동해용왕 오광 | 신규 |
| 3 | `heavenpalace` | 천궁 대소동 | 이랑진군 | 기존(번호·장수 갱신) |
| 4 | `baihuling` | 백호령 | 백골정 | 신규 |
| 5 | `lianhuadong` | 평정산 연화동 | 은각대왕 | 신규 |
| 6 | `huoyundong` | 호산 화운동 | 홍해아 | 신규 |
| 7 | `flamemountain` | 화염산 | 우마왕 | 기존(번호·장수 갱신) |
| 8 | `shituoling` | 사타령 | 대붕금시조 | 신규 |

### 3-1. `WORK_STAGES` 추가·수정본 (`src/data/works.js`)

기존 두 항목은 `chapter`와 `heroes`만 바꾼다. `flamemountain.chapter: 7`, `heavenpalace.chapter: 3`.
`heavenpalace.heroes`는 `['wukong', 'nezha', 'erlangshen']`, `flamemountain.heroes`는 `['wukong', 'bajie', 'wujing', 'tieshangongzhu', 'honghaier']`로 넓힌다.

```js
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
```

## 4. 신규 장수 3명

### 4-1. `WORK_PEOPLE` 추가분

```js
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
    weapon: 'firespear', head: 'twinbun', beard: 'none',
    bio: '우마왕과 철선공주의 아들이에요. 삼매진화라는 불을 뿜는데 물로도 꺼지지 않아요. 나중에는 관음보살의 선재동자가 됩니다.',
  },
```

`head: 'twinbun'`은 `character.js`의 `buildHeadgear`에 없다. 3D 인형 리그는 전투 표시에 쓰이지 않으므로 **없으면 `'circlet'`으로 대체하고 새 타입은 만들지 말 것.**

### 4-2. `WORK_STATS` 추가분과 균형 근거

```js
  nezha: { hp: 116, power: 21, speed: 4.5, range: 108, style: '전체 최속', special: '풍화륜 질주', symbol: '🔥', sigil: '哪' },
  erlangshen: { hp: 140, power: 24, speed: 3.6, range: 118, style: '긴 사거리·강타', special: '천안 삼첨도', symbol: '👁', sigil: '二' },
  honghaier: { hp: 110, power: 23, speed: 4.3, range: 102, style: '유리 대포', special: '삼매진화', symbol: '🔴', sigil: '紅' },
```

기존 분포는 노지심 166/25/2.4(최둔중) ↔ 손오공 124/22/4.2(최경쾌)다. 나타는 손오공보다 빠르되 더 얇게, 이랑진군은 사거리 최장(임충 112 초과)으로 두고, 홍해아는 최저 체력·고화력으로 둔다. **셋 다 기존 최댓값을 넘지 않는다** — power 25(노지심)와 hp 166은 그대로 상한.

### 4-3. `WORK_WEAPONS` 추가분

```js
  firespear: { name: '화첨창', style: 'spear', len: 1.14, width: .95 },
  trident: { name: '삼첨양인도', style: 'trident', len: 1.16, width: 1.20 },
```

`style: 'trident'`가 리그에 없으면 `'spear'`로 낮춘다. 새 스타일을 위해 `character.js`를 고치지 말 것.

### 4-4. `DASH_SKILLS` 추가분 (`src/game/dashSkills.js`)

기존 `make(name, desc, color, motion, element, ...)` 시그니처를 그대로 쓴다. 숫자는 손오공(1080/540/180/112/29/2) 기준 상대값이다.

```js
  nezha: make('풍화륜 돌파', '불바퀴로 가르며 지나가기', '#ff9a5c', 'spin', 'storm', 1180, 500, 175, 110, 27, 2),
  erlangshen: make('천안 삼첨참', '변신을 꿰뚫는 삼첨도 일격', '#a8d7ff', 'sweep', 'cloud', 760, 620, 235, 130, 74),
  honghaier: make('삼매진화', '꺼지지 않는 불을 두르고 돌진', '#ff6a2c', 'overhead', 'earth', 900, 560, 200, 118, 62),
```

`element`는 기존에 쓰인 값(`cloud`·`earth`·`water`·`storm`)만 쓴다. 새 이펙트 종류가 필요하면 X3로 미룬다.

## 5. 신규 보스 6종

`BOSS_PROFILES`(`sideScroller.js:176` 부근)에 추가. `kind`는 **기존 값만** 쓴다(`bull`·`celestial`·`marshal`·`betrayer`·`fan`·`staff`·`axe`·`spear`·`sword`·`halberd`). 전용 원화가 있으면 `kind`별 절차 무기 오버레이는 그려지지 않으므로, 원화 준비 전 임시 표시용이다.

```js
  hunshimowang: { kind: 'axe', tint: { from: 0, to: 20, width: 60, sat: 1.00, val: .86 }, glow: '#c8763a', weapon: '대감도', attackRange: 235, hitRange: 220, damage: 18, actionDuration: 620, cooldownScale: 1.10, hpScale: .82 },
  aoguang: { kind: 'staff', tint: { from: 0, to: 186, width: 62, sat: .90, val: 1.04 }, glow: '#5fd8e8', weapon: '용왕 절편', attackRange: 250, hitRange: 232, damage: 21, actionDuration: 560, cooldownScale: 1.00, hpScale: .95 },
  baigujing: { kind: 'betrayer', tint: { from: 0, to: 278, width: 58, sat: .48, val: 1.14 }, glow: '#e6e0f4', weapon: '백골 쌍검', attackRange: 225, hitRange: 212, damage: 23, actionDuration: 400, cooldownScale: .68, hpScale: .86 },
  yinjiao: { kind: 'marshal', tint: { from: 0, to: 266, width: 60, sat: .80, val: 1.00 }, glow: '#c3b2ff', weapon: '칠성검', attackRange: 245, hitRange: 228, damage: 25, actionDuration: 540, cooldownScale: .92, hpScale: 1.06 },
  honghaier: { kind: 'spear', tint: { from: 0, to: 8, width: 64, sat: 1.20, val: 1.06 }, glow: '#ff6a2c', weapon: '화첨창', attackRange: 260, hitRange: 236, damage: 26, actionDuration: 460, cooldownScale: .74, hpScale: .94 },
  dapeng: { kind: 'celestial', tint: { from: 0, to: 44, width: 66, sat: 1.05, val: 1.10 }, glow: '#f5c542', weapon: '금시조 날개', attackRange: 310, hitRange: 262, damage: 30, actionDuration: 640, cooldownScale: .80, hpScale: 1.32 },
```

**보스 `honghaier`와 플레이 장수 `honghaier`는 같은 id를 쓴다.** `BOSS_ART`와 `HERO_ART`는 별도 표라 충돌하지 않지만, 시트 파일은 반드시 다르다(`boss-honghaier-…` vs `honghaier-…`). 보스 쪽은 성난 표정·불꽃 과다, 플레이 쪽은 또렷한 정면 얼굴로 그려 구분한다.

난이도 곡선: `damage` 18 → 21 → 26(이랑진군) → 23 → 25 → 26 → 28(우마왕) → 30. `hpScale` .82에서 1.32까지 단조 증가에 가깝게.

## 6. 적 진영 로스터 6종

`ENEMY_ROSTERS`(`sideScroller.js:160` 부근)에 추가하고, `WORK_TROOP`(`:1216`)에 매핑을 넣는다. `baseHue`는 **매핑한 troop의 틴트 목표 색상과 같아야** 한다(`tint.js:98`).

```js
  const WORK_TROOP = {
    flamemountain: 'yellow', heavenpalace: 'yuan', liangshan: 'wu', snowshrine: 'wei',
    huaguoshan: 'yellow', donghai: 'ship', baihuling: 'yuan', lianhuadong: 'wei', huoyundong: 'dong', shituoling: 'wu',
  };
```

```js
  huaguoshan: { faction: '혼세마왕군', baseHue: 46, names: { soldier: '마왕 졸개', archer: '돌팔매 요괴', heavy: '곰바위 요괴', captain: '혼세 전위' }, hues: { soldier: 40, archer: 28, heavy: 18, captain: 8 }, weapons: { soldier: 'club', archer: 'bow', heavy: 'club', captain: 'axe' }, accent: '#c8763a' },
  donghai: { faction: '동해 수궁군', baseHue: 172, names: { soldier: '새우 병사', archer: '조개 궁수', heavy: '게 장수', captain: '수궁 순찰대' }, hues: { soldier: 186, archer: 200, heavy: 168, captain: 210 }, weapons: { soldier: 'spear', archer: 'bow', heavy: 'club', captain: 'halberd' }, accent: '#5fd8e8' },
  baihuling: { faction: '백골 요괴', baseHue: 205, names: { soldier: '백호령 졸개', archer: '회분 궁귀', heavy: '무덤지기', captain: '백골 시녀' }, hues: { soldier: 272, archer: 258, heavy: 290, captain: 246 }, weapons: { soldier: 'blade', archer: 'bow', heavy: 'club', captain: 'blade' }, accent: '#e6e0f4' },
  lianhuadong: { faction: '연화동 요괴', baseHue: 226, names: { soldier: '연화동 졸개', archer: '호리병 궁수', heavy: '금로 역사', captain: '금각 친위' }, hues: { soldier: 266, archer: 250, heavy: 284, captain: 300 }, weapons: { soldier: 'spear', archer: 'bow', heavy: 'axe', captain: 'halberd' }, accent: '#c3b2ff' },
  huoyundong: { faction: '화운동 화귀', baseHue: 0, names: { soldier: '화운동 불귀', archer: '화전 궁귀', heavy: '화차 역사', captain: '성영 친위' }, hues: { soldier: 8, archer: 22, heavy: 0, captain: 34 }, weapons: { soldier: 'spear', archer: 'bow', heavy: 'club', captain: 'halberd' }, accent: '#ff6a2c' },
  shituoling: { faction: '사타령 마군', baseHue: 96, names: { soldier: '사타령 마졸', archer: '금시조 궁귀', heavy: '코끼리 역사', captain: '사자마왕 친위' }, hues: { soldier: 44, archer: 30, heavy: 56, captain: 20 }, weapons: { soldier: 'halberd', archer: 'bow', heavy: 'axe', captain: 'halberd' }, accent: '#f5c542' },
```

**주의 두 가지.**

1. `weapons` 필드는 2026-09-08 기준 **화면에 나오지 않는다.** 스프라이트 위에 절차 무기를 겹쳐 그리던 코드를 제거했기 때문이다(`9e3c9c3`). 궁수만 활이 그려진다. 값은 데이터 일관성을 위해 채우되, 무기로 진영을 구분하려 하지 말 것.
2. 백골정 진영의 창백한 흰빛은 색상 회전(`hue`)만으로는 안 나온다. `enemySheets` 생성부(`sideScroller.js:1219` 다음 줄)가 `sat: .92` 상수를 쓰기 때문이다. 필요하면 `hues` 값이 숫자뿐 아니라 `{ to, sat, val }` 객체도 받도록 그 한 줄을 확장한다. 다른 전장 동작은 그대로여야 한다.

## 7. 배경 팔레트 6종 (절차)

`scenery.js:24` `SCENES`에 추가. 레이어 `kind`는 **기존 값만** 쓴다: `banners`·`clouds`·`crags`·`deadtrees`·`pagoda`·`reeds`·`ridge`·`shrine`·`wall`·`water`. `ember`(불티)와 `snow`(눈)만 입자 옵션이다.

```js
  huaguoshan: {
    sky: ['#123526', '#3f7a4e', '#c6e6a8'],
    haze: 'rgba(150,220,160,.16)',
    layers: [
      { kind: 'ridge', depth: .06, color: '#123024', height: .50, rough: .8 },
      { kind: 'ridge', depth: .16, color: '#1d4630', height: .38, rough: 1.0 },
      { kind: 'water', depth: .34, color: 'rgba(180,235,225,.42)' },
      { kind: 'reeds', depth: .52, color: '#2c5c34' },
    ],
    ground: ['#3f6b3c', '#1b3220'],
  },
  donghai: {
    sky: ['#04202e', '#0a4a63', '#2f9fb8'],
    haze: 'rgba(80,200,220,.24)',
    layers: [
      { kind: 'water', depth: .05, color: 'rgba(120,220,235,.22)' },
      { kind: 'pagoda', depth: .20, color: '#0b3546', accent: '#7fe3d6' },
      { kind: 'crags', depth: .38, color: '#08293a' },
      { kind: 'water', depth: .56, color: 'rgba(150,235,245,.30)' },
    ],
    ground: ['#0d3b4a', '#04202b'],
  },
  baihuling: {
    sky: ['#2a2733', '#5a5566', '#cbc6d4'],
    haze: 'rgba(220,215,235,.26)',
    layers: [
      { kind: 'ridge', depth: .07, color: '#2b2833', height: .46, rough: 1.0 },
      { kind: 'deadtrees', depth: .22, color: '#3b3644' },
      { kind: 'shrine', depth: .40, color: '#443e50', accent: '#b9b2c6' },
      { kind: 'crags', depth: .58, color: '#332f3c' },
    ],
    ground: ['#4a4553', '#22202a'],
  },
  lianhuadong: {
    sky: ['#1a0f26', '#3d1f52', '#7b4b96'],
    haze: 'rgba(190,150,230,.20)',
    layers: [
      { kind: 'crags', depth: .06, color: '#1d1029' },
      { kind: 'pagoda', depth: .22, color: '#2a1740', accent: '#c8a6ff' },
      { kind: 'crags', depth: .44, color: '#2f1c44' },
      { kind: 'banners', depth: .60, color: '#5a2f7a', accent: '#e0c2ff' },
    ],
    ground: ['#3a2448', '#170e20'],
  },
  huoyundong: {
    sky: ['#2b0a06', '#7c1f0d', '#e8632a'],
    haze: 'rgba(255,120,50,.28)',
    ember: '#ff7a2c',
    layers: [
      { kind: 'ridge', depth: .06, color: '#2a0c07', height: .54, rough: 1.1 },
      { kind: 'crags', depth: .20, color: '#45140a' },
      { kind: 'deadtrees', depth: .40, color: '#361008' },
      { kind: 'crags', depth: .58, color: '#5c2010' },
    ],
    ground: ['#5e2410', '#2a0f07'],
  },
  shituoling: {
    sky: ['#141118', '#332b38', '#6d5f52'],
    haze: 'rgba(160,150,140,.26)',
    ember: '#f5c542',
    layers: [
      { kind: 'ridge', depth: .05, color: '#17141a', height: .58, rough: 1.2 },
      { kind: 'ridge', depth: .15, color: '#241f27', height: .42, rough: 1.4 },
      { kind: 'deadtrees', depth: .34, color: '#2c2429' },
      { kind: 'crags', depth: .56, color: '#1d181d' },
    ],
    ground: ['#2e2a28', '#141212'],
  },
```

사타령의 `ember`는 불티가 아니라 **금빛 깃털**로 읽히게 하려는 것이다. 입자 코드를 바꿀 필요는 없다.

## 8. 원화 목록

`ART-THREE-KINGDOMS-ROSTER.md`의 프롬프트 규격(투명 알파, 정사각 2×2 균등 셀, 오른쪽을 향한 전신, 읽는 순서 대기·전진·준비·공격)을 그대로 따른다. 내장 `image_gen`만 쓴다.

| 우선 | 파일 | 대상 | 비고 |
|---|---|---|---|
| X1 | `nezha-painted-sheet-v1.png` | 나타 기본 | 붉은 비단·혼천릉(붉은 띠)·금색 건곤권·화첨창 |
| X1 | `nezha-bow-painted-sheet-v1.png` | 나타 원거리 | 활 대신 **건곤권 투척 자세** |
| X1 | `boss-hunshimowang-painted-sheet-v1.png` | 혼세마왕 | 검은 갑옷 거구·대감도 |
| X1 | `boss-aoguang-painted-sheet-v1.png` | 동해용왕 오광 | 청록 용 비늘 갑옷·왕관·수염, 사람 형상 |
| X1 | `boss-baigujing-painted-sheet-v1.png` | 백골정 | **해골 노출 금지**(아래 9-2 참조) |
| X2 | `erlangshen-hero-painted-sheet-v1.png` | 이랑진군 플레이용 | 기존 보스 시트와 별도. 제3안(천안) 은은하게 |
| X2 | `erlangshen-hero-bow-painted-sheet-v1.png` | 이랑진군 원거리 | 탄궁 |
| X2 | `boss-yinjiao-painted-sheet-v1.png` | 은각대왕 | 은빛 갑옷·자줏빛 호리병 |
| X2 | `boss-honghaier-painted-sheet-v1.png` | 홍해아(보스) | 붉은 소년 요괴·불꽃 후광 |
| X2 | `boss-dapeng-painted-sheet-v1.png` | 대붕금시조 | 금빛 날개 무장·매부리 투구, 사람 형상 |
| X3 | `honghaier-painted-sheet-v1.png` / `-bow-` | 홍해아(플레이) | 표정 밝게, 보스판과 확실히 구분 |
| X3 | `mount-fenghuolun-painted-sheet-v1.png` | 나타 풍화륜 | 근두운(`jindouyun`)과 같은 규격 |
| X3 | `mounted-nezha-…` / `mounted-nezha-bow-…` | 나타 승마 | 풍화륜 탑승 |

`MOUNT_ART`(`sideScroller.js:109`)에 `nezha: 'art/side-scroller/mount-fenghuolun-painted-sheet-v1.png'`를 추가하면 손오공 근두운과 같은 경로로 붙는다. 이랑진군·홍해아 승마는 이번 범위 밖(`MOUNT_ART` 미등록 → 승마 버튼 자동 비활성).

## 9. 아이 대상 원칙

### 9-1. 교육 텍스트

`lesson`·`real`·`fiction` 세 필드는 **전 전장 필수**다. 위 3-1에 완성본이 있으므로 새로 쓰지 말고 그대로 붙인다. 문체 규칙은 기존과 같다. 존댓말, 한 문장 40자 안팎, 어려운 한자어는 풀어 쓴다. `real`은 실제 역사·지리·어원, `fiction`은 소설이 그것을 어떻게 바꿨는지.

### 9-2. 무서움 수위

아이는 8세·5세다. **백골정 원화에 해골·뼈·빈 눈구멍을 그리지 않는다.** 흰 소복과 은빛 가면, 창백한 안색까지만. 이전에도 캐릭터가 "할로윈 해골 같다"는 지적을 받아 관절을 채운 적이 있다. 같은 실수를 반복하지 말 것.

대붕금시조와 혼세마왕도 사람 형상 무장으로 그린다. 짐승 머리·과한 이빨·피는 쓰지 않는다.

### 9-3. 인물 표기

한글 표기를 이 문서 그대로 쓴다. 나타(哪吒), 이랑진군, 홍해아, 백골정, 은각대왕, 대붕금시조, 혼세마왕, 오광.

## 10. 엔진 변경 지점 (파일:줄)

| 대상 | 위치 |
|---|---|
| 인물·스탯·무기·전장 데이터 | `src/data/works.js` — `WORK_PEOPLE:29` `WORK_STATS:89` `WORK_WEAPONS:101` `WORK_STAGES:113` |
| 장수 원화 표 | `src/game/sideScroller.js` `HERO_ART`(파일 상단) |
| 탈것 원화 표 | `sideScroller.js:104`, `MOUNT_ART:109` |
| 보스 원화 표 | `sideScroller.js:123` `BOSS_ART` |
| 보스 프로필 | `sideScroller.js:176` 부근 `BOSS_PROFILES` |
| 적 로스터 | `sideScroller.js:160` 부근 `ENEMY_ROSTERS` |
| 전장→진영 매핑 | `sideScroller.js:1216` `WORK_TROOP` |
| 배경 팔레트 | `src/game/scenery.js:24` `SCENES` |
| 돌진기 | `src/game/dashSkills.js:4` `DASH_SKILLS` |
| 메뉴 정렬·잠금 | `src/ui/workSelect.js:50-83` — 챕터 순 정렬과 "원화 준비 중" 잠금이 이미 있다. 원화 없는 신규 장수는 자동으로 잠긴다 |

`src/game/battle.js`·`controller.js`·`combat.js`는 `main.js`에서 참조되지 않는 죽은 코드다. 건드리지 말 것.

## 11. 완료 기준

1. 메뉴에서 서유기를 고르면 전장이 **8개**, 챕터 번호가 1~8로 이어진다.
2. 각 신규 전장에 들어가면 해당 진영 이름의 적이 나오고, 배경 하늘·지면 색이 전장마다 다르다.
3. 보스 파도에서 해당 보스 이름이 배너에 뜨고, 전용 원화가 있으면 그것이 표시된다.
4. 신규 장수는 원화가 있는 것만 선택 가능하고, 없는 것은 "전용 원화 준비 중"으로 잠긴다(기존 동작).
5. 신규 장수로 전장을 끝까지 클리어할 수 있다. 승리 화면의 `lesson`·`real`·`fiction`이 이 문서와 일치한다.
6. 기존 삼국지 11전장과 수호지 2전장의 동작·외형에 **회귀가 없다**.
7. 콘솔 에러 0.
8. `node --test sanguo/tests/dash-skills.test.cjs`, `node --test sanguo/tests/combat-bounds.test.cjs` 통과. `sanguo/tests/combat-playthrough.cjs`의 `representativeCases`에 서유기 신규 조합 2건(`['nezha','huaguoshan']`, `['wukong','shituoling']`)을 추가하고 통과.

## 11-A. 구현 현황 (2026-09-08 갱신)

**데이터·엔진은 전부 들어갔다.** 남은 것은 원화뿐이다.

| 항목 | 상태 |
|---|---|
| 전장 8개(챕터 1~8) | 완료. `stagesOfWork`가 챕터 순으로 정렬하도록 고쳤다 |
| 교육 텍스트(`lesson`·`real`·`fiction`) | 완료. 이 문서 3-1 그대로 |
| 신규 장수 3명 데이터(인물·스탯·무기·돌진기·전투 프로필·기술명) | 완료 |
| 보스 6종 프로필 | 완료 |
| 적 진영 6종 + `WORK_TROOP` 매핑 | 완료 |
| 절차 배경 6종 | 완료 |
| 신규 장수 **원화** | **미완** — 그래서 나타·이랑진군·홍해아는 메뉴에서 "전용 원화 준비 중"으로 잠겨 있다 |
| 보스 6종 **원화** | **미완** — 화웅 시트를 프로필 색으로 틴트해서 임시 표시 중 |

§6 주의 2에서 예고한 대로, 백골 진영의 창백한 흰빛을 위해 `hues` 값이 숫자뿐 아니라
`{ to, sat, val, width }` 객체도 받도록 `enemySheets` 생성부를 넓혔다. 숫자를 넘기면
예전과 완전히 같은 틴트가 나온다.

검증: `dash-skills`(30종) · `combat-bounds` · `mounted-sprites` 통과,
`combat-playthrough`에 `wukong × 화과산/백호령/사타령` 3건을 추가해 7파도 클리어 확인,
`menu`·`art-atlas`·`mount-browser` 회귀 없음. 서비스 워커 `v53`.

## 12. 마일스톤

| M | 내용 | 산출물 |
|---|---|---|
| X1 | 전장 3(화과산·용궁·백호령) + 보스 3 + 로스터 3 + 배경 3 + **나타** | 완료 기준 1~7의 해당 부분, 원화 5장 |
| X2 | 전장 3(연화동·화운동·사타령) + 보스 3 + 로스터 3 + 배경 3 + **이랑진군** | 완료 기준 전부, 원화 5장 |
| X3 | **홍해아** 플레이 + 나타 풍화륜 승마 + 서유기 전용 연출(분신·삼매진화 이펙트) | 원화 5장 |
| X4 | 서유기 8전장 그림 배경 3층 | `DESIGN-COMBAT-V2.md` M4 이후 |

X1이 끝나면 아이패드로 아이들 실플레이 한 번. 화과산 난이도(`hpScale .82`, `damage 18`)가 5세에게 맞는지 여기서 결정한다.

## 13. 검증 방법 (헤드리스)

`sanguo/tests/combat-playthrough.cjs`가 쓰는 방식이 가장 빠르다. `preview-server.cjs`로 서빙하고, `sideScroller.js`를 라우트 가로채기로 계측본(`__battle` 훅 주입, `loop` 무력화)으로 바꾼 뒤 `startSideBattle(hero, stage)`를 직접 호출한다. `NODE_PATH`는 `C:\Users\김시현\OneDrive\문서\jay-teo-multiverse\node_modules`.

입력 타이밍을 보는 검사라면 **20fps 이상을 확보**해야 한다. 640×400 뷰포트 + `--disable-gpu-vsync --disable-frame-rate-limit`. 8fps에서는 `BUFFER_MS 240` 만료로 정상 입력도 유실되어 결과가 무효다.
