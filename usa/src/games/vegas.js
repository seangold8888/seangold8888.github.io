// 라스베이거스: 분수쇼 리듬. 떨어지는 물방울이 동그라미에 닿을 때 콕 누르면 분수가 솟는다.
import { cover, text, sprite, Particles, Floaters, rng, clamp, emoji } from "../engine.js";

const BPM = 100, BEAT = 60 / BPM;
const CHORDS = [[60, 64, 67], [55, 59, 62], [57, 60, 64], [53, 57, 60]]; // C G Am F
const BASS = [36, 31, 33, 29];
const COLORS = ["#ff6fb5", "#ffd23f", "#4fd1ff", "#7cf06b"];

export function create(env) {
  const { sfx } = env;
  const easy = env.easy, lanes = easy ? 3 : 4;
  const travel = easy ? 2.4 : 1.9;
  const good = easy ? 0.3 : 0.2, perfect = easy ? 0.12 : 0.08;
  const BARS = 24;
  const r = rng(77);
  const notes = [];
  let lane = 1;
  for (let bar = 1; bar <= BARS; bar++) {
    const beats = easy ? (bar > 12 ? [0, 2, 3] : [0, 2]) : (bar > 16 ? [0, 1, 2, 2.5, 3] : bar > 4 ? [0, 1, 2, 3] : [0, 2]);
    for (const b of beats) {
      if (!easy && bar % 4 === 0 && b === 3) continue;
      const step = [-1, 1, 1, -1, 0, 2, -2][Math.floor(r() * 7)];
      lane = ((lane + step) % lanes + lanes) % lanes;
      notes.push({ t: (bar * 4 + b) * BEAT, lane, bar, state: 0, age: 0 });
    }
  }
  const endT = notes[notes.length - 1].t + 1.2;
  const jets = Array.from({ length: lanes }, () => ({ power: 0, age: 9 }));
  const fx = new Particles(), fl = new Floaters();
  let t = 0, eighth = -1, hits = 0, combo = 0, finale = 0, done = false, hinted = false;

  function geo() {
    const W = env.W, H = env.H, bg = env.img("bg-vegas");
    const s = Math.max(W / bg.width, H / bg.height), ih = bg.height * s;
    const oy = (H - ih) * 0.8;
    const ringY = clamp(oy + 0.745 * ih, H * 0.55, H - 120);
    const fieldW = Math.min(W * 0.9, 760);
    const laneX = i => W / 2 + (i - (lanes - 1) / 2) * fieldW / lanes;
    return { W, H, ringY, fieldW, laneX, topY: 96, rad: easy ? 34 : 30 };
  }

  function fire(i, power) {
    jets[i].power = power; jets[i].age = 0;
  }

  function judge(i) {
    let best = null;
    for (const n of notes) if (n.state === 0 && n.lane === i && Math.abs(n.t - t) <= good && (!best || Math.abs(n.t - t) < Math.abs(best.t - t))) best = n;
    const g = geo();
    if (!best) { fire(i, 0.25); sfx.tap(); return; }
    best.state = 1;
    const perfectHit = Math.abs(best.t - t) <= perfect;
    hits++; combo++;
    fire(i, perfectHit ? 1 : 0.78);
    const ch = CHORDS[best.bar % 4];
    sfx.chime((i === 3 ? ch[0] + 12 : ch[i]) + 12, 0.22);
    fx.burst(g.laneX(i), g.ringY, 14, { color: [COLORS[i], "#fff"], speed: 280, size: 6, gravity: 600, angle: -Math.PI / 2, spread: 1.6 });
    fl.add(perfectHit ? "최고!" : "좋아!", g.laneX(i), g.ringY - 70, perfectHit ? "#fff36b" : "#ffffff", 30);
    if (combo > 0 && combo % 10 === 0) { fl.add(`${combo} 연속! 🎉`, g.W / 2, g.H * 0.3, "#ffd23f", 40); sfx.star(); }
    env.setScore(`💧 ${hits}`);
  }

  function music() {
    const e = Math.floor(t / (BEAT / 2));
    if (e === eighth || t < 0) return;
    eighth = e;
    const bar = Math.floor(e / 8), inBar = e % 8;
    if (bar > BARS + 1) return;
    if (bar === BARS + 1) { if (inBar === 0) { sfx.pad([60, 64, 67, 72], 2.5); sfx.bass(36, 2); } return; }
    if (inBar % 2 === 0) { if (inBar === 0 || inBar === 4 || bar > 8) sfx.kick(); }
    else sfx.hat();
    if (inBar === 0) { sfx.pad(CHORDS[bar % 4].map(m => m + 12), BEAT * 4); sfx.bass(BASS[bar % 4], BEAT * 1.8); }
    if (inBar === 4) sfx.bass(BASS[bar % 4] + 7, BEAT * 1.5);
  }

  return {
    id: "vegas",
    update(dt) {
      t += dt;
      music();
      const g = geo();
      if (!hinted && t > 0.2) { hinted = true; env.toast("물방울이 동그라미에 오면 콕! 👆", 2600); }
      for (const n of notes) {
        if (n.state === 0 && t - n.t > good) { n.state = 2; combo = 0; }
        if (n.state) n.age += dt;
      }
      jets.forEach((j, i) => {
        j.age += dt;
        if (j.age < 0.8 && j.power > 0.3 && Math.random() < 0.7) {
          const h = jetHeight(j, g);
          fx.burst(g.laneX(i) + (Math.random() - 0.5) * 16, g.ringY - h, 1, { color: [COLORS[i], "#fff", "#e8f7ff"], speed: 140, size: 5, gravity: 520, angle: -Math.PI / 2, spread: 2.4, life: 0.9 });
        }
      });
      if (t > endT) {
        finale += dt;
        if (Math.floor(finale / 0.22) !== Math.floor((finale - dt) / 0.22)) { const i = Math.floor(Math.random() * lanes); fire(i, 1); sfx.chime([72, 76, 79, 84][i], 0.12); }
        if (finale > 3 && !done) {
          done = true;
          const ratio = hits / notes.length;
          env.finish({ stars: ratio >= 0.8 ? 3 : ratio >= 0.55 ? 2 : 1, text: `물방울 ${notes.length}개 중 ${hits}개를 맞췄어요! 분수쇼 대성공 ⛲` });
        }
      }
      fx.update(dt); fl.update(dt);
      env.setProgress(t / (endT + 3));
    },
    down(x) {
      const g = geo();
      let best = 0, bd = 1e9;
      for (let i = 0; i < lanes; i++) { const d = Math.abs(x - g.laneX(i)); if (d < bd) { bd = d; best = i; } }
      if (t <= endT) judge(best);
    },
    bot() {
      const g = geo();
      for (const n of notes) if (n.state === 0 && t >= n.t - 0.012) { this.down(g.laneX(n.lane)); break; }
    },
    draw(ctx) {
      const g = geo(), { W, H } = g;
      cover(ctx, env.img("bg-vegas"), 0, 0, W, H, 0.5, 0.8);
      // 은은한 조명 반짝임
      const pulse = 0.5 + 0.5 * Math.cos((t % BEAT) / BEAT * Math.PI * 2);
      ctx.fillStyle = `rgba(30,10,60,${0.18 - pulse * 0.06})`; ctx.fillRect(0, 0, W, H);
      // 레인 안내선
      for (let i = 0; i < lanes; i++) {
        const x = g.laneX(i);
        const grd = ctx.createLinearGradient(0, g.topY, 0, g.ringY);
        grd.addColorStop(0, "rgba(255,255,255,0)"); grd.addColorStop(1, hexA(COLORS[i], 0.28));
        ctx.fillStyle = grd; ctx.fillRect(x - 3, g.topY, 6, g.ringY - g.topY);
      }
      // 분수 물줄기
      jets.forEach((j, i) => {
        const h = jetHeight(j, g);
        if (h < 4) return;
        const x = g.laneX(i), w = 22 + j.power * 14;
        const grd = ctx.createLinearGradient(0, g.ringY - h, 0, g.ringY);
        grd.addColorStop(0, "rgba(255,255,255,0.15)"); grd.addColorStop(0.25, hexA(COLORS[i], 0.75)); grd.addColorStop(1, "rgba(235,250,255,0.95)");
        ctx.fillStyle = grd;
        ctx.beginPath();
        ctx.moveTo(x - w / 2, g.ringY); ctx.quadraticCurveTo(x - w * 0.2, g.ringY - h * 0.6, x - 4, g.ringY - h);
        ctx.lineTo(x + 4, g.ringY - h); ctx.quadraticCurveTo(x + w * 0.2, g.ringY - h * 0.6, x + w / 2, g.ringY);
        ctx.fill();
        ctx.beginPath(); ctx.arc(x, g.ringY - h, 12 + j.power * 8, 0, 7); ctx.fillStyle = hexA(COLORS[i], 0.45); ctx.fill();
      });
      // 동그라미(분수 구멍)
      for (let i = 0; i < lanes; i++) {
        const x = g.laneX(i);
        let near = 0;
        for (const n of notes) if (n.state === 0 && n.lane === i) { near = Math.max(near, 1 - Math.abs(n.t - t) / 0.6); }
        ctx.beginPath(); ctx.ellipse(x, g.ringY + 10, g.rad * 1.5, g.rad * 0.5, 0, 0, 7); ctx.fillStyle = "rgba(20,20,50,.55)"; ctx.fill();
        ctx.lineWidth = 6 + near * 4; ctx.strokeStyle = hexA(COLORS[i], 0.55 + near * 0.45);
        ctx.beginPath(); ctx.arc(x, g.ringY, g.rad + 6, 0, 7); ctx.stroke();
        ctx.lineWidth = 2; ctx.strokeStyle = "rgba(255,255,255,.8)";
        ctx.beginPath(); ctx.arc(x, g.ringY, g.rad + 6, 0, 7); ctx.stroke();
      }
      // 떨어지는 물방울
      for (const n of notes) {
        const dtn = n.t - t;
        if (n.state === 0 && dtn < travel && dtn > -good) {
          const y = g.ringY - dtn / travel * (g.ringY - g.topY);
          orb(ctx, g.laneX(n.lane), y, g.rad, COLORS[n.lane], t);
        } else if (n.state === 2 && n.age < 0.4) {
          ctx.globalAlpha = 1 - n.age / 0.4;
          orb(ctx, g.laneX(n.lane), g.ringY + n.age * 60, g.rad * (1 - n.age), "#8899aa", t);
          ctx.globalAlpha = 1;
        }
      }
      // 첫 물방울 손가락 안내
      const first = notes.find(n => n.state === 0);
      if (first && notes.indexOf(first) < 2) {
        const bob = Math.sin(t * 8) * 8;
        emoji(ctx, "👆", g.laneX(first.lane) + 34, g.ringY + 44 + bob, 44);
      }
      fx.draw(ctx);
      // 구경하는 아이들
      const cheer = combo >= 5 || finale > 0;
      const side = (W - g.fieldW) / 2;
      const kh = side > 150 ? Math.min(H * 0.32, 280) : Math.min(H * 0.2, H - g.ringY - 40);
      const kx = side > 150 ? side / 2 : W * 0.1;
      const by = H - 6 + (cheer ? -Math.abs(Math.sin(t * 6)) * 14 : 0);
      sprite(ctx, env.kid(cheer ? "cheer" : "travel", "player"), kx, by, kh);
      sprite(ctx, env.kid(cheer ? "cheer" : "travel", "buddy"), W - kx, by, kh * 0.9, true);
      fl.draw(ctx);
      if (finale > 0) text(ctx, "분수쇼 피날레! ✨", W / 2, H * 0.22, 46, { color: "#fff36b", stroke: "#5b2a86" });
    },
    summary() { return { hits, total: notes.length, lanes }; },
  };
}

function jetHeight(j, g) {
  const rise = Math.min(1, j.age / 0.14), fall = Math.max(0, 1 - Math.max(0, j.age - 0.25) / 0.9);
  return j.power * (g.ringY - g.topY - 20) * rise * fall;
}

function orb(ctx, x, y, r, color, t) {
  const grd = ctx.createRadialGradient(x - r * 0.3, y - r * 0.3, 2, x, y, r * 1.6);
  grd.addColorStop(0, "#ffffff"); grd.addColorStop(0.35, color); grd.addColorStop(1, hexA(color, 0));
  ctx.fillStyle = grd;
  ctx.beginPath(); ctx.arc(x, y, r * 1.6, 0, 7); ctx.fill();
  ctx.beginPath(); ctx.arc(x, y, r * 0.8, 0, 7); ctx.fillStyle = hexA(color, 0.9); ctx.fill();
  ctx.beginPath(); ctx.arc(x - r * 0.28, y - r * 0.3, r * 0.25, 0, 7); ctx.fillStyle = "rgba(255,255,255,.9)"; ctx.fill();
  const tw = 0.5 + 0.5 * Math.sin(t * 10 + x);
  ctx.strokeStyle = `rgba(255,255,255,${tw})`; ctx.lineWidth = 2;
  ctx.beginPath(); ctx.moveTo(x + r, y - r * 1.1); ctx.lineTo(x + r, y - r * 0.5); ctx.moveTo(x + r * 0.7, y - r * 0.8); ctx.lineTo(x + r * 1.3, y - r * 0.8); ctx.stroke();
}

export function hexA(hex, a) {
  const n = parseInt(hex.slice(1), 16);
  return `rgba(${n >> 16},${(n >> 8) & 255},${n & 255},${a})`;
}
