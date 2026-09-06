import { loadData } from './data.js';
import { startSideBattle } from './game/sideScroller.js';
import { showTitle } from './ui/title.js';
import { showStoryIntro } from './ui/storyIntro.js';
import { showWorkSelect } from './ui/workSelect.js';

const boot = document.getElementById('boot');
const uiRoot = document.getElementById('ui');

async function loadUiFonts() {
  if (!document.fonts?.load) return;
  let timeout = 0;
  try {
    const requests = [
      document.fonts.load('400 24px "Gowun Batang"', '삼국지·서유기·수호지 별빛 연대기'),
      document.fonts.load('700 24px "Gowun Batang"', '관우 장비 필살기'),
      document.fonts.load('400 16px "Pretendard Variable"', '전투 목표 아이템'),
      document.fonts.load('900 18px "Pretendard Variable"', '필살 무쌍 GO'),
    ];
    await Promise.race([
      Promise.all(requests).then(() => document.fonts.ready),
      new Promise((resolve) => { timeout = setTimeout(resolve, 2500); }),
    ]);
  } catch (error) {
    console.warn('로컬 글꼴을 불러오지 못해 시스템 글꼴로 진행합니다.', error);
  } finally {
    clearTimeout(timeout);
  }
}

async function main() {
  await Promise.all([loadData(), loadUiFonts()]);
  boot?.remove();

  const openTitle = () => showTitle(uiRoot, {
    onStart: (heroId) => openStory(heroId, 'hulao', openTitle),
    onBrowse: openBrowse,
  });

  // 메인 화면 = 삼국지·서유기·수호지 작품 선택. 옛 삼국지 전용 타이틀은 사용하지 않는다.
  const openBrowse = () => showWorkSelect(uiRoot, {
    onConfirm: (heroId, stageKey) => openStory(heroId, stageKey, openBrowse),
    onBack: null,
  });

  const openStory = (heroId, stageKey, back) => showStoryIntro(uiRoot, {
    heroId,
    stageKey,
    onBack: back,
    onBegin: (selectedHero) => {
      const launchBattle = () => {
        uiRoot.innerHTML = '';
        startSideBattle(selectedHero, stageKey, { onExit: back }).catch((error) => {
          console.error(error);
          uiRoot.innerHTML = '';
          const panel = document.createElement('section');
          panel.className = 'screen battle-load-error';
          const title = document.createElement('h1'); title.textContent = '전투 자산을 불러오지 못했습니다';
          const detail = document.createElement('p'); detail.textContent = error?.message || '알 수 없는 오류';
          const actions = document.createElement('div'); actions.className = 'actions';
          const retry = document.createElement('button'); retry.type = 'button'; retry.className = 'btn primary'; retry.textContent = '다시 불러오기'; retry.addEventListener('click', launchBattle);
          const menu = document.createElement('button'); menu.type = 'button'; menu.className = 'btn'; menu.textContent = '출진 화면으로'; menu.addEventListener('click', back);
          actions.append(retry, menu); panel.append(title, detail, actions); uiRoot.appendChild(panel);
        });
      };
      launchBattle();
    },
  });

  void openTitle; // 이전 진입 화면(삼국지 3영웅)은 보존만 해 둔다.
  openBrowse();
}

main().catch((err) => {
  console.error(err);
  if (boot) boot.querySelector('.boot-note').textContent = `오류: ${err.message}`;
});
