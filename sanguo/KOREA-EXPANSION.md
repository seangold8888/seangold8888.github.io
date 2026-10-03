# 한국 명장 확장

수호지 메뉴 자리에 **한국 명장**을 연다. 종전 수호지 데이터·그림은 과거 저장 기록을 깨뜨리지 않도록 남겨 둔다. 새 선택지는 연대순 4전장과 각 전장의 대표 장수 1명이다.

| 전장 | 장수 | 시대 | 참고 자료 |
| --- | --- | --- | --- |
| 살수 | 을지문덕 | 고구려, 612년 | [을지문덕](https://encykorea.aks.ac.kr/Article/E0042969), [살수대첩](https://encykorea.aks.ac.kr/Article/E0026415) |
| 귀주 | 강감찬 | 고려, 1019년 | [강감찬](https://encykorea.aks.ac.kr/Article/E0000954) |
| 행주 | 권율 | 조선, 1593년 | [권율](https://encykorea.aks.ac.kr/Article/E0007022), [행주대첩](https://encykorea.aks.ac.kr/Article/E0062859) |
| 명량 | 이순신 | 조선, 1597년 | [이순신](https://encykorea.aks.ac.kr/Article/E0044900) |

게임의 1대1 전투·필살기·보스 인물은 창작 연출이며 실제 전투의 재현이 아니다. 이야기 화면에서 `실제 역사`와 `게임 속 연출`을 나눈다. 수위는 어린이용으로 유지한다. 네 장수는 전용 기본/활 시트와 기술·함성을 갖지만, 말탄 시트가 없으므로 승마를 열지 않는다. 명량은 선상 갑판에서 싸운다.

화면 그림은 내장 이미지 생성 도구로 만들었다. 프롬프트 묶음은 각 장수의 역사 시대·갑옷·무기·고유 색상을 지정한 투명 배경 2×2 전투 포즈 시트와 활 포즈 시트, 시대별 이름 없는 상대 지휘관 4종이다. 생성된 12개 PNG는 `art/side-scroller/`에 둔다. 배경은 기존 절차 생성기를 확장했으며 추후 전용 회화 배경으로 교체할 수 있다.

확인: `node sanguo/tests/korea-expansion.cjs`, `node sanguo/tests/menu.cjs`, `node --test sanguo/tests/dash-skills.test.cjs sanguo/tests/battle-cries.test.cjs`.
