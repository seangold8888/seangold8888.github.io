// 운동회 선수 = 재이(청군)·태오(백군) 둘(대표님 11-20 확정: 여자아이 하나, 남자아이 하나).
// id 는 GameQuiz 아이 id 와 같다(문제 난이도·기록이 그대로 이어진다).
// level = 종목 난이도 칸(0 가장 쉬움 … 3 가장 어려움; 지금은 태오 0·재이 2). 아이 얼굴 고르기 = 난이도 고르기(나이 버튼 없음).
// 혼자 하면 다른 아이가 "사촌 친구(컴퓨터)"로 상대 편에 선다.
// 그림: 진짜 운동회 그림(art/<kid>/…, ART-SPEC.md)이 있으면 그것, 없으면 허브 3D 아이 그림(art/kid*.webp 등)으로 대신.
// DOM 을 건드리지 않는다(Node 테스트에서 그대로 불러 쓴다).

export const KIDS = Object.freeze([
  // scale = 화면 키 배율(태오가 재이보다 작게, 그림 원본 키 비율 1060:1268)
  Object.freeze({ id: "jaei", name: "재이", age: 8, level: 2, art: 2, team: "blue", color: "#2f6bff", scale: 1,
    portrait: "art/jaei/stand.webp?v=1",
    look: Object.freeze({ hair: "갈색 긴 생머리 + 앞머리", outfit: "흰 반팔 티, 파란 머리띠(청군), 남색 반바지, 흰 운동화(파란 줄)" }) }),
  Object.freeze({ id: "taeo", name: "태오", age: 5, level: 0, art: 4, team: "white", color: "#ff4d4d", scale: 0.86,
    portrait: "art/taeo/stand.webp?v=1",
    look: Object.freeze({ hair: "짙은 갈색 부스스한 머리", outfit: "흰 반팔 티, 흰 머리띠(백군), 빨간 반바지, 흰 운동화(빨간 줄)" }) }),
]);

export const TEAMS = Object.freeze({
  blue: Object.freeze({ id: "blue", name: "청군", color: "#2f6bff", light: "#cfe0ff" }),
  white: Object.freeze({ id: "white", name: "백군", color: "#ffffff", light: "#f4f6ff", ink: "#30364f" }),
});

export function kidById(id) { return KIDS.find(k => k.id === id) || null; }

// 화면(DOM)용 그림 주소(sports/ 기준). pose: "kid" 서 있기 | "cheer" 만세 | "run" 달리기
// 진짜 운동회 그림 초상(portrait)이 있으면 자세와 상관없이 그것(옷차림이 경기와 같게).
export function kidArt(id, pose = "kid") {
  const k = kidById(id); if (!k) return "";
  if (k.portrait) return k.portrait;
  return `art/${pose}${k.art}.webp?v=1`;
}

// 고른 아이들로 편을 만든다. 편은 아이마다 정해져 있다(재이 청군, 태오 백군).
// 한 명만 고르면 다른 아이가 사촌 친구(컴퓨터)로 상대 편에 선다. 차례: 청군 먼저.
export function makeTeams(selected) {
  const ids = [...new Set((selected || []).filter(id => kidById(id)))];
  if (!ids.length) ids.push(KIDS[0].id);
  const players = ids.map(id => ({ id, team: kidById(id).team, cpu: false }));
  for (const k of KIDS) {
    if (players.some(p => p.team === k.team)) continue;
    players.push({ id: k.id, team: k.team, cpu: true });
  }
  return players.sort((a, b) => (a.team === b.team ? 0 : a.team === "blue" ? -1 : 1));
}

// 첫 화면 카드의 난이도 꼬리표(level 에서): 0·1 = ★ 쉬움, 2 = ★★ 보통, 3 = ★★★ 어려움
export function difficultyBadge(level) {
  const lv = Math.max(0, Math.min(3, level | 0));
  const stars = [1, 1, 2, 3][lv], label = ["쉬움", "쉬움", "보통", "어려움"][lv];
  return { stars, label, text: `${"★".repeat(stars)} ${label}` };
}
