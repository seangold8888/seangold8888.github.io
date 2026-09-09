const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const cries = () => import('../src/game/battleCries.js');
const skills = () => import('../src/game/dashSkills.js');

test('all 30 playable heroes have a bounded, character-specific battle cry profile', async () => {
  const [{ BATTLE_CRY_PACKS, BATTLE_CRY_PROFILES }, { DASH_SKILLS }] = await Promise.all([cries(), skills()]);
  assert.equal(Object.keys(BATTLE_CRY_PROFILES).length, 30);
  assert.deepEqual(Object.keys(BATTLE_CRY_PROFILES).sort(), Object.keys(DASH_SKILLS).sort());
  for (const [heroId, profile] of Object.entries(BATTLE_CRY_PROFILES)) {
    assert.ok(BATTLE_CRY_PACKS[profile.pack], `${heroId}: ${profile.pack}`);
    assert.ok(profile.rate >= .84 && profile.rate <= 1.10, `${heroId}: natural playback rate`);
    assert.ok(profile.gain >= .60 && profile.gain <= .84, `${heroId}: controlled gain`);
    assert.ok(profile.lowpass >= 3500 && profile.lowpass <= 7200, `${heroId}: lowpass`);
    assert.ok(profile.highpass >= 50 && profile.highpass <= 160, `${heroId}: highpass`);
    assert.ok(profile.wet >= .05 && profile.wet <= .16, `${heroId}: reverb`);
  }
  assert.deepEqual(
    Object.entries(BATTLE_CRY_PROFILES).filter(([, profile]) => profile.pack === 'female').map(([id]) => id).sort(),
    ['husanniang', 'sunshangxiang', 'tieshangongzhu'],
  );
});

test('all source recordings exist, are cached for offline play and female takes are tightly segmented', async () => {
  const { BATTLE_CRY_PACKS, FEMALE_BATTLE_CRY_SEGMENTS } = await cries();
  const root = path.resolve(__dirname, '../..');
  const sw = fs.readFileSync(path.join(root, 'sw.js'), 'utf8');
  const files = Object.values(BATTLE_CRY_PACKS).flat();
  assert.equal(files.length, 9);
  assert.equal(new Set(files).size, 9);
  for (const file of files) {
    assert.ok(fs.statSync(path.join(root, 'sanguo', file)).size > 10000, file);
    assert.ok(sw.includes(`"./sanguo/${file}"`), `${file}: offline cache`);
  }
  assert.equal(FEMALE_BATTLE_CRY_SEGMENTS.length, 3);
  for (const segment of FEMALE_BATTLE_CRY_SEGMENTS) {
    assert.ok(segment.offset >= .3 && segment.offset < 4);
    assert.ok(segment.duration >= .8 && segment.duration <= 1.2);
  }
});

test('specials always trigger the real cry layer and make space in the music mix', () => {
  const source = fs.readFileSync(path.join(__dirname, '../src/game/sideScroller.js'), 'utf8');
  assert.match(source, /battleCry: BATTLE_CRY_PACKS\[battleCry\.pack\]/);
  assert.match(source, /const playHeroCry = \(\) => playBattleCry\(powerful, battleCryDelay\)/);
  assert.match(source, /duckMusic\(powerful \? \.095 : \.11, powerful \? 1600 : 1320\)/);
  assert.match(source, /sampleReady\.battleCry/);
  assert.match(source, /source\.start\(startedAt, sourceOffset, sourceDuration\)/);
});
