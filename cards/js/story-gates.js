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
    tiger: "sunmoon",
    arthur: "arthur",
    bremen: "bremen",
    witch: "witch",
    beanstalkgiant: "jack_story",
    sunwukong: "sunwukong",
    zeus: "heracles",
    poseidon: "odyssey_cyclops",
    hades: "heracles",
    apollo: "midas",
    minotaur: "heracles",
    cerberus: "heracles",
    hydra: "heracles",
    sphinx: "perseus",
    achilles: "heracles",
    theseus: "heracles",
    artemis: "perseus",
    atalanta: "heracles",
    athena: "perseus",
    hermes: "perseus",
    orpheus: "perseus",
    prometheus: "heracles",
    guanyu: "game:sanguo/hulao",
    zhangfei: "game:sanguo/changban",
    zhaoyun: "game:sanguo/changban",
    zhugeliang: "game:sanguo/chushi",
    caocao: "game:sanguo/guandu",
    simayi: "game:sanguo/chushi",
    nezha: "game:sanguo/heavenpalace",
    erlangshen: "game:sanguo/heavenpalace",
    wumawang: "game:sanguo/flamemountain",
    honghaier: "game:sanguo/huoyundong",
    baigujing: "game:sanguo/baihuling",
    jaei: "family:jaei",
    taeo: "family:taeo",
    appa: "family:appa",
    eomma: "family:eomma",
    yisunshin: "legend:yisunshin",
    euljimundeok: "legend:euljimundeok",
    ganggamchan: "legend:ganggamchan",
    kwonyul: "legend:kwonyul",
    sherlockholmes: "legend:sherlockholmes",
    doctorwatson: "legend:doctorwatson",
    arsenelupin: "legend:arsenelupin",
    moriarty: "legend:moriarty",
    gearwing: "legend:gearwing",
    starshield: "legend:starshield",
    thunderguard: "legend:thunderguard",
    redknot: "legend:redknot",
    walllizard: "legend:walllizard",
    neonjumper: "legend:neonjumper",
    moonmoth: "legend:moonmoth",
    ppungdetective: "legend:ppungdetective",
    circe: "game:odyssey/circe",
    siren: "game:odyssey/sirens",
    scylla: "game:odyssey/scylla",
    helios: "game:odyssey/helios"
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
      ["audio: sunmoon 수수밭"]),

    // ── 아서왕 ──
    question("arthur-sword-stone", "arthur",
      "아서가 왕이라는 것을 모두가 알게 된 일은 무엇인가요?",
      [["stone", "바위에 박힌 검을 뽑았어요"], ["race", "달리기에서 이겼어요"], ["gold", "황금을 가장 많이 모았어요"]], "stone",
      ["audio: arthur 바위의 검"]),
    question("arthur-merlin", "arthur",
      "어린 아서를 가르친 마법사는 누구인가요?",
      [["merlin", "멀린"], ["genie", "램프의 요정"], ["witch", "과자집 마녀"]], "merlin",
      ["audio: arthur 멀린"]),
    question("arthur-round-table", "arthur",
      "아서와 기사들이 둘러앉은 탁자는 어떤 모양인가요?",
      [["round", "둥근 모양"], ["square", "네모난 모양"], ["long", "아주 긴 일자 모양"]], "round",
      ["audio: arthur 원탁"]),
    question("arthur-why-round", "arthur",
      "탁자를 둥글게 만든 까닭은 무엇인가요?",
      [["equal", "윗자리 아랫자리가 없게 하려고"], ["space", "자리를 아끼려고"], ["pretty", "그냥 예뻐서"]], "equal",
      ["audio: arthur 원탁의 뜻"]),
    question("arthur-excalibur", "arthur",
      "아서왕의 검 이름은 무엇인가요?",
      [["excalibur", "엑스칼리버"], ["ruyibang", "여의봉"], ["trident", "삼지창"]], "excalibur",
      ["audio: arthur 엑스칼리버"]),

    // ── 브레멘 음악대 ──
    question("bremen-four-animals", "bremen",
      "브레멘으로 가려던 동물은 모두 몇 마리인가요?",
      [["two", "두 마리"], ["four", "네 마리"], ["ten", "열 마리"]], "four",
      ["audio: bremen 네 마리"]),
    question("bremen-why-left", "bremen",
      "동물들이 살던 집을 떠난 까닭은 무엇인가요?",
      [["old", "나이가 들어 쫓겨날 처지였어요"], ["travel", "여행이 하고 싶었어요"], ["food", "더 맛있는 밥을 찾아서요"]], "old",
      ["audio: bremen 떠난 까닭"]),
    question("bremen-tower", "bremen",
      "동물들은 도둑을 어떻게 놀라게 했나요?",
      [["stack", "서로 올라타 한꺼번에 소리를 냈어요"], ["hide", "조용히 숨어 있었어요"], ["run", "쏜살같이 달아났어요"]], "stack",
      ["audio: bremen 합동 연주"]),
    question("bremen-top", "bremen",
      "맨 위에 올라선 동물은 누구인가요?",
      [["rooster", "수탉"], ["donkey", "당나귀"], ["cat", "고양이"]], "rooster",
      ["audio: bremen 맨 위"]),
    question("bremen-ending", "bremen",
      "동물들은 결국 어디에서 살게 되었나요?",
      [["house", "도둑이 달아난 그 집"], ["bremen", "브레멘 음악당"], ["forest", "깊은 숲속 동굴"]], "house",
      ["audio: bremen 마지막"]),

    // ── 과자집 마녀 ──
    question("witch-candy-house", "witch",
      "숲속에서 만난 집은 무엇으로 만들어져 있었나요?",
      [["candy", "과자와 사탕"], ["stone", "돌과 흙"], ["ice", "얼음과 눈"]], "candy",
      ["audio: witch 과자집"]),
    question("witch-breadcrumbs", "witch",
      "헨젤이 두 번째로 길에 뿌린 것은 무엇인가요?",
      [["crumbs", "빵 부스러기"], ["pebbles", "하얀 조약돌"], ["beans", "마법의 콩"]], "crumbs",
      ["audio: witch 빵 부스러기"]),
    question("witch-birds", "witch",
      "빵 부스러기가 사라진 까닭은 무엇인가요?",
      [["birds", "새들이 먹어 버려서"], ["rain", "비에 씻겨서"], ["wind", "바람에 날아가서"]], "birds",
      ["audio: witch 새"]),
    question("witch-fat", "witch",
      "마녀가 헨젤에게 자꾸 먹을 것을 준 까닭은 무엇인가요?",
      [["eat", "살을 찌워 잡아먹으려고"], ["kind", "마음이 착해서"], ["friend", "친구가 되고 싶어서"]], "eat",
      ["audio: witch 우리"]),
    question("witch-gretel", "witch",
      "마녀를 물리친 사람은 누구인가요?",
      [["gretel", "그레텔"], ["hansel", "헨젤"], ["father", "아버지"]], "gretel",
      ["audio: witch 그레텔의 꾀"]),

    // ── 콩나무 거인 ──
    question("giant-cloud-castle", "beanstalkgiant",
      "거인의 성은 어디에 있었나요?",
      [["cloud", "구름 위"], ["sea", "바다 밑"], ["cave", "땅속 동굴"]], "cloud",
      ["audio: jack_story 구름 위 성"]),
    question("giant-smell", "beanstalkgiant",
      "거인은 잭을 찾을 때 무엇을 하며 돌아다녔나요?",
      [["sniff", "냄새를 킁킁 맡았어요"], ["sing", "노래를 불렀어요"], ["sleep", "잠을 잤어요"]], "sniff",
      ["audio: jack_story 거인의 냄새"]),
    question("giant-goose", "beanstalkgiant",
      "거인이 기르던 거위는 무엇을 낳았나요?",
      [["golden-egg", "황금 알"], ["stone", "돌"], ["flower", "꽃"]], "golden-egg",
      ["audio: jack_story 황금 거위"]),
    question("giant-chase", "beanstalkgiant",
      "거인은 잭을 쫓아 무엇을 타고 내려왔나요?",
      [["beanstalk", "콩나무 줄기"], ["ladder", "사다리"], ["cloud", "구름"]], "beanstalk",
      ["audio: jack_story 추격"]),
    question("giant-fall", "beanstalkgiant",
      "거인은 마지막에 어떻게 되었나요?",
      [["fall", "콩나무가 쓰러지며 떨어졌어요"], ["friend", "잭과 친구가 되었어요"], ["sleep", "성에서 잠들었어요"]], "fall",
      ["audio: jack_story 마지막"]),

    // ── 손오공 ──
    question("wukong-born-stone", "sunwukong",
      "손오공은 무엇에서 태어났나요?",
      [["stone", "커다란 바위"], ["egg", "새의 알"], ["lotus", "연꽃"]], "stone",
      ["audio: sunwukong 돌원숭이"]),
    question("wukong-ruyibang", "sunwukong",
      "손오공은 여의봉을 어디에서 얻었나요?",
      [["dragon-palace", "바다 밑 용궁"], ["mountain", "화과산 꼭대기"], ["heaven", "하늘 궁전"]], "dragon-palace",
      ["audio: sunwukong 여의봉"]),
    question("wukong-cloud", "sunwukong",
      "근두운을 타면 한 번에 얼마나 갈 수 있나요?",
      [["far", "십만팔천 리"], ["ten", "십 리"], ["hundred", "백 리"]], "far",
      ["audio: sunwukong 근두운"]),
    question("wukong-transform", "sunwukong",
      "손오공이 부릴 수 있는 변신은 몇 가지인가요?",
      [["seventytwo", "일흔두 가지"], ["three", "세 가지"], ["thousand", "천 가지"]], "seventytwo",
      ["audio: sunwukong 칠십이변"]),
    question("wukong-punished", "sunwukong",
      "하늘 궁전을 뒤집어 놓은 손오공은 어떤 벌을 받았나요?",
      [["mountain", "산 아래 오백 년 동안 갇혔어요"], ["jail", "감옥에서 하루를 보냈어요"], ["nothing", "아무 벌도 받지 않았어요"]], "mountain",
      ["audio: sunwukong 오행산"])
  ];

  // 동양 확장: 손오공의 기존 오디오 문항 5개와 아래 게임 전장 문항 55개로 총 60개.
  // 실제 전장의 mission/lesson/scene_intro/real/fiction만 묻고, 새 오디오가 있는 것처럼 꾸미지 않는다.
  const eastQuestionSets = {
    guanyu: [
      ["flags", "호로관 전투에서 되찾아야 하는 것은 무엇인가요?", [["flags", "연합군 깃발"], ["fans", "부채"], ["peaches", "복숭아"]], "flags", "sanguo/data/gamedata.json#ACTION_STAGES.hulao.mission"],
      ["count", "호로관에서 되찾아야 하는 깃발은 모두 몇 개인가요?", [["two", "두 개"], ["four", "네 개"], ["eight", "여덟 개"]], "four", "sanguo/data/gamedata.json#ACTION_STAGES.hulao.required"],
      ["boss", "호로관을 지키는 동탁군의 선봉은 누구인가요?", [["huaxiong", "화웅"], ["simayi", "사마의"], ["wumawang", "우마왕"]], "huaxiong", "sanguo/data/gamedata.json#ACTION_STAGES.hulao.bossName"],
      ["alliance", "반동탁연합이 힘을 합치기 어려웠던 까닭은 무엇인가요?", [["different", "서로 생각이 달랐기 때문에"], ["sleep", "모두 잠들었기 때문에"], ["rain", "비가 왔기 때문에"]], "different", "sanguo/data/gamedata.json#ACTION_STAGES.hulao.lesson"],
      ["trust", "여러 사람이 힘을 합칠 때 필요한 것은 무엇인가요?", [["trust", "공동 목표와 신뢰"], ["gold", "많은 황금"], ["magic", "마법 지팡이"]], "trust", "sanguo/data/gamedata.json#ACTION_STAGES.hulao.lesson"]
    ],
    zhangfei: [
      ["people", "장판 전투에서 먼저 도와야 하는 사람은 몇 명인가요?", [["two", "두 명"], ["four", "네 명"], ["ten", "열 명"]], "four", "sanguo/data/gamedata.json#ACTION_STAGES.changban.required"],
      ["goal", "도움이 필요한 사람들을 어디까지 지켜야 하나요?", [["bridge", "안전한 다리"], ["palace", "하늘 궁전"], ["cave", "동굴"]], "bridge", "sanguo/data/gamedata.json#ACTION_STAGES.changban.goalName"],
      ["courage", "장판 이야기에서 진짜 용기는 무엇을 위해 쓰는 힘인가요?", [["protect", "누군가를 안전하게 지키기 위해"], ["boast", "강함을 자랑하기 위해"], ["treasure", "보물을 모으기 위해"]], "protect", "sanguo/data/gamedata.json#ACTION_STAGES.changban.midTip"],
      ["boss", "장판의 길을 막는 호표기 대장은 누구인가요?", [["caochun", "조순"], ["huaxiong", "화웅"], ["aoguang", "오광"]], "caochun", "sanguo/data/gamedata.json#ACTION_STAGES.changban.bossName"],
      ["lesson", "장판의 구출 이야기가 가르쳐 주는 것은 무엇인가요?", [["responsibility", "보호할 사람을 위한 책임"], ["speed", "혼자 빨리 달리기"], ["shouting", "큰 소리만 내기"]], "responsibility", "sanguo/data/gamedata.json#ACTION_STAGES.changban.lesson"]
    ],
    zhaoyun: [
      ["mission", "조운의 장판 임무는 무엇인가요?", [["rescue", "도움이 필요한 사람을 구하기"], ["fan", "부채 찾기"], ["music", "악기 연주하기"]], "rescue", "sanguo/data/gamedata.json#ACTION_STAGES.changban.mission"],
      ["item", "장판 전장에서 모으는 표시는 무엇을 뜻하나요?", [["protected", "보호한 사람"], ["grain", "군량"], ["rings", "건곤권"]], "protected", "sanguo/data/gamedata.json#ACTION_STAGES.changban.itemName"],
      ["bridge", "구출한 사람들과 향하는 곳은 어디인가요?", [["safe", "안전한 다리"], ["fire", "화염산"], ["sea", "바다 밑 용궁"]], "safe", "sanguo/data/gamedata.json#ACTION_STAGES.changban.goalName"],
      ["meaning", "조운의 강함이 빛난 까닭은 무엇인가요?", [["protect", "사람을 보호하는 데 썼기 때문에"], ["crown", "왕관이 있었기 때문에"], ["alone", "혼자 자랑했기 때문에"]], "protect", "sanguo/data/gamedata.json#ACTION_STAGES.changban.lesson"],
      ["enemy", "장판에서 조운을 쫓는 부대는 무엇인가요?", [["tiger", "호표기"], ["navy", "수군"], ["monkeys", "원숭이 군대"]], "tiger", "sanguo/data/gamedata.json#ACTION_STAGES.changban.bossName"]
    ],
    zhugeliang: [
      ["carts", "출사표 전장에서 지켜야 하는 보급 수레는 몇 개인가요?", [["three", "세 개"], ["five", "다섯 개"], ["nine", "아홉 개"]], "five", "sanguo/data/gamedata.json#ACTION_STAGES.chushi.required"],
      ["supplies", "북벌을 오래 이어 가려면 무엇을 꾸준히 준비해야 하나요?", [["roads", "길과 식량과 사람"], ["magic", "마법 주문"], ["gold", "황금 왕관"]], "roads", "sanguo/data/gamedata.json#ACTION_STAGES.chushi.lesson"],
      ["goal", "보급 수레를 어디까지 옮겨야 하나요?", [["camp", "북벌군의 진지"], ["bridge", "장판의 다리"], ["palace", "용궁"]], "camp", "sanguo/data/gamedata.json#ACTION_STAGES.chushi.goalName"],
      ["year", "출사표 전장의 시대 표시는 몇 년인가요?", [["190", "190년"], ["208", "208년"], ["227", "227년"]], "227", "sanguo/data/gamedata.json#ACTION_STAGES.chushi.year"],
      ["skill", "출사표 이야기가 말하는 진짜 실력은 무엇인가요?", [["prepare", "준비를 오래 이어 가는 힘"], ["rush", "무조건 서두르는 힘"], ["luck", "동전 운만 믿는 힘"]], "prepare", "sanguo/data/gamedata.json#ACTION_STAGES.chushi.midTip"]
    ],
    caocao: [
      ["scrolls", "관도대전에서 모아야 하는 정보 죽간은 몇 개인가요?", [["two", "두 개"], ["four", "네 개"], ["seven", "일곱 개"]], "four", "sanguo/data/gamedata.json#ACTION_STAGES.guandu.required"],
      ["target", "정보 죽간으로 찾아내는 곳은 어디인가요?", [["wuchao", "오소 군량창"], ["hulao", "호로관"], ["heaven", "천궁"]], "wuchao", "sanguo/data/gamedata.json#ACTION_STAGES.guandu.mission"],
      ["important", "관도대전에서 병사의 수만큼 중요했던 것은 무엇인가요?", [["info", "정보와 보급"], ["songs", "노래와 춤"], ["weather", "눈과 비"]], "info", "sanguo/data/gamedata.json#ACTION_STAGES.guandu.lesson"],
      ["boss", "오소 군량창을 지키는 장수는 누구인가요?", [["chunyuqiong", "순우경"], ["caochun", "조순"], ["erlang", "이랑진군"]], "chunyuqiong", "sanguo/data/gamedata.json#ACTION_STAGES.guandu.bossName"],
      ["use", "좋은 정보가 힘을 잃지 않으려면 어떻게 해야 하나요?", [["quick", "확인하고 빠르게 활용해요"], ["hide", "아무에게도 쓰지 않아요"], ["forget", "곧바로 잊어요"]], "quick", "sanguo/data/gamedata.json#ACTION_STAGES.guandu.midTip"]
    ],
    simayi: [
      ["enemy", "출사표 전장에서 북벌군을 기다리는 위군 도독은 누구인가요?", [["simayi", "사마의"], ["guanyu", "관우"], ["nezha", "나타"]], "simayi", "sanguo/data/gamedata.json#ACTION_STAGES.chushi.bossName"],
      ["line", "사마의가 전장에서 강조하는 태도는 무엇인가요?", [["wait", "서두르지 않기"], ["shout", "계속 소리치기"], ["sleep", "아무것도 하지 않기"]], "wait", "sanguo/data/gamedata.json#ACTION_STAGES.chushi.bossLine"],
      ["wagons", "사마의에게 막히지 않도록 지켜야 하는 것은 무엇인가요?", [["wagons", "보급 수레"], ["apples", "황금 사과"], ["slipper", "유리 구두"]], "wagons", "sanguo/data/gamedata.json#ACTION_STAGES.chushi.mission"],
      ["count", "출사표 전장의 보급 수레는 모두 몇 개인가요?", [["one", "한 개"], ["five", "다섯 개"], ["twelve", "열두 개"]], "five", "sanguo/data/gamedata.json#ACTION_STAGES.chushi.required"],
      ["preparation", "오래 준비하는 힘이 필요한 까닭은 무엇인가요?", [["campaign", "긴 북벌을 이어 가기 위해"], ["race", "달리기 경주를 위해"], ["concert", "연주회를 위해"]], "campaign", "sanguo/data/gamedata.json#ACTION_STAGES.chushi.lesson"]
    ],
    nezha: [
      ["place", "천궁대소동이 벌어진 곳은 어디인가요?", [["heaven", "하늘 궁전"], ["forest", "밤 숲"], ["sea", "바닷가"]], "heaven", "sanguo/src/data/works.js#WORK_STAGES.heavenpalace.title"],
      ["name", "손오공이 스스로 지은 높은 이름은 무엇인가요?", [["greatsage", "제천대성"], ["dragonking", "용왕"], ["bullking", "우마왕"]], "greatsage", "sanguo/src/data/works.js#WORK_STAGES.heavenpalace.scene_intro"],
      ["army", "손오공의 소동을 막으려고 몰려온 것은 누구인가요?", [["heavenly", "십만 천병"], ["musicians", "음악대"], ["knights", "원탁의 기사"]], "heavenly", "sanguo/src/data/works.js#WORK_STAGES.heavenpalace.scene_intro"],
      ["punishment", "천궁대소동 뒤 손오공은 얼마나 산 아래 갇혔나요?", [["five", "오 년"], ["fifty", "오십 년"], ["fivehundred", "오백 년"]], "fivehundred", "sanguo/src/data/works.js#WORK_STAGES.heavenpalace.lesson"],
      ["lesson", "천궁대소동이 알려 주는 것은 무엇인가요?", [["rules", "힘이 세도 마음대로 하면 안 돼요"], ["strong", "힘이 세면 무엇이든 해도 돼요"], ["alone", "친구는 필요 없어요"]], "rules", "sanguo/src/data/works.js#WORK_STAGES.heavenpalace.lesson"]
    ],
    erlangshen: [
      ["boss", "천궁에서 손오공과 맞서는 신장은 누구인가요?", [["erlang", "이랑진군"], ["midas", "미다스 왕"], ["zhangfei", "장비"]], "erlang", "sanguo/src/data/works.js#WORK_STAGES.heavenpalace.bossName"],
      ["mission", "천궁대소동 전장의 임무는 무엇인가요?", [["cross", "하늘 병사를 물리치고 천궁을 가로질러요"], ["build", "벽돌집을 지어요"], ["sing", "노래로 문을 열어요"]], "cross", "sanguo/src/data/works.js#WORK_STAGES.heavenpalace.mission"],
      ["origin", "손오공 이야기에는 어느 나라의 원숭이 신 이야기도 섞였나요?", [["india", "인도"], ["greece", "그리스"], ["egypt", "이집트"]], "india", "sanguo/src/data/works.js#WORK_STAGES.heavenpalace.real"],
      ["history", "손오공은 실제 역사에 있었던 인물인가요?", [["no", "아니요, 여러 신화와 민담이 섞인 인물이에요"], ["yes", "네, 황제가 남긴 기록이 있어요"], ["diary", "네, 손오공의 일기가 있어요"]], "no", "sanguo/src/data/works.js#WORK_STAGES.heavenpalace.real"],
      ["feeling", "서유기는 손오공을 하늘에 맞서는 인물로 그려 어떤 느낌을 주나요?", [["thrill", "통쾌함"], ["bored", "지루함"], ["sleepy", "졸림"]], "thrill", "sanguo/src/data/works.js#WORK_STAGES.heavenpalace.fiction"]
    ],
    wumawang: [
      ["fan", "화염산의 불을 끄려면 무엇이 필요한가요?", [["fan", "파초선"], ["sword", "은빛 검"], ["slipper", "유리 구두"]], "fan", "sanguo/src/data/works.js#WORK_STAGES.flamemountain.scene_intro"],
      ["wife", "파초선을 가진 나찰녀는 누구의 아내인가요?", [["bull", "우마왕"], ["dragon", "용왕"], ["midas", "미다스 왕"]], "bull", "sanguo/src/data/works.js#WORK_STAGES.flamemountain.scene_intro"],
      ["distance", "이야기 속 화염산의 불바다는 얼마나 이어지나요?", [["eight", "팔 리"], ["eighty", "팔십 리"], ["eighthundred", "팔백 리"]], "eighthundred", "sanguo/src/data/works.js#WORK_STAGES.flamemountain.scene_intro"],
      ["real", "실제 현장 스님이 넘은 곳은 어디인가요?", [["desert", "사막과 산맥"], ["firesea", "진짜 불바다"], ["cloud", "구름 궁전"]], "desert", "sanguo/src/data/works.js#WORK_STAGES.flamemountain.real"],
      ["help", "손오공이 파초선을 얻으며 배운 것은 무엇인가요?", [["help", "혼자 못 넘는 벽에는 여러 사람의 도움이 필요해요"], ["alone", "항상 혼자 해결해야 해요"], ["giveup", "어려우면 바로 포기해요"]], "help", "sanguo/src/data/works.js#WORK_STAGES.flamemountain.lesson"]
    ],
    honghaier: [
      ["parents", "홍해아의 부모는 누구인가요?", [["bull-raksha", "우마왕과 나찰녀"], ["midas-queen", "미다스 왕과 왕비"], ["zeus-athena", "제우스와 아테나"]], "bull-raksha", "sanguo/src/data/works.js#WORK_STAGES.huoyundong.scene_intro"],
      ["fire", "홍해아가 뿜는 특별한 불의 이름은 무엇인가요?", [["samadhi", "삼매진화"], ["campfire", "모닥불"], ["starlight", "별빛 불꽃"]], "samadhi", "sanguo/src/data/works.js#WORK_STAGES.huoyundong.scene_intro"],
      ["water", "삼매진화에 물을 뿌리면 어떻게 되나요?", [["notout", "꺼지지 않아요"], ["out", "바로 꺼져요"], ["ice", "얼음이 돼요"]], "notout", "sanguo/src/data/works.js#WORK_STAGES.huoyundong.scene_intro"],
      ["helper", "홍해아를 막을 때 손오공을 도운 분은 누구인가요?", [["guanyin", "관음보살"], ["witch", "과자집 마녀"], ["hermes", "헤르메스"]], "guanyin", "sanguo/src/data/works.js#WORK_STAGES.huoyundong.scene_intro"],
      ["courage", "혼자 이기기 어려울 때 필요한 용기는 무엇인가요?", [["ask", "도움을 청하는 용기"], ["hide", "계속 숨는 용기"], ["pretend", "모르는 척하는 용기"]], "ask", "sanguo/src/data/works.js#WORK_STAGES.huoyundong.lesson"]
    ],
    baigujing: [
      ["count", "백골정은 모두 몇 번 모습을 바꿔 다가왔나요?", [["one", "한 번"], ["three", "세 번"], ["ten", "열 번"]], "three", "sanguo/src/data/works.js#WORK_STAGES.baihuling.scene_intro"],
      ["forms", "백골정이 바꾼 세 모습은 무엇인가요?", [["people", "처녀, 할머니, 할아버지"], ["animals", "토끼, 거북, 호랑이"], ["gods", "제우스, 하데스, 포세이돈"]], "people", "sanguo/src/data/works.js#WORK_STAGES.baihuling.scene_intro"],
      ["recognize", "백골정의 진짜 모습을 알아본 사람은 누구인가요?", [["wukong", "손오공"], ["bajie", "저팔계"], ["tangsanzang", "삼장"]], "wukong", "sanguo/src/data/works.js#WORK_STAGES.baihuling.scene_intro"],
      ["misunderstood", "삼장은 백골정을 알아본 손오공에게 어떻게 했나요?", [["scold", "오히려 나무라고 쫓아냈어요"], ["praise", "바로 칭찬했어요"], ["crown", "왕관을 주었어요"]], "scold", "sanguo/src/data/works.js#WORK_STAGES.baihuling.scene_intro"],
      ["return", "쫓겨난 손오공은 나중에 어떻게 했나요?", [["return", "다시 돌아와 스승을 구했어요"], ["leave", "영원히 돌아오지 않았어요"], ["sleep", "동굴에서 잠만 잤어요"]], "return", "sanguo/src/data/works.js#WORK_STAGES.baihuling.lesson"]
    ]
  };
  Object.keys(eastQuestionSets).forEach(function (cardId) {
    eastQuestionSets[cardId].forEach(function (entry) {
      all.push(question(cardId + "-" + entry[0], cardId, entry[1], entry[2], entry[3], [entry[4]]));
    });
  });

  // G1~G4: 기존 검수 문항을 재사용한다. 새 음원을 검증한 것처럼 출처를 만들지 않는다.
  // 문항 id와 최근 출제 기록은 카드별로 독립; 복수 해금 카드는 첫 이야기에서 출제.
  const greekQuestionSources = {
    zeus: ["heracles-twelve-labors", "heracles-torch-helper", "heracles-stable-river", "heracles-sky-giant", "heracles-labor-count"],
    poseidon: ["polyphemus-father", "polyphemus-sheep", "polyphemus-eye-count", "polyphemus-door", "odysseus-cyclops-name"],
    hades: ["heracles-twelve-labors", "heracles-hydra-heads", "heracles-torch-helper", "heracles-stable-river", "heracles-labor-count"],
    apollo: ["midas-golden-touch", "midas-spirit", "midas-daughter", "midas-river", "midas-first-gold"],
    minotaur: ["heracles-twelve-labors", "heracles-hydra-heads", "heracles-torch-helper", "heracles-stable-river", "heracles-sky-giant"],
    cerberus: ["heracles-labor-count", "heracles-twelve-labors", "heracles-hydra-heads", "heracles-stable-river", "heracles-sky-giant"],
    hydra: ["heracles-hydra-heads", "heracles-torch-helper", "heracles-twelve-labors", "heracles-stable-river", "heracles-labor-count"],
    sphinx: ["perseus-mirror-shield", "perseus-winged-sandals", "perseus-three-hags", "perseus-princess", "perseus-sea-monster"],
    achilles: ["heracles-twelve-labors", "heracles-hydra-heads", "heracles-torch-helper", "heracles-sky-giant", "heracles-labor-count"],
    theseus: ["heracles-twelve-labors", "heracles-hydra-heads", "heracles-stable-river", "heracles-sky-giant", "heracles-labor-count"],
    artemis: ["perseus-mirror-shield", "perseus-winged-sandals", "perseus-three-hags", "perseus-princess", "perseus-sea-monster"],
    atalanta: ["heracles-twelve-labors", "heracles-torch-helper", "heracles-stable-river", "heracles-sky-giant", "heracles-labor-count"],
    athena: ["perseus-mirror-shield", "perseus-winged-sandals", "perseus-three-hags", "perseus-princess", "perseus-sea-monster"],
    hermes: ["perseus-winged-sandals", "perseus-mirror-shield", "perseus-three-hags", "perseus-princess", "perseus-sea-monster"],
    orpheus: ["perseus-princess", "perseus-sea-monster", "perseus-mirror-shield", "perseus-winged-sandals", "perseus-three-hags"],
    prometheus: ["heracles-twelve-labors", "heracles-hydra-heads", "heracles-torch-helper", "heracles-stable-river", "heracles-labor-count"]
  };
  Object.keys(greekQuestionSources).forEach(function (cardId) {
    greekQuestionSources[cardId].forEach(function (sourceId) {
      const original = all.find(function (item) { return item.id === sourceId; });
      if (!original || original.storyId !== cardStories[cardId]) {
        throw new Error("Greek question story mismatch: " + sourceId);
      }
      all.push(question(cardId + "-" + sourceId, cardId, original.prompt,
        original.choices.map(function (choice) { return [choice.id, choice.text]; }),
        original.correctChoiceId, ["cards/js/story-gates.js#" + sourceId]));
    });
  });

  [
    question("jaei-favorite-game", "jaei",
      "재이가 제일 좋아하는 게임은 무엇인가요?",
      [["vr", "VR 게임"], ["board", "보드 게임"], ["puzzle", "퍼즐 게임"]], "vr",
      ["가족 확인 2026-09-09"]),
    question("jaei-biggest-move", "jaei",
      "재이 카드에서 별사탕 3개가 드는 제일 센 기술은 무엇인가요?",
      [["fart", "참았던 방귀"], ["burp", "트림 폭탄"], ["booger", "코딱지 날리기"]], "fart",
      ["카드: 재이"]),
    question("jaei-pajama", "jaei",
      "재이 카드에서 재이가 입고 있는 옷은 무엇인가요?",
      [["pajama", "분홍 잠옷"], ["dobok", "태권도복"], ["dress", "치타무늬 원피스"]], "pajama",
      ["가족 확인 2026-09-09"]),
    question("jaei-passive-name", "jaei",
      "재이 카드의 특성 이름은 무엇인가요?",
      [["knows", "누나는 다 알아"], ["hide", "누나 뒤에 숨기"], ["eye", "엄마 눈썰미"]], "knows",
      ["카드: 재이"]),
    question("jaei-burp-effect", "jaei",
      "재이의 「트림 폭탄」을 맞으면 상대는 어떻게 되나요?",
      [["weak", "다음 기술의 피해가 줄어요"], ["skip", "다음 턴을 쉬어요"], ["star", "별사탕을 빼앗겨요"]], "weak",
      ["카드: 재이"]),

    question("taeo-favorite-heroes", "taeo",
      "태오가 제일 좋아하는 영웅들은 누구인가요?",
      [["avengers", "어벤져스"], ["sanguo", "삼국지 장수들"], ["princess", "공주님들"]], "avengers",
      ["가족 확인 2026-09-09"]),
    question("taeo-stack-move", "taeo",
      "태오의 「연속 방귀」는 쓸 때마다 어떻게 되나요?",
      [["stronger", "피해가 10씩 늘어요"], ["cheaper", "별사탕이 덜 들어요"], ["same", "언제나 똑같아요"]], "stronger",
      ["카드: 태오"]),
    question("taeo-uniform", "taeo",
      "태오 카드에서 태오가 입고 있는 옷은 무엇인가요?",
      [["dobok", "태권도복"], ["pajama", "잠옷"], ["uniform", "학교 교복"]], "dobok",
      ["가족 확인 2026-09-09"]),
    question("taeo-belt", "taeo",
      "태오가 태권도복에 두른 띠는 무슨 색인가요?",
      [["black", "검은띠"], ["yellow", "노란띠"], ["white", "흰띠"]], "black",
      ["가족 확인 2026-09-09"]),
    question("taeo-first-move", "taeo",
      "태오가 별사탕 1개로 쓰는 기술은 무엇인가요?",
      [["feet", "발냄새 공격"], ["big", "대왕 방귀"], ["row", "연속 방귀"]], "feet",
      ["카드: 태오"]),

    question("appa-tickle-effect", "appa",
      "아빠의 「간지럽히기」를 맞으면 상대는 어떻게 되나요?",
      [["skip", "다음 턴에 기술을 못 써요"], ["weak", "피해가 줄어요"], ["heal", "체력이 회복돼요"]], "skip",
      ["카드: 아빠"]),
    question("appa-shirt-color", "appa",
      "아빠가 입은 셔츠는 무슨 색인가요?",
      [["yellow", "노란색"], ["grey", "회색"], ["blue", "파란색"]], "yellow",
      ["가족 확인 2026-09-09"]),
    question("appa-passive-when", "appa",
      "아빠의 특성은 언제 힘을 내나요?",
      [["half", "체력이 절반 아래일 때"], ["first", "판이 시작할 때"], ["always", "언제나"]], "half",
      ["카드: 아빠"]),
    question("appa-first-move", "appa",
      "아빠가 별사탕 1개로 쓰는 기술은 무엇인가요?",
      [["shoulder", "목말 태우기"], ["tickle", "간지럽히기"], ["clean", "정리정돈"]], "shoulder",
      ["카드: 아빠"]),
    question("appa-type", "appa",
      "아빠 카드는 무슨 타입인가요?",
      [["brave", "용기"], ["wise", "지혜"], ["magic", "마법"]], "brave",
      ["카드: 아빠"]),

    question("eomma-word-effect", "eomma",
      "「엄마의 한마디」를 들으면 상대는 어떻게 되나요?",
      [["skip", "다음 턴에 기술을 못 써요"], ["star", "별사탕을 빼앗겨요"], ["nothing", "아무 일도 없어요"]], "skip",
      ["카드: 엄마"]),
    question("eomma-dress-pattern", "eomma",
      "엄마가 입은 원피스는 어떤 무늬인가요?",
      [["cheetah", "치타무늬"], ["dot", "물방울무늬"], ["stripe", "줄무늬"]], "cheetah",
      ["가족 확인 2026-09-09"]),
    question("eomma-passive-name", "eomma",
      "엄마 카드의 특성 이름은 무엇인가요?",
      [["eye", "엄마 눈썰미"], ["knows", "누나는 다 알아"], ["work", "퇴근 후 힘내기"]], "eye",
      ["카드: 엄마"]),
    question("eomma-second-move", "eomma",
      "엄마가 별사탕 2개로 쓰는 기술은 무엇인가요?",
      [["clean", "정리정돈"], ["stop", "이제 그만!"], ["word", "엄마의 한마디"]], "clean",
      ["카드: 엄마"]),
    question("eomma-type", "eomma",
      "엄마 카드는 무슨 타입인가요?",
      [["magic", "마법"], ["monster", "괴물"], ["brave", "용기"]], "magic",
      ["카드: 엄마"])
  ].forEach(function (item) { all.push(item); });

  // 오디세이 확장 문항은 각 스테이지 시작 그림책의 문장만 사용한다.
  [
    question("circe-friends", "circe", "키르케의 장난으로 친구들은 무엇이 되었나요?",
      [["pig", "귀여운 돼지"], ["bird", "작은 새"], ["stone", "돌 조각"]], "pig", ["odyssey:circe/pigFriends"]),
    question("circe-helper", "circe", "오디세우스에게 몰리 약초를 준 이는 누구인가요?",
      [["hermes", "헤르메스"], ["zeus", "제우스"], ["midas", "미다스"]], "hermes", ["odyssey:circe/moly"]),
    question("circe-solution", "circe", "키르케의 마법은 무엇으로 풀었나요?",
      [["wisdom", "지혜와 좋은 생각"], ["strength", "힘센 주먹"], ["race", "달리기"]], "wisdom", ["odyssey:circe/moly"]),
    question("circe-game", "circe", "키르케의 정원에서 무엇을 뿌려 친구를 찾나요?",
      [["moly", "몰리 약초"], ["sand", "모래"], ["snow", "눈가루"]], "moly", ["odyssey:circe/game"]),
    question("circe-place", "circe", "친구들이 맛있는 냄새를 따라 들어간 곳은 어디인가요?",
      [["palace", "섬의 궁전"], ["cave", "바닷속 동굴"], ["school", "마법 학교"]], "palace", ["odyssey:circe/circeIsland"]),

    question("siren-ears", "siren", "친구들은 세이렌의 노래를 피하려고 귀를 무엇으로 막았나요?",
      [["wax", "부드러운 밀랍"], ["leaves", "나뭇잎"], ["shell", "조개껍데기"]], "wax", ["odyssey:sirens/waxAndRope"]),
    question("siren-odysseus", "siren", "오디세우스는 노래를 들을 때 어디에 안전히 기대었나요?",
      [["mast", "배의 돛대"], ["rock", "섬의 바위"], ["cloud", "구름"]], "mast", ["odyssey:sirens/waxAndRope"]),
    question("siren-danger", "siren", "세이렌의 노래를 따라가면 배는 어떻게 될 수 있나요?",
      [["lost", "길을 잃을 수 있어요"], ["gold", "황금으로 변해요"], ["tiny", "아주 작아져요"]], "lost", ["odyssey:sirens/sirenIsland"]),
    question("siren-shield", "siren", "노래의 둥근 음파가 반짝일 때 무엇을 펴나요?",
      [["shield", "지혜 방패"], ["sail", "새 돛"], ["umbrella", "우산"]], "shield", ["odyssey:sirens/songWave"]),
    question("siren-way", "siren", "오디세우스 일행은 세이렌을 무엇으로 이겨 냈나요?",
      [["prepare", "미리 준비해서"], ["shout", "더 크게 소리쳐서"], ["fight", "싸워서"]], "prepare", ["odyssey:sirens/waxAndRope"]),

    question("scylla-road", "scylla", "스킬라가 있던 물길은 어디에 있었나요?",
      [["cliffs", "두 절벽 사이"], ["forest", "깊은 숲속"], ["sky", "구름 위"]], "cliffs", ["odyssey:scylla/narrowStrait"]),
    question("scylla-place", "scylla", "스킬라는 어디에서 빼꼼 보았나요?",
      [["above", "절벽 위"], ["below", "배 밑"], ["mast", "돛대 위"]], "above", ["odyssey:scylla/scyllaPeek"]),
    question("scylla-other", "scylla", "좁은 해협 아래에서 빙글빙글 돈 것은 무엇인가요?",
      [["whirlpool", "카립디스의 소용돌이"], ["wheel", "태양 마차 바퀴"], ["beans", "콩나무"]], "whirlpool", ["odyssey:scylla/whirlpoolChoice"]),
    question("scylla-warning", "scylla", "스킬라가 팔을 뻗기 전에 무엇이 알려 주나요?",
      [["starlight", "별빛"], ["bell", "종소리"], ["pig", "돼지"]], "starlight", ["odyssey:scylla/scyllaPeek"]),
    question("scylla-safe", "scylla", "소용돌이를 지날 때 찾아야 하는 길은 어디인가요?",
      [["middle", "가운데의 잔잔한 길"], ["edge", "절벽 바로 옆"], ["under", "바닷속"]], "middle", ["odyssey:scylla/whirlpoolChoice"]),

    question("helios-cattle", "helios", "태양신의 섬에서 풀을 뜯던 것은 무엇인가요?",
      [["cattle", "황금빛 소들"], ["sheep", "하얀 양들"], ["horses", "날개 달린 말들"]], "cattle", ["odyssey:helios/sunPasture"]),
    question("helios-rule", "helios", "헬리오스의 소들은 어떻게 해야 하나요?",
      [["leave", "건드리지 않아야 해요"], ["ride", "타고 달려야 해요"], ["paint", "색칠해야 해요"]], "leave", ["odyssey:helios/sunPasture"]),
    question("helios-hungry", "helios", "친구들이 소 쪽으로 간 까닭은 무엇인가요?",
      [["hungry", "너무 배가 고파서"], ["cold", "너무 추워서"], ["lost", "길을 잃어서"]], "hungry", ["odyssey:helios/hungryCrew"]),
    question("helios-call", "helios", "오디세우스는 무엇을 나눠 먹자며 친구를 불렀나요?",
      [["bread", "빵"], ["apple", "황금 사과"], ["ricecake", "떡"]], "bread", ["odyssey:helios/campfire"]),
    question("helios-goal", "helios", "친구들을 어디까지 데려가면 안전한가요?",
      [["fire", "모닥불"], ["cave", "동굴"], ["palace", "궁전"]], "fire", ["odyssey:helios/campfire"])
  ].forEach(function (item) { all.push(item); });

  // 전설 확장 문항은 음원이 없는 카드 자체의 공개 정보만 묻는다.
  // 실제 카드 데이터와 동일한 다섯 항목을 고정해, 보지 않은 역사 사실을 추측하게 하지 않는다.
  const legendFacts = {
    yisunshin: ["이순신", "용기", "물", "오행 상성 추가 피해를 받지 않아요", "학익진", "거북선 돌진"],
    euljimundeok: ["을지문덕", "지혜", "물", "처음 받는 공격을 피해요", "살수의 물길", "유인 작전"],
    ganggamchan: ["강감찬", "지혜", "땅", "오행 상성 추가 피해를 받지 않아요", "별을 읽는 눈", "귀주대첩"],
    kwonyul: ["권율", "용기", "불", "체력이 절반 아래면 공격 피해가 늘어요", "행주 돌팔매", "화차 일제사격"],
    sherlockholmes: ["셜록 홈즈", "지혜", "금속", "상대의 특성을 무효로 만들어요", "단서 찾기", "완벽한 추리"],
    doctorwatson: ["왓슨 박사", "용기", "땅", "오행 상성 추가 피해를 받지 않아요", "의사의 진단", "믿음직한 동행"],
    arsenelupin: ["아르센 뤼팽", "마법", "나무", "처음 받는 공격을 막아요", "변장술", "달빛 탈출"],
    moriarty: ["모리어티", "괴물", "불", "체력이 절반 아래면 공격 피해가 늘어요", "함정 설계", "최후의 수"],
    gearwing: ["기어윙", "마법", "금속", "처음 받는 공격을 막아요", "톱니깃 발사", "기어 폭풍"],
    starshield: ["별방패 대장", "용기", "땅", "받는 피해가 10 줄어요", "빛방패 밀기", "모두를 지켜"],
    thunderguard: ["천둥북 수호자", "마법", "불", "체력이 절반 아래면 공격 피해가 늘어요", "구름북 울림", "천둥 장단"],
    redknot: ["붉은매듭 첩보원", "지혜", "금속", "동전 앞면이면 공격을 피해요", "매듭 표창", "그림자 포획"],
    walllizard: ["벽달림 도마뱀", "괴물", "나무", "받는 피해가 10 줄어요", "붙착 손바닥", "꼬리 회전"],
    neonjumper: ["네온도약자", "마법", "금속", "처음 받는 공격을 막아요", "네온 도약", "차원 발차기"],
    moonmoth: ["달빛 나방수호자", "괴물", "물", "오행 상성 추가 피해를 받지 않아요", "은빛 가루", "초승 날개"],
    ppungdetective: ["뿡경감", "괴물", "나무", "오행 상성 추가 피해를 받지 않아요", "냄새 단서", "범인은 너야"]
  };
  Object.keys(legendFacts).forEach(function (cardId) {
    const fact = legendFacts[cardId];
    const ref = ["카드: " + fact[0]];
    [
      question(cardId + "-type", cardId, fact[0] + " 카드는 무슨 타입인가요?",
        [["correct", fact[1]], ["other1", fact[1] === "마법" ? "용기" : "마법"], ["other2", fact[1] === "지혜" ? "괴물" : "지혜"]], "correct", ref),
      question(cardId + "-element", cardId, fact[0] + " 카드의 오행 속성은 무엇인가요?",
        [["correct", fact[2]], ["other1", fact[2] === "물" ? "불" : "물"], ["other2", fact[2] === "금속" ? "나무" : "금속"]], "correct", ref),
      question(cardId + "-passive", cardId, fact[0] + " 카드의 특성은 무엇을 하나요?",
        [["correct", fact[3]], ["other1", "매턴 체력을 모두 회복해요"], ["other2", "언제나 공격이 두 배가 돼요"]], "correct", ref),
      question(cardId + "-first", cardId, fact[0] + " 카드가 별사탕 1개로 쓰는 기술은 무엇인가요?",
        [["correct", fact[4]], ["other1", fact[5]], ["other2", "방어하기"]], "correct", ref),
      question(cardId + "-strong", cardId, fact[0] + " 카드의 대표 기술은 무엇인가요?",
        [["correct", fact[5]], ["other1", fact[4]], ["other2", "별사탕 모으기"]], "correct", ref)
    ].forEach(function (item) { all.push(item); });
  });

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
