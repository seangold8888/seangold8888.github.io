// 산리오 카트 — Mode 7 바닥 렌더러
// 위에서 본 트랙 그림을, 화면 아래쪽에 원근을 넣어 깔아 준다.
// 스캔라인마다 회전·축소한 트랙을 drawImage로 한 줄씩 그린다(2D 캔버스, GPU 가속).
//
// 좌표 약속
//   카메라가 보는 방향(전방) = ( sin a, -cos a)
//   그 오른쪽             = ( cos a,  sin a)
//   화면 행 sy 는 전방거리 d 를 비춘다:  sy = horizonY + fov*height/d
//   그 행에서 월드 1픽셀은 화면 zoom = height/d 픽셀로 보인다.
// project()는 이 두 식을 그대로 뒤집은 것이라 그림과 스프라이트가 어긋나지 않는다.
(function () {
  'use strict';
  window.SK = window.SK || {};

  const M = {};

  M.makeCamera = function () {
    return { x: 0, y: 0, angle: 0, height: 150, fov: 320, horizon: 0.42 };
  };

  M.drawGround = function (ctx, tex, cam, W, H, step, groundColor) {
    step = step || 1;
    const horizonY = Math.floor(H * cam.horizon);
    const cs = Math.cos(cam.angle);
    const sn = Math.sin(cam.angle);

    ctx.save();
    ctx.beginPath();
    ctx.rect(0, horizonY, W, H - horizonY);
    ctx.clip();

    // 트랙 그림은 유한하다. 그 바깥(먼 곳·옆)이 검게 남지 않도록 먼저 들판 색으로 채운다.
    ctx.fillStyle = groundColor || '#7fbe62';
    ctx.fillRect(0, horizonY, W, H - horizonY);

    for (let sy = horizonY; sy < H; sy += step) {
      const depth = (sy - horizonY) + 1;      // 지평선에서 얼마나 내려왔나
      const d = cam.fov * cam.height / depth; // 이 행이 비추는 전방 거리
      const zoom = cam.height / d;            // 월드 1픽셀 → 화면 zoom 픽셀

      // 이 행 한가운데가 비추는 월드 지점
      const worldX = cam.x + sn * d;
      const worldY = cam.y - cs * d;

      ctx.save();
      ctx.beginPath();
      ctx.rect(0, sy, W, step);
      ctx.clip();
      ctx.translate(W * 0.5, sy);
      ctx.rotate(-cam.angle);
      ctx.scale(zoom, zoom);
      ctx.drawImage(tex, -worldX, -worldY);
      ctx.restore();
    }
    ctx.restore();
  };

  // 월드 좌표 → 화면 좌표. 카메라 뒤면 null.
  M.project = function (wx, wy, cam, W, H) {
    const dx = wx - cam.x;
    const dy = wy - cam.y;
    const cs = Math.cos(cam.angle);
    const sn = Math.sin(cam.angle);

    const forward = dx * sn - dy * cs;   // 전방 거리
    const right = dx * cs + dy * sn;     // 오른쪽 거리
    if (forward <= 8) return null;       // 뒤 또는 코앞

    const horizonY = Math.floor(H * cam.horizon);
    const zoom = cam.height / forward;
    const sy = horizonY + cam.fov * cam.height / forward;
    const sx = W * 0.5 + right * zoom;
    if (sy > H + 400) return null;
    return { x: sx, y: sy, zoom: zoom, forward: forward };
  };

  SK.Mode7 = M;
})();
