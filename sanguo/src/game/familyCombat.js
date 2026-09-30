import { FAMILY_RANGED } from '../data/familyHeroes.js';

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
  const count = heroId === 'yungeon' ? 3 : heroId === 'taeo' ? 3 : 7;
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
