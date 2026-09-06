const STORAGE_KEY = 'vesper-sgz:progression:v1';

export const MAX_HERO_LEVEL = 50;
export const MAX_WEAPON_LEVEL = 20;

const STAGE_ORDER = [
  'yellow', 'hulao', 'guandu', 'qianli', 'changban', 'redcliff', 'dongguan', 'dingjunshan', 'yiling', 'chushi',
  'flamemountain', 'heavenpalace', 'liangshan', 'snowshrine',
];

const DIFFICULTY_REWARD = { easy: .82, normal: 1, hard: 1.28 };
const blank = () => ({ xp: 0, mastery: 0, wins: 0, battles: 0, bestKo: 0, clears: {}, lossStreak: 0 });

const finiteStat = (value) => {
  const number = Number(value);
  return Number.isFinite(number) ? Math.max(0, Math.floor(number)) : 0;
};

function normalizeRaw(source) {
  const raw = { ...blank(), ...(source && typeof source === 'object' ? source : {}) };
  raw.xp = finiteStat(raw.xp);
  raw.mastery = finiteStat(raw.mastery);
  raw.wins = finiteStat(raw.wins);
  raw.battles = finiteStat(raw.battles);
  raw.bestKo = finiteStat(raw.bestKo);
  raw.lossStreak = finiteStat(raw.lossStreak);
  raw.clears = raw.clears && typeof raw.clears === 'object' && !Array.isArray(raw.clears) ? raw.clears : {};
  return raw;
}

function load() {
  try {
    const parsed = JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}');
    return parsed && typeof parsed === 'object' ? parsed : {};
  } catch { return {}; }
}

function save(state) {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(state)); } catch { /* 저장 불가 환경에서는 한 판만 진행 */ }
}

/* 초반 해금은 빠르게, 장기 구간은 완만하게 늘어난다. 기존 누적 XP는 그대로 사용한다. */
const heroNeed = (level) => 96 + (level - 1) * 40 + Math.floor(Math.pow(level - 1, 1.38) * 6);
const weaponNeed = (level) => 66 + (level - 1) * 38 + Math.floor(Math.pow(level - 1, 1.34) * 6);

function resolveTrack(total, maxLevel, needForLevel) {
  let level = 1, spent = 0;
  while (level < maxLevel) {
    const need = needForLevel(level);
    if (total - spent < need) break;
    spent += need; level += 1;
  }
  const need = level >= maxLevel ? 0 : needForLevel(level);
  return { level, current: level >= maxLevel ? 0 : total - spent, need, ratio: level >= maxLevel ? 1 : Math.max(0, Math.min(1, (total - spent) / need)) };
}

export function getHeroProgress(heroId) {
  const state = load(), raw = normalizeRaw(state[heroId]);
  const hero = resolveTrack(raw.xp, MAX_HERO_LEVEL, heroNeed);
  const weapon = resolveTrack(raw.mastery, MAX_WEAPON_LEVEL, weaponNeed);
  return { ...raw, heroId, level: hero.level, xpCurrent: hero.current, xpNeed: hero.need, xpRatio: hero.ratio, weaponLevel: weapon.level, masteryCurrent: weapon.current, masteryNeed: weapon.need, masteryRatio: weapon.ratio };
}

export function getCombatGrowth(heroId) {
  const progress = getHeroProgress(heroId), heroSteps = progress.level - 1, weaponSteps = progress.weaponLevel - 1;
  return {
    ...progress,
    hp: 1 + Math.min(.30, heroSteps * .012),
    power: 1 + Math.min(.50, heroSteps * .0065 + weaponSteps * .017),
    speed: 1 + Math.min(.10, Math.floor(heroSteps / 5) * .012),
    reach: 1 + Math.min(.16, weaponSteps * .009),
    arrow: 1 + Math.min(.50, heroSteps * .006 + weaponSteps * .019),
    startingRage: progress.level >= 15 ? 30 : progress.level >= 5 ? 15 : 0,
    cooldown: progress.level >= 25 ? .80 : progress.level >= 12 ? .88 : 1,
    finisher: progress.level >= 20 ? 1.30 : progress.level >= 8 ? 1.16 : 1,
    critChance: progress.weaponLevel >= 16 ? .18 : progress.weaponLevel >= 10 ? .13 : progress.weaponLevel >= 4 ? .08 : 0,
    pierce: progress.weaponLevel >= 13 ? 2 : progress.weaponLevel >= 7 ? 1 : 0,
    koHeal: progress.weaponLevel >= 18 ? .025 : progress.weaponLevel >= 11 ? .014 : 0,
    effectScale: 1 + Math.min(.34, weaponSteps * .018),
    /* 성장을 지워 버리는 역보정은 최소화하고, 후반 전투 붕괴만 살짝 억제한다. */
    enemyHp: 1 + Math.min(.04, heroSteps * .0005 + weaponSteps * .0008),
    enemyDamage: 1 + Math.min(.03, heroSteps * .0006),
  };
}

const PERKS = [
  { track: 'hero', level: 5, name: '기선제압', detail: '전투 시작 시 무쌍 15' },
  { track: 'weapon', level: 4, name: '예리한 날', detail: '치명타 확률 8%' },
  { track: 'weapon', level: 7, name: '관통 무예', detail: '원거리 공격 1회 관통' },
  { track: 'hero', level: 8, name: '연계 숙련', detail: '3연격 마무리 피해 +16%' },
  { track: 'weapon', level: 10, name: '명품의 기세', detail: '치명타 확률 13%' },
  { track: 'weapon', level: 11, name: '생기 흡수', detail: '격파 시 체력 회복' },
  { track: 'hero', level: 12, name: '신속한 호흡', detail: '돌진·선풍참 재사용 -12%' },
  { track: 'weapon', level: 13, name: '쌍중 관통', detail: '원거리 공격 2회 관통' },
  { track: 'hero', level: 15, name: '무쌍의 기세', detail: '전투 시작 시 무쌍 30' },
  { track: 'hero', level: 20, name: '절정의 연계', detail: '3연격 마무리 피해 +30%' },
];

export function unlockedPerks(progress) {
  return PERKS.filter((perk) => (perk.track === 'hero' ? progress.level : progress.weaponLevel) >= perk.level);
}

export function nextPerk(progress) {
  return PERKS.find((perk) => (perk.track === 'hero' ? progress.level : progress.weaponLevel) < perk.level) || null;
}

export function weaponGrade(level) {
  if (level >= 18) return '신화';
  if (level >= 15) return '전설';
  if (level >= 11) return '영웅';
  if (level >= 7) return '명품';
  if (level >= 4) return '정련';
  return '초급';
}

export const weaponEnhanceText = (progress) => '+' + Math.max(0, progress.weaponLevel - 1) + ' · ' + weaponGrade(progress.weaponLevel);

export function awardBattleProgress(heroId, { win = false, ko = 0, stageKey = '', difficultyId = 'normal' } = {}) {
  const before = getHeroProgress(heroId), state = load(), raw = normalizeRaw(state[heroId]);
  raw.clears = { ...raw.clears };
  const stageIndex = STAGE_ORDER.indexOf(stageKey), stageRank = Math.max(0, stageIndex);
  const difficulty = DIFFICULTY_REWARD[difficultyId] ?? DIFFICULTY_REWARD.normal;
  const safeKo = Math.max(0, Math.min(120, Number(ko) || 0));
  const creditedKo = win
    ? Math.min(safeKo, 50) + Math.min(40, Math.max(0, safeKo - 50)) * .25
    : Math.min(safeKo, 12) + Math.min(18, Math.max(0, safeKo - 12)) * .15;
  const firstClear = !!win && stageIndex >= 0 && !raw.clears[stageKey];
  const firstXp = firstClear ? 80 + stageRank * 9 : 0;
  const firstMastery = firstClear ? 44 + stageRank * 5 : 0;
  /* 연속 패배 보상은 완만히 줄여 방치 파밍을 막되, 재도전의 최소 보상은 남긴다. */
  const lossScale = win ? 1 : Math.max(.45, 1 / (1 + raw.lossStreak * .35));
  const baseXp = win ? 92 + stageRank * 8 + creditedKo * 1.65 : 14 + stageRank * 1.5 + creditedKo * .55;
  const baseMastery = win ? 50 + stageRank * 5 + creditedKo * .92 : 6 + stageRank * .7 + creditedKo * .24;
  const xp = Math.max(1, Math.round(baseXp * difficulty * lossScale + firstXp));
  const mastery = Math.max(1, Math.round(baseMastery * difficulty * lossScale + firstMastery));
  raw.xp += xp;
  raw.mastery += mastery;
  raw.battles += 1;
  raw.wins += win ? 1 : 0;
  raw.bestKo = Math.max(raw.bestKo, safeKo);
  raw.lossStreak = win ? 0 : Math.min(99, raw.lossStreak + 1);
  if (firstClear) raw.clears[stageKey] = true;
  state[heroId] = raw; save(state);
  const after = getHeroProgress(heroId);
  const oldPerks = unlockedPerks(before);
  const newlyUnlocked = unlockedPerks(after).filter((perk) => !oldPerks.some((old) => old.name === perk.name));
  return { xp, mastery, firstClear, newlyUnlocked, before, after, heroLevelUps: after.level - before.level, weaponLevelUps: after.weaponLevel - before.weaponLevel };
}