# 재이의 귀여운 악마 모드 재윙

## 사용자 결정 (2026-09-13)

- 이름은 **재윙**. 재이 이름과 날개(wing)를 합친 이름이다.
- 첫 구현은 "재이의 괴물 친구"로 착하고 약한 카드(48.3%, 85장 중 41위, C등급)였다.
- 사용자 정정: **재윙은 쓰구미처럼 재밌고 강한 악당**이다.
- 사용자 정정(같은 날): **재윙은 재이 카드의 귀여운 악마 모드**. 천사와 악마처럼 재이와 짝을 이루는 장난꾸러기 버전이다. 별도 카드로 두며, 한 카드 안에서 변신하는 전투 규칙은 만들지 않았다.
- 사용자 지정 기술(같은 날): **코딱지, 구름사다리, 바이킹 그네 밀기**. 수치는 밸런스 검증값 그대로 두고 이름·연출만 바꿨다.
- 쓰구미 대마왕 카드·보스, 원정 이야기는 바꾸지 않는다. 재윙을 원정에 넣는 것은 별도 결정이다.
- 아이가 실제로 정한 생김새·말버릇·일화라고 주장하지 않는다. 가족 사실을 지어내지 않는다.

## 카드 (Claude 확정, 구현 완료)

- id jaewing, 물 속성 / 괴물 타입, 체력 120. stats 4/4/4 유지.
- 자동 능력 박쥐 날개 망토: 받는 피해 10 감소 (reduce_dmg_10).
- 코딱지 튕기기: 별사탕 1, 피해 20. 🤧 projectile, flick 소리(재이의 코딱지 날리기와 같은 재질, 재이 소리는 그대로).
- 구름사다리 매달리기: 별사탕 2, 피해 30 + 상대 다음 공격 피해 20 감소. 🪜 debuff, metal 소리(🪜는 기존 84장 미사용, audio 매핑 추가).
- 바이킹 그네 밀기: 별사탕 4, 피해 80. 🎢 burst big, air 소리(🎢 미사용, audio 매핑 추가).
- 실전 등급 C → **S**. 획득은 수학 S 규칙(누적 7일 + 70문제) + 기존 math/streak7 토큰.
- 퀴즈 5문항을 새 소개·능력·기술로 교체.

## 밸런스 근거 (family-balance.cjs와 같은 방식, 85장, 교착 0)

| 안 | 체력 | 자동 능력 | 기술 피해 | 재윙 | 가족 순서 |
|---|---|---|---|---|---|
| 기존 | 110 | 첫 공격 막기 | 20/30/70 | 48.3% 41위 | 통과 |
| A | 120 | 첫 공격 막기 | 20/30/80 | 54.7% 27위 | 태오<엄마 실패 |
| B | 120 | 첫 공격 막기 | 30/30/70 | 74.6% 8위 | 실패 |
| D | 110 | 첫 공격 막기 | 30/40/80 | 76.2% 5위 | 실패 |
| **E 채택** | 120 | 피해 10 감소 | 20/30/80 | **76.2% 6위** | **통과** |
| F | 130 | 첫 공격 막기 | 30/30/60(3별) | 80.1% 3위 | 실패 |

가족보다 세면 안 된다(재이 1위, 태오 2위, 가족 상위 4위). 대부분의 강한 안은 재윙이 태오를 많이 이겨 태오가 엄마 아래로 떨어졌다. E안만 재윙을 가족 바로 아래 최상위권에 두면서 가족 순서를 지킨다.

## 원화 교체 (Codex 작업)

기존 art/jaewing.png는 첫 시안인 흰 날개 동물이라 설정과 맞지 않았다. 2026-09-13 **재이 카드의 귀여운 악마 모드**로 교체했다.

- 같은 캐릭터: art/jaei.png의 재이와 얼굴형·머리 모양·키·그림체가 같아야 한다. 기존 재이 원화를 참고 이미지로 넣어 일관성을 맞춘다. 실제 아이 사진처럼 그리지 않는다(가족 카드와 같은 동화풍).
- 악마 모드 표시: 작은 빨간 뿔 두 개, 작은 박쥐 날개, 끝이 하트나 화살표 모양인 꼬리. 옷은 재이의 잠옷을 보라·빨강 악마 무늬로 바꾼 느낌.
- 표정과 자세: 한쪽 눈썹 올리고 약 올리는 웃음이나 메롱. 천사 재이와 대비되는 장난꾸러기 모습.
- 기술과 맞춘 배경: 해 질 녘 보라빛 하늘 아래 놀이터. 구름사다리에 한 손으로 매달리거나, 뒤로 크게 올라간 바이킹 그네를 밀려는 자세. 코딱지는 그림에 넣지 않는다.
- 무섭지 않게: 날카로운 이빨, 피, 불, 공포 분위기 금지. 5~8세가 보고 웃을 수 있게.
- 규격: 1024×1536 PNG + WebP(품질 88). art/jaewing.png와 art/jaewing.webp만 교체하고 다른 원화는 다시 만들지 않는다.
- 글자·숫자·프레임·워터마크 없음. 머리·뿔·날개·발 주변 여백 유지. 크롭이 어긋나면 card-view.js ART_POSITION과 IMAGE_PROMPTS.md 표를 함께 고친다.
- IMAGE_PROMPTS.md의 재윙 설명을 악마 모드로 고치고, 사용한 프롬프트 전문을 이 문서 끝에 덧붙인다.
- 원화 교체 뒤 카드 자산 ?v=60을 ?v=61로, CACHE_VERSION v101을 v102로, latest.html의 sw.js?v=101을 v102로 올리고 테스트 고정값을 맞춘다. 이전 원화 설명에 있던 "재이를 그리지 말 것" 조건은 폐기한다.

## 검증

node --test "cards/tests/*.test.js"

node cards/tools/family-balance.cjs

node cards/tools/jaewing-smoke.cjs

node cards/tools/tier-unlocks-smoke.cjs

node cards/tools/campaign-ending-smoke.cjs

## 원화 교체 기록 (2026-09-13)

- 내장 image_gen으로 제작. art/jaei.png를 읽어 표시한 원화를 정체성·그림체 참고로 사용했다. 원본 재이 그림은 변경하지 않았다.
- 저장: art/jaewing.png (1024×1536), art/jaewing.webp (같은 크기, 품질 88).
- 작은 빨간 뿔, 박쥐 날개, 하트 꼬리, 보라색 악마 무늬 잠옷과 구름사다리·바이킹 그네를 확인했다. 기존 크롭 50% 40%는 화면 검증 후 유지한다.
- 태오 띠 수정이 이미 모듈 v61 / 서비스 워커 v102를 사용하므로 실제 반영 버전은 모듈 v62 / 서비스 워커 v105이다. 위 작업 지시의 v60→61은 당시 기준이다.
- 카드 수치·기술·퀴즈·소리는 변경하지 않았다. push하지 않는다.

### 실제 사용 프롬프트 전문

검증: 카드 테스트 321/321 통과. 가족 균형은 재이 85.64%, 태오 80.12%, 엄마 79.36%, 아빠 78.69%로 상위 4위, 재윙 76.2% 6위, 교착 0건. 재윙/등급 해금/원정 결말 브라우저 스모크 모두 3개 화면 크기와 오프라인 검증 통과. 실제 상세 화면에서 얼굴·뿔·날개·꼬리와 새 원화를 확인했고 크롭은 유지했다. cards.json, audio.js, story-gates.js, 재이·태오 원화는 작업 전후 SHA-256이 같다.

스모크 캡처는 원화 decode 후 두 프레임을 기다리도록 보강했다. 네트워크 로딩 완료만으로 그림이 그려졌다고 판단하지 않도록, 실제 캡처도 따로 확인했다.

Use case: identity-preserve.
Asset type: polished children's fantasy collectible card portrait, 1024x1536 PNG.
Input image: the most recent image, Jaei in pink pajamas, is the identity and painting style reference. Create her cute mischievous devil-mode alter ego Jaewing. Preserve this EXACT girl's face shape, large brown eyes, nose, cheeks, long straight brown hair with wispy bangs, apparent age, height and childlike body proportions. Keep the same richly painted soft storybook illustration style, NOT a real child photo.
Scene: a playground at sunset with a gentle violet sky, recognizable overhead monkey bars and a playground Viking-boat swing behind her. She hangs playfully from one monkey-bar rung with one hand, full body visible, other hand playfully on her hip, giving a cheeky little smile with one eyebrow raised. Clear natural grip and anatomy. Keep face dominant and unobstructed.
Costume: her same long-sleeved button-up pajama jacket and full-length pajama trousers, now purple with red cute little devil/bat motifs, modest loose child pajamas. Two small rounded red horns above her bangs, a pair of small purple bat wings at her back, a curled red tail with heart-shaped tip. Comfortable cute slippers.
Mood: funny, sweet and impish, friendly for children ages 5-8, warm sunset rim light, violet/red accents. No scary teeth, fangs, blood, fire, horror, weapons, boogers, extra characters, text, letters, numbers, logos, card border or watermark.
Composition: centered full-body vertical portrait with safe margins around head, both horns, wings, feet and tail. Preserve Jaei's recognizability and painterly detail; do not turn her into an animal monster.
