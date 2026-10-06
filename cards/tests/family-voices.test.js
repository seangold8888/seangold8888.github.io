const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { FILES, ACTION_FILES, eligible, create } = require('../js/family-voices.js');
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
test('known Jay/Teo skills speak; other heroes still require large techniques, invalid actions stay quiet', () => {
  for (const id of Object.keys(FILES)) {
    assert.equal(eligible({ cardId: id, big: true }), true);
    assert.equal(eligible({ cardId: id, ultimate: true }), true);
    assert.equal(eligible({ cardId: id }), false);
  }
  assert.equal(eligible({ cardId: 'zhangfei', big: true }), false);
  assert.equal(eligible({ cardId: '__proto__', big: true }), false);
  assert.equal(eligible(null), false);
  for (const [id, actions] of Object.entries(ACTION_FILES)) for (const attack of Object.keys(actions)) assert.equal(eligible({cardId:id,attack}),true);
  assert.equal(eligible({cardId:'taeo',attack:'rest'}),false);
  assert.equal(eligible({cardId:'jaei',attack:'constructor'}),false);
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
  const expected = new Set(Object.values(FILES).map(file=>'../sanguo/audio/hero-callouts-eleven-v2/'+file));
  Object.values(ACTION_FILES).forEach(actions=>Object.values(actions).flat().forEach(file=>expected.add(file)));
  assert.equal(f.requests.length, expected.size); assert.equal(f.stopped.length, 3);
  assert.ok(f.requests.every(url => url.startsWith('https://example.test/project/sanguo/audio/')));
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
test('all seven skills use the shared clips; normal Teo quips rotate and duplicate events never speak twice', async () => {
  const { FAMILY_SKILL_LINES } = await import('../../assets/audio/family-skill-voices.js');
  const shared = new Set(Object.values(FAMILY_SKILL_LINES).flatMap(lines=>Object.values(lines).map(line=>'../'+line.file)));
  const f=fixture();
  for (const [id,actions] of Object.entries(ACTION_FILES)) for(const [attack,files] of Object.entries(actions)) {
    for(const file of files){assert.ok(shared.has(file));assert.ok(fs.existsSync(path.resolve(__dirname,'..',file)));}
    const plan={cardId:id,attack};assert.equal(await f.api.play(plan),true);
    assert.equal(f.requests.at(-1),new URL(files[0],f.host.location.href).href);
    const count=f.started.length;assert.equal(await f.api.play(plan),false);assert.equal(f.started.length,count);
  }
  await f.api.play({cardId:'taeo',attack:'발냄새 공격'});
  assert.ok(f.requests.at(-1).includes('yummy-v1'));
});
test('decoding is cached by clip, not hero, and one missing clip cannot substitute the wrong shout',async()=>{
  const f=fixture();await f.api.warm('jaei');assert.equal(f.requests.length,3);
  for(const attack of Object.keys(ACTION_FILES.jaei))assert.equal(await f.api.play({cardId:'jaei',attack}),true);
  assert.equal(f.requests.length,3);
  const blocked=fixture();blocked.host.fetch=async()=>({ok:false});
  assert.equal(await blocked.api.play({cardId:'taeo',attack:'메가랩터킥',big:true}),false);
  assert.equal(blocked.started.length,0);
});
