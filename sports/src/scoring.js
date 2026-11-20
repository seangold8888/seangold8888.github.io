// 메달·청백 점수 계산(DOM 없음, Node 테스트용으로도 쓴다).
// 종목마다 아이별 메달 기준 점수 표를 준다: { gold, silver, bronze } (아이 level 0~3 마다 하나씩).
// 서로 다른 난이도로 뛴 아이들을 견주려고 "기준 대비 점수"(score / gold)로 순위를 낸다.

export const MEDAL_POINTS = Object.freeze({ gold: 3, silver: 2, bronze: 1 });
export const MEDAL_ORDER = Object.freeze(["gold", "silver", "bronze"]);
export const MEDAL_LABEL = Object.freeze({ gold: "금메달", silver: "은메달", bronze: "동메달" });

export function medalFor(score, th) {
  if (!th || !(score >= 0)) return null;
  if (score >= th.gold) return "gold";
  if (score >= th.silver) return "silver";
  if (score >= th.bronze) return "bronze";
  return null;
}

export function betterMedal(a, b) {
  const r = m => (m ? 3 - MEDAL_ORDER.indexOf(m) : 0);
  return r(b) > r(a) ? b : a;
}

// 결과 목록 [{ id, team, score, medal, gold }] → 순위(1부터), 같은 상대 점수는 같은 순위
export function rankResults(results) {
  const rel = r => (r.gold > 0 ? r.score / r.gold : 0);
  const sorted = [...results].sort((a, b) => rel(b) - rel(a));
  let rank = 0, prev = null;
  return sorted.map((r, i) => {
    const v = Math.round(rel(r) * 1000);
    if (v !== prev) { rank = i + 1; prev = v; }
    return { ...r, rank, rel: rel(r) };
  });
}

// 한 종목 청백 점수: 메달 점수 합 + 그 종목 1등 편에 보너스 1
export function teamPoints(results) {
  const pts = { blue: 0, white: 0 };
  for (const r of results) pts[r.team] = (pts[r.team] || 0) + (MEDAL_POINTS[r.medal] || 0);
  const ranked = rankResults(results);
  if (ranked.length > 1 && ranked[0] && (ranked.length < 2 || ranked[0].rank !== ranked[1].rank)) pts[ranked[0].team] += 1;
  return pts;
}

export function addPoints(total, add) {
  return { blue: (total.blue || 0) + (add.blue || 0), white: (total.white || 0) + (add.white || 0) };
}

export function winner(total) {
  if ((total.blue || 0) > (total.white || 0)) return "blue";
  if ((total.white || 0) > (total.blue || 0)) return "white";
  return "tie";
}

// 사촌 친구(컴퓨터) 점수: 기준표 안에서 다정하게(금 20%, 은 45%, 동 30%, 없음 5%) — rnd 는 0~1 함수
export function cpuScore(th, rnd = Math.random) {
  const r = rnd(), j = rnd();
  if (r < 0.2) return Math.round(th.gold * (1 + 0.15 * j));
  if (r < 0.65) return Math.round(th.silver + (th.gold - th.silver) * 0.9 * j);
  if (r < 0.95) return Math.round(th.bronze + (th.silver - th.bronze) * 0.9 * j);
  return Math.round(th.bronze * 0.8 * j);
}

// 청백 점수는 어디서나 같은 수·같은 단위(경기장 점수판·시상식·폐회식). 메달 점수(금3·은2·동1) + 종목 1등 편 +1.
export const TEAM_POINT_UNIT = "점";
export const TEAM_POINT_CAPTION = "청백 점수 = 메달(금 3 · 은 2 · 동 1) + 종목 1등 +1";
export function teamScoreText(total, team) { return `${(total && total[team]) || 0}${TEAM_POINT_UNIT}`; }

// 시상대 줄 세우기: 같은 순위끼리 한 단(공동 1등이면 한 시상대에 같이). 돌려줌: [{ rank, shared, results }] (가운데 = 1등)
export function podiumGroups(ranked) {
  const groups = [];
  for (const r of ranked) {
    const g = groups.find(x => x.rank === r.rank);
    if (g) g.results.push(r); else groups.push({ rank: r.rank, results: [r] });
  }
  groups.forEach(g => { g.shared = g.results.length > 1; g.label = g.shared ? `공동 ${g.rank}등` : `${g.rank}등`; });
  const top3 = groups.slice(0, 3);
  const order = top3.length >= 3 ? [top3[1], top3[0], top3[2]] : top3.length === 2 ? [top3[1], top3[0]] : top3;
  return { order, rest: groups.slice(3) };
}
