# 서유기 X4 검증 기록

검증일: 2026-09-09

## 결과

서유기 8개 전장에 3층 그림 배경을 연결했고 로컬 통합·회귀 검증을 모두 통과했다.

| 전장 | 원경 | 투명 중경 | 지면 | Chromium 합성 | 종료 시 해제 |
|---|---:|---:|---:|---:|---:|
| 화과산 | PASS | PASS | PASS | PASS | PASS |
| 동해 용궁 | PASS | PASS | PASS | PASS | PASS |
| 천궁 | PASS | PASS | PASS | PASS | PASS |
| 백호령 | PASS | PASS | PASS | PASS | PASS |
| 연화동 | PASS | PASS | PASS | PASS | PASS |
| 화운동 | PASS | PASS | PASS | PASS | PASS |
| 화염산 | PASS | PASS | PASS | PASS | PASS |
| 사타령 | PASS | PASS | PASS | PASS | PASS |

## 구현 검증

- `WORK_STAGES`의 8개 서유기 전장이 각각 고유한 far/mid/ground 경로를 가진다.
- 브라우저 계측에서 전장마다 정확히 3개 배경 요청과 3개 그림 레이어 draw가 발생한다.
- 시차는 far 0.06, mid 0.30, ground 1.0이다.
- 중경 투명 픽셀 비율은 68.3~80.5%로 중앙 전투 시야가 열린다.
- 지면 상단 18% 알파 페이드 버퍼로 원경과 지면의 수평 경계를 완화한다.
- 화운동·화염산의 불티와 사타령 금빛 입자는 그림 배경에서도 유지된다.
- 어느 한 레이어라도 실패하면 세 레이어 전체를 버리고 기존 절차 배경을 사용한다.
- 전투 종료 시 스테이지 배경 이미지 캐시, 번들 캐시, 지면 합성 버퍼를 해제한다.
- 백호령에는 해골·뼈·빈 눈구멍이 없다.
- 640×400 캡처 8장을 시각 검수했고 HUD·스틱·5개 행동 버튼과 캐릭터가 배경보다 선명하다.

## 자동 검증

```text
node --test sanguo/tests/combat-bounds.test.cjs sanguo/tests/dash-skills.test.cjs sanguo/tests/mounted-sprites.test.cjs
PASS 13/13

node --test --test-name-pattern="all checked-in Sanguo|cache generation" cards/tests/pwa.test.js
PASS 2/2 — 게임 미디어 207개, cache v63, 카드 v30 보존

node sanguo/tests/menu.cjs
PASS — 1180×820, 768×1024, 390×844

node sanguo/tests/art-atlas.cjs
PASS

node sanguo/tests/combat-playthrough.cjs
PASS — 26개 조합, 각 7파도·40KO·승리

node sanguo/tests/mount-browser.cjs
PASS — 관우·조운·조조·마초 보행/승마/활/대시

node sanguo/tests/mobile-viewport.cjs
PASS — 세로/가로, 확대·제스처 방지와 왼쪽 스틱 유지

node sanguo/tests/xiyou-x1.cjs
node sanguo/tests/xiyou-x2.cjs
node sanguo/tests/xiyou-x3.cjs
node sanguo/tests/xiyou-x4.cjs
PASS — X1~X4 전체
```

## 시각 검증 산출물

제품 저장소 밖의 `C:\Users\김시현\outputs\sanguo-xiyou-x4\`에 8개 전장 PNG/JPEG 캡처를 보관했다. 테스트가 만든 저장소 내부 임시 `sanguo/qa` 폴더는 검증 후 삭제했다.

## 남은 실기기 확인

자동 검증은 실제 iPad 프레임률이나 아이 손의 조작 감각을 대신하지 않는다. 배포 후 실제 iPad에서 각 전장 1회 진입, 회전 뒤 왼쪽 스틱 유지, 260ms 홀드 감각을 최종 확인한다.
