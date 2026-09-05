# 삼국지 별빛 연대기 — 전투 v2 설계서: 4버튼 연속기 + 실전 배경

> 작성: 클로드(기획) → 구현: 코덱스. 이 문서가 단일 기준(source of truth).
> 소스: `C:\Users\김시현\OneDrive\문서\vesper-sgz` (Vite). 배포: `game-hub\site\sanguo` (경로 재작성 후 `git add sanguo`).
> **OneDrive 폴더는 재귀 검색 금지.** 이 문서에 적힌 파일:줄 번호로 직접 열 것.

## 0. 한 줄

공격 버튼을 **근접 · 활 · 필살 · 승마 4개**로 고정하고, 강공·돌진·선풍참·반격은 **버튼 조합(연속기)**으로 낸다.
배경은 단색 실루엣 절차 생성을 버리고 **장수 원화와 같은 실사풍 페인팅 전장**으로 바꾼다.

## 1. 현재 상태 진단 (2026-09-05 실측)

### 1-1. 조작 — "버튼이 너무 많다"의 실체

| 입력 경로 | 공격계 행동 수 | 근거 |
|---|---|---|
| 키보드 | **10** (attack·heavy·ranged·musou·jump·mount·special·dash·whirlwind·counter) | `src/game/sideScroller.js:993` `actions` 맵 |
| 터치 버튼 | 4 (활·필살·승마·공격) + 스틱 | `src/game/hud.js:31-37` |
| **캔버스 탭 (보이지 않음)** | 3 (좌 38% = 이동, 우측 위 = 강공, 우측 아래 = 공격) | `sideScroller.js:1004-1007` `onPointer` |
| 스틱 튕김 | 점프 | `sideScroller.js:1034-1035` |
| HUD 안내 문구 | **12개 키** 나열 | `sideScroller.js:1135`, `hud.js:30` `.controls` |

문제 정리:
1. 터치에서는 강공·돌진·선풍참·반격·점프버튼이 **아예 닿지 않고**, 키보드에서는 10개가 흩어져 있다. 같은 게임인데 기기별 기술 수가 다르다.
2. 캔버스 빈 곳을 누르면 **보이지 않는 구역**이 강공/공격/이동을 발동한다. 아이패드에서 아이가 화면을 짚을 때마다 캐릭터가 멋대로 움직이거나 휘두르는 원인.
3. 연속기가 이미 하나 있다 — 약·약·약 뒤 4번째 공격 = 강공 마무리(`sideScroller.js:1613-1617`, `comboStep`, `comboUntil=1150ms`). 이 골격을 확장하면 된다.
4. 성장 특성이 돌진·선풍참·3연격 마무리에 걸려 있다(`progression.js:87-96`). 행동 타입 이름(`dash`·`whirlwind`·`heavy`)을 유지해야 특성이 그대로 붙는다.

### 1-2. 배경 — "그리다 만 것 같다"의 실체

- 전 스테이지가 `src/game/scenery.js` 절차 생성: 하늘 그라디언트 + 단색 실루엣 층 2~4개(`ridge`/`wall`/`banners`/`crags`) + 사각 불티. 지면은 그라디언트 띠뿐 — 장수가 **허공에 떠 보인다**.
- 장수·적·상자는 실사풍 페인팅 원화. 배경만 벡터 실루엣이라 **화풍이 충돌**한다. 이것이 미완성으로 읽히는 근본 원인.
- 그려둔 배경이 하나 있다: `public/art/side-scroller/hulao-arcade-bg-v3.png` (960×540, 성문·깃발·화로·산맥, 완성도 높음). 그러나 **죽은 코드**다.
  - `sideScroller.js:1091` `scene: SCENES[stageKey] ? stageKey : 'hulao'` → 모든 스테이지가 SCENES에 있으므로 항상 절차 배경 선택
  - `sideScroller.js:1114` `scenery = stageInfo ? createScenery(...) : null` → 항상 non-null
  - `sideScroller.js:1840` `if (scenery) { ...; return; }` → 그림 배경 분기에 도달 불가
  - 매 전투마다 553KB를 로드만 하고 버린다(`sideScroller.js:81`, `ART.background`).
- `gamedata.json` `ACTION_STAGES[*].far/mid/colors`는 옛 아케이드판 이모지 배경 기술자로, 현재 엔진이 읽지 않는다. 새 `bg` 필드를 여기에 두면 된다.

### 1-3. 아이패드 실측 좌표 (1180×820, 터치)

스틱 좌하 (14,660) 148px. 버튼: 활 (1012,634) 72px · 필살 (1094,634) 72px · 승마 (1012,736) 72px · 공격 (1074,716) 92px. HUD 키 안내는 터치에서 숨김(`display:none`) — 즉 터치 사용자는 연속기 존재를 알 길이 없다.

## 2. v2 범위

**한다**
- 4버튼 조작 체계 + 연속기 문법 (A 파트)
- 캔버스 보이지 않는 탭 구역 제거
- 키보드·게임패드를 같은 4행동으로 통일
- 연속기 시각 안내(체인 핍)와 문구 갱신
- 실사풍 전장 배경 시스템 + 삼국지 10전장 그림 (B 파트). 호로관은 기존 그림을 즉시 연결

**안 한다**
- 새 기술 추가, 피해 수치 밸런스 변경, 적 AI 변경
- 서유기·수호지 배경 (같은 시스템으로 후속. 코드는 작품 무관하게 짠다)
- 3D 잔존 코드(`battle.js`·`controller.js`) 정리 — main.js가 import하지 않는 죽은 코드지만 이번 범위 밖

## 3. A 파트 — 4버튼 연속기

### 3-1. 버튼 정의

| 버튼 | 터치 라벨 | 키보드 | 패드 | 탭 | 홀드 (≥ 260ms) |
|---|---|---|---|---|---|
| **근접** | 공격 | J, Space | A | 약공 1→2→3, 4탭 = 강공 마무리 (기존) | **강공격** 즉발 |
| **활** | 활 | K | X | 원거리 1발 (기존) | **차지샷**: 피해 ×1.6, 관통 +1 |
| **필살** | 필살/무쌍 | L | B | 무쌍 게이지 100 → 무쌍, 아니면 고유 필살기 (기존) | (없음) |
| **승마** | 승마 | F | Y | 탑승/하마 (기존) | (없음) |

이동은 스틱/WASD/방향키/좌스틱. **점프는 스틱을 위로 튕기기**(기존) 하나로 통일. 키보드는 W 두 번 빠르게(≤ 220ms). SHIFT·기타 키 점프 폐기.

### 3-2. 연속기 문법 (기존 행동 타입 재사용)

| 이름 | 입력 | 발동 행동 타입 | 기존 조건 유지 |
|---|---|---|---|
| 3연격 마무리 | 근접 ×3 → 근접 (1150ms 창) | `heavy` | 그대로 |
| 강공격 | 근접 **홀드** | `heavy` | 그대로 |
| **돌진** | 스틱 기울인 채(\|axis\| ≥ .5) 근접 탭 | `dash` | 쿨다운 2600ms × growth.cooldown |
| **선풍참** | 근접 ×3 → **활** (1150ms 창) | `whirlwind` | 쿨다운 4200ms × growth.cooldown, 무쌍 25 소모 |
| **반격** | 적 공격 예고 중 **필살** 탭 (무쌍 < 100) | `counter` | 쿨다운 3200ms |
| 차지샷 | 활 **홀드** | `ranged` + `charged:true` | 신규 플래그 |
| 기마 연격 | 탑승 중 근접 | `mountedThrust` | 그대로 |
| 기마 궁술 | 탑승 중 활 | `ranged` | `supportsMountedRanged` 그대로 |

규칙:
- 연속기 창 = 기존 `comboUntil` 1150ms. 마무리(heavy·whirlwind) 뒤 `comboStep = 0`으로 사슬 끊기 (기존 `:1616` 로직 유지).
- **홀드 판정 260ms** — 탭과 겹치지 않도록 pressed 시점에 즉시 발동하지 말고, 260ms 안에 release → 탭, 넘기면 → 홀드. 탭 지연을 없애려면 "release 시 탭 발동"으로 구현. 약공 체감이 늦어지면 200ms까지 낮춰 테스트.
- 돌진 조건의 `axis`는 `input.axis()` 절댓값. 제자리 근접은 항상 약공.
- 반격 판정 창: `enemy.telegraphUntil`(이미 예고 배너를 띄우는 적 공격 흐름이 있음 — `sideScroller.js:1747` 참고)이 살아 있는 동안만. 창 밖 필살 = 고유 필살기(기존).
- 쿨다운 중 조합 입력 → 기존 배너 문구 그대로 표시("돌진 재사용 대기 N초" 등, `sideScroller.js:1451-1455`).
- 성장 특성 "신속한 호흡"(돌진·선풍참 -12%), "연계 숙련/절정의 연계"(3연격 마무리 피해)는 행동 타입이 같으므로 자동 적용. **회귀 테스트로 확인.**

### 3-3. 입력 계층 변경 (`createInput`, `sideScroller.js:990-1062`)

1. `actions` 맵을 4행동으로 축소: `{ Space:'attack', KeyJ:'attack', KeyK:'ranged', KeyL:'skill', KeyF:'mount', KeyM:'mute' }`. `skill`은 터치와 동일하게 무쌍/필살 겸용(기존 `:1604`).
2. `onPointer`(`:1004-1007`) **삭제**. 캔버스 탭은 아무 것도 하지 않는다. `canvas.addEventListener('pointerdown', onPointer)`와 `destroy`의 대응 제거.
3. 홀드 지원: `pressed`(Map name→downAt) 옆에 `released`(Map name→upAt) 추가. `onTouchUp`·`onUp`에서 기록. 새 API:
   - `consumeTap(name)`: release 됐고 hold < 260ms 이면 true
   - `consumeHold(name)`: down 상태 260ms 경과 시 1회 true (걸쇠)
   - 기존 `consume(name)`은 `mount`·`skill`·`mute`처럼 홀드 구분 없는 행동에 유지
4. 게임패드: `navigator.getGamepads()` 폴링, 표준 매핑 buttons[0]=A 근접, [2]=X 활, [1]=B 필살, [3]=Y 승마, axes[0..1] 이동, 좌스틱 위 튕김 = 점프. 현재 패드 코드 없음(grep 0건) — 신규.
5. 점프: `stick.jumpLatch`(기존) + 키보드 W 더블탭.

### 3-4. 디스패치 변경 (`sideScroller.js:1598-1637`)

우선순위(위가 먼저):
```
counter  ← skill 탭 && telegraph 창 && rage<100 && 쿨다운 OK
musou    ← skill 탭 && rage>=100
special  ← skill 탭
whirlwind← ranged 탭 && comboStep===3 && now<comboUntil
ranged(charged) ← ranged 홀드
ranged   ← ranged 탭
dash     ← attack 탭 && |axis|>=.5 && 쿨다운 OK
heavy    ← attack 홀드  |  attack 탭 && comboStep===3 && now<comboUntil
attack / mountedThrust ← attack 탭
mount    ← mount 탭 (actionUntil 무관, 기존)
jump     ← 스틱 튕김 / W 더블탭
```
기존 `input.consume('heavy'|'dash'|'whirlwind'|'counter'|'special'|'musou'|'jump')` 분기는 모두 제거.

### 3-5. 안내·표시

- HUD `.controls`(`sideScroller.js:1135`, `hud.js:30`) → 4항목: `근접 J · 활 K · 필살 L · 승마 F`. 하단에 연속기 4줄: `약약약＋근접=강공 마무리 / 약약약＋활=선풍참 / 달리며 근접=돌진 / 근접 꾹=강공`.
- 타이틀 조작표(`ui/title.js:29`) 동일 4항목으로.
- 배너 문구 갱신: `sideScroller.js:1632` `'T 기마궁술 · SPACE 기마 연격'` → `'활=기마궁술 · 근접=기마 연격'`, `'T 근두운 파초선 · SPACE 여의봉 연격'` → `'활=파초선 · 근접=여의봉 연격'`; `:1747` `'점프(SHIFT)로 피하라'` → `'스틱을 위로 튕겨 점프'`; `:1621` `'F로 하마'` → `'승마 버튼으로 하마'`; `:1595` M 음소거 유지.
- **체인 핍**: 공격 버튼 위에 작은 원 3개. comboStep 진행마다 채워지고, 3개 다 차면 공격 버튼 테두리 금색 + 활 버튼 테두리 하늘색으로 "마무리 가능"을 알린다. 창(1150ms) 지나면 비움. CSS만으로 구현(`data-step` 속성).
- 홀드 중 버튼 채움 링(0→260ms) 표시. 260ms 도달 시 짧은 진동(`navigator.vibrate?.(12)`).

### 3-6. 완료 기준 (A)

- 터치·키보드·패드 각각에서 표 3-2의 8개 연속기가 전부 발동 (`data-touch-action` 포인터 이벤트 시뮬레이션 + 키 이벤트로 자동 검증)
- 캔버스 빈 곳 탭 100회 → 플레이어 행동/이동 변화 0
- 근접 탭 체감 지연 ≤ 260ms (release 기준 즉발), 홀드 오발 없음: 탭 80회 중 heavy 0회
- LV.12 저장 데이터로 돌진 쿨다운 2288ms(2600×.88) 확인 — 특성 유지
- HUD·타이틀·배너에 E/T/Q/R/C/X/V/SHIFT 문자열 0건 (`grep`)
- 기존 자동 회귀(있다면) 통과

## 4. B 파트 — 실전 배경

### 4-1. 방향

장수 원화(`*-painted-sheet`)와 같은 **실사풍 페인팅** 전장. 아케이드판 `hulao-arcade-bg-v3.png`가 기준 완성도. 각 전장은 그 전투가 실제로 벌어진 지형·시설·시간대를 그린다. 지면이 **보여야** 한다.

### 4-2. 자산 규격 (1스테이지 = 3장)

| 층 | 파일 | 크기 | 시차 | 내용 |
|---|---|---|---|---|
| far | `public/art/battlefield/{stage}-far-v1.png` | 2048×1152 | 0.06 | 하늘·원경 지형·연기 |
| mid | `public/art/battlefield/{stage}-mid-v1.png` (투명 PNG) | 2048×1152 | 0.30 | 성벽·진영·함선·나무 등 구조물, 원군/적군 실루엣 |
| ground | `public/art/battlefield/{stage}-ground-v1.png` | 2048×512 가로 타일 | 1.00 | 노면·바닥 소품. 이음새 없이 타일 |

- 수평선(지면 상단) = 세로 **60%**. 엔진의 `ground()` floorY와 맞춘다(현재 장수 발끝 ≈ 화면 62~64%).
- 중간 채도 낮게(장수가 튀어야 함), 하늘은 밝게, 지면은 어둡게 — 3층 명도 차 ≥ 25.
- 글자·로고·실존 인물 얼굴 금지. 생성 파이프라인은 장수 원화와 동일(ImageGen + 크로마키 제거, `ART-ASSET-MANIFEST.md` 절차). 매니페스트에 날짜·프롬프트 기록.
- 프레임 예산: 층 3장 = drawImage 3~6회/프레임. 현재 절차 배경도 4층 타일이라 비용 동급.

### 4-3. 삼국지 10전장 그림 지시

| key | 전장 | 시간·날씨 | far | mid | ground |
|---|---|---|---|---|---|
| yellow | 황건적의 난 | 늦은 오후, 연기 | 누런 들녘·낮은 산·불타는 마을 연기 | 초가 마을 담장, 불붙은 집, 노란 두건 깃발 | 마른 흙길, 짚, 부서진 수레 |
| hulao | 호로관 | 황혼 | **기존 `hulao-arcade-bg-v3.png` 재사용** (far+mid 통합판) | — | 돌바닥, 말뚝 울타리 |
| guandu | 관도·오소 | 밤, 불 | 검푸른 밤하늘, 멀리 불타는 군량 창고 | 목책·곡식 더미·군막, 횃불 | 마른 벌판, 곡식 자루 |
| qianli | 천리행 | 새벽 안개 | 겹겹 산과 관문들 | 다섯 관문 성루가 원근으로 이어짐, 원소 깃발 | 산길 흙, 바퀴 자국 |
| changban | 장판 | 정오, 흙먼지 | 뿌연 하늘, 먼 능선 | 흙먼지 속 피난 수레 행렬, 쓰러진 깃발 | 짓밟힌 초원 |
| redcliff | 적벽 | 밤, 화공 | 붉은 절벽, 불타는 조조 함대, 강 위 화염 반사 | **갑판** 난간·돛·밧줄, 화살 박힌 방패 | 젖은 갑판 목재 |
| dongguan | 동관 | 아침, 강안개 | 위수 강물, 반대편 성벽 | 부교·나룻배·갈대 | 진흙 강변 |
| dingjunshan | 정군산 | 흐림 | 겹겹 능선, 소나무 | 고지 목책, 하후연 진영 깃발 | 바위·소나무 뿌리 |
| yiling | 이릉 | 밤, 산불 | 산등성이 전체가 타는 불길 | 불붙은 진영 목책·군막 | 재 덮인 땅 |
| chushi | 출사표·오장원 | 새벽 | 푸른 새벽 고원, 별 | 촉군 진영·수레·깃발 | 고원 풀밭 |

서유기·수호지 4전장(flamemountain·heavenpalace·liangshan·snowshrine)은 **다음 회차**. 그때까지 절차 배경 폴백.

### 4-4. 엔진 변경

1. `gamedata.json` `ACTION_STAGES[key].bg = { far, mid?, ground }` 추가. `works.js` `WORK_STAGES[key].bg`도 같은 형태(후속).
2. `preloadSideScroller`: `stageInfo.bg` 있으면 3장 로드. 실패 시 절차 배경으로 폴백(`console.warn`).
3. `drawBackground()`(`sideScroller.js:1838`) 재작성:
   ```
   if (bgLayers) { far cover-fit 시차 .06 → mid 시차 .30 → (기존 drawAtmosphere) → ground 타일 시차 1.0 ; return }
   scenery.draw(...)  // 폴백
   ```
   기존 `assets.background` 단일 이미지 분기·`ART.background` 상수 제거(호로관은 `bg.far`로 이동).
4. `scenery.js` 유지 — 폴백 + 불티·눈발 입자는 그림 배경 위에도 계속 얹는다(`scene.ember/snow`만 사용).
5. 지면 접지: 장수·적 발 밑 타원 그림자를 `ground` 층 위에 그린다(현재 그림자 유무 확인 — 없으면 추가).
6. 메모리: 스테이지당 3장 ≈ 6~9MB 디코드. 전투 종료 시 `bgLayers = null`.

### 4-5. 완료 기준 (B)

- 호로관에서 `hulao-arcade-bg-v3.png`가 실제로 보인다 (1차 M1)
- 10전장 모두 그림 배경, 폴백 발동 0건 (콘솔 warn 0)
- 스크린샷 대조: 장수 실루엣이 mid 층과 **명도 차 ≥ 25** (Playwright 캡처 후 픽셀 샘플)
- 지면이 보이고 발이 지면에 닿는다 (장수 발끝 y와 ground 층 상단 y 차 ≤ 8px)
- 아이패드 60fps 유지 (기존 대비 프레임 시간 +1ms 이내)

## 5. 마일스톤

| M | 내용 | 검증 |
|---|---|---|
| M1 | 캔버스 탭 제거 + 4키 매핑 + 홀드 입력층 + 호로관 그림 배경 연결 | 완료 기준 A 1·2·3, B 1 |
| M2 | 연속기 8종 디스패치 + 체인 핍 + 문구 갱신 + 패드 | 완료 기준 A 전부 |
| M3 | 배경 시스템(3층) + 적벽·장판·황건 3장 | 완료 기준 B 2~5 (3전장) |
| M4 | 나머지 6전장 그림 | 완료 기준 B 전부 |

M1 끝나면 아이패드로 아이들 실플레이 한 번. 홀드 260ms가 아이 손에 맞는지 여기서 결정.

## 6. 참고 파일:줄

- 입력 생성 `sideScroller.js:990-1062` · 행동 디스패치 `:1598-1637` · `beginAttack` `:1448-1486` · `resolveAttack` `:1497-`
- 배경 `sideScroller.js:1091`, `:1114`, `:1838-1855`, `:81` / `scenery.js` 전체 / `drawAtmosphere` `:1869`
- HUD 마크업 `hud.js:20-45` · 터치 CSS `style/ui.css:535-560` · 타이틀 조작표 `ui/title.js:29`
- 성장 특성 `progression.js:64-96` · 진영 배색 `sideScroller.js:160-174` · 장수 프로필 `:178-199`
- 죽은 코드(범위 밖): `game/battle.js`, `game/controller.js`, `game/combat.js` — main.js 미참조
