const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const root = path.resolve(__dirname, '..');
const manifest = JSON.parse(fs.readFileSync(path.join(root, 'audio/hero-callouts-eleven-v2/manifest.json')));
const expected = {
  taeo: [5, 'boy', '치앗! 촤! 지앗! 촤! 쓰구미이이!'],
  jaei: [8, 'girl', '김태오!'],
  yunchan: [10, 'boy', '마마보이!'],
  yungeon: [7, 'boy', '너무 쉽잖아!'],
};

for (const [id, [age, gender, phrase]] of Object.entries(expected)) {
  test(`${id}: approved childlike recording, gallery, actions and offline cache agree`, async () => {
    const { elevenVoiceFiles, FAMILY_VOICE_PREVIEWS } = await import('../src/game/elevenVoicePacks.js');
    const { FAMILY_CALLOUTS } = await import('../src/data/familyHeroes.js');
    const info = manifest.heroes[id];
    assert.equal(manifest.approved, true);
    assert.equal(info.target_age, age); assert.equal(info.gender, gender); assert.equal(info.phrase, phrase);
    assert.equal(FAMILY_VOICE_PREVIEWS[id].phrase, phrase);
    assert.equal(FAMILY_CALLOUTS[id].special.cry, phrase);
    assert.equal(FAMILY_CALLOUTS[id].musou.cry, phrase);
    const file = `audio/hero-callouts-eleven-v2/${info.file}`;
    for (const action of ['dash', 'special', 'musou']) assert.deepEqual(elevenVoiceFiles(id)[action], [file]);
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
