# Princess v34: worn materials and natural pets

## Natural pets

- The original pet assets already contain natural fur, feathers, eyes and markings. The old global recoloring filter removed those colors.
- Pet rendering now bypasses tinting entirely, both on stage and in thumbnails/exports. Aspect ratio is preserved.
- Removed the pet palette. Default and random pets store only their ID. Old saved pet tints are dropped while preserving the selected pet and all other outfit choices.

## Wearing improvements

- Replaced the torso's recolored skin image used as garment lining with a crop of the selected garment's actual fabric image. This preserves fabric texture where the outer garment leaves small fitting gaps.
- Increased overlap between garment mesh bands to prevent translucent horizontal gaps.
- Recoloring now retains near-white specular highlights and dark fabric folds. An original-material-color option is available for clothing and accessories; existing custom outfit colors remain saved.
- Necklaces are fitted to the individual doll's center and neck height. Crowns and headwear are scaled/positioned against measured head width and crown height, while keeping the photo's top margin.
- Added small contact shadows where foreground hair meets skin, shoes meet feet, arms overlap clothing, and jewelry meets the doll. Existing behind/in-front layering and gripping hands are retained.

These are improvements to the existing 2D image-based dress-up renderer, not a conversion to a 3D body or physical cloth simulation. No new images were generated; existing photorealistic assets were reused.

## Verification

Eight princess tests pass, including 111 asset paths, 103 catalog export cases, 936 dress/shoe combinations, all 64 hair fits, all 13 pets rendering identically under different legacy tint colors, 100 random outfits with no pet color, original-material selection, and body-relative accessory registration. Existing unrelated PWA failures are outside this change. No browser/iPad visual test is claimed.
