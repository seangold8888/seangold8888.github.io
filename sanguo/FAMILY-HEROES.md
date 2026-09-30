# 우리 영웅 제작 (2026-09-29)

태오·재이·윤찬·윤건. 카드 게임의 같은 ID와 그림을 참조한 상상 모험 캐릭터이며 역사 인물이 아니다.

- 선택: 출진 준비 → 우리 영웅. 삼국지·서유기·한국 명장 어느 전장에서든 사용.
- 태오: 태권 연격 / 기합파 / 번개 돌려차기 / 메가랩터킥.
- 재이: 방울 마법 / 방울 / 방울 회오리 / 무지개 방울폭풍.
- 윤찬: 잠자리채 / 반딧불 / 반딧불 길잡이 / 장수풍뎅이 돌진.
- 윤건: 축구 킥 / 슛 / 불꽃 드리블 / 불꽃 슛.
- J 공격(홀드 강공), K 원거리(홀드 차지), I/C 돌진, L 필살. 기존 터치 조작 동일. 전용 탈것은 이번 범위가 아니므로 승마는 비활성.
- 장수 성장 저장소를 공유하되 네 고유 ID로 각각 성장. 기존 저장값 변경 없음.
- 실제 아이 음성 복제 없음. 각자 고른 캐릭터 성우의 전용 함성을 돌진·필살·무쌍에 재생. 로딩 실패 때 다른 장수의 함성·들숨으로 대체하지 않음.

## 함성 적용 (2026-09-30)

사용자가 정한 대사: 태오 “쓰구미!”, 재이 “김태오!”, 윤찬 “마마보이!”, 윤건 “너무 쉽잖아!”. 최초 시안 청취 후 사용자가 윤건의 문구 수정과 계속 진행을 요청하여 윤건만 v2로 재생성하고 배너·대본·게임을 연결했다.

ElevenLabs eleven_v3, Liam / Jessica / Will / Charlie의 창작 캐릭터 연기이며 실제 아이 목소리를 복제한 것이 아니다. 음절 분할·피치 변형 없음. 앞뒤 무음 정리와 볼륨 정규화만 적용. 첫 시안 4개, 윤건 수정 1개를 생성했다. 현재 키에 잔여 크레딧 조회 권한이 없어 실제 과금량은 확인하지 못했다.

게임용 파일은 `audio/hero-callouts-eleven-v1/` 아래 `taeo-callout-v1.wav`, `jaei-callout-v1.wav`, `yunchan-callout-v1.wav`, `yungeon-callout-v2.wav`. 세 기술이 캐릭터별 같은 대표 대사를 공유하며 재생속도 1.0, 이전 음성 페이드아웃, 효과음·배경음 감쇠를 사용한다. 원시 시안과 구 문구는 `audio/elevenlabs-auditions/family-v1/`에 보존하고 배포·오프라인 저장에서는 제외한다.

## 승인한 어린이풍 함성 v2 (2026-09-30)

대사와 연기 시안을 사용자 청취 후 승인받아 `audio/hero-callouts-eleven-v2/`의 네 WAV로 연결했다. 기존 v1 파일과 시안은 덮어쓰지 않았다.

- 태오: 5살 남자아이풍, Liam, “치앗! 촤! 지앗! 촤! 쓰구미이이!”, 3.324초.
- 재이: 8살 여자아이풍, Jessica, “김태오!”, 0.949초.
- 윤찬: 10살 남자아이풍, Will, “마마보이!”, 1.309초.
- 윤건: 7살 남자아이풍, Liam, “너무 쉽잖아!”, 1.676초.

나이는 창작 캐릭터의 연기 목표이며 실제 아이의 녹음·복제나 음성 나이 인증이 아니다. 생성 지시는 아래 manifest에 기록했다. 성인 성우의 창작 연기, 원음 속도 1.0, 피치 변형 없음. 돌진·필살·무쌍은 승인한 대표 함성을 공유하고 연속 입력은 기존 75ms 교차 페이드로 처리한다. 미리듣기 “우리 영웅” 탭에서 게임과 같은 파일을 재생한다. 추가 API 생성 없이 승인한 WAV를 그대로 복사했다.

카드게임에도 동일한 WAV 경로를 재사용한다. 가족 네 카드의 큰 기술(`vfx.big`)·궁극기만 함성을 한 번 재생하며 작은 공격·방어·휴식은 조용히 유지한다. 별사탕, 카드 해금, 피해량과 기술 이름은 바꾸지 않는다. 기존 CardAudio 그래프를 공유하고 음소거·복귀·화면 이탈·대결 종료는 즉시 취소한다. 다음 함성은 75ms 페이드로 이전 함성을 교체하고 600ms 이상 늦은 로딩은 발동하지 않는다. `node --test cards/tests/family-voices.test.js` 및 `node cards/tests/family-voices-browser.cjs`로 검증한다.

## 검증

2026-09-30 기술 확장: 필살/무쌍이 공통 광역 1타에서 전용 다단 판정으로 바뀌었다. 태오는 전방 발차기 3타, 재이는 주변 방울 파동 2회와 일반 적 420/700ms 속박(보스 140ms), 윤찬은 반딧불 추적탄 3회, 윤건은 불꽃 슛 3회다. 기본 피해 예산 82/110과 체력·기운 비용은 유지하고 마지막 타격의 밀어내기를 강화했다. 느린 프레임에서 건너뛴 타격도 1회씩 처리하며, 피격 효과와 실제 투사체 위치를 연결했다. 기술 설명은 우리 영웅 선택 바로 아래에 표시한다.

`node --test sanguo/tests/family-techniques.test.cjs`는 다단 중복 방지·합산 피해·양방향 표적·추적 조향을 검증한다. 실제 전투 판정은 `node sanguo/tests/family-heroes.cjs`에서 함께 검증한다.

- 브라우저: 휴대폰·아이패드 메뉴, 세 작품 × 네 영웅 × 두 화면크기의 이야기 진입/복귀 24회.
- 네 영웅 전투 로딩, 공격·원거리·차지·돌진·필살·무쌍 총 24회 명중, 차지 피해 증가, 터치/키보드 입력.
- 네 장 투명 PNG alpha, 기술명·원거리 버튼 라벨, 발 앵커와 전투 크기 시각 확인.
- 기존 장수 메뉴, 한국 명장 4전장, ElevenLabs 재생 경로 회귀 통과.
- 실제 가족 음성 파일 4명 × 돌진·필살·무쌍 12회 재생 경로, 원음 속도, 함성 중복 방지, 음소거, 기존 장수 폴백 검증.

## 그림 제작 상세

Built-in image_gen 모드, 원본 cards/art/{id}.webp를 얼굴·의상 참조로 사용. 2×2 투명 PNG, 좌상 대기·우상 달리기·좌하 공격·우하 강공. 생성 결과 원본 픽셀과 alpha를 수정하지 않고 아래 파일에 복사했다.

- art/side-scroller/taeo-painted-sheet-v1.png
- art/side-scroller/jaei-painted-sheet-v1.png
- art/side-scroller/yunchan-painted-sheet-v1.png
- art/side-scroller/yungeon-painted-sheet-v1.png

## 최종 프롬프트 세트

### taeo

Use case: stylized-concept. Asset type: production transparent 2D action game sprite atlas. Input image 1 is character identity/outfit reference, NOT background. Create a square atlas of exactly FOUR full-body poses of the SAME child in an exact equal 2 by 2 grid. Each pose fully contained in its quadrant with generous transparent gaps, no limbs crossing midlines. All poses face RIGHT in 3/4 side view. Consistent head size, body proportions and lighting. Each pose's lowest foot at 91% of its quadrant height, torso center at 47% width. Polished hand-painted storybook action-RPG render, crisp silhouette readable at 120px, dimensional shading, charming confident expression, child-friendly, no injuries. Background genuinely transparent alpha, no scene, no floor, no text, no panel borders, no ground shadow, no watermark, no motion trails or detached VFX (engine adds those). Top-left = relaxed ready idle; top-right = running RIGHT; bottom-left = normal attack RIGHT; bottom-right = strong special attack RIGHT.
Subject: Taeo, same young boy, tousled short brown hair, round bright face as reference. Keep white taekwondo dobok with blue belt edged green and bare feet, no armor, no weapons. Bottom-left a firm rightward side kick with one foot planted; bottom-right a powerful rightward high roundhouse kick balanced on one grounded foot. Preserve his identifiable face and white uniform in all four poses.

### jaei

Use case: stylized-concept. Asset type: production transparent 2D action game sprite atlas. Input image 1 is character identity/outfit reference, NOT background. Create a square atlas of exactly FOUR full-body poses of the SAME child in an exact equal 2 by 2 grid. Each pose fully contained in its quadrant with generous transparent gaps, no limbs crossing midlines. All poses face RIGHT in 3/4 side view. Consistent head size, body proportions and lighting. Each pose's lowest foot at 91% of its quadrant height, torso center at 47% width. Polished hand-painted storybook action-RPG render, crisp silhouette readable at 120px, dimensional shading, charming confident expression, child-friendly, no injuries. Background genuinely transparent alpha, no scene, no floor, no text, no panel borders, no ground shadow, no watermark, no motion trails or detached VFX (engine adds those). Top-left = relaxed ready idle; top-right = running RIGHT; bottom-left = normal attack RIGHT; bottom-right = strong special attack RIGHT.
Subject: Jaei, same young girl, long straight brown hair with bangs, warm bright eyes as reference. Keep pink bunny-pattern pajamas with long sleeves and pants, white piping and bunny slippers, modest practical outfit. Fantasy bubble mage. Idle hand raised; running with long hair streaming; bottom-left hand extending right to cast a bubble (no bubble baked in); bottom-right both palms pushing right with strong magic-casting pose. Preserve her recognizable face, hair, clothing and consistent age in every pose.

### yunchan

Use case: stylized-concept. Asset type: production transparent 2D action game sprite atlas. Input image 1 is character identity/outfit reference, NOT background. Create a square atlas of exactly FOUR full-body poses of the SAME child in an exact equal 2 by 2 grid. Each pose fully contained in its quadrant with generous transparent gaps, no limbs crossing midlines. All poses face RIGHT in 3/4 side view. Consistent head size, body proportions and lighting. Each pose's lowest foot at 91% of its quadrant height, torso center at 47% width. Polished hand-painted storybook action-RPG render, crisp silhouette readable at 120px, dimensional shading, charming confident expression, child-friendly, no injuries. Background genuinely transparent alpha, no scene, no floor, no text, no panel borders, no ground shadow, no watermark, no motion trails or detached VFX (engine adds those). Top-left = relaxed ready idle; top-right = running RIGHT; bottom-left = normal attack RIGHT; bottom-right = strong special attack RIGHT.
Subject: Yunchan, same school-aged boy with short black side-parted hair, thick eyebrows, cheerful face. Keep cyan shirt, black and cyan field vest, matching shorts, brown hiking boots, small notebook in vest pocket. Insect explorer with a long wooden-handled butterfly net with white mesh, no box. Top-left holds net upright; running holds it angled safely behind; bottom-left swings net forward RIGHT; bottom-right strong forward sweeping net swing. Net fully contained each quadrant. Same face and outfit every pose.

### yungeon

Use case: stylized-concept. Asset type: production transparent 2D action game sprite atlas. Input image 1 is character identity/outfit reference, NOT background. Create a square atlas of exactly FOUR full-body poses of the SAME child in an exact equal 2 by 2 grid. Each pose fully contained in its quadrant with generous transparent gaps, no limbs crossing midlines. All poses face RIGHT in 3/4 side view. Consistent head size, body proportions and lighting. Each pose's lowest foot at 91% of its quadrant height, torso center at 47% width. Polished hand-painted storybook action-RPG render, crisp silhouette readable at 120px, dimensional shading, charming confident expression, child-friendly, no injuries. Background genuinely transparent alpha, no scene, no floor, no text, no panel borders, no ground shadow, no watermark, no motion trails or detached VFX (engine adds those). Top-left = relaxed ready idle; top-right = running RIGHT; bottom-left = normal attack RIGHT; bottom-right = strong special attack RIGHT.
Subject: Yungeon, same young soccer boy, tousled brown hair, golden-brown eyes, playful confident face. Keep bright yellow-orange soccer uniform, orange horizontal chest stripe, yellow shorts, orange knee socks and cleats. No logos or numerals. Top-left ready standing with small classic black-white soccer ball by foot; top-right dribbling right with ball; bottom-left rightward passing kick; bottom-right powerful rightward shooting kick. For attack poses omit ball because game spawns projectile. No flames baked in. Same face, size, outfit in all four.
