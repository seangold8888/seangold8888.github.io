# 카드 확장 설계서 — 동양 12장 (삼국지 · 서유기)

작성 2026-09-08 · 기획 클로드 · 구현 코덱스
기준: `cards.json` v1, 24장 · 엔진 `js/engine.js` · 기존 규약 `DESIGN.md`

> **C3 구현 메모 (2026-09-09):** 이 설계는 그리스 16장 확장 뒤에 구현됐다. 따라서 실제 기준은 40장이며, 명단 12장 중 손오공은 기존 카드 수정이라 신규 객체·원화는 11장이다. 최종 컬렉션은 **51장(용기 13 / 지혜 13 / 마법 12 / 괴물 13)**이다. 균형 숫자를 맞추려고 설계에 없는 열세 번째 카드를 임의로 만들지 않았다. 구현·검수 결과는 `EAST-C3-REVIEW.md`를 따른다.

## 0. 한 줄

카드를 24장에서 36장으로 늘린다. 삼국지 장수 6, 서유기 인물 6. 해금은 **오디오 이야기 대신 게임 클리어**로도 열리게 확장한다.

## 1. 확장 전 반드시 알 것

### 1-1. 지금 해금은 오디오에 묶여 있다

`isUnlocked`(`js/app.js:124`)는 `localStorage["story_done_" + card.unlock]`만 본다. 삼국지 장수·서유기 요괴에게는 `/story/` 오디오 에피소드가 없다. **해금 규칙을 확장하지 않으면 새 카드는 영원히 잠긴다.** 5절이 이 문제를 푼다.

예외 하나. `sunwukong` 이야기는 이미 있다(`app.js` `STORY_NAMES`). 그래서 손오공만 기존 방식으로 열린다.

### 1-2. 손오공 카드는 이미 있고, 막혀 있다

`cards.json`의 `sunwukong`은 `v1: false`다. 이유는 능력 두 개가 v2 전용 코드(`v2_double_switch`, `v2_summon_clone`)라 엔진이 실행하지 못하기 때문이다. **새로 그릴 필요가 없다.** 능력만 v1 코드로 바꾸면 그날 바로 대전에 나온다. 이번 확장에서 가장 싼 한 장이다.

같은 이유로 막힌 카드가 넷 더 있다. 아서왕, 브레멘 음악대, 과자집 마녀, 콩나무 거인. 12장을 새로 만들기 전에 이 다섯 장을 먼저 살리는 것이 순서다(10절 C1).

### 1-3. 카드 한 장 추가는 파일 12곳을 건드린다

`cards.json` 두 곳, 그림 2장, 그림 해시 매니페스트, 크롭 좌표표, 프롬프트 문서 두 곳, 서비스워커 목록과 캐시 버전, 테스트 상수 3곳, 필살기 퀴즈. 상세는 8절. **테스트가 "정확히 24장"을 단언하므로 숫자를 안 고치면 전부 실패한다.**

### 1-4. 타입 균형

지금 용기 6, 지혜 6, 마법 6, 괴물 6으로 정확히 맞다. 약점 삼각형이 여기에 걸려 있으니 확장도 균형을 지킨다. 아래 배치로 12장을 더하면 **9 / 9 / 9 / 9**가 된다.

| 타입 | 지금 | 삼국지 | 서유기 | 합 |
|---|---|---|---|---|
| 용기 ⚔️ | 6 | 관우 · 장비 · 조운 | — | 9 |
| 지혜 📘 | 6 | 제갈량 · 조조 · 사마의 | — | 9 |
| 마법 ✨ | 6 | — | 손오공 · 나타 · 이랑진군 | 9 |
| 괴물 🌑 | 6 | — | 우마왕 · 홍해아 · 백골정 | 9 |

### 1-5. 모험 상자의 나머지 캐릭터

산리오 카트의 캐릭터는 **넣지 않는다.** 남의 회사 캐릭터이고, 이 사이트는 로그인 없이 열리는 공개 주소다. 카드로 새로 그려 올리는 것은 지금까지의 사용 범위보다 노출이 커진다.

넣을 수 있는 것은 우리가 만든 것뿐이다. 공주 옷장의 오리지널 공주, 오디세이 인물(이미 오디세우스·폴리페모스 있음), 그리고 원한다면 제이와 태오 본인 카드. 이번 12장 다음 순서로 미룬다.

## 2. 카드 12장

모든 HP와 피해는 10의 배수다(`DESIGN.md:102`). `fx`는 **엔진이 이미 구현한 코드만** 쓴다. 공격은 `engine.js:39`의 목록, 패시브는 `DESIGN.md:66-79`의 목록.

### 2-1. 삼국지 6장

| id | 이름 | 타입 | ⭐ | HP | 패시브(fx) | 기술 |
|---|---|---|---|---|---|---|
| `guanyu` | 관우 | 용기 | 3 | 90 | 청룡의 위엄 · `reduce_dmg_10` | 언월 베기 1★/20 · 청룡일섬 3★/50 |
| `zhangfei` | 장비 | 용기 | 2 | 100 | 불붙는 투지 · `boost_20_below_half` | 장팔사모 2★/30 · 장판교 호통 2★/0 `skip_next_enemy` |
| `zhaoyun` | 조운 | 용기 | 3 | 70 | 단기필마 · `coin_evade` | 칠진칠출 1★/10 `dmg_stack_10` · 아두 구출 2★/0 `heal_40` |
| `zhugeliang` | 제갈량 | 지혜 | 3 | 60 | 팔진도 · `first_hit_zero` | 동남풍 1★/0 `gain_star_1` · 화공 3★/50 |
| `caocao` | 조조 | 지혜 | 2 | 70 | 난세의 셈 · `reduce_dmg_10` | 둔전 1★/0 `steal_star_1` · 관도 대공세 3★/50 |
| `simayi` | 사마의 | 지혜 | 2 | 70 | 기다리는 자 · `boost_20_below_half` | 인내 1★/10 `weaken_next_20` · 공성계 2★/20 `coin_skip_next_enemy` · 낙양 진군 3★/40 |

### 2-2. 서유기 6장

| id | 이름 | 타입 | ⭐ | HP | 패시브(fx) | 기술 |
|---|---|---|---|---|---|---|
| `sunwukong` | 손오공 | 마법 | 3 | 90 | 칠십이변 · `coin_evade` | 여의봉 연타 1★/10 `dmg_stack_10` · 근두운 급습 2★/30 · 여의봉 크게! 3★/50 |
| `nezha` | 나타 | 마법 | 2 | 60 | 연꽃의 몸 · `revive_half_once` | 건곤권 1★/20 · 풍화륜 돌진 3★/50 |
| `erlangshen` | 이랑진군 | 마법 | 3 | 80 | 요괴 사냥꾼 · `reduce_dmg_20_monster` | 효천견 1★/10 `weaken_next_20` · 천안 간파 2★/20 `skip_next_enemy` · 삼첨양인도 3★/40 |
| `wumawang` | 우마왕 | 괴물 | 3 | 120 | 무쇠 가죽 · `reduce_dmg_10` | 혼철곤 2★/40 · 소 돌진 4★/60 |
| `honghaier` | 홍해아 | 괴물 | 2 | 50 | 꺼지지 않는 불 · `boost_20_below_half` | 불수레 1★/20 · 삼매진화 3★/50 |
| `baigujing` | 백골정 | 괴물 | 2 | 40 | 세 번의 변신 · `coin_evade` | 거짓 미소 1★/0 `steal_star_1` · 백골 손톱 2★/30 `dmg_stack_10` |

**손오공은 신규가 아니라 수정이다.** `cards.json`의 기존 `sunwukong`에서 `passive.fx`를 `v2_double_switch` → `coin_evade`로, 「분신술」을 위 표의 v1 기술 둘로 교체하고, `v1: false` 줄을 지운다. 그림·이름·타입·HP·희귀도는 그대로 둔다.

**회피 교착 안전장치:** 실제 C3 구현 시 `coin_evade` 카드가 네 장이 되어 서로 만날 수 있다. 동전 앞면으로 한 번 피한 뒤 다음 적대 기술은 동전 없이 확정 명중시켜, 회피끼리 영원히 피해 다니는 판을 막는다.

### 2-3. 별 3종 산출 (`DESIGN.md:260-266` 규칙 적용 결과)

| id | ⚔ 공격 | 🛡 방어 | ✨ 지혜 |
|---|---|---|---|
| guanyu | 4 | 5 | 1 |
| zhangfei | 3 | 4 | 2 |
| zhaoyun | 2 | 4 | 4 |
| zhugeliang | 4 | 3 | 3 |
| caocao | 4 | 4 | 3 |
| simayi | 4 | 3 | 4 |
| sunwukong | 5 | 4 | 4 |
| nezha | 4 | 3 | 2 |
| erlangshen | 3 | 5 | 4 |
| wumawang | 5 | 5 | 1 |
| honghaier | 5 | 2 | 1 |
| baigujing | 3 | 2 | 4 |

구현 전에 이 표를 다시 계산해 검산할 것. 규칙과 어긋나면 규칙이 옳다.

### 2-4. JSON 예시 2장 (그대로 붙여 쓸 수 있음)

```json
    {
      "id": "guanyu",
      "name": "관우",
      "emoji": "🗡️",
      "type": "brave",
      "rarity": 3,
      "summonCost": 4,
      "hp": 90,
      "passive": {
        "name": "청룡의 위엄",
        "desc": "받는 피해가 10 줄어요",
        "fx": "reduce_dmg_10"
      },
      "attacks": [
        {
          "name": "언월 베기",
          "cost": 1,
          "dmg": 20,
          "fx": null,
          "desc": "",
          "vfx": { "kind": "strike", "emoji": "🗡️" }
        },
        {
          "name": "청룡일섬",
          "cost": 3,
          "dmg": 50,
          "fx": null,
          "desc": "",
          "vfx": { "kind": "strike", "emoji": "🐉", "big": true }
        }
      ],
      "unlock": "game:sanguo/hulao",
      "art": "art/guanyu.png",
      "stats": { "attack": 4, "defense": 5, "spirit": 1 }
    },
    {
      "id": "baigujing",
      "name": "백골정",
      "emoji": "🌫️",
      "type": "monster",
      "rarity": 2,
      "summonCost": 2,
      "hp": 40,
      "passive": {
        "name": "세 번의 변신",
        "desc": "공격받을 때 동전 앞면이면 다른 모습으로 피해요",
        "fx": "coin_evade"
      },
      "attacks": [
        {
          "name": "거짓 미소",
          "cost": 1,
          "dmg": 0,
          "fx": "steal_star_1",
          "desc": "상대의 별사탕을 하나 가져와요",
          "vfx": { "kind": "debuff", "emoji": "🌫️" }
        },
        {
          "name": "백골 손톱",
          "cost": 2,
          "dmg": 30,
          "fx": "dmg_stack_10",
          "desc": "쓸 때마다 피해가 10씩 늘어요",
          "vfx": { "kind": "strike", "emoji": "🤍" }
        }
      ],
      "unlock": "game:sanguo/baihuling",
      "art": "art/baigujing.png",
      "stats": { "attack": 3, "defense": 2, "spirit": 4 }
    },
```

## 3. 해금 규칙 확장

지금은 `unlock`이 이야기 id 하나뿐이다. 여기에 **게임 클리어** 경로를 더한다. 아이가 삼국지에서 관우로 호로관을 이기면 관우 카드가 열린다. 게임끼리 이어지는 것이 이 확장의 진짜 재미다.

### 3-1. 규약

`unlock` 값이 `"game:"`으로 시작하면 게임 클리어 기록을 본다. 나머지는 지금과 똑같이 동작한다.

| `unlock` 값 | 검사 대상 |
|---|---|
| `null` | 항상 열림 (기본 지급) |
| `"cinderella"` | `localStorage["story_done_cinderella"] === "1"` (기존) |
| `"game:sanguo/hulao"` | `localStorage["sanguo_clear_hulao"] === "1"` (신규) |

### 3-2. 코드 변경

`js/app.js:124` `isUnlocked`를 확장한다.

```js
  function isGameDone(token) {
    const slash = token.indexOf("/");
    if (slash < 0) return false;
    const game = token.slice(0, slash), stage = token.slice(slash + 1);
    if (game !== "sanguo") return false;
    try { return localStorage.getItem("sanguo_clear_" + stage) === "1"; } catch (e) { return false; }
  }

  function isUnlocked(card) {
    if (!card.unlock) return true;
    if (card.unlock.indexOf("game:") === 0) return isGameDone(card.unlock.slice(5));
    return isStoryDone(card.unlock);
  }
```

`getUnlockSnapshot`(`app.js:139`)은 `isUnlocked`를 그대로 부르므로 손댈 필요가 없다.

잠긴 카드 안내 문구(`app.js:285`)는 이야기 이름을 찾는다. `STORY_NAMES`에 게임 토큰용 이름을 같은 표에 넣는다.

```js
    "game:sanguo/hulao": "삼국지 · 호로관 전투",
    "game:sanguo/baihuling": "서유기 · 백호령",
```

문구도 갈라야 한다. 이야기면 "…를 끝까지 들으면 만날 수 있어!", 게임이면 **"「호로관 전투」를 이기면 만날 수 있어!"**.

### 3-3. 삼국지 쪽이 기록을 남겨야 한다

`site/sanguo`가 승리 시 `localStorage["sanguo_clear_" + stageKey] = "1"`을 쓰지 않으면 위 코드는 영원히 false다. 승리 처리부(`src/ui/result.js` 또는 `sideScroller.js`의 종료 경로)에 한 줄 추가한다. 같은 도메인이라 경로가 달라도 localStorage는 공유된다.

**이 한 줄이 이번 확장 전체의 전제 조건이다. 여기부터 한다.**

### 3-4. 카드별 해금 대응

| 카드 | `unlock` |
|---|---|
| guanyu | `game:sanguo/hulao` |
| zhangfei | `game:sanguo/changban` |
| zhaoyun | `game:sanguo/changban` |
| zhugeliang | `game:sanguo/chushi` |
| caocao | `game:sanguo/guandu` |
| simayi | `game:sanguo/chushi` |
| sunwukong | `sunwukong` (기존 오디오 유지) |
| nezha | `game:sanguo/heavenpalace` |
| erlangshen | `game:sanguo/heavenpalace` |
| wumawang | `game:sanguo/flamemountain` |
| honghaier | `game:sanguo/huoyundong` |
| baigujing | `game:sanguo/baihuling` |

`huoyundong`과 `baihuling`은 `DESIGN-XIYOU-EXPANSION.md`가 만드는 신규 전장이다. 그 전장이 나오기 전까지 두 카드는 잠긴 채 컬렉션에만 보인다. 정상 동작이다.

## 4. 필살기 퀴즈

`🌟 별빛 이야기`는 카드마다 3지선다 이해 문제를 맞혀야 열린다(`js/story-gates.js`). **문제가 없는 카드는 필살기를 영영 못 쓴다.** 12장 전부 5문항씩, 총 60문항이 필요하다.

출제 원본은 삼국지 게임이 이미 가지고 있다. 각 전장 데이터의 `real`(실제 역사), `fiction`(소설이 바꾼 것), `lesson`(교훈) 세 문장이다. 오디오를 새로 만들 필요가 없다.

`cardStories`(`story-gates.js:5`)에 게임 카드용 항목을 더할 때, 값은 `unlock`과 같은 토큰을 쓴다.

출제 예시 두 문항.

```js
    question("guanyu_1", "guanyu",
      "호로관에서 관우가 화웅을 벤 이야기는 어디에서 왔을까?",
      [{ id: "a", text: "정사에 그대로 적혀 있어요" },
       { id: "b", text: "소설이 손견의 공을 관우에게 옮긴 거예요" },
       { id: "c", text: "관우가 직접 쓴 일기예요" }],
      "b"),
    question("baigujing_1", "baigujing",
      "백골정은 삼장에게 몇 번 모습을 바꿔 다가왔을까?",
      [{ id: "a", text: "한 번" }, { id: "b", text: "세 번" }, { id: "c", text: "열 번" }],
      "b"),
```

문항 규칙은 기존과 같다. 존댓말, 오답도 그럴듯하게, 답이 지문 안에 그대로 노출되지 않게.

## 5. 그림

카드당 **PNG와 WEBP 두 장**, 정확히 1024×1536, RGB. 파일 이름은 카드 id 그대로(`guanyu.png`, `guanyu.webp`). 규격은 테스트가 강제한다(`tests/engine.test.js:425`).

손오공은 그림이 이미 있으므로 **11장 × 2 = 22개 파일**이 필요하다.

삼국지 6명은 `site/sanguo/art/side-scroller/`에 전투 시트가 이미 있다. 얼굴·갑옷 색·무기를 그 시트에서 가져와 같은 인물로 보이게 한다. 서유기 5명은 `DESIGN-XIYOU-EXPANSION.md`의 원화와 같은 인물이어야 한다.

미술 지시는 `ART_DIRECTION.md`의 「별빛 서사화」 톤을 따른다. 카드 그림에는 **글자·숫자·테두리·별을 그리지 않는다.** 전부 HTML 레이어가 그린다(`DESIGN.md:92`).

무서움 수위는 서유기 설계서와 같다. **백골정에 해골·뼈·빈 눈구멍 금지.** 흰 소복과 은빛 가면까지.

크롭 좌표는 `js/card-view.js:17`의 `ART_POSITION`과 `IMAGE_PROMPTS.md:45-70`의 표 **양쪽에** 넣는다. 둘의 id 집합이 다르면 테스트가 실패한다.

## 6. 손대야 하는 파일 전체 (카드 12장 기준)

| # | 파일 | 할 일 |
|---|---|---|
| 1 | `cards/cards.json:3` | `collection` 배열에 id 12개 추가 (24 → 36) |
| 2 | `cards/cards.json:161` | 카드 객체 11개 추가 + `sunwukong` 수정 |
| 3 | `cards/art/*.png` `*.webp` | 22개 파일 |
| 4 | `cards/tests/engine.test.js:1120-1121` | 파일 수 48 → 70, SHA-256 매니페스트 재계산 |
| 5 | `cards/js/card-view.js:17` | `ART_POSITION` 12개 추가 |
| 6 | `cards/IMAGE_PROMPTS.md` | 장면 프롬프트 12줄 + 크롭 표 12행 |
| 7 | `site/sw.js:443` | `CARD_ART_FILES`에 12개 추가 |
| 8 | `site/sw.js:4` | `CACHE_VERSION` v52 → v53 |
| 9 | `cards/tests/pwa.test.js:97-100` | 24 → 36 |
| 10 | `cards/tests/collection-compact.test.js:62-64` | 24 → 36 |
| 11 | `cards/js/story-gates.js:5` | `cardStories` 12개 + 문항 60개 |
| 12 | `cards/js/app.js:124`, `:4` | 해금 확장 + `STORY_NAMES` 항목 |
| 13 | `site/sanguo` 승리 처리부 | `sanguo_clear_<stage>` 기록 (3-3) |

`cards/index.html:20,193` 의 `?v=26` 캐시 버스터와 `sw.js:144-151`의 프리캐시 목록은 js·css를 실제로 고쳤을 때만 함께 올린다.

## 7. 완료 기준

1. 컬렉션이 36장으로 보이고, 타입별로 9장씩이다.
2. 삼국지 게임에서 호로관을 이긴 뒤 카드 게임을 열면 관우 카드가 잠금 해제된 상태다. 이기기 전에는 잠겨 있고, 안내 문구가 "「호로관 전투」를 이기면 만날 수 있어!"로 나온다.
3. 손오공이 "대전 준비 중"에서 벗어나 실제로 대전에 나온다.
4. 신규 12장 전부 대전 가능하고, 각각 필살기 퀴즈가 열린다.
5. 새 카드의 모든 기술이 실제로 작동한다. **효과 없는 버튼을 노출하지 않는다**(`DESIGN.md:78`).
6. 기존 24장의 능력치·해금·그림에 변화가 없다(손오공 제외).
7. 카드 그림 22개가 전부 1024×1536 RGB이고 png/webp 쌍이 맞는다.
8. `node --test cards/tests/` 전부 통과.
9. 한 판이 3분 안에 끝난다. 우마왕 120 HP와 백골정 40 HP가 같은 판에서 극단으로 벌어지지 않는지 실제로 붙여 본다.

## 8. 마일스톤

| M | 내용 | 새 그림 |
|---|---|---|
| C1 | 막힌 카드 5장 살리기(아서왕·브레멘·손오공·마녀·거인)의 v1 기술 보강 + 삼국지 승리 기록 한 줄 | 0장 |
| C2 | 해금 규칙 `game:` 확장 + 삼국지 6장 | 12개 파일 |
| C3 | 서유기 5장(손오공 제외) + 퀴즈 60문항 | 10개 파일 |
| C4 | 공주 옷장 오리지널 공주, 제이·태오 카드 | 별도 결정 |

C1은 그림이 한 장도 필요 없다. 데이터만 고치면 대전 가능한 카드가 19장에서 24장이 된다. 가장 싸고 효과가 크다.
