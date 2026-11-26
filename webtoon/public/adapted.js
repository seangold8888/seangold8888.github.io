// 공개판 각색본. 제미나이와 다시 쓴 화를 여기에 넣으면 public.html 에서 원래 화 대신 보인다.
// 가족용 episodes.js 와 똑같이 C, bust, B, FX 로 쓴다. 이름은 실명으로 써도 edition.js 가 가명으로 바꿔 준다.
(function (root) {
  "use strict";
  const { C, bust, B, FX } = root.WebtoonDSL; // eslint-disable-line no-unused-vars

  root.PublicAdapted = [
    // { id: 1, title: "…", summary: "…", lesson: "…", talk: "…", cover: 0, panels: [ … ] },
    // ───── 1화 (원래 1화 + 제미나이 최종 대본 합본) ─────
    {
      id: 1,
      title: "마지막 딸기 한 알",
      summary: "접시에 남은 마지막 딸기는 단 한 알. 가위바위보로 이긴 다섯 살 태오는 딸기를 입에 넣으려다 멈추는데…",
      lesson: "나누면 작아지는 게 아니라, 마음이 커져요.",
      talk: "우리 가족 중에 나에게 가장 많이 양보해 준 사람은 누구일까요?",
      cover: 5,
      motion: true,
      panels: [
        {
          h: 400, bg: "kitchen",
          chars: [C("appa", 60, "happy", "stand", { y: 400, m: "pop" }), C("taeo", 155, "love", "cheer", { y: 340, m: "hop" }), C("jaei", 250, "happy", "stand", { y: 350, m: "pop" }), C("eomma", 345, "smile", "stand", { y: 400, m: "pop" })],
          fp: [["table", 200, 310, { w: 400 }], ["plate", 200, 316, { n: 1 }], ["sparkle", 245, 290, { s: 0.7 }]],
          n: "일요일 저녁, 네 식구의 식탁. 남은 딸기는 딱 한 알.",
          b: [B("딸기다아아!", 150, 120, "b", { k: "shout" })],
          sfx: [FX("반짝", 310, 300, { rot: 10, c: "#ff6b6b", size: 0.7 })],
        },
        {
          h: 330, bg: "kitchen",
          chars: [bust("appa", 110, 150, 1.25, "sly", "give", { m: "bob" }), bust("jaei", 300, 170, 1.25, "sly", "stand", { m: "pop" })],
          fp: [["table", 200, 290, { w: 400 }], ["plate", 205, 296, { n: 1 }]],
          b: [B("음~ 아빠는 배불러서 괜찮은데~", 120, 44, "b", { w: 200 }), B("…아빠 손은 왜 딸기 쪽으로 가?", 290, 60, "b", { w: 150 })],
        },
        {
          h: 280, bg: "burst:c9dcff",
          sh: true,
          chars: [bust("appa", 130, 130, 1.4, "shock", "give", { m: "shake" })],
          b: [B("여보.", 330, 70, "r", { k: "whisper" })],
          sfx: [FX("움찔!", 250, 200, { rot: -8, c: "#3b6fd6" })],
        },
        {
          h: 320, bg: "kitchen",
          chars: [C("taeo", 130, "determined", "cheer", { y: 290, m: "stomp" }), C("jaei", 280, "happy", "fist", { y: 296, m: "pop" })],
          fp: [["table", 200, 262, { w: 400 }]],
          b: [B("그럼 가위바위보 하자!!", 130, 50, "b", { k: "shout" }), B("좋아! 딱 한 판이야!", 300, 80, "bl")],
        },
        {
          h: 300, bg: "speed:fff3f6",
          sh: true,
          chars: [C("appa", 55, "determined", "kick", { s: 0.8, m: "shake" }), C("eomma", 150, "determined", "fist", { s: 0.8, m: "shake" }), C("jaei", 250, "determined", "cheer", { s: 0.95, m: "shake" }), C("taeo", 340, "determined", "kick", { s: 1, m: "shake" })],
          sfx: [FX("가위!", 90, 50, { rot: -10, c: "#ff6b6b" }), FX("바위!", 200, 38, { rot: 4, c: "#3b6fd6" }), FX("보!!", 320, 56, { rot: 10, c: "#2fbf5b", size: 1.4 })],
        },
        {
          h: 340, bg: "burst:ffd1e1",
          chars: [C("appa", 60, "sad", "stand", { s: 0.85, m: "bob" }), C("taeo", 200, "laugh", "up", { s: 1.3, m: "hop" }), C("jaei", 340, "angry", "point", { s: 0.95, m: "stomp" })],
          b: [B("이겼다아아아!", 200, 44, "b", { k: "shout" }), B("아니야! 다시 해, 다시!", 330, 130, "b", { w: 120 })],
          sfx: [FX("와아", 70, 70, { rot: -12, c: "#ff9f1c", size: 0.9 })],
        },
        {
          h: 380, bg: "kitchen",
          chars: [bust("taeo", 200, 190, 1.9, "smile", "hold", { m: "bob" })],
          fp: [["berry", 200, 322, { s: 1.6 }]],
          n: "태오는 딸기를 입에 넣으려다… 멈췄다.",
          b: [B("…그런데.", 90, 110, "br", { k: "think" })],
        },
        {
          h: 330, bg: "sparkle:fff0d6",
          chars: [bust("eomma", 200, 160, 1.4, "smile", "stand", { m: "bob" })],
          fp: [["cup", 300, 300, { s: 0.9 }]],
          n: "엄마는 오늘 딸기를 한 알도 안 먹었다.",
          n2: "우리가 먹는 걸, 가만히 보고만 있었다.",
        },
        {
          h: 420, bg: "kitchen",
          chars: [C("taeo", 110, "happy", "give", { y: 378, m: "hop" }), C("eomma", 295, "shy", "cover", { y: 420, m: "shake" })],
          fp: [["table", 200, 360, { w: 400 }], ["berry", 177, 304, { s: 0.9 }]],
          b: [B("엄마! 아~ 해!", 100, 50, "b", { k: "shout", w: 120 }), B("어머, 엄마는 너희 먹는 것만 봐도 배불러~", 290, 50, "b", { w: 180 }), B("거짓말! 엄마 배에서 방금 꼬르륵 했어!", 140, 160, "b", { k: "shout", w: 190 })],
          sfx: [FX("꼬르륵~", 320, 300, { rot: -6, c: "#b0582a" })],
        },
        {
          h: 330, bg: "kitchen",
          chars: [C("jaei", 70, "happy", "point", { y: 300, m: "pop" }), C("appa", 290, "proud", "hip", { y: 340, m: "bob" })],
          fp: [["table", 200, 270, { w: 400 }], ["plate", 190, 276, { n: 1 }]],
          b: [B("그럼 넷으로 나누자!", 80, 60, "b"), B("좋아, 아빠가 공평하게 잘라 줄게!", 300, 50, "b", { w: 170 })],
        },
        {
          h: 260, bg: "burst:dff3e4",
          fp: [["plate", 200, 170, { r: 110, cut: true, m: "pop" }]],
          b: [B("아빠… 이게 공평해?", 100, 60, "r", { w: 150 })],
          sfx: [FX("…?", 320, 70, { rot: 8, c: "#4a3a33" })],
        },
        {
          h: 340, bg: "kitchen",
          chars: [C("taeo", 60, "sly", "stand", { y: 312, m: "bob" }), C("jaei", 150, "sly", "hip", { y: 316, m: "bob" }), C("appa", 265, "guilty", "give", { y: 352, m: "shake" }), C("eomma", 360, "angry", "hip", { y: 352, m: "pop" })],
          fp: [["table", 200, 282, { w: 400 }]],
          b: [B("제일 큰 건 당연히…", 120, 44, "br"), B("…엄마 거지!", 300, 56, "bl", { k: "shout" })],
          sfx: [FX("째릿", 360, 140, { rot: 10, c: "#e0443e", size: 0.9 })],
        },
        {
          h: 500, bg: "kitchen",
          chars: [C("taeo", 70, "laugh", "up", { y: 460, m: "hop" }), C("jaei", 170, "angry", "fist", { y: 464, m: "stomp" }), C("appa", 280, "sly", "stand", { y: 500, s: 0.9, m: "bob" }), C("eomma", 370, "smile", "stand", { y: 500, s: 0.85, m: "pop" })],
          fp: [["table", 200, 430, { w: 400 }], ["plate", 280, 436, { n: 0 }]],
          n: "딸기를 나눠 먹은 지 딱 3초 뒤.",
          b: [B("다 먹었다! 얼음들아, 이제 맛있는 거 죠! 누나는 빼고!", 110, 120, "b", { k: "shout", w: 190 }), B("아니야! 나도 먹을 거거든?!", 200, 205, "b", { w: 140 }), B("여보… 냉장고에 한 팩 더 숨겨 둔 거 나도 알아요…", 300, 100, "b", { k: "whisper", w: 150 })],
        },
        {
          h: 260, bg: "gloom",
          chars: [bust("eomma", 270, 150, 1.3, "sly", "stand", { m: "shake" })],
          b: [B("…쉿.", 150, 120, "r", { k: "whisper", w: 90 })],
          sfx: [FX("들켰다", 90, 210, { rot: -8, c: "#e2557f" })],
        },
      ],
    },
  ];
})(typeof window !== "undefined" ? window : globalThis);
