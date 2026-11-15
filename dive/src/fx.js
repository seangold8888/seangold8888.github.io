// 딥 다이브 화려한 효과 묶음(그리기 전용 — 게임 규칙·시뮬레이션과 무관).
// 모든 입자·충격파는 미리 만든 칸(typed array)을 돌려 쓴다: 매 프레임 새 객체를 만들지 않는다.
// shadowBlur·filter 없음. 빛나는 것은 미리 그린 빛무리 그림 + 'lighter' 합성, 물방울은 진한 색으로 보통 합성(밝은 바다에서도 보이게).
// 상한: 반짝 입자 SPARK_MAX, 충격파 SHOCK_MAX, 바탕 거품 AMB_MAX. quality(0.35~1)가 낮으면 새로 만드는 입자 수를 줄인다.

const TAU = Math.PI * 2;
export const SPARK_MAX = 800, SHOCK_MAX = 64, AMB_MAX = 34;
// 색 번호: 0 흰 · 1 하늘 · 2 파랑 · 3 금 · 4 보라 · 5 민트 · 6 분홍 · 7 주황 · 8 진파랑 · 9 빨강분홍 · 10 노랑 · 11 연보라
export const COL = ["#ffffff", "#bff3ff", "#5fd2ff", "#ffd75a", "#b48cff", "#6dffad", "#ff8fd8", "#ffa53c", "#3f7dff", "#ff6f96", "#fff06a", "#d9a8ff"];
// 같은 색의 진하고 짙은 테두리(밝은 바다 위에서도 물방울이 떠 보이지 않고 또렷하게)
const DARK = ["#3fb6f0", "#1f9bd0", "#1567c0", "#d08a10", "#6a3fd0", "#12b06a", "#d03a98", "#d0600a", "#1a3aa0", "#c02a5a", "#c89a08", "#8a50d0"];
// 크기 섞기: 큰 것 10% · 중간 30% · 작은 것 60%
const sizeMix = s => { const r = Math.random(); return r < 0.1 ? s * (1.7 + Math.random() * 0.5) : r < 0.4 ? s * (1.0 + Math.random() * 0.3) : s * (0.5 + Math.random() * 0.3); };
const RGB = COL.map(h => { const n = parseInt(h.slice(1), 16); return ((n >> 16) & 255) + "," + ((n >> 8) & 255) + "," + (n & 255); });
export const RAINBOW_IDX = [9, 7, 10, 5, 2, 4];
// 파스텔 무지개(평소 고리용): 분홍 · 금 · 노랑 · 민트 · 하늘 · 연보라
const PASTEL = [6, 3, 10, 5, 1, 11];
const NC = COL.length;

let quality = 1;
export const setQuality = q => { quality = Math.max(0.35, Math.min(1, q)); };
export const getQuality = () => quality;
// 좁은 화면(폰)에서는 퍼지는 넓이를 줄인다(꾸밈만): 충격파 반지름·입자 속도에 곱한다
let AREA = 1;
export const setArea = a => { AREA = a; };
// 만들 개수 n 을 품질에 맞게(최소 1)
export const qn = n => Math.max(1, Math.round(n * quality));

function canvasOf(w, h, draw) { const c = document.createElement("canvas"); c.width = w; c.height = h; draw(c.getContext("2d"), w, h); return c; }
// 빛무리(가운데가 하얗게 타는 원) — 색마다 하나씩, 처음 쓸 때 만든다
const GLOW = new Array(NC).fill(null);
export function glowTex(c) {
  c = (((c | 0) % NC) + NC) % NC;
  if (GLOW[c]) return GLOW[c];
  GLOW[c] = canvasOf(64, 64, (x, w) => {
    const g = x.createRadialGradient(w / 2, w / 2, 0, w / 2, w / 2, w / 2);
    g.addColorStop(0, "rgba(255,255,255,1)"); g.addColorStop(0.18, "rgba(" + RGB[c] + ",.95)"); g.addColorStop(0.45, "rgba(" + RGB[c] + ",.35)"); g.addColorStop(1, "rgba(" + RGB[c] + ",0)");
    x.fillStyle = g; x.fillRect(0, 0, w, w);
  });
  return GLOW[c];
}
// 부드러운 물결 고리: 안은 비고 → 진한 색 → 하얀 앞머리 → 색 → 사라짐(납작한 선 대신 두께와 빛이 있는 고리)
const SOFT = new Array(NC).fill(null);
export function softRing(c) {
  c = (((c | 0) % NC) + NC) % NC;
  if (SOFT[c]) return SOFT[c];
  SOFT[c] = canvasOf(256, 256, (x, w) => {
    const m = w / 2, g = x.createRadialGradient(m, m, 0, m, m, m);
    const d = DARK[c].slice(1), n = parseInt(d, 16), dk = ((n >> 16) & 255) + "," + ((n >> 8) & 255) + "," + (n & 255);
    g.addColorStop(0, "rgba(" + RGB[c] + ",0)"); g.addColorStop(0.55, "rgba(" + RGB[c] + ",0)"); g.addColorStop(0.74, "rgba(" + dk + ",.35)");
    g.addColorStop(0.86, "rgba(" + RGB[c] + ",.85)"); g.addColorStop(0.91, "rgba(255,255,255,1)"); g.addColorStop(0.95, "rgba(" + RGB[c] + ",.7)"); g.addColorStop(1, "rgba(" + RGB[c] + ",0)");
    x.fillStyle = g; x.fillRect(0, 0, w, w);
  });
  return SOFT[c];
}
// 빛살 쐐기(신의 빛줄기처럼 넓게 퍼지는 빛 — 필살기·끝 장면에서 천천히 돈다)
export const RAYTEX = canvasOf(256, 64, (x, w, h) => {
  const g = x.createLinearGradient(0, 0, w, 0); g.addColorStop(0, "rgba(255,255,255,.95)"); g.addColorStop(0.35, "rgba(200,250,255,.45)"); g.addColorStop(1, "rgba(150,230,255,0)");
  x.fillStyle = g; x.beginPath(); x.moveTo(0, h / 2 - 3); x.lineTo(w, 0); x.lineTo(w, h); x.lineTo(0, h / 2 + 3); x.closePath(); x.fill();
});
// 물방울(테두리 없음): 밝은 심 → 색 몸 → 투명
const DROP = new Array(NC).fill(null);
function dropTex(c) {
  if (DROP[c]) return DROP[c];
  DROP[c] = canvasOf(32, 32, (x, w) => { const g = x.createRadialGradient(w * 0.42, w * 0.4, 0, w / 2, w / 2, w / 2); g.addColorStop(0, "rgba(255,255,255,.95)"); g.addColorStop(0.3, "rgba(" + RGB[c] + ",.9)"); g.addColorStop(0.7, "rgba(" + RGB[c] + ",.45)"); g.addColorStop(1, "rgba(" + RGB[c] + ",0)"); x.fillStyle = g; x.fillRect(0, 0, w, w); });
  return DROP[c];
}
const INKDOT = canvasOf(32, 32, (x, w) => { const g = x.createRadialGradient(w / 2, w / 2, 0, w / 2, w / 2, w / 2); g.addColorStop(0, "rgba(90,60,170,.9)"); g.addColorStop(0.55, "rgba(49,27,146,.6)"); g.addColorStop(1, "rgba(49,27,146,0)"); x.fillStyle = g; x.fillRect(0, 0, w, w); });
// 반짝 별(네 갈래 빛) — 색마다
const TWINK = new Array(NC).fill(null);
function twinkTex(c) {
  if (TWINK[c]) return TWINK[c];
  TWINK[c] = canvasOf(64, 64, (x, w) => {
    const m = w / 2;
    const g = x.createRadialGradient(m, m, 0, m, m, m * 0.5); g.addColorStop(0, "rgba(255,255,255,1)"); g.addColorStop(1, "rgba(" + RGB[c] + ",0)");
    x.fillStyle = g; x.fillRect(0, 0, w, w);
    x.fillStyle = "rgba(255,255,255,.95)";
    x.beginPath(); x.moveTo(m, 0); x.quadraticCurveTo(m + 3, m - 3, w, m); x.quadraticCurveTo(m + 3, m + 3, m, w); x.quadraticCurveTo(m - 3, m + 3, 0, m); x.quadraticCurveTo(m - 3, m - 3, m, 0); x.fill();
    x.globalCompositeOperation = "source-atop"; x.fillStyle = "rgba(" + RGB[c] + ",.55)"; x.fillRect(0, 0, w, w);
  });
  return TWINK[c];
}

/* ---------- 반짝 입자 ----------
   type 0 빛 점(빛무리, lighter) · 1 빛 줄(속도 방향 꼬리, lighter) · 2 반짝 별(lighter) · 3 거품 고리(보통) · 4 물방울(진한 색, 보통) · 5 물줄기(보통, 진한 꼬리) */
const sx = new Float32Array(SPARK_MAX), sy = new Float32Array(SPARK_MAX), svx = new Float32Array(SPARK_MAX), svy = new Float32Array(SPARK_MAX);
const st = new Float32Array(SPARK_MAX), sl = new Float32Array(SPARK_MAX), ss = new Float32Array(SPARK_MAX), sg = new Float32Array(SPARK_MAX), sd = new Float32Array(SPARK_MAX), sr = new Float32Array(SPARK_MAX);
const sty = new Uint8Array(SPARK_MAX), sc = new Uint8Array(SPARK_MAX), son = new Uint8Array(SPARK_MAX);
let head = 0, live = 0;
export const sparkCount = () => live;
export function clearAll() { son.fill(0); live = 0; for (let i = 0; i < SHOCK_MAX; i++) kon[i] = 0; }
export function spark(x, y, vx, vy, life, size, col, type = 0, grav = 0, drag = 2.4) {
  // 품질이 낮으면 동시에 살아 있는 수도 줄인다(가득 차면 새것을 건너뜀)
  if (quality < 1 && live >= SPARK_MAX * quality) return;
  const i = head; head = (head + 1) % SPARK_MAX;
  if (!son[i]) live++;
  son[i] = 1; sx[i] = x; sy[i] = y; svx[i] = vx; svy[i] = vy; st[i] = 0; sl[i] = life; ss[i] = size;
  sc[i] = col < 0 ? RAINBOW_IDX[(Math.random() * 6) | 0] : col; sty[i] = type; sg[i] = grav; sd[i] = drag; sr[i] = Math.random() * TAU;
}
// 사방으로 n 개
export function radial(x, y, n, spd, col, type = 0, life = 0.5, size = 4, grav = 0, drag = 2.4) {
  n = qn(n); spd *= AREA;
  for (let k = 0; k < n; k++) {
    const a = Math.random() * TAU, v = spd * (0.35 + Math.random() * 0.8);
    spark(x, y, Math.cos(a) * v, Math.sin(a) * v, life * (0.7 + Math.random() * 0.6), sizeMix(size), col, type, grav, drag);
  }
}
// ang 쪽으로 spread 폭 안에
export function cone(x, y, ang, spread, n, spd, col, type = 1, life = 0.4, size = 3, grav = 0, drag = 2.4) {
  n = qn(n); spd *= AREA;
  for (let k = 0; k < n; k++) {
    const a = ang + (Math.random() - 0.5) * spread, v = spd * (0.45 + Math.random() * 0.7);
    spark(x, y, Math.cos(a) * v, Math.sin(a) * v, life * (0.7 + Math.random() * 0.6), sizeMix(size), col, type, grav, drag);
  }
}
// 둥근 테두리에서 바깥으로(충격파 가장자리 반짝이)
export function ringOut(x, y, n, R, spd, col, type = 2, life = 0.5, size = 5) {
  n = qn(n); spd *= AREA; R *= AREA;
  for (let k = 0; k < n; k++) { const a = k / n * TAU + Math.random() * 0.3, v = spd * (0.6 + Math.random() * 0.6); spark(x + Math.cos(a) * R, y + Math.sin(a) * R, Math.cos(a) * v, Math.sin(a) * v, life * (0.7 + Math.random() * 0.6), size * (0.7 + Math.random() * 0.6), col, type, 0, 2); }
}
// 한 점으로 빨려 들어오는 입자(모으기)
export function implode(x, y, n, R, col, type = 1, life = 0.45, size = 3) {
  n = qn(n);
  for (let k = 0; k < n; k++) { const a = Math.random() * TAU, r = R * (0.6 + Math.random() * 0.5), v = r / life; spark(x + Math.cos(a) * r, y + Math.sin(a) * r, -Math.cos(a) * v, -Math.sin(a) * v, life, size * (0.7 + Math.random() * 0.6), col, type, 0, 0); }
}
export function stepSparks(dt) {
  live = 0;
  for (let i = 0; i < SPARK_MAX; i++) {
    if (!son[i]) continue;
    st[i] += dt; if (st[i] >= sl[i]) { son[i] = 0; continue; }
    const dr = Math.max(0, 1 - dt * sd[i]);
    svx[i] *= dr; svy[i] = svy[i] * dr + sg[i] * dt;
    sx[i] += svx[i] * dt; sy[i] += svy[i] * dt; live++;
  }
}
// 화면(월드 좌표) 안의 것만. 한 번 훑어 (모양·색)별로 묶은 뒤(계수 정렬, 새 배열 없음) 보통 합성 → lighter 순서로 그린다.
const NK = 7 * NC, KCNT = new Int16Array(NK + 1), KPOS = new Int16Array(NK + 1), ORD = new Int16Array(SPARK_MAX);
export function drawSparks(ctx, x0, y0, x1, y1) {
  if (!live) return;
  KCNT.fill(0);
  for (let i = 0; i < SPARK_MAX; i++) { if (!son[i]) continue; const x = sx[i], y = sy[i]; if (x < x0 || x > x1 || y < y0 || y > y1) continue; KCNT[sty[i] * NC + sc[i] + 1]++; }
  for (let k = 1; k <= NK; k++) KCNT[k] += KCNT[k - 1];
  KPOS.set(KCNT);
  for (let i = 0; i < SPARK_MAX; i++) { if (!son[i]) continue; const x = sx[i], y = sy[i]; if (x < x0 || x > x1 || y < y0 || y > y1) continue; ORD[KPOS[sty[i] * NC + sc[i]]++] = i; }
  ctx.lineCap = "round";
  // 4 물방울: 테두리 없는 부드러운 그림(밝은 심 → 색 몸 → 투명한 가장자리). 빠르면 움직이는 쪽으로 조금 길게(두 장 겹침)
  for (let j = KCNT[4 * NC]; j < KCNT[5 * NC]; j++) {
    const i = ORD[j], k = st[i] / sl[i], r = ss[i] * (1 - k * 0.5) * 2.4, tex = dropTex(sc[i]);
    ctx.globalAlpha = 1 - k * k;
    ctx.drawImage(tex, sx[i] - r / 2, sy[i] - r / 2, r, r);
    // 빠른 큰 물방울만 꼬리 한 장 더(작은 것은 생략 — 그리는 수를 아낀다)
    if (ss[i] > 4 && Math.abs(svx[i]) + Math.abs(svy[i]) > 160) { const b = 0.035; ctx.globalAlpha *= 0.55; ctx.drawImage(tex, sx[i] - svx[i] * b - r * 0.4, sy[i] - svy[i] * b - r * 0.4, r * 0.8, r * 0.8); }
  }
  ctx.globalAlpha = 1;
  // 5 물줄기: 색 한 겹(부드럽게 반투명)
  for (let c = 0; c < NC; c++) {
    const a0 = KCNT[5 * NC + c], a1 = KCNT[5 * NC + c + 1]; if (a0 === a1) continue;
    ctx.strokeStyle = COL[c]; ctx.globalAlpha = 0.75; ctx.lineWidth = 3.5; ctx.beginPath();
    for (let j = a0; j < a1; j++) { const i = ORD[j]; ctx.moveTo(sx[i] - svx[i] * 0.05, sy[i] - svy[i] * 0.05); ctx.lineTo(sx[i], sy[i]); }
    ctx.stroke();
  }
  ctx.globalAlpha = 1;
  // 3 비누 거품: 옅은 흰 테두리 + 왼쪽 위 반짝 호
  { const a0 = KCNT[3 * NC], a1 = KCNT[4 * NC];
    if (a1 > a0) {
      ctx.strokeStyle = "rgba(255,255,255,.7)"; ctx.lineWidth = 1.6; ctx.beginPath();
      for (let j = a0; j < a1; j++) { const i = ORD[j], r = ss[i] * (0.7 + st[i] / sl[i] * 0.6); ctx.moveTo(sx[i] + r, sy[i]); ctx.arc(sx[i], sy[i], r, 0, TAU); ctx.moveTo(sx[i] + Math.cos(3.6) * r * 0.62, sy[i] + Math.sin(3.6) * r * 0.62); ctx.arc(sx[i], sy[i], r * 0.62, 3.6, 4.5); }
      ctx.stroke();
    } }
  // 6 먹물이 깨끗한 거품으로: 보라 먹물 → 하늘색 → 흰빛으로 바뀌며 위로 떠오른다
  for (let j = KCNT[6 * NC]; j < KCNT[7 * NC]; j++) {
    const i = ORD[j], k = st[i] / sl[i], r = ss[i] * (0.8 + k * 0.7) * 2.2, tex = k < 0.3 ? INKDOT : k < 0.65 ? dropTex(1) : dropTex(0);
    ctx.globalAlpha = k < 0.3 ? 0.8 : 1 - (k - 0.3) / 0.7; ctx.drawImage(tex, sx[i] - r / 2, sy[i] - r / 2, r, r);
  }
  ctx.globalAlpha = 1;  ctx.globalCompositeOperation = "lighter";
  // 1 빛 줄: 속도 방향으로 길게
  for (let c = 0; c < NC; c++) {
    const a0 = KCNT[NC + c], a1 = KCNT[NC + c + 1]; if (a0 === a1) continue;
    ctx.strokeStyle = COL[c]; ctx.lineWidth = 3.2; ctx.beginPath();
    for (let j = a0; j < a1; j++) { const i = ORD[j]; ctx.moveTo(sx[i] - svx[i] * 0.06, sy[i] - svy[i] * 0.06); ctx.lineTo(sx[i], sy[i]); }
    ctx.stroke();
  }
  // 0 빛 점 · 2 네 갈래 반짝: 그림 붙이기
  for (let j = KCNT[0]; j < KCNT[NC]; j++) { const i = ORD[j], k = st[i] / sl[i], s = ss[i] * 4 * (1 - k * 0.5); ctx.globalAlpha = 1 - k * k; ctx.drawImage(glowTex(sc[i]), sx[i] - s / 2, sy[i] - s / 2, s, s); }
  for (let j = KCNT[2 * NC]; j < KCNT[3 * NC]; j++) { const i = ORD[j], k = st[i] / sl[i], s = ss[i] * 4.2 * (k < 0.25 ? 0.4 + k * 2.4 : 1 - (k - 0.25) * 0.9); ctx.globalAlpha = 1 - k * 0.8; ctx.drawImage(twinkTex(sc[i]), sx[i] - s / 2, sy[i] - s / 2, s, s); }
  ctx.globalAlpha = 1; ctx.globalCompositeOperation = "source-over";
}
/* ---------- 충격파(물결 고리) ----------
   style 0 고리 하나 · 1 물결(두꺼운 색 고리 + 흰 안쪽 고리 + 옅게 비치는 원판) · 2 무지개 고리 셋 · 3 빛 가시(바깥으로 뻗는 빛살) */
const kx = new Float32Array(SHOCK_MAX), ky = new Float32Array(SHOCK_MAX), kR = new Float32Array(SHOCK_MAX), kt = new Float32Array(SHOCK_MAX), kT = new Float32Array(SHOCK_MAX), kw = new Float32Array(SHOCK_MAX), kr0 = new Float32Array(SHOCK_MAX);
const kc = new Uint8Array(SHOCK_MAX), kst = new Uint8Array(SHOCK_MAX), kon = new Uint8Array(SHOCK_MAX);
let khead = 0;
export function shock(x, y, R, T = 0.45, col = 0, width = 10, style = 0, delay = 0, r0 = 0.15) {
  const i = khead; khead = (khead + 1) % SHOCK_MAX;
  kon[i] = 1; kx[i] = x; ky[i] = y; kR[i] = R * AREA; kt[i] = -delay; kT[i] = T; kc[i] = col; kw[i] = width; kst[i] = style; kr0[i] = r0;
}
export function stepShocks(dt) { for (let i = 0; i < SHOCK_MAX; i++) if (kon[i]) { kt[i] += dt; if (kt[i] >= kT[i]) kon[i] = 0; } }
const easeOut = k => 1 - (1 - k) * (1 - k) * (1 - k);
export function drawShocks(ctx) {
  for (let i = 0; i < SHOCK_MAX; i++) {
    if (!kon[i] || kt[i] < 0) continue;
    const k = kt[i] / kT[i], e = easeOut(k), R = kR[i] * (kr0[i] + (1 - kr0[i]) * e), a = 1 - k, w = kw[i] * (1 - k * 0.75) + 1, x = kx[i], y = ky[i], s = kst[i];
    // 부드러운 고리는 처음 15% 동안 서서히 나타난다(작을 때 도넛처럼 보이지 않게)
    const fin = Math.min(1, k / 0.15);
    if (s === 1 || s === 4) {
      // 부드러운 물결: 두께 있는 고리 그림(바깥 반지름 R + 두께만큼). 1 은 보통 합성 + 약한 빛, 4 는 빛(어두운 장면용)
      const S = R + w * 1.6;
      if (s === 1) { ctx.globalAlpha = a * 0.75 * fin; ctx.drawImage(softRing(kc[i]), x - S, y - S, S * 2, S * 2); }
      ctx.globalCompositeOperation = "lighter"; ctx.globalAlpha = (s === 4 ? a * 0.85 : a * 0.3) * fin; ctx.drawImage(softRing(kc[i]), x - S, y - S, S * 2, S * 2); ctx.globalCompositeOperation = "source-over";
    } else if (s === 2 || s === 5 || s === 6) {
      // 무지개 물결: 2·5 는 옅은 파스텔(얇고 반투명), 6 은 필살기·터보 들어갈 때만 쓰는 진한 무지개
      const strong = s === 6, nR = strong ? 3 : 2, wf = strong ? 0.9 : 0.6;
      for (let j = 0; j < nR; j++) { const S = Math.max(4, R + w * 1.6 - j * w * wf), ci = PASTEL[(j * 2 + ((kt[i] * 8) | 0)) % 6]; ctx.globalCompositeOperation = "lighter"; ctx.globalAlpha = (strong ? a * 0.9 : a * 0.4) * fin; ctx.drawImage(softRing(strong ? RAINBOW_IDX[(j * 2 + ((kt[i] * 8) | 0)) % 6] : ci), x - S, y - S, S * 2, S * 2); ctx.globalCompositeOperation = "source-over"; }
    } else if (s === 3) {
      ctx.globalCompositeOperation = "lighter"; ctx.globalAlpha = a; ctx.strokeStyle = COL[kc[i]]; ctx.lineWidth = w * 0.5; ctx.lineCap = "round"; ctx.beginPath();
      const n = 14, rot = x * 0.01;
      for (let j = 0; j < n; j++) { const an = rot + j * TAU / n, r1 = R * 0.55, r2 = R * (j % 2 ? 0.95 : 1.15); ctx.moveTo(x + Math.cos(an) * r1, y + Math.sin(an) * r1); ctx.lineTo(x + Math.cos(an) * r2, y + Math.sin(an) * r2); }
      ctx.stroke(); ctx.globalCompositeOperation = "source-over";
    } else {
      ctx.globalAlpha = a; ctx.strokeStyle = COL[kc[i]]; ctx.lineWidth = w; ctx.beginPath(); ctx.arc(x, y, R, 0, TAU); ctx.stroke();
    }
  }
  ctx.globalAlpha = 1;
}

/* ---------- 번개(전기 해파리) ----------
   두 점 사이를 지그재그로 나눈다(seed 로 모양 고정, 같은 프레임에 새 배열 없음). 넓은 빛 → 색 → 흰 심 순서로 세 번 긋는다. */
const BP = new Float32Array(2 * 34);
let bseed = 1;
const brnd = () => { bseed = (bseed * 16807) % 2147483647; return bseed / 2147483647 - 0.5; };
function boltPath(ctx, x1, y1, x2, y2, jag, segs, store) {
  const dx = x2 - x1, dy = y2 - y1, len = Math.hypot(dx, dy) || 1, nx = -dy / len, ny = dx / len;
  ctx.moveTo(x1, y1);
  for (let s = 1; s < segs; s++) { const f = s / segs, o = brnd() * jag * Math.sin(f * Math.PI) * 2; const px = x1 + dx * f + nx * o, py = y1 + dy * f + ny * o; if (store) { BP[s * 2] = px; BP[s * 2 + 1] = py; } ctx.lineTo(px, py); }
  ctx.lineTo(x2, y2);
}
// pts: [[x,y],...], lv 1~5, a 투명도, seed 정수. 같은 seed 면 세 번 모두 같은 모양.
export function drawLightning(ctx, pts, lv, a, seed, col) {
  const jag = 10 + lv * 3, segs = 7 + lv;
  ctx.lineJoin = "round"; ctx.lineCap = "round";
  for (let p = 0; p < 3; p++) {
    bseed = (seed * 9301 + 49297) % 233280 + 1;
    ctx.beginPath();
    for (let i = 1; i < pts.length; i++) {
      boltPath(ctx, pts[i - 1][0], pts[i - 1][1], pts[i][0], pts[i][1], jag, segs, true);
      // 곁가지: 3단계부터, 단계가 오를수록 많이
      if (lv >= 3) for (let b = 0; b < lv - 2; b++) { const s = 2 + ((b * 3 + i) % (segs - 3)), bx = BP[s * 2], by = BP[s * 2 + 1], an = brnd() * 5, L2 = 26 + lv * 8; boltPath(ctx, bx, by, bx + Math.cos(an) * L2, by + Math.sin(an) * L2, 7, 4, false); }
    }
    if (p === 0) { ctx.globalCompositeOperation = "lighter"; ctx.globalAlpha = a * 0.24; ctx.strokeStyle = "#fff6a0"; ctx.lineWidth = 30 + lv * 7; }
    else if (p === 1) { ctx.globalAlpha = a * 0.92; ctx.strokeStyle = col; ctx.lineWidth = 7 + lv * 2.2; }
    else { ctx.globalAlpha = a; ctx.strokeStyle = "#ffffff"; ctx.lineWidth = 2.4 + lv * 0.6; }
    ctx.stroke();
    ctx.globalCompositeOperation = "source-over";
  }
  ctx.globalAlpha = 1;
}

/* ---------- 화면 꾸밈 ---------- */
// 가장자리 어둡게(필살기·대왕 등장 때) — 한 번만 그린다
export const VIGNETTE = canvasOf(256, 256, (x, w, h) => {
  const g = x.createRadialGradient(w / 2, h / 2, w * 0.18, w / 2, h / 2, w * 0.72);
  g.addColorStop(0, "rgba(4,10,40,0)"); g.addColorStop(1, "rgba(4,10,40,1)");
  x.fillStyle = g; x.fillRect(0, 0, w, h);
});
// 가운데에서 바깥으로 뻗는 속도선(화면 px 좌표). seed 를 바꾸면 선이 바뀐다.
export function speedLines(ctx, cx, cy, W, H, n, alpha, seed, col, inner = 0.35, width = 3) {
  if (alpha <= 0.01) return;
  let s = (seed | 0) * 7919 + 13;
  const r = () => { s = (s * 16807) % 2147483647; return s / 2147483647; };
  const R = Math.hypot(W, H) * 0.6, rin = Math.min(W, H) * inner;
  ctx.globalAlpha = alpha; ctx.strokeStyle = col; ctx.lineCap = "round"; ctx.lineWidth = width; ctx.beginPath();
  for (let i = 0; i < n; i++) { const a = r() * TAU, r1 = rin + r() * R * 0.35, r2 = r1 + R * (0.25 + r() * 0.5); ctx.moveTo(cx + Math.cos(a) * r1, cy + Math.sin(a) * r1); ctx.lineTo(cx + Math.cos(a) * r2, cy + Math.sin(a) * r2); }
  ctx.stroke(); ctx.globalAlpha = 1;
}
// 물결 빛무늬(코스틱): 이어 붙여도 끊기지 않는 256 칸 하나
export const CAUSTIC = canvasOf(256, 256, (x, w) => {
  let s = 99; const r = () => { s = (s * 16807) % 2147483647; return s / 2147483647; };
  x.strokeStyle = "rgba(255,255,255,.75)"; x.lineCap = "round";
  for (let i = 0; i < 34; i++) {
    const x0 = r() * w, y0 = r() * w, a = r() * TAU, L = 30 + r() * 70, c = Math.cos(a), sn = Math.sin(a), bend = (r() - 0.5) * 50;
    x.lineWidth = 1.5 + r() * 3;
    for (let ox = -1; ox <= 1; ox++) for (let oy = -1; oy <= 1; oy++) {
      const bx = x0 + ox * w, by = y0 + oy * w;
      x.beginPath(); x.moveTo(bx, by); x.quadraticCurveTo(bx + c * L / 2 - sn * bend, by + sn * L / 2 + c * bend, bx + c * L, by + sn * L); x.stroke();
    }
  }
});

/* ---------- 바탕 거품(시차: 멀리 있는 것은 천천히 따라온다) ----------
   화면(논리 칸) 기준. 터지는 곳 근처 거품은 밀려난다. */
const ax = new Float32Array(AMB_MAX), ay = new Float32Array(AMB_MAX), ar = new Float32Array(AMB_MAX), ad = new Float32Array(AMB_MAX), avx = new Float32Array(AMB_MAX), avy = new Float32Array(AMB_MAX), aw = new Float32Array(AMB_MAX);
let ambInit = false;
export function ambientInit(W, H) {
  for (let i = 0; i < AMB_MAX; i++) { ax[i] = Math.random() * W; ay[i] = Math.random() * H; ar[i] = 2 + Math.random() * 6; ad[i] = 0.25 + Math.random() * 0.6; avx[i] = 0; avy[i] = 0; aw[i] = Math.random() * TAU; }
  ambInit = true;
}
// 카메라가 dx,dy(논리 칸) 움직였다 → 깊이만큼 덜 움직인다
export function ambientStep(dt, W, H, camDx, camDy) {
  if (!ambInit) ambientInit(W, H);
  const n = Math.round(AMB_MAX * (0.5 + quality * 0.5));
  for (let i = 0; i < n; i++) {
    aw[i] += dt * 2; const dr = Math.max(0, 1 - dt * 2);
    avx[i] *= dr; avy[i] *= dr;
    ax[i] += (avx[i] + Math.sin(aw[i]) * 10) * dt - camDx * ad[i];
    ay[i] += (avy[i] - (14 + ar[i] * 5)) * dt - camDy * ad[i];
    if (ay[i] < -20) { ay[i] = H + 10; ax[i] = Math.random() * W; }
    if (ay[i] > H + 20) ay[i] = -10;
    if (ax[i] < -20) ax[i] += W + 40; else if (ax[i] > W + 20) ax[i] -= W + 40;
  }
}
export function ambientPush(px, py, R, power) {
  for (let i = 0; i < AMB_MAX; i++) { const dx = ax[i] - px, dy = ay[i] - py, d = Math.hypot(dx, dy); if (d < R && d > 0.1) { const k = power * (1 - d / R); avx[i] += dx / d * k; avy[i] += dy / d * k; } }
}
export function ambientDraw(ctx) {
  const n = Math.round(AMB_MAX * (0.5 + quality * 0.5));
  ctx.strokeStyle = "rgba(255,255,255,.55)"; ctx.lineWidth = 1.6; ctx.beginPath();
  for (let i = 0; i < n; i++) { ctx.moveTo(ax[i] + ar[i], ay[i]); ctx.arc(ax[i], ay[i], ar[i], 0, TAU); }
  ctx.stroke();
  ctx.fillStyle = "rgba(255,255,255,.7)"; ctx.beginPath();
  for (let i = 0; i < n; i++) { const r = ar[i] * 0.3; ctx.moveTo(ax[i] - ar[i] * 0.35 + r, ay[i] - ar[i] * 0.35); ctx.arc(ax[i] - ar[i] * 0.35, ay[i] - ar[i] * 0.35, r, 0, TAU); }
  ctx.fill();
}
