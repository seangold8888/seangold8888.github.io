import { person, signature, stats } from '../data.js';
import { WORKS } from '../data/works.js';
import { getHeroProgress, nextPerk, weaponEnhanceText } from '../game/progression.js';

const HEROES = ['liubei', 'guanyu', 'zhangfei'];
const PORTRAITS = {
  liubei: 'art/side-scroller/liubei-painted-sheet-v1.png',
  guanyu: 'art/side-scroller/guanyu-painted-sheet-v4.png',
  zhangfei: 'art/side-scroller/zhangfei-painted-sheet-v1.png',
};

export function showTitle(root, { onStart, onBrowse }) {
  let selected = 'guanyu';
  const render = () => {
    const hero = person(selected), combat = stats(selected), weapon = signature(selected);
    const progress = getHeroProgress(selected), upcoming = nextPerk(progress);
    root.innerHTML = `
      <div class="screen side-title"><div class="screen-inner hero-title-layout">
        <header class="hero-title-head"><div class="eyebrow">동양 고전 액션 · 삼국지 · 서유기 · 수호지</div><div class="h1">세 영웅 출진</div><div class="sub">장수를 선택하면 인물별 무기·궁술·승마 전투와 호로관 이야기가 시작됩니다.</div></header>
        <div class="hero-select" role="list" aria-label="출전 장수 선택">
          ${HEROES.map((id) => { const p = person(id), s = stats(id); return `<button class="hero-card ${id === selected ? 'on' : ''}" data-hero="${id}" role="listitem"><span class="hero-card-art" style="background-image:url('${PORTRAITS[id]}')"></span><span class="hero-card-copy"><b>${p.name}</b><small>${signature(id).name} · ${s.style}</small></span><span class="hero-sigil">${s.sigil}</span></button>`; }).join('')}
        </div>
        <section class="hero-focus">
          <div class="hero-focus-art" style="background-image:url('${PORTRAITS[selected]}')" aria-label="${hero.name} 전신 일러스트"></div>
          <div class="hero-focus-copy"><span class="hero-kicker">${combat.symbol} ${hero.faction} · ${combat.style}</span><h2>${hero.name}</h2><p>${hero.bio}</p>
            <div class="title-growth" aria-label="장수 성장 정보"><strong>LV.${progress.level}</strong><span>${weapon.name} ${weaponEnhanceText(progress)}</span><small>${upcoming ? `다음 해금 · ${upcoming.name}` : '모든 성장 특성 해금'}</small></div>
            <div class="hero-metrics"><span>체력 <b>${combat.hp}</b></span><span>공격 <b>${combat.power}</b></span><span>기동 <b>${combat.speed}</b></span><span>사거리 <b>${combat.range}</b></span></div>
            <div class="hero-tech"><b>${weapon.name}</b><span>필살기 · ${combat.special}</span></div>
            <div class="title-controls" aria-label="전투 조작법"><span><kbd>WASD</kbd> 이동</span><span><kbd>J</kbd> 공격 · 꾹 강공</span><span><kbd>K</kbd> 활</span><span><kbd>L</kbd> 필살기</span><span><kbd>I</kbd> 돌진기</span><span><kbd>F</kbd> 승마</span></div>
            <button class="btn primary hero-start" id="btn-start"><span class="btn-t">${hero.name}로 호로관 출진</span><span class="btn-k">STORY → BATTLE</span></button>
            <button class="btn hero-start" id="btn-browse" style="margin-top:8px"><span class="btn-t">다른 고전 둘러보기</span><span class="btn-k">${Object.values(WORKS).map((w) => w.name).join(' · ')}</span></button>
            <details class="audio-credits"><summary>음원 크레딧 · 라이선스</summary><p>“Pig grunt” by erdie, via Freesound/Wikimedia Commons, <a href="https://creativecommons.org/licenses/by/3.0/" target="_blank" rel="noreferrer">CC BY 3.0</a>; 게임용으로 수정. 말 울음 “Wiehern.ogg” by Hü는 퍼블릭 도메인. <a href="audio/mount-sfx/LICENSES.md" target="_blank" rel="noreferrer">전체 고지</a></p></details>
          </div>
        </section>
      </div></div>`;
    root.querySelectorAll('[data-hero]').forEach((button) => button.addEventListener('click', () => { selected = button.dataset.hero; render(); }));
    root.querySelector('#btn-start').addEventListener('click', () => onStart(selected));
    root.querySelector('#btn-browse').addEventListener('click', () => onBrowse?.());
  };
  render();
}
