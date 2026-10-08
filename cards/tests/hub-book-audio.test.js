'use strict';
const test=require('node:test'),a=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto');
const root=path.resolve(__dirname,'../..'),books=require('../../story/english/books.js'),sw=require('../../sw.js');
const normalize=t=>(t.toLowerCase().match(/[a-z]+/g)||[]).join(' ');
test('every visible reading line has an exact-text recording at all three difficulty levels',()=>{
  const plan=books.practiceAudioPlan(),sources=new Map(plan.map(l=>[l.audio,l.text]));
  a.equal(sources.size,plan.length);
  for(const book of books.books)for(const page of book.pages)for(const mode of ['easy','sentence','page'])for(const line of books.practice(page,mode)){
    a.equal(sources.get(line.audio),line.text);a.ok(fs.existsSync(path.join(root,'story/english',line.audio)),line.audio);
    a.ok(sw.CORE_SHELL.includes('./story/english/'+line.audio),line.audio+' offline');
    if(mode==='page')a.equal(line.audio,page.audio);
  }
});
test('all new clips have matching actual speech transcripts and checksums; no stale or colliding text',()=>{
  const clips=books.practiceAudioPlan().filter(l=>l.audio.includes('/practice-v1/'));
  a.equal(clips.length,98);a.equal(sw.ENGLISH_PRACTICE_AUDIO_FILES.length,clips.length);
  for(const line of clips){
    const p=path.join(root,'story/english',line.audio),info=JSON.parse(fs.readFileSync(p.replace(/\.mp3$/,'.json'),'utf8'));
    a.equal(info.text,line.text);a.equal(info.transcript_verified,true);a.equal(info.verification_version,2);a.equal(normalize(info.transcript),normalize(line.text));
    a.equal(info.sha256,crypto.createHash('sha256').update(fs.readFileSync(p)).digest('hex'));
  }
});
test('practice listening and original narration are separate, stop the microphone, and never fall back to wrong text',()=>{
  const html=fs.readFileSync(path.join(root,'story/english/index.html'),'utf8');
  a.match(html,/playNarration\(line\.audio, text, listen/);a.match(html,/playNarration\(page\.audio, originalText, originalListen/);
  a.match(html,/원문 듣기/);a.match(html,/이 문장 듣기/);a.match(html,/stopPractice\(\); practice\.hidden = true/);
  const handler=html.slice(html.indexOf('function playNarration('),html.indexOf('show.addEventListener'));
  a.doesNotMatch(handler,/recordPass|markDone|new Audio\(page\.audio\)/);
});
