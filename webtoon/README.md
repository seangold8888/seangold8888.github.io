# 오늘도 우리 집 — 가족 에피소드 웹툰

재이네 여섯 식구(재이 · 할머니 · 엄마 · 아빠 · 할아버지 · 태오)의 소소한 하루를 담은 세로 스크롤 웹툰이다.
한 화마다 웃음 포인트, 감동 포인트, "오늘의 한 줄"(교훈), 가족이 함께 나눌 질문이 하나씩 있다.

주소: `/webtoon/` (목록), `/webtoon/#ep=3` (3화 바로 읽기). 모험 상자 허브의 "티켓 없이 바로!"에 입구가 있다.

## 파일

| 파일 | 내용 |
|---|---|
| `art.js` | 그림 엔진. 아이 그림 얼굴에 SVG 몸·몸짓·표정 기호를 붙이고, 소품과 배경을 그린다. |
| `faces/*.webp` | 아이가 그린 얼굴 여섯 장(오려 낸 원본 그대로). |
| `words.js` | 우리 집 말 모음. 태오어 사전(`TAEO_WORDS`), 태오가 매일 하는 말(`TAEO_SAYINGS`), 재이가 요즘 하는 말(`JAEI_SAYINGS`), 재이가 아기 때 한 말(`JAEI_WORDS`). 목록 화면과 매 화 끝 ‘오늘의 태오어’에 나온다. |
| `episodes.js` | 등장인물 소개와 에피소드 대본(컷별 배경·인물·말풍선·효과음·내레이션). |
| `app.js` | 목록 ↔ 읽기 화면, 읽음·좋아요 기록(이 기기에만), 말풍선이 컷 밖으로 나가지 않게 맞추기. |
| `style.css` | 화면 모양. 말풍선 종류(보통·외침·생각·속삭임)와 효과음 글자. |
| `cover.webp` | 허브 입구 그림. 목록 맨 위 가족 그림을 캡처한 것. |
| `planning/오늘도우리집_기획표.xlsx` | 엑셀 기획표. 등장인물, 에피소드, 컷 대본, 다음 화 아이디어 시트. |

## 캐릭터 디자인

**얼굴은 아이가 연필로 그린 가족 얼굴 그림을 고치지 않고 그대로 쓴다.** 그게 이 웹툰의 매력이다.
사진에서 얼굴만 오려 종이와 배경을 투명하게 한 그림이 `faces/*.webp`이다(연필선 명암은 그대로).
원본 사진(방·손 등이 찍힌 것)은 저장소에 넣지 않았다.

- 얼굴 그림 위에 눈·입을 새로 그리거나 덧칠하지 않는다. 몸을 좌우로 뒤집어도 얼굴 그림은 뒤집지 않는다.
- 표정(`e`)은 얼굴 둘레의 만화 기호로만 보탠다: 눈물, 땀방울, 볼터치, 하트, 화난 표시, 느낌표, Z 등.
- 몸·팔·옷은 SVG로 그리고 연필 느낌으로 선을 살짝 흔드는 필터(`wt-pencil`)를 건다.
  옷 색은 모험 상자의 가족 봉제인형(`math/assets/jaei-family-v4.webp`)과 맞췄다.
- 목이 붙는 점, 얼굴 높이, 눈·입 위치(표정 기호 자리)는 `art.js`의 `FACES`에 있다.

| 인물 | 그림 속 특징 | 옷 |
|---|---|---|
| 재이 | 머리띠, 연한 동그라미 올림머리, 옆으로 묶은 머리 | 분홍 원피스 |
| 할머니 | 뽀글뽀글 파마, 눈가 주름 | 연보라 꽃무늬 블라우스 |
| 엄마 | 정수리 똥머리, 뾰족한 코 | 연분홍 원피스 |
| 아빠 | 납작하게 칠한 짧은 머리, 귀 | 회색 셔츠 |
| 할아버지 | 훤한 정수리와 옆머리, 짙은 눈썹, 눈가 주름 | 갈색 카디건 |
| 태오 | 까맣게 칠한 짧은 머리, 큰 귀 | 파란 옷, 태권도복은 파란띠에 초록 줄 |

## 가족 말 추가하기

`words.js`의 알맞은 목록 맨 아래에 한 줄을 더한다. 태오어 사전과 재이 말은 `say`(한 말), `real`(원래 말), `what`(설명), 입버릇(`TAEO_SAYINGS`, `JAEI_SAYINGS`)은 `say`, `when`.

```js
{ say: "쓰구미", real: "익스큐즈미", what: "실례합니다 (영어)" },
```

더한 뒤 `index.html`과 `sw.js`의 `words.js?v=` 숫자를 함께 올린다.

## 새 화 추가하기

`episodes.js`의 `EPISODES` 끝에 한 화를 더한다.

```js
{
  id: 6,
  title: "태권도 승급 심사",
  summary: "목록에 보일 두세 줄 소개",
  lesson: "오늘의 한 줄",
  talk: "가족과 이야기해 볼 질문",
  cover: 0,            // 목록 썸네일로 쓸 컷 번호(0부터)
  panels: [
    {
      h: 330, bg: "living",                         // 컷 높이(폭 400 기준), 배경
      chars: [C("taeo", 120, "determined", "kick", { o: "dobok" })],
      fp: [["sparkle", 300, 80, {}]],               // 인물 앞에 그릴 소품 (뒤는 bp)
      n: "위쪽 내레이션", n2: "아래쪽 내레이션",
      b: [B("얍!", 120, 60, "b", { k: "shout" })],  // 말풍선: 글, x, y, 꼬리 방향
      sfx: [FX("쿵!", 300, 200, { rot: 8, c: "#3b6fd6" })],
    },
  ],
},
```

- 인물 `C(이름, x, 표정, 몸짓, 추가)`: 이름은 `jaei halmeoni eomma appa harabeoji taeo`.
  추가 옵션은 `o`(옷: `dobok pajama work apron pink sick`), `s`(크기), `y`(발 위치), `f: -1`(좌우 반전), `rot: -90`(눕기).
- 가슴 위 클로즈업은 `bust(이름, x, 얼굴 y, 크기, 표정, 몸짓)`.
- 표정: `smile happy laugh proud eating sad cry teary surprised shock angry sly love worried guilty sleepy sick determined blank shy wink blow`.
- 몸짓: `stand wave up cheer point hold hip hug cover eyes think scratch cheeks nose give carry kick fist run hands`.
- 배경: `kitchen living living-night halmae bedroom bedroom-night entrance entrance:evening street memory`,
  효과 배경 `burst:색 sparkle:색 speed:색 gloom plain:색`.
- 소품: `art.js`의 `PROPS` 목록(딸기 접시, 소파, 이불, 침대, 그림, 쿠폰, 공룡, 프라이팬, 죽 그릇, 휴대폰, 영상통화 화면 등).

새 화를 넣으면 `sw.js`의 `episodes.js?v=` 숫자와 `index.html`의 같은 숫자를 함께 올리고, 허브 입구 설명의 화 수를 고친다.
