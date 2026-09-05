# Fashion doll studio v3

Replaces the retired vector stage, wardrobe thumbnails and portraits with 95 generated product-photography-style raster assets. This is a 2D layered dress-up renderer, not a realtime 3D engine.

## Art and provenance

- Mode: built-in image generation (`image_gen`), nine original atlases. No external image search or Disney/Barbie artwork was used.
- Sources: `../../character-assets/princess-dressup/studio-v3/` (retained original RGBA atlases outside the published Site).
- Exact generation prompts are preserved in `art-prompts/wardrobe-generation-notes.md`, `art-prompts/accessory-prompts.json`, and `art-prompts/world-atlas-prompts-v3.json`.
- Published crops are in `assets/studio-v3/`: 13 outfits, 8 wigs, 9 shoe pairs, 13 headpieces, 8 necklaces, 11 hand props, 6 back pieces, 13 pets and 14 scenery images.

## Fit and runtime

`studio.js` uses a 420 × 680 stage, fitted hair openings, category-specific attachment rectangles and piecewise dress fitting. Eight separately generated doll originals in `assets/bodies-v4/` replace the shared recolored face. Individual face shapes, complexions and body builds are rendered without a shared skin-color filter. Character-specific height/width and outfit fitting are independent design choices, not racial body classifications. Mermaid tails and the trouser outfit hide the doll's underlying legs; shoes are suppressed only for mermaid tails.

Body identity generation used built-in `image_gen`; exact prompts are in `art-prompts/body-identities-v4.json`. The generator repeatedly baked a checkerboard into RGB outputs. With explicit user approval, a border-connected neutral-color flood fill removed only the background before alpha-preserving resizing and PNG optimization. Originals remain in `../../character-assets/princess-dressup/bodies-v4/`.

Images retain alpha transparency, material lighting and color selection. Small crops are palette-optimized; dress crops avoid neighboring atlas cells. The 12-color wardrobe and 10 hair colors, all item IDs and saved outfits remain compatible. Photo export embeds every selected asset in its SVG before PNG conversion. Old album photos remain unchanged.

## Verification

Run `node --test princess/tests/studio.test.js` from the Site root. It checks all 103 assets, every selection's export, saved-state compatibility, SVG reference integrity, loading failures and concurrent asset-request deduplication. Raster contact sheets were rendered directly from the production renderer for all 13 outfits and all eight default princess looks.

No browser/device interaction tests are claimed for this change.

The focused studio and cache checks pass. The full combined run passed 17 of 18 tests; the unchanged Avengers child-worker migration assertion remains a separate existing failure.
