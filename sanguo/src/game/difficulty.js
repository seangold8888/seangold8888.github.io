/**
 * 난이도.
 *
 * 체력 배수만 올려 전투를 늘어뜨리는 대신, 생존 여유·적 공격력·병력 수·
 * 동시 교전 수를 분리한다. 수련은 이야기 접근성, 출진은 표준 리듬,
 * 사지는 더 빠르고 많은 공세에 대응하는 숙련자 모드다.
 */
const LEVELS = {
  easy: {
    id: 'easy', name: '수련', sub: '이야기를 편히 따라가기',
    playerHp: 1.28, enemyHp: 0.80, enemyDamage: 0.62, enemyCount: 0.82,
    baseAttackers: 1, maxAttackers: 2, attackerRamp: 3,
    cooldown: 1.24, rage: 1.22,
  },
  normal: {
    id: 'normal', name: '출진', sub: '설계된 그대로의 난이도',
    playerHp: 1.05, enemyHp: 0.98, enemyDamage: 0.92, enemyCount: 1.00,
    baseAttackers: 2, maxAttackers: 3, attackerRamp: 3,
    cooldown: 1.04, rage: 1.00,
  },
  hard: {
    id: 'hard', name: '사지', sub: '더 거센 공세와 정교한 회피',
    playerHp: 0.92, enemyHp: 1.10, enemyDamage: 1.28, enemyCount: 1.14,
    baseAttackers: 2, maxAttackers: 4, attackerRamp: 2,
    cooldown: 0.86, rage: 0.88,
  },
};

const STORAGE_KEY = 'vesper-sgz:difficulty';

// 성장(progression)은 저장되는데 난이도만 새로고침마다 출진으로 돌아가면
// 사지로 도전 중인 사람이 매판 다시 골라야 한다.
let current = (() => {
  try { const saved = localStorage.getItem(STORAGE_KEY); return LEVELS[saved] ? saved : 'normal'; }
  catch { return 'normal'; }
})();

export const difficultyLevels = () => Object.values(LEVELS);
export const getDifficulty = () => LEVELS[current] || LEVELS.normal;
export const setDifficulty = (id) => {
  if (!LEVELS[id]) return;
  current = id;
  try { localStorage.setItem(STORAGE_KEY, id); } catch { /* 저장 불가 환경 */ }
};

/**
 * 파가 진행될수록 공격권을 가진 적을 늘린다. 난이도마다 시작 압박과
 * 증가 시점이 달라지고, 최종 상한은 각 난이도 설정을 따른다.
 */
export function attackerBudget(wave) {
  const d = getDifficulty();
  const safeWave = Math.max(1, Math.floor(Number(wave) || 1));
  const ramp = Math.max(1, d.attackerRamp || 3);
  return Math.min(d.maxAttackers, d.baseAttackers + Math.floor(Math.max(0, safeWave - 1) / ramp));
}