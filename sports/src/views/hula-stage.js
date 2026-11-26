// 훌라후프 겉모습(2.5D 무대): 운동장 그림판 + 아이(진짜 영상에서 뽑은 hula 아틀라스) + 코드로 그린 후프(앞·뒤 깊이).
// 약속: createView({ root, kid, cast, demo, juice, frame }) → { render(snap, dt), cue(ev), replay(clip,{speed,label}) → Promise, destroy() }
//
// 아틀라스(art/<kid>/hula.json, ART-SPEC.md + 훌라후프 칸):
//   영상 속 후프는 지우고(몸만), 프레임마다 그 후프 자리 타원 hoop[i] = { cx, cy, rx, ry, rot } 를 적어 둔다(프레임 픽셀).
//   events.front = 후프가 몸 앞(카메라 쪽)으로 나온 프레임, revs = 이 루프 안의 후프 바퀴 수, hands[i] = { l, r }, neck[i].
//   → 게임 후프 각도 phi 로 프레임을 고르면(phi = 0 이 front) 엉덩이 흔들기가 후프와 딱 맞고,
//     코드 후프는 그 프레임의 영상 후프 자리에 그대로 그린다(높이가 처지면 아래로, 요술 후프면 무지개).
//   아틀라스가 없으면 허브 아이 그림 한 장 + 코드 엉덩이 흔들기로 대신한다.
import { createStage } from "../render/stage.js?v=1";
import { createActor, loadKidSprites } from "../render/sprites.js?v=1";

const H = 340;                          // 아이 키(world, 줄넘기와 같은 배율)
const TAU = Math.PI * 2;
const ART_V = 1;                        // hula 아틀라스 파일 판(sw.js 의 ?v= 와 같게)
const ART = new URL("../../art/", import.meta.url).href;

// 아틀라스 없을 때·덤 후프 자리(키 비율, 발 = 0, 위가 음수)
const DEF = { waistY: -0.53, rx: 0.235, ry: 0.075, orbit: 0.045, handX: 0.31, handY: -0.68, neckY: -0.755 };
const PINK = "#ec5a95", YELLOW = "#f7c94f", PINK_D = "#9c2a5a", YELLOW_D = "#a8802a";   // 영상 속 후프 색에 맞춤

async function loadHulaAtlas(kidId) {
  try {
    const meta = await fetch(ART + `${kidId}/hula.json?v=${ART_V}`).then(r => (r.ok ? r.json() : null));
    if (!meta || !Array.isArray(meta.frames) || !meta.frames.length) return null;
    const img = await new Promise(res => { const im = new Image(); im.decoding = "async"; im.onload = () => res(im); im.onerror = () => res(null); im.src = ART + `${kidId}/hula.webp?v=${ART_V}`; });
    return img ? { ...meta, img } : null;
  } catch (_) { return null; }
}

export function createView({ root, kid, demo = false, frame = null, safe = null }) {
  // 배경: 운동장 그림판(field). manifest 의 lobby 칸을 같이 쓴다(공용 manifest 를 고치지 않으려고 — backgrounds.hula 가 생기면 "hula").
  const st = createStage(root, { eventId: "lobby" });
  const KH = H * (kid.scale || 1);
  let actor = null, atlas = null;
  Promise.all([loadKidSprites(kid.id, ["idle"]), loadHulaAtlas(kid.id)]).then(([sp, at]) => {
    if (at) { sp.atlases.hula = at; atlas = at; }
    actor = createActor(sp);
  });

  let lastKidY = 0, replaying = false, visExtra = 0, lastPhase = "", dropT = -1, dropFrom = null, pickT = -1, hopT = 0, oopsT = 0;
  let magicFlash = 0, burstRing = 0, hoopIn = [], ghosts = [], ratioShow = 1, idleHint = 0, lastHoops = 1, doneT = 0;
  const flyers = [];       // 떨어질 때 팔·목 후프가 날아가는 것

  /* ---------- 프레임·후프 자리 ---------- */
  function frameFor(phi) {
    if (!atlas) return 0;
    const n = atlas.frames.length, revs = atlas.revs || 1, front = (atlas.events && atlas.events.front) || 0, P = TAU * revs;
    if (Array.isArray(atlas.phase) && atlas.phase.length === n) {
      // 프레임마다 잰 영상 후프 각도(front = 0)가 있으면 가장 가까운 프레임(영상 후프 빠르기가 고르지 않아도 딱 맞게)
      const v = ((phi % P) + P) % P;
      let best = 0, bd = 1e9;
      for (let k = 0; k < n; k++) { let d = Math.abs(atlas.phase[k] - v); d = Math.min(d, P - d); if (d < bd) { bd = d; best = k; } }
      return best;
    }
    const u = ((phi % P) + P) % P / P;
    return (Math.round(front + u * n) % n + n) % n;
  }
  // 프레임 픽셀 → world
  function px(i, p) {
    const sc = KH / (atlas.height || 440), a = atlas.anchor;
    return { x: (p.x - a.x) * sc, y: (p.y - a.y) * sc, sc };
  }
  // 허리 후프 기본 자리(진짜 그림이면 그 프레임의 영상 후프 타원)
  function waistHoop(i, phi) {
    if (atlas && atlas.hoop && atlas.hoop[i]) {
      const e = atlas.hoop[i], c = px(i, { x: e.cx, y: e.cy });
      return { cx: c.x, cy: c.y, rx: e.rx * c.sc, ry: e.ry * c.sc, rot: e.rot || 0 };
    }
    const d = DEF.orbit * KH;
    return { cx: Math.sin(phi) * d, cy: DEF.waistY * KH + Math.cos(phi) * d * (DEF.ry / DEF.rx), rx: DEF.rx * KH, ry: DEF.ry * KH, rot: Math.sin(phi) * 0.1 };
  }
  function hands(i) {
    if (atlas && atlas.hands && atlas.hands[i]) { const h = atlas.hands[i]; return { l: px(i, h.l), r: px(i, h.r) }; }
    return { l: { x: -DEF.handX * KH, y: DEF.handY * KH }, r: { x: DEF.handX * KH, y: DEF.handY * KH } };
  }
  function neck(i) {
    if (atlas && atlas.neck && atlas.neck[i]) return px(i, atlas.neck[i]);
    return { x: 0, y: DEF.neckY * KH };
  }
  const mainThick = () => (atlas && atlas.hoopThick ? atlas.hoopThick * KH / (atlas.height || 440) : KH * 0.021) * 1.1;
  const smooth = x => { x = Math.max(0, Math.min(1, x)); return x * x * (3 - 2 * x); };

  // 후프 하나 = 중심 c + 두 축 u(cos t), v(sin t). sin t > 0 쪽이 앞(카메라 쪽) → 몸 앞에 그린다.
  function ellipseRing(cx, cy, rx, ry, rot) {
    const c = Math.cos(rot), s = Math.sin(rot);
    return { cx, cy, ux: rx * c, uy: rx * s, vx: -ry * s, vy: ry * c };
  }
  // 팔에 건 후프: 팔(가로) 둘레를 세로로 도는 고리. side = 1 오른손(화면 오른쪽), -1 왼손
  function armRing(hand, phi, side, ra) {
    const d = ra * 0.7, cy = hand.y + Math.cos(phi) * d;
    return { cx: hand.x + side * ra * 0.05, cy: cy + ra * 0.15, ux: 0, uy: ra, vx: side * ra * 0.34, vy: 0, arm: true };
  }

  /* ---------- 후프 그리기 ---------- */
  function ringPt(R, t) { const c = Math.cos(t), s = Math.sin(t); return { x: R.cx + R.ux * c + R.vx * s, y: R.cy + R.uy * c + R.vy * s }; }
  function drawRing(g, R, part, o) {
    const t0 = part === "front" ? 0 : Math.PI, N = 30, thick = o.thick;
    const pts = [];
    for (let i = 0; i <= N; i++) { const t = t0 + (Math.PI * i) / N; pts.push({ ...ringPt(R, t), t }); }
    const back = part === "back";
    g.lineCap = "round"; g.lineJoin = "round";
    // 빛(요술·높이 최고): 넓고 옅은 테
    if (o.glow > 0) {
      for (let k = 3; k >= 1; k--) {
        g.globalAlpha = o.glow * 0.16 * o.alpha; g.lineWidth = thick + k * 9;
        g.strokeStyle = o.magic ? `hsl(${(st.t * 220 + k * 40) % 360},100%,70%)` : "#fff6a8";
        path(g, pts); g.stroke();
      }
    }
    // 테두리
    g.globalAlpha = o.alpha * (back ? 0.7 : 0.9); g.lineWidth = thick + 4; g.strokeStyle = back ? "rgba(70,10,50,.75)" : "rgba(90,16,64,.85)";
    path(g, pts); g.stroke();
    // 줄무늬(돌아가면서 흐른다)
    const stripes = o.stripes || 14;
    g.lineWidth = thick; g.lineCap = "butt";
    for (let i = 1; i <= N; i++) {
      const tm = (pts[i - 1].t + pts[i].t) / 2;
      const k = Math.floor(((tm / TAU) * stripes + o.roll) % 2 + 2) % 2;
      let col;
      if (o.magic) col = `hsl(${((tm / TAU) * 360 * 2 + st.t * 300) % 360},95%,${back ? 52 : 62}%)`;
      else col = k ? (back ? PINK_D : PINK) : (back ? YELLOW_D : YELLOW);
      g.globalAlpha = o.alpha; g.strokeStyle = col;
      g.beginPath(); g.moveTo(pts[i - 1].x, pts[i - 1].y); g.lineTo(pts[i].x, pts[i].y); g.stroke();
    }
    g.lineCap = "round";
    // 흰 반짝(앞쪽만)
    if (!back) {
      g.globalAlpha = o.alpha * 0.7; g.lineWidth = Math.max(1.5, thick * 0.28); g.strokeStyle = "#ffffff";
      g.beginPath();
      for (let i = 4; i <= N - 4; i++) { const p = pts[i]; i === 4 ? g.moveTo(p.x, p.y - thick * 0.28) : g.lineTo(p.x, p.y - thick * 0.28); }
      g.stroke();
    }
    g.globalAlpha = 1;
  }
  function path(g, pts) { g.beginPath(); pts.forEach((p, i) => (i ? g.lineTo(p.x, p.y) : g.moveTo(p.x, p.y))); }

  // 이번 프레임의 후프 목록(뒤에서 앞 순서 상관없이 front/back 를 나눠 그린다)
  function hoopList(s, i, phi, kidY) {
    const out = [];
    const n = s.hoops || 1, hh = s.phase === "drop" ? 0 : s.h;
    const sag = 1 - smooth(hh / 0.7);                         // 0 = 허리, 1 = 무릎까지 처짐
    const W = waistHoop(i, phi);
    const wob = sag * Math.sin(st.t * 9) * 0.06;
    const main = { R: ellipseRing(W.cx + Math.sin(phi) * sag * 10, W.cy + kidY + sag * KH * 0.27 - (hh > 0.92 ? 4 : 0), W.rx * (1 + sag * 0.08), W.ry * (1 + sag * 0.25), W.rot * (1 + sag) + wob), thick: mainThick(), roll: phi * 1.6, key: 0 };
    out.push(main);
    const isJaei = s.mode === "circle" || (kid.level || 0) >= 2;
    for (let k = 1; k < n; k++) {
      const p2 = phi * (1 + 0.07 * k) + k * 2.1;
      if (isJaei) {
        // 재이: 2번 = 오른팔, 3번 = 목, 4번(요술 덤) = 왼팔
        const hd = hands(i);
        if (k === 1) out.push({ R: armRing({ x: hd.r.x, y: hd.r.y + kidY }, p2 * 1.25, 1, KH * 0.1), thick: KH * 0.016, roll: p2 * 2, key: k });
        else if (k === 2) { const nk = neck(i), d = KH * 0.022; out.push({ R: ellipseRing(nk.x + Math.sin(p2 * 1.2) * d, nk.y + kidY + Math.cos(p2 * 1.2) * d * 0.35 + KH * 0.012, KH * 0.105, KH * 0.034, Math.sin(p2 * 1.2) * 0.12), thick: KH * 0.015, roll: p2 * 2.2, key: k }); }
        else out.push({ R: armRing({ x: hd.l.x, y: hd.l.y + kidY }, p2 * 1.25 + 1, -1, KH * 0.1), thick: KH * 0.016, roll: p2 * 2, key: k });
      } else {
        // 태오: 허리 둘레에 위아래로 겹겹이
        const W2 = waistHoop(i, p2), dy = k === 1 ? KH * 0.075 : -KH * 0.07;
        out.push({ R: ellipseRing(W2.cx, W2.cy + kidY + dy + sag * KH * 0.27, W2.rx * (k === 1 ? 1.06 : 0.97), W2.ry, W2.rot * 1.2), thick: KH * 0.02, roll: p2 * 1.6, key: k });
      }
    }
    return out;
  }

  /* ---------- 한 장면 ---------- */
  function scene(s, dt) {
    st.setKidHeight(H);
    if (s.phase !== lastPhase) {
      if (s.phase === "drop") dropT = 0;
      if (lastPhase === "drop" && s.phase === "play") { pickT = 0; dropT = -1; }
      lastPhase = s.phase;
    }
    // 판 사이·끝(엔진이 멈춤): 그림은 목표 박자로 계속 돈다
    if (s.phase === "break" || s.phase === "done") visExtra += (TAU / (s.period || 1)) * dt; else visExtra = 0;
    if (s.phase === "done") doneT += dt;
    const phi = s.phi + visExtra;
    hopT = Math.max(0, hopT - dt); oopsT = Math.max(0, oopsT - dt); magicFlash = Math.max(0, magicFlash - dt); burstRing = Math.max(0, burstRing - dt);
    if (dropT >= 0) dropT += dt;
    if (pickT >= 0) { pickT += dt; if (pickT > 0.35) pickT = -1; }

    // 카메라
    if (!replaying) {
      st.fit(560);
      // 경기 중엔 가까이(후프가 잘 보이게): 팔·후프 너비(약 430 world)는 늘 보이는 만큼만 당긴다
      const near = Math.max(1, Math.min(1.45, (st.W / (st.H / 1000)) / 430));
      const sa = safe ? safe() : null;
      st.overscan = !!demo;
      if (sa) {
        // 안전 구역: 머리는 알림 띠 아래(10 바퀴! 배너가 얼굴을 가리지 않게), 발은 빠르기 막대·톡 버튼 위
        const gaugeH = s.mode === "circle" && !demo && st.W <= st.H * 1.25 ? Math.max(26, Math.min(38, st.H * 0.045)) + 12 + Math.max(16, st.H * 0.035) : 0;
        st.frameKid({ x: 0, kidH: KH, sa, zoom: demo ? 1 : near, footPad: gaugeH ? gaugeH + 34 : 4, footPadW: 18, headPadW: KH * 0.05, minZoom: 0.3 });
      } else {
        const fr = frame ? frame() : null, v = st.view();
        const camY = fr && fr.feet != null ? -(fr.feet - 0.5) * v.h : -H * 0.68;
        st.lookAt(fr ? (fr.x || 0) * v.w : 0, camY, fr && fr.zoom ? fr.zoom : near);
      }
    }
    st.begin(dt);

    const i = frameFor(s.phase === "drop" ? 0 : phi);
    // 아이: 좋은 순간 폴짝, 떨어지면 움찔
    const hop = hopT > 0 ? Math.sin((1 - hopT / 0.45) * Math.PI) * KH * 0.06 : 0;
    const cheer = s.phase === "done" ? Math.abs(Math.sin(doneT * 6)) * KH * 0.05 : 0;
    const kidY = -hop - cheer;
    lastKidY = kidY;
    const tilt = s.phase === "drop" ? -0.07 * Math.min(1, dropT * 6) : 0;
    let list = s.phase === "drop" ? [] : hoopList(s, i, phi, kidY);
    // 덤 후프 날아 들어오기(위에서 쏙)
    list.forEach(hp => {
      const fin = hoopIn.find(h => h.key === hp.key);
      if (fin) { const q = 1 - smooth(fin.t / 0.45); hp.R = { ...hp.R, cy: hp.R.cy - q * 900, cx: hp.R.cx + q * (hp.key % 2 ? 300 : -300) }; hp.flying = q; }
    });
    hoopIn = hoopIn.filter(h => (h.t += dt) < 0.45);
    // 줍기: 땅에서 허리로 쑥
    if (pickT >= 0 && list[0]) { const q = 1 - smooth(pickT / 0.35); list[0].R = { ...list[0].R, cy: list[0].R.cy + q * (-list[0].R.cy) }; }

    const magic = s.magic > 0 || (s.phase !== "play" && s.bonusHoop && s.magicMax > 0 && s.round > 0 && s.phase === "ready");
    const glow = magic ? 1 : s.h > 0.92 && s.phase === "play" ? 0.55 : 0;
    const style = hp => ({ thick: hp.thick, roll: hp.roll, alpha: 1, glow, magic, stripes: hp.R.arm ? 8 : 14 });

    // 잔상(이전 프레임 후프 2개를 옅게) — 빠르게 돌수록 진하게
    const ghostA = Math.min(0.32, Math.abs(s.spin || 0) / 40);
    if (!replaying) { ghosts.unshift(list.map(h => ({ R: h.R, thick: h.thick, roll: h.roll, key: h.key }))); if (ghosts.length > 3) ghosts.length = 3; }
    for (const part of ["back", "front"]) {
      st.add({ z: part === "back" ? -2 : 2, draw: g => {
        for (let gi = ghosts.length - 1; gi >= 1; gi--) for (const h of ghosts[gi]) drawRing(g, h.R, part, { ...style(h), alpha: ghostA / gi, glow: 0 });
        for (const h of list) drawRing(g, h.R, part, style(h));
      } });
    }
    // 아이
    if (actor) {
      if (atlas) actor.scrubFrame("hula", i); else actor.play("idle");
      actor.update(dt);
      // 진짜 그림이 없으면 코드로 엉덩이 흔들기(기울이기)
      const sway = atlas ? 0 : Math.sin(phi) * 0.05;
      const sq = hopT > 0 ? { x: 0.97, y: 1.04 } : s.phase === "drop" && dropT < 0.2 ? { x: 1.05, y: 0.95 } : { x: 1, y: 1 };
      st.add({ z: 0, draw: g => actor.draw(g, 0, kidY, KH, { ground: 0, tilt: tilt + sway, squash: sq }) });
    }
    // 떨어진 후프(땅에서 통통 → 빙글빙글 눕기)
    if (s.phase === "drop" && dropFrom) {
      const t = dropT, R0 = dropFrom;
      const fall = Math.min(1, t / 0.32);
      let y = R0.cy + (0 - R0.cy) * fall * fall;
      if (t > 0.32) y = -Math.abs(Math.sin((t - 0.32) * 9)) * 30 * Math.exp(-(t - 0.32) * 4);
      const flat = Math.min(1, t / 0.45);
      const rx = R0.rx * (1 + flat * 0.12), ry = R0.ry + (R0.rx * 0.33 - R0.ry) * flat;
      const rot = Math.exp(-t * 3) * Math.sin(t * 16) * 0.35;
      const R = ellipseRing(R0.cx * (1 - flat) + 30 * flat, y - ry * 0.4, rx, ry, rot);
      for (const part of ["back", "front"]) st.add({ z: part === "back" ? -2 : 2, draw: g => drawRing(g, R, part, { thick: KH * 0.021, roll: t * 3, alpha: 1, glow: 0, magic: false, stripes: 14 }) });
      if (t > 0.3 && t < 0.36) st.dust(R.cx, 0);
      // 머리 위 빙글 별
      st.add({ z: 5, draw: g => dizzy(g, 0, -KH * 1.04 + kidY, t) });
    }
    // 날아가는 팔·목 후프
    for (const f of flyers) {
      f.t += dt; f.vy += 1400 * dt; f.x += f.vx * dt; f.y += f.vy * dt; f.spin += dt * 9;
      const R = ellipseRing(f.x, f.y, f.r, f.r * (0.3 + 0.25 * Math.sin(f.spin)), f.spin * 0.5);
      for (const part of ["back", "front"]) st.add({ z: 3, draw: g => drawRing(g, R, part, { thick: f.thick, roll: f.spin, alpha: Math.max(0, 1 - f.t / 0.9), glow: 0, magic: false, stripes: 8 }) });
    }
    for (let k = flyers.length - 1; k >= 0; k--) if (flyers[k].t > 0.9) flyers.splice(k, 1);

    // 반짝이: 요술 후프·높이 최고
    if (list.length && (magic || glow > 0) && Math.random() < (magic ? 0.9 : 0.35)) {
      const h = list[(Math.random() * list.length) | 0], p = ringPt(h.R, Math.random() * Math.PI);
      st.sparkle(p.x, p.y, magic ? null : "#fff36b");
    }
    // 박자 고리(태오·몸으로): 후프 앞을 줄어드는 고리, 겹치면 톡
    if (s.helper && s.phase === "play" && isFinite(s.nextIn) && list[0]) {
      const k = Math.max(0, Math.min(1, s.nextIn / 0.9)), hot = s.nextIn <= s.window;
      const R0 = list[0].R, front = ringPt(R0, Math.PI / 2);
      st.add({ z: 4, draw: g => {
        g.lineWidth = 7; g.strokeStyle = hot ? "rgba(255,243,107,.95)" : "rgba(255,235,90,.6)";
        g.beginPath(); g.ellipse(R0.cx, R0.cy, Math.hypot(R0.ux, R0.uy) + 16, Math.hypot(R0.vx, R0.vy) + 10, 0, 0, TAU); g.stroke();
        g.lineWidth = 6; g.strokeStyle = hot ? "#ffffff" : "rgba(255,255,255,.9)";
        g.beginPath(); g.ellipse(R0.cx, R0.cy, Math.hypot(R0.ux, R0.uy) + 16 + k * 170, Math.hypot(R0.vx, R0.vy) + 10 + k * 70, 0, 0, TAU); g.stroke();
        star(g, front.x, front.y + 4, hot ? 22 : 14, hot ? "#fff36b" : "rgba(255,255,255,.85)");
      } });
    }
    // 요술 후프 터지는 무지개 고리(정답 순간)
    if (burstRing > 0) {
      const q = 1 - burstRing / 0.9;
      st.add({ z: 6, draw: g => {
        for (let k = 0; k < 5; k++) {
          g.globalAlpha = (1 - q) * 0.8; g.lineWidth = 16 - k * 2; g.strokeStyle = `hsl(${k * 70 + st.t * 200},95%,62%)`;
          g.beginPath(); g.ellipse(0, -KH * 0.53, 60 + q * (500 + k * 40), 20 + q * (170 + k * 14), 0, 0, TAU); g.stroke();
        }
        g.globalAlpha = 1;
      } });
    }
    st.flush(dt);
    // 화면 겹: 번쩍, 손가락 자취, 빠르기 막대
    const g = st.g;
    g.setTransform(st.dpr, 0, 0, st.dpr, 0, 0);
    if (magicFlash > 0) { g.fillStyle = `rgba(255,255,255,${magicFlash * 0.7})`; g.fillRect(0, 0, st.W, st.H); }
    if (s.mode === "circle" && !replaying && !demo) {
      ratioShow += ((s.phase === "play" ? s.ratio : 1) - ratioShow) * Math.min(1, dt * 8);
      const drawing = s.trail && s.trail.length > 3;
      if (drawing) idleHint = 0; else if (s.phase === "play") idleHint += dt;
      if (s.trail) fingerTrail(g, s.trail, s);
      if (s.phase === "play" || s.phase === "ready") gauge(g, s);
      if ((s.phase === "ready" || idleHint > 1.2) && !s.camera) circleHint(g, s);
    }
  }

  /* ---------- 화면 겹 그림 ---------- */
  // 손가락 자취: 띠 안 = 초록 빛, 느림 = 주황, 빠름 = 하늘
  function fingerTrail(g, tr, s) {
    if (tr.length < 2) return;
    const r = s.ratio, inBand = Math.abs(r - 1) <= s.band;
    const col = inBand ? "120,255,140" : r < 1 ? "255,170,60" : "110,200,255";
    g.lineCap = "round"; g.lineJoin = "round";
    for (let k = 1; k < tr.length; k++) {
      const a = tr[k - 1], b = tr[k];
      g.globalAlpha = Math.max(0, b.a) * 0.9; g.strokeStyle = `rgba(${col},1)`; g.lineWidth = 6 + b.a * 16;
      g.beginPath(); g.moveTo(a.x * st.W, a.y * st.H); g.lineTo(b.x * st.W, b.y * st.H); g.stroke();
    }
    const L = tr[tr.length - 1];
    g.globalAlpha = 1; g.fillStyle = "#fff"; g.beginPath(); g.arc(L.x * st.W, L.y * st.H, 11, 0, TAU); g.fill();
    g.globalAlpha = 0.45; g.fillStyle = `rgb(${col})`; g.beginPath(); g.arc(L.x * st.W, L.y * st.H, 24, 0, TAU); g.fill();
    g.globalAlpha = 1;
  }
  // 빠르기 막대(아래 가운데 — 동그라미 모드는 큰 톡 버튼이 없어 비어 있다): 느려요 | 딱 좋아! | 빨라요 — 손가락 빠르기 공이 움직인다
  function gauge(g, s) {
    let w = Math.min(460, st.W * 0.62), x0 = (st.W - w) / 2;
    const h = Math.max(26, Math.min(38, st.H * 0.045)), y0 = st.H - h - Math.max(16, st.H * 0.035);
    // 가로 화면: 아이 다리를 가리지 않게 왼쪽 빈 곳으로
    if (st.W > st.H) { const ar = st.rectPx(-KH * 0.3, lastKidY - KH, KH * 0.3, lastKidY); if (ar.y + ar.h > y0 - 6 && ar.x - 30 >= 230) { w = Math.min(460, ar.x - 36); x0 = 16; } }
    const span = 0.9;                                    // 비율 1±0.9 를 막대 끝으로
    const pos = r => x0 + w * Math.max(0, Math.min(1, 0.5 + (r - 1) / (2 * span)));
    g.save();
    g.globalAlpha = 0.92;
    g.fillStyle = "rgba(20,30,70,.55)"; g.beginPath(); g.roundRect(x0 - 6, y0 - 6, w + 12, h + 12, (h + 12) / 2); g.fill();
    const grd = g.createLinearGradient(x0, 0, x0 + w, 0);
    grd.addColorStop(0, "#ff7a3d"); grd.addColorStop(0.5 - s.band / (2 * span) - 0.02, "#ffc23d");
    grd.addColorStop(0.5 - s.band / (2 * span), "#5bea6b"); grd.addColorStop(0.5 + s.band / (2 * span), "#5bea6b");
    grd.addColorStop(0.5 + s.band / (2 * span) + 0.02, "#7fd0ff"); grd.addColorStop(1, "#3d8bff");
    g.fillStyle = grd; g.beginPath(); g.roundRect(x0, y0, w, h, h / 2); g.fill();
    // 딱 좋아 띠 테두리
    const b0 = pos(1 - s.band), b1 = pos(1 + s.band);
    g.globalAlpha = 1; g.lineWidth = 3; g.strokeStyle = "#fff"; g.beginPath(); g.roundRect(b0, y0 - 3, b1 - b0, h + 6, 8); g.stroke();
    g.font = `900 ${Math.round(h * 0.52)}px Pretendard Variable, Pretendard, system-ui, sans-serif`; g.textAlign = "center"; g.textBaseline = "middle";
    g.fillStyle = "rgba(40,20,0,.85)"; g.fillText("느려요", x0 + (b0 - x0) / 2, y0 + h / 2 + 1);
    // "딱 좋아!" 는 막대 위 꼬리표로(빠르기 공이 글자를 덮지 않게)
    { const tx = (b0 + b1) / 2, fs = Math.round(h * 0.5), tw = g.measureText("딱 좋아!").width + 16, ty = y0 - 12 - fs * 0.6;
      g.fillStyle = "#1f9d3a"; g.beginPath(); g.roundRect(tx - tw / 2, ty - fs * 0.75, tw, fs * 1.5, fs * 0.75); g.fill();
      g.beginPath(); g.moveTo(tx - 6, ty + fs * 0.7); g.lineTo(tx + 6, ty + fs * 0.7); g.lineTo(tx, ty + fs * 0.7 + 7); g.closePath(); g.fill();
      g.fillStyle = "#fff"; g.fillText("딱 좋아!", tx, ty + 1); }
    g.fillStyle = "rgba(0,20,60,.85)"; g.fillText("빨라요", b1 + (x0 + w - b1) / 2, y0 + h / 2 + 1);
    // 공(내 빠르기)
    const bx = pos(ratioShow), ok = Math.abs(ratioShow - 1) <= s.band;
    g.fillStyle = "rgba(0,0,0,.25)"; g.beginPath(); g.arc(bx, y0 + h / 2 + 3, h * 0.62, 0, TAU); g.fill();
    g.fillStyle = ok ? "#ffffff" : "#ffe9c2"; g.strokeStyle = ok ? "#1f9d3a" : "#c2410c"; g.lineWidth = 4;
    g.beginPath(); g.arc(bx, y0 + h / 2, h * 0.6, 0, TAU); g.fill(); g.stroke();
    g.fillStyle = ok ? "#1f9d3a" : "#c2410c"; g.font = `900 ${Math.round(h * 0.6)}px system-ui, sans-serif`; g.fillText("⭕", bx, y0 + h / 2 + 1);
    g.restore();
  }
  // 동그라미 알려 주기: 오른쪽 아래에 점선 원 + 손가락이 빙글
  function circleHint(g, s) {
    const cx = st.W * (st.W > st.H ? 0.8 : 0.72), cy = st.H * 0.72, r = Math.min(st.W, st.H) * 0.11;
    const a = st.t * TAU / (s.period || 1);
    g.save(); g.globalAlpha = 0.85; g.setLineDash([10, 12]); g.lineWidth = 6; g.strokeStyle = "#ffffff";
    g.beginPath(); g.arc(cx, cy, r, 0, TAU); g.stroke(); g.setLineDash([]);
    g.font = `${Math.round(r * 0.55)}px system-ui, sans-serif`; g.textAlign = "center"; g.textBaseline = "middle";
    g.fillText("👆", cx + Math.cos(a) * r, cy + Math.sin(a) * r + r * 0.15);
    g.font = `900 ${Math.round(Math.max(16, r * 0.26))}px Pretendard Variable, Pretendard, system-ui, sans-serif`;
    g.lineWidth = 5; g.strokeStyle = "rgba(20,30,90,.8)"; g.fillStyle = "#fff";
    g.strokeText("빙글빙글!", cx, cy + r + r * 0.42); g.fillText("빙글빙글!", cx, cy + r + r * 0.42);
    g.restore();
  }
  function star(g, x, y, r, col) {
    g.fillStyle = col; g.beginPath();
    for (let k = 0; k < 10; k++) { const rr = k % 2 ? r * 0.45 : r, a = -Math.PI / 2 + (k * Math.PI) / 5; g.lineTo(x + Math.cos(a) * rr, y + Math.sin(a) * rr); }
    g.closePath(); g.fill();
  }
  function dizzy(g, x, y, t) {
    for (let k = 0; k < 3; k++) { const a = t * 6 + (k * TAU) / 3; star(g, x + Math.cos(a) * 70, y + Math.sin(a) * 18, 15, k === 1 ? "#ffd23f" : "#fff36b"); }
  }

  let lastS = null;
  return {
    stage: st,
    actorRect() { return st.rectPx(-KH * 0.26, lastKidY - KH, KH * 0.26, lastKidY); },
    render(s, dt) { lastS = s; if (!replaying) scene(s, dt); },
    cue(ev) {
      const s = lastS;
      switch (ev.type) {
        case "ok":
          if (ev.grade === "perfect" || ev.grade === "magic") { st.burst(0, -KH * 0.45, { n: ev.grade === "magic" ? 10 : 16, speed: 420, spread: 1.4, colors: [PINK, YELLOW, "#ffffff"] }); }
          if (ev.combo % 5 === 0) { hopT = 0.45; st.punch(0.03); }
          if (ev.combo % 10 === 0) st.cheerUp(1);
          break;
        case "hoopUp":
          hoopIn.push({ key: ev.hoops - 1, t: 0 }); hopT = 0.45;
          st.punch(0.08); st.cheerUp(1.3); st.shake(0.4);
          st.burst(0, -KH * 0.6, { n: 44, speed: 760, colors: [PINK, YELLOW, "#fff7a8", "#ffffff", "#7cff6b"] });
          break;
        case "slip": oopsT = 0.3; st.shake(0.35); if (ev.lost && s) throwExtras(s, ev.lost); break;
        case "wobble": st.shake(0.2); break;
        case "drop":
          if (s) {
            const i = frameFor(s.phi), W = waistHoop(i, s.phi), sag = 1 - smooth(Math.max(0, s.h) / 0.7);
            dropFrom = { cx: W.cx, cy: W.cy + sag * KH * 0.27, rx: W.rx, ry: W.ry };
            throwExtras(s, (s.hoops || 1) - 1);
          }
          st.shake(1); st.cheerUp(0.3);
          break;
        case "magic":
          magicFlash = 1; burstRing = 0.9; st.cheerUp(1.3); st.punch(0.1);
          if (s) hoopIn.push({ key: Math.max(1, (ev.hoops || 2) - 1), t: 0 });
          st.burst(0, -KH * 0.5, { n: 70, speed: 950, colors: ["#ff4d6d", "#ffd23f", "#3ec1ff", "#7cff6b", "#b98bff", "#ffffff"] });
          break;
        case "tempo": st.punch(0.04); break;
        case "go": st.cheerUp(0.8); break;
        case "done": st.cheerUp(1.3); st.burst(0, -KH * 0.6, { n: 40, speed: 700 }); break;
      }
    },
    // 느린 다시 보기: 허리 가까이 + 0.4배속 + 위아래 검은 띠
    replay(clip, { speed = 0.4, label = "" } = {}) {
      return new Promise(resolve => {
        const tag = document.createElement("div"); tag.className = "replay-tag"; tag.innerHTML = `<b>다시 보기</b><span></span>`;
        tag.querySelector("span").textContent = label; root.appendChild(tag);
        const bars = document.createElement("div"); bars.className = "letterbox"; root.appendChild(bars);
        const len = clip.frames[clip.frames.length - 1].t;
        let u = clip.frames[0].t, last = performance.now(), raf = 0, prevU = u;
        const end = () => { cancelAnimationFrame(raf); replaying = false; tag.remove(); bars.remove(); root.removeEventListener("pointerdown", end); resolve(); };
        root.addEventListener("pointerdown", end);
        replaying = true;
        const tick = now => {
          const step = Math.min(0.05, (now - last) / 1000) * speed; last = now; u += step;
          if (u >= len) { end(); return; }
          let i = 0; while (i < clip.frames.length - 1 && clip.frames[i + 1].t <= u) i++;
          const f = clip.frames[i].s;
          st.lookAt(0, -KH * 0.55, 1.45);
          scene({ ...f, trail: null }, Math.max(0.001, u - prevU)); prevU = u;
          raf = requestAnimationFrame(tick);
        };
        raf = requestAnimationFrame(tick);
      });
    },
    destroy() { st.destroy(); },
  };

  // 덤 후프가 툭 빠져 날아감(실수·떨어짐)
  function throwExtras(s, count) {
    if (!count) return;
    const i = frameFor(s.phi), hd = hands(i), nk = neck(i);
    const spots = s.mode === "circle" || (kid.level || 0) >= 2 ? [hd.r, nk, hd.l] : [{ x: 0, y: -KH * 0.46 }, { x: 0, y: -KH * 0.6 }, { x: 0, y: -KH * 0.5 }];
    const have = (s.hoops || 1) - 1;
    for (let k = 0; k < count && k < 3; k++) {
      const p = spots[Math.max(0, have - 1 - k)] || spots[0];
      flyers.push({ x: p.x, y: p.y, vx: (k % 2 ? -1 : 1) * (380 + Math.random() * 200), vy: -700 - Math.random() * 200, r: KH * 0.11, thick: KH * 0.016, spin: 0, t: 0 });
    }
  }
}
