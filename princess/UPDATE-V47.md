# V47 — all-princess salon, without an API fallback

Local preview: `/princess/?heads=natural&princess=lotus&v=47`.

The V46 hairstyle blocker is resolved. Eleven princesses now have two additional painted hairstyles, alongside the accepted mermaid set. All twelve offer three choices: base, half-up, and braided (36 choices total). The saved base ID remains `wave` for compatibility. Hair texture, color, and facial likeness follow each accepted portrait; generated variants are not pixel-identical faces.

## Assets and compositing

- Built-in ImageGen created all 22 new originals; no API key, paid API fallback, or external background-removal service was used.
- Originals: `assets/salon-v47/{princess}-{half|braid}.png`, 1254 × 1254. These are **RGB green-background masters, not transparent PNGs**.
- Corresponding WebPs use quality 94. Accepted base heads in `heads-v43` and mermaid variants in `salon-v44` remain unchanged.
- Exact prompts and generated source paths: `salon-prompts-v47.json`.
- `salon.js` supplies an embedded SVG chroma matte and selective green-spill correction. The same filter is included in exported photos; the game does not upload pictures for processing.
- V46's shared body proportions and eye anchor remain. A narrower neck fade avoids cutting through long braids; Moon's braided portrait has its own measured eye row.
- Existing saved clothes and legacy hairstyle fields remain. Natural salon/wardrobe mode still requires `heads=natural`; the default legacy route is not switched in this milestone.

## Verification

- `node --test "princess/tests/*.test.js" "cards/tests/pwa.test.js" "cards/tests/hub-english-feedback.test.js"`: 71 passed, zero failed.
- `salon-all-smoke.cjs`: Edge at 1180×820, 820×1180, and 390×844. Each viewport tests all 36 selections, 12 reloads, dress/hairstyle persistence, no horizontal overflow, and embedded exports after assets were loaded and network disabled. This is a warm-asset test, not a cold offline-install test or a physical iPad Safari test.
- `salon-key-review.cjs`: all 22 new portraits pass transparent/opaque coverage checks and contain zero strongly green pixels after compositing. Reviewed against light, dark, and blue backgrounds.
- Wardrobe unit coverage includes 156 princess/dress combinations with braided hair.
- `salon-outfits-review.cjs`: reviewed all twelve full outfits with both half-up and braided hair; exported SVGs embed their images.

Cache v118; studio v47; salon v1; wardrobe v2. Card asset versions unchanged. Local work only: no public deployment or push in this milestone.
