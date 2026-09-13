# 태오 띠 수정

2026-09-13 사용자 정정: **띠가 파란 바탕에 초록 줄이다. 도복은 기존 흰색 그대로.**
파란 도복이나 흰 바탕의 초록 띠로 바꾸는 것이 아니다. 기존 얼굴·머리·표정·발차기·배경·주황빛 궤적은 유지한다.
카드와 원정 결말은 같은 art/taeo.webp를 공유하므로 한 번 교체하면 둘 다 반영된다. 능력치/기술/획득 조건은 변경하지 않는다. 수학 게임 원화도 변경하지 않는다.

## 내장 이미지 편집 프롬프트

Use case: precise-object-edit / identity-preserve. The most recent image is the edit target, the existing Taeo game card illustration. Make ONLY this correction: replace the black martial arts WAIST BELT with a BLUE BASE BELT having ONE GREEN STRIPE running LENGTHWISE along its center. Royal blue fabric forms both visible edges of the belt, a clearly visible emerald green central longitudinal stripe follows all portions of the waist wrap, tied knot, and BOTH hanging belt ends. Not transverse rank tape, not a green belt with blue stripe, not black, not a white belt. Keep the entire taekwondo UNIFORM WHITE, including white pants and white jacket; retain its original dark neckline trim. Preserve this EXACT same boy's face, short brown hair, age, proportions, facial expression, raised-leg kicking pose, hands, bare feet, composition, camera, dojo, moonlight, fiery orange bird-like kick trail, painting style, shadows and textures. Do not recolor the uniform blue. No new objects or lettering. Output full portrait image 1024x1536 PNG. Change only the belt, keep everything else as close to identical as possible.

내장 image_gen 사용. 파일 직접 참조가 샌드박스 오류로 막혀 화면에 읽어 온 원화를 편집 입력으로 사용했다. 산출물: art/taeo.png, art/taeo.webp.

## 검증 결과

- 카드 테스트 321개 통과, 실패 0개.
- campaign-ending-smoke.cjs 통과: 3개 화면 크기, 오프라인 결말 재개, 가족 그림, 보상 합류 및 카드 문제 확인.
- 서비스 워커 v102, 카드 모듈 v61로 캐시 갱신. 공개 배포는 아직 하지 않았다.
