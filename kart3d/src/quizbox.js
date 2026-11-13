// 산리오 카트 3D — "?" 상자(먹으면 수학 문제, 맞히면 터보 부스트)
// 문제 화면은 공통 모듈 GameQuiz(assets/study/game-quiz.js)가 띄운다. 여기는 자리·보상·모양만.
// THREE 를 import 하지 않는다(노드 테스트에서 그대로 읽을 수 있게). 메시는 THREE 를 넘겨받아 만든다.

// 아이 드라이버 id(drivers.js KIDS)와 GameQuiz 아이 id 가 같다.
export const QUIZ_KIDS = ['yunchan', 'jaei', 'yungeon', 'taeo'];

// ? 상자를 넣는 모드. 타임어택·라이벌은 기록·대결이라 넣지 않는다.
export const QUIZ_MODES = ['gp', 'battle', 'speed'];

// 아이템 상자 줄과 같은 자리(game.js·coursefx.js 와 맞춘다)
const BOX_T = Array.from({ length: 8 }, (_, s) => (s + 0.5) / 8);

function wrapGap(a, b) { const d = Math.abs(a - b) % 1; return Math.min(d, 1 - d); }

/* 직선 구간 초입 후보를 고른다.
   points: buildTrack 의 중심선 표본(x,z,tx,tz,dist,t). 앞으로 AHEAD 만큼 방향이 거의 안 바뀌는 곳만
   "직선"으로 본다 → 코너 바로 앞에는 놓이지 않는다. 직선 구간마다 그 시작점 조금 뒤 한 곳.
   avoid: { ramps:[t], padChain:[t], ice:[[a,b]] } — 점프대·부스트 줄·얼음길·아이템 상자 줄과 겹치지 않게.
   반환: t(0~1) 배열, 최대 max 개, 서로 sep 이상 떨어짐. */
export function pickQuizSpots(points, avoid = {}, opt = {}) {
  const n = points.length;
  if (n < 20) return [];
  const AHEAD = opt.ahead || 200, max = opt.max || 3, sep = opt.sep || 0.14;
  const heading = i => Math.atan2(points[i].tx, points[i].tz);
  const step = (i) => {
    const a = points[i], b = points[(i + 1) % n];
    return Math.hypot(b.x - a.x, b.z - a.z);
  };
  // 각 표본에서 앞으로 AHEAD 동안(turn), 그보다 멀리 AHEAD*1.75 동안(far) 꺾인 각도의 합.
  // far 를 같이 보는 이유: 가까운 구간만 보면 코너에 막 들어가기 직전 자리도 "거의 직선"으로 통과한다.
  const turn = new Float64Array(n), far = new Float64Array(n), FAR = AHEAD * 1.75;
  for (let i = 0; i < n; i++) {
    let w = 0, sum = 0, j = i, h = heading(i);
    while (w < FAR) {
      const k = (j + 1) % n;
      w += step(j);
      let d = heading(k) - h;
      while (d > Math.PI) d -= Math.PI * 2;
      while (d < -Math.PI) d += Math.PI * 2;
      sum += Math.abs(d); h = heading(k); j = k;
      if (w <= AHEAD) turn[i] = sum;
      if (j === i) break;
    }
    far[i] = sum;
  }
  const ramps = avoid.ramps || [], chain = avoid.padChain || [], ice = avoid.ice || [];
  function allowed(t) {
    if (t < 0.08 || t > 0.88) return false;                    // 출발·결승선 근처는 비운다
    if (BOX_T.some(u => wrapGap(u, t) < 0.035)) return false;
    if (ramps.some(u => wrapGap(u, t) < 0.05)) return false;
    if (chain.some(u => wrapGap(u, t) < 0.04)) return false;
    if (ice.some(([a, b]) => t > a - 0.03 && t < b + 0.03)) return false;
    return true;
  }
  for (let thr = opt.thr || 0.3, tries = 0; tries < 6; thr *= 1.4, tries++) {
    // 직선 구간(연속으로 ok 인 표본 묶음)을 찾는다
    const ok = i => turn[i] < thr && far[i] < thr * 2 && allowed(points[i].t);
    const runs = [];
    let i = 0;
    while (i < n) {
      if (!ok(i)) { i++; continue; }
      const s = i;
      while (i < n && ok(i)) i++;
      runs.push({ s, e: i - 1, len: i - s });
    }
    runs.sort((a, b) => b.len - a.len);                           // 긴 직선부터
    const out = [];
    for (const r of runs) {
      const idx = Math.min(r.e, r.s + Math.min(6, Math.floor(r.len / 3)));   // 초입: 시작에서 조금만 들어간 곳
      const t = points[idx].t;
      if (out.every(u => wrapGap(u, t) >= sep)) out.push(t);
      if (out.length >= max) break;
    }
    if (out.length >= Math.min(2, max)) return out.sort((a, b) => a - b);
    if (tries === 5 && out.length) return out;
  }
  return [];
}

/* 보상: 한 번에 맞히면 3초 터보 + 불꽃 한 단계 위(빨강→파랑→무지개), 무지개면 +1초, 코인 +3.
   고쳐 맞히면 1초 미니 부스트, 불꽃 한 단계 아래. tier 0 은 아직 불꽃 단계 없음. */
export const FLAME = [
  { name: '주황', color: '#ffae3d' },
  { name: '빨강', color: '#ff3b30' },
  { name: '파랑', color: '#2f8cff' },
  { name: '무지개', color: 'rainbow' }
];
export function quizReward(tier, firstTry) {
  const t0 = Math.max(0, Math.min(3, tier | 0));
  if (firstTry) {
    const t = Math.min(3, t0 + 1);
    return { tier: t, secs: 3 + (t === 3 ? 1 : 0), coins: 3 };
  }
  return { tier: Math.max(0, t0 - 1), secs: 1, coins: 0 };
}

// "?" 그림은 한 장만 만들어 모든 판이 같이 쓴다(재질만 dispose 되므로 판마다 만들면 쌓인다).
let quizTex = null;
function quizTexture(THREE) {
  if (quizTex) return quizTex;
  const S = 128, cv = document.createElement('canvas');
  cv.width = cv.height = S;
  const c = cv.getContext('2d');
  const g = c.createLinearGradient(0, 0, S, S);
  g.addColorStop(0, '#9d7bff'); g.addColorStop(1, '#4fc3ff');
  c.fillStyle = g; c.fillRect(0, 0, S, S);
  c.lineWidth = 10; c.strokeStyle = '#ffffff'; c.strokeRect(5, 5, S - 10, S - 10);
  c.font = '900 98px "Apple SD Gothic Neo", "Malgun Gothic", sans-serif';
  c.textAlign = 'center'; c.textBaseline = 'middle';
  c.lineJoin = 'round'; c.lineWidth = 12; c.strokeStyle = '#3b2470';
  c.strokeText('?', S / 2, S / 2 + 6);
  c.fillStyle = '#ffffff'; c.fillText('?', S / 2, S / 2 + 6);
  quizTex = new THREE.CanvasTexture(cv);
  return quizTex;
}

export function makeQuizBoxMesh(THREE) {
  const g = new THREE.Group();
  const cube = new THREE.Mesh(new THREE.BoxGeometry(14, 14, 14),
    new THREE.MeshLambertMaterial({ map: quizTexture(THREE), emissive: 0x2a1c5c }));
  g.add(cube);
  g.userData.cube = cube;
  return g;
}
