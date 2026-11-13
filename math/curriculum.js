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
    { id: 12, unit: "2학년 1학기", name: "받아내림이 있는 두 자리 뺄셈", types: ["borrow2"], max: 99, visual: "wrong" },
    // 13단계부터: 2학년 2학기 ~ 4학년 1학기 (답은 늘 정수 하나, 보기용 오답 후보 distractors 를 함께 싣는다)
    { id: 13, unit: "2학년 2학기", name: "곱셈구구 (2·5·3·4단)", types: ["mulFact", "mulGroups", "mulTimes"], max: 45, visual: "wrong", tables: [2, 5, 3, 4] },
    { id: 14, unit: "2학년 2학기", name: "곱셈구구 (6~9단)와 빈칸 곱셈", types: ["mulFact", "mulGroups", "mulMissing"], max: 81, visual: "wrong", tables: [6, 7, 8, 9] },
    { id: 15, unit: "3학년 1학기", name: "세 자리 수의 덧셈과 뺄셈", types: ["add3", "sub3", "story3"], max: 999, visual: "wrong" },
    { id: 16, unit: "3학년 1학기", name: "나눗셈 (똑같이 나누기)", types: ["divFact", "divShare", "divGroups"], max: 9, visual: "wrong" },
    { id: 17, unit: "3학년 1학기", name: "(두 자리 수)×(한 자리 수)", types: ["mulTens", "mul21", "mul21Story"], max: 891, visual: "wrong" },
    { id: 18, unit: "3학년 2학기", name: "나머지가 있는 나눗셈과 자릿값", types: ["divQuot", "divRem", "placeDigit"], max: 19, visual: "wrong" },
    { id: 19, unit: "3학년 2학기~4학년 1학기", name: "분수 기초와 큰 수", types: ["fracOf", "fracCount", "bigDigit"], max: 81, visual: "wrong" }
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
  // 한글 낱말 끝 글자 받침 유무(유니코드 한글 음절 % 28). 낱말 뒤 조사용: josa("사탕", "을", "를") → "사탕을"
  function hasFinal(word) { const s = String(word), c = s.charCodeAt(s.length - 1); return c >= 0xAC00 && c <= 0xD7A3 && (c - 0xAC00) % 28 !== 0; }
  function josa(word, withFinal, without) { return word + (hasFinal(word) ? withFinal : without); }
  // 새 문구용: 0 은 "영"으로 읽어 받침이 있다(기존 batchim(0) 은 1~12단계 문구 보존을 위해 그대로 둔다)
  function fin(n) { return n === 0 || batchim(n); }
  function ie(n) { return n + (fin(n) ? "이에요." : "예요."); }
  function ga(n) { return n + (fin(n) ? "이" : "가"); }
  function nikka(n) { return n + (fin(n) ? "이니까" : "니까"); }
  // 분수 k/d 를 읽으면 "d분의 k" 라서 조사는 분자 k 의 받침을 따른다 (1/3은, 2/3는)
  function frac(k, d) { return k + "/" + d; }
  function fracEun(k, d) { return frac(k, d) + (batchim(k) ? "은" : "는"); }
  function fracIe(k, d) { return frac(k, d) + (batchim(k) ? "이에요." : "예요."); }

  // ---- 13단계 이상 도우미 ----
  const OBJECTS = [["사탕", "개"], ["구슬", "개"], ["연필", "자루"], ["색종이", "장"], ["딸기", "개"], ["공책", "권"]];
  const PLACES4 = ["천", "백", "십", "일"], PLACES5 = ["만", "천", "백", "십", "일"];
  function positive(list) { return list.filter(function (v) { return Number.isInteger(v) && v >= 0; }); }
  function mulWrong(a, b) { return positive([a * (b - 1), a * (b + 1), (a - 1) * b, (a + 1) * b, a + b]); }
  function digitsOf(n) { return String(n).split("").map(Number); }
  // 받아올림을 빠뜨린 합 / 받아내림 없이 큰 수에서 작은 수를 뺀 값 (자리마다 따로 계산하는 전형적 실수)
  function noCarrySum(a, b) { const x = digitsOf(a).reverse(), y = digitsOf(b).reverse(); let out = 0, p = 1; for (let i = 0; i < Math.max(x.length, y.length); i++, p *= 10) out += (((x[i] || 0) + (y[i] || 0)) % 10) * p; return out; }
  function noBorrowDiff(a, b) { const x = digitsOf(a).reverse(), y = digitsOf(b).reverse(); let out = 0, p = 1; for (let i = 0; i < x.length; i++, p *= 10) out += Math.abs((x[i] || 0) - (y[i] || 0)) * p; return out; }
  function carries(a, b) { const o = a % 10 + b % 10; return o >= 10 || Math.floor(a / 10) % 10 + Math.floor(b / 10) % 10 + (o >= 10 ? 1 : 0) >= 10; }
  function borrows(a, b) { return a % 10 < b % 10 || Math.floor(a / 10) % 10 < Math.floor(b / 10) % 10; }
  function pickAdd3(rng) {
    const needCarry = rng() < 0.85; let a, b, guard = 0;
    do { a = between(rng, 120, 850); b = between(rng, 101, 999 - a); } while (needCarry && !carries(a, b) && guard++ < 60);
    return [a, b];
  }
  function pickSub3(rng) {
    const needBorrow = rng() < 0.85; let a, b, guard = 0;
    do { a = between(rng, 230, 999); b = between(rng, 101, a - 20); } while (needBorrow && !borrows(a, b) && guard++ < 60);
    return [a, b];
  }
  function add3Wrong(a, b) { const s = a + b; return positive([s + 10, s - 10, s + 100, s - 100, noCarrySum(a, b)]).filter(function (v) { return v <= 999; }); }
  function sub3Wrong(a, b) { const s = a - b; return positive([s + 10, s - 10, s + 100, s - 100, noBorrowDiff(a, b)]); }
  function distinctDigits(rng, count) {
    const pool = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9], out = [];
    while (out.length < count) { const d = pool.splice(Math.floor(rng() * pool.length), 1)[0]; if (out.length === 0 && d === 0) { pool.push(d); continue; } out.push(d); }
    return out;
  }
  // 나머지가 있는 나눗셈: c = d × q + r (r ≥ 1). 가끔은 몫이 두 자리(나누는 수 2~5)
  function pickDivRem(rng) {
    const d = between(rng, 2, 9);
    const q = d <= 5 && rng() < 0.3 ? between(rng, 10, Math.min(19, Math.floor((100 - d) / d))) : between(rng, 2, 9);
    const r = between(rng, 1, d - 1);
    return { d: d, q: q, r: r, c: d * q + r };
  }

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
      return { text: josa(korNative(n), "을", "를") + " 수로 쓰면 □", answer: n, visual: { kind: "blocks", a: n, b: 0, op: "+" } };
    },
    readSino: function (rng) {
      const n = between(rng, 51, 99);
      return { text: josa(korSino(n), "을", "를") + " 수로 쓰면 □", answer: n, visual: { kind: "blocks", a: n, b: 0, op: "+" } };
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
      // 낱개가 남으므로 "가득 찬 상자"로 물어 답이 하나로 읽히게 한다
      return { text: "구슬 " + n + "개를 한 상자에 10개씩 담으면 가득 찬 상자는 □개", answer: t, visual: { kind: "blocks", a: n, b: 0, op: "+" } };
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
    },
    // ---- 2학년 2학기: 곱셈구구 (단은 단계의 tables) ----
    mulFact: function (rng, L) {
      const a = pick(rng, L.tables || [2, 3, 4, 5]), b = between(rng, 2, 9);
      return { text: a + " × " + b + " = □", answer: a * b, distractors: mulWrong(a, b), visual: { kind: "groups", size: a, count: b } };
    },
    mulGroups: function (rng, L) {
      const o = pick(rng, OBJECTS), a = pick(rng, L.tables || [2, 3, 4, 5]), b = between(rng, 2, 9);
      return { text: o[0] + " " + a + o[1] + "씩 " + b + "묶음은 모두 □" + o[1], answer: a * b, distractors: mulWrong(a, b), visual: { kind: "groups", size: a, count: b } };
    },
    mulTimes: function (rng, L) {
      const a = pick(rng, L.tables || [2, 3, 4, 5]), b = between(rng, 2, 9);
      return { text: a + "의 " + b + "배는 □", answer: a * b, distractors: mulWrong(a, b), visual: { kind: "groups", size: a, count: b } };
    },
    mulMissing: function (rng) {
      const a = between(rng, 2, 9), b = between(rng, 2, 9);
      return { text: a + " × □ = " + a * b, answer: b, distractors: positive([b - 1, b + 1, b + 2, b - 2]).filter(function (v) { return v >= 1; }), visual: { kind: "groups", size: a, count: b } };
    },
    // ---- 3학년 1학기: 세 자리 수의 덧셈과 뺄셈 ----
    add3: function (rng) {
      const ab = pickAdd3(rng), a = ab[0], b = ab[1];
      return { text: a + " + " + b + " = □", answer: a + b, distractors: add3Wrong(a, b), visual: { kind: "place", a: a, b: b, op: "+" } };
    },
    sub3: function (rng) {
      const ab = pickSub3(rng), a = ab[0], b = ab[1];
      return { text: a + " − " + b + " = □", answer: a - b, distractors: sub3Wrong(a, b), visual: { kind: "place", a: a, b: b, op: "−" } };
    },
    story3: function (rng) {
      if (rng() < 0.5) {
        const ab = pickAdd3(rng), a = ab[0], b = ab[1], k = between(rng, 0, 2);
        const text = k === 0 ? "줄넘기를 어제 " + a + "번, 오늘 " + b + "번 했어요. 모두 □번"
          : k === 1 ? "사과 " + a + "개와 배 " + b + "개를 땄어요. 모두 □개"
          : "동화책 " + a + "권과 위인전 " + b + "권이 있어요. 모두 □권";
        return { text: text, answer: a + b, distractors: add3Wrong(a, b), visual: { kind: "place", a: a, b: b, op: "+" } };
      }
      const ab = pickSub3(rng), a = ab[0], b = ab[1], k = between(rng, 0, 2);
      const text = k === 0 ? "색종이 " + a + "장 중에서 " + b + "장을 썼어요. 남은 것은 □장"
        : k === 1 ? a + "쪽짜리 책을 " + b + "쪽 읽었어요. 남은 쪽수는 □쪽"
        : "운동장에 " + a + "명이 있었는데 " + b + "명이 집에 갔어요. 남은 사람은 □명";
      return { text: text, answer: a - b, distractors: sub3Wrong(a, b), visual: { kind: "place", a: a, b: b, op: "−" } };
    },
    // ---- 3학년 1학기: 나눗셈 (나머지 없음, 곱셈구구 범위) ----
    divFact: function (rng) {
      const a = between(rng, 2, 9), q = between(rng, 2, 9);
      return { text: a * q + " ÷ " + a + " = □", answer: q, distractors: positive([q - 1, q + 1, q + 2, a]).filter(function (v) { return v >= 1; }), visual: { kind: "groups", size: q, count: a } };
    },
    divShare: function (rng) {
      const o = pick(rng, OBJECTS), a = between(rng, 2, 9), q = between(rng, 2, 9);
      return { text: o[0] + " " + a * q + josa(o[1], "을", "를") + " " + a + "명에게 똑같이 나누면 한 명에게 □" + o[1] + "씩", answer: q,
        distractors: positive([q - 1, q + 1, q + 2, a]).filter(function (v) { return v >= 1; }), visual: { kind: "groups", size: q, count: a } };
    },
    divGroups: function (rng) {
      const o = pick(rng, OBJECTS), a = between(rng, 2, 9), q = between(rng, 2, 9);
      return { text: o[0] + " " + a * q + josa(o[1], "을", "를") + " " + a + o[1] + "씩 묶으면 □묶음", answer: q,
        distractors: positive([q - 1, q + 1, q + 2, a]).filter(function (v) { return v >= 1; }), visual: { kind: "groups", size: a, count: q } };
    },
    // ---- 3학년 1학기: (몇십)×(몇), (두 자리)×(한 자리) ----
    mulTens: function (rng) {
      const t = between(rng, 2, 9), a = t * 10, b = between(rng, 2, 9), s = a * b;
      return { text: a + " × " + b + " = □", answer: s, distractors: positive([s - a, s + a, t * b, s + 10]), visual: { kind: "groups", size: a, count: b } };
    },
    mul21: function (rng) {
      const wantCarry = rng() < 0.7; let a, b, guard = 0;
      do { a = between(rng, 1, 9) * 10 + between(rng, 1, 9); b = between(rng, 2, 9); } while (wantCarry !== ((a % 10) * b >= 10) && guard++ < 60);
      const s = a * b, noCarry = Math.floor(a / 10) * b * 10 + (a % 10) * b % 10;
      return { text: a + " × " + b + " = □", answer: s, distractors: positive([s - a, s + a, noCarry, s + 10, s - 10]), visual: { kind: "groups", size: a, count: b } };
    },
    mul21Story: function (rng) {
      const a = between(rng, 12, 49), b = between(rng, 2, 9), k = between(rng, 0, 2), s = a * b;
      const text = k === 0 ? "한 상자에 귤이 " + a + "개씩 " + b + "상자 있어요. 모두 □개"
        : k === 1 ? "한 줄에 " + a + "명씩 " + b + "줄로 섰어요. 모두 □명"
        : "구슬을 하루에 " + a + "개씩 " + b + "일 동안 모았어요. 모두 □개";
      const noCarry = Math.floor(a / 10) * b * 10 + (a % 10) * b % 10;
      return { text: text, answer: s, distractors: positive([s - a, s + a, noCarry, s + 10]), visual: { kind: "groups", size: a, count: b } };
    },
    // ---- 3학년 2학기: 나머지가 있는 나눗셈, 네 자리 수 자릿값 ----
    divQuot: function (rng) {
      const v = pickDivRem(rng);
      return { text: v.c + " ÷ " + v.d + "의 몫은 □", answer: v.q, distractors: positive([v.q - 1, v.q + 1, v.r, v.q + 2]).filter(function (x) { return x >= 1; }),
        visual: { kind: "groups", size: v.d, count: v.q, left: v.r } };
    },
    divRem: function (rng) {
      const v = pickDivRem(rng);
      return { text: v.c + " ÷ " + v.d + "의 나머지는 □", answer: v.r, distractors: positive([v.r + 1, v.r - 1, v.d - v.r, v.q, v.d]),
        visual: { kind: "groups", size: v.d, count: v.q, left: v.r } };
    },
    placeDigit: function (rng) {
      const ds = distinctDigits(rng, 4), at = between(rng, 0, 3), n = Number(ds.join(""));
      return { text: n + "에서 " + PLACES4[at] + "의 자리 숫자는 □", answer: ds[at], distractors: ds.filter(function (d, i) { return i !== at; }),
        visual: { kind: "digits", count: 4, at: at } };
    },
    // ---- 3학년 2학기~4학년 1학기: 분수 기초(정수로 답하기), 큰 수 ----
    fracOf: function (rng) {
      const d = between(rng, 2, 6), u = between(rng, 2, 9), n = d * u;
      const k = d > 2 && rng() < 0.45 ? between(rng, 2, d - 1) : 1, s = k * u;
      return { text: n + "의 " + fracEun(k, d) + " □", answer: s, distractors: positive([u, u * (k + 1), n - s, n, d * k]).filter(function (v) { return v >= 1; }),
        visual: { kind: "fraction", den: d, num: k, per: u } };
    },
    fracCount: function (rng) {
      const mode = between(rng, 0, 3), d = between(rng, mode === 3 ? 2 : 3, 9), b = between(rng, 2, Math.max(2, d - 1));
      if (mode === 0) return { text: frac(1, d) + "이 " + b + "개이면 □/" + d, answer: b, distractors: positive([b + 1, b - 1, d]).filter(function (v) { return v >= 1; }), visual: { kind: "fraction", den: d, num: b } };
      if (mode === 1) return { text: fracEun(b, d) + " " + frac(1, d) + "이 □개", answer: b, distractors: positive([b + 1, b - 1, d]).filter(function (v) { return v >= 1; }), visual: { kind: "fraction", den: d, num: b } };
      if (mode === 2) return { text: "똑같이 " + d + "조각으로 나눈 것 중의 " + b + "조각은 " + b + "/□", answer: d, distractors: positive([b, d + 1, d - 1]).filter(function (v) { return v >= 1; }), visual: { kind: "fraction", den: d, num: b } };
      return { text: "분모가 " + d + "인 단위분수는 1/□", answer: d, distractors: positive([d + 1, d - 1, d + 2]).filter(function (v) { return v >= 2; }), visual: { kind: "fraction", den: d, num: 1 } };
    },
    bigDigit: function (rng) {
      if (rng() < 0.2) {
        const m = between(rng, 2, 9), big = rng() < 0.5, n = m * (big ? 10000 : 1000);
        return { text: eun(n) + " " + (big ? "10000" : "1000") + "이 □개", answer: m, distractors: positive([m + 1, m - 1, m * 10]), visual: { kind: "digits", count: big ? 5 : 4, at: 0 } };
      }
      const ds = distinctDigits(rng, 5), at = between(rng, 0, 4), n = Number(ds.join(""));
      return { text: n + "에서 " + PLACES5[at] + "의 자리 숫자는 □", answer: ds[at], distractors: ds.filter(function (d, i) { return i !== at; }),
        visual: { kind: "digits", count: 5, at: at } };
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
      case "readKor": case "readSino": return josa(korNative(p.answer), "은", "는") + " " + korSino(p.answer) + ", 숫자로는 " + p.answer + (batchim(p.answer) ? "이에요." : "예요.");
      case "nextNum": return "1만큼 더 큰 수는 바로 다음 수, " + p.answer + (batchim(p.answer) ? "이에요." : "예요.");
      case "prevNum": return "1만큼 더 작은 수는 바로 앞의 수, " + p.answer + (batchim(p.answer) ? "이에요." : "예요.");
      case "tenMore": return "10만큼 뛰면 십 막대가 하나 늘거나 줄어요. 답은 " + p.answer + (batchim(p.answer) ? "이에요." : "예요.");
      case "seq": return "수를 순서대로 세면 " + ga(p.answer) + " 들어가요.";
      case "bigger": return "10개씩 묶음 수부터 비교해요. 더 큰 수는 " + p.answer + (batchim(p.answer) ? "이에요." : "예요.");
      case "smaller": return "10개씩 묶음 수부터 비교해요. 더 작은 수는 " + p.answer + (batchim(p.answer) ? "이에요." : "예요.");
      case "hundred": return "99보다 1 큰 수, 90보다 10 큰 수, 10개씩 묶음 10개 — 모두 100이에요.";
      case "boxes": return "십 막대가 " + p.answer + "개니까 가득 찬 상자는 " + p.answer + "개예요.";
      case "leftover": return "10개씩 담고 남는 낱개가 " + p.answer + "개예요.";
      case "biggest2": return "큰 숫자를 앞(십의 자리)에 놓으면 " + p.answer + (batchim(p.answer) ? "이에요." : "예요.");
      case "smallest2": return "작은 숫자를 앞(십의 자리)에 놓으면 " + p.answer + (batchim(p.answer) ? "이에요." : "예요.");
      case "evenPick": return "둘씩 짝을 지으면 남는 것이 없는 수가 짝수, " + p.answer + (batchim(p.answer) ? "이에요." : "예요.");
      case "oddPick": return "둘씩 짝을 지으면 하나가 남는 수가 홀수, " + p.answer + (batchim(p.answer) ? "이에요." : "예요.");
      case "teenAdd": return "10과 " + eun(v.total - 10) + " " + p.answer + (batchim(p.answer) ? "이에요." : "예요.");
      case "three": return "차례대로 계산하면 " + p.answer + (batchim(p.answer) ? "이에요." : "예요.");
      case "carry": return v.a + "에 " + eul(10 - v.a) + " 더해 10을 만들고, 남은 " + eul(v.b - (10 - v.a)) + " 더하면 " + p.answer + (batchim(p.answer) ? "이에요." : "예요.");
      case "borrow": return "10에서 " + eul(v.b) + " 빼면 " + (10 - v.b) + ", 남은 " + wa(v.a - 10) + " 더하면 " + p.answer + (batchim(p.answer) ? "이에요." : "예요.");
      // ---- 13단계 이상 ----
      case "mulFact": case "mulTimes": return eul(v.size) + " " + v.count + "번 더하면 " + ie(p.answer);
      case "mulGroups": return v.size + "씩 " + v.count + "묶음이니까 " + v.size + " × " + v.count + " = " + ie(p.answer);
      case "mulMissing": return v.size + "단에서 " + eul(v.size * p.answer) + " 찾아요. " + v.size + " × " + p.answer + " = " + ie(v.size * p.answer);
      case "add3": return "일의 자리부터 더하고, 10이 넘으면 윗자리로 1을 올려요. 답은 " + ie(p.answer);
      case "sub3": return "일의 자리부터 빼고, 모자라면 윗자리에서 10을 빌려 와요. 답은 " + ie(p.answer);
      case "story3": return (v.op === "+" ? "모두를 구할 땐 더해요. " + v.a + " + " + v.b : "남은 것을 구할 땐 빼요. " + v.a + " − " + v.b) + " = " + ie(p.answer);
      case "divFact": return v.count + " × " + p.answer + " = " + nikka(v.count * p.answer) + " " + (v.count * p.answer) + " ÷ " + v.count + " = " + ie(p.answer);
      case "divShare": return v.count + "명에게 " + p.answer + (p.text.match(/□(\S+)씩$/) || ["", "개"])[1] + "씩 주면 " + v.count + " × " + p.answer + " = " + ie(v.count * p.answer);
      case "divGroups": return v.size + "씩 묶으면 " + p.answer + "묶음이 나와요. " + v.size + " × " + p.answer + " = " + ie(v.size * p.answer);
      case "mulTens": return (v.size / 10) + " × " + v.count + " = " + (v.size / 10 * v.count) + "에 0을 붙이면 " + ie(p.answer);
      case "mul21": case "mul21Story": {
        const t = Math.floor(v.size / 10) * 10, o = v.size % 10;
        return t + " × " + v.count + " = " + (t * v.count) + ", " + o + " × " + v.count + " = " + (o * v.count) + ", 둘을 더하면 " + ie(p.answer);
      }
      case "divQuot": case "divRem": {
        const c = v.size * v.count + v.left;
        return v.size + " × " + v.count + " = " + (v.size * v.count) + ", " + c + "에서 " + eul(v.size * v.count) + " 빼면 " + ga(v.left) + " 남아요. 몫은 " + v.count + ", 나머지는 " + ie(v.left);
      }
      case "placeDigit": case "bigDigit": {
        if (/개$/.test(p.text)) return p.text.split(" ")[0] + " " + p.text.split(" ")[1] + " " + p.answer + "개 모인 수예요.";
        return (p.text.match(/(만|천|백|십|일)의 자리/) || ["", ""])[1] + "의 자리는 앞에서 " + ["첫째", "둘째", "셋째", "넷째", "다섯째"][v.at] + " 숫자, " + ie(p.answer);
      }
      case "fracOf": return eul(v.den * v.per) + " 똑같이 " + v.den + "묶음으로 나누면 한 묶음은 " + (v.num === 1 ? ie(p.answer) : v.per + ", " + v.num + "묶음은 " + ie(p.answer));
      case "fracCount": {
        if (/단위분수/.test(p.text)) return "분자가 1인 분수가 단위분수예요. " + fracIe(1, p.answer);
        if (/조각/.test(p.text)) return "분모는 똑같이 나눈 조각 수, " + ie(p.answer);
        return fracEun(v.num, v.den) + " " + frac(1, v.den) + "이 " + v.num + "개예요.";
      }
      default: return "십 막대와 낱개를 따로 세면 " + p.answer + (batchim(p.answer) ? "이에요." : "예요.");
    }
  }

  const api = { LEVELS: LEVELS, MAX_LEVEL: LEVELS[LEVELS.length - 1].id, levelById: levelById, batchim: batchim, hasFinal: hasFinal, korNative: korNative, korSino: korSino, makeProblem: makeProblem, buildSession: buildSession, explain: explain, generators: Object.keys(GEN) };
  if (typeof module !== "undefined" && module.exports) module.exports = api;
  else root.Curriculum = api;
})(typeof window !== "undefined" ? window : globalThis);
