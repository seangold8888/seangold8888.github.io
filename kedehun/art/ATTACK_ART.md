# Attack animation work — 2026-09-06

Status: user approved deterministic background removal and publication. The final RGBA PNGs were produced with tools/prepare-attack-art.ps1, with each pose isolated and feet aligned. Built-in imagegen returned opaque RGB with a baked checkerboard; the intermediate files are not used directly in the game.

Generation mode: built-in image_gen, referencing the existing lumi-v2.webp, mira-v2.webp and joy-v2.webp. Existing portraits are unchanged.

Intermediate output folder: `C:/Users/김시현/.codex/generated_images/01a07403-17ed-7ed2-baa8-d0d758741b9a/`

- Lumi: `exec-3b12215d-bf44-42c4-808e-385b740b6e93.png`
- Mira: `exec-e3f877ac-fd9c-4f31-883e-67d70954ca80.png`
- Joy: `exec-dbeb39cc-b842-4f7d-85f5-7e4095601fae.png`

All final images are 1254 × 1254, 418 × 418 cells. Whole connected figures were isolated before packing, so weapons crossing the original grid stay inside their own final frame. Mira's top-row blade/boot contact was manually separated along the inspected boundary. Per-hero scale and a common 390px foot baseline are applied in attack-motion.js.

Target files: `characters/lumi-attacks-v1.png`, `characters/mira-attacks-v1.png`, `characters/joy-attacks-v1.png`.

## Prompt set

Use case: stylized-concept. Asset type: production 2D side-scrolling action game character sprite atlas. Of the three attached reference images, ONLY Image [1 Lumi / 2 Mira / 3 Joy] is the identity, outfit, weapons, and painterly anime rendering reference. Create a NEW animation atlas of this same character.

Canvas: square 1536×1536 if possible, real transparent alpha background. EXACTLY 3 equal-width columns and 3 equal-height rows, nine uniform square cells. No visible grid or labels. Each cell contains one independent complete full-body figure. Entire weapon(s), hair, feet and outfit stay inside their own cell with small safety margins. Consistent character scale across ALL nine cells, figure feet baseline at 92% of each cell height and torso center consistent. Orient face and attack toward SCREEN RIGHT in all frames. Allocate enough space for full weapon reach, do not crop.

Three DIFFERENT attack moves, each read left-to-right:

- TOP ROW: diagonal downward slash — col1 bent elbows with weapon pulled behind upper shoulder, torso twisted back and knees loaded; col2 strong forward lunge and extended attacking arms during the diagonal slash to right; col3 hands cross down near forward hip, knees braced, blade finishes low to right.
- MIDDLE ROW: reverse upward slash — col1 lowered body and weapon drawn back beside rear hip; col2 upward-right attack with arm reaching upward and torso turning; col3 raised weapon past shoulder, recovered knees and distinct follow-through.
- BOTTOM ROW: heavy overhead slash — col1 both hands/arms raised HIGH overhead, knees bent and torso gathered; col2 deep forward lunge with arms and weapon crashing forward/down in front of body; col3 crouched finish with weapon held low in front.

Crucial: ALL NINE cells have genuinely different anatomically drawn shoulder, elbow, hand, knee, torso and weapon positions, readable animation progression. Do not simply rotate a static character cutout. Preserve the reference face, proportions, costume, hair identity, weapon design and richly polished painterly anime quality in every cell. Keep weapons solid and entirely visible; depict speed by actual body posture only.

Avoid: particles, swooshes, motion trails, VFX, halos, floor shadows, background color, checkerboard painted into pixels, captions, labels, text, panel borders, extra limbs or extra weapons. Transparent PNG cutout atlas only.

Lumi: preserve her exact anime face, enormous long violet braided high ponytail with gold ornament, purple-magenta-black gold-trimmed sleeveless outfit, dark purple armguards, asymmetric long stockings and sporty boots, and single curved luminous violet sword with ornate gold guard from Image 1.

Mira: preserve her exact anime face, long rose-pink high ponytail with floral black-gold ornament, coral red and black gold-embroidered cropped outfit with detached sleeves and skirt panels, asymmetric dark stocking and black-red boots, and large ornate GOLD CRESCENT POLEARM with black/red long shaft from Image 2.

Joy: preserve her exact cheerful anime face, dark navy twin buns with teal ribbons and gold flower ornaments, black-white-teal gold-trimmed cropped outfit and skirt panels, asymmetric dark stocking and teal sporty boots, and TWO distinct curved short TEAL BLADES with gold floral guards from Image 3.

## Code verification so far

Validation: run node --test kedehun/tests/*.test.js. Covers 27 pose selections, damage/sound synchronization, hit-stop, cancellation, loading failures, atlas crops, real RGBA output and offline entries, alongside easier gates and existing combat rules. No browser/device play-test was performed in this pass.
