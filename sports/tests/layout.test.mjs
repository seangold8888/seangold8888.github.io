// 화면 짜임·알림 띠·시상대·점수 단위·난이도 꼬리표 검사. node --test sports/tests/*.test.mjs
import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { safeArea, feetFor, maxKidPx, rectsOverlap, insideSafe, faceRect, hudBand, bannerHeight, tapSize } from "../src/layout.js";
import { createBannerQueue, MIN_SHOW } from "../src/banner-queue.js";
import { podiumGroups, rankResults, teamPoints, addPoints, teamScoreText, TEAM_POINT_CAPTION, TEAM_POINT_UNIT } from "../src/scoring.js";
import { KIDS, difficultyBadge } from "../src/kids.js";

const here = p => fileURLToPath(new URL(p, import.meta.url));
const VIEWPORTS = [[375, 667], [390, 844], [667, 375], [844, 390], [768, 1024], [1024, 768], [1366, 1024], [1280, 800]];

test("안전 구역: 점수판 띠 < 알림 띠 < 아이 칸 < 톡 버튼 띠, 여덟 화면 모두", () => {
  for (const [W, H] of VIEWPORTS) {
    const sa = safeArea({ W, H });
    assert.ok(sa.top > 40 && sa.top < 140, `${W}x${H} top ${sa.top}`);
    assert.ok(sa.bannerTop >= sa.top && sa.bannerBottom > sa.bannerTop, `${W}x${H} banner band`);
    assert.ok(sa.bottom > sa.bannerBottom + 150, `${W}x${H} 아이 칸이 너무 좁음 ${sa.bannerBottom}..${sa.bottom}`);
    if (H > W) assert.ok(sa.bottom <= sa.tap.y - 4, `${W}x${H} 세로: 톡 버튼 위까지만`);
    else assert.equal(sa.bottom, H - 8, `${W}x${H} 가로: 톡 버튼은 구석이라 아래 끝까지`);
    assert.ok(!rectsOverlap({ x: 0, y: sa.bannerTop, w: W, h: sa.bannerBottom - sa.bannerTop }, sa.tap), "알림 띠와 톡 버튼이 겹치지 않음");
  }
  // 재어 준 점수판 아래 끝을 그대로 쓴다
  assert.equal(safeArea({ W: 390, H: 844, hudBottom: 120 }).top, 120);
  // 톡 버튼이 없는 종목(농구·훌라 동그라미)은 아래 끝까지
  assert.equal(safeArea({ W: 390, H: 844, tap: false }).bottom, 844 - 8);
  // CSS 와 같은 식(.tap-btn clamp(96px, 16vmin, 136px))
  assert.equal(tapSize(375, 667), 96); assert.equal(tapSize(1024, 768), 768 * 0.16); assert.equal(tapSize(1366, 1024), 136);
  assert.ok(hudBand(844, 390) < hudBand(1024, 768) && bannerHeight(844, 390) < bannerHeight(1024, 768), "폰 가로는 띠를 얇게");
});

test("안전 구역: 첫 화면 시연은 메뉴 카드 옆 빈 칸(가로 = 왼쪽, 세로 = 위)", () => {
  const L = safeArea({ W: 1024, H: 768, demoCard: { x: 560, y: 160, w: 450, h: 440 }, topBar: 60 });
  assert.equal(L.right, 552); assert.equal(L.left, 0); assert.equal(L.bannerBottom, L.top, "시연엔 알림 띠 없음");
  const P = safeArea({ W: 390, H: 844, demoCard: { x: 10, y: 420, w: 370, h: 400 }, topBar: 60 });
  assert.equal(P.bottom, 412); assert.equal(P.right, 390);
});

test("아이 발 자리: 들어가면 발은 아래 띠 위·머리는 알림 띠 아래, 크면 발이 아래 여백으로 조금 내려가 얼굴을 지킨다", () => {
  for (const [W, H] of VIEWPORTS) {
    const sa = safeArea({ W, H });
    const kid = Math.min(maxKidPx(sa), H * 0.45);
    const f = feetFor(sa, kid);
    assert.ok(f.fits, `${W}x${H}`);
    assert.ok(f.feet <= sa.bottom + 0.01 && f.feet - kid >= sa.bannerBottom, `${W}x${H} feet ${f.feet} kid ${kid}`);
    const box = { x: W / 2 - kid * 0.25, y: f.feet - kid, w: kid * 0.5, h: kid };
    assert.ok(insideSafe(box, sa), `${W}x${H} 아이 상자가 안전 구역 밖`);
    assert.ok(!rectsOverlap(faceRect(box), { x: 0, y: sa.bannerTop, w: W, h: sa.bannerBottom - sa.bannerTop }), `${W}x${H} 얼굴이 알림 띠에 걸림`);
  }
  // 폰 가로 + 큰 아이(그림판을 덮는 줌 때문에 못 줄일 때): 발이 화면 끝까지 내려가도 얼굴은 알림 띠 아래
  const sa = safeArea({ W: 844, H: 390 });
  const big = maxKidPx(sa) + 4, f = feetFor(sa, big);
  assert.ok(f.feet <= 390 - 2 && f.feet - big >= sa.bannerBottom - 0.01, JSON.stringify(f));
  // footPad(발 밑 타이밍 고리) 만큼 위로
  const s2 = safeArea({ W: 390, H: 844 });
  assert.equal(feetFor(s2, 200, { footPad: 30 }).feet, s2.bottom - 30);
});

test("알림 띠 차례: 한 번에 하나 · 결과 배너는 바로 바꾸고 보통 배너는 앞 배너가 읽힌 뒤 · 배너 중 안내는 버린다", () => {
  let t = 0; const shown = [];
  const q = createBannerQueue({ now: () => t, show: it => shown.push(it.text), hide: () => {} });
  assert.equal(q.push({ text: "10 콤보!", pri: 1, ms: 1400 }), "shown");
  t = 100; assert.equal(q.push({ text: "골키퍼가 노려요", pri: 0 }), "dropped", "배너가 떠 있으면 안내는 안 띄움");
  t = 200; assert.equal(q.push({ text: "후프 2개!", pri: 1 }), "queued", "앞 배너가 아직 덜 읽힘");
  assert.equal(q.current.text, "10 콤보!");
  t = MIN_SHOW + 10; q.tick(); assert.equal(q.current.text, "후프 2개!", "앞 배너가 읽힌 뒤 다음 배너");
  t += 50; assert.equal(q.push({ text: "골!!", pri: 2 }), "shown", "결과는 바로");
  t += 50; assert.equal(q.push({ text: "막았다!", pri: 2 }), "shown", "결과 다음 결과도 바로(앞 결과를 지움)");
  assert.equal(q.current.text, "막았다!");
  assert.deepEqual(shown, ["10 콤보!", "후프 2개!", "골!!", "막았다!"]);
  t += 5000; q.tick(); assert.equal(q.current, null, "시간이 지나면 사라짐");
  // 줄은 최대 2개(오래된 것부터 버림)
  t += 10; q.push({ text: "A", pri: 1 }); q.push({ text: "B", pri: 1 }); q.push({ text: "C", pri: 1 }); q.push({ text: "D", pri: 1 });
  assert.equal(q.pending, 2);
  q.clear(); assert.equal(q.current, null); assert.equal(q.pending, 0);
});

test("juice: 새 배너는 앞 배너·안내·판정 글자를 지우고, 배너 하나만 DOM 에", () => {
  const src = readFileSync(here("../src/juice.js"), "utf8");
  assert.match(src, /querySelectorAll\("\.fx-banner,\.fx-pop"\)\.forEach\(b => b\.remove\(\)\)/);
  assert.match(src, /if \(o\.hint && bq\.current\) return null/);
  const css = readFileSync(here("../style.css"), "utf8");
  assert.match(css, /\.fx-banner \{[^}]*top: var\(--band-top/, "배너는 안전 구역의 알림 띠 자리에");
});

test("시상대: 동점이면 공동 1등 한 단(1 이 두 개 나오지 않게)", () => {
  const tie = rankResults([
    { id: "jaei", team: "blue", score: 7275, gold: 1000 },
    { id: "taeo", team: "white", score: 7275, gold: 1000 },
  ]);
  const g = podiumGroups(tie);
  assert.equal(g.order.length, 1); assert.equal(g.order[0].shared, true); assert.equal(g.order[0].label, "공동 1등");
  assert.deepEqual(g.order[0].results.map(r => r.id).sort(), ["jaei", "taeo"]);
  const two = podiumGroups(rankResults([{ id: "a", team: "blue", score: 900, gold: 1000 }, { id: "b", team: "white", score: 500, gold: 1000 }]));
  assert.deepEqual(two.order.map(x => x.rank), [2, 1], "2등 · 1등(가운데)");
  assert.ok(two.order.every(x => !x.shared));
  const three = podiumGroups(rankResults([{ id: "a", team: "blue", score: 9, gold: 10 }, { id: "b", team: "white", score: 8, gold: 10 }, { id: "c", team: "white", score: 8, gold: 10 }, { id: "d", team: "blue", score: 1, gold: 10 }]));
  assert.deepEqual(three.order.map(x => x.label), ["공동 2등", "1등", "4등"]);
  // 동점이면 1등 편 보너스도 없다(같은 수)
  assert.deepEqual(teamPoints(tie.map(r => ({ ...r, medal: "gold" }))), { blue: 3, white: 3 });
});

test("청백 점수: 경기장·시상식·폐회식이 같은 수·같은 단위(+ 설명 한 줄)", () => {
  let total = { blue: 0, white: 0 };
  total = addPoints(total, { blue: 4, white: 3 });
  assert.equal(teamScoreText(total, "blue"), "4점"); assert.equal(teamScoreText(total, "white"), "3점");
  assert.equal(TEAM_POINT_UNIT, "점"); assert.match(TEAM_POINT_CAPTION, /금 3 · 은 2 · 동 1/);
  const main = readFileSync(here("../src/main.js"), "utf8");
  // 세 화면 모두 teamScoreText(session.total, …) 로 그린다(따로 숫자를 만들지 않음)
  const uses = main.match(/teamScoreText\(session\.total, t\)/g) || [];
  assert.ok(uses.length >= 3, `경기장·시상식·폐회식 ${uses.length}`);
  assert.ok(!/pts\.textContent = session\.total\[t\]/.test(main), "단위 없는 숫자 금지");
  for (const id of ["lobbyCap", "cerCap", "finalCap"]) assert.match(main, new RegExp(`\\$\\("${id}"\\)\\.textContent = TEAM_POINT_CAPTION`));
});

test("첫 화면 난이도 꼬리표: 태오 ★ 쉬움 · 재이 ★★ 보통(level 에서)", () => {
  const by = Object.fromEntries(KIDS.map(k => [k.id, difficultyBadge(k.level).text]));
  assert.equal(by.taeo, "★ 쉬움"); assert.equal(by.jaei, "★★ 보통");
  assert.equal(difficultyBadge(3).text, "★★★ 어려움"); assert.equal(difficultyBadge(-5).stars, 1);
  const main = readFileSync(here("../src/main.js"), "utf8");
  assert.match(main, /difficultyBadge\(k\.level\)/);
});

test("다시 보기는 가장 멋진 순간만(장외 홈런·불꽃/구석 골·머니볼 클린 슛·2단 뛰기·후프 3개)", () => {
  const src = f => readFileSync(here(`../src/events/${f}.js`), "utf8");
  assert.match(src("baseball"), /clip\.weight >= 200/);
  assert.match(src("baseball"), /if \(s\.hit\.grade === "perfect"\) replay\.mark/);
  assert.match(src("soccer"), /o\.scored && \(o\.fire \|\| o\.corner\)/);
  assert.match(src("basketball"), /ev\.money && ev\.kind === "swish"/);
  assert.match(src("jumprope"), /clip\.weight >= 100/);
  assert.match(src("hula"), /ev\.hoops >= 3/);
});

test("시연엔 타이밍 고리를 그리지 않는다(줄넘기·야구·훌라)", () => {
  const src = f => readFileSync(here(`../src/events/${f}.js`), "utf8");
  assert.match(src("jumprope"), /helper: !ctx\.demo &&/);
  assert.match(src("baseball"), /ring: !ctx\.demo &&/);
  assert.match(src("hula"), /helper: !ctx\.demo &&/);
});

test("문제 보상이 켜져 있으면 점수판 아래 꼬리표 + 📐 수학 보너스!", () => {
  const main = readFileSync(here("../src/main.js"), "utf8");
  assert.match(main, /📐 수학 보너스!/);
  const src = f => readFileSync(here(`../src/events/${f}.js`), "utf8");
  for (const [f, key] of [["jumprope", "rainbow"], ["baseball", "golden"], ["hula", "magic"], ["soccer", "fire"], ["basketball", "magnet"]]) assert.match(src(f), new RegExp(`hud\\.buff\\("${key}"`), f);
});

test("경기장·시상식·폐회식 그림은 체육복 아틀라스(다른 게임 히어로 그림 안 씀)", () => {
  const lobby = readFileSync(here("../src/views/lobby-stage.js"), "utf8");
  assert.match(lobby, /loadAtlas\(id, "cheer"\)/);
  assert.ok(!/loadKidSprites\(id, \["idle", "cheer", "sad"\]\)/.test(lobby));
  const main = readFileSync(here("../src/main.js"), "utf8");
  assert.match(main, /poseCanvas\(r\.id, grp\.rank === 1 \? PZ\.win : PZ\.still/);
  assert.match(main, /CHEER_POSE : CALM_POSE/);
});

test("다시 보기 띠는 새까맣지 않고(반투명 남색) 건너뛰기 안내가 있다 · 첫 그림 전에도 캔버스를 칠해 둔다", () => {
  const css = readFileSync(here("../style.css"), "utf8");
  const lb = css.match(/\.letterbox \{[^}]*\}/)[0];
  assert.ok(!/#000\b/.test(lb), "까만 띠 금지");
  assert.match(css, /\.letterbox::after \{ content: "톡 하면 넘어가요/);
  const stage = readFileSync(here("../src/render/stage.js"), "utf8");
  assert.match(stage, /첫 그림이 나오기 전/);
  for (const f of ["jumprope", "baseball", "hula", "soccer", "basketball"]) {
    const src = readFileSync(here(`../src/events/${f}.js`), "utf8");
    assert.match(src, /juice\.clearText\(\);\s+\/\/ 다시 보기 동안/, `${f}: 다시 보기 전에 배너를 지운다`);
  }
});
