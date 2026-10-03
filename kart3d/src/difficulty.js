// Ordinary races are child-friendly. Record attempts and unlocked rivals stay unassisted.
export function isEasyRace(mode) {
  return !!mode && !mode.rival && mode.id !== 'time';
}

export const EASY_PLAYER_SPEED = 0.90;
export const EASY_AI_SPEED = 0.65;
export const EASY_ITEM_DELAY = 4;

export function assistInput(kart, input, guide) {
  const near = kart.track.nearest(kart.x, kart.z);
  const edge = near.dist > kart.track.roadHalf * 0.65;
  const manual = input.steer || 0;
  // Let children choose their lane; the guide becomes stronger near the guardrail.
  const steer = edge ? guide.steer + manual * 0.20
    : guide.steer * (1 - Math.abs(manual) * 0.65) + manual * 0.85;
  return {
    ...input,
    steer: Math.max(-1, Math.min(1, steer)),
    // Holding jump alone must not make the guide accidentally start a drift.
    drift: input.drift && Math.abs(manual) > 0.25 && !edge
  };
}

export function hitSnapshot(kart) {
  return { speed: kart.speed, coins: kart.coins || 0 };
}

export function softenHit(kart, before) {
  if (kart.finished) return false;
  const hit = kart.spin > 0 || kart.slip > 0 || kart.speed < before.speed * 0.78
    || (kart.coins || 0) < before.coins;
  if (!hit) return false;
  // Keep the impact cue, but not the disorienting spin or repeated severe slowdown.
  kart.spin = 0;
  kart.slip = 0;
  kart.speed = Math.max(kart.speed, before.speed * 0.82);
  kart.coins = Math.max(kart.coins || 0, before.coins - 1);
  kart.shield = Math.max(kart.shield || 0, 1.8);
  return true;
}
