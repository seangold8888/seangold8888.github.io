// A locked wave is one arena for BOTH sides, including knockback and ranged AI.
export function combatBounds(worldWidth, waveGate, locked = true) {
  return { left: 170, right: Math.max(170, Math.min(worldWidth - 240, locked ? waveGate : worldWidth - 240)) };
}

export function clampCombatX(x, bounds, inset = 0) {
  const margin = Math.min(inset, (bounds.right - bounds.left) / 2);
  return Math.max(bounds.left + margin, Math.min(bounds.right - margin, x));
}

export function constrainEnemy(enemy, bounds) {
  enemy.x = clampCombatX(enemy.x, bounds, 24);
  enemy.lane = Math.max(-92, Math.min(72, enemy.lane));
}

export function waveSpawnX(playerX, side, index, count, jitter, bounds) {
  const anchor = clampCombatX(playerX, bounds, 24);
  const available = Math.max(0, side > 0 ? bounds.right - 24 - anchor : anchor - bounds.left - 24);
  const end = Math.min(available, 570 + (count - 1) * 185 + 100);
  const start = Math.min(570, end * .55);
  // Compress the formation into available space instead of stacking at the gate.
  const distance = start + (end - start) * (index + jitter) / count;
  return clampCombatX(anchor + side * distance, bounds, 24);
}
