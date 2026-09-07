"use strict";
const test = require("node:test"), assert = require("node:assert/strict");
const fs = require("node:fs"), path = require("node:path");
const C = require("../curriculum.js"), V = require("../visual.js"), S = require("../store.js");

function rngFrom(seed) { let s = seed; return function () { s = (s * 16807) % 2147483647; return (s - 1) / 2147483646; }; }
function evalText(text, answer) {
  // 식 형태만 검산 (한글 문장은 visual 로 검산)
  const t = text.replace(/−/g, "-").replace("□", String(answer));
  if (!/^[\d\s+\-=]+$/.test(t)) return true;
  const [l, r] = t.split("=");
  return Function("return (" + l + ") === (" + r + ")")();
}

test("every level and type generates only integer answers within the level range, with a drawable visual", () => {
  const rng = rngFrom(11);
  for (const L of C.LEVELS) for (const type of L.types) for (let i = 0; i < 300; i++) {
    const p = C.makeProblem(L.id, rng, type);
    assert.ok(Number.isInteger(p.answer) && p.answer >= 0 && p.answer <= L.max, L.id + " " + type + " " + p.text + " = " + p.answer);
    assert.ok(evalText(p.text, p.answer), p.text);
    assert.match(V.render(p, false), /^<svg/);
    assert.match(V.render(p, true), /^<svg/);
    assert.doesNotMatch(V.render(p, false), /<text/, "no numbers inside the picture");
    assert.equal(p.level, L.id);
    if (type === "split" || type === "join" || type === "split10") {
      assert.equal(p.visual.total, type === "join" ? p.answer : (type === "split10" ? 10 : p.visual.a + p.answer));
    }
  }
});

test("carry problems always need regrouping and borrow problems always cross ten", () => {
  const rng = rngFrom(5);
  for (let i = 0; i < 300; i++) {
    const c = C.makeProblem(8, rng); assert.ok(c.visual.a + c.visual.b >= 11 && c.visual.a <= 9 && c.visual.b <= 9, c.text);
    const b = C.makeProblem(9, rng); assert.ok(b.visual.a >= 11 && b.visual.a <= 18 && b.answer < 10 && b.visual.b > b.visual.a - 10, b.text);
    const t = C.makeProblem(6, rng); assert.ok(t.answer >= 0 && Math.floor(t.answer / 10) === Math.floor(t.visual.a / 10), "no carry/borrow: " + t.text);
  }
});

test("Korean particles follow the number reading (은/는, 와/과, 을/를)", () => {
  assert.equal(C.batchim(1), true); assert.equal(C.batchim(2), false); assert.equal(C.batchim(10), true); assert.equal(C.batchim(4), false);
  const rng = rngFrom(9);
  for (let i = 0; i < 200; i++) {
    const p = C.makeProblem(2, rng);
    assert.doesNotMatch(p.text, /(?:[2459]|10)은 |(?:[13678]|10)는 |(?:[2459])과 |(?:[13678]|10)와 |(?:[2459])을 |(?:[13678]|10)를 /, p.text);
    assert.doesNotMatch(C.explain(p), /[2459]이에요|[13678]예요/, C.explain(p));
  }
});

test("a session has no duplicate problems, starts easy, caps reviews at 30% and pulls a warmup from the level below", () => {
  const rng = rngFrom(21);
  const review = [];
  for (let i = 0; i < 8; i++) { const p = C.makeProblem(3, rng); review.push({ key: p.key, problem: p }); }
  const s = C.buildSession({ level: 4, count: 12, rng, review });
  assert.equal(s.length, 12);
  assert.equal(new Set(s.map(p => p.key)).size, 12);
  assert.equal(s.filter(p => p.review).length, 3);
  assert.ok(s.filter(p => !p.review && p.level === 3).length >= 1, "warmup from level 3");
  assert.equal(s[0].review, undefined);
  const first = C.buildSession({ level: 1, count: 8, rng, review: [] });
  assert.ok(first.every(p => p.level === 1));
});

test("wrong answers schedule spaced reviews 1→3→7→14 days and graduate; a miss resets", () => {
  const st = S.defaults();
  const p = C.makeProblem(4, rngFrom(2));
  S.recordAnswer(st, p, false, "2026-09-07");
  assert.equal(st.wrong[0].due, "2026-09-08"); assert.equal(st.wrong[0].miss, 1);
  assert.equal(S.dueReviews(st, "2026-09-07").length, 0); assert.equal(S.dueReviews(st, "2026-09-08").length, 1);
  S.recordAnswer(st, p, true, "2026-09-08"); assert.equal(st.wrong[0].due, "2026-09-11");
  S.recordAnswer(st, p, true, "2026-09-11"); assert.equal(st.wrong[0].due, "2026-09-18");
  S.recordAnswer(st, p, false, "2026-09-18"); assert.equal(st.wrong[0].due, "2026-09-19"); assert.equal(st.wrong[0].stage, 0); assert.equal(st.wrong[0].miss, 2);
  for (const d of ["2026-09-19", "2026-09-22", "2026-09-29"]) S.recordAnswer(st, p, true, d);
  assert.equal(st.wrong.length, 1);
  S.recordAnswer(st, p, true, "2026-10-13"); assert.equal(st.wrong.length, 0, "graduated");
});

test("promotion needs two sessions at 90%+, demotion below 60%, and stability reads time variability", () => {
  const st = S.defaults();
  const good = [...Array(12)].map((_, i) => ({ key: "k" + i, level: 1, review: false, firstTry: i < 11, ms: 3000 }));
  S.finishSession(st, good, "2026-09-07"); assert.equal(st.level, 1); assert.equal(st.streak, 1);
  const e = S.finishSession(st, good, "2026-09-08"); assert.equal(st.level, 2); assert.equal(st.streak, 0); assert.equal(e.change, 1);
  const bad = [...Array(12)].map((_, i) => ({ key: "k" + i, level: 2, review: false, firstTry: i < 6, ms: 3000 }));
  const d = S.finishSession(st, bad, "2026-09-09"); assert.equal(st.level, 1); assert.equal(d.change, -1);
  assert.ok(S.stability([3000, 3100, 2900, 3000]) < 0.35);
  assert.ok(S.stability([1000, 6000, 2000, 9000]) > 0.35);
  assert.equal(S.stability([1000, 2000]), null);
  assert.equal(Object.keys(st.stamps).length, 3);
  const reviewOnly = [...Array(4)].map((_, i) => ({ key: "r" + i, level: 1, review: true, firstTry: true, ms: 1000 }));
  const lvl = st.level; S.finishSession(st, reviewOnly, "2026-09-10"); assert.equal(st.level, lvl, "reviews alone never move the level");
});

test("state survives a round trip and rejects garbage", () => {
  const mem = new Map(), storage = { getItem: k => mem.get(k) ?? null, setItem: (k, v) => mem.set(k, v) };
  const st = S.load(storage); st.level = 99; st.name = "재이"; st.perSession = 7; S.save(storage, st);
  const back = S.load(storage);
  assert.equal(back.level, 11); assert.equal(back.perSession, 12); assert.equal(back.name, "재이");
  const stored = JSON.parse(mem.get(S.KEY));
  assert.deepEqual(Object.keys(stored).sort(), ["album", "buddy", "chests", "createdAt", "grade", "hearts", "history", "level", "name", "perSession", "placed", "placement", "planDays", "planEnd", "planFrom", "planStart", "school", "sound", "stamps", "streak", "visualPolicy", "wrong"]);
  mem.set(S.KEY, "{not json"); assert.equal(S.load(storage).level, 1);
});

test("pages ship without games, stay text-only for numbers, and load the four scripts in order", () => {
  const html = fs.readFileSync(path.join(__dirname, "../index.html"), "utf8");
  const parent = fs.readFileSync(path.join(__dirname, "../parent.html"), "utf8");
  for (const h of [html, parent]) {
    assert.doesNotMatch(h, /game-hub|모험 상자|starkart|cards\//);
    assert.ok(h.indexOf("curriculum.js") < h.indexOf("visual.js") && h.indexOf("visual.js") < h.indexOf("store.js"));
  }
  assert.match(html, /id="keypad"/); assert.doesNotMatch(html, /<input[^>]*type="number"/); assert.ok(html.indexOf("placement.js") > html.indexOf("characters.js"));
  assert.match(parent, /window\.print|printBtn/);
  const css = fs.readFileSync(path.join(__dirname, "../style.css"), "utf8");
  assert.match(css, /@media print/);
  const app = fs.readFileSync(path.join(__dirname, "../app.js"), "utf8");
  assert.doesNotMatch(app, /innerHTML\s*=\s*(?=\S)(?!V\.render|showVisualFirst|F\.badge|\x27<div class="r\x27|\x27<span class="lid">)/, "only our own SVG goes through innerHTML");
  assert.match(app, /V\.render\(current, true\)/, "wrong answer reveals the picture");
});

const Sc = require("../schedule.js"), F = require("../characters.js");
test("the plan covers every study day from start to end, keeps level order, and weights the second-semester core", () => {
  const plan = Sc.buildPlan({ start: "2026-09-07", end: "2027-01-29", daysPerWeek: 6 });
  assert.equal(plan[0].date, "2026-09-07"); assert.equal(plan[plan.length - 1].date, "2027-01-29");
  assert.equal(new Set(plan.map(p => p.date)).size, plan.length);
  assert.ok(plan.every(p => new Date(p.date + "T00:00:00").getDay() !== 0), "no Sundays with 6 days/week");
  for (let i = 1; i < plan.length; i++) assert.ok(plan[i].level >= plan[i - 1].level && plan[i].i === plan[i - 1].i + 1);
  const ms = Sc.milestones(plan);
  assert.deepEqual(ms.map(m => m.level), [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11]);
  const days = Object.fromEntries(ms.map(m => [m.level, m.days]));
  assert.ok(days[8] > days[1] && days[9] > days[5] && days[6] >= days[10]);
  assert.equal(ms.reduce((s, m) => s + m.days, 0), plan.length);
  const five = Sc.buildPlan({ start: "2026-09-07", end: "2026-10-02", daysPerWeek: 5, fromLevel: 4 });
  assert.equal(five.length, 20); assert.equal(five[0].level, 4);
  assert.ok(five.every(p => [0, 6].indexOf(new Date(p.date + "T00:00:00").getDay()) < 0));
});

test("status reports planned level, missed days and whether the child is behind or ahead", () => {
  const plan = Sc.buildPlan({ start: "2026-09-07", end: "2027-01-29", daysPerWeek: 6 });
  const s1 = Sc.status(plan, ["2026-09-07", "2026-09-08"], 1, "2026-09-10");
  assert.equal(s1.plannedIndex, 4); assert.equal(s1.expected, 4); assert.equal(s1.done, 2); assert.equal(s1.dayGap, -2); assert.equal(s1.label, "계획대로");
  const s2 = Sc.status(plan, [], 3, "2026-11-20"); assert.ok(s2.levelGap < 0); assert.match(s2.label, /뒤/);
  const s3 = Sc.status(plan, [], 9, "2026-11-20"); assert.ok(s3.levelGap > 0); assert.match(s3.label, /앞/);
  const s4 = Sc.status(plan, [], 11, "2027-03-01"); assert.equal(s4.finished, true);
  const sunday = Sc.status(plan, [], 1, "2026-09-13"); assert.equal(sunday.plannedIndex, 6, "a rest day shows the last study day");
});

test("plan settings persist and promotion uses the behind/cap options", () => {
  const st = S.defaults();
  assert.equal(st.planEnd, "2027-01-29"); assert.equal(st.planDays, 6);
  const bad = S.clean({ planStart: "2026-09-07", planEnd: "2026-01-01", planDays: 4, planFrom: 40 });
  assert.ok(bad.planEnd > bad.planStart); assert.equal(bad.planDays, 6); assert.equal(bad.planFrom, 11);
  const good = [...Array(12)].map((_, i) => ({ key: "k" + i, level: 1, review: false, firstTry: true, ms: 2000 }));
  S.finishSession(st, good, "2026-09-07", { behind: true, cap: 3 }); assert.equal(st.level, 2, "behind: one 90% session promotes");
  S.finishSession(st, good, "2026-09-08", { behind: true, cap: 2 }); assert.equal(st.level, 2, "never past the cap");
  S.finishSession(st, good, "2026-09-09", { behind: false, cap: 11 }); S.finishSession(st, good, "2026-09-10", { behind: false, cap: 11 });
  assert.equal(st.level, 3, "on time: two sessions");
});

test("friends: 22 characters across four families, every icon drawn by us, a guide per level, stable daily stickers", () => {
  assert.equal(F.CHARACTERS.length, 22);
  assert.deepEqual([...new Set(F.CHARACTERS.map(c => c.from))].sort(), ["디즈니 프린세스", "마블", "산리오", "티니핑"]);
  for (const c of F.CHARACTERS) {
    assert.ok(F.icons.includes(c.icon), c.id);
    const svg = F.badge(c, 40);
    assert.match(svg, /^<span class="b3d"[^>]*assets\/3d\/badges\/[a-z]+\.png[^>]*><svg/); assert.doesNotMatch(svg, /<image|href=|<text/, "no external art, no text");
    assert.ok(fs.existsSync(path.join(__dirname, "../assets/3d/badges/" + c.id + ".png")), "3d badge for " + c.id);
    assert.ok(c.say.length >= 2 && c.say.every(s => !/틀렸|바보|느려/.test(s)));
  }
  for (let l = 1; l <= 11; l++) assert.ok(F.guideFor(l).name);
  assert.equal(F.stickerFor("2026-09-07").id, F.stickerFor("2026-09-07").id);
  const month = new Set(); for (let d = 1; d <= 30; d++) month.add(F.stickerFor("2026-09-" + String(d).padStart(2, "0")).id);
  assert.ok(month.size >= 12, "a month of stickers is varied");
  assert.doesNotMatch(F.praise(F.byId("hulk"), () => 0), /틀/);
});

test("child and parent pages wire the schedule and friends scripts", () => {
  const html = fs.readFileSync(path.join(__dirname, "../index.html"), "utf8");
  const parent = fs.readFileSync(path.join(__dirname, "../parent.html"), "utf8");
  for (const h of [html, parent]) { assert.ok(h.indexOf("store.js") < h.indexOf("schedule.js") && h.indexOf("schedule.js") < h.indexOf("characters.js")); }
  assert.ok(html.indexOf("characters.js") < html.indexOf("placement.js"));
  assert.match(html, /id="track"/); assert.match(html, /id="album"/); assert.match(html, /id="planTag"/);
  assert.match(parent, /id="milestoneRows"/); assert.match(parent, /id="planEnd"/);
  const app = fs.readFileSync(path.join(__dirname, "../app.js"), "utf8");
  assert.match(app, /behind: !!\(before && before\.levelGap < 0\)/);
  assert.doesNotMatch(app, /innerHTML\s*=\s*(?=\S)(?!V\.render|showVisualFirst|F\.badge|\x27<div class="r\x27|\x27<span class="lid">)/, "innerHTML only for our own SVG");
});
