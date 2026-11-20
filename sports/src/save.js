// 운동회 저장(기기 하나, 가족 공용). 키 sports_save_v1. 읽기·쓰기는 전부 try/catch(사파리 개인 정보 보호 모드 등).
//   kids:     지난번 고른 선수 id 목록(첫 화면에 미리 골라 둔다)
//   teamPref: { kidId: "blue"|"white" } "선수 바꾸기"에서 정한 편
//   medals:   { eventId: { kidId: "gold"|"silver"|"bronze" } } 지금까지 받은 가장 좋은 메달
//   best:     { eventId: { kidId: 점수 } }
//   camera:   { eventId: true } 진짜로 뛰기를 켜 둔 종목
import { betterMedal } from "./scoring.js?v=1";

export const SAVE_KEY = "sports_save_v1";

export function blankSave() { return { v: 1, kids: [], teamPref: {}, medals: {}, best: {}, camera: {}, plays: 0, sound: true }; }

export function cleanSave(raw) {
  const s = blankSave();
  if (!raw || typeof raw !== "object") return s;
  if (Array.isArray(raw.kids)) s.kids = raw.kids.filter(x => typeof x === "string").slice(0, 4);
  for (const k of ["teamPref", "medals", "best", "camera"]) if (raw[k] && typeof raw[k] === "object" && !Array.isArray(raw[k])) s[k] = raw[k];
  s.plays = Number.isFinite(raw.plays) ? raw.plays : 0;
  s.sound = raw.sound !== false;
  return s;
}

export function loadSave(storage = globalThis.localStorage) {
  try { return cleanSave(JSON.parse(storage.getItem(SAVE_KEY) || "null")); } catch (_) { return blankSave(); }
}

export function writeSave(save, storage = globalThis.localStorage) {
  try { storage.setItem(SAVE_KEY, JSON.stringify(save)); return true; } catch (_) { return false; }
}

// 종목 결과 한 줄 기록(가장 좋은 메달·점수만 남긴다)
export function recordResult(save, eventId, kidId, score, medal) {
  const m = save.medals[eventId] || (save.medals[eventId] = {});
  const b = save.best[eventId] || (save.best[eventId] = {});
  const prev = m[kidId] || null, next = betterMedal(prev, medal);
  if (next) m[kidId] = next;
  const newBest = !(b[kidId] >= score);
  if (newBest) b[kidId] = score;
  return { medalUp: next !== prev && !!next, newBest };
}
