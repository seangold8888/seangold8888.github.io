'use strict';
(function (root) {
  const clamp = (n, a, b) => Math.max(a, Math.min(b, n));
  const ART = Object.freeze(Object.fromEntries(['lumi', 'mira', 'joy'].map(id => [id, Object.freeze({
    src: `art/characters/${id}-attacks-v1.png?v=1`, columns: 3, rows: 3,
    foot: 390 / 418, bodyFraction: {lumi: .77, mira: .65, joy: .8}[id], anchor: .5,
  })])));
  const images = new Map();
  // Optional atlases never prevent play when offline/loading fails.
  const ready = typeof Image === 'undefined' ? Promise.resolve([]) : Promise.allSettled(
    Object.entries(ART).map(([id, art]) => new Promise(resolve => {
      const image = new Image();
      let done = false;
      const finish = loaded => { if (done) return; done = true; clearTimeout(timer); resolve({id, loaded}); };
      const timer = setTimeout(() => finish(false), 7000);
      image.decoding = 'async'; image.onload = () => finish(true); image.onerror = () => finish(false);
      images.set(id, image); image.src = art.src;
    }))
  );
  function sample(player, guardian, steps) {
    if (player.attack <= 0 || player.dead || player.ultimate > 0 || player.dash > 0 || player.hurt > 0) return null;
    const row = clamp(player.attackStep | 0, 0, steps.length - 1), spec = steps[row];
    const elapsed = Math.max(0, (player.attackTotal - player.attack) * guardian.attackRate);
    const activeEnd = spec.windup + spec.active;
    const phase = elapsed < spec.windup ? 'windup' : elapsed <= activeEnd ? 'strike' : 'recover';
    const progress = phase === 'windup' ? clamp(elapsed / spec.windup, 0, 1)
      : phase === 'strike' ? clamp((elapsed - spec.windup) / spec.active, 0, 1)
      : clamp((elapsed - activeEnd) / spec.recovery, 0, 1);
    const col = phase === 'windup' ? 0 : phase === 'strike' ? 1 : 2;
    // Hit-stop freezes the same clock as the damage window.
    const shift = phase === 'windup' ? -4 * progress : phase === 'strike' ? 4 + 9 * Math.sin(progress * Math.PI / 2) : 13 * (1 - progress);
    return {row, col, phase, progress, shift,
      trail: phase === 'windup' ? 0 : phase === 'strike' ? 1 : Math.max(0, 1 - progress * 4)};
  }
  function draw(ctx, player, guardian, steps, originalSpec) {
    const pose = sample(player, guardian, steps), image = images.get(guardian.id), art = ART[guardian.id];
    if (!pose || !art || !image?.complete || !image.naturalWidth) return false;
    const sw = image.naturalWidth / art.columns, sh = image.naturalHeight / art.rows;
    const height = originalSpec.combatHeight / art.bodyFraction, width = height * sw / sh;
    ctx.save(); ctx.translate(pose.shift * (pose.row === 2 ? 1.3 : 1), 0);
    ctx.drawImage(image, pose.col * sw, pose.row * sh, sw, sh,
      -width * art.anchor, -height * art.foot + originalSpec.footOffset, width, height);
    ctx.restore(); return true;
  }
  function trail(ctx, player, guardian, steps, reduced) {
    const pose = sample(player, guardian, steps);
    if (!pose || pose.trail <= 0) return;
    const heavy = pose.row === 2, reverse = pose.row === 1;
    const sweep = pose.phase === 'strike' ? pose.progress : 1;
    const start = reverse ? 1.15 : -1.6;
    const tip = start + (reverse ? -2.35 : 2.6) * Math.max(.1, sweep);
    const tail = tip + (reverse ? 1 : -1) * Math.min(1.3, Math.abs(tip - start));
    const radius = guardian.range * (heavy ? .92 : .68);
    ctx.save(); ctx.globalCompositeOperation = 'lighter';
    ctx.globalAlpha *= pose.trail * (reduced ? .4 : .72); ctx.lineCap = 'round';
    const arc = (r, color, width, offset = 0) => {
      ctx.strokeStyle = color; ctx.lineWidth = width; ctx.beginPath();
      ctx.arc(18 + pose.shift, -65, r, tail + offset, tip + offset, reverse); ctx.stroke();
    };
    // Short travelling ribbons leave hands, weapons and faces readable.
    arc(radius, guardian.color, heavy ? 12 : 7); arc(radius + 2, guardian.accent, heavy ? 4 : 2);
    if (guardian.id === 'joy') arc(radius * .7, '#d8fffa', 3, .38);
    ctx.restore();
  }
  const api = Object.freeze({ART, ready, sample, draw, trail});
  root.KedehunAttackMotion = api;
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
})(globalThis);
