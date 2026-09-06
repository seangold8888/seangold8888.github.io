# 메뉴 v4 및 5버튼 전투

이 배포는 별도 저장소에서 최신 원격 main을 기준으로 준비했다.
기존 공유 작업 폴더의 main과 미커밋 변경은 수정하지 않았다.

- 전장 목록 / 장수 카드 / 고정 출진 버튼으로 메뉴 재구성.
- 폰의 전장 목록은 변경 버튼으로 펼침. 긴 설명은 자세히로 접음.
- 장수 선택과 출진을 분리하고 브리핑 복귀 시 선택을 유지.
- 입체형 5버튼, 장수별 돌진기 및 쿨다운 표시.
- 실행 소스는 src/main.js를 시작점으로 한 ES modules.
- 구 번들은 롤백용으로 보존하되 index.html에서 실행하지 않음.
- 사용자 저장 데이터 키 및 기존 에셋 경로 유지.

## 재현 가능한 테스트

- node --test sanguo/tests/dash-skills.test.cjs
- Playwright NODE_PATH 환경: node sanguo/tests/menu.cjs
- node --test --test-name-pattern="cache generation" cards/tests/pwa.test.js
- node sanguo/preview-server.cjs

1180×820 / 768×1024 / 390×844 배치, 출진 및 복귀, 작품/장수/난이도,
준비 중 전장, 키보드 출진, 실제 전투 진입을 검사한다.

## 기존 미해결

마초·황충은 원화 미비로 아직 선택 불가. 돌진 설정만 준비되어 있다.
조운 등 일부 장수의 일반 활·승마 자세 미지원은 이번 배포에서 해결하지 않았다.
선풍참/반격 연속기 및 게임패드 지원은 이번 범위 밖이다.
