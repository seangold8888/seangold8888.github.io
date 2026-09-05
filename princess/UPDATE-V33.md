# Princess v33: fitted hair

Replaced the fixed, character-specific width multiplier with measured head and hairstyle opening anchors. Each hairstyle now aligns its forehead and both temple edges to the selected doll, accounting for the body's horizontal offset. A three-section vertical fit adjusts crown volume, the forehead opening and the lower lengths independently. This brings Snow White's bob crown down from y=4.4 to y=12.3125 without moving its forehead opening away from her face.

The same fit is used on the stage, exported photos and character portraits; portraits explicitly use the unshifted body coordinates. Removed the old enlarged back-hair fill. No new image assets or download weight were added. Existing hair/color choices and saved outfits are preserved.

## Verification

- Seven focused tests pass: existing catalog/export, 936 clothing/shoe combinations, all 64 hair exports and save migration, photo bounds, hair-control handlers, 64 head/temple registrations and the v33 cache contract.
- A source-alpha raster check tested all 64 character/hair combinations against the original bald doll silhouettes: every sampled upper-scalp interior pixel was covered. It uses retained PNG hair assets with the same alpha as the published WebP files because the local SVG rasterizer cannot decode embedded WebP. This is not a browser screenshot or an iPad visual QA claim.
- No unrelated game code changed. The previously documented unrelated PWA-suite failures remain outside this fix.
