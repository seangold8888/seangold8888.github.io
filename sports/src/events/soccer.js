// 종목 4: 축구 승부차기. 규칙은 soccer-rules.js(엔진), 그림은 view(views/soccer-stage.js), 여기는 입력·진행·문제·소리·점수판.
// 한 판 = 5번 차기(2·4번째 뒤 보너스 타임: 맞히면 불꽃 슛) + 청백전 동점이면 서든 데스. 한 사람 약 70초.
// 조준: 골대 구석 쪽으로 쓱(방향 = 과녁, 길이 = 힘) · 그냥 톡(또는 큰 톡 버튼·스페이스) = 움직이는 과녁으로 · 카메라 = 몸 기울여 조준 + 발차기.
import * as R from "./soccer-rules.js?v=1";
import { ssfx } from "./soccer-sfx.js?v=1";

const VIEWS = {
  stage: () => import("../views/soccer-stage.js?v=1"),
};

// 청백전 서든 데스: 앞 차례(다른 편) 골 수를 기억한다(같은 종목 모듈이 두 차례 내내 살아 있다)
let lastTurn = null;

export default {
  id: "soccer",
  name: "축구",
  icon: "⚽",
  howTo: "골대 구석으로 쓱! 톡 하면 과녁으로",
  cameraMode: true,
  gestures: ["kick"],
  cameraLabel: "진짜로 차기",
  demo: false,
  medals: (level, quizOn = true) => R.medalTable(level, quizOn),
  views: VIEWS,
  start,
};

const muted = new Proxy({}, { get: () => () => {} });

async function start(ctx) {
  const { kid, juice, hud } = ctx;
  const sfx = ctx.sfx, S = ctx.demo ? muted : ssfx;
  const level = kid.level, camera = !!ctx.camera;
  const quizOn = !ctx.demo && ctx.quiz.enabled;
  const run = R.createRun({ level, camera });
  let stopped = false, view = null;

  const viewKind = VIEWS[ctx.viewKind] ? ctx.viewKind : "stage";
  const mod = await VIEWS[viewKind]();
  if (stopped) return { stop() {}, state: () => run };
  view = await mod.createView({ root: ctx.root, kid, cast: ctx.cast || [], demo: !!ctx.demo, juice, safe: ctx.safe || null });
  if (stopped) { view.destroy(); return { stop() {}, state: () => run }; }

  // 화면 상태(엔진 밖: 시간·연출)
  const g = {
    phase: "intro", t: 0, aimT: 0, kickT: null, tc: null, outcome: null, pending: null, afterT: 0, hold: 0,
    aim: null, swipe: null, kCur: 0, cheer: false, sad: false, netHit: null, postHit: null,
    fireVis: false, slowVis: false, hint: true, lean: null, dots: [], resolved: false,
  };
  const replayBuf = [];   // 슛 한 번의 그릴 상태(느린 다시 보기)
  function contactTime() { const at = view && view.kickAtlas ? view.kickAtlas() : null; return at ? at.events.contact / (at.fps || 24) : 0.55; }

  if (!ctx.demo) hud.show({ kid, score: 0, round: "승부차기 1/5", line: "골대 구석으로 쓱!" });

  /* ---------- 입력 ---------- */
  const root = ctx.root;
  let ptr = null, downAt = -1;
  const rel = e => { const r = root.getBoundingClientRect(); return { x: e.clientX - r.left, y: e.clientY - r.top }; };
  function onDown(e) {
    downAt = performance.now();
    if (stopped || ctx.demo || g.phase !== "aim" || ctx.paused()) return;
    if (e.button > 0 || ptr) return;
    const p = rel(e);
    ptr = { id: e.pointerId, x0: p.x, y0: p.y, x: p.x, y: p.y, moved: false };
    try { root.setPointerCapture(e.pointerId); } catch (_) {}
  }
  function onMove(e) {
    if (!ptr || e.pointerId !== ptr.id) return;
    const p = rel(e); ptr.x = p.x; ptr.y = p.y;
    const d = Math.hypot(p.x - ptr.x0, p.y - ptr.y0);
    if (d > 16) {
      if (!ptr.moved) { ptr.moved = true; g.hint = false; }
      const a = view.aimFromSwipe(ptr.x0, ptr.y0, p.x, p.y);
      const as = R.assistAim(run, a.u, a.v);
      g.swipe = { power: a.power, ok: a.ok, raw: a };
      g.aim = as;
    }
  }
  function onUp(e) {
    if (!ptr || e.pointerId !== ptr.id) return;
    const p = ptr; ptr = null;
    try { root.releasePointerCapture(e.pointerId); } catch (_) {}
    if (g.phase !== "aim") { g.swipe = null; return; }
    const d = Math.hypot(p.x - p.x0, p.y - p.y0);
    if (p.moved && d > 34) {
      const a = view.aimFromSwipe(p.x0, p.y0, p.x, p.y);
      g.swipe = null;
      if (!a.ok) { if (!ctx.demo) juice.pop("골대 쪽으로 쓱!", { y: 0.3, cls: "small" }); return; }
      const power = level === 0 ? Math.max(0.7, Math.min(1.05, a.power)) : Math.max(0.25, Math.min(1.4, a.power));
      const as = R.assistAim(run, a.u, a.v);
      commitKick({ u: as.u, v: as.v, power, via: "swipe" });
    } else { g.swipe = null; if (!p.moved) tapKick(); }
  }
  function onCancel(e) { if (ptr && (!e || e.pointerId === ptr.id)) { ptr = null; g.swipe = null; } }
  root.addEventListener("pointerdown", onDown, true);
  root.addEventListener("pointermove", onMove);
  root.addEventListener("pointerup", onUp);
  root.addEventListener("pointercancel", onCancel);
  root.addEventListener("lostpointercapture", onCancel);
  // 톡(큰 톡 버튼·스페이스): 움직이는 과녁으로. 화면 위 손가락 톡은 위의 pointer 처리가 맡는다
  const offTap = ctx.input.onTap(() => { if (performance.now() - downAt < 80) return; tapKick(); });
  function tapKick() {
    if (stopped || g.phase !== "aim" || !g.aim) return;
    g.hint = false;
    commitKick({ u: g.aim.u, v: g.aim.v, power: level === 0 ? 0.9 : 0.95, via: "tap" });
  }
  // 몸으로: 기울이기 = 조준(좌우), 발차기 = 슛(세기·높이)
  let hip0 = null;
  const leanHist = [];
  const offFrame = camera ? ctx.camera.on("frame", ev => {
    const f = ev && ev.frame; if (!f || !f.ok) return;
    if (hip0 == null) hip0 = f.hip.x;
    hip0 += (f.hip.x - hip0) * 0.004;
    const lean = ((f.sh.x - f.hip.x) * 2.4 + (f.hip.x - hip0) * 1.2) / f.torso;
    const u = Math.max(-0.95, Math.min(0.95, lean * 1.5));
    g.lean = g.lean == null ? u : g.lean + (u - g.lean) * 0.25;
    leanHist.push({ t: performance.now(), u: g.lean }); if (leanHist.length > 40) leanHist.shift();
  }) : null;
  // 발을 차는 순간 몸이 기울어지니 0.3초 전 조준을 쓴다
  const leanBefore = ms => { const t = performance.now() - ms; let u = g.lean; for (const h of leanHist) if (h.t <= t) u = h.u; return u; };
  const offKick = camera ? ctx.camera.on("kick", ev => {
    if (g.phase !== "aim") return;
    const u = g.lean != null ? leanBefore(300) : (g.aim ? g.aim.u : 0);
    const v = level === 0 ? 0.4 : Math.max(0.1, Math.min(0.85, 0.25 + ((ev.height || 0.6) - 0.5) * 0.9));
    const power = Math.max(0.6, Math.min(1.1, (ev.speed || 4) / 5));
    const as = R.assistAim(run, u, v);
    g.hint = false;
    commitKick({ u: as.u, v: as.v, power, via: "camera" });
  }) : null;

  /* ---------- 슛 진행 ---------- */
  function newShot() {
    R.prepareShot(run);
    g.phase = "aim"; g.aimT = 0; g.kickT = null; g.tc = null; g.outcome = null; g.pending = null; g.resolved = false;
    g.cheer = false; g.sad = false; g.swipe = null; g.netHit = null; g.postHit = null;
    g.fireVis = run.fire; g.slowVis = run.slow;
    g.aim = R.assistAim(run, R.slideAim(run, 0).u, R.slideAim(run, 0).v);
    replayBuf.length = 0;
    if (!ctx.demo) {
      juice.clearText();          // 새 슛 = 앞 슛의 결과 배너·안내 글자 지우기(겹치지 않게)
      hud.dots(g.dots, run.total || R.SHOTS);
      const n = run.shot + 1;
      hud.set({ round: run.sudden ? `서든 데스 ${n - R.SHOTS}` : `승부차기 ${n}/${R.SHOTS}`, time: run.sudden ? 1 : 1 - run.shot / R.SHOTS, combo: run.streak, mult: run.fire ? R.POINTS.fireMult : 1, shield: 0 });
      if (run.fire) juice.announce("불꽃 슛 준비!", { sub: "어디로 차도 골키퍼가 못 막아요 🔥", cls: "gold", voice: "fire" });
      else if (run.slow) juice.announce("느림보 골키퍼!", { sub: "골키퍼가 졸려요 🐌", voice: "slow" });
      else if (run.keeper.reads && run.shot > 0) juice.pop("골키퍼가 지난번 쪽을 노려요!", { y: 0.26, cls: "small", ms: 1300, hint: true });
    }
  }
  function commitKick(shot) {
    if (g.phase !== "aim") return;
    g.pending = shot; g.aim = { u: shot.u, v: shot.v };
    g.phase = "kick"; g.kickT = 0; g.swipe = null;
  }
  function contact() {
    const o = R.shoot(run, g.pending);
    if (!o) return;
    o.catch = o.result === "save" && Math.abs(o.keeper.at - o.u) < o.keeper.reach * 0.55;
    g.outcome = o; g.tc = 0; g.phase = "flight"; g.hold = 0.06;
    view.cue({ type: "contact" });
    S.kick(o.power); S.fly(o.T, o.fire);
    if (o.fire) S.ignite();
  }
  function resolve() {
    const o = g.outcome; g.resolved = true;
    const big = o.fire || o.corner || o.result === "postIn" || o.sudden;
    g.dots.push(o.scored);
    if (ctx.demo) return;
    hud.dots(g.dots, Math.max(run.total || R.SHOTS, g.dots.length));
    if (o.scored) {
      g.netHit = { u: o.result === "postIn" ? o.u * 0.8 : o.u, v: o.v, t: g.t, power: Math.min(1.2, o.power) };
      if (o.result === "postIn") { g.postHit = g.t; S.post(); }
      S.net(); S.goal(big); sfx.crowd(big ? 1.5 : 1.2);
      if (o.corner) sfx.perfect();
      view.cue({ type: "goal", u: o.u, v: o.v, big, fire: o.fire });
      juice.confetti(big ? 160 : 90, { y: 0.32, spread: 1.4 });
      if (big) juice.flash(o.fire ? "#ffd27a" : "#ffffff", 240);
      const why = [];
      if (o.fire) why.push("불꽃 슛 ×1.5");
      if (o.result === "postIn") why.push("골대 맞고!");
      if (o.corner) why.push(o.top ? "위 구석!" : "구석!");
      if (o.power >= 0.9 && o.power <= 1.12) why.push("강슛");
      if (o.streak >= 2) why.push(`${o.streak}연속 골`);
      if (o.sudden) why.push("서든 데스 골!");
      juice.announce(o.fire ? "불꽃 골!!" : o.result === "postIn" ? "골대 맞고 골!" : "골!!", { sub: why.join(" · ") || "멋져요!", voice: "goal", cls: o.fire || big ? "gold" : "", pri: 2 });
      juice.pop(`+${o.points}`, { y: 0.42, cls: big ? "gold big" : "gold" });
      hud.pulse("score");
      if (o.fire || o.corner) ctx.replay.mark(g.t, o.points, o.fire ? "불꽃 슛" : "구석 골");
    } else {
      g.sad = true;
      if (o.result === "save") {
        S.save(); S.ooh(); view.cue({ type: "save", u: o.u, v: o.v });
        const tip = o.keeper.kind === "read" ? "골키퍼가 지난번 쪽을 읽었어요! 다른 쪽으로!" : o.power < 0.4 ? "더 세게 쓱!" : Math.abs(o.u) < 0.4 ? "구석으로 차 봐요!" : "아까워요!";
        juice.announce("막았다!", { sub: tip, voice: "save", pri: 2 });
      } else if (o.result === "post") {
        g.postHit = g.t; S.post(); S.ooh(); view.cue({ type: "post", u: o.u, v: o.v });
        juice.announce("땡! 골대", { sub: "아주 조금만 안쪽으로!", voice: "post", pri: 2 });
      } else {
        S.ooh(); sfx.miss();
        juice.announce("아깝다!", { sub: o.v > 1 ? "너무 세게 찼어요 · 조금 짧게 쓱!" : "골대 안쪽으로!", voice: "miss", pri: 2 });
      }
      juice.shake(ctx.root, 0.8);
    }
    hud.set({ score: run.score, combo: run.streak });
  }

  async function afterShot() {
    const o = g.outcome;
    g.phase = "busy";
    await ctx.wait(o.scored ? 900 : 1500);
    if (stopped) return;
    // 멋진 골(불꽃 슛·구석 골)만 느린 다시 보기(누르면 건너뛰기)
    if (o.scored && (o.fire || o.corner) && !ctx.demo && (!ctx.auto || ctx.qaReplay) && view.replay && replayBuf.length > 8) {
      const from = replayBuf.findIndex(f => f.s.tc != null) - 12;
      const frames = replayBuf.slice(Math.max(0, from)).filter(f => f.s.tc == null || f.s.tc <= o.T + 0.75);
      const t0 = frames[0].t;
      juice.clearText();          // 다시 보기 동안 배너·글자는 지운다(다시 보기 표시가 가려지지 않게)
      await view.replay({ frames: frames.map(f => ({ t: f.t - t0, s: f.s })) }, { speed: 0.35, label: o.fire ? "불꽃 슛!" : o.corner ? "구석 골!" : "골!" });
      if (stopped) return;
    }
    if (run.phase === "break") await bonusTime();
    else if (run.phase === "done") await finishRun();
    else newShot();
  }

  // 보너스 타임(2·4번째 슛 뒤): 문제를 맞히면 불꽃 슛(한 번에) / 느림보 골키퍼(고쳐서)
  async function bonusTime() {
    if (!quizOn) { R.nextShot(run, null); newShot(); return; }
    juice.announce("보너스 타임!", { sub: "맞히면 불꽃 슛 🔥", voice: "bonus", cls: "gold" });
    await ctx.wait(900);
    if (stopped) return;
    const r = await ctx.quiz.askReward("맞히면 불꽃 슛! 골키퍼가 못 막아요 🔥", {
      onCorrect: ({ firstTry }) => {
        const rw = R.quizReward(firstTry);
        // 정답 터치 안에서 바로(1초 안): 공에 불이 붙고 + 번쩍 + 소리 + 꽃가루
        if (firstTry) {
          g.fireVis = true; view.cue({ type: "fire" }); S.ignite(); sfx.rainbow();
          juice.flash("#ffd27a", 300); juice.confetti(140, { y: 0.5, colors: ["#ffd23f", "#ff8a1f", "#ff4d1f", "#ffffff"] });
          return `🔥 불꽃 슛! 꼭 골 · 점수 ×${R.POINTS.fireMult} · +${rw.bonus}점`;
        }
        g.slowVis = true; view.cue({ type: "slow" }); S.slow(); sfx.save();
        juice.flash("#bfe9ff", 260); juice.confetti(70, { y: 0.5 });
        return `🐌 느림보 골키퍼! 다음 슛은 골키퍼가 느려요 · +${rw.bonus}점`;
      },
    });
    if (stopped) return;
    if (r) {
      const rw = R.quizReward(r.firstTry);
      R.nextShot(run, rw);
      juice.pop(`+${rw.bonus}`, { y: 0.42, cls: "gold big" });
      sfx.crowd(1);
      hud.set({ score: run.score }); hud.pulse("score");
    } else R.nextShot(run, null);
    newShot();
  }

  async function finishRun() {
    // 청백전 서든 데스: 백군 차례가 청군(앞 차례)과 골 수가 같으면
    if (!run.sudden) {
      const now = Date.now(), team = kid.team;
      const tie = team && lastTurn && lastTurn.team && lastTurn.team !== team && now - lastTurn.at < 6 * 60 * 1000 && lastTurn.goals === run.goals;
      lastTurn = team ? { team, goals: run.goals, at: now } : null;
      if (tie && R.startSudden(run)) {
        sfx.whistle(); sfx.crowd(1.3);
        juice.announce("동점! 서든 데스!", { sub: "넣으면 계속, 막히면 끝!", voice: "sudden", cls: "gold" });
        await ctx.wait(1300);
        if (stopped) return;
        newShot();
        return;
      }
    }
    g.phase = "busy";
    const th = R.medalTable(level, quizOn);
    const medal = run.score >= th.gold ? "gold" : run.score >= th.silver ? "silver" : run.score >= th.bronze ? "bronze" : null;
    sfx.whistle(); juice.announce("끝!", { sub: `${run.goals}골 · ${run.score}점`, voice: "finish", pri: 2 });
    g.cheer = run.goals >= 3;
    await ctx.wait(1100);
    if (stopped) return;
    ctx.finish({ score: run.score, medal, stats: { ...run.stats, bestStreak: run.bestStreak, goals: run.goals } });
  }

  // 자동 차기(검증 ?qa=1&auto=1): 좋은 슛 85%
  function autoStep() {
    if (g.phase !== "aim" || g.aimT < 0.9) return;
    const k = run.keeper || {};
    let u, v, power;
    if (Math.random() < 0.85) { let side = k.gapSide || (Math.random() < 0.5 ? -1 : 1); if (!k.gapSide && run.lastSide && Math.random() < 0.8) side = -run.lastSide; u = side * (0.65 + Math.random() * 0.25); v = 0.15 + Math.random() * 0.6; power = 0.95; }
    else { u = (Math.random() - 0.5) * 0.4; v = 0.35; power = 0.8; }
    const a = R.assistAim(run, u, v);
    commitKick({ u: a.u, v: a.v, power, via: "auto" });
  }

  function snap() {
    const k = run.keeper;
    return {
      t: g.t, phase: g.phase === "busy" ? (g.outcome ? "after" : "aim") : g.phase, level, camera,
      kickT: g.kickT, tc: g.tc, outcome: g.outcome,
      aim: g.aim, swipe: g.swipe ? { power: g.swipe.power } : null,
      k0: g.kCur, lean: k ? k.lean : 0, reads: !!(k && k.reads), lastSide: run.lastSide, gapSide: k ? k.gapSide : 0,
      slow: g.outcome ? g.outcome.slow : g.slowVis || run.slow, fire: g.outcome ? g.outcome.fire : g.fireVis || run.fire,
      hint: g.hint && run.shot === 0 && g.phase === "aim" && !ctx.auto,
      cheer: g.cheer, sad: g.sad, netHit: g.netHit, postHit: g.postHit,
      dots: { total: run.total, list: g.dots.slice() },
    };
  }

  // 시작: 휘슬 → 첫 슛
  (async () => {
    if (!ctx.demo) { sfx.whistle(); juice.announce(run.P.miss ? "승부차기!" : "승부차기!", { sub: camera ? "몸을 기울여 조준, 발로 뻥!" : level === 0 ? "반짝이는 빈 곳으로 쓱!" : "골키퍼가 없는 구석으로 쓱!", voice: "go" }); }
    await ctx.wait(1000);
    if (stopped) return;
    newShot();
  })();

  const stopLoop = ctx.loop(dt => {
    if (stopped) return;
    if (g.hold > 0) { g.hold -= dt; dt *= 0.15; }          // 공이 발에 맞는 순간 아주 잠깐 멈칫(타격감)
    g.t += dt;
    const k = run.keeper;
    if (k) g.kCur += (k.k0 - g.kCur) * Math.min(1, dt * (g.slowVis ? 2 : 5));
    if (g.phase === "aim") {
      g.aimT += dt;
      if (!g.swipe) {
        if (camera && g.lean != null) g.aim = R.assistAim(run, g.lean, level === 0 ? 0.4 : 0.45);
        else { const a = R.slideAim(run, g.aimT); g.aim = R.assistAim(run, a.u, a.v); }
      }
      if (ctx.auto) autoStep();
    } else if (g.phase === "kick" || g.phase === "flight" || g.phase === "busy") {
      if (g.kickT != null) g.kickT += dt;
      if (g.phase === "kick" && g.kickT >= contactTime()) contact();
      if (g.tc != null) {
        g.tc += dt;
        if (!g.resolved && g.outcome && g.tc >= g.outcome.T) { resolve(); afterShot(); }
        if (g.outcome && g.outcome.scored && g.tc > g.outcome.T + 0.35) g.cheer = true;
      }
    }
    const s = snap();
    if (!ctx.demo) {
      const fireOn = g.phase === "aim" && (g.fireVis || run.fire), slowOn = g.phase === "aim" && (g.slowVis || run.slow);
      hud.buff("fire", fireOn ? "🔥 불꽃 슛" : null); hud.buff("slow", slowOn ? "🐌 느림보 골키퍼" : null);
    }
    if (!ctx.demo && g.kickT != null) { replayBuf.push({ t: g.t, s }); if (replayBuf.length > 400) replayBuf.shift(); }
    if (!ctx.demo) ctx.replay.push(g.t, s);
    view.render({ ...s, dt }, dt);
  });

  return {
    stop() {
      stopped = true; stopLoop(); offTap();
      if (offFrame) offFrame(); if (offKick) offKick();
      root.removeEventListener("pointerdown", onDown, true);
      root.removeEventListener("pointermove", onMove);
      root.removeEventListener("pointerup", onUp);
      root.removeEventListener("pointercancel", onCancel);
      root.removeEventListener("lostpointercapture", onCancel);
      if (view) { view.destroy(); view = null; }
    },
    // 검증용
    state: () => ({ ...run, view: g.phase, aim: g.aim, outcome: g.outcome }),
    actorRect: () => (view && view.actorRect ? view.actorRect() : null),
  };
}
