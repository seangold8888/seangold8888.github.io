// Game-original techniques; world pixels and milliseconds.
const make = (name, tip, color, kind, theme, speed, duration, reach, lane, damage, hits = 1, shots = 0) =>
  Object.freeze({ name, tip, color, kind, theme, speed, duration, reach, lane, damage, hits, shots, cooldown: 2600, knock: kind === 'overhead' ? 110 : 45 });
export const DASH_SKILLS = Object.freeze({
  liubei: make('쌍룡 돌파', '두 번 베며 전진', '#8fe5d8', 'reverse', 'jade', 650, 560, 150, 85, 31, 2),
  guanyu: make('청룡 질풍참', '넓게 가르는 돌진', '#55e6b1', 'wide', 'jade', 690, 530, 225, 132, 66),
  zhangfei: make('장판 맹호격', '강하게 밀쳐내는 일격', '#ff9361', 'overhead', 'flame', 720, 520, 180, 112, 72),
  caocao: make('패왕 섬습', '빠른 쌍검 기습', '#c399ff', 'reverse', 'thunder', 880, 440, 145, 72, 30, 2),
  zhaoyun: make('백룡 관통창', '직선의 적을 꿰뚫기', '#9cf1ff', 'thrust', 'lightning', 1120, 450, 235, 54, 68),
  machao: make('서량 쇄진창', '멀리 돌파하며 연타', '#b9d4ff', 'sweep', 'storm', 1040, 650, 170, 86, 32, 2),
  huangzhong: make('노장 추풍시', '전진하며 화살 세 발', '#ffdb8c', 'overhead', 'solar', 480, 660, 125, 65, 24, 1, 3),
  zhouyu: make('홍련 진격', '넓은 화염 연속 베기', '#ff896d', 'wide', 'inferno', 620, 600, 175, 125, 29, 2),
  huanggai: make('철벽 파쇄', '느리지만 강한 충격', '#efb66e', 'overhead', 'earth', 520, 620, 200, 105, 82),
  zhugeliang: make('와룡 풍진', '바람으로 넓은 진형 돌파', '#9de0ff', 'spin', 'storm', 570, 600, 245, 145, 57),
  sunshangxiang: make('홍련 쌍환무', '회전하며 두 번 타격', '#ffc76d', 'spin', 'solar', 820, 510, 170, 115, 30, 2),
  wukong: make('근두운 질풍봉', '빠르게 돌파하는 봉 연타', '#ffe08c', 'spin', 'cloud', 1080, 540, 180, 112, 29, 2),
  bajie: make('천봉 파진', '갈퀴로 진형 밀어내기', '#ffb48a', 'overhead', 'earth', 510, 640, 215, 115, 78),
  wujing: make('유사하 돌파', '물결을 두른 반월 베기', '#88e3ed', 'sweep', 'water', 720, 540, 215, 108, 66),
  tieshangongzhu: make('파초 풍행', '바람으로 넓게 휩쓸기', '#bcebaa', 'spin', 'storm', 620, 590, 240, 140, 57),
  wusong: make('맹호 추격', '빠른 두 번의 일격', '#ffc386', 'reverse', 'flame', 900, 490, 145, 70, 32, 2),
  linchong: make('표자두 설창', '눈바람 속 직선 찌르기', '#c6ecff', 'thrust', 'water', 1000, 500, 235, 56, 68),
  lizhishen: make('금강 파산격', '선장으로 강하게 내려치기', '#ffd584', 'overhead', 'earth', 510, 620, 210, 120, 80),
  husanniang: make('홍금 쌍도습', '쌍칼로 스치며 연속 공격', '#ff9bbd', 'reverse', 'solar', 920, 480, 155, 92, 31, 2),
});
export const dashSkill = (heroId) => DASH_SKILLS[heroId] || DASH_SKILLS.guanyu;
export function startDashState(player, skill, now) {
  player.dashHitLog = new Map();
  player.dashPreviousX = player.x;
  player.dashShots = 0;
  player.dashEffectAt = now;
  player.dashReady = now + skill.cooldown * (player.dashCooldownScale || 1);
}
export function collectDashHits(player, enemies, skill, now) {
  const from = player.dashPreviousX ?? player.x;
  player.dashPreviousX = player.x;
  const progress = (now - player.actionStarted) / skill.duration;
  if (progress < .12 || progress > 1) return [];
  const reach = skill.reach * (player.dashReachScale || 1);
  const left = Math.min(from, player.x) - (player.facing < 0 ? reach : 30);
  const right = Math.max(from, player.x) + (player.facing > 0 ? reach : 30);
  return enemies.filter(enemy => {
    if (enemy.deadAt || enemy.hp <= 0 || enemy.grabbed || enemy.x < left || enemy.x > right || Math.abs(enemy.lane - player.lane) > skill.lane) return false;
    const hit = player.dashHitLog.get(enemy) || { count: 0, at: -Infinity };
    if (hit.count >= skill.hits || now - hit.at < 165) return false;
    player.dashHitLog.set(enemy, { count: hit.count + 1, at: now });
    return true;
  });
}
