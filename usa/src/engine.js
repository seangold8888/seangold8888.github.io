// 미니게임 공용 그리기 도구
export const FONT = '"Pretendard", system-ui, -apple-system, "Apple SD Gothic Neo", sans-serif';
export const EMOJI = '"Apple Color Emoji", "Segoe UI Emoji", "Noto Color Emoji", sans-serif';

const cache = {};
export function loadImage(src) {
  if (cache[src]) return cache[src];
  cache[src] = new Promise(resolve => {
    const im = new Image();
    im.onload = () => resolve(im);
    im.onerror = () => resolve(null);
    im.src = src;
  });
  return cache[src];
}

export const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
export const lerp = (a, b, t) => a + (b - a) * t;

export function rng(seed) {
  let s = seed >>> 0 || 1;
  return () => {
    s = (s + 0x6d2b79f5) >>> 0;
    let t = s;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// 그림을 화면에 꽉 채운다(넘치는 쪽은 잘림). 그림 좌표(0~1) → 화면 좌표 변환을 돌려준다.
export function cover(ctx, img, x, y, w, h, fx = 0.5, fy = 0.5, zoom = 1) {
  const s = Math.max(w / img.width, h / img.height) * zoom;
  const iw = img.width * s, ih = img.height * s;
  const ox = x + (w - iw) * fx, oy = y + (h - ih) * fy;
  ctx.drawImage(img, ox, oy, iw, ih);
  return { s, ox, oy, w: iw, h: ih, x: n => ox + n * iw, y: n => oy + n * ih };
}

// 그림 전체가 보이게 맞춘다.
export function contain(img, x, y, w, h) {
  const s = Math.min(w / img.width, h / img.height);
  const iw = img.width * s, ih = img.height * s;
  const ox = x + (w - iw) / 2, oy = y + (h - ih) / 2;
  return { s, ox, oy, w: iw, h: ih, x: n => ox + n * iw, y: n => oy + n * ih };
}

export function rr(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

export function star(ctx, x, y, r, fill = "#ffd23f", stroke = "#e58e00", rot = 0) {
  ctx.save();
  ctx.translate(x, y); ctx.rotate(rot);
  ctx.beginPath();
  for (let i = 0; i < 10; i++) {
    const a = -Math.PI / 2 + i * Math.PI / 5, rad = i % 2 ? r * 0.48 : r;
    ctx.lineTo(Math.cos(a) * rad, Math.sin(a) * rad);
  }
  ctx.closePath();
  ctx.fillStyle = fill; ctx.fill();
  ctx.lineWidth = Math.max(2, r * 0.14); ctx.strokeStyle = stroke; ctx.lineJoin = "round"; ctx.stroke();
  ctx.beginPath(); ctx.arc(-r * 0.22, -r * 0.2, r * 0.16, 0, 7); ctx.fillStyle = "rgba(255,255,255,.7)"; ctx.fill();
  ctx.restore();
}

export function emoji(ctx, ch, x, y, size) {
  ctx.font = `${Math.round(size)}px ${EMOJI}`;
  ctx.textAlign = "center"; ctx.textBaseline = "middle";
  ctx.fillText(ch, x, y + size * 0.05);
}

export function text(ctx, str, x, y, size, opt = {}) {
  ctx.font = `${opt.weight || 900} ${Math.round(size)}px ${FONT}`;
  ctx.textAlign = opt.align || "center"; ctx.textBaseline = opt.base || "middle";
  if (opt.stroke) { ctx.lineWidth = opt.lw || size * 0.18; ctx.strokeStyle = opt.stroke; ctx.lineJoin = "round"; ctx.strokeText(str, x, y); }
  ctx.fillStyle = opt.color || "#fff";
  ctx.fillText(str, x, y);
}

// 아이 그림: 발(아래 가운데)을 기준으로 높이 h로 그린다.
export function sprite(ctx, img, x, y, h, flip = false, alpha = 1) {
  if (!img) return;
  const w = img.width * h / img.height;
  ctx.save();
  ctx.globalAlpha *= alpha;
  ctx.translate(x, y);
  if (flip) ctx.scale(-1, 1);
  ctx.drawImage(img, -w / 2, -h, w, h);
  ctx.restore();
}

export class Particles {
  constructor() { this.list = []; }
  burst(x, y, n, opt = {}) {
    for (let i = 0; i < n; i++) {
      const a = opt.angle != null ? opt.angle + (Math.random() - 0.5) * (opt.spread || 1) : Math.random() * Math.PI * 2;
      const sp = (opt.speed || 260) * (0.4 + Math.random() * 0.8);
      this.list.push({
        x, y, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp, life: (opt.life || 0.9) * (0.6 + Math.random() * 0.6), age: 0,
        r: (opt.size || 6) * (0.6 + Math.random() * 0.8), color: Array.isArray(opt.color) ? opt.color[i % opt.color.length] : (opt.color || "#fff"),
        g: opt.gravity == null ? 500 : opt.gravity, kind: opt.kind || "dot", drag: opt.drag || 0,
      });
    }
  }
  update(dt) {
    for (const p of this.list) {
      p.age += dt; p.vy += p.g * dt;
      if (p.drag) { p.vx *= 1 - p.drag * dt; p.vy *= 1 - p.drag * dt; }
      p.x += p.vx * dt; p.y += p.vy * dt;
    }
    this.list = this.list.filter(p => p.age < p.life);
  }
  draw(ctx) {
    for (const p of this.list) {
      const k = 1 - p.age / p.life;
      ctx.globalAlpha = Math.min(1, k * 1.5);
      if (p.kind === "star") star(ctx, p.x, p.y, p.r * 1.4, p.color, "rgba(0,0,0,0)", p.age * 6);
      else { ctx.beginPath(); ctx.arc(p.x, p.y, p.r * (0.5 + k * 0.5), 0, 7); ctx.fillStyle = p.color; ctx.fill(); }
    }
    ctx.globalAlpha = 1;
  }
}

// 떠오르는 글자("좋아!" 등)
export class Floaters {
  constructor() { this.list = []; }
  add(str, x, y, color = "#fff", size = 30) { this.list.push({ str, x, y, color, size, age: 0 }); }
  update(dt) { for (const f of this.list) { f.age += dt; f.y -= 50 * dt; } this.list = this.list.filter(f => f.age < 1); }
  draw(ctx) {
    for (const f of this.list) {
      ctx.globalAlpha = Math.min(1, (1 - f.age) * 2);
      text(ctx, f.str, f.x, f.y, f.size * (1 + Math.max(0, 0.2 - f.age)), { color: f.color, stroke: "rgba(40,20,10,.75)" });
    }
    ctx.globalAlpha = 1;
  }
}

// 구름 한 덩이
export function cloud(ctx, x, y, s, alpha = 0.9) {
  ctx.fillStyle = `rgba(255,255,255,${alpha})`;
  ctx.beginPath();
  ctx.arc(x, y, 26 * s, 0, 7); ctx.arc(x + 30 * s, y - 14 * s, 32 * s, 0, 7); ctx.arc(x + 64 * s, y, 24 * s, 0, 7);
  ctx.rect(x, y - 2 * s, 64 * s, 26 * s);
  ctx.fill();
}
