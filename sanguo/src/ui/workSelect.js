import { WORKS, WORK_STAGES, WORK_PEOPLE, WORK_STATS, WORK_WEAPONS, stagesOfWork } from '../data/works.js';
import { person, stats, signature, stage, stageKeys, stageHeroes } from '../data.js';
import { difficultyLevels, getDifficulty, setDifficulty } from '../game/difficulty.js';
import { getCombatGrowth, getHeroProgress, nextPerk, weaponEnhanceText } from '../game/progression.js';
import { heroHasArt } from '../game/sideScroller.js';
import { dashSkill } from '../game/dashSkills.js';

const sheets = {guanyu:'guanyu-painted-sheet-v4',tieshangongzhu:'tieshangongzhu-painted-sheet-v2'};
const portraitFor = id => 'art/side-scroller/' + (sheets[id] || id + '-painted-sheet-v1') + '.png';
const infoFor = id => WORK_PEOPLE[id]
  ? {p:WORK_PEOPLE[id],s:WORK_STATS[id],w:WORK_WEAPONS[WORK_PEOPLE[id].weapon]?.name}
  : {p:person(id),s:stats(id),w:signature(id).name};
const shortTitle = title => title.split(' · ')[0];
const heroesFor = (work,key) => work === 'sanguo'
  ? [...new Set([...stageHeroes(key),...(key === 'redcliff' ? ['sunshangxiang'] : [])])]
  : WORK_STAGES[key]?.heroes || [];
// Returning from a briefing retains the user's choice without touching saved progression.
let remembered = {work:'sanguo',stageKey:'hulao',heroId:'guanyu'};

export function showWorkSelect(root,{onConfirm,onBack}) {
  let {work,stageKey,heroId} = remembered;
  let pickerOpen = false;
  const list = () => work === 'sanguo'
    ? stageKeys().map(key=>({key,...stage(key)}))
    : stagesOfWork(work).map(key=>({key,...WORK_STAGES[key]}));

  function render(focus='') {
    const priorScroll = root.querySelector('.command-menu')?.scrollTop || 0;
    const stages=list();
    if(!stages.some(s=>s.key===stageKey))stageKey=stages[0].key;
    const selected=stages.find(s=>s.key===stageKey);
    const heroes=heroesFor(work,stageKey);
    if(!heroes.includes(heroId) || !heroHasArt(heroId)) heroId=heroes.find(heroHasArt) || '';
    remembered={work,stageKey,heroId};
    const hero=heroId ? infoFor(heroId) : null;
    const progress=heroId ? getHeroProgress(heroId) : null;
    const growth=heroId ? getCombatGrowth(heroId) : null;
    const upcoming=heroId ? nextPerk(progress) : null;
    const difficulty=getDifficulty();
    const readyStages=stages.filter(s=>heroesFor(work,s.key).some(heroHasArt)).length;
    const info=WORK_STAGES[stageKey];
    const mission=selected.mission || info?.scene_intro || '';
    root.innerHTML=`
      <div class="screen command-menu"><main class="cm-shell">
        <header class="cm-header">
          <div><div class="cm-eyebrow">별빛 연대기 · 출진 준비</div><h1>${WORKS[work]?.name || '삼국지'}</h1><p>전장을 고르고, 함께할 장수를 선택하세요.</p></div>
          <nav class="cm-worlds" aria-label="고전 선택">${Object.values(WORKS).map(w=>`<button type="button" data-work="${w.id}" aria-pressed="${w.id===work}" ${w.ready?'':'disabled'}>${w.name}${w.ready?'':' · 준비 중'}</button>`).join('')}</nav>
        </header>

        <div class="cm-columns">
          <section class="cm-panel cm-battlefields" aria-labelledby="cm-stage-heading">
            <div class="cm-section-heading"><h2 id="cm-stage-heading"><span>01</span> 전장 선택</h2><small>${readyStages}개 출전 가능</small></div>
            <button type="button" class="cm-stage-toggle" aria-expanded="${pickerOpen}" aria-controls="cm-stage-grid"><span><small>선택한 전장</small><b>${shortTitle(selected.title)}</b></span><span>변경 ${pickerOpen?'−':'＋'}</span></button>
            <div class="cm-stages" id="cm-stage-grid" data-open="${pickerOpen}">${stages.map((s,i)=>{
              const ready=heroesFor(work,s.key).some(heroHasArt);
              return `<button type="button" class="cm-stage ${ready?'':'coming'}" data-stage="${s.key}" aria-pressed="${s.key===stageKey}"><span class="cm-stage-number">${String(i+1).padStart(2,'0')}</span><span><b>${shortTitle(s.title)}</b><small>${ready ? s.year || '고전 속 전장' : '장수 원화 준비 중'}</small></span><span class="cm-stage-mark" aria-hidden="true">${s.key===stageKey?'✓':ready?'':'…'}</span></button>`;
            }).join('')}</div>
            <p class="cm-map-note">번호순으로 이어지는 이야기 · 전장을 고르면 출전 장수가 보여요.</p>
          </section>

          <section class="cm-panel cm-deployment" aria-labelledby="cm-hero-heading">
            <div class="cm-stage-brief ${stageKey==='hulao'?'painted':''}"><div class="cm-eyebrow">${selected.year || '고전 속 이야기'} · 선택한 전장</div><h2>${selected.title}</h2><p>적장 · ${selected.bossName || selected.boss || '전장의 적장'}</p></div>
            <div class="cm-section-heading"><h2 id="cm-hero-heading"><span>02</span> 장수 선택</h2><small>${heroes.filter(heroHasArt).length}명 출전 가능</small></div>
            <div class="cm-heroes" id="hero-grid">${heroes.map(id=>{
              const {p,s}=infoFor(id), ready=heroHasArt(id), level=getHeroProgress(id).level;
              return `<button type="button" class="cm-hero ${ready?'':'coming'}" data-hero="${id}" aria-pressed="${id===heroId}" ${ready?'':'disabled'}>
                ${ready?`<span class="cm-portrait" style="background-image:url('${portraitFor(id)}')" role="img" aria-label="${p.name}"></span>`:`<span class="cm-portrait cm-placeholder">${s?.sigil || p.name.slice(0,1)}</span>`}
                <span class="cm-hero-check" aria-hidden="true">${id===heroId?'✓':''}</span><span class="cm-hero-name"><b>${p.name}</b><small>${ready?'LV.'+level:'준비 중'}</small></span>
                <span class="cm-hero-role">${s?.style || '고유 무예'}</span>
                <span class="cm-hero-skill">${ready?dashSkill(id).name:'전용 원화 준비 중'}</span></button>`;
            }).join('')}</div>
            ${!hero?'<p class="cm-unavailable" role="status">이 전장은 장수 원화 준비 중입니다. 다른 전장을 선택해 주세요.</p>':''}
            <div class="cm-difficulty"><div class="cm-section-heading"><h2><span>03</span> 난이도</h2></div><div class="cm-difficulties" aria-label="난이도 선택">${difficultyLevels().map(d=>`<button type="button" data-diff="${d.id}" aria-pressed="${d.id===difficulty.id}" title="${d.sub}"><b>${d.name}</b><small>${{easy:'편하게',normal:'균형 있게',hard:'도전적으로'}[d.id] || d.sub}</small></button>`).join('')}</div></div>
            <details class="cm-details"><summary>임무 · 성장 · 기술 자세히</summary><div><p><b>이번 임무</b> ${mission}</p>${hero?`<p><b>${hero.p.name}</b> ${hero.w} ${weaponEnhanceText(progress)} · 체력 ${hero.s.hp} · 공격 ${hero.s.power} · 사거리 ${hero.s.range}</p><p><b>돌진기</b> ${dashSkill(heroId).name} — ${dashSkill(heroId).tip}</p><p><b>누적 성장</b> 체력 +${Math.round((growth.hp-1)*100)}% · 공격 +${Math.round((growth.power-1)*100)}%</p>${upcoming?`<p><b>다음 성장</b> ${upcoming.name}</p>`:''}`:''}<p>${info?.real || selected.lesson || ''}</p>${info?.fiction?`<p>${info.fiction}</p>`:''}</div></details>
          </section>
        </div>
        <footer class="cm-launchbar">
          <div class="cm-selection" aria-live="polite"><small>출진할 준비</small><strong>${shortTitle(selected.title)} <span>／</span> ${hero?.p.name || '장수 준비 중'}</strong><span>${difficulty.name} 난이도 · 다음 화면에서 이야기 확인</span></div>
          <button type="button" class="cm-launch" id="menu-deploy" ${hero?'':'disabled'}>${hero?hero.p.name+'로 출진':'다른 전장을 선택하세요'} <span aria-hidden="true">→</span></button>
        </footer>
        ${onBack?'<button type="button" class="cm-back" id="btn-back">← 처음 화면으로</button>':''}
      </main></div>`;
    const screen=root.querySelector('.command-menu');screen.scrollTop=priorScroll;
    if(focus)root.querySelector(focus)?.focus({preventScroll:true});
    root.querySelectorAll('[data-work]').forEach(b=>b.addEventListener('click',()=>{
      work=b.dataset.work;stageKey=work==='sanguo'?'hulao':stagesOfWork(work)[0];heroId='';pickerOpen=false;render('[data-work="'+work+'"]');
    }));
    root.querySelector('.cm-stage-toggle').addEventListener('click',()=>{pickerOpen=!pickerOpen;render('.cm-stage-toggle');});
    root.querySelectorAll('[data-stage]').forEach(b=>b.addEventListener('click',()=>{
      stageKey=b.dataset.stage;pickerOpen=false;
      render(matchMedia('(max-width: 680px)').matches?'.cm-stage-toggle':'[data-stage="'+stageKey+'"]');
    }));
    root.querySelectorAll('[data-hero]:not(:disabled)').forEach(b=>b.addEventListener('click',()=>{heroId=b.dataset.hero;render('[data-hero="'+heroId+'"]');}));
    root.querySelectorAll('[data-diff]').forEach(b=>b.addEventListener('click',()=>{setDifficulty(b.dataset.diff);render('[data-diff="'+b.dataset.diff+'"]');}));
    root.querySelector('#menu-deploy').addEventListener('click',()=>{if(heroId&&heroHasArt(heroId))onConfirm(heroId,stageKey);});
    root.querySelector('#btn-back')?.addEventListener('click',()=>onBack?.());
  }
  render();
}
