// 종목: 농구 슛 대회. 규칙은 basketball-rules.js, 공 물리는 basketball-physics.js, 그림은 view(views/basketball-stage.js).
// 여기는 입력(뒤로 당겼다 놓기)·공 날리기·진행·문제·소리·점수판.
// 판: 1 골밑 슛 → 보너스 문제(자석 골대) → 2 중거리 슛 → 보너스 문제 → 3 3점 슛 대회(랙 5개, 랙마다 마지막 공 = 머니볼 ×2).
import * as R from "./basketball-rules.js?v=1";
import * as Ph from "./basketball-physics.js?v=1";
import { context, output, isOn } from "../sfx.js?v=1";

const VIEWS = {
  stage: () => import("../views/basketball-stage.js?v=1"),
};

export default {
  id: "basketball",
  name: "농구",
  icon: "🏀",
  howTo: "뒤로 당겼다 놓으면 슛!",
  cameraMode: true,
  gestures: ["throw"],
  cameraLabel: "진짜로 던지기",
  demo: false,
  medals: (level, quizOn = true) => R.medalTable(level, quizOn),
  views: VIEWS,
  start,
};

// 농구 소리(그 자리에서 합성): 그물 쉭·림 쨍·백보드 쿵·바닥 통. 셸 sfx 의 AudioContext·출력에 붙인다.
function makeSounds(muted) {
  const ok = () => { if (muted) return null; const a = context(), m = output(); return a && m && a.state === "running" && isOn() ? a : null; };
  let nb = null;
  function noise(a, dur, vol, type, f0, f1, q = 1) {
    if (!nb) { nb = a.createBuffer(1, a.sampleRate, a.sampleRate); const d = nb.getChannelData(0); for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1; }
    const s = a.createBufferSource(), f = a.createBiquadFilter(), g = a.createGain(), t = a.currentTime;
    s.buffer = nb; s.loop = true; f.type = type; f.Q.value = q; f.frequency.setValueAtTime(f0, t); f.frequency.exponentialRampToValueAtTime(f1, t + dur);
    g.gain.setValueAtTime(0.0001, t); g.gain.linearRampToValueAtTime(vol, t + Math.min(0.03, dur * 0.2)); g.gain.exponentialRampToValueAtTime(0.0008, t + dur);
    s.connect(f); f.connect(g); g.connect(output()); s.start(t); s.stop(t + dur + 0.02);
  }
  function tone(a, freq, dur, type, vol, slide) {
    const o = a.createOscillator(), g = a.createGain(), t = a.currentTime;
    o.type = type; o.frequency.setValueAtTime(freq, t); if (slide) o.frequency.exponentialRampToValueAtTime(slide, t + dur);
    g.gain.setValueAtTime(0.0001, t); g.gain.linearRampToValueAtTime(vol, t + 0.004); g.gain.exponentialRampToValueAtTime(0.0008, t + dur);
    o.connect(g); g.connect(output()); o.start(t); o.stop(t + dur + 0.02);
  }
  return {
    swish() { const a = ok(); if (!a) return; noise(a, 0.32, 0.12, "highpass", 2500, 7000, 0.7); noise(a, 0.22, 0.05, "bandpass", 5000, 3000, 2); },
    rim(p = 0.6) { const a = ok(); if (!a) return; const v = 0.03 + p * 0.06; tone(a, 1180, 0.32, "triangle", v); tone(a, 1790, 0.22, "sine", v * 0.7); tone(a, 2630, 0.12, "sine", v * 0.5); noise(a, 0.05, v, "bandpass", 3000, 2000, 3); },
    board(p = 0.6) { const a = ok(); if (!a) return; tone(a, 150, 0.16, "sine", 0.08 + p * 0.06, 90); noise(a, 0.1, 0.06, "lowpass", 900, 300); },
    floor(p = 0.5) { const a = ok(); if (!a) return; tone(a, 110, 0.12, "sine", 0.04 + p * 0.07, 60); noise(a, 0.05, 0.03, "lowpass", 600, 200); },
    release() { const a = ok(); if (!a) return; noise(a, 0.18, 0.05, "bandpass", 600, 2400, 1.4); },
    magnet() { const a = ok(); if (!a) return; for (let i = 0; i < 6; i++) setTimeout(() => { const b = ok(); if (b) tone(b, 520 + i * 160, 0.25, "sine", 0.05, 900 + i * 200); }, i * 45); },
  };
}

async function start(ctx) {
  const { kid, sfx, juice, hud } = ctx;
  const level = kid.level;
  const camera = !!ctx.camera;
  const quizOn = !ctx.demo && ctx.quiz.enabled;
  const snd = makeSounds(!!ctx.demo);
  const s = R.createRun({ level, camera, scale: kid.scale || undefined, kid: kid.id });
  let stopped = false, view = null, busy = false, T = 0;

  const viewKind = VIEWS[ctx.viewKind] ? ctx.viewKind : "stage";
  const mod = await VIEWS[viewKind]();
  if (stopped) return;
  view = mod.createView({ root: ctx.root, kid, demo: !!ctx.demo, juice, frame: ctx.frame || null, safe: ctx.safe || null });

  if (!ctx.demo) {
    hud.show({ kid, score: 0, round: R.roundDef(s, 0).name, line: R.roundDef(s, 0).line });
    const tb = document.getElementById("tapBtn"); if (tb) tb.hidden = true;     // 농구는 큰 톡 버튼 대신 당겼다 놓기
  }

  /* ---------- 상태(그림용) ---------- */
  const balls = [];              // 날아가는 공 { shot, b, resolved }
  const launches = [];           // 손을 떠나기 기다리는 공 { shot, at }
  let pose = { name: "idle", t: 0, u: 0, u0: 0 };
  let idleT = 0;                 // 공을 들고 가만히 있는 시간(4초면 손가락 알려 주기 다시 · 태오는 2.5초)
  let kidX = s.spot.x, netAt = -9, netPow = 0, shotsTaken = 0, pending = null, aimSnap = null, hintKey = "", hintGold = false;
  const setPose = (name, o = {}) => { pose = { name, t: 0, u: 0, u0: 0, ...o }; };

  /* ---------- 입력: 뒤로 당겼다 놓기(새총) ---------- */
  const root = ctx.root;
  let drag = null;
  const fullPull = () => 0.3 * Math.min(root.clientWidth || innerWidth, root.clientHeight || innerHeight);
  function aimFrom(d) {
    const dx = d.x0 - d.x, dy = d.y - d.y0;            // 당긴 반대쪽 = 던지는 쪽(위가 +)
    const len = Math.hypot(dx, dy), u = Math.max(0, Math.min(1, len / fullPull()));
    let deg = (Math.atan2(dy, dx) * 180) / Math.PI;     // 아래로 당기면 dy + → 위로 던짐
    if (!(deg >= 0)) deg = dx > 0 ? 20 : 85;
    deg = Math.max(20, Math.min(85, deg));
    return { u, deg, speed: s.spot.refSpeed * (0.6 + 0.8 * u), ok: len > fullPull() * 0.08 };
  }
  const canAim = () => !stopped && !busy && !ctx.demo && !ctx.paused() && (s.phase === "aim" || s.phase === "move") && (s.ballsLeft > 0);
  function onDown(e) {
    if (e.button > 0 || drag || !canAim()) return;
    drag = { id: e.pointerId, x0: e.clientX, y0: e.clientY, x: e.clientX, y: e.clientY }; idleT = 0;
    try { root.setPointerCapture(e.pointerId); } catch (_) {}
    setPose("aim", { u: 0 });
  }
  function onMove(e) { if (drag && e.pointerId === drag.id) { drag.x = e.clientX; drag.y = e.clientY; } }
  function onUp(e) {
    if (!drag || e.pointerId !== drag.id) return;
    const a = aimFrom(drag); drag = null; aimSnap = null;
    if (!a.ok || !canAim()) { setPose("idle"); if (a && !a.ok && canAim()) juice.pop("뒤로 쭉 당겨요!", { y: 0.3, cls: "small" }); return; }
    requestShot(a);
  }
  function onCancel(e) { if (drag && (!e || e.pointerId === drag.id)) { drag = null; aimSnap = null; if (pose.name === "aim") setPose("idle"); } }
  root.addEventListener("pointerdown", onDown);
  root.addEventListener("pointermove", onMove);
  root.addEventListener("pointerup", onUp);
  root.addEventListener("pointercancel", onCancel);
  root.addEventListener("lostpointercapture", onCancel);
  ctx.onPause(() => onCancel());
  // 몸으로 던지기: 각도는 기준, 힘은 팔 빠르기(4~10 → 0.85~1.15배)
  const offThrow = camera ? ctx.camera.on("throw", ev => {
    if (!canAim()) return;
    const k = Math.max(0.85, Math.min(1.15, 0.85 + ((ev.speed || 6) - 4) / 6 * 0.3));
    requestShot({ u: 0.5, deg: s.spot.refDeg, speed: s.spot.refSpeed * k, ok: true });
  }) : null;

  function requestShot(a) {
    if (R.canShoot(s)) fire(a); else pending = a;     // 다음 공을 잡는 중이면 잡자마자
  }
  function fire(a) {
    const shot = R.shoot(s, { deg: a.deg, speed: a.speed });
    if (!shot) return;
    shotsTaken++; idleT = 0;
    setPose("shoot", { u0: a.u, shot });
    const tm = view && view.shootTiming ? view.shootTiming(a.u) : { delay: 0.12, total: 0.6 };
    pose.total = tm.total;
    launches.push({ shot, at: T + tm.delay });
    drain();
  }
  function launch(l) {
    const b = Ph.createBall(l.shot.from, Ph.velocity(l.shot.deg, l.shot.speed));
    if (l.shot.magnet) Ph.magnetize(b, s.spot.geo);
    balls.push({ shot: l.shot, b, resolved: false, geo: s.spot.geo });
    if (!ctx.demo) { sfx.whoosh(1.2); snd.release(); }
  }

  /* ---------- 자동(검증 ?qa=1&auto=1) ---------- */
  const auto = ctx.demo || ctx.auto;
  let autoWait = 0.6;
  function autoStep(dt) {
    if (!R.canShoot(s) || launches.length) return;
    autoWait -= dt;
    if (autoWait > 0) return;
    autoWait = 0.5 + Math.random() * 0.5;
    const n = (Math.random() - 0.5) * 0.04;
    fire({ u: 0.5, deg: s.spot.refDeg + (Math.random() - 0.5) * 2, speed: s.spot.refSpeed * (1 + n) });
  }

  const replay = ctx.replay;
  const hoopScreen = () => { const p = view ? view.toScreen(s.spot.geo.rimX, s.spot.geo.rimY - 140) : { x: 0.7, y: 0.3 }; return { x: Math.max(0.12, Math.min(0.88, p.x)), y: Math.max(0.16, Math.min(0.8, p.y)) }; };
  const LABEL = { swish: "클린 슛!", bank: "뱅크 슛!", rim: "통통 쏙!" };

  // 엔진 이벤트 → 소리·효과·점수판·그림
  function drain() {
    for (const ev of s.events) {
      if (ctx.demo) continue;
      switch (ev.type) {
        case "go":
          sfx.whistle(); juice.announce(R.roundDef(s, ev.round).name, { sub: camera ? "팔을 머리 위로 올렸다 휙!" : R.roundDef(s, ev.round).line, voice: "go" });
          break;
        case "made": {
          const at = hoopScreen();
          netAt = T; netPow = ev.kind === "swish" ? 1 : 0.75;
          snd.swish(); sfx.ok(ev.streak);
          juice.pop(`+${ev.pts}`, { x: at.x, y: at.y, cls: ev.money ? "gold big" : ev.fire ? "perfect" : "" });
          juice.pop(LABEL[ev.kind], { x: at.x, y: Math.max(0.12, at.y - 0.1), cls: ev.kind === "swish" ? "perfect small" : "gold small", ms: 1000 });
          if (ev.kind === "swish") sfx.perfect();
          if (ev.money) { sfx.combo(10); sfx.crowd(1.2); juice.announce("머니볼!", { sub: "점수 ×2", cls: "gold", voice: "money", pri: 2 }); juice.confetti(60, { x: at.x, y: at.y }); }
          else if (ev.streak >= 2 || s.round === 2) sfx.crowd(0.7);
          juice.burst(at.x, at.y + 0.08, { n: 20 });
          if (view) view.cue({ type: "made", geo: s.spot.geo, kind: ev.kind, money: ev.money, fire: ev.fire });
          if (pose.name === "idle" || (pose.name === "shoot" && pose.t > 0.35)) setPose("cheer");
          // 다시 보기는 머니볼 클린 슛만(가장 멋진 순간)
          if (ev.money && ev.kind === "swish") replay.mark(s.t, 100 + (ev.fire ? 30 : 0), "머니볼 클린 슛!");
          hud.pulse("score");
          break;
        }
        case "miss":
          sfx.bonk(); juice.pop(ev.kind === "air" ? "에어볼!" : "아깝다!", { y: 0.3, cls: "oops small" });
          if (pose.name === "idle") setPose("sad");
          break;
        case "fire":
          sfx.combo(8); sfx.crowd(1.1); juice.announce("불타는 손! 🔥", { sub: "골인 점수 ×1.5", cls: "gold", voice: "fire" });
          if (view) view.cue({ type: "fire", x: kidX, y: -300 });
          break;
        case "fireout": juice.pop("불이 꺼졌어요", { y: 0.24, cls: "small" }); break;
        case "timeup": sfx.whistle(); juice.announce("시간 끝!", { sub: "다음 판으로!", pri: 2 }); break;
        case "move": if (ev.rack === 1 || ev.rack === 4) juice.pop(ev.rack === 4 ? "마지막 랙!" : "다음 자리로!", { y: 0.3, cls: "small" }); break;
        case "rack": sfx.beep(); break;
      }
    }
    if (!ctx.demo) hud.set({ score: s.score, combo: s.streak, mult: R.onFire(s) ? R.FIRE_MULT : 1 });
    s.events.length = 0;
  }

  // 판 사이: 보너스 문제(자석 골대). 문제를 못 내면 보너스 없이 바로 다음 판.
  async function breakTime() {
    busy = true; onCancel(); pending = null;
    const nextName = R.roundDef(s, s.round + 1).name;
    if (quizOn) {
      await ctx.wait(500);
      if (stopped) return;
      juice.announce("보너스 타임!", { sub: "맞히면 자석 골대 🧲", voice: "bonus", cls: "rainbow" });
      await ctx.wait(900);
      if (stopped) return;
      const r = await ctx.quiz.askReward("맞히면 자석 골대! 다음 공이 저절로 쏙쏙", {
        onCorrect: ({ firstTry }) => {
          // 정답 터치 안에서 바로: 골대가 자석으로 빛나고(무지개 고리) + 반짝 + 소리 + 점수
          const rw = R.quizReward(firstTry);
          s.score += rw.bonus; s.magnet += rw.magnet; s.stats.quizBonus = (s.stats.quizBonus || 0) + rw.bonus;
          if (view) view.cue({ type: "magnet", firstTry });
          snd.magnet(); sfx.rainbow(); juice.flash("#ffffff", 260); juice.confetti(firstTry ? 120 : 60, { y: 0.45 });
          hud.set({ score: s.score }); hud.pulse("score");
          return `🧲 자석 골대! 다음 공 ${rw.magnet}개가 쏙쏙 · +${rw.bonus}점`;
        },
      });
      if (stopped) return;
      if (r) {
        const rw = R.quizReward(r.firstTry);
        juice.pop(`+${rw.bonus}`, { y: 0.42, cls: "rainbow big" });
        juice.announce("자석 골대!", { sub: `다음 공 ${rw.magnet}개가 저절로 쏙!`, voice: "magnet", cls: "rainbow" });
        sfx.crowd(1);
      }
    } else {
      await ctx.wait(500);
      if (stopped) return;
      juice.announce(nextName, { sub: "다음 판!" });
      await ctx.wait(700);
      if (stopped) return;
    }
    R.nextRound(s, null);                 // 보상은 onCorrect 에서 이미 줬다
    hud.set({ round: nextName });
    drain();
    busy = false;
  }

  async function finishRun() {
    busy = true; onCancel();
    const th = R.medalTable(level, quizOn);
    const medal = s.score >= th.gold ? "gold" : s.score >= th.silver ? "silver" : s.score >= th.bronze ? "bronze" : null;
    await ctx.wait(400);
    if (stopped) return;
    sfx.whistle(); juice.announce("끝!", { sub: `${s.score}점 · ${s.stats.made}/${s.stats.shots} 골인`, voice: "finish", pri: 2 });
    setPose("cheer");
    await ctx.wait(1000);
    if (stopped) return;
    const clip = replay.clip;
    if (clip && clip.weight >= 100 && view && view.replay && (!ctx.auto || ctx.qaReplay)) {
      juice.clearText();          // 다시 보기 동안 배너·글자는 지운다(다시 보기 표시가 가려지지 않게)
      await view.replay(clip, { speed: 0.4, label: clip.label });
      if (stopped) return;
    }
    ctx.finish({ score: s.score, medal, stats: { ...s.stats, bestStreak: s.bestStreak, rounds: s.roundScore.slice() } });
  }

  // 그릴 상태(view·느린 다시 보기용). 평범한 값만.
  function snap() {
    const shootingHeld = pose.name === "shoot" && launches.some(l => l.shot === pose.shot);
    let held = null;
    if (shootingHeld) held = { money: pose.shot.money, fire: pose.shot.fire, magnet: pose.shot.magnet };
    else if (pose.name !== "shoot" && pose.name !== "cheer" && s.ballsLeft > 0 && s.reload <= 0 && (s.phase === "aim" || s.phase === "ready" || s.phase === "move"))
      held = { money: R.isMoney(s), fire: R.onFire(s), magnet: s.magnet > 0 };
    const rackBalls = Math.max(0, s.ballsLeft - (held && !shootingHeld ? 1 : 0));
    return {
      t: T, phase: s.phase, round: s.round, geo: s.spot.geo, kidX, three: s.P.dist[2][0], three3: s.round === 2,
      balls: balls.map(o => ({ id: o.shot.id, x: o.b.x, y: o.b.y, rot: o.b.rot, age: o.b.t, fire: o.shot.fire, money: o.shot.money, magnet: o.shot.magnet, made: o.b.made })),
      held, aim: aimSnap, pose: { name: pose.name, t: pose.t, u: pose.u, u0: pose.u0 },
      netT: T - netAt, netPow, magnet: s.magnet, fire: R.onFire(s), rackBalls, rackMoney: !!R.roundDef(s).money && rackBalls > 0,
      tutorial: !ctx.demo && !drag && s.phase === "aim" && !!held && (shotsTaken < (level <= 1 ? 3 : 1) || idleT > (level <= 1 ? 2.5 : 4)),
    };
  }

  const stopLoop = ctx.loop(dt => {
    if (stopped) return;
    T += dt;
    pose.t += dt;
    if (!busy) {
      if (auto) autoStep(dt);
      R.step(s, dt);
      if (pending && R.canShoot(s)) { const a = pending; pending = null; fire(a); }
      drain();
      if (!ctx.demo) hud.set({ time: R.timeLeft(s) == null ? 1 : R.timeLeft(s) });
    }
    // 손을 떠나는 공
    for (let i = launches.length - 1; i >= 0; i--) if (T >= launches[i].at) { launch(launches[i]); launches.splice(i, 1); }
    // 공 날리기(판 사이에도 굴러가게)
    for (let i = balls.length - 1; i >= 0; i--) {
      const o = balls[i];
      for (const e of Ph.stepBall(o.b, o.geo, dt)) {
        if (ctx.demo) continue;
        if (e.type === "rim") { snd.rim(e.power); if (view) view.cue({ type: "rim" }); }
        else if (e.type === "board") { snd.board(e.power); if (view) view.cue({ type: "board" }); }
        else if (e.type === "floor") snd.floor(e.power);
      }
      if (o.b.result && !o.resolved) { o.resolved = true; R.resolve(s, o.shot, o.b.result); drain(); }
      if (o.b.done) balls.splice(i, 1);
    }
    // 아이 자세
    if (drag) {
      const a = aimFrom(drag);
      setPoseKeep("aim", a.u);
      const v = Ph.velocity(a.deg, a.speed), geo = s.spot.geo;
      const pts = Ph.guidePoints(geo, s.spot.from, v, s.P.guide, Math.round(10 + 16 * s.P.guide));
      if (s.P.hint && s.magnet <= 0) {
        const key = `${Math.round(a.deg * 2)}|${Math.round(a.speed / 6)}`;
        if (key !== hintKey) { hintKey = key; const r = Ph.assist(geo, s.spot.from, a.deg, a.speed, s.P.tolP, s.P.tolA).result; hintGold = r === "swish" || r === "bank" || r === "rim"; }
      } else hintGold = s.magnet > 0;
      aimSnap = { u: a.u, deg: a.deg, pts: a.ok ? pts : [], gold: a.ok && hintGold };
    }
    if (pose.name === "shoot" && pose.t > (pose.total || 0.6) && !launches.length) setPose("idle");
    if (pose.name === "cheer" && pose.t > 0.85) setPose("idle");
    if (pose.name === "sad" && pose.t > 0.5) setPose("idle");
    // 다음 자리로 걷기
    const tx = s.spot.x;
    if (Math.abs(kidX - tx) > 1) {
      kidX += (tx - kidX) * Math.min(1, dt * 6) + Math.sign(tx - kidX) * Math.min(Math.abs(tx - kidX), dt * 120);
      if (pose.name === "idle" || pose.name === "sad") setPose("walk");
    } else { kidX = tx; if (pose.name === "walk") setPose("idle"); }

    if (!busy) {
      if (s.phase === "break") breakTime();
      else if (s.phase === "done") finishRun();
    }
    if (!drag && canAim() && !launches.length) idleT += dt; else if (drag) idleT = 0;
    if (!ctx.demo) hud.buff("magnet", s.magnet > 0 ? `🧲 자석 골대 ×${s.magnet}` : null);
    const sn = snap();
    if (!ctx.demo && !busy) replay.push(s.t, sn);
    if (view) view.render(sn, dt);
  });
  function setPoseKeep(name, u) { if (pose.name !== name) setPose(name, { u }); else pose.u = u; }

  return {
    stop() {
      stopped = true; stopLoop(); if (offThrow) offThrow();
      root.removeEventListener("pointerdown", onDown); root.removeEventListener("pointermove", onMove); root.removeEventListener("pointerup", onUp);
      root.removeEventListener("pointercancel", onCancel); root.removeEventListener("lostpointercapture", onCancel);
      if (view) { view.destroy(); view = null; }
    },
    // 검증용
    state: () => s,
    debug: () => ({ balls: balls.length, pose: pose.name, kidX, aim: aimSnap, idleT }),
    actorRect: () => (view && view.actorRect ? view.actorRect() : null),
    boardRect: () => (view && view.boardRect ? view.boardRect() : null),
  };
}
