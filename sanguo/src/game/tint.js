/**
 * 런타임 색상 리매핑.
 *
 * 전장 12곳이 전부 같은 병사·같은 적장 그림을 쓰고 있었다. 황건적과 위군이
 * 같은 옷을 입고 나오면 전장을 옮긴 느낌이 안 난다.
 *
 * 이름 없는 병졸은 진영마다 군복 색이 다른 게 당연하므로 색만 바꿔도
 * 정당하다(이름난 인물을 색만 바꿔 다른 사람이라 부르는 것과 다르다).
 *
 * 명도(V)와 채도 구조는 건드리지 않고 색상(H)만 옮긴다 — 갑옷 금속감,
 * 천 주름, 유화 붓자국이 전부 살아남는다.
 */

/** 색상환은 원형이다. 24°→212° 를 직선 보간하면 중간이 초록을 지나간다. */
function shortestArc(from, to) {
  return ((to - from + 540) % 360) - 180;
}

function rgbToHsv(r, g, b) {
  const mx = Math.max(r, g, b), mn = Math.min(r, g, b), d = mx - mn;
  let h = 0;
  if (d > 0.0001) {
    if (mx === r) h = ((g - b) / d) % 6;
    else if (mx === g) h = (b - r) / d + 2;
    else h = (r - g) / d + 4;
    h *= 60;
    if (h < 0) h += 360;
  }
  return [h, mx > 0.0001 ? d / mx : 0, mx];
}

function hsvToRgb(h, s, v) {
  h = ((h % 360) + 360) % 360;
  const c = v * s, x = c * (1 - Math.abs(((h / 60) % 2) - 1)), m = v - c;
  const i = Math.floor(h / 60) % 6;
  const t = [[c, x, 0], [x, c, 0], [0, c, x], [0, x, c], [x, 0, c], [c, 0, x]][i];
  return [t[0] + m, t[1] + m, t[2] + m];
}

/** 살색 보호 — 얼굴·팔뚝까지 물들면 시체처럼 보인다. */
function skinWeight(h, s, v) {
  const d = Math.min(Math.abs(h - 26), 360 - Math.abs(h - 26));
  const hue = Math.max(0, Math.min(1, 1 - d / 28));
  const sat = Math.max(0, Math.min(1, (s - 0.12) / 0.10)) * Math.max(0, Math.min(1, (0.68 - s) / 0.13));
  const val = Math.max(0, Math.min(1, (v - 0.22) / 0.10));
  return hue * sat * val;
}

const cache = new Map();

/**
 * rules: [{ from, to, width, sat, val }] — 색상 각도(0=빨강,120=초록,240=파랑)
 * 같은 (이미지, 키) 조합은 한 번만 굽고 재사용한다.
 */
export function tintSheet(image, key, rules) {
  if (!rules || !rules.length) return image;
  const cacheKey = `${image.src}|${key}`;
  const hit = cache.get(cacheKey);
  if (hit) return hit;

  const c = document.createElement('canvas');
  c.width = image.width; c.height = image.height;
  const g = c.getContext('2d', { willReadFrequently: true });
  g.drawImage(image, 0, 0);
  const img = g.getImageData(0, 0, c.width, c.height);
  const px = img.data;

  for (let i = 0; i < px.length; i += 4) {
    if (px[i + 3] < 8) continue;                    // 투명 화소는 건너뛴다
    const r = px[i] / 255, gg = px[i + 1] / 255, b = px[i + 2] / 255;
    let [h, s, v] = rgbToHsv(r, gg, b);
    if (s < 0.10) continue;                         // 무채색(금속·눈) 보호
    const skin = skinWeight(h, s, v);
    let nh = h, ns = s, nv = v, touched = false;
    for (const rule of rules) {
      const width = rule.width ?? 45;
      const d = Math.min(Math.abs(h - rule.from), 360 - Math.abs(h - rule.from));
      let w = Math.pow(Math.max(0, 1 - d / width), 0.65) * (1 - skin);
      if (w <= 0.001) continue;
      touched = true;
      nh += shortestArc(nh, rule.to) * w;
      ns += (Math.min(1, s * (rule.sat ?? 1)) - ns) * w;
      nv += (Math.min(1, v * (rule.val ?? 1)) - nv) * w;
    }
    if (!touched) continue;
    const [nr, ng, nb] = hsvToRgb(nh, ns, nv);
    px[i] = nr * 255; px[i + 1] = ng * 255; px[i + 2] = nb * 255;
  }
  g.putImageData(img, 0, 0);
  cache.set(cacheKey, c);
  return c;
}

/**
 * 진영별 군복. 원본 병사 시트는 붉은 계열이라 from:0 을 기준으로 옮긴다.
 * gamedata 의 ACTION_STAGES[].troop 값과 키를 맞춘다.
 */
export const TROOP_TINT = {
  yellow: [{ from: 0, to: 46, width: 52, sat: 1.05, val: 1.14 }],   // 황건적 — 누런 두건
  dong:   [],                                                       // 동탁군 — 원본(붉은 흑갑)
  yuan:   [{ from: 0, to: 205, width: 48, sat: .72, val: 1.06 }],   // 원소군 — 청회색
  wei:    [{ from: 0, to: 226, width: 50, sat: .85, val: .96 }],    // 위군 — 짙은 감청
  ship:   [{ from: 0, to: 172, width: 50, sat: .80, val: 1.02 }],   // 수군 — 물빛 청록
  wu:     [{ from: 0, to: 96, width: 50, sat: .78, val: 1.00 }],    // 오군 — 이끼 녹
};

/** 적장은 진영보다 한 단계 더 짙고 강한 색으로 구분한다. */
export const BOSS_TINT = {
  yellow: [{ from: 0, to: 40, width: 56, sat: 1.15, val: 1.10 }],
  dong:   [],
  yuan:   [{ from: 0, to: 210, width: 52, sat: .80, val: 1.00 }],
  wei:    [{ from: 0, to: 232, width: 54, sat: .92, val: .92 }],
  ship:   [{ from: 0, to: 168, width: 54, sat: .88, val: .98 }],
  wu:     [{ from: 0, to: 88, width: 54, sat: .86, val: .96 }],
};
