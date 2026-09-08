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
