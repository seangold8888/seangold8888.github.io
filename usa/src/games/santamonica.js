// 산타모니카 비치: 모래성 지키기. 모래성을 콕콕 쌓고, 밀려오는 파도는 콕 쳐서 막는다.
import { text, emoji, sprite, Particles, Floaters, clamp, lerp, rng, rr } from "../engine.js";
import { sky, palm, sandDots, smPier } from "./beachart.js";

const DURATION = 70;

export function create(env) {
  const { sfx } = env;
  const easy = env.easy;
  const per = easy ? 4 : 6;
  const fx = new Particles(), fl = new Floaters();
  const r = rng(5);
  let t = 0, level = 0, build = 0, blocked = 0, crashes = 0, done = false, nextWave = 5, botT = 0, shake = 0, buildPop = 0;
  let dots = null, dotsKey = "";
  const waves = [];

  function geo() {
    const W = env.W, H = env.H, portrait = H > W;
    const u = clamp(Math.min(H / 820, W / 700), 0.7, 1.3);
    const horizon = H * (portrait ? 0.33 : 0.36);
    const shoreY = H * (portrait ? 0.47 : 0.52) + (t / DURATION) * H * 0.03;
    const castle = { x: W * 0.5, y: H * (portrait ? 0.84 : 0.86) };
    return { W, H, u, horizon, shoreY, castle, portrait };
  }
  function spawn(g) {
    const k = t / DURATION;
    const T = easy ? lerp(7, 5, k) : lerp(5.6, 3.7, k);
    const hp = easy ? (k > 0.55 ? 2 : 1) : (k > 0.5 && r() < 0.5 ? 3 : 2);
    waves.push({ x0: g.W * (0.18 + r() * 0.64), p: 0, T, hp, max: hp, hitAge: 9 });
    env.toast("파도가 와요! 콕 쳐서 막아요 🌊", 1400);
  }
  function wavePos(w, g) {
    const x = lerp(w.x0, g.castle.x, w.p), y = lerp(g.shoreY + 6, g.castle.y - 60 * g.u, w.p);
    const s = (0.45 + 0.55 * w.p) * (0.55 + 0.45 * w.hp / w.max);
    return { x, y, w: 300 * g.u * s, h: 70 * g.u * s };
  }
  function tapCastle(g, x, y) {
    if (level >= 5) { fx.burst(x, y, 6, { color: ["#fff36b", "#fff"], kind: "star", speed: 160, gravity: 100 }); sfx.star(); return; }
    build++; buildPop = 0.15;
    fx.burst(x, y, 6, { color: ["#e8c27a", "#d9a85c", "#f6dfa8"], speed: 200, size: 5, gravity: 700, angle: -Math.PI / 2, spread: 2 });
    if (build >= per) {
      build = 0; level++;
      sfx.level();
      fl.add(level >= 5 ? "모래성 완성! 🏰" : "뚝딱!", g.castle.x, g.castle.y - 230 * g.u, "#fff36b", level >= 5 ? 40 : 32);
      fx.burst(g.castle.x, g.castle.y - 80 * g.u, 18, { color: ["#ffd23f", "#fff"], kind: "star", speed: 260, gravity: 200 });
    } else sfx.build();
  }

  return {
    id: "santamonica",
    update(dt) {
      t += dt;
      const g = geo();
      if (t > 0.3 && t - dt <= 0.3) env.toast("모래성을 콕콕! 눌러서 쌓아요 🏰", 2600);
      if (t >= nextWave && t < DURATION - 3) {
        spawn(g);
        const k = t / DURATION;
        nextWave = t + (easy ? lerp(8, 4.6, k) : lerp(6.4, 3.1, k));
      }
      for (const w of waves) {
        w.p += dt / w.T; w.hitAge += dt;
        if (w.p >= 1 && !w.dead) {
          w.dead = true; crashes++;
          const lost = level > 0;
          level = Math.max(0, level - 1); build = 0; shake = 0.4;
          sfx.splash(true);
          fx.burst(g.castle.x, g.castle.y - 40 * g.u, 30, { color: ["#ffffff", "#bfe9ff", "#7fd0f5"], speed: 380, size: 7, gravity: 700, angle: -Math.PI / 2, spread: 2.6 });
          env.toast(lost ? "앗! 파도가 모래성을 쳤어요 🌊 다시 쌓아요!" : "철썩! 차가워요 💦", 1800);
        }
      }
      for (let i = waves.length - 1; i >= 0; i--) if (waves[i].dead) waves.splice(i, 1);
      shake = Math.max(0, shake - dt); buildPop = Math.max(0, buildPop - dt);
      fx.update(dt); fl.update(dt);
      env.setProgress(t / DURATION);
      env.setScore(`🏰 ${level}/5 · 🌊 ${blocked}`);
      if (t >= DURATION && !done) {
        done = true;
        const stars = level >= 5 ? 3 : level >= 3 ? 2 : 1;
        env.finish({ stars, text: `모래성 ${level}층! 파도를 ${blocked}번 막았어요 🏖️` });
      }
    },
    down(x, y) {
      const g = geo();
      // 파도가 먼저(가까운 것부터)
      const order = waves.slice().sort((a, b) => b.p - a.p);
      for (const w of order) {
        const p = wavePos(w, g);
        const dx = (x - p.x) / (p.w * 0.6), dy = (y - p.y) / (p.h * 1.3 + 30 * g.u);
        if (dx * dx + dy * dy <= 1) {
          w.hp--; w.hitAge = 0;
          sfx.splash(false);
          fx.burst(x, y, 12, { color: ["#ffffff", "#bfe9ff"], speed: 260, size: 6, gravity: 600, angle: -Math.PI / 2, spread: 2.4 });
          if (w.hp <= 0) {
            w.dead = true; blocked++;
            fl.add(["막았다!", "철썩 퐁!", "파도 안녕!"][blocked % 3], p.x, p.y - 40, "#ffffff", 32);
            sfx.pop();
          } else w.p = Math.max(0, w.p - 0.06);
          return;
        }
      }
      const c = g.castle, U = g.u;
      if (Math.abs(x - c.x) < 150 * U && y > c.y - 250 * U && y < c.y + 50 * U) tapCastle(g, x, y);
    },
    bot(dt) {
      botT += dt;
      if (botT < 0.13) return;
      botT = 0;
      const g = geo();
      const w = waves.filter(v => v.p > 0.2).sort((a, b) => b.p - a.p)[0];
      if (w) { const p = wavePos(w, g); this.down(p.x, p.y); }
      else if (level < 5) this.down(g.castle.x, g.castle.y - 60 * g.u);
    },
    draw(ctx) {
      const g = geo(), { W, H, u: U, horizon, shoreY } = g;
      const sx = shake > 0 ? Math.sin(t * 60) * 6 * shake : 0;
      ctx.save(); ctx.translate(sx, 0);
      sky(ctx, W, H, horizon, t, 0.12);
      // 먼 바다
      const sea = ctx.createLinearGradient(0, horizon, 0, shoreY);
      sea.addColorStop(0, "#2a78c8"); sea.addColorStop(1, "#46c1e6");
      ctx.fillStyle = sea; ctx.fillRect(-10, horizon, W + 20, shoreY - horizon + 2);
      ctx.strokeStyle = "rgba(255,255,255,.55)"; ctx.lineWidth = 2;
      for (let i = 0; i < 9; i++) {
        const y = horizon + (shoreY - horizon) * (i + 0.5) / 9, off = (t * 20 * (1 + i * 0.2) + i * 77) % 140;
        for (let x = -140 + off; x < W; x += 140) { ctx.beginPath(); ctx.moveTo(x, y); ctx.quadraticCurveTo(x + 15, y - 4, x + 30, y); ctx.stroke(); }
      }
      smPier(ctx, W, H, horizon, t);
      // 모래사장
      const sand = ctx.createLinearGradient(0, shoreY, 0, H);
      sand.addColorStop(0, "#d9b77a"); sand.addColorStop(0.12, "#f2d9a0"); sand.addColorStop(1, "#ecc77f");
      ctx.fillStyle = sand; ctx.fillRect(-10, shoreY, W + 20, H - shoreY);
      const key = W + "x" + H;
      if (key !== dotsKey) { dots = sandDots(W, H, shoreY + 20, 8); dotsKey = key; }
      ctx.fillStyle = "rgba(170,120,60,.25)";
      for (const [x, y, rr2] of dots) { ctx.beginPath(); ctx.arc(x, y, rr2, 0, 7); ctx.fill(); }
      // 물가 거품
      ctx.fillStyle = "rgba(255,255,255,.85)";
      ctx.beginPath(); ctx.moveTo(-10, shoreY - 4);
      for (let x = -10; x <= W + 10; x += 20) ctx.lineTo(x, shoreY + 4 + Math.sin(x * 0.04 + t * 2) * 4);
      ctx.lineTo(W + 10, shoreY - 6); ctx.closePath(); ctx.fill();
      palm(ctx, W * 0.05, shoreY + 10, H * 0.3, 0.12, t);
      palm(ctx, W * 0.13, shoreY + 6, H * 0.24, -0.1, t + 1);
      // 모래성
      castle(ctx, g.castle.x, g.castle.y, U * (1 + buildPop * 0.4), level, t);
      // 쌓기 진행 칸
      if (level < 5) {
        const bw = 26 * U, gap = 6 * U, total = per * bw + (per - 1) * gap, bx = g.castle.x - total / 2, by = g.castle.y + 34 * U;
        for (let i = 0; i < per; i++) { ctx.fillStyle = i < build ? "#ff9a3c" : "rgba(255,255,255,.75)"; rr(ctx, bx + i * (bw + gap), by, bw, 12 * U, 6 * U); ctx.fill(); }
        if (!waves.some(w => w.p > 0.45)) emoji(ctx, "👆", g.castle.x + 110 * U, g.castle.y - 40 * U + Math.sin(t * 7) * 8, 46 * U);
      }
      // 아이들
      const kh = H * (g.portrait ? 0.2 : 0.27);
      const kx = g.portrait ? W * 0.13 : W * 0.24;
      sprite(ctx, env.kid("beach", "player"), g.castle.x - (g.castle.x - kx), g.castle.y + 40 * U, kh);
      sprite(ctx, env.kid("beach", "buddy"), W - kx, g.castle.y + 40 * U, kh * 0.92, true);
      // 파도
      for (const w of waves.slice().sort((a, b) => a.p - b.p)) drawWave(ctx, wavePos(w, g), w, t);
      fx.draw(ctx); fl.draw(ctx);
      ctx.restore();
    },
    summary() { return { level, blocked, crashes }; },
  };
}

function drawWave(ctx, p, w, t) {
  const { x, y } = p, hw = p.w / 2, h = p.h;
  const wob = w.hitAge < 0.2 ? Math.sin(w.hitAge * 60) * 6 : 0;
  ctx.save(); ctx.translate(x + wob, y);
  const g = ctx.createLinearGradient(0, -h, 0, h * 0.5);
  g.addColorStop(0, "#9be3ff"); g.addColorStop(0.5, "#3fb2e8"); g.addColorStop(1, "rgba(63,178,232,.35)");
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.moveTo(-hw, h * 0.4);
  ctx.bezierCurveTo(-hw * 0.8, -h * 0.6, -hw * 0.2, -h * 1.15, hw * 0.25, -h);
  ctx.bezierCurveTo(hw * 0.65, -h * 0.9, hw * 0.55, -h * 0.35, hw * 0.35, -h * 0.4);
  ctx.bezierCurveTo(hw * 0.6, -h * 0.2, hw * 0.9, 0, hw, h * 0.4);
  ctx.closePath(); ctx.fill();
  // 하얀 거품 볏
  ctx.fillStyle = "#ffffff";
  for (let i = 0; i < 7; i++) {
    const k = i / 6, bx = lerp(-hw * 0.75, hw * 0.45, k), by = -h * (0.55 + 0.45 * Math.sin(k * Math.PI)) + Math.sin(t * 6 + i) * 2;
    ctx.beginPath(); ctx.arc(bx, by, h * (0.16 + 0.06 * Math.sin(k * 3)), 0, 7); ctx.fill();
  }
  ctx.fillStyle = "rgba(255,255,255,.7)";
  ctx.beginPath(); ctx.ellipse(0, h * 0.38, hw, h * 0.12, 0, 0, 7); ctx.fill();
  // 남은 힘(물방울 점)
  for (let i = 0; i < w.hp; i++) { ctx.fillStyle = "#1f6fb2"; ctx.beginPath(); ctx.arc((i - (w.hp - 1) / 2) * 16, -h * 0.25, 5, 0, 7); ctx.fill(); }
  ctx.restore();
}

function castle(ctx, x, y, U, level, t) {
  const sand = "#e9c47e", dark = "#c9974f", light = "#f6dfaa";
  ctx.save(); ctx.translate(x, y);
  ctx.fillStyle = "rgba(120,80,30,.25)"; ctx.beginPath(); ctx.ellipse(0, 6 * U, 150 * U, 22 * U, 0, 0, 7); ctx.fill();
  ctx.fillStyle = sand; ctx.beginPath(); ctx.ellipse(0, 0, 130 * U, 26 * U, 0, 0, 7); ctx.fill();
  const block = (bx, by, w, h) => {
    ctx.fillStyle = sand; ctx.fillRect(bx, by, w, h);
    ctx.fillStyle = dark; ctx.fillRect(bx + w - 8 * U, by, 8 * U, h);
    ctx.fillStyle = light; ctx.fillRect(bx, by, 6 * U, h);
    const m = Math.max(2, Math.round(w / (22 * U)));
    const mw = w / (m * 2 - 1);
    for (let i = 0; i < m; i++) { ctx.fillStyle = sand; ctx.fillRect(bx + i * 2 * mw, by - 12 * U, mw, 12 * U); }
  };
  if (level >= 1) { ctx.fillStyle = sand; ctx.beginPath(); ctx.ellipse(0, -6 * U, 105 * U, 50 * U, 0, Math.PI, 0); ctx.fill(); ctx.fillStyle = light; ctx.beginPath(); ctx.ellipse(-30 * U, -30 * U, 30 * U, 12 * U, -0.3, 0, 7); ctx.fill(); }
  if (level >= 2) { block(-85 * U, -96 * U, 170 * U, 70 * U); ctx.fillStyle = "#8a5a2b"; ctx.beginPath(); ctx.ellipse(0, -40 * U, 16 * U, 22 * U, 0, Math.PI, 0); ctx.rect(-16 * U, -40 * U, 32 * U, 14 * U); ctx.fill(); }
  if (level >= 3) block(-30 * U, -176 * U, 60 * U, 80 * U);
  if (level >= 4) { block(-98 * U, -150 * U, 42 * U, 56 * U); block(56 * U, -150 * U, 42 * U, 56 * U); }
  if (level >= 5) {
    const flag = (fx2, fy, c) => {
      ctx.strokeStyle = "#7a5230"; ctx.lineWidth = 3 * U; ctx.beginPath(); ctx.moveTo(fx2, fy); ctx.lineTo(fx2, fy - 46 * U); ctx.stroke();
      ctx.fillStyle = c; ctx.beginPath(); ctx.moveTo(fx2, fy - 46 * U); ctx.lineTo(fx2 + (26 + Math.sin(t * 6) * 4) * U, fy - 38 * U); ctx.lineTo(fx2, fy - 30 * U); ctx.closePath(); ctx.fill();
    };
    flag(0, -188 * U, "#ff5f6d"); flag(-77 * U, -162 * U, "#4fc3f7"); flag(77 * U, -162 * U, "#ffd23f");
    [[-60, -60], [40, -70], [-20, -120], [70, -30], [-90, -20]].forEach(([sx2, sy2], i) => { ctx.fillStyle = i % 2 ? "#ffb3c6" : "#fff"; ctx.beginPath(); ctx.ellipse(sx2 * U, sy2 * U, 7 * U, 5 * U, 0.4, 0, 7); ctx.fill(); });
  }
  ctx.restore();
}
