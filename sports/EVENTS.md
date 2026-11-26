# 재이의 운동회 — 종목 만들기 약속 (EVENTS.md)

다음 종목(야구·훌라후프·축구·농구)을 만드는 사람을 위한 약속. **종목 하나 = 파일 하나 + 등록 한 줄 + sw.js 목록.**

## 1. 넣는 곳

| 할 일 | 파일 |
|---|---|
| 종목 진행(입력·규칙·문제·점수판) | `src/events/<id>.js` (+ 규칙 엔진이 크면 `src/events/<id>-rules.js`, DOM 없이 Node 테스트) |
| 겉모습(그림) | `src/views/<id>-stage.js` — 2.5D 무대 위에 그린다(아래 4) |
| 등록 | `src/events/index.js` 자기 칸의 `load: null` → `load: () => import("./<id>.js?v=1")` **한 줄만** (칸 순서·칸 사이 빈 줄은 그대로: 다른 사람과 git 이 안 부딪힌다) |
| 오프라인 | `sw.js` OPTIONAL_SHELL 의 `./sports/...` 묶음 끝에 새 파일들(`?v=1` 그대로, CRLF 줄끝) |
| 테스트 | `sports/tests/<id>.test.mjs` (`node --test sports/tests/*.test.mjs`) |

id: `baseball` 야구 · `hula` 훌라후프 · `soccer` 축구 · `basketball` 농구. 줄넘기(`jumprope.js` + `jumprope-rules.js` + `views/jumprope-stage.js`)가 본보기다.

## 2. 종목 모듈 모양

```js
export default {
  id: "soccer", name: "축구", icon: "⚽",
  howTo: "공이 오면 톡!",                 // 종목 카드 한 줄
  cameraMode: true,                        // 몸으로 하기를 켤 수 있으면 true
  gestures: ["kick"],                      // cameraMode 면 필수: jump | hipCircle | swing | kick | throw
  cameraLabel: "진짜로 차기",              // 종목 카드의 큰 토글 이름
  demo: false,                             // 첫 화면 뒤 시연을 지원하면 true (ctx.demo 처리 필수)
  medals: (level, quizOn) => ({ gold, silver, bronze }),   // 아이 level 0~3 마다(금>은>동>0)
  start: async ctx => ({ stop() {}, state: () => ({}) }),  // 반드시 stop() 을 돌려줄 것
};
```

`checkEvent()`(index.js)가 읽을 때 검사한다. 어기면 그 타일만 "준비 중"으로 남는다.

## 3. ctx (셸이 건네는 것)

| 이름 | 뜻 |
|---|---|
| `root` | 종목 화면 DOM(전체 화면, 아무 데나 톡 = 입력). view 가 여기에 캔버스를 붙인다 |
| `kid` | `{ id, name, age, level, color, team, art:{stand,cheer,run} }` — 선수는 재이(청군, level 2)·태오(백군, level 0) 둘. 혼자면 다른 아이가 컴퓨터 사촌 |
| `difficulty` | `{ level, speed:[.78,.9,1,1.12][level], window:[1.6,1.3,1.1,1][level] }` 공용 배수(종목 고유 표가 있으면 그것 우선) |
| `cast` | 선수 id 목록(다른 아이가 화면에 같이 나올 때) |
| `viewKind` | 지금 그림 방식 이름(`"stage"`). 종목은 `VIEWS[viewKind]` 를 찾고 없으면 기본 |
| `input.onTap(fn)` → off | 화면 톡·큰 톡 버튼·스페이스. 멈춤·문제 중엔 안 온다 |
| `camera` | `null` 이거나 `{ on(gesture, fn) → off, lagMs, video, lostFor() }`. **이미 보정 끝난 상태**. 손가락 입력도 늘 같이 받을 것 |
| `loop(fn(dt))` → stop | 셸 프레임 루프(멈춤·탭 숨김이면 안 부름). `dt` 초 |
| `wait(ms)` | 기다리기 |
| `sfx` | `sfx.js` 효과음(jump·ok·perfect·miss·whistle·crowd·fanfare·rainbow…, `voice(key)` = 해설 클립 자리) |
| `juice` | DOM 효과 층: `pop(text,{x,y,cls,hint})`, `announce(text,{sub,voice,cls,pri})`(배너는 한 번에 하나 — `src/banner-queue.js`, 결과는 `pri: 2`), `clearText()`(새 슛·새 공 시작 때), `flash()`, `shake(el)`, `confetti(n)`, `burst(x,y)` |
| `hud` | 공용 점수판: `show({kid,score,round,line})`, `set({score,combo,shield,mult,time,round})`, `pulse("combo")` |
| `quiz.enabled` / `quiz.askReward(title, { onCorrect })` | 보너스 문제(아래 5). `null` 이 오면 보상 없음 |
| `replay` | 느린 다시 보기 버퍼: `push(t, snap)` 매 프레임, `mark(t, weight, label)` 멋진 순간, `.clip` |
| `onPause(fn)` / `onResume(fn)` / `paused()` | 멈춤(루프는 셸이 이미 멈춘다) |
| `finish({ score, medal?, stats })` | 끝. medal 을 안 주면 `medals(level)` 로 셸이 정한다 |
| `safe()` | 안전 구역(`src/layout.js` `safeArea`): `{ top(점수판 아래), bannerTop/bannerBottom(알림 띠), bottom(톡 버튼 띠 위), left/right, tap }` px. view 는 `stage.frameKid({ x, kidH, sa, zoom, footPad… })` 로 아이 발을 아래 띠 위·머리를 알림 띠 아래에 둔다(시연이면 메뉴 카드 옆 빈 칸). 검증용 `actorRect()` 를 돌려준다. |
| `hud.buff(key, text)` · `hud.dots(list, total)` | 문제 보상이 켜져 있는 동안 점수판 아래 꼬리표(+ "📐 수학 보너스!") · 기록 점(승부차기) |
| `demo`, `auto`, `frame()` | 시연 모드(소리·문제·점수판 없음, 저절로 플레이, 끝없이) / 검증 자동 플레이(`?qa=1&auto=1`) / 시연 때 메뉴를 피해 아이를 둘 자리 `{ x: 가로 치우침(화면 비율), feet: 발이 올 화면 높이 비율 }` |

셸이 하는 것: 첫 화면·선수 고르기(재이·태오)·청백 편(재이 청 vs 태오 백, 혼자면 컴퓨터 사촌)·차례 넘기기("다음은 재이 차례!")·컴퓨터 사촌 차례·카메라 켜기와 보정("가만히 서 있어요")·결과·시상식·청백 점수·저장(`sports_save_v1`). 종목은 **한 아이의 한 판**만 책임진다.

## 4. 그림(view) — 2.5D 무대

그림 방식은 바꿔 끼울 수 있게 view 로 뺀다. view 약속:
`createView({ root, kid, cast, demo, juice, frame, safe }) → { render(snap, dt), cue(ev), replay(clip,{speed,label}) → Promise, destroy() }`

공용 조각(`src/render/`):
- `stage.js` `createStage(root, { eventId })`: world 좌표(땅 y=0, 위가 음수, 화면 세로 1000). `lookAt(x,y,zoom)`, `fit(width)`(세로 화면에서도 이 너비는 보이게), `punch(p)` 확대 펀치, `shake(p)`, `cheerUp(p)` 관중 파도, `burst/sparkle/dust` 파티클, `add({z, draw(g)})` 깊이 정렬 → `flush(dt)`, `toScreen(x,y)`. 배경은 `art/manifest.json` 의 `backgrounds[eventId]` 층 그림이 있으면 그것(시차), 없으면 코드 자리표시 경기장.
- `sprites.js` `loadKidSprites(kidId, actions)` → `createActor(sprites)`: `play(action,{loop})`(시간), `scrubFrame(action, i)`(정확한 프레임), `atlas(action)`(json 정보: events·rope), `scrub(action, u)`(진행도 0~1 = 점프 높이·스윙 각도에 프레임을 딱 맞춤), `on("contact", fn)`, `draw(g, x, y, h, {flip, squash, tilt, ground, alpha})`(부드러운 그림자 포함). 아틀라스가 없으면 아이 그림 한 장 + 코드 squash/stretch 로 자동 대신.
- 진짜 그림에 소품이 이미 들어 있으면(줄넘기 rope:true) 코드 소품을 겹쳐 그리지 말고 게임 타이밍으로 프레임을 고른다(`jumprope-stage.js` 의 `ropeFrame`).
- 그 밖의 공·배트·후프 같은 소품은 **코드로 그린다**(타이밍이 정확하게): 그라데이션·흰 하이라이트·잔상(이전 2~3프레임을 옅게)으로 그림체에 맞춘다(`jumprope-stage.js` 의 줄 참고).
- 그림 규격: `ART-SPEC.md`. 지금 진짜 그림은 재이·태오의 줄넘기 `jump` 아틀라스와 운동장 그림판(`field`)뿐이다. 새 종목은 `loadKidSprites(id, ["idle","swing",...])` 로 부르면 없는 동작은 그 아이 jump 프레임으로 자동 대체되니(옷차림 그대로), 코드 몸짓(squash·tilt·소품)으로 살리고 클립이 오면 저절로 바뀌게 둔다. 배경은 `backgrounds.<id>` 가 없으면 코드 경기장 → manifest 에 `{ "plate": "field" }` 한 줄이면 운동장 그림.

## 5. 보너스 문제 규칙(대원칙: 보상은 확실하게)

- **동작 한가운데 끊지 않는다.** 판 사이·"보너스 타임!" 순간에만 묻는다. 종목이 스스로 멈춘 뒤 부른다.
- `ctx.quiz.enabled` 가 false(문제 모듈 없음·자동 검증 브라우저)면 보너스 자리를 만들지 않는다. 문제 없이 받는 핵심 보상 금지.
- 보상은 `onCorrect`(정답 터치 처리 안)에서 **1초 안에 몸으로 느껴지게**: 겉모습이 확 바뀌고(무지개 줄처럼) + 소리 + 반짝/꽃가루 + 점수 팡. 한 번에 맞히면 크게, 고쳐 맞혀도 손에 잡히는 것.
  - 줄넘기: 한 번에 = +100점, 다음 판 점수 ×1.5, 실수 2번 봐줌 / 고쳐서 = +50, ×1.25, 1번. 화면: 줄(또는 몸 둘레 빛 테)이 무지개로 + 반짝이 + 꽃가루 + "+100".
- 보상 글귀는 "무엇을 얻었는지"를 크게(`announce`).
- `askReward` 는 `quiz.close()` 되면 끝나지 않는 Promise 다 → await 뒤에 `if (stopped) return;` 꼭.
- 난이도: 문제 난이도는 GameQuiz 가 아이별로 맞춘다(첫 정답 75~85% 목표). 종목 난이도는 `kid.level` 표로 따로.

## 6. 아이별 난이도 / 메달

- 종목 표는 level 0~3 마다 숫자로(창 너비·속도·거리 등). 목표: 그 아이가 한 판에 80% 안팎 성공.
- 메달 기준은 **모의 실험으로** 정한다: 성공률 85% → 금 근처, 65% → 은, 40% → 동(보너스 문제 보상 포함). Node 테스트로 고정(`jumprope.test.mjs` 본보기). 문제 모듈이 없으면 기준을 낮춘다(`quizOn=false`).
- 서로 다른 난이도의 아이를 견줄 때 셸은 `score / gold` 로 순위를 낸다.
- 한 판 60~90초.

## 7. 몸으로 하기(카메라)

`src/camera/pose.js`(MediaPipe Tasks Vision 0.10.14, 기기 안에서만 처리 — 저장·전송 없음)와 `src/camera/gestures.js`(순수 감지기). 셸이 켜고 보정까지 한 뒤 `ctx.camera` 로 준다. 종목은:
```js
const off = ctx.camera ? ctx.camera.on("kick", ev => doKick(ev.speed)) : null;   // stop() 에서 off()
```
감지기 이벤트: `jump {takeoff,height}` · `circle {dir,turns}`(hipCircle) · `swing {side,speed,dx,dy}` · `kick {side,height,speed}` · `throw {side,speed}`. 감지 지연(약 0.1초)을 고려해 몸 모드는 창을 넓히고 느리게(줄넘기 `CAMERA` 표). 카메라가 안 되면 셸이 손가락으로 돌린다 — 종목은 신경 쓰지 않아도 된다.

## 8. 화면·입력 규칙(허브 공통)

- 아이패드 먼저(가로·세로), 폰 가로·세로도. 화면 스크롤 없음. 버튼 44px 이상.
- 포인터 이벤트만. 누르고 있는 조작이 있으면 `pointercancel`·`lostpointercapture`·손가락 0개에서 전부 놓기(`../assets/touch-guard.js` 가 이미 붙어 있다).
- `speechSynthesis` 금지. 효과음은 WebAudio(`sfx.js`).
- 효과는 화려하게: 평소 플레이부터 크고 빛나게(퍼펙트 글자·파티클·관중·흔들림·확대 펀치), 멋진 순간은 0.4배 다시 보기.
- 검증 훅: `?qa=1` 이면 `window.__sports`(screen·run·quiz·tap…), `&auto=1` 자동 플레이, `&speed=4` 빨리, `&quiz=1` 자동 검증에서도 문제 켜기, `&nodemo=1` 시연 끄기.
