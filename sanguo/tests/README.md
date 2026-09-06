# Sanguo regression checks

Run from the site repository root with Node.js and Playwright/Chromium installed
(or point NODE_PATH at an existing Playwright installation).

```sh
node --test sanguo/tests/combat-bounds.test.cjs sanguo/tests/dash-skills.test.cjs sanguo/tests/mounted-sprites.test.cjs
node --test --test-name-pattern="cache generation" cards/tests/pwa.test.js
node sanguo/tests/menu.cjs
node sanguo/tests/art-atlas.cjs
node sanguo/tests/combat-playthrough.cjs
node sanguo/tests/mount-browser.cjs
```

Set MENU_QA_OUTPUT / COMBAT_QA_OUTPUT / MOUNT_QA_OUTPUT to an external directory for screenshots.

## 2026-09-06 verification

- 13 unit/regression checks passed; cache-generation v45 check passed.
- Menu: 1180x820, 768x1024, 390x844; Ma Chao / Huang Zhong selectable,
  portraits decode successfully and launch buttons remain usable.
- 9 transparent rectangular atlases, 36 frame cuts: no opaque pixels on frame boundaries.
  The four seated-rider overlays use separate polygon clips and visual inspection.
- Real browser game-code simulation: Zhao Yun / Cao Cao / Ma Chao / Huang Zhong
  recover the former fifth-wave archer deadlock, hit enemies at both world edges,
  and defeat every unit through real melee damage across all seven waves.
- Huang Zhong projectiles hit for 62 (tap) and 99 (charged) in the baseline fixture.
- Guan Yu / Zhao Yun / Cao Cao / Ma Chao: real keyboard tap/hold archery
  deals 43/69 damage on foot and mounted; mounted melee and unique dash deal damage.
  Touch mount/ranged dispatch works; standing, mounted and bow rendering use
  one identical horse asset at an unchanged scale, after dash trails expire.
  All four contexts finish without page errors.

The combat and mount tests inject closure access into the locally served module only.
Production has no debug API. It disables enemy damage/audio and advances time
programmatically to isolate reachability and progression; it is not a balance,
frame-rate or physical-iPad playtest. Actual menu/atlas rendering is checked
separately. No test artifacts are required by the production game.
