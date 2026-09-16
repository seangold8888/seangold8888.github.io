# Rear-view family dance, 2026-09-16

Built-in image_gen, not API/CLI. Final project asset: family-rear-dance-v1.png.
Reference: existing party screenshot with dad, Taeo, Jaei and mom.

Generation brief: 4 columns (dad grey, younger boy blue, taller girl long dark hair pink dress, mother pink blouse and pale pink skirt), 3 rows (neutral rear, hips left, hips right). Green birthday hats, cute 3D toy style, full body fully clothed and rear-facing, hands on hips, planted feet. Head/shoulders/feet stay aligned across rows. Innocent family dance, no exaggerated anatomy, no faces, text or UI.

Final background-edit prompt: "Edit the sprite sheet just shown. Keep all 12 rear-facing clothed family figures and their poses, hats, clothing, exact placements, sizes unchanged. Replace ONLY the entire checkerboard background with a uniform opaque solid very pale peach #fff4e4 (RGB 255,244,228). No checker pattern, no transparency, no shadows, no gradients, no texture. Preserve the character pixels and positions as closely as possible. This is a background cleanup for a children's game."

The generated background is opaque, not transparent. Canvas uses a matching pale peach stage. Explicit crop rectangles handle nonuniform row placement. Neutral head and feet stay fixed; only the soft-masked waist/hip area blends into left/right drawings. No full-body rotation or translation is used for this mode. Reduced motion shows the neutral rear pose. Circle mode remains separate and unchanged.
