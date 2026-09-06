import { chapters, person, signature, stage, stats } from '../data.js';
import { workPerson, workStats, workStage, workWeapon } from '../data/works.js';
import { getHeroProgress, nextPerk, weaponEnhanceText } from '../game/progression.js';

function growthBrief(heroId, weaponName) {
  const progress = getHeroProgress(heroId);
  const next = nextPerk(progress);
  return `<div class="story-growth"><b>LV.${progress.level}</b><span>${weaponName} ${weaponEnhanceText(progress)}</span>${next ? `<small>다음 해금 · ${next.name}</small>` : '<small>모든 성장 기술 해금</small>'}</div>`;
}

/** 서유기·수호지 전장용 이야기 화면. 삼국지와 같은 뼈대(도입 → 인물 →
 *  장면 → 실제와 이야기 비교)를 쓰되 데이터 출처만 다르다. */
function renderWorkIntro(root, heroId, stageKey, { onBegin, onBack }) {
  const info = workStage(stageKey);
  const hero = workPerson(heroId) || person(heroId);
  const combat = workStats(heroId) || stats(heroId);
  const weaponName = workWeapon(heroId)?.name || signature(heroId).name;
  root.innerHTML = `
    <div class="screen story-screen"><div class="screen-inner story-layout">
      <div class="story-year">${info.year}</div><div class="story-symbol">${combat.symbol || '⚔'}</div>
      <h1>${info.title}</h1><p class="story-opening">${info.scene_intro}</p>
      <div class="story-panels">
        <section class="story-panel hero-brief"><span class="story-label">출전 인물</span>
          <h2>${hero.name} <small>${weaponName}</small></h2><p>${hero.bio}</p>
          <div class="story-special">${combat.symbol || ''} ${combat.special} · ${combat.style}</div>${growthBrief(heroId, weaponName)}</section>
        <section class="story-panel"><span class="story-label">이 장면</span>
          <h2>${info.title.split(' · ').slice(-1)[0]}</h2><p>${info.lesson}</p>
          <div class="story-mission"><b>임무</b> ${info.mission}</div></section>
      </div>
      <section class="record-card"><span class="story-label">실제와 이야기</span><h3>어디까지가 사실일까?</h3>
        <div class="record-grid"><p><b>실제 역사</b>${info.real}</p><p><b>이야기 속에서는</b>${info.fiction}</p></div></section>
      <div class="story-actions"><button class="btn" id="story-back"><span class="btn-t">다시 선택</span></button><button class="btn primary" id="story-begin"><span class="btn-t">${hero.name} 출진 · 전투 시작</span><span class="btn-k">ENTER</span></button></div>
    </div></div>`;
  wire(root, heroId, onBegin, onBack);
}

function wire(root, heroId, onBegin, onBack) {
  let active = true;
  const cleanup = () => {
    if (!active) return;
    active = false;
    removeEventListener('keydown', key);
  };
  const requestBattleImmersion = () => {
    const target = document.documentElement;
    if (document.fullscreenElement || typeof target.requestFullscreen !== 'function') return;
    try {
      const entering = target.requestFullscreen({ navigationUI: 'hide' });
      Promise.resolve(entering).then(() => {
        if (screen.orientation?.lock) return screen.orientation.lock('landscape').catch(() => {});
        return undefined;
      }).catch(() => {});
    } catch {
      // iPad Safari 등 전체화면 API가 없는 환경은 일반 가로 화면으로 계속한다.
    }
  };
  const begin = (event) => {
    if (event?.type === 'click') requestBattleImmersion();
    cleanup();
    onBegin(heroId);
  };
  const back = () => { cleanup(); onBack(); };
  const key = (event) => {
    if (event.code === 'Enter') begin(event);
    if (event.code === 'Escape') back();
  };
  root.querySelector('#story-back').addEventListener('click', back);
  root.querySelector('#story-begin').addEventListener('click', begin);
  addEventListener('keydown', key);
}

export function showStoryIntro(root, { heroId = 'guanyu', stageKey = 'hulao', onBegin, onBack }) {
  if (workStage(stageKey)) return renderWorkIntro(root, heroId, stageKey, { onBegin, onBack });
  // 호로관 외 삼국지 전장 — 원본 데이터의 임무·교훈으로 같은 뼈대를 채운다.
  if (stageKey !== 'hulao') {
    const s = stage(stageKey), hero = person(heroId), combat = stats(heroId);
    root.innerHTML = `
      <div class="screen story-screen"><div class="screen-inner story-layout">
        <div class="story-year">${s.year}</div><div class="story-symbol">${combat.symbol || '⚔'}</div>
        <h1>${s.title}</h1><p class="story-opening">${s.mission || ''}</p>
        <div class="story-panels">
          <section class="story-panel hero-brief"><span class="story-label">출전 장수</span>
            <h2>${hero.name} <small>${signature(heroId).name}</small></h2><p>${hero.bio}</p>
            <div class="story-special">${combat.symbol} ${combat.special} · ${combat.style}</div>${growthBrief(heroId, signature(heroId).name)}</section>
          <section class="story-panel"><span class="story-label">이 전장</span>
            <h2>${s.bossName || ''}</h2><p>${s.lesson || ''}</p>
            <div class="story-mission"><b>임무</b> ${s.mission || ''}</div></section>
        </div>
        ${s.midTip ? `<section class="record-card"><span class="story-label">알아두기</span><h3>${s.title.split(' · ')[0]}</h3><div class="record-grid"><p>${s.midTip}</p></div></section>` : ''}
        <div class="story-actions"><button class="btn" id="story-back"><span class="btn-t">다시 선택</span></button><button class="btn primary" id="story-begin"><span class="btn-t">${hero.name} 출진 · 전투 시작</span><span class="btn-k">ENTER</span></button></div>
      </div></div>`;
    return wire(root, heroId, onBegin, onBack);
  }

  const chapter = chapters().find((item) => item.id === 'hulao');
  const battlefield = stage('hulao');
  const hero = person(heroId), combat = stats(heroId);
  const opening = chapter.events.find((event) => event.type === 'story');
  const warmWine = chapter.events.find((event) => event.type === 'story' && event.text?.includes('온주참화웅'));
  const threeHeroes = chapter.events.find((event) => event.type === 'story' && event.text?.includes('삼영전여포'));
  const scene = heroId === 'guanyu' ? warmWine : threeHeroes;
  const fact = heroId === 'guanyu' ? chapter.events.find((event) => event.type === 'fact' && event.title.includes('화웅')) : chapter.events.find((event) => event.type === 'fact' && event.title.includes('삼영전여포'));
  root.innerHTML = `
    <div class="screen story-screen"><div class="screen-inner story-layout">
      <div class="story-year">${chapter.year} · 제2장</div><div class="story-symbol">${chapter.symbol}</div><h1>${chapter.title}</h1><p class="story-opening">${opening.text}</p>
      <div class="story-panels"><section class="story-panel hero-brief"><span class="story-label">출전 장수</span><h2>${hero.name} <small>${signature(heroId).name}</small></h2><p>${hero.bio}</p><div class="story-special">${combat.symbol} ${combat.special} · ${combat.style}</div>${growthBrief(heroId, signature(heroId).name)}</section>
      <section class="story-panel"><span class="story-label">${scene.badge}</span><h2>${battlefield.title}</h2><p>${scene.text}</p><div class="story-mission"><b>임무</b> ${battlefield.mission}</div></section></div>
      <section class="record-card"><span class="story-label">정사와 연의</span><h3>${fact.title}</h3><div class="record-grid"><p><b>역사 기록</b>${fact.history}</p><p><b>삼국지연의</b>${fact.novel}</p></div></section>
      <div class="story-actions"><button class="btn" id="story-back"><span class="btn-t">장수 다시 선택</span></button><button class="btn primary" id="story-begin"><span class="btn-t">${hero.name} 출진 · 전투 시작</span><span class="btn-k">ENTER</span></button></div>
    </div></div>`;
  wire(root, heroId, onBegin, onBack);
}
