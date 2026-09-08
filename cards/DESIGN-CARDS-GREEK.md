# 카드 확장 설계서 — 그리스 로마 신화 주요 인물 16장

작성 2026-09-08 · 기획 클로드 · 구현 코덱스
기준: `cards.json` 24장 (커밋 `75a5c0a`, 전원 대전 가능) · 엔진 `js/engine.js` · 규약 `DESIGN.md`

## 0. 한 줄

그리스 신화 카드를 6장에서 22장으로 늘린다. 올림포스 주요 신, 대표 영웅, 대표 괴물을 타입당 4장씩 고르게 넣는다.

## 1. 왜 50장이 아니라 16장인가

50장은 만들 수는 있지만 **그림 100장과 문제 250개**가 따라붙는다. 카드 한 장은 데이터 한 줄이 아니라 PNG와 WEBP 두 장, 크롭 좌표, 프리캐시 항목, 문항 5개, 테스트 상수 갱신이다.

그래서 아이가 이름을 아는 인물만 남겼다. 올림포스 12신을 다 넣지 않고 4명, 영웅과 괴물도 대표만 고른다. 나머지는 이 16장이 실제로 재미있는지 본 뒤에 늘린다.

이미 있는 그리스 카드 6장은 손대지 않는다. 헤라클레스, 페르세우스, 오디세우스, 폴리페모스, 메두사, 미다스.

## 2. 16장 명단

타입은 지금 정확히 6장씩이다. 타입당 4장씩 더해 **10 / 10 / 10 / 10**으로 맞춘다.

| 타입 | 카드 |
|---|---|
| 용기 ⚔️ | 아킬레우스 · 테세우스 · 아르테미스 · 아탈란테 |
| 지혜 📘 | 아테나 · 헤르메스 · 오르페우스 · 프로메테우스 |
| 마법 ✨ | 제우스 · 포세이돈 · 하데스 · 아폴론 |
| 괴물 🌑 | 미노타우로스 · 케르베로스 · 히드라 · 스핑크스 |

### 2-1. 능력 표

`fx`는 엔진이 이미 구현한 코드만 쓴다(`engine.js:39`, `DESIGN.md:66-79`).

| id | 이름 | 타입 | ⭐ | HP | 패시브 | 기술 |
|---|---|---|---|---|---|---|
| `achilles` | 아킬레우스 | 용기 | 3 | 110 | 불사의 몸 · `reduce_dmg_10` | 청동 창 1★/20 · 분노의 돌격 3★/60 |
| `theseus` | 테세우스 | 용기 | 2 | 80 | — | 미궁의 실타래 1★/0 `gain_star_1` · 영웅의 검 2★/30 · 미궁 돌파 3★/50 |
| `artemis` | 아르테미스 | 용기 | 3 | 80 | — | 은화살 1★/20 · 달빛 사냥 2★/20 `weaken_next_20` · 사냥의 여신 3★/50 |
| `atalanta` | 아탈란테 | 용기 | 2 | 70 | 누구보다 빠른 발 · `boost_20_below_half` | 달리기 겨루기 1★/10 `steal_star_1` · 사냥 창 2★/30 |
| `athena` | 아테나 | 지혜 | 3 | 80 | 지혜의 방패 · `reduce_dmg_10` | 올빼미의 눈 1★/0 `weaken_next_20` · 아이기스 반격 2★/30 · 전략의 창 3★/50 |
| `hermes` | 헤르메스 | 지혜 | 2 | 60 | — | 날개 신발 1★/0 `gain_star_1` · 도둑의 손 1★/10 `steal_star_1` · 전령의 지팡이 2★/30 |
| `orpheus` | 오르페우스 | 지혜 | 2 | 60 | — | 리라의 노래 2★/10 `skip_next_enemy` · 저승의 노래 3★/40 |
| `prometheus` | 프로메테우스 | 지혜 | 3 | 100 | 꺼지지 않는 불 · `boost_20_below_half` | 훔친 불꽃 1★/20 · 독수리의 시련 2★/30 `dmg_stack_10` · 인류의 불 3★/50 |
| `zeus` | 제우스 | 마법 | 3 | 100 | 신들의 왕 · `reduce_dmg_10` | 번개 창 1★/20 · 천둥 심판 4★/60 |
| `poseidon` | 포세이돈 | 마법 | 3 | 110 | 바다의 분노 · `boost_20_below_half` | 삼지창 2★/30 · 해일 4★/60 |
| `hades` | 하데스 | 마법 | 3 | 90 | 보이지 않는 투구 · `first_hit_zero` | 저승의 손길 1★/10 `steal_star_1` · 망자의 물결 3★/50 |
| `apollo` | 아폴론 | 마법 | 2 | 70 | — | 태양의 화살 1★/20 · 신탁의 빛 2★/0 `weaken_next_20` · 리라의 심판 3★/40 |
| `minotaur` | 미노타우로스 | 괴물 | 3 | 130 | 미궁의 주인 · `reduce_dmg_10` | 뿔 돌진 2★/40 · 미궁의 포효 3★/50 |
| `cerberus` | 케르베로스 | 괴물 | 3 | 120 | 머리가 셋 · `boost_20_below_half` | 세 갈래 물기 1★/10 `dmg_stack_10` · 저승문 지키기 3★/50 |
| `hydra` | 히드라 | 괴물 | 3 | 100 | 다시 자라는 머리 · `revive_half_once` | 아홉 머리 물기 1★/10 `dmg_stack_10` · 독 안개 2★/30 |
| `sphinx` | 스핑크스 | 괴물 | 2 | 70 | — | 수수께끼 1★/0 `steal_star_1` · 사자의 발톱 2★/30 · 날개 급습 3★/40 |

### 2-2. 밸런스에서 반드시 지킬 두 가지

2026-09-08에 카드 5장을 살리면서 **판이 끝나지 않는 조합**을 두 번 만들었다. 같은 실수를 막기 위해 이 설계서의 16장에는 아래를 적용했다.

1. **`heal_40`을 쓰지 않는다.** 회복량이 상대의 2별 기술 피해보다 크면 서로 죽지 않는다. 브레멘 음악대가 신데렐라와 무한 교착에 빠졌던 원인이다.
2. **`coin_evade`를 쓰지 않는다.** 회피 패시브를 가진 카드끼리 만나면 양쪽 다 계속 피해서 끝나지 않는다. 지금 이 패시브는 홍길동 한 장뿐이니 더 늘리지 않는다.
3. 추가로, `skip_next_enemy`를 쓰는 기술에는 **반드시 피해를 붙인다**(오르페우스 2★/10). 피해가 0이면 상대만 묶은 채 아무도 죽지 않는다.

구현 후 `node --test cards/tests/combat-strategy.test.js`가 이 세 가지를 자동으로 잡아 준다. 반드시 통과시킬 것.

### 2-3. 별 3종 산출 (`DESIGN.md:260-266` 적용 결과)

| id | ⚔ | 🛡 | ✨ |
|---|---|---|---|
| achilles | 4 | 5 | 1 |
| theseus | 4 | 4 | 2 |
| artemis | 4 | 4 | 2 |
| atalanta | 3 | 3 | 2 |
| athena | 4 | 5 | 3 |
| hermes | 2 | 2 | 4 |
| orpheus | 3 | 2 | 3 |
| prometheus | 5 | 4 | 3 |
| zeus | 4 | 5 | 2 |
| poseidon | 5 | 5 | 2 |
| hades | 4 | 5 | 3 |
| apollo | 3 | 3 | 3 |
| minotaur | 4 | 5 | 1 |
| cerberus | 5 | 5 | 2 |
| hydra | 3 | 5 | 2 |
| sphinx | 3 | 3 | 2 |

구현 전에 규칙대로 다시 계산해 검산할 것. 어긋나면 규칙이 옳다.

### 2-4. JSON 예시

```json
    {
      "id": "zeus",
      "name": "제우스",
      "emoji": "⚡",
      "type": "magic",
      "rarity": 3,
      "summonCost": 5,
      "hp": 100,
      "passive": {
        "name": "신들의 왕",
        "desc": "받는 피해가 10 줄어요",
        "fx": "reduce_dmg_10"
      },
      "attacks": [
        {
          "name": "번개 창",
          "cost": 1,
          "dmg": 20,
          "fx": null,
          "desc": "",
          "vfx": { "kind": "projectile", "emoji": "⚡" }
        },
        {
          "name": "천둥 심판",
          "cost": 4,
          "dmg": 60,
          "fx": null,
          "desc": "",
          "vfx": { "kind": "burst", "emoji": "🌩️", "big": true }
        }
      ],
      "unlock": "heracles",
      "unlockAll": ["heracles", "perseus"],
      "art": "art/zeus.png",
      "stats": { "attack": 4, "defense": 5, "spirit": 2 }
    },
```

## 3. 해금 — 새 오디오 없이 지금 열리게

카드는 `/story/` 오디오를 끝까지 들어야 열린다. 그리스 에피소드는 넷뿐이다. `heracles`, `perseus`, `odyssey_cyclops`, `midas`.

16장 중 여섯은 이 넷에 그대로 붙는다. 나머지 열은 **여러 편을 다 들으면 열리는 방식**으로 만든다. 새 오디오를 만들지 않고도 전부 도달 가능하고, 아이에게는 "그리스 이야기를 다 들으면 신들이 깨어난다"는 목표가 생긴다.

### 3-1. 새 필드 `unlockAll`

`unlock`은 그대로 두고(문구 표시에 쓴다), 선택 필드 `unlockAll`을 더한다. 배열의 이야기를 **전부** 들어야 열린다.

`js/app.js:124`를 고친다.

```js
  function isUnlocked(card) {
    if (Array.isArray(card.unlockAll) && card.unlockAll.length) {
      return card.unlockAll.every(isStoryDone);
    }
    if (!card.unlock) return true;
    return isStoryDone(card.unlock);
  }
```

`getUnlockSnapshot`(`app.js:139`)은 `isUnlocked`를 부르므로 그대로 둔다.

잠긴 카드 안내(`app.js:285`)는 이야기 이름 하나만 보여 준다. `unlockAll`이면 문구를 바꾼다. 예를 들어 **"「영웅 헤라클레스」와 「페르세우스와 메두사」를 모두 들으면 만날 수 있어!"**. 두 편이 넘으면 쉼표로 잇는다.

### 3-2. 카드별 해금

| 카드 | 해금 조건 | 근거 |
|---|---|---|
| hydra | `heracles` | 헤라클레스가 벤 물뱀 |
| cerberus | `heracles` | 열두 과업의 마지막 |
| athena | `perseus` | 페르세우스에게 방패를 빌려준 신 |
| hermes | `perseus` | 날개 신발을 빌려준 신 |
| poseidon | `odyssey_cyclops` | 폴리페모스의 아버지 |
| apollo | `midas` | 미다스의 귀를 당나귀 귀로 만든 신 |
| zeus | `heracles` + `perseus` | 두 영웅 모두의 아버지 |
| hades | `heracles` + `odyssey_cyclops` | 저승을 다녀온 두 이야기 |
| achilles | `heracles` + `perseus` + `odyssey_cyclops` | 영웅 세 편을 모으면 |
| theseus | `heracles` + `perseus` | 영웅의 계보 |
| minotaur | `heracles` + `odyssey_cyclops` | 괴물 두 편 |
| artemis | `perseus` + `midas` | 신들이 사람을 시험하는 이야기 |
| atalanta | `heracles` + `midas` | 달리기와 황금 사과 |
| orpheus | `perseus` + `midas` | 노래와 저승 |
| prometheus | `heracles` + `midas` | 불과 욕심 |
| sphinx | `perseus` + `odyssey_cyclops` | 수수께끼를 내는 괴물 |

새 오디오를 만들게 되면(트로이·미궁·오르페우스·판도라 등), 해당 카드의 `unlockAll`을 지우고 `unlock`을 새 에피소드 id로 바꾸면 된다. 데이터 한 줄이다.

## 4. 필살기 문제

`🌟 별빛 이야기`는 카드마다 5문항이 있어야 열린다(`js/story-gates.js`). 16장이면 80문항이다.

**출제 원칙.** 문제는 그 카드에 이어진 오디오 에피소드의 내용만 묻는다. `unlockAll` 카드는 배열의 **첫 번째** 이야기를 `cardStories`에 적고, 그 이야기 안에 실제로 나오는 대목에서 낸다. 오디오 대본이 저장소에 없으므로, 어느 판본에나 공통으로 나오는 사실만 고른다. 특정 판본에만 있는 이름이나 숫자는 피한다.

각 카드의 첫 문항을 미리 정한다. 나머지 64문항은 그림이 나온 뒤 같은 형식으로 채운다.

```js
    question("zeus-father", "zeus",
      "헤라클레스의 아버지는 누구인가요?",
      [["zeus", "신들의 왕 제우스"], ["hades", "저승의 왕 하데스"], ["king", "에우리스테우스 왕"]], "zeus",
      ["audio: heracles 제우스의 아들"]),
    question("hydra-heads-regrow", "hydra",
      "히드라의 머리를 자르면 어떻게 되었나요?",
      [["regrow", "두 개로 다시 자랐어요"], ["gone", "그대로 사라졌어요"], ["stone", "돌이 되었어요"]], "regrow",
      ["audio: heracles 히드라"]),
    question("cerberus-heads", "cerberus",
      "저승 문을 지키는 케르베로스의 머리는 몇 개인가요?",
      [["three", "세 개"], ["one", "한 개"], ["nine", "아홉 개"]], "three",
      ["audio: heracles 케르베로스"]),
    question("athena-shield", "athena",
      "페르세우스가 메두사를 직접 보지 않으려고 쓴 것은 무엇인가요?",
      [["shield", "거울처럼 빛나는 방패"], ["hat", "커다란 모자"], ["water", "물그릇"]], "shield",
      ["audio: perseus 방패"]),
    question("hermes-sandals", "hermes",
      "페르세우스가 하늘을 날 수 있게 해 준 물건은 무엇인가요?",
      [["sandals", "날개 달린 신발"], ["carpet", "양탄자"], ["horse", "나무 말"]], "sandals",
      ["audio: perseus 날개 신발"]),
    question("poseidon-father", "poseidon",
      "폴리페모스의 아버지인 바다의 신은 누구인가요?",
      [["poseidon", "포세이돈"], ["zeus", "제우스"], ["hades", "하데스"]], "poseidon",
      ["audio: odyssey_cyclops 바다의 신"]),
    question("apollo-donkey-ears", "apollo",
      "미다스 왕의 귀를 당나귀 귀로 만든 신은 누구인가요?",
      [["apollo", "아폴론"], ["hermes", "헤르메스"], ["athena", "아테나"]], "apollo",
      ["audio: midas 당나귀 귀"]),
    question("hades-underworld", "hades",
      "하데스가 다스리는 곳은 어디인가요?",
      [["underworld", "죽은 이들이 가는 저승"], ["sea", "바다"], ["sky", "하늘"]], "underworld",
      ["audio: heracles 저승"]),
    question("achilles-heel", "achilles",
      "아킬레우스의 몸에서 단 한 곳 약한 자리는 어디인가요?",
      [["heel", "발뒤꿈치"], ["hand", "손바닥"], ["ear", "귀"]], "heel",
      ["audio: heracles 영웅의 약점"]),
    question("theseus-thread", "theseus",
      "테세우스가 미궁에서 길을 잃지 않으려고 쓴 것은 무엇인가요?",
      [["thread", "실타래"], ["map", "지도"], ["torch", "횃불"]], "thread",
      ["audio: heracles 미궁"]),
    question("minotaur-maze", "minotaur",
      "미노타우로스가 갇혀 있던 곳은 어디인가요?",
      [["labyrinth", "빠져나올 수 없는 미궁"], ["cave", "바닷가 동굴"], ["tower", "높은 탑"]], "labyrinth",
      ["audio: heracles 미궁"]),
    question("artemis-bow", "artemis",
      "사냥의 여신 아르테미스가 늘 지니고 다니는 것은 무엇인가요?",
      [["bow", "은빛 활"], ["harp", "리라"], ["hammer", "망치"]], "bow",
      ["audio: perseus 사냥의 여신"]),
    question("atalanta-race", "atalanta",
      "아탈란테가 누구보다 잘하던 것은 무엇인가요?",
      [["run", "달리기"], ["sing", "노래"], ["cook", "요리"]], "run",
      ["audio: heracles 빠른 발"]),
    question("orpheus-lyre", "orpheus",
      "오르페우스가 연주하면 어떤 일이 일어났나요?",
      [["calm", "짐승도 얌전해졌어요"], ["rain", "비가 내렸어요"], ["gold", "황금이 나왔어요"]], "calm",
      ["audio: perseus 노래"]),
    question("prometheus-fire", "prometheus",
      "프로메테우스가 사람에게 가져다준 것은 무엇인가요?",
      [["fire", "불"], ["gold", "황금"], ["bread", "빵"]], "fire",
      ["audio: midas 선물"]),
    question("sphinx-riddle", "sphinx",
      "스핑크스는 지나가는 사람에게 무엇을 냈나요?",
      [["riddle", "수수께끼"], ["race", "달리기 시합"], ["song", "노래 시합"]], "riddle",
      ["audio: perseus 수수께끼"]),
```

`source.refs`의 `audio:` 표기는 형식을 맞춘 것이다. 실제 오디오에 그 대목이 없으면 문항을 바꾼다.

## 5. 그림

카드당 PNG와 WEBP 두 장, 정확히 1024×1536 RGB. 파일 이름은 카드 id 그대로. **16장 × 2 = 32개 파일.**

미술 지시는 `ART_DIRECTION.md`의 「별빛 서사화」 톤을 따른다. 그림에는 **글자·숫자·테두리·별을 그리지 않는다.** 전부 HTML 레이어가 그린다(`DESIGN.md:92`).

기존 그리스 카드 6장과 같은 세계에 사는 인물로 보여야 한다. 헤라클레스와 페르세우스의 피부 톤, 갑옷 질감, 배경 처리를 참조한다.

**아이 대상 수위.** 8세와 5세가 본다.

- 뼈·해골·피·상처를 그리지 않는다. 케르베로스와 하데스도 어둡되 무섭지 않게, 눈은 또렷하게.
- 히드라의 잘린 목을 그리지 않는다. 머리 여럿이 달린 통째 모습까지만.
- 신들의 복식은 천으로 충분히 가린다. 아프로디테를 명단에서 뺀 이유이기도 하다.
- 미노타우로스는 사람 몸에 소머리, 우람하되 포효하는 얼굴은 피한다.

크롭 좌표는 `js/card-view.js:17`의 `ART_POSITION`과 `IMAGE_PROMPTS.md:45-70`의 표 **양쪽에** 넣는다. 둘의 id 집합이 다르면 테스트가 실패한다.

## 6. 손대야 하는 파일

| # | 파일 | 할 일 |
|---|---|---|
| 1 | `cards/cards.json:3` | `collection`에 16개 추가 (24 → 40) |
| 2 | `cards/cards.json` `cards` | 카드 객체 16개 추가 |
| 3 | `cards/art/*.png` `*.webp` | 32개 파일 |
| 4 | `cards/js/app.js:124` | `unlockAll` 판정 + 잠금 안내 문구 |
| 5 | `cards/js/card-view.js:17` | `ART_POSITION` 16개 |
| 6 | `cards/IMAGE_PROMPTS.md` | 장면 프롬프트 16줄 + 크롭 표 16행 |
| 7 | `cards/js/story-gates.js:5` | `cardStories` 16개 + 문항 80개 |
| 8 | `site/sw.js` `CARD_ART_FILES` | 16개 추가, `CACHE_VERSION` 한 단계 |
| 9 | `cards/index.html` · `sw.js` 프리캐시 | `?v=` 한 단계 (js를 고쳤으므로) |
| 10 | `cards/tests/engine.test.js` | 그림 파일 수 48 → 80, SHA-256 매니페스트 재계산, `featuredCards.length` 24 → 40 |
| 11 | `cards/tests/pwa.test.js` | 24 → 40, 캐시 세대·버전 문자열 |
| 12 | `cards/tests/collection-compact.test.js` | 24 → 40, 버전 문자열 |
| 13 | `cards/tests/integration.test.js` | 기술 수 51 → 새 값, VFX 종류별 집계와 음색 서명 수 재계산 |
| 14 | `cards/tests/story-gates.test.js` | `PLAYABLE_CARD_IDS` 16개 추가, 문항 하한 `24 * 5` → `40 * 5` |
| 15 | `cards/DESIGN.md` | 컬렉션 장수와 타입 분포 갱신 |

10번과 13번의 숫자는 **직접 계산해 넣는다.** 짐작하지 말 것. 계산법은 `integration.test.js:561`의 본문을 그대로 실행해 보면 나온다.

## 7. 완료 기준

1. 컬렉션이 40장, 타입별로 10장씩이다.
2. 그리스 에피소드 넷을 모두 들은 상태에서 16장이 전부 잠금 해제된다.
3. 한두 편만 들은 상태에서는 해당 카드만 열리고, 잠긴 카드의 안내 문구가 필요한 이야기를 **모두** 알려 준다.
4. 16장 전부 대전 가능하고, 각각 필살기 문제가 열린다.
5. `node --test cards/tests/*.test.js`가 어벤져스 서비스워커 건을 뺀 전부 통과. 특히 **교착 검사**를 반드시 통과할 것(2-2 참조).
6. 기존 24장의 능력치·해금·그림에 변화가 없다.
7. 그림 32개가 전부 1024×1536 RGB이고 png/webp 쌍이 맞는다.
8. 한 판이 3분 안에 끝난다. 미노타우로스 130 HP와 헤르메스 60 HP를 실제로 붙여 본다.

## 8. 마일스톤

| M | 내용 | 새 그림 |
|---|---|---|
| G1 | `unlockAll` 해금 구현 + 마법 4장(제우스·포세이돈·하데스·아폴론) | 8개 파일 |
| G2 | 괴물 4장(미노타우로스·케르베로스·히드라·스핑크스) | 8개 파일 |
| G3 | 용기 4장(아킬레우스·테세우스·아르테미스·아탈란테) | 8개 파일 |
| G4 | 지혜 4장(아테나·헤르메스·오르페우스·프로메테우스) + 문항 80개 마무리 | 8개 파일 |

G1이 끝나면 아이패드로 한 번 보여 준다. 제우스와 포세이돈이 기존 카드와 붙었을 때 너무 세지 않은지 여기서 판단한다. 신이 영웅보다 항상 이기면 재미가 없으므로, 필요하면 신들의 HP를 10씩 내린다.

## 9. 다음 후보 (이번 범위 밖)

아프로디테, 헤라, 아레스, 헤파이스토스, 데메테르, 이카로스, 판도라, 이아손, 오이디푸스, 키마이라, 페가수스, 세이렌, 스킬라, 카론.

이 중 이카로스와 판도라는 교훈이 뚜렷해 오디오 에피소드로 먼저 만들 값어치가 있다. 새 에피소드가 생기면 3절의 `unlockAll`을 그 에피소드로 바꾸는 정리도 함께 한다.
