// 산리오 카트 — 트랙 텍스처를 한 번만 구워 둔다(위에서 본 그림).
(function () {
  'use strict';
  window.SK = window.SK || {};

  SK.buildTrackTexture = function (track) {
    const T = track || SK.Track;
    const TH = T.theme;
    const S = T.SIZE;
    const cv = document.createElement('canvas');
    cv.width = S; cv.height = S;
    const g = cv.getContext('2d');

    // ---- 초원 바닥 ----
    const grass = g.createLinearGradient(0, 0, S, S);
    grass.addColorStop(0, TH.ground1);
    grass.addColorStop(1, TH.ground2);
    g.fillStyle = grass;
    g.fillRect(0, 0, S, S);

    // 풀 무늬 (결정론적 배치 — 매번 같은 그림)
    let seed = 1234567;
    const rnd = () => (seed = (seed * 1664525 + 1013904223) >>> 0) / 4294967296;
    g.strokeStyle = TH.blade;
    g.lineWidth = 4;
    for (let i = 0; i < TH.blades; i++) {
      const x = rnd() * S, y = rnd() * S;
      g.beginPath();
      g.moveTo(x, y);
      g.lineTo(x + rnd() * 10 - 5, y - 10 - rnd() * 10);
      g.stroke();
    }

    // ---- 지름길(풀이 눌린 오솔길) ----
    if (T.shortcut) {
      g.strokeStyle = TH.path;
      g.lineWidth = T.SHORTCUT_HALF * 2;
      g.lineCap = 'round'; g.lineJoin = 'round';
      g.beginPath();
      T.shortcut.forEach((p, i) => i ? g.lineTo(p.x, p.y) : g.moveTo(p.x, p.y));
      g.stroke();
    }

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
    strokeCenter(T.ROAD_HALF * 2 + 26, TH.roadEdge);   // 테두리
    strokeCenter(T.ROAD_HALF * 2, TH.road);            // 노면
    // 도로 결
    g.save();
    g.globalAlpha = 0.35;
    strokeCenter(T.ROAD_HALF * 1.1, TH.grain);
    g.restore();

    // 가운데 점선
    g.save();
    g.setLineDash([26, 30]);
    g.strokeStyle = TH.dash;
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
        g.fillStyle = (i / 12) % 2 ? TH.postA : TH.postB;
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

    // ---- 풀밭 장식 (테마마다 다른 모양) ----
    for (let i = 0; i < 460; i++) {
      const x = rnd() * S, y = rnd() * S;
      if (T.surfaceAt(x, y).kind !== 'grass') continue;
      const c = TH.decorColors[(rnd() * TH.decorColors.length) | 0];
      g.fillStyle = c;
      if (TH.decor === 'flower') {
        for (let k = 0; k < 5; k++) {
          const a = (k / 5) * Math.PI * 2;
          g.beginPath();
          g.arc(x + Math.cos(a) * 7, y + Math.sin(a) * 7, 5, 0, Math.PI * 2);
          g.fill();
        }
        g.fillStyle = '#ffd94d';
        g.beginPath(); g.arc(x, y, 4.5, 0, Math.PI * 2); g.fill();
      } else if (TH.decor === 'shell') {
        g.beginPath(); g.arc(x, y, 7 + rnd() * 4, Math.PI, Math.PI * 2); g.fill();
        g.strokeStyle = 'rgba(140,90,60,0.35)'; g.lineWidth = 1.5;
        for (let k = 1; k < 4; k++) {
          g.beginPath(); g.arc(x, y, (7 + rnd() * 2) * k / 4, Math.PI, Math.PI * 2); g.stroke();
        }
      } else if (TH.decor === 'candy') {
        g.beginPath(); g.arc(x, y, 7, 0, Math.PI * 2); g.fill();
        g.fillStyle = '#ffffff';
        g.beginPath(); g.arc(x - 2, y - 2, 2.4, 0, Math.PI * 2); g.fill();
        g.strokeStyle = c; g.lineWidth = 3;
        g.beginPath(); g.moveTo(x, y + 7); g.lineTo(x, y + 17); g.stroke();
      } else {
        // 별: 밤길에서 바닥이 반짝인다
        const r = 4 + rnd() * 4;
        g.beginPath();
        for (let k = 0; k < 10; k++) {
          const a = (k / 10) * Math.PI * 2 - Math.PI / 2;
          const rr = k % 2 ? r * 0.42 : r;
          const px = x + Math.cos(a) * rr, py = y + Math.sin(a) * rr;
          k ? g.lineTo(px, py) : g.moveTo(px, py);
        }
        g.closePath(); g.fill();
      }
    }

    return cv;
  };
})();
