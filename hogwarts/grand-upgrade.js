/* GRAND UPGRADE — integrated quality, flow, settings and stability layer */
(() => {
  'use strict';

  const VERSION=5;
  const DEFAULTS={masterVol:82,musicVol:72,voiceVol:100,autoVoice:true,autoAdvance:false,haptics:true,reduceMotion:false};
  const clamp=(v,a,b)=>Math.max(a,Math.min(b,Number(v)));
  const reduceMotion=()=>Boolean(S.settings?.reduceMotion||matchMedia('(prefers-reduced-motion: reduce)').matches);

  function ensureSettings(){
    const raw=S.settings&&typeof S.settings==='object'?S.settings:{};
    S.settings={
      masterVol:clamp(raw.masterVol??DEFAULTS.masterVol,0,100),
      musicVol:clamp(raw.musicVol??DEFAULTS.musicVol,0,100),
      voiceVol:clamp(raw.voiceVol??DEFAULTS.voiceVol,0,100),
      autoVoice:raw.autoVoice!==false,
      autoAdvance:raw.autoAdvance===true,
      haptics:raw.haptics!==false,
      reduceMotion:raw.reduceMotion===true
    };
    S.saveVersion=VERSION;
    save();
  }
  ensureSettings();

  /* ---------- UI surfaces ---------- */
  const settingsButton=document.createElement('button');
  settingsButton.id='settingsBtn';settingsButton.type='button';settingsButton.textContent='⚙';
  document.getElementById('musicBtn').after(settingsButton);

  const homeResume=document.createElement('div');
  homeResume.id='homeResumeCard';homeResume.className='grand-home-resume';homeResume.hidden=true;
  document.getElementById('nameIn').after(homeResume);

  const settingsLayer=document.createElement('div');
  settingsLayer.id='settingsLayer';settingsLayer.hidden=true;settingsLayer.setAttribute('role','dialog');settingsLayer.setAttribute('aria-modal','true');settingsLayer.setAttribute('aria-labelledby','settingsTitle');
  settingsLayer.innerHTML=`<div class="settings-card" tabindex="-1">
    <div class="settings-head"><span aria-hidden="true">✦</span><h2 id="settingsTitle"></h2><button class="settings-close" id="settingsClose" type="button" aria-label="Close">×</button></div>
    <div class="settings-section"><h3 id="settingsAudioTitle"></h3>
      <div class="setting-row"><label for="masterVol" id="masterVolLabel"></label><div class="setting-range"><input id="masterVol" type="range" min="0" max="100" step="1"><output id="masterVolOut"></output></div></div>
      <div class="setting-row"><label for="musicVol" id="musicVolLabel"></label><div class="setting-range"><input id="musicVol" type="range" min="0" max="100" step="1"><output id="musicVolOut"></output></div></div>
      <div class="setting-row"><label for="voiceVol" id="voiceVolLabel"></label><div class="setting-range"><input id="voiceVol" type="range" min="0" max="100" step="1"><output id="voiceVolOut"></output></div></div>
    </div>
    <div class="settings-section"><h3 id="settingsPlayTitle"></h3>
      <div class="setting-row"><span class="setting-copy"><strong id="autoVoiceLabel"></strong><small id="autoVoiceHelp"></small></span><button class="switch" id="autoVoiceSwitch" type="button" role="switch"></button></div>
      <div class="setting-row"><span class="setting-copy"><strong id="autoAdvanceLabel"></strong><small id="autoAdvanceHelp"></small></span><button class="switch" id="autoAdvanceSwitch" type="button" role="switch"></button></div>
      <div class="setting-row"><span class="setting-copy"><strong id="hapticsLabel"></strong><small id="hapticsHelp"></small></span><button class="switch" id="hapticsSwitch" type="button" role="switch"></button></div>
      <div class="setting-row"><span class="setting-copy"><strong id="motionLabel"></strong><small id="motionHelp"></small></span><button class="switch" id="motionSwitch" type="button" role="switch"></button></div>
    </div>
    <div class="settings-actions"><button class="btn" id="fullscreenBtn" type="button"></button><button class="btn primary" id="settingsDone" type="button"></button></div>
  </div>`;
  document.body.appendChild(settingsLayer);

  const missionLayer=document.createElement('div');
  missionLayer.id='missionLayer';missionLayer.className='mission-layer';missionLayer.hidden=true;missionLayer.setAttribute('role','dialog');missionLayer.setAttribute('aria-modal','true');missionLayer.setAttribute('aria-labelledby','missionTitle');
  document.body.appendChild(missionLayer);

  const pauseSettings=document.createElement('button');
  pauseSettings.id='pauseSettings';pauseSettings.type='button';pauseSettings.className='btn ghost';
  document.getElementById('pauseResume').after(pauseSettings);

  const bossStats=document.createElement('div');
  bossStats.id='bossStats';bossStats.className='boss-result-stats';bossStats.hidden=true;
  document.getElementById('bossEpilogue').after(bossStats);

  const printButton=document.createElement('button');
  printButton.id='dipPrint';printButton.type='button';printButton.className='btn ghost';
  document.getElementById('dipAgain').after(printButton);

  /* ---------- settings ---------- */
  let settingsOpen=false,settingsFocus=null,resumeAfterSettings=false;
  const $=id=>document.getElementById(id);
  const copy=()=>lang==='ko'?{
    title:'마법 환경 설정',audio:'오디오 믹서',master:'전체 음량',music:'배경 음악',voice:'인물 음성',play:'플레이 환경',
    autoVoice:'대사 자동 재생',autoVoiceHelp:'스토리와 수업 시작 전에 인물 대사를 들려줘요.',
    autoAdvance:'다음 장 자동 이동',autoAdvanceHelp:'결과를 읽은 뒤 자동으로 다음 이야기로 이동해요.',
    haptics:'진동 피드백',hapticsHelp:'지원되는 기기에서 주문의 충격을 느껴요.',
    motion:'차분한 화면',motionHelp:'지속 애니메이션과 시차 움직임을 줄여요.',full:'전체 화면',exitFull:'전체 화면 종료',done:'설정 완료',open:'환경 설정',pause:'환경 설정 ⚙'
  }:{
    title:'Magical Settings',audio:'Audio mixer',master:'Master volume',music:'Background music',voice:'Character voices',play:'Play experience',
    autoVoice:'Automatic dialogue',autoVoiceHelp:'Play character dialogue before stories and lessons.',
    autoAdvance:'Automatic chapter advance',autoAdvanceHelp:'Move to the next story after the result is read.',
    haptics:'Haptic feedback',hapticsHelp:'Feel spell impacts on supported devices.',
    motion:'Calm motion',motionHelp:'Reduce ambient animation and parallax movement.',full:'Enter fullscreen',exitFull:'Exit fullscreen',done:'Done',open:'Settings',pause:'Settings ⚙'
  };

  function applyAudio(){
    const master=S.settings.masterVol/100,music=S.settings.musicVol/100,voice=S.settings.voiceVol/100;
    try{if(masterBus&&ac){masterBus.gain.cancelScheduledValues(ac.currentTime);masterBus.gain.setTargetAtTime(.82*master,ac.currentTime,.08);}}catch(e){}
    try{if(musicNodes&&ac){musicNodes.normal=.14*music;musicNodes.master.gain.cancelScheduledValues(ac.currentTime);musicNodes.master.gain.setTargetAtTime(musicNodes.normal,ac.currentTime,.16);}}catch(e){}
    if(voiceAudio)voiceAudio.volume=.96*voice;
  }
  function applySettings(){document.body.classList.toggle('calm-motion',S.settings.reduceMotion);applyAudio();}
  function paintSettings(){
    const c=copy();
    settingsButton.setAttribute('aria-label',c.open);pauseSettings.textContent=c.pause;
    $('settingsTitle').textContent=c.title;$('settingsAudioTitle').textContent=c.audio;$('settingsPlayTitle').textContent=c.play;
    $('masterVolLabel').textContent=c.master;$('musicVolLabel').textContent=c.music;$('voiceVolLabel').textContent=c.voice;
    $('autoVoiceLabel').textContent=c.autoVoice;$('autoVoiceHelp').textContent=c.autoVoiceHelp;
    $('autoAdvanceLabel').textContent=c.autoAdvance;$('autoAdvanceHelp').textContent=c.autoAdvanceHelp;
    $('hapticsLabel').textContent=c.haptics;$('hapticsHelp').textContent=c.hapticsHelp;
    $('motionLabel').textContent=c.motion;$('motionHelp').textContent=c.motionHelp;
    $('fullscreenBtn').textContent=document.fullscreenElement?c.exitFull:c.full;$('settingsDone').textContent=c.done;
    [['masterVol','masterVol'],['musicVol','musicVol'],['voiceVol','voiceVol']].forEach(([id,key])=>{const input=$(id),out=$(id+'Out');input.value=S.settings[key];out.value=S.settings[key]+'%';out.textContent=S.settings[key]+'%';});
    [['autoVoiceSwitch','autoVoice'],['autoAdvanceSwitch','autoAdvance'],['hapticsSwitch','haptics'],['motionSwitch','reduceMotion']].forEach(([id,key])=>$(id).setAttribute('aria-checked',String(Boolean(S.settings[key]))));
  }
  function openSettings(){
    if(settingsOpen)return;settingsOpen=true;settingsFocus=document.activeElement;resumeAfterSettings=cur==='s-play'&&!gamePaused;
    if(resumeAfterSettings)setGamePaused(true);
    paintSettings();settingsLayer.hidden=false;$('app').inert=true;$('bar').inert=true;
    setTimeout(()=>$('settingsClose').focus(),20);
  }
  function closeSettings(){
    if(!settingsOpen)return;settingsOpen=false;settingsLayer.hidden=true;
    if(resumeAfterSettings){resumeAfterSettings=false;setGamePaused(false);}
    else if(!gamePaused){$('app').inert=false;$('bar').inert=false;}
    const focus=gamePaused?$('pauseResume'):settingsFocus;settingsFocus=null;setTimeout(()=>focus?.focus?.({preventScroll:true}),0);
  }
  settingsButton.onclick=()=>{sTap();openSettings();};pauseSettings.onclick=()=>{sTap();openSettings();};
  $('settingsClose').onclick=closeSettings;$('settingsDone').onclick=()=>{sTap();closeSettings();};
  settingsLayer.addEventListener('pointerdown',e=>{if(e.target===settingsLayer)closeSettings();});
  ['masterVol','musicVol','voiceVol'].forEach(id=>$(id).addEventListener('input',e=>{S.settings[id]=Number(e.target.value);$(id+'Out').value=e.target.value+'%';$(id+'Out').textContent=e.target.value+'%';applyAudio();}));
  ['masterVol','musicVol','voiceVol'].forEach(id=>$(id).addEventListener('change',save));
  [['autoVoiceSwitch','autoVoice'],['autoAdvanceSwitch','autoAdvance'],['hapticsSwitch','haptics'],['motionSwitch','reduceMotion']].forEach(([id,key])=>$(id).onclick=()=>{S.settings[key]=!S.settings[key];save();applySettings();paintSettings();sTap();});
  $('fullscreenBtn').onclick=async()=>{try{if(document.fullscreenElement)await document.exitFullscreen();else await document.documentElement.requestFullscreen();}catch(e){}paintSettings();};
  document.addEventListener('fullscreenchange',paintSettings);
  document.addEventListener('keydown',e=>{if(e.key==='Escape'&&settingsOpen){e.preventDefault();e.stopImmediatePropagation();closeSettings();}},true);
  printButton.onclick=()=>window.print();

  /* ---------- returning-player presentation ---------- */
  function paintHomeResume(){
    const returning=Boolean(S.house&&S.wood!=null&&S.core!=null);
    homeResume.hidden=!returning;if(!returning)return;
    const next=STORY_ORDER.find(i=>!S.done[i]),done=storyDoneCount(),stars=S.stars.reduce((a,b)=>a+b,0);
    const face=S.avatar==='hermione'?'assets/characters/hermione.jpg':'assets/characters/harry.jpg';
    const house=t().houses[S.house]?.n||'',chapter=next==null?(lang==='ko'?'최종 결전':'Final battle'):storyChapter(next).title;
    homeResume.innerHTML='<img alt=""><span><strong></strong><small></small></span><b></b>';
    homeResume.querySelector('img').src=face;homeResume.querySelector('img').alt=S.name;
    homeResume.querySelector('strong').textContent=S.name+' · '+house;
    homeResume.querySelector('small').textContent=(lang==='ko'?'다음 여정 · ':'Next journey · ')+chapter;
    homeResume.querySelector('b').textContent='★ '+stars+' · '+done+'/'+STORY_ORDER.length;
    const kicker=document.querySelector('#s-home .hero-kicker');if(kicker)kicker.textContent=lang==='ko'?'호그와트 연대기 · '+(done+1)+'번째 여정':'HOGWARTS CHRONICLE · JOURNEY '+(done+1);
  }

  /* ---------- accessible screen navigation ---------- */
  function labelScreens(){
    document.querySelectorAll('.screen').forEach(screen=>{
      const heading=screen.querySelector('h1,h2,.spellword');
      screen.setAttribute('role','region');
      if(heading){if(!heading.id)heading.id=screen.id+'Title';heading.classList.add('screen-heading-focus');heading.tabIndex=-1;screen.setAttribute('aria-labelledby',heading.id);screen.removeAttribute('aria-label');}
      else screen.setAttribute('aria-label',screen.id.replace('s-',''));
    });
  }
  const coreGo=go;
  go=function(id,push=true){
    if(cur==='s-play'&&id==='s-story')push=false;
    coreGo(id,push);document.body.dataset.screen=id;labelScreens();
    if(id==='s-home')paintHomeResume();
    const screen=document.getElementById(id),heading=screen?.querySelector('h1,h2,.spellword');
    if(heading&&id!=='s-play'){const seq=navSeq;setTimeout(()=>{if(seq===navSeq)heading.focus({preventScroll:true});},105);}
  };
  document.getElementById('backBtn').onclick=()=>{
    stopPlay();
    if(mode==='versus'){mode='solo';lvOverride=null;paint();hist=[];go('s-home',false);return;}
    let p=hist.pop()||'s-home';while((p==='s-play'||p==='s-hat')&&hist.length)p=hist.pop();go(p,false);
  };

  /* ---------- chapter scenes and menu mastery ---------- */
  const coreRenderStory=renderStory;
  renderStory=function(){
    coreRenderStory();if(storyTarget==null)return;
    const final=storyTarget==='final',idx=final?8:Math.max(0,storyIndex(storyTarget));
    const positions=[[0,0],[50,0],[100,0],[0,50],[50,50],[100,50],[0,100],[50,100],[100,100]],scene=document.querySelector('.story-scene');
    if(scene){scene.style.setProperty('--scene-x',positions[idx][0]+'%');scene.style.setProperty('--scene-y',positions[idx][1]+'%');}
    document.getElementById('s-story').dataset.scene=String(idx+1);
  };
  const coreRenderMenu=renderMenu;
  renderMenu=function(){
    coreRenderMenu();const next=STORY_ORDER.find(i=>!S.done[i]);
    document.querySelectorAll('#s-menu [data-spell]').forEach(b=>{const i=Number(b.dataset.spell),earned=S.levelStars[S.level][i]||0;b.style.setProperty('--mastery',Math.round(earned/3*100)+'%');b.classList.toggle('recommended',i===next);});
  };

  /* ---------- fair mission briefing ---------- */
  const coreStartSpell=startSpell;
  function closeMission(){missionLayer.hidden=true;$('app').inert=false;$('bar').inert=false;stopVoice();}
  function missionCopy(i){
    const best=S.levelBest[S.level][i],teacher=TEACHER[i];
    return {teacher,best:Number.isFinite(best)?best.toFixed(1)+'s':(lang==='ko'?'첫 도전':'First try'),objective:t()['hint'+i],control:COACH[lang][i]};
  }
  function showMission(i){
    const m=missionCopy(i),name=spellNames()[i];
    missionLayer.innerHTML=`<div class="mission-card" tabindex="-1"><button class="settings-close" id="missionCancel" type="button" aria-label="Close">×</button><div class="mission-kicker"></div><h2 class="mission-title" id="missionTitle"></h2><div class="mission-teacher"><span id="missionFace"></span><div><strong id="missionTeacher"></strong><span id="missionLine"></span></div></div><div class="mission-objective"><div><small id="missionObjectiveLabel"></small><b id="missionObjective"></b></div><div><small id="missionBestLabel"></small><b id="missionBest"></b></div></div><button class="btn primary big mission-start" id="missionStart" type="button"></button></div>`;
    missionLayer.querySelector('.mission-kicker').textContent=lang==='ko'?'새로운 수업 · '+(storyIndex(i)+1)+'장':'NEW LESSON · CHAPTER '+(storyIndex(i)+1);
    $('missionTitle').textContent=name;$('missionFace').innerHTML=charSVG(m.teacher,58);$('missionTeacher').textContent=t().chars[m.teacher];$('missionLine').textContent=t().teach[i];
    $('missionObjectiveLabel').textContent=lang==='ko'?'이번 목표':'MISSION';$('missionObjective').textContent=m.objective+' · '+m.control;
    $('missionBestLabel').textContent=lang==='ko'?'현재 기록':'CURRENT BEST';$('missionBest').textContent=m.best;
    $('missionStart').textContent=lang==='ko'?'준비 완료 · 시작하기':'Ready · Begin';
    missionLayer.hidden=false;$('app').inert=true;$('bar').inert=true;setTimeout(()=>$('missionStart').focus(),30);
    $('missionCancel').onclick=closeMission;
    $('missionStart').onclick=()=>{sTap();closeMission();window.guSkipSpellVoice=true;coreStartSpell(i);setTimeout(()=>{window.guSkipSpellVoice=false;},900);};
    if(S.settings.autoVoice)playVoice('spell',i,t().teach[i]+' '+name);
  }
  startSpell=function(i){
    if(mode==='versus'||cur==='s-play')return coreStartSpell(i);
    if(!Number.isInteger(i)||i<0||i>=SPELLS)return;showMission(i);
  };

  /* ---------- results that explain the score ---------- */
  const coreLocalizeResult=localizeResultPanel;
  localizeResultPanel=function(box){
    coreLocalizeResult(box);const auto=box.querySelector('.result-auto');if(!auto)return;
    auto.classList.toggle('manual',!S.settings.autoAdvance);
    if(!S.settings.autoAdvance){const span=auto.querySelector('span');if(span)span.textContent=lang==='ko'?'준비되면 다음 장을 선택하세요':'Choose the next chapter when ready';}
  };
  const coreShowStars=showStars;
  showStars=function(n,best,secs,timeBest,record,penalty=0,achievementIndices=[],resultDelay=8000,spellIndex=curSpell){
    coreShowStars(n,best,secs,timeBest,record,penalty,achievementIndices,resultDelay,spellIndex);
    const box=stage.querySelector('.starPop');if(!box||box.querySelector('.result-breakdown'))return;
    const diff=t().lvs[lvIdx()]?.n||'',breakdown=document.createElement('div');breakdown.className='result-breakdown';
    breakdown.innerHTML='<div><small>'+(lang==='ko'?'완료 기록':'TIME')+'</small><b>'+Number(secs).toFixed(1)+'s</b></div><div><small>'+(lang==='ko'?'실수 패널티':'PENALTY')+'</small><b>+'+Number(penalty).toFixed(1)+'s</b></div><div><small>'+(lang==='ko'?'도전 단계':'LEVEL')+'</small><b></b></div>';
    breakdown.querySelector('div:last-child b').textContent=diff;const meta=box.querySelector('.result-meta');meta?.after(breakdown);localizeResultPanel(box);
  };
  const coreScheduleResult=scheduleResultReturn;
  scheduleResultReturn=function(fn,ms){if(S.settings.autoAdvance)coreScheduleResult(fn,ms);else clearResultReturn();};

  /* ---------- pause-safe delayed gameplay ---------- */
  playDelay=function(fn,ms){
    const token=playToken;
    const run=()=>{if(token!==playToken)return;if(gamePaused){setTimeout(run,80);return;}fn();};
    return setTimeout(run,ms);
  };
  const coreResumeResult=resumeResultReturn;
  resumeResultReturn=function(){if(!gamePaused)coreResumeResult();};
  const coreFallbackSpeak=fallbackSpeak;
  fallbackSpeak=function(text){stopVoice();coreFallbackSpeak(text);};
  const corePlayVoice=playVoice;
  playVoice=function(...args){corePlayVoice(...args);if(voiceAudio)voiceAudio.volume=.96*(S.settings.voiceVol/100);};
  const coreMusicOn=musicOn;
  musicOn=function(){coreMusicOn();applyAudio();};

  /* ---------- boss state fix and match report ---------- */
  let lastBossStats=null;
  const coreBossRound0=bossRound0;
  bossRound0=function(){coreBossRound0();if(B){B.guStarted=Date.now();B.guAttempts=1;B.guHits=0;B.guMisses=0;B.guBestCombo=0;}};
  const coreNextRound=nextRound;
  nextRound=function(){if(B&&(B.status==='miss'||B.status==='shield'))B.round=Math.max(0,B.round-1);coreNextRound();if(B)B.guAttempts++;};
  const coreBossCast=bossCast;
  bossCast=function(){coreBossCast();if(B){B.guHits++;B.guBestCombo=Math.max(B.guBestCombo,B.combo+(B.shield?3:0));}};
  const coreBossStrike=bossStrike;
  bossStrike=function(){const shielded=Boolean(B?.shield);coreBossStrike();if(B&&!shielded)B.guMisses++;};
  const coreBossEnd=bossEnd;
  bossEnd=function(won){
    if(B){lastBossStats={won,secs:Math.max(0,(Date.now()-B.guStarted)/1000),hp:B.hpMe,hits:B.guHits,misses:B.guMisses,combo:B.guBestCombo,attempts:B.guAttempts};if(won){const old=S.bossBest&&Number(S.bossBest.secs);if(!Number.isFinite(old)||lastBossStats.secs<old)S.bossBest={...lastBossStats};save();}}
    coreBossEnd(won);paintBossStats();
  };
  function paintBossStats(){
    bossStats.hidden=!lastBossStats;if(!lastBossStats)return;const s=lastBossStats;
    const labels=lang==='ko'?['완료 시간','남은 체력','명중 / 피격','최고 연속']:['BATTLE TIME','HP LEFT','HIT / TAKEN','BEST COMBO'];
    const values=[s.secs.toFixed(1)+'s',s.hp+' / '+BOSS.hp,s.hits+' / '+s.misses,'×'+s.combo];
    bossStats.innerHTML=values.map((v,i)=>'<div><b>'+v+'</b><small>'+labels[i]+'</small></div>').join('');
  }
  const coreRenderBossResult=renderBossResult;
  renderBossResult=function(){coreRenderBossResult();paintBossStats();};
  const coreBossBars=bossBars;
  bossBars=function(){coreBossBars();if(!B)return;const me=$('hpMe')?.parentElement,foe=$('hpFoe')?.parentElement;if(me){me.setAttribute('role','progressbar');me.setAttribute('aria-valuemin','0');me.setAttribute('aria-valuemax',String(BOSS.hp));me.setAttribute('aria-valuenow',String(B.hpMe));}if(foe){foe.setAttribute('role','progressbar');foe.setAttribute('aria-valuemin','0');foe.setAttribute('aria-valuemax',String(BOSS.rounds));foe.setAttribute('aria-valuenow',String(B.hpFoe));}};

  /* ---------- repaint hooks ---------- */
  const corePaint=paint;
  paint=function(){corePaint();ensureSettings();paintSettings();applySettings();paintHomeResume();labelScreens();if(lastBossStats)paintBossStats();printButton.textContent=lang==='ko'?'졸업장 인쇄 · PDF 저장':'Print diploma · Save PDF';};
  const coreReset=document.getElementById('resetBtn').onclick;
  document.getElementById('resetBtn').onclick=function(e){coreReset.call(this,e);setTimeout(()=>{ensureSettings();paintSettings();paintHomeResume();},0);};

  applySettings();paintSettings();paintHomeResume();labelScreens();renderMenu();
  printButton.textContent=lang==='ko'?'졸업장 인쇄 · PDF 저장':'Print diploma · Save PDF';
})();
