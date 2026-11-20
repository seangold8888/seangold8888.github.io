// 야구 겉모습(2.5D 무대): 운동장 그림판 + 코드로 그린 야구장(내야 흙·베이스·파울선·마운드) + 곰돌이 투수(코드 그림)
// + 아이 Actor(진짜 스윙 아틀라스, 방망이가 그림 안) + 코드로 그린 공(잔상·그림자·황금 꼬리).
// 약속: createView({ root, kid, cast, demo, juice, frame }) → { render(snap, dt), cue(ev), replay(clip,{speed,label}) → Promise, destroy() }
//
// 화면 짜임: 아이(타자)는 앞쪽 왼편, 곰돌이 투수는 뒤쪽 오른편(작게, 깊이). 공은 투수 손 → 아이 앞 방망이 자리로 커지며 온다.
// 친 공은 깊이 쪽(그림판의 관중석·학교 건물)으로 날아가고, 카메라가 공을 따라간다. 빠르면 왼쪽 관중석, 늦으면 오른쪽,
// 딱 맞으면 학교 건물 너머 장외 홈런(느린 화면·불꽃놀이).
//
// 그림: art/<kid>/swing.*(준비→당김 load→contact→마무리, 30fps) · art/<kid>/batidle.*(준비 자세 숨쉬기 루프).
// 방망이를 든 준비 자세라 공용 "idle" 이름을 쓰지 않는다(다른 종목에 방망이가 끼지 않게) → 이 view 가 직접 읽는다.
import { createStage } from "../render/stage.js?v=1";
import { createActor, loadKidSprites, loadImage } from "../render/sprites.js?v=1";
import { SWING_LEAD } from "../events/baseball-rules.js?v=1";

const H = 340;                          // 아이 키(world) — 줄넘기와 같은 배율(그림판 kidH 기준)
const TAU = Math.PI * 2;
const ART_V = 1;                        // 야구 그림 주소 ?v= (sw.js 목록과 같이 올린다)
// 아이별: contact 프레임에서 공이 방망이에 닿는 자리(발 기준, 그린 키 비율). 영상 프레임에서 잰 값.
const CONTACT = { jaei: { x: 0.25, y: -0.4 }, taeo: { x: 0.35, y: -0.33 } };
const GOLD = ["#ffd23f", "#fff7a8", "#ffffff", "#ffb300", "#ff9a1f"];
const FIRE = [["#ff4d6d", "#ffd23f", "#ffffff"], ["#3ec1ff", "#ffffff", "#b98bff"], ["#7cff6b", "#fff7a8", "#ffffff"], ["#ff9a1f", "#ffd23f", "#ff4d6d"], ["#b98bff", "#ff8ad8", "#ffffff"]];

async function loadBatSprites(kidId) {
  const base = new URL("../../art/", import.meta.url).href;
  const out = { kidId, atlases: {}, placeholder: {} };
  for (const a of ["swing", "batidle"]) {
    try {
      const meta = await fetch(base + `${kidId}/${a}.json?v=${ART_V}`).then(r => (r.ok ? r.json() : null));
      const img = meta && await loadImage(base + `${kidId}/${a}.webp?v=${ART_V}`);
      if (meta && img && meta.frames && meta.frames.length) out.atlases[a] = { ...meta, img };
    } catch (_) {}
  }
  if (out.atlases.swing) return out;
  return loadKidSprites(kidId, ["idle", "swing"]);          // 그림이 없으면 공용 자리표시(아이 그림 한 장)
}

export function createView({ root, kid, demo = false, frame = null, safe = null }) {
  // 운동장 그림판: manifest 의 backgrounds.lobby(= field 그림판)를 같이 쓴다(공용 manifest 를 건드리지 않으려고)
  const st = createStage(root, { eventId: "lobby" });
  const ks = kid.scale || 1, KH = H * ks;
  const cp = CONTACT[kid.id] || CONTACT.jaei;
  let swingA = null, idleA = null, swingAt = null;
  loadBatSprites(kid.id).then(sp => {
    swingA = createActor(sp); idleA = createActor(sp);
    swingAt = sp.atlases.swing || null;
    if (sp.atlases.batidle) idleA.play("batidle"); else idleA.play("idle");
  });

  let replaying = false, goldFx = 0, goldGetT = 0, impactT = 0, fireworks = [], landed = new Set(), labels = [], lastKey = null;
  const off = document.createElement("canvas"); off.width = 512; off.height = 512; const og = off.getContext("2d");

  /* ---------- 자리(화면 비율에 맞춰 매 프레임) ---------- */
  function plateDims() {
    const P = st.plate, ar = P ? P.img.width / P.img.height : 16 / 9, PH = H / (P ? P.kidH : 0.45), PW = PH * ar;
    return { PH, PW, ground: P ? P.ground : 0.93 };
  }
  function layout() {
    const { PH, PW, ground } = plateDims();
    let vw = Math.min(PW, (st.W / Math.max(1, st.H)) * PH);
    // 첫 화면 시연: 메뉴 카드 옆 빈 칸 너비만큼만(타자·투수가 카드에 가리지 않게)
    const sa = demo && safe ? safe() : null;
    if (sa) { const sc = st.H / 1000 * Math.max(0.2, st.cam.tzoom * st.coverZoom()); vw = Math.min(PW, (sa.right - sa.left) / sc * 0.92); }
    // 좁은 세로 화면: 투수를 더 뒤(위)에 작게 → 공이 위에서 아래로 길게 온다. 넓은 화면: 타자 왼쪽·투수 오른쪽.
    const tall = vw < 480;
    const batX = tall ? -vw * 0.13 : -Math.max(78, Math.min(vw * 0.25, 330)), pitX = tall ? vw * 0.2 : Math.max(70, Math.min(vw * 0.22, 300));
    const img = (fx, fy) => ({ x: -PW / 2 + fx * PW, y: -ground * PH + fy * PH });
    return {
      vw, PH, PW, img, batX, pitX, pitY: tall ? -185 : -128, pitS: tall ? 0.42 : 0.56, tall,
      horizon: img(0, 0.574).y,
      contact: { x: batX + cp.x * KH, y: cp.y * KH },
      home: { x: batX + 0.27 * KH, y: 10 },
    };
  }

  /* ---------- 땅 투영(내야 그림용): 앞 = y 0, 수평선 = horizon ---------- */
  function projector(L) {
    const D = 900, hz = L.horizon;
    const pm = (L.pitY - hz) / (0 - hz);                 // 마운드 깊이 비율
    const Zm = D * (1 / pm - 1), Xm = L.pitX / pm;
    const H0 = { X: L.home.x, Z: 0 };
    const ax = Xm - H0.X, az = Zm, len = Math.hypot(ax, az), ft = len / 60.5;
    const a = { x: ax / len, z: az / len }, n = { x: a.z, z: -a.x };
    const P = (X, Z) => { const p = D / (D + Z); return { x: X * p, y: hz + (L.home.y - hz) * p, p }; };
    const at = (along, side) => P(H0.X + (a.x * along + n.x * side) * ft, Math.max(-D * 0.5, (a.z * along + n.z * side) * ft));
    return { P, at, ft, Xm, Zm };
  }
  // 흙·잔디 질감(작은 얼룩 무늬 한 장을 반복)
  let noisePat = null;
  function noise(g) {
    if (noisePat) return noisePat;
    const c = document.createElement("canvas"); c.width = c.height = 96; const x = c.getContext("2d");
    let seed = 11; const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
    for (let i = 0; i < 900; i++) { const v = rnd() < 0.5 ? 0 : 255; x.fillStyle = `rgba(${v},${v},${v},${0.08 + rnd() * 0.22})`; x.fillRect(rnd() * 96, rnd() * 96, 1 + rnd() * 2.5, 1 + rnd() * 2); }
    noisePat = g.createPattern(c, "repeat"); return noisePat;
  }
  // 야구장을 한 번 그려 둔다(화면 크기·배치가 바뀔 때만 다시) — 매 프레임 그림자·질감을 그리지 않게(아이패드 가볍게)
  let fcache = null;
  function fieldCache(L) {
    const res = Math.min(1.6, Math.max(0.5, st.H / 1000 * st.coverZoom() * 1.1));
    const key = `${Math.round(L.vw)}|${Math.round(L.PH)}|${L.batX | 0}|${L.pitX | 0}|${res.toFixed(2)}`;
    if (fcache && fcache.key === key) return fcache;
    const pr = projector(L), s45 = Math.SQRT1_2, pts = [pr.at(-16, 0), pr.at(-4, 12), pr.at(-4, -12), pr.at(330 * s45, 330 * s45), pr.at(330 * s45, -330 * s45), pr.at(560, 0), pr.at(60.5, 95), pr.at(60.5, -95)];
    const xs = pts.map(p => p.x), ys = pts.map(p => p.y);
    const x0 = Math.min(...xs) - 30, y0 = Math.min(...ys) - 30, x1 = Math.max(...xs) + 30, y1 = Math.max(...ys) + 30;
    let r = res; if ((x1 - x0) * r > 2600) r = 2600 / (x1 - x0);
    const cv = document.createElement("canvas"); cv.width = Math.max(1, Math.ceil((x1 - x0) * r)); cv.height = Math.max(1, Math.ceil((y1 - y0) * r));
    const c = cv.getContext("2d"); c.setTransform(r, 0, 0, r, -x0 * r, -y0 * r);
    drawField(c, L, r);
    fcache = { key, cv, x0, y0, w: x1 - x0, h: y1 - y0 };
    return fcache;
  }
  function drawField(g, L, res = 1) {
    const pr = projector(L), at = pr.at;
    const circle = (cAlong, cSide, r, k = 40) => { const pts = []; for (let i = 0; i <= k; i++) { const t = i / k * TAU; pts.push(at(cAlong + Math.cos(t) * r, cSide + Math.sin(t) * r)); } return pts; };
    const poly = (pts, fill, stroke, lw) => { g.beginPath(); pts.forEach((p, i) => (i ? g.lineTo(p.x, p.y) : g.moveTo(p.x, p.y))); g.closePath(); if (fill) { g.fillStyle = fill; g.fill(); } if (stroke) { g.strokeStyle = stroke; g.lineWidth = lw; g.stroke(); } };
    const s45 = Math.SQRT1_2;
    g.save();
    // 페어 지역만(파울선 사이)
    const far = 400;
    const wedge = [at(-6, 0), at(far * s45, far * s45), at(far * 1.4, 0), at(far * s45, -far * s45)];
    g.beginPath(); wedge.forEach((p, i) => (i ? g.lineTo(p.x, p.y) : g.moveTo(p.x, p.y))); g.closePath(); g.clip();
    // 내야 흙(마운드 둘레 원) → 안쪽 잔디 → 마운드
    const dirt = g.createLinearGradient(0, L.horizon, 0, 20); dirt.addColorStop(0, "rgba(186,124,74,.82)"); dirt.addColorStop(0.55, "rgba(205,142,86,.9)"); dirt.addColorStop(1, "rgba(222,160,100,.94)");
    g.save(); g.shadowColor = "rgba(80,45,15,.5)"; g.shadowBlur = 16 * res; poly(circle(60.5, 0, 92), dirt); g.restore();
    const gr = g.createLinearGradient(0, L.horizon, 0, 0); gr.addColorStop(0, "rgba(84,146,56,.92)"); gr.addColorStop(1, "rgba(98,168,62,.95)");
    g.save(); g.shadowColor = "rgba(40,60,20,.45)"; g.shadowBlur = 10 * res; poly([at(14, 0), at(60, 52), at(112, 0), at(60, -52)], gr); g.restore();
    // 잔디 깎은 줄무늬(마운드 쪽으로 나란히)
    g.save(); g.beginPath(); [at(14, 0), at(60, 52), at(112, 0), at(60, -52)].forEach((p, i) => (i ? g.lineTo(p.x, p.y) : g.moveTo(p.x, p.y))); g.closePath(); g.clip();
    g.fillStyle = "rgba(255,255,255,.07)";
    for (let k = -60; k < 60; k += 16) poly([at(0, k), at(130, k), at(130, k + 8), at(0, k + 8)], "rgba(255,255,255,.07)");
    g.restore();
    g.strokeStyle = "rgba(120,80,40,.35)"; g.lineWidth = 2; poly([at(14, 0), at(60, 52), at(112, 0), at(60, -52)], null, "rgba(120,80,40,.3)", 2);
    // 베이스 길(흙 띠)
    g.globalAlpha = 0.9;
    for (const [a0, a1] of [[[0, 0], [63.6, 63.6]], [[63.6, 63.6], [127.3, 0]], [[127.3, 0], [63.6, -63.6]], [[63.6, -63.6], [0, 0]]]) {
      const p0 = at(...a0), p1 = at(...a1); g.strokeStyle = "rgba(214,150,92,.95)"; g.lineWidth = 9 * (p0.p + p1.p); g.beginPath(); g.moveTo(p0.x, p0.y); g.lineTo(p1.x, p1.y); g.stroke();
    }
    g.globalAlpha = 1;
    { const m = circle(60.5, 0, 9), mc = at(60.5, 0); const mg = g.createRadialGradient(mc.x - 8, mc.y - 6, 2, mc.x, mc.y, 60); mg.addColorStop(0, "#e0a06a"); mg.addColorStop(1, "#b97842"); poly(m, mg, "rgba(120,70,30,.45)", 2); }
    // 질감 + 빛(먼 쪽은 옅게 · 가까운 쪽은 살짝 어둡게) — 이미 칠한 곳 위에만
    g.save(); g.globalCompositeOperation = "source-atop";
    g.globalAlpha = 0.5; g.fillStyle = noise(g); g.fillRect(-3000, L.horizon - 50, 6000, 3000);
    g.globalAlpha = 1; const lg = g.createLinearGradient(0, L.horizon, 0, 30); lg.addColorStop(0, "rgba(255,250,225,.28)"); lg.addColorStop(0.5, "rgba(255,250,225,0)"); lg.addColorStop(1, "rgba(30,15,5,.14)");
    g.fillStyle = lg; g.fillRect(-3000, L.horizon - 50, 6000, 3000);
    g.restore();
    g.restore();
    // 홈 둘레 흙
    g.save(); g.shadowColor = "rgba(80,45,15,.45)"; g.shadowBlur = 10 * res; poly(circle(0, 0, 13), "rgba(214,150,92,.93)"); g.restore();
    // 파울선(분필: 번진 빛 + 하얀 줄, 멀수록 옅게)
    g.lineCap = "round";
    for (const sd of [1, -1]) {
      const a0 = at(0, 0), a1 = at(330 * s45, sd * 330 * s45);
      const cg = g.createLinearGradient(a0.x, a0.y, a1.x, a1.y); cg.addColorStop(0, "rgba(255,255,255,.95)"); cg.addColorStop(1, "rgba(255,255,255,.55)");
      g.strokeStyle = "rgba(255,255,255,.25)"; g.lineWidth = 9; g.beginPath(); g.moveTo(a0.x, a0.y); g.lineTo(a1.x, a1.y); g.stroke();
      g.strokeStyle = cg; g.lineWidth = 4; g.beginPath(); g.moveTo(a0.x, a0.y); g.lineTo(a1.x, a1.y); g.stroke();
    }
    // 타석(분필 네모 둘)
    for (const sd of [1, -1]) {
      const b = [at(-3, sd * 2), at(-3, sd * 6.5), at(4, sd * 6.5), at(4, sd * 2)];
      poly(b, null, "rgba(255,255,255,.85)", 3);
    }
    // 베이스 셋 + 홈 플레이트
    const base = (al, sd) => { const c = at(al, sd), r = 2.2; poly([at(al - r, sd), at(al, sd + r), at(al + r, sd), at(al, sd - r)], "#fff", "rgba(80,60,40,.5)", 1.5); return c; };
    base(63.6, 63.6); base(127.3, 0); base(63.6, -63.6);
    poly([at(-1.2, -1), at(-1.2, 1), at(0, 1), at(0.9, 0), at(0, -1)], "#ffffff", "rgba(60,40,20,.6)", 2);
    // 투수판(하얀 고무)
    poly([at(60, -1.2), at(60, 1.2), at(60.6, 1.2), at(60.6, -1.2)], "#fff");
  }

  /* ---------- 곰돌이 투수(코드 그림, 왼쪽=타자 쪽을 본다) ---------- */
  function pitcherPose(s) {
    const w = s.wind || 1;
    if (s.phase === "windup") {
      const u = Math.min(1, s.phaseT / w);
      if (u < 0.3) { const k = u / 0.3; return { lift: 0, arm: -0.4 + k * 1.6, lean: -0.05 * k, ball: true, glove: k }; }
      if (u < 0.7) { const k = (u - 0.3) / 0.4; return { lift: Math.sin(k * Math.PI / 2), arm: 1.2 + k * 1.9, lean: -0.12 * k, ball: true, glove: 1 }; }
      const k = (u - 0.7) / 0.3; return { lift: 1 - k, arm: 3.1 + k * 2.2, lean: -0.12 + 0.34 * k, ball: k < 0.9, glove: 1 - k * 0.6, stride: k };
    }
    if (s.phase === "pitch" && s.phaseT < 0.5) { const k = s.phaseT / 0.5; return { lift: 0, arm: 5.3 + k * 0.6, lean: 0.22 * (1 - k * 0.7), ball: false, glove: 0.4, stride: 1 - k * 0.5 }; }
    return { lift: 0, arm: -0.4, lean: 0, ball: s.phase !== "pitch" && s.phase !== "result", glove: 0, bob: true };
  }
  function drawBear(g, x, y, sc, pose, t) {
    g.save(); g.translate(x, y); g.scale(sc, sc);
    // 그림자(땅에 붙은 진한 그림자 + 뒤로 길게 번진 그림자)
    const sh = g.createRadialGradient(0, 0, 0, 0, 0, 70); sh.addColorStop(0, "rgba(30,25,10,.5)"); sh.addColorStop(1, "rgba(30,25,10,0)");
    g.fillStyle = sh; g.beginPath(); g.ellipse(0, 0, 70, 16, 0, 0, TAU); g.fill();
    const sh2 = g.createRadialGradient(40, -4, 0, 40, -4, 110); sh2.addColorStop(0, "rgba(30,25,10,.22)"); sh2.addColorStop(1, "rgba(30,25,10,0)");
    g.fillStyle = sh2; g.beginPath(); g.ellipse(40, -4, 110, 14, -0.05, 0, TAU); g.fill();
    const bob = pose.bob ? Math.sin(t * 3) * 2 : 0;
    const outline = "#4a2a14";
    const limb = (x0, y0, x1, y1, w, col) => { g.strokeStyle = outline; g.lineWidth = w + 6; g.lineCap = "round"; g.beginPath(); g.moveTo(x0, y0); g.lineTo(x1, y1); g.stroke(); g.strokeStyle = col; g.lineWidth = w; g.beginPath(); g.moveTo(x0, y0); g.lineTo(x1, y1); g.stroke(); };
    // 다리(앞다리 = 왼쪽, 들어 올림)
    const st2 = (pose.stride || 0) * 18;
    limb(10, -58, 16 + st2 * 0.3, -6, 22, "#f2f2f7");
    const lift = pose.lift || 0;
    limb(-12, -58, -20 - st2 - lift * 6, -6 - lift * 46, 22, "#f2f2f7");
    g.fillStyle = "#2b2f45"; g.beginPath(); g.ellipse(18 + st2 * 0.3, -4, 16, 8, 0, 0, TAU); g.fill();
    g.beginPath(); g.ellipse(-24 - st2 - lift * 6, -4 - lift * 46, 16, 8, 0, 0, TAU); g.fill();
    g.save(); g.translate(0, -58 + bob); g.rotate(pose.lean || 0);
    // 던지는 팔(뒤쪽, 오른팔): 어깨에서 각도 arm(0 = 아래, π = 위, 더 돌면 앞으로)
    const sx = 14, sy = -62, ang = pose.arm || 0, ax = sx + Math.sin(ang) * 46, ay = sy + Math.cos(ang) * 46;
    limb(sx, sy, ax, ay, 18, "#ff7a45");
    g.fillStyle = "#a9733f"; g.strokeStyle = outline; g.lineWidth = 3; g.beginPath(); g.arc(ax, ay, 11, 0, TAU); g.fill(); g.stroke();
    if (pose.ball) { g.fillStyle = "#fff"; g.beginPath(); g.arc(ax - 3, ay - 3, 7, 0, TAU); g.fill(); g.strokeStyle = "#d33"; g.lineWidth = 1.5; g.beginPath(); g.arc(ax - 6, ay - 3, 5, -0.8, 0.8); g.stroke(); }
    // 몸통(유니폼)
    const jg = g.createLinearGradient(-40, -100, 40, 0); jg.addColorStop(0, "#ff9a5a"); jg.addColorStop(1, "#e8552a");
    g.fillStyle = jg; g.strokeStyle = outline; g.lineWidth = 4;
    g.beginPath(); g.roundRect(-36, -98, 72, 92, 30); g.fill(); g.stroke();
    g.fillStyle = "#fff"; g.fillRect(-36, -18, 72, 8);
    g.font = "900 34px system-ui, sans-serif"; g.textAlign = "center"; g.textBaseline = "middle"; g.fillStyle = "#fff"; g.fillText("7", 8, -56);
    // 몸통 빛(해 쪽 테두리 밝게 · 반대쪽 어둡게) — 그림 배경의 햇빛과 맞추기
    g.save(); g.beginPath(); g.roundRect(-36, -98, 72, 92, 30); g.clip();
    const bl = g.createLinearGradient(-40, -98, 40, -6); bl.addColorStop(0, "rgba(255,245,215,.35)"); bl.addColorStop(0.45, "rgba(255,245,215,0)"); bl.addColorStop(1, "rgba(60,10,0,.28)");
    g.fillStyle = bl; g.fillRect(-40, -100, 80, 96); g.restore();
    g.strokeStyle = "rgba(255,248,220,.7)"; g.lineWidth = 3; g.beginPath(); g.arc(-6, -62, 40, Math.PI * 1.1, Math.PI * 1.45); g.stroke();
    // 글러브 팔(앞쪽, 왼팔) — 가슴 앞으로 모았다가 내림
    const gk = pose.glove || 0, gx = -30 + gk * 20, gy = -40 - gk * 30;
    limb(-24, -78, gx, gy, 18, "#ff7a45");
    g.fillStyle = "#8a4b1f"; g.strokeStyle = outline; g.lineWidth = 3; g.beginPath(); g.ellipse(gx - 4, gy, 17, 19, -0.3, 0, TAU); g.fill(); g.stroke();
    g.strokeStyle = "#c98652"; g.lineWidth = 2; g.beginPath(); g.arc(gx - 4, gy, 9, 0, Math.PI); g.stroke();
    // 머리
    g.save(); g.translate(-4, -134);
    const hg = g.createRadialGradient(-12, -14, 6, 0, 0, 48); hg.addColorStop(0, "#c98e55"); hg.addColorStop(1, "#8f5a2c");
    for (const [ex, ey] of [[-30, -32], [26, -36]]) { g.fillStyle = "#8f5a2c"; g.strokeStyle = outline; g.lineWidth = 4; g.beginPath(); g.arc(ex, ey, 15, 0, TAU); g.fill(); g.stroke(); g.fillStyle = "#f2a7a0"; g.beginPath(); g.arc(ex, ey, 7, 0, TAU); g.fill(); }
    g.fillStyle = hg; g.strokeStyle = outline; g.lineWidth = 4; g.beginPath(); g.arc(0, 0, 42, 0, TAU); g.fill(); g.stroke();
    g.strokeStyle = "rgba(255,240,205,.75)"; g.lineWidth = 3.5; g.beginPath(); g.arc(0, 0, 37, Math.PI * 1.05, Math.PI * 1.5); g.stroke();
    g.strokeStyle = "rgba(60,25,5,.35)"; g.lineWidth = 6; g.beginPath(); g.arc(0, 0, 36, Math.PI * 0.1, Math.PI * 0.6); g.stroke();
    // 모자(남색) + 챙(왼쪽)
    g.fillStyle = "#24346e"; g.beginPath(); g.arc(2, -8, 40, Math.PI * 1.05, Math.PI * 1.98); g.closePath(); g.fill(); g.stroke();
    g.beginPath(); g.ellipse(-36, -12, 26, 7, -0.12, 0, TAU); g.fill(); g.stroke();
    g.fillStyle = "#fff"; g.beginPath(); g.arc(4, -30, 6, 0, TAU); g.fill();
    // 얼굴(왼쪽을 본다)
    g.fillStyle = "#f6dfbf"; g.beginPath(); g.ellipse(-18, 14, 20, 15, 0, 0, TAU); g.fill();
    g.fillStyle = "#2b1a10"; g.beginPath(); g.ellipse(-30, 8, 7, 5, 0, 0, TAU); g.fill();
    for (const ex of [-22, 6]) { g.fillStyle = "#1b120c"; g.beginPath(); g.arc(ex, -4, 5.5, 0, TAU); g.fill(); g.fillStyle = "#fff"; g.beginPath(); g.arc(ex - 1.8, -6, 2, 0, TAU); g.fill(); }
    g.strokeStyle = "#2b1a10"; g.lineWidth = 3; g.beginPath(); g.arc(-20, 16, 8, 0.2, Math.PI - 0.4); g.stroke();
    g.fillStyle = "rgba(255,120,120,.45)"; g.beginPath(); g.arc(14, 12, 7, 0, TAU); g.fill();
    g.restore();
    g.restore();
    g.restore();
  }

  /* ---------- 공 ---------- */
  function drawBall(g, x, y, r, golden, alpha = 1, spin = 0) {
    g.save(); g.globalAlpha *= alpha;
    if (golden) { g.shadowColor = "#ffd23f"; g.shadowBlur = 24; }
    const gr = g.createRadialGradient(x - r * 0.35, y - r * 0.4, r * 0.1, x, y, r);
    if (golden) { gr.addColorStop(0, "#fffbe0"); gr.addColorStop(0.5, "#ffd23f"); gr.addColorStop(1, "#c98500"); }
    else { gr.addColorStop(0, "#ffffff"); gr.addColorStop(0.7, "#f1f1ea"); gr.addColorStop(1, "#c9c9c0"); }
    g.fillStyle = gr; g.beginPath(); g.arc(x, y, r, 0, TAU); g.fill();
    g.shadowBlur = 0;
    if (r > 5) {
      g.strokeStyle = golden ? "#a35b00" : "#d83a3a"; g.lineWidth = Math.max(1, r * 0.13);
      g.beginPath(); g.arc(x - r * 0.9, y, r * 0.75, -0.9 + spin, 0.9 + spin); g.stroke();
      g.beginPath(); g.arc(x + r * 0.9, y, r * 0.75, Math.PI - 0.9 + spin, Math.PI + 0.9 + spin); g.stroke();
    }
    g.restore();
  }
  // 던진 공 위치(u: 0 = 투수 손, 1 = 방망이 자리, 1 넘으면 포수 쪽으로 지나감)
  function pitchPos(L, cur, u) {
    const rel = { x: L.pitX - 26 * L.pitS, y: L.pitY - 150 * L.pitS }, c = L.contact;
    const uu = Math.max(0, u);
    let x = rel.x + (c.x - rel.x) * uu, y = rel.y + (c.y - rel.y) * uu - Math.sin(Math.PI * Math.min(1, uu)) * 30;
    if (cur && cur.curve) { y -= Math.sin(Math.PI * Math.min(1, uu)) * 95; x += Math.sin(Math.PI * Math.min(1, uu)) * 30; }
    const r = 5 + 11 * Math.pow(Math.min(1.4, uu), 1.4);
    const gy = L.pitY + (6 - L.pitY) * Math.min(1.3, uu);
    return { x, y, r, gx: x, gy };
  }
  // 친 공: 착지점(그림판 비율 자리)과 꼭대기
  function hitPath(L, hit) {
    const g = hit.grade, d = hit.dir;
    let land, peakY, r1;
    if (g === "perfect") { land = L.img(0.57 + d * 0.12, 0.33); peakY = L.img(0, 0.03).y; r1 = 2.5; }
    else if (g === "great") { land = d < 0 ? L.img(Math.max(0.1, 0.29 + d * 0.16), 0.54) : L.img(Math.min(0.92, 0.72 + d * 0.18), 0.56); peakY = L.img(0, 0.1).y; r1 = 4; }
    else if (g === "good") { land = L.img(0.52 + d * 0.32, 0.665); peakY = L.img(0, 0.34).y; r1 = 5.5; }
    else { land = { x: L.contact.x + Math.sign(d) * L.vw * 0.75, y: -60 }; peakY = L.img(0, 0.45).y; r1 = 12; }
    return { c: L.contact, land, peakY, r1 };
  }
  function hitPos(L, hit, v) {
    const p = hitPath(L, hit), c = p.c;
    const vv = Math.min(1, v);
    const e = 1 - Math.pow(1 - vv, 1.35);                       // 처음 빠르게
    const x = c.x + (p.land.x - c.x) * e;
    const base = c.y + (p.land.y - c.y) * e;
    const apex = Math.max(0, Math.min(c.y, p.land.y) - p.peakY);   // 꼭대기가 시작·착지보다 얼마나 높은지
    const y = base - apex * 4 * e * (1 - e);
    const r = 14 + (p.r1 - 14) * Math.pow(e, 0.8);
    let out = { x, y, r, e, alpha: 1 };
    if (v > 1) {
      const k = v - 1;
      if (hit.grade === "perfect") { out = { x: p.land.x + k * 40, y: p.land.y - k * 60, r: Math.max(0.5, p.r1 * (1 - k)), alpha: Math.max(0, 1 - k * 1.2), e: 1 }; }
      else if (hit.grade === "good") { const b = Math.abs(Math.sin(k * 7)) * 30 * Math.max(0, 1 - k * 1.5); out = { x: p.land.x + k * 50 * Math.sign(hit.dir || 1), y: p.land.y - b, r: p.r1, alpha: Math.max(0, 1 - Math.max(0, k - 0.8) * 2), e: 1 }; }
      else out = { x: p.land.x, y: p.land.y, r: p.r1, alpha: Math.max(0, 1 - k * 4), e: 1 };
    }
    return out;
  }

  /* ---------- 아이 프레임 고르기 ---------- */
  function kidFrame(s) {
    const at = swingAt; if (!at) return { idle: 1 };
    const ev = at.events || {}, load = ev.load || 0, con = ev.contact || load + 4, fin = ev.finish != null ? ev.finish : at.frames.length - 1;
    const c = s.cur;
    if (c && c.swungAt != null && c.swingGT != null) {
      const sw = s.t - c.swingGT;
      if (sw < SWING_LEAD) return { f: load + (con - load) * Math.max(0, sw) / SWING_LEAD, idle: 0 };
      return { f: Math.min(fin, con + (sw - SWING_LEAD) * 30), idle: 0 };
    }
    if (s.phase === "pitch" && c) {
      const lp = Math.max(0, Math.min(1, (s.phaseT / c.flight - 0.3) / 0.45));
      return { f: lp * load, idle: lp > 0 ? 0 : 1 };
    }
    if (s.phase === "result" && c && c.swungAt == null) {   // 안 휘두름: 당긴 자세 → 준비로
      const k = Math.min(1, s.phaseT / 0.35);
      return { f: load * (1 - k), idle: k >= 1 ? 1 : 0 };
    }
    if (s.phase === "windup" && s.prevSwing && s.phaseT < 0.3) return { f: fin, idle: s.phaseT / 0.3, fade: true };
    return { idle: 1 };
  }

  function drawKid(g, L, s, dt, golden) {
    if (!swingA) return;
    const kf = kidFrame(s);
    idleA.update(dt);
    const drawOne = (gg, x, alphaSwing) => {
      if (kf.f != null && alphaSwing > 0) { swingA.scrubFrame("swing", Math.round(kf.f)); swingA.draw(gg, x, 0, KH, { ground: 0, alpha: alphaSwing, shadow: alphaSwing >= 1 || !kf.fade }); }
      if (kf.idle > 0) idleA.draw(gg, x, 0, KH, { ground: 0, alpha: kf.fade ? kf.idle : 1, shadow: !kf.fade || kf.idle > 0.5 });
    };
    const aSwing = kf.f == null ? 0 : kf.fade ? 1 - kf.idle : 1;
    if (!golden) { drawOne(g, L.batX, aSwing); return; }
    // 황금 방망이: 아이 몸을 금빛으로 살짝 물들이고 빛 띠가 지나간다 + 금빛 후광
    const bw = KH * 1.9, bx = L.batX - bw / 2, by = -KH * 1.32, sc = off.width / bw;
    og.setTransform(1, 0, 0, 1, 0, 0); og.clearRect(0, 0, off.width, off.height);
    og.setTransform(sc, 0, 0, sc, -bx * sc, -by * sc);
    og.globalCompositeOperation = "source-over";
    drawOne(og, L.batX, aSwing);
    og.setTransform(1, 0, 0, 1, 0, 0);
    og.globalCompositeOperation = "source-atop";
    const band = ((st.t * 0.9) % 1.6) - 0.3;
    const gr = og.createLinearGradient(0, 0, off.width, off.height);
    const c01 = v => Math.min(1, Math.max(0, v));
    gr.addColorStop(0, "rgba(255,200,40,.28)"); gr.addColorStop(c01(band - 0.08), "rgba(255,200,40,.28)");
    gr.addColorStop(c01(band), "rgba(255,255,230,.85)"); gr.addColorStop(c01(band + 0.08), "rgba(255,200,40,.28)"); gr.addColorStop(1, "rgba(255,200,40,.28)");
    og.fillStyle = gr; og.fillRect(0, 0, off.width, off.height);
    og.globalCompositeOperation = "source-over";
    // 후광
    for (let i = 0; i < 5; i++) {
      g.globalAlpha = 0.12; g.strokeStyle = "#ffd23f"; g.lineWidth = 16;
      g.beginPath(); g.ellipse(L.batX, -KH * 0.5, KH * (0.42 + i * 0.03), KH * (0.6 + i * 0.03), 0, 0, TAU); g.stroke();
    }
    g.globalAlpha = 1;
    g.save(); g.shadowColor = "rgba(255,210,60,.9)"; g.shadowBlur = 26; g.drawImage(off, bx, by, bw, bw); g.restore();
  }

  /* ---------- 한 장면 ---------- */
  function scene(s, dt, replayCam) {
    const L = layout();
    st.setKidHeight(H);
    goldFx = Math.max(0, goldFx - dt); goldGetT = Math.max(0, goldGetT - dt); impactT = Math.max(0, impactT - dt);
    const cur = s.cur, hit = s.hit;
    const golden = !!((cur && cur.golden && s.phase !== "result") || (hit && hit.golden && s.phaseT < 1) || s.golden > 0 || s.goldenPreview > 0 || goldGetT > 0);
    const portrait = st.W < st.H;

    // 공 자리
    let ball = null, hb = null;
    if (hit) {
      const v = (s.t - hit.at) / hit.hang;
      hb = hitPos(L, hit, v);
      hb.v = v;
      const key = hit.at;
      if (v >= 1 && !landed.has(key)) { landed.add(key); onLand(L, hit, hb); }
    } else if (cur && (s.phase === "pitch" || (s.phase === "result" && s.phaseT < 0.6))) {
      const u = s.phase === "pitch" ? s.phaseT / cur.flight : 1 + (s.phaseT + 0.0) / cur.flight;
      if (u <= 1.35) ball = { ...pitchPos(L, cur, u), u };
    }

    // 카메라
    const sa = safe ? safe() : null;
    const following = !!(hb && hb.v < 1.9) || s.slow > 0 || replayCam;
    if (sa && s.slow > 0 && !replayCam && !demo) {
      // 장외 홈런 느린 화면: 맞는 자리로 당기되 아이는 안전 구역 안에(줌은 frameKid 가 줄인다)
      st.overscan = false;
      st.frameKid({ x: L.contact.x, kidH: KH, sa, zoom: 1.25, headPadW: KH * 0.18, footPadW: 10 });
    } else if (sa && (!following || demo) && (!replaying || replayCam)) {   // 시연은 공을 따라가지 않는다(타자·투수가 메뉴 카드에 가리지 않게)
      // 안전 구역: 타자 발은 톡 버튼 띠 위, 방망이 끝까지 알림 띠 아래 · 시연은 카드 옆 빈 칸 가운데
      st.overscan = !!demo;
      st.frameKid({ x: (L.batX + L.pitX) / 2, kidH: KH, sa, zoom: s.phase === "pitch" && !portrait && !demo ? 1.08 : 1, headPadW: KH * 0.18, footPadW: 16, minZoom: 0.35 });
    } else if (!replaying || replayCam) {
      const fr = frame && !sa ? frame() : null;
      st.overscan = !!fr || !!demo;
      let cx = (L.batX + L.pitX) / 2, cy = -300, z = 1;
      if (hb && hb.v < 1.9) {
        const follow = Math.min(1, hb.v * 3);
        cx = cx + (hb.x - cx) * follow; cy = cy + (hb.y - cy) * follow * 0.85;
        z = hit.grade === "foul" ? 1 : portrait ? 1.08 : 1 + (hit.grade === "good" ? 0.3 : 0.6) * follow;
      } else if (s.phase === "pitch" && !portrait) { z = 1.1; cx = (L.batX + L.pitX) / 2 - 40; cy = -260; }
      if (s.slow > 0) { z += 0.25; cx = L.contact.x; cy = L.contact.y - 40; }
      if (replayCam) z *= 1.1;
      if (fr) { const v = st.view(); cx += (fr.x || 0) * v.w; if (fr.feet != null) cy = -(fr.feet - 0.5) * v.h; z = fr.zoom || 1; }
      st.lookAt(cx, cy, z);
    }
    st.begin(dt);

    // 야구장(미리 그려 둔 그림 — 흙 질감·분필 선·부드러운 가장자리)
    st.add({ z: -100, draw: g => { const fc = fieldCache(L); if (fc) g.drawImage(fc.cv, fc.x0, fc.y0, fc.w, fc.h); else drawField(g, L); } });
    // 투수
    st.add({ z: -10, draw: g => drawBear(g, L.pitX, L.pitY, L.pitS, pitcherPose(s), st.t) });

    // 타이밍 고리(공이 방망이 자리에 올 때까지 줄어든다 — 겹칠 때 톡)
    if (s.ring && s.phase === "pitch" && cur && cur.swungAt == null && !cur.golden) {
      const left = s.arriveIn - SWING_LEAD, k = Math.max(0, Math.min(1, left / 0.9)), c = L.contact, hot = Math.abs(left) < 0.08;
      st.add({ z: 4, draw: g => {
        g.lineWidth = 7; g.strokeStyle = "rgba(255,235,90,.9)"; g.beginPath(); g.arc(c.x, c.y, 26, 0, TAU); g.stroke();
        g.lineWidth = 6; g.strokeStyle = hot ? "#fff36b" : "rgba(255,255,255,.95)"; g.beginPath(); g.arc(c.x, c.y, 26 + k * (L.tall ? 105 : 150), 0, TAU); g.stroke();
        if (hot) { g.font = "900 54px Pretendard Variable, Pretendard, system-ui, sans-serif"; g.textAlign = "center"; g.textBaseline = "middle"; g.lineWidth = 8; g.strokeStyle = "#a35b00"; g.strokeText("톡!", c.x + 70, c.y - 70); g.fillStyle = "#ffe14a"; g.fillText("톡!", c.x + 70, c.y - 70); }
      } });
    }

    // 던진 공(+ 그림자, 잔상)
    if (ball) {
      const gold = !!(cur && cur.golden);
      st.add({ z: ball.u > 0.75 ? 6 : -5, draw: g => {
        g.fillStyle = "rgba(20,40,20,.25)"; g.beginPath(); g.ellipse(ball.gx, ball.gy, ball.r * 1.1, ball.r * 0.35, 0, 0, TAU); g.fill();
        for (let i = 4; i >= 1; i--) { const p = pitchPos(L, cur, ball.u - i * 0.035); drawBall(g, p.x, p.y, p.r, gold, 0.12 * (5 - i) / 4 + (gold ? 0.15 : 0)); }
        drawBall(g, ball.x, ball.y, ball.r, gold, 1, st.t * 20);
      } });
      if (gold && Math.random() < 0.8) st.sparkle(ball.x, ball.y, "#ffd23f");
    }
    // 친 공(+ 잔상 꼬리, 땅 그림자)
    if (hb && hb.alpha > 0) {
      const gold = hit.golden, big = hit.grade === "perfect" || hit.grade === "great";
      st.add({ z: 12, draw: g => {
        const n = big ? 10 : 6;
        g.lineCap = "round";
        for (let i = n; i >= 1; i--) {
          const v0 = Math.max(0, hb.v - i * 0.03); if (hb.v > 1.05) break;
          const p = hitPos(L, hit, v0), q = hitPos(L, hit, Math.max(0, v0 - 0.03));
          g.globalAlpha = 0.5 * (1 - i / (n + 1)) * hb.alpha;
          g.strokeStyle = gold ? "#ffd23f" : hit.grade === "perfect" ? `hsl(${(i * 36 + st.t * 300) % 360},95%,65%)` : "rgba(255,255,255,.9)";
          g.lineWidth = p.r * 1.6; g.beginPath(); g.moveTo(q.x, q.y); g.lineTo(p.x, p.y); g.stroke();
        }
        g.globalAlpha = 1;
        drawBall(g, hb.x, hb.y, hb.r, gold || hit.grade === "perfect", hb.alpha, st.t * 30);
      } });
      if ((gold || hit.grade === "perfect") && hb.v < 1 && Math.random() < 0.9) st.sparkle(hb.x, hb.y, gold ? "#ffd23f" : null);
    }

    // 아이
    st.add({ z: 0, draw: g => drawKid(g, L, s, dt, golden) });

    // 맞는 순간 번쩍(별 모양 충격)
    if (impactT > 0) {
      const c = L.contact, k = impactT / 0.35;
      st.add({ z: 14, draw: g => {
        g.save(); g.translate(c.x, c.y); g.rotate(st.t * 2);
        g.globalAlpha = k; g.fillStyle = "#fff8c0";
        g.beginPath(); for (let i = 0; i < 16; i++) { const a = i * Math.PI / 8, r = i % 2 ? 22 : 70 + (1 - k) * 60; g.lineTo(Math.cos(a) * r, Math.sin(a) * r); } g.closePath(); g.fill();
        g.restore();
      } });
    }

    // 불꽃놀이
    fireworks = fireworks.filter(f => { if (st.t >= f.at) { st.burst(f.x, f.y, { n: 46, speed: 380, spread: Math.PI, gravity: 140, life: 1.1, size: 8, colors: f.colors }); st.burst(f.x, f.y, { n: 16, speed: 120, spread: Math.PI, gravity: 60, life: 0.7, size: 5, colors: ["#ffffff"] }); return false; } return true; });
    // 거리 글자
    labels = labels.filter(l => (l.life -= dt) > 0);
    for (const l of labels) st.add({ z: 30, draw: g => bubble(g, l.x, l.y - (1.4 - l.life) * 30, l.text, l.hot, Math.min(1, l.life * 2)) });

    st.flush(dt);

    // 화면 고정 층: 느린 화면 속도선 · 황금 방망이 표시 · 황금 번쩍
    const g = st.g;
    g.setTransform(st.dpr, 0, 0, st.dpr, 0, 0);
    if (s.slow > 0) {
      const sc = st.toScreen(L.contact.x, L.contact.y), cx = sc.x * st.W, cy = sc.y * st.H;
      g.strokeStyle = "rgba(255,255,255,.55)"; g.lineWidth = 3;
      for (let i = 0; i < 28; i++) { const a = i / 28 * TAU + st.t * 0.5, r0 = Math.max(st.W, st.H) * (0.25 + 0.1 * ((i * 7) % 3)), r1 = Math.max(st.W, st.H) * 0.8; g.beginPath(); g.moveTo(cx + Math.cos(a) * r0, cy + Math.sin(a) * r0); g.lineTo(cx + Math.cos(a) * r1, cy + Math.sin(a) * r1); g.stroke(); }
      const vg = g.createRadialGradient(st.W / 2, st.H / 2, Math.min(st.W, st.H) * 0.3, st.W / 2, st.H / 2, Math.max(st.W, st.H) * 0.75);
      vg.addColorStop(0, "rgba(0,0,0,0)"); vg.addColorStop(1, "rgba(30,10,60,.45)"); g.fillStyle = vg; g.fillRect(0, 0, st.W, st.H);
    }
    if (goldGetT > 0) { g.fillStyle = `rgba(255,236,150,${goldGetT * 0.5})`; g.fillRect(0, 0, st.W, st.H); }
    // 타구를 따라가 타자가 화면 밖이면: 구석 작은 창(PiP)에 타자(마무리 자세)
    pip = null;
    if (!demo && sa && (hb || pipK > 0 || st.cam.zoom > st.coverZoom() * 1.04)) {   // 공을 따라갈 때 + 카메라가 돌아오는 동안
      const r = st.rectPx(L.batX - KH * 0.3, -KH, L.batX + KH * 0.3, 0);
      const vis = Math.max(0, Math.min(r.x + r.w, st.W) - Math.max(r.x, 0)) * Math.max(0, Math.min(r.y + r.h, sa.bottom) - Math.max(r.y, sa.top)) / Math.max(1, r.w * r.h);
      pipK = vis < (pipK > 0 ? 0.995 : 0.97) ? Math.min(1, pipK + dt * 10) : Math.max(0, pipK - dt * 6);
    } else pipK = Math.max(0, pipK - dt * 6);
    if (pipK > 0 && sa) drawPip(g, L, s, golden, sa);
  }

  let pip = null, pipK = 0;
  function drawPip(g, L, s, golden, sa) {
    const pw = Math.max(96, Math.min(180, st.W * 0.3, (sa.bottom - sa.bannerBottom) * 0.5)), ph = pw * 1.25;
    const x = 12, y = sa.bottom - ph - 6;
    g.save(); g.globalAlpha = Math.min(1, pipK * 1.6);
    pip = { x, y, w: pw, h: ph };
    // 창 안 world 범위: 타자 둘레
    const wx0 = L.batX - KH * 0.62, wy0 = -KH * 1.22, ww = KH * 1.24, wh = ww * ph / pw, sc = pw / ww;
    g.save();
    g.shadowColor = "rgba(0,0,30,.4)"; g.shadowBlur = 14; g.fillStyle = "#fff";
    g.beginPath(); g.roundRect(x - 4, y - 4, pw + 8, ph + 8, 18); g.fill();
    g.shadowBlur = 0;
    g.beginPath(); g.roundRect(x, y, pw, ph, 14); g.clip();
    g.setTransform(st.dpr * sc, 0, 0, st.dpr * sc, st.dpr * (x - wx0 * sc), st.dpr * (y - wy0 * sc));
    const P = st.plate;
    if (P) { const { PH, PW, ground } = plateDims(); g.drawImage(P.img, -PW / 2, -ground * PH, PW, PH); }
    else { g.fillStyle = "#7cc8ff"; g.fillRect(wx0, wy0, ww, wh); }
    const fc = fieldCache(L); if (fc) g.drawImage(fc.cv, fc.x0, fc.y0, fc.w, fc.h);
    drawKid(g, L, s, 0, golden);
    g.restore();
    g.setTransform(st.dpr, 0, 0, st.dpr, 0, 0);
    g.font = "900 15px Pretendard Variable, Pretendard, system-ui, sans-serif"; g.textAlign = "center"; g.textBaseline = "middle";
    const label = `타자 ${kid.name}`, lw = g.measureText(label).width + 20;
    g.fillStyle = "#2f6bff"; g.beginPath(); g.roundRect(x + pw / 2 - lw / 2, y - 12, lw, 24, 12); g.fill();
    g.fillStyle = "#fff"; g.fillText(label, x + pw / 2, y + 1);
    g.restore();
  }

  function onLand(L, hit, hb) {
    const g = hit.grade;
    if (g === "perfect" || g === "great") {
      const n = g === "perfect" ? 7 : 4;
      for (let i = 0; i < n; i++) fireworks.push({ at: st.t + i * 0.22 + (g === "perfect" ? 0 : 0.05), x: hb.x + (Math.random() - 0.5) * 520, y: L.img(0, 0.12 + Math.random() * 0.22).y, colors: FIRE[i % FIRE.length] });
      st.burst(hb.x, hb.y, { n: 40, speed: 520, colors: hit.golden ? GOLD : ["#ff4d6d", "#ffd23f", "#3ec1ff", "#7cff6b", "#ffffff"] });
      st.cheerUp(1.4); st.shake(0.5);       // 거리는 홈런 배너에 같이 나온다(글자 겹치지 않게 여기선 안 씀)
    } else if (g === "good") {
      st.dust(hb.x, hb.y); labels.push({ x: hb.x, y: hb.y - 50, text: `${hit.dist}m`, hot: false, life: 1.2 });
    }
  }

  function bubble(g, x, y, text, hot, alpha = 1) {
    g.globalAlpha = alpha;
    g.font = "900 44px Pretendard Variable, Pretendard, system-ui, sans-serif"; g.textAlign = "center"; g.textBaseline = "middle";
    const w = g.measureText(text).width + 44;
    g.fillStyle = hot ? "#ffe14a" : "rgba(255,255,255,.92)"; g.strokeStyle = hot ? "#a35b00" : "rgba(40,60,120,.5)"; g.lineWidth = 5;
    g.beginPath(); g.roundRect(x - w / 2, y - 32, w, 64, 32); g.fill(); g.stroke();
    g.fillStyle = hot ? "#5a2b00" : "#2a3a6a"; g.fillText(text, x, y + 2);
    g.globalAlpha = 1;
  }
  function chip(g, text) {
    const fs = Math.max(16, Math.min(26, st.H * 0.032));
    g.font = `900 ${fs}px Pretendard Variable, Pretendard, system-ui, sans-serif`; g.textAlign = "center"; g.textBaseline = "middle";
    // 가로: 왼쪽 아래(톡 버튼은 오른쪽 아래) · 세로: 가운데 톡 버튼 바로 위(style.css .tap-btn 크기와 같게 계산)
    const w = g.measureText(text).width + fs * 1.6, tapH = Math.max(96, Math.min(136, Math.min(st.W, st.H) * 0.16));
    const wide = st.W > st.H, x = wide ? 12 + w / 2 : st.W / 2, y = wide ? st.H - fs * 1.4 - 10 : st.H - tapH - 26 - fs;
    const gr = g.createLinearGradient(0, y - fs, 0, y + fs); gr.addColorStop(0, "#fff3b0"); gr.addColorStop(1, "#ffc21f");
    g.save(); g.shadowColor = "rgba(255,200,40,.9)"; g.shadowBlur = 16 + Math.sin(st.t * 6) * 6;
    g.fillStyle = gr; g.strokeStyle = "#a86a00"; g.lineWidth = 3;
    g.beginPath(); g.roundRect(x - w / 2, y - fs * 0.95, w, fs * 1.9, fs); g.fill(); g.stroke(); g.restore();
    g.fillStyle = "#4a2a00"; g.fillText(text, x, y + 1);
  }

  return {
    stage: st,
    // 주인공(타자) 상자(화면 px) — 화면 밖이면 작은 창(PiP) 자리
    actorRect() {
      if (pip && pipK > 0.3) return { ...pip, pip: true };
      const L = layout(); return st.rectPx(L.batX - KH * 0.3, -KH, L.batX + KH * 0.3, 0);
    },
    render(s, dt) { if (!replaying) scene(s, dt); },
    cue(ev) {
      switch (ev.type) {
        case "hit":
          impactT = 0.35;
          st.punch(ev.grade === "perfect" ? 0.16 : ev.grade === "great" ? 0.1 : 0.05);
          st.shake(ev.grade === "perfect" ? 1 : ev.grade === "great" ? 0.6 : 0.3);
          { const L = layout(); st.burst(L.contact.x, L.contact.y, { n: ev.grade === "perfect" ? 40 : 20, speed: 600, colors: ev.golden ? GOLD : ["#ffffff", "#fff7a8", "#ffd23f"] }); }
          if (ev.grade === "perfect" || ev.grade === "great") st.cheerUp(1);
          break;
        case "goldenGet": goldGetT = 1; { const L = layout(); st.burst(L.batX, -KH * 0.6, { n: 70, speed: 800, colors: GOLD }); st.burst(L.batX, -KH * 0.6, { n: 30, speed: 300, colors: ["#ffffff"] }); } st.cheerUp(1.2); break;
        case "golden": goldFx = 1; break;
        case "whiff": case "strike": st.shake(0.3); break;
        case "go": st.cheerUp(0.8); break;
        case "done": st.cheerUp(1.2); break;
      }
    },
    // 느린 다시 보기: 홈런 순간을 0.4배속 + 위아래 검은 띠
    replay(clip, { speed = 0.4, label = "" } = {}) {
      return new Promise(resolve => {
        const tag = document.createElement("div"); tag.className = "replay-tag"; tag.innerHTML = `<b>다시 보기</b><span></span>`;
        tag.querySelector("span").textContent = label; root.appendChild(tag);
        const bars = document.createElement("div"); bars.className = "letterbox"; root.appendChild(bars);
        const len = clip.frames[clip.frames.length - 1].t;
        let u = 0, last = performance.now(), raf = 0, prevU = 0;
        landed = new Set();
        const end = () => { cancelAnimationFrame(raf); replaying = false; tag.remove(); bars.remove(); root.removeEventListener("pointerdown", end); resolve(); };
        root.addEventListener("pointerdown", end);
        replaying = true;
        const tick = now => {
          const step = Math.min(0.05, (now - last) / 1000) * speed; last = now; u += step;
          if (u >= len) { end(); return; }
          let i = 0; while (i < clip.frames.length - 1 && clip.frames[i + 1].t <= u) i++;
          scene(clip.frames[i].s, Math.max(0.001, u - prevU), true); prevU = u;
          raf = requestAnimationFrame(tick);
        };
        raf = requestAnimationFrame(tick);
      });
    },
    destroy() { st.destroy(); },
  };
}
