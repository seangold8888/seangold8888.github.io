# 마초·황충 원화 제작 기록

Built-in image_gen 사용. 새 캐릭터 원화 생성, CLI/API fallback 미사용.
선택된 원본 PNG의 알파와 픽셀을 보존하여 복사했습니다. 전투 렌더러의 PAINTED_FRAME_LAYOUTS가 자세별 영역과 발 기준점을 지정합니다.

## machao-painted-sheet-v1.png

최종 파일: `art/side-scroller/machao-painted-sheet-v1.png`

```text
Use case: stylized-concept. Production animation atlas for a Three Kingdoms side-scroller. Genuinely transparent alpha PNG background, square canvas with EXACT 2x2 equal-square cells. Each cell has exactly ONE small fully contained full-body character facing RIGHT. Most important: generous 15% EMPTY TRANSPARENT MARGIN ON ALL FOUR SIDES of EACH cell. Use only central 70% of each cell for all body and weapon pixels. Nothing crosses central vertical or horizontal divisions. NO cropping. No grid lines, no text, no painted checkerboard, no floor. Consistent adult body proportions, body center at cell50% horizontal, boots baseline cell85% vertical. Detailed semi-realistic hand-painted Chinese historical action game illustration with rich material textures, crisp silhouette and warm rim light; no chibi. Subject Ma Chao: young handsome Chinese general in ornate silver lamellar armor, white cloak with blue accents, silver lion helmet and white plume, long steel spear with blue tassel. Four poses in reading order: idle spear ready diagonal, forward run with spear swept backward, braced spear windup, spear thrust forward to RIGHT. Every spear tip and cloak remains within central70% of OWN CELL; shrink figure as needed. All four poses same outfit and face.
```

## huangzhong-painted-sheet-v1.png

최종 파일: `art/side-scroller/huangzhong-painted-sheet-v1.png`

```text
Use case: stylized-concept. Production animation atlas for a Three Kingdoms side-scroller. Genuinely transparent alpha PNG background, square canvas with EXACT 2x2 equal-square cells. Each cell has exactly ONE small fully contained full-body character facing RIGHT. Most important: generous 15% EMPTY TRANSPARENT MARGIN ON ALL FOUR SIDES of EACH cell. Use only central 70% of each cell for all body and weapon pixels. Nothing crosses central vertical or horizontal divisions. NO cropping. No grid lines, no text, no painted checkerboard, no floor. Consistent adult body proportions, body center at cell50% horizontal, boots baseline cell85% vertical. Detailed semi-realistic hand-painted Chinese historical action game illustration with rich material textures, crisp silhouette and warm rim light; no chibi. Huang Zhong: muscular elderly Chinese general, long white beard and moustache, lined proud face, gold and bronze lion lamellar armor, ochre clothing, burgundy cloak, gold helmet with red plume. Weapon: heavy broad curved Chinese dao blade with bronze decorated handle, bow and quiver secured on back. Four poses in reading order: idle ready, forward run, blade raised in heavy windup, downward slash RIGHT. Raised blade in bottom-left MUST remain below horizontal midpoint of canvas with large clear gutter. Uniform small scale all four poses; sword, plume, cape stay inside central70% of owncell.
```

## huangzhong-bow-painted-sheet-v1.png

최종 파일: `art/side-scroller/huangzhong-bow-painted-sheet-v1.png`

```text
Use case: stylized-concept. Production animation atlas for a Three Kingdoms side-scroller. Genuinely transparent alpha PNG background, square canvas with EXACT 2x2 equal-square cells. Each cell has exactly ONE small fully contained full-body character facing RIGHT. Most important: generous 15% EMPTY TRANSPARENT MARGIN ON ALL FOUR SIDES of EACH cell. Use only central 70% of each cell for all body and weapon pixels. Nothing crosses central vertical or horizontal divisions. NO cropping. No grid lines, no text, no painted checkerboard, no floor. Consistent adult body proportions, body center at cell50% horizontal, boots baseline cell85% vertical. Detailed semi-realistic hand-painted Chinese historical action game illustration with rich material textures, crisp silhouette and warm rim light; no chibi. Huang Zhong: muscular elderly Chinese general, long white beard and moustache, lined proud face, gold and bronze lion lamellar armor, ochre clothing, burgundy cloak, gold helmet with red plume. Weapon: ornate wooden recurve bow, dao sheathed, quiver on back. Four poses in reading order: standing holding bow lowered, advancing bow ready, draw bowstring arrow nocked aimed RIGHT, release arrow followthrough RIGHT. Exactly same face and costume allposes. All bow tips, arrows, cloak and plume within central70% of own cell. Bowstring taut and realistically gripped.
```

초안의 셀 경계 침범을 발견해 최종 신규 시트를 생성했습니다. 로컬 참조 편집은 환경 파일 접근 오류로 실행되지 않았고, 초안은 게임에 포함하지 않았습니다.

