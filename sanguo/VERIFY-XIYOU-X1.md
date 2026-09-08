# 서유기 X1 검증 — 2026-09-08

기준: 원격 00dff6e 위에 동시 확장 4c441fe를 보존하고 X1 원화·플레이 연결을 통합했다.
서비스워커 v56. 원화 제작·최종 경로·프롬프트는 ART-XIYOU-X1.md에 있다.

## 통과 결과

| 검사 | 결과 |
| --- | --- |
| 전투 경계·돌진·승마 단위 검사 | 13/13 통과. 전체 돌진기 데이터 30종 유지 |
| 서비스워커 | 2/2 통과. 게임 PNG/OGG/WAV 173개 등록 일치, 기존 카드 v27 유지 |
| X1 메뉴 | 1180×820, 768×1024, 390×844에서 8전장 01~08 정렬, 나타 선택·초상화·출진·뒤로가기 통과 |
| 미완 장수 잠금 | 천궁의 이랑진군은 원화 미완으로 비활성, 나타는 활성 |
| 나타 기술 | 돌진·필살·무쌍이 실제 적 체력을 감소시킴. 기본 투척 52 / 차지 투척 83 |
| 나타 이동 | 기본 이동 배율 1.40625. 동일 성장 기준 손오공보다 빠름 |
| 보스 | 혼세마왕·오광·백골정의 7번째 웨이브 ID와 전용 원화 로드 확인. 기본 피해 18/21/23 |
| 승리 화면 | lesson/real/fiction 원문 일치. 펼친 뒤 640×400에서도 제목과 재도전·메뉴 버튼까지 스크롤 가능 |
| 아틀라스 | 새 원화 5장 모두 실제 투명 알파. 모든 프레임의 불투명 경계 픽셀 0 |
| 모바일 | 세로·가로·터치 가능한 데스크톱 모드에서 왼쪽 스틱 유지, 전체화면·제스처 가드 통과 |
| 게임 완주 | 22개 조합 모두 7웨이브 실제 공격으로 승리. 삼국지 12, 서유기 8, 수호지 2 |
| X1 브라우저 오류 | pageerror 0, HTTP 400 이상 응답 0 |

서유기 완주 조합: 손오공×화과산/동해/백호령/연화동/화운동/화염산/사타령,
나타×천궁. 수호지: 무송×양산박, 임충×설야 산신묘.
기존 삼국지 메뉴 회귀 검사도 3개 화면 크기에서 통과했다.

## 재현

저장소 루트에서 Node.js와 Playwright/Chromium이 필요하다.
기존 OneDrive node_modules는 사용하지 않았다.

    node --test sanguo/tests/combat-bounds.test.cjs sanguo/tests/dash-skills.test.cjs sanguo/tests/mounted-sprites.test.cjs
    node --test --test-name-pattern="checked-in Sanguo|cache generation" cards/tests/pwa.test.js
    node sanguo/tests/xiyou-x1.cjs
    node sanguo/tests/art-atlas.cjs
    node sanguo/tests/combat-playthrough.cjs
    node sanguo/tests/mobile-viewport.cjs
    node sanguo/tests/menu.cjs

스크린샷:
C:/Users/김시현/outputs/sanguo-xiyou-x1/merged
환경변수 XIYOU_QA_OUTPUT을 지정하면 새로 생성된다.

## 한계 / 다음

- 전투 시뮬레이션은 테스트 응답에만 내부 접근 훅을 넣고 적 피해·오디오·실시간 루프를 비활성화한다.
  시간 진행으로 공격·투사체·적 경계·7웨이브를 검사하므로 실기기 프레임률/난이도 검증은 아니다.
- X1 난이도는 아이패드에서 화과산 수련으로 확인해야 한다.
- 8전장 데이터는 이미 있으나 후속 영웅 2명과 후속 보스 3명의 전용 원화는 아직 없다.
  풍화륜 탑승·전용 후속 연출·3층 그림 배경도 다음 마일스톤이다.

