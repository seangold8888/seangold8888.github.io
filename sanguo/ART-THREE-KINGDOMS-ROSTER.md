# 촉·위·오 대표 장수 원화 제작 기록

이번 확장에는 내장 `image_gen`을 사용했다. 외부 CLI·API fallback은 사용하지 않았다.
생성 결과 중 전투에 채택한 투명 PNG를 그대로 `art/side-scroller/`에 넣었고, 기존 장수·적토마 원화는 수정하지 않았다.

## 적용 범위

| 진영 | 장수 | 기본 전투 시트 | 원거리 시트 | 전투 정체성 |
| --- | --- | --- | --- | --- |
| 위 | 하후돈 | `xiahoudun-painted-sheet-v1.png` | `xiahoudun-bow-painted-sheet-v1.png` | 장극 철벽 돌파 |
| 위 | 장료 | `zhangliao-painted-sheet-v1.png` | `zhangliao-bow-painted-sheet-v1.png` | 빠른 장극 기동전 |
| 위 | 허저 | `xuchu-painted-sheet-v1.png` | `xuchu-bow-painted-sheet-v1.png` | 대부 중갑 파쇄 |
| 위 | 사마의 | `simayi-painted-sheet-v1.png` | `simayi-bow-painted-sheet-v1.png` | 지휘검 진형 제어 |
| 오 | 손권 | `sunquan-painted-sheet-v1.png` | `sunquan-bow-painted-sheet-v1.png` | 지휘형 검술 |
| 오 | 태사자 | `taishici-painted-sheet-v1.png` | `taishici-bow-painted-sheet-v1.png` | 창·궁 연계 |
| 오 | 감녕 | `ganning-painted-sheet-v1.png` | `ganning-bow-painted-sheet-v1.png` | 쌍도 수상 기습 |
| 오 | 육손 | `luxun-painted-sheet-v1.png` | 없음 — 우선 투사체 사용 | 화공 책략 |
| 오 | 주유 | 기존 기본 시트 | `zhouyu-bow-painted-sheet-v1.png` | 장검·궁 보완 |
| 오 | 황개 | 기존 기본 시트 | `huanggai-bow-painted-sheet-v1.png` | 철편·궁 보완 |

모든 신규 PNG는 실제 알파 채널이 있는 정사각 2×2 동작 아틀라스다. 읽는 순서는 대기, 전진, 준비, 공격/발사이며, 캐릭터는 오른쪽을 향한다.

## 기본 전투 시트 프롬프트 세트

```text
Use case: stylized-concept. Production animation atlas for a Three Kingdoms side-scroller.
Genuinely transparent alpha PNG background, square canvas with EXACT 2x2 equal-square cells.
Each cell has exactly one full-body historical Chinese general facing RIGHT. No text, grid,
checkerboard, floor, or background. Detailed semi-realistic hand-painted action-game art;
crisp silhouette, realistic armor/cloth/metal texture, warm rim light; no chibi or pixel art.
Use one consistent face, costume, scale and boots baseline in all four cells. Reading order:
idle weapon-ready, advancing, weapon windup, attack to the right. Keep each pose self-contained
with transparent gutters and do not draw a horse.
```

개별 대상 묘사는 하후돈(외눈·남청 장갑·언월 장극), 장료(은청 장극·번개 기동), 허저(호랑이 장식 중갑·거대한 대부), 사마의(자주색 지휘관 복식·지휘검), 손권(주홍 금장 갑옷·패검), 태사자(은갑·붉은 술 창), 감녕(남청 수군 복식·쌍도), 육손(연녹 지휘관 복식·깃부채)으로 각각 분리해 생성했다.

## 원거리 시트 프롬프트 세트

```text
Use case: stylized-concept. Production transparent PNG sprite atlas for the same painted
semi-realistic Three Kingdoms side-scrolling game. Square canvas EXACT 2x2 equal cells;
one same full-body on-foot hero per cell facing RIGHT, with genuine transparent alpha.
No background, grid, text, floor, horse or duplicate figures. Keep generous transparent
gutters. Reading order: bow lowered, bow-ready advance, draw an arrow aimed RIGHT, release
to RIGHT. The primary melee weapon is secured on the back; costume and face remain identical.
```

이 세트는 하후돈·장료·허저·사마의·손권·태사자·감녕에 적용했고, 기존 오나라 대표 장수 중 주유·황개의 원거리 선택지도 보강했다. 육손은 궁 시트 대신 본체 시트와 `K 우선 공격`의 바람·화공 투사체를 사용한다.

## 검수 기준

- 카드·전투에서 같은 파일을 사용해, 메뉴 원화와 플레이 원화가 달라지지 않는다.
- `sanguo/tests/art-atlas.cjs`가 투명도와 셀 경계를 검사한다. 큰 대부와 활 끝처럼 의도적으로 가까운 무기 끝에는 개별 안전 한도를 둔다.
- `sanguo/tests/combat-playthrough.cjs`가 새 8명 전원의 실제 7웨이브, 원거리 행동, 양 끝 전장 도달성을 확인한다.
- 신규 원화는 `sw.js`의 런타임 자산에 포함되어 오프라인 백그라운드 캐시 대상이다.
