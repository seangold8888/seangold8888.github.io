// 공개판(네이버 도전만화 등에 올릴 판). public.html 에서만 읽는다. 가족용 index.html 은 그대로다.
// 1) adapted.js 에 있는 각색본(제미나이와 다시 쓴 화)이 있으면 그 화를 통째로 바꾼다.
// 2) 친구 실명을 가명으로 바꾼다. 받침이 있는 이름은 받침이 있는 가명으로 골라서 “○○이가/○○아”가 그대로 맞는다.
(function (root) {
  "use strict";

  // 실명 → 가명. 긴 이름부터 바꾼다. 새 친구가 나오면 여기에 한 줄 더한다.
  const NAMES = {
    "세헌": "지훈",
    "태인": "도윤",
    "시현": "하준",
    "나윤": "서연",
    "민재": "민우",
    "닌재": "닌우", // 태오가 ‘민재’를 ‘닌재’라고 부른 말
  };

  const pairs = Object.entries(NAMES).sort((a, b) => b[0].length - a[0].length);
  const swap = (s) => pairs.reduce((t, [from, to]) => t.split(from).join(to), s);
  function walk(v) {
    if (typeof v === "string") return swap(v);
    if (Array.isArray(v)) { for (let i = 0; i < v.length; i++) v[i] = walk(v[i]); return v; }
    if (v && typeof v === "object") { for (const k of Object.keys(v)) v[k] = walk(v[k]); return v; }
    return v;
  }

  const data = root.WebtoonData;
  const adapted = root.PublicAdapted || [];
  adapted.forEach((ep) => {
    const i = data.EPISODES.findIndex((e) => e.id === ep.id);
    if (i >= 0) data.EPISODES[i] = { ...ep, adapted: true };
  });
  walk(data.CHARACTERS);
  walk(data.EPISODES);
  ["TaeoWords", "TaeoSayings", "JaeiWords", "JaeiSayings", "JaeiBabyLikes"].forEach((k) => { if (root[k]) walk(root[k]); });

  root.PublicEdition = { NAMES, swap, adaptedIds: adapted.map((e) => e.id) };
})(typeof window !== "undefined" ? window : globalThis);
