// 카드 한 장을 HTML로 그린다. 크기는 부모의 CSS 변수 --cw(카드 너비)를 따른다.
// 모양마다 요정·히어로 친구가 있다(모두 이 게임만의 새 캐릭터). 손에 20장이 있어도 가볍게: 카드 한 장 = 요소 10개 남짓, 그림은 모양마다 4장을 같이 쓴다.
import { SUIT_SYM, isRed, rankLabel } from "./rules.js";

// 모양 친구: ♥ 하트 요정, ♦ 보석 요정, ♠ 번개 히어로, ♣ 방패 히어로
export const MASCOT = {
  H: { name: "하트미", img: "heart", kind: "하트 요정" },
  D: { name: "보라미", img: "gem", kind: "보석 요정" },
  S: { name: "번개돌이", img: "bolt", kind: "번개 히어로" },
  C: { name: "튼튼이", img: "clover", kind: "방패 히어로" },
};
// 1 손 흔들기 · 2 껑충 · 3 마법/힘 · 4 엄지척
export const poseSrc = (s, n) => `art/${MASCOT[s].img}-${n}.webp`;

// 그림 카드: J=아이들(히어로 배지), Q=장난꾸러기(반짝 티아라), K=아빠(♠♣)·엄마(♥♦)(왕관)
export const FACE = {
  S11: "taeo", H11: "jaei", C11: "yunchan", D11: "yungeon",
  S12: "taeppul", H12: "jaewing", C12: "chanppul", D12: "geonppul",
  S13: "appa", C13: "appa", H13: "eomma", D13: "eomma",
};
export const FACE_NAME = {
  taeo: "태오", jaei: "재이", yunchan: "윤찬", yungeon: "윤건",
  taeppul: "태뿔", jaewing: "재윙", chanppul: "찬뿔", geonppul: "건뿔", appa: "아빠", eomma: "엄마",
};

function el(tag, cls, text) {
  const e = document.createElement(tag);
  if (cls) e.className = cls;
  if (text != null) e.textContent = text;
  return e;
}

// 셀 수 있는 보석 줄: 5개까지 한 줄, 6개부터 두 줄(3+3, 4+3 …) — 요소 하나에 글자로 담아 가볍게
function gemText(sym, n) {
  if (n <= 5) return sym.repeat(n);
  const top = Math.ceil(n / 2);
  return sym.repeat(top) + "\n" + sym.repeat(n - top);
}

export function cardEl(card) {
  const sym = SUIT_SYM[card.s];
  const c = el("div", `pc face-up s-${card.s} ${isRed(card.s) ? "red" : "black"} r${card.r}`);
  c.dataset.id = card.id;
  const face = FACE[card.id];
  if (face) {
    c.classList.add("pic", ["", "", "jack", "queen", "king"][card.r - 9]);
    const frame = el("div", "frame");
    const art = el("div", "art");
    art.style.backgroundImage = `url("art/${face}.webp")`;
    frame.appendChild(art);
    c.append(frame, el("div", "deco"), el("div", "name", FACE_NAME[face]));
  } else if (card.r === 7) {
    c.classList.add("wild");
    c.append(el("div", "crew"), el("div", "ribbon", "모양 바꾸기 ✨"));
  } else {
    c.classList.add("num");
    const art = el("div", "art");
    art.style.backgroundImage = `url("${poseSrc(card.s, ((card.r - 1) % 4) + 1)}")`;
    c.append(art, el("div", "gems" + (card.r > 5 ? " two" : card.r === 1 ? " one" : ""), gemText(sym, card.r)));
  }
  for (const corner of ["tl", "br"]) {
    const idx = el("div", "idx " + corner);
    idx.append(el("b", "", rankLabel(card.r)), el("i", "", sym));
    c.appendChild(idx);
  }
  c.setAttribute("aria-label", `${rankLabel(card.r)} ${sym}`);
  return c;
}

export function backEl() {
  const c = el("div", "pc back");
  c.appendChild(el("span", "back-logo", "원카드"));
  return c;
}
