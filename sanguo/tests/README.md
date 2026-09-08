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
node sanguo/tests/mobile-viewport.cjs
node sanguo/tests/xiyou-x1.cjs
node sanguo/tests/xiyou-x2.cjs
node sanguo/tests/xiyou-x3.cjs
node sanguo/tests/xiyou-x4.cjs
```

Set MENU_QA_OUTPUT / COMBAT_QA_OUTPUT / MOUNT_QA_OUTPUT to an external directory for screenshots.
Set XIYOU_QA_OUTPUT for the X1/X2/X3 menu, battle and victory-lesson screenshots.
Set XIYOU_QA_OUTPUT for X4's eight rendered battlefield screenshots as well.


## Xiyou X4 coverage

- All eight Journey to the West battlefields load distinct far, transparent middle and opaque ground paintings.
- Production rendering uses 0.06 / 0.30 / 1.0 parallax, keeps themed particles, and falls back to procedural scenery if any layer is unavailable.
- Browser instrumentation records exactly the three expected painted layers per stage at 640x400 with no failed requests or console errors.
- Battle completion releases stage paintings from both the bundle and image cache.
- Set `XIYOU_QA_OUTPUT` to an external directory to save one rendered battle screenshot per stage.


## Xiyou X3 coverage

- Playable Honghaier selection and portrait at three viewport sizes; dedicated hero art remains distinct from the boss sheet.
- Actual Samadhi fire tap/charge, dash, special and musou damage plus child-friendly flame-cone effects.
- Nezha uses a dedicated paired Fenghuolun mount, mounted melee/ring sheets and a `풍화륜` HUD label instead of horse fallback.
- Wukong special/musou create four/six translucent clone afterimages.
- Five transparent atlases are frame-edge checked; combat playthrough now covers 26 combinations.
- Browser checks inject hooks into locally served responses only. Production exports no debug API.

## Xiyou X2 coverage

- Erlang selection/portrait/launch at three viewport sizes, long-reach tuning and dedicated pellet-bow animation.
- Actual dash/special/musou damage; pellet tap/charge state and combat-playthrough hit damage.
- Three dedicated final bosses, stage education text and scrollable victory UI.
- Five transparent atlases, 178 cached game media, existing card assets preserved.
- Combat playthrough now covers 24 combinations, including Erlang at Heaven Palace and Lion-Camel Ridge.

## Xiyou X1 coverage

- Preserves the concurrently merged 8-stage expansion and locks unpainted heroes.
- Nezha selection at 1180x820, 768x1024 and 390x844; real portrait decoding.
- Dedicated fire spear/ring sheets, no horse fallback, fastest baseline walk speed.
- Dash, special and musou actual damage; the combat playthrough checks ring tap/charge.
- Three dedicated boss sprites and matching final-wave identities.
- Victory lesson/real/fiction match the design text; expanded content and buttons
  remain reachable on a 640x400 viewport.
- Five new transparent atlases have zero opaque pixels on every frame boundary.

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
