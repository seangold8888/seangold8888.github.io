"use strict";
const test = require("node:test"), a = require("node:assert/strict");
const fs = require("node:fs"), path = require("node:path");
const credits = require("../../assets/study/math-credits.js");
const now = new Date(2026, 8, 30, 12).getTime(), day = credits.day(now);
function store(initial = {}) {
  const values = new Map(Object.entries(initial));
  return { getItem: k => values.get(k) ?? null, setItem: (k, v) => values.set(k, String(v)), removeItem: k => values.delete(k), values };
}
function answers(s, n, prefix = "run", time = now) {
  for (let i = 0; i < n; i++) a.equal(credits.record(s, prefix + ":" + i, time).ok, true);
}
test("three solved playground problems join today's study once; preview never writes the hub", () => {
  const s = store({ hub2_date: day, hub2_solved: "4", hub2_credit: "0" });
  answers(s, 3);
  a.equal(credits.preview(s, now).solved, 7);
  a.equal(s.getItem("hub2_solved"), "4");
  credits.flush(s, now);
  a.equal(s.getItem("hub2_solved"), "7");
  for (let i = 0; i < 5; i++) { answers(s, 3); credits.flush(s, now); }
  a.equal(s.getItem("hub2_solved"), "7");
  answers(s, 3, "next"); credits.flush(s, now);
  a.equal(s.getItem("hub2_solved"), "10");
});
test("14 + 3 grants one ticket, preserves leftover progress and never resurrects a spent ticket", () => {
  const s = store({hub2_date:day,hub2_solved:"14",hub2_credit:"0"});
  answers(s, 3); credits.flush(s, now);
  a.equal(s.getItem("hub2_solved"), "17"); a.equal(s.getItem("hub2_credit"), "1");
  s.setItem("hub2_credit", "0"); credits.flush(s, now); answers(s, 3); credits.flush(s, now);
  a.equal(s.getItem("hub2_credit"), "0"); a.equal(s.getItem("hub2_solved"), "17");
});
test("existing tickets, parent override, mastery and wrong answers remain untouched", () => {
  const s=store({hub2_date:day,hub2_solved:"16",hub2_credit:"1",hub2_parent_mode:"1",math10_state:'{"level":6}',hub2_wrongbook:'[{"type":"reading"}]'});
  answers(s, 3); credits.flush(s, now);
  a.equal(s.getItem("hub2_credit"), "1"); a.equal(s.getItem("hub2_parent_mode"), "1");
  a.equal(s.getItem("math10_state"), '{"level":6}'); a.equal(s.getItem("hub2_wrongbook"), '[{"type":"reading"}]');
});
test("daily completion stops at 100; extra receipts cannot manufacture unlimited tickets", () => {
  const s=store({hub2_date:day,hub2_solved:"99",hub2_credit:"0"});
  answers(s, 150); credits.flush(s, now);
  a.equal(s.getItem("hub2_solved"), "100"); a.equal(s.getItem("hub2_credit"), "0");
  a.equal(JSON.parse(s.getItem(credits.KEY)).ids.length, 100);
});
test("day rollover imports only today's receipts and doesn't carry yesterday's parent override", () => {
  const s=store({hub2_date:day,hub2_solved:"14",hub2_credit:"1",hub2_parent_mode:"1"});
  answers(s, 3); credits.flush(s, now);
  const tomorrow = now + 86400000;
  a.equal(credits.preview(s, tomorrow).solved, 0);
  answers(s, 3, "tomorrow", tomorrow); credits.flush(s, tomorrow);
  a.equal(s.getItem("hub2_solved"), "3"); a.equal(s.getItem("hub2_credit"), "0"); a.equal(s.getItem("hub2_parent_mode"), "0");
});
test("a interrupted import recovers exact totals instead of adding the same receipts twice", () => {
  for (const failedKey of ["hub2_solved", "hub2_credit", "hub2_date", credits.IMPORTED]) {
    const s=store({hub2_date:day,hub2_solved:"14",hub2_credit:"0"}); answers(s, 3);
    const write=s.setItem; let fail=true;
    s.setItem=(key,value)=>{ if(fail && key===failedKey) {fail=false;throw Error("disk full");} write(key,value); };
    a.equal(credits.flush(s, now).ok, false);
    credits.flush(s, now); credits.flush(s, now);
    a.equal(s.getItem("hub2_solved"), "17", failedKey); a.equal(s.getItem("hub2_credit"), "1", failedKey);
  }
});
test("failed transaction cleanup cannot restore a ticket after the user spends it", () => {
  const s=store({hub2_date:day,hub2_solved:"14",hub2_credit:"0"}); answers(s,3);
  const remove=s.removeItem;s.removeItem=()=>{throw Error("cleanup failed");};
  credits.flush(s,now);s.setItem("hub2_credit","0");s.removeItem=remove;credits.flush(s,now);
  a.equal(s.getItem("hub2_solved"),"17");a.equal(s.getItem("hub2_credit"),"0");
});
test("invalid, duplicate and unbounded receipt data is cleaned; unavailable storage reports failure", () => {
  const s=store({[credits.KEY]:JSON.stringify({day,ids:["x:1","x:1",null,"<script>",...Array.from({length:150},(_,i)=>"x:"+i)]})});
  credits.flush(s,now);a.equal(s.getItem("hub2_solved"),"100");
  const denied={getItem(){throw Error("denied");},setItem(){throw Error("denied");}};
  a.equal(credits.record(denied,"x:1",now).ok,false);a.equal(credits.flush(denied,now).ok,false);
});
test("runtime wiring gives quick entry without a timer gate, persistent receipt IDs and safe fixed return", () => {
  const root=path.resolve(__dirname,"../.."), app=fs.readFileSync(path.join(root,"math/app.js"),"utf8");
  const html=fs.readFileSync(path.join(root,"math/index.html"),"utf8"),hub=fs.readFileSync(path.join(root,"game/index.html"),"utf8");
  a.match(app,/hubRun:hubRun/);a.match(app,/HubCredits\.record\(storage, hubRun \+ ":" \+ index\)/);
  a.match(app,/if \(hubQuick\)/);a.match(app,/start\("quick"\)/);
  a.doesNotMatch(html,/play-timer\.js/);a.match(html,/math-credits\.js\?v=1/);a.match(html,/app\.js\?v=35/);
  a.match(hub,/HubMathCredits\.flush\(localStorage\)/);
  const limits=hub.match(/var SET = (\d+), DAILY = (\d+);/);
  a.equal(Number(limits[1]),credits.SET);a.equal(Number(limits[2]),credits.DAILY);
  a.match(app,/new URL\("\.\.\/game\/#study", window\.location\.href\)/);
  a.match(html,/id="hubCapsuleActions"/);
});
