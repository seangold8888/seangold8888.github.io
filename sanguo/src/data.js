import { SANGUO_EXPANSION_PEOPLE, SANGUO_EXPANSION_SIGNATURES, SANGUO_EXPANSION_STATS, SANGUO_REPRESENTATIVE_ROSTER, SANGUO_SPECIAL_STAGES, factionKeyFor } from './data/sanguoRoster.js';

/**
 * 원본 콘텐츠 창구.
 *
 * public/data/gamedata.json 은 원본 HTML 게임에서 추출한 것 그대로다.
 * 인물 24 · 연대기 10장(이벤트 75) · 전장 8 · 플레이어블 8 · 장면 10.
 * 역사 서술과 교훈 문구는 어린이용으로 검수된 원문이므로,
 * 코드가 문구를 새로 지어내지 않고 반드시 여기서 읽어 쓴다.
 */

let DB = null;

export async function loadData() {
  if (DB) return DB;
  const res = await fetch('data/gamedata.json');
  if (!res.ok) throw new Error(`데이터를 읽지 못했습니다: ${res.status}`);
  DB = await res.json();
  return DB;
}

export const db = () => DB;

export const person = (id) => SANGUO_EXPANSION_PEOPLE[id] ?? (DB?.PEOPLE?.[id]) ?? {};
export const personName = (id) => person(id).name ?? id;
export const stats = (id) => SANGUO_EXPANSION_STATS[id] ?? (DB?.ACTION_HEROES?.[id]) ?? {};
export const stage = (key) => SANGUO_SPECIAL_STAGES[key] ?? (DB?.ACTION_STAGES?.[key]) ?? {};
export const chapters = () => DB?.CHAPTERS ?? [];
export const scenes = () => DB?.SCENES ?? {};
export const moves = () => DB?.MOVES ?? {};
export const counter = () => DB?.COUNTER ?? {};

/** 전장 키를 연대순으로. 원본 선언 순서는 시대순이 아니다. */
export function stageKeys() {
  const s = { ...(DB?.ACTION_STAGES ?? {}), ...SANGUO_SPECIAL_STAGES };
  return Object.keys(s).sort((a, b) => (s[a].chapter ?? 0) - (s[b].chapter ?? 0));
}

/** 플레이어블 장수 목록 (ACTION_HEROES 에 있는 인물만) */
export const playableIds = () => [...new Set([...Object.keys(DB?.ACTION_HEROES ?? {}), ...Object.keys(SANGUO_EXPANSION_STATS)])];

/** 이 전장에 나설 수 있는 장수 — 원본 heroes 를 그대로 따른다(사실 고증) */
export function stageHeroes(key) {
  const list = stage(key).heroes ?? [];
  return list.length ? list : ['liubei'];
}

/** hex 문자열을 0xRRGGBB 정수로. three.js 색 인자에 바로 쓴다. */
export function hexInt(s, fallback = 0x888888) {
  if (typeof s !== 'string' || !/^#?[0-9a-f]{6}$/i.test(s)) return fallback;
  return parseInt(s.replace('#', ''), 16);
}

export function personColor(id, field, fallback) {
  return hexInt(person(id)[field], fallback);
}

/** 전장 팔레트 — 원본 colors.s1/s2/g1/g2/m 을 이름으로 바꿔 돌려준다. */
export function stagePalette(key) {
  const c = stage(key).colors ?? {};
  return {
    skyTop: hexInt(c.s1, 0x8fb7d8),
    skyBottom: hexInt(c.s2, 0xd9c79a),
    ground: hexInt(c.g1, 0x7d6547),
    groundFar: hexInt(c.g2, 0x69543b),
    accent: hexInt(c.m, 0x7c7853),
  };
}

/**
 * 장수별 전용 무기.
 * 원본 PEOPLE 의 weapon 타입(sword/spear/guandao…)은 그대로 두고,
 * 길이·날폭·휨·금속색만 인물별로 덮어쓴다. 같은 "창"이라도
 * 조운의 은빛 창과 장비의 장팔사모는 달라야 하기 때문이다.
 */
export const SIGNATURE = {
  guanyu:     { name: '청룡언월도', len: 1.18, width: 1.05, curve: 2.0, metal: 0x3f9468 },
  zhangfei:   { name: '장팔사모',   len: 1.22, width: 1.15, curve: 0.6, metal: 0xd8dde2 },
  zhaoyun:    { name: '용담량은창', len: 1.06, width: 0.85, curve: 0.0, metal: 0xeef4fa },
  machao:     { name: '서량은린창', len: 1.14, width: 0.88, curve: 0.0, metal: 0xdfe9f6 },
  huangzhong: { name: '한승대도',   len: 1.16, width: 1.22, curve: 1.2, metal: 0xd9c07a },
  xiahouyuan: { name: '정서장검',   len: 1.08, width: 1.00, curve: 0.0, metal: 0xcdd4e0 },
  caoren:     { name: '수성장창',   len: 1.18, width: 1.00, curve: 0.0, metal: 0xc6cedb },
  lvbu:       { name: '방천화극',   len: 1.20, width: 1.25, curve: 1.0, metal: 0xe8d9a8 },
  liubei:     { name: '쌍고검',     len: 1.02, width: 0.95, curve: 0.0, metal: 0xe6ecf2 },
  caocao:     { name: '의천검',     len: 1.06, width: 1.05, curve: 0.0, metal: 0xdfe8f4 },
  huanggai:   { name: '철편',       len: 1.10, width: 1.30, curve: 0.35, metal: 0xb9c2c9 },
  huaxiong:   { name: '대감도',     len: 1.12, width: 1.30, curve: 0.5, metal: 0xc9d2d8 },
  xiahoudun:  { name: '언월극',     len: 1.14, width: 1.10, curve: 0.8, metal: 0xd2d9de },
  zhouyu:     { name: '장검',       len: 1.04, width: 0.90, curve: 0.0, metal: 0xe2ecf2 },
  zhugeliang: { name: '백우선',     len: 1.00, width: 1.15, curve: 0.0, metal: 0xf6f2e2 },
  luxun:      { name: '우선',       len: 0.95, width: 1.00, curve: 0.0, metal: 0xf2ecdc },
  zhangjiao:  { name: '구절장',     len: 1.10, width: 0.80, curve: 0.0, metal: 0xe8dca8 },
  simayi:     { name: '지휘검',     len: 1.02, width: 0.95, curve: 0.0, metal: 0xdde4ee },
};

export function signature(id) {
  const s = SANGUO_EXPANSION_SIGNATURES[id] ?? SIGNATURE[id] ?? {};
  return {
    name: s.name ?? '',
    len: s.len ?? 1,
    width: s.width ?? 1,
    curve: s.curve ?? 1,
    metal: s.metal ?? 0xc3ccd4,
  };
}

export const factionKey = (id) => Object.entries(SANGUO_REPRESENTATIVE_ROSTER).find(([, ids]) => ids.includes(id))?.[0] ?? factionKeyFor(person(id).faction || '');

/** 무기 사거리(m). 연출과 실제 히트 판정에 함께 쓴다. */
export const WEAPON_REACH = {
  guandao: 2.45, spear: 2.65, halberd: 2.50,
  blade: 1.15, sword: 1.05, fan: 0.55, brush: 0.60,
};

export function weaponReach(id) {
  const w = person(id).weapon ?? 'sword';
  return (WEAPON_REACH[w] ?? 1) * signature(id).len;
}

/** 병종별 색 — 밝은 흙바닥에서 묻히지 않게 지면보다 어둡게 잡는다. */
export const TROOP_COLORS = {
  yellow: { robe: 0x8f6f1f, trim: 0x59430f },
  dong:   { robe: 0x3f465c, trim: 0x212734 },
  yuan:   { robe: 0x7a5320, trim: 0x4a3210 },
  wei:    { robe: 0x283a5e, trim: 0x151f36 },
  ship:   { robe: 0x2f5460, trim: 0x182e37 },
  wu:     { robe: 0x78331f, trim: 0x43190f },
};

/** 진영 색 — UI 리본용 CSS 변수 이름 */
export function factionVar(faction = '') {
  if (faction.includes('촉')) return 'var(--shu)';
  if (faction.includes('위')) return 'var(--wei)';
  if (faction.includes('오')) return 'var(--wu)';
  return 'var(--bone-faint)';
}
