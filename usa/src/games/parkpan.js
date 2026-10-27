// 피터팬: 작은 하늘 돛단배를 타고 밤의 런던 지붕 위를 지나 네버랜드까지.
// 손가락 높이로 배가 따라온다. 반짝이 별을 모은다. (책 속 이야기 느낌으로 직접 그린 그림만 쓴다)
import { text, star, Particles, Floaters, clamp, rng, rr } from "../engine.js";
import { unit, upper, bigTitle, hash } from "./parkkit.js";

export function create(env) {
  const { sfx } = env;
  const easy = env.easy;
  const fx = new Particles(), fl = new Floaters();
  const U0 = unit(env);
  const L = 7600 * U0, SPEED = 310 * U0;
  let stage = "intro", st = 0, t = 0, x = 0, y = env.H * 0.5, vy = 0, ty = null, got = 0, done = false, touching = false;
  let said1 = false, said2 = false, said3 = false;
  const r = rng(5);
  const stars = [];
  for (let wx = 900 * U0; wx < L - 500 * U0;) {
    const n = 5 + (r() * 3 | 0), base = 0.3 + r() * 0.4, amp = 0.07 + r() * 0.12, ph = r() * 6;
    for (let i = 0; i < n; i++) stars.push({ x: wx + i * 78 * U0, f: clamp(base + Math.sin(ph + i * 0.75) * amp, 0.22, 0.8), got: false });
    wx += n * 78 * U0 + (240 + r() * 220) * U0;
  }
  const lo = () => env.H * 0.2, hi = () => env.H * 0.84;
  const sx = () => env.W * 0.27;
  const starY = s => env.H * s.f;

  const api = {
    id: "pan",
    get done() { return done; },
    progress: () => clamp(x / L, 0, 1),
    update(dt) {
      t += dt; st += dt;
      const U = unit(env);
      if (stage === "intro") {
        if (st > 1.4) { stage = "play"; st = 0; env.toast("손가락을 대고 위아래로! 반짝이 별을 모아요 ✨", 3000); }
      } else if (stage === "play") {
        x += SPEED * dt;
        const p = x / L;
        if (!said1 && p > 0.12) { said1 = true; fl.add("런던 밤하늘이다! 🌙", env.W / 2, env.H * 0.26, "#fff7c2", 32 * U); }
        if (!said2 && p > 0.44) { said2 = true; env.toast("오른쪽 두 번째 별로, 아침까지 쭉~! ⭐", 2800); }
        if (!said3 && p > 0.64) { said3 = true; fl.add("네버랜드다! 🏝️", env.W / 2, env.H * 0.26, "#fff36b", 36 * U); sfx.level(); }
        const reach = (easy ? 78 : 60) * U;
        const cy = y - 40 * U;
        for (const s of stars) {
          if (s.got) continue;
          const dx = s.x - x;
          if (dx < -80 * U) continue;
          if (dx > 90 * U) break;
          if (Math.abs(dx) < reach && Math.abs(starY(s) - cy) < reach * 1.15) {
            s.got = true; got++;
            sfx.star();
            fx.burst(sx() + dx, starY(s), 10, { color: ["#ffe14d", "#fff"], kind: "star", speed: 220, size: 5, gravity: 120 });
          }
        }
        env.setScore(`⭐ ${got}`);
        if (x >= L) { stage = "outro"; st = 0; sfx.fanfare(); }
      } else if (stage === "outro") {
        x += SPEED * dt * Math.max(0, 1 - st);
        if (st > 2.2) done = true;
      }
      // 손가락 높이를 따라 난다(손을 떼면 그 자리에서 둥실)
      const target = clamp(ty == null ? env.H * 0.5 : ty, lo(), hi());
      const ny = y + (target - y) * Math.min(1, dt * 5);
      vy = (ny - y) / Math.max(dt, 1e-3); y = ny;
      if (stage !== "intro" && Math.random() < 0.9) fx.burst(sx() - 70 * U, y - 10 * U + (Math.random() - 0.5) * 20 * U, 1, { color: ["#fff6b0", "#ffd23f", "#fff"], speed: 70, size: 3.5, gravity: 40, life: 0.9, kind: Math.random() < 0.3 ? "star" : "dot" });
      fx.update(dt); fl.update(dt);
    },
    down(px, py) { touching = true; ty = py; },
    move(px, py) { if (touching) ty = py; },
    up() { touching = false; },
    release() { touching = false; },
    bot() {
      if (stage !== "play") return;
      const next = stars.find(s => !s.got && s.x > x - 20 * U0);
      ty = next ? starY(next) + 40 * unit(env) : env.H * 0.5;
    },
    get result() {
      const ratio = got / stars.length, hiR = easy ? 0.6 : 0.75, mid = easy ? 0.35 : 0.45;
      return { score: ratio >= hiR ? 3 : ratio >= mid ? 2 : 1, line: `⛵ 별 ${got}개` };
    },
    info: () => ({ stage, p: x / L, y, ty, got, total: stars.length }),
    summary: () => ({ stage, got, total: stars.length }),
    draw(ctx) {
      const W = env.W, H = env.H, U = unit(env);
      const p = clamp(x / L, 0, 1);
      const k = clamp((p - 0.5) / 0.14, 0, 1);
      // 하늘
      let g = ctx.createLinearGradient(0, 0, 0, H);
      g.addColorStop(0, "#081233"); g.addColorStop(0.7, "#1f3a78"); g.addColorStop(1, "#33508f");
      ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
      if (k > 0) {
        ctx.globalAlpha = k;
        g = ctx.createLinearGradient(0, 0, 0, H);
        g.addColorStop(0, "#160f3f"); g.addColorStop(0.55, "#5a3a8f"); g.addColorStop(0.85, "#ff9f8a"); g.addColorStop(1, "#ffd0a0");
        ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
        ctx.globalAlpha = 1;
      }
      // 반짝이는 하늘 별
      for (let i = 0; i < 90; i++) {
        const sx0 = ((hash(i) * W * 1.5 - x * 0.04) % (W * 1.5) + W * 1.5) % (W * 1.5) - W * 0.25, sy0 = hash(i + 500) * H * 0.62;
        ctx.globalAlpha = 0.4 + 0.6 * Math.abs(Math.sin(t * 1.5 + i));
        ctx.fillStyle = "#fff"; ctx.beginPath(); ctx.arc(sx0, sy0, (1 + hash(i + 900) * 1.8) * U, 0, 7); ctx.fill();
      }
      ctx.globalAlpha = 1;
      // 달
      const mx = W * 0.78 - p * W * 0.12, my = H * 0.19, mr = 64 * U;
      const glow = ctx.createRadialGradient(mx, my, mr * 0.6, mx, my, mr * 2.4);
      glow.addColorStop(0, "rgba(255,246,208,.45)"); glow.addColorStop(1, "rgba(255,246,208,0)");
      ctx.fillStyle = glow; ctx.beginPath(); ctx.arc(mx, my, mr * 2.4, 0, 7); ctx.fill();
      ctx.fillStyle = "#fff6d0"; ctx.beginPath(); ctx.arc(mx, my, mr, 0, 7); ctx.fill();
      ctx.fillStyle = "rgba(220,205,160,.5)";
      [[-20, -14, 12], [18, 10, 9], [-6, 24, 7]].forEach(([a, b, c]) => { ctx.beginPath(); ctx.arc(mx + a * U, my + b * U, c * U, 0, 7); ctx.fill(); });
      // 런던 지붕들
      const lon = 1 - clamp((p - 0.52) / 0.1, 0, 1);
      if (lon > 0) {
        ctx.globalAlpha = lon;
        roofs(ctx, W, H, x * 0.22, 150 * U, H * 0.78, "#1a2552", U, false, 1);
        tower(ctx, W * 0.62 + (L * 0.2 - x) * 0.4, H * 0.86, U, t);
        roofs(ctx, W, H, x * 0.6, 120 * U, H * 0.9, "#0d1430", U, true, 2);
        ctx.globalAlpha = 1;
      }
      // 구름 다리(런던 → 네버랜드)
      if (p > 0.38 && p < 0.72) {
        for (let i = 0; i < 7; i++) {
          const cx0 = W * 1.1 + (L * 0.47 - x) * 1.1 + i * 210 * U, cy0 = H * (0.25 + hash(i + 40) * 0.6);
          puff(ctx, cx0, cy0, (60 + hash(i + 7) * 40) * U, "rgba(255,255,255,.75)");
        }
      }
      // 네버랜드
      if (k > 0) {
        ctx.globalAlpha = k;
        const sea = H * 0.8;
        ctx.fillStyle = "#1d3f6e"; ctx.fillRect(0, sea, W, H - sea);
        ctx.strokeStyle = "rgba(255,220,180,.35)"; ctx.lineWidth = 2 * U;
        for (let i = 0; i < 14; i++) { const wy = sea + 10 * U + hash(i) * (H - sea - 14 * U), wx = ((hash(i + 3) * W - x * 0.5) % W + W) % W; ctx.beginPath(); ctx.moveTo(wx, wy); ctx.lineTo(wx + 40 * U, wy); ctx.stroke(); }
        island(ctx, W * 0.55 + (L * 0.8 - x) * 0.3, sea, U, t);
        pirate(ctx, W * 0.75 + (L * 0.86 - x) * 0.55, sea + 18 * U, U, t);
        lagoon(ctx, W * 0.45 + (L * 0.95 - x) * 0.7, sea + 30 * U, U, t);
        ctx.globalAlpha = 1;
      }
      // 모을 별
      for (const s of stars) {
        if (s.got) continue;
        const px = sx() + s.x - x;
        if (px < -40 || px > W + 40) continue;
        const py = starY(s) + Math.sin(t * 4 + s.x) * 4 * U;
        const gl = ctx.createRadialGradient(px, py, 4, px, py, 38 * U);
        gl.addColorStop(0, "rgba(255,255,220,.9)"); gl.addColorStop(1, "rgba(255,255,200,0)");
        ctx.fillStyle = gl; ctx.beginPath(); ctx.arc(px, py, 38 * U, 0, 7); ctx.fill();
        star(ctx, px, py, 22 * U, "#ffe14d", "#d97706", Math.sin(t * 2 + s.x) * 0.2);
      }
      fx.draw(ctx);
      ship(ctx, sx(), y, U, clamp(vy / 900, -0.25, 0.25), t, env.kid(stage === "outro" || got % 7 === 6 ? "cheer" : "travel", "player"), env.kid("cheer", "buddy"));
      fl.draw(ctx);
      if (stage === "intro") bigTitle(ctx, env, "⛵ 피터팬 출발!", st, U, "#fff", "#3a4fa0");
      if (stage === "outro") bigTitle(ctx, env, "네버랜드 도착! 🏝️", st, U, "#fff36b", "#5a3a8f");
    },
  };
  return api;
}

function roofs(ctx, W, H, cam, tw, base, color, U, windows, seed) {
  ctx.fillStyle = color;
  const i0 = Math.floor(cam / tw) - 1;
  for (let i = i0; i < i0 + W / tw + 3; i++) {
    const x = i * tw - cam, h = (40 + hash(i * 3 + seed) * 90) * U, top = base - h;
    ctx.fillStyle = color;
    ctx.fillRect(x, top, tw + 1, H - top);
    const roof = hash(i + seed * 17);
    ctx.beginPath();
    if (roof < 0.5) { ctx.moveTo(x, top); ctx.lineTo(x + tw / 2, top - 34 * U); ctx.lineTo(x + tw, top); }
    else { ctx.rect(x + tw * 0.15, top - 26 * U, 16 * U, 26 * U); ctx.rect(x + tw * 0.62, top - 34 * U, 14 * U, 34 * U); }
    ctx.fill();
    if (windows) {
      for (let j = 0; j < 3; j++) for (let k = 0; k < 2; k++) {
        if (hash(i * 7 + j * 3 + k) < 0.55) continue;
        ctx.fillStyle = "#ffd77a"; ctx.fillRect(x + (16 + j * 34) * U, top + (16 + k * 34) * U, 14 * U, 18 * U);
      }
    }
  }
}

function tower(ctx, x, base, U, t) {
  // 커다란 시계탑(이 게임만의 모양)
  const w = 74 * U, h = 420 * U, top = base - h;
  if (x < -w * 2 || x > ctx.canvas.width + w * 2) return;
  ctx.fillStyle = "#141c42";
  ctx.fillRect(x - w / 2, top, w, h);
  ctx.beginPath(); ctx.moveTo(x - w / 2 - 6 * U, top); ctx.lineTo(x, top - 110 * U); ctx.lineTo(x + w / 2 + 6 * U, top); ctx.fill();
  const cy = top + 50 * U;
  ctx.fillStyle = "#ffe9a8"; ctx.beginPath(); ctx.arc(x, cy, 27 * U, 0, 7); ctx.fill();
  ctx.strokeStyle = "#5a4a2a"; ctx.lineWidth = 3 * U;
  ctx.beginPath(); ctx.arc(x, cy, 27 * U, 0, 7); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(x, cy); ctx.lineTo(x, cy - 19 * U); ctx.moveTo(x, cy); ctx.lineTo(x + 13 * U, cy + 3 * U); ctx.stroke();
}

function puff(ctx, x, y, s, c) {
  ctx.fillStyle = c; ctx.beginPath();
  ctx.arc(x, y, s, 0, 7); ctx.arc(x + s * 0.9, y + s * 0.15, s * 0.75, 0, 7); ctx.arc(x - s * 0.9, y + s * 0.2, s * 0.7, 0, 7); ctx.arc(x + s * 0.2, y - s * 0.5, s * 0.7, 0, 7);
  ctx.fill();
}

function island(ctx, x, sea, U, t) {
  ctx.fillStyle = "#2f6a4a";
  ctx.beginPath(); ctx.moveTo(x - 340 * U, sea); ctx.quadraticCurveTo(x - 200 * U, sea - 190 * U, x - 40 * U, sea - 150 * U);
  ctx.quadraticCurveTo(x + 80 * U, sea - 260 * U, x + 200 * U, sea - 120 * U); ctx.quadraticCurveTo(x + 280 * U, sea - 60 * U, x + 360 * U, sea); ctx.fill();
  ctx.fillStyle = "#e9c98a"; ctx.beginPath(); ctx.ellipse(x, sea, 360 * U, 16 * U, 0, Math.PI, 0); ctx.fill();
  // 야자나무
  for (const [dx, hh] of [[-150, 110], [130, 90], [220, 70]]) {
    const px = x + dx * U, py = sea - 8 * U;
    ctx.strokeStyle = "#6b4a2a"; ctx.lineWidth = 7 * U;
    ctx.beginPath(); ctx.moveTo(px, py); ctx.quadraticCurveTo(px + 14 * U, py - hh * 0.6 * U, px + 6 * U, py - hh * U); ctx.stroke();
    ctx.fillStyle = "#3f9a5a";
    for (let i = 0; i < 5; i++) {
      const a = -Math.PI / 2 + (i - 2) * 0.6 + Math.sin(t * 2 + i) * 0.05;
      ctx.beginPath(); ctx.ellipse(px + 6 * U + Math.cos(a) * 26 * U, py - hh * U + Math.sin(a) * 14 * U, 30 * U, 8 * U, a, 0, 7); ctx.fill();
    }
  }
}

function pirate(ctx, x, y, U, t) {
  // 해적선(검은 돛의 범선)
  const b = Math.sin(t * 1.6) * 4 * U;
  ctx.save(); ctx.translate(x, y + b); ctx.rotate(Math.sin(t * 1.3) * 0.03);
  ctx.fillStyle = "#3a2418";
  ctx.beginPath(); ctx.moveTo(-110 * U, -30 * U); ctx.lineTo(110 * U, -40 * U); ctx.lineTo(80 * U, 10 * U); ctx.lineTo(-90 * U, 10 * U); ctx.closePath(); ctx.fill();
  ctx.fillStyle = "#d9a441"; ctx.fillRect(-100 * U, -28 * U, 200 * U, 4 * U);
  ctx.strokeStyle = "#3a2418"; ctx.lineWidth = 5 * U;
  ctx.beginPath(); ctx.moveTo(-30 * U, -30 * U); ctx.lineTo(-30 * U, -190 * U); ctx.moveTo(40 * U, -34 * U); ctx.lineTo(40 * U, -160 * U); ctx.stroke();
  ctx.fillStyle = "#2b2b38";
  [[-30, -180, 60, 60], [-30, -110, 70, 60], [40, -150, 50, 50], [40, -92, 58, 46]].forEach(([mx, my, w, h]) => {
    ctx.beginPath(); ctx.moveTo(mx * U - w / 2 * U, my * U); ctx.quadraticCurveTo(mx * U, my * U + 10 * U, mx * U + w / 2 * U, my * U);
    ctx.lineTo(mx * U + w / 2 * U, my * U + h * U); ctx.quadraticCurveTo(mx * U + 8 * U, my * U + h * U + 12 * U, mx * U - w / 2 * U, my * U + h * U); ctx.fill();
  });
  ctx.fillStyle = "#c0304f"; ctx.beginPath(); ctx.moveTo(-30 * U, -190 * U); ctx.lineTo(-4 * U, -184 * U); ctx.lineTo(-30 * U, -178 * U); ctx.fill();
  ctx.restore();
}

function lagoon(ctx, x, y, U, t) {
  // 인어 석호: 물 위로 반짝이는 꼬리가 찰랑
  ctx.fillStyle = "rgba(90,220,210,.5)"; ctx.beginPath(); ctx.ellipse(x, y, 130 * U, 22 * U, 0, 0, 7); ctx.fill();
  const a = Math.sin(t * 3) * 0.4;
  ctx.save(); ctx.translate(x, y - 4 * U); ctx.rotate(a);
  ctx.fillStyle = "#3fc0a8";
  ctx.beginPath(); ctx.moveTo(-8 * U, 0); ctx.quadraticCurveTo(-4 * U, -34 * U, 0, -44 * U); ctx.quadraticCurveTo(4 * U, -34 * U, 8 * U, 0); ctx.fill();
  ctx.beginPath(); ctx.moveTo(0, -42 * U); ctx.quadraticCurveTo(-26 * U, -62 * U, -30 * U, -48 * U); ctx.quadraticCurveTo(-12 * U, -46 * U, 0, -38 * U);
  ctx.quadraticCurveTo(12 * U, -46 * U, 30 * U, -48 * U); ctx.quadraticCurveTo(26 * U, -62 * U, 0, -42 * U); ctx.fill();
  ctx.restore();
  ctx.fillStyle = "rgba(255,255,255,.8)";
  for (let i = 0; i < 4; i++) { ctx.beginPath(); ctx.arc(x + (i - 1.5) * 18 * U, y - 6 * U - Math.abs(Math.sin(t * 3 + i)) * 10 * U, 3 * U, 0, 7); ctx.fill(); }
}

function ship(ctx, x, y, U, tilt, t, kidP, kidB) {
  // 하늘을 나는 작은 나무 돛단배(아이 둘이 탄다)
  ctx.save();
  ctx.translate(x, y + Math.sin(t * 3) * 4 * U); ctx.rotate(tilt);
  const glow = ctx.createRadialGradient(0, -20 * U, 10 * U, 0, -20 * U, 150 * U);
  glow.addColorStop(0, "rgba(255,240,170,.35)"); glow.addColorStop(1, "rgba(255,240,170,0)");
  ctx.fillStyle = glow; ctx.beginPath(); ctx.arc(0, -20 * U, 150 * U, 0, 7); ctx.fill();
  // 돛대와 돛
  ctx.strokeStyle = "#6b4a2a"; ctx.lineWidth = 6 * U;
  ctx.beginPath(); ctx.moveTo(40 * U, -24 * U); ctx.lineTo(40 * U, -190 * U); ctx.stroke();
  const bil = Math.sin(t * 2) * 6 * U;
  ctx.fillStyle = "#fff6e0"; ctx.strokeStyle = "#d9c08a"; ctx.lineWidth = 3 * U;
  ctx.beginPath(); ctx.moveTo(44 * U, -184 * U); ctx.quadraticCurveTo(110 * U + bil, -130 * U, 44 * U, -56 * U); ctx.closePath(); ctx.fill(); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(36 * U, -176 * U); ctx.quadraticCurveTo(-10 * U + bil * 0.5, -130 * U, 36 * U, -74 * U); ctx.closePath(); ctx.fill(); ctx.stroke();
  ctx.fillStyle = "#ff5fa2"; ctx.beginPath(); ctx.moveTo(40 * U, -190 * U); ctx.lineTo(70 * U, -182 * U + Math.sin(t * 8) * 3 * U); ctx.lineTo(40 * U, -174 * U); ctx.fill();
  // 아이들
  upper(ctx, kidB, -56 * U, -26 * U, 150 * U, true);
  upper(ctx, kidP, -6 * U, -24 * U, 164 * U, false);
  // 배
  const hg = ctx.createLinearGradient(0, -34 * U, 0, 24 * U);
  hg.addColorStop(0, "#a8693a"); hg.addColorStop(1, "#5e3a1e");
  ctx.fillStyle = hg;
  ctx.beginPath(); ctx.moveTo(-104 * U, -36 * U); ctx.lineTo(112 * U, -36 * U); ctx.quadraticCurveTo(96 * U, 20 * U, 0, 24 * U); ctx.quadraticCurveTo(-90 * U, 20 * U, -104 * U, -36 * U); ctx.fill();
  ctx.fillStyle = "#ffd23f"; rr(ctx, -104 * U, -40 * U, 218 * U, 9 * U, 4 * U); ctx.fill();
  ctx.fillStyle = "#fff3b0";
  [-50, 0, 50].forEach(dx => { ctx.beginPath(); ctx.arc(dx * U, -8 * U, 7 * U, 0, 7); ctx.fill(); });
  ctx.restore();
}
