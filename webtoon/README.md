# 오늘도 우리 집 — 가족 에피소드 웹툰

재이네 여섯 식구(재이 · 할머니 · 엄마 · 아빠 · 할아버지 · 태오)의 소소한 하루를 담은 세로 스크롤 웹툰이다.
한 화마다 웃음 포인트, 감동 포인트, "오늘의 한 줄"(교훈), 가족이 함께 나눌 질문이 하나씩 있다.

주소: `/webtoon/` (목록), `/webtoon/#ep=3` (3화 바로 읽기). 모험 상자 허브의 "티켓 없이 바로!"에 입구가 있다.

## 파일

| 파일 | 내용 |
|---|---|
| `art.js` | 그림 엔진. 캐릭터 6명, 표정 20여 종, 몸짓, 소품, 배경을 전부 SVG로 그린다. 그림 파일이 없어 오프라인에서도 보인다. |
| `episodes.js` | 등장인물 소개와 에피소드 대본(컷별 배경·인물·말풍선·효과음·내레이션). |
| `app.js` | 목록 ↔ 읽기 화면, 읽음·좋아요 기록(이 기기에만), 말풍선이 컷 밖으로 나가지 않게 맞추기. |
| `style.css` | 화면 모양. 말풍선 종류(보통·외침·생각·속삭임)와 효과음 글자. |
| `cover.webp` | 허브 입구 그림. 목록 맨 위 가족 그림을 캡처한 것. |
| `planning/오늘도우리집_기획표.xlsx` | 엑셀 기획표. 등장인물, 에피소드, 컷 대본, 다음 화 아이디어 시트. |

## 캐릭터 디자인

얼굴과 머리 모양은 아이가 그린 가족 얼굴 그림을 따랐다. 원본 사진은 저장소에 넣지 않는다.

- 재이: 머리띠, 정수리 동그란 올림머리, 옆으로 묶은 머리. 분홍 원피스.
- 할머니: 뽀글뽀글 파마머리, 눈가 주름. 연보라 꽃무늬 블라우스.
- 엄마: 정수리 똥머리. 연분홍 원피스.
- 아빠: 짧고 단정한 머리. 회색 셔츠.
- 할아버지: 훤한 정수리와 옆머리, 짙은 눈썹, 눈가 주름. 갈색 카디건.
- 태오: 짧은 머리에 삐죽 솟은 한 가닥. 파란 옷, 태권도복은 파란띠에 초록 줄.

옷 색은 모험 상자의 가족 봉제인형(`math/assets/jaei-family-v4.webp`)과 맞췄다.

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
