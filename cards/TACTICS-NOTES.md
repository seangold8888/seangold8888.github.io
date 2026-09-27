# 작전 배지 업그레이드

- 컬렉션: 접었다 펼치는 작전 도감. 배지 4개와 함께 도전한 영웅 수.
- 전투: 기존 행동 제목 한 줄에 선택 목표. 추가 전투 행이나 수치 변경 없음.
- 결과: 사용한 일반 기술 종류, 실제 방어 피해, 최고 단일 피해와 새 배지.
- 패배해도 배지를 얻음. 날짜 제한, 연속 접속 보상, 카드 능력 보정 없음.
- 새 저장 키 card_tactics_v1만 사용. 기존 학습/해금/원정 저장은 그대로.
- 모듈 불러오기 실패 시 기존 카드 게임은 계속 작동. 저장 실패는 결과에 표시.

배지는 실제 엔진 log로 판정한다. 방어는 guard_block 양수만 인정하며,
조각 연계는 player fragment_used 후 같은 turnNumber의 attack을 요구한다.
한 전투의 결과는 한 번만 정산한다. 도중 이탈은 정산하지 않는다.
필살기는 일반 기술 종류 수와 별도로 배지를 준다.

카드 데이터/전투 엔진/음향/기존 그림/가족 순위는 변경하지 않음.
오행 공격 효과와 함께 배포하는 구성: app v72, tactics JS/CSS v1, root service worker v159.

검사: tactics.test.js; tactics-smoke.cjs (별도 브라우저 컨텍스트의 결과 UI fixture),
card-review-smoke.cjs (5화면 크기), campaign-ui-smoke.cjs, cards/tests 전체.
브라우저 검사는 Edge 뷰포트 검사이며 실제 iPad Safari 검사라고 주장하지 않는다.
