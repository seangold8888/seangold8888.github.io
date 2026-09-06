/** 전투 HUD: 체력·무쌍·콤보·격파·목표·조작 안내. */
export function createHudRoot() {
  const root = document.createElement('div'); root.id = 'hud';
  document.getElementById('ui').appendChild(root); return root;
}

export function createEnemyHud(hudRoot, name) {
  const el = document.createElement('div'); el.className = 'corner tc boss-hud';
  el.innerHTML = `<div class="eyebrow">적 총대장</div><div class="hud-name">${name}</div><div class="boss-weapon" id="boss-weapon"></div><div class="bar boss"><i></i></div><div class="boss-phase" id="boss-phase">결전 대기</div>`;
  hudRoot.appendChild(el); const bar = el.querySelector('.bar > i'), nameEl = el.querySelector('.hud-name'), weaponEl = el.querySelector('#boss-weapon'), phaseEl = el.querySelector('#boss-phase');
  return {
    setHp: (r) => { bar.style.transform = `scaleX(${Math.max(0, Math.min(1, r))})`; },
    // 파마다 다른 지휘관이 나오므로 이름표도 바뀌어야 한다.
    setName: (v) => { if (v) nameEl.textContent = v; },
    setWeapon: (v) => { weaponEl.textContent = v ? `무기 · ${v}` : ''; },
    setPhase: (v, hot = false) => { phaseEl.textContent = v || ''; phaseEl.classList.toggle('hot', !!hot); },
    show: (v) => el.classList.toggle('visible', v),
    remove: () => el.remove(),
  };
}

export function createPlayerHud(hudRoot, name, progress = null) {
  const el = document.createElement('div'); el.className = 'battle-ui';
  const progressText = progress ? `<div class="progress-readout" id="progress-readout"><b>LV.${progress.level}</b><span>${progress.weapon}</span></div>` : '';
  el.innerHTML = `
    <div class="corner tl objective"><div class="objective-head"><div class="eyebrow">전투 목표</div><span class="stage-count" id="stage-count">1 / 7</span></div><div id="objective-text">적장을 격파하라</div><div class="stage-meter"><i id="stage-meter-fill"></i></div></div>
    <div class="corner bl player-panel"><div class="hud-name">${name}</div>${progressText}<div class="bar hp"><i></i></div><div class="rage-row"><span>무쌍</span><div class="bar rage"><i></i></div></div><div class="mount-readout" id="mount-readout">하마 상태</div></div>
    <div class="corner cr combo-wrap"><div class="combo-n" id="combo-n">0</div><div class="combo-t">CHAIN</div></div>
    <div class="corner br ko-wrap"><strong id="ko-n">0</strong><span>K.O.</span></div>
    <div class="corner bc controls"><span>WASD 이동 · W 두 번 점프</span><span>J 공격 · 꾹 강공</span><span>K 활 · 꾹 차지</span><span>L 필살기</span><span>I 돌진기</span><span>F 승마</span></div>
    <div class="touch-controls" aria-label="모바일 전투 조작">
      <div class="touch-stick" id="touch-stick" aria-label="이동 스틱"><div class="touch-stick-nub"></div></div>
      <div class="touch-actions">
        <button type="button" data-touch-action="ranged"><span class="key-code">K</span><span class="key-icon" aria-hidden="true">➶</span><span class="key-label">활</span></button>
        <button type="button" data-touch-action="mount"><span class="key-code">F</span><span class="key-icon" aria-hidden="true">♞</span><span class="key-label">승마</span></button>
        <button type="button" data-touch-action="skill"><span class="key-code">L</span><span class="key-icon" aria-hidden="true">✦</span><span class="key-label">필살기</span></button>
        <button type="button" data-touch-action="dash"><span class="key-code">I</span><span class="key-label">돌진기</span><span class="key-sub">준비 완료</span></button>
        <button type="button" data-touch-action="attack"><span class="key-code">J</span><span class="key-label">공격</span><span class="key-sub">꾹 · 강공</span></button>
      </div>
    </div>
    <div class="dash-readout"></div>
    <div class="damage-vignette"></div>`;
  hudRoot.appendChild(el);
  const hp = el.querySelector('.bar.hp > i'), rage = el.querySelector('.bar.rage > i');
  const combo = el.querySelector('#combo-n'), ko = el.querySelector('#ko-n'), objective = el.querySelector('#objective-text'), stageCount = el.querySelector('#stage-count'), stageFill = el.querySelector('#stage-meter-fill'), mountReadout = el.querySelector('#mount-readout');
  const vignette = el.querySelector('.damage-vignette'), skillButton = el.querySelector('[data-touch-action=skill]');
  const dashButton = el.querySelector('[data-touch-action=dash]');
  let dashText = '';
  return {
    setDashSkill(skill) {
      dashButton.querySelector('.key-label').textContent = skill.name;
      dashButton.style.setProperty('--dash-color', skill.color);
      dashButton.setAttribute('aria-label', '돌진기 ' + skill.name);
      dashButton.title = skill.name + ' · ' + skill.tip + ' · I / C';
      el.querySelector('.dash-readout').textContent = '돌진기 · ' + skill.tip;
    },
    setDashCooldown(remaining, total) {
      const cooling = remaining > 0;
      dashButton.classList.toggle('cooling', cooling);
      dashButton.setAttribute('aria-disabled', String(cooling));
      dashButton.style.setProperty('--cooldown', Math.max(0, Math.min(1, remaining / total)));
      const text = cooling ? (remaining / 1000).toFixed(1) + '초' : '돌진기 · 준비 완료';
      if (text !== dashText) { dashButton.querySelector('.key-sub').textContent = text; dashText = text; }
    },
    setCapabilities(ranged, mounted, rangedLabel = '활') {
      for (const [action, enabled, label] of [['ranged', ranged, rangedLabel], ['mount', mounted, '승마']]) {
        const button = el.querySelector('[data-touch-action=' + action + ']');
        button.classList.toggle('unavailable', !enabled);
        button.querySelector('.key-label').textContent = label;
        let availability = button.querySelector('.availability');
        if (!availability) { availability = document.createElement('span'); availability.className = 'key-sub availability'; button.appendChild(availability); }
        availability.textContent = enabled ? '' : '미지원';
        availability.hidden = enabled;
        button.setAttribute('aria-disabled', String(!enabled));
        button.setAttribute('aria-label', label + (enabled ? '' : ' 미지원'));
        button.title = enabled ? label : '이 장수의 ' + label + ' 자세는 아직 준비되지 않았습니다';
      }
    },
    setHp(r) { hp.style.transform = `scaleX(${Math.max(0, Math.min(1, r))})`; },
    // 필살 버튼 하나가 무쌍까지 겸한다 — 게이지가 차면 버튼 자체가 빛나야
    // "지금 누르면 무쌍"이 손끝에서 읽힌다.
    setRage(r) { const ready = r >= 0.999; rage.style.transform = `scaleX(${Math.max(0, Math.min(1, r))})`; rage.classList.toggle('ready', ready); if (skillButton) { skillButton.classList.toggle('ready', ready); skillButton.querySelector('.key-label').textContent = ready ? '무쌍' : '필살기'; } },
    setCombo(n) { combo.textContent = n; el.querySelector('.combo-wrap').classList.toggle('active', n > 1); },
    setKo(n) { ko.textContent = n; },
    setObjective(text) { objective.textContent = text; },
    setStage(wave, total) { const safeTotal = Math.max(1, total || 1); stageCount.textContent = `${Math.min(safeTotal, Math.max(1, wave || 1))} / ${safeTotal}`; stageFill.style.transform = `scaleX(${Math.max(0, Math.min(1, (wave || 0) / safeTotal))})`; },
    setMount(mounted, label) { mountReadout.textContent = mounted ? `탑승 · ${label || '군마'}` : `하마 · ${label || '군마'} 대기`; mountReadout.classList.toggle('mounted', !!mounted); },
    hurt() { vignette.classList.remove('on'); void vignette.offsetWidth; vignette.classList.add('on'); },
  };
}

const bannerState = new WeakMap();

export function showBanner(hudRoot, title, sub, duration = 2200) {
  const previous = bannerState.get(hudRoot);
  if (previous) {
    cancelAnimationFrame(previous.frame);
    clearTimeout(previous.hideTimer);
    clearTimeout(previous.removeTimer);
  }

  const el = previous?.el?.isConnected ? previous.el : document.createElement('div');
  if (!el.isConnected) {
    el.className = 'banner';
    el.innerHTML = '<div class="banner-t"></div><div class="banner-s"></div>';
    hudRoot.appendChild(el);
  }
  el.querySelector('.banner-t').textContent = String(title ?? '');
  el.querySelector('.banner-s').textContent = String(sub ?? '');
  el.classList.remove('on');
  void el.offsetWidth;

  const state = { el, frame: 0, hideTimer: 0, removeTimer: 0 };
  state.frame = requestAnimationFrame(() => el.classList.add('on'));
  state.hideTimer = setTimeout(() => {
    el.classList.remove('on');
    state.removeTimer = setTimeout(() => {
      if (bannerState.get(hudRoot) !== state) return;
      el.remove();
      bannerState.delete(hudRoot);
    }, 180);
  }, Math.max(350, duration));
  bannerState.set(hudRoot, state);
}
