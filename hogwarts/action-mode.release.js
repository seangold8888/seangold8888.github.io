/* ARCANE DUEL ARENA — optional high-difficulty real-time action mode */
(() => {
  'use strict';

  const $ = id => document.getElementById(id);
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  const lerp = (a, b, t) => a + (b - a) * t;
  const TAU = Math.PI * 2;
  const WORLD = { w: 960, h: 540 };
  const SETTINGS_LAYER = () => $('settingsLayer');
  const reduced = () => Boolean(S.settings?.reduceMotion || matchMedia('(prefers-reduced-motion: reduce)').matches);

  const MODES = {
    expert: {
      duration: 150, bossAt: 105, hp: 5, move: 285, spawnFrom: .86, spawnTo: .46,
      enemyCap: 14, bulletCap: 72, enemyBullet: 180, shieldTime: .9, shieldCd: 5.3,
      shieldRadius: 150, invuln: .65, bossHp: 300, multiplier: 1
    },
    nightmare: {
      duration: 180, bossAt: 120, hp: 4, move: 275, spawnFrom: .65, spawnTo: .34,
      enemyCap: 18, bulletCap: 100, enemyBullet: 225, shieldTime: .72, shieldCd: 6.4,
      shieldRadius: 135, invuln: .5, bossHp: 450, multiplier: 1.35
    }
  };

  const TEXT = {
    ko: {
      menuTitle: '마법 결투 아레나', menuSub: '고난도 실시간 전투 · 이동·회피·프로테고', hard: 'HARD',
      record: score => score ? `최고 ${score.toLocaleString()}점` : '첫 전투 대기 중',
      kicker: '선택 임무 · 실전 결투', title: '어둠의 숲 생존전',
      lobbyKicker: '실전 마법 훈련', lobbyTitle: '자동 주문, 직접 생존',
      lobbyBody: '빗자루에 올라타 전장을 가르고, 지팡이 끝에서 가장 가까운 적에게 주문을 쏘세요. 탄막을 피하고 결정적인 순간에 프로테고를 사용하세요.',
      modeGroup: '전투 난이도 선택', expert: '전문가', expertTag: '권장', expertDesc: '체력 5 · 150초 · 3개 웨이브와 다단계 보스',
      nightmare: '악몽', nightmareTag: '최상급', nightmareDesc: '체력 4 · 180초 · 4개 웨이브와 광폭화 보스',
      start: '결투 시작', controls: '빗자루 조종: WASD / 방향키 / 화면 드래그  ·  집중 공격: Space  ·  프로테고: Shift 또는 Q',
      hp: '체력', time: '남은 시간', score: '점수', kills: '처치', cast: '집중 공격', shield: '프로테고', ready: '준비',
      boss: '심연의 군주', combo: '연속 처치', wave: '전투 웨이브', waveUp: n => `웨이브 ${n} 돌입`, bossShield: '어둠의 보호막', paused: '결투 일시정지', pauseLabel: '결투 일시정지', resumeLabel: '결투 계속', pauseBody: '시간과 모든 적의 움직임이 멈췄습니다.',
      resume: '계속 싸우기', quit: '아레나 나가기', countdown: ['시작!', '1', '2', '3'],
      bossIncoming: '보스 출현', bossAnnounce: '심연의 군주가 전장에 나타났습니다.',
      winTitle: '아레나 정복', winLead: '마지막 저주를 돌파하고 어둠의 군주를 쓰러뜨렸습니다.',
      loseTitle: '다시 전열을 정비하세요', loseLead: '이번 전투의 패턴을 익혔습니다. 방패 타이밍을 바꾸면 승산이 있습니다.',
      finalScore: '최종 점수', newRecord: 'NEW RECORD', survival: '생존 시간', maxCombo: '최고 콤보', hpLeft: '남은 체력', mode: '전투 단계',
      replay: '같은 단계 재도전', menu: '연대기로 돌아가기', unlock: '🏅 새 배지 · 전투 마법사',
      badgeName: '전투 마법사', badgeDesc: '마법 결투 아레나에서 보스 격파',
      live: (hp, max, time, ready, boss) => `체력 ${hp}/${max}, ${time}초 남음, 프로테고 ${ready ? '준비' : '재충전 중'}${boss ? ', 보스 전투 중' : ''}`,
      canvas: '빗자루 탑승 실시간 결투. WASD 또는 방향키나 드래그로 비행하고, 집중 공격 버튼 또는 Space로 시전하며 Shift 또는 Q로 프로테고를 사용합니다.'
    },
    en: {
      menuTitle: 'Arcane Duel Arena', menuSub: 'High-difficulty real-time combat · dodge · Protego', hard: 'HARD',
      record: score => score ? `Best ${score.toLocaleString()}` : 'First battle awaits',
      kicker: 'OPTIONAL MISSION · LIVE DUEL', title: 'Forbidden Forest Survival',
      lobbyKicker: 'LIVE COMBAT TRAINING', lobbyTitle: 'Auto-cast. Survive manually.',
      lobbyBody: 'Ride the broom through the arena. Your wand fires from the nearest line of sight; dodge every curse and time Protego for the moments that matter.',
      modeGroup: 'Choose combat difficulty', expert: 'Expert', expertTag: 'RECOMMENDED', expertDesc: '5 HP · 150 sec · 3 waves and a multi-phase boss',
      nightmare: 'Nightmare', nightmareTag: 'EXTREME', nightmareDesc: '4 HP · 180 sec · 4 waves and an enraged boss',
      start: 'Begin the duel', controls: 'Fly the broom: WASD / arrows / drag  ·  Focus cast: Space  ·  Protego: Shift or Q',
      hp: 'HEALTH', time: 'TIME LEFT', score: 'SCORE', kills: 'DEFEATED', cast: 'FOCUS CAST', shield: 'PROTEGO', ready: 'READY',
      boss: 'LORD OF THE ABYSS', combo: 'DEFEAT STREAK', wave: 'COMBAT WAVE', waveUp: n => `WAVE ${n} ENGAGED`, bossShield: 'VOID BARRIER', paused: 'Duel paused', pauseLabel: 'Pause duel', resumeLabel: 'Resume duel', pauseBody: 'Time and every enemy are frozen.',
      resume: 'Resume battle', quit: 'Leave arena', countdown: ['DUEL!', '1', '2', '3'],
      bossIncoming: 'BOSS INCOMING', bossAnnounce: 'The Lord of the Abyss has entered the arena.',
      winTitle: 'Arena Conquered', winLead: 'You broke through the final curse and defeated the lord of darkness.',
      loseTitle: 'Regroup and return', loseLead: 'You learned this battle pattern. Change your shield timing and strike again.',
      finalScore: 'FINAL SCORE', newRecord: 'NEW RECORD', survival: 'SURVIVAL', maxCombo: 'MAX COMBO', hpLeft: 'HP LEFT', mode: 'MODE',
      replay: 'Retry same mode', menu: 'Return to chronicle', unlock: '🏅 New badge · Arena Victor',
      badgeName: 'Arena Victor', badgeDesc: 'Defeat the boss in Arcane Duel Arena',
      live: (hp, max, time, ready, boss) => `Health ${hp} of ${max}, ${time} seconds left, Protego ${ready ? 'ready' : 'recharging'}${boss ? ', boss battle active' : ''}`,
      canvas: 'Real-time broom duel. Fly with WASD, arrow keys, or drag. Use the focus-cast button or Space to cast and Shift or Q for Protego.'
    }
  };
  const copy = () => TEXT[lang] || TEXT.ko;

  function cleanResult(raw) {
    if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return null;
    const score = Math.max(0, Math.floor(Number(raw.score) || 0));
    if (!score) return null;
    return {
      score,
      kills: Math.max(0, Math.floor(Number(raw.kills) || 0)),
      combo: Math.max(0, Math.floor(Number(raw.combo) || 0)),
      secs: Math.max(0, Number(raw.secs) || 0),
      hp: Math.max(0, Math.floor(Number(raw.hp) || 0)),
      won: raw.won === true
    };
  }
  function ensureActionData() {
    const source = S.actionBest && typeof S.actionBest === 'object' && !Array.isArray(S.actionBest) ? S.actionBest : {};
    S.actionBest = { expert: cleanResult(source.expert), nightmare: cleanResult(source.nightmare) };
    S.actionWins = Math.max(0, Math.floor(Number(S.actionWins) || 0));
    S.actionPlays = Math.max(0, Math.floor(Number(S.actionPlays) || 0));
    S.actionBestCombo = Math.max(0, Math.floor(Number(S.actionBestCombo) || 0));
    const wins = S.actionWinsByMode && typeof S.actionWinsByMode === 'object' ? S.actionWinsByMode : {};
    S.actionWinsByMode = {
      expert: Math.max(0, Math.floor(Number(wins.expert) || 0)),
      nightmare: Math.max(0, Math.floor(Number(wins.nightmare) || 0))
    };
  }
  ensureActionData();
  save();

  /* ---------- UI ---------- */
  const entry = document.createElement('button');
  entry.id = 'actionEntry';
  entry.type = 'button';
  entry.className = 'btn menu-item action-entry';
  entry.innerHTML = '<span class="ic" aria-hidden="true">⚔</span><span class="action-entry-copy"><strong id="actionEntryTitle"></strong><span class="sub" id="actionEntrySub"></span></span><span class="action-menu-meta"><span class="action-hard-badge" id="actionHardBadge"></span><span class="action-record" id="actionRecord"></span></span>';
  $('bossEntry').before(entry);

  const actionScreen = document.createElement('section');
  actionScreen.className = 'screen';
  actionScreen.id = 's-action';
  actionScreen.innerHTML = `
    <header class="action-screen-head">
      <div><span class="hero-kicker" id="actionKicker"></span><h2 id="actionTitle"></h2></div>
      <span class="action-mode-badge" id="actionModeBadge"></span>
    </header>
    <div class="action-arena" id="actionStage">
      <canvas id="actionCanvas" tabindex="0" role="application"></canvas>
      <div class="action-hud" aria-hidden="true">
        <div class="action-hud-cell"><div class="action-hp-wrap"><span class="action-avatar-dot" id="actionAvatar" role="img"><i class="avatar-hair"></i><i class="avatar-face"></i><i class="avatar-robe"></i></span><div><small id="actionHpLabel"></small><div class="action-hearts" id="actionHp"></div></div></div></div>
        <div class="action-hud-cell"><small id="actionTimeLabel"></small><b id="actionTime">0</b></div>
        <div class="action-hud-cell"><small id="actionScoreLabel"></small><b id="actionScore">0</b></div>
        <div class="action-hud-cell"><small id="actionKillsLabel"></small><b id="actionKills">0</b></div>
      </div>
      <div class="action-bossbar" id="actionBossBar" hidden role="progressbar" aria-labelledby="actionBossName" aria-valuemin="0">
        <div class="action-boss-name"><span id="actionBossName"></span><span id="actionBossHpText"></span></div>
        <div class="action-boss-track"><i id="actionBossFill"></i></div>
      </div>
      <div class="action-combo-pop" id="actionCombo"><b>×0</b><small></small></div>
      <div class="action-wave-progress" id="actionWave"><small id="actionWaveLabel"></small><b id="actionWaveText"></b><i><span id="actionWaveFill"></span></i></div>
      <button class="action-cast-btn" id="actionCast" type="button"><span class="cast-icon">✦</span><small id="actionCastLabel"></small><b id="actionCastState"></b></button>
      <button class="action-shield-btn" id="actionShield" type="button"><span class="shield-icon">⬡</span><small id="actionShieldLabel"></small><b id="actionShieldState"></b></button>
      <div class="action-overlay" id="actionLobby" role="dialog" aria-modal="true" aria-labelledby="actionLobbyTitle">
        <div class="action-lobby-card">
          <span class="hero-kicker" id="actionLobbyKicker"></span><h3 id="actionLobbyTitle"></h3><p id="actionLobbyBody"></p>
          <div class="action-mode-grid" role="radiogroup" id="actionModeGrid">
            <button class="action-mode-choice sel" type="button" role="radio" aria-checked="true" data-action-mode="expert"><strong><span class="mode-name"></span><span class="mode-tag"></span></strong><small></small></button>
            <button class="action-mode-choice" type="button" role="radio" aria-checked="false" data-action-mode="nightmare"><strong><span class="mode-name"></span><span class="mode-tag"></span></strong><small></small></button>
          </div>
          <div class="action-lobby-actions"><button class="btn primary big" id="actionStart" type="button"></button></div>
        </div>
      </div>
      <div class="action-overlay" id="actionPause" hidden role="dialog" aria-modal="true" aria-labelledby="actionPauseTitle">
        <div class="action-pause-card"><h3 id="actionPauseTitle"></h3><p id="actionPauseBody"></p><div class="action-pause-actions"><button class="btn primary" id="actionResume" type="button"></button><button class="btn ghost" id="actionQuit" type="button"></button></div></div>
      </div>
      <div class="action-live" id="actionLive" aria-live="polite" aria-atomic="false"></div>
    </div>
    <p class="action-controls-note" id="actionControls"></p>`;

  const resultScreen = document.createElement('section');
  resultScreen.className = 'screen';
  resultScreen.id = 's-actionres';
  resultScreen.innerHTML = `
    <article class="action-result-card">
      <div class="action-result-emblem" id="actionResultEmblem" aria-hidden="true"></div>
      <h2 id="actionResultTitle" tabindex="-1"></h2><p class="action-result-lead" id="actionResultLead"></p>
      <div class="action-result-score"><span id="actionResultScore">0</span><small id="actionResultScoreLabel"></small></div>
      <span class="action-new-record" id="actionNewRecord" hidden></span>
      <div class="action-result-stats">
        <div><b id="actionResultTime"></b><small id="actionResultTimeLabel"></small></div>
        <div><b id="actionResultCombo"></b><small id="actionResultComboLabel"></small></div>
        <div><b id="actionResultHp"></b><small id="actionResultHpLabel"></small></div>
        <div><b id="actionResultMode"></b><small id="actionResultModeLabel"></small></div>
      </div>
      <p class="action-unlock" id="actionUnlock" hidden></p>
      <div class="action-result-actions"><button class="btn primary" id="actionReplay" type="button"></button><button class="btn ghost" id="actionMenu" type="button"></button></div>
    </article>`;
  $('app').append(actionScreen, resultScreen);

  const canvas = $('actionCanvas');
  const ctx = canvas.getContext('2d', { alpha: true, desynchronized: true }) || canvas.getContext('2d');
  let dpr = 1;

  function resizeCanvas() {
    dpr = Math.min(2, Math.max(1, window.devicePixelRatio || 1));
    canvas.width = Math.round(WORLD.w * dpr);
    canvas.height = Math.round(WORLD.h * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }
  resizeCanvas();
  addEventListener('resize', resizeCanvas, { passive: true });

  let selectedMode = 'expert';
  let A = null;
  let raf = 0;
  let lastResult = null;
  let pointerId = null;
  const keys = new Set();

  function bestScore() {
    return Math.max(S.actionBest.expert?.score || 0, S.actionBest.nightmare?.score || 0);
  }
  function modeName(mode) { return mode === 'nightmare' ? copy().nightmare : copy().expert; }
  function setText(id, value) { const el = $(id); if (el) el.textContent = value; }

  function paintActionText() {
    ensureActionData();
    const c = copy();
    setText('actionEntryTitle', c.menuTitle); setText('actionEntrySub', c.menuSub); setText('actionHardBadge', c.hard); setText('actionRecord', c.record(bestScore()));
    setText('actionKicker', c.kicker); setText('actionTitle', c.title); setText('actionModeBadge', modeName(selectedMode));
    setText('actionLobbyKicker', c.lobbyKicker); setText('actionLobbyTitle', c.lobbyTitle); setText('actionLobbyBody', c.lobbyBody); setText('actionStart', c.start);
    $('actionModeGrid').setAttribute('aria-label', c.modeGroup);
    setText('actionHpLabel', c.hp); setText('actionTimeLabel', c.time); setText('actionScoreLabel', c.score); setText('actionKillsLabel', c.kills);
    setText('actionCastLabel', c.cast); setText('actionShieldLabel', c.shield); setText('actionBossName', c.boss); setText('actionWaveLabel', c.wave); setText('actionControls', c.controls);
    $('actionCast').setAttribute('aria-label', c.cast); $('actionShield').setAttribute('aria-label', c.shield);
    setText('actionPauseTitle', c.paused); setText('actionPauseBody', c.pauseBody); setText('actionResume', c.resume); setText('actionQuit', c.quit);
    setText('actionReplay', c.replay); setText('actionMenu', c.menu); setText('actionResultScoreLabel', c.finalScore); setText('actionNewRecord', c.newRecord);
    setText('actionResultTimeLabel', c.survival); setText('actionResultComboLabel', c.maxCombo); setText('actionResultHpLabel', c.hpLeft); setText('actionResultModeLabel', c.mode);
    canvas.setAttribute('aria-label', c.canvas);
    const choices = document.querySelectorAll('[data-action-mode]');
    choices.forEach(button => {
      const nightmare = button.dataset.actionMode === 'nightmare';
      button.querySelector('.mode-name').textContent = nightmare ? c.nightmare : c.expert;
      button.querySelector('.mode-tag').textContent = nightmare ? c.nightmareTag : c.expertTag;
      button.querySelector('small').textContent = nightmare ? c.nightmareDesc : c.expertDesc;
      const selected = button.dataset.actionMode === selectedMode; button.classList.toggle('sel', selected); button.setAttribute('aria-checked', String(selected)); button.tabIndex = selected ? 0 : -1;
    });
    if (lastResult) paintResult(lastResult);
  }

  function paintMenuEntry() {
    $('bossEntry').before(entry);
    setText('actionRecord', copy().record(bestScore()));
  }

  function selectMode(mode) {
    if (!MODES[mode]) return;
    selectedMode = mode;
    document.querySelectorAll('[data-action-mode]').forEach(button => {
      const on = button.dataset.actionMode === mode;
      button.classList.toggle('sel', on);
      button.setAttribute('aria-checked', String(on)); button.tabIndex = on ? 0 : -1;
    });
    setText('actionModeBadge', modeName(mode));
    sTap();
  }

  function showActionSetup() {
    haltAction();
    selectedMode = selectedMode || 'expert';
    $('actionLobby').hidden = false;
    $('actionPause').hidden = true;
    $('actionBossBar').hidden = true;
    $('actionCast').disabled = true; $('actionShield').disabled = true;
    $('actionCast').classList.remove('ready'); $('actionShield').classList.remove('ready');
    setText('actionCastState', '—'); setText('actionShieldState', '—');
    setText('actionWaveText', selectedMode === 'nightmare' ? '1 / 5' : '1 / 4'); $('actionWaveFill').style.transform = 'scaleX(0)';
    setText('actionHp', '♥♥♥♥♥'); setText('actionTime', MODES[selectedMode].duration); setText('actionScore', '0'); setText('actionKills', '0');
    $('actionAvatar').dataset.avatar = S.avatar === 'hermione' ? 'hermione' : 'harry';
    $('actionAvatar').dataset.house = ['g','h','r','s'].includes(S.house) ? S.house : 'g';
    $('actionAvatar').style.setProperty('--avatar-aura', AURA_COLORS[S.aura] || AURA_COLORS.gold);
    $('actionAvatar').setAttribute('aria-label', S.name || (lang === 'ko' ? '플레이어 마법사' : 'Player wizard'));
    paintActionText();
    resizeCanvas();
    ctx.clearRect(0, 0, WORLD.w, WORLD.h); canvas.tabIndex = -1;
    $('pauseBtn').style.display = 'none';
    setTimeout(() => $('actionStart')?.focus({ preventScroll: true }), 140);
  }

  /* ---------- simulation ---------- */
  function makeStars() {
    return Array.from({ length: 68 }, () => ({ x: Math.random() * WORLD.w, y: 70 + Math.random() * (WORLD.h - 90), r: .4 + Math.random() * 1.4, a: .08 + Math.random() * .34 }));
  }

  function startAction() {
    haltAction();
    const cfg = MODES[selectedMode];
    const now = performance.now();
    const waveTimes = selectedMode === 'nightmare' ? [0, 30, 60, 90, cfg.bossAt] : [0, 35, 70, cfg.bossAt];
    A = {
      active: true, paused: false, mode: selectedMode, cfg, last: now, acc: 0, elapsed: 0, countdown: 3.2,
      waveTimes, wave: 1, waveTotal: waveTimes.length, nextWave: 1, fireRate: .24, volley: 1,
      spawnCd: .8, fireCd: .14, manualCd: 0, score: 0, kills: 0, combo: 0, maxCombo: 0,
      enemies: [], bullets: [], enemyBullets: [], particles: [], impacts: [], hitTexts: [], stars: makeStars(),
      boss: null, bossSpawned: false, bossPattern: 0, shake: 0, flash: 0, hitStop: 0, hitSfxCd: 0, hudNext: 0, wasBlocked: false, shieldWasReady: true, announcedTimes: new Set(),
      message: '', messageTime: 0, pointerTarget: null,
      player: { x: WORLD.w / 2, y: WORLD.h - 78, r: 23, hp: cfg.hp, maxHp: cfg.hp, invuln: 1.25, shield: 0, shieldCd: 0 }
    };
    $('actionAvatar').dataset.avatar = S.avatar === 'hermione' ? 'hermione' : 'harry';
    $('actionAvatar').dataset.house = ['g','h','r','s'].includes(S.house) ? S.house : 'g';
    $('actionAvatar').style.setProperty('--avatar-aura', AURA_COLORS[S.aura] || AURA_COLORS.gold);
    $('actionLobby').hidden = true; $('actionPause').hidden = true; $('actionBossBar').hidden = true;
    $('actionCast').disabled = false; $('actionShield').disabled = false;
    $('pauseBtn').style.display = '';
    keys.clear(); pointerId = null;
    resizeCanvas(); canvas.tabIndex = 0; updateHud(true);
    $('pauseBtn').setAttribute('aria-label', copy().pauseLabel); canvas.focus({ preventScroll: true });
    try { droneOn(); whooshFx(true, .8); chime([220, 330, 440], .11, { gain: .075, wet: .32 }); } catch (e) {}
    raf = requestAnimationFrame(frame);
  }

  function haltAction() {
    if (raf) cancelAnimationFrame(raf);
    raf = 0;
    keys.clear(); pointerId = null;
    if (A) A.active = false;
    A = null;
    try { droneOff(); } catch (e) {}
  }

  function advanceWave() {
    if (!A || A.nextWave >= A.waveTimes.length) return;
    A.wave = A.nextWave + 1; A.nextWave++;
    A.fireRate = Math.max(.17, .24 - (A.wave - 1) * .018);
    A.volley = A.wave >= 3 ? 2 : 1;
    A.score += 450 * A.wave;
    if (A.wave < A.waveTotal) {
      A.message = copy().waveUp(A.wave); A.messageTime = 1.8;
      spawnEnemy(A.wave >= 3 ? 'elite' : 'caster');
      if (A.mode === 'nightmare' || A.wave >= 3) spawnEnemy('hunter');
      if (A.wave % 2 === 0 && A.player.hp < A.player.maxHp) A.player.hp++;
      try { chime([220, 330, 440, 660], .08, { gain: .08, wet: .38 }); whooshFx(true, .65); } catch (e) {}
    }
    updateHud(true);
  }

  function spawnEnemy(forced) {
    if (!A || A.enemies.filter(e => !e.dead && !e.boss).length >= A.cfg.enemyCap) return;
    const p = A.elapsed / A.cfg.bossAt;
    const roll = Math.random();
    let type = forced || (A.elapsed > 28 && roll < .12 ? 'elite' : A.elapsed > 18 && roll < .36 ? 'caster' : A.elapsed > 11 && roll < .58 ? 'hunter' : 'shade');
    const specs = {
      shade: { hp: 2, speed: 80, r: 18, value: 100, stop: 999 },
      hunter: { hp: 4, speed: 115, r: 21, value: 160, stop: 999 },
      caster: { hp: 6, speed: 50, r: 23, value: 220, stop: 155 },
      elite: { hp: 14, speed: 65, r: 29, value: 550, stop: 128 }
    };
    const s = specs[type], waveScale = 1 + (A.wave - 1) * (A.mode === 'nightmare' ? .2 : .16);
    const scaledHp = Math.ceil(s.hp * waveScale);
    const x = 55 + Math.random() * (WORLD.w - 110);
    A.enemies.push({
      type, x, y: -s.r - Math.random() * 22, r: s.r, hp: scaledHp, maxHp: scaledHp,
      speed: s.speed * (A.mode === 'nightmare' ? 1.1 : 1) * (1 + (A.wave - 1) * .045), value: Math.round(s.value * waveScale), stopY: s.stop,
      age: Math.random() * 2, phase: Math.random() * TAU,
      attackCd: type === 'elite' ? 1.3 + Math.random() * .45 : 1.15 + Math.random() * .7,
      dead: false, boss: false, arrived: false, hitFlash: 0, difficulty: p
    });
  }

  function spawnBoss() {
    if (!A || A.bossSpawned) return;
    A.bossSpawned = true;
    const hp = A.cfg.bossHp;
    const boss = {
      type: 'boss', boss: true, x: WORLD.w / 2, y: -78, r: 52, hp, maxHp: hp,
      speed: 66, value: 6500, age: 0, phase: 0, phaseShield: 0, attackCd: .9, arrived: false, hitFlash: 0, dead: false
    };
    A.boss = boss; A.enemies.push(boss);
    A.message = copy().bossIncoming; A.messageTime = 2.1;
    $('actionBossBar').hidden = false;
    $('actionLive').textContent = copy().bossAnnounce;
    try { impactFx(1.15); chime([110, 138.59, 164.81], .18, { gain: .11, wet: .5, wave: 'triangle' }); buzz([30, 45, 80]); } catch (e) {}
  }

  function nearestTarget() {
    if (!A) return null;
    let target = null, best = Infinity;
    for (const e of A.enemies) {
      if (e.dead || e.hp <= 0 || (e.boss && !e.arrived)) continue;
      const dist = Math.hypot(e.x - A.player.x, e.y - A.player.y) - (e.boss ? 160 : 0);
      if (dist < best) { best = dist; target = e; }
    }
    return target;
  }

  function firePlayer(force = false) {
    if (!A || !A.active || A.paused || A.countdown > 0 || A.bullets.length >= 36) return;
    if (force && A.manualCd > 0) return;
    const target = nearestTarget();
    if (!target) return;
    const dx = target.x - A.player.x, dy = target.y - A.player.y, d = Math.max(1, Math.hypot(dx, dy));
    const speed = 650;
    /* Cast from the wand hand, not the rider's center, so every bolt reads as a real spell release. */
    const ox = A.player.x + dx / d * 17, oy = A.player.y - 7 + dy / d * 11;
    const volley = force ? Math.max(2, A.volley) : A.volley;
    for (let shot = 0; shot < volley && A.bullets.length < 36; shot++) {
      const side = volley === 1 ? 0 : (shot - (volley - 1) / 2) * 12;
      const px = ox - dy / d * side, py = oy + dx / d * side;
      A.bullets.push({ x: px, y: py, px, py, vx: dx / d * speed, vy: dy / d * speed, r: 5, life: 1.7, power: 2, target });
    }
    if (force) A.manualCd = .17;
    A.fireCd = force ? Math.max(A.fireCd, .12) : A.fireRate;
    if (force || A.bullets.length % 5 === 0) {
      try { noiseFx({ dur: .06, gain: .018, from: 3600, to: 1100, wet: .15, pan: clamp((A.player.x / WORLD.w) * 2 - 1, -1, 1) }); } catch (e) {}
    }
  }

  function shootEnemy(enemy, angles, speedScale = 1) {
    if (!A || A.enemyBullets.length >= A.cfg.bulletCap) return;
    const base = Math.atan2(A.player.y - enemy.y, A.player.x - enemy.x);
    const speed = A.cfg.enemyBullet * speedScale;
    for (const angle of angles) {
      if (A.enemyBullets.length >= A.cfg.bulletCap) break;
      const a = base + angle;
      A.enemyBullets.push({ x: enemy.x, y: enemy.y + enemy.r * .3, px: enemy.x, py: enemy.y, vx: Math.cos(a) * speed, vy: Math.sin(a) * speed, r: enemy.boss ? 7 : 6, life: 5.4 });
    }
  }

  function bossAttack(boss) {
    if (!A) return;
    const pattern = A.bossPattern++ % 4;
    if (pattern === 0) shootEnemy(boss, [-.5, -.33, -.16, 0, .16, .33, .5], 1.02);
    else if (pattern === 1) shootEnemy(boss, [-.18, 0, .18], 1.32);
    else if (pattern === 2) {
      const count = A.mode === 'nightmare' ? 16 : 13;
      for (let i = 0; i < count && A.enemyBullets.length < A.cfg.bulletCap; i++) {
        const angle = i / count * TAU + boss.age * .38;
        const speed = A.cfg.enemyBullet * .78;
        A.enemyBullets.push({ x: boss.x, y: boss.y, px: boss.x, py: boss.y, vx: Math.cos(angle) * speed, vy: Math.sin(angle) * speed, r: 6, life: 5.2 });
      }
    } else shootEnemy(boss, [-.38, -.19, 0, .19, .38], 1.18);
    try { whooshFx(false, .42); } catch (e) {}
  }

  function triggerBossPhase(boss) {
    if (!A || !boss || boss.dead) return;
    const ratio = boss.hp / boss.maxHp;
    const next = ratio <= .33 ? 2 : ratio <= .66 ? 1 : 0;
    if (next <= boss.phase) return;
    boss.phase = next; boss.phaseShield = next === 2 ? 4.8 : 3.8;
    A.message = copy().bossShield; A.messageTime = 1.9; A.shake = reduced() ? 0 : 12;
    spawnEnemy('elite'); spawnEnemy('caster');
    if (A.mode === 'nightmare') spawnEnemy('hunter');
    try { impactFx(1.2); chime([110, 146.83, 220], .18, { gain: .1, wet: .5, wave: 'sawtooth' }); } catch (e) {}
  }

  function activateShield() {
    if (!A || !A.active || A.paused || A.countdown > 0 || A.player.shieldCd > 0) return;
    const p = A.player;
    p.shield = A.cfg.shieldTime; p.shieldCd = A.cfg.shieldCd; p.invuln = Math.max(p.invuln, A.cfg.shieldTime); A.shieldWasReady = false;
    let cleared = 0;
    A.enemyBullets = A.enemyBullets.filter(b => {
      const hit = Math.hypot(b.x - p.x, b.y - p.y) <= A.cfg.shieldRadius;
      if (hit) { particle(b.x, b.y, '#7df2ff', 3, 72); cleared++; }
      return !hit;
    });
    A.score += cleared * 12;
    try { whooshFx(true, 1.05); chime([392, 587.33, 783.99], .08, { gain: .085, wet: .48 }); buzz([18, 22, 26]); } catch (e) {}
    updateHud(true);
  }

  function particle(x, y, color, count = 8, speed = 100) {
    if (!A) return;
    const n = reduced() ? Math.min(3, count) : count;
    for (let i = 0; i < n && A.particles.length < 180; i++) {
      const a = Math.random() * TAU, s = speed * (.35 + Math.random());
      A.particles.push({ x, y, vx: Math.cos(a) * s, vy: Math.sin(a) * s, life: .28 + Math.random() * .42, max: .7, r: 1.5 + Math.random() * 3.5, color });
    }
  }

  function impactBurst(x, y, color = '#ffd66f', power = 1, text = '') {
    if (!A) return;
    const max = reduced() ? .18 : .34;
    A.impacts.push({ x, y, life: max, max, r: 7, power, color });
    if (text) A.hitTexts.push({ x, y: y - 8, text, life: .56, max: .56, color });
    particle(x, y, color, Math.round(8 + power * 8), 90 + power * 75);
    A.hitStop = Math.max(A.hitStop, reduced() ? .012 : power >= 1 ? .068 : .042);
    A.shake = Math.max(A.shake, reduced() ? 0 : power >= 1 ? 9 : 4);
    if (A.hitSfxCd <= 0) {
      try { impactFx(Math.min(1.2, .25 + power * .3)); } catch (e) {}
      A.hitSfxCd = .065;
    }
  }

  function takeDamage() {
    if (!A || A.player.invuln > 0 || A.player.shield > 0) return;
    const p = A.player;
    p.hp--; p.invuln = A.cfg.invuln; A.combo = 0; A.shake = reduced() ? 0 : 10; A.flash = .2;
    impactBurst(p.x, p.y, '#ff536d', 1.15, lang === 'ko' ? '피격' : 'HIT');
    try { buzz([35, 30, 55]); } catch (e) {}
    updateHud(true);
    if (p.hp <= 0) finishAction(false, 'hp');
  }

  function defeat(enemy) {
    if (!A || enemy.dead) return;
    enemy.dead = true;
    const mult = 1 + Math.min(A.combo, 20) * .05;
    A.score += Math.round(enemy.value * mult);
    A.kills++; A.combo++; A.maxCombo = Math.max(A.maxCombo, A.combo);
    const color = enemy.boss ? '#ffd66f' : enemy.type === 'elite' ? '#ff9d71' : '#c18bff';
    particle(enemy.x, enemy.y, color, enemy.boss ? 38 : 12, enemy.boss ? 210 : 115);
    if (A.kills % 4 === 0 || enemy.type === 'elite') {
      try { chime([392, 587.33], .055, { gain: .052, wet: .2 }); } catch (e) {}
    }
    if (enemy.boss) finishAction(true, 'boss');
  }

  function updatePlayer(dt, freezeTimers = false) {
    const p = A.player;
    let dx = 0, dy = 0;
    if (keys.has('arrowleft') || keys.has('a')) dx--;
    if (keys.has('arrowright') || keys.has('d')) dx++;
    if (keys.has('arrowup') || keys.has('w')) dy--;
    if (keys.has('arrowdown') || keys.has('s')) dy++;
    if (dx || dy) {
      const d = Math.hypot(dx, dy); p.x += dx / d * A.cfg.move * dt; p.y += dy / d * A.cfg.move * dt;
      A.pointerTarget = null;
    } else if (A.pointerTarget) {
      const tx = A.pointerTarget.x - p.x, ty = A.pointerTarget.y - p.y, d = Math.hypot(tx, ty);
      if (d > 12) { const step = Math.min(d, A.cfg.move * dt); p.x += tx / d * step; p.y += ty / d * step; }
    }
    p.x = clamp(p.x, 28, WORLD.w - 28); p.y = clamp(p.y, 94, WORLD.h - 28);
    if (!freezeTimers) { p.invuln = Math.max(0, p.invuln - dt); p.shield = Math.max(0, p.shield - dt); p.shieldCd = Math.max(0, p.shieldCd - dt); }
  }

  function updateEnemies(dt) {
    const p = A.player;
    for (const e of A.enemies) {
      if (e.dead) continue;
      e.age += dt; e.hitFlash = Math.max(0, e.hitFlash - dt);
      if (e.boss) {
        e.phaseShield = Math.max(0, (e.phaseShield || 0) - dt);
        if (!e.arrived) {
          e.y = Math.min(105, e.y + e.speed * dt);
          if (e.y >= 105) { e.arrived = true; e.age = 0; e.x = WORLD.w / 2; e.attackCd = A.mode === 'nightmare' ? .8 : .95; }
        } else {
          e.x = WORLD.w / 2 + Math.sin(e.age * .7) * 270;
          e.attackCd -= dt;
          if (e.attackCd <= 0) {
            bossAttack(e);
            const base = A.mode === 'nightmare' ? .98 : 1.24;
            e.attackCd = base * (e.phase === 2 ? .62 : e.phase === 1 ? .78 : 1);
          }
        }
        continue;
      }
      if (e.type === 'caster' || e.type === 'elite') {
        if (!e.arrived) {
          e.y = Math.min(e.stopY, e.y + e.speed * dt);
          if (e.y >= e.stopY) { e.arrived = true; e.attackCd = e.type === 'elite' ? .65 : .55; }
        } else {
          e.x += Math.sin(e.age * (e.type === 'elite' ? 1.5 : 1.1) + e.phase) * (e.type === 'elite' ? 37 : 24) * dt;
          e.attackCd -= dt;
          if (e.attackCd <= 0) {
            shootEnemy(e, e.type === 'elite' ? [-.22, 0, .22] : [0], e.type === 'elite' ? 1.06 : .98);
            e.attackCd = e.type === 'elite' ? 1.8 : 1.58;
          }
        }
      } else {
        const aim = Math.atan2(p.y - e.y, p.x - e.x);
        e.x += Math.cos(aim) * e.speed * .42 * dt;
        e.y += Math.max(.55, Math.sin(aim)) * e.speed * dt;
        if (e.type === 'hunter') e.x += Math.sin(e.age * 7 + e.phase) * 82 * dt;
      }
      e.x = clamp(e.x, -30, WORLD.w + 30);
      if (Math.hypot(e.x - p.x, e.y - p.y) < e.r + p.r - 3) { e.dead = true; takeDamage(); }
      else if (e.y > WORLD.h + 35) { e.dead = true; takeDamage(); }
      if (!A || !A.active) return;
    }
    A.enemies = A.enemies.filter(e => !e.dead);
  }

  function updateProjectiles(dt) {
    const p = A.player;
    for (let i = A.bullets.length - 1; i >= 0; i--) {
      const b = A.bullets[i]; b.px = b.x; b.py = b.y;
      if (b.target && !b.target.dead) { const tx = b.target.x - b.x, ty = b.target.y - b.y, td = Math.max(1, Math.hypot(tx, ty)), turn = Math.min(1, dt * 4.8); b.vx = lerp(b.vx, tx / td * 650, turn); b.vy = lerp(b.vy, ty / td * 650, turn); }
      b.x += b.vx * dt; b.y += b.vy * dt; b.life -= dt;
      let consumed = b.life <= 0 || b.x < -20 || b.x > WORLD.w + 20 || b.y < -20 || b.y > WORLD.h + 20;
      if (!consumed) {
        for (const e of A.enemies) {
          if (e.dead || (e.boss && !e.arrived) || Math.hypot(b.x - e.x, b.y - e.y) > b.r + e.r) continue;
          consumed = true;
          if (e.boss && e.phaseShield > 0) {
            impactBurst(b.x, b.y, '#7df2ff', .72, lang === 'ko' ? '방어' : 'BLOCK');
            break;
          }
          e.hp -= b.power; e.hitFlash = .14;
          impactBurst(b.x, b.y, e.boss ? '#ffcd79' : '#b8a4ff', e.boss ? 1.25 : .68, e.boss ? 'CRITICAL' : `−${b.power}`);
          if (e.boss) triggerBossPhase(e);
          if (e.hp <= 0) defeat(e);
          break;
        }
      }
      if (!A || !A.active) return;
      if (consumed) A.bullets.splice(i, 1);
    }
    for (let i = A.enemyBullets.length - 1; i >= 0; i--) {
      const b = A.enemyBullets[i]; b.px = b.x; b.py = b.y; b.x += b.vx * dt; b.y += b.vy * dt; b.life -= dt;
      let consumed = b.life <= 0 || b.x < -35 || b.x > WORLD.w + 35 || b.y < -35 || b.y > WORLD.h + 35;
      if (!consumed && p.shield > 0 && Math.hypot(b.x - p.x, b.y - p.y) <= A.cfg.shieldRadius) {
        consumed = true; A.score += 12; particle(b.x, b.y, '#78ecff', 3, 72);
      } else if (!consumed && Math.hypot(b.x - p.x, b.y - p.y) < b.r + p.r - 3) {
        consumed = true; takeDamage();
      }
      if (!A || !A.active) return;
      if (consumed) A.enemyBullets.splice(i, 1);
    }
  }

  function updateParticles(dt) {
    for (let i = A.particles.length - 1; i >= 0; i--) {
      const p = A.particles[i]; p.x += p.vx * dt; p.y += p.vy * dt; p.vx *= .97; p.vy *= .97; p.life -= dt;
      if (p.life <= 0) A.particles.splice(i, 1);
    }
  }

  function updateImpactFx(dt) {
    if (!A) return;
    for (let i = A.impacts.length - 1; i >= 0; i--) {
      const fx = A.impacts[i]; fx.life -= dt; fx.r += (150 + fx.power * 55) * dt;
      if (fx.life <= 0) A.impacts.splice(i, 1);
    }
    for (let i = A.hitTexts.length - 1; i >= 0; i--) {
      const hit = A.hitTexts[i]; hit.life -= dt; hit.y -= 38 * dt;
      if (hit.life <= 0) A.hitTexts.splice(i, 1);
    }
  }

  function update(dt) {
    if (!A || !A.active) return;
    A.hitSfxCd = Math.max(0, A.hitSfxCd - dt);
    if (A.countdown > 0) {
      A.countdown = Math.max(0, A.countdown - dt); updatePlayer(dt, true); updateParticles(dt); updateImpactFx(dt); return;
    }
    if (A.hitStop > 0) {
      A.hitStop = Math.max(0, A.hitStop - dt);
      updateParticles(dt * .35); updateImpactFx(dt);
      return;
    }
    A.elapsed += dt; A.flash = Math.max(0, A.flash - dt); A.shake = Math.max(0, A.shake - 24 * dt); A.messageTime = Math.max(0, A.messageTime - dt);
    updatePlayer(dt);
    A.fireCd -= dt; A.manualCd = Math.max(0, A.manualCd - dt); if (A.fireCd <= 0) firePlayer();
    while (A.nextWave < A.waveTimes.length && A.elapsed >= A.waveTimes[A.nextWave]) advanceWave();
    if (!A.bossSpawned && A.elapsed >= A.cfg.bossAt) spawnBoss();
    A.spawnCd -= dt;
    if (A.spawnCd <= 0) {
      spawnEnemy();
      const phase = clamp(A.elapsed / A.cfg.bossAt, 0, 1);
      A.spawnCd = lerp(A.cfg.spawnFrom, A.cfg.spawnTo, phase) * (A.bossSpawned ? 1.25 : 1) * (.82 + Math.random() * .38);
    }
    updateEnemies(dt); if (!A || !A.active) return;
    updateProjectiles(dt); if (!A || !A.active) return;
    updateParticles(dt); updateImpactFx(dt);
    const shieldReady = A.player.shieldCd <= 0, secondsLeft = Math.max(0, Math.ceil(A.cfg.duration - A.elapsed));
    if (shieldReady && !A.shieldWasReady) { A.shieldWasReady = true; announceStatus(); }
    else if (!shieldReady) A.shieldWasReady = false;
    if ([10,5,3,2,1].includes(secondsLeft) && !A.announcedTimes.has(secondsLeft)) { A.announcedTimes.add(secondsLeft); announceStatus(); }
    if (A.elapsed >= A.cfg.duration && A.boss && !A.boss.dead) finishAction(false, 'time');
  }

  /* ---------- rendering ---------- */
  function roundedRect(x, y, w, h, r) {
    ctx.beginPath(); if (ctx.roundRect) ctx.roundRect(x, y, w, h, r); else ctx.rect(x, y, w, h);
  }

  function drawBackground() {
    ctx.clearRect(0, 0, WORLD.w, WORLD.h);
    const sky = ctx.createLinearGradient(0,0,0,WORLD.h); sky.addColorStop(0,'#11142b'); sky.addColorStop(.56,'#090c1b'); sky.addColorStop(1,'#040510');
    ctx.fillStyle = sky; ctx.fillRect(0,0,WORLD.w,WORLD.h);
    const glow = ctx.createRadialGradient(WORLD.w/2,112,10,WORLD.w/2,112,330); glow.addColorStop(0,'rgba(119,76,173,.28)'); glow.addColorStop(.5,'rgba(48,33,91,.1)'); glow.addColorStop(1,'rgba(4,5,16,0)');
    ctx.fillStyle = glow; ctx.fillRect(0,0,WORLD.w,WORLD.h);
    ctx.save();
    for (const s of A.stars) { ctx.globalAlpha = s.a; ctx.fillStyle = '#d9e5ff'; ctx.beginPath(); ctx.arc(s.x,s.y,s.r,0,TAU); ctx.fill(); }

    /* Distant forbidden-forest silhouettes are deterministic CSS/canvas art. */
    ctx.globalAlpha = .72; ctx.fillStyle = '#070916';
    for (let i=0;i<13;i++) {
      const x=i*82-24, h=70+Math.abs(Math.sin(i*2.17))*92;
      ctx.beginPath(); ctx.moveTo(x,235); ctx.lineTo(x+25,235-h); ctx.lineTo(x+50,235); ctx.fill();
      ctx.beginPath(); ctx.moveTo(WORLD.w-x,235); ctx.lineTo(WORLD.w-x-22,244-h*.82); ctx.lineTo(WORLD.w-x-47,235); ctx.fill();
    }

    /* A restrained rune portal frames the boss entrance without photography. */
    ctx.translate(WORLD.w/2,128); ctx.globalAlpha = .11; ctx.strokeStyle = '#c198ff'; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.arc(0,0,74,0,TAU); ctx.arc(0,0,58,0,TAU); ctx.stroke();
    for(let i=0;i<12;i++){const a=i/12*TAU;ctx.beginPath();ctx.moveTo(Math.cos(a)*60,Math.sin(a)*60);ctx.lineTo(Math.cos(a)*72,Math.sin(a)*72);ctx.stroke();}
    ctx.translate(-WORLD.w/2,-128);

    /* Perspective stone lanes make movement and projectile speed easier to read. */
    const horizon=225; ctx.globalAlpha=.09; ctx.strokeStyle='#ad8fff'; ctx.lineWidth=1;
    for(let i=-6;i<=6;i++){ctx.beginPath();ctx.moveTo(WORLD.w/2+i*34,horizon);ctx.lineTo(WORLD.w/2+i*118,WORLD.h);ctx.stroke();}
    for(let i=0;i<8;i++){const t=i/7,y=horizon+Math.pow(t,1.65)*(WORLD.h-horizon);ctx.beginPath();ctx.moveTo(0,y);ctx.lineTo(WORLD.w,y);ctx.stroke();}
    if (!reduced()) {
      const shift=(A.elapsed*13)%240; ctx.globalAlpha=.055; ctx.fillStyle='#b8b3ff';
      for(let i=-1;i<5;i++){ctx.beginPath();ctx.ellipse(i*240+shift,325+Math.sin(i)*56,175,28,-.12,0,TAU);ctx.fill();}
    }
    ctx.restore();
  }

  function playerHousePalette() {
    return ({
      g:['#7e1d31','#efbd58'], h:['#d4a932','#1c1a22'], r:['#244d80','#d98f50'], s:['#1d644b','#c7d3d2']
    })[S.house] || ['#40356f','#efc967'];
  }

  function drawPlayer() {
    const p = A.player, aura = AURA_COLORS[S.aura] || AURA_COLORS.gold, feminine = S.avatar === 'hermione', [robe, trim] = playerHousePalette();
    ctx.save(); ctx.translate(p.x, p.y);
    if (p.shield > 0) {
      const pulse = reduced() ? 1 : 1 + Math.sin(A.elapsed * 13) * .025;
      ctx.strokeStyle = 'rgba(115,238,255,.86)'; ctx.lineWidth = 4; ctx.shadowColor = '#70eaff'; ctx.shadowBlur = 22;
      ctx.beginPath(); ctx.arc(0, 0, A.cfg.shieldRadius * pulse, 0, TAU); ctx.stroke();
      ctx.strokeStyle = 'rgba(170,250,255,.28)'; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.arc(0, 0, A.cfg.shieldRadius * .82, 0, TAU); ctx.stroke();
    }
    ctx.globalAlpha = p.invuln > 0 && p.shield <= 0 && Math.floor(p.invuln * 12) % 2 ? .42 : 1;
    const hover = reduced() ? 0 : Math.sin(A.elapsed * 5.2) * 1.4; ctx.translate(0, hover);

    /* Align the rider, wand and broom with the enemy line so the sprite reads as a seated flight pose. */
    const target = nearestTarget();
    const aim = target ? Math.atan2(target.y - p.y, target.x - p.x) : -Math.PI / 2;
    const riderRotate = aim + Math.PI / 2;
    ctx.rotate(riderRotate);

    /* Broom, bristles and wake: the wizard is visibly seated in flight, not standing on the ground. */
    const broomTilt = aim - riderRotate;
    ctx.save(); ctx.translate(0, 13); ctx.rotate(broomTilt);
    const broomGradient = ctx.createLinearGradient(-58, 0, 44, 0); broomGradient.addColorStop(0, '#5a2d1b'); broomGradient.addColorStop(.55, '#b8753b'); broomGradient.addColorStop(1, '#e3aa57');
    ctx.shadowColor = aura; ctx.shadowBlur = 15; ctx.strokeStyle = broomGradient; ctx.lineWidth = 6; ctx.lineCap = 'round';
    ctx.beginPath(); ctx.moveTo(-48, 0); ctx.lineTo(48, 0); ctx.stroke();
    ctx.shadowBlur = 0; ctx.strokeStyle = '#f5ca72'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(25, -4); ctx.lineTo(25, 4); ctx.stroke();
    const bristle = ctx.createLinearGradient(-68, 0, -38, 0); bristle.addColorStop(0, '#c58c4d'); bristle.addColorStop(1, '#6b3c25'); ctx.fillStyle = bristle;
    ctx.beginPath(); ctx.moveTo(-39, -6); ctx.quadraticCurveTo(-58, -13, -72, -7); ctx.lineTo(-68, 0); ctx.lineTo(-72, 7); ctx.quadraticCurveTo(-55, 13, -39, 6); ctx.closePath(); ctx.fill();
    ctx.strokeStyle = '#e3b45e'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(-42, -7); ctx.lineTo(-42, 7); ctx.stroke();
    if (!reduced()) {
      ctx.globalAlpha = .2; ctx.strokeStyle = aura; ctx.lineWidth = 3;
      for (let i = 0; i < 3; i++) { const yy = (i - 1) * 5 + Math.sin(A.elapsed * 7 + i) * 2; ctx.beginPath(); ctx.moveTo(-70 - i * 8, yy); ctx.quadraticCurveTo(-92 - i * 12, yy - 7, -116 - i * 16, yy + 2); ctx.stroke(); }
    }
    ctx.restore();

    /* Aura sigil and shadow remain attached to the airborne rider as a flight marker. */
    ctx.shadowColor = aura; ctx.shadowBlur = 20; ctx.strokeStyle = aura; ctx.globalAlpha *= .65; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.ellipse(0, 22, 28, 8, 0, 0, TAU); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(-16,22); ctx.lineTo(0,14); ctx.lineTo(16,22); ctx.lineTo(0,29); ctx.closePath(); ctx.stroke();
    ctx.globalAlpha = p.invuln > 0 && p.shield <= 0 && Math.floor(p.invuln * 12) % 2 ? .42 : 1;

    /* Robe, house trim and scarf — a game sprite, not a portrait cutout. */
    const robeGradient = ctx.createLinearGradient(-20,-4,20,26); robeGradient.addColorStop(0,robe); robeGradient.addColorStop(1,'#101224');
    ctx.shadowColor = aura; ctx.shadowBlur = 13; ctx.fillStyle = robeGradient;
    ctx.beginPath(); ctx.moveTo(-17,24); ctx.quadraticCurveTo(-15,3,-8,-1); ctx.lineTo(8,-1); ctx.quadraticCurveTo(16,4,18,24); ctx.quadraticCurveTo(0,19,-17,24); ctx.fill();
    ctx.shadowBlur = 0; ctx.strokeStyle = trim; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(-9,3); ctx.quadraticCurveTo(0,9,10,3); ctx.stroke();
    ctx.fillStyle = trim; ctx.fillRect(-3,7,6,13);
    /* Knees and a small saddle strap sell the seated riding pose at gameplay scale. */
    ctx.strokeStyle = trim; ctx.lineWidth = 3; ctx.lineCap = 'round';
    ctx.beginPath(); ctx.moveTo(-9,12); ctx.quadraticCurveTo(-15,17,-20,15); ctx.moveTo(9,12); ctx.quadraticCurveTo(15,17,20,15); ctx.stroke();

    /* Hair silhouette changes with the selected player body. */
    ctx.fillStyle = feminine ? '#4a2b25' : '#171923';
    if (feminine) {
      ctx.beginPath(); ctx.ellipse(0,-10,15,16,0,0,TAU); ctx.fill();
      ctx.beginPath(); ctx.ellipse(-12,-1,7,16,-.18,0,TAU); ctx.ellipse(12,-1,7,16,.18,0,TAU); ctx.fill();
    } else {
      ctx.beginPath(); ctx.moveTo(-14,-7); ctx.lineTo(-10,-21); ctx.lineTo(-4,-17); ctx.lineTo(1,-24); ctx.lineTo(6,-17); ctx.lineTo(13,-20); ctx.lineTo(12,-5); ctx.closePath(); ctx.fill();
    }
    ctx.fillStyle = '#d9a47e'; ctx.beginPath(); ctx.ellipse(0,-9,10.5,12.5,0,0,TAU); ctx.fill();
    ctx.fillStyle = feminine ? '#4a2b25' : '#171923'; ctx.beginPath(); ctx.arc(0,-17,10.4,Math.PI,TAU); ctx.fill();
    if (feminine) { ctx.beginPath(); ctx.ellipse(-9,-9,3.4,9,-.2,0,TAU); ctx.ellipse(9,-9,3.4,9,.2,0,TAU); ctx.fill(); }
    ctx.fillStyle = '#25233a'; ctx.beginPath(); ctx.arc(-3.5,-8,1.3,0,TAU); ctx.arc(3.5,-8,1.3,0,TAU); ctx.fill();
    ctx.strokeStyle = '#9b5e58'; ctx.lineWidth = 1; ctx.beginPath(); ctx.arc(0,-4,3,0.2,Math.PI-.2); ctx.stroke();

    /* Wand and casting hand give the silhouette an unmistakable action read. */
    ctx.strokeStyle = '#8a5633'; ctx.lineWidth = 3; ctx.lineCap = 'round'; ctx.beginPath(); ctx.moveTo(11,8); ctx.lineTo(24,-10); ctx.stroke();
    ctx.fillStyle = '#d9a47e'; ctx.beginPath(); ctx.arc(10,8,3.5,0,TAU); ctx.fill();
    ctx.fillStyle = '#fff3a0'; ctx.shadowColor = aura; ctx.shadowBlur = 15; ctx.beginPath(); ctx.arc(25,-11,3.7,0,TAU); ctx.fill();
    ctx.restore();
  }

  function enemyColor(type) {
    return type === 'elite' ? ['#b12f52', '#ff936d'] : type === 'caster' ? ['#472669', '#b27aff'] : type === 'hunter' ? ['#292342', '#ff5b7a'] : ['#15192b', '#8c79c5'];
  }

  function drawEnemy(e) {
    ctx.save(); ctx.translate(e.x, e.y);
    if (e.boss) {
      const telegraph = e.arrived && e.attackCd < .46, float = reduced() ? 0 : Math.sin(e.age * 2.1) * 3;
      ctx.translate(0,float); ctx.rotate(reduced() ? 0 : Math.sin(e.age * .6) * .025);

      /* Layered void aura and attack telegraph. */
      ctx.shadowColor = telegraph ? '#ff405e' : '#a43d82'; ctx.shadowBlur = telegraph ? 38 : 24;
      ctx.fillStyle = 'rgba(56,10,51,.62)'; ctx.beginPath(); ctx.arc(0,7,e.r+16,0,TAU); ctx.fill();
      if (e.phaseShield > 0) {
        const shieldPulse = reduced() ? 0 : Math.sin(e.age * 10) * 3;
        ctx.strokeStyle = '#7df2ff'; ctx.shadowColor = '#7df2ff'; ctx.shadowBlur = 24; ctx.lineWidth = 5;
        ctx.beginPath(); ctx.arc(0, 7, e.r + 22 + shieldPulse, 0, TAU); ctx.stroke();
      }
      if (telegraph) {
        ctx.strokeStyle = '#ff5b72'; ctx.lineWidth = 4; ctx.beginPath(); ctx.arc(0,8,e.r+24-e.attackCd*24,0,TAU); ctx.stroke();
        ctx.globalAlpha = .22; ctx.fillStyle = '#ff315a'; ctx.beginPath(); ctx.arc(0,8,e.r+12,0,TAU); ctx.fill(); ctx.globalAlpha = 1;
      }
      ctx.shadowBlur = 9; ctx.strokeStyle = 'rgba(182,86,214,.42)'; ctx.lineWidth = 5; ctx.lineCap = 'round';
      for (let i=0;i<6;i++) { const a=i/6*TAU+e.age*.12, x=Math.cos(a)*(e.r+10), y=Math.sin(a)*(e.r*.7)+12; ctx.beginPath(); ctx.moveTo(x*.55,y*.55); ctx.quadraticCurveTo(x*1.15,y*.35,x,y); ctx.stroke(); }

      /* Original Abyss Lord: crown, hood, void mask and rune core. */
      const robeGradient = ctx.createLinearGradient(-48,-35,48,55); robeGradient.addColorStop(0,'#35143f'); robeGradient.addColorStop(.55,'#140e25'); robeGradient.addColorStop(1,'#080b17');
      ctx.fillStyle = robeGradient; ctx.shadowColor = '#a43d82'; ctx.shadowBlur = 18;
      ctx.beginPath(); ctx.moveTo(-49,50); ctx.quadraticCurveTo(-42,5,-28,-14); ctx.quadraticCurveTo(0,-48,28,-14); ctx.quadraticCurveTo(43,7,50,50); ctx.quadraticCurveTo(0,35,-49,50); ctx.fill();
      ctx.shadowBlur = 0; ctx.fillStyle = '#080914'; ctx.beginPath(); ctx.ellipse(0,-12,27,31,0,0,TAU); ctx.fill();
      ctx.strokeStyle = '#8c3f98'; ctx.lineWidth = 4; ctx.beginPath(); ctx.arc(0,-11,31,Math.PI*1.08,Math.PI*1.92); ctx.stroke();
      ctx.fillStyle = '#a77c9f'; ctx.beginPath(); ctx.moveTo(-15,-19); ctx.lineTo(-10,5); ctx.lineTo(0,13); ctx.lineTo(10,5); ctx.lineTo(15,-19); ctx.lineTo(0,-28); ctx.closePath(); ctx.fill();
      ctx.fillStyle = '#251126'; ctx.beginPath(); ctx.moveTo(-11,-17); ctx.lineTo(-4,-12); ctx.lineTo(-9,-8); ctx.closePath(); ctx.moveTo(11,-17); ctx.lineTo(4,-12); ctx.lineTo(9,-8); ctx.closePath(); ctx.fill();
      ctx.fillStyle = '#ff4c6a'; ctx.shadowColor = '#ff315a'; ctx.shadowBlur = 14; ctx.beginPath(); ctx.ellipse(-7,-11,4,2,-.15,0,TAU); ctx.ellipse(7,-11,4,2,.15,0,TAU); ctx.fill();
      ctx.shadowBlur = 0; ctx.strokeStyle = '#ff6b84'; ctx.lineWidth = 2.4; ctx.beginPath(); ctx.moveTo(0,12); ctx.lineTo(10,25); ctx.lineTo(0,36); ctx.lineTo(-10,25); ctx.closePath(); ctx.stroke();
      ctx.fillStyle = telegraph ? '#ff4b69' : '#8c3f98'; ctx.shadowColor = ctx.fillStyle; ctx.shadowBlur = 16; ctx.beginPath(); ctx.arc(0,25,4,0,TAU); ctx.fill();
      if (e.hitFlash > 0) { ctx.globalAlpha = clamp(e.hitFlash / .14, 0, 1) * .88; ctx.strokeStyle = '#fff7d5'; ctx.shadowColor = '#fff7d5'; ctx.shadowBlur = 28; ctx.lineWidth = 5; ctx.beginPath(); ctx.arc(0, 5, e.r + 10, 0, TAU); ctx.stroke(); ctx.globalAlpha = 1; }
      ctx.shadowBlur = 0; ctx.fillStyle = '#0b0b18'; ctx.beginPath(); ctx.moveTo(-28,-20); ctx.lineTo(-16,-39); ctx.lineTo(-5,-28); ctx.closePath(); ctx.moveTo(28,-20); ctx.lineTo(16,-39); ctx.lineTo(5,-28); ctx.closePath(); ctx.fill();
      ctx.strokeStyle = '#d06dcd'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(-16,-38); ctx.lineTo(-5,-28); ctx.moveTo(16,-38); ctx.lineTo(5,-28); ctx.stroke();
      ctx.restore(); return;
    }
    const [dark, bright] = enemyColor(e.type), telegraph = (e.type === 'caster' || e.type === 'elite') && e.y >= e.stopY - 2 && e.attackCd < .42;
    if (telegraph) { ctx.strokeStyle = '#ff637c'; ctx.lineWidth = 2.5; ctx.beginPath(); ctx.arc(0, 0, e.r + 12 - e.attackCd * 12, 0, TAU); ctx.stroke(); }
    ctx.shadowColor = bright; ctx.shadowBlur = e.type === 'elite' ? 20 : 12; ctx.fillStyle = dark;
    ctx.beginPath(); ctx.moveTo(-e.r, e.r * .8); ctx.quadraticCurveTo(-e.r * .55, -e.r * 1.3, 0, -e.r); ctx.quadraticCurveTo(e.r * .62, -e.r * 1.3, e.r, e.r * .8); ctx.quadraticCurveTo(0, e.r * .35, -e.r, e.r * .8); ctx.fill();
    ctx.shadowBlur = 8; ctx.fillStyle = bright; ctx.beginPath(); ctx.ellipse(-e.r * .28, -e.r * .2, 3.4, 2, 0, 0, TAU); ctx.ellipse(e.r * .28, -e.r * .2, 3.4, 2, 0, 0, TAU); ctx.fill();
    if (e.hp < e.maxHp) { ctx.shadowBlur = 0; ctx.fillStyle = 'rgba(255,255,255,.14)'; roundedRect(-e.r, e.r + 7, e.r * 2, 4, 2); ctx.fill(); ctx.fillStyle = bright; roundedRect(-e.r, e.r + 7, e.r * 2 * e.hp / e.maxHp, 4, 2); ctx.fill(); }
    if (e.hitFlash > 0) { ctx.globalAlpha = clamp(e.hitFlash / .14, 0, 1) * .9; ctx.strokeStyle = '#fff7d5'; ctx.shadowColor = '#fff7d5'; ctx.shadowBlur = 18; ctx.lineWidth = 4; ctx.beginPath(); ctx.arc(0, 0, e.r + 7, 0, TAU); ctx.stroke(); }
    ctx.restore();
  }

  function drawProjectiles() {
    ctx.save(); ctx.lineCap = 'round';
    for (const b of A.bullets) {
      ctx.strokeStyle = 'rgba(255,220,104,.38)'; ctx.lineWidth = 8; ctx.shadowColor = '#ffd867'; ctx.shadowBlur = 12;
      ctx.beginPath(); ctx.moveTo(b.px, b.py); ctx.lineTo(b.x, b.y); ctx.stroke();
      ctx.fillStyle = '#fff4af'; ctx.beginPath(); ctx.arc(b.x, b.y, b.r, 0, TAU); ctx.fill();
    }
    for (const b of A.enemyBullets) {
      ctx.strokeStyle = 'rgba(255,54,92,.38)'; ctx.lineWidth = 7; ctx.shadowColor = '#ff315d'; ctx.shadowBlur = 12;
      ctx.beginPath(); ctx.moveTo(b.px, b.py); ctx.lineTo(b.x, b.y); ctx.stroke();
      ctx.save(); ctx.translate(b.x, b.y); ctx.rotate(Math.atan2(b.vy, b.vx) + Math.PI / 4); ctx.fillStyle = '#ff5a78'; ctx.fillRect(-b.r, -b.r, b.r * 2, b.r * 2); ctx.restore();
    }
    ctx.restore();
  }

  function drawParticles() {
    ctx.save(); ctx.globalCompositeOperation = 'lighter';
    for (const p of A.particles) { ctx.globalAlpha = clamp(p.life / p.max, 0, 1); ctx.fillStyle = p.color; ctx.beginPath(); ctx.arc(p.x, p.y, p.r * clamp(p.life / p.max + .25, .25, 1), 0, TAU); ctx.fill(); }
    ctx.restore();
  }

  function drawImpactFx() {
    ctx.save(); ctx.globalCompositeOperation = 'lighter'; ctx.lineCap = 'round';
    for (const fx of A.impacts) {
      const alpha = clamp(fx.life / fx.max, 0, 1);
      ctx.globalAlpha = alpha; ctx.strokeStyle = fx.color; ctx.shadowColor = fx.color; ctx.shadowBlur = 16; ctx.lineWidth = 3 + fx.power * 2;
      ctx.beginPath(); ctx.arc(fx.x, fx.y, fx.r, 0, TAU); ctx.stroke();
      ctx.globalAlpha = alpha * .72; ctx.lineWidth = 2;
      for (let i = 0; i < 8; i++) { const a = i / 8 * TAU + fx.r * .02, inner = fx.r * .55, outer = fx.r + 10 + fx.power * 7; ctx.beginPath(); ctx.moveTo(fx.x + Math.cos(a) * inner, fx.y + Math.sin(a) * inner); ctx.lineTo(fx.x + Math.cos(a) * outer, fx.y + Math.sin(a) * outer); ctx.stroke(); }
    }
    ctx.shadowBlur = 0; ctx.textAlign = 'center'; ctx.font = '900 16px system-ui';
    for (const hit of A.hitTexts) { ctx.globalAlpha = clamp(hit.life / hit.max, 0, 1); ctx.fillStyle = hit.color; ctx.strokeStyle = 'rgba(6,7,18,.82)'; ctx.lineWidth = 4; ctx.strokeText(hit.text, hit.x, hit.y); ctx.fillText(hit.text, hit.x, hit.y); }
    ctx.restore();
  }

  function drawMessages() {
    if (A.countdown > 0) {
      const index = clamp(Math.floor(A.countdown), 0, 3);
      ctx.save(); ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillStyle = '#fff3b5'; ctx.shadowColor = '#ff875e'; ctx.shadowBlur = 28; ctx.font = '950 76px system-ui'; ctx.fillText(copy().countdown[index], WORLD.w / 2, WORLD.h / 2); ctx.restore();
    } else if (A.messageTime > 0) {
      ctx.save(); ctx.textAlign = 'center'; ctx.fillStyle = '#ffc4ce'; ctx.shadowColor = '#ff315a'; ctx.shadowBlur = 18; ctx.font = '950 34px system-ui'; ctx.fillText(A.message, WORLD.w / 2, WORLD.h * .46); ctx.restore();
    }
  }

  function draw() {
    if (!A) return;
    drawBackground();
    ctx.save();
    if (A.shake > 0 && !reduced()) ctx.translate((Math.random() - .5) * A.shake, (Math.random() - .5) * A.shake);
    drawProjectiles();
    for (const e of A.enemies) drawEnemy(e);
    drawPlayer(); drawParticles(); drawImpactFx(); drawMessages();
    ctx.restore();
    if (A.flash > 0 && !reduced()) { ctx.fillStyle = `rgba(255,50,82,${A.flash * .65})`; ctx.fillRect(0, 0, WORLD.w, WORLD.h); }
  }

  function updateHud(force = false) {
    if (!A) return;
    const c = copy(), p = A.player, left = Math.max(0, Math.ceil(A.cfg.duration - A.elapsed));
    setText('actionHp', '♥'.repeat(p.hp) + '♡'.repeat(Math.max(0, p.maxHp - p.hp)));
    setText('actionTime', String(left)); $('actionTime').classList.toggle('danger', left <= 10);
    setText('actionScore', Math.floor(A.score).toLocaleString()); setText('actionKills', String(A.kills));
    const castReady = A.manualCd <= 0, shieldReady = p.shieldCd <= 0;
    setText('actionCastState', castReady ? c.ready : `${A.manualCd.toFixed(1)}s`);
    setText('actionShieldState', shieldReady ? c.ready : `${p.shieldCd.toFixed(1)}s`);
    $('actionCast').disabled = A.paused || A.countdown > 0 || !castReady;
    $('actionShield').disabled = A.paused || A.countdown > 0 || !shieldReady;
    $('actionCast').classList.toggle('ready', castReady && A.countdown <= 0 && !A.paused);
    $('actionShield').classList.toggle('ready', shieldReady && A.countdown <= 0 && !A.paused);
    const combo = $('actionCombo'); combo.classList.toggle('on', A.combo >= 2); combo.querySelector('b').textContent = `×${A.combo}`; combo.querySelector('small').textContent = c.combo;
    const waveStart = A.waveTimes[A.wave - 1] || 0, waveEnd = A.waveTimes[A.wave] || A.cfg.duration;
    const waveRatio = clamp((A.elapsed - waveStart) / Math.max(1, waveEnd - waveStart), 0, 1);
    setText('actionWaveText', `${A.wave} / ${A.waveTotal}`); $('actionWaveFill').style.transform = `scaleX(${waveRatio})`;
    if (A.boss && !A.boss.dead) {
      const ratio = clamp(A.boss.hp / A.boss.maxHp, 0, 1);
      $('actionBossBar').hidden = false; $('actionBossFill').style.transform = `scaleX(${ratio})`; setText('actionBossHpText', `${Math.max(0,A.boss.hp)} / ${A.boss.maxHp}`);
      $('actionBossBar').setAttribute('aria-valuemax', String(A.boss.maxHp)); $('actionBossBar').setAttribute('aria-valuenow', String(Math.max(0, A.boss.hp)));
    }
    if (force) announceStatus();
  }

  function announceStatus() {
    if (!A) return;
    $('actionLive').textContent = copy().live(A.player.hp, A.player.maxHp, Math.max(0, Math.ceil(A.cfg.duration - A.elapsed)), A.player.shieldCd <= 0, Boolean(A.boss && !A.boss.dead));
  }

  function frame(now) {
    if (!A || !A.active) return;
    const blocked = A.paused || document.hidden || (SETTINGS_LAYER() && !SETTINGS_LAYER().hidden);
    if (blocked) {
      A.last = now; if (!A.wasBlocked) { A.wasBlocked = true; updateHud(); draw(); } raf = requestAnimationFrame(frame); return;
    }
    A.wasBlocked = false;
    const delta = Math.min(.05, Math.max(0, (now - A.last) / 1000)); A.last = now; A.acc += delta;
    const step = 1 / 120; let loops = 0;
    while (A.acc >= step && loops < 6 && A && A.active) { update(step); if (!A || !A.active) return; A.acc -= step; loops++; }
    if (now >= A.hudNext) { A.hudNext = now + 90; updateHud(); }
    draw(); raf = requestAnimationFrame(frame);
  }

  /* ---------- result / persistence ---------- */
  function finishAction(won, reason) {
    if (!A || !A.active) return;
    const state = A, cfg = A.cfg;
    A.active = false; if (raf) cancelAnimationFrame(raf); raf = 0;
    const remaining = Math.max(0, cfg.duration - state.elapsed), victoryBonus = won ? 4500 + remaining * 140 : 0;
    const score = Math.round((state.score + state.player.hp * 400 + victoryBonus) * cfg.multiplier);
    const result = {
      won, reason, mode: state.mode, score, kills: state.kills, combo: state.maxCombo,
      secs: Math.min(cfg.duration, state.elapsed), hp: state.player.hp, maxHp: state.player.maxHp,
      newRecord: false, unlocked: false
    };
    ensureActionData();
    const prior = S.actionBest[state.mode], priorScore = prior?.score || 0, firstWin = S.actionWins === 0;
    result.newRecord = won ? (!prior?.won || score > priorScore) : (!prior || (!prior.won && score > priorScore));
    if (result.newRecord) S.actionBest[state.mode] = { score, kills: result.kills, combo: result.combo, secs: result.secs, hp: result.hp, won };
    S.actionPlays++;
    S.actionBestCombo = Math.max(S.actionBestCombo, result.combo);
    if (won) { S.actionWins++; S.actionWinsByMode[state.mode]++; result.unlocked = firstWin; }
    save(); paintMenuEntry(); lastResult = result;
    try { droneOff(); won ? sWin() : impactFx(.9); } catch (e) {}
    paintResult(result);
    A = null; keys.clear(); pointerId = null;
    go('s-actionres', false);
    setTimeout(() => $('actionResultTitle')?.focus({ preventScroll: true }), 100);
  }

  function paintResult(result) {
    if (!result) return;
    const c = copy();
    setText('actionResultEmblem', result.won ? '⚔' : '⬡');
    setText('actionResultTitle', result.won ? c.winTitle : c.loseTitle);
    setText('actionResultLead', result.won ? c.winLead : c.loseLead);
    setText('actionResultScore', result.score.toLocaleString());
    setText('actionResultTime', `${result.secs.toFixed(1)}s`); setText('actionResultCombo', `×${result.combo}`);
    setText('actionResultHp', `${Math.max(0,result.hp)} / ${result.maxHp}`); setText('actionResultMode', modeName(result.mode));
    $('actionNewRecord').hidden = !result.newRecord;
    $('actionUnlock').hidden = !result.unlocked; setText('actionUnlock', c.unlock);
  }

  /* ---------- pause, input and integration ---------- */
  function setActionPaused(on) {
    if (!A || !A.active || Boolean(on) === A.paused) return;
    A.paused = Boolean(on); keys.clear(); pointerId = null; A.last = performance.now();
    $('actionPause').hidden = !A.paused; $('actionCast').disabled = A.paused || A.manualCd > 0; $('actionShield').disabled = A.paused || A.player.shieldCd > 0;
    canvas.tabIndex = A.paused ? -1 : 0; $('pauseBtn').setAttribute('aria-label', A.paused ? copy().resumeLabel : copy().pauseLabel);
    if (A.paused) setTimeout(() => $('actionResume').focus({ preventScroll: true }), 30);
    else { canvas.focus({ preventScroll: true }); announceStatus(); }
  }

  function pointerToWorld(event) {
    const r = canvas.getBoundingClientRect();
    return { x: clamp((event.clientX - r.left) / r.width * WORLD.w, 28, WORLD.w - 28), y: clamp((event.clientY - r.top) / r.height * WORLD.h, 94, WORLD.h - 28) };
  }

  canvas.addEventListener('pointerdown', event => {
    if (!A || !A.active || A.paused || event.isPrimary === false) return;
    event.preventDefault(); pointerId = event.pointerId; canvas.setPointerCapture?.(event.pointerId); A.pointerTarget = pointerToWorld(event); canvas.focus({ preventScroll: true });
  });
  canvas.addEventListener('pointermove', event => {
    if (!A || !A.active || A.paused || pointerId !== event.pointerId) return;
    event.preventDefault(); A.pointerTarget = pointerToWorld(event);
  });
  const releasePointer = event => { if (pointerId === event.pointerId) pointerId = null; };
  canvas.addEventListener('pointerup', releasePointer); canvas.addEventListener('pointercancel', releasePointer);

  const moveCode = code => ({ ArrowLeft:'arrowleft', ArrowRight:'arrowright', ArrowUp:'arrowup', ArrowDown:'arrowdown', KeyW:'w', KeyA:'a', KeyS:'s', KeyD:'d' })[code];
  document.addEventListener('keydown', event => {
    if (cur !== 's-action' || !A || !A.active) return;
    if (SETTINGS_LAYER() && !SETTINGS_LAYER().hidden) return;
    const pauseKey = event.code === 'Escape' || event.code === 'KeyP';
    if (A.paused) { if (pauseKey && !event.repeat) { event.preventDefault(); event.stopPropagation(); setActionPaused(false); } return; }
    if (event.target?.closest?.('button,a,input,select,textarea,[contenteditable="true"]')) return;
    const movement = moveCode(event.code), shieldKey = event.code === 'KeyQ' || event.code === 'ShiftLeft' || event.code === 'ShiftRight', castKey = event.code === 'Space';
    if (movement || shieldKey || castKey || pauseKey) { event.preventDefault(); event.stopPropagation(); }
    if (shieldKey && !event.repeat) activateShield();
    else if (castKey && !event.repeat) firePlayer(true);
    else if (pauseKey && !event.repeat) setActionPaused(true);
    else if (movement) keys.add(movement);
  }, true);
  document.addEventListener('keyup', event => { if (cur === 's-action') { const movement = moveCode(event.code); if (movement) keys.delete(movement); } }, true);
  addEventListener('blur', () => { keys.clear(); pointerId = null; if (cur === 's-action' && A?.active && !A.paused) setActionPaused(true); });
  document.addEventListener('visibilitychange', () => { if (document.hidden && cur === 's-action' && A?.active && !A.paused) setActionPaused(true); });

  $('actionModeGrid').onclick = event => { const button = event.target.closest('[data-action-mode]'); if (button) selectMode(button.dataset.actionMode); };
  $('actionModeGrid').addEventListener('keydown', event => {
    if (!['ArrowLeft','ArrowRight','ArrowUp','ArrowDown'].includes(event.key)) return;
    event.preventDefault(); const buttons = [...document.querySelectorAll('[data-action-mode]')], current = Math.max(0, buttons.indexOf(document.activeElement));
    const delta = event.key === 'ArrowRight' || event.key === 'ArrowDown' ? 1 : -1, next = buttons[(current + delta + buttons.length) % buttons.length]; selectMode(next.dataset.actionMode); next.focus();
  });
  const trapFocus = (layer, event) => {
    if (event.key !== 'Tab' || layer.hidden) return; const items = [...layer.querySelectorAll('button:not(:disabled),[href],[tabindex]:not([tabindex="-1"])')]; if (!items.length) return;
    const first = items[0], last = items[items.length - 1]; if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); } else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
  };
  $('actionLobby').addEventListener('keydown', event => trapFocus($('actionLobby'), event)); $('actionPause').addEventListener('keydown', event => trapFocus($('actionPause'), event));
  $('actionStart').onclick = () => { sTap(); startAction(); };
  $('actionCast').addEventListener('pointerdown', event => event.stopPropagation());
  $('actionCast').onclick = event => { event.stopPropagation(); firePlayer(true); };
  $('actionShield').addEventListener('pointerdown', event => event.stopPropagation());
  $('actionShield').onclick = event => { event.stopPropagation(); activateShield(); };
  $('actionResume').onclick = () => { sTap(); setActionPaused(false); };
  $('actionQuit').onclick = () => { sTap(); renderMenu(); go('s-menu', false); if (hist.at(-1) === 's-menu') hist.pop(); };
  $('actionReplay').onclick = () => { sTap(); selectedMode = lastResult?.mode || selectedMode; go('s-action', false); };
  $('actionMenu').onclick = () => { sTap(); renderMenu(); go('s-menu', false); if (hist.at(-1) === 's-menu') hist.pop(); };
  entry.onclick = () => { sTap(); go('s-action'); };

  const priorPauseClick = $('pauseBtn').onclick;
  $('pauseBtn').onclick = function(event) {
    if (cur === 's-action') { sTap(); if (A?.active) setActionPaused(!A.paused); return; }
    priorPauseClick?.call(this, event);
  };

  const priorGo = go;
  go = function(id, push = true) {
    if (cur === 's-action' && id !== 's-action') haltAction();
    priorGo(id, push);
    document.body.classList.toggle('action-active', id === 's-action' || id === 's-actionres');
    if (id === 's-action') {
      if (!A?.active) showActionSetup();
      else $('pauseBtn').style.display = '';
    } else if (id !== 's-play') $('pauseBtn').style.display = 'none';
    if (id === 's-menu') paintMenuEntry();
  };

  const priorRenderMenu = renderMenu;
  renderMenu = function() { priorRenderMenu(); ensureActionData(); paintMenuEntry(); };

  const priorAchievementDefs = achievementDefs;
  achievementDefs = function() {
    const defs = priorAchievementDefs(), c = copy();
    defs.splice(Math.max(0, defs.length - 1), 0, ['⚔', c.badgeName, c.badgeDesc, S.actionWins > 0]);
    return defs;
  };

  const priorRenderDiploma = renderDiploma;
  renderDiploma = function() {
    priorRenderDiploma();
    const stats = $('dipStats');
    if (stats && S.actionWins > 0 && !stats.querySelector('.action-dip-stat')) {
      const span = document.createElement('span'); span.className = 'action-dip-stat';
      span.textContent = `⚔ ${lang === 'ko' ? '아레나 승리' : 'Arena wins'} ${S.actionWins}`; stats.appendChild(span);
    }
  };

  const priorPaint = paint;
  paint = function() { priorPaint(); ensureActionData(); paintActionText(); paintMenuEntry(); };

  paintActionText();
  renderMenu();
})();
