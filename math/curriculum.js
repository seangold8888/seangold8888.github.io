/* 매일 수학 10분 — 교과 단계와 문제 생성 (순수 모듈, 브라우저·Node 공용)
   초1 교과서 차시 순서를 따른다. 각 문제는 { level, type, text, answer, visual } 이며
   visual 은 visual.js 가 그림으로 바꾸는 데이터다. 글자·숫자는 전부 DOM 텍스트. */
(function (root) {
  "use strict";

  const LEVELS = [
    { id: 1, unit: "1학년 1학기", name: "5까지 모으기와 가르기", types: ["split", "join"], max: 5, visual: "always" },
    { id: 2, unit: "1학년 1학기", name: "9까지 모으기와 가르기", types: ["split", "join"], max: 9, visual: "always" },
    { id: 3, unit: "1학년 1학기", name: "9까지의 덧셈과 뺄셈", types: ["add", "sub", "missing"], max: 9, visual: "always" },
    { id: 4, unit: "1학년 1학기", name: "10 모으기·가르기와 10 만들기", types: ["split10", "make10", "from10"], max: 10, visual: "always" },
    { id: 5, unit: "1학년 2학기", name: "100까지의 수", types: ["tensCount", "tensOnes", "readKor", "readSino", "nextNum", "prevNum", "tenMore", "seq", "bigger", "smaller", "hundred", "boxes", "leftover", "biggest2", "smallest2", "evenPick", "oddPick"], max: 100, visual: "wrong" },
    { id: 6, unit: "1학년 2학기", name: "십몇과 세 수의 계산", types: ["teenAdd", "teenSub", "three"], max: 19, visual: "always" },
    { id: 7, unit: "1학년 2학기", name: "받아올림·받아내림 없는 (몇십몇)±(몇)", types: ["twoOne"], max: 99, visual: "wrong" },
    { id: 8, unit: "1학년 2학기", name: "(몇십)±(몇십), 두 자리 수끼리", types: ["tensTens", "twoTwo"], max: 99, visual: "wrong" },
    { id: 9, unit: "1학년 2학기", name: "10을 만들어 더하기 (받아올림)", types: ["carry"], max: 18, visual: "always" },
    { id: 10, unit: "1학년 2학기", name: "받아내림이 있는 (십몇)−(몇)", types: ["borrow"], max: 18, visual: "always" },
    { id: 11, unit: "2학년 1학기", name: "받아올림이 있는 두 자리 덧셈", types: ["carry2"], max: 99, visual: "wrong" },
    { id: 12, unit: "2학년 1학기", name: "받아내림이 있는 두 자리 뺄셈", types: ["borrow2"], max: 99, visual: "wrong" }
  ];

  function levelById(id) { return LEVELS.find(function (l) { return l.id === id; }) || LEVELS[0]; }
  function between(rng, lo, hi) { return lo + Math.floor(rng() * (hi - lo + 1)); }
  function pick(rng, list) { return list[Math.floor(rng() * list.length)]; }
  // 숫자를 한글로 읽었을 때 받침 유무(일·삼·육·칠·팔·십). 조사 은/는, 와/과, 을/를 선택용.
  function batchim(n) { const d = n % 10; return d === 0 ? n !== 0 : [1, 3, 6, 7, 8].indexOf(d) >= 0; }
  function eun(n) { return n + (batchim(n) ? "은" : "는"); }
  function wa(n) { return n + (batchim(n) ? "과" : "와"); }
  function eul(n) { return n + (batchim(n) ? "을" : "를"); }

  // 한글 수 읽기 (학교 시험 그대로: 고유어 아흔둘 / 한자어 구십이)
  const NATIVE_TENS = ["", "열", "스물", "서른", "마흔", "쉰", "예순", "일흔", "여든", "아흔"];
  const NATIVE_ONES = ["", "하나", "둘", "셋", "넷", "다섯", "여섯", "일곱", "여덟", "아홉"];
  const SINO_TENS = ["", "십", "이십", "삼십", "사십", "오십", "육십", "칠십", "팔십", "구십"];
  const SINO_ONES = ["", "일", "이", "삼", "사", "오", "육", "칠", "팔", "구"];
  function shuffle(rng, list) { const a = list.slice(); for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(rng() * (i + 1)); const t = a[i]; a[i] = a[j]; a[j] = t; } return a; }
  function korNative(n) { return NATIVE_TENS[Math.floor(n / 10)] + NATIVE_ONES[n % 10]; }
  function korSino(n) { return SINO_TENS[Math.floor(n / 10)] + SINO_ONES[n % 10]; }

  // 각 생성기는 (rng, level) → 문제. text 의 □ 자리가 답이다.
  const GEN = {
    split: function (rng, L) {
      const n = between(rng, Math.max(2, L.max - 4), L.max), a = between(rng, 1, n - 1);
      return { text: eun(n) + " " + wa(a) + " □", answer: n - a,
        visual: { kind: "frame", total: n, a: a, ask: "b" } };
    },
    join: function (rng, L) {
      const a = between(rng, 1, L.max - 1), b = between(rng, 1, L.max - a);
      return { text: wa(a) + " " + eul(b) + " 모으면 □", answer: a + b,
        visual: { kind: "frame", total: a + b, a: a, ask: "total" } };
    },
    add: function (rng, L) {
      const a = between(rng, 1, L.max - 1), b = between(rng, 1, L.max - a);
      return { text: a + " + " + b + " = □", answer: a + b, visual: { kind: "frame", total: a + b, a: a, ask: "total" } };
    },
    sub: function (rng, L) {
      const a = between(rng, 2, L.max), b = between(rng, 1, a - 1);
      return { text: a + " − " + b + " = □", answer: a - b, visual: { kind: "frame", total: a, a: a - b, cross: b, ask: "b" } };
    },
    missing: function (rng, L) {
      const s = between(rng, 3, L.max), a = between(rng, 1, s - 1);
      return { text: a + " + □ = " + s, answer: s - a, visual: { kind: "frame", total: s, a: a, ask: "b" } };
    },
    split10: function (rng) {
      const a = between(rng, 1, 9);
      return { text: "10은 " + wa(a) + " □", answer: 10 - a, visual: { kind: "frame", total: 10, a: a, ask: "b" } };
    },
    make10: function (rng) {
      const a = between(rng, 1, 9);
      return { text: a + " + □ = 10", answer: 10 - a, visual: { kind: "frame", total: 10, a: a, ask: "b" } };
    },
    from10: function (rng) {
      const b = between(rng, 1, 9);
      return { text: "10 − " + b + " = □", answer: 10 - b, visual: { kind: "frame", total: 10, a: 10 - b, cross: b, ask: "b" } };
    },
    teenAdd: function (rng) {
      const b = between(rng, 1, 9);
      return { text: "10 + " + b + " = □", answer: 10 + b, visual: { kind: "frame", total: 10 + b, a: 10, ask: "total" } };
    },
    teenSub: function (rng) {
      const b = between(rng, 1, 9), keepTen = rng() < 0.5;
      if (keepTen) return { text: (10 + b) + " − " + b + " = □", answer: 10, visual: { kind: "frame", total: 10 + b, a: 10, cross: b, ask: "b" } };
      return { text: (10 + b) + " − 10 = □", answer: b, visual: { kind: "frame", total: 10 + b, a: b, cross: 10, ask: "b" } };
    },
    three: function (rng) {
      const plus = rng() < 0.5;
      if (plus) {
        const a = between(rng, 1, 5), b = between(rng, 1, 4), c = between(rng, 1, Math.max(1, 10 - a - b));
        return { text: a + " + " + b + " + " + c + " = □", answer: a + b + c, visual: { kind: "frame", total: a + b + c, a: a, b: b, ask: "total" } };
      }
      const a = between(rng, 5, 10), b = between(rng, 1, a - 2), c = between(rng, 1, a - b - 1);
      return { text: a + " − " + b + " − " + c + " = □", answer: a - b - c, visual: { kind: "frame", total: a, a: a - b - c, cross: b + c, ask: "b" } };
    },
    twoOne: function (rng) {
      const plus = rng() < 0.5, t = between(rng, 1, 9);
      if (plus) { const o = between(rng, 1, 8), b = between(rng, 1, 9 - o); return { text: (t * 10 + o) + " + " + b + " = □", answer: t * 10 + o + b, visual: { kind: "blocks", a: t * 10 + o, b: b, op: "+" } }; }
      const o = between(rng, 2, 9), b = between(rng, 1, o - 1);
      return { text: (t * 10 + o) + " − " + b + " = □", answer: t * 10 + o - b, visual: { kind: "blocks", a: t * 10 + o, b: b, op: "−" } };
    },
    tensTens: function (rng) {
      const plus = rng() < 0.5;
      if (plus) { const a = between(rng, 1, 8), b = between(rng, 1, 9 - a); return { text: a * 10 + " + " + b * 10 + " = □", answer: (a + b) * 10, visual: { kind: "blocks", a: a * 10, b: b * 10, op: "+" } }; }
      const a = between(rng, 2, 9), b = between(rng, 1, a - 1);
      return { text: a * 10 + " − " + b * 10 + " = □", answer: (a - b) * 10, visual: { kind: "blocks", a: a * 10, b: b * 10, op: "−" } };
    },
    twoTwo: function (rng) {
      const plus = rng() < 0.5;
      if (plus) {
        const t1 = between(rng, 1, 8), t2 = between(rng, 1, 9 - t1), o1 = between(rng, 0, 8), o2 = between(rng, 1, 9 - o1);
        return { text: (t1 * 10 + o1) + " + " + (t2 * 10 + o2) + " = □", answer: (t1 + t2) * 10 + o1 + o2, visual: { kind: "blocks", a: t1 * 10 + o1, b: t2 * 10 + o2, op: "+" } };
      }
      const t1 = between(rng, 2, 9), t2 = between(rng, 1, t1 - 1), o1 = between(rng, 1, 9), o2 = between(rng, 0, o1);
      return { text: (t1 * 10 + o1) + " − " + (t2 * 10 + o2) + " = □", answer: (t1 - t2) * 10 + o1 - o2, visual: { kind: "blocks", a: t1 * 10 + o1, b: t2 * 10 + o2, op: "−" } };
    },
    // ---- 1학년 2학기 1단원: 100까지의 수 ----
    tensCount: function (rng) {
      const t = between(rng, 5, 9);
      return { text: "10개씩 묶음 " + t + "개는 □", answer: t * 10, visual: { kind: "blocks", a: t * 10, b: 0, op: "+" } };
    },
    tensOnes: function (rng) {
      const t = between(rng, 5, 9), o = between(rng, 1, 9);
      return { text: "10개씩 묶음 " + t + "개와 낱개 " + o + "개는 □", answer: t * 10 + o, visual: { kind: "blocks", a: t * 10 + o, b: 0, op: "+" } };
    },
    readKor: function (rng) {
      const n = between(rng, 51, 99);
      return { text: korNative(n) + "을 수로 쓰면 □", answer: n, visual: { kind: "blocks", a: n, b: 0, op: "+" } };
    },
    readSino: function (rng) {
      const n = between(rng, 51, 99);
      return { text: korSino(n) + "을 수로 쓰면 □", answer: n, visual: { kind: "blocks", a: n, b: 0, op: "+" } };
    },
    nextNum: function (rng) {
      const n = between(rng, 50, 98);
      return { text: n + "보다 1만큼 더 큰 수는 □", answer: n + 1, visual: { kind: "blocks", a: n + 1, b: 0, op: "+" } };
    },
    prevNum: function (rng) {
      const n = between(rng, 51, 99);
      return { text: n + "보다 1만큼 더 작은 수는 □", answer: n - 1, visual: { kind: "blocks", a: n - 1, b: 0, op: "+" } };
    },
    tenMore: function (rng) {
      const t = between(rng, 5, 8), plus = rng() < 0.5;
      return plus
        ? { text: t * 10 + "보다 10만큼 더 큰 수는 □", answer: t * 10 + 10, visual: { kind: "blocks", a: t * 10 + 10, b: 0, op: "+" } }
        : { text: (t + 1) * 10 + "보다 10만큼 더 작은 수는 □", answer: t * 10, visual: { kind: "blocks", a: t * 10, b: 0, op: "+" } };
    },
    seq: function (rng) {
      const start = between(rng, 50, 92), hole = between(rng, 1, 3);
      const nums = [start, start + 1, start + 2, start + 3].map(function (v, i) { return i === hole ? "□" : v; });
      return { text: nums.join(" "), answer: start + hole, visual: { kind: "blocks", a: start + hole, b: 0, op: "+" } };
    },
    bigger: function (rng) {
      const a = between(rng, 51, 99); let b = between(rng, 51, 99);
      if (b === a) b = a > 60 ? a - 7 : a + 7;
      return { text: wa(a) + " " + b + " 중 더 큰 수는 □", answer: Math.max(a, b), visual: { kind: "blocks", a: Math.max(a, b), b: 0, op: "+" } };
    },
    smaller: function (rng) {
      const a = between(rng, 51, 99); let b = between(rng, 51, 99);
      if (b === a) b = a > 60 ? a - 7 : a + 7;
      return { text: wa(a) + " " + b + " 중 더 작은 수는 □", answer: Math.min(a, b), visual: { kind: "blocks", a: Math.min(a, b), b: 0, op: "+" } };
    },
    hundred: function (rng) {
      const which = Math.floor(rng() * 3);
      const text = which === 0 ? "99보다 1만큼 더 큰 수는 □" : which === 1 ? "90보다 10만큼 더 큰 수는 □" : "10개씩 묶음 10개는 □";
      return { text: text, answer: 100, visual: { kind: "blocks", a: 90, b: 10, op: "+" } };
    },
    boxes: function (rng) {
      const t = between(rng, 5, 9), o = between(rng, 1, 9), n = t * 10 + o;
      return { text: "구슬 " + n + "개를 10개씩 담으면 □상자", answer: t, visual: { kind: "blocks", a: n, b: 0, op: "+" } };
    },
    leftover: function (rng) {
      const t = between(rng, 5, 9), o = between(rng, 1, 9), n = t * 10 + o;
      return { text: "구슬 " + n + "개를 10개씩 담으면 남는 것은 □개", answer: o, visual: { kind: "blocks", a: n, b: 0, op: "+" } };
    },
    biggest2: function (rng) {
      const pool = [1, 2, 3, 4, 5, 6, 7, 8, 9], cards = [];
      while (cards.length < 3) { const c = pool.splice(Math.floor(rng() * pool.length), 1)[0]; cards.push(c); }
      const sorted = cards.slice().sort(function (x, y) { return y - x; });
      return { text: "숫자 카드 " + cards.join(", ") + " 중 2장으로 만든 가장 큰 두 자리 수는 □", answer: sorted[0] * 10 + sorted[1], visual: { kind: "blocks", a: sorted[0] * 10 + sorted[1], b: 0, op: "+" } };
    },
    smallest2: function (rng) {
      const pool = [1, 2, 3, 4, 5, 6, 7, 8, 9], cards = [];
      while (cards.length < 3) { const c = pool.splice(Math.floor(rng() * pool.length), 1)[0]; cards.push(c); }
      const sorted = cards.slice().sort(function (x, y) { return x - y; });
      return { text: "숫자 카드 " + cards.join(", ") + " 중 2장으로 만든 가장 작은 두 자리 수는 □", answer: sorted[0] * 10 + sorted[1], visual: { kind: "blocks", a: sorted[0] * 10 + sorted[1], b: 0, op: "+" } };
    },
    evenPick: function (rng) {
      // 짝수 하나와 홀수 둘을 섞어 보여 준다 (학교 시험의 짝수·홀수 고르기)
      const even = between(rng, 26, 49) * 2, list = shuffle(rng, [even, even + 1, even - 3]);
      return { text: list.join(", ") + " 중에서 짝수는 □", answer: even, visual: { kind: "blocks", a: even, b: 0, op: "+" } };
    },
    oddPick: function (rng) {
      const odd = between(rng, 25, 49) * 2 + 1, list = shuffle(rng, [odd, odd + 1, odd - 3]);
      return { text: list.join(", ") + " 중에서 홀수는 □", answer: odd, visual: { kind: "blocks", a: odd, b: 0, op: "+" } };
    },
    carry: function (rng) {
      const a = between(rng, 5, 9), b = between(rng, 11 - a, 9);
      // 10을 만들어 더하기: a + b = a + (10-a) + (b-(10-a))
      return { text: a + " + " + b + " = □", answer: a + b, visual: { kind: "carry", a: a, b: b } };
    },
    borrow: function (rng) {
      const b = between(rng, 2, 9), a = between(rng, 11, Math.min(18, b + 9));
      return { text: a + " − " + b + " = □", answer: a - b, visual: { kind: "borrow", a: a, b: b } };
    },
    carry2: function (rng) {
      const o1 = between(rng, 2, 9), o2 = between(rng, 10 - o1 + 0, 9), t1 = between(rng, 1, 7), twoDigit = rng() < 0.6;
      const t2 = twoDigit ? between(rng, 1, 8 - t1) : 0;
      const a = t1 * 10 + o1, b = t2 * 10 + o2;
      return { text: a + " + " + b + " = □", answer: a + b, visual: { kind: "blocks", a: a, b: b, op: "+" } };
    },
    borrow2: function (rng) {
      const t1 = between(rng, 2, 9), o1 = between(rng, 0, 8), o2 = between(rng, o1 + 1, 9), twoDigit = rng() < 0.6;
      const t2 = twoDigit ? between(rng, 1, t1 - 1) : 0;
      const a = t1 * 10 + o1, b = t2 * 10 + o2;
      return { text: a + " − " + b + " = □", answer: a - b, visual: { kind: "blocks", a: a, b: b, op: "−" } };
    }
  };

  function makeProblem(levelId, rng, type) {
    const L = levelById(levelId);
    rng = rng || Math.random;
    type = type || pick(rng, L.types);
    const p = GEN[type](rng, L);
    p.level = L.id; p.type = type;
    p.key = L.id + ":" + p.text;
    return p;
  }

  // 한 세션: 복습(due 항목, 최대 30%) + 현재 단계 + 한 단계 아래 워밍업 1~2문제.
  // 같은 문제는 세션 안에서 반복하지 않는다.
  function buildSession(opts) {
    const rng = opts.rng || Math.random, n = opts.count || 12, level = opts.level || 1;
    const review = (opts.review || []).slice(0, Math.floor(n * 0.3));
    const out = review.map(function (r) { return Object.assign({}, r.problem, { review: true, reviewKey: r.key }); });
    const warm = level > 1 ? Math.min(2, n - out.length - 6) : 0;
    const seen = {};
    out.forEach(function (p) { seen[p.key] = true; });
    let guard = 0;
    while (out.length < n && guard++ < 500) {
      const lv = out.length - review.length < warm ? level - 1 : level;
      const p = makeProblem(lv, rng);
      if (seen[p.key]) continue;
      seen[p.key] = true;
      out.push(p);
    }
    // 워밍업이 앞에, 복습은 중간에 섞이도록 가볍게 섞는다(첫 문제는 항상 쉬운 것).
    const first = out.filter(function (p) { return !p.review; }).slice(0, 1);
    const rest = out.filter(function (p) { return p !== first[0]; });
    for (let i = rest.length - 1; i > 0; i--) { const j = Math.floor(rng() * (i + 1)); const t = rest[i]; rest[i] = rest[j]; rest[j] = t; }
    return first.concat(rest);
  }

  // 틀린 뒤 보여줄 설명 한 줄 (아이 말투, "틀렸어" 금지)
  function explain(p) {
    const v = p.visual || {};
    switch (p.type) {
      case "split": case "split10": return eun(v.total) + " " + wa(v.a) + " " + p.answer + (batchim(p.answer) ? "이에요" : "예요") + ". 점을 세어 봐요.";
      case "join": return wa(v.a) + " " + eul(v.total - v.a) + " 모으면 " + p.answer + (batchim(p.answer) ? "이에요." : "예요.");
      case "add": return "파란 점 " + v.a + "개와 주황 점 " + (v.total - v.a) + "개, 모두 " + p.answer + "개예요.";
      case "sub": case "from10": case "teenSub": return v.total + "개에서 " + v.cross + "개를 지우면 " + p.answer + "개 남아요.";
      case "missing": case "make10": return v.a + "에 " + eul(p.answer) + " 더하면 " + v.total + (batchim(v.total) ? "이" : "가") + " 돼요. 빈칸을 세어 봐요.";
      case "tensCount": return "10개씩 " + (p.answer / 10) + "묶음이면 " + p.answer + (batchim(p.answer) ? "이에요." : "예요.") + " 십 막대를 세어 봐요.";
      case "tensOnes": return "십 막대 " + Math.floor(p.answer / 10) + "개와 낱개 " + (p.answer % 10) + "개, 모두 " + p.answer + (batchim(p.answer) ? "이에요." : "예요.");
      case "readKor": case "readSino": return korNative(p.answer) + "은 " + korSino(p.answer) + ", 숫자로는 " + p.answer + (batchim(p.answer) ? "이에요." : "예요.");
      case "nextNum": return "1만큼 더 큰 수는 바로 다음 수, " + p.answer + (batchim(p.answer) ? "이에요." : "예요.");
      case "prevNum": return "1만큼 더 작은 수는 바로 앞의 수, " + p.answer + (batchim(p.answer) ? "이에요." : "예요.");
      case "tenMore": return "10만큼 뛰면 십 막대가 하나 늘거나 줄어요. 답은 " + p.answer + (batchim(p.answer) ? "이에요." : "예요.");
      case "seq": return "수를 순서대로 세면 " + p.answer + "이 들어가요.";
      case "bigger": return "10개씩 묶음 수부터 비교해요. 더 큰 수는 " + p.answer + (batchim(p.answer) ? "이에요." : "예요.");
      case "smaller": return "10개씩 묶음 수부터 비교해요. 더 작은 수는 " + p.answer + (batchim(p.answer) ? "이에요." : "예요.");
      case "hundred": return "99보다 1 큰 수, 90보다 10 큰 수, 10개씩 묶음 10개 — 모두 100이에요.";
      case "boxes": return "십 막대가 " + p.answer + "개니까 " + p.answer + "상자예요.";
      case "leftover": return "10개씩 담고 남는 낱개가 " + p.answer + "개예요.";
      case "biggest2": return "큰 숫자를 앞(십의 자리)에 놓으면 " + p.answer + (batchim(p.answer) ? "이에요." : "예요.");
      case "smallest2": return "작은 숫자를 앞(십의 자리)에 놓으면 " + p.answer + (batchim(p.answer) ? "이에요." : "예요.");
      case "evenPick": return "둘씩 짝을 지으면 남는 것이 없는 수가 짝수, " + p.answer + (batchim(p.answer) ? "이에요." : "예요.");
      case "oddPick": return "둘씩 짝을 지으면 하나가 남는 수가 홀수, " + p.answer + (batchim(p.answer) ? "이에요." : "예요.");
      case "teenAdd": return "10과 " + eun(v.total - 10) + " " + p.answer + (batchim(p.answer) ? "이에요." : "예요.");
      case "three": return "차례대로 계산하면 " + p.answer + (batchim(p.answer) ? "이에요." : "예요.");
      case "carry": return v.a + "에 " + eul(10 - v.a) + " 더해 10을 만들고, 남은 " + eul(v.b - (10 - v.a)) + " 더하면 " + p.answer + (batchim(p.answer) ? "이에요." : "예요.");
      case "borrow": return "10에서 " + eul(v.b) + " 빼면 " + (10 - v.b) + ", 남은 " + wa(v.a - 10) + " 더하면 " + p.answer + (batchim(p.answer) ? "이에요." : "예요.");
      default: return "십 막대와 낱개를 따로 세면 " + p.answer + (batchim(p.answer) ? "이에요." : "예요.");
    }
  }

  const api = { LEVELS: LEVELS, levelById: levelById, batchim: batchim, korNative: korNative, korSino: korSino, makeProblem: makeProblem, buildSession: buildSession, explain: explain, generators: Object.keys(GEN) };
  if (typeof module !== "undefined" && module.exports) module.exports = api;
  else root.Curriculum = api;
})(typeof window !== "undefined" ? window : globalThis);
