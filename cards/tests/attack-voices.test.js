// Card attack shouts (ElevenLabs, 11-02): every non-family card shouts its big
// (last) attack name through the family voice player; family cards are untouched.
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { FILES, ACTION_FILES, ATTACK_LINES, ATTACK_DIR, eligible, create } = require('../js/family-voices.js');

const cardsDir = path.join(__dirname, '..');
const siteRoot = path.join(cardsDir, '..');
const data = JSON.parse(fs.readFileSync(path.join(cardsDir, 'cards.json'), 'utf8'));
const manifest = JSON.parse(fs.readFileSync(path.join(cardsDir, 'audio/attack-voices-v1/manifest.json'), 'utf8'));
const sw = fs.readFileSync(path.join(siteRoot, 'sw.js'), 'utf8');
const html = fs.readFileSync(path.join(cardsDir, 'index.html'), 'utf8');
const FAMILY = ['taeo', 'jaei', 'yunchan', 'yungeon'];
const others = data.cards.filter(card => !FAMILY.includes(card.id));

function fixture() {
  const started = [], stopped = [], requests = [];
  let muted = false;
  const param = { value: .95, cancelScheduledValues() {}, setValueAtTime() {}, linearRampToValueAtTime() {} };
  const audio = { state: 'running', currentTime: 1,
    decodeAudioData: async () => ({ duration: 1.2 }),
    createGain: () => ({ gain: { ...param }, disconnect() {} }),
    createBufferSource: () => ({ playbackRate: { value: 0 }, connect() {}, disconnect() {},
      start() { started.push(this); }, stop() { stopped.push(this); } }) };
  const host = { location: { href: 'https://example.test/project/cards/' }, performance: { now: () => 0 },
    document: { hidden: false, addEventListener() {} }, addEventListener() {},
    CardAudio: { isMuted: () => muted, prime: () => audio, connectVoice: () => !muted },
    fetch: async url => { requests.push(url); return { ok: true, arrayBuffer: async () => new ArrayBuffer(8) }; } };
  return { api: create(host), started, stopped, requests, mute: () => { muted = true; } };
}

test('every non-family card maps its big (last) attack to a shipped, cached clip', () => {
  const noVoice = new Set(manifest.noVoice || []);
  assert.ok(others.length >= 86);
  assert.ok(noVoice.size <= 8, 'almost every card has a voice');
  for (const card of others) {
    const big = card.attacks.at(-1).name;
    if (noVoice.has(card.id)) { assert.equal(ATTACK_LINES[card.id], undefined, card.id); continue; }
    assert.equal(ATTACK_LINES[card.id], big, card.id);
    const entry = manifest.cards[card.id];
    assert.equal(entry.attack, big); assert.equal(entry.file, card.id + '.mp3');
    // exact/near: blind transcription says the attack name; minor: accent-level slip after 3 takes.
    assert.ok(['exact', 'near', 'minor'].includes(entry.check), card.id + ' transcription check');
    assert.ok(entry.heard.length > 0 && entry.takes <= 3, card.id + ' at most 3 takes, transcripts kept');
    assert.ok(entry.duration > .3 && entry.duration < 4, card.id + ' duration ' + entry.duration);
    const file = path.join(cardsDir, ATTACK_DIR, entry.file);
    const size = fs.statSync(file).size;
    assert.ok(size > 2000 && size < 60000, card.id + ' size ' + size);
    assert.ok(sw.includes(`"./cards/${ATTACK_DIR}${entry.file}"`), entry.file + ' cached by the service worker');
    assert.equal(eligible({ cardId: card.id, attack: big }), true);
    for (const other of card.attacks.slice(0, -1)) assert.equal(eligible({ cardId: card.id, attack: other.name, big: true }), false, card.id + ' ' + other.name);
  }
  const shipped = fs.readdirSync(path.join(cardsDir, ATTACK_DIR)).filter(f => f.endsWith('.mp3')).sort();
  assert.deepEqual(shipped, Object.keys(ATTACK_LINES).map(id => id + '.mp3').sort(), 'no stray or missing clips');
  assert.deepEqual(Object.keys(manifest.cards).sort(), Object.keys(ATTACK_LINES).sort());
  assert.ok(Object.values(manifest.cards).filter(e => e.check === 'exact').length >= 60, 'most shouts transcribed exactly');
  const bytes = shipped.reduce((n, f) => n + fs.statSync(path.join(cardsDir, ATTACK_DIR, f)).size, 0);
  assert.ok(bytes < 3 * 1024 * 1024, 'attack voice pack stays under 3 MB: ' + bytes);
});

test('family cards keep exactly their approved voices', () => {
  assert.deepEqual(Object.keys(FILES).sort(), [...FAMILY].sort());
  for (const id of FAMILY) assert.equal(Object.prototype.hasOwnProperty.call(ATTACK_LINES, id), false, id);
  assert.deepEqual(Object.keys(ACTION_FILES).sort(), ['jaei', 'taeo']);
  assert.deepEqual(Object.keys(ACTION_FILES.taeo), ['발냄새 공격', '연속 방귀', '대왕 방귀', '메가랩터킥']);
  assert.deepEqual(Object.keys(ACTION_FILES.jaei), ['코딱지 날리기', '트림 폭탄', '참았던 방귀']);
  for (const id of FAMILY) assert.equal(eligible({ cardId: id, big: true }), true);
  assert.equal(eligible({ cardId: 'zhangfei', big: true }), false, 'non-family cards need their exact big attack');
  assert.equal(eligible({ cardId: '__proto__', attack: 'constructor' }), false);
});

test('index.html and the service worker load the same new player version', () => {
  const version = html.match(/js\/family-voices\.js\?v=(\d+)/)[1];
  assert.ok(Number(version) >= 3);
  assert.ok(sw.includes(`"./cards/js/family-voices.js?v=${version}"`));
});

test('warming fetches only the battling cards; a shout plays once and never cuts a speaking voice', async () => {
  const [a, b] = Object.keys(ATTACK_LINES);
  const f = fixture();
  assert.equal(await f.api.warm(a), true);
  assert.deepEqual(f.requests, [`https://example.test/project/cards/${ATTACK_DIR}${a}.mp3`]);
  const plan = { cardId: a, attack: ATTACK_LINES[a] };
  assert.equal(await f.api.play(plan), true);
  assert.equal(await f.api.play(plan), false, 'the same attack event never speaks twice');
  // While the first shout is still speaking, the next card waits its turn.
  assert.equal(await f.api.play({ cardId: b, attack: ATTACK_LINES[b] }), false);
  assert.equal(f.started.length, 1); assert.equal(f.stopped.length, 0, 'the speaking voice is not cut');
  f.started[0].onended();
  assert.equal(await f.api.play({ cardId: b, attack: ATTACK_LINES[b] }), true);
  assert.equal(f.started.length, 2);
});

test('muted games and ordinary attacks stay quiet', async () => {
  const id = Object.keys(ATTACK_LINES)[0];
  const card = data.cards.find(c => c.id === id);
  const f = fixture();
  assert.equal(await f.api.play({ cardId: id, attack: card.attacks[0].name, big: true }), false);
  f.mute();
  assert.equal(await f.api.warm(id), false);
  assert.equal(await f.api.play({ cardId: id, attack: ATTACK_LINES[id] }), false);
  assert.equal(f.started.length, 0); assert.equal(f.requests.length, 0);
});
