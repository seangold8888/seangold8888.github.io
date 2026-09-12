"use strict";
const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const Cinema = require("../js/combat-cinema.js");

test("cinema selects distinct lightning, blade and frost without hijacking support", () => {
  for (const [emoji, profile] of [["⚡","lightning"],["⚔️","blade"],["❄️","frost"]]) {
    assert.equal(Cinema.profileForPlan({emoji, outcome:"hit"}),profile);
    assert.equal(Cinema.profileForPlan({emoji, outcome:"support"}),"");
    assert.equal(Cinema.profileForPlan({emoji, kind:"aura"}),"");
  }
  assert.equal(Cinema.profileForPlan({material:"ice"}),"frost");
  assert.equal(Cinema.profileForPlan({material:"metal"}),"blade");
  assert.equal(Cinema.profileForPlan({emoji:"🪨", material:"stone"}),"");
});

test("shader resolution bounds fill rate on phone and both iPad orientations", () => {
  for(const [w,h] of [[390,844],[820,1180],[1180,820],[4096,4096]]) {
    const size=Cinema.resolution(w,h,3,1);
    assert.ok(size.width*size.height <= Cinema.CONFIG.maxPixels);
    assert.ok(size.width>0 && size.height>0);
    const low=Cinema.resolution(w,h,3,.65);
    assert.ok(low.width<size.width && low.height<size.height);
  }
});

test("cinema lifecycle keeps reduced motion, context recovery and actual contact guards", () => {
  const source=fs.readFileSync(path.join(__dirname,"../js/combat-cinema.js"),"utf8");
  assert.match(source,/webglcontextlost/);
  assert.match(source,/webglcontextrestored/);
  assert.match(source,/prefers-reduced-motion/);
  assert.match(source,/active\.plan===plan/);
  assert.match(source,/\["hit","blocked"\]\.includes\(plan.outcome\)/);
  assert.match(source,/pagehide/);
  assert.doesNotMatch(source,/readPixels|getError|fetch\(/);
});
