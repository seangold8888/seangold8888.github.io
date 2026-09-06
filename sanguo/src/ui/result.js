/** 전투 결과와 누적 성장 보상 화면. */
export function showResult(root, { win, heroName, enemyName, weaponName = '전용 무기', rewards = null, onRetry, onMenu }) {
  const progress = rewards?.after;
  const growthNotice = rewards ? `
        <section class="growth-summary">
          <div class="growth-title"><span>누적 성장</span><b>LV.${progress.level}</b></div>
          <div class="growth-line"><span>장수 경험치 <em>+${rewards.xp}</em></span><strong>${progress.xpNeed ? `${progress.xpCurrent} / ${progress.xpNeed}` : '최고 레벨'}</strong></div>
          <div class="growth-meter hero"><i style="transform:scaleX(${progress.xpRatio})"></i></div>
          <div class="growth-line"><span>${weaponName} <em>숙련 +${rewards.mastery}</em></span><strong>+${progress.weaponLevel - 1}</strong></div>
          <div class="growth-meter weapon"><i style="transform:scaleX(${progress.masteryRatio})"></i></div>
          ${(rewards.heroLevelUps || rewards.weaponLevelUps) ? `<div class="growth-levelup">${rewards.heroLevelUps ? `장수 레벨 +${rewards.heroLevelUps}` : ''}${rewards.heroLevelUps && rewards.weaponLevelUps ? ' · ' : ''}${rewards.weaponLevelUps ? `무기 강화 +${rewards.weaponLevelUps}` : ''}</div>` : ''}
          ${rewards.firstClear ? `<div class="growth-first-clear">첫 승리 보너스 획득</div>` : ''}
          ${rewards.newlyUnlocked?.length ? `<div class="growth-unlocks"><b>새 특성 해금</b>${rewards.newlyUnlocked.map((perk) => `<span>${perk.name} · ${perk.detail}</span>`).join('')}</div>` : ''}
        </section>` : '';
  root.innerHTML = `
    <div class="screen center">
      <div class="screen-inner stack gap-24 result-layout ${win ? 'is-win' : 'is-loss'}" style="align-items:center;">
<div class="result-seal" aria-hidden="true">${win ? '勝' : '敗'}</div>
        <div class="eyebrow result-eyebrow">${win ? '전장 제압 · 승리' : '전열 붕괴 · 패배'}</div>
        <div class="h1">${win ? `${enemyName} 격파` : `${heroName} 쓰러짐`}</div>
        <p class="result-copy">${win ? `${heroName}의 무용이 전장에 새겨졌습니다.` : '성장은 남습니다. 전열을 정비하고 다시 도전하세요.'}</p>
        ${growthNotice}
        <div class="row gap-12 result-actions">
          <button class="btn" id="btn-retry" style="max-width:220px;"><span class="btn-t">다시 도전</span><span class="btn-k">RETRY</span></button>
          <button class="btn primary" id="btn-menu" style="max-width:220px;"><span class="btn-t">전장 선택</span><span class="btn-k">CONTINUE</span></button>
        </div>
      </div>
    </div>
  `;
  root.querySelector('#btn-retry').addEventListener('click', onRetry);
  root.querySelector('#btn-menu').addEventListener('click', onMenu);
}