# 서유기 X3 검증 기록

2026-09-09. X3: 플레이 홍해아·삼매진화, 나타 풍화륜·탑승 건곤권, 손오공 분신 연출.

## 결과

- 홍해아가 화염산에서 선택·출진 가능하고, 플레이 원화와 보스 원화가 서로 다른 파일이다. 메뉴 1180×820, 768×1024, 390×844에서 선택·초상화 디코딩 통과.
- 홍해아 HUD는 `화염탄`, 돌진기는 `삼매진화`로 표시된다. 실제 피해는 화염탄 탭 56/차지 90, 돌진 71, 필살 94, 무쌍 126이다.
- 홍해아는 승마 버튼이 미지원이며 말 폴백이 없다. 필살·무쌍에서 전용 `samadhi` 화염 원뿔 효과가 생성된다.
- 나타는 풍화륜 두 개 위에 선 전용 탑승 기본/건곤권 원화를 사용한다. HUD와 키보드 안내도 `풍화륜`으로 표시된다. 탑승 근접 실제 피해 67, 탑승 건곤권 발사 확인.
- 손오공 필살은 분신 잔상 4개, 무쌍은 6개를 생성하고 0.52 알파로 렌더한다.
- 전체 26개 장수·전장 조합이 실제 게임 코드로 7파도, 40KO, 승리까지 완주했다. 조운·조조 등 기존 경계/명중 회귀도 포함한다.
- 이동 경계 4건, 30종 돌진 6건, 승마 스프라이트 3건 등 단위·회귀 13/13 통과.
- X1·X2 통합, 모바일 세로/터치 가로 확대·전체화면 가드, 기존 관우·조운·조조·마초 승마 브라우저 검증 통과.
- 신규 원화 5장 투명도·프레임 경계 예산 통과. X3 화면 4종(모바일 메뉴·홍해아 화염·나타 풍화륜·손오공 분신)을 육안 확인했다.
- 서비스워커 공유 캐시 v61, 체크인된 삼국지 게임 미디어 183개 전부 등록. 원격에서 함께 들어온 최신 카드 자산 v29·32장 보존. 해당 PWA 범위 2/2 통과.
- X3 브라우저 페이지 오류 0, HTTP 400 이상 0.

전체 허브 PWA 검사는 이 부분 체크아웃에 없는 루트·카드·스토리·어벤져스 파일 때문에 완전 실행 대상이 아니다. 서유기 미디어와 캐시 세대 검증만 2/2 통과했으며 전체 허브 통과로 주장하지 않는다.

## 재현

```sh
node sanguo/tests/xiyou-x3.cjs
node sanguo/tests/xiyou-x2.cjs
node sanguo/tests/xiyou-x1.cjs
node sanguo/tests/combat-playthrough.cjs
node sanguo/tests/art-atlas.cjs
node sanguo/tests/mobile-viewport.cjs
node sanguo/tests/mount-browser.cjs
node --test sanguo/tests/dash-skills.test.cjs sanguo/tests/combat-bounds.test.cjs sanguo/tests/mounted-sprites.test.cjs
node --test --test-name-pattern="checked-in Sanguo|cache generation" cards/tests/pwa.test.js
```

Node와 Playwright/Chromium, sharp가 필요하다. 이번 검증은 OneDrive가 아닌 Codex 번들 런타임을 `NODE_PATH`로 사용했다. `XIYOU_QA_OUTPUT`을 지정하면 X3 화면을 외부 폴더에 저장한다. `MOUNT_QA_OUTPUT`을 지정하지 않으면 승마 검증은 저장소에 임시 이미지를 만들지 않는다.

전투 자동 검증은 테스트 응답에만 내부 접근을 주입하고 적 피해를 차단해 진행·명중을 검증한다. 프로덕션에는 디버그 API를 노출하지 않는다. 실제 아이패드 성능, 아이의 난이도와 홀드 감각 검증은 아직 남아 있다. 다음 구현 범위는 X4의 서유기 8전장 페인팅 배경이다.
