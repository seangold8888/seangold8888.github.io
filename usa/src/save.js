// 진행 저장: localStorage "usa-trip:v1". 저장소가 막힌 기기(사생활 보호 모드 등)에서도 게임은 그냥 돈다.
import { PLACES } from "./places.js";

const KEY = "usa-trip:v1";

function fresh() {
  return { v: 1, player: "", mode: "", sound: true, flown: false, places: {}, endingSeen: false };
}

export function load() {
  let s = null;
  try { s = JSON.parse(localStorage.getItem(KEY) || "null"); } catch (e) { s = null; }
  const f = fresh();
  if (!s || typeof s !== "object" || s.v !== 1) return f;
  const out = Object.assign(f, s);
  if (!out.places || typeof out.places !== "object") out.places = {};
  if (out.player !== "jaei" && out.player !== "taeo") out.player = "";
  if (out.mode !== "easy" && out.mode !== "normal") out.mode = "";
  return out;
}

export function save(s) {
  try { localStorage.setItem(KEY, JSON.stringify(s)); } catch (e) { /* 저장 못 해도 계속 */ }
}

export function isDone(s, id) { return !!(s.places[id] && s.places[id].stars > 0); }

export function isOpen(s, index) { return index === 0 || isDone(s, PLACES[index - 1].id); }

export function totalStars(s) { return PLACES.reduce((n, p) => n + ((s.places[p.id] && s.places[p.id].stars) || 0), 0); }

export function stampCount(s) { return PLACES.filter(p => s.places[p.id] && s.places[p.id].stamp).length; }

// 기록: 별은 가장 좋은 것만 남기고, 처음 끝낸 날 도장을 찍는다. 첫 도장이면 true.
export function record(s, id, stars) {
  const d = new Date();
  const day = d.getFullYear() + "." + String(d.getMonth() + 1).padStart(2, "0") + "." + String(d.getDate()).padStart(2, "0");
  const p = s.places[id] || (s.places[id] = { stars: 0, plays: 0, stamp: "" });
  p.plays = (p.plays || 0) + 1;
  p.stars = Math.max(p.stars || 0, stars);
  let first = false;
  if (!p.stamp && stars > 0) { p.stamp = day; first = true; }
  save(s);
  return first;
}
