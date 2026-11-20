// 허브 공통 문제(window.GameQuiz) 감싸기 — 운동회 규칙:
//  - GameQuiz 가 없거나 자동 검증 브라우저(navigator.webdriver)면 문제를 아예 내지 않는다(enabled=false, askReward → null).
//    종목은 enabled 가 false 면 보너스 자리를 만들지 않는다(문제 없이 받는 핵심 보상 금지).
//  - 검증에서 문제 화면을 꼭 봐야 하면 ?qa=1&quiz=1 로 강제로 켠다. ?noquiz=1 은 강제로 끈다.
//  - 문제는 판 사이 "보너스" 자리에서만 묻는다(동작 한가운데 끊지 않기). 종목이 스스로 멈춘 뒤 부른다.
//  - 보상은 onCorrect(정답 터치 처리 안)에서 바로 보이게 준다: 1초 안에 몸으로 느껴지는 큰 보상.

export function createQuiz(opts = {}) {
  const qs = opts.qs || new URLSearchParams(typeof location !== "undefined" ? location.search : "");
  const QA = qs.get("qa") === "1";
  const GQ = typeof window !== "undefined" ? window.GameQuiz || null : null;
  const robot = typeof navigator !== "undefined" && !!navigator.webdriver;
  let enabled = !!GQ && (!robot || (QA && qs.get("quiz") === "1"));
  if (qs.get("noquiz") === "1") enabled = false;
  let open = false;

  return {
    get enabled() { return enabled; },
    get open() { return open; },
    setKid(id) { try { if (GQ && id) GQ.setKid(id); } catch (_) {} },
    // 종목용: askReward(kidId, title, { onCorrect, pace, hint }) → Promise<{ correct:true, firstTry } | null>
    async askReward(kidId, title, o = {}) {
      if (!enabled || !GQ) return null;
      open = true;
      try {
        const r = await GQ.ask({
          kid: kidId, title: title || "맞히면 보너스!", hint: o.hint || "", pace: o.pace,
          theme: { bg: "rgba(18,40,110,.96)", accent: "#ffd84a" },
          closeDelay: o.closeDelay != null ? o.closeDelay : 520,
          onCorrect: res => { try { return o.onCorrect ? o.onCorrect({ firstTry: !!res.firstTry }) || "" : ""; } catch (e) { console.error(e); return ""; } },
          onWrong: o.onWrong,
        });
        return { correct: true, firstTry: !!(r && r.firstTry) };
      } finally { open = false; }
    },
    close() { try { if (GQ) GQ.close(); } catch (_) {} open = false; },
    peek() { try { return GQ ? GQ.peek() : null; } catch (_) { return null; } },
  };
}
