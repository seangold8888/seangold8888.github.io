/* 키캡 공방 — 파라메트릭 키캡 메쉬 & STL 생성기
 * 좌표계: mm 단위, z=0 이 키캡 바닥, +z 가 위.
 * 체리 MX 호환 십자 슬롯이 바닥에서 파여 있는 통짜(솔리드) 키캡.
 * FDM/레진 어느 쪽이든 그대로 출력 가능한 워터타이트 메쉬를 만든다.
 */
(function (root) {
  'use strict';

  var UNIT = 19.05;          // 1u 키 피치
  var BASE_1U = 18.2;        // 1u 키캡 바닥 폭
  var BASE_DEPTH = 18.2;     // 앞뒤 길이 (모든 크기 공통)
  var TAPER = 2.7;           // 옆면 기울기 (한쪽)
  var ROW_HEIGHT = { 1: 11.2, 2: 10.2, 3: 9.4, 4: 10.0 }; // 줄별 높이
  var SLOT_DEPTH = 3.8;      // 십자 슬롯 깊이
  var ARM_LEN = 4.15;        // 십자 팔 길이 (FDM 여유 포함)
  var ARM_W = 1.35;          // 십자 팔 두께 (FDM 여유 포함)
  var DISH_DEPTH = 1.0;      // 윗면 오목 깊이 (스페이스바는 0)

  function baseWidth(units) { return UNIT * (units - 1) + BASE_1U; }

  /* ---- 메쉬 생성 ---- */

  function buildKeycap(params) {
    var units = params.units || 1;
    var row = params.row || 3;
    var bw = baseWidth(units), bd = BASE_DEPTH;
    var bw2 = bw / 2, bd2 = bd / 2;
    var tw = bw - TAPER * 2, td = bd - TAPER * 2;
    var tw2 = tw / 2, td2 = td / 2;
    var H = ROW_HEIGHT[row] || ROW_HEIGHT[3];
    var dish = units >= 3 ? 0 : DISH_DEPTH;
    var hl = ARM_LEN / 2, hw = ARM_W / 2;
    var sd = SLOT_DEPTH;

    var tris = [];

    /* 윗면 격자 (오목면). 가장자리는 정확히 z=H 로 고정해 옆면과 맞물린다. */
    var nx = Math.min(60, Math.max(10, Math.round(tw / 1.1)));
    var ny = 12;
    var grid = [];
    for (var j = 0; j <= ny; j++) {
      var rowPts = [];
      for (var i = 0; i <= nx; i++) {
        var u = i / nx, v = j / ny;
        var x = -tw2 + tw * u;
        var y = -td2 + td * v;
        var z;
        if (i === 0 || i === nx || j === 0 || j === ny) {
          z = H;
        } else {
          var su = Math.sin(Math.PI * u), sv = Math.sin(Math.PI * v);
          z = H - dish * su * su * sv * sv;
        }
        rowPts.push([x, y, z]);
      }
      grid.push(rowPts);
    }
    for (j = 0; j < ny; j++) {
      for (i = 0; i < nx; i++) {
        var p00 = grid[j][i], p10 = grid[j][i + 1];
        var p11 = grid[j + 1][i + 1], p01 = grid[j + 1][i];
        tris.push([p00, p10, p11], [p00, p11, p01]); // 위쪽(+z) 방향
      }
    }

    /* 바닥면: 바깥 사각형 - 십자 구멍. 5x5 격자에서 십자 칸만 뺀다. */
    var xs = [-bw2, -hl, -hw, hw, hl, bw2];
    var ys = [-bd2, -hl, -hw, hw, hl, bd2];
    for (j = 0; j < 5; j++) {
      for (i = 0; i < 5; i++) {
        var inCross = (j === 2 && i >= 1 && i <= 3) || (i === 2 && j >= 1 && j <= 3);
        if (inCross) continue;
        var a = [xs[i], ys[j], 0], b = [xs[i + 1], ys[j], 0];
        var c = [xs[i + 1], ys[j + 1], 0], d = [xs[i], ys[j + 1], 0];
        tris.push([a, c, b], [a, d, c]); // 아래(-z) 방향
      }
    }

    /* 십자 슬롯 천장 (z=sd, 아래를 향한다): 중앙 + 팔 4개 */
    var ceil = [
      [-hw, hw, -hw, hw], [hw, hl, -hw, hw], [-hl, -hw, -hw, hw],
      [-hw, hw, hw, hl], [-hw, hw, -hl, -hw]
    ];
    for (i = 0; i < ceil.length; i++) {
      var r = ceil[i];
      a = [r[0], r[2], sd]; b = [r[1], r[2], sd];
      c = [r[1], r[3], sd]; d = [r[0], r[3], sd];
      tris.push([a, c, b], [a, d, c]);
    }

    /* 십자 슬롯 벽: 외곽선(위에서 볼 때 반시계) 을 z=0→sd 로 세운다.
       구멍 벽이므로 뒤집힌 감김새로 슬롯 안쪽을 향하게 한다. */
    var cross = [
      [hl, -hw], [hl, hw], [hw, hw], [hw, hl], [-hw, hl], [-hw, hw],
      [-hl, hw], [-hl, -hw], [-hw, -hw], [-hw, -hl], [hw, -hl], [hw, -hw]
    ];
    for (i = 0; i < cross.length; i++) {
      var pA = cross[i], pB = cross[(i + 1) % cross.length];
      var a0 = [pA[0], pA[1], 0], b0 = [pB[0], pB[1], 0];
      var a1 = [pA[0], pA[1], sd], b1 = [pB[0], pB[1], sd];
      tris.push([b0, a0, a1], [b0, a1, b1]);
    }

    /* 옆면 4개: 바닥 모서리 체인 ↔ 윗면 격자 가장자리 체인을 잇는다.
       바닥 체인은 바닥 격자 절단점과, 윗면 체인은 격자 꼭짓점과 정확히 공유된다. */
    function chainX(arr, y, z) {
      var out = [];
      for (var k = 0; k < arr.length; k++) out.push([arr[k], y, z]);
      return out;
    }
    function chainY(arr, x, z) {
      var out = [];
      for (var k = 0; k < arr.length; k++) out.push([x, arr[k], z]);
      return out;
    }
    function reversed(arr) { return arr.slice().reverse(); }
    function gridRow(jj) { return grid[jj].slice(); }
    function gridCol(ii) {
      var out = [];
      for (var k = 0; k <= ny; k++) out.push(grid[k][ii]);
      return out;
    }
    /* 두 체인(같은 진행 방향) 사이를 다리 놓듯 삼각분할 */
    function bridge(bottom, top, tAxis) {
      var i2 = 0, j2 = 0;
      function t(p) { return tAxis === 0 ? p[0] : tAxis === 1 ? p[1] : tAxis === 2 ? -p[0] : -p[1]; }
      while (i2 < bottom.length - 1 || j2 < top.length - 1) {
        var canB = i2 < bottom.length - 1, canT = j2 < top.length - 1;
        var takeB = canB && (!canT || t(bottom[i2 + 1]) <= t(top[j2 + 1]));
        if (takeB) { tris.push([bottom[i2], bottom[i2 + 1], top[j2]]); i2++; }
        else { tris.push([bottom[i2], top[j2 + 1], top[j2]]); j2++; }
      }
    }
    bridge(chainX(xs, -bd2, 0), gridRow(0), 0);                       // 앞 (y-)
    bridge(chainY(ys, bw2, 0), gridCol(nx), 1);                        // 오른쪽 (x+)
    bridge(chainX(reversed(xs), bd2, 0), reversed(gridRow(ny)), 2);    // 뒤 (y+)
    bridge(chainY(reversed(ys), -bw2, 0), reversed(gridCol(0)), 3);    // 왼쪽 (x-)

    return tris;
  }

  /* ---- 바이너리 STL ---- */

  function toBinarySTL(tris, name) {
    var count = tris.length;
    var buf = new ArrayBuffer(84 + count * 50);
    var view = new DataView(buf);
    var header = 'keycap-gongbang ' + (name || '');
    for (var i = 0; i < Math.min(80, header.length); i++) {
      view.setUint8(i, header.charCodeAt(i) & 0x7f);
    }
    view.setUint32(80, count, true);
    var off = 84;
    for (i = 0; i < count; i++) {
      var t = tris[i];
      var ax = t[1][0] - t[0][0], ay = t[1][1] - t[0][1], az = t[1][2] - t[0][2];
      var bx = t[2][0] - t[0][0], by = t[2][1] - t[0][1], bz = t[2][2] - t[0][2];
      var nx = ay * bz - az * by, ny = az * bx - ax * bz, nz = ax * by - ay * bx;
      var len = Math.sqrt(nx * nx + ny * ny + nz * nz) || 1;
      view.setFloat32(off, nx / len, true);
      view.setFloat32(off + 4, ny / len, true);
      view.setFloat32(off + 8, nz / len, true);
      off += 12;
      for (var v = 0; v < 3; v++) {
        view.setFloat32(off, t[v][0], true);
        view.setFloat32(off + 4, t[v][1], true);
        view.setFloat32(off + 8, t[v][2], true);
        off += 12;
      }
      view.setUint16(off, 0, true);
      off += 2;
    }
    return buf;
  }

  /* 부피(mm³) — 검증·사양서용 */
  function meshVolume(tris) {
    var vol = 0;
    for (var i = 0; i < tris.length; i++) {
      var a = tris[i][0], b = tris[i][1], c = tris[i][2];
      vol += (a[0] * (b[1] * c[2] - b[2] * c[1])
            + a[1] * (b[2] * c[0] - b[0] * c[2])
            + a[2] * (b[0] * c[1] - b[1] * c[0])) / 6;
    }
    return vol;
  }

  var api = {
    buildKeycap: buildKeycap,
    toBinarySTL: toBinarySTL,
    meshVolume: meshVolume,
    baseWidth: baseWidth,
    ROW_HEIGHT: ROW_HEIGHT,
    BASE_DEPTH: BASE_DEPTH,
    SLOT_DEPTH: SLOT_DEPTH,
    ARM_LEN: ARM_LEN,
    ARM_W: ARM_W
  };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else root.KeycapSTL = api;
})(typeof self !== 'undefined' ? self : this);
