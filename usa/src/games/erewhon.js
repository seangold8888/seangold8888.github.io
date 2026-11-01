// 에레혼 마켓: 장보기. 목록에 있는 것을 선반에서 찾아 콕 → 바구니. 계산대에서 덧셈(보통) 또는 개수 세기(쉬움).
import { cover, text, emoji, sprite, Particles, Floaters, rr, clamp, rng } from "../engine.js";

export const FOODS = [
  { id: "smoothie", ko: "스무디", en: "smoothie", icon: "🥤" },
  { id: "straw", ko: "딸기", en: "strawberry", icon: "🍓" },
  { id: "banana", ko: "바나나", en: "banana", icon: "🍌" },
  { id: "avocado", ko: "아보카도", en: "avocado", icon: "🥑" },
  { id: "apple", ko: "사과", en: "apple", icon: "🍎" },
  { id: "carrot", ko: "당근", en: "carrot", icon: "🥕" },
  { id: "broc", ko: "브로콜리", en: "broccoli", icon: "🥦" },
  { id: "bread", ko: "빵", en: "bread", icon: "🍞" },
  { id: "milk", ko: "우유", en: "milk", icon: "🥛" },
  { id: "honey", ko: "꿀", en: "honey", icon: "🍯" },
  { id: "coco", ko: "코코넛", en: "coconut", icon: "🥥" },
  { id: "melon", ko: "수박", en: "watermelon", icon: "🍉" },
  { id: "orange", ko: "오렌지", en: "orange", icon: "🍊" },
  { id: "grape", ko: "포도", en: "grapes", icon: "🍇" },
  { id: "lemon", ko: "레몬", en: "lemon", icon: "🍋" },
  { id: "corn", ko: "옥수수", en: "corn", icon: "🌽" },
];

export function create(env) {
  const { sfx } = env;
  const easy = env.easy;
  const r = rng(Math.floor(Math.random() * 1e6));
  const shuffle = a => { for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(r() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };
  const price = {};
  FOODS.forEach(f => { price[f.id] = f.id === "smoothie" ? 5 : 1 + Math.floor(r() * 4); });
  const fx = new Particles(), fl = new Floaters();
  const ROUNDS = 3;
  let round = -1, phase = "shop", list = [], tiles = [], basket = [], miss = 0, t = 0, phaseT = 0, quiz = null, done = false, botT = 0, cheer = 0;
  const flying = [];

  function newRound() {
    round++;
    const n = easy ? [2, 3, 3][round] : 3;
    const others = shuffle(FOODS.filter(f => f.id !== "smoothie"));
    list = (round === ROUNDS - 1 ? [FOODS[0]].concat(others.slice(0, n - 1)) : others.slice(0, n)).map(f => ({ ...f, got: false }));
    const cols = easy ? 4 : 5, rows = 3;
    const fill = shuffle(FOODS.filter(f => !list.some(l => l.id === f.id))).slice(0, rows * cols - list.length);
    tiles = shuffle(list.map(l => FOODS.find(f => f.id === l.id)).concat(fill)).map((f, i) => ({ f, i, shake: 0, taken: false }));
    basket = []; phase = "shop"; phaseT = 0; quiz = null;
    env.toast(round === 0 ? "목록에 있는 것을 찾아 콕! 🛒" : round === ROUNDS - 1 ? "마지막! 스무디도 사요 🥤" : `${round + 1}번째 장보기!`, 2200);
  }

  function geo() {
    const W = env.W, H = env.H, portrait = H > W;
    const top = 80;
    const list = portrait ? { x: 12, y: top, w: W - 24, h: 150 } : { x: 12, y: top, w: Math.min(290, W * 0.26), h: H - top - 12 };
    const bottomH = portrait ? 190 : 150;
    const shelf = portrait ? { x: 12, y: top + 162, w: W - 24, h: H - top - 162 - bottomH } : { x: list.x + list.w + 14, y: top, w: W - list.w - 38, h: H - top - bottomH };
    const cols = easy ? 4 : 5, rows = 3;
    const basketPos = { x: portrait ? W * 0.62 : shelf.x + shelf.w * 0.62, y: H - 24 };
    return { W, H, portrait, list, shelf, cols, rows, basketPos, bottomH };
  }
  function tileRect(g, i) {
    const tw = g.shelf.w / g.cols, th = g.shelf.h / g.rows;
    const c = i % g.cols, rw = Math.floor(i / g.cols);
    return { x: g.shelf.x + c * tw, y: g.shelf.y + rw * th, w: tw, h: th };
  }
  function makeQuiz() {
    let ans, q, opts;
    if (easy) {
      ans = list.length; q = "바구니에 몇 개 있을까요?";
      opts = new Set([ans]); [ans - 1, ans + 1, ans + 2].forEach(v => { if (v >= 1 && opts.size < 3) opts.add(v); });
    } else {
      ans = list.reduce((s, l) => s + price[l.id], 0); q = "모두 얼마일까요?";
      opts = new Set([ans]); const d = shuffle([-2, -1, 1, 2, 3]);
      for (const v of d) if (ans + v >= 1 && opts.size < 3) opts.add(ans + v);
    }
    quiz = { q, ans, opts: shuffle([...opts]).map(v => ({ v, off: false })), shake: 0 };
  }
  function quizRects(g) {
    const mw = Math.min(600, g.W - 32), mh = 330, mx = (g.W - mw) / 2, my = Math.max(90, (g.H - mh) / 2);
    const bw = (mw - 80) / 3;
    return { mx, my, mw, mh, btn: i => ({ x: mx + 20 + i * (bw + 20), y: my + mh - 110, w: bw, h: 86 }) };
  }

  newRound();

  return {
    id: "erewhon",
    update(dt) {
      t += dt; phaseT += dt; cheer = Math.max(0, cheer - dt);
      for (const tl of tiles) tl.shake = Math.max(0, tl.shake - dt);
      if (quiz) quiz.shake = Math.max(0, quiz.shake - dt);
      for (const f of flying) f.p += dt / 0.55;
      for (let i = flying.length - 1; i >= 0; i--) if (flying[i].p >= 1) { basket.push(flying[i].f); flying.splice(i, 1); sfx.pop(); }
      if (phase === "shop" && list.every(l => l.got) && !flying.length && phaseT > 0.3) { phase = "pay"; phaseT = 0; makeQuiz(); sfx.coin(); }
      if (phase === "paid" && phaseT > 1.5) {
        if (round < ROUNDS - 1) newRound();
        else if (!done) {
          done = true; phase = "done";
          const stars = miss <= 1 ? 3 : miss <= 4 ? 2 : 1;
          env.finish({ stars, text: `장보기 ${ROUNDS}번 성공! 스무디 냠냠 🥤${miss ? ` (다시 고른 것 ${miss}번)` : " 한 번도 안 틀렸어요!"}` });
        }
      }
      fx.update(dt); fl.update(dt);
      env.setProgress((round + (phase === "shop" ? list.filter(l => l.got).length / list.length * 0.7 : phase === "pay" ? 0.8 : 1)) / ROUNDS);
      env.setScore(`🛒 ${Math.min(round + 1, ROUNDS)}/${ROUNDS}`);
    },
    down(x, y) {
      const g = geo();
      if (phase === "shop") {
        for (const tl of tiles) {
          if (tl.taken) continue;
          const rc = tileRect(g, tl.i);
          if (x < rc.x || x > rc.x + rc.w || y < rc.y || y > rc.y + rc.h) continue;
          const want = list.find(l => l.id === tl.f.id && !l.got);
          if (want) {
            want.got = true; tl.taken = true; cheer = 0.6;
            flying.push({ f: tl.f, p: 0, x0: rc.x + rc.w / 2, y0: rc.y + rc.h * 0.42 });
            sfx.chime(74 + list.filter(l => l.got).length * 3, 0.2);
            fl.add(tl.f.ko + "!", rc.x + rc.w / 2, rc.y + 10, "#fff36b", 26);
          } else {
            tl.shake = 0.4; miss++; sfx.wrong();
            env.toast("목록에 없는 거예요 🧐", 1200);
          }
          return;
        }
      } else if (phase === "pay" && quiz) {
        const q = quizRects(g);
        quiz.opts.forEach((o, i) => {
          const b = q.btn(i);
          if (o.off || x < b.x || x > b.x + b.w || y < b.y || y > b.y + b.h) return;
          if (o.v === quiz.ans) {
            phase = "paid"; phaseT = 0; sfx.coin(); sfx.level(); cheer = 1.4;
            fx.burst(b.x + b.w / 2, b.y, 24, { color: ["#ffd23f", "#7cf06b", "#fff"], kind: "star", speed: 300, gravity: 300 });
          } else { o.off = true; miss++; quiz.shake = 0.4; sfx.wrong(); }
        });
      }
    },
    bot(dt) {
      botT += dt;
      if (botT < 0.45) return;
      botT = 0;
      const g = geo();
      if (phase === "shop") {
        const tl = tiles.find(tt => !tt.taken && list.some(l => l.id === tt.f.id && !l.got));
        if (tl) { const rc = tileRect(g, tl.i); this.down(rc.x + rc.w / 2, rc.y + rc.h / 2); }
      } else if (phase === "pay" && quiz) {
        const i = quiz.opts.findIndex(o => o.v === quiz.ans), b = quizRects(g).btn(i);
        this.down(b.x + b.w / 2, b.y + b.h / 2);
      }
    },
    draw(ctx) {
      const g = geo(), { W, H } = g;
      cover(ctx, env.img("bg-market"), 0, 0, W, H, 0.5, 0.5);
      ctx.fillStyle = "rgba(255,248,236,.28)"; ctx.fillRect(0, 0, W, H);
      // 선반
      const sh = g.shelf, th = sh.h / g.rows;
      ctx.fillStyle = "rgba(255,250,240,.72)"; rr(ctx, sh.x - 6, sh.y - 6, sh.w + 12, sh.h + 12, 20); ctx.fill();
      for (let rw = 0; rw < g.rows; rw++) {
        const y = sh.y + (rw + 1) * th - 14;
        ctx.fillStyle = "#b9824f"; rr(ctx, sh.x, y, sh.w, 14, 5); ctx.fill();
        ctx.fillStyle = "#8f5f34"; ctx.fillRect(sh.x + 4, y + 12, sh.w - 8, 4);
      }
      for (const tl of tiles) {
        if (tl.taken) continue;
        const rc = tileRect(g, tl.i), sz = Math.min(rc.w * 0.56, rc.h * 0.5);
        const sx = tl.shake ? Math.sin(tl.shake * 50) * 8 : 0;
        emoji(ctx, tl.f.icon, rc.x + rc.w / 2 + sx, rc.y + rc.h * 0.42, sz);
        if (!easy) {
          const tw = 44, tx = rc.x + rc.w / 2 - tw / 2, ty = rc.y + rc.h - 44;
          ctx.fillStyle = "#fff"; rr(ctx, tx, ty, tw, 24, 8); ctx.fill();
          ctx.strokeStyle = "#e0b878"; ctx.lineWidth = 2; ctx.stroke();
          text(ctx, "$" + price[tl.f.id], rc.x + rc.w / 2, ty + 12.5, 17, { color: "#2f7d32" });
        }
      }
      // 목록 카드
      const L = g.list;
      ctx.fillStyle = "#fffdf6"; rr(ctx, L.x, L.y, L.w, L.h, 20); ctx.fill();
      ctx.strokeStyle = "#f0cf9c"; ctx.lineWidth = 3; ctx.stroke();
      if (g.portrait) {
        text(ctx, "🛒 장보기 목록", L.x + 16, L.y + 24, 20, { color: "#5a3d28", align: "left" });
        const cw = (L.w - 24) / list.length;
        list.forEach((l, i) => {
          const cx = L.x + 12 + cw * (i + 0.5), cy = L.y + 82;
          ctx.globalAlpha = l.got ? 0.4 : 1;
          emoji(ctx, l.icon, cx - cw * 0.22, cy, 50);
          text(ctx, l.ko, cx + cw * 0.12, cy - 12, 20, { color: "#4a3020", align: "left" });
          text(ctx, l.en + (easy ? "" : `  $${price[l.id]}`), cx + cw * 0.12, cy + 14, 14, { color: "#2f8fd8", align: "left", weight: 700 });
          ctx.globalAlpha = 1;
          if (l.got) text(ctx, "✔", cx - cw * 0.22 + 26, cy - 24, 30, { color: "#22a35a", stroke: "#fff" });
        });
      } else {
        text(ctx, "🛒 장보기 목록", L.x + L.w / 2, L.y + 30, 22, { color: "#5a3d28" });
        const rowH = Math.min(96, (L.h - 70) / Math.max(3, list.length));
        list.forEach((l, i) => {
          const cy = L.y + 72 + rowH * (i + 0.5);
          ctx.globalAlpha = l.got ? 0.4 : 1;
          emoji(ctx, l.icon, L.x + 46, cy, Math.min(54, rowH * 0.62));
          text(ctx, l.ko, L.x + 86, cy - 11, 22, { color: "#4a3020", align: "left" });
          text(ctx, l.en, L.x + 86, cy + 15, 15, { color: "#2f8fd8", align: "left", weight: 700 });
          if (!easy) text(ctx, "$" + price[l.id], L.x + L.w - 18, cy, 22, { color: "#2f7d32", align: "right" });
          ctx.globalAlpha = 1;
          if (l.got) text(ctx, "✔", L.x + 66, cy - 20, 30, { color: "#22a35a", stroke: "#fff" });
          ctx.strokeStyle = "#f3e2c4"; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(L.x + 16, cy + rowH / 2); ctx.lineTo(L.x + L.w - 16, cy + rowH / 2); ctx.stroke();
        });
      }
      // 아이들과 바구니
      const kh = Math.min(g.bottomH * 1.05, 190);
      const bp = g.basketPos;
      const kidX = g.portrait ? W * 0.2 : sh.x + sh.w * 0.25;
      sprite(ctx, env.kid(cheer > 0 ? "cheer" : "travel"), kidX, H - 4, kh);
      sprite(ctx, env.kid(cheer > 0 ? "cheer" : "travel", "buddy"), kidX + kh * 0.55, H - 4, kh * 0.88, true);
      basketDraw(ctx, bp.x, bp.y, basket);
      for (const f of flying) {
        const p = f.p, x = f.x0 + (bp.x - f.x0) * p, y = f.y0 + (bp.y - 70 - f.y0) * p - Math.sin(p * Math.PI) * 120;
        emoji(ctx, f.f.icon, x, y, 54 - p * 14);
      }
      fx.draw(ctx);
      fl.draw(ctx);
      // 계산대
      if ((phase === "pay" || phase === "paid") && quiz) {
        const q = quizRects(g);
        ctx.fillStyle = "rgba(40,24,10,.35)"; ctx.fillRect(0, 0, W, H);
        const sx = quiz.shake ? Math.sin(quiz.shake * 50) * 8 : 0;
        ctx.fillStyle = "#fffaf1"; rr(ctx, q.mx + sx, q.my, q.mw, q.mh, 26); ctx.fill();
        ctx.lineWidth = 4; ctx.strokeStyle = "#ffd79a"; ctx.stroke();
        text(ctx, "🧾 계산대  " + quiz.q, q.mx + q.mw / 2 + sx, q.my + 40, 26, { color: "#3b2a1e" });
        const n = list.length, iw = Math.min(110, (q.mw - 40) / n);
        list.forEach((l, i) => {
          const cx = q.mx + q.mw / 2 + (i - (n - 1) / 2) * iw + sx;
          emoji(ctx, l.icon, cx, q.my + 110, 52);
          if (!easy) text(ctx, "$" + price[l.id], cx, q.my + 160, 22, { color: "#2f7d32" });
          if (!easy && i < n - 1) text(ctx, "+", cx + iw / 2, q.my + 110, 30, { color: "#a07850" });
        });
        quiz.opts.forEach((o, i) => {
          const b = q.btn(i);
          const right = phase === "paid" && o.v === quiz.ans;
          ctx.fillStyle = o.off ? "#e8e1d6" : right ? "#7cd96b" : "#ffffff";
          rr(ctx, b.x + sx, b.y, b.w, b.h, 18); ctx.fill();
          ctx.lineWidth = 3; ctx.strokeStyle = o.off ? "#cfc6b8" : "#f0b46a"; ctx.stroke();
          text(ctx, (easy ? "" : "$") + o.v, b.x + b.w / 2 + sx, b.y + b.h / 2 - (easy ? 8 : 0), 38, { color: o.off ? "#aaa" : "#3b2a1e" });
          if (easy) text(ctx, "●".repeat(o.v), b.x + b.w / 2 + sx, b.y + b.h - 16, 14, { color: o.off ? "#bbb" : "#ff7a6b" });
        });
        if (phase === "paid") text(ctx, "딩동! 계산 끝 🎉", W / 2, q.my - 24, 34, { color: "#fff36b", stroke: "#7a4a1a" });
      }
    },
    summary() { return { round, miss, phase }; },
  };
}

function basketDraw(ctx, x, y, items) {
  ctx.save(); ctx.translate(x, y);
  ctx.strokeStyle = "#8a5a2b"; ctx.lineWidth = 7;
  ctx.beginPath(); ctx.arc(0, -80, 62, Math.PI * 1.05, Math.PI * 1.95); ctx.stroke();
  items.forEach((f, i) => emoji(ctx, f.icon, -48 + (i % 4) * 32, -88 + Math.floor(i / 4) * -18, 40));
  ctx.fillStyle = "#d9a05b"; ctx.strokeStyle = "#8a5a2b"; ctx.lineWidth = 4;
  ctx.beginPath(); ctx.moveTo(-80, -82); ctx.lineTo(80, -82); ctx.lineTo(62, 0); ctx.lineTo(-62, 0); ctx.closePath(); ctx.fill(); ctx.stroke();
  ctx.strokeStyle = "rgba(120,70,30,.45)"; ctx.lineWidth = 3;
  for (let i = 1; i < 4; i++) { ctx.beginPath(); ctx.moveTo(-80 + i * 3, -82 + i * 20); ctx.lineTo(80 - i * 3, -82 + i * 20); ctx.stroke(); }
  ctx.restore();
}
