// 보스전 무대와 오늘의 보스.
// 보스 등장 장면·보스 체력 막대·화남 순간·격파 도장은 그림만 바꾼다. 카드 수치와 엔진은 그대로다.
// 오늘의 보스는 원정을 한 번 끝낸 뒤 날마다 바뀌는 보스와 다시 붙어 왕관을 모으는 놀이다.
(function (root, factory) {
  "use strict";
  const api = factory(root);
  if (typeof module === "object" && module.exports) module.exports = api;
  if (root) root.CardBossStage = api;
})(typeof globalThis !== "undefined" ? globalThis : this, function (root) {
  "use strict";

  const STORAGE_KEY = "card_boss_crowns";
  // 원정 보스 순서 그대로(1장~7장). 오늘의 보스는 이 줄을 날짜로 돈다.
  const BOSSES = Object.freeze([
    Object.freeze({id: "snowqueen", chapter: 1}),
    Object.freeze({id: "tiger", chapter: 2}),
    Object.freeze({id: "cerberus", chapter: 3}),
    Object.freeze({id: "polyphemus", chapter: 4}),
    Object.freeze({id: "guanyu", chapter: 5}),
    Object.freeze({id: "wumawang", chapter: 6}),
    Object.freeze({id: "sseugumi", chapter: 7})
  ]);
  // 원정 장면 글에서 가져온 말투. 누나가 흉내 내며 읽기 좋게 짧게 둔다.
  const LINES = Object.freeze({
    snowqueen: Object.freeze({intro: "누가 내 성에 이런 장난을 했지? 다가오지 마!", rage: "눈보라가 더 세졌어요! 조금만 더!", defeat: "왕관 스티커가 톡 떨어졌어요!"}),
    tiger: Object.freeze({intro: "떡 하나 주면… 에취! 이건 겨자 떡이잖아!", rage: "어흥! 매워서 눈물이 찔끔! 조금만 더!", defeat: "호랑이가 물통으로 달려가요!"}),
    cerberus: Object.freeze({intro: "멍! 멍! 멍! 리본 때문에 고개가 안 돌아가!", rage: "세 머리가 한꺼번에 짖어요! 조금만 더!", defeat: "리본이 스르르 풀렸어요!"}),
    polyphemus: Object.freeze({intro: "으하하하! 간지러워! 저리 가!", rage: "깃털이 더 간질간질! 조금만 더!", defeat: "깃털이 바다로 날아가요!"}),
    guanyu: Object.freeze({intro: "웃지 마라. 수염 이야기는 하지 마라!", rage: "수염 매듭이 흔들려요! 조금만 더!", defeat: "수염 매듭이 풀렸어요!"}),
    wumawang: Object.freeze({intro: "딸랑딸랑! 이 방울 누가 달았어!", rage: "방울 소리가 쩌렁쩌렁! 조금만 더!", defeat: "방울이 툭 떨어졌어요!"}),
    sseugumi: Object.freeze({intro: "드디어 왔네, 쓰구미~. 마지막 장난을 보여 주지, 쓰구미~!", rage: "삐졌어! 이제 진짜 장난칠 거야, 쓰구미~!", defeat: "왕관이 데굴데굴~ 쓰구미~"})
  });
  const FALLBACK_LINES = Object.freeze({intro: "장난에 걸린 보스가 길을 막았어요!", rage: "보스가 화났어요! 조금만 더!", defeat: "장난이 풀렸어요!"});

  // 받침이 있으면 "이", 없으면 "가". 눈의 여왕이 / 관우가.
  function withSubject(name) {
    const text = String(name || "");
    const code = text.charCodeAt(text.length - 1) - 0xac00;
    return text + (code >= 0 && code <= 11171 && code % 28 !== 0 ? "이" : "가");
  }
  function linesFor(id) {
    return LINES[id] || FALLBACK_LINES;
  }
  // 보스 체력 단계. 반 아래로 내려가면 화남, 다섯에 하나 아래면 거의 다 왔다.
  function phaseFor(hp, maxHp) {
    const max = Math.max(1, Number(maxHp) || 1);
    const ratio = Math.max(0, Number(hp) || 0) / max;
    if (ratio <= 0) return "down";
    if (ratio <= 0.2) return "low";
    if (ratio <= 0.5) return "rage";
    return "calm";
  }

  // ---- 오늘의 보스 (순수 함수, 노드 검사용) ----
  function pad(value) { return String(value).padStart(2, "0"); }
  function localDay(date) {
    const d = date instanceof Date ? date : new Date();
    return d.getFullYear() + "-" + pad(d.getMonth() + 1) + "-" + pad(d.getDate());
  }
  function dayNumber(day) {
    const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(day || ""));
    if (!match) return 0;
    return Math.floor(Date.UTC(Number(match[1]), Number(match[2]) - 1, Number(match[3])) / 86400000);
  }
  function dailyBoss(day) {
    const n = dayNumber(day);
    return BOSSES[((n % BOSSES.length) + BOSSES.length) % BOSSES.length];
  }
  function emptyCrowns() {
    return {version: 1, crowns: {}, wonDay: ""};
  }
  function normaliseCrowns(raw) {
    const fresh = emptyCrowns();
    if (!raw || typeof raw !== "object" || raw.version !== 1 || !raw.crowns || typeof raw.crowns !== "object") return fresh;
    BOSSES.forEach(boss => {
      const count = raw.crowns[boss.id];
      if (Number.isSafeInteger(count) && count > 0) fresh.crowns[boss.id] = count;
    });
    fresh.wonDay = typeof raw.wonDay === "string" && /^\d{4}-\d{2}-\d{2}$/.test(raw.wonDay) ? raw.wonDay : "";
    return fresh;
  }
  function storageOrDefault(storage) {
    return storage === undefined ? root && root.localStorage : storage;
  }
  function loadCrowns(storage) {
    try { return normaliseCrowns(JSON.parse(storageOrDefault(storage).getItem(STORAGE_KEY))); }
    catch (error) { return emptyCrowns(); }
  }
  function saveCrowns(state, storage) {
    try {
      storageOrDefault(storage).setItem(STORAGE_KEY, JSON.stringify(normaliseCrowns(state)));
      return true;
    } catch (error) { return false; }
  }
  // 오늘의 보스를 오늘 처음 이기면 왕관 하나. 다른 보스와 붙는 건 연습이라 왕관이 없다.
  function awardCrown(state, bossId, day) {
    const next = normaliseCrowns(state);
    if (dailyBoss(day).id !== bossId || next.wonDay === day) return {state: next, awarded: false};
    next.crowns[bossId] = (next.crowns[bossId] || 0) + 1;
    next.wonDay = day;
    return {state: next, awarded: true};
  }
  function totalCrowns(state) {
    const crowns = normaliseCrowns(state).crowns;
    return BOSSES.reduce((sum, boss) => sum + (crowns[boss.id] || 0), 0);
  }
  function crownSetComplete(state) {
    const crowns = normaliseCrowns(state).crowns;
    return BOSSES.every(boss => (crowns[boss.id] || 0) > 0);
  }

  // ---- 전투 무대 (브라우저 전용) ----
  function el(tag, className, text) {
    const node = root.document.createElement(tag);
    if (className) node.className = className;
    if (text !== undefined) node.textContent = text;
    return node;
  }
  function reducedMotion() {
    return Boolean(root.matchMedia && root.matchMedia("(prefers-reduced-motion: reduce)").matches);
  }
  function artSrc(card) {
    return (card.art || "art/" + card.id + ".png").replace(/\.png$/i, ".webp");
  }
  function sound(name) {
    try {
      if (root.CardAudio && typeof root.CardAudio[name] === "function") root.CardAudio[name]();
    } catch (error) { /* 소리가 없어도 무대는 계속된다. */ }
  }

  function createStage(arena) {
    let active = null;
    let timers = [];
    let bar = null;
    function later(fn, ms) {
      const id = root.setTimeout(fn, ms);
      timers.push(id);
      return id;
    }
    function clearTimers() {
      timers.forEach(id => root.clearTimeout(id));
      timers = [];
    }
    function removeOverlays() {
      arena.querySelectorAll(".boss-intro, .boss-banner, .boss-defeat").forEach(node => node.remove());
    }
    function reset() {
      clearTimers();
      removeOverlays();
      if (bar) bar.remove();
      bar = null;
      active = null;
      arena.classList.remove("is-boss-battle", "is-final-boss", "is-boss-rage", "is-boss-slam");
    }
    function slam() {
      arena.classList.remove("is-boss-slam");
      void arena.offsetWidth;
      arena.classList.add("is-boss-slam");
      later(() => arena.classList.remove("is-boss-slam"), 520);
    }
    function buildBar(card, final) {
      const node = el("div", "boss-hp");
      node.setAttribute("role", "meter");
      node.setAttribute("aria-label", card.name + " 보스 체력");
      const head = el("div", "boss-hp-head");
      head.append(el("span", "boss-hp-crown", final ? "👑 최종 보스" : "👑 보스"), el("strong", "boss-hp-name", card.name));
      const value = el("b", "boss-hp-value", "");
      head.append(value);
      const track = el("div", "boss-hp-track");
      const lag = el("span", "boss-hp-lag");
      const fill = el("span", "boss-hp-fill");
      track.append(lag, fill);
      [25, 50, 75].forEach(step => {
        const tick = el("i", "boss-hp-tick");
        tick.style.left = step + "%";
        track.append(tick);
      });
      node.append(head, track);
      return node;
    }
    // 보스전 시작. 등장 장면이 끝나면 done을 부른다. 동작 줄이기에서는 바로 부른다.
    function begin(card, options, done) {
      reset();
      const opts = options || {};
      const final = Boolean(opts.final);
      active = {card, final, raged: false, maxHp: card.hp, lastHp: card.hp};
      arena.classList.add("is-boss-battle");
      if (final) arena.classList.add("is-final-boss");
      bar = buildBar(card, final);
      arena.append(bar);
      update(card.hp, card.hp);
      const finish = typeof done === "function" ? done : function () {};
      if (reducedMotion()) { finish(); return; }
      const lines = linesFor(card.id);
      const intro = el("div", "boss-intro");
      intro.setAttribute("role", "dialog");
      intro.setAttribute("aria-label", card.name + " 등장");
      const band = el("div", "boss-intro-band");
      const portrait = el("figure", "boss-intro-card");
      const img = el("img");
      img.src = artSrc(card);
      img.alt = card.name;
      portrait.append(img);
      const copy = el("div", "boss-intro-copy");
      copy.append(el("p", "boss-intro-kicker", final ? "최종 보스 등장!" : "보스 등장!"),
        el("h2", "boss-intro-name", card.name));
      if (opts.where) copy.append(el("p", "boss-intro-where", opts.where));
      copy.append(el("p", "boss-intro-taunt", "“" + lines.intro + "”"),
        el("span", "boss-intro-skip", "톡 누르면 바로 시작!"));
      intro.append(band, portrait, copy);
      arena.append(intro);
      let closed = false;
      let canSkip = false;
      const close = () => {
        if (closed || !active) return;
        closed = true;
        intro.classList.add("is-leaving");
        later(() => { intro.remove(); finish(); }, 260);
      };
      intro.addEventListener("click", () => { if (canSkip) close(); });
      later(() => { slam(); sound("strongHit"); }, 380);
      later(() => { canSkip = true; }, 500);
      later(close, final ? 3400 : 3000);
    }
    // 체력이 바뀔 때마다 부른다. 반 아래로 처음 내려가면 화남 알림이 한 번 뜬다.
    function update(hp, maxHp) {
      if (!active || !bar) return;
      const max = Math.max(1, Number(maxHp) || active.maxHp || 1);
      const now = Math.max(0, Math.min(max, Number(hp) || 0));
      const pct = (now / max) * 100;
      bar.querySelector(".boss-hp-fill").style.width = pct + "%";
      bar.querySelector(".boss-hp-lag").style.width = pct + "%";
      bar.querySelector(".boss-hp-value").textContent = now + " / " + max;
      bar.setAttribute("aria-valuemin", "0");
      bar.setAttribute("aria-valuemax", String(max));
      bar.setAttribute("aria-valuenow", String(now));
      const phase = phaseFor(now, max);
      bar.dataset.phase = phase;
      if (now < active.lastHp) {
        bar.classList.remove("is-hurt");
        void bar.offsetWidth;
        bar.classList.add("is-hurt");
      }
      active.lastHp = now;
      if (!active.raged && (phase === "rage" || phase === "low")) {
        active.raged = true;
        arena.classList.add("is-boss-rage");
        // 피해 숫자를 먼저 읽고 나서 알림이 뜨게 조금 늦춘다.
        const card = active.card;
        later(() => { if (active && active.card === card && !active.defeated) bannerFor(card); }, reducedMotion() ? 0 : 450);
      }
    }
    function bannerFor(card) {
      banner("💢 " + withSubject(card.name) + " 화났어요!", linesFor(card.id).rage);
      sound("ultimateUnlock");
    }
    function banner(title, line) {
      arena.querySelectorAll(".boss-banner").forEach(node => node.remove());
      const node = el("div", "boss-banner");
      node.setAttribute("role", "status");
      node.append(el("strong", "", title), el("span", "", line));
      arena.append(node);
      if (!reducedMotion()) slam();
      later(() => node.remove(), reducedMotion() ? 1200 : 1900);
    }
    // 보스를 이기면 결과 창 전에 큰 도장을 찍는다. 기다릴 시간을 돌려준다.
    function defeat() {
      if (!active) return 0;
      const card = active.card;
      active.defeated = true;
      active.raged = true;
      removeOverlays();
      if (bar) update(0, active.maxHp);
      arena.classList.remove("is-boss-rage");
      const node = el("div", "boss-defeat");
      node.setAttribute("role", "status");
      const stamp = el("div", "boss-defeat-stamp");
      stamp.append(el("strong", "", active.final ? "최종 보스 격파!" : "보스 격파!"), el("span", "", linesFor(card.id).defeat));
      node.append(stamp);
      for (let i = 0; i < 12; i++) {
        const spark = el("i", "boss-defeat-spark", i % 3 === 0 ? "⭐" : i % 3 === 1 ? "✦" : "🎉");
        spark.style.setProperty("--spark-angle", (i * 30) + "deg");
        spark.style.setProperty("--spark-delay", (i % 4) * 40 + "ms");
        node.append(spark);
      }
      arena.append(node);
      if (reducedMotion()) return 700;
      slam();
      return 1500;
    }
    return {begin, update, defeat, reset, isActive: () => Boolean(active)};
  }

  return Object.freeze({STORAGE_KEY, BOSSES, LINES, linesFor, withSubject, phaseFor, localDay, dailyBoss,
    normaliseCrowns, loadCrowns, saveCrowns, awardCrown, totalCrowns, crownSetComplete, createStage});
});
