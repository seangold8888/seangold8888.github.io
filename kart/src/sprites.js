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

  // 우리 아이들·장난꾸러기 뒤통수: 머리 모양으로 구분한다(얼굴은 뒤라 안 보인다)
  function drawKidHead(g, spec) {
    const OUT = '#4a3550';
    g.strokeStyle = OUT; g.lineWidth = 3;
    const hair = spec.hair;
    if (spec.style === 'pigtails') {
      [-1, 1].forEach(sd => {
        g.fillStyle = hair;
        g.beginPath(); g.ellipse(sd * 22, 2, 8, 13, sd * 0.4, 0, Math.PI * 2); g.fill(); g.stroke();
        g.fillStyle = spec.villain ? spec.horn : spec.color;
        g.beginPath(); g.arc(sd * 18, -8, 4.5, 0, Math.PI * 2); g.fill();
      });
    }
    g.fillStyle = hair;
    g.beginPath(); g.ellipse(0, -3, 21, 19, 0, 0, Math.PI * 2); g.fill(); g.stroke();
    // 귀(살색) 살짝
    g.fillStyle = spec.skin || '#ffd9ae';
    [-1, 1].forEach(sd => { g.beginPath(); g.ellipse(sd * 21, 0, 4.5, 6, 0, 0, Math.PI * 2); g.fill(); g.stroke(); });
    if (spec.style === 'spiky') {
      g.fillStyle = hair;
      for (let i = 0; i < 5; i++) {
        const x = -16 + i * 8;
        g.beginPath(); g.moveTo(x - 6, -14); g.lineTo(x, -30 - (i % 2) * 4); g.lineTo(x + 6, -14); g.closePath(); g.fill(); g.stroke();
      }
    } else if (spec.style === 'cap') {
      g.fillStyle = spec.color;
      g.beginPath(); g.arc(0, -6, 21, Math.PI, Math.PI * 2); g.closePath(); g.fill(); g.stroke();
      g.fillStyle = '#ffffff'; g.beginPath(); g.arc(0, -27, 3.5, 0, Math.PI * 2); g.fill();
      // 뒤로 꽂은 채집망
      g.strokeStyle = '#8a5a34'; g.lineWidth = 3.5;
      g.beginPath(); g.moveTo(14, 4); g.lineTo(30, -40); g.stroke();
      g.strokeStyle = OUT; g.lineWidth = 2.5; g.fillStyle = 'rgba(255,255,255,0.8)';
      g.beginPath(); g.ellipse(33, -48, 9, 11, 0.4, 0, Math.PI * 2); g.fill(); g.stroke();
    } else if (spec.style === 'band') {
      g.fillStyle = spec.villain ? spec.horn : '#ffffff';
      g.fillRect(-21, -10, 42, 6);
      if (!spec.villain) { g.fillStyle = spec.color; g.fillRect(-21, -8, 42, 2); }
    } else if (spec.style === 'bolt') {
      g.fillStyle = '#ffd400';
      g.beginPath(); g.arc(0, -5, 21, Math.PI, Math.PI * 2); g.closePath(); g.fill(); g.stroke();
      g.fillStyle = '#2b2b3a';
      g.beginPath(); g.moveTo(2, -24); g.lineTo(-6, -12); g.lineTo(0, -12); g.lineTo(-3, -2); g.lineTo(7, -15); g.lineTo(1, -15); g.closePath(); g.fill();
    }
    if (spec.style === 'pigtails' && !spec.villain) {
      g.fillStyle = '#ffe16d'; g.beginPath(); g.arc(12, -18, 4, 0, Math.PI * 2); g.fill();
    }
    if (spec.villain) {
      g.fillStyle = spec.horn; g.strokeStyle = OUT; g.lineWidth = 2.5;
      [-1, 1].forEach(sd => {
        g.beginPath(); g.moveTo(sd * 8, -18); g.quadraticCurveTo(sd * 18, -30, sd * 14, -40); g.lineTo(sd * 16, -18); g.closePath(); g.fill(); g.stroke();
      });
    }
    if (spec.id === 'yungeon') {                    // 축구공을 옆구리에
      g.fillStyle = '#ffffff'; g.strokeStyle = OUT; g.lineWidth = 2.5;
      g.beginPath(); g.arc(-30, 12, 8, 0, Math.PI * 2); g.fill(); g.stroke();
      g.fillStyle = '#2b2b3a'; g.beginPath(); g.arc(-30, 12, 3, 0, Math.PI * 2); g.fill();
    }
  }

  // 차고 꼭대기 장식
  function drawTopper(g, kind, time) {
    const OUT = '#4a3550';
    g.strokeStyle = OUT; g.lineWidth = 2.5;
    if (kind === 'crown') {
      g.fillStyle = '#ffc83a';
      g.beginPath(); g.moveTo(-16, -34); g.lineTo(-16, -48); g.lineTo(-8, -40); g.lineTo(0, -52); g.lineTo(8, -40); g.lineTo(16, -48); g.lineTo(16, -34); g.closePath();
      g.fill(); g.stroke();
      return;
    }
    g.strokeStyle = '#ffffff'; g.lineWidth = 3;
    g.beginPath(); g.moveTo(-28, -2); g.lineTo(-28, -62); g.stroke();
    g.strokeStyle = OUT; g.lineWidth = 2.5;
    if (kind === 'flag') {
      const w = Math.sin(time * 8) * 3;
      g.fillStyle = '#ff5c8a';
      g.beginPath(); g.moveTo(-28, -60); g.quadraticCurveTo(-10, -58 + w, -4, -50); g.quadraticCurveTo(-12, -44, -28, -44); g.closePath(); g.fill(); g.stroke();
    } else if (kind === 'aerial') {
      drawStarShape(g, -28, -66, 9, time, '#ffe066');
    } else {
      g.fillStyle = '#7fe0c4'; g.beginPath(); g.ellipse(-28, -74, 11, 14, 0, 0, Math.PI * 2); g.fill(); g.stroke();
    }
  }
  function drawStarShape(g, x, y, r, rot, color) {
    g.save(); g.translate(x, y); g.rotate(rot);
    g.beginPath();
    for (let i = 0; i < 10; i++) { const a = -Math.PI / 2 + i * Math.PI / 5, r2 = i % 2 ? r * 0.45 : r; g.lineTo(Math.cos(a) * r2, Math.sin(a) * r2); }
    g.closePath(); g.fillStyle = color; g.fill(); g.strokeStyle = '#a5762c'; g.lineWidth = 2; g.stroke();
    g.restore();
  }
  A.drawStarShape = drawStarShape;

  // 캐릭터 얼굴 — 뒤에서 본 모습이라 뒤통수+귀 위주로 단순하게
  function drawFace(g, id, accent, spec) {
    const OUT = '#4a3550';
    if (spec && spec.kid) { drawKidHead(g, spec); return; }
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
    } else if (id === 'kuromi') {
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
    } else if (id === 'pochaco') {
      // 포차코: 흰 머리에 검은 늘어진 귀
      g.fillStyle = '#ffffff'; g.strokeStyle = OUT; g.lineWidth = 3;
      g.beginPath(); g.ellipse(0, -3, 22, 19, 0, 0, Math.PI * 2); g.fill(); g.stroke();
      g.fillStyle = '#3d3350';
      [[-19, -8], [19, -8]].forEach(([ex, ey]) => {
        g.beginPath(); g.ellipse(ex, ey, 8, 13, ex < 0 ? 0.5 : -0.5, 0, Math.PI * 2);
        g.fill(); g.stroke();
      });
      // 뒤통수 하이라이트
      g.fillStyle = 'rgba(143,208,255,0.55)';
      g.beginPath(); g.ellipse(0, -12, 11, 5, 0, 0, Math.PI * 2); g.fill();
    } else if (id === 'gude') {
      // 구데타마: 흰자 위에 노른자. 늘 축 늘어져 있다.
      g.fillStyle = '#fffcf0'; g.strokeStyle = OUT; g.lineWidth = 3;
      g.beginPath();
      g.ellipse(0, 2, 26, 13, 0, 0, Math.PI * 2); g.fill(); g.stroke();
      g.fillStyle = '#ffe27a';
      g.beginPath(); g.ellipse(0, -5, 17, 15, 0, 0, Math.PI * 2); g.fill(); g.stroke();
      // 흘러내린 흰자 자락
      g.fillStyle = '#fffcf0';
      g.beginPath(); g.ellipse(-22, 6, 7, 5, 0.4, 0, Math.PI * 2); g.fill(); g.stroke();
      g.beginPath(); g.ellipse(22, 6, 7, 5, -0.4, 0, Math.PI * 2); g.fill(); g.stroke();
    } else {
      // 폼폼푸린: 노란 머리 + 갈색 베레모 + 늘어진 귀
      g.fillStyle = '#ffe27a'; g.strokeStyle = OUT; g.lineWidth = 3;
      g.beginPath(); g.ellipse(0, -2, 22, 19, 0, 0, Math.PI * 2); g.fill(); g.stroke();
      g.fillStyle = '#f3c85a';
      [[-19, -4], [19, -4]].forEach(([ex, ey]) => {
        g.beginPath(); g.ellipse(ex, ey, 7, 13, ex < 0 ? 0.45 : -0.45, 0, Math.PI * 2);
        g.fill(); g.stroke();
      });
      // 베레모 — 납작하게 얹어 귀가 가려지지 않게
      g.fillStyle = '#8a5a33';
      g.beginPath(); g.ellipse(0, -13, 21, 9, 0, Math.PI, Math.PI * 2); g.fill(); g.stroke();
      g.beginPath(); g.ellipse(0, -13, 23, 4, 0, 0, Math.PI * 2); g.fill(); g.stroke();
      g.fillStyle = '#6b4a28';
      g.beginPath(); g.arc(0, -22, 3.4, 0, Math.PI * 2); g.fill();
    }
  }

  // 칸막이에 부딪혔을 때 튀는 하트
  A.drawHeart = function (g, x, y, scale, alpha, rot) {
    g.save();
    g.translate(x, y);
    g.scale(scale, scale);
    if (rot) g.rotate(rot);
    g.globalAlpha = alpha;
    g.fillStyle = '#ff6f9d';
    g.strokeStyle = '#ffffff';
    g.lineWidth = 1.5;
    g.beginPath();
    // 위쪽 두 봉우리를 뚜렷하게. 외곽선이 두꺼우면 작은 크기에서 타원으로 뭉갠다.
    g.moveTo(0, 8);
    g.bezierCurveTo(-11, -1, -8.5, -13, 0, -6);
    g.bezierCurveTo(8.5, -13, 11, -1, 0, 8);
    g.closePath();
    g.fill(); g.stroke();
    g.fillStyle = 'rgba(255,255,255,0.65)';
    g.beginPath(); g.ellipse(-3.4, -4, 1.9, 1.3, -0.5, 0, Math.PI * 2); g.fill();
    g.restore();
  };

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

    // 통통 쿠션에서 튀어 오르는 중
    if (kart.hop > 0) g.translate(0, -Math.sin((1 - kart.hop / 0.7) * Math.PI) * 34);
    const lookK = kart.look || null;

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
    g.fillStyle = lookK && lookK.tire ? lookK.tire : '#4a3550';
    rr(g, -40, 4, 17, 24, 7); g.fill();
    rr(g, 23, 4, 17, 24, 7); g.fill();
    g.fillStyle = lookK && lookK.hub ? lookK.hub : '#8f7fa5';
    rr(g, -37, 9, 11, 13, 5); g.fill();
    rr(g, 26, 9, 11, 13, 5); g.fill();

    // 차체
    const body = g.createLinearGradient(0, -8, 0, 24);
    let paint = lookK && lookK.paint ? lookK.paint : spec.color;
    if (paint === 'rainbow') paint = hsl((time * 0.25) % 1);
    body.addColorStop(0, paint);
    body.addColorStop(1, shade(paint, -26));
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
    drawFace(g, spec.id, spec.accent, spec);
    if (lookK && lookK.topper) drawTopper(g, lookK.topper, time);
    g.restore();

    g.restore();
  };

  // 무지개 색칠용: 색상환 위치(0~1) → 파스텔 색
  function hsl(h) {
    const c = n => { const k = (n + h * 12) % 12; return Math.round(255 * (0.68 - 0.24 * Math.max(-1, Math.min(k - 3, 9 - k, 1)))); };
    return '#' + ((c(0) << 16) | (c(8) << 8) | c(4)).toString(16).padStart(6, '0');
  }
  A.hsl = hsl;

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

  // ---------- 코스 거리 그림 ----------
  A.drawCoin = function (g, x, y, s, time) {
    g.save(); g.translate(x, y - 14 * s); g.scale(s * (Math.abs(Math.cos(time * 3)) + 0.12), s);
    g.fillStyle = '#ffcf3a'; g.strokeStyle = '#a5762c'; g.lineWidth = 2.5;
    g.beginPath(); g.arc(0, 0, 11, 0, Math.PI * 2); g.fill(); g.stroke();
    g.fillStyle = '#fff3a6'; g.beginPath(); g.arc(-3, -3, 3.5, 0, Math.PI * 2); g.fill();
    g.restore();
  };
  A.drawObstacle = function (g, kind, x, y, s, time) {
    const OUT = '#4a3550';
    g.save(); g.translate(x, y); g.scale(s, s);
    g.fillStyle = 'rgba(40,30,50,0.25)'; g.beginPath(); g.ellipse(0, 4, 30, 8, 0, 0, Math.PI * 2); g.fill();
    g.strokeStyle = OUT; g.lineWidth = 3;
    if (kind === 'cup') {
      g.fillStyle = '#ff9ec4';
      g.beginPath(); g.moveTo(-26, -34); g.lineTo(26, -34); g.lineTo(18, 0); g.lineTo(-18, 0); g.closePath(); g.fill(); g.stroke();
      g.fillStyle = '#ffffff'; g.beginPath(); g.ellipse(0, -34, 26, 7, 0, 0, Math.PI * 2); g.fill(); g.stroke();
      g.beginPath(); g.arc(27 + Math.sin(time * 6) * 2, -18, 8, -1.2, 1.2); g.stroke();
      ['#ff5c8a', '#7fe0c4', '#ffd34d'].forEach((c, i) => { g.fillStyle = c; g.beginPath(); g.arc(-12 + i * 12 + Math.sin(time * 5) * 3, -18, 4, 0, Math.PI * 2); g.fill(); });
    } else if (kind === 'candy') {
      g.save(); g.translate(0, -24); g.rotate(time * 3);
      g.beginPath(); g.arc(0, 0, 24, 0, Math.PI * 2); g.fillStyle = '#ffffff'; g.fill();
      g.clip();
      g.fillStyle = '#ff5c8a';
      for (let i = -3; i <= 3; i++) g.fillRect(i * 14 - 4, -30, 7, 60);
      g.restore();
      g.beginPath(); g.arc(0, -24, 24, 0, Math.PI * 2); g.stroke();
    } else if (kind === 'crab') {
      const hop = Math.abs(Math.sin(time * 9)) * 3;
      g.translate(0, -hop);
      g.fillStyle = '#ff6b4a';
      g.beginPath(); g.ellipse(0, -12, 26, 14, 0, 0, Math.PI * 2); g.fill(); g.stroke();
      [-1, 1].forEach(sd => {
        g.fillStyle = '#ff6b4a';
        g.beginPath(); g.ellipse(sd * 32, -18, 9, 7, 0, 0, Math.PI * 2); g.fill(); g.stroke();
        g.fillStyle = '#ffffff'; g.beginPath(); g.arc(sd * 8, -30, 5, 0, Math.PI * 2); g.fill(); g.stroke();
        g.fillStyle = '#2b2b3a'; g.beginPath(); g.arc(sd * 8, -30, 2, 0, Math.PI * 2); g.fill();
      });
    } else {
      const sq = 1 + Math.sin(time * 4) * 0.08;
      g.scale(1 / sq, sq);
      drawStarShape(g, 0, -16, 26, 0, '#ffe066');
    }
    g.restore();
  };
  A.drawRing = function (g, x, y, s) {
    g.save(); g.translate(x, y - 40 * s); g.scale(s, s);
    ['#ff7aa8', '#ffd34d', '#7fe0c4', '#7fb8ff'].forEach((c, k) => {
      g.strokeStyle = c; g.lineWidth = 6;
      g.beginPath(); g.ellipse(0, 0, 44 - k * 6, 40 - k * 6, 0, 0, Math.PI * 2); g.stroke();
    });
    g.restore();
  };
  A.drawBalloon = function (g, x, y, s) {
    g.save(); g.translate(x, y - 18 * s); g.scale(s, s);
    g.fillStyle = 'rgba(92,200,255,0.9)'; g.strokeStyle = '#2f86b8'; g.lineWidth = 2.5;
    g.beginPath(); g.ellipse(0, 0, 14, 17, 0, 0, Math.PI * 2); g.fill(); g.stroke();
    g.fillStyle = 'rgba(255,255,255,0.7)'; g.beginPath(); g.ellipse(-5, -6, 4, 6, -0.4, 0, Math.PI * 2); g.fill();
    g.restore();
  };
  A.drawBat = function (g, x, y, s, time) {
    g.save(); g.translate(x, y - 16 * s); g.scale(s, s);
    const flap = Math.sin(time * 14) * 0.3;
    g.fillStyle = '#3a1a52'; g.strokeStyle = '#1b0f24'; g.lineWidth = 2;
    [-1, 1].forEach(sd => {
      g.save(); g.scale(sd, 1); g.rotate(flap);
      g.beginPath(); g.moveTo(4, 0); g.lineTo(26, -10); g.lineTo(20, 0); g.lineTo(28, 6); g.lineTo(6, 6); g.closePath(); g.fill(); g.stroke();
      g.restore();
    });
    g.fillStyle = '#5b2a86'; g.beginPath(); g.arc(0, 2, 8, 0, Math.PI * 2); g.fill(); g.stroke();
    g.restore();
  };
  // 번개 떨어질 자리 표시(바닥 원 + 번개)
  A.drawZapMark = function (g, x, y, s, time, left) {
    g.save(); g.translate(x, y);
    const blink = Math.floor(time * 10) % 2 === 0;
    g.fillStyle = blink ? 'rgba(255,225,77,0.45)' : 'rgba(255,225,77,0.22)';
    g.strokeStyle = '#ffe14d'; g.lineWidth = 3;
    g.beginPath(); g.ellipse(0, 0, 76 * s, 24 * s, 0, 0, Math.PI * 2); g.fill(); g.stroke();
    g.scale(s, s);
    g.translate(0, -60 - left * 40);
    g.fillStyle = '#ffe14d'; g.strokeStyle = '#3a2d0a'; g.lineWidth = 3;
    g.beginPath(); g.moveTo(6, -30); g.lineTo(-12, 0); g.lineTo(0, 0); g.lineTo(-6, 26); g.lineTo(14, -6); g.lineTo(2, -6); g.lineTo(10, -30); g.closePath(); g.fill(); g.stroke();
    g.restore();
  };

  SK.Sprites = A;
})();
