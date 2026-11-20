// 종목 등록표. 새 종목 = 파일 하나(src/events/<id>.js) + 아래 자기 칸의 load 한 줄 + sw.js 목록.
// 칸 사이에 빈 줄을 둔 것은 여러 사람이 동시에 다른 칸을 고쳐도 git 이 부딪히지 않게 하려는 것이다(칸 순서·빈 줄 유지).
// load 가 null 이면 첫 화면·경기장에 "곧 열려요" 타일로 보인다. 자세한 약속은 sports/EVENTS.md.

export const SLOTS = [
  { id: "jumprope", name: "줄넘기", icon: "🪢",
    load: () => import("./jumprope.js?v=2") },

  { id: "baseball", name: "야구", icon: "⚾",
    load: () => import("./baseball.js?v=1") },

  { id: "hula", name: "훌라후프", icon: "⭕",
    load: () => import("./hula.js?v=1") },

  { id: "soccer", name: "축구", icon: "⚽",
    load: () => import("./soccer.js?v=1") },

  { id: "basketball", name: "농구", icon: "🏀",
    load: () => import("./basketball.js?v=1") },

];

const cache = new Map();

export function slotById(id) { return SLOTS.find(s => s.id === id) || null; }
export function isOpen(slot) { return !!(slot && typeof slot.load === "function"); }

// 종목 모듈 읽기 → 약속(contract) 검사까지 마친 객체. 실패하면 null(그 타일만 "준비 중"으로 남는다).
export async function loadEvent(id) {
  if (cache.has(id)) return cache.get(id);
  const slot = slotById(id);
  if (!isOpen(slot)) return null;
  try {
    const mod = await slot.load();
    const ev = mod && mod.default;
    const problems = checkEvent(ev, id);
    if (problems.length) { console.error("[sports] 종목 약속 위반", id, problems); return null; }
    cache.set(id, ev);
    return ev;
  } catch (e) { console.error("[sports] 종목을 못 읽었어요", id, e); return null; }
}

// 약속 검사(Node 테스트도 이것을 쓴다). 문제 목록을 돌려준다(빈 배열이면 통과).
export function checkEvent(ev, id) {
  const p = [];
  if (!ev || typeof ev !== "object") return ["default export 가 객체가 아님"];
  if (ev.id !== id) p.push(`id 가 "${id}" 가 아님`);
  if (typeof ev.name !== "string" || !ev.name) p.push("name 없음");
  if (typeof ev.icon !== "string" || !ev.icon) p.push("icon 없음");
  if (typeof ev.start !== "function") p.push("start(ctx) 없음");
  if (typeof ev.medals !== "function") p.push("medals(level, quizOn) 없음");
  else for (let lv = 0; lv < 4; lv++) {
    const m = ev.medals(lv, true);
    if (!m || !(m.gold > m.silver && m.silver > m.bronze && m.bronze > 0)) p.push(`medals(${lv}) 순서가 금>은>동>0 이 아님`);
  }
  if (ev.cameraMode != null && typeof ev.cameraMode !== "boolean") p.push("cameraMode 는 true/false");
  if (ev.cameraMode && !Array.isArray(ev.gestures)) p.push("cameraMode 면 gestures 배열 필요");
  return p;
}
