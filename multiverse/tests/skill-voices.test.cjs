const test=require('node:test'),a=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const root=path.resolve(__dirname,'../..');
test('all eight requested lines exist, match the two skill maps, and are offline cached',async()=>{
  const {FAMILY_SKILL_LINES,familySkillLine}=await import('../../assets/audio/family-skill-voices.js');
  a.equal(Object.keys(FAMILY_SKILL_LINES.jaei).length,3);a.equal(Object.keys(FAMILY_SKILL_LINES.taeo).length,5);
  a.equal(familySkillLine('taeo','special').phrase,'메가냅터킥!');a.equal(familySkillLine('jaei','special').phrase,'물통 바꿔줘!');
  const {elevenVoiceFiles}=await import('../../sanguo/src/game/elevenVoicePacks.js');
  const sw=fs.readFileSync(path.join(root,'sw.js'),'utf8');
  for(const hero of ['jaei','taeo']){
    for(const action of ['attack','heavy','ranged','dash','special','musou','whirlwind','counter'])
      a.equal(elevenVoiceFiles(hero)[action][0],familySkillLine(hero,action).file.replace(/^sanguo\//,''));
    for(const line of Object.values(FAMILY_SKILL_LINES[hero])){
      const bytes=fs.readFileSync(path.join(root,line.file));a.equal(bytes.toString('ascii',0,4),'RIFF');
      a.ok(bytes.length>20000);a.ok(sw.includes('"./'+line.file+'"'));
      let pcm;
      for(let at=12;at+8<=bytes.length;){const len=bytes.readUInt32LE(at+4);if(bytes.toString('ascii',at,at+4)==='data')pcm=bytes.subarray(at+8,at+8+len);at+=8+len+(len%2);}
      a.ok(pcm);let peak=0,energy=0;
      for(let i=0;i<pcm.length;i+=2){const v=pcm.readInt16LE(i)/32768;peak=Math.max(peak,Math.abs(v));energy+=v*v;}
      a.ok(peak>.05&&peak<.99);a.ok(Math.sqrt(energy/(pcm.length/2))>.01);
    }
  }
});
test('normal shouts never interrupt a special, important skills replace normal cries, mute and errors are safe',async()=>{
  const {createFamilySkillPlayer}=await import('../../assets/audio/family-skill-voices.js');
  let at=0,muted=false;const clips=[];
  class Audio{constructor(src){this.src=src;this.events={};this.pauses=0;clips.push(this);}addEventListener(e,f){this.events[e]=f;}pause(){this.pauses++;}play(){return Promise.resolve();}}
  const env={Audio,performance:{now:()=>at},document:{hidden:false}},p=createFamilySkillPlayer(env,'../',{muted:()=>muted});
  a.equal(p.play('taeo','attack'),true);a.equal(p.play('jaei','attack'),false);
  a.equal(p.play('taeo','special',3),true);a.equal(clips[0].pauses,1);
  a.equal(p.play('taeo','heavy'),false);a.equal(clips.length,2);
  clips[1].events.ended();a.equal(p.play('taeo','special',3),false);
  at=3000;a.equal(p.play('jaei','special',3),true);muted=true;p.stop();a.equal(clips[2].pauses,1);
  a.equal(p.play('taeo','dash',2),false);muted=false;env.document.hidden=true;a.equal(p.play('taeo','dash',2),false);
  env.document.hidden=false;a.equal(p.play('taeo','dash',2),true);clips[3].events.error();
  a.equal(p.play('taeo','heavy'),true);p.stop();a.equal(p.play('unknown','special',3),false);
});
test('multiverse cries only on accepted player actions and clears playback on exit or pause',()=>{
  const source=fs.readFileSync(path.join(root,'multiverse/game.js'),'utf8');
  a.match(source,/if \(h\.isPlayer\) skillVoices\.play\(h\.kid, 'special', 3\)/);
  a.match(source,/if \(id\) skillVoices\.stop\(\)/);a.match(source,/if \(muted\) skillVoices\.stop\(\)/);
  a.match(source,/game\.collected % 5 === 0/);
  a.doesNotMatch(fs.readFileSync(path.join(root,'assets/audio/family-skill-voices.js'),'utf8'),/api\.elevenlabs|speechSynthesis/);
});
