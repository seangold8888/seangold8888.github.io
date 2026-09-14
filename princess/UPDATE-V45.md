# V45 — pre-worn wardrobe for every princess

Preview: `/princess/?heads=natural&princess=mermaid&v=45`.

## Delivered

- All 13 garments now use jointly painted clothing/body art for all 12 princesses (156 combinations) in natural-head preview mode.
- Twelve new outfit originals plus the accepted V44 mermaid body; no old mannequin, circular joints, dress mesh or lining patch in this branch.
- Garment sprites are shared, with runtime skin material and existing body proportions adapted to each princess. Heads remain the accepted V43/V44 identities.
- Clothes can change color independently of skin. The rainbow dress retains its original multicolored fabric.
- Shoe positions follow the new garment foot anchors; full-length hems cover shoe shafts, with toes visible. Mermaid tails hide shoes.
- Saved outfits, legacy hairstyle/color fields, mermaid salon selection and photo albums are preserved.
- Mermaid keeps her three salon styles. This update does not create three salon variations for the other eleven princesses.
- Normal mode without `heads=natural` retains the legacy renderer pending preview acceptance.
- Cache v116, studio v45, wardrobe module v1. Card asset version v63 is unchanged.

## Artwork and prompts

Built-in image generation produced twelve transparent 1024 × 1536 original PNGs in `assets/wardrobe-v45/`, with quality-92 WebP copies. Original generated pixels are retained; skin and cloth separation happens in runtime SVG rendering.

Exact prompts and original generation paths: [wardrobe-prompts-v45.json](wardrobe-prompts-v45.json).

New pairs: ballgown, aline, party, mermaidline, hanbok, tutu, winter, star, rainbow, summer, rose and adventure. Tail reuses `assets/salon-v44/mermaid-tail-body.png` / `.webp`.

## Verification

- 67 unit/regression tests pass (princess suite, PWA and hub-English feedback).
- `wardrobe-review.cjs`: 156 SVG photo exports with embedded assets, unique IDs and no legacy dress layers; all default princesses and all garment styles visually reviewed.
- `wardrobe-smoke.cjs`: 1180×820, 820×1180 and 390×844; 13 dress buttons, 12 princesses, save/reload, retained hairstyle, no horizontal overflow or page errors, warmed-offline exports. Pixel comparisons confirm red/blue fabric choices do not alter the sampled skin colors.
- `salon-smoke.cjs`: all three mermaid styles, garment swaps, saved selection and warmed-offline exports at the same viewport sizes.
- These are desktop-browser viewport checks, not a physical iPad or cold offline-install test.

Local work only. No push or public deployment in this update.
