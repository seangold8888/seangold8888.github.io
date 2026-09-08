# 서유기 X2 원화 제작 기록

2026-09-08. 내장 image_gen으로 생성. PNG 픽셀 후처리나 별도 생성 CLI는 사용하지 않았다.

## erlangshen-hero

최종 파일: `art/side-scroller/erlangshen-hero-painted-sheet-v1.png`

생성 원본: `exec-5a36a65e-3c80-43c2-83ab-add97d2ecb9c.png`

프롬프트:

```text
Use case: stylized-concept. Production sprite atlas for a painterly children's Journey to the West side-scrolling action game. Erlang Shen as a heroic young adult HUMAN East Asian general: handsome calm clean-shaven face, black hair tied in high topknot, subtle small vertical third eye on forehead, silver and deep sapphire blue armor, ivory cape, blue waist sash, silver boots. Carries a three-pointed double-edged polearm (central long blade with two short side blades). Four full-body RIGHT-facing action sprites in exact 2x2 equal square cells: standing ready, stepping forward, compact diagonal weapon windup, forward diagonal slash. Consistent face costume and scale across poses. Keep each figure and entire weapon WITHIN its own quadrant, wide transparent gutters, no part crossing central lines or image edges. Keep poses compact; NO long horizontal weapon stretching across cells. Boot baseline at 90% of each cell. Detailed semi-realistic hand-painted fantasy rendering, elegant armor textures, readable silhouette. GENUINELY TRANSPARENT PNG with alpha outside figures. Square canvas. No text, background, floor shadow, visible grid, horse, blood, skulls or monster features.
```

## erlangshen-hero-bow

최종 파일: `art/side-scroller/erlangshen-hero-bow-painted-sheet-v1.png`

생성 원본: `exec-b1cd7a48-2dd2-49fa-89dd-dfce083c9597.png`

프롬프트:

```text
Use case: stylized-concept. Transparent PNG sprite atlas for a children's Journey to the West painterly side-scrolling game. Square canvas, EXACT 2x2 equal cells, one complete full-body RIGHT-facing figure per cell. Consistent face, costume and scale. Four poses: idle, step forward, attack preparation, short strike. Keep every figure and entire weapon INSIDE its own quadrant with wide empty margins. Detailed semi-realistic hand-painted fantasy art. GENUINE transparent alpha background, no backdrop, floor shadow, grid lines or text. No gore, skulls, bones, animal heads or fangs. Hero Erlang Shen, handsome young adult East Asian HUMAN, clean shaven, long black topknot with silver hair ornament, small vertical forehead third eye, silver armor over deep sapphire blue clothing, blue sash, ivory cape, silver boots. Replace strike sequence with compact silver-blue pellet bow: idle bow lowered, raise bow, pull string to cheek, release small silver energy pellet. No polearm or arrow shaft. Bow stays within cell.
```

## boss-yinjiao

최종 파일: `art/side-scroller/boss-yinjiao-painted-sheet-v1.png`

생성 원본: `exec-4690dfb2-bbb1-41aa-8663-ec15553f9016.png`

프롬프트:

```text
Use case: stylized-concept. Transparent PNG sprite atlas for a children's Journey to the West painterly side-scrolling game. Square canvas, EXACT 2x2 equal cells, one complete full-body RIGHT-facing figure per cell. Consistent face, costume and scale. Four poses: idle, step forward, attack preparation, short strike. Keep every figure and entire weapon INSIDE its own quadrant with wide empty margins. Detailed semi-realistic hand-painted fantasy art. GENUINE transparent alpha background, no backdrop, floor shadow, grid lines or text. No gore, skulls, bones, animal heads or fangs. Silver Horn King, HUMAN adult East Asian villain with silver hair, smooth stern face, silver armor and deep violet robes, helmet with two short ornamental silver upward points (not animal horns). Purple golden-capped gourd fixed at waist, compact silver Seven Star sword in hand. Poses standing, walking, sword held near shoulder, short downward slash. Purple/silver palette. No giant effects.
```

## boss-honghaier

최종 파일: `art/side-scroller/boss-honghaier-painted-sheet-v1.png`

생성 원본: `exec-d89df581-e9d4-4c7f-9f6c-1c214fed2764.png`

프롬프트:

```text
Use case: stylized-concept. Transparent PNG sprite atlas for a children's Journey to the West painterly side-scrolling game. Square canvas, EXACT 2x2 equal cells, one complete full-body RIGHT-facing figure per cell. Consistent face, costume and scale. Four poses: idle, step forward, attack preparation, short strike. Keep every figure and entire weapon INSIDE its own quadrant with wide empty margins. Detailed semi-realistic hand-painted fantasy art. GENUINE transparent alpha background, no backdrop, floor shadow, grid lines or text. No gore, skulls, bones, animal heads or fangs. Red Boy Hong Hai Er, a mischievous child HUMAN East Asian fantasy boss, red-gold armor over red clothing, black hair with two small red-tied buns, sturdy boots, modest fully covered costume. Compact red-tipped fire spear held diagonally near body. Small flame halo behind shoulders, entirely within quadrant. Fierce playful determined expression, no scary monster mouth. Warm scarlet and orange palette. Distinct from Nezha: no long red ribbons, shorter cape and round red shoulder armor.
```

## boss-dapeng

최종 파일: `art/side-scroller/boss-dapeng-painted-sheet-v1.png`

생성 원본: `exec-58b6cb3a-2e94-4730-a909-61e645e72479.png`

프롬프트:

```text
Use case: stylized-concept. Transparent PNG sprite atlas for a children's Journey to the West painterly side-scrolling game. Square canvas, EXACT 2x2 equal cells, one complete full-body RIGHT-facing figure per cell. Consistent face, costume and scale. Four poses: idle, step forward, attack preparation, short strike. Keep every figure and entire weapon INSIDE its own quadrant with wide empty margins. Detailed semi-realistic hand-painted fantasy art. GENUINE transparent alpha background, no backdrop, floor shadow, grid lines or text. No gore, skulls, bones, animal heads or fangs. Golden Wing Great Peng King as a HUMAN adult East Asian armored commander. Human face clearly visible under gold hawk-shaped helmet, NOT a bird head. Elegant gold-bronze feather armor over charcoal violet robes, two folded golden feathered wings rising closely behind shoulders, short curved golden saber. Poses standing, stepping, saber raised close to chest, short diagonal slash. Wings stay folded and compact wholly within each quadrant, never spread across cells. Gold amber charcoal palette. No large glowing effects.
```

## 프레임 검증

5장 모두 투명 배경이며 선택한 프레임 경계의 불투명 픽셀은 0이다. 이랑진군의 창·탄궁 원화는 PAINTED_FRAME_LAYOUTS로 투명한 여백을 기준으로 프레임을 지정했다. 탄궁은 1280 기준 x=620, y=632 분할을 사용해 아래 포즈의 무기 끝을 보존한다. PNG 자체를 자르거나 수정하지 않았다.

탄궁의 앞선 두 후보는 체크무늬 배경 때문에 사용하지 않았다. 최종 원본은 위에 기재한 새 생성본이다. 홍해아는 보스 전용이며 플레이어를 잠금 해제하지 않는다. 기존 적 위에 절차 무기를 덧그리지 않는다.

