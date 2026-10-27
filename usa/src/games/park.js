// 디즈니랜드(테마파크): 놀이기구 하루. 골라서 → 줄 서고(투덜투덜! ⚡ 라이트닝 패스) → 타고, 세 번. 마지막은 불꽃놀이.
// 놀이기구 이름(레이서스·스타워즈·피터팬)은 아이들이 부르던 이름표일 뿐, 그림은 모두 이 게임만의 것.
// 퍼레이드 마스코트도 이 게임만의 구름토끼·별곰.
import { cover, text, star, sprite, Particles, Floaters, clamp, rr } from "../engine.js";
import { createQueue } from "./parkqueue.js";
import { unit, emo } from "./parkkit.js";
import * as racers from "./parkracers.js";
import * as space from "./parkspace.js";
import * as pan from "./parkpan.js";

const FIRE_COLORS = [["#ff5fa2", "#ffd1e8"], ["#ffd23f", "#fff4b8"], ["#5fd4ff", "#d8f6ff"], ["#9b7bff", "#e2d8ff"], ["#7cf06b", "#e0ffd8"]];
const RIDES = [
  { id: "racers", name: "레이서스", icon: "🏎️", sub: "빨간 사막 자동차 경주", c: "#e0603a", c2: "#ffb36b", mod: racers },
  { id: "space", name: "스타워즈", icon: "🚀", sub: "우주선 타고 탈출!", c: "#3a4a8a", c2: "#151a40", mod: space },
  { id: "pan", name: "피터팬", icon: "⛵", sub: "밤하늘 날아 네버랜드로", c: "#5a3a9f", c2: "#1a1446", mod: pan },
];
// 첫 줄은 길고(60분!), 다음 줄들은 짧다
const QUEUES = [{ minutes: 60, speed: 1 }, { minutes: 40, speed: 3 }, { minutes: 30, speed: 3.6 }];
const FIRE_SEC = 10;
// 시작 카드 글(장소 목록의 옛 '롤러코스터' 글 대신)
export const TITLE = "놀이기구 하루";
export const GOAL = "줄 서서 투덜이를 달래고 💬<br>레이서스 🏎️ 스타워즈 🚀 피터팬 ⛵ 타기!";

export function create(env) {
  const { sfx } = env;
  const easy = env.easy;
  const fx = new Particles(), fl = new Floaters();
  const BADGE = easy ? 4 : 5;
  let phase = "menu", t = 0, pt = 0, order = 0, queue = null, ride = null, rideId = "", cheeredDone = 0, melts = 0;
  let fireT = 0, launched = 0, nextAuto = 1, done = false, botT = 0, saidMenu = false;
  const results = {};
  const rockets = [];

  function cards() {
    const W = env.W, H = env.H, U = unit(env);
    const port = H > W * 1.05;
    const out = [];
    if (port) {
      const w = Math.min(W - 64, 600 * U), h = 206 * U, gap = 22 * U, top = H * 0.2;
      RIDES.forEach((rd, i) => out.push({ rd, x: (W - w) / 2, y: top + i * (h + gap), w, h }));
    } else {
      const gap = 26 * U, w = Math.min((W - 80 - gap * 2) / 3, 330 * U), h = Math.min(330 * U, H * 0.5), left = (W - (w * 3 + gap * 2)) / 2, top = H * 0.27;
      RIDES.forEach((rd, i) => out.push({ rd, x: left + i * (w + gap), y: top, w, h }));
    }
    return out;
  }
  function pick(rd) {
    if (results[rd.id]) { sfx.wrong(); env.toast("벌써 탔어요! 다른 걸 골라요 🙂", 1800); return; }
    sfx.pop();
    rideId = rd.id;
    queue = createQueue(env, { mascot, ...QUEUES[order], passes: 1, jokeIndex: order, first: order === 0, gate: { name: rd.name, icon: rd.icon, c: rd.c }, badgeNeed: BADGE, cheeredBefore: cheeredDone });
    phase = "queue"; pt = 0;
  }
  function launch(x, y) {
    rockets.push({ x, y: env.H + 10, tx: x, ty: y, age: 0, c: FIRE_COLORS[launched % FIRE_COLORS.length] });
    launched++; sfx.launch();
  }
  const totalCheered = () => cheeredDone + (queue ? queue.cheered : 0);
  const cur = () => (phase === "queue" ? queue : phase === "ride" ? ride : null);

  const api = {
    id: "park",
    update(dt) {
      t += dt; pt += dt;
      const U = unit(env);
      if (phase === "menu") {
        if (!saidMenu && pt > 0.3) { saidMenu = true; env.toast(order ? `${3 - order}개 남았어요! 카드를 콕` : "오늘은 놀이기구 세 개! 카드를 콕", 2800); }
        env.setScore(`🎢 ${order}/3`);
        env.setProgress(order / 3 * 0.9);
      } else if (phase === "queue") {
        queue.update(dt);
        env.setProgress((order + 0.25 * queue.progress()) / 3 * 0.9);
        if (queue.done) {
          cheeredDone += queue.cheered; melts += queue.melts;
          const rd = RIDES.find(x => x.id === rideId);
          ride = rd.mod.create(env);
          queue = null; phase = "ride"; pt = 0;
        }
      } else if (phase === "ride") {
        ride.update(dt);
        env.setProgress((order + 0.25 + 0.75 * ride.progress()) / 3 * 0.9);
        if (ride.done) {
          if (ride.release) ride.release();
          results[rideId] = ride.result;
          ride = null; order++; pt = 0; saidMenu = false;
          if (order >= RIDES.length) {
            phase = "fire"; fireT = 0;
            env.toast("마지막은 불꽃놀이! 하늘을 콕 🎆", 3000);
            sfx.fanfare();
          } else phase = "menu";
        }
      } else if (phase === "fire") {
        fireT += dt;
        if (fireT > nextAuto) { nextAuto += 1.4; launch(env.W * (0.2 + Math.random() * 0.6), env.H * (0.12 + Math.random() * 0.25)); }
        env.setProgress(0.9 + fireT / FIRE_SEC * 0.1);
        env.setScore(`🎆 ${launched}`);
        if (fireT > FIRE_SEC && !done) {
          done = true;
          const sum = RIDES.reduce((n, rd) => n + (results[rd.id] ? results[rd.id].score : 1), 0);
          const badge = cheeredDone >= BADGE;
          const hiT = (easy ? 6 : 7) - (badge ? 1 : 0), midT = (easy ? 4 : 5) - (badge ? 1 : 0);
          const lines = RIDES.map(rd => results[rd.id] && results[rd.id].line).filter(Boolean);
          if (badge) lines.push("🏅 참을성 배지");
          env.finish({ stars: sum >= hiT ? 3 : sum >= midT ? 2 : 1, text: lines.join(" · ") });
        }
      }
      for (const k of rockets) {
        k.age += dt;
        const p = Math.min(1, k.age / 0.7);
        k.y = env.H + 10 + (k.ty - env.H - 10) * (1 - (1 - p) * (1 - p));
        if (p >= 1 && !k.boom) {
          k.boom = true; sfx.boom();
          fx.burst(k.tx, k.ty, 46, { color: k.c, speed: 300 * U, size: 4.5, gravity: 90, drag: 1.4, life: 1.5 });
          fx.burst(k.tx, k.ty, 14, { color: ["#fff"], speed: 120 * U, size: 3, gravity: 60, drag: 1, life: 1.1, kind: "star" });
        }
      }
      for (let i = rockets.length - 1; i >= 0; i--) if (rockets[i].boom) rockets.splice(i, 1);
      fx.update(dt); fl.update(dt);
    },
    down(x, y, id) {
      if (phase === "menu") { const c = cards().find(c => x > c.x && x < c.x + c.w && y > c.y && y < c.y + c.h); if (c) pick(c.rd); }
      else if (phase === "fire") { if (y < env.H * 0.72 && y > 70) launch(x, y); }
      else { const c = cur(); if (c && c.down) c.down(x, y, id); }
    },
    move(x, y, id) { const c = cur(); if (c && c.move) c.move(x, y, id); },
    up(x, y, id) { const c = cur(); if (c && c.up) c.up(x, y, id); },
    release() { const c = cur(); if (c && c.release) c.release(); },
    bot(dt) {
      const c = cur();
      if (c) { c.bot(dt); return; }
      botT += dt;
      if (phase === "menu" && botT > 0.8) { botT = 0; const k = cards().find(k => !results[k.rd.id]); if (k) api.down(k.x + k.w / 2, k.y + k.h / 2); }
      if (phase === "fire" && botT > 0.7) { botT = 0; api.down(env.W * (0.15 + Math.random() * 0.7), env.H * (0.15 + Math.random() * 0.35)); }
    },
    draw(ctx) {
      const W = env.W, H = env.H, U = unit(env);
      if (phase === "queue") { queue.draw(ctx); fx.draw(ctx); fl.draw(ctx); return; }
      if (phase === "ride") { ride.draw(ctx); if (pt < 0.45) { ctx.fillStyle = `rgba(255,255,255,${1 - pt / 0.45})`; ctx.fillRect(0, 0, W, H); } return; }
      cover(ctx, env.img("bg-park"), 0, 0, W, H, 0.5, 0.42, 1.08);
      if (phase === "menu") {
        ctx.fillStyle = "rgba(30,15,60,.35)"; ctx.fillRect(0, 0, W, H);
        text(ctx, order ? "다음엔 뭐 탈까?" : "뭐부터 탈까?", W / 2, H * (H > W * 1.05 ? 0.155 : 0.2), 50 * U, { color: "#fff", stroke: "#7b4bd0", lw: 10 * U });
        for (const c of cards()) card(ctx, c, results[c.rd.id], U, t);
        const kh = Math.min(170 * U, H * 0.16);
        sprite(ctx, env.kid("cheer", "player"), W * 0.1, H - 6, kh);
        sprite(ctx, env.kid("cheer", "buddy"), W * 0.9, H - 6, kh * 0.9, true);
      } else {
        // 불꽃놀이 피날레
        const a = Math.min(0.55, fireT / 2.5);
        ctx.fillStyle = `rgba(20,10,60,${a})`; ctx.fillRect(0, 0, W, H);
        for (const k of rockets) {
          ctx.fillStyle = k.c[1];
          ctx.beginPath(); ctx.arc(k.tx, k.y, 4 * U, 0, 7); ctx.fill();
          ctx.strokeStyle = "rgba(255,230,180,.6)"; ctx.lineWidth = 3 * U;
          ctx.beginPath(); ctx.moveTo(k.tx, k.y); ctx.lineTo(k.tx, k.y + 30 * U); ctx.stroke();
        }
        const kh = Math.min(190 * U, H * 0.2);
        sprite(ctx, env.kid("cheer", "buddy"), W * 0.42, H - 70 * U, kh * 0.9, true);
        sprite(ctx, env.kid("cheer", "player"), W * 0.58, H - 70 * U, kh);
        const span = W + 300 * U;
        for (let i = 0; i < 4; i++) {
          const px = ((fireT * 90 * U + i * span / 4) % span) - 150 * U;
          mascot(ctx, i % 2 ? "bear" : "bunny", px, H - 14 * U, U * 0.9, fireT + i);
        }
      }
      fx.draw(ctx); fl.draw(ctx);
    },
    summary() {
      return { phase, order, rides: Object.fromEntries(Object.entries(results).map(([k, v]) => [k, v.score])), cheered: totalCheered(), melts, launched, ride: ride && ride.summary ? ride.summary() : null, queue: queue ? queue.summary() : null };
    },
    // 점검용
    menuCards: () => cards().map(c => ({ id: c.rd.id, x: c.x + c.w / 2, y: c.y + c.h / 2 })),
    queueInfo: () => (queue ? queue.info() : null),
    queueMeter: v => queue && queue.setMeter(v),
    rideInfo: () => (ride && ride.info ? Object.assign({ id: ride.id }, ride.info()) : null),
  };
  return api;
}

function card(ctx, c, res, U, t) {
  const { rd, x, y, w, h } = c;
  const port = h < w;
  const s = res ? 1 : 1 + Math.sin(t * 3 + x) * 0.015;
  ctx.save(); ctx.translate(x + w / 2, y + h / 2); ctx.scale(s, s); ctx.translate(-w / 2, -h / 2);
  ctx.fillStyle = "rgba(0,0,0,.25)"; rr(ctx, 4, 8, w, h, 26 * U); ctx.fill();
  const g = ctx.createLinearGradient(0, 0, 0, h);
  g.addColorStop(0, rd.c2); g.addColorStop(1, rd.c);
  ctx.fillStyle = g; rr(ctx, 0, 0, w, h, 26 * U); ctx.fill();
  ctx.lineWidth = 5 * U; ctx.strokeStyle = "#fff"; ctx.stroke();
  const ix = port ? 100 * U : w / 2, iy = port ? h / 2 : h * 0.36;
  ctx.fillStyle = "rgba(255,255,255,.18)"; ctx.beginPath(); ctx.arc(ix, iy, 72 * U, 0, 7); ctx.fill();
  emo(ctx, rd.icon, ix, iy, 84 * U);
  const tx = port ? 200 * U + (w - 200 * U) / 2 : w / 2;
  text(ctx, rd.name, tx, port ? h * 0.4 : h * 0.68, 42 * U, { color: "#fff", stroke: "rgba(0,0,0,.35)" });
  text(ctx, rd.sub, tx, port ? h * 0.66 : h * 0.84, 21 * U, { color: "rgba(255,255,255,.92)", weight: 800 });
  if (res) {
    ctx.fillStyle = "rgba(255,255,255,.55)"; rr(ctx, 0, 0, w, h, 26 * U); ctx.fill();
    ctx.save(); ctx.translate(w - 70 * U, 64 * U); ctx.rotate(-0.2);
    ctx.strokeStyle = "#e0344f"; ctx.lineWidth = 6 * U; ctx.beginPath(); ctx.arc(0, 0, 52 * U, 0, 7); ctx.stroke();
    text(ctx, "탔다!", 0, -6 * U, 28 * U, { color: "#e0344f" });
    ctx.restore();
    for (let i = 0; i < 3; i++) star(ctx, w / 2 + (i - 1) * 44 * U, port ? h * 0.86 : h * 0.52, 18 * U, i < res.score ? "#ffe14d" : "#ddd", i < res.score ? "#d97706" : "#aaa");
  }
  ctx.restore();
}

export function mascot(ctx, kind, x, y, s, t) {
  const bob = Math.abs(Math.sin(t * 5)) * 8 * s;
  ctx.save();
  ctx.translate(x, y - bob);
  if (kind === "bunny") {
    // 구름토끼: 몽실몽실 구름 몸통에 긴 귀
    ctx.fillStyle = "#ffffff"; ctx.strokeStyle = "#c9d6f2"; ctx.lineWidth = 3 * s;
    [[-16, -84, 10, 34], [16, -84, 10, 34]].forEach(([ex, ey, rx, ry], i) => {
      ctx.save(); ctx.translate(ex * s, ey * s); ctx.rotate((i ? 1 : -1) * 0.18);
      ctx.beginPath(); ctx.ellipse(0, 0, rx * s, ry * s, 0, 0, 7); ctx.fill(); ctx.stroke();
      ctx.fillStyle = "#ffc1dc"; ctx.beginPath(); ctx.ellipse(0, 2 * s, rx * 0.5 * s, ry * 0.7 * s, 0, 0, 7); ctx.fill();
      ctx.restore(); ctx.fillStyle = "#ffffff";
    });
    [[0, -30, 34], [-28, -18, 22], [28, -18, 22], [0, -62, 28]].forEach(([cx, cy, rad]) => { ctx.beginPath(); ctx.arc(cx * s, cy * s, rad * s, 0, 7); ctx.fill(); });
    ctx.fillStyle = "#3a2a3a";
    ctx.beginPath(); ctx.arc(-9 * s, -64 * s, 3.5 * s, 0, 7); ctx.arc(9 * s, -64 * s, 3.5 * s, 0, 7); ctx.fill();
    ctx.fillStyle = "#ff9cc0"; ctx.beginPath(); ctx.arc(-17 * s, -56 * s, 5 * s, 0, 7); ctx.arc(17 * s, -56 * s, 5 * s, 0, 7); ctx.fill();
    ctx.strokeStyle = "#3a2a3a"; ctx.lineWidth = 2.5 * s; ctx.beginPath(); ctx.arc(0, -57 * s, 5 * s, 0.2, Math.PI - 0.2); ctx.stroke();
  } else {
    // 별곰: 노란 곰, 배에 별
    ctx.fillStyle = "#ffcf5a"; ctx.strokeStyle = "#d9962b"; ctx.lineWidth = 3 * s;
    [[-22, -84], [22, -84]].forEach(([ex, ey]) => { ctx.beginPath(); ctx.arc(ex * s, ey * s, 11 * s, 0, 7); ctx.fill(); ctx.stroke(); });
    ctx.beginPath(); ctx.ellipse(0, -28 * s, 30 * s, 32 * s, 0, 0, 7); ctx.fill(); ctx.stroke();
    ctx.beginPath(); ctx.arc(0, -68 * s, 27 * s, 0, 7); ctx.fill(); ctx.stroke();
    ctx.fillStyle = "#fff1c9"; ctx.beginPath(); ctx.ellipse(0, -60 * s, 12 * s, 9 * s, 0, 0, 7); ctx.fill();
    ctx.fillStyle = "#3a2a1a";
    ctx.beginPath(); ctx.arc(-10 * s, -72 * s, 3.5 * s, 0, 7); ctx.arc(10 * s, -72 * s, 3.5 * s, 0, 7); ctx.arc(0, -63 * s, 3.5 * s, 0, 7); ctx.fill();
    star(ctx, 0, -26 * s, 14 * s, "#ffffff", "#f0a63a");
  }
  ctx.restore();
}
