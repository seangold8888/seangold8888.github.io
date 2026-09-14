# V48 — neck and accessory attachment correction

Preview: `/princess/?heads=natural&princess=cinder&v=48`. Local only; no push/deployment.

## Root causes

V47's small full-body previews concealed two real defects: the garment neck began after the portrait had already started fading, and complete flat-lay necklaces (including rear chains, clasps and extenders) were drawn on the throat. Crown positions also used the retired doll's bald-head anchors rather than the accepted hairstyle roots.

## Changes

- Keep the common body scale, but move the garment neck start from scene y101 to y94, underneath the portrait. Shoes and hand props follow the existing garment geometry.
- Replace the rectangular neck fade area with a tapered region. Narrow the region for shoulder-crossing hair on Rapunzel, Kongjwi and Briar to avoid chopping through braids/waves.
- Render each necklace as a single visible front drape, hiding the rear chain and fastener. Use per-item width, height and neck placement for pearls, pendants, choker, scarf and flower lei; keep the norigae at the waist.
- Use measured crown-root coordinates for all 36 heads. Separate rear and front portions of crowns, floral crowns, hats and headbands. Place the veil behind the head and body, not over the face.
- Preserve original raster assets, face identities, saved hairstyles, outfit choices and album records. This is runtime SVG compositing; no image regeneration or API service was used.
- Natural-head preview mode only. The ordinary legacy route remains available.

## Verification

- 74 unit/regression tests passed: all princess tests plus PWA and English-feedback regression tests.
- New geometry tests cover all 12 princesses × 13 garments × 3 hairstyles. They also check necklace drape rendering and all 13 headwear choices across all 36 heads, including SVG ID/reference integrity.
- `attachment-smoke.cjs`: 72 embedded photo exports (all 36 heads with star/ballgown); center neck pixels remain opaque across the join. This guards against the reported transparent gap, not every possible visual defect.
- `attachment-review.cjs`: enlarged comparison sheets for all 36 heads in dark/default clothing and all eight neck accessories across 12 princesses; additional headwear review sheets. Manual inspection found and corrected hair clipping and veil/headband occlusion during iteration.
- `wardrobe-smoke.cjs`: Edge at 1180×820, 820×1180 and 390×844; 13 dress changes, 12 princess selections, hairstyle persistence, reload, dye/skin isolation, and embedded exports with warmed assets while offline.
- Browser checks use desktop Edge at tablet/phone sizes, not a physical iPad Safari test.

Cache v119, studio v48, wardrobe v3. Salon assets/module and card asset versions unchanged.
