(function () {
  "use strict";

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

  const all = [
    question(
      "heracles-twelve-labors",
      "heracles",
      "헤라클레스가 첫 번째 과업에서 맞선 동물은 무엇인가요?",
      [["rabbit", "하얀 토끼"], ["lion", "커다란 사자"], ["whale", "바다 고래"]],
      "lion",
      ["audio_required: heracles 첫 번째 과업"]
    ),
    question(
      "honggildong-righteous-thief",
      "honggildong",
      "홍길동은 빼앗은 재물을 누구에게 나누어 주었나요?",
      [["rich", "욕심 많은 부자들"], ["soldiers", "임금의 군사들"], ["poor", "가난한 사람들"]],
      "poor",
      ["audio_required: honggildong 의로운 행동"]
    ),
    question(
      "perseus-mirror-shield",
      "perseus",
      "페르세우스가 메두사에게 맞설 때 거울처럼 쓴 것은 무엇인가요?",
      [["shield", "반짝이는 방패"], ["slipper", "유리 구두"], ["goose-egg", "황금 거위 알"]],
      "shield",
      ["story/index.html: 거울 방패로 메두사와 맞선 페르세우스"]
    ),
    question(
      "jack-golden-goose",
      "jack",
      "잭은 소를 무엇과 바꾸었나요?",
      [["sword", "은빛 검"], ["beans", "마법의 콩"], ["bottle", "유리병"]],
      "beans",
      ["audio_required: jack_story 소와 콩의 교환"]
    ),
    question(
      "threepigs-brick-house",
      "threepigs",
      "둘째 돼지는 무엇으로 집을 지었나요?",
      [["ice", "얼음"], ["brick", "벽돌"], ["wood", "나무"]],
      "wood",
      ["audio_required: threepigs 둘째 돼지의 집"]
    ),
    question(
      "odysseus-cyclops-name",
      "odysseus",
      "거인이 이름을 묻자 오디세우스는 뭐라고 대답했나요?",
      [["nobody", "아무도 아니"], ["sea-king", "바다의 왕"], ["heracles", "헤라클레스"]],
      "nobody",
      ["audio_required: odyssey_cyclops 이름 계책"]
    ),
    question(
      "cinderella-pumpkin-carriage",
      "cinderella",
      "신데렐라는 왜 자정 전에 돌아와야 했나요?",
      [["gate", "성문이 닫혀서"], ["magic", "마법이 풀려서"], ["horse", "말이 졸려서"]],
      "magic",
      ["audio_required: cinderella 자정 약속"]
    ),
    question(
      "tortoisehare-winner",
      "tortoisehare",
      "토끼는 경주 도중 무엇을 했나요?",
      [["swim", "강을 헤엄쳤어요"], ["house", "집을 지었어요"], ["nap", "낮잠을 잤어요"]],
      "nap",
      ["audio_required: tortoisehare 토끼가 멈춘 이유"]
    ),
    question(
      "redhood-big-ears",
      "redhood",
      "빨간 모자는 바구니를 들고 누구의 집으로 갔나요?",
      [["grandmother", "할머니"], ["giant", "거인"], ["king", "임금님"]],
      "grandmother",
      ["audio_required: redhood_story 심부름 목적지"]
    ),
    question(
      "pinocchio-growing-nose",
      "pinocchio",
      "나무 인형 피노키오를 만든 사람은 누구인가요?",
      [["hunter", "사냥꾼"], ["geppetto", "제페토 할아버지"], ["midas", "미다스 왕"]],
      "geppetto",
      ["audio_required: pinocchio를 만든 사람"]
    ),
    question(
      "fairygodmother-pumpkin",
      "fairygodmother",
      "요정 대모가 마차로 바꾼 채소는 무엇인가요?",
      [["cabbage", "양배추"], ["carrot", "당근"], ["pumpkin", "호박"]],
      "pumpkin",
      ["story/index.html: 호박 마차", "cards/cards.json: 호박 마차"]
    ),
    question(
      "genie-three-wishes",
      "genie",
      "알라딘은 어디에서 요술 램프를 찾았나요?",
      [["cave", "동굴"], ["tree", "숲속 나무 위"], ["sea", "바닷속"]],
      "cave",
      ["audio_required: genie 램프를 찾은 곳"]
    ),
    question(
      "snowqueen-ice-palace",
      "snowqueen",
      "게르다가 얼음 궁전에서 찾은 친구 이름은 무엇인가요?",
      [["jack", "잭"], ["kai", "카이"], ["gildong", "길동"]],
      "kai",
      ["audio_required: snowqueen 게르다의 친구 이름"]
    ),
    question(
      "mermaid-lost-voice",
      "mermaid",
      "인어공주는 두 다리를 얻으려고 무엇을 내주었나요?",
      [["crown", "왕관"], ["comb", "빗"], ["voice", "목소리"]],
      "voice",
      ["audio_required: mermaid 바다 마녀와의 약속"]
    ),
    question(
      "polyphemus-sheep",
      "polyphemus",
      "오디세우스 일행은 동굴을 빠져나갈 때 무엇 아래에 숨었나요?",
      [["sheep", "양"], ["horse", "목마"], ["table", "탁자"]],
      "sheep",
      ["audio_required: odyssey_cyclops 동굴 탈출 방법"]
    ),
    question(
      "wolf-grandmother",
      "wolf",
      "늑대는 누구인 척 침대에 누웠나요?",
      [["fairy", "요정 대모"], ["grandmother", "할머니"], ["teacher", "선생님"]],
      "grandmother",
      ["audio_required: redhood_story 늑대의 변장"]
    ),
    question(
      "medusa-stone",
      "medusa",
      "메두사의 머리카락은 무엇처럼 움직였나요?",
      [["ribbon", "리본"], ["cloud", "구름"], ["snake", "뱀"]],
      "snake",
      ["audio_required: perseus 메두사의 모습"]
    ),
    question(
      "midas-golden-touch",
      "midas",
      "음식까지 황금이 되자 미다스 왕은 왜 슬퍼했나요?",
      [["cannot-eat", "먹을 수 없어서"], ["cold", "너무 추워서"], ["silence", "노래가 멈춰서"]],
      "cannot-eat",
      ["audio_required: midas 황금 손의 문제"]
    ),
    question(
      "tiger-rice-cake",
      "tiger",
      "오누이는 호랑이를 피해 무엇을 타고 하늘로 올라갔나요?",
      [["beanstalk", "콩나무"], ["rope", "하늘에서 내려온 동아줄"], ["carriage", "호박 마차"]],
      "rope",
      ["audio_required: sunmoon 하늘로 올라간 방법"]
    )
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

  function getForCard(cardOrId, rng = Math.random) {
    const cardId = cardIdFrom(cardOrId);
    const candidates = cardId ? questionsByCard[cardId] : null;
    if (!candidates || candidates.length === 0 || typeof rng !== "function") {
      return null;
    }

    const rawRoll = Number(rng());
    const roll = Number.isFinite(rawRoll)
      ? Math.max(0, Math.min(rawRoll, 0.999999999999))
      : 0;
    return cloneQuestion(candidates[Math.floor(roll * candidates.length)]);
  }

  window.CardStoryGates = Object.freeze({
    getForCard: getForCard,
    storyIdForCard: storyIdForCard,
    all: all,
    cardStories: cardStories
  });
})();

