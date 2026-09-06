/* Enemy art and readable combat rules. No dependency on a rendering framework. */
(function (root) {
  'use strict';
  const ATLAS = 'art/enemies/demon-roster-v1.png';
  const BACKGROUND = 'art/enemies/seoul-rooftop-v1.png';
  // Crops follow the inspected generated atlas (1254 x 1254), not assumed grid padding.
  const PROFILES = {
    shade: { name: '그림자 악귀', color: '#ba8cff', crop: [25, 12, 385, 393], height: 94, move: 'claw', hint: '할퀴기 · 뒤로 피하기' },
    wisp: { name: '도깨비불', color: '#76eaff', crop: [449, 0, 325, 400], height: 85, move: 'orb', hint: '불꽃 구슬 · 점프' },
    brute: { name: '철갑 악귀', color: '#ff668c', crop: [825, 6, 429, 399], height: 135, move: 'wave', hint: '지면 강타 · 점프' },
    baby: { name: '베이비', color: '#81ddff', crop: [89, 402, 281, 410], height: 141, move: 'volley', hint: '음파 사격 · 점프', spreads: [-0.12, 0.12], speed: 330 },
    abby: { name: '애비', color: '#c5a0ff', crop: [504, 404, 235, 407], height: 145, move: 'dash', hint: '파워 돌진 · 뛰어넘기', spreads: [0], speed: 260 },
    mystery: { name: '미스터리', color: '#ad99ff', crop: [843, 409, 348, 398], height: 148, move: 'wave', hint: '그림자 파동 · 점프', spreads: [0], speed: 240 },
    romance: { name: '로맨스', color: '#ff85c7', crop: [45, 809, 269, 431], height: 142, move: 'volley', hint: '하트 부채꼴 · 틈새 회피', spreads: [-0.42, 0, 0.42], speed: 240 },
    jinu: { name: '진우', color: '#d7a6ff', crop: [422, 794, 374, 454], height: 205, move: 'boss' },
    lion: { name: '그림자 사자', color: '#d499ff', crop: [799, 787, 455, 461], height: 212, move: 'boss' },
  };
  const ids = { '베이비': 'baby', '애비': 'abby', '미스터리': 'mystery', '로맨스': 'romance' };
  const profileId = (e) => e.kind === 'boss' ? (e.bossKind === 'jinu' ? 'jinu' : 'lion') : e.kind === 'saja' ? (ids[e.name] || 'baby') : e.kind;
  const profile = (e) => PROFILES[profileId(e)] || PROFILES.shade;
  function chooseSajaAttack(e, distance) {
    const move = profile(e).move;
    return move === 'wave' ? 2 : move === 'dash' ? 1 : distance < 110 ? 1 : 0;
  }
  function intent(e) {
    if (e.recovery > 0 && e.telegraph <= 0 && e.dash <= 0) return { text: '빈틈! 지금 공격', color: '#70efb2', recovery: true };
    if (!(e.telegraph > 0) || e.attackFired) return null;
    const p = profile(e);
    const type = e.kind === 'boss' || e.kind === 'saja' ? e.attackType : p.move === 'wave' ? 2 : p.move === 'claw' ? 3 : 0;
    return {
      text: type === 1 ? '돌진 · 뛰어넘기' : type === 2 ? '지면 파동 · 점프' : type === 3 ? '할퀴기 · 뒤로 피하기' : p.hint || '마력 구슬 · 점프',
      color: type === 1 ? '#ffb36b' : type === 2 ? '#ff729d' : '#7be5ff',
      type,
    };
  }
  const resources = {};
  function load(name, src) {
    if (typeof Image === 'undefined') return Promise.resolve(false);
    return new Promise((resolve) => {
      const image = new Image();
      let done = false;
      const finish = (ok) => { if (done) return; done = true; clearTimeout(timer); if (ok) resources[name] = image; resolve(ok); };
      const timer = setTimeout(() => finish(false), 7000);
      image.onload = () => finish(true);
      image.onerror = () => finish(false);
      image.decoding = 'async';
      image.src = src;
    });
  }
  const ready = Promise.allSettled([load('atlas', ATLAS), load('background', BACKGROUND)]);
  const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));
  function drawEnemy(ctx, e, x, y, time, reduced) {
    const image = resources.atlas;
    if (!image) return false;
    const p = profile(e), crop = p.crop, scale = image.width / 1254;
    const height = p.height, width = height * crop[2] / crop[3];
    const deathTime = e.kind === 'boss' ? 1.3 : e.kind === 'saja' ? .9 : .55;
    const fade = e.dead ? clamp(e.death / deathTime, 0, 1) : 1;
    const grow = clamp(1 - e.spawn * .5, .15, 1);
    const walk = Math.min(1, Math.abs(e.vx) / 140);
    const bob = reduced ? 0 : Math.sin(time * (walk ? 12 : 3) + e.id) * (walk ? 2 : 1);
    ctx.save();
    ctx.globalAlpha = fade;
    ctx.translate(x, y);
    ctx.fillStyle = '#05031199';
    ctx.beginPath(); ctx.ellipse(0, e.kind === 'wisp' ? 145 : 0, width * .36, 7, 0, 0, Math.PI * 2); ctx.fill();
    ctx.save();
    ctx.scale(e.facing * grow, grow);
    ctx.translate(0, bob);
    if (!reduced) ctx.rotate(e.dash > 0 ? .13 : e.telegraph > 0 && !e.attackFired ? -.055 : Math.sin(time * 10) * walk * .025);
    if (e.phaseTwo || e.flash > 0) { ctx.shadowColor = e.flash > 0 ? '#ffffff' : '#ff4ec2'; ctx.shadowBlur = e.flash > 0 ? 16 : 22; }
    ctx.drawImage(image, crop[0] * scale, crop[1] * scale, crop[2] * scale, crop[3] * scale, -width / 2, -height, width, height);
    ctx.restore();
    ctx.font = '700 12px system-ui';
    ctx.textAlign = 'center';
    ctx.lineWidth = 4; ctx.strokeStyle = '#08051e';
    ctx.fillStyle = e.phaseTwo ? '#ff8ecc' : p.color;
    const nameY = -height - 15;
    ctx.strokeText(p.name, 0, nameY); ctx.fillText(p.name, 0, nameY);
    if (!e.dead && e.kind !== 'boss' && e.health < e.maxHealth) {
      ctx.fillStyle = '#08051ed9'; ctx.fillRect(-32, nameY + 6, 64, 5);
      ctx.fillStyle = p.color; ctx.fillRect(-32, nameY + 6, 64 * clamp(e.health / e.maxHealth, 0, 1), 5);
    }
    ctx.restore();
    return true;
  }
  function drawIntent(ctx, e, x, y, time, groundY) {
    if (e.dead) return;
    const cue = intent(e);
    if (!cue) return;
    const p = profile(e);
    ctx.save();
    ctx.translate(x, groundY);
    ctx.strokeStyle = cue.color; ctx.fillStyle = cue.color; ctx.lineWidth = 2;
    if (!cue.recovery) {
      const total = e.telegraphTotal || 1;
      const threshold = e.kind === 'boss' ? (e.attackType === 1 ? .31 : .41) : e.kind === 'saja' ? .26 : e.kind === 'wisp' ? .28 : e.kind === 'brute' ? .23 : .18;
      const progress = clamp((total - e.telegraph) / Math.max(.01, total - threshold), 0, 1);
      ctx.save(); ctx.scale(e.facing, 1);
      ctx.globalAlpha = .16 + progress * .14;
      const length = cue.type === 1 ? (e.kind === 'boss' ? 380 : 240) : cue.type === 2 ? 260 : cue.type === 3 ? 115 : 155;
      const left = cue.type === 2 ? -length : 0;
      const w = cue.type === 2 ? length * 2 : length;
      ctx.fillRect(left, -6, w, 12); ctx.globalAlpha = .85; ctx.strokeRect(left, -6, w, 12);
      ctx.beginPath(); ctx.moveTo(length - 15, -13); ctx.lineTo(length, 0); ctx.lineTo(length - 15, 13); ctx.stroke();
      ctx.restore();
      ctx.globalAlpha = .95;
      ctx.beginPath(); ctx.arc(0, y - groundY - p.height * .55, 18, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * progress); ctx.stroke();
    }
    const labelY = y - groundY - p.height - 39;
    ctx.font = 'bold 12px system-ui'; ctx.textAlign = 'center';
    const w = ctx.measureText(cue.text).width + 18;
    ctx.fillStyle = '#08051eed'; ctx.fillRect(-w / 2, labelY - 14, w, 23);
    ctx.fillStyle = cue.color; ctx.fillText(cue.text, 0, labelY + 2);
    ctx.restore();
  }
  function drawBackground(ctx, width, height, camera, stageIndex) {
    const image = resources.background;
    if (!image) return false;
    const drawH = height, drawW = height * image.width / image.height;
    const offset = (camera * .065) % drawW;
    const firstTile = Math.floor(camera * .065 / drawW);
    ctx.save();
    for (let i = 0; i <= Math.ceil(width / drawW); i++) {
      ctx.save(); ctx.translate(i * drawW - offset, 0);
      // Alternate mirroring makes the seam meet the same source edge.
      if ((firstTile + i) % 2) { ctx.translate(drawW, 0); ctx.scale(-1, 1); }
      ctx.drawImage(image, 0, 0, drawW, drawH); ctx.restore();
    }
    if (stageIndex === 0) { ctx.fillStyle = '#74144124'; ctx.fillRect(0, 0, width, height); }
    ctx.restore(); return true;
  }
  root.KedehunCombat = Object.freeze({ PROFILES, ATLAS, BACKGROUND, ready, profileId, profile, chooseSajaAttack, intent, drawEnemy, drawIntent, drawBackground });
  if (typeof document !== 'undefined') {
    ready.then(() => {
      const roster = document.getElementById('demonRoster');
      if (!roster) return;
      for (const [id, p] of Object.entries(PROFILES)) {
        const card = document.createElement('article'); card.className = 'demon-card';
        const canvas = document.createElement('canvas'); canvas.width = 180; canvas.height = 200; canvas.setAttribute('aria-hidden', 'true');
        const ctx = canvas.getContext('2d');
        if (resources.atlas) {
          const c = p.crop, s = resources.atlas.width / 1254, h = 185, w = h * c[2] / c[3];
          ctx.drawImage(resources.atlas, c[0] * s, c[1] * s, c[2] * s, c[3] * s, (180 - w) / 2, 7, w, h);
        }
        const name = document.createElement('strong'); name.textContent = p.name;
        const hint = document.createElement('small'); hint.textContent = p.hint || '돌진 · 구슬 · 파동 / 체력 절반부터 2단계';
        card.append(canvas, name, hint); roster.append(card);
      }
    });
  }
})(globalThis);
