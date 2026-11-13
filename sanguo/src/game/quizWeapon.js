/**
 * ? 두루마리 — 수학 문제를 맞히면 그 전투 동안 무기가 한 단계씩 세진다.
 *
 * 단계는 반 칸(step) 단위로 센다. 한 번에 맞히면 2칸(+1 단계), 고쳐 맞히면 1칸(반 단계).
 * 0~8칸 = 무기 0~4단계. 틀려도 내려가지 않는다.
 *
 * 공격력은 기존 피해식 `(기본 × 장수 배율 + 명검 가산)` 에 단계 배율을 곱한다.
 * 4단계(×1.50)에서 보스 처치 시간은 0단계의 약 67%. 명검(14초 +18)과 겹칠 때는
 * 기본 피해의 1.65배(처치 시간 약 61%)에서 자르되, 명검만 먹었을 때보다 약해지지는 않는다.
 */
export const QUIZ_MAX_STEPS = 8;
export const QUIZ_MAX_TIER = 4;
export const QUIZ_DAMAGE_CAP = 1.65;
// 이 파를 다 쓸어낸 직후에 두루마리가 떨어진다(7파 = 적장, 그 직전 6파 포함). 전장당 4개.
export const QUIZ_SCROLL_WAVES = Object.freeze([2, 4, 5, 6]);

// palette = 베기 궤적 [어두운 테, 본색, 심지]. 0단계는 장수 고유 색을 그대로 쓴다.
export const QUIZ_WEAPON_TIERS = Object.freeze([
  Object.freeze({ tier: 0, power: 1.00, reach: 1.00, effect: 1.00, pierce: 0, glow: '기본', color: '#c9b892', palette: null }),
  Object.freeze({ tier: 1, power: 1.10, reach: 1.00, effect: 1.06, pierce: 0, glow: '은빛', color: '#e4ecf7', palette: Object.freeze(['#39424f', '#c6d2e2', '#ffffff']) }),
  Object.freeze({ tier: 2, power: 1.22, reach: 1.00, effect: 1.12, pierce: 0, glow: '푸른빛', color: '#5aa8ff', palette: Object.freeze(['#0a2a66', '#3d8cff', '#e3f1ff']) }),
  Object.freeze({ tier: 3, power: 1.36, reach: 1.06, effect: 1.20, pierce: 0, glow: '금빛', color: '#ffc928', palette: Object.freeze(['#5c3905', '#ffbf17', '#fff6c6']) }),
  Object.freeze({ tier: 4, power: 1.50, reach: 1.10, effect: 1.34, pierce: 1, glow: '불꽃', color: '#ff6a2a', palette: Object.freeze(['#6a1004', '#ff4a12', '#fff1a0']) }),
]);

export const clampSteps = (steps) => Math.max(0, Math.min(QUIZ_MAX_STEPS, Math.floor(Number(steps) || 0)));
export const quizTier = (steps) => Math.floor(clampSteps(steps) / 2);
export const quizTierInfo = (steps) => QUIZ_WEAPON_TIERS[quizTier(steps)];

/** 정답 한 번 반영. 반환 { steps, before, after, promoted, half, maxed } */
export function addQuizAnswer(steps, firstTry) {
  const prev = clampSteps(steps), next = clampSteps(prev + (firstTry ? 2 : 1));
  const before = quizTier(prev), after = quizTier(next);
  return { steps: next, before, after, promoted: after > before, half: next % 2 === 1, maxed: prev >= QUIZ_MAX_STEPS };
}

/** 무쌍 덤(gainRage 에 넘길 값). */
export const quizRageBonus = (firstTry) => (firstTry ? 50 : 25);

/**
 * base  = 기본 피해 × 장수 배율(명검 가산 전)
 * boost = 명검 가산(지금 18/16, 없으면 0)
 */
export function quizDamage(base, boost, steps) {
  const plain = base + boost;
  const info = quizTierInfo(steps);
  if (info.tier <= 0 || !(base > 0)) return plain;
  return Math.min(plain * info.power, Math.max(plain, base * QUIZ_DAMAGE_CAP));
}

/* ---------- 멈춘 시간만큼 절대 시각 타이머 밀기 ----------
   전투의 타이머는 전부 performance.now() 기준 절대 시각이다. 멈춰 있던 Δ 를 더하지 않으면
   재개하자마자 강화가 풀리고 적이 한꺼번에 덤빈다. 0·미설정·무한대 값은 그대로 둔다. */
export const PLAYER_TIMER_FIELDS = Object.freeze([
  'actionStarted', 'actionUntil', 'comboUntil', 'invulnerableUntil', 'weaponBoost', 'afterimageAt', 'footstepAt',
  'dashReady', 'dashEffectAt', 'whirlwindReady', 'counterReady', 'counterUntil', 'mountedChainUntil',
]);
export const ENEMY_TIMER_FIELDS = Object.freeze([
  'actionStarted', 'actionUntil', 'attackAt', 'hitUntil', 'deadAt', 'knockdownStarted', 'knockdownUntil', 'shockwaveAt', 'familyBindUntil',
]);
export const PROJECTILE_TIMER_FIELDS = Object.freeze(['trailAt']);

function shiftFields(target, fields, delta) {
  if (!target || typeof target !== 'object') return 0;
  let n = 0;
  for (const key of fields) {
    const v = target[key];
    if (typeof v === 'number' && Number.isFinite(v) && v > 0) { target[key] = v + delta; n += 1; }
  }
  return n;
}

/** state: { player, enemies, arrows, enemyArrows, shockwaves }. 반환: 밀어 준 값 개수. */
export function shiftBattleTimers(state, delta) {
  if (!(delta > 0) || !state) return 0;
  let n = 0;
  const player = state.player;
  if (player) {
    n += shiftFields(player, PLAYER_TIMER_FIELDS, delta);
    // 가족 영웅 기술은 started === actionStarted 로 '지금 그 기술 중'을 판정한다 — 둘을 같이 민다.
    if (player.familyTechnique) n += shiftFields(player.familyTechnique, ['started'], delta);
    if (player.dashHitLog instanceof Map) for (const hit of player.dashHitLog.values()) n += shiftFields(hit, ['at'], delta);
  }
  for (const enemy of state.enemies || []) n += shiftFields(enemy, ENEMY_TIMER_FIELDS, delta);
  for (const list of [state.arrows, state.enemyArrows, state.shockwaves]) for (const item of list || []) n += shiftFields(item, PROJECTILE_TIMER_FIELDS, delta);
  return n;
}

/** 단계가 오를 때 배너 문구. */
export function quizTierBanner(weaponName, steps) {
  const info = quizTierInfo(steps), name = weaponName || '무기';
  const pct = Math.round((info.power - 1) * 100);
  if (info.tier >= QUIZ_MAX_TIER) return { title: name + ' 각성!', sub: info.glow + ' · 공격력 +' + pct + '% · 사거리·베기 확대' };
  return { title: name + ' ' + info.tier + '단계!', sub: info.glow + ' · 공격력 +' + pct + '%' + (info.reach > 1 ? ' · 사거리 증가' : '') };
}
