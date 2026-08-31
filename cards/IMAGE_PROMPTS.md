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
- `heracles.png`: 별밤 바위 언덕에서 사자 가죽 후드 망토와 어깨의 나무 몽둥이를 든 곱슬머리 영웅이 팔뚝을 자랑한다. 주황 머리·흰 토가·특정 영화 의상은 넣지 않는다.
- `honggildong.png`: 조선 기와지붕 위에 한쪽 무릎을 댄 파란 도포·검은 갓의 홍길동. 짧은 활과 반투명 속도 잔상 두 개, 따뜻한 마을 등불을 배치한다.
- `perseus.png`: 날개 달린 샌들로 달려드는 소년 영웅이 은빛 거울 방패에 별빛을 반사한다. 메두사·잘린 머리·방패 문자와 문양은 넣지 않는다.
- `threepigs.png`: 벽돌집 앞에서 어깨동무한 돼지 삼형제. 왼쪽은 지푸라기, 가운데는 나뭇가지, 오른쪽은 벽돌을 정확히 하나씩 든다.
- `arthur.png`: 살짝 큰 왕관을 쓴 소년왕이 숲속 바위에서 빛나는 검을 뽑는 순간. 검·바위에는 룬이나 글자를 넣지 않는다.
- `tortoisehare.png`: 달빛 숲길의 무문자 결승 리본을 거북이가 마지막 한 걸음으로 통과하고, 멀리 토끼는 나무 아래 잠들어 있다.
- `bremen.png`: 당나귀·개·고양이·수탉이 살아 움직이는 세로 탑을 이루며 뿔피리·류트·심벌즈·목소리로 연주한다. 음표와 악보는 넣지 않는다.
- `pinocchio.png`: 따뜻한 목공방에서 완전히 옷을 입은 목각 이야기 인형이 날아든 참새를 보고 놀라는 순간. 초록 재킷·남색 바지·나뭇결을 사용하고 유명 애니메이션 의상 조합을 피한다.
- `sunwukong.png`: 붉은 망토와 황금 머리테의 원숭이 영웅이 근두운 위에서 붉은 여의봉을 별하늘로 늘린다. 인간형 뾰족머리·주황 도복·에너지파는 넣지 않는다.
- `genie.png`: 황동 램프에서 연보라~자주색 연기 꼬리로 솟은 청동빛 요정이 한 손의 손가락 세 개를 분명히 펼친다. 파란 피부와 검은 수염 조합은 피한다.
- `snowqueen.png`: 짧은 검은 머리 끝에 은빛이 감도는 여왕이 수정 왕관과 은백 망토를 입고 손끝에서 눈송이 나선을 만든다. 땋은 은발·하늘색 드레스는 넣지 않는다.
- `witch.png`: 쿠키 지붕 과자집 문에서 자주색 로브의 노년 마녀가 사탕 지팡이에 기대 꿀과자를 내민다. 초록 피부·이빨·아이·위협 장면은 넣지 않는다.
- `mermaid.png`: 검정에서 진초록으로 흐르는 머리와 은빛 비늘 꼬리의 인어가 달빛 수면 위로 떠오른다. 단정한 진초록 상의, 음표 없는 노래 직전의 표정.
- `wolf.png`: 보라색 할머니 잠옷과 둥근 안경을 쓴 늑대가 이불 속에서 두 앞발을 모으고 시치미를 뗀다. 입은 다물고 이빨은 보이지 않는다.
- `beanstalkgiant.png`: 구름성 앞의 둥근 거인이 한 손으로 졸린 눈을 비비고, 다른 주먹은 몸 옆에 편히 둔다. 아래에는 콩줄기 끝만 보인다.
- `medusa.png`: 짙은 초록 튜닉과 검은 망토의 소녀 메두사. 작은 뱀 머리카락은 리본처럼 장난스럽게 얽히며 배경 석상은 하나뿐이다.
- `midas.png`: 난감한 미다스 왕이 황금으로 변한 오른손과 정확히 절반만 금이 된 붉은 사과를 번갈아 바라본다.
- `tiger.png`: 조선 민화의 익살을 입체적인 별빛 서사화로 재해석한 호랑이. 떡 하나를 물고 초승달 아래 까치를 올려다보며 낙관·한자는 넣지 않는다.

## 카드 크롭

| id | object-position |
|---|---|
| heracles | `50% 40%` |
| honggildong | `50% 40%` |
| perseus | `50% 40%` |
| jack | `54% 35%` |
| threepigs | `50% 40%` |
| arthur | `50% 40%` |
| odysseus | `49% 45%` |
| cinderella | `54% 38%` |
| tortoisehare | `50% 40%` |
| redhood | `47% 45%` |
| bremen | `50% 40%` |
| pinocchio | `50% 40%` |
| sunwukong | `50% 40%` |
| fairygodmother | `53% 42%` |
| genie | `50% 40%` |
| snowqueen | `50% 40%` |
| witch | `50% 40%` |
| mermaid | `50% 40%` |
| polyphemus | `50% 25%` |
| wolf | `50% 40%` |
| beanstalkgiant | `50% 40%` |
| medusa | `50% 40%` |
| midas | `50% 40%` |
| tiger | `50% 40%` |

두 번째 묶음(요정 대모·빨간 모자·잭)은 첫 묶음(신데렐라·오디세우스·폴리페모스)을 스타일·조명·재질 참고 이미지로 사용했고, 인물과 구도는 복제하지 않도록 명시했다. 6단계 전 검수에서 신데렐라와 폴리페모스는 위 장면으로 새로 생성해 PNG·WebP를 모두 교체했다.

2026-08-30 확장에서는 Codex 내장 ImageGen으로 누락 18장을 카드별 1회 생성하고, 아기돼지 삼형제는 소품 배분만 정밀 편집했다. 피노키오의 코 길이·참새 착지 편집은 출력 안전 필터가 반복 차단해, 동일 화풍의 안전한 목각 인형+비행 중 참새 원화를 최종 선택했다. 전체 24장은 PNG·WebP 1024×1536 RGB이며 실제 5:4 카드 프레임에서 위 크롭 값으로 검수했다.
