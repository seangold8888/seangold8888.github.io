// 화면 효과(그림 방식과 무관한 DOM 겹 층): 통통 튀는 글자, 해설 띠, 번쩍, 흔들림, 꽃가루.
// 3D·2.5D 어느 그림 방식이든 이 층은 맨 위에 그대로 쓴다. 해설 목소리 자리는 announce(…, { voice }) → sfx.voice(key).
import { sfx } from "./sfx.js?v=1";
import { createBannerQueue } from "./banner-queue.js?v=1";

export function createJuice(layer) {
  const cv = document.createElement("canvas"); cv.className = "fx-canvas"; layer.appendChild(cv);
  const g = cv.getContext("2d");
  let parts = [], raf = 0, W = 0, H = 0, DPR = 1;
  function size() {
    DPR = Math.min(2, window.devicePixelRatio || 1); W = layer.clientWidth || innerWidth; H = layer.clientHeight || innerHeight;
    cv.width = Math.round(W * DPR); cv.height = Math.round(H * DPR);
  }
  size();
  const onResize = () => size();
  addEventListener("resize", onResize);
  function loop() {
    raf = 0;
    g.setTransform(DPR, 0, 0, DPR, 0, 0); g.clearRect(0, 0, W, H);
    const dt = 1 / 60;
    parts = parts.filter(p => (p.life -= dt) > 0);
    for (const p of parts) {
      p.vy += p.g * dt; p.vx *= 0.99; p.x += p.vx * dt; p.y += p.vy * dt; p.rot += p.vr * dt;
      g.save(); g.globalAlpha = Math.min(1, p.life * 2); g.translate(p.x, p.y); g.rotate(p.rot); g.fillStyle = p.c;
      if (p.kind === "dot") { g.beginPath(); g.arc(0, 0, p.s, 0, Math.PI * 2); g.fill(); }
      else g.fillRect(-p.s, -p.s * 0.45, p.s * 2, p.s * 0.9 * Math.abs(Math.cos(p.rot * 2)) + 1);
      g.restore();
    }
    if (parts.length) raf = requestAnimationFrame(loop);
  }
  const kick = () => { if (!raf) raf = requestAnimationFrame(loop); };
  /* ---------- 배너 한 줄 + 글자 자리 ---------- */
  let getSafe = null, bTimer = 0, bannerEl = null;
  const bq = createBannerQueue({
    now: () => performance.now(),
    show(item) {
      layer.querySelectorAll(".fx-banner,.fx-pop").forEach(b => b.remove());      // 새 배너 = 앞 배너·힌트·판정 글자 지움
      const o = item.o || {};
      const el = document.createElement("div"); el.className = "fx-banner " + (o.cls || "");
      el.style.animationDuration = item.ms + "ms";
      const b = document.createElement("b"); b.textContent = item.text; el.appendChild(b);
      if (o.sub) { const sp = document.createElement("span"); sp.textContent = o.sub; el.appendChild(sp); }
      layer.appendChild(el); bannerEl = el;
      try { dodge(el); } catch (_) {}
      if (o.voice) sfx.voice(o.voice);
    },
    hide() { if (bannerEl) { bannerEl.remove(); bannerEl = null; } },
  });
  function tickBanner() { bq.tick(); if (bannerEl) try { dodge(bannerEl); } catch (_) {} }
  // 배너가 아이 얼굴에 걸리면 얼굴 옆(빈 쪽)으로 비켜 선다(폰 가로처럼 세로가 모자랄 때)
  let getActor = null;
  function dodge(el) {
    const a = getActor ? getActor() : null;
    if (!a) return;
    const W = layer.clientWidth || innerWidth, bw = el.offsetWidth, top = el.offsetTop, bh = el.offsetHeight;
    // 얼굴 자리(+ 폴짝 뛰어 올라올 만큼 위로 여유)
    const face = { x: a.x + a.w * 0.15, y: a.y - 4 - a.h * 0.15, w: a.w * 0.7, h: a.h * 0.45 };
    const cx0 = W / 2, hit = cx => cx - bw / 2 < face.x + face.w && face.x < cx + bw / 2 && top < face.y + face.h && face.y < top + bh;
    if (el.dataset.dodged) { const cur = parseFloat(el.style.left); if (!hit(cur)) return; }      // 한 번 비킨 배너는 그 자리에(왔다 갔다 하지 않게)
    else if (!hit(cx0)) return;
    el.dataset.dodged = "1";
    const leftRoom = face.x - 12, rightRoom = W - (face.x + face.w) - 12;
    const cx = rightRoom >= leftRoom ? Math.min(W - bw / 2 - 10, face.x + face.w + 12 + bw / 2) : Math.max(bw / 2 + 10, face.x - 12 - bw / 2);
    el.style.left = cx + "px";
  }
  function kickBanner() {
    clearTimeout(bTimer);
    const loop = () => { tickBanner(); if (bq.current || bq.pending) bTimer = setTimeout(loop, 60); };
    bTimer = setTimeout(loop, 60);
  }
  // 판정 글자 자리: 점수판 띠 아래, 배너가 있으면 배너 아래. 겹치는 앞 글자는 지운다.
  function placePop(el, o) {
    const sa = getSafe ? getSafe() : null;
    const h = el.offsetHeight || 40, w = el.offsetWidth || 100, Hs = layer.clientHeight || innerHeight, Ws = layer.clientWidth || innerWidth;
    let cy = (o.y != null ? o.y : 0.4) * Hs;
    let minTop = sa ? sa.top + 4 : 0;
    const bn = layer.querySelector(".fx-banner");
    if (bn) minTop = Math.max(minTop, bn.offsetTop + bn.offsetHeight + 8);      // 크기 애니메이션과 상관없는 실제 자리
    if (cy - h * 0.8 < minTop) cy = minTop + h * 0.8;
    let cx = Math.max(w / 2 + 6, Math.min(Ws - w / 2 - 6, (o.x != null ? o.x : 0.5) * Ws));
    // 아이 얼굴 위에 글자가 오면 얼굴 옆으로(가운데 x 를 지정하지 않은 판정 글자만)
    const a = o.x == null && getActor ? getActor() : null;
    if (a) {
      const f = { x: a.x + a.w * 0.1, y: a.y - a.h * 0.12, w: a.w * 0.8, h: a.h * 0.42 };
      if (cx - w / 2 < f.x + f.w && f.x < cx + w / 2 && cy - h * 0.8 < f.y + f.h && f.y < cy + h * 0.5) {
        const right = Ws - (f.x + f.w), left = f.x;
        cx = right >= left ? Math.min(Ws - w / 2 - 6, f.x + f.w + 10 + w / 2) : Math.max(w / 2 + 6, f.x - 10 - w / 2);
      }
    }
    el.style.top = cy + "px"; el.style.left = cx + "px";
    const me = { x: cx - w / 2, y: cy - h * 0.8, w, h: h * 1.3 };
    layer.querySelectorAll(".fx-pop").forEach(p => {
      if (p === el) return;
      const pw = p.offsetWidth, ph = p.offsetHeight, px = parseFloat(p.style.left) || 0, py = parseFloat(p.style.top) || 0;
      if (me.x < px + pw / 2 && px - pw / 2 < me.x + me.w && me.y < py + ph * 0.5 && py - ph * 0.8 < me.y + me.h) p.remove();
    });
  }
  const COLORS = ["#ff4d6d", "#ffd23f", "#3ec1ff", "#7cff6b", "#b98bff", "#ffffff", "#2f6bff"];

  return {
    layer,
    // 통통 튀는 글자: pop("퍼펙트!", { x, y (화면 비율 0~1), size, color, cls, hint })
    //  · 점수판 띠 아래에만, 배너가 떠 있으면 배너 아래로 내려 겹치지 않게 · 겹치는 앞 글자는 지운다(판정 글자는 하나씩)
    //  · hint(안내 글) 는 배너가 떠 있으면 띄우지 않는다
    pop(text, o = {}) {
      tickBanner();
      if (o.hint && bq.current) return null;
      const el = document.createElement("div"); el.className = "fx-pop " + (o.cls || "") + (o.hint ? " hint" : ""); el.textContent = text;
      const fx = o.x != null ? o.x : 0.5;
      el.style.left = (fx * 100) + "%"; el.style.top = ((o.y != null ? o.y : 0.4) * 100) + "%";
      if (o.size) el.style.fontSize = o.size + "px";
      if (o.color) el.style.color = o.color;
      layer.appendChild(el);
      try { placePop(el, o); } catch (_) {}
      setTimeout(() => el.remove(), o.ms || 900);
      return el;
    },
    // 해설 띠: announce("2단 성공!", { sub, voice:"double", ms, pri }) — 한 번에 하나(banner-queue.js). pri 2 = 결과(바로 바꿈)
    announce(text, o = {}) {
      const r = bq.push({ text, o, pri: o.pri != null ? o.pri : 1, ms: o.ms || 1400 });
      kickBanner();
      return r;
    },
    // 글자(배너·판정·안내)만 모두 지우기 — 새 차례·새 슛을 시작할 때
    clearText() { bq.clear(); layer.querySelectorAll(".fx-pop,.fx-banner").forEach(e => e.remove()); },
    banner: () => bq.current,
    setSafe(fn) { getSafe = fn; },
    setActor(fn) { getActor = fn; },
    flash(color = "#fff", ms = 220) {
      const el = document.createElement("div"); el.className = "fx-flash"; el.style.background = color; el.style.animationDuration = ms + "ms";
      layer.appendChild(el); setTimeout(() => el.remove(), ms + 40);
    },
    shake(el, power = 1) {
      if (!el || !el.animate) return;
      const p = 6 * power, k = [];
      for (let i = 0; i < 7; i++) k.push({ transform: `translate(${(Math.random() * 2 - 1) * p}px, ${(Math.random() * 2 - 1) * p}px)` });
      k.push({ transform: "translate(0,0)" });
      try { el.animate(k, { duration: 320, easing: "ease-out" }); } catch (_) {}
    },
    // 꽃가루: confetti(n, { x, y 화면 비율, spread })
    confetti(n = 120, o = {}) {
      const x0 = (o.x != null ? o.x : 0.5) * W, y0 = (o.y != null ? o.y : 0.35) * H;
      for (let i = 0; i < n; i++) {
        const a = -Math.PI / 2 + (Math.random() * 2 - 1) * (o.spread || 1.2), v = 380 + Math.random() * 520;
        parts.push({ kind: Math.random() < 0.2 ? "dot" : "rect", x: x0, y: y0, vx: Math.cos(a) * v, vy: Math.sin(a) * v, g: 620, s: 4 + Math.random() * 6,
          rot: Math.random() * 6, vr: (Math.random() * 2 - 1) * 12, c: (o.colors || COLORS)[i % (o.colors || COLORS).length], life: 1.6 + Math.random() * 1.4 });
      }
      kick();
    },
    // 반짝 터짐: burst(x, y 화면 비율, { n, colors })
    burst(x, y, o = {}) {
      const n = o.n || 26, x0 = x * W, y0 = y * H;
      for (let i = 0; i < n; i++) {
        const a = Math.random() * Math.PI * 2, v = 120 + Math.random() * 320;
        parts.push({ kind: "dot", x: x0, y: y0, vx: Math.cos(a) * v, vy: Math.sin(a) * v, g: 260, s: 2 + Math.random() * 4, rot: 0, vr: 0, c: (o.colors || COLORS)[i % (o.colors || COLORS).length], life: 0.5 + Math.random() * 0.5 });
      }
      kick();
    },
    clear() { parts = []; bq.clear(); layer.querySelectorAll(".fx-pop,.fx-banner,.fx-flash").forEach(e => e.remove()); },
    destroy() { removeEventListener("resize", onResize); cancelAnimationFrame(raf); cv.remove(); clearTimeout(bTimer); },
  };
}
