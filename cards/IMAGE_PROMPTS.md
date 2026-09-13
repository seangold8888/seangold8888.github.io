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

- `zeus.png`: 은발의 온화한 하늘 왕이 남색·상아색 로브를 입고 금빛 번개를 다스린다. 몸을 충분히 가리고 슈퍼히어로·특정 영화 디자인은 배제.
- `poseidon.png`: 청록색 로브를 입은 바다 왕이 세 갈래 청동 삼지창을 잡고 거대한 청록 파도를 이끈다. 상체 노출·물고기 꼬리 없이 또렷한 얼굴과 창끝.
- `hades.png`: 차분한 눈빛과 자주색 로브의 저승 왕이 투명한 빛으로 흩어지는 청동 투구를 든다. 고요한 강과 희미한 빛, 해골·뼈·불꽃 머리·공포 표정 없음.
- `apollo.png`: 젊고 밝은 태양신이 호박색 튜닉과 망토를 입고 황금 리라를 연주한다. 어깨 옆에 별개의 활을 두고, 따뜻한 새벽빛으로 얼굴과 악기를 강조.

- `minotaur.png`: 차분한 황소 얼굴의 듬직한 미궁 수호자가 몸을 가린 청동 갑옷과 남색 천을 입고, 가슴 높이의 금빛 실타래와 열린 손으로 길을 안내한다. 포효·돌진·도끼·붉은 눈·코고리·노출 근육 없음.
- `cerberus.png`: 몸 하나·머리 정확히 셋·다리 넷인 큰 수호견. 세 얼굴은 경계·호기심·졸림으로 구분되고 입을 다물어 이빨이 없다. 보랏빛 강과 밀폐형 금빛 등불의 저승문, 불꽃·사슬·해골 없음.
- `hydra.png`: 한 몸에서 이어진 목과 머리 정확히 아홉 개의 청록 물뱀. 중앙 하나와 양쪽 네 개씩을 부채꼴로 펼치고 모든 입은 다문다. 잘린 목·재생 상처·피·독 침·전투 장면 없음.
- `sphinx.png`: 친근하고 영리한 젊은 여성 얼굴, 황금 사자 몸, 보랏빛 독수리 날개가 한 존재로 이어진 그리스 스핑크스. 사자 앞발로 자갈 정확히 세 개를 배열한다. 사람 손·노출 몸·이집트 머리장식·문자 없음.
- `achilles.png`: 붉은 튜닉과 청동 갑옷의 젊은 영웅이 둥근 방패와 긴 창을 들고 별빛 해안 절벽에 선다. 상처나 화살 없이 한쪽 샌들의 발뒤꿈치만 은은한 금빛으로 강조한다.
- `theseus.png`: 청록 튜닉의 젊은 영웅이 달빛 미궁 출구에서 붉은 금빛 실타래 공을 높이 들고, 다른 손의 짧은 청동 검은 아래로 향한다. 괴물·전투 장면 없음.
- `artemis.png`: 짙은 초록 튜닉과 은빛 망토의 사냥 여신이 달빛 숲에서 은활과 화살을 느슨하게 들고 길을 지킨다. 활은 관객을 겨누지 않고 노출 복식·전투 장면 없음.
- `atalanta.png`: 황금색 튜닉과 자주색 바지의 젊은 달리기 영웅이 사냥 창을 몸과 나란히 들고 달빛 숲길을 질주한다. 길에는 황금 사과가 정확히 세 개 굴러간다.
- `athena.png`: 청록 옷과 청동 갑옷의 지혜 여신이 전략 돌을 살피고, 문양 없는 둥근 방패 위에는 올빼미가 앉아 있다. 창은 세워 들고 전투·메두사 얼굴 문양 없음.
- `hermes.png`: 하늘색 튜닉과 황금 망토의 젊은 전령이 구름다리를 가볍게 걷는다. 양쪽 신발의 날개, 두 뱀이 감긴 전령 지팡이, 닫힌 가죽 가방이 또렷하다.
- `orpheus.png`: 자주색 튜닉과 청록 망토의 젊은 음악가가 고요한 달빛 강가에서 황금 리라를 연주한다. 음표 기호·유령·해골 없이 따뜻한 빛의 물결만 퍼진다.
- `prometheus.png`: 남색 튜닉과 녹슨 붉은 망토의 온화한 거인이 산등성이에서 작은 불이 든 흙 등잔을 두 손으로 보호한다. 독수리는 멀리 날고 사슬·상처·처벌 장면 없음.
- `guanyu.png`: 긴 검은 수염·녹색 도포·비취와 고금빛 갑옷의 관우가 청룡언월도를 침착하게 휘두를 준비를 한다. 글자 없는 산성 배경과 옅은 비취빛 용 궤적.
- `jaei.png`: 어깨 아래까지 오는 갈색 생머리에 앞머리를 한 여자아이가 분홍 잠옷을 입고 밤 침실에서 웃으며 손을 든다. 토끼 슬리퍼와 창밖의 달.
- `taeo.png`: 짧은 갈색 머리의 남자아이가 흰 태권도복에 파란 바탕에 초록 줄이 있는 띠를 매고 어두운 도장에서 높이 발차기를 한다. 발끝을 따라 붉은 랩터 형상의 궤적.
- `appa.png`: 노란 셔츠와 회색 바지, 갈색 벨트 차림의 아빠가 밤 놀이터에서 두 손을 내밀어 반긴다.
- `eomma.png`: 치타무늬 롱 원피스에 낮은 옆 묶음 머리를 한 엄마가 밤 거실에서 빨래 바구니를 안고 손을 든다. 무늬는 크고 성기게.
- `zhangfei.png`: 검붉은 갑옷과 짙은 수염의 장비가 달빛 장판교를 지키며 장팔사모를 들고 호통친다. 무섭지 않은 영웅 표정과 바람에 휘날리는 무문자 깃발.
- `zhaoyun.png`: 은백 갑옷과 청색 천의 젊은 조운이 포대기에 안전히 안은 아두를 지키며 은창을 든다. 흰 말과 달빛 안개로 구출 장면을 표현.
- `zhugeliang.png`: 상아색·청록 학자복의 제갈량이 백우선을 펼치고 강과 배 위로 동남풍을 일으킨다. 모형 전장과 등불, 글자 없는 깃발.
- `caocao.png`: 검붉은 갑옷의 조조가 군량 자루와 무문자 작전판을 살피며 칼자루를 잡는다. 관도 진영의 빈 깃발과 침착한 계산가 표정.
- `simayi.png`: 자주·먹색 도포와 갑옷의 사마의가 닫힌 부채를 들고 성문 앞에서 새벽을 기다린다. 발밑에는 문양 없는 전략 돌.
- `nezha.png`: 붉은 비단과 금빛 전투복의 어린 나타가 두 풍화륜 위에서 건곤권과 화첨창을 든다. 완전히 옷을 입고 장난기 있는 용감한 표정.
- `erlangshen.png`: 은백·청색 갑옷의 이랑진군이 은은한 천안과 삼첨양인도를 드러내고 친근한 검은 효천견과 선다. 공포 요소 없는 달빛 천궁.
- `wumawang.png`: 둥근 뿔과 다문 입의 듬직한 우마왕이 검붉은 산왕 갑옷과 혼철곤을 갖춘다. 화염산은 따뜻한 주황빛 배경이며 이빨·포효 없음.
- `honghaier.png`: 붉은 금빛 옷의 어린 홍해아가 작은 불수레를 타고 화첨창을 돌린다. 주황·산호·금빛 삼매진화와 장난스러운 미소, 상체 노출 없음.
- `baigujing.png`: 진주빛 흰옷과 은빛 반가면의 백골정이 꽃바구니를 내민다. 뒤에는 세 가지 사람 변신의 옅은 안개 실루엣. 해골·뼈·빈 눈구멍·시체 묘사 없음.
- `jaei.png`: 어깨 아래 갈색 생머리와 앞머리의 어린 재이가 분홍색 긴팔·긴바지 잠옷과 실내화를 입고 달빛 침실에서 장난스럽게 선다. 작은 진주빛 방울만 떠 있고 초록 연기·오물 표현 없음.
- `taeo.png`: 짧은 갈색 머리의 어린 태오가 어두운 남색 태권도장에서 흰 태권도복과 또렷한 파란 바탕에 초록 줄이 있는 띠를 매고 메가랩터 옆차기를 한다. 맨발·전신, 파란 바탕에 초록 줄이 있는 띠 양끝이 보이며 폭력 장면 없음.
- `appa.png`: 짧은 갈색 머리의 키 큰 아빠가 노란색 칼라 셔츠·회색 바지·갈색 벨트를 입고 달빛 놀이터에서 목말을 태워 줄 듯 양손을 든다. 친근하고 든든한 표정.
- `eomma.png`: 낮은 옆 묶음 갈색 머리의 엄마가 큰 점이 성기게 놓인 베이지 치타무늬 롱 원피스와 실내화를 입고 따뜻한 거실에서 한 손을 차분히 든다. 고양이 귀·꼬리 없음.
- `yisunshin.png`: 남색·고금빛 조선 수군 갑옷의 이순신이 활을 내리고 지휘 갑판에 선다. 뒤에는 달빛 바다와 거북선. 영화 배우 닮은꼴·현대 국기 없음.
- `euljimundeok.png`: 물빛 포인트의 고구려 찰갑을 입은 을지문덕이 얕은 강가에서 돌로 물길 작전을 짠다. 특정 드라마 디자인 없음.
- `ganggamchan.png`: 은빛 수염의 노장 강감찬이 고려 갑옷과 도포를 입고 글자 없는 청동 천문 고리를 든다. 먼 산성의 새벽빛.
- `kwonyul.png`: 남색·적갈색 조선 갑옷의 권율이 행주산성 위에서 돌을 들고 신호한다. 적군·부상 없이 먼 화차 연기만 보인다.
- `sherlockholmes.png`: 평범하게 빗은 검은 머리와 짙은 프록코트의 셜록 홈즈가 런던 골목에서 돋보기로 발자국 셋을 살핀다. 사냥모·파이프·배우 닮은꼴 없음.
- `doctorwatson.png`: 콧수염과 밤색 외투의 왓슨 박사가 의료 가방과 닫힌 수첩을 들고 가스등 아래 선다. 총·배우 닮은꼴 없음.
- `arsenelupin.png`: 검은 이브닝 코트와 버건디 장갑의 아르센 뤼팽이 모자를 옆으로 들고 파리 저택 발코니에 선다. 애니메이션·영상물 디자인 없음.
- `moriarty.png`: 은빛 머리와 자주색 정장의 모리어티가 평범한 검은 체스 말을 옮긴다. 뒤에는 글자 없는 금빛 기하 실선. 공포 악당 표정 없음.
- `gearwing.png`: 짧은 곱슬머리의 어린 발명가 기어윙이 청록·구리 작업복과 둥근 금속 깃털 날개로 시계탑 위를 난다. 원형 가슴 장치 없음.
- `starshield.png`: 남색·상아·비취 탐험복의 어린 대장이 문양 없는 나뭇잎 모양 오로라 방패를 들고 친구를 지킨다. 국기색·별 문양 없음.
- `thunderguard.png`: 청록·호박색 판타지 공연복의 천둥북 수호자가 허리의 구름북을 친다. 망치·날개 투구·붉은 망토 없음.
- `redknot.png`: 버건디 긴 코트와 넉넉한 바지의 붉은매듭 첩보원이 부드러운 매듭 도구로 떨어지는 보석을 낚아챈다. 검은 전신복·총 없음.
- `walllizard.png`: 둥근 초록 얼굴과 넓은 손가락 패드의 도마뱀 아이가 주황·초록 파쿠르 재킷으로 도서관 탑 벽을 달린다. 가면·거미줄 없음.
- `neonjumper.png`: 짧은 곱슬머리의 검은 피부 소녀가 청록·자홍 재킷과 빛나는 바퀴 신발로 타원형 차원문을 넘는다. 거미 문양·가면 없음.
- `moonmoth.png`: 은라벤더 땋은 머리와 크림·라일락 나방 날개의 수호자가 닫힌 등불을 들고 달빛 갈대 위를 난다. 흰 후드·거미 문양 없음.
- `ppungdetective.png`: 둥근 보통 개 코의 비글 뿡경감이 베이지 트렌치코트와 돋보기로 진주빛 냄새 한 줄을 좇는다. 엉덩이 모양 얼굴·배설물 없음.
- `circe.png`: 자주·청록 로브의 친근한 젊은 마법사 키르케가 달빛 약초 정원에서 지팡이와 흙잔을 든다. 곁에는 편안한 돼지 한 마리, 변신 공포 표현 없음.
- `siren.png`: 청록 깃털 튜닉과 진주빛 남색 날개의 세이렌 한 명이 달빛 바위 위에서 노래한다. 따뜻한 빛의 고리만 퍼지고 음표·인어 꼬리·노출 없음.
- `scylla.png`: 둥근 바다표범 같은 푸른 한 몸에서 정확히 여섯 개의 긴 바다용 목과 머리가 이어진다. 입은 모두 다물고 표정은 서로 다르며 촉수·공포·추가 머리 없음.
- `helios.png`: 황금 마차의 온화한 태양신 헬리오스가 샛노란 튜닉·청동 갑옷·붉은 금빛 망토를 입는다. 흰 말은 정확히 두 마리이며 불꽃 머리·슈퍼히어로 요소 없음.
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
| zeus | `50% 10%` |
| poseidon | `50% 0%` |
| hades | `50% 12%` |
| apollo | `50% 15%` |
| minotaur | `50% 6%` |
| cerberus | `50% 18%` |
| hydra | `50% 14%` |
| sphinx | `50% 55%` |
| achilles | `50% 20%` |
| theseus | `50% 22%` |
| artemis | `50% 24%` |
| atalanta | `50% 30%` |
| athena | `50% 18%` |
| hermes | `50% 28%` |
| orpheus | `50% 24%` |
| prometheus | `50% 20%` |
| guanyu | `50% 22%` |
| zhangfei | `50% 24%` |
| zhaoyun | `50% 22%` |
| zhugeliang | `50% 18%` |
| caocao | `50% 18%` |
| simayi | `50% 18%` |
| nezha | `50% 24%` |
| erlangshen | `50% 20%` |
| wumawang | `50% 18%` |
| honghaier | `50% 24%` |
| baigujing | `50% 20%` |
| jaei | `50% 24%` |
| taeo | `50% 22%` |
| appa | `50% 20%` |
| eomma | `50% 22%` |
| yisunshin | `50% 20%` |
| euljimundeok | `50% 20%` |
| ganggamchan | `50% 20%` |
| kwonyul | `50% 22%` |
| sherlockholmes | `50% 20%` |
| doctorwatson | `50% 22%` |
| arsenelupin | `50% 20%` |
| moriarty | `50% 20%` |
| gearwing | `50% 18%` |
| starshield | `50% 18%` |
| thunderguard | `50% 18%` |
| redknot | `50% 20%` |
| walllizard | `50% 18%` |
| neonjumper | `50% 18%` |
| moonmoth | `50% 18%` |
| ppungdetective | `50% 20%` |
| circe | `50% 20%` |
| siren | `50% 18%` |
| scylla | `50% 16%` |
| helios | `50% 18%` |

두 번째 묶음(요정 대모·빨간 모자·잭)은 첫 묶음(신데렐라·오디세우스·폴리페모스)을 스타일·조명·재질 참고 이미지로 사용했고, 인물과 구도는 복제하지 않도록 명시했다. 6단계 전 검수에서 신데렐라와 폴리페모스는 위 장면으로 새로 생성해 PNG·WebP를 모두 교체했다.

2026-08-30 확장에서는 Codex 내장 ImageGen으로 누락 18장을 카드별 1회 생성하고, 아기돼지 삼형제는 소품 배분만 정밀 편집했다. 피노키오의 코 길이·참새 착지 편집은 출력 안전 필터가 반복 차단해, 동일 화풍의 안전한 목각 인형+비행 중 참새 원화를 최종 선택했다. 전체 24장은 PNG·WebP 1024×1536 RGB이며 실제 5:4 카드 프레임에서 위 크롭 값으로 검수했다.

## 그리스 G1 최종 프롬프트 (2026-09-08)

Codex 내장 ImageGen으로 카드마다 별도 생성. 기존 헤라클레스·페르세우스의 메모리 썸네일 두 장을 화풍 참조로 사용했으며, 기존 24장은 수정하지 않았다. 아래 네 원본은 1024×1536 RGB PNG이고 같은 그림을 WebP 품질 90으로 인코딩했다. 각 카드의 5:4 미리보기 크롭을 위 좌표로 확인했다.

### zeus

- 원본: `art/zeus.png`
- 게임용: `art/zeus.webp`

```text
Use case: stylized-concept. Asset type: premium collectible card-game character art only. Make a NEW original vertical 1024x1536 RGB portrait painting. Input images 1 and 2 are STYLE references ONLY: match their richly layered hand-painted cinematic storybook fantasy paint, convincing classical fabric/bronze/stone textures, sculpted warm light, deep indigo atmosphere, natural expressive faces. Do not copy either reference character or composition. Character fills 65-80% of height with expressive face in upper third; face, action and key prop in central 72%, instantly readable when cropped to a landscape 5:4 card image focused at 50% 40%. Strong foreground/middle/background depth, restrained softly painted environment. Appropriate for ages 5-8. Fully clothed costume covering torso. No text, letters, numerals, frame, border, UI, icons, decorative star symbols or constellation symbols, logos or watermark. No blood, wounds, gore, skulls, exposed bones, horror, nudity. No existing movie/game/brand or artist imitation. Subject: ZEUS, a dignified kindly older storm king with thick silver curls and a neatly flowing silver beard, intelligent warm eyes, distinctive square face. He stands in a strong broad triangular silhouette on an Olympian cloud terrace, calmly guiding a single controlled branching spear of golden lightning across his raised right hand. His composed smiling face, hand and lightning are close enough to read clearly in the upper central image. Rich midnight-blue long-sleeved tunic and ivory/gold fully draped layered robes with fine woven edges and a modest bronze-gold laurel circlet. Wind catches one substantial robe fold. Distant marble columns dissolve into blue-violet clouds below a midnight sky with tiny natural pinprick starlight, warm champagne lightning illuminates beard and fabric. Generous gold/ivory against deepest sapphire-indigo. A benevolent sky ruler, no rage or threatening victim. NO hammer, superhero suit, winged helmet, red superhero cape, Thor likeness, Disney Hercules likeness. Use the two displayed in-memory painting thumbnails as style reference inputs.
```

### poseidon

- 원본: `art/poseidon.png`
- 게임용: `art/poseidon.webp`

```text
Use case: stylized-concept. Asset type: premium collectible card-game character art only. Make a NEW original vertical 1024x1536 RGB portrait painting. Input images 1 and 2 are STYLE references ONLY: match their richly layered hand-painted cinematic storybook fantasy paint, convincing classical fabric/bronze/stone textures, sculpted warm light, deep indigo atmosphere, natural expressive faces. Do not copy either reference character or composition. Character fills 65-80% of height with expressive face in upper third; face, action and key prop in central 72%, instantly readable when cropped to a landscape 5:4 card image focused at 50% 40%. Strong foreground/middle/background depth, restrained softly painted environment. Appropriate for ages 5-8. Fully clothed costume covering torso. No text, letters, numerals, frame, border, UI, icons, decorative star symbols or constellation symbols, logos or watermark. No blood, wounds, gore, skulls, exposed bones, horror, nudity. No existing movie/game/brand or artist imitation. Subject: POSEIDON, a warm but formidable mature sea king with windswept dark wavy hair silvered at the temples and a short dark-silver beard, olive skin, bright watchful eyes, clearly unlike Zeus. One tall elegantly simple bronze trident with exactly THREE prongs is held upright close beside his shoulder with all three prongs at face-height in the central image. His other open palm sweeps outward to command a single magnificent turquoise ocean wave curling behind and around his covered body. Strong angled pose braced against a coastal stone ledge; long seafoam teal tunic, bronze scale-pattern shoulder mantle, layered deep teal cloak, fully covered torso, practical bracers. Luminous aquamarine water foam and salt spray, midnight indigo sea and faint classical port in the distance, warm amber rim light on face and bronze. One distinctive diagonal wave and one clear trident silhouette, no crowd. Friendly confidence, not angry or frightening. NO shirtless body, no fish tail, no Aquaman suit/likeness, no Disney Triton likeness. Use the two most recently displayed in-memory paintings as style references only.
```

### hades

- 원본: `art/hades.png`
- 게임용: `art/hades.webp`

```text
Use case: stylized-concept. Asset type: premium collectible card-game character art only. Make a NEW original vertical 1024x1536 RGB portrait painting. Input images 1 and 2 are STYLE references ONLY: match their richly layered hand-painted cinematic storybook fantasy paint, convincing classical fabric/bronze/stone textures, sculpted warm light, deep indigo atmosphere, natural expressive faces. Do not copy either reference character or composition. Character fills 65-80% of height with expressive face in upper third; face, action and key prop in central 72%, instantly readable when cropped to a landscape 5:4 card image focused at 50% 40%. Strong foreground/middle/background depth, restrained softly painted environment. Appropriate for ages 5-8. Fully clothed costume covering torso. No text, letters, numerals, frame, border, UI, icons, decorative star symbols or constellation symbols, logos or watermark. No blood, wounds, gore, skulls, exposed bones, horror, nudity. No existing movie/game/brand or artist imitation. Subject: HADES, a dignified quiet ruler and thoughtful guardian of the peaceful underworld, a slender middle-aged man with a long narrow thoughtful face, straight raven-black hair swept behind the ears, neatly trimmed black beard and gentle intelligent dark eyes. Completely distinct from Zeus and Poseidon's broad faces. He stands calmly on a shadowed riverside marble landing, wrapped in refined long plum and indigo robes that completely cover his torso and arms; subtle old-gold geometric woven trim, no symbols or lettering. He holds an elegant plain dark bronze invisibility helm at chest height; its upper edge softly dissolves into translucent violet-blue light, one clearly readable prop. His other hand gently guides a pale turquoise ghostly river current spiraling peacefully before him; soft candlelike amber lights reflect on his fingertips. A quiet celestial cavern with a deep indigo luminous river and distant blurred classical arches, thin mist without ghost faces or bodies. Plum-amethyst shadows, a lavender-silver river glow and narrow champagne-gold edge light, calm protective mood suitable for small children. NO villain expression, no scowl, no demonic features, no skulls, no bones, no fire hair, no black spiked armor, no horror, no crowds. Use the two most recently displayed in-memory paintings as style references only.
```

### apollo

- 원본: `art/apollo.png`
- 게임용: `art/apollo.webp`

```text
Use case: stylized-concept. Asset type: premium collectible card-game character art only. Make a NEW original vertical 1024x1536 RGB portrait painting. Input images 1 and 2 are STYLE references ONLY: match their richly layered hand-painted cinematic storybook fantasy paint, convincing classical fabric/bronze/stone textures, sculpted warm light, deep indigo atmosphere, natural expressive faces. Do not copy either reference character or composition. Character fills 65-80% of height with expressive face in upper third; face, action and key prop in central 72%, instantly readable when cropped to a landscape 5:4 card image focused at 50% 40%. Strong foreground/middle/background depth, restrained softly painted environment. Appropriate for ages 5-8. Fully clothed costume covering torso. No text, letters, numerals, frame, border, UI, icons, decorative star symbols or constellation symbols, logos or watermark. No blood, wounds, gore, skulls, exposed bones, horror, nudity. No existing movie/game/brand or artist imitation. Subject: APOLLO, a youthful radiant sun archer and musician, a friendly clean-shaven young adult man with short tousled honey-brown curls and a narrow warm smiling face, bright clear eyes. His graceful lithe silhouette and amber/terracotta palette must distinguish him from older broad kings. Standing on a classical terrace at the moment the first solar radiance breaks through an indigo sky. Completely clothed in a finely woven long-sleeved amber tunic, deep rust-ochre cloak, bronze-gold belt and modest gold laurel. He gently holds a small golden lyre prominently at chest height with one hand poised on its strings, while ONE tall simple elegant golden bow is slung diagonally at the opposite shoulder, its outline clearly recognizable beside him without crossing the lyre or his face. Lyre and bow are both real distinct objects, NO hybrid instrument, NO extra hands. The face and lyre fill the upper central area. Warm solar amber light wraps around his curls and translucent cloak folds against rich deep indigo; soft misty marble columns and far-off dawn hills, subtle natural pinpricks in the retreating night. One lyrical rising arc of pure light, no musical note symbols. Calm joyful inspiration, no combat target, no weapon aiming at viewer. No nudity, no modern superhero costume or existing film likeness. Use the two most recently displayed in-memory paintings as style references only.
```

## 그리스 G2 최종 프롬프트 (2026-09-09)

Codex 내장 ImageGen으로 카드마다 별도 생성하고 메두사·폴리페모스·하데스 원화를 화풍 참고로만 사용했다. 앞의 세 원본은 1024×1536 RGB, 스핑크스 생성 원본은 1122×1402 RGB였으므로 중앙 cover 방식으로 1024×1536 RGB에 기계 정규화했다. 같은 그림을 WebP 품질 90으로 인코딩했다. 5:4 카드 크롭에서 실타래, 머리 3개, 머리 9개, 스핑크스의 얼굴·날개·앞발·자갈 3개를 확인했다.

### minotaur

- 원본: `art/minotaur.png`
- 게임용: `art/minotaur.webp`

```text
Use case: stylized-concept. Create a NEW original premium collectible card character painting, 1024x1536 RGB vertical portrait. The three most recently displayed in-memory paintings (Medusa, Polyphemus, Hades) are STYLE REFERENCES ONLY: match their rich hand-painted storybook fantasy textures, luminous jewel tones, layered sculpted light, convincingly painted cloth/stone/fur/bronze, friendly expressive eyes, deep indigo night contrasted with warm amber/gold rim lighting. Do not reproduce any reference character or composition. Character occupies 65-80% of image height, important faces/heads in upper third, key identifying features within central 72%; ensure all identifying heads and props remain clear in 5:4 horizontal card crop. Strong depth, soft restrained background detail. This is child-friendly for ages 5-8: impressive, a little mysterious and cute, never horrifying. Art only. No text, numbers, letters, graphic symbols, decorative insignia, UI, frame, borders, logos, watermark, skulls, bones, blood, wounds, severed heads/necks, frightening eyes, threatening teeth. No existing film, game, brand or artist imitation. Subject: MINOTAUR, a large dependable upright humanoid labyrinth guardian with one handsome brown BULL head and sturdy humanlike body. Short smooth rounded ivory horns, soft closed muzzle, large calm curious brown eyes and furry ears, a gently tilted head. Completely covered torso in sturdy plain warm-bronze armor over an indigo fabric tunic; no exposed chest or muscles. He kindly shows the way through an ancient stone maze, one hand holding a clearly visible ball of golden thread at chest height and the other palm open in a welcoming guide gesture close to his torso. Massive yet kind and safe like a trusted guide; face and thread ball large enough to read in a small card. The bronze, ox-brown fur and indigo cloth form a distinct solid silhouette; golden lanterns light receding maze passages with blue moonlight above. No axe, sword, charge, roaring, red eyes, nose ring, threatening teeth or aggression.
```

### cerberus

- 원본: `art/cerberus.png`
- 게임용: `art/cerberus.webp`

```text
Use case: stylized-concept. Create a NEW original premium collectible card character painting, 1024x1536 RGB vertical portrait. The three most recently displayed in-memory paintings (Medusa, Polyphemus, Hades) are STYLE REFERENCES ONLY: match their rich hand-painted storybook fantasy textures, luminous jewel tones, layered sculpted light, convincingly painted cloth/stone/fur/bronze, friendly expressive eyes, deep indigo night contrasted with warm amber/gold rim lighting. Do not reproduce any reference character or composition. Character occupies 65-80% of image height, important faces/heads in upper third, key identifying features within central 72%; ensure all identifying heads and props remain clear in 5:4 horizontal card crop. Strong depth, soft restrained background detail. This is child-friendly for ages 5-8: impressive, a little mysterious and cute, never horrifying. Art only. No text, numbers, letters, graphic symbols, decorative insignia, UI, frame, borders, logos, watermark, skulls, bones, blood, wounds, severed heads/necks, frightening eyes, threatening teeth. No existing film, game, brand or artist imitation. Subject: CERBERUS, ONE big lovable guardian dog with EXACTLY THREE DISTINCT DOG HEADS connected to the same SINGLE broad furry canine body, FOUR canine legs total, ONE tail. The three heads form a clear compact horizontal fan at upper third: left head is watchful with relaxed floppy ears; central head tilts with cute curiosity; right head has sweet sleepy eyelids. All three closed mouths softly smile, absolutely no visible teeth or saliva. Plush charcoal-brown dog fur with soft warm gold highlights, round intelligent brown eyes, no glowing red eyes. One sturdy plain bronze collar encircles the shared broad base of the three necks. Seated calmly, friendly and dignified, four feet anatomically connected to ONE body, no second dog or extra neck hidden behind. Three individual faces large and distinctly separated so a child can immediately count THREE at tiny card size. Purple luminous river and monumental warmly gold-lit underworld gateway, misty indigo marble courtyard. Clear cute puppy-like proportions without looking like a toy, richly painted fur. No flame, chains, skulls, gore, fangs, snarls, attack stance, or scary eyes.
```

수정 프롬프트:

```text
Use case: precise-object-edit. Edit the provided Cerberus painting with ONE targeted correction: remove all visible flames/fire/sparks from the scene, replacing the two flame-filled bowls at the left with enclosed frosted-glass golden glowing lamps on those exact pedestals, and replace any distant flame points with enclosed lamps. Light is steady warm gold without fire shapes or sparks. Keep EVERYTHING ELSE unchanged: the exact three charming dog heads with their watchful/curious/sleepy expressions, the one shared furry dog body with four feet and one tail, one plain bronze collar, composition, proportions, painted fur detail, purple river, golden gateway, indigo night, existing gentle mood. Same 1024x1536 RGB vertical format and premium hand-painted style. No letters, symbols, UI, border, watermarks or new figures. Do not change the dog at all.
```

### hydra

- 원본: `art/hydra.png`
- 게임용: `art/hydra.webp`

```text
Use case: stylized-concept. Create a NEW original premium collectible card character painting, 1024x1536 RGB vertical portrait. The three most recently displayed in-memory paintings (Medusa, Polyphemus, Hades) are STYLE REFERENCES ONLY: match their rich hand-painted storybook fantasy textures, luminous jewel tones, layered sculpted light, convincingly painted cloth/stone/fur/bronze, friendly expressive eyes, deep indigo night contrasted with warm amber/gold rim lighting. Do not reproduce any reference character or composition. Character occupies 65-80% of image height, important faces/heads in upper third, key identifying features within central 72%; ensure all identifying heads and props remain clear in 5:4 horizontal card crop. Strong depth, soft restrained background detail. This is child-friendly for ages 5-8: impressive, a little mysterious and cute, never horrifying. Art only. No text, numbers, letters, graphic symbols, decorative insignia, UI, frame, borders, logos, watermark, skulls, bones, blood, wounds, severed heads/necks, frightening eyes, threatening teeth. No existing film, game, brand or artist imitation. Subject: HYDRA, a beautiful friendly mythological WATER SERPENT with ONE intact coiled serpentine body and EXACTLY NINE living serpent heads on EXACTLY NINE long slender necks connected to that body. No arms, no legs, no wings; a water-snake silhouette, not a dragon or dinosaur. Carefully arrange nine distinct separated faces into a broad compact fan in the upper half of the portrait: ONE slightly higher clever central head; FOUR heads fanning on the left and FOUR on the right, all nine faces clearly visible, unobscured and countable. The eight side heads have gently playful curious expressions and a few loosely intertwining long neck curves, but all nine head silhouettes remain separated by negative space. Each head has one closed friendly mouth, two soft curious eyes, rounded nose, tiny smooth scales without horns, spikes, sharp teeth or threatening features. One central head plus four left plus four right equals NINE TOTAL: do not add background snake heads. Put all nine faces within x=12% to88% and y=13% to47% of the full image so they survive a 5:4 horizontal crop. Jade, emerald and turquoise scales shimmer with warm gold light. One powerful intact coiled base emerges peacefully from a shallow moonlit marsh, softly reflected in still water, faint indigo reeds and distant pale marble ruin. No fire anywhere, no venom, drool, wounds, severed necks, regrowth, fighting or victims. No text or number labels.
```

### sphinx

- 원본: `art/sphinx.png`
- 게임용: `art/sphinx.webp`

```text
Use case: stylized-concept. Create a NEW original premium collectible card character painting, 1024x1536 RGB vertical portrait. The three most recently displayed in-memory paintings (Medusa, Polyphemus, Hades) are STYLE REFERENCES ONLY: match their rich hand-painted storybook fantasy textures, luminous jewel tones, layered sculpted light, convincingly painted cloth/stone/fur/bronze, friendly expressive eyes, deep indigo night contrasted with warm amber/gold rim lighting. Do not reproduce any reference character or composition. Character occupies 65-80% of image height, important faces/heads in upper third, key identifying features within central 72%; ensure all identifying heads and props remain clear in 5:4 horizontal card crop. Strong depth, soft restrained background detail. This is child-friendly for ages 5-8: impressive, a little mysterious and cute, never horrifying. Art only. No text, numbers, letters, graphic symbols, decorative insignia, UI, frame, borders, logos, watermark, skulls, bones, blood, wounds, severed heads/necks, frightening eyes, threatening teeth. No existing film, game, brand or artist imitation. Subject: SPHINX, ONE friendly ancient GREEK sphinx: a warm intelligent young feminine HUMAN FACE above one fully fur-covered golden LION BODY with FOUR lion legs and TWO magnificent purple EAGLE WINGS. A single mythological creature, not a human sitting on a lion. Modest child-friendly guardian, no adult sensuality, no human breasts or exposed human torso; only face and neck are human, with the neck joining natural thick tawny lion chest fur. Neatly styled dark hair and one simple thin gold headband without patterns, soft attentive eyes, gently inquisitive closed smile. Resting gracefully on a moonlit stone ledge at an ancient labyrinth entrance, one LION FOREPAW gently arranges exactly THREE plain smooth round pebbles in front, as if inviting a riddle. All forelimbs are lion paws, no human hands. The head is large in upper third and the two purple feathered wings rise behind to form a distinctive curved silhouette; face, chest, one lifted paw and the three pebbles close enough together to fit a 5:4 card crop. Indigo moonlit columns recede softly, golden lamp glow rim-lights lion fur and plum-violet feathers. Golden ochre fur, plum wings, dark hair, cream marble. No Egyptian pharaoh headdress, no human arms/hands, no teeth, no roaring or attack pose, no text, runes, inscriptions or graphic symbols.
```

수정 프롬프트:

```text
Use case: precise-object-edit. Recompose this SAME friendly Greek sphinx painting for a horizontal card crop within a 1024x1536 vertical canvas. Preserve the exact warm intelligent youthful feminine face, short dark curly hair, simple golden headband, golden lion fur, purple eagle-feather wings, four lion paws, one tail, rich painterly detail, colors and gentle mood. Change ONLY the creature's pose and framing: it now reclines LOW on the stone ledge, its chest and bent lion front legs comfortably lowered, holding its head above its forepaws. Bring the THREE smooth plain pebbles up beside the forepaws close beneath its face. CRITICAL COMPOSITION: arrange the ENTIRE head, recognizable spread purple wing shoulders, both LION forepaws and THREE pebbles within the rectangle x=100..924 and y=210..980 pixels. Face center around y=390, lion paws and three pebbles around y=860. Lower third may show the ledge, recumbent lion flank and softly lit architecture. It must immediately read as a human-faced winged LION in a 5:4 crop spanning y=180..999; not a winged human portrait. Do not add any human hands/arms or human torso. Four lion legs total. No text, symbols, UI, border, watermarks. A modest 5-8-year-old-friendly mythological guardian. Output 1024x1536 RGB.
```

## 그리스 G3~G4 최종 프롬프트 (2026-09-09)

Codex 내장 ImageGen으로 카드마다 한 번씩 별도 생성했다. 여덟 원본은 중앙 cover 방식으로 1024×1536 RGB PNG에 정규화하고 같은 그림을 WebP 품질 90으로 인코딩했다. 실제 호출 프롬프트는 아래 공통부와 카드별 Subject 문장을 이어 붙인 것이다.

공통부:

```text
Use case: stylized-concept. Asset type: premium collectible card-game character art only. Create a NEW original vertical 1024x1536 RGB portrait painting in the established "starlit epic storybook" world: richly layered hand-painted cinematic fantasy, luminous jewel tones, convincing classical cloth/bronze/stone/wood textures, sculpted warm painterly light, deep indigo night and champagne-gold rim light, natural expressive face, animated-feature concept-art finish without imitating any existing artist, film, game, or trading-card brand. Character fills 65-80% of image height, expressive face in upper third; face, action, and signature props grouped in central 72% and clearly readable in a landscape 5:4 card crop. Strong foreground/middle/background depth and restrained softly painted environment. Appropriate for ages 5-8: wondrous, clever, friendly, never violent or frightening. Fully clothed with torso and legs modestly covered. Character and scene art only. No text, letters, numerals, runes, emblems, decorative symbols, card frame, border, UI, icons, logo, watermark, blood, wounds, gore, skulls, bones, severed body parts, horror, nudity, threatening teeth, victims, or weapon aimed at viewer.
```

### achilles

```text
Subject: ACHILLES, a brave youthful Greek hero with sun-warmed olive skin, short tousled chestnut curls, bright determined but kind eyes, and a distinct youthful face. He stands in a strong three-quarter pose on a windswept starlit coastal ridge. Fully clothed in a deep crimson long-sleeved tunic beneath practical polished bronze scale armor, bronze greaves, and a deep sapphire cloak. In one hand he holds ONE long plain bronze-tipped spear diagonally upward; in the other, ONE large round polished bronze shield at his side. A subtle warm golden glow circles only the heel area of one sandal as a visual hint, with no wound and no arrow. Face, shield, spear hand, and glowing heel all remain readable in the central crop. Ancient ships are tiny soft silhouettes far below, no battle or soldiers. Palette bronze, crimson, sapphire, warm gold. Confident protective hero, not angry. No helmet covering face, no exposed chest, no arrows in body, no Hollywood Troy or existing game likeness.
```

### theseus

```text
Subject: THESEUS, an clever friendly young Greek labyrinth hero with short dark curls, olive skin, alert warm brown eyes, and a slim agile build. He has just found the moonlit exit of an ancient stone maze. Fully clothed in a teal long-sleeved tunic, fitted dark trousers, modest bronze chest guard and warm rust cloak. In his raised left hand he holds a clearly visible glowing BALL OF RED-GOLD THREAD at chest height; the thread traces one elegant continuous line back through the maze. In his other lowered hand is ONE simple bronze short sword, safely angled down and away. Face, thread ball, line, and sword hilt cluster in the central crop. Warm lantern glow reveals branching corridors behind, with no Minotaur, no fight, no victims. Palette teal, rust, bronze, ruby thread, indigo stone. Expression delighted and thoughtful, solving a puzzle. No exposed muscles, no severed parts, no copied movie hero.
```

### artemis

```text
Subject: ARTEMIS, an original youthful Greek moonlit huntress and guardian of the forest, with a calm warm face, olive skin, dark wavy hair tied in a practical high braid, clear silver-gray eyes. Fully clothed in a forest-green long-sleeved knee-length tunic over fitted dark leggings, silver-gray shoulder mantle, practical bronze bracers and boots; no exposed chest or thigh. She stands on a moonlit woodland ledge holding ONE elegant silver bow across her body, with ONE silver-tipped arrow resting loosely but not drawn and never aimed at viewer. A real crescent moon glows in the sky behind her, not a graphic logo. Face, bow curve, arrow, and protective open-hand gesture remain in the central crop. A small peaceful deer silhouette is far in the mist, secondary and unobtrusive. Silver moonbeams, emerald leaves, deep indigo forest and warm gold edge light. Gentle watchful smile, protector rather than attacker. No modern superhero, no Hunger Games likeness, no oversized antlers, no violent hunt.
```

### atalanta

```text
Subject: ATALANTA, a fast joyful young Greek runner and huntress with warm brown skin, long dark auburn hair streaming in a practical tied ponytail, lively focused eyes and a distinct athletic youthful face. Fully clothed in a saffron-gold long-sleeved tunic over fitted plum leggings, short forest-green cloak, bronze belt, bracers and boots. Capture a decisive side-three-quarter sprint along a moonlit woodland race path: one foot just touching the ground, one knee lifting, cloak and hair sweeping back in a clean diagonal. She carries ONE light hunting spear safely parallel to her stride, not aimed at anyone. Exactly THREE gleaming golden apples roll along the path beside and slightly ahead of her, all three visible and countable in the central crop. Face, spear, running pose, and three apples readable at small size. Indigo forest, amber path, emerald and plum accents, sparkling dust only as natural light. She looks delighted by the race, no opponent, no fight. No modern sportswear, no Wonder Woman likeness, no exposed torso, no extra limbs or extra apples.
```

### athena

```text
Subject: ATHENA, a wise protective young adult Greek strategist with warm olive skin, large calm gray eyes, and dark chestnut hair gathered into a braided crown; a confident thoughtful face distinct from Artemis. Fully clothed in a long-sleeved deep teal tunic beneath refined practical bronze armor, ankle-length indigo skirt panels, and a cream-gold cloak. She stands on a quiet moonlit marble terrace studying a miniature arrangement of smooth strategy stones on a low table. ONE tall plain bronze spear rests upright beside her, safely vertical. ONE large round bronze AEGIS shield is angled near her shoulder, polished and completely free of faces, snakes, writing, or graphic emblems. A real small tawny OWL perches gently on the top edge of the shield, both eyes open. Face, owl, shield, spear grip, and strategy stones form one readable central cluster. Warm gold light on bronze against indigo and teal. Gentle knowing smile, defender and planner, no battle. No Medusa head, no modern superhero or Wonder Woman likeness, no helmet covering face, no exposed skin beyond face and hands.
```

### hermes

```text
Subject: HERMES, a cheerful clever young Greek messenger with warm brown skin, short windswept dark curls, bright mischievous eyes and a slender agile build. Fully clothed in a sky-blue long-sleeved travel tunic, fitted cream trousers, short saffron cloak, bronze belt and boots. Capture him lightly stepping across a moonlit cloud bridge as if just arriving with good news. BOTH boots have small elegant white feathered WINGS attached at the ankles, clearly visible and symmetrical. He holds ONE simple bronze messenger staff upright with exactly TWO gentle intertwined decorative serpents and small wings at the top, no medical cross and no glowing symbols. A small closed leather message satchel hangs at his hip, no letters visible. Face, staff top, both winged boots and satchel stay within the central crop. Indigo sky, pale turquoise clouds, golden dawn edge light. Friendly playful grin, no theft victim, no combat. No winged helmet, no Flash or superhero costume, no nudity, no extra arms, no floating text.
```

### orpheus

```text
Subject: ORPHEUS, a gentle youthful Greek musician and storyteller with warm olive skin, shoulder-length soft black curls, kind thoughtful eyes and a calm narrow face. Fully clothed in a long-sleeved plum tunic, deep teal draped cloak, dark trousers and simple bronze sandals. He sits upright on a moonlit marble step beside a peaceful indigo river, holding ONE beautiful golden wooden LYRE prominently at chest height with both natural hands; exactly seven plain strings, no written markings. One hand plucks while the other supports the instrument. Face, hands and full lyre are tightly grouped in the upper-central card crop. Rings of warm amber light ripple naturally from the strings without musical-note symbols. A deer and two small birds listen from the distant mist, tiny secondary silhouettes. Violet-blue underworld arches remain peaceful and softly blurred, no ghosts, skulls, bones or grief. Expression hopeful and absorbed in music. No modern guitar, no extra instruments, no singing mouth, no exposed torso.
```

### prometheus

```text
Subject: PROMETHEUS, a compassionate strong but gentle Greek titan and teacher with sun-warmed bronze skin, thick dark hair streaked with copper, a short neat beard and intelligent caring eyes; mature, distinct from Zeus. Fully clothed in a charcoal-blue long-sleeved tunic, layered rust-red wool cloak and sturdy bronze bracers, torso and legs covered. He kneels on one knee at a high starlit mountain ledge and protects ONE small bright living FLAME inside a shallow plain clay lamp cupped carefully between both hands at chest height. The fire illuminates his face, hands and cloth with warm amber light; flame remains small, safe and clearly readable. In the far upper sky, ONE peaceful eagle glides as a small silhouette, not attacking. Below, distant tiny warm village lights suggest the gift reaching people, with no visible crowd. Face and clay lamp form the central focus; deep indigo rock and sky, copper-rust cloak, golden fire. Expression brave, generous and hopeful. No chains, punishment, wounds, exposed chest, giant muscles, torches, forest fire, lightning, superhero likeness, or threatening bird.
```

## 동양 C2~C3 최종 프롬프트 (2026-09-09)

Codex 내장 ImageGen으로 11장을 각각 별도 생성했다. 기존 손오공 원화는 재생성하지 않았다. 생성본은 중앙 cover 방식으로 1024×1536 RGB PNG에 정규화하고 같은 그림을 WebP 품질 90으로 인코딩했다.

| id | ImageGen 원본 |
|---|---|
| guanyu | `exec-a3fe158f-c059-4920-a824-fecb9cd62d3f.png` |
| zhangfei | `exec-9fcfdd07-49df-4739-9c0a-dd4b78110406.png` |
| zhaoyun | `exec-ef3ea0ec-d999-4d20-8a74-781a9c2c35cb.png` |
| zhugeliang | `exec-9b4766f1-bfef-4724-bf24-3d67ece34225.png` |
| caocao | `exec-4b4b7ab7-e203-477e-835d-28514dccf75b.png` |
| simayi | `exec-fbd5707e-55bb-497d-8b3b-efdd0eba4d2f.png` |
| nezha | `exec-a4957b10-6e59-471d-a93f-f448beab6487.png` |
| erlangshen | `exec-33218e98-8c48-4a85-9d5c-99f61260e45a.png` |
| wumawang | `exec-5b0265c4-7420-452a-948a-5b191ea982df.png` |
| honghaier | `exec-0d0e0609-f766-403f-914b-07050430f3a7.png` |
| baigujing | `exec-85b74910-542c-4ec1-be41-fef97d444cd6.png` |

## 우리 가족 M2 최종 프롬프트 (2026-09-09)

설계서의 가족 디자인 문장을 기준으로 네 장을 각각 별도 생성했다. 얼굴은 실제 사진을 추정하지 않는 단순하고 둥근 동화 캐릭터로 유지하고, 머리와 키 순서는 수학 놀이터 디자인을 따랐다. 옷은 가족 카드 전용 확정값으로 의도적으로 변경했다. 생성본은 중앙 cover 방식으로 1024×1536 RGB PNG에 정규화하고 같은 그림을 WebP 품질 90으로 인코딩했다.

| id | ImageGen 원본 |
|---|---|
| jaei | `exec-d33a40ac-fbe7-4c2b-a11b-26d8a2583974.png` |
| taeo | `exec-231c4ad9-9a4f-47ab-aa24-abcdace7eac8.png` |
| appa | `exec-3fa1eeb4-52ca-4934-b306-40d71bbe849d.png` |
| eomma | `exec-a2eedc1c-ea29-4c60-a604-8357ca4c1a1f.png` |

공통부:

```text
Use case: illustration-story
Asset type: premium vertical collectible card character artwork for a children's strategy game
Primary request: create a new 1024×1536 portrait illustration.
Style/medium: premium cinematic hand-painted East Asian historical or mythic storybook fantasy, rich natural brushwork, polished and original, no imitation of any existing film, animation, game, or trading-card franchise.
Composition/framing: one main character fills 65–78% of the height, face in the upper third, strong readable silhouette, important weapon and prop inside the central 72%, softly blurred narrative background, no border.
Lighting/mood: deep indigo starlit night, warm gold rim light, subtle jewel-color accents; brave, exciting and welcoming for children ages 5–8.
Constraints: family-friendly; fully clothed; no blood, injury, gore or active stabbing; no text, letters, numbers, logos, watermark, UI, card frame, stars, type icons, readable signs, writing, calligraphy, runes, emblems or banner symbols.
Avoid: photorealism, chibi proportions, horror, aggressive snarling, sharp exposed teeth, modern clothing, copyrighted screen adaptation styling.
```

카드별 Subject:

- `guanyu`: Honorable tall Guan Yu, warm reddish-brown face, exceptionally long black beard, deep green robe and jade-antique-gold armor, dark green headcloth, long guandao, restrained jade dragon-shaped light trail, blank moonlit stone pass and pine mountains, dignified protective expression.
- `zhangfei`: Broad Zhang Fei with round expressive eyes, dense black beard, black-crimson armor and dark red headcloth, long serpent spear, protecting a moonlit wooden bridge; bold rallying shout but child-safe heroic face.
- `zhaoyun`: Youthful Zhao Yun in silver-white armor and blue-white scarf, silver spear and safely wrapped infant held close, pale horse and moonlit mist, focused kind fearless expression.
- `zhugeliang`: Elegant Zhuge Liang in ivory and cool-teal scholar robes and black cap, white feather fan, miniature river-and-boat tactical landscape, southeast wind and warm sparks, quiet intelligent expression.
- `caocao`: Keen Cao Cao in dark red-black armor and crimson cloak, grain pouch and unmarked battlefield pieces, sheathed straight sword, Guandu tents and blank flags, calculating but charismatic.
- `simayi`: Patient Sima Yi in midnight-purple and charcoal robes over armor, closed fan, quiet fortress gate, plain strategy stones and pale dawn, calm watchful expression.
- `nezha`: Spirited child Nezha with twin buns, red ribbons, fully clothed red-gold battle tunic, exactly two Wind-Fire Wheels, golden Cosmic Ring, fire-tipped spear and celestial sash, playful brave expression.
- `erlangshen`: Composed Erlang Shen in silver-white and blue armor, gentle glowing third eye, three-pointed spear and friendly black celestial hound, moonlit heavenly gate, protective expression.
- `wumawang`: Storybook-friendly Bull Demon King with rounded horns, closed mouth, dark-brown fur, charcoal-oxblood mountain armor, black iron staff and warm Flaming Mountains, sturdy rather than menacing.
- `honghaier`: Mischievous child Red Boy in fully clothed crimson-gold tunic, tiny fire-wheeled cart, short fire-tipped spear and controlled orange-coral-gold flame spiral, cheeky smile.
- `baigujing`: Safe White Bone Spirit interpretation: elegant woman in pearl-white and silver robes, smooth silver half-mask, flower basket and exactly three harmless mist disguises; no skeleton, skull, bones, empty sockets, corpse imagery or claws.

## 전설과 멀티버스 최종 생성본 (2026-09-10)

카드마다 내장 ImageGen을 한 번씩 별도로 실행했다. 생성 원본은 보존하고, 중앙 cover 방식으로 1024×1536 RGB PNG와 WebP 품질 90으로 정규화했다.

| id | ImageGen 원본 |
|---|---|
| yisunshin | `exec-fa9d3bb1-5476-4ae5-9328-19cb3eff4cf8.png` |
| euljimundeok | `exec-43abe9f5-d016-4433-ba50-c9d83644337e.png` |
| ganggamchan | `exec-752cbb51-ede6-4232-99d7-3886c0d5e206.png` |
| kwonyul | `exec-838f6727-a970-4221-a7dd-b6fa0ee7513e.png` |
| sherlockholmes | `exec-1457399a-42be-4f83-9f32-2ee0d15bcb78.png` |
| doctorwatson | `exec-70eacc00-118a-46e2-9072-31b9ef8105de.png` |
| arsenelupin | `exec-a78ef892-6b9c-4821-8e06-eaf8c004e1f9.png` |
| moriarty | `exec-b5ec64b3-508b-40d5-8e05-f712bc0c0529.png` |
| gearwing | `exec-891d987c-767f-42e8-8511-28d39895c3dd.png` |
| starshield | `exec-43428e4d-99d6-4137-9a56-f1548644012d.png` |
| thunderguard | `exec-b1fb9bcd-e16e-421b-b7cf-b209d996c3fe.png` |
| redknot | `exec-aaef218c-dffc-4216-b9e1-faaf6cfaef9e.png` |
| walllizard | `exec-88544d0b-f3f1-4610-8593-9233cccff3fa.png` |
| neonjumper | `exec-e9abd399-f567-464d-9635-ac499be8388c.png` |
| moonmoth | `exec-67e3c28e-db3d-4eca-a074-7904c2ee05bb.png` |
| ppungdetective | `exec-b833f0fc-3b4f-486b-9311-b8d53a9d130d.png` |

## 오디세이 조우 카드 최종 생성본 (2026-09-11)

Codex 내장 ImageGen의 `stylized-concept` 모드로 네 장을 각각 새로 생성했다. 공통 프롬프트는 어린이용 프리미엄 세로 카드 원화, 독창적인 손그림 그리스 신화 동화 판타지, 깊은 남색과 샴페인 금빛 조명, 중앙 인물·생물 65~78%, 글자·숫자·로고·프레임·유혈·신체 공포 금지로 고정했다. 생성본은 1024×1536 RGB PNG와 WebP 품질 90으로 저장했다.

| id | ImageGen 원본 |
|---|---|
| circe | `exec-fbb5928e-9297-4f95-a7b1-891eae1b5e7c.png` |
| siren | `exec-26f1eb40-62cd-45dd-9501-5615fe314946.png` |
| scylla | `exec-c3dd104c-3477-441a-8291-c9d46269de71.png` |
| helios | `exec-90972529-727b-41ad-8b35-8e5d7bb84ce2.png` |

## S3 쓰구미 대마왕 (2026-09-13)

내장 image_gen 도구로 새 원화를 생성하고 RGB PNG·WebP 쌍으로 저장했다. 기존 원화는 변경하지 않았다.

- `sseugumi.png`: Use case: illustration-story. Asset: premium original children's fantasy collectible card character artwork, portrait 1024x1536 PNG, no frame or typography. Subject: Sseugumi, a comical little prankster king about the height and proportions of a five-year-old child, round covered belly, oversized crooked gold crown, mischievous broad grin with ordinary small rounded teeth, expressive warm eyes with visible colored irises, rosy cheeks. One hand holds a pink whoopee cushion, the other a bag of stolen wrapped sweets. His royal cape is so long he accidentally steps on its hem. Full body visible from crown to shoes, central clear silhouette with margins. Background: bright toy-strewn cozy storybook palace, painterly richly detailed materials and fabric, polished collectible-card illustration, charming and funny rather than threatening, warm even illumination. Original character, no reference to existing franchises. Avoid fangs, solid black eyes, scary shadows, sinister face, gore, weapons, dark horror atmosphere. NO text, letters, numbers, logos, watermarks or card borders anywhere.
- 원본: `exec-2f757daa-bfd4-4bcb-8fb1-2faf97b566cd.png`.

| id | crop |
|---|---|
| sseugumi | `50% 22%` |

## 우리 역사 첫 8장 (2026-09-13)

내장 이미지 생성. 전체 공통·장면 프롬프트 및 원본 경로: HISTORY-IMAGE-PROMPTS.md.

- `sejong.png`: 세종대왕 — 훈민정음의 빛의 배경이 되는 인물과 시대를 그린 상상화. 1024×1536, 글자·프레임 없음.
- `jangyeongsil.png`: 장영실 — 자격루 물방울의 배경이 되는 인물과 시대를 그린 상상화. 1024×1536, 글자·프레임 없음.
- `heojun.png`: 허준 — 약초 향기의 배경이 되는 인물과 시대를 그린 상상화. 1024×1536, 글자·프레임 없음.
- `shinsaimdang.png`: 신사임당 — 붓끝의 나비의 배경이 되는 인물과 시대를 그린 상상화. 1024×1536, 글자·프레임 없음.
- `jeongyakyong.png`: 정약용 — 도르래 돌리기의 배경이 되는 인물과 시대를 그린 상상화. 1024×1536, 글자·프레임 없음.
- `kimhongdo.png`: 김홍도 — 먹빛 물결의 배경이 되는 인물과 시대를 그린 상상화. 1024×1536, 글자·프레임 없음.
- `yugwansun.png`: 유관순 — 희망의 외침의 배경이 되는 인물과 시대를 그린 상상화. 1024×1536, 글자·프레임 없음.
- `kimgu.png`: 김구 — 백범의 다짐의 배경이 되는 인물과 시대를 그린 상상화. 1024×1536, 글자·프레임 없음.

| id | crop |
|---|---|
| sejong | `50% 22%` |
| jangyeongsil | `50% 22%` |
| heojun | `50% 22%` |
| shinsaimdang | `50% 22%` |
| jeongyakyong | `50% 22%` |
| kimhongdo | `50% 22%` |
| yugwansun | `50% 22%` |
| kimgu | `50% 22%` |

## 재이의 괴물 친구 재윙

- `jaewing.png`: 재이 카드의 귀여운 악마 모드. 재이 원화와 같은 얼굴·긴 갈색 머리·동화풍 채색. 보라·빨강 악마 무늬 잠옷, 작은 빨간 뿔 두 개, 박쥐 날개, 하트 끝 꼬리. 해 질 녘 보라빛 놀이터에서 구름사다리에 한 손으로 매달려 장난스럽게 웃고 뒤에는 바이킹 그네가 보인다. 1024×1536 PNG + WebP 품질 88, 글자·숫자·카드 테두리 없음. 내장 이미지 생성 프롬프트 전문은 DESIGN-JAEWING.md에 기록했다.

| 카드 | 크롭 |
|---|---|
| jaewing | `50% 40%` |
