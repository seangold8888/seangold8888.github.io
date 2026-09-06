'use strict';
const test = require('node:test'), assert = require('node:assert/strict');
const fs = require('node:fs'), path = require('node:path'), vm = require('node:vm');
const html = fs.readFileSync(path.join(__dirname, '../../index.html'), 'utf8');
test('clock face has its own responsive size without enlarging other study images', () => {
  assert.match(html, /#study \.items\.clock-face\s*\{[^}]*font-size: clamp\(160px, 28vw, 240px\)/);
  assert.match(html, /#study \.items\.clock-face\s*\{[^}]*text-align: center/);
  assert.match(html, /#study \.items \{[^}]*font-size: clamp\(24px, 4vw, 34px\)/);
});
test('clock sizing follows the current question and resets on the next subject', () => {
  const start=html.indexOf('  function renderProblem() {');
  const end=html.indexOf('    if (current.reading) {',start);
  assert.ok(start>0&&end>start);
  const classes=new Set(); let type='clock';
  const context={isFree:()=>false,hasTicket:()=>false,stopReading(){},nextStudySeed:()=>({type}),
    makeProblem:seed=>({seed,items:seed.type==='clock'?'🕜':'🍎',formula:'',question:'문제'}),
    state:{wrong:[]},bookKey:seed=>seed.type,sinceReview:0,currentLevel:()=>({name:'공부'}),
    eyebrowEl:{},itemsEl:{classList:{toggle:(name,on)=>on?classes.add(name):classes.delete(name)}},
    questionEl:{},document:{getElementById:()=>({})}};
  vm.runInNewContext(html.slice(start,end)+'\n}',context);
  context.renderProblem();assert.equal(classes.has('clock-face'),true);assert.equal(context.itemsEl.textContent,'🕜');
  type='reading';context.renderProblem();assert.equal(classes.has('clock-face'),false);
  type='clock';context.renderProblem();assert.equal(classes.has('clock-face'),true);
});
test('all inline scripts compile after the display-only change', () => {
  for(const m of html.matchAll(/<script[^>]*>([\s\S]*?)<\/script>/g))assert.doesNotThrow(()=>new vm.Script(m[1]));
});
