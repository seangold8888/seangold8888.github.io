/* 매일 수학 10분 — 재이가 좋아하는 친구들 (이름 + 상징 배지)
   그림은 전부 우리가 그린 단순 기호(리본·하트·왕관·방패…)이고 원작 이미지는 쓰지 않는다. */
(function (root) {
  "use strict";
  const CHARACTERS = [
    { id: "cinnamoroll", name: "시나모롤", from: "산리오", color: "#7db9e8", bg: "#eaf4fc", icon: "cloud", say: ["구름처럼 폭신하게 맞았어!", "시나모롤이 박수 쳐요!"] },
    { id: "mymelody", name: "마이멜로디", from: "산리오", color: "#f28cb1", bg: "#fdeff4", icon: "bow", say: ["멜로디가 좋아해요!", "리본처럼 예쁘게 풀었어!"] },
    { id: "kuromi", name: "쿠로미", from: "산리오", color: "#7c5cbf", bg: "#f1ecfa", icon: "bowdark", say: ["쿠로미도 인정!", "오, 제법인데?"] },
    { id: "kitty", name: "헬로키티", from: "산리오", color: "#e53e3e", bg: "#fdeaea", icon: "ribbon", say: ["키티가 방긋!", "정확해요, 대단해!"] },
    { id: "pompompurin", name: "폼폼푸린", from: "산리오", color: "#d69e2e", bg: "#fdf6e3", icon: "pudding", say: ["푸딩처럼 부드럽게 정답!", "푸린이 신났어요!"] },
    { id: "heartsping", name: "하츄핑", from: "티니핑", color: "#f56565", bg: "#fdecec", icon: "heart", say: ["하츄! 사랑스러운 정답!", "하츄핑이 하트를 보내요!"] },
    { id: "laraping", name: "라라핑", from: "티니핑", color: "#805ad5", bg: "#f0eafb", icon: "note", say: ["라라~ 노래처럼 맞았어!", "라라핑이 춤춰요!"] },
    { id: "baroping", name: "바로핑", from: "티니핑", color: "#3182ce", bg: "#e8f1fb", icon: "bolt", say: ["바로 맞혔다!", "번쩍! 정확해요!"] },
    { id: "azaping", name: "아자핑", from: "티니핑", color: "#dd6b20", bg: "#fdeee3", icon: "fist", say: ["아자아자! 해냈어!", "힘이 넘치는 정답!"] },
    { id: "cinderella", name: "신데렐라", from: "디즈니 프린세스", color: "#4299e1", bg: "#e9f2fc", icon: "slipper", say: ["유리구두처럼 딱 맞았어!", "신데렐라가 미소 지어요."] },
    { id: "rapunzel", name: "라푼젤", from: "디즈니 프린세스", color: "#d69e2e", bg: "#fdf6e3", icon: "sun", say: ["햇살처럼 반짝이는 정답!", "라푼젤이 손뼉 쳐요!"] },
    { id: "elsa", name: "엘사", from: "디즈니 프린세스", color: "#63b3ed", bg: "#eaf3fb", icon: "snow", say: ["눈꽃처럼 완벽해!", "엘사가 감탄해요!"] },
    { id: "ariel", name: "아리엘", from: "디즈니 프린세스", color: "#38b2ac", bg: "#e6f6f5", icon: "shell", say: ["바다처럼 시원한 정답!", "아리엘이 노래해요!"] },
    { id: "belle", name: "벨", from: "디즈니 프린세스", color: "#ecc94b", bg: "#fdf8e1", icon: "rose", say: ["책 읽는 벨도 감탄!", "장미처럼 근사한 정답!"] },
    { id: "snowwhite", name: "백설공주", from: "디즈니 프린세스", color: "#e53e3e", bg: "#fdeaea", icon: "apple", say: ["사과처럼 새빨간 정답!", "백설공주가 기뻐해요!"] },
    { id: "moana", name: "모아나", from: "디즈니 프린세스", color: "#2b6cb0", bg: "#e8f0fa", icon: "wave", say: ["파도를 넘었어!", "모아나가 응원해요!"] },
    { id: "spiderman", name: "스파이더맨", from: "마블", color: "#c53030", bg: "#fbe9e9", icon: "web", say: ["거미줄처럼 딱 잡았어!", "스파이더맨이 엄지 척!"] },
    { id: "ironman", name: "아이언맨", from: "마블", color: "#dd6b20", bg: "#fdeee3", icon: "reactor", say: ["아이언맨 계산 완료!", "천재적인 정답!"] },
    { id: "captain", name: "캡틴 아메리카", from: "마블", color: "#2b6cb0", bg: "#e8f0fa", icon: "shield", say: ["방패처럼 든든한 정답!", "캡틴이 경례해요!"] },
    { id: "hulk", name: "헐크", from: "마블", color: "#38a169", bg: "#e8f5ee", icon: "fistgreen", say: ["헐크 힘으로 해결!", "우와, 강력한 정답!"] },
    { id: "thor", name: "토르", from: "마블", color: "#718096", bg: "#eef1f4", icon: "hammer", say: ["천둥처럼 확실해!", "토르가 감탄해요!"] },
    { id: "captainmarvel", name: "캡틴 마블", from: "마블", color: "#d69e2e", bg: "#fdf6e3", icon: "star", say: ["별처럼 빛나는 정답!", "캡틴 마블 출동 완료!"] }
  ];
  // 단계별 길잡이 친구 (지도 정거장)
  const LEVEL_GUIDE = { 1: "cinnamoroll", 2: "mymelody", 3: "heartsping", 4: "laraping", 5: "kitty", 6: "cinderella", 7: "rapunzel", 8: "elsa", 9: "spiderman", 10: "ironman", 11: "captainmarvel" };

  function byId(id) { return CHARACTERS.find(function (c) { return c.id === id; }) || CHARACTERS[0]; }
  function guideFor(level) { return byId(LEVEL_GUIDE[level] || "cinnamoroll"); }
  // 날짜별 스티커: 날짜를 섞어 22명이 골고루 나오게
  function stickerFor(dateStr) {
    let h = 7; for (let i = 0; i < dateStr.length; i++) h = (h * 31 + dateStr.charCodeAt(i)) % 1000003;
    return CHARACTERS[h % CHARACTERS.length];
  }

  const ICONS = {
    cloud: '<path d="M30 62h40a14 14 0 0 0 2-27.9A18 18 0 0 0 38 30a13 13 0 0 0-8 32z" fill="#fff" stroke="C" stroke-width="4"/><circle cx="40" cy="50" r="2.5" fill="C"/><circle cx="58" cy="50" r="2.5" fill="C"/>',
    bow: '<path d="M50 50 20 32v36zM50 50l30-18v36z" fill="C"/><circle cx="50" cy="50" r="8" fill="#fff" stroke="C" stroke-width="4"/>',
    bowdark: '<path d="M50 50 20 32v36zM50 50l30-18v36z" fill="C"/><circle cx="50" cy="50" r="8" fill="#fff" stroke="C" stroke-width="4"/><circle cx="34" cy="50" r="3" fill="#fff"/><circle cx="66" cy="50" r="3" fill="#fff"/>',
    ribbon: '<path d="M50 46 24 30v32zM50 46l26-16v32z" fill="C"/><circle cx="50" cy="46" r="7" fill="C"/><path d="M20 72q30-8 60 0" fill="none" stroke="C" stroke-width="4" stroke-linecap="round"/>',
    pudding: '<path d="M28 44q22-24 44 0v18q-22 12-44 0z" fill="C"/><path d="M30 44q20 8 40 0" fill="none" stroke="#8b5e14" stroke-width="5" stroke-linecap="round"/><ellipse cx="50" cy="66" rx="30" ry="6" fill="#fff" stroke="C" stroke-width="3"/>',
    heart: '<path d="M50 78 22 50a14 14 0 0 1 28-14 14 14 0 0 1 28 14z" fill="C"/>',
    note: '<path d="M44 26v40" stroke="C" stroke-width="6" stroke-linecap="round"/><circle cx="36" cy="68" r="9" fill="C"/><path d="M44 26q18 4 20 18" fill="none" stroke="C" stroke-width="6" stroke-linecap="round"/>',
    bolt: '<path d="M54 20 30 54h16l-6 26 26-36H50z" fill="C"/>',
    fist: '<rect x="30" y="40" width="40" height="34" rx="10" fill="C"/><rect x="34" y="28" width="10" height="20" rx="5" fill="C"/><rect x="46" y="26" width="10" height="20" rx="5" fill="C"/><rect x="58" y="28" width="10" height="20" rx="5" fill="C"/>',
    fistgreen: '<rect x="28" y="40" width="44" height="36" rx="10" fill="C"/><rect x="32" y="26" width="11" height="22" rx="5" fill="C"/><rect x="45" y="24" width="11" height="22" rx="5" fill="C"/><rect x="58" y="26" width="11" height="22" rx="5" fill="C"/>',
    slipper: '<path d="M24 62q6-18 26-22 20-4 28 10l-6 4q-8-8-20-4l-6 14q-10 4-22-2z" fill="#fff" stroke="C" stroke-width="4"/><path d="M40 52l-10 12" stroke="C" stroke-width="4" stroke-linecap="round"/>',
    sun: '<circle cx="50" cy="50" r="14" fill="C"/><g stroke="C" stroke-width="5" stroke-linecap="round"><path d="M50 18v10M50 72v10M18 50h10M72 50h10M27 27l7 7M66 66l7 7M27 73l7-7M66 34l7-7"/></g>',
    snow: '<g stroke="C" stroke-width="5" stroke-linecap="round"><path d="M50 18v64M22 34l56 32M22 66l56-32"/><path d="M50 18l-6 8M50 18l6 8M50 82l-6-8M50 82l6-8"/></g>',
    shell: '<path d="M50 30 24 70h52z" fill="C"/><g stroke="#fff" stroke-width="3"><path d="M50 30v40M50 30 34 70M50 30l16 40"/></g>',
    rose: '<circle cx="50" cy="42" r="14" fill="C"/><circle cx="50" cy="42" r="6" fill="#fff" opacity=".5"/><path d="M50 56v24" stroke="#38a169" stroke-width="5" stroke-linecap="round"/><path d="M50 68q-10-2-12-10 10 0 12 10z" fill="#38a169"/>',
    apple: '<path d="M50 34q-16-10-24 6t8 34q8 6 16 0 8 6 16 0t8-34q-8-16-24-6z" fill="C"/><path d="M50 34q2-10 10-12" stroke="#38a169" stroke-width="5" stroke-linecap="round" fill="none"/>',
    wave: '<path d="M18 56q10-16 22 0t22 0 22 0" fill="none" stroke="C" stroke-width="6" stroke-linecap="round"/><path d="M18 70q10-16 22 0t22 0 22 0" fill="none" stroke="C" stroke-width="6" stroke-linecap="round" opacity=".5"/>',
    web: '<g stroke="C" stroke-width="3" fill="none"><path d="M50 20v60M20 50h60M29 29l42 42M71 29 29 71"/><circle cx="50" cy="50" r="12"/><circle cx="50" cy="50" r="24"/></g>',
    reactor: '<circle cx="50" cy="50" r="22" fill="none" stroke="C" stroke-width="6"/><circle cx="50" cy="50" r="9" fill="C"/><g stroke="C" stroke-width="3"><path d="M50 22v8M50 70v8M22 50h8M70 50h8"/></g>',
    shield: '<circle cx="50" cy="50" r="28" fill="#c53030"/><circle cx="50" cy="50" r="20" fill="#fff"/><circle cx="50" cy="50" r="12" fill="C"/><path d="M50 42l3 6 6 1-4 4 1 6-6-3-6 3 1-6-4-4 6-1z" fill="#fff"/>',
    hammer: '<rect x="26" y="26" width="44" height="22" rx="4" fill="C"/><rect x="45" y="48" width="10" height="30" rx="4" fill="#8b5e14"/>',
    star: '<path d="M50 20l9 19 21 3-15 14 4 21-19-10-19 10 4-21-15-14 21-3z" fill="C"/>'
  };
  function badge(c, size) {
    const s = size || 56, body = (ICONS[c.icon] || ICONS.star).split("C").join(c.color);
    return '<svg viewBox="0 0 100 100" width="' + s + '" height="' + s + '" role="img" aria-label="' + c.name + '"><circle cx="50" cy="50" r="48" fill="' + c.bg + '"/>' + body + "</svg>";
  }
  function praise(c, rng) { const r = (rng || Math.random)(); return c.say[Math.floor(r * c.say.length)]; }

  const api = { CHARACTERS: CHARACTERS, LEVEL_GUIDE: LEVEL_GUIDE, byId: byId, guideFor: guideFor, stickerFor: stickerFor, badge: badge, praise: praise, icons: Object.keys(ICONS) };
  if (typeof module !== "undefined" && module.exports) module.exports = api;
  else root.MathFriends = api;
})(typeof window !== "undefined" ? window : globalThis);
