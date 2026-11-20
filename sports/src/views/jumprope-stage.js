// 줄넘기 겉모습(2.5D 무대): 경기장 배경 + 아이 Actor(아틀라스 또는 자리표시) + 코드로 그린 줄(타이밍이 정확하게).
// 약속: createView({ root, kid, cast, demo, juice }) → { render(snap, dt), cue(ev), replay(clip, {speed,label}) → Promise, destroy() }
import { createStage } from "../render/stage.js?v=1";
import { createActor, loadKidSprites } from "../render/sprites.js?v=1";

const H = 340;                          // 아이 키(world)
const TAU = Math.PI * 2;
const ACTIONS = ["idle", "jump", "cheer", "sad", "run"];

export function createView({ root, kid, cast = [], demo = false, frame = null, safe = null }) {
  const st = createStage(root, { eventId: "jumprope" });
  const me = { id: kid.id, actor: null };
  const others = cast.filter(id => id !== kid.id).map(id => ({ id, actor: null }));
  // 그림 묶음은 비동기로 읽는다(읽기 전에는 아무것도 안 그림 → 바로 자리표시가 뜬다)
  loadKidSprites(kid.id, ACTIONS).then(s => { me.actor = createActor(s); });
  others.forEach(o => loadKidSprites(o.id, ACTIONS).then(s => { o.actor = createActor(s); }));

  let lastLift = 0, trail = [], wasAir = false, landT = 0, takeoffT = 0, cheerT = 0, sadT = 0, kidX = 0, entering = 0, replaying = false, rainbowT = 0;

  /* ---------- 줄 ---------- */
  // 두 손 (lx,ly)-(rx,ry) 사이 반달. theta 0 = 머리 위, PI = 발밑. up/down = 손 높이에서 위·아래로 얼마나.
  function ropePoints(lx, ly, rx, ry, up, down, theta) {
    const c = Math.cos(theta), off = c >= 0 ? -c * up : -c * down, pts = [];
    const depth = Math.sin(theta) * 0.1;      // 앞쪽일 때 조금 넓게(원근)
    for (let i = 0; i <= 22; i++) {
      const u = i / 22, b = Math.pow(Math.sin(Math.PI * u), 0.85);
      pts.push({ x: lx + (rx - lx) * u + (u - 0.5) * (rx - lx) * depth * b, y: ly + (ry - ly) * u + off * b });
    }
    return pts;
  }
  function stroke(g, pts, w, color, alpha = 1) {
    g.globalAlpha = alpha; g.lineWidth = w; g.strokeStyle = color; g.lineCap = "round"; g.lineJoin = "round";
    g.beginPath(); pts.forEach((p, i) => (i ? g.lineTo(p.x, p.y) : g.moveTo(p.x, p.y))); g.stroke();
  }
  function drawRope(g, pts, s, ghost) {
    const gold = s.dbl === "warn" || s.dbl === "spin";
    const a = ghost ? 0.22 : 1;
    if (s.rainbow) {
      stroke(g, pts, ghost ? 18 : 15, "rgba(60,20,80,.55)", a);
      for (let i = 1; i < pts.length; i++) {
        g.globalAlpha = a; g.lineWidth = ghost ? 13 : 10; g.strokeStyle = `hsl(${(i * 16 + st.t * 260) % 360},95%,60%)`;
        g.beginPath(); g.moveTo(pts[i - 1].x, pts[i - 1].y); g.lineTo(pts[i].x, pts[i].y); g.stroke();
      }
    } else {
      stroke(g, pts, ghost ? 18 : 15, gold ? "#7a4b00" : "#6d1238", a);
      stroke(g, pts, ghost ? 13 : 10, gold ? "#ffcc1f" : "#ff3f86", a);
    }
    if (!ghost) stroke(g, pts.map(p => ({ x: p.x - 1.5, y: p.y - 2.5 })), 3, "rgba(255,255,255,.65)", 1);
    g.globalAlpha = 1;
  }
  function handle(g, x, y, ang) {
    g.save(); g.translate(x, y); g.rotate(ang);
    const gr = g.createLinearGradient(-9, 0, 9, 0); gr.addColorStop(0, "#c77b2a"); gr.addColorStop(0.5, "#ffd18a"); gr.addColorStop(1, "#a85d18");
    g.fillStyle = "#5c3311"; g.beginPath(); g.roundRect(-11, -30, 22, 60, 10); g.fill();
    g.fillStyle = gr; g.beginPath(); g.roundRect(-8, -27, 16, 54, 8); g.fill();
    g.restore();
  }

  // 진짜 그림(줄이 그림 안에 있는 아틀라스): 줄 각도 → 프레임. events.contact = 줄이 발밑, events.top = 줄이 머리 위.
  // 두 점 사이를 따로 늘여 맞춘다(영상에서 뽑은 프레임은 반 바퀴씩 길이가 다르다).
  function ropeFrame(at, theta) {
    const n = at.frames.length, ev = at.events || {}, c = ev.contact != null ? ev.contact : 0;
    const top = ev.top != null ? ev.top : (c + Math.round(n / 2)) % n;
    const up = (top - c + n) % n || Math.round(n / 2), down = n - up;
    const u = ((((theta - Math.PI) % TAU) + TAU) % TAU) / TAU;
    return Math.round(u < 0.5 ? c + (u / 0.5) * up : top + ((u - 0.5) / 0.5) * down) % n;
  }
  function halo(g, x, y, r, rainbow, t) {
    for (let i = 0; i < 6; i++) {
      g.globalAlpha = 0.16; g.strokeStyle = rainbow ? `hsl(${(i * 60 + t * 200) % 360},95%,62%)` : "#ffd23f"; g.lineWidth = 18;
      g.beginPath(); g.ellipse(x, y, r * (1 + i * 0.05), r * 1.25 * (1 + i * 0.05), 0, 0, TAU); g.stroke();
    }
    g.globalAlpha = 1;
  }

  /* ---------- 한 장면 그리기 ---------- */
  function scene(s, dt) {
    const train = !!s.train;
    const realRope = !!(me.actor && !train && me.actor.atlas("jump") && me.actor.atlas("jump").rope);
    const air = s.h > 0.02;
    // 착지·도약 순간(찌그러짐)
    if (air && !wasAir) takeoffT = 0.12;
    if (!air && wasAir) { landT = 0.16; st.dust(kidX, 0); }
    wasAir = air;
    takeoffT = Math.max(0, takeoffT - dt); landT = Math.max(0, landT - dt);
    cheerT = Math.max(0, cheerT - dt); sadT = Math.max(0, sadT - dt); rainbowT = Math.max(0, rainbowT - dt);
    const lift = s.h * H * (realRope ? 0.2 : 0.5);   // 진짜 그림은 줄넘기 동작이 이미 들어 있어 몸은 조금만 띄운다
    lastLift = lift;
    st.setKidHeight(H);
    // 기차: 줄 밖에서 기다리다 쏙 들어간다
    const outX = -430;
    if (train && !s.inRope) kidX = outX;
    else if (entering > 0) { entering = Math.max(0, entering - dt * 3); kidX = outX * entering; }
    else kidX = 0;

    // 카메라
    if (!replaying) {
      st.fit(train ? 1400 : 560);
      // 안전 구역(layout.js): 발은 톡 버튼 띠 위, 머리(+ 머리 위 줄)는 알림 띠 아래. 시연은 메뉴 카드 옆 빈 칸.
      const sa = safe ? safe() : null;
      st.overscan = !!demo;
      if (sa) st.frameKid({ x: kidX * 0.3, kidH: H * (kid.scale || 1), sa, zoom: 1, headPadW: H * (demo ? 0.22 : 0.08), footPadW: s.helper ? 30 : 12, feetY: -lift * 0.25 });
      else {
        const fr = frame ? frame() : null, v = st.view();
        const camY = fr && fr.feet != null ? -(fr.feet - 0.5) * v.h : -275;
        st.lookAt(kidX * 0.3 + (fr ? (fr.x || 0) * v.w : 0), camY - lift * 0.25, fr && fr.zoom ? fr.zoom : 1);
      }
    }
    st.begin(dt);

    // 줄 위치
    let L, R, up, down;
    if (train) { L = { x: -600, y: -175 }; R = { x: 600, y: -175 }; up = 360; down = 175; }
    else { L = { x: kidX - H * 0.33, y: -H * 0.5 - lift }; R = { x: kidX + H * 0.33, y: -H * 0.5 - lift }; up = H * 0.72; down = H * 0.5 + lift - 4; }
    const pts = ropePoints(L.x, L.y, R.x, R.y, up, down, s.theta);
    const front = Math.sin(s.theta) > 0;
    trail.unshift({ pts, front }); if (trail.length > 4) trail.length = 4;
    const ropeLayer = side => ({ z: side ? 10 : -10, draw: g => {
      for (let i = trail.length - 1; i >= 1; i--) if (trail[i].front === side) drawRope(g, trail[i].pts, s, true);
      if (front === side) drawRope(g, pts, s, false);
    } });
    if (!realRope) { st.add(ropeLayer(false)); st.add(ropeLayer(true)); }
    else if (s.rainbow || s.dbl) st.add({ z: -1, draw: g => halo(g, kidX, -H * 0.5 - lift, H * 0.42, s.rainbow, st.t) });   // 줄이 그림 안이라 빛 테로 보상·금빛 줄을 보인다
    if ((s.rainbow || s.dbl) && Math.random() < (realRope ? 0.95 : 0.7)) { const p = pts[(Math.random() * pts.length) | 0]; st.sparkle(p.x, p.y, s.rainbow ? null : "#ffd23f"); }
    if (s.phase === "play" && Math.abs(Math.cos(s.theta) + 1) < 0.02 && (!train || s.inRope)) st.dust(train ? 0 : kidX, 0);

    // 아이(나)
    const actor = me.actor;
    if (actor) {
      let sq = { x: 1, y: 1 };
      if (takeoffT > 0) sq = { x: 1.12, y: 0.86 };
      else if (landT > 0) { const q = landT / 0.16; sq = { x: 1 + 0.14 * q, y: 1 - 0.16 * q }; }
      else if (air) sq = { x: 0.94, y: 1.07 };
      if (realRope) actor.scrubFrame("jump", ropeFrame(actor.atlas("jump"), s.phase === "ready" ? s.theta + s.phaseT * TAU / s.period : s.theta));
      else if (s.phase === "trip" || sadT > 0) actor.play("sad");
      else if (train && !s.inRope) actor.play("run");
      else if (air) actor.scrub(s.big || cheerT > 0 ? "cheer" : "jump", Math.min(1, s.h));
      else if (cheerT > 0 && s.phase !== "play") actor.play("cheer");
      else actor.play("idle");
      actor.update(dt);
      if (realRope) sq = { x: 1 + (sq.x - 1) * 0.5, y: 1 + (sq.y - 1) * 0.5 };    // 진짜 그림은 살짝만
      const KH = realRope ? H * (kid.scale || 1) : H;   // 진짜 그림: 아이마다 키 배율(태오가 더 작다)
      st.add({ z: 0, draw: g => actor.draw(g, kidX, -lift, KH, { squash: sq, ground: 0, tilt: s.phase === "trip" ? -0.18 : 0 }) });
      if (!realRope && (!train || s.inRope)) {
        st.add({ z: 5, draw: g => { handle(g, L.x, L.y, -0.3); handle(g, R.x, R.y, 0.3); } });
      }
    }
    // 기차: 줄 돌리는 사촌 둘 + 같이 뛰는 친구
    if (train) {
      const turners = others.slice(0, 2);
      turners.forEach((o, i) => {
        if (!o.actor) return;
        o.actor.play("idle"); o.actor.update(dt);
        const x = i ? 680 : -680;
        st.add({ z: -2, draw: g => { o.actor.draw(g, x, 0, H * 0.95, { flip: i === 1, ground: 0 }); handle(g, i ? 600 : -600, -175, i ? 0.4 : -0.4); } });
      });
      const riders = others.slice(2);
      for (let j = 1; j < s.jumpers && j - 1 < riders.length; j++) {
        const o = riders[j - 1]; if (!o.actor) continue;
        const x = kidX - j * 190, l = lift;
        o.actor.play(l > 2 ? "cheer" : "idle"); o.actor.update(dt);
        st.add({ z: -1 - j * 0.1, draw: g => o.actor.draw(g, x, -l, H * 0.88, { ground: 0 }) });
      }
      if (!s.inRope && s.phase === "play") {
        const f = s.sinceCross / s.period, ok = f >= s.entry[0] && f <= s.entry[1];
        st.add({ z: 20, draw: g => bubble(g, kidX, -H - 70, ok ? "지금! 쏙" : "기다려…", ok) });
      }
    }
    // 알려 주는 고리(줄이 발에 올 때까지 줄어드는 고리 — 겹칠 때 톡)
    if (s.helper && s.phase === "play" && (!train || s.inRope) && isFinite(s.nextIn)) {
      const k = Math.max(0, Math.min(1, (s.nextIn - s.lead) / 0.9));
      st.add({ z: -5, draw: g => {
        g.lineWidth = 8; g.strokeStyle = "rgba(255,235,90,.85)"; g.beginPath(); g.ellipse(train ? 0 : kidX, 0, 120, 30, 0, 0, Math.PI * 2); g.stroke();
        g.lineWidth = 7; g.strokeStyle = k < 0.07 ? "#fff36b" : "rgba(255,255,255,.95)";
        g.beginPath(); g.ellipse(train ? 0 : kidX, 0, 120 + k * 260, 30 + k * 64, 0, 0, Math.PI * 2); g.stroke();
      } });
    }
    st.flush(dt);
    if (rainbowT > 0) { st.g.setTransform(st.dpr, 0, 0, st.dpr, 0, 0); st.g.fillStyle = `rgba(255,255,255,${rainbowT * 0.6})`; st.g.fillRect(0, 0, st.W, st.H); }
  }

  function bubble(g, x, y, text, hot) {
    g.font = "900 46px Pretendard Variable, Pretendard, system-ui, sans-serif"; g.textAlign = "center"; g.textBaseline = "middle";
    const w = g.measureText(text).width + 50;
    g.fillStyle = hot ? "#ffe14a" : "rgba(255,255,255,.88)"; g.strokeStyle = hot ? "#a35b00" : "rgba(40,60,120,.5)"; g.lineWidth = 5;
    g.beginPath(); g.roundRect(x - w / 2, y - 36, w, 72, 36); g.fill(); g.stroke();
    g.fillStyle = hot ? "#5a2b00" : "#2a3a6a"; g.fillText(text, x, y + 2);
  }

  return {
    stage: st,
    // 주인공 상자(화면 px) — 검증용
    actorRect() { const KH = H * (kid.scale || 1), lf = lastLift; return st.rectPx(kidX - KH * 0.26, -lf - KH, kidX + KH * 0.26, -lf); },
    render(s, dt) { if (!replaying) scene(s, dt); },
    cue(ev) {
      switch (ev.type) {
        case "ok": if (ev.grade === "perfect") { st.punch(0.035); st.burst(kidX, -20, { n: 14, speed: 420, spread: 1.2 }); } if (ev.combo % 10 === 0) st.cheerUp(1); break;
        case "double": cheerT = 0.9; st.punch(0.1); st.shake(0.6); st.cheerUp(1.3); st.burst(kidX, -H * 0.6, { n: 40, speed: 700, colors: ["#ffd23f", "#fff7a8", "#ffffff", "#ff9a1f"] }); break;
        case "miss": sadT = 0.7; st.shake(1); break;
        case "save": st.burst(kidX, -10, { n: 30, colors: ["#ff4d6d", "#ffd23f", "#3ec1ff", "#7cff6b", "#b98bff"], speed: 500 }); break;
        case "rainbow": rainbowT = 1; st.cheerUp(1.2); st.burst(0, -H * 0.5, { n: 60, speed: 900, colors: ["#ff4d6d", "#ffd23f", "#3ec1ff", "#7cff6b", "#b98bff"] }); break;
        case "enter": entering = 1; st.cheerUp(0.6); break;
        case "join": st.cheerUp(1); st.punch(0.05); break;
        case "go": st.cheerUp(0.8); break;
        case "done": cheerT = 2; st.cheerUp(1.2); break;
      }
    },
    // 느린 다시 보기: 아래에서 올려다보는 가까운 카메라 + 0.4배속 + 위아래 검은 띠
    replay(clip, { speed = 0.4, label = "" } = {}) {
      return new Promise(resolve => {
        const tag = document.createElement("div"); tag.className = "replay-tag"; tag.innerHTML = `<b>다시 보기</b><span></span>`;
        tag.querySelector("span").textContent = label; root.appendChild(tag);
        const bars = document.createElement("div"); bars.className = "letterbox"; root.appendChild(bars);
        const len = clip.frames[clip.frames.length - 1].t;
        let u = 0, last = performance.now(), raf = 0, prevU = 0;
        const end = () => { cancelAnimationFrame(raf); replaying = false; tag.remove(); bars.remove(); root.removeEventListener("pointerdown", end); resolve(); };
        root.addEventListener("pointerdown", end);
        replaying = true;
        const tick = now => {
          const step = Math.min(0.05, (now - last) / 1000) * speed; last = now; u += step;
          if (u >= len) { end(); return; }
          let i = 0; while (i < clip.frames.length - 1 && clip.frames[i + 1].t <= u) i++;
          const f = clip.frames[i].s;
          st.lookAt(kidX * 0.5, -230 - f.h * 60, 1.35);
          scene(f, Math.max(0.001, u - prevU)); prevU = u;
          raf = requestAnimationFrame(tick);
        };
        raf = requestAnimationFrame(tick);
      });
    },
    destroy() { st.destroy(); },
  };
}
