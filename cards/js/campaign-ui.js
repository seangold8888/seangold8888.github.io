(function () {
  "use strict";
  const C = window.CardCampaign;
  const LAST_PLAYABLE_CHAPTER = 7;
  const PORTRAIT_CROPS = {jaei: "50% 12%", taeo: "50% 12%", cinderella: "54% 14%", redhood: "47% 14%"};
  const WORLDS = [
    ["jaei", "책 속으로", "#ec8cc5"], ["cinderella", "동화를 되돌려요", "#93bcff"],
    ["honggildong", "산 너머 이야기", "#76c6a8"], ["heracles", "구름 위의 모험", "#e7bd70"],
    ["odysseus", "파도 너머로", "#79bedc"], ["guanyu", "펄럭이는 깃발", "#de9c83"],
    ["sunwukong", "화염산을 지나", "#dbaaff"], ["sseugumi", "장난꾸러기를 찾아", "#f4cf71"]
  ];
  const el = (tag, className, text) => {
    const node = document.createElement(tag);
    if (className) node.className = className;
    if (text !== undefined) node.textContent = text;
    return node;
  };
  const button = (text, className, handler) => {
    const node = el("button", className, text);
    node.type = "button";
    node.addEventListener("click", handler);
    return node;
  };
  function create(options) {
    const root = document.getElementById("campaignScreen");
    const entry = document.getElementById("campaignButton");
    const notice = document.getElementById("campaignSaveNotice");
    let progress = C.load();
    let sceneKey = "";
    let sceneLine = 0;
    let sceneDone = null;
    let selected = [];
    let restoredNow = null;
    const seen = new Set();
    const cardById = id => options.cards.find(card => card.id === id);
    function persist() {
      notice.hidden = C.save(progress);
      updateEntry();
    }
    function updateEntry() {
      entry.textContent = progress.phase === "complete"
        ? "원정 완료 · 모두 친구가 됐어요!"
        : progress.battleSerial || progress.phase !== "intro"
          ? "원정 이어서 · " + progress.chapter + "장"
          : "원정 떠나기";
    }
    function art(card, className) {
      const img = el("img", className);
      img.src = (card.art || "art/" + card.id + ".png").replace(/\.png$/i, ".webp");
      img.alt = card.name;
      img.style.objectPosition = (/world|card-art|scene-art/.test(className) && PORTRAIT_CROPS[card.id]) || window.CardView.artPosition[card.id] || "50% 30%";
      return img;
    }
    function elementInfo(card) {
      const meta = window.CardEngine.ELEMENT_CHART[card.element];
      return meta ? meta.icon + " " + meta.label : "속성 없음";
    }
    function shell(title, subtitle) {
      options.showScreen("campaign");
      root.replaceChildren();
      const head = el("header", "expedition-header");
      head.append(button("← 원정 지도", "ghost-button", showMap));
      const copy = el("div");
      copy.append(el("p", "eyebrow", subtitle), el("h1", "", title));
      head.append(copy);
      root.append(head);
    }
    function showMap() {
      shell("쓰구미 대마왕을 잡아라", "재이와 태오의 이야기 원정");
      root.querySelector(".expedition-header button").replaceWith(button("← 카드 컬렉션", "ghost-button", options.onExit));
      const intro = el("div", "expedition-map-intro");
      intro.append(el("p", "", "장난에 걸린 세계를 되돌리고, 친구를 모아요."),
        el("span", "expedition-progress", progress.cleared.length + " / 8 세계"));
      const map = el("div", "expedition-map");
      map.setAttribute("aria-label", "이야기 세계 지도");
      C.CHAPTERS.forEach(chapter => {
        const cleared = progress.cleared.includes(chapter.id);
        const current = chapter.id === progress.chapter;
        const available = current && chapter.id <= LAST_PLAYABLE_CHAPTER && progress.phase !== "complete";
        const node = button("", "expedition-world" + (cleared ? " is-restored" : "") + (available ? " is-current" : ""), resume);
        node.disabled = !available;
        node.dataset.chapter = chapter.id;
        node.style.setProperty("--world-accent", WORLDS[chapter.id][2]);
        if (current) node.setAttribute("aria-current", "step");
        const portrait = cardById(WORLDS[chapter.id][0]);
        if (portrait) node.append(art(portrait, "expedition-world-art"));
        else node.append(el("span", "expedition-palace", "♛"));
        node.append(el("span", "expedition-world-number", String(chapter.id).padStart(2, "0")),
          el("span", "expedition-sticker", cleared ? "✓" : "♛"));
        if (chapter.id === restoredNow) {
          const sticker = el("span", "expedition-sticker expedition-peeled-sticker", "♛");
          sticker.setAttribute("aria-hidden", "true");
          node.append(sticker);
        }
        const text = el("span", "expedition-world-copy");
        text.append(el("strong", "", chapter.name), el("small", "", cleared ? "장난을 풀었어요" : available ? "이어서 모험하기 →" : "다음 이야기"));
        node.append(text);
        map.append(node);
      });
      root.append(intro, map);
      const foot = el("div", "expedition-map-footer");
      if (progress.phase === "complete") {
        foot.append(el("strong", "", "쓰구미 대마왕도 우리 친구!"), el("p", "", "여덟 세계를 모두 되돌렸어요. 쓰구미 카드가 컬렉션에서 기다려요."),
          button("친구가 된 카드 보러 가기", "primary-button", options.onExit));
      } else {
        const chapter = C.CHAPTERS[progress.chapter];
        foot.append(el("span", "", chapter.name + " · " + Math.min(progress.stage + 1, C.encounterIds(chapter.id).length) + "/" + C.encounterIds(chapter.id).length),
          button(progress.phase === "intro" && !progress.battleSerial ? "책 속으로 출발 →" : "이어서 하기 →", "primary-button", resume));
      }
      root.append(foot);
      restoredNow = null;
    }
    function portraitButton(card, onClick, extra) {
      const node = button("", "expedition-card" + (extra || ""), onClick);
      node.dataset.cardId = card.id;
      node.append(art(card, "expedition-card-art"));
      const copy = el("span", "expedition-card-copy");
      copy.append(el("strong", "", card.name), el("span", "", elementInfo(card) + " · ♥ " + card.hp));
      node.append(copy);
      return node;
    }
    function opponents() {
      const list = el("div", "expedition-opponents");
      list.setAttribute("aria-label", "이번 장의 상대와 보스");
      C.encounterIds(progress.chapter).forEach((id, stage) => {
        const opponent = C.encounter(progress.chapter, stage, options.cards);
        const item = el("div", "expedition-opponent-chip");
        item.append(el("small", "", opponent.boss ? "보스" : "상대 " + (stage + 1)),
          el("strong", "", opponent.card.name), el("span", "", elementInfo(opponent.card) + " · ♥ " + opponent.card.hp));
        list.append(item);
      });
      return list;
    }
    function showParty() {
      shell("함께 갈 친구 셋을 골라요", progress.chapter + "장 · " + C.CHAPTERS[progress.chapter].name);
      root.append(opponents());
      const slots = el("div", "expedition-slots");
      for (let i = 0; i < 3; i++) {
        const card = cardById(selected[i]);
        slots.append(card ? portraitButton(card, () => {selected = selected.filter(id => id !== card.id); showParty();}, " is-picked") : el("div", "expedition-empty-slot", "+ 친구 " + (i + 1)));
      }
      root.append(slots, el("p", "expedition-help", "상대 색을 보고 골라요. 진 친구는 이번 장에서 쉬어요."));
      const choices = el("div", "expedition-candidates");
      C.candidatesForChapter(progress.chapter).forEach(id => {
        const chosen = selected.includes(id);
        const node = portraitButton(cardById(id), () => {
          if (chosen) selected = selected.filter(item => item !== id);
          else if (selected.length < 3) selected.push(id);
          showParty();
        }, chosen ? " is-picked" : "");
        node.setAttribute("aria-pressed", String(chosen));
        node.disabled = !chosen && selected.length === 3;
        choices.append(node);
      });
      const go = button("이 친구들과 출발 · " + selected.length + "/3", "primary-button expedition-go", () => {
        progress = C.selectParty(progress, selected); persist(); resume();
      });
      go.disabled = selected.length !== 3;
      root.append(choices, go);
    }
    function showScene(kind, done) {
      const key = progress.chapter + ":" + progress.stage + ":" + kind + ":" + progress.endingScene;
      if (sceneKey !== key) {sceneKey = key; sceneLine = 0;}
      sceneDone = done;
      const lines = kind === "ending" ? C.ENDING[progress.endingScene] : C.SCENES[progress.chapter][kind];
      const pageSize = C.SCENE_PAGE_SIZE;
      const pageIndex = Math.floor(sceneLine / pageSize);
      const pageCount = Math.ceil(lines.length / pageSize);
      const lastPage = sceneLine + pageSize >= lines.length;
      const title = kind === "ending" ? ["굴러간 왕관", "우리랑 놀자", "우리 집 아침", "우리가 지킨 이야기"][progress.endingScene] : C.CHAPTERS[progress.chapter].name;
      shell(title, kind === "ending" ? "결말 · " + (progress.endingScene + 1) + "/4" : kind === "restore" ? "이야기를 되돌렸어요" : "책장을 넘겨요");
      const row = C.CHAPTERS[progress.chapter];
      const id = kind === "ending" ? (progress.endingScene === 1 ? "taeo" : "sseugumi") : kind === "restore" ? row.recruit : kind === "beforeBoss" ? row.boss : kind === "beforeBattle" ? row.enemies[0] : progress.chapter === 0 ? "jaei" : WORLDS[progress.chapter][0];
      const scene = el("div", "expedition-scene");
      scene.dataset.sceneKey = key;
      scene.dataset.page = String(pageIndex);
      scene.dataset.pageCount = String(pageCount);
      const familyEnding = kind === "ending" && progress.endingScene === 2;
      if (familyEnding) scene.className += " is-family-ending";
      scene.append(art(familyEnding ? {id:"family-ending",name:"재이와 태오의 가족",art:"../math/assets/jaei-family-v4.webp"} : cardById(id), "expedition-scene-art"));
      const sheet = el("div", "expedition-scene-sheet");
      sheet.append(el("span", "eyebrow", "이야기 " + (pageIndex + 1) + " / " + pageCount + "쪽"));
      const text = el("div", "expedition-scene-lines");
      text.setAttribute("aria-live", "polite");
      lines.slice(sceneLine, sceneLine + pageSize).forEach(line => text.append(el("p", "", line)));
      sheet.append(text);
      if (kind === "beforeBoss" && progress.chapter === 1 && lastPage) {
        sheet.append(el("p", "expedition-rule-note", "상대의 물 속성은 땅에 약해요. 땅 → 물, 피해 +10."));
      }
      const advance = () => {
        if (!lastPage) {sceneLine += pageSize; showScene(kind, done);}
      };
      scene.querySelector("img").addEventListener("click", advance);
      text.addEventListener("click", advance);
      const controls = el("div", "expedition-page-controls");
      const previous = button("← 이전 쪽", "ghost-button expedition-previous", () => {
        if (sceneLine > 0) {sceneLine -= pageSize; showScene(kind, done);}
      });
      previous.disabled = pageIndex === 0;
      controls.append(previous, button(lastPage ? "다음 장면 →" : "다음 쪽 →", "primary-button", () => {
        if (!lastPage) advance();
        else {const callback = sceneDone; sceneKey = ""; sceneDone = null; callback();}
      }));
      sheet.append(controls);
      scene.append(sheet);
      root.append(scene);
    }
    function showEncounter() {
      const opponent = C.encounter(progress.chapter, progress.stage, options.cards);
      shell("누가 나설까요?", progress.chapter + "장 · " + C.CHAPTERS[progress.chapter].name + " · " + (progress.stage + 1) + "/" + C.encounterIds(progress.chapter).length);
      const target = el("div", "expedition-target");
      target.append(art(opponent.card, "expedition-target-art"));
      const info = el("div");
      info.append(el("p", "eyebrow", opponent.boss ? "장난에 걸린 보스" : "장난에 걸린 상대"), el("h2", "", opponent.card.name),
        el("strong", "", elementInfo(opponent.card) + " · ♥ " + opponent.card.hp));
      const weak = window.CardEngine.ELEMENT_CHART[opponent.card.element];
      if (weak) info.append(el("p", "", "약점: " + elementInfo({element: weak.weakTo}) + "에게 피해 +10"));
      if (opponent.card.passive) info.append(el("p", "expedition-passive", opponent.card.passive.name + " · " + opponent.card.passive.desc));
      target.append(info);
      root.append(target, el("p", "expedition-help", progress.chapter === 0 ? "재이가 먼저 나서요. 물은 불을 이겨요. 상대 색을 보고 골라요." : "이기면 다음 상대! 진 친구는 이번 장에서 쉬어요."));
      const party = el("div", "expedition-slots expedition-deploy");
      progress.party.forEach(id => {
        const card = cardById(id);
        const resting = progress.resting.includes(id);
        const node = portraitButton(card, () => {
          const next = C.beginBattle(progress, id);
          if (next.phase !== "battle") return;
          progress = next; persist();
          options.onBattle({campaign: true, player: card, enemy: opponent.card, options: opponent.options,
            serial: progress.battleSerial, label: progress.chapter + "장 · " + C.CHAPTERS[progress.chapter].name + " · " + (progress.stage + 1) + "/" + C.encounterIds(progress.chapter).length});
        }, resting ? " is-resting" : "");
        node.disabled = resting;
        const advantage = weak && weak.weakTo === card.element;
        node.append(el("span", "expedition-card-badge", resting ? "이번 장에서 쉬는 중" : advantage ? "상성 유리 · 피해 +10" : "출전하기 →"));
        party.append(node);
      });
      root.append(party);
    }
    function resume() {
      if (progress.phase === "complete") return showMap();
      if (progress.chapter > LAST_PLAYABLE_CHAPTER) return showMap();
      if (progress.phase === "intro") return showScene("intro", () => {progress = C.finishIntro(progress); persist(); resume();});
      if (progress.phase === "party") {selected = progress.party.slice(); return showParty();}
      if (progress.phase === "restore") {
        if (progress.chapter === 7) return showScene("ending", () => {
          if (progress.endingScene < 3) {progress = C.advanceEnding(progress); persist(); resume();}
          else {restoredNow = 7; progress = C.finishChapter(progress); persist(); showMap();}
        });
        return showScene("restore", () => {restoredNow = progress.chapter; progress = C.finishChapter(progress); persist(); showMap();});
      }
      if (progress.phase === "battle") {progress = C.normaliseProgress(progress, true); persist();}
      const scene = progress.chapter === 0 ? "beforeBattle" : progress.stage === 3 ? "beforeBoss" : null;
      const key = progress.chapter + ":" + progress.stage + ":" + scene;
      if (scene && !seen.has(key)) return showScene(scene, () => {seen.add(key); showEncounter();});
      showEncounter();
    }
    function settle(serial, winner) {
      if (progress.phase !== "battle" || progress.battleSerial !== serial || !["player", "enemy"].includes(winner)) return "이미 기록한 대결이에요.";
      const current = progress;
      progress = C.finishBattle(progress, serial, winner);
      persist();
      if (winner === "player") return progress.phase === "restore" ? "장난을 풀었어요! 다음 장면에서 새 친구를 만나요." : "장난을 풀었어요! 다음 상대를 만나러 가요.";
      return progress.phase === "intro" ? "친구들이 모두 쉬었어요. 전원 돌아와 이 장의 처음부터 다시 출발해요." : cardById(current.activeCard).name + "는 이번 장에서 쉬어요. 남은 친구로 다시 도전해요.";
    }
    function pause() {
      if (progress.phase === "battle") {progress = C.normaliseProgress(progress, true); persist();}
    }
    entry.addEventListener("click", () => {window.CardAudio.prime(); showMap();});
    updateEntry();
    return {showMap, resume, settle, pause, hasRecruited: id => progress.recruited.includes(id)};
  }
  window.CardCampaignUI = Object.freeze({create, LAST_PLAYABLE_CHAPTER});
})();
