// 스파이더맨(아이들이 부르던 이름표): 고장 난 '로봇 복사기'에서 꼬마 로봇들이 자꾸자꾸 튀어나와 도망간다!
// 로봇을 콕 누르면 끈끈이 거미줄이 휙 날아가 붙잡고, 손가락으로 쓱 그으면 거미줄이 줄줄이 날아가 끈끈이 덫이 된다.
// 로봇은 둘로 갈라지며 늘어나지만 정해진 수만큼만 나온다. 전부 잡으면 끝!
// 로봇·복사기·놀이기구 차는 모두 이 게임만의 그림. 거미줄은 그냥 끈끈한 그물 모양(옷·무늬·가면은 그리지 않는다).
import { text, Particles, Floaters, clamp, rng, rr } from "../engine.js";
import { unit, upper, bigTitle, hash, ease } from "./parkkit.js";

const ROBOT_COLORS = [["#5fe0c8", "#2fa894"], ["#ffb347", "#e07a1f"], ["#b48cff", "#7a52d8"], ["#ffe066", "#d8a91f"], ["#7fc4ff", "#3a86d8"], ["#ff8fb0", "#e0507a"]];

export function create(env) {
  const { sfx } = env;
  const easy = env.easy;
  const fx = new Particles(), fl = new Floaters();
  const U0 = unit(env);
  const CAP = easy ? 15 : 20, MAX_FREE = easy ? 5 : 7, SPLIT = easy ? 1.25 : 1.0, SPEED = (easy ? 105 : 150) * U0;
  const CATCH = easy ? 1.6 : 1.35, TRAP_R = (easy ? 46 : 36) * U0, TRAP_LIFE = easy ? 4 : 3, PLAY_MAX = 32;
  const r = rng(23);
  let stage = "intro", st = 0, t = 0, pt = 0, spawned = 0, mine = 0, theirs = 0, splitT = 0.3, buddyT = 4, botT = 0, done = false, bigNet = false, hintT = 0;
  const robots = [], traps = [], strands = [];
  const fingers = new Map();
  const floorY = () => env.H * 0.74;
  const box = () => ({ x0: 56 * unit(env), x1: env.W - 56 * unit(env), y0: env.H * 0.18, y1: env.H * 0.66 });
  const machine = () => ({ x: env.W - 92 * unit(env), y: floorY() });
  const cage = () => ({ x: 92 * unit(env), y: floorY() });
  const rim = () => env.H - 78 * unit(env);
  const kidX = who => env.W * (who === "p" ? 0.42 : 0.6);
  const origin = who => ({ x: kidX(who) + (who === "p" ? 34 : -34) * unit(env), y: rim() - Math.min(env.W, env.H) * 0.3 * 0.36 });
  const free = () => robots.filter(b => b.state === "free");

  function newRobot(x, y, a) {
    const c = ROBOT_COLORS[spawned % ROBOT_COLORS.length];
    const sp = SPEED * (0.85 + r() * 0.3);
    robots.push({ x, y, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp, sp, rad: 38 * U0 * (easy ? 1.12 : 1), c, state: "free", turn: 0.8 + r() * 1.2, warn: 0, ct: 0, by: "", ph: r() * 6, pop: 0.3, id: spawned });
    spawned++;
  }
  function fromMachine() {
    const m = machine(), U = unit(env);
    newRobot(m.x - 60 * U, m.y - 110 * U, Math.PI + (r() - 0.5) * 1.2);
    sfx.jump();
    fx.burst(m.x - 60 * U, m.y - 110 * U, 12, { color: ["#fff", "#9fe8ff", "#ffe14d"], speed: 220 * U, size: 5, gravity: 200, life: 0.5 });
    fl.add("뿅!", m.x - 70 * U, m.y - 170 * U, "#9fe8ff", 28 * U);
  }
  function catchRobot(b, who) {
    b.state = "caught"; b.ct = 0; b.by = who;
    if (who === "p") mine++; else theirs++;
    sfx.pop();
    fx.burst(b.x, b.y, 14, { color: ["#ffffff", "#e8f4ff", b.c[0]], speed: 200 * unit(env), size: 5, gravity: 120, life: 0.6 });
    if (who === "p") fl.add(mine % 3 === 0 ? "끈끈이 성공!" : "잡았다!", b.x, b.y - b.rad - 20 * unit(env), "#fff36b", 30 * unit(env));
  }
  function shoot(px, py, who) {
    const U = unit(env), o = origin(who);
    let best = null, bd = Infinity;
    for (const b of free()) { const d = Math.hypot(b.x - px, b.y - py); if (d < b.rad * CATCH && d < bd) { bd = d; best = b; } }
    const tx = best ? best.x : px, ty = best ? best.y : py;
    strands.push({ x0: o.x, y0: o.y, x1: tx, y1: ty, age: 0, who });
    fx.burst(o.x, o.y, 5, { color: ["#ffffff", "#bfe6ff"], speed: 140 * U, size: 4, gravity: 0, drag: 3, life: 0.3 });
    if (best) { catchRobot(best, who); sfx.coin(); return true; }
    // 빗나간 거미줄은 그 자리에 끈끈이 덫으로 붙는다
    traps.push({ x: px, y: py, age: 0 });
    if (traps.length > 7) traps.shift();
    sfx.whoosh();
    return false;
  }

  const api = {
    id: "web",
    get done() { return done; },
    progress: () => clamp((mine + theirs) / CAP, 0, 1),
    update(dt) {
      t += dt; st += dt;
      const U = unit(env), bx = box();
      if (stage === "intro") {
        if (st > 1.5) { stage = "play"; st = 0; env.toast("도망 로봇을 콕! 손가락으로 쓱~ 거미줄 휙! 🕸️", 3200); }
      } else if (stage === "play") {
        pt += dt;
        // 늘어나기: 복사기에서 뿅, 또는 로봇이 둘로 갈라짐
        splitT -= dt;
        const fr = free();
        if (spawned < CAP) {
          if (spawned < 3) { if (splitT <= 0) { fromMachine(); splitT = 0.35; } }
          else if (!fr.length) { if (splitT > 0.4) splitT = 0.4; if (splitT <= 0) { fromMachine(); splitT = SPLIT; } }
          else if (splitT <= 0 && fr.length < MAX_FREE && !robots.some(b => b.warn > 0)) {
            splitT = SPLIT * (0.85 + r() * 0.3);
            if (r() < 0.62) { const b = fr[r() * fr.length | 0]; b.warn = 0.55; fl.add("삐빅!", b.x, b.y - b.rad - 16 * U, "#ffb0b0", 24 * U); sfx.hat(); }
            else fromMachine();
          }
        }
        // 형제도 가끔 거미줄을 쏜다
        buddyT -= dt;
        if (buddyT <= 0) { buddyT = (easy ? 4 : 4.5) * (0.8 + r() * 0.4); const f2 = free(); if (f2.length >= 3) { const b = f2[r() * f2.length | 0]; shoot(b.x, b.y, "b"); } }
        hintT += dt;
        if (hintT > 7 && free().length >= 3) { hintT = 0; fl.add("콕! 또는 쓱~", env.W / 2, env.H * 0.5, "#fff", 34 * U); }
        if (spawned >= CAP && !free().length) { stage = "outro"; st = 0; sfx.fanfare(); env.toast("로봇을 전부 잡았어요! 🎉", 2400); }
        else if (pt > PLAY_MAX && !bigNet) {
          bigNet = true;
          const rest = free();
          for (const b of rest) catchRobot(b, "b");
          env.toast(`${env.buddy === "taeo" ? "태오" : "재이"}가 큰 그물로 휙! 다 잡았다 🕸️`, 2600);
          spawned = Math.max(spawned, CAP); // 남은 로봇은 더 나오지 않는다
        }
        env.setScore(`🤖 ${mine + theirs}/${CAP}`);
      } else if (stage === "outro") {
        if (st > 2.6) done = true;
      }
      // 로봇 움직임
      for (let i = 0; i < robots.length; i++) {
        const b = robots[i];
        b.pop = Math.max(0, b.pop - dt);
        if (b.state === "free") {
          b.turn -= dt;
          if (b.turn <= 0) { b.turn = 0.8 + r() * 1.3; const a = Math.atan2(b.vy, b.vx) + (r() - 0.5) * 2; b.vx = Math.cos(a) * b.sp; b.vy = Math.sin(a) * b.sp; }
          const slow = b.warn > 0 ? 0.25 : 1;
          b.x += b.vx * dt * slow; b.y += b.vy * dt * slow;
          if (b.x < bx.x0) { b.x = bx.x0; b.vx = Math.abs(b.vx); }
          if (b.x > bx.x1) { b.x = bx.x1; b.vx = -Math.abs(b.vx); }
          if (b.y < bx.y0) { b.y = bx.y0; b.vy = Math.abs(b.vy); }
          if (b.y > bx.y1) { b.y = bx.y1; b.vy = -Math.abs(b.vy); }
          if (b.warn > 0) {
            b.warn -= dt;
            if (b.warn <= 0) {
              b.warn = 0;
              if (spawned < CAP) {
                const a = Math.atan2(b.vy, b.vx);
                newRobot(b.x, b.y, a + Math.PI * 0.7);
                b.vx = Math.cos(a - 0.6) * b.sp; b.vy = Math.sin(a - 0.6) * b.sp;
                fx.burst(b.x, b.y, 12, { color: ["#fff", b.c[0]], kind: "star", speed: 200 * U, size: 5, gravity: 80, life: 0.5 });
                fl.add("둘이 됐다!", b.x, b.y - b.rad - 26 * U, "#ffd0e0", 26 * U);
                sfx.jump();
              }
            }
          }
          // 끈끈이 덫에 걸림
          for (const tr of traps) if (Math.hypot(tr.x - b.x, tr.y - b.y) < TRAP_R + b.rad * 0.55) { catchRobot(b, "p"); tr.age = Math.max(tr.age, TRAP_LIFE - 0.4); break; }
        } else if (b.state === "caught") {
          b.ct += dt;
          if (b.ct > 0.65) {
            const c = cage(), p = clamp((b.ct - 0.65) / 0.5, 0, 1), e = ease(p);
            if (b.fx == null) { b.fx = b.x; b.fy = b.y; }
            b.x = b.fx + (c.x - b.fx) * e; b.y = b.fy + (c.y - 70 * U - b.fy) * e - Math.sin(p * Math.PI) * 120 * U;
            if (p >= 1) { b.state = "bag"; sfx.tap(); }
          }
        }
      }
      for (const tr of traps) tr.age += dt;
      for (let i = traps.length - 1; i >= 0; i--) if (traps[i].age > TRAP_LIFE) traps.splice(i, 1);
      for (const s of strands) s.age += dt;
      for (let i = strands.length - 1; i >= 0; i--) if (strands[i].age > 0.45) strands.splice(i, 1);
      fx.update(dt); fl.update(dt);
    },
    down(px, py, id) {
      if (stage !== "play") return;
      fingers.set(id == null ? "m" : id, { x: px, y: py, acc: 0 });
      shoot(px, py, "p");
    },
    move(px, py, id) {
      const f = fingers.get(id == null ? "m" : id);
      if (!f || stage !== "play") return;
      f.acc += Math.hypot(px - f.x, py - f.y); f.x = px; f.y = py;
      if (f.acc >= 64 * unit(env)) { f.acc = 0; shoot(px, py, "p"); }
    },
    up(px, py, id) { fingers.delete(id == null ? "m" : id); },
    release() { fingers.clear(); },
    bot(dt) {
      if (stage !== "play") return;
      botT += dt; if (botT < 0.3) return; botT = 0;
      const fr = free();
      if (fr.length) { const b = fr[r() * fr.length | 0]; api.down(b.x + b.vx * 0.02, b.y + b.vy * 0.02, "bot"); api.up(0, 0, "bot"); }
    },
    get result() {
      const ratio = mine / CAP;
      return { score: ratio >= (easy ? 0.45 : 0.6) ? 3 : ratio >= (easy ? 0.22 : 0.35) ? 2 : 1, line: `🕸️ 로봇 ${mine}개` };
    },
    info: () => ({ stage, time: pt, mine, theirs, spawned, cap: CAP, traps: traps.length, fingers: fingers.size, robots: free().map(b => ({ x: b.x, y: b.y, r: b.rad, vx: b.vx, vy: b.vy })) }),
    summary: () => ({ stage, mine, theirs, spawned }),
    draw(ctx) {
      const W = env.W, H = env.H, U = unit(env), fy = floorY();
      // 밤 도시 위 연구소 옥상
      let g = ctx.createLinearGradient(0, 0, 0, fy);
      g.addColorStop(0, "#141a3f"); g.addColorStop(0.6, "#2a2a6a"); g.addColorStop(1, "#4a3a7a");
      ctx.fillStyle = g; ctx.fillRect(0, 0, W, fy);
      for (let i = 0; i < 60; i++) { ctx.fillStyle = `rgba(255,255,255,${0.3 + 0.5 * Math.abs(Math.sin(t + i))})`; ctx.beginPath(); ctx.arc(hash(i) * W, hash(i + 70) * fy * 0.5, (0.8 + hash(i + 9) * 1.4) * U, 0, 7); ctx.fill(); }
      // 달과 서치라이트
      const mx = W * 0.2, my = fy * 0.2;
      const mg = ctx.createRadialGradient(mx, my, 40 * U, mx, my, 150 * U);
      mg.addColorStop(0, "rgba(255,246,208,.35)"); mg.addColorStop(1, "rgba(255,246,208,0)");
      ctx.fillStyle = mg; ctx.beginPath(); ctx.arc(mx, my, 150 * U, 0, 7); ctx.fill();
      ctx.fillStyle = "#fff6d0"; ctx.beginPath(); ctx.arc(mx, my, 46 * U, 0, 7); ctx.fill();
      ctx.fillStyle = "rgba(220,205,160,.5)";
      [[-14, -10, 9], [14, 8, 7], [-4, 20, 5]].forEach(([a, b, c]) => { ctx.beginPath(); ctx.arc(mx + a * U, my + b * U, c * U, 0, 7); ctx.fill(); });
      for (const [bx0, ph] of [[0.42, 0], [0.7, 2]]) {
        const a = -Math.PI / 2 + Math.sin(t * 0.5 + ph) * 0.5;
        ctx.fillStyle = "rgba(160,200,255,.08)";
        ctx.beginPath(); ctx.moveTo(W * bx0, fy); ctx.lineTo(W * bx0 + Math.cos(a - 0.08) * fy * 1.2, fy + Math.sin(a - 0.08) * fy * 1.2); ctx.lineTo(W * bx0 + Math.cos(a + 0.08) * fy * 1.2, fy + Math.sin(a + 0.08) * fy * 1.2); ctx.fill();
      }
      skyline(ctx, W, fy, U, t);
      // 바닥
      g = ctx.createLinearGradient(0, fy, 0, H);
      g.addColorStop(0, "#5a6688"); g.addColorStop(1, "#2e3552");
      ctx.fillStyle = g; ctx.fillRect(0, fy, W, H - fy);
      ctx.fillStyle = "#7f8bb0"; ctx.fillRect(0, fy, W, 6 * U);
      ctx.strokeStyle = "rgba(255,255,255,.08)"; ctx.lineWidth = 2 * U;
      for (let x = -((W / 2) % (110 * U)); x < W; x += 110 * U) { ctx.beginPath(); ctx.moveTo(x, fy); ctx.lineTo(W / 2 + (x - W / 2) * 2.2, H); ctx.stroke(); }
      copier(ctx, machine(), U, t, stage === "play" && spawned < CAP);
      netBag(ctx, cage(), U, robots.filter(b => b.state === "bag").length, mine + theirs);
      // 끈끈이 덫
      for (const tr of traps) web(ctx, tr.x, tr.y, TRAP_R * (0.6 + 0.4 * Math.min(1, tr.age * 6)), clamp((TRAP_LIFE - tr.age) / 0.6, 0, 1) * 0.85, U, tr.age);
      // 로봇
      for (const b of robots) if (b.state !== "bag") robot(ctx, b, U, t);
      // 거미줄 줄기
      for (const s of strands) {
        const p = clamp(s.age / 0.12, 0, 1), a = clamp(1 - (s.age - 0.12) / 0.33, 0, 1);
        const x = s.x0 + (s.x1 - s.x0) * p, y = s.y0 + (s.y1 - s.y0) * p;
        ctx.strokeStyle = s.who === "p" ? `rgba(255,255,255,${a})` : `rgba(190,230,255,${a})`;
        ctx.lineWidth = 4 * U; ctx.lineCap = "round";
        ctx.beginPath(); ctx.moveTo(s.x0, s.y0); ctx.quadraticCurveTo((s.x0 + x) / 2 + 20 * U, (s.y0 + y) / 2 - 30 * U, x, y); ctx.stroke();
        ctx.lineWidth = 1.5 * U; ctx.beginPath(); ctx.moveTo(s.x0 + 6 * U, s.y0); ctx.quadraticCurveTo((s.x0 + x) / 2 + 30 * U, (s.y0 + y) / 2 - 24 * U, x + 4 * U, y); ctx.stroke();
        ctx.lineCap = "butt";
      }
      fx.draw(ctx);
      rideCar(ctx, env, W, H, U, rim(), kidX("p"), kidX("b"), t);
      fl.draw(ctx);
      if (stage === "intro") bigTitle(ctx, env, "🕸️ 스파이더맨 로봇 잡기!", st, U, "#fff", "#2a3a8a");
      if (stage === "outro") bigTitle(ctx, env, `로봇 ${mine + theirs}개 다 잡았다! 🎉`, st, U, "#fff36b", "#3a2a7a");
    },
  };
  return api;
}

function skyline(ctx, W, fy, U, t) {
  for (let layer = 0; layer < 2; layer++) {
    const bw = (layer ? 90 : 130) * U;
    for (let i = 0, x = -20 * U; x < W + bw; i++, x += bw * (0.8 + hash(i + layer * 40) * 0.5)) {
      const h = fy * (layer ? 0.17 : 0.3) * (0.5 + hash(i * 3 + layer) * 0.8);
      const w = bw * 0.9;
      ctx.fillStyle = layer ? "#262a5a" : "#1c2048";
      ctx.fillRect(x, fy - h, w, h);
      if (!layer) for (let wy = fy - h + 16 * U; wy < fy - 16 * U; wy += 26 * U) for (let wx = x + 12 * U; wx < x + w - 14 * U; wx += 24 * U) {
        if (hash(wx * 0.37 + wy * 0.11) < 0.45) { ctx.fillStyle = hash(wx + wy) < 0.5 ? "#ffd86b" : "#9fd0ff"; ctx.fillRect(wx, wy, 10 * U, 12 * U); }
      }
    }
  }
}

function copier(ctx, m, U, t, busy) {
  // 고장 난 로봇 복사기(상자 모양 기계)
  const w = 140 * U, h = 190 * U, x = m.x - w / 2, y = m.y - h;
  const shake = busy ? Math.sin(t * 40) * 2 * U : 0;
  ctx.save(); ctx.translate(shake, 0);
  ctx.fillStyle = "rgba(0,0,0,.3)"; ctx.beginPath(); ctx.ellipse(m.x, m.y + 4 * U, w * 0.6, 12 * U, 0, 0, 7); ctx.fill();
  ctx.fillStyle = "#c8d0e8"; rr(ctx, x, y, w, h, 18 * U); ctx.fill();
  ctx.fillStyle = "#9aa4c4"; rr(ctx, x + 10 * U, y + h - 40 * U, w - 20 * U, 26 * U, 8 * U); ctx.fill();
  ctx.fillStyle = "#2a3050"; rr(ctx, x - 14 * U, y + 50 * U, 50 * U, 72 * U, 12 * U); ctx.fill(); // 나오는 구멍
  ctx.fillStyle = "#5fe0c8"; rr(ctx, x + 50 * U, y + 22 * U, 74 * U, 40 * U, 8 * U); ctx.fill();
  text(ctx, busy ? "복사중" : "고장!", x + 87 * U, y + 42 * U, 18 * U, { color: "#123" });
  for (let k = 0; k < 3; k++) { ctx.fillStyle = busy && (Math.floor(t * 6) + k) % 3 === 0 ? "#ff5f5f" : "#5a6080"; ctx.beginPath(); ctx.arc(x + 62 * U + k * 24 * U, y + 90 * U, 8 * U, 0, 7); ctx.fill(); }
  ctx.strokeStyle = "#5a6080"; ctx.lineWidth = 4 * U; ctx.beginPath(); ctx.moveTo(m.x + 30 * U, y); ctx.lineTo(m.x + 40 * U, y - 34 * U); ctx.stroke();
  ctx.fillStyle = busy && Math.sin(t * 10) > 0 ? "#ffe14d" : "#7a7f9a"; ctx.beginPath(); ctx.arc(m.x + 40 * U, y - 38 * U, 9 * U, 0, 7); ctx.fill();
  ctx.restore();
}

function netBag(ctx, c, U, n, total) {
  // 잡은 로봇이 들어가는 끈끈이 그물 바구니
  const w = 130 * U, h = 110 * U, x = c.x - w / 2, y = c.y - h;
  ctx.fillStyle = "rgba(0,0,0,.3)"; ctx.beginPath(); ctx.ellipse(c.x, c.y + 4 * U, w * 0.6, 12 * U, 0, 0, 7); ctx.fill();
  const piled = Math.min(n, 9);
  for (let i = 0; i < piled; i++) {
    const col = ROBOT_COLORS[i % ROBOT_COLORS.length];
    const px = x + 24 * U + (i % 3) * 40 * U, py = c.y - 24 * U - Math.floor(i / 3) * 28 * U;
    ctx.fillStyle = col[0]; ctx.beginPath(); ctx.arc(px, py, 17 * U, 0, 7); ctx.fill();
    ctx.fillStyle = "#26304a"; rr(ctx, px - 11 * U, py - 7 * U, 22 * U, 12 * U, 4 * U); ctx.fill();
    ctx.fillStyle = "#7ff6ff"; ctx.beginPath(); ctx.arc(px - 5 * U, py - 1 * U, 2.5 * U, 0, 7); ctx.arc(px + 5 * U, py - 1 * U, 2.5 * U, 0, 7); ctx.fill();
    ctx.fillStyle = "#ff6b8b"; ctx.beginPath(); ctx.arc(px, py - 22 * U, 3.5 * U, 0, 7); ctx.fill();
  }
  ctx.strokeStyle = "rgba(255,255,255,.85)"; ctx.lineWidth = 2.5 * U;
  ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x + 10 * U, c.y); ctx.lineTo(x + w - 10 * U, c.y); ctx.lineTo(x + w, y); ctx.stroke();
  for (let k = 1; k < 6; k++) { const xx = x + k * w / 6; ctx.beginPath(); ctx.moveTo(xx, y); ctx.lineTo(xx + (k - 3) * 2 * U, c.y); ctx.stroke(); }
  for (let k = 1; k < 4; k++) { const yy = y + k * h / 4; ctx.beginPath(); ctx.moveTo(x + 2 * U, yy); ctx.lineTo(x + w - 2 * U, yy); ctx.stroke(); }
  ctx.fillStyle = "#ffe14d"; rr(ctx, c.x - 40 * U, y - 46 * U, 80 * U, 38 * U, 19 * U); ctx.fill();
  text(ctx, `🤖 ${total}`, c.x, y - 27 * U, 22 * U, { color: "#5a3a00" });
}

function web(ctx, x, y, R, alpha, U, rot) {
  if (alpha <= 0) return;
  ctx.save(); ctx.translate(x, y); ctx.rotate(rot * 0.3);
  ctx.strokeStyle = `rgba(255,255,255,${alpha})`; ctx.lineWidth = 2.2 * U;
  const n = 8;
  for (let k = 0; k < n; k++) { const a = k * Math.PI * 2 / n; ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(Math.cos(a) * R, Math.sin(a) * R); ctx.stroke(); }
  for (const f of [0.35, 0.65, 0.95]) {
    ctx.beginPath();
    for (let k = 0; k <= n; k++) { const a = k * Math.PI * 2 / n, a0 = (k - 0.5) * Math.PI * 2 / n; if (!k) ctx.moveTo(Math.cos(a) * R * f, Math.sin(a) * R * f); else ctx.quadraticCurveTo(Math.cos(a0) * R * f * 0.8, Math.sin(a0) * R * f * 0.8, Math.cos(a) * R * f, Math.sin(a) * R * f); }
    ctx.stroke();
  }
  ctx.fillStyle = `rgba(255,255,255,${alpha * 0.18})`; ctx.beginPath(); ctx.arc(0, 0, R, 0, 7); ctx.fill();
  ctx.restore();
}

function robot(ctx, b, U, t) {
  const caught = b.state === "caught";
  const s = (caught && b.ct > 0.65 ? 1 - clamp((b.ct - 0.65) / 0.5, 0, 1) * 0.5 : 1) * (1 - b.pop * 1.5);
  const R = b.rad;
  ctx.save();
  ctx.translate(b.x + (b.warn > 0 ? Math.sin(t * 60) * 4 * U : 0), b.y + (caught ? 0 : Math.sin(t * 6 + b.ph) * 5 * U));
  ctx.scale(Math.max(0.2, s), Math.max(0.2, s));
  if (caught) ctx.rotate(Math.sin(b.ct * 20) * 0.15 * Math.max(0, 1 - b.ct));
  // 발 밑 분사 불꽃
  if (!caught) { const fl = 1 + Math.sin(t * 30 + b.ph) * 0.2; ctx.fillStyle = "#ffb347"; ctx.beginPath(); ctx.moveTo(-10 * U, R * 0.85); ctx.lineTo(0, R * 0.85 + 26 * U * fl); ctx.lineTo(10 * U, R * 0.85); ctx.fill(); ctx.fillStyle = "#fff3a0"; ctx.beginPath(); ctx.moveTo(-5 * U, R * 0.85); ctx.lineTo(0, R * 0.85 + 13 * U * fl); ctx.lineTo(5 * U, R * 0.85); ctx.fill(); }
  // 팔(허둥지둥)
  ctx.strokeStyle = b.c[1]; ctx.lineWidth = 6 * U; ctx.lineCap = "round";
  const wave = caught ? 0.2 : Math.sin(t * 12 + b.ph) * 0.6;
  [-1, 1].forEach(side => { ctx.beginPath(); ctx.moveTo(side * R * 0.85, 0); ctx.lineTo(side * (R * 0.85 + 18 * U), -16 * U * side * wave - 10 * U); ctx.stroke(); });
  ctx.lineCap = "butt";
  // 안테나
  ctx.strokeStyle = "#5a6080"; ctx.lineWidth = 3 * U; ctx.beginPath(); ctx.moveTo(0, -R * 0.9); ctx.lineTo(0, -R * 1.3); ctx.stroke();
  ctx.fillStyle = b.warn > 0 ? (Math.sin(t * 40) > 0 ? "#ff3a3a" : "#fff") : "#ff6b8b"; ctx.beginPath(); ctx.arc(0, -R * 1.35, 7 * U, 0, 7); ctx.fill();
  // 몸통
  const g = ctx.createRadialGradient(-R * 0.3, -R * 0.4, R * 0.2, 0, 0, R);
  g.addColorStop(0, "#ffffff"); g.addColorStop(0.35, b.c[0]); g.addColorStop(1, b.c[1]);
  ctx.fillStyle = g; ctx.beginPath(); ctx.arc(0, 0, R, 0, 7); ctx.fill();
  if (b.warn > 0) { ctx.fillStyle = `rgba(255,80,80,${0.25 + 0.25 * Math.sin(t * 40)})`; ctx.beginPath(); ctx.arc(0, 0, R, 0, 7); ctx.fill(); }
  // 화면 얼굴
  ctx.fillStyle = "#26304a"; rr(ctx, -R * 0.62, -R * 0.42, R * 1.24, R * 0.72, R * 0.22); ctx.fill();
  const blink = Math.sin(t * 2.3 + b.ph * 3) > 0.96;
  ctx.fillStyle = caught ? "#ffb0c8" : "#7ff6ff";
  if (caught) { ctx.font = `900 ${Math.round(R * 0.42)}px sans-serif`; ctx.textAlign = "center"; ctx.textBaseline = "middle"; ctx.fillText("> <", 0, -R * 0.08); }
  else if (blink) { ctx.fillRect(-R * 0.36, -R * 0.1, R * 0.22, 4 * U); ctx.fillRect(R * 0.14, -R * 0.1, R * 0.22, 4 * U); }
  else { ctx.beginPath(); ctx.arc(-R * 0.25, -R * 0.1, R * 0.11, 0, 7); ctx.arc(R * 0.25, -R * 0.1, R * 0.11, 0, 7); ctx.fill(); }
  ctx.strokeStyle = caught ? "#ffb0c8" : "#7ff6ff"; ctx.lineWidth = 2.5 * U;
  ctx.beginPath(); ctx.arc(0, R * 0.06, R * 0.16, 0.2, Math.PI - 0.2); ctx.stroke();
  // 잡히면 끈끈이 그물
  if (caught) web(ctx, 0, 0, R * 1.25, 0.95, U, 0.5);
  ctx.restore();
}

function rideCar(ctx, env, W, H, U, rimY, xp, xb, t) {
  const kh = Math.min(W, H) * 0.3;
  upper(ctx, env.kid("cheer", "player"), xp, rimY + 6 * U, kh, false);
  upper(ctx, env.kid("cheer", "buddy"), xb, rimY + 6 * U, kh * 0.93, true);
  const cw = Math.min(W * 0.8, 640 * U), cx = (xp + xb) / 2 - cw / 2;
  const g = ctx.createLinearGradient(0, rimY, 0, H);
  g.addColorStop(0, "#4a8aff"); g.addColorStop(1, "#2a52c8");
  ctx.fillStyle = g; rr(ctx, cx, rimY, cw, H - rimY + 30 * U, 34 * U); ctx.fill();
  ctx.fillStyle = "#c8d6ff"; rr(ctx, cx + 16 * U, rimY + 14 * U, cw - 32 * U, 10 * U, 5 * U); ctx.fill();
  for (let k = 0; k < 6; k++) { ctx.fillStyle = Math.sin(t * 5 + k) > 0 ? "#7ff6ff" : "#3a6ad8"; rr(ctx, cx + cw * (0.12 + k * 0.14), rimY + 40 * U, 30 * U, 12 * U, 6 * U); ctx.fill(); }
}
