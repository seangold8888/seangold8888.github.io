# Four new princesses

The wardrobe now has 12 princesses. Existing eight characters and saved outfits remain unchanged.

| Character | Default look | Friend |
| --- | --- | --- |
| 설원 공주 (frost) | Silver braid, blue winter dress, crystal tiara | Rabbit |
| 사막별 공주 (sahara) | Dark waves, turquoise dress, gold jewels | Cat |
| 연꽃 공주 (lotus) | Dark updo, pink hanbok, flowers | Deer |
| 햇살 공주 (sunny) | Brown curls, golden ballgown | Dog |

All four use original new face/body artwork and individual gripping-hand sprites. The same shared hair, clothes, shoes and accessories remain selectable. Pets retain their natural colors.

## Assets and provenance

- Final assets: `assets/characters-v36/body-{frost,sahara,lotus,sunny}.webp` and `assets/characters-v36/grip-{frost,sahara,lotus,sunny}.webp`.
- Total additional game image payload: 240,916 bytes (about 235 KiB).
- Exact prompts and original generated source paths: [characters-v36.json](art-prompts/characters-v36.json).
- Artwork mode: built-in imagegen. Body drafts contained a baked checkerboard instead of alpha, including a second extraction attempt. With explicit user approval, local border-connected background removal was applied to the first drafts. No face or pose was regenerated during local removal. Original files are preserved.
- Each new body has independently measured head, wrist and foot attachment coordinates.

## Checks

- Studio regression tests: 12-character picker, independent saved outfits, 96 hair/character combinations, 1,404 dress/shoe/body combinations and 107 embedded photo export cases.
- Production SVG compositions inspected with all four default outfits and real alpha assets. Offline preview decodes WebP to PNG because the SVG rasterizer cannot decode embedded WebP; game assets remain WebP.
- Cache entries cover all eight new sprites; old princess and pet assets are unchanged.
