import { person, signature, stats, stage } from '../data.js';
import { workPerson, workStats, workStage, workWeapon } from '../data/works.js';
import { createScenery, SCENES } from './scenery.js';
import { tintSheet, TROOP_TINT, BOSS_TINT } from './tint.js';
import { getDifficulty, attackerBudget } from './difficulty.js';
import { createHudRoot, createEnemyHud, createPlayerHud, showBanner } from './hud.js';
import { showResult } from '../ui/result.js';
import { awardBattleProgress, getCombatGrowth, weaponEnhanceText } from './progression.js';
import { dashSkill, startDashState, collectDashHits } from './dashSkills.js';
import { combatBounds, clampCombatX, constrainEnemy, waveSpawnX } from './combatBounds.js';
import { MOUNT_PROFILES, drawConsistentMount } from './mountedSprites.js';

const CANVAS_UI_FONT = '"Pretendard Variable", Pretendard, "Noto Sans KR", "Malgun Gothic", sans-serif';
const CANVAS_IMPACT_FONT = CANVAS_UI_FONT;

const HERO_ART = {
  liubei: {
    hero: 'art/side-scroller/liubei-painted-sheet-v1.png',
    heroBow: 'art/side-scroller/liubei-bow-painted-sheet-v1.png',
    mounted: 'art/side-scroller/mounted-liubei-painted-sheet-v1.png',
    mountedBow: 'art/side-scroller/mounted-liubei-bow-painted-sheet-v1.png',
  },
  guanyu: {
    hero: 'art/side-scroller/guanyu-painted-sheet-v4.png',
    heroBow: 'art/side-scroller/guanyu-bow-painted-sheet-v1.png',
    mounted: 'art/side-scroller/mounted-guanyu-painted-sheet-v2.png',
    mountedBow: 'art/side-scroller/mounted-guanyu-bow-painted-sheet-v1.png',
  },
  zhangfei: {
    hero: 'art/side-scroller/zhangfei-painted-sheet-v1.png',
    heroBow: 'art/side-scroller/zhangfei-bow-painted-sheet-v1.png',
    mounted: 'art/side-scroller/mounted-zhangfei-painted-sheet-v1.png',
    mountedBow: 'art/side-scroller/mounted-zhangfei-bow-painted-sheet-v1.png',
  },
  caocao: { hero: 'art/side-scroller/caocao-painted-sheet-v1.png' },
  zhaoyun: { hero: 'art/side-scroller/zhaoyun-painted-sheet-v1.png' },
  machao: { hero: 'art/side-scroller/machao-painted-sheet-v1.png' },
  huangzhong: {
    hero: 'art/side-scroller/huangzhong-painted-sheet-v1.png',
    heroBow: 'art/side-scroller/huangzhong-bow-painted-sheet-v1.png',
  },
  zhouyu: { hero: 'art/side-scroller/zhouyu-painted-sheet-v1.png' },
  huanggai: { hero: 'art/side-scroller/huanggai-painted-sheet-v1.png' },
  zhugeliang: { hero: 'art/side-scroller/zhugeliang-painted-sheet-v1.png' },
  wukong: {
    hero: 'art/side-scroller/wukong-painted-sheet-v1.png',
    heroBow: 'art/side-scroller/wukong-bow-painted-sheet-v1.png',
    mounted: 'art/side-scroller/mounted-wukong-painted-sheet-v1.png',
    mountedBow: 'art/side-scroller/mounted-wukong-bow-painted-sheet-v1.png',
  },
  bajie: {
    hero: 'art/side-scroller/bajie-painted-sheet-v1.png',
    heroBow: 'art/side-scroller/bajie-bow-painted-sheet-v1.png',
    mounted: 'art/side-scroller/mounted-bajie-painted-sheet-v1.png',
    mountedBow: 'art/side-scroller/mounted-bajie-bow-painted-sheet-v1.png',
  },
  wujing: {
    hero: 'art/side-scroller/wujing-painted-sheet-v1.png',
    heroBow: 'art/side-scroller/wujing-bow-painted-sheet-v1.png',
    mounted: 'art/side-scroller/mounted-wujing-painted-sheet-v1.png',
    mountedBow: 'art/side-scroller/mounted-wujing-bow-painted-sheet-v1.png',
  },
  wusong: {
    hero: 'art/side-scroller/wusong-painted-sheet-v1.png',
    heroBow: 'art/side-scroller/wusong-bow-painted-sheet-v1.png',
    mounted: 'art/side-scroller/mounted-wusong-painted-sheet-v1.png',
    mountedBow: 'art/side-scroller/mounted-wusong-bow-painted-sheet-v1.png',
  },
  linchong: {
    hero: 'art/side-scroller/linchong-painted-sheet-v1.png',
    heroBow: 'art/side-scroller/linchong-bow-painted-sheet-v1.png',
    mounted: 'art/side-scroller/mounted-linchong-painted-sheet-v1.png',
    mountedBow: 'art/side-scroller/mounted-linchong-bow-painted-sheet-v1.png',
  },
  lizhishen: {
    hero: 'art/side-scroller/lizhishen-painted-sheet-v1.png',
    heroBow: 'art/side-scroller/lizhishen-bow-painted-sheet-v1.png',
    mounted: 'art/side-scroller/mounted-lizhishen-painted-sheet-v1.png',
    mountedBow: 'art/side-scroller/mounted-lizhishen-bow-painted-sheet-v1.png',
  },
  sunshangxiang: { hero: 'art/side-scroller/sunshangxiang-painted-sheet-v1.png' },
  tieshangongzhu: { hero: 'art/side-scroller/tieshangongzhu-painted-sheet-v2.png' },
  husanniang: { hero: 'art/side-scroller/husanniang-painted-sheet-v1.png' },
};

for (const [id, profile] of Object.entries(MOUNT_PROFILES)) {
  HERO_ART[id].rider = profile.rider;
  if (profile.bow) HERO_ART[id].heroBow = profile.bow;
}

const ART = {
  enemy: 'art/side-scroller/enemy-painted-sheet-v4.png',
  boss: 'art/side-scroller/hulao-boss-painted-sheet-v1.png',
  background: 'art/side-scroller/hulao-arcade-bg-v3.png',
  horse: 'art/side-scroller/red-hare-painted-sheet-v3.png',
  jindouyun: 'art/side-scroller/jindouyun-painted-sheet-v1.png',
  itemPickups: 'art/side-scroller/item-pickups-painted-atlas-v1.png',
  rewardChest: 'art/side-scroller/reward-chest-painted-v1.png',
};

const MOUNT_ART = {
  liubei: 'art/side-scroller/mount-liubei-painted-sheet-v1.png',
  guanyu: 'art/side-scroller/mount-guanyu-painted-sheet-v1.png',
  zhangfei: 'art/side-scroller/mount-zhangfei-painted-sheet-v1.png',
  wukong: 'art/side-scroller/jindouyun-painted-sheet-v1.png',
  bajie: 'art/side-scroller/mount-bajie-painted-sheet-v1.png',
  wujing: 'art/side-scroller/mount-wujing-painted-sheet-v1.png',
  wusong: 'art/side-scroller/mount-wusong-painted-sheet-v1.png',
  linchong: 'art/side-scroller/mount-linchong-painted-sheet-v1.png',
  lizhishen: 'art/side-scroller/mount-lizhishen-painted-sheet-v1.png',
};

for (const [id, profile] of Object.entries(MOUNT_PROFILES)) MOUNT_ART[id] = profile.horse;

const BOSS_ART = {
zhangjiao: 'art/side-scroller/boss-zhangjiao-painted-sheet-v1.png',
  huaxiong: 'art/side-scroller/boss-huaxiong-painted-sheet-v1.png',
  chunyuqiong: 'art/side-scroller/boss-chunyuqiong-painted-sheet-v1.png',
  caochun: 'art/side-scroller/boss-caochun-painted-sheet-v1.png',
  caimao: 'art/side-scroller/boss-caimao-painted-sheet-v1.png',
  xiahoudun: 'art/side-scroller/boss-xiahoudun-painted-sheet-v1.png',
  luxun: 'art/side-scroller/boss-luxun-painted-sheet-v1.png',
  simayi: 'art/side-scroller/boss-simayi-painted-sheet-v1.png',
  wumawang: 'art/side-scroller/boss-wumawang-painted-sheet-v1.png',
  erlangshen: 'art/side-scroller/boss-erlangshen-painted-sheet-v1.png',
  gaoqiu: 'art/side-scroller/boss-gaoqiu-painted-sheet-v1.png',
  luqian: 'art/side-scroller/boss-luqian-painted-sheet-v1.png',
};

const MOUNT_LABELS = {
  liubei: '백룡마',
  guanyu: '적토마',
  zhangfei: '흑철마',
  wukong: '근두운',
  bajie: '흑철야저',
  wujing: '유사하 수마',
  wusong: '경양강 준마',
  linchong: '설원 은마',
  lizhishen: '금강마',
};

// 화면·이동음·탑승음을 같은 분류에서 읽는다. 사오정의 수마가 말발굽
// 소리를 내거나 저팔계의 야저가 군마처럼 처리되는 폴백을 막는다.
for (const [id, profile] of Object.entries(MOUNT_PROFILES)) MOUNT_LABELS[id] = profile.label;

const MOUNT_KINDS = {
  liubei: 'horse', guanyu: 'horse', zhangfei: 'horse',
  wukong: 'cloud', bajie: 'boar', wujing: 'waterBeast',
  wusong: 'horse', linchong: 'horse', lizhishen: 'horse',
};

// 소설별 적장 프로필. 이름만 바뀌고 같은 화웅 스프라이트를 쓰지 않도록
// 색상·무기·실루엣 장식·공격 사거리까지 보스마다 따로 둔다.
const BOSS_PROFILES = {
  huaxiong: { kind: 'halberd', tint: { from: 0, to: 0, width: 54, sat: 1.10, val: 1.04 }, glow: '#ff7048', weapon: '대감도', attackRange: 210, hitRange: 205, damage: 22, hpScale: 1.02 },
  zhangjiao: { kind: 'staff', tint: { from: 0, to: 46, width: 56, sat: 1.12, val: 1.10 }, glow: '#ffd35d', weapon: '구절장', attackRange: 190, hitRange: 190, damage: 20, hpScale: .98 },
  chunyuqiong: { kind: 'axe', tint: { from: 0, to: 205, width: 54, sat: .82, val: 1.00 }, glow: '#b8d4ff', weapon: '대부', attackRange: 220, hitRange: 210, damage: 24, hpScale: 1.08 },
  caochun: { kind: 'spear', tint: { from: 0, to: 226, width: 54, sat: .88, val: .96 }, glow: '#9bbcff', weapon: '호표창', attackRange: 235, hitRange: 225, damage: 23, hpScale: 1.04 },
  caimao: { kind: 'spear', tint: { from: 0, to: 172, width: 54, sat: .84, val: 1.00 }, glow: '#67e5dd', weapon: '수군장창', attackRange: 225, hitRange: 215, damage: 22, hpScale: .96 },
  xiahoudun: { kind: 'halberd', tint: { from: 0, to: 232, width: 54, sat: .90, val: .94 }, glow: '#89aaff', weapon: '언월극', attackRange: 220, hitRange: 210, damage: 24, hpScale: 1.06 },
  luxun: { kind: 'fan', tint: { from: 0, to: 88, width: 54, sat: .86, val: .98 }, glow: '#b7ed8b', weapon: '우선', attackRange: 235, hitRange: 220, damage: 21, hpScale: .94 },
  simayi: { kind: 'sword', tint: { from: 0, to: 232, width: 54, sat: .90, val: .92 }, glow: '#a6b8ff', weapon: '지휘검', attackRange: 205, hitRange: 198, damage: 22, hpScale: 1.00 },
  // 조인 — 「굳게 지키고 나가 싸우지 마라」. 수비형이라 체력이 두껍고 공격이 느리다.
  caoren: { kind: 'spear', tint: { from: 0, to: 218, width: 54, sat: .86, val: .94 }, glow: '#9fb6e8', weapon: '수성장창', attackRange: 240, hitRange: 228, damage: 23, actionDuration: 600, cooldownScale: 1.12, hpScale: 1.22 },
  // 하후연 — 「사흘에 오백 리」. 반대로 빠르고 얇다.
  xiahouyuan: { kind: 'sword', tint: { from: 0, to: 250, width: 56, sat: .92, val: .95 }, glow: '#c2b0ff', weapon: '정서장검', attackRange: 215, hitRange: 206, damage: 25, actionDuration: 400, cooldownScale: .70, hpScale: .90 },
  // 서유기
  wumawang: { kind: 'bull', tint: { from: 0, to: 340, width: 68, sat: 1.18, val: .88 }, glow: '#ff7a38', weapon: '혼철곤', attackRange: 285, hitRange: 255, damage: 28, actionDuration: 590, cooldownScale: .82, hpScale: 1.18 },
  erlangshen: { kind: 'celestial', tint: { from: 0, to: 212, width: 64, sat: .72, val: 1.08 }, glow: '#a8d7ff', weapon: '삼첨양인도', attackRange: 300, hitRange: 245, damage: 26, actionDuration: 720, cooldownScale: .90, hpScale: .94 },
  // 수호지
  gaoqiu: { kind: 'marshal', tint: { from: 0, to: 98, width: 64, sat: .82, val: .92 }, glow: '#e6bc62', weapon: '군령창', attackRange: 250, hitRange: 230, damage: 25, actionDuration: 560, cooldownScale: .88, hpScale: 1.04 },
  luqian: { kind: 'betrayer', tint: { from: 0, to: 225, width: 62, sat: .92, val: .86 }, glow: '#b6c8ff', weapon: '쌍단도', attackRange: 230, hitRange: 220, damage: 24, actionDuration: 430, cooldownScale: .72, hpScale: .88 },
  default: { kind: 'halberd', tint: null, glow: '#ff7048', weapon: '장병기', attackRange: 205, hitRange: 195, damage: 22, hpScale: 1.00 },
};

const ENEMY_ROSTERS = {
  default: { faction: '적군', baseHue: 0, names: { soldier: '적 병졸', archer: '적 궁수', heavy: '적 중장', captain: '적 부장' }, hues: { soldier: 0, archer: 12, heavy: 28, captain: 345 }, weapons: { soldier: 'blade', archer: 'bow', heavy: 'axe', captain: 'halberd' }, accent: '#d56a45' },
  yellow: { faction: '황건적', baseHue: 46, names: { soldier: '황건 병졸', archer: '황건 궁수', heavy: '황건 장사', captain: '장각 호위대' }, hues: { soldier: 46, archer: 34, heavy: 20, captain: 8 }, weapons: { soldier: 'staff', archer: 'bow', heavy: 'club', captain: 'halberd' }, accent: '#e8bc4c' },
  hulao: { faction: '동탁군', baseHue: 0, names: { soldier: '서량 보병', archer: '서량 궁수', heavy: '서량 중갑', captain: '화웅 선봉대' }, hues: { soldier: 0, archer: 352, heavy: 338, captain: 18 }, weapons: { soldier: 'blade', archer: 'bow', heavy: 'axe', captain: 'halberd' }, accent: '#cf4d3d' },
  guandu: { faction: '원소군', baseHue: 205, names: { soldier: '원소군 보병', archer: '발해 궁수', heavy: '오소 중장', captain: '순우경 친위' }, hues: { soldier: 205, archer: 190, heavy: 224, captain: 250 }, weapons: { soldier: 'blade', archer: 'bow', heavy: 'club', captain: 'halberd' }, accent: '#9db7dc' },
  qianli: { faction: '위군 추격대', baseHue: 226, names: { soldier: '위군 추격병', archer: '하후돈 궁수', heavy: '철갑 추격대', captain: '하후돈 친위' }, hues: { soldier: 226, archer: 212, heavy: 244, captain: 265 }, weapons: { soldier: 'blade', archer: 'bow', heavy: 'axe', captain: 'halberd' }, accent: '#7d9ce0' },
  changban: { faction: '호표기', baseHue: 226, names: { soldier: '호표기 기병', archer: '위군 궁노', heavy: '호표기 중기병', captain: '조순 친위' }, hues: { soldier: 226, archer: 242, heavy: 260, captain: 278 }, weapons: { soldier: 'spear', archer: 'bow', heavy: 'spear', captain: 'halberd' }, accent: '#6d8dc6' },
  redcliff: { faction: '조조 수군', baseHue: 172, names: { soldier: '강동 수군', archer: '연노 수군', heavy: '화전 중장', captain: '채모 수군대장' }, hues: { soldier: 172, archer: 158, heavy: 186, captain: 202 }, weapons: { soldier: 'blade', archer: 'bow', heavy: 'club', captain: 'halberd' }, accent: '#5ed4c7' },
  yiling: { faction: '오군', baseHue: 96, names: { soldier: '오군 보병', archer: '오군 궁수', heavy: '화공 중장', captain: '육손 친위' }, hues: { soldier: 96, archer: 82, heavy: 116, captain: 132 }, weapons: { soldier: 'spear', archer: 'bow', heavy: 'club', captain: 'halberd' }, accent: '#8fbe61' },
  chushi: { faction: '위군', baseHue: 226, names: { soldier: '위군 보병', archer: '위군 궁수', heavy: '철갑 위군', captain: '사마의 친위' }, hues: { soldier: 226, archer: 212, heavy: 244, captain: 264 }, weapons: { soldier: 'blade', archer: 'bow', heavy: 'axe', captain: 'halberd' }, accent: '#8196d5' },
  dongguan: { faction: '조조군 도하부대', baseHue: 218, names: { soldier: '도하 보병', archer: '위수 궁수', heavy: '부교 공병', captain: '조인 수비대' }, hues: { soldier: 218, archer: 204, heavy: 236, captain: 256 }, weapons: { soldier: 'spear', archer: 'bow', heavy: 'axe', captain: 'halberd' }, accent: '#89a6dd' },
  dingjunshan: { faction: '한중 수비군', baseHue: 250, names: { soldier: '한중 보병', archer: '산등성 궁수', heavy: '녹각 방패병', captain: '하후연 친위' }, hues: { soldier: 250, archer: 236, heavy: 264, captain: 280 }, weapons: { soldier: 'blade', archer: 'bow', heavy: 'club', captain: 'halberd' }, accent: '#a99adf' },
  flamemountain: { faction: '우마왕군', baseHue: 46, names: { soldier: '화염산 요괴', archer: '화염 궁귀', heavy: '철우 전위', captain: '우마왕 철위' }, hues: { soldier: 12, archer: 28, heavy: 0, captain: 345 }, weapons: { soldier: 'club', archer: 'bow', heavy: 'axe', captain: 'halberd' }, accent: '#ff8842' },
  heavenpalace: { faction: '천궁', baseHue: 205, names: { soldier: '천병', archer: '천궁 궁수', heavy: '천장 거인', captain: '이랑진군 친위' }, hues: { soldier: 226, archer: 248, heavy: 210, captain: 278 }, weapons: { soldier: 'spear', archer: 'bow', heavy: 'club', captain: 'halberd' }, accent: '#9fc5ff' },
  liangshan: { faction: '관군', baseHue: 96, names: { soldier: '포위 관군', archer: '관군 궁수', heavy: '도통제 중군', captain: '관군 친위' }, hues: { soldier: 0, archer: 14, heavy: 28, captain: 345 }, weapons: { soldier: 'spear', archer: 'bow', heavy: 'axe', captain: 'halberd' }, accent: '#d78557' },
  snowshrine: { faction: '추격 관군', baseHue: 226, names: { soldier: '추격 관군', archer: '산신묘 자객', heavy: '무장 추격대', captain: '육겸 친위' }, hues: { soldier: 0, archer: 18, heavy: 34, captain: 350 }, weapons: { soldier: 'blade', archer: 'bow', heavy: 'axe', captain: 'halberd' }, accent: '#c7d4e6' },
};

const COMBAT_PROFILES = {
  liubei: { attackTheme: 'water', specialTheme: 'jade', whirlwindTheme: 'storm', musouTheme: 'solar', arrowColor: '#8ec8ff', hitColor: '#8ec8ff', impactStyle: 'ribbon', audioStyle: 'dual', kinds: { 1: 'sweep', 2: 'reverse', 3: 'wide', special: 'wide', mountedThrust: 'reverse' } },
  guanyu: { attackTheme: 'jade', specialTheme: 'water', whirlwindTheme: 'storm', musouTheme: 'water', arrowColor: '#78e8d0', hitColor: '#62e8c1', impactStyle: 'crescent', audioStyle: 'guandao', kinds: { 1: 'sweep', 2: 'overhead', 3: 'wide', heavy: 'overhead', mountedThrust: 'overhead' } },
  zhangfei: { attackTheme: 'flame', specialTheme: 'inferno', whirlwindTheme: 'flame', musouTheme: 'solar', arrowColor: '#ff9a4e', hitColor: '#ff7548', impactStyle: 'burst', audioStyle: 'spear', kinds: { 1: 'thrust', 2: 'thrust', 3: 'wide', heavy: 'thrust', mountedThrust: 'thrust' } },
  caocao: { attackTheme: 'thunder', specialTheme: 'storm', whirlwindTheme: 'thunder', musouTheme: 'inferno', arrowColor: '#b58cff', hitColor: '#a578ff', impactStyle: 'crescent', audioStyle: 'dual', kinds: { 1: 'sweep', 2: 'reverse', 3: 'wide', special: 'wide', mountedThrust: 'thrust' } },
  zhaoyun: { attackTheme: 'water', specialTheme: 'lightning', whirlwindTheme: 'storm', musouTheme: 'lightning', arrowColor: '#c9f4ff', hitColor: '#83e8ff', impactStyle: 'crescent', audioStyle: 'spear', kinds: { 1: 'thrust', 2: 'thrust', 3: 'wide', special: 'thrust', mountedThrust: 'thrust' } },
  // 마초 — 서량 기병. 같은 창이라도 조운이 '한 점을 꿰뚫는' 창이면 마초는
  // '달리면서 훑는' 창이다. 그래서 2타를 옆으로 후리고 돌진을 주무기로 준다.
  machao: { attackTheme: 'storm', specialTheme: 'lightning', whirlwindTheme: 'storm', musouTheme: 'lightning', arrowColor: '#d8e6ff', hitColor: '#b9d4ff', impactStyle: 'crescent', audioStyle: 'spear', kinds: { 1: 'thrust', 2: 'sweep', 3: 'wide', heavy: 'thrust', special: 'thrust', whirlwind: 'spin', mountedThrust: 'thrust' } },
  // 황충 — 노장의 대도. 느리고 무겁게 내리찍고, 활은 이 게임에서 가장 강하다.
  huangzhong: { attackTheme: 'earth', specialTheme: 'solar', whirlwindTheme: 'earth', musouTheme: 'solar', arrowColor: '#ffd989', hitColor: '#f0b755', impactStyle: 'burst', audioStyle: 'guandao', kinds: { 1: 'overhead', 2: 'sweep', 3: 'wide', heavy: 'overhead', special: 'overhead', mountedThrust: 'sweep' } },
  zhouyu: { attackTheme: 'flame', specialTheme: 'inferno', whirlwindTheme: 'storm', musouTheme: 'solar', arrowColor: '#ff9d72', hitColor: '#ff7456', impactStyle: 'ribbon', audioStyle: 'dual', kinds: { 1: 'sweep', 2: 'reverse', 3: 'spin', special: 'wide', mountedThrust: 'reverse' } },
  huanggai: { attackTheme: 'earth', specialTheme: 'flame', whirlwindTheme: 'earth', musouTheme: 'inferno', arrowColor: '#ffc271', hitColor: '#ef9d46', impactStyle: 'burst', audioStyle: 'monkstaff', kinds: { 1: 'overhead', 2: 'wide', 3: 'spin', special: 'overhead', mountedThrust: 'wide' } },
  zhugeliang: { attackTheme: 'storm', specialTheme: 'lightning', whirlwindTheme: 'cloud', musouTheme: 'thunder', arrowColor: '#e2eeff', hitColor: '#9edfff', impactStyle: 'cloud', audioStyle: 'fan', kinds: { 1: 'sweep', 2: 'wide', 3: 'spin', special: 'wide', mountedThrust: 'reverse' } },
  wukong: { attackTheme: 'solar', specialTheme: 'cloud', whirlwindTheme: 'solar', musouTheme: 'solar', arrowColor: '#ffd35e', hitColor: '#ffd35e', impactStyle: 'cloud', audioStyle: 'staff', kinds: { 1: 'sweep', 2: 'spin', 3: 'wide', special: 'spin', whirlwind: 'spin', mountedThrust: 'thrust' } },
  bajie: { attackTheme: 'earth', specialTheme: 'inferno', whirlwindTheme: 'earth', musouTheme: 'flame', arrowColor: '#e0a1ff', hitColor: '#d08aff', impactStyle: 'boar', audioStyle: 'rake', kinds: { 1: 'rake', 2: 'overhead', 3: 'wide', heavy: 'overhead', special: 'rake', mountedThrust: 'rake' } },
  wujing: { attackTheme: 'water', specialTheme: 'storm', whirlwindTheme: 'water', musouTheme: 'storm', arrowColor: '#83dfff', hitColor: '#5ac8f0', impactStyle: 'ribbon', audioStyle: 'crescent', kinds: { 1: 'sweep', 2: 'thrust', 3: 'spin', special: 'thrust', mountedThrust: 'wide' } },
  wusong: { attackTheme: 'flame', specialTheme: 'inferno', whirlwindTheme: 'solar', musouTheme: 'flame', arrowColor: '#ffb45c', hitColor: '#ff8d49', impactStyle: 'burst', audioStyle: 'dual', kinds: { 1: 'reverse', 2: 'sweep', 3: 'wide', special: 'reverse', mountedThrust: 'reverse' } },
  linchong: { attackTheme: 'storm', specialTheme: 'water', whirlwindTheme: 'storm', musouTheme: 'storm', arrowColor: '#9fe7ff', hitColor: '#7ae0ef', impactStyle: 'crescent', audioStyle: 'spear', kinds: { 1: 'thrust', 2: 'wide', 3: 'thrust', special: 'thrust', mountedThrust: 'thrust' } },
  lizhishen: { attackTheme: 'thunder', specialTheme: 'solar', whirlwindTheme: 'thunder', musouTheme: 'inferno', arrowColor: '#ffcf6a', hitColor: '#ffc05c', impactStyle: 'burst', audioStyle: 'monkstaff', kinds: { 1: 'overhead', 2: 'wide', 3: 'spin', heavy: 'overhead', mountedThrust: 'spin' } },
  sunshangxiang: { attackTheme: 'flame', specialTheme: 'solar', whirlwindTheme: 'storm', musouTheme: 'solar', arrowColor: '#ffc76d', hitColor: '#ffb65f', impactStyle: 'crescent', audioStyle: 'dual', kinds: { 1: 'sweep', 2: 'reverse', 3: 'wide', special: 'spin', whirlwind: 'spin' } },
  tieshangongzhu: { attackTheme: 'storm', specialTheme: 'inferno', whirlwindTheme: 'flame', musouTheme: 'inferno', arrowColor: '#ffb062', hitColor: '#ff8a55', impactStyle: 'cloud', audioStyle: 'fan', kinds: { 1: 'sweep', 2: 'wide', 3: 'spin', special: 'wide', whirlwind: 'spin' } },
  husanniang: { attackTheme: 'water', specialTheme: 'jade', whirlwindTheme: 'storm', musouTheme: 'solar', arrowColor: '#ff667f', hitColor: '#ff8da5', impactStyle: 'ribbon', audioStyle: 'dual', kinds: { 1: 'reverse', 2: 'sweep', 3: 'spin', special: 'wide', whirlwind: 'spin' } },
};

const SPECIAL_CALLOUTS = {
  liubei: { special: { name: '덕의검기', cry: '백성을 지키는 쌍검의 기세' }, musou: { name: '인왕쌍룡참', cry: '인의로 난세를 가른다' } },
  guanyu: { special: { name: '청룡일섬', cry: '언월도의 단호한 일격' }, musou: { name: '청룡언월참', cry: '청룡이 전장을 가른다' } },
  zhangfei: { special: { name: '장판뇌후', cry: '함성으로 만군을 멈춘다' }, musou: { name: '만군벽력진', cry: '장팔사모의 폭풍' } },
  caocao: { special: { name: '패왕기습진', cry: '난세를 거머쥐는 진격' }, musou: { name: '간웅천하참', cry: '패도의 검이 적진을 가른다' } },
  machao: { special: { name: '서량질풍창', cry: '서량 기병의 속도 그대로' }, musou: { name: '신위천장군', cry: '강족이 두려워한 이름' } },
  huangzhong: { special: { name: '정군산일격', cry: '때를 기다린 노장의 한 칼' }, musou: { name: '한승백보궁', cry: '흰 수염의 활이 하늘을 덮는다' } },
  zhaoyun: { special: { name: '용담은룡파', cry: '한 줄기 은빛 돌파' }, musou: { name: '칠진칠출격', cry: '용담의 창은 멈추지 않는다' } },
  zhouyu: { special: { name: '적벽화신계', cry: '적벽을 물들인 화공' }, musou: { name: '신화주유진', cry: '장강을 뒤덮는 불의 진' } },
  huanggai: { special: { name: '고육화공진', cry: '몸을 던져 전세를 바꾼다' }, musou: { name: '맹장화선충', cry: '결사의 화선 돌격' } },
  zhugeliang: { special: { name: '팔진동남풍', cry: '팔진의 흐름을 뒤집는다' }, musou: { name: '와룡천변진', cry: '와룡이 부르는 천변' } },
  sunshangxiang: { special: { name: '강동비연무', cry: '쌍환이 그리는 불꽃 궤적' }, musou: { name: '화우연환진', cry: '강동의 불꽃이 쏟아진다' } },
  wukong: { special: { name: '제천분신격', cry: '여의봉과 분신의 연격' }, musou: { name: '대성천궁파', cry: '천궁을 뒤흔드는 대성의 힘' } },
  bajie: { special: { name: '천봉구치진', cry: '아홉 갈퀴의 대지 강타' }, musou: { name: '구치붕산격', cry: '천봉원수의 괴력' } },
  wujing: { special: { name: '유사항요참', cry: '유사하의 물결을 두른 참격' }, musou: { name: '창해항요진', cry: '창해가 요기를 삼킨다' } },
  tieshangongzhu: { special: { name: '파초열풍진', cry: '거대한 바람의 벽' }, musou: { name: '화염파초풍', cry: '화염산의 열풍이 폭발한다' } },
  wusong: { special: { name: '경양취호격', cry: '취기가 실린 연환격' }, musou: { name: '타호천강진', cry: '맨주먹으로 맹호를 꺾는다' } },
  linchong: { special: { name: '표자두빙창진', cry: '눈보라를 가르는 장창' }, musou: { name: '설풍백련창', cry: '백 번 이어지는 빙설의 찌르기' } },
  lizhishen: { special: { name: '금강선장풍', cry: '수마선장이 대지를 울린다' }, musou: { name: '도해붕산진', cry: '산을 뽑는 금강의 괴력' } },
  husanniang: { special: { name: '일월홍금쇄', cry: '쌍도와 홍금투삭의 연계' }, musou: { name: '일장청월무', cry: '달빛처럼 빠른 쌍도 난무' } },
};
const DEFAULT_CALLOUT = { special: { name: '고유 필살기', cry: '혼신을 다한 일격' }, musou: { name: '무쌍난무', cry: '전장을 뒤덮는 무쌍의 기세' } };

// 각 탑승 스프라이트의 활 손 위치. 합성 시트마다 기수의 몸 비율이 달라
// 하나의 고정 비율을 쓰면 화살이 손 위/아래에서 생겨 보인다.
const MOUNTED_BOW_ANCHORS = {
  liubei: { height: .705, fx: 30, launch: 62 },
  guanyu: { height: .720, fx: 32, launch: 64 },
  zhangfei: { height: .700, fx: 34, launch: 66 },
  wujing: { height: .710, fx: 31, launch: 63 },
  wusong: { height: .700, fx: 29, launch: 61 },
  linchong: { height: .720, fx: 34, launch: 66 },
  lizhishen: { height: .690, fx: 30, launch: 62 },
  default: { height: .700, fx: 30, launch: 62 },
};

const imageCache = new Map();
const assetBundleCache = new Map();
function loadImage(src) {
  if (imageCache.has(src)) return imageCache.get(src);
  const pending = new Promise((resolve, reject) => {
    const image = new Image();
    image.decoding = 'async';
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error('이미지를 읽지 못했습니다: ' + src));
    image.src = src;
  }).catch((error) => { imageCache.delete(src); throw error; });
  imageCache.set(src, pending);
  return pending;
}
async function loadOptional(src, label) {
  if (!src) return null;
  try { return await loadImage(src); }
  catch (error) { console.warn('선택 자산을 건너뜁니다 (' + label + '):', error); return null; }
}

/**
 * 이 장수의 전용 원화가 실제로 있는가.
 *
 * 없으면 preload 가 관우 시트로 대신 채운다 — 즉 이름만 마초이고 화면에는
 * 관우가 나오는 상태가 된다. 그건 다른 인물을 색만 바꿔 내놓는 것과 같아서
 * 절대 하면 안 된다. 그래서 선택 화면이 이 함수로 미리 걸러 낸다.
 */
export const heroHasArt = (heroId) => !!HERO_ART[heroId];

export function preloadSideScroller(heroId = 'guanyu', stageKey = 'hulao') {
  const resolvedHeroId = HERO_ART[heroId] ? heroId : 'guanyu';
  const selectedStage = workStage(stageKey) || stage(stageKey);
  const bossId = selectedStage?.bossId || 'default';
  const cacheKey = resolvedHeroId + ':' + bossId;
  if (assetBundleCache.has(cacheKey)) return assetBundleCache.get(cacheKey);
  const pending = (async () => {
    const common = Object.fromEntries(await Promise.all(Object.entries(ART).map(async ([key, src]) => [key, await loadImage(src)])));
    const heroSources = HERO_ART[resolvedHeroId];
    const hero = { hero: await loadImage(heroSources.hero) };
    for (const [key, src] of Object.entries(heroSources)) {
      if (key === 'hero') continue;
      if (MOUNT_PROFILES[resolvedHeroId] && (key === 'mounted' || key === 'mountedBow')) continue;
      const image = key === 'rider' ? await loadImage(src) : await loadOptional(src, resolvedHeroId + '.' + key);
      if (image) hero[key] = image;
    }
    const mounts = {};
    const mount = await loadOptional(MOUNT_ART[resolvedHeroId], resolvedHeroId + '.mount');
    if (mount) mounts[resolvedHeroId] = mount;
    const bosses = {};
    const boss = await loadOptional(BOSS_ART[bossId], 'boss.' + bossId);
    if (boss) bosses[bossId] = boss;
    return { ...common, heroes: { [resolvedHeroId]: hero }, mounts, bosses };
  })().catch((error) => { assetBundleCache.delete(cacheKey); throw error; });
  assetBundleCache.set(cacheKey, pending);
  return pending;
}

function makeAudio(heroId = 'guanyu', stageKey = 'hulao') {
  // 브라우저 TTS와 공용 피격 비명은 사용하지 않는다. 선택한 장수의
  // 로컬 마스터링 전투 대사와 무기·원소 레이어만 재생한다.
  const sampleManifest = {
    footstep: [0, 1, 2, 3].map((index) => 'audio/kenney-impact/footstep_concrete_00' + index + '.ogg'),
    // 실제 동물 녹음을 중심에 두고 절차 합성은 안장·호흡·강제이탈 보강층으로 쓴다.
    mountHorse: ['audio/mount-sfx/horse-neigh-pd-v1.ogg'],
    mountBoar: ['audio/mount-sfx/boar-grunt-ccby-v1.ogg'],
    // 기존 CC0 grunt/yell은 공격 기합이 아니라 피격 비명처럼 들렸다.
    // 새 전용 녹음 전까지 일반 공격·적군 비명은 비워 두고 무기음에 집중한다.
    playerGrunt: [], playerShout: [], enemyGrunt: [], enemyDeath: [],
    // v6는 피치업·더블링·소프트클립을 제거한 자연스러운 기술명 원음이다.
    voiceSpecial: ['audio/hero-callouts-ko-v6/' + heroId + '-special-v6.wav'],
    voiceMusou: ['audio/hero-callouts-ko-v6/' + heroId + '-musou-v6.wav'],
    waterSplashLight: [1, 2, 3].map((index) => 'audio/cinematic-water/water-splash-light-0' + index + '-cc0-v1.ogg'),
    waterSplashHeavy: [1, 2, 3].map((index) => 'audio/cinematic-water/water-splash-heavy-0' + index + '-cc0-v1.ogg'),
    breathNeutral: ['audio/cinematic-breath/battle-inhale-neutral-cc0-v1.ogg'],
    breathDeep: ['audio/cinematic-breath/battle-inhale-deep-cc0-v1.ogg'],
  };
  const voiceProfiles = {
    liubei: { rate: .98, gain: .60, lowpass: 5200, wet: .08 }, guanyu: { rate: .92, gain: .68, lowpass: 4550, wet: .10 }, caocao: { rate: .94, gain: .66, lowpass: 4800, wet: .09 },
    machao: { rate: 1.04, gain: .64, lowpass: 5500, wet: .09 }, huangzhong: { rate: .88, gain: .74, lowpass: 3900, wet: .12 },
    zhaoyun: { rate: 1.00, gain: .61, lowpass: 5400, wet: .08 }, zhouyu: { rate: 1.02, gain: .58, lowpass: 5600, wet: .09 }, huanggai: { rate: .90, gain: .70, lowpass: 4300, wet: .08 }, zhugeliang: { rate: .98, gain: .57, lowpass: 5300, wet: .11 },
    zhangfei: { rate: .90, gain: .74, lowpass: 4200, wet: .08 }, sunshangxiang: { rate: 1.08, gain: .54, lowpass: 6500, highpass: 135, wet: .09 },
    wukong: { rate: 1.05, gain: .63, lowpass: 5900, highpass: 105, wet: .10 }, bajie: { rate: .90, gain: .70, lowpass: 4300, wet: .08 },
    wujing: { rate: .94, gain: .65, lowpass: 4800, wet: .10 }, wusong: { rate: .94, gain: .68, lowpass: 4550, wet: .08 }, linchong: { rate: 1.00, gain: .62, lowpass: 5300, wet: .09 }, lizhishen: { rate: .90, gain: .72, lowpass: 4200, wet: .08 }, tieshangongzhu: { rate: 1.07, gain: .56, lowpass: 6300, highpass: 125, wet: .10 },
    husanniang: { rate: 1.06, gain: .57, lowpass: 6200, highpass: 120, wet: .08 },
  };
  const voiceProfile = voiceProfiles[heroId] || { rate: .98, gain: .62, lowpass: 5100, wet: .09 };
  const BGM_VOLUME = .30;
  let ctx, master, sfxBus, musicBus, voiceBus, reverb, noiseBuffer, bgm, bgmSource, muted = false, loading = false;
  let lastVoiceAt = 0, lastSpecialVoiceAt = -Infinity, lastEnemyVoiceAt = 0, lastMountSfxAt = -Infinity, lastMountVocalAt = -Infinity, musicDuckTimer = 0;
  let activeCallout = null;
  let duckRequests = [];
  const sampleCursor = {};
  const buffers = {};
  const sampleReady = {};
  const activeAudioSources = new Set();
  const trackAudioSource = (source) => {
    activeAudioSources.add(source);
    source.addEventListener('ended', () => activeAudioSources.delete(source), { once: true });
    return source;
  };

  const loadSamples = () => {
    if (loading) return;
    loading = true;
    for (const [group, urls] of Object.entries(sampleManifest)) {
      if (!urls.length) { buffers[group] = []; sampleReady[group] = Promise.resolve([]); continue; }
      sampleReady[group] = Promise.all(urls.map((url) => fetch(url)
        .then((response) => { if (!response.ok) throw new Error('HTTP ' + response.status + ': ' + url); return response.arrayBuffer(); })
        .then((data) => ctx.decodeAudioData(data))))
        .then((decoded) => (buffers[group] = decoded))
        .catch((error) => { console.warn('[audio] sample load failed:', group, error); return (buffers[group] = []); });
    }
  };

  const ensure = () => {
    if (!ctx) {
      ctx = new (window.AudioContext || window.webkitAudioContext)();
      master = ctx.createGain();
      master.gain.value = .68;
      sfxBus = ctx.createGain();
      sfxBus.gain.value = .86;
      musicBus = ctx.createGain();
      musicBus.gain.value = BGM_VOLUME;
      voiceBus = ctx.createGain();
      voiceBus.gain.value = .80;

      const compressor = ctx.createDynamicsCompressor();
      compressor.threshold.value = -20;
      compressor.knee.value = 10;
      compressor.ratio.value = 6;
      compressor.attack.value = .002;
      compressor.release.value = .16;

      const limiter = ctx.createDynamicsCompressor();
      limiter.threshold.value = -3;
      limiter.knee.value = 0;
      limiter.ratio.value = 20;
      limiter.attack.value = .001;
      limiter.release.value = .08;

      reverb = ctx.createConvolver();
      const impulse = ctx.createBuffer(2, Math.floor(ctx.sampleRate * .92), ctx.sampleRate);
      for (let channel = 0; channel < 2; channel++) {
        const data = impulse.getChannelData(channel);
        for (let i = 0; i < data.length; i++) data[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / data.length, 4.4);
      }
      reverb.buffer = impulse;
      const wet = ctx.createGain();
      wet.gain.value = .095;

      noiseBuffer = ctx.createBuffer(1, ctx.sampleRate, ctx.sampleRate);
      const noise = noiseBuffer.getChannelData(0);
      for (let i = 0; i < noise.length; i++) noise[i] = Math.random() * 2 - 1;

      sfxBus.connect(master);
      musicBus.connect(master);
      reverb.connect(wet).connect(master);
      master.connect(compressor).connect(limiter).connect(ctx.destination);
      voiceBus.connect(limiter);
      loadSamples();
    }
    ctx.resume?.();
    return ctx;
  };

  const route = (node, pan = 0, wet = .08, dryBus = sfxBus) => {
    let output = node;
    if (ctx.createStereoPanner) {
      const panner = ctx.createStereoPanner();
      panner.pan.value = Math.max(-1, Math.min(1, pan));
      node.connect(panner);
      output = panner;
    }
    output.connect(dryBus);
    if (wet) {
      const send = ctx.createGain();
      send.gain.value = Math.min(.24, wet);
      output.connect(send).connect(reverb);
    }
  };

  const playSample = (group, gain = .7, rate = 1, pan = 0, wet = .08, filters = null, fade = false) => {
    ensure();
    const choices = buffers[group];
    if (!choices?.length) return false;
    let index = Math.floor(Math.random() * choices.length);
    if (choices.length > 1 && index === sampleCursor[group]) index = (index + 1) % choices.length;
    sampleCursor[group] = index;
    const source = trackAudioSource(ctx.createBufferSource());
    const volume = ctx.createGain();
    source.buffer = choices[index];
    source.playbackRate.value = filters?.fixedRate ? Math.max(.84, rate) : Math.max(.84, rate * (.97 + Math.random() * .06));
    gain = Math.min(filters?.gainCeiling ?? .78, gain);
    const startedAt = ctx.currentTime + Math.max(0, filters?.delay || 0);
    const duration = Math.max(.06, source.buffer.duration / source.playbackRate.value);

    // 연속 필살기에서도 두 기술명이 겹치지 않도록 이전 음성을 짧게 교차감쇠한다.
    if (filters?.exclusiveVoice && activeCallout) {
      const previous = activeCallout;
      activeCallout = null;
      try {
        const fadeAt = ctx.currentTime;
        if (typeof previous.volume.gain.cancelAndHoldAtTime === 'function') previous.volume.gain.cancelAndHoldAtTime(fadeAt);
        else previous.volume.gain.cancelScheduledValues(fadeAt);
        previous.volume.gain.setTargetAtTime(.0001, fadeAt, .018);
        previous.source.stop(fadeAt + .075);
      } catch {}
    }

    if (fade) {
      const attack = Math.min(.018, duration * .1);
      const release = Math.min(.085, duration * .18);
      volume.gain.setValueAtTime(.0001, startedAt);
      volume.gain.exponentialRampToValueAtTime(Math.max(.0002, gain), startedAt + attack);
      volume.gain.setValueAtTime(Math.max(.0002, gain), Math.max(startedAt + attack, startedAt + duration - release));
      volume.gain.exponentialRampToValueAtTime(.0001, startedAt + duration);
    } else {
      volume.gain.value = gain;
    }
    let output = source;
    if (filters?.highpass) {
      const high = ctx.createBiquadFilter();
      high.type = 'highpass';
      high.frequency.value = filters.highpass;
      output.connect(high);
      output = high;
    }
    if (filters?.lowpass) {
      const low = ctx.createBiquadFilter();
      low.type = 'lowpass';
      low.frequency.value = filters.lowpass;
      low.Q.value = .55;
      output.connect(low);
      output = low;
    }
    output.connect(volume);
    route(volume, pan, wet, filters?.voice ? voiceBus : sfxBus);
    if (filters?.exclusiveVoice) {
      const handle = { source, volume };
      activeCallout = handle;
      source.addEventListener('ended', () => { if (activeCallout === handle) activeCallout = null; }, { once: true });
    }
    source.start(startedAt);
    source.stop(startedAt + duration + .02);
    return true;
  };

  // 짧은 필터 노이즈가 모든 베기·타격의 핵심이다. 지속음을 쓰지 않아
  // 금속 종이나 신디사이저처럼 울리지 않으며, delay/attack으로 영화적 순서를 만든다.
  const burst = (opts = {}) => {
    ensure();
    const {
      type = 'lowpass', from = 900, to = 260, q = 1, gain = .3,
      decay = .1, attack = 0, delay = 0, pan = 0, wet = .05,
    } = opts;
    const at = ctx.currentTime + Math.max(0, delay);
    const endAt = at + Math.max(.018, decay);
    const peakAt = at + Math.min(Math.max(0, attack), decay * .82);
    const source = trackAudioSource(ctx.createBufferSource());
    const filter = ctx.createBiquadFilter();
    const volume = ctx.createGain();
    source.buffer = noiseBuffer;
    source.playbackRate.value = .88 + Math.random() * .24;
    filter.type = type;
    filter.Q.value = Math.min(5, q);
    filter.frequency.setValueAtTime(Math.max(40, from), at);
    filter.frequency.exponentialRampToValueAtTime(Math.max(40, to), endAt);
    volume.gain.setValueAtTime(attack ? .0001 : Math.min(.76, gain), at);
    if (attack) volume.gain.linearRampToValueAtTime(Math.min(.76, gain), peakAt);
    volume.gain.exponentialRampToValueAtTime(.0001, endAt);
    source.connect(filter).connect(volume);
    route(volume, pan, wet);
    source.start(at, Math.random() * .16);
    source.stop(endAt + .025);
  };

  // 저역 백색잡음을 짧게 눌러 만든 압력층. 사인파를 쓰지 않아 반복해도
  // 전자 저음의 음정이 남지 않고, 타격의 공기 압력만 더한다.
  const subThump = (gain = .06, delay = 0, pan = 0, duration = .16) => {
    burst({ type: 'lowpass', from: 185, to: 42, q: .42, gain: Math.min(.18, gain * 1.45), decay: duration, attack: .005, delay, pan, wet: 0 });
  };

  const wind = (heavy = false, pan = 0, delay = 0) => {
    burst({
      type: 'bandpass', from: heavy ? 2800 : 4100, to: heavy ? 420 : 850,
      q: heavy ? .78 : 1.05, gain: heavy ? .18 : .095,
      decay: heavy ? .24 : .12, attack: .012, delay, pan, wet: heavy ? .10 : .055,
    });
  };

  // 녹음 샘플 없이도 동물마다 다른 성대와 공명강을 만든다. 배음이 풍부한
  // 발진원을 두 개의 포먼트로 걸러 말 울음은 길고 높게, 야저는 짧고 낮게 들린다.
  const animalVoice = ({
    type = 'sawtooth', points = [[0, 180], [1, 120]], duration = .35,
    gain = .18, delay = 0, pan = 0, wet = .06, formants = [720, 1700],
    vibrato = 18,
  } = {}) => {
    ensure();
    const at = ctx.currentTime + Math.max(0, delay);
    const endAt = at + Math.max(.10, duration);
    const source = trackAudioSource(ctx.createOscillator());
    const lfo = trackAudioSource(ctx.createOscillator());
    const lfoDepth = ctx.createGain();
    source.type = type;
    source.frequency.setValueAtTime(Math.max(45, points[0]?.[1] || 180), at);
    for (let i = 1; i < points.length; i++) {
      const position = Math.max(0, Math.min(1, points[i][0]));
      source.frequency.exponentialRampToValueAtTime(Math.max(45, points[i][1]), at + duration * position);
    }
    lfo.type = 'sine';
    lfo.frequency.value = type === 'triangle' ? 13 : 21;
    lfoDepth.gain.value = vibrato;
    lfo.connect(lfoDepth).connect(source.detune);

    const body = ctx.createBiquadFilter(), nasal = ctx.createBiquadFilter();
    const bodyGain = ctx.createGain(), nasalGain = ctx.createGain(), volume = ctx.createGain();
    body.type = nasal.type = 'bandpass';
    body.frequency.value = formants[0]; body.Q.value = 1.15;
    nasal.frequency.value = formants[1]; nasal.Q.value = 1.55;
    bodyGain.gain.value = .88; nasalGain.gain.value = .34;
    source.connect(body).connect(bodyGain).connect(volume);
    source.connect(nasal).connect(nasalGain).connect(volume);
    const peak = Math.max(.001, Math.min(.34, gain));
    volume.gain.setValueAtTime(.0001, at);
    volume.gain.exponentialRampToValueAtTime(peak, at + Math.min(.045, duration * .16));
    volume.gain.setValueAtTime(peak, Math.max(at + .05, endAt - Math.min(.11, duration * .25)));
    volume.gain.exponentialRampToValueAtTime(.0001, endAt);
    route(volume, pan, wet);
    source.start(at); lfo.start(at);
    source.stop(endAt + .02); lfo.stop(endAt + .02);
  };

  const normalizeTechniqueTheme = (theme = 'steel') => ({
    inferno: 'flame', thunder: 'storm', lightning: 'storm', cloud: 'wind',
  }[theme] || theme || 'steel');

  // 화면의 기술 테마를 그대로 전달받아 접촉 프레임에 맞춘다. 이전처럼 영웅의
  // 고정 속성으로 재생하지 않아 물 화면에서 불·금속 소리가 나는 불일치가 없다.
  const elementalStinger = (rawTheme = 'steel', powerful = false, impactAt = .414) => {
    const theme = normalizeTechniqueTheme(rawTheme);
    const power = powerful ? 1 : .72;
    const lead = (seconds) => Math.max(.01, impactAt - seconds);
    if (theme === 'flame') {
      burst({ type: 'bandpass', from: 520, to: 4300, q: .7, gain: .26 * power, decay: .34, attack: .20, delay: lead(.28), pan: -.12, wet: .13 });
      burst({ type: 'highpass', from: 7600, to: 2300, q: .55, gain: .20 * power, decay: .06, delay: impactAt, pan: .14, wet: .035 });
      burst({ type: 'bandpass', from: 3900, to: 1100, q: 1.2, gain: .12 * power, decay: .19, delay: impactAt + .025, pan: .28, wet: .08 });
    } else if (theme === 'storm') {
      burst({ type: 'bandpass', from: 420, to: 4700, q: .52, gain: .20 * power, decay: .30, attack: .19, delay: lead(.25), pan: -.30, wet: .14 });
      burst({ type: 'highpass', from: 9500, to: 2800, q: .6, gain: .30 * power, decay: .038, delay: impactAt, pan: .18, wet: .07 });
      burst({ type: 'lowpass', from: 760, to: 55, q: .72, gain: .42 * power, decay: .42, delay: impactAt, pan: .08, wet: .16 });
      subThump(.075 * power, impactAt, 0, .22);
    } else if (theme === 'wind') {
      burst({ type: 'bandpass', from: 260, to: 3200, q: .55, gain: .25 * power, decay: .43, attack: .27, delay: lead(.34), pan: -.55, wet: .18 });
      burst({ type: 'bandpass', from: 360, to: 4100, q: .6, gain: .22 * power, decay: .40, attack: .24, delay: lead(.30), pan: .55, wet: .16 });
    } else if (theme === 'water') {
      burst({ type: 'lowpass', from: 3100, to: 110, q: .6, gain: .27 * power, decay: .52, attack: .20, delay: lead(.28), pan: -.22, wet: .21 });
      burst({ type: 'bandpass', from: 4700, to: 520, q: .7, gain: .15 * power, decay: .32, delay: impactAt + .025, pan: .32, wet: .16 });
    } else if (theme === 'frost') {
      burst({ type: 'highpass', from: 8200, to: 3100, q: .65, gain: .20 * power, decay: .25, attack: .10, delay: lead(.16), pan: -.25, wet: .18 });
      burst({ type: 'bandpass', from: 5600, to: 1800, q: 1.1, gain: .16 * power, decay: .19, delay: impactAt, pan: .25, wet: .13 });
    } else if (theme === 'earth') {
      burst({ type: 'lowpass', from: 1150, to: 62, q: .65, gain: .46 * power, decay: .42, delay: impactAt, wet: .10 });
      burst({ type: 'bandpass', from: 2100, to: 280, q: .8, gain: .18 * power, decay: .20, delay: impactAt + .015, pan: -.12, wet: .06 });
      subThump(.085 * power, impactAt, .06, .24);
    } else if (theme === 'solar') {
      burst({ type: 'bandpass', from: 480, to: 6200, q: .52, gain: .28 * power, decay: .40, attack: .26, delay: lead(.32), pan: -.18, wet: .19 });
      burst({ type: 'highpass', from: 9800, to: 2100, q: .5, gain: .23 * power, decay: .055, delay: impactAt, pan: .18, wet: .07 });
      burst({ type: 'lowpass', from: 1250, to: 65, q: .65, gain: .36 * power, decay: .34, delay: impactAt, wet: .13 });
    } else if (theme === 'jade') {
      burst({ type: 'bandpass', from: 6500, to: 680, q: 1.05, gain: .24 * power, decay: .30, delay: lead(.18), pan: -.30, wet: .16 });
      burst({ type: 'bandpass', from: 5200, to: 540, q: .9, gain: .21 * power, decay: .32, delay: lead(.12), pan: .30, wet: .14 });
      burst({ type: 'lowpass', from: 980, to: 72, q: .7, gain: .31 * power, decay: .31, delay: impactAt, wet: .11 });
    } else {
      burst({ type: 'bandpass', from: 4200, to: 620, q: 1.1, gain: .21 * power, decay: .22, delay: lead(.12), pan: .20, wet: .10 });
      burst({ type: 'highpass', from: 8800, to: 2400, q: .7, gain: .24 * power, decay: .045, delay: impactAt, pan: -.16, wet: .045 });
      burst({ type: 'lowpass', from: 1020, to: 70, q: .65, gain: .29 * power, decay: .28, delay: impactAt, wet: .08 });
    }

    // 흐르는 계열은 CC0 실제 물보라를 중심에 두고, 접촉 전 흡입과 접촉 후
    // 포말만 절차음으로 보강한다. 동일 샘플 반복은 커서와 속도 편차로 피한다.
    if (['water', 'jade', 'storm', 'frost'].includes(theme)) {
      const heavyWater = powerful || theme === 'water';
      const group = heavyWater ? 'waterSplashHeavy' : 'waterSplashLight';
      playSample(group, powerful ? .38 : .29, theme === 'frost' ? 1.08 : 1, 0, .19, {
        highpass: 85, lowpass: theme === 'frost' ? 9200 : 11800,
        gainCeiling: .46, delay: impactAt,
      }, true);
      if (powerful) playSample('waterSplashLight', .15, 1.10, .30, .13, {
        highpass: 180, lowpass: 10500, gainCeiling: .20, delay: impactAt + .065,
      }, true);
      burst({ type: 'bandpass', from: 360, to: 3600, q: .48, gain: powerful ? .18 : .13, decay: impactAt + .08, attack: Math.max(.12, impactAt * .68), delay: .01, pan: -.36, wet: .18 });
      burst({ type: 'highpass', from: 7200, to: 2100, q: .50, gain: powerful ? .14 : .10, decay: .22, attack: .035, delay: impactAt + .035, pan: .38, wet: .17 });
    }
  };

  const startMusic = () => {
    ensure();
    if (!bgm) {
      bgm = new Audio('audio/the_final_battle.ogg');
      bgm.loop = true;
      bgm.volume = 1;
      bgm.preload = 'auto';
      bgmSource = ctx.createMediaElementSource(bgm);
      bgmSource.connect(musicBus);
    }
    if (!muted && bgm.paused) bgm.play().catch(() => {});
  };

  const holdMusicLevel = (target, release = false) => {
    if (!musicBus || !ctx) return;
    const at = ctx.currentTime;
    const gain = musicBus.gain;
    if (typeof gain.cancelAndHoldAtTime === 'function') gain.cancelAndHoldAtTime(at);
    else { const current = Math.max(.0001, gain.value); gain.cancelScheduledValues(at); gain.setValueAtTime(current, at); }
    gain.linearRampToValueAtTime(Math.max(.0001, target), at + (release ? .42 : .024));
  };

  const refreshMusicDuck = () => {
    const now = performance.now();
    duckRequests = duckRequests.filter((request) => request.until > now);
    const target = duckRequests.length ? Math.min(...duckRequests.map((request) => request.level)) : BGM_VOLUME;
    holdMusicLevel(target, duckRequests.length === 0);
    clearTimeout(musicDuckTimer);
    if (duckRequests.length) {
      const nextExpiry = Math.min(...duckRequests.map((request) => request.until));
      musicDuckTimer = setTimeout(refreshMusicDuck, Math.max(20, nextExpiry - now + 8));
    }
  };

  const duckMusic = (level = .18, duration = 260) => {
    if (!bgm || muted) return;
    duckRequests.push({ level: Math.max(.08, Math.min(BGM_VOLUME, level)), until: performance.now() + duration });
    refreshMusicDuck();
  };

  try { ensure(); } catch { ctx = null; }

  return {
    ready() {
      return Promise.all([
        sampleReady.voiceSpecial, sampleReady.voiceMusou,
        sampleReady.waterSplashLight, sampleReady.waterSplashHeavy,
        sampleReady.breathNeutral, sampleReady.breathDeep,
      ].filter(Boolean));
    },
    startMusic,
    footstep(kind = 'foot') {
      const pan = (Math.random() - .5) * .28;
      if (kind === 'cloud') { wind(false, pan); return; }
      if (kind === 'boar') {
        playSample('footstep', .12, .78 + Math.random() * .07, pan, .02, { lowpass: 1500 });
        burst({ type: 'lowpass', from: 720, to: 85, gain: .11, decay: .08, pan, wet: .025 });
        return;
      }
      if (kind === 'horse') {
        playSample('footstep', .14, .82 + Math.random() * .08, pan, .025, { lowpass: 2100 });
        burst({ type: 'lowpass', from: 980, to: 115, gain: .10, decay: .07, pan, wet: .025 });
        return;
      }
      if (kind === 'waterBeast') {
        burst({ type: 'highpass', from: 760, to: 3100, q: .55, gain: .12, decay: .10, attack: .018, pan, wet: .12 });
        burst({ type: 'lowpass', from: 1350, to: 95, q: .48, gain: .13, decay: .13, pan: -pan, wet: .15 });
        return;
      }
      playSample('footstep', .13, .98 + Math.random() * .09, pan, .018, { lowpass: 3300 });
    },

    mountEvent(kind = 'horse', phase = 'mount') {
      const now = performance.now();
      // 강제 낙마는 직전 탑승음보다 우선한다. 일반 버튼 난타만 막는다.
      if (!['forced', 'mount'].includes(phase) && now - lastMountSfxAt < 240) return;
      lastMountSfxAt = now;
      startMusic();
      const forced = phase === 'forced', dismount = phase === 'dismount';
      duckMusic(forced ? .19 : dismount ? .25 : .22, forced ? 560 : dismount ? 280 : 680);
      const pan = (Math.random() - .5) * .18;

      // 발굽/안장 또는 탈것 표면과 접촉하는 공통 층.
      if (kind === 'cloud') {
        burst({ type: 'bandpass', from: dismount ? 3600 : 260, to: dismount ? 260 : 4200, q: .48, gain: .31, decay: dismount ? .34 : .55, attack: dismount ? .02 : .17, pan: -.42, wet: .20 });
        burst({ type: 'bandpass', from: dismount ? 2900 : 340, to: dismount ? 220 : 3700, q: .52, gain: .26, decay: dismount ? .31 : .50, attack: dismount ? .01 : .15, delay: .035, pan: .42, wet: .18 });
        if (!dismount) subThump(.045, .18, 0, .24);
        return;
      }
      if (kind === 'waterBeast') {
        burst({ type: 'highpass', from: 520, to: 4100, q: .52, gain: forced ? .30 : .25, decay: forced ? .44 : .34, attack: .055, pan: -.30, wet: .24 });
        burst({ type: 'lowpass', from: 1900, to: 78, q: .48, gain: .27, decay: .42, delay: .035, pan: .28, wet: .22 });
      } else {
        playSample('footstep', kind === 'boar' ? .18 : .17, kind === 'boar' ? .76 : .84, pan, .03, { lowpass: kind === 'boar' ? 1550 : 2200 });
        burst({ type: 'lowpass', from: kind === 'boar' ? 820 : 1150, to: kind === 'boar' ? 72 : 105, q: .48, gain: forced ? .19 : .14, decay: forced ? .15 : .10, pan, wet: .035 });
        burst({ type: 'highpass', from: 5400, to: 1250, q: .48, gain: .08, decay: .055, delay: .018, pan: -pan, wet: .025 });
      }

      // 소환 직후 실제 탑승은 반드시 들려야 한다. 같은 종류의 일반 소환만
      // 연타 방지하고 mount/forced는 항상 자신만의 울음·공기음을 낸다.
      if (!forced && phase !== 'mount' && now - lastMountVocalAt < 620) return;
      lastMountVocalAt = now;
      if (kind === 'horse') {
        if (dismount) {
          burst({ type: 'bandpass', from: 680, to: 210, q: .72, gain: .19, decay: .22, attack: .018, delay: .03, pan, wet: .06 });
          burst({ type: 'lowpass', from: 1800, to: 320, q: .45, gain: .13, decay: .18, delay: .02, pan, wet: .04 });
        } else {
          const realHorse = playSample('mountHorse', forced ? .72 : .76, forced ? 1.08 : 1, pan, .08, { lowpass: 9200, highpass: 70, gainCeiling: .78, fixedRate: true }, true);
          if (!realHorse) {
            animalVoice({
              type: 'sawtooth',
              points: forced ? [[0, 310], [.34, 520], [.62, 430], [1, 275]] : [[0, 330], [.28, 590], [.58, 455], [1, 315]],
              duration: forced ? .52 : .72, gain: forced ? .19 : .21, delay: .045,
              pan, wet: .09, formants: [920, 2050], vibrato: 25,
            });
          }
          burst({ type: 'bandpass', from: 1900, to: 480, q: .55, gain: .12, decay: .30, attack: .025, delay: .08, pan, wet: .07 });
        }
      } else if (kind === 'boar') {
        const realBoar = playSample('mountBoar', forced ? .72 : dismount ? .48 : .68, forced ? 1.10 : dismount ? .90 : .96, pan, .055, { lowpass: 8600, highpass: 65, gainCeiling: .76, fixedRate: true }, true);
        if (forced) {
          // 놀란 야저는 실제 저음 울음 위에 짧은 상승 비명을 얹는다.
          animalVoice({ type: 'sawtooth', points: [[0, 240], [.38, 610], [1, 180]], duration: .43, gain: .12, delay: .05, pan, wet: .07, formants: [640, 1380], vibrato: 30 });
        } else if (!realBoar) {
          // 디코딩 실패 시에만 절차 합성 두 번 울음으로 안전하게 폴백한다.
          animalVoice({ type: 'triangle', points: [[0, 122], [.58, 86], [1, 72]], duration: .24, gain: .23, delay: .025, pan: -.08, wet: .045, formants: [510, 1120], vibrato: 11 });
          if (!dismount) animalVoice({ type: 'triangle', points: [[0, 132], [.55, 91], [1, 76]], duration: .22, gain: .19, delay: .16, pan: .08, wet: .045, formants: [540, 1180], vibrato: 12 });
        }
        burst({ type: 'bandpass', from: 920, to: 310, q: 1.0, gain: .13, decay: .24, attack: .018, delay: .04, pan, wet: .05 });
      } else if (kind === 'waterBeast') {
        animalVoice({ type: 'triangle', points: [[0, 158], [.42, 124], [1, 92]], duration: forced ? .44 : .35, gain: forced ? .17 : .13, delay: .06, pan, wet: .18, formants: [430, 1080], vibrato: 9 });
      }
    },

    shout(powerful = false) {
      const now = performance.now();
      if (now - lastVoiceAt < (powerful ? 520 : 760)) return;
      const group = powerful ? 'playerShout' : 'playerGrunt';
      if (!buffers[group]?.length) return;
      lastVoiceAt = now;
      duckMusic(powerful ? .16 : .22, powerful ? 580 : 310);
      const filters = { ...voiceProfile, lowpass: Math.max(4300, voiceProfile.lowpass), highpass: Math.max(72, voiceProfile.highpass || 0) };
      const played = playSample(
        group,
        voiceProfile.gain * (powerful ? .90 : .56),
        Math.max(.92, voiceProfile.rate * (powerful ? .99 : 1.04)),
        (Math.random() - .5) * .16,
        voiceProfile.wet,
        filters,
        true,
      );
      return played;
    },

    enemyVoice(defeated = false, pan = 0, enemy = null) {
      const key = enemy?.boss ? 'boss' : stageKey === 'flamemountain' ? 'demon' : enemy?.role === 'heavy' ? 'heavy' : enemy?.role === 'archer' ? 'archer' : 'soldier';
      const profiles = {
        soldier: { rate: 1.05, gain: .14, lowpass: 5100, highpass: 105, wet: .035, chance: defeated ? .52 : .08, cooldown: 210 },
        heavy: { rate: .92, gain: .23, lowpass: 3500, highpass: 72, wet: .055, chance: defeated ? .68 : .13, cooldown: 255 },
        archer: { rate: 1.12, gain: .13, lowpass: 5900, highpass: 165, wet: .03, chance: defeated ? .56 : .09, cooldown: 225 },
        demon: { rate: .88, gain: .27, lowpass: 2850, highpass: 58, wet: .12, chance: defeated ? .76 : .16, cooldown: 275 },
        boss: { rate: .87, gain: .32, lowpass: 2600, highpass: 52, wet: .15, chance: defeated ? 1 : .20, cooldown: 310 },
      };
      const profile = profiles[key];
      const group = defeated ? 'enemyDeath' : 'enemyGrunt';
      if (!buffers[group]?.length) return;
      const now = performance.now();
      if (now - lastEnemyVoiceAt < profile.cooldown || Math.random() > profile.chance) return;
      lastEnemyVoiceAt = now;
      const rate = profile.rate * (defeated ? .97 : 1) * (.97 + Math.random() * .06);
      playSample(group, profile.gain * (.92 + Math.random() * .14), rate, pan, profile.wet, profile, true);
      if (defeated) burst({ type: 'lowpass', from: key === 'boss' ? 620 : 780, to: key === 'demon' ? 54 : 78, gain: key === 'boss' ? .20 : .11, decay: key === 'boss' ? .18 : .10, pan, wet: profile.wet });
    },

    specialCry(powerful = false, theme = 'steel') {
      const now = performance.now();
      if (muted || now - lastSpecialVoiceAt < 760) return;
      lastSpecialVoiceAt = now;
      startMusic();
      const impactAt = powerful ? .451 : .414;
      duckMusic(powerful ? .15 : .17, powerful ? 1280 : 1080);

      // 과장된 피치·끝음절 증폭 대신 캐릭터별 EQ와 일정한 게인으로 기술명을
      // 재생한다. 새 기술은 이전 음성을 75ms 교차감쇠해 대사가 겹치지 않는다.
      const voiceToken = lastSpecialVoiceAt;
      const voiceGain = Math.min(.80, (voiceProfile.gain + .08) * (powerful ? 1.02 : .96));
      const playCry = () => playSample(
        powerful ? 'voiceMusou' : 'voiceSpecial',
        voiceGain,
        1,
        0,
        Math.min(.06, voiceProfile.wet * .55),
        {
          lowpass: Math.min(9800, Math.max(7200, voiceProfile.lowpass + 2400)),
          highpass: Math.max(78, voiceProfile.highpass || 0),
          gainCeiling: .82, voice: true, fixedRate: true, exclusiveVoice: true,
        },
        true,
      );
      if (!playCry()) sampleReady[powerful ? 'voiceMusou' : 'voiceSpecial']?.then(() => {
        if (muted || lastSpecialVoiceAt !== voiceToken || performance.now() - voiceToken > 240) return;
        playCry();
      });

      // 독자적인 호흡→응축→날 세움→접촉→잔향의 한 타임라인. 실제 CC0
      // 들숨은 낮게 깔고, 물·비·빙결 계열은 접촉(414/451ms)에 물보라가 터진다.
      playSample(powerful ? 'breathDeep' : 'breathNeutral', powerful ? .21 : .16, 1, -.10, .025, {
        highpass: 105, lowpass: 7200, gainCeiling: .23, fixedRate: true,
      }, true);
      burst({ type: 'bandpass', from: 520, to: 2850, q: .48, gain: powerful ? .09 : .062, decay: impactAt - .035, attack: .14, delay: .01, pan: -.18, wet: .06 });
      burst({ type: 'highpass', from: 1500, to: 6200, q: .45, gain: powerful ? .075 : .052, decay: .20, attack: .11, delay: .025, pan: .18, wet: .04 });
      wind(true, 0, Math.max(.02, impactAt - .105));
      elementalStinger(theme, powerful, impactAt);
    },

    // 무기별 공기 절단음. 모든 스타일은 잡음 기반이라 종처럼 음정이 남지 않는다.
    swing(heavy = false, style = 'guandao') {
      startMusic();
      const pan = (Math.random() - .5) * .32;
      if (heavy) duckMusic(.23, 150);

      if (style === 'spear') {
        burst({ type: 'highpass', from: heavy ? 9200 : 10800, to: heavy ? 2100 : 2900, q: .65, gain: heavy ? .20 : .13, decay: heavy ? .095 : .060, pan, wet: .035 });
        burst({ type: 'bandpass', from: heavy ? 3100 : 4200, to: 780, q: 1.35, gain: heavy ? .13 : .075, decay: heavy ? .15 : .085, pan, wet: .055 });
      } else if (style === 'dual') {
        burst({ type: 'bandpass', from: 5700, to: 1050, q: 1.0, gain: heavy ? .16 : .10, decay: heavy ? .14 : .075, pan: pan - .18, wet: .055 });
        burst({ type: 'highpass', from: 8200, to: 2200, q: .65, gain: heavy ? .13 : .075, decay: heavy ? .10 : .055, delay: .032, pan: pan + .20, wet: .04 });
      } else if (style === 'staff') {
        burst({ type: 'bandpass', from: heavy ? 2500 : 3300, to: heavy ? 380 : 620, q: .68, gain: heavy ? .23 : .13, decay: heavy ? .19 : .105, pan, wet: .055 });
        burst({ type: 'lowpass', from: 960, to: 110, q: .55, gain: heavy ? .15 : .08, decay: heavy ? .16 : .09, pan, wet: .025 });
      } else if (style === 'crescent') {
        burst({ type: 'bandpass', from: heavy ? 4400 : 5600, to: heavy ? 480 : 760, q: .78, gain: heavy ? .22 : .13, decay: heavy ? .22 : .13, pan, wet: .12 });
        burst({ type: 'lowpass', from: 2300, to: 160, q: .55, gain: heavy ? .14 : .08, decay: heavy ? .25 : .14, pan: -pan, wet: .13 });
      } else if (style === 'monkstaff') {
        burst({ type: 'lowpass', from: heavy ? 2100 : 2800, to: 210, q: .62, gain: heavy ? .27 : .16, decay: heavy ? .23 : .14, pan, wet: .065 });
        burst({ type: 'highpass', from: 6900, to: 2100, q: .58, gain: heavy ? .12 : .07, decay: .045, pan, wet: .025 });
      } else if (style === 'rake') {
        burst({ type: 'lowpass', from: heavy ? 1700 : 2350, to: 180, q: .72, gain: heavy ? .29 : .17, decay: heavy ? .25 : .15, pan, wet: .065 });
        burst({ type: 'bandpass', from: 5200, to: 950, q: 1.25, gain: heavy ? .15 : .085, decay: heavy ? .12 : .075, pan, wet: .035 });
      } else if (style === 'fan') {
        burst({ type: 'bandpass', from: 420, to: 3300, q: .48, gain: heavy ? .24 : .14, decay: heavy ? .32 : .19, attack: heavy ? .12 : .07, pan: -.42, wet: .17 });
        burst({ type: 'bandpass', from: 520, to: 3900, q: .5, gain: heavy ? .21 : .12, decay: heavy ? .29 : .17, attack: heavy ? .10 : .06, pan: .42, wet: .15 });
      } else {
        // 청룡언월도 같은 장병기: 긴 저역 스윕 위에 짧은 날 끝 소리를 얹는다.
        burst({ type: 'bandpass', from: heavy ? 3200 : 4300, to: heavy ? 360 : 620, q: .72, gain: heavy ? .25 : .15, decay: heavy ? .27 : .16, pan, wet: .09 });
        burst({ type: 'highpass', from: 7800, to: 1900, q: .62, gain: heavy ? .12 : .075, decay: heavy ? .070 : .045, delay: heavy ? .025 : .012, pan, wet: .035 });
      }
    },

    bow() {
      startMusic();
      burst({ type: 'highpass', from: 9800, to: 3100, q: .68, gain: .18, decay: .028, pan: .08, wet: .018 });
      burst({ type: 'bandpass', from: 2800, to: 420, q: .85, gain: .10, decay: .13, pan: .10, wet: .055 });
    },

    fan() {
      startMusic();
      duckMusic(.21, 330);
      burst({ type: 'bandpass', from: 260, to: 3600, q: .48, gain: .35, decay: .48, attack: .18, pan: -.50, wet: .20 });
      burst({ type: 'bandpass', from: 340, to: 4300, q: .52, gain: .32, decay: .45, attack: .16, pan: .50, wet: .18 });
      burst({ type: 'lowpass', from: 1350, to: 62, q: .58, gain: .38, decay: .38, delay: .17, wet: .12 });
    },

    // 크랙(찰나) + 절단(중고역) + 몸통(저역) + 압력(서브)의 네 레이어.
    hit(heavy = false, context = 'normal') {
      startMusic();
      const pan = (Math.random() - .5) * .38;
      const ultimate = ['musou', 'special', 'whirlwind'].includes(context);
      const scale = ultimate ? .72 : 1;
      if (!ultimate) duckMusic(heavy ? .22 : .25, heavy ? 220 : 105);
      burst({ type: 'highpass', from: heavy ? 11000 : 9200, to: heavy ? 3200 : 3800, q: .5, gain: (heavy ? .37 : .24) * scale, decay: heavy ? .030 : .018, pan, wet: .018 });
      burst({ type: 'bandpass', from: heavy ? 4100 : 5200, to: heavy ? 820 : 1250, q: .82, gain: (heavy ? .24 : .15) * scale, decay: heavy ? .105 : .062, pan, wet: heavy ? .075 : .045 });
      burst({ type: 'lowpass', from: heavy ? 1250 : 1450, to: heavy ? 72 : 150, q: .62, gain: (heavy ? .58 : .36) * scale, decay: heavy ? .19 : .105, pan, wet: heavy ? .08 : .04 });
      if (!ultimate) subThump(heavy ? .095 : .045, 0, pan, heavy ? .19 : .11);
      if (heavy && !ultimate) burst({ type: 'bandpass', from: 2300, to: 480, q: .72, gain: .18, decay: .16, delay: .018, pan: -pan, wet: .07 });
    },

    jump() {
      startMusic();
      wind(false, 0);
    },

    // 획득음도 음정 없는 천·바람 질감으로 통일해 전투 중 '딩딩'을 제거한다.
    pickup() {
      startMusic();
      burst({ type: 'highpass', from: 2300, to: 6500, q: .55, gain: .17, decay: .12, attack: .035, pan: -.18, wet: .08 });
      burst({ type: 'bandpass', from: 1100, to: 3600, q: .72, gain: .13, decay: .16, attack: .055, delay: .045, pan: .18, wet: .10 });
    },

    // 0.3초 흡입/긴장 뒤 전음·몸통·서브가 동시에 터지는 필살기 시퀀스.
    musou(powerful = true) {
      startMusic();
      const impactAt = powerful ? .315 : .275;
      duckMusic(powerful ? .14 : .17, powerful ? 1350 : 1000);
      burst({ type: 'bandpass', from: 190, to: 3900, q: .55, gain: powerful ? .28 : .19, decay: impactAt + .045, attack: impactAt - .025, pan: -.42, wet: .17 });
      if (powerful) burst({ type: 'highpass', from: 850, to: 7200, q: .48, gain: .14, decay: .34, attack: .27, pan: .42, wet: .13 });
      burst({ type: 'highpass', from: 11200, to: 2800, q: .5, gain: powerful ? .34 : .25, decay: .038, delay: impactAt, wet: .045 });
      burst({ type: 'lowpass', from: 1750, to: 52, q: .62, gain: powerful ? .58 : .40, decay: powerful ? .42 : .31, delay: impactAt, wet: .15 });
      if (powerful) burst({ type: 'bandpass', from: 4600, to: 520, q: .72, gain: .24, decay: .22, delay: impactAt + .01, pan: -.10, wet: .13 });
      subThump(powerful ? .095 : .065, impactAt, 0, powerful ? .24 : .18);
    },

    win() {
      burst({ type: 'lowpass', from: 1450, to: 78, q: .6, gain: .43, decay: .30, wet: .14 });
      burst({ type: 'highpass', from: 7200, to: 2400, q: .55, gain: .14, decay: .06, wet: .06 });
      playSample('playerShout', voiceProfile.gain * .62, Math.max(.94, voiceProfile.rate), 0, .10, voiceProfile, true);
    },

    toggleMute() {
      ensure();
      muted = !muted;
      master.gain.setTargetAtTime(muted ? .0001 : .68, ctx.currentTime, .025);
      voiceBus.gain.setTargetAtTime(muted ? .0001 : .80, ctx.currentTime, .018);
      if (bgm) {
        bgm.muted = muted;
        if (!muted) bgm.play().catch(() => {});
      }
      return muted;
    },

    pause() {
      if (bgm) bgm.pause();
      ctx?.suspend?.();
    },

    resume() {
      if (muted) return;
      ctx?.resume?.();
      if (bgm?.paused) bgm.play().catch(() => {});
    },

    stop() {
      clearTimeout(musicDuckTimer);
      duckRequests = [];
      if (ctx) {
        for (const source of activeAudioSources) {
          try { source.stop(ctx.currentTime); } catch {}
        }
        activeAudioSources.clear();
      }
      activeCallout = null;
      if (bgm) {
        bgm.pause();
        bgm.currentTime = 0;
        bgm.volume = 1;
      }
      if (musicBus && ctx) {
        musicBus.gain.cancelScheduledValues(ctx.currentTime);
        musicBus.gain.setValueAtTime(BGM_VOLUME, ctx.currentTime);
      }
    },
  };
}
// Explicit cuts and boot anchors keep weapon overhangs in their own pose and
// compensate for transparent padding without modifying the original PNG pixels.
const PAINTED_FRAME_LAYOUTS = {
    'zhaoyun-bow-painted-sheet-v1.png': [[0,0,600,608,320,600],[600,0,680,608,360,590],[0,608,600,672,320,620],[600,608,680,672,290,620]],
    'caocao-bow-painted-sheet-v1.png': [[0,0,620,620,320,605],[620,0,660,620,320,590],[0,620,620,660,320,587],[620,620,660,660,290,600]],
    'machao-bow-painted-sheet-v1.png': [[0,0,620,615,320,605],[620,0,660,615,320,598],[0,615,620,665,320,623],[620,615,660,665,290,623]],
    'mount-zhaoyun-painted-sheet-v1.png': [[0,0,620,620,300,565],[620,0,660,620,350,568],[0,620,682,660,320,518],[682,620,598,660,276,562]],
    'mount-caocao-painted-sheet-v1.png': [[0,0,620,620,300,598],[620,0,660,620,330,600],[0,620,686,660,330,555],[686,620,594,660,264,575]],
    'mount-machao-painted-sheet-v1.png': [[0,0,630,620,300,574],[630,0,650,620,330,574],[0,620,650,660,320,500],[650,620,630,660,290,560]],
    'machao-painted-sheet-v1.png': [[0,0,620,620,320,574],[620,0,660,620,350,565],[0,620,600,660,320,536],[600,620,680,660,290,529]],
    'huangzhong-painted-sheet-v1.png': [[0,0,640,640,320,583],[640,0,640,640,320,575],[0,640,640,640,320,544],[640,640,640,640,310,510]],
    'huangzhong-bow-painted-sheet-v1.png': [[0,0,620,600,320,583],[620,0,660,600,350,575],[0,600,620,680,320,605],[620,600,660,680,250,605]],
};
function drawAtlasFrame(ctx, image, frame, x, groundY, height, facing = 1, alpha = 1) {
  const layout = PAINTED_FRAME_LAYOUTS[image.src?.split('/').pop()]?.[frame];
  if (layout) {
    const [sx,sy,sw,sh,ax,ay] = layout, unit = image.width / 1280, scale = height / 576;
    ctx.save(); ctx.globalAlpha = alpha; ctx.translate(x,groundY); ctx.scale(facing,1);
    ctx.drawImage(image,sx*unit,sy*unit,sw*unit,sh*unit,-ax*scale,-ay*scale,sw*scale,sh*scale); ctx.restore(); return;
  }
  const cellW = image.width / 2, cellH = image.height / 2, col = frame % 2, row = Math.floor(frame / 2), width = height * (cellW / cellH);
  ctx.save(); ctx.globalAlpha = alpha; ctx.translate(x, groundY); ctx.scale(facing, 1);
  ctx.drawImage(image, col * cellW, row * cellH, cellW, cellH, -width / 2, -height, width, height); ctx.restore();
}

function createInput(canvas) {
  const down = new Set(), pressed = new Map(), activeSources = new Map(), tapQueue = [], holdQueue = [];
  const BUFFER_MS = 240, HOLD_MS = 260, DOUBLE_TAP_MS = 220;
  const actions = { Space: 'attack', KeyJ: 'attack', KeyK: 'ranged', KeyL: 'skill', KeyI: 'dash', KeyC: 'dash', KeyF: 'mount', KeyM: 'mute' };
  const holdable = new Set(['attack', 'ranged']);
  const directionCodes = { left: 'ArrowLeft', right: 'ArrowRight', up: 'ArrowUp', down: 'ArrowDown' };
  let lastWDown = -Infinity;
  const press = (action, source = action) => {
    const now = performance.now();
    if (!holdable.has(action)) { pressed.set(action, now); return; }
    if (!activeSources.has(source)) activeSources.set(source, { action, downAt: now, holdFired: false });
  };
  const release = (source, cancelled = false) => {
    const state = activeSources.get(source);
    if (!state) return;
    activeSources.delete(source);
    if (cancelled || state.holdFired) return;
    const now = performance.now(), queue = now - state.downAt >= HOLD_MS ? holdQueue : tapQueue;
    queue.push({ action: state.action, at: now });
  };
  const consumeQueued = (queue, name) => {
    const now = performance.now();
    while (queue.length && now - queue[0].at > BUFFER_MS) queue.shift();
    const index = queue.findIndex((entry) => entry.action === name);
    if (index < 0) return false;
    queue.splice(index, 1);
    return true;
  };
  const vibrate = () => { try { navigator.vibrate?.(12); } catch { /* 선택 기능 */ } };
  const onDown = (event) => {
    if (['Space', 'ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown'].includes(event.code)) event.preventDefault();
    down.add(event.code);
    if (event.repeat) return;
    if (event.code === 'KeyW') {
      const now = performance.now();
      if (now - lastWDown <= DOUBLE_TAP_MS) { pressed.set('jump', now); lastWDown = -Infinity; }
      else lastWDown = now;
    }
    if (actions[event.code]) press(actions[event.code], `key:${event.code}`);
  };
  const onUp = (event) => {
    down.delete(event.code);
    release(`key:${event.code}`);
  };
  const touchButtons = [...document.querySelectorAll('[data-touch-action]')];
  const onTouchDown = (event) => {
    event.preventDefault();
    event.currentTarget.classList.add('is-pressed');
    const action = event.currentTarget.dataset.touchAction;
    // 캡처 실패(비활성 포인터 등)가 입력 자체를 삼키면 안 된다.
    try { event.currentTarget.setPointerCapture?.(event.pointerId); } catch { /* 무해 */ }
    if (directionCodes[action]) down.add(directionCodes[action]); else press(action, `pointer:${event.pointerId}`);
  };
  const onTouchUp = (event) => {
    event.currentTarget.classList.remove('is-pressed');
    const action = event.currentTarget.dataset.touchAction;
    if (directionCodes[action]) down.delete(directionCodes[action]);
    else release(`pointer:${event.pointerId}`);
  };
  const onTouchCancel = (event) => {
    event.currentTarget.classList.remove('is-pressed');
    const action = event.currentTarget.dataset.touchAction;
    if (directionCodes[action]) down.delete(directionCodes[action]);
    else release(`pointer:${event.pointerId}`, true);
  };
  // 가상 스틱 — 십자키 탭보다 대각 이동·미세 조작이 훨씬 자연스럽다.
  // 반환값은 -1~1 아날로그. 게임 쪽에서 facing 은 부호만 쓴다.
  const stick = { id: null, x: 0, y: 0 };
  const stickEl = document.getElementById('touch-stick'), nubEl = stickEl?.querySelector('.touch-stick-nub');
  const stickMove = (event) => {
    if (event.pointerId !== stick.id || !stickEl) return;
    const rect = stickEl.getBoundingClientRect(), radius = rect.width / 2;
    let dx = (event.clientX - rect.left - radius) / radius, dy = (event.clientY - rect.top - radius) / radius;
    const len = Math.hypot(dx, dy) || 1; if (len > 1) { dx /= len; dy /= len; }
    const dead = .22;
    stick.x = Math.abs(dx) < dead ? 0 : (dx - Math.sign(dx) * dead) / (1 - dead);
    stick.y = Math.abs(dy) < dead ? 0 : (dy - Math.sign(dy) * dead) / (1 - dead);
    // 점프 버튼을 없앴다 — 스틱을 위로 끝까지 튕기면 점프. 한 번 튕김에
    // 한 번만 발동하도록 걸쇠를 두고, 절반 아래로 내려와야 다시 풀린다.
    if (stick.y < -.88 && !stick.jumpLatch) { stick.jumpLatch = true; press('jump'); }
    else if (stick.y > -.45) stick.jumpLatch = false;
    if (nubEl) nubEl.style.transform = `translate(${dx * radius * .52}px, ${dy * radius * .52}px)`;
  };
  const stickDown = (event) => { event.preventDefault(); stick.id = event.pointerId; try { stickEl.setPointerCapture?.(event.pointerId); } catch { /* 무해 */ } stickMove(event); };
  const stickUp = (event) => { if (event.pointerId !== stick.id) return; stick.id = null; stick.x = stick.y = 0; if (nubEl) nubEl.style.transform = ''; };
  if (stickEl) { stickEl.addEventListener('pointerdown', stickDown); stickEl.addEventListener('pointermove', stickMove); stickEl.addEventListener('pointerup', stickUp); stickEl.addEventListener('pointercancel', stickUp); stickEl.addEventListener('contextmenu', (event) => event.preventDefault()); }
  addEventListener('keydown', onDown); addEventListener('keyup', onUp);
  touchButtons.forEach((button) => { button.addEventListener('pointerdown', onTouchDown); button.addEventListener('pointerup', onTouchUp); button.addEventListener('pointercancel', onTouchCancel); button.addEventListener('contextmenu', (event) => event.preventDefault()); });
  return {
    axis: () => Math.max(-1, Math.min(1, ((down.has('KeyD') || down.has('ArrowRight')) ? 1 : 0) - ((down.has('KeyA') || down.has('ArrowLeft')) ? 1 : 0) + stick.x)),
    axisY: () => Math.max(-1, Math.min(1, ((down.has('KeyS') || down.has('ArrowDown')) ? 1 : 0) - ((down.has('KeyW') || down.has('ArrowUp')) ? 1 : 0) + stick.y)),
    consume(name) {
      const at = pressed.get(name);
      if (at == null) return false;
      pressed.delete(name);
      return performance.now() - at <= BUFFER_MS;
    },
    consumeTap: (name) => consumeQueued(tapQueue, name),
    consumeHold(name) {
      const now = performance.now();
      for (const state of activeSources.values()) {
        if (state.action !== name || state.holdFired || now - state.downAt < HOLD_MS) continue;
        state.holdFired = true; vibrate(); return true;
      }
      if (!consumeQueued(holdQueue, name)) return false;
      vibrate(); return true;
    },
    clear() {
      touchButtons.forEach(button => button.classList.remove('is-pressed'));
      down.clear(); pressed.clear(); activeSources.clear(); tapQueue.length = 0; holdQueue.length = 0; lastWDown = -Infinity;
      stick.id = null; stick.x = stick.y = 0; stick.jumpLatch = false; if (nubEl) nubEl.style.transform = '';
    },
    destroy() {
      removeEventListener('keydown', onDown); removeEventListener('keyup', onUp);
      touchButtons.forEach((button) => { button.removeEventListener('pointerdown', onTouchDown); button.removeEventListener('pointerup', onTouchUp); button.removeEventListener('pointercancel', onTouchCancel); });
      down.clear(); pressed.clear(); activeSources.clear(); tapQueue.length = 0; holdQueue.length = 0;
    },
  };
}

export async function startSideBattle(heroId = 'guanyu', stageKey = 'hulao', { onExit } = {}) {
  const assets = await preloadSideScroller(heroId, stageKey), canvas = document.getElementById('stage'), ctx = canvas.getContext('2d', { alpha: false });
  const heroAssets = assets.heroes[heroId] || assets.heroes.guanyu;
  const combatProfile = COMBAT_PROFILES[heroId] || COMBAT_PROFILES.guanyu;
  const dashTechnique = dashSkill(heroId);
  const callouts = SPECIAL_CALLOUTS[heroId] || DEFAULT_CALLOUT;
  const mountAsset = assets.mounts[heroId] || assets.horse;
  const mountLabel = MOUNT_LABELS[heroId] || '군마';
  const mountKind = MOUNT_KINDS[heroId] || 'horse';
  const isCloudMount = mountKind === 'cloud', isBoarMount = mountKind === 'boar', isWaterMount = mountKind === 'waterBeast';
  const rangedStyle = ['wukong', 'tieshangongzhu'].includes(heroId) ? 'fan'
    : heroId === 'sunshangxiang' ? 'ring'
    : heroId === 'husanniang' ? 'lasso'
    : 'bow';
  const rangedUsesBase = rangedStyle !== 'bow';
  const supportsRanged = rangedUsesBase || !!heroAssets.heroBow;
  const usesConsistentMount = !!MOUNT_PROFILES[heroId] && !!heroAssets.rider;
  const supportsMount = !!MOUNT_ART[heroId] && !!assets.mounts[heroId];
  // New mount profiles always retain the standalone horse and change only a seated rider.
  // Other existing heroes keep their prior composite/special-mount rendering.
  const usesSeatedMountSheet = !usesConsistentMount && supportsMount && mountKind === 'horse' && !!heroAssets.mounted;
  const supportsMountedRanged = usesSeatedMountSheet ? !!heroAssets.mountedBow : supportsMount && supportsRanged;
  const extra = workPerson(heroId), extraStats = workStats(heroId);
  // 전장 정보. 서유기·수호지는 works.js, 삼국지는 원본 gamedata 에서 온다.
  // 호로관만 그려둔 배경이 있고 나머지는 절차 생성 배경을 쓴다.
  const stageInfo = workStage(stageKey) || (() => {
    const s = stage(stageKey);
    if (!s || !s.title) return null;
    return {
      scene: SCENES[stageKey] ? stageKey : 'hulao',
      year: s.year, title: s.title, mission: s.mission,
      bossName: s.bossName, bossId: s.bossId, heroes: s.heroes || [],
      lesson: s.lesson || '', scene_intro: s.mission || '',
    };
  })();
  const heroName = extra?.name || person(heroId).name || '관우';
  const bossLabel = stageInfo?.bossName || '호로관 수문장';
  // 진영별 군복. gamedata 에 troop 이 6종 있는데 여태 쓰지 않아 12개 전장이
  // 전부 같은 병사·같은 적장으로 보였다. 서유기·수호지는 대응 진영이 없어
  // 전장 분위기에 맞는 것을 골라 준다.
  const WORK_TROOP = { flamemountain: 'yellow', heavenpalace: 'yuan', liangshan: 'wu', snowshrine: 'wei' };
  const troop = stage(stageKey)?.troop || WORK_TROOP[stageKey] || 'dong';
  const enemyRoster = ENEMY_ROSTERS[stageKey] || ENEMY_ROSTERS.default;
  const enemySheet = tintSheet(assets.enemy, 'troop:' + troop, TROOP_TINT[troop]);
  const enemySheets = Object.fromEntries(Object.entries(enemyRoster.hues).map(([role, hue]) => [role, tintSheet(enemySheet, 'enemy:' + stageKey + ':' + role, [{ from: enemyRoster.baseHue, to: hue, width: 52, sat: .92, val: role === 'heavy' ? .88 : 1.04 }])]));
  const bossId = stageInfo?.bossId || stage(stageKey)?.bossId || 'default';
  const bossProfile = BOSS_PROFILES[bossId] || BOSS_PROFILES.default;
  const dedicatedBossArt = assets.bosses?.[bossId];
  const bossSheet = dedicatedBossArt || tintSheet(assets.boss, 'boss:' + bossId, bossProfile.tint ? [bossProfile.tint] : BOSS_TINT[troop]);
  ctx.imageSmoothingEnabled = true; ctx.imageSmoothingQuality = "high";
  let width = innerWidth, height = innerHeight, dpr = Math.min(devicePixelRatio || 1, 1.75);
  // 절차 배경은 화면 크기에 맞춰 구우므로 리사이즈 때 다시 만들어야 한다.
  let scenery = stageInfo && stageKey !== 'hulao' ? createScenery(stageInfo.scene, innerWidth, innerHeight) : null;
  // 숨겨진 창의 0×0만 안전 크기로 대체한다. 실제 모바일 뷰포트를 640px로
  // 강제하면 캔버스와 DOM HUD의 중심이 달라지고 오른쪽 화면이 잘린다.
  const resize = () => {
    const viewportWidth = innerWidth > 0 ? innerWidth : (document.documentElement.clientWidth || 640);
    const viewportHeight = innerHeight > 0 ? innerHeight : (document.documentElement.clientHeight || 360);
    width = Math.max(1, viewportWidth); height = Math.max(1, viewportHeight);
    dpr = Math.min(devicePixelRatio || 1, 1.75);
    canvas.width = Math.round(width * dpr); canvas.height = Math.round(height * dpr);
    canvas.style.width = `${width}px`; canvas.style.height = `${height}px`;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0); ctx.imageSmoothingEnabled = true; ctx.imageSmoothingQuality = "high";
    if (stageInfo && stageKey !== 'hulao') scenery = createScenery(stageInfo.scene, width, height);
  };
  resize(); addEventListener('resize', resize);

  const growth = getCombatGrowth(heroId);
  const weaponName = workWeapon(heroId)?.name || signature(heroId).name || '전용 무기';
  const hudRoot = createHudRoot(), playerHud = createPlayerHud(hudRoot, heroName, { level: growth.level, weapon: `${weaponName} ${weaponEnhanceText(growth)}` }), bossHud = createEnemyHud(hudRoot, bossLabel);
  if (extra) {
    const rangedControl = { fan: '파초선 공격', ring: '쌍환 투척', lasso: '홍금투삭', bow: '활쏘기' }[rangedStyle];
    const mountControl = supportsMount ? '<span>F 승마</span>' : '';
    hudRoot.querySelector('.controls').innerHTML = '<span>WASD 이동 · W 두 번 점프</span><span>J 공격 · 꾹 강공</span><span>K ' + rangedControl + '</span>' + mountControl + '<span>L 필살기</span><span>I 돌진기</span>';
  }
  playerHud.setDashSkill(dashTechnique);
  playerHud.setCapabilities(supportsRanged, supportsMount, { fan: '파초선', ring: '쌍환', lasso: '투삭', bow: '활' }[rangedStyle]);
  bossHud.show(false); bossHud.setWeapon(bossProfile.weapon); bossHud.setPhase('결전 대기'); playerHud.setObjective(stageInfo?.mission || '호로관의 적군을 돌파하라'); playerHud.setMount(false, mountLabel);
  const input = createInput(canvas), audio = makeAudio(heroId, stageKey), worldWidth = 7800;
  // 힌트 문구가 키보드 키를 가리키면 아이패드에선 헛말이 된다.
  const touchMode = !!matchMedia?.('(pointer: coarse)').matches;
  // iOS 는 사용자 제스처 콜스택 안에서만 AudioContext 를 깨울 수 있다.
  // 게임 루프에서 부르는 startMusic 은 사파리가 무시하므로 첫 터치에서 해제.
  const unlockAudio = () => audio.startMusic();
  addEventListener('pointerdown', unlockAudio, { once: true, capture: true });
  // 전투 입력이 열리기 전에 선택 장수의 두 기술명 음성을 디코딩한다.
  // 첫 R/Q가 무음으로 빠지지 않으며, 실패 시에도 전투 시작은 계속된다.
  await audio.ready();
  const diff = getDifficulty();
  const heroStats = extraStats || stats(heroId), maxHp = Math.round((heroStats.hp || 132) * 1.14 * diff.playerHp * growth.hp);
  // 능력치 표를 그대로 전투 수치로 환산한다 — 인물 카드에 적힌 값과 실제
  // 감각이 어긋나면 고른 의미가 없다.
  // 기준은 관우다 — 관우의 표값(공20·기동3.2·사거리90)이 배율 1.0이 되도록
  // 나눈다. 여태 이 환산이 서유기·수호지 인물에게만 걸려 있어서, 삼국지 쪽은
  // 유비·장비를 뺀 전원이 표에 무엇이 적혀 있든 전투에서는 전부 1.0이었다.
  // 마초의 '가장 빠름'도, 황충의 '가장 긴 사거리'도 그래서 숫자로만 존재했다.
  const clamp = (value, low, high) => Math.max(low, Math.min(high, value));
  const fromTable = (source) => ({
    power: clamp(source.power / 20, .68, 1.30),
    speed: clamp(source.speed / 3.2, .85, 1.35),
    reach: clamp(source.range / 90, .74, 1.22),
    arrow: 1,
  });
  // 유비·장비는 표 환산 이전에 손으로 맞춰 둔 값이 있다. 표대로 바꾸면
  // 장비의 사거리가 1.12에서 0.89로 떨어져 장팔사모의 감각이 무너진다.
  const TUNED = { liubei: { power: .92, speed: 1.10, reach: .88, arrow: 1.16 }, zhangfei: { power: 1.16, speed: .94, reach: 1.12, arrow: .94 } };
  const baseHeroTuning = extraStats ? fromTable(extraStats) : TUNED[heroId] || fromTable(heroStats);
  const heroTuning = { power: baseHeroTuning.power * growth.power, speed: baseHeroTuning.speed * growth.speed, reach: baseHeroTuning.reach * growth.reach, arrow: baseHeroTuning.arrow * growth.arrow };
  // 무기별 공격 문법. 같은 버튼이라도 장수마다 다른 무기를 쓰는 게 보여야 한다.
  //  - guandao(관우 청룡언월도): 크게 휘두르는 호(弧) — 넓고 묵직, 느림
  //  - spear(장비 장팔사모): 직선 찌르기 — 사거리 길고 세로 판정 좁음, 3타째만 후려침
  //  - dual(유비 쌍고검): 짧고 빠른 연속 베기 — 사거리 짧고 회전 빠름
  //  - staff(손오공 여의봉): 빠른 연타 — 사거리 중간, 회전 가장 빠름
  //  - rake(저팔계 구치정파): 세 갈래 갈퀴질 — 느리지만 전방을 긁고 지면을 뒤흔듦
  const historicalWeaponStyles = { liubei: 'dual', guanyu: 'guandao', zhangfei: 'spear', caocao: 'dual', zhaoyun: 'spear', zhouyu: 'dual', huanggai: 'monkstaff', zhugeliang: 'fan', machao: 'spear', huangzhong: 'guandao' };
  const weaponStyle = workWeapon(heroId)?.style || historicalWeaponStyles[heroId] || 'guandao';
  const lightAttackMs = weaponStyle === 'staff' ? 235 : weaponStyle === 'dual' ? 265 : weaponStyle === 'fan' ? 315 : weaponStyle === 'spear' ? 320 : weaponStyle === 'rake' ? 395 : weaponStyle === 'crescent' ? 340 : weaponStyle === 'monkstaff' ? 375 : 360;
  const player = { x: 330, lane: 0, y: 0, vy: 0, facing: 1, hp: maxHp, maxHp, rage: growth.startingRage, combo: 0, comboUntil: 0, comboStep: 0, attackStep: 1, ko: 0, action: 'idle', actionUntil: 0, hitDone: false, invulnerableUntil: 0, mounted: false, grab: null, grabHits: 0, weaponBoost: 0, actionStarted: 0, actionDuration: 0, afterimageAt: 0, footstepAt: 0, dashReady: 0, whirlwindReady: 0, counterReady: 0, counterUntil: 0 };
  let enemies = [], effects = [], impacts = [], afterimages = [], arrows = [], enemyArrows = [], shockwaves = [], dust = [], floatingTexts = [], cameraX = 0, cameraZoom = 1, cameraKick = 0, shake = 0, colorFlash = 0, hitstopUntil = 0, slowUntil = 0, bossIntroUntil = 0, ambientAt = 0, wave = 0, waveDelay = 0, combatLocked = true, waveGate = 1320, ended = false, lastTime = performance.now(), raf = 0;
  let paused = false;
  const setPaused = (value) => {
    if (ended || paused === value) return;
    paused = value; hudRoot.classList.toggle('paused', paused); input.clear();
    if (paused) audio.pause();
    else { lastTime = performance.now(); audio.resume(); showBanner(hudRoot, '전투 재개', '준비되면 공격을 이어가세요', 900); }
  };
  const onVisibility = () => setPaused(document.hidden);
  const onBlur = () => setPaused(true);
  const onFocus = () => { if (!document.hidden) setPaused(false); };
  document.addEventListener('visibilitychange', onVisibility);
  addEventListener('blur', onBlur); addEventListener('focus', onFocus);
  // 적응형 품질. 프레임이 밀리면 화려함을 스스로 깎는다 — 난전에서 끊기는
  // 것보다 파티클 몇 개 덜 나오는 쪽이 훨씬 낫다. 1 = 최상, 0.45 = 최소.
  let quality = 1, frameAvg = 16.7;
  const q = () => quality;
  const props = [
    { type: 'crate', x: 920, lane: -46, hp: 2, drop: 'food' },
    { type: 'crate', x: 1510, lane: 38, hp: 2, drop: supportsMount ? 'bell' : 'food' },
    { type: 'crate', x: 2380, lane: -18, hp: 2, drop: 'weapon' },
    { type: 'crate', x: 3220, lane: 48, hp: 3, drop: 'food' },
    { type: 'crate', x: 4180, lane: -30, hp: 3, drop: 'weapon' },
    { type: 'crate', x: 5060, lane: 26, hp: 3, drop: 'food' },
    { type: 'crate', x: 6040, lane: -52, hp: 3, drop: supportsMount ? 'bell' : 'food' },
    { type: 'crate', x: 6980, lane: 34, hp: 4, drop: 'food' },
  ];
  const horse = { x: 0, lane: 0, active: false, mounted: false, facing: 1 };
  const ground = () => height * 0.84;
  function mountLayout(depthScale = 1) {
    const mountHeight = Math.min(isCloudMount ? 365 : isBoarMount ? 350 : isWaterMount ? 380 : 390, height * .60) * depthScale;
    const riderHeight = Math.min(isCloudMount ? 300 : isBoarMount ? 285 : 280, height * (isCloudMount ? .47 : .44)) * depthScale;
    const riderLift = mountHeight * (isCloudMount ? .34 : isBoarMount ? .31 : isWaterMount ? .33 : .32);
    return {
      mountHeight, riderHeight, riderLift,
      glow: isCloudMount ? '#ffe3a0' : isBoarMount ? '#c9b36d' : isWaterMount ? '#7dd9e8' : '#caa56f',
    };
  }
  function bowAnchor() {
    const depthScale = 1 + player.lane * .0014;
    if (!player.mounted) {
      const drawHeight = Math.min(320, height * .50) * depthScale;
      return { height: drawHeight * .64, fx: 26, launch: 58 };
    }
    if (usesSeatedMountSheet) {
      const config = MOUNTED_BOW_ANCHORS[heroId] || MOUNTED_BOW_ANCHORS.default;
      const drawHeight = Math.min(430, height * .66) * depthScale;
      return { height: drawHeight * config.height, fx: config.fx, launch: config.launch };
    }
    if (usesConsistentMount) {
      const layout = mountLayout(depthScale);
      return { height:layout.mountHeight*.84, fx:38, launch:76 };
    }
    // 특수 탈것은 같은 단독 탈것의 안장 기준에서 손 위치를 계산한다.
    const layout = mountLayout(depthScale);
    return {
      height: layout.riderLift + layout.riderHeight * .62,
      fx: isBoarMount ? 31 : isWaterMount ? 33 : 34,
      launch: isBoarMount ? 64 : isWaterMount ? 65 : 66,
    };
  }
  function mountTransition(phase, x = player.x, lane = player.lane, facing = player.facing) {
    audio.mountEvent(mountKind, phase);
    const palette = isCloudMount ? ['#fff2b8', '#ffc95e']
      : isBoarMount ? ['#d8a56b', '#70462e']
      : isWaterMount ? ['#b8f3ff', '#3f9fb9']
      : ['#f1cf98', '#9e6844'];
    const count = Math.max(8, Math.round(16 * q()));
    for (let i = 0; i < count; i++) {
      const cloud = isCloudMount, water = isWaterMount;
      dust.push({
        x: x + (Math.random() - .5) * (cloud ? 120 : 86),
        y: ground() + lane - (cloud ? 70 + Math.random() * 42 : Math.random() * 18),
        vx: -facing * (35 + Math.random() * 145) + (Math.random() - .5) * 90,
        vy: cloud ? -25 - Math.random() * 90 : -55 - Math.random() * 145,
        life: .28 + Math.random() * .38, max: .68,
        color: palette[i % palette.length], glow: cloud || water,
        element: cloud ? 'mist' : water ? 'droplet' : i % 3 ? 'droplet' : 'shard',
        size: 3 + Math.random() * (cloud ? 9 : 6),
      });
    }
    colorFlash = Math.max(colorFlash, phase === 'forced' ? .09 : .055);
  }
  function drawHeldFan(progress) {
    const charge = Math.max(0, Math.min(1, progress / .46));
    const release = Math.max(0, Math.min(1, (progress - .46) / .54));
    const opening = .34 + .66 * (charge * charge * (3 - 2 * charge));
    const swingAngle = progress < .46 ? -1.04 + charge * .34 : -.70 + Math.sin(release * Math.PI) * 1.62 + release * .72;
    const wukongFan = heroId === 'wukong';
    ctx.save();
    ctx.rotate(swingAngle); ctx.scale(player.mounted ? 1.12 : 1, opening);
    ctx.lineCap = 'round'; ctx.lineJoin = 'round';
    ctx.shadowColor = wukongFan ? '#82e3a0' : '#ff9a55'; ctx.shadowBlur = 12 + opening * 10;
    ctx.strokeStyle = '#6e4825'; ctx.lineWidth = 7; ctx.beginPath(); ctx.moveTo(-18, 0); ctx.lineTo(35, 0); ctx.stroke();
    const leaf = ctx.createLinearGradient(22, -48, 116, 46);
    if (wukongFan) { leaf.addColorStop(0, '#d6f2a5'); leaf.addColorStop(.48, '#4fae69'); leaf.addColorStop(1, '#173f2d'); }
    else { leaf.addColorStop(0, '#ffe29a'); leaf.addColorStop(.50, '#e45939'); leaf.addColorStop(1, '#6d171f'); }
    ctx.fillStyle = leaf; ctx.strokeStyle = '#dfb45d'; ctx.lineWidth = 3.4;
    ctx.beginPath(); ctx.moveTo(20, 0); ctx.quadraticCurveTo(58, -62, 112, -49); ctx.quadraticCurveTo(132, -12, 122, 0); ctx.quadraticCurveTo(132, 12, 112, 49); ctx.quadraticCurveTo(58, 62, 20, 0); ctx.closePath(); ctx.fill(); ctx.stroke();
    ctx.globalAlpha = .78; ctx.strokeStyle = wukongFan ? '#edf7b8' : '#ffd386'; ctx.lineWidth = 1.6;
    for (let vein = -3; vein <= 3; vein += 1) { ctx.beginPath(); ctx.moveTo(23, 0); ctx.quadraticCurveTo(63, vein * 12, 111, vein * 15); ctx.stroke(); }
    ctx.globalAlpha = 1; ctx.fillStyle = '#f1c76c'; ctx.beginPath(); ctx.arc(2, 0, 7, 0, Math.PI * 2); ctx.fill();
    ctx.restore();
  }
  function floatText(label, x, lane, color = '#fff3c2', scale = 1) { floatingTexts.push({ label: String(label), x, lane, y: ground() + lane - 168, vx: (Math.random() - .5) * 18, vy: -64 - Math.random() * 24, life: .82, max: .82, color, scale }); }

  // 전투 구성. 파상 공세 → 부장(중간 보스) → 다시 압박 → 화웅.
  // 3파만에 끝나면 무기 시스템을 써먹어 보기도 전에 스테이지가 끝난다.
  const TOTAL_WAVES = 7; playerHud.setStage(0, TOTAL_WAVES);
  const WAVE_PLAN = {
    1: { label: '선봉대', hint: '앞을 가로막는 적군을 베어라' },
    2: { label: '제 2진', hint: '좌우에서 밀려온다 — 레인을 옮겨 싸워라' },
    3: { label: '중장보병', hint: touchMode ? '단단하다. 공격 4연타 마무리 강공으로 무너뜨려라' : '단단하다. 강공격(E)으로 무너뜨려라' },
    4: { label: '부장 출진', hint: '부장의 지휘 아래 병사가 거세진다 — 부장부터 쓰러뜨려라', miniBoss: true },
    5: { label: '궁수 지원대', hint: '붉은 궤적을 피하고 먼저 궁수를 끊어라', archer: true },
    6: { label: '친위대', hint: touchMode ? '게이지가 차면 필살 버튼이 무쌍이 된다' : '무쌍(Q)으로 길을 열어라' },
    7: { label: '적장 출진', hint: `${bossLabel}을 격파하라`, boss: true },
  };

  const spawnWave = () => {
    wave += 1; waveDelay = 0; combatLocked = true;
    waveGate = Math.min(worldWidth - 240, player.x + 1080);
    const plan = WAVE_PLAN[wave] || WAVE_PLAN[TOTAL_WAVES], waveLabel = enemyRoster.faction + ' · ' + plan.label;
    const bossWave = !!plan.boss, miniBoss = !!plan.miniBoss;
    const difficulty = 1 + Math.max(0, wave - 1) * .075;
    const count = Math.max(2, Math.round((bossWave ? 6 : miniBoss ? 5 : 3 + Math.min(wave, 4)) * diff.enemyCount));
    if (bossWave || miniBoss) { bossIntroUntil = performance.now() + (bossWave ? 1350 : 900); cameraKick = bossWave ? .115 : .075; shake = bossWave ? 11 : 7; colorFlash = bossWave ? .16 : .10; }
    showBanner(hudRoot, waveLabel, plan.hint);
    playerHud.setObjective(bossWave ? bossLabel + '을 격파하라' : waveLabel + ' 돌파 · ' + wave + '/' + TOTAL_WAVES);
    bossHud.show(bossWave || miniBoss);
    bossHud.setName(bossWave ? bossLabel : miniBoss ? '적 부장' : ''); bossHud.setPhase(bossWave ? '결전 시작' : miniBoss ? '중간 지휘관' : '');
    for (let i = 0; i < count; i++) {
      const isLead = i === count - 1 && (bossWave || miniBoss);
      const fromLeft = wave > 1 && i % 3 === 0 && player.x > 620;
      const side = fromLeft ? -1 : 1;
      const spawnX = waveSpawnX(player.x, side, i, count, Math.random(), combatBounds(worldWidth, waveGate));
      // 역할을 분리해야 ‘궁수 지원대’가 실제 플레이에서도 읽힌다.
      const role = isLead ? 'captain' : plan.archer && i % 3 !== 0 ? 'archer' : wave >= 3 && i % 3 === 0 ? 'heavy' : 'soldier';
      const roleScale = { soldier: [1, 1], archer: [.82, .92], heavy: [1.42, .68], captain: [1, 1] }[role];
      const baseHp = isLead ? (bossWave ? 460 : 260) : 66 + wave * 16;
      const hp = Math.round(baseHp * difficulty * roleScale[0] * diff.enemyHp * growth.enemyHp * (isLead && bossWave ? (bossProfile.hpScale || 1) : 1));
      const baseSpeed = isLead ? (bossWave ? 126 : 118) : 80 + wave * 3 + Math.random() * 24;
      const speed = baseSpeed * roleScale[1];
      const unitName = enemyRoster.names[role] || enemyRoster.names.soldier, weapon = enemyRoster.weapons[role] || 'blade';
      enemies.push({ x: spawnX, lane: -82 + Math.random() * 150, hp, maxHp: hp, speed, role, unitName, weapon, faction: enemyRoster.faction, accent: isLead ? bossProfile.glow : enemyRoster.accent, facing: -side, action: 'run', actionStarted: 0, actionDuration: 430, actionUntil: 0, attackAt: performance.now() + 500 + Math.random() * 650, hitUntil: 0, deadAt: 0, grabbed: false, boss: isLead, trueBoss: bossWave && isLead, bossId: isLead ? bossId : '', enraged: false });
    }
  };
  spawnWave();

  function addSlash(type, attackStep = 1) {
    const musou = type === 'musou', burst = musou || type === 'special' || type === 'whirlwind', heavy = type !== 'attack';
    const defaultKind = type === 'dash' || type === 'mountedThrust' ? 'thrust'
      : type === 'heavy' ? (weaponStyle === 'spear' ? 'thrust' : 'overhead')
      : ['musou', 'special', 'whirlwind'].includes(type) ? 'spin'
      : weaponStyle === 'spear' ? (attackStep === 3 ? 'wide' : 'thrust')
      // 봉술 — 좌우로 후려치다 3타째에 빙 돌린다.
      : weaponStyle === 'staff' ? (attackStep === 3 ? 'spin' : attackStep === 2 ? 'reverse' : 'sweep')
      : weaponStyle === 'dual' ? (attackStep === 2 ? 'reverse' : attackStep === 3 ? 'wide' : 'sweep')
      : weaponStyle === 'fan' ? (attackStep === 1 ? 'sweep' : attackStep === 2 ? 'wide' : 'spin')
      // 구치정파는 일반 호가 아니라 세 갈래 갈퀴 궤적을 쓴다.
      : weaponStyle === 'rake' ? (attackStep === 2 ? 'overhead' : attackStep === 3 ? 'wide' : 'rake')
      : weaponStyle === 'crescent' ? (attackStep === 2 ? 'thrust' : attackStep === 3 ? 'spin' : 'sweep')
      : weaponStyle === 'monkstaff' ? (attackStep === 2 ? 'wide' : attackStep === 3 ? 'spin' : 'overhead')
      : attackStep === 2 ? 'reverse' : attackStep === 3 ? 'wide' : 'sweep';
    const kind = type === 'dash' ? dashTechnique.kind : combatProfile.kinds?.[type === 'attack' ? attackStep : type] || defaultKind;
    const theme = type === 'dash' ? dashTechnique.theme : musou ? combatProfile.musouTheme : type === 'special' ? combatProfile.specialTheme : type === 'whirlwind' ? combatProfile.whirlwindTheme : combatProfile.attackTheme;
    const palettes = {
      water: ['#07364f', '#21bce8', '#dffbff'],
      jade: ['#073f38', '#35d6a2', '#e8fff4'],
      flame: ['#65150f', '#ff5c26', '#ffe995'],
      thunder: ['#26134f', '#9b63ff', '#fff0ff'],
      lightning: ['#06435c', '#51dfff', '#ffffff'],
      storm: ['#073f50', '#20e0cf', '#e8ffff'],
      inferno: ['#691407', '#ff3d15', '#fff0a0'],
      solar: ['#622b08', '#ffb51b', '#fffbd2'],
      cloud: ['#6e3d0d', '#ffc95e', '#fff9dc'],
      earth: ['#3c2414', '#b97034', '#ffe0a0'],
    };
    const palette = palettes[theme] || palettes.solar;
    const element = theme === 'cloud' ? 'mist' : ['flame', 'inferno', 'solar'].includes(theme) ? 'ember' : theme === 'water' ? 'droplet' : theme === 'jade' || theme === 'storm' ? 'leaf' : 'shard';
    const count = musou ? 4 : type === 'special' ? 4 : type === 'whirlwind' ? 3 : kind === 'spin' || kind === 'wide' ? 3 : heavy || kind === 'thrust' ? 2 : 2;
    const max = musou ? .66 : type === 'special' ? .60 : type === 'whirlwind' ? .56 : kind === 'spin' ? .54 : kind === 'wide' ? .46 : heavy ? .42 : .34;
    // 쌍고검은 칼이 짧다 — 호를 작게 그려야 "단검 두 자루"로 읽힌다.
    const baseScale = weaponStyle === 'dual' && type === 'attack' ? .78 : weaponStyle === 'fan' && type === 'attack' ? 1.12 : 1;
    const scale = baseScale * growth.effectScale;
    for (let layer = 0; layer < count; layer++) {
      effects.push({ x: player.x + player.facing * (kind === 'thrust' ? 155 : burst ? 120 : 92), y: ground() + player.lane - player.y - (player.mounted ? 190 : kind === 'overhead' ? 148 : 132), facing: player.facing, heavy, musou: burst, kind, theme, palette, scale, seed: Math.random() * 20, layer, life: max + layer * .045, max: max + layer * .045 });
    }
    // 쌍고검 3타째: 두 칼이 교차하는 X자 베기 — 반대 방향 호를 하나 더 얹는다.
    if (weaponStyle === 'dual' && type === 'attack' && attackStep === 3) {
      effects.push({ x: player.x + player.facing * 92, y: ground() + player.lane - player.y - 132, facing: player.facing, heavy, musou: false, kind: 'reverse', theme: 'jade', palette: palettes.jade, scale: .7, seed: Math.random() * 20, layer: 0, life: max * .92, max: max * .92 });
    }
    // 파편이 튀는 방향도 공격마다 달라야 한다. 찌르기는 앞으로 쏟아지고,
    // 내리찍기는 바닥에서 위로 튀고, 회전기는 사방으로 퍼진다.
    const sparks = Math.round((burst ? 74 : kind === 'wide' || kind === 'spin' ? 52 : heavy ? 42 : 26) * q() * growth.effectScale);
    const baseY = ground() + player.lane;
    for (let i = 0; i < sparks; i++) {
      let sx, sy, svx, svy;
      if (kind === 'thrust') {
        // 앞으로 길게 뻗는 좁은 원뿔
        const reach = 60 + Math.random() * 330;
        sx = player.x + player.facing * reach; sy = baseY - 120 - (Math.random() - .5) * 62;
        svx = player.facing * (240 + Math.random() * 460); svy = (Math.random() - .5) * 130;
      } else if (kind === 'overhead') {
        // 착지 지점에서 바닥을 때리고 위로 튄다
        sx = player.x + player.facing * (40 + Math.random() * 190); sy = baseY - Math.random() * 34;
        svx = (Math.random() - .5) * 460; svy = -180 - Math.random() * 400;
      } else if (kind === 'spin' || musou) {
        // 사방 방사
        const a = Math.random() * Math.PI * 2, sp = 130 + Math.random() * 400;
        sx = player.x + Math.cos(a) * 60; sy = baseY - 110 + Math.sin(a) * 55;
        svx = Math.cos(a) * sp; svy = Math.sin(a) * sp * .7 - 60;
      } else {
        // 베기 — 칼이 지나간 호를 따라 흩어진다
        sx = player.x + player.facing * (55 + Math.random() * (kind === 'wide' ? 260 : 190));
        sy = baseY - 24 - Math.random() * 155;
        svx = player.facing * (90 + Math.random() * 330) + (Math.random() - .5) * 85;
        svy = -65 - Math.random() * 300;
      }
      dust.push({ x: sx, y: sy, vx: svx, vy: svy, life: .38 + Math.random() * .58, max: .96, color: palette[i % 5 === 0 ? 2 : 1], glow: true, element, rotation: Math.random() * Math.PI * 2, spin: (Math.random() - .5) * 11, size: 3 + Math.random() * 8 });
    }
    colorFlash = Math.max(colorFlash, burst ? .19 : kind === 'wide' || heavy ? .11 : .055);
  }

  function addImpact(x, lane, heavy = false, defeated = false) {
    const max = defeated ? .62 : heavy ? .46 : .34;
    const color = combatProfile.hitColor;
    impacts.push({ x, y: ground() + lane - (defeated ? 118 : 128), heavy, defeated, color, style: combatProfile.impactStyle, life: max, max });
    // 강공격·격파는 땅에도 흔적이 남아야 무게가 실린다.
    if (heavy || defeated) impacts.push({ x, y: ground() + lane, heavy, defeated, color, style: 'crack', life: max * 1.5, max: max * 1.5 });
    const count = Math.round((defeated ? 30 : heavy ? 22 : 14) * q());
    for (let i = 0; i < count; i++) {
      const angle = -Math.PI * (.08 + Math.random() * .84), speed = 120 + Math.random() * (defeated ? 360 : 250);
      dust.push({ x, y: ground() + lane - 115 + Math.random() * 30, vx: Math.cos(angle) * speed, vy: Math.sin(angle) * speed, life: .32 + Math.random() * .5, max: .82, color: i % 4 === 0 ? '#fff4c2' : i % 2 ? '#ef9b42' : '#dbe9df', glow: true, spark: true });
    }
    colorFlash = Math.max(colorFlash, defeated ? .22 : heavy ? .13 : .07);
  }
  function releaseGrab(enemy, thrown = false) {
    if (!enemy) return;
    enemy.grabbed = false;
    if (thrown) { enemy.x += player.facing * 210; enemy.lane += 18; enemy.hitUntil = performance.now() + 520; }
    player.grab = null; player.grabHits = 0;
  }

  function fireArrow(now, charged = false, damageScale = 1) {
    const pushArrow = (arrow) => arrows.push({ ...arrow, damage: (arrow.damage ?? 43) * damageScale, charged, pierce: (arrow.pierce || 0) + (charged ? 1 : 0) });
    const candidates = enemies.filter((enemy) => !enemy.deadAt && !enemy.grabbed && Math.sign(enemy.x - player.x) === player.facing && Math.abs(enemy.x - player.x) < 1150);
    const target = candidates.sort((a, b) => Math.abs(a.x - player.x) + Math.abs(a.lane - player.lane) * 2.2 - (Math.abs(b.x - player.x) + Math.abs(b.lane - player.lane) * 2.2))[0];
    // 화면에 그리는 활 효과와 똑같은 손 앵커에서 화살을 생성한다.
    const anchor = bowAnchor();
    const enemyDrawH = Math.min(300, height * .47);
    if (rangedStyle === 'fan') {
      const ironFan = heroId === 'tieshangongzhu', fanColor = ironFan ? '#ff9a55' : heroId === 'wukong' ? '#8fe6a2' : '#d8c5ff';
      const speed = ironFan ? 1100 : 1040, launchHeight = anchor.height * .92, distance = target ? Math.max(180, Math.abs(target.x - player.x)) : 760, travel = distance / speed;
      const targetLane = target?.lane ?? player.lane, targetHeight = target ? enemyDrawH * .56 : launchHeight * .80;
      pushArrow({ kind: 'fan', x: player.x + player.facing * anchor.launch, lane: player.lane, height: launchHeight, vx: player.facing * speed, laneV: (targetLane - player.lane) / travel, vz: (targetHeight - launchHeight + 220 * travel * travel) / travel, life: 1.18, max: 1.18, hit: false, trailAt: now, phase: Math.random() * Math.PI * 2, color: fanColor, damage: ironFan ? 64 : 58, pierce: growth.pierce });
      audio.fan();
      impacts.push({ x: player.x + player.facing * anchor.launch, lane: player.lane, y: ground() + player.lane - launchHeight, life: .30, max: .30, heavy: true, defeated: false, color: fanColor, style: ironFan ? 'burst' : 'cloud' });
      for (let i = 0; i < 26; i++) dust.push({ x: player.x + player.facing * anchor.launch, y: ground() + player.lane - launchHeight + (Math.random() - .5) * 44, vx: player.facing * (90 + Math.random() * 260), vy: (Math.random() - .5) * 160, life: .24 + Math.random() * .42, max: .66, color: i % 3 ? fanColor : '#fff2c7', glow: true, element: ironFan ? 'ember' : i % 2 ? 'droplet' : 'shard' });
      return;
    }
    if (rangedStyle === 'ring' || rangedStyle === 'lasso') {
      const isRing = rangedStyle === 'ring', speed = isRing ? 1120 : 930, launchHeight = anchor.height * .94;
      const distance = target ? Math.max(170, Math.abs(target.x - player.x)) : 790, travel = distance / speed;
      const targetLane = target?.lane ?? player.lane, targetHeight = target ? enemyDrawH * .55 : launchHeight * .82;
      const color = isRing ? '#ffc76d' : '#ff667f';
      pushArrow({ kind: rangedStyle, x: player.x + player.facing * anchor.launch, lane: player.lane, height: launchHeight, vx: player.facing * speed, laneV: (targetLane - player.lane) / travel, vz: (targetHeight - launchHeight + 240 * travel * travel) / travel, life: 1.28, max: 1.28, hit: false, trailAt: now, phase: Math.random() * Math.PI * 2, color, damage: isRing ? 52 : 46, pierce: growth.pierce });
      audio.swing(isRing, 'dual');
      impacts.push({ x: player.x + player.facing * anchor.launch, lane: player.lane, y: ground() + player.lane - launchHeight, life: .26, max: .26, heavy: isRing, defeated: false, color, style: isRing ? 'crescent' : 'ribbon' });
      for (let i = 0; i < 22; i++) dust.push({ x: player.x + player.facing * anchor.launch, y: ground() + player.lane - launchHeight + (Math.random() - .5) * 30, vx: player.facing * (70 + Math.random() * 220), vy: (Math.random() - .5) * 130, life: .20 + Math.random() * .36, max: .56, color: i % 4 ? color : '#fff2c7', glow: true, element: isRing ? 'shard' : 'droplet', rotation: Math.random() * 6.28 });
      return;
    }
    // 황충은 활 자체가 정체성이다 — 다른 장수보다 빠르고 강하고 한 명을 더 뚫는다.
    const masterArcher = heroId === 'huangzhong';
    const speed = masterArcher ? 1400 : 1180, launchHeight = anchor.height, distance = target ? Math.max(170, Math.abs(target.x - player.x)) : 820, travel = distance / speed;
    const targetLane = target?.lane ?? player.lane, targetHeight = target ? enemyDrawH * .56 : launchHeight * .82;
    pushArrow({ x: player.x + player.facing * anchor.launch, lane: player.lane, height: launchHeight, vx: player.facing * speed, laneV: (targetLane - player.lane) / travel, vz: (targetHeight - launchHeight + (masterArcher ? 190 : 260) * travel * travel) / travel, life: 1.35, max: 1.35, hit: false, trailAt: now, phase: Math.random() * Math.PI * 2, color: combatProfile.arrowColor, damage: masterArcher ? 62 : undefined, pierce: growth.pierce + (masterArcher ? 1 : 0) });
    audio.bow();
    impacts.push({ x: player.x + player.facing * anchor.launch, lane: player.lane, y: ground() + player.lane - launchHeight, life: .24, max: .24, heavy: false, defeated: false, color: combatProfile.arrowColor, style: combatProfile.impactStyle });
    for (let i = 0; i < 18; i++) dust.push({ x: player.x + player.facing * anchor.launch, y: ground() + player.lane - launchHeight + (Math.random() - .5) * 16, vx: -player.facing * (45 + Math.random() * 150), vy: (Math.random() - .5) * 90, life: .18 + Math.random() * .32, max: .50, color: i % 3 ? combatProfile.arrowColor : '#fff6c7', glow: true, element: i % 2 ? 'shard' : 'droplet' });
  }

  function beginAttack(type, now, { charged = false } = {}) {
    if (now < player.actionUntil) return;
    if (type === 'musou' && player.rage < 100) { showBanner(hudRoot, '무쌍 기운 부족', Math.floor(player.rage) + ' / 100', 950); return; }
    if (type === 'dash' && now < player.dashReady) { showBanner(hudRoot, '돌진 재사용 대기', Math.ceil((player.dashReady - now) / 1000) + '초', 950); return; }
    if (type === 'whirlwind' && now < player.whirlwindReady) { showBanner(hudRoot, '선풍참 재사용 대기', Math.ceil((player.whirlwindReady - now) / 1000) + '초', 950); return; }
    if (type === 'whirlwind' && player.rage < 25) { showBanner(hudRoot, '선풍참 기운 부족', Math.floor(player.rage) + ' / 25', 950); return; }
    if (type === 'counter' && now < player.counterReady) { showBanner(hudRoot, '반격 재사용 대기', Math.ceil((player.counterReady - now) / 1000) + '초', 950); return; }
    if (type === 'special') {
      if (player.hp <= 12) { showBanner(hudRoot, '필살기 체력 부족', '체력 13 이상에서 사용할 수 있습니다', 1050); return; }
      player.hp -= 8; player.invulnerableUntil = now + 980;
    }
    if (type === 'counter') {
      player.counterReady = now + 3200; player.counterUntil = now + 620;
      player.action = 'counter'; player.actionStarted = now; player.actionDuration = 620; player.actionUntil = now + 620; player.hitDone = true;
      audio.startMusic(); audio.shout(false); return;
    }
    if (type === 'dash') {
      releaseGrab(player.grab);
      const direction = input.axis();
      if (Math.abs(direction) > .22) player.facing = Math.sign(direction);
      player.dashCooldownScale = growth.cooldown;
      player.dashReachScale = heroTuning.reach;
      startDashState(player, dashTechnique, now);
      player.invulnerableUntil = Math.max(player.invulnerableUntil, now + 180);
      showBanner(hudRoot, dashTechnique.name, dashTechnique.tip, 950);
      floatText(dashTechnique.name, player.x, player.lane, dashTechnique.color, 1.15);
    }
    if (type === 'whirlwind') { player.whirlwindReady = now + 4200 * growth.cooldown; player.rage = Math.max(0, player.rage - 25); }
    if (player.grab && type === 'heavy') type = 'throw';
    else if (player.grab && type === 'attack') type = 'grab';
    const heavy = ['heavy', 'throw', 'special', 'dash', 'whirlwind', 'mountedThrust'].includes(type), musou = type === 'musou';
    if (musou) { const move = callouts.musou; player.rage = 0; player.invulnerableUntil = now + 1120; audio.specialCry(true, combatProfile.musouTheme); showBanner(hudRoot, move.name, move.cry); floatText(move.name, player.x, player.lane, combatProfile.hitColor, 1.34); }
    else if (type === 'special') { const move = callouts.special; audio.specialCry(false, combatProfile.specialTheme); showBanner(hudRoot, move.name, move.cry); floatText(move.name, player.x, player.lane, combatProfile.hitColor, 1.24); }
    else if (type === 'whirlwind') { audio.musou(false); audio.shout(true); }
    else if (type !== 'ranged') { audio.swing(heavy, combatProfile.audioStyle || weaponStyle); if (type === 'dash' || type === 'heavy' || type === 'mountedThrust') audio.shout(type === 'dash'); else if (type === 'attack' && Math.random() < .24) audio.shout(false); }
    const duration = musou ? 980 : type === 'whirlwind' ? 720 : type === 'special' ? 900 : type === 'ranged' ? 640 : type === 'dash' ? dashTechnique.duration : type === 'throw' ? 560 : heavy ? 510 : lightAttackMs;
    if (type === 'attack') player.attackStep = (now < player.comboUntil ? player.comboStep % 3 : 0) + 1;
    cameraKick = Math.max(cameraKick, musou || type === 'special' ? .085 : type === 'whirlwind' ? .065 : type === 'heavy' || type === 'dash' || (type === 'attack' && player.attackStep === 3) ? .038 : .012);
    player.action = type; player.rangedCharged = type === 'ranged' && charged; player.actionStarted = now; player.actionDuration = duration; player.actionUntil = now + duration; player.hitDone = false;
    player.combo = now < player.comboUntil ? player.combo + 1 : 1; player.comboStep = (player.comboStep % 3) + 1; player.comboUntil = now + 1150;
    if (type !== 'ranged') addSlash(type, player.attackStep);
  }
  // 난이도의 rage 배수가 정의만 되고 여태 안 붙어 있었다 — 수련은 무쌍이
  // 빨리 차야 이야기 진행이 편하고, 사지는 천천히 차야 아껴 쓰게 된다.
  function gainRage(amount) { player.rage = Math.min(100, player.rage + amount * diff.rage); }
  function rewardKoHeal() {
    if (!growth.koHeal) return;
    const amount = Math.max(1, Math.round(player.maxHp * growth.koHeal));
    player.hp = Math.min(player.maxHp, player.hp + amount);
    floatText(`+${amount}`, player.x, player.lane, '#76e1b4', .92);
  }

  function resolveAttack(now) {
    const action = player.action;
    if (action === 'dash') {
      // Swept collision: even a fast dash must hit enemies between frame positions.
      const targets = collectDashHits(player, enemies, dashTechnique, now);
      for (const enemy of targets) {
        const damage = Math.round((dashTechnique.damage + (now < player.weaponBoost ? 18 : 0)) * heroTuning.power);
        enemy.hp = Math.max(0, enemy.hp - damage);
        enemy.hitUntil = now + 350;
        enemy.x += player.facing * dashTechnique.knock;
        addImpact(enemy.x, enemy.lane, true, enemy.hp <= 0);
        floatText(damage, enemy.x, enemy.lane, dashTechnique.color, 1.08);
        if (enemy.hp <= 0) { enemy.deadAt = now; player.ko++; rewardKoHeal(); gainRage(16); audio.enemyVoice(true, 0, enemy); }
        else audio.enemyVoice(false, 0, enemy);
      }
      if (targets.length) { audio.hit(true, 'dash'); gainRage(targets.length * 5); shake = Math.max(shake, 7); }
      if (now >= player.dashEffectAt) { addSlash('dash'); player.dashEffectAt = now + 130; }
      const progress = (now - player.actionStarted) / dashTechnique.duration;
      while (player.dashShots < dashTechnique.shots && progress >= .30 + player.dashShots * .20) {
        fireArrow(now, false, .42); player.dashShots++;
      }
      for (const prop of props) {
        if (!prop.collected && prop.type === 'crate' && Math.abs(prop.x - player.x) < dashTechnique.reach && Math.abs(prop.lane - player.lane) < dashTechnique.lane) {
          prop.type = prop.drop; prop.drop = null; addImpact(prop.x, prop.lane, true, false);
        }
      }
      return;
    }
    if (player.hitDone || !['attack', 'heavy', 'musou', 'special', 'grab', 'throw', 'dash', 'whirlwind', 'ranged', 'mountedThrust'].includes(action)) return;
    const duration = action === 'musou' ? 980 : action === 'whirlwind' ? 720 : action === 'special' ? 900 : action === 'ranged' ? 640 : action === 'dash' ? 470 : action === 'throw' ? 560 : ['heavy', 'grab', 'mountedThrust'].includes(action) ? 510 : lightAttackMs;
    if (player.actionUntil - now > duration * (action === 'dash' ? .66 : .54)) return;
    player.hitDone = true;
    if (action === 'ranged') { fireArrow(now, player.rangedCharged); player.rangedCharged = false; return; }
    const mountedBonus = player.mounted ? 100 : 0, areaAttack = ['musou', 'special', 'whirlwind'].includes(action);
    // 무기별 사거리·피해. 찌르기(spear)는 멀리 좁게, 쌍고검(dual)은 짧고 잦게,
    // 언월도(guandao)는 그 사이에서 가장 무겁게.
    const stepRange = weaponStyle === 'spear' ? (player.attackStep === 3 ? 280 : 295)
      : weaponStyle === 'staff' ? (player.attackStep === 3 ? 275 : 230)
      : weaponStyle === 'dual' ? (player.attackStep === 3 ? 235 : 190)
      : weaponStyle === 'fan' ? (player.attackStep === 3 ? 320 : player.attackStep === 2 ? 278 : 246)
      // 갈퀴는 1타가 전방 긁기, 2타가 내려찍기, 3타가 넓은 휘두르기다.
      : weaponStyle === 'rake' ? (player.attackStep === 3 ? 305 : player.attackStep === 2 ? 238 : 252)
      : weaponStyle === 'crescent' ? (player.attackStep === 3 ? 286 : player.attackStep === 2 ? 252 : 244)
      : weaponStyle === 'monkstaff' ? (player.attackStep === 3 ? 318 : player.attackStep === 2 ? 274 : 248)
      : (player.attackStep === 3 ? 265 : player.attackStep === 2 ? 225 : 205);
    const stepDamage = weaponStyle === 'spear' ? (player.attackStep === 3 ? 44 : player.attackStep === 2 ? 36 : 30)
      : weaponStyle === 'staff' ? (player.attackStep === 3 ? 38 : player.attackStep === 2 ? 24 : 20)
      : weaponStyle === 'dual' ? (player.attackStep === 3 ? 40 : player.attackStep === 2 ? 26 : 22)
      : weaponStyle === 'fan' ? (player.attackStep === 3 ? 51 : player.attackStep === 2 ? 38 : 29)
      : weaponStyle === 'rake' ? (player.attackStep === 3 ? 56 : player.attackStep === 2 ? 45 : 36)
      : weaponStyle === 'crescent' ? (player.attackStep === 3 ? 48 : player.attackStep === 2 ? 35 : 30)
      : weaponStyle === 'monkstaff' ? (player.attackStep === 3 ? 60 : player.attackStep === 2 ? 48 : 38)
      : (player.attackStep === 3 ? 46 : player.attackStep === 2 ? 34 : 28);
    const range = (action === 'attack' ? stepRange + mountedBonus : action === 'dash' ? 385 + mountedBonus : action === 'mountedThrust' ? 410 : areaAttack ? (action === 'whirlwind' ? 310 : 430) : ['heavy', 'throw'].includes(action) ? (weaponStyle === 'spear' ? 320 : 270) + mountedBonus : 205 + mountedBonus) * heroTuning.reach;
    const critical = growth.critChance > 0 && Math.random() < growth.critChance;
    const finisherBoost = action === 'attack' && player.attackStep === 3 ? growth.finisher : 1;
    const damage = Math.round(((action === 'attack' ? stepDamage : action === 'musou' ? 110 : action === 'special' ? 82 : action === 'whirlwind' ? 66 : action === 'dash' ? 58 : action === 'mountedThrust' ? 64 : action === 'throw' ? 68 : action === 'heavy' ? 54 : player.mounted ? 44 : 30) * heroTuning.power + (now < player.weaponBoost ? 18 : 0)) * finisherBoost * (critical ? 1.65 : 1));
    let hits = 0;
    if (player.grab && ['grab', 'throw'].includes(action)) {
      const enemy = player.grab; enemy.hp -= damage; if (enemy.hp > 0) audio.enemyVoice(false, Math.max(-.8, Math.min(.8, (enemy.x - player.x) / 600)), enemy); player.grabHits += 1; hits += 1; addImpact(enemy.x, enemy.lane, action === 'throw', enemy.hp <= 0);
      if (action === 'throw' || player.grabHits >= 3 || enemy.hp <= 0) releaseGrab(enemy, true);
      if (enemy.hp <= 0) { enemy.hp = 0; enemy.deadAt = now; player.ko += 1; rewardKoHeal(); audio.enemyVoice(true, Math.max(-.8, Math.min(.8, (enemy.x - player.x) / 600)), enemy); }
    } else {
      for (const enemy of enemies) {
        if (enemy.deadAt || enemy.grabbed) continue; const dx = enemy.x - player.x;
        const laneTolerance = areaAttack ? 118
          : action === 'attack' && weaponStyle === 'spear' && player.attackStep !== 3 ? 52 // 찌르기는 일직선 — 정확히 겨눠야 맞는다
          : action === 'attack' && weaponStyle === 'staff' && player.attackStep === 3 ? 110 // 봉을 빙 돌리니 주변을 쓸어낸다
          : action === 'attack' && weaponStyle === 'dual' ? 74
          : action === 'attack' && weaponStyle === 'fan' ? (player.attackStep === 3 ? 128 : 102)
          : action === 'attack' && weaponStyle === 'rake' ? (player.attackStep === 3 ? 126 : 98)
          : action === 'attack' && weaponStyle === 'crescent' ? (player.attackStep === 3 ? 112 : 86)
          : action === 'attack' && weaponStyle === 'monkstaff' ? (player.attackStep === 3 ? 132 : 104)
          : action === 'attack' && player.attackStep === 3 ? 84
          : action === 'dash' ? 74 : 66;
        if (Math.abs(enemy.lane - player.lane) <= laneTolerance && Math.abs(dx) <= range && (areaAttack || Math.sign(dx || player.facing) === player.facing)) {
          enemy.hp -= damage; if (enemy.hp > 0) audio.enemyVoice(false, Math.max(-.8, Math.min(.8, (enemy.x - player.x) / 600)), enemy); enemy.hitUntil = now + (['dash', 'mountedThrust'].includes(action) ? 410 : 290); floatText(enemy.boss ? `${critical ? '✦ ' : ''}◆ ${damage}` : critical ? `✦ ${damage}` : damage, enemy.x, enemy.lane, enemy.boss ? bossProfile.glow : critical ? '#fff0a6' : combatProfile.hitColor, enemy.boss ? 1.18 : critical ? 1.14 : 1);
          // 찌르기는 직선으로 강하게 밀어내고, 쌍고검은 얕게 여러 번 민다.
          const knockDirection = areaAttack ? Math.sign(dx || player.facing) : player.facing;
          const knockPower = action === 'dash' ? 135 : action === 'mountedThrust' ? (weaponStyle === 'rake' ? 150 : weaponStyle === 'monkstaff' ? 144 : 112) : action === 'heavy' ? (weaponStyle === 'spear' ? 125 : weaponStyle === 'rake' ? 138 : weaponStyle === 'monkstaff' ? 132 : 95) : action === 'attack' && player.attackStep === 3 ? 90 : weaponStyle === 'spear' ? 80 : weaponStyle === 'dual' ? 32 : weaponStyle === 'fan' ? 68 : weaponStyle === 'staff' ? 38 : weaponStyle === 'rake' ? 76 : weaponStyle === 'monkstaff' ? 72 : weaponStyle === 'crescent' ? 62 : 48;
          enemy.x += knockDirection * knockPower;
          hits += 1; addImpact(enemy.x, enemy.lane, action === 'attack' ? player.attackStep === 3 : action !== 'grab', enemy.hp <= 0);
          if (enemy.hp <= 0) { enemy.hp = 0; enemy.deadAt = now; player.ko += 1; rewardKoHeal(); audio.enemyVoice(true, Math.max(-.8, Math.min(.8, (enemy.x - player.x) / 600)), enemy); gainRage(16); }
        }
      }
    }
    for (const prop of props) {
      if (prop.collected || prop.type !== 'crate') continue; const dx = prop.x - player.x;
      if (Math.abs(prop.lane - player.lane) < 78 && Math.abs(dx) < range && (areaAttack || Math.sign(dx || player.facing) === player.facing)) {
        prop.hp -= 1; hits += 1; if (prop.hp <= 0) { prop.type = prop.drop; prop.drop = null; addImpact(prop.x, prop.lane, true, false); }
      }
    }
    if (hits) { const powerful = action === 'attack' ? player.attackStep === 3 : action !== 'grab'; audio.hit(powerful, action); shake = ['musou', 'special', 'whirlwind'].includes(action) ? 18 : ['heavy', 'throw', 'dash', 'mountedThrust'].includes(action) || powerful ? 12 : 6; hitstopUntil = now + (powerful ? 64 : 42); if (powerful) slowUntil = Math.max(slowUntil, now + (['musou', 'special'].includes(action) ? 310 : 190)); gainRage(hits * (action === 'whirlwind' ? 3 : 7)); }
  }
  function finish(win) {
    if (ended) return; ended = true; cancelAnimationFrame(raf); input.destroy(); removeEventListener('pointerdown', unlockAudio, { capture: true }); removeEventListener('resize', resize); document.removeEventListener('visibilitychange', onVisibility); removeEventListener('blur', onBlur); removeEventListener('focus', onFocus); bossHud.remove(); audio.stop(); if (win) audio.win();
    const rewards = awardBattleProgress(heroId, { win, ko: player.ko, stageKey, difficultyId: diff.id });
    setTimeout(() => { document.getElementById('ui').innerHTML = ''; showResult(document.getElementById('ui'), { win, heroName, enemyName: bossLabel, weaponName, rewards, onRetry: () => startSideBattle(heroId, stageKey, { onExit }), onMenu: () => onExit?.() }); }, 450);
  }

  function update(dt, now) {
    const bounds = combatBounds(worldWidth, waveGate, combatLocked);
    // Also recover live units displaced by asynchronous counters/boss attacks.
    for (const enemy of enemies) if (!enemy.deadAt) constrainEnemy(enemy, bounds);
    const axis = input.axis(), laneAxis = input.axisY();
    if (axis || laneAxis) {
      audio.startMusic();
      if (now > player.footstepAt) {
        player.footstepAt = now + (player.mounted ? 150 : 245);
        audio.footstep(player.mounted ? mountKind : 'foot');
        if (player.mounted) {
          if (isCloudMount) {
            // 근두운은 발굽 대신 아래로 흘러내리는 금빛 운무를 남긴다.
            for (let i = 0; i < 4; i++) dust.push({ x: player.x - player.facing * (52 + i * 20), y: ground() + player.lane - 92 + Math.random() * 24, vx: -player.facing * (35 + Math.random() * 95), vy: -18 - Math.random() * 50, life: .28 + Math.random() * .24, max: .52, color: i % 2 ? '#fff0b2' : '#ffc95e', ambient: false, element: 'mist', size: 5 + Math.random() * 8 });
          } else if (isBoarMount) {
            // 흑철야저는 발굽 대신 낮게 튀는 흙먼지와 잔돌을 남긴다.
            for (let i = 0; i < 5; i++) dust.push({ x: player.x - player.facing * (44 + i * 18), y: ground() + player.lane - 3, vx: -player.facing * (65 + Math.random() * 130), vy: -35 - Math.random() * 95, life: .24 + Math.random() * .28, max: .52, color: i % 2 ? '#9b7044' : '#e1b46d', ambient: false, element: i % 3 ? 'shard' : 'droplet', size: 4 + Math.random() * 7 });
          } else if (isWaterMount) {
            // 유사하 수마는 발굽 먼지 대신 푸른 물방울과 낮은 수막을 남긴다.
            for (let i = 0; i < 5; i++) dust.push({ x: player.x - player.facing * (48 + i * 19), y: ground() + player.lane - 4 - Math.random() * 16, vx: -player.facing * (55 + Math.random() * 125), vy: -25 - Math.random() * 110, life: .28 + Math.random() * .30, max: .58, color: i % 2 ? '#78d7e8' : '#d2f8ff', ambient: false, glow: true, element: 'droplet', size: 3 + Math.random() * 7 });
          } else {
            // 말발굽은 발자국보다 짧고 넓은 먼지 호흡으로 읽혀야 한다.
            for (let i = 0; i < 3; i++) dust.push({ x: player.x - player.facing * (58 + i * 22), y: ground() + player.lane + 2, vx: -player.facing * (35 + Math.random() * 95), vy: -25 - Math.random() * 65, life: .24 + Math.random() * .22, max: .45, color: i === 0 ? '#f3d09a' : '#b77b4d', ambient: false, element: 'droplet', size: 3 + Math.random() * 6 });
          }
        }
      }
    }
    if (input.consume('mute')) { const muted = audio.toggleMute(); showBanner(hudRoot, muted ? '음소거' : '사운드 재생', 'M 키로 전환'); }
    for (const label of floatingTexts) { label.life -= dt; label.y += label.vy * dt; label.x += label.vx * dt; label.vy += 18 * dt; label.vx *= Math.exp(-dt * 4); }
    floatingTexts = floatingTexts.filter((label) => label.life > 0);
    if (now >= player.actionUntil) player.action = axis || laneAxis ? 'run' : 'idle';
    const canStartAction = now >= player.actionUntil;
    if (canStartAction && input.consume('counter')) beginAttack('counter', now);
    else if (canStartAction && input.consume('dash')) beginAttack('dash', now);
    else if (canStartAction && input.consume('whirlwind')) beginAttack('whirlwind', now);
    // 터치 '필살' 버튼 하나가 필살기와 무쌍을 겸한다 — 게이지가 찼으면 무쌍.
    else if (canStartAction && input.consume('skill')) beginAttack(player.rage >= 100 ? 'musou' : 'special', now);
    else if (canStartAction && input.consume('special')) beginAttack('special', now);
    else if (canStartAction && input.consume('musou')) beginAttack('musou', now);
    else if (canStartAction && input.consumeHold('ranged')) {
      const canRanged = player.mounted ? supportsMountedRanged : supportsRanged;
      if (canRanged) beginAttack('ranged', now, { charged: true });
      else showBanner(hudRoot, player.mounted ? '기마 원거리 자세 없음' : '원거리 자세 없음', player.mounted ? '하마 후 원거리 공격을 사용하세요' : '이 장수는 근접전에 특화되어 있습니다', 1050);
    }
    else if (canStartAction && input.consumeTap('ranged')) {
      const canRanged = player.mounted ? supportsMountedRanged : supportsRanged;
      if (canRanged) beginAttack('ranged', now);
      else showBanner(hudRoot, player.mounted ? '기마 원거리 자세 없음' : '원거리 자세 없음', player.mounted ? '하마 후 원거리 공격을 사용하세요' : '이 장수는 근접전에 특화되어 있습니다', 1050);
    }
    else if (canStartAction && input.consumeHold('attack')) beginAttack('heavy', now);
    // 연속기: 약·약·약 뒤 네 번째 공격은 강공 마무리. 버튼 하나로 강공까지
    // 닿게 하되, 마무리 뒤엔 사슬을 끊어 다음 연타가 1단부터 다시 붙는다.
    else if (canStartAction && input.consumeTap('attack')) {
      if (!player.mounted && player.comboStep === 3 && now < player.comboUntil) { beginAttack('heavy', now); player.comboStep = 0; }
      else beginAttack(player.mounted ? 'mountedThrust' : 'attack', now);
    }

    if (input.consume('mount')) {
      if (now < player.actionUntil) {
        showBanner(hudRoot, '동작 중', '공격이 끝난 뒤 F로 하마할 수 있습니다');
      } else if (!supportsMount) {
        showBanner(hudRoot, '보병 전용 장수', '이 작품의 승마 시트는 사용하지 않습니다');
      } else if (player.mounted) {
        player.mounted = false; horse.mounted = false; horse.active = true; horse.x = player.x - player.facing * 80; horse.lane = player.lane; horse.facing = player.facing;
        mountTransition('dismount', horse.x, horse.lane, horse.facing);
        showBanner(hudRoot, mountLabel + ' 하강', 'F를 누르면 다시 탑승');
      } else if (horse.active && Math.abs(player.x - horse.x) < 150 && Math.abs(player.lane - horse.lane) < 75) {
        player.mounted = true; horse.mounted = true; horse.facing = player.facing;
        mountTransition('mount', player.x, player.lane, player.facing);
        showBanner(hudRoot, mountLabel + ' 탑승', isCloudMount ? '활=파초선 · 공격=여의봉 연격 · 돌진기=질풍봉' : '활=기마궁술 · 공격=기마 연격 · 돌진기=돌파');
      } else {
        showBanner(hudRoot, mountLabel + '이(가) 멀리 있다', mountLabel + ' 가까이에서 F를 눌러 탑승');
      }
    }
    if (input.consume('jump') && player.y <= 0.1 && !player.mounted) { player.vy = 760; audio.jump(); }
    const locked = ['heavy', 'musou', 'special', 'throw', 'dash', 'whirlwind', 'counter', 'ranged', 'mountedThrust'].includes(player.action);
    // 스틱은 아날로그(-1~1)라 facing 은 부호만 취한다 — 소수 facing 이
    // 렌더 scale(facing,1)로 들어가면 스프라이트가 홀쭉해진다.
    if (axis && !locked) { player.facing = Math.sign(axis); player.x += axis * (player.mounted ? 470 : 330) * heroTuning.speed * dt; if (player.action === 'idle') player.action = 'run'; }
    if (laneAxis && !locked) { player.lane += laneAxis * (player.mounted ? 245 : 205) * heroTuning.speed * dt; if (player.action === 'idle') player.action = 'run'; }
    if (player.action === 'dash') player.x += player.facing * dashTechnique.speed * (player.mounted ? 1.15 : 1) * dt;
    player.lane = Math.max(-92, Math.min(72, player.lane));
    player.vy -= 1750 * dt; player.y = Math.max(0, player.y + player.vy * dt); if (player.y === 0) player.vy = Math.max(0, player.vy);
    player.x = clampCombatX(player.x, bounds); resolveAttack(now); if (now > player.comboUntil) { player.combo = 0; player.comboStep = 0; }
    if (player.grab) { player.grab.x = player.x + player.facing * 66; player.grab.lane = player.lane; player.grab.facing = -player.facing; }
    if (player.mounted) { horse.x = player.x; horse.lane = player.lane; horse.facing = player.facing; }

    for (const arrow of arrows) {
      if (arrow.hit) continue;
      arrow.life -= dt; arrow.x += arrow.vx * dt; arrow.lane += arrow.laneV * dt; arrow.height += arrow.vz * dt; arrow.vz -= 520 * dt;
      if (now >= arrow.trailAt) { arrow.trailAt = now + 22; for (let i = 0; i < 3; i++) dust.push({ x: arrow.x - Math.sign(arrow.vx) * (12 + i * 17), y: ground() + arrow.lane - arrow.height + (Math.random() - .5) * 12, vx: -Math.sign(arrow.vx) * (55 + Math.random() * 130), vy: (Math.random() - .5) * 80, life: .18 + Math.random() * .24, max: .42, color: i ? arrow.color : '#ffffff', glow: true, element: i % 2 ? 'shard' : 'droplet', rotation: Math.random() * 6.28 }); }
      for (const enemy of enemies) {
        if (enemy.deadAt || enemy.grabbed || arrow.hitTargets?.has(enemy) || Math.abs(enemy.x - arrow.x) > 58 || Math.abs(enemy.lane - arrow.lane) > 48 || arrow.height < 40 || arrow.height > Math.min(300, height * .47) * .95) continue;
        const arrowCritical = growth.critChance > 0 && Math.random() < growth.critChance * .75;
        const arrowDamage = Math.round(((arrow.damage ?? 43) * heroTuning.arrow * (arrow.charged ? 1.6 : 1) + (now < player.weaponBoost ? 16 : 0)) * (arrowCritical ? 1.65 : 1));
        enemy.hp = Math.max(0, enemy.hp - arrowDamage); if (enemy.hp > 0) audio.enemyVoice(false, Math.max(-.8, Math.min(.8, (enemy.x - player.x) / 600)), enemy);
        floatText(enemy.boss ? `${arrowCritical ? '✦ ' : ''}◆ ${arrowDamage}` : arrowCritical ? `✦ ${arrowDamage}` : arrowDamage, enemy.x, enemy.lane, enemy.boss ? bossProfile.glow : arrowCritical ? '#fff0a6' : arrow.color, enemy.boss ? 1.16 : arrowCritical ? 1.12 : 1);
        enemy.hitUntil = now + 380;
        const projectileDirection = Math.sign(arrow.vx);
        enemy.x += arrow.kind === 'lasso' ? -projectileDirection * 92 : projectileDirection * (arrow.kind === 'ring' ? 44 : 58);
        arrow.hitTargets ??= new Set(); arrow.hitTargets.add(enemy);
        if ((arrow.pierce || 0) > 0) arrow.pierce -= 1; else { arrow.hit = true; arrow.life = 0; }
        addImpact(enemy.x, enemy.lane, true, enemy.hp <= 0);
        for (let i = 0; i < 28; i++) dust.push({ x: enemy.x, y: ground() + enemy.lane - arrow.height, vx: (Math.random() - .5) * 380, vy: (Math.random() - .5) * 280, life: .22 + Math.random() * .48, max: .7, color: i % 4 ? arrow.color : '#fff7d6', glow: true, element: i % 2 ? 'shard' : 'droplet' });
        audio.hit(true); shake = 10; colorFlash = Math.max(colorFlash, .12); hitstopUntil = now + 58; slowUntil = Math.max(slowUntil, now + (enemy.boss ? 190 : 115)); player.combo += 1; player.comboUntil = now + 1200; gainRage(9);
        if (enemy.hp <= 0) { enemy.deadAt = now; player.ko += 1; rewardKoHeal(); audio.enemyVoice(true, Math.max(-.8, Math.min(.8, (enemy.x - player.x) / 600)), enemy); gainRage(12); }
        if (arrow.hit) break;
      }
      if (!arrow.hit && arrow.height < 8) { arrow.hit = true; arrow.life = 0; for (let i = 0; i < 5; i++) dust.push({ x: arrow.x, y: ground() + arrow.lane - 5, vx: (Math.random() - .5) * 80, vy: -30 - Math.random() * 70, life: .2 + Math.random() * .2, max: .4, color: '#b99861' }); }
    }
    arrows = arrows.filter((arrow) => arrow.life > 0 && arrow.x > cameraX - 180 && arrow.x < cameraX + width + 250);

    // 궁수 지원대의 붉은 화살. 플레이어 화살과 분리해 피격 판정을 명확히 한다.
    for (const arrow of enemyArrows) {
      if (arrow.hit) continue;
      arrow.life -= dt; arrow.x += arrow.vx * dt; arrow.lane += arrow.laneV * dt; arrow.height += arrow.vz * dt; arrow.vz -= 520 * dt;
      if (!arrow.hit && Math.abs(player.x - arrow.x) < 54 && Math.abs(player.lane - arrow.lane) < 52 && arrow.height > 32 && arrow.height < Math.min(300, height * .47) * .96) {
        arrow.hit = true; arrow.life = 0;
        if (now >= player.invulnerableUntil) {
          const damage = Math.round(arrow.damage * (1 + Math.max(0, wave - 2) * .06) * diff.enemyDamage * growth.enemyDamage);
          player.hp = Math.max(0, player.hp - damage); player.invulnerableUntil = now + 440; playerHud.hurt(); floatText(`-${damage}`, player.x, player.lane, '#ff9b80', 1.08); audio.hit(false); shake = 7; colorFlash = Math.max(colorFlash, .10); addImpact(player.x, player.lane, false, false);
          if (player.mounted && Math.random() < .18) { player.mounted = false; horse.mounted = false; horse.active = true; horse.x = player.x - player.facing * 85; horse.lane = player.lane; horse.facing = player.facing; mountTransition('forced', horse.x, horse.lane, horse.facing); showBanner(hudRoot, mountLabel + '에서 이탈', '다시 가까이 가서 F로 탑승'); }
          if (player.hp <= 0) finish(false);
        }
      }
      if (!arrow.hit && arrow.height < 8) { arrow.hit = true; arrow.life = 0; }
    }
    enemyArrows = enemyArrows.filter((arrow) => arrow.life > 0 && arrow.x > cameraX - 240 && arrow.x < cameraX + width + 280);

    // 보스 격노 충격파 — 땅을 타고 오므로 점프 중(y>40)이면 넘는다.
    for (const sw of shockwaves) {
      sw.life -= dt; sw.x += sw.dir * sw.speed * dt;
      if (now >= (sw.trailAt || 0)) {
        sw.trailAt = now + 30;
        for (let i = 0; i < 3; i++) dust.push({ x: sw.x - sw.dir * i * 16, y: ground() + sw.lane - 4 - Math.random() * 22, vx: sw.dir * (40 + Math.random() * 80), vy: -70 - Math.random() * 160, life: .22 + Math.random() * .2, max: .42, color: i ? sw.color : '#fff2cf', glow: true, element: 'shard' });
      }
      if (!sw.hit && Math.abs(player.x - sw.x) < 58 && Math.abs(player.lane - sw.lane) < 64 && player.y < 40) {
        sw.hit = true;
        if (now >= player.invulnerableUntil) {
          const damage = Math.round(16 * diff.enemyDamage * growth.enemyDamage);
          player.hp = Math.max(0, player.hp - damage); player.invulnerableUntil = now + 560; playerHud.hurt();
          floatText(`-${damage}`, player.x, player.lane, sw.color, 1.12); audio.hit(true); shake = Math.max(shake, 11); addImpact(player.x, player.lane, true, false);
          if (player.hp <= 0) finish(false);
        }
      }
    }
    shockwaves = shockwaves.filter((sw) => sw.life > 0 && sw.x > cameraX - 200 && sw.x < cameraX + width + 240);

    for (const prop of props) {
      if (prop.collected || prop.type === 'crate') continue;
      if (Math.abs(prop.x - player.x) > 62 || Math.abs(prop.lane - player.lane) > 52) continue;
      prop.collected = true;
      // 먹은 순간 반짝임이 튀어야 "주웠다"가 확실히 읽힌다.
      const tint = PICKUP_STYLE[prop.type]?.color || '#ffe6a2';
      audio.pickup(); colorFlash = Math.max(colorFlash, .10);
      for (let i = 0; i < 26; i++) {
        const angle = -Math.PI * (.1 + Math.random() * .8), speed = 90 + Math.random() * 230;
        dust.push({ x: prop.x, y: ground() + prop.lane - 40 - Math.random() * 30, vx: Math.cos(angle) * speed, vy: Math.sin(angle) * speed, life: .3 + Math.random() * .45, max: .78, color: i % 3 ? tint : '#ffffff', glow: true, element: i % 2 ? 'shard' : 'droplet', rotation: Math.random() * 6.28, spin: (Math.random() - .5) * 9, size: 3 + Math.random() * 6 });
      }
      if (prop.type === 'food') { player.hp = Math.min(player.maxHp, player.hp + 56); showBanner(hudRoot, '고기 획득', '체력 회복'); }
      else if (prop.type === 'weapon') { player.weaponBoost = now + 14000; showBanner(hudRoot, '명검 획득', '14초 동안 공격력 상승'); }
      else if (prop.type === 'bell') {
        if (player.mounted) {
          // 이미 타고 있을 때 두 번째 탈것을 겹쳐 만들지 않고 현재 탈것을 회복시킨다.
          horse.active = true; horse.mounted = true; horse.x = player.x; horse.lane = player.lane; horse.facing = player.facing;
          showBanner(hudRoot, mountLabel + ' 기력 회복', '현재 탑승 상태 유지');
        } else {
          horse.active = true; horse.mounted = false; horse.x = player.x + player.facing * 260; horse.lane = player.lane; horse.facing = player.facing;
          mountTransition('summon', horse.x, horse.lane, horse.facing);
          showBanner(hudRoot, mountLabel + ' 소환', mountLabel + ' 가까이에서 F로 탑승');
        }
      }
    }

    const attackOrder = enemies.filter((enemy) => !enemy.deadAt && !enemy.grabbed).sort((a, b) => Math.abs(a.x - player.x) + Math.abs(a.lane - player.lane) * 1.8 - (Math.abs(b.x - player.x) + Math.abs(b.lane - player.lane) * 1.8));
    // 부장이 살아 있으면 주변 병사가 지휘를 받아 거세진다 — '부장을 먼저
    // 쓰러뜨려라'는 힌트가 실제 전투 논리로 성립해야 한다.
    const commander = enemies.find((enemy) => enemy.boss && !enemy.trueBoss && !enemy.deadAt);
    for (const enemy of enemies) enemy.rallied = !!commander && !enemy.boss && !enemy.deadAt && Math.abs(enemy.x - commander.x) < 460;
    let living = 0, boss = null;
    for (const enemy of enemies) {
      if (enemy.deadAt) continue; living += 1; if (enemy.boss) boss = enemy;
      // 격노: 속도만 올리면 '조금 빨라졌네'로 끝난다. 새 패턴(충격파)이
      // 나와야 2페이즈가 다른 싸움으로 읽힌다. 충격파는 점프로만 피한다.
      if (enemy.boss && !enemy.enraged && enemy.hp <= enemy.maxHp * .5) { enemy.enraged = true; enemy.speed *= 1.16; enemy.attackAt = now + 260; enemy.shockwaveAt = now + 1900; bossHud.setPhase('폭주 · 결전 2단계', true); showBanner(hudRoot, bossLabel + ' 폭주', touchMode ? '땅을 가르는 충격파 — 스틱을 위로 튕겨 점프' : '땅을 가르는 충격파 — W 두 번 눌러 점프'); shake = Math.max(shake, 12); colorFlash = Math.max(colorFlash, .12); slowUntil = Math.max(slowUntil, now + 420); }
      if (enemy.trueBoss && enemy.enraged && now > (enemy.shockwaveAt || 0) && Math.abs(player.x - enemy.x) < 900 && now > enemy.actionUntil) {
        enemy.shockwaveAt = now + 4200 + Math.random() * 1800;
        enemy.action = 'attack'; enemy.actionStarted = now; enemy.actionDuration = 640; enemy.actionUntil = now + 640;
        const waveDir = Math.sign(player.x - enemy.x) || 1;
        setTimeout(() => {
          if (ended || enemy.deadAt) return;
          const t0 = performance.now();
          shockwaves.push({ x: enemy.x + waveDir * 70, lane: enemy.lane, dir: waveDir, speed: 640, life: 1.5, max: 1.5, color: bossProfile.glow, hit: false });
          audio.hit(true); shake = Math.max(shake, 13); colorFlash = Math.max(colorFlash, .10);
          for (let i = 0; i < 22; i++) dust.push({ x: enemy.x + waveDir * 60, y: ground() + enemy.lane - Math.random() * 26, vx: waveDir * (120 + Math.random() * 340), vy: -60 - Math.random() * 190, life: .3 + Math.random() * .4, max: .7, color: i % 3 ? bossProfile.glow : '#fff2cf', glow: true, element: 'shard', rotation: Math.random() * 6.28 });
        }, 430);
      }
      if (enemy.grabbed) { enemy.action = 'hit'; constrainEnemy(enemy, bounds); continue; }
      const dx = player.x - enemy.x, distance = Math.abs(dx), laneGap = player.lane - enemy.lane;
      enemy.facing = dx >= 0 ? 1 : -1;
      const attackRange = enemy.role === 'archer' ? 390 : enemy.boss ? bossProfile.attackRange : 150;
      if (now < enemy.hitUntil) enemy.action = 'hit';
      else if (Math.abs(laneGap) > 24) { enemy.action = 'run'; enemy.lane += Math.sign(laneGap) * enemy.speed * 0.52 * dt; if (distance > 220) enemy.x += Math.sign(dx) * enemy.speed * 0.45 * dt; }
      else if (distance > attackRange) { enemy.action = 'run'; enemy.x += Math.sign(dx) * enemy.speed * dt; }
      // 동시에 달려드는 수를 파에 따라 늘린다. 이게 고정 2명이면 적이 아무리
      // 늘어나도 줄 서서 기다리기만 해 후반이 오히려 심심해진다.
      else if (now > enemy.attackAt && (enemy.boss || attackOrder.indexOf(enemy) < attackerBudget(wave) + (enemy.role === 'archer' ? 1 : 0))) {
        enemy.action = 'attack'; enemy.actionStarted = now; enemy.actionDuration = enemy.role === 'archer' ? 700 : enemy.boss ? (bossProfile.actionDuration || 520) : 430; enemy.actionUntil = now + enemy.actionDuration;
        const cooldown = Math.max(680, 1340 - wave * 55) * diff.cooldown * (enemy.boss ? (bossProfile.cooldownScale || .92) : 1) * (enemy.rallied ? .82 : 1); enemy.attackAt = now + cooldown + Math.random() * 360;
        setTimeout(() => {
          const strikeNow = performance.now();
          const hitRange = enemy.role === 'archer' ? 520 : enemy.boss ? bossProfile.hitRange : 185;
          if (ended || enemy.deadAt || enemy.grabbed || Math.abs(player.x - enemy.x) > hitRange || Math.abs(player.lane - enemy.lane) > 62) return;
          if (enemy.role === 'archer' || (enemy.boss && bossProfile.kind === 'celestial')) {
            const drawH = Math.min(300, height * .47), distance = Math.max(180, Math.abs(player.x - enemy.x)), travel = distance / (enemy.boss ? 1120 : 980);
            enemyArrows.push({ x: enemy.x + enemy.facing * 56, lane: enemy.lane, height: drawH * (enemy.boss ? .68 : .62), vx: enemy.facing * (enemy.boss ? 1120 : 980), laneV: (player.lane - enemy.lane) / travel, vz: ((drawH * .56) - drawH * (enemy.boss ? .68 : .62) + 260 * travel * travel) / travel, life: 1.45, max: 1.45, hit: false, trailAt: strikeNow, phase: Math.random() * Math.PI * 2, color: enemy.boss ? bossProfile.glow : '#ff6e63', damage: enemy.boss ? 12 : 8 });
            audio.bow();
            return;
          }
          if (enemy.boss && bossProfile.kind === 'bull') { enemy.x += enemy.facing * 82; shake = Math.max(shake, 10); }
          if (strikeNow < player.counterUntil) {
            player.counterUntil = 0; player.action = 'heavy'; player.actionStarted = strikeNow; player.actionDuration = 360; player.actionUntil = strikeNow + 360; player.hitDone = true;
            enemy.hp = Math.max(0, enemy.hp - (enemy.boss ? 52 : 78)); if (enemy.hp > 0) audio.enemyVoice(false, Math.max(-.8, Math.min(.8, (enemy.x - player.x) / 600)), enemy); enemy.hitUntil = strikeNow + 520; enemy.x -= enemy.facing * 125; addImpact(enemy.x, enemy.lane, true, enemy.hp <= 0); audio.hit(true); audio.shout(true); shake = 15; hitstopUntil = strikeNow + 82; gainRage(18);
            if (enemy.hp <= 0) { enemy.deadAt = strikeNow; player.ko += 1; rewardKoHeal(); audio.enemyVoice(true, Math.max(-.8, Math.min(.8, (enemy.x - player.x) / 600)), enemy); }
            return;
          }
          if (strikeNow < player.invulnerableUntil) return;
          const enemyDamage = Math.round((enemy.boss ? bossProfile.damage : enemy.role === 'heavy' ? 16 : 11) * (1 + Math.max(0, wave - 2) * .09) * diff.enemyDamage * growth.enemyDamage * (enemy.rallied ? 1.12 : 1));
          player.hp = Math.max(0, player.hp - enemyDamage); player.invulnerableUntil = strikeNow + 520; floatText(`-${enemyDamage}`, player.x, player.lane, enemy.boss ? bossProfile.glow : '#ff9b80', enemy.boss ? 1.18 : 1.04); shake = enemy.boss ? 14 : 8; audio.hit(enemy.boss); playerHud.hurt();
          if (player.mounted && Math.random() < (enemy.boss ? .42 : .32)) { player.mounted = false; horse.mounted = false; horse.active = true; horse.x = player.x - player.facing * 85; horse.lane = player.lane; horse.facing = player.facing; mountTransition('forced', horse.x, horse.lane, horse.facing); showBanner(hudRoot, '충격으로 ' + mountLabel + ' 이탈', mountLabel + ' 가까이에서 F로 다시 탑승'); }
          if (player.hp <= 0) finish(false);
        }, enemy.role === 'archer' ? 360 : 250);
      } else if (now > enemy.actionUntil) {
        enemy.action = 'idle';
        if (distance < 205) enemy.lane += Math.sign((enemy.lane - player.lane) || (enemy.x - player.x)) * enemy.speed * .22 * dt;
      }
      for (const other of enemies) {
        if (other === enemy || other.deadAt || other.grabbed) continue;
        const apartX = enemy.x - other.x, apartLane = enemy.lane - other.lane;
        if (Math.abs(apartX) < 72 && Math.abs(apartLane) < 34) {
          enemy.x += Math.sign(apartX || (enemy.x - player.x) || 1) * enemy.speed * .24 * dt;
          enemy.lane += Math.sign(apartLane || enemy.lane || 1) * enemy.speed * .18 * dt;
        }
      }
      constrainEnemy(enemy, bounds);
    }
    if (boss) bossHud.setHp(boss.hp / boss.maxHp);
    if (!living && !ended) { combatLocked = false; waveDelay += dt; if (wave < TOTAL_WAVES && waveDelay > 1.0) spawnWave(); else if (wave >= TOTAL_WAVES && waveDelay > 1.1) finish(true); }
    const cameraLead = player.facing * (player.mounted ? 88 : 42);
    cameraX += (Math.max(0, Math.min(worldWidth - width, player.x + cameraLead - width * 0.34)) - cameraX) * (1 - Math.exp(-dt * 6));
    if (now > ambientAt) {
      ambientAt = now + 220 + Math.random() * 260;
      dust.push({ x: cameraX + Math.random() * width, y: ground() - 40 - Math.random() * height * .55, vx: -12 + Math.random() * 28, vy: -18 - Math.random() * 34, life: 1.2 + Math.random() * 1.8, max: 3, color: Math.random() > .32 ? '#df7b32' : '#f4c45e', ambient: true, glow: true });
    }
    if ((['musou', 'whirlwind', 'dash', 'heavy'].includes(player.action) || (player.action === 'attack' && player.attackStep === 3)) && now > player.afterimageAt) {
      player.afterimageAt = now + (player.action === 'musou' ? 52 : player.action === 'dash' || player.action === 'attack' ? 62 : 72);
      const frame = player.action === 'run' ? 1 : Math.max(2, Math.min(3, (now - player.actionStarted) / Math.max(1, player.actionDuration) < .46 ? 2 : 3));
      afterimages.push({ x: player.x, lane: player.lane, y: player.y, mounted: player.mounted, ranged: player.action === 'ranged', frame, facing: player.facing, life: .24, max: .24 });
    }
    effects.forEach((effect) => effect.life -= dt); effects = effects.filter((effect) => effect.life > 0);
    impacts.forEach((impact) => impact.life -= dt); impacts = impacts.filter((impact) => impact.life > 0);
    afterimages.forEach((ghost) => ghost.life -= dt); afterimages = afterimages.filter((ghost) => ghost.life > 0);
    dust.forEach((particle) => { particle.life -= dt; particle.x += particle.vx * dt; particle.y += particle.vy * dt; if (particle.rotation != null) particle.rotation += (particle.spin || 0) * dt; if (!particle.ambient) particle.vy += 520 * dt; });
    // 화면 밖 입자는 계속 그려봐야 안 보인다 — 수명 전이라도 버린다.
    const cullL = cameraX - 220, cullR = cameraX + width + 220;
    dust = dust.filter((particle) => particle.life > 0 && particle.x > cullL && particle.x < cullR);
    // 상한선. 무쌍 난타 중에 수천 개까지 불어나면 프레임이 무너진다.
    const dustCap = Math.round(460 * q());
    if (dust.length > dustCap) dust.splice(0, dust.length - dustCap);
    cameraKick *= Math.exp(-dt * 5.2);
    const zoomTarget = now < bossIntroUntil ? 1.085 : 1 + cameraKick;
    cameraZoom += (zoomTarget - cameraZoom) * (1 - Math.exp(-dt * 9));
    colorFlash *= Math.exp(-dt * 15); shake *= Math.exp(-dt * 11);
    playerHud.setDashCooldown(player.dashReady - now, dashTechnique.cooldown * growth.cooldown);
    playerHud.setHp(player.hp / player.maxHp); playerHud.setRage(player.rage / 100); playerHud.setCombo(player.combo); playerHud.setKo(player.ko); playerHud.setStage(wave, TOTAL_WAVES); playerHud.setMount(player.mounted, mountLabel);
  }
  function drawBackground() {
    // 호로관 외 스테이지는 그려둔 배경 이미지가 없다 — 절차 생성 배경을 쓴다.
    if (scenery) { scenery.draw(ctx, cameraX, width, height, performance.now(), q()); return; }
    const image = assets.background, scale = Math.max(width / image.width, height / image.height), drawW = image.width * scale, drawH = image.height * scale, parallax = (cameraX * 0.10) % drawW;
    ctx.fillStyle = '#171716'; ctx.fillRect(0, 0, width, height);
    // 배경 타일은 drawW >= width 라 화면에 최대 2장만 걸친다. 3장을 다 그리면
    // 매 프레임 전체화면 blit 를 한 번 헛으로 하는 셈 — 화면 밖 타일은 건너뛴다.
    for (let i = -1; i <= 1; i++) {
      const tileX = i * drawW - parallax;
      if (tileX > width || tileX + drawW < 0) continue;
      ctx.save();
      if (i % 2) { ctx.translate((i + 1) * drawW - parallax, 0); ctx.scale(-1, 1); ctx.drawImage(image, 0, (height - drawH) * 0.5, drawW, drawH); }
      else ctx.drawImage(image, tileX, (height - drawH) * 0.5, drawW, drawH);
      ctx.restore();
    }
    const shade = ctx.createLinearGradient(0, 0, 0, height); shade.addColorStop(0, 'rgba(9,14,17,.05)'); shade.addColorStop(.62, 'rgba(20,13,8,.03)'); shade.addColorStop(1, 'rgba(6,4,2,.48)'); ctx.fillStyle = shade; ctx.fillRect(0, 0, width, height);
  }

  // 원점 기준으로 만든 그라디언트는 매 프레임 동일하다 — translate 로 옮겨
  // 쓰면 되므로 한 번만 만들어 재사용한다(프레임당 20여 개 생성 제거).
  const gradientCache = {};
  const cachedRadial = (key, r0, r1, stops) => {
    let g = gradientCache[key];
    if (!g) {
      g = ctx.createRadialGradient(0, 0, r0, 0, 0, r1);
      for (const [offset, color] of stops) g.addColorStop(offset, color);
      gradientCache[key] = g;
    }
    return g;
  };

  function drawAtmosphere(now, floorY, foreground = false) {
    ctx.save();
    if (!foreground) {
      const distanceHaze = ctx.createLinearGradient(0, height * .24, 0, floorY); distanceHaze.addColorStop(0, 'rgba(126,157,163,.05)'); distanceHaze.addColorStop(.55, 'rgba(142,160,151,.13)'); distanceHaze.addColorStop(1, 'rgba(82,73,60,.04)'); ctx.fillStyle = distanceHaze; ctx.fillRect(0, height * .18, width, floorY - height * .18);
      const torches = [640, 1320, 2110, 2870, 3650, 4380];
      ctx.globalCompositeOperation = 'screen';
      for (let i = 0; i < torches.length; i++) {
        const x = torches[i] - cameraX, y = floorY - 140 - (i % 3) * 34;
        if (x < -240 || x > width + 240) continue;
        const pulse = 1 + Math.sin(now * .009 + i * 2.1) * .12;
        const glow = cachedRadial('torch', 4, 175, [[0, 'rgba(255,222,125,.42)'], [.18, 'rgba(255,133,44,.20)'], [1, 'rgba(128,38,12,0)']]);
        ctx.save(); ctx.translate(x, y); ctx.scale(pulse, pulse); ctx.fillStyle = glow; ctx.fillRect(-190, -190, 380, 380); ctx.restore();
      }
      ctx.globalCompositeOperation = 'source-over';
      const fogCount = Math.round(8 * q());
      for (let i = 0; i < fogCount; i++) {
        const drift = (now * (.008 + i * .0007) * (i % 2 ? 1 : -1)), x = ((i * 293 - cameraX * (.12 + i * .012) + drift) % (width + 520)) - 260, y = floorY - 76 + (i % 4) * 24 + Math.sin(now * .0015 + i) * 13;
        const fog = cachedRadial('fog', 4, 112, [[0, 'rgba(205,211,195,.10)'], [.5, 'rgba(155,165,151,.055)'], [1, 'rgba(110,119,109,0)']]);
        ctx.save(); ctx.translate(x, y); ctx.scale(2.6 + (i % 3) * .55, .48 + (i % 2) * .16); ctx.fillStyle = fog; ctx.beginPath(); ctx.arc(0, 0, 112, 0, Math.PI * 2); ctx.fill(); ctx.restore();
      }
    } else {
      const lowShade = ctx.createLinearGradient(0, floorY - 30, 0, height); lowShade.addColorStop(0, 'rgba(13,10,8,0)'); lowShade.addColorStop(1, 'rgba(8,5,4,.52)'); ctx.fillStyle = lowShade; ctx.fillRect(0, floorY - 30, width, height - floorY + 30);
      const smokeCount = Math.round(6 * q());
      for (let i = 0; i < smokeCount; i++) {
        const x = ((i * 347 - cameraX * .42 - now * (.014 + i * .001)) % (width + 460)) - 230, y = floorY + 70 + (i % 3) * 30;
        const smoke = cachedRadial('smoke', 8, 128, [[0, 'rgba(34,28,24,.16)'], [.65, 'rgba(24,21,19,.10)'], [1, 'rgba(16,14,13,0)']]);
        ctx.save(); ctx.translate(x, y); ctx.scale(2.2 + i * .18, .42 + (i % 2) * .16); ctx.fillStyle = smoke; ctx.beginPath(); ctx.arc(0, 0, 128, 0, Math.PI * 2); ctx.fill(); ctx.restore();
      }
    }
    ctx.restore();
  }

  function drawShadow(x, y, scale = 1, alpha = 0.4) {
    const gradient = cachedRadial('shadow', 2, 90, [[0, 'rgba(0,0,0,.72)'], [1, 'rgba(0,0,0,0)']]);
    ctx.save(); ctx.translate(x - cameraX, y); ctx.scale(scale, 1); ctx.globalAlpha = alpha; ctx.fillStyle = gradient; ctx.beginPath(); ctx.ellipse(0, 0, 92, 20, 0, 0, Math.PI * 2); ctx.fill(); ctx.restore();
  }

  // 아이템 종류별 정체성. 어두운 전장 배경에서 작은 도형만으로는 뭔지
  // 알아볼 수 없어서 색·아이콘·이름표를 함께 준다.
  const PICKUP_STYLE = {
    food: { color: '#ff6a4d', label: '전투식량', detail: '체력 +56', src: [0, 300, 512, 560], width: 88, height: 96 },
    weapon: { color: '#8fd8ff', label: '명검', detail: '공격력 상승', src: [512, 70, 512, 850], width: 78, height: 112 },
    bell: { color: '#ffd24a', label: '소환령', detail: '탈것 호출', src: [1024, 150, 512, 700], width: 102, height: 112 },
  };

  function drawProp(prop, floorY, now = 0) {
    if (prop.collected) return;
    const x = prop.x - cameraX, y = floorY + prop.lane;
    const style = PICKUP_STYLE[prop.type];

    if (style) {
      // 아이템은 바닥에서 살짝 떠서 위아래로 흔들린다 — 배경 소품이 아니라
      // "주울 수 있는 것"이라는 신호.
      const bob = Math.sin(now * .004 + prop.x) * 7, lift = 34 + bob, pulse = .5 + Math.sin(now * .006 + prop.x) * .5;
      ctx.save(); ctx.translate(x, y);
      // 바닥 표식 — 발밑에 있으니 밟고 지나가면 된다는 걸 알려준다.
      ctx.save(); ctx.globalAlpha = .30 + pulse * .30; ctx.strokeStyle = style.color; ctx.lineWidth = 2.5;
      ctx.beginPath(); ctx.ellipse(0, 0, 34 + pulse * 7, 11 + pulse * 3, 0, 0, Math.PI * 2); ctx.stroke(); ctx.restore();
      // 발광 후광
      ctx.save(); ctx.globalCompositeOperation = 'lighter'; ctx.globalAlpha = .30 + pulse * .22;
      const halo = cachedRadial('pickup', 3, 62, [[0, 'rgba(255,255,255,.55)'], [.42, 'rgba(255,255,255,.16)'], [1, 'rgba(255,255,255,0)']]);
      ctx.translate(0, -lift - 14); ctx.fillStyle = halo; ctx.fillRect(-62, -62, 124, 124); ctx.restore();

      // 회전하는 룬 고리 — 평범한 소품이 아니라 "보상"으로 보이게 한다.
      ctx.save(); ctx.translate(0, -lift - 12); ctx.globalCompositeOperation = 'lighter';
      const spin = now * .0011 + prop.x;
      for (const [rot, rx, ry, a] of [[spin, 46, 15, .34], [-spin * .72, 33, 24, .22]]) {
        ctx.save(); ctx.rotate(rot * .35); ctx.globalAlpha = a + pulse * .18;
        ctx.strokeStyle = style.color; ctx.lineWidth = 1.6; ctx.setLineDash([9, 13]); ctx.lineDashOffset = -rot * 26;
        ctx.beginPath(); ctx.ellipse(0, 0, rx, ry, 0, 0, Math.PI * 2); ctx.stroke(); ctx.setLineDash([]); ctx.restore();
      }
      // 고리를 도는 작은 불티
      for (let i = 0; i < 3; i++) {
        const a = spin * 1.6 + i * 2.09, px = Math.cos(a) * 46, py = Math.sin(a) * 15;
        ctx.globalAlpha = .5 + Math.sin(a) * .3; ctx.fillStyle = '#fff6d8';
        ctx.beginPath(); ctx.arc(px, py, 2.2, 0, Math.PI * 2); ctx.fill();
      }
      ctx.restore();

      // 생성형 프리미엄 아이템 아틀라스. 기존의 단순 도형은 로딩 실패 시에만
      // 아래 레거시 드로어로 남기고, 정상 상태에서는 재질이 살아 있는 픽업을 쓴다.
      if (assets.itemPickups && style.src) {
        const [sx, sy, sw, sh] = style.src;
        const dw = style.width, dh = style.height;
        const itemY = -lift - 8, frameY = itemY - dh * .52;
        ctx.save();
        ctx.translate(0, frameY);
        ctx.globalCompositeOperation = 'lighter';
        ctx.globalAlpha = .34 + pulse * .18;
        ctx.shadowColor = style.color; ctx.shadowBlur = 22;
        ctx.strokeStyle = style.color; ctx.lineWidth = 2.2;
        ctx.beginPath(); ctx.arc(0, 0, Math.max(dw, dh) * .47, 0, Math.PI * 2); ctx.stroke();
        ctx.globalAlpha = .24 + pulse * .14;
        ctx.setLineDash([5, 9]); ctx.lineDashOffset = -now * .035;
        ctx.beginPath(); ctx.arc(0, 0, Math.max(dw, dh) * .58, 0, Math.PI * 2); ctx.stroke(); ctx.setLineDash([]);
        ctx.restore();

        ctx.save();
        ctx.globalAlpha = .98;
        ctx.imageSmoothingEnabled = true;
        ctx.drawImage(assets.itemPickups, sx, sy, sw, sh, -dw * .5, itemY - dh * .5, dw, dh);
        ctx.globalCompositeOperation = 'lighter';
        ctx.globalAlpha = .26 + pulse * .18;
        const shineX = -dw * .44 + ((now * .00018 + prop.x * .01) % 1) * dw * 1.7;
        ctx.fillStyle = '#ffffff'; ctx.shadowColor = style.color; ctx.shadowBlur = 12;
        ctx.fillRect(shineX, itemY - dh * .40, Math.max(3, dw * .08), dh * .18);
        ctx.restore();

        ctx.save();
        ctx.translate(0, itemY + 10);
        ctx.globalAlpha = .82 + pulse * .18;
        ctx.fillStyle = 'rgba(10, 6, 6, .88)'; ctx.strokeStyle = style.color; ctx.lineWidth = 1.5;
        ctx.beginPath(); if (ctx.roundRect) ctx.roundRect(-48, -13, 96, 30, 8); else ctx.rect(-48, -13, 96, 30); ctx.fill(); ctx.stroke();
        ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
        ctx.font = `900 12px ${CANVAS_IMPACT_FONT}`; ctx.fillStyle = '#fff7df'; ctx.fillText(style.label, 0, -4);
        ctx.font = `700 9px ${CANVAS_UI_FONT}`; ctx.fillStyle = style.color; ctx.fillText(style.detail, 0, 10);
        ctx.restore();
        ctx.restore();
        return;
      }

      ctx.save(); ctx.translate(0, -lift);
      // 살짝 좌우로 흔들리며 떠 있는 느낌
      ctx.rotate(Math.sin(now * .0022 + prop.x) * .09);
      ctx.shadowColor = style.color; ctx.shadowBlur = 18;
      if (prop.type === 'food') {
        // 뼈 붙은 고깃덩이 — 명암·구운 자국·김까지.
        ctx.save(); ctx.rotate(-.2);
        ctx.strokeStyle = '#2a1109'; ctx.lineWidth = 5; ctx.lineJoin = 'round';
        const meat = ctx.createLinearGradient(-26, -34, 20, 4);
        meat.addColorStop(0, '#d1613a'); meat.addColorStop(.42, '#a3361f'); meat.addColorStop(1, '#5d1a0e');
        ctx.fillStyle = meat;
        ctx.beginPath(); ctx.moveTo(-30, -14); ctx.bezierCurveTo(-34, -36, -6, -44, 12, -33);
        ctx.bezierCurveTo(28, -25, 26, -4, 8, 3); ctx.bezierCurveTo(-12, 10, -26, 4, -30, -14); ctx.closePath();
        ctx.stroke(); ctx.fill();
        // 구운 자국
        ctx.globalAlpha = .5; ctx.strokeStyle = '#3d1206'; ctx.lineWidth = 3;
        ctx.beginPath(); ctx.moveTo(-20, -26); ctx.lineTo(2, -18); ctx.moveTo(-17, -14); ctx.lineTo(6, -6); ctx.stroke();
        // 윤기
        ctx.globalAlpha = .42; ctx.fillStyle = '#ffbe93';
        ctx.beginPath(); ctx.ellipse(-14, -28, 9, 4.5, -.5, 0, Math.PI * 2); ctx.fill(); ctx.globalAlpha = 1;
        // 뼈
        ctx.strokeStyle = '#2a1109'; ctx.lineWidth = 4; ctx.fillStyle = '#f4ecd6';
        ctx.beginPath(); ctx.moveTo(10, -26); ctx.lineTo(42, -17); ctx.lineWidth = 11; ctx.strokeStyle = '#2a1109'; ctx.stroke();
        ctx.lineWidth = 6; ctx.strokeStyle = '#f4ecd6'; ctx.stroke();
        ctx.strokeStyle = '#2a1109'; ctx.lineWidth = 3;
        ctx.beginPath(); ctx.arc(46, -20, 7, 0, Math.PI * 2); ctx.arc(45, -11, 6.5, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
        ctx.restore();
        // 모락모락 김
        ctx.save(); ctx.globalCompositeOperation = 'lighter'; ctx.globalAlpha = .16;
        ctx.strokeStyle = '#ffd9bd'; ctx.lineWidth = 3; ctx.lineCap = 'round';
        for (let i = 0; i < 2; i++) {
          ctx.beginPath();
          for (let s = 0; s <= 5; s++) ctx[s ? 'lineTo' : 'moveTo'](-10 + i * 20 + Math.sin(now * .003 + s * .9 + i) * 6, -40 - s * 11);
          ctx.stroke();
        }
        ctx.restore();
      } else if (prop.type === 'bell') {
        // 조각 새긴 청동 방울 + 술.
        ctx.save();
        ctx.rotate(Math.sin(now * .005 + prop.x) * .16); // 딸랑거리는 흔들림
        ctx.strokeStyle = '#3a2408'; ctx.lineWidth = 4.5; ctx.lineJoin = 'round';
        ctx.beginPath(); ctx.moveTo(0, -54); ctx.lineTo(0, -44); ctx.stroke();
        ctx.beginPath(); ctx.arc(0, -57, 6, 0, Math.PI * 2); ctx.stroke();
        ctx.strokeStyle = '#e8cf74'; ctx.lineWidth = 2.5; ctx.stroke();
        const brass = ctx.createLinearGradient(-24, -44, 22, -2);
        brass.addColorStop(0, '#ffeaa0'); brass.addColorStop(.35, '#dCA82f'); brass.addColorStop(.72, '#9a6b18'); brass.addColorStop(1, '#5e3d0c');
        ctx.strokeStyle = '#3a2408'; ctx.lineWidth = 4.5; ctx.fillStyle = brass;
        ctx.beginPath(); ctx.moveTo(-15, -44); ctx.bezierCurveTo(-26, -30, -28, -14, -30, -4);
        ctx.lineTo(30, -4); ctx.bezierCurveTo(28, -14, 26, -30, 15, -44); ctx.closePath();
        ctx.stroke(); ctx.fill();
        // 아랫단 테
        ctx.fillStyle = '#f3d886'; ctx.strokeStyle = '#3a2408'; ctx.lineWidth = 3;
        ctx.beginPath(); ctx.rect(-33, -6, 66, 8); ctx.fill(); ctx.stroke();
        // 새긴 무늬
        ctx.globalAlpha = .55; ctx.strokeStyle = '#6b4713'; ctx.lineWidth = 2;
        ctx.beginPath(); ctx.moveTo(-20, -20); ctx.quadraticCurveTo(0, -27, 20, -20); ctx.moveTo(-17, -13); ctx.quadraticCurveTo(0, -19, 17, -13); ctx.stroke(); ctx.globalAlpha = 1;
        // 하이라이트
        ctx.globalAlpha = .5; ctx.fillStyle = '#fff6cf';
        ctx.beginPath(); ctx.ellipse(-12, -30, 4.5, 11, .28, 0, Math.PI * 2); ctx.fill(); ctx.globalAlpha = 1;
        // 추 + 붉은 술
        ctx.fillStyle = '#7a4a12'; ctx.beginPath(); ctx.arc(0, 6, 6, 0, Math.PI * 2); ctx.fill();
        ctx.strokeStyle = '#b8302a'; ctx.lineWidth = 4; ctx.lineCap = 'round';
        ctx.beginPath(); ctx.moveTo(0, 8); ctx.lineTo(Math.sin(now * .005) * 5, 24); ctx.stroke();
        ctx.restore();
      } else {
        // 보검 — 옥 박은 자루, 물결무늬 도신, 흐르는 빛.
        ctx.save(); ctx.rotate(-.58);
        ctx.strokeStyle = '#101c22'; ctx.lineJoin = 'round';
        const steel = ctx.createLinearGradient(-7, -76, 8, 0);
        steel.addColorStop(0, '#ffffff'); steel.addColorStop(.3, '#cfe6f2'); steel.addColorStop(.55, '#8fb2c6'); steel.addColorStop(1, '#dcecf5');
        ctx.fillStyle = steel; ctx.lineWidth = 3.5;
        ctx.beginPath(); ctx.moveTo(0, -84); ctx.lineTo(7, -70); ctx.lineTo(7, -10); ctx.lineTo(-7, -10); ctx.lineTo(-7, -70); ctx.closePath();
        ctx.fill(); ctx.stroke();
        // 도신 중앙 홈
        ctx.globalAlpha = .55; ctx.strokeStyle = '#5f8296'; ctx.lineWidth = 1.6;
        ctx.beginPath(); ctx.moveTo(0, -76); ctx.lineTo(0, -14); ctx.stroke(); ctx.globalAlpha = 1;
        // 도신을 훑는 빛
        ctx.save(); ctx.globalCompositeOperation = 'lighter';
        const shimmer = ((now * .0006 + prop.x * .01) % 1);
        ctx.globalAlpha = .5; ctx.fillStyle = '#ffffff';
        ctx.fillRect(-6, -80 + shimmer * 66, 12, 9); ctx.restore();
        // 금 코등이
        const gold = ctx.createLinearGradient(-26, -12, 26, -2);
        gold.addColorStop(0, '#f7dc93'); gold.addColorStop(.5, '#c8992f'); gold.addColorStop(1, '#8a6415');
        ctx.fillStyle = gold; ctx.strokeStyle = '#2c1d06'; ctx.lineWidth = 3;
        ctx.beginPath(); ctx.moveTo(-26, -12); ctx.lineTo(26, -12); ctx.lineTo(20, -2); ctx.lineTo(-20, -2); ctx.closePath(); ctx.fill(); ctx.stroke();
        // 감은 자루
        ctx.fillStyle = '#3f2418'; ctx.strokeStyle = '#1a0f09'; ctx.lineWidth = 2.5;
        ctx.beginPath(); ctx.rect(-6, -2, 12, 32); ctx.fill(); ctx.stroke();
        ctx.strokeStyle = '#6d4227'; ctx.lineWidth = 2;
        for (let i = 0; i < 4; i++) { ctx.beginPath(); ctx.moveTo(-6, 3 + i * 7); ctx.lineTo(6, 6 + i * 7); ctx.stroke(); }
        // 옥 박은 손잡이 끝
        ctx.fillStyle = gold; ctx.strokeStyle = '#2c1d06'; ctx.lineWidth = 3;
        ctx.beginPath(); ctx.arc(0, 34, 8, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
        ctx.fillStyle = '#57d4c0'; ctx.beginPath(); ctx.arc(0, 34, 3.6, 0, Math.PI * 2); ctx.fill();
        ctx.restore();
      }
      ctx.restore();

      // 이름표 — 무슨 효과인지 글자로 못 박는다.
      ctx.save(); ctx.translate(0, -lift - 74); ctx.textAlign = 'center';
      ctx.globalAlpha = .82 + pulse * .18;
      ctx.font = `700 12px ${CANVAS_UI_FONT}`;
      ctx.lineWidth = 4; ctx.strokeStyle = 'rgba(6,4,3,.92)'; ctx.strokeText(style.label, 0, 0);
      ctx.fillStyle = style.color; ctx.fillText(style.label, 0, 0);
      ctx.restore();
      ctx.restore();
      return;
    }

    ctx.save(); ctx.translate(x, y);
    if (prop.type === 'crate') {
      // 생성형 전용 보물 상자. 기본 상자보다 크게 읽히고, 다음 보상의 색도
      // 상자 틈새에서 미리 보여 주어 부숴야 할 이유가 생긴다.
      if (assets.rewardChest) {
        const damaged = prop.hp <= 1, dropStyle = PICKUP_STYLE[prop.drop] || { color: '#ffe6a2', label: '전리품' };
        const bob = Math.sin(now * .0034 + prop.x) * 2.2, chestW = 172, chestH = 105;
        ctx.save(); ctx.translate(0, bob);
        if (damaged) ctx.rotate(Math.sin(now * .034 + prop.x) * .028);
        ctx.save(); ctx.globalCompositeOperation = 'lighter'; ctx.globalAlpha = .22 + Math.sin(now * .006 + prop.x) * .08;
        ctx.shadowColor = dropStyle.color; ctx.shadowBlur = 22; ctx.strokeStyle = dropStyle.color; ctx.lineWidth = 2;
        ctx.beginPath(); ctx.ellipse(0, -7, 86, 14, 0, 0, Math.PI * 2); ctx.stroke(); ctx.restore();
        ctx.shadowColor = 'rgba(0,0,0,.72)'; ctx.shadowBlur = 14;
        ctx.drawImage(assets.rewardChest, 70, 100, 1340, 850, -chestW * .5, -chestH, chestW, chestH);
        // 봉인 틈새에서 보상색이 새어 나온다. 보상 종류가 멀리서도 구분된다.
        ctx.save(); ctx.globalCompositeOperation = 'lighter'; ctx.globalAlpha = .40 + Math.sin(now * .009 + prop.x) * .16;
        const seam = ctx.createLinearGradient(-58, -63, 58, -63); seam.addColorStop(0, 'rgba(255,255,255,0)'); seam.addColorStop(.5, dropStyle.color); seam.addColorStop(1, 'rgba(255,255,255,0)');
        ctx.strokeStyle = seam; ctx.lineWidth = 3.2; ctx.shadowColor = dropStyle.color; ctx.shadowBlur = 12; ctx.beginPath(); ctx.moveTo(-56, -58); ctx.quadraticCurveTo(0, -64, 56, -58); ctx.stroke();
        ctx.restore();
        if (damaged) {
          ctx.save(); ctx.globalAlpha = .85; ctx.strokeStyle = '#1a0d08'; ctx.lineWidth = 3; ctx.lineCap = 'round';
          ctx.beginPath(); ctx.moveTo(-31, -72); ctx.lineTo(-18, -49); ctx.lineTo(-32, -32); ctx.lineTo(-16, -11); ctx.moveTo(28, -68); ctx.lineTo(17, -44); ctx.lineTo(31, -26); ctx.stroke(); ctx.restore();
        }
        const pulse = .58 + Math.sin(now * .006 + prop.x) * .28;
        ctx.save(); ctx.globalCompositeOperation = 'lighter'; ctx.globalAlpha = pulse; ctx.fillStyle = '#fff6d8'; ctx.shadowColor = dropStyle.color; ctx.shadowBlur = 14;
        ctx.beginPath(); ctx.moveTo(0, -129); ctx.lineTo(5, -118); ctx.lineTo(16, -113); ctx.lineTo(5, -108); ctx.lineTo(0, -97); ctx.lineTo(-5, -108); ctx.lineTo(-16, -113); ctx.lineTo(-5, -118); ctx.closePath(); ctx.fill(); ctx.restore();
        ctx.restore();
        ctx.restore();
        return;
      }
      // 구형 코드 경로: 이미지가 누락된 배포에서도 상자가 사라지지 않는다.
      // 군량 궤짝 — 나뭇결·쇠테·리벳까지 넣어 배경과 구분되게.
      const damaged = prop.hp <= 1;
      ctx.save();
      if (damaged) ctx.rotate(Math.sin(now * .02) * .012); // 한 대 맞으면 덜덜 떨린다
      const wood = ctx.createLinearGradient(-38, -70, 38, 2);
      wood.addColorStop(0, '#9c6a34'); wood.addColorStop(.45, '#6d451f'); wood.addColorStop(1, '#33200f');
      ctx.fillStyle = wood; ctx.strokeStyle = '#1c1108'; ctx.lineWidth = 4; ctx.lineJoin = 'round';
      ctx.beginPath(); ctx.rect(-38, -70, 76, 70); ctx.fill(); ctx.stroke();
      // 판자 이음새 + 나뭇결
      ctx.strokeStyle = 'rgba(26,15,8,.55)'; ctx.lineWidth = 2;
      for (const py of [-70, -47, -24]) { ctx.beginPath(); ctx.moveTo(-38, py + 23); ctx.lineTo(38, py + 23); ctx.stroke(); }
      ctx.globalAlpha = .3; ctx.strokeStyle = '#c99055'; ctx.lineWidth = 1;
      for (let i = 0; i < 5; i++) { const gy = -64 + i * 14; ctx.beginPath(); ctx.moveTo(-34, gy); ctx.bezierCurveTo(-10, gy - 3, 12, gy + 3, 34, gy); ctx.stroke(); }
      ctx.globalAlpha = 1;
      // 대각 쇠테
      const iron = ctx.createLinearGradient(-30, -60, 30, 0);
      iron.addColorStop(0, '#8d97a0'); iron.addColorStop(.5, '#4d565e'); iron.addColorStop(1, '#2b3238');
      ctx.strokeStyle = iron; ctx.lineWidth = 7; ctx.lineCap = 'butt';
      ctx.beginPath(); ctx.moveTo(-34, -64); ctx.lineTo(34, -6); ctx.moveTo(34, -64); ctx.lineTo(-34, -6); ctx.stroke();
      // 상하 테
      ctx.fillStyle = iron; ctx.strokeStyle = '#171d21'; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.rect(-38, -70, 76, 9); ctx.fill(); ctx.stroke();
      ctx.beginPath(); ctx.rect(-38, -11, 76, 11); ctx.fill(); ctx.stroke();
      // 리벳
      ctx.fillStyle = '#b9c3ca';
      for (const [rx, ry] of [[-31, -65], [-11, -65], [11, -65], [31, -65], [-31, -5], [-11, -5], [11, -5], [31, -5]]) { ctx.beginPath(); ctx.arc(rx, ry, 2.4, 0, Math.PI * 2); ctx.fill(); }
      // 맞으면 갈라진 금
      if (damaged) {
        ctx.strokeStyle = '#160c05'; ctx.lineWidth = 2.5;
        ctx.beginPath(); ctx.moveTo(-16, -60); ctx.lineTo(-8, -44); ctx.lineTo(-18, -32); ctx.lineTo(-6, -16); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(20, -56); ctx.lineTo(12, -40); ctx.lineTo(24, -28); ctx.stroke();
      }
      ctx.restore();
      // 부수면 뭔가 나온다는 힌트 — 상자 위에 작게 반짝이는 표식.
      const twinkle = .45 + Math.sin(now * .005 + prop.x) * .35;
      ctx.save(); ctx.globalCompositeOperation = 'lighter'; ctx.translate(0, Math.sin(now * .003 + prop.x) * 3);
      ctx.globalAlpha = twinkle; ctx.fillStyle = '#ffe6a2'; ctx.shadowColor = '#ffcf6a'; ctx.shadowBlur = 14;
      ctx.beginPath(); ctx.moveTo(0, -88); ctx.lineTo(5, -78); ctx.lineTo(15, -73); ctx.lineTo(5, -68); ctx.lineTo(0, -58); ctx.lineTo(-5, -68); ctx.lineTo(-15, -73); ctx.lineTo(-5, -78); ctx.closePath(); ctx.fill(); ctx.restore();
    }
    ctx.restore();
  }

  function drawLayeredMount(screenX, baseY, facing, frame = 0, alpha = 1, ranged = false, depthScale = 1, rider = true) {
    const layout = mountLayout(depthScale);
    if (rider) {
      // 기수를 먼저 그리고 같은 탈것 단독 시트를 앞에 덮는다. 말 몸통이 다리를
      // 자연스럽게 가려 '말 위에 서 있는' 인상을 없애면서 대기·근접·활 모두
      // 단 하나의 말/야저/수마/근두운 그림을 유지한다.
      const riderImage = ranged && !rangedUsesBase ? heroAssets.heroBow : heroAssets.hero;
      const riderBase = baseY - layout.riderLift;
      ctx.save();
      ctx.translate(screenX, riderBase - (frame === 1 ? 2 * depthScale : 0));
      if (frame >= 2) ctx.rotate(-facing * .028);
      drawAtlasFrame(ctx, riderImage, frame, 0, 0, layout.riderHeight, facing, alpha);
      ctx.restore();
    }
    drawAtlasFrame(ctx, mountAsset, frame, screenX, baseY, layout.mountHeight, facing, alpha);
    if (!rider || mountKind === 'horse') return;
    ctx.save(); ctx.globalCompositeOperation = 'lighter'; ctx.globalAlpha = alpha * (.16 + Math.sin(performance.now() * .008) * .035);
    ctx.strokeStyle = layout.glow; ctx.lineWidth = 3; ctx.shadowColor = layout.glow; ctx.shadowBlur = isBoarMount ? 11 : 18;
    ctx.beginPath(); ctx.ellipse(screenX, baseY - layout.mountHeight * .19, layout.mountHeight * .45, layout.mountHeight * .10, 0, 0, Math.PI * 2); ctx.stroke();
    ctx.restore();
  }

  function drawMountedFigure(screenX, baseY, facing, frame = 0, alpha = 1, ranged = false, depthScale = 1) {
    if (usesConsistentMount) {
      drawConsistentMount(ctx,drawAtlasFrame,{
        horse:mountAsset,rider:heroAssets.rider,x:screenX,y:baseY,
        height:mountLayout(depthScale).mountHeight,facing,alpha,frame,ranged,
        seatY:({guanyu:.53,zhaoyun:.60,caocao:.66,machao:.63})[heroId],
        moving:player.action==='run'||player.action==='dash',now:performance.now(),
      });
      return;
    }
    if (usesSeatedMountSheet) {
      const image = ranged && heroAssets.mountedBow ? heroAssets.mountedBow : heroAssets.mounted;
      drawAtlasFrame(ctx, image, frame, screenX, baseY, Math.min(430, height * .66) * depthScale, facing, alpha);
      return;
    }
    drawLayeredMount(screenX, baseY, facing, frame, alpha, ranged, depthScale, true);
  }

  function drawHorse(x, baseY, facing, mounted = false, frame = 0, alpha = 1, ranged = false) {
    const sx = x - cameraX, depthScale = 1 + (mounted ? player.lane : horse.lane) * .0014;
    if (mounted) drawMountedFigure(sx, baseY, facing, frame, alpha, ranged, depthScale);
    else drawLayeredMount(sx, baseY, facing, frame, alpha, false, depthScale, false);
  }

  function render(now) {
    ctx.save(); ctx.setTransform(dpr, 0, 0, dpr, 0, 0); ctx.translate(width * .5, height * .5); ctx.scale(cameraZoom, cameraZoom); ctx.translate(-width * .5, -height * .5); ctx.translate((Math.random() - 0.5) * shake, (Math.random() - 0.5) * shake * 0.55); drawBackground(); const floorY = ground(); drawAtmosphere(now, floorY, false);
    for (let i = 0; i < 18; i++) { const x = ((i * 337 - cameraX * 0.62) % (width + 300)) - 120; ctx.fillStyle = `rgba(28,20,13,${0.10 + (i % 3) * 0.025})`; ctx.fillRect(x, floorY + 28 + (i % 4) * 12, 90 + (i % 5) * 18, 3); }
    for (const prop of props) drawProp(prop, floorY, now);
    for (const ghost of afterimages) {
      const alpha = Math.max(0, ghost.life / ghost.max) * .32, ghostY = floorY + ghost.lane - ghost.y;
      ctx.save(); ctx.globalCompositeOperation = 'screen';
      if (ghost.mounted) drawMountedFigure(ghost.x - cameraX, ghostY, ghost.facing, ghost.frame, alpha, ghost.ranged, 1 + ghost.lane * .0014);
      else drawAtlasFrame(ctx, heroAssets.hero, ghost.frame, ghost.x - cameraX, ghostY, Math.min(320, height * .50) * (1 + ghost.lane * .0014), ghost.facing, alpha);
      ctx.restore();
    }
    const actors = enemies.map((enemy) => ({ kind: 'enemy', lane: enemy.lane, enemy }));
    actors.push({ kind: 'player', lane: player.lane });
    if (horse.active && !horse.mounted) actors.push({ kind: 'horse', lane: horse.lane });
    actors.sort((a, b) => a.lane - b.lane);
    for (const actor of actors) {
      if (actor.kind === 'player') {
        const baseY = floorY + player.lane;
        drawShadow(player.x, baseY + 4, player.mounted ? (isCloudMount ? .98 : isBoarMount ? 1.45 : 1.5) : 1.15, player.y ? 0.22 : (player.mounted ? (isCloudMount ? .24 : isBoarMount ? .40 : .48) : .48));
        const attacking = ['attack', 'heavy', 'musou', 'special', 'throw', 'grab', 'dash', 'whirlwind', 'counter', 'ranged', 'mountedThrust'].includes(player.action);
        const actionProgress = attacking ? Math.max(0, Math.min(1, (now - player.actionStarted) / Math.max(1, player.actionDuration))) : 0;
        let heroFrame = 0;
        if (player.action === 'ranged') heroFrame = actionProgress < .22 ? 0 : actionProgress < .38 ? 1 : actionProgress < .48 ? 2 : 3;
        else if (player.action === 'run') heroFrame = Math.floor(now / (player.mounted ? 105 : 135)) % 2;
        else if (player.action === 'counter') heroFrame = 2;
        else if (attacking) heroFrame = actionProgress < .28 ? 0 : actionProgress < .58 ? 2 : 3;
        const strideBob = player.action === 'run' ? Math.abs(Math.sin(now * (player.mounted ? .018 : .023))) * (player.mounted ? 5 : 4) : 0;
        const attackLunge = attacking && !['counter', 'ranged'].includes(player.action) ? Math.sin(Math.PI * actionProgress) * (player.mounted ? 22 : player.action === 'dash' ? 34 : 13) * player.facing : 0;
        // 활 모션 — 스프라이트 프레임만으론 밋밋하다. 시위를 당기는 동안
        // 몸이 뒤로 기울며 낮아지고, 놓는 순간(47%) 앞으로 튕겨 반동을 준다.
        let bowShift = 0, bowDip = 0;
        if (player.action === 'ranged') {
          if (actionProgress < .47) { const drawPull = actionProgress / .47; bowShift = -player.facing * (3 + 12 * drawPull); bowDip = 4 * drawPull; }
          else { const recoil = 1 - (actionProgress - .47) / .53; bowShift = player.facing * 14 * recoil; bowDip = 4 * recoil * .4; }
        }
        const flicker = now < player.invulnerableUntil && Math.floor(now / 55) % 2 ? 0.38 : 1;
        if (player.mounted) {
          // 전용 합성 시트에서는 활 반동으로 말 전체가 미끄러지지 않게 한다.
          const mountedBowShift = usesSeatedMountSheet || usesConsistentMount ? 0 : bowShift;
          const mountedBowDip = usesSeatedMountSheet || usesConsistentMount ? 0 : bowDip;
          drawHorse(player.x + attackLunge + mountedBowShift, baseY - strideBob + mountedBowDip, player.facing, true, heroFrame, flicker, player.action === 'ranged');
        }
        else drawAtlasFrame(ctx, player.action === 'ranged' && !rangedUsesBase ? heroAssets.heroBow : heroAssets.hero, heroFrame, player.x + attackLunge + bowShift - cameraX, baseY - player.y - strideBob + bowDip, Math.min(320, height * 0.50) * (1 + player.lane * .0014), player.facing, flicker);
        if (growth.weaponLevel >= 4) {
          const tier = growth.weaponLevel >= 16 ? 3 : growth.weaponLevel >= 10 ? 2 : 1;
          const pulse = .5 + Math.sin(now * .009) * .16, auraX = player.x - cameraX + player.facing * (player.mounted ? 76 : 54), auraY = baseY - player.y - (player.mounted ? 188 : 128);
          ctx.save(); ctx.globalCompositeOperation = 'lighter'; ctx.strokeStyle = combatProfile.hitColor; ctx.shadowColor = combatProfile.hitColor; ctx.shadowBlur = 12 + tier * 7;
          ctx.globalAlpha = (.10 + tier * .055) * pulse; ctx.lineWidth = 2 + tier;
          ctx.beginPath(); ctx.ellipse(auraX, auraY, 24 + tier * 7, 34 + tier * 9, now * .0015, 0, Math.PI * 2); ctx.stroke();
          if (attacking) {
            ctx.globalAlpha = .16 + tier * .07; ctx.lineWidth = 1.5 + tier * .7;
            for (let arc = 0; arc < tier; arc++) { ctx.beginPath(); ctx.arc(auraX, auraY, 34 + arc * 13 + Math.sin(now * .012 + arc) * 5, -.85, .85); ctx.stroke(); }
          }
          ctx.restore();
        }
        if (player.action === 'counter') {
          const guardPulse = .55 + Math.sin(now * .025) * .2, guardX = player.x - cameraX;
          ctx.save(); ctx.globalAlpha = guardPulse; ctx.strokeStyle = '#9ad6b6'; ctx.lineWidth = 5; ctx.beginPath(); ctx.arc(guardX, baseY - 112, 76, -.95, .95); ctx.stroke(); ctx.restore();
        }
        // 파초선은 손 앵커에 직접 고정하고, 같은 회전축에서 본체와 바람이 함께 움직인다.
        if (player.action === 'ranged') {
          const anchor = bowAnchor();
          const effectTint = heroId === 'wukong' ? '#8fe6a2' : combatProfile.arrowColor;
          const bowX = player.x + bowShift - cameraX + player.facing * anchor.fx;
          const bowY = baseY - player.y - anchor.height + bowDip;
          ctx.save(); ctx.translate(bowX, bowY); ctx.scale(player.facing, 1);
          if (rangedStyle === 'fan' && heroId === 'wukong') { ctx.globalCompositeOperation = 'source-over'; drawHeldFan(actionProgress); }
          ctx.globalCompositeOperation = 'lighter';
          if (rangedStyle === 'fan') {
            const fanProgress = Math.max(0, Math.min(1, actionProgress));
            if (fanProgress < .47) {
              const charge = fanProgress / .47;
              ctx.globalAlpha = .20 + charge * .52; ctx.shadowColor = effectTint; ctx.shadowBlur = 14 + charge * 26;
              ctx.strokeStyle = effectTint; ctx.lineWidth = 2.4 + charge * 2.6;
              ctx.beginPath(); ctx.arc(18, 0, 10 + charge * 26, 0, Math.PI * 2); ctx.stroke();
              for (let gust = 0; gust < 3; gust++) {
                ctx.globalAlpha = .16 + charge * .28; ctx.lineWidth = 1.5 + gust;
                ctx.beginPath(); ctx.arc(22, 0, 20 + gust * 12 + charge * 15, -.9 - gust * .08, .9 + gust * .08); ctx.stroke();
              }
            } else {
              const blast = 1 - Math.min(1, (fanProgress - .47) / .53);
              ctx.globalAlpha = blast * .78; ctx.shadowColor = effectTint; ctx.shadowBlur = 24;
              ctx.strokeStyle = '#f4edff'; ctx.lineWidth = 5 + blast * 6;
              for (let gust = 0; gust < 4; gust++) {
                const spread = .18 + gust * .16, reach = 92 + (1 - blast) * 120 + gust * 18;
                ctx.beginPath(); ctx.moveTo(10, 0); ctx.quadraticCurveTo(reach * .45, -spread * reach, reach, -spread * reach * .72); ctx.stroke();
                ctx.beginPath(); ctx.moveTo(10, 0); ctx.quadraticCurveTo(reach * .45, spread * reach, reach, spread * reach * .72); ctx.stroke();
              }
              ctx.globalAlpha = blast * .35; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(28 + (1 - blast) * 42, 0, 24 + (1 - blast) * 60, -1.04, 1.04); ctx.stroke();
              ctx.fillStyle = effectTint; ctx.globalAlpha = blast * .56; ctx.beginPath(); ctx.arc(12, 0, 9 + blast * 12, 0, Math.PI * 2); ctx.fill();
            }
          } else if (rangedStyle === 'ring') {
            const charge = Math.min(1, actionProgress / .47), release = actionProgress < .47 ? 0 : Math.min(1, (actionProgress - .47) / .28);
            ctx.shadowColor = effectTint; ctx.shadowBlur = 18 + charge * 22; ctx.strokeStyle = effectTint; ctx.lineWidth = 4;
            for (let ring = 0; ring < 2; ring++) {
              ctx.save(); ctx.translate(14 + ring * 12 + release * 86, (ring * 2 - 1) * (10 + release * 12)); ctx.rotate((now * .02 + ring * 1.7) * (ring ? -1 : 1));
              ctx.globalAlpha = actionProgress < .47 ? .38 + charge * .52 : Math.max(0, 1 - release) * .86;
              ctx.beginPath(); ctx.arc(0, 0, 15 + charge * 7, 0, Math.PI * 2); ctx.stroke();
              ctx.globalAlpha *= .72; ctx.strokeStyle = '#fff3bf'; ctx.beginPath(); ctx.arc(0, 0, 10 + charge * 5, -.8, 1.3); ctx.stroke(); ctx.restore();
            }
            if (release > 0) { ctx.globalAlpha = (1 - release) * .55; ctx.strokeStyle = effectTint; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(12, 0); ctx.lineTo(36 + release * 150, 0); ctx.stroke(); }
          } else if (rangedStyle === 'lasso') {
            const charge = Math.min(1, actionProgress / .47), release = actionProgress < .47 ? 0 : Math.min(1, (actionProgress - .47) / .32);
            ctx.shadowColor = effectTint; ctx.shadowBlur = 15 + charge * 20; ctx.strokeStyle = effectTint; ctx.lineWidth = 4;
            ctx.globalAlpha = actionProgress < .47 ? .34 + charge * .55 : Math.max(0, 1 - release) * .92;
            ctx.beginPath(); ctx.ellipse(22 + release * 78, -5, 18 + charge * 12 + release * 24, 26 + charge * 8, -.28, 0, Math.PI * 2); ctx.stroke();
            ctx.lineWidth = 2.4; ctx.beginPath(); ctx.moveTo(2, 14); ctx.bezierCurveTo(42 + release * 55, 38, 74 + release * 92, -34, 116 + release * 150, 0); ctx.stroke();
            if (release > 0) { ctx.globalAlpha *= .55; ctx.lineWidth = 8; ctx.beginPath(); ctx.moveTo(22, 0); ctx.lineTo(98 + release * 120, 0); ctx.stroke(); }
          } else {
            const arrowTint = combatProfile.arrowColor;
            if (actionProgress < .47) {
              const charge = actionProgress / .47;
              ctx.globalAlpha = .28 + charge * .55; ctx.shadowColor = arrowTint; ctx.shadowBlur = 12 + charge * 20;
              ctx.fillStyle = arrowTint; ctx.beginPath(); ctx.arc(14, 0, 3 + charge * 9, 0, Math.PI * 2); ctx.fill();
              ctx.globalAlpha = .34 + charge * .40; ctx.strokeStyle = arrowTint; ctx.lineWidth = 1.6 + charge * 1.6;
              ctx.beginPath(); ctx.moveTo(14, -34 - charge * 12); ctx.lineTo(14 - charge * 20, 0); ctx.lineTo(14, 34 + charge * 12); ctx.stroke();
            } else {
              const flash = 1 - (actionProgress - .47) / .30;
              if (flash > 0) {
                ctx.globalAlpha = flash * .8; ctx.shadowColor = arrowTint; ctx.shadowBlur = 26;
                ctx.strokeStyle = arrowTint; ctx.lineWidth = 3 + flash * 4;
                ctx.beginPath(); ctx.moveTo(10, 0); ctx.lineTo(10 + (1 - flash) * 120, 0); ctx.stroke();
                ctx.globalAlpha = flash * .55; ctx.beginPath(); ctx.arc(16, 0, 10 + (1 - flash) * 34, 0, Math.PI * 2); ctx.stroke();
              }
            }
          }
          ctx.restore();
        }
      } else if (actor.kind === 'horse') {
        drawShadow(horse.x, floorY + horse.lane + 5, isCloudMount ? 1.18 : isBoarMount ? 1.42 : isWaterMount ? 1.48 : 1.55, isCloudMount ? .18 : isBoarMount ? .38 : isWaterMount ? .42 : .46); drawHorse(horse.x, floorY + horse.lane, horse.facing || 1, false, Math.floor(now / (isCloudMount ? 360 : isBoarMount ? 280 : isWaterMount ? 330 : 420)) % 2, 1);
      } else {
        const enemy = actor.enemy, sinceDeath = enemy.deadAt ? (now - enemy.deadAt) / 700 : 0; if (sinceDeath >= 1) continue;
        const baseY = floorY + enemy.lane; drawShadow(enemy.x, baseY + 5, enemy.boss ? 1.48 : enemy.role === 'heavy' ? 1.05 : .9, 0.40 * (1 - sinceDeath));
        // 부장 지휘권: 부장 발밑 넓은 군기 원 + 지휘받는 병사 발밑 작은 고리.
        // '부장 먼저'가 눈으로 읽혀야 우선순위 선택이 게임플레이가 된다.
        if (!enemy.deadAt && enemy.boss && !enemy.trueBoss) {
          ctx.save(); ctx.globalCompositeOperation = 'screen'; ctx.globalAlpha = .20 + Math.sin(now * .004) * .07;
          ctx.strokeStyle = bossProfile.glow; ctx.lineWidth = 3; ctx.setLineDash([16, 22]); ctx.lineDashOffset = -now * .04;
          ctx.beginPath(); ctx.ellipse(enemy.x - cameraX, baseY + 5, 190, 44, 0, 0, Math.PI * 2); ctx.stroke(); ctx.setLineDash([]); ctx.restore();
        } else if (enemy.rallied) {
          ctx.save(); ctx.globalCompositeOperation = 'screen'; ctx.globalAlpha = .26 + Math.sin(now * .008 + enemy.x) * .10;
          ctx.strokeStyle = enemyRoster.accent; ctx.lineWidth = 2;
          ctx.beginPath(); ctx.ellipse(enemy.x - cameraX, baseY + 5, 52, 13, 0, 0, Math.PI * 2); ctx.stroke(); ctx.restore();
        }
        const enemyAttackProgress = enemy.action === 'attack' ? Math.max(0, Math.min(1, 1 - (enemy.actionUntil - now) / Math.max(1, enemy.actionDuration || 430))) : 0;
        const frame = enemy.hitUntil > now || enemy.deadAt || enemy.grabbed ? 3 : enemy.action === 'run' ? Math.floor((now + enemy.x * 2.7) / 150) % 2 : enemy.action === 'attack' ? (enemyAttackProgress < .5 ? 2 : 3) : 0;
        const enemyBob = enemy.action === 'run' ? Math.abs(Math.sin((now + enemy.x) * .019)) * 3 : 0;
        const hitRecoil = enemy.hitUntil > now ? Math.sin(Math.min(1, (enemy.hitUntil - now) / 290) * Math.PI) * 22 : 0;
        const enemyX = enemy.x - cameraX + (enemy.action === 'attack' ? Math.sin(Math.PI * enemyAttackProgress) * (enemy.boss ? 18 : 8) * enemy.facing : 0) - hitRecoil * enemy.facing, depthScale = 1 + enemy.lane * .0014;
        // 발밑의 커다란 삼각 공격 범위 표시는 캐릭터 그림을 가려 제거했다.
        // 궁수의 활시위 충전 표시는 몸 위에만 작게 남겨 원거리 공격은 읽히게 한다.
        if (enemy.action === 'attack' && enemy.actionUntil > now && enemy.role === 'archer') {
          const warning = Math.max(0, Math.min(1, 1 - (enemy.actionUntil - now) / Math.max(1, enemy.actionDuration || 430))), charge = Math.min(1, warning * 1.45);
          ctx.save(); ctx.translate(enemyX, baseY + 5); ctx.scale(enemy.facing, 1); ctx.globalCompositeOperation = 'lighter'; ctx.globalAlpha = .45 + charge * .45; ctx.strokeStyle = '#ff8074'; ctx.lineWidth = 3; ctx.beginPath(); ctx.arc(52, -88, 22 + charge * 7, -1.15, 1.15); ctx.stroke(); ctx.beginPath(); ctx.moveTo(52, -88); ctx.lineTo(52 + 46 * charge, -88); ctx.stroke(); ctx.restore();
        }
        if (enemy.hitUntil > now && !enemy.deadAt) { const hitAlpha = .16 + Math.sin((enemy.hitUntil - now) * .045) * .10; ctx.save(); ctx.globalCompositeOperation = 'screen'; ctx.globalAlpha = hitAlpha; ctx.fillStyle = enemy.role === 'archer' ? '#ffb27c' : '#fff4d6'; ctx.beginPath(); ctx.ellipse(enemyX, baseY - 138, enemy.boss ? 112 : 74, enemy.boss ? 174 : 116, 0, 0, Math.PI * 2); ctx.fill(); ctx.restore(); }
        if (enemy.boss && !enemy.deadAt) {
          const pulse = (enemy.enraged ? 1.02 : .72) + Math.sin(now * .008) * .14;
          // 보스마다 오라 색도 다르다. 우마왕은 화염 주홍, 이랑진군은 천광,
          // 고구는 금빛 군기, 육겸은 차가운 청색으로 읽힌다.
          ctx.save(); ctx.globalCompositeOperation = 'screen';
          const aura = ctx.createRadialGradient(enemyX, baseY - 170, 10, enemyX, baseY - 170, 205);
          aura.addColorStop(0, bossProfile.glow); aura.addColorStop(.58, bossProfile.glow); aura.addColorStop(1, 'rgba(0,0,0,0)');
          ctx.globalAlpha = pulse * .16; ctx.fillStyle = aura; ctx.fillRect(enemyX - 220, baseY - 390, 440, 440);
          ctx.globalAlpha = pulse * .34; ctx.strokeStyle = bossProfile.glow; ctx.lineWidth = 3; ctx.shadowColor = bossProfile.glow; ctx.shadowBlur = 18;
          ctx.beginPath(); ctx.ellipse(enemyX, baseY - 162, 132 + Math.sin(now * .006) * 8, 194 + Math.sin(now * .006) * 12, 0, 0, Math.PI * 2); ctx.stroke();
          ctx.restore();
        }
        ctx.save();
        if (enemy.deadAt) {
          // 쓰러지며 뒤로 밀려나고, 넘어가는 순간 몸이 살짝 눌린다.
          const fall = 1 - Math.pow(1 - Math.min(1, sinceDeath * 1.35), 3);
          ctx.translate(enemyX, baseY);
          ctx.rotate(-enemy.facing * fall * 1.08);
          ctx.scale(1 + fall * .06, 1 - fall * .12);
          ctx.translate(-enemyX, -baseY + fall * 42);
        }
        const enemyHeight = enemy.boss ? Math.min(448, height * .67) : enemy.role === 'heavy' ? Math.min(328, height * .51) : Math.min(300, height * .47);
        drawAtlasFrame(ctx, enemy.boss ? bossSheet : (enemySheets[enemy.role] || enemySheet), frame, enemyX, baseY - enemyBob, enemyHeight * depthScale, enemy.facing, 1 - sinceDeath);
        // 맞은 직후 흰 섬광 — 어느 적을 때렸는지 난전에서 즉시 읽힌다.
        if (!enemy.deadAt && enemy.hitUntil > now) {
          const flash = Math.min(1, (enemy.hitUntil - now) / 200);
          if (flash > .02) {
            ctx.save(); ctx.globalCompositeOperation = 'lighter'; ctx.globalAlpha = flash * .5;
            drawAtlasFrame(ctx, enemy.boss ? bossSheet : (enemySheets[enemy.role] || enemySheet), frame, enemyX, baseY - enemyBob, enemyHeight * depthScale, enemy.facing, 1);
            ctx.restore();
          }
        }
        ctx.restore();
        // 이름난 적장은 공통 스프라이트 위에 소설 속 무기·상징을 얹어
        // 화웅, 우마왕, 이랑진군, 고구, 육겸이 서로 다른 장수로 읽히게 한다.
        if (enemy.boss && !enemy.deadAt && !dedicatedBossArt) {
          const swing = enemy.action === 'attack' ? Math.sin(Math.PI * enemyAttackProgress) : 0;
          const weaponY = baseY - enemyBob - 172;
          ctx.save(); ctx.translate(enemyX + enemy.facing * 22, weaponY); ctx.scale(enemy.facing, 1); ctx.rotate(-.18 + swing * .62);
          ctx.lineCap = 'round'; ctx.lineJoin = 'round';
          ctx.shadowColor = bossProfile.glow; ctx.shadowBlur = enemy.action === 'attack' ? 18 : 8;
          if (bossProfile.kind === 'bull') {
            ctx.strokeStyle = '#2b1a17'; ctx.lineWidth = 14; ctx.beginPath(); ctx.moveTo(-12, 30); ctx.lineTo(126, -42); ctx.stroke();
            ctx.strokeStyle = '#d7a65a'; ctx.lineWidth = 8; ctx.beginPath(); ctx.moveTo(102, -54); ctx.lineTo(142, -43); ctx.lineTo(108, -28); ctx.stroke();
          } else if (bossProfile.kind === 'celestial') {
            ctx.strokeStyle = '#dbeeff'; ctx.lineWidth = 6; ctx.beginPath(); ctx.moveTo(-8, 34); ctx.lineTo(130, -64); ctx.stroke();
            ctx.strokeStyle = '#8fc8ff'; ctx.lineWidth = 4; ctx.beginPath(); ctx.moveTo(112, -78); ctx.lineTo(140, -60); ctx.lineTo(112, -44); ctx.stroke();
          } else if (bossProfile.kind === 'marshal') {
            ctx.strokeStyle = '#6e4525'; ctx.lineWidth = 7; ctx.beginPath(); ctx.moveTo(0, 34); ctx.lineTo(112, -62); ctx.stroke();
            ctx.fillStyle = '#e8bc62'; ctx.globalAlpha = .9; ctx.beginPath(); ctx.moveTo(74, -80); ctx.lineTo(138, -64); ctx.lineTo(126, -22); ctx.lineTo(77, -35); ctx.closePath(); ctx.fill();
          } else if (bossProfile.kind === 'betrayer') {
            ctx.strokeStyle = '#9fbfff'; ctx.lineWidth = 5; ctx.beginPath(); ctx.moveTo(6, 14); ctx.lineTo(76, -64); ctx.moveTo(12, 28); ctx.lineTo(92, -38); ctx.stroke();
            ctx.strokeStyle = '#f2f7ff'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(72, -68); ctx.lineTo(98, -78); ctx.moveTo(88, -42); ctx.lineTo(112, -50); ctx.stroke();
          } else if (bossProfile.kind === 'fan') {
            ctx.strokeStyle = '#74462b'; ctx.lineWidth = 5; ctx.beginPath(); ctx.moveTo(5, 26); ctx.lineTo(42, -24); ctx.stroke();
            ctx.strokeStyle = bossProfile.glow; ctx.lineWidth = 3; for (let feather = 0; feather < 5; feather++) { const fy = -64 + feather * 9; ctx.beginPath(); ctx.moveTo(34, -18); ctx.quadraticCurveTo(62, fy - 14, 108, fy); ctx.stroke(); }
          } else if (bossProfile.kind === 'staff') {
            ctx.strokeStyle = '#5c3921'; ctx.lineWidth = 9; ctx.beginPath(); ctx.moveTo(-8, 30); ctx.lineTo(104, -72); ctx.stroke();
            ctx.strokeStyle = bossProfile.glow; ctx.lineWidth = 3; ctx.beginPath(); ctx.arc(112, -78, 15, 0, Math.PI * 2); ctx.stroke();
          } else if (bossProfile.kind === 'axe') {
            ctx.strokeStyle = '#513421'; ctx.lineWidth = 8; ctx.beginPath(); ctx.moveTo(-4, 28); ctx.lineTo(82, -58); ctx.stroke();
            ctx.fillStyle = bossProfile.glow; ctx.beginPath(); ctx.moveTo(72, -78); ctx.lineTo(126, -62); ctx.lineTo(112, -20); ctx.lineTo(80, -36); ctx.closePath(); ctx.fill();
          } else {
            ctx.strokeStyle = '#4b2b20'; ctx.lineWidth = 6; ctx.beginPath(); ctx.moveTo(-5, 30); ctx.lineTo(118, -60); ctx.stroke();
            ctx.strokeStyle = bossProfile.glow; ctx.lineWidth = 4; ctx.beginPath(); ctx.moveTo(94, -76); ctx.lineTo(136, -60); ctx.lineTo(98, -44); ctx.stroke();
          }
          ctx.restore();
          const crownY = baseY - enemyBob - 300;
          ctx.save(); ctx.translate(enemyX, crownY); ctx.scale(enemy.facing, 1); ctx.globalCompositeOperation = 'lighter'; ctx.strokeStyle = bossProfile.glow; ctx.fillStyle = bossProfile.glow; ctx.shadowColor = bossProfile.glow; ctx.shadowBlur = 12;
          if (bossProfile.kind === 'bull') {
            ctx.lineWidth = 9; ctx.beginPath(); ctx.arc(-46, 18, 46, Math.PI * .90, Math.PI * 1.78); ctx.arc(46, 18, 46, Math.PI * 1.22, Math.PI * 2.10); ctx.stroke();
            ctx.lineWidth = 3; ctx.beginPath(); ctx.arc(0, 32, 12, 0, Math.PI * 2); ctx.stroke();
          } else if (bossProfile.kind === 'celestial') {
            ctx.beginPath(); ctx.moveTo(0, -4); ctx.lineTo(-11, 18); ctx.lineTo(0, 30); ctx.lineTo(11, 18); ctx.closePath(); ctx.fill();
            ctx.lineWidth = 3; ctx.beginPath(); ctx.arc(0, 16, 34, Math.PI * 1.18, Math.PI * 1.82); ctx.stroke();
          } else if (bossProfile.kind === 'marshal') {
            ctx.lineWidth = 5; ctx.beginPath(); ctx.moveTo(-34, 18); ctx.lineTo(0, -12); ctx.lineTo(34, 18); ctx.stroke();
          } else if (bossProfile.kind === 'betrayer') {
            ctx.lineWidth = 3; ctx.beginPath(); ctx.arc(0, 17, 34, Math.PI * 1.08, Math.PI * 1.92); ctx.stroke();
          }
          ctx.restore();
        }
        if (enemy.role === 'archer' && !enemy.deadAt) {
          const bowY = baseY - enemyBob - (enemy.boss ? 182 : 138);
          ctx.save(); ctx.translate(enemyX + enemy.facing * 18, bowY); ctx.scale(enemy.facing, 1); ctx.rotate(enemy.action === 'attack' ? -.12 + enemyAttackProgress * .24 : -.24); ctx.strokeStyle = '#9b5e2b'; ctx.lineWidth = 4; ctx.lineCap = 'round'; ctx.beginPath(); ctx.moveTo(8, -28); ctx.quadraticCurveTo(34, 0, 8, 28); ctx.stroke(); ctx.strokeStyle = '#ead9b7'; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.moveTo(8, -28); ctx.lineTo(8 - (enemy.action === 'attack' ? enemyAttackProgress * 22 : 0), 0); ctx.lineTo(8, 28); ctx.stroke(); if (enemy.action === 'attack') { ctx.strokeStyle = '#efc889'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(8 - enemyAttackProgress * 22, 0); ctx.lineTo(54, 0); ctx.stroke(); } ctx.restore();
        }
        if (!enemy.boss && !enemy.deadAt && enemy.role !== 'archer') {
          const weaponY = baseY - enemyBob - (enemy.role === 'heavy' ? 154 : 134), swing = enemy.action === 'attack' ? Math.sin(Math.PI * enemyAttackProgress) : 0;
          ctx.save(); ctx.translate(enemyX + enemy.facing * 18, weaponY); ctx.scale(enemy.facing, 1); ctx.rotate(-.18 + swing * .46);
          ctx.lineCap = 'round'; ctx.lineJoin = 'round';
          const weaponColor = enemy.accent || '#e7d4ae';
          if (enemy.weapon === 'spear' || enemy.weapon === 'halberd') {
            ctx.strokeStyle = '#4a2b1c'; ctx.lineWidth = 6; ctx.beginPath(); ctx.moveTo(-8, 22); ctx.lineTo(112, -18); ctx.stroke();
            ctx.strokeStyle = weaponColor; ctx.lineWidth = enemy.weapon === 'halberd' ? 10 : 5; ctx.beginPath(); ctx.moveTo(72, -31); ctx.lineTo(130, -18); ctx.lineTo(72, -5); ctx.stroke();
          } else if (enemy.weapon === 'axe') {
            ctx.strokeStyle = '#513421'; ctx.lineWidth = 7; ctx.beginPath(); ctx.moveTo(-6, 24); ctx.lineTo(76, -54); ctx.stroke();
            ctx.fillStyle = weaponColor; ctx.beginPath(); ctx.moveTo(62, -68); ctx.lineTo(104, -56); ctx.lineTo(90, -20); ctx.lineTo(70, -34); ctx.closePath(); ctx.fill();
          } else if (enemy.weapon === 'club' || enemy.weapon === 'staff') {
            ctx.strokeStyle = enemy.weapon === 'staff' ? '#8e663e' : '#453029'; ctx.lineWidth = enemy.weapon === 'club' ? 15 : 8; ctx.beginPath(); ctx.moveTo(0, 24); ctx.lineTo(86, -48); ctx.stroke();
            ctx.strokeStyle = weaponColor; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(70, -60); ctx.lineTo(96, -38); ctx.stroke();
          } else {
            ctx.strokeStyle = '#493027'; ctx.lineWidth = 5; ctx.beginPath(); ctx.moveTo(8, 20); ctx.lineTo(72, -56); ctx.stroke();
            ctx.strokeStyle = weaponColor; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(60, -66); ctx.lineTo(88, -48); ctx.stroke();
          }
          ctx.restore();
        }
        if (!enemy.boss && !enemy.deadAt && enemy.role !== 'soldier') {
          const labelX = enemy.x - cameraX, labelY = baseY - Math.min(270, height * .43);
          ctx.save(); ctx.globalAlpha = enemy.role === 'archer' ? .82 : .92; ctx.font = `700 12px ${CANVAS_UI_FONT}`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
          ctx.fillStyle = 'rgba(18,10,8,.72)'; ctx.fillRect(labelX - 62, labelY - 11, 124, 22);
          ctx.strokeStyle = enemy.accent || '#d7b17a'; ctx.lineWidth = 1; ctx.strokeRect(labelX - 62, labelY - 11, 124, 22);
          ctx.fillStyle = '#fff1d0'; ctx.fillText(enemy.unitName || enemy.role, labelX, labelY); ctx.restore();
        }
        if (!enemy.boss && !enemy.deadAt && enemy.hp < enemy.maxHp) {
          const x = Math.round(enemy.x - cameraX), y = Math.round(baseY - Math.min(246, height * .40)), ratio = Math.max(0, Math.min(1, enemy.hp / enemy.maxHp));
          const barColor = enemy.role === 'archer' ? '#ee8260' : enemy.role === 'heavy' ? '#e2b65e' : '#e45b4d';
          ctx.save(); ctx.globalAlpha = .94;
          ctx.fillStyle = 'rgba(8,5,6,.88)'; ctx.fillRect(x - 43, y - 3, 86, 9);
          ctx.strokeStyle = 'rgba(255,230,185,.32)'; ctx.lineWidth = 1; ctx.strokeRect(x - 43.5, y - 3.5, 87, 10);
          ctx.fillStyle = barColor; ctx.fillRect(x - 40, y - 1, 80 * ratio, 5);
          ctx.fillStyle = 'rgba(255,246,214,.42)'; ctx.fillRect(x - 40, y - 1, 80 * ratio, 1);
          ctx.restore();
        }
      }
    }
    // 보스 충격파 — 땅을 가르며 달리는 균열+불꽃 마루. 점프 회피 대상이
    // 명확히 보여야 하므로 바닥에 붙여 크고 밝게 그린다.
    for (const sw of shockwaves) {
      const x = sw.x - cameraX, y = floorY + sw.lane, fade = Math.min(1, sw.life / .4);
      ctx.save(); ctx.globalCompositeOperation = 'lighter'; ctx.globalAlpha = fade;
      const crest = ctx.createLinearGradient(x, y - 74, x, y + 6);
      crest.addColorStop(0, 'rgba(255,255,255,0)'); crest.addColorStop(.55, sw.color); crest.addColorStop(1, 'rgba(120,30,8,.55)');
      ctx.fillStyle = crest;
      ctx.beginPath(); ctx.moveTo(x - 54 * sw.dir, y + 4);
      ctx.quadraticCurveTo(x - 8 * sw.dir, y - 78, x + 34 * sw.dir, y - 30);
      ctx.quadraticCurveTo(x + 52 * sw.dir, y - 8, x + 58 * sw.dir, y + 4); ctx.closePath(); ctx.fill();
      ctx.strokeStyle = '#fff3d2'; ctx.lineWidth = 3; ctx.lineCap = 'round';
      ctx.beginPath(); ctx.moveTo(x - 40 * sw.dir, y + 2); ctx.quadraticCurveTo(x, y - 62, x + 40 * sw.dir, y - 16); ctx.stroke();
      ctx.globalAlpha = fade * .5; ctx.strokeStyle = sw.color; ctx.lineWidth = 2;
      for (let c = 1; c <= 3; c++) { ctx.beginPath(); ctx.moveTo(x - sw.dir * (58 + c * 34), y + 3); ctx.lineTo(x - sw.dir * (30 + c * 34), y + 3 - c * 2); ctx.stroke(); }
      ctx.restore();
    }
    for (const arrow of [...arrows, ...enemyArrows]) {
      const x = arrow.x - cameraX, y = floorY + arrow.lane - arrow.height, angle = Math.atan2(-arrow.vz, Math.abs(arrow.vx)), dir = Math.sign(arrow.vx);
      ctx.save(); ctx.translate(x, y); ctx.scale(dir, 1); ctx.rotate(angle); ctx.lineCap = 'round';
      ctx.globalCompositeOperation = 'lighter'; ctx.shadowColor = arrow.color; ctx.shadowBlur = 14;
      if (arrow.kind === 'fan') {
        const gustPhase = now * .014 + arrow.phase;
        ctx.globalAlpha = .16; ctx.strokeStyle = arrow.color; ctx.lineWidth = 30; ctx.shadowBlur = 28;
        ctx.beginPath(); ctx.moveTo(-170, 0); ctx.lineTo(-12, 0); ctx.stroke();
        ctx.globalAlpha = .80; ctx.strokeStyle = '#f6efff'; ctx.lineWidth = 5;
        for (let blade = 0; blade < 5; blade++) {
          const spread = .18 + blade * .13, reach = 78 + blade * 20;
          ctx.beginPath(); ctx.moveTo(6, 0); ctx.quadraticCurveTo(reach * .42, Math.sin(gustPhase + blade) * 14 - spread * reach, reach, -spread * reach * .68); ctx.stroke();
          ctx.beginPath(); ctx.moveTo(6, 0); ctx.quadraticCurveTo(reach * .42, Math.cos(gustPhase + blade) * 14 + spread * reach, reach, spread * reach * .68); ctx.stroke();
        }
        ctx.globalAlpha = .38; ctx.strokeStyle = '#b59cff'; ctx.lineWidth = 2;
        for (let ring = 0; ring < 3; ring++) { ctx.beginPath(); ctx.arc(26 + ring * 18, 0, 24 + ring * 16, -1.06, 1.06); ctx.stroke(); }
        ctx.restore(); continue;
      }
      if (arrow.kind === 'ring') {
        const spin = now * .022 + arrow.phase;
        ctx.globalAlpha = .22; ctx.strokeStyle = arrow.color; ctx.lineWidth = 18; ctx.beginPath(); ctx.moveTo(-150, 0); ctx.lineTo(-18, 0); ctx.stroke();
        for (let ring = 0; ring < 2; ring++) {
          ctx.save(); ctx.translate(-ring * 24, (ring * 2 - 1) * 10); ctx.rotate(spin * (ring ? -1 : 1));
          ctx.globalAlpha = .92; ctx.strokeStyle = ring ? '#fff1bd' : arrow.color; ctx.lineWidth = ring ? 4 : 7; ctx.shadowBlur = 22;
          ctx.beginPath(); ctx.ellipse(0, 0, 24, 12, .25, 0, Math.PI * 2); ctx.stroke();
          ctx.globalAlpha = .48; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(0, 0, 30, -.7, 1.15); ctx.stroke(); ctx.restore();
        }
        ctx.restore(); continue;
      }
      if (arrow.kind === 'lasso') {
        const wave = Math.sin(now * .021 + arrow.phase);
        ctx.globalAlpha = .24; ctx.strokeStyle = arrow.color; ctx.lineWidth = 16; ctx.beginPath(); ctx.moveTo(-180, 0); ctx.lineTo(-18, 0); ctx.stroke();
        ctx.globalAlpha = .92; ctx.strokeStyle = '#ffb0be'; ctx.lineWidth = 4; ctx.shadowBlur = 20;
        ctx.beginPath(); ctx.ellipse(16, 0, 34 + wave * 5, 21 - wave * 3, -.18, 0, Math.PI * 2); ctx.stroke();
        ctx.strokeStyle = arrow.color; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(-162, 0);
        for (let step = 1; step <= 8; step++) { const px = -162 + step * 22, py = Math.sin(arrow.phase + now * .025 + step * .85) * 10; ctx.lineTo(px, py); }
        ctx.stroke(); ctx.restore(); continue;
      }
      const trail = ctx.createLinearGradient(-190, 0, -8, 0); trail.addColorStop(0, 'rgba(90,220,255,0)'); trail.addColorStop(.55, arrow.color); trail.addColorStop(1, '#ffffff');
      ctx.globalAlpha = .17; ctx.strokeStyle = arrow.color; ctx.lineWidth = 18; ctx.beginPath(); ctx.moveTo(-185, 0); ctx.lineTo(-12, 0); ctx.stroke();
      ctx.globalAlpha = .74; ctx.strokeStyle = trail; ctx.lineWidth = 6; ctx.beginPath(); ctx.moveTo(-175, 0); ctx.lineTo(-8, 0); ctx.stroke();
      ctx.globalAlpha = .9; ctx.strokeStyle = '#edffff'; ctx.lineWidth = 1.8; ctx.stroke();
      for (let spiral = 0; spiral < 2; spiral++) {
        ctx.globalAlpha = .46 - spiral * .12; ctx.strokeStyle = spiral === 1 ? '#ffffff' : arrow.color; ctx.lineWidth = 1.7; ctx.beginPath();
        for (let step = 0; step <= 7; step++) { const px = -165 + step * 22, wave = Math.sin(arrow.phase + now * .018 + step * .86 + spiral * 2.1) * (7 + spiral * 3); if (!step) ctx.moveTo(px, wave); else ctx.lineTo(px, wave); }
        ctx.stroke();
      }
      ctx.globalCompositeOperation = 'source-over'; ctx.shadowBlur = 5; ctx.globalAlpha = 1; ctx.strokeStyle = '#5a351c'; ctx.lineWidth = 4.5; ctx.beginPath(); ctx.moveTo(-27, 0); ctx.lineTo(25, 0); ctx.stroke();
      ctx.fillStyle = '#f1f5ef'; ctx.beginPath(); ctx.moveTo(37, 0); ctx.lineTo(20, -8); ctx.lineTo(22, 0); ctx.lineTo(20, 8); ctx.closePath(); ctx.fill();
      ctx.strokeStyle = '#b94732'; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(-23, 0); ctx.lineTo(-35, -9); ctx.moveTo(-23, 0); ctx.lineTo(-35, 9); ctx.stroke(); ctx.restore();
    }
    for (const effect of effects) {
      const t = 1 - effect.life / effect.max, x = effect.x - cameraX;
      const radius = ((effect.kind === 'rake' ? 166 : effect.kind === 'wide' ? 188 : effect.kind === 'spin' ? 176 : effect.heavy ? 170 : 142) + effect.layer * 18) * (effect.scale || 1);
      const starts = { sweep: -1.62, reverse: .65, wide: -2.35, overhead: -2.75, spin: -2.65, rake: -1.12 }, spans = { sweep: 2.18, reverse: -2.1, wide: 3.45, overhead: 2.85, spin: effect.musou ? 5.7 : 4.75, rake: 1.02 };
      const start = (starts[effect.kind] ?? -1.24) + effect.layer * .1, sweep = (spans[effect.kind] ?? 2.5) * (1 - Math.pow(1 - Math.min(1, t * 1.18), 3));
      const alpha = Math.sin(Math.PI * Math.min(1, t * 1.12)) * (effect.musou ? .96 : effect.heavy ? .9 : .8);
      const [deep, main, core] = effect.palette || ['#123342', '#5cdcff', '#ffffff'];
      ctx.save(); ctx.translate(Math.round(x), Math.round(effect.y)); ctx.scale(effect.facing, 1); ctx.lineCap = 'round'; ctx.lineJoin = 'round';
      if (effect.kind === 'thrust') {
        const reach = 80 + Math.min(1, t * 2.35) * 335, beam = ctx.createLinearGradient(-70, 0, reach, 0); beam.addColorStop(0, deep); beam.addColorStop(.55, main); beam.addColorStop(1, core);
        ctx.globalCompositeOperation = 'lighter'; ctx.shadowColor = main; ctx.shadowBlur = q() > .7 ? 16 : 0;
        const taper = 7 + (1 - Math.min(1, t * 1.55)) * 7;
        ctx.globalAlpha = alpha * .34; ctx.fillStyle = beam; ctx.beginPath(); ctx.moveTo(-68, -taper * .34); ctx.lineTo(reach, 0); ctx.lineTo(-68, taper * .34); ctx.closePath(); ctx.fill();
        ctx.globalAlpha = alpha * .72; ctx.strokeStyle = beam; ctx.lineWidth = taper; ctx.beginPath(); ctx.moveTo(-62, 0); ctx.lineTo(reach, 0); ctx.stroke();
        ctx.globalAlpha = alpha * .9; ctx.strokeStyle = core; ctx.lineWidth = 2.2; ctx.beginPath(); ctx.moveTo(-58, 0); ctx.lineTo(reach + 10, 0); ctx.stroke();
        ctx.globalAlpha = alpha * .82; ctx.fillStyle = core; ctx.beginPath(); ctx.moveTo(reach + 14, 0); ctx.lineTo(reach - 10, -7); ctx.lineTo(reach - 2, 0); ctx.lineTo(reach - 10, 7); ctx.closePath(); ctx.fill();
        ctx.shadowBlur = 16;
        for (let bolt = 0; bolt < 3; bolt++) { const by = (bolt - 1) * 10, phase = effect.seed + bolt * 1.7; ctx.globalAlpha = alpha * .48; ctx.strokeStyle = bolt % 2 ? core : main; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.moveTo(16, by); for (let step = 1; step <= 7; step++) ctx.lineTo(16 + (reach - 16) * step / 7, by + Math.sin(phase + step * 2.3) * 8); ctx.stroke(); }
        ctx.globalAlpha = alpha * (1 - t) * .7; ctx.strokeStyle = core; ctx.lineWidth = 5; ctx.beginPath(); ctx.arc(15, 0, 28 + t * 70, 0, Math.PI * 2); ctx.stroke(); ctx.restore(); continue;
      }
      if (effect.kind === 'rake') {
        const reach = 92 + Math.min(1, t * 2.1) * 252;
        ctx.globalCompositeOperation = 'lighter'; ctx.shadowColor = main; ctx.shadowBlur = q() > .7 ? 22 : 0;
        for (let claw = 0; claw < 3; claw++) {
          const offset = (claw - 1) * 26, tilt = (claw - 1) * 8;
          ctx.globalAlpha = alpha * (.62 + claw * .10); ctx.strokeStyle = claw === 1 ? core : main; ctx.lineWidth = 11 - claw * 1.5;
          ctx.beginPath(); ctx.moveTo(-28, offset + 30); ctx.lineTo(reach, offset - 42 + tilt); ctx.stroke();
          ctx.globalAlpha = alpha * .68; ctx.strokeStyle = core; ctx.lineWidth = 2.5;
          ctx.beginPath(); ctx.moveTo(-20, offset + 27); ctx.lineTo(reach + 12, offset - 40 + tilt); ctx.stroke();
        }
        ctx.globalAlpha = alpha * (1 - t) * .78; ctx.strokeStyle = core; ctx.lineWidth = 5;
        ctx.beginPath(); ctx.ellipse(reach * .56, 46, 58 + t * 100, 13 + t * 18, 0, 0, Math.PI * 2); ctx.stroke();
        ctx.restore(); continue;
      }
      // shadowBlur 는 비싸다 — 품질이 떨어지면 제일 먼저 끈다('lighter' 합성만으로도 발광은 산다).
      ctx.globalCompositeOperation = 'lighter'; ctx.shadowColor = main; ctx.shadowBlur = q() > .7 ? (effect.musou ? 34 : 24) : 0;
      // 균일한 두께의 호는 "굵은 선"으로 읽힌다. 실제 칼자국은 칼이 가장
      // 빠른 중간이 두껍고 시작·끝으로 갈수록 뾰족하게 사라진다 — 안쪽/바깥쪽
      // 반지름을 따로 흔들어 초승달 리본을 만든다.
      const ribbon = (widthScale, fillStyle, a, radialShift = 0) => {
        const steps = 26, peak = (effect.heavy ? 21 : 16) * widthScale;
        ctx.globalAlpha = a; ctx.fillStyle = fillStyle;
        ctx.beginPath();
        for (let s = 0; s <= steps; s++) {
          const k = s / steps, angle = start + sweep * k;
          const taper = Math.pow(Math.sin(Math.PI * k), .62);
          const r = radius + radialShift + taper * peak;
          const px = Math.cos(angle) * r, py = Math.sin(angle) * r;
          s === 0 ? ctx.moveTo(px, py) : ctx.lineTo(px, py);
        }
        for (let s = steps; s >= 0; s--) {
          const k = s / steps, angle = start + sweep * k;
          const taper = Math.pow(Math.sin(Math.PI * k), .62);
          const r = radius + radialShift - taper * peak;
          ctx.lineTo(Math.cos(angle) * r, Math.sin(angle) * r);
        }
        ctx.closePath(); ctx.fill();
      };
      const bloom = ctx.createLinearGradient(-radius, -radius, radius, radius);
      bloom.addColorStop(0, deep); bloom.addColorStop(.5, main); bloom.addColorStop(1, core);
      ribbon(1.9, deep, alpha * .30);
      ribbon(1.0, bloom, alpha * .92);
      ribbon(.34, core, alpha, -2);
      if (effect.layer === 0) {
        ctx.globalAlpha = alpha * .48; ctx.strokeStyle = main; ctx.lineWidth = 7; ctx.setLineDash([20, 12]); ctx.lineDashOffset = -t * 90; ctx.beginPath(); ctx.arc(0, 0, radius - 25, start + .08, start + sweep * .96); ctx.stroke(); ctx.setLineDash([]);
      }
      const crests = effect.theme === 'cloud' ? 9 : effect.theme === 'water' ? 8 : effect.theme === 'flame' || effect.theme === 'inferno' ? 7 : 5;
      for (let i = 0; i < crests; i++) {
        const ratio = .12 + i / Math.max(1, crests - 1) * .76, angle = start + sweep * ratio, px = Math.cos(angle) * radius, py = Math.sin(angle) * radius, size = 15 + (i % 3) * 6;
        ctx.save(); ctx.translate(px, py); ctx.rotate(angle + (sweep >= 0 ? Math.PI * .5 : -Math.PI * .5)); ctx.globalAlpha = alpha * (.38 + (i % 2) * .22); ctx.strokeStyle = i % 3 ? main : core; ctx.lineWidth = 3 + (i % 2);
        ctx.beginPath(); ctx.moveTo(-size, 5); ctx.quadraticCurveTo(0, -size * (effect.theme === 'water' ? 1.15 : .72), size, 0); ctx.quadraticCurveTo(4, size * .48, -size * .35, size * .25); ctx.stroke();
        if (['flame', 'inferno', 'solar'].includes(effect.theme)) { ctx.fillStyle = i % 2 ? main : core; ctx.beginPath(); ctx.moveTo(size * .2, 0); ctx.quadraticCurveTo(-size * .1, -size * 1.35, -size * .55, -size * .15); ctx.quadraticCurveTo(-size * .1, size * .35, size * .2, 0); ctx.fill(); }
        ctx.restore();
      }
      if (effect.theme === 'cloud') {
        const cloudT = Math.min(1, t * 1.35);
        ctx.globalAlpha = alpha * .46;
        ctx.strokeStyle = core; ctx.lineWidth = 3.2;
        for (let i = 0; i < 8; i++) {
          const a2 = (i / 8) * Math.PI * 2 + effect.seed, rr = radius * (.58 + cloudT * .24);
          ctx.save(); ctx.translate(Math.cos(a2) * rr, Math.sin(a2) * rr * .66); ctx.rotate(a2 + Math.PI * .5);
          ctx.beginPath(); ctx.arc(-9, 0, 10, 0, Math.PI * 2); ctx.arc(8, -3, 13, 0, Math.PI * 2); ctx.arc(22, 2, 8, 0, Math.PI * 2); ctx.stroke(); ctx.restore();
        }
      } else if (effect.theme === 'water') {
        // 물 참격은 단색 초승달이 아니라 서로 다른 속도의 유선과 흰 포말이
        // 칼날을 따라 말려 들어간다. 반복 원을 피하고 접촉 방향으로 가속한다.
        ctx.shadowBlur = q() > .7 ? 18 : 0;
        for (let stream = 0; stream < 3; stream++) {
          ctx.globalAlpha = alpha * (.54 - stream * .11);
          ctx.strokeStyle = stream === 2 ? core : main;
          ctx.lineWidth = 4.5 - stream;
          ctx.beginPath();
          const segments = 18;
          for (let s = 0; s <= segments; s++) {
            const k = s / segments, a2 = start + sweep * (.07 + k * .88);
            const ripple = Math.sin(k * Math.PI * (3.5 + stream * .6) + effect.seed + stream) * (7 + stream * 3) * Math.sin(Math.PI * k);
            const rr = radius - 20 - stream * 13 + ripple;
            const px = Math.cos(a2) * rr, py = Math.sin(a2) * rr;
            s ? ctx.lineTo(px, py) : ctx.moveTo(px, py);
          }
          ctx.stroke();
        }
        ctx.fillStyle = core;
        for (let foam = 0; foam < 10; foam++) {
          const k = .14 + foam / 12, a2 = start + sweep * k;
          const rr = radius + 9 + Math.sin(effect.seed + foam * 1.7) * 11;
          const bubble = 2.2 + foam % 3 * 1.5;
          ctx.globalAlpha = alpha * (.35 + foam % 2 * .18);
          ctx.beginPath(); ctx.arc(Math.cos(a2) * rr, Math.sin(a2) * rr, bubble, 0, Math.PI * 2); ctx.fill();
        }
      }
      // ── 공격 종류별 고유 연출 ─────────────────────────────────
      // 여기가 없으면 팔레트만 다른 똑같은 초승달이 계속 나온다.
      if (effect.layer === 0) {
        ctx.shadowBlur = 20;
        if (effect.kind === 'sweep') {
          // 1타: 칼끝이 지나간 자리에 남는 잔선 — 빠르고 가볍다.
          ctx.globalAlpha = alpha * .5; ctx.strokeStyle = core; ctx.lineWidth = 2;
          for (let i = 0; i < 5; i++) {
            const k = .18 + i * .17, a2 = start + sweep * k, rr = radius + 20;
            ctx.beginPath(); ctx.moveTo(Math.cos(a2) * (rr - 46 - i * 5), Math.sin(a2) * (rr - 46 - i * 5)); ctx.lineTo(Math.cos(a2) * rr, Math.sin(a2) * rr); ctx.stroke();
          }
        } else if (effect.kind === 'reverse') {
          // 2타: 되돌려 베는 궤적이라 반대로 흐르는 짧은 호를 겹친다.
          ctx.globalAlpha = alpha * .55; ctx.strokeStyle = main; ctx.lineWidth = 3.5;
          ctx.beginPath(); ctx.arc(0, 0, radius * .62, start + sweep * .15, start + sweep * .8); ctx.stroke();
          ctx.globalAlpha = alpha * .35; ctx.lineWidth = 1.6;
          ctx.beginPath(); ctx.arc(0, 0, radius * .44, start + sweep * .3, start + sweep * .95); ctx.stroke();
        } else if (effect.kind === 'wide') {
          // 3타 마무리: 퍼지는 충격파 + 바닥에 튀는 파편선.
          const burstT = Math.min(1, t * 1.5);
          ctx.globalAlpha = alpha * (1 - burstT) * .8; ctx.strokeStyle = core; ctx.lineWidth = 4 + (1 - burstT) * 5;
          ctx.beginPath(); ctx.arc(0, 0, 60 + burstT * 210, 0, Math.PI * 2); ctx.stroke();
          ctx.globalAlpha = alpha * (1 - burstT) * .6; ctx.lineWidth = 3;
          for (let i = 0; i < 9; i++) {
            const a2 = (i / 9) * Math.PI * 2 + effect.seed, r0 = 60 + burstT * 150, r1 = r0 + 40 + burstT * 60;
            ctx.beginPath(); ctx.moveTo(Math.cos(a2) * r0, Math.sin(a2) * r0); ctx.lineTo(Math.cos(a2) * r1, Math.sin(a2) * r1); ctx.stroke();
          }
        } else if (effect.kind === 'overhead') {
          // 강공격: 위에서 내리꽂는 빛기둥 + 착지 지점 폭발.
          const drop = Math.min(1, t * 1.8);
          const column = ctx.createLinearGradient(0, -300, 0, 40);
          column.addColorStop(0, 'rgba(255,255,255,0)'); column.addColorStop(.55, main); column.addColorStop(1, core);
          ctx.globalAlpha = alpha * (1 - drop) * .75; ctx.strokeStyle = column; ctx.lineWidth = 26 * (1 - drop * .5);
          ctx.beginPath(); ctx.moveTo(0, -300 + drop * 120); ctx.lineTo(0, 30); ctx.stroke();
          ctx.globalAlpha = alpha * (1 - drop) * .85; ctx.strokeStyle = core; ctx.lineWidth = 5;
          ctx.beginPath(); ctx.ellipse(0, 34, 40 + drop * 190, 12 + drop * 44, 0, 0, Math.PI * 2); ctx.stroke();
        } else if (effect.kind === 'spin') {
          // 무쌍·선풍: 서로 다른 속도로 도는 이중 고리 + 도는 꽃잎.
          for (const [mul, rad, lw] of [[1, .78, 5], [-1.5, .52, 3]]) {
            ctx.globalAlpha = alpha * .5; ctx.strokeStyle = mul > 0 ? core : main; ctx.lineWidth = lw;
            ctx.setLineDash([26, 18]); ctx.lineDashOffset = t * 240 * mul;
            ctx.beginPath(); ctx.arc(0, 0, radius * rad, 0, Math.PI * 2); ctx.stroke(); ctx.setLineDash([]);
          }
          const petals = effect.musou ? 8 : 6;
          for (let i = 0; i < petals; i++) {
            const a2 = (i / petals) * Math.PI * 2 + t * (effect.musou ? 9 : 6), rr = radius * (.9 + Math.sin(t * 6 + i) * .08);
            ctx.save(); ctx.translate(Math.cos(a2) * rr, Math.sin(a2) * rr); ctx.rotate(a2 + Math.PI * .5);
            ctx.globalAlpha = alpha * .68; ctx.fillStyle = i % 2 ? core : main;
            ctx.beginPath(); ctx.moveTo(0, -20); ctx.quadraticCurveTo(11, 0, 0, 22); ctx.quadraticCurveTo(-11, 0, 0, -20); ctx.fill(); ctx.restore();
          }
        }
      }
      ctx.shadowBlur = 18; ctx.globalAlpha = alpha * Math.max(0, 1 - t * 2.2) * .65; ctx.strokeStyle = core; ctx.lineWidth = 5; ctx.beginPath(); ctx.arc(0, 0, 42 + t * 95, 0, Math.PI * 2); ctx.stroke();
      ctx.restore();
    }
    for (const impact of impacts) {
      const t = 1 - impact.life / impact.max, x = impact.x - cameraX, alpha = Math.pow(1 - t, .8);
      if (impact.style === 'crack') {
        // 지면 균열 — 바닥에 납작하게 퍼지는 방사 균열과 잔광 링.
        const spread = (impact.defeated ? 118 : 84) * (1 - Math.pow(1 - t, 2.2));
        ctx.save(); ctx.translate(Math.round(x), Math.round(impact.y + 4)); ctx.scale(1, .30);
        ctx.globalAlpha = alpha * .8; ctx.lineCap = 'round';
        ctx.strokeStyle = impact.defeated ? '#ffd670' : '#e8b06a'; ctx.lineWidth = 3;
        for (let ray = 0; ray < 6; ray++) {
          const angle = ray / 6 * Math.PI * 2 + impact.x * .7, wobble = Math.sin(impact.x + ray * 3.1) * .4;
          ctx.beginPath(); ctx.moveTo(Math.cos(angle) * 12, Math.sin(angle) * 12);
          ctx.lineTo(Math.cos(angle + wobble * .3) * spread * .6, Math.sin(angle + wobble * .3) * spread * .6);
          ctx.lineTo(Math.cos(angle + wobble * .5) * spread, Math.sin(angle + wobble * .5) * spread); ctx.stroke();
        }
        ctx.globalCompositeOperation = 'lighter'; ctx.globalAlpha = alpha * .4;
        ctx.strokeStyle = impact.color; ctx.lineWidth = 4;
        ctx.beginPath(); ctx.arc(0, 0, spread * .85, 0, Math.PI * 2); ctx.stroke();
        ctx.restore(); continue;
      }
      const rays = impact.defeated ? 10 : impact.heavy ? 7 : 5, reach = (impact.defeated ? 94 : impact.heavy ? 64 : 42) * (1 - Math.pow(1 - t, 2));
      ctx.save(); ctx.translate(Math.round(x), Math.round(impact.y)); ctx.globalCompositeOperation = 'lighter'; ctx.globalAlpha = alpha; ctx.shadowColor = impact.color; ctx.shadowBlur = impact.heavy || impact.defeated ? 24 : 15;
      ctx.strokeStyle = impact.defeated ? '#ffd670' : impact.color; ctx.lineWidth = impact.defeated ? 5 : impact.heavy ? 4 : 3; ctx.lineCap = 'round';
      ctx.globalAlpha = alpha * .55; ctx.beginPath(); ctx.arc(0, 0, 18 + reach * .72, 0, Math.PI * 2); ctx.stroke(); ctx.globalAlpha = alpha;
      for (let ray = 0; ray < rays; ray++) { const angle = ray / rays * Math.PI * 2 + .22; ctx.beginPath(); ctx.moveTo(Math.cos(angle) * 8, Math.sin(angle) * 8); ctx.lineTo(Math.cos(angle) * reach, Math.sin(angle) * reach); ctx.stroke(); }
      if (impact.style === 'cloud') {
        ctx.globalAlpha = alpha * .72; ctx.strokeStyle = '#fff6ce'; ctx.lineWidth = 3;
        for (let puff = 0; puff < 5; puff++) { const pa = puff / 5 * Math.PI * 2 + .3, pr = 22 + reach * .42; ctx.beginPath(); ctx.arc(Math.cos(pa) * pr, Math.sin(pa) * pr * .58, 10 + puff % 2 * 5, 0, Math.PI * 2); ctx.stroke(); }
      } else if (impact.style === 'crescent') {
        ctx.globalAlpha = alpha * .88; ctx.strokeStyle = '#eaffff'; ctx.lineWidth = 4; ctx.beginPath(); ctx.arc(0, 0, reach * .72, -.85, .85); ctx.stroke();
      } else if (impact.style === 'boar') {
        ctx.globalAlpha = alpha * .82; ctx.strokeStyle = '#ffd28a'; ctx.lineWidth = 4; ctx.beginPath(); ctx.ellipse(0, 20, reach * .90, 18 + reach * .16, 0, 0, Math.PI * 2); ctx.stroke();
        ctx.globalAlpha = alpha * .68; ctx.lineWidth = 5; ctx.beginPath(); ctx.arc(-reach * .42, -8, 28 + reach * .18, .35, 2.2); ctx.arc(reach * .42, -8, 28 + reach * .18, .94, 2.78); ctx.stroke();
      }
      const core = 8 + (1 - t) * (impact.defeated ? 15 : 9); ctx.rotate(Math.PI * .25); ctx.fillStyle = '#fff3c2'; ctx.fillRect(-core * .5, -core * .5, core, core); ctx.restore();
    }
    for (const label of floatingTexts) {
      const t = 1 - label.life / label.max, alpha = Math.min(1, label.life / .28) * Math.min(1, (1 - t) * 2.4), x = label.x - cameraX, y = label.y;
      ctx.save(); ctx.globalAlpha = alpha; ctx.translate(Math.round(x), Math.round(y)); ctx.scale(label.scale * (1 + t * .08), label.scale * (1 + t * .08)); ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.font = `900 18px ${CANVAS_IMPACT_FONT}`; ctx.lineWidth = 5; ctx.strokeStyle = 'rgba(18,7,5,.88)'; ctx.strokeText(label.label, 0, 0); ctx.fillStyle = label.color; ctx.shadowColor = label.color; ctx.shadowBlur = 10; ctx.fillText(label.label, 0, 0); ctx.restore();
    }
    if (!combatLocked && wave < TOTAL_WAVES) { const pulse = .55 + Math.sin(now * .008) * .35; ctx.save(); ctx.globalAlpha = pulse; ctx.fillStyle = '#f2d47b'; ctx.font = `800 28px ${CANVAS_IMPACT_FONT}`; ctx.textAlign = 'right'; ctx.fillText('GO  ▶▶', width - 42, height * .47); ctx.restore(); }
    if (combatLocked && waveGate - player.x < 230) {
      const edgeX = Math.min(width - 18, waveGate - cameraX);
      ctx.save(); ctx.strokeStyle = 'rgba(242,212,123,.45)'; ctx.lineWidth = 2; ctx.setLineDash([7,8]);
      ctx.beginPath(); ctx.moveTo(edgeX, floorY - 100); ctx.lineTo(edgeX, floorY + 72); ctx.stroke();
      ctx.setLineDash([]); ctx.font = `700 13px ${CANVAS_UI_FONT}`; ctx.textAlign = 'right';
      ctx.fillStyle = '#fff0bc'; ctx.strokeStyle = 'rgba(12,18,20,.9)'; ctx.lineWidth = 4;
      const hint = '남은 적 ' + enemies.filter(e => !e.deadAt).length + '명 격파 후 전진';
      ctx.strokeText(hint, edgeX - 10, floorY - 115); ctx.fillText(hint, edgeX - 10, floorY - 115); ctx.restore();
    }
    for (const particle of dust) {
      const life = Math.max(0, particle.life / particle.max), x = particle.x - cameraX;
      ctx.save(); ctx.globalAlpha = particle.ambient ? life * .55 : life; if (particle.glow) ctx.globalCompositeOperation = 'lighter'; ctx.fillStyle = particle.color;
      if (particle.element) {
        // shadowBlur 은 캔버스에서 가장 비싼 연산이다 — 입자 수백 개에 걸면
        // 프레임이 통째로 무너진다. 'lighter' 합성만으로 발광은 충분히 산다.
        const size = (particle.size || 5) * (.55 + life * .75); ctx.translate(x, particle.y); ctx.rotate(particle.rotation || 0);
        if (particle.element === 'droplet') { ctx.beginPath(); ctx.moveTo(size * 1.45, 0); ctx.quadraticCurveTo(-size * .25, -size, -size, 0); ctx.quadraticCurveTo(-size * .25, size, size * 1.45, 0); ctx.fill(); }
        else if (particle.element === 'ember') { ctx.beginPath(); ctx.moveTo(size * 1.6, 0); ctx.quadraticCurveTo(-size * .15, -size * 1.35, -size, 0); ctx.quadraticCurveTo(-size * .1, size * .7, size * 1.6, 0); ctx.fill(); }
        else if (particle.element === 'leaf') { ctx.beginPath(); ctx.ellipse(0, 0, size * 1.35, size * .48, 0, 0, Math.PI * 2); ctx.fill(); ctx.strokeStyle = 'rgba(255,255,255,.72)'; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(-size, 0); ctx.lineTo(size, 0); ctx.stroke(); }
        else if (particle.element === 'mist') { ctx.globalAlpha *= .62; ctx.beginPath(); ctx.arc(-size * .55, 0, size * .8, 0, Math.PI * 2); ctx.arc(size * .35, -size * .18, size, 0, Math.PI * 2); ctx.arc(size * 1.05, size * .08, size * .62, 0, Math.PI * 2); ctx.fill(); }
        else { ctx.rotate(Math.PI * .25); ctx.fillRect(-size * .55, -size * .55, size * 1.1, size * 1.1); }
      }
      else if (particle.spark) { ctx.strokeStyle = particle.color; ctx.lineWidth = 2 + life * 2; ctx.beginPath(); ctx.moveTo(x, particle.y); ctx.lineTo(x - particle.vx * .025, particle.y - particle.vy * .025); ctx.stroke(); }
      else { const size = particle.ambient ? 2 + life * 3 : 3 + life * 6; ctx.fillRect(Math.round(x), Math.round(particle.y), size, particle.ambient ? size : 2 + life * 3); }
      ctx.restore();
    }
    drawAtmosphere(now, floorY, true);
    if (colorFlash > .006) { ctx.save(); ctx.globalCompositeOperation = 'screen'; ctx.globalAlpha = colorFlash; ctx.fillStyle = '#ffe3a0'; ctx.fillRect(0, 0, width, height); ctx.restore(); }
    const vignette = ctx.createRadialGradient(width * .5, height * .46, height * .28, width * .5, height * .5, Math.max(width, height) * .78); vignette.addColorStop(0, 'rgba(0,0,0,0)'); vignette.addColorStop(1, 'rgba(9,4,3,.20)'); ctx.fillStyle = vignette; ctx.fillRect(0, 0, width, height);
    ctx.globalAlpha = 1; ctx.globalCompositeOperation = 'source-over'; ctx.restore();
  }

  function loop(now) {
    if (ended) return;
    if (paused) { lastTime = now; raf = requestAnimationFrame(loop); return; }
    const rawDt = Math.min((now - lastTime) / 1000, 0.034), dt = rawDt * (now < slowUntil ? .32 : 1);
    // 프레임 시간을 완만하게 평균내서 품질을 조절한다. 순간 튀는 값에
    // 반응하면 품질이 깜빡거려 오히려 거슬린다.
    const frameMs = Math.min(now - lastTime, 60);
    frameAvg += (frameMs - frameAvg) * .05;
    if (frameAvg > 26 && quality > .45) quality = Math.max(.45, quality - .02);
    else if (frameAvg < 19 && quality < 1) quality = Math.min(1, quality + .008);
    lastTime = now;
    if (now >= hitstopUntil) update(dt, now);
    render(now);
    raf = requestAnimationFrame(loop);
  }
  showBanner(hudRoot, stageInfo ? stageInfo.title.split(' · ')[0] : '호로관', `${heroName} · LV.${growth.level} · ${weaponName} +${growth.weaponLevel - 1}`); raf = requestAnimationFrame(loop);
}
