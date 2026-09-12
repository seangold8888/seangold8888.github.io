# Combat cinema · first effects pass

## Scope

- Lightning (Zeus and matching lightning skills), blade (sword/metal skills), frost (snow/ice skills).
- Original illustrations, card data, costs, AI and outcome timing remain unchanged.
- New single-pass WebGL energy paths, contact rings and short afterglow accompany the existing pooled Canvas particles.
- Particles are now above the recoiling card, so contact fragments are not hidden behind its illustration.
- Sound uses original WebAudio synthesis only: transient, body and scattered material detail. Three explicit cinema profiles opt in; existing emoji/material mapping and unrelated sounds stay unchanged. BGM/mute/recovery remain shared.
- This is not an upgrade of every skill's artwork or a sampled sound library.

## Safety / budgets

- No external assets, paid API or extra dependency.
- WebGL backing buffer <= 520,000 pixels, DPR <= 1.25; sustained slow frames reduce resolution to 65%.
- Existing CPU particle pool remains 120, DPR <= 1.5. No new DOM per particle.
- One WebGL draw per active frame; no idle rendering. Resize, backgrounding, battle exit and context loss cancel the shader.
- Reduced motion skips WebGL. Unsupported/lost WebGL preserves Canvas/CSS combat; restoring context recreates the program on the next attack.
- Contact is triggered by the same callback as damage/sound. Miss/evade never trigger contact flash or contact audio.
- Shared audio voice limit remains 24; new primary impact uses 6–8 voices, short tails and the existing master limiter.
- Shared cache v85; card CSS/JS v44. New module is cached exactly once.

## Verification

- Run node --test "cards/tests/*.test.js".
- Browser runner: cards/tools/combat-cinema-smoke.cjs (Playwright, Edge).
- Runner checks actual shader compilation and visible framebuffer pixels; real attack buttons; no early contact; miss guards; context loss/restoration; no idle rendering; fallback/reduced motion; 820x1180 / 1180x820 / 390x844 layout.
- Real OfflineAudioContext renders all three impact graphs and checks non-silence and no clipping. Screenshots and sound samples are written to a temporary QA directory.
- Existing cards.json SHA256: 164542f3671bf4d2da7763a184ebcb1d65cc499613427a0369e1464a5f4e74c0.
- Desktop viewport tests are not physical-iPad Safari performance certification. Actual device frame rate, perceived loudness and child preference remain to be checked.
- Not deployed by this implementation.
