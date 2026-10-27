// 여행 순서대로 놓인 여섯 장소. pin은 지도 그림 위 위치(%).
export const PLACES = [
  { id: "vegas", name: "라스베이거스", en: "LAS VEGAS", icon: "⛲", color: "#8b5cf6", pin: [70, 27],
    title: "분수쇼 리듬", goal: "물방울이 동그라미에 오면 콕!<br>음악에 맞춰 분수를 쏴요 🎵", bgm: "" },
  { id: "park", name: "디즈니랜드", en: "THEME PARK", icon: "🎢", color: "#ec4899", pin: [83, 56],
    title: "롤러코스터 별 모으기", goal: "콕 누르면 번쩍 점프!<br>별 ⭐ 을 모으고 불꽃놀이 🎆", bgm: "kart" },
  { id: "beverly", name: "베벌리힐스 숙소", en: "BEVERLY HILLS", icon: "🌴", color: "#f59e0b", pin: [50, 52],
    title: "숙소 보물찾기", goal: "내일은 바다! 가방을 챙겨요 🧳<br>그림에서 물건을 찾아 콕!", bgm: "story" },
  { id: "santamonica", name: "산타모니카 비치", en: "SANTA MONICA", icon: "🎡", color: "#0ea5e9", pin: [21, 56],
    title: "모래성 지키기", goal: "모래성을 콕콕 쌓아요 🏰<br>파도 🌊 는 콕 쳐서 막아요!", bgm: "odyssey" },
  { id: "huntington", name: "헌팅턴 비치", en: "HUNTINGTON", icon: "🏄", color: "#14b8a6", pin: [47, 84],
    title: "파도 타기", goal: "콕 누르면 점프!<br>별 ⭐ 을 모으고 통나무는 넘어요", bgm: "odyssey" },
  { id: "erewhon", name: "에레혼 마켓", en: "MARKET", icon: "🥤", color: "#22c55e", pin: [78, 86],
    title: "장보기", goal: "목록에 있는 것을 찾아 콕!<br>바구니 🧺 에 담고 계산해요", bgm: "story" },
];

export const KIDS = {
  jaei: { name: "재이", en: "Jaei" },
  taeo: { name: "태오", en: "Taeo" },
};

export const byId = id => PLACES.find(p => p.id === id);

// 둥근 고무도장 모양 여행 도장(SVG)
export function stampSVG(p, date) {
  const id = "st-" + p.id + Math.random().toString(36).slice(2, 6);
  return `<svg viewBox="0 0 120 120" aria-label="${p.name} 도장">
  <defs><path id="${id}" d="M 22 60 A 38 38 0 0 1 98 60"/></defs>
  <g fill="none" stroke="${p.color}" opacity=".92">
    <circle cx="60" cy="60" r="55" stroke-width="5"/>
    <circle cx="60" cy="60" r="47" stroke-width="2" stroke-dasharray="3 3"/>
  </g>
  <circle cx="60" cy="60" r="44" fill="${p.color}" opacity=".08"/>
  <text font-family="Pretendard, sans-serif" font-weight="900" font-size="13" letter-spacing="1" fill="${p.color}"><textPath href="#${id}" startOffset="50%" text-anchor="middle">${p.en}</textPath></text>
  <text x="60" y="76" text-anchor="middle" font-size="36">${p.icon}</text>
  <text x="60" y="95" text-anchor="middle" font-family="Pretendard, sans-serif" font-weight="900" font-size="11" fill="${p.color}">${date || "USA TRIP"}</text>
</svg>`;
}
