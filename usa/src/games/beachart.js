// 바닷가 두 곳(산타모니카·헌팅턴) 배경을 직접 그린다.
import { cloud, rng } from "../engine.js";

export function sky(ctx, W, H, horizon, t, sunX = 0.14) {
  const g = ctx.createLinearGradient(0, 0, 0, horizon);
  g.addColorStop(0, "#4aa8ec"); g.addColorStop(0.7, "#9fd8fb"); g.addColorStop(1, "#d9f2ff");
  ctx.fillStyle = g; ctx.fillRect(0, 0, W, horizon + 2);
  const sx = W * sunX, sy = Math.min(110, horizon * 0.35), sr = Math.min(48, W * 0.05);
  const sg = ctx.createRadialGradient(sx, sy, sr * 0.5, sx, sy, sr * 3);
  sg.addColorStop(0, "rgba(255,250,200,.9)"); sg.addColorStop(1, "rgba(255,250,200,0)");
  ctx.fillStyle = sg; ctx.fillRect(sx - sr * 3, sy - sr * 3, sr * 6, sr * 6);
  ctx.fillStyle = "#fff6b0"; ctx.beginPath(); ctx.arc(sx, sy, sr, 0, 7); ctx.fill();
  const s = Math.min(1.2, W / 1000);
  [[0.3, 0.32, 1], [0.62, 0.18, 0.8], [0.9, 0.4, 1.1]].forEach(([fx, fy, k], i) => {
    const x = ((fx * W + t * (8 + i * 4)) % (W + 200)) - 100;
    cloud(ctx, x, horizon * fy + 20, s * k);
  });
  // 갈매기
  ctx.strokeStyle = "rgba(60,70,90,.7)"; ctx.lineWidth = 2.5; ctx.lineCap = "round";
  for (let i = 0; i < 3; i++) {
    const x = ((t * (30 + i * 9) + i * 300) % (W + 100)) - 50, y = horizon * (0.3 + i * 0.12) + Math.sin(t * 2 + i) * 6;
    const f = Math.sin(t * 8 + i) * 4;
    ctx.beginPath(); ctx.moveTo(x - 12, y - f); ctx.quadraticCurveTo(x - 6, y - 8, x, y); ctx.quadraticCurveTo(x + 6, y - 8, x + 12, y - f); ctx.stroke();
  }
}

export function palm(ctx, x, y, h, lean = 0.15, t = 0) {
  ctx.strokeStyle = "#8a5a32"; ctx.lineWidth = h * 0.06; ctx.lineCap = "round";
  const tx = x + h * lean, ty = y - h;
  ctx.beginPath(); ctx.moveTo(x, y); ctx.quadraticCurveTo(x + h * lean * 0.2, y - h * 0.6, tx, ty); ctx.stroke();
  ctx.strokeStyle = "#2f9e5a"; ctx.lineWidth = h * 0.045;
  for (let i = 0; i < 7; i++) {
    const a = -Math.PI + i * (Math.PI / 6) + Math.sin(t * 1.5 + i) * 0.05;
    const ex = tx + Math.cos(a) * h * 0.38, ey = ty + Math.sin(a) * h * 0.2 + h * 0.12;
    ctx.beginPath(); ctx.moveTo(tx, ty); ctx.quadraticCurveTo((tx + ex) / 2, ty - h * 0.12, ex, ey); ctx.stroke();
  }
  ctx.fillStyle = "#6b4423"; ctx.beginPath(); ctx.arc(tx, ty + 4, h * 0.035, 0, 7); ctx.fill();
}

export function sandDots(W, H, top, seed = 3) {
  const r = rng(seed), out = [];
  for (let i = 0; i < 220; i++) out.push([r(), r(), r()]);
  return out.map(([a, b, c]) => [a * W, top + b * (H - top), 1 + c * 2.2]);
}

// 산타모니카 부두: 관람차 + 작은 롤러코스터
export function smPier(ctx, W, H, horizon, t) {
  const deckY = horizon + H * 0.05, x0 = W * 0.5, legH = H * 0.07;
  ctx.fillStyle = "#7a5638";
  for (let x = x0; x < W + 20; x += 20) ctx.fillRect(x, deckY, 4, legH);
  ctx.fillStyle = "#a9784f"; ctx.fillRect(x0 - 10, deckY - 8, W - x0 + 20, 10);
  ctx.fillStyle = "#8a6040"; ctx.fillRect(x0 - 10, deckY + 1, W - x0 + 20, 3);
  // 작은 롤러코스터
  const cx0 = W * 0.58, cw = W * 0.12, ch = H * 0.07;
  ctx.strokeStyle = "#e9405e"; ctx.lineWidth = 3;
  ctx.beginPath(); ctx.moveTo(cx0, deckY - 8);
  ctx.bezierCurveTo(cx0 + cw * 0.2, deckY - ch * 1.6, cx0 + cw * 0.4, deckY - ch * 1.4, cx0 + cw * 0.55, deckY - ch * 0.5);
  ctx.bezierCurveTo(cx0 + cw * 0.7, deckY - ch * 0.1, cx0 + cw * 0.85, deckY - ch, cx0 + cw, deckY - 8);
  ctx.stroke();
  ctx.strokeStyle = "rgba(255,255,255,.8)"; ctx.lineWidth = 1.5;
  for (let i = 1; i < 8; i++) { const x = cx0 + cw * i / 8; ctx.beginPath(); ctx.moveTo(x, deckY - 8); ctx.lineTo(x, deckY - ch * (0.4 + 0.5 * Math.sin(i / 8 * Math.PI))); ctx.stroke(); }
  // 관람차
  const R = Math.min(W, H) * 0.13, wx = W * 0.82, wy = deckY - 10 - R * 1.08;
  ctx.strokeStyle = "#f2f2f2"; ctx.lineWidth = 5;
  ctx.beginPath(); ctx.moveTo(wx - R * 0.55, deckY - 8); ctx.lineTo(wx, wy); ctx.lineTo(wx + R * 0.55, deckY - 8); ctx.stroke();
  ctx.lineWidth = 4; ctx.strokeStyle = "#ffd23f"; ctx.beginPath(); ctx.arc(wx, wy, R, 0, 7); ctx.stroke();
  ctx.lineWidth = 1.5; ctx.strokeStyle = "rgba(255,255,255,.9)";
  const rot = t * 0.25, colors = ["#ff5f8f", "#4fc3f7", "#7cd96b", "#ffb347", "#b38cff", "#ff6b6b", "#40d0c0", "#ffe14d"];
  for (let i = 0; i < 16; i++) { const a = rot + i * Math.PI / 8; ctx.beginPath(); ctx.moveTo(wx, wy); ctx.lineTo(wx + Math.cos(a) * R, wy + Math.sin(a) * R); ctx.stroke(); }
  for (let i = 0; i < 8; i++) {
    const a = rot + i * Math.PI / 4, gx = wx + Math.cos(a) * R, gy = wy + Math.sin(a) * R;
    ctx.fillStyle = colors[i]; ctx.beginPath(); ctx.roundRect ? ctx.roundRect(gx - 7, gy, 14, 13, 4) : ctx.rect(gx - 7, gy, 14, 13); ctx.fill();
  }
  ctx.fillStyle = "#fff"; ctx.beginPath(); ctx.arc(wx, wy, 6, 0, 7); ctx.fill();
}

// 헌팅턴 부두: 아주 긴 콘크리트 부두와 끝의 빨간 지붕 카페
export function htPier(ctx, W, H, horizon, scroll) {
  const deckY = horizon + H * 0.035, legH = H * 0.045, len = W * 1.6;
  const x0 = -((scroll * 0.06) % (W * 0.6)) - W * 0.1;
  ctx.fillStyle = "#c9c2b6";
  for (let x = x0; x < x0 + len; x += 26) ctx.fillRect(x, deckY, 5, legH);
  ctx.fillStyle = "#e6e0d4"; ctx.fillRect(x0, deckY - 7, len, 8);
  ctx.fillStyle = "#b5ad9f"; ctx.fillRect(x0, deckY, len, 2);
  ctx.strokeStyle = "#9a9284"; ctx.lineWidth = 1;
  for (let x = x0; x < x0 + len; x += 12) { ctx.beginPath(); ctx.moveTo(x, deckY - 7); ctx.lineTo(x, deckY - 14); ctx.stroke(); }
  ctx.beginPath(); ctx.moveTo(x0, deckY - 14); ctx.lineTo(x0 + len, deckY - 14); ctx.stroke();
  const cx = x0 + len - 10;
  ctx.fillStyle = "#fff3e0"; ctx.fillRect(cx - 50, deckY - 34, 50, 27);
  ctx.fillStyle = "#d9433b"; ctx.beginPath(); ctx.moveTo(cx - 56, deckY - 32); ctx.lineTo(cx - 25, deckY - 50); ctx.lineTo(cx + 6, deckY - 32); ctx.closePath(); ctx.fill();
  ctx.fillStyle = "#7ab8d8"; ctx.fillRect(cx - 42, deckY - 26, 10, 9); ctx.fillRect(cx - 20, deckY - 26, 10, 9);
}

export function hills(ctx, W, horizon, seed = 9) {
  const r = rng(seed);
  ctx.fillStyle = "#9cb9cf";
  ctx.beginPath(); ctx.moveTo(0, horizon);
  for (let x = 0; x <= W; x += W / 8) ctx.lineTo(x, horizon - 18 - r() * 30);
  ctx.lineTo(W, horizon); ctx.closePath(); ctx.fill();
  // 바닷가 집들
  for (let i = 0; i < 14; i++) {
    const x = (i / 14) * W + r() * 20, w = 18 + r() * 16, h = 10 + r() * 12;
    ctx.fillStyle = ["#fff4e6", "#ffe0d0", "#e6f4ff", "#fff9c9"][i % 4];
    ctx.fillRect(x, horizon - h, w, h);
    ctx.fillStyle = ["#e07a5f", "#7aa6c2", "#d9a05b"][i % 3];
    ctx.fillRect(x - 2, horizon - h - 4, w + 4, 5);
  }
}
