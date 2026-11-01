// 레이서스: 빨간 바위 사막 협곡을 달리는 자동차. 꾹 누르면 부릉부릉 빨라지고, 손가락 높이로 길을 바꿔 바위를 피한다.
// 마지막엔 옆 차와 나란히 경주! 차는 모두 이 게임만의 놀이기구 차(얼굴 없음).
import { text, Particles, Floaters, clamp, rng, rr } from "../engine.js";
import { unit, upper, bigTitle, hash } from "./parkkit.js";

export function create(env) {
  const { sfx } = env;
  const easy = env.easy;
  const fx = new Particles(), fl = new Floaters();
  const U0 = unit(env);
  const L = 10200 * U0, CRUISE = 330 * U0, FAST = (easy ? 500 : 480) * U0, RIVAL = (easy ? 400 : 425) * U0;
  const RACE = 0.55;
  let stage = "intro", st = 0, t = 0, x = 0, v = 0, lane = 1, laneF = 1, hold = false, hits = 0, boostT = 0, slowT = 0, shake = 0;
  let rival = null, win = null, done = false, botT = 0, hintT = 0;
  const r = rng(9);
  const items = [];
  for (let wx = 1300 * U0; wx < L - 700 * U0; wx += (360 + r() * 300) * U0) {
    if (wx > L * RACE && r() < 0.45) continue;
    const k = r();
    items.push({ x: wx, lane: r() < 0.5 ? 0 : 1, kind: k < 0.32 ? "boost" : k < 0.6 ? "rock" : k < 0.8 ? "cone" : "weed", hit: false });
  }
  const port = () => env.H > env.W * 1.05;
  const laneY = i => env.H * (port() ? 0.6 + 0.11 * i : 0.665 + 0.14 * i);
  const sx = () => env.W * 0.3;

  const api = {
    id: "racers",
    get done() { return done; },
    progress: () => clamp(x / L, 0, 1),
    update(dt) {
      t += dt; st += dt;
      const U = unit(env);
      if (stage === "intro") {
        if (st > 1.4) { stage = "play"; st = 0; env.toast("꾹 누르면 부릉부릉! 손가락 위아래로 길을 바꿔요 🏎️", 3000); }
      } else if (stage === "play" || stage === "outro") {
        let target = stage === "outro" ? CRUISE * Math.max(0, 1 - st) : hold ? FAST : CRUISE;
        if (boostT > 0) target += 170 * U0;
        if (slowT > 0) target *= 0.5;
        v += (target - v) * Math.min(1, dt * 2.2);
        x += v * dt;
        boostT = Math.max(0, boostT - dt); slowT = Math.max(0, slowT - dt); shake = Math.max(0, shake - dt);
        laneF += (lane - laneF) * Math.min(1, dt * 9);
        if (stage === "play") {
          for (const it of items) {
            if (it.hit) continue;
            const dx = it.x - x;
            if (dx > 90 * U0) break;
            if (dx < -90 * U0) continue;
            if (Math.abs(dx) < 70 * U0 && Math.abs(laneF - it.lane) < 0.5) {
              it.hit = true;
              if (it.kind === "boost") { boostT = 1.3; sfx.coin(); fl.add("슝~ 빨라졌다!", sx(), laneY(it.lane) - 140 * U, "#fff36b", 28 * U); }
              else { hits++; slowT = 0.8; shake = 0.35; sfx.hit(); fl.add("덜컹!", sx(), laneY(it.lane) - 140 * U, "#ffb0b0", 30 * U); fx.burst(sx() + 60 * U, laneY(it.lane) - 10 * U, 14, { color: ["#c98a5a", "#e8b98a"], speed: 240, size: 5, gravity: 600 }); }
            }
          }
          if (!rival && x > L * RACE) {
            rival = { x: x - 280 * U0, lane: 1 - lane, laneF: 1 - lane, v: FAST * 1.08, bump: 0 };
            env.toast("옆 차가 왔다! 꾹 눌러서 1등 하자! 🏁", 3000);
            fl.add("경주 시작!", env.W / 2, env.H * 0.3, "#fff", 44 * U);
            sfx.level();
          }
          if (rival) {
            const lead = rival.x - x;
            let rv = RIVAL;
            if (lead < 60 * U0 && rival.x < L * (RACE + 0.08)) rv = FAST * 1.08; // 처음엔 옆으로 따라붙는다
            else if (lead > 520 * U0) rv = RIVAL * 0.9;
            rival.v += (rv - rival.v) * Math.min(1, dt * 1.5);
            rival.x += rival.v * dt;
            if (rival.lane === lane && Math.abs(lead) < 200 * U0) rival.lane = 1 - lane;
            rival.laneF += (rival.lane - rival.laneF) * Math.min(1, dt * 5);
            for (const it of items) if (it.kind !== "boost" && Math.abs(it.x - rival.x) < 50 * U0 && Math.abs(it.lane - rival.laneF) < 0.5) rival.bump = 0.3;
            rival.bump = Math.max(0, rival.bump - dt);
            if (rival.x >= L && win === null) win = false;
            env.setScore(x >= rival.x ? "🥇 1등!" : "🥈 2등");
            hintT += dt;
            if (!hold && hintT > 3) { hintT = 0; fl.add("꾹! 부릉부릉!", env.W * 0.7, env.H * 0.45, "#fff36b", 34 * U); }
          } else env.setScore(boostT > 0 ? "🔥 슝~" : "🏎️ 부릉");
          if (x >= L) {
            if (win === null) win = true;
            stage = "outro"; st = 0;
            if (win) { sfx.fanfare(); for (let i = 0; i < 4; i++) fx.burst(env.W * (0.25 + i * 0.17), env.H * 0.3, 24, { color: ["#ff5fa2", "#ffd23f", "#5fd4ff", "#fff"], speed: 380 * U, size: 6, gravity: 420, life: 1.4 }); }
            else sfx.level();
            env.setScore(win ? "🥇 1등!" : "🥈 2등");
          }
        } else if (rival) { rival.x += rival.v * dt; rival.v *= 1 - dt; }
        if (stage === "outro" && st > 2.4) done = true;
        if (v > CRUISE * 1.1 && Math.random() < dt * 30) fx.burst(sx() - 110 * U, laneY(laneF) - 22 * U, 1, { color: ["#ffb347", "#ffd23f", "#fff"], speed: 120, size: 4, gravity: -40, life: 0.4, angle: Math.PI, spread: 0.6 });
      }
      fx.update(dt); fl.update(dt);
    },
    down(px, py) { hold = true; lane = py < (laneY(0) + laneY(1)) / 2 ? 0 : 1; },
    move(px, py) { if (hold) lane = py < (laneY(0) + laneY(1)) / 2 ? 0 : 1; },
    up() { hold = false; },
    release() { hold = false; },
    bot(dt) {
      if (stage !== "play") return;
      hold = true;
      botT += dt; if (botT < 0.15) return; botT = 0;
      const next = items.find(it => !it.hit && it.x > x + 40 * U0 && it.x < x + 520 * U0);
      if (next) lane = next.kind === "boost" ? next.lane : 1 - next.lane;
    },
    get result() {
      const ok = hits <= (easy ? 3 : 2);
      return { score: win ? (ok ? 3 : 2) : (hits <= 2 ? 2 : 1), line: win ? "🏎️ 1등" : "🏎️ 2등" };
    },
    info: () => ({ stage, hold, lane, hits, win, race: !!rival }),
    summary: () => ({ stage, hits, win }),
    draw(ctx) {
      const W = env.W, H = env.H, U = unit(env);
      ctx.save();
      if (shake > 0) ctx.translate((Math.random() - 0.5) * 10 * U * shake / 0.35, (Math.random() - 0.5) * 8 * U * shake / 0.35);
      const horizon = H * (port() ? 0.5 : 0.56);
      let g = ctx.createLinearGradient(0, 0, 0, horizon);
      g.addColorStop(0, "#6cc4f0"); g.addColorStop(0.7, "#bfe3f0"); g.addColorStop(1, "#ffd9a8");
      ctx.fillStyle = g; ctx.fillRect(-20, -20, W + 40, horizon + 20);
      ctx.fillStyle = "#fff6c8"; ctx.beginPath(); ctx.arc(W * 0.82, H * 0.14, 44 * U, 0, 7); ctx.fill();
      buttes(ctx, W, x * 0.08, 300 * U, horizon, "#e08a62", U, port() ? 0.22 : 0.16, 1, H);
      buttes(ctx, W, x * 0.25, 230 * U, horizon, "#bb5338", U, port() ? 0.32 : 0.26, 2, H);
      waterfall(ctx, W * 0.65 + (L * 0.3 - x) * 0.25, horizon, U, t);
      town(ctx, W * 0.9 + (L - x) * 0.7, horizon + 8 * U, U, t);
      ctx.fillStyle = "#e3a26a"; ctx.fillRect(-20, horizon, W + 40, H - horizon + 20);
      // 길
      const top = laneY(0) - 46 * U, bot = laneY(1) + 40 * U;
      ctx.fillStyle = "#6b5a58"; ctx.fillRect(-20, top, W + 40, bot - top);
      ctx.fillStyle = "#fff"; ctx.fillRect(-20, top, W + 40, 4 * U); ctx.fillRect(-20, bot - 4 * U, W + 40, 4 * U);
      ctx.fillStyle = "#ffd23f";
      const mid = (laneY(0) + laneY(1)) / 2 - 14 * U, dash = 90 * U;
      for (let dx = -((x % dash) + dash); dx < W + dash; dx += dash) ctx.fillRect(dx, mid, dash * 0.55, 5 * U);
      // 길가 선인장·돌
      for (let i = Math.floor(x * 1.15 / (170 * U)) - 1, n = 0; n < W / (170 * U) + 3; i++, n++) {
        const px = i * 170 * U - x * 1.15, py = bot + 14 * U + hash(i) * Math.max(40 * U, H - bot - 40 * U);
        if (py > H + 10) continue;
        if (hash(i + 9) < 0.4) cactus(ctx, px, py, U * (0.7 + hash(i + 4) * 0.5));
        else { ctx.fillStyle = "#b87a50"; ctx.beginPath(); ctx.ellipse(px, py, 18 * U, 10 * U, 0, 0, 7); ctx.fill(); }
      }
      // 결승선
      const fx0 = sx() + L - x + 60 * U;
      if (fx0 > -60 && fx0 < W + 60) finish(ctx, fx0, top, bot, U);
      // 길 위 물건
      for (const it of items) {
        if (it.hit && it.kind === "boost") continue;
        const px = sx() + it.x - x;
        if (px < -60 || px > W + 60) continue;
        drawItem(ctx, it, px, laneY(it.lane), U, t);
      }
      // 차(뒷줄 먼저)
      const cars = [{ y: laneY(laneF), f: () => car(ctx, sx(), laneY(laneF), U, "#2bb3a3", "#137a70", t, v / FAST, [env.kid(win || boostT > 0 ? "cheer" : "travel", "player"), env.kid(win || boostT > 0 ? "cheer" : "travel", "buddy")]) }];
      if (rival) cars.push({ y: laneY(rival.laneF), f: () => car(ctx, sx() + rival.x - x, laneY(rival.laneF) - (rival.bump > 0 ? Math.sin(rival.bump * 20) * 6 * U : 0), U, "#8b5cf6", "#5b2fc0", t, rival.v / FAST, null) });
      cars.sort((a, b) => a.y - b.y).forEach(c => c.f());
      ctx.restore();
      fx.draw(ctx); fl.draw(ctx);
      if (stage === "play" && rival && !hold) {
        ctx.globalAlpha = 0.6 + 0.4 * Math.sin(t * 6);
        text(ctx, "👆 꾹!", W - 90 * U, H * 0.42, 40 * U, { color: "#fff", stroke: "rgba(120,40,20,.8)" });
        ctx.globalAlpha = 1;
      }
      if (stage === "intro") bigTitle(ctx, env, "🏎️ 레이서스 출발!", st, U, "#fff", "#c8553d");
      if (stage === "outro") bigTitle(ctx, env, win ? "우리가 1등! 🏁" : "아깝다! 2등! 그래도 신나!", st, U, "#fff36b", "#c8553d");
    },
  };
  return api;
}

function buttes(ctx, W, cam, tw, base, color, U, hmax, seed, H) {
  ctx.fillStyle = color;
  const i0 = Math.floor(cam / tw) - 1;
  for (let i = i0; i < i0 + W / tw + 3; i++) {
    if (hash(i * 5 + seed) < 0.25) continue;
    const x = i * tw - cam, h = (0.4 + hash(i + seed * 13) * 0.6) * hmax * H, w = tw * (0.6 + hash(i + 77) * 0.5);
    ctx.beginPath(); ctx.moveTo(x, base); ctx.lineTo(x + w * 0.14, base - h); ctx.lineTo(x + w * 0.86, base - h); ctx.lineTo(x + w, base); ctx.fill();
    ctx.fillStyle = "rgba(0,0,0,.08)";
    for (let k = 1; k < 4; k++) ctx.fillRect(x + w * 0.1, base - h + k * h / 4, w * 0.8, 5 * U);
    ctx.fillStyle = color;
  }
}

function waterfall(ctx, x, base, U, t) {
  if (x < -200 * U || x > ctx.canvas.width + 200 * U) return;
  const w = 210 * U, h = 300 * U;
  ctx.fillStyle = "#a8432f";
  ctx.beginPath(); ctx.moveTo(x - w / 2, base); ctx.lineTo(x - w * 0.36, base - h); ctx.lineTo(x + w * 0.36, base - h); ctx.lineTo(x + w / 2, base); ctx.fill();
  const g = ctx.createLinearGradient(0, base - h, 0, base);
  g.addColorStop(0, "#7fd4ff"); g.addColorStop(1, "#c8f0ff");
  ctx.fillStyle = g; ctx.fillRect(x - 22 * U, base - h + 6 * U, 44 * U, h - 6 * U);
  ctx.strokeStyle = "rgba(255,255,255,.8)"; ctx.lineWidth = 3 * U;
  for (let i = 0; i < 4; i++) { const yy = base - h + ((t * 160 * U + i * h / 4) % h); ctx.beginPath(); ctx.moveTo(x - 14 * U + i * 9 * U, yy); ctx.lineTo(x - 14 * U + i * 9 * U, yy + 30 * U); ctx.stroke(); }
  ctx.fillStyle = "rgba(255,255,255,.7)"; ctx.beginPath(); ctx.ellipse(x, base - 4 * U, 54 * U, 12 * U, 0, 0, 7); ctx.fill();
}

function town(ctx, x, base, U, t) {
  // 결승선 근처 네온 사막 마을
  if (x < -700 * U || x > ctx.canvas.width + 100 * U) return;
  const signs = [["주유소", "#5fd4ff"], ["카페", "#ff5fa2"], ["모텔", "#ffd23f"]];
  signs.forEach(([name, c], i) => {
    const bx = x - i * 210 * U, w = 170 * U, h = (110 + i * 20) * U;
    ctx.fillStyle = ["#d98a5a", "#c9a27a", "#b8735a"][i]; ctx.fillRect(bx - w / 2, base - h, w, h);
    ctx.fillStyle = "#6a4a3a"; ctx.fillRect(bx - 20 * U, base - 60 * U, 40 * U, 60 * U);
    const on = Math.sin(t * 4 + i) > -0.6;
    ctx.fillStyle = "rgba(30,20,40,.85)"; rr(ctx, bx - 62 * U, base - h - 46 * U, 124 * U, 40 * U, 10 * U); ctx.fill();
    ctx.lineWidth = 3 * U; ctx.strokeStyle = on ? c : "#555"; ctx.stroke();
    text(ctx, name, bx, base - h - 25 * U, 22 * U, { color: on ? c : "#777" });
  });
}

function cactus(ctx, x, y, s) {
  ctx.fillStyle = "#4f9a5a";
  rr(ctx, x - 8 * s, y - 70 * s, 16 * s, 70 * s, 8 * s); ctx.fill();
  rr(ctx, x - 26 * s, y - 50 * s, 10 * s, 26 * s, 5 * s); ctx.fill(); ctx.fillRect(x - 26 * s, y - 30 * s, 20 * s, 8 * s);
  rr(ctx, x + 16 * s, y - 58 * s, 10 * s, 24 * s, 5 * s); ctx.fill(); ctx.fillRect(x + 6 * s, y - 40 * s, 20 * s, 8 * s);
}

function finish(ctx, x, top, bot, U) {
  const sq = 14 * U;
  for (let y = top, i = 0; y < bot; y += sq, i++) for (let k = 0; k < 2; k++) { ctx.fillStyle = (i + k) % 2 ? "#222" : "#fff"; ctx.fillRect(x + k * sq, y, sq, Math.min(sq, bot - y)); }
  ctx.strokeStyle = "#555"; ctx.lineWidth = 6 * U;
  ctx.beginPath(); ctx.moveTo(x - 10 * U, top); ctx.lineTo(x - 10 * U, top - 150 * U); ctx.moveTo(x + 38 * U, bot); ctx.lineTo(x + 38 * U, top - 150 * U); ctx.stroke();
  ctx.fillStyle = "#c8553d"; rr(ctx, x - 60 * U, top - 196 * U, 150 * U, 50 * U, 12 * U); ctx.fill();
  text(ctx, "🏁 결승", x + 15 * U, top - 170 * U, 26 * U, { color: "#fff" });
}

function drawItem(ctx, it, x, y, U, t) {
  if (it.kind === "boost") {
    ctx.globalAlpha = 0.6 + 0.4 * Math.sin(t * 8);
    ctx.fillStyle = "#ffd23f";
    for (let k = 0; k < 3; k++) { const bx = x - 30 * U + k * 22 * U; ctx.beginPath(); ctx.moveTo(bx, y - 30 * U); ctx.lineTo(bx + 18 * U, y - 16 * U); ctx.lineTo(bx, y - 2 * U); ctx.lineTo(bx + 8 * U, y - 16 * U); ctx.fill(); }
    ctx.globalAlpha = 1;
  } else if (it.kind === "rock") {
    ctx.fillStyle = "#8a7a74"; ctx.beginPath(); ctx.ellipse(x, y - 18 * U, 30 * U, 22 * U, 0, 0, 7); ctx.fill();
    ctx.fillStyle = "#a89a92"; ctx.beginPath(); ctx.ellipse(x - 8 * U, y - 26 * U, 12 * U, 8 * U, 0, 0, 7); ctx.fill();
  } else if (it.kind === "cone") {
    ctx.fillStyle = "#ff8a2a"; ctx.beginPath(); ctx.moveTo(x - 20 * U, y - 2 * U); ctx.lineTo(x, y - 56 * U); ctx.lineTo(x + 20 * U, y - 2 * U); ctx.fill();
    ctx.fillStyle = "#fff"; ctx.fillRect(x - 11 * U, y - 32 * U, 22 * U, 7 * U);
  } else {
    ctx.save(); ctx.translate(x, y - 24 * U); ctx.rotate(-t * 4);
    ctx.strokeStyle = "#a07a40"; ctx.lineWidth = 3 * U;
    for (let k = 0; k < 6; k++) { ctx.beginPath(); ctx.arc(0, 0, (12 + k * 2.5) * U, k, k + 3.6); ctx.stroke(); }
    ctx.restore();
  }
}

function car(ctx, x, y, U, color, dark, t, speedK, kids) {
  // 이 게임만의 놀이기구 자동차(뚜껑 없는 2인승, 얼굴 없음)
  ctx.save(); ctx.translate(x, y);
  ctx.fillStyle = "rgba(40,20,20,.25)"; ctx.beginPath(); ctx.ellipse(0, 0, 110 * U, 12 * U, 0, 0, 7); ctx.fill();
  if (kids) {
    upper(ctx, kids[1], -60 * U, -54 * U, 138 * U, false);
    upper(ctx, kids[0], -4 * U, -54 * U, 152 * U, false);
  } else {
    [[-58, "#ffd166"], [-8, "#4cc9a7"]].forEach(([dx, c]) => {
      ctx.fillStyle = "#f3c9a5"; ctx.beginPath(); ctx.arc(dx * U, -78 * U, 17 * U, 0, 7); ctx.fill();
      ctx.fillStyle = c; ctx.beginPath(); ctx.arc(dx * U, -82 * U, 18 * U, Math.PI, 0); ctx.fill();
    });
  }
  const g = ctx.createLinearGradient(0, -70 * U, 0, -14 * U);
  g.addColorStop(0, color); g.addColorStop(1, dark);
  ctx.fillStyle = g;
  ctx.beginPath(); ctx.moveTo(-108 * U, -20 * U); ctx.lineTo(-104 * U, -58 * U); ctx.quadraticCurveTo(-100 * U, -66 * U, -84 * U, -66 * U);
  ctx.lineTo(40 * U, -66 * U); ctx.quadraticCurveTo(70 * U, -66 * U, 104 * U, -46 * U); ctx.quadraticCurveTo(116 * U, -38 * U, 112 * U, -20 * U); ctx.closePath(); ctx.fill();
  ctx.fillStyle = "rgba(255,255,255,.85)"; ctx.fillRect(-100 * U, -46 * U, 196 * U, 6 * U);
  ctx.fillStyle = "rgba(170,220,255,.7)"; ctx.beginPath(); ctx.moveTo(28 * U, -66 * U); ctx.lineTo(42 * U, -92 * U); ctx.lineTo(50 * U, -92 * U); ctx.lineTo(42 * U, -66 * U); ctx.fill();
  ctx.fillStyle = "#fff3a0"; ctx.beginPath(); ctx.arc(102 * U, -40 * U, 7 * U, 0, 7); ctx.fill();
  for (const wx of [-64, 66]) {
    ctx.fillStyle = "#222"; ctx.beginPath(); ctx.arc(wx * U, -16 * U, 20 * U, 0, 7); ctx.fill();
    ctx.fillStyle = "#cfd3da"; ctx.beginPath(); ctx.arc(wx * U, -16 * U, 9 * U, 0, 7); ctx.fill();
    ctx.strokeStyle = "#888"; ctx.lineWidth = 2.5 * U;
    const a = t * 12 * Math.max(0.3, speedK);
    ctx.beginPath(); ctx.moveTo(wx * U + Math.cos(a) * 9 * U, -16 * U + Math.sin(a) * 9 * U); ctx.lineTo(wx * U - Math.cos(a) * 9 * U, -16 * U - Math.sin(a) * 9 * U); ctx.stroke();
  }
  if (speedK > 0.85) {
    ctx.strokeStyle = "rgba(255,255,255,.7)"; ctx.lineWidth = 3 * U;
    for (let i = 0; i < 3; i++) { const yy = (-60 + i * 18) * U, len = (40 + ((t * 300 + i * 40) % 50)) * U; ctx.beginPath(); ctx.moveTo(-120 * U, yy); ctx.lineTo(-120 * U - len, yy); ctx.stroke(); }
  }
  ctx.restore();
}
