// 「오늘도 우리 집」 에피소드 대본.
// 컷(panel) 하나 = 배경(bg) + 뒤 소품(bp) + 인물(chars) + 앞 소품(fp) + 말풍선(b) + 효과음(sfx) + 내레이션(n, n2).
// 좌표는 폭 400 기준. 인물의 y 를 비우면 바닥선(높이 - 24)에 선다.
// 말풍선 k: 없으면 보통, "shout" 외침, "think" 생각, "whisper" 속삭임. tail: 꼬리 방향(b, bl, br, t, tl, tr, l, r, 빈 값).
(function (root) {
  "use strict";

  const HEAD_Y = { jaei: -140, taeo: -116, eomma: -204, appa: -214, halmeoni: -196, harabeoji: -208 };
  const C = (c, x, e, p, more) => ({ c, x, e, p, ...more });
  // 가슴 위 클로즈업: 얼굴 가운데를 (x, hy) 에 두고 s 배로 키운다.
  const bust = (c, x, hy, s, e, p, more) => ({ c, x, e, p, s, y: Math.round(hy - HEAD_Y[c] * s * 0.98), ...more });
  const B = (t, x, y, tail, more) => ({ t, x, y, tail, ...more });
  const FX = (t, x, y, more) => ({ t, x, y, ...more });

  const CHARACTERS = [
    { id: "jaei", name: "재이", tag: "초등학생 · 우리 집 똑순이 누나", line: "누나는 다 알아. 머리띠에 동그란 올림머리, 옆으로 묶은 머리가 트레이드마크. 그림 그리기를 제일 좋아해요.", pose: "wave", e: "happy" },
    { id: "halmeoni", name: "할머니", tag: "뽀글 파마 · 우리 집 따뜻한 품", line: "무엇이든 “괜찮다, 괜찮다” 해 주는 사람. 할머니 앞치마 주머니엔 언제나 사탕이 있어요.", pose: "stand", e: "smile" },
    { id: "eomma", name: "엄마", tag: "똥머리 · 우리 집 CCTV급 눈썰미", line: "화나면 제일 무섭지만, 제일 먼저 안아 주는 사람. 엄마는 늘 가장 작은 조각을 가져가요.", pose: "stand", e: "smile" },
    { id: "appa", name: "아빠", tag: "퇴근하면 소파와 한 몸", line: "아재개그 담당, 목말 태우기 전문. 방귀는 아빠가 원조라는 소문이 있어요.", pose: "wave", e: "happy" },
    { id: "harabeoji", name: "할아버지", tag: "짙은 눈썹 · 반짝이는 머리", line: "말수는 적지만 손주들 앞에선 늘 허허 웃는 사람. 요즘 스마트폰 공부 중이에요.", pose: "stand", e: "proud" },
    { id: "taeo", name: "태오", tag: "태권도 파란띠 · 우리 집 개구쟁이", line: "공룡과 방귀를 사랑하는 막내. 누나 뒤에 잘 숨지만, 마음만은 누구보다 용감해요.", pose: "fist", e: "happy" },
  ];

  const EPISODES = [
    // ───────────────────────── 1화 ─────────────────────────
    {
      id: 1,
      title: "마지막 딸기 한 알",
      summary: "접시에 남은 딸기는 단 한 알. 가위바위보로 이긴 태오는 딸기를 입에 넣으려다 멈추는데…",
      lesson: "나누면 작아지는 게 아니라, 마음이 커져요.",
      talk: "우리 가족 중에 나에게 가장 많이 양보해 준 사람은 누구일까요?",
      cover: 7,
      panels: [
        {
          h: 330, bg: "kitchen",
          chars: [C("appa", 60, "happy", "stand", { y: 330 }), C("taeo", 155, "love", "cheer", { y: 270 }), C("jaei", 250, "happy", "stand", { y: 280 }), C("eomma", 345, "smile", "stand", { y: 330 })],
          fp: [["table", 200, 240, { w: 400 }], ["plate", 200, 246, { n: 8 }]],
          n: "일요일 저녁, 우리 집 식탁.",
          b: [B("딸기다아아!", 150, 64, "b", { k: "shout" })],
        },
        {
          h: 250, bg: "burst:ffe27a",
          fp: [["plate", 200, 170, { n: 1, r: 90, bs: 2.2 }], ["sparkle", 150, 90, { s: 1.4 }], ["sparkle", 262, 110, { s: 1 }]],
          n: "그리고… 남은 딸기는 딱 한 알.",
          sfx: [FX("반짝", 300, 70, { rot: 10, c: "#ff6b6b" })],
        },
        {
          h: 330, bg: "kitchen",
          chars: [bust("appa", 110, 150, 1.25, "sly", "give"), bust("jaei", 300, 170, 1.25, "sly", "stand")],
          fp: [["table", 200, 290, { w: 400 }], ["plate", 205, 296, { n: 1 }]],
          b: [B("음~ 아빠는 배불러서 괜찮은데~", 120, 44, "b", { w: 200 }), B("…아빠 손은 왜 딸기 쪽으로 가?", 290, 60, "b", { w: 150 })],
        },
        {
          h: 280, bg: "burst:c9dcff",
          chars: [bust("appa", 130, 130, 1.4, "shock", "give")],
          b: [B("여보.", 330, 70, "r", { k: "whisper" })],
          sfx: [FX("움찔!", 250, 200, { rot: -8, c: "#3b6fd6" })],
        },
        {
          h: 320, bg: "kitchen",
          chars: [C("taeo", 130, "determined", "cheer", { y: 290 }), C("jaei", 280, "happy", "fist", { y: 296 })],
          fp: [["table", 200, 262, { w: 400 }]],
          b: [B("그럼 가위바위보 하자!!", 130, 50, "b", { k: "shout" }), B("좋아! 딱 한 판이야!", 300, 80, "bl")],
        },
        {
          h: 300, bg: "speed:fff3f6",
          chars: [C("appa", 55, "determined", "kick", { s: 0.8 }), C("eomma", 150, "determined", "fist", { s: 0.8 }), C("jaei", 250, "determined", "cheer", { s: 0.95 }), C("taeo", 340, "determined", "kick", { s: 1 })],
          sfx: [FX("가위!", 90, 50, { rot: -10, c: "#ff6b6b" }), FX("바위!", 200, 38, { rot: 4, c: "#3b6fd6" }), FX("보!!", 320, 56, { rot: 10, c: "#2fbf5b", size: 1.4 })],
        },
        {
          h: 320, bg: "burst:ffd1e1",
          chars: [C("appa", 60, "shock", "stand", { s: 0.85 }), C("taeo", 200, "laugh", "up", { s: 1.3 }), C("jaei", 340, "sad", "stand", { s: 0.95 })],
          b: [B("이겼다아아아!", 200, 44, "b", { k: "shout" })],
          sfx: [FX("와아", 70, 70, { rot: -12, c: "#ff9f1c", size: 0.9 })],
        },
        {
          h: 380, bg: "kitchen",
          chars: [bust("taeo", 200, 190, 1.9, "smile", "hold")],
          fp: [["berry", 200, 322, { s: 1.6 }]],
          n: "태오는 딸기를 입에 넣으려다… 멈췄다.",
          b: [B("…그런데.", 90, 110, "br", { k: "think" })],
        },
        {
          h: 330, bg: "sparkle:fff0d6",
          chars: [bust("eomma", 200, 160, 1.4, "smile", "stand")],
          n: "엄마는 오늘 딸기를 한 알도 안 먹었다.",
          n2: "우리가 먹는 걸, 가만히 보고만 있었다.",
        },
        {
          h: 360, bg: "kitchen",
          chars: [C("taeo", 120, "happy", "give", { y: 318 }), C("eomma", 290, "surprised", "stand", { y: 360 })],
          fp: [["table", 200, 300, { w: 400 }], ["berry", 187, 244, { s: 0.9 }]],
          b: [B("엄마! 아~ 해!", 110, 70, "b", { k: "shout" }), B("어머, 엄마는 너희 먹는 것만 봐도 배불러~", 300, 70, "b", { w: 170 })],
        },
        {
          h: 300, bg: "burst:ffe27a",
          chars: [bust("taeo", 120, 140, 1.4, "angry", "hip"), bust("eomma", 310, 160, 1.3, "shy", "cover")],
          b: [B("거짓말! 엄마 배에서 방금 꼬르륵 했어!", 190, 36, "bl", { w: 290, k: "shout" })],
          sfx: [FX("꼬르륵~", 300, 270, { rot: -6, c: "#b0582a" })],
        },
        {
          h: 330, bg: "kitchen",
          chars: [C("jaei", 70, "happy", "point", { y: 300 }), C("appa", 290, "proud", "hip", { y: 340 })],
          fp: [["table", 200, 270, { w: 400 }], ["plate", 190, 276, { n: 1 }]],
          b: [B("그럼 넷으로 나누자!", 80, 60, "b"), B("좋아, 아빠가 공평하게 잘라 줄게!", 300, 50, "b", { w: 170 })],
        },
        {
          h: 260, bg: "burst:dff3e4",
          fp: [["plate", 200, 170, { r: 110, cut: true }]],
          b: [B("아빠… 이게 공평해?", 100, 60, "r", { w: 150 })],
          sfx: [FX("…?", 320, 70, { rot: 8, c: "#4a3a33" })],
        },
        {
          h: 340, bg: "kitchen",
          chars: [C("taeo", 60, "sly", "stand", { y: 312 }), C("jaei", 150, "sly", "hip", { y: 316 }), C("appa", 265, "guilty", "give", { y: 352 }), C("eomma", 360, "surprised", "stand", { y: 352 })],
          fp: [["table", 200, 282, { w: 400 }]],
          b: [B("제일 큰 건 당연히…", 120, 44, "br"), B("…엄마 거지!", 300, 56, "bl", { k: "shout" })],
          sfx: [FX("째릿", 70, 130, { rot: -10, c: "#e0443e", size: 0.9 })],
        },
        {
          h: 400, bg: "sparkle:ffe3ee",
          chars: [C("appa", 60, "laugh", "stand", { y: 400 }), C("taeo", 155, "eating", "mouth", { y: 340 }), C("jaei", 250, "eating", "mouth", { y: 346 }), C("eomma", 345, "teary", "cheeks", { y: 400 })],
          fp: [["table", 200, 330, { w: 400 }], ["heart", 200, 60, { s: 1.4 }], ["heart", 120, 90, { s: 0.8 }], ["heart", 290, 96, { s: 0.9 }]],
          n: "딸기 한 알을 넷이 나눠 먹었는데,",
          n2: "이상하게 한 바구니 먹은 것보다 더 달았다.",
          sfx: [FX("하하하", 70, 120, { rot: -8, c: "#ff9f1c", size: 0.8 })],
        },
      ],
    },

    // ───────────────────────── 2화 ─────────────────────────
    {
      id: 2,
      title: "누나는 다 알아",
      summary: "누나가 학원 간 사이, 태오는 누나가 제일 아끼는 그림에 우유를 쏟고 말았다. 숨기면 없던 일이 될까?",
      lesson: "잘못을 말하는 건, 잘못보다 훨씬 큰 용기예요.",
      talk: "솔직하게 말하고 나서 마음이 가벼워졌던 적이 있나요?",
      cover: 10,
      panels: [
        {
          h: 330, bg: "living",
          bp: [["drawing", 290, 250, { s: 0.9 }], ["cup", 330, 270, {}]],
          chars: [C("taeo", 120, "determined", "kick", { o: "dobok", rot: -8 })],
          n: "토요일 오후. 누나가 학원에 간 사이.",
          sfx: [FX("얍!", 60, 90, { rot: -12, c: "#3b6fd6", size: 1.2 })],
        },
        {
          h: 250, bg: "burst:fff6c7",
          fp: [["drawing", 200, 150, { s: 1.8, rot: -4 }], ["cup", 290, 70, { tip: 130 }], ["splash", 210, 140, { s: 1.4 }]],
          sfx: [FX("철퍽!", 90, 60, { rot: -10, c: "#3b6fd6", size: 1.4 })],
        },
        {
          h: 320, bg: "living",
          chars: [C("taeo", 110, "shock", "cover", { o: "dobok" })],
          fp: [["drawing", 290, 270, { s: 1.1, v: "stain" }]],
          b: [B("누나가 제일 아끼는 가족 그림인데…", 270, 70, "bl", { k: "think", w: 160 })],
        },
        {
          h: 270, bg: "gloom",
          chars: [bust("taeo", 200, 140, 1.6, "cry", "eyes", { o: "dobok" })],
          b: [B("어… 어떡하지…", 200, 40, "b")],
        },
        {
          h: 340, bg: "living",
          bp: [["sofa", 230, 316, { w: 280 }]],
          chars: [C("taeo", 110, "sly", "hold", { o: "dobok" })],
          fp: [["drawing", 190, 270, { s: 0.6, rot: 70 }]],
          b: [B("안 보이면… 없는 거야.", 110, 70, "b", { k: "whisper" })],
          sfx: [FX("슥슥", 270, 170, { rot: 8, c: "#8a6d52" })],
        },
        {
          h: 340, bg: "entrance",
          bp: [["opendoor", 100, 316, {}], ["shoes", 250, 316, {}]],
          chars: [C("jaei", 100, "smile", "wave"), C("taeo", 290, "happy", "hold", { o: "dobok" })],
          b: [B("다녀왔습니다~", 100, 60, "b"), B("누나아~ 오늘 진짜 예쁘다! 가방 들어 줄까?", 290, 80, "b", { w: 160 })],
          sfx: [FX("반짝반짝", 205, 200, { rot: 8, c: "#ff9f1c", size: 0.7 })],
        },
        {
          h: 260, bg: "sparkle:e6e0ff",
          chars: [bust("jaei", 200, 140, 1.6, "sly", "think")],
          b: [B("…수상해.", 320, 60, "bl", { k: "think" })],
        },
        {
          h: 360, bg: "kitchen",
          chars: [C("appa", 60, "worried", "stand", { y: 360 }), C("taeo", 165, "guilty", "stand", { y: 300 }), C("eomma", 330, "surprised", "stand", { y: 360 })],
          fp: [["table", 200, 290, { w: 400 }], ["plate", 170, 296, { r: 36 }]],
          b: [B("태오야, 좋아하는 계란말이인데 왜 안 먹어?", 320, 44, "b", { w: 150 }), B("배… 배가 안 고파…", 180, 112, "b", { w: 120 }), B("(태오가 밥을 남기다니… 큰일이다)", 70, 50, "b", { k: "whisper", w: 120 })],
        },
        {
          h: 330, bg: "bedroom-night",
          bp: [["bed", 200, 310, { w: 330 }], ["pillow", 90, 250, {}]],
          chars: [C("taeo", 195, "worried", "stand", { o: "pajama", rot: -90, y: 262, s: 0.95 })],
          fp: [["blanket", 215, 296, { w: 190, h: 56, c: "#bfe3ff" }]],
          n: "그날 밤, 태오는 잠이 오지 않았다.",
          sfx: [FX("콩닥 콩닥", 270, 110, { rot: -6, c: "#ff5c7c" })],
        },
        {
          h: 380, bg: "bedroom-night",
          chars: [C("taeo", 110, "teary", "hold", { o: "pajama" }), C("jaei", 290, "surprised", "stand", { o: "pajama" })],
          fp: [["drawing", 112, 318, { s: 0.55, v: "stain" }]],
          b: [B("누나… 사실은… 내가 누나 그림에 우유 쏟았어.", 120, 60, "b", { w: 170 }), B("미안해…", 130, 150, "b", { k: "whisper" })],
        },
        {
          h: 320, bg: "sparkle:ffe3ee",
          chars: [bust("jaei", 120, 170, 1.4, "smile", "stand", { o: "pajama" }), bust("taeo", 300, 190, 1.4, "surprised", "stand", { o: "pajama" })],
          b: [B("알고 있었어.", 120, 50, "b"), B("에엣?!", 310, 70, "b", { k: "shout" })],
        },
        {
          h: 350, bg: "bedroom-night",
          chars: [C("jaei", 110, "wink", "point", { o: "pajama" }), C("taeo", 300, "shock", "stand", { o: "pajama" })],
          b: [B("소파 밑으로 그림 끝이 삐죽 나와 있었거든.", 110, 60, "b", { w: 170 })],
          sfx: [FX("들켰다!", 300, 70, { rot: 8, c: "#e0443e" })],
        },
        {
          h: 360, bg: "sparkle:fff0d6",
          chars: [C("taeo", 230, "cry", "hug", { o: "pajama" }), C("jaei", 180, "teary", "hug", { o: "pajama" })],
          fp: [["heart", 200, 90, { s: 1.2 }]],
          b: [B("네가 먼저 말해 주길 기다렸어. 말해 줘서 고마워.", 200, 30, "", { w: 250 })],
          n2: "누나는 다 안다. 그리고… 다 안아 준다.",
        },
        {
          h: 330, bg: "bedroom-night",
          chars: [C("jaei", 110, "happy", "point", { o: "pajama" }), C("taeo", 290, "laugh", "cheer", { o: "pajama" })],
          b: [B("그림은 다시 그리면 돼. 이번엔 같이 그리자!", 110, 60, "b", { w: 160 }), B("응!! 공룡도 넣을래!", 300, 70, "b")],
        },
        {
          h: 400, bg: "living",
          bp: [["drawing", 215, 100, { s: 0.9, v: "new" }]],
          chars: [C("appa", 80, "guilty", "scratch"), C("eomma", 300, "sly", "hip")],
          n: "다음 날.",
          b: [B("여보… 사실 나도 고백할 게 있는데… 어제 당신 화분…", 90, 60, "b", { w: 160 }), B("알고 있었어.", 330, 62, "b", { k: "whisper" })],
          sfx: [FX("쿵!", 170, 250, { rot: -10, c: "#3b6fd6", size: 1.3 })],
        },
      ],
    },

    // ───────────────────────── 3화 ─────────────────────────
    {
      id: 3,
      title: "아빠 충전소",
      summary: "퇴근한 아빠는 소파에 눕자마자 잠들어 버렸다. 재이와 태오가 차린 ‘아빠 충전소’, 과연 영업 성공?",
      lesson: "사랑은 받기만 하는 게 아니라, 돌려주는 거예요.",
      talk: "오늘 가족에게 줄 수 있는 나만의 ‘쿠폰’을 만들어 볼까요?",
      cover: 11,
      panels: [
        {
          h: 340, bg: "street",
          chars: [C("appa", 150, "sleepy", "stand", { o: "work", tilt: -8 })],
          fp: [["briefcase", 205, 250, {}], ["battery", 310, 90, { lv: 1, s: 1.1 }]],
          n: "평일 저녁 7시. 아빠의 배터리는…",
          sfx: [FX("3%", 310, 140, { c: "#ff4d4d", size: 0.9 })],
        },
        {
          h: 360, bg: "entrance:evening",
          bp: [["opendoor", 90, 336, {}]],
          chars: [C("appa", 90, "happy", "stand", { o: "work" }), C("taeo", 230, "laugh", "up"), C("jaei", 330, "happy", "cheer")],
          b: [B("아빠다아아!", 240, 44, "bl", { k: "shout" }), B("아빠 목말 태워 줘!", 345, 112, "b", { w: 110 }), B("공룡 놀이도 해!", 200, 140, "b", { w: 100 })],
        },
        {
          h: 330, bg: "living",
          bp: [["sofa", 200, 306, { w: 320 }]],
          chars: [C("appa", 320, "sleepy", "stand", { o: "work", rot: -90, x: 330, y: 226, s: 0.85 })],
          fp: [["sofafront", 200, 306, { w: 320 }]],
          b: [B("5분만… 딱 5분만…", 110, 90, "b", { k: "whisper" })],
          sfx: [FX("Zzz", 120, 170, { rot: -10, c: "#6c8fd6" })],
        },
        {
          h: 330, bg: "living",
          chars: [C("taeo", 90, "sad", "stand"), C("jaei", 190, "worried", "stand"), C("eomma", 320, "smile", "mouth")],
          b: [B("아빠 또 잔다…", 90, 90, "b"), B("쉿, 아빠 오늘 회사에서 많이 힘드셨대.", 310, 40, "b", { k: "whisper", w: 150 })],
        },
        {
          h: 300, bg: "sparkle:fff3c4",
          chars: [bust("jaei", 110, 150, 1.35, "proud", "fist"), bust("taeo", 300, 170, 1.3, "surprised", "stand")],
          fp: [["sparkle", 60, 60, { s: 1.2 }]],
          b: [B("태오야, 우리가 아빠를 충전해 주자!", 130, 40, "b", { w: 160 }), B("충전? 아빠가 핸드폰이야?", 300, 60, "b", { w: 120 })],
        },
        {
          h: 240, bg: "burst:ffe27a",
          fp: [["sign", 200, 120, { t: "♥ 아빠 충전소 OPEN ♥", w: 280, fs: 26 }]],
          sfx: [FX("짜잔!", 330, 50, { rot: 10, c: "#ff6b6b" })],
        },
        {
          h: 340, bg: "living",
          bp: [["sofa", 200, 316, { w: 320 }]],
          chars: [C("appa", 320, "sleepy", "stand", { o: "work", rot: -90, x: 330, y: 236, s: 0.85 }), C("taeo", 170, "determined", "cheer", { o: "dobok", y: 250, s: 0.9 })],
          fp: [["sofafront", 200, 316, { w: 320 }]],
          b: [B("태권도 안마 시작합니다! 얍! 얍!", 110, 40, "b", { w: 150 }), B("으음… 시원하다…", 300, 110, "b", { k: "whisper" })],
          sfx: [FX("콩! 콩!", 240, 150, { rot: 8, c: "#3b6fd6" })],
        },
        {
          h: 330, bg: "living",
          chars: [C("jaei", 110, "happy", "give")],
          fp: [["coupon", 270, 200, { s: 1.2 }]],
          b: [B("이건 쿠폰! 아빠가 쓰면 우리가 조용히 해 줄게!", 130, 50, "b", { w: 170 })],
        },
        {
          h: 330, bg: "living",
          bp: [["sofa", 200, 306, { w: 320 }]],
          chars: [C("appa", 320, "sleepy", "stand", { o: "work", rot: -90, x: 330, y: 226, s: 0.85 })],
          fp: [["sofafront", 200, 306, { w: 320 }], ["blanket", 230, 256, { w: 200, h: 44, c: "#ffcf6e" }], ["dino", 70, 318, { s: 1.1 }]],
          b: [B("공룡이 지켜 줄 거야.", 90, 80, "b", { k: "whisper" })],
        },
        {
          h: 280, bg: "burst:e8f7c8",
          chars: [bust("taeo", 110, 150, 1.4, "shock", "nose"), bust("jaei", 300, 150, 1.4, "laugh", "nose")],
          sfx: [FX("뿌우웅~~", 200, 50, { rot: -6, c: "#8a6d52", size: 1.5 })],
          b: [B("아빠 방귀 충전 완료!!", 150, 250, "tl", { k: "shout", w: 240 })],
        },
        {
          h: 330, bg: "living",
          chars: [C("appa", 110, "shy", "scratch", { o: "work" }), C("taeo", 250, "laugh", "cheer"), C("jaei", 340, "laugh", "cover")],
          b: [B("어… 아빠가 뭐 했니?", 100, 40, "b")],
          sfx: [FX("하하하하", 300, 70, { rot: 8, c: "#ff9f1c" })],
        },
        {
          h: 360, bg: "sparkle:ffe3ee",
          chars: [C("taeo", 110, "happy", "hug"), C("appa", 200, "teary", "hug", { o: "work" }), C("jaei", 300, "happy", "hug")],
          fp: [["coupon", 200, 250, { s: 0.8, rot: 4 }], ["heart", 330, 70, {}]],
          b: [B("아빠 배터리… 100% 충전됐다.", 200, 30, "", { w: 220 })],
        },
        {
          h: 420, bg: "living-night",
          chars: [C("taeo", 200, "laugh", "up", { y: 214, s: 0.9 }), C("appa", 200, "happy", "hold", { o: "work", s: 0.95 }), C("jaei", 320, "happy", "cheer")],
          fp: [["battery", 70, 90, { lv: 4 }]],
          b: [B("자, 이제 공룡 놀이 할 사람!", 100, 190, "r", { w: 110 }), B("저요!!", 330, 220, "b", { k: "shout" })],
          n2: "그날 밤, 우리 집 충전소는 늦게까지 불이 켜져 있었다.",
        },
      ],
    },

    // ───────────────────────── 4화 ─────────────────────────
    {
      id: 4,
      title: "엄마가 아픈 날",
      summary: "엄마가 감기로 누운 날, 아빠와 재이·태오가 ‘엄마 대신 작전’에 나섰다. 계란은 타고, 셔츠는 분홍색이 되고…",
      lesson: "당연한 하루는, 누군가의 사랑으로 만들어져요.",
      talk: "엄마(또는 가족)의 하루 중 내가 몰랐던 일은 무엇일까요?",
      cover: 11,
      panels: [
        {
          h: 330, bg: "bedroom",
          bp: [["bed", 200, 306, { w: 340 }], ["pillow", 90, 242, {}]],
          chars: [C("eomma", 300, "sick", "stand", { o: "sick", rot: -90, y: 256, s: 0.8 })],
          fp: [["blanket", 272, 292, { w: 210, h: 60, c: "#f7b9ca" }], ["towel", 112, 256, { rot: -90 }], ["thermo", 176, 262, { rot: 100 }]],
          n: "아침부터 엄마가 끙끙 앓았다.",
          b: [B("콜록… 오늘은… 좀 누워 있을게…", 280, 70, "bl", { w: 150 })],
        },
        {
          h: 360, bg: "living",
          chars: [C("taeo", 70, "determined", "fist"), C("appa", 200, "proud", "hip", { o: "apron" }), C("jaei", 330, "determined", "fist")],
          b: [B("걱정 마! 오늘은 우리가 엄마 대신이다!", 200, 48, "b", { w: 250, k: "shout" }), B("와아!", 60, 180, "b"), B("작전 개시!", 340, 190, "b")],
        },
        {
          h: 330, bg: "kitchen",
          chars: [C("appa", 150, "determined", "hold", { o: "apron" })],
          fp: [["pan", 175, 200, { s: 1.2 }]],
          n: "작전 1. 아침밥 만들기",
          sfx: [FX("치이익", 320, 150, { rot: 8, c: "#ff6b6b" })],
        },
        {
          h: 250, bg: "burst:d8d8d8",
          fp: [["smoke", 250, 110, { s: 1.2 }], ["pan", 190, 180, { burnt: true, s: 2 }]],
          sfx: [FX("탔다…", 100, 70, { rot: -10, c: "#4a3a33", size: 1.3 })],
        },
        {
          h: 320, bg: "kitchen",
          chars: [C("jaei", 90, "blank", "stand"), C("appa", 220, "guilty", "scratch", { o: "apron" }), C("taeo", 340, "happy", "cheer")],
          b: [B("아빠… 이건 계란이야, 숯이야?", 90, 50, "b", { w: 130 }), B("나 까만 거 좋아!", 330, 70, "b", { w: 100 })],
        },
        {
          h: 330, bg: "living",
          chars: [C("appa", 110, "smile", "carry", { o: "apron" }), C("taeo", 290, "happy", "give")],
          fp: [["basket", 110, 260, {}], ["sock", 250, 200, { rot: 40 }]],
          n: "작전 2. 빨래하기",
          b: [B("내 빨간 양말도 같이 넣어야지~", 300, 90, "b", { w: 130 })],
          sfx: [FX("쏙", 210, 180, { c: "#e8344a" })],
        },
        {
          h: 300, bg: "burst:ffc4d8",
          chars: [bust("appa", 200, 110, 1.3, "shock", "hands", { o: "apron" })],
          fp: [["shirt", 200, 250, { c: "#f7a3c0", s: 1.4 }]],
          b: [B("내 흰 셔츠가…!!", 330, 60, "bl", { k: "shout", w: 110 })],
          sfx: [FX("분홍분홍", 80, 240, { rot: -10, c: "#f0609d" })],
        },
        {
          h: 350, bg: "living",
          chars: [C("taeo", 100, "sad", "carry"), C("jaei", 280, "worried", "carry")],
          fp: [["toys", 200, 330, {}]],
          n: "작전 3. 장난감 정리",
          b: [B("엄마는 이걸 매일 해?", 100, 100, "b"), B("매일… 거기에 밥이랑, 빨래랑…", 280, 110, "b", { w: 130 })],
        },
        {
          h: 170, bg: "sparkle:fff0d6",
          fp: [["heart", 340, 110, { s: 0.9 }]],
          n: "처음 알았다.",
          n2: "엄마의 하루가 얼마나 바빴는지.",
        },
        {
          h: 340, bg: "kitchen",
          chars: [C("appa", 70, "smile", "hold", { o: "apron" }), C("jaei", 205, "determined", "hold"), C("taeo", 330, "proud", "give", { f: -1 })],
          fp: [["bowl", 205, 262, { s: 1.1, steam: false }], ["salt", 262, 226, { rot: -150 }], ["grains", 232, 236, {}]],
          n: "작전 4. 엄마를 위한 죽",
          b: [B("소금은 조금만~", 330, 60, "b")],
          sfx: [FX("와르르", 250, 318, { rot: 10, c: "#6c8fd6", size: 0.8 })],
        },
        {
          h: 380, bg: "bedroom",
          bp: [["bed", 200, 356, { w: 360 }]],
          chars: [bust("eomma", 200, 150, 1.05, "surprised", "stand", { o: "sick" }), C("jaei", 58, "happy", "hold"), C("taeo", 348, "happy", "wave")],
          fp: [["blanket", 200, 350, { w: 210, h: 80, c: "#f7b9ca" }], ["bowl", 58, 300, { s: 0.8, steam: false }]],
          b: [B("엄마! 우리가 만든 죽이에요!", 90, 50, "b", { w: 140 })],
        },
        {
          h: 320, bg: "sparkle:fff0d6",
          chars: [bust("eomma", 200, 160, 1.6, "eating", "mouth", { o: "sick" })],
          b: [B("(…짜다…!)", 330, 60, "bl", { k: "think" })],
          sfx: [FX("짭짤", 70, 80, { rot: -12, c: "#6c8fd6" })],
        },
        {
          h: 330, bg: "sparkle:ffe3ee",
          chars: [bust("eomma", 200, 160, 1.4, "teary", "stand", { o: "sick" })],
          b: [B("음… 세상에서 제일 맛있는 죽이다.", 200, 40, "", { w: 220 })],
        },
        {
          h: 360, bg: "bedroom",
          chars: [C("taeo", 90, "teary", "stand"), C("jaei", 310, "teary", "stand")],
          b: [B("엄마, 매일 우리 밥 해 줘서 고마워요.", 90, 60, "b", { w: 130 }), B("빨래도, 정리도… 다 고마워요.", 310, 90, "b", { w: 130 })],
        },
        {
          h: 360, bg: "sparkle:ffe3ee",
          chars: [C("taeo", 110, "cry", "hug"), C("eomma", 200, "teary", "hug", { o: "sick" }), C("jaei", 290, "cry", "hug")],
          fp: [["heart", 90, 80, {}], ["heart", 320, 60, { s: 1.2 }]],
          b: [B("엄마… 벌써 다 나은 것 같아.", 200, 30, "", { w: 210 })],
        },
        {
          h: 400, bg: "entrance",
          bp: [["door", 90, 376, {}]],
          chars: [C("appa", 110, "proud", "wave", { o: "pink" }), C("eomma", 240, "laugh", "cover"), C("taeo", 340, "laugh", "point")],
          fp: [["briefcase", 60, 330, {}]],
          n: "다음 날 아침.",
          b: [B("오늘은… 이 셔츠가 입고 싶었어.", 130, 88, "b", { w: 190 })],
          n2: "아빠는 분홍 셔츠를 입고 출근했다.",
          sfx: [FX("뿌듯", 330, 110, { rot: 10, c: "#f0609d" })],
        },
      ],
    },

    // ───────────────────────── 5화 ─────────────────────────
    {
      id: 5,
      title: "할아버지의 영상통화",
      summary: "스마트폰 영상통화를 배우고 싶은 할아버지. 재이는 친절한 선생님이 되기로 했지만, 자꾸만 속이 터지는데…",
      lesson: "우리가 천천히 배울 때 기다려 준 사람들이 있어요. 이번엔 우리가 기다려 줄 차례예요.",
      talk: "내가 어렸을 때 가족이 참을성 있게 가르쳐 준 것은 무엇일까요?",
      cover: 12,
      panels: [
        {
          h: 400, bg: "halmae",
          chars: [C("harabeoji", 120, "worried", "hold"), C("jaei", 290, "proud", "hip")],
          fp: [["phone", 120, 262, { s: 0.9 }]],
          n: "주말, 할머니 할아버지 댁.",
          b: [B("재이야, 이 영상통화라는 거… 어떻게 하는 거냐?", 200, 80, "bl", { w: 250 }), B("제가 알려 드릴게요!", 330, 150, "b", { w: 130 })],
        },
        {
          h: 360, bg: "halmae",
          chars: [bust("harabeoji", 280, 190, 1.25, "surprised", "stand"), bust("jaei", 110, 210, 1.25, "smile", "point")],
          fp: [["phone", 205, 290, { s: 1.4, screen: "#c9f5c9" }]],
          b: [B("여기 초록 버튼 누르시고, 얼굴이 화면에 나오게 드시면 돼요!", 140, 50, "b", { w: 250 }), B("오호라.", 340, 90, "b")],
        },
        {
          h: 360, bg: "plain:bfe7ff",
          chars: [C("harabeoji", 200, "blank", "stand", { s: 3.6, y: 1079 })],
          fp: [["phoneframe", 0, 0, {}]],
          b: [B("할아버지! 머리만 보여요!", 200, 110, "", { k: "shout", w: 250 })],
          sfx: [FX("번쩍!", 300, 215, { rot: 10, c: "#ff9f1c", size: 1.2 })],
        },
        {
          h: 330, bg: "halmae",
          chars: [C("halmeoni", 80, "laugh", "cover"), C("harabeoji", 210, "shy", "scratch"), C("taeo", 340, "laugh", "point")],
          b: [B("허허, 요 녀석들.", 210, 40, "b")],
          sfx: [FX("깔깔깔", 330, 110, { rot: 8, c: "#ff9f1c" })],
        },
        {
          h: 380, bg: "halmae",
          chars: [C("harabeoji", 110, "worried", "hold"), C("jaei", 290, "angry", "hip")],
          fp: [["phone", 110, 242, { s: 0.9, screen: "#ffb3b3" }]],
          b: [B("할아버지! 아까 말씀드렸잖아요! 빨간 거 말고 초록 거요!", 230, 60, "br", { w: 290, k: "shout" })],
          sfx: [FX("뚝", 200, 270, { rot: -10, c: "#e0443e", size: 1.2 })],
        },
        {
          h: 280, bg: "plain:e9e6e1",
          chars: [bust("harabeoji", 200, 150, 1.5, "sad", "stand")],
          b: [B("…할아버지가 자꾸 까먹어서 미안하구나.", 200, 36, "", { w: 220 })],
        },
        {
          h: 360, bg: "halmae",
          chars: [C("halmeoni", 120, "smile", "stand", { o: "apron" }), C("jaei", 290, "guilty", "stand")],
          b: [B("재이야, 너 아기 때 숟가락질 누가 가르쳐 줬는지 아니?", 130, 50, "b", { w: 170 }), B("…?", 300, 150, "b")],
        },
        {
          h: 400, bg: "memory",
          chars: [C("harabeoji", 110, "happy", "give", { s: 0.95 }), C("jaei", 280, "eating", "stand", { s: 0.62 })],
          fp: [["spoonful", 256, 300, { rot: 205 }], ["grains", 300, 316, {}]],
          b: [B("옳지, 옳지~ 우리 재이 잘한다!", 150, 100, "bl", { w: 230 })],
          n: "백 번을 흘려도, 할아버지는 백 번 다 웃으셨지.",
        },
        {
          h: 350, bg: "halmae",
          chars: [bust("halmeoni", 110, 190, 1.2, "smile", "stand", { o: "apron" }), bust("jaei", 300, 210, 1.25, "teary", "stand")],
          b: [B("그때 할아버지는 한 번도 ‘아까 말했잖아’ 안 하셨단다.", 170, 50, "bl", { w: 280 })],
        },
        {
          h: 360, bg: "sparkle:fff0d6",
          chars: [C("jaei", 150, "teary", "hug"), C("harabeoji", 270, "teary", "hug")],
          fp: [["heart", 210, 80, {}]],
          b: [B("할아버지, 우리 천천히 다시 해 봐요. 백 번 해도 괜찮아요!", 180, 50, "bl", { w: 280 })],
        },
        {
          h: 330, bg: "halmae",
          chars: [C("taeo", 60, "happy", "cheer"), C("harabeoji", 200, "determined", "hold"), C("jaei", 330, "smile", "point")],
          fp: [["phone", 200, 222, { s: 0.9 }]],
          b: [B("할아버지 파이팅!", 70, 70, "b")],
          n2: "그리고 정말… 열한 번째에.",
        },
        {
          h: 230, bg: "burst:c8f5c8",
          fp: [["phone", 200, 120, { s: 2.2, screen: "#c9f5c9", face: true }]],
          sfx: [FX("띠리리링~", 90, 60, { rot: -10, c: "#2fbf5b" }), FX("연결됐다!!", 300, 190, { rot: 8, c: "#ff6b6b" })],
        },
        {
          h: 420, bg: "plain:bfe7ff",
          chars: [bust("harabeoji", 180, 220, 1.8, "laugh", "stand"), C("halmeoni", 335, "happy", "stand", { s: 2.4, y: 850 })],
          fp: [["phoneframe", 0, 0, {}]],
          b: [B("재이야! 할아버지다! 혼자 했다!", 200, 80, "b", { w: 250 }), B("할머니~ 파마만 보여요!", 130, 330, "", { k: "shout", w: 190 })],
        },
        {
          h: 380, bg: "bedroom-night",
          chars: [C("jaei", 150, "laugh", "hold", { o: "pajama" }), C("taeo", 280, "laugh", "cheer", { o: "pajama" })],
          fp: [["phone", 150, 256, { s: 0.8, face: true }], ["heart", 80, 90, {}]],
          n: "우리가 천천히 배울 때, 기다려 준 사람들이 있다.",
          n2: "이번엔 우리가 기다려 줄 차례다.",
        },
      ],
    },
  ];

  root.WebtoonData = { CHARACTERS, EPISODES };
})(typeof window !== "undefined" ? window : globalThis);
