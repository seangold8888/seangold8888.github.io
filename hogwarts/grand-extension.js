/* GRAND EXTENSION — fair mastery grades and a complete seven-year arc */
(() => {
  'use strict';
  const $=id=>document.getElementById(id);
  const ensureFlags=()=>{if(!S.storyFlags||typeof S.storyFlags!=='object')S.storyFlags={};if(typeof S.storyFlags.year6Seen!=='boolean')S.storyFlags.year6Seen=false;};
  ensureFlags();save();

  /* Time remains useful, but skill metrics now cap the grade for games that
     expose mistakes, accuracy, collection rate or collisions. */
  const GU_PAR=[
    [[14,24],[1.6,3],[7,12],[14,22],[15,24],[15,24],[24,38],[46,62]],
    [[16,27],[2.1,3.8],[9,15],[18,28],[22,34],[20,31],[34,50],[44,60]],
    [[19,32],[2.8,4.8],[12,19],[22,34],[30,44],[27,40],[45,65],[42,58]],
    [[23,38],[3.6,6],[16,25],[28,42],[38,55],[35,50],[60,85],[40,56]]
  ];
  const priorStarsFor=starsFor;
  starsFor=function(i,secs){
    const par=GU_PAR[Math.max(0,Math.min(3,lvIdx()))]?.[i];
    let grade=par?(secs<=par[0]?3:secs<=par[1]?2:1):priorStarsFor(i,secs);
    const hud=stage.querySelector('#hits'),d=hud?.dataset||{};
    if(i===0)grade=Math.min(grade,spellPenalty===0?3:spellPenalty<=1.5?2:1);
    if(i===3||i===5){const misses=Number(d.d||0);grade=Math.min(grade,misses===0?3:misses<=2?2:1);}
    if(i===6){const errors=Number(d.d||0),pairs=Math.max(1,Number(d.b||1));grade=Math.min(grade,errors<=1?3:errors<=pairs?2:1);}
    if(i===7){const caught=Number(d.a||0),total=Math.max(1,Number(d.b||1)),hits=Number(d.d||0),ratio=caught/total;grade=Math.min(grade,ratio>=.8&&hits<=1?3:ratio>=.5&&hits<=3?2:1);}
    return Math.max(1,Math.min(3,grade));
  };

  /* Difficulty mastery uses all four level-specific star rows (96 total), so
     the highest rank can no longer be reached by repeating only easy mode. */
  const masteryInfo=()=>{
    const total=S.levelStars.flat().reduce((a,b)=>a+(Number(b)||0),0),max=SPELLS*3*4;
    const tiers=lang==='ko'
      ? [['입문','📜',0],['청동 마스터','🥉',24],['은빛 마스터','🥈',48],['황금 마스터','🥇',72],['대마법사','👑',96]]
      : [['Initiate','📜',0],['Bronze Master','🥉',24],['Silver Master','🥈',48],['Gold Master','🥇',72],['Grand Master','👑',96]];
    let tier=tiers[0];for(const t of tiers)if(total>=t[2])tier=t;
    const next=tiers.find(t=>t[2]>total),note=next?(lang==='ko'?`${next[0]}까지 별 ${next[2]-total}개`:`${next[2]-total} stars to ${next[0]}`):(lang==='ko'?'모든 난이도 완전 정복':'Every difficulty mastered');
    return {total,max,tier,note};
  };
  function paintMastery(){
    const info=masteryInfo(),card=$('progressCard');if(!card)return;
    let el=$('grandMastery');if(!el){el=document.createElement('div');el.id='grandMastery';el.className='grand-mastery';card.after(el);}
    el.style.setProperty('--mastery-p',Math.round(info.total/info.max*100)+'%');
    el.innerHTML='<span class="seal">'+info.tier[1]+'</span><span><strong>'+info.tier[0]+'</strong><small>'+info.note+'</small></span><b>★ '+info.total+' / '+info.max+'</b>';
    el.setAttribute('aria-label',info.tier[0]+' · '+info.total+' / '+info.max+' · '+info.note);
  }
  const priorRenderMenu=renderMenu;
  renderMenu=function(){priorRenderMenu();paintMastery();};
  const priorRenderDiploma=renderDiploma;
  renderDiploma=function(){priorRenderDiploma();const stats=$('dipStats'),info=masteryInfo();if(stats&&!stats.querySelector('.difficulty-mastery')){const span=document.createElement('span');span.className='difficulty-mastery';span.textContent='♛ '+info.tier[0]+' · ★ '+info.total+'/'+info.max;stats.appendChild(span);}};
  const priorAchievementDefs=achievementDefs;
  achievementDefs=function(){const defs=priorAchievementDefs(),info=masteryInfo(),badge=lang==='ko'?['♛','난이도 개척자','전체 난이도 별 48개',info.total>=48]:['♛','Difficulty Pioneer','Earn 48 stars across all levels',info.total>=48];defs.splice(defs.length-1,0,badge);return defs;};

  /* Sixth-year cinematic interlude, shown exactly between the fifth-year
     practice chapter and the final return to the castle. */
  const layer=document.createElement('div');layer.id='year6Layer';layer.hidden=true;layer.setAttribute('role','dialog');layer.setAttribute('aria-modal','true');layer.setAttribute('aria-labelledby','year6Title');document.body.appendChild(layer);
  const year6Text=()=>lang==='ko'?{
    kicker:'6학년 · 혼혈 왕자의 단서',title:'기억 속의 단서',place:'⌖ 천문탑 아래 · 기억의 방',
    body:'덤블도어와 함께 오래된 기억을 따라가며, 마지막 결전을 막으려면 어둠의 마법에 숨겨진 조각들을 먼저 찾아야 한다는 사실을 알게 된다.',
    quote:'가장 어두운 기억도 진실을 비추는 빛이 될 수 있단다.',mission:'기억 속 단서를 간직하고 마지막 귀환을 준비하세요.',next:'7학년으로 계속',menu:'연대기로 돌아가기',speaker:'덤블도어 교수님'
  }:{
    kicker:'YEAR SIX · THE HALF-BLOOD CLUE',title:'A Memory of Secrets',place:'⌖ Beneath the Astronomy Tower · Memory Chamber',
    body:'Following an old memory with Dumbledore reveals that the hidden fragments of dark magic must be found before the final battle can be faced.',
    quote:'Even the darkest memory may become a light that reveals the truth.',mission:'Carry the clue forward and prepare for the final return.',next:'Continue to Year Seven',menu:'Return to chronicle',speaker:'Professor Dumbledore'
  };
  function paintYear6(){
    const y=year6Text();layer.innerHTML=`<article class="year6-card"><div class="year6-copy"><span class="year6-kicker"></span><h2 id="year6Title"></h2><p class="year6-place"></p><p class="year6-body"></p><div class="year6-quote"><span id="year6Face"></span><span><strong></strong><q></q></span><button class="year6-voice" type="button" aria-label="Replay dialogue">🔊</button></div><p class="story-mission"><span></span><strong></strong></p><div class="year6-actions"><button class="btn ghost" id="year6Menu" type="button"></button><button class="btn primary" id="year6Next" type="button"></button></div></div></article>`;
    layer.querySelector('.year6-kicker').textContent=y.kicker;$('year6Title').textContent=y.title;layer.querySelector('.year6-place').textContent=y.place;layer.querySelector('.year6-body').textContent=y.body;
    $('year6Face').innerHTML=charSVG('dumbledore',52);layer.querySelector('.year6-quote strong').textContent=y.speaker;layer.querySelector('.year6-quote q').textContent=y.quote;
    layer.querySelector('.story-mission span').textContent=lang==='ko'?'기억의 임무':'MEMORY MISSION';layer.querySelector('.story-mission strong').textContent=y.mission;$('year6Menu').textContent=y.menu;$('year6Next').textContent=y.next+' →';
    layer.querySelector('.year6-voice').onclick=()=>{sTap();playVoice('story','year6',y.quote);};
  }
  function closeYear6(){stopVoice();layer.hidden=true;$('app').inert=false;$('bar').inert=false;}
  function showYear6(){
    paintYear6();layer.hidden=false;$('app').inert=true;$('bar').inert=true;setTimeout(()=>$('year6Next').focus(),30);
    $('year6Next').onclick=()=>{sTap();S.storyFlags.year6Seen=true;save();closeYear6();priorAdvanceStory(6);};
    $('year6Menu').onclick=()=>{sTap();S.storyFlags.year6Seen=true;save();closeYear6();stopPlay();renderMenu();go('s-menu',false);};
    if(S.settings?.autoVoice!==false)playVoice('story','year6',year6Text().quote);
  }
  const priorAdvanceStory=advanceStoryAfter;
  advanceStoryAfter=function(spell){ensureFlags();if(spell===6&&!S.storyFlags.year6Seen){showYear6();return;}priorAdvanceStory(spell);};

  /* Keep language-dependent surfaces fresh. */
  const priorPaint=paint;
  paint=function(){priorPaint();ensureFlags();paintMastery();if(!layer.hidden)paintYear6();};
  renderMenu();renderDiploma();
})();
