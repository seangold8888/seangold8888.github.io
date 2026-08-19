// 산리오 카트 — 카트와 아이템 그림 (전부 캔버스 도형, 외부 이미지 없음)
(function () {
  'use strict';
  window.SK = window.SK || {};
  const A = {};

  function rr(g, x, y, w, h, r) {
    r = Math.min(r, w / 2, h / 2);
    g.beginPath();
    g.moveTo(x + r, y);
    g.arcTo(x + w, y, x + w, y + h, r);
    g.arcTo(x + w, y + h, x, y + h, r);
    g.arcTo(x, y + h, x, y, r);
    g.arcTo(x, y, x + w, y, r);
    g.closePath();
  }

  // 캐릭터 얼굴 — 뒤에서 본 모습이라 뒤통수+귀 위주로 단순하게
  function drawFace(g, id, accent) {
    const OUT = '#4a3550';
    if (id === 'kitty') {
      g.fillStyle = '#ffffff'; g.strokeStyle = OUT; g.lineWidth = 3;
      g.beginPath(); g.ellipse(0, -3, 22, 19, 0, 0, Math.PI * 2); g.fill(); g.stroke();
      // 귀
      [[-16, -16], [16, -16]].forEach(([ex, ey]) => {
        g.beginPath(); g.moveTo(ex - 8, ey + 6); g.lineTo(ex, ey - 11); g.lineTo(ex + 8, ey + 6);
        g.closePath(); g.fill(); g.stroke();
      });
      // 리본
      g.fillStyle = '#ff5c8a';
      g.beginPath(); g.arc(17, -18, 7, 0, Math.PI * 2); g.fill(); g.stroke();
    } else if (id === 'melody') {
      g.fillStyle = '#ffffff'; g.strokeStyle = OUT; g.lineWidth = 3;
      g.beginPath(); g.ellipse(0, -3, 21, 19, 0, 0, Math.PI * 2); g.fill(); g.stroke();
      // 두건
      g.fillStyle = '#ff9ec4';
      g.beginPath(); g.arc(0, -6, 21, Math.PI, Math.PI * 2); g.fill(); g.stroke();
      // 긴 귀
      [[-14, -22], [14, -22]].forEach(([ex, ey]) => {
        g.fillStyle = '#ff9ec4';
        g.beginPath(); g.ellipse(ex, ey, 7, 15, ex < 0 ? 0.3 : -0.3, 0, Math.PI * 2);
        g.fill(); g.stroke();
      });
    } else if (id === 'cinna') {
      g.fillStyle = '#ffffff'; g.strokeStyle = OUT; g.lineWidth = 3;
      g.beginPath(); g.ellipse(0, -3, 22, 19, 0, 0, Math.PI * 2); g.fill(); g.stroke();
      // 늘어진 귀
      [[-20, -6], [20, -6]].forEach(([ex, ey]) => {
        g.beginPath(); g.ellipse(ex, ey, 8, 17, ex < 0 ? 0.45 : -0.45, 0, Math.PI * 2);
        g.fill(); g.stroke();
      });
    } else {
      // 쿠로미: 검은 두건 + 분홍 해골
      g.fillStyle = '#ffffff'; g.strokeStyle = OUT; g.lineWidth = 3;
      g.beginPath(); g.ellipse(0, -2, 21, 18, 0, 0, Math.PI * 2); g.fill(); g.stroke();
      g.fillStyle = '#3d3350';
      g.beginPath(); g.arc(0, -5, 21, Math.PI, Math.PI * 2); g.fill(); g.stroke();
      [[-15, -20], [15, -20]].forEach(([ex, ey]) => {
        g.beginPath(); g.moveTo(ex - 7, ey + 8); g.lineTo(ex, ey - 10); g.lineTo(ex + 7, ey + 8);
        g.closePath(); g.fill(); g.stroke();
      });
      g.fillStyle = '#ff9ec4';
      g.beginPath(); g.arc(0, -14, 6, 0, Math.PI * 2); g.fill();
    }
  }

  /**
   * 카트를 그린다. 뒤에서 보는 시점이라 좌우 기울기만 표현한다.
   * @param lean  -1..1 (드리프트/조향에 따른 기울기)
   */
  A.drawKart = function (g, kart, sx, sy, scale, lean, time) {
    const OUT = '#4a3550';
    const spec = kart.spec;
    g.save();
    g.translate(sx, sy);
    g.scale(scale, scale);

    // 그림자
    g.fillStyle = 'rgba(40,30,50,0.28)';
    g.beginPath(); g.ellipse(0, 26, 40, 11, 0, 0, Math.PI * 2); g.fill();

    // 부스터 불꽃
    if (kart.boost > 0) {
      const f = 1 + Math.sin(time * 30) * 0.25;
      g.fillStyle = '#ffd34d';
      [-20, 20].forEach(ox => {
        g.beginPath();
        g.moveTo(ox - 8, 18); g.quadraticCurveTo(ox, 34 + 14 * f, ox + 8, 18);
        g.closePath(); g.fill();
      });
      g.fillStyle = '#ff8f45';
      [-20, 20].forEach(ox => {
        g.beginPath();
        g.moveTo(ox - 4, 18); g.quadraticCurveTo(ox, 28 + 8 * f, ox + 4, 18);
        g.closePath(); g.fill();
      });
    }

    const bounce = Math.sin(kart.bob) * 1.6;
    g.translate(0, bounce);
    g.rotate(lean * 0.16);

    // 뒷바퀴
    g.fillStyle = '#4a3550';
    rr(g, -40, 4, 17, 24, 7); g.fill();
    rr(g, 23, 4, 17, 24, 7); g.fill();
    g.fillStyle = '#8f7fa5';
    rr(g, -37, 9, 11, 13, 5); g.fill();
    rr(g, 26, 9, 11, 13, 5); g.fill();

    // 차체
    const body = g.createLinearGradient(0, -8, 0, 24);
    body.addColorStop(0, spec.color);
    body.addColorStop(1, shade(spec.color, -26));
    g.fillStyle = body;
    g.strokeStyle = OUT; g.lineWidth = 3.5; g.lineJoin = 'round';
    rr(g, -32, -6, 64, 30, 12); g.fill(); g.stroke();

    // 뒷범퍼 하이라이트
    g.fillStyle = 'rgba(255,255,255,0.45)';
    rr(g, -26, -2, 52, 7, 4); g.fill();

    // 배기구
    g.fillStyle = '#6b5b78';
    g.beginPath(); g.arc(-13, 22, 4.5, 0, Math.PI * 2); g.fill();
    g.beginPath(); g.arc(13, 22, 4.5, 0, Math.PI * 2); g.fill();

    // 캐릭터
    g.save();
    g.translate(0, -20);
    drawFace(g, spec.id, spec.accent);
    g.restore();

    g.restore();
  };

  function shade(hex, amt) {
    const n = parseInt(hex.slice(1), 16);
    const r = Math.max(0, Math.min(255, (n >> 16) + amt));
    const gg = Math.max(0, Math.min(255, ((n >> 8) & 255) + amt));
    const b = Math.max(0, Math.min(255, (n & 255) + amt));
    return '#' + ((r << 16) | (gg << 8) | b).toString(16).padStart(6, '0');
  }

  // 아이템 상자
  A.drawItemBox = function (g, sx, sy, scale, time) {
    g.save();
    g.translate(sx, sy);
    g.scale(scale, scale);
    g.rotate(Math.sin(time * 2) * 0.25);
    const gr = g.createLinearGradient(-20, -20, 20, 20);
    gr.addColorStop(0, '#fff3a6');
    gr.addColorStop(1, '#ffd34d');
    g.fillStyle = gr;
    g.strokeStyle = '#a5762c'; g.lineWidth = 3;
    rr(g, -20, -20, 40, 40, 10); g.fill(); g.stroke();
    g.fillStyle = '#fff';
    g.font = '900 24px "Malgun Gothic", sans-serif';
    g.textAlign = 'center'; g.textBaseline = 'middle';
    g.fillText('?', 0, 1);
    g.textBaseline = 'alphabetic';
    g.restore();
  };

  // 던져진 리본 (미끄럼 아이템)
  A.drawRibbon = function (g, sx, sy, scale, time) {
    g.save();
    g.translate(sx, sy);
    g.scale(scale, scale);
    g.rotate(time * 6);
    g.fillStyle = '#ff7aa8';
    g.strokeStyle = '#8c4a63'; g.lineWidth = 2.5;
    [[-1, 0], [1, 0]].forEach(([s]) => {
      g.beginPath();
      g.moveTo(0, 0);
      g.quadraticCurveTo(s * 18, -12, s * 20, 2);
      g.quadraticCurveTo(s * 16, 10, 0, 0);
      g.fill(); g.stroke();
    });
    g.fillStyle = '#ffd34d';
    g.beginPath(); g.arc(0, 0, 5, 0, Math.PI * 2); g.fill(); g.stroke();
    g.restore();
  };

  SK.Sprites = A;
})();
