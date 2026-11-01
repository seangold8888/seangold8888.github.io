// 스타워즈: 커다란 적 우주선 안 격납고에서 작은 탈출선을 타고 빠져나와 우주로 슝!
// 손가락 높이로 배를 움직여 피하고, 날아오는 빨간 빛을 콕 누르면 방패로 튕겨 낸다.
// 우주선·격납고는 모두 이 게임만의 모양으로 직접 그린다.
import { text, Particles, Floaters, clamp, rng, rr } from "../engine.js";
import { unit, upper, bigTitle, hash } from "./parkkit.js";

export function create(env) {
  const { sfx } = env;
  const easy = env.easy;
  const fx = new Particles(), fl = new Floaters();
  const T_OUT = 12, T_HYPER = 22, T_END = 24;     // 격납고 탈출, 초공간 도약, 끝(초)
  const RATE = easy ? 1.25 : 0.95, BS = easy ? 380 : 460, DEF = easy ? 100 : 80;
  let stage = "intro", st = 0, t = 0, pt = 0, y = env.H * 0.5, vy = 0, ty = null, touching = false;
  let hits = 0, deflected = 0, fireT = 1.5, shieldT = 0, done = false, botT = 0, saidOut = false;
  const blasts = [];
  const r = rng(31);
  const turrets = [];
  for (let i = 0; i < 40; i++) turrets.push({ at: 0.9 + i * 0.75 + r() * 0.3, top: r() < 0.5 });
  const sx = () => env.W * 0.24;
  const lo = () => env.H * 0.24, hi = () => env.H * 0.8;
  const SPEED = () => 380 * unit(env);

  function shoot(U) {
    const W = env.W, H = env.H;
    // 화면 오른쪽에 보이는 포탑에서 쏜다
    const cam = pt * SPEED();
    const vis = turrets.filter(tr => { const px = sx() + tr.at * SPEED() - cam; return px > W * 0.55 && px < W - 20; });
    let ox, oy;
    if (pt < T_OUT && vis.length) { const tr = vis[r() * vis.length | 0]; ox = sx() + tr.at * SPEED() - cam; oy = tr.top ? H * 0.16 : H * 0.88; }
    else if (pt >= T_OUT && vis.length && r() < 0.6) { const tr = vis[r() * vis.length | 0]; ox = sx() + tr.at * SPEED() - cam; oy = H * 0.9; }
    else { ox = W + 20; oy = lo() + r() * (hi() - lo()); }
    const aimY = clamp(y + (r() - 0.5) * 120 * U, lo(), hi());
    const dx = sx() - ox, dy = aimY - oy, d = Math.hypot(dx, dy) || 1, sp = BS * U;
    blasts.push({ x: ox, y: oy, vx: dx / d * sp, vy: dy / d * sp, ref: false, age: 0 });
    sfx.hat();
  }

  const api = {
    id: "space",
    get done() { return done; },
    progress: () => clamp(pt / T_END, 0, 1),
    update(dt) {
      t += dt; st += dt;
      const U = unit(env);
      if (stage === "intro") {
        if (st > 1.4) { stage = "play"; st = 0; env.toast("손가락으로 위아래 피하기! 빨간 빛은 콕 눌러 튕겨요 🛡️", 3000); }
      } else if (stage === "play") {
        pt += dt;
        fireT -= dt;
        if (fireT <= 0 && pt < T_HYPER - 0.8) { shoot(U); fireT = RATE * (0.75 + r() * 0.5) * (pt >= T_OUT ? 1.15 : 1); }
        if (!saidOut && pt >= T_OUT) { saidOut = true; fl.add("탈출이다! 우주로~ 🌌", env.W / 2, env.H * 0.3, "#9fe8ff", 40 * U); sfx.whoosh(); sfx.level(); }
        if (pt >= T_END) { stage = "outro"; st = 0; sfx.fanfare(); }
        env.setScore(`🛡️ ${deflected}`);
      } else if (stage === "outro") {
        if (st > 2.3) done = true;
      }
      const target = clamp(ty == null ? env.H * 0.52 : ty, lo(), hi());
      const ny = y + (target - y) * Math.min(1, dt * 6);
      vy = (ny - y) / Math.max(dt, 1e-3); y = ny;
      for (const b of blasts) {
        b.age += dt; b.x += b.vx * dt; b.y += b.vy * dt;
        if (!b.ref && Math.hypot(b.x - sx(), b.y - (y - 10 * U)) < 52 * U) {
          b.dead = true; hits++; shieldT = 0.5; sfx.hit();
          fx.burst(sx() + 20 * U, y - 10 * U, 16, { color: ["#ff6b6b", "#ffd23f", "#fff"], speed: 260, size: 5, gravity: 0, drag: 2, life: 0.6 });
          fl.add(hits % 2 ? "펑! 괜찮아~" : "방패 덕분에 휴~", sx() + 40 * U, y - 120 * U, "#ffd0d0", 26 * U);
        }
      }
      for (let i = blasts.length - 1; i >= 0; i--) { const b = blasts[i]; if (b.dead || b.x < -80 || b.x > env.W + 120 || b.y < -80 || b.y > env.H + 80) blasts.splice(i, 1); }
      shieldT = Math.max(0, shieldT - dt);
      if (stage !== "intro" && Math.random() < 0.8) fx.burst(sx() - 92 * U, y - 6 * U, 1, { color: ["#9fe8ff", "#5fb8ff", "#fff"], speed: 200, size: 4, gravity: 0, life: 0.35, angle: Math.PI, spread: 0.3 });
      fx.update(dt); fl.update(dt);
    },
    down(px, py) {
      if (stage !== "play") return;
      const U = unit(env);
      let best = null, bd = DEF * U;
      for (const b of blasts) { if (b.ref) continue; const d = Math.hypot(b.x - px, b.y - py); if (d < bd) { bd = d; best = b; } }
      if (best) {
        best.ref = true; best.vx = Math.abs(best.vx) * 1.5 + 200 * U; best.vy = -best.vy * 0.6; deflected++;
        sfx.coin();
        fx.burst(best.x, best.y, 14, { color: ["#9fe8ff", "#fff"], speed: 220, size: 4, gravity: 0, drag: 2, life: 0.5, kind: "star" });
        fl.add("팅!", best.x, best.y - 30 * U, "#9fe8ff", 30 * U);
        return;
      }
      touching = true; ty = py;
    },
    move(px, py) { if (touching) ty = py; },
    up() { touching = false; },
    release() { touching = false; },
    bot(dt) {
      if (stage !== "play") return;
      botT += dt; if (botT < 0.12) return; botT = 0;
      const U = unit(env);
      const threat = blasts.filter(b => !b.ref).sort((a, b) => Math.hypot(a.x - sx(), a.y - y) - Math.hypot(b.x - sx(), b.y - y))[0];
      if (threat && Math.hypot(threat.x - sx(), threat.y - y) < 330 * U) { api.down(threat.x, threat.y); return; }
      if (threat && Math.abs(threat.y - y) < 90 * U) ty = clamp(y + (threat.y < y ? 160 : -160) * U, lo(), hi());
    },
    get result() {
      const s = hits <= (easy ? 3 : 2) ? 3 : hits <= (easy ? 6 : 5) ? 2 : 1;
      return { score: s, line: "🚀 탈출 성공" };
    },
    info: () => ({ stage, time: pt, y, ty, hits, deflected, blasts: blasts.filter(b => !b.ref).map(b => ({ x: b.x, y: b.y, vx: b.vx, vy: b.vy })) }),
    summary: () => ({ stage, hits, deflected }),
    draw(ctx) {
      const W = env.W, H = env.H, U = unit(env), sp = SPEED(), cam = pt * sp;
      // 우주
      let g = ctx.createLinearGradient(0, 0, 0, H);
      g.addColorStop(0, "#05061a"); g.addColorStop(1, "#1a1240");
      ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
      const hyper = pt >= T_HYPER ? clamp((pt - T_HYPER) / 1.2, 0, 1) : stage === "outro" ? 1 : 0;
      for (let i = 0; i < 110; i++) {
        const par = 0.2 + hash(i + 50) * 0.8;
        const px = ((hash(i) * W * 1.3 - cam * par * 0.5) % (W * 1.3) + W * 1.3) % (W * 1.3) - W * 0.15, py = hash(i + 300) * H;
        ctx.strokeStyle = ctx.fillStyle = `rgba(255,255,255,${0.4 + par * 0.6})`;
        if (hyper > 0) { ctx.lineWidth = (1 + par) * U; ctx.beginPath(); ctx.moveTo(px, py); ctx.lineTo(px + (20 + hyper * 260 * par) * U, py); ctx.stroke(); }
        else { ctx.beginPath(); ctx.arc(px, py, (0.8 + par * 1.6) * U, 0, 7); ctx.fill(); }
      }
      // 먼 행성
      const plx = W * 0.8 - cam * 0.03, ply = H * 0.26;
      ctx.fillStyle = "#7a5ad8"; ctx.beginPath(); ctx.arc(plx, ply, 70 * U, 0, 7); ctx.fill();
      ctx.fillStyle = "rgba(255,255,255,.18)"; ctx.beginPath(); ctx.arc(plx - 20 * U, ply - 20 * U, 40 * U, 0, 7); ctx.fill();
      ctx.strokeStyle = "rgba(255,210,150,.7)"; ctx.lineWidth = 6 * U; ctx.beginPath(); ctx.ellipse(plx, ply, 120 * U, 24 * U, -0.25, 0, 7); ctx.stroke();
      // 적 우주선 겉면(우주 구간 바닥)
      const hullStart = sx() + T_OUT * sp - cam + 60 * U, hullEnd = sx() + (T_HYPER - 1) * sp - cam;
      if (hullEnd > 0 && hullStart < W) hull(ctx, Math.max(-20, hullStart), Math.min(W + 20, hullEnd), H * 0.9, H, U, t, cam);
      // 격납고 안
      const exitX = sx() + T_OUT * sp - cam;
      if (exitX > -40) hangar(ctx, W, H, Math.min(W, exitX), U, cam, t);
      // 포탑
      for (const tr of turrets) {
        const px = sx() + tr.at * sp - cam;
        if (px < -60 || px > W + 60) continue;
        const inside = tr.at < T_OUT;
        if (!inside && tr.top) continue;
        if (!inside && (tr.at > T_HYPER - 1.2 || tr.at < T_OUT + 0.4)) continue;
        turret(ctx, px, inside ? (tr.top ? H * 0.16 : H * 0.88) : H * 0.9, tr.top && inside, U);
      }
      // 빨간 빛
      for (const b of blasts) {
        const a = Math.atan2(b.vy, b.vx);
        ctx.save(); ctx.translate(b.x, b.y); ctx.rotate(a);
        ctx.fillStyle = b.ref ? "rgba(120,220,255,.35)" : "rgba(255,80,80,.35)";
        rr(ctx, -30 * U, -10 * U, 60 * U, 20 * U, 10 * U); ctx.fill();
        ctx.fillStyle = b.ref ? "#9fe8ff" : "#ff4a4a";
        rr(ctx, -24 * U, -5 * U, 48 * U, 10 * U, 5 * U); ctx.fill();
        ctx.fillStyle = "#fff"; rr(ctx, -16 * U, -2 * U, 32 * U, 4 * U, 2 * U); ctx.fill();
        ctx.restore();
      }
      fx.draw(ctx);
      const flyOff = stage === "outro" ? Math.pow(st, 2) * 400 * U : 0;
      pod(ctx, sx() + flyOff, y, U, clamp(vy / 1200, -0.3, 0.3), t, shieldT, env.kid(shieldT > 0 ? "travel" : "cheer", "player"), env.kid("cheer", "buddy"));
      fl.draw(ctx);
      if (hyper > 0) { ctx.fillStyle = `rgba(220,240,255,${hyper * 0.25})`; ctx.fillRect(0, 0, W, H); }
      if (stage === "intro") bigTitle(ctx, env, "🚀 스타워즈 탈출!", st, U, "#fff", "#2a3a8a");
      if (stage === "outro") bigTitle(ctx, env, "슝~ 우주로 탈출 성공! 🌌", st, U, "#9fe8ff", "#1a1a4a");
    },
  };
  return api;
}

function hangar(ctx, W, H, right, U, cam, t) {
  ctx.save();
  ctx.beginPath(); ctx.rect(0, 0, right, H); ctx.clip();
  const g = ctx.createLinearGradient(0, 0, 0, H);
  g.addColorStop(0, "#1c2336"); g.addColorStop(0.5, "#2c3550"); g.addColorStop(1, "#1c2336");
  ctx.fillStyle = g; ctx.fillRect(0, 0, right, H);
  // 먼 벽 창문
  const tw = 160 * U;
  for (let i = Math.floor(cam * 0.3 / tw) - 1, n = 0; n < W / tw + 3; i++, n++) {
    const x = i * tw - cam * 0.3;
    ctx.fillStyle = "#252d45"; ctx.fillRect(x + 8 * U, H * 0.26, tw - 16 * U, H * 0.5);
    for (let k = 0; k < 3; k++) { ctx.fillStyle = hash(i * 3 + k) < 0.5 ? "#4fd0ff" : "#2a3a5a"; ctx.fillRect(x + 24 * U + k * 40 * U, H * 0.32, 26 * U, 10 * U); }
  }
  // 기둥
  const bw = 260 * U;
  for (let i = Math.floor(cam * 0.6 / bw) - 1, n = 0; n < W / bw + 3; i++, n++) {
    const x = i * bw - cam * 0.6;
    ctx.fillStyle = "#3a4560"; ctx.fillRect(x, H * 0.16, 30 * U, H * 0.72);
    ctx.fillStyle = "#ffb347"; ctx.fillRect(x + 11 * U, H * 0.3, 8 * U, 8 * U);
  }
  // 천장·바닥
  for (const [y0, y1] of [[0, H * 0.16], [H * 0.88, H]]) {
    ctx.fillStyle = "#4a5570"; ctx.fillRect(0, y0, right, y1 - y0);
    ctx.strokeStyle = "#5e6a88"; ctx.lineWidth = 2 * U;
    const pw = 120 * U;
    for (let x = -(cam % pw); x < right; x += pw) { ctx.beginPath(); ctx.moveTo(x, y0); ctx.lineTo(x, y1); ctx.stroke(); }
    const edge = y0 === 0 ? y1 - 12 * U : y0;
    for (let x = -(cam % (40 * U)); x < right; x += 40 * U) { ctx.fillStyle = "#ffd23f"; ctx.fillRect(x, edge, 20 * U, 12 * U); ctx.fillStyle = "#222"; ctx.fillRect(x + 20 * U, edge, 20 * U, 12 * U); }
  }
  ctx.restore();
  // 출구의 빛
  if (right < W) {
    const gl = ctx.createLinearGradient(right - 60 * U, 0, right + 10 * U, 0);
    gl.addColorStop(0, "rgba(160,220,255,0)"); gl.addColorStop(1, "rgba(200,240,255,.8)");
    ctx.fillStyle = gl; ctx.fillRect(right - 60 * U, 0, 70 * U, H);
  }
}

function hull(ctx, x0, x1, top, H, U, t, cam) {
  ctx.fillStyle = "#5a6070"; ctx.fillRect(x0, top, x1 - x0, H - top);
  ctx.fillStyle = "#6e7588"; ctx.fillRect(x0, top, x1 - x0, 8 * U);
  for (let x = x0 - ((cam + x0) % (90 * U)); x < x1; x += 90 * U) {
    if (x < x0) continue;
    ctx.fillStyle = "#4a4f5e"; ctx.fillRect(x, top + 20 * U, 60 * U, 14 * U);
    ctx.fillStyle = Math.sin(t * 4 + x) > 0 ? "#ffb347" : "#7a5a30"; ctx.fillRect(x + 66 * U, top + 22 * U, 8 * U, 8 * U);
  }
}

function turret(ctx, x, y, down, U) {
  ctx.save(); ctx.translate(x, y); if (down) ctx.scale(1, -1);
  ctx.fillStyle = "#3a4058"; rr(ctx, -26 * U, -22 * U, 52 * U, 22 * U, 6 * U); ctx.fill();
  ctx.fillStyle = "#4e5672"; ctx.beginPath(); ctx.arc(0, -22 * U, 18 * U, Math.PI, 0); ctx.fill();
  ctx.strokeStyle = "#2a2f42"; ctx.lineWidth = 7 * U; ctx.beginPath(); ctx.moveTo(0, -30 * U); ctx.lineTo(-26 * U, -50 * U); ctx.stroke();
  ctx.fillStyle = "#ff4a4a"; ctx.beginPath(); ctx.arc(0, -26 * U, 4 * U, 0, 7); ctx.fill();
  ctx.restore();
}

function pod(ctx, x, y, U, tilt, t, shield, kidP, kidB) {
  // 둥근 탈출선(유리 지붕 안에 아이 둘)
  ctx.save(); ctx.translate(x, y + Math.sin(t * 4) * 3 * U); ctx.rotate(tilt);
  ctx.fillStyle = "#ff9a3c";
  ctx.beginPath(); ctx.moveTo(-40 * U, -20 * U); ctx.lineTo(-74 * U, -64 * U); ctx.lineTo(-50 * U, -64 * U); ctx.lineTo(-6 * U, -24 * U); ctx.fill();
  ctx.beginPath(); ctx.moveTo(-40 * U, 10 * U); ctx.lineTo(-74 * U, 46 * U); ctx.lineTo(-50 * U, 46 * U); ctx.lineTo(-6 * U, 12 * U); ctx.fill();
  const fl = 1 + Math.sin(t * 40) * 0.15;
  ctx.fillStyle = "#5fb8ff"; ctx.beginPath(); ctx.moveTo(-84 * U, -18 * U); ctx.lineTo(-84 * U - 46 * U * fl, -4 * U); ctx.lineTo(-84 * U, 8 * U); ctx.fill();
  ctx.fillStyle = "#fff"; ctx.beginPath(); ctx.moveTo(-84 * U, -10 * U); ctx.lineTo(-84 * U - 24 * U * fl, -4 * U); ctx.lineTo(-84 * U, 2 * U); ctx.fill();
  ctx.fillStyle = "rgba(160,220,255,.35)"; ctx.beginPath(); ctx.ellipse(6 * U, -30 * U, 74 * U, 76 * U, 0, Math.PI, 0); ctx.fill();
  upper(ctx, kidB, -26 * U, -10 * U, 124 * U, true);
  upper(ctx, kidP, 30 * U, -8 * U, 134 * U, false);
  const g = ctx.createLinearGradient(0, -30 * U, 0, 30 * U);
  g.addColorStop(0, "#ffffff"); g.addColorStop(1, "#b9c2d4");
  ctx.fillStyle = g; ctx.beginPath(); ctx.ellipse(0, 0, 96 * U, 32 * U, 0, 0, 7); ctx.fill();
  ctx.fillStyle = "#ff9a3c"; rr(ctx, -80 * U, -4 * U, 160 * U, 8 * U, 4 * U); ctx.fill();
  ctx.fillStyle = "#2a3a5a"; [-40, 0, 40].forEach(dx => { ctx.beginPath(); ctx.arc(dx * U, 14 * U, 5 * U, 0, 7); ctx.fill(); });
  ctx.strokeStyle = "rgba(255,255,255,.7)"; ctx.lineWidth = 3 * U;
  ctx.beginPath(); ctx.ellipse(6 * U, -30 * U, 74 * U, 76 * U, 0, Math.PI * 1.1, Math.PI * 1.45); ctx.stroke();
  if (shield > 0) {
    ctx.strokeStyle = `rgba(120,220,255,${shield * 1.6})`; ctx.lineWidth = 6 * U;
    ctx.beginPath(); ctx.ellipse(0, -20 * U, 120 * U, 90 * U, 0, 0, 7); ctx.stroke();
  }
  ctx.restore();
}
