#!/usr/bin/env node
"use strict";
/*
  모험 상자 카드에 붙는 "최근 업데이트" 줄을 만든다.

  날짜는 git이 알려 주므로 손으로 적지 않는다. 폴더를 건드린 마지막 커밋 날짜를
  그대로 쓴다. 설명 한 줄만 사람이 쓴다. 코덱스와 클로드가 하루에도 여러 번
  커밋하기 때문에, 날짜를 손으로 적으면 반나절 만에 거짓말이 된다.

  쓰는 법: node tools/build-updates.js
  배포 전에 한 번 돌리면 site/game/updates.json 이 갱신된다.
*/

const fs = require("fs");
const path = require("path");
const { execFileSync } = require("child_process");

const siteRoot = path.resolve(__dirname, "..");

// 순서는 대시보드 카드 순서와 같다. text 만 손으로 고친다.
const GAMES = [
  { id: "avengers", text: "관절이 이어진 영웅 동작과 합동 필살기" },
  { id: "cards", text: "우리 가족 카드 4장과 개구쟁이 효과음" },
  { id: "odyssey", text: "폴리페모스 어려움 모드와 미끄러지기" },
  { id: "kart3d", text: "블렌더로 만든 3D 카트 소품" },
  { id: "kart", text: "숲속 주문과 새 도전 과제" },
  { id: "sanguo", text: "서유기 여덟 전장과 새 장수 원화" },
  { id: "hogwarts", text: "새 도전 과제와 공부 시계" },
  { id: "kedehun", text: "검 공격 동작을 새로 그렸어요" },
  { id: "bori", text: "헬로키티 리본방 미스터리 퍼즐" },
  { id: "princess", text: "새 공주들의 기본 코디" },
];

function lastCommitDate(dir) {
  try {
    const out = execFileSync(
      "git",
      ["log", "-1", "--format=%ad", "--date=short", "--", dir],
      { cwd: siteRoot, encoding: "utf8" }
    ).trim();
    return out || null;
  } catch (error) {
    return null;
  }
}

const updates = {};
const missing = [];
for (const game of GAMES) {
  if (!fs.existsSync(path.join(siteRoot, game.id))) {
    missing.push(game.id);
    continue;
  }
  const date = lastCommitDate(game.id);
  if (!date) {
    missing.push(game.id);
    continue;
  }
  updates[game.id] = { date, text: game.text };
}

const target = path.join(siteRoot, "game", "updates.json");
fs.writeFileSync(target, JSON.stringify(updates, null, 2) + "\n", "utf8");

console.log("게임 " + Object.keys(updates).length + "개 기록 → " + path.relative(siteRoot, target));
for (const [id, info] of Object.entries(updates)) {
  console.log("  " + id.padEnd(10) + info.date + "  " + info.text);
}
if (missing.length) {
  console.log("\n날짜를 못 찾은 폴더: " + missing.join(", "));
  process.exitCode = 1;
}
