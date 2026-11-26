// 종목 1: 줄넘기. 규칙은 jumprope-rules.js(엔진), 그림은 view(바꿔 끼우는 겉모습), 여기는 입력·진행·문제·소리·점수판.
// 판: 1 줄넘기 → 보너스 문제(무지개 줄) → 2 빨라져요(재이는 2단 뛰기 기회) → 보너스 문제 → 3 슈퍼 스피드. 한 사람 약 75초.
// (꼬마 기차 판은 엔진에 있고 그림이 생기면 rounds 에 넣는다 — jumprope-rules.js 머리말)
import * as R from "./jumprope-rules.js?v=2";

// 겉모습(view) 목록. 그림 방식을 바꾸면 여기에 새 view 를 넣고 main.js 의 VIEW_KIND 를 바꾼다.
const VIEWS = {
  stage: () => import("../views/jumprope-stage.js?v=2"),
};

export default {
  id: "jumprope",
  name: "줄넘기",
  icon: "🪢",
  howTo: "줄이 발에 오면 톡!",
  cameraMode: true,
  gestures: ["jump"],
  cameraLabel: "진짜로 뛰기",
  demo: true,
  medals: (level, quizOn = true) => R.medalTable(level, quizOn),
  views: VIEWS,
  start,
};

// 그릴 상태(view·느린 다시 보기용). 평범한 값만.
function snap(s, extra) {
  return {
    t: s.t, round: s.round, phase: s.phase, phaseT: s.phaseT, theta: s.theta, h: R.height(s), big: s.big,
    combo: s.combo, rainbow: s.rainbow, shield: s.shield, dbl: s.dbl, inRope: s.inRope, jumpers: s.jumpers,
    period: s.period, nextIn: R.nextCrossIn(s), lead: s.P.air / 2, lo: s.P.lo, hi: s.P.hi, sinceCross: s.t - s.lastCross,
    entry: s.P.entry, train: s.rounds[s.round] === "train", ...extra,
  };
}

async function start(ctx) {
  const { kid, sfx, juice, hud } = ctx;
  const level = kid.level;
  const camera = !!ctx.camera;
  const quizOn = !ctx.demo && ctx.quiz.enabled;
  let s = R.createRun({ level, camera });
  let stopped = false, view = null, busy = false;
  const helperRing = level <= 1;                   // 태오(level 0~1): 줄이 올 때를 알려 주는 고리 늘 보이기(재이는 1판만)
  const cast = ctx.cast || [];                      // 꼬마 기차에서 줄 돌리는 사촌·같이 타는 친구(아이 id 목록)

  const viewKind = VIEWS[ctx.viewKind] ? ctx.viewKind : "stage";
  const mod = await VIEWS[viewKind]();
  if (stopped) return;
  view = mod.createView({ root: ctx.root, kid, cast, demo: !!ctx.demo, juice, frame: ctx.frame || null, safe: ctx.safe || null });

  if (!ctx.demo) {
    hud.show({ kid, score: 0, round: R.roundDef(s, 0).name, line: camera ? "몸으로 뛰어요!" : R.roundDef(s, 0).line });
  }

  // 입력: 화면 아무 데나 톡(+ 큰 톡 버튼, 스페이스). 카메라 모드도 손가락은 늘 같이 된다.
  const offTap = ctx.input.onTap(() => doTap(0));
  const offJump = camera ? ctx.camera.on("jump", ev => {
    const lag = Math.max(-0.3, Math.min(0, ((ev.takeoff || ev.t) - performance.now()) / 1000));
    doTap(lag);
  }) : null;
  function doTap(at) {
    if (stopped || busy || ctx.demo) return;
    if (R.tap(s, at)) drain();
  }

  // 자동 뛰기: 시연(첫 화면 뒤) 과 검증(?qa=1&auto=1)
  const auto = ctx.demo || ctx.auto;
  let plan = null;
  function autoStep() {
    if (s.phase !== "play") { plan = null; return; }
    if (s.rounds[s.round] === "train" && !s.inRope) {
      if (!plan) { const f = (s.P.entry[0] + s.P.entry[1]) / 2; let at = s.lastCross > 0 ? s.lastCross + f * s.period : s.t + 0.2; if (at < s.t) at += s.period; plan = { at }; }
    } else if (!plan && !R.airborne(s)) {
      const until = R.nextCrossIn(s);
      if (until < 2) {
        const wobble = ctx.demo ? (Math.random() - 0.5) * 0.08 : 0;
        plan = { at: s.t + until - s.P.air / 2 + wobble, dbl: s.dbl === "warn" };
      }
    }
    if (plan && s.t >= plan.at) {
      if (R.tap(s)) drain();
      if (plan.dbl && R.tap(s)) drain();
      plan = null;
    }
  }

  const replay = ctx.replay;
  let lastShownScore = 0;

  // 엔진 이벤트 → 소리·효과·점수판·그림
  function drain() {
    for (const ev of s.events) {
      if (view && view.cue) view.cue(ev);
      if (ctx.demo) continue;
      switch (ev.type) {
        case "jump": sfx.jump(); break;
        case "bigjump": sfx.bigjump(); juice.pop("2단!", { y: 0.42, cls: "gold" }); break;
        case "ok":
          sfx.ok(ev.combo);
          if (ev.grade === "perfect") { sfx.perfect(); juice.pop("퍼펙트!", { y: 0.42, cls: "perfect" }); }
          else if (ev.combo % 3 === 0) juice.pop("나이스!", { y: 0.44 });
          if (ev.combo > 0 && ev.combo % 10 === 0) { sfx.combo(ev.combo); sfx.crowd(1); juice.announce(`${ev.combo} 콤보!`, { sub: "대단해요!", voice: "combo" }); }
          hud.pulse("combo");
          break;
        case "double": sfx.double(); juice.flash("#fff3b0"); juice.announce("2단 뛰기 성공!", { voice: "double", cls: "gold", pri: 2 }); replay.mark(s.t, 100 + ev.combo, "2단 뛰기"); break;
        case "dblwarn": juice.pop("금빛 줄! 두 번 톡톡!", { y: 0.24, cls: "gold small", ms: 1200 }); break;
        case "miss": sfx.miss(); juice.pop("앗!", { y: 0.44, cls: "oops" }); juice.shake(ctx.root, 1.2); if (ev.scatter) juice.pop("기차가 흩어졌어요", { y: 0.46, cls: "small" }); break;
        case "save":
          sfx.save();
          if (ev.left > 0) juice.pop(`무지개가 지켜 줬어요! 🌈 ${ev.left}번 남았어요`, { y: 0.34, cls: "rainbow small", ms: 1300 });
          else { juice.pop("무지개가 지켜 줬어요!", { y: 0.34, cls: "rainbow small", ms: 1100 }); juice.announce("무지개 끝!", { sub: "이제 걸리면 넘어져요 · 줄이 발에 오면 톡!", pri: 2 }); }
          break;
        case "enter": sfx.enter(); juice.pop("쏙!", { y: 0.44 }); juice.announce("기차 출발!", { sub: "이제 줄을 넘어요", voice: "enter" }); break;
        case "bonk": sfx.bonk(); juice.pop("아직! 줄이 올라갈 때", { y: 0.36, cls: "small" }); break;
        case "join": sfx.join(); sfx.crowd(0.8); juice.announce("칙칙폭폭!", { sub: `${ev.n}칸 기차 · 점수 ×${R.trainMult(ev.n)}` }); replay.mark(s.t, 40 + ev.n * 10, "꼬마 기차"); break;
        case "go": sfx.whistle(); juice.announce(R.roundDef(s, ev.round).name, { sub: camera ? "몸으로 뛰어요!" : R.roundDef(s, ev.round).line, voice: "go" }); break;
      }
    }
    if (!ctx.demo) {
      if (s.score !== lastShownScore) { lastShownScore = s.score; hud.set({ score: s.score }); }
      hud.set({ combo: s.combo, shield: s.shield, mult: s.mult * (s.rounds[s.round] === "train" ? R.trainMult(s.jumpers) : 1) });
      hud.buff("rainbow", s.rainbow && s.shield > 0 ? `🌈 무지개 줄 · ${s.shield}번 봐줘요` : null, { cls: "rainbow" });
    }
    s.events.length = 0;
  }

  // 판 사이: 보너스 문제(무지개 줄). 문제를 못 내면 보너스 없이 바로 다음 판.
  async function breakTime() {
    busy = true;
    const nextName = R.roundDef(s, s.round + 1).name;
    let reward = null;
    if (quizOn) {
      juice.announce("보너스 타임!", { sub: "맞히면 무지개 줄 🌈", voice: "bonus", cls: "rainbow" });
      await ctx.wait(900);
      if (stopped) return;
      const r = await ctx.quiz.askReward("맞히면 무지개 줄! 점수 ×1.5 · 실수를 봐줘요", {
        onCorrect: ({ firstTry }) => {
          // 정답 터치 안에서 바로: 줄이 무지개로 바뀌고 반짝 + 팡파르(1초 안 보상)
          const rw = R.quizReward(firstTry);
          s.rainbow = true; if (view && view.cue) view.cue({ type: "rainbow", firstTry });
          sfx.rainbow(); juice.flash("#ffffff", 260); juice.confetti(firstTry ? 120 : 60, { y: 0.45 });
          return firstTry ? `🌈 무지개 줄! +${rw.bonus}점 · ×${rw.mult} · 실수 ${rw.shield}번 봐줘요` : `🌈 무지개 줄! +${rw.bonus}점 · ×${rw.mult}`;
        },
      });
      if (stopped) return;
      if (r) {
        reward = R.quizReward(r.firstTry);
        juice.pop(`+${reward.bonus}`, { y: 0.42, cls: "rainbow big" });
        juice.announce("무지개 줄!", { sub: `${nextName} 점수 ×${reward.mult} · 실수 ${reward.shield}번 봐줘요`, voice: "rainbow", cls: "rainbow" });
        sfx.crowd(1);
      }
    } else {
      juice.announce(nextName, { sub: "다음 판!" });
      await ctx.wait(700);
      if (stopped) return;
    }
    R.nextRound(s, reward);
    hud.set({ round: nextName, line: camera ? "몸으로 뛰어요!" : R.roundDef(s).line });
    drain();
    busy = false;
  }

  async function finishRun() {
    busy = true;
    const medal = (() => { const th = R.medalTable(level, quizOn); return s.score >= th.gold ? "gold" : s.score >= th.silver ? "silver" : s.score >= th.bronze ? "bronze" : null; })();
    sfx.whistle(); juice.announce("끝!", { sub: `${s.score}점`, voice: "finish", pri: 2 });
    await ctx.wait(900);
    if (stopped) return;
    const clip = replay.clip;
    if (clip && clip.weight >= 100 && view && view.replay && (!ctx.auto || ctx.qaReplay)) {   // 다시 보기는 2단 뛰기 성공만
      juice.clearText();          // 다시 보기 동안 배너·글자는 지운다(다시 보기 표시가 가려지지 않게)
      await view.replay(clip, { speed: 0.4, label: clip.label });
      if (stopped) return;
    }
    ctx.finish({ score: s.score, medal, stats: { ...s.stats, bestCombo: s.bestCombo, rounds: s.roundScore.slice() } });
  }

  const stopLoop = ctx.loop(dt => {
    if (stopped) return;
    if (!busy) {
      if (auto) autoStep();
      R.step(s, dt);
      drain();
      if (!ctx.demo) replay.push(s.t, snap(s));
      if (!ctx.demo && s.phase === "play") hud.set({ time: R.timeLeft(s) / R.ROUND_LEN });
      if (s.phase === "break") {
        if (ctx.demo) s = R.createRun({ level, camera: false });   // 시연은 1판만 계속 돈다
        else breakTime();
      } else if (s.phase === "done") {
        if (ctx.demo) s = R.createRun({ level });
        else finishRun();
      }
    }
    if (view) view.render(snap(s, { helper: !ctx.demo && (helperRing || s.round === 0), camera }), dt);
  });

  return {
    stop() {
      stopped = true; stopLoop(); offTap(); if (offJump) offJump();
      if (view) { view.destroy(); view = null; }
    },
    // 검증용
    state: () => s,
    actorRect: () => (view && view.actorRect ? view.actorRect() : null),
  };
}
