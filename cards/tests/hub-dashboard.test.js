"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const root = path.join(__dirname, "..", "..");
const html = fs.readFileSync(path.join(root, "index.html"), "utf8");
const vm = require("node:vm");

test("메인 바로가기는 티켓을 소비하지 않고 현재 상태에 맞는 영역을 안내한다", () => {
  const start = html.indexOf("  function updateLobbyHud(crowns) {");
  const end = html.indexOf("\n  }", start) + 4;
  const source = html.slice(start, end);
  for (const scenario of [
    { solved: 0, correct: 0, ticket: false, free: false, href: "#study", hint: "10개 더" },
    { solved: 9, correct: 9, ticket: false, free: false, href: "#study", hint: "1개 더" },
    { solved: 10, correct: 0, ticket: true, free: false, href: "#adventureWorlds", hint: "1장 준비" },
    { solved: 100, correct: 0, ticket: false, free: true, href: "#adventureWorlds", hint: "모두 열렸어요" },
  ]) {
    const nodes = {};
    for (const id of ["nextAdventure", "worldAccessHint"]) nodes[id] = {
      textContent: "", setAttribute(name, value) { this[name] = value; }
    };
    const state = { solved: scenario.solved, credit: scenario.ticket ? 1 : 0 };
    const context = {
      state, DAILY: 100, SET: 10, setCorrect: scenario.correct,
      isFree: () => scenario.free, hasTicket: () => scenario.ticket, masteredCount: () => 0,
      document: { getElementById: id => nodes[id] },
      hubDailyStat: {}, hubCrownStat: {}, hubTicketStat: {}, questRingLabel: {},
      studyEl: { style: { setProperty() {} } },
    };
    vm.runInNewContext(source + "; updateLobbyHud(0);", context);
    assert.equal(nodes.nextAdventure.href, scenario.href);
    assert.ok(nodes.worldAccessHint.textContent.includes(scenario.hint));
    assert.equal(state.credit, scenario.ticket ? 1 : 0);
    assert.equal(state.solved, scenario.solved);
  }
});

test("컴팩트 로비는 기존 원화와 상시 개방 진입을 유지한다", () => {
  assert.match(html, /<style id="dashboard-v4">/);
  assert.match(html, /id="nextAdventure" href="#study"/);
  assert.match(html, /feature-shop" href="keycap\//);
  assert.match(html, /@media \(min-width: 761px\) and \(max-width: 980px\)/);
  assert.match(html, /@media \(max-width: 380px\)/);
  assert.match(html, /body\.locked \.card \{ opacity: 1; \}/);
});

function count(pattern) {
  return [...html.matchAll(pattern)].length;
}

test("모험 로비는 필수 상태·학습·부모 리포트 DOM 계약을 한 번씩 유지한다", () => {
  [
    "bookModalTitle",
    "sky", "moon", "subline", "study", "studyEyebrow", "daily", "stars",
    "formula", "items", "question", "choices", "cheer", "bookOpen",
    "bookModal", "bookClose", "skillList", "bookList", "gameList",
    "hubDailyStat", "hubTicketStat", "hubCrownStat", "hubOfflineStat",
    "questRingLabel", "lockNotice", "lockNoticeClose"
  ].forEach((id) => {
    assert.equal(count(new RegExp('id="' + id + '"', "g")), 1, id + " must be unique");
  });
  assert.match(html, /<main class="wrap lobby-shell">/);
  assert.match(html, /<nav class="games" aria-label="게임 목록">/);
  assert.match(html, /role="dialog" aria-modal="true"/);
});

test("검수된 원화가 추천 무대와 월드 타일에 실제 이미지로 연결된다", () => {
  const images = [
    "cards/art/redhood.webp",
    "cards/art/sunwukong.webp",
    "cards/art/arthur.webp",
    "cards/art/cinderella.webp",
    "cards/art/odysseus.webp",
    "assets/study/picnic-scene.jpg",
    "sanguo/art/side-scroller/hulao-arcade-bg-v3.png",
    "avengers/icons/multiverse-icon-512.png",
    "hogwarts/icon.png"
  ];
  images.forEach((relative) => {
    assert.match(html, new RegExp(relative.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")));
    assert.equal(fs.existsSync(path.join(root, ...relative.split("/"))), true, relative);
  });
  assert.equal(count(/class="art-(?:left|right|main)"/g), 3);
});

test("별빛 로비 공유 카드는 로컬 이미지와 절대 URL 메타데이터를 함께 제공한다", () => {
  const preview = "og-adventure-v3.png";
  assert.equal(fs.existsSync(path.join(root, preview)), true);
  assert.match(html, /<meta name="description" content="이야기를 듣고, 문제를 풀고, 카드를 모으며 떠나는 어린이 별빛 모험 로비">/);
  assert.match(html, /<meta property="og:title" content="모험 상자 — 별빛 모험 기지">/);
  assert.match(html, /<meta property="og:image" content="https:\/\/seangold8888\.github\.io\/og-adventure-v3\.png">/);
  assert.match(html, /<meta name="twitter:card" content="summary_large_image">/);
  assert.match(html, /<meta name="twitter:image" content="https:\/\/seangold8888\.github\.io\/og-adventure-v3\.png">/);
  const worker = fs.readFileSync(path.join(root, "sw.js"), "utf8");
  assert.match(worker, /"\.\/og-adventure-v3\.png"/);
});

test("기존 게임 링크·티켓 게임과 상시 개방 구분을 보존한다", () => {
  const ticketRoutes = [
    "avengers/", "cards/", "odyssey/", "kart3d/", "kart/",
    "sanguo/", "hogwarts/", "kedehun/", "bori/", "princess/"
  ];
  ticketRoutes.forEach((route) => {
    assert.match(html, new RegExp('class="card [^"]*" href="' + route.replace("/", "\\/") + '"'));
  });
  assert.match(html, /class="shop story" href="story\//);
  assert.match(html, /class="shop craft" href="keycap\//);
  assert.equal(count(/<a class="card /g), 10);
  assert.doesNotMatch(html, /href="starkart\//);
  assert.equal(fs.existsSync(path.join(root, "starkart", "index.html")), false);
  assert.equal(count(/<a class="shop /g), 2);
  assert.match(html, /class="feature-button secondary feature-shop" href="story\//);
  assert.match(html, /querySelectorAll\('\.card, \.shop, \.feature-shop'\)/);
});

test("퀘스트 HUD는 새로고침 진행 복원·친절한 잠금 안내·오프라인 상태를 제공한다", () => {
  assert.match(html, /var setCorrect = state\.solved % SET/);
  assert.match(html, /function updateLobbyHud\(crowns\)/);
  assert.match(html, /studyEl\.style\.setProperty\('--quest-progress'/);
  assert.match(html, /function showLockNotice\(card\)/);
  assert.match(html, /event\.preventDefault\(\);\s*showLockNotice\(card\)/);
  assert.match(html, /navigator\.serviceWorker\.ready/);
  assert.match(html, /showOfflineState\(navigator\.onLine \? "저장됨" : "오프라인"\)/);
});

test("새 시각 시스템은 iPad·모바일·키보드·모션 감소 계약을 갖는다", () => {
  assert.match(html, /<style id="dashboard-v3">/);
  assert.match(html, /\.hero-grid \{ display: grid;/);
  assert.match(html, /\.games \{ display: grid; grid-template-columns: repeat\(12/);
  assert.match(html, /@media \(max-width: 980px\)/);
  assert.match(html, /@media \(max-width: 640px\)/);
  assert.match(html, /background: var\(--cover\) var\(--cover-pos, center 38%\)/);
  assert.match(html, /background: var\(--cover\) var\(--cover-pos, center 36%\)/);
  assert.doesNotMatch(html, /center var\(--cover-pos/);
  assert.doesNotMatch(html, /maximum-scale=1|user-scalable=no|id="no-zoom-guard"/);
  assert.match(html, /aria-labelledby="bookModalTitle"/);
  assert.match(html, /lobbyMain\.inert = true/);
  assert.match(html, /lobbyMain\.inert = false/);
  assert.match(html, /e\.key !== 'Tab'/);
  assert.match(html, /@media \(prefers-reduced-motion: reduce\)/);
  assert.match(html, /\.parent-entry \{[\s\S]*?min-height: 54px/);
  assert.match(html, /bookCloseBtn\.focus\(\)/);
  assert.match(html, /e\.key === 'Escape'/);
});
