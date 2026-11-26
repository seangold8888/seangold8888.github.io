// 종목 3: 훌라후프. 규칙은 hula-rules.js(엔진), 그림은 view(바꿔 끼우는 겉모습), 여기는 입력·진행·문제·소리·점수판.
// 조작: 재이(level 2~) = 화면에 손가락으로 동그라미(빠르기를 후프에 맞추기) / 태오(level 0~1) = 박자 고리가 겹칠 때 톡.
//       몸으로 하기 = 엉덩이 돌리기(hipCircle) 한 바퀴가 한 번(두 아이 모두, 넓은 창). 손가락도 늘 같이 된다.
// 판: 1 빙글빙글 → 보너스 문제(요술 후프) → 2 빨라져요 → 보너스 문제 → 3 빠르게 천천히. 한 사람 약 75초.
import * as R from "./hula-rules.js?v=2";
import { context as audioCtx, output as audioOut, isOn as soundOn } from "../sfx.js?v=1";

const VIEWS = {
  stage: () => import("../views/hula-stage.js?v=1"),
};

export default {
  id: "hula",
  name: "훌라후프",
  icon: "⭕",
  howTo: "빙글빙글! 후프가 안 떨어지게",
  cameraMode: true,
  gestures: ["hipCircle"],
  cameraLabel: "진짜로 돌리기",
  demo: true,
  medals: (level, quizOn = true) => R.medalTable(level, quizOn),
  views: VIEWS,
  start,
};

const TAU = Math.PI * 2;

/* ---------- 훌라후프 전용 효과음(WebAudio, 공용 sfx 출력에 붙인다; 소리 끔·자동 검증이면 조용) ---------- */
function makeHoopSfx(mute) {
  const ready = () => { if (mute || !soundOn()) return null; const a = audioCtx(); return a && a.state === "running" && audioOut() ? a : null; };
  function tone(f, dur, type = "sine", vol = 0.06, slide = 0, at = 0) {
    const a = ready(); if (!a) return;
    const o = a.createOscillator(), g = a.createGain(), t = a.currentTime + at;
    o.type = type; o.frequency.setValueAtTime(f, t); if (slide) o.frequency.exponentialRampToValueAtTime(Math.max(30, slide), t + dur);
    g.gain.setValueAtTime(0.0001, t); g.gain.linearRampToValueAtTime(vol, t + 0.01); g.gain.exponentialRampToValueAtTime(0.0008, t + dur);
    o.connect(g); g.connect(audioOut()); o.start(t); o.stop(t + dur + 0.03); o.onended = () => { try { g.disconnect(); } catch (_) {} };
  }
  let nb = null;
  function swish(dur, vol, from, to, at = 0) {
    const a = ready(); if (!a) return;
    if (!nb) { nb = a.createBuffer(1, a.sampleRate, a.sampleRate); const d = nb.getChannelData(0); for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1; }
    const s = a.createBufferSource(), f = a.createBiquadFilter(), g = a.createGain(), t = a.currentTime + at;
    s.buffer = nb; s.loop = true; f.type = "bandpass"; f.Q.value = 2.2;
    f.frequency.setValueAtTime(from, t); f.frequency.exponentialRampToValueAtTime(to, t + dur);
    g.gain.setValueAtTime(0.0001, t); g.gain.linearRampToValueAtTime(vol, t + dur * 0.45); g.gain.exponentialRampToValueAtTime(0.0008, t + dur);
    s.connect(f); f.connect(g); g.connect(audioOut()); s.start(t); s.stop(t + dur + 0.03); s.onended = () => { try { g.disconnect(); } catch (_) {} };
  }
  const NOTES = [523, 587, 659, 784, 880, 1047, 1175, 1319, 1568];
  return {
    swoosh: (period, hoops = 1) => swish(Math.min(0.5, period * 0.55), 0.05 + 0.015 * hoops, 500, 1900 + hoops * 300),
    tick: () => tone(1568, 0.05, "sine", 0.035),
    ok: combo => { const n = NOTES[combo % NOTES.length]; tone(n, 0.12, "triangle", 0.07); tone(n * 1.5, 0.1, "sine", 0.03, 0, 0.03); },
    perfect: () => { [0, 1, 2].forEach(i => tone(NOTES[5 + i], 0.18, "sine", 0.05, 0, i * 0.035)); },
    slip: () => { tone(330, 0.18, "triangle", 0.06, 220); },
    drop: () => { tone(520, 0.12, "square", 0.06, 260); tone(240, 0.45, "sawtooth", 0.05, 70, 0.1); [0.35, 0.5, 0.62, 0.71].forEach((at, i) => tone(900 - i * 120, 0.06, "triangle", 0.05 - i * 0.008, 0, at)); },
    pickup: () => { tone(392, 0.1, "triangle", 0.06, 784); },
    hoopUp: n => { for (let i = 0; i < 5; i++) tone(NOTES[Math.min(8, 2 + i + n)], 0.16, "square", 0.04, 0, i * 0.05); swish(0.4, 0.06, 800, 4000, 0.05); },
    magic: () => { for (let i = 0; i < 12; i++) tone(NOTES[i % 9] * (i > 8 ? 2 : 1), 0.22, i % 2 ? "triangle" : "sine", 0.05, 0, i * 0.04); swish(0.8, 0.05, 2000, 9000); },
  };
}

// 그릴 상태(view·느린 다시 보기용). 평범한 값만.
function snap(s, extra) {
  return {
    t: s.t, round: s.round, phase: s.phase, phaseT: s.phaseT, phi: s.phi, spin: s.spin, h: s.h, mode: s.mode,
    hoops: R.hoops(s), extra: s.extra, bonusHoop: s.bonusHoop, magic: s.magic, magicMax: s.magicMax, combo: s.combo,
    period: s.period, fastNow: s.fastNow, swap: s.rounds[s.round] === "swap",
    nextIn: s.phase === "play" ? R.timeToBeat(s) : Infinity, window: s.P.window,
    ratio: s.mode === "circle" ? s.input / (TAU / s.period) : 1, lastRatio: s.lastRatio, band: s.P.band, perfectBand: s.P.perfect,
    ...extra,
  };
}

async function start(ctx) {
  const { kid, sfx, juice, hud } = ctx;
  const level = kid.level;
  const camera = !!ctx.camera;
  const quizOn = !ctx.demo && ctx.quiz.enabled;
  const hs = makeHoopSfx(!!ctx.demo);
  let s = R.createRun({ level, camera });
  let stopped = false, view = null, busy = false;

  const viewKind = VIEWS[ctx.viewKind] ? ctx.viewKind : "stage";
  const mod = await VIEWS[viewKind]();
  if (stopped) return;
  view = mod.createView({ root: ctx.root, kid, cast: ctx.cast || [], demo: !!ctx.demo, juice, frame: ctx.frame || null , safe: ctx.safe || null});

  const lineOf = i => (camera ? "엉덩이로 빙글빙글!" : R.roundDef(s, i).line[s.mode]);
  // 동그라미 모드에선 큰 톡 버튼이 필요 없다(화면 어디든 동그라미). 끝나면 셸이 hud.hide() 로 다시 숨긴다.
  const tapBtn = typeof document !== "undefined" ? document.getElementById("tapBtn") : null;
  if (!ctx.demo) {
    hud.show({ kid, score: 0, round: R.roundDef(s, 0).name, line: lineOf(0) });
    if (s.mode === "circle" && tapBtn) tapBtn.hidden = true;
  }

  /* ---------- 입력 ---------- */
  // 톡(태오): 화면 아무 데나 톡 + 큰 톡 버튼 + 스페이스
  const offTap = ctx.input.onTap(() => { if (!stopped && !busy && !ctx.demo && s.mode === "tap" && R.tap(s)) drain(); });
  // 몸으로: 엉덩이 한 바퀴 = 톡(감지 지연만큼 앞당겨 판정)
  const offCircle = camera ? ctx.camera.on("hipCircle", ev => {
    if (stopped || busy) return;
    const lag = Math.max(-0.3, Math.min(0, ((ev.t || performance.now()) - performance.now()) / 1000 - (ctx.camera.lagMs || 100) / 1000));
    if (R.tap(s, lag)) drain();
  }) : null;

  // 동그라미(재이): 손가락이 그리는 원의 중심을 최근 자취에서 잡고, 중심 둘레를 도는 각속도(rad/s)를 잰다.
  const finger = { id: null, pts: [], w: 0, raw: 0 };
  const root = ctx.root;
  function fpos(e) { const r = root.getBoundingClientRect(); return { x: e.clientX - r.left, y: e.clientY - r.top, t: performance.now() / 1000, w: r.width, h: r.height }; }
  function onDown(e) {
    if (s.mode !== "circle" || ctx.demo) return;
    if (finger.id != null && finger.id !== e.pointerId) return;
    finger.id = e.pointerId; finger.pts.push(fpos(e));
  }
  function onMove(e) {
    if (finger.id !== e.pointerId) return;
    const evs = e.getCoalescedEvents ? e.getCoalescedEvents() : [e];
    for (const c of evs.length ? evs : [e]) finger.pts.push(fpos(c));
  }
  function onUp(e) { if (finger.id === e.pointerId) finger.id = null; }
  if (s.mode === "circle" && !ctx.demo) {
    root.addEventListener("pointerdown", onDown);
    root.addEventListener("pointermove", onMove);
    root.addEventListener("pointerup", onUp); root.addEventListener("pointercancel", onUp); root.addEventListener("lostpointercapture", onUp);
  }
  function fingerSpeed(dt) {
    const now = performance.now() / 1000;
    const keep = Math.max(0.6, s.period * 1.3);
    while (finger.pts.length && now - finger.pts[0].t > keep) finger.pts.shift();
    const P = finger.pts;
    let w = 0;
    if (P.length >= 4) {
      let x0 = Infinity, x1 = -Infinity, y0 = Infinity, y1 = -Infinity;
      for (const p of P) { x0 = Math.min(x0, p.x); x1 = Math.max(x1, p.x); y0 = Math.min(y0, p.y); y1 = Math.max(y1, p.y); }
      const cx = (x0 + x1) / 2, cy = (y0 + y1) / 2, minR = Math.max(14, Math.min(P[0].w, P[0].h) * 0.025);
      // 최근 0.3초 동안 중심 둘레로 돈 각도(방향 상관없음)
      let acc = 0, from = null, last = null;
      for (const p of P) {
        if (now - p.t > 0.3) continue;
        if (Math.hypot(p.x - cx, p.y - cy) < minR) { last = null; continue; }
        const a = Math.atan2(p.y - cy, p.x - cx);
        if (last != null) { let d = a - last.a; if (d > Math.PI) d -= TAU; if (d < -Math.PI) d += TAU; acc += d; }
        if (from == null) from = p.t;
        last = { a };
      }
      const span = from != null ? Math.max(0.12, now - from) : 1;
      w = Math.abs(acc) / span;
      if (x1 - x0 < minR * 1.6 && y1 - y0 < minR * 1.6) w = 0;     // 콕 누르고만 있음
    }
    finger.raw = w;
    finger.w += (w - finger.w) * Math.min(1, dt * 7);
    return finger.w;
  }
  // 그리기용 손가락 자취(화면 비율 좌표, 최근 0.45초)
  function trail() {
    const now = performance.now() / 1000;
    return finger.pts.filter(p => now - p.t < 0.45).map(p => ({ x: p.x / p.w, y: p.y / p.h, a: 1 - (now - p.t) / 0.45 }));
  }

  // 자동: 시연(첫 화면 뒤) 과 검증(?qa=1&auto=1)
  const auto = ctx.demo || ctx.auto;
  let autoPlan = null, autoK = null, autoPhase = 0;
  function autoStep(dt) {
    if (s.phase !== "play") { autoPlan = null; return; }
    if (s.mode === "circle") {
      const wob = ctx.demo ? 1 + Math.sin(s.t * 1.7) * 0.06 : 1;
      R.setInput(s, (TAU / s.period) * wob);
      autoPhase += (TAU / s.period) * wob * dt;
      return;
    }
    // 먼저 때가 된 톡을 누르고(박자를 막 지난 프레임이어도 늦은 톡으로 맞는다), 그다음 다음 박자를 정한다
    if (autoPlan && s.t >= autoPlan.at) { autoPlan = null; if (R.tap(s)) drain(); }
    const k = Math.floor(s.phi / TAU);
    if (autoK !== k + 1 && !autoPlan) { autoK = k + 1; autoPlan = { at: s.t + R.timeToBeat(s) - 0.02 + (ctx.demo ? (Math.random() - 0.5) * 0.08 : 0) }; }
  }
  function autoTrail() {   // 자동 플레이 화면에도 손가락 자취를 그려 보여 준다(오른쪽 아래)
    const out = [];
    for (let i = 0; i < 16; i++) { const a = autoPhase - i * 0.16; out.push({ x: 0.78 + Math.cos(a) * 0.09, y: 0.7 + Math.sin(a) * 0.09 * 0.75, a: 1 - i / 16 }); }
    return out;
  }

  const replay = ctx.replay;
  let lastShownScore = -1;

  // 엔진 이벤트 → 소리·효과·점수판·그림
  function drain() {
    for (const ev of s.events) {
      if (view && view.cue) view.cue(ev);
      if (ctx.demo) continue;
      switch (ev.type) {
        case "beat": hs.swoosh(s.period, R.hoops(s)); break;
        case "ok":
          hs.ok(ev.combo);
          if (ev.grade === "perfect") { hs.perfect(); if (ev.combo % 2 === 0) juice.pop("퍼펙트!", { y: 0.21, cls: "perfect" }); }
          else if (ev.grade === "good" && ev.combo % 4 === 0) juice.pop("좋아요!", { y: 0.22 });
          if (ev.combo > 0 && ev.combo % 10 === 0) { sfx.combo(ev.combo); sfx.crowd(1); juice.announce(`${ev.combo} 바퀴!`, { sub: "빙글빙글 대단해요!", voice: "combo" }); }
          hud.pulse("combo");
          break;
        case "hoopUp":
          hs.hoopUp(ev.hoops); sfx.crowd(1.1); juice.flash("#fff3b0", 160);
          juice.announce(`후프 ${ev.hoops}개!`, { sub: `점수 ×${ev.hoops}`, voice: "hoop", cls: "gold" });
          if (ev.hoops >= 3) replay.mark(s.t, 50 + ev.hoops * 20, `후프 ${ev.hoops}개`);   // 다시 보기는 후프 3개 이상만
          break;
        case "slip":
          hs.slip();
          if (ev.kind === "slow") juice.pop("더 빨리!", { y: 0.21, cls: "oops small" });
          else if (ev.kind === "fast") juice.pop("조금 천천히~", { y: 0.21, cls: "small" });
          else juice.pop("고리에 톡!", { y: 0.21, cls: "oops small" });
          if (ev.lost) juice.pop(ev.lost > 1 ? `후프 ${ev.lost}개 툭!` : "후프 하나 툭!", { y: 0.27, cls: "small" });
          break;
        case "wobble": juice.pop("흔들흔들", { y: 0.24, cls: "small", ms: 600 }); break;
        case "drop": hs.drop(); sfx.miss(); juice.pop("앗!", { y: 0.36, cls: "oops" }); juice.shake(ctx.root, 1.2); break;
        case "pickup": hs.pickup(); juice.pop("다시 빙글!", { y: 0.24, cls: "small", ms: 800 }); break;
        case "tempo": juice.pop(ev.fast ? "빠르게!" : "천천히~", { y: 0.24, cls: ev.fast ? "gold" : "", ms: 1100 }); sfx.beep(ev.fast); break;
        case "magicEnd": juice.pop("요술 끝! 이제 내 힘으로", { y: 0.26, cls: "small", ms: 1100 }); break;
        case "go": sfx.whistle(); juice.announce(R.roundDef(s, ev.round).name, { sub: lineOf(ev.round), voice: "go" }); if (s.magic > 0) juice.pop(`✨ 요술 후프 ${Math.ceil(s.magic)}초!`, { y: 0.24, cls: "rainbow small", ms: 1300 }); break;
      }
    }
    if (!ctx.demo) {
      if (s.score !== lastShownScore) { lastShownScore = s.score; hud.set({ score: s.score }); }
      hud.set({ combo: s.combo, mult: R.hoops(s) });
    }
    s.events.length = 0;
  }

  // 판 사이: 보너스 문제(요술 후프). 문제를 못 내면 보너스 없이 바로 다음 판.
  async function breakTime() {
    busy = true;
    const nextName = R.roundDef(s, s.round + 1).name;
    let got = false;
    if (quizOn) {
      juice.announce("보너스 타임!", { sub: "맞히면 요술 후프 ✨", voice: "bonus", cls: "rainbow" });
      await ctx.wait(900);
      if (stopped) return;
      const r = await ctx.quiz.askReward("맞히면 요술 후프! 저절로 돌고 후프 하나 더", {
        onCorrect: ({ firstTry }) => {
          // 정답 터치 안에서 바로: 후프가 반짝이며 덤 후프가 하늘에서 쏙 + 점수 팡 + 팡파르(1초 안 보상)
          const rw = R.quizReward(firstTry);
          R.applyReward(s, rw); got = true;
          drain();
          hs.magic(); sfx.rainbow(); juice.flash("#ffffff", 260); juice.confetti(firstTry ? 120 : 60, { y: 0.45 });
          juice.pop(`+${rw.bonus}`, { y: 0.42, cls: "rainbow big" });
          return `✨ 요술 후프! 후프 하나 더 · ${rw.magic}초 동안 저절로 빙글 · +${rw.bonus}점`;
        },
      });
      if (stopped) return;
      if (r && got) {
        juice.announce("요술 후프!", { sub: `${nextName}: ${Math.round(s.magicMax)}초 동안 저절로 · 후프 ${R.hoops(s)}개`, voice: "magic", cls: "rainbow" });
        sfx.crowd(1);
        await ctx.wait(700);
        if (stopped) return;
      }
    } else {
      juice.announce(nextName, { sub: "다음 판!" });
      await ctx.wait(700);
      if (stopped) return;
    }
    R.nextRound(s, null);
    hud.set({ round: nextName, line: lineOf(s.round) });
    drain();
    busy = false;
  }

  async function finishRun() {
    busy = true;
    const th = R.medalTable(level, quizOn);
    const medal = s.score >= th.gold ? "gold" : s.score >= th.silver ? "silver" : s.score >= th.bronze ? "bronze" : null;
    sfx.whistle(); juice.announce("끝!", { sub: `${s.score}점`, voice: "finish", pri: 2 });
    if (view && view.cue) view.cue({ type: "done" });
    await ctx.wait(900);
    if (stopped) return;
    const clip = replay.clip;
    if (clip && clip.weight >= 110 && view && view.replay && (!ctx.auto || ctx.qaReplay)) {
      juice.clearText();          // 다시 보기 동안 배너·글자는 지운다(다시 보기 표시가 가려지지 않게)
      await view.replay(clip, { speed: 0.4, label: clip.label });
      if (stopped) return;
    }
    ctx.finish({ score: s.score, medal, stats: { ...s.stats, bestCombo: s.bestCombo, rounds: s.roundScore.slice() } });
  }

  const stopLoop = ctx.loop(dt => {
    if (stopped) return;
    if (!busy) {
      if (s.mode === "circle" && !auto) R.setInput(s, s.phase === "play" ? fingerSpeed(dt) : (fingerSpeed(dt), 0));
      if (auto) autoStep(dt);
      R.step(s, dt);
      drain();
      if (!ctx.demo) replay.push(s.t, snap(s));
      if (!ctx.demo && (s.phase === "play" || s.phase === "drop")) hud.set({ time: R.timeLeft(s) / R.ROUND_LEN });
      if (s.phase === "break") {
        if (ctx.demo) s = R.createRun({ level, camera: false });   // 시연은 1판만 계속 돈다
        else breakTime();
      } else if (s.phase === "done") {
        if (ctx.demo) s = R.createRun({ level });
        else finishRun();
      }
    }
    const tr = s.mode !== "circle" ? null : auto ? autoTrail() : trail();
    if (!ctx.demo) hud.buff("magic", s.magic > 0 ? `✨ 요술 후프 ${Math.ceil(s.magic)}초` : null, { cls: "rainbow" });
    if (view) view.render(snap(s, { trail: tr, camera, helper: !ctx.demo && s.mode === "tap" }), dt);
  });

  return {
    stop() {
      stopped = true; stopLoop(); offTap(); if (offCircle) offCircle();
      root.removeEventListener("pointerdown", onDown); root.removeEventListener("pointermove", onMove);
      root.removeEventListener("pointerup", onUp); root.removeEventListener("pointercancel", onUp); root.removeEventListener("lostpointercapture", onUp);
      if (view) { view.destroy(); view = null; }
    },
    // 검증용
    state: () => s,
    actorRect: () => (view && view.actorRect ? view.actorRect() : null),
  };
}
