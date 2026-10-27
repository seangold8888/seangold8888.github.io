// 베벌리힐스 숙소: 차분한 보물찾기. 그림 속 물건을 찾아 콕 누르면 가방에 쏙.
import { contain, text, emoji, sprite, Particles, Floaters, rr, clamp } from "../engine.js";

// 그림(bg-beverly) 속 실제 물건 위치(0~1). 같은 물건이 두 곳에 있으면 어느 쪽이든 정답.
export const ITEMS = [
  { id: "bear", ko: "곰 인형", en: "teddy bear", icon: "🧸", spots: [[0.646, 0.80, 0.045]] },
  { id: "key", ko: "열쇠", en: "key", icon: "🔑", spots: [[0.552, 0.712, 0.032]] },
  { id: "camera", ko: "카메라", en: "camera", icon: "📷", spots: [[0.946, 0.598, 0.035]] },
  { id: "hat", ko: "모자", en: "hat", icon: "👒", spots: [[0.721, 0.702, 0.045]] },
  { id: "car", ko: "장난감 차", en: "toy car", icon: "🚗", spots: [[0.54, 0.922, 0.04], [0.498, 0.466, 0.03]] },
  { id: "shell", ko: "조개", en: "shell", icon: "🐚", spots: [[0.445, 0.94, 0.032], [0.976, 0.64, 0.025]] },
  { id: "glass", ko: "돋보기", en: "magnifier", icon: "🔍", spots: [[0.642, 0.89, 0.035]] },
  { id: "sun", ko: "선글라스", en: "sunglasses", icon: "🕶️", spots: [[0.624, 0.71, 0.032], [0.728, 0.926, 0.04]] },
  { id: "fruit", ko: "과일", en: "fruit", icon: "🍎", spots: [[0.30, 0.755, 0.05]] },
  { id: "bag", ko: "여행 가방", en: "suitcase", icon: "🧳", spots: [[0.867, 0.745, 0.06]] },
  { id: "flower", ko: "꽃", en: "flowers", icon: "💐", spots: [[0.658, 0.44, 0.035]] },
  { id: "lamp", ko: "전등", en: "lamp", icon: "💡", spots: [[0.904, 0.46, 0.04]] },
];

export function create(env) {
  const { sfx } = env;
  const easy = env.easy;
  const n = easy ? 4 : 6;
  const pool = ITEMS.slice().sort(() => Math.random() - 0.5);
  const list = pool.slice(0, n).map(it => ({ ...it, found: false, foundAt: 0, spot: null }));
  const fx = new Particles(), fl = new Floaters();
  const LIMIT = 120;
  let t = 0, miss = 0, done = false, hint = null, idle = 0, botT = 0, revealed = false, endT = 0;
  const marks = [];
  let soft = null;

  function geo() {
    const W = env.W, H = env.H, img = env.img("bg-beverly");
    const portrait = H > W;
    const trayH = portrait ? 170 : 128;
    const top = 76;
    const R = contain(img, 12, top, W - 24, H - top - trayH - 12);
    return { W, H, R, trayY: H - trayH, trayH, portrait };
  }
  function slotPos(g, i) {
    const startX = g.portrait ? 16 : 150, w = (g.W - startX - 16) / list.length;
    return { x: startX + w * (i + 0.5), y: g.trayY + g.trayH * 0.48, w };
  }
  function find(nx, ny, g) {
    const minR = 30 / g.R.w; // 손가락 크기만큼은 넉넉하게
    for (const it of list) {
      if (it.found) continue;
      for (const sp of it.spots) {
        const rad = Math.max(sp[2] * (easy ? 1.45 : 1.15), minR);
        const dx = nx - sp[0], dy = (ny - sp[1]) * (g.R.h / g.R.w);
        if (dx * dx + dy * dy <= rad * rad) return { it, sp };
      }
    }
    return null;
  }
  function finish() {
    if (done) return;
    done = true;
    const all = list.every(i => i.found);
    const stars = !all ? 1 : miss <= 2 && t <= 60 ? 3 : 2;
    env.finish({ stars, text: all ? `${list.length}개 모두 찾았어요! 가방 완성 🧳 내일은 바다로!` : "시간이 다 됐어요. 남은 물건은 반짝이로 알려 줄게요!" });
  }

  return {
    id: "beverly",
    update(dt) {
      t += dt; idle += dt;
      if (Math.floor(t * 10) === 3 && Math.floor((t - dt) * 10) === 2) env.toast("내일은 바다! 가방에 넣을 물건을 찾아요 🧳", 2800);
      if (!done && (easy ? idle > 10 : idle > 18) && !hint) {
        const left = list.filter(i => !i.found);
        if (left.length) { const it = left[0]; hint = { sp: it.spots[0], age: 0 }; idle = 0; }
      }
      if (hint) { hint.age += dt; if (hint.age > 2.4) hint = null; }
      for (const m of marks) m.age += dt;
      if (!done && t >= LIMIT) { revealed = true; finish(); }
      if (!done && list.every(i => i.found)) { endT += dt; if (endT > 0.8) finish(); }
      fx.update(dt); fl.update(dt);
      env.setProgress(t / LIMIT);
      env.setScore(`🧳 ${list.filter(i => i.found).length}/${list.length}`);
    },
    down(x, y) {
      if (done) return;
      const g = geo();
      // 아래 칸의 힌트 단추
      if (y > g.trayY && x < (g.portrait ? 0 : 140)) return;
      if (x < g.R.ox || x > g.R.ox + g.R.w || y < g.R.oy || y > g.R.oy + g.R.h) return;
      const nx = (x - g.R.ox) / g.R.w, ny = (y - g.R.oy) / g.R.h;
      const hit = find(nx, ny, g);
      idle = 0;
      if (hit) {
        hit.it.found = true; hit.it.foundAt = t; hit.it.spot = hit.sp;
        marks.push({ sp: hit.sp, age: 0 });
        sfx.chime(76 + list.filter(i => i.found).length * 2, 0.2);
        fx.burst(x, y, 16, { color: ["#ffd23f", "#fff", "#ff9ac8"], kind: "star", speed: 240, size: 5, gravity: 200 });
        fl.add(hit.it.ko + "!", x, y - 40, "#fff36b", 30);
        if (hint && hint.sp === hit.it.spots[0]) hint = null;
      } else {
        miss++;
        sfx.wrong();
        fl.add("음… 여기는 아니에요", x, y - 30, "#ffffff", 22);
      }
    },
    bot(dt) {
      botT += dt;
      if (botT < 0.9) return;
      botT = 0;
      const it = list.find(i => !i.found);
      if (!it) return;
      const g = geo(), sp = it.spots[0];
      this.down(g.R.x(sp[0]), g.R.y(sp[1]));
    },
    draw(ctx) {
      const g = geo(), { W, H, R } = g;
      const img = env.img("bg-beverly");
      // 바깥: 흐린 방 + 따뜻한 빛
      ctx.fillStyle = "#f3dcc0"; ctx.fillRect(0, 0, W, H);
      // 흐린 배경: 아주 작게 줄였다가 늘려서 번지게 한다(아이패드 Safari는 ctx.filter가 없을 수 있음)
      if (!soft) { soft = document.createElement("canvas"); soft.width = 48; soft.height = 36; soft.getContext("2d").drawImage(img, 0, 0, 48, 36); }
      ctx.save(); ctx.globalAlpha = 0.45; ctx.imageSmoothingQuality = "high";
      ctx.drawImage(soft, 0, 0, W, H); ctx.restore();
      // 사진 액자
      ctx.fillStyle = "#fff"; rr(ctx, R.ox - 8, R.oy - 8, R.w + 16, R.h + 16, 18); ctx.fill();
      ctx.save(); rr(ctx, R.ox, R.oy, R.w, R.h, 12); ctx.clip();
      ctx.drawImage(img, R.ox, R.oy, R.w, R.h);
      ctx.restore();
      // 찾은 표시
      for (const m of marks) {
        const x = R.x(m.sp[0]), y = R.y(m.sp[1]), rad = Math.max(26, m.sp[2] * R.w * 1.1) * (m.age < 0.25 ? 1.6 - m.age * 2.4 : 1);
        ctx.lineWidth = 6; ctx.strokeStyle = "#ff5f8f"; ctx.beginPath(); ctx.arc(x, y, rad, 0, 7); ctx.stroke();
        ctx.lineWidth = 2; ctx.strokeStyle = "#fff"; ctx.beginPath(); ctx.arc(x, y, rad + 4, 0, 7); ctx.stroke();
      }
      if (revealed) {
        for (const it of list) if (!it.found) { const sp = it.spots[0]; ctx.lineWidth = 5; ctx.strokeStyle = "#ffd23f"; ctx.setLineDash([8, 8]); ctx.beginPath(); ctx.arc(R.x(sp[0]), R.y(sp[1]), 34, 0, 7); ctx.stroke(); ctx.setLineDash([]); }
      }
      if (hint) {
        const k = hint.age, sp = hint.sp;
        const rad = 90 - Math.min(1, k / 1.2) * 45;
        ctx.globalAlpha = 0.85 - Math.max(0, k - 1.8);
        ctx.lineWidth = 5; ctx.strokeStyle = "#fff36b"; ctx.setLineDash([10, 10]);
        ctx.beginPath(); ctx.arc(R.x(sp[0]) + 20, R.y(sp[1]) - 10, rad, 0, 7); ctx.stroke();
        ctx.setLineDash([]); ctx.globalAlpha = 1;
        text(ctx, "💡 이 근처!", R.x(sp[0]) + 20, R.y(sp[1]) - 10 - rad - 20, 24, { color: "#fff", stroke: "#b8860b" });
      }
      fx.draw(ctx);
      // 아래 칸: 찾을 물건 목록
      const grd = ctx.createLinearGradient(0, g.trayY, 0, H);
      grd.addColorStop(0, "#fff7ea"); grd.addColorStop(1, "#ffe6c4");
      ctx.fillStyle = grd; rr(ctx, 8, g.trayY + 4, W - 16, g.trayH - 10, 22); ctx.fill();
      ctx.lineWidth = 3; ctx.strokeStyle = "#f0cf9c"; ctx.stroke();
      if (!g.portrait) {
        sprite(ctx, env.kid("travel"), 54, H - 8, g.trayH * 0.98);
        sprite(ctx, env.kid("travel", "buddy"), 108, H - 8, g.trayH * 0.86, true);
      } else {
        const gap = g.trayY - (R.oy + R.h + 8);
        if (gap > 120) {
          sprite(ctx, env.kid("travel"), W * 0.38, g.trayY - 2, gap - 12);
          sprite(ctx, env.kid("travel", "buddy"), W * 0.62, g.trayY - 2, (gap - 12) * 0.9, true);
        }
      }
      list.forEach((it, i) => {
        const p = slotPos(g, i), sz = Math.min(p.w * 0.5, g.trayH * 0.4);
        ctx.globalAlpha = it.found ? 0.45 : 1;
        emoji(ctx, it.icon, p.x, p.y - sz * 0.25, sz);
        text(ctx, it.ko, p.x, p.y + sz * 0.62, Math.min(20, p.w * 0.17), { color: "#5a3d28" });
        if (!env.easy || env.player === "jaei") text(ctx, it.en, p.x, p.y + sz * 0.62 + 20, 13, { color: "#2f8fd8", weight: 700 });
        ctx.globalAlpha = 1;
        if (it.found) text(ctx, "✔", p.x + sz * 0.5, p.y - sz * 0.7, sz * 0.6, { color: "#22a35a", stroke: "#fff" });
      });
    },
    summary() { return { found: list.filter(i => i.found).length, total: list.length, miss }; },
    // 점검용: 아직 못 찾은 첫 물건의 화면 위치
    where() { const it = list.find(i => !i.found); if (!it) return null; const g = geo(), sp = it.spots[0]; return [g.R.x(sp[0]), g.R.y(sp[1])]; },
  };
}
