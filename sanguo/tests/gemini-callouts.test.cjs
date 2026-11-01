// Gemini TTS technique-name shouts: each shipped take says the hero's skill
// name, files are small and cached, the game routes exactly the manifest's
// lines, and family voices plus Zhang Fei's kept "장판뇌후" stay untouched.
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.join(__dirname, '..');
const dir = path.join(root, 'audio/hero-callouts-gemini-v1');
const manifest = JSON.parse(fs.readFileSync(path.join(dir, 'manifest.json'), 'utf8'));
const source = fs.readFileSync(path.join(root, 'src/game/sideScroller.js'), 'utf8');
const sw = fs.readFileSync(path.join(root, '../sw.js'), 'utf8');
const routed = action => JSON.parse(source.match(new RegExp(`\\n  ${action}: new Set\\((\\[[^\\]]*\\])\\)`))[1].replace(/'/g, '"'));
const names = Object.fromEntries([...source.matchAll(/\n  (\w+): \{ special: \{ name: '([^']+)'.*?musou: \{ name: '([^']+)'/g)]
  .map(m => [m[1], { special: m[2], musou: m[3] }]));
const FAMILY = ['taeo', 'jaei', 'yunchan', 'yungeon'];

test('game routes exactly the manifest lines, never family heroes or the kept Zhang Fei special', () => {
  for (const action of ['special', 'musou']) {
    const fromManifest = Object.keys(manifest.heroes).filter(id => manifest.heroes[id][action]).sort();
    assert.deepEqual(routed(action).sort(), fromManifest, action);
    for (const id of FAMILY) assert.ok(!routed(action).includes(id), `${id} keeps the approved family voice`);
  }
  assert.ok(!routed('special').includes('zhangfei'), 'Zhang Fei special keeps the existing v6 recording');
  assert.ok(fs.existsSync(path.join(root, 'audio/hero-callouts-ko-v6/zhangfei-special-v6.wav')));
});

test('every non-family line is either a Gemini take or a documented fallback', () => {
  const kept = new Set([...(manifest.keptV6 || []), ...(manifest.noVoice || []), 'zhangfei-special']);
  for (const id of Object.keys(names).filter(id => !FAMILY.includes(id))) {
    for (const action of ['special', 'musou']) {
      const key = `${id}-${action}`;
      assert.ok(!!manifest.heroes[id]?.[action] !== kept.has(key), key);
    }
  }
  for (const key of manifest.keptV6 || []) assert.ok(fs.existsSync(path.join(root, `audio/hero-callouts-ko-v6/${key}-v6.wav`)), key);
  assert.ok(Object.values(manifest.heroes).reduce((n, h) => n + Object.keys(h).length, 0) >= 60, 'most lines re-recorded');
});

test('manifest takes say the exact skill name, stay short and are cached', () => {
  let bytes = 0;
  for (const [id, lines] of Object.entries(manifest.heroes)) {
    const voices = new Set();
    for (const [action, take] of Object.entries(lines)) {
      assert.equal(take.text, names[id][action], `${id} ${action} text`);
      assert.equal(take.file, `${id}-${action}-g1.mp3`);
      assert.ok(take.duration > .4 && take.duration < 4.5, `${id} ${action} duration ${take.duration}`);
      const size = fs.statSync(path.join(dir, take.file)).size;
      assert.ok(size > 3000 && size < 60000, `${id} ${action} size ${size}`);
      assert.ok(sw.includes(`"./sanguo/audio/hero-callouts-gemini-v1/${take.file}"`), `${take.file} cached`);
      voices.add(take.voice); bytes += size;
    }
    assert.equal(voices.size, 1, id + ' one voice per hero');
  }
  const shipped = fs.readdirSync(dir).filter(f => f.endsWith('.mp3')).sort();
  assert.deepEqual(shipped, Object.values(manifest.heroes).flatMap(h => Object.values(h).map(t => t.file)).sort(), 'no stray files');
  assert.ok(sw.includes('"./sanguo/audio/hero-callouts-gemini-v1/manifest.json"'));
  assert.ok(bytes < 6 * 1024 * 1024, 'pack stays under 6 MB');
});
