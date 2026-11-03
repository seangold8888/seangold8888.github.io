// 기마 전용 기술. 말에 오르면 같은 버튼이 다른 기술이 된다 — 그래야 말을 타는 이유가 생긴다.
//  공격 탭: ① 돌진 찌르기 → ② 말 위 휩쓸기 → 다시 ①
//  공격 꾹: 말발굽 짓밟기 (주변 전체, 넘어뜨림)
//  돌진   : 기마 돌격 (정해진 거리를 질주하며 길 위의 적을 모두 들이받음, 질주 중 무적)
// 순수 계산만 둔다. 단위는 월드 픽셀·밀리초, 레인은 화면 깊이(-92~72).

// 어느 장수가 무엇을 타는가. 화면·발소리·기술 이름이 같은 분류를 읽는다.
export const MOUNT_KIND_BY_HERO = Object.freeze({
  liubei: 'horse', guanyu: 'horse', zhangfei: 'horse', lvbu: 'horse',
  zhaoyun: 'horse', caocao: 'horse', machao: 'horse',
  wusong: 'horse', linchong: 'horse', lizhishen: 'horse',
  wukong: 'cloud', nezha: 'wheels', bajie: 'boar', wujing: 'waterBeast',
});
export const mountKindOf = (heroId) => MOUNT_KIND_BY_HERO[heroId] || 'horse';
export const canRide = (heroId) => Object.hasOwn(MOUNT_KIND_BY_HERO, heroId);

// 말 위 이동은 도보(330)의 1.45배, 레인 이동은 1.25배.
export const MOUNTED_SPEED_SCALE = 1.45;
export const MOUNTED_LANE_SCALE = 1.25;

// 탈것마다 이름과 먼지 색만 바뀐다. 판정은 모두 같다.
export const MOUNT_FLAVOR = Object.freeze({
  horse: { charge: '기마 돌격', stomp: '말발굽 짓밟기', button: '돌격!', icon: '🐎', element: 'droplet', colors: ['#f3d09a', '#b77b4d', '#fff1cf'] },
  cloud: { charge: '근두운 돌격', stomp: '구름 짓밟기', button: '돌격!', icon: '☁', element: 'mist', colors: ['#fff2b8', '#ffc95e', '#ffffff'] },
  wheels: { charge: '풍화륜 돌격', stomp: '불바퀴 짓밟기', button: '돌격!', icon: '🔥', element: 'ember', colors: ['#ff6a2c', '#fff0a2', '#7fe7ee'] },
  boar: { charge: '야저 돌격', stomp: '야저 짓밟기', button: '돌격!', icon: '🐗', element: 'shard', colors: ['#9b7044', '#e1b46d', '#fff0c8'] },
  waterBeast: { charge: '수마 돌격', stomp: '물결 짓밟기', button: '돌격!', icon: '🌊', element: 'droplet', colors: ['#78d7e8', '#d2f8ff', '#ffffff'] },
});
export const mountFlavor = (kind) => MOUNT_FLAVOR[kind] || MOUNT_FLAVOR.horse;

// forward/back: 바라보는 방향 기준 앞·뒤 판정 거리. lane: 위아래 판정 폭.
// push: 앞(짓밟기는 바깥)으로 밀어내는 거리, laneFling: 옆 레인으로 튕겨내는 거리.
export const MOUNTED_MOVES = Object.freeze({
  mountedThrust: Object.freeze({ name: '돌진 찌르기', duration: 430, hitAt: .40, forward: 430, back: 0, lane: 72, damage: 54, push: 170, laneFling: 0, stun: 420, step: 70, kind: 'thrust', shake: 10 }),
  mountedSweep: Object.freeze({ name: '말 위 휩쓸기', duration: 540, hitAt: .46, forward: 340, back: 120, lane: 150, damage: 60, push: 160, laneFling: 72, stun: 500, step: 24, kind: 'wide', shake: 12 }),
  mountedStomp: Object.freeze({ name: '말발굽 짓밟기', duration: 760, hitAt: .52, forward: 270, back: 270, lane: 140, damage: 76, push: 120, laneFling: 30, stun: 1100, step: 0, kind: 'overhead', shake: 9, knockdown: true }),
});
export const MOUNTED_CHAIN = Object.freeze(['mountedThrust', 'mountedSweep']);
// 앞 기술이 끝난 뒤 이 시간 안에 다시 누르면 다음 단계로 이어진다.
export const MOUNTED_CHAIN_GRACE = 700;

export const MOUNTED_CHARGE = Object.freeze({
  duration: 520, distance: 600, front: 120, behind: 40, lane: 96,
  damage: 60, push: 80, fling: 78, stun: 650, startup: .06,
  invulnPad: 140, cooldown: 1800,
});

// 필살기·무쌍은 이름·음성은 그대로, 말 위에서는 앞으로 내달리며 쓴다.
export const MOUNTED_SURGE = Object.freeze({
  special: Object.freeze({ distance: 240, until: .42, rangeBonus: 130 }),
  musou: Object.freeze({ distance: 320, until: .40, rangeBonus: 160 }),
});

export const MOUNTED_ACTIONS = Object.freeze(['mountedThrust', 'mountedSweep', 'mountedStomp', 'mountedCharge']);
export const isMountedAction = (action) => MOUNTED_ACTIONS.includes(action);

// 탭 연계: 창이 열려 있으면 다음 단계, 아니면 1단(찌르기)부터.
export function nextMountedChainAction(player, now) {
  const open = now < (player.mountedChainUntil || 0);
  const index = open ? (player.mountedChainStep || 0) % MOUNTED_CHAIN.length : 0;
  const action = MOUNTED_CHAIN[index];
  player.mountedChainStep = index + 1;
  player.mountedChainUntil = now + MOUNTED_MOVES[action].duration + MOUNTED_CHAIN_GRACE;
  return action;
}
// 버튼에 '다음에 나갈 기술'을 보여 주기 위한 미리보기(상태를 바꾸지 않는다).
export function peekMountedChainAction(player, now) {
  const open = now < (player.mountedChainUntil || 0);
  return MOUNTED_CHAIN[open ? (player.mountedChainStep || 0) % MOUNTED_CHAIN.length : 0];
}

export function mountedHitReady(action, player, now) {
  const move = MOUNTED_MOVES[action];
  return !!move && now - player.actionStarted >= move.duration * move.hitAt;
}

export function mountedMoveTargets(action, player, enemies) {
  const move = MOUNTED_MOVES[action];
  if (!move) return [];
  return enemies.filter((enemy) => {
    if (enemy.deadAt || enemy.hp <= 0 || enemy.grabbed) return false;
    const ahead = (enemy.x - player.x) * player.facing;
    return ahead <= move.forward && ahead >= -move.back && Math.abs(enemy.lane - player.lane) <= move.lane;
  });
}

// 밀어내기 방향. 찌르기·휩쓸기는 앞으로, 짓밟기는 말을 중심으로 바깥쪽으로.
// 휩쓸기와 돌격은 옆 레인으로도 튕겨 길을 연다.
export function mountedKnockback(action, player, enemy) {
  // 같은 레인이면 화면 가운데 쪽으로 튕겨 땅 밖으로 밀려나지 않게 한다.
  const laneSide = Math.sign(enemy.lane - player.lane) || (enemy.lane >= 0 ? -1 : 1);
  if (action === 'mountedCharge') return { x: player.facing * MOUNTED_CHARGE.push, lane: laneSide * MOUNTED_CHARGE.fling };
  const move = MOUNTED_MOVES[action];
  if (!move) return { x: 0, lane: 0 };
  const side = action === 'mountedStomp' ? Math.sign(enemy.x - player.x) || player.facing : player.facing;
  return { x: side * move.push, lane: move.laneFling ? laneSide * move.laneFling : 0 };
}

export const mountedChargeSpeed = () => MOUNTED_CHARGE.distance / MOUNTED_CHARGE.duration * 1000;

export function startMountedCharge(player, now, cooldownScale = 1) {
  player.chargeHitLog = new Set();
  player.chargePreviousX = player.x;
  player.chargeStartX = player.x;
  player.dashCooldownTotal = MOUNTED_CHARGE.cooldown * cooldownScale;
  player.dashReady = now + player.dashCooldownTotal;
  player.invulnerableUntil = Math.max(player.invulnerableUntil || 0, now + MOUNTED_CHARGE.duration + MOUNTED_CHARGE.invulnPad);
}

// 고정 거리를 넘지 않도록 이번 프레임의 이동량을 돌려준다.
export function mountedChargeStep(player, dt) {
  const travelled = Math.abs(player.x - (player.chargeStartX ?? player.x));
  return player.facing * Math.max(0, Math.min(mountedChargeSpeed() * dt, MOUNTED_CHARGE.distance - travelled));
}

// 스윕 판정: 프레임 사이 건너뛴 적도 맞는다. 한 번 돌격에 적마다 한 번만.
export function collectChargeHits(player, enemies, now) {
  const from = player.chargePreviousX ?? player.x;
  player.chargePreviousX = player.x;
  const progress = (now - player.actionStarted) / MOUNTED_CHARGE.duration;
  if (progress < MOUNTED_CHARGE.startup || progress > 1.05) return [];
  const left = Math.min(from, player.x) - (player.facing < 0 ? MOUNTED_CHARGE.front : MOUNTED_CHARGE.behind);
  const right = Math.max(from, player.x) + (player.facing > 0 ? MOUNTED_CHARGE.front : MOUNTED_CHARGE.behind);
  player.chargeHitLog ??= new Set();
  return enemies.filter((enemy) => {
    if (enemy.deadAt || enemy.hp <= 0 || enemy.grabbed || player.chargeHitLog.has(enemy)) return false;
    if (enemy.x < left || enemy.x > right || Math.abs(enemy.lane - player.lane) > MOUNTED_CHARGE.lane) return false;
    player.chargeHitLog.add(enemy);
    return true;
  });
}

// 말 위 필살기·무쌍의 전진량. 앞쪽 구간에서만 나아가고 이후엔 제자리에서 마무리한다.
export function mountedSurgeStep(type, player, now, dt) {
  const surge = MOUNTED_SURGE[type];
  if (!surge || !player.actionDuration) return 0;
  const progress = (now - player.actionStarted) / player.actionDuration;
  if (progress < 0 || progress > surge.until) return 0;
  return player.facing * surge.distance / (player.actionDuration * surge.until / 1000) * dt;
}

// 아이용 버튼 문구. 말 위에서는 버튼이 바뀐 기술을 그대로 말해 준다.
export function mountedButtonLabels(kind, nextAction = 'mountedThrust') {
  const flavor = mountFlavor(kind);
  return {
    attack: nextAction === 'mountedSweep' ? '휩쓸기' : '찌르기',
    attackSub: '꾹 · 짓밟기',
    dash: flavor.button,
    dashName: flavor.charge,
    mount: '내리기',
    icon: flavor.icon,
  };
}
