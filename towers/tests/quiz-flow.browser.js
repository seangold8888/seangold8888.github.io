/* Spell Towers 탑 문제 화면 흐름 점검 — 브라우저에서 towers/?qa=1 을 연 뒤 이 파일 내용을 콘솔(또는 자동화 도구)에서 실행한다.
   결과: Promise<{ pass, results:[{ name, ok, info }] }>. 게임 판·저장을 건드리므로 마지막에 처음 화면으로 돌아가고 저장을 되돌린다.
   ※ 놀이 시간(hub_play_pass)이 없으면 페이지가 허브로 넘어간다 — 로컬에서 먼저 넣어 둔다.
   덮는 것: 한 번에(2단계) · 고쳐서(1단계) · 그만둠(수정 그대로) · 0.7초 잠금 · 두 번 누름 · 배지/카드 탑은 문제 없음 · 문제 모듈 없음(예전처럼). */
(async () => {
  const T = window.__towers;
  if (!T) return { pass: false, results: [{ name: "?qa=1 훅", ok: false }] };
  const results = [], ok = (name, cond, info) => results.push({ name, ok: !!cond, info });
  const sleep = ms => new Promise(r => setTimeout(r, ms));
  const tap = (el, id = 5) => { const r = el.getBoundingClientRect(), o = { pointerId: id, bubbles: true, clientX: r.left + r.width / 2, clientY: r.top + r.height / 2 }; el.dispatchEvent(new PointerEvent("pointerdown", o)); el.dispatchEvent(new PointerEvent("pointerup", o)); };
  const qbtns = () => [...document.querySelectorAll(".gq-btn")];
  const tapPad = i => { const p = T.world().pads[i]; T.tapAt(p.x, p.y - 8); };
  const waitMode = async (m, n = 60) => { for (let i = 0; i < n && T.s.mode !== m; i++) await sleep(50); return T.s.mode === m; };
  const saveBak = localStorage.getItem("towers_save_v1");
  const fresh = () => { T.begin({ kid: 1, map: "field" }); T.freeze(true); T.gems(400); };
  const pickKind = async (pad, k) => { tapPad(pad); await sleep(720); tap(document.querySelectorAll("#buildRow .tbtn")[k]); };
  const answer = async first => {
    const q = T.quiz(), bs = qbtns();
    if (!first) tap(bs[bs.findIndex(b => +b.textContent !== q.answer)]);
    tap(bs[bs.findIndex(b => +b.textContent === q.answer)]);
    await waitMode("resume");
  };
  try {
    if (!T.hasQuiz()) ok("문제 모듈 있음", false);
    // 1) 한 번에 → 2단계, 수정은 그때 한 번
    fresh(); await pickKind(0, 0);
    ok("탑 고르면 문제 + 게임 정지", T.s.mode === "buildquiz" && T.s.pending === "build" && T.quiz(), T.s.mode);
    ok("고른 순간엔 수정 그대로", T.s.gems === 400, T.s.gems);
    const t0 = T.s.t; await sleep(800); T.step(1 / 60, 30);
    ok("문제 동안 게임 시간 정지", T.s.t === t0 && T.s.prepT > 0, T.s.t + "/" + t0);
    await answer(true);
    ok("한 번에 → 2단계 탑", T.s.towers.includes("fire2@0"), T.s.towers.join());
    ok("수정 70 한 번", T.s.gems === 330, T.s.gems);
    ok("큰 탄생 효과", T.grow().some(g => g.big && g.lv === 2), JSON.stringify(T.grow()));
    T.step(1 / 60, 80);
    ok("1초 뒤 다시 진행", T.s.mode === "play" && T.s.pending === null, T.s.mode);
    // 2) 고쳐서 → 1단계
    await pickKind(1, 1); await sleep(760); await answer(false);
    ok("고쳐 맞힘 → 1단계 탑(거절 없음)", T.s.towers.includes("ice1@1"), T.s.towers.join());
    ok("작은 탄생 효과", T.grow().some(g => !g.big && g.lv === 1));
    ok("수정 80 한 번", T.s.gems === 250, T.s.gems);
    T.step(1 / 60, 80);
    // 3) 그만둠(← 다른 탑) → 수정 그대로, 탑 없음, 다시 탑 고르기
    await pickKind(2, 2);
    tap(document.getElementById("quizBack"));
    ok("← 다른 탑은 0.7초 잠금", T.s.mode === "buildquiz");
    await sleep(760); tap(document.getElementById("quizBack"));
    ok("그만두면 탑 고르기로", T.s.mode === "build" && !T.quiz(), T.s.mode);
    ok("그만두면 수정 그대로·탑 없음", T.s.gems === 250 && T.s.towers.length === 2, T.s.gems);
    T.toMenu(); fresh();
    // 4) 0.7초 잠금 + 두 번 누름: 탑 버튼 두 번 → 문제 하나, 잠긴 동안 누른 보기는 무시
    tapPad(3); await sleep(720);
    const tb = document.querySelectorAll("#buildRow .tbtn")[0]; tap(tb, 8); tap(tb, 9);
    tap(qbtns()[0], 10);
    ok("두 번 눌러도 문제 하나·답 안 고름", T.s.mode === "buildquiz" && qbtns().every(b => !b.disabled), qbtns().map(b => b.disabled).join());
    ok("두 번 눌러도 수정 그대로", T.s.gems === 400, T.s.gems);
    await sleep(760); await answer(true);
    ok("두 번 눌러도 탑은 하나", T.s.towers.length === 1 && T.s.gems === 330, T.s.towers.join() + " " + T.s.gems);
    T.step(1 / 60, 80);
    // 5) 배지 공짜 탑·카드 탑은 문제 없음
    T.freeTower(true); tapPad(4); await sleep(720); tap(document.querySelectorAll("#buildRow .tbtn")[3]);
    ok("배지 공짜 탑은 문제 없이", !T.quiz() && T.s.towers.some(s => s.startsWith("wind1")) && T.s.gems === 330, T.s.towers.join());
    T.step(1 / 60, 30);
    T.E.applyCard(T.world(), { type: "new", kind: "light" });
    ok("카드 새 탑은 문제 없이", !T.quiz() && T.s.towers.some(s => s.startsWith("light1")));
    // 6) 문제 모듈 없음 → 예전처럼 바로(이 페이지에서는 되돌릴 수 없으니 마지막)
    await sleep(300);   // 앞 단계의 창 닫기(180ms 뒤)가 새 판의 창을 닫지 않게
    T.toMenu(); fresh(); T.noQuiz();
    tapPad(0); await sleep(720); tap(document.querySelectorAll("#buildRow .tbtn")[0]);
    ok("문제 모듈 없으면 바로 세움", T.s.towers.includes("fire1@0") && T.s.gems === 330 && T.s.mode !== "buildquiz", JSON.stringify({ t: T.s.towers, g: T.s.gems, m: T.s.mode, q: T.hasQuiz(), b: document.getElementById("build").hidden }));
  } catch (e) { ok("예외 없음", false, String(e && e.stack || e)); }
  T.freeze(false); T.toMenu();
  if (saveBak == null) localStorage.removeItem("towers_save_v1"); else localStorage.setItem("towers_save_v1", saveBak);
  return { pass: results.every(r => r.ok), results };
})();
