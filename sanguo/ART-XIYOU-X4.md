# 서유기 X4 전장 원화 제작 기록

작성일: 2026-09-09

## 제작 방식

- Codex 내장 ImageGen으로 8개 전장마다 원경(far)·투명 중경(mid)·지면(ground)을 각각 별도 생성했다.
- 생성 원본은 `C:\\Users\\김시현\\.codex\\generated_images\\019ffb52-4ad5-7123-8b87-fab993874726`에 보존하고, 최종 선택본만 `sanguo/art/battlefield/`에 복사했다.
- 최종 게임 자산은 외부 리사이즈·보정 없이 생성 원본 그대로다. 런타임에서만 지면 상단을 페이드해 원경과 자연스럽게 합성한다.
- 공통 방향: 3:1 가로형, 반실사 중국 신화 판타지, 낮은 채도, 중앙 전투 시야 확보, 글자·UI·로고·워터마크·캐릭터 없음.
- 백호령은 아동 수위 원칙에 따라 해골·뼈·빈 눈구멍을 전부 금지했다.

## 최종 자산과 보존 원본

| 전장 | 게임 자산 | ImageGen 보존 원본 |
|---|---|---|
| 화과산 | `huaguoshan-{far,mid,ground}-v1.png` | `exec-6ae5a392-f3d3-44f1-ac6b-c016e77b0df6.png` · `exec-93f29519-1bd2-4538-90a8-8186b30393b7.png` · `exec-6d06e741-1f28-496d-9ef5-299708b3bd94.png` |
| 동해 용궁 | `donghai-{far,mid,ground}-v1.png` | `exec-6eaf2c8a-9e35-4415-a47f-f24474c3fed2.png` · `exec-895ac603-864a-475d-bcf1-1d3e58190be6.png` · `exec-d914474d-792b-4b0c-be47-f0b68ea1ba4c.png` |
| 천궁 | `heavenpalace-{far,mid,ground}-v1.png` | `exec-2705d74b-6abc-45e1-b5ec-0a2327521ff5.png` · `exec-de4f127b-6d38-4029-b53d-57560392515b.png` · `exec-f5481267-3ba3-4d8b-8c03-11fb5b2ce2c6.png` |
| 백호령 | `baihuling-{far,mid,ground}-v1.png` | `exec-0d61f8f1-1d1d-4018-804e-644320bbfb81.png` · `exec-1942ff2a-f9dd-42aa-a0f3-a3eb7f6ce087.png` · `exec-92c2101c-180c-44aa-976c-85b0b76e9ab4.png` |
| 연화동 | `lianhuadong-{far,mid,ground}-v1.png` | `exec-a57e4c88-535a-40a4-932b-66510844a1fd.png` · `exec-68b2f055-a4f6-480b-862d-65d93ecf45e5.png` · `exec-c27b7937-a7aa-4070-951e-73bd4513f263.png` |
| 화운동 | `huoyundong-{far,mid,ground}-v1.png` | `exec-a225491b-6aa4-493a-9f9f-c51afd5e3049.png` · `exec-2143d394-5baf-408f-9387-e773512b87b6.png` · `exec-bf349da6-4260-4055-bc66-3158b67808ca.png` |
| 화염산 | `flamemountain-{far,mid,ground}-v1.png` | `exec-0f48b204-d747-42a0-b091-86b6a7b1ff4c.png` · `exec-45874baa-0d7c-43e0-a511-edea2e089211.png` · `exec-3e36f322-cb9f-4a5a-8ea3-2c541314e2e0.png` |
| 사타령 | `shituoling-{far,mid,ground}-v1.png` | `exec-9c54696e-df63-4cee-8b9b-dc78ffeadb4f.png` · `exec-c029c197-a5a8-4b2f-a046-2bece47d0b6a.png` · `exec-e0498218-84a9-4943-952c-684c5cbd01c0.png` |

## 검증된 파일 특성

- 원경 8장과 지면 8장은 RGB 완전 불투명 PNG다.
- 중경 8장은 RGBA PNG이며 투명 픽셀 비율이 68.3~80.5%다.
- 모든 파일은 최소 1900×700 이상이고, 각 파일 크기는 1MB 이상이다.
- 게임에서는 far 0.06 / mid 0.30 / ground 1.0 시차로 그린다.

## 사용한 프롬프트

### 화과산 (`huaguoshan`)

원경:

```text
Use case: stylized-concept
Asset type: production 2D side-scroller game environment, FAR background layer
Primary request: Huaguo Mountain and Water Curtain Cave from Journey to the West, a premium painted battlefield background for children
Scene/backdrop: luminous spring mountain wilderness at early morning, layered misty Chinese limestone peaks, a distant tall waterfall descending through a natural stone arch, soft cloud banks and tiny distant peach blossoms
Style/medium: polished semi-realistic hand-painted Chinese mythic fantasy environment, rich natural texture, same premium painterly finish as historical arcade character art
Composition/framing: wide panoramic landscape, straight side-scroller camera, visual horizon exactly around 60 percent from the top; only sky and distant scenery, broad readable shapes, horizontally repeat-friendly edges; lower 40 percent kept calm and low-detail for the combat lane
Lighting/mood: bright jade-green dawn, adventurous, welcoming, child-friendly
Color palette: pale celadon sky, jade forest, moss green, mist white, restrained peach accents; medium-low saturation so colorful heroes stand out by at least 25 luminance points
Constraints: opaque background; no characters, monkeys, enemies, weapons, UI, text, symbols, logos, watermark, borders or frame; no close foreground objects; no important subject cut at left or right edge; no photorealism
Avoid: flat vector silhouettes, modern objects, scary imagery, high-frequency clutter, huge bright waterfall behind the player
```

중경:

```text
Use case: stylized-concept
Asset type: production 2D side-scroller game environment, MID parallax overlay
Primary request: Huaguo Mountain Water Curtain Cave structures as a transparent painted overlay for children
Subject: a broad moss-covered natural stone arch around a narrow waterfall, layered pine and peach trees, a few rounded boulders and light mist wisps, all environmental only
Style/medium: polished semi-realistic hand-painted Chinese mythic fantasy environment, crisp but restrained shapes matching premium historical arcade art
Composition/framing: very wide panoramic side view; environmental structures anchored around the 60-percent horizon; a broad open center and clear lower combat lane; balanced clusters across the width, horizontally repeat-friendly edges
Lighting/mood: fresh jade dawn with gentle rim light
Color palette: muted jade, moss, slate stone, mist white, tiny peach accents; darker and less saturated than a playable hero
Constraints: genuinely transparent alpha everywhere outside the isolated structures; no painted sky, no solid backdrop, no checkerboard, no ground plane, no characters, monkeys, enemies, faces, weapons, text, symbols, logos or watermark; no tall object blocking the center; no cropped focal object at edges
Avoid: flat black silhouettes, photographic cutouts, scary cave face, clutter
```

지면:

```text
Use case: stylized-concept
Asset type: production 2D side-scroller game environment, GROUND parallax tile
Primary request: Huaguo Mountain combat ground, a premium painted horizontal floor texture
Scene/backdrop: mossy mountain stone path with damp slate slabs, shallow puddle glints, soft grass tufts, a few peach petals and tiny rounded pebbles
Style/medium: polished semi-realistic hand-painted Chinese mythic fantasy ground texture, rich material detail but calm gameplay readability
Composition/framing: extremely wide horizontal strip viewed in shallow side perspective, no sky and no horizon; continuous walkable surface across the full width; designed to tile seamlessly left-to-right with matching edge color and texture; no large foreground props
Lighting/mood: soft jade morning light, grounded and welcoming
Color palette: deep moss green, wet slate, muted brown, restrained pale peach; dark enough for bright heroes and effects to stand out
Constraints: opaque full-canvas ground texture; no characters, animals, structures, cliffs, UI, text, symbols, logos, watermark or border; no large bright patch behind player feet
Avoid: top-down map view, checkerboard, repeating obvious motif, high-contrast clutter
```

### 동해 용궁 (`donghai`)

원경:

```text
Use case: stylized-concept
Asset type: production 2D side-scroller game environment, FAR background layer
Primary request: the underwater Dragon Palace of the East Sea from Journey to the West, a premium painted battlefield background for children
Scene/backdrop: deep turquoise ocean, distant coral mountains and palace roofs, pale sunbeams filtering down through water, slow bubbles and soft caustic light, a grand but distant sea kingdom
Style/medium: polished semi-realistic hand-painted Chinese mythic fantasy environment, rich material texture, premium historical arcade game art
Composition/framing: extremely wide panoramic straight side view for a side-scroller; horizontally repeat-friendly edges; no important subject cut at left or right edge
Constraints: no characters, creatures, enemies, weapons, UI, text, symbols, logos, watermark, border or frame; no photorealism
Avoid: flat vector silhouettes, modern objects, scary imagery, high-frequency clutter
Composition detail: visual horizon around 60 percent from the top; only water, sky-like ocean depth and distant scenery; lower 40 percent calm and low-detail for combat
Lighting/mood: mysterious luminous turquoise, regal, adventurous, child-friendly
Color palette: deep teal, jade blue, muted coral, pale aqua highlights; medium-low saturation so heroes remain dominant
Constraints extra: opaque background; no close pillars or floor, no giant fish, no dragon face
```

중경:

```text
Use case: stylized-concept
Asset type: production 2D side-scroller game environment, MID transparent parallax overlay
Primary request: East Sea Dragon Palace structures as an isolated painted overlay
Subject: elegant turquoise coral columns, glazed jade palace gateways, giant shell ornaments and low coral gardens, arranged as environmental architecture only
Style/medium: polished semi-realistic hand-painted Chinese mythic fantasy environment, rich material texture, premium historical arcade game art
Composition/framing: extremely wide panoramic straight side view for a side-scroller; horizontally repeat-friendly edges; no important subject cut at left or right edge
Constraints: no characters, creatures, enemies, weapons, UI, text, symbols, logos, watermark, border or frame; no photorealism
Avoid: flat vector silhouettes, modern objects, scary imagery, high-frequency clutter
Composition detail: structures anchored around the 60-percent horizon, broad open center and clear lower combat lane, balanced clusters across the width
Lighting/mood: soft aqua caustic highlights, stately and magical
Color palette: muted teal stone, aged gold, coral red accents, pearl white
Constraints extra: genuinely transparent alpha outside structures; no painted water backdrop, no solid background, no checkerboard, no ground plane; no tall central obstacle
```

지면:

```text
Use case: stylized-concept
Asset type: production 2D side-scroller game environment, GROUND parallax tile
Primary request: walkable floor of the East Sea Dragon Palace
Scene/backdrop: dark turquoise jade flagstones under shallow water, fine sand in seams, tiny shells, pearl chips and subtle moving-light patterns
Style/medium: polished semi-realistic hand-painted Chinese mythic fantasy environment, rich material texture, premium historical arcade game art
Composition/framing: extremely wide panoramic straight side view for a side-scroller; horizontally repeat-friendly edges; no important subject cut at left or right edge
Constraints: no characters, creatures, enemies, weapons, UI, text, symbols, logos, watermark, border or frame; no photorealism
Avoid: flat vector silhouettes, modern objects, scary imagery, high-frequency clutter
Composition detail: continuous walkable surface across full width, shallow side perspective, no sky or horizon, designed to tile seamlessly left-to-right; no large props
Lighting/mood: cool underwater glow, calm readable floor
Color palette: deep teal, blue jade, muted sand, restrained pearl highlights; dark enough for bright heroes
Constraints extra: opaque full-canvas ground texture; no structures, cliffs or large coral
```

### 천궁 (`heavenpalace`)

원경:

```text
Use case: stylized-concept
Asset type: production 2D side-scroller game environment, FAR background layer
Primary request: the Celestial Palace during Sun Wukong's heavenly uprising, a premium painted battlefield background for children
Scene/backdrop: vast blue dawn above a sea of white clouds, distant floating jade-and-gold palace roofs and elegant bridges, layered heavenly mountains fading into light
Style/medium: polished semi-realistic hand-painted Chinese mythic fantasy environment, premium historical arcade game art, rich but readable materials
Composition/framing: extremely wide panoramic straight side view for a side-scroller; horizontally repeat-friendly edges; no important subject cut at left or right edge
Constraints: no characters, gods, creatures, enemies, weapons, UI, text, symbols, logos, watermark, border or frame; no photorealism
Avoid: flat vector silhouettes, modern objects, scary imagery, high-frequency clutter
Composition detail: visual horizon around 60 percent from the top; only sky, cloud sea and distant architecture; lower 40 percent calm and low-detail for combat
Lighting/mood: clear sacred blue dawn, majestic and exhilarating, child-friendly
Color palette: cobalt and pale sky blue, pearl cloud white, restrained jade and antique gold; medium-low saturation around combat lane
Constraints extra: opaque background; no close pillars, floor or giant central sun
```

중경:

```text
Use case: stylized-concept
Asset type: production 2D side-scroller game environment, MID transparent parallax overlay
Primary request: Celestial Palace terraces as an isolated painted overlay
Subject: elegant jade balustrades, gold-capped cloud pillars, two small palace pavilions, curling cloud platforms and hanging celestial lantern shapes without writing
Style/medium: polished semi-realistic hand-painted Chinese mythic fantasy environment, premium historical arcade game art, rich but readable materials
Composition/framing: extremely wide panoramic straight side view for a side-scroller; horizontally repeat-friendly edges; no important subject cut at left or right edge
Constraints: no characters, gods, creatures, enemies, weapons, UI, text, symbols, logos, watermark, border or frame; no photorealism
Avoid: flat vector silhouettes, modern objects, scary imagery, high-frequency clutter
Composition detail: structures anchored around the 60-percent horizon, broad open center and clear lower combat lane, balanced side clusters
Lighting/mood: pale blue rim light and soft gold reflections, noble and airy
Color palette: muted jade, ivory, antique gold, pale blue
Constraints extra: genuinely transparent alpha outside structures; no painted sky, no solid backdrop, no checkerboard, no ground plane; no tall central obstacle
```

지면:

```text
Use case: stylized-concept
Asset type: production 2D side-scroller game environment, GROUND parallax tile
Primary request: walkable jade cloud terrace floor of the Celestial Palace
Scene/backdrop: large blue-jade flagstones with fine gold inlay lines, soft cloud mist at shallow seams, a few subtle worn marks
Style/medium: polished semi-realistic hand-painted Chinese mythic fantasy environment, premium historical arcade game art, rich but readable materials
Composition/framing: extremely wide panoramic straight side view for a side-scroller; horizontally repeat-friendly edges; no important subject cut at left or right edge
Constraints: no characters, gods, creatures, enemies, weapons, UI, text, symbols, logos, watermark, border or frame; no photorealism
Avoid: flat vector silhouettes, modern objects, scary imagery, high-frequency clutter
Composition detail: continuous walkable surface across full width in shallow side perspective, no sky or horizon, tileable seamlessly left-to-right, no large props
Lighting/mood: cool luminous dawn, solid and readable
Color palette: deep blue jade, muted ivory cloud, restrained antique gold; dark enough for heroes
Constraints extra: opaque full-canvas ground texture; no railings, buildings or floating islands
```

### 백호령 (`baihuling`)

원경:

```text
Use case: stylized-concept
Asset type: production 2D side-scroller game environment, FAR background layer
Primary request: Baihu Ridge from Journey to the West, a mysterious but child-safe painted battlefield
Scene/backdrop: cool overcast mountain ridge, layered ash-gray hills, pale distant cliffs, thin silver mist, a faded white path winding toward a small old shrine silhouette
Style/medium: polished semi-realistic hand-painted Chinese mythic fantasy environment, premium historical arcade game art, rich but readable materials
Composition/framing: extremely wide panoramic straight side view for a side-scroller; horizontally repeat-friendly edges; no important subject cut at left or right edge
Constraints: child-safe; no characters, ghosts, creatures, enemies, weapons, bones, skeletons, skulls, empty eye sockets, graves, UI, text, symbols, logos, watermark, border or frame; no photorealism
Avoid: horror, gore, Halloween imagery, flat vector silhouettes, modern objects, high-frequency clutter
Composition detail: horizon around 60 percent from the top; only sky and distant scenery; lower combat lane calm and low-detail
Lighting/mood: quiet silver afternoon, mysterious rather than frightening
Color palette: dove gray, muted lavender, blue slate, pale silver; medium-low saturation so heroes stand out
Constraints extra: opaque background; no close trees, shrine or floor; the hills must not resemble faces
```

중경:

```text
Use case: stylized-concept
Asset type: production 2D side-scroller game environment, MID transparent parallax overlay
Primary request: child-safe Baihu Ridge structures as an isolated painted overlay
Subject: elegant leafless plum trees, wind-bent pale grass, a small weathered roadside shrine with closed wooden doors, smooth standing stones and drifting white cloth ribbons without writing
Style/medium: polished semi-realistic hand-painted Chinese mythic fantasy environment, premium historical arcade game art, rich but readable materials
Composition/framing: extremely wide panoramic straight side view for a side-scroller; horizontally repeat-friendly edges; no important subject cut at left or right edge
Constraints: child-safe; no characters, ghosts, creatures, enemies, weapons, bones, skeletons, skulls, empty eye sockets, graves, UI, text, symbols, logos, watermark, border or frame; no photorealism
Avoid: horror, gore, Halloween imagery, flat vector silhouettes, modern objects, high-frequency clutter
Composition detail: elements anchored around the 60-percent horizon, broad open center and lower combat lane, balanced side clusters
Lighting/mood: pale silver rim light, calm folktale mystery
Color palette: charcoal wood, soft gray stone, muted lavender cloth, pale silver
Constraints extra: genuinely transparent alpha outside structures; no painted sky, solid backdrop, checkerboard or ground plane; no human-like statues; no tall central obstacle
```

지면:

```text
Use case: stylized-concept
Asset type: production 2D side-scroller game environment, GROUND parallax tile
Primary request: walkable Baihu Ridge mountain path
Scene/backdrop: worn ash-gray stone and compact earth, fine pale grass, scattered plum petals and smooth pebbles, faint cool mist close to the ground
Style/medium: polished semi-realistic hand-painted Chinese mythic fantasy environment, premium historical arcade game art, rich but readable materials
Composition/framing: extremely wide panoramic straight side view for a side-scroller; horizontally repeat-friendly edges; no important subject cut at left or right edge
Constraints: child-safe; no characters, ghosts, creatures, enemies, weapons, bones, skeletons, skulls, empty eye sockets, graves, UI, text, symbols, logos, watermark, border or frame; no photorealism
Avoid: horror, gore, Halloween imagery, flat vector silhouettes, modern objects, high-frequency clutter
Composition detail: continuous walkable surface across full width in shallow side perspective, no sky or horizon, tileable seamlessly left-to-right, no large props
Lighting/mood: subdued silver daylight, grounded and readable
Color palette: dark slate, muted brown-gray, pale lavender petals
Constraints extra: opaque full-canvas ground texture; no shrine, tree trunks, holes or burial imagery
```

### 연화동 (`lianhuadong`)

원경:

```text
A wide 3:1 panoramic opaque far-background plate for a side-scrolling action game set inside Lotus Cave from Journey to the West. Vast violet and indigo limestone cavern, layered amethyst chambers receding into mist, distant lotus-shaped rock arches, faint cool purple light shafts from high cracks, tiny warm lotus lantern glows deep in the cave, calm dark lower combat band with the visual horizon around 60 percent height. Premium hand-painted semi-realistic Chinese mythic fantasy concept art, elegant atmospheric perspective, restrained saturation, readable silhouettes, cinematic but child-friendly, designed so colorful heroes remain the focus. No characters, creatures, faces, weapons, gore, UI, text, letters, symbols, logos, or watermark. Fully opaque rectangular panorama, no transparency, no border, no frame.
```

중경:

```text
A wide 3:1 transparent PNG middle parallax overlay for a side-scrolling action game in Lotus Cave from Journey to the West. Isolated clusters only: carved violet rock arch fragments at far left and right, a few lotus lanterns, elegant gold and silver gourd-shaped ornaments on small stone shelves, translucent purple crystals, wisps of cave mist. Keep the central 45 percent and the lower combat lane mostly open and transparent. Premium hand-painted semi-realistic Chinese mythic fantasy, restrained purple and muted gold palette, soft rim light, child-friendly. Genuine alpha transparency around and between every object; no painted backdrop, no black or white background, no checkerboard. No characters, creatures, faces, weapons, UI, text, letters, symbols, logos, or watermark.
```

지면:

```text
A wide 3:1 opaque ground texture plate for the bottom combat lane of a side-scrolling action game in Lotus Cave. Dark plum-gray cave stone floor viewed from a shallow elevated side-game angle, broad walkable center, subtle crystalline seams, scattered tiny violet crystal chips and muted gold dust, soft damp reflections, darker foreground edge. Premium hand-painted semi-realistic Chinese mythic fantasy, low saturation, calm readable values, seamless-looking left and right continuation. No sky, no horizon, no walls, no cliffs, no characters, creatures, faces, weapons, UI, text, letters, symbols, logos, or watermark. Fully opaque rectangular image, no transparency, no border.
```

### 화운동 (`huoyundong`)

원경:

```text
A wide 3:1 panoramic opaque far-background plate for a side-scrolling action game at Fire Cloud Cave from Journey to the West. Vast red volcanic grotto opening into a sea of ember-colored clouds, layered dark vermilion rock chambers, distant orange vents and small controlled flame glows, smoky red cloud light, calm dark lower combat band with the visual horizon around 60 percent height. Premium hand-painted semi-realistic Chinese mythic fantasy concept art, atmospheric depth, restrained saturation, cinematic and adventurous but child-friendly, never horrific, designed so heroes remain brighter than the scene. No characters, creatures, faces, weapons, gore, UI, text, letters, symbols, logos, or watermark. Fully opaque rectangular panorama, no transparency, no border, no frame.
```

중경:

```text
A wide 3:1 transparent PNG middle parallax overlay for a side-scrolling action game at Fire Cloud Cave. Isolated side clusters only: dark red rock pillars, small bronze braziers with compact controlled flames, warm fabric streamers without writing, curls of red smoke and a few ember sparks. Keep the central 45 percent and lower combat lane mostly open and transparent. Premium hand-painted semi-realistic Chinese mythic fantasy, restrained red, charcoal and bronze palette, child-friendly. Genuine alpha transparency around and between every object; no painted backdrop, no black or white background, no checkerboard. No characters, creatures, faces, weapons, gore, UI, text, letters, symbols, logos, or watermark.
```

지면:

```text
A wide 3:1 opaque ground texture plate for the bottom combat lane of a side-scrolling action game at Fire Cloud Cave. Dark basalt and deep red volcanic stone floor viewed from a shallow elevated side-game angle, broad walkable center, sparse small glowing fissures, powdery ash and a few ember flecks, restrained brightness and darker foreground edge. Premium hand-painted semi-realistic Chinese mythic fantasy, readable low-saturation values, seamless-looking left and right continuation, child-friendly. No sky, no horizon, no walls, no cliffs, no characters, creatures, faces, weapons, gore, UI, text, letters, symbols, logos, or watermark. Fully opaque rectangular image, no transparency, no border.
```

### 화염산 (`flamemountain`)

원경:

```text
A wide 3:1 panoramic opaque far-background plate for a side-scrolling action game at the Flaming Mountains from Journey to the West. Exterior at late sunset, layered crimson and burnt-umber mountain ridges fading into smoky distance, copper sky, visible heat haze, a few small distant flame vents, windswept ash, calm dark lower combat band with the visual horizon around 60 percent height. Premium hand-painted semi-realistic Chinese mythic fantasy concept art, grand atmospheric depth, restrained saturation, cinematic but child-friendly, designed so colorful heroes remain the focus. No characters, creatures, faces, weapons, gore, UI, text, letters, symbols, logos, or watermark. Fully opaque rectangular panorama, no transparency, no border, no frame.
```

중경:

```text
A wide 3:1 transparent PNG middle parallax overlay for a side-scrolling action game at the Flaming Mountains. Isolated side clusters only: black-red rock spires, a few charred twisting trees, weathered ancient stone markers with absolutely no writing, thin heat shimmer, small controlled flames and drifting ash near the edges. Keep the central 45 percent and lower combat lane mostly open and transparent. Premium hand-painted semi-realistic Chinese mythic fantasy, restrained crimson, charcoal and copper palette, child-friendly. Genuine alpha transparency around and between every object; no painted backdrop, no black or white background, no checkerboard. No characters, creatures, faces, weapons, gore, UI, text, letters, symbols, logos, or watermark.
```

지면:

```text
A wide 3:1 opaque ground texture plate for the bottom combat lane of a side-scrolling action game at the Flaming Mountains. Lava-scorched dark basalt road viewed from a shallow elevated side-game angle, broad walkable center, sparse thin orange cracks, soot, windblown ash and worn stone plates, restrained glow with a darker foreground edge. Premium hand-painted semi-realistic Chinese mythic fantasy, low saturation, readable gameplay values, seamless-looking left and right continuation, child-friendly. No sky, no horizon, no walls, no cliffs, no characters, creatures, faces, weapons, gore, UI, text, letters, symbols, logos, or watermark. Fully opaque rectangular image, no transparency, no border.
```

### 사타령 (`shituoling`)

원경:

```text
A wide 3:1 panoramic opaque far-background plate for a side-scrolling final-stage action game at Lion Camel Ridge from Journey to the West. Dark mountain pass at stormy charcoal-and-gold dusk, layered jagged ridges, a distant fortified mountain gate, muted golden cloud breaks and a few tiny floating feather glints, calm dark lower combat band with the visual horizon around 60 percent height. Premium hand-painted semi-realistic Chinese mythic fantasy concept art, imposing and climactic yet child-friendly, elegant atmospheric depth, low saturation, heroes must remain the visual focus. No characters, creatures, monster silhouettes, faces, weapons, gore, UI, text, letters, symbols, logos, or watermark. Fully opaque rectangular panorama, no transparency, no border, no frame.
```

중경:

```text
A wide 3:1 transparent PNG middle parallax overlay for a side-scrolling final-stage action game at Lion Camel Ridge. Isolated side clusters only: fragments of a dark fortified gate, twisted windswept trees, muted gold feather-shaped banners without writing, weathered stone posts decorated only with simple rounded abstract animal patterns, drifting dust and a few golden feathers. Keep the central 45 percent and lower combat lane mostly open and transparent. Premium hand-painted semi-realistic Chinese mythic fantasy, charcoal, bronze and muted gold palette, imposing but child-friendly. Genuine alpha transparency around and between every object; no painted backdrop, no black or white background, no checkerboard. No characters, creatures, monster silhouettes, faces, weapons, gore, UI, text, letters, symbols, logos, or watermark.
```

지면:

```text
A wide 3:1 opaque ground texture plate for the bottom combat lane of a side-scrolling final-stage action game at Lion Camel Ridge. Dark slate stone road viewed from a shallow elevated side-game angle, broad walkable center, windblown dust, cracks, worn paving slabs and a restrained scatter of small golden feathers, darker foreground edge. Premium hand-painted semi-realistic Chinese mythic fantasy, charcoal and muted gold palette, low saturation, seamless-looking left and right continuation, child-friendly. No sky, no horizon, no walls, no cliffs, no characters, creatures, faces, weapons, gore, UI, text, letters, symbols, logos, or watermark. Fully opaque rectangular image, no transparency, no border.
```
