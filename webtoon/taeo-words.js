// 태오어 사전: 태오가 태오식으로 부르는 말 모음. 가족이 알려 줄 때마다 맨 아래에 한 줄씩 더한다.
// say = 태오가 하는 말, real = 원래 말, what = 무엇인지(짧게).
(function (root) {
  "use strict";

  const TAEO_WORDS = [
    { say: "쓰구미", real: "익스큐즈미", what: "실례합니다 (영어)" },
    { say: "블레이뽀", real: "뷰티풀", what: "아름다워요 (영어)" },
    { say: "블루베리", real: "블랙팬서", what: "어벤져스 영웅" },
    { say: "지잔", real: "비전", what: "어벤져스 영웅" },
    { say: "스테잌로저", real: "스티브 로저스", what: "어벤져스 영웅" },
    { say: "미스테리", real: "닉 퓨리", what: "어벤져스 대장" },
    { say: "우엉", real: "웡", what: "어벤져스 마법사" },
    { say: "우어머신", real: "워머신", what: "어벤져스 영웅" },
    { say: "포도", real: "포비", what: "뽀로로 친구" },
    { say: "헬로키티", real: "마이멜로디", what: "산리오 친구" },
  ];

  root.TaeoWords = TAEO_WORDS;
})(typeof window !== "undefined" ? window : globalThis);
