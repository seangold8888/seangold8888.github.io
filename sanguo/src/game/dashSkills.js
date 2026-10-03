// Game-original techniques; world pixels and milliseconds.
const make = (name, tip, color, kind, theme, speed, duration, reach, lane, damage, hits = 1, shots = 0) =>
  Object.freeze({ name, tip, color, kind, theme, speed, duration, reach, lane, damage, hits, shots, cooldown: 2600, knock: kind === 'overhead' ? 110 : 45 });
export const DASH_SKILLS = Object.freeze({
  taeo: make('번개 돌려차기', '빠르게 파고들며 두 번 발차기', '#74cfff', 'reverse', 'lightning', 1040, 500, 162, 82, 30, 2),
  jaei: make('방울 회오리', '방울을 두르고 넓게 밀어내기', '#ffb8e1', 'spin', 'water', 680, 600, 224, 138, 55),
  yunchan: make('반딧불 길잡이', '빛 세 줄기를 날리며 전진', '#c4ed73', 'sweep', 'jade', 760, 650, 182, 94, 22, 1, 3),
  yungeon: make('불꽃 드리블', '공을 따라 빠르게 돌파하는 킥', '#ffb248', 'thrust', 'flame', 1100, 470, 202, 64, 65),
  euljimundeok: make('살수 측면돌파', '물결처럼 적진 옆을 가르기', '#8edbeb', 'reverse', 'water', 900, 510, 168, 85, 31, 2),
  ganggamchan: make('귀주 진형쇄도', '앞줄을 단단하게 밀어붙이기', '#ead39c', 'overhead', 'earth', 620, 590, 205, 112, 72),
  kwonyul: make('행주 성벽돌진', '방어선에서 앞으로 파고들기', '#eaa280', 'wide', 'flame', 760, 530, 200, 116, 61),
  yisunsin: make('명량 물살가르기', '좁은 길을 가로지르는 연격', '#8fd2ec', 'sweep', 'water', 850, 570, 214, 108, 34, 2),
  liubei: make('쌍룡 돌파', '두 번 베며 전진', '#8fe5d8', 'reverse', 'jade', 650, 560, 150, 85, 31, 2),
  guanyu: make('청룡 질풍참', '넓게 가르는 돌진', '#55e6b1', 'wide', 'jade', 690, 530, 225, 132, 66),
  zhangfei: make('장판 맹호격', '강하게 밀쳐내는 일격', '#ff9361', 'overhead', 'flame', 720, 520, 180, 112, 72),
  caocao: make('패왕 섬습', '빠른 쌍검 기습', '#c399ff', 'reverse', 'thunder', 880, 440, 145, 72, 30, 2),
  zhaoyun: make('백룡 관통창', '직선의 적을 꿰뚫기', '#9cf1ff', 'thrust', 'lightning', 1120, 450, 235, 54, 68),
  machao: make('서량 쇄진창', '멀리 돌파하며 연타', '#b9d4ff', 'sweep', 'storm', 1040, 650, 170, 86, 32, 2),
  huangzhong: make('노장 추풍시', '전진하며 화살 세 발', '#ffdb8c', 'overhead', 'solar', 480, 660, 125, 65, 24, 1, 3),
  xiahoudun: make('독안 맹진', '장극을 크게 휘두르며 돌파', '#8aaaff', 'overhead', 'thunder', 690, 570, 202, 118, 70),
  zhangliao: make('합비 섬격', '번개처럼 두 번 베며 전진', '#79d4db', 'reverse', 'lightning', 980, 460, 162, 78, 32, 2),
  xuchu: make('호치 파진', '대부로 진형을 내려찍기', '#d29955', 'overhead', 'earth', 570, 650, 208, 122, 80),
  simayi: make('낭고 진형전환', '회전하며 진형 한가운데 돌입', '#a9b9ff', 'spin', 'storm', 660, 610, 222, 134, 56),
  sunquan: make('강동 호령', '넓은 검격으로 길을 열기', '#f2a85c', 'wide', 'solar', 720, 550, 196, 126, 61),
  taishici: make('신정 연사돌파', '창으로 돌진하며 세 발 사격', '#ff9474', 'thrust', 'lightning', 930, 620, 210, 64, 22, 1, 3),
  ganning: make('백기 야습', '쌍도로 세 번 스치며 돌파', '#56c9d1', 'reverse', 'water', 1080, 660, 152, 88, 24, 3),
  luxun: make('이릉 화선풍', '부채 바람으로 넓게 휩쓸기', '#a8d978', 'spin', 'inferno', 660, 610, 238, 146, 56),
  zhouyu: make('홍련 진격', '넓은 화염 연속 베기', '#ff896d', 'wide', 'inferno', 620, 600, 175, 125, 29, 2),
  huanggai: make('철벽 파쇄', '느리지만 강한 충격', '#efb66e', 'overhead', 'earth', 520, 620, 200, 105, 82),
  zhugeliang: make('와룡 풍진', '바람으로 넓은 진형 돌파', '#9de0ff', 'spin', 'storm', 570, 600, 245, 145, 57),
  sunshangxiang: make('홍련 쌍환무', '회전하며 두 번 타격', '#ffc76d', 'spin', 'solar', 820, 510, 170, 115, 30, 2),
  wukong: make('근두운 질풍봉', '빠르게 돌파하는 봉 연타', '#ffe08c', 'spin', 'cloud', 1080, 540, 180, 112, 29, 2),
  bajie: make('천봉 파진', '갈퀴로 진형 밀어내기', '#ffb48a', 'overhead', 'earth', 510, 640, 215, 115, 78),
  wujing: make('유사하 돌파', '물결을 두른 반월 베기', '#88e3ed', 'sweep', 'water', 720, 540, 215, 108, 66),
  tieshangongzhu: make('파초 풍행', '바람으로 넓게 휩쓸기', '#bcebaa', 'spin', 'storm', 620, 590, 240, 140, 57),
  nezha: make('풍화륜 돌파', '불바퀴로 가르며 지나가기', '#ff9a5c', 'spin', 'storm', 1180, 500, 175, 110, 27, 2),
  erlangshen: make('천안 삼첨참', '변신을 꿰뚫는 삼첨도 일격', '#a8d7ff', 'sweep', 'cloud', 760, 620, 235, 130, 74),
  honghaier: make('삼매진화', '꺼지지 않는 불을 두르고 돌진', '#ff6a2c', 'overhead', 'earth', 900, 560, 200, 118, 62),
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
