/* 매일 수학 10분 — 그림(십틀·수 모형) SVG 생성기. 순수 문자열 빌더.
   색: 파랑 = 첫째 수, 주황 = 둘째 수, 회색 X = 지운 것. 숫자는 그림에 넣지 않는다. */
(function (root) {
  "use strict";
  const BLUE = "#2b6cb0", ORANGE = "#ed8936", INK = "#4a5568", LINE = "#a0aec0", PALE = "#edf2f7";

  function esc(n) { return String(n); }

  // 십틀 한 장: 2행 5열. cells = [{fill: 'a'|'b'|'x'|'', hidden?}] 길이 10 (초과는 무시)
  function frame(cells, x, y, size) {
    const s = size || 34, gap = 4;
    let out = "";
    for (let i = 0; i < 10; i++) {
      const r = Math.floor(i / 5), c = i % 5;
      const cx = x + c * (s + gap), cy = y + r * (s + gap);
      out += '<rect x="' + cx + '" y="' + cy + '" width="' + s + '" height="' + s + '" rx="6" fill="' + PALE + '" stroke="' + LINE + '" stroke-width="2"/>';
      const cell = cells[i];
      if (!cell || !cell.fill) continue;
      const color = cell.fill === "b" ? ORANGE : BLUE;
      if (cell.fill === "?") {
        out += '<circle cx="' + (cx + s / 2) + '" cy="' + (cy + s / 2) + '" r="' + (s * 0.34) + '" fill="none" stroke="' + ORANGE + '" stroke-width="3" stroke-dasharray="4 3"/>';
        continue;
      }
      out += '<circle cx="' + (cx + s / 2) + '" cy="' + (cy + s / 2) + '" r="' + (s * 0.34) + '" fill="' + color + '"/>';
      if (cell.cross) {
        const m = s * 0.22;
        out += '<path d="M' + (cx + m) + ' ' + (cy + m) + ' L' + (cx + s - m) + ' ' + (cy + s - m) + ' M' + (cx + s - m) + ' ' + (cy + m) + ' L' + (cx + m) + ' ' + (cy + s - m) + '" stroke="' + INK + '" stroke-width="4" stroke-linecap="round"/>';
      }
    }
    return out;
  }

  function svg(w, h, body, label) {
    return '<svg viewBox="0 0 ' + w + ' ' + h + '" width="100%" role="img" aria-label="' + esc(label || "") + '" xmlns="http://www.w3.org/2000/svg">' + body + "</svg>";
  }

  // v = { total, a, b?, cross?, ask } — 점 total 개를 십틀(최대 2장)에 놓는다.
  // 앞 a 개 파랑, 다음 b 개 주황(없으면 나머지 전부 주황), 뒤에서 cross 개는 X 표시.
  // ask === 'b' 이고 reveal 이 아니면 주황 자리를 점선 원(세어 볼 자리)으로 보여 준다.
  function dots(v, reveal) {
    const total = v.total, a = v.a, cross = v.cross || 0;
    const cells = [];
    for (let i = 0; i < total; i++) {
      let fill = i < a ? "a" : (v.b != null && i >= a + v.b ? "c" : "b");
      if (fill === "c") fill = "b";
      const cell = { fill: fill };
      // 지운 점은 원래 무리(파랑)에 X 표시 — "8개에서 2개를 지우면"
      if (i >= total - cross) { cell.cross = true; cell.fill = "a"; }
      if (!reveal && v.ask === "b" && fill === "b" && !cell.cross) cell.fill = "?";
      cells.push(cell);
    }
    // ask 'b' with hidden part: the unknown part is what remains after a (and after crossing)
    if (total <= 10) return svg(200, 84, frame(cells, 5, 5), total + "개 십틀");
    return svg(200, 170, frame(cells.slice(0, 10), 5, 5) + frame(cells.slice(10), 5, 91), total + "개 십틀 두 장");
  }

  // 수 모형: 십 막대 + 낱개. a 와 b 를 위아래 두 줄로. op '−' 이면 b 만큼 a 에서 X.
  function blocks(v) {
    const rows = [];
    function row(n, y, color, crossCount) {
      const tens = Math.floor(n / 10), ones = n % 10;
      let out = "", x = 5;
      for (let t = 0; t < tens; t++) {
        out += '<rect x="' + x + '" y="' + y + '" width="14" height="60" rx="3" fill="' + color + '"/>';
        for (let k = 1; k < 10; k++) out += '<line x1="' + x + '" y1="' + (y + k * 6) + '" x2="' + (x + 14) + '" y2="' + (y + k * 6) + '" stroke="#fff" stroke-width="1"/>';
        x += 18;
      }
      x += tens ? 8 : 0;
      for (let o = 0; o < ones; o++) {
        const cx = x + (o % 5) * 13, cy = y + Math.floor(o / 5) * 13 + 34;
        out += '<rect x="' + cx + '" y="' + cy + '" width="11" height="11" rx="2" fill="' + color + '"/>';
      }
      return out;
    }
    if (v.op === "+") {
      rows.push(row(v.a, 5, BLUE));
      rows.push(row(v.b, 75, ORANGE));
      return svg(230, 145, rows.join(""), v.a + " 더하기 " + v.b + " 수 모형");
    }
    // 뺄셈: a 를 그리고 b 만큼 뒤에서 X
    const tensA = Math.floor(v.a / 10), onesA = v.a % 10, tensB = Math.floor(v.b / 10), onesB = v.b % 10;
    let out = row(v.a, 5, BLUE), x = 5;
    for (let t = 0; t < tensA; t++) {
      if (t >= tensA - tensB) out += '<path d="M' + x + ' 5 L' + (x + 14) + ' 65 M' + (x + 14) + ' 5 L' + x + ' 65" stroke="' + INK + '" stroke-width="3"/>';
      x += 18;
    }
    x += tensA ? 8 : 0;
    for (let o = 0; o < onesA; o++) {
      if (o >= onesA - onesB) {
        const cx = x + (o % 5) * 13, cy = 5 + Math.floor(o / 5) * 13 + 34;
        out += '<path d="M' + cx + ' ' + cy + ' L' + (cx + 11) + ' ' + (cy + 11) + ' M' + (cx + 11) + ' ' + cy + ' L' + cx + ' ' + (cy + 11) + '" stroke="' + INK + '" stroke-width="2.5"/>';
      }
    }
    return svg(230, 75, out, v.a + " 빼기 " + v.b + " 수 모형");
  }

  // 받아올림: a 를 첫 십틀에, b 중 (10-a) 개가 첫 십틀을 채우고 나머지가 둘째 십틀로.
  function carry(v, reveal) {
    const fillA = [], fillB = [];
    const need = 10 - v.a, rest = v.b - need;
    for (let i = 0; i < 10; i++) fillA.push({ fill: i < v.a ? "a" : (reveal ? "b" : "?") });
    for (let i = 0; i < 10; i++) fillB.push({ fill: i < rest ? (reveal ? "b" : "?") : "" });
    return svg(200, 170, frame(fillA, 5, 5) + frame(fillB, 5, 91), v.a + " 더하기 " + v.b + ", 10을 만들어 더하기");
  }

  // 받아내림: a(십몇) 를 두 십틀에, b 를 첫 십틀(10)에서 지운다 → 남은 것 + 둘째 십틀.
  function borrow(v, reveal) {
    const fillA = [], fillB = [];
    for (let i = 0; i < 10; i++) fillA.push({ fill: "a", cross: reveal && i >= 10 - v.b });
    for (let i = 0; i < 10; i++) fillB.push({ fill: i < v.a - 10 ? "a" : "" });
    return svg(200, 170, frame(fillA, 5, 5) + frame(fillB, 5, 91), v.a + " 빼기 " + v.b + ", 10에서 먼저 빼기");
  }

  // ---- 13단계 이상: 묶음·자리 모형·자리 카드·분수 막대 (가볍게, 그림자·필터 없음) ----
  // 묶음 하나 = 둥근 상자. 10개 이상이면 십 막대(세로) + 낱개(4개씩 세로 줄)
  function groupBox(size, x, y, color) {
    const tens = Math.floor(size / 10), ones = size % 10;
    let out = "";
    if (tens) {
      for (let t = 0; t < tens; t++) out += '<rect x="' + (x + 4 + t * 9) + '" y="' + (y + 4) + '" width="6" height="36" rx="2" fill="' + color + '"/>';
      const ox = x + 4 + tens * 9 + 3;
      for (let o = 0; o < ones; o++) out += '<rect x="' + (ox + Math.floor(o / 4) * 9) + '" y="' + (y + 4 + (o % 4) * 9) + '" width="7" height="7" rx="1.5" fill="' + color + '"/>';
      return out;
    }
    for (let o = 0; o < size; o++) out += '<circle cx="' + (x + 10 + (o % 5) * 12) + '" cy="' + (y + 10 + Math.floor(o / 5) * 12) + '" r="4.5" fill="' + color + '"/>';
    return out;
  }
  function groupSize(size) {
    const tens = Math.floor(size / 10), ones = size % 10;
    if (tens) return [8 + tens * 9 + (ones ? 3 + Math.ceil(ones / 4) * 9 : 0), 44];
    return [8 + Math.min(size, 5) * 12, 8 + Math.ceil(size / 5) * 12];
  }
  // v = { size, count, left? } — size 개씩 count 묶음, 남는 left 개는 주황 점선 상자
  function groups(v) {
    const size = Math.max(1, v.size), count = Math.max(0, v.count), left = v.left || 0;
    const wh = groupSize(size), gw = wh[0], gh = wh[1], W = 360, gap = 6;
    const per = Math.max(1, Math.floor((W - 10 + gap) / (gw + gap))), slots = count + (left ? 1 : 0);
    let out = "";
    for (let i = 0; i < slots; i++) {
      const x = 5 + (i % per) * (gw + gap), y = 5 + Math.floor(i / per) * (gh + gap);
      if (i < count) {
        out += '<rect x="' + x + '" y="' + y + '" width="' + gw + '" height="' + gh + '" rx="8" fill="' + PALE + '" stroke="' + LINE + '" stroke-width="2"/>';
        out += groupBox(size, x, y, BLUE);
      } else {
        out += '<rect x="' + x + '" y="' + y + '" width="' + gw + '" height="' + gh + '" rx="8" fill="none" stroke="' + ORANGE + '" stroke-width="2" stroke-dasharray="5 4"/>';
        out += groupBox(left, x, y, ORANGE);
      }
    }
    // 묶음이 적으면 그림 폭을 줄여 크게 보이게 한다(화면에서 width 100%, 높이는 CSS 가 180px 로 막는다)
    const rows = Math.max(1, Math.ceil(slots / per)), H = 10 + rows * gh + (rows - 1) * gap;
    const used = 10 + Math.min(per, slots) * (gw + gap) - gap;
    return svg(Math.max(used, 120), H, out, size + "개씩 " + count + "묶음" + (left ? ", 남은 " + left + "개" : "") + " 그림");
  }
  // 세 자리 수 모형: 백(큰 네모) · 십(막대) · 일(작은 네모). a 파랑 줄, b 주황 줄
  function placeRow(n, y, color) {
    const h = Math.floor(n / 100), t = Math.floor(n / 10) % 10, o = n % 10;
    let out = "", x = 5;
    for (let i = 0; i < h; i++, x += 28) {
      out += '<rect x="' + x + '" y="' + y + '" width="24" height="24" rx="3" fill="' + color + '"/>';
      out += '<path d="M' + (x + 8) + ' ' + y + 'v24M' + (x + 16) + ' ' + y + 'v24M' + x + ' ' + (y + 8) + 'h24M' + x + ' ' + (y + 16) + 'h24" stroke="#fff" stroke-width="1"/>';
    }
    x += h ? 6 : 0;
    for (let i = 0; i < t; i++, x += 8) out += '<rect x="' + x + '" y="' + y + '" width="5" height="24" rx="1.5" fill="' + color + '"/>';
    x += t ? 6 : 0;
    for (let i = 0; i < o; i++) out += '<rect x="' + (x + Math.floor(i / 2) * 8) + '" y="' + (y + 4 + (i % 2) * 9) + '" width="6" height="6" rx="1" fill="' + color + '"/>';
    return out;
  }
  function place(v) {
    return svg(390, 70, placeRow(v.a, 5, BLUE) + placeRow(v.b, 41, ORANGE), v.a + (v.op === "+" ? " 더하기 " : " 빼기 ") + v.b + " 수 모형");
  }
  // 자리 카드: count 칸 중 물어보는 자리(at)를 주황으로. 숫자는 문제 글자에만.
  function digits(v) {
    let out = "";
    for (let i = 0; i < v.count; i++) {
      const on = i === v.at, x = 5 + i * 48;
      out += '<rect x="' + x + '" y="5" width="40" height="48" rx="8" fill="' + (on ? "#fde7cf" : PALE) + '" stroke="' + (on ? ORANGE : LINE) + '" stroke-width="' + (on ? 4 : 2) + '"/>';
    }
    out += '<path d="M' + (5 + v.at * 48 + 20) + ' 62 l-7 8 h14 z" fill="' + ORANGE + '"/>';
    return svg(10 + v.count * 48, 74, out, v.count + "자리 수의 자리 카드");
  }
  // 분수: per 가 있으면 den 묶음(묶음마다 per 개) 중 num 묶음이 파랑, 없으면 막대를 den 칸으로 나눠 num 칸 색칠
  function fraction(v) {
    if (v.per) {
      const wh = groupSize(v.per), gw = wh[0], gh = wh[1];
      let out = "";
      for (let i = 0; i < v.den; i++) {
        const x = 5 + i * (gw + 6);
        out += '<rect x="' + x + '" y="5" width="' + gw + '" height="' + gh + '" rx="8" fill="' + (i < v.num ? "#e3edf9" : PALE) + '" stroke="' + (i < v.num ? BLUE : LINE) + '" stroke-width="2"/>';
        out += groupBox(v.per, x, 5, i < v.num ? BLUE : LINE);
      }
      return svg(10 + v.den * (gw + 6), gh + 10, out, v.den + "묶음 중 " + v.num + "묶음");
    }
    const W = 320, cell = W / v.den;
    let out = "";
    for (let i = 0; i < v.den; i++) out += '<rect x="' + (5 + i * cell) + '" y="5" width="' + cell + '" height="44" fill="' + (i < v.num ? BLUE : PALE) + '" stroke="' + INK + '" stroke-width="2"/>';
    return svg(W + 10, 54, out, v.den + "칸 중 " + v.num + "칸");
  }

  function render(problem, reveal) {
    const v = problem && problem.visual;
    if (!v) return "";
    if (v.kind === "frame") return dots(v, reveal);
    if (v.kind === "blocks") return blocks(v);
    if (v.kind === "carry") return carry(v, reveal);
    if (v.kind === "borrow") return borrow(v, reveal);
    if (v.kind === "groups") return groups(v);
    if (v.kind === "place") return place(v);
    if (v.kind === "digits") return digits(v);
    if (v.kind === "fraction") return fraction(v);
    return "";
  }

  const api = { render: render, dots: dots, blocks: blocks, groups: groups };
  if (typeof module !== "undefined" && module.exports) module.exports = api;
  else root.MathVisual = api;
})(typeof window !== "undefined" ? window : globalThis);
