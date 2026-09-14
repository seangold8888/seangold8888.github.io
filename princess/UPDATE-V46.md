# V46 — neck and proportion correction; salon expansion blocked

Preview: `/princess/?heads=natural&princess=lotus&v=46`.

Completed in natural-head wardrobe mode:

- Common body scale for all twelve princesses. The same garment no longer stretches by princess identity.
- Head scale reduced ten percent while keeping the eye anchor and original face intact.
- Body skin calibrated from accepted portrait neck samples and each outfit source; removed the independent grayscale skin palette that produced a visible color seam.
- Explicit neck fade from y100 to y110, wider than the cutout neck, so the short portrait neck blends into the painted body.
- Garment foot anchors measured individually; shoe sampling tests updated to the common body transform.
- Cache v117, studio v46, wardrobe v2; card assets unchanged at v63.

Verification: princess/PWA/English regression suite; three viewport wardrobe smoke checks including skin-vs-cloth pixel comparisons; 156 embedded SVG exports; enlarged Lotus/Mermaid/Snow/Moon neck comparison.

Not completed: two additional salon variants for each of the other eleven princesses. Built-in image generation was attempted, but local reference loading failed in the Windows tool sandbox. Inline-reference attempts produced opaque RGB images containing checkerboards, including two transparent-background retries. All were rejected, and no new hairstyle buttons or unusable art were installed. Existing mermaid styles and all saved outfits remain intact. API fallback was offered to the user and requires authorization plus a configured key. Full planned prompts and rejected generation paths are in `salon-plan-v46.json`.

No public deployment. This is a partial milestone, not completion of the full hairstyle request.
