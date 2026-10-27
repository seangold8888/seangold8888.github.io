// 디즈니랜드(테마파크): 롤러코스터 별 모으기 + 불꽃놀이 피날레.
// 캐릭터·성·로고는 모두 이 게임만의 것(구름토끼·별곰, 동그란 동화 성 그림).
import { cover, text, star, Particles, Floaters, rng, clamp, rr } from "../engine.js";

const FIRE_COLORS = [["#ff5fa2", "#ffd1e8"], ["#ffd23f", "#fff4b8"], ["#5fd4ff", "#d8f6ff"], ["#9b7bff", "#e2d8ff"], ["#7cf06b", "#e0ffd8"]];

export function create(env) {
  const { sfx } = env;
  const easy = env.easy;
  const fx = new Particles(), fl = new Floaters();
  const u0 = clamp(env.H / 820, 0.75, 1.35);
  const L = 13500 * u0;
  const v0 = (easy ? 700 : 640) * u0, G = 1700 * u0;
  const reach = (easy ? 1.45 : 1.1) * u0;
  let phase = "ride", t = 0, carX = 0, v = 280 * u0, hopY = 0, hopV = 0, got = 0, fireT = 0, launched = 0, done = false, nextAuto = 1, botT = 0;
  const rockets = [];
  const r = rng(11);
  const stars = [];
  for (let x = 800 * u0; x < L - 500 * u0; x += 270 * u0) {
    const p = r();
    if (p < 0.35) stars.push({ x, off: 0, got: false });
    else if (p < 0.68) stars.push({ x, off: (115 + r() * 30) * u0, got: false });
    else { [0, 1, 2].forEach(k => stars.push({ x: x + k * 70 * u0, off: [100, 140, 100][k] * u0, got: false })); x += 80 * u0; }
  }

  const u = () => u0;
  function f(x) {
    const xs = x / u0;
    const k = clamp((xs - 300) / 700, 0, 1) * clamp((L / u0 - xs) / 700, 0, 1);
    return k * (0.55 * Math.sin(xs / 430) + 0.3 * Math.sin(xs / 200 + 1.3) + 0.15 * Math.sin(xs / 105 + 0.4));
  }
  const baseY = () => env.H * 0.68;
  const amp = () => Math.min(env.H * 0.2, 190 * u0);
  const trackY = x => baseY() - amp() * f(x);
  const slope = x => (trackY(x + 4) - trackY(x - 4)) / 8;
  const carScreenX = () => env.W * 0.3;
  const carCenterY = () => trackY(carX) - 44 * u() + hopY;

  function hop() {
    if (phase !== "ride" || hopY < 0 || hopV !== 0) return;
    hopV = -v0; sfx.jump();
  }
  function launch(x, y) {
    rockets.push({ x, y: env.H + 10, tx: x, ty: y, age: 0, c: FIRE_COLORS[launched % FIRE_COLORS.length] });
    launched++; sfx.launch();
  }

  return {
    id: "park",
    update(dt) {
      t += dt;
      if (phase === "ride") {
        const sl = slope(carX);
        const target = (300 + 190 * clamp(sl, -1, 1)) * u();
        v += (target - v) * Math.min(1, dt * 2);
        carX += v * dt;
        if (hopV !== 0 || hopY < 0) {
          hopV += G * dt; hopY += hopV * dt;
          if (hopY >= 0) { hopY = 0; hopV = 0; }
        }
        const cy = carCenterY();
        for (const s of stars) {
          if (s.got) continue;
          const dx = s.x - carX;
          if (dx < -60 * u()) continue;
          if (dx > 80 * u()) break;
          const sy = trackY(s.x) - 44 * u() - s.off;
          if (Math.abs(dx) < 46 * reach && Math.abs(sy - cy) < 54 * reach) {
            s.got = true; got++;
            sfx.star();
            fx.burst(carScreenX() + dx, sy, 10, { color: ["#ffd23f", "#fff"], kind: "star", speed: 220, size: 5, gravity: 300 });
            if (s.off > 0) fl.add("번쩍!", carScreenX() + dx, sy - 40, "#fff36b", 26);
            env.setScore(`⭐ ${got}`);
          }
        }
        if (t < 1) env.setScore(`⭐ ${got}`);
        if (Math.floor(t) === 1 && Math.floor(t - dt) === 0) env.toast("콕 누르면 번쩍 점프! 높은 별도 잡아요 ⭐", 2800);
        if (carX >= L) {
          phase = "fire"; fireT = 0; hopY = 0; hopV = 0;
          env.toast("하늘을 콕! 불꽃을 터뜨려요 🎆", 3000);
          sfx.fanfare();
        }
        env.setProgress(carX / L * 0.75);
      } else {
        fireT += dt;
        if (fireT > nextAuto) { nextAuto += 1.6; launch(env.W * (0.2 + Math.random() * 0.6), env.H * (0.12 + Math.random() * 0.25)); }
        env.setProgress(0.75 + fireT / 14 * 0.25);
        if (fireT > 14 && !done) {
          done = true;
          const ratio = got / stars.length, hi = easy ? 0.6 : 0.75, mid = easy ? 0.35 : 0.45;
          env.finish({ stars: ratio >= hi ? 3 : ratio >= mid ? 2 : 1, text: `별 ${stars.length}개 중 ${got}개! 불꽃 ${launched}개 펑펑 🎆` });
        }
      }
      for (const k of rockets) {
        k.age += dt;
        const p = Math.min(1, k.age / 0.7);
        k.y = env.H + 10 + (k.ty - env.H - 10) * (1 - (1 - p) * (1 - p));
        if (p >= 1 && !k.boom) {
          k.boom = true; sfx.boom();
          fx.burst(k.tx, k.ty, 46, { color: k.c, speed: 300 * u(), size: 4.5, gravity: 90, drag: 1.4, life: 1.5 });
          fx.burst(k.tx, k.ty, 14, { color: ["#fff"], speed: 120 * u(), size: 3, gravity: 60, drag: 1, life: 1.1, kind: "star" });
        }
      }
      for (let i = rockets.length - 1; i >= 0; i--) if (rockets[i].boom) rockets.splice(i, 1);
      fx.update(dt); fl.update(dt);
    },
    down(x, y) {
      if (phase === "ride") hop();
      else if (y < env.H * 0.72 && y > 70) launch(x, y);
    },
    bot(dt) {
      if (phase === "ride") {
        if (hopY < 0 || hopV !== 0) return;
        const tPeak = v0 / G;
        for (const s of stars) {
          if (s.got || s.off < 50) continue;
          const dx = s.x - carX;
          if (dx < 0) continue;
          if (dx / v <= tPeak + 0.02) { hop(); }
          break;
        }
      } else {
        botT += dt;
        if (botT > 0.7) { botT = 0; this.down(env.W * (0.15 + Math.random() * 0.7), env.H * (0.15 + Math.random() * 0.35)); }
      }
    },
    draw(ctx) {
      const W = env.W, H = env.H, U = u();
      const prog = clamp(carX / L, 0, 1);
      cover(ctx, env.img("bg-park"), 0, 0, W, H, 0.15 + 0.7 * prog, 0.42, 1.18);
      if (phase === "fire") {
        const a = Math.min(0.5, fireT / 3);
        ctx.fillStyle = `rgba(20,10,60,${a})`; ctx.fillRect(0, 0, W, H);
      }
      const camX = carX - carScreenX();
      // 받침 기둥
      const step = 120 * U;
      ctx.lineCap = "round";
      for (let wx = Math.floor(camX / step) * step; wx < camX + W + step; wx += step) {
        const x = wx - camX, y = trackY(wx);
        ctx.strokeStyle = "rgba(255,255,255,.6)"; ctx.lineWidth = 5 * U;
        ctx.beginPath(); ctx.moveTo(x, y + 6 * U); ctx.lineTo(x, H + 10); ctx.stroke();
        const y2 = trackY(wx + step);
        ctx.strokeStyle = "rgba(255,190,220,.45)"; ctx.lineWidth = 3 * U;
        ctx.beginPath(); ctx.moveTo(x, y + 30 * U); ctx.lineTo(x + step, Math.min(H, y2 + 90 * U)); ctx.stroke();
      }
      // 레일
      ctx.lineJoin = "round";
      const rail = (off, color, w) => {
        ctx.strokeStyle = color; ctx.lineWidth = w; ctx.beginPath();
        for (let x = -20; x <= W + 20; x += 8) { const y = trackY(camX + x) + off; x === -20 ? ctx.moveTo(x, y) : ctx.lineTo(x, y); }
        ctx.stroke();
      };
      rail(6 * U, "#c2337a", 10 * U);
      rail(0, "#ff6fb0", 9 * U);
      rail(-4 * U, "#fff", 3 * U);
      ctx.strokeStyle = "#7a3b5c"; ctx.lineWidth = 3 * U;
      const tie = 30 * U;
      for (let wx = Math.floor(camX / tie) * tie; wx < camX + W + tie; wx += tie) {
        const x = wx - camX, y = trackY(wx);
        ctx.beginPath(); ctx.moveTo(x, y - 2 * U); ctx.lineTo(x, y + 10 * U); ctx.stroke();
      }
      // 끝 정거장
      const stX = L - camX + 150 * U;
      if (stX < W + 300 * U) station(ctx, stX, trackY(L), U);
      // 별
      for (const s of stars) {
        if (s.got) continue;
        const x = s.x - camX;
        if (x < -40 || x > W + 40) continue;
        const y = trackY(s.x) - 44 * U - s.off + Math.sin(t * 4 + s.x) * 4 * U;
        const glow = ctx.createRadialGradient(x, y, 4, x, y, 40 * U);
        glow.addColorStop(0, "rgba(255,255,220,.95)"); glow.addColorStop(1, "rgba(255,255,200,0)");
        ctx.fillStyle = glow; ctx.beginPath(); ctx.arc(x, y, 40 * U, 0, 7); ctx.fill();
        star(ctx, x, y, (s.off > 0 ? 26 : 22) * U, "#ffe14d", "#d97706", Math.sin(t * 2 + s.x) * 0.2);
      }
      // 코스터 차
      const ang = hopY < 0 ? Math.atan(slope(carX)) * 0.4 : Math.atan(slope(carX));
      const x = carScreenX(), y = trackY(carX) + hopY;
      ctx.save();
      ctx.translate(x, y); ctx.rotate(ang);
      const cheer = hopY < -10 || phase === "fire";
      upper(ctx, env.kid(cheer ? "cheer" : "travel", "buddy"), -44 * U, -56 * U, 150 * U, true);
      upper(ctx, env.kid(cheer ? "cheer" : "travel", "player"), 36 * U, -54 * U, 160 * U, false);
      car(ctx, U);
      ctx.restore();
      // 불꽃
      for (const k of rockets) {
        ctx.fillStyle = k.c[1];
        ctx.beginPath(); ctx.arc(k.tx, k.y, 4 * U, 0, 7); ctx.fill();
        ctx.strokeStyle = "rgba(255,230,180,.6)"; ctx.lineWidth = 3 * U;
        ctx.beginPath(); ctx.moveTo(k.tx, k.y); ctx.lineTo(k.tx, k.y + 30 * U); ctx.stroke();
      }
      fx.draw(ctx);
      if (phase === "fire") {
        // 퍼레이드: 이 게임만의 마스코트 구름토끼와 별곰
        const span = W + 300 * U;
        for (let i = 0; i < 4; i++) {
          const px = ((fireT * 90 * U + i * span / 4) % span) - 150 * U;
          mascot(ctx, i % 2 ? "bear" : "bunny", px, H - 14 * U, U * 0.9, fireT + i);
        }
        text(ctx, `🎆 ${launched}`, W - 70, 112, 34, { color: "#fff", stroke: "rgba(60,20,90,.8)" });
      }
      fl.draw(ctx);
    },
    summary() { return { got, total: stars.length, launched, phase }; },
  };
}

// 아이 그림의 윗부분만(코스터 의자에 앉은 모습)
function upper(ctx, img, x, bottom, h, flip) {
  if (!img) return;
  const frac = 0.56, w = img.width * h / img.height;
  ctx.save();
  ctx.translate(x, bottom);
  if (flip) ctx.scale(-1, 1);
  ctx.drawImage(img, 0, 0, img.width, img.height * frac, -w / 2, -h * frac, w, h * frac);
  ctx.restore();
}

function car(ctx, U) {
  const w = 190 * U, h = 62 * U;
  ctx.fillStyle = "#3b2448";
  [-60, 60].forEach(dx => { ctx.beginPath(); ctx.arc(dx * U, -4 * U, 13 * U, 0, 7); ctx.fill(); });
  const g = ctx.createLinearGradient(0, -h, 0, 0);
  g.addColorStop(0, "#ff8cc6"); g.addColorStop(1, "#e2457f");
  ctx.fillStyle = g;
  rr(ctx, -w / 2, -h - 6 * U, w, h, 22 * U); ctx.fill();
  ctx.lineWidth = 4 * U; ctx.strokeStyle = "#a8295e"; ctx.stroke();
  ctx.fillStyle = "#ffd23f"; ctx.fillRect(-w / 2 + 10 * U, -h + 18 * U, w - 20 * U, 9 * U);
  ctx.fillStyle = "#fff";
  ctx.beginPath(); ctx.arc(w / 2 - 26 * U, -h + 4 * U, 9 * U, 0, 7); ctx.fill();
  star(ctx, 0, -h * 0.42, 16 * U, "#fff36b", "#e88a00");
}

function station(ctx, x, y, U) {
  // 도착 정거장: 줄무늬 차양과 창문이 있는 작은 매표소
  const w = 170 * U, h = 96 * U, top = y - h;
  ctx.fillStyle = "#fff4e0"; ctx.strokeStyle = "#c97a9a"; ctx.lineWidth = 4 * U;
  rr(ctx, x, top, w, h, 12 * U); ctx.fill(); ctx.stroke();
  ctx.fillStyle = "#9fd8f5";
  rr(ctx, x + 18 * U, top + 34 * U, 50 * U, 36 * U, 8 * U); ctx.fill();
  rr(ctx, x + w - 68 * U, top + 34 * U, 50 * U, 36 * U, 8 * U); ctx.fill();
  const n = 7, sw = (w + 24 * U) / n;
  for (let i = 0; i < n; i++) {
    ctx.fillStyle = i % 2 ? "#ffffff" : "#ff7ab6";
    ctx.beginPath(); ctx.moveTo(x - 12 * U + i * sw, top - 28 * U); ctx.lineTo(x - 12 * U + (i + 1) * sw, top - 28 * U);
    ctx.lineTo(x - 12 * U + (i + 1) * sw, top + 6 * U); ctx.arc(x - 12 * U + (i + 0.5) * sw, top + 6 * U, sw / 2, 0, Math.PI); ctx.closePath(); ctx.fill();
  }
  ctx.strokeStyle = "#7a5230"; ctx.lineWidth = 3 * U;
  ctx.beginPath(); ctx.moveTo(x + w / 2, top - 28 * U); ctx.lineTo(x + w / 2, top - 70 * U); ctx.stroke();
  ctx.fillStyle = "#ffd23f"; ctx.beginPath(); ctx.moveTo(x + w / 2, top - 70 * U); ctx.lineTo(x + w / 2 + 30 * U, top - 61 * U); ctx.lineTo(x + w / 2, top - 52 * U); ctx.closePath(); ctx.fill();
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
