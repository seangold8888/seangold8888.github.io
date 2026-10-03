import { FAMILY_RANGED, FAMILY_TECHNIQUES } from '../data/familyHeroes.js';

export function startFamilyTechnique(heroId, action, now) {
  const spec = FAMILY_TECHNIQUES[heroId];
  if (!spec || !['special', 'musou'].includes(action)) return null;
  const powerful = action === 'musou';
  return { ...spec, heroId, action, started: now, duration: powerful ? 980 : 900,
    powerful, budget: powerful ? 110 : 82, next: 0 };
}

// Drain every crossed beat once, even after a slow frame/hitstop. No timers.
export function familyTechniquePulses(state, now) {
  const due = [];
  if (!state) return due;
  while (state.next < state.beats.length && now >= state.started + state.beats[state.next] * state.duration) {
    const index = state.next++;
    due.push({ ...state, index, weight: state.weights[index], final: index === state.beats.length - 1,
      range: state.range * (state.powerful ? 1.16 : 1) });
  }
  return due;
}

export function familyTechniqueTargets(pulse, player, enemies) {
  return enemies.filter(enemy => !enemy.deadAt && !enemy.grabbed && enemy.hp > 0
    && Math.abs(enemy.x - player.x) <= pulse.range
    && Math.abs(enemy.lane - player.lane) <= pulse.lane
    && (pulse.mode === 'bubble' || (enemy.x - player.x) * player.facing >= -24))
    .sort((a, b) => Math.abs(a.x - player.x) + Math.abs(a.lane - player.lane) * 2
      - Math.abs(b.x - player.x) - Math.abs(b.lane - player.lane) * 2);
}

export function familyPulseDamage(pulse, total) {
  const before = pulse.weights.slice(0, pulse.index).reduce((sum, weight) => sum + weight, 0);
  return Math.round(total * (before + pulse.weight)) - Math.round(total * before);
}

export function steerFamilyProjectile(arrow, dt, enemyHeight) {
  const target = arrow.homingTarget;
  if (!target || target.deadAt || target.grabbed || target.hp <= 0) return;
  // Do not circle behind a missed target or teleport onto a different enemy.
  const distance = (target.x - arrow.x) * Math.sign(arrow.vx);
  if (distance <= 20) { arrow.homingTarget = null; return; }
  const travel = Math.max(.08, distance / Math.abs(arrow.vx));
  const mix = 1 - Math.exp(-12 * Math.max(0, dt));
  arrow.laneV += (Math.max(-380, Math.min(380, (target.lane - arrow.lane) / travel)) - arrow.laneV) * mix;
  const aim = (enemyHeight * .53 - arrow.height + 260 * travel * travel) / travel;
  arrow.vz += (Math.max(-600, Math.min(600, aim)) - arrow.vz) * mix;
}

// Use the engine's existing gravity, charge, pierce and damage pipeline.
export function familyProjectile(heroId, player, target, heroHeight, enemyHeight, now) {
  const spec = FAMILY_RANGED[heroId];
  if (!spec) return null;
  const launch = heroHeight * .32;
  const x = player.x + player.facing * launch;
  const travel = Math.max(150, target ? Math.abs(target.x - x) : 760) / spec.speed;
  const height = heroHeight * spec.launch + (player.y || 0);
  const targetHeight = target ? enemyHeight * .53 : Math.max(28, height * .85);
  return { kind: spec.kind, x, lane: player.lane, height,
    vx: player.facing * spec.speed, laneV: ((target?.lane ?? player.lane) - player.lane) / travel,
    vz: (targetHeight - height + 260 * travel * travel) / travel,
    life: 1.45, max: 1.45, hit: false, trailAt: now, phase: 0, color: spec.color, damage: spec.damage };
}

function circle(ctx, x, y, radius) { ctx.beginPath(); ctx.arc(x, y, radius, 0, Math.PI * 2); }
function pentagon(ctx, x, y, radius, angle) {
  ctx.beginPath();
  for (let i = 0; i < 5; i++) {
    const a = angle + i * Math.PI * .4;
    const px = x + Math.cos(a) * radius, py = y + Math.sin(a) * radius;
    if (!i) ctx.moveTo(px, py); else ctx.lineTo(px, py);
  }
  ctx.closePath(); ctx.fill();
}

// Animated VFX, not character art. Caller owns the translated/rotated context.
export function drawFamilyProjectile(ctx, arrow, now) {
  if (!['kiwave', 'bubble', 'firefly', 'football'].includes(arrow.kind)) return false;
  const r = (arrow.charged ? 23 : 16), spin = now * .008;
  ctx.save();
  ctx.globalCompositeOperation = 'lighter'; ctx.shadowColor = arrow.color; ctx.shadowBlur = 18;
  ctx.strokeStyle = arrow.color; ctx.lineWidth = 8; ctx.globalAlpha = .32;
  ctx.beginPath(); ctx.moveTo(-76, 0); ctx.lineTo(-r, 0); ctx.stroke(); ctx.globalAlpha = 1;
  if (arrow.kind === 'football') {
    ctx.rotate(spin); ctx.globalCompositeOperation = 'source-over';
    ctx.fillStyle = '#fff5dd'; circle(ctx, 0, 0, r); ctx.fill();
    ctx.strokeStyle = '#e2983f'; ctx.lineWidth = 2; ctx.stroke();
    ctx.shadowBlur = 0; ctx.fillStyle = '#303137'; pentagon(ctx, 0, 0, r * .44, 0);
    for (let i = 0; i < 5; i++) {
      const a = i * Math.PI * .4;
      pentagon(ctx, Math.cos(a) * r * .81, Math.sin(a) * r * .81, r * .20, a);
    }
  } else if (arrow.kind === 'bubble') {
    const halo = ctx.createRadialGradient(-r * .35, -r * .4, 1, 0, 0, r);
    halo.addColorStop(0, 'rgba(255,255,255,.5)'); halo.addColorStop(.7, 'rgba(130,203,255,.12)'); halo.addColorStop(1, '#ffb8e1');
    ctx.fillStyle = halo; circle(ctx, 0, 0, r * 1.3); ctx.fill();
    ctx.strokeStyle = '#b7eeff'; ctx.lineWidth = 2; ctx.stroke();
    ctx.strokeStyle = '#fff'; ctx.lineWidth = 3; ctx.beginPath(); ctx.arc(0, 0, r * .94, -2.8, -1.7); ctx.stroke();
  } else if (arrow.kind === 'firefly') {
    for (let i = 0; i < 3; i++) {
      const x = -i * 16, y = Math.sin(spin * 2 + i * 2) * 9;
      ctx.fillStyle = '#d9f4b0'; ctx.globalAlpha = .65;
      ctx.beginPath(); ctx.ellipse(x - 3, y - 6, 9, 4, -.7, 0, Math.PI * 2); ctx.fill();
      ctx.beginPath(); ctx.ellipse(x + 3, y - 6, 9, 4, .7, 0, Math.PI * 2); ctx.fill();
      ctx.globalAlpha = 1; ctx.fillStyle = '#eeff90'; circle(ctx, x, y, arrow.charged ? 8 : 5); ctx.fill();
    }
  } else {
    ctx.strokeStyle = '#c8f5ff'; ctx.lineWidth = arrow.charged ? 8 : 5;
    for (let i = 0; i < 3; i++) { ctx.beginPath(); ctx.arc(-i * 12, 0, r + i * 7, -.95, .95); ctx.stroke(); }
  }
  ctx.restore(); return true;
}

export function drawFamilySpecial(ctx, heroId, x, y, facing, heroHeight, progress, now, powerful = false) {
  const spec = FAMILY_RANGED[heroId];
  if (!spec) return;
  const alpha = Math.sin(Math.PI * Math.min(1, progress));
  ctx.save(); ctx.translate(x, y - heroHeight * .48); ctx.scale(facing, 1); ctx.globalAlpha = alpha;
  // Travelling shots are drawn at their real collision position by the engine.
  // Here only the casting aura is shown, so decorative balls never look like hits.
  if (heroId === 'yunchan' || heroId === 'yungeon') {
    ctx.strokeStyle = spec.color; ctx.lineWidth = powerful ? 5 : 3;
    ctx.shadowColor = spec.color; ctx.shadowBlur = 15;
    ctx.beginPath(); ctx.ellipse(0, heroHeight * .44, 45 + progress * 25, 12, 0, 0, Math.PI * 2); ctx.stroke();
    ctx.restore(); return;
  }
  const count = heroId === 'taeo' ? 3 : 7;
  for (let i = 0; i < count; i++) {
    ctx.save();
    const angle = i * Math.PI * 2 / count + progress * 3;
    if (heroId === 'taeo' || heroId === 'yungeon') ctx.translate(32 + progress * (150 + i * 45), (i - 1) * 34);
    else ctx.translate(Math.cos(angle) * (45 + progress * 130), Math.sin(angle) * (35 + progress * 75));
    drawFamilyProjectile(ctx, { ...spec, charged: powerful }, now + i * 100);
    ctx.restore();
  }
  ctx.restore();
}

export function drawFamilyTechniqueImpact(ctx, effect, cameraX, floorY) {
  const progress = Math.max(0, Math.min(1, 1 - effect.life / effect.max));
  ctx.save(); ctx.translate(effect.x - cameraX, floorY + effect.lane - 80);
  ctx.globalAlpha = (1 - progress) * .8; ctx.strokeStyle = effect.color;
  ctx.shadowColor = effect.color; ctx.shadowBlur = 12; ctx.lineWidth = effect.final ? 6 : 3;
  if (effect.mode === 'bubble') {
    // Expanding elliptical wave sits on the same lane as the actual area hit.
    ctx.beginPath(); ctx.ellipse(0, 40, 30 + effect.range * progress, 20 + 60 * progress, 0, 0, Math.PI * 2); ctx.stroke();
  } else {
    ctx.scale(effect.facing, 1);
    ctx.beginPath(); ctx.arc(45, 0, 30 + 75 * progress, -1.25, 1.25); ctx.stroke();
    if (effect.final) { ctx.beginPath(); ctx.moveTo(-25, 12); ctx.lineTo(130 + 50 * progress, -20); ctx.stroke(); }
  }
  ctx.restore();
}

export function drawFamilyBind(ctx, enemy, cameraX, floorY, now) {
  if (now >= (enemy.familyBindUntil || 0)) return;
  ctx.save(); ctx.translate(enemy.x - cameraX, floorY + enemy.lane - 95);
  ctx.strokeStyle = '#ffb8e1'; ctx.fillStyle = 'rgba(255,184,225,.08)';
  ctx.lineWidth = 2; ctx.globalAlpha = Math.min(1, (enemy.familyBindUntil - now) / 160);
  ctx.beginPath(); ctx.ellipse(0, 0, 55, 95, Math.sin(now * .005) * .06, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
  ctx.restore();
}
