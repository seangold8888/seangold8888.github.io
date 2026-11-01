// 기록: localStorage "onecard:v1". 저장소가 막힌 기기(사생활 보호 모드 등)에서도 게임은 그냥 돈다.
const KEY = "onecard:v1";

function fresh() {
  return { v: 1, sound: true, opp: 1, last: "", wins: { jaei: 0, taeo: 0 }, games: { jaei: 0, taeo: 0 } };
}

const num = x => (Number.isFinite(x) && x >= 0 ? Math.floor(x) : 0);

export function load() {
  let s = null;
  try { s = JSON.parse(localStorage.getItem(KEY) || "null"); } catch (e) { s = null; }
  const f = fresh();
  if (!s || typeof s !== "object" || s.v !== 1) return f;
  f.sound = s.sound !== false;
  f.opp = s.opp === 2 ? 2 : 1;
  f.last = s.last === "jaei" || s.last === "taeo" ? s.last : "";
  for (const k of ["jaei", "taeo"]) {
    f.wins[k] = num(s.wins && s.wins[k]);
    f.games[k] = num(s.games && s.games[k]);
  }
  return f;
}

export function save(s) {
  try { localStorage.setItem(KEY, JSON.stringify(s)); } catch (e) { /* 저장 못 해도 계속 */ }
}
