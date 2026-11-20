// 종목 2: 야구(홈런 더비). 규칙은 baseball-rules.js(엔진), 그림은 view(바꿔 끼우는 겉모습), 여기는 입력·진행·문제·소리·점수판.
// 공 10개: 곰돌이 투수가 던지면 톡 → 휘두르기. 5번째 공 뒤 보너스 타임(문제) → 황금 방망이(다음 공 3개 무조건 홈런).
// 태오: 느린 곧은 공·넓은 창·타이밍 고리 늘. 재이: 더 빠르고 뒤쪽에 가끔 느린 커브, 고리는 처음 두 공만.
import * as R from "./baseball-rules.js?v=1";
import { bb } from "./baseball-sfx.js?v=1";

const VIEWS = {
  stage: () => import("../views/baseball-stage.js?v=1"),
};

export default {
  id: "baseball",
  name: "야구",
  icon: "⚾",
  howTo: "공이 오면 톡! 홈런!",
  cameraMode: true,
  gestures: ["swing"],
  cameraLabel: "진짜로 휘두르기",
  demo: true,
  medals: (level, quizOn = true) => R.medalTable(level, quizOn),
  views: VIEWS,
  start,
};

// 그릴 상태(view·느린 다시 보기용). 평범한 값만(복사본).
function snap(s, extra) {
  const c = s.cur;
  return {
    t: s.t, phase: s.phase, phaseT: s.phaseT, pitch: s.pitch, slow: s.slow, wind: s.P.wind,
    cur: c ? { flight: c.flight, curve: c.curve, golden: c.golden, swungAt: c.swungAt, swingGT: c.swingGT, grade: c.grade, d: c.d } : null,
    hit: s.hit ? { ...s.hit } : null,
    golden: s.golden, streak: s.streak, prevSwing: s.prevSwing, arriveIn: R.arriveIn(s), ...extra,
  };
}

async function start(ctx) {
  const { kid, sfx, juice, hud } = ctx;
  const level = kid.level;
  const camera = !!ctx.camera;
  const quizOn = !ctx.demo && ctx.quiz.enabled;
  const rnd = Math.random;
  let s = R.createRun({ level, camera, rnd });
  let stopped = false, view = null, busy = false, goldenPreview = 0;

  const viewKind = VIEWS[ctx.viewKind] ? ctx.viewKind : "stage";
  const mod = await VIEWS[viewKind]();
  if (stopped) return;
  view = await mod.createView({ root: ctx.root, kid, cast: ctx.cast || [], demo: !!ctx.demo, juice, frame: ctx.frame || null, safe: ctx.safe || null });
  if (stopped) { view.destroy(); return; }

  const line = camera ? "진짜로 휘둘러요!" : "공이 오면 톡!";
  if (!ctx.demo) hud.show({ kid, score: 0, round: roundText(), line });
  function roundText() { return `${Math.min(R.PITCHES, s.pitch + 1)} / ${R.PITCHES}구`; }

  // 입력: 화면 아무 데나 톡(+ 큰 톡 버튼, 스페이스). 카메라 모드도 손가락은 늘 같이 된다.
  const offTap = ctx.input.onTap(() => doTap(0));
  const offSwing = camera ? ctx.camera.on("swing", ev => {
    const lag = Math.max(-0.3, Math.min(0, ((ev.t || performance.now()) - performance.now()) / 1000));
    doTap(lag);
  }) : null;
  function doTap(at) {
    if (stopped || busy || ctx.demo) return;
    if (R.tap(s, at)) drain();
  }

  // 자동 휘두르기: 시연(첫 화면 뒤)·검증(?qa=1&auto=1)
  const auto = ctx.demo || ctx.auto;
  let plan;
  function autoStep() {
    if (s.phase !== "pitch" || s.cur.swungAt != null) { if (s.phase !== "pitch") plan = undefined; return; }
    if (plan === undefined) {
      const d = ctx.demo ? R.autoPlanD(s, Math.random() < 0.8, 0.4, Math.random) : R.autoPlanD(s, true, 0.5, Math.random);
      plan = d == null ? null : s.cur.flight + d - R.SWING_LEAD;
    }
    if (plan != null && s.phaseT >= plan) { R.tap(s, plan - s.phaseT); drain(); }
  }

  const replay = ctx.replay;
  let lastShownScore = 0, markedFor = null;

  // 엔진 이벤트 → 소리·효과·점수판·그림
  function drain() {
    for (const ev of s.events) {
      if (view && view.cue) view.cue(ev);
      if (ctx.demo) continue;
      switch (ev.type) {
        case "go": sfx.whistle(); juice.announce("플레이 볼!", { sub: line, voice: "go" }); break;
        case "windup":
          hud.set({ round: roundText(), time: R.pitchesLeft(s) / R.PITCHES });
          if (ev.golden) juice.pop("황금 방망이!", { y: 0.3, cls: "gold small", ms: 1100 });
          else if (ev.curve) juice.pop("느린 커브! 기다렸다 톡", { y: 0.3, cls: "small", ms: 1300 });
          break;
        case "release": bb.pitch(1.2 / ev.flight); break;
        case "swing": if (ev.grade === "whiff") bb.whiff(); else sfx.whoosh(1.6); break;
        case "hit": onHit(ev); break;
        case "whiff": sfx.miss(); juice.pop("헛스윙!", { y: 0.42, cls: "oops" }); bb.mitt(); break;
        case "strike": bb.mitt(); juice.pop("스트라이크!", { y: 0.42, cls: "oops small" }); break;
        case "golden": break;
      }
    }
    if (!ctx.demo) {
      if (s.score !== lastShownScore) { lastShownScore = s.score; hud.set({ score: s.score }); hud.pulse("score"); }
      hud.set({ combo: s.streak });
    }
    s.events.length = 0;
  }

  // 친 뒤 늦게 뜨는 글자: 게임 시계(배속)로 기다리고, 다음 공을 치면 앞 공의 것은 취소(홈런·안타가 같이 뜨지 않게)
  let hitTok = 0;
  const later = (ms, fn) => { const tok = hitTok; ctx.wait(ms).then(() => { if (!stopped && tok === hitTok) fn(); }); };
  function onHit(ev) {
    const g = ev.grade;
    hitTok++; juice.clearText();
    bb.crack(g === "perfect" ? 1 : g === "great" ? 0.8 : g === "good" ? 0.55 : 0.3);
    if (g === "perfect") {
      sfx.perfect(); juice.flash("#ffffff", 200);
      later(120, () => bb.soar(1.6));
      later(900, () => { sfx.fanfare(); sfx.crowd(1.4); juice.announce("장외 홈런!!", { sub: `${ev.dist}m · +${ev.points}점` + (ev.streak >= 2 ? ` · 연속 ${ev.streak}` : ""), voice: "homerun", cls: "rainbow", pri: 2 }); juice.confetti(160, { y: 0.3 }); });
      later(2000, () => sfx.crowd(1.4));
    } else if (g === "great") {
      later(80, () => bb.soar(1.1));
      later(1500, () => { sfx.crowd(1.2); sfx.combo(5 + ev.streak * 3); juice.announce(ev.golden ? "황금 홈런!" : "홈런!", { sub: `${ev.dist}m · +${ev.points}점` + (ev.streak >= 2 ? ` · 연속 ${ev.streak}` : ""), voice: "homerun", cls: "gold", pri: 2 }); juice.confetti(90, { y: 0.32 }); });
    } else if (g === "good") {
      sfx.ok(3); later(600, () => { sfx.crowd(0.7); juice.pop(`안타! +${ev.points}`, { y: 0.36 }); });
    } else {
      juice.pop("파울~", { y: 0.4, cls: "small" });
    }
    if (ev.points > 0) hud.pulse("combo");
  }

  // 판 사이(5번째 공 뒤): 보너스 문제 → 황금 방망이. 문제를 못 내면 보너스 없이 바로 다음 공.
  async function breakTime() {
    busy = true;
    let reward = null;
    if (quizOn) {
      juice.announce("보너스 타임!", { sub: "맞히면 황금 방망이 ⚾", voice: "bonus", cls: "gold" });
      await ctx.wait(900);
      if (stopped) return;
      const r = await ctx.quiz.askReward("맞히면 황금 방망이! 휘두르면 무조건 홈런", {
        onCorrect: ({ firstTry }) => {
          // 정답 터치 안에서 바로: 아이가 금빛으로 번쩍 + 방망이 반짝 + 종소리 + 꽃가루(1초 안 보상)
          const rw = R.quizReward(firstTry);
          goldenPreview = rw.golden;
          if (view && view.cue) view.cue({ type: "goldenGet", n: rw.golden, firstTry });
          bb.golden(); sfx.rainbow(); juice.flash("#fff3b0", 280);
          juice.confetti(firstTry ? 140 : 70, { y: 0.45, colors: ["#ffd23f", "#fff7a8", "#ffffff", "#ffb300", "#ff9a1f"] });
          return firstTry ? `⚾ 황금 방망이! 다음 공 ${rw.golden}개 무조건 홈런 · +${rw.bonus}점` : `⚾ 황금 방망이! 다음 공 ${rw.golden}개 무조건 홈런`;
        },
      });
      if (stopped) return;
      if (r) {
        reward = R.quizReward(r.firstTry);
        juice.pop(`+${reward.bonus}`, { y: 0.42, cls: "gold big" });
        juice.announce("황금 방망이!", { sub: `다음 공 ${reward.golden}개 · 휘두르면 무조건 홈런`, voice: "golden", cls: "gold" });
        sfx.crowd(1);
      }
    } else {
      juice.announce("후반전!", { sub: "남은 공 5개" });
      await ctx.wait(700);
      if (stopped) return;
    }
    goldenPreview = 0;
    R.afterBreak(s, reward);
    drain();
    busy = false;
  }

  async function finishRun() {
    busy = true;
    const th = R.medalTable(level, quizOn);
    const medal = s.score >= th.gold ? "gold" : s.score >= th.silver ? "silver" : s.score >= th.bronze ? "bronze" : null;
    hitTok++; sfx.whistle(); juice.announce("경기 끝!", { sub: `홈런 ${s.stats.homers}개 · ${s.score}점`, voice: "finish", pri: 2 });
    await ctx.wait(1100);
    if (stopped) return;
    const clip = replay.clip;               // 다시 보기는 장외 홈런(퍼펙트)만
    if (clip && clip.weight >= 200 && view && view.replay && (!ctx.auto || ctx.qaReplay)) {
      juice.clearText();          // 다시 보기 동안 배너·글자는 지운다(다시 보기 표시가 가려지지 않게)
      await view.replay(clip, { speed: 0.4, label: clip.label });
      if (stopped) return;
    }
    ctx.finish({ score: s.score, medal, stats: { ...s.stats, bestStreak: s.bestStreak, results: s.results.map(r => r.grade) } });
  }

  const helperRing = s.P.ring;
  const stopLoop = ctx.loop(dt => {
    if (stopped) return;
    if (!busy) {
      if (auto) autoStep();
      R.step(s, dt);
      drain();
      // 멋진 순간(홈런): 친 뒤 1.5초에 표시 → 친 순간부터 날아가는 공까지 느린 다시 보기
      if (!ctx.demo && s.hit && (s.hit.grade === "perfect" || s.hit.grade === "great") && markedFor !== s.hit.at && s.t >= s.hit.at + 1.5) {
        markedFor = s.hit.at;
        if (s.hit.grade === "perfect") replay.mark(s.t, 200 + s.hit.dist, "장외 홈런");
      }
      if (!ctx.demo) replay.push(s.t, snap(s));
      if (s.phase === "break") {
        if (ctx.demo) R.afterBreak(s, null);
        else breakTime();
      } else if (s.phase === "done") {
        if (ctx.demo) s = R.createRun({ level, rnd });
        else finishRun();
      }
    }
    if (!ctx.demo) { const n = (s.cur && s.cur.golden && s.phase !== "result" ? 1 : 0) + (s.golden || 0) || goldenPreview || 0; hud.buff("golden", n > 0 ? `⚾ 황금 방망이 ×${n}` : null); }
    if (view) view.render(snap(s, { ring: !ctx.demo && (helperRing || s.pitch < 2), camera, goldenPreview }), dt);
  });

  return {
    stop() {
      stopped = true; stopLoop(); offTap(); if (offSwing) offSwing();
      if (view) { view.destroy(); view = null; }
    },
    // 검증용
    state: () => s,
    actorRect: () => (view && view.actorRect ? view.actorRect() : null),
  };
}
