const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { FILES, eligible, create } = require('../js/family-voices.js');
function fixture() {
  const started = [], stopped = [], requests = [], listeners = {};
  let muted = false, clock = 0, wait = null;
  const param = { value: .95, cancelScheduledValues() {}, setValueAtTime() {}, linearRampToValueAtTime() {} };
  const audio = { state: 'running', currentTime: 1,
    decodeAudioData: async () => ({ duration: 2 }),
    createGain: () => ({ gain: { ...param }, disconnect() {} }),
    createBufferSource: () => ({ playbackRate: { value: 0 }, connect() {}, disconnect() {},
      start() { started.push(this); }, stop() { stopped.push(this); } }) };
  let current = audio;
  const host = { location: { href: 'https://example.test/project/cards/' }, performance: { now: () => clock },
    document: { hidden: false, addEventListener: (name, fn) => { listeners[name] = fn; } },
    addEventListener: (name, fn) => { listeners[name] = fn; },
    CardAudio: { isMuted: () => muted, prime: () => current, connectVoice: () => !muted },
    fetch: async url => { requests.push(url); if (wait) await wait; return { ok: true, arrayBuffer: async () => new ArrayBuffer(8) }; } };
  const api = create(host);
  return { api, host, audio, started, stopped, requests, listeners,
    mute: () => { muted = true; api.stop(); }, late: () => { clock = 800; },
    recover: () => { current = { ...audio }; },
    defer: () => { let finish; wait = new Promise(resolve => { finish = resolve; }); return finish; } };
}
test('only four approved family heroes on big attacks or ultimates; ordinary actions stay quiet', () => {
  for (const id of Object.keys(FILES)) {
    assert.equal(eligible({ cardId: id, big: true }), true);
    assert.equal(eligible({ cardId: id, ultimate: true }), true);
    assert.equal(eligible({ cardId: id }), false);
  }
  assert.equal(eligible({ cardId: 'zhangfei', big: true }), false);
  assert.equal(eligible({ cardId: '__proto__', big: true }), false);
  assert.equal(eligible(null), false);
});
test('same approved WAVs as Sanguo, shared context, preload deduplication and original pitch', async () => {
  const f = fixture();
  for (const id of Object.keys(FILES)) {
    await Promise.all([f.api.warm(id), f.api.warm(id)]);
    assert.equal(await f.api.play({ cardId: id, big: true }), true);
    assert.equal(f.started.at(-1).playbackRate.value, 1);
    const local = path.resolve(__dirname, '../../sanguo/audio/hero-callouts-eleven-v2', FILES[id]);
    assert.ok(fs.existsSync(local));
  }
  assert.equal(f.requests.length, 4); assert.equal(f.stopped.length, 3);
  assert.ok(f.requests.every(url => url.startsWith('https://example.test/project/sanguo/audio/hero-callouts-eleven-v2/')));
  f.api.stop(); assert.equal(f.stopped.length, 4);
});
for (const scenario of ['mute', 'navigation', 'hidden', 'late', 'recovery', 'newer action']) {
  test(`pending decode cannot speak after ${scenario}`, async () => {
    const f = fixture(), finish = f.defer();
    const pending = f.api.play({ cardId: 'taeo', big: true });
    if (scenario === 'mute') f.mute();
    if (scenario === 'navigation') f.listeners.pagehide();
    if (scenario === 'hidden') { f.host.document.hidden = true; f.listeners.visibilitychange(); }
    if (scenario === 'late') f.late();
    if (scenario === 'recovery') f.recover();
    let newer;
    if (scenario === 'newer action') newer = f.api.play({ cardId: 'jaei', ultimate: true });
    finish(); assert.equal(await pending, false);
    if (newer) { assert.equal(await newer, true); assert.equal(f.started.length, 1); }
    else assert.equal(f.started.length, 0);
  });
}
test('unavailable recording is silent and does not block combat', async () => {
  const f = fixture(); f.host.fetch = async () => ({ ok: false });
  assert.equal(await f.api.play({ cardId: 'jaei', big: true }), false);
  assert.equal(await f.api.warm('jaei'), false); assert.equal(f.started.length, 0);
});
