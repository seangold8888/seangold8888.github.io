// 원카드(쉬운 규칙) 순수 모듈: 덱·규칙·컴퓨터 생각. 화면(DOM)은 전혀 모른다 → Node에서 그대로 시험한다.
//
// 규칙
// - 52장, 7장씩(태오 5장). 맨 위 한 장을 펼쳐 시작. 펼친 카드가 7이면 덱 아래쪽에 다시 묻고 새로 펼친다.
// - 내 차례에 맨 위 카드와 모양이 같거나 숫자가 같은 카드 한 장을 낸다.
// - 7은 언제든 낼 수 있고(모양 바꾸기), 낸 사람이 다음 모양을 고른다.
// - 못 내거나 안 내고 싶으면 덱에서 1장. 뽑은 카드를 낼 수 있으면 그 카드만 바로 낼 수 있고, 아니면 차례가 넘어간다.
// - 덱이 비면 버린 더미(맨 위 1장 빼고)를 섞어 새 덱으로 쓴다.
// - 낸 뒤 카드가 딱 1장 남으면 "원카드!" 시간: 본인이 먼저 외치면 안전, 남이 먼저 외치면 1장 벌칙.
// - 손의 카드를 먼저 다 낸 사람이 이긴다. 공격·방어 카드와 조커는 없다.

export const SUITS = ["S", "H", "D", "C"];
export const SUIT_SYM = { S: "♠", H: "♥", D: "♦", C: "♣" };
export const SUIT_NAME = { S: "스페이드", H: "하트", D: "다이아", C: "클로버" };
export const isRed = s => s === "H" || s === "D";
export const rankLabel = r => ({ 1: "A", 11: "J", 12: "Q", 13: "K" })[r] || String(r);
export const WILD = 7;

export function makeDeck() {
  const d = [];
  for (const s of SUITS) for (let r = 1; r <= 13; r++) d.push({ id: s + r, s, r });
  return d;
}

// 같은 씨앗이면 같은 판(점검용)
export function mulberry32(seed) {
  let a = seed >>> 0;
  return function () {
    a = (a + 0x6D2B79F5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function shuffle(a, rng = Math.random) {
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

// 덱의 "맨 위"는 배열의 끝(pop)이다.
export function newGame({ players = 2, handSize = 7, rng = Math.random } = {}) {
  if (players < 2 || players > 4) throw new Error("players 2..4");
  const deck = shuffle(makeDeck(), rng);
  const hands = Array.from({ length: players }, () => []);
  for (let k = 0; k < handSize; k++) for (let p = 0; p < players; p++) hands[p].push(deck.pop());
  let first = deck.pop(), reburied = 0;
  while (first.r === WILD) {
    // 7로는 시작하지 않는다: 덱 아래쪽 절반 어딘가에 다시 묻고 새로 펼친다.
    deck.splice(Math.floor(rng() * Math.floor(deck.length / 2)), 0, first);
    first = deck.pop();
    reburied++;
  }
  return {
    players, hands, deck, pile: [first], suit: first.s,
    turn: 0, drawn: null, pending: null, winner: -1, idle: 0, moves: 0, reburied,
  };
}

export const topCard = st => st.pile[st.pile.length - 1];
export const nextOf = (st, p) => (p + 1) % st.players;
export const canDraw = st => st.deck.length > 0 || st.pile.length > 1;
export const cardCount = st => st.deck.length + st.pile.length + st.hands.reduce((n, h) => n + h.length, 0);

export function matches(st, card) {
  return card.r === WILD || card.s === st.suit || card.r === topCard(st).r;
}

// 지금 p가 낼 수 있는 카드들. 덱에서 막 뽑았으면 그 카드만 후보다.
export function legalCards(st, p) {
  if (st.winner >= 0 || p !== st.turn || st.pending) return [];
  const hand = st.hands[p];
  if (st.drawn) {
    const c = hand.find(x => x.id === st.drawn);
    return c && matches(st, c) ? [c] : [];
  }
  return hand.filter(c => matches(st, c));
}

function endTurn(st) {
  st.turn = nextOf(st, st.turn);
  st.drawn = null;
}

function checkStalemate(st) {
  // 아무도 낼 수 없고 더 뽑을 카드도 없는 채로 두 바퀴 돌면, 카드가 가장 적은 사람이 이긴다(거의 안 생김).
  if (st.idle >= st.players * 2 && st.winner < 0) {
    let best = 0;
    st.hands.forEach((h, i) => { if (h.length < st.hands[best].length) best = i; });
    st.winner = best;
    st.stalemate = true;
  }
}

export function play(st, p, cardId, suit) {
  if (st.winner >= 0) throw new Error("game over");
  if (st.pending) throw new Error("one-card call pending");
  if (p !== st.turn) throw new Error("not your turn");
  const hand = st.hands[p];
  const i = hand.findIndex(c => c.id === cardId);
  if (i < 0) throw new Error("card not in hand");
  const card = hand[i];
  if (!legalCards(st, p).some(c => c.id === cardId)) throw new Error("illegal card " + cardId);
  hand.splice(i, 1);
  st.pile.push(card);
  st.suit = card.r === WILD ? (SUITS.includes(suit) ? suit : card.s) : card.s;
  st.idle = 0;
  st.moves++;
  st.drawn = null;
  const ev = { type: "play", player: p, card, suit: st.suit, win: false, oneCard: false };
  if (hand.length === 0) { st.winner = p; ev.win = true; return ev; }
  if (hand.length === 1) { st.pending = { player: p }; ev.oneCard = true; }
  endTurn(st);
  return ev;
}

// 덱에서 1장(벌칙에도 쓴다). 덱이 비면 버린 더미를 섞어 채운다. 카드가 정말 없으면 null.
export function drawOne(st, p, rng = Math.random) {
  let reshuffled = false;
  if (st.deck.length === 0 && st.pile.length > 1) {
    const t = st.pile.pop();
    st.deck = shuffle(st.pile, rng);
    st.pile = [t];
    reshuffled = true;
  }
  if (st.deck.length === 0) return { card: null, reshuffled };
  const card = st.deck.pop();
  st.hands[p].push(card);
  return { card, reshuffled };
}

export function draw(st, p, rng = Math.random) {
  if (st.winner >= 0) throw new Error("game over");
  if (st.pending) throw new Error("one-card call pending");
  if (p !== st.turn) throw new Error("not your turn");
  if (st.drawn) throw new Error("already drew");
  const { card, reshuffled } = drawOne(st, p, rng);
  const ev = { type: "draw", player: p, card, reshuffled, playable: false, passed: false };
  if (!card) {
    st.idle++;
    ev.passed = true;
    endTurn(st);
    checkStalemate(st);
    return ev;
  }
  st.idle = 0;
  st.moves++;
  if (matches(st, card)) { st.drawn = card.id; ev.playable = true; }
  else { ev.passed = true; endTurn(st); }
  return ev;
}

// 뽑은 카드를 낼 수 있지만 안 내고 넘길 때
export function pass(st, p) {
  if (p !== st.turn || !st.drawn || st.pending) throw new Error("cannot pass now");
  endTurn(st);
  return { type: "pass", player: p };
}

// "원카드!" 누가 먼저 외쳤나. 본인이면 안전, 남이면 그 사람(카드 1장 남은 사람)이 1장 받는다.
export function callOneCard(st, caller, rng = Math.random) {
  if (!st.pending) return null;
  const target = st.pending.player;
  st.pending = null;
  if (caller === target) return { type: "safe", player: target };
  const { card } = drawOne(st, target, rng);
  return { type: "caught", player: target, caller, card };
}

// 아무도 안 외치고 지나감
export function expireOneCard(st) { st.pending = null; }

// ---------- 컴퓨터 ----------
export function suitCounts(hand, exceptId) {
  const n = { S: 0, H: 0, D: 0, C: 0 };
  hand.forEach(c => { if (c.id !== exceptId && c.r !== WILD) n[c.s]++; });
  return n;
}

// 7을 낸 뒤 고를 모양: 가장 많이 가진 모양(7 자신과 다른 7은 세지 않는다)
export function bestSuit(hand, exceptId) {
  const n = suitCounts(hand, exceptId);
  let best = null;
  for (const s of SUITS) if (best === null || n[s] > n[best]) best = s;
  if (n[best] === 0) {
    const other = hand.find(c => c.id !== exceptId);
    return other ? other.s : best;
  }
  return best;
}

// 반환: {type:"play", cardId, suit?} | {type:"draw"} | {type:"pass"}
export function aiChoose(st, p, level = "normal", rng = Math.random) {
  const hand = st.hands[p];
  const legal = legalCards(st, p);
  const withSuit = c => ({ type: "play", cardId: c.id, suit: c.r === WILD ? bestSuit(hand, c.id) : undefined });
  if (st.drawn) return legal.length ? withSuit(legal[0]) : { type: "pass" };
  if (!legal.length) return { type: "draw" };
  if (level === "easy") {
    if (canDraw(st) && rng() < 0.25) return { type: "draw" }; // 쉬움: 낼 수 있어도 가끔 그냥 뽑는다
    return withSuit(legal[Math.floor(rng() * legal.length)]);
  }
  // 보통: 7은 아껴 두고, 가장 많이 가진 모양부터 털어낸다. 같으면 지금 모양을 이어 가는 카드, 그다음 큰 숫자.
  const plain = legal.filter(c => c.r !== WILD);
  if (!plain.length) return withSuit(legal[0]);
  const n = suitCounts(hand);
  let best = null, bestScore = -1;
  for (const c of plain) {
    const score = n[c.s] * 100 + (c.s === st.suit ? 20 : 0) + c.r;
    if (score > bestScore) { best = c; bestScore = score; }
  }
  return withSuit(best);
}

// 컴퓨터가 자기 원카드를 외치는 시간(ms). null = 깜빡함(쉬움만).
export function aiSelfCallDelay(level, rng = Math.random) {
  if (level === "easy") return rng() < 0.3 ? null : 1500 + rng() * 2000;
  return 800 + rng() * 800;
}

// 아이가 원카드를 안 외칠 때 컴퓨터가 잡으러 오는 시간(ms)
export function aiCatchDelay(level) { return level === "easy" ? 5000 : 2500; }

// 정렬: ♠ ♥ ♣ ♦ (검정·빨강 번갈아) 다음 숫자
const ORDER = { S: 0, H: 1, C: 2, D: 3 };
export function sortHand(hand) {
  return hand.slice().sort((a, b) => ORDER[a.s] - ORDER[b.s] || a.r - b.r);
}
