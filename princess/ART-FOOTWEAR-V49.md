# Worn footwear V49

Mode: **edit / reference-based generation**, built-in ImageGen.

Nine new masters live in `assets/footwear-v49/`. Each has an untouched 1254×1254 PNG and a quality-95 WebP encoding. The green backdrop is intentional: `salon.js` keys it at runtime, including in embedded photo exports. No external background-removal service was used. Old `studio-v3` shoes and all accepted head/clothing originals are preserved.

## Prompt recipe (condensed from the generation requests)

Reference chain: accepted party outfit → matching feet wearing pumps → cropped worn-footwear master → shoe variants. Keep the same frontal standing pose, natural foot spacing, skin, calf proportions, perspective and floor baseline. Premium painted 3D illustration matching the doll. Both calves enter at the upper edge; shoes are worn by real feet, not empty product cutouts. Square composition; uniform solid green #00FF00 background; no floor, cast shadow, lettering or logo. Clothing-independent pale blue shoe material, with warm skin kept separate for runtime tinting.

| ID | Variant direction | Generated source file |
| --- | --- | --- |
| pumps | Pale icy-blue satin pumps, rounded toe, modest low heel and fitted instep | exec-ac281df4-bdd2-44d9-9644-b45ec5d5600a.png |
| boots | Knee-high soft blue leather boots; low heel; rounded toe; calf inside a closely fitted opening | exec-850d9b29-b038-437e-b51f-dd141a76d5bb.png |
| sneakers | Blue low-top leather sneakers, white laces and rubber soles; no socks | exec-f3352419-b3a3-4464-81cb-830131af753c.png |
| sandals | Slim blue forefoot and ankle straps with buckle; natural visible toes | exec-6c868780-00a5-4ff8-bc99-7adb07f81d0f.png |
| ballet | Blue satin flats, small bows and crossed ankle ribbons; standing flat, not en pointe | exec-37c2f902-d09c-498f-a77b-537e0d458a7c.png |
| rain | Mid-calf blue rubber wellingtons, no ornament, fitted calf openings | exec-bd0b7ef4-128f-4365-b027-58e03b2ec7a5.png |
| glass | Translucent icy-blue crystal slippers, fine facets, tiny star ornament; visible foot inside | exec-4383d9c9-9d26-46b9-bfc0-1db72f5ab967.png |
| slippers | Powder-blue closed plush slippers, small pompom and low sole | exec-ca35ec02-c4ae-48bb-897b-27cb51543579.png |
| kkotsin | Korean pale-blue silk flower shoes, embroidered flowers, subtly upturned rounded toes and low sole | exec-5bec7731-7e21-4ab3-8315-3e3afac9f2ed.png |

Source directory: `C:/Users/김시현/.codex/generated_images/01a05219-86c8-7d13-86e3-0697aed74889/`.

The first full-body trial returned an opaque checkerboard instead of genuine transparency and was rejected. Only the nine solid-green masters above are integrated. Measured coordinates and skin samples are in `footwear.js`; `tests/measure-footwear.cjs` can reproduce the read-only pixel measurements.
