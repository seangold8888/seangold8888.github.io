# 이야기 카드 배틀 — 이미지 생성 프롬프트 기록

생성 방식: Codex 내장 `imagegen` 스킬. 생성 원본은 PNG로 보존하고, 배포 시 같은 파일명의 WebP를 우선 사용한다.

## 공통 최종 프롬프트

```text
Use case: stylized-concept
Asset type: premium collectible card-game character illustration, vertical portrait art only
Style/medium: original premium cinematic storybook fantasy painting; richly layered hand-painted textures, luminous jewel tones, sculpted painterly light, animated-feature concept-art finish
Composition/framing: vertical 2:3 portrait; decisive story moment; face, action, and signature prop readable at small card size; strong foreground/middle/background depth; no card border or UI
Lighting/mood: deep indigo night contrasted with warm amber or champagne-gold magic; dramatic but family-friendly
Constraints: original public-domain interpretation; character and scene art only; no text, numbers, icons, logos, watermark, card frame, gore, or frightening body horror; age-7 appropriate; do not imitate an existing film, artist, game, or trading-card brand
```

## 카드별 장면

- `cinderella.png`: 자정 직전 달빛 정원길을 달리는 신데렐라. 짙은 밤색의 자연스러운 웨이브 머리와 초등 저학년이 편안하게 느낄 앳되고 친근한 표정, 진주빛 은색에서 새벽 로즈·블러시·모브로 이어지는 단정한 겹드레스. 한쪽은 유리 구두, 다른 쪽은 맨발이며 멀리 종탑 실루엣과 호박마차가 빛난다. 계단·시계판·숫자는 넣지 않는다.
- `fairygodmother.png`: 따뜻하고 영리한 노년의 요정이 별 지팡이를 크게 휘둘러 호박을 달빛 마차로 변신시킨다. 연보라·크림색 여행 로브와 S자 금빛 마법 궤적.
- `odysseus.png`: 키클롭스 동굴에서 등잔을 들고 먼지 위 탈출 계획을 그리는 오디세우스. 양 떼가 지나가고 거인은 먼 실루엣으로만 보여 지혜가 주인공이 된다.
- `polyphemus.png`: 잔잔한 달밤의 동굴 입구에 책상다리로 앉은 순한 외눈 거인. 둥글고 호기심 어린 눈 하나, 이빨이 보이지 않는 다문 입으로 손바닥 위 양을 조심스럽게 관찰한다. 곁에는 편히 쉬는 양 떼와 작은 모닥불, 멀리 고요한 바다가 보인다. 번개·폭풍·무기·위협 포즈는 넣지 않는다.
- `redhood.png`: 달빛 숲길에서 황동 등불을 높이 든 영리한 빨간 두건 소녀. 바구니를 들고, 멀리 나무 뒤에는 친근한 늑대 눈 두 개만 보인다.
- `jack.png`: 구름 위 거대한 콩나무를 오르며 황금 거위 깃털을 향해 손을 뻗는 잭. 허리 주머니의 마법 콩 세 알, 새벽빛 구름성과 강한 상승 동세.

## 카드 크롭

| id | object-position |
|---|---|
| cinderella | `54% 38%` |
| fairygodmother | `53% 42%` |
| odysseus | `49% 45%` |
| polyphemus | `50% 25%` |
| redhood | `47% 45%` |
| jack | `54% 35%` |

두 번째 묶음(요정 대모·빨간 모자·잭)은 첫 묶음(신데렐라·오디세우스·폴리페모스)을 스타일·조명·재질 참고 이미지로 사용했고, 인물과 구도는 복제하지 않도록 명시했다. 6단계 전 검수에서 신데렐라와 폴리페모스는 위 장면으로 새로 생성해 PNG·WebP를 모두 교체했다.
