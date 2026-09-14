# V44 — mermaid salon and pre-worn costume

Preview: `/princess/?heads=natural&princess=mermaid&v=44`.

## Delivered

- Keep hairstyle selection: wave (accepted V43 head), half-up and side braid.
- New identity-reference hairstyle illustrations; no wig overlaid on a face.
- New pre-worn mermaid body, bodice and tail in a single image. No mannequin,
  fabric lining patch, distorted dress mesh or circular elbow joints in this mode.
- Save `salonStyle` separately, preserving legacy hairStyle/hairColor and outfits.
- Existing dresses remain selectable; they use their previous renderer.
- The pre-worn tail keeps its original teal color. UI hides recolor controls only
  for this outfit so skin never gets recolored along with the garment.
- Photo exports normalize octet-stream WebP responses to image/webp data URLs.
- Cache v115; studio module v44; card assets remain v63.

## Assets / generation

Built-in image generation was used, not the API/CLI.
Exact prompts, iterations and original generated paths: `salon-prompts-v44.json`.

- `assets/salon-v44/mermaid-half.png` and `.webp` (1254 × 1254).
- `assets/salon-v44/mermaid-braid.png` and `.webp` (1254 × 1254).
- `assets/salon-v44/mermaid-tail-body.png` and `.webp` (1024 × 1536).
- Existing wave: `assets/heads-v43/mermaid.png` and `.webp`.

Rejected checkerboard-background drafts were not shipped. Every final PNG
contains an alpha channel. WebP is converted at quality 92 / alpha quality 100.
Face identity is visually reviewed; generative variations are not pixel-identical.

## Verification

63 tests passed: princess suite, PWA and hub-English regression tests.
`tests/salon-smoke.cjs` passed at 1180×820, 820×1180 and 390×844:
three hairstyle choices, reload persistence, alternate dress then return to tail,
no horizontal overflow, no page errors, and photo exports with warmed assets
after networking is disabled. This is not a claim of a physical iPad test or a
cold offline service-worker installation test.

All three styles were visually inspected on the final full-length outfit.
This milestone covers one princess and one pre-worn outfit, not every garment
or all princesses. Other princesses and normal (non-preview) mode are preserved.
Local commit only; no push/public deployment.
