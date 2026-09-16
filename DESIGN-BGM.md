# 모험 상자 배경음악 (Lyria 3.5)

2026-09-16. 사용자 결정: **Lyria 3.5로 대시보드 게임 음악을 만든다.** 시험곡 중 "카드 모음 화면" 결을 기준으로 정했다.

## 만들어 둔 곡 (site/assets/bgm/)

| 파일 | 쓰는 곳 | 분위기 · 빠르기 |
|---|---|---|
| hub.mp3 | 모험 상자 첫 화면 | 밝고 차분한 종소리 · 84 |
| cards-menu.mp3 | J&T Adventure 카드 모음 | 부드러운 첼레스타·하프 · 80 |
| cards-battle.mp3 | 카드 일반 대결 | 통통 튀는 피치카토 · 112 |
| cards-boss.mp3 | 쓰구미 보스전 | 익살스러운 바순 · 126 |
| cards-ending.mp3 | 원정 결말 | 포근한 마무리 · 72 |
| sanguo-battle.mp3 | 삼국지 전투 | 얼후·디즈·북 · 120 |
| sanguo-map.mp3 | 삼국지 지도·준비 | 고쟁 중심 · 76 |
| odyssey.mp3 | 오디세이 | 바다 모험 · 96 |
| hogwarts.mp3 | 호그와트 | 마법학교 · 104 |
| kedehun.mp3 | 케데헌 | 케이팝풍 액션 · 118 |
| kart.mp3 | 카트 | 빠른 마림바 · 140 |
| kart3d.mp3 | 3D 카트 | 라이벌 레이스 · 146 |
| princess.mp3 | 공주 옷장 | 오르골 왈츠 · 92 |
| story.mp3 | 이야기 극장 | 아주 조용한 낭독 배경 · 68 |
| bori.mp3 | 보리 젬 미스터리 | 아늑한 퍼즐 · 88 |
| avengers.mp3 | 재이와 태오의 멀티버스 | 상냥한 히어로 · 112 |

- 각 파일은 40초, mp3 112kbps 스테레오, 약 0.55MB. 전부 합쳐 9MB.
- 끝 2초를 앞 2초에 등파워로 겹쳐 두었다. `loop` 재생하면 이어진다.
- 평균 −22 dB, 최대 −7 dB로 맞춰 효과음이 묻히지 않게 여유를 뒀다.
- 전부 기악이다. 노래(보컬)는 없다. 아이 목소리나 실제 노래 인용도 없다.

## 권리

Lyria 3.5를 **유료 제미나이 API**로 생성했다. 유료 API 산출물은 구글이 소유권과 상업적 사용 권한을 부여한다. 무료 티어로 만든 곡이 아니므로 공개 사이트에 올려도 된다. 모든 곡에는 들리지 않는 SynthID 표식이 들어 있다. 저작권 등록 가능 여부는 별개 문제다.

## 다시 만드는 방법

```
node tools/lyria-bgm.cjs <이름> "<영문 프롬프트>"      # 60초 mp3 원본 생성 (곡당 $0.08)
python tools/loopify-bgm.py <원본.mp3> <출력.mp3> 40 2  # 40초 반복본으로 다듬기
```

- `GEMINI_API_KEY` 환경변수가 필요하다. 키 값은 저장소에 넣지 않는다.
- 프롬프트 공통 문구: `Instrumental only, no vocals. Warm painted storybook orchestra with celesta, harp, soft woodwinds and light strings ... no intro fade in, no outro fade out, seamless loop, leave headroom for sound effects. About 60 seconds.`
- "demon hunter" 같은 표현은 정책 차단(400)이 난다. 케데헌 곡은 "K-pop stage action"으로 우회했다.
- 60초 원본은 저장소 밖 `game-hub/bgm-masters/`에 있다. 다시 다듬을 때 쓴다.

## 붙인 상태 (2026-09-16 완료)

| 게임 | 상태 |
|---|---|
| 모험 상자 첫 화면 | hub.mp3 재생, 머리글에 🎵 끄기 버튼(`hub_bgm_muted`) |
| J&T Adventure | 모음·전투·보스·결말 네 곡 전환, 기존 배경음악 버튼이 파일과 합성음 모두 끔 |
| 공주 옷장 | princess.mp3, 기존 소리 버튼(`princess:mute`) 따름 |
| 보리 젬 | bori.mp3, 기존 소리 설정(`bori-gems:v3:muted`) 따름 |
| 오디세이 | odyssey.mp3가 합성 배경음을 대신함, `ody_muted` 따름 |
| 호그와트 | hogwarts.mp3, 가족이 직접 고른 곡이 있으면 그 곡이 우선 |
| 케데헌 | kedehun.mp3, 무대 시작 때 재생 |
| 카트 · 3D 카트 | kart.mp3 / kart3d.mp3, 사용자가 넣은 곡이 있으면 그 곡이 우선 |
| 삼국지 | 기존 `audio/the_final_battle.ogg` 유지(이미 파일 음악) |
| 이야기 극장 | 넣지 않음. 낭독과 겹친다 |
| 어벤져스 | 넣지 않음. `audio/bgm/` 슬롯 8개용 곡이 따로 필요하다 |
| 매일 수학 | 넣지 않음. 집중 음악이 따로 있다 |

검증: `node tools/bgm-games-smoke.cjs`(9개 게임에서 곡 요청 확인), `node cards/tools/bgm-smoke.cjs`(장면 전환·끄기 유지·합성음 대체).

## 붙이는 규칙

1. **기존 합성 음악을 대체한다.** cards, odyssey, hogwarts, kedehun, kart, kart3d, princess, math 등은 WebAudio로 합성한 배경음이 있다. 파일 재생으로 바꾸되 **기존 음악 끄기 버튼과 저장된 설정 키를 그대로 쓴다.** 효과음 합성 코드는 건드리지 않는다.
2. **재생은 사용자 조작 뒤에 시작한다.** iOS는 자동재생을 막는다. 첫 탭·버튼 입력에서 시작하고, 실패하면 조용히 넘어간다.
3. `new Audio(...)`에 `loop = true`, `volume = 0.35`, `preload = "none"`. 화면이 가려지면(`visibilitychange`) 멈추고 돌아오면 잇는다.
4. **장면이 바뀌면 곡을 바꾼다.** 카드 게임은 모음 화면·대결·보스전·결말 네 곡을 쓰고, 바뀔 때 0.6초 페이드로 교차한다.
5. **캐시**: sw.js의 오디오 캐시에 요청 시 저장되게 한다. 첫 로딩을 늦추지 않도록 CORE_SHELL에 16곡을 전부 넣지 않는다.
6. **검증**: 각 게임에서 음악이 시작·정지되는지, 끄기 설정이 유지되는지, 오프라인에서 두 번째 방문에 재생되는지 확인한다. 아이패드 가로·세로와 폰 세로에서 본다.
