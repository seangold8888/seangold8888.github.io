// 공개판 각색본. 제미나이와 다시 쓴 화를 여기에 넣으면 public.html 에서 원래 화 대신 보인다.
// 가족용 episodes.js 와 똑같이 C, bust, B, FX 로 쓴다. 이름은 실명으로 써도 edition.js 가 가명으로 바꿔 준다.
(function (root) {
  "use strict";
  const { C, bust, B, FX } = root.WebtoonDSL; // eslint-disable-line no-unused-vars

  root.PublicAdapted = [
    // { id: 1, title: "…", summary: "…", lesson: "…", talk: "…", cover: 0, panels: [ … ] },
    // ───── 1화 (원래 1화 + 제미나이 각색본 합본) ─────
    {
      id: 1,
      title: "최후의 딸기 쟁탈전",
      summary: "접시에 남은 딸기는 단 한 알. 가위바위보로 이긴 다섯 살 태오는 딸기를 입에 넣으려다 멈추는데… 반쪽 레몬을 든 막내의 딸기 대작전!",
      lesson: "나누면 작아지는 게 아니라, 마음이 커져요.",
      talk: "우리 가족 중에 나에게 가장 많이 양보해 준 사람은 누구일까요?",
      cover: 6,
      panels: [
        {
          h: 330, bg: "kitchen",
          chars: [C("appa", 60, "happy", "stand", { y: 330 }), C("taeo", 155, "love", "cheer", { y: 270 }), C("jaei", 250, "happy", "stand", { y: 280 }), C("eomma", 345, "smile", "stand", { y: 330 })],
          fp: [["table", 200, 240, { w: 400 }], ["plate", 200, 246, { n: 8 }]],
          n: "일요일 저녁, 다섯 살 태오네 식탁.",
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
          b: [B("음~ 아빠는 우주 악당이랑 싸우느라 배가 고픈데~", 120, 44, "b", { w: 210 }), B("…아빠 손은 왜 딸기 쪽으로 가?", 290, 60, "b", { w: 150 })],
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
          h: 360, bg: "kitchen",
          chars: [C("taeo", 70, "sad", "give", { y: 330, m: "bob" }), C("appa", 200, "proud", "hip", { y: 350, m: "pop" }), C("jaei", 330, "blank", "stand", { y: 330, m: "shake" })],
          fp: [["table", 200, 290, { w: 400 }], ["berry", 92, 238, { s: 0.35 }]],
          b: [B("엄마… 다음엔 더 큰 거 죠!", 75, 130, "b", { w: 130 }), B("좋아! 아빠가 내일 딸기 한 바구니 사 올게!", 270, 50, "b", { k: "shout", w: 190 })],
        },
        {
          h: 240, bg: "gloom",
          chars: [bust("jaei", 270, 130, 1.7, "blank", "stand", { m: "shake" })],
          b: [B("…처음부터 그러면 됐잖아.", 95, 120, "", { k: "think", w: 160 })],
        },
      ],
    },
  ];
})(typeof window !== "undefined" ? window : globalThis);
