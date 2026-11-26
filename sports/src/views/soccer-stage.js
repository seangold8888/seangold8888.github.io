// 축구(승부차기) 겉모습(2.5D 무대): 운동장 그림판 + 코드로 그린 잔디·페널티 박스·골대(그물 출렁)·곰돌이 골키퍼·공(회전·휘어짐·불꽃)
// + 진짜 아이 그림(kick: 디딤→차기(contact)→마무리, cheer: 폴짝 루프).
// 시점: 아이는 앞쪽 왼편, 골대는 오른편 뒤쪽 3/4 각도(아이 그림이 오른쪽으로 차기 때문). 가로·세로 화면마다 배치를 다시 잡는다.
// 약속: createView({ root, kid, cast, demo, juice }) → { render(snap, dt), cue(ev), replay(clip,{speed,label}) → Promise, destroy(),
//        aimFromSwipe(x0,y0,x1,y1) → { u, v, power, ok }, layoutInfo() }
// snap 은 soccer.js 가 만든다(평범한 값만 → 느린 다시 보기가 같은 함수로 다시 그린다).
import { createStage } from "../render/stage.js?v=1";
import { createActor, loadKidSprites, loadManifest, loadImage } from "../render/sprites.js?v=1";

const ART = new URL("../../art/", import.meta.url).href;
const ART_V = 1;                          // 축구 아틀라스 ?v=
const PLATE_KID = 340;                    // 그림판 배율 기준(줄넘기와 같은 운동장 크기)
const F = 1088, EYE = 1.0;                // 원근: 초점(world/m), 카메라 눈높이(m)
const HW = 1.75, GH = 1.65;               // 골대 반너비·높이(m)
const NET_D = 1.0, NET_TOP = 0.55;        // 그물 깊이(아래·위)
const TAU = Math.PI * 2;
const clamp = (x, a, b) => Math.max(a, Math.min(b, x));
const lerp = (a, b, t) => a + (b - a) * t;
const sgn = x => (x < 0 ? -1 : 1);

// 축구 아틀라스는 manifest 를 거치지 않고 직접 읽는다(공용 manifest.json 을 여러 종목이 동시에 고치지 않게).
async function loadSoccerSprites(kidId) {
  const base = await loadKidSprites(kidId, ["idle", "cheer", "kick"]);   // 자리표시 그림(없을 때 대신)
  base.atlases = {};
  for (const a of ["kick", "cheer"]) {
    try {
      const meta = await fetch(ART + `${kidId}/${a}.json?v=${ART_V}`).then(r => (r.ok ? r.json() : null));
      const img = meta && await loadImage(ART + `${kidId}/${a}.webp?v=${ART_V}`);
      if (meta && img) base.atlases[a] = { ...meta, img };
    } catch (_) {}
  }
  return base;
}

export async function createView({ root, kid, cast = [], demo = false, safe = null }) {
  const man = await loadManifest();
  // 배경: manifest 에 soccer 칸이 생기면 그것, 없으면 운동장 그림판(lobby 와 같은 field)
  const st = createStage(root, { eventId: man.backgrounds && man.backgrounds.soccer ? "soccer" : "lobby" });
  st.setKidHeight(PLATE_KID);
  const Hp = PLATE_KID / 0.45, YH = -0.93 * Hp + 0.574 * Hp;       // 그림판 지평선(world y)
  const P3 = (X, Y, Z) => { const k = F / Math.max(0.3, Z); return { x: X * k, y: YH + (EYE - Y) * k, k }; };

  const me = { actor: null };
  loadSoccerSprites(kid.id).then(s => { me.actor = createActor(s); });
  const kidScale = kid.scale || 1;

  /* ---------- 배치(화면 비율마다) ---------- */
  let L = null, pitchCache = null;
  function layout() {
    const aspect = st.W / Math.max(1, st.H);
    const key = Math.round(aspect * 100);
    if (L && L.key === key) return L;
    const Wp = Hp * 16 / 9;
    const t = clamp((aspect - 0.56) / (1.78 - 0.56), 0, 1);
    const portrait = aspect < 1;
    const coverW = aspect >= Wp / Hp ? Wp : Hp * aspect;
    const Wv = portrait ? Math.max(coverW, 540) : coverW;            // 세로 폰은 조금 멀리서(그림판 위아래로 하늘·땅을 이어 붙임)
    const zoom = coverW / Wv;
    const Zb = lerp(4.7, 4.1, t), Zg = lerp(15, 10.3, t);
    const KH = 1.3 * F / Zb;                                           // 재이 키(world) at 공 자리
    const m = Wv * 0.06;
    const xb = -Wv / 2 + m + 0.55 * KH;
    const B = { X: xb * Zb / F, Z: Zb };
    // 골대 X: 오른쪽 끝(가까운 골대 + 그물)이 화면 오른쪽 여백에 오게(몇 번 고쳐 맞춘다)
    let Xg = B.X + 3;
    for (let i = 0; i < 6; i++) {
      const g = goalFrame(B, { X: Xg, Z: Zg });
      const right = Math.max(...[[1, 0, 0], [1, 1, 0], [1, 0, NET_D], [1, 1, NET_TOP]].map(([u, v, dd]) => P3w(g, u, v, dd).x));
      const want = Wv / 2 - m * (portrait ? 0.6 : 1.2);
      Xg += (want - right) * Zg / F * 0.9;
      Xg = Math.max(Xg, B.X + 1.2);
    }
    const G = goalFrame(B, { X: Xg, Z: Zg });
    // 카메라 높이: 위(골대·아이 머리) ~ 아래(발) 띠를 보이게. 세로는 톡 버튼 위로 발이 오게.
    const feet = P3(B.X, 0, B.Z).y, head = feet - KH, bar = P3w(G, 0, 1, 0).y;
    const Hv = 1000 / (coverWZoom(aspect) * zoom);
    let camY;
    if (portrait) camY = feet + 40 - Hv * 0.77 + Hv / 2;
    else camY = (Math.min(head, bar) - 40 + feet + 40) / 2 + Hv * 0.04;
    L = { key, aspect, portrait, Wv, zoom, B, G, KH, camY, Zb, Zg };
    pitchCache = null;
    return L;
  }
  function coverWZoom(aspect) { const Wp = Hp * 16 / 9; return Math.max(1000 / Hp, aspect * 1000 / Wp); }
  function goalFrame(B, Gc) {
    let dx = Gc.X - B.X, dz = Gc.Z - B.Z; const n = Math.hypot(dx, dz); dx /= n; dz /= n;
    return { X: Gc.X, Z: Gc.Z, d: { x: dx, z: dz }, r: { x: dz, z: -dx }, dist: n };
  }
  // 골대 좌표(u,v,깊이 dd m) → 3D → 화면 world
  function W3(g, u, v, dd = 0) { return { X: g.X + g.r.x * u * HW + g.d.x * dd, Y: v * GH, Z: g.Z + g.r.z * u * HW + g.d.z * dd }; }
  function P3w(g, u, v, dd = 0) { const w = W3(g, u, v, dd); return P3(w.X, w.Y, w.Z); }
  function proj(w) { return P3(w.X, w.Y, w.Z); }

  /* ---------- 잔디·선(미리 그려 둔다) ---------- */
  function buildPitch() {
    const { G, B } = L;
    const back = 1.9, front = -(G.dist + 1.6), side = HW + 3.6;
    const ground = (a, b) => { const X = G.X + G.r.x * a + G.d.x * b, Z = G.Z + G.r.z * a + G.d.z * b; return P3(X, 0, Math.max(1.2, Z)); };
    const quad = [ground(-side, back), ground(side, back), ground(side, front), ground(-side, front)];
    const xs = quad.map(p => p.x), ys = quad.map(p => p.y);
    const pad = 40, x0 = Math.min(...xs) - pad, y0 = Math.min(...ys) - pad, x1 = Math.max(...xs) + pad, y1 = Math.max(...ys) + pad;
    const res = 0.7, cv = document.createElement("canvas");
    cv.width = Math.ceil((x1 - x0) * res); cv.height = Math.ceil((y1 - y0) * res);
    const c = cv.getContext("2d");
    c.setTransform(res, 0, 0, res, -x0 * res, -y0 * res);
    const poly = pts => { c.beginPath(); pts.forEach((p, i) => (i ? c.lineTo(p.x, p.y) : c.moveTo(p.x, p.y))); c.closePath(); };
    // 잔디: 가장자리를 부드럽게 번지게(그림 운동장에 스며들게) + 먼 쪽 밝게·가까운 쪽 어둡게 + 잔디 결
    try { c.filter = "blur(14px)"; } catch (_) {}
    const gg = c.createLinearGradient(0, Math.min(...ys), 0, Math.max(...ys)); gg.addColorStop(0, "rgba(108,190,84,.9)"); gg.addColorStop(0.5, "rgba(86,176,70,.93)"); gg.addColorStop(1, "rgba(66,150,56,.95)");
    c.fillStyle = gg; poly(quad); c.fill();
    try { c.filter = "none"; } catch (_) {}
    c.save(); poly(quad); c.clip();
    { // 잔디 결(작은 점 무늬)
      const n = document.createElement("canvas"); n.width = n.height = 64; const nx = n.getContext("2d");
      let sd = 5; const rnd = () => (sd = (sd * 16807) % 2147483647) / 2147483647;
      for (let i = 0; i < 520; i++) { const v = rnd() < 0.5; nx.fillStyle = v ? `rgba(20,70,10,${0.1 + rnd() * 0.2})` : `rgba(210,255,170,${0.08 + rnd() * 0.16})`; nx.fillRect(rnd() * 64, rnd() * 64, 1, 2 + rnd() * 3); }
      c.globalCompositeOperation = "source-atop"; c.fillStyle = c.createPattern(n, "repeat"); c.fillRect(x0, y0, x1 - x0, y1 - y0); c.globalCompositeOperation = "source-over";
    }
    for (let b = back, i = 0; b > front; b -= 1.25, i++) {
      if (i % 2) continue;
      c.fillStyle = "rgba(255,255,255,.07)";
      poly([ground(-side, b), ground(side, b), ground(side, b - 1.25), ground(-side, b - 1.25)]); c.fill();
    }
    // 흰 선
    c.strokeStyle = "rgba(255,255,255,.82)"; c.lineCap = "round"; c.shadowColor = "rgba(255,255,255,.45)"; c.shadowBlur = 4;
    const line = (pts, w) => { c.lineWidth = w; c.beginPath(); pts.forEach((p, i) => (i ? c.lineTo(p.x, p.y) : c.moveTo(p.x, p.y))); c.stroke(); };
    const lw = b => 0.07 * F / Math.max(1.2, G.Z + G.d.z * b);
    line([ground(-side, 0), ground(side, 0)], lw(0));                                       // 골라인
    const gb = HW + 1.0, gd = -1.6;                                                         // 골 에어리어
    line([ground(-gb, 0), ground(-gb, gd), ground(gb, gd), ground(gb, 0)], lw(gd));
    const pb = HW + 3.0, pd = -(G.dist - 1.2);                                              // 페널티 박스(공 자리 바로 앞)
    line([ground(-pb, 0), ground(-pb, pd), ground(pb, pd), ground(pb, 0)], lw(pd));
    // 페널티 아크
    const arc = []; for (let i = 0; i <= 16; i++) { const a = Math.PI * (0.25 + 0.5 * i / 16); arc.push(ground(Math.cos(a) * 2.4 * -1 + 0, pd - Math.sin(a) * 1.1 + 0)); }
    line(arc, lw(pd - 0.8));
    // 골대 아래 그늘(그물·골대가 땅에 붙어 보이게)
    { const a = ground(0, 0.6), gr = c.createRadialGradient(a.x, a.y, 4, a.x, a.y, HW * 1.2 * F / G.Z); gr.addColorStop(0, "rgba(20,50,10,.35)"); gr.addColorStop(1, "rgba(20,50,10,0)"); c.fillStyle = gr; c.beginPath(); c.ellipse(a.x, a.y, HW * 1.5 * F / G.Z, 0.7 * F / G.Z, 0, 0, TAU); c.fill(); }
    c.restore();
    // 페널티 점(공 자리)
    const sp = P3(B.X, 0, B.Z);
    c.fillStyle = "#fff"; c.beginPath(); c.ellipse(sp.x, sp.y, 0.16 * sp.k, 0.05 * sp.k, 0, 0, TAU); c.fill();
    pitchCache = { cv, x0, y0, w: x1 - x0, h: y1 - y0 };
  }

  /* ---------- 공·골키퍼 움직임(결과에서 시각 tc 의 상태를 계산) ---------- */
  function ballR(at) { return at && at.ballR ? at.ballR / at.height * L.KH * kidScale : 0.11 * F / L.Zb; }
  const ballRm = () => ballR(me.actor && me.actor.atlas("kick")) * L.Zb / F;   // 공 반지름(m)
  function spot() { const r = ballRm(); return { X: L.B.X, Y: r, Z: L.B.Z }; }
  function keeperU(o, tc) {                                   // 엔진의 keeperAt 과 같은 식
    const K = o.keeper, move = Math.max(0, tc - K.react) * K.speed, d = K.target - K.k0;
    return K.k0 + sgn(d) * Math.min(Math.abs(d), move);
  }
  // 공의 3D 위치(+ 상태). 골대 면 목표 = W3(u, v)
  function ballAt(o, tc) {
    const G = L.G, S = spot(), r = S.Y;
    const tgt = W3(G, o.u, Math.max(r / GH, o.v), 0);
    const T = o.T;
    const curve = o.fire ? 1.5 * -sgn(o.u || 1) : (o.corner ? 0.45 * sgn(o.u) : 0.12 * sgn(o.u || 1));
    const arc = o.fire ? 0.5 : 0.18 + 0.35 * clamp(1 - o.power, 0, 1);
    const pos = e => {
      const k = 1 - Math.pow(1 - e, 1.12);
      return {
        X: lerp(S.X, tgt.X, k) + G.r.x * curve * Math.sin(Math.PI * e),
        Y: lerp(S.Y, tgt.Y, k) + arc * 4 * e * (1 - e),
        Z: lerp(S.Z, tgt.Z, k) + G.r.z * curve * Math.sin(Math.PI * e),
      };
    };
    if (tc <= T) return { ...pos(Math.max(0, tc / T)), spin: tc * (8 + o.power * 14), state: "fly" };
    const a = pos(1), b = pos(0.97), dt = T * 0.03;
    const vel = { X: (a.X - b.X) / dt, Y: (a.Y - b.Y) / dt, Z: (a.Z - b.Z) / dt };
    const t = tc - T;
    const fall = (p, v, t, floor = r) => {           // 포물선 + 땅에서 통통
      let y = p.Y + v.Y * t - 4.9 * t * t, vy = v.Y - 9.8 * t;
      if (y < floor) { const tl = Math.max(0, t - Math.sqrt(Math.max(0, (p.Y - floor) / 4.9 + 1e-6))); y = floor + Math.abs(Math.sin(tl * 7)) * 0.25 * Math.exp(-tl * 3); vy = 0; }
      return y;
    };
    const res = o.result;
    if (res === "goal" || res === "postIn") {
      // 그물 속으로(깊이 NET_D 에서 멈춤) → 떨어져 구른다
      let u = o.u; if (res === "postIn") u = o.u - sgn(o.u) * Math.min(0.25, t * 2);
      const depth = Math.min(NET_D * 0.85, t * 7) * (1 - 0.15 * Math.sin(Math.min(1, t * 4) * Math.PI));
      const p = W3(G, u, 0, depth);
      const y0 = a.Y, ty = Math.max(0, t - 0.12);
      const y = Math.max(r, y0 - 4.9 * ty * ty);
      return { X: p.X, Y: y, Z: p.Z, spin: T * 20 + t * 6, state: "net" };
    }
    if (res === "save") {
      if (o.catch) return { ...a, spin: T * 20, state: "caught" };
      const out = sgn(o.u - o.keeper.at || o.u || 1);
      const v = { X: -G.d.x * 3.2 + G.r.x * out * 2.6, Y: 3.2, Z: -G.d.z * 3.2 + G.r.z * out * 2.6 };
      return { X: a.X + v.X * t, Y: fall(a, v, t), Z: a.Z + v.Z * t, spin: T * 20 - t * 18, state: "loose" };
    }
    if (res === "post") {
      const out = sgn(o.u || 1);
      const v = { X: -G.d.x * 4 + G.r.x * out * 3, Y: Math.abs(o.v - 1) < 0.1 ? 3.5 : 1.5, Z: -G.d.z * 4 + G.r.z * out * 3 };
      return { X: a.X + v.X * t, Y: fall(a, v, t), Z: a.Z + v.Z * t, spin: T * 20 - t * 25, state: "loose" };
    }
    // 빗나감: 그대로 날아가 골대 뒤로
    return { X: a.X + vel.X * t * 0.8, Y: fall(a, { X: 0, Y: vel.Y * 0.8, Z: 0 }, t), Z: a.Z + vel.Z * t * 0.8, spin: T * 20 + t * 10, state: "out" };
  }
  // 골키퍼 자세: { u(몸 가운데), hip(m), rot(rad, 화면 시계방향 +), face, gloves:[{x,y}...] (몸 기준 m), jump }
  function keeperPose(s) {
    const o = s.outcome, G = L.G;
    const sr = P3w(G, 1, 0.4).x - P3w(G, -1, 0.4).x >= 0 ? 1 : -1;          // u+ 가 화면 오른쪽인가
    const ready = { u: 0, hip: 0.5, rot: 0, face: s.slow ? "sleepy" : "ready", gl: [[-0.36, -0.28], [0.36, -0.28]], jump: 0 };
    if (!o || s.tc == null) {
      const k0 = s.k0 != null ? s.k0 : 0, bob = Math.sin(s.t * (s.slow ? 2 : 5));
      const shuffle = s.phase === "aim" ? Math.sin(s.t * (s.slow ? 0.9 : 1.9)) * (s.level ? 0.05 : 0.03) : 0;
      return { ...ready, u: k0 + shuffle + (s.lean || 0), hip: 0.5 + bob * 0.02, rot: (s.lean || 0) * sr * 1.2, face: s.slow ? "sleepy" : s.reads ? "smirk" : "ready", talk: s.reads && s.phase === "aim" ? s.lastSide : 0 };
    }
    const tc = s.tc, K = o.keeper, T = o.T;
    const dir = sgn(K.target - K.k0) || sgn(o.u || 1);
    const span = Math.max(0.05, Math.abs(K.target - K.k0));
    const ku = keeperU(o, Math.min(tc, T + 0.25));
    const p = clamp(Math.abs(ku - K.k0) / Math.max(0.35, span), 0, 1);
    const tv = o.result === "save" ? o.v : (K.kind === "react" ? Math.min(o.v, 0.7) : 0.35);
    let hip = 0.5 + p * Math.max(0, tv * GH * 0.55 - 0.1), rot = dir * sr * p * 1.15;
    const pre = tc < K.react ? clamp(tc / Math.max(0.05, K.react), 0, 1) : 1;
    let face = s.slow ? "sleepy" : "wow", gl;
    if (tc < K.react) { hip = 0.5 - 0.06 * pre; gl = ready.gl; face = s.slow ? "sleepy" : "ready"; }
    else gl = [[-0.1, -1.08], [0.1, -1.08]];                      // 팔을 쭉(몸이 기울어 날아가는 쪽을 가리킨다)
    let jump = 0, ball = false;
    if (tc > T) {
      const t = tc - T;
      if (o.result === "save") {
        // 공 잡거나 쳐 내고 → 착지 → 일어나 만세
        if (t < 0.45) { hip = lerp(hip, 0.22, clamp(t / 0.3, 0, 1)); rot = dir * sr * lerp(p * 1.15, 1.35, clamp(t / 0.3, 0, 1)); face = "wow"; ball = !!o.catch; }
        else { const q = clamp((t - 0.45) / 0.3, 0, 1); hip = lerp(0.22, 0.5, q); rot = dir * sr * 1.35 * (1 - q); face = "happy"; ball = !!o.catch;
          if (q >= 1) { jump = Math.abs(Math.sin((t - 0.75) * 7)) * 0.25; gl = [[-0.32, -1.0], [0.32, -1.0]]; } }
      } else {
        // 못 막음: 바닥에 철퍼덕 → 앉아서 어지러움
        if (t < 0.5) { hip = lerp(hip, 0.16, clamp(t / 0.3, 0, 1)); rot = dir * sr * lerp(p * 1.15, 1.45, clamp(t / 0.3, 0, 1)); face = K.kind === "fooled" ? "confused" : "wow"; }
        else { const q = clamp((t - 0.5) / 0.35, 0, 1); hip = lerp(0.16, 0.24, q); rot = dir * sr * 1.45 * (1 - q * 0.75); face = K.kind === "fooled" ? "confused" : "dizzy"; gl = [[-0.3, -0.2], [0.3, -0.2]]; }
      }
    }
    return { u: ku, hip, rot, face, gl, jump, ball, dir: dir * sr, p };
  }

  /* ---------- 그리기 조각 ---------- */
  function drawBall(g, w, R, spin, o = {}) {
    if (o.at) {                                   // 골키퍼가 잡은 공(장갑 위치)
      const rr = R * P3w(L.G, 0, 0.5, -0.3).k;
      g.fillStyle = "#fff"; g.beginPath(); g.arc(o.at.x, o.at.y, rr, 0, TAU); g.fill();
      g.fillStyle = "#1d2230"; g.beginPath(); g.arc(o.at.x + rr * 0.2, o.at.y - rr * 0.1, rr * 0.3, 0, TAU); g.fill();
      g.strokeStyle = "rgba(40,50,70,.55)"; g.lineWidth = 2; g.beginPath(); g.arc(o.at.x, o.at.y, rr, 0, TAU); g.stroke();
      return null;
    }
    const p = proj(w), rr = R * p.k;              // R = 반지름(m)
    // 그림자(땅)
    if (!o.noShadow) {
      const sh = P3(w.X, 0, w.Z), lift = Math.max(0, w.Y - R), a = clamp(0.4 - lift * 0.25, 0.08, 0.4);
      g.fillStyle = `rgba(20,40,10,${a})`; g.beginPath(); g.ellipse(sh.x, sh.y, rr * (1 + lift * 0.4), rr * 0.32, 0, 0, TAU); g.fill();
    }
    if (o.fire) {
      const gl = g.createRadialGradient(p.x, p.y, rr * 0.5, p.x, p.y, rr * 3.2);
      gl.addColorStop(0, "rgba(255,240,140,.95)"); gl.addColorStop(0.35, "rgba(255,140,30,.6)"); gl.addColorStop(1, "rgba(255,60,0,0)");
      g.fillStyle = gl; g.beginPath(); g.arc(p.x, p.y, rr * 3.2, 0, TAU); g.fill();
    }
    const grd = g.createRadialGradient(p.x - rr * 0.35, p.y - rr * 0.4, rr * 0.1, p.x, p.y, rr);
    grd.addColorStop(0, "#ffffff"); grd.addColorStop(0.7, "#eef0f4"); grd.addColorStop(1, "#b9bfcc");
    g.fillStyle = grd; g.beginPath(); g.arc(p.x, p.y, rr, 0, TAU); g.fill();
    // 검은 무늬: 구 위의 점들을 회전시켜 앞쪽만
    g.save(); g.beginPath(); g.arc(p.x, p.y, rr, 0, TAU); g.clip();
    g.fillStyle = "#1d2230";
    const pts = [[0, 0, 1], [0.89, 0, 0.45], [0.28, 0.85, 0.45], [-0.72, 0.53, 0.45], [-0.72, -0.53, 0.45], [0.28, -0.85, 0.45], [0, 0, -1], [-0.89, 0, -0.45], [0.72, 0.53, -0.45], [0.72, -0.53, -0.45], [-0.28, 0.85, -0.45], [-0.28, -0.85, -0.45]];
    const ca = Math.cos(spin), sa = Math.sin(spin), cb = Math.cos(spin * 0.37), sb = Math.sin(spin * 0.37);
    for (const [x, y, z] of pts) {
      let y1 = y * ca - z * sa, z1 = y * sa + z * ca;          // x 축 회전
      let x2 = x * cb + z1 * sb, z2 = -x * sb + z1 * cb;       // y 축 회전
      if (z2 <= 0.05) continue;
      g.beginPath(); g.ellipse(p.x + x2 * rr * 0.86, p.y + y1 * rr * 0.86, rr * 0.3 * Math.max(0.25, z2), rr * 0.3, Math.atan2(y1, x2), 0, TAU); g.fill();
    }
    g.restore();
    g.strokeStyle = "rgba(40,50,70,.55)"; g.lineWidth = Math.max(1, rr * 0.07); g.beginPath(); g.arc(p.x, p.y, rr, 0, TAU); g.stroke();
    if (o.fire) {   // 불꽃 혀
      for (let i = 0; i < 5; i++) {
        const a = st.t * 14 + i * 1.3;
        g.fillStyle = i % 2 ? "rgba(255,200,40,.85)" : "rgba(255,90,20,.8)";
        g.beginPath(); g.ellipse(p.x + Math.cos(a) * rr * 0.9, p.y + Math.sin(a) * rr * 0.6 - rr * 0.4, rr * 0.35, rr * 0.7, Math.cos(a) * 0.4, 0, TAU); g.fill();
      }
    }
    return { x: p.x, y: p.y, r: rr };
  }

  // 그물 한 면: 점 격자를 만들고 출렁(ripple) 변위를 준 뒤 줄로 잇는다
  function netGrid(fn, nu, nv) { const pts = []; for (let j = 0; j <= nv; j++) { const row = []; for (let i = 0; i <= nu; i++) row.push(fn(i / nu, j / nv)); pts.push(row); } return pts; }
  function strokeGrid(g, pts, w) {
    g.lineWidth = w; g.beginPath();
    for (const row of pts) row.forEach((p, i) => (i ? g.lineTo(p.x, p.y) : g.moveTo(p.x, p.y)));
    for (let i = 0; i < pts[0].length; i++) pts.forEach((row, j) => (j ? g.lineTo(row[i].x, row[i].y) : g.moveTo(row[i].x, row[i].y)));
    g.stroke();
  }
  function drawNet(g, s) {
    const G = L.G, hit = s.netHit, now = s.t;
    const rip = (u, v) => {
      if (!hit) return 0;
      const age = now - hit.t; if (age < 0 || age > 1.4) return 0;
      const d2 = (u - hit.u) ** 2 * 1.2 + (v - hit.v) ** 2;
      return Math.exp(-d2 * 3.2) * Math.sin(age * 22 - Math.sqrt(d2) * 6) * Math.exp(-age * 3) * 0.55 * (hit.power || 1) + (age < 0.25 ? Math.exp(-d2 * 6) * 0.4 * (1 - age / 0.25) : 0);
    };
    const back = netGrid((a, b) => { const u = -1 + 2 * a, v = b, dd = lerp(NET_D, NET_TOP, v); return P3w(G, u, v, dd + rip(u, v)); }, 14, 7);
    const top = netGrid((a, b) => { const u = -1 + 2 * a; return P3w(G, u, 1, NET_TOP * b + rip(u, 1) * b); }, 14, 3);
    const sideL = netGrid((a, b) => P3w(G, -1, b, lerp(NET_D, NET_TOP, b) * a + rip(-1, b) * a * 0.5), 4, 7);
    const sideR = netGrid((a, b) => P3w(G, 1, b, lerp(NET_D, NET_TOP, b) * a + rip(1, b) * a * 0.5), 4, 7);
    const k = P3w(G, 0, 0.5, 0.5).k;
    g.strokeStyle = "rgba(255,255,255,.55)";
    strokeGrid(g, back, Math.max(1, 0.018 * k));
    strokeGrid(g, sideL, Math.max(1, 0.018 * k));
    strokeGrid(g, sideR, Math.max(1, 0.018 * k));
    g.strokeStyle = "rgba(255,255,255,.65)";
    strokeGrid(g, top, Math.max(1, 0.018 * k));
    // 그물 뒤 받침대(땅)
    g.strokeStyle = "rgba(230,235,245,.9)"; g.lineWidth = Math.max(1.5, 0.04 * k);
    g.beginPath(); [P3w(G, -1, 0, 0), P3w(G, -1, 0, NET_D), P3w(G, 1, 0, NET_D), P3w(G, 1, 0, 0)].forEach((p, i) => (i ? g.lineTo(p.x, p.y) : g.moveTo(p.x, p.y))); g.stroke();
  }
  function drawFrame(g, s) {
    const G = L.G, pk = P3w(G, 0, 1).k, w = 0.1 * pk;
    const posts = [[P3w(G, -1, 0), P3w(G, -1, 1)], [P3w(G, -1, 1), P3w(G, 1, 1)], [P3w(G, 1, 1), P3w(G, 1, 0)]];
    const flash = s.postHit && s.t - s.postHit < 0.35 ? 1 - (s.t - s.postHit) / 0.35 : 0;
    g.lineCap = "round";
    for (const [a, b] of posts) { g.strokeStyle = "rgba(40,50,80,.35)"; g.lineWidth = w * 1.35; g.beginPath(); g.moveTo(a.x + w * 0.2, a.y + w * 0.15); g.lineTo(b.x + w * 0.2, b.y + w * 0.15); g.stroke(); }
    for (const [a, b] of posts) { g.strokeStyle = flash ? `rgb(255,${240 - flash * 40},${200 - flash * 160})` : "#f4f6fb"; g.lineWidth = w; g.beginPath(); g.moveTo(a.x, a.y); g.lineTo(b.x, b.y); g.stroke(); }
    for (const [a, b] of posts) { g.strokeStyle = "rgba(255,255,255,.95)"; g.lineWidth = w * 0.3; g.beginPath(); g.moveTo(a.x - w * 0.18, a.y - w * 0.1); g.lineTo(b.x - w * 0.18, b.y - w * 0.1); g.stroke(); }
  }

  // 곰돌이 골키퍼(초록 유니폼, 노란 장갑). 몸 기준 m 단위로 그리고 화면 배율 k 로 키운다.
  const KEEP = { jersey: "#21c06a", jerseyD: "#128a49", fur: "#b07a4a", furD: "#8a5a32", muzzle: "#f3d9b5", glove: "#ffd23a", gloveD: "#d39a00" };
  function drawKeeper(g, s, pose) {
    const G = L.G, base = P3w(G, pose.u, 0, -0.25), k = base.k;
    // 그림자(진한 발밑 + 옅게 번진 그림자)
    { const sg = g.createRadialGradient(base.x, base.y, 0, base.x, base.y, 0.6 * k); sg.addColorStop(0, "rgba(15,35,5,.45)"); sg.addColorStop(1, "rgba(15,35,5,0)"); g.fillStyle = sg; g.beginPath(); g.ellipse(base.x, base.y, 0.6 * k, 0.15 * k, 0, 0, TAU); g.fill(); }
    g.save();
    g.translate(base.x, base.y - (pose.hip + pose.jump) * k);
    g.rotate(pose.rot);
    g.scale(k, k);
    const blob = (x, y, rx, ry, c, rot = 0) => { g.fillStyle = c; g.beginPath(); g.ellipse(x, y, rx, ry, rot, 0, TAU); g.fill(); };
    const limb = (x0, y0, x1, y1, w, c) => { g.strokeStyle = c; g.lineWidth = w; g.lineCap = "round"; g.beginPath(); g.moveTo(x0, y0); g.lineTo(x1, y1); g.stroke(); };
    // 다리
    const sit = pose.hip < 0.3 && pose.face !== "wow";
    const legY = sit ? 0.05 : pose.hip - 0.02;
    limb(-0.12, 0, sit ? -0.32 : -0.17, legY, 0.15, KEEP.fur); limb(0.12, 0, sit ? 0.32 : 0.17, legY, 0.15, KEEP.fur);
    blob(sit ? -0.36 : -0.19, legY + 0.02, 0.11, 0.065, "#2a2f45"); blob(sit ? 0.36 : 0.19, legY + 0.02, 0.11, 0.065, "#2a2f45");
    // 반바지
    g.fillStyle = "#2a2f45"; g.beginPath(); g.roundRect(-0.22, -0.08, 0.44, 0.17, 0.06); g.fill();
    // 몸통
    const tg = g.createLinearGradient(-0.25, 0, 0.25, 0); tg.addColorStop(0, KEEP.jerseyD); tg.addColorStop(0.45, KEEP.jersey); tg.addColorStop(1, KEEP.jerseyD);
    g.fillStyle = tg; g.beginPath(); g.roundRect(-0.25, -0.56, 0.5, 0.52, 0.16); g.fill();
    g.strokeStyle = "rgba(230,255,220,.6)"; g.lineWidth = 0.025; g.beginPath(); g.arc(0, -0.3, 0.24, Math.PI * 1.1, Math.PI * 1.45); g.stroke();
    g.fillStyle = "rgba(255,255,255,.9)"; g.font = "900 0.22px system-ui, sans-serif"; g.textAlign = "center"; g.textBaseline = "middle"; g.fillText("1", 0, -0.3);
    // 팔·장갑
    const sh = [[-0.22, -0.48], [0.22, -0.48]];
    pose.gl.forEach(([x, y], i) => { limb(sh[i][0], sh[i][1], x, y, 0.12, KEEP.jersey); });
    pose.gl.forEach(([x, y]) => { blob(x, y, 0.105, 0.105, KEEP.gloveD); blob(x - 0.012, y - 0.015, 0.09, 0.09, KEEP.glove); blob(x - 0.035, y - 0.04, 0.03, 0.025, "rgba(255,255,255,.7)"); });
    // 머리
    const hy = -0.78;
    blob(-0.15, hy - 0.16, 0.075, 0.075, KEEP.furD); blob(0.15, hy - 0.16, 0.075, 0.075, KEEP.furD);
    blob(-0.15, hy - 0.16, 0.04, 0.04, "#e9b98f"); blob(0.15, hy - 0.16, 0.04, 0.04, "#e9b98f");
    const hgr = g.createRadialGradient(-0.06, hy - 0.07, 0.03, 0, hy, 0.23); hgr.addColorStop(0, "#c99263"); hgr.addColorStop(1, KEEP.fur);
    g.fillStyle = hgr; g.beginPath(); g.arc(0, hy, 0.215, 0, TAU); g.fill();
    g.strokeStyle = "rgba(255,238,205,.7)"; g.lineWidth = 0.02; g.beginPath(); g.arc(0, hy, 0.19, Math.PI * 1.05, Math.PI * 1.5); g.stroke();
    blob(0, hy + 0.08, 0.11, 0.08, KEEP.muzzle);
    blob(0, hy + 0.045, 0.04, 0.028, "#2a1a10");
    // 표정
    g.strokeStyle = "#2a1a10"; g.lineWidth = 0.022; g.lineCap = "round";
    const eye = (x, kind) => {
      if (kind === "closed") { g.beginPath(); g.arc(x, hy - 0.04, 0.035, Math.PI * 1.1, Math.PI * 1.9); g.stroke(); return; }
      if (kind === "x") { g.beginPath(); g.moveTo(x - 0.03, hy - 0.07); g.lineTo(x + 0.03, hy - 0.01); g.moveTo(x + 0.03, hy - 0.07); g.lineTo(x - 0.03, hy - 0.01); g.stroke(); return; }
      if (kind === "sleepy") { g.beginPath(); g.moveTo(x - 0.035, hy - 0.035); g.lineTo(x + 0.035, hy - 0.035); g.stroke(); return; }
      blob(x, hy - 0.045, 0.042, kind === "big" ? 0.055 : 0.045, "#fff");
      const lx = pose.look || 0;
      blob(x + lx * 0.012, hy - 0.04, 0.024, kind === "big" ? 0.032 : 0.026, "#1b1410"); blob(x + 0.008, hy - 0.052, 0.008, 0.008, "#fff");
    };
    const f = pose.face;
    const eyes = f === "happy" ? "closed" : f === "dizzy" ? "x" : f === "sleepy" ? "sleepy" : f === "wow" || f === "confused" ? "big" : "open";
    eye(-0.075, eyes); eye(0.075, eyes);
    g.beginPath();
    if (f === "happy") { g.arc(0, hy + 0.09, 0.05, 0.1, Math.PI - 0.1); g.stroke(); }
    else if (f === "wow" || f === "confused") { blob(0, hy + 0.115, 0.03, 0.035, "#5a1a10"); }
    else if (f === "dizzy") { g.moveTo(-0.04, hy + 0.12); g.quadraticCurveTo(0, hy + 0.09, 0.04, hy + 0.12); g.stroke(); }
    else if (f === "smirk") { g.moveTo(-0.04, hy + 0.1); g.quadraticCurveTo(0.01, hy + 0.13, 0.05, hy + 0.09); g.stroke(); }
    else { g.arc(0, hy + 0.085, 0.035, 0.2, Math.PI - 0.2); g.stroke(); }
    // 볼 터치
    blob(-0.13, hy + 0.05, 0.035, 0.022, "rgba(255,120,120,.35)"); blob(0.13, hy + 0.05, 0.035, 0.022, "rgba(255,120,120,.35)");
    // 장갑 위치(world) 돌려주기: 공을 잡았을 때 공을 손에
    const gm = pose.gl.reduce((a, [x, y]) => ({ x: a.x + x / pose.gl.length, y: a.y + y / pose.gl.length }), { x: 0, y: 0 });
    const m = g.getTransform();
    g.restore();
    const inv = st.g.getTransform().inverse();
    const sp = new DOMPoint(gm.x, gm.y).matrixTransform(m), wp = sp.matrixTransform(inv);
    return { glove: { x: wp.x, y: wp.y }, head: P3w(G, pose.u, (pose.hip + 1.05) / GH, -0.25) };
  }

  function bubble(g, x, y, text, o = {}) {
    const fs = o.size || 34;
    g.font = `900 ${fs}px Pretendard Variable, Pretendard, system-ui, sans-serif`; g.textAlign = "center"; g.textBaseline = "middle";
    const w = g.measureText(text).width + fs * 1.1, h = fs * 1.6;
    g.fillStyle = o.bg || "rgba(255,255,255,.95)"; g.strokeStyle = o.ink || "rgba(30,50,110,.6)"; g.lineWidth = 4;
    g.beginPath(); g.roundRect(x - w / 2, y - h / 2, w, h, h / 2); g.fill(); g.stroke();
    if (o.tail) { g.beginPath(); g.moveTo(x - 12, y + h / 2 - 2); g.lineTo(x + o.tail * 30, y + h / 2 + 22); g.lineTo(x + 14, y + h / 2 - 2); g.closePath(); g.fill(); }
    g.fillStyle = o.color || "#20305f"; g.fillText(text, x, y + 2);
  }

  // 과녁(골대 면 위 원근 고리)
  function drawReticle(g, u, v, o = {}) {
    const G = L.G, c = P3w(G, u, v, -0.05);
    const pu = P3w(G, u + 0.12, v, -0.05), pv = P3w(G, u, v + 0.14, -0.05);
    const ax = { x: pu.x - c.x, y: pu.y - c.y }, ay = { x: pv.x - c.x, y: pv.y - c.y };
    const pulse = 1 + Math.sin(st.t * 10) * 0.08 * (o.hot ? 1.5 : 1);
    g.save(); g.translate(c.x, c.y); g.transform(ax.x, ax.y, -ay.x, -ay.y, 0, 0);
    const col = o.color || (o.hot ? "#ffe14a" : "#ffffff");
    for (const [r, w, a] of [[1.25 * pulse, 0.16, 0.95], [0.75 * pulse, 0.13, 0.95]]) { g.strokeStyle = "rgba(20,30,60,.45)"; g.lineWidth = w * 1.8; g.beginPath(); g.arc(0, 0, r, 0, TAU); g.stroke(); g.strokeStyle = col; g.globalAlpha = a; g.lineWidth = w; g.beginPath(); g.arc(0, 0, r, 0, TAU); g.stroke(); g.globalAlpha = 1; }
    g.fillStyle = col; g.beginPath(); g.arc(0, 0, 0.22, 0, TAU); g.fill();
    g.restore();
    return c;
  }

  /* ---------- 아이 ---------- */
  function drawKid(g, s) {
    const actor = me.actor; if (!actor) return null;
    const kick = actor.atlas("kick");
    const S = spot(), sp = proj({ X: S.X, Y: 0, Z: S.Z });
    const KH = L.KH * kidScale;
    let ax = sp.x - 0.12 * KH, ay = sp.y;
    if (kick && kick.ball && kick.ball[kick.events.contact]) {
      const b = kick.ball[kick.events.contact], sc = KH / kick.height;
      ax = sp.x - (b.x - kick.anchor.x) * sc; ay = sp.y + (kick.anchor.y - (b.y + kick.ballR)) * sc;
    }
    let act = "kick", frame = 0, squash = null, tilt = 0, lift = 0;
    const n = kick ? kick.frames.length : 1;
    if (s.kickT != null && kick) {
      frame = Math.min(n - 1, Math.floor(s.kickT * (kick.fps || 24)));
      if (s.cheer && frame >= n - 1) act = "cheer";
    } else if (s.cheer) act = "cheer";
    if (act === "cheer" && actor.atlas("cheer")) actor.play("cheer");
    else if (kick) { actor.scrubFrame("kick", frame); if (s.kickT == null) { const b = Math.sin(s.t * 3.4); squash = { x: 1 - b * 0.008, y: 1 + b * 0.012 }; } }
    else { actor.play(s.kickT != null ? "kick" : "idle"); }
    if (s.sad && s.kickT != null && frame >= n - 1) { tilt = -0.05; squash = { x: 1.02, y: 0.97 }; }
    actor.update(s.dt || 0.016);
    let x = ax;
    if (act === "cheer") { const ch = actor.atlas("cheer"); if (ch && kick) x = ax + 0.02 * KH; }
    actor.draw(g, x, ay - lift, KH, { squash, tilt, ground: ay });
    return { x: ax, y: ay };
  }

  /* ---------- 한 장면 ---------- */
  let replaying = false, lastSnap = null, flameT = 0, slowFx = 0, fireFx = 0, goalFx = 0;
  function scene(s, dt, cam) {
    layout();
    if (!pitchCache) buildPitch();
    const G = L.G;
    if (!cam) {
      st.overscan = L.portrait && L.zoom < 1;
      const sa = safe ? safe() : null;
      // 안전 구역: 아이 발(공 자리)은 톡 버튼 띠 위, 머리는 알림 띠 아래(골대 꼭대기는 알림 띠 뒤로 가도 된다)
      if (sa) { const feet = P3(L.B.X, 0, L.B.Z).y; st.frameKid({ x: 0, kidH: L.KH * kidScale, feetY: feet, sa, zoom: L.zoom, footPadW: 30, headPadW: 10, minZoom: 0.3 }); }
      else st.lookAt(0, L.camY, L.zoom);
    }
    st.begin(dt);
    fireFx = Math.max(0, fireFx - dt); slowFx = Math.max(0, slowFx - dt); goalFx = Math.max(0, goalFx - dt);
    const g = st.g;
    // 잔디·선
    st.add({ z: -1000, draw: g => { const p = pitchCache; g.drawImage(p.cv, p.x0, p.y0, p.w, p.h); } });
    const o = s.outcome;
    const kp = keeperPose(s);
    if (s.reads && kp.talk) kp.look = kp.talk;
    // 공 위치
    let bw = null;
    const R = ballRm();
    if (o && s.tc != null) bw = ballAt(o, s.tc);
    else bw = { ...spot(), spin: 0, state: "spot" };
    const ballZ = bw.Z, inGoal = bw.state === "net" || (bw.state === "out" && ballZ > G.Z);
    // 그물(뒤)
    st.add({ z: -G.Z * 10 - 12, draw: g => drawNet(g, s) });
    let gloveW = null;
    st.add({ z: -(G.Z - 0.25) * 10, draw: g => {
      const r = drawKeeper(g, s, kp); gloveW = r.glove;
      if (kp.ball && bw.state === "caught") drawBall(g, null, R, bw.spin, { at: r.glove });
      // 말풍선: 재이 골키퍼가 지난번 쪽을 읽을 때 / 느림보
      if (s.phase === "aim" && s.reads && s.lastSide && !s.slow) {
        const post = P3w(G, s.lastSide, 1.15, 0);
        bubble(g, r.head.x, r.head.y - 40, "또 이쪽이지?", { size: 30, tail: sgn(post.x - r.head.x) * 0.6 });
        const tp = P3w(G, s.lastSide * 0.75, 0.55, -0.1);
        g.fillStyle = "rgba(255,90,90,.85)"; arrowTo(g, r.head.x, r.head.y - 10, tp.x, tp.y);
      }
      if (s.slow) {
        const z = (st.t * 0.8) % 1;
        g.textAlign = "center"; g.lineWidth = 6; g.strokeStyle = `rgba(20,40,120,${1 - z})`; g.fillStyle = `rgba(190,230,255,${1 - z})`;
        g.font = "900 40px system-ui, sans-serif"; g.strokeText("Z", r.head.x + 34 + z * 30, r.head.y - 30 - z * 60); g.fillText("Z", r.head.x + 34 + z * 30, r.head.y - 30 - z * 60);
        g.font = "900 28px system-ui, sans-serif"; g.strokeText("z", r.head.x + 16 + z * 20, r.head.y - 8 - z * 40); g.fillText("z", r.head.x + 16 + z * 20, r.head.y - 8 - z * 40);
        g.fillStyle = "#000"; g.font = "52px system-ui, sans-serif"; g.fillText("🐌", r.head.x - 56, r.head.y - 22 + Math.sin(st.t * 2) * 4);
      }
      if (o && s.tc > o.T + 0.5 && o.result === "goal" && o.keeper.kind === "fooled") { g.font = "900 46px system-ui"; g.fillStyle = "#fff"; g.strokeStyle = "#7a2a00"; g.lineWidth = 6; g.strokeText("?!", r.head.x, r.head.y - 30); g.fillText("?!", r.head.x, r.head.y - 30); }
      if (o && s.tc > o.T + 0.55 && kp.face === "dizzy") for (let i = 0; i < 3; i++) { const a = st.t * 5 + i * TAU / 3; g.font = "28px system-ui"; g.fillText("⭐", r.head.x + Math.cos(a) * 34, r.head.y - 16 + Math.sin(a) * 10); }
    } });
    st.add({ z: -(G.Z - 0.4) * 10, draw: g => drawFrame(g, s) });
    // 공 + 잔상
    const fire = !!(s.fire || (o && o.fire));
    if (bw.state !== "caught") {
      st.add({ z: inGoal ? -(G.Z + 0.3) * 10 : -ballZ * 10 + 0.5, draw: g => {
        const trail = [];
        if (o && s.tc != null && bw.state === "fly") for (let i = 1; i <= 4; i++) { const tt = s.tc - i * 0.028; if (tt > 0) trail.push(ballAt(o, tt)); }
        for (let i = trail.length - 1; i >= 0; i--) {
          const tw = trail[i], tp = proj(tw);
          g.globalAlpha = 0.2 * (1 - i / 4) * (fire ? 2.2 : 1);
            g.fillStyle = fire ? "#ff8a1f" : "#ffffff"; g.beginPath(); g.arc(tp.x, tp.y, R * tp.k * (fire ? 1.4 - i * 0.15 : 0.95), 0, TAU); g.fill();
        }
        g.globalAlpha = 1;
        drawBall(g, bw, R, bw.spin, { fire });
      } });
    }
    if (fire && bw.state !== "net" && Math.random() < 0.9) { const p = proj(bw); st.burst(p.x, p.y, { n: 2, speed: 140, spread: 0.6, gravity: -300, life: 0.45, size: R * p.k * 0.5, colors: ["#ffd23f", "#ff8a1f", "#ff4d1f"] }); }
    // 아이
    st.add({ z: -L.Zb * 10 - 1, draw: g => drawKid(g, s) });
    // 조준 그림
    if (s.phase === "aim" && s.aim) {
      st.add({ z: 50, draw: g => {
        // 태오: 빈 곳이 반짝(여기!)
        if (s.gapSide) {
          const c = P3w(G, s.gapSide * 0.62, 0.42, -0.05);
          const gl = g.createRadialGradient(c.x, c.y, 0, c.x, c.y, 0.9 * c.k);
          gl.addColorStop(0, `rgba(255,240,120,${0.35 + Math.sin(st.t * 6) * 0.12})`); gl.addColorStop(1, "rgba(255,240,120,0)");
          g.fillStyle = gl; g.beginPath(); g.arc(c.x, c.y, 0.9 * c.k, 0, TAU); g.fill();
          if (!s.swipe) bubble(g, c.x, c.y - 0.95 * c.k - Math.abs(Math.sin(st.t * 4)) * 10, "여기가 비었어!", { size: 28, bg: "#fff36b", ink: "#a35b00", color: "#5a2b00", tail: 0 });
        }
        const sp = proj(spot());
        const c = drawReticle(g, s.aim.u, s.aim.v, { hot: !!s.swipe, color: fire ? "#ffb347" : null });
        if (s.swipe) {
          // 쓱 조준: 공 → 과녁 점선 + 힘 막대
          const pw = clamp(s.swipe.power, 0, 1.4), col = pw > 1.12 && s.level >= 1 ? "#ff5a5a" : pw >= 0.85 ? "#ffe14a" : "#ffffff";
          g.setLineDash([14, 12]); g.lineDashOffset = -st.t * 60; g.strokeStyle = col; g.lineWidth = 7; g.lineCap = "round";
          const mx = (sp.x + c.x) / 2, my = Math.min(sp.y, c.y) - 80;
          g.beginPath(); g.moveTo(sp.x, sp.y); g.quadraticCurveTo(mx, my, c.x, c.y); g.stroke(); g.setLineDash([]);
          const bx = sp.x - 70, by = sp.y - L.KH * 0.2;
          g.fillStyle = "rgba(20,30,60,.5)"; g.beginPath(); g.roundRect(bx - 14, by - 120, 28, 124, 12); g.fill();
          g.fillStyle = col; g.beginPath(); g.roundRect(bx - 9, by - 115 * Math.min(1, pw / 1.25) - 1, 18, 115 * Math.min(1, pw / 1.25), 8); g.fill();
        }
        if (s.hint) {   // 첫 슛: 손가락이 공에서 구석으로 쓱
          const k = (st.t * 0.7) % 1, tgt = P3w(G, (s.gapSide || 1) * 0.7, 0.65);
          const hx = lerp(sp.x + 20, tgt.x, Math.min(1, k * 1.4)), hy = lerp(sp.y + 30, tgt.y + 40, Math.min(1, k * 1.4));
          g.globalAlpha = k < 0.85 ? 1 : (1 - k) / 0.15;
          g.font = "64px system-ui, sans-serif"; g.textAlign = "center"; g.fillText("👆", hx, hy + 40);
          g.globalAlpha = 1;
          bubble(g, sp.x + 40, sp.y - L.KH * 1.12, s.camera ? "몸을 기울여 조준, 발로 뻥!" : "골대 구석으로 쓱! (톡 = 과녁으로)", { size: 26 });
        }
      } });
    }
    st.flush(dt);
    // 화면 고정 층: 슛 기록 점(⚽ 골 / ✕)
    const g2 = st.g; g2.setTransform(st.dpr, 0, 0, st.dpr, 0, 0);
    if (s.dots && !demo && !safe) {
      const n = Math.max(s.dots.total, s.dots.list.length), r = Math.min(15, st.W / (n * 3.2 + 4));
      const x0 = st.W - 14 - r - (n - 1) * r * 2.6, y0 = st.H > st.W && st.W < 700 ? 118 : st.H < 500 ? 72 : 78;
      for (let i = 0; i < n; i++) {
        const v = s.dots.list[i], x = x0 + i * r * 2.6;
        g2.fillStyle = "rgba(15,30,80,.55)"; g2.beginPath(); g2.arc(x, y0, r + 3, 0, TAU); g2.fill();
        if (v === true) { g2.fillStyle = "#fff"; g2.beginPath(); g2.arc(x, y0, r, 0, TAU); g2.fill(); g2.fillStyle = "#1d2230"; g2.beginPath(); g2.arc(x, y0, r * 0.38, 0, TAU); g2.fill(); g2.strokeStyle = "#3fd16a"; g2.lineWidth = 3; g2.beginPath(); g2.arc(x, y0, r + 1, 0, TAU); g2.stroke(); }
        else if (v === false) { g2.strokeStyle = "#ff6b6b"; g2.lineWidth = 4; g2.beginPath(); g2.moveTo(x - r * 0.55, y0 - r * 0.55); g2.lineTo(x + r * 0.55, y0 + r * 0.55); g2.moveTo(x + r * 0.55, y0 - r * 0.55); g2.lineTo(x - r * 0.55, y0 + r * 0.55); g2.stroke(); }
        else if (i === s.dots.list.length) { g2.strokeStyle = "rgba(255,255,255,.9)"; g2.lineWidth = 3; g2.beginPath(); g2.arc(x, y0, r * (0.8 + Math.sin(st.t * 6) * 0.1), 0, TAU); g2.stroke(); }
      }
    }
    if (fireFx > 0) { g2.fillStyle = `rgba(255,170,40,${fireFx * 0.45})`; g2.fillRect(0, 0, st.W, st.H); }
    if (slowFx > 0) { g2.fillStyle = `rgba(120,200,255,${slowFx * 0.4})`; g2.fillRect(0, 0, st.W, st.H); }
    if (goalFx > 0) { g2.fillStyle = `rgba(255,255,255,${goalFx * 0.5})`; g2.fillRect(0, 0, st.W, st.H); }
    lastSnap = s;
  }
  function arrowTo(g, x0, y0, x1, y1) {
    const a = Math.atan2(y1 - y0, x1 - x0), d = Math.hypot(x1 - x0, y1 - y0) * 0.55;
    const ex = x0 + Math.cos(a) * d, ey = y0 + Math.sin(a) * d;
    g.strokeStyle = g.fillStyle; g.lineWidth = 8; g.lineCap = "round"; g.setLineDash([10, 10]);
    g.beginPath(); g.moveTo(x0 + Math.cos(a) * 30, y0 + Math.sin(a) * 30); g.lineTo(ex, ey); g.stroke(); g.setLineDash([]);
    g.beginPath(); g.moveTo(ex + Math.cos(a) * 18, ey + Math.sin(a) * 18); g.lineTo(ex + Math.cos(a + 2.4) * 18, ey + Math.sin(a + 2.4) * 18); g.lineTo(ex + Math.cos(a - 2.4) * 18, ey + Math.sin(a - 2.4) * 18); g.closePath(); g.fill();
  }
  /* ---------- 화면 좌표 ↔ 골대 좌표 ---------- */
  function worldToCss(p) { const sc = st.toScreen(p.x, p.y); return { x: sc.x * st.W, y: sc.y * st.H }; }
  // 화면(px) 점 → 골대 (u, v): 골대 면 원근을 뉴턴법으로 거꾸로 푼다
  function cssToGoal(x, y) {
    let u = 0, v = 0.5;
    for (let i = 0; i < 12; i++) {
      const p = worldToCss(P3w(L.G, u, v)), pu = worldToCss(P3w(L.G, u + 0.01, v)), pv = worldToCss(P3w(L.G, u, v + 0.01));
      const a = (pu.x - p.x) / 0.01, b = (pv.x - p.x) / 0.01, c = (pu.y - p.y) / 0.01, d = (pv.y - p.y) / 0.01;
      const det = a * d - b * c; if (Math.abs(det) < 1e-6) break;
      const ex = x - p.x, ey = y - p.y;
      u += (d * ex - b * ey) / det; v += (-c * ex + a * ey) / det;
      u = clamp(u, -3, 3); v = clamp(v, -1, 3);
    }
    return { u, v };
  }

  return {
    stage: st,
    actorRect() { if (!L) return null; const sp = P3(L.B.X, 0, L.B.Z), KH = L.KH * kidScale; return st.rectPx(sp.x - KH * 0.45, sp.y - KH, sp.x + KH * 0.15, sp.y); },
    kickAtlas: () => (me.actor ? me.actor.atlas("kick") : null),
    render(s, dt) { if (!replaying) scene(s, dt); },
    // 쓱 조준: 손가락이 움직인 방향으로 공에서 골대까지 → 그 점이 과녁. 길이 = 힘
    aimFromSwipe(x0, y0, x1, y1) {
      layout();
      const b = worldToCss(proj(spot())), gc = worldToCss(P3w(L.G, 0, 0.45));
      const dx = x1 - x0, dy = y1 - y0, len = Math.hypot(dx, dy);
      const D = Math.hypot(gc.x - b.x, gc.y - b.y);
      if (len < 1) return { u: 0, v: 0.4, power: 0, ok: false };
      const ux = dx / len, uy = dy / len;
      const toward = (ux * (gc.x - b.x) + uy * (gc.y - b.y)) / D;      // 골대 쪽으로 얼마나(코사인)
      const t = cssToGoal(b.x + ux * D, b.y + uy * D);
      const power = len / (Math.min(st.W, st.H) * 0.3);
      return { u: t.u, v: t.v, power, ok: toward > 0.25 };
    },
    layoutInfo() { layout(); const b = worldToCss(proj(spot())), gc = worldToCss(P3w(L.G, 0, 0.45)); return { ball: b, goal: gc, corner: (u, v) => worldToCss(P3w(L.G, u, v)) }; },
    cue(ev) {
      const G = L ? L.G : null; if (!G) return;
      switch (ev.type) {
        case "contact": { const p = proj(spot()); st.punch(0.04); st.burst(p.x, p.y, { n: 14, speed: 520, spread: 1.4, angle: -0.6, colors: ["#ffffff", "#fff7a8", "#ffd23f"] }); st.dust(p.x, p.y + 4); break; }
        case "goal": {
          const p = P3w(G, ev.u, ev.v, 0.5);
          st.punch(ev.big ? 0.12 : 0.07); st.shake(ev.big ? 1 : 0.6); goalFx = ev.big ? 0.5 : 0.3;
          st.burst(p.x, p.y, { n: ev.big ? 70 : 40, speed: 900, colors: ev.fire ? ["#ffd23f", "#ff8a1f", "#ff4d1f", "#fff"] : ["#2f6bff", "#ffffff", "#ffd23f", "#3fd16a", "#ff4d6d"] });
          // 관중석 응원 수술(왼쪽·오른쪽 관중석)
          for (const [x, y] of [[-520, -330], [-380, -320], [430, -300], [560, -310]]) st.burst(x, y, { n: 10, speed: 300, colors: ["#2f6bff", "#ffffff", "#ffd23f"], life: 0.8 });
          break;
        }
        case "save": { const p = P3w(G, ev.u, ev.v, -0.2); st.burst(p.x, p.y, { n: 18, speed: 500, colors: ["#ffd23a", "#ffffff"] }); st.shake(0.4); break; }
        case "post": { const p = P3w(G, sgn(ev.u) * (Math.abs(ev.u) > 0.95 ? 1 : Math.abs(ev.u)), Math.min(1, ev.v), 0); st.burst(p.x, p.y, { n: 16, speed: 600, colors: ["#ffffff", "#fff7a8"] }); st.shake(0.7); break; }
        case "fire": { fireFx = 0.9; const p = proj(spot()); st.burst(p.x, p.y, { n: 60, speed: 800, colors: ["#ffd23f", "#ff8a1f", "#ff4d1f", "#ffffff"] }); st.punch(0.08); break; }
        case "slow": { slowFx = 0.9; const p = P3w(G, 0, 0.7, -0.2); st.burst(p.x, p.y, { n: 30, speed: 420, colors: ["#9be7ff", "#ffffff", "#b98bff"] }); break; }
      }
    },
    // 느린 다시 보기: 공을 따라가는 가까운 카메라 + 0.35배속 + 위아래 검은 띠(누르면 건너뛰기)
    replay(clip, { speed = 0.35, label = "" } = {}) {
      return new Promise(resolve => {
        const tag = document.createElement("div"); tag.className = "replay-tag"; tag.innerHTML = `<b>다시 보기</b><span></span>`;
        tag.querySelector("span").textContent = label; root.appendChild(tag);
        const bars = document.createElement("div"); bars.className = "letterbox"; root.appendChild(bars);
        const len = clip.frames[clip.frames.length - 1].t;
        let u = 0, last = performance.now(), raf = 0, prevU = 0, done = false;
        const end = () => { if (done) return; done = true; cancelAnimationFrame(raf); replaying = false; tag.remove(); bars.remove(); root.removeEventListener("pointerdown", end); resolve(); };
        root.addEventListener("pointerdown", end);
        replaying = true;
        const tick = now => {
          const step = Math.min(0.05, (now - last) / 1000) * speed; last = now; u += step;
          if (u >= len) { end(); return; }
          let i = 0; while (i < clip.frames.length - 1 && clip.frames[i + 1].t <= u) i++;
          const f = clip.frames[i].s;
          layout();
          const b = f.outcome && f.tc != null ? proj(ballAt(f.outcome, f.tc)) : proj(spot());
          const gp = P3w(L.G, 0, 0.5);
          st.overscan = false;
          st.lookAt(lerp(b.x, gp.x, 0.5), lerp(b.y, gp.y, 0.45), L.aspect > 1.7 ? 1.2 : 1.35);
          scene({ ...f, dt: Math.max(0.001, u - prevU) }, Math.max(0.001, u - prevU), true); prevU = u;
          raf = requestAnimationFrame(tick);
        };
        raf = requestAnimationFrame(tick);
      });
    },
    destroy() { st.destroy(); },
  };
}
