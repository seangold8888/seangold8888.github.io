# V49 — actual worn shoes and full outfit QA

Local implementation only. **No public deployment or push in this task.**

## Changes

- Replaced natural-mode flat-lay shoes with nine jointly painted calf/foot/shoe originals. Two continuous transforms align ankle, instep and sole for every garment; no horizontal strip seams.
- Natural-mode shoe thumbnails use the same new originals as the stage. Shoe color and skin color are separate. Boots with trousers stay over the trouser leg, and long skirt hems stay in front of shoes. Mermaid tails suppress footwear.
- Body skin stays opaque until the worn shoe covers it. Explicit SVG mask coordinates prevent clipped soles. A soft contact shadow anchors the feet.
- Neck fitting uses a small, smooth horizontal displacement limited to the neck band, returning to neutral outside it. Faces and outer hair are not cropped. Necklace front drapes are retained; the choker bow no longer has upturned side loops.
- Export asset loads have a 15-second timeout, so a stalled request can be retried instead of hanging indefinitely.
- The outfit name has its own row outside the picture, preventing phone-size labels from covering crowns and faces.
- Studio v49, wardrobe module v4, footwear module v1, service-worker cache v120. Card asset v63 is unchanged.

## Verification

- 78 unit/regression tests: princess tests plus PWA and English-feedback regressions.
- 1,404 structural combinations: 12 princesses × 13 garments × 9 footwear choices. Each preserves saved state and SVG references.
- Actual browser raster coverage for the same 1,404 combinations, checking painted output and both leg/foot attachment samples.
- 468 exported neck joins: 12 princesses × 3 hairstyles × 13 garments, checking opaque center joins.
- Browser UI at 390×844, 820×1180 and 1180×820: dress/princess selections, hairstyle persistence, independent skin/cloth tint, and warm-offline exports of every shoe.
- Enlarged visual review: all 13 garment/9-shoe sheets; all 36 full-body shoe/hairstyle samples; all 36 hairstyle neck joins; all necklace types. Visual review complements pixel checks: center-alpha tests alone do not prove an attractive outer silhouette.

Browser automation uses desktop Edge at phone/tablet viewport sizes. **Physical iPad Safari has not been tested.** Offline tests warm assets before disconnecting; they do not promise that an asset never previously loaded will exist offline.

New artwork and condensed prompt provenance: [ART-FOOTWEAR-V49.md](ART-FOOTWEAR-V49.md).

Reproduce:

```text
node --test "princess/tests/*.test.js" cards/tests/pwa.test.js cards/tests/hub-english-feedback.test.js
node princess/tests/attachment-smoke.cjs
node princess/tests/wardrobe-smoke.cjs
node princess/tests/footwear-matrix.cjs
node princess/tests/attachment-review.cjs
node princess/tests/footwear-review.cjs
node princess/tests/worn-look-review.cjs
```

Preview: `/princess/?heads=natural&princess=cinder&v=49`. The ordinary legacy route and saved outfits are preserved.
