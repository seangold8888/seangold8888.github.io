// 「오늘도 우리 집」 그림 엔진.
// 캐릭터 얼굴은 아이가 연필로 그린 가족 얼굴 그림(재이·할머니·엄마·아빠·할아버지·태오)을 오려 낸 그림(faces/*.webp)을
// 고치지 않고 그대로 쓴다. 표정은 그림 위를 덧칠하지 않고 얼굴 둘레의 만화 기호(눈물·땀·볼터치·하트 등)로만 보탠다.
// 몸·소품·배경은 SVG 로 그리고, 몸에는 연필 느낌으로 선을 살짝 흔드는 필터를 건다.
// 옷 색은 모험 상자의 가족 봉제인형(math/assets/jaei-family-v4.webp)과 맞췄다.
(function (root) {
  "use strict";

  const INK = "#3d3a38";
  const SKIN = "#f8dcc6";
  const EYE = "#2a1e1a";

  const r1 = (v) => Math.round(v * 10) / 10;

  // ───────────────────────── 얼굴 (아이 그림) ─────────────────────────
  // w·h: 그림 크기(px). ax·ay: 목이 붙는 점(턱 아래). eyes·mouth: 눈물·볼터치를 둘 자리(그림 좌표).
  // H: 화면에서의 얼굴 높이(몸 좌표). 그림마다 기울기와 모양이 달라서 목 위치를 따로 적었다.
  const FACE_DIR = "faces/";
  const FACES = {
    jaei: { w: 370, h: 420, ax: 140, ay: 404, H: 118, eyes: [[103, 225], [208, 228]], mouth: [130, 332] },
    halmeoni: { w: 385, h: 420, ax: 170, ay: 406, H: 110, eyes: [[106, 211], [284, 211]], mouth: [154, 340] },
    eomma: { w: 306, h: 420, ax: 130, ay: 403, H: 112, eyes: [[106, 235], [223, 247]], mouth: [137, 330] },
    appa: { w: 420, h: 365, ax: 192, ay: 354, H: 104, eyes: [[129, 222], [314, 211]], mouth: [211, 313] },
    harabeoji: { w: 420, h: 406, ax: 172, ay: 396, H: 106, eyes: [[174, 218], [313, 211]], mouth: [234, 323] },
    taeo: { w: 420, h: 352, ax: 184, ay: 342, H: 104, eyes: [[131, 209], [296, 201]], mouth: [190, 310] },
  };

  function miniFace(id, x, y, h) {
    const F = FACES[id];
    const w = (F.w / F.h) * h;
    return `<image href="${FACE_DIR}${id}.webp" x="${x - w / 2}" y="${y - h / 2}" width="${w}" height="${h}"/>`;
  }

  function sweat(x, y, u = 1) {
    return `<path d="M${x} ${y} q${-6 * u} ${10 * u} 0 ${13 * u} q${6 * u} ${-3 * u} 0 ${-13 * u}Z" fill="#9fdcff" stroke="#3a6f99" stroke-width="${1.3 * u}"/>`;
  }

  // 표정 기호. 그림 좌표(px)로 그린다. u = 그림 폭의 1/100.
  function faceFx(expr, F) {
    const u = F.w / 100;
    const [e1, e2] = F.eyes;
    const L = Math.min(e1[0], e2[0]);
    const R = Math.max(e1[0], e2[0]);
    const cheeks = [[L - 6 * u, (e1[1] + e2[1]) / 2 + 17 * u], [R + 4 * u, (e1[1] + e2[1]) / 2 + 17 * u]];
    const sw = 1.1 * u;
    const blush = (strong) =>
      cheeks.map(([x, y]) => `<ellipse cx="${x}" cy="${y}" rx="${9 * u}" ry="${4.6 * u}" fill="#ff8fa3" opacity="${strong ? 0.55 : 0.38}"/><path d="M${x - 5 * u} ${y + 2 * u} l${3 * u} ${-4 * u} M${x - 1 * u} ${y + 2 * u} l${3 * u} ${-4 * u} M${x + 3 * u} ${y + 2 * u} l${3 * u} ${-4 * u}" stroke="#e0607a" stroke-width="${0.8 * u}" stroke-linecap="round"/>`).join("");
    const tears = (big) =>
      F.eyes.map(([x, y]) => big
        ? `<path d="M${x - 3 * u} ${y + 5 * u} q${-4 * u} ${14 * u} ${-1 * u} ${30 * u} q${6 * u} ${-2 * u} ${6 * u} ${-8 * u} q${-1 * u} ${-12 * u} ${-2 * u} ${-22 * u}Z" fill="#8fd0f5" opacity=".85" stroke="#3b8fd0" stroke-width="${0.6 * u}"/>`
        : `<path d="M${x + 5 * u} ${y + 4 * u} q${-3 * u} ${6 * u} 0 ${8 * u} q${3 * u} ${-2 * u} 0 ${-8 * u}Z" fill="#8fd0f5" stroke="#3b8fd0" stroke-width="${0.6 * u}"/>`).join("");
    const around = (n, r) => {
      let t = "";
      for (let i = 0; i < n; i++) {
        const a = Math.PI * (1.05 + (i / (n - 1)) * 0.9);
        const cx = F.w / 2 + Math.cos(a) * F.w * r;
        const cy = F.h * 0.45 + Math.sin(a) * F.h * r;
        t += `<path d="M${cx} ${cy} l${Math.cos(a) * 9 * u} ${Math.sin(a) * 9 * u}" stroke="#3b3b3b" stroke-width="${1.3 * u}" stroke-linecap="round"/>`;
      }
      return t;
    };
    const star = (x, y, r) => `<path d="M${x} ${y - r} Q${x + r * 0.15} ${y - r * 0.15} ${x + r} ${y} Q${x + r * 0.15} ${y + r * 0.15} ${x} ${y + r} Q${x - r * 0.15} ${y + r * 0.15} ${x - r} ${y} Q${x - r * 0.15} ${y - r * 0.15} ${x} ${y - r}Z" fill="#fff6a8" stroke="#e3b100" stroke-width="${0.6 * u}"/>`;
    const heart = (x, y, r) => `<path d="M${x} ${y + r} C${x - r * 1.6} ${y} ${x - r} ${y - r * 1.2} ${x} ${y - r * 0.4} C${x + r} ${y - r * 1.2} ${x + r * 1.6} ${y} ${x} ${y + r}Z" fill="#ff5c7c" stroke="#b8324f" stroke-width="${0.6 * u}"/>`;
    const text = (t, x, y, size, color, rot = 0) => `<text x="${x}" y="${y}" font-size="${size * u}" font-family="Jua, sans-serif" fill="${color}" stroke="#fff" stroke-width="${1.2 * u}" paint-order="stroke" transform="rotate(${rot} ${x} ${y})">${t}</text>`;
    const gloom = `<g stroke="#6c8fd6" stroke-width="${1.6 * u}" stroke-linecap="round" opacity=".8">${[0.3, 0.42, 0.54, 0.66].map((p) => `<path d="M${F.w * p} ${F.h * 0.06} v${14 * u}"/>`).join("")}</g>`;
    const side = F.w * 0.97;
    switch (expr) {
      case "happy": return around(5, 0.62);
      case "laugh": return around(7, 0.64) + star(side, F.h * 0.12, 7 * u);
      case "proud": return star(F.w * 0.05, F.h * 0.1, 8 * u) + star(side, F.h * 0.2, 6 * u);
      case "eating": return blush(false) + text("♪", side - 6 * u, F.h * 0.12, 18, "#f0609d");
      case "sad": return tears(false) + gloom;
      case "cry": return tears(true) + tears(false);
      case "teary": return tears(false) + blush(false);
      case "surprised": return text("!", side - 8 * u, F.h * 0.1, 34, "#e0443e", 10);
      case "shock": return gloom + sweat(side, F.h * 0.25, u) + text("!!", side - 16 * u, F.h * 0.02, 30, "#3b6fd6", 10);
      case "angry": return `<path d="M${side - 12 * u} ${F.h * 0.05} l${7 * u} ${7 * u} M${side - 5 * u} ${F.h * 0.05} l${-7 * u} ${7 * u} M${side + 2 * u} ${F.h * 0.1} v${8 * u} M${side - 2 * u} ${F.h * 0.14} h${8 * u}" stroke="#e0443e" stroke-width="${2.2 * u}" stroke-linecap="round"/>`;
      case "sly": return star(F.w * 0.08, F.h * 0.2, 6 * u) + text("흐흐", side - 10 * u, F.h * 0.08, 14, "#8a6d52", 8);
      case "love": return heart(F.w * 0.05, F.h * 0.12, 7 * u) + heart(side, F.h * 0.05, 9 * u) + heart(side + 4 * u, F.h * 0.4, 5 * u) + blush(true);
      case "worried": return sweat(side, F.h * 0.25, u) + text("~", side + 2 * u, F.h * 0.5, 18, "#6c8fd6");
      case "guilty": return sweat(side, F.h * 0.2, u) + sweat(F.w * 0.02, F.h * 0.32, u * 0.8) + sweat(side + 4 * u, F.h * 0.45, u * 0.7);
      case "sleepy": return text("Z", side - 4 * u, F.h * 0.2, 20, "#6c8fd6", -10) + text("z", side + 8 * u, F.h * 0.02, 14, "#6c8fd6", -10);
      case "sick": return blush(true) + gloom + sweat(side, F.h * 0.3, u);
      case "determined": return around(6, 0.66) + text("!", side - 4 * u, F.h * 0.1, 26, "#e0443e", 8);
      case "blank": return text("…", side - 18 * u, F.h * 0.06, 26, "#3b3b3b");
      case "shy": return blush(true);
      case "wink": return star(side, F.h * 0.25, 7 * u);
      default: return "";
    }
  }

  // ───────────────────────── 캐릭터 설정 ─────────────────────────

  const CHARS = {
    jaei: {
      name: "재이", faceH: 118, headY: -157, armScale: 1.1, armW: 11,
      outfits: {
        base: { top: ["#f0609d", -104, -76, 19, 21, "peter"], skirt: ["#f0609d", -80, -36, 22, 40], sash: ["#d93f82", -80], legsSkin: [-38, -10, 8], socks: ["#fff", -20], shoes: ["#f36ea8", 8], sleeve: "short" },
        pajama: { top: ["#ffd4e6", -104, -60, 21, 24, "round", "dots"], pants: ["#ffd4e6", -64, -8, 11], shoes: ["#fff", 11], sleeve: "long" },
      },
    },
    taeo: {
      name: "태오", faceH: 104, headY: -126, armScale: 1, armW: 12,
      outfits: {
        base: { top: ["#4c7fd0", -80, -34, 22, 25, "round", "pocket"], pants: ["#3c68b4", -38, -8, 9.5], shoes: ["#3f73d6", 9.5], sleeve: "long" },
        dobok: { top: ["#fbfbf7", -80, -32, 23, 26, "dobok"], belt: ["#2f6fe0", -40, "#2fbf5b"], pants: ["#fbfbf7", -38, -8, 10], shoes: [SKIN, 9], sleeve: "long", sleeveColor: "#fbfbf7" },
        pajama: { top: ["#bfe3ff", -80, -34, 22, 25, "round", "dino"], pants: ["#bfe3ff", -38, -8, 9.5], shoes: ["#fff", 9.5], sleeve: "long" },
      },
    },
    eomma: {
      name: "엄마", faceH: 112, headY: -216, armScale: 1.42, armW: 13,
      outfits: {
        base: { top: ["#f7b9ca", -166, -120, 22, 23, "shirt", "buttons"], skirt: ["#f7b9ca", -124, -32, 24, 42], sash: ["#ee9ab2", -122], legsSkin: [-34, -8, 9], shoes: ["#f7b9ca", 10], sleeve: "long" },
        sick: { top: ["#e8e2ff", -166, -110, 23, 25, "round", "dots"], pants: ["#e8e2ff", -114, -8, 11], shoes: ["#fff", 11], sleeve: "long" },
      },
    },
    appa: {
      name: "아빠", faceH: 104, headY: -224, armScale: 1.55, armW: 14,
      outfits: {
        base: { top: ["#9aa0a8", -178, -102, 30, 30, "shirt", "pocket"], belt: ["#6b4630", -106], pants: ["#737982", -104, -8, 13], shoes: ["#7a4a2c", 13], sleeve: "long" },
        work: { top: ["#9aa0a8", -178, -102, 30, 30, "shirt", "tie"], belt: ["#6b4630", -106], pants: ["#4b5563", -104, -8, 13], shoes: ["#3b2a22", 13], sleeve: "long" },
        apron: { top: ["#9aa0a8", -178, -102, 30, 30, "shirt"], belt: ["#6b4630", -106], pants: ["#737982", -104, -8, 13], shoes: ["#7a4a2c", 13], sleeve: "long", apron: "#ffe07a" },
        pink: { top: ["#f7a3c0", -178, -102, 30, 30, "shirt", "tie"], belt: ["#6b4630", -106], pants: ["#4b5563", -104, -8, 13], shoes: ["#3b2a22", 13], sleeve: "long" },
      },
    },
    halmeoni: {
      name: "할머니", faceH: 110, headY: -209, armScale: 1.38, armW: 14,
      outfits: {
        base: { top: ["#b99ad9", -160, -96, 27, 33, "round", "flowers"], skirt: ["#7c5a8e", -100, -32, 32, 38], legsSkin: [-34, -8, 9], shoes: ["#5b4a52", 10], sleeve: "long" },
        apron: { top: ["#b99ad9", -160, -96, 27, 33, "round", "flowers"], skirt: ["#7c5a8e", -100, -32, 32, 38], legsSkin: [-34, -8, 9], shoes: ["#5b4a52", 10], sleeve: "long", apron: "#ffffff" },
      },
    },
    harabeoji: {
      name: "할아버지", faceH: 106, headY: -219, armScale: 1.5, armW: 14,
      outfits: {
        base: { top: ["#8a6d52", -172, -100, 30, 31, "cardigan"], pants: ["#d2c29c", -104, -8, 13], shoes: ["#4a352a", 13], sleeve: "long" },
      },
    },
  };

  // ───────────────────────── 몸 ─────────────────────────

  function torsoPath(from, to, wT, wB) {
    return `M${-wT + 8} ${from} L${wT - 8} ${from} Q${wT} ${from} ${wT + 1} ${from + 9} L${wB} ${to - 3} Q${wB} ${to} ${wB - 4} ${to} L${-wB + 4} ${to} Q${-wB} ${to} ${-wB} ${to - 3} L${-wT - 1} ${from + 9} Q${-wT} ${from} ${-wT + 8} ${from}Z`;
  }

  function body(o) {
    let s = "";
    // 다리
    if (o.legsSkin) {
      const [a, b, w] = o.legsSkin;
      for (const x of [-w - 1.5, 1.5]) s += `<rect x="${x}" y="${a}" width="${w}" height="${b - a}" rx="4" fill="${SKIN}" stroke="${INK}" stroke-width="2"/>`;
      if (o.socks) for (const x of [-w - 1.5, 1.5]) s += `<rect x="${x}" y="${o.socks[1]}" width="${w}" height="${b - o.socks[1]}" rx="3" fill="${o.socks[0]}" stroke="${INK}" stroke-width="2"/>`;
    }
    if (o.pants) {
      const [c, a, b, w] = o.pants;
      for (const x of [-w * 2 - 1.5, 1.5]) s += `<rect x="${x}" y="${a}" width="${w * 2}" height="${b - a}" rx="5" fill="${c}" stroke="${INK}" stroke-width="2.2"/>`;
    }
    // 신발
    if (o.shoes) {
      const [c, w] = o.shoes;
      const lw = o.pants ? o.pants[3] : o.legsSkin[2] / 2;
      for (const side of [-1, 1]) {
        const cx = side * (lw + 1.5) + side * 1;
        s += `<ellipse cx="${cx + side * 2}" cy="-5" rx="${w + 3}" ry="6.5" fill="${c}" stroke="${INK}" stroke-width="2"/>`;
        if (c !== SKIN) s += `<path d="M${cx + side * 2 - w - 2} -1.5 Q${cx + side * 2} 2 ${cx + side * 2 + w + 2} -1.5" stroke="#fff" stroke-width="2.4" fill="none"/>`;
      }
    }
    // 치마
    if (o.skirt) {
      const [c, a, b, wT, wB] = o.skirt;
      s += `<path d="M${-wT} ${a} L${wT} ${a} L${wB} ${b - 2} Q${wB * 0.5} ${b + 3} 0 ${b} Q${-wB * 0.5} ${b + 3} ${-wB} ${b - 2}Z" fill="${c}" stroke="${INK}" stroke-width="2.3" stroke-linejoin="round"/>`;
      s += `<path d="M${-wB * 0.45} ${a + 14} L${-wB * 0.6} ${b - 4} M${wB * 0.45} ${a + 14} L${wB * 0.6} ${b - 4}" stroke="${INK}" stroke-width="1.2" opacity=".25"/>`;
    }
    // 윗옷
    const [tc, from, to, wT, wB, collar, deco] = o.top;
    s += `<path d="${torsoPath(from, to, wT, wB)}" fill="${tc}" stroke="${INK}" stroke-width="2.3" stroke-linejoin="round"/>`;
    if (deco === "pocket") s += `<rect x="${wT * 0.2}" y="${from + 16}" width="${wT * 0.5}" height="${wT * 0.45}" rx="2" fill="none" stroke="${INK}" stroke-width="1.5" opacity=".55"/>`;
    if (deco === "buttons" || collar === "shirt" || collar === "cardigan") {
      for (let y = from + 14; y < to - 6; y += 13) s += `<circle cx="0" cy="${y}" r="2" fill="${collar === "cardigan" ? "#e8d6a8" : "#fff"}" stroke="${INK}" stroke-width=".9"/>`;
    }
    if (deco === "dots") for (let i = 0; i < 7; i++) s += `<circle cx="${((i * 37) % (wT * 2 - 10)) - wT + 7}" cy="${from + 12 + ((i * 23) % (to - from - 16))}" r="2.6" fill="#fff" opacity=".8"/>`;
    if (deco === "flowers") {
      for (let i = 0; i < 6; i++) {
        const fx = ((i * 29) % (wT * 2 - 12)) - wT + 8;
        const fy = from + 14 + ((i * 19) % (to - from - 20));
        s += `<g transform="translate(${fx} ${fy})"><circle r="2.2" cx="-2.4" fill="#fff"/><circle r="2.2" cx="2.4" fill="#fff"/><circle r="2.2" cy="-2.4" fill="#fff"/><circle r="2.2" cy="2.4" fill="#fff"/><circle r="1.6" fill="#ffd34d"/></g>`;
      }
    }
    if (deco === "dino") s += `<path d="M-8 ${from + 26} q4 -10 12 -6 q6 -6 8 2 l-2 8 h-16z" fill="#6cc27a" stroke="${INK}" stroke-width="1.2"/>`;
    if (collar === "shirt" || collar === "cardigan") {
      const cc = collar === "cardigan" ? "#dbe8f5" : shade(tc, 1.12);
      s += `<path d="M-12 ${from - 1} L0 ${from + 12} L-4 ${from + 2}Z M12 ${from - 1} L0 ${from + 12} L4 ${from + 2}Z" fill="${cc}" stroke="${INK}" stroke-width="1.6" stroke-linejoin="round"/>`;
      if (collar === "cardigan") {
        s += `<path d="M-13 ${from} L0 ${from + 26} L13 ${from}" fill="#dbe8f5" stroke="${INK}" stroke-width="1.6"/>`;
        s += `<path d="M-13 ${from} L0 ${from + 26} L13 ${from}" fill="none" stroke="${tc}" stroke-width="0"/>`;
        s += `<rect x="${-wB + 6}" y="${to - 22}" width="12" height="10" rx="2" fill="none" stroke="${INK}" stroke-width="1.3" opacity=".5"/><rect x="${wB - 18}" y="${to - 22}" width="12" height="10" rx="2" fill="none" stroke="${INK}" stroke-width="1.3" opacity=".5"/>`;
      }
    }
    if (deco === "tie") s += `<path d="M-4 ${from + 10} L4 ${from + 10} L6 ${from + 44} L0 ${from + 52} L-6 ${from + 44}Z" fill="${tc === "#f7a3c0" ? "#3d4a8a" : "#33407a"}" stroke="${INK}" stroke-width="1.5"/>`;
    if (collar === "peter") s += `<path d="M-14 ${from} Q-14 ${from + 10} -2 ${from + 7} L-1 ${from}Z M14 ${from} Q14 ${from + 10} 2 ${from + 7} L1 ${from}Z" fill="#fff" stroke="${INK}" stroke-width="1.6"/>` + `<circle cx="0" cy="${from + 14}" r="1.8" fill="#fff"/><circle cx="0" cy="${from + 21}" r="1.8" fill="#fff"/>`;
    if (collar === "round") s += `<path d="M-11 ${from} Q0 ${from + 9} 11 ${from}" stroke="${INK}" stroke-width="1.6" fill="none"/>`;
    if (collar === "dobok") s += `<path d="M-13 ${from} L6 ${from + 28} M13 ${from} L-2 ${from + 16}" stroke="#222" stroke-width="4" stroke-linecap="round"/>`;
    if (o.sash) {
      const [c, y] = o.sash;
      s += `<rect x="${-wB - 1}" y="${y - 3}" width="${wB * 2 + 2}" height="7" rx="3" fill="${c}" stroke="${INK}" stroke-width="1.5"/>`;
      s += `<path d="M0 ${y} l-9 -6 v12z M0 ${y} l9 -6 v12z" fill="${c}" stroke="${INK}" stroke-width="1.5" stroke-linejoin="round"/>`;
    }
    if (o.belt) {
      const [c, y, stripe] = o.belt;
      s += `<rect x="${-wB - 1}" y="${y - 3.5}" width="${wB * 2 + 2}" height="8" rx="2" fill="${c}" stroke="${INK}" stroke-width="1.5"/>`;
      if (stripe) {
        s += `<rect x="${-wB}" y="${y - 0.6}" width="${wB * 2}" height="2.4" fill="${stripe}"/>`;
        s += `<path d="M-2 ${y} l-6 14 l5 1z M2 ${y} l7 13 l-5 2z" fill="${c}" stroke="${INK}" stroke-width="1.3"/><circle cx="0" cy="${y}" r="4" fill="${c}" stroke="${INK}" stroke-width="1.3"/>`;
      } else {
        s += `<rect x="-5" y="${y - 3}" width="10" height="7" rx="1" fill="#e6c36a" stroke="${INK}" stroke-width="1.2"/>`;
      }
    }
    if (o.apron) {
      const ay = from + 10;
      s += `<path d="M${-wT * 0.6} ${ay} L${wT * 0.6} ${ay} L${wB * 0.8} ${to + 36} Q0 ${to + 42} ${-wB * 0.8} ${to + 36}Z" fill="${o.apron}" stroke="${INK}" stroke-width="2"/>`;
      s += `<rect x="-10" y="${to + 4}" width="20" height="14" rx="3" fill="none" stroke="${INK}" stroke-width="1.4" opacity=".6"/>`;
      s += `<path d="M${-wT * 0.6} ${ay} L${-wT * 0.35} ${from - 2} M${wT * 0.6} ${ay} L${wT * 0.35} ${from - 2}" stroke="${INK}" stroke-width="1.6"/>`;
      if (o.apron === "#ffe07a") s += `<text x="0" y="${to - 6}" text-anchor="middle" font-size="11" font-weight="700" fill="#b0582a" font-family="Jua, sans-serif">셰프</text>`;
    }
    return s;
  }

  function shade(hex, f) {
    const n = parseInt(hex.slice(1), 16);
    const ch = (v) => Math.max(0, Math.min(255, Math.round(v * f)));
    const r = ch((n >> 16) & 255), g = ch((n >> 8) & 255), b = ch(n & 255);
    return `#${((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1)}`;
  }

  // ───────────────────────── 팔 ─────────────────────────
  // 보는 사람 기준 오른팔(side = 1) 끝점. 왼팔은 x 를 뒤집는다. [팔꿈치, 손]
  const ARM = {
    down: [[5, 22], [8, 42]],
    up: [[20, -14], [24, -42]],
    wave: [[24, -8], [32, -34]],
    out: [[26, 4], [48, -4]],
    point: [[24, 2], [50, -2]],
    front: [[14, 22], [-2, 30]],
    hip: [[24, 14], [7, 34]],
    cheer: [[20, -12], [15, -40]],
    swing: [[22, 18], [40, 30]],
    hold: [[16, 20], [12, 36]],
    give: [[18, 14], [36, 18]],
  };
  // 머리 기준 손 위치 (머리 좌표계)
  const HEAD_ARM = { mouth: [9, 22], eyes: [14, 6], chin: [8, 36], head: [30, -30], cheek: [30, 14], nose: [4, 14] };

  function armPos(pose, side, c, sh, headPos) {
    if (HEAD_ARM[pose]) {
      const [hx, hy] = HEAD_ARM[pose];
      const hs = FACES_H(c);
      const tx = side * hx * hs;
      const ty = headPos + hy * hs;
      const dx = tx - sh[0];
      const dy = ty - sh[1];
      const ex = sh[0] + dx / 2 + side * 20;
      const ey = sh[1] + dy / 2 + 14;
      return [[ex, ey], [tx, ty]];
    }
    const a = ARM[pose] || ARM.down;
    const k = c.armScale;
    return [
      [sh[0] + side * a[0][0] * k, sh[1] + a[0][1] * k],
      [sh[0] + side * a[1][0] * k, sh[1] + a[1][1] * k],
    ];
  }

  function arm(c, o, pose, side, headPos) {
    if (!pose || pose === "none") return "";
    const [, from, , wT] = o.top;
    const sh = [side * (wT - 3), from + 9];
    const [e, h] = armPos(pose, side, c, sh, headPos);
    const d = `M${r1(sh[0])} ${r1(sh[1])} L${r1(e[0])} ${r1(e[1])} L${r1(h[0])} ${r1(h[1])}`;
    const w = c.armW;
    const sleeve = o.sleeveColor || o.top[0];
    let s = `<path d="${d}" stroke="${INK}" stroke-width="${w + 4.5}" stroke-linecap="round" stroke-linejoin="round" fill="none"/>`;
    if (o.sleeve === "short") {
      s += `<path d="${d}" stroke="${SKIN}" stroke-width="${w}" stroke-linecap="round" stroke-linejoin="round" fill="none"/>`;
      s += `<circle cx="${sh[0] + side * 2}" cy="${sh[1] + 2}" r="${w * 0.85}" fill="${sleeve}" stroke="${INK}" stroke-width="2"/>`;
    } else {
      s += `<path d="${d}" stroke="${sleeve}" stroke-width="${w}" stroke-linecap="round" stroke-linejoin="round" fill="none"/>`;
    }
    s += `<circle cx="${r1(h[0])}" cy="${r1(h[1])}" r="${w * 0.6}" fill="${SKIN}" stroke="${INK}" stroke-width="2"/>`;
    return s;
  }

  const POSES = {
    stand: ["down", "down"],
    wave: ["down", "wave"],
    up: ["up", "up"],
    cheer: ["cheer", "cheer"],
    point: ["down", "point"],
    hold: ["front", "front"],
    hip: ["hip", "hip"],
    shrug: ["out", "out"],
    hug: ["out", "out"],
    mouth: ["down", "mouth"],
    cover: ["mouth", "mouth"],
    eyes: ["eyes", "eyes"],
    think: ["down", "chin"],
    scratch: ["down", "head"],
    cheeks: ["cheek", "cheek"],
    nose: ["down", "nose"],
    give: ["down", "give"],
    carry: ["hold", "hold"],
    kick: ["cheer", "out"],
    fist: ["down", "cheer"],
    run: ["swing", "up"],
    hands: ["none", "none"],
  };

  // 캐릭터 한 명을 그린다. 발 가운데가 (x, y). f = -1 이면 좌우를 뒤집는다(팔 방향만 바뀐다).
  const FACES_H = (c) => c.faceH / 90;

  // 캐릭터 한 명을 그린다. 발 가운데가 (x, y). f = -1 이면 몸을 좌우로 뒤집는다(얼굴 그림은 뒤집지 않는다).
  function drawChar(spec) {
    const c = CHARS[spec.c];
    const F = FACES[spec.c];
    if (!c || !F) return "";
    const o = c.outfits[spec.o || "base"] || c.outfits.base;
    const pose = POSES[spec.p || "stand"] || spec.p || POSES.stand;
    const s = spec.s || 1;
    const f = spec.f || 1;
    const neckY = o.top[1] + 6 + (spec.bob || 0);
    const k = F.H / F.h;
    let g = `<g filter="url(#wt-pencil)">${body(o)}</g>`;
    const tilt = spec.tilt || 0;
    g += `<g transform="translate(0 ${neckY}) rotate(${tilt * f}) scale(${k * f} ${k}) translate(${-F.ax} ${-F.ay})"><image href="${FACE_DIR}${spec.c}.webp" width="${F.w}" height="${F.h}"/>${faceFx(spec.e, F)}</g>`;
    g += `<g filter="url(#wt-pencil)">${arm(c, o, pose[0], -1, c.headY) + arm(c, o, pose[1], 1, c.headY)}</g>`;
    const rot = spec.rot ? ` rotate(${spec.rot})` : "";
    return `<g transform="translate(${spec.x} ${spec.y})${rot} scale(${s * f} ${s})">${g}</g>`;
  }

  // 연필 느낌 필터. 그림이 들어가는 SVG 마다 한 번 넣는다.
  function defs() {
    return `<defs><filter id="wt-pencil" x="-10%" y="-10%" width="120%" height="120%"><feTurbulence type="fractalNoise" baseFrequency="0.06" numOctaves="2" seed="7" result="n"/><feDisplacementMap in="SourceGraphic" in2="n" scale="4" xChannelSelector="R" yChannelSelector="G"/></filter></defs>`;
  }

  // ───────────────────────── 소품 ─────────────────────────

  function strawberry(x, y, s = 1, rot = 0) {
    let seeds = "";
    for (const [sx, sy] of [[-5, -2], [3, -4], [-1, 3], [5, 3], [-5, 7], [1, 9]]) seeds += `<ellipse cx="${sx}" cy="${sy}" rx="1" ry="1.5" fill="#ffe27a"/>`;
    return `<g transform="translate(${x} ${y}) rotate(${rot}) scale(${s})"><path d="M-11 -6 Q-12 10 0 16 Q12 10 11 -6 Q0 -12 -11 -6Z" fill="#ef3b4f" stroke="${INK}" stroke-width="1.8"/>${seeds}<path d="M-8 -8 L-2 -6 L0 -12 L2 -6 L8 -8 L4 -3 L-4 -3Z" fill="#48b04e" stroke="${INK}" stroke-width="1.4" stroke-linejoin="round"/></g>`;
  }

  const PROPS = {
    table(x, y, o) {
      const w = o.w || 360;
      return `<g><rect x="${x - w / 2}" y="${y}" width="${w}" height="16" rx="5" fill="#c98f5c" stroke="${INK}" stroke-width="2.4"/><rect x="${x - w / 2 + 6}" y="${y + 16}" width="${w - 12}" height="${o.h || 120}" fill="#b27a4b" stroke="${INK}" stroke-width="2.2"/><path d="M${x - w / 2 + 6} ${y + 30} H${x + w / 2 - 6}" stroke="${INK}" stroke-width="1.2" opacity=".3"/></g>`;
    },
    plate(x, y, o) {
      let s = `<ellipse cx="${x}" cy="${y}" rx="${o.r || 44}" ry="${(o.r || 44) * 0.32}" fill="#fff" stroke="${INK}" stroke-width="2.2"/><ellipse cx="${x}" cy="${y - 1}" rx="${(o.r || 44) * 0.7}" ry="${(o.r || 44) * 0.2}" fill="none" stroke="#cfd8e3" stroke-width="1.5"/>`;
      const n = o.n || 0;
      const spots = [[0, -8], [-18, -6], [18, -6], [-8, -16], [10, -16], [-26, -2], [26, -2], [0, -24]];
      for (let i = 0; i < n; i++) s += strawberry(x + spots[i][0], y + spots[i][1], o.bs || 0.9, (i * 23) % 40 - 20);
      if (o.cut) {
        // 크기가 제각각인 네 조각
        s += `<g transform="translate(${x} ${y - 10})"><path d="M-30 4 Q-32 -18 -8 -20 Q-4 0 -10 8Z" fill="#ef3b4f" stroke="${INK}" stroke-width="1.8"/><path d="M-26 -6 l-1 -1 M-18 -12 l0 -1 M-16 0 l1 1" stroke="#ffe27a" stroke-width="2"/><path d="M4 6 l6 -9 l5 9z" fill="#ef3b4f" stroke="${INK}" stroke-width="1.6"/><path d="M20 6 l4 -6 l4 6z" fill="#ef3b4f" stroke="${INK}" stroke-width="1.6"/><path d="M33 6 l2.5 -4 l2.5 4z" fill="#ef3b4f" stroke="${INK}" stroke-width="1.4"/></g>`;
      }
      return s;
    },
    berry(x, y, o) {
      return strawberry(x, y, o.s || 1, o.rot || 0);
    },
    sofa(x, y, o) {
      const w = o.w || 300;
      const c = o.c || "#7fb3a8";
      const d = shade(c, 0.85);
      return `<g><rect x="${x - w / 2}" y="${y - 150}" width="${w}" height="90" rx="26" fill="${d}" stroke="${INK}" stroke-width="2.4"/><rect x="${x - w / 2 - 14}" y="${y - 100}" width="40" height="92" rx="16" fill="${c}" stroke="${INK}" stroke-width="2.4"/><rect x="${x + w / 2 - 26}" y="${y - 100}" width="40" height="92" rx="16" fill="${c}" stroke="${INK}" stroke-width="2.4"/><rect x="${x - w / 2 + 20}" y="${y - 72}" width="${w - 40}" height="50" rx="14" fill="${c}" stroke="${INK}" stroke-width="2.4"/><path d="M${x} ${y - 70} V${y - 24}" stroke="${INK}" stroke-width="1.6" opacity=".4"/><rect x="${x - w / 2 + 10}" y="${y - 22}" width="10" height="16" fill="#6b4a33"/><rect x="${x + w / 2 - 20}" y="${y - 22}" width="10" height="16" fill="#6b4a33"/></g>`;
    },
    sofafront(x, y, o) {
      // 누운 사람 앞을 가리는 소파 앞면
      const w = o.w || 300;
      const c = o.c || "#7fb3a8";
      return `<g><rect x="${x - w / 2 + 20}" y="${y - 58}" width="${w - 40}" height="36" rx="12" fill="${c}" stroke="${INK}" stroke-width="2.4"/><rect x="${x - w / 2 - 14}" y="${y - 100}" width="40" height="92" rx="16" fill="${c}" stroke="${INK}" stroke-width="2.4"/><rect x="${x + w / 2 - 26}" y="${y - 100}" width="40" height="92" rx="16" fill="${c}" stroke="${INK}" stroke-width="2.4"/></g>`;
    },
    blanket(x, y, o) {
      const w = o.w || 200;
      const h = o.h || 60;
      const c = o.c || "#ffcf6e";
      let dots = "";
      for (let i = 0; i < w / 26; i++) dots += `<circle cx="${x - w / 2 + 14 + i * 26}" cy="${y - h / 2 + ((i % 2) * 14) - 4}" r="4" fill="#fff" opacity=".6"/>`;
      return `<g><path d="M${x - w / 2} ${y} Q${x - w / 2 - 6} ${y - h * 0.6} ${x - w / 2 + 10} ${y - h} Q${x} ${y - h - 10} ${x + w / 2 - 6} ${y - h + 2} Q${x + w / 2 + 6} ${y - h * 0.5} ${x + w / 2} ${y}Z" fill="${c}" stroke="${INK}" stroke-width="2.4"/>${dots}</g>`;
    },
    bed(x, y, o) {
      const w = o.w || 320;
      return `<g><rect x="${x - w / 2}" y="${y - 150}" width="26" height="150" rx="8" fill="#c99a6a" stroke="${INK}" stroke-width="2.4"/><rect x="${x - w / 2 + 10}" y="${y - 70}" width="${w - 10}" height="50" rx="10" fill="#fff" stroke="${INK}" stroke-width="2.4"/><rect x="${x - w / 2 + 10}" y="${y - 24}" width="${w - 10}" height="18" fill="#c99a6a" stroke="${INK}" stroke-width="2.2"/><rect x="${x + w / 2 - 12}" y="${y - 100}" width="22" height="100" rx="8" fill="#c99a6a" stroke="${INK}" stroke-width="2.4"/></g>`;
    },
    pillow(x, y, o) {
      return `<rect x="${x - 36}" y="${y - 22}" width="72" height="36" rx="16" fill="#fff5fb" stroke="${INK}" stroke-width="2.2"/>`;
    },
    drawing(x, y, o) {
      const s = o.s || 1;
      const ids = ["jaei", "halmeoni", "eomma", "appa", "harabeoji", "taeo"];
      const cols = ["#f0609d", "#b99ad9", "#f7b9ca", "#9aa0a8", "#8a6d52", "#4c7fd0"];
      let art = ids.map((id, i) => {
        const cx = -37 + i * 14.8;
        return `<path d="M${cx} 2 v10 M${cx - 4} 6 h8 M${cx} 12 l-3 6 M${cx} 12 l3 6" stroke="${cols[i]}" stroke-width="2.2" stroke-linecap="round"/>` + miniFace(id, cx, -6, 15);
      }).join("");
      art += `<circle cx="34" cy="-24" r="5" fill="#ffd34d"/><path d="M-42 20 H42" stroke="#6cc27a" stroke-width="3"/>`;
      if (o.v === "new") art += `<path d="M-44 16 q4 -12 10 -8 q5 -6 8 2 l-2 6z" fill="#6cc27a" stroke="#2b6b35" stroke-width="1.2"/><path d="M-6 -30 l2 4 4 1 -3 3 1 4 -4 -2 -4 2 1 -4 -3 -3 4 -1z" fill="#ff8fb3"/>`;
      if (o.v === "scribble") art += `<path d="M-40 -24 l14 10 -12 8 16 6 -14 10 18 4 M8 -28 l10 14 8 -14 8 14 8 -14 M-20 10 q10 -20 20 0 t20 0 t18 0" stroke="#3b3b3b" stroke-width="2.2" fill="none" stroke-linecap="round" stroke-linejoin="round"/>`;
      let stain = "";
      if (o.v === "stain") stain = `<path d="M-30 -20 Q-10 -30 6 -18 Q26 -24 30 -4 Q40 10 20 18 Q0 26 -18 16 Q-38 12 -30 -20Z" fill="#fffdf2" opacity=".85" stroke="#e8dcc0" stroke-width="2"/><path d="M-12 -6 q6 4 14 -2" stroke="#e8dcc0" stroke-width="2" fill="none"/><path d="M-44 -30 l4 60" stroke="#c8b98f" stroke-width="3" opacity=".5"/>`;
      return `<g transform="translate(${x} ${y}) rotate(${o.rot || 0}) scale(${s})"><rect x="-48" y="-36" width="96" height="66" rx="3" fill="#fff" stroke="${INK}" stroke-width="2"/>${art}${stain}</g>`;
    },
    cup(x, y, o) {
      const tip = o.tip ? ` rotate(${o.tip} ${x} ${y})` : "";
      return `<g transform="${tip}"><path d="M${x - 12} ${y - 30} L${x + 12} ${y - 30} L${x + 9} ${y} L${x - 9} ${y}Z" fill="#dff1ff" stroke="${INK}" stroke-width="2"/><path d="M${x - 11} ${y - 22} L${x + 11} ${y - 22} L${x + 9} ${y} L${x - 9} ${y}Z" fill="#fff" stroke="none"/></g>`;
    },
    splash(x, y, o) {
      const s = o.s || 1;
      return `<g transform="translate(${x} ${y}) scale(${s})"><path d="M-40 10 Q-44 -10 -24 -12 Q-30 -30 -10 -26 Q0 -44 12 -26 Q34 -34 30 -12 Q48 -6 38 10 Q20 22 0 16 Q-20 24 -40 10Z" fill="#fffef6" stroke="${INK}" stroke-width="2"/><circle cx="-44" cy="-26" r="5" fill="#fffef6" stroke="${INK}" stroke-width="1.6"/><circle cx="44" cy="-30" r="6" fill="#fffef6" stroke="${INK}" stroke-width="1.6"/><circle cx="20" cy="-46" r="4" fill="#fffef6" stroke="${INK}" stroke-width="1.6"/></g>`;
    },
    door(x, y, o) {
      return `<g><rect x="${x - 55}" y="${y - 230}" width="110" height="230" rx="4" fill="#a8744c" stroke="${INK}" stroke-width="2.6"/><rect x="${x - 42}" y="${y - 214}" width="84" height="90" rx="3" fill="none" stroke="${INK}" stroke-width="1.6" opacity=".5"/><rect x="${x - 42}" y="${y - 112}" width="84" height="96" rx="3" fill="none" stroke="${INK}" stroke-width="1.6" opacity=".5"/><circle cx="${x + 38}" cy="${y - 118}" r="6" fill="#f2c94c" stroke="${INK}" stroke-width="1.8"/></g>`;
    },
    opendoor(x, y, o) {
      return `<g><rect x="${x - 55}" y="${y - 230}" width="110" height="230" fill="#ffe9b0" stroke="${INK}" stroke-width="2.6"/><path d="M${x - 55} ${y - 230} L${x - 85} ${y - 240} L${x - 85} ${y + 8} L${x - 55} ${y}Z" fill="#a8744c" stroke="${INK}" stroke-width="2.4"/></g>`;
    },
    briefcase(x, y, o) {
      return `<g transform="translate(${x} ${y}) rotate(${o.rot || 0})"><rect x="-24" y="-30" width="48" height="34" rx="5" fill="#4a3a33" stroke="${INK}" stroke-width="2"/><path d="M-9 -30 v-7 h18 v7" stroke="${INK}" stroke-width="3" fill="none"/><rect x="-4" y="-18" width="8" height="6" fill="#e6c36a"/></g>`;
    },
    battery(x, y, o) {
      const lv = o.lv == null ? 1 : o.lv;
      const col = lv <= 1 ? "#ff4d4d" : lv <= 2 ? "#ffb13b" : "#3fc36b";
      let bars = "";
      for (let i = 0; i < lv; i++) bars += `<rect x="${-30 + i * 15}" y="-12" width="12" height="24" rx="2" fill="${col}"/>`;
      return `<g transform="translate(${x} ${y}) scale(${o.s || 1})"><rect x="-36" y="-18" width="70" height="36" rx="7" fill="#fff" stroke="${INK}" stroke-width="3"/><rect x="34" y="-8" width="7" height="16" rx="2" fill="${INK}"/>${bars}</g>`;
    },
    sign(x, y, o) {
      const w = o.w || 200;
      return `<g transform="rotate(${o.rot || 0} ${x} ${y})"><rect x="${x - w / 2}" y="${y - 28}" width="${w}" height="56" rx="10" fill="${o.c || "#fff4c2"}" stroke="${INK}" stroke-width="3"/><text x="${x}" y="${y + 9}" text-anchor="middle" font-size="${o.fs || 24}" font-family="Jua, sans-serif" fill="${o.tc || "#d2462f"}">${o.t}</text></g>`;
    },
    coupon(x, y, o) {
      return `<g transform="translate(${x} ${y}) rotate(${o.rot || -6}) scale(${o.s || 1})"><rect x="-70" y="-34" width="140" height="68" rx="6" fill="#fffaf0" stroke="${INK}" stroke-width="2.4"/><rect x="-62" y="-26" width="124" height="52" rx="4" fill="none" stroke="#ff8fb3" stroke-width="2" stroke-dasharray="5 4"/><text x="0" y="-4" text-anchor="middle" font-size="15" font-family="Jua, sans-serif" fill="#d2462f">${o.t || "아빠 쉬는 쿠폰"}</text><text x="0" y="16" text-anchor="middle" font-size="10" font-family="Jua, sans-serif" fill="#8a6d52">${o.t2 || "언제든 사용 가능 ♥"}</text></g>`;
    },
    dino(x, y, o) {
      return `<g transform="translate(${x} ${y}) scale(${(o.f || 1) * (o.s || 1)} ${o.s || 1})"><path d="M-26 0 Q-30 -26 -8 -30 Q0 -52 18 -48 Q32 -46 30 -34 Q26 -28 16 -30 Q14 -20 18 -10 Q26 -8 30 0Z" fill="#6cc27a" stroke="${INK}" stroke-width="2"/><circle cx="18" cy="-40" r="2.4" fill="${INK}"/><path d="M-20 -28 l4 -8 4 7 M-10 -32 l4 -8 4 7" fill="#ffd34d" stroke="${INK}" stroke-width="1.4"/><path d="M-26 -8 Q-44 -10 -46 -22 Q-36 -14 -26 -18" fill="#6cc27a" stroke="${INK}" stroke-width="2"/></g>`;
    },
    pan(x, y, o) {
      const egg = o.burnt
        ? `<path d="M-26 -4 Q-30 -16 -12 -18 Q4 -24 18 -16 Q30 -10 24 -2 Q0 4 -26 -4Z" fill="#2d2522" stroke="#111" stroke-width="1.6"/><circle cx="-2" cy="-10" r="6" fill="#4a3a33"/>`
        : `<path d="M-26 -4 Q-30 -16 -12 -18 Q4 -24 18 -16 Q30 -10 24 -2 Q0 4 -26 -4Z" fill="#fff" stroke="${INK}" stroke-width="1.6"/><circle cx="-2" cy="-10" r="7" fill="#ffc933" stroke="${INK}" stroke-width="1.4"/>`;
      return `<g transform="translate(${x} ${y}) scale(${o.s || 1})"><ellipse cx="0" cy="-6" rx="40" ry="14" fill="#3b3f47" stroke="${INK}" stroke-width="2"/>${egg}<rect x="38" y="-10" width="46" height="8" rx="4" fill="#3b3f47" stroke="${INK}" stroke-width="1.8" transform="rotate(-8 38 -6)"/></g>`;
    },
    smoke(x, y, o) {
      const c = o.c || "#9a9a9a";
      return `<g opacity=".85" transform="translate(${x} ${y}) scale(${o.s || 1})"><circle cx="0" cy="0" r="16" fill="${c}"/><circle cx="16" cy="-18" r="20" fill="${c}"/><circle cx="-12" cy="-34" r="18" fill="${c}"/><circle cx="10" cy="-54" r="16" fill="${c}"/><circle cx="-6" cy="-70" r="12" fill="${c}"/></g>`;
    },
    basket(x, y, o) {
      return `<g transform="translate(${x} ${y})"><path d="M-40 -44 L40 -44 L34 0 L-34 0Z" fill="#f0d19a" stroke="${INK}" stroke-width="2.4"/><path d="M-36 -30 H36 M-35 -16 H35" stroke="#c9a468" stroke-width="2"/><path d="M-30 -44 Q-24 -60 -8 -52 Q4 -64 16 -50 Q30 -58 32 -44Z" fill="#fff" stroke="${INK}" stroke-width="2"/></g>`;
    },
    shirt(x, y, o) {
      const c = o.c || "#fff";
      return `<g transform="translate(${x} ${y}) scale(${o.s || 1}) rotate(${o.rot || 0})"><path d="M-18 -40 L-40 -30 L-32 -12 L-24 -16 L-24 20 L24 20 L24 -16 L32 -12 L40 -30 L18 -40 Q0 -30 -18 -40Z" fill="${c}" stroke="${INK}" stroke-width="2.4" stroke-linejoin="round"/><path d="M-10 -38 L0 -26 L10 -38" fill="none" stroke="${INK}" stroke-width="1.8"/><circle cx="0" cy="-12" r="1.8" fill="${INK}"/><circle cx="0" cy="0" r="1.8" fill="${INK}"/><circle cx="0" cy="12" r="1.8" fill="${INK}"/></g>`;
    },
    sock(x, y, o) {
      return `<g transform="translate(${x} ${y}) rotate(${o.rot || 0}) scale(${o.s || 1})"><path d="M-6 -24 L8 -24 L8 2 Q8 10 -2 10 L-16 10 Q-22 4 -16 -2 L-6 -2Z" fill="#e8344a" stroke="${INK}" stroke-width="2"/><rect x="-7" y="-24" width="16" height="6" fill="#fff" stroke="${INK}" stroke-width="1.6"/></g>`;
    },
    // 공책. t = 제목, lines = 적힌 줄들.
    notebook(x, y, o) {
      const lines = o.lines || [];
      let body = "";
      lines.forEach((l, i) => {
        body += `<text x="-54" y="${-10 + i * 15}" font-size="11" font-family="Jua, sans-serif" fill="#3d3a38">${l}</text>`;
      });
      for (let i = 0; i < 4; i++) body += `<path d="M-58 ${-6 + i * 15} H60" stroke="#bcd7f2" stroke-width="1"/>`;
      return `<g transform="translate(${x} ${y}) rotate(${o.rot || 0}) scale(${o.s || 1})"><rect x="-66" y="-50" width="132" height="100" rx="6" fill="${o.c || "#ffd66b"}" stroke="${INK}" stroke-width="2.4"/><rect x="-62" y="-46" width="124" height="92" rx="3" fill="#fffdf5" stroke="${INK}" stroke-width="1.4"/><text x="0" y="-28" text-anchor="middle" font-size="15" font-family="Jua, sans-serif" fill="#d2462f">${o.t || ""}</text>${body}</g>`;
    },
    // 장난감 영웅 인형 세 개(특정 캐릭터가 아닌 둥근 로봇 인형).
    figures(x, y, o) {
      const one = (dx, c, visor) => `<g transform="translate(${dx} 0)"><rect x="-9" y="-30" width="18" height="22" rx="5" fill="${c}" stroke="${INK}" stroke-width="1.8"/><rect x="-8" y="-9" width="6" height="9" rx="2" fill="${c}" stroke="${INK}" stroke-width="1.5"/><rect x="2" y="-9" width="6" height="9" rx="2" fill="${c}" stroke="${INK}" stroke-width="1.5"/><circle cx="0" cy="-40" r="10" fill="${c}" stroke="${INK}" stroke-width="1.8"/><rect x="-7" y="-43" width="14" height="5" rx="2" fill="${visor}"/><path d="M-9 -26 l-8 10 M9 -26 l8 10" stroke="${INK}" stroke-width="3" stroke-linecap="round"/></g>`;
      return `<g transform="translate(${x} ${y}) scale(${o.s || 1})">${one(-34, "#3a3550", "#b99ad9")}${one(0, "#e0443e", "#ffd34d")}${one(34, "#6cc27a", "#fff")}</g>`;
    },
    // 누나 머리끈(분홍 곱창 끈)
    scrunchie(x, y, o) {
      let bumps = "";
      for (let i = 0; i < 10; i++) {
        const a = (i / 10) * Math.PI * 2;
        bumps += `<circle cx="${(Math.cos(a) * 9).toFixed(1)}" cy="${(Math.sin(a) * 9).toFixed(1)}" r="5" fill="#ff6fa8" stroke="${INK}" stroke-width="1.2"/>`;
      }
      return `<g transform="translate(${x} ${y}) scale(${o.s || 1})">${bumps}<circle r="4.5" fill="#fff"/></g>`;
    },
    // 반찬 접시 (우엉조림)
    banchan(x, y, o) {
      let sticks = "";
      for (let i = 0; i < 9; i++) sticks += `<path d="M${-22 + i * 5} ${-6 - (i % 3) * 3} l${10 - (i % 4) * 5} ${-6}" stroke="#7a4a2c" stroke-width="3" stroke-linecap="round"/>`;
      return `<g transform="translate(${x} ${y}) scale(${o.s || 1})"><ellipse cx="0" cy="0" rx="30" ry="9" fill="#fff" stroke="${INK}" stroke-width="2"/>${sticks}<circle cx="-6" cy="-12" r="1.2" fill="#fff6c7"/><circle cx="6" cy="-10" r="1.2" fill="#fff6c7"/></g>`;
    },
    toys(x, y, o) {
      return `<g transform="translate(${x} ${y})"><rect x="-120" y="-18" width="20" height="18" fill="#ff6b6b" stroke="${INK}" stroke-width="2"/><rect x="-96" y="-14" width="16" height="14" fill="#4c7fd0" stroke="${INK}" stroke-width="2"/><circle cx="-50" cy="-12" r="12" fill="#ffd34d" stroke="${INK}" stroke-width="2"/><rect x="40" y="-16" width="22" height="16" fill="#6cc27a" stroke="${INK}" stroke-width="2" transform="rotate(12 50 -8)"/><path d="M90 0 l10 -22 l10 22z" fill="#b99ad9" stroke="${INK}" stroke-width="2"/><rect x="-10" y="-8" width="30" height="8" rx="2" fill="#f0609d" stroke="${INK}" stroke-width="2"/><circle cx="120" cy="-8" r="8" fill="#ff8fb3" stroke="${INK}" stroke-width="2"/></g>`;
    },
    bowl(x, y, o) {
      const steam = o.steam === false ? "" : `<path d="M-10 -34 q-6 -10 0 -18 q6 -8 0 -16 M6 -34 q-6 -10 0 -18 q6 -8 0 -16" stroke="#c9c9c9" stroke-width="3" fill="none" stroke-linecap="round"/>`;
      return `<g transform="translate(${x} ${y}) scale(${o.s || 1})">${steam}<ellipse cx="0" cy="-24" rx="32" ry="8" fill="#fff6e0" stroke="${INK}" stroke-width="2"/><path d="M-32 -24 Q-30 2 0 4 Q30 2 32 -24" fill="#fff" stroke="${INK}" stroke-width="2.2"/><path d="M-22 -10 H22" stroke="#8fc7ff" stroke-width="3"/></g>`;
    },
    spoon(x, y, o) {
      return `<g transform="translate(${x} ${y}) rotate(${o.rot || -30})"><ellipse cx="0" cy="-30" rx="7" ry="10" fill="#dfe3e8" stroke="${INK}" stroke-width="1.8"/><rect x="-2.5" y="-20" width="5" height="34" rx="2" fill="#dfe3e8" stroke="${INK}" stroke-width="1.6"/></g>`;
    },
    towel(x, y, o) {
      return `<g transform="translate(${x} ${y}) rotate(${o.rot || 0})"><rect x="-26" y="-9" width="52" height="18" rx="5" fill="#bfe3ff" stroke="${INK}" stroke-width="2"/><path d="M-18 -9 v18 M18 -9 v18" stroke="#fff" stroke-width="2"/></g>`;
    },
    thermo(x, y, o) {
      return `<g transform="translate(${x} ${y}) rotate(${o.rot || 30})"><rect x="-4" y="-34" width="8" height="34" rx="4" fill="#fff" stroke="${INK}" stroke-width="1.8"/><rect x="-1.5" y="-24" width="3" height="22" fill="#ff4d4d"/><circle cx="0" cy="2" r="6" fill="#ff4d4d" stroke="${INK}" stroke-width="1.8"/></g>`;
    },
    phone(x, y, o) {
      const s = o.s || 1;
      return `<g transform="translate(${x} ${y}) rotate(${o.rot || 0}) scale(${s})"><rect x="-16" y="-28" width="32" height="56" rx="6" fill="#2f3440" stroke="${INK}" stroke-width="2"/><rect x="-12" y="-22" width="24" height="42" rx="2" fill="${o.screen || "#9fd8ff"}"/>${o.face ? miniFace(o.face, 0, -2, 22) : ""}</g>`;
    },
    // 휴대폰 화면 테두리. 패널 전체를 영상통화 화면처럼 보이게 한다.
    phoneframe(x, y, o, W, H) {
      const m = 34;
      return `<path fill-rule="evenodd" d="M0 0 H${W} V${H} H0Z M${m + 22} ${m} H${W - m - 22} Q${W - m} ${m} ${W - m} ${m + 22} V${H - m - 22} Q${W - m} ${H - m} ${W - m - 22} ${H - m} H${m + 22} Q${m} ${H - m} ${m} ${H - m - 22} V${m + 22} Q${m} ${m} ${m + 22} ${m}Z" fill="#2f3440"/><rect x="${m}" y="${m}" width="${W - m * 2}" height="${H - m * 2}" rx="22" fill="none" stroke="#111" stroke-width="3"/><rect x="${W / 2 - 30}" y="${m + 10}" width="60" height="8" rx="4" fill="#111" opacity=".8"/>`;
    },
    heart(x, y, o) {
      const s = o.s || 1;
      return `<path transform="translate(${x} ${y}) scale(${s}) rotate(${o.rot || 0})" d="M0 12 C-18 0 -14 -16 0 -8 C14 -16 18 0 0 12Z" fill="${o.c || "#ff5c7c"}" stroke="${INK}" stroke-width="${1.8 / s}"/>`;
    },
    sparkle(x, y, o) {
      const s = o.s || 1;
      return `<path transform="translate(${x} ${y}) scale(${s})" d="M0 -14 Q2 -2 14 0 Q2 2 0 14 Q-2 2 -14 0 Q-2 -2 0 -14Z" fill="${o.c || "#fff6a8"}" stroke="${o.stroke || "#e3b100"}" stroke-width="${1.4 / s}"/>`;
    },
    note(x, y, o) {
      return `<g transform="translate(${x} ${y}) scale(${o.s || 1})" fill="${o.c || INK}"><ellipse cx="-4" cy="6" rx="6" ry="4.5"/><rect x="0.5" y="-16" width="2.6" height="22"/><path d="M3 -16 q8 4 8 12 q-2 -6 -8 -6z"/></g>`;
    },
    frame(x, y, o) {
      const row = ["jaei", "halmeoni", "eomma", "appa", "harabeoji", "taeo"].map((id, i) => miniFace(id, -26 + i * 10.4, (i % 2) * 4 - 2, 15)).join("");
      return `<g transform="translate(${x} ${y}) scale(${o.s || 1})"><rect x="-34" y="-26" width="68" height="52" fill="#fff" stroke="#b27a4b" stroke-width="6"/>${row}<path d="M-26 16 h52" stroke="#6cc27a" stroke-width="3"/></g>`;
    },
    shoes(x, y, o) {
      return `<g transform="translate(${x} ${y})"><ellipse cx="-30" cy="-5" rx="14" ry="6" fill="#7a4a2c" stroke="${INK}" stroke-width="1.8"/><ellipse cx="-8" cy="-5" rx="14" ry="6" fill="#7a4a2c" stroke="${INK}" stroke-width="1.8"/><ellipse cx="18" cy="-4" rx="9" ry="5" fill="#3f73d6" stroke="${INK}" stroke-width="1.6"/><ellipse cx="36" cy="-4" rx="9" ry="5" fill="#f36ea8" stroke="${INK}" stroke-width="1.6"/></g>`;
    },
    cake(x, y, o) {
      return `<g transform="translate(${x} ${y}) scale(${o.s || 1})"><rect x="-40" y="-40" width="80" height="40" rx="6" fill="#fff4e0" stroke="${INK}" stroke-width="2.2"/><path d="M-40 -30 Q-30 -20 -20 -30 Q-10 -20 0 -30 Q10 -20 20 -30 Q30 -20 40 -30" fill="none" stroke="#ff8fb3" stroke-width="5"/>${strawberry(-18, -46, 0.7)}${strawberry(0, -48, 0.7)}${strawberry(18, -46, 0.7)}</g>`;
    },
    glasses(x, y, o) {
      return `<g transform="translate(${x} ${y}) scale(${o.s || 1})" fill="rgba(255,255,255,.25)" stroke="${INK}" stroke-width="2.4"><circle cx="-14" cy="0" r="10"/><circle cx="14" cy="0" r="10"/><path d="M-4 0 H4" fill="none"/></g>`;
    },
    spoonful(x, y, o) {
      return `<g transform="translate(${x} ${y}) rotate(${o.rot || 0})"><ellipse cx="0" cy="0" rx="12" ry="7" fill="#fff6e0" stroke="${INK}" stroke-width="1.8"/><rect x="10" y="-2.5" width="40" height="5" rx="2" fill="#dfe3e8" stroke="${INK}" stroke-width="1.4"/></g>`;
    },
    salt(x, y, o) {
      return `<g transform="translate(${x} ${y}) rotate(${o.rot || 150})"><rect x="-10" y="-22" width="20" height="30" rx="5" fill="#fff" stroke="${INK}" stroke-width="2"/><rect x="-10" y="-30" width="20" height="9" rx="3" fill="#8fc7ff" stroke="${INK}" stroke-width="2"/><text x="0" y="0" text-anchor="middle" font-size="10" font-family="Jua, sans-serif" fill="${INK}" transform="rotate(180 0 -5)">소금</text></g>`;
    },
    grains(x, y, o) {
      let s = "";
      for (let i = 0; i < 26; i++) s += `<circle cx="${x + ((i * 17) % 40) - 20}" cy="${y + ((i * 29) % 60)}" r="1.8" fill="#fff" stroke="${INK}" stroke-width=".6"/>`;
      return s;
    },
    clock(x, y, o) {
      return `<g transform="translate(${x} ${y})"><circle r="22" fill="#fff" stroke="${INK}" stroke-width="3"/><path d="M0 0 V-14 M0 0 L10 4" stroke="${INK}" stroke-width="2.4" stroke-linecap="round"/></g>`;
    },
    moon(x, y, o) {
      return `<path transform="translate(${x} ${y})" d="M8 -16 A16 16 0 1 0 8 16 A12 12 0 1 1 8 -16Z" fill="#ffe27a"/>`;
    },
  };

  function drawProp(p, W, H) {
    const [type, x, y, o = {}] = p;
    const fn = PROPS[type];
    return fn ? fn(x, y, o, W, H) : "";
  }

  // ───────────────────────── 배경 ─────────────────────────

  function floor(W, H, gy, c, line) {
    let s = `<rect x="0" y="${gy}" width="${W}" height="${H - gy}" fill="${c}"/>`;
    for (let x = -40; x < W + 40; x += 64) s += `<path d="M${x} ${gy} L${x - 30} ${H}" stroke="${line}" stroke-width="1.5" opacity=".5"/>`;
    s += `<rect x="0" y="${gy - 6}" width="${W}" height="8" fill="${shade(c, 0.85)}"/>`;
    return s;
  }

  function windowRect(x, y, w, h, sky, extra = "") {
    return `<g><rect x="${x}" y="${y}" width="${w}" height="${h}" rx="4" fill="${sky}" stroke="${INK}" stroke-width="2.4"/>${extra}<path d="M${x + w / 2} ${y} V${y + h} M${x} ${y + h / 2} H${x + w}" stroke="#fff" stroke-width="5"/><rect x="${x}" y="${y}" width="${w}" height="${h}" rx="4" fill="none" stroke="${INK}" stroke-width="2.4"/></g>`;
  }

  function fxBurst(W, H, c, ink) {
    let s = `<rect width="${W}" height="${H}" fill="${c}"/>`;
    const cx = W / 2, cy = H / 2, R = Math.hypot(W, H);
    for (let i = 0; i < 48; i++) {
      const a = (i / 48) * Math.PI * 2;
      const a2 = a + 0.045;
      s += `<path d="M${cx + Math.cos(a) * 60} ${cy + Math.sin(a) * 60} L${cx + Math.cos(a) * R} ${cy + Math.sin(a) * R} L${cx + Math.cos(a2) * R} ${cy + Math.sin(a2) * R}Z" fill="${ink || "#fff"}" opacity=".55"/>`;
    }
    return s;
  }

  function background(bg, W, H) {
    const [kind, arg] = String(bg || "plain").split(":");
    const gy = H - 60;
    switch (kind) {
      case "kitchen": {
        let s = `<rect width="${W}" height="${H}" fill="#fff4dc"/>`;
        for (let y = gy - 110; y < gy - 20; y += 18) for (let x = 0; x < W; x += 18) s += `<rect x="${x + 1}" y="${y + 1}" width="16" height="16" fill="#e5f3f1" stroke="#cfe5e2" stroke-width="1"/>`;
        s += `<rect x="0" y="0" width="${W}" height="${Math.max(gy - 170, 40)}" fill="#f1d7a8" stroke="${INK}" stroke-width="2"/>`;
        for (let x = 20; x < W; x += 95) s += `<rect x="${x}" y="8" width="80" height="${Math.max(gy - 186, 24)}" rx="4" fill="#f7e2bd" stroke="${INK}" stroke-width="1.6"/><circle cx="${x + 70}" cy="${Math.max(gy - 186, 24) - 6}" r="3" fill="${INK}"/>`;
        s += windowRect(W - 130, Math.max(gy - 160, 50), 100, 70, "#bfe7ff", `<circle cx="${W - 60}" cy="${Math.max(gy - 140, 70)}" r="10" fill="#fff6a8"/>`);
        s += floor(W, H, gy, "#e9c9a0", "#c9a47a");
        return s;
      }
      case "living":
      case "living-night":
      case "halmae": {
        const night = kind === "living-night";
        const wall = night ? "#c9c3e8" : kind === "halmae" ? "#f3e6cf" : "#fdeee6";
        let s = `<rect width="${W}" height="${H}" fill="${wall}"/>`;
        if (kind === "halmae") {
          for (let x = 0; x < W; x += 40) s += `<path d="M${x} 0 V${gy}" stroke="#e6d4b4" stroke-width="10"/>`;
          s += `<g transform="translate(40 ${gy - 150})"><rect width="90" height="150" fill="#5a3b2a" stroke="${INK}" stroke-width="2.4"/><rect x="8" y="10" width="34" height="60" fill="#6d4a35" stroke="#caa36d" stroke-width="2"/><rect x="48" y="10" width="34" height="60" fill="#6d4a35" stroke="#caa36d" stroke-width="2"/><path d="M14 40 q10 -14 22 0 M54 40 q10 -14 22 0" stroke="#e7f0ff" stroke-width="3" fill="none"/></g>`;
          s += PROPS.clock(W - 60, 50, {});
        } else {
          for (let x = 0; x < W; x += 34) s += `<path d="M${x} 0 V${gy}" stroke="${night ? "#bdb6df" : "#f8e2d8"}" stroke-width="12"/>`;
          const wx = W - 150, wy = Math.max(gy - 200, 30);
          s += windowRect(wx, wy, 110, 90, night ? "#2b3470" : "#bfe7ff", night ? `<path d="M${wx + 80} ${wy + 20} a12 12 0 1 0 8 22 a9 9 0 1 1 -8 -22z" fill="#ffe27a"/><circle cx="${wx + 20}" cy="${wy + 22}" r="2" fill="#fff"/><circle cx="${wx + 40}" cy="${wy + 60}" r="1.6" fill="#fff"/>` : `<circle cx="${wx + 25}" cy="${wy + 22}" r="12" fill="#fff" opacity=".8"/><circle cx="${wx + 38}" cy="${wy + 24}" r="10" fill="#fff" opacity=".8"/>`);
          s += `<path d="M${wx - 16} ${wy - 10} Q${wx - 4} ${wy + 50} ${wx - 18} ${wy + 110} L${wx - 30} ${wy + 110} L${wx - 30} ${wy - 10}Z M${wx + 126} ${wy - 10} Q${wx + 114} ${wy + 50} ${wx + 128} ${wy + 110} L${wx + 140} ${wy + 110} L${wx + 140} ${wy - 10}Z" fill="#ffb8b8" stroke="${INK}" stroke-width="1.6"/>`;
          s += PROPS.frame(80, Math.max(gy - 170, 40), { s: 0.9 });
        }
        s += floor(W, H, gy, night ? "#a68b74" : "#dcb48a", "#b58e66");
        if (night) s += `<rect width="${W}" height="${H}" fill="#1b1f4a" opacity=".12"/>`;
        return s;
      }
      case "bedroom":
      case "bedroom-night": {
        const night = kind === "bedroom-night";
        let s = `<rect width="${W}" height="${H}" fill="${night ? "#8f94c9" : "#e8f1ff"}"/>`;
        for (let i = 0; i < 14; i++) s += `<path transform="translate(${(i * 67) % W} ${(i * 41) % Math.max(gy - 40, 60) + 10}) scale(.5)" d="M0 -14 Q2 -2 14 0 Q2 2 0 14 Q-2 2 -14 0 Q-2 -2 0 -14Z" fill="${night ? "#fff6a8" : "#cfe0ff"}" opacity=".8"/>`;
        s += windowRect(40, Math.max(gy - 190, 20), 90, 80, night ? "#232a5e" : "#bfe7ff", night ? `<path d="M100 ${Math.max(gy - 170, 40)} a10 10 0 1 0 7 18 a8 8 0 1 1 -7 -18z" fill="#ffe27a"/>` : "");
        s += floor(W, H, gy, night ? "#7d6f8f" : "#e6cfb0", night ? "#6a5c7a" : "#caa983");
        if (night) s += `<rect width="${W}" height="${H}" fill="#12163d" opacity=".18"/>`;
        return s;
      }
      case "entrance": {
        const eve = arg === "evening";
        let s = `<rect width="${W}" height="${H}" fill="${eve ? "#f6dcc0" : "#fff1dc"}"/>`;
        s += `<rect x="${W - 90}" y="${gy - 190}" width="70" height="190" fill="#e8d2b0" stroke="${INK}" stroke-width="2"/>`;
        for (let y = gy - 170; y < gy; y += 44) s += `<path d="M${W - 90} ${y} H${W - 20}" stroke="${INK}" stroke-width="1.6"/>`;
        s += floor(W, H, gy, "#bfb3a8", "#a59a90");
        return s;
      }
      case "street": {
        let s = `<defs><linearGradient id="sky" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#6b5ca5"/><stop offset=".55" stop-color="#f28c7c"/><stop offset="1" stop-color="#ffd08a"/></linearGradient></defs><rect width="${W}" height="${H}" fill="url(#sky)"/>`;
        const bs = [[0, 120, 90], [80, 180, 70], [150, 140, 80], [230, 200, 60], [290, 160, 110]];
        for (const [x, h, w] of bs) {
          s += `<rect x="${x}" y="${gy - h}" width="${w}" height="${h}" fill="#3e3a6b"/>`;
          for (let wy = gy - h + 14; wy < gy - 14; wy += 22) for (let wx = x + 10; wx < x + w - 12; wx += 20) s += `<rect x="${wx}" y="${wy}" width="9" height="11" fill="${(wx + wy) % 3 ? "#ffe27a" : "#5a5590"}"/>`;
        }
        s += `<rect x="0" y="${gy}" width="${W}" height="${H - gy}" fill="#8a8198"/><path d="M0 ${gy + 22} H${W}" stroke="#fff" stroke-width="3" stroke-dasharray="20 16" opacity=".6"/>`;
        return s;
      }
      case "burst":
        return fxBurst(W, H, arg ? `#${arg}` : "#ffe27a");
      case "gloom": {
        let s = `<rect width="${W}" height="${H}" fill="#5c6aa8"/>`;
        for (let x = 6; x < W; x += 14) s += `<path d="M${x} 0 V${H * (0.3 + ((x * 7) % 10) / 20)}" stroke="#39447a" stroke-width="5" opacity=".7"/>`;
        return s;
      }
      case "sparkle": {
        const c = arg ? `#${arg}` : "#ffe3ee";
        let s = `<defs><radialGradient id="spk${c.slice(1)}"><stop offset="0" stop-color="#fff"/><stop offset="1" stop-color="${c}"/></radialGradient></defs><rect width="${W}" height="${H}" fill="url(#spk${c.slice(1)})"/>`;
        for (let i = 0; i < 18; i++) {
          const x = (i * 97) % W, y = (i * 61) % H, rr = 6 + (i % 4) * 5;
          s += `<circle cx="${x}" cy="${y}" r="${rr}" fill="#fff" opacity=".55"/>`;
        }
        for (let i = 0; i < 8; i++) s += PROPS.sparkle((i * 131 + 30) % W, (i * 83 + 20) % H, { s: 0.6 + (i % 3) * 0.3 });
        return s;
      }
      case "speed": {
        let s = `<rect width="${W}" height="${H}" fill="${arg ? `#${arg}` : "#e9f6ff"}"/>`;
        for (let i = 0; i < 26; i++) s += `<path d="M${(i * 71) % W} ${(i * 37) % H} h${60 + (i % 5) * 30}" stroke="#9fb8d6" stroke-width="${2 + (i % 3)}" stroke-linecap="round"/>`;
        return s;
      }
      case "memory": {
        return `<rect width="${W}" height="${H}" fill="#f4e6c8"/><rect width="${W}" height="${H}" fill="none" stroke="#e0c99a" stroke-width="30" opacity=".7"/>`;
      }
      default:
        return `<rect width="${W}" height="${H}" fill="${arg ? `#${arg}` : "#fff"}"/>`;
    }
  }

  // 컷 하나를 SVG 로. 말풍선은 SVG 위에 HTML 로 얹는다(글자가 알아서 줄바꿈된다).
  function panelSVG(panel, uid) {
    const W = 400;
    const H = panel.h || 320;
    const gy = H - 24;
    let s = defs() + background(panel.bg, W, H);
    for (const p of panel.bp || []) s += drawProp(p, W, H);
    for (const c of panel.chars || []) s += drawChar({ y: gy, ...c });
    for (const p of panel.fp || []) s += drawProp(p, W, H);
    return `<svg viewBox="0 0 ${W} ${H}" xmlns="http://www.w3.org/2000/svg" role="img" aria-hidden="true" preserveAspectRatio="xMidYMid slice" id="${uid || ""}">${s}</svg>`;
  }

  root.WebtoonArt = { panelSVG, drawChar, defs, CHARS, FACES, background, PROPS };
})(typeof window !== "undefined" ? window : globalThis);
