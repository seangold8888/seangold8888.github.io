// 헌팅턴 비치: 파도 타기. 콕 누르면 점프! 별을 모으고 통나무·부표는 넘는다. 큰 파도 꼭대기에서 점프하면 별 다섯 개.
import { text, star, Particles, Floaters, clamp, lerp, rng } from "../engine.js";
import { sky, htPier, hills, palm } from "./beachart.js";

const DURATION = 70;
const BIG_AT = [14, 31, 48, 63];

export function create(env) {
  const { sfx } = env;
  const easy = env.easy;
  const fx = new Particles(), fl = new Floaters();
  const r = rng(21);
  const u0 = clamp(Math.min(env.H / 820, env.W / 700), 0.75, 1.3);
  const jumpV = (easy ? 780 : 720) * u0, G = 1900 * u0;
  let t = 0, scroll = 0, jy = 0, vy = 0, got = 0, total = 0, inv = 0, wipes = 0, done = false, nextSpawn = 1.5, bigIdx = 0, botT = 0;
  let big = null, buddyJ = [], buddyY = 0, buddyV = 0, superJump = false, airT = 0;
  const objs = [];

  const speed = () => (easy ? 260 + 40 * t / DURATION : 300 + 70 * t / DURATION) * u0;
  function geo() {
    const W = env.W, H = env.H;
    return { W, H, horizon: H * (H > W ? 0.3 : 0.34), baseY: H * 0.72, px: W * 0.32 };
  }
  function surf(x, g) {
    let y = g.baseY + 10 * u0 * Math.sin((x + scroll) * 0.011) + 6 * u0 * Math.sin((x + scroll) * 0.027 + 1);
    if (big) y -= big.h * Math.exp(-Math.pow((x - big.x) / (210 * u0), 2));
    return y;
  }
  function spawn(g) {
    const x = g.W + 80 * u0;
    const p = r();
    if (p < (easy ? 0.32 : 0.42)) {
      const kind = r() < 0.5 ? "log" : "buoy";
      objs.push({ kind, x, w: kind === "log" ? 96 * u0 : 52 * u0 });
      [-55, 0, 55].forEach((dx, i) => { objs.push({ kind: "star", x: x + dx * u0, off: (i === 1 ? 135 : 100) * u0 }); total++; });
    } else if (p < 0.7) {
      [0, 60, 120].forEach(dx => { objs.push({ kind: "star", x: x + dx * u0, off: 0 }); total++; });
    } else {
      [0, 60, 120].forEach((dx, i) => { objs.push({ kind: "star", x: x + dx * u0, off: [95, 140, 95][i] * u0 }); total++; });
    }
  }
  function jump() {
    if (jy < 0 || vy !== 0) return;
    const g = geo();
    superJump = false; airT = 0;
    if (big && Math.abs(big.x - g.px) < 70 * u0 && !big.used) {
      big.used = true; superJump = true;
      vy = -jumpV * 1.35;
      got += 5;
      fl.add("멋진 점프! 🌟 +5", g.px, surf(g.px, g) - 230 * u0, "#fff36b", 38);
      sfx.fanfare();
      fx.burst(g.px, surf(g.px, g) - 120 * u0, 26, { color: ["#ffd23f", "#fff"], kind: "star", speed: 320, gravity: 250 });
    } else { vy = -jumpV; sfx.jump(); }
    buddyJ.push(0.35);
  }

  return {
    id: "huntington",
    update(dt) {
      t += dt;
      const g = geo(), S = speed();
      scroll += S * dt;
      if (t > 0.3 && t - dt <= 0.3) env.toast("콕 누르면 점프! 통나무는 넘어요 🏄", 2600);
      // 큰 파도
      if (bigIdx < BIG_AT.length && t >= BIG_AT[bigIdx]) {
        big = { x: g.W + 300 * u0, h: 0, used: false, life: 0 }; bigIdx++; total += 5;
        env.toast("큰 파도! 꼭대기에서 콕! 🌊", 2200);
      }
      if (big) {
        big.life += dt; big.x -= S * 0.8 * dt;
        big.h = Math.min(150 * u0, big.life * 140 * u0) * clamp((big.x + 300 * u0) / (300 * u0), 0, 1);
        if (big.x < -320 * u0) big = null;
      }
      if (t >= nextSpawn && t < DURATION - 2.5 && (!big || big.x < g.px - 200 * u0 || big.x > g.W + 100 * u0)) {
        spawn(g); nextSpawn = t + (easy ? 1.5 : 1.2) + r() * 0.5;
      }
      for (const o of objs) o.x -= S * dt;
      // 점프
      if (vy !== 0 || jy < 0) {
        vy += G * dt; jy += vy * dt; airT += dt;
        if (jy >= 0) { jy = 0; vy = 0; fx.burst(g.px, surf(g.px, g), 8, { color: ["#fff", "#cdefff"], speed: 160, size: 5, gravity: 500, angle: -Math.PI / 2, spread: 2 }); }
      }
      buddyJ = buddyJ.map(d => d - dt);
      if (buddyJ.length && buddyJ[0] <= 0) { buddyJ.shift(); if (buddyY >= 0 && buddyV === 0) buddyV = -jumpV * 0.8; }
      if (buddyV !== 0 || buddyY < 0) { buddyV += G * dt; buddyY += buddyV * dt; if (buddyY >= 0) { buddyY = 0; buddyV = 0; } }
      inv = Math.max(0, inv - dt);
      // 부딪힘·별
      const py = surf(g.px, g) + jy;
      for (const o of objs) {
        if (o.dead) continue;
        const dx = o.x - g.px;
        if (o.kind === "star") {
          const sy = surf(o.x, g) - 40 * u0 - o.off;
          if (Math.abs(dx) < 50 * u0 && Math.abs(sy - (py - 60 * u0)) < 70 * u0) {
            o.dead = true; got++; sfx.star();
            fx.burst(o.x, sy, 8, { color: ["#ffd23f", "#fff"], kind: "star", speed: 200, size: 4, gravity: 300 });
          }
        } else if (!o.passed && Math.abs(dx) < o.w / 2 + 6 * u0) {
          if (jy > -24 * u0 && inv <= 0) {
            o.passed = true; wipes++; inv = 1.3;
            sfx.splash(true);
            fx.burst(g.px, py - 20 * u0, 24, { color: ["#fff", "#bfe9ff", "#7fd0f5"], speed: 320, size: 7, gravity: 700, angle: -Math.PI / 2, spread: 2.4 });
            env.toast("첨벙! 괜찮아요, 다시 출발! 💦", 1500);
          }
        } else if (!o.passed && dx < -(o.w / 2 + 6 * u0)) { o.passed = true; fl.add("휙!", g.px, py - 150 * u0, "#ffffff", 26); }
      }
      for (let i = objs.length - 1; i >= 0; i--) if (objs[i].dead || objs[i].x < -150 * u0) objs.splice(i, 1);
      fx.update(dt); fl.update(dt);
      env.setProgress(t / DURATION);
      env.setScore(`⭐ ${got}`);
      if (t >= DURATION && !done) {
        done = true;
        const ratio = total ? got / total : 1, hi = easy ? 0.55 : 0.7, mid = easy ? 0.3 : 0.4;
        env.finish({ stars: ratio >= hi ? 3 : ratio >= mid ? 2 : 1, text: `별 ${got}개를 모았어요! 헌팅턴 파도 정복 🏄` });
      }
    },
    down() { jump(); },
    bot() {
      const g = geo(), S = speed();
      if (jy < 0 || vy !== 0) return;
      if (big && !big.used && Math.abs(big.x - g.px) < 30 * u0) { jump(); return; }
      if (big && big.x > g.px - 300 * u0 && big.x < g.px + 400 * u0) return; // 큰 파도 기다리기
      const tPeak = jumpV / G;
      const ob = objs.find(o => o.kind !== "star" && !o.passed && o.x - g.px > -10 * u0);
      if (ob) {
        const lead = ob.x - g.px - (ob.w / 2 + 6 * u0);
        if (lead < S * 0.08) { jump(); return; }
        if (lead < S * 1.0) return; // 장애물을 기다린다(위의 별은 넘으면서 줍는다)
      }
      const st = objs.find(o => o.kind === "star" && !o.dead && o.off > 50 * u0 && o.x - g.px > 0);
      if (st && (st.x - g.px) / S <= tPeak) jump();
    },
    draw(ctx) {
      const g = geo(), { W, H, horizon } = g;
      sky(ctx, W, H, horizon, t, 0.86);
      hills(ctx, W, horizon);
      palm(ctx, W * 0.08, horizon + 2, H * 0.1, 0.1, t);
      palm(ctx, W * 0.16, horizon + 2, H * 0.08, -0.1, t);
      const sea = ctx.createLinearGradient(0, horizon, 0, H);
      sea.addColorStop(0, "#1f6fb5"); sea.addColorStop(0.5, "#2a9cd4"); sea.addColorStop(1, "#38bfe0");
      ctx.fillStyle = sea; ctx.fillRect(0, horizon, W, H - horizon);
      htPier(ctx, W, H, horizon, scroll);
      // 너울 줄
      ctx.strokeStyle = "rgba(255,255,255,.4)"; ctx.lineWidth = 2;
      for (let i = 0; i < 8; i++) {
        const y = horizon + 40 + (g.baseY - horizon - 60) * i / 8, sp = 0.15 + i * 0.08, off = (scroll * sp + i * 53) % 160;
        for (let x = -off; x < W; x += 160) { ctx.beginPath(); ctx.moveTo(x, y); ctx.quadraticCurveTo(x + 20, y - 5, x + 40, y); ctx.stroke(); }
      }
      // 앞 물결(타는 파도)
      const front = ctx.createLinearGradient(0, g.baseY - 160 * u0, 0, H);
      front.addColorStop(0, "#5fd0f2"); front.addColorStop(0.4, "#2aa3d8"); front.addColorStop(1, "#1b7fbf");
      ctx.fillStyle = front;
      ctx.beginPath(); ctx.moveTo(0, H);
      for (let x = 0; x <= W + 10; x += 10) ctx.lineTo(x, surf(x, g));
      ctx.lineTo(W, H); ctx.closePath(); ctx.fill();
      ctx.strokeStyle = "#ffffff"; ctx.lineWidth = 6 * u0; ctx.lineJoin = "round";
      ctx.beginPath();
      for (let x = 0; x <= W + 10; x += 10) { const y = surf(x, g); x === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y); }
      ctx.stroke();
      // 물속 물고기와 거품
      for (let i = 0; i < 6; i++) {
        const fy = g.baseY + 70 * u0 + ((i * 97) % Math.max(60, H - g.baseY - 110 * u0));
        if (fy > H - 20) continue;
        const fx2 = W + 60 - ((scroll * (0.35 + i * 0.07) + i * 260) % (W + 120));
        fish(ctx, fx2, fy + Math.sin(t * 2 + i) * 6, u0 * (0.8 + (i % 3) * 0.2), ["#ffb347", "#ff7a9c", "#ffe14d"][i % 3]);
      }
      ctx.fillStyle = "rgba(255,255,255,.35)";
      for (let i = 0; i < 10; i++) {
        const bx = (i * 131 + 40) % W, by = H - ((t * 40 + i * 83) % Math.max(80, H - g.baseY - 40));
        ctx.beginPath(); ctx.arc(bx, by, 3 + (i % 3) * 2, 0, 7); ctx.fill();
      }
      // 큰 파도 꼭대기 표시
      if (big && !big.used && big.h > 40 * u0) {
        const y = surf(big.x, g) - 60 * u0, k = 0.5 + 0.5 * Math.sin(t * 10);
        ctx.lineWidth = 5; ctx.strokeStyle = `rgba(255,243,107,${0.6 + k * 0.4})`;
        ctx.beginPath(); ctx.arc(big.x, y, 42 * u0 + k * 6, 0, 7); ctx.stroke();
        text(ctx, "여기서 콕!", big.x, y - 70 * u0, 24 * u0, { color: "#fff36b", stroke: "#1b5e8c" });
      }
      // 물건
      for (const o of objs) {
        if (o.dead) continue;
        const y = surf(o.x, g);
        if (o.kind === "star") star(ctx, o.x, y - 40 * u0 - o.off + Math.sin(t * 4 + o.x * 0.05) * 4, 20 * u0, "#ffd23f", "#e58e00", Math.sin(t * 2 + o.x) * 0.2);
        else if (o.kind === "log") logDraw(ctx, o.x, y, o.w, u0, t);
        else buoy(ctx, o.x, y, u0, t);
      }
      // 친구(뒤에서 따라와요)
      const bimg = env.kid("surf", "buddy"), bx = W * 0.12, bys = surf(bx, g) + buddyY;
      board(ctx, bimg, bx, bys, env.buddy === "taeo" ? 92 * u0 : 122 * u0, slopeAt(bx), 1);
      // 주인공
      const pimg = env.kid("surf", "player"), py = surf(g.px, g) + jy;
      const rot = jy < 0 ? (superJump ? -Math.min(1, airT / (2.7 * jumpV / G)) * Math.PI * 2 : -0.15) : slopeAt(g.px);
      ctx.globalAlpha = inv > 0 && Math.floor(inv * 10) % 2 ? 0.45 : 1;
      board(ctx, pimg, g.px, py, env.player === "taeo" ? 118 * u0 : 160 * u0, rot, 1);
      ctx.globalAlpha = 1;
      fx.draw(ctx); fl.draw(ctx);

      function slopeAt(x) { return Math.atan((surf(x + 6, g) - surf(x - 6, g)) / 12) * 0.8; }
    },
    summary() { return { got, total, wipes }; },
  };
}

function board(ctx, img, x, y, h, rot, a) {
  if (!img) return;
  const w = img.width * h / img.height;
  ctx.save(); ctx.translate(x, y + h * 0.06 - h / 2); ctx.rotate(rot);
  ctx.globalAlpha *= a;
  ctx.drawImage(img, -w / 2, -h / 2, w, h);
  ctx.restore();
}

function fish(ctx, x, y, s, color) {
  ctx.save(); ctx.translate(x, y); ctx.globalAlpha = 0.55;
  ctx.fillStyle = color;
  ctx.beginPath(); ctx.ellipse(0, 0, 18 * s, 9 * s, 0, 0, 7); ctx.fill();
  ctx.beginPath(); ctx.moveTo(14 * s, 0); ctx.lineTo(28 * s, -9 * s); ctx.lineTo(28 * s, 9 * s); ctx.closePath(); ctx.fill();
  ctx.fillStyle = "#1b3a5a"; ctx.beginPath(); ctx.arc(-9 * s, -2 * s, 2.2 * s, 0, 7); ctx.fill();
  ctx.restore();
}

function logDraw(ctx, x, y, w, U, t) {
  ctx.save(); ctx.translate(x, y - 6 * U + Math.sin(t * 3 + x) * 2); ctx.rotate(Math.sin(t * 2 + x) * 0.05);
  ctx.fillStyle = "#8b5a2b"; ctx.strokeStyle = "#5e3a18"; ctx.lineWidth = 3 * U;
  ctx.beginPath(); ctx.roundRect ? ctx.roundRect(-w / 2, -14 * U, w, 28 * U, 14 * U) : ctx.rect(-w / 2, -14 * U, w, 28 * U); ctx.fill(); ctx.stroke();
  ctx.fillStyle = "#c48a4f"; ctx.beginPath(); ctx.ellipse(w / 2 - 6 * U, 0, 8 * U, 13 * U, 0, 0, 7); ctx.fill(); ctx.stroke();
  ctx.strokeStyle = "#6e4520"; ctx.lineWidth = 2 * U;
  ctx.beginPath(); ctx.moveTo(-w / 3, -5 * U); ctx.lineTo(w / 6, -5 * U); ctx.moveTo(-w / 5, 5 * U); ctx.lineTo(w / 4, 5 * U); ctx.stroke();
  ctx.fillStyle = "#3fbf5a"; ctx.beginPath(); ctx.ellipse(-w / 4, -16 * U, 7 * U, 4 * U, -0.4, 0, 7); ctx.fill();
  ctx.restore();
}

function buoy(ctx, x, y, U, t) {
  ctx.save(); ctx.translate(x, y - 14 * U + Math.sin(t * 4 + x) * 3);
  ctx.lineWidth = 12 * U;
  for (let i = 0; i < 8; i++) { ctx.strokeStyle = i % 2 ? "#ffffff" : "#ef3b3b"; ctx.beginPath(); ctx.arc(0, 0, 22 * U, i * Math.PI / 4, (i + 1) * Math.PI / 4); ctx.stroke(); }
  ctx.restore();
}
