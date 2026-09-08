# 재이의 그림에서 만든 입체 캐릭터

- 제작: OpenAI 내장 image_gen 도구, 2026-09-08.
- 사용자 설명: 가운데 네 명은 가족, 왼쪽은 폼폼푸린, 오른쪽은 헬로키티.
- 참고: 사용자가 첨부한 생일 그림을 눈으로 확인해 색상·모자·표정·인원수를 프롬프트에 기술했다. 도구의 파일 참조는 환경 오류로 실패하여 직접 이미지 조건 입력은 사용하지 않았다.
- 가족의 실제 외모를 재현한 3D 모델이 아니라, 아이의 그림을 바탕으로 한 입체풍 봉제인형 래스터 이미지다. 가족 역할·이름은 추정하지 않았다.
- 최종 파일: jaei-family.webp, jaei-sanrio-friends.webp, 작은 진도 표시용 jaei-progress-friends.webp. 원본 투명도를 유지해 최적화했다.
- 원본 첨부 사진·손글씨는 공개 저장소에 포함하지 않는다.

## 가족 네 명 최종 프롬프트

Use case: stylized-concept. Asset type: transparent full-body family illustration for Jaei's math playground, based on her own birthday drawing. Exactly FOUR HUMAN FAMILY MEMBERS, no animals, no extra people, no inferred labels such as mother/father or names. Render the four figures as adorable premium handmade plush felt 3D dolls. Preserve the sequence and relative proportions visible in the drawing: from LEFT to RIGHT (1) a small family member, round smiling face, short dark hair, light grey outfit, (2) a second small family member of similar height, round smiling face, short dark hair, sky-blue outfit, (3) a taller family member with short curved dark bob hair and a pink triangular dress, (4) another taller family member with dark hair gathered to one side and a lighter pink triangular dress. All FOUR wear small green cone birthday party hats with dark pom-poms. Preserve childlike dot eyes and simple embroidered U-shaped smiles, soft cream felt faces, tiny mitten hands and oval feet, joyful welcoming waves. These are dolls inspired by a child's sketch, not reconstructions of real faces. Full-body standing in one row, clear space between each figure, no touching or overlapping, complete hats and feet, all four faces fully visible, balanced composition with generous clear transparent margins. Warm diffuse studio light, realistic rounded 3D volume, subtle felt fibers, matte toy materials. Wide landscape 1536x1024. Genuine alpha transparent background, no colored glow around silhouettes, no scenery, no floor, no shadows outside figures, no text, no labels, no worksheet, no watermark.

## 폼폼푸린·헬로키티 최종 프롬프트

Use case: stylized-concept. Asset type: premium transparent 3D plush toy duo inspired by Jaei's birthday drawing. Exactly TWO recognizable Sanrio characters standing full-body apart in one row: LEFT POMPOMPURIN, the soft pastel yellow golden retriever with long floppy ears, dark brown beret, small dark dot eyes, brown oval nose and gentle simple smile, chubby oval body, little arms and feet; RIGHT HELLO KITTY, white round cat head with TWO short pointed ears, red bow on her left ear (viewer right), black oval dot eyes, yellow oval nose, three fine whiskers on each cheek, NO MOUTH, white body wearing a simple pale pink dress. Keep canonical identities immediately recognizable. Warm handmade plush felt style matching children's birthday dolls, soft rounded realistic 3D volume, fine short fibers, even diffuse studio lighting. Both have a gently raised paw. Equal visual height, side-by-side separated by large transparent gap. Entire hats ears and feet visible with generous outer margins. Wide landscape 1536x1024. Real alpha transparent background. No floor, no setting, no glow outside silhouettes, no lettering, no logo, no watermark, no extra characters, no third ear, no mouth on Hello Kitty.



## 가족 구성 정정 · 최종 v2

사용자가 큰 두 인물은 엄마·아빠라고 확인했다. 작은 두 명은 아이들, 큰 두 명은 부모님으로 구별되게 다시 제작했다. 최종 파일은 `jaei-family-v2.webp`이다. 부모님의 정확한 좌우 순서는 확인되지 않아 새 그림에서는 아이 둘–엄마–아빠 순서로 배치했다. 실제 얼굴·이름은 추정하지 않았다. 이전 가족 프롬프트는 v1 제작 이력이다.

내장 image_gen 도구로 새 그림을 생성하고 투명도를 유지해 WebP로 최적화했다. 생성 원본: `exec-4df293ee-6716-43de-8da9-3d4a6cce61de.png`.

### v2 최종 프롬프트

Use case: stylized-concept. Asset type: transparent full-body family illustration for Jaei's math playground. The user clarified that the two larger figures in their child's original drawing are MOM AND DAD, not older children. Create EXACTLY FOUR Korean family members as premium handmade 3D plush felt dolls: TWO SMALL CHILDREN and TWO CLEARLY ADULT PARENTS. LEFT TO RIGHT for this new illustration: (1) small child with short dark hair and light grey top and trousers; (2) slightly taller child with short dark hair and sky-blue top and trousers; (3) ADULT MOTHER with dark shoulder-length bob hair, warm smiling adult face, pink knee-length dress, adult shoulder and torso proportions; (4) ADULT FATHER with short dark hair, warm smiling adult face, a muted dusty pink shirt and light beige trousers, broader adult shoulders. Adults approximately 1.5 times the children's height. Mother and father must clearly read as grown-up parents, not four young children and not two girls in dresses. Preserve the child's drawing's birthday joy and simple smiling faces. ALL FOUR wear green cone birthday hats with small dark pom-poms. Soft cream felt skin, simple dark embroidered eyes and gentle U-shaped smiles, subtle blush, rounded 3D volume, refined fabric seams, short fine plush fibers, matte toy materials. Full-body standing in one row, welcoming small waves, complete hats and feet, no overlap and generous clear gaps between people, leave outer transparent margins. Do not reconstruct actual faces or invent individual names. Warm even studio lighting without dramatic glow. Wide landscape 1536x1024. Genuine alpha transparency, no colored glow, no solid background, no floor or scenery, no shadows outside silhouettes, no animals, no writing or labels, no logo, no watermark. Age distinction between two children and adult mom and dad is the highest priority.

