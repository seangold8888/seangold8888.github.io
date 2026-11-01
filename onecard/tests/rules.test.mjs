// 원카드 규칙 점검: node --test onecard/tests/
import test from "node:test";
import assert from "node:assert/strict";
import * as R from "../src/rules.js";

const c = id => ({ id, s: id[0], r: Number(id.slice(1)) });
// 손·덱·버린 더미를 직접 정해 둔 판
function rig({ hands, pile, deck = [], suit, turn = 0 }) {
  const st = R.newGame({ players: hands.length, handSize: 0, rng: R.mulberry32(1) });
  st.hands = hands.map(h => h.map(c));
  st.pile = pile.map(c);
  st.deck = deck.map(c);
  st.suit = suit || st.pile[st.pile.length - 1].s;
  st.turn = turn;
  return st;
}

test("덱은 52장, 모양 4 × 숫자 13, 중복 없음", () => {
  const d = R.makeDeck();
  assert.equal(d.length, 52);
  assert.equal(new Set(d.map(x => x.id)).size, 52);
});

test("7장씩(태오 5장) 나누고, 펼친 첫 카드는 7이 아니다", () => {
  for (let seed = 1; seed <= 400; seed++) {
    const st = R.newGame({ players: 3, handSize: seed % 2 ? 7 : 5, rng: R.mulberry32(seed) });
    assert.ok(st.hands.every(h => h.length === (seed % 2 ? 7 : 5)));
    assert.equal(st.pile.length, 1);
    assert.notEqual(st.pile[0].r, 7);
    assert.equal(st.suit, st.pile[0].s);
    assert.equal(R.cardCount(st), 52);
  }
});

test("7이 펼쳐지면 덱에 다시 묻고 새로 펼친다", () => {
  let seen = 0;
  for (let seed = 1; seed <= 2000 && !seen; seed++) {
    const st = R.newGame({ players: 2, rng: R.mulberry32(seed) });
    if (st.reburied) { seen++; assert.notEqual(st.pile[0].r, 7); assert.equal(R.cardCount(st), 52); }
  }
  assert.ok(seen, "some seed starts on a 7");
});

test("같은 모양이나 같은 숫자만 낼 수 있다", () => {
  const st = rig({ hands: [["H3", "S9", "C5", "D2"], ["S1"]], pile: ["H9"] });
  assert.deepEqual(R.legalCards(st, 0).map(x => x.id).sort(), ["H3", "S9"]);
  assert.throws(() => R.play(st, 0, "C5"), /illegal/);
  assert.throws(() => R.play(st, 1, "S1"), /not your turn/);
  const ev = R.play(st, 0, "S9");
  assert.equal(ev.suit, "S");
  assert.equal(st.turn, 1);
});

test("7은 언제든 낼 수 있고, 고른 모양이 다음 모양이 된다", () => {
  const st = rig({ hands: [["C7", "D2", "S4"], ["H1", "S5"]], pile: ["H9"] });
  assert.ok(R.legalCards(st, 0).some(x => x.id === "C7"));
  R.play(st, 0, "C7", "D");
  assert.equal(st.suit, "D");
  // 다음 사람은 ♦ 또는 7만: H1·S5 둘 다 못 낸다
  assert.deepEqual(R.legalCards(st, 1), []);
});

test("뽑은 카드가 맞으면 그 카드만 바로 낼 수 있고, 안 맞으면 차례가 넘어간다", () => {
  const st = rig({ hands: [["S2", "C4"], ["D5", "D6"]], pile: ["H9"], deck: ["S1", "H5"] });
  const ev = R.draw(st, 0);
  assert.equal(ev.card.id, "H5");
  assert.ok(ev.playable);
  assert.equal(st.turn, 0);
  assert.deepEqual(R.legalCards(st, 0).map(x => x.id), ["H5"]);
  assert.throws(() => R.draw(st, 0), /already/);
  R.pass(st, 0);
  assert.equal(st.turn, 1);
  const ev2 = R.draw(st, 1);
  assert.equal(ev2.card.id, "S1");
  assert.ok(!ev2.playable && ev2.passed);
  assert.equal(st.turn, 0);
});

test("덱이 비면 버린 더미(맨 위 빼고)를 섞어 쓴다", () => {
  const st = rig({ hands: [["S2"], ["D5"]], pile: ["C1", "C3", "H4", "H9"], deck: [] });
  const ev = R.draw(st, 0, R.mulberry32(3));
  assert.ok(ev.reshuffled);
  assert.equal(st.pile.length, 1);
  assert.equal(st.pile[0].id, "H9");
  assert.equal(st.deck.length, 2);
  assert.equal(st.hands[0].length, 2);
});

test("카드가 정말 하나도 없으면 통과, 두 바퀴 막히면 적은 사람이 이긴다", () => {
  const st = rig({ hands: [["S2", "S3"], ["D5"]], pile: ["H9"], deck: [] });
  const ev = R.draw(st, 0);
  assert.equal(ev.card, null);
  assert.ok(ev.passed);
  assert.equal(st.turn, 1);
  R.draw(st, 1); R.draw(st, 0); R.draw(st, 1);
  assert.equal(st.winner, 1);
  assert.ok(st.stalemate);
});

test("1장 남으면 원카드: 본인이 외치면 안전, 남이 먼저면 1장 벌칙", () => {
  const st = rig({ hands: [["H3", "S9"], ["C5", "C6", "C8"]], pile: ["H9"], deck: ["D1", "D2", "D3"] });
  const ev = R.play(st, 0, "H3");
  assert.ok(ev.oneCard);
  assert.deepEqual(st.pending, { player: 0 });
  assert.throws(() => R.draw(st, 1), /pending/);
  assert.deepEqual(R.callOneCard(st, 0), { type: "safe", player: 0 });
  assert.equal(st.hands[0].length, 1);
  // 다시: 컴퓨터가 1장 남았는데 아이가 먼저 외침 → 컴퓨터가 1장 받는다
  const st2 = rig({ hands: [["C5"], ["H3", "S9"]], pile: ["H9"], deck: ["D1", "D2"], turn: 1 });
  R.play(st2, 1, "S9");
  const r = R.callOneCard(st2, 0);
  assert.equal(r.type, "caught");
  assert.equal(r.player, 1);
  assert.equal(st2.hands[1].length, 2);
  assert.equal(st2.pending, null);
  assert.equal(R.callOneCard(st2, 0), null, "no double penalty");
});

test("마지막 카드를 내면 이긴다(7로 끝내도 된다)", () => {
  const st = rig({ hands: [["D7"], ["C5"]], pile: ["H9"] });
  const ev = R.play(st, 0, "D7");
  assert.ok(ev.win);
  assert.equal(st.winner, 0);
  assert.throws(() => R.draw(st, 1), /over/);
});

test("보통 컴퓨터: 7은 아끼고, 많이 가진 모양부터, 7 뒤엔 가장 많은 모양", () => {
  const st = rig({ hands: [["C1"], ["H2", "S9", "S3", "S12", "D7"]], pile: ["H9"], turn: 1 });
  const m = R.aiChoose(st, 1, "normal", R.mulberry32(1));
  assert.equal(m.type, "play");
  assert.equal(m.cardId, "S9"); // ♠가 3장이라 ♠9로 모양을 바꾼다
  const st2 = rig({ hands: [["C1"], ["C2", "S4", "S3", "D7"]], pile: ["H9"], turn: 1 });
  const m2 = R.aiChoose(st2, 1, "normal");
  assert.deepEqual(m2, { type: "play", cardId: "D7", suit: "S" });
  const st3 = rig({ hands: [["C1"], ["C2", "S4"]], pile: ["H9"], turn: 1 });
  assert.deepEqual(R.aiChoose(st3, 1, "normal"), { type: "draw" });
});

test("쉬움 컴퓨터는 가끔 낼 수 있어도 뽑고, 원카드를 가끔 깜빡한다", () => {
  const rng = R.mulberry32(9);
  let draws = 0, forgot = 0;
  for (let i = 0; i < 2000; i++) {
    const st = rig({ hands: [["C1"], ["H2", "S9", "D4"]], pile: ["H9"], deck: ["C3"], turn: 1 });
    if (R.aiChoose(st, 1, "easy", rng).type === "draw") draws++;
    if (R.aiSelfCallDelay("easy", rng) === null) forgot++;
  }
  assert.ok(draws > 350 && draws < 650, "≈25% draws: " + draws);
  assert.ok(forgot > 400 && forgot < 800, "≈30% forgets: " + forgot);
  for (let i = 0; i < 200; i++) {
    const d = R.aiSelfCallDelay("normal", rng);
    assert.ok(d >= 800 && d <= 1600);
  }
  assert.equal(R.aiCatchDelay("normal"), 2500);
  assert.equal(R.aiCatchDelay("easy"), 5000);
});

// 컴퓨터끼리 한 판 끝까지. 원카드는 무작위로 본인/남이 외친다.
function simulate(seed, players, levels, handSize) {
  const rng = R.mulberry32(seed);
  const st = R.newGame({ players, handSize, rng });
  let steps = 0;
  while (st.winner < 0) {
    if (++steps > 5000) throw new Error("game did not end, seed " + seed);
    if (st.pending) {
      const who = rng() < 0.6 ? st.pending.player : (st.pending.player + 1) % players;
      R.callOneCard(st, who, rng);
      continue;
    }
    const p = st.turn;
    const m = R.aiChoose(st, p, levels[p], rng);
    if (m.type === "play") {
      assert.ok(R.legalCards(st, p).some(x => x.id === m.cardId), "AI picked an illegal card");
      R.play(st, p, m.cardId, m.suit);
    } else if (m.type === "draw") R.draw(st, p, rng);
    else R.pass(st, p);
    assert.equal(R.cardCount(st), 52, "cards are never lost or duplicated");
    if (st.pile.length && R.topCard(st).r !== 7) assert.equal(st.suit, R.topCard(st).s);
  }
  return { st, steps };
}

test("컴퓨터끼리 500판 모두 끝나고, 불법 카드를 한 번도 안 낸다", () => {
  let total = 0, wins = [0, 0, 0];
  for (let seed = 1; seed <= 500; seed++) {
    const players = seed % 3 === 0 ? 3 : 2;
    const levels = ["normal", seed % 2 ? "easy" : "normal", "easy"];
    const { st, steps } = simulate(seed, players, levels, seed % 4 === 0 ? 5 : 7);
    total += steps;
    wins[st.winner]++;
  }
  assert.ok(total / 500 < 400, "games stay short: avg " + total / 500);
  assert.ok(wins[0] > 0 && wins[1] > 0);
});
