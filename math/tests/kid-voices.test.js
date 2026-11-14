'use strict';
// 공통 아이 외침 표(assets/study/kid-voices.js) 점검: node --test math/tests/kid-voices.test.js
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const KV = require('../../assets/study/kid-voices.js');
const root = path.resolve(__dirname, '../..');

const NEW = {
  yunchan: ['엄마 심심해!', '재밌는 거 없어?'],
  yungeon: ['총알 슛!', '해리케인 슛!', '라민 야말 슛!'],
  taeo: ['잠 못 자게 한다!'],
};

test('아이 넷 모두 클립이 있고, 새 대사 6개가 그 아이 목록에 들어 있다(재이는 그대로 5개)', () => {
  assert.deepEqual(KV.kids().sort(), ['jaei', 'taeo', 'yunchan', 'yungeon']);
  assert.equal(KV.list('yunchan').length, 4);
  assert.equal(KV.list('jaei').length, 5);
  assert.equal(KV.list('yungeon').length, 5);
  assert.equal(KV.list('taeo').length, 6);
  for (const [kid, lines] of Object.entries(NEW)) {
    const have = KV.list(kid).map(x => x[1]);
    for (const l of lines) assert.ok(have.includes(l), kid + ' ' + l);
  }
  assert.deepEqual(KV.list('nobody'), []);
});

test('모든 클립 파일이 실제로 있고, sw.js 에 오프라인 저장된다', () => {
  const sw = fs.readFileSync(path.join(root, 'sw.js'), 'utf8');
  assert.ok(sw.includes('"./assets/study/kid-voices.js?v=1"'));
  for (const kid of KV.kids()) for (const [src] of KV.TABLE[kid]) {
    const bytes = fs.statSync(path.join(root, src)).size;
    assert.ok(bytes > 5000, src);
    assert.ok(sw.includes('"./' + src + '"'), 'sw: ' + src);
  }
});

test('같은 클립이 바로 이어서 두 번 나오지 않는다(무작위가 같은 값을 줘도)', () => {
  KV._reset();
  for (const kid of KV.kids()) {
    let prev = -1;
    const rngs = [() => 0, () => 0, () => 0.5, () => 0.99, () => 0.99, Math.random];
    for (let i = 0; i < 200; i++) {
      const r = rngs[i % rngs.length], idx = KV.pickIndex(kid, r);
      assert.ok(idx >= 0 && idx < KV.TABLE[kid].length);
      assert.notEqual(idx, prev, kid + ' repeat at ' + i);
      prev = idx;
    }
  }
});

test('Node(소리 없음)에서는 아무것도 재생하지 않고 기록만 남긴다, 3초 간격·force', () => {
  KV._reset();
  const a = KV.shout('taeo');
  assert.equal(a.silent, true); assert.ok(a.line); assert.ok(a.url.endsWith('.mp3') || a.url.endsWith('.wav'));
  const b = KV.shout('taeo');
  assert.equal(b.blocked, 'gap');
  const c = KV.shout('taeo', { force: true });
  assert.equal(c.blocked, undefined); assert.equal(c.silent, true);
  assert.equal(KV.shout('nobody', { force: true }).blocked, 'kid');
  assert.equal(KV.log().length, 4);
  assert.doesNotMatch(fs.readFileSync(path.join(root, 'assets/study/kid-voices.js'), 'utf8'), /speechSynthesis\s*\.|api\.elevenlabs/);
});

test('GameQuiz: 처음 맞힘에만, 정답 터치 처리 안에서 외친다. voice:false·voiceEnabled 로 끈다', () => {
  const src = fs.readFileSync(path.join(root, 'assets/study/game-quiz.js'), 'utf8');
  assert.match(src, /if \(s\.firstTry && opts\.voice !== false && api\.voiceEnabled !== false\)/);
  assert.match(src, /KV\.shout\(kidId, \{ force: true, reason: "quiz"/);
  const GQ = require('../../assets/study/game-quiz.js');
  assert.equal(GQ.voiceEnabled, true);
  // 스카이 샷은 스스로 외치므로 GameQuiz 외침을 끈다(두 번 외치지 않게)
  assert.match(fs.readFileSync(path.join(root, 'plane/src/main.js'), 'utf8'), /GameQuiz\.ask\(\{\s*kid: PILOTS\[pilot\]\.kid, title, voice: false/);
});

test('GameQuiz 를 쓰는 모든 페이지가 kid-voices 를 game-quiz?v=3 바로 앞에 불러온다', () => {
  const pages = ['hogwarts', 'odyssey', 'multiverse', 'kedehun', 'kart3d', 'towers', 'sanguo', 'plane', 'dive'];
  for (const p of pages) {
    const html = fs.readFileSync(path.join(root, p, 'index.html'), 'utf8');
    const order = ['math/curriculum.js', 'math/learning.js', 'math/store.js', 'assets/study/math-bridge.js', 'assets/study/kid-voices.js?v=1', 'assets/study/game-quiz.js?v=3'].map(s => html.indexOf(s));
    assert.ok(order.every(i => i >= 0), p + ' ' + order);
    assert.deepEqual([...order].sort((x, y) => x - y), order, p);
    assert.ok(!html.includes('game-quiz.js?v=2'), p);
  }
});
