"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const root = path.join(__dirname, "..", "..");
const html = fs.readFileSync(path.join(root, "game", "index.html"), "utf8");
const vm = require("node:vm");

test("배너 없이 게임 목록 안내를 갱신하며 티켓과 공부 기록을 소비하지 않는다", () => {
  const start = html.indexOf("  function updateLobbyHud(crowns) {");
  const end = html.indexOf("\n  }", start) + 4;
  const source = html.slice(start, end);
  for (const scenario of [
    { solved: 0, correct: 0, ticket: false, free: false, href: "#study", hint: "15개 더" },
    { solved: 14, correct: 14, ticket: false, free: false, href: "#study", hint: "1개 더" },
    { solved: 15, correct: 0, ticket: true, free: false, href: "#adventureWorlds", hint: "1장 준비" },
    { solved: 15, correct: 0, ticket: false, free: false, active: true, href: "#adventureWorlds", hint: "남은 게임 시간" },
    { solved: 100, correct: 0, ticket: false, free: true, href: "#adventureWorlds", hint: "모두 열렸어요" },
  ]) {
    const nodes = {};
    for (const id of ["worldAccessHint"]) nodes[id] = {
      textContent: "", setAttribute(name, value) { this[name] = value; }
    };
    const state = { solved: scenario.solved, credit: scenario.ticket ? 1 : 0 };
    const context = {
      state, DAILY: 100, SET: 15, setCorrect: scenario.correct,
      isFree: () => scenario.free, hasTicket: () => scenario.ticket, playTimeLeft: () => !!scenario.active, masteredCount: () => 0,
      window: { HubPlayTimer: { format: () => '2:00', remainingMs: () => 120000 } },
      document: { getElementById: id => nodes[id] },
      hubDailyStat: {}, hubCrownStat: {}, hubTicketStat: {}, questRingLabel: {},
      studyEl: { style: { setProperty() {} } },
    };
    vm.runInNewContext(source + "; updateLobbyHud(0);", context);
    assert.ok(nodes.worldAccessHint.textContent.includes(scenario.hint));
    assert.equal(state.credit, scenario.ticket ? 1 : 0);
    assert.equal(state.solved, scenario.solved);
  }
});

test("컴팩트 로비는 기존 원화와 상시 개방 진입을 유지한다", () => {
  assert.match(html, /<style id="dashboard-v4">/);
  assert.doesNotMatch(html, /id="nextAdventure"|<article class="feature-stage"/);
  assert.match(html, /\.hero-grid \{ grid-template-columns: minmax\(0, 1fr\);/);
  assert.doesNotMatch(html, /href="keycap\//);
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

test("검수된 게임 대표 원화가 월드 타일에 실제 이미지로 연결된다", () => {
  const images = [
    "assets/covers/cover-jaei-taeo-card-battle-v1.webp",
    "cards/art/odysseus.webp",
    "sanguo/art/side-scroller/hulao-arcade-bg-v3.png",
    "multiverse/art/cover.webp",
    "assets/covers/cover-hogwarts-game-v1.webp",
    "assets/covers/cover-kedehun-team-v1.webp",
    "assets/covers/cover-ribbon-room-v1.webp",
    "assets/covers/cover-sanrio-kart-team-v1.webp"
  ];
  images.forEach((relative) => {
    assert.match(html, new RegExp(relative.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")));
    assert.equal(fs.existsSync(path.join(root, ...relative.split("/"))), true, relative);
  });
  assert.equal(count(/class="art-(?:left|right|main)"/g), 0);
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
    "multiverse/", "cards/", "odyssey/", "kart3d/",
    "sanguo/", "hogwarts/", "kedehun/", "bori/", "princess/", "slime/"
  ];
  ticketRoutes.forEach((route) => {
    const query=route==='princess/'?'\\?heads=natural&amp;v=picnic-1':'';
    assert.match(html, new RegExp('class="card [^"]*" href="' + route.replace("/", "\\/") + query + '"'));
  });
  assert.match(html, /class="shop story" href="story\//);
  assert.doesNotMatch(html, /키캡|href="keycap\//);
  assert.equal(count(/<a class="card /g), ticketRoutes.length);
  assert.doesNotMatch(html, /href="starkart\//);
  assert.equal(fs.existsSync(path.join(root, "starkart", "index.html")), false);
  assert.equal(count(/<a class="shop /g), 2);
  assert.match(html, /class="shop story" href="story\/english\/"/);
  assert.match(html, /querySelectorAll\('\.card, \.shop'\)/);
});

test('카드 배틀 이름은 재이태오로 표시하고 기존 게임 경로를 유지한다',()=>{
  const card=html.match(/<a class="card battle"[^>]*>[\s\S]*?<\/a>/)[0];
  assert.match(card,/href="cards\/"/);
  assert.match(card,/<span class="name">재이태오 카드 배틀<\/span>/);
  assert.doesNotMatch(card,/J&amp;T 어드벤처/);
  assert.doesNotMatch(card,/cinderella.webp|style="--cover:/);
  assert.match(html,/\.card\.battle\s*\{[^}]*cover-jaei-taeo-card-battle-v1\.webp/);
});

test('카트는 3D 하나로 정리하고 간단판 원본과 기록은 호환용으로 보존한다',()=>{
  assert.equal(count(/class="card kart3d"/g),1);
  assert.doesNotMatch(html, /class="card kart"|산리오 카트 간단판/);
  assert.match(html, /<span class="name">산리오 카트<\/span>/);
  assert(fs.existsSync(path.join(root,'kart/index.html')));
  const kart3d=fs.readFileSync(path.join(root,'kart3d/index.html'),'utf8');
  assert.match(kart3d,/href="\.\.\/kart\/"/);
  assert.doesNotMatch(html,/removeItem\(['"]sanrio-kart/);
});

test('호그와트·케데헌·리본방·산리오카트 표지는 실제 게임 주인공이며 오프라인 셸에도 보존한다',()=>{
  const worker=fs.readFileSync(path.join(root,'sw.js'),'utf8');
  for(const file of ['cover-hogwarts-game-v1.webp','cover-kedehun-team-v1.webp','cover-ribbon-room-v1.webp','cover-sanrio-kart-team-v1.webp','cover-jaei-taeo-card-battle-v1.webp']){
    assert(html.includes('assets/covers/'+file));
    assert(worker.includes('./assets/covers/'+file));
    assert(fs.statSync(path.join(root,'assets/covers',file)).size>3000);
  }
  assert.doesNotMatch(html,/href="hogwarts\/" style="--cover:url\('hogwarts\/icon.png'\)/);
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

test('오늘의 공부가 파티와 게임 소개보다 먼저 나오고 15문제 목표를 안내한다', () => {
  assert.ok(html.indexOf('id="study"') < html.indexOf('id="mathPlaygroundLaunch"'));
  assert.ok(html.indexOf('id="mathPlaygroundLaunch"') < html.indexOf('id="adventureWorlds"'));
  assert.match(html, /id="mathPlaygroundLaunch" href="math\/\?from=hub&amp;quick=1"/);
  assert.match(html, /티켓 없이 언제든 · 오늘의 공부에 합산/);
  assert.ok(html.indexOf('id="study"') < html.indexOf('id="adventureWorlds"'));
  assert.ok(html.indexOf('id="study"') < html.indexOf('id="partyAdventure"'));
  assert.match(html, /id="questRingLabel">0\/15/);
  assert.match(html, /var SET = 15, DAILY = 100;/);
  assert.match(html, /#study \.progress \{ flex-wrap: wrap;/);
  assert.doesNotMatch(html, /10문제/);
});

test('핵심만 보이는 메인에서도 기록·설정·개인정보 안내를 삭제하지 않는다', () => {
  assert.match(html, /<style id="dashboard-clarity">/);
  assert.match(html, /<details class="lobby-settings" id="lobbySettings">/);
  assert.match(html, /설정과 학습 기록 열기/);
  for (const id of ['hubDailyStat', 'hubCrownStat', 'hubOfflineStat', 'quietMode', 'hubMusic', 'bookOpen']) {
    const settings = html.slice(html.indexOf('<details class="lobby-settings"'), html.indexOf('</details>', html.indexOf('<details class="lobby-settings"')));
    assert(settings.includes('id="' + id + '"'));
  }
  assert.match(html, /privacy = choicesEl\.querySelector && choicesEl\.querySelector\('\.reading-privacy'\)/);
  assert.match(html, /help\.appendChild\(privacy\)/);
  assert.doesNotMatch(html, /<h2>배우고,<br><em>떠나자\.<\/em><\/h2>/);
  assert.match(html, /\.card \.badge, \.card \.tags, \.card \.desc, \.card \.update \{ display: none;/);
});

test('부모 리포트는 메인 inert 해제 후 원래 버튼에 포커스를 돌려준다', () => {
  const start = html.indexOf('  function closeBookModal() {');
  const source = html.slice(start, html.indexOf('\n  }', start) + 4);
  const modal = { hidden: false }, main = { inert: true };
  let focus = 0;
  vm.runInNewContext(source + '; closeBookModal();', {
    bookModal: modal, lobbyMain: main, isFree: () => true,
    bookLastFocus: { focus() { assert.equal(main.inert, false); assert.equal(modal.hidden, true); focus++; } },
  });
  assert.equal(focus, 1);
});

test('게임 시간이 남으면 잠금 외형도 접근 상태와 일치하며 티켓은 쓰지 않는다', () => {
  const start = html.indexOf('  function syncGameCardAccess() {');
  const source = html.slice(start, html.indexOf('\n  }', start) + 4);
  for (const active of [false, true]) {
    let visualLocked = null;
    const card = { setAttribute(k,v) { this[k] = v; }, removeAttribute(k) { delete this[k]; } };
    vm.runInNewContext(source + '; syncGameCardAccess();', {
      isFree: () => false, hasTicket: () => false, playTimeLeft: () => active,
      document: { body: { classList: { toggle(k,v) { assert.equal(k,'locked'); visualLocked = v; } } }, querySelectorAll: () => [card] },
    });
    assert.equal(visualLocked, !active);
    assert.equal(card['aria-disabled'], active ? undefined : 'true');
  }
});
