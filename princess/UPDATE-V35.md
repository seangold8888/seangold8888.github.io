# Natural bob · v35

The screenshot showed Snow White's bob flaring too widely and ending in a hard horizontal line. This update replaces that bitmap with softly inward-curving ends and renders it as one aspect-preserving image, rather than three independently stretched sections. Other hairstyles, faces, outfits, and natural pet colors are unchanged.

## Asset and generation provenance

- Final game asset: `assets/hair-v35/hair-bob.webp` (640 × 694, RGBA, 135,406 bytes).
- Mode: built-in imagegen, new transparent sprite generation. No CLI/API fallback.
- Generated source: `C:/Users/김시현/.codex/generated_images/01a0669c-d791-7a23-8c8e-30e5c8ca5ed8/exec-32ff1f76-5a78-40c5-ab92-ba64d6b10edc.png`.
- Mechanical processing only: crop transparent margins (112,25,1034,1122), resize width 640, WebP quality 90 / alpha quality 100. Original retained.
- The initial reference-file call failed before generation due to the Windows sandbox; the successful generation used the following text prompt without an attached reference.

## Final prompt

```text
Use case: stylized-concept. Asset type: one transparent hair sprite for a realistic fashion-doll dress-up game.
The current hair is overly wide and rigid; the replacement must be compact and natural.
Generate ONLY a new standalone hair cutout, no head or face or neck or clothing or ribbon or UI. A graceful compact chin-length dark chestnut/neutral medium-gray brunette bob with a very subtle side part, natural individual fine strands, softly inward-curving tapered ends following the cheeks and jaw, modest crown volume, no blunt horizontal helmet edge and no broad flared trapezoid silhouette. Front-facing orthographic view, symmetric overall frontal silhouette. Photorealistic premium doll rooted-hair fibers, soft studio light, natural highlights; medium-neutral gray/brown values suitable for later recoloring.
The central face opening must be genuinely transparent, shaped like a tall oval face; upper forehead opening gently curved, visible forehead rather than heavy bangs; side hair hugs the temples and cheeks with narrow natural volume. The empty face opening should be about 55% of the total hair silhouette width (NOT a tiny face hole). Top of hair to chin-level tips should be about 1.2 times total silhouette width. The tips should taper softly near the jaw without a flat straight cut. Subtle asymmetry in strands is fine but no face rotation.
Render a single centered hair sprite filling about 80% of a square canvas with generous clean margins. Genuinely transparent RGBA background AND face opening, no baked checkerboard, no mannequin, no scalp/skin, no text, no bow, no crown, no accessories, no shadows detached from the hair.
```

## Verification

- Production SVG composition inspected with the real body, dress and bow. For the offline preview only, embedded WebP files were losslessly decoded to PNG because the SVG rasterizer does not decode embedded WebP.
- Eight studio tests pass, covering 64 hair/princess combinations, 936 dress/shoe combinations, 103 photo exports, persistence and natural pet colors.
- Bob-specific checks enforce original aspect ratio, a single image per front/back layer, forehead alignment, portrait alignment and safe photo margins.
- Versioned asset path avoids stale v34 bob data in existing browser caches.

