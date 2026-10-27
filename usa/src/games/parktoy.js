// 토이스토리(아이들이 부르던 이름표): 놀이공원 장난감 사격 부스 세 곳을 빙글 돌며 과녁을 콕콕!
// ① 접시 깨기(가끔 달걀·금접시) ② 풍선 터뜨리기 ③ 고리 던지기. 빨리 이어 맞히면 콤보!
// 끈을 당기는 장난감 대포·과녁·부스는 모두 이 게임만의 그림(만화 속 인물은 하나도 그리지 않는다).
// 옆자리 형제도 같이 쏜다. 마지막에 점수판으로 누가 이겼나 본다.
import { text, star, Particles, Floaters, clamp, rng, rr } from "../engine.js";
import { unit, upper, bigTitle, ease, emo } from "./parkkit.js";

const NAMES = { jaei: "재이", taeo: "태오" };
const BOOTHS = [
  { id: "plates", name: "접시 깨기", icon: "🍽️", a: "#e0344f", b: "#fff4ea", wall: ["#5a2a6a", "#3a1a4a"], tip: "움직이는 접시를 콕! 금접시는 500점 ✨" },
  { id: "balloons", name: "풍선 터뜨리기", icon: "🎈", a: "#2f7fd8", b: "#ffe066", wall: ["#1f4a7a", "#122c4f"], tip: "올라가는 풍선을 콕콕! 펑펑! 🎈" },
  { id: "rings", name: "고리 던지기", icon: "⭕", a: "#2fa36b", b: "#f6f0ff", wall: ["#4a2a7a", "#26164a"], tip: "병을 콕 누르면 고리가 쏙! ⭕" },
];
const PLATE_COLORS = ["#ff5f7a", "#4fb0ff", "#ffb020", "#7a5cff", "#2fc48d"];
const BALLOON_COLORS = ["#ff4f6d", "#ffb020", "#4fb0ff", "#7cdb4a", "#b46bff", "#ff7ac8"];
const BOTTLE_COLORS = ["#3fbf8f", "#4f9fff", "#ff8f4f", "#c46bff", "#ff5f8f"];
const fmt = n => String(Math.round(n)).replace(/\B(?=(\d{3})+(?!\d))/g, ",");

export function create(env) {
  const { sfx } = env;
  const easy = env.easy;
  const fx = new Particles(), fl = new Floaters();
  const BOOTH_T = 7.2, SPIN_T = 1.4, FINAL_T = 3.6;
  const TOL = easy ? 1.45 : 1.25, COMBO_WIN = easy ? 1.9 : 1.35;
  const r = rng(77);
  let stage = "intro", st = 0, t = 0, booth = 0, bt = 0;
  let score = 0, buddy = 0, hits = 0, misses = 0, combo = 0, maxCombo = 0, lastHit = -9, comboPop = 0, buddyT = 1.2, spawnT = 0, botT = 0, bCombo = 0, bLast = -9;
  let aimP = -1.2, aimB = -1.6, pullP = 0, pullB = 0, done = false, tipShown = -1, cheered = false;
  let targets = [];
  const shots = [];   // 날아가는 공·고리(그림만)
  const port = () => env.H > env.W * 1.05;
  const geo = () => {
    const W = env.W, H = env.H, U = unit(env);
    const top = H * 0.215, counter = H * 0.735;
    return { W, H, U, top, bot: counter - 18 * U, counter, rim: H - 78 * U, px: W * (port() ? 0.33 : 0.38), bx: W * (port() ? 0.67 : 0.62) };
  };
  const cannonAt = who => { const g = geo(); return { x: (who === "p" ? g.px : g.bx) + 58 * g.U * (who === "p" ? 1 : -1), y: g.rim - 22 * g.U }; };

  // ---------- 과녁 만들기 ----------
  function setupBooth(i) {
    targets = [];
    const g = geo(), U = g.U;
    const id = BOOTHS[i].id;
    if (id === "plates") {
      const rows = 3, gap = 215 * U;
      for (let row = 0; row < rows; row++) {
        const y = g.top + (row + 0.55) * (g.bot - g.top) / rows;
        const n = Math.ceil((g.W + 400 * U) / gap);
        const dir = row % 2 ? -1 : 1, sp = (easy ? 78 : 112) * U * (1 + row * 0.14);
        for (let k = 0; k < n; k++) targets.push(plate(-200 * U + k * gap + (row % 2) * gap * 0.5, y, row, dir, sp, n * gap));
      }
    } else if (id === "balloons") {
      for (let k = 0; k < 5; k++) { const b = balloon(); b.y = g.top + 60 * U + r() * (g.bot - g.top - 60 * U); targets.push(b); }
      spawnT = 0.3;
    } else {
      const per = port() ? 3 : 4;
      for (let row = 0; row < 2; row++) for (let k = 0; k < per; k++) {
        targets.push(bottle(g.W * (0.14 + (k + (row ? 0.5 : 0)) * 0.72 / (per - 0.5)), row));
      }
    }
  }
  function plate(x, y, row, dir, sp, span) {
    const k = r();
    const kind = k < 0.07 ? "gold" : k < 0.25 ? "egg" : "plate";
    return { kind, x, y, row, dir, sp, span, rad: (kind === "egg" ? 34 : 44) * unit(env) * (easy ? 1.15 : 1), pts: kind === "gold" ? 500 : kind === "egg" ? 200 : 100, c: PLATE_COLORS[r() * PLATE_COLORS.length | 0], gone: false, ph: r() * 6 };
  }
  function balloon() {
    const g = geo(), U = g.U;
    const gold = r() < 0.08;
    return { kind: gold ? "gold" : "balloon", x: g.W * (0.1 + r() * 0.8), y: g.bot + 70 * U, vy: -(easy ? 78 : 108) * U * (0.85 + r() * 0.35), rad: 44 * U * (easy ? 1.15 : 1), pts: gold ? 500 : 100, c: BALLOON_COLORS[r() * BALLOON_COLORS.length | 0], gone: false, ph: r() * 6 };
  }
  function bottle(bx, row) {
    const g = geo(), U = g.U;
    const gold = r() < 0.12;
    const y = g.top + (row ? 0.86 : 0.4) * (g.bot - g.top);
    return { kind: gold ? "gold" : "bottle", bx, row, x: bx, y, rad: 48 * U * (easy ? 1.15 : 1), pts: gold ? 500 : 150, c: BOTTLE_COLORS[r() * BOTTLE_COLORS.length | 0], gone: false, ph: r() * 6, ringT: -1, pop: 0, said: false, byP: false };
  }

  // ---------- 쏘기 ----------
  function hitTarget(tg, who) {
    const g = geo(), U = g.U;
    const from = cannonAt(who);
    const a = Math.atan2(tg.y - from.y, tg.x - from.x);
    if (who === "p") { aimP = a; pullP = 0.25; } else { aimB = a; pullB = 0.25; }
    const isRing = BOOTHS[booth].id === "rings";
    shots.push({ x0: from.x, y0: from.y, x1: tg.x, y1: tg.y - (isRing ? 30 * U : 0), age: 0, life: isRing ? 0.3 : 0.14, ring: isRing, who });
    let pts = tg.pts;
    if (who === "p") {
      combo = t - lastHit < COMBO_WIN ? combo + 1 : 1;
      lastHit = t; hits++;
      maxCombo = Math.max(maxCombo, combo);
      pts *= Math.min(combo, 5);
      score += pts;
      if (combo >= 2) { comboPop = 1; if (combo >= 3) sfx.star(); }
    } else {
      bCombo = t - bLast < 1.4 ? bCombo + 1 : 1; bLast = t;
      pts *= Math.min(bCombo, 3);
      buddy += pts;
    }
    if (isRing) { tg.ringT = 0; tg.byP = who === "p"; }
    else tg.gone = true;
    const col = tg.kind === "gold" ? ["#ffe14d", "#fff", "#ffb300"] : [tg.c, "#fff"];
    if (!isRing) {
      if (tg.kind === "balloon" || (tg.kind === "gold" && BOOTHS[booth].id === "balloons")) { sfx.pop(); fx.burst(tg.x, tg.y, 18, { color: col, speed: 300 * U, size: 6, gravity: 300, life: 0.7 }); }
      else { sfx.build(); fx.burst(tg.x, tg.y, 16, { color: tg.kind === "egg" ? ["#fff8e6", "#ffd23f"] : col, speed: 260 * U, size: 7, gravity: 900, life: 0.8 }); }
      if (tg.kind === "egg") fl.add("🐣", tg.x, tg.y - 10 * U, "#fff", 46 * U);
    }
    if (tg.kind === "gold") { sfx.coin(); fx.burst(tg.x, tg.y, 12, { color: ["#ffe14d", "#fff"], kind: "star", speed: 240 * U, size: 6, gravity: 150 }); }
    if (who === "p") fl.add("+" + fmt(pts), tg.x, tg.y - tg.rad - 16 * U, tg.kind === "gold" ? "#ffe14d" : "#fff", (30 + Math.min(combo, 5) * 5) * U);
    else fl.add("+" + fmt(pts), tg.x, tg.y - tg.rad - 10 * U, "#bfe6ff", 22 * U);
  }
  function alive() { return targets.filter(tg => !tg.gone && !(tg.ringT >= 0) && onScreen(tg)); }
  function onScreen(tg) { const g = geo(); return tg.x > 30 && tg.x < g.W - 30 && tg.y > g.top - 10 && tg.y < g.bot + 30; }

  const api = {
    id: "toy",
    get done() { return done; },
    progress: () => clamp(stage === "intro" ? 0 : stage === "final" || stage === "end" ? 1 : (booth + (stage === "spin" ? 1 : clamp(bt / BOOTH_T, 0, 1))) / 3, 0, 1),
    update(dt) {
      t += dt; st += dt;
      const g = geo(), U = g.U;
      if (stage === "intro") {
        if (st > 1.4) { stage = "play"; st = 0; bt = 0; setupBooth(0); }
      } else if (stage === "play") {
        bt += dt;
        if (tipShown !== booth) { tipShown = booth; env.toast(BOOTHS[booth].tip, 2600); }
        const id = BOOTHS[booth].id;
        for (const tg of targets) {
          if (id === "plates") {
            tg.x += tg.dir * tg.sp * dt;
            if (tg.dir > 0 && tg.x > g.W + 200 * U) Object.assign(tg, plate(tg.x - tg.span, tg.y, tg.row, tg.dir, tg.sp, tg.span));
            if (tg.dir < 0 && tg.x < -200 * U) Object.assign(tg, plate(tg.x + tg.span, tg.y, tg.row, tg.dir, tg.sp, tg.span));
          } else if (id === "balloons") {
            tg.y += tg.vy * dt; tg.x += Math.sin(t * 1.8 + tg.ph) * 22 * U * dt;
            if (tg.y < g.top - 40 * U) tg.gone = true;
          } else {
            tg.x = tg.bx + Math.sin(t * (easy ? 1.1 : 1.6) + tg.ph) * g.W * 0.05;
            if (tg.ringT >= 0) {
              tg.ringT += dt;
              if (tg.ringT > 0.3 && !tg.said) { tg.said = true; if (tg.byP) { fl.add("쏙!", tg.x + 56 * U, tg.y - 10 * U, "#fff36b", 32 * U); sfx.coin(); } fx.burst(tg.x, tg.y - 30 * U, 10, { color: ["#ffe14d", "#fff"], kind: "star", speed: 160 * U, size: 5, gravity: 100 }); }
              if (tg.ringT > 1.1) Object.assign(tg, bottle(tg.bx, tg.row), { pop: 0.35 });
            }
            tg.pop = Math.max(0, (tg.pop || 0) - dt);
          }
        }
        if (id === "balloons") {
          targets = targets.filter(tg => !tg.gone);
          spawnT -= dt;
          if (spawnT <= 0) { spawnT = (easy ? 0.6 : 0.46) * (0.8 + r() * 0.4); targets.push(balloon()); }
        }
        // 옆자리 형제도 쏜다(앞서가지 않게 살살)
        buddyT -= dt;
        if (buddyT <= 0) {
          const want = score * (easy ? 0.72 : 0.88) + 400;
          buddyT = (buddy < want * 0.6 ? 0.42 : 0.7) + r() * 0.35;
          if (buddy < want) {
            const list = alive().filter(tg => tg.x > g.W * 0.45);
            if (list.length) hitTarget(list[r() * list.length | 0], "b");
          }
        }
        env.setScore(`🎯 ${fmt(score)}`);
        if (bt >= BOOTH_T) {
          if (booth < 2) { stage = "spin"; st = 0; sfx.whoosh(); combo = 0; }
          else { stage = "final"; st = 0; targets = []; sfx.fanfare(); }
        }
      } else if (stage === "spin") {
        if (st >= SPIN_T) { booth++; bt = 0; stage = "play"; st = 0; setupBooth(booth); sfx.level(); }
      } else if (stage === "final") {
        if (st > 0.9 && !cheered) { cheered = true; if (score >= buddy) { sfx.fanfare(); for (let i = 0; i < 3; i++) fx.burst(g.W * (0.3 + i * 0.2), g.H * 0.3, 22, { color: ["#ff5fa2", "#ffd23f", "#5fd4ff", "#fff"], speed: 360 * U, size: 6, gravity: 420, life: 1.3 }); } else sfx.level(); }
        if (st > FINAL_T) { stage = "end"; done = true; }
      }
      comboPop = Math.max(0, comboPop - dt * 1.4);
      pullP = Math.max(0, pullP - dt); pullB = Math.max(0, pullB - dt);
      for (const s of shots) s.age += dt;
      for (let i = shots.length - 1; i >= 0; i--) if (shots[i].age > shots[i].life + 0.15) shots.splice(i, 1);
      fx.update(dt); fl.update(dt);
    },
    down(px, py) {
      if (stage !== "play") return;
      const U = unit(env);
      let best = null, bd = Infinity;
      for (const tg of alive()) { const d = Math.hypot(tg.x - px, tg.y - py); if (d < tg.rad * TOL && d < bd) { bd = d; best = tg; } }
      if (best) { hitTarget(best, "p"); return; }
      misses++;
      const from = cannonAt("p");
      aimP = Math.atan2(py - from.y, px - from.x); pullP = 0.25;
      shots.push({ x0: from.x, y0: from.y, x1: px, y1: py, age: 0, life: 0.14, ring: BOOTHS[booth].id === "rings", who: "p", miss: true });
      sfx.tap();
      fx.burst(px, py, 6, { color: ["#fff", "#ddd"], speed: 120 * U, size: 4, gravity: 200, life: 0.4 });
    },
    move() {}, up() {}, release() {},
    bot(dt) {
      if (stage !== "play") return;
      botT += dt; if (botT < 0.32) return; botT = 0;
      const list = alive();
      if (list.length) { const tg = list[r() * list.length | 0]; api.down(tg.x, tg.y); }
    },
    get result() {
      const win = score >= buddy;
      const s = (hits >= (easy ? 14 : 20) && win) || hits >= (easy ? 18 : 26) ? 3 : hits >= (easy ? 7 : 11) || win ? 2 : 1;
      return { score: s, line: `🎯 ${fmt(score)}점` };
    },
    info: () => ({ stage, booth, boothId: BOOTHS[booth].id, score, buddy, hits, misses, combo, maxCombo, targets: alive().map(tg => ({ x: tg.x, y: tg.y, r: tg.rad, kind: tg.kind })) }),
    summary: () => ({ stage, booth, score, buddy, hits, maxCombo }),
    draw(ctx) {
      const g = geo(), W = g.W, H = g.H, U = g.U;
      // 무대 뒤 천막
      ctx.fillStyle = "#2a1640"; ctx.fillRect(0, 0, W, H);
      if (stage === "spin") {
        const p = ease(clamp(st / SPIN_T, 0, 1));
        ctx.save(); ctx.translate(-W * p, 0); boothScene(ctx, g, booth, true); ctx.restore();
        ctx.save(); ctx.translate(W * (1 - p), 0); boothScene(ctx, g, booth + 1, false); ctx.restore();
        ctx.strokeStyle = "rgba(255,255,255,.35)"; ctx.lineWidth = 4 * U;
        for (let i = 0; i < 9; i++) { const y = H * (0.2 + i * 0.06), x = (W * 1.3 * ((i * 0.37 + st * 2.2) % 1)) - W * 0.15; ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x + 160 * U, y); ctx.stroke(); }
        text(ctx, "빙글~ 다음 부스! 🎪", W / 2, H * 0.45, 52 * U, { color: "#fff", stroke: "#7b4bd0", lw: 11 * U });
      } else boothScene(ctx, g, Math.min(booth, 2), stage === "play");
      // 날아가는 공·고리
      for (const s of shots) {
        const p = clamp(s.age / s.life, 0, 1);
        const x = s.x0 + (s.x1 - s.x0) * p, y = s.y0 + (s.y1 - s.y0) * p - Math.sin(p * Math.PI) * (s.ring ? 120 : 30) * U;
        if (p >= 1) continue;
        if (s.ring) { ctx.strokeStyle = s.who === "p" ? "#ffd23f" : "#9fe0ff"; ctx.lineWidth = 7 * U; ctx.beginPath(); ctx.ellipse(x, y, 30 * U, 11 * U, 0, 0, 7); ctx.stroke(); }
        else {
          ctx.strokeStyle = s.who === "p" ? "rgba(255,240,150,.55)" : "rgba(170,225,255,.5)"; ctx.lineWidth = 8 * U; ctx.lineCap = "round";
          ctx.beginPath(); ctx.moveTo(s.x0 + (s.x1 - s.x0) * Math.max(0, p - 0.35), s.y0 + (s.y1 - s.y0) * Math.max(0, p - 0.35)); ctx.lineTo(x, y); ctx.stroke(); ctx.lineCap = "butt";
          ctx.fillStyle = s.who === "p" ? "#ffe14d" : "#9fe0ff"; ctx.beginPath(); ctx.arc(x, y, 11 * U, 0, 7); ctx.fill();
        }
      }
      fx.draw(ctx);
      // 놀이기구 차와 아이 둘, 끈 당기는 대포
      car(ctx, g, t, stage === "spin" ? Math.sin(st / SPIN_T * Math.PI) * 0.06 : 0, env, aimP, aimB, pullP, pullB);
      // 점수판(형제와 나란히)
      if (stage !== "intro") scorePills(ctx, g, env, score, buddy);
      fl.draw(ctx);
      if (comboPop > 0 && combo >= 2 && stage === "play") {
        // 간판 자리를 잠깐 덮는 콤보 딱지(크게!)
        const k = 1 + comboPop * 0.35, cy = g.top - 8 * U;
        ctx.globalAlpha = Math.min(1, comboPop * 2.5);
        ctx.save(); ctx.translate(W / 2, cy); ctx.scale(k, k);
        const bw = Math.min(W - 40, 430 * U), bh = 78 * U;
        ctx.fillStyle = combo >= 5 ? "#ff3f8f" : combo >= 3 ? "#7b3fd0" : "#3f6fd8"; rr(ctx, -bw / 2, -bh / 2, bw, bh, bh / 2); ctx.fill();
        ctx.lineWidth = 6 * U; ctx.strokeStyle = "#fff"; ctx.stroke();
        text(ctx, `${combo} 콤보! ×${Math.min(combo, 5)}`, 0, 2 * U, 50 * U, { color: combo >= 3 ? "#ffe14d" : "#fff", stroke: "rgba(40,10,60,.6)", lw: 9 * U });
        ctx.restore();
        ctx.globalAlpha = 1;
      }
      if (stage === "play" && bt < 1.1) {
        const b = BOOTHS[booth];
        ctx.globalAlpha = clamp(1.1 - bt, 0, 1) * 1.4 > 1 ? 1 : clamp(1.1 - bt, 0, 1) * 1.4;
        text(ctx, `${b.icon} ${booth + 1}. ${b.name}!`, W / 2, H * 0.46, 64 * U, { color: "#fff", stroke: b.a, lw: 13 * U });
        ctx.globalAlpha = 1;
      }
      if (stage === "intro") bigTitle(ctx, env, "🎯 토이스토리 장난감 사격!", st, U, "#fff", "#e0344f");
      if (stage === "final" || stage === "end") finalBoard(ctx, g, env, st, score, buddy, maxCombo);
    },
  };

  function boothScene(ctx, g, i, live) {
    const b = BOOTHS[i], W = g.W, H = g.H, U = g.U;
    let gr = ctx.createLinearGradient(0, 0, 0, g.counter);
    gr.addColorStop(0, b.wall[0]); gr.addColorStop(1, b.wall[1]);
    ctx.fillStyle = gr; ctx.fillRect(0, 0, W, g.counter);
    // 커튼 주름
    for (let x = 0; x < W; x += 70 * U) { ctx.fillStyle = "rgba(255,255,255,.05)"; ctx.fillRect(x, g.top - 30 * U, 30 * U, g.counter - g.top + 30 * U); }
    // 반짝 전구 줄
    for (let x = 30 * U, k = 0; x < W; x += 60 * U, k++) {
      const on = (Math.floor(t * 3) + k) % 2;
      ctx.fillStyle = on ? "#fff3a0" : "#b98a3a"; ctx.beginPath(); ctx.arc(x, g.top - 22 * U, 7 * U, 0, 7); ctx.fill();
    }
    // 과녁
    if (live) {
      if (b.id === "plates") for (let row = 0; row < 3; row++) { const y = g.top + (row + 0.55) * (g.bot - g.top) / 3 + 48 * U; shelf(ctx, W, y, U); }
      if (b.id === "rings") for (let row = 0; row < 2; row++) { const y = g.top + (row ? 0.86 : 0.4) * (g.bot - g.top) + 46 * U; shelf(ctx, W, y, U); }
      for (const tg of targets) drawTarget(ctx, tg, b.id, U, t);
    } else {
      // 지나가는 부스는 장식만
      for (let k = 0; k < 4; k++) emo(ctx, b.icon, W * (0.2 + k * 0.2), g.top + (g.bot - g.top) * (0.35 + (k % 2) * 0.3), 70 * U);
    }
    // 줄무늬 차양(지붕)
    const aw = g.top - 40 * U, sw = 80 * U;
    for (let x = 0, k = 0; x < W + sw; x += sw, k++) {
      ctx.fillStyle = k % 2 ? b.b : b.a;
      ctx.fillRect(x, 0, sw, aw);
      ctx.beginPath(); ctx.arc(x + sw / 2, aw, sw / 2, 0, Math.PI); ctx.fill();
    }
    ctx.fillStyle = "rgba(0,0,0,.18)"; ctx.fillRect(0, aw - 6 * U, W, 6 * U);
    // 부스 간판
    const sw2 = Math.min(W * 0.6, 420 * U), sh = 58 * U, sy = aw + 8 * U;
    ctx.fillStyle = "#fff7e0"; rr(ctx, W / 2 - sw2 / 2, sy, sw2, sh, 16 * U); ctx.fill();
    ctx.lineWidth = 5 * U; ctx.strokeStyle = b.a; ctx.stroke();
    text(ctx, `${b.icon} ${i + 1}. ${b.name}`, W / 2, sy + sh / 2, 30 * U, { color: b.a });
    if (live && stage === "play") {
      const left = 1 - clamp(bt / BOOTH_T, 0, 1);
      ctx.fillStyle = "rgba(0,0,0,.25)"; rr(ctx, W / 2 - sw2 / 2 + 20 * U, sy + sh + 6 * U, sw2 - 40 * U, 10 * U, 5 * U); ctx.fill();
      ctx.fillStyle = left < 0.25 ? "#ff6b6b" : "#ffe14d"; rr(ctx, W / 2 - sw2 / 2 + 20 * U, sy + sh + 6 * U, (sw2 - 40 * U) * left, 10 * U, 5 * U); ctx.fill();
    }
    // 나무 계산대
    gr = ctx.createLinearGradient(0, g.counter, 0, g.counter + 60 * U);
    gr.addColorStop(0, "#d99a5a"); gr.addColorStop(1, "#a8683a");
    ctx.fillStyle = gr; ctx.fillRect(0, g.counter, W, H - g.counter);
    ctx.fillStyle = "#f0c080"; ctx.fillRect(0, g.counter, W, 10 * U);
    for (let x = 0, k = 0; x < W; x += 120 * U, k++) { ctx.fillStyle = k % 2 ? "rgba(0,0,0,.06)" : "rgba(255,255,255,.05)"; ctx.fillRect(x, g.counter + 10 * U, 120 * U, H); }
  }
  return api;
}

function shelf(ctx, W, y, U) {
  ctx.fillStyle = "#8a5a32"; ctx.fillRect(0, y, W, 12 * U);
  ctx.fillStyle = "#b07a48"; ctx.fillRect(0, y, W, 4 * U);
}

function drawTarget(ctx, tg, kind, U, t) {
  const { x, y, rad } = tg;
  if (tg.gone) return;
  ctx.save(); ctx.translate(x, y);
  if (kind === "plates") {
    if (tg.kind === "egg") {
      ctx.fillStyle = "#fff8e6"; ctx.beginPath(); ctx.ellipse(0, 0, rad * 0.78, rad, 0, 0, 7); ctx.fill();
      ctx.strokeStyle = "#e8d6b0"; ctx.lineWidth = 3 * U; ctx.stroke();
      ctx.fillStyle = "#f2c2c8"; [[-8, -10, 6], [9, 6, 5], [-4, 14, 4]].forEach(([a, b, c]) => { ctx.beginPath(); ctx.arc(a * U, b * U, c * U, 0, 7); ctx.fill(); });
      ctx.fillStyle = "rgba(255,255,255,.8)"; ctx.beginPath(); ctx.ellipse(-rad * 0.3, -rad * 0.4, rad * 0.15, rad * 0.25, -0.4, 0, 7); ctx.fill();
    } else {
      const gold = tg.kind === "gold";
      ctx.fillStyle = gold ? "#ffcf33" : "#ffffff"; ctx.beginPath(); ctx.arc(0, 0, rad, 0, 7); ctx.fill();
      ctx.lineWidth = 7 * U; ctx.strokeStyle = gold ? "#e09a00" : tg.c; ctx.stroke();
      ctx.lineWidth = 3 * U; ctx.strokeStyle = gold ? "#fff1a0" : "rgba(0,0,0,.12)"; ctx.beginPath(); ctx.arc(0, 0, rad * 0.62, 0, 7); ctx.stroke();
      if (gold) star(ctx, 0, 0, rad * 0.45, "#fff7c0", "#e09a00", t);
      else { ctx.fillStyle = tg.c; for (let k = 0; k < 6; k++) { const a = k * Math.PI / 3 + tg.ph; ctx.beginPath(); ctx.arc(Math.cos(a) * rad * 0.82, Math.sin(a) * rad * 0.82, 4 * U, 0, 7); ctx.fill(); } }
    }
  } else if (kind === "balloons") {
    ctx.strokeStyle = "rgba(255,255,255,.7)"; ctx.lineWidth = 2 * U;
    ctx.beginPath(); ctx.moveTo(0, rad * 1.12); ctx.quadraticCurveTo(10 * U * Math.sin(t * 3 + tg.ph), rad * 1.6, 0, rad * 2.1); ctx.stroke();
    const gold = tg.kind === "gold";
    const gr = ctx.createRadialGradient(-rad * 0.35, -rad * 0.4, rad * 0.1, 0, 0, rad * 1.1);
    gr.addColorStop(0, gold ? "#fff7c0" : "rgba(255,255,255,.85)"); gr.addColorStop(0.25, gold ? "#ffd23f" : tg.c); gr.addColorStop(1, gold ? "#d99000" : tg.c);
    ctx.fillStyle = gr; ctx.beginPath(); ctx.ellipse(0, 0, rad * 0.88, rad * 1.08, 0, 0, 7); ctx.fill();
    ctx.fillStyle = gold ? "#d99000" : tg.c; ctx.beginPath(); ctx.moveTo(-7 * U, rad * 1.04); ctx.lineTo(7 * U, rad * 1.04); ctx.lineTo(0, rad * 1.16); ctx.fill();
    if (gold) star(ctx, 0, 0, rad * 0.4, "#fff", "#e09a00");
  } else {
    // 병(고리 받침)
    const s = 1 - (tg.pop || 0) * 1.6, h = rad * 1.9;
    ctx.scale(Math.max(0.2, s), Math.max(0.2, s));
    const gold = tg.kind === "gold", c = gold ? "#ffcf33" : tg.c;
    ctx.fillStyle = c; rr(ctx, -rad * 0.55, -h * 0.05, rad * 1.1, h * 0.55, 14 * U); ctx.fill();
    ctx.fillRect(-rad * 0.2, -h * 0.5, rad * 0.4, h * 0.5);
    ctx.fillStyle = "#fff"; rr(ctx, -rad * 0.26, -h * 0.58, rad * 0.52, 12 * U, 5 * U); ctx.fill();
    ctx.fillStyle = "rgba(255,255,255,.4)"; rr(ctx, -rad * 0.4, 0, 10 * U, h * 0.4, 5 * U); ctx.fill();
    ctx.fillStyle = "#fff"; ctx.beginPath(); ctx.arc(0, h * 0.24, rad * 0.26, 0, 7); ctx.fill();
    if (gold) star(ctx, 0, h * 0.24, rad * 0.22, "#ffe14d", "#e09a00"); else { ctx.fillStyle = c; ctx.beginPath(); ctx.arc(0, h * 0.24, rad * 0.12, 0, 7); ctx.fill(); }
    if (tg.ringT >= 0.3) {
      const drop = clamp((tg.ringT - 0.3) / 0.25, 0, 1);
      ctx.strokeStyle = tg.byP ? "#ffd23f" : "#9fe0ff"; ctx.lineWidth = 7 * U;
      ctx.beginPath(); ctx.ellipse(0, -h * 0.45 + drop * h * 0.4, rad * 0.62, rad * 0.22, 0, 0, 7); ctx.stroke();
    }
  }
  ctx.restore();
}

function cannon(ctx, x, y, a, pull, U, col) {
  ctx.save(); ctx.translate(x, y);
  // 받침과 바퀴
  ctx.fillStyle = "#6a4a2a"; rr(ctx, -30 * U, 0, 60 * U, 18 * U, 8 * U); ctx.fill();
  ctx.save(); ctx.rotate(clamp(a, -Math.PI + 0.2, -0.2));
  // 끈 당기기 손잡이
  const back = -30 * U - pull * 80 * U;
  ctx.strokeStyle = "#fff"; ctx.lineWidth = 3 * U; ctx.beginPath(); ctx.moveTo(-20 * U, 0); ctx.lineTo(back, 0); ctx.stroke();
  ctx.strokeStyle = "#ffd23f"; ctx.lineWidth = 5 * U; ctx.beginPath(); ctx.arc(back - 9 * U, 0, 9 * U, 0, 7); ctx.stroke();
  ctx.fillStyle = col; rr(ctx, -22 * U, -15 * U, 82 * U, 30 * U, 14 * U); ctx.fill();
  ctx.fillStyle = "#fff"; ctx.fillRect(10 * U, -15 * U, 9 * U, 30 * U); ctx.fillRect(34 * U, -15 * U, 9 * U, 30 * U);
  ctx.fillStyle = "#3a2a1a"; ctx.beginPath(); ctx.ellipse(60 * U, 0, 6 * U, 13 * U, 0, 0, 7); ctx.fill();
  ctx.restore();
  ctx.fillStyle = "#ffd23f"; ctx.beginPath(); ctx.arc(-16 * U, 18 * U, 12 * U, 0, 7); ctx.arc(16 * U, 18 * U, 12 * U, 0, 7); ctx.fill();
  ctx.fillStyle = "#b07a00"; ctx.beginPath(); ctx.arc(-16 * U, 18 * U, 4 * U, 0, 7); ctx.arc(16 * U, 18 * U, 4 * U, 0, 7); ctx.fill();
  ctx.restore();
}

function car(ctx, g, t, tilt, env, aimP, aimB, pullP, pullB) {
  const { W, H, U } = g;
  ctx.save(); ctx.translate(W / 2, H); ctx.rotate(tilt); ctx.translate(-W / 2, -H);
  const kh = Math.min(W, H) * 0.31;
  upper(ctx, env.kid("cheer", "player"), g.px, g.rim + 6 * U, kh, false);
  upper(ctx, env.kid("cheer", "buddy"), g.bx, g.rim + 6 * U, kh * 0.93, true);
  // 차 몸통
  const cw = Math.min(W * 0.84, 720 * U), cx = W / 2 - cw / 2;
  const gr = ctx.createLinearGradient(0, g.rim, 0, H);
  gr.addColorStop(0, "#ff7a3c"); gr.addColorStop(1, "#d8461f");
  ctx.fillStyle = gr; rr(ctx, cx, g.rim, cw, H - g.rim + 30 * U, 34 * U); ctx.fill();
  ctx.fillStyle = "#ffd23f"; rr(ctx, cx + 16 * U, g.rim + 14 * U, cw - 32 * U, 12 * U, 6 * U); ctx.fill();
  for (let k = 0; k < 7; k++) { ctx.fillStyle = k % 2 ? "#4fb0ff" : "#ffffff"; ctx.beginPath(); ctx.arc(cx + cw * (0.14 + k * 0.12), g.rim + 52 * U, 9 * U, 0, 7); ctx.fill(); }
  const cp = { x: g.px + 58 * U, y: g.rim - 22 * U }, cb = { x: g.bx - 58 * U, y: g.rim - 22 * U };
  cannon(ctx, cp.x, cp.y, aimP, pullP, U, "#ff4f6d");
  cannon(ctx, cb.x, cb.y, aimB, pullB, U, "#4f9fff");
  ctx.restore();
}

function scorePills(ctx, g, env, score, buddy) {
  const { W, U } = g;
  const y = g.counter + 34 * U, w = 210 * U, h = 46 * U;
  [[g.px - 30 * U, env.player, score, "#ff4f6d"], [g.bx + 30 * U, env.buddy, buddy, "#4f9fff"]].forEach(([x, who, s, c]) => {
    const xx = clamp(x - w / 2, 12, W - w - 12);
    ctx.fillStyle = "rgba(255,255,255,.93)"; rr(ctx, xx, y - h / 2, w, h, h / 2); ctx.fill();
    ctx.lineWidth = 4 * U; ctx.strokeStyle = c; ctx.stroke();
    text(ctx, `${NAMES[who] || ""} ${fmt(s)}`, xx + w / 2, y, 25 * U, { color: c });
  });
}

function finalBoard(ctx, g, env, st, score, buddy, maxCombo) {
  const { W, H, U } = g;
  const a = clamp(st / 0.4, 0, 1);
  ctx.fillStyle = `rgba(20,10,40,${0.55 * a})`; ctx.fillRect(0, 0, W, H);
  const pw = Math.min(W - 40, 680 * U), ph = Math.min(H * 0.62, 470 * U), x = W / 2 - pw / 2, y = H * 0.44 - ph / 2;
  ctx.save(); ctx.translate(W / 2, H * 0.44); const s = 0.8 + 0.2 * ease(a); ctx.scale(s, s); ctx.translate(-W / 2, -H * 0.44);
  ctx.globalAlpha = a;
  ctx.fillStyle = "#fff7e8"; rr(ctx, x, y, pw, ph, 30 * U); ctx.fill();
  ctx.lineWidth = 8 * U; ctx.strokeStyle = "#e0344f"; ctx.stroke();
  text(ctx, "🎯 점수판", W / 2, y + 52 * U, 42 * U, { color: "#e0344f" });
  const win = score >= buddy, tie = score === buddy;
  const cols = [[env.player, score, "#ff4f6d", win], [env.buddy, buddy, "#4f9fff", !win || tie]];
  cols.forEach(([who, sc, c, crown], i) => {
    const cx = W / 2 + (i ? 1 : -1) * pw * 0.24, kb = y + ph * 0.66;
    upper(ctx, env.kid("cheer", i ? "buddy" : "player"), cx, kb, ph * 0.5, !!i);
    if (crown && st > 0.9) { emo(ctx, "👑", cx, kb - ph * 0.3 - 6 * U, 46 * U); }
    text(ctx, NAMES[who] || "", cx, kb + 26 * U, 30 * U, { color: c });
    const shown = Math.round(sc * clamp((st - 0.3) / 0.6, 0, 1));
    text(ctx, fmt(shown), cx, kb + 72 * U, 50 * U, { color: "#3a2a3a" });
  });
  text(ctx, "VS", W / 2, y + ph * 0.55, 40 * U, { color: "#7b4bd0" });
  if (st > 0.9) {
    const msg = tie ? "비겼다! 둘 다 최고! 🤝" : win ? `${NAMES[env.player]} 승리! 🏆` : `아깝다! 다음엔 이길 거야 💪`;
    text(ctx, msg, W / 2, y + ph - 34 * U, 32 * U, { color: win ? "#e0344f" : "#5a4a6a" });
    if (maxCombo >= 3) text(ctx, `최고 콤보 ${maxCombo}!`, W / 2, y + 100 * U, 24 * U, { color: "#7b4bd0", weight: 800 });
  }
  ctx.globalAlpha = 1;
  ctx.restore();
}
