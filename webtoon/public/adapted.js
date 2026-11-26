// 공개판 각색본. 제미나이와 다시 쓴 화를 여기에 넣으면 public.html 에서 원래 화 대신 보인다.
// 가족용 episodes.js 와 똑같이 C, bust, B, FX 로 쓴다. 이름은 실명으로 써도 edition.js 가 가명으로 바꿔 준다.
(function (root) {
  "use strict";
  const { C, bust, B, FX } = root.WebtoonDSL; // eslint-disable-line no-unused-vars

  root.PublicAdapted = [
    // { id: 1, title: "…", summary: "…", lesson: "…", talk: "…", cover: 0, panels: [ … ] },
  ];
})(typeof window !== "undefined" ? window : globalThis);
