# 영어 읽기 피드백 구현 검증 — 2026-09-06

기준 커밋: 6bc2e83. 로컬 구현·검증 완료. 사용자 승인에 따라 3연속 클립 길이 제한 제거. 배포 완료: 0d6029f359b1dff707308eae6fbe2de72680a812 (https://seangold8888.github.io/).

## 구현

- 첫 시도 / 다시 읽기 / 세 번 연속 칭찬 클립 선택, 직전 클립 반복 방지.
- 세션 메모리에서 연속 횟수 관리; 실패·마이크 오류 시 리셋.
- 인식기 stop() 후 onend 확인 뒤 음성 재생. 600ms 동안 종료가 확인되지 않으면 중단하고 음성 생략.
- 빨간 단어만 문장 순서로 중복 제거 후 최대 3개, 로컬 en-US 음성 우선, rate 0.8, 간격 400ms.
- 읽는 단어 노란색 강조. 안내 중 다시 읽기 비활성, 별도 ‘안내 멈추고 읽기’ 버튼으로 취소 후 녹음.
- 숨김·화면 종료·폐기 시 음성 취소. 음성 종료 후 마이크 자동 시작 없음.
- 기존 정답·복습 기록 유지. 칭찬 종료 뒤 기존 1600ms/650ms 추가 대기 제거.
- english-reading.js?v=4, 서비스 워커 v39, MP3 9개 CORE_SHELL 프리캐시.
- MP3 응답이 STATIC_CACHE도 조회하도록 연결; Safari Range 요청 오프라인 응답 확인.

## 검증

명령: node --test cards/tests/hub-english-reading.test.js cards/tests/hub-english-feedback.test.js cards/tests/hub-study-rounds.test.js cards/tests/pwa.test.js

PWA 포함 이전 전체 검사: 51개 중 49개 통과(아래 기존 실패 2개).
길이 제한 변경 후 읽기·음성·학습 진행 검사: 36개 모두 통과.
PWA 실패 2개는 읽기 변경을 제거한 비교 실행에서도 동일하게 재현:
- 기존 작업에서 참조한 kedehun/art/characters/lumi-attacks-v1.png 파일 누락.
- 기존 Avengers 마이그레이션 코드 위치 검사 실패.

Chromium, 820×1180 터치 뷰포트:
- 실제 HTMLAudio로 칭찬 재생 및 세 번째 전용 클립 선택 확인.
- 제한 해제 후 threeinarow.mp3 자연 종료 이벤트 확인: currentTime = duration = 3.060104초.
- 실패 단어 강조 및 안내 중단 후 녹음 전환 확인.
- 모의 인식기에서 음성 재생과 마이크 활성 겹침 0건, 페이지 오류 0건.
- 인식기·단어 합성은 모의 객체이므로 실제 iPad Safari 마이크/스피커 되먹임 0건은 아직 실기 검수가 필요함.
- 스크린샷 및 로그: C:/Users/김시현/game-hub/reading-feedback-qa/

## 확정된 3연속 재생 정책

사용자 승인(2026-09-06): 3연속 칭찬의 1.8초 길이 제한 제거.

- 일반 8개 클립(1.057~1.654초): 기존 1.8초 상한 유지.
- threeinarow.mp3(3.060104초): 종료 이벤트까지 전체 재생한 뒤 다음 문제로 이동.
- 재생 진행 이벤트마다 오류 복구 타이머를 갱신하므로 총 길이로 자르지 않음. 진행이 5초 동안 없을 때만 정체 상태를 복구.
- 재생 중 마이크 비활성, 끝난 뒤 자동 재시작 없음.
- 원본 녹음 유지. 공개 사이트에 배포 완료. 실제 iPad 검수는 아직 필요함.

## 배포 확인

- 별도 작업 공간 deploy-reading-feedback-v39에서 영어 읽기 변경 7개 파일만 커밋·푸시. 기존 다른 게임 작업 변경은 보존.
- 배포 후보 검사 53개 중 52개 통과; 기존 Avengers 검사 1개 실패. 배포 후보에는 누락된 다른 게임 이미지 참조 없음.
- 공개 index.html, sw.js, english-reading.js 응답이 배포 파일과 일치하고 칭찬 MP3 9개도 원본 바이트와 일치함.
- 공개 사이트에서 가져온 JS·MP3로 브라우저 검증 통과. 전용 음성 currentTime = duration = 3.060104초, 페이지 오류 0건.
- 원래 site 작업 공간의 main은 다른 진행 중 변경을 보존하려고 이동하지 않았음. origin/main과 배포 작업 공간 HEAD는 0d6029f.
- 배포 검증 로그: C:/Users/김시현/game-hub/reading-feedback-qa/deployment-results.json 및 published/browser-results.json.
