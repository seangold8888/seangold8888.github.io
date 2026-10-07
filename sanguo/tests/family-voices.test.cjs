const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const root = path.resolve(__dirname, '..');
test('Jay/Teo ordinary skills do not fire a generic shout before their mapped cry', () => {
  const source = fs.readFileSync(path.join(root, 'src/game/sideScroller.js'), 'utf8').replace(/\r/g, '');
  const start = source.indexOf("else if (type !== 'ranged') {\n");
  assert.ok(start >= 0);
  const readableBlock = source.slice(start, source.indexOf('const duration = musou ?', start));
  assert.match(readableBlock, /else if \(!\['taeo', 'jaei'\]\.includes\(heroId\) \|\| type === 'mountedThrust'\)/);
});
const manifest = JSON.parse(fs.readFileSync(path.join(root, 'audio/hero-callouts-eleven-v2/manifest.json')));
const expected = {
  taeo: [5, 'boy', '치앗! 촤! 지앗! 촤! 쓰구미이이!'],
  jaei: [8, 'girl', '김태오!'],
  yunchan: [10, 'boy', '마마보이!'],
  yungeon: [7, 'boy', '너무 쉽잖아!'],
};

test('Taeo Mega Raptor Kick: separate take, same actor, audible PCM and offline cache', async () => {
  const { elevenVoiceFiles, FAMILY_VOICE_PREVIEWS } = await import('../src/game/elevenVoicePacks.js');
  const file = 'audio/hero-techniques-eleven-v1/taeo-special-eleven-megaraptor-v1.wav';
  const info = JSON.parse(fs.readFileSync(path.join(root, file.replace('.wav', '.json'))));
  assert.equal(info.voice_id, manifest.heroes.taeo.voice_id);
  assert.equal(info.model, 'eleven_v3');
  assert.match(info.text, /메가랩터키익!/);
  assert.equal(info.reviewed, false, 'new take still awaits listening approval');
  assert.equal(FAMILY_VOICE_PREVIEWS.taeo.specialPhrase, '메가냅터킥!');
  assert.ok(info.duration > .25 && info.duration < 4.5);
  const wav = fs.readFileSync(path.join(root, file));
  assert.equal(wav.toString('ascii', 0, 4), 'RIFF');
  assert.equal(wav.toString('ascii', 8, 12), 'WAVE');
  let format, pcm;
  for (let offset = 12; offset + 8 <= wav.length;) {
    const type = wav.toString('ascii', offset, offset + 4), length = wav.readUInt32LE(offset + 4);
    const data = wav.subarray(offset + 8, offset + 8 + length);
    if (type === 'fmt ') format = data;
    if (type === 'data') pcm = data;
    offset += 8 + length + (length % 2);
  }
  assert.ok(format && pcm);
  assert.equal(format.readUInt16LE(0), 1); assert.equal(format.readUInt16LE(2), 1); assert.equal(format.readUInt16LE(14), 16);
  assert.ok(Math.abs(pcm.length / 2 / format.readUInt32LE(4) - info.duration) < .002);
  let peak = 0, energy = 0;
  for (let offset = 0; offset < pcm.length; offset += 2) {
    const sample = pcm.readInt16LE(offset) / 32768;
    peak = Math.max(peak, Math.abs(sample)); energy += sample * sample;
  }
  const rms = Math.sqrt(energy / (pcm.length / 2));
  assert.ok(peak > .05 && peak < .99 && rms > .01, 'audible, non-clipped PCM');
  const sw = fs.readFileSync(path.join(root, '../sw.js'), 'utf8');
  for (const audioFile of [file, file.replace('.wav', '.mp3')]) assert.ok(sw.includes(`"./sanguo/${audioFile}"`));
});

for (const [id, [age, gender, phrase]] of Object.entries(expected)) {
  test(`${id}: approved childlike recording, gallery, actions and offline cache agree`, async () => {
    const { elevenVoiceFiles, FAMILY_VOICE_PREVIEWS } = await import('../src/game/elevenVoicePacks.js');
    const { FAMILY_CALLOUTS } = await import('../src/data/familyHeroes.js');
    const info = manifest.heroes[id];
    assert.equal(manifest.approved, true);
    assert.equal(info.target_age, age); assert.equal(info.gender, gender); assert.equal(info.phrase, phrase);
    assert.equal(FAMILY_VOICE_PREVIEWS[id].phrase, id === 'taeo' ? '치앗! 촤! 치앗! 촤!' : phrase);
    assert.equal(FAMILY_CALLOUTS[id].special.cry, id === 'taeo' ? '메가냅터킥!' : id === 'jaei' ? '물통 바꿔줘!' : phrase);
    assert.equal(FAMILY_CALLOUTS[id].musou.cry, id === 'taeo' ? '싸우자!' : phrase);
    const file = `audio/hero-callouts-eleven-v2/${info.file}`;
    const { familySkillLine } = await import('../../assets/audio/family-skill-voices.js');
    for (const action of ['dash', 'special', 'musou']) assert.deepEqual(elevenVoiceFiles(id)[action], [familySkillLine(id, action)?.file.replace(/^sanguo\//, '') || file]);
    assert.ok(fs.readFileSync(path.join(root, '../sw.js'), 'utf8').includes(`"./sanguo/${file}"`));
    const wav = fs.readFileSync(path.join(root, file));
    assert.equal(wav.toString('ascii', 0, 4), 'RIFF'); assert.equal(wav.toString('ascii', 8, 12), 'WAVE');
    let format, pcm;
    for (let offset = 12; offset + 8 <= wav.length;) {
      const type = wav.toString('ascii', offset, offset + 4), length = wav.readUInt32LE(offset + 4);
      const data = wav.subarray(offset + 8, offset + 8 + length);
      if (type === 'fmt ') format = data;
      if (type === 'data') pcm = data;
      offset += 8 + length + (length % 2);
    }
    assert.ok(format && pcm); assert.equal(format.readUInt16LE(0), 1);
    assert.equal(format.readUInt16LE(2), 1); assert.equal(format.readUInt16LE(14), 16);
    assert.ok(Math.abs(pcm.length / 2 / format.readUInt32LE(4) - info.duration) < .002);
    let peak = 0, energy = 0;
    for (let offset = 0; offset < pcm.length; offset += 2) {
      const value = pcm.readInt16LE(offset) / 32768; peak = Math.max(peak, Math.abs(value)); energy += value * value;
    }
    assert.ok(peak > .05 && peak < .99 && Math.sqrt(energy / (pcm.length / 2)) > .01, 'audible, non-clipped PCM');
  });
}
