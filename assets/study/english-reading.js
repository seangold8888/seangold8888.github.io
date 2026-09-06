(function (root) {
  "use strict";
  const sentences = [
    ["I like apples.", "나는 사과를 좋아해요."],
    ["I see a cat.", "고양이가 보여요."],
    ["This is my book.", "이것은 내 책이에요."],
    ["I can run.", "나는 달릴 수 있어요."],
    ["The sun is bright.", "해가 밝아요."],
    ["I like milk.", "나는 우유를 좋아해요."],
    ["This is my family.", "우리 가족이에요."],
    ["I have a dog.", "나는 강아지가 있어요."],
    ["The bird can fly.", "새는 날 수 있어요."],
    ["I am happy.", "나는 행복해요."],
    ["I see a red flower.", "빨간 꽃이 보여요."],
    ["We can play together.", "우리는 함께 놀 수 있어요."],
    ["I wash my hands.", "나는 손을 씻어요."],
    ["Please open the door.", "문을 열어 주세요."],
    ["Thank you very much.", "정말 고마워요."],
    ["I love my family.", "나는 우리 가족을 사랑해요."],
    ["I see a big dog.", "큰 강아지가 보여요."],
    ["I have a red ball.", "나는 빨간 공이 있어요."],
    ["I can jump.", "나는 뛸 수 있어요."],
    ["I can swim.", "나는 수영할 수 있어요."],
    ["The cat is small.", "고양이는 작아요."],
    ["The dog is big.", "강아지는 커요."],
    ["I like bananas.", "나는 바나나를 좋아해요."],
    ["I like my mom.", "나는 엄마를 좋아해요."],
    ["I love my dad.", "나는 아빠를 사랑해요."],
    ["This is my bag.", "이것은 내 가방이에요."],
    ["This is a pen.", "이것은 펜이에요."],
    ["I have two cats.", "나는 고양이 두 마리가 있어요."],
    ["I see three birds.", "새 세 마리가 보여요."],
    ["The sky is blue.", "하늘은 파래요."],
    ["The grass is green.", "풀은 초록색이에요."],
    ["The apple is red.", "사과는 빨개요."],
    ["I like the moon.", "나는 달을 좋아해요."],
    ["The moon is round.", "달은 둥글어요."],
    ["I see a star.", "별이 보여요."],
    ["Good morning, Mom.", "엄마, 좋은 아침이에요."],
    ["Good night, Dad.", "아빠, 안녕히 주무세요."],
    ["I am a girl.", "나는 여자아이예요."],
    ["You are my friend.", "너는 내 친구야."],
    ["We are happy.", "우리는 행복해요."],
    ["It is a fish.", "그것은 물고기예요."],
    ["The fish can swim.", "물고기는 수영할 수 있어요."],
    ["I can sing.", "나는 노래할 수 있어요."],
    ["I sing a song.", "나는 노래를 불러요."],
    ["I can jump high.", "나는 높이 뛸 수 있어요."],
    ["We go home.", "우리는 집에 가요."],
    ["I go to school.", "나는 학교에 가요."],
    ["I like my school.", "나는 우리 학교를 좋아해요."],
    ["The bus is yellow.", "버스는 노란색이에요."],
    ["I have a pink hat.", "나는 분홍 모자가 있어요."],
    ["I eat an egg.", "나는 달걀을 먹어요."],
    ["I drink water.", "나는 물을 마셔요."],
    ["I like ice cream.", "나는 아이스크림을 좋아해요."],
    ["The rabbit is white.", "토끼는 하얘요."],
    ["The pig is pink.", "돼지는 분홍색이에요."],
    ["I see a frog.", "개구리가 보여요."],
    ["The frog can jump.", "개구리는 뛸 수 있어요."],
    ["It is hot.", "더워요."],
    ["It is cold.", "추워요."],
    ["I have a blue cup.", "나는 파란 컵이 있어요."],
    ["Please sit down.", "앉아 주세요."],
    ["Please come here.", "이리 와 주세요."],
    ["Thank you, Mom.", "엄마, 고마워요."],
    ["I am seven.", "나는 일곱 살이에요."],
    ["Happy birthday, Dad.", "아빠, 생일 축하해요."],
    ["I love you.", "사랑해요."],
    ["See you soon.", "곧 만나요."],
    ["The bird is small.", "새는 작아요."]
  ].map(function (pair) { return { text: pair[0], meaning: pair[1] }; });

  function normalize(text) {
    return String(text || "").toLowerCase().replace(/[’‘]/g, "'")
      .replace(/\bi'm\b/g, "i am").replace(/\bcan't\b/g, "cannot")
      .replace(/\bcan not\b/g, "cannot").replace(/[^a-z0-9\s]/g, " ")
      .trim().replace(/\s+/g, " ");
  }
  // Recognizer tolerance for a Korean first grader: homophones and the
  // near-misses Safari/Chrome actually return for a correctly read word
  // (r/l, the "ir" vowel, final consonants). Reviewed by Claude 2026-09-06.
  // Keep the lists tight: an alias must sound like the word when read right.
  const PHRASES = [["to get her", "together"], ["to gather", "together"], ["o pen", "open"], ["a pples", "apples"], ["birth day", "birthday"], ["bird day", "birthday"]];
  const ALIASES = {
    i: ["eye", "ai"],
    like: ["light", "lik", "liked", "lie"],
    apples: ["apple", "apple's", "apples'", "appears"],
    see: ["sea", "c", "si"],
    a: ["uh", "ah", "er"],
    cat: ["cut", "cats", "kat", "cap", "cad"],
    this: ["these", "dis", "tis", "disc"],
    is: ["it's", "iz", "his", "ease"],
    my: ["mai", "ma", "mi"],
    book: ["books", "buck", "boo", "booked"],
    can: ["ken", "kan", "cans", "cam"],
    run: ["ran", "rum", "lun", "wren", "runs"],
    the: ["da", "de", "duh", "za"],
    sun: ["son", "sung", "sum", "san", "sunny"],
    bright: ["bride", "right", "brite", "blight", "brights", "bry", "brought"],
    milk: ["mill", "milks", "meal", "milc", "mick"],
    family: ["families", "family's", "femily", "fam"],
    have: ["has", "had", "hab", "hev", "hef"],
    dog: ["dogs", "dock", "doug", "doc", "dawg"],
    bird: ["board", "bard", "bored", "boy", "burd", "birds", "bert", "bud", "bod", "birth", "bird's", "beard", "bad"],
    fly: ["fry", "flies", "flai", "fli", "flight", "fright"],
    am: ["um", "im", "em", "an"],
    happy: ["heppy", "happi", "harpy", "hoppy", "hippie"],
    red: ["read", "rad", "wed", "led", "lead", "reed"],
    flower: ["flour", "flowers", "frower", "flow", "flauer", "flower's"],
    we: ["wee", "v", "oui", "wi"],
    play: ["pray", "played", "plays", "pley", "plate", "pay"],
    together: ["togeder", "togather", "to-gether", "tugether"],
    wash: ["watch", "washed", "wosh", "was", "wish"],
    hands: ["hand", "hens", "hans", "hands'", "hand's", "heads"],
    please: ["police", "plies", "pleas", "plis", "pleased", "prease"],
    open: ["oven", "opened", "opens", "opan"],
    door: ["doors", "dor", "dough", "doer", "dow"],
    thank: ["tank", "sank", "thanks", "thang", "tanks", "sanks"],
    you: ["u", "yu", "ewe", "yoo"],
    very: ["berry", "bury", "vary", "belly", "vely", "beri", "ferry"],
    much: ["march", "mush", "match", "mach", "mutch", "munch"],
    love: ["lov", "lub", "rob", "luv", "loves", "lof", "laugh", "lav", "rove"],
    big: ["bic", "bee", "beg", "pig", "bigger"],
    ball: ["bowl", "balls", "bal", "bull"],
    jump: ["jumps", "jam", "jumped", "champ"],
    swim: ["swing", "swims", "swin", "sweem"],
    small: ["smol", "smile", "smaller", "mall"],
    bananas: ["banana", "banana's", "bananas'", "bananers"],
    mom: ["mum", "mam", "mommy", "mama", "mon"],
    dad: ["daddy", "dead", "dat", "that", "papa"],
    bag: ["beg", "back", "bags", "bug"],
    pen: ["pan", "pain", "pens", "pin"],
    two: ["to", "too", "tu", "2"],
    cats: ["cat", "cat's", "cuts", "kats"],
    three: ["tree", "free", "3", "sree", "thee"],
    birds: ["bird", "boards", "bards", "bird's", "birth", "boys"],
    sky: ["skye", "ski", "skai", "sky's"],
    blue: ["blew", "bloo", "blu", "boo"],
    grass: ["glass", "gras", "grasp", "grace"],
    green: ["grin", "gleen", "greene", "grean"],
    apple: ["apples", "appel", "apple's", "abble"],
    moon: ["mon", "moons", "mun", "moo"],
    round: ["lound", "around", "rounds", "roun"],
    star: ["stars", "stir", "sta", "start"],
    good: ["could", "god", "goo", "gut", "goods"],
    morning: ["mourning", "moning", "mornin", "mooning"],
    night: ["knight", "nite", "nigh", "nights"],
    girl: ["gull", "girls", "curl", "gel", "gill"],
    are: ["r", "ah", "ar", "our"],
    friend: ["friends", "frend", "fren", "trend", "print"],
    it: ["eat", "et", "eet", "its"],
    fish: ["fishes", "fis", "feesh", "fresh"],
    sing: ["seeing", "sink", "sings", "seen", "sin"],
    song: ["sung", "songs", "son", "sang"],
    high: ["hi", "hai", "hide", "hy"],
    go: ["goal", "gah", "goes", "gold"],
    home: ["hom", "hum", "homes", "hall"],
    to: ["too", "two", "tu", "do"],
    school: ["skool", "scool", "schools", "cool", "school's"],
    bus: ["boss", "buzz", "buss", "bass", "us"],
    yellow: ["yello", "hello", "yellows", "jello"],
    pink: ["ping", "pinky", "think", "pinks"],
    hat: ["had", "hut", "hats", "hot", "at"],
    eat: ["it", "eet", "eats", "heat", "eight"],
    an: ["and", "en", "un", "on"],
    egg: ["eggs", "ag", "eg", "egg's", "x"],
    drink: ["dring", "drinks", "think", "drank", "drinc"],
    water: ["wader", "waters", "wata", "warder", "wooder"],
    ice: ["eyes", "ais", "i's", "is"],
    cream: ["crim", "dream", "creams", "cleam", "scream"],
    rabbit: ["rabbits", "robert", "rabit", "rabbit's", "rapid"],
    white: ["why", "wide", "wight", "wine", "wait"],
    pig: ["peak", "pick", "pic", "pigs", "big"],
    frog: ["frogs", "flog", "fog", "frock", "frog's"],
    hot: ["hut", "hat", "hop", "hott"],
    cold: ["called", "code", "gold", "cord", "colt", "coal"],
    cup: ["cap", "cop", "cups", "cub", "cut"],
    sit: ["seat", "set", "sits", "seed", "shit"],
    down: ["dawn", "dow", "town", "don"],
    come: ["cam", "calm", "comes", "cum", "kam"],
    here: ["hear", "hair", "her", "he", "hia"],
    seven: ["seventh", "sever", "sebben", "7", "heaven"],
    birthday: ["birth day", "bursday", "birthdays", "birthday's", "bird day"],
    soon: ["sun", "soo", "son", "spoon", "sune"]
  };
  function heardTokens(heard) {
    let text = normalize(heard);
    PHRASES.forEach(function (pair) { text = text.split(pair[0]).join(pair[1]); });
    return text ? text.split(" ") : [];
  }
  function sameWord(expected, got) {
    if (expected === got) return true;
    const list = ALIASES[expected];
    return !!list && list.indexOf(got) >= 0;
  }
  function matches(expected, heard) {
    const words = normalize(expected) ? normalize(expected).split(" ") : [], got = heardTokens(heard);
    if (!words.length || words.length !== got.length) return false;
    return words.every(function (word, i) { return sameWord(word, got[i]); });
  }
  // True while the heard words are still a valid beginning of the sentence.
  function isPrefix(expected, heard) {
    const words = normalize(expected).split(" "), got = heardTokens(heard);
    if (got.length > words.length) return false;
    return got.every(function (token, i) { return sameWord(words[i], token); });
  }
  // Ordered alignment is feedback, never a partial-credit scoring rule.
  function matchedWords(expected, heard) {
    const words = normalize(expected).split(" "), got = heardTokens(heard);
    let position = 0;
    return words.map(function (word) {
      let index = -1;
      for (let i = position; i < got.length; i++) { if (sameWord(word, got[i])) { index = i; break; } }
      if (index < 0) return false;
      position = index + 1;
      return true;
    });
  }
  // The recognizer sends up to MAX_ALTERNATIVES guesses per final result. The
  // sentence passes when the first guesses match, or when swapping any single
  // result for one of its other guesses matches. Display always uses the first guess.
  const MAX_ALTERNATIVES = 5;
  function alternativeTexts(finals) {
    const base = finals.map(function (alts) { return alts[0] || ""; });
    const texts = [base.join(" ")];
    finals.forEach(function (alts, i) {
      for (let k = 1; k < alts.length; k++) {
        const copy = base.slice(); copy[i] = alts[k];
        texts.push(copy.join(" "));
      }
    });
    return texts;
  }
  function anyMatches(expected, finals) {
    return alternativeTexts(finals).some(function (text) { return matches(expected, text); });
  }

  function cleanWordScores(input) {
    const scores = {};
    sentences.forEach(function (sentence) {
      normalize(sentence.text).split(" ").forEach(function (word) {
        const value = input && Object.prototype.hasOwnProperty.call(input, word) ? input[word] : 0;
        if (Number.isFinite(value) && value > 0) scores[word] = Math.min(5, Math.floor(value));
      });
    });
    return scores;
  }
  // `recent` lists sentence indexes read lately (newest last); none of them nor
  // `previous` is offered again while other sentences remain. Without trouble
  // words the pick walks forward from the ordinal so the book is read in order.
  const RECENT_LIMIT = 12;
  function chooseSentence(scores, ordinal, previous, random, recent) {
    scores = cleanWordScores(scores);
    const n = sentences.length;
    const avoid = {};
    (Array.isArray(recent) ? recent.slice(-RECENT_LIMIT) : []).forEach(function (idx) { if (Number.isInteger(idx)) avoid[idx] = true; });
    if (Number.isInteger(previous)) avoid[previous] = true;
    if (Object.keys(avoid).length >= n) { const only = ((ordinal % n) + n) % n; return only === previous ? (only + 1) % n : only; }
    const base = ((ordinal % n) + n) % n;
    if (!Object.keys(scores).length) {
      for (let step = 0; step < n; step++) { const idx = (base + step) % n; if (!avoid[idx]) return idx; }
      return base;
    }
    const weights = sentences.map(function (sentence, idx) {
      if (avoid[idx]) return 0;
      return 1 + Math.min(8, normalize(sentence.text).split(" ").reduce(function (sum, word) { return sum + (scores[word] || 0); }, 0));
    });
    const total = weights.reduce(function (sum, weight) { return sum + weight; }, 0);
    let draw = (random || Math.random)() * total;
    for (let i = 0; i < weights.length; i++) { draw -= weights[i]; if (draw < 0) return i; }
    for (let step = 0; step < n; step++) { const idx = (base + step) % n; if (!avoid[idx]) return idx; }
    return base;
  }
  const FIRST_PRAISE = ["excellent", "perfect", "awesome", "wonderful"];
  const RETRY_PRAISE = ["great", "verygood", "youdidit", "super"];
  const PRAISE_TEXT = { excellent: "Excellent!", perfect: "Perfect!", awesome: "Awesome!", wonderful: "Wonderful!", great: "Great!", verygood: "Very good!", youdidit: "You did it!", super: "Super!", threeinarow: "Three in a row!" };
  const PRAISE_PATH = "assets/study/praise/", WORD_PATH = "assets/study/words/";
  const WORD_CLIPS = {};
  sentences.forEach(function (sentence) { normalize(sentence.text).split(" ").forEach(function (word) { WORD_CLIPS[word] = WORD_PATH + word + ".mp3"; }); });
  const STALL_MS = 5000, NO_AUDIO_MS = 1800, WORD_STALL_MS = 4000, WORD_GAP_MS = 400, STOP_WAIT_MS = 600;
  const LOG_LIMIT = 40;
  const sessions = new WeakMap();
  // One session per window: praise streak, last clip and a diagnostic log.
  function createFeedbackSession() { return { streak: 0, lastClip: null, log: [] }; }
  function choosePraise(session, firstTry, random) {
    session.streak = firstTry ? session.streak + 1 : 0;
    const group = firstTry && session.streak % 3 === 0 ? ["threeinarow"] : firstTry ? FIRST_PRAISE : RETRY_PRAISE;
    const candidates = group.filter(function (clip) { return clip !== session.lastClip; });
    const clip = candidates[Math.floor((random || Math.random)() * candidates.length)];
    session.lastClip = clip;
    return clip;
  }
  function retryWords(expected, heard) {
    const flags = matchedWords(expected, heard);
    if (flags.every(Boolean)) return [];
    return Array.from(new Set(normalize(expected).split(" ").filter(function (_, i) { return !flags[i]; }))).slice(0, 3);
  }
  // Diagnostic trail (no transcripts, only event names and codes), kept in
  // memory for the page and shown under the sentence when the URL carries
  // readinglog=1. Nothing is written to storage.
  function record(env, session, event) {
    const now = env.Date ? env.Date.now() : Date.now();
    session.log.push(Math.round(now / 1000) % 100000 + " " + event);
    if (session.log.length > LOG_LIMIT) session.log.splice(0, session.log.length - LOG_LIMIT);
  }
  function mount(container, sentence, onPass, env, callbacks) {
    env = env || root;
    callbacks = callbacks || {};
    const doc = env.document;
    if (!sessions.has(env)) sessions.set(env, createFeedbackSession());
    const session = sessions.get(env);
    let disposed = false, awarded = false, active = null, serial = 0, timer = null, finalText = "";
    let retried = false, soundActive = false, soundTimer = null, stopTimer = null, passDone = false, stopping = null;
    let audio = null, unlocked = false, healthTimer = null, recovering = false;
    let recoveryButton = null;
    const Recognition = env.SpeechRecognition || env.webkitSpeechRecognition;
    const showLog = !!(env.location && /(?:\?|&)readinglog=1/.test(env.location.search || ""));
    const nodes = {};
    function element(tag, className, text) {
      const node = doc.createElement(tag);
      node.className = className;
      if (text) node.textContent = text;
      return node;
    }
    container.textContent = "";
    container.classList.add("reading-practice");
    const label = element("p", "reading-label", "문장을 처음부터 끝까지 읽어요");
    const line = element("p", "reading-sentence");
    line.lang = "en";
    line.setAttribute("aria-label", sentence.text);
    sentence.text.split(/\s+/).forEach(function (word) {
      line.appendChild(element("span", "reading-word", word));
    });
    const meaning = element("p", "reading-meaning", sentence.meaning);
    const actions = element("div", "reading-actions");
    nodes.mic = element("button", "", "🎤 읽어 보기");
    nodes.stop = element("button", "", "그만하기");
    [nodes.mic, nodes.stop].forEach(function (button) {
      button.type = "button"; actions.appendChild(button);
    });
    const fallback = element("button", "", "마이크가 안 돼요 · 다른 문제 풀기");
    fallback.type = "button"; fallback.hidden = true;
    if (callbacks.onUnavailable) actions.appendChild(fallback);
    fallback.addEventListener("click", function () {
      if (disposed || awarded || fallback.hidden) return;
      stop(); callbacks.onUnavailable();
    });
    nodes.status = element("p", "reading-status", "잘 들리는 목소리로 읽어 주세요. 크게 외치지 않아도 돼요.");
    nodes.status.setAttribute("role", "status");
    nodes.heard = element("p", "reading-heard");
    nodes.heard.lang = "en";
    const privacy = element("p", "reading-privacy",
      "부모님 안내: ‘읽어 보기’ 또는 ‘마이크 복구’를 누를 때만 마이크를 켭니다. 음성은 브라우저의 인식 서비스로 전송될 수 있어요. 복구용 마이크 연결은 즉시 닫으며 녹음하지 않아요. 음성과 인식 문장은 저장하지 않고, 연습할 교재 단어와 복습 횟수만 이 기기에 기억해요. 발음 점수가 아닌 문장 읽기를 확인해요.");
    [label, line, meaning, actions, nodes.status, nodes.heard, privacy].forEach(function (node) { container.appendChild(node); });
    const logNode = showLog ? element("pre", "reading-log") : null;
    if (logNode) container.appendChild(logNode);
    function log(event) {
      record(env, session, event);
      if (logNode && !disposed) logNode.textContent = session.log.join("\n");
    }
    log("mount");

    function controls() {
      nodes.mic.disabled = disposed || awarded || recovering || !!active || soundActive || !Recognition || env.isSecureContext === false || env.navigator.onLine === false;
      if (recoveryButton) recoveryButton.disabled = disposed || awarded || recovering || !!active || soundActive || env.navigator.onLine === false;
      nodes.stop.disabled = disposed || awarded || !!stopping || (!active && !soundActive);
      nodes.stop.textContent = soundActive && !awarded ? "안내 멈추고 읽기" : "그만하기";
    }
    function audioElement() { return audio; }
    function detachAudio() {
      const audio = audioElement();
      if (!audio) return;
      audio.onended = audio.onerror = audio.ontimeupdate = audio.onplaying = null;
      audio.onwaiting = audio.onstalled = null;
      // Calling pause() even on an ended element immediately before start()
      // can disturb Safari's media/capture route. Release only loaded media.
      try { if (audio.paused !== true && audio.ended !== true) audio.pause(); } catch (_) {}
      try {
        if (audio.getAttribute && audio.getAttribute("src")) {
          audio.removeAttribute("src"); audio.load();
        }
      } catch (_) {}
    }
    function cancelSound() {
      env.clearTimeout(soundTimer); soundTimer = null;
      detachAudio();
      soundActive = false;
      Array.from(line.children).forEach(function (word) { word.classList.remove("listening"); });
    }
    // Stops the live recognizer. With `after`, waits for its end event (at most
    // STOP_WAIT_MS) before calling after(true); speakers must never overlap a
    // live microphone, so a missing end event calls after(false) instead.
    function stop(message, after) {
      serial++;
      recovering = false;
      env.clearTimeout(healthTimer); healthTimer = null;
      env.clearTimeout(timer); timer = null;
      env.clearTimeout(stopTimer); stopTimer = null;
      cancelSound();
      if (stopping) { stopping.onend = null; try { stopping.abort(); } catch (_) {} stopping = null; }
      const previous = active; active = null;
      if (previous) {
        previous.onresult = previous.onerror = previous.onend = previous.onstart = null;
        if (after) {
          const id = serial;
          let settled = false;
          const ended = function (safe) {
            if (settled) return;
            settled = true;
            if (stopping === previous) stopping = null;
            previous.onend = null;
            env.clearTimeout(stopTimer); stopTimer = null;
            log(safe ? "mic-off" : "mic-off-timeout");
            if (!disposed && id === serial) after(safe);
          };
          soundActive = true;
          stopping = previous;
          previous.onend = function () { ended(true); };
          stopTimer = env.setTimeout(function () { previous.onend = null; try { previous.abort(); } catch (_) {} ended(false); }, STOP_WAIT_MS);
          try { previous.stop(); } catch (_) { try { previous.abort(); } catch (_) {} ended(false); }
        } else { try { previous.abort(); } catch (_) {} }
      }
      controls();
      if (message && !disposed) nodes.status.textContent = message;
      if (!previous && after) after(true);
    }
    function resetFlow() { retried = true; session.streak = 0; }
    // Create the element without a source: loading a praise clip in the same
    // tap as recognition.start() needlessly changes the audio route on iOS.
    // This does not assume constructor/load unlocks autoplay; blocked playback
    // still has a bounded text-only fallback.
    function unlockAudio() {
      if (unlocked) return;
      unlocked = true;
      try {
        if (env.Audio) {
          audio = new env.Audio();
          audio.preload = "none";
        }
      } catch (_) { audio = null; }
    }
    function completePass() {
      if (disposed || passDone) return;
      passDone = true;
      cancelSound();
      log("next");
      onPass();
    }
    function armWatchdog(ms, fn) {
      env.clearTimeout(soundTimer);
      soundTimer = env.setTimeout(fn, ms);
    }
    // Plays one clip on the shared element. onDone fires once: at the ended
    // event, at a playback error, or when progress stalls for stallMs.
    function playClip(src, stallMs, onDone) {
      const audio = audioElement();
      const id = serial;
      let done = false;
      const finish = function (how) {
        if (done || disposed || id !== serial) return;
        done = true;
        detachAudio();
        env.clearTimeout(soundTimer); soundTimer = null;
        onDone(how);
      };
      if (!audio) { finish("no-audio"); return; }
      audio.src = src;
      audio.onended = function () { finish("ended"); };
      audio.onerror = function () { finish("error"); };
      const progress = function () { if (!done && !disposed && id === serial) armWatchdog(stallMs, function () { finish("stall"); }); };
      audio.onplaying = progress;
      audio.ontimeupdate = progress;
      audio.onwaiting = function () { if (!done && !disposed && id === serial) log("audio-wait"); };
      audio.onstalled = function () { if (!done && !disposed && id === serial) log("audio-stalled"); };
      armWatchdog(stallMs, function () { finish("stall"); });
      try {
        const playing = audio.play();
        if (playing && playing.catch) playing.catch(function () { finish("blocked"); });
      } catch (_) { finish("blocked"); }
    }
    function praise() {
      const clip = choosePraise(session, !retried);
      nodes.status.textContent = "";
      nodes.status.appendChild(element("span", "reading-praise", (clip === "threeinarow" ? "🌟 " : "⭐ ") + PRAISE_TEXT[clip]));
      nodes.status.appendChild(element("span", "reading-praise-detail", clip === "threeinarow" ? "세 문장 연속!" : retried ? "다시 읽어서 해냈어!" : "한 번에 읽었어!"));
      if (clip === "threeinarow") {
        const stars = element("span", "reading-star-burst", "★ ✦ ⭐ ✦ ★");
        stars.setAttribute("aria-hidden", "true"); nodes.status.appendChild(stars);
      }
      log("pass " + clip + (retried ? " retry" : " first"));
      stop(null, function (safe) {
        if (!safe || !audioElement() || session.silent) { soundActive = false; controls(); if (!soundTimer) armWatchdog(NO_AUDIO_MS, completePass); return; }
        soundActive = true;
        controls();
        // Every praise clip plays to its ended event; the watchdog only guards a
        // stalled or blocked playback so the question can never be trapped.
        playClip(PRAISE_PATH + clip + ".mp3", STALL_MS, function (how) {
          log("praise-" + how);
          if (how === "blocked" || how === "error") { armWatchdog(NO_AUDIO_MS, completePass); return; }
          completePass();
        });
      });
      // Visible praise without any playable audio still moves on.
      if (!disposed && !passDone && !soundTimer) armWatchdog(NO_AUDIO_MS, completePass);
    }
    // Reads back only the misread words, once each, from recorded clips.
    function speakWords(words, safe) {
      soundActive = false;
      const clips = words.filter(function (word) { return !!WORD_CLIPS[word]; });
      if (!safe || !clips.length || !audioElement() || session.silent) { controls(); return; }
      const id = serial;
      let index = 0;
      soundActive = true; controls();
      function next() {
        if (disposed || id !== serial) return;
        Array.from(line.children).forEach(function (word) { word.classList.remove("listening"); });
        if (index >= clips.length) { cancelSound(); controls(); log("words-done"); return; }
        const word = clips[index++];
        nodes.status.textContent = "이렇게 읽어요 👂 " + word;
        const target = Array.from(line.children).find(function (node) { return node.classList.contains("retry") && normalize(node.textContent) === word; });
        if (target) target.classList.add("listening");
        playClip(WORD_CLIPS[word], WORD_STALL_MS, function (how) {
          if (how !== "ended") log("word-" + how);
          if (how === "blocked") { cancelSound(); controls(); return; }
          if (index < clips.length) soundTimer = env.setTimeout(next, WORD_GAP_MS);
          else next();
        });
      }
      next();
    }
    function feedback(text, retry) {
      nodes.heard.textContent = text ? "“" + text + "”" : "";
      const flags = matchedWords(sentence.text, text);
      // If all expected words occur but extra words were spoken, flag the whole line.
      const wholeLine = retry && flags.every(Boolean);
      Array.from(line.children).forEach(function (word, i) {
        const wrong = !!retry && (!flags[i] || wholeLine);
        word.classList.toggle("heard", !!flags[i] && !wrong);
        word.classList.toggle("retry", wrong);
      });
      nodes.status.classList.toggle("retry", !!retry);
      nodes.heard.classList.toggle("retry", !!retry);
      nodes.mic.textContent = retry ? "🎤 다시 읽기" : "🎤 읽어 보기";
    }
    function finishAttempt() {
      resetFlow();
      if (finalText && !matches(sentence.text, finalText)) {
        const flags = matchedWords(sentence.text, finalText);
        const words = normalize(sentence.text).split(" ").filter(function (_, i) { return !flags[i]; });
        feedback(finalText, true);
        const spoken = retryWords(sentence.text, finalText);
        log("retry " + spoken.length);
        stop(spoken.length ? "이렇게 읽어요 👂 " + spoken[0] : "문장에 있는 말만 읽어 주세요", function (safe) { speakWords(spoken, safe); });
        if (callbacks.onRetry) callbacks.onRetry(Array.from(new Set(words)));
      } else {
        log("empty");
        stop("잘 듣지 못했어요. 읽어 보기를 눌러 다시 읽어 주세요.");
      }
    }
    function offerRecovery(reason) {
      stop("마이크가 응답하지 않아요. 아래 ‘소리 끄고 마이크 복구’를 눌러 주세요. 오답으로 세지 않아요.");
      log(reason);
      if (!recoveryButton) {
        recoveryButton = element("button", "reading-recovery", "🔇 소리 끄고 마이크 복구");
        recoveryButton.type = "button";
        actions.appendChild(recoveryButton);
        recoveryButton.addEventListener("click", recoverMicrophone);
      }
      recoveryButton.hidden = false;
      fallback.hidden = false;
      controls();
    }
    function recoverMicrophone() {
      if (disposed || awarded || recovering || active || soundActive) return;
      stop();
      session.silent = true;
      log("recovery-tap");
      const devices = env.navigator.mediaDevices;
      if (!devices || !devices.getUserMedia) { read(); return; }
      recovering = true; controls();
      nodes.status.textContent = "마이크 연결을 다시 준비하고 있어요…";
      const id = serial;
      // Capture is requested only by this explicit button, never automatically.
      // No recording, upload or saved audio; even a late permission result is closed.
      healthTimer = env.setTimeout(function () {
        if (!disposed && serial === id) offerRecovery("recovery-timeout");
      }, 8000);
      let request;
      try { request = devices.getUserMedia({audio: true, video: false}); }
      catch (_) { offerRecovery("recovery-failed"); return; }
      Promise.resolve(request).then(function (stream) {
        stream.getTracks().forEach(function (track) { track.stop(); });
        if (disposed || id !== serial) return;
        env.clearTimeout(healthTimer);
        healthTimer = env.setTimeout(function () {
          if (disposed || id !== serial) return;
          recovering = false; controls(); read();
        }, 350);
      }, function () {
        if (disposed || id !== serial) return;
        offerRecovery("recovery-denied");
        nodes.status.textContent = "마이크 권한을 확인한 뒤 다시 눌러 주세요. 정답 기록은 그대로예요.";
      });
    }
    function read() {
      if (nodes.mic.disabled) return;
      stop();
      unlockAudio();
      finalText = "";
      feedback("");
      const id = serial;
      let recognizer;
      try { recognizer = new Recognition(); } catch (_) {
        resetFlow(); log("mic-create-fail");
        fallback.hidden = false;
        nodes.status.textContent = "이 브라우저에서 음성 인식을 시작할 수 없어요. Safari 또는 Chrome에서 다시 열어 주세요."; return;
      }
      active = recognizer;
      recognizer.lang = "en-US";
      recognizer.continuous = true;
      recognizer.interimResults = true;
      recognizer.maxAlternatives = MAX_ALTERNATIVES;
      const valid = function () { return !disposed && !awarded && active === recognizer && id === serial; };
      recognizer.onstart = function () {
        if (!valid()) return;
        env.clearTimeout(healthTimer);
        healthTimer = env.setTimeout(function () { if (valid()) offerRecovery("result-timeout"); }, 12000);
        log("mic-on"); nodes.status.textContent = "듣고 있어요… 문장을 끝까지 읽어 주세요.";
      };
      recognizer.onresult = function (event) {
        if (!valid()) return;
        env.clearTimeout(healthTimer); healthTimer = null;
        const finals = [], visible = [];
        for (let i = 0; i < event.results.length; i++) {
          const result = event.results[i];
          const alts = [];
          const count = Math.min(result.length || 1, MAX_ALTERNATIVES);
          for (let k = 0; k < count; k++) { if (result[k] && typeof result[k].transcript === "string") alts.push(result[k].transcript); }
          if (!alts.length) alts.push("");
          visible.push(alts[0]);
          if (result.isFinal) finals.push(alts);
        }
        finalText = finals.map(function (alts) { return alts[0]; }).join(" ");
        feedback(visible.join(" "));
        if (finals.length) log("result " + finals.length + "/" + event.results.length);
        if (finals.length && anyMatches(sentence.text, finals)) {
          awarded = true;
          feedback(sentence.text);
          praise();
        } else if (finalText && !isPrefix(sentence.text, finalText)) {
          finishAttempt();
        } else {
          nodes.status.textContent = "듣고 있어요… 문장을 끝까지 읽어 주세요.";
        }
      };
      recognizer.onerror = function (event) {
        if (!valid()) return;
        resetFlow();
        log("error " + (event && event.error));
        if (event.error !== "no-speech" && event.error !== "aborted") fallback.hidden = false;
        const messages = {
          "not-allowed": "마이크 또는 음성 인식 권한을 허용해 주세요. 정답 기록은 바뀌지 않았어요.",
          "service-not-allowed": "음성 인식 서비스를 사용할 수 없어요. Safari의 Siri·받아쓰기 설정을 확인해 주세요.",
          "audio-capture": "마이크를 찾지 못했어요. 연결과 사용 권한을 확인해 주세요.",
          network: "인터넷 연결을 확인하고 다시 읽어 주세요.",
          "no-speech": "목소리를 듣지 못했어요. 마이크 가까이에서 다시 읽어 주세요.",
          "language-not-supported": "영어 음성 인식을 지원하지 않는 기기예요."
        };
        stop(messages[event.error] || "잘 듣지 못했어요. 오답이 아니니 다시 시도해 주세요.");
      };
      recognizer.onend = function () { if (valid()) { log("end"); active = null; finishAttempt(); } };
      controls();
      nodes.status.textContent = "마이크를 준비하고 있어요…";
      timer = env.setTimeout(function () { if (valid()) { log("timeout"); finishAttempt(); } }, 25000);
      healthTimer = env.setTimeout(function () { if (valid()) offerRecovery("start-timeout"); }, session.lastClip ? 4000 : 12000);
      try { recognizer.start(); log("start"); } catch (_) { resetFlow(); log("start-fail"); fallback.hidden = false; stop("마이크를 시작하지 못했어요. 잠시 후 다시 눌러 주세요."); }
    }
    nodes.mic.addEventListener("click", read);
    nodes.stop.addEventListener("click", function () {
      if (disposed || awarded) return;
      if (soundActive) { stop(); read(); }
      else if (active) finishAttempt();
    });
    const hide = function () { if (doc.hidden) { if (active) resetFlow(); stop("잠시 멈췄어요. 읽어 보기를 눌러 다시 시작해요."); if (awarded) completePass(); } };
    const leave = function () { if (active) resetFlow(); stop(); if (awarded) completePass(); };
    const offline = function () { resetFlow(); fallback.hidden = false; stop("인터넷 연결 후 다시 읽어 주세요. 다른 공부는 계속할 수 있어요."); if (awarded) completePass(); };
    const online = function () { controls(); };
    doc.addEventListener("visibilitychange", hide);
    env.addEventListener("pagehide", leave);
    env.addEventListener("offline", offline);
    env.addEventListener("online", online);
    controls();
    if (!Recognition || env.isSecureContext === false) { fallback.hidden = false; nodes.status.textContent = "이 환경에서는 음성 인식을 쓸 수 없어요. HTTPS 모험보드를 Safari 또는 Chrome에서 열어 주세요. 다른 공부는 계속할 수 있어요."; }
    else if (env.navigator.onLine === false) offline();
    return {
      stop: function () { stop("잠시 멈췄어요. 읽어 보기를 눌러 다시 시작해요."); },
      destroy: function () {
        disposed = true; stop();
        audio = null;
        doc.removeEventListener("visibilitychange", hide);
        env.removeEventListener("pagehide", leave);
        env.removeEventListener("offline", offline);
        env.removeEventListener("online", online);
        container.classList.remove("reading-practice");
      }
    };
  }
  const api = { sentences: sentences, normalize: normalize, matches: matches, sameWord: sameWord, aliases: ALIASES, isPrefix: isPrefix, alternativeTexts: alternativeTexts, anyMatches: anyMatches, wordClips: WORD_CLIPS, matchedWords: matchedWords, cleanWordScores: cleanWordScores, chooseSentence: chooseSentence, recentLimit: RECENT_LIMIT, createFeedbackSession: createFeedbackSession, choosePraise: choosePraise, retryWords: retryWords, mount: mount };
  if (typeof module !== "undefined" && module.exports) module.exports = api;
  else root.EnglishReading = api;
})(typeof window !== "undefined" ? window : globalThis);
