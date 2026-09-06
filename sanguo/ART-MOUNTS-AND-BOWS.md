# 승마·활 확장 원화

## 제작 방식

내장 image_gen으로 신규 투명 PNG 10장을 생성했습니다. CLI/API fallback은 사용하지 않았습니다.
원본 PNG를 그대로 보존해 프로젝트에 복사했습니다. 관우의 기존 적토마 파일은 변경하지 않았습니다.
말 단독 그림은 탑승 전후 공통 사용하며, `mountedSprites.js`의 투명 기수 레이어만 근접/활 자세로 전환합니다.
전투 렌더러의 영역·안장 좌표로 셀 경계를 보정합니다. 원본 이미지 픽셀을 편집하지 않았습니다.
말 이름은 게임 내 구분용 명칭입니다.

## zhaoyun-bow-painted-sheet-v1.png

최종 파일: `art/side-scroller/zhaoyun-bow-painted-sheet-v1.png`

```text
Use case: stylized-concept. Production transparent PNG sprite atlas for a painted semi-realistic Three Kingdoms side-scrolling game. Square canvas EXACT 2x2 equal cells; one subject per cell facing RIGHT in side/three-quarter view. Same scale and identity in all four cells. Generous empty transparent gutters around EVERY cell: no weapon, cloak, body or tail may cross the canvas center lines. All subjects fully contained. GENUINE transparent alpha background, no checkerboard, floor, grid, labels or text. Detailed realistic anatomy, metal/leather textures, crisp painted edges, not chibi, not pixel art. Zhao Yun, handsome clean-shaven young Chinese warrior, long black hair tied high in a ponytail with small silver crown, NO helmet, ornate silver armor, white and pale-blue cloth strips and cape, silver boots. His weapon is a long silver spear with white tassel. Full-body ON-FOOT archery atlas, standing on invisible ground. Reading order: top-left holding bow lowered; top-right advancing with bow ready; bottom-left drawing bowstring with arrow aimed RIGHT; bottom-right releasing arrow RIGHT. Main melee weapon sheathed/secured on back, not in hands. All four complete feet visible. Bow, quiver and outfit identical in all poses. Small enough to leave 12% transparent margins percell.
```

## caocao-bow-painted-sheet-v1.png

최종 파일: `art/side-scroller/caocao-bow-painted-sheet-v1.png`

```text
Use case: stylized-concept. Production transparent PNG sprite atlas for a painted semi-realistic Three Kingdoms side-scrolling game. Square canvas EXACT 2x2 equal cells; one subject per cell facing RIGHT in side/three-quarter view. Same scale and identity in all four cells. Generous empty transparent gutters around EVERY cell: no weapon, cloak, body or tail may cross the canvas center lines. All subjects fully contained. GENUINE transparent alpha background, no checkerboard, floor, grid, labels or text. Detailed realistic anatomy, metal/leather textures, crisp painted edges, not chibi, not pixel art. Cao Cao, stern middle-aged Chinese warrior with black moustache and short pointed beard, black hair topknot with narrow tall gold crown, black-and-bronze lamellar armor, burgundy red cloak, dark trousers and black boots. His weapon is a straight Chinese jian sword. Full-body ON-FOOT archery atlas, standing on invisible ground. Reading order: top-left holding bow lowered; top-right advancing with bow ready; bottom-left drawing bowstring with arrow aimed RIGHT; bottom-right releasing arrow RIGHT. Main melee weapon sheathed/secured on back, not in hands. All four complete feet visible. Bow, quiver and outfit identical in all poses. Small enough to leave 12% transparent margins percell.
```

## machao-bow-painted-sheet-v1.png

최종 파일: `art/side-scroller/machao-bow-painted-sheet-v1.png`

```text
Use case: stylized-concept. Production transparent PNG sprite atlas for a painted semi-realistic Three Kingdoms side-scrolling game. Square canvas EXACT 2x2 equal cells; one subject per cell facing RIGHT in side/three-quarter view. Same scale and identity in all four cells. Generous empty transparent gutters around EVERY cell: no weapon, cloak, body or tail may cross the canvas center lines. All subjects fully contained. GENUINE transparent alpha background, no checkerboard, floor, grid, labels or text. Detailed realistic anatomy, metal/leather textures, crisp painted edges, not chibi, not pixel art. Ma Chao, handsome clean-shaven young Chinese warrior, ornate silver lion helmet with flowing white plume, blue neck scarf, silver lamellar armor, white cape with blue accents. His weapon is a long steel spear with blue tassel. Full-body ON-FOOT archery atlas, standing on invisible ground. Reading order: top-left holding bow lowered; top-right advancing with bow ready; bottom-left drawing bowstring with arrow aimed RIGHT; bottom-right releasing arrow RIGHT. Main melee weapon sheathed/secured on back, not in hands. All four complete feet visible. Bow, quiver and outfit identical in all poses. Small enough to leave 12% transparent margins percell.
```

## mount-zhaoyun-painted-sheet-v1.png

최종 파일: `art/side-scroller/mount-zhaoyun-painted-sheet-v1.png`

```text
Use case: stylized-concept. Production transparent PNG sprite atlas for a painted semi-realistic Three Kingdoms side-scrolling game. Square canvas EXACT 2x2 equal cells; one subject per cell facing RIGHT in side/three-quarter view. Same scale and identity in all four cells. Generous empty transparent gutters around EVERY cell: no weapon, cloak, body or tail may cross the canvas center lines. All subjects fully contained. GENUINE transparent alpha background, no checkerboard, floor, grid, labels or text. Detailed realistic anatomy, metal/leather textures, crisp painted edges, not chibi, not pixel art. Subject: sleek white warhorse, silver-gray mane and tail, pale blue saddle blanket, dark brown leather saddle, restrained silver fittings. HORSE ONLY, absolutely NO rider/person. Whole horse visible in every cell, exactly same horse, saddle, bridle, colors and proportions. All face right, saddle centered at45% of cell width. Four poses: standing calmly, walking right, galloping extended stride right, cantering collected stride right. Top of saddle stays same height in cells. Hooves near90% cell height. Leave15% clear margins, all ears and tails contained.
```

## mount-caocao-painted-sheet-v1.png

최종 파일: `art/side-scroller/mount-caocao-painted-sheet-v1.png`

```text
Use case: stylized-concept. Production transparent PNG sprite atlas for a painted semi-realistic Three Kingdoms side-scrolling game. Square canvas EXACT 2x2 equal cells; one subject per cell facing RIGHT in side/three-quarter view. Same scale and identity in all four cells. Generous empty transparent gutters around EVERY cell: no weapon, cloak, body or tail may cross the canvas center lines. All subjects fully contained. GENUINE transparent alpha background, no checkerboard, floor, grid, labels or text. Detailed realistic anatomy, metal/leather textures, crisp painted edges, not chibi, not pixel art. Subject: powerful jet-black warhorse with black mane and tail, burgundy saddle blanket, bronze fittings and black leather saddle. HORSE ONLY, absolutely NO rider/person. Whole horse visible in every cell, exactly same horse, saddle, bridle, colors and proportions. All face right, saddle centered at45% of cell width. Four poses: standing calmly, walking right, galloping extended stride right, cantering collected stride right. Top of saddle stays same height in cells. Hooves near90% cell height. Leave15% clear margins, all ears and tails contained.
```

## mount-machao-painted-sheet-v1.png

최종 파일: `art/side-scroller/mount-machao-painted-sheet-v1.png`

```text
Use case: stylized-concept. Production transparent PNG sprite atlas for a painted semi-realistic Three Kingdoms side-scrolling game. Square canvas EXACT 2x2 equal cells; one subject per cell facing RIGHT in side/three-quarter view. Same scale and identity in all four cells. Generous empty transparent gutters around EVERY cell: no weapon, cloak, body or tail may cross the canvas center lines. All subjects fully contained. GENUINE transparent alpha background, no checkerboard, floor, grid, labels or text. Detailed realistic anatomy, metal/leather textures, crisp painted edges, not chibi, not pixel art. Subject: muscular sandy-gold dun warhorse with dark brown mane and tail, ivory-and-cobalt saddle blanket, brown leather saddle and silver fittings. HORSE ONLY, absolutely NO rider/person. Whole horse visible in every cell, exactly same horse, saddle, bridle, colors and proportions. All face right, saddle centered at45% of cell width. Four poses: standing calmly, walking right, galloping extended stride right, cantering collected stride right. Top of saddle stays same height in cells. Hooves near90% cell height. Leave15% clear margins, all ears and tails contained.
```

## rider-guanyu-combat-bow-v1.png

최종 파일: `art/side-scroller/rider-guanyu-combat-bow-v1.png`

```text
Use case: stylized-concept. Production transparent PNG sprite atlas for a painted semi-realistic Three Kingdoms side-scrolling game. Square canvas EXACT 2x2 equal cells; one subject per cell facing RIGHT in side/three-quarter view. Same scale and identity in all four cells. Generous empty transparent gutters around EVERY cell: no weapon, cloak, body or tail may cross the canvas center lines. All subjects fully contained. GENUINE transparent alpha background, no checkerboard, floor, grid, labels or text. Detailed realistic anatomy, metal/leather textures, crisp painted edges, not chibi, not pixel art. Guan Yu, imposing middle-aged Chinese warrior with ruddy face, very long black beard, green cloth headwrap, emerald-green robe over gold-trimmed dark armor. His weapon is a long green-dragon crescent guandao. CRITICAL SUBJECT: RIDER ONLY seated astride an INVISIBLE HORSE, NO horse, NO saddle, NO chair or platform anywhere. This is a transparent overlay to place atop a separately rendered horse. Natural mounted posture with bent thighs extending forward, knees bent downward and booted lower legs hanging, hips remain same fixed position at cell center horizontally and62% vertically. Full body and boots included. Four poses in reading order: top-left seated upright holding his melee weapon ready and left hand holding invisible reins; top-right seated leaning slightly forward striking melee weapon toward RIGHT; bottom-left seated drawing a recurve bow aimed RIGHT with melee weapon sheathed; bottom-right seated archery release toward RIGHT, bow held extended. SAME face, armor, cloak and natural seated legs in all poses. Genuinely transparent between legs. Leave12% transparent margin for every weapon. Never draw any horse body or horse head. 4 rider figures only.
```

## rider-zhaoyun-combat-bow-v1.png

최종 파일: `art/side-scroller/rider-zhaoyun-combat-bow-v1.png`

```text
Use case: stylized-concept. Production transparent PNG sprite atlas for a painted semi-realistic Three Kingdoms side-scrolling game. Square canvas EXACT 2x2 equal cells; one subject per cell facing RIGHT in side/three-quarter view. Same scale and identity in all four cells. Generous empty transparent gutters around EVERY cell: no weapon, cloak, body or tail may cross the canvas center lines. All subjects fully contained. GENUINE transparent alpha background, no checkerboard, floor, grid, labels or text. Detailed realistic anatomy, metal/leather textures, crisp painted edges, not chibi, not pixel art. Zhao Yun, handsome clean-shaven young Chinese warrior, long black hair tied high in a ponytail with small silver crown, NO helmet, ornate silver armor, white and pale-blue cloth strips and cape, silver boots. His weapon is a long silver spear with white tassel. CRITICAL SUBJECT: RIDER ONLY seated astride an INVISIBLE HORSE, NO horse, NO saddle, NO chair or platform anywhere. This is a transparent overlay to place atop a separately rendered horse. Natural mounted posture with bent thighs extending forward, knees bent downward and booted lower legs hanging, hips remain same fixed position at cell center horizontally and62% vertically. Full body and boots included. Four poses in reading order: top-left seated upright holding his melee weapon ready and left hand holding invisible reins; top-right seated leaning slightly forward striking melee weapon toward RIGHT; bottom-left seated drawing a recurve bow aimed RIGHT with melee weapon sheathed; bottom-right seated archery release toward RIGHT, bow held extended. SAME face, armor, cloak and natural seated legs in all poses. Genuinely transparent between legs. Leave12% transparent margin for every weapon. Never draw any horse body or horse head. 4 rider figures only.
```

## rider-caocao-combat-bow-v1.png

최종 파일: `art/side-scroller/rider-caocao-combat-bow-v1.png`

```text
Use case: stylized-concept. Production transparent PNG sprite atlas for a painted semi-realistic Three Kingdoms side-scrolling game. Square canvas EXACT 2x2 equal cells; one subject per cell facing RIGHT in side/three-quarter view. Same scale and identity in all four cells. Generous empty transparent gutters around EVERY cell: no weapon, cloak, body or tail may cross the canvas center lines. All subjects fully contained. GENUINE transparent alpha background, no checkerboard, floor, grid, labels or text. Detailed realistic anatomy, metal/leather textures, crisp painted edges, not chibi, not pixel art. Cao Cao, stern middle-aged Chinese warrior with black moustache and short pointed beard, black hair topknot with narrow tall gold crown, black-and-bronze lamellar armor, burgundy red cloak, dark trousers and black boots. His weapon is a straight Chinese jian sword. CRITICAL SUBJECT: RIDER ONLY seated astride an INVISIBLE HORSE, NO horse, NO saddle, NO chair or platform anywhere. This is a transparent overlay to place atop a separately rendered horse. Natural mounted posture with bent thighs extending forward, knees bent downward and booted lower legs hanging, hips remain same fixed position at cell center horizontally and62% vertically. Full body and boots included. Four poses in reading order: top-left seated upright holding his melee weapon ready and left hand holding invisible reins; top-right seated leaning slightly forward striking melee weapon toward RIGHT; bottom-left seated drawing a recurve bow aimed RIGHT with melee weapon sheathed; bottom-right seated archery release toward RIGHT, bow held extended. SAME face, armor, cloak and natural seated legs in all poses. Genuinely transparent between legs. Leave12% transparent margin for every weapon. Never draw any horse body or horse head. 4 rider figures only.
```

## rider-machao-combat-bow-v1.png

최종 파일: `art/side-scroller/rider-machao-combat-bow-v1.png`

```text
Use case: stylized-concept. Production transparent PNG sprite atlas for a painted semi-realistic Three Kingdoms side-scrolling game. Square canvas EXACT 2x2 equal cells; one subject per cell facing RIGHT in side/three-quarter view. Same scale and identity in all four cells. Generous empty transparent gutters around EVERY cell: no weapon, cloak, body or tail may cross the canvas center lines. All subjects fully contained. GENUINE transparent alpha background, no checkerboard, floor, grid, labels or text. Detailed realistic anatomy, metal/leather textures, crisp painted edges, not chibi, not pixel art. Ma Chao, handsome clean-shaven young Chinese warrior, ornate silver lion helmet with flowing white plume, blue neck scarf, silver lamellar armor, white cape with blue accents. His weapon is a long steel spear with blue tassel. CRITICAL SUBJECT: RIDER ONLY seated astride an INVISIBLE HORSE, NO horse, NO saddle, NO chair or platform anywhere. This is a transparent overlay to place atop a separately rendered horse. Natural mounted posture with bent thighs extending forward, knees bent downward and booted lower legs hanging, hips remain same fixed position at cell center horizontally and62% vertically. Full body and boots included. Four poses in reading order: top-left seated upright holding his melee weapon ready and left hand holding invisible reins; top-right seated leaning slightly forward striking melee weapon toward RIGHT; bottom-left seated drawing a recurve bow aimed RIGHT with melee weapon sheathed; bottom-right seated archery release toward RIGHT, bow held extended. SAME face, armor, cloak and natural seated legs in all poses. Genuinely transparent between legs. Leave12% transparent margin for every weapon. Never draw any horse body or horse head. 4 rider figures only.
```
