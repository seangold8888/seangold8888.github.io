# 서유기 X2 검증 기록

2026-09-08. X2: 이랑진군 플레이·탄궁, 연화동/화운동/사타령 보스 3종 전용 원화.

## 결과

- 전장 8개와 챕터 01~08 순서 유지. 메뉴 1180×820, 768×1024, 390×844에서 선택·초상화 디코딩·출진·복귀 통과.
- 이랑진군 기본/탄궁 원화 분리. 사거리 118/90 반영, 말 폴백 없음. HUD 탄궁 표기.
- 전투 진행 24개 조합 모두 실제 게임 코드로 7파도 승리. 이랑진군 천궁/사타령 포함.
- 이랑진군 탄궁 실제 명중 피해: 탭 43, 차지 69. 테스트 조건의 돌진 89, 필살 98, 무쌍 132.
- 은각대왕/홍해아/대붕금시조 전용 스프라이트와 최종 파도 확인. 보스 프로필 피해 25/26/30.
- 세 전장의 교육 문구가 설계서와 일치하고 승리 화면에서 펼쳐 읽기와 버튼 접근 가능.
- 신규 원화 5장 모두 투명 배경, 선택 프레임 경계 불투명 픽셀 0. 메뉴와 보스 화면 캡처 육안 확인.
- X1 통합 및 모바일 세로/터치 가로, 확대·전체화면 가드 회귀 통과.
- 이동 경계/30종 돌진 데이터/승마 스프라이트 단위 테스트 13/13 통과.
- 서비스워커에 게임 미디어 178개 등록. 최신 카드 28장·카드 자산 v28 보존, 공유 캐시 v60.
- X2 전투 브라우저 페이지 오류 0, HTTP 400 이상 0.

전체 허브 PWA 검사는 부분 체크아웃에 없는 루트·카드·스토리·어벤져스 파일 때문에 7건이 누락 오류였다(10건 통과). 서유기 미디어·캐시 세대에 해당하는 2건을 별도 실행해 2/2 통과했다. 전체 허브 통과로 주장하지 않는다.

## 재현

```sh
node sanguo/tests/xiyou-x2.cjs
node sanguo/tests/xiyou-x1.cjs
node sanguo/tests/combat-playthrough.cjs
node sanguo/tests/art-atlas.cjs
node sanguo/tests/mobile-viewport.cjs
node --test sanguo/tests/dash-skills.test.cjs sanguo/tests/combat-bounds.test.cjs sanguo/tests/mounted-sprites.test.cjs
node --test --test-name-pattern="checked-in Sanguo|cache generation" cards/tests/pwa.test.js
```

Node와 Playwright/Chromium, sharp가 필요하다. 이번 검증은 OneDrive가 아닌 Codex 번들 런타임을 NODE_PATH로 사용했다. XIYOU_QA_OUTPUT을 지정하면 메뉴·보스·승리 화면을 외부 폴더에 저장한다.

전투 자동 검증은 테스트 응답에만 내부 접근을 주입하고 적 피해를 차단해 진행·명중을 검증한다. 실제 아이패드 성능, 아이의 난이도와 홀드 감각 검증을 대신하지 않는다. 홍해아 플레이와 풍화륜은 X3, 페인팅 배경은 X4로 남는다.
