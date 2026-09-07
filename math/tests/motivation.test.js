"use strict";
const test = require("node:test"), assert = require("node:assert/strict");
const fs = require("node:fs"), path = require("node:path");
const S = require("../store.js"), Sc = require("../schedule.js"), F = require("../characters.js");

function rngFrom(seed) { let s = seed; return function () { s = (s * 16807) % 2147483647; return (s - 1) / 2147483646; }; }

test("capsules hold three different friends and favor the ones not met yet", () => {
  const rng = rngFrom(3);
  const picks = F.pickCapsules(["cinnamoroll", "elsa"], rng);
  assert.equal(picks.length, 3); assert.equal(new Set(picks.map(c => c.id)).size, 3);
  let unmet = 0;
  for (let i = 0; i < 300; i++) { const p = F.pickCapsules(F.CHARACTERS.slice(0, 20).map(c => c.id), rng); unmet += p.filter(c => c.id === "thor" || c.id === "captainmarvel").length; }
  assert.ok(unmet > 300 * 3 * (2 / 22) * 1.8, "unmet friends show up more often: " + unmet);
});

test("rarity odds are about 70/25/5 and the weekly chest floor holds", () => {
  const rng = rngFrom(11), counts = [0, 0, 0];
  for (let i = 0; i < 3000; i++) counts[F.rollRarity(rng)]++;
  assert.ok(counts[0] > 1900 && counts[1] > 550 && counts[1] < 950 && counts[2] > 80 && counts[2] < 240, counts.join(","));
  for (let i = 0; i < 200; i++) assert.ok(F.rollRarity(rng, 1) >= 1);
  assert.deepEqual(F.RARITY, ["보통", "반짝", "금빛"]);
});

test("every guide has a kind letter for finishing its level", () => {
  for (let l = 1; l <= 11; l++) { assert.ok(F.storyFor(l).length > 20, "story " + l); assert.doesNotMatch(F.storyFor(l), /틀|바보|느려/); }
});

test("streak skips rest days, forgives one weekday miss per week, breaks on two", () => {
  const stamps = { "2026-09-01": 1, "2026-09-02": 1, "2026-09-03": 1, "2026-09-05": 1, "2026-09-07": 1 };
  const sk = S.streakInfo(stamps, "2026-09-07", 6, Sc.isStudyDay);
  assert.equal(sk.days, 5); assert.equal(sk.doneToday, true);
  const notYet = S.streakInfo({ "2026-09-05": 1, "2026-09-04": 1 }, "2026-09-07", 6, Sc.isStudyDay);
  assert.equal(notYet.days, 2, "Sunday and today-not-yet do not break it"); assert.equal(notYet.doneToday, false);
  const broken = S.streakInfo({ "2026-09-01": 1, "2026-09-05": 1 }, "2026-09-05", 6, Sc.isStudyDay);
  assert.equal(broken.days, 1);
});

test("weekly chest opens after the planned study days of the week", () => {
  const full = { "2026-09-07": 1, "2026-09-08": 1, "2026-09-09": 1, "2026-09-10": 1, "2026-09-11": 1, "2026-09-12": 1 };
  const wk = S.weekInfo(full, "2026-09-13", 6);
  assert.equal(wk.key, "2026-09-07"); assert.equal(wk.ready, true); assert.equal(wk.need, 6);
  assert.equal(S.weekInfo({}, "2026-09-09", 5).need, 5);
  assert.equal(S.weekInfo(full, "2026-09-09", 7).need, 6, "seven-day plans still need six");
});

test("album, hearts, chests and buddy survive clean(); pages carry the motivation UI", () => {
  const st = S.clean({ album: [{ id: "elsa", date: "2026-09-07", r: 2, key: "day:2026-09-07" }, { bad: true }], hearts: { "2026-09-07": true }, chests: { "2026-09-07": true }, buddy: { id: "kitty", date: "2026-09-07" } });
  assert.equal(st.album.length, 1); assert.equal(st.buddy.id, "kitty"); assert.ok(st.hearts["2026-09-07"]); assert.ok(st.chests["2026-09-07"]);
  const html = fs.readFileSync(path.join(__dirname, "../index.html"), "utf8");
  for (const id of ["capsules", "album", "buddies", "streakNum", "chestBtn", "heartBtn", "story", "showBtn"]) assert.match(html, new RegExp('id="' + id + '"'));
  const parent = fs.readFileSync(path.join(__dirname, "../parent.html"), "utf8");
  assert.match(parent, /id="heartToday"/);
  const app = fs.readFileSync(path.join(__dirname, "../app.js"), "utf8");
  assert.match(app, /openCapsules\("week:" \+ wk\.key, 1\)/, "weekly chest guarantees a shiny sticker");
  assert.match(app, /if \(firstToday\) openCapsules/, "one capsule per day");
  assert.doesNotMatch(app, /innerHTML\s*=\s*(?=\S)(?!V\.render|showVisualFirst|F\.badge|'<div class="r'|'<span class="lid">)/, "innerHTML only for our own markup");
});
