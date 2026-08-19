// 산리오 카트 — 게임 셸: 캐릭터 고르기 → 레이스 → 결과
(function () {
  'use strict';
  window.SK = window.SK || {};

  const W = 960, H = 540;
  const LAPS = 3;
  const BEST_KEY = 'sanrio-kart:best:meadow';

  let canvas, ctx, dpr = 1, scale = 1, offX = 0, offY = 0;
  let trackTex = null;
  let scene = 'select';
  const audio = SK.createAudio();
  let sfxPrev = null, lastCount = null;
  let selStep = 0;          // 0 캐릭터 1 코스
  let trackIndex = 0;
  let time = 0, raceTime = 0, countdown = 3.6;
  let karts = [], player = null, chosen = 0;
  let items = [], boxes = [];
  let bestLap = null, lastLapStart = 0, playerBestLap = null;
  let resultOrder = [];
  const cam = { x: 0, y: 0, angle: 0, height: 150, fov: 320, horizon: 0.44 };

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
  function startRace() {
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
    const order = [chosen].concat(SK.CHARACTERS.map((_, i) => i).filter(i => i !== chosen));
    order.forEach((specIndex, slot) => {
      const spec = SK.CHARACTERS[specIndex];
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
      k.total = k.progress;
      k.lap = 0;
      karts.push(k);
      if (k.isPlayer) player = k;
    });

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
    raceTime = 0; countdown = 3.6; lastLapStart = 0;
    playerBestLap = null;
    resultOrder = [];
    scene = 'race';
    sfxPrev = null; lastCount = null;
    audio.startMusic(trackIndex);
    try { bestLap = parseFloat(localStorage.getItem(BEST_KEY)) || null; } catch (_) { bestLap = null; }
  }

  // ---------- 입력 ----------
  function playerInput() {
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
      k.update(dt, drive, surf);

      const prevLap = k.lap;
      const done = k.updateProgress(LAPS);
      if (k.isPlayer && k.lap > prevLap) {
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
            try { localStorage.setItem(BEST_KEY, String(bestLap)); } catch (_) {}
          }
        }
      }
    }

    updateItems(dt, input);
    updateCollisions(dt);
    updatePlaces();
    updateCamera(dt, false);

    if (player.finished) {
      // 남은 AI를 마저 달리게 두되, 잠시 뒤 결과 화면
      if (raceTime - player.finishTime > 1.8) {
        karts.forEach(k => { if (!k.finished) { k.finished = true; k.finishTime = raceTime + 99; resultOrder.push(k); } });
        scene = 'result';
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
      k.aiItemDelay = (k.aiItemDelay || 1.2) - dt;
      if (k.aiItemDelay <= 0) { useItem(k); k.aiItemDelay = 1.2; }
    }
    // 던져진 리본
    for (const it of items) {
      it.life -= dt;
      it.x += Math.sin(it.angle) * it.speed * dt;
      it.y -= Math.cos(it.angle) * it.speed * dt;
      it.speed *= 1 - dt * 1.1;
      for (const k of karts) {
        if (k === it.owner || it.life <= 0 || k.finished) continue;
        if (Math.hypot(k.x - it.x, k.y - it.y) < 40) {
          k.slip = 1.1; it.life = 0;
          break;
        }
      }
    }
    items = items.filter(it => it.life > 0);
  }

  function useItem(k) {
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
      if (p) drawables.push({ p, kind: 'ribbon' });
    }
    for (const k of karts) {
      if (k === player) continue;
      const p = SK.Mode7.project(k.x, k.y, cam, W, H);
      if (p) drawables.push({ p, kind: 'kart', kart: k });
    }
    drawables.sort((a, b) => b.p.forward - a.p.forward);
    for (const d of drawables) {
      const s = d.p.zoom * 0.62;
      if (d.kind === 'box') SK.Sprites.drawItemBox(ctx, d.p.x, d.p.y, s, time);
      else if (d.kind === 'ribbon') SK.Sprites.drawRibbon(ctx, d.p.x, d.p.y, s, time);
      else {
        let rel = d.kart.angle - cam.angle;
        while (rel > Math.PI) rel -= Math.PI * 2;
        while (rel < -Math.PI) rel += Math.PI * 2;
        SK.Sprites.drawKart(ctx, d.kart, d.p.x, d.p.y, s, Math.max(-1, Math.min(1, rel)), time);
      }
    }

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
    g.fillText(Math.min(LAPS, player.lap + 1) + ' / ' + LAPS, 96, 52);

    // 등수
    panel(W - 196, 22, 168, 62);
    g.fillStyle = '#4a3550';
    g.font = '900 20px "Malgun Gothic", sans-serif';
    g.fillText('등수', W - 180, 48);
    g.font = '900 34px "Malgun Gothic", sans-serif';
    g.fillStyle = player.place === 1 ? '#e8952c' : '#4a3550';
    g.fillText(player.place + '등', W - 118, 54);

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
    if (player.drift > 0) {
      const c = Math.min(1, player.driftCharge / 1.3);
      g.fillStyle = 'rgba(74,53,80,0.35)';
      rr(W * 0.5 - 70, H - 44, 140, 14, 7); g.fill();
      g.fillStyle = c > 0.85 ? '#ff8f45' : '#5cc8ff';
      rr(W * 0.5 - 67, H - 41, 134 * c, 8, 4); g.fill();
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
      const n = SK.CHARACTERS.length;
      const at = cardLayout(n, 112);
      SK.CHARACTERS.forEach((spec, i) => {
        const x = at(i), y = 280;
        const on = i === chosen;
        g.save();
        g.translate(x, y);
        g.scale(on ? 1.1 : 0.92, on ? 1.1 : 0.92);
        g.fillStyle = on ? 'rgba(255,255,255,0.95)' : 'rgba(255,255,255,0.7)';
        rrAt(g, -58, -100, 116, 206, 20); g.fill();
        g.strokeStyle = on ? '#ff5c8a' : 'rgba(140,74,99,0.35)';
        g.lineWidth = on ? 6 : 3; g.stroke();
        g.restore();

        const kk = { spec, bob: time * 2 + i, boost: 0, drift: 0, driftDir: 0 };
        SK.Sprites.drawKart(g, kk, x, y + 30, on ? 0.92 : 0.8, Math.sin(time * 1.5 + i) * 0.2, time);

        g.fillStyle = '#4a3550';
        g.font = '900 17px "Malgun Gothic", sans-serif';
        g.textAlign = 'center';
        g.fillText(spec.name, x, y + 82);
        g.font = '900 12px "Malgun Gothic", sans-serif';
        g.fillStyle = '#8c7a95';
        g.fillText('속도 ' + '★'.repeat(Math.max(1, Math.round((spec.top - 370) / 15))), x, y - 74);
        g.fillText('회전 ' + '★'.repeat(Math.max(1, Math.round((spec.turn - 2.1) / 0.22))), x, y - 58);
      });
    } else {
      const n = SK.TRACKS.length;
      const at = cardLayout(n, 196);
      SK.TRACKS.forEach((def, i) => {
        const x = at(i), y = 288;
        const on = i === trackIndex;
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
      });
    }

    g.fillStyle = '#8c4a63';
    g.font = '900 20px "Malgun Gothic", sans-serif';
    g.fillText(E_isTouch
      ? (selStep === 0 ? '카트를 눌러 고르세요' : '코스를 눌러 출발!')
      : (selStep === 0 ? '← → 로 고르고 스페이스' : '← → 로 고르고 스페이스로 출발!'), W * 0.5, 418);

    // 최고 기록은 위쪽에. 아래는 조작 설명 자리다.
    if (bestLap) {
      g.font = '900 15px "Malgun Gothic", sans-serif';
      g.fillStyle = '#a98fb0';
      g.fillText('최고 한 바퀴 기록 ' + fmt(bestLap), W * 0.5, 134);
    }

    drawControls(g);
  }

  // 조작 설명 — 아이가 처음 잡아도 알 수 있게 선택 화면에 그대로 적어 둔다.
  // 터치 기기와 키보드는 서로 다른 줄을 보여 준다.
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
    g.fillText(player.place === 1 ? '1등! 최고예요!' : '완주했어요!', W * 0.5, 132);

    resultOrder.slice(0, 4).forEach((k, i) => {
      const y = 190 + i * 58;
      g.textAlign = 'left';
      g.font = '900 26px "Malgun Gothic", sans-serif';
      g.fillStyle = k.isPlayer ? '#ff5c8a' : '#6b5b78';
      g.fillText((i + 1) + '등', W * 0.5 - 200, y);
      g.fillText(k.spec.name, W * 0.5 - 130, y);
      g.textAlign = 'right';
      g.font = '900 22px "Malgun Gothic", sans-serif';
      g.fillText(k.finishTime > 90 ? '—' : fmt(k.finishTime), W * 0.5 + 200, y);
    });

    g.textAlign = 'center';
    g.font = '900 20px "Malgun Gothic", sans-serif';
    g.fillStyle = '#8c7a95';
    if (playerBestLap) g.fillText('내 최고 바퀴 ' + fmt(playerBestLap), W * 0.5, 424);
    g.font = '900 24px "Malgun Gothic", sans-serif';
    g.fillStyle = '#4a3550';
    g.fillText(E_isTouch ? '화면을 누르면 다시 해요' : '스페이스로 다시 하기', W * 0.5, 458);
  }

  // ---------- 루프 ----------
  let last = 0;
  function frame(now) {
    requestAnimationFrame(frame);
    const dt = Math.min(0.05, (now - last) / 1000 || 0);
    last = now;
    update(dt);

    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.fillStyle = '#2b2038';
    ctx.fillRect(0, 0, canvas.width / dpr, canvas.height / dpr);
    ctx.setTransform(scale * dpr, 0, 0, scale * dpr, offX * dpr, offY * dpr);
    ctx.save();
    ctx.beginPath(); ctx.rect(0, 0, W, H); ctx.clip();

    if (scene === 'select') {
      drawSelect();
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
      keys[e.code] = true;
      if (['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', 'Space'].includes(e.code)) e.preventDefault();
      if (scene === 'select') {
        const n = selStep === 0 ? SK.CHARACTERS.length : SK.TRACKS.length;
        const cur = selStep === 0 ? chosen : trackIndex;
        let next = cur;
        if (e.code === 'ArrowLeft') next = (cur + n - 1) % n;
        if (e.code === 'ArrowRight') next = (cur + 1) % n;
        if (selStep === 0) chosen = next; else trackIndex = next;
        if (e.code === 'Space' || e.code === 'Enter') {
          if (selStep === 0) selStep = 1; else startRace();
        }
        if (e.code === 'Escape' && selStep === 1) selStep = 0;
      } else if (scene === 'result' && (e.code === 'Space' || e.code === 'Enter')) {
        scene = 'select'; selStep = 0;
      }
    }, { passive: false });
    window.addEventListener('keyup', e => { keys[e.code] = false; });

    canvas.addEventListener('pointerdown', e => {
      e.preventDefault();
      const p = toLogical(e);
      if (scene === 'select') {
        if (selStep === 0) {
          const at = cardLayout(SK.CHARACTERS.length, 112);
          for (let i = 0; i < SK.CHARACTERS.length; i++) {
            if (Math.abs(p.x - at(i)) < 62 && Math.abs(p.y - 280) < 112) {
              if (chosen === i) selStep = 1; else chosen = i;
              return;
            }
          }
          selStep = 1;
        } else {
          const at = cardLayout(SK.TRACKS.length, 196);
          for (let i = 0; i < SK.TRACKS.length; i++) {
            if (Math.abs(p.x - at(i)) < 100 && Math.abs(p.y - 288) < 118) {
              if (trackIndex === i) startRace(); else trackIndex = i;
              return;
            }
          }
          if (p.y > 460) selStep = 0;   // 아래쪽을 누르면 뒤로
          else startRace();
        }
        return;
      }
      if (scene === 'result') { scene = 'select'; selStep = 0; return; }
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

    try { bestLap = parseFloat(localStorage.getItem(BEST_KEY)) || null; } catch (_) {}
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
    get selStep() { return selStep; }, setStep(i) { selStep = i; },
    // 자동 검증용: 화면이 멈춘 환경에서도 게임 시간을 진행시킨다
    step(dt) { update(dt); },
    draw() {
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      if (scene === 'select') drawSelect();
      else { drawSky(); drawWorld(); drawHUD(); drawCountdown(); if (scene === 'result') drawResult(); }
    },
    press(code) { keys[code] = true; },
    release(code) { keys[code] = false; }
  };
})();
