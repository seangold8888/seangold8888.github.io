// 카드 한 장을 HTML로 그린다. 크기는 부모의 CSS 변수 --cw(카드 너비)를 따른다.
import { SUIT_SYM, isRed, rankLabel } from "./rules.js";

// 그림 카드: J=아이들, Q=장난꾸러기, K=아빠(♠♣)·엄마(♥♦)
export const FACE = {
  S11: "taeo", H11: "jaei", C11: "yunchan", D11: "yungeon",
  S12: "taeppul", H12: "jaewing", C12: "chanppul", D12: "geonppul",
  S13: "appa", C13: "appa", H13: "eomma", D13: "eomma",
};
export const FACE_NAME = {
  taeo: "태오", jaei: "재이", yunchan: "윤찬", yungeon: "윤건",
  taeppul: "태뿔", jaewing: "재윙", chanppul: "찬뿔", geonppul: "건뿔", appa: "아빠", eomma: "엄마",
};

// 숫자 카드 무늬 자리 [가로%, 세로%] (가운데 칸 안에서). 아래쪽 절반은 거꾸로 선다.
const L = 0, M = 50, R = 100;
const PIPS = {
  2: [[M, 0], [M, 100]],
  3: [[M, 0], [M, 50], [M, 100]],
  4: [[L, 0], [R, 0], [L, 100], [R, 100]],
  5: [[L, 0], [R, 0], [M, 50], [L, 100], [R, 100]],
  6: [[L, 0], [R, 0], [L, 50], [R, 50], [L, 100], [R, 100]],
  7: [[L, 0], [R, 0], [M, 25], [L, 50], [R, 50], [L, 100], [R, 100]],
  8: [[L, 0], [R, 0], [M, 25], [L, 50], [R, 50], [M, 75], [L, 100], [R, 100]],
  9: [[L, 0], [R, 0], [L, 33.3], [R, 33.3], [M, 50], [L, 66.7], [R, 66.7], [L, 100], [R, 100]],
  10: [[L, 0], [R, 0], [M, 16.7], [L, 33.3], [R, 33.3], [L, 66.7], [R, 66.7], [M, 83.3], [L, 100], [R, 100]],
};

function el(tag, cls, text) {
  const e = document.createElement(tag);
  if (cls) e.className = cls;
  if (text != null) e.textContent = text;
  return e;
}

export function cardEl(card) {
  const sym = SUIT_SYM[card.s];
  const c = el("div", `pc face-up ${isRed(card.s) ? "red" : "black"} r${card.r}`);
  c.dataset.id = card.id;
  const face = FACE[card.id];
  if (face) {
    c.classList.add("pic");
    const art = el("div", "art");
    art.style.backgroundImage = `url("art/${face}.webp")`;
    c.appendChild(art);
  } else if (card.r === 1) {
    c.appendChild(el("div", "ace", sym));
  } else {
    const box = el("div", "pips");
    for (const [x, y] of PIPS[card.r]) {
      const p = el("span", y > 50 ? "flip" : "", sym);
      p.style.left = x + "%";
      p.style.top = y + "%";
      box.appendChild(p);
    }
    c.appendChild(box);
  }
  for (const corner of ["tl", "br"]) {
    const idx = el("div", "idx " + corner);
    idx.append(el("b", "", rankLabel(card.r)), el("i", "", sym));
    c.appendChild(idx);
  }
  if (card.r === 7) c.appendChild(el("div", "wild-tag", "🌈"));
  c.setAttribute("aria-label", `${rankLabel(card.r)} ${sym}`);
  return c;
}

export function backEl() {
  const c = el("div", "pc back");
  c.appendChild(el("span", "back-logo", "1"));
  return c;
}
