# 서유기 X1 원화·플레이 연결

## 범위와 통합

2026-09-08, 내장 image_gen으로 원화 5장을 제작하고 프로젝트에 복사했다.
CLI/API fallback이나 외부 배경 제거 서비스는 사용하지 않았다.
채택한 PNG 픽셀은 생성 결과 그대로이며, 나타의 기본·투척 크기 차이와 발 위치는 렌더러의 프레임 앵커로 보정했다.

작업 중 원격 커밋 4c441fe가 8전장·후속 장수 데이터를 먼저 추가했다.
이를 보존해 통합한다. X1 원화 완성과 8전장 데이터 구현은 구분한다.
이랑진군·홍해아 플레이 원화, 은각대왕·홍해아·대붕금시조 보스 원화,
풍화륜 탑승과 3층 그림 배경은 이 문서의 완료 범위가 아니다.

## 채택한 파일

프로젝트: C:/Users/김시현/game-hub/deploy-sanguo-menu-20260906

| 대상 | 프로젝트 상대 경로 | 생성 원본 이름 |
| --- | --- | --- |
| 나타 화첨창 | sanguo/art/side-scroller/nezha-painted-sheet-v1.png | exec-9c953140-0ddd-4d54-a6b4-6a4f43698c82.png |
| 나타 건곤권 투척 | sanguo/art/side-scroller/nezha-bow-painted-sheet-v1.png | exec-0df11c97-3ed3-49a9-b3a4-19236e179d5d.png |
| 혼세마왕 | sanguo/art/side-scroller/boss-hunshimowang-painted-sheet-v1.png | exec-5df33b39-25af-4071-9852-8b326d52a89e.png |
| 동해용왕 오광 | sanguo/art/side-scroller/boss-aoguang-painted-sheet-v1.png | exec-4b9955df-457a-439c-9baa-e6078b6a71ee.png |
| 백골정 | sanguo/art/side-scroller/boss-baigujing-painted-sheet-v1.png | exec-a6dc532d-36cc-47b5-90d4-63bacb70b840.png |

원본 보관 폴더:
C:/Users/김시현/.codex/generated_images/019ffb52-4ad5-7123-8b87-fab993874726

5장 모두 2×2 동작 아틀라스다. 오광은 1374×1145이고 나머지는 1254×1254다.
렌더러는 정사각형을 가정하지 않고 이미지별 가로·세로를 사용한다.
알파 검사에서 프레임 경계의 불투명 픽셀은 모든 시트에서 0이었다.
백골정에는 해골·뼈·빈 눈구멍을 사용하지 않았다.

## 프롬프트 세트

공통 제작 사양:

    Use case: stylized-concept. Transparent 2x2 action sprite atlas for a
    painterly side-scrolling children's Journey to the West game.
    Four full-body right-facing poses: idle, advancing, windup, strike.
    Consistent face, outfit and scale. Separate poses with transparent margins.
    Semi-realistic painted fantasy art, not chibi. No backdrop, floor, text,
    grid lines, blood, skulls, bones or hollow eyes.

대상별 묘사:

- 나타 기본: youthful East Asian hero, twin hair buns, red ribbons, red and gold
  armor, white trousers, fire-tipped spear. 화첨창을 든 대기·달리기·준비·찌르기.
- 나타 투척: same face and outfit, golden cosmic ring. 건곤권을 든 대기·달리기·
  어깨 뒤 준비·손을 뻗은 투척. 활이나 시위는 그리지 않는다.
- 혼세마왕: human armored warlord, black and bronze heavy armor, ochre cloak,
  black hair and beard, large curved saber. 짐승 머리나 과한 이빨은 제외.
- 오광: elderly human East Asian sea king with long white beard, teal and gold
  robes and armor, golden dragon crown, compact jade-topped staff. Standing,
  stepping, staff held defensively close to chest, short downward staff swing.
  No long horizontal thrust, no water effects, no magic trails.
- 백골정: elegant adult human East Asian woman in white and pale lavender robes,
  normal human eyes visible through a delicate silver masquerade half mask,
  long black hair with silver flowers, short silver twin swords. Standing,
  stepping, close defensive stance, short slash. No magic swoosh or aura.

나타 기본 최종 투명도 수정 프롬프트:

    Use case: background-extraction. Remove the entire checkerboard backdrop.
    Keep all four fire-spear Nezha figures, poses, weapons and their positions
    unchanged. Return a PNG with genuine transparent background and alpha zero
    in all empty spaces including gaps between arms and ribbons. Preserve
    opaque white trousers. Do not draw any backdrop. Change nothing else.

나타 투척 최종 투명도 수정 프롬프트:

    Use case: background-extraction. Remove the entire checkerboard backdrop
    from this image. Keep the four Nezha figures and golden rings unchanged in
    the exact same positions. Return a PNG with genuine transparent background
    and alpha zero in all empty spaces, including between arms and ribbons.
    The checker pattern must not be part of the image pixels. Preserve white
    clothing as opaque. Change nothing else.

투명하지 않은 결과나 프레임 밖으로 무기가 넘어간 중간 결과는 채택하지 않았다.
원본·중간 결과는 삭제하지 않았다.

## 확인할 실기기 항목

자동 전투 검증은 무적 처리와 시간 진행을 사용하는 로직 검사다.
실제 아이패드 프레임률·손 조작·5세 난이도를 대신하지 않는다.
X1 이후 아이패드에서 화과산 수련 난이도를 직접 플레이하고,
화과산 보스의 기본 피해 18과 hpScale .82가 적절한지 확인해야 한다.

