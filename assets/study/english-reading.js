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
    ["I love my family.", "나는 우리 가족을 사랑해요."]
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
  const PHRASES = [["to get her", "together"], ["to gather", "together"], ["o pen", "open"], ["a pples", "apples"]];
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
    love: ["lov", "lub", "rob", "luv", "loves", "lof", "laugh", "lav", "rove"]
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
  function chooseSentence(scores, ordinal, previous, random) {
    scores = cleanWordScores(scores);
    const base = ordinal % sentences.length;
    if (!Object.keys(scores).length) return base === previous ? (base + 1) % sentences.length : base;
    const weights = sentences.map(function (sentence, idx) {
      if (idx === previous) return 0;
      return 1 + Math.min(8, normalize(sentence.text).split(" ").reduce(function (sum, word) { return sum + (scores[word] || 0); }, 0));
    });
    let draw = (random || Math.random)() * weights.reduce(function (sum, value) { return sum + value; }, 0);
    for (let i = 0; i < weights.length; i++) { draw -= weights[i]; if (draw < 0) return i; }
    return base === previous ? (base + 1) % sentences.length : base;
  }
  const FIRST_PRAISE = ["excellent", "perfect", "awesome", "wonderful"];
  const RETRY_PRAISE = ["great", "verygood", "youdidit", "super"];
  const PRAISE_TEXT = { excellent: "Excellent!", perfect: "Perfect!", awesome: "Awesome!", wonderful: "Wonderful!", great: "Great!", verygood: "Very good!", youdidit: "You did it!", super: "Super!", threeinarow: "Three in a row!" };
  const sessions = new WeakMap();
  function createFeedbackSession() { return { streak: 0, lastClip: null }; }
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
  function mount(container, sentence, onPass, env, callbacks) {
    env = env || root;
    callbacks = callbacks || {};
    const doc = env.document;
    if (!sessions.has(env)) sessions.set(env, createFeedbackSession());
    const session = sessions.get(env);
    let disposed = false, awarded = false, active = null, serial = 0, timer = null, finalText = "";
    let retried = false, soundActive = false, soundTimer = null, stopTimer = null, audio = null, unlocked = false, passDone = false, stopping = null;
    const synth = env.speechSynthesis;
    const Recognition = env.SpeechRecognition || env.webkitSpeechRecognition;
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
      "부모님 안내: ‘읽어 보기’를 누를 때만 마이크를 켭니다. 음성은 브라우저의 인식 서비스로 전송될 수 있어요. 음성과 인식 문장은 저장하지 않고, 연습할 교재 단어와 복습 횟수만 이 기기에 기억해요. 발음 점수가 아닌 문장 읽기를 확인해요.");
    [label, line, meaning, actions, nodes.status, nodes.heard, privacy].forEach(function (node) { container.appendChild(node); });

    function controls() {
      nodes.mic.disabled = disposed || awarded || !!active || soundActive || !Recognition || env.isSecureContext === false || env.navigator.onLine === false;
      nodes.stop.disabled = disposed || awarded || !!stopping || (!active && !soundActive);
      nodes.stop.textContent = soundActive && !awarded ? "안내 멈추고 읽기" : "그만하기";
    }
    function cancelSound() {
      env.clearTimeout(soundTimer); soundTimer = null;
      if (synth) { try { synth.cancel(); } catch (_) {} }
      if (audio) { audio.onended = audio.onerror = audio.ontimeupdate = null; try { audio.pause(); } catch (_) {} }
      soundActive = false;
      Array.from(line.children).forEach(function (word) { word.classList.remove("listening"); });
    }
    function stop(message, after) {
      serial++;
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
            if (!disposed && id === serial) after(safe);
          };
          soundActive = true;
          stopping = previous;
          previous.onend = function () { ended(true); };
          // No end event means no audio: speakers must never overlap a live mic.
          stopTimer = env.setTimeout(function () { previous.onend = null; try { previous.abort(); } catch (_) {} ended(false); }, 600);
          try { previous.stop(); } catch (_) { try { previous.abort(); } catch (_) {} ended(false); }
        } else { try { previous.abort(); } catch (_) {} }
      }
      controls();
      if (message && !disposed) nodes.status.textContent = message;
      if (!previous && after) after(true);
    }
    function resetFlow() { retried = true; session.streak = 0; }
    function unlockAudio() {
      if (unlocked) return;
      unlocked = true;
      try {
        if (synth && env.SpeechSynthesisUtterance && synth.getVoices().some(function (v) { return /^en(?:[-_]|$)/i.test(v.lang); })) {
          synth.speak(new env.SpeechSynthesisUtterance(""));
          synth.cancel();
        }
      } catch (_) {}
      try {
        if (env.Audio) {
          audio = new env.Audio("assets/study/praise/excellent.mp3");
          audio.preload = "auto";
          audio.load();
        }
      } catch (_) { audio = null; }
    }
    function completePass() {
      if (disposed || passDone) return;
      passDone = true;
      cancelSound();
      onPass();
    }
    function praise() {
      const clip = choosePraise(session, !retried);
      const fullClip = clip === "threeinarow";
      function waitForPlayback() {
        env.clearTimeout(soundTimer);
        soundTimer = env.setTimeout(completePass, fullClip ? 5000 : 1800);
      }
      nodes.status.textContent = "";
      nodes.status.appendChild(element("span", "reading-praise", (clip === "threeinarow" ? "🌟 " : "⭐ ") + PRAISE_TEXT[clip]));
      nodes.status.appendChild(element("span", "reading-praise-detail", clip === "threeinarow" ? "세 문장 연속!" : retried ? "다시 읽어서 해냈어!" : "한 번에 읽었어!"));
      if (clip === "threeinarow") {
        const stars = element("span", "reading-star-burst", "★ ✦ ⭐ ✦ ★");
        stars.setAttribute("aria-hidden", "true"); nodes.status.appendChild(stars);
      }
      stop(null, function (safe) {
        if (!safe || !audio) { soundActive = false; controls(); return; }
        const id = serial;
        soundActive = true;
        controls();
        audio.src = "assets/study/praise/" + clip + ".mp3";
        audio.onended = completePass;
        // The special clip has no duration cap; recover only if playback stops progressing.
        if (fullClip) audio.ontimeupdate = waitForPlayback;
        audio.onerror = function () { try { audio.pause(); } catch (_) {} };
        try {
          const playing = audio.play();
          if (playing && playing.catch) playing.catch(function () { if (id === serial) { audio.pause(); } });
        } catch (_) {}
      });
      // Ordinary praise keeps its 1.8s cap. The special clip waits for ended;
      // its watchdog is renewed by playback progress so the final words are never cut.
      if (!disposed && !passDone) waitForPlayback();
    }
    function speakWords(words, safe) {
      soundActive = false;
      let voices = [];
      try { voices = synth ? synth.getVoices().filter(function (v) { return /^en(?:[-_]|$)/i.test(v.lang); }) : []; } catch (_) {}
      if (!safe || !words.length || !voices.length || !env.SpeechSynthesisUtterance) { controls(); return; }
      const voice = voices.find(function (v) { return /^en[-_]US$/i.test(v.lang) && v.localService; }) || voices.find(function (v) { return /^en[-_]US$/i.test(v.lang); }) || voices[0];
      const id = serial;
      let index = 0;
      soundActive = true; controls();
      function next() {
        if (disposed || id !== serial) return;
        Array.from(line.children).forEach(function (word) { word.classList.remove("listening"); });
        if (index >= words.length) { cancelSound(); controls(); return; }
        const word = words[index++];
        nodes.status.textContent = "이렇게 읽어요 👂 " + word;
        const target = Array.from(line.children).find(function (node) { return node.classList.contains("retry") && normalize(node.textContent) === word; });
        if (target) target.classList.add("listening");
        const utterance = new env.SpeechSynthesisUtterance(word);
        utterance.lang = "en-US"; utterance.voice = voice; utterance.rate = 0.8; utterance.pitch = 1.0;
        let ended = false;
        utterance.onend = function () {
          if (ended || disposed || id !== serial) return;
          ended = true; env.clearTimeout(soundTimer);
          soundTimer = env.setTimeout(next, index < words.length ? 400 : 0);
        };
        utterance.onerror = function () {
          if (ended || disposed || id !== serial) return;
          ended = true; cancelSound(); controls();
        };
        soundTimer = env.setTimeout(utterance.onerror, 4000);
        try { synth.speak(utterance); } catch (_) { utterance.onerror(); }
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
        stop(spoken.length ? "이렇게 읽어요 👂 " + spoken[0] : "문장에 있는 말만 읽어 주세요", function (safe) { speakWords(spoken, safe); });
        if (callbacks.onRetry) callbacks.onRetry(Array.from(new Set(words)));
      } else {
        stop("잘 듣지 못했어요. 읽어 보기를 눌러 다시 읽어 주세요.");
      }
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
        resetFlow();
        fallback.hidden = false;
        nodes.status.textContent = "이 브라우저에서 음성 인식을 시작할 수 없어요. Safari 또는 Chrome에서 다시 열어 주세요."; return;
      }
      active = recognizer;
      recognizer.lang = "en-US";
      recognizer.continuous = true;
      recognizer.interimResults = true;
      recognizer.maxAlternatives = 1;
      const valid = function () { return !disposed && !awarded && active === recognizer && id === serial; };
      recognizer.onstart = function () { if (valid()) nodes.status.textContent = "듣고 있어요… 문장을 끝까지 읽어 주세요."; };
      recognizer.onresult = function (event) {
        if (!valid()) return;
        const final = [], visible = [];
        for (let i = 0; i < event.results.length; i++) {
          const result = event.results[i];
          const text = result[0] && result[0].transcript || "";
          visible.push(text);
          if (result.isFinal) final.push(text);
        }
        finalText = final.join(" ");
        feedback(visible.join(" "));
        if (matches(sentence.text, finalText)) {
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
      recognizer.onend = function () { if (valid()) { active = null; finishAttempt(); } };
      controls();
      nodes.status.textContent = "마이크를 준비하고 있어요…";
      timer = env.setTimeout(function () { if (valid()) finishAttempt(); }, 25000);
      try { recognizer.start(); } catch (_) { resetFlow(); fallback.hidden = false; stop("마이크를 시작하지 못했어요. 잠시 후 다시 눌러 주세요."); }
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
        doc.removeEventListener("visibilitychange", hide);
        env.removeEventListener("pagehide", leave);
        env.removeEventListener("offline", offline);
        env.removeEventListener("online", online);
        container.classList.remove("reading-practice");
      }
    };
  }
  const api = { sentences: sentences, normalize: normalize, matches: matches, sameWord: sameWord, aliases: ALIASES, isPrefix: isPrefix, matchedWords: matchedWords, cleanWordScores: cleanWordScores, chooseSentence: chooseSentence, createFeedbackSession: createFeedbackSession, choosePraise: choosePraise, retryWords: retryWords, mount: mount };
  if (typeof module !== "undefined" && module.exports) module.exports = api;
  else root.EnglishReading = api;
})(typeof window !== "undefined" ? window : globalThis);
