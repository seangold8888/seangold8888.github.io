# V43 — integrated natural face and hair previews

The old wig sprites are not resized or masked again. Twelve new original faces
and hairstyles were painted together using the built-in image generation tool.
The source PNGs retain alpha at the tool's actual 1254 × 1254 output size.
Each has a quality-92 WebP counterpart for the game; originals remain preserved.

- Artwork: `assets/heads-v43/{princess-id}.png` and `.webp`.
- Exact prompts and original generation locations: `head-prompts-v43.json`.
- Preview: `/princess/?heads=natural&v=43`.
- One uniformly scaled face/hair sprite replaces both old head and old wig.
- Only the neck is blended; there is no face-opening cutout or skin recoloring.
- All existing body, dress, props, crowns and outfit save keys are retained.
- New sprites participate in photo export and the optional offline asset cache.

## Deliberate pending choice

The user was asked whether eight-way hairstyle swapping must remain.
Until answered, this is an explicit preview, not the normal default.
Normal navigation still supports saved hair styles/colors. The preview shows
fixed natural hair and explains this in the Hair tab, with a link back.
No existing hairstyle choice or saved outfit is deleted.

## Verification

- New alpha/asset, one-head-only, SVG-reference, export and legacy-preservation tests.
- Browser smoke: all 12 princesses at 1180×820, 820×1180 and 390×844.
- Full-length contact sheet visually inspected with default dresses and crowns.
- Local work only; no push or public deployment performed.
