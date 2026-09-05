# Studio v3 wardrobe generation

Built-in `image_gen` was used for exactly two atlas generations in parallel. Original outputs were copied byte-for-byte; alpha was preserved.

## Deliverables

- `dresses-atlas.png`: actual 1254 × 1254 RGBA PNG; requested 2048 × 2048. Grid: 4 columns × 4 rows; first 13 cells occupied.
- `hair-atlas.png`: actual 1774 × 887 RGBA PNG; requested 2048 × 1024. Grid: 4 columns × 2 rows.

## Observed issues

Dresses: realistic garment silhouettes and physical fabric construction, correct requested ordering. Some stray white/colored alpha fringe and speckles around garments. Ten-percent padding and exact shared neckline anchor not honored; ballgown spills slightly across an equal-width cell edge. Adventurer garment includes attached boots despite no-feet constraint. Last three cells visually empty except any edge artifacts near neighboring garment. Component-aware cropping preferred over simple rigid splitting.

Hair: all eight styles in correct order; transparent face openings; no head/mannequin/skin. Head scales differ, some crowns and bottoms touch atlas/row borders, and afro nearly fills its cell. Extra trim/scale alignment needed in consumer.

## Dresses exact prompt

Use case: product-mockup
Asset type: production transparent sprite atlas for a realistic fashion-doll dress-up game.
Primary request: One square 2048 x 2048 PNG with a TRUE TRANSPARENT alpha background, arranged as an exact uniform invisible 4-column by 4-row grid. Each cell is 512 x 512 pixels. There are EXACTLY 13 separate front-facing miniature tailored garment objects occupying the first thirteen cells in reading order, and the final three cells are completely empty transparent pixels. No visible grid.
Scene/backdrop: genuine transparency everywhere outside the garments and through empty neckline and arm openings. No floor, paper, backdrop, shadow plane, or checkerboard graphic.
Subject/order, left to right then top to bottom:
Row 1: (1) silk princess ballgown with voluminous skirt, (2) floral embroidered A-line dress, (3) short party dress, (4) fitted mermaid silhouette evening gown with flared hem.
Row 2: (5) Korean hanbok jeogori jacket and full chima skirt worn as one outfit, (6) ballet leotard and tutu as one garment, (7) modest seashell bodice and long mermaid tail as one aligned outfit, (8) plush fur-trimmed winter gown.
Row 3: (9) celestial gown with tiny embroidered stars, (10) rainbow-inspired tiered layered gown but in neutral tonal ivory fabrics for later recoloring, (11) summer sundress, (12) rose-adorned gown.
Row 4: (13) adventurer tailored jacket and trousers aligned as one outfit; cells 14, 15 and 16 completely empty.
Style/medium: photorealistic studio product photography of actual miniature clothes constructed for a slender adult-proportion fashion doll. The silhouettes themselves must have dimensional realistic construction: narrow contoured bodices with curved bust shaping, narrow waists, sewn seams, fabric hems, convincing silk folds, lace, embroidery, stitches and plush fur. These are complete garment objects photographed as if supported by a fully invisible form, not fabric texture swatches, not illustrations, not SVG shapes with overlays.
Composition/framing: strictly front facing upright orthographic camera, no perspective tilt or rotation. Full garment visible, not cropped. Every outfit horizontally centered in its cell, same relative neckline top-center anchor at 10% from cell top. Keep at least 10% clear padding from all four cell edges. All clothes have consistent slim adult fashion-doll body scale, while skirts can broaden naturally. No overlap between cells.
Lighting: soft upper-left studio illumination, physically plausible depth, highlights and natural occlusion shading within the garment only; no cast shadows outside any object.
Palette: predominantly ivory and pearl neutral fabric, tasteful silver-neutral details, ready for game color tinting; no strongly colored fabric.
Constraints: transparent PNG with real alpha; NO person, doll body, skin, mannequin, visible support, hanger, head, arms, hands, legs or feet. Garments only. No outlines, no text, no labels, no numbering, no logos, no watermarks, no border, no grid lines, no background shadows. Never fill empty neckline or armholes with skin or a mannequin.

## Hair exact prompt

Use case: product-mockup
Asset type: production transparent wig sprite atlas for a realistic fashion-doll dress-up game.
Primary request: One 2048 x 1024 landscape PNG with TRUE TRANSPARENT alpha background. Exact uniform invisible grid with 4 columns and 2 rows, eight equally sized 512 x 512 cells. Render EXACTLY eight complete isolated miniature fashion-doll wigs in reading order.
Scene/backdrop: genuine transparency everywhere outside hair and throughout every hollow face opening. No backdrop, floor, paper, checkerboard graphic or shadow plane.
Subject/order, left to right then top to bottom:
Row 1: (1) smooth chin-length bob, (2) elegant bun updo, (3) long braid draped over viewer RIGHT shoulder, (4) long loose wavy hair.
Row 2: (5) twin pigtails, (6) Korean long braid draped over viewer LEFT shoulder, (7) long romantic curls, (8) voluminous natural afro.
Style/medium: photorealistic miniature wig product photography. Highly convincing rooted individual synthetic hair strands with natural glossy fiber reflections and rich strand separation. Real-dimensional shaped wigs intended to frame the face of a slender adult-proportion fashion doll; no illustrated shapes or flat texture swatches.
Composition/framing: strictly front-facing upright orthographic orientation, centered within each cell. Each full wig visible with minimum 10% clear padding inside every cell, no cropping or overlap. Consistent head scale and consistent crown-to-forehead position across all eight wigs. Hair cap occupies crown above the forehead, hair strands extend to the sides, and the entire central face area is hollow transparent. Long hair remains along the sides of the transparent face and neck opening. Do not render a head or a face inside the wig.
Lighting: soft upper-left studio illumination matching a realistic fashion doll. Natural gloss and shading on fibers only; no shadow outside the hair.
Color palette: neutral dark silver-gray hair throughout, suitable for subsequent color tinting.
Constraints: TRUE alpha transparency, including hollow face and neck openings. NO person, doll, skin, face, facial features, head, mannequin, neck, shoulders, bust, supports or wig stands. Wigs only. No text, labels, numbers, logos, watermark, border or grid lines. No painted background or checkerboard, no external cast shadows.
