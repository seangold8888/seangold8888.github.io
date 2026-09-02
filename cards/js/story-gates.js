(function () {
  "use strict";

  // 카드 → 해금 이야기(에피소드 id). 문제는 이 이야기의 오디오 내용만 묻는다.
  const cardStories = Object.freeze({
    heracles: "heracles",
    honggildong: "honggildong",
    perseus: "perseus",
    jack: "jack_story",
    threepigs: "threepigs",
    odysseus: "odyssey_cyclops",
    cinderella: "cinderella",
    tortoisehare: "tortoisehare",
    redhood: "redhood_story",
    pinocchio: "pinocchio",
    fairygodmother: "cinderella",
    genie: "genie",
    snowqueen: "snowqueen",
    mermaid: "mermaid",
    polyphemus: "odyssey_cyclops",
    wolf: "redhood_story",
    medusa: "perseus",
    midas: "midas",
    tiger: "sunmoon"
  });

  function question(id, cardId, prompt, choices, correctChoiceId, refs) {
    return {
      id: id,
      cardId: cardId,
      storyId: cardStories[cardId],
      prompt: prompt,
      choices: choices.map(function (choice) {
        return { id: choice[0], text: choice[1] };
      }),
      correctChoiceId: correctChoiceId,
      source: { kind: "local_metadata", refs: refs }
    };
  }

  // 문항 은행 v2 (2026-09-03): 카드당 5~6문항. 유형을 섞는다 —
  // 사건(무엇을 했나) · 인물(누가) · 소품(무엇으로) · 이유(왜) · 숫자(몇) · 대사(뭐라고).
  // 정답은 story/audio v2 확장판 대본 기준.
  const all = [
    // ── 헤라클레스 ──
    question("heracles-twelve-labors", "heracles",
      "헤라클레스가 첫 번째 과업에서 맞선 동물은 무엇인가요?",
      [["rabbit", "하얀 토끼"], ["lion", "커다란 사자"], ["whale", "바다 고래"]], "lion",
      ["audio: heracles 첫 번째 과업"]),
    question("heracles-hydra-heads", "heracles",
      "물뱀 히드라의 머리는 몇 개였나요?",
      [["three", "세 개"], ["nine", "아홉 개"], ["hundred", "백 개"]], "nine",
      ["audio: heracles 히드라"]),
    question("heracles-torch-helper", "heracles",
      "히드라 머리가 다시 자라지 않게 횃불을 든 사람은 누구인가요?",
      [["iolaus", "조카 이올라오스"], ["king", "에우리스테우스 왕"], ["atlas", "거인 아틀라스"]], "iolaus",
      ["audio: heracles 히드라 횃불"]),
    question("heracles-stable-river", "heracles",
      "헤라클레스는 외양간을 하루 만에 무엇으로 청소했나요?",
      [["shovel", "커다란 삽"], ["river", "강물"], ["broom", "빗자루"]], "river",
      ["audio: heracles 아우게이아스 외양간"]),
    question("heracles-sky-giant", "heracles",
      "하늘을 어깨에 떠받치고 있던 거인의 이름은 무엇인가요?",
      [["atlas", "아틀라스"], ["polyphemus", "폴리페모스"], ["cerberus", "케르베로스"]], "atlas",
      ["audio: heracles 황금 사과"]),
    question("heracles-labor-count", "heracles",
      "헤라클레스가 해낸 과업은 모두 몇 가지였나요?",
      [["seven", "일곱 가지"], ["twelve", "열두 가지"], ["hundred", "백 가지"]], "twelve",
      ["audio: heracles 열두 과업"]),

    // ── 홍길동 ──
    question("honggildong-righteous-thief", "honggildong",
      "홍길동은 빼앗은 재물을 누구에게 나누어 주었나요?",
      [["rich", "욕심 많은 부자들"], ["soldiers", "임금의 군사들"], ["poor", "가난한 사람들"]], "poor",
      ["audio: honggildong 활빈당"]),
    question("honggildong-cannot-call", "honggildong",
      "서자로 태어난 길동이 부르지 못한 말은 무엇인가요?",
      [["father", "아버지"], ["teacher", "선생님"], ["king", "임금님"]], "father",
      ["audio: honggildong 서자"]),
    question("honggildong-band-name", "honggildong",
      "길동이 이끈 의로운 도적 무리의 이름은 무엇인가요?",
      [["hwalbin", "활빈당"], ["roundtable", "원탁의 기사"], ["bremen", "브레멘 음악대"]], "hwalbin",
      ["audio: honggildong 활빈당"]),
    question("honggildong-eight-clones", "honggildong",
      "팔도에 동시에 나타난 홍길동은 모두 몇 명이었나요?",
      [["two", "두 명"], ["eight", "여덟 명"], ["hundred", "백 명"]], "eight",
      ["audio: honggildong 분신 팔도"]),
    question("honggildong-island-kingdom", "honggildong",
      "길동이 바다 건너에 세운 나라의 이름은 무엇인가요?",
      [["yuldo", "율도국"], ["camelot", "카멜롯"], ["ithaca", "이타카"]], "yuldo",
      ["audio: honggildong 율도국"]),

    // ── 페르세우스 ──
    question("perseus-mirror-shield", "perseus",
      "페르세우스가 메두사에게 맞설 때 거울처럼 쓴 것은 무엇인가요?",
      [["shield", "반짝이는 방패"], ["slipper", "유리 구두"], ["goose-egg", "황금 거위 알"]], "shield",
      ["audio: perseus 거울 방패"]),
    question("perseus-winged-sandals", "perseus",
      "하늘을 나는 날개 달린 샌들을 준 신은 누구인가요?",
      [["hermes", "헤르메스"], ["athena", "아테나"], ["poseidon", "포세이돈"]], "hermes",
      ["audio: perseus 신들의 선물"]),
    question("perseus-three-hags", "perseus",
      "메두사의 집을 아는 세 노파가 번갈아 나눠 쓰던 것은 무엇인가요?",
      [["one-eye", "눈 하나"], ["staff", "지팡이 하나"], ["hat", "모자 하나"]], "one-eye",
      ["audio: perseus 세 노파"]),
    question("perseus-princess", "perseus",
      "바닷가 바위에 묶여 있던 공주의 이름은 무엇인가요?",
      [["andromeda", "안드로메다"], ["gerda", "겔다"], ["danae", "다나에"]], "andromeda",
      ["audio: perseus 바다 괴물"]),
    question("perseus-sea-monster", "perseus",
      "페르세우스는 바다 괴물을 어떻게 물리쳤나요?",
      [["stone", "메두사 머리로 돌로 만들었어요"], ["fire", "불로 태웠어요"], ["song", "노래로 재웠어요"]], "stone",
      ["audio: perseus 바다 괴물"]),

    // ── 콩나무 잭 ──
    question("jack-golden-goose", "jack",
      "잭은 소를 무엇과 바꾸었나요?",
      [["sword", "은빛 검"], ["beans", "마법의 콩"], ["bottle", "유리병"]], "beans",
      ["audio: jack_story 소와 콩"]),
    question("jack-cow-name", "jack",
      "잭네 늙은 소의 이름은 무엇이었나요?",
      [["milkywhite", "밀키화이트"], ["snowy", "스노우"], ["goldie", "골디"]], "milkywhite",
      ["audio: jack_story 소 이름"]),
    question("jack-bean-count", "jack",
      "잭이 받은 마법의 콩은 몇 알이었나요?",
      [["three", "세 알"], ["five", "다섯 알"], ["hundred", "백 알"]], "five",
      ["audio: jack_story 콩 다섯 알"]),
    question("jack-hidden-by", "jack",
      "구름 위 성에서 잭을 오븐에 숨겨 준 사람은 누구인가요?",
      [["giant-wife", "거인의 아내"], ["fairy", "요정"], ["mother", "잭의 어머니"]], "giant-wife",
      ["audio: jack_story 거인의 아내"]),
    question("jack-second-treasure", "jack",
      "잭이 두 번째로 가지고 내려온 보물은 무엇인가요?",
      [["harp", "노래하는 황금 하프"], ["goose", "황금 거위"], ["slipper", "유리 구두"]], "harp",
      ["audio: jack_story 황금 하프"]),
    question("jack-axe", "jack",
      "잭은 콩나무를 무엇으로 쓰러뜨렸나요?",
      [["axe", "도끼"], ["fire", "불"], ["wind", "바람"]], "axe",
      ["audio: jack_story 도끼"]),

    // ── 아기돼지 삼형제 ──
    question("threepigs-brick-house", "threepigs",
      "둘째 돼지는 무엇으로 집을 지었나요?",
      [["ice", "얼음"], ["brick", "벽돌"], ["wood", "나뭇가지"]], "wood",
      ["audio: threepigs 둘째 집"]),
    question("threepigs-first-house", "threepigs",
      "첫째 돼지의 집 재료는 무엇이었나요?",
      [["straw", "지푸라기"], ["brick", "벽돌"], ["ice", "얼음"]], "straw",
      ["audio: threepigs 첫째 집"]),
    question("threepigs-build-time", "threepigs",
      "셋째 돼지가 벽돌집을 다 짓는 데 얼마나 걸렸나요?",
      [["one-day", "하루"], ["one-week", "일주일"], ["one-year", "일 년"]], "one-week",
      ["audio: threepigs 일주일"]),
    question("threepigs-turnip", "threepigs",
      "늑대가 셋째 돼지에게 같이 가자고 꾄 곳은 어디인가요?",
      [["turnip", "순무밭"], ["sea", "바다"], ["palace", "왕궁"]], "turnip",
      ["audio: threepigs 순무밭"]),
    question("threepigs-chimney", "threepigs",
      "늑대는 마지막에 벽돌집 어디로 들어오려 했나요?",
      [["chimney", "굴뚝"], ["window", "창문"], ["door", "문"]], "chimney",
      ["audio: threepigs 굴뚝"]),
    question("threepigs-pot", "threepigs",
      "굴뚝 밑에는 무엇이 놓여 있었나요?",
      [["pot", "펄펄 끓는 솥"], ["bed", "폭신한 침대"], ["apples", "사과 바구니"]], "pot",
      ["audio: threepigs 끓는 솥"]),

    // ── 오디세우스 ──
    question("odysseus-cyclops-name", "odysseus",
      "거인이 이름을 묻자 오디세우스는 뭐라고 대답했나요?",
      [["nobody", "아무도 아니"], ["sea-king", "바다의 왕"], ["heracles", "헤라클레스"]], "nobody",
      ["audio: odyssey_cyclops 이름 계책"]),
    question("odysseus-wine", "odysseus",
      "오디세우스가 거인에게 준 것은 무엇인가요?",
      [["wine", "독한 포도주"], ["cheese", "치즈"], ["gold", "황금"]], "wine",
      ["audio: odyssey_cyclops 포도주"]),
    question("odysseus-olive-stake", "odysseus",
      "거인의 눈을 찌른 막대는 무슨 나무였나요?",
      [["olive", "올리브 나무"], ["beanstalk", "콩나무"], ["pine", "소나무"]], "olive",
      ["audio: odyssey_cyclops 올리브 막대"]),
    question("odysseus-home", "odysseus",
      "오디세우스가 돌아가려던 고향은 어디인가요?",
      [["ithaca", "이타카"], ["bremen", "브레멘"], ["pyongyang", "평양"]], "ithaca",
      ["audio: odyssey_cyclops 이타카"]),
    question("odysseus-rock-throw", "odysseus",
      "오디세우스가 배에서 진짜 이름을 외치자 거인은 무엇을 했나요?",
      [["throw-mountain", "산꼭대기를 뜯어 던졌어요"], ["sleep", "다시 잠들었어요"], ["sing", "노래를 불렀어요"]], "throw-mountain",
      ["audio: odyssey_cyclops 진짜 이름"]),

    // ── 신데렐라 ──
    question("cinderella-pumpkin-carriage", "cinderella",
      "신데렐라는 왜 자정 전에 돌아와야 했나요?",
      [["gate", "성문이 닫혀서"], ["magic", "마법이 풀려서"], ["horse", "말이 졸려서"]], "magic",
      ["audio: cinderella 자정"]),
    question("cinderella-carriage-from", "cinderella",
      "황금 마차는 무엇으로 만들어졌나요?",
      [["pumpkin", "호박"], ["apple", "사과"], ["watermelon", "수박"]], "pumpkin",
      ["audio: cinderella 호박 마차"]),
    question("cinderella-horses-from", "cinderella",
      "마차를 끄는 말이 된 동물은 무엇인가요?",
      [["mice", "생쥐"], ["lizards", "도마뱀"], ["pigeons", "비둘기"]], "mice",
      ["audio: cinderella 생쥐 여섯 마리"]),
    question("cinderella-ball-days", "cinderella",
      "왕궁 무도회는 며칠 동안 열렸나요?",
      [["one", "하루"], ["two", "이틀"], ["ten", "열흘"]], "two",
      ["audio: cinderella 이틀 무도회"]),
    question("cinderella-beans-in-ash", "cinderella",
      "새어머니가 재 속에 쏟아 버린 것은 무엇인가요?",
      [["beans", "콩과 팥"], ["rice", "쌀"], ["candy", "사탕"]], "beans",
      ["audio: cinderella 콩 고르기"]),
    question("cinderella-lost-item", "cinderella",
      "신데렐라가 계단에서 잃어버린 것은 무엇인가요?",
      [["slipper", "유리 구두 한 짝"], ["hat", "모자"], ["ring", "반지"]], "slipper",
      ["audio: cinderella 유리 구두"]),

    // ── 토끼와 거북 ──
    question("tortoisehare-winner", "tortoisehare",
      "토끼는 경주 도중 무엇을 했나요?",
      [["swim", "강을 헤엄쳤어요"], ["house", "집을 지었어요"], ["nap", "낮잠을 잤어요"]], "nap",
      ["audio: tortoisehare 낮잠"]),
    question("tortoisehare-referee", "tortoisehare",
      "달리기 시합의 심판은 누구였나요?",
      [["fox", "여우"], ["lion", "사자"], ["bear", "곰"]], "fox",
      ["audio: tortoisehare 심판 여우"]),
    question("tortoisehare-finish", "tortoisehare",
      "결승선은 어디였나요?",
      [["big-tree", "언덕 위 큰 나무"], ["river", "강가"], ["palace", "왕궁 문"]], "big-tree",
      ["audio: tortoisehare 결승선"]),
    question("tortoisehare-snack", "tortoisehare",
      "토끼가 경주 도중 먹은 간식은 무엇인가요?",
      [["carrot", "당근"], ["ricecake", "떡"], ["apple", "사과"]], "carrot",
      ["audio: tortoisehare 당근밭"]),
    question("tortoisehare-stream", "tortoisehare",
      "거북은 작은 개울을 어떻게 건넜나요?",
      [["swim", "헤엄쳐서"], ["bridge", "다리로"], ["jump", "뛰어넘어서"]], "swim",
      ["audio: tortoisehare 개울"]),

    // ── 빨간 모자 ──
    question("redhood-big-ears", "redhood",
      "빨간 모자는 바구니를 들고 누구의 집으로 갔나요?",
      [["grandmother", "할머니"], ["giant", "거인"], ["king", "임금님"]], "grandmother",
      ["audio: redhood_story 할머니 댁"]),
    question("redhood-basket", "redhood",
      "빨간 모자의 바구니에 든 것은 무엇이었나요?",
      [["cake-wine", "과자와 포도주"], ["ricecake", "떡"], ["apples", "사과"]], "cake-wine",
      ["audio: redhood_story 과자와 포도주"]),
    question("redhood-flowers", "redhood",
      "늑대는 빨간 모자에게 무엇을 하라고 꼬드겼나요?",
      [["flowers", "꽃을 꺾으라고"], ["sing", "노래를 부르라고"], ["nap", "낮잠을 자라고"]], "flowers",
      ["audio: redhood_story 꽃"]),
    question("redhood-closet", "redhood",
      "늑대는 할머니를 어디에 가두었나요?",
      [["closet", "옷장"], ["well", "우물"], ["cellar", "지하실"]], "closet",
      ["audio: redhood_story 옷장"]),
    question("redhood-rescuer", "redhood",
      "빨간 모자와 할머니를 구해 준 사람은 누구인가요?",
      [["hunter", "사냥꾼"], ["prince", "왕자"], ["knight", "기사"]], "hunter",
      ["audio: redhood_story 사냥꾼"]),
    question("redhood-big-mouth", "redhood",
      "\"입은 왜 이렇게 커요?\"라고 묻자 늑대는 뭐라고 했나요?",
      [["eat", "너를 잡아먹으려고"], ["sing", "노래를 부르려고"], ["laugh", "크게 웃으려고"]], "eat",
      ["audio: redhood_story 큰 입"]),

    // ── 피노키오 ──
    question("pinocchio-growing-nose", "pinocchio",
      "나무 인형 피노키오를 만든 사람은 누구인가요?",
      [["hunter", "사냥꾼"], ["geppetto", "제페토 할아버지"], ["midas", "미다스 왕"]], "geppetto",
      ["audio: pinocchio 제페토"]),
    question("pinocchio-lie", "pinocchio",
      "피노키오가 거짓말을 하면 어떻게 되나요?",
      [["nose", "코가 길어져요"], ["ears", "귀가 커져요"], ["shrink", "키가 작아져요"]], "nose",
      ["audio: pinocchio 코"]),
    question("pinocchio-fox-cat", "pinocchio",
      "금화를 땅에 심으라고 꾄 동물들은 누구인가요?",
      [["fox-cat", "여우와 고양이"], ["wolf", "늑대"], ["birds", "참새들"]], "fox-cat",
      ["audio: pinocchio 여우와 고양이"]),
    question("pinocchio-woodpecker", "pinocchio",
      "길어진 코를 쪼아서 줄여 준 새는 무엇인가요?",
      [["woodpecker", "딱따구리"], ["sparrow", "참새"], ["crow", "까마귀"]], "woodpecker",
      ["audio: pinocchio 딱따구리"]),
    question("pinocchio-donkey-ears", "pinocchio",
      "장난감 나라에서 피노키오에게 무엇이 돋아났나요?",
      [["donkey-ears", "당나귀 귀"], ["horns", "뿔"], ["wings", "날개"]], "donkey-ears",
      ["audio: pinocchio 장난감 나라"]),
    question("pinocchio-shark", "pinocchio",
      "제페토 할아버지를 삼킨 것은 무엇인가요?",
      [["shark", "거대한 상어"], ["giant", "거인"], ["whale", "고래"]], "shark",
      ["audio: pinocchio 상어"]),

    // ── 요정 대모 ──
    question("fairygodmother-pumpkin", "fairygodmother",
      "요정 대모가 마차로 바꾼 채소는 무엇인가요?",
      [["cabbage", "양배추"], ["carrot", "당근"], ["pumpkin", "호박"]], "pumpkin",
      ["audio: cinderella 호박 마차"]),
    question("fairygodmother-mice", "fairygodmother",
      "요정 대모가 말로 바꾼 동물은 무엇인가요?",
      [["mice", "생쥐 여섯 마리"], ["dogs", "강아지 두 마리"], ["birds", "비둘기"]], "mice",
      ["audio: cinderella 생쥐"]),
    question("fairygodmother-midnight", "fairygodmother",
      "요정 대모의 마법은 몇 시에 풀리나요?",
      [["twelve", "밤 열두 시"], ["nine", "밤 아홉 시"], ["six", "저녁 여섯 시"]], "twelve",
      ["audio: cinderella 열두 시"]),
    question("fairygodmother-shoes", "fairygodmother",
      "요정 대모가 신데렐라에게 신겨 준 신발은 무엇인가요?",
      [["glass", "유리 구두"], ["boots", "가죽 장화"], ["straw", "짚신"]], "glass",
      ["audio: cinderella 유리 구두"]),
    question("fairygodmother-when", "fairygodmother",
      "요정 대모는 언제 나타났나요?",
      [["crying", "신데렐라가 혼자 울고 있을 때"], ["ball-end", "무도회가 끝난 뒤"], ["morning", "아침 식사 때"]], "crying",
      ["audio: cinderella 요정 등장"]),

    // ── 램프의 요정 ──
    question("genie-three-wishes", "genie",
      "알라딘은 어디에서 요술 램프를 찾았나요?",
      [["cave", "동굴"], ["tree", "숲속 나무 위"], ["sea", "바닷속"]], "cave",
      ["audio: genie 동굴"]),
    question("genie-ring", "genie",
      "동굴에 갇힌 알라딘을 집으로 데려다준 것은 무엇인가요?",
      [["ring-genie", "반지의 요정"], ["lamp", "램프의 요정"], ["magician", "마법사"]], "ring-genie",
      ["audio: genie 반지"]),
    question("genie-old-lamps", "genie",
      "램프 장수로 변장한 마법사는 뭐라고 외쳤나요?",
      [["old-new", "헌 램프를 새 램프로!"], ["ricecake", "떡 하나 주면 안 잡아먹지!"], ["open", "문 열어라!"]], "old-new",
      ["audio: genie 헌 램프"]),
    question("genie-wish-count", "genie",
      "램프의 요정은 소원을 몇 가지 들어주나요?",
      [["one", "한 가지"], ["three", "세 가지"], ["hundred", "백 가지"]], "three",
      ["audio: genie 세 가지 소원"]),
    question("genie-last-wish", "genie",
      "알라딘의 마지막 소원은 무엇이었나요?",
      [["free", "램프의 요정을 자유롭게 하기"], ["gold", "황금 산"], ["castle", "더 큰 궁전"]], "free",
      ["audio: genie 마지막 소원"]),
    question("genie-africa", "genie",
      "마법사는 궁전과 공주를 어디로 옮겨 버렸나요?",
      [["africa", "아프리카"], ["sea", "바다 밑"], ["sky", "구름 위"]], "africa",
      ["audio: genie 아프리카"]),

    // ── 눈의 여왕 ──
    question("snowqueen-ice-palace", "snowqueen",
      "겔다가 얼음 궁전에서 찾은 친구 이름은 무엇인가요?",
      [["jack", "잭"], ["kai", "카이"], ["gildong", "길동"]], "kai",
      ["audio: snowqueen 카이"]),
    question("snowqueen-mirror", "snowqueen",
      "카이의 눈과 심장에 박힌 것은 무엇인가요?",
      [["mirror", "거울 조각"], ["snowflake", "눈송이"], ["thorn", "장미 가시"]], "mirror",
      ["audio: snowqueen 거울 조각"]),
    question("snowqueen-reindeer", "snowqueen",
      "겔다를 등에 태우고 눈보라 속을 달린 동물은 무엇인가요?",
      [["reindeer", "순록"], ["horse", "말"], ["crow", "까마귀"]], "reindeer",
      ["audio: snowqueen 순록"]),
    question("snowqueen-tears", "snowqueen",
      "카이의 심장 속 거울 조각을 녹인 것은 무엇인가요?",
      [["tears", "겔다의 따뜻한 눈물"], ["fire", "모닥불"], ["sun", "여름 햇살"]], "tears",
      ["audio: snowqueen 눈물"]),
    question("snowqueen-roses", "snowqueen",
      "카이와 겔다가 함께 놀던 곳에 핀 꽃은 무엇인가요?",
      [["roses", "장미"], ["sunflowers", "해바라기"], ["tulips", "튤립"]], "roses",
      ["audio: snowqueen 장미"]),

    // ── 인어공주 ──
    question("mermaid-lost-voice", "mermaid",
      "인어공주는 두 다리를 얻으려고 무엇을 내주었나요?",
      [["crown", "왕관"], ["comb", "빗"], ["voice", "목소리"]], "voice",
      ["audio: mermaid 목소리"]),
    question("mermaid-age", "mermaid",
      "인어는 몇 살이 되어야 바다 위로 올라갈 수 있나요?",
      [["ten", "열 살"], ["fifteen", "열다섯 살"], ["twenty", "스무 살"]], "fifteen",
      ["audio: mermaid 열다섯 살"]),
    question("mermaid-storm", "mermaid",
      "인어공주는 어떤 날 왕자를 구했나요?",
      [["storm", "폭풍이 치던 밤"], ["sunny", "맑은 아침"], ["snow", "눈 오는 날"]], "storm",
      ["audio: mermaid 폭풍"]),
    question("mermaid-witch-house", "mermaid",
      "바다 마녀의 집은 무엇으로 지어졌나요?",
      [["bones", "뼈"], ["candy", "과자"], ["ice", "얼음"]], "bones",
      ["audio: mermaid 마녀의 집"]),
    question("mermaid-conch", "mermaid",
      "인어공주의 목소리는 어디에 갇혀 있었나요?",
      [["conch", "마녀의 소라고둥"], ["bottle", "유리병"], ["chest", "보물 상자"]], "conch",
      ["audio: mermaid 소라고둥"]),

    // ── 폴리페모스 ──
    question("polyphemus-sheep", "polyphemus",
      "오디세우스 일행은 동굴을 빠져나갈 때 무엇 아래에 숨었나요?",
      [["sheep", "양"], ["horse", "목마"], ["table", "탁자"]], "sheep",
      ["audio: odyssey_cyclops 양"]),
    question("polyphemus-eye-count", "polyphemus",
      "거인 폴리페모스의 눈은 몇 개인가요?",
      [["one", "하나"], ["two", "둘"], ["three", "셋"]], "one",
      ["audio: odyssey_cyclops 외눈"]),
    question("polyphemus-door", "polyphemus",
      "거인은 동굴 입구를 무엇으로 막았나요?",
      [["rock", "커다란 바위"], ["door", "나무 문"], ["net", "그물"]], "rock",
      ["audio: odyssey_cyclops 바위"]),
    question("polyphemus-father", "polyphemus",
      "거인의 아버지인 바다의 신은 누구인가요?",
      [["poseidon", "포세이돈"], ["zeus", "제우스"], ["atlas", "아틀라스"]], "poseidon",
      ["audio: odyssey_cyclops 포세이돈"]),
    question("polyphemus-wine-cups", "polyphemus",
      "거인은 포도주를 몇 잔 마시고 잠들었나요?",
      [["one", "한 잔"], ["three", "세 잔"], ["ten", "열 잔"]], "three",
      ["audio: odyssey_cyclops 세 잔"]),

    // ── 커다란 늑대 ──
    question("wolf-grandmother", "wolf",
      "늑대는 누구인 척 침대에 누웠나요?",
      [["fairy", "요정 대모"], ["grandmother", "할머니"], ["teacher", "선생님"]], "grandmother",
      ["audio: redhood_story 변장"]),
    question("wolf-costume", "wolf",
      "늑대가 변장할 때 입은 것은 무엇인가요?",
      [["pajamas", "할머니 잠옷과 나이트캡"], ["crown", "왕관"], ["armor", "갑옷"]], "pajamas",
      ["audio: redhood_story 잠옷"]),
    question("wolf-escape", "wolf",
      "사냥꾼이 들이닥치자 늑대는 어디로 도망쳤나요?",
      [["window", "창문으로 숲으로"], ["chimney", "굴뚝으로"], ["well", "우물 속으로"]], "window",
      ["audio: redhood_story 창문"]),
    question("wolf-shortcut", "wolf",
      "늑대는 어떻게 빨간 모자보다 먼저 할머니 댁에 갔나요?",
      [["shortcut", "지름길로 달려서"], ["horse", "말을 타고"], ["fly", "날아서"]], "shortcut",
      ["audio: redhood_story 지름길"]),
    question("wolf-big-ears", "wolf",
      "귀가 왜 크냐고 묻자 늑대는 뭐라고 했나요?",
      [["hear", "네 말을 잘 들으려고"], ["cold", "추워서"], ["pretty", "멋있어서"]], "hear",
      ["audio: redhood_story 큰 귀"]),

    // ── 메두사 ──
    question("medusa-stone", "medusa",
      "메두사의 머리카락은 무엇처럼 움직였나요?",
      [["ribbon", "리본"], ["cloud", "구름"], ["snake", "뱀"]], "snake",
      ["audio: perseus 뱀 머리카락"]),
    question("medusa-gaze", "medusa",
      "메두사의 눈을 마주치면 어떻게 되나요?",
      [["stone", "돌이 돼요"], ["sleep", "잠들어요"], ["laugh", "웃음이 나요"]], "stone",
      ["audio: perseus 돌"]),
    question("medusa-asleep", "medusa",
      "페르세우스가 찾아갔을 때 메두사는 무엇을 하고 있었나요?",
      [["sleeping", "잠들어 있었어요"], ["dancing", "춤추고 있었어요"], ["cooking", "요리하고 있었어요"]], "sleeping",
      ["audio: perseus 잠든 메두사"]),
    question("medusa-bag", "medusa",
      "메두사의 머리는 무엇에 담겼나요?",
      [["bag", "마법 자루"], ["basket", "바구니"], ["helmet", "투구"]], "bag",
      ["audio: perseus 마법 자루"]),
    question("medusa-home", "medusa",
      "메두사는 어디에 살았나요?",
      [["cave", "돌로 변한 전사들이 있는 동굴"], ["palace", "황금 궁전"], ["sea", "바닷속"]], "cave",
      ["audio: perseus 동굴"]),

    // ── 미다스 왕 ──
    question("midas-golden-touch", "midas",
      "음식까지 황금이 되자 미다스 왕은 왜 슬퍼했나요?",
      [["cannot-eat", "먹을 수 없어서"], ["cold", "너무 추워서"], ["silence", "노래가 멈춰서"]], "cannot-eat",
      ["audio: midas 황금 빵"]),
    question("midas-spirit", "midas",
      "미다스 왕의 소원을 들어준 정령의 이름은 무엇인가요?",
      [["silenus", "실레노스"], ["genie", "램프의 요정"], ["merlin", "멀린"]], "silenus",
      ["audio: midas 실레노스"]),
    question("midas-daughter", "midas",
      "황금 조각상이 되어 버린 가족은 누구인가요?",
      [["daughter", "어린 딸"], ["son", "아들"], ["queen", "왕비"]], "daughter",
      ["audio: midas 딸"]),
    question("midas-river", "midas",
      "미다스 왕은 어떻게 마법을 풀었나요?",
      [["river", "강물에 손을 씻어서"], ["sleep", "잠을 자서"], ["song", "노래를 불러서"]], "river",
      ["audio: midas 팍톨로스 강"]),
    question("midas-first-gold", "midas",
      "왕이 아침에 제일 먼저 만져서 황금이 된 것은 무엇인가요?",
      [["bed", "침대"], ["bread", "빵"], ["daughter", "딸"]], "bed",
      ["audio: midas 황금 침대"]),

    // ── 호랑이 ──
    question("tiger-rice-cake", "tiger",
      "오누이는 호랑이를 피해 무엇을 타고 하늘로 올라갔나요?",
      [["beanstalk", "콩나무"], ["rope", "하늘에서 내려온 동아줄"], ["carriage", "호박 마차"]], "rope",
      ["audio: sunmoon 동아줄"]),
    question("tiger-shout", "tiger",
      "고갯길에서 호랑이가 어머니에게 외친 말은 무엇인가요?",
      [["ricecake", "떡 하나 주면 안 잡아먹지!"], ["open", "문 열어라!"], ["fee-fi", "피 파이 포 펌!"]], "ricecake",
      ["audio: sunmoon 떡"]),
    question("tiger-tree", "tiger",
      "오누이는 호랑이를 피해 어디로 올라갔나요?",
      [["tree", "우물가 큰 나무"], ["roof", "지붕"], ["mountain", "산꼭대기"]], "tree",
      ["audio: sunmoon 나무"]),
    question("tiger-sesame", "tiger",
      "누나는 나무에 어떻게 올라왔다고 거짓말했나요?",
      [["sesame", "참기름을 바르고"], ["ladder", "사다리로"], ["wings", "날개로"]], "sesame",
      ["audio: sunmoon 참기름"]),
    question("tiger-axe-slip", "tiger",
      "어린 동생이 실수로 알려 준 나무 오르는 법은 무엇인가요?",
      [["axe", "도끼로 찍으면서"], ["oil", "참기름 바르고"], ["rope", "동아줄 타고"]], "axe",
      ["audio: sunmoon 도끼"]),
    question("tiger-fall", "tiger",
      "썩은 동아줄이 끊어진 호랑이는 어디에 떨어졌나요?",
      [["sorghum", "수수밭"], ["sea", "바다"], ["well", "우물"]], "sorghum",
      ["audio: sunmoon 수수밭"])
  ];

  function deepFreeze(value) {
    if (!value || typeof value !== "object" || Object.isFrozen(value)) {
      return value;
    }
    Object.freeze(value);
    Object.keys(value).forEach(function (key) {
      deepFreeze(value[key]);
    });
    return value;
  }

  deepFreeze(all);

  const questionsByCard = all.reduce(function (index, item) {
    if (!index[item.cardId]) {
      index[item.cardId] = [];
    }
    index[item.cardId].push(item);
    return index;
  }, Object.create(null));

  function cardIdFrom(cardOrId) {
    if (typeof cardOrId === "string") {
      return cardOrId;
    }
    return cardOrId && typeof cardOrId.id === "string" ? cardOrId.id : null;
  }

  function storyIdForCard(cardOrId) {
    const cardId = cardIdFrom(cardOrId);
    return cardId && Object.prototype.hasOwnProperty.call(cardStories, cardId)
      ? cardStories[cardId]
      : null;
  }

  function cloneQuestion(item) {
    return {
      id: item.id,
      cardId: item.cardId,
      storyId: item.storyId,
      prompt: item.prompt,
      choices: item.choices.map(function (choice) {
        return { id: choice.id, text: choice.text };
      }),
      correctChoiceId: item.correctChoiceId,
      source: {
        kind: item.source.kind,
        refs: item.source.refs.slice()
      }
    };
  }

  // options.avoidIds: 최근에 낸 문항 id 목록. 다른 문항이 남아 있으면 그중에서만 고른다.
  // rng는 정확히 한 번만 호출한다(재현 가능한 테스트 계약).
  function getForCard(cardOrId, rng = Math.random, options) {
    const cardId = cardIdFrom(cardOrId);
    const bank = cardId ? questionsByCard[cardId] : null;
    if (!bank || bank.length === 0 || typeof rng !== "function") {
      return null;
    }

    const avoid = options && Array.isArray(options.avoidIds) ? options.avoidIds : [];
    let candidates = bank.filter(function (item) {
      return avoid.indexOf(item.id) < 0;
    });
    if (candidates.length === 0) {
      candidates = bank;
    }

    const rawRoll = Number(rng());
    const roll = Number.isFinite(rawRoll)
      ? Math.max(0, Math.min(rawRoll, 0.999999999999))
      : 0;
    return cloneQuestion(candidates[Math.floor(roll * candidates.length)]);
  }

  function countForCard(cardOrId) {
    const cardId = cardIdFrom(cardOrId);
    const bank = cardId ? questionsByCard[cardId] : null;
    return bank ? bank.length : 0;
  }

  window.CardStoryGates = Object.freeze({
    getForCard: getForCard,
    countForCard: countForCard,
    storyIdForCard: storyIdForCard,
    all: all,
    cardStories: cardStories
  });
})();
