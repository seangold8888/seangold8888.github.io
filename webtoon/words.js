// 우리 집 말 사전. 가족이 알려 줄 때마다 해당 목록 맨 아래에 한 줄씩 더한다.
(function (root) {
  "use strict";

  // 태오어 사전: 태오가 태오식으로 부르는 말. say = 태오가 하는 말, real = 원래 말, what = 무엇인지(짧게).
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
    { say: "오구마꼬치 피었습니다", real: "무궁화 꽃이 피었습니다", what: "술래 놀이" },
    { say: "패드", real: "마블 5분 보드게임", what: "“패드로 어벤져스 게임 하자!”" },
    { say: "쉬터맨", real: "스파이더맨", what: "거미 영웅" },
    { say: "아이엠둔", real: "닥터 둠", what: "판타스틱 4의 악당" },
    { say: "늘어나는 애", real: "리드 (판타스틱 4)", what: "이름을 자꾸 까먹어서 “늘어나는 애 이름 뭐야?”" },
    { say: "어벤져스에 가년~", real: "어벤져스에 가면~", what: "‘시장에 가면’ 놀이의 태오판. 누구누구 있는지 이어 말하기" },
  ];

  // 태오가 매일 하는 말(입버릇). say = 말, when = 언제 하는지.
  const TAEO_SAYINGS = [
    { say: "맛있는 거 죠!", when: "하루에도 몇 번씩" },
    { say: "오늘 티비 보는 날이야?", when: "아침에 눈 뜨자마자" },
    { say: "어린이집 안 가는 날이야?", when: "매일 아침" },
    { say: "아빠 내 말 안 들으면 피노키오야!", when: "아빠가 “이따가”만 할 때" },
    { say: "엄마 맛있는 거 안 주면 소리 지른다!", when: "간식이 먹고 싶을 때" },
    { say: "늘어나는 애 이름 뭐야?", when: "판타스틱 4 리드 이름이 또 생각 안 날 때" },
    { say: "블랙 위도우랑 수가 제일 예뻐!", when: "영웅 이야기만 나오면" },
    { say: "왜 놀려! 놀리지 마!", when: "“태오는 글씨·숫자 잘 몰라” 소리를 들으면 (손가락질하며)" },
  ];

  // 재이가 요즘 하는 말. say = 말, when = 언제 하는지.
  const JAEI_SAYINGS = [
    { say: "김태오!", when: "참고 참다가 폭발했을 때 (그다음은 엉덩이 찰싹!)" },
  ];

  // 재이가 아기 때 한 말. say = 재이가 한 말, real = 원래 말, what = 사연.
  const JAEI_WORDS = [
    { say: "짐방", real: "김서방", what: "할머니가 아빠를 “김서방~” 하고 부르시는 걸 따라서 아빠를 부른 말" },
  ];

  root.TaeoWords = TAEO_WORDS;
  root.TaeoSayings = TAEO_SAYINGS;
  root.JaeiWords = JAEI_WORDS;
  root.JaeiSayings = JAEI_SAYINGS;
})(typeof window !== "undefined" ? window : globalThis);
