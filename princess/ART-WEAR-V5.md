# Wearing-layer revision

This remains a 2D image-layer dress-up game, not cloth simulation. This revision fixes attachment and occlusion instead of replacing the eight established identities.

- Shoes use individually measured left/right foot bounds. Soles render behind feet; upper/toe pieces render in front. Open-shoe masks show the foot rather than the empty product-photo interior. Covered toes/legs are masked per shoe type.
- Clothing uses a body-silhouette mask through the shoulders and waist, contact shadows, and additional torso/waist/hem fitting for party, tutu, summer and tiered gowns. Forearms/hands can occlude clothing; long sleeves keep their forearms covered.
- Necklaces run behind the neck and under front hair. Headpieces have separate rear and exposed front sections. Back hair closes small face-opening gaps with sampled hair pixels, not a flat painted patch.
- Each character has a new gripping-hand sprite, placed at its measured wrist. Every hand prop has a dedicated grip attachment point. The old open hand is hidden only while holding an item.
- Existing selections, color controls, saved outfits and photo export are preserved.

## Generated asset provenance

Mode: built-in `image_gen`, one new eight-cell atlas. Original: `../../character-assets/princess-dressup/wear-v5/grips-atlas-v5.png`. Published, alpha-preserving hand crops: `assets/wear-v5/grip-{snow,cinder,rapunzel,mermaid,thumb,kongjwi,briar,moon}.png`. No CLI image-generation fallback. Exact prompt: `art-prompts/gripping-hands-v5.txt`.

## QA

`node --test princess/tests/studio.test.js` checks 111 images, export for every catalog item, saved states, failure retries and 936 character/outfit/shoe layer combinations. Production SVG renders were visually inspected as raster contact sheets. No iPad/browser interaction test is claimed.
