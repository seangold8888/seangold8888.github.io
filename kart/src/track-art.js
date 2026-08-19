// 산리오 카트 — 트랙 텍스처를 한 번만 구워 둔다(위에서 본 그림).
(function () {
  'use strict';
  window.SK = window.SK || {};

  SK.buildTrackTexture = function () {
    const T = SK.Track;
    const S = T.SIZE;
    const cv = document.createElement('canvas');
    cv.width = S; cv.height = S;
    const g = cv.getContext('2d');

    // ---- 초원 바닥 ----
    const grass = g.createLinearGradient(0, 0, S, S);
    grass.addColorStop(0, '#8fd36f');
    grass.addColorStop(1, '#6fbe58');
    g.fillStyle = grass;
    g.fillRect(0, 0, S, S);

    // 풀 무늬 (결정론적 배치 — 매번 같은 그림)
    let seed = 1234567;
    const rnd = () => (seed = (seed * 1664525 + 1013904223) >>> 0) / 4294967296;
    g.strokeStyle = 'rgba(90,170,70,0.55)';
    g.lineWidth = 4;
    for (let i = 0; i < 2600; i++) {
      const x = rnd() * S, y = rnd() * S;
      g.beginPath();
      g.moveTo(x, y);
      g.lineTo(x + rnd() * 10 - 5, y - 10 - rnd() * 10);
      g.stroke();
    }

    // ---- 지름길(풀이 눌린 오솔길) ----
    g.strokeStyle = '#c9d98a';
    g.lineWidth = T.SHORTCUT_HALF * 2;
    g.lineCap = 'round'; g.lineJoin = 'round';
    g.beginPath();
    T.shortcut.forEach((p, i) => i ? g.lineTo(p.x, p.y) : g.moveTo(p.x, p.y));
    g.stroke();

    // ---- 도로 ----
    function strokeCenter(width, style) {
      g.strokeStyle = style;
      g.lineWidth = width;
      g.lineCap = 'round'; g.lineJoin = 'round';
      g.beginPath();
      T.center.forEach((p, i) => i ? g.lineTo(p.x, p.y) : g.moveTo(p.x, p.y));
      g.closePath();
      g.stroke();
    }
    strokeCenter(T.ROAD_HALF * 2 + 26, '#f4b8cf');   // 분홍 테두리
    strokeCenter(T.ROAD_HALF * 2, '#e9dfd0');        // 흙길
    // 도로 결
    g.save();
    g.globalAlpha = 0.35;
    strokeCenter(T.ROAD_HALF * 1.1, '#dfd2be');
    g.restore();

    // 가운데 점선
    g.save();
    g.setLineDash([26, 30]);
    g.strokeStyle = 'rgba(255,255,255,0.6)';
    g.lineWidth = 7;
    g.beginPath();
    T.center.forEach((p, i) => i ? g.lineTo(p.x, p.y) : g.moveTo(p.x, p.y));
    g.closePath();
    g.stroke();
    g.restore();

    // 도로 가장자리 리본 말뚝
    for (let i = 0; i < T.center.length; i += 12) {
      const a = T.center[i], b = T.center[(i + 1) % T.center.length];
      const ang = Math.atan2(b.y - a.y, b.x - a.x);
      const nx = -Math.sin(ang), ny = Math.cos(ang);
      const off = T.ROAD_HALF + 24;
      [1, -1].forEach(side => {
        const px = a.x + nx * off * side, py = a.y + ny * off * side;
        g.fillStyle = (i / 12) % 2 ? '#ff8fb4' : '#fff3a6';
        g.beginPath(); g.arc(px, py, 10, 0, Math.PI * 2); g.fill();
        g.strokeStyle = '#8c5a72'; g.lineWidth = 2.5; g.stroke();
      });
    }

    // ---- 출발선 ----
    (function startLine() {
      const p = T.center[0];
      const nxt = T.center[3];
      const ang = Math.atan2(nxt.y - p.y, nxt.x - p.x);
      g.save();
      g.translate(p.x, p.y);
      g.rotate(ang);
      const w = T.ROAD_HALF * 2, h = 46;
      for (let ix = 0; ix < 2; ix++) {
        for (let iy = 0; iy < 10; iy++) {
          g.fillStyle = (ix + iy) % 2 ? '#ffffff' : '#3d3350';
          g.fillRect(-h / 2 + ix * (h / 2), -w / 2 + iy * (w / 10), h / 2, w / 10);
        }
      }
      g.restore();
    })();

    // ---- 꽃밭 장식 ----
    for (let i = 0; i < 420; i++) {
      const x = rnd() * S, y = rnd() * S;
      if (SK.Track.surfaceAt(x, y).kind !== 'grass') continue;
      const c = ['#ff9ec4', '#fff07a', '#ffffff', '#ffb3e6'][(rnd() * 4) | 0];
      g.fillStyle = c;
      for (let k = 0; k < 5; k++) {
        const a = (k / 5) * Math.PI * 2;
        g.beginPath();
        g.arc(x + Math.cos(a) * 7, y + Math.sin(a) * 7, 5, 0, Math.PI * 2);
        g.fill();
      }
      g.fillStyle = '#ffd94d';
      g.beginPath(); g.arc(x, y, 4.5, 0, Math.PI * 2); g.fill();
    }

    return cv;
  };
})();
