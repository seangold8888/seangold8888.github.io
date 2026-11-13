/**
 * ? 두루마리 — 수학 문제를 맞히면 그 전투 동안 무기가 세진다.
 *
 * 단계는 반 칸(step) 단위로 센다. 한 번에 맞히면 2칸(+1 단계), 고쳐 맞히면 1칸(반 단계).
 * 0~8칸 = 무기 0~4단계. 틀려도 내려가지 않는다. 반 칸은 다음 단계 효과의 절반(1.5단계 = 공격력 +30%).
 *
 * 공격력: 단계당 +20%(4단계 ×1.80 → 보스 처치 시간 약 56%).
 * 명검(14초 +18)과 겹칠 때: (기본+명검)에 단계 배율을 곱하되 기본 피해의 2.0배에서 자른다.
 * 기본이 작아 명검만으로 이미 2배에 가까우면, 명검 값에서 상한(최소 명검 값의 1.25배)까지를
 * 칸 수에 비례해 나눠 주어 겹쳐도 단계마다 피해가 달라진다.
 */
export const QUIZ_MAX_STEPS = 8;
export const QUIZ_MAX_TIER = 4;
export const QUIZ_DAMAGE_CAP = 2.0;
export const QUIZ_BOOST_MIN_GAIN = 1.25;
// 이 파를 다 쓸어낸 직후에 두루마리가 떨어진다(7파 = 적장, 그 직전 6파 포함). 전장당 4개.
export const QUIZ_SCROLL_WAVES = Object.freeze([2, 4, 5, 6]);

// 정수 단계 표. palette = 베기 궤적 [어두운 테, 본색, 심지]. 0단계는 장수 고유 색을 그대로 쓴다.
export const QUIZ_WEAPON_TIERS = Object.freeze([
  Object.freeze({ tier: 0, power: 1.00, reach: 1.00, effect: 1.00, pierce: 0, glow: '기본', color: '#c9b892', palette: null }),
  Object.freeze({ tier: 1, power: 1.20, reach: 1.00, effect: 1.08, pierce: 0, glow: '은빛', color: '#e4ecf7', palette: Object.freeze(['#39424f', '#c6d2e2', '#ffffff']) }),
  Object.freeze({ tier: 2, power: 1.40, reach: 1.05, effect: 1.16, pierce: 0, glow: '푸른빛', color: '#5aa8ff', palette: Object.freeze(['#0a2a66', '#3d8cff', '#e3f1ff']) }),
  Object.freeze({ tier: 3, power: 1.60, reach: 1.10, effect: 1.25, pierce: 0, glow: '금빛', color: '#ffc928', palette: Object.freeze(['#5c3905', '#ffbf17', '#fff6c6']) }),
  Object.freeze({ tier: 4, power: 1.80, reach: 1.15, effect: 1.38, pierce: 1, glow: '불꽃', color: '#ff6a2a', palette: Object.freeze(['#6a1004', '#ff4a12', '#fff1a0']) }),
]);

export const clampSteps = (steps) => Math.max(0, Math.min(QUIZ_MAX_STEPS, Math.floor(Number(steps) || 0)));
export const quizTier = (steps) => Math.floor(clampSteps(steps) / 2);

// 칸별 실제 수치(반 칸은 앞뒤 단계의 가운데). 색·관통은 정수 단계를 따른다.
const STEP_INFO = Object.freeze(Array.from({ length: QUIZ_MAX_STEPS + 1 }, (_, steps) => {
  const base = QUIZ_WEAPON_TIERS[Math.floor(steps / 2)], next = QUIZ_WEAPON_TIERS[Math.min(QUIZ_MAX_TIER, Math.floor(steps / 2) + 1)];
  const mix = (key) => (steps % 2 ? (base[key] + next[key]) / 2 : base[key]);
  // 0.5단계는 아직 색이 없으니 1단계 색을 미리 빌려 '반 칸'도 눈에 보이게 한다.
  const look = base.tier === 0 && steps % 2 ? { glow: next.glow, color: next.color, palette: next.palette } : {};
  return Object.freeze({ ...base, ...look, steps, half: steps % 2 === 1, power: mix('power'), reach: mix('reach'), effect: mix('effect') });
}));
export const quizTierInfo = (steps) => STEP_INFO[clampSteps(steps)];
export const quizPowerPercent = (steps) => Math.round((quizTierInfo(steps).power - 1) * 100);

/** 정답 한 번 반영. 반환 { steps, before, after, promoted, half, maxed } */
export function addQuizAnswer(steps, firstTry) {
  const prev = clampSteps(steps), next = clampSteps(prev + (firstTry ? 2 : 1));
  const before = quizTier(prev), after = quizTier(next);
  return { steps: next, before, after, promoted: after > before, half: next % 2 === 1, maxed: prev >= QUIZ_MAX_STEPS };
}

/** 정답 즉시 보상: 무쌍(gainRage 값)·체력 회복 비율·기합 파동 크기. */
export const QUIZ_REWARD = Object.freeze({
  first: Object.freeze({ rage: 50, heal: .15, pulseRadius: 460, pulseScale: 1.15, knockMs: 900 }),
  retry: Object.freeze({ rage: 25, heal: .08, pulseRadius: 280, pulseScale: .85, knockMs: 600 }),
});
export const quizReward = (firstTry) => (firstTry ? QUIZ_REWARD.first : QUIZ_REWARD.retry);
export const quizRageBonus = (firstTry) => quizReward(firstTry).rage;

/**
 * base  = 기본 피해 × 장수 배율(명검 가산 전)
 * boost = 명검 가산(지금 18/16, 없으면 0)
 */
export function quizDamage(base, boost, steps) {
  const plain = base + boost;
  const info = quizTierInfo(steps);
  if (info.steps <= 0 || !(base > 0)) return plain;
  if (!(boost > 0)) return base * info.power;
  const cap = Math.max(base * QUIZ_DAMAGE_CAP, plain * QUIZ_BOOST_MIN_GAIN);
  const share = plain + (cap - plain) * (info.steps / QUIZ_MAX_STEPS);
  return Math.min(plain * info.power, share);
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

/** 정답 뒤 배너: 얻은 것을 전부 적는다. */
export function quizRewardBanner(weaponName, result, firstTry) {
  const info = quizTierInfo(result.steps), name = weaponName || '무기', reward = quizReward(firstTry);
  const level = info.tier + (info.half ? '.5' : '');
  const title = result.maxed ? name + ' 최고 단계!' : info.tier >= QUIZ_MAX_TIER && !info.half && result.promoted ? name + ' 각성!' : result.promoted ? name + ' ' + info.tier + '단계!' : name + ' ' + level + '단계 (반 칸)';
  const parts = ['공격력 +' + quizPowerPercent(result.steps) + '%'];
  if (info.reach > 1) parts.push('사거리 +' + Math.round((info.reach - 1) * 100) + '%');
  parts.push('무쌍 +' + reward.rage, '체력 +' + Math.round(reward.heal * 100) + '%');
  return { title, sub: info.glow + ' · ' + parts.join(' · ') };
}

/** 문제 패널에 미리 보여 줄 보상 안내. */
export function quizPreviewHint(weaponName, steps) {
  const now = clampSteps(steps), first = clampSteps(now + 2), retry = clampSteps(now + 1);
  const name = weaponName || '무기';
  if (now >= QUIZ_MAX_STEPS) return name + ' 최고 단계 · 맞히면 무쌍 +50 · 체력 +15%';
  return '한 번에: ' + name + ' 공격력 +' + quizPowerPercent(first) + '% · 무쌍 +50 · 체력 +15%  /  고쳐서: +' + quizPowerPercent(retry) + '% · 무쌍 +25 · 체력 +8%';
}
