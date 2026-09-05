# Princess v32

- Added a dedicated hair tab with eight reusable hairstyles, independent of character selection and the existing ten hair colors. Hair is saved per princess; older saves retain each princess's original hairstyle. Random outfits now include hairstyles.
- Added a shared safe-area transform to the live scene and exported photos. Every existing hairstyle and head accessory clears the photo's top edge by at least 16 scene pixels for all eight character heights. PNG photo dimensions remain 840 x 1360; existing albums remain readable.
- Converted 97 active PNG assets (wardrobe, hair, bodies, gripping hands) to WebP quality 88 with lossless alpha. Original PNGs remain available for older cached clients. New renderer and v32 service-worker warmup load WebP instead, and no longer warm unused legacy body/fabric images. Background JPEGs are unchanged.

## Asset measurements

| Measurement | Result |
| --- | --- |
| Original active PNG bytes | 3,473,325 |
| New WebP bytes | 2,408,714 |
| Reduction | 30.65% |
| Changed dimensions | 0 |
| Maximum alpha-channel error | 0 |

This is an asset-size measurement, not an iPad first-load timing benchmark. No new generated images were needed.

## Checks

- Princess suite: catalog/assets, 103 export cases, 936 outfit/shoe combinations, all 64 character/hairstyle combinations, per-character persistence and old-save migration, headwear safe-area bounds, and real hair-control handlers tested with synthetic UI nodes.
- v32 cache contract passes and all 111 current game assets are present.
- Full PWA suite has three pre-existing failures, reproduced with unmodified HEAD sources: obsolete Sanguo bundle path, Sanguo asset inventory count, Avengers child-worker migration. These unrelated failures were not changed in this update.
- No browser/iPad interaction testing is claimed.
