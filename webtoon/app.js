// 「오늘도 우리 집」 화면: 목록(#) ↔ 회차 읽기(#ep=1).
(function () {
  "use strict";

  const { panelSVG, drawChar, background } = window.WebtoonArt;
  const { CHARACTERS, EPISODES } = window.WebtoonData;
  const $ = (id) => document.getElementById(id);
  const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]);

  // 읽음·좋아요는 이 기기에만 남는 편의 기록이다. 저장이 막혀도 화면은 그대로 동작한다.
  const STORE = "family-webtoon-v1";
  function load() {
    try {
      return JSON.parse(localStorage.getItem(STORE)) || {};
    } catch (e) {
      return {};
    }
  }
  function save(state) {
    try {
      localStorage.setItem(STORE, JSON.stringify(state));
    } catch (e) {
      /* 저장 불가: 무시 */
    }
  }
  let state = load();
  state.read = state.read || {};
  state.like = state.like || {};

  // ── 말풍선·효과음·내레이션 ──
  function overlay(panel) {
    const H = panel.h || 320;
    const px = (x) => `${(x / 400) * 100}%`;
    const py = (y) => `${(y / H) * 100}%`;
    let s = "";
    if (panel.n) s += `<div class="narr top">${esc(panel.n)}</div>`;
    if (panel.n2) s += `<div class="narr bottom">${esc(panel.n2)}</div>`;
    for (const f of panel.sfx || []) {
      const style = `left:${px(f.x)};top:${py(f.y)};color:${f.c || "#ff6b6b"};transform:translate(-50%,-50%) rotate(${f.rot || 0}deg);font-size:${9 * (f.size || 1)}cqw`;
      s += `<div class="sfx" style="${style}">${esc(f.t)}</div>`;
    }
    for (const b of panel.b || []) {
      const cls = ["bubble", b.k || "", b.tail ? `tail-${b.tail}` : ""].join(" ").trim();
      const w = b.w ? `max-width:${(b.w / 400) * 100}%;` : "";
      s += `<div class="${cls}" style="left:${px(b.x)};top:${py(b.y)};${w}">${esc(b.t)}</div>`;
    }
    return s;
  }

  function renderPanel(panel, i) {
    const alt = [panel.n, ...(panel.b || []).map((b) => b.t), panel.n2].filter(Boolean).join(" / ");
    return `<figure class="panel" data-i="${i}" aria-label="${esc(alt || "그림 컷")}" style="margin:0">${panelSVG(panel)}${overlay(panel)}</figure>`;
  }

  // ── 목록 ──
  function portrait(c) {
    // 어른은 조금 줄여 아이와 얼굴 크기를 맞춘다.
    const s = c.id === "taeo" || c.id === "jaei" ? 0.66 : 0.52;
    return `<svg viewBox="0 0 120 150" aria-hidden="true"><circle cx="60" cy="80" r="56" fill="#fff4e4"/><g transform="translate(60 146) scale(${s})">${drawChar({ c: c.id, x: 0, y: 0, e: c.e, p: c.pose })}</g></svg>`;
  }

  function heroSVG() {
    const W = 400, H = 230;
    let s = background("sparkle:ffe3ee", W, H);
    s += `<rect x="0" y="${H - 40}" width="${W}" height="40" fill="#f5d8b4"/>`;
    // 재이 · 할머니 · 엄마 · 아빠 · 할아버지 · 태오 순서
    const row = [["jaei", 36, "happy", "wave"], ["halmeoni", 98, "smile", "stand"], ["eomma", 163, "happy", "stand"], ["appa", 232, "happy", "wave"], ["harabeoji", 300, "proud", "stand"], ["taeo", 362, "laugh", "cheer"]];
    for (const [c, x, e, p] of row) s += drawChar({ c, x, y: H - 16, e, p, s: c === "jaei" || c === "taeo" ? 0.82 : 0.72 });
    return `<svg viewBox="0 0 ${W} ${H}" role="img" aria-label="재이, 할머니, 엄마, 아빠, 할아버지, 태오">${s}</svg>`;
  }

  function renderHome() {
    $("heroArt").innerHTML = heroSVG();
    $("cast").innerHTML = CHARACTERS.map(
      (c) => `<div class="cast-card">${portrait(c)}<div><div class="cast-name">${esc(c.name)}</div><div class="cast-tag">${esc(c.tag)}</div><p class="cast-line">${esc(c.line)}</p></div></div>`
    ).join("");
    $("episodeList").innerHTML = EPISODES.map((ep) => {
      const cover = ep.panels[ep.cover || 0];
      const chips = (state.read[ep.id] ? `<span class="chip">✔ 읽음</span>` : "") + (state.like[ep.id] ? `<span class="chip like">♥</span>` : "");
      return `<li><a class="ep-card" href="#ep=${ep.id}"><div class="ep-thumb">${panelSVG({ ...cover })}</div><div class="ep-info"><div class="ep-no">${ep.id}화 ${chips}</div><div class="ep-title">${esc(ep.title)}</div><p class="ep-sum">${esc(ep.summary)}</p></div></a></li>`;
    }).join("");
    document.querySelectorAll(".ep-thumb svg").forEach((svg) => svg.setAttribute("preserveAspectRatio", "xMidYMid slice"));
  }

  // ── 읽기 ──
  let observer = null;
  function renderEpisode(ep) {
    const idx = EPISODES.indexOf(ep);
    const prev = EPISODES[idx - 1];
    const next = EPISODES[idx + 1];
    $("epHead").innerHTML = `<div class="ep-num">${ep.id}화</div><h1>${esc(ep.title)}</h1><p>${esc(ep.summary)}</p><div class="hint">▼ 아래로 내려 읽어요</div>`;
    $("strip").innerHTML = ep.panels.map(renderPanel).join("");
    const liked = !!state.like[ep.id];
    $("epEnd").innerHTML =
      `<div class="lesson"><div class="label">오늘의 한 줄</div><div class="text">${esc(ep.lesson)}</div></div>` +
      `<div class="talk"><div class="label">💬 가족과 이야기해 봐요</div><div class="text">${esc(ep.talk)}</div></div>` +
      `<div class="actions"><button class="btn like" id="likeBtn" type="button" aria-pressed="${liked}">${liked ? "♥ 좋아요" : "♡ 좋아요"}</button></div>` +
      `<div class="actions">` +
      (prev ? `<a class="btn" href="#ep=${prev.id}">◀ ${prev.id}화</a>` : "") +
      `<a class="btn" href="#">목록</a>` +
      (next ? `<a class="btn primary" href="#ep=${next.id}">${next.id}화 보기 ▶</a>` : `<span class="btn" aria-disabled="true">다음 화는 곧 찾아와요!</span>`) +
      `</div>`;
    $("likeBtn").addEventListener("click", (e) => {
      state.like[ep.id] = !state.like[ep.id];
      save(state);
      e.currentTarget.setAttribute("aria-pressed", String(!!state.like[ep.id]));
      e.currentTarget.textContent = state.like[ep.id] ? "♥ 좋아요" : "♡ 좋아요";
    });

    fitBubbles();
    if (observer) observer.disconnect();
    const panels = document.querySelectorAll(".panel");
    if ("IntersectionObserver" in window) {
      observer = new IntersectionObserver(
        (entries) => {
          for (const en of entries) {
            if (en.isIntersecting) {
              en.target.classList.add("in");
              observer.unobserve(en.target);
            }
          }
        },
        { rootMargin: "0px 0px -8% 0px" }
      );
      panels.forEach((p) => observer.observe(p));
    } else {
      panels.forEach((p) => p.classList.add("in"));
    }
  }

  // 말풍선이 컷 밖으로 삐져나가면 안쪽으로 밀어 넣는다(글꼴·화면 폭에 따라 크기가 달라진다).
  function fitBubbles() {
    document.querySelectorAll(".panel").forEach((panel) => {
      const box = panel.getBoundingClientRect();
      const pad = Math.max(4, box.width * 0.015);
      panel.querySelectorAll(".bubble").forEach((el) => {
        el.style.marginLeft = "0px";
        el.style.marginTop = "0px";
        const r = el.getBoundingClientRect();
        let dx = 0;
        let dy = 0;
        if (r.left < box.left + pad) dx = box.left + pad - r.left;
        else if (r.right > box.right - pad) dx = box.right - pad - r.right;
        if (r.top < box.top + pad) dy = box.top + pad - r.top;
        else if (r.bottom > box.bottom - pad) dy = box.bottom - pad - r.bottom;
        el.style.marginLeft = `${dx}px`;
        el.style.marginTop = `${dy}px`;
      });
    });
  }

  function markReadIfDone(ep) {
    if (!ep || state.read[ep.id]) return;
    const end = $("epEnd").getBoundingClientRect();
    if (end.top < window.innerHeight) {
      state.read[ep.id] = true;
      save(state);
    }
  }

  // ── 라우팅 ──
  let current = null;
  function route() {
    const m = /ep=(\d+)/.exec(location.hash);
    const ep = m && EPISODES.find((e) => e.id === Number(m[1]));
    current = ep || null;
    $("home").hidden = !!ep;
    $("reader").hidden = !ep;
    if (ep) {
      renderEpisode(ep);
      $("topTitle").textContent = `${ep.id}화 · ${ep.title}`;
      $("backLink").textContent = "◀ 목록";
      $("backLink").setAttribute("href", "#");
      document.title = `${ep.id}화 ${ep.title} — 오늘도 우리 집`;
    } else {
      renderHome();
      $("topTitle").textContent = "오늘도 우리 집";
      $("backLink").textContent = "◀ 모험 상자";
      $("backLink").setAttribute("href", "../game/");
      document.title = "오늘도 우리 집";
    }
    window.scrollTo(0, 0);
    onScroll();
  }

  function onScroll() {
    const max = document.documentElement.scrollHeight - window.innerHeight;
    const ratio = max > 0 ? window.scrollY / max : 0;
    $("progressBar").style.width = current ? `${Math.round(ratio * 100)}%` : "0";
    $("toTop").hidden = window.scrollY < 600;
    markReadIfDone(current);
  }

  $("toTop").addEventListener("click", () => window.scrollTo({ top: 0, behavior: "smooth" }));
  window.addEventListener("scroll", onScroll, { passive: true });
  window.addEventListener("hashchange", route);
  let fitTimer = 0;
  window.addEventListener("resize", () => {
    clearTimeout(fitTimer);
    fitTimer = setTimeout(() => current && fitBubbles(), 120);
  });
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(() => current && fitBubbles());
  route();

  // 모험 상자의 오프라인 저장(sw.js)을 같이 쓴다.
  if ("serviceWorker" in navigator && location.protocol === "https:") {
    const scope = new URL("../", location.href).href;
    navigator.serviceWorker
      .getRegistration(scope)
      .then((r) => r || navigator.serviceWorker.register(new URL("../sw.js", location.href), { scope }))
      .catch(() => {});
  }
})();
