// 화면 안전 구역(모든 종목 view 공용, DOM 없음 → Node 테스트).
//  위: 점수판(HUD) 띠 → 그 아래 알림 띠(배너 한 줄) · 아래: 큰 톡 버튼 띠(세로 화면은 가운데라 전체 폭, 가로는 오른쪽 구석만).
//  아이(주인공)는 남은 칸 안에: 발은 아래 띠 바로 위에 붙이고, 머리는 알림 띠 아래로(안 되면 최소한 점수판 아래로).
//  CSS(style.css)의 .hud·.fx-banner·.tap-btn 크기와 같은 식을 쓴다 — 하나를 바꾸면 둘 다 바꿀 것.

export const MARGIN = 8;
const clamp = (x, a, b) => Math.max(a, Math.min(b, x));

export const isShort = (W, H) => W > H && H < 500;               // 폰 가로

// 큰 톡 버튼 지름(.tap-btn: clamp(96px, 16vmin, 136px))
export function tapSize(W, H) { return clamp(Math.min(W, H) * 0.16, 96, 136); }

// 점수판 띠 높이(.hud 위 여백 8 + 칩 46|40 + 줄 사이 8 + 콤보 줄(.hud-sub min-height))
export function hudBand(W, H) {
  if (isShort(W, H)) return 8 + 40 + 6 + 26;
  return Math.round(8 + 46 + 8 + comboLine(W, H));
}
export function comboLine(W, H) { return isShort(W, H) ? 26 : Math.round(clamp(W * 0.04, 22, 34) * 1.2); }

// 알림 띠(배너) 높이(.fx-banner: 위아래 여백 + 큰 글자 + 작은 글자 + 그림자)
export function bannerHeight(W, H) {
  if (isShort(W, H)) return 58;
  const v = Math.min(W, H), b = clamp(v * 0.06, 28, 52), s = clamp(v * 0.026, 14, 20);
  return Math.round(22 + b * 1.22 + s * 1.3 + 8);
}

// W·H = 화면(px). hudBottom = 실제 점수판 아래 끝(재어서 주면 그것, 없으면 식으로). tap = 큰 톡 버튼이 보이는가.
// demoCard = 첫 화면 시연: 메뉴 카드 {x,y,w,h}(그 밖 빈 칸에 아이를 둔다, 점수판·배너 없음).
export function safeArea({ W, H, hudBottom = null, tap = true, demoCard = null, topBar = 0 } = {}) {
  const landscape = W > H;
  let left = 0, right = W;
  if (demoCard) {
    const top = Math.max(topBar, MARGIN);
    let bottom = H - MARGIN;
    if (landscape) right = Math.max(W * 0.3, demoCard.x - MARGIN);
    else bottom = Math.max(H * 0.3, demoCard.y - MARGIN);
    return { W, H, landscape, demo: true, top, bannerTop: top, bannerBottom: top, bottom, left, right, tap: null };
  }
  const top = Math.round(hudBottom != null ? hudBottom : hudBand(W, H));
  const bannerTop = top + 4, bannerBottom = bannerTop + bannerHeight(W, H);
  const t = tapSize(W, H);
  const tapRect = tap ? (landscape ? { x: W - 18 - t, y: H - 14 - t, w: t, h: t } : { x: (W - t) / 2, y: H - 14 - t, w: t, h: t }) : null;
  const bottom = tapRect && !landscape ? tapRect.y - MARGIN : H - MARGIN;
  return { W, H, landscape, demo: false, top, bannerTop, bannerBottom, bottom, left, right, tap: tapRect };
}

// 아이 키가 kidPx(화면 px)일 때 발이 올 화면 y. footPad = 발 밑에 더 비울 것(타이밍 고리 등), bias 0 = 아래에 붙임 · 1 = 위로.
// fits = 머리가 알림 띠 아래까지 들어가는가.
export function feetFor(sa, kidPx, { footPad = 0, headPad = 6, bias = 0 } = {}) {
  const lo = sa.bottom - footPad;
  const hi = sa.bannerBottom + headPad + kidPx;
  if (hi <= lo) return { feet: lo - (lo - hi) * clamp(bias, 0, 1), fits: true };
  // 안 들어감: 발이 아래 여백(화면 끝 2px 까지)으로 조금 내려가도 얼굴은 알림 띠 아래로 → 그래도 안 되면 점수판 아래만 지킨다
  if (hi <= sa.H - 2) return { feet: hi, fits: true, slip: hi - lo };
  return { feet: Math.max(sa.H - 2, Math.min(sa.top + headPad + kidPx, sa.H + kidPx * 0.1)), fits: false };
}
// 아이가 알림 띠 아래에 다 들어가는 가장 큰 키(px)
export function maxKidPx(sa, { footPad = 0, headPad = 6 } = {}) { return Math.max(40, sa.bottom - footPad - sa.bannerBottom - headPad); }

export function rectsOverlap(a, b, pad = 0) {
  if (!a || !b) return false;
  return a.x < b.x + b.w + pad && b.x < a.x + a.w + pad && a.y < b.y + b.h + pad && b.y < a.y + a.h + pad;
}
// 아이 상자가 안전 구역(점수판 아래 ~ 아래 띠 위, 화면 안)에 다 들어가는가. tol = 허용(px)
export function insideSafe(r, sa, tol = 2) {
  return r.x >= sa.left - tol && r.x + r.w <= sa.right + tol && r.y >= sa.top - tol && r.y + r.h <= sa.bottom + tol;
}
// 얼굴 자리(아이 상자 위쪽 22%)
export function faceRect(r) { return { x: r.x + r.w * 0.2, y: r.y, w: r.w * 0.6, h: r.h * 0.22 }; }
