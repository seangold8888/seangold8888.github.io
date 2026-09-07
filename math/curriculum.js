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
    { id: 5, unit: "1학년 2학기", name: "십몇과 세 수의 계산", types: ["teenAdd", "teenSub", "three"], max: 19, visual: "always" },
    { id: 6, unit: "1학년 2학기", name: "받아올림·받아내림 없는 (몇십몇)±(몇)", types: ["twoOne"], max: 99, visual: "wrong" },
    { id: 7, unit: "1학년 2학기", name: "(몇십)±(몇십), 두 자리 수끼리", types: ["tensTens", "twoTwo"], max: 99, visual: "wrong" },
    { id: 8, unit: "1학년 2학기", name: "10을 만들어 더하기 (받아올림)", types: ["carry"], max: 18, visual: "always" },
    { id: 9, unit: "1학년 2학기", name: "받아내림이 있는 (십몇)−(몇)", types: ["borrow"], max: 18, visual: "always" },
    { id: 10, unit: "2학년 1학기", name: "받아올림이 있는 두 자리 덧셈", types: ["carry2"], max: 99, visual: "wrong" },
    { id: 11, unit: "2학년 1학기", name: "받아내림이 있는 두 자리 뺄셈", types: ["borrow2"], max: 99, visual: "wrong" }
  ];

  function levelById(id) { return LEVELS.find(function (l) { return l.id === id; }) || LEVELS[0]; }
  function between(rng, lo, hi) { return lo + Math.floor(rng() * (hi - lo + 1)); }
  function pick(rng, list) { return list[Math.floor(rng() * list.length)]; }
  // 숫자를 한글로 읽었을 때 받침 유무(일·삼·육·칠·팔·십). 조사 은/는, 와/과, 을/를 선택용.
  function batchim(n) { const d = n % 10; return d === 0 ? n !== 0 : [1, 3, 6, 7, 8].indexOf(d) >= 0; }
  function eun(n) { return n + (batchim(n) ? "은" : "는"); }
  function wa(n) { return n + (batchim(n) ? "과" : "와"); }
  function eul(n) { return n + (batchim(n) ? "을" : "를"); }

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
      case "teenAdd": return "10과 " + eun(v.total - 10) + " " + p.answer + (batchim(p.answer) ? "이에요." : "예요.");
      case "three": return "차례대로 계산하면 " + p.answer + (batchim(p.answer) ? "이에요." : "예요.");
      case "carry": return v.a + "에 " + eul(10 - v.a) + " 더해 10을 만들고, 남은 " + eul(v.b - (10 - v.a)) + " 더하면 " + p.answer + (batchim(p.answer) ? "이에요." : "예요.");
      case "borrow": return "10에서 " + eul(v.b) + " 빼면 " + (10 - v.b) + ", 남은 " + wa(v.a - 10) + " 더하면 " + p.answer + (batchim(p.answer) ? "이에요." : "예요.");
      default: return "십 막대와 낱개를 따로 세면 " + p.answer + (batchim(p.answer) ? "이에요." : "예요.");
    }
  }

  const api = { LEVELS: LEVELS, levelById: levelById, batchim: batchim, makeProblem: makeProblem, buildSession: buildSession, explain: explain, generators: Object.keys(GEN) };
  if (typeof module !== "undefined" && module.exports) module.exports = api;
  else root.Curriculum = api;
})(typeof window !== "undefined" ? window : globalThis);
