// 산리오 카트 — 게임 셸: 캐릭터 고르기 → 레이스 → 결과
(function () {
  'use strict';
  window.SK = window.SK || {};

  const W = 960, H = 540;
  const LAPS = 2;

  let canvas, ctx, dpr = 1, scale = 1, offX = 0, offY = 0;
  let trackTex = null;
  let scene = 'select';
  const audio = SK.createAudio();
  let sfxPrev = null, lastCount = null;
  let selStep = 0;          // 0 캐릭터 1 코스
  let trackIndex = 0;
  let time = 0, raceTime = 0, countdown = 3.6;
  let karts = [], player = null, chosen = 0;
  let items = [], boxes = [], hearts = [];
  let bestLap = null, lastLapStart = 0, playerBestLap = null;
  let resultOrder = [];
  let challenge = { drift: 0, items: 0 }, cheer = '', cheerTime = 0, medals = 0;
  let rivalMode = false, rival = null, rivalBeat = false, rivalUnlockedNow = false, rivalRec = { unlocked: false, won: false, losses: 0 };
  // 업그레이드(2026-09-27): 코스 거리·장난꾸러기·그랑프리·차고
  let garage = SK.Garage.load();
  let fx = null, coinPicks = 0, earned = null;
  let gp = null, cupSel = -1;           // 코스 고르기 화면에서 컵을 고르면 0/1, 코스면 -1
  let strikes = [], vsay = '', vsayTime = 0, vsayColor = '#ff5ca8';
  let trail = [], confetti = [], podium = null;
  let garageSlot = 'paint', garageMsg = '';
  const FINISH_COINS = [10, 6, 4, 2, 2, 2];
  const TROPHY_COINS = [30, 20, 10];
  const MEDAL = ['', '🥇', '🥈', '🥉'];
  function shuffle(a) { for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; }
  function say(v, text) { vsay = '😈 ' + v.spec.name + '  ' + text; vsayColor = v.spec.horn || '#ff5ca8'; vsayTime = 2.4; }
  const bestKey = () => 'sanrio-kart:best:' + SK.TRACKS[trackIndex].id;
  const medalKey = () => 'sanrio-kart:medals:' + SK.TRACKS[trackIndex].id;
  function celebrate(message) { cheer = message; cheerTime = 2.2; }
  function readRecords() {
    try { bestLap = Number(localStorage.getItem(bestKey())) || null; medals = Math.max(0, Math.min(3, Number(localStorage.getItem(medalKey())) || 0)); }
    catch (_) { bestLap = null; medals = 0; }
    rivalRec = readRival();
  }
  // 라이벌 레이스 기록: 코스별 { unlocked, won, losses }. 일반 기록·배지와 섞지 않는다.
  const rivalKey = () => 'sanrio-kart:rival:' + SK.TRACKS[trackIndex].id;
  function readRival() {
    try {
      const r = JSON.parse(localStorage.getItem(rivalKey()) || '{}') || {};
      const unlocked = r.unlocked === true;
      return { unlocked, won: unlocked && r.won === true,
        losses: unlocked && Number.isFinite(Number(r.losses)) ? Math.max(0, Math.min(9, Math.floor(Number(r.losses)))) : 0 };
    } catch (_) { return { unlocked: false, won: false, losses: 0 }; }
  }
  function writeRival() { try { localStorage.setItem(rivalKey(), JSON.stringify(rivalRec)); } catch (_) {} }
  function earnedMedals() { return 1 + Number(challenge.drift >= 2) + Number(challenge.items >= 2); }
  // height 를 낮추면 지면 렌더는 그대로다(행별 배율 = depth/fov 로 height 와 무관).
  // 대신 화면 아래쪽이 더 가까운 땅을 비추게 되어, 카메라 118 뒤에 있는
  // 플레이어의 실제 투영 위치가 화면 안(y≈440)으로 들어온다.
  // 예전에는 y=644 라 옆에 붙은 AI 카트가 화면 밖으로 밀려 보이지 않았고,
  // 플레이어만 고정 크기 1.15 로 그려서 46% 크게 보였다.
  const cam = { x: 0, y: 0, angle: 0, height: 75, fov: 320, horizon: 0.44 };

  const keys = Object.create(null);
  const touch = { steer: 0, drift: false, item: false, leftId: null, rightId: null };

  // ---------- 화면 맞춤 ----------
  function resize() {
    dpr = Math.min(2, window.devicePixelRatio || 1);
    const cw = window.innerWidth, ch = window.innerHeight;
    canvas.width = Math.round(cw * dpr);
    canvas.height = Math.round(ch * dpr);
    canvas.style.width = cw + 'px';
    canvas.style.height = ch + 'px';
    scale = Math.min(cw / W, ch / H);
    offX = (cw - W * scale) / 2;
    offY = (ch - H * scale) / 2;
  }

  function toLogical(e) {
    const r = canvas.getBoundingClientRect();
    return { x: (e.clientX - r.left - offX) / scale, y: (e.clientY - r.top - offY) / scale };
  }

  // ---------- 레이스 준비 ----------
  function startRace(withRival) {
    rivalRec = readRival();
    rivalMode = !!withRival && rivalRec.unlocked;
    // 고른 코스만 만든다. 2048² 텍스처를 여러 장 들고 있으면 메모리에 부담이라
    // 이전 것은 캔버스 크기를 0으로 만들어 놓아 준다.
    const def = SK.TRACKS[trackIndex];
    if (!SK.Track || SK.Track.def !== def) {
      if (trackTex) { trackTex.width = 0; trackTex.height = 0; trackTex = null; }
      SK.Track = SK.buildTrack(def);
      trackTex = SK.buildTrackTexture(SK.Track);
    }
    const T = SK.Track;
    karts = [];
    // 출전 명단(6대): 그랑프리는 컵 명단 그대로, 라이벌은 가장 빠른 친구 + 친구들,
    // 보통 경주는 장난꾸러기 둘 + 친구 셋.
    const me = SK.CHARACTERS[chosen];
    let lineup;
    if (gp) lineup = gp.lineup;
    else if (rivalMode) {
      const others = SK.CHARACTERS.filter(c => c !== me);
      const fastest = others.reduce((best, c) => c.top > best.top ? c : best, others[0]);
      lineup = [me, fastest].concat(others.filter(c => c !== fastest).slice(0, 4));
    } else {
      lineup = [me].concat(shuffle(SK.VILLAINS.slice()).slice(0, 2), shuffle(SK.CHARACTERS.filter(c => c !== me)).slice(0, 3));
    }
    lineup.forEach((spec, slot) => {
      // 출발선 뒤쪽에 두 줄로 세운다
      const back = 70 + Math.floor(slot / 2) * 78;
      const side = (slot % 2 ? 1 : -1) * 56;
      const a = T.startAngle;
      const fx = Math.cos(a), fy = Math.sin(a);
      const k = new SK.Kart(spec, {
        x: T.start.x - fx * back + (-fy) * side,
        y: T.start.y - fy * back + (fx) * side,
        angle: Math.atan2(fx, -fy),
        isPlayer: slot === 0
      });
      k.progress = T.nearest(k.x, k.y).point.dist;
      k.total = k.progress - T.length;
      k.lap = -1; // 출발선 뒤에서 첫 통과는 0바퀴, 완주로 세지 않는다.
      k.lineupIndex = slot; k.coins = 0;
      if (spec.villain) { k.prank = spec.prank; k.prankClock = 6 + Math.random() * 5; }
      karts.push(k);
      if (k.isPlayer) { player = k; k.look = SK.Garage.look(garage); }
    });
    rival = null;
    if (rivalMode) {
      rival = karts[1];
      // 세 번 연달아 지면 3%씩, 최대 6%까지 라이벌이 느려진다.
      rival.rival = { assist: 1 - Math.min(0.06, Math.floor(rivalRec.losses / 3) * 0.03) };
    }

    // 아이템 상자: 중심선을 따라 일정 간격
    boxes = [];
    for (let d = 500; d < T.length; d += 1000) {
      let i = 0, walked = 0;
      while (walked < d && i < T.center.length - 1) {
        const a = T.center[i], b = T.center[i + 1];
        walked += Math.hypot(b.x - a.x, b.y - a.y);
        i++;
      }
      const p = T.center[i];
      const nxt = T.center[(i + 1) % T.center.length];
      const ang = Math.atan2(nxt.y - p.y, nxt.x - p.x);
      const nx = -Math.sin(ang), ny = Math.cos(ang);
      [-54, 54].forEach(off => {
        boxes.push({ x: p.x + nx * off, y: p.y + ny * off, alive: true, respawn: 0 });
      });
    }

    items = [];
    hearts = [];
    // 코스 거리: 발판은 바닥 그림에 그려 넣는다(코스를 새로 구울 때만)
    fx = SK.buildFx(T);
    if (!trackTex.padded) { SK.paintPads(trackTex, fx); trackTex.padded = true; }
    coinPicks = 0; earned = null; strikes = []; vsayTime = 0; trail = [];
    if (gp) gp.scored = false;
    raceTime = 0; countdown = 3.6; lastLapStart = 0;
    playerBestLap = null;
    resultOrder = [];
    challenge = { drift: 0, items: 0 }; cheer = ''; cheerTime = 0;
    rivalBeat = false; rivalUnlockedNow = false;
    Object.keys(keys).forEach(key => { keys[key] = false; });
    Object.assign(touch, { steer: 0, drift: false, item: false, leftId: null, rightId: null });
    scene = 'race';
    sfxPrev = null; lastCount = null;
    audio.startMusic(trackIndex);
    readRecords();
  }

  // ---------- 입력 ----------
  let autoPilot = false;
  function playerInput() {
    if (autoPilot && player) { const d = SK.driveAI(player, player.total, 1 / 60); d.useItem = !!player.item; return d; }
    let steer = 0;
    if (keys.ArrowLeft || keys.KeyA) steer -= 1;
    if (keys.ArrowRight || keys.KeyD) steer += 1;
    steer += touch.steer;
    steer = Math.max(-1, Math.min(1, steer));
    const drift = !!(keys.Space || touch.drift);
    const useItem = !!(keys.ArrowUp || keys.KeyW || touch.item);
    return { steer, drift, useItem };
  }

  // ---------- 갱신 ----------
  function update(dt) {
    time += dt;
    cheerTime = Math.max(0, cheerTime - dt);
    if (scene !== 'race') return;

    if (countdown > 0) {
      const n0 = Math.ceil(countdown - 0.6);
      const label = n0 > 0 ? String(n0) : 'GO';
      if (label !== lastCount) { lastCount = label; audio.beep(n0 > 0 ? 520 : 880, n0 > 0 ? 0.26 : 0.5); }
      countdown -= dt;
      // 출발 전엔 카메라만 카트 뒤에 붙여 둔다
      updateCamera(dt, true);
      return;
    }
    raceTime += dt;

    const input = playerInput();
    // 칸막이에 부딪히면 하트가 튄다 (부딪힌 건 물리 쪽이 알려 준다)
    for (const k of karts) {
      if (!k.bumpFlash) continue;
      k.bumpFlash = 0;
      if (k === player) audio.sfx('bump');
      for (let i = 0; i < 7; i++) {
        hearts.push({
          x: k.x, y: k.y,
          ox: (Math.random() - 0.5) * 46,
          rise: 44 + Math.random() * 44,
          rot: (Math.random() - 0.5) * 0.9,
          sc: 1.1 + Math.random() * 0.9,
          life: 0.95, max: 0.95
        });
      }
    }
    for (const h of hearts) h.life -= dt;
    hearts = hearts.filter(h => h.life > 0);

    // 소리는 상태 변화를 보고 낸다. 물리 쪽에 오디오를 끌어들이지 않기 위해서다.
    (function watchSfx() {
      const p = player;
      if (!p) return;
      const now = { boost: p.boost > 0, spin: p.spin > 0, item: p.item, lap: p.lap };
      const q = sfxPrev;
      if (q) {
        if (now.spin && !q.spin) audio.sfx('hit');
        else if (now.boost && !q.boost && !q.item) audio.sfx('boost');
        if (now.item && !q.item) audio.sfx('pickup');
        // 무엇을 썼는지 귀로도 알 수 있게 아이템 종류별로 소리를 낸다
        if (!now.item && q.item) audio.sfx('use:' + q.item);
        if (now.lap > q.lap && now.lap > 0) audio.sfx('lap');
      }
      sfxPrev = now;
    })();

    for (const k of karts) {
      if (k.finished) { k.speed *= 1 - dt * 1.6; continue; }
      const surf = SK.Track.surfaceAt(k.x, k.y).kind;
      const drive = k.isPlayer ? input : SK.driveAI(k, player.total, dt);
      const driftBefore = k.driftCharge;
      k.update(dt, drive, surf);
      if (k.isPlayer && driftBefore > 0.6 && k.drift === 0 && k.boost > 0) {
        challenge.drift++; celebrate(challenge.drift === 2 ? '★ 드리프트 배지 획득!' : '멋진 드리프트! 슈우웅!');
      }

      const prevLap = k.lap;
      const done = k.updateProgress(LAPS);
      if (k.isPlayer && k.lap > prevLap && prevLap < 0) lastLapStart = raceTime;
      if (k.isPlayer && k.lap > prevLap && prevLap >= 0) {
        const lap = raceTime - lastLapStart;
        lastLapStart = raceTime;
        if (!playerBestLap || lap < playerBestLap) playerBestLap = lap;
      }
      if (done) {
        k.finished = true;
        k.finishTime = raceTime;
        resultOrder.push(k);
        if (k.isPlayer && playerBestLap) {
          if (!bestLap || playerBestLap < bestLap) {
            bestLap = playerBestLap;
            try { localStorage.setItem(bestKey(), String(bestLap)); } catch (_) {}
          }
        }
      }
    }

    SK.updateFx(fx, karts, dt, time, onFx);
    updateVillains(dt);
    updateItems(dt, input);
    updateCollisions(dt);
    updatePlaces();
    updateCamera(dt, false);

    if (player.finished) {
      // 남은 AI를 마저 달리게 두되, 잠시 뒤 결과 화면
      if (raceTime - player.finishTime > 1.8) {
        karts.forEach(k => { if (!k.finished) { k.finished = true; k.finishTime = raceTime + 99; resultOrder.push(k); } });
        scene = 'result';
        settleRival();
        settleCoins();
        if (gp) scoreCup();
        // 도전 배지는 일반 경주에서만 기록한다.
        if (!rivalMode) {
          medals = Math.max(medals, earnedMedals());
          try { localStorage.setItem(medalKey(), String(medals)); } catch (_) {}
        }
        audio.stopMusic();
        audio.fanfare();
      }
    }
  }

  function updateItems(dt, input) {
    // 상자 먹기
    for (const b of boxes) {
      if (!b.alive) { b.respawn -= dt; if (b.respawn <= 0) b.alive = true; continue; }
      for (const k of karts) {
        if (Math.hypot(k.x - b.x, k.y - b.y) < 42) {
          b.alive = false; b.respawn = 7;
          if (!k.item) k.item = Math.random() < 0.55 ? 'boost' : 'ribbon';
          break;
        }
      }
    }
    // 플레이어 사용
    if (input.useItem && player.item && player.itemCooldown <= 0 && !player.finished) {
      useItem(player);
    }
    // AI 사용 — 얻으면 잠시 뒤 그냥 쓴다
    for (const k of karts) {
      if (k.isPlayer || !k.item || k.finished) continue;
      if (k.rival) { rivalItem(k, dt); continue; }
      k.aiItemDelay = (k.aiItemDelay || 1.2) - dt;
      if (k.aiItemDelay <= 0) { useItem(k); k.aiItemDelay = 1.2; }
    }
    // 던져진 리본
    for (const it of items) {
      it.life -= dt;
      it.x += Math.sin(it.angle) * it.speed * dt;
      it.y -= Math.cos(it.angle) * it.speed * dt;
      it.speed *= 1 - dt * 1.1;
      it.armed = (it.armed || 0) - dt;
      for (const k of karts) {
        if ((k === it.owner && it.armed > -1.5) || it.life <= 0 || k.finished || k.hop > 0) continue;
        if (Math.hypot(k.x - it.x, k.y - it.y) < 40) {
          if (it.kind === 'balloon' || it.kind === 'bat') {
            k.spin = it.kind === 'bat' ? 0.6 : 0.8; k.speed *= 0.55; k.coins = Math.max(0, (k.coins || 0) - 2);
            if (k === player) celebrate(it.kind === 'bat' ? '박쥐 풍선에 깜짝! 🦇' : '물풍선에 첨벙! 💦');
          } else k.slip = 1.1;
          it.life = 0;
          break;
        }
      }
    }
    items = items.filter(it => it.life > 0);
  }

  // 라이벌은 리본을 쥐고 있다가 플레이어가 앞서 달릴 때 던진다.
  function rivalItem(k, dt) {
    k.aiItemDelay = (k.aiItemDelay || 0.6) - dt;
    if (k.aiItemDelay > 0) return;
    const gap = k.total - player.total;                 // + 이면 라이벌이 앞
    const use = k.item === 'ribbon' ? gap < 0 && gap > -700 : true;   // 부스터는 바로 쓴다
    if (use) { useItem(k); k.aiItemDelay = 0.8; }
  }

  function settleRival() {
    if (rivalMode && rival) {
      rivalBeat = player.finishTime < rival.finishTime;
      rivalRec = { unlocked: true, won: rivalRec.won || rivalBeat, losses: rivalBeat ? 0 : rivalRec.losses + 1 };
      writeRival();
    } else if (!rivalMode && player.place === 1 && !rivalRec.unlocked) {
      rivalUnlockedNow = true;
      rivalRec = { unlocked: true, won: false, losses: 0 };
      writeRival();
    }
  }

  function useItem(k) {
    if (k.isPlayer) { challenge.items++; celebrate(challenge.items === 2 ? '★ 아이템 배지 획득!' : k.item === 'boost' ? '별빛 부스터!' : '리본 발사!'); }
    if (k.item === 'boost') {
      k.boost = Math.max(k.boost, 1.15);
    } else if (k.item === 'ribbon') {
      items.push({ x: k.x, y: k.y, angle: k.angle, speed: 520, life: 2.4, owner: k });
    }
    k.item = null;
    k.itemCooldown = 0.3;
  }

  function updateCollisions(dt) {
    for (let i = 0; i < karts.length; i++) {
      for (let j = i + 1; j < karts.length; j++) {
        const a = karts[i], b = karts[j];
        const dx = b.x - a.x, dy = b.y - a.y;
        const d = Math.hypot(dx, dy);
        if (d > 46 || d < 0.001) continue;
        const push = (46 - d) * 0.5;
        const nx = dx / d, ny = dy / d;
        a.x -= nx * push; a.y -= ny * push;
        b.x += nx * push; b.y += ny * push;
      }
    }
  }

  function updatePlaces() {
    const sorted = karts.slice().sort((a, b) => {
      if (a.finished && b.finished) return a.finishTime - b.finishTime;
      if (a.finished) return -1;
      if (b.finished) return 1;
      return b.total - a.total;
    });
    sorted.forEach((k, i) => { k.place = i + 1; });
  }

  function updateCamera(dt, snap) {
    const behind = 118;
    const tx = player.x - Math.sin(player.angle) * behind;
    const ty = player.y + Math.cos(player.angle) * behind;
    const damp = snap ? 1 : 1 - Math.pow(0.0015, dt);
    cam.x += (tx - cam.x) * damp;
    cam.y += (ty - cam.y) * damp;
    let diff = player.angle - cam.angle;
    while (diff > Math.PI) diff -= Math.PI * 2;
    while (diff < -Math.PI) diff += Math.PI * 2;
    cam.angle += diff * (snap ? 1 : 1 - Math.pow(0.002, dt));
  }

  // ---------- 그리기 ----------
  function drawSky() {
    const g = ctx;
    const horizonY = Math.floor(H * cam.horizon);
    const sky = g.createLinearGradient(0, 0, 0, horizonY);
    const TH = SK.Track.theme;
    sky.addColorStop(0, TH.sky1);
    sky.addColorStop(1, TH.sky2);
    g.fillStyle = sky;
    g.fillRect(0, 0, W, horizonY);
    // 먼 구름 — 카메라 각도에 따라 흐른다
    const shift = -cam.angle * 190;
    g.fillStyle = TH.cloud;
    for (let i = 0; i < (TH.night ? 0 : 7); i++) {
      const cx = ((i * 260 + shift) % (W + 400) + W + 400) % (W + 400) - 200;
      const cy = 42 + (i % 3) * 34;
      g.beginPath();
      g.arc(cx, cy, 26, 0, Math.PI * 2);
      g.arc(cx + 30, cy - 11, 32, 0, Math.PI * 2);
      g.arc(cx + 62, cy, 24, 0, Math.PI * 2);
      g.fill();
    }
    // 해(밤에는 달)
    g.fillStyle = TH.sun;
    g.beginPath(); g.arc(W * 0.78, 58, TH.night ? 26 : 34, 0, Math.PI * 2); g.fill();
    if (TH.night) {
      // 별
      g.fillStyle = 'rgba(255,251,230,0.9)';
      for (let i = 0; i < 34; i++) {
        const sx = ((i * 137 + shift * 0.25) % (W + 60) + W + 60) % (W + 60) - 30;
        const sy = 16 + ((i * 53) % 120);
        g.beginPath(); g.arc(sx, sy, i % 3 ? 1.6 : 2.6, 0, Math.PI * 2); g.fill();
      }
    }
    // 지평선 언덕 — 트랙 테마를 따른다 (해변은 바다, 밤길은 어두운 능선)
    g.fillStyle = TH.hills;
    g.beginPath();
    g.moveTo(0, horizonY);
    for (let x = 0; x <= W; x += 40) {
      g.lineTo(x, horizonY - 22 - Math.sin((x + shift * 0.5) * 0.008) * 16);
    }
    g.lineTo(W, horizonY); g.closePath(); g.fill();
  }

  function drawWorld() {
    SK.Mode7.drawGround(ctx, trackTex, cam, W, H, 1, SK.Track.theme.horizon);

    // 원경 안개 — 트랙 그림이 끝나는 경계를 부드럽게 지운다
    const horizonY = Math.floor(H * cam.horizon);
    const fog = ctx.createLinearGradient(0, horizonY, 0, horizonY + 120);
    const FG = SK.Track.theme.fog;
    fog.addColorStop(0, 'rgba(' + FG + ',0.95)');
    fog.addColorStop(1, 'rgba(' + FG + ',0)');
    ctx.fillStyle = fog;
    ctx.fillRect(0, horizonY, W, 120);

    // 월드 물체를 먼 것부터 그린다
    const drawables = [];
    for (const b of boxes) {
      if (!b.alive) continue;
      const p = SK.Mode7.project(b.x, b.y, cam, W, H);
      if (p) drawables.push({ p, kind: 'box' });
    }
    for (const it of items) {
      const p = SK.Mode7.project(it.x, it.y, cam, W, H);
      if (p) drawables.push({ p, kind: it.kind || 'ribbon' });
    }
    if (fx) {
      for (const c of fx.coins) {
        if (!c.alive) continue;
        const p = SK.Mode7.project(c.x, c.y, cam, W, H);
        if (p) drawables.push({ p, kind: 'coin' });
      }
      for (const o of fx.obstacles) {
        const p = SK.Mode7.project(o.x, o.y, cam, W, H);
        if (p) drawables.push({ p, kind: 'obstacle', o });
      }
      for (const r of fx.rings) {
        const p = SK.Mode7.project(r.x, r.y, cam, W, H);
        if (p) drawables.push({ p, kind: 'ring' });
      }
    }
    for (const st of strikes) {
      const p = SK.Mode7.project(st.x, st.y, cam, W, H);
      if (p) drawables.push({ p, kind: 'zap', st });
    }
    for (const k of karts) {
      if (k === player) continue;
      const p = SK.Mode7.project(k.x, k.y, cam, W, H);
      if (p) drawables.push({ p, kind: 'kart', kart: k });
    }
    for (const h of hearts) {
      const p = SK.Mode7.project(h.x, h.y, cam, W, H);
      if (p) drawables.push({ p, kind: 'heart', h });
    }
    drawables.sort((a, b) => b.p.forward - a.p.forward);
    for (const d of drawables) {
      const s = d.p.zoom * 1.81;   // 플레이어와 같은 깊이에서 1.15 가 된다
      if (d.kind === 'heart') {
        const h = d.h, k = 1 - h.life / h.max;
        SK.Sprites.drawHeart(ctx, d.p.x + h.ox * d.p.zoom, d.p.y - h.rise * k * d.p.zoom,
          s * h.sc * (0.75 + k * 0.5), Math.min(1, h.life / h.max * 2.2), h.rot);
      }
      else if (d.kind === 'box') SK.Sprites.drawItemBox(ctx, d.p.x, d.p.y, s, time);
      else if (d.kind === 'ribbon') SK.Sprites.drawRibbon(ctx, d.p.x, d.p.y, s, time);
      else if (d.kind === 'balloon') SK.Sprites.drawBalloon(ctx, d.p.x, d.p.y, s);
      else if (d.kind === 'bat') SK.Sprites.drawBat(ctx, d.p.x, d.p.y, s, time);
      else if (d.kind === 'coin') SK.Sprites.drawCoin(ctx, d.p.x, d.p.y, s, time);
      else if (d.kind === 'obstacle') SK.Sprites.drawObstacle(ctx, d.o.kind, d.p.x, d.p.y, s, time);
      else if (d.kind === 'ring') SK.Sprites.drawRing(ctx, d.p.x, d.p.y, s);
      else if (d.kind === 'zap') SK.Sprites.drawZapMark(ctx, d.p.x, d.p.y, s, time, d.st.t);
      else {
        let rel = d.kart.angle - cam.angle;
        while (rel > Math.PI) rel -= Math.PI * 2;
        while (rel < -Math.PI) rel += Math.PI * 2;
        SK.Sprites.drawKart(ctx, d.kart, d.p.x, d.p.y, s, Math.max(-1, Math.min(1, rel)), time);
      }
    }

    // 부스터 꼬리(차고 장식)
    drawTrail();
    // 플레이어 카트는 항상 화면 아래 고정
    const lean = (player.drift > 0 ? player.driftDir : 0) * 0.8 + playerInput().steer * 0.35;
    SK.Sprites.drawKart(ctx, player, W * 0.5, H * 0.82, 1.15, lean, time);
  }

  function fmt(t) {
    const m = Math.floor(t / 60), s = t - m * 60;
    return m + ':' + (s < 10 ? '0' : '') + s.toFixed(2);
  }

  function drawHUD() {
    const g = ctx;
    // 랩
    panel(28, 22, 168, 62);
    g.fillStyle = '#4a3550';
    g.font = '900 20px "Malgun Gothic", sans-serif';
    g.textAlign = 'left';
    g.fillText('바퀴', 44, 48);
    g.font = '900 30px "Malgun Gothic", sans-serif';
    g.fillText(Math.max(1, Math.min(LAPS, player.lap + 1)) + ' / ' + LAPS, 96, 52);

    // 코인
    panel(206, 22, 112, 62);
    g.fillStyle = '#b8860b'; g.font = '900 17px "Malgun Gothic", sans-serif'; g.textAlign = 'left';
    g.fillText('코인', 220, 46);
    g.font = '900 26px "Malgun Gothic", sans-serif'; g.fillText('🪙' + (player.coins || 0), 220, 74);

    // 등수
    panel(W - 196, 22, 168, 62);
    g.fillStyle = '#4a3550';
    g.font = '900 20px "Malgun Gothic", sans-serif';
    g.fillText('등수', W - 180, 48);
    g.font = '900 34px "Malgun Gothic", sans-serif';
    g.fillStyle = player.place === 1 ? '#e8952c' : '#4a3550';
    g.fillText(player.place + '등', W - 118, 54);

    // 라이벌과의 간격 (라이벌 레이스)
    if (rival) {
      // 속도로 나누면 부딪혀 멈췄을 때 숫자가 튄다. 내 카트 최고 속도의 90%로 환산한다.
      const sec = (rival.total - player.total) / (player.spec.top * 0.9);
      const close = !rival.finished && !player.finished && sec < 0 && sec > -1.2;
      panel(W - 196, 92, 168, 56);
      if (close) { ctx.strokeStyle = '#ff8a3d'; ctx.lineWidth = 4; ctx.stroke(); }
      g.textAlign = 'right';
      g.fillStyle = '#9a3877'; g.font = '900 15px "Malgun Gothic", sans-serif';
      g.fillText('🔥 ' + rival.spec.name, W - 44, 114);
      g.fillStyle = close ? '#e0552b' : '#4a3550'; g.font = '900 20px "Malgun Gothic", sans-serif';
      g.fillText(rival.finished ? '도착' : (sec > 0 ? '앞 ' : '뒤 ') + Math.abs(sec).toFixed(1) + '초', W - 44, 138);
      g.textAlign = 'left';
    }

    // 시간
    panel(W * 0.5 - 92, 22, 184, 44);
    g.fillStyle = '#4a3550';
    g.font = '900 22px "Malgun Gothic", sans-serif';
    g.textAlign = 'center';
    g.fillText(fmt(raceTime), W * 0.5, 52);

    // 아이템 칸
    panel(W * 0.5 - 44, 78, 88, 88);
    if (player.item === 'boost') {
      drawStar(W * 0.5, 122, 30, time * 1.4, '#ffd34d');
    } else if (player.item === 'ribbon') {
      SK.Sprites.drawRibbon(g, W * 0.5, 122, 1.1, time);
    } else {
      g.fillStyle = 'rgba(74,53,80,0.28)';
      g.font = '900 20px "Malgun Gothic", sans-serif';
      g.fillText('아이템', W * 0.5, 129);
    }

    // 드리프트 충전
    panel(28, 96, 290, 55);
    g.textAlign = 'left'; g.fillStyle = '#68476d'; g.font = '900 15px "Malgun Gothic", sans-serif';
    g.fillText('★ 완주  ·  ★ 드리프트 2번  ·  ★ 아이템 2번', 40, 117);
    g.fillText('드리프트 ' + Math.min(2, challenge.drift) + '/2     아이템 ' + Math.min(2, challenge.items) + '/2', 40, 139);
    if (cheerTime > 0 && countdown <= 0) {
      g.save(); g.globalAlpha = Math.min(1, cheerTime * 3); panel(275, 185, 410, 52);
      g.textAlign = 'center'; g.fillStyle = '#9a3877'; g.font = '900 25px "Malgun Gothic", sans-serif';
      g.fillText(cheer, 480, 219); g.restore();
      g.textAlign = 'left';
    }
    if (player.boost > 0) {
      g.save(); g.strokeStyle = 'rgba(255,247,198,.65)'; g.lineWidth = 3;
      for (let i = 0; i < 14; i++) {
        const a = i / 14 * Math.PI * 2, phase = (time * 2 + i * .17) % 1;
        g.beginPath(); g.moveTo(480 + Math.cos(a) * (320 + phase * 100), 300 + Math.sin(a) * (160 + phase * 80));
        g.lineTo(480 + Math.cos(a) * (420 + phase * 100), 300 + Math.sin(a) * (230 + phase * 80)); g.stroke();
      } g.restore();
    }
    if (player.drift > 0) {
      const c = Math.min(1, player.driftCharge / 1.3);
      g.fillStyle = 'rgba(74,53,80,0.35)';
      rr(W * 0.5 - 70, H - 44, 140, 14, 7); g.fill();
      g.fillStyle = c > 0.85 ? '#ff8f45' : '#5cc8ff';
      rr(W * 0.5 - 67, H - 41, 134 * c, 8, 4); g.fill();
    }

    if (vsayTime > 0) {
      g.save(); g.globalAlpha = Math.min(1, vsayTime * 3);
      g.font = '900 20px "Malgun Gothic", sans-serif'; g.textAlign = 'center';
      const w = g.measureText(vsay).width + 40;
      g.fillStyle = 'rgba(40,24,52,0.86)'; rr(W * 0.5 - w / 2, H - 196, w, 44, 22); g.fill();
      g.strokeStyle = vsayColor; g.lineWidth = 3; g.stroke();
      g.fillStyle = '#ffffff'; g.fillText(vsay, W * 0.5, H - 167);
      g.restore();
    }
    if (gp) {
      g.save(); g.textAlign = 'center'; g.font = '900 15px "Malgun Gothic", sans-serif'; g.fillStyle = '#ffffff';
      g.lineWidth = 4; g.strokeStyle = '#4a3550';
      const t = gp.cup.icon + ' ' + gp.cup.name + ' ' + (gp.race + 1) + ' / ' + gp.cup.tracks.length;
      g.strokeText(t, W * 0.5, 84); g.fillText(t, W * 0.5, 84); g.restore();
    }

    if (E_isTouch) drawTouchControls();
  }

  function panel(x, y, w, h) {
    ctx.fillStyle = 'rgba(255,255,255,0.82)';
    rr(x, y, w, h, 16); ctx.fill();
    ctx.strokeStyle = 'rgba(74,53,80,0.28)'; ctx.lineWidth = 2.5; ctx.stroke();
  }

  function rr(x, y, w, h, r) {
    r = Math.min(r, w / 2, h / 2);
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.arcTo(x + w, y, x + w, y + h, r);
    ctx.arcTo(x + w, y + h, x, y + h, r);
    ctx.arcTo(x, y + h, x, y, r);
    ctx.arcTo(x, y, x + w, y, r);
    ctx.closePath();
  }

  function drawStar(x, y, r, rot, color) {
    ctx.save(); ctx.translate(x, y); ctx.rotate(rot);
    ctx.beginPath();
    for (let i = 0; i < 5; i++) {
      const a = -Math.PI / 2 + i * Math.PI * 2 / 5;
      const a2 = a + Math.PI / 5;
      ctx.lineTo(Math.cos(a) * r, Math.sin(a) * r);
      ctx.lineTo(Math.cos(a2) * r * 0.46, Math.sin(a2) * r * 0.46);
    }
    ctx.closePath();
    ctx.fillStyle = color; ctx.fill();
    ctx.strokeStyle = '#a5762c'; ctx.lineWidth = 2.5; ctx.stroke();
    ctx.restore();
  }

  const E_isTouch = ('ontouchstart' in window) || navigator.maxTouchPoints > 0;

  function drawTouchControls() {
    const g = ctx;
    g.save();
    g.globalAlpha = 0.5;
    // 좌우 조향
    [[92, -1, '◀'], [242, 1, '▶']].forEach(([x, dir, ch]) => {
      g.fillStyle = touch.steer === dir ? '#ffd34d' : '#ffffff';
      g.beginPath(); g.arc(x, H - 88, 54, 0, Math.PI * 2); g.fill();
      g.strokeStyle = '#4a3550'; g.lineWidth = 3; g.stroke();
      g.fillStyle = '#4a3550';
      g.font = '900 34px "Malgun Gothic", sans-serif';
      g.textAlign = 'center'; g.textBaseline = 'middle';
      g.fillText(ch, x, H - 86);
    });
    // 드리프트 / 아이템
    g.fillStyle = touch.drift ? '#5cc8ff' : '#ffffff';
    g.beginPath(); g.arc(W - 92, H - 88, 54, 0, Math.PI * 2); g.fill();
    g.strokeStyle = '#4a3550'; g.lineWidth = 3; g.stroke();
    g.fillStyle = '#4a3550'; g.font = '900 22px "Malgun Gothic", sans-serif';
    g.fillText('드리프트', W - 92, H - 86);

    g.fillStyle = touch.item ? '#ffd34d' : '#ffffff';
    g.beginPath(); g.arc(W - 208, H - 88, 44, 0, Math.PI * 2); g.fill();
    g.strokeStyle = '#4a3550'; g.lineWidth = 3; g.stroke();
    g.fillStyle = '#4a3550'; g.font = '900 20px "Malgun Gothic", sans-serif';
    g.fillText('아이템', W - 208, H - 86);
    g.textBaseline = 'alphabetic';
    g.restore();
  }

  function drawCountdown() {
    if (countdown <= 0) return;
    const n = Math.ceil(countdown - 0.6);
    const g = ctx;
    g.save();
    g.textAlign = 'center';
    if (n > 0) {
      const t = 1 - ((countdown - 0.6) % 1);
      g.globalAlpha = Math.min(1, t * 3);
      g.font = '900 128px "Malgun Gothic", sans-serif';
      g.lineWidth = 14; g.strokeStyle = '#4a3550'; g.lineJoin = 'round';
      g.strokeText(String(n), W * 0.5, H * 0.44);
      g.fillStyle = '#fff3a6';
      g.fillText(String(n), W * 0.5, H * 0.44);
    } else {
      g.font = '900 96px "Malgun Gothic", sans-serif';
      g.lineWidth = 12; g.strokeStyle = '#4a3550'; g.lineJoin = 'round';
      g.strokeText('출발!', W * 0.5, H * 0.44);
      g.fillStyle = '#ffd34d';
      g.fillText('출발!', W * 0.5, H * 0.44);
    }
    g.restore();
  }

  // 카드 배치: 개수가 달라도 화면(960) 안에 고르게 들어가게 계산한다.
  // 예전에는 x = 150 + i*220 로 4장에 맞춰 박아 두어 7장이면 화면 밖으로 나갔다.
  function cardLayout(n, cardW) {
    const margin = 46;
    const span = W - margin * 2;
    const step = n > 1 ? Math.min(cardW + 18, (span - cardW) / (n - 1)) : 0;
    const total = cardW + step * (n - 1);
    const left = (W - total) / 2 + cardW / 2;
    return i => left + step * i;
  }

  function drawSelect() {
    const g = ctx;
    const bg = g.createLinearGradient(0, 0, 0, H);
    bg.addColorStop(0, '#ffd9ec');
    bg.addColorStop(1, '#c9e9ff');
    g.fillStyle = bg; g.fillRect(0, 0, W, H);

    g.textAlign = 'center';
    g.font = '900 48px "Malgun Gothic", sans-serif';
    g.lineWidth = 11; g.strokeStyle = '#8c4a63'; g.lineJoin = 'round';
    g.strokeText('산리오 카트', W * 0.5, 74);
    g.fillStyle = '#fff'; g.fillText('산리오 카트', W * 0.5, 74);
    g.font = '900 22px "Malgun Gothic", sans-serif';
    g.fillStyle = '#8c4a63';
    g.fillText(selStep === 0 ? '카트를 골라요' : '코스를 골라요', W * 0.5, 108);

    if (selStep === 0) {
      // 열한 명이 한 줄에 들어오게 카드를 좁혔다(아이들 넷은 오른쪽 끝)
      const n = SK.CHARACTERS.length;
      const at = cardLayout(n, CARD0_W);
      SK.CHARACTERS.forEach((spec, i) => {
        const x = at(i), y = 270;
        const on = i === chosen;
        g.save();
        g.translate(x, y);
        g.scale(on ? 1.08 : 0.94, on ? 1.08 : 0.94);
        g.fillStyle = on ? 'rgba(255,255,255,0.95)' : spec.kid ? 'rgba(255,248,232,0.8)' : 'rgba(255,255,255,0.7)';
        rrAt(g, -CARD0_W / 2, -84, CARD0_W, 176, 16); g.fill();
        g.strokeStyle = on ? '#ff5c8a' : 'rgba(140,74,99,0.35)';
        g.lineWidth = on ? 5 : 2.5; g.stroke();
        g.restore();

        const kk = { spec, bob: time * 2 + i, boost: 0, drift: 0, driftDir: 0 };
        SK.Sprites.drawKart(g, kk, x, y + 22, on ? 0.66 : 0.58, Math.sin(time * 1.5 + i) * 0.2, time);

        g.fillStyle = '#4a3550';
        g.font = '900 14px "Malgun Gothic", sans-serif';
        g.textAlign = 'center';
        g.fillText(spec.name, x, y + 72);
        g.font = '900 11px "Malgun Gothic", sans-serif';
        g.fillStyle = spec.kid ? '#c0548a' : '#8c7a95';
        g.fillText(spec.kid ? '우리 아이' : '속도 ' + '★'.repeat(Math.max(1, Math.round((spec.top - 370) / 15))), x, y - 62);
      });
      // 차고 버튼
      g.fillStyle = '#fff3a6'; rrAt(g, 350, 126, 260, 36, 18); g.fill();
      g.strokeStyle = '#c9a23a'; g.lineWidth = 2.5; g.stroke();
      g.fillStyle = '#8c4a63'; g.font = '900 17px "Malgun Gothic", sans-serif'; g.textAlign = 'center';
      g.fillText('🧰 차고 꾸미기 · 🪙 ' + garage.coins + (E_isTouch ? '' : '  (G)'), 480, 150);
    } else {
      const n = SK.TRACKS.length;
      const at = cardLayout(n, 196);
      SK.TRACKS.forEach((def, i) => {
        const x = at(i), y = 288;
        const on = i === trackIndex && cupSel < 0;
        g.save();
        g.translate(x, y);
        g.scale(on ? 1.06 : 0.94, on ? 1.06 : 0.94);
        g.fillStyle = on ? 'rgba(255,255,255,0.96)' : 'rgba(255,255,255,0.72)';
        rrAt(g, -98, -112, 196, 224, 22); g.fill();
        g.strokeStyle = on ? '#ff5c8a' : 'rgba(140,74,99,0.35)';
        g.lineWidth = on ? 6 : 3; g.stroke();
        // 코스 미리보기 — 중심선을 작게 그린다
        const TH = def.theme;
        g.fillStyle = TH.ground1;
        rrAt(g, -84, -96, 168, 122, 14); g.fill();
        const pts = def.control;
        let minX = 1e9, maxX = -1e9, minY = 1e9, maxY = -1e9;
        pts.forEach(p => { minX = Math.min(minX, p.x); maxX = Math.max(maxX, p.x);
                           minY = Math.min(minY, p.y); maxY = Math.max(maxY, p.y); });
        const sc = Math.min(150 / (maxX - minX), 104 / (maxY - minY));
        const ox = -(minX + maxX) / 2 * sc, oy = -96 + 61 - (minY + maxY) / 2 * sc;
        // 제어점을 직선으로 이으면 다각형처럼 보인다. 중점을 지나는 곡선으로 잇는다.
        const P = pts.map(p => ({ x: p.x * sc + ox, y: p.y * sc + oy }));
        const mid = (a, b) => ({ x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 });
        function path() {
          const m0 = mid(P[P.length - 1], P[0]);
          g.beginPath();
          g.moveTo(m0.x, m0.y);
          for (let k = 0; k < P.length; k++) {
            const cur = P[k], nxt = P[(k + 1) % P.length];
            const m = mid(cur, nxt);
            g.quadraticCurveTo(cur.x, cur.y, m.x, m.y);
          }
          g.closePath();
        }
        g.lineCap = 'round'; g.lineJoin = 'round';
        g.strokeStyle = TH.roadEdge; g.lineWidth = 11; path(); g.stroke();
        g.strokeStyle = TH.road; g.lineWidth = 7; path(); g.stroke();
        g.restore();

        g.fillStyle = '#4a3550';
        g.font = '900 19px "Malgun Gothic", sans-serif';
        g.fillText(def.name, x, y + 62);
        g.font = '900 12px "Malgun Gothic", sans-serif';
        g.fillStyle = '#8c7a95';
        g.fillText(def.tip, x, y + 84);
        if (on) { g.fillStyle = '#b47a21'; g.fillText('도전 배지 ' + '★'.repeat(medals) + '☆'.repeat(3 - medals), x, y + 106); }
      });
      // 그랑프리 컵 — 두 경주 점수로 트로피
      SK.CUPS.forEach((cup, i) => {
        const x = 330 + i * 300, on = cupSel === i;
        g.fillStyle = on ? '#ffd9ec' : 'rgba(255,255,255,0.85)'; rrAt(g, x - 135, 128, 270, 44, 22); g.fill();
        g.strokeStyle = on ? '#ff5c8a' : 'rgba(140,74,99,0.35)'; g.lineWidth = on ? 5 : 2.5; g.stroke();
        const best = garage.trophies[cup.id];
        g.fillStyle = '#4a3550'; g.font = '900 18px "Malgun Gothic", sans-serif'; g.textAlign = 'center';
        g.fillText(cup.icon + ' ' + cup.name + ' 그랑프리' + (best ? ' ' + MEDAL[best] : ''), x, 157);
      });
    }

    g.fillStyle = '#8c4a63';
    g.font = '900 18px "Malgun Gothic", sans-serif';
    g.textAlign = 'center';
    if (selStep === 1 && rivalRec.unlocked && cupSel < 0) {
      // 이 코스를 1등으로 끝낸 적이 있으면 라이벌 레이스 버튼
      g.fillStyle = '#ff9a6b'; rrAt(g, 330, 400, 300, 32, 16); g.fill();
      g.strokeStyle = '#b8502a'; g.lineWidth = 2.5; g.stroke();
      g.fillStyle = '#3a1f2c'; g.font = '900 16px "Malgun Gothic", sans-serif';
      g.fillText('🔥 라이벌 레이스' + (rivalRec.won ? ' ✓' : '') + (E_isTouch ? '' : '  ·  R'), 480, 422);
    } else {
      g.fillText(E_isTouch
        ? (selStep === 0 ? '카트를 눌러 고르세요' : '코스나 컵을 눌러 출발!')
        : (selStep === 0 ? '← → 로 고르고 스페이스' : '← → 로 고르고 스페이스로 출발!'), W * 0.5, 418);
    }
    // 최고 기록은 위쪽에. 아래는 조작 설명 자리다.
    if (bestLap && selStep === 1) {
      g.font = '900 13px "Malgun Gothic", sans-serif';
      g.fillStyle = '#a98fb0';
      g.fillText('최고 한 바퀴 ' + fmt(bestLap), W * 0.5, 186);
    }

    drawControls(g);
  }

  // 조작 설명 — 아이가 처음 잡아도 알 수 있게 선택 화면에 그대로 적어 둔다.
  // 터치 기기와 키보드는 서로 다른 줄을 보여 준다.
  const CARD0_W = 74;
  function drawControls(g) {
    const rows = E_isTouch ? [
      ['자동', '엑셀은 없어요. 출발하면 알아서 달려요'],
      ['◀ ▶', '화면 왼쪽 아래 버튼으로 돌기'],
      ['드리프트', '오른쪽 아래 버튼을 꾹 — 굽은 길에서 부스터'],
      ['아이템', '모아둔 아이템 쓰기']
    ] : [
      ['자동', '엑셀은 없어요. 출발하면 알아서 달려요'],
      ['← →', '왼쪽 · 오른쪽으로 돌기'],
      ['스페이스', '꾹 누르면 드리프트 — 굽은 길에서 오래 미끄러지면 부스터'],
      ['↑', '모아둔 아이템 쓰기'],
      ['Esc', '뒤로']
    ];
    // 세로 540 안에 들어와야 한다. 예전에는 마지막 줄이 화면 밖으로 잘렸다.
    const boxW = 640, lineH = 17;
    const boxH = rows.length * lineH + 14;
    const x0 = (W - boxW) / 2, y0 = H - boxH - 8;
    g.save();
    g.fillStyle = 'rgba(255,255,255,0.7)';
    rrAt(g, x0, y0, boxW, boxH, 14); g.fill();
    g.strokeStyle = 'rgba(140,74,99,0.22)'; g.lineWidth = 2.5; g.stroke();
    rows.forEach((r, i) => {
      const y = y0 + 19 + i * lineH;
      g.textAlign = 'right';
      g.font = '900 13px "Malgun Gothic", sans-serif';
      g.fillStyle = '#8c4a63';
      g.fillText(r[0], x0 + 108, y);
      g.textAlign = 'left';
      g.font = '800 13px "Malgun Gothic", sans-serif';
      g.fillStyle = '#6f5c7a';
      g.fillText(r[1], x0 + 122, y);
    });
    g.restore();
    g.textAlign = 'center';
  }

  function rrAt(g, x, y, w, h, r) {
    r = Math.min(r, w / 2, h / 2);
    g.beginPath();
    g.moveTo(x + r, y);
    g.arcTo(x + w, y, x + w, y + h, r);
    g.arcTo(x + w, y + h, x, y + h, r);
    g.arcTo(x, y + h, x, y, r);
    g.arcTo(x, y, x + w, y, r);
    g.closePath();
  }

  function drawResult() {
    if (gp) { drawCupResult(); return; }
    const g = ctx;
    g.fillStyle = 'rgba(60,40,70,0.55)';
    g.fillRect(0, 0, W, H);
    const p = Math.min(1, (time % 1000) * 1);
    g.textAlign = 'center';
    g.fillStyle = 'rgba(255,255,255,0.95)';
    rrAt(g, W * 0.5 - 260, 70, 520, 400, 26); g.fill();
    g.strokeStyle = '#ff8fb4'; g.lineWidth = 5; g.stroke();

    g.font = '900 42px "Malgun Gothic", sans-serif';
    g.fillStyle = '#4a3550';
    g.fillText(rivalMode ? (rivalBeat ? '🔥 라이벌을 이겼어요!' : '라이벌에게 졌어요!') : player.place === 1 ? '1등! 최고예요!' : '완주했어요!', W * 0.5, 132);

    resultOrder.slice(0, 3).forEach((k, i) => {
      const y = 190 + i * 58;
      g.textAlign = 'left';
      g.font = '900 26px "Malgun Gothic", sans-serif';
      g.fillStyle = k.isPlayer ? '#ff5c8a' : '#6b5b78';
      g.fillText((i + 1) + '등', W * 0.5 - 200, y);
      g.fillText((k === rival ? '🔥 ' : k.spec.villain ? '😈 ' : '') + k.spec.name, W * 0.5 - 130, y);
      g.textAlign = 'right';
      g.font = '900 22px "Malgun Gothic", sans-serif';
      g.fillText(k.finishTime > player.finishTime + 90 ? '—' : fmt(k.finishTime), W * 0.5 + 200, y);
    });

    g.textAlign = 'center';
    g.font = '900 20px "Malgun Gothic", sans-serif';
    g.fillStyle = '#8c7a95';
    const note = rivalUnlockedNow ? '🔥 이 코스에 라이벌 레이스가 열렸어요!'
      : rivalMode && !rivalBeat && rivalRec.losses >= 3 ? '라이벌 리본은 옆으로 피하고 드리프트로 따라잡아요' : '';
    if (note) { g.fillStyle = '#e0552b'; g.font = '900 18px "Malgun Gothic", sans-serif'; g.fillText(note, 480, 336); g.font = '900 20px "Malgun Gothic", sans-serif'; }
    g.fillStyle = '#cc8324'; g.fillText('이번 도전 ' + '★'.repeat(earnedMedals()) + '☆'.repeat(3-earnedMedals()) + '  ·  코스 최고 ' + medals + '개', 480, 365);
    g.font = '900 16px "Malgun Gothic", sans-serif'; g.fillStyle = '#8c7a95';
    g.fillText('완주 ✓   드리프트 ' + Math.min(2,challenge.drift) + '/2   아이템 ' + Math.min(2,challenge.items) + '/2',480,394);
    if (earned) { g.fillStyle = '#b8860b'; g.fillText('🪙 +' + (earned.picks + earned.bonus) + ' (주운 코인 ' + earned.picks + ' · 순위 ' + earned.bonus + ') → 모은 코인 ' + garage.coins, W * 0.5, 423); }
    else if (playerBestLap) g.fillText('내 최고 바퀴 ' + fmt(playerBestLap), W * 0.5, 423);
    g.font = '900 24px "Malgun Gothic", sans-serif';
    g.fillStyle = '#4a3550';
    g.font = '900 20px "Malgun Gothic", sans-serif';
    g.fillText('↻ 바로 재도전', 355, 458); g.fillText('코스 바꾸기 →', 605, 458);
  }

  // ================== 코스 이벤트 ==================
  function onFx(kind, k, extra) {
    if (k !== player) return;
    if (kind === 'coin') { coinPicks++; audio.sfx('coin'); }
    else if (kind === 'pad') { audio.sfx('boost'); celebrate('부스트! 🔥'); }
    else if (kind === 'bounce') { audio.sfx('boing'); celebrate('통통! 🌟'); }
    else if (kind === 'ring') { audio.sfx('ring'); celebrate('무지개 통과! 🌈'); }
    else if (kind === 'bonk') celebrate({ cup: '빙글빙글 찻잔에 쿵!', candy: '사탕 공에 쿵!', crab: '꽃게한테 집혔어요!' }[extra] || '쿵!');
  }

  // ================== 장난꾸러기 ==================
  // 태뿔 물풍선 / 찬뿔 번개(떨어질 자리가 노랗게 깜빡 → 비키면 안전) / 건뿔 쿵 밀기·리본 / 재윙 박쥐 풍선·날아오기
  function updateVillains(dt) {
    vsayTime = Math.max(0, vsayTime - dt);
    for (const v of karts) {
      if (!v.prank || v.finished) continue;
      v.prankClock -= dt;
      if (v.prankClock > 0) continue;
      const gap = player.total - v.total;
      let did = false;
      if (!player.finished && Math.abs(gap) < 1400) {
        const fx0 = Math.sin(v.angle), fy0 = -Math.cos(v.angle);
        if (v.prank === 'balloon' && gap > 80 && gap < 1000) {
          items.push({ kind: 'balloon', x: v.x + fx0 * 50, y: v.y + fy0 * 50, angle: v.angle, speed: 640, life: 2.2, owner: v, armed: 0 });
          say(v, '물풍선 받아라~ 💦'); did = true;
        } else if (v.prank === 'zap') {
          let target = null, best = Infinity;
          for (const k of karts) {
            if (k === v || k.finished) continue;
            const g0 = k.total - v.total;
            if (g0 > 60 && g0 < 1400 && g0 < best) { best = g0; target = k; }
          }
          if (target) {
            const lead = target.speed * 1.1;
            strikes.push({ x: target.x + Math.sin(target.angle) * lead, y: target.y - Math.cos(target.angle) * lead, t: 1.1, target, by: v });
            say(v, target === player ? '⚡ 번개! 노란 자리를 피해요!' : '찌릿찌릿~ ⚡'); did = true;
          }
        } else if (v.prank === 'slam') {
          if (Math.hypot(v.x - player.x, v.y - player.y) < 90) {
            const d = Math.hypot(player.x - v.x, player.y - v.y) || 1;
            player.x += (player.x - v.x) / d * 46; player.y += (player.y - v.y) / d * 46;
            player.speed *= 0.72; player.bumpFlash = 1;
            say(v, '쿵! 헐크 박치기! 💚'); did = true;
          } else if (gap < -60 && gap > -800) {
            items.push({ kind: 'ribbon', x: v.x - fx0 * 40, y: v.y - fy0 * 40, angle: v.angle, speed: 0, life: 25, owner: v, armed: 0 });
            say(v, '리본 조심~ 🎀'); did = true;
          }
        } else if (v.prank === 'bat') {
          if (gap < -60 && gap > -800) {
            items.push({ kind: 'bat', x: v.x - fx0 * 40, y: v.y - fy0 * 40, angle: v.angle, speed: 0, life: 25, owner: v, armed: 0 });
            say(v, '박쥐 풍선 뿅! 🦇'); did = true;
          } else if (gap > 250) {
            v.boost = Math.max(v.boost, 1.3); say(v, '재윙이 날아와요! 🦇'); did = true;
          }
        }
      }
      v.prankClock = did ? 9 + Math.random() * 4 : 1.2;
    }
    for (const st of strikes) {
      st.t -= dt;
      if (st.t > 0 || st.done) continue;
      st.done = true;
      let hitPlayer = false;
      for (const k of karts) {
        if (k.finished || k.hop > 0 || Math.hypot(k.x - st.x, k.y - st.y) > 80) continue;
        k.spin = 0.8; k.speed *= 0.5; k.coins = Math.max(0, (k.coins || 0) - 2);
        if (k === player) { hitPlayer = true; celebrate('찌릿! ⚡'); }
      }
      if (st.target === player && !hitPlayer) { celebrate('휙! 번개를 피했어요! ✨'); audio.sfx('trick'); }
    }
    strikes = strikes.filter(st => !st.done);
  }

  // ================== 부스터 꼬리 ==================
  function drawTrail() {
    const tr = player && player.look && player.look.trail;
    if (tr && player.boost > 0 && trail.length < 40 && Math.random() < 0.7) {
      trail.push({ x: W * 0.5 + (Math.random() - 0.5) * 50, y: H * 0.82 + 20, vx: (Math.random() - 0.5) * 80, vy: 120 + Math.random() * 80, life: 0.55,
        c: tr.color === 'rainbow' ? SK.Sprites.hsl((time * 1.3 + Math.random() * 0.2) % 1) : tr.color, shape: tr.shape });
    }
    for (const t of trail) {
      t.life -= 1 / 60; t.x += t.vx / 60; t.y += t.vy / 60;
      if (t.life <= 0) continue;
      if (t.shape === 'heart') SK.Sprites.drawHeart(ctx, t.x, t.y, 1.4, Math.min(1, t.life * 2), 0);
      else SK.Sprites.drawStarShape(ctx, t.x, t.y, 9, t.life * 6, t.c);
    }
    trail = trail.filter(t => t.life > 0);
  }

  // ================== 코인 정산·그랑프리 ==================
  function settleCoins() {
    if (earned) return;
    const bonus = FINISH_COINS[Math.min(FINISH_COINS.length - 1, player.place - 1)];
    const picks = Math.min(40, coinPicks);
    earned = { picks, bonus };
    SK.Garage.addCoins(garage, picks + bonus);
    SK.Garage.save(garage);
  }
  function startCup(i) {
    const cup = SK.CUPS[i];
    const me = SK.CHARACTERS[chosen];
    const friends = shuffle(SK.CHARACTERS.filter(c => c !== me)).slice(0, 3);
    gp = { cup, race: 0, lineup: [me].concat(cup.villains.map(SK.driverById), friends) };
    gp.points = gp.lineup.map(() => 0); gp.gain = gp.lineup.map(() => 0);
    trackIndex = SK.TRACKS.findIndex(t => t.id === cup.tracks[0]);
    startRace(false);
  }
  function scoreCup() {
    if (gp.scored) return;
    gp.gain = gp.lineup.map(() => 0);
    resultOrder.forEach((k, place) => { const pts = SK.POINTS[place] || 0; gp.points[k.lineupIndex] += pts; gp.gain[k.lineupIndex] = pts; });
    gp.scored = true;
  }
  function cupOrder() {
    return gp.lineup.map((spec, i) => ({ spec, i, pts: gp.points[i] })).sort((a, b) => b.pts - a.pts || a.i - b.i);
  }
  function nextCupRace() {
    if (gp.race >= gp.cup.tracks.length - 1) { showPodium(); return; }
    gp.race++;
    trackIndex = SK.TRACKS.findIndex(t => t.id === gp.cup.tracks[gp.race]);
    startRace(false);
  }
  function drawCupResult() {
    const g = ctx;
    g.fillStyle = 'rgba(60,40,70,0.55)'; g.fillRect(0, 0, W, H);
    g.fillStyle = 'rgba(255,255,255,0.95)'; rrAt(g, W * 0.5 - 270, 50, 540, 440, 26); g.fill();
    g.strokeStyle = '#ffd34d'; g.lineWidth = 5; g.stroke();
    g.textAlign = 'center'; g.fillStyle = '#4a3550'; g.font = '900 30px "Malgun Gothic", sans-serif';
    g.fillText(gp.cup.icon + ' ' + gp.cup.name + ' ' + (gp.race + 1) + ' / ' + gp.cup.tracks.length + ' · ' + player.place + '등!', W * 0.5, 98);
    cupOrder().forEach((r, i) => {
      const y = 140 + i * 40;
      g.font = '900 21px "Malgun Gothic", sans-serif';
      g.fillStyle = r.i === 0 ? '#ff5c8a' : '#6b5b78';
      g.textAlign = 'left'; g.fillText((i + 1) + '위', W * 0.5 - 220, y);
      g.fillText((r.spec.villain ? '😈 ' : '') + r.spec.name, W * 0.5 - 150, y);
      g.textAlign = 'right'; g.fillText(r.pts + '점', W * 0.5 + 170, y);
      g.fillStyle = '#b8860b'; g.font = '900 16px "Malgun Gothic", sans-serif'; g.fillText('+' + gp.gain[r.i], W * 0.5 + 225, y);
    });
    g.textAlign = 'center'; g.font = '900 16px "Malgun Gothic", sans-serif'; g.fillStyle = '#b8860b';
    if (earned) g.fillText('🪙 +' + (earned.picks + earned.bonus) + ' → 모은 코인 ' + garage.coins, W * 0.5, 404);
    const last = gp.race >= gp.cup.tracks.length - 1;
    g.fillStyle = '#4a3550'; g.font = '900 20px "Malgun Gothic", sans-serif';
    g.fillText(last ? '🏆 시상식' : '다음 경주 ▶', 355, 458); g.fillText('그만하기', 605, 458);
  }
  function showPodium() {
    const order = cupOrder();
    const myPlace = order.findIndex(r => r.i === 0) + 1;
    const newGold = myPlace === 1 && SK.Garage.trophy(garage, gp.cup.id, 1);
    if (myPlace > 1) SK.Garage.trophy(garage, gp.cup.id, myPlace);
    const bonus = myPlace <= 3 ? TROPHY_COINS[myPlace - 1] : 5;
    SK.Garage.addCoins(garage, bonus); SK.Garage.save(garage);
    podium = { order, myPlace, bonus, newGold, cup: gp.cup, t: 0 };
    confetti = [];
    scene = 'podium';
    audio.stopMusic(); audio.fanfare();
  }
  function leavePodium() { gp = null; podium = null; scene = 'select'; selStep = 0; }
  function drawPodium(dt) {
    const g = ctx, P = podium;
    P.t += dt;
    const bg = g.createLinearGradient(0, 0, 0, H);
    bg.addColorStop(0, '#ffd9ec'); bg.addColorStop(1, '#c9e9ff');
    g.fillStyle = bg; g.fillRect(0, 0, W, H);
    // 시상대
    const slots = [[480, 262, '#ffd34d', 88], [300, 296, '#dfe6f0', 54], [660, 316, '#e8a86b', 34]];   // 아래 끝을 410에 맞춘다
    P.order.slice(0, 3).forEach((r, i) => {
      const [x, top, col, h] = slots[i];
      g.fillStyle = col; rrAt(g, x - 80, top, 160, h + 60, 10); g.fill();
      g.strokeStyle = '#4a3550'; g.lineWidth = 3; g.stroke();
      g.fillStyle = '#4a3550'; g.font = '900 34px "Malgun Gothic", sans-serif'; g.textAlign = 'center';
      g.fillText(String(i + 1), x, top + 44);
      const kk = { spec: r.spec, bob: P.t * 3 + i, boost: 0, drift: 0, driftDir: 0, look: r.i === 0 ? SK.Garage.look(garage) : null };
      SK.Sprites.drawKart(g, kk, x, top - 30, 1.05, Math.sin(P.t * 2 + i) * 0.2, P.t);
      g.font = '900 16px "Malgun Gothic", sans-serif'; g.fillText((r.spec.villain ? '😈 ' : '') + r.spec.name, x, top - 88);
    });
    // 트로피
    g.save(); g.translate(480, 112 + Math.sin(P.t * 2) * 4);
    g.fillStyle = '#ffc83a'; g.strokeStyle = '#a5762c'; g.lineWidth = 3;
    g.beginPath(); g.moveTo(-26, -30); g.lineTo(26, -30); g.quadraticCurveTo(24, 6, 0, 10); g.quadraticCurveTo(-24, 6, -26, -30); g.fill(); g.stroke();
    g.beginPath(); g.arc(-30, -18, 9, Math.PI * 0.5, Math.PI * 1.5); g.stroke();
    g.beginPath(); g.arc(30, -18, 9, -Math.PI * 0.5, Math.PI * 0.5); g.stroke();
    g.fillRect(-5, 10, 10, 14); g.fillRect(-18, 24, 36, 8);
    g.restore();
    // 꽃가루
    if (confetti.length < 90) confetti.push({ x: Math.random() * W, y: -10, vy: 60 + Math.random() * 80, c: ['#ff7aa8', '#ffd34d', '#7fe0c4', '#7fb8ff', '#c79bff'][Math.floor(Math.random() * 5)], r: Math.random() * 6 });
    confetti.forEach(c => { c.y += c.vy * dt; c.r += dt * 4; g.save(); g.translate(c.x + Math.sin(c.r) * 8, c.y); g.rotate(c.r); g.fillStyle = c.c; g.fillRect(-4, -6, 8, 12); g.restore(); });
    confetti = confetti.filter(c => c.y < H + 20);
    // 글
    g.textAlign = 'center'; g.font = '900 34px "Malgun Gothic", sans-serif'; g.lineWidth = 9; g.strokeStyle = '#8c4a63'; g.lineJoin = 'round';
    const title = P.myPlace <= 3 ? (MEDAL[P.myPlace] + ' ' + P.cup.name + (P.myPlace === 1 ? ' 우승!' : ' ' + P.myPlace + '등 트로피!')) : P.cup.name + ' 완주! 다음엔 트로피까지!';
    g.strokeText(title, W * 0.5, 60); g.fillStyle = '#ffffff'; g.fillText(title, W * 0.5, 60);
    g.font = '900 16px "Malgun Gothic", sans-serif'; g.fillStyle = '#b8860b';
    g.fillText('🪙 트로피 보너스 +' + P.bonus + ' → 모은 코인 ' + garage.coins + (P.newGold ? '  ·  🎁 차고에 황금 장식이 열렸어요!' : ''), W * 0.5, 440);
    g.fillStyle = '#4a3550'; g.font = '900 20px "Malgun Gothic", sans-serif';
    g.fillText('처음으로', 355, 488); g.fillText('🧰 차고 가기', 605, 488);
  }

  // ================== 차고 ==================
  function openGarage() { garage = SK.Garage.load(); scene = 'garage'; garageMsg = SK.CHARACTERS[chosen].name + '의 카트예요. 누르면 사서 바로 끼워요.'; }
  const GRID = { x: 452, y: 176, w: 150, h: 76, cols: 3, gap: 12 };
  function drawGarage() {
    const g = ctx;
    const bg = g.createLinearGradient(0, 0, 0, H);
    bg.addColorStop(0, '#ffd9ec'); bg.addColorStop(1, '#c9e9ff');
    g.fillStyle = bg; g.fillRect(0, 0, W, H);
    g.textAlign = 'center'; g.fillStyle = '#8c4a63'; g.font = '900 30px "Malgun Gothic", sans-serif';
    g.fillText('🧰 내 카트 차고', 220, 70);
    g.fillStyle = 'rgba(255,255,255,0.6)'; rrAt(g, 50, 96, 340, 280, 26); g.fill();
    const kk = { spec: SK.CHARACTERS[chosen], bob: time * 3, boost: Math.sin(time) > 0.6 ? 1 : 0, drift: 0, driftDir: 0, look: SK.Garage.look(garage) };
    SK.Sprites.drawKart(g, kk, 220, 290, 2.1, Math.sin(time * 1.2) * 0.25, time);
    g.fillStyle = '#b8860b'; g.font = '900 26px "Malgun Gothic", sans-serif'; g.fillText('🪙 ' + garage.coins, 220, 414);
    g.fillStyle = '#8c7a95'; g.font = '800 14px "Malgun Gothic", sans-serif'; g.fillText(garageMsg, 220, 440);
    g.fillStyle = '#c38be0'; rrAt(g, 110, 458, 220, 50, 25); g.fill();
    g.fillStyle = '#ffffff'; g.font = '900 20px "Malgun Gothic", sans-serif'; g.fillText('다 꾸몄어요 ▶', 220, 490);
    // 탭
    SK.Garage.SLOTS.forEach((sl, i) => {
      const x = GRID.x + i * 118, on = sl.id === garageSlot;
      g.fillStyle = on ? '#ff8fb4' : 'rgba(255,255,255,0.85)'; rrAt(g, x, 110, 108, 40, 20); g.fill();
      g.fillStyle = on ? '#ffffff' : '#8c4a63'; g.font = '900 16px "Malgun Gothic", sans-serif'; g.fillText(sl.name, x + 54, 136);
    });
    SK.Garage.CATALOG[garageSlot].forEach((item, i) => {
      const cx = GRID.x + (i % GRID.cols) * (GRID.w + GRID.gap), cy = GRID.y + Math.floor(i / GRID.cols) * (GRID.h + GRID.gap);
      const st = SK.Garage.state(garage, garageSlot, item.id);
      g.globalAlpha = st === 'poor' || st === 'locked' ? 0.55 : 1;
      g.fillStyle = 'rgba(255,255,255,0.92)'; rrAt(g, cx, cy, GRID.w, GRID.h, 16); g.fill();
      g.strokeStyle = st === 'equipped' ? '#ff5c8a' : 'rgba(140,74,99,0.25)'; g.lineWidth = st === 'equipped' ? 4 : 2; g.stroke();
      const sw = item.color || item.tire;
      if (sw) {
        g.fillStyle = sw === 'rainbow' ? SK.Sprites.hsl((time * 0.3) % 1) : sw;
        g.beginPath(); g.arc(cx + 24, cy + 38, 13, 0, Math.PI * 2); g.fill();
      }
      g.textAlign = 'left'; g.fillStyle = '#4a3550'; g.font = '900 15px "Malgun Gothic", sans-serif';
      g.fillText(item.name, cx + (sw ? 44 : 14), cy + 32);
      g.font = '900 13px "Malgun Gothic", sans-serif';
      g.fillStyle = st === 'equipped' ? '#ff3d7a' : st === 'buy' ? '#b8860b' : '#8c7a95';
      const tag = st === 'equipped' ? '✓ 쓰는 중' : st === 'owned' ? '쓰기' : st === 'locked'
        ? (item.need === 'heart' ? '🏆 하트 컵 우승' : item.need === 'star' ? '🏆 별 컵 우승' : '🏆 컵 우승') : '🪙 ' + item.price;
      g.fillText(tag, cx + (sw ? 44 : 14), cy + 56);
      g.globalAlpha = 1; g.textAlign = 'center';
    });
  }
  function garagePointer(p) {
    if (Math.abs(p.x - 220) < 110 && Math.abs(p.y - 483) < 25) { scene = 'select'; selStep = 0; return; }
    SK.Garage.SLOTS.forEach((sl, i) => {
      const x = GRID.x + i * 118;
      if (p.x >= x && p.x <= x + 108 && p.y >= 110 && p.y <= 150) garageSlot = sl.id;
    });
    SK.Garage.CATALOG[garageSlot].forEach((item, i) => {
      const cx = GRID.x + (i % GRID.cols) * (GRID.w + GRID.gap), cy = GRID.y + Math.floor(i / GRID.cols) * (GRID.h + GRID.gap);
      if (p.x < cx || p.x > cx + GRID.w || p.y < cy || p.y > cy + GRID.h) return;
      const r = SK.Garage.tap(garage, garageSlot, item.id);
      if (r === 'bought' || r === 'equipped') { SK.Garage.save(garage); audio.sfx(r === 'bought' ? 'coin' : 'pickup'); garageMsg = r === 'bought' ? item.name + '을(를) 샀어요!' : item.name + ' 장착!'; }
      else if (r === 'poor') garageMsg = '코인이 ' + (item.price - garage.coins) + '개 더 필요해요. 경주에서 모아 와요!';
      else if (r === 'locked') garageMsg = '그랑프리 우승 트로피로 열려요!';
    });
  }

  // ---------- 루프 ----------
  let last = 0, lastDt = 0;
  function frame(now) {
    requestAnimationFrame(frame);
    const dt = Math.min(0.05, (now - last) / 1000 || 0);
    last = now;
    update(dt);
    lastDt = dt;

    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.fillStyle = '#2b2038';
    ctx.fillRect(0, 0, canvas.width / dpr, canvas.height / dpr);
    ctx.setTransform(scale * dpr, 0, 0, scale * dpr, offX * dpr, offY * dpr);
    ctx.save();
    ctx.beginPath(); ctx.rect(0, 0, W, H); ctx.clip();

    if (scene === 'select') {
      drawSelect();
    } else if (scene === 'garage') {
      drawGarage();
    } else if (scene === 'podium') {
      drawPodium(lastDt);
    } else {
      drawSky();
      drawWorld();
      drawHUD();
      drawCountdown();
      if (scene === 'result') drawResult();
    }
    ctx.restore();
  }

  // ---------- 시작 ----------
  function init() {
    canvas = document.getElementById('game');
    ctx = canvas.getContext('2d', { alpha: false });
    resize();
    window.addEventListener('resize', resize, { passive: true });

// ---- 아이패드 확대 잠금 ----
    // iOS 사파리는 iOS 10 부터 user-scalable=no 를 무시한다. 게임 중에 손가락이
    // 스치거나 두 번 두드리면 화면이 확대되고, 게임 캔버스는 스크롤이 없어서
    // 되돌릴 방법이 없다. 제스처와 더블탭을 직접 막는다.
    ['gesturestart', 'gesturechange', 'gestureend'].forEach(function (ev) {
      document.addEventListener(ev, function (e) { e.preventDefault(); }, { passive: false });
    });
    document.addEventListener('touchmove', function (e) {
      if (e.touches && e.touches.length > 1) e.preventDefault();
    }, { passive: false });
    var lastTouchEnd = 0;
    document.addEventListener('touchend', function (e) {
      var now = Date.now();
      if (now - lastTouchEnd < 320) e.preventDefault();
      lastTouchEnd = now;
    }, { passive: false });
    document.addEventListener('dblclick', function (e) { e.preventDefault(); }, { passive: false });

    // ---- 소리 버튼 / 내 음악 넣기 ----
    const el = id => document.getElementById(id);
    const soundBtn = el('sound'), bgmBox = el('bgm');
    const bgmFile = el('bgm-file'), bgmClear = el('bgm-clear'), bgmName = el('bgm-name');
    function paintSound() {
      soundBtn.textContent = audio.isMuted() ? '🔇' : '🔊';
      soundBtn.setAttribute('aria-label', audio.isMuted() ? '소리 켜기' : '소리 끄기');
    }
    function paintBgm(msg) {
      const n = audio.userTrackName();
      bgmName.textContent = msg || (n ? '내 음악: ' + n : '지금은 게임 기본 음악이에요');
      bgmClear.hidden = !n;
    }
    paintSound(); paintBgm();
    soundBtn.addEventListener('click', e => {
      e.stopPropagation(); audio.setMuted(!audio.isMuted()); paintSound();
    });
    bgmFile.addEventListener('change', () => {
      const f = bgmFile.files && bgmFile.files[0];
      bgmFile.value = '';
      if (!f) return;
      paintBgm('음악을 읽는 중…');
      audio.setUserTrack(f).then(() => paintBgm())
        .catch(() => paintBgm('이 파일은 재생할 수 없어요. 다른 파일로 해보세요'));
    });
    bgmClear.addEventListener('click', () => audio.clearUserTrack().then(() => paintBgm()));
    audio.restoreUserTrack().then(() => paintBgm());
    // 선택 화면에서만 보이게 한다 (주행 중에는 화면을 가리면 안 된다)
    setInterval(() => { bgmBox.classList.toggle('on', scene === 'select'); }, 200);

    window.addEventListener('keydown', e => {
      if (e.repeat && scene !== 'race') return;
      keys[e.code] = true;
      if (['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', 'Space'].includes(e.code)) e.preventDefault();
      if (scene === 'garage') { if (e.code === 'Escape' || e.code === 'Enter') scene = 'select'; return; }
      if (scene === 'podium') { if (e.code === 'Escape' || e.code === 'Enter' || e.code === 'Space') leavePodium(); return; }
      if (scene === 'select') {
        if (selStep === 0) {
          const n = SK.CHARACTERS.length;
          if (e.code === 'ArrowLeft') chosen = (chosen + n - 1) % n;
          if (e.code === 'ArrowRight') chosen = (chosen + 1) % n;
          if (e.code === 'KeyG') { openGarage(); return; }
          if (e.code === 'Space' || e.code === 'Enter') selStep = 1;
        } else {
          // 컵 두 개 → 코스 네 개 순서로 돈다
          const n = SK.CUPS.length + SK.TRACKS.length;
          let cur = cupSel >= 0 ? cupSel : SK.CUPS.length + trackIndex;
          if (e.code === 'ArrowLeft') cur = (cur + n - 1) % n;
          if (e.code === 'ArrowRight') cur = (cur + 1) % n;
          if (cur < SK.CUPS.length) cupSel = cur; else { cupSel = -1; trackIndex = cur - SK.CUPS.length; readRecords(); }
          if (e.code === 'KeyR' && rivalRec.unlocked && cupSel < 0) { gp = null; startRace(true); return; }
          if (e.code === 'Space' || e.code === 'Enter') { if (cupSel >= 0) startCup(cupSel); else { gp = null; startRace(); } }
          if (e.code === 'Escape') selStep = 0;
        }
      } else if (scene === 'result' && (e.code === 'Space' || e.code === 'Enter')) {
        if (gp) nextCupRace(); else startRace(rivalMode);
      } else if (scene === 'result' && e.code === 'Escape') {
        gp = null; scene = 'select'; selStep = 1;
      }
    }, { passive: false });
    window.addEventListener('keyup', e => { keys[e.code] = false; });

    canvas.addEventListener('pointerdown', e => {
      e.preventDefault();
      const p = toLogical(e);
      canvas.setPointerCapture?.(e.pointerId);
      if (scene === 'garage') { garagePointer(p); return; }
      if (scene === 'podium') { if (p.y > 440) { if (p.x > 480) { leavePodium(); openGarage(); } else leavePodium(); } return; }
      if (scene === 'select') {
        if (selStep === 0) {
          if (Math.abs(p.x - 480) < 130 && Math.abs(p.y - 144) < 18) { openGarage(); return; }
          const at = cardLayout(SK.CHARACTERS.length, CARD0_W);
          for (let i = 0; i < SK.CHARACTERS.length; i++) {
            if (Math.abs(p.x - at(i)) < CARD0_W / 2 + 2 && Math.abs(p.y - 270) < 96) {
              if (chosen === i) selStep = 1; else chosen = i;
              return;
            }
          }
          selStep = 1;
        } else {
          for (let i = 0; i < SK.CUPS.length; i++) {
            if (Math.abs(p.x - (330 + i * 300)) < 135 && Math.abs(p.y - 150) < 24) {
              if (cupSel === i) startCup(i); else cupSel = i;
              return;
            }
          }
          if (rivalRec.unlocked && cupSel < 0 && Math.abs(p.x - 480) < 150 && Math.abs(p.y - 416) < 16) { gp = null; startRace(true); return; }
          const at = cardLayout(SK.TRACKS.length, 196);
          for (let i = 0; i < SK.TRACKS.length; i++) {
            if (Math.abs(p.x - at(i)) < 100 && Math.abs(p.y - 288) < 118) {
              if (trackIndex === i && cupSel < 0) { gp = null; startRace(); } else { cupSel = -1; trackIndex = i; readRecords(); }
              return;
            }
          }
          if (p.y > 460) selStep = 0;   // 아래쪽을 누르면 뒤로
        }
        return;
      }
      if (scene === 'result') {
        if (p.y >= 430 && p.y <= 470) {
          if (p.x >= 230 && p.x < 480) { if (gp) nextCupRace(); else startRace(rivalMode); }
          else if (p.x >= 480 && p.x <= 730) { gp = null; scene = 'select'; selStep = 1; }
        }
        return;
      }
      // 레이스 조작
      if (Math.hypot(p.x - 92, p.y - (H - 88)) < 62) { touch.steer = -1; touch.leftId = e.pointerId; return; }
      if (Math.hypot(p.x - 242, p.y - (H - 88)) < 62) { touch.steer = 1; touch.leftId = e.pointerId; return; }
      if (Math.hypot(p.x - (W - 92), p.y - (H - 88)) < 62) { touch.drift = true; touch.rightId = e.pointerId; return; }
      if (Math.hypot(p.x - (W - 208), p.y - (H - 88)) < 52) { touch.item = true; setTimeout(() => { touch.item = false; }, 90); return; }
    }, { passive: false });

    const release = e => {
      if (touch.leftId === e.pointerId) { touch.steer = 0; touch.leftId = null; }
      if (touch.rightId === e.pointerId) { touch.drift = false; touch.rightId = null; }
    };
    canvas.addEventListener('pointerup', release);
    canvas.addEventListener('pointercancel', release);
    canvas.addEventListener('lostpointercapture', release);
    window.addEventListener('blur', () => {
      Object.keys(keys).forEach(key => { keys[key] = false; });
      Object.assign(touch, { steer: 0, drift: false, item: false, leftId: null, rightId: null });
    });

    readRecords();
    requestAnimationFrame(frame);
  }

  window.addEventListener('DOMContentLoaded', init);
  SK._debug = {
    get scene() { return scene; },
    get karts() { return karts; },
    get player() { return player; },
    get raceTime() { return raceTime; },
    get countdown() { return countdown; },
    startRace, setScene(s) { scene = s; }, pick(i) { chosen = i; },
    setTrack(i) { trackIndex = i; },
    get trackName() { return SK.Track ? SK.Track.name : null; },
    get heartCount() { return hearts.length; },
    get selStep() { return selStep; }, setStep(i) { selStep = i; },
    get rival() { return rival; }, get rivalMode() { return rivalMode; }, get rivalRec() { return rivalRec; },
    get rivalBeat() { return rivalBeat; }, startRival() { startRace(true); },
    // 자동 검증용: 화면이 멈춘 환경에서도 게임 시간을 진행시킨다
    step(dt) { update(dt); },
    draw() {
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      if (scene === 'select') drawSelect();
      else { drawSky(); drawWorld(); drawHUD(); drawCountdown(); if (scene === 'result') drawResult(); }
    },
    press(code) { keys[code] = true; },
    release(code) { keys[code] = false; },
    get fx() { return fx; }, get gp() { return gp; }, get garage() { return garage; }, get coinPicks() { return coinPicks; },
    get strikes() { return strikes; }, get items() { return items; },
    startCup, nextCupRace, showPodium, openGarage, updateVillains, garagePointer,
    setCup(i) { cupSel = i; },
    autopilot(on) { autoPilot = !!on; }
  };
})();
