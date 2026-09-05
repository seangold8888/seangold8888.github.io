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
  function matches(expected, heard) {
    return !!normalize(expected) && normalize(expected) === normalize(heard);
  }
  // Ordered alignment is feedback, never a partial-credit scoring rule.
  function matchedWords(expected, heard) {
    const words = normalize(expected).split(" "), got = normalize(heard).split(" ");
    let position = 0;
    return words.map(function (word) {
      const index = got.indexOf(word, position);
      if (index < 0) return false;
      position = index + 1;
      return true;
    });
  }

  function mount(container, sentence, onPass, env) {
    env = env || root;
    const doc = env.document;
    let disposed = false, awarded = false, active = null, serial = 0, timer = null, utterance = null;
    const Recognition = env.SpeechRecognition || env.webkitSpeechRecognition;
    const synth = env.speechSynthesis;
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
    nodes.listen = element("button", "", "🔊 먼저 듣기");
    nodes.mic = element("button", "", "🎤 읽어 보기");
    nodes.stop = element("button", "", "그만하기");
    [nodes.listen, nodes.mic, nodes.stop].forEach(function (button) {
      button.type = "button"; actions.appendChild(button);
    });
    nodes.status = element("p", "reading-status", "잘 들리는 목소리로 읽어 주세요. 크게 외치지 않아도 돼요.");
    nodes.status.setAttribute("role", "status");
    nodes.heard = element("p", "reading-heard");
    nodes.heard.lang = "en";
    const privacy = element("p", "reading-privacy",
      "부모님 안내: ‘읽어 보기’를 누를 때만 마이크를 켭니다. 음성은 브라우저의 인식 서비스로 전송될 수 있고 인터넷이 필요할 수 있어요. 이 사이트는 음성과 인식 문장을 저장하지 않습니다. 발음 점수가 아닌 문장 읽기를 확인해요.");
    [label, line, meaning, actions, nodes.status, nodes.heard, privacy].forEach(function (node) { container.appendChild(node); });

    function controls() {
      nodes.mic.disabled = disposed || awarded || !!active || !!utterance || !Recognition || env.isSecureContext === false || env.navigator.onLine === false;
      nodes.listen.disabled = disposed || awarded || !!active || !!utterance || !synth || !env.SpeechSynthesisUtterance;
      nodes.stop.disabled = !active && !utterance;
    }
    function stop(message) {
      serial++;
      env.clearTimeout(timer); timer = null;
      const previous = active; active = null;
      if (previous) {
        previous.onresult = previous.onerror = previous.onend = previous.onstart = null;
        try { previous.abort(); } catch (_) {}
      }
      if (utterance) {
        utterance.onend = utterance.onerror = null;
        utterance = null;
        synth.cancel();
      }
      controls();
      if (message && !disposed) nodes.status.textContent = message;
    }
    function feedback(text) {
      nodes.heard.textContent = text ? "“" + text + "”" : "";
      const flags = matchedWords(sentence.text, text);
      Array.from(line.children).forEach(function (word, i) { word.classList.toggle("heard", !!flags[i]); });
    }
    function read() {
      if (nodes.mic.disabled) return;
      // Never let the model voice award a reading success.
      if (synth && synth.speaking) {
        synth.cancel(); nodes.status.textContent = "먼저 듣기가 멈췄어요. 읽어 보기를 다시 눌러 주세요."; return;
      }
      stop();
      feedback("");
      const id = serial;
      let recognizer;
      try { recognizer = new Recognition(); } catch (_) {
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
        feedback(visible.join(" "));
        if (matches(sentence.text, final.join(" "))) {
          awarded = true;
          feedback(sentence.text);
          stop("문장을 끝까지 읽었어요! ⭐");
          onPass();
        } else {
          nodes.status.textContent = final.length ? "들은 단어가 초록색이에요. 끝까지 읽거나, 그만하기 후 다시 시도해요." : "듣고 있어요…";
        }
      };
      recognizer.onerror = function (event) {
        if (!valid()) return;
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
      recognizer.onend = function () { if (valid()) stop("아직 문장 전체를 확인하지 못했어요. 읽어 보기를 눌러 다시 읽어요."); };
      controls();
      nodes.status.textContent = "마이크를 준비하고 있어요…";
      timer = env.setTimeout(function () { if (valid()) stop("듣기를 마쳤어요. 읽어 보기를 눌러 다시 시도해 주세요."); }, 25000);
      try { recognizer.start(); } catch (_) { stop("마이크를 시작하지 못했어요. 잠시 후 다시 눌러 주세요."); }
    }
    function listen() {
      if (nodes.listen.disabled) return;
      stop();
      const id = serial;
      const speech = new env.SpeechSynthesisUtterance(sentence.text);
      speech.lang = "en-US"; speech.rate = 0.8;
      const voice = synth.getVoices().find(function (v) { return /^en[-_]/i.test(v.lang); });
      if (voice) speech.voice = voice;
      utterance = speech;
      speech.onend = function () { if (!disposed && id === serial) { utterance = null; env.clearTimeout(timer); controls(); nodes.status.textContent = "이제 읽어 보기를 눌러 재이 목소리로 읽어요."; } };
      speech.onerror = function () { if (!disposed && id === serial) stop("영어 음성을 재생하지 못했어요. 문장을 보고 읽어도 괜찮아요."); };
      controls();
      nodes.status.textContent = "먼저 들어 보세요.";
      timer = env.setTimeout(function () { if (!disposed && id === serial) stop("먼저 듣기를 마쳤어요. 이제 직접 읽어 보세요."); }, 15000);
      try { synth.speak(speech); } catch (_) { stop("먼저 듣기를 재생하지 못했어요."); }
    }
    nodes.listen.addEventListener("click", listen);
    nodes.mic.addEventListener("click", read);
    nodes.stop.addEventListener("click", function () { stop("멈췄어요. 준비되면 다시 읽어 주세요."); });
    const hide = function () { if (doc.hidden) stop("잠시 멈췄어요. 읽어 보기를 눌러 다시 시작해요."); };
    const leave = function () { stop(); };
    const offline = function () { stop("인터넷 연결 후 다시 읽어 주세요. 다른 공부는 계속할 수 있어요."); };
    const online = function () { controls(); };
    doc.addEventListener("visibilitychange", hide);
    env.addEventListener("pagehide", leave);
    env.addEventListener("offline", offline);
    env.addEventListener("online", online);
    controls();
    if (!Recognition || env.isSecureContext === false) nodes.status.textContent = "이 환경에서는 음성 인식을 쓸 수 없어요. HTTPS 모험보드를 Safari 또는 Chrome에서 열어 주세요. 다른 공부는 계속할 수 있어요.";
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
  const api = { sentences: sentences, normalize: normalize, matches: matches, matchedWords: matchedWords, mount: mount };
  if (typeof module !== "undefined" && module.exports) module.exports = api;
  else root.EnglishReading = api;
})(typeof window !== "undefined" ? window : globalThis);

