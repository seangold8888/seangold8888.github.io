// 영어 그림책. 쉬운 책부터 차례로 놓는다. 쪽마다 전용 삽화(기본 webp, 책별 imageExt 지정 가능), 없으면 카드 원화.
// 낭독 음성: english/audio/<책 id>-<쪽 번호>.mp3 (Gemini TTS Leda, 천천히).
(function (root) {
  "use strict";
  // Same story and illustrations, with a short, complete sentence for beginners.
  // Every practice line carries a recording matched to its exact visible text.
  // Original page narration is kept for page mode and the separate original button.
  const EASY = {
    picnic: [
      ["It is sunny.", "날이 화창해요."], ["Mom makes sandwiches.", "엄마가 샌드위치를 만들어요."],
      ["Dad has a basket.", "아빠에게 바구니가 있어요."], ["Teo can run.", "태오는 달릴 수 있어요."],
      ["Jay sees a butterfly.", "재이가 나비를 봐요."], ["The dog takes food.", "강아지가 먹을 것을 가져가요."],
      ["Dad is happy.", "아빠는 즐거워요."], ["We eat together.", "우리는 함께 먹어요."]
    ],
    momo: [
      ["Momo has a kite.", "모모에게 연이 있어요."], ["The kite flies.", "연이 날아요."],
      ["It is stuck.", "연이 걸렸어요."], ["Momo can jump.", "모모는 뛸 수 있어요."],
      ["A bird can help.", "새가 도와줄 수 있어요."], ["The kite comes down.", "연이 내려와요."],
      ["They play together.", "둘은 함께 놀아요."], ["They are happy.", "둘은 행복해요."]
    ],
    pigs: [
      ["Three pigs go out.", "돼지 세 마리가 집을 나서요."], ["The pig uses straw.", "돼지가 지푸라기를 써요."],
      ["The house falls down.", "집이 무너져요."], ["The pig uses sticks.", "돼지가 나뭇가지를 써요."],
      ["The wolf blows hard.", "늑대가 세게 불어요."], ["This house has bricks.", "이 집에는 벽돌이 있어요."],
      ["The brick house stays.", "벽돌집은 그대로 있어요."], ["The pigs are safe.", "돼지들은 안전해요."]
    ],
    race: [
      ["The hare is fast.", "토끼는 빨라요."], ["The tortoise is slow.", "거북이는 느려요."],
      ["They have a race.", "둘이 경주를 해요."], ["The hare runs fast.", "토끼가 빨리 달려요."],
      ["The hare is sleeping.", "토끼가 자고 있어요."], ["The tortoise keeps walking.", "거북이는 계속 걸어요."],
      ["The hare wakes up.", "토끼가 깨어나요."], ["The tortoise wins the race.", "거북이가 경주에서 이겨요."]
    ],
    redhood: [
      ["Red has a hood.", "빨간 모자에게 두건이 있어요."], ["Red brings some cookies.", "빨간 모자가 쿠키를 가져가요."],
      ["A wolf sees Red.", "늑대가 빨간 모자를 봐요."], ["The wolf runs fast.", "늑대가 빨리 달려요."],
      ["He hides in bed.", "늑대가 침대에 숨어요."], ["Your eyes are big!", "눈이 커요!"],
      ["A man helps Red.", "한 사람이 빨간 모자를 도와요."], ["They eat cookies together.", "둘은 함께 쿠키를 먹어요."]
    ],
    jack: [
      ["Jack lives with Mom.", "잭은 엄마와 살아요."], ["Jack gets magic beans.", "잭이 요술 콩을 받아요."],
      ["Mom throws the beans.", "엄마가 콩을 던져요."], ["The plant is tall.", "식물이 높이 자랐어요."],
      ["Jack can climb.", "잭은 올라갈 수 있어요."], ["A giant lives here.", "여기에 거인이 살아요."],
      ["Jack takes a hen.", "잭이 암탉을 데려가요."], ["They are happy now.", "이제 둘은 행복해요."]
    ],
    cinderella: [
      ["She works all day.", "소녀는 하루 종일 일해요."], ["She wants to dance.", "소녀는 춤추고 싶어요."],
      ["A fairy helps her.", "요정이 소녀를 도와요."], ["Look at the coach!", "마차를 보세요!"],
      ["She can dance now.", "이제 소녀는 춤출 수 있어요."], ["She loses a shoe.", "소녀가 구두 한 짝을 잃어버려요."],
      ["He finds the girl.", "왕자가 소녀를 찾아요."], ["They are happy now.", "이제 둘은 행복해요."]
    ]
  };
  const BOOKS = [
    {
      id: "picnic", title: "Jay and Teo Go on a Picnic", titleKo: "재이와 태오의 소풍", stars: 1, cover: "jaei",
      pages: [
        ["jaei", "It is a sunny day. Jay wants a picnic.", "화창한 날이에요. 재이는 소풍을 가고 싶어요."],
        ["eomma", "Mom makes sandwiches.", "엄마가 샌드위치를 만들어요."],
        ["appa", "Dad carries a big basket.", "아빠가 큰 바구니를 들어요."],
        ["taeo", "Teo runs to the park. He is so fast!", "태오가 공원으로 달려가요. 정말 빨라요!"],
        ["jaei", "Jay sees a butterfly. It is yellow.", "재이가 나비를 봐요. 노란 나비예요."],
        ["taeo", "Oh no! A dog takes a sandwich!", "앗! 강아지가 샌드위치를 가져가요!"],
        ["appa", "Dad laughs. We have more sandwiches.", "아빠가 웃어요. 샌드위치가 더 있어요."],
        ["eomma", "We eat together. What a happy day!", "우리는 함께 먹어요. 정말 행복한 날이에요!"]
      ]
    },
    {
      id: "momo", title: "Momo and the Red Kite", titleKo: "모모와 빨간 연", stars: 1, cover: "tortoisehare", imageExt: "png",
      pages: [
        ["tortoisehare", "Momo is a little rabbit. He has a red kite.", "모모는 작은 토끼예요. 빨간 연이 있어요."],
        ["tortoisehare", "The wind blows. The kite flies high!", "바람이 불어요. 연이 높이 날아요!"],
        ["tortoisehare", "Oh no! The kite is in a tree.", "앗! 연이 나무에 걸렸어요."],
        ["tortoisehare", "Momo jumps, but the kite is too high.", "모모가 뛰어 보지만, 연이 너무 높이 있어요."],
        ["tortoisehare", "A little bird says, I can help you!", "작은 새가 말해요. 내가 도와줄게!"],
        ["tortoisehare", "The bird pulls the string. The kite comes down.", "새가 줄을 당겨요. 연이 내려와요."],
        ["tortoisehare", "Thank you, Bird! They fly the kite together.", "고마워, 새야! 둘이 함께 연을 날려요."],
        ["tortoisehare", "The sun goes down. Momo and Bird are happy.", "해가 저물어요. 모모와 새는 행복해요."]
      ]
    },
    {
      id: "pigs", title: "The Three Little Pigs", titleKo: "아기돼지 삼형제", stars: 1, cover: "threepigs",
      pages: [
        ["threepigs", "Three little pigs leave home.", "아기돼지 세 마리가 집을 떠나요."],
        ["threepigs", "The first pig builds a straw house.", "첫째 돼지는 지푸라기 집을 지어요."],
        ["wolf", "The wolf blows. The straw house falls down!", "늑대가 후 불어요. 지푸라기 집이 무너져요!"],
        ["threepigs", "The second pig builds a stick house.", "둘째 돼지는 나무 집을 지어요."],
        ["wolf", "The wolf blows. The stick house falls down!", "늑대가 후 불어요. 나무 집이 무너져요!"],
        ["threepigs", "The third pig builds a brick house.", "셋째 돼지는 벽돌집을 지어요."],
        ["wolf", "The wolf blows and blows. The brick house does not fall.", "늑대가 불고 또 불어요. 벽돌집은 끄떡없어요."],
        ["threepigs", "The three pigs are safe and happy.", "아기돼지 삼형제는 안전하고 행복해요."]
      ]
    },
    {
      id: "race", title: "The Tortoise and the Hare", titleKo: "토끼와 거북", stars: 2, cover: "tortoisehare",
      pages: [
        ["tortoisehare", "The hare is very fast.", "토끼는 아주 빨라요."],
        ["tortoisehare", "The tortoise is very slow.", "거북이는 아주 느려요."],
        ["tortoisehare", "The tortoise wants a race.", "거북이가 달리기 경주를 하자고 해요."],
        ["tortoisehare", "The hare runs far ahead.", "토끼가 저 멀리 앞서 달려가요."],
        ["tortoisehare", "The hare is tired. He takes a nap.", "토끼는 피곤해요. 낮잠을 자요."],
        ["tortoisehare", "The tortoise walks and walks. He does not stop.", "거북이는 걷고 또 걸어요. 멈추지 않아요."],
        ["tortoisehare", "The hare wakes up. Oh no!", "토끼가 깨어나요. 이런!"],
        ["tortoisehare", "The tortoise wins! Slow and steady wins the race.", "거북이가 이겨요! 천천히 꾸준히 하면 이겨요."]
      ]
    },
    {
      id: "redhood", title: "Little Red Riding Hood", titleKo: "빨간 모자", stars: 2, cover: "redhood",
      pages: [
        ["redhood", "Little Red Riding Hood has a red hood.", "빨간 모자는 빨간 두건을 써요."],
        ["redhood", "She takes cookies to Grandma.", "할머니께 쿠키를 가져가요."],
        ["wolf", "A wolf sees her in the woods.", "숲에서 늑대가 소녀를 봐요."],
        ["wolf", "The wolf runs to Grandma first.", "늑대가 먼저 할머니 집으로 달려가요."],
        ["wolf", "He hides in the bed.", "늑대는 침대 속에 숨어요."],
        ["redhood", "Grandma, what big eyes you have!", "할머니, 눈이 왜 이렇게 커요!"],
        ["redhood", "A woodcutter hears her. He chases the wolf away.", "나무꾼이 소리를 들어요. 늑대를 쫓아내요."],
        ["redhood", "Grandma and Red are safe. They eat cookies together.", "할머니와 빨간 모자는 무사해요. 함께 쿠키를 먹어요."]
      ]
    },
    {
      id: "jack", title: "Jack and the Beanstalk", titleKo: "잭과 콩나무", stars: 3, cover: "jack",
      pages: [
        ["jack", "Jack and his mom are poor.", "잭과 엄마는 가난해요."],
        ["jack", "Jack sells the cow for magic beans.", "잭은 소를 요술 콩과 바꿔요."],
        ["jack", "Mom is angry. She throws the beans outside.", "엄마가 화가 났어요. 콩을 밖으로 던져요."],
        ["beanstalkgiant", "In the morning, a giant beanstalk grows to the sky.", "아침이 되자 거대한 콩나무가 하늘까지 자라요."],
        ["jack", "Jack climbs up and up.", "잭은 올라가고 또 올라가요."],
        ["beanstalkgiant", "A big giant lives in a castle in the clouds.", "구름 위 성에 커다란 거인이 살아요."],
        ["jack", "Jack takes a golden hen and runs home.", "잭은 황금 암탉을 들고 집으로 달려가요."],
        ["jack", "Jack cuts the beanstalk. Now they are happy.", "잭이 콩나무를 잘라요. 이제 모두 행복해요."]
      ]
    },
    {
      id: "cinderella", title: "Cinderella", titleKo: "신데렐라", stars: 3, cover: "cinderella",
      pages: [
        ["cinderella", "Cinderella works all day.", "신데렐라는 하루 종일 일해요."],
        ["cinderella", "She wants to go to the ball.", "무도회에 가고 싶어요."],
        ["fairygodmother", "A fairy godmother comes. She waves her wand.", "요정 대모가 나타나요. 요술 지팡이를 흔들어요."],
        ["fairygodmother", "A pumpkin becomes a coach!", "호박이 마차가 돼요!"],
        ["cinderella", "Cinderella dances with the prince.", "신데렐라는 왕자와 춤을 춰요."],
        ["cinderella", "At midnight, she runs away. She loses her shoe.", "자정이 되자 도망쳐요. 구두 한 짝을 잃어버려요."],
        ["cinderella", "The prince looks for the girl with the glass shoe.", "왕자는 유리 구두의 주인을 찾아요."],
        ["cinderella", "The shoe fits! They live happily ever after.", "구두가 꼭 맞아요! 둘은 오래오래 행복하게 살아요."]
      ]
    }
  ].map(function (book) {
    return {
      id: book.id, title: book.title, titleKo: book.titleKo, stars: book.stars, cover: book.cover,
      pages: book.pages.map(function (page, index) {
        const easy = EASY[book.id][index];
        return { art: page[0], text: page[1], meaning: page[2], easy: { text: easy[0], meaning: easy[1] }, audio: "audio/" + book.id + "-" + (index + 1) + ".mp3",
          image: "art/" + book.id + "-" + (index + 1) + "." + (book.imageExt || "webp") };
      })
    };
  });
  const MODE_KEY = "hub2_book_reading_mode";
  const ADAPTIVE_KEY = "hub2_book_reading_growth";
  const MODES = ["easy", "sentence", "page"];
  const thresholds = { easy: 6, sentence: 8, page: 0 };
  const modeLabels = { easy: "짧은 문장", sentence: "한 문장씩", page: "한 쪽 전체" };
  function cleanMode(mode) { return Object.hasOwn(modeLabels, mode) ? mode : "easy"; }
  function readMode(storage) { try { return cleanMode(storage.getItem(MODE_KEY)); } catch (_) { return "easy"; } }
  // An explicit parent choice resets the growth streak, never the book cursor.
  function saveMode(storage, mode) {
    mode = cleanMode(mode);
    try {
      storage.setItem(MODE_KEY, mode);
      storage.setItem(ADAPTIVE_KEY, JSON.stringify({ mode, streak: 0, struggles: 0, recent: [] }));
      return true;
    } catch (_) { return false; }
  }
  function readGrowth(storage) {
    const mode = readMode(storage);
    let saved;
    try { saved = JSON.parse(storage.getItem(ADAPTIVE_KEY) || "null"); } catch (_) {}
    if (!saved || saved.mode !== mode) saved = {};
    return { mode,
      streak: Math.max(0, Math.min(thresholds[mode] || 0, parseInt(saved.streak, 10) || 0)),
      struggles: Math.max(0, Math.min(3, parseInt(saved.struggles, 10) || 0)),
      recent: Array.isArray(saved.recent) ? saved.recent.filter(id => typeof id === "string").slice(-32) : [] };
  }
  function growthLabel(storage) {
    const state = readGrowth(storage), need = thresholds[state.mode];
    return need ? "자동 성장 · 다음 단계 " + state.streak + "/" + need : "자동 성장 · 한 쪽 전체 읽기";
  }
  // Accepted passages only: silence, API failures, and navigation never count.
  // Deduplicate between reading surfaces; switch modes at page boundaries only.
  function recordPass(storage, event) {
    const state = readGrowth(storage), before = state.mode;
    const result = { mode: before, promoted: false, eased: false, counted: false };
    if (!event || event.mode !== before || !event.id) return result;
    const id = before + ":" + event.id;
    if (state.recent.includes(id)) return result;
    state.recent.push(id); state.recent = state.recent.slice(-32);
    result.counted = true;
    if (event.firstTry === true) {
      state.struggles = 0;
      state.streak = Math.min(thresholds[before] || 0, state.streak + 1);
    } else {
      state.streak = 0; state.struggles = Math.min(3, state.struggles + 1);
    }
    const level = MODES.indexOf(before);
    if (event.pageComplete === true) {
      if (thresholds[before] && state.streak >= thresholds[before] && level < MODES.length - 1) {
        state.mode = MODES[level + 1]; result.promoted = true;
      } else if (state.struggles >= 3 && level > 0) {
        state.mode = MODES[level - 1]; result.eased = true;
      }
    }
    if (state.mode !== before) { state.streak = 0; state.struggles = 0; }
    result.mode = state.mode;
    try {
      storage.setItem(MODE_KEY, state.mode);
      storage.setItem(ADAPTIVE_KEY, JSON.stringify(state));
    } catch (_) {}
    return result;
  }
  function splitSentences(text) { return (text.match(/[^.!?]+[.!?]?/g) || [text]).map(s => s.trim()).filter(Boolean); }
  const originalAudio = new Map(BOOKS.flatMap(book => book.pages.map(page => [page.text, page.audio])));
  function audioFor(text) {
    if (originalAudio.has(text)) return originalAudio.get(text);
    let hash = 2166136261;
    for (let i = 0; i < text.length; i++) hash = Math.imul(hash ^ text.charCodeAt(i), 16777619) >>> 0;
    return 'audio/practice-v1/line-' + hash.toString(16).padStart(8, '0') + '.mp3';
  }
  function practice(page, mode) {
    mode = cleanMode(mode);
    if (mode === "easy" && page.easy) return [{ ...page.easy, audio: audioFor(page.easy.text) }];
    if (mode === "sentence") {
      const lines = splitSentences(page.text), meanings = splitSentences(page.meaning);
      return lines.map((text, i) => ({ text, meaning: meanings.length === lines.length ? meanings[i] : page.meaning, audio: audioFor(text) }));
    }
    return [{ text: page.text, meaning: page.meaning, audio: page.audio }];
  }
  function practiceAudioPlan() {
    const clips = new Map();
    for (const book of BOOKS) for (const page of book.pages) for (const mode of MODES) for (const line of practice(page, mode)) {
      if (clips.has(line.audio) && clips.get(line.audio).text !== line.text) throw Error('Practice audio collision');
      clips.set(line.audio, { audio: line.audio, text: line.text });
    }
    return Array.from(clips.values());
  }
  const api = { books: BOOKS, MODE_KEY, ADAPTIVE_KEY, thresholds, modeLabels, cleanMode, readMode, saveMode, readGrowth, growthLabel, recordPass, practice, practiceAudioPlan };
  if (typeof module === "object" && module.exports) module.exports = api;
  else root.EnglishBooks = api;
})(typeof window !== "undefined" ? window : globalThis);
